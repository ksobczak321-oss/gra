# HARBORLIGHT — ręczny plan testów i osobne przypadki

**Zacznij od [listy do odhaczania](START-HERE.md) albo [interaktywnego raportu QA](qa-checklist.html).** Zestaw obejmuje53 osobne przypadki. Wszystkie wyniki ręczne pozostają **NOT RUN**; dokument jest planem odbioru, nie potwierdzeniem wykonania. Można go rozpocząć od poniedziałku2 listopada2026 po wskazaniu testowanego buildu i przygotowaniu danych.

## Jak odhaczać pojedyncze przypadki

1. Wpisz rzeczywisty build/SHA, środowisko i testera. Nie łącz wyników dwóch wydań bez ponownego wykonania odpowiednich kroków.
2. Otwórz osobną kartę `HL-TC-…`, przygotuj jej fixture i przejdź kroki z oczekiwaniami.
3. Zaznacz PASS, FAIL albo BLOCKED i zapisz krótki dowód. Pole wyboru na liście oznacza „wykonano i zapisano wynik”, nie automatyczny sukces.
4. Wyeksportuj raport JSON z interaktywnej listy. Możesz go wczytać na drugim urządzeniu. Wyniki tej listy nie wysyłają się automatycznie do Git ani do GCP.

W interaktywnej liście wynik, notatka, tester i opis buildu są zapisywane lokalnie jako **dokumentacja QA**, oddzielnie od gry; lista nie zapisuje i nie odczytuje wysp graczy. Eksport stanowi kopię na wypadek usunięcia danych przeglądarki. Widok pliku HTML na GitHub pokazuje kod — uruchom pobrany HTML lub opublikowaną stronę Pages.

## Metodyka

- **Epik / zmiana:** stabilne wymaganie i decyzje w [rejestrze zmian](../tracking/CHANGE-REGISTER.md).
- **Test Case:** osobny plik poniżej z danymi, krokami i oczekiwaniami. Pliki w Git nie są automatycznie natywnymi GitHub Issues.
- **Bug / incydent:** dopiero po rzeczywistym FAIL: build, kroki, oczekiwany i uzyskany wynik oraz dowód.
- **Definicja READY** oznacza kompletny scenariusz, nie dostępność usługi ani wykonanie testu. **DRAFT / BLOCKED** wymaga doprecyzowania lub przygotowania funkcji. Wynik wykonania to niezależne NOT RUN/PASS/FAIL/BLOCKED.
- P0: dane, dostęp, środki i atomowość; P1: ważna reguła lub obsługa. Wynik wcześniejszej automatyzacji nigdy nie ustawia ręcznego PASS.

## Środowiska i dane

**DEV** to przestrzeń robocza i deweloperski podgląd Pages. **PRE-PROD** to `https://harborlight-dev.web.app` w projekcieGCP `harborlight-dev`. **PROD** nie jest objęty nowym GO. Bieżący [rejestr środowisk](../ENVIRONMENT-STATUS.md) rozstrzyga, które funkcje rzeczywiście są opublikowane. Push i Pages nie są promocją do GCP.

Historyczny baseline definicji to v22.1 / `092e75226fbb14cab09826f313e11d10891966d8`; ostatnia potwierdzona pilna promocja przed nowym zakresem to0.9.1.2 / `3be1f9d2094f1432acacbb782eed1665fd00e6e1`, [przebieg41233737873](https://github.com/ksobczak321-oss/gra/actions/runs/41233737873). Żaden z tych sukcesów nie jest wykonaniem poniższych przypadków ani dowodem aktywacji nowych API. Nowy zakres archipelagu, ligi, czatów i dobroczynności odbieramy wyłącznie na DEV, zgodnie z rzeczywistą gotowością modułów.

Profile QA są specyfikacją danych do przygotowania w izolowanym harnessie, nie dodatkowymi kontami istniejącymi w GCP. Brak fixture, kontrolowanego zegara lub potrzebnej usługi oznacza BLOCKED z przyczyną. Nie zmieniaj czasu komputera i prawdziwej bazy, aby wymusić warunek testowy. Lokalny nietrwały podgląd nie zastępuje testu trwałości chmury.

Nie używaj `admin1`–`admin3` jako danych jednorazowych; nie resetuj i nie podmieniaj ich historii. Osobne historyczne zlecenie resetu po promocji nie uprawnia do dowolnego czyszczenia danych podczas QA. Próby płatności i dobroczynności korzystają z oznaczonej symulacji DEV, bez rzeczywistych przelewów.

## Proponowana kolejność odbioru

1. Dostęp i integralność: TC19–23, TC29, TC31.
2. Nowa gra i czytelność: TC01–05, TC30, TC43–45 oraz powroty w PomocyTC47, prowadzenie po mapieTC51 i przegląd polszczyznyTC52–53.
3. Gospodarka i mieszkańcy: TC06–18, TC24–25.
4. Archipelag i handel: migracjaTC26, transport towarówTC27, transakcjeTC28, nowe regułyTC33–37.
5. Sojusze i liga: TC46, prywatne wiadomościTC48, ligaTC38 i sloty/dwa zadaniaTC49.
6. Dobroczynność i pochodzenie monet: TC39–40; tylko izolowana symulacja.
7. Odczyt operacyjny i retencja: TC32, TC42. Papierowa gra i druk: TC50. **TC41 pozostaje BLOCKED: integracja planszówki online jest wyłączona z GO.**

TC26 jest obecnie testem zachowania wcześniejszych dwóch światów podczas migracji; nowa kolonizacja ma osobneTC34–36. TC28 sprawdza integralność sprzedaży materiałów za monety, aTC37 pułap ceny i równoległy handelNPC. Nie zaliczamy nowej logiki na podstawie dawnego darmowego założenia drugiej wyspy lub barteru.

## Indeks

| Przypadek | Obszar | Priorytet | Definicja | Wynik ręczny |
|---|---|---|---|---|
| [HL-TC-0001 — Pierwsze wejście zatrzymuje czas do końca oprowadzania](manual/HL-TC-0001.md) | Pierwsze wejście | P0 | READY | NOT RUN |
| [HL-TC-0002 — Nazwa i kolejność podświetleń na komputerze i telefonie](manual/HL-TC-0002.md) | Pierwsze wejście | P1 | READY | NOT RUN |
| [HL-TC-0003 — Wcześniejsze rozdanie szczęścia usuwa przyszłą lekcję bez skrzyni](manual/HL-TC-0003.md) | Samouczek | P0 | READY | NOT RUN |
| [HL-TC-0004 — Dwa zadania o tragarzach wymagają dwóch faktycznych przydziałów](manual/HL-TC-0004.md) | Samouczek | P1 | READY | NOT RUN |
| [HL-TC-0005 — Końcowe rozliczenie kursu: pełny magazyn bez zaległych skrzyń](manual/HL-TC-0005.md) | Samouczek | P0 | READY | NOT RUN |
| [HL-TC-0006 — Bonusowe materiały są wydawalne poza limitem zwykłego magazynu](manual/HL-TC-0006.md) | Zapasy | P0 | READY | NOT RUN |
| [HL-TC-0007 — Dostawa, budowa i popup rzeczywistego skrócenia czasu](manual/HL-TC-0007.md) | Budowy | P1 | READY | NOT RUN |
| [HL-TC-0008 — Smutna buźka odzwierciedla rzeczywistą karę przestoju](manual/HL-TC-0008.md) | Produkcja i ludzie | P1 | READY | NOT RUN |
| [HL-TC-0009 — Ulepszanie ścieżek zużywa kamień i nie przeskakuje poziomów](manual/HL-TC-0009.md) | Drogi | P1 | READY | NOT RUN |
| [HL-TC-0010 — Dom pozwala przydzielać ludzi i wydać dzienną pulę szczęścia](manual/HL-TC-0010.md) | Dom | P1 | READY | NOT RUN |
| [HL-TC-0011 — Powitalne minimum 20% obejmuje nowych mieszkańców](manual/HL-TC-0011.md) | Populacja i efekty | P1 | READY | NOT RUN |
| [HL-TC-0012 — Aktywność ×2 i kara dopiero za czas po 48 h nieobecności](manual/HL-TC-0012.md) | Czas i podatki | P0 | READY | NOT RUN |
| [HL-TC-0013 — Darmowe błogosławieństwo i okres łaski Kaplicy](manual/HL-TC-0013.md) | Kaplica | P1 | READY | NOT RUN |
| [HL-TC-0014 — Wrak, skarb i zła prognoza respektują ochronę Latarni](manual/HL-TC-0014.md) | Wydarzenia | P1 | READY | NOT RUN |
| [HL-TC-0015 — Wybór kulek i trójek jest jawny i mieści się na telefonie](manual/HL-TC-0015.md) | Minigry | P1 | READY | NOT RUN |
| [HL-TC-0016 — Nagrody rund, dobrowolny czas i ryzyko utraty puli](manual/HL-TC-0016.md) | Minigry | P0 | READY | NOT RUN |
| [HL-TC-0017 — Zapamiętany harmonogram reklamy i ekspedycji liczy aktywne minuty](manual/HL-TC-0017.md) | Reklamy i aktywność | P1 | READY | NOT RUN |
| [HL-TC-0018 — Symulacja Paynow, pojedynczy przycisk i uprawnienie bez reklam](manual/HL-TC-0018.md) | Monetyzacja DEV | P0 | READY | NOT RUN |
| [HL-TC-0019 — Rejestracja wymaga odrębnych potwierdzeń dokumentów](manual/HL-TC-0019.md) | Konta i dokumenty | P0 | READY | NOT RUN |
| [HL-TC-0020 — Automatyczny zapis co 30 sekund i wznowienie na drugim urządzeniu](manual/HL-TC-0020.md) | Zapis | P0 | READY | NOT RUN |
| [HL-TC-0021 — Dwa urządzenia i konflikt zapisu nie nadpisują potwierdzonego świata](manual/HL-TC-0021.md) | Zapis | P0 | READY | NOT RUN |
| [HL-TC-0022 — Brak sieci zatrzymuje mutacje i nie tworzy nowej wyspy](manual/HL-TC-0022.md) | Zapis | P0 | READY | NOT RUN |
| [HL-TC-0023 — Wylogowanie z Ustawień i trwała granica bezczynności](manual/HL-TC-0023.md) | Sesja | P0 | READY | NOT RUN |
| [HL-TC-0024 — Usuwanie powiadomień dotyczy tylko przeczytanych i respektuje filtry](manual/HL-TC-0024.md) | Powiadomienia | P1 | READY | NOT RUN |
| [HL-TC-0025 — Awans Ratusza 3→4 wymaga 54 mieszkańców, inne budynki nie](manual/HL-TC-0025.md) | Rozwój | P1 | READY | NOT RUN |
| [HL-TC-0026 — Migracja wcześniejszych dwóch wysp zachowuje światy i jednorazowo skopiowane poziomy](manual/HL-TC-0026.md) | Archipelag — obecny baseline | P0 | READY | NOT RUN |
| [HL-TC-0027 — Towary: 1000 sztuk, 10 minut i pojedynczy rozładunek](manual/HL-TC-0027.md) | Archipelag — obecny baseline | P0 | READY | NOT RUN |
| [HL-TC-0028 — Rynek graczy: transakcja materiał–monety i brak podwójnego przyjęcia](manual/HL-TC-0028.md) | Handel — obecny baseline | P0 | READY | NOT RUN |
| [HL-TC-0029 — „Zacznij od nowa” nie jest pełnym resetem trzech kont](manual/HL-TC-0029.md) | Reset | P0 | READY | NOT RUN |
| [HL-TC-0030 — Wersja gry jest widoczna w Ustawieniach](manual/HL-TC-0030.md) | Interfejs i wydanie | P1 | READY | NOT RUN |
| [HL-TC-0031 — Promocja zachowuje kolejność DEV → PRE-PROD → PROD](manual/HL-TC-0031.md) | Wydanie | P0 | READY | NOT RUN |
| [HL-TC-0032 — Raport kosztów ostatnich 24 godzin ma rzeczywisty zakres i walutę](manual/HL-TC-0032.md) | Koszty | P1 | READY | NOT RUN |
| [HL-TC-0033 — Nazwa wyspy córki zawsze ma wymuszony prefiks matki](manual/HL-TC-0033.md) | Projekt archipelagu | P1 | READY | NOT RUN |
| [HL-TC-0034 — Założenie córki zabiera 6 osób w Domu i zostawia matce co najmniej 12](manual/HL-TC-0034.md) | Projekt kolonizacji | P0 | READY | NOT RUN |
| [HL-TC-0035 — Statek pasażerski przewozi do 100 osób w 30 minut](manual/HL-TC-0035.md) | Projekt przewozu ludzi | P0 | READY | NOT RUN |
| [HL-TC-0036 — Kolejne wyspy: progi poziomu, koszt i wejście przez Ratusz](manual/HL-TC-0036.md) | Projekt archipelagu | P0 | READY | NOT RUN |
| [HL-TC-0037 — Handel NPC i PvP działa równolegle z ceną maksymalną gry](manual/HL-TC-0037.md) | Projekt handlu | P0 | READY | NOT RUN |
| [HL-TC-0038 — Liga miesięczna: granice sezonu, drużyny i punktacja](manual/HL-TC-0038.md) | Projekt społeczności | P1 | READY | NOT RUN |
| [HL-TC-0039 — Dobroczynność przyjmuje wyłącznie kwalifikowane zarobione monety](manual/HL-TC-0039.md) | Projekt dobroczynności | P0 | READY | NOT RUN |
| [HL-TC-0040 — Dobroczynność: limit budżetu i kontrolowane skutki bonusu szczęścia](manual/HL-TC-0040.md) | Projekt dobroczynności | P0 | READY | NOT RUN |
| [HL-TC-0041 — Planszówka 2–6 osób: sesja 45–60 min i jednokrotny skutek online](manual/HL-TC-0041.md) | Projekt planszówki | P1 | DRAFT / BLOCKED | NOT RUN |
| [HL-TC-0042 — Trzy miesiące nieaktywności zachowują konto i jednorazowe uprawnienia](manual/HL-TC-0042.md) | Retencja | P0 | READY | NOT RUN |
| [HL-TC-0043 — Lekcja Budowy prowadzi przez szczegóły do widocznego priorytetu](manual/HL-TC-0043.md) | Samouczek i nawigacja | P1 | READY | NOT RUN |
| [HL-TC-0044 — Sześć kafelków nagrody ma równy układ 3×2](manual/HL-TC-0044.md) | Interfejs nagród | P1 | READY | NOT RUN |
| [HL-TC-0045 — Opis kart zasobów i podatków odpowiada rzeczywistym wartościom](manual/HL-TC-0045.md) | Objaśnienia gospodarki | P1 | READY | NOT RUN |
| [HL-TC-0046 — Sojusz przy Rankingu: członkostwo i chat gry](manual/HL-TC-0046.md) | Projekt sojuszy i komunikacji | P1 | READY | NOT RUN |
| [HL-TC-0047 — Pomoc rozdziela powrót do tutoriala i praktycznego samouczka](manual/HL-TC-0047.md) | Pomoc i samouczek | P0 | READY | NOT RUN |
| [HL-TC-0048 — Prywatny czat1:1 nie ujawnia rozmów ani danych kont osobom trzecim](manual/HL-TC-0048.md) | Prywatne wiadomości | P0 | READY | NOT RUN |
| [HL-TC-0049 — Liga: dwa zadania dziennie wyłącznie w ogłoszonych slotach Warszawy](manual/HL-TC-0049.md) | Harmonogram i wyzwania ligi | P0 | READY | NOT RUN |
| [HL-TC-0050 — Planszówka: komplet druku, czytelne kody i samodzielna sesja przy stole](manual/HL-TC-0050.md) | Planszówka do wydruku | P1 | READY | NOT RUN |
| [HL-TC-0051 — Samouczek wskazuje budynek na mapie i czeka na rzeczywiste kliknięcie](manual/HL-TC-0051.md) | Samouczek i mapa | P1 | READY | NOT RUN |
| [HL-TC-0052 — Polszczyzna wszystkich 25 lekcji jest naturalna i zgodna z klikanymi elementami](manual/HL-TC-0052.md) | Polskie teksty samouczka | P1 | READY | NOT RUN |
| [HL-TC-0053 — Polska wersja całej gry: panele, błędy, akcje i powiadomienia](manual/HL-TC-0053.md) | Pełny przegląd polszczyzny | P1 | READY | NOT RUN |

## Raport i zgłoszenia

[ListaSTART-HERE](START-HERE.md) zawiera szablon pojedynczego wyniku. Interaktywny raport pozwala filtrować przypadki, zapisywać notatki i pobraćJSON. Zrzuty oraz logi nie mogą zawierać tokenów ani prywatnych danych. Po FAIL zgłoszenie błędu odnosi się do stabilnegoID testu iSHA buildu.

Kanoniczna lista: [manual-test-cases.json](manual-test-cases.json). Interaktywną listę iMarkdown odtwarza `python3 scripts/build_manual_checklist.py`; `--check` sprawdza zgodność. Indywidualne karty są wersjonowanymi dokumentami. Importer [publish_tracking_issues.py](../../scripts/publish_tracking_issues.py) może później opublikować je jako osobneIssues dopiero w uwierzytelnionej sesji właściciela. W tym zestawie nie utworzono fikcyjnych numerówIssues.

Starszy [zestaw155 scenariuszyv18](../TEST-SCENARIOS-v18.md), [jegoJSON](../test-scenarios-v18.json) iExcel11 są archiwalnymi migawkami. Nie są bieżącym wynikiem ręcznego odbioru nowegoDEV. Rzeczywiste wyniki automatyzacji i promocji zapisuje [dziennik](../IMPLEMENTATION-LOG.md).
