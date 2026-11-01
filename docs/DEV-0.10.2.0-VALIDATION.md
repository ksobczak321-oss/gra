# DEV 0.10.2.0 / v26 — bieżący odbiór lokalny

Stan zapisu: **1 listopada 2026, Europe/Warsaw**. GO obejmuje DEV oraz Git/CI/Pages, bez nowej promocji PRE-PROD, PROD, resetu kont i integracji planszówki online. Kandydat ma wersję **0.10.2.0** i cache **`frontend-v26`**. Lokalny odbiór zakończony. Git/CI/Pages wymagają własnych wyników źródłowego SHA.

[Wymagania v26](FRONTEND-V26-REQUIREMENTS.md) · [Rejestr środowisk](ENVIRONMENT-STATUS.md) · [Zmiany](tracking/CHANGE-REGISTER.md) · [Ręczna lista QA](testing/START-HERE.md).

## Potwierdzone wyniki lokalne

| Kontrola | Wynik i granica dowodu |
|---|---|
| Node: model, zapis, API, promocja, teksty i planszówka | **954 PASS** po integracji. To lokalny wynik kandydata; dalsza zmiana kodu wymaga właściwego ponowienia. |
| Python: konfiguracja, pakowanie, konta i importer | **141 PASS w 11 zestawach**. Zweryfikowana suma logu: 2+14+23+12+17+12+12+10+13+8+18 = 141. |
| Generatory rejestru zmian i ręcznej listy QA | Oba `--check` **PASS** dla 279 zmian i 59 przypadków. |
| Chromium: narzędzie ręcznego raportu | **PASS** dla 59 kart: własny build każdego wyniku, zapis po przeładowaniu, bezpieczny tekst, filtrowanie, eksport/import JSON, odrzucenie błędnego importu i układ 360 px. Bez gry, kont i GCP. |
| Chromium: pełna aplikacja | **22 zestawy PASS** po poprawkach i kierunkowych ponowieniach. Nowy kurs sprawdzony rzeczywistymi kliknięciami PL/EN komputer/telefon: sześciu tragarzy, priorytet, mapa, nagroda przed objaśnieniem 30+60 sekund, dostawy zadania i wypłata minigry. Osobno: aktywne/odłożone kursory po odświeżeniu, zachowanie historii i dokładna granica godziny reklam. Cały zestaw tego samego SHA ponownie uruchomi CI. |
| Ręczny odbiór właściciela | **59 NOT RUN**. TC41 integracji fizycznej ma definicję DRAFT / BLOCKED; sama integracja jest poza GO. |

Lokalne logi robocze są w `/tmp/harborlight-v26-python.log` i `/tmp/harborlight-v26-browser.log`. Nie są trwałym artefaktem Git ani dowodem CI. Log pełnego przeglądu zawiera też nieudane próby; nie zastępujemy ich liczbą sukcesów z wcześniejszej wersji. Pierwsza próba testu narzędzia QA nie uruchomiła Chromium w sandboxie (`setsockopt: Operation not permitted`); powtórzenie z dozwolonym szerszym uprawnieniem wykonania przeszło. To problem uruchomienia izolowanego testu, a nie dowód usterki hostingu.

## Zakres sprawdzanego zachowania

- Tutorial ma 33 opisy ekranu, samouczek 25 praktycznych lekcji. Zamknięcie, kontynuowanie i przegląd od początku nie resetują świata, czasu startu ani nagród. Automatyczne reklamy czekają podczas obu narzędzi i przez 60 aktywnych minut po wcześniejszym zamknięciu.
- Nowy program lekcji zaczyna 6 tragarzy → priorytet Budowa → rolnik → drwal → Ratusz 2. Zadanie Latarni i rzeczywiście rozegrana minigra zastępują rozbudowę Ratusza do 3. Nagroda zapewnia środki na Latarnię oraz rezerwę jedzenia; starych programów 3/4 i ich nagród nie przepisujemy.
- Turbo pierwszych rozbudów, zachowanie rozpoczętych zleceń, jednokrotne pobranie/dostawa/ukończenie oraz odmowy rozbudowy niedostępnych budynków przeszły wspólny odbiór modelu i interfejsu.
- Nazwa ma 3–40 znaków i walidację wulgaryzmów PL/EN; stare dwuznakowe nazwy muszą się nadal wczytywać bez resetu.
- Magazyn pokazuje dostępne sumy, szczegóły i zasady pod ⓘ. Dom otwiera pełną obsadę przez „Zarządzaj pracownikami”. Pełne lokalne magazyny mają widoczną smutną buźkę i zgodne opisy pięciu producentów.
- Ranking, Sojusz i liga, Pomagam oraz czat są odrębnymi wejściami. Dane demonstracyjne i trzej przykładowi beneficjenci są oznaczeni; symulacja nie potwierdza rzeczywistego przelewu ani usługi.

Kolejność HUD oraz pozostawienie możliwości indywidualnego wydania reszty szczęścia po „Daj wszystkim” są jawnymi założeniami wykonawczymi, otwartymi na korektę. Użytkownik nie odpowiedział na opcjonalne pytania; nie opisujemy tego jako dodatkowego potwierdzenia. Szczegóły i odrębne przypadki TC54–TC59 są w wymaganiach i ręcznej liście.

## Źródło, pakiet i publikacja

| Dowód | Stan |
|---|---|
| Pełny końcowy SHA | **Oczekuje** zamrożenia kodu i utworzenia commitu. Nie używamy SHA 0.10.1.0 jako źródła nowej aplikacji. |
| Pakiet | Kandydat zawiera **55 plików z manifestem / 54 pliki treści**. Końcowy rozmiar i hashe archiwum/manifestu pozostają oczekujące po zamrożeniu źródła. |
| Porównanie treści pakietu po końcowym odbiorze | **Oczekuje** zakończenia wszystkich poprawek i powtórzenia odpowiednich kontroli. |
| Push do Git / własne CI | **Jeszcze niewykonane** dla tego pakietu. Własny przebieg i wynik muszą wskazywać dokładny nowy SHA. |
| Pages 0.10.2.0 | **Jeszcze nieopublikowane**; ostatni potwierdzony podgląd to 0.10.1.0 / `353faad…`, Pages 41246449682. |
| Tag odbioru DEV 0.10.2.0 | **Nieutworzony**; wymaga własnego sukcesu CI i Pages oraz dowodów końcowego pakietu. |
| PRE-PROD | **Bez nowej promocji**; pozostaje 0.10.1.0 / `353faad347262dce7c3632fdf7c71be124384ab1`, wdrożenie 41246771480 / próba 1 SUCCESS. |
| PROD, reset, operatorzy płatności/reklam | **Bez nowej publikacji, resetu ani aktywacji**. |

Przebiegi 41246449612 i 41246771480 oraz tagi 0.10.1.0 są historycznymi dowodami poprzedniego wydania. Nie są odbiorem nowego kodu. Nazwy, UID, hasła, postęp kont i schemat świata 9 pozostają zachowane. Prawdziwa dobroczynność wymaga osobnego uruchomienia zaufanej gospodarki, beneficjentów, finansowania i potwierdzeń; symulacja DEV nie spełnia tych warunków.
