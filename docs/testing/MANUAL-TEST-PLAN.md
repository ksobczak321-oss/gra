# HARBORLIGHT — ręczny plan testów i osobne przypadki

Plan utworzony 31 października 2026. **46 osobnych przypadków; wszystkie wyniki ręczne: NOT RUN.** Nie jest to raport wykonania ani potwierdzenie skuteczności nowych mechanik. Każdy plik `HL-TC-…` może stanowić treść osobnego zgłoszenia typu Test Case; sam plik nie oznacza utworzenia natywnego GitHub Issue.

## Metodyka

- **Epik / zmiana:** stabilne wymaganie i historia decyzji w [rejestrze zmian](../tracking/CHANGE-REGISTER.md). Jeden przypadek może sprawdzać kilka powiązanych wymagań.
- **Test Case:** odrębny plik poniżej z danymi, krokami, oczekiwaniem i własnym wynikiem.
- **Bug / incydent:** powstaje dopiero po rzeczywistym FAIL, z buildem, krokami odtworzenia, oczekiwanym i uzyskanym wynikiem oraz dowodem. Nie nazywamy niewykonanego testu incydentem.
- **Stan definicji** READY lub DRAFT/BLOCKED jest osobny od **wyniku wykonania** NOT RUN/PASS/FAIL/BLOCKED. Historyczny sukces automatyzacji nie ustawia manualnego PASS.
- P0: utrata danych/środków, dostęp i kluczowa atomowość; P1: istotna reguła lub podstawowa obsługa.

## Środowiska i dane

Historyczny punkt odniesienia definicji przypadków to **v22.1 / `092e75226fbb14cab09826f313e11d10891966d8`**, [promocja 41222765705](https://github.com/ksobczak321-oss/gra/actions/runs/41222765705). To nie wykonanie poniższych przypadków. Aktualny [rejestr środowisk](../ENVIRONMENT-STATUS.md) ma pierwszeństwo przed tą migawką. Włączenie API kont/rynku nie jest tutaj potwierdzone; scenariusz wymagający tej usługi jest BLOCKED bez rzeczywistego potwierdzenia.

Widoczna wersja **0.9.1.1** jest nowym zakresem DEV w tym zadaniu; nie przypisujemy jej wcześniejszemu PRE-PROD bez własnej promocji. Wersja interfejsu jest inna niż `state.version`, rewizja zapisu i generacja wyspy.

Nie używać prawdziwego admin1 ani innych stałych kont jako danych jednorazowych. Użytkownik zlecił odrębny reset trzech profili po promocji, ale nie ma potwierdzenia jego wykonania. Przycisk „Rozpocznij nową wyspę” jest osobnym mechanizmem zachowującym historię/uprawnienia i nie dowodzi resetu wszystkich kont.

Profile QA to **specyfikacje danych do przygotowania w izolowanym harnessie**, a nie dodatkowe konta istniejące w GCP. Źródła fixture są wskazane w przypadkach. Jeżeli tester nie ma przygotowanego profilu i kontrolowanego zegara, zapisuje BLOCKED; nie zmienia czasu komputera, prawdziwej bazy ani salda konta, by osiągnąć warunek. QA-CLOUD wymaga atrapy REST albo osobnego właścicielsko przygotowanego środowiska z jednorazowymi kontami. Podgląd Pages jest nietrwały i nie zastępuje testu chmury.

Przy powtarzaniu testów należy zapisać rzeczywisty SHA/build, nazwę fixture i czas. Zamknięcie kontekstu QA usuwa ulotne dane; czyszczenie nie uruchamia owner-resetu ani retencji PROD. Testy kosztów korzystają z odczytu właściciela, bez tworzenia nowych eksportów i płatnych zasobów.

## Kolejność odbioru

1. Dostęp i integralność danych: TC19–23, TC29, TC31.
2. Nowa gra, samouczek i aktualne objaśnienia: TC01–05, TC30 oraz TC43–45.
3. Gospodarka, ludzie, zdarzenia i minigry: TC06–18 oraz TC24–25.
4. Obecny archipelag i aktywowane API wymian: TC26–28; usługi niepotwierdzone oznaczyć BLOCKED.
5. Odczyt operacyjny i retencja w izolacji: TC32 i TC42.
6. Nowe projekty TC33–41 oraz TC46 dopiero po zatwierdzeniu decyzji i implementacji; obecnie DRAFT/BLOCKED. Papierowy prototyp planszówki można osobno ocenić bez przyznawania nagród online. Punkty stołowe, punkty za zadania online i punkty ligi są odrębnymi pojęciami. Zmiana członkostwa w sojuszu nie może obchodzić zamrożonego składu sezonu, a były członek traci bieżący dostęp do chatu.

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
| [HL-TC-0026 — Obecna druga wyspa kopiuje poziomy raz i zachowuje oba światy](manual/HL-TC-0026.md) | Archipelag — obecny baseline | P0 | READY | NOT RUN |
| [HL-TC-0027 — Towary: 1000 sztuk, 10 minut i pojedynczy rozładunek](manual/HL-TC-0027.md) | Archipelag — obecny baseline | P0 | READY | NOT RUN |
| [HL-TC-0028 — Rynek baseline: próg 6, prawdziwa oferta i brak podwójnego przyjęcia](manual/HL-TC-0028.md) | Handel — obecny baseline | P0 | READY | NOT RUN |
| [HL-TC-0029 — „Zacznij od nowa” nie jest pełnym resetem trzech kont](manual/HL-TC-0029.md) | Reset | P0 | READY | NOT RUN |
| [HL-TC-0030 — Wersja gry jest widoczna w Ustawieniach](manual/HL-TC-0030.md) | Interfejs i wydanie | P1 | READY | NOT RUN |
| [HL-TC-0031 — Promocja zachowuje kolejność DEV → PRE-PROD → PROD](manual/HL-TC-0031.md) | Wydanie | P0 | READY | NOT RUN |
| [HL-TC-0032 — Raport kosztów ostatnich 24 godzin ma rzeczywisty zakres i walutę](manual/HL-TC-0032.md) | Koszty | P1 | READY | NOT RUN |
| [HL-TC-0033 — Nazwa wyspy córki zawsze ma wymuszony prefiks matki](manual/HL-TC-0033.md) | Projekt archipelagu | P1 | DRAFT / BLOCKED | NOT RUN |
| [HL-TC-0034 — Założenie córki zabiera 6 osób w Domu i zostawia matce co najmniej 12](manual/HL-TC-0034.md) | Projekt kolonizacji | P0 | DRAFT / BLOCKED | NOT RUN |
| [HL-TC-0035 — Statek pasażerski przewozi do 100 osób w 30 minut](manual/HL-TC-0035.md) | Projekt przewozu ludzi | P0 | DRAFT / BLOCKED | NOT RUN |
| [HL-TC-0036 — Kolejne wyspy: progi poziomu, koszt i wejście przez Ratusz](manual/HL-TC-0036.md) | Projekt archipelagu | P0 | DRAFT / BLOCKED | NOT RUN |
| [HL-TC-0037 — Handel NPC i PvP działa równolegle z ceną maksymalną gry](manual/HL-TC-0037.md) | Projekt handlu | P0 | DRAFT / BLOCKED | NOT RUN |
| [HL-TC-0038 — Liga miesięczna: granice sezonu, drużyny i punktacja](manual/HL-TC-0038.md) | Projekt społeczności | P1 | DRAFT / BLOCKED | NOT RUN |
| [HL-TC-0039 — Dobroczynność przyjmuje wyłącznie kwalifikowane zarobione monety](manual/HL-TC-0039.md) | Projekt dobroczynności | P0 | DRAFT / BLOCKED | NOT RUN |
| [HL-TC-0040 — Dobroczynność: limit budżetu i kontrolowane skutki bonusu szczęścia](manual/HL-TC-0040.md) | Projekt dobroczynności | P0 | DRAFT / BLOCKED | NOT RUN |
| [HL-TC-0041 — Planszówka 2–6 osób: sesja 45–60 min i jednokrotny skutek online](manual/HL-TC-0041.md) | Projekt planszówki | P1 | DRAFT / BLOCKED | NOT RUN |
| [HL-TC-0042 — Trzy miesiące nieaktywności zachowują konto i jednorazowe uprawnienia](manual/HL-TC-0042.md) | Retencja | P0 | READY | NOT RUN |
| [HL-TC-0043 — Lekcja Budowy prowadzi przez szczegóły do widocznego priorytetu](manual/HL-TC-0043.md) | Samouczek i nawigacja | P1 | READY | NOT RUN |
| [HL-TC-0044 — Sześć kafelków nagrody ma równy układ 3×2](manual/HL-TC-0044.md) | Interfejs nagród | P1 | READY | NOT RUN |
| [HL-TC-0045 — Opis kart zasobów i podatków odpowiada rzeczywistym wartościom](manual/HL-TC-0045.md) | Objaśnienia gospodarki | P1 | READY | NOT RUN |
| [HL-TC-0046 — Sojusz przy Rankingu: członkostwo i chat gry](manual/HL-TC-0046.md) | Projekt sojuszy i komunikacji | P1 | DRAFT / BLOCKED | NOT RUN |

## Format zgłoszenia niezgodności

Po FAIL utwórz odrębny Bug: tytuł z obserwowalnym skutkiem, powiązany `HL-TC` i `HL-CHG`, środowisko/SHA, dane QA, najkrótsze kroki odtworzenia, wynik oczekiwany i rzeczywisty, dowód oraz wpływ. Nie dołączaj tokenów Firebase, haseł ani prywatnego payloadu. Naprawa nie zmienia starego FAIL na PASS: dopisz osobny wynik ponownego odbioru z nowym buildem.

## Archiwum i dane maszynowe

- [JSON nowych 46 przypadków](manual-test-cases.json) — stabilne ID, powiązania i status NOT RUN.
- [Historyczny plan v18 —155 scenariuszy](../TEST-SCENARIOS-v18.md) i [jego JSON](../test-scenarios-v18.json) pozostają archiwalną migawką. Nie podmieniono ich historycznych wyników; nowy zestaw grupuje główne ścieżki ręcznego odbioru i nowe projektowane funkcje.
- Wyniki lokalnej automatyzacji i promocji zapisuje [dziennik](../IMPLEMENTATION-LOG.md). Nie są one wykonaniem tego planu przez człowieka.
