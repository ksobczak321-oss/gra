# Arkusz zasad HARBORLIGHT

Aktualizacja17listopada: master dla **0.15.1.0/cache15/CSSlayout2** ma źródło `76a663da9e093d909e6289286649c5c925139614`, 157arkuszy/57bieżących/61971wierszy, 7672350bajtów iSHA256`ed53b12ff3b4ace2f49fd978a10074ce4b7715e3e8458da957ea7dc781769b1d`. Obejmuje doradcę,3kroki startu i175rekordów5fioletowychzakładek. Budowa i świeżevalidate-onlyPASS;117źródeł,12formuł/160porównań,100archiwalnycharkuszy/220części/48komentarzy/4982wyników zachowane. Excel6/413/Cpusta ma źródłoabacd3fffc7fe033fca6c3a1e9003bb688aa4afa iSHA256`aca64c25f79964e6129cc1da09c65fb033e9993b7ce21d6b47d1ce6890f69b3a`. WłasneCI44164876130 iPages44164876499SUCCESS; publikacja `4dcc34ec3b462992330f88a22062070fcc0f7092`, tag `dev-0.15.1.0-20261117` potwierdzonyzdalnie. [Aktualne dowody](../v32/KINGDOM-ADVISOR-EVIDENCE.json).

Poniższy opis156arkuszy/e23 dokumentuje poprzednią zamrożoną generację, nie aktualną publikację.


Bieżący pełny master to **[HARBORLIGHT15-zasady.xlsx](HARBORLIGHT15-zasady.xlsx)**, obejmujący zasady v32 gry 0.15.0.2 ze źródła `e23b713ddbaef3ea6b0507c56a466f23c1f0aa92`. Budowa i świeża walidacja: **PASS**. Artefakt gotowy do publikacji w Git; wynik nowego CI należy sprawdzić w Actions. [Raport walidacji](HARBORLIGHT15-zasady-walidacja.json) · [Dokładne dowody](../v32/MASTER-WORKBOOK15-EVIDENCE.json).

Plik ma **156 arkuszy: 100 archiwalnych i 56 bieżących (51 widocznych, 5 ukrytych)**, 61 262 bieżące wiersze oraz 7 581 368 bajtów. SHA-256: `b45a9f67ebcc1653ce2fc5413e5dbd9a42b32c103a52b4eda06db647b5dd1f11`.

| Grupa zakładek v15 | Zawartość |
|---|---|
| Start, poziomy, budynki i gospodarka | Parametry startowe, poziomy 1–100, 1901 wierszy budynków, 2000 receptur i wydajności, 1603 wiersze poziomów badań, produkcja i czasy |
| Transport, mieszkańcy, kursy i wojsko | Trasy, ścieżki, przyrost i odpływ ludności, szkolenia, wyprawy, warunki, limity i sprawdzone przykłady |
| Tutorial, samouczek i teksty | 56 kroków i ich warianty, 25 lekcji, 480 pozycji katalogu, 2525 tłumaczeń, opisy budynków, teksty HTML i teksty warunkowe ze źródłami |
| Minigry, przygody i kampania | 24 mechaniki, 120 układów (115 sprawdzonych solverem i 5 układów kulki sprawdzonych strukturalnie), 100 wariantów i 560 sal opowieści, 152 etapy, plan odniesienia na 50 dni, Teatr |
| Symulacje i ich ślad | Rzeczywiste 24 h bezczynności, 24 h produkcji i 72 h rozwoju, założenia, zasoby, polecenia oraz odrębne dowody historyczne |
| Kalkulator i kontrola źródeł | 12 nowych formuł z zapisanymi wynikami, 160 porównań do kodu, 114 źródeł i ich odciski |
| Pięć ukrytych bieżących indeksów | Funkcje, stałe, warunki, pełny kod i dane kalkulatora; można odkryć je w Excelu |
| Archiwum 14 | 100 arkuszy, 220 części ZIP, 48 komentarzy i 4982 wcześniejsze wyniki formuł zachowane bez zmian |

**[HARBORLIGHT14-zasady.xlsx](HARBORLIGHT14-zasady.xlsx)** pozostaje niezmienionym archiwum 0.14/v31. SHA-256: `7f7ae4918964309b8e2b391edf8999d366dbbd0dcfa2676692984853e10962b6`. Osobny **[Excel do redakcji sześciu wybranych zakładek](HARBORLIGHT15-redakcja-6-zakladek.xlsx)** ma 413 wierszy w kolumnach A/B/C, z pustą kolumną C; nie zmieniano go w tym zadaniu.

Symulacja 72 h kończy się na Ratuszu 2 i Magazynie 2, z 64 osobami, 55 pracownikami, 2371 monetami i 6 przyjętymi rozbudowami, przy 36 łóżkach. W 22 ze 143 prób prawidłowo odmówiono punktów Domu. Założenie 3 h aktywności dziennie i stały seed są jawne. To wynik jednej strategii, bez twierdzenia o symulacji 50 dni, optymalnym graczu lub pomiarze 150 h ludzkiej zabawy. Niedokończona próba 7 dni nie została włączona. [Surowa symulacja](../design/WORKBOOK-V32-SIMULATION.json) zawiera odciski źródeł i eksportera.

Pełne źródła, ślad AST i limity UTF-16 są kontrolowane. Świeże `--validate-only` ponownie wykonuje rzeczywiste eksporty modeli i tekstów. Kalkulator ma wyniki niezależnego ewaluatora; nie deklarujemy przeliczenia przez LibreOffice.

Regenerowanie i sprawdzanie wymagają Pythona (`openpyxl`, `lxml`) oraz Node.js:

```sh
python3 scripts/build_workbook_v15.py
python3 scripts/build_workbook_v15.py --validate-only
python3 scripts/build_workbook_v15.py --refresh-simulations
```

Pierwsze polecenie buduje skoroszyt z bieżących eksportów i przypiętego snapshotu symulacji; drugie go sprawdza. `--refresh-simulations` ponownie uruchamia modele i aktualizuje snapshot oraz artefakty. Może zająć kilka minut pracy CPU; nie jest kontrolą tylko do odczytu.

Ser nadal powstaje w Gospodarstwie od poziomu 6; otręby i pasza nie są wdrożone. Master pokazuje rzeczywisty kod i zaległości. Zadanie nie zmienia gry, publicznych plików, backendu, redakcyjnego Excela/MERGE/odcisków, kont ani wdrożeń. Odebrane DEV/PRE-PROD pozostaje 37061c/c4/cache13. Nie wykonano nowego resetu ani działań PROD/DNS. Niewybrane zakładki oryginalnego uploadu redakcyjnego pozostają poza zakresem. Ręczny odbiór użytkownika: NOT_RUN.

## Historyczny opis Excela14

Bieżący plik: **[HARBORLIGHT14-zasady.xlsx](HARBORLIGHT14-zasady.xlsx)** — aktualne zasady kodu DEV **0.14.0.0 / v31**, odczytane z rzeczywistych eksportów modułów gry.

[Pobierz Excel 14](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT14-zasady.xlsx). Jeśli GitHub pokazuje stronę pliku, wybierz **Download raw file**. Plik otworzysz w Excelu, LibreOffice Calc lub Arkuszach Google.

**Arkusz opisuje kod i katalog scenariuszy. Nie potwierdza publikacji nowego DEV ani promocji.** Odebrany PRE-PROD pozostaje **0.13.1.0**, źródło `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`, własne CI `41671140612` i deploy `41673824262` / próba 1 SUCCESS. Własne dowody nowszego wydania publikuje [rejestr środowisk](../ENVIRONMENT-STATUS.md).

| Widoczna zakładka | Zawartość |
|---|---|
| Przeczytaj v14 | Bieżący zakres, warunki odbioru, ważne zależności i granice dowodów |
| 50 dni v14 | 50 wpisów z katalogu: zakres poziomów, temat dnia, konkretne cele, przygoda i zagadki; 180 minut to założenie projektowe |
| Misje v14 | 19 rozdziałów poziomów 2–20, po 8 celów: razem 152 etapy, ich typy, warunki, nagrody i zmiany świata |
| Zagadki v14 | 22 mechaniki oraz 20 dłuższych opowieści, każda w 5 wariantach; instrukcje, kolejność pomieszczeń i zakres kontroli modelu |
| Testy v14 | 179 oddzielnych prób ręcznych, opis, link do karty w Git i pole wyniku do odhaczania |
| Gospodarka v14 | Rzeczywiste koszty, stawki, pojemności, progi ludności i referencyjne czasy poziomów 1–100; orientacyjne okna dni dla poziomów 1–20 |
| Transport v14 | Przyczyny blokad, obsada budowy i odbioru żywności, starsze zapisy, kolejka przyjętych planów oraz ścieżki pomocy |
| Nagrody v14 | Budżety fabuły i wspólne limity przygód, zachowanie po odczycie, reset godzinowy oraz pułap nagrody rundy 800 monet |
| Teatr v14 | Swobodne pozycje w ogrodzie, limit 20 ustawionych ozdób, kolekcja, powitalna aranżacja, zapis i aktualne ceny dalszych ulepszeń |
| Kalkulator v14 | Edytowalne wejścia, produkcja, koszt referencyjny i jawny przykład personogodzin/podatków; formuły mają zapisane wyniki początkowe |

Plan 50 dni jest propozycją tempa i zajęć, a nie blokadą kalendarza. Gracz kontynuuje swój rozdział zależnie od postępu. **50 × 180 minut to założenie 150 godzin aktywności, a nie pomiar 150 godzin atrakcyjnej zabawy.** Sam katalog i kontrola rozwiązań nie potwierdzają bezpłatnego osiągnięcia Ratusza 20 w 50 dni. Do tego potrzeba pełnej symulacji zapasów, populacji, podatków, transportu i wydatków oraz testów graczy.

Główne wymagania trzeba oceniać razem. Przykładowo Ratusz 3→4 wymaga 54 mieszkańców; potrzebne materiały nie zastępują ludności. Pomoc ma uzupełniać faktyczny brak przed powrotem do celu. Miejsce na konkretny towar, gotowy tragarz i wolna pojemność łączna to odrębne warunki. Zwykłe wdrożenie nie resetuje kont, haseł ani postępu.

Nagrody nowych zagadek i opowieści mają wspólny limit wartości na konto: 20% kwoty referencyjnej `500 × najwyższy osiągnięty poziom Ratusza` w dobie oraz 30% `500 × poziom rozdziału` w całym rozdziale. Oba ograniczenia działają razem; nie są osobnymi pełnymi pulami dla każdej wyspy, gry i zasobu. Wartość monet to 1, drewna/kamienia/zboża 0,5, żywności/desek 1,5. Zużytej puli nie odnawia zamknięcie gry, zmiana celu ani przełączenie wyspy. W zakładce Nagrody są rzeczywiste próbki odczytu, ponowienia i kolejnej doby. Dziewięć wcześniejszych przygód zachowuje podane nagrody, w tym dokładnie złapany ładunek. Główna fabuła ma osobno określone nagrody; pochodzenie monet do „Pomagam” wymaga zaufanego potwierdzenia serwera.

Trudność ekspedycji jest pamiętana po zamknięciu i odczycie gry. Zerowanie następuje po pełnej godzinie zegarowej. Nowa polityka nagród rund daje 50, 100, 200, 400, 800, a następnie 800 monet; rozpoczęte starsze rozgrywki zachowują poprzednią politykę. Nagroda rundy i rosnąca pula serii nie są tym samym.

Teatr pokazuje budynek na mapie i osobny ogród po wejściu. Limit dotyczy 20 ustawionych dekoracji; zapis obejmuje swobodne współrzędne w dozwolonym obszarze. Zdjęcie ozdoby zachowuje własność i poziom. Przywrócenie Pomysłu nie cofa ulepszeń i monet. Modelowa próba w generatorze zachowuje pozycję `421,468`, poziom 2 i saldo przez zapis, przestawienie i przywrócenie. Rzeczywisty zapis chmurowy pozostaje osobnym scenariuszem ręcznym.

**88 zakładek Excela 13, ich 48 komentarzy i 4658 historycznych formuł z zapisanymi wynikami pozostają nienaruszonym ukrytym archiwum.** Wcześniejsze części OOXML są porównywane bajt w bajt; zmieniają się tylko metadane umożliwiające dodanie zakładek i wybranie widoku. Bazowy plik ma SHA-256 `016baa56460f1cc6d5bff50863d496c4eec6a40190e36445a3434bb394a30be1`. Generator odmawia pracy po zmianie jego bajtów. Archiwalne zakładki można odkryć poleceniem **Odkryj arkusz / Unhide**. Bieżące v14 mają pierwszeństwo przed historycznymi opisami.

Dwie ukryte zakładki `Kontrole v14` i `Źródła v14` przechowują wyniki kontroli i pełny snapshot eksportów, w tym aktualne teksty tutoriala oraz samouczka. Cały plik ma **100 zakładek: 10 bieżących widocznych, 2 nowe ukryte i 88 historycznych**.

Do odbioru służą [START-HERE](../testing/START-HERE.md), [lista w Markdown](../testing/MANUAL-TEST-PLAN.md) oraz [interaktywna lista](../testing/qa-checklist.html). Wszystkie 179 wyników ręcznych pozostają **NOT RUN**. Automatyczne wyniki nie są ręcznym przeklikaniem. Próby zmieniające czas, zasoby i uprawnienia należy wykonywać na izolowanych fiksturach lub przeznaczonym koncie testowym.

Generator: [scripts/build_workbook_v14.py](../../scripts/build_workbook_v14.py). Wymaga Python z `openpyxl`, `lxml` oraz Node.js:

```sh
python3 scripts/build_workbook_v14.py
python3 scripts/build_workbook_v14.py --validate-only
```

Kontrola obejmuje 208 zachowanych części ZIP, 48 komentarzy, 4658 wcześniejszych wyników formuł, 324 nowe formuły z cache oraz 200 próbek formuł wobec eksportów poziomów 1–100. Sprawdza też 110 wariantów struktur/rozwiązań mechanik. Dla kulki kontrola generatora dotyczy struktury fizyki, nie rozegrania trasy; testy fizyki i całych przygód są osobnymi dowodami. **Nie uruchamiano LibreOffice i nie przypisujemy mu przeliczenia arkusza.** Raport: [HARBORLIGHT14-walidacja.json](HARBORLIGHT14-walidacja.json).

Archiwa bez nadpisywania: [Excel 13](HARBORLIGHT13-zasady.xlsx), [Excel 12](HARBORLIGHT12-zasady.xlsx), [Excel 11](HARBORLIGHT11-zasady.xlsx), [Excel 10](HARBORLIGHT10-zasady.xlsx), [Excel 9](HARBORLIGHT9-zasady.xlsx), [Excel 8](HARBORLIGHT8-zasady.xlsx), [Excel 7](HARBORLIGHT7-zasady.xlsx). Żaden arkusz nie uruchamia promocji, rzeczywistych płatności, reklam, przelewów ani integracji fizycznej gry z kontem.
