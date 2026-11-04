# Arkusz zasad HARBORLIGHT

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
