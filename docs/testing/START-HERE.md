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
