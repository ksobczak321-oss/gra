#!/usr/bin/env python3
"""DEV/PROD bootstrap safety: a fake gcloud, no credentials or API calls."""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
BOOTSTRAP = ROOT / "infra/google-cloud/bootstrap.sh"
MOCK_GCLOUD = r'''
import json
import os
import sys

arguments = sys.argv[1:]
with open(os.environ["MOCK_GCLOUD_LOG"], "a", encoding="utf-8") as log:
    log.write(json.dumps(arguments) + "\n")
arguments = [arg for arg in arguments
             if arg != "--quiet" and not arg.startswith("--project=")]
mode = os.environ.get("MOCK_GCLOUD_MODE", "empty")
if arguments[:2] == ["auth", "list"]:
    print("tester@example.invalid")
elif arguments[:2] == ["projects", "update"]:
    # Cloud Shell rejects this flag in GA; only the alpha command supports it.
    # Do not silently accept an invalid CLI call as the old mock did.
    print("unrecognized arguments: --update-labels; use gcloud alpha projects update", file=sys.stderr)
    sys.exit(2)
elif arguments[:3] == ["alpha", "projects", "update"]:
    if mode == "label-update-denied":
        print("permission denied updating project labels", file=sys.stderr)
        sys.exit(42)
elif arguments[:2] == ["projects", "describe"]:
    if "--format=value(labels.harborlight_env)" in arguments:
        print({"label-dev": "dev", "label-prod": "prod"}.get(mode, ""))
    else:
        print("123456789012\tACTIVE")
elif arguments[:3] == ["billing", "projects", "describe"]:
    print("False" if mode == "billing-off" else "True")
elif arguments[:3] == ["artifacts", "repositories", "list"]:
    if mode == "existing":
        print("projects/test-project/locations/europe-central2/repositories/harborlight\tDOCKER")
    elif mode == "bad-repository":
        print("projects/test-project/locations/europe-central2/repositories/harborlight\tMAVEN")
    elif mode == "repository-read-denied":
        sys.exit(42)
elif arguments[:3] == ["iam", "service-accounts", "list"]:
    if mode == "existing":
        print(next(arg.split("=", 1)[1].removeprefix("email=")
                   for arg in arguments if arg.startswith("--filter=")))
elif arguments[:3] == ["iam", "workload-identity-pools", "list"]:
    if mode == "existing":
        print("projects/123456789012/locations/global/workloadIdentityPools/harborlight-github")
elif arguments[:4] == ["iam", "workload-identity-pools", "providers", "list"]:
    if mode == "existing":
        print("projects/123456789012/locations/global/workloadIdentityPools/harborlight-github/providers/github-main")
'''


def mutates(arguments):
    return bool(set(arguments) & {
        "create", "create-oidc", "update", "update-oidc", "enable",
        "add-iam-policy-binding", "delete", "deploy",
    })


class BootstrapSafetyTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="harborlight-gcp-test-")
        self.addCleanup(self.directory.cleanup)
        directory = Path(self.directory.name)
        self.log = directory / "gcloud.log"
        self.log.write_text("", encoding="utf-8")
        mock = directory / "gcloud"
        mock.write_text(f"#!{sys.executable}\n{MOCK_GCLOUD}", encoding="utf-8")
        mock.chmod(0o755)
        self.environment = dict(
            os.environ,
            PATH=f"{directory}{os.pathsep}{os.environ['PATH']}",
            PROJECT_ID="test-project",
            ENVIRONMENT="dev",
            REGION="europe-central2",
            GITHUB_REPOSITORY="ksobczak321-oss/gra",
            GITHUB_REPOSITORY_ID="1234",
            GITHUB_REPOSITORY_OWNER_ID="5678",
            MOCK_GCLOUD_LOG=str(self.log),
        )

    def run_bootstrap(self, *arguments, mode="empty", **overrides):
        self.log.write_text("", encoding="utf-8")
        environment = dict(self.environment, MOCK_GCLOUD_MODE=mode, **overrides)
        result = subprocess.run(
            ["bash", str(BOOTSTRAP), *arguments],
            env=environment,
            text=True,
            capture_output=True,
            timeout=15,
            check=False,
        )
        commands = [json.loads(line)
                    for line in self.log.read_text(encoding="utf-8").splitlines()]
        return result, commands

    def test_default_check_never_mutates(self):
        result, commands = self.run_bootstrap()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(commands), 4)
        self.assertFalse(any(map(mutates, commands)))
        self.assertIn("GCP_PROJECT_ID=test-project", result.stdout)
        self.assertIn("CHECK", result.stdout)
        self.assertIn("google-cloud-dev", result.stdout)

    def test_disabled_billing_blocks_every_mutation(self):
        result, commands = self.run_bootstrap("--apply", mode="billing-off")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(map(mutates, commands)))
        self.assertIn("rozliczeń", result.stderr)

    def test_invalid_numeric_repository_id_rejected_before_gcloud(self):
        result, commands = self.run_bootstrap(
            "--apply", GITHUB_REPOSITORY_ID="not-a-number"
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(commands, [])

    def test_fresh_apply_restricts_identity_and_never_deploys_or_creates_keys(self):
        result, commands = self.run_bootstrap("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(sum("create" in command for command in commands), 4)
        self.assertEqual(sum("create-oidc" in command for command in commands), 1)
        provider = next(command for command in commands if "create-oidc" in command)
        condition = next(argument for argument in provider
                         if argument.startswith("--attribute-condition="))
        for expected in [
            "assertion.repository_id == '1234'",
            "assertion.repository_owner_id == '5678'",
            "assertion.ref == 'refs/heads/main'",
            "assertion.event_name == 'workflow_dispatch'",
            "ksobczak321-oss/gra/.github/workflows/google-cloud-dev.yml@refs/heads/main",
        ]:
            self.assertIn(expected, condition)
        self.assertFalse(any("keys" in command for command in commands))
        self.assertFalse(any("sql" in command for command in commands))
        self.assertFalse(any("deploy" in command for command in commands))
        self.assertFalse(any("delete" in command for command in commands))
        roles = [argument for command in commands for argument in command
                 if argument.startswith("--role=")]
        self.assertCountEqual(roles, [
            "--role=roles/iam.workloadIdentityUser",
            "--role=roles/iam.serviceAccountUser",
            "--role=roles/artifactregistry.writer",
            "--role=roles/run.admin",
        ])
        self.assertIn("gh variable set GCP_PROJECT_ID", result.stdout)
        project_update = next(command for command in commands
                              if "projects" in command and "update" in command)
        self.assertIn("--update-labels=harborlight_env=dev", project_update)

    def test_production_uses_its_own_workflow_environment_and_service(self):
        result, commands = self.run_bootstrap("--apply", ENVIRONMENT="prod")
        self.assertEqual(result.returncode, 0, result.stderr)
        provider = next(command for command in commands if "create-oidc" in command)
        condition = next(argument for argument in provider
                         if argument.startswith("--attribute-condition="))
        self.assertIn(".github/workflows/google-cloud-prod.yml@refs/heads/main", condition)
        self.assertNotIn(".github/workflows/google-cloud-dev.yml", condition)
        self.assertIn("GCP_CLOUD_RUN_SERVICE=harborlight-api-prod", result.stdout)
        self.assertIn("--env google-cloud-prod", result.stdout)
        project_update = next(command for command in commands
                              if "projects" in command and "update" in command)
        self.assertIn("--update-labels=harborlight_env=prod", project_update)

    def test_invalid_environment_rejected_before_gcloud(self):
        result, commands = self.run_bootstrap("--apply", ENVIRONMENT="staging")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(commands, [])
        self.assertIn("dev albo prod", result.stderr)

    def test_other_environment_label_blocks_every_mutation(self):
        for environment, mode in [("prod", "label-dev"), ("dev", "label-prod")]:
            with self.subTest(environment=environment):
                result, commands = self.run_bootstrap(
                    "--apply", mode=mode, ENVIRONMENT=environment
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(any(map(mutates, commands)))
                self.assertIn("harborlight_env=", result.stderr)

    def test_failed_label_update_stops_before_enabling_services_or_creating_resources(self):
        result, commands = self.run_bootstrap("--apply", mode="label-update-denied")
        self.assertEqual(result.returncode, 42)
        mutations = [command for command in commands if mutates(command)]
        self.assertEqual(len(mutations), 1)
        self.assertFalse(any("enable" in command or "create" in command
                             or "create-oidc" in command for command in commands))
        self.assertIn("permission denied", result.stderr)

    def test_second_apply_reuses_resources_and_reconciles_provider(self):
        result, commands = self.run_bootstrap("--apply", mode="existing")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(any("create" in command or "create-oidc" in command
                             for command in commands))
        self.assertEqual(sum("update-oidc" in command for command in commands), 1)

    def test_permission_failure_is_not_interpreted_as_missing_repository(self):
        result, commands = self.run_bootstrap(
            "--apply", mode="repository-read-denied"
        )
        self.assertEqual(result.returncode, 42)
        self.assertFalse(any("create" in command or "create-oidc" in command
                             for command in commands))

    def test_incompatible_repository_is_preserved_and_rejected(self):
        result, commands = self.run_bootstrap("--apply", mode="bad-repository")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any("create" in command or "create-oidc" in command
                             or "delete" in command for command in commands))
        self.assertIn("innym formacie", result.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
