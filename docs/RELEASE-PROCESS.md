# Kolejność pracy i promocji HARBORLIGHT

Zasada ustalona 30 października 2026: **praca tutaj → synchronizacja do GitHub → CI → GCP DEV → GCP PROD**. Synchronizacja kodu nie jest promocją do chmury. DEV i PROD uruchamiamy osobno; na PROD trafia wyłącznie kompletny pakiet sprawdzony wcześniej na DEV.

## 1. Rozwój, GitHub i CI

Zmiany powstają w roboczym środowisku Codex, przechodzą odpowiednie testy lokalne i trafiają do Git. Push na `main` uruchamia [CI](../.github/workflows/ci.yml): reguły gry, blokady promocji, backend, konfigurację chmury i domeny oraz budowę publicznego pakietu. Pełne testy Chromium działają z plików tego pakietu, nie z całego katalogu repozytorium.

Dotychczasowy GitHub Pages pozostaje **podglądem deweloperskim**, a nie GCP PROD. Jego aktualizacja nie jest dowodem przejścia DEV. Push nie uruchamia automatycznie publikacji Google Cloud.

## 2. Promocja całej gry na GCP DEV

Uruchomienie [workflow DEV](../.github/workflows/google-cloud-dev.yml) z `main` wymaga udanego CI po pushu dla **tego samego pełnego SHA commitu**. Brak zielonego CI zatrzymuje proces przed uzyskaniem poświadczeń Google.

Workflow przygotowuje dwa elementy wydania:

- obraz backendu, budowany raz i wdrażany na Cloud Run przez niezmienny `image@sha256`;
- deterministyczne archiwum frontendu: aktywne pliki gry i grafiki oraz manifest `release.json` wiążący SHA z hashami plików.

Frontend trafia do targetu `hosting:game` na witrynie `harborlight-dev`. Po publikacji workflow porównuje pobrany po HTTPS manifest z oczekiwanym SHA/hash i uruchamia pełne pięć grup testów rzeczywistej gry pod planowanym adresem `https://harborlight-dev.web.app`. Publiczne sondy backendu `/health` i `/ready` muszą równocześnie potwierdzić środowisko DEV i ten sam commit.

Dopiero po sukcesie wszystkich kontroli powstają dwa artefakty, związane z przebiegiem i numerem próby:

- `harborlight-dev-frontend-<run_id>-<run_attempt>` — dokładne archiwum plików publicznych;
- `harborlight-dev-release-<run_id>-<run_attempt>` — potwierdzenie wydania **v2**, zawierające SHA, obraz/digest, hash archiwum i manifestu, witrynę, CI/DEV i numery prób.

Retencja wynosi 90 dni. Sam obraz w rejestrze, pusty Hosting, wynik konfiguracji lub zielone testy lokalne nie zastępują potwierdzenia działającego wydania DEV.

## 3. Promocja na GCP PROD

W [workflow PROD](../.github/workflows/google-cloud-prod.yml) podajemy `dev_run_id` — identyfikator udanego wdrożenia DEV. Workflow nie zastępuje jego SHA najnowszym `main`.

Oddzielny job bez prawa uzyskania tożsamości Google sprawdza właściwe repozytorium i numeryczne ID, `main`, plik workflow, udane CI i DEV, zgodne SHA oraz numery prób. Wymaga po jednym ważnym, niewygasłym artefakcie obu rodzajów. Potwierdzenia v1 obejmujące tylko sondy backendu są odrzucane.

Dopiero zależny job weryfikuje i rozpakowuje archiwum, porównując jego hash, manifest i commit, zanim uzyska poświadczenia Google. Odrzuca obce ścieżki, linki, brakujące pliki i zmienioną zawartość. Nie buduje gry ponownie.

PROD kopiuje identyczny obraz backendu, zachowuje manifest i porównuje digest przed wdrożeniem. Firebase Hosting otrzymuje dokładnie archiwum z DEV. Testy opublikowanej gry i manifestu sprawdzają SHA wybranego wydania, nawet jeżeli na GitHubie jest już nowszy kod.

Docelowa domena produkcyjna to **https://harborlight.pl**. Powiązanie domeny oraz aktywne DNS/własność/certyfikat są osobnym warunkiem gotowości PROD. Przygotowanie pustej witryny lub powiązania domeny nie publikuje gry i nie omija wcześniejszych etapów.

## Uprawnienia i stan faktyczny

DEV i PROD są oddzielnymi projektami oraz środowiskami GitHub. Joby kontrolne mają dostęp do kodu i metadanych Actions; poświadczenia Google są dostępne dopiero po przejściu kontroli. WIF wymaga odpowiedniego pliku workflow z `main` i ręcznego uruchomienia.

Deployer ma Cloud Run/Hosting tylko w swoim projekcie. PROD dodatkowo potrzebuje wyłącznie odczytu repozytorium obrazów DEV. Aktualny bootstrap dodaje `artifactregistry.reader`; po starszym bootstrapie jego część PROD trzeba powtórzyć. Nie nadajemy dostępu do bazy DEV ani ogólnych ról w jego projekcie.

Domyślne identyfikatory projektów są publiczną konfiguracją workflow; nie trzeba kopiować sekretów do GitHuba. [Kontrola konfiguracji](../infra/google-cloud/verify.py) obejmuje 22 punkty, a `--promotion` dodaje 23. punkt roli czytelnika obrazów DEV dla PROD. Potwierdzono wynik 22/22; wynik 23. kontroli pozostaje do otrzymania.

Właściciel aktywował Firebase w istniejącym projekcie i potwierdził gotowość witryny DEV. Pierwszy przebieg publikacji przeszedł gate i wdrożył usługę Cloud Run, lecz kontrola publicznego `/healthz` zwróciła HTTP 404, zanim rozpoczęła się publikacja frontendu. Przygotowano sondy `/health` i `/ready`; poprawka wymaga własnego CI i nowego uruchomienia DEV. [Konfiguracja hostingu i domeny](GOOGLE-CLOUD.md) odróżnia przygotowanie zasobów od udanej publikacji gry.

## Wycofanie i następne elementy

Można ponownie promować poprzednie pełne wydanie mające ważne potwierdzenie DEV i dostępne artefakty. Po wygaśnięciu dowodu lub zmianie kodu wymagane jest ponowne przejście odpowiednich etapów. Nie podmieniamy zawartości między DEV i PROD.

Frontend jest obecną przeglądarkową grą z lokalnym zapisem. Nowa domena ma odrębny `localStorage`; stare wyspy z GitHub Pages nie przenoszą się automatycznie. Backend nadal zawiera sondy, a nie konta i serwerową gospodarkę. Firebase Authentication, trwały zapis i migracje bazy wymagają własnego wdrożenia i testów na DEV w tym samym łańcuchu.

Administratorzy nadal zarządzają IAM i workflow. Normalne publikacje prowadzimy wyłącznie opisaną automatyzacją; sukces jednego etapu nie uprawnia do pominięcia następnego.
