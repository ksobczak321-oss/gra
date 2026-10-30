#!/usr/bin/env python3
"""Prepare Firebase Hosting for an existing, isolated HARBORLIGHT project.

Default --check is read-only. Run --apply once from an authenticated Cloud Shell.
This creates no game deployment, player account, database or service-account key.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


BILLING_ACCOUNT = "billingAccounts/010F11-5A6F09-27543C"
FIREBASE = "https://firebase.googleapis.com/v1beta1"
HOSTING = "https://firebasehosting.googleapis.com/v1beta1"
APIS = ("firebase.googleapis.com", "firebasehosting.googleapis.com")
HOSTING_ROLE = "roles/firebasehosting.admin"


class PreparationError(Exception):
    pass


class ApiError(PreparationError):
    def __init__(self, status, tos=False, diagnostics=(), phase=None):
        self.status = status
        self.tos = tos
        if tos:
            message = ("Konto Google nie zaakceptowało warunków Firebase. Otwórz "
                       "https://console.firebase.google.com/?forceCheckTos=true, "
                       "zaakceptuj je na swoim koncie i ponów konfigurację.")
        else:
            message = f"Odczyt lub konfiguracja Firebase nie powiodła się (HTTP {status})."
        if phase:
            message += " Etap: " + phase + "."
        if diagnostics:
            message += " Google: " + "; ".join(diagnostics) + "."
        super().__init__(message)


def safe_provider_text(value, token=None, limit=1000):
    """Bound provider diagnostic fields and remove reflected credentials."""
    if not isinstance(value, str):
        return ""
    if token:
        value = value.replace(token, "[REDACTED]")
    value = re.sub(r"(?i)\bBearer\s+[A-Za-z0-9._~+/=-]+", "Bearer [REDACTED]", value)
    value = re.sub(r"\bya29\.[A-Za-z0-9._~+/=-]+", "[REDACTED]", value)
    value = re.sub(r"\b1//[A-Za-z0-9._~+/=-]+", "[REDACTED]", value)
    value = re.sub(r"(?i)(\b(?:access_token|refresh_token|id_token)\b[\s\"']*[:=][\s\"']*)[A-Za-z0-9._~+/=-]+",
                   r"\1[REDACTED]", value)
    value = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", value)
    return " ".join(value.split())[:limit]


def provider_error(raw, token=None):
    """Expose only documented error fields, never the whole response body."""
    try:
        data = json.loads(raw)
        error = data.get("error") if isinstance(data, dict) else None
        if not isinstance(error, dict):
            return False, ()
    except (ValueError, TypeError):
        return False, ()
    diagnostics = []
    message = safe_provider_text(error.get("message"), token)
    if message:
        diagnostics.append("message=" + message)
    status = safe_provider_text(error.get("status"), token, 100)
    if status:
        diagnostics.append("status=" + status)
    details = error.get("details", [])
    if not isinstance(details, list):
        details = []
    reasons = []
    terms_text = [message]
    reported_error_info = False
    for item in details[:20]:
        if not isinstance(item, dict):
            continue
        # DebugInfo's detail participates only in the known ToS detection;
        # arbitrary debug data is deliberately not printed.
        if isinstance(item.get("detail"), str):
            terms_text.append(item["detail"][:2000])
        if item.get("@type") != "type.googleapis.com/google.rpc.ErrorInfo":
            continue
        reason = safe_provider_text(item.get("reason"), token, 128)
        if reason:
            reasons.append(reason)
        if reported_error_info:
            continue
        reported_error_info = True
        if reason:
            diagnostics.append("reason=" + reason)
        domain = safe_provider_text(item.get("domain"), token, 128)
        if domain:
            diagnostics.append("domain=" + domain)
        metadata = item.get("metadata")
        if isinstance(metadata, dict):
            for key in ("permission", "service", "method", "consumer"):
                value = safe_provider_text(metadata.get(key), token, 192)
                if value:
                    diagnostics.append(key + "=" + value)
        # Report one ErrorInfo but keep scanning for a known ToS signal,
        # regardless of its ordering among the provider's error details.
    normalized = " ".join(terms_text + reasons).lower().replace("_", " ")
    tos = any(phrase in normalized for phrase in (
        "firebase tos not accepted", "tos not accepted", "terms not accepted",
        "terms of service not accepted",
    ))
    return tos, tuple(diagnostics)


def require(condition, message):
    if not condition:
        raise PreparationError(message)


def project_environment(project):
    require(project in ("harborlight-dev", "harborlight-prod"),
            "Dozwolone są tylko projekty harborlight-dev i harborlight-prod.")
    return project.rsplit("-", 1)[1]


def has_role(policy, role, member):
    return any(binding.get("role") == role and member in binding.get("members", [])
               and not binding.get("condition") for binding in policy.get("bindings", []))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Cloud:
    def __init__(self, project, runner=subprocess.run, opener=None):
        self.project = project
        self.runner = runner
        self.opener = opener or urllib.request.build_opener(NoRedirect())
        self.token = None

    def gcloud(self, *arguments, mutate=False, plain=False):
        command = ["gcloud", f"--project={self.project}", *arguments]
        if mutate:
            command.append("--quiet")
        if not plain:
            command.append("--format=json")
        try:
            result = self.runner(command, stdin=subprocess.DEVNULL,
                                 env=dict(os.environ, CLOUDSDK_CORE_DISABLE_PROMPTS="false"),
                                 capture_output=True, text=True, timeout=120, check=False)
        except (OSError, subprocess.TimeoutExpired) as error:
            raise PreparationError("Nie można wykonać gcloud. Użyj zalogowanego Google Cloud Shell.") from error
        require(result.returncode == 0, f"gcloud zakończył odczyt lub konfigurację błędem {result.returncode}.")
        if plain:
            return result.stdout.strip()
        try:
            return json.loads(result.stdout) if result.stdout.strip() else {}
        except (TypeError, ValueError) as error:
            raise PreparationError("gcloud zwrócił niepoprawny JSON.") from error

    def request(self, method, url, body=None):
        parsed = urllib.parse.urlsplit(url)
        require(parsed.scheme == "https" and parsed.netloc in
                ("firebase.googleapis.com", "firebasehosting.googleapis.com")
                and not parsed.fragment and parsed.path.startswith("/v1beta1/"),
                "Odrzucono nieoczekiwany adres API Firebase.")
        require(method in ("GET", "POST"), "Odrzucono nieoczekiwaną metodę API.")
        if self.token is None:
            self.token = self.gcloud("auth", "print-access-token", plain=True)
            require(bool(re.fullmatch(r"[A-Za-z0-9._~+/=-]+", self.token or "")),
                    "Nie uzyskano prawidłowego dostępu Google. Ponów autoryzację Cloud Shell.")
        data = None if body is None else json.dumps(body).encode()
        request = urllib.request.Request(url, data=data, method=method,
                                         headers={"Authorization": "Bearer " + self.token,
                                                  "Content-Type": "application/json",
                                                  "Accept": "application/json"})
        try:
            with self.opener.open(request, timeout=30) as response:
                raw = response.read(2_000_001)
                require(len(raw) <= 2_000_000, "Odpowiedź Firebase jest zbyt duża.")
                value = json.loads(raw)
                require(isinstance(value, dict), "Firebase nie zwrócił obiektu zasobu.")
                return value
        except urllib.error.HTTPError as error:
            raw = error.read(2_000_000)
            tos, diagnostics = provider_error(raw, self.token)
            phase = safe_provider_text(f"{method} {parsed.netloc}{parsed.path}", self.token, 320)
            raise ApiError(error.code, tos, diagnostics, phase) from None
        except (urllib.error.URLError, TimeoutError, ValueError) as error:
            raise PreparationError("Nie można odczytać poprawnej odpowiedzi API Firebase.") from error


def get_optional(cloud, url, retries=0, sleep=time.sleep):
    for attempt in range(retries + 1):
        try:
            return cloud.request("GET", url)
        except ApiError as error:
            if error.status == 404:
                return None
            if error.tos or error.status not in (403, 429, 500, 502, 503, 504) or attempt == retries:
                raise
            sleep(2)


def wait_operation(cloud, operation, timeout=180, sleep=time.sleep, monotonic=time.monotonic):
    name = operation.get("name", "")
    require(bool(re.fullmatch(r"operations/[A-Za-z0-9._~-]+", name)),
            "Firebase zwrócił nieoczekiwaną nazwę operacji.")
    deadline = monotonic() + timeout
    while True:
        if operation.get("error"):
            raise PreparationError("Operacja dodania Firebase zakończyła się błędem; sprawdź uprawnienia konta w konsoli.")
        if operation.get("done") is True:
            return operation.get("response", {})
        require(monotonic() < deadline, "Dodawanie Firebase przekroczyło czas. Ponów --check za chwilę.")
        sleep(2)
        operation = cloud.request("GET", f"{FIREBASE}/{name}")


def validate_firebase(data, project, number):
    require(data.get("projectId") == project, "Firebase zwrócił inny projekt.")
    require(str(data.get("projectNumber", "")) == number, "Numer projektu Firebase jest niezgodny z Google Cloud.")
    require(data.get("state") == "ACTIVE", "Projekt Firebase nie jest aktywny.")


def validate_site(data, project, number):
    require(data.get("name") in (f"projects/{project}/sites/{project}", f"projects/{number}/sites/{project}"),
            "Hosting zwrócił witrynę należącą do innego projektu.")
    require(data.get("defaultUrl") == f"https://{project}.web.app", "Nieoczekiwany adres witryny Hosting.")


def prepare(project, apply=False, cloud=None, sleep=time.sleep, monotonic=time.monotonic, emit=print):
    environment = project_environment(project)
    cloud = cloud or Cloud(project)
    accounts = cloud.gcloud("auth", "list", "--filter=status:ACTIVE")
    require(isinstance(accounts, list) and len(accounts) == 1 and accounts[0].get("account"),
            "Brak jednego aktywnego konta Google. Zaloguj się do Cloud Shell.")
    info = cloud.gcloud("projects", "describe", project)
    require(info.get("projectId") == project and info.get("lifecycleState") == "ACTIVE",
            "Projekt Google Cloud nie jest aktywny.")
    require(info.get("labels", {}).get("harborlight_env") == environment,
            "Projekt nie ma właściwej etykiety środowiska. Najpierw wykonaj bootstrap.")
    number = str(info.get("projectNumber", ""))
    require(bool(re.fullmatch(r"[1-9][0-9]*", number)), "Nie odczytano numeru projektu.")
    billing = cloud.gcloud("billing", "projects", "describe", project)
    require(billing.get("billingEnabled") is True and billing.get("billingAccountName") == BILLING_ACCOUNT,
            "Projekt nie ma aktywnych rozliczeń HARBORLIGHT.")
    services = cloud.gcloud("services", "list", "--enabled")
    require(isinstance(services, list), "Nie odczytano listy aktywnych API.")
    enabled = {item.get("config", {}).get("name") for item in services if isinstance(item, dict)}
    policy = cloud.gcloud("projects", "get-iam-policy", project)
    member = f"serviceAccount:harborlight-deployer@{project}.iam.gserviceaccount.com"
    role_ready = has_role(policy, HOSTING_ROLE, member)
    emit(f"PASS {environment.upper()} — projekt, etykieta i rozliczenia HARBORLIGHT")

    if not apply and (not set(APIS).issubset(enabled) or not role_ready):
        if not set(APIS).issubset(enabled):
            emit("CHECK — API Firebase/Hosting czekają na włączenie.")
        if not role_ready:
            emit("CHECK — deployer czeka na rolę Firebase Hosting Admin.")
        emit("CHECK — nie wykonano zmian. Użyj --apply, aby przygotować Hosting.")
        return False
    if apply:
        if not set(APIS).issubset(enabled):
            cloud.gcloud("services", "enable", *APIS, mutate=True)
        if not role_ready:
            cloud.gcloud("projects", "add-iam-policy-binding", project, f"--member={member}",
                         f"--role={HOSTING_ROLE}", "--condition=None", mutate=True)

    project_url = f"{FIREBASE}/projects/{project}"
    firebase = get_optional(cloud, project_url, retries=3 if apply else 0, sleep=sleep)
    if firebase is None:
        if not apply:
            emit("CHECK — projekt nie ma jeszcze Firebase; nie wykonano zmian.")
            return False
        emit(f"APPLY {environment.upper()} — dodawanie Firebase do istniejącego projektu")
        operation = cloud.request("POST", f"{project_url}:addFirebase", {})
        wait_operation(cloud, operation, sleep=sleep, monotonic=monotonic)
        firebase = get_optional(cloud, project_url, retries=3, sleep=sleep)
        require(firebase is not None, "Firebase nie jest jeszcze widoczne. Ponów --check za chwilę.")
    validate_firebase(firebase, project, number)
    emit(f"PASS {environment.upper()} — Firebase aktywne na właściwym projekcie")

    site_url = f"{HOSTING}/projects/{project}/sites/{project}"
    site = get_optional(cloud, site_url, retries=3 if apply else 0, sleep=sleep)
    if site is None:
        if not apply:
            emit("CHECK — witryna Hosting nie istnieje; nie wykonano zmian.")
            return False
        try:
            site = cloud.request("POST", f"{HOSTING}/projects/{project}/sites?siteId={project}", {"appId": ""})
        except ApiError as error:
            # Firebase may finish creating its default site between the GET
            # above and this request. Verify that resource instead of failing
            # or choosing a different public hostname.
            if error.status != 409:
                raise
            site = get_optional(cloud, site_url, retries=3, sleep=sleep)
            require(site is not None, "Witryna jest nadal przygotowywana. Ponów --check za chwilę.")
    validate_site(site, project, number)
    emit(f"PASS {environment.upper()} — witryna https://{project}.web.app")
    emit(("APPLY zakończone" if apply else "CHECK zakończone") + ": Hosting gotowy do publikacji przez zatwierdzony workflow.")
    emit("Zakres: konfiguracja hostingu. Nie opublikowano gry, nie utworzono bazy ani kont graczy.")
    return True


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True, choices=("harborlight-dev", "harborlight-prod"))
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Tylko odczyt (domyślnie).")
    mode.add_argument("--apply", action="store_true", help="Przygotuj Hosting, bez publikowania gry.")
    args = parser.parse_args(argv)
    try:
        return 0 if prepare(args.project, apply=args.apply) else 1
    except (PreparationError, KeyError, TypeError, AttributeError) as error:
        print(f"BŁĄD: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
