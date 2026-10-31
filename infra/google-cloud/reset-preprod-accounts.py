#!/usr/bin/env python3
"""Reset only the three PRE-PROD game profiles after a verified promotion.

Read-only unless --apply. Authentication users/passwords are never mutated.
A verified GitHub artifact ZIP and fresh Hosting/API readbacks are required.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import stat
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("reset_hosting", HERE / "prepare-hosting.py")
hosting = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(hosting)
Error = hosting.PreparationError
require = hosting.require
PROJECT, NUMBER = "harborlight-dev", "28040211190"
REPO, REPO_ID = "ksobczak321-oss/gra", 1428128759
UIDS = tuple(f"dev-admin{i}" for i in range(1, 4))
DATABASE = f"projects/{PROJECT}/databases/(default)"
DOCS = DATABASE + "/documents"
FS = "https://firestore.googleapis.com/v1/"
RULES = f"https://firebaserules.googleapis.com/v1/projects/{PROJECT}"
RELEASE = f"projects/{PROJECT}/releases/cloud.firestore"
SITE = "https://harborlight-dev.web.app"
DENY_RULES = """// HARBORLIGHT PRE-PROD API-only v1; never replace with legacy client grants.
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
"""
MAX_DOCUMENTS, MAX_WRITES = 430, 450
RULE_PROPAGATION_SECONDS = 600
# Legal acceptance is an identity record, not a game reward. All other
# account-owned collections are erased, including future gameplay histories.
PRESERVE_COLLECTIONS = frozenset(("legalAcceptances",))


def positive(value):
    return type(value) is int and 0 < value < 2**53


def safe_path(path):
    return isinstance(path, str) and path not in (".", "..") and re.fullmatch(r"[A-Za-z0-9_():.-]+(?:/[A-Za-z0-9_():.-]+)*", path) is not None


def scoped_document(name):
    if not isinstance(name, str) or not name.startswith(DOCS + "/"):
        return False
    parts = name[len(DOCS) + 1:].split("/")
    if len(parts) % 2 or not all(safe_path(part) for part in parts):
        return False
    return ((parts[0] in ("accounts", "islands") and parts[1] in UIDS) or
            (len(parts) == 2 and parts[0] == "playerTradeOffers" and re.fullmatch(r"trade_[a-f0-9]{40}", parts[1]) is not None) or
            (len(parts) == 2 and parts[0] == "adminOperations" and re.fullmatch(r"preprod-reset-[1-9][0-9]*-[1-9][0-9]*", parts[1]) is not None))


def decode(value):
    if "stringValue" in value: return value["stringValue"]
    if "integerValue" in value: return int(value["integerValue"])
    if "booleanValue" in value: return value["booleanValue"]
    if "nullValue" in value: return None
    if "doubleValue" in value: return value["doubleValue"]
    if "timestampValue" in value: return value["timestampValue"]
    if "arrayValue" in value: return [decode(item) for item in value["arrayValue"].get("values", [])]
    if "mapValue" in value: return fields(value["mapValue"].get("fields", {}))
    raise Error("Nieobsługiwany typ dokumentu; nie wykonano resetu.")


def fields(document_fields):
    return {key: decode(value) for key, value in document_fields.items()}


def encode(value):
    if value is None: return {"nullValue": None}
    if type(value) is bool: return {"booleanValue": value}
    if type(value) is int: return {"integerValue": str(value)}
    if isinstance(value, str): return {"stringValue": value}
    if isinstance(value, list): return {"arrayValue": {"values": [encode(item) for item in value]}}
    if isinstance(value, dict): return {"mapValue": {"fields": {key: encode(item) for key, item in value.items()}}}
    raise Error("Nieobsługiwany typ zapisu.")


def json_bytes(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode()


def public_bytes(url, limit=2_000_000):
    parsed = urllib.parse.urlsplit(url)
    require(parsed.scheme == "https" and parsed.netloc in ("api.github.com", "harborlight-dev.web.app"), "Odrzucono adres publicznego dowodu.")
    headers = {"Accept": "application/vnd.github+json" if parsed.netloc == "api.github.com" else "application/json", "Cache-Control": "no-cache", "User-Agent": "harborlight-preprod-reset"}
    # GitHub credentials never go to Google or to redirect destinations.
    if parsed.netloc == "api.github.com" and os.environ.get("GH_TOKEN"):
        headers["Authorization"] = "Bearer " + os.environ["GH_TOKEN"]
    try:
        with urllib.request.build_opener(hosting.NoRedirect()).open(urllib.request.Request(url, headers=headers), timeout=30) as response:
            raw = response.read(limit + 1)
    except (urllib.error.URLError, TimeoutError):
        raise Error("Nie można odczytać publicznego dowodu wdrożenia; reset zablokowany.") from None
    require(len(raw) <= limit, "Dowód przekroczył limit rozmiaru.")
    return raw


def public_json(url):
    try: return json.loads(public_bytes(url))
    except (ValueError, TypeError): raise Error("Niepoprawny JSON dowodu wdrożenia.") from None


def validate_run(run, commit, workflow, event, run_id=None):
    require(isinstance(run, dict) and all(isinstance(run.get(key), dict) and run[key].get("id") == REPO_ID and
            run[key].get("full_name", "").lower() == REPO.lower() for key in ("repository", "head_repository")), "Przebieg należy do innego repozytorium.")
    require(run.get("path") == ".github/workflows/" + workflow and run.get("event") == event and run.get("head_branch") == "main" and
            run.get("head_sha") == commit and run.get("status") == "completed" and run.get("conclusion") == "success" and
            positive(run.get("id")) and positive(run.get("run_attempt")) and (run_id is None or run["id"] == run_id),
            "Wymagany zakończony sukcesem przebieg właściwego etapu i tego samego SHA.")
    return run


def verify_promotion(run_id, commit, archive, fetch_json=public_json, fetch_bytes=public_bytes):
    require(positive(run_id) and re.fullmatch(r"[a-f0-9]{40}", commit or ""), "Podaj ID wdrożenia i pełny SHA.")
    base = f"https://api.github.com/repos/{REPO}/actions"
    run = validate_run(fetch_json(f"{base}/runs/{run_id}"), commit, "google-cloud-dev.yml", "workflow_dispatch", run_id)
    artifact_name = f"harborlight-dev-release-{run_id}-{run['run_attempt']}"
    found, page = [], 1
    while True:
        response = fetch_json(f"{base}/runs/{run_id}/artifacts?per_page=100&page={page}")
        values = response.get("artifacts", [])
        require(isinstance(values, list) and page <= 10, "Nieprawidłowa lista artefaktów.")
        found.extend(item for item in values if item.get("name") == artifact_name)
        if len(values) < 100: break
        page += 1
    require(len(found) == 1 and found[0].get("expired") is False, "Brak bieżącego artefaktu potwierdzenia udanego wdrożenia.")
    artifact = found[0]
    require(Path(archive).stat().st_size <= 2_000_000, "ZIP przekracza limit rozmiaru.")
    raw = Path(archive).read_bytes()
    require(len(raw) <= 2_000_000 and artifact.get("digest") == "sha256:" + hashlib.sha256(raw).hexdigest(), "ZIP nie zgadza się z SHA256 artefaktu GitHub.")
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as zipped:
            require(zipped.namelist() == ["release.json"] and zipped.getinfo("release.json").file_size <= 100000,
                    "ZIP potwierdzenia musi zawierać wyłącznie release.json.")
            receipt = json.loads(zipped.read("release.json"))
    except (zipfile.BadZipFile, ValueError, KeyError): raise Error("Nieprawidłowe archiwum potwierdzenia.") from None
    require(receipt.get("schema_version") == 2 and receipt.get("repository", "").lower() == REPO.lower() and receipt.get("repository_id") == REPO_ID and receipt.get("source_sha") == commit and
            receipt.get("dev") == {"run_id": run_id, "run_attempt": run["run_attempt"]}, "Potwierdzenie wydania dotyczy innego SHA/przebiegu.")
    require(all(receipt.get("checks", {}).get(key) is True for key in ("ci", "dev_smoke", "frontend_smoke", "account_api")), "Brak pełnego odbioru PRE-PROD i aktywnego API kont.")
    ci = receipt.get("ci", {})
    require(positive(ci.get("run_id")) and positive(ci.get("run_attempt")), "Brak dowodu CI.")
    ci_run = validate_run(fetch_json(f"{base}/runs/{ci['run_id']}"), commit, "ci.yml", "push", ci["run_id"])
    require(ci_run["run_attempt"] == ci["run_attempt"], "Potwierdzenie dotyczy innej próby CI.")
    image = receipt.get("image", {})
    require(re.fullmatch(r"europe-central2-docker\.pkg\.dev/harborlight-dev/harborlight/api@sha256:[a-f0-9]{64}", image.get("uri", "")) is not None and image.get("digest") == image["uri"].split("@", 1)[1], "Nieprawidłowy niezmienny obraz PRE-PROD.")
    frontend = receipt.get("frontend", {})
    require(frontend.get("site") == PROJECT and frontend.get("url") == SITE and frontend.get("artifact_name") == f"harborlight-dev-frontend-{run_id}-{run['run_attempt']}", "Niewłaściwy Hosting potwierdzenia.")
    manifest_raw = fetch_bytes(SITE + "/release.json?commit=" + commit)
    try: manifest = json.loads(manifest_raw)
    except ValueError: raise Error("Hosting nie zwrócił manifestu.") from None
    require(manifest.get("schema_version") == 1 and manifest.get("commit") == commit and
            hashlib.sha256(manifest_raw).hexdigest() == frontend.get("manifest_sha256"), "Aktualny Hosting nie jest tym samym odebranym wydaniem.")
    config = fetch_json(SITE + "/api/v1/config")
    require(config.get("accountApi") is True and config.get("projectId") == PROJECT and config.get("environment") == "preprod", "API kont PRE-PROD nie jest aktywne.")
    return {"runId": run_id, "runAttempt": run["run_attempt"], "commit": commit, "manifestSha256": hashlib.sha256(manifest_raw).hexdigest(),
            "artifactSha256": hashlib.sha256(raw).hexdigest(), "ciRunId": ci["run_id"], "imageUri": image["uri"]}


class Cloud(hosting.Cloud):
    def __init__(self): super().__init__(PROJECT)

    def request(self, method, url, body=None):
        parsed = urllib.parse.urlsplit(url)
        require(parsed.scheme == "https" and not parsed.fragment and not parsed.username and not parsed.password, "Odrzucono adres API.")
        if parsed.netloc == "firestore.googleapis.com":
            prefix = "/v1/" + DOCS
            require(parsed.path == "/v1/" + DATABASE and method == "GET" or parsed.path.startswith(prefix) and (parsed.path == prefix + ":commit" or parsed.path.startswith(prefix + "/") or parsed.path == prefix + ":listCollectionIds"), "Odrzucono bazę inną niż PRE-PROD.")
            if method == "POST" and parsed.path.endswith(":commit"):
                validate_writes(body.get("writes", []))
            else:
                require(method == "GET" or method == "POST" and parsed.path.endswith(":listCollectionIds"), "Niedozwolona operacja Firestore.")
        elif parsed.netloc == "firebaserules.googleapis.com":
            require(re.fullmatch(rf"/v1/projects/{PROJECT}/(?:releases/cloud\.firestore|rulesets(?:/[A-Za-z0-9_-]+)?)", parsed.path) is not None and method in ("GET", "POST", "PATCH"), "Niedozwolona operacja reguł.")
            if method == "POST": require(body == {"source": {"files": [{"name": "firestore.rules", "content": DENY_RULES}]}}, "Można opublikować wyłącznie deny-all.")
            if method == "PATCH": require(body.get("release", {}).get("name") == RELEASE and body["release"].get("rulesetName", "").startswith(f"projects/{PROJECT}/rulesets/"), "Niewłaściwy release reguł.")
        elif parsed.netloc == "identitytoolkit.googleapis.com":
            require(parsed.path == f"/v1/projects/{PROJECT}/accounts:lookup" and method == "POST" and body == {"localId": list(UIDS)}, "Auth służy tylko do odczytu trzech tożsamości.")
        else: raise Error("Odrzucono usługę spoza zakresu resetu.")
        if self.token is None: self.token = self.gcloud("auth", "print-access-token", plain=True)
        request = urllib.request.Request(url, data=None if body is None else json_bytes(body), method=method,
                    headers={"Authorization": "Bearer " + self.token, "x-goog-user-project": PROJECT, "Content-Type": "application/json"})
        try:
            with self.opener.open(request, timeout=45) as response:
                raw = response.read(15_000_001)
                require(len(raw) <= 15_000_000, "Odpowiedź przekracza limit; przerwano reset.")
                return json.loads(raw)
        except urllib.error.HTTPError as error:
            if error.code == 404 and method == "GET" and parsed.netloc == "firestore.googleapis.com": return None
            # Do not reflect private payloads, password hashes or credentials.
            _tos, diagnostics = hosting.provider_error(error.read(100000), self.token)
            details = "; ".join(diagnostics)
            raise Error(f"API resetu {method} {parsed.netloc}{parsed.path} zwróciło HTTP {error.code}; nie potwierdzono resetu." + (" " + details if details else "")) from None
        except (urllib.error.URLError, TimeoutError, ValueError): raise Error("Nie udało się potwierdzić odpowiedzi API resetu.") from None


def validate_writes(writes):
    require(isinstance(writes, list) and 0 < len(writes) <= MAX_WRITES, "Plan przekracza limit jednego atomowego resetu.")
    seen = set()
    for write in writes:
        name = write.get("delete") or write.get("update", {}).get("name")
        condition = write.get("currentDocument")
        valid_condition = isinstance(condition, dict) and (condition == {"exists": False} or set(condition) == {"updateTime"} and isinstance(condition["updateTime"], str) and bool(condition["updateTime"]))
        require(scoped_document(name) and name not in seen and valid_condition and set(write) in ({"delete", "currentDocument"}, {"update", "currentDocument"}), "Plan zapisu wychodzi poza trzy konta lub nie ma CAS.")
        parts = name[len(DOCS) + 1:].split("/")
        require(not (parts[0] == "accounts" and len(parts) > 2 and parts[2] in PRESERVE_COLLECTIONS), "Nie wolno usuwać zgód prawnych.")
        seen.add(name)


def verify_project(cloud):
    info = cloud.gcloud("projects", "describe", PROJECT)
    require(info.get("projectId") == PROJECT and str(info.get("projectNumber")) == NUMBER and info.get("lifecycleState") == "ACTIVE" and info.get("labels", {}).get("harborlight_env") == "dev", "Nie potwierdzono stałego projektu PRE-PROD.")
    billing = cloud.gcloud("billing", "projects", "describe", PROJECT)
    require(billing.get("billingEnabled") is True and billing.get("billingAccountName") == hosting.BILLING_ACCOUNT, "Nieprawidłowe rozliczenia PRE-PROD.")
    database = cloud.request("GET", FS + DATABASE)
    require(isinstance(database, dict) and database.get("name") == DATABASE and database.get("type") == "FIRESTORE_NATIVE" and database.get("locationId") == "europe-central2", "Baza PRE-PROD musi być istniejącą bazą Native (default) w Warszawie; skrypt nie tworzy ani nie przenosi bazy.")
    auth = cloud.request("POST", f"https://identitytoolkit.googleapis.com/v1/projects/{PROJECT}/accounts:lookup", {"localId": list(UIDS)})
    identities = {item.get("localId"): item for item in auth.get("users", [])}
    require(set(identities) == set(UIDS) and all(identities[uid].get("disabled", False) is False and identities[uid].get("email") == uid.removeprefix("dev-") + "@dev.harborlight.pl" for uid in UIDS), "Brak właściwych trzech niezmienianych tożsamości Auth.")


def read_rules(cloud):
    release = cloud.request("GET", RULES + "/releases/cloud.firestore")
    name = release.get("rulesetName", "")
    require(re.fullmatch(rf"projects/{PROJECT}/rulesets/[A-Za-z0-9_-]+", name) is not None, "Reguły należą do innego projektu.")
    ruleset = cloud.request("GET", "https://firebaserules.googleapis.com/v1/" + name)
    return {"release": release, "source": ruleset.get("source", {})}


def locked_rules(rules):
    files = rules.get("source", {}).get("files", [])
    return [{key: item.get(key) for key in ("name", "content")} for item in files] == [{"name": "firestore.rules", "content": DENY_RULES}]


def lock_rules(cloud):
    created = cloud.request("POST", RULES + "/rulesets", {"source": {"files": [{"name": "firestore.rules", "content": DENY_RULES}]}})
    require(re.fullmatch(rf"projects/{PROJECT}/rulesets/[A-Za-z0-9_-]+", created.get("name", "")) is not None, "Nie potwierdzono deny-all.")
    cloud.request("PATCH", RULES + "/releases/cloud.firestore", {"release": {"name": RELEASE, "rulesetName": created["name"]}, "updateMask": "rulesetName"})
    require(locked_rules(read_rules(cloud)), "Odczyt Google nie potwierdził blokady starszych klientów.")


def propagated_rules(rules, now=None):
    require(locked_rules(rules), "Reguły nie blokują starszych klientów.")
    try:
        published = datetime.fromisoformat(rules["release"]["updateTime"].replace("Z", "+00:00")).timestamp()
    except (KeyError, ValueError, TypeError):
        raise Error("Brak czasu publikacji reguł; nie można potwierdzić propagacji.") from None
    elapsed = (time.time() if now is None else now) - published
    require(elapsed >= RULE_PROPAGATION_SECONDS,
            f"Deny-all opublikowane. Ponów tę samą komendę za {max(1, int(RULE_PROPAGATION_SECONDS - elapsed) + 1)} s, aby stare klienty utraciły uprawnienia. Postępu jeszcze nie usunięto.")


def document(cloud, path):
    require(scoped_document(DOCS + "/" + path), "Odrzucono dokument spoza resetu.")
    result = cloud.request("GET", FS + DOCS + "/" + path)
    require(result is None or result.get("name") == DOCS + "/" + path and isinstance(result.get("updateTime"), str), "Nieprawidłowa tożsamość dokumentu.")
    return result


def collection(cloud, parent, collection_id):
    require(safe_path(collection_id) and "/" not in collection_id, "Nieprawidłowa kolekcja.")
    base, token, results = DOCS + ("/" + parent if parent else ""), None, []
    while True:
        query = {"pageSize": "100", "showMissing": "true"}
        if token: query["pageToken"] = token
        response = cloud.request("GET", FS + base + "/" + collection_id + "?" + urllib.parse.urlencode(query))
        require(isinstance(response, dict), "Nie można odczytać kolekcji.")
        for item in response.get("documents", []):
            require(item.get("name", "").startswith(base + "/" + collection_id + "/") and len(item["name"][len(base) + len(collection_id) + 2:].split("/")) == 1, "Nieprawidłowa ścieżka w kolekcji.")
            results.append(item)
            require(len(results) <= MAX_DOCUMENTS, "Za dużo dokumentów; reset wymaga osobnego planu zamiast nieatomowego kasowania.")
        token = response.get("nextPageToken")
        if not token: return results


def descendants(cloud, path, depth=0):
    require(depth < 8, "Nieoczekiwana głębokość danych; reset zatrzymany.")
    token, results = None, []
    while True:
        body = {"pageSize": 100}
        if token: body["pageToken"] = token
        listing = cloud.request("POST", FS + DOCS + "/" + path + ":listCollectionIds", body)
        for child in listing.get("collectionIds", []):
            if path.startswith("accounts/") and len(path.split("/")) == 2 and child in PRESERVE_COLLECTIONS: continue
            for item in collection(cloud, path, child):
                item_path = item["name"][len(DOCS) + 1:]
                require(scoped_document(item["name"]), "Nieoczekiwana ścieżka potomna.")
                if item.get("updateTime"): results.append(item)
                results.extend(descendants(cloud, item_path, depth + 1))
                require(len(results) <= MAX_DOCUMENTS, "Za dużo historii dla atomowego resetu.")
        token = listing.get("nextPageToken")
        if not token: return results


def snapshot(cloud, operation_id):
    roots, children = {}, []
    for uid in UIDS:
        for kind in ("accounts", "islands"):
            path = kind + "/" + uid
            roots[path] = document(cloud, path)
            children.extend(descendants(cloud, path))
    offers = []
    for offer in collection(cloud, "", "playerTradeOffers"):
        if not offer.get("updateTime"): continue
        data = fields(offer.get("fields", {}))
        # Keep unrelated offers and their owners completely untouched.
        if data.get("ownerUid") not in UIDS: continue
        require(data.get("acceptedBy") is None or data["acceptedBy"] in UIDS, "Oferta łączy resetowane konto z innym graczem; wymaga osobnego rozliczenia.")
        require(scoped_document(offer["name"]), "Nieprawidłowa oferta resetowanego konta.")
        offers.append(offer)
    operation = document(cloud, "adminOperations/" + operation_id)
    return {"roots": roots, "children": children, "offers": offers, "operation": operation}


def precondition(doc): return {"updateTime": doc["updateTime"]} if doc else {"exists": False}


def reset_plan(snap, proof, at):
    operation_id = f"preprod-reset-{proof['runId']}-{proof['runAttempt']}"
    if snap["operation"]:
        previous = fields(snap["operation"].get("fields", {}))
        require(previous.get("commit") == proof["commit"] and previous.get("status") == "completed" and previous.get("uids") == list(UIDS), "Istnieje inne lub niepełne potwierdzenie resetu.")
        return {"alreadyApplied": True, "receipt": previous, "writes": []}
    writes, generations = [], {}
    for uid in UIDS:
        account, island = snap["roots"]["accounts/" + uid], snap["roots"]["islands/" + uid]
        account_fields = fields(account.get("fields", {})) if account else {}
        island_fields = fields(island.get("fields", {})) if island else {}
        generation = account_fields.get("islandGeneration", island_fields.get("generation", 1))
        require(positive(generation) and generation < 2**53 - 1 and island_fields.get("generation", generation) == generation, "Niespójna generacja; reset zatrzymany.")
        generations[uid] = generation + 1
        fresh = {"islandGeneration": generation + 1, "islandExpiredAt": None, "lastPlayedAt": None,
                 "preprodReset": {"operationId": operation_id, "at": at, "commit": proof["commit"]}}
        if "legalAcceptance" in account_fields: fresh["legalAcceptance"] = account_fields["legalAcceptance"]
        writes.append({"update": {"name": DOCS + "/accounts/" + uid, "fields": {**{key: encode(value) for key, value in fresh.items()}, **({"legalAcceptance": account["fields"]["legalAcceptance"]} if "legalAcceptance" in account_fields else {})}}, "currentDocument": precondition(account)})
        # exists:false also fences a concurrently created first world.
        writes.append({"delete": DOCS + "/islands/" + uid, "currentDocument": precondition(island)})
    for doc in snap["children"] + snap["offers"]:
        writes.append({"delete": doc["name"], "currentDocument": precondition(doc)})
    receipt = {"schemaVersion": 1, "status": "completed", "project": PROJECT, "uids": list(UIDS), "at": at,
               "commit": proof["commit"], "deploymentRunId": proof["runId"], "deploymentRunAttempt": proof["runAttempt"],
               "manifestSha256": proof["manifestSha256"], "artifactSha256": proof["artifactSha256"], "generations": generations,
               "deletedHistoryDocuments": len(snap["children"]), "deletedOffers": len(snap["offers"])}
    writes.append({"update": {"name": DOCS + "/adminOperations/" + operation_id, "fields": {key: encode(value) for key, value in receipt.items()}}, "currentDocument": {"exists": False}})
    validate_writes(writes)
    require(len(json_bytes({"writes": writes})) < 9_000_000, "Plan jest za duży dla atomowego commit.")
    return {"alreadyApplied": False, "receipt": receipt, "writes": writes}


def backup(snap, proof, rules, backup_root=None):
    root = Path(backup_root or Path.home() / ".harborlight-private-backups").expanduser()
    require(not root.is_symlink(), "Katalog kopii nie może być dowiązaniem.")
    resolved = root.resolve()
    repo = HERE.parents[1]
    require(resolved != repo and repo not in resolved.parents, "Kopia nie może trafić do repozytorium.")
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    require(root.stat().st_uid == os.getuid() and stat.S_IMODE(root.stat().st_mode) == 0o700, "Katalog kopii musi należeć do użytkownika i mieć uprawnienia 0700.")
    name = f"{proof['runId']}-{proof['runAttempt']}-{time.time_ns()}.json"
    path = root / name
    raw = json_bytes({"project": PROJECT, "proof": proof, "snapshot": snap, "previousRules": rules})
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
    with os.fdopen(descriptor, "wb") as stream:
        stream.write(raw); stream.flush(); os.fsync(stream.fileno())
    return path, hashlib.sha256(raw).hexdigest()


def execute(args, cloud=None, emit=print, verifier=verify_promotion):
    cloud = cloud or Cloud()
    proof = verifier(args.deployment_run_id, args.commit, args.receipt_archive)
    verify_project(cloud)
    # Read actual Cloud Run release as well as the Hosting API route.
    service = cloud.gcloud("run", "services", "describe", "harborlight-api-dev", "--region=europe-central2")
    container_spec = service.get("spec", {}).get("template", {}).get("spec", {})
    container = container_spec.get("containers", [{}])[0]
    env = {item.get("name"): item.get("value") for item in container.get("env", [])}
    require(container.get("image") == proof["imageUri"], "Cloud Run nie używa niezmiennego obrazu odebranego wydania.")
    require(container_spec.get("serviceAccountName") == f"harborlight-runtime@{PROJECT}.iam.gserviceaccount.com", "Cloud Run ma inną tożsamość runtime.")
    require(env.get("HARBORLIGHT_RELEASE") == args.commit and env.get("HARBORLIGHT_ACCOUNT_API") == "1" and env.get("HARBORLIGHT_PROJECT_ID") == PROJECT, "Cloud Run nie potwierdza tej samej wersji aktywnego API.")
    traffic = service.get("status", {}).get("traffic", [])
    ready_revision = service.get("status", {}).get("latestReadyRevisionName")
    status = service.get("status", {})
    require(status.get("latestCreatedRevisionName") == ready_revision and any(item.get("type") == "Ready" and item.get("status") == "True" for item in status.get("conditions", [])), "Żądana rewizja Cloud Run nie jest jeszcze gotową rewizją serwującą wydanie.")
    require(ready_revision and sum(item.get("percent", 0) for item in traffic) == 100 and all(item.get("revisionName") == ready_revision for item in traffic if item.get("percent", 0)), "Cloud Run dzieli ruch między wydaniami; reset zablokowany.")
    policy = cloud.gcloud("projects", "get-iam-policy", PROJECT)
    runtime_member = f"serviceAccount:harborlight-runtime@{PROJECT}.iam.gserviceaccount.com"
    require(hosting.has_role(policy, "roles/datastore.user", runtime_member), "Brak udokumentowanego roles/datastore.user dla runtime PRE-PROD. Właściciel musi przygotować IAM API; skrypt nie nadaje ról.")
    rules = read_rules(cloud)
    operation_id = f"preprod-reset-{proof['runId']}-{proof['runAttempt']}"
    snap = snapshot(cloud, operation_id)
    plan = reset_plan(snap, proof, int(time.time() * 1000))
    if plan["alreadyApplied"]:
        emit("PASS PRE-PROD — reset tego przebiegu już wykonany; nie zresetowano ponownie grających kont.")
        return plan["receipt"]
    emit("PLAN PRE-PROD — tylko admin1, admin2, admin3; UID, hasła i zgody prawne pozostają.")
    for write in plan["writes"]: emit(("DELETE " if "delete" in write else "REPLACE ") + (write.get("delete") or write["update"]["name"]))
    emit(f"PLAN — {len(plan['writes'])} operacji w jednym atomowym commit; generacje {plan['receipt']['generations']}.")
    if not args.apply:
        emit("DRY RUN — nie zmieniono zasobów. " + ("Deny-all aktywne." if locked_rules(rules) else "Wymagana blokada legacy zapisów: przy apply dodaj --lock-client-writes."))
        return plan["receipt"]
    require(locked_rules(rules) or args.lock_client_writes, "Starsze klienty mogą odtworzyć wyspę. Wymagane --lock-client-writes lub wcześniej opublikowane dokładne deny-all.")
    path, digest = backup(snap, proof, rules, args.backup_dir)
    emit(f"BACKUP — {path}; SHA256 {digest}; plik 0600 poza repozytorium.")
    if not locked_rules(rules):
        lock_rules(cloud)
        # Refresh under the new rules. CAS protects API mutations during the
        # scan/commit; no game mutation can create a receipt without changing
        # the root island/account that this commit also compares.
        snap = snapshot(cloud, operation_id)
        plan = reset_plan(snap, proof, int(time.time() * 1000))
        path, digest = backup(snap, proof, rules, args.backup_dir)
        emit(f"BACKUP po blokadzie — {path}; SHA256 {digest}.")
    propagated_rules(read_rules(cloud))
    # A newer promotion after planning must stop the reset rather than wiping
    # users of an unreviewed or already replaced deployment.
    require(verifier(args.deployment_run_id, args.commit, args.receipt_archive) == proof and locked_rules(read_rules(cloud)), "Wydanie lub reguły zmieniły się podczas planowania.")
    if plan["alreadyApplied"]: return plan["receipt"]
    cloud.request("POST", FS + DOCS + ":commit", {"writes": plan["writes"]})
    stored = document(cloud, "adminOperations/" + operation_id)
    require(stored and fields(stored.get("fields", {})) == plan["receipt"], "Nie potwierdzono atomowego resetu odczytem Google. Ponów ten sam przebieg, nie nowy reset.")
    for uid in UIDS:
        account = document(cloud, "accounts/" + uid)
        require(account and fields(account["fields"]).get("islandGeneration") == plan["receipt"]["generations"][uid], "Nie potwierdzono nowej generacji.")
    emit("APPLY zakończone — trzy profile wyzerowane atomowo; potwierdzenie odczytano z Google. Nowy świat utworzy serwer przy wejściu gracza, z zatrzymanym wprowadzeniem.")
    return plan["receipt"]


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--deployment-run-id", type=int, required=True)
    result.add_argument("--commit", required=True)
    result.add_argument("--receipt-archive", type=Path, required=True, help="ZIP artefaktu harborlight-dev-release-RUN-ATTEMPT pobrany z GitHub Actions")
    result.add_argument("--apply", action="store_true")
    result.add_argument("--lock-client-writes", action="store_true", help="przy apply publikuje deny-all wyłącznie na Firestore PRE-PROD")
    result.add_argument("--backup-dir", type=Path)
    return result


def main(argv=None):
    try:
        args = parser().parse_args(argv)
        require(not args.lock_client_writes or args.apply, "--lock-client-writes wymaga --apply.")
        execute(args)
        return 0
    except (Error, OSError, ValueError, TypeError, KeyError, AttributeError) as error:
        # Errors originating from private JSON are deliberately not echoed.
        print("BŁĄD: " + (str(error) if isinstance(error, Error) else "Niepoprawny lub niedostępny lokalny dowód; nie potwierdzono resetu."), file=sys.stderr)
        return 1


if __name__ == "__main__": sys.exit(main())
