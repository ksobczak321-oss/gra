# Zacznij tutaj — ręczny odbiór HARBORLIGHT

Każdy wiersz prowadzi do osobnego scenariusza. Wszystkie wyniki startowe to **NOT RUN**. Zaznaczenie pola oznacza wykonanie i zapisanie wyniku, a nie automatycznie PASS.

Najwygodniej otworzyć [interaktywną listę](qa-checklist.html): wynik PASS / FAIL / BLOCKED, notatki i dowody zapisują się w tej przeglądarce; przyciskiem „Eksportuj raport JSON” pobierz kopię. Ten plik i jego wyniki są dokumentacją QA, nie zapisem wyspy. Na GitHub pobierz HTML lub użyj podglądu Pages po jego publikacji; sam widok kodu HTML nie uruchamia listy.

1. Wpisz rzeczywisty build/SHA, środowisko, datę i testera. DEV oznacza przestrzeń roboczą/Pages, PRE-PROD — `harborlight-dev.web.app`; nowy zakres nie jest automatycznie wdrożony w chmurze.
2. Otwórz kartę, przygotuj wskazane dane, wykonaj wszystkie kroki. Brak fixture, usługi, dostępu albo zatwierdzonej reguły to **BLOCKED** z przyczyną.
3. Zapisz wynik i dowód. Przy FAIL opisz oczekiwane i rzeczywiste zachowanie; dopiero wtedy powstaje zgłoszenie błędu. Wyniki automatyzacji nie zaliczają testu ręcznego.
4. Eksportuj raport po każdej sesji. Pamięć przeglądarki może zostać usunięta; eksport umożliwia wznowienie na innym urządzeniu. Raport nie wysyła się automatycznie do Git ani do GCP.

**Dane:** używaj profili QA i izolowanej bazy/harnessu. Nie resetuj ani nie podmieniaj historii `admin1`–`admin3`. Testy przelewów używają symulacji DEV. Integracja planszówki online pozostaje poza zakresem i ma odrębny BLOCKED; druk i gra przy stole mają własny scenariusz.

Pełna metodyka i zależności: [MANUAL-TEST-PLAN.md](MANUAL-TEST-PLAN.md). Bieżące wydania: [ENVIRONMENT-STATUS.md](../ENVIRONMENT-STATUS.md).

## Lista do odhaczania

- [ ] [HL-TC-0001 — Pierwsze wejście zatrzymuje czas do końca oprowadzania](manual/HL-TC-0001.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0002 — Nazwa i kolejność podświetleń na komputerze i telefonie](manual/HL-TC-0002.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0003 — Wcześniejsze rozdanie szczęścia usuwa przyszłą lekcję bez skrzyni](manual/HL-TC-0003.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0004 — Dwa zadania o tragarzach wymagają dwóch faktycznych przydziałów](manual/HL-TC-0004.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0005 — Końcowe rozliczenie kursu: pełny magazyn bez zaległych skrzyń](manual/HL-TC-0005.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0006 — Bonusowe materiały są wydawalne poza limitem zwykłego magazynu](manual/HL-TC-0006.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0007 — Dostawa, budowa i popup rzeczywistego skrócenia czasu](manual/HL-TC-0007.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0008 — Smutna buźka odzwierciedla rzeczywistą karę przestoju](manual/HL-TC-0008.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0009 — Ulepszanie ścieżek zużywa kamień i nie przeskakuje poziomów](manual/HL-TC-0009.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0010 — Dom pozwala przydzielać ludzi i wydać dzienną pulę szczęścia](manual/HL-TC-0010.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0011 — Powitalne minimum 20% obejmuje nowych mieszkańców](manual/HL-TC-0011.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0012 — Aktywność ×2 i kara dopiero za czas po 48 h nieobecności](manual/HL-TC-0012.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0013 — Darmowe błogosławieństwo i okres łaski Kaplicy](manual/HL-TC-0013.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0014 — Wrak, skarb i zła prognoza respektują ochronę Latarni](manual/HL-TC-0014.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0015 — Wybór kulek i trójek jest jawny i mieści się na telefonie](manual/HL-TC-0015.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0016 — Nagrody rund, dobrowolny czas i ryzyko utraty puli](manual/HL-TC-0016.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0017 — Zapamiętany harmonogram reklamy i ekspedycji liczy aktywne minuty](manual/HL-TC-0017.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0018 — Symulacja Paynow, pojedynczy przycisk i uprawnienie bez reklam](manual/HL-TC-0018.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0019 — Rejestracja wymaga odrębnych potwierdzeń dokumentów](manual/HL-TC-0019.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0020 — Automatyczny zapis co 30 sekund i wznowienie na drugim urządzeniu](manual/HL-TC-0020.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0021 — Dwa urządzenia i konflikt zapisu nie nadpisują potwierdzonego świata](manual/HL-TC-0021.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0022 — Brak sieci zatrzymuje mutacje i nie tworzy nowej wyspy](manual/HL-TC-0022.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0023 — Wylogowanie z Ustawień i trwała granica bezczynności](manual/HL-TC-0023.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0024 — Usuwanie powiadomień dotyczy tylko przeczytanych i respektuje filtry](manual/HL-TC-0024.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0025 — Awans Ratusza 3→4 wymaga 54 mieszkańców, inne budynki nie](manual/HL-TC-0025.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0026 — Migracja wcześniejszych dwóch wysp zachowuje światy i jednorazowo skopiowane poziomy](manual/HL-TC-0026.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0027 — Towary: 1000 sztuk, 10 minut i pojedynczy rozładunek](manual/HL-TC-0027.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0028 — Rynek graczy: transakcja materiał–monety i brak podwójnego przyjęcia](manual/HL-TC-0028.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0029 — „Zacznij od nowa” nie jest pełnym resetem trzech kont](manual/HL-TC-0029.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0030 — Wersja gry jest widoczna w Ustawieniach](manual/HL-TC-0030.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0031 — Promocja zachowuje kolejność DEV → PRE-PROD → PROD](manual/HL-TC-0031.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0032 — Raport kosztów ostatnich 24 godzin ma rzeczywisty zakres i walutę](manual/HL-TC-0032.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0033 — Nazwa wyspy córki zawsze ma wymuszony prefiks matki](manual/HL-TC-0033.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0034 — Założenie córki zabiera 6 osób w Domu i zostawia matce co najmniej 12](manual/HL-TC-0034.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0035 — Statek pasażerski przewozi do 100 osób w 30 minut](manual/HL-TC-0035.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0036 — Kolejne wyspy: progi poziomu, koszt i wejście przez Ratusz](manual/HL-TC-0036.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0037 — Handel NPC i PvP działa równolegle z ceną maksymalną gry](manual/HL-TC-0037.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0038 — Liga miesięczna: granice sezonu, drużyny i punktacja](manual/HL-TC-0038.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0039 — Dobroczynność przyjmuje wyłącznie kwalifikowane zarobione monety](manual/HL-TC-0039.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0040 — Dobroczynność: limit budżetu i kontrolowane skutki bonusu szczęścia](manual/HL-TC-0040.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0041 — Planszówka 2–6 osób: sesja 45–60 min i jednokrotny skutek online](manual/HL-TC-0041.md) · P1 · definicja: **DRAFT / BLOCKED** · wynik: **NOT RUN**
- [ ] [HL-TC-0042 — Trzy miesiące nieaktywności zachowują konto i jednorazowe uprawnienia](manual/HL-TC-0042.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0043 — Lekcja Budowy prowadzi przez szczegóły do widocznego priorytetu](manual/HL-TC-0043.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0044 — Sześć kafelków nagrody ma równy układ 3×2](manual/HL-TC-0044.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0045 — Opis kart zasobów i podatków odpowiada rzeczywistym wartościom](manual/HL-TC-0045.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0046 — Sojusz przy Rankingu: członkostwo i chat gry](manual/HL-TC-0046.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0047 — Pomoc rozdziela powrót do tutoriala i praktycznego samouczka](manual/HL-TC-0047.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0048 — Prywatny czat1:1 nie ujawnia rozmów ani danych kont osobom trzecim](manual/HL-TC-0048.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0049 — Liga: dwa zadania dziennie wyłącznie w ogłoszonych slotach Warszawy](manual/HL-TC-0049.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0050 — Planszówka: komplet druku, czytelne kody i samodzielna sesja przy stole](manual/HL-TC-0050.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0051 — Samouczek wskazuje budynek na mapie i czeka na rzeczywiste kliknięcie](manual/HL-TC-0051.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0052 — Polszczyzna wszystkich 25 lekcji jest naturalna i zgodna z klikanymi elementami](manual/HL-TC-0052.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0053 — Polska wersja całej gry: panele, błędy, akcje i powiadomienia](manual/HL-TC-0053.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0054 — Nazwa 3–40 znaków i zaakceptowane opisy nie zmieniają starej wyspy](manual/HL-TC-0054.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0055 — Oba narzędzia nauki wznawiają miejsce i chronią od automatycznych reklam](manual/HL-TC-0055.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0056 — Nowy kurs 25 lekcji zaczyna się od 6 tragarzy i kończy na Ratuszu 2, finansując Latarnię](manual/HL-TC-0056.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0057 — Turbo poziomów 1–2 i blokady odblokowania obejmują wszystkie ścieżki budowy](manual/HL-TC-0057.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0058 — Magazyn i Dom są czytelne, a okno reklamy ma rozdzielone przyciski](manual/HL-TC-0058.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0059 — Ranking, czaty i Pomagam są osobne, a demonstracja nie udaje realnych operacji](manual/HL-TC-0059.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0060 — Zatwierdzone opisy i 34 kroki pokazują rzeczywiste dane gracza](manual/HL-TC-0060.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0061 — Pomoc pod ? wznawia oba tryby i wyjaśnia wyjście z tutoriala](manual/HL-TC-0061.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0062 — Samouczek pokazuje czas trwającej budowy i prawdziwy efekt strzałką](manual/HL-TC-0062.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0063 — Dojście i powrót trwają 2 minuty, a załadowany tragarz kończy dostawę](manual/HL-TC-0063.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0064 — 48 mieszkańców może mieć 24 łóżka, a punkty Domu dostają zakwaterowani](manual/HL-TC-0064.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0065 — Brak miejsca dotyczy wydajności i jedzenia konkretnej osoby](manual/HL-TC-0065.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0066 — Chmurka postępu daje stabilne i prawdziwe ETA](manual/HL-TC-0066.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0067 — Główna ścieżka Latarni ma 8 etapów i pamięta rzeczywisty cel](manual/HL-TC-0067.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0068 — Pomoc i ratunek wracają do kolejnego etapu bez kasowania postępu](manual/HL-TC-0068.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0069 — Zadania są wykonalne przy realnych zasobach, produkcji i dostawach](manual/HL-TC-0069.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0070 — Migracja, nieobecność i powroty nie dublują mieszkań ani misji](manual/HL-TC-0070.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0071 — Nowy kurs wymaga trzech tragarzy, starszy zachowuje szóstkę i swoje zaliczenia](manual/HL-TC-0071.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0072 — Lekcja Ratusza uczy rzeczywistej dostawy i skrócenia budowy](manual/HL-TC-0072.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0073 — Gospodarstwo kupione w lekcji nie pobiera równocześnie własnych materiałów](manual/HL-TC-0073.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0074 — Lekcja jedenasta uczy priorytetu odbioru, a pełny magazyn ma zrozumiałą instrukcję](manual/HL-TC-0074.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0075 — Tutorial trzydziestu trzech opisów wraca przez Pomoc i wskazuje znak zapytania](manual/HL-TC-0075.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0076 — Cały polski interfejs szczęścia używa punktów, a inne procenty pozostają poprawne](manual/HL-TC-0076.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0077 — Wiadomość końca przestoju opisuje wznowienie albo odwołanie z pozostawionym towarem](manual/HL-TC-0077.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0078 — Pierwsze wejście nowego dnia pokazuje tylko dostępną premię lojalności](manual/HL-TC-0078.md) · P1 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0079 — Bank Domu kumuluje siedem porcji według zakwaterowanych i nie odtwarza ich przy wczytaniu](manual/HL-TC-0079.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0080 — Północ odbiera jeden punkt także offline, bez nowej krzywej szczęścia](manual/HL-TC-0080.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0081 — Modlitwa zachowuje czas całkowity, koszt, brak podatku i sześciogodzinny efekt](manual/HL-TC-0081.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0082 — Usługi od Ratusza jeden używają monet; Paynow kupuje tylko monety od trzeciego poziomu](manual/HL-TC-0082.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0083 — Statek zwiększa towar za pięćdziesiąt monet, a przemianowanie córki nie dubluje nazwy](manual/HL-TC-0083.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0084 — Zwykłe zadania mają realne pół godziny, dopasowaną nagrodę i wspólną cenę mieszkańca](manual/HL-TC-0084.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0085 — Po ostatniej nagrodzie kursu pojawia się fabuła ośmiu zadań i zachowana kolejka rozdziałów](manual/HL-TC-0085.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0086 — Narracyjne nagrody pokazują faktycznie przyjętych ludzi i czas produkcji razy cztery](manual/HL-TC-0086.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0087 — Siedem dni ligi punktuje także małe składy, a odejście nie usuwa wyniku sezonowego](manual/HL-TC-0087.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0088 — Playoffy rozstrzygają remisy i wypłacają cztery warstwy nagród jednokrotnie](manual/HL-TC-0088.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0089 — Czat egzekwuje tysiąc znaków i wspólny limit konta między pokojami](manual/HL-TC-0089.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0090 — Pomagam kwalifikuje tylko właściwe monety i jasno symuluje przelew z premią](manual/HL-TC-0090.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0091 — Kurs przechodzony w normalnym tempie nie blokuje się na materiałach lekcji trzynastej](manual/HL-TC-0091.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0092 — Zakup statku po utracie odpowiedzi nie zmienia płatnika i nie obciąża drugi raz](manual/HL-TC-0092.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0093 — Pomagam po odczycie lub resecie nie odtwarza starej ewidencji, a błąd chmury nie daje premii](manual/HL-TC-0093.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0094 — Nowa rejestracja zapisuje Regulamin draft5 i niezmienioną Politykę prywatności draft4](manual/HL-TC-0094.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0095 — Wykonalność nie przedłuża czasowej premii na całe okno zadania](manual/HL-TC-0095.md) · P0 · definicja: **READY** · wynik: **NOT RUN**
- [ ] [HL-TC-0096 — Przewinięty długi tutorial telefonu zachowuje widoczny przycisk wyjścia](manual/HL-TC-0096.md) · P0 · definicja: **READY** · wynik: **NOT RUN**

## Wynik pojedynczego przypadku

```text
Przypadek: HL-TC-…
Build/SHA i środowisko:
Tester i data:
Fixture/dane:
Wynik: PASS / FAIL / BLOCKED
Oczekiwane:
Uzyskane:
Dowód (zrzut/link/log bez tokenów):
Numer błędu, jeśli utworzono:
```

<!-- Generated by scripts/build_manual_checklist.py; canonical cases: manual-test-cases.json. -->
