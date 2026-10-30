#!/usr/bin/env python3
"""Connect harborlight.pl to its PROD Hosting site; never edit DNS or deploy.

The API contract is the official Firebase Hosting v1beta1 CustomDomain schema.
--check is read-only; --apply requests the binding and reports required DNS.
--status-only performs only a resource GET, for the production deployment gate.
"""

import argparse
import importlib.util
import json
from pathlib import Path
import re
import sys
import time
import urllib.parse


_spec = importlib.util.spec_from_file_location(
    "harborlight_prepare_hosting", Path(__file__).with_name("prepare-hosting.py")
)
hosting = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hosting)

PROJECT = "harborlight-prod"
PROJECT_NUMBER = "992911312434"
SITE = "harborlight-prod"
DOMAIN = "harborlight.pl"
PARENT = f"projects/{PROJECT}/sites/{SITE}"
RESOURCE = f"{PARENT}/customDomains/{DOMAIN}"
URL = f"{hosting.HOSTING}/{RESOURCE}"
RECORD_TYPES = frozenset(("A", "AAAA", "CNAME", "TXT", "CAA"))


def require(condition, message):
    hosting.require(condition, message)


def validate_target(project, domain):
    require(project == PROJECT and domain == DOMAIN,
            "Dozwolone jest wyłącznie harborlight.pl w projekcie harborlight-prod.")


def validate_domain(data, number=PROJECT_NUMBER):
    allowed = {RESOURCE, f"projects/{number}/sites/{SITE}/customDomains/{DOMAIN}"}
    require(isinstance(data, dict) and data.get("name") in allowed,
            "Firebase zwrócił inną domenę, witrynę lub projekt.")
    require(not data.get("deleteTime"), "Powiązanie domeny jest usunięte; sprawdź je w konsoli Firebase.")
    require(not data.get("redirectTarget"),
            "Istniejąca domena ma przekierowanie. Skrypt go nie nadpisuje.")
    return data


def dns_records(data):
    """Preserve exactly the provider's values and actions, including ACME DNS."""
    result, seen = [], set()
    sources = [("hosting", data.get("requiredDnsUpdates", {})),
               ("certyfikat", data.get("cert", {}).get("verification", {}).get("dns", {}))]
    for source, updates in sources:
        require(isinstance(updates, dict), "Niepoprawna odpowiedź rekordów DNS Firebase.")
        for section in ("desired", "discovered"):
            sets = updates.get(section, [])
            require(isinstance(sets, list), "Niepoprawna lista rekordów DNS Firebase.")
            for record_set in sets:
                require(isinstance(record_set, dict), "Niepoprawny zestaw DNS Firebase.")
                records = record_set.get("records", [])
                require(isinstance(records, list), "Niepoprawny zestaw DNS Firebase.")
                for record in records:
                    require(isinstance(record, dict), "Niepoprawny rekord DNS Firebase.")
                    action = record.get("requiredAction", "NONE")
                    kind = record.get("type")
                    host = record.get("domainName", record_set.get("domainName"))
                    value = record.get("rdata")
                    require(action in ("NONE", "ADD", "REMOVE") and kind in RECORD_TYPES
                            and isinstance(host, str) and host and isinstance(value, str),
                            "Firebase zwrócił nieobsługiwany rekord DNS; nie zgadujemy jego wartości.")
                    # A provider may ask for an ACME verification record on a
                    # subdomain, but never change an unrelated domain.
                    normalized = host.rstrip(".").lower()
                    require(normalized == DOMAIN or normalized.endswith("." + DOMAIN),
                            "Rekord DNS dotyczy innej domeny. Skrypt nie poda go do zmiany.")
                    key = (action, kind, host, value)
                    if key not in seen:
                        seen.add(key)
                        result.append({"action": action, "type": kind, "host": host,
                                       "value": value, "source": source, "set": section})
    return result


def report(data, *, configured=True, created=False, operation_pending=False):
    if not configured:
        return {"project": PROJECT, "site": SITE, "domain": DOMAIN, "configured": False,
                "ready": False, "created": False, "operation_pending": False,
                "dns_records": [], "reason": "Brak powiązania domeny. Użyj --apply."}
    cert = data.get("cert", {})
    require(isinstance(cert, dict), "Niepoprawny stan certyfikatu Firebase.")
    states = {"host": data.get("hostState", "HOST_STATE_UNSPECIFIED"),
              "ownership": data.get("ownershipState", "OWNERSHIP_STATE_UNSPECIFIED"),
              "certificate": cert.get("state", "CERT_STATE_UNSPECIFIED")}
    ready = states["host"] == "HOST_ACTIVE" and states["ownership"] == "OWNERSHIP_ACTIVE" \
        and states["certificate"] in ("CERT_ACTIVE", "CERT_EXPIRING_SOON")
    return {"project": PROJECT, "site": SITE, "domain": DOMAIN, "configured": True,
            "ready": ready, "created": created, "operation_pending": operation_pending,
            "states": states, "dns_records": dns_records(data),
            "issues": data.get("issues", []), "certificate_issues": cert.get("issues", []),
            "provider_response": data}


def preflight(cloud):
    accounts = cloud.gcloud("auth", "list", "--filter=status:ACTIVE")
    require(isinstance(accounts, list) and len(accounts) == 1 and accounts[0].get("account"),
            "Brak jednego aktywnego konta Google. Zaloguj się do Cloud Shell.")
    info = cloud.gcloud("projects", "describe", PROJECT)
    require(info.get("projectId") == PROJECT and info.get("lifecycleState") == "ACTIVE"
            and info.get("labels", {}).get("harborlight_env") == "prod",
            "Projekt nie jest aktywnym, odizolowanym PROD. Najpierw wykonaj bootstrap.")
    number = str(info.get("projectNumber", ""))
    require(bool(re.fullmatch(r"[1-9][0-9]*", number)), "Nie odczytano numeru projektu PROD.")
    billing = cloud.gcloud("billing", "projects", "describe", PROJECT)
    require(billing.get("billingEnabled") is True
            and billing.get("billingAccountName") == hosting.BILLING_ACCOUNT,
            "PROD nie ma aktywnych rozliczeń HARBORLIGHT.")
    firebase = hosting.get_optional(cloud, f"{hosting.FIREBASE}/projects/{PROJECT}")
    require(firebase is not None,
            "Najpierw uruchom prepare-hosting.py --project harborlight-prod --apply.")
    hosting.validate_firebase(firebase, PROJECT, number)
    site = hosting.get_optional(cloud, f"{hosting.HOSTING}/{PARENT}")
    require(site is not None,
            "Najpierw uruchom prepare-hosting.py --project harborlight-prod --apply.")
    hosting.validate_site(site, PROJECT, number)
    return number


def wait_created(cloud, operation, number, *, timeout=120, sleep=time.sleep, monotonic=time.monotonic):
    expected_prefixes = (RESOURCE, f"projects/{number}/sites/{SITE}/customDomains/{DOMAIN}")
    name = operation.get("name", "")
    require(any(re.fullmatch(re.escape(prefix) + r"/operations/[A-Za-z0-9._~-]+", name)
                for prefix in expected_prefixes), "Firebase zwrócił inną operację domeny.")
    deadline = monotonic() + timeout
    while True:
        require(not operation.get("error"), "Operacja powiązania domeny zakończyła się błędem Firebase.")
        if operation.get("done") is True and isinstance(operation.get("response"), dict) \
                and operation["response"].get("name"):
            return validate_domain(operation["response"], number), False
        current = hosting.get_optional(cloud, URL)
        if current is not None:
            # Waiting for DNS must not hide the DNS values needed to finish the
            # operation. Report the materialized resource even if LRO is pending.
            return validate_domain(current, number), operation.get("done") is not True
        require(monotonic() < deadline,
                "Powiązanie jest jeszcze przygotowywane. Ponów --check za chwilę.")
        sleep(2)
        operation = cloud.request("GET", f"{hosting.HOSTING}/{name}")


def prepare(project=PROJECT, domain=DOMAIN, *, apply=False, status_only=False, cloud=None,
            sleep=time.sleep, monotonic=time.monotonic):
    validate_target(project, domain)
    require(not (apply and status_only), "--status-only jest wyłącznie do odczytu.")
    cloud = cloud or hosting.Cloud(project)
    number = PROJECT_NUMBER if status_only else preflight(cloud)
    current = hosting.get_optional(cloud, URL)
    if current is not None:
        return report(validate_domain(current, number))
    if not apply:
        return report({}, configured=False)
    create_url = f"{hosting.HOSTING}/{PARENT}/customDomains?" + urllib.parse.urlencode({"customDomainId": DOMAIN})
    try:
        operation = cloud.request("POST", create_url,
                                  {"name": RESOURCE, "certPreference": "GROUPED"})
    except hosting.ApiError as error:
        if error.status != 409:
            raise
        # Concurrent creation in THIS exact site may be adopted. Never change
        # another site's binding or remove a conflicting registration.
        current = hosting.get_optional(cloud, URL)
        require(current is not None,
                "Domena ma konflikt powiązania; sprawdź ją w konsoli Firebase. Nie nadpisano konfiguracji.")
        return report(validate_domain(current, number))
    current, pending = wait_created(cloud, operation, number, sleep=sleep, monotonic=monotonic)
    return report(current, created=True, operation_pending=pending)


def cell(value):
    return str(value).replace("\t", "\\t").replace("\r", "\\r").replace("\n", "\\n")


def print_report(value):
    print("Domena PROD: harborlight.pl → witryna harborlight-prod")
    if not value["configured"]:
        print("CHECK — brak powiązania domeny; nie wykonano zmian. Użyj --apply.")
        return
    states = value["states"]
    print(f"Stan: hosting={states['host']}, własność={states['ownership']}, HTTPS={states['certificate']}")
    if value["dns_records"]:
        print("Rekordy z odpowiedzi Firebase. Zmień w nazwa.pl wyłącznie wskazane ADD/REMOVE; NONE pozostaw.")
        print("AKCJA\tTYP\tNAZWA\tWARTOŚĆ")
        for record in value["dns_records"]:
            print("\t".join(cell(record[key]) for key in ("action", "type", "host", "value")))
    elif not value["ready"]:
        print("Firebase nie podało jeszcze wymaganych zmian DNS. Ponów --check za chwilę.")
    if value["ready"]:
        print("GOTOWE — DNS, własność i certyfikat HTTPS są aktywne według Firebase.")
    else:
        print("OCZEKUJE — powiązanie istnieje, ale domena nie jest jeszcze gotowa do ruchu PROD.")
        print("Po zmianie DNS ponów --check; potwierdzenie własności/certyfikatu może wymagać czasu.")
    if value["operation_pending"]:
        print("Operacja Firebase nadal trwa; pokazano aktualne wymagania DNS.")
    print("Nie zmieniono DNS u rejestratora ani nie opublikowano gry.")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default=PROJECT)
    parser.add_argument("--domain", default=DOMAIN)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Odczytaj stan i DNS (domyślnie).")
    mode.add_argument("--apply", action="store_true", help="Utwórz brakujące powiązanie bez publikowania gry.")
    mode.add_argument("--status-only", action="store_true", help="Tylko GET zasobu, np. przez deployera w CI.")
    parser.add_argument("--json", action="store_true", help="Pełny raport JSON, bez poświadczeń.")
    args = parser.parse_args(argv)
    try:
        value = prepare(args.project, args.domain, apply=args.apply, status_only=args.status_only)
        if args.json:
            print(json.dumps(value, ensure_ascii=False, indent=2))
        else:
            print_report(value)
        # Successful creation is distinct from DNS readiness. Read-only gates
        # fail closed until all three ready states are present.
        return 0 if value["ready"] or (args.apply and value["configured"]) else 1
    except (hosting.PreparationError, KeyError, TypeError, AttributeError, ValueError) as error:
        print(f"BŁĄD: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
