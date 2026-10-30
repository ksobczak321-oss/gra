#!/usr/bin/env bash
# Początkowa konfiguracja oddzielnego projektu DEV albo PROD. Bez serwera i bazy.
set -euo pipefail

usage() {
  cat <<'HELP'
Użycie: bash infra/google-cloud/bootstrap.sh [--check | --apply]

Domyślny --check wyłącznie odczytuje dostęp, projekt i rozliczenia oraz pokazuje plan.
--apply włącza potrzebne API i tworzy repozytorium obrazów, konta usługowe i WIF.
Projekt Google Cloud musi już istnieć i mieć podpięte rozliczenia.

Wymagane zmienne środowiskowe:
  PROJECT_ID                    ID istniejącego, oddzielnego projektu środowiska
  GITHUB_REPOSITORY_ID          numeryczne ID repozytorium GitHub
  GITHUB_REPOSITORY_OWNER_ID    numeryczne ID właściciela repozytorium

Opcjonalne:
  ENVIRONMENT                  dev (domyślnie) albo prod; osobny projekt dla każdego
  REGION                       domyślnie europe-central2 (Warszawa)
  GITHUB_REPOSITORY             domyślnie ksobczak321-oss/gra

Skrypt wymaga gcloud i aktywnego logowania, np. w Google Cloud Shell.
Nie tworzy konta Google, projektu, konta rozliczeniowego, kluczy JSON ani bazy SQL.
Nie uruchamia też Cloud Run. --apply zmienia IAM; używaj oddzielnego projektu
wyłącznie dla wybranego środowiska. Deployer otrzyma roles/run.admin, aby móc
wdrożyć serwis i ustawić publiczny dostęp do początkowego endpointu zdrowia.
Etykieta projektu harborlight_env blokuje użycie projektu drugiego środowiska.
HELP
}

die() { printf 'BŁĄD: %s\n' "$*" >&2; exit 1; }
note() { printf '%s\n' "$*"; }

MODE=check
case "${1:---check}" in
  --check) ;;
  --apply) MODE=apply ;;
  --help|-h) usage; exit 0 ;;
  *) usage >&2; die 'Nieznany argument.' ;;
esac
[[ $# -le 1 ]] || die 'Podaj tylko --check albo --apply.'

PROJECT_ID=${PROJECT_ID:-}
ENVIRONMENT=${ENVIRONMENT:-dev}
REGION=${REGION:-europe-central2}
GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-ksobczak321-oss/gra}
GITHUB_REPOSITORY_ID=${GITHUB_REPOSITORY_ID:-}
GITHUB_REPOSITORY_OWNER_ID=${GITHUB_REPOSITORY_OWNER_ID:-}

[[ "$PROJECT_ID" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]] || die 'Ustaw poprawne PROJECT_ID istniejącego projektu (6–30 znaków).'
[[ "$ENVIRONMENT" == dev || "$ENVIRONMENT" == prod ]] || die 'ENVIRONMENT musi mieć wartość dev albo prod.'
[[ "$REGION" =~ ^[a-z]+-[a-z]+[0-9]+$ ]] || die 'Niepoprawny REGION.'
[[ "$GITHUB_REPOSITORY" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || die 'Niepoprawne GITHUB_REPOSITORY (właściciel/repozytorium).'
[[ "$GITHUB_REPOSITORY_ID" =~ ^[1-9][0-9]*$ ]] || die 'Ustaw numeryczne GITHUB_REPOSITORY_ID.'
[[ "$GITHUB_REPOSITORY_OWNER_ID" =~ ^[1-9][0-9]*$ ]] || die 'Ustaw numeryczne GITHUB_REPOSITORY_OWNER_ID.'
command -v gcloud >/dev/null 2>&1 || die 'Brak gcloud. Uruchom skrypt w Google Cloud Shell lub zainstaluj Google Cloud CLI.'

# Jawny projekt w każdej komendzie: nie zmieniamy globalnej konfiguracji gcloud.
GCLOUD=(gcloud --quiet --project="$PROJECT_ID")
ACTIVE_ACCOUNT=$("${GCLOUD[@]}" auth list --filter='status:ACTIVE' --format='value(account)')
[[ -n "$ACTIVE_ACCOUNT" ]] || die 'Brak aktywnego logowania gcloud. Zaloguj się do właściwego konta Google Cloud.'
PROJECT_DETAILS=$("${GCLOUD[@]}" projects describe "$PROJECT_ID" --format='value(projectNumber,lifecycleState)')
read -r PROJECT_NUMBER PROJECT_STATE <<< "$PROJECT_DETAILS"
[[ "$PROJECT_NUMBER" =~ ^[0-9]+$ && "$PROJECT_STATE" == ACTIVE ]] || die 'Projekt nie istnieje, nie jest aktywny albo konto nie ma dostępu.'
PROJECT_ENVIRONMENT=$("${GCLOUD[@]}" projects describe "$PROJECT_ID" --format='value(labels.harborlight_env)')
[[ -z "$PROJECT_ENVIRONMENT" || "$PROJECT_ENVIRONMENT" == "$ENVIRONMENT" ]] || die "Projekt ma etykietę harborlight_env=$PROJECT_ENVIRONMENT. Wybierz osobny projekt dla środowiska $ENVIRONMENT."
BILLING_ENABLED=$("${GCLOUD[@]}" billing projects describe "$PROJECT_ID" --format='value(billingEnabled)')
[[ "$BILLING_ENABLED" == True || "$BILLING_ENABLED" == true ]] || die 'Projekt nie ma aktywnych rozliczeń. Podłącz je w konsoli Google Cloud.'

ARTIFACT_REPOSITORY=harborlight
RUNTIME_ACCOUNT="harborlight-runtime@$PROJECT_ID.iam.gserviceaccount.com"
DEPLOYER_ACCOUNT="harborlight-deployer@$PROJECT_ID.iam.gserviceaccount.com"
POOL=harborlight-github
PROVIDER=github-main
POOL_PATH="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL"
PROVIDER_PATH="$POOL_PATH/providers/$PROVIDER"
WORKFLOW_REF="$GITHUB_REPOSITORY/.github/workflows/google-cloud-$ENVIRONMENT.yml@refs/heads/main"
ATTRIBUTE_MAPPING='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref'
ATTRIBUTE_CONDITION="assertion.repository_id == '$GITHUB_REPOSITORY_ID' && assertion.repository_owner_id == '$GITHUB_REPOSITORY_OWNER_ID' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == '$WORKFLOW_REF' && assertion.event_name == 'workflow_dispatch'"

note "Środowisko $ENVIRONMENT; projekt: $PROJECT_ID ($PROJECT_NUMBER); region: $REGION. Rozliczenia są aktywne."
note 'Plan: potrzebne API, repozytorium Docker, dwa konta usługowe i dostęp GitHub przez WIF.'
note "WIF dopuszcza wyłącznie ręczny workflow $WORKFLOW_REF oraz podane numeryczne ID repozytorium i właściciela."
note 'Cloud SQL, Firebase, serwis Cloud Run i płatne plany pozostają kolejnymi etapami.'

print_config() {
  cat <<CONFIG

Zmienne GitHub Actions dla środowiska google-cloud-$ENVIRONMENT (to nie są sekrety):
GCP_PROJECT_ID=$PROJECT_ID
GCP_REGION=$REGION
GCP_ARTIFACT_REPOSITORY=$ARTIFACT_REPOSITORY
GCP_WORKLOAD_IDENTITY_PROVIDER=$PROVIDER_PATH
GCP_DEPLOYER_SERVICE_ACCOUNT=$DEPLOYER_ACCOUNT
GCP_RUNTIME_SERVICE_ACCOUNT=$RUNTIME_ACCOUNT
GCP_CLOUD_RUN_SERVICE=harborlight-api-$ENVIRONMENT
CONFIG
}

if [[ "$MODE" == check ]]; then
  note 'CHECK: nie wykonano żadnych zmian. Powyższy plan nie oznacza utworzenia zasobów.'
  print_config
  exit 0
fi

# Etykieta jest ustawiana dopiero po kompletnym preflight. Kolejne uruchomienie
# dla innego środowiska zatrzyma się przed pierwszą mutacją.
# --update-labels dla projektów jest dostępne w ścieżce alpha, nie w GA.
"${GCLOUD[@]}" alpha projects update "$PROJECT_ID" --update-labels="harborlight_env=$ENVIRONMENT" --format=none

"${GCLOUD[@]}" services enable \
  serviceusage.googleapis.com \
  cloudresourcemanager.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com

# Listowanie odróżnia brak zasobu od błędu uprawnień lub połączenia.
EXISTING_REPOSITORIES=$("${GCLOUD[@]}" artifacts repositories list --location="$REGION" --format='value(name,format)')
FOUND_REPOSITORY=false
while read -r REPOSITORY_NAME REPOSITORY_FORMAT; do
  if [[ "${REPOSITORY_NAME##*/}" == "$ARTIFACT_REPOSITORY" ]]; then
    [[ "$REPOSITORY_FORMAT" == DOCKER ]] || die "Repozytorium $ARTIFACT_REPOSITORY już istnieje w innym formacie."
    FOUND_REPOSITORY=true
  fi
done <<< "$EXISTING_REPOSITORIES"
if [[ "$FOUND_REPOSITORY" == false ]]; then
  "${GCLOUD[@]}" artifacts repositories create "$ARTIFACT_REPOSITORY" \
    --location="$REGION" --repository-format=docker \
    --description="Obrazy API HARBORLIGHT $ENVIRONMENT"
fi

ensure_service_account() {
  local name=$1 email=$2 display_name=$3 existing
  existing=$("${GCLOUD[@]}" iam service-accounts list --filter="email=$email" --format='value(email)')
  if [[ "$existing" != "$email" ]]; then
    "${GCLOUD[@]}" iam service-accounts create "$name" --display-name="$display_name"
  fi
}
ensure_service_account harborlight-runtime "$RUNTIME_ACCOUNT" "HARBORLIGHT $ENVIRONMENT runtime"
ensure_service_account harborlight-deployer "$DEPLOYER_ACCOUNT" "HARBORLIGHT $ENVIRONMENT GitHub deployer"

EXISTING_POOLS=$("${GCLOUD[@]}" iam workload-identity-pools list --location=global --format='value(name)')
FOUND_POOL=false
while IFS= read -r name; do [[ "$name" != "$POOL_PATH" ]] || FOUND_POOL=true; done <<< "$EXISTING_POOLS"
if [[ "$FOUND_POOL" == true ]]; then
  "${GCLOUD[@]}" iam workload-identity-pools update "$POOL" --location=global --no-disabled \
    --display-name='HARBORLIGHT GitHub'
else
  "${GCLOUD[@]}" iam workload-identity-pools create "$POOL" --location=global \
    --display-name='HARBORLIGHT GitHub'
fi

EXISTING_PROVIDERS=$("${GCLOUD[@]}" iam workload-identity-pools providers list \
  --location=global --workload-identity-pool="$POOL" --format='value(name)')
FOUND_PROVIDER=false
while IFS= read -r name; do [[ "$name" != "$PROVIDER_PATH" ]] || FOUND_PROVIDER=true; done <<< "$EXISTING_PROVIDERS"
if [[ "$FOUND_PROVIDER" == true ]]; then
  "${GCLOUD[@]}" iam workload-identity-pools providers update-oidc "$PROVIDER" \
    --location=global --workload-identity-pool="$POOL" --no-disabled \
    --issuer-uri='https://token.actions.githubusercontent.com' \
    --attribute-mapping="$ATTRIBUTE_MAPPING" --attribute-condition="$ATTRIBUTE_CONDITION"
else
  "${GCLOUD[@]}" iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --location=global --workload-identity-pool="$POOL" \
    --issuer-uri='https://token.actions.githubusercontent.com' \
    --attribute-mapping="$ATTRIBUTE_MAPPING" --attribute-condition="$ATTRIBUTE_CONDITION"
fi

"${GCLOUD[@]}" iam service-accounts add-iam-policy-binding "$DEPLOYER_ACCOUNT" \
  --member="principalSet://iam.googleapis.com/$POOL_PATH/attribute.repository_id/$GITHUB_REPOSITORY_ID" \
  --role=roles/iam.workloadIdentityUser --condition=None --format=none
"${GCLOUD[@]}" iam service-accounts add-iam-policy-binding "$RUNTIME_ACCOUNT" \
  --member="serviceAccount:$DEPLOYER_ACCOUNT" --role=roles/iam.serviceAccountUser --condition=None --format=none
"${GCLOUD[@]}" artifacts repositories add-iam-policy-binding "$ARTIFACT_REPOSITORY" \
  --location="$REGION" --member="serviceAccount:$DEPLOYER_ACCOUNT" \
  --role=roles/artifactregistry.writer --condition=None --format=none
# run.admin obejmuje IAM serwisu. Reszta uprawnień jest zawężona do repozytorium
# obrazów i konta runtime. Wymagamy oddzielnego projektu dla każdego środowiska.
"${GCLOUD[@]}" projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOYER_ACCOUNT" --role=roles/run.admin --condition=None --format=none

note 'APPLY zakończone. Utworzono lub uzgodniono konfigurację; serwis Cloud Run nie został jeszcze wdrożony.'
note 'Runtime nie otrzymał żadnej roli projektowej. Nie utworzono stałych kluczy ani bazy SQL.'
note 'Ustaw alerty budżetowe przed pierwszym wdrożeniem. Alert sam nie zatrzymuje naliczania opłat.'
print_config

note ''
note "Opcjonalne komendy do zapisania tych wartości przez GitHub CLI. Najpierw utwórz środowisko google-cloud-$ENVIRONMENT w $GITHUB_REPOSITORY i zaloguj gh. Skrypt ich nie wykonuje:"
while IFS='=' read -r name value; do
  printf 'gh variable set %q --repo %q --env %q --body=%q\n' "$name" "$GITHUB_REPOSITORY" "google-cloud-$ENVIRONMENT" "$value"
done <<CONFIG
GCP_PROJECT_ID=$PROJECT_ID
GCP_REGION=$REGION
GCP_ARTIFACT_REPOSITORY=$ARTIFACT_REPOSITORY
GCP_WORKLOAD_IDENTITY_PROVIDER=$PROVIDER_PATH
GCP_DEPLOYER_SERVICE_ACCOUNT=$DEPLOYER_ACCOUNT
GCP_RUNTIME_SERVICE_ACCOUNT=$RUNTIME_ACCOUNT
GCP_CLOUD_RUN_SERVICE=harborlight-api-$ENVIRONMENT
CONFIG
