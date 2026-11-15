# HARBORLIGHT 0.15.0.0 — DEV

Gałąź: `dev/0.15.0.0`. Punkt wyjścia: odebrane PRE-PROD `7e81a1a436770f57fd8abf390b6af8022e3300f6` / 0.14.0.0. Użytkownik potwierdził wdrożenie całego uzgodnionego zakresu z obecną redakcją; teksty będą poprawiane później na DEV.

## Publiczny link roboczy

[Otwórz podgląd DEV 0.15.0.0](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v32-3). To ten sam hosting GitHub Pages, który był używany w poprzedniej rozmowie. Bieżące własne wykonanie Pages i odczyt hostowanych bajtów muszą potwierdzić nową wersję; dawny link z parametrem v31 nie jest dowodem wdrożenia v32.

Podgląd jest bez konta, a postęp istnieje tylko w pamięci otwartej karty. Odświeżenie zaczyna nowy podgląd. Pełne trzy konta z zapisem, handel między kontami i pozostałe współdzielone usługi działają na lokalnym serwerze DEV opisanym poniżej. Nie podłączono go publicznie do Pages ani do Firebase PRE-PROD.

## Uruchomienie

W katalogu projektu: `node scripts/serve-dev.mjs` (Node24). Adres: `http://localhost:3000/harborlight-auth.html`. Lokalne pary login/hasło: `admin1/admin1`, `admin2/admin2`, `admin3/admin3`. Zapis jest trwały w `/workspace/work/dev-runtime/state-v32.json`; kolejne uruchomienie nie tworzy kont od nowa. Zmiana portu przez `PORT`.

DEV to lokalne środowisko robocze, projekt `harborlight-local-dev`. Publikacja roboczego podglądu Pages jest dopuszczona poleceniem z15listopada2026. Nie wykonano promocji PRE-PROD/PROD, resetu Firebase ani zmiany chmurowych loginów i haseł. PRE-PROD już przyjmuje pary admin1/admin1, admin2/admin2, admin3/admin3; potwierdzono3/3 przez samo Authentication, bez otwierania gry. Konta lokalne są osobnymi kontami testowymi. Admin3 ma izolowane przyspieszanie własnej symulacji. Wspólne zobowiązania Królestwa i dary korzystają z zegara serwera.

## Zakres

Zintegrowane z rzeczywistą grą: siedem nowych budynków, produkcja i fizyczne dostawy wielu produktów, sytość i dieta, mleko i ubrania, zmienione limity populacji/mieszkań i budowy, Akademia i badania, Koszary i wyprawy, Królestwo/finanse/sojusze, portfel archipelagu, przewóz osób i dary, ratunek cywilów, Teatr i dekoracje, tutorial48 oraz25 praktycznych lekcji, samodzielne minigry i przygody. Nowy samouczek przeszedł pełne25 lekcji oraz pierwsze misje bez tworzenia dawnej ogólnej żywności; nagrody bazowe są dostosowane do nowych produktów. Nowe plansze i oprawa są autorskie. Po przeglądzie użytkownika poprawiono też wyrównanie, formularze, układ telefonu i ilustracje budynków; szczegóły w [VISUAL-REVIEW.md](VISUAL-REVIEW.md).

Pełna mapa wymagań i dowodów: [IMPLEMENTATION-AUDIT.md](IMPLEMENTATION-AUDIT.md). Sieć wzmacniana skórą oraz przyszłe nieopisane wypieki pozostają odłożone zgodnie z odpowiedzią13; nie wymyślono ich kosztów i skutków.

## Zapis i weryfikacja

Zapis zachowuje ułamki jadalnych zapasów oraz skumulowany czas mleka w centralach. Dieta ma odtwarzalne przedziały i współdzielone dane w zapisie, bez odradzania strojów. Duże przygody i ich księgi mają ograniczony, sprawdzany sumą kontrolną zapis LZW; uszkodzenie jest odrzucane zamiast resetowania postępu. Odtwarzalny cache powiadomień efektów nie zajmuje dokumentu. Faktyczne powiadomienia i ich odczytanie zostają zachowane.

Potwierdzone przepływy: rejestracja lokalnych fixtures/logowanie/reload trzech kont, CAS i wyścigi kupujących, współdzielone zadania, dary, zapis oraz restart czasu admin3 bez zmiany admin1, desktop1440/mobile390, realne dotknięcie i klawiatura minigier, zachowanie aktywnej próby przy żywym potwierdzeniu serwera oraz przegrana po rzeczywistym wyjściu/odświeżeniu. Dokumenty o limitach zapisu obejmują3600 mieszkańców i100 przygód z435 ukończonymi pokojami oraz300 przygód na trzech wyspach.

Testy jednostkowe i integracyjne: `node --test --test-concurrency=4 --test-skip-pattern='96-hour offline full-storage' tests/*.test.mjs`. Test z niezmienionym limitem10s wykonuje się osobno bez równoległego Chromium: `node --test --test-name-pattern='96-hour offline full-storage' tests/harborlight-agreed-state.test.mjs`. Backend: `node --test --test-concurrency=2 backend/test/*.test.mjs`. Scenariusze przeglądarkowe: `tests/harborlight-v32-ui-smoke.py`, `tests/harborlight-v32-live-cas-smoke.py`, `tests/harborlight-original-puzzles-v32-smoke.py` oraz dotychczasowe przygody v31.

Scenariusze zasilane zasobami testowymi i przyspieszony zegar nie są50 dniami ręcznego odbioru ani150 godzinami gry. Szczegóły balansu i jego granice: [DEV-BALANCE.md](DEV-BALANCE.md). Współczynniki oznaczone jako propozycje DEV, w tym progi odpowiedzi30, wymagają oceny przed PRE-PROD. Reguły umorzenia i pełnych nagród sojuszu zachowano; analiza pokazuje ich wpływ na podaż monet.

Excel do dalszej redakcji: `/workspace/output/HARBORLIGHT_teksty_DEV_ABC.xlsx`. Wyłącznie A: opis/kontekst, B: obecny tekst, C: poprawka użytkownika. C jest całkowicie pusta; puste C oznacza przyjęcie B.

## Weryfikacja dostępu 15 listopada 2026

Zmiana lokalnych haseł:46/46 ukierunkowanych testów runtime/cloud PASS oraz faktyczne logowanie wszystkich trzech kont w Chromium390 PASS, bez błędów JavaScript. Poprzednie wspólne hasło i hasła pozostałych kont są odrzucane. Nie resetowano wysp. Odczyt repozytorium i żywego PRE-PROD potwierdza tę samą bazę7e81a1a. Kod korzysta z dotychczasowych modułów i wzorców stanu, ale lokalny runtime zastępuje Firebase i nie jest klonem infrastruktury Google Cloud1:1.
