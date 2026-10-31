# Odbiór DEV 0.10.1.0 / v25

Zakres: prowadzenie 25 lekcji przez rzeczywiste kliknięcia mapy i budynków, naturalny polski całej gry oraz wspólne okno ligi 19:00–21:00 czasu Warszawy. Cache `frontend-v25`. [Wymagania](FRONTEND-V25-REQUIREMENTS.md) · [Zakres przeglądu polszczyzny](POLISH-REVIEW-v25.md).

## Wyniki lokalne

| Kontrola | Wynik |
|---|---|
| Node: zasady, zapis, API, transakcje, tłumaczenia i model planszówki | 897 PASS, 0 FAIL |
| Python: konfiguracja, przygotowanie zasobów, pakowanie, konta i importer | 141 PASS w 11 zestawach |
| Pakowanie po zamrożeniu kodu | 12 PASS, wliczone w zakres Python |
| Chromium: spakowana aplikacja | 18 zestawów PASS |
| Generatory zmian, ręcznej checklisty i dokumentów prawnych | Wszystkie `--check` PASS |
| Ręczny odbiór właściciela | 53 przypadki NOT RUN; integracja fizyczna TC41 BLOCKED |

Audyt polskiego interfejsu odczytał 112 rzeczywistych widoków: 56 na komputerze i 56 na telefonie. Brak wykrytych angielskich elementów, błędów JavaScript, żądań do usług zewnętrznych lub zmiany monet podczas czytania. Sprawdzono także nazwy wysp w opcjach transportu, rozwijaną listę mieszkańców i etykiety ARIA. Starsze oczekiwania dwóch testów dostosowano do świadomie zmienionej polskiej treści; ponowienia przeszły na tym samym, niezmienionym pakiecie.

Testy samouczka sprawdzają rzeczywiste kliknięcie budynku, przejście do obsady lub szczegółów, widoczność wskazówek, ograniczenie ruchu oraz brak nagrody za samą nawigację. Porównanie obu programów lekcji zachowuje ID, kolejność, warunki, nagrody i selektory. Testy językowe obejmują rzeczywiste odpowiedzi modeli i wyrenderowane panele, nie tylko istnienie wpisu w katalogu.

## Źródło i publikacja

Commit tego wydania oraz jego własne CI/Pages pozostają do potwierdzenia. Dawne sukcesy v24 nie są dowodem odbioru v25. Końcowy pakiet zostanie zbudowany z rzeczywistym pełnym SHA i porównany bajtowo z pakietem przeglądarkowym; techniczny zerowy SHA preflight nie jest źródłem wydania. Tag `dev-0.10.1.0-20261031` wolno opublikować dopiero po sukcesie obu przebiegów.

## Granice

Tylko DEV i Git/CI/Pages. PRE-PROD pozostaje na 0.9.1.2 / `3be1f9d2094f1432acacbb782eed1665fd00e6e1`; bez migracji GCP, resetu kont i promocji PROD. Dokumenty prawne pozostają roboczym Lorem ipsum, wersja `2026-10-31-draft4`. Rzeczywiste płatności, reklamy i dobroczynność nie zostały aktywowane; fizyczna gra nie rozlicza nagród online.

Nie przepisujemy historii zapisanych zdarzeń ani treści graczy. Własne nazwy, pseudonimy i czat nie są automatycznie tłumaczone. Przegląd i automatyzacja nie zastępują ręcznej oceny wszystkich możliwych stanów.
