# Google Cloud — DEV i PROD HARBORLIGHT krok po kroku

Stan z 30 października 2026: użytkownik wybrał Google Cloud, pokazał aktywne konto rozliczeniowe HARBORLIGHT oraz utworzone projekty `harborlight-dev` i `harborlight-prod`. Wykonał bootstrap, a odczytowa kontrola w jego zalogowanym Cloud Shell zakończyła się **PASS=22, FAIL=0**, co potwierdza przekazany screen. To dowód poprawnej konfiguracji początkowej; serwer, konta graczy i baza nie zostały jeszcze wdrożone.

## Oddzielenie środowisk

| Środowisko | Oddzielny projekt Google Cloud | Środowisko GitHub Actions | Przeznaczenie |
| --- | --- | --- | --- |
| DEV | `harborlight-dev` — ID potwierdzone screenem użytkownika | `google-cloud-dev` | Rozwój i testy |
| PROD | `harborlight-prod` — ID potwierdzone screenem użytkownika | `google-cloud-prod` | Docelowa opublikowana gra |

Oba projekty mogą korzystać z tego samego konta rozliczeniowego HARBORLIGHT. Mają osobne konta usługowe, zaufanie GitHub, obrazy i później oddzielne bazy oraz konfigurację Firebase. DEV nie otrzymuje dostępu do danych PROD. Utworzenie pustego projektu nie uruchamia serwerów ani baz. Na tym etapie również workflow PROD publikuje wyłącznie serwer sond, nie gotową usługę gry.

Bootstrap oznacza projekt etykietą `harborlight_env=dev` lub `prod` i odmawia użycia projektu oznaczonego jako drugie środowisko. Workflow weryfikuje tę etykietę przed wysłaniem obrazu. Obowiązuje [kolejność promocji](RELEASE-PROCESS.md): praca tutaj → GitHub i udane CI → udane DEV → PROD. Push zmian nie uruchamia żadnego z dwóch wdrożeń GCP. PROD kopiuje ten sam obraz po digest, bez ponownej budowy.

## Docelowy układ

| Element | Usługa | Etap |
| --- | --- | --- |
| API i serwerowe reguły gry | Cloud Run, Node.js w kontenerze | Przygotowany serwer startowy i osobne workflow DEV/PROD |
| Stan wysp, transakcje, kopie | Cloud SQL PostgreSQL | Kolejny etap po wycenie konkretnej instancji |
| Konta web/Android/iPhone | Firebase Authentication | Kolejny etap; formularze gry pozostają lokalnym prototypem |
| Strona i grafiki | Firebase Hosting/CDN | Po przygotowaniu przejścia ze starych lokalnych zapisów |

API i bazę planujemy w Warszawie, `europe-central2`. Region każdej późniejszej usługi dobieramy przy jej tworzeniu; sam projekt nie ma jednego regionu. Wspólne API i PostgreSQL pozwalają zwiększać zasoby bez planowanej zmiany platformy po przekroczeniu 100 graczy.

100 jednoczesnych graczy oznacza kolejny punkt pomiaru, a nie sztywny limit chmury. Cloud Run automatycznie dodaje instancje do ustawionego maksimum. Moc Cloud SQL i połączenia do bazy wymagają oddzielnego doboru; baza nie skaluje CPU automatycznie co 100 osób. Nie wdrażamy jeszcze autorytatywnej gospodarki, synchronizacji, płatności ani reklam.

## Pierwszy etap — co jest gotowe

- [`backend/server.mjs`](../backend/server.mjs): tylko publiczne sondy `/healthz` i `/readyz`, bez przyjmowania stanu gracza. Gotowość dotyczy infrastruktury HTTP; odpowiedź jawnie oznacza brak kont, zapisu i API gry.
- [`backend/Dockerfile`](../backend/Dockerfile): Node.js 24, użytkownik bez uprawnień roota, brak instalowanych pakietów. Kontekst obrazu zawiera wyłącznie pliki serwera, bez dokumentacji i poświadczeń.
- [`infra/google-cloud/bootstrap.sh`](../infra/google-cloud/bootstrap.sh): kontrola istniejącego projektu i rozliczeń, a następnie opcjonalna konfiguracja API, Artifact Registry, kont usługowych i Workload Identity Federation.
- [Workflow DEV](../.github/workflows/google-cloud-dev.yml) i [workflow PROD](../.github/workflows/google-cloud-prod.yml): oddzielne ręczne wdrożenia z `main`, testy, budowa obrazu, krótkotrwałe uwierzytelnienie, publikacja i sprawdzenie obu sond. Sam push kodu nie uruchamia wdrożenia Google Cloud.

Początkowe usługi `harborlight-api-dev` i `harborlight-api-prod` używają Cloud Run gen2: 1 vCPU, 512 MiB, minimum 0 instancji, maksimum 2 instancje na rewizję, współbieżność 20 i limit żądania 30 sekund. Proces dostaje CPU podczas obsługi żądania. Nie ma cyklicznego procesu symulującego każdą wyspę w tle. To konfiguracja serwera startowego; wydajność pełnej gospodarki trzeba zmierzyć przed dopuszczeniem graczy.

## Czynności wymagające konta właściciela

1. W [konsoli Google Cloud](https://console.cloud.google.com/projectcreate) utworzyć dwa oddzielne projekty **harborlight-dev** i **harborlight-prod**, domyślnie bez organizacji. Powiązać je z aktywnym kontem rozliczeniowym HARBORLIGHT. Zapisać oba **ID projektów**, które różnią się od nazw i od identyfikatora konta rozliczeniowego.
2. Ustawić w rozliczeniach budżety dla projektów i powiadomienia. Kwotę oraz walutę dobrać do konta i oczekiwanego kosztu testów. Alert budżetowy sam nie zatrzymuje wydatków.
3. Jednorazowo uruchomić konfigurację z zalogowanego [Google Cloud Shell](https://shell.cloud.google.com/) albo ze środowiska z autoryzowanym `gcloud`. Nie przekazywać do repozytorium haseł, tokenów ani kluczy kont usługowych. To środowisko Codex nie ma obecnie działającego dostępu do konta Google użytkownika.

Po ustaleniu ID projektów można przygotować dla właściciela komendy z konkretnymi identyfikatorami. Najpierw uruchamiamy DEV. Szablon poniżej opisuje proces; pustych wartości nie należy wykonywać:

```sh
git clone --depth 1 https://github.com/ksobczak321-oss/gra.git harborlight-infra
cd harborlight-infra
cp infra/google-cloud/config.example.env infra/google-cloud/config.dev.local.env
```

`PROJECT_ID=harborlight-dev` i `ENVIRONMENT=dev` są już wpisane. Publiczne numeryczne `GITHUB_REPOSITORY_ID` i `GITHUB_REPOSITORY_OWNER_ID` również są wpisane i zostały sprawdzone na stronie GitHub 30 października 2026. Przy zmianie repozytorium lub właściciela należy je zaktualizować; można je odczytać przez `gh api repos/ksobczak321-oss/gra --jq '{repository_id: .id, owner_id: .owner.id}'`. Plik lokalny jest ignorowany przez Git. Następnie:

```sh
set -a
source infra/google-cloud/config.dev.local.env
set +a
bash infra/google-cloud/bootstrap.sh --check
bash infra/google-cloud/bootstrap.sh --apply
```

`--check` jest domyślny i niczego nie zmienia. `--apply` włącza usługi oraz konfiguruje zasoby i IAM. Oba tryby wymagają działającego `gcloud`, dostępu do aktywnego projektu i podpiętych rozliczeń. Skrypt nie tworzy projektu ani konta rozliczeniowego. Nie wdraża serwera i nie tworzy bazy SQL.

Ustawianie etykiety projektu korzysta z `gcloud alpha projects update`: stabilna ścieżka `gcloud projects update` nie obsługuje flagi `--update-labels`. Komponent `alpha` musi być dostępny w używanym Google Cloud CLI; Cloud Shell zwykle już go zawiera. Po pobraniu poprawki wystarczy `git pull --ff-only` w sklonowanym katalogu i ponowne uruchomienie konfiguracji obu środowisk.

Dla PROD użyć `config.prod.example.env` i utworzyć lokalny `config.prod.local.env`; zawiera już **drugi** ID `harborlight-prod` z `ENVIRONMENT=prod`. Powtórzyć kontrolę i konfigurację po wczytaniu tego pliku; nie zmieniać oznaczenia projektu DEV na PROD.

## Połączenie z GitHub

Workflow zawierają domyślne, publiczne identyfikatory potwierdzonych projektów oraz kont usługowych. Dzięki temu pierwsze wdrożenie nie wymaga kopiowania zmiennych ani kluczy do GitHuba. Środowiska GitHub Actions **google-cloud-dev** i **google-cloud-prod** powstaną przy pierwszym użyciu, jeśli jeszcze nie istnieją. Opcjonalne zmienne środowiska mogą nadpisać wartości domyślne:

```text
GCP_PROJECT_ID
GCP_REGION
GCP_ARTIFACT_REPOSITORY
GCP_WORKLOAD_IDENTITY_PROVIDER
GCP_DEPLOYER_SERVICE_ACCOUNT
GCP_RUNTIME_SERVICE_ACCOUNT
GCP_CLOUD_RUN_SERVICE
```

Bootstrap wypisuje również opcjonalne komendy `gh variable set` do użycia w sesji z dostępem do właściwego repozytorium; sam ich nie wykonuje i nie są potrzebne przy obecnych domyślnych identyfikatorach. Identyfikatory nie są sekretami. Nie tworzymy ani nie przechowujemy klucza JSON. WIF dopuszcza wyłącznie właściwe numeryczne ID repozytorium i właściciela, `main`, dokładny plik workflow oraz ręczne zdarzenie `workflow_dispatch`. IAM może potrzebować kilku minut na propagację.

Każdy runtime ma własne konto usługowe bez nadawania ról projektowych. Deployer może zapisywać obrazy tylko w repozytorium `harborlight` swojego projektu i używać wyłącznie jego konta runtime. Otrzymuje Cloud Run Admin w wydzielonym projekcie danego środowiska, aby tworzyć usługę i ustawiać publiczny dostęp do sond. Nie nadajemy dostępu z deployera DEV do projektu PROD. Deployer PROD otrzymuje tylko odczyt repozytorium obrazów DEV, aby kopiować sprawdzony pakiet; dodaje go ponowne uruchomienie aktualnego bootstrapu PROD.

Po udanym CI uruchomić **Deploy HARBORLIGHT API to Google Cloud dev** w GitHub Actions, wybierając `main`. DEV zapisuje potwierdzenie wydania dopiero po testach działającego serwera. Workflow **Promote verified HARBORLIGHT DEV release to PROD** wymaga identyfikatora tego udanego przebiegu DEV i promuje dokładnie jego obraz na drugi projekt. Oba sprawdzają odpowiedzi HTTP, właściwe środowisko i SHA commitu oraz zapisują adres usługi w podsumowaniu. Dopiero zakończone wdrożenie i te odpowiedzi potwierdzają działający serwer. Publiczne sondy nie zastępują późniejszej weryfikacji tokenów Firebase dla kont i komend gry.

## Koszty i następne etapy

- Przy braku ruchu Cloud Run może zejść do zera instancji. Przechowywanie obrazów, logi, transfer i późniejsza baza mają osobne rozliczenia; samo minimum 0 nie oznacza zerowej faktury.
- Maksimum 2 dotyczy rewizji. Podczas wymiany rewizji i w szczególnych warunkach liczba instancji może chwilowo być większa. To ograniczenie skalowania, a nie twardy limit kosztów.
- Obrazy są oznaczane SHA commitu. W kolejnym kroku ustalamy retencję zachowującą obrazy do wycofania wdrożenia; pierwszy etap nie usuwa automatycznie starych obrazów.
- Cloud SQL nalicza koszt także poza 2–3 godzinami testów. Przed jej uruchomieniem dobieramy i wyceniamy instancję, dysk, kopie i sposób dostępu. Aktualnych cen dostawcy nie potwierdzono: publiczne cenniki w tym środowisku zwracają HTTP 403. Nie traktować wcześniejszej wyceny Cloudflare/Supabase jako wyceny Google Cloud.
- Dalej: trwała baza i sprawdzenie odtworzenia kopii, Firebase Auth, autorytatywne komendy z idempotencją, przeniesienie zapisu oraz testy 100/200/300 CCU. Skalowanie instancji API trzeba dopasować do limitu połączeń bazy.

Przeglądarka zapisuje wyspę w `localStorage` zależnym od domeny. Przeniesienie strony z GitHub Pages na inną domenę nie przenosi tego zapisu automatycznie. Przygotowanie konta/importu poprzedzi zmianę hostingu; obecna gra i jej pliki pozostają w wydaniu frontend-v17.

## Sprawdzenia lokalne

```sh
node --test backend/test/*.test.mjs
python3 tests/harborlight-gcp-bootstrap.test.py
bash -n infra/google-cloud/bootstrap.sh
docker build --tag harborlight-api:infra-dev-check backend
```

Testy sond obejmują rzeczywiste lokalne HTTP, HEAD/metody, brak dostępu do plików i gotowość przy zamykaniu. Testy bootstrapu używają wyłącznie atrapy `gcloud`: sprawdzają tryb odczytu, blokadę bez rozliczeń, walidację identyfikatorów, rozdział DEV/PROD, zakres IAM/WIF, ponowne uruchomienie i błędy dostępu. Nie sprawdzają prawdziwej konfiguracji Google Cloud.
