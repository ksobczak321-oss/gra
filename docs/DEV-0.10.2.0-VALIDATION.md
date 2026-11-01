# DEV 0.10.2.0 / v26 — bieżący odbiór lokalny

Stan zapisu: **1 listopada 2026, Europe/Warsaw**. GO obejmuje DEV oraz Git/CI/Pages, bez nowej promocji PRE-PROD, PROD, resetu kont i integracji planszówki online. Kandydat ma wersję **0.10.2.0** i cache **`frontend-v26`**. Lokalny odbiór zakończony. Kod wysłany do Git, Pages zakończone sukcesem; własne CI tego samego SHA zakończone sukcesem.

[Wymagania v26](FRONTEND-V26-REQUIREMENTS.md) · [Rejestr środowisk](ENVIRONMENT-STATUS.md) · [Zmiany](tracking/CHANGE-REGISTER.md) · [Ręczna lista QA](testing/START-HERE.md).

## Potwierdzone wyniki lokalne

| Kontrola | Wynik i granica dowodu |
|---|---|
| Node: model, zapis, API, promocja, teksty i planszówka | **954 PASS** po integracji. To lokalny wynik kandydata; dalsza zmiana kodu wymaga właściwego ponowienia. |
| Python: konfiguracja, pakowanie, konta i importer | **141 PASS w 11 zestawach**. Zweryfikowana suma logu: 2+14+23+12+17+12+12+10+13+8+18 = 141. |
| Generatory rejestru zmian i ręcznej listy QA | Oba `--check` **PASS** dla 279 zmian i 59 przypadków. |
| Chromium: narzędzie ręcznego raportu | **PASS** dla 59 kart: własny build każdego wyniku, zapis po przeładowaniu, bezpieczny tekst, filtrowanie, eksport/import JSON, odrzucenie błędnego importu i układ 360 px. Bez gry, kont i GCP. |
| Chromium: pełna aplikacja | **22 zestawy PASS** po poprawkach i kierunkowych ponowieniach. Nowy kurs sprawdzony rzeczywistymi kliknięciami PL/EN komputer/telefon: sześciu tragarzy, priorytet, mapa, nagroda przed objaśnieniem 30+60 sekund, dostawy zadania i wypłata minigry. Osobno: aktywne/odłożone kursory po odświeżeniu, zachowanie historii i dokładna granica godziny reklam. Własny CI tego samego SHA ponowił wszystkie 22 zestawy z wynikiem SUCCESS. |
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
| Pełny końcowy SHA | `170cd31f006c8d3a5765ecb78649c31731b0a7a7` — własny commit aplikacji 0.10.2.0, wysłany do `main`. |
| Pakiet | **55 plików z manifestem / 54 pliki treści, 11 062 246 bajtów.** TAR SHA-256 `669e64fb07feca3fe86441376843bf7e21aab288101cfaf0de0614e05d01cb5a`; manifest SHA-256 `258b651352cf876baed98c160dc7a45f7de822228a178ddfc23fa4ef5b0f883a`. Archiwum sprawdzone po hashu i bezpiecznie rozpakowane. |
| Porównanie treści pakietu po końcowym odbiorze | **PASS:** wszystkie 53 wejściowe pliki publiczne zgodne bajtowo; 54 pliki treści wraz z generowanym `index.html` przeszły kontrolę manifestu. Nowy pełny kurs ponownie PASS w Chromium bezpośrednio z końcowego pakietu tego SHA. |
| Push do Git / własne CI | Push wykonany; własne [CI 41337284731](https://github.com/ksobczak321-oss/gra/actions/runs/41337284731) **SUCCESS, 5 min 22 s** dla 170cd31… . |
| Pages 0.10.2.0 | [Pages 41337284572](https://github.com/ksobczak321-oss/gra/actions/runs/41337284572) **SUCCESS, 25 s** dla 170cd31… . [Podgląd DEV](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v26). Bezpośredni HTTP odczyt hosta z tej sesji zwraca 403; nie traktujemy go jako niezależnego odbioru serwowanej treści. |
| Tag odbioru DEV 0.10.2.0 | `dev-0.10.2.0-20261101` wskazuje `170cd31f006c8d3a5765ecb78649c31731b0a7a7` i wiąże własne CI, Pages oraz powyższe hashe. Opublikowany po potwierdzeniu obu sukcesów. |
| PRE-PROD | **Bez nowej promocji**; pozostaje 0.10.1.0 / `353faad347262dce7c3632fdf7c71be124384ab1`, wdrożenie 41246771480 / próba 1 SUCCESS. |
| PROD, reset, operatorzy płatności/reklam | **Bez nowej publikacji, resetu ani aktywacji**. |

Przebiegi 41246449612 i 41246771480 oraz tagi 0.10.1.0 są historycznymi dowodami poprzedniego wydania. Nie są odbiorem nowego kodu. Nazwy, UID, hasła, postęp kont i schemat świata 9 pozostają zachowane. Prawdziwa dobroczynność wymaga osobnego uruchomienia zaufanej gospodarki, beneficjentów, finansowania i potwierdzeń; symulacja DEV nie spełnia tych warunków.
