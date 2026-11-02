# HARBORLIGHT — ręczny plan testów i osobne przypadki

**Zacznij od [listy do odhaczania](START-HERE.md) albo [interaktywnego raportu QA](qa-checklist.html).** Zestaw obejmuje **94 osobne przypadków**, w tym **TC0071–0094 dla DEV 0.12.0.0/v28**, zachowane TC0060–0070 dla v27 i wcześniejsze regresje. Wszystkie wyniki ręczne pozostają **NOT RUN**. Definicja scenariusza oraz sukces automatyzacji nie oznaczają jego wykonania.

## Jak odhaczać pojedyncze przypadki

1. Wpisz rzeczywisty build/SHA, środowisko i testera. Nie łącz wyników dwóch wydań bez ponownego wykonania odpowiednich kroków.
2. Otwórz osobną kartę `HL-TC-…`, przygotuj jej fixture i przejdź kroki z oczekiwaniami.
3. Zaznacz PASS, FAIL albo BLOCKED i zapisz krótki dowód. Pole wyboru na liście oznacza „wykonano i zapisano wynik”, nie automatyczny sukces.
4. Wyeksportuj raport JSON z interaktywnej listy. Możesz go wczytać na drugim urządzeniu. Wyniki tej listy nie wysyłają się automatycznie do Git ani do GCP.

W interaktywnej liście wynik, notatka, tester i opis buildu są zapisywane lokalnie jako **dokumentacja QA**, oddzielnie od gry; lista nie zapisuje i nie odczytuje wysp graczy. Eksport stanowi kopię na wypadek usunięcia danych przeglądarki. Widok pliku HTML na GitHub pokazuje kod — uruchom pobrany HTML lub opublikowaną stronę Pages.

## Metodyka

- **Epik / zmiana: ** stabilne wymaganie i decyzje w [rejestrze zmian](../tracking/CHANGE-REGISTER.md).
- **Test Case: ** osobny plik poniżej z danymi, krokami i oczekiwaniami. Pliki w Git nie są automatycznie natywnymi GitHub Issues.
- **Bug / incydent: ** dopiero po rzeczywistym FAIL: build, kroki, oczekiwany i uzyskany wynik oraz dowód.
- **Definicja READY** oznacza kompletny scenariusz, nie dostępność usługi ani wykonanie testu. **DRAFT / BLOCKED** wymaga doprecyzowania lub przygotowania funkcji. Wynik wykonania to niezależne NOT RUN/PASS/FAIL/BLOCKED.
- P0: dane, dostęp, środki i atomowość; P1: ważna reguła lub obsługa. Wynik wcześniejszej automatyzacji nigdy nie ustawia ręcznego PASS.

## Środowiska i dane

**DEV** to przestrzeń robocza i deweloperski podgląd Pages. **PRE-PROD** to `https://harborlight-dev.web.app` w projekcie GCP `harborlight-dev`. **PROD** nie jest objęty nowym GO. Bieżący [rejestr środowisk](../ENVIRONMENT-STATUS.md) rozstrzyga, które funkcje rzeczywiście są opublikowane. Push i Pages nie są promocją do GCP.

Historyczny baseline definicji to v22.1 / `092e75226fbb14cab09826f313e11d10891966d8`. Aktualny PRE-PROD to **0.11.0.0**, źródło `c7c39742594599c54ee8b074b5c313efd88af4cb`, [wdrożenie 41362782175](https://github.com/ksobczak321-oss/gra/actions/runs/41362782175). Nowy pakiet **0.12.0.0/v28** obejmuje tylko DEV; TC0071–0094 odbieramy na jego rzeczywistym buildzie. Dawne CI i promocje nie są ręcznym wynikiem v28 ani aktywacją usług.

W v28 tutorial ma **33 opisy** bez ikony czasu, a nowy program 6 samouczka ma **25 lekcji i pierwszych 3 tragarzy**. Nowe budowy mają zwykłe czasy, a kurs prowadzi przez rzeczywiste przyspieszenia za monety. Starsze programy 3/4/5 i rozpoczęte projekty zachowują zapisane warunki. Punkty Domu są wyłącznie zbiorowe i gromadzą się do 7 niewydanych porcji. O północy każdy mieszkaniec traci 1 punkt, przy zachowaniu zwykłego+2/h oraz ochron. Modlitwa to osobny przydział z Domu.

**Stosowanie wcześniejszych kart: ** TC0056 i starsze karty dotyczące sześciu tragarzy/turbo odbierają zapisane starsze programy; nie są oczekiwaniem dla nowego kursu 6. Indywidualne rozdawanie i automat 23:58 opisane w TC0010/0058/0065 pozostają historią dawnych fixture — bieżący bank zbiorowy odbiera TC0079. Dawne zakresy 33/34 kroków rozróżnia TC0075. Cennik premium TH4/PLN TH1 zastępuje TC0082. Nie zaliczamy sprzecznego historycznego kroku na nowym buildzie; zapisz wariant fixture i odsyłacz do aktualnego przypadku. Niezmienione oczekiwania (tożsamość, chmura, limity, jednokrotność) nadal stanowią regresję.

Profile QA są specyfikacją danych do przygotowania w izolowanym harnessie, nie dodatkowymi kontami istniejącymi w GCP. Brak fixture, kontrolowanego zegara lub potrzebnej usługi oznacza BLOCKED z przyczyną. Nie zmieniaj czasu komputera i prawdziwej bazy, aby wymusić warunek testowy. Lokalny nietrwały podgląd nie zastępuje testu trwałości chmury.

Nie używaj `admin1`–`admin3` jako danych jednorazowych; nie resetuj i nie podmieniaj ich historii. Osobne historyczne zlecenie resetu po promocji nie uprawnia do dowolnego czyszczenia danych podczas QA. Próby płatności i dobroczynności korzystają z oznaczonej symulacji DEV, bez rzeczywistych przelewów.

## Proponowana kolejność odbioru

1. Nowy zakres DEV 0.12.0.0/v28: TC0071–0094, najpierw dane i płatności, potem kurs/opisy/misje/społeczność. Następnie niezmienione oczekiwania TC0060–0070 i starsza regresja na opisanym wariancie fixture.
2. Dostęp i integralność: TC19–23, TC29, TC31.
3. Nowa gra i czytelność: TC01–05, TC30, TC43–45 oraz powroty w Pomocy TC47, prowadzenie po mapie TC51 i przegląd polszczyzny TC52–53.
4. Gospodarka i mieszkańcy: TC06–18, TC24–25.
5. Archipelag i handel: migracja TC26, transport towarów TC27, transakcje TC28, nowe reguły TC33–37.
6. Sojusze i liga: TC46, prywatne wiadomości TC48, liga TC38 i sloty/dwa zadania TC49.
7. Dobroczynność i pochodzenie monet: TC39–40; tylko izolowana symulacja.
8. Odczyt operacyjny i retencja: TC32, TC42. Papierowa gra i druk: TC50. **TC41 pozostaje BLOCKED: integracja planszówki online jest wyłączona z GO.**

TC26 jest obecnie testem zachowania wcześniejszych dwóch światów podczas migracji; nowa kolonizacja ma osobne TC34–36. TC28 sprawdza integralność sprzedaży materiałów za monety, a TC37 pułap ceny i równoległy handel NPC. Nie zaliczamy nowej logiki na podstawie dawnego darmowego założenia drugiej wyspy lub barteru.

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
| [HL-TC-0054 — Nazwa 3–40 znaków i zaakceptowane opisy nie zmieniają starej wyspy](manual/HL-TC-0054.md) | Nazwa i tutorial | P0 | READY | NOT RUN |
| [HL-TC-0055 — Oba narzędzia nauki wznawiają miejsce i chronią od automatycznych reklam](manual/HL-TC-0055.md) | Tutorial, samouczek i aktywny czas | P0 | READY | NOT RUN |
| [HL-TC-0056 — Nowy kurs 25 lekcji zaczyna się od 6 tragarzy i kończy na Ratuszu 2, finansując Latarnię](manual/HL-TC-0056.md) | Praktyczny kurs v26 | P0 | READY | NOT RUN |
| [HL-TC-0057 — Turbo poziomów 1–2 i blokady odblokowania obejmują wszystkie ścieżki budowy](manual/HL-TC-0057.md) | Logistyka i rozwój | P0 | READY | NOT RUN |
| [HL-TC-0058 — Magazyn i Dom są czytelne, a okno reklamy ma rozdzielone przyciski](manual/HL-TC-0058.md) | Panele gospodarki i reklamy | P1 | READY | NOT RUN |
| [HL-TC-0059 — Ranking, czaty i Pomagam są osobne, a demonstracja nie udaje realnych operacji](manual/HL-TC-0059.md) | Społeczność i dobroczynność DEV | P0 | READY | NOT RUN |
| [HL-TC-0060 — Zatwierdzone opisy i 34 kroki pokazują rzeczywiste dane gracza](manual/HL-TC-0060.md) | Opisy i tutorial | P1 | READY | NOT RUN |
| [HL-TC-0061 — Pomoc pod ? wznawia oba tryby i wyjaśnia wyjście z tutoriala](manual/HL-TC-0061.md) | Nawigacja i zapis nauki | P0 | READY | NOT RUN |
| [HL-TC-0062 — Samouczek pokazuje czas trwającej budowy i prawdziwy efekt strzałką](manual/HL-TC-0062.md) | Efekty, nagrody i zakończenie | P0 | READY | NOT RUN |
| [HL-TC-0063 — Dojście i powrót trwają 2 minuty, a załadowany tragarz kończy dostawę](manual/HL-TC-0063.md) | Pracownicy i transport | P0 | READY | NOT RUN |
| [HL-TC-0064 — 48 mieszkańców może mieć 24 łóżka, a punkty Domu dostają zakwaterowani](manual/HL-TC-0064.md) | Mieszkania i szczęście Domu | P0 | READY | NOT RUN |
| [HL-TC-0065 — Brak miejsca dotyczy wydajności i jedzenia konkretnej osoby](manual/HL-TC-0065.md) | Gospodarka mieszkańców | P0 | READY | NOT RUN |
| [HL-TC-0066 — Chmurka postępu daje stabilne i prawdziwe ETA](manual/HL-TC-0066.md) | Prognozy i interfejs budowy | P0 | READY | NOT RUN |
| [HL-TC-0067 — Główna ścieżka Latarni ma 8 etapów i pamięta rzeczywisty cel](manual/HL-TC-0067.md) | Misje Latarni | P0 | READY | NOT RUN |
| [HL-TC-0068 — Pomoc i ratunek wracają do kolejnego etapu bez kasowania postępu](manual/HL-TC-0068.md) | Misje5/3 i terminy | P0 | READY | NOT RUN |
| [HL-TC-0069 — Zadania są wykonalne przy realnych zasobach, produkcji i dostawach](manual/HL-TC-0069.md) | Wykonalność gospodarcza | P0 | READY | NOT RUN |
| [HL-TC-0070 — Migracja, nieobecność i powroty nie dublują mieszkań ani misji](manual/HL-TC-0070.md) | Trwałość i integralność | P0 | READY | NOT RUN |
| [HL-TC-0071 — Nowy kurs wymaga trzech tragarzy, starszy zachowuje szóstkę i swoje zaliczenia](manual/HL-TC-0071.md) | Samouczek i migracja | P0 | READY | NOT RUN |
| [HL-TC-0072 — Lekcja Ratusza uczy rzeczywistej dostawy i skrócenia budowy](manual/HL-TC-0072.md) | Prowadzenie i monety | P0 | READY | NOT RUN |
| [HL-TC-0073 — Gospodarstwo kupione w lekcji nie pobiera równocześnie własnych materiałów](manual/HL-TC-0073.md) | Pełne kupno | P0 | READY | NOT RUN |
| [HL-TC-0074 — Lekcja jedenasta uczy priorytetu odbioru, a pełny magazyn ma zrozumiałą instrukcję](manual/HL-TC-0074.md) | Transport produktów | P1 | READY | NOT RUN |
| [HL-TC-0075 — Tutorial trzydziestu trzech opisów wraca przez Pomoc i wskazuje znak zapytania](manual/HL-TC-0075.md) | Oprowadzanie i Pomoc | P1 | READY | NOT RUN |
| [HL-TC-0076 — Cały polski interfejs szczęścia używa punktów, a inne procenty pozostają poprawne](manual/HL-TC-0076.md) | Polskie teksty | P1 | READY | NOT RUN |
| [HL-TC-0077 — Wiadomość końca przestoju opisuje wznowienie albo odwołanie z pozostawionym towarem](manual/HL-TC-0077.md) | Powiadomienia pracy | P1 | READY | NOT RUN |
| [HL-TC-0078 — Pierwsze wejście nowego dnia pokazuje tylko dostępną premię lojalności](manual/HL-TC-0078.md) | Lojalność i kalendarz | P1 | READY | NOT RUN |
| [HL-TC-0079 — Bank Domu kumuluje siedem porcji według zakwaterowanych i nie odtwarza ich przy wczytaniu](manual/HL-TC-0079.md) | Dom i trwałość | P0 | READY | NOT RUN |
| [HL-TC-0080 — Północ odbiera jeden punkt także offline, bez nowej krzywej szczęścia](manual/HL-TC-0080.md) | Szczęście i czas | P0 | READY | NOT RUN |
| [HL-TC-0081 — Modlitwa zachowuje czas całkowity, koszt, brak podatku i sześciogodzinny efekt](manual/HL-TC-0081.md) | Modlitwa | P0 | READY | NOT RUN |
| [HL-TC-0082 — Usługi od Ratusza jeden używają monet; Paynow kupuje tylko monety od trzeciego poziomu](manual/HL-TC-0082.md) | Płatności i dodatkowy czas | P0 | READY | NOT RUN |
| [HL-TC-0083 — Statek zwiększa towar za pięćdziesiąt monet, a przemianowanie córki nie dubluje nazwy](manual/HL-TC-0083.md) | Archipelag | P0 | READY | NOT RUN |
| [HL-TC-0084 — Zwykłe zadania mają realne pół godziny, dopasowaną nagrodę i wspólną cenę mieszkańca](manual/HL-TC-0084.md) | Wykonalność zadań | P0 | READY | NOT RUN |
| [HL-TC-0085 — Po ostatniej nagrodzie kursu pojawia się fabuła ośmiu zadań i zachowana kolejka rozdziałów](manual/HL-TC-0085.md) | Fabuła Latarni | P0 | READY | NOT RUN |
| [HL-TC-0086 — Narracyjne nagrody pokazują faktycznie przyjętych ludzi i czas produkcji razy cztery](manual/HL-TC-0086.md) | Nagrody i produkcja | P0 | READY | NOT RUN |
| [HL-TC-0087 — Siedem dni ligi punktuje także małe składy, a odejście nie usuwa wyniku sezonowego](manual/HL-TC-0087.md) | Liga i sojusze | P0 | READY | NOT RUN |
| [HL-TC-0088 — Playoffy rozstrzygają remisy i wypłacają cztery warstwy nagród jednokrotnie](manual/HL-TC-0088.md) | Liga i puchar | P0 | READY | NOT RUN |
| [HL-TC-0089 — Czat egzekwuje tysiąc znaków i wspólny limit konta między pokojami](manual/HL-TC-0089.md) | Czat | P0 | READY | NOT RUN |
| [HL-TC-0090 — Pomagam kwalifikuje tylko właściwe monety i jasno symuluje przelew z premią](manual/HL-TC-0090.md) | Dobroczynność | P0 | READY | NOT RUN |
| [HL-TC-0091 — Kurs przechodzony w normalnym tempie nie blokuje się na materiałach lekcji trzynastej](manual/HL-TC-0091.md) | Samouczek i bilans | P0 | READY | NOT RUN |
| [HL-TC-0092 — Zakup statku po utracie odpowiedzi nie zmienia płatnika i nie obciąża drugi raz](manual/HL-TC-0092.md) | Chmura i statek | P0 | READY | NOT RUN |
| [HL-TC-0093 — Pomagam po odczycie lub resecie nie odtwarza starej ewidencji, a błąd chmury nie daje premii](manual/HL-TC-0093.md) | Trwały mock dobroczynności | P0 | READY | NOT RUN |
| [HL-TC-0094 — Nowa rejestracja zapisuje Regulamin draft5 i niezmienioną Politykę prywatności draft4](manual/HL-TC-0094.md) | Dokumenty i konto | P0 | READY | NOT RUN |

## Raport i zgłoszenia

[Lista START-HERE](START-HERE.md) zawiera szablon pojedynczego wyniku. Interaktywny raport pozwala filtrować przypadki, zapisywać notatki i pobrać JSON. Zrzuty oraz logi nie mogą zawierać tokenów ani prywatnych danych. Po FAIL zgłoszenie błędu odnosi się do stabilnego ID testu i SHA buildu.

Kanoniczna lista: [manual-test-cases.json](manual-test-cases.json). Interaktywną listę i Markdown odtwarza `python3 scripts/build_manual_checklist.py`; `--check` sprawdza zgodność. Indywidualne karty są wersjonowanymi dokumentami. Importer [publish_tracking_issues.py](../../scripts/publish_tracking_issues.py) może później opublikować je jako osobne Issues dopiero w uwierzytelnionej sesji właściciela. W tym zestawie nie utworzono fikcyjnych numerów Issues.

Starszy [zestaw 155 scenariuszyv18](../TEST-SCENARIOS-v18.md), [jego JSON](../test-scenarios-v18.json) i Excel 11 są archiwalnymi migawkami. Nie są bieżącym wynikiem ręcznego odbioru nowego DEV. Rzeczywiste wyniki automatyzacji i promocji zapisuje [dziennik](../IMPLEMENTATION-LOG.md).
