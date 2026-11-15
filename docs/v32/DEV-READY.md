# HARBORLIGHT 0.15.0.0 — DEV

Gałąź: `dev/0.15.0.0`. Punkt wyjścia: odebrane PRE-PROD `7e81a1a436770f57fd8abf390b6af8022e3300f6` / 0.14.0.0. Użytkownik potwierdził wdrożenie całego uzgodnionego zakresu z obecną redakcją; teksty będą poprawiane później na DEV.

## Opublikowany pełny pakiet GO — cache5

[Nowy link DEV](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v32-5) jest opublikowany. Źródło aplikacji `e59726a81d84cf8ddd04e3f45072fdd00d688a63`, commit publikacji `2dd923da9b830b755d490aceef3a446472795e33`, [Pages43720459381](https://github.com/ksobczak321-oss/gra/actions/runs/43720459381) SUCCESS. Odczyt dziewięciu plików przez HTTPS potwierdził dokładne SHA256 nowego kodu i niezmienionej planszy. Faktycznie hostowane bajty uruchomiono w Chromium1440/390:18/36 osób,7 nowych budynków, polskie wprowadzenie, bez błędów JS/HTTP, żądań API i zapisu gry w przeglądarce. Transport z zachowaną weryfikacją TLS opisano w [dowodach](GO-PREVIEW-EVIDENCE.json).

Excel DEV ma teraz5622wiersze/17arkuszy i dokładnie3kolumny; C pozostaje całkiem pusta. Archiwum100plików zweryfikowano i rozpakowano. Ta późniejsza aktualizacja dowodów nie zmienia plików aplikacji; pełny własny CI końcowego commitu wymaga odrębnego sukcesu. Pages jest podglądem bez kont i trwałego postępu; admin1 na lokalnym runtime ma Ratusz5, a PRE-PROD pozostaje7e81a1a.

## Publiczny link roboczy

[Otwórz podgląd DEV 0.15.0.0](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v32-5). To ten sam hosting GitHub Pages, który był używany w poprzedniej rozmowie. Bieżące własne wykonanie Pages i odczyt hostowanych bajtów muszą potwierdzić nową wersję; dawny link z parametrem v31 nie jest dowodem wdrożenia v32.

Podgląd jest bez konta, a postęp istnieje tylko w pamięci otwartej karty. Odświeżenie zaczyna nowy podgląd. Pełne trzy konta z zapisem, handel między kontami i pozostałe współdzielone usługi działają na lokalnym serwerze DEV opisanym poniżej. Nie podłączono go publicznie do Pages ani do Firebase PRE-PROD.

## Uruchomienie

W katalogu projektu: `node scripts/serve-dev.mjs` (Node24). Adres: `http://localhost:3000/harborlight-auth.html`. Lokalne pary login/hasło: `admin1/admin1`, `admin2/admin2`, `admin3/admin3`. Zapis jest trwały w `/workspace/work/dev-runtime/state-v32.json`; kolejne uruchomienie nie tworzy kont od nowa. Zmiana portu przez `PORT`.

DEV to lokalne środowisko robocze, projekt `harborlight-local-dev`. Publikacja roboczego podglądu Pages jest dopuszczona poleceniem z15listopada2026. Nie wykonano promocji PRE-PROD/PROD, resetu Firebase ani zmiany chmurowych loginów i haseł. PRE-PROD już przyjmuje pary admin1/admin1, admin2/admin2, admin3/admin3; potwierdzono3/3 przez samo Authentication, bez otwierania gry. Konta lokalne są osobnymi kontami testowymi. Admin3 ma izolowane przyspieszanie własnej symulacji. Wspólne zobowiązania Królestwa i dary korzystają z zegara serwera.

## Zakres

Zintegrowane z rzeczywistą grą: siedem nowych budynków, produkcja i fizyczne dostawy wielu produktów, sytość i dieta, mleko i ubrania, zmienione limity populacji/mieszkań i budowy, Akademia i badania, Koszary i wyprawy, Królestwo/finanse/sojusze, portfel archipelagu, przewóz osób i dary, ratunek cywilów, Teatr i dekoracje, tutorial56 oraz25 praktycznych lekcji, samodzielne minigry i przygody. Nowy samouczek przeszedł pełne25 lekcji oraz pierwsze misje bez tworzenia dawnej ogólnej żywności; nagrody bazowe są dostosowane do nowych produktów. Nowe plansze i oprawa są autorskie. Po przeglądzie użytkownika poprawiono też wyrównanie, formularze, układ telefonu i ilustracje budynków; szczegóły w [VISUAL-REVIEW.md](VISUAL-REVIEW.md).

Pełna mapa wymagań i dowodów: [IMPLEMENTATION-AUDIT.md](IMPLEMENTATION-AUDIT.md). Sieć wzmacniana skórą oraz przyszłe nieopisane wypieki pozostają odłożone zgodnie z odpowiedzią13; nie wymyślono ich kosztów i skutków.

## Zapis i weryfikacja

Zapis zachowuje ułamki jadalnych zapasów oraz skumulowany czas mleka w centralach. Dieta ma odtwarzalne przedziały i współdzielone dane w zapisie, bez odradzania strojów. Duże przygody i ich księgi mają ograniczony, sprawdzany sumą kontrolną zapis LZW; uszkodzenie jest odrzucane zamiast resetowania postępu. Odtwarzalny cache powiadomień efektów nie zajmuje dokumentu. Faktyczne powiadomienia i ich odczytanie zostają zachowane.

Potwierdzone przepływy: rejestracja lokalnych fixtures/logowanie/reload trzech kont, CAS i wyścigi kupujących, współdzielone zadania, dary, zapis oraz restart czasu admin3 bez zmiany admin1, desktop1440/mobile390, realne dotknięcie i klawiatura minigier, zachowanie aktywnej próby przy żywym potwierdzeniu serwera oraz przegrana po rzeczywistym wyjściu/odświeżeniu. Dokumenty o limitach zapisu obejmują3600 mieszkańców i100 przygód z435 ukończonymi pokojami oraz300 przygód na trzech wyspach.

Testy jednostkowe i integracyjne: `node --test --test-concurrency=1 --test-isolation=none --test-skip-pattern='96-hour offline full-storage' tests/*.test.mjs`. Test z niezmienionym limitem10s wykonuje się osobno bez równoległego Chromium: `node --test --test-name-pattern='96-hour offline full-storage' tests/harborlight-agreed-state.test.mjs`. Backend: `node --test --test-concurrency=2 backend/test/*.test.mjs`. Scenariusze przeglądarkowe: `tests/harborlight-v32-ui-smoke.py`, `tests/harborlight-v32-live-cas-smoke.py`, `tests/harborlight-original-puzzles-v32-smoke.py` oraz dotychczasowe przygody v31.

Scenariusze zasilane zasobami testowymi i przyspieszony zegar nie są50 dniami ręcznego odbioru ani150 godzinami gry. Szczegóły balansu i jego granice: [DEV-BALANCE.md](DEV-BALANCE.md). Współczynniki oznaczone jako propozycje DEV, w tym progi odpowiedzi30, wymagają oceny przed PRE-PROD. Reguły umorzenia i pełnych nagród sojuszu zachowano; analiza pokazuje ich wpływ na podaż monet.

Excel do dalszej redakcji: `/workspace/output/HARBORLIGHT_teksty_DEV_ABC.xlsx`. Wyłącznie A: opis/kontekst, B: obecny tekst, C: poprawka użytkownika. C jest całkowicie pusta; puste C oznacza przyjęcie B.

## Weryfikacja dostępu 15 listopada 2026

Zmiana lokalnych haseł:46/46 ukierunkowanych testów runtime/cloud PASS oraz faktyczne logowanie wszystkich trzech kont w Chromium390 PASS, bez błędów JavaScript. Poprzednie wspólne hasło i hasła pozostałych kont są odrzucane. Nie resetowano wysp. Odczyt repozytorium i żywego PRE-PROD potwierdza tę samą bazę7e81a1a. Kod korzysta z dotychczasowych modułów i wzorców stanu, ale lokalny runtime zastępuje Firebase i nie jest klonem infrastruktury Google Cloud1:1.

## Publikacja roboczego DEV — 15 listopada 2026

Źródło aplikacji `990dd60137afeb50813a9655c22f8ee6232de11d`, cache `frontend-v32-3`. [Pages43698899831](https://github.com/ksobczak321-oss/gra/actions/runs/43698899831) zakończone SUCCESS. Sześć kluczowych opublikowanych plików (HTML, play, auth, wersja, zapis i atlas budynków) ma dokładnie te same SHA256 co źródło. Hostowane bajty pobrane z weryfikacją TLS przez systemowy klient HTTPS wykonano w Chromium1440/390:18/36,7nowychbudynków,PLwprowadzenie,zeroJS/HTTPbłędów,zeroAPIizapisówgrywprzeglądarce. Transport opisano jawnie w [dowodach JSON](PREVIEW-EVIDENCE.json).

Pełny lokalny zestaw1372Node i134backend PASS. Pierwszy własny CI43698899840 przeszedł model i backend, lecz zatrzymał się na próbie walidacji historycznego Excela14 przeciw nowym modułom0.15. Poprawka zachowuje wszystkie asercje i sprawdza go przeciw oryginalnemu7e81a1a; nowy [Excel15 — teksty DEV](../arkusze/HARBORLIGHT15-teksty-DEV.xlsx) ma osobną kontrolę5595wierszy,17arkuszy,3kolumn i pustejC oraz odcisków rzeczywistych źródeł. Nowy CI tej poprawki pozostaje osobnym wynikiem.

Ściągawka odbioru: [lista zmian do sprawdzenia](TEST-CHEATSHEET.md) oraz [klikalna lista w przeglądarce](https://ksobczak321-oss.github.io/gra/docs/testing/dev-v32-checklist.html). Żaden checkbox nie jest automatycznie oznaczony jako ręczny PASS.

## Korekta planszy po odbiorze użytkownika

15listopada2026 zastąpiono dodane ilustracje funkcjami przypisanymi do istniejących budynków zgodnie z oznaczeniamiM/P/R/A/K. Teatr przeniesiono do dawnego Targu, a Targ na pasiasty stragan obok. Budynek nad Teatrem pozostał Piekarnią; dawnyTeatr spodKamieniołomu usunięto. Stałe nazwy i poziomy z planszy usunięto — są dostępne po najechaniu/fokusie. BazowePNGnie zmienione. Native-map1440/390:po9realnychkliknięćPASS,bezJSerrors; szczegóły w [przeglądzie](VISUAL-REVIEW.md). Poprawkę cache4 opublikowano ze źródła `fc2e87eec57c0388a16fb9b15a7d80ea0bc9c67c`: CI43703967814 i Pages43703967803 SUCCESS. Wyniki cache3 pozostają historią wcześniejszej paczki.


## Pełne GO po odbiorze menu — cache5

Bieżąca paczka obejmuje ciemne panele i zgodne ramki, informację o progu odblokowania, Teatr z „Wyślij wszystkich” i wyborem według zajęcia, oprowadzanie V5/56 z Teatrem i pięcioma dolnymi zakładkami, „Ubrani”, ramkę niezadowolonej buźki oraz trzy początkowo zamknięte sekcje Magazynu. Poprawiono szerokości kart w kolumnach i ciemne sekcje produkcji także w starych budynkach. Wspólną pojemność liczy się z koszyka potrzeb +40%, zaokrąglając w dół do pełnych 10 000: bazowo 40 000 na poziomie 1. Stare zapasy ponad limit nie są usuwane. [Pełna kolejność](CURRENT-TUTORIAL-ORDER.md), [wzór i tabela](DEV-BALANCE.md).

Lokalne admin1 ma ręcznie ustawiony Ratusz 5 bez resetu dotychczasowych osób i zasobów; standardowe odblokowania dodały pierwszych specjalistów. Odczyt API po operacji: admin1=5, admin2=1, admin3=1. Dotyczy to wyłącznie serwera lokalnego DEV, a publiczny Pages pozostaje podglądem bez kont.

Nowe testy Chromium dla 56 podświetleń, Teatru ze 100 widzami, trzech sekcji Magazynu oraz blokad budynków przeszły na 1440/390. Testy Node potwierdzają migrację oprowadzania i limit 40 000 z zachowaniem starych nadmiarowych zapasów. Końcowe CI, Pages i odczyt publikacji cache5 pozostają do własnego potwierdzenia. Poprzedni cache4 ma sukcesy przypisane do `fc2e87e`, a nie do nowej paczki. PRE-PROD pozostaje 0.14.0.0 / `7e81a1a`.
