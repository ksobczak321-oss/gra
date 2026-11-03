# Arkusz zasad HARBORLIGHT

Bieżący plik: **[HARBORLIGHT12-zasady.xlsx](HARBORLIGHT12-zasady.xlsx)** — zasady kodu DEV **0.13.0.0 / v29**, odczytane z rzeczywistych eksportów modułów 3 listopada 2026. Obejmuje również zachowane decyzje z 0.12.0.0. Odebrane PRE-PROD pozostaje osobno opisanym **0.12.0.0**, źródło `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`; wygenerowanie Excela nie jest promocją do chmury.

[Pobierz Excel 12](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT12-zasady.xlsx). Gdy GitHub pokazuje stronę pliku, wybierz **Download raw file**. Plik można otworzyć w Excelu, LibreOffice Calc lub zaimportować do Arkuszy Google.

| Widoczna zakładka | Zawartość |
|---|---|
| Przeczytaj v12 | Aktualny zakres DEV, oddzielny stan PRE-PROD, granice integracji i droga do odbioru |
| Gospodarka v12 | Poziomy 1–100: dokładny budżet transportu i budowy, stałe pojemności Magazynu, żywność, ładunek, obsada i rzeczywiste stawki produkcji |
| Budynki v12 | 13 budynków, proporcje czasu, przykłady kosztów i stały Teatr bez rozbudowy |
| Nauka v12 | Wszystkie 34 opisy tutoriala i 25 praktycznych lekcji ze stabilnymi ID |
| Testy v12 | Każdy bieżący ręczny przypadek, jego warunki, kroki i wynik, link do osobnej karty w Git i pole do odhaczenia |
| Teatr v12 | Dziesięć rodzajów dekoracji × 20 poziomów: ceny monetowe, reklamy przy poziomach 5/10/15/20, kolekcja i aranżacja 20 miejsc |
| Przygody v12 | Dziewięć aktywności na czas oczekiwania, faktyczne parametry nagród i ograniczeń |
| Zasady v12 | Szczęście, łóżka, bank Domu, modlitwa, powitanie, misje 8/5/3, wyspy, handel, monety, społeczność, liga i Pomagam |
| Kalkulator v12 | Edytowalne wejścia i formuły czasu, pojemności, produkcji oraz modlitwy; zapisane wyniki początkowe |

Najdłuższy wspólny czas transportu i budowy to **45 sekund przy Ratuszu 1**, a od Ratusza 24 **24 godziny**, bez dalszego wzrostu. Budżet zakłada dostępne materiały i trzech gotowych tragarzy. Zbieranie zapasów, dojście pracowników, kolejka lub niedobór obsady mogą wydłużyć oczekiwanie. Samouczek pokazuje zarówno rzeczywiste przyspieszenie za monety, jak i zwykłe czekanie. Rozpoczęte wcześniej budowy zachowują swój plan.

Wszystkie **66 zakładek Excela 11**, ich **48 komentarzy** i **3992 historyczne formuły z zapisanymi wynikami** pozostają nienaruszonym ukrytym archiwum. Można je odkryć poleceniem **Odkryj arkusz / Unhide**. Ich dawne reguły nie mają pierwszeństwa przed bieżącymi kartami v12. Dwie nowe ukryte zakładki `Kontrole v12` i `Źródła v12` dokumentują odczyty kodu oraz weryfikację formuł.

Do ręcznego odbioru służą [START-HERE](../testing/START-HERE.md), [lista w Markdown](../testing/MANUAL-TEST-PLAN.md) oraz [interaktywna lista](../testing/qa-checklist.html). Każdy przypadek zaczyna z wynikiem **NOT RUN**. Wpisz PASS, FAIL lub BLOCKED dopiero po własnym wykonaniu kroków; wyniki automatycznych testów nie są ręcznym odbiorem. Nie resetujemy stałych kont ani haseł. Przypadki wymagające zmiany czasu, zasobów, płatności lub reguł wykonuje się na izolowanych fiksturach albo jawnie przeznaczonym koncie testowym.

Aktualny stan publikacji, dokładny SHA i przebiegi CI są w [rejestrze środowisk](../ENVIRONMENT-STATUS.md). Nowa wersja Excela nie uruchamia PROD, rzeczywistych płatności, sieci reklamowej ani przelewów dobroczynnych. PRE-PROD ma jawnie oznaczone symulacje; integracja gry fizycznej z kontem online pozostaje wyłączona.

Generator: [scripts/build_workbook_v12.py](../../scripts/build_workbook_v12.py). Wymaga Python z `openpyxl`, `lxml` i Node.js:

```sh
python3 scripts/build_workbook_v12.py
python3 scripts/build_workbook_v12.py --validate-only
```

Walidacja porównuje historyczne części ZIP bajt w bajt, kontroluje komentarze i wszystkie stare wyniki, sprawdza nowe komórki oraz **500 próbek formuł** wobec rzeczywistych eksportów gry na poziomach 1–100. Nowe formuły mają niezależnie obliczone zapisane wyniki i są automatycznie przeliczane po zmianie wejść. **Nie uruchamiano LibreOffice i nie przypisano mu przeliczenia pliku.** Wynik: [HARBORLIGHT12-walidacja.json](HARBORLIGHT12-walidacja.json).

Archiwa pozostają bez nadpisywania: [Excel 11](HARBORLIGHT11-zasady.xlsx), [Excel 10](HARBORLIGHT10-zasady.xlsx), [Excel 9](HARBORLIGHT9-zasady.xlsx), [Excel 8](HARBORLIGHT8-zasady.xlsx), [Excel 7](HARBORLIGHT7-zasady.xlsx). Historyczny generator [v11](../../scripts/build_workbook_v11.py) zachowuje opis swojego wydania.
