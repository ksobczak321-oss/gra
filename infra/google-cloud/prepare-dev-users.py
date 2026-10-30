#!/usr/bin/env python3
"""Prepare three permanent DEV users and their private Firestore island saves.

Run in the owner's authenticated Cloud Shell. The default --check is read-only.
--apply only targets harborlight-dev, never changes existing users/passwords or
islands, and never deploys game files. No service-account keys are created.
"""

import argparse
import getpass
import importlib.util
import json
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("harborlight_hosting", HERE / "prepare-hosting.py")
hosting = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(hosting)
PreparationError = hosting.PreparationError
ApiError = hosting.ApiError
require = hosting.require

PROJECT = "harborlight-dev"
REGION = "europe-central2"
APP_NAME = "HARBORLIGHT DEV"
USERS = tuple({"login": f"admin{i}", "uid": f"dev-admin{i}",
               "email": f"admin{i}@dev.harborlight.pl"} for i in range(1, 4))
APIS = ("identitytoolkit.googleapis.com", "firestore.googleapis.com", "firebaserules.googleapis.com")
FIREBASE = "https://firebase.googleapis.com/v1beta1"
HOSTING = "https://firebasehosting.googleapis.com/v1beta1"
IDENTITY = "https://identitytoolkit.googleapis.com"
FIRESTORE = "https://firestore.googleapis.com/v1"
RULES = "https://firebaserules.googleapis.com/v1"
AUTH_CONFIG = f"{IDENTITY}/v2/projects/{PROJECT}/config"
DATABASE_NAME = f"projects/{PROJECT}/databases/(default)"
RELEASE_NAME = f"projects/{PROJECT}/releases/cloud.firestore"
RULES_PATH = HERE / "firestore.dev.rules"
AUTH_SETTINGS = {
    "signIn.email.enabled": True,
    "signIn.email.passwordRequired": True,
    "client.permissions.disabledUserSignup": True,
    "client.permissions.disabledUserDeletion": True,
}


def nested(data, path):
    for part in path.split("."):
        if not isinstance(data, dict):
            return None
        data = data.get(part)
    return data


def nested_body(settings):
    result = {}
    for path, value in settings.items():
        parts, current = path.split("."), result
        for part in parts[:-1]:
            current = current.setdefault(part, {})
        current[parts[-1]] = value
    return result


def allowed_url(url):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or parsed.fragment or parsed.username or parsed.password:
        return False
    patterns = {
        "firebase.googleapis.com": rf"/v1beta1/(?:projects/{PROJECT}(?:/webApps(?:/[^/]+(?:/config)?)?)?|operations/[A-Za-z0-9._~-]+)",
        "firebasehosting.googleapis.com": rf"/v1beta1/projects/{PROJECT}/sites/{PROJECT}",
        "identitytoolkit.googleapis.com": rf"/(?:v2/projects/{PROJECT}/config|v1/projects/{PROJECT}/accounts(?::lookup)?)",
        "firestore.googleapis.com": rf"/v1/projects/{PROJECT}/databases(?:/\(default\)(?:/operations/[A-Za-z0-9._~-]+)?)?",
        "firebaserules.googleapis.com": rf"/v1/projects/{PROJECT}(?::test|/rulesets(?:/[A-Za-z0-9._~-]+)?|/releases(?:/cloud\.firestore)?)",
    }
    pattern = patterns.get(parsed.netloc)
    return bool(pattern and re.fullmatch(pattern, parsed.path))


class Cloud(hosting.Cloud):
    def request(self, method, url, body=None):
        require(allowed_url(url), "Odrzucono adres spoza projektu DEV lub oficjalnego API.")
        require(method in ("GET", "POST", "PATCH"), "Odrzucono nieoczekiwaną metodę API.")
        if self.token is None:
            self.token = self.gcloud("auth", "print-access-token", plain=True)
            require(bool(re.fullmatch(r"[A-Za-z0-9._~+/=-]+", self.token or "")),
                    "Nie uzyskano dostępu Google. Ponów logowanie Cloud Shell.")
        data = None if body is None else json.dumps(body).encode()
        request = urllib.request.Request(url, data=data, method=method,
                                         headers={"Authorization": "Bearer " + self.token,
                                                  "Content-Type": "application/json", "Accept": "application/json"})
        try:
            with self.opener.open(request, timeout=30) as response:
                raw = response.read(2_000_001)
            require(len(raw) <= 2_000_000, "Odpowiedź konfiguracji jest zbyt duża.")
            value = json.loads(raw)
            require(isinstance(value, dict), "API nie zwróciło obiektu zasobu.")
            return value
        except urllib.error.HTTPError as error:
            # Identity responses may reflect a submitted password. Never echo
            # their body, arbitrary messages, user records or credential fields.
            diagnostics, tos = (), False
            if not (isinstance(body, dict) and "password" in body):
                raw = error.read(2_000_000)
                tos, fields = hosting.provider_error(raw, self.token)
                diagnostics = tuple(field for field in fields if not field.startswith("message="))
            phase = f"{method} {urllib.parse.urlsplit(url).netloc}{urllib.parse.urlsplit(url).path}"
            raise ApiError(error.code, tos=tos, diagnostics=diagnostics, phase=phase) from None
        except (urllib.error.URLError, TimeoutError, ValueError) as error:
            raise PreparationError("Nie można odczytać odpowiedzi Google. Ponów konfigurację.") from error


def optional(cloud, url):
    try:
        return cloud.request("GET", url)
    except ApiError as error:
        if error.status == 404:
            return None
        raise


def wait_operation(cloud, operation, origin, sleep=time.sleep, monotonic=time.monotonic):
    name = operation.get("name", "")
    url = f"{origin}/{name}"
    require(allowed_url(url), "Operacja Google nie należy do obsługiwanego zasobu DEV.")
    deadline = monotonic() + 180
    while True:
        require(not operation.get("error"), "Operacja konfiguracji zakończyła się błędem Google.")
        if operation.get("done") is True:
            response = operation.get("response", {})
            require(isinstance(response, dict), "Operacja nie zwróciła zasobu.")
            return response
        require(monotonic() < deadline, "Konfiguracja trwa dłużej. Ponów --check za chwilę.")
        sleep(2)
        operation = cloud.request("GET", url)


def read_password(login):
    require(sys.stdin.isatty(), "Użyj interaktywnego Cloud Shell do ustawienia haseł.")
    first = getpass.getpass(f"Hasło dla {login}: ")
    require(6 <= len(first) <= 128, "Hasło musi mieć od 6 do 128 znaków.")
    require(first == getpass.getpass(f"Powtórz hasło dla {login}: "), "Hasła nie są takie same.")
    return first


def validate_user(data, user):
    require(data.get("localId") == user["uid"] and data.get("email") == user["email"],
            f"Istniejący UID {user['uid']} ma inną tożsamość. Nie zmieniono konta.")
    require(not data.get("disabled"), f"Konto {user['login']} jest wyłączone. Nie zmieniono konta.")


def lookup_users(cloud):
    response = cloud.request("POST", f"{IDENTITY}/v1/projects/{PROJECT}/accounts:lookup",
                             {"localId": [user["uid"] for user in USERS]})
    records = response.get("users", [])
    require(isinstance(records, list), "Nie odczytano listy użytkowników.")
    wanted = {user["uid"]: user for user in USERS}
    existing = {}
    for record in records:
        require(isinstance(record, dict) and record.get("localId") in wanted,
                "Odczyt użytkowników zwrócił nieoczekiwane konto.")
        require(record["localId"] not in existing, "Odczyt użytkowników zwrócił duplikat UID.")
        validate_user(record, wanted[record["localId"]])
        existing[record["localId"]] = record
    return existing


def app_id_ok(app_id, number):
    return isinstance(app_id, str) and bool(re.fullmatch(rf"1:{number}:web:[A-Za-z0-9_-]+", app_id))


def find_app(cloud, site, number):
    apps, page_token = [], None
    for _page in range(20):
        query = {"pageSize": 100}
        if page_token:
            query["pageToken"] = page_token
        response = cloud.request("GET", f"{FIREBASE}/projects/{PROJECT}/webApps?" + urllib.parse.urlencode(query))
        values = response.get("apps", [])
        require(isinstance(values, list), "Nie odczytano aplikacji Web.")
        apps.extend(values)
        page_token = response.get("nextPageToken")
        if not page_token:
            break
    require(not page_token, "Zbyt dużo aplikacji Web do bezpiecznego wyboru.")
    app_id = site.get("appId")
    selected = [app for app in apps if isinstance(app, dict) and
                (app.get("appId") == app_id if app_id else app.get("displayName") == APP_NAME)
                and app.get("state", "ACTIVE") == "ACTIVE"]
    require(len(selected) <= 1, "Znaleziono kilka pasujących aplikacji Web; nie dokonano wyboru.")
    if selected:
        app = selected[0]
        require(app_id_ok(app.get("appId"), number), "Aplikacja Web ma niezgodny numer projektu.")
        return app
    require(not app_id, "Witryna jest powiązana z inną lub nieaktywną aplikacją; nie zmieniono powiązania.")
    return None


def rule_source():
    content = RULES_PATH.read_text(encoding="utf-8")
    require(content.startswith("// HARBORLIGHT DEV accounts v1"), "Brak znacznika zarządzanych reguł DEV.")
    return {"files": [{"name": "firestore.rules", "content": content}]}


def normalize_rules(content):
    content = re.sub(r"/\*.*?\*/", "", content, flags=re.S)
    content = re.sub(r"//[^\n]*", "", content)
    return re.sub(r"\s+", "", content)


def replaceable_rules(source, desired):
    if same_rules(source, desired):
        return True
    files = source.get("files", []) if isinstance(source, dict) else []
    if not isinstance(files, list) or len(files) != 1 or not isinstance(files[0], dict) or not isinstance(files[0].get("content"), str):
        return False
    content = files[0]["content"]
    if content.startswith("// HARBORLIGHT DEV accounts v1"):
        return True
    # A new Firestore project's closed default policy contains no user grants.
    closed = "servicecloud.firestore{match/databases/{database}/documents{match/{document=**}{allowread,write:iffalse;}}}"
    compact = normalize_rules(content)
    return compact in (closed, "rules_version='2';" + closed)


def same_rules(source, desired):
    files = source.get("files", []) if isinstance(source, dict) else []
    if not isinstance(files, list) or not all(isinstance(file, dict) for file in files):
        return False
    # Google may return an optional source fingerprint with the same content.
    return [{key: file.get(key) for key in ("name", "content")} for file in files] == desired["files"]


def read_rule_release(cloud, desired):
    release = optional(cloud, f"{RULES}/{RELEASE_NAME}")
    if release is None:
        return None, False
    require(release.get("name") == RELEASE_NAME, "Reguły dotyczą innego projektu lub usługi.")
    name = release.get("rulesetName", "")
    require(bool(re.fullmatch(rf"projects/{PROJECT}/rulesets/[A-Za-z0-9._~-]+", name)),
            "Nieoczekiwany identyfikator reguł.")
    ruleset = cloud.request("GET", f"{RULES}/{name}")
    source = ruleset.get("source", {})
    require(replaceable_rules(source, desired),
            "Istnieją niezarządzane reguły Firestore. Nie zastąpiono ich ani nie zmieniono danych.")
    return release, same_rules(source, desired)


def compile_rules(cloud, source):
    # This is the same non-resource-mutating compiler call used by Firebase CLI.
    result = cloud.request("POST", f"{RULES}/projects/{PROJECT}:test", {"source": source})
    require(not any(issue.get("severity") == "ERROR" for issue in result.get("issues", [])),
            "Kompilator Google odrzucił reguły Firestore. Nie opublikowano reguł.")


def validate_database(database):
    require(isinstance(database, dict) and database.get("name") == DATABASE_NAME and
            database.get("type") == "FIRESTORE_NATIVE" and database.get("locationId") == REGION,
            "Baza Firestore ma inny typ lub lokalizację albo nie jest gotowa. Nie zmieniono ani nie usunięto istniejącej bazy.")


def prepare(project=PROJECT, apply=False, passwords_match_logins=False, cloud=None,
            password_provider=read_password, sleep=time.sleep, emit=print):
    require(project == PROJECT, "Ten skrypt obsługuje wyłącznie harborlight-dev.")
    cloud = cloud or Cloud(PROJECT)
    require(cloud.project == PROJECT, "Kontekst Google nie dotyczy DEV.")
    accounts = cloud.gcloud("auth", "list", "--filter=status:ACTIVE")
    require(isinstance(accounts, list) and len(accounts) == 1 and accounts[0].get("account"),
            "Zaloguj właściwe konto właściciela w Cloud Shell.")
    info = cloud.gcloud("projects", "describe", PROJECT)
    require(info.get("projectId") == PROJECT and info.get("lifecycleState") == "ACTIVE" and
            info.get("labels", {}).get("harborlight_env") == "dev", "Projekt nie ma poprawnej tożsamości DEV.")
    number = str(info.get("projectNumber", ""))
    require(bool(re.fullmatch(r"[1-9][0-9]*", number)), "Nie odczytano numeru projektu DEV.")
    billing = cloud.gcloud("billing", "projects", "describe", PROJECT)
    require(billing.get("billingEnabled") is True and billing.get("billingAccountName") == hosting.BILLING_ACCOUNT,
            "Projekt nie ma właściwych aktywnych rozliczeń HARBORLIGHT.")
    firebase = cloud.request("GET", f"{FIREBASE}/projects/{PROJECT}")
    hosting.validate_firebase(firebase, PROJECT, number)
    site_url = f"{HOSTING}/projects/{PROJECT}/sites/{PROJECT}"
    site = cloud.request("GET", site_url)
    hosting.validate_site(site, PROJECT, number)
    emit("PASS DEV — projekt, rozliczenia, Firebase i witryna")
    services = cloud.gcloud("services", "list", "--enabled")
    require(isinstance(services, list), "Nie odczytano aktywnych API.")
    enabled = {service.get("config", {}).get("name") for service in services if isinstance(service, dict)}
    missing_apis = [api for api in APIS if api not in enabled]
    if missing_apis:
        if not apply:
            emit("CHECK — API kont, Firestore lub reguł czekają na przygotowanie; nie wykonano zmian.")
            return False
        cloud.gcloud("services", "enable", *missing_apis, mutate=True)

    config = optional(cloud, AUTH_CONFIG)
    if config is None:
        if not apply:
            emit("CHECK — Firebase Authentication nie jest jeszcze przygotowane; nie wykonano zmian.")
            return False
        try:
            cloud.request("PATCH", AUTH_CONFIG + "?" + urllib.parse.urlencode({"updateMask": ",".join(AUTH_SETTINGS)}),
                          nested_body(AUTH_SETTINGS))
            config = cloud.request("GET", AUTH_CONFIG)
        except ApiError as error:
            if error.status == 404:
                raise PreparationError("Uruchom Authentication w istniejącym projekcie: "
                                       "https://console.firebase.google.com/project/harborlight-dev/authentication, "
                                       "a następnie ponów --apply. Nie włączono automatycznie Identity Platform.") from None
            raise
    existing = lookup_users(cloud)
    auth_ready = all(nested(config, path) is value for path, value in AUTH_SETTINGS.items())
    app = find_app(cloud, site, number)
    database = optional(cloud, f"{FIRESTORE}/{DATABASE_NAME}")
    if database is not None:
        validate_database(database)
    source = rule_source()
    release, rules_ready = read_rule_release(cloud, source)
    ready = auth_ready and app is not None and site.get("appId") == app.get("appId") and database is not None and rules_ready and len(existing) == len(USERS)
    if not apply and not ready:
        emit("CHECK — konta lub ich konfiguracja czekają na przygotowanie. Użyj --apply; nie wykonano zmian.")
        return False
    if apply:
        compile_rules(cloud, source)
        if not auth_ready:
            cloud.request("PATCH", AUTH_CONFIG + "?" + urllib.parse.urlencode({"updateMask": ",".join(AUTH_SETTINGS)}),
                          nested_body(AUTH_SETTINGS))
        if app is None:
            operation = cloud.request("POST", f"{FIREBASE}/projects/{PROJECT}/webApps", {"displayName": APP_NAME})
            app = wait_operation(cloud, operation, FIREBASE, sleep=sleep)
            require(app_id_ok(app.get("appId"), number), "Nowa aplikacja Web ma niezgodny projekt.")
        if site.get("appId") != app["appId"]:
            site = cloud.request("PATCH", site_url + "?updateMask=appId", {"appId": app["appId"]})
            hosting.validate_site(site, PROJECT, number)
            require(site.get("appId") == app["appId"], "Witryna nie potwierdziła aplikacji Web.")
        if database is None:
            operation = cloud.request("POST", f"{FIRESTORE}/projects/{PROJECT}/databases?databaseId=(default)",
                                      {"locationId": REGION, "type": "FIRESTORE_NATIVE"})
            wait_operation(cloud, operation, FIRESTORE, sleep=sleep)
        # Creating the database may initialize a closed default release. Also
        # guard against a policy changed since the initial read-only preflight.
        release, rules_ready = read_rule_release(cloud, source)
        if not rules_ready:
            ruleset = cloud.request("POST", f"{RULES}/projects/{PROJECT}/rulesets", {"source": source})
            name = ruleset.get("name", "")
            require(bool(re.fullmatch(rf"projects/{PROJECT}/rulesets/[A-Za-z0-9._~-]+", name)),
                    "Utworzone reguły mają nieoczekiwany identyfikator.")
            rule_release = {"name": RELEASE_NAME, "rulesetName": name}
            if release is None:
                cloud.request("POST", f"{RULES}/projects/{PROJECT}/releases", rule_release)
            else:
                cloud.request("PATCH", f"{RULES}/{RELEASE_NAME}", {"release": rule_release, "updateMask": "rulesetName"})
        for user in USERS:
            if user["uid"] not in existing:
                password = user["login"] if passwords_match_logins else password_provider(user["login"])
                require(isinstance(password, str) and 6 <= len(password) <= 128, "Hasło musi mieć od 6 do 128 znaków.")
                payload = {"localId": user["uid"], "email": user["email"], "displayName": user["login"],
                           "password": password, "emailVerified": False, "disabled": False}
                try:
                    result = cloud.request("POST", f"{IDENTITY}/v1/projects/{PROJECT}/accounts", payload)
                    require(result.get("localId") == user["uid"], "Utworzone konto nie potwierdziło oczekiwanego UID.")
                finally:
                    payload.pop("password", None)
                    password = None

    web_config = cloud.request("GET", f"{FIREBASE}/projects/{PROJECT}/webApps/{app['appId']}/config")
    require(web_config.get("projectId") == PROJECT and web_config.get("appId") == app["appId"] and web_config.get("apiKey"),
            "Aplikacja Web nie potwierdziła konfiguracji DEV.")
    final_users = lookup_users(cloud)
    require(len(final_users) == len(USERS), "Nie potwierdzono wszystkich trzech trwałych kont.")
    final_config = cloud.request("GET", AUTH_CONFIG)
    require(all(nested(final_config, path) is value for path, value in AUTH_SETTINGS.items()),
            "Nie potwierdzono ustawień logowania i trwałości kont DEV.")
    final_site = cloud.request("GET", site_url)
    hosting.validate_site(final_site, PROJECT, number)
    require(final_site.get("appId") == app["appId"], "Witryna nie potwierdziła powiązania z aplikacją Web.")
    validate_database(cloud.request("GET", f"{FIRESTORE}/{DATABASE_NAME}"))
    _final_release, final_rules_ready = read_rule_release(cloud, source)
    require(final_rules_ready, "Nie potwierdzono aktywnych reguł prywatnych wysp DEV.")
    for user in USERS:
        emit(f"PASS DEV — konto {user['login']}, UID {user['uid']}; istniejące hasło pozostawiono bez zmian")
    emit(("APPLY" if apply else "CHECK") + " zakończone: trzy konta DEV i prywatny zapis Firestore gotowe.")
    emit("Nie opublikowano gry, nie resetowano kont ani wysp. PROD nie jest obsługiwany przez ten skrypt.")
    return True


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default=PROJECT, choices=(PROJECT,))
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--passwords-match-logins", action="store_true",
                        help="Tylko nowe konta DEV: ustaw początkowe hasło równe loginowi zgodnie z ustaleniem.")
    args = parser.parse_args(argv)
    try:
        return 0 if prepare(args.project, apply=args.apply, passwords_match_logins=args.passwords_match_logins) else 1
    except (PreparationError, OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        print(f"BŁĄD: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
