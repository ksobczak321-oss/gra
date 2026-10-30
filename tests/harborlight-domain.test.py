#!/usr/bin/env python3
"""Firebase custom-domain contract checks, without credentials or cloud calls."""

import copy
import importlib.util
import io
from pathlib import Path
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("harborlight_domain", ROOT / "infra/google-cloud/prepare-domain.py")
domain = importlib.util.module_from_spec(spec)
spec.loader.exec_module(domain)
hosting = domain.hosting


def resource(ready=False):
    return {
        "name": domain.RESOURCE,
        "hostState": "HOST_ACTIVE" if ready else "HOST_MISMATCH",
        "ownershipState": "OWNERSHIP_ACTIVE" if ready else "OWNERSHIP_MISSING",
        "cert": {"state": "CERT_ACTIVE" if ready else "CERT_PREPARING"},
    }


class FakeCloud:
    def __init__(self, current=None, mode=None):
        self.current = copy.deepcopy(current)
        self.mode = mode
        self.calls = []
        self.operation_name = domain.RESOURCE + "/operations/create-domain-1"

    def gcloud(self, *arguments, **options):
        self.calls.append(("gcloud", arguments, options))
        if arguments[:2] == ("auth", "list"):
            return [{"account": "owner@example.invalid", "status": "ACTIVE"}]
        if arguments[:2] == ("projects", "describe"):
            return {"projectId": domain.PROJECT, "projectNumber": domain.PROJECT_NUMBER,
                    "lifecycleState": "ACTIVE",
                    "labels": {"harborlight_env": "dev" if self.mode == "wrong-label" else "prod"}}
        if arguments[:3] == ("billing", "projects", "describe"):
            return {"billingEnabled": self.mode != "billing-off",
                    "billingAccountName": hosting.BILLING_ACCOUNT}
        raise AssertionError("Unexpected or mutating gcloud command: " + repr(arguments))

    def request(self, method, url, body=None):
        self.calls.append((method, url, copy.deepcopy(body)))
        if method == "GET" and url == f"{hosting.FIREBASE}/projects/{domain.PROJECT}":
            if self.mode == "no-firebase":
                raise hosting.ApiError(404)
            return {"projectId": domain.PROJECT, "projectNumber": domain.PROJECT_NUMBER, "state": "ACTIVE"}
        if method == "GET" and url == f"{hosting.HOSTING}/{domain.PARENT}":
            if self.mode == "no-site":
                raise hosting.ApiError(404)
            return {"name": domain.PARENT, "defaultUrl": "https://harborlight-prod.web.app"}
        if method == "GET" and url == domain.URL:
            if self.current is None:
                raise hosting.ApiError(404)
            return copy.deepcopy(self.current)
        if method == "POST":
            expected = f"{hosting.HOSTING}/{domain.PARENT}/customDomains?customDomainId=harborlight.pl"
            if url != expected:
                raise AssertionError("Unexpected mutation URL")
            if self.mode == "conflict":
                raise hosting.ApiError(409)
            if self.mode == "operation-error":
                return {"name": self.operation_name, "done": True, "error": {"code": 7}}
            if self.mode == "unsafe-operation":
                return {"name": "projects/another/sites/site/customDomains/other.pl/operations/1"}
            if self.mode == "operation-stuck":
                return {"name": self.operation_name}
            self.current = resource()
            if self.mode == "pending-operation":
                return {"name": self.operation_name}
            return {"name": self.operation_name, "done": True, "response": copy.deepcopy(self.current)}
        if method == "GET" and url == f"{hosting.HOSTING}/{self.operation_name}":
            return {"name": self.operation_name}
        raise AssertionError("Unexpected API call: " + repr((method, url)))


class DomainTests(unittest.TestCase):
    def test_default_check_never_creates_a_missing_domain(self):
        cloud = FakeCloud()
        value = domain.prepare(cloud=cloud)
        self.assertFalse(value["configured"])
        self.assertFalse(value["ready"])
        self.assertFalse(any(call[0] == "POST" for call in cloud.calls))

    def test_apply_uses_official_create_contract_and_is_repeatable(self):
        cloud = FakeCloud()
        first = domain.prepare(apply=True, cloud=cloud)
        self.assertTrue(first["created"])
        self.assertTrue(first["configured"])
        self.assertFalse(first["ready"])
        mutations = [call for call in cloud.calls if call[0] == "POST"]
        self.assertEqual(len(mutations), 1)
        self.assertEqual(mutations[0][2], {"name": domain.RESOURCE, "certPreference": "GROUPED"})
        second = domain.prepare(apply=True, cloud=cloud)
        self.assertFalse(second["created"])
        self.assertEqual(sum(call[0] == "POST" for call in cloud.calls), 1)
        self.assertFalse(any(call[0] in ("PATCH", "DELETE") for call in cloud.calls))

    def test_status_only_reads_exact_resource_without_owner_or_billing_permissions(self):
        cloud = FakeCloud(resource(True))
        value = domain.prepare(status_only=True, cloud=cloud)
        self.assertTrue(value["ready"])
        self.assertEqual(cloud.calls, [("GET", domain.URL, None)])

    def test_all_three_states_are_required_for_ready(self):
        for field in ("hostState", "ownershipState", "certificate"):
            with self.subTest(field=field):
                data = resource(True)
                if field == "certificate":
                    data["cert"]["state"] = "CERT_PROPAGATING"
                else:
                    data[field] = "PENDING"
                self.assertFalse(domain.prepare(status_only=True, cloud=FakeCloud(data))["ready"])
        data = resource(True)
        data["cert"]["state"] = "CERT_EXPIRING_SOON"
        self.assertTrue(domain.prepare(status_only=True, cloud=FakeCloud(data))["ready"])

    def test_pending_lro_does_not_hide_records_needed_to_finish_dns(self):
        cloud = FakeCloud(mode="pending-operation")
        value = domain.prepare(apply=True, cloud=cloud)
        self.assertTrue(value["operation_pending"])
        self.assertFalse(value["ready"])
        with redirect_stdout(io.StringIO()) as output:
            domain.print_report(value)
        self.assertIn("OCZEKUJE", output.getvalue())
        self.assertNotIn("GOTOWE", output.getvalue())

    def test_wrong_project_or_domain_rejected_before_any_request(self):
        for project, name in [("harborlight-dev", domain.DOMAIN),
                              (domain.PROJECT, "www.harborlight.pl"),
                              (domain.PROJECT, "harborlight.pl.attacker.invalid")]:
            cloud = FakeCloud()
            with self.assertRaises(hosting.PreparationError):
                domain.prepare(project, name, apply=True, cloud=cloud)
            self.assertEqual(cloud.calls, [])

    def test_wrong_environment_or_disabled_billing_prevents_mutation(self):
        for mode in ("wrong-label", "billing-off", "no-firebase", "no-site"):
            cloud = FakeCloud(mode=mode)
            with self.subTest(mode=mode), self.assertRaises(hosting.PreparationError):
                domain.prepare(apply=True, cloud=cloud)
            self.assertFalse(any(call[0] == "POST" for call in cloud.calls))

    def test_conflicts_redirects_and_foreign_bindings_are_never_overwritten(self):
        for mode, data in [("conflict", None), (None, dict(resource(), redirectTarget="another.invalid")),
                           (None, dict(resource(), name="projects/other/sites/other/customDomains/harborlight.pl")),
                           (None, dict(resource(), deleteTime="2026-10-30T00:00:00Z"))]:
            cloud = FakeCloud(data, mode)
            with self.subTest(mode=mode, data=data), self.assertRaises(hosting.PreparationError):
                domain.prepare(apply=True, cloud=cloud)
            self.assertFalse(any(call[0] in ("PATCH", "DELETE") for call in cloud.calls))

    def test_operation_error_timeout_or_unsafe_name_fail_closed(self):
        for mode in ("operation-error", "unsafe-operation", "operation-stuck"):
            cloud = FakeCloud(mode=mode)
            values = iter((0, 121))
            with self.subTest(mode=mode), self.assertRaises(hosting.PreparationError):
                domain.prepare(apply=True, cloud=cloud, sleep=lambda _: None,
                               monotonic=lambda: next(values))

    def test_dns_values_and_actions_are_exactly_preserved_from_provider(self):
        data = resource()
        data["requiredDnsUpdates"] = {
            "desired": [{"domainName": "harborlight.pl.", "records": [
                {"type": "A", "rdata": "198.51.100.23", "requiredAction": "ADD"},
                {"type": "TXT", "rdata": '"hosting-site=from-provider-only"', "requiredAction": "ADD"}]}],
            "discovered": [{"domainName": "harborlight.pl.", "records": [
                {"type": "A", "rdata": "203.0.113.7", "requiredAction": "REMOVE"}]}],
        }
        data["cert"]["verification"] = {"dns": {"desired": [{"domainName": "_acme-challenge.harborlight.pl.",
            "records": [{"type": "TXT", "rdata": "acme-value-from-provider", "requiredAction": "ADD"}]}]}}
        value = domain.prepare(status_only=True, cloud=FakeCloud(data))
        records = value["dns_records"]
        self.assertEqual([(r["action"], r["type"], r["host"], r["value"]) for r in records], [
            ("ADD", "A", "harborlight.pl.", "198.51.100.23"),
            ("ADD", "TXT", "harborlight.pl.", '"hosting-site=from-provider-only"'),
            ("REMOVE", "A", "harborlight.pl.", "203.0.113.7"),
            ("ADD", "TXT", "_acme-challenge.harborlight.pl.", "acme-value-from-provider"),
        ])
        with redirect_stdout(io.StringIO()) as output:
            domain.print_report(value)
        text = output.getvalue()
        self.assertIn("198.51.100.23", text)
        self.assertIn("203.0.113.7", text)
        self.assertNotIn("199.36.158.100", text)
        self.assertIn("OCZEKUJE", text)
        self.assertEqual(value["provider_response"], data)

    def test_foreign_dns_host_is_not_suggested_to_user(self):
        data = resource()
        data["requiredDnsUpdates"] = {"desired": [{"domainName": "unrelated.invalid", "records": [
            {"type": "A", "rdata": "198.51.100.23", "requiredAction": "ADD"}]}]}
        with self.assertRaises(hosting.PreparationError):
            domain.prepare(status_only=True, cloud=FakeCloud(data))

    def test_cli_read_only_gate_fails_pending_but_apply_can_report_created_binding(self):
        pending = domain.report(resource())
        active = domain.report(resource(True))
        for argv, value, expected in [(["--status-only"], pending, 1),
                                      (["--check"], pending, 1),
                                      (["--apply"], pending, 0),
                                      (["--status-only"], active, 0)]:
            with self.subTest(argv=argv, ready=value["ready"]), \
                    patch.object(domain, "prepare", return_value=value), \
                    redirect_stdout(io.StringIO()) as output:
                self.assertEqual(domain.main(argv), expected)
                self.assertEqual("GOTOWE" in output.getvalue(), value["ready"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
