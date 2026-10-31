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

Rejestr obejmuje **250 zmian**; liczba ręcznych przypadków pozostaje **46**, z wynikami NOT RUN. Przygotowanie dokumentów nie jest realizacją druku, czatu, ligi, bonusów lub wdrożenia.
