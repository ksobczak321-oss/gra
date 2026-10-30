#!/usr/bin/env python3
"""Read-only verification of the initial HARBORLIGHT Google Cloud bootstrap."""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys


REGION = "europe-central2"
BILLING_ACCOUNT = "billingAccounts/010F11-5A6F09-27543C"
REPOSITORY_ID = "1428128759"
OWNER_ID = "222425714"
GITHUB_REPOSITORY = "ksobczak321-oss/gra"


class VerificationError(Exception):
    pass


def gcloud_json(project, *arguments):
    """Only callers below supply fixed describe/get-iam-policy commands."""
    try:
        result = subprocess.run(
            ["gcloud", f"--project={project}", *arguments, "--format=json"],
            # Do not auto-accept prompts that could enable a missing API.
            stdin=subprocess.DEVNULL,
            env=dict(os.environ, CLOUDSDK_CORE_DISABLE_PROMPTS="false"),
            capture_output=True, text=True, timeout=60, check=False,
        )
    except subprocess.TimeoutExpired as error:
        raise VerificationError("przekroczono czas odczytu gcloud") from error
    except OSError as error:
        raise VerificationError("nie można uruchomić gcloud") from error
    if result.returncode:
        # Do not echo full IAM responses, credentials or arbitrary CLI stderr.
        raise VerificationError(f"brak odczytu zasobu; gcloud zakończył się kodem {result.returncode}")
    try:
        value = json.loads(result.stdout)
    except (ValueError, TypeError) as error:
        raise VerificationError("gcloud zwrócił niepoprawny JSON") from error
    if not isinstance(value, dict):
        raise VerificationError("gcloud nie zwrócił obiektu zasobu")
    return value


def require(condition, message):
    if not condition:
        raise VerificationError(message)


def has_role(policy, role, member):
    return any(
        binding.get("role") == role
        and member in binding.get("members", [])
        and not binding.get("condition")
        for binding in policy.get("bindings", [])
    )


def expected_condition(environment):
    return (
        f"assertion.repository_id == '{REPOSITORY_ID}' && "
        f"assertion.repository_owner_id == '{OWNER_ID}' && "
        "assertion.ref == 'refs/heads/main' && "
        f"assertion.workflow_ref == '{GITHUB_REPOSITORY}/.github/workflows/google-cloud-{environment}.yml@refs/heads/main' && "
        "assertion.event_name == 'workflow_dispatch'"
    )


class Verifier:
    def __init__(self):
        self.passed = 0
        self.failed = 0

    def check(self, environment, label, operation):
        try:
            value = operation()
        except (VerificationError, KeyError, AttributeError, TypeError, ValueError) as error:
            self.failed += 1
            print(f"FAIL {environment.upper()} — {label}: {error}")
            return None
        self.passed += 1
        print(f"PASS {environment.upper()} — {label}")
        return value

    def project(self, environment):
        project = f"harborlight-{environment}"
        runtime = f"harborlight-runtime@{project}.iam.gserviceaccount.com"
        deployer = f"harborlight-deployer@{project}.iam.gserviceaccount.com"
        deployer_member = f"serviceAccount:{deployer}"

        def project_info():
            data = gcloud_json(project, "projects", "describe", project)
            require(data.get("projectId") == project, "niezgodny identyfikator projektu")
            require(data.get("lifecycleState") == "ACTIVE", "projekt nie jest aktywny")
            require(data.get("labels", {}).get("harborlight_env") == environment,
                    "brak właściwej etykiety harborlight_env")
            number = str(data.get("projectNumber", ""))
            require(bool(re.fullmatch(r"[1-9][0-9]*", number)), "brak numeru projektu")
            return number

        number = self.check(environment, "projekt i etykieta środowiska", project_info)

        def billing():
            data = gcloud_json(project, "billing", "projects", "describe", project)
            require(data.get("billingEnabled") is True, "rozliczenia są wyłączone")
            require(data.get("billingAccountName") == BILLING_ACCOUNT,
                    "projekt nie jest połączony z kontem rozliczeniowym HARBORLIGHT")

        self.check(environment, "rozliczenia HARBORLIGHT", billing)

        def repository():
            data = gcloud_json(project, "artifacts", "repositories", "describe", "harborlight",
                               f"--location={REGION}")
            expected = f"projects/{project}/locations/{REGION}/repositories/harborlight"
            require(data.get("name") == expected, "niezgodny projekt lub region repozytorium obrazów")
            require(data.get("format") == "DOCKER", "repozytorium nie ma formatu DOCKER")

        self.check(environment, "repozytorium obrazów w Warszawie", repository)

        for account, label in [(runtime, "konto runtime"), (deployer, "konto deployera")]:
            def service_account(account=account):
                data = gcloud_json(project, "iam", "service-accounts", "describe", account)
                require(data.get("email") == account, "niezgodne konto usługowe")
                require(data.get("disabled", False) is False, "konto usługowe jest wyłączone")

            self.check(environment, label, service_account)

        pool_path = f"projects/{number}/locations/global/workloadIdentityPools/harborlight-github" if number else None

        def pool():
            require(pool_path is not None, "nie odczytano numeru projektu")
            data = gcloud_json(project, "iam", "workload-identity-pools", "describe", "harborlight-github",
                               "--location=global")
            require(data.get("name") == pool_path, "niezgodna pula WIF")
            require(data.get("state") == "ACTIVE" and data.get("disabled", False) is False,
                    "pula WIF nie jest aktywna")

        self.check(environment, "aktywna pula WIF", pool)

        def provider():
            require(pool_path is not None, "nie odczytano numeru projektu")
            data = gcloud_json(project, "iam", "workload-identity-pools", "providers", "describe", "github-main",
                               "--workload-identity-pool=harborlight-github", "--location=global")
            require(data.get("name") == f"{pool_path}/providers/github-main", "niezgodny dostawca WIF")
            require(data.get("state") == "ACTIVE" and data.get("disabled", False) is False,
                    "dostawca WIF nie jest aktywny")
            require(data.get("oidc", {}).get("issuerUri") == "https://token.actions.githubusercontent.com",
                    "niezgodny wystawca tokenów GitHub")
            actual = re.sub(r"\s+", " ", data.get("attributeCondition", "")).strip()
            require(actual == expected_condition(environment), "warunek WIF nie odpowiada repozytorium, main i workflow środowiska")
            require(data.get("attributeMapping") == {
                "google.subject": "assertion.sub",
                "attribute.repository_id": "assertion.repository_id",
                "attribute.repository_owner_id": "assertion.repository_owner_id",
                "attribute.ref": "assertion.ref",
            }, "niezgodne mapowanie tożsamości WIF")

        self.check(environment, "WIF ograniczony do właściwego GitHuba i workflow", provider)

        def deployer_iam():
            require(pool_path is not None, "nie odczytano numeru projektu")
            data = gcloud_json(project, "iam", "service-accounts", "get-iam-policy", deployer)
            member = f"principalSet://iam.googleapis.com/{pool_path}/attribute.repository_id/{REPOSITORY_ID}"
            require(has_role(data, "roles/iam.workloadIdentityUser", member), "brak powiązania WIF z deployerem")

        self.check(environment, "uprawnienie GitHuba do deployera", deployer_iam)

        def runtime_iam():
            data = gcloud_json(project, "iam", "service-accounts", "get-iam-policy", runtime)
            require(has_role(data, "roles/iam.serviceAccountUser", deployer_member), "deployer nie może użyć konta runtime")

        self.check(environment, "deployer może użyć właściwego runtime", runtime_iam)

        def repository_iam():
            data = gcloud_json(project, "artifacts", "repositories", "get-iam-policy", "harborlight",
                               f"--location={REGION}")
            require(has_role(data, "roles/artifactregistry.writer", deployer_member), "brak zapisu obrazów dla deployera")

        self.check(environment, "zapis obrazów przez deployera", repository_iam)

        def project_iam():
            data = gcloud_json(project, "projects", "get-iam-policy", project)
            require(has_role(data, "roles/run.admin", deployer_member), "brak Cloud Run Admin dla deployera")
            runtime_member = f"serviceAccount:{runtime}"
            require(not any(runtime_member in binding.get("members", [])
                            for binding in data.get("bindings", [])),
                    "runtime ma rolę projektową; początkowa konfiguracja zakłada brak takich ról")

        self.check(environment, "Cloud Run Admin deployera i minimalny runtime", project_iam)

    def promotion(self):
        def source_images():
            data = gcloud_json("harborlight-dev", "artifacts", "repositories", "get-iam-policy", "harborlight",
                               f"--location={REGION}")
            member = "serviceAccount:harborlight-deployer@harborlight-prod.iam.gserviceaccount.com"
            require(has_role(data, "roles/artifactregistry.reader", member),
                    "brak odczytu obrazów DEV dla deployera PROD")

        self.check("prod", "odczyt sprawdzonych obrazów DEV", source_images)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--environment", choices=["dev", "prod", "both"], default="both")
    parser.add_argument("--promotion", action="store_true",
                        help="dodatkowo sprawdź odczyt obrazów DEV przez deployera PROD")
    args = parser.parse_args()
    if not shutil.which("gcloud"):
        print("FAIL — brak gcloud. Uruchom ten odczyt w zalogowanym Google Cloud Shell.")
        return 2
    verifier = Verifier()
    print("Kontrola tylko do odczytu — nie tworzy ani nie zmienia zasobów.")
    for environment in (["dev", "prod"] if args.environment == "both" else [args.environment]):
        verifier.project(environment)
    if args.promotion:
        verifier.promotion()
    print(f"WYNIK: PASS={verifier.passed}, FAIL={verifier.failed}")
    print("Zakres: konfiguracja bootstrapu. To nie potwierdza wdrożenia gry ani działania bazy.")
    return 1 if verifier.failed else 0


if __name__ == "__main__":
    sys.exit(main())
