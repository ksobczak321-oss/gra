# Kolejność pracy i promocji HARBORLIGHT

Obowiązuje **DEV tutaj → GitHub i CI → PRE-PROD → PROD**. PRE-PROD to istniejący projekt `harborlight-dev`, PROD to `harborlight-prod`. Nazwy workflow `google-cloud-dev.yml`, środowiska GitHub i artefaktów `harborlight-dev-*` pozostają technicznym kontraktem; w starszych dowodach słowo DEV oznacza dzisiejszy PRE-PROD.

Push, kontrola konfiguracji, test lokalny i publikacja to odrębne operacje. Aktualny zakres: [v18](FRONTEND-V18-REQUIREMENTS.md), [v19](FRONTEND-V19-REQUIREMENTS.md), [v20](FRONTEND-V20-REQUIREMENTS.md), [v21](FRONTEND-V21-REQUIREMENTS.md) i [v22](FRONTEND-V22-REQUIREMENTS.md). Kanoniczny [rejestr środowisk](ENVIRONMENT-STATUS.md) rozdziela aktualny DEV/Git/CI/Pages, faktyczne PRE-PROD/PROD, aktywację API i reset. Historyczne wyniki pozostają w [dzienniku](IMPLEMENTATION-LOG.md).

## 1. Kod, GitHub i CI

Zmiany powstają w roboczym DEV, przechodzą odpowiednie lokalne testy i trafiają do Git. Push na `main` uruchamia CI, nie publikację Google Cloud. GitHub Pages jest podglądem deweloperskim, nie PROD.

CI waliduje model gry i migracje, reguły promocji, API, odizolowany zestaw plików aplikacji po filtrze `.dockerignore`, konfigurację, deterministyczny publiczny pakiet oraz testy Chromium z tego pakietu. Kontrola pakowania uruchamia serwer z plików, które faktycznie trafią do obrazu, i sprawdza sondy bez dostępu do chmury. Scenariusze testowe tworzą izolowane fikstury tylko w lokalnym odbiorze pakietu; nie zastępują wysp stałych kont chmurowych.

Lista publicznych plików jest jawna. Archiwum nie zawiera repozytorium Git, dokumentacji, sekretów ani historycznych gier. `release.json` wiąże pełny SHA z hashami i rozmiarami zawartości. Hash manifestu i archiwum są osobnymi dowodami.

### Niezmienny dowód odbioru DEV

Podgląd po poprawkach v22 ma cache `frontend-v22-1` i otrzymuje adnotowany tag **`dev-v22.1-20261031`** dopiero po potwierdzeniu sukcesu CI i Pages. Tag wskazuje dokładny commit aplikacji, a jego adnotacja zawiera pełny SHA, numery przebiegów, wynik lokalnej regresji, hashe pakietu oraz oddzielne stany PRE-PROD/resetu/PROD. Brak tagu lub brak sukcesu wskazanego CI oznacza, że odbiór nie został potwierdzony.

```sh
git fetch origin tag dev-v22.1-20261031
git show --no-patch dev-v22.1-20261031
```

Tag nie jest przesuwany i nie uruchamia publikacji GCP. Pozwala zapisać wynik już zakończonego CI w samym Git, bez zmiany sprawdzonego commitu aplikacji. Przy późniejszym kodzie powstaje nowy dowód; historyczny tag nie zastępuje wymaganego CI dokładnego SHA promowanego przez workflow. Bieżące rozróżnienie środowisk pozostaje w [ENVIRONMENT-STATUS.md](ENVIRONMENT-STATUS.md).

## 2. Promocja na PRE-PROD

### Autoryzowana pilna poprawka 0.9.1.2

Użytkownik jawnie zlecił promocję natychmiast po sukcesie DEV/CI. Dla tej konkretnej wersji [bridge](../.github/workflows/promote-urgent-preprod.yml) reaguje na ukończenie właściwego CI i tylko marker `[preprod:0.9.1.2]` w źródłowym commicie. Ma `contents:read` i `actions:write`, bez OIDC. Uruchamia przez API istniejący ręczny workflow poniżej; nie wykonuje deployu sam i nie zmienia blokad WIF/CI. Ponownie sprawdza repozytorium, workflow, próbę CI, SHA, dotychczasowe deploye i bieżący main. Inne poprawki nie są automatycznie promowane tym mechanizmem.

Do potwierdzenia źródła rozpoczętej promocji nie przesuwamy main: API `workflow_dispatch ref=main` nie obsługuje atomowego warunku oczekiwanego SHA. Nie ponawiamy niepewnego POST; najpierw odczytujemy faktyczny przebieg i jego SHA. Tag rejestru `pilne` oraz adnotowany tag Git `urgent-0.9.1.2-20261031` służą oznaczeniu poprawki i dowodom, a nie zastępują odbioru GCP. Ten wyjątek dotyczy zleconego PRE-PROD, nie PROD ani resetu danych.

[Techniczny workflow DEV](../.github/workflows/google-cloud-dev.yml) uruchamia się ręcznie z `main` po zielonym CI **tego samego pełnego SHA**. Kontrola bez poświadczeń Google blokuje brak dowodu przed dostępem do WIF.

Workflow buduje backend raz, uruchamia dokładnie ten obraz w lokalnym kontenerze z odłączoną siecią i wyłączonym API kont, a po sukcesie wdraża przez niezmienny `image@sha256` i publikuje deterministyczny frontend do `harborlight-dev`. Lokalny start odbywa się przed pobraniem poświadczeń Google i sprawdza `/health`, `/ready` oraz wyłączenie dostępu do kont. Publiczne `/health` i `/ready` muszą następnie potwierdzić właściwe środowisko techniczne i wydanie; aliasy `*z` nie są publicznym dowodem Cloud Run.

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

### Osobny reset kont po promocji v22

GO z 31 października 2026 zleca rozpoczęcie od zera wszystkich trzech kont PRE-PROD: **`admin1`, `admin2`, `admin3`**, dopiero po sukcesie promocji i jej odbioru. To jawny wyjątek od wcześniejszego zachowania historii `admin1`, ograniczony do tej operacji. Nie uruchamiamy resetu jako skutku pushu, lokalnego testu ani przed weryfikacją opublikowanego wydania.

Narzędzie właściciela i pełny kontrakt: [PREPROD-RESET.md](PREPROD-RESET.md). Domyślny odczyt planu:

```sh
python3 infra/google-cloud/reset-preprod-accounts.py \
  --deployment-run-id RUN \
  --commit PEŁNY_SHA \
  --receipt-archive /prywatna/sciezka/harborlight-dev-release-RUN-ATTEMPT.zip
```

`RUN`, numer próby i pełny SHA pochodzą z udanej nowej promocji, nie z historycznego v18. Prywatny ZIP potwierdzenia wydania jest porównywany z digestem artefaktu GitHub. Mutację włącza osobne `--apply` po przejściu kontroli narzędzia: właściwy projekt, zielony workflow i CI tego samego SHA, aktualny manifest Hostingu, aktywne API kont oraz reguły Firestore blokujące stare bezpośrednie zapisy. Brak któregokolwiek dowodu blokuje reset. Jeżeli trzeba opublikować reguły API-only, jawne `--apply --lock-client-writes` najpierw zakłada blokadę i kopię; reset danych jest możliwy po co najmniej 10 minutach propagacji i ponownym uruchomieniu tej samej komendy. Szczegóły potwierdza instrukcja narzędzia.

Authentication, UID, loginy, hasła i potwierdzenia dokumentów zostają zachowane. Postęp testowych wysp i rozliczenia objęte resetem rozpoczynają się od zera, a nowa generacja zapisu blokuje przywrócenie poprzedniego świata przez stary klient. Prywatna kopia przed resetem pozostaje poza repozytorium. Narzędzie musi potwierdzić wynik odczytem; samo powodzenie deployu nie potwierdza resetu.

Po przejściu na API-only jawny tryb `check-dev-accounts.mjs --passwords-match-logins --account-api` sprawdza wyspy przez uwierzytelnione `/api/v1/island`, niezależnie kontrolując odmowę obcych i anonimowych bezpośrednich odczytów Firestore. Odczyt własnego dokumentu może być jeszcze dozwolony przed pierwszym resetem; po blokadzie ma zwracać 403. Workflow dobiera tryb z `HARBORLIGHT_ACCOUNT_API_ENABLED`. Nie wracamy do starych reguł wyłącznie po to, aby kontrola odczytowa przeszła.

W [rejestrze](ENVIRONMENT-STATUS.md) zapisujemy osobno sukces promocji oraz wynik resetu wszystkich trzech kont. Do tego czasu status resetu pozostaje „zlecony, niewykonany”. Operacja nie obejmuje PROD ani innych kont; zwykłe odczytowe testy wdrożenia nadal nie nadpisują historii.

## 3. Promocja na PROD

[Workflow PROD](../.github/workflows/google-cloud-prod.yml) otrzymuje `dev_run_id` udanego PRE-PROD. Nie zastępuje jego SHA najnowszym `main` i nie buduje gry ponownie.

Osobny job bez prawa OIDC sprawdza repozytorium/numeryczne ID, gałąź, właściwy workflow, sukces CI/PRE-PROD, SHA i numery prób, a także po jednym ważnym artefakcie obu rodzajów. Potwierdzenia API-only v1 są odrzucane.

Weryfikacja archiwum kończy się przed rozpakowaniem i dostępem do poświadczeń: odrzucane są obce ścieżki, linki, brakujące pliki, przekroczone limity i zmienione bajty. PROD kopiuje ten sam obraz backendu i porównuje digest, a Hosting otrzymuje identyczny pakiet z PRE-PROD. Odbiór manifestu odnosi się do SHA wybranego wydania, również gdy `main` zawiera już nowszy kod.

Konta admin1–3 i ich testowe reguły nie są kontami PROD. Produkcyjna aktywacja API, tożsamości i danych ma własny odbiór; test anonimowej strony ani sukces starego konta PRE-PROD nie potwierdza nowej konfiguracji produkcyjnej.

Przed pierwszą mutacją PROD workflow wymaga włączonej konfiguracji API oraz środowiskowych sekretów `HARBORLIGHT_PROD_SMOKE_EMAIL` i `HARBORLIGHT_PROD_SMOKE_PASSWORD` rzeczywistego konta wskazanego przez właściciela. Nie kopiujemy haseł PRE-PROD. Odbiór nie tworzy wyspy za gracza; brak istniejącego świata nie jest sukcesem testu. Szczegóły konfiguracji i pierwszego wejścia opisuje instrukcja runtime.

Domena docelowa to **https://harborlight.pl**. Powiązanie, DNS nazwa.pl, własność i certyfikat są osobnym warunkiem. Rekordy odczytujemy z rzeczywistej odpowiedzi Firebase, nie zgadujemy i nie traktujemy przygotowania domeny jako publikacji gry.

## 4. Konta, API i dostawcy

PRE-PROD zachowuje istniejące Authentication/Firestore i UID `dev-admin1`–`dev-admin3`. Zwykła publikacja nie resetuje haseł, zapisów ani pakietów startowych. Osobno zlecony reset v22 po zweryfikowanej promocji ma procedurę opisaną wyżej i nie zmienia tożsamości ani haseł. Kontrola przygotowania zasobów i rzeczywisty odbiór opublikowanej gry to osobne wyniki.

v18 zapisuje postęp wyłącznie w chmurze. Lokalny DEV może być nietrwałym podglądem, lecz nie daje lokalnego konta ani kopii odzyskiwania. Dane Firebase pochodzą z konfiguracji runtime; promocja nie podmienia bajtów archiwum na inne środowisko.

Jawna zmienna środowiska GitHub `HARBORLIGHT_ACCOUNT_API_ENABLED=true` włącza właściwy projekt API. Tymczasowa konfiguracja Hostingu kieruje `/api/**` do odpowiedniej usługi Cloud Run, bez zmiany publicznych bajtów archiwum. Klient PRE-PROD musi rozpoznać aktywny tryb API i przejść jego rzeczywisty odbiór przed przeniesieniem tej konfiguracji na PROD; nie wystarcza anonimowy `401` albo samo istnienie kodu adaptera.

Kod API kont, limitów kodów i retencji wymaga właścicielskiej aktywacji: [RUNTIME-ACCOUNTS.md](RUNTIME-ACCOUNTS.md). Domyślnie wyłączone API ma odmawiać działania; brak konfiguracji nie może uruchomić produkcyjnej symulacji. IAM, routing, reguły bazy i migracja wymagają przygotowania oraz testów przed użyciem. Gospodarka nadal jest obliczana przez klienta, a serwer sond/kont nie jest pełnym autorytatywnym silnikiem gry.

OAuth Google/Facebook wymaga konfiguracji dostawcy i domen; prawdziwe Paynow/reklamy — usług operatora i zaufanych potwierdzeń. Symulacje dozwolone tylko poza PROD. Nie nadajemy szerokich ról ani nie zapisujemy sekretów w repozytorium w celu obejścia błędu. Retencja nie ma publicznego endpointu kasowania; narzędzie właściciela domyślnie działa w dry-run i wymaga osobnego jawnego włączenia mutacji.

## 5. Bieżące i historyczne potwierdzenia

Bieżące PRE-PROD to **0.9.1.2 / `3be1f9d2094f1432acacbb782eed1665fd00e6e1`**: CI `41233382228`, Pages `41233382382`, bridge `41233723831` i promocja `41233737873`, próba 1 — **SUCCESS**. Tag `urgent-0.9.1.2-20261031` jest opublikowany. Gra: https://harborlight-dev.web.app. Oba artefakty v2, digests i granice odbioru podaje [rejestr środowisk](ENVIRONMENT-STATUS.md). Konta i postęp zachowane, PROD bez promocji. Pierwszy nieudany przebieg `41232457485` pozostaje historycznym FAILURE.

### Historia v22.1

Historyczne potwierdzone wydanie **GCP PRE-PROD** to **v22.1 / `092e75226fbb14cab09826f313e11d10891966d8`**. [CI 41221965032](https://github.com/ksobczak321-oss/gra/actions/runs/41221965032), [Pages 41221964974](https://github.com/ksobczak321-oss/gra/actions/runs/41221964974) i ręczna [promocja 41222765705, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41222765705) mają SUCCESS. Promocja trwała 2 min 10 s; gra jest pod `https://harborlight-dev.web.app`. Adnotowany tag `dev-v22.1-20261031` potwierdza odrębny odbiór DEV.

Zachowano parę artefaktów v2 `harborlight-dev-frontend-41222765705-1` i `harborlight-dev-release-41222765705-1`. Publiczne hashe ZIP oraz granice odbioru są w [rejestrze](ENVIRONMENT-STATUS.md). Zawartość ZIP potwierdzenia wydania, digest backendu i faktyczna flaga API kont nie zostały tutaj odczytane. Sukces workflow potwierdza jego wymagane kontrole w trybie zgodnym z konfiguracją, lecz nie dowodzi nam, że API jest włączone. Narzędzia resetu i PROD muszą samodzielnie zweryfikować artefakty i rzeczywistą konfigurację.

**Reset admin1–admin3 nadal niewykonany.** Jest osobnym etapem z sesji właściciela GCP po kontroli potwierdzenia i API, według [PREPROD-RESET.md](PREPROD-RESET.md). Wysp ani haseł nie zerowano w zwykłym deployu. PROD i DNS nie były promowane.

Historyczne v18 / `6ec3c6d8625420fd96474a22a8b1d699672416cd`, [CI 41111528800](https://github.com/ksobczak321-oss/gra/actions/runs/41111528800) i [promocja 41112673285](https://github.com/ksobczak321-oss/gra/actions/runs/41112673285) z 30 października pozostają w [historii rejestru](ENVIRONMENT-STATUS.md#historia-wcześniejszych-wydań) oraz dzienniku wraz z parą wcześniejszych artefaktów. Nie są bieżącym wdrożeniem.

## 6. Wycofanie

Można ponownie promować wcześniejsze pełne wydanie z ważnym potwierdzeniem i dostępną parą artefaktów. Nie podmieniamy zawartości między środowiskami. Powrót aplikacji nie cofa automatycznie migracji danych, zakupów ani retencji — te operacje wymagają własnej zgodności wersji i sprawdzonego odtworzenia.
