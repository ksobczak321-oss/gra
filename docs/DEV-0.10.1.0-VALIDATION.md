# Końcowa redakcja DEV 0.10.1.0 / v25

Opisy wyjaśniają graczowi prostym językiem, co zrobić i po co. Przeredagowano 12 krótkich i 12 pełnych opisów budynków oraz główne instrukcje zasobów, podatków, produkcji, mieszkańców i szczęścia. To redakcja stylu i sensu, nie sam test braku angielskich słów. Cache `frontend-v25-2`.

| Końcowy odbiór lokalny | Wynik |
|---|---|
| Node: model, zapis, API, promocja, teksty i planszówka | 898 PASS / 0 FAIL |
| Python: konfiguracja, pakowanie, konta i importer | 141 PASS w 11 zestawach |
| Chromium: spakowana aplikacja | 18 zestawów PASS |
| Odczyt polskich ekranów | 112 widoków: 56 komputer + 56 telefon, 0 wykrytych reszt EN |
| Generatory zmian, checklisty i dokumentów prawnych | Wszystkie --check PASS |
| Importer kart w dry-run | 316 kart: 263 zmiany + 53 przypadki |
| Ręczny odbiór właściciela | 53 NOT RUN; TC41 integracji fizycznej BLOCKED |

Naprawę panelu potwierdza rzeczywista geometria przycisków przed kliknięciem z błędnego CI, także na360×640. Przywrócenie starego CSS ponownie daje błąd: panel1200px zamiast160px. Właściwy test używa zwykłych kliknięć, bez forceclick. Prowadzenie nie zmienia nagród, ID lub historii.

Po redakcji cały pakiet przetestowano ponownie. Starsze oczekiwania sformułowań w testach dopasowano do nowych komunikatów, zachowując sprawdzanie rzeczywistych działań, nagród i zapisów. Nie przenosimy wyników pierwszego pakietu na nowy.

Końcowy commit oraz jego własne CI/Pages oczekują na potwierdzenie. Użytkownik zlecił następnie PRE-PROD. [Właściciel potwierdził przygotowanie zgodnych prywatnych reguł zapisu](PREPROD-V25-PREPARATION.md), bez resetu kont. Promocja ma użyć tego samego zielonego SHA standardowym workflow, bez PROD. Tag odbioru powstanie dopiero po własnych sukcesach.

## Historia pierwszego podglądu

Źródło b1cd650 poniżej miało lokalny odbiór, ale jego CI41244467302 zakończyło się **FAILURE**, 2m48s (przycisk `townhall-upgrade` poza ekranem). Pages41244467250 zakończyło się SUCCESS, 41s. Tag nie powstał, a promocja nie została uruchomiona. Błąd ma osobną kartę [HL-CHG-0933](tracking/changes/HL-CHG-0933.md).

---

# Pierwszy kandydat DEV 0.10.1.0 / v25 — historia

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

Źródło aplikacji: **`b1cd650da1c9d669ebce4a77bee81ebfd87ccbc9`**, push do `main` potwierdzony. [Pages 41244467250](https://github.com/ksobczak321-oss/gra/actions/runs/41244467250) **SUCCESS (41 s)**. [CI 41244467302](https://github.com/ksobczak321-oss/gra/actions/runs/41244467302) **FAILURE (2 min 48 s)**. To nie jest odebrany kandydat. Dawne sukcesy v24 nie są dowodem odbioru v25.

Pakiet dokładnego źródła: **54 pliki z manifestem, 10 988 081 bajtów**. SHA-256 archiwum: `0fc5f47e2147c8e567e126960a7d75a509ccbf752eeac81a4575461b27b33a74`; manifestu: `8b98dd5c51a3aa603a93f3598fe78c0130f4d377ca419088b2d47da64db28d56`. Weryfikacja i ekstrakcja archiwum PASS. Wszystkie 53 pliki zawartości są bajtowo identyczne z pakietem testowanym w Chromium. Techniczny zerowy SHA preflight nie jest źródłem wydania.

Tag `dev-0.10.1.0-20261031` pozostaje nieopublikowany do sukcesu obu przebiegów. Bezpośredni odczyt `github.io` ogranicza brama sieciowa tej sesji; nie traktujemy tego jako błędu witryny ani nie deklarujemy niezależnego odczytu hostingu.

## Granice

Tylko DEV i Git/CI/Pages. PRE-PROD pozostaje na 0.9.1.2 / `3be1f9d2094f1432acacbb782eed1665fd00e6e1`; bez migracji GCP, resetu kont i promocji PROD. Dokumenty prawne pozostają roboczym Lorem ipsum, wersja `2026-10-31-draft4`. Rzeczywiste płatności, reklamy i dobroczynność nie zostały aktywowane; fizyczna gra nie rozlicza nagród online.

Nie przepisujemy historii zapisanych zdarzeń ani treści graczy. Własne nazwy, pseudonimy i czat nie są automatycznie tłumaczone. Przegląd i automatyzacja nie zastępują ręcznej oceny wszystkich możliwych stanów.
