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
            return {"bindings": [{"role": hosting.HOSTING_ROLE, "members": [member]}]} if self.role else {}
        if arguments[:2] == ("services", "enable") and mutate:
            self.apis = True
            return {}
        if arguments[:2] == ("projects", "add-iam-policy-binding") and mutate:
            self.role = True
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
        self.assertEqual(len(mutations), 2)
        self.assertEqual(sum(method == "POST" for method, _url, _body in cloud.http), 2)
        role = mutations[1]
        self.assertIn("--role=roles/firebasehosting.admin", role)
        self.assertIn("--member=serviceAccount:harborlight-deployer@harborlight-dev.iam.gserviceaccount.com", role)
        self.assertFalse(any(any(word in args for word in ["sql", "keys", "deploy", "delete"])
                             for args, _mutate in cloud.calls))
        cloud.calls.clear()
        cloud.http.clear()
        self.assertTrue(self.run_prepare(cloud, apply=True))
        self.assertFalse(any(mutate for _args, mutate in cloud.calls))
        self.assertTrue(all(method == "GET" for method, _url, _body in cloud.http))

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


if __name__ == "__main__":
    unittest.main(verbosity=2)
