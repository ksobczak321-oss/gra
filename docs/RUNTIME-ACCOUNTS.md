# Uruchomienie API kont w Google Cloud

Kod API kont, wersjonowania wysp, kodów promocyjnych i wygaszania świata jest przygotowany. Samo wdrożenie obrazu nie włącza dostępu do bazy. Domyślna flaga pozostaje wyłączona; API zwraca wtedy `503 account_api_disabled`, a aplikacja nie tworzy awaryjnej lokalnej wyspy.

## Środowiska i konfiguracja

DEV oznacza pracę lokalną. Techniczny projekt PRE-PROD nadal ma ID `harborlight-dev`, usługę `harborlight-api-dev` i region `europe-central2`. PROD używa `harborlight-prod` / `harborlight-api-prod` w tym samym regionie. Nie zmieniamy identyfikatorów WIF ani nazw istniejących workflow.

`runtime-config.py` generuje wyłącznie niesekretne zmienne wdrożenia. Zawsze wiąże środowisko i pełny SHA wydania. Dopiero jawna wartość `HARBORLIGHT_ACCOUNT_API_ENABLED=true` w odpowiednim środowisku GitHub dodaje:

```text
HARBORLIGHT_ACCOUNT_API=1
HARBORLIGHT_PROJECT_ID=<właściwy projekt>
```

Przy wyłączeniu zmienne te nie są dodawane. `gcloud --env-vars-file` zastępuje zestaw zmiennych, więc poprzednia aktywacja nie pozostaje przypadkowo po przełączeniu na `false`.

`hosting-config.py` tworzy osobny tymczasowy plik wdrożenia z przekierowaniem `/api/**` do właściwej usługi Cloud Run. Używa jawnej witryny Firebase i bezwzględnej ścieżki zweryfikowanego pakietu. Nie zmienia plików publicznych, manifestu ani archiwum promowanego PRE-PROD → PROD i nie dodaje awaryjnego przekierowania SPA.

## Czynności właścicielskie przed włączeniem

Właściciel, w zalogowanej konsoli Google Cloud, sprawdza:

1. Firebase Authentication i aplikację internetową w istniejącym, właściwym projekcie; dostawcy opisani są w [ACCOUNT-PROVIDERS.md](ACCOUNT-PROVIDERS.md).
2. Bazę Firestore Native `(default)` we właściwym projekcie i jej uzgodnioną lokalizację. Nie tworzyć drugiej bazy lub projektu w celu obejścia błędu konfiguracji.
3. Tożsamość uruchomieniową Cloud Run: `harborlight-runtime@<projekt>.iam.gserviceaccount.com`. API korzysta z ADC serwisu, a nie z pliku klucza w repozytorium.
4. Uprawnienie odczytu i zapisu Firestore dla tej tożsamości, np. projektowe `roles/datastore.user`, w zakresie projektu gry. Nie nadawać ról administratora rozliczeń ani właściciela.
5. Aktywność wymaganych API Google i poprawne role deployera przygotowane wcześniejszym bootstrapem.
6. Jawne włączenie `HARBORLIGHT_ACCOUNT_API_ENABLED=true` w środowisku GitHub i wykonanie ręcznego workflow PRE-PROD po sukcesie CI tego samego commitu.

Tych operacji nie wykonano przez sam zapis powyższych instrukcji. Nie przesyłać tokenów, haseł Google ani sekretów Meta w czacie.

## Odbiór i promocja

CI uruchamia kolejno testy modelu, backendu, konfiguracji, całego pakietu v18 w lokalnym Chromium oraz formularzy kont z izolowanymi odpowiedziami. Test lokalny korzysta z tych samych publicznych bajtów pakietu; nie udaje kont Google ani publikacji na żywym hostingu.

Ręczny odbiór hostingu sprawdza:

- tożsamość każdego opublikowanego pliku względem zweryfikowanego manifestu;
- anonimowe przekierowanie gry do prawdziwego formularza logowania;
- właściwy projekt Firebase i przekierowanie API: `503` przy fladze wyłączonej, `401` bez tokenu przy włączonej;
- rzeczywiste zalogowanie i renderowanie już istniejącej wyspy. Browser blokuje zapisy wyspy i aktywności; odbiór nie przyznaje nagród, nie ulepsza, nie tworzy ani nie resetuje świata.

PRE-PROD używa istniejącego konta spośród `admin1`–`admin3`, którego wyspa już istnieje. Jeśli żadne konto jeszcze nie weszło do gry, odbiór kończy się błędem; nie inicjalizuje wyspy za właściciela. Kontrola izolacji trzech kont pozostaje oddzielnym krokiem tylko do odczytu.

PROD przed pierwszą operacją wdrożenia wymaga włączonej flagi API oraz sekretów środowiska `google-cloud-prod`:

- `HARBORLIGHT_PROD_SMOKE_EMAIL`
- `HARBORLIGHT_PROD_SMOKE_PASSWORD`

Są to dane rzeczywistego konta wybranego przez właściciela do odbioru. Nie kopiujemy kont PRE-PROD ani ich haseł na PROD. Sekrety wprowadza właściciel bezpośrednio w GitHubie; test nie drukuje ich ani tokenów. Brak konfiguracji zatrzymuje promocję przed wdrożeniem.

Przy pierwszym odbiorze konto może istnieć jeszcze bez wyspy. Test nie tworzy jej automatycznie: właściciel musi rzeczywiście wejść do opublikowanej gry i rozpocząć własną wyspę, a następnie ponowić odbiór. Do tego momentu nie ogłaszamy zakończonego odbioru PROD.

Włączenie API na PROD wymaga wcześniejszego sprawdzenia tej ścieżki na PRE-PROD. Sam sukces sond HTTP lub odebranie anonimowego `401` nie potwierdza transakcyjnego zapisu w bazie.

## Wygaszanie i kody

PROD wiąże zapis z UID, wersją oraz generacją wyspy. Po trzech miesiącach kalendarzowych bez rzeczywistej gry generacja się zmienia, więc stara karta nie może przywrócić usuniętego stanu. Konto, płatności, wykorzystane promocje i historia jednorazowych nagród pozostają. PRE-PROD jest wyłączone z automatycznej retencji.

Odczyt wykrywa wygasłą wyspę także bez okresowego pracownika. Masowe sprzątanie wymaga osobno skonfigurowanego uruchomienia narzędzia retencji; nie utworzono automatycznie Cloud Scheduler ani nowego płatnego zasobu. Zakres usuwania i częstotliwość należy odróżniać od samego wdrożenia API.

Kod promocyjny jest przyznawany w transakcji z limitem globalnym i zapisem wykorzystania na konto. Kod wymagający niepodłączonego potwierdzenia polubienia Facebooka jest odrzucany, zamiast otrzymywać fikcyjne potwierdzenie.
