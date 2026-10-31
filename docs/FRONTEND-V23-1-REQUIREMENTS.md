# HARBORLIGHT — pilny zakres DEV 0.9.1.2

Zlecenie z 31 października 2026: najpierw DEV, następnie PRE-PROD. Pilny zakres obejmuje wyłącznie wybór języka na pierwszym wprowadzeniu po zalogowaniu, w szczególności na ekranie nadawania nazwy wyspie. Pozostałe uwagi użytkownik odłożył do dalszej rozmowy.

## Wymaganie i kryteria odbioru

- Widoczny wybór **Polski / English** w pierwszym opisie i przy nazwie wyspy; etykieta ma być zrozumiała również przed znajomością języka interfejsu.
- Zmiana natychmiast tłumaczy treść i kontrolki, zachowuje etap oraz wpisaną, jeszcze niezatwierdzoną nazwę. Nie rozpoczyna czasu świata ani nie zalicza lekcji.
- Preferencja pozostaje zgodna z dalszym oprowadzaniem i Ustawieniami, również po odświeżeniu. Walidacja nazwy i błędy mają używać wybranego języka.
- Kontrolki respektują oczekiwanie na potwierdzenie zapisu. Nowy wybór nie resetuje istniejących wysp, historii, kont ani Authentication.
- Odbiór obejmuje oba kierunki PL↔EN na komputerze i telefonie oraz zachowanie wpisanej nazwy i zatrzymanego czasu. Lokalnie **13 scenariuszy onboarding Chromium PASS**, w tym przerwany zapis i odzyskanie dokładnie jednym zapisem. Pełny Node ma **739 PASS**, pakowanie 12 PASS, importer 18 PASS. To nie jest jeszcze dowód publikacji GCP.

Wersja przygotowywanej poprawki: **0.9.1.2**, odrębna od schematu świata, rewizji i generacji. Karta: [HL-CHG-0031](tracking/changes/HL-CHG-0031.md).

## Granice promocji

DEV → Git i zielone CI dokładnego SHA → standardowy workflow `google-cloud-dev.yml` → odbiór PRE-PROD. Nie omijamy bramek przez bezpośredni deploy. Zlecenie nie obejmuje PROD, resetu graczy ani aktywacji projektowanych mechanik.

Użytkownik dodatkowo zlecił tag **pilne** i bezpośrednią promocję po sukcesie DEV. Karta 0031 ma tag w rejestrze. Po potwierdzeniu CI pilne wydanie otrzymuje nieprzesuwany tag Git `urgent-0.9.1.2-20261031`.

Lokalny GitHub API nadal nie jest zalogowany. Wąski [bridge GitHub Actions](../.github/workflows/promote-urgent-preprod.yml) używa własnego automatycznego tokena workflow wyłącznie do `workflow_dispatch` istniejącego deployu. Wymaga udanego CI push/main z własnego repozytorium, pełnego SHA i markera **`[preprod:0.9.1.2]` w sprawdzonym commicie**; inne commity nie promują się automatycznie. Ponownie odczytuje CI/workflow, wykrywa istniejący deploy i sprawdza main tuż przed POST. Nie ma uprawnień OIDC ani poświadczeń Google; istniejący gate i WIF pozostają bez zmian. Nie ponawia niepewnego POST. Dziewięć testów dyspozytora przeszło w pełnym zestawie Node.

API dispatch z `ref=main` nie ma atomowego warunku SHA. Dlatego po pushu oznaczonego wydania nie przesuwamy main do utworzenia i potwierdzenia źródła deployu; rzeczywisty SHA przebiegu musi zgadzać się z CI. Sam push lub sukces bridge nie jest dowodem sukcesu GCP. Status i artefakty wymagają odrębnego potwierdzenia w [rejestrze środowisk](ENVIRONMENT-STATUS.md). Ręczne Run workflow pozostaje ścieżką właściciela w razie rzeczywistego braku potwierdzenia.

## Przyjęte parametry i pozostałe odłożone punkty

Zaakceptowano wcześniej proponowaną średnią całego sezonowego składu z premią +2 za kolejnego aktywnego uczestnika, do +8 przy pięciu, oraz zachowanie składu na sezon mimo możliwości natychmiastowego odejścia. Zaakceptowano także +20 p.p. szczęścia przez 6 godzin na jednej wyspie po rzeczywistym przelewie. Okno odbioru 7 dni i dodatkowy cooldown pozostają propozycjami. Te akceptacje nie są GO na ich wdrożenie teraz.

Odnotowano bez dalszego opracowania:

- [0926](tracking/changes/HL-CHG-0926.md): jasne sloty ligi; 19–20 i 20–21 są przykładami, nie ustaloną godziną.
- [0927](tracking/changes/HL-CHG-0927.md): każdego dnia zadanie podstawowe i zręcznościowe, np. łapanie minimum X obiektów w slocie; X i warianty do ustalenia.
- [0928](tracking/changes/HL-CHG-0928.md): nieme pokazywanie przedmiotów związanych z wyspą/rozbitkami/piratami i słowa czytane wspak; dalsze pomysły później.
- [0929](tracking/changes/HL-CHG-0929.md): plansza, karty i pionki do wydruku.
- [0930](tracking/changes/HL-CHG-0930.md): pudełko, opakowanie, instrukcja i QR; bez generowania teraz plików lub zgadywania adresów.
- [0931](tracking/changes/HL-CHG-0931.md): obok czatu sojuszu osobne prywatne rozmowy jeden na jeden.

Rejestr obejmuje **251 zmian**; liczba ręcznych przypadków pozostaje **46**, z wynikami NOT RUN. Przygotowanie dokumentów nie jest realizacją druku, czatu, ligi, bonusów lub wdrożenia.

## Korekta odbioru po pierwszej nieudanej promocji

CI/Pages dla `11f6ff1e7f46bd1fabb7c55da137244cf2848b08` i bridge przeszły, lecz deploy `41232457485` zakończył się po publikacji Hostingu na niezgodnym manifeście. Log nie ujawnił, czy różnił się commit, schemat czy digest. Nie uznano tej próby za pełny odbiór, a propagacja pozostaje hipotezą.

Nowy `verify-hosted-release.mjs` najpierw sprawdza lokalny manifest i expected hash. Następnie do 12 razy, z budżetem 85 sekund, pobiera manifest z no-cache i unikalnym parametrem. Sukces nadal wymaga schematu 1, właściwego SHA i SHA256 całych bajtów. Dotyczy to również odpowiedzi HTTP200; niezgodna treść nie jest przyjmowana. Bezpieczna publiczna adnotacja pokazuje klasyfikację i prawidłowe identyfikatory/hashes, bez raw body. Osiem scenariuszy helpera i pełny Node747PASS; publiczne bajty gry są identyczne z poprzednim odbiorem przeglądarkowym. Nowy commit otrzymuje własne CI przed ponowną promocją. Ta korekta dotyczy wyłącznie PRE-PROD, bez zmian PROD lub danych.

## Wynik końcowy

Źródło `3be1f9d2094f1432acacbb782eed1665fd00e6e1`: CI41233382228, Pages41233382382, bridge41233723831 i PRE-PROD41233737873/próba1 SUCCESS; oba artefakty v2 opublikowane. Tag `urgent-0.9.1.2-20261031` opublikowany. Historia pierwszego nieudanego wdrożenia pozostaje powyżej; nie resetowano kont, wersja0.9.1.2 działa na PRE-PROD. Szczegółowe dowody: [stan środowisk](ENVIRONMENT-STATUS.md).
