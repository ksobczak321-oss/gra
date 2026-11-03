# Arkusz zasad HARBORLIGHT

Bieżący plik: **[HARBORLIGHT13-zasady.xlsx](HARBORLIGHT13-zasady.xlsx)** — zasady kodu DEV **0.13.1.0 / v30**, odczytane z rzeczywistych eksportów modułów. Ta aktualizacja dotyczy Teatru jako miejsca swobodnego aranżowania własnej okolicy; zachowuje pozostałe zasady gry z v29.

[Pobierz Excel 13](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT13-zasady.xlsx). Gdy GitHub pokazuje stronę pliku, wybierz **Download raw file**. Plik można otworzyć w Excelu, LibreOffice Calc lub zaimportować do Arkuszy Google.

**Arkusz opisuje przygotowany kod, nie ogłasza jego publikacji.** Poprzedni odebrany DEV **0.13.0.0** ma źródło `cf6739a081d89bb5b2c6773a04a34f3fe2a8a8da`, własne CI `41657032913` SUCCESS i Pages `41657032922` SUCCESS. PRE-PROD pozostaje odrębnym odebranym **0.12.0.0**, źródło `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`. Bieżące dowody następnego wydania są w [rejestrze środowisk](../ENVIRONMENT-STATUS.md).

| Widoczna zakładka | Zawartość |
|---|---|
| Przeczytaj v13 | Aktualny zakres DEV, osobno poprzedni odebrany DEV i PRE-PROD, granice integracji oraz droga do odbioru |
| Gospodarka v13 | Poziomy 1–100: bazowy czas transportu i budowy, stałe pojemności Magazynu, żywność, ładunek, obsada i stawki produkcji |
| Budynki v13 | 13 budynków, proporcje czasu, przykłady kosztów i stały Teatr bez rozbudowy |
| Nauka v13 | Wszystkie 34 opisy tutoriala i 25 praktycznych lekcji ze stabilnymi ID |
| Testy v13 | Każdy ręczny przypadek, jego warunki, kroki i oczekiwania, link do osobnej karty w Git oraz wynik do odhaczenia |
| Teatr v13 | Plac po kliknięciu budynku, 20 miejsc bez nowych sektorów, 10 rodzajów, dalsze poziomy bez końca20, ceny i reklamy co5poziomów; bezpłatne oświetlenie, posadzki i trzy zapisane aranżacje |
| Przygody v13 | Dziewięć aktywności na czas oczekiwania, parametry nagród i ograniczeń |
| Zasady v13 | Szczęście, łóżka, bank Domu, modlitwa, powitanie, misje 8/5/3, wyspy, handel, monety, społeczność, liga i Pomagam |
| Kalkulator v13 | Edytowalne wejścia i formuły czasu, pojemności, produkcji oraz modlitwy z zapisanymi wynikami początkowymi |

Na głównej mapie Teatr ma być częścią zabudowy. Jego plac, dekoracje i narzędzia aranżowania otwierają się po kliknięciu. Gracz sam wybiera, co uważa za piękne; nie ma rankingu gustu ani dodatkowych korzyści gospodarczych za ocenę wyglądu. Zapisane układy pamiętają rozmieszczenie posiadanych dekoracji oraz nastrój i posadzkę. Przywrócenie nie tworzy kolejnych egzemplarzy, nie cofa poziomów ani nie zwraca monet. Przenoszenie do kolekcji zachowuje własność i ulepszenia. Bieżący plac zapisuje się automatycznie z wyspą niezależnie od trzech Pomysłów, tak aby można było kontynuować tę samą kompozycję po kolejnych dniach. Poziom20 nie kończy ulepszania: cena rośnie nadal tą samą formułą, a reklama przypada co5poziomów także25/30. Tabela pokazuje pierwsze20etapów oraz przykłady21,25,30,50,100i1000; nie oznacza to nowego twardego końca.

Najdłuższy bazowy wspólny czas transportu i budowy pozostaje **45 sekund przy Ratuszu 1**, a od Ratusza 24 **24 godziny**. Referencja zakłada dostępne materiały i trzech gotowych tragarzy. Jedna lub dwie osoby nadal dostarczają towary, wykonując więcej kursów. Dojście pracowników, kolejka i brak materiałów wydłużają oczekiwanie; wyżywienie, łóżka, aktywność i ścieżki wpływają na rzeczywisty przewóz. Samouczek pokazuje przyspieszenie za monety oraz zwykłe czekanie. Rozpoczęte wcześniej budowy zachowują zapisane zasady.

**77 zakładek Excela 12**, ich **48 komentarzy** i **4325 historycznych formuł z zapisanymi wynikami** pozostają nienaruszonym ukrytym archiwum. Źródłowy plik 12 ma SHA-256 `8e2ffb524398aabcae98653f6adce2a217d26e2c72decaf151147a58de6b0eca`; generator odmawia pracy po zmianie tych bajtów. Archiwalne zakładki można odkryć poleceniem **Odkryj arkusz / Unhide**. Dawne reguły nie mają pierwszeństwa przed bieżącymi kartami v13. Dwie nowe ukryte zakładki `Kontrole v13` i `Źródła v13` dokumentują eksporty i wyniki kontroli.

Do ręcznego odbioru służą [START-HERE](../testing/START-HERE.md), [lista w Markdown](../testing/MANUAL-TEST-PLAN.md) oraz [interaktywna lista](../testing/qa-checklist.html). Wszystkie **147 wyników ręcznych** pozostają **NOT RUN**, dopóki tester nie wykona kroków i nie zapisze dowodu. Wyniki automatyczne nie są ręcznym odbiorem. Nie resetujemy stałych kont ani haseł; przypadki wymagające zmiany czasu, zasobów, płatności lub reguł wykonuje się na izolowanych fiksturach albo przeznaczonym koncie testowym.

Generator: [scripts/build_workbook_v13.py](../../scripts/build_workbook_v13.py). Wymaga Python z `openpyxl`, `lxml` i Node.js:

```sh
python3 scripts/build_workbook_v13.py
python3 scripts/build_workbook_v13.py --validate-only
```

Walidacja porównuje historyczne części ZIP bajt w bajt, kontroluje komentarze i wcześniejsze wyniki, sprawdza nowe komórki oraz **500 próbek formuł** wobec rzeczywistych eksportów gry na poziomach 1–100. Dodatkowo wykonuje modelowy zapis i odtworzenie aranżacji, sprawdzając zachowanie poziomu, własności i monet. Nowe formuły mają niezależnie obliczone zapisane wyniki. **Nie uruchamiano LibreOffice i nie przypisano mu przeliczenia pliku.** Raport: [HARBORLIGHT13-walidacja.json](HARBORLIGHT13-walidacja.json). Końcowa generacja i oddzielna kontrola `--validate-only` przeszły: **88 zakładek, 333 nowe formuły z cache, 500 próbek runtime, 147 ręcznych NOT RUN**.

Archiwa pozostają bez nadpisywania: [Excel 12](HARBORLIGHT12-zasady.xlsx), [Excel 11](HARBORLIGHT11-zasady.xlsx), [Excel 10](HARBORLIGHT10-zasady.xlsx), [Excel 9](HARBORLIGHT9-zasady.xlsx), [Excel 8](HARBORLIGHT8-zasady.xlsx), [Excel 7](HARBORLIGHT7-zasady.xlsx). Generatory wcześniejszych wydań zachowują ich historyczne zakresy. Żaden arkusz nie uruchamia PROD, rzeczywistych płatności, reklam, przelewów ani integracji fizycznej gry z kontem.
