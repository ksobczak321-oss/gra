# Kolejność pracy i promocji HARBORLIGHT

Obowiązuje **DEV tutaj → GitHub i CI → PRE-PROD → PROD**. PRE-PROD to istniejący projekt `harborlight-dev`, PROD to `harborlight-prod`. Nazwy workflow `google-cloud-dev.yml`, środowiska GitHub i artefaktów `harborlight-dev-*` pozostają technicznym kontraktem; w starszych dowodach słowo DEV oznacza dzisiejszy PRE-PROD.

Push, kontrola konfiguracji, test lokalny i publikacja to odrębne operacje. Aktualny zakres: [v18](FRONTEND-V18-REQUIREMENTS.md). Bieżące wyniki i faktyczne SHA zapisuje [dziennik](IMPLEMENTATION-LOG.md).

## 1. Kod, GitHub i CI

Zmiany powstają w roboczym DEV, przechodzą odpowiednie lokalne testy i trafiają do Git. Push na `main` uruchamia CI, nie publikację Google Cloud. GitHub Pages jest podglądem deweloperskim, nie PROD.

CI waliduje model gry i migracje, reguły promocji, API, konfigurację, deterministyczny publiczny pakiet oraz testy Chromium z tego pakietu. Scenariusze testowe tworzą izolowane fikstury tylko w lokalnym odbiorze pakietu; nie zastępują wysp stałych kont chmurowych.

Lista publicznych plików jest jawna. Archiwum nie zawiera repozytorium Git, dokumentacji, sekretów ani historycznych gier. `release.json` wiąże pełny SHA z hashami i rozmiarami zawartości. Hash manifestu i archiwum są osobnymi dowodami.

## 2. Promocja na PRE-PROD

[Techniczny workflow DEV](../.github/workflows/google-cloud-dev.yml) uruchamia się ręcznie z `main` po zielonym CI **tego samego pełnego SHA**. Kontrola bez poświadczeń Google blokuje brak dowodu przed dostępem do WIF.

Workflow buduje backend raz, wdraża przez niezmienny `image@sha256` i publikuje deterministyczny frontend do `hosting:game`/`harborlight-dev`. Publiczne `/health` i `/ready` muszą potwierdzić właściwe środowisko techniczne i wydanie; aliasy `*z` nie są publicznym dowodem Cloud Run.

Odbiór należy rozdzielić:

- **Pełne testy reguł i scenariuszy przeglądarkowych:** pakiet lokalny w CI, z izolowanymi fiksturami.
- **Rzeczywisty hosting:** HTTPS, manifest i SHA każdego pliku publicznego, właściwy projekt konfiguracji, anonimowe przekierowanie do konta i stan tras API.
- **Rzeczywista zalogowana gra PRE-PROD:** odbiór renderowania istniejącej wyspy po rzeczywistym logowaniu; test nie tworzy ani nie nadpisuje wyspy. Zapisy przeglądarki są blokowane w tym scenariuszu, aby nie zastąpić postępu fiksturą.
- **Izolacja trzech kont:** rzeczywiste logowanie admin1–3, odczyt własnego zapisu i odmowa cudzych/anonimowych odczytów. Ta kontrola nie nadpisuje danych.

Brak istniejącej wyspy do bezpiecznego odbioru nie jest sukcesem testu. Sumy kontrolne nie są nazywane pełnym testem działania gry, a test logowania z atrapą nie potwierdza Firebase/Google/Meta. Szczegółowy zakres skryptów potwierdza workflow i log przebiegu.

Dopiero sukces wymaganych kontroli tworzy parę artefaktów z tej samej próby:

- `harborlight-dev-frontend-<run_id>-<run_attempt>` — dokładne archiwum publiczne;
- `harborlight-dev-release-<run_id>-<run_attempt>` — potwierdzenie wydania v2: SHA, digest backendu, hashe pakietu/manifestu, witryna i identyfikatory CI/PRE-PROD.

Retencja 90 dni. Sam obraz w rejestrze, pusty Hosting albo sondy API nie zastępują pełnego potwierdzenia v2.

## 3. Promocja na PROD

[Workflow PROD](../.github/workflows/google-cloud-prod.yml) otrzymuje `dev_run_id` udanego PRE-PROD. Nie zastępuje jego SHA najnowszym `main` i nie buduje gry ponownie.

Osobny job bez prawa OIDC sprawdza repozytorium/numeryczne ID, gałąź, właściwy workflow, sukces CI/PRE-PROD, SHA i numery prób, a także po jednym ważnym artefakcie obu rodzajów. Potwierdzenia API-only v1 są odrzucane.

Weryfikacja archiwum kończy się przed rozpakowaniem i dostępem do poświadczeń: odrzucane są obce ścieżki, linki, brakujące pliki, przekroczone limity i zmienione bajty. PROD kopiuje ten sam obraz backendu i porównuje digest, a Hosting otrzymuje identyczny pakiet z PRE-PROD. Odbiór manifestu odnosi się do SHA wybranego wydania, również gdy `main` zawiera już nowszy kod.

Konta admin1–3 i ich testowe reguły nie są kontami PROD. Produkcyjna aktywacja API, tożsamości i danych ma własny odbiór; test anonimowej strony ani sukces starego konta PRE-PROD nie potwierdza nowej konfiguracji produkcyjnej.

Przed pierwszą mutacją PROD workflow wymaga włączonej konfiguracji API oraz środowiskowych sekretów `HARBORLIGHT_PROD_SMOKE_EMAIL` i `HARBORLIGHT_PROD_SMOKE_PASSWORD` rzeczywistego konta wskazanego przez właściciela. Nie kopiujemy haseł PRE-PROD. Odbiór nie tworzy wyspy za gracza; brak istniejącego świata nie jest sukcesem testu. Szczegóły konfiguracji i pierwszego wejścia opisuje instrukcja runtime.

Domena docelowa to **https://harborlight.pl**. Powiązanie, DNS nazwa.pl, własność i certyfikat są osobnym warunkiem. Rekordy odczytujemy z rzeczywistej odpowiedzi Firebase, nie zgadujemy i nie traktujemy przygotowania domeny jako publikacji gry.

## 4. Konta, API i dostawcy

PRE-PROD zachowuje istniejące Authentication/Firestore i UID `dev-admin1`–`dev-admin3`. Zwykła publikacja nie resetuje haseł, zapisów ani pakietów startowych. Kontrola przygotowania zasobów i rzeczywisty odbiór opublikowanej gry to osobne wyniki.

v18 zapisuje postęp wyłącznie w chmurze. Lokalny DEV może być nietrwałym podglądem, lecz nie daje lokalnego konta ani kopii odzyskiwania. Dane Firebase pochodzą z konfiguracji runtime; promocja nie podmienia bajtów archiwum na inne środowisko.

Jawna zmienna środowiska GitHub `HARBORLIGHT_ACCOUNT_API_ENABLED=true` włącza właściwy projekt API. Tymczasowa konfiguracja Hostingu kieruje `/api/**` do odpowiedniej usługi Cloud Run, bez zmiany publicznych bajtów archiwum. Klient PRE-PROD musi rozpoznać aktywny tryb API i przejść jego rzeczywisty odbiór przed przeniesieniem tej konfiguracji na PROD; nie wystarcza anonimowy `401` albo samo istnienie kodu adaptera.

Kod API kont, limitów kodów i retencji wymaga właścicielskiej aktywacji: [RUNTIME-ACCOUNTS.md](RUNTIME-ACCOUNTS.md). Domyślnie wyłączone API ma odmawiać działania; brak konfiguracji nie może uruchomić produkcyjnej symulacji. IAM, routing, reguły bazy i migracja wymagają przygotowania oraz testów przed użyciem. Gospodarka nadal jest obliczana przez klienta, a serwer sond/kont nie jest pełnym autorytatywnym silnikiem gry.

OAuth Google/Facebook wymaga konfiguracji dostawcy i domen; prawdziwe Paynow/reklamy — usług operatora i zaufanych potwierdzeń. Symulacje dozwolone tylko poza PROD. Nie nadajemy szerokich ról ani nie zapisujemy sekretów w repozytorium w celu obejścia błędu. Retencja nie ma publicznego endpointu kasowania; narzędzie właściciela domyślnie działa w dry-run i wymaga osobnego jawnego włączenia mutacji.

## 5. Faktycznie potwierdzone wydanie

30 października 2026 właściciel potwierdził przygotowanie kont i Firestore. [Przebieg 41067599818](https://github.com/ksobczak321-oss/gra/actions/runs/41067599818) dla **`f161e45`** zakończył się sukcesem. PRE-PROD działa pod `https://harborlight-dev.web.app`; dostępne były oba artefakty v2: `harborlight-dev-frontend-41067599818-1` i `harborlight-dev-release-41067599818-1`.

To dowód tamtego wydania, nie publikacji v18. Każda nowa zmiana wymaga własnego CI i PRE-PROD. PROD/DNS nie mają jeszcze potwierdzonego wdrożenia. Przed użyciem starego `dev_run_id` workflow ponownie sprawdza aktualną dostępność, metadane i hashe artefaktów.

## 6. Wycofanie

Można ponownie promować wcześniejsze pełne wydanie z ważnym potwierdzeniem i dostępną parą artefaktów. Nie podmieniamy zawartości między środowiskami. Powrót aplikacji nie cofa automatycznie migracji danych, zakupów ani retencji — te operacje wymagają własnej zgodności wersji i sprawdzonego odtworzenia.
