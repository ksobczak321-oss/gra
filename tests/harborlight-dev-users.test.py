#!/usr/bin/env python3
"""Tests for permanent DEV identity setup, without credentials or cloud access."""

import copy
import importlib.util
import io
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
import urllib.error


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("dev_users", ROOT / "infra/google-cloud/prepare-dev-users.py")
users = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(users)


class FakeCloud:
    def __init__(self, ready=False):
        self.project = users.PROJECT
        self.number = "28040211190"
        self.label = "dev"
        self.billing = True
        self.apis = set(users.APIS) if ready else set()
        self.site = {"name": f"projects/{self.number}/sites/{self.project}",
                     "defaultUrl": f"https://{self.project}.web.app"}
        self.app = {"appId": f"1:{self.number}:web:abcdef123456", "displayName": users.APP_NAME, "state": "ACTIVE"} if ready else None
        if self.app:
            self.site["appId"] = self.app["appId"]
        self.config = users.nested_body(users.AUTH_SETTINGS) if ready else {}
        self.database = {"name": users.DATABASE_NAME, "locationId": users.REGION, "type": "FIRESTORE_NATIVE"} if ready else None
        self.rulesets = {f"projects/{self.project}/rulesets/current": {"source": users.rule_source()}} if ready else {}
        self.release = {"name": users.RELEASE_NAME, "rulesetName": next(iter(self.rulesets))} if ready else None
        self.accounts = {user["uid"]: {"localId": user["uid"], "email": user["email"], "displayName": user["login"],
                                        "passwordHash": "existing-private-hash", "disabled": False} for user in users.USERS} if ready else {}
        self.islands = {"dev-admin1": {"private": "existing-island-must-survive"}}
        self.calls, self.http = [], []
        self.compile_error = False
        self.ignore_config_update = False
        self.initialize_auth = True
        self.auto_default_rules = False

    def gcloud(self, *args, mutate=False, plain=False):
        self.calls.append((args, mutate))
        if args[:2] == ("auth", "list"):
            return [{"account": "owner@example.invalid"}]
        if args[:2] == ("projects", "describe"):
            return {"projectId": self.project, "projectNumber": self.number, "lifecycleState": "ACTIVE",
                    "labels": {"harborlight_env": self.label}}
        if args[:3] == ("billing", "projects", "describe"):
            return {"billingEnabled": self.billing, "billingAccountName": users.hosting.BILLING_ACCOUNT}
        if args[:2] == ("services", "list"):
            return [{"config": {"name": name}} for name in self.apis]
        if args[:2] == ("services", "enable") and mutate:
            self.apis.update(args[2:])
            return {}
        raise AssertionError(f"Unexpected CLI operation {args}")

    def request(self, method, url, body=None):
        self.http.append((method, url, copy.deepcopy(body)))
        if method == "GET" and url == f"{users.FIREBASE}/projects/{self.project}":
            return {"projectId": self.project, "projectNumber": self.number, "state": "ACTIVE"}
        site_url = f"{users.HOSTING}/projects/{self.project}/sites/{self.project}"
        if method == "GET" and url == site_url:
            return copy.deepcopy(self.site)
        if method == "PATCH" and url == site_url + "?updateMask=appId":
            self.site.update(body)
            return copy.deepcopy(self.site)
        if method == "POST" and url == f"{users.IDENTITY}/v1/projects/{self.project}/accounts:lookup":
            if self.config is None:
                raise AssertionError("Auth configuration must be resolved before account lookup")
            if body != {"localId": [user["uid"] for user in users.USERS]}:
                raise AssertionError("Lookup must be scoped to exact persistent identities")
            return {"users": list(copy.deepcopy(self.accounts).values())}
        if method == "POST" and url == f"{users.IDENTITY}/v1/projects/{self.project}/accounts":
            if body["localId"] in self.accounts:
                raise AssertionError("Existing account must never be recreated")
            self.accounts[body["localId"]] = {key: value for key, value in body.items() if key != "password"}
            self.accounts[body["localId"]]["passwordHash"] = "new-private-hash"
            return {"localId": body["localId"]}
        if method == "GET" and url == users.AUTH_CONFIG:
            if self.config is None:
                raise users.ApiError(404)
            return copy.deepcopy(self.config)
        if method == "PATCH" and url.startswith(users.AUTH_CONFIG + "?updateMask="):
            if self.config is None:
                if not self.initialize_auth:
                    raise users.ApiError(404)
                self.config = {}
            if not self.ignore_config_update:
                self.config.update(copy.deepcopy(body))
            return copy.deepcopy(self.config)
        apps_url = f"{users.FIREBASE}/projects/{self.project}/webApps"
        if method == "GET" and url == apps_url + "?pageSize=100":
            return {"apps": [copy.deepcopy(self.app)] if self.app else []}
        if method == "POST" and url == apps_url:
            if body != {"displayName": users.APP_NAME}:
                raise AssertionError("Unexpected Web App setup")
            self.app = {"appId": f"1:{self.number}:web:abcdef123456", "displayName": users.APP_NAME, "state": "ACTIVE"}
            return {"name": "operations/create-web-app"}
        if method == "GET" and url == users.FIREBASE + "/operations/create-web-app":
            return {"name": "operations/create-web-app", "done": True, "response": copy.deepcopy(self.app)}
        if self.app and method == "GET" and url == apps_url + "/" + self.app["appId"] + "/config":
            return {"projectId": self.project, "appId": self.app["appId"], "apiKey": "public-configuration-key"}
        db_url = f"{users.FIRESTORE}/{users.DATABASE_NAME}"
        if method == "GET" and url == db_url:
            if self.database is None:
                raise users.ApiError(404)
            return copy.deepcopy(self.database)
        if method == "POST" and url == f"{users.FIRESTORE}/projects/{self.project}/databases?databaseId=(default)":
            if body != {"locationId": users.REGION, "type": "FIRESTORE_NATIVE"}:
                raise AssertionError("Unexpected Firestore database definition")
            self.database = {"name": users.DATABASE_NAME, **body}
            if self.auto_default_rules:
                name = f"projects/{self.project}/rulesets/auto-default"
                self.rulesets[name] = {"source": {"files": [{"name": "firestore.rules", "content":
                    "rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { "
                    "match /{document=**} { allow read, write: if false; } } }"}]}}
                self.release = {"name": users.RELEASE_NAME, "rulesetName": name}
            return {"name": users.DATABASE_NAME + "/operations/create-db"}
        if method == "GET" and url == db_url + "/operations/create-db":
            return {"name": users.DATABASE_NAME + "/operations/create-db", "done": True, "response": copy.deepcopy(self.database)}
        if method == "GET" and url == f"{users.RULES}/{users.RELEASE_NAME}":
            if self.release is None:
                raise users.ApiError(404)
            return copy.deepcopy(self.release)
        if method == "GET" and url.startswith(f"{users.RULES}/projects/{self.project}/rulesets/"):
            return copy.deepcopy(self.rulesets[url.removeprefix(users.RULES + "/")])
        if method == "POST" and url == f"{users.RULES}/projects/{self.project}:test":
            if body != {"source": users.rule_source()}:
                raise AssertionError("Compile the exact deployed rules, not a different fixture")
            return {"issues": [{"severity": "ERROR"}]} if self.compile_error else {}
        if method == "POST" and url == f"{users.RULES}/projects/{self.project}/rulesets":
            name = f"projects/{self.project}/rulesets/generated"
            self.rulesets[name] = copy.deepcopy(body)
            return {"name": name}
        if method == "POST" and url == f"{users.RULES}/projects/{self.project}/releases":
            if self.release is not None:
                raise users.ApiError(409)
            self.release = copy.deepcopy(body)
            return copy.deepcopy(self.release)
        if method == "PATCH" and url == f"{users.RULES}/{users.RELEASE_NAME}":
            if body.get("updateMask") != "rulesetName" or set(body) != {"release", "updateMask"}:
                raise AssertionError("Official UpdateReleaseRequest wrapper is required")
            self.release = copy.deepcopy(body["release"])
            return copy.deepcopy(self.release)
        raise AssertionError(f"Unexpected {method} {url}")

    def mutations(self):
        return [args for args, mutate in self.calls if mutate] + [
            (method, url) for method, url, _body in self.http if method != "GET" and
            not url.endswith("accounts:lookup") and not url.endswith(":test")]


class DevUsersTests(unittest.TestCase):
    def run_prepare(self, cloud, **kwargs):
        self.lines = []
        return users.prepare(cloud=cloud, sleep=lambda _seconds: None, emit=self.lines.append, **kwargs)

    def test_owner_api_requests_use_dev_quota_instead_of_cloud_sdk_consumer(self):
        calls = []
        def runner(*_args, **_kwargs):
            return SimpleNamespace(returncode=0, stdout="private-owner-token", stderr="")
        class Opener:
            def open(self, request, timeout):
                headers = dict((key.lower(), value) for key, value in request.header_items())
                calls.append((request.get_method(), request.full_url, headers))
                if headers.get("x-goog-user-project") != users.PROJECT:
                    body = json.dumps({"error": {"status": "PERMISSION_DENIED", "details": [{
                        "@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": "SERVICE_DISABLED",
                        "metadata": {"service": "identitytoolkit.googleapis.com",
                                     "consumer": "projects/618104708054"}}]}}).encode()
                    raise urllib.error.HTTPError(request.full_url, 403, "forbidden", {}, io.BytesIO(body))
                return io.BytesIO(b'{"quotaProjectConfirmed":true}')
        cloud = users.Cloud(users.PROJECT, runner=runner, opener=Opener())
        for method, url, body in [
            ("GET", users.AUTH_CONFIG, None),
            ("PATCH", users.AUTH_CONFIG + "?updateMask=signIn.email.enabled", {"signIn": {"email": {"enabled": True}}}),
            ("POST", f"{users.IDENTITY}/v1/projects/{users.PROJECT}/accounts:lookup", {"localId": ["dev-admin1"]}),
            ("GET", f"{users.FIRESTORE}/{users.DATABASE_NAME}", None),
        ]:
            self.assertTrue(cloud.request(method, url, body)["quotaProjectConfirmed"])
        self.assertEqual(len(calls), 4)
        self.assertTrue(all(headers["x-goog-user-project"] == "harborlight-dev" for _method, _url, headers in calls))
        self.assertTrue(all(headers["authorization"] == "Bearer private-owner-token" for _method, _url, headers in calls))

    def test_provider_operation_names_are_opaque_and_polled_on_original_service(self):
        cases = [
            (users.FIREBASE, "operations/cp.28040211190"),
            (users.FIREBASE, "operations/projects/harborlight-dev/webApps/1:28040211190:web:abc/create=+"),
            (users.FIREBASE, "operations/projects/28040211190/apps/1:28040211190:web:abc/opaque=="),
            (users.FIREBASE, "operations/create:app=+token"),
            (users.FIRESTORE, users.DATABASE_NAME + "/operations/Y3JlYXRlLWRhdGFiYXNl=="),
            (users.FIRESTORE, "projects/28040211190/databases/(default)/operations/Y3JlYXRl=="),
        ]
        for origin, name in cases:
            with self.subTest(name=name):
                calls = []
                def request(method, url):
                    calls.append((method, url))
                    self.assertTrue(users.allowed_url(url))
                    return {"name": name, "done": True, "response": {"completed": True}}
                cloud = SimpleNamespace(request=request)
                result = users.wait_operation(cloud, {"name": name, "done": False}, origin,
                                              sleep=lambda _seconds: None)
                self.assertEqual(result, {"completed": True})
                self.assertEqual(calls, [("GET", users.operation_url(name, origin))])

    def test_operation_names_cannot_escape_namespace_project_or_original_origin(self):
        invalid = [
            (users.FIREBASE, "https://attacker.invalid/operations/id"),
            (users.FIREBASE, "projects/harborlight-prod/webApps/other"),
            (users.FIREBASE, "operations/projects/harborlight-prod/webApps/other"),
            (users.FIREBASE, "operations/../projects/harborlight-prod"),
            (users.FIREBASE, "operations/%2e%2e/other"),
            (users.FIREBASE, "operations/%252e%252e/other"),
            (users.FIREBASE, "operations/%2f%2fattacker.invalid"),
            (users.FIREBASE, "operations/id?alt=media"),
            (users.FIREBASE, "operations/id#fragment"),
            (users.FIREBASE, "operations/id\\other"),
            (users.FIREBASE, "operations/id\nother"),
            (users.FIRESTORE, "projects/harborlight-prod/databases/(default)/operations/id"),
            (users.FIRESTORE, "projects/992911312434/databases/(default)/operations/id"),
            (users.FIRESTORE, "projects/harborlight-dev/databases/other/operations/id"),
            (users.FIRESTORE, users.DATABASE_NAME + "/operations/id/other"),
            ("https://attacker.invalid/v1", "operations/id"),
        ]
        cloud = SimpleNamespace(request=lambda *_args: self.fail("Rejected operation must not make requests"))
        for origin, name in invalid:
            with self.subTest(origin=origin, name=name), self.assertRaises(users.PreparationError):
                users.wait_operation(cloud, {"name": name}, origin, sleep=lambda _seconds: None)
        valid = users.operation_url("operations/create:app==", users.FIREBASE)
        self.assertTrue(users.allowed_url(valid))
        self.assertFalse(users.allowed_url(valid + "?project=harborlight-prod"))
        self.assertFalse(users.allowed_url(valid + "#fragment"))

    def test_completed_or_failed_operations_do_not_poll_and_pending_operation_times_out(self):
        cloud = SimpleNamespace(request=lambda *_args: self.fail("Unexpected operation request"))
        name = "operations/create:app=="
        self.assertEqual(users.wait_operation(cloud, {"name": name, "done": True, "response": {"ok": True}},
                                               users.FIREBASE), {"ok": True})
        with self.assertRaisesRegex(users.PreparationError, "błędem Google"):
            users.wait_operation(cloud, {"name": name, "error": {"code": 7}}, users.FIREBASE)
        clock = iter([0, 181])
        with self.assertRaisesRegex(users.PreparationError, "trwa dłużej"):
            users.wait_operation(cloud, {"name": name}, users.FIREBASE,
                                 sleep=lambda _seconds: None, monotonic=lambda: next(clock))

    def test_default_check_never_prompts_enables_or_creates_resources(self):
        cloud = FakeCloud()
        def no_password(_login):
            raise AssertionError("Read-only check must not obtain passwords")
        self.assertFalse(self.run_prepare(cloud, password_provider=no_password))
        self.assertEqual(cloud.mutations(), [])

    def test_missing_auth_configuration_is_not_mistaken_for_empty_existing_accounts(self):
        cloud = FakeCloud(ready=True)
        cloud.config = None
        self.assertFalse(self.run_prepare(cloud))
        self.assertFalse(any(url.endswith("accounts:lookup") for _method, url, _body in cloud.http))
        self.assertEqual(cloud.mutations(), [])
        cloud.http.clear()
        self.assertTrue(self.run_prepare(cloud, apply=True, passwords_match_logins=True))
        config_patch = next(i for i, (method, url, _body) in enumerate(cloud.http)
                            if method == "PATCH" and url.startswith(users.AUTH_CONFIG))
        lookup = next(i for i, (_method, url, _body) in enumerate(cloud.http) if url.endswith("accounts:lookup"))
        self.assertLess(config_patch, lookup)
        self.assertFalse(any(url.endswith("/accounts") for _method, url, _body in cloud.http))

    def test_first_auth_initialization_failure_is_actionable_without_platform_upgrade_or_account_creation(self):
        cloud = FakeCloud(ready=True)
        before = copy.deepcopy(cloud.accounts)
        cloud.config = None
        cloud.initialize_auth = False
        with self.assertRaisesRegex(users.PreparationError, "console.firebase.google.com/project/harborlight-dev/authentication"):
            self.run_prepare(cloud, apply=True, passwords_match_logins=True)
        self.assertEqual(before, cloud.accounts)
        self.assertFalse(any("initializeAuth" in url or url.endswith("/accounts") for _method, url, _body in cloud.http))

    def test_ready_check_reads_three_real_ids_and_leaves_all_state_untouched(self):
        cloud = FakeCloud(ready=True)
        before = copy.deepcopy((cloud.accounts, cloud.islands, cloud.config, cloud.release))
        self.assertTrue(self.run_prepare(cloud))
        self.assertEqual(cloud.mutations(), [])
        self.assertEqual(before, (cloud.accounts, cloud.islands, cloud.config, cloud.release))
        self.assertTrue(all("/documents/" not in url for _method, url, _body in cloud.http))

    def test_apply_creates_requested_accounts_then_repeat_never_resets_passwords_or_islands(self):
        cloud = FakeCloud()
        self.assertTrue(self.run_prepare(cloud, apply=True, passwords_match_logins=True))
        created = [body for method, url, body in cloud.http if method == "POST" and url.endswith("/accounts")]
        self.assertEqual([(body["localId"], body["email"], body["password"]) for body in created],
                         [(f"dev-admin{i}", f"admin{i}@dev.harborlight.pl", f"admin{i}") for i in range(1, 4)])
        self.assertTrue(all(body["emailVerified"] is False and not body["disabled"] for body in created))
        self.assertTrue(all("customClaims" not in body and "customAttributes" not in body for body in created))
        before = copy.deepcopy((cloud.accounts, cloud.islands, cloud.app, cloud.database, cloud.config, cloud.release))
        cloud.calls.clear();cloud.http.clear()
        def no_password(_login):
            raise AssertionError("Repeated apply must not obtain or reset existing passwords")
        self.assertTrue(self.run_prepare(cloud, apply=True, password_provider=no_password))
        self.assertEqual(cloud.mutations(), [])
        self.assertEqual(before, (cloud.accounts, cloud.islands, cloud.app, cloud.database, cloud.config, cloud.release))
        self.assertTrue(all(word not in args for args, _mutate in cloud.calls for word in ["keys", "delete", "deploy"]))

    def test_only_missing_account_obtains_password_and_existing_records_are_preserved(self):
        cloud = FakeCloud(ready=True)
        del cloud.accounts["dev-admin2"]
        before = copy.deepcopy(cloud.accounts)
        requested = []
        def password(login):
            requested.append(login)
            return "unit-only-private-password"
        self.assertTrue(self.run_prepare(cloud, apply=True, password_provider=password))
        self.assertEqual(requested, ["admin2"])
        for uid, value in before.items():
            self.assertEqual(value, cloud.accounts[uid])
        self.assertNotIn("unit-only-private-password", "\n".join(self.lines))
        self.assertEqual(len(cloud.mutations()), 1)

    def test_wrong_project_context_label_or_billing_fails_before_any_mutation(self):
        cloud = FakeCloud()
        with self.assertRaises(users.PreparationError):
            self.run_prepare(cloud, project="harborlight-prod", apply=True, passwords_match_logins=True)
        self.assertEqual(cloud.calls, [])
        self.assertEqual(cloud.http, [])
        for field, value in [("project", "harborlight-prod"), ("label", "prod"), ("billing", False)]:
            cloud = FakeCloud()
            setattr(cloud, field, value)
            with self.subTest(field=field), self.assertRaises(users.PreparationError):
                self.run_prepare(cloud, apply=True, passwords_match_logins=True)
            self.assertEqual(cloud.mutations(), [])

    def test_mismatched_or_disabled_existing_identity_is_never_replaced(self):
        for field, value in [("email", "someone@else.invalid"), ("disabled", True)]:
            cloud = FakeCloud(ready=True)
            cloud.accounts["dev-admin1"][field] = value
            before = copy.deepcopy(cloud.accounts)
            with self.subTest(field=field), self.assertRaises(users.PreparationError):
                self.run_prepare(cloud, apply=True, passwords_match_logins=True)
            self.assertEqual(cloud.mutations(), [])
            self.assertEqual(before, cloud.accounts)

    def test_existing_database_with_wrong_type_or_location_is_not_recreated(self):
        for field, value in [("type", "DATASTORE_MODE"), ("locationId", "us-east1")]:
            cloud = FakeCloud(ready=True)
            cloud.database[field] = value
            before = copy.deepcopy(cloud.database)
            with self.subTest(field=field), self.assertRaises(users.PreparationError):
                self.run_prepare(cloud, apply=True, passwords_match_logins=True)
            self.assertEqual(cloud.mutations(), [])
            self.assertEqual(before, cloud.database)

    def test_unknown_rules_are_preserved_and_managed_rules_can_be_upgraded(self):
        cloud = FakeCloud(ready=True)
        name = cloud.release["rulesetName"]
        cloud.rulesets[name] = {"source": {"files": [{"name": "firestore.rules", "content": "allow read,write: if true;"}]}}
        with self.assertRaisesRegex(users.PreparationError, "niezarządzane"):
            self.run_prepare(cloud, apply=True, passwords_match_logins=True)
        self.assertEqual(cloud.mutations(), [])
        cloud.rulesets[name]["source"]["files"][0]["content"] = "// HARBORLIGHT DEV accounts v1\nold managed source"
        self.assertTrue(self.run_prepare(cloud, apply=True, passwords_match_logins=True))
        patches = [body for method, url, body in cloud.http if method == "PATCH" and "/releases/" in url]
        self.assertEqual(len(patches), 1)
        self.assertEqual(patches[0]["updateMask"], "rulesetName")

    def test_database_creation_refreshes_auto_created_default_rules_before_release_update(self):
        cloud = FakeCloud()
        cloud.auto_default_rules = True
        self.assertTrue(self.run_prepare(cloud, apply=True, passwords_match_logins=True))
        self.assertFalse(any(method == "POST" and url.endswith("/releases") for method, url, _body in cloud.http))
        self.assertTrue(any(method == "PATCH" and url.endswith("/releases/cloud.firestore") for method, url, _body in cloud.http))

    def test_returned_source_fingerprint_does_not_republish_identical_rules(self):
        cloud = FakeCloud(ready=True)
        cloud.rulesets[cloud.release["rulesetName"]]["source"]["files"][0]["fingerprint"] = "provider-fingerprint"
        self.assertTrue(self.run_prepare(cloud, apply=True, passwords_match_logins=True))
        self.assertEqual(cloud.mutations(), [])

    def test_google_compiler_error_stops_before_resource_changes(self):
        cloud = FakeCloud(ready=True)
        cloud.compile_error = True
        with self.assertRaisesRegex(users.PreparationError, "Kompilator"):
            self.run_prepare(cloud, apply=True, passwords_match_logins=True)
        self.assertEqual(cloud.mutations(), [])

    def test_success_requires_readback_not_just_successful_patch_response(self):
        cloud = FakeCloud(ready=True)
        cloud.config["signIn"]["email"]["enabled"] = False
        cloud.ignore_config_update = True
        with self.assertRaisesRegex(users.PreparationError, "Nie potwierdzono ustawień"):
            self.run_prepare(cloud, apply=True, passwords_match_logins=True)
        self.assertNotIn("zakończone:", "\n".join(self.lines))

    def test_host_and_project_url_guards_never_read_or_send_credentials_elsewhere(self):
        def no_runner(*_args, **_kwargs):
            raise AssertionError("Rejected request must not read credentials")
        cloud = users.Cloud(users.PROJECT, runner=no_runner)
        for url in ["http://identitytoolkit.googleapis.com/v2/projects/harborlight-dev/config",
                    "https://identitytoolkit.googleapis.com.attacker.invalid/v2/projects/harborlight-dev/config",
                    "https://identitytoolkit.googleapis.com/v2/projects/harborlight-prod/config",
                    "https://firestore.googleapis.com/v1/projects/harborlight-prod/databases/(default)",
                    "https://firestore.googleapis.com/v1/projects/harborlight-dev/databases/(default)/documents/islands/dev-admin1",
                    "https://firebase.googleapis.com/v1beta1/projects/harborlight-dev#fragment"]:
            with self.subTest(url=url), self.assertRaises(users.PreparationError):
                cloud.request("GET", url)

    def test_error_never_reflects_submitted_password_user_record_or_bearer(self):
        def runner(*_args, **_kwargs):
            return SimpleNamespace(returncode=0, stdout="private-owner-token", stderr="")
        class Opener:
            def open(self, request, timeout):
                body = json.dumps({"error": {"message": "Rejected unit-password-private-value private-owner-token"},
                                   "users": [{"passwordHash": "private-hash"}]}).encode()
                raise urllib.error.HTTPError(request.full_url, 403, "forbidden", {}, io.BytesIO(body))
        cloud = users.Cloud(users.PROJECT, runner=runner, opener=Opener())
        with self.assertRaises(users.ApiError) as raised:
            cloud.request("POST", f"{users.IDENTITY}/v1/projects/{users.PROJECT}/accounts", {"password": "unit-password-private-value"})
        message = str(raised.exception)
        for secret in ["unit-password-private-value", "private-owner-token", "private-hash"]:
            self.assertNotIn(secret, message)
        self.assertIn("HTTP 403", message)
        self.assertIn("POST identitytoolkit.googleapis.com", message)

    def test_non_password_errors_expose_safe_structural_permission_diagnostics(self):
        def runner(*_args, **_kwargs):
            return SimpleNamespace(returncode=0, stdout="private-owner-token", stderr="")
        class Opener:
            def open(self, request, timeout):
                body = json.dumps({"error": {"message": "arbitrary-private-provider-message", "status": "PERMISSION_DENIED",
                    "details": [{"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": "IAM_PERMISSION_DENIED",
                                 "metadata": {"permission": "firebaserules.rulesets.create"}}]}}).encode()
                raise urllib.error.HTTPError(request.full_url, 403, "forbidden", {}, io.BytesIO(body))
        cloud = users.Cloud(users.PROJECT, runner=runner, opener=Opener())
        with self.assertRaises(users.ApiError) as raised:
            cloud.request("POST", f"{users.RULES}/projects/{users.PROJECT}/rulesets", {})
        text = str(raised.exception)
        self.assertIn("PERMISSION_DENIED", text)
        self.assertIn("firebaserules.rulesets.create", text)
        self.assertNotIn("arbitrary-private-provider-message", text)

    def test_initial_password_length_uses_actual_firebase_minimum(self):
        cloud = FakeCloud(ready=True)
        del cloud.accounts["dev-admin2"]
        with self.assertRaisesRegex(users.PreparationError, "od 6 do 128"):
            self.run_prepare(cloud, apply=True, password_provider=lambda _login: "short")
        self.assertNotIn("dev-admin2", cloud.accounts)


if __name__ == "__main__":
    unittest.main(verbosity=2)
