#!/usr/bin/env python3
"""Credential-free checks of one-time Hosting setup and its read-only mode."""

import contextlib
import importlib.util
import io
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
import urllib.error


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("prepare_hosting", ROOT / "infra/google-cloud/prepare-hosting.py")
hosting = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(hosting)


class FakeCloud:
    def __init__(self, project="harborlight-dev", ready=False):
        self.project = project
        self.environment = project.rsplit("-", 1)[-1]
        self.number = "123456789"
        self.apis = self.role = self.firebase = self.site = ready
        self.viewer = ready
        self.billing = True
        self.label = self.environment
        self.calls = []
        self.http = []

    def gcloud(self, *arguments, mutate=False, plain=False):
        self.calls.append((arguments, mutate))
        if arguments[:2] == ("auth", "list"):
            return [{"account": "owner@example.invalid", "status": "ACTIVE"}]
        if arguments[:2] == ("projects", "describe"):
            return {"projectId": self.project, "projectNumber": self.number,
                    "lifecycleState": "ACTIVE", "labels": {"harborlight_env": self.label}}
        if arguments[:3] == ("billing", "projects", "describe"):
            return {"billingEnabled": self.billing, "billingAccountName": hosting.BILLING_ACCOUNT}
        if arguments[:2] == ("services", "list"):
            return [{"config": {"name": name}} for name in hosting.APIS] if self.apis else []
        if arguments[:2] == ("projects", "get-iam-policy"):
            member = f"serviceAccount:harborlight-deployer@{self.project}.iam.gserviceaccount.com"
            return {"bindings": [{"role": role, "members": [member]}
                                 for role, ready in [(hosting.HOSTING_ROLE, self.role),
                                                     (hosting.SERVICE_USAGE_VIEWER_ROLE, self.viewer)] if ready]}
        if arguments[:2] == ("services", "enable") and mutate:
            self.apis = True
            return {}
        if arguments[:2] == ("projects", "add-iam-policy-binding") and mutate:
            if f"--role={hosting.HOSTING_ROLE}" in arguments:
                self.role = True
            elif f"--role={hosting.SERVICE_USAGE_VIEWER_ROLE}" in arguments:
                self.viewer = True
            else:
                raise AssertionError("Unexpected broader IAM role")
            return {}
        raise AssertionError(f"Unexpected CLI operation: {arguments}")

    def request(self, method, url, body=None):
        self.http.append((method, url, body))
        project_url = f"{hosting.FIREBASE}/projects/{self.project}"
        site_url = f"{hosting.HOSTING}/projects/{self.project}/sites/{self.project}"
        if method == "GET" and url == project_url:
            if not self.firebase:
                raise hosting.ApiError(404)
            return {"projectId": self.project, "projectNumber": self.number, "state": "ACTIVE"}
        if method == "POST" and url == project_url + ":addFirebase":
            return {"name": "operations/add-firebase"}
        if method == "GET" and url == hosting.FIREBASE + "/operations/add-firebase":
            self.firebase = True
            return {"name": "operations/add-firebase", "done": True, "response": {"projectId": self.project}}
        if method == "GET" and url == site_url:
            if not self.site:
                raise hosting.ApiError(404)
            return {"name": f"projects/{self.number}/sites/{self.project}",
                    "defaultUrl": f"https://{self.project}.web.app", "type": "USER_SITE"}
        if method == "POST" and url == f"{hosting.HOSTING}/projects/{self.project}/sites?siteId={self.project}":
            if body != {"appId": ""}:
                raise AssertionError("Unexpected Hosting site request schema")
            self.site = True
            return {"name": f"projects/{self.project}/sites/{self.project}",
                    "defaultUrl": f"https://{self.project}.web.app", "type": "USER_SITE"}
        raise AssertionError(f"Unexpected API operation: {method} {url}")


class HostingPreparationTests(unittest.TestCase):
    def run_prepare(self, cloud, apply=False):
        self.lines = []
        return hosting.prepare(cloud.project, apply=apply, cloud=cloud,
                               sleep=lambda _seconds: None, emit=self.lines.append)

    def test_default_check_does_not_enable_services_or_create_resources(self):
        cloud = FakeCloud()
        self.assertFalse(self.run_prepare(cloud))
        self.assertFalse(any(mutate for _arguments, mutate in cloud.calls))
        self.assertEqual(cloud.http, [])
        self.assertIn("nie wykonano zmian", "\n".join(self.lines))

    def test_ready_check_only_reads_and_accepts_explicit_user_site(self):
        cloud = FakeCloud(ready=True)
        self.assertTrue(self.run_prepare(cloud))
        self.assertFalse(any(mutate for _arguments, mutate in cloud.calls))
        self.assertTrue(all(method == "GET" for method, _url, _body in cloud.http))
        self.assertIn("https://harborlight-dev.web.app", "\n".join(self.lines))

    def test_apply_uses_official_api_and_repeated_apply_is_idempotent(self):
        cloud = FakeCloud()
        self.assertTrue(self.run_prepare(cloud, apply=True))
        mutations = [args for args, mutate in cloud.calls if mutate]
        self.assertEqual(len(mutations), 3)
        self.assertEqual(sum(method == "POST" for method, _url, _body in cloud.http), 2)
        role = mutations[1]
        self.assertIn("--role=roles/firebasehosting.admin", role)
        self.assertIn("--member=serviceAccount:harborlight-deployer@harborlight-dev.iam.gserviceaccount.com", role)
        self.assertIn("--role=roles/serviceusage.serviceUsageViewer", mutations[2])
        self.assertFalse(any(any(word in args for word in ["sql", "keys", "deploy", "delete"])
                             for args, _mutate in cloud.calls))
        cloud.calls.clear()
        cloud.http.clear()
        self.assertTrue(self.run_prepare(cloud, apply=True))
        self.assertFalse(any(mutate for _args, mutate in cloud.calls))
        self.assertTrue(all(method == "GET" for method, _url, _body in cloud.http))

    def test_missing_service_usage_viewer_fails_check_without_mutations(self):
        cloud = FakeCloud(ready=True)
        cloud.viewer = False
        self.assertFalse(self.run_prepare(cloud))
        self.assertIn("Service Usage Viewer", "\n".join(self.lines))
        self.assertFalse(any(mutate for _args, mutate in cloud.calls))
        self.assertEqual(cloud.http, [])

    def test_apply_adds_only_missing_service_usage_viewer_for_correct_environment(self):
        for project in ["harborlight-dev", "harborlight-prod"]:
            with self.subTest(project=project):
                cloud = FakeCloud(project, ready=True)
                cloud.viewer = False
                self.assertTrue(self.run_prepare(cloud, apply=True))
                mutations = [args for args, mutate in cloud.calls if mutate]
                self.assertEqual(len(mutations), 1)
                self.assertEqual(mutations[0][:3], ("projects", "add-iam-policy-binding", project))
                self.assertIn("--role=roles/serviceusage.serviceUsageViewer", mutations[0])
                self.assertIn(f"--member=serviceAccount:harborlight-deployer@{project}.iam.gserviceaccount.com", mutations[0])
                self.assertIn("--condition=None", mutations[0])
                self.assertTrue(all(method == "GET" for method, _url, _body in cloud.http))
                cloud.calls.clear()
                self.assertTrue(self.run_prepare(cloud, apply=True))
                self.assertFalse(any(mutate for _args, mutate in cloud.calls))

    def test_wrong_billing_or_environment_stops_before_mutation(self):
        for field, value in [("billing", False), ("label", "prod")]:
            with self.subTest(field=field):
                cloud = FakeCloud()
                setattr(cloud, field, value)
                with self.assertRaises(hosting.PreparationError):
                    self.run_prepare(cloud, apply=True)
                self.assertFalse(any(mutate for _args, mutate in cloud.calls))
                self.assertEqual(cloud.http, [])

    def test_other_projects_are_rejected_before_any_cli_or_api_request(self):
        for project in ["another-project", "harborlight-dev/../../prod", "https://attacker.invalid"]:
            cloud = FakeCloud(project)
            with self.assertRaises(hosting.PreparationError):
                self.run_prepare(cloud, apply=True)
            self.assertEqual(cloud.calls, [])
            self.assertEqual(cloud.http, [])

    def test_read_only_missing_firebase_or_site_never_creates_it(self):
        for missing in ["firebase", "site"]:
            cloud = FakeCloud(ready=True)
            setattr(cloud, missing, False)
            self.assertFalse(self.run_prepare(cloud))
            self.assertFalse(any(mutate for _args, mutate in cloud.calls))
            self.assertTrue(all(method == "GET" for method, _url, _body in cloud.http))

    def test_operation_failure_and_timeout_do_not_look_successful(self):
        cloud = FakeCloud()
        with self.assertRaisesRegex(hosting.PreparationError, "zakończyła się błędem"):
            hosting.wait_operation(cloud, {"name": "operations/failed", "done": True, "error": {"code": 7}})
        clock = iter([0, 181])
        with self.assertRaisesRegex(hosting.PreparationError, "przekroczyło czas"):
            hosting.wait_operation(cloud, {"name": "operations/wait"},
                                   sleep=lambda _s: None, monotonic=lambda: next(clock))
        with self.assertRaisesRegex(hosting.PreparationError, "nazwę operacji"):
            hosting.wait_operation(cloud, {"name": "https://attacker.invalid/steal"})
        self.assertEqual(cloud.http, [])

    def test_api_origin_and_redirect_guards_do_not_send_credentials_elsewhere(self):
        def no_runner(*_args, **_kwargs):
            raise AssertionError("Credentials must not be read for a rejected URL")
        cloud = hosting.Cloud("harborlight-dev", runner=no_runner)
        for url in ["http://firebase.googleapis.com/v1beta1/projects/x",
                    "https://firebase.googleapis.com.attacker.invalid/v1beta1/projects/x",
                    "https://attacker.invalid/v1beta1/projects/x",
                    "https://firebase.googleapis.com/v1beta1/projects/x#fragment"]:
            with self.assertRaises(hosting.PreparationError):
                cloud.request("GET", url)
        self.assertIsNone(hosting.NoRedirect().redirect_request(None, None, 302, "redirect", {}, "https://attacker.invalid"))

    def test_provider_terms_error_is_actionable_without_dumping_response_or_token(self):
        secret = "secret-bearer-token"
        def runner(*_args, **_kwargs):
            return SimpleNamespace(returncode=0, stdout=secret, stderr="")
        class Opener:
            def open(self, request, timeout):
                body = b'{"error":{"details":[{"detail":"Firebase Tos Not Accepted"}]},"other":"private-data"}'
                raise urllib.error.HTTPError(request.full_url, 403, "forbidden", {}, io.BytesIO(body))
        cloud = hosting.Cloud("harborlight-dev", runner=runner, opener=Opener())
        with self.assertRaises(hosting.ApiError) as raised:
            cloud.request("POST", hosting.FIREBASE + "/projects/harborlight-dev:addFirebase", {})
        self.assertTrue(raised.exception.tos)
        self.assertIn("forceCheckTos=true", str(raised.exception))
        self.assertNotIn(secret, str(raised.exception))
        self.assertNotIn("private-data", str(raised.exception))

    def test_cli_failure_never_echoes_arbitrary_sensitive_stderr(self):
        def runner(*_args, **_kwargs):
            return SimpleNamespace(returncode=43, stdout="", stderr="do-not-leak-secret")
        with self.assertRaises(hosting.PreparationError) as raised:
            hosting.Cloud("harborlight-dev", runner=runner).gcloud("projects", "describe", "harborlight-dev")
        self.assertNotIn("do-not-leak-secret", str(raised.exception))
        self.assertIn("43", str(raised.exception))

    def test_structured_denial_exposes_only_actionable_provider_fields(self):
        raw = json.dumps({"error": {
            "code": 403, "status": "PERMISSION_DENIED", "message": "Request had insufficient authentication scopes.",
            "details": [{"@type": "type.googleapis.com/google.rpc.ErrorInfo",
                         "reason": "ACCESS_TOKEN_SCOPE_INSUFFICIENT", "domain": "googleapis.com",
                         "metadata": {"service": "firebase.googleapis.com", "method": "FirebaseManagement.AddFirebase",
                                      "permission": "firebase.projects.update", "consumer": "projects/123",
                                      "unlisted_secret": "DO-NOT-PRINT"}}]}, "other": "PRIVATE"}).encode()
        tos, fields = hosting.provider_error(raw)
        self.assertFalse(tos)
        text = "; ".join(fields)
        for expected in ["PERMISSION_DENIED", "ACCESS_TOKEN_SCOPE_INSUFFICIENT", "googleapis.com",
                         "firebase.googleapis.com", "firebase.projects.update", "projects/123"]:
            self.assertIn(expected, text)
        self.assertNotIn("DO-NOT-PRINT", text)
        self.assertNotIn("PRIVATE", text)

    def test_provider_reflected_tokens_are_redacted_before_truncation(self):
        token = "secret-current-token"
        raw = json.dumps({"error": {
            "message": f"Denied {token}; Authorization: Bearer OTHER_TOKEN; ya29.otherOAuthToken; "
                       "refresh_token=1//refresh-token\n\x1b[31mcontrol",
            "details": [{"@type": "type.googleapis.com/google.rpc.ErrorInfo",
                         "reason": "PERMISSION_DENIED", "metadata": {"service": token}}]}}).encode()
        _tos, fields = hosting.provider_error(raw, token)
        text = "; ".join(fields)
        for secret in [token, "OTHER_TOKEN", "ya29.otherOAuthToken", "1//refresh-token"]:
            self.assertNotIn(secret, text)
        self.assertIn("[REDACTED]", text)
        self.assertNotIn("\n", text)
        self.assertNotIn("\x1b", text)
        _tos, bounded = hosting.provider_error(json.dumps({"error": {"message": "x"*100_000}}))
        self.assertLessEqual(len("; ".join(bounded)), 1008)

    def test_terms_error_reason_variants_are_recognized(self):
        for reason in ["FIREBASE_TOS_NOT_ACCEPTED", "TERMS_NOT_ACCEPTED", "TERMS_OF_SERVICE_NOT_ACCEPTED"]:
            with self.subTest(reason=reason):
                raw = json.dumps({"error": {"message": "Permission denied", "details": [
                    {"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": reason}]}}).encode()
                tos, fields = hosting.provider_error(raw)
                self.assertTrue(tos)
                self.assertIn(reason, "; ".join(fields))
        raw = json.dumps({"error": {"message": "Permission denied", "details": [
            {"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": "PERMISSION_DENIED"},
            {"@type": "type.googleapis.com/google.rpc.DebugInfo", "detail": "Firebase Tos Not Accepted"}
        ]}}).encode()
        self.assertTrue(hosting.provider_error(raw)[0])

    def test_malformed_error_body_stays_generic(self):
        for raw in [b"not JSON secret-private-body", b"[]", b'{"other":"private"}', b'{"error":"private"}']:
            self.assertEqual(hosting.provider_error(raw), (False, ()))

    def test_http_denial_reports_endpoint_phase_and_safe_reason(self):
        def runner(*_args, **_kwargs):
            return SimpleNamespace(returncode=0, stdout="private-access-token", stderr="")
        class Opener:
            def open(self, request, timeout):
                body = json.dumps({"error": {"message": "Missing permission", "status": "PERMISSION_DENIED",
                    "details": [{"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": "IAM_PERMISSION_DENIED",
                                 "domain": "firebase.googleapis.com", "metadata": {"permission": "firebase.projects.update"}}]}}).encode()
                raise urllib.error.HTTPError(request.full_url, 403, "forbidden", {}, io.BytesIO(body))
        cloud = hosting.Cloud("harborlight-dev", runner=runner, opener=Opener())
        with self.assertRaises(hosting.ApiError) as raised:
            cloud.request("POST", hosting.FIREBASE + "/projects/harborlight-dev:addFirebase", {})
        text = str(raised.exception)
        self.assertIn("HTTP 403", text)
        self.assertIn("POST firebase.googleapis.com/v1beta1/projects/harborlight-dev:addFirebase", text)
        self.assertIn("firebase.projects.update", text)
        self.assertNotIn("private-access-token", text)


if __name__ == "__main__":
    unittest.main(verbosity=2)
