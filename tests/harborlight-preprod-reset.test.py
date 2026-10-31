#!/usr/bin/env python3
"""Destructive-reset boundaries tested with an isolated, CAS-aware cloud fake."""
import copy
from datetime import datetime, timezone
import hashlib
import importlib.util
import io
import json
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("preprod_reset", ROOT / "infra/google-cloud/reset-preprod-accounts.py")
reset = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(reset)
SHA = "a" * 40
PROOF = {"runId": 123, "runAttempt": 1, "commit": SHA, "manifestSha256": "b" * 64, "artifactSha256": "c" * 64, "ciRunId": 120, "imageUri": "europe-central2-docker.pkg.dev/harborlight-dev/harborlight/api@sha256:" + "d" * 64}


def doc(path, value, timestamp="2026-10-31T00:00:00Z"):
    return {"name": reset.DOCS + "/" + path, "fields": {key: reset.encode(item) for key, item in value.items()}, "updateTime": timestamp}


class FakeCloud:
    def __init__(self, locked=True):
        self.docs, self.calls, self.commits = {}, [], []
        self.locked = locked
        self.rules_time = "2026-10-30T00:00:00Z"
        self.number = reset.NUMBER
        self.api = "1"
        self.foreign_offer = False
        self.concurrent_write = False
        self.created_revision = "ready-revision"
        self.ready_status = "True"
        self.iam_ready = True
        self.actual_image = PROOF["imageUri"]
        for uid in reset.UIDS:
            self.docs["accounts/" + uid] = doc("accounts/" + uid, {"islandGeneration": 3, "lastPlayedAt": 100, "islandAccountProgress": {"commerce": {"secret-history": True}}, "openTradeOfferIds": ["trade_" + "1" * 40], "legalAcceptance": {"acceptedAt": 77}})
            self.docs["islands/" + uid] = doc("islands/" + uid, {"generation": 3, "revision": 12, "payload": "PRIVATE GAME PAYLOAD"})
            for path in ("redemptions/TEST", "tradeRequests/request_1", "tradeInbox/trade_" + "1" * 40, "legalAcceptances/v1", "futureRewards/deep/children/item"):
                self.docs[f"accounts/{uid}/{path}"] = doc(f"accounts/{uid}/{path}", {"private": "SECRET REWARD HISTORY"})
        self.docs["playerTradeOffers/trade_" + "1" * 40] = doc("playerTradeOffers/trade_" + "1" * 40, {"ownerUid": reset.UIDS[0], "status": "open"})
        self.docs["playerTradeOffers/trade_" + "2" * 40] = doc("playerTradeOffers/trade_" + "2" * 40, {"ownerUid": "unrelated", "status": "open"})
        self.docs["accounts/unrelated"] = doc("accounts/unrelated", {"never": "touch"})

    def gcloud(self, *args):
        if args[:2] == ("projects", "describe"):
            return {"projectId": reset.PROJECT, "projectNumber": self.number, "lifecycleState": "ACTIVE", "labels": {"harborlight_env": "dev"}}
        if args[:3] == ("billing", "projects", "describe"):
            return {"billingEnabled": True, "billingAccountName": reset.hosting.BILLING_ACCOUNT}
        if args[:2] == ("projects", "get-iam-policy"):
            return {"bindings": [{"role": "roles/datastore.user" if self.iam_ready else "roles/viewer", "members": [f"serviceAccount:harborlight-runtime@{reset.PROJECT}.iam.gserviceaccount.com"]}]}
        if args[:3] == ("run", "services", "describe"):
            return {"spec": {"template": {"spec": {"serviceAccountName": f"harborlight-runtime@{reset.PROJECT}.iam.gserviceaccount.com", "containers": [{"image": self.actual_image, "env": [{"name": key, "value": value} for key, value in {"HARBORLIGHT_RELEASE": SHA, "HARBORLIGHT_ACCOUNT_API": self.api, "HARBORLIGHT_PROJECT_ID": reset.PROJECT}.items()]}]}}}, "status": {"latestCreatedRevisionName": self.created_revision, "conditions": [{"type": "Ready", "status": self.ready_status}], "latestReadyRevisionName": "ready-revision", "traffic": [{"revisionName": "ready-revision", "percent": 100}]}}
        raise AssertionError(args)

    def request(self, method, url, body=None):
        self.calls.append((method, url, copy.deepcopy(body)))
        if url == reset.FS + reset.DATABASE:
            return {"name": reset.DATABASE, "type": "FIRESTORE_NATIVE", "locationId": "europe-central2"}
        if "accounts:lookup" in url:
            return {"users": [{"localId": uid, "email": uid[4:] + "@dev.harborlight.pl"} for uid in reset.UIDS]}
        if "firebaserules" in url:
            if method == "GET" and url.endswith("/releases/cloud.firestore"):
                return {"name": reset.RELEASE, "rulesetName": f"projects/{reset.PROJECT}/rulesets/current", "updateTime": self.rules_time}
            if method == "GET": return {"source": {"files": [{"name": "firestore.rules", "content": reset.DENY_RULES if self.locked else "legacy policy"}]}}
            if method == "POST": return {"name": f"projects/{reset.PROJECT}/rulesets/current"}
            if method == "PATCH":
                self.locked = True
                self.rules_time = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                return body["release"]
        prefix = reset.FS + reset.DOCS
        assert url.startswith(prefix), url
        path = url[len(prefix):].lstrip("/")
        if method == "POST" and path == ":commit":
            reset.validate_writes(body["writes"])
            if self.concurrent_write:
                self.docs["islands/" + reset.UIDS[0]]["updateTime"] = "2026-10-31T01:00:00Z"
            # Check every condition before applying any write.
            for write in body["writes"]:
                name = write.get("delete") or write["update"]["name"]
                key = name[len(reset.DOCS) + 1:]
                existing = self.docs.get(key)
                pre = write["currentDocument"]
                if "updateTime" in pre and (existing or {}).get("updateTime") != pre["updateTime"] or pre.get("exists") is False and existing:
                    raise reset.Error("CAS conflict; nothing committed")
            self.commits.append(copy.deepcopy(body))
            for write in body["writes"]:
                key = (write.get("delete") or write["update"]["name"])[len(reset.DOCS) + 1:]
                if "delete" in write: self.docs.pop(key, None)
                else: self.docs[key] = {**copy.deepcopy(write["update"]), "updateTime": "2026-10-31T02:00:00Z"}
            return {"commitTime": "2026-10-31T02:00:00Z"}
        if path.endswith(":listCollectionIds"):
            parent = path.removesuffix(":listCollectionIds") + "/"
            children = sorted({key[len(parent):].split("/")[0] for key in self.docs if key.startswith(parent) and "/" in key[len(parent):]})
            return {"collectionIds": children}
        if "?" in path:
            parent = path.split("?", 1)[0] + "/"
            output = {key: value for key, value in self.docs.items() if key.startswith(parent) and "/" not in key[len(parent):]}
            # Firestore showMissing exposes missing parents of deep children.
            for key in self.docs:
                if key.startswith(parent):
                    first = parent + key[len(parent):].split("/")[0]
                    if first not in output: output[first] = {"name": reset.DOCS + "/" + first}
            return {"documents": list(output.values())}
        return copy.deepcopy(self.docs.get(path))


def options(**changes):
    return SimpleNamespace(**{"deployment_run_id": 123, "commit": SHA, "receipt_archive": Path("unused.zip"), "apply": False, "lock_client_writes": False, "backup_dir": None, **changes})


class ResetSafety(unittest.TestCase):
    def execute(self, cloud, args, output=None):
        return reset.execute(args, cloud=cloud, emit=(output.append if output is not None else lambda _: None), verifier=lambda *_: copy.deepcopy(PROOF))

    def test_default_is_read_only_and_private_payloads_never_printed(self):
        cloud, output = FakeCloud(), []
        before = copy.deepcopy(cloud.docs)
        self.execute(cloud, options(), output)
        self.assertEqual(cloud.docs, before)
        self.assertEqual(cloud.commits, [])
        self.assertFalse(any(method in ("PATCH",) for method, _, _ in cloud.calls))
        self.assertNotIn("PRIVATE", "\n".join(output))
        self.assertNotIn("SECRET", "\n".join(output))

    def test_atomic_full_game_reset_preserves_identities_legal_and_other_users(self):
        cloud = FakeCloud()
        preserved = {key: copy.deepcopy(value) for key, value in cloud.docs.items() if "/legalAcceptances/" in key or "unrelated" in key or key.endswith("2" * 40)}
        with tempfile.TemporaryDirectory() as directory:
            receipt = self.execute(cloud, options(apply=True, backup_dir=Path(directory)))
            backups = list(Path(directory).glob("*.json"))
            self.assertEqual(len(backups), 1)
            self.assertEqual(backups[0].stat().st_mode & 0o777, 0o600)
            self.assertIn("PRIVATE GAME PAYLOAD", backups[0].read_text())
        self.assertEqual(len(cloud.commits), 1)
        for uid in reset.UIDS:
            self.assertNotIn("islands/" + uid, cloud.docs)
            data = reset.fields(cloud.docs["accounts/" + uid]["fields"])
            self.assertEqual(data["islandGeneration"], 4)
            self.assertIsNone(data["islandExpiredAt"])
            self.assertNotIn("islandAccountProgress", data)
            self.assertEqual(data["legalAcceptance"], {"acceptedAt": 77})
            self.assertEqual([key for key in cloud.docs if key.startswith("accounts/" + uid + "/")], ["accounts/" + uid + "/legalAcceptances/v1"])
        for key, value in preserved.items(): self.assertEqual(cloud.docs[key], value)
        self.assertFalse(any("accounts:delete" in url or "accounts:update" in url for _, url, _ in cloud.calls))
        self.assertEqual(receipt["status"], "completed")
        # The exact promotion can never reset a player's restarted world twice.
        cloud.docs["islands/dev-admin1"] = doc("islands/dev-admin1", {"generation": 4, "payload": "new progress"})
        self.execute(cloud, options(apply=True))
        self.assertEqual(len(cloud.commits), 1)
        self.assertIn("islands/dev-admin1", cloud.docs)

    def test_legacy_world_and_missing_account_start_above_old_generation(self):
        cloud = FakeCloud()
        cloud.docs.pop("accounts/dev-admin1")
        cloud.docs["islands/dev-admin1"]["fields"].pop("generation")
        with tempfile.TemporaryDirectory() as directory:
            receipt = self.execute(cloud, options(apply=True, backup_dir=Path(directory)))
        self.assertEqual(receipt["generations"]["dev-admin1"], 2)
        self.assertEqual(reset.fields(cloud.docs["accounts/dev-admin1"]["fields"])["islandGeneration"], 2)

    def test_live_api_disabled_or_wrong_project_blocks_all_writes(self):
        for field, value in (("api", "0"), ("number", "992911312434")):
            cloud = FakeCloud(); setattr(cloud, field, value)
            with self.subTest(field=field), self.assertRaises(reset.Error): self.execute(cloud, options(apply=True))
            self.assertEqual(cloud.commits, [])

    def test_unready_desired_revision_wrong_image_or_missing_runtime_iam_blocks_reset(self):
        cases = (("created_revision", "new-but-not-ready"), ("ready_status", "False"),
                 ("actual_image", PROOF["imageUri"].replace("d" * 64, "e" * 64)), ("iam_ready", False))
        for field, value in cases:
            cloud = FakeCloud(); setattr(cloud, field, value)
            with self.subTest(field=field), self.assertRaises(reset.Error): self.execute(cloud, options(apply=True))
            self.assertEqual(cloud.commits, [])

    def test_legacy_rules_require_explicit_lock(self):
        cloud = FakeCloud(locked=False)
        with self.assertRaisesRegex(reset.Error, "lock-client-writes"): self.execute(cloud, options(apply=True))
        self.assertFalse(cloud.locked)

    def test_explicit_lock_keeps_worlds_until_rule_propagation_then_same_plan_can_finish(self):
        cloud = FakeCloud(locked=False)
        before = copy.deepcopy(cloud.docs)
        with tempfile.TemporaryDirectory() as directory:
            args = options(apply=True, lock_client_writes=True, backup_dir=Path(directory))
            with self.assertRaisesRegex(reset.Error, "Ponów tę samą komendę"):
                self.execute(cloud, args)
            self.assertTrue(cloud.locked)
            self.assertEqual(cloud.docs, before)
            self.assertEqual(cloud.commits, [])
            self.assertEqual(len(list(Path(directory).glob("*.json"))), 2)
            cloud.rules_time = "2026-10-30T00:00:00Z"
            self.execute(cloud, args)
            self.assertEqual(len(cloud.commits), 1)

    def test_waits_for_old_client_rule_propagation(self):
        rules = {"source": {"files": [{"name": "firestore.rules", "content": reset.DENY_RULES}]}, "release": {"updateTime": "2026-10-31T00:00:00Z"}}
        with self.assertRaisesRegex(reset.Error, "Ponów"): reset.propagated_rules(rules, now=1793404800 + 30)
        reset.propagated_rules(rules, now=1793404800 + 601)

    def test_concurrent_gameplay_cannot_be_partially_erased(self):
        cloud = FakeCloud(); cloud.concurrent_write = True
        before = copy.deepcopy(cloud.docs)
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(reset.Error, "CAS"): self.execute(cloud, options(apply=True, backup_dir=Path(directory)))
        self.assertEqual(cloud.commits, [])
        self.assertIn("accounts/dev-admin1/redemptions/TEST", cloud.docs)
        self.assertEqual(before["islands/dev-admin2"], cloud.docs["islands/dev-admin2"])

    def test_foreign_trade_counterparty_refuses_reset(self):
        cloud = FakeCloud()
        offer = cloud.docs["playerTradeOffers/trade_" + "1" * 40]
        offer["fields"]["acceptedBy"] = reset.encode("unrelated")
        with self.assertRaisesRegex(reset.Error, "innym graczem"): self.execute(cloud, options(apply=True))
        self.assertEqual(cloud.commits, [])

    def test_rejects_oversize_atomic_plan_wrong_project_legal_and_duplicate_writes(self):
        for name in (reset.DOCS.replace(reset.PROJECT, "harborlight-prod") + "/islands/dev-admin1", reset.DOCS + "/accounts/unrelated", reset.DOCS + "/accounts/dev-admin1/legalAcceptances/v1", reset.DOCS + "/accounts/dev-admin1/../secret"):
            with self.subTest(name=name), self.assertRaises(reset.Error): reset.validate_writes([{"delete": name, "currentDocument": {"exists": False}}])
        write = {"delete": reset.DOCS + "/islands/dev-admin1", "currentDocument": {"exists": False}}
        for condition in ({}, {"exists": True}, {"updateTime": ""}):
            with self.assertRaises(reset.Error): reset.validate_writes([{**write, "currentDocument": condition}])
        for values in ([write, write], [write] * 451):
            with self.assertRaises(reset.Error): reset.validate_writes(values)

    def test_backup_cannot_enter_git_or_follow_symlink(self):
        with self.assertRaises(reset.Error): reset.backup({}, PROOF, {}, ROOT / "private-backup-test")
        with tempfile.TemporaryDirectory() as directory:
            link = Path(directory) / "link"; link.symlink_to(Path(directory), target_is_directory=True)
            with self.assertRaises(reset.Error): reset.backup({}, PROOF, {}, link)


class PromotionProof(unittest.TestCase):
    def fixture(self):
        manifest_raw = json.dumps({"schema_version": 1, "commit": SHA}).encode()
        receipt = {"schema_version": 2, "repository": reset.REPO, "repository_id": reset.REPO_ID, "source_sha": SHA, "image": {"uri": PROOF["imageUri"], "digest": "sha256:" + "d" * 64}, "dev": {"run_id": 123, "run_attempt": 1}, "ci": {"run_id": 120, "run_attempt": 1}, "checks": {key: True for key in ("ci", "dev_smoke", "frontend_smoke", "account_api")}, "frontend": {"site": reset.PROJECT, "url": reset.SITE, "artifact_name": "harborlight-dev-frontend-123-1", "manifest_sha256": hashlib.sha256(manifest_raw).hexdigest()}}
        def archive(value):
            stream = io.BytesIO()
            with zipfile.ZipFile(stream, "w") as zipped: zipped.writestr("release.json", json.dumps(value))
            return stream.getvalue()
        raw = archive(receipt)
        def run(identifier, workflow, event):
            return {"id": identifier, "run_attempt": 1, "path": ".github/workflows/" + workflow, "event": event, "head_branch": "main", "head_sha": SHA, "status": "completed", "conclusion": "success", **{key: {"id": reset.REPO_ID, "full_name": reset.REPO} for key in ("repository", "head_repository")}}
        responses = {"/runs/123": run(123, "google-cloud-dev.yml", "workflow_dispatch"), "/runs/120": run(120, "ci.yml", "push"), "/runs/123/artifacts?per_page=100&page=1": {"artifacts": [{"name": "harborlight-dev-release-123-1", "expired": False, "digest": "sha256:" + hashlib.sha256(raw).hexdigest()}]}}
        config = {"accountApi": True, "projectId": reset.PROJECT, "environment": "preprod"}
        def fetch(url):
            if url.endswith("/api/v1/config"): return copy.deepcopy(config)
            return copy.deepcopy(responses[url.split("/actions", 1)[1]])
        return raw, responses, config, manifest_raw, fetch

    def test_exact_proof_and_current_hosting_required(self):
        raw, responses, config, manifest, fetch = self.fixture()
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / "receipt.zip"; archive.write_bytes(raw)
            proof = reset.verify_promotion(123, SHA, archive, fetch_json=fetch, fetch_bytes=lambda _: manifest)
            self.assertEqual(proof["commit"], SHA)
            for mutation in (lambda: responses["/runs/123"].update(conclusion="failure"), lambda: config.update(projectId="harborlight-prod")):
                raw, responses, config, manifest, fetch = self.fixture()
                mutation()
                with self.assertRaises(reset.Error): reset.verify_promotion(123, SHA, archive, fetch_json=fetch, fetch_bytes=lambda _: manifest)
            raw, responses, config, manifest, fetch = self.fixture()
            with self.assertRaises(reset.Error): reset.verify_promotion(123, SHA, archive, fetch_json=fetch, fetch_bytes=lambda _: manifest + b" ")
            archive.write_bytes(raw + b"tampered")
            with self.assertRaises(reset.Error): reset.verify_promotion(123, SHA, archive, fetch_json=fetch, fetch_bytes=lambda _: manifest)


if __name__ == "__main__": unittest.main()
