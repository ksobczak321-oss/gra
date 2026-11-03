# DEV 0.13.0.0 — odbiór paczki v29

Zakres zatwierdzony poleceniem GO z 3 listopada 2026: [wymagania](FRONTEND-V29-REQUIREMENTS.md). Nowe reguły mają własny cache `frontend-v29`. Schemat świata 9 i archipelagu 2 pozostają; normalizatory zachowują starsze projekty, lekcje, dane i nagrody. PRE-PROD pozostaje odebrane 0.12.0.0/d9e2940; ten dokument nie stanowi promocji do GCP.

## Stan odbioru

**Lokalny odbiór zakończony: 1200 testów Node PASS** (1060 frontend +133 backend +7 planszówki), **141 Python PASS** oraz **36 zestawów Chromium PASS**. Końcowy frontend przeszedł bez pominięć w22,132s, z niezmienionym10-sekundowym limitem testu96h. Wszystkie nowe poprawki są uwzględnione w tym końcowym przebiegu. Źródło `cf6739a081d89bb5b2c6773a04a34f3fe2a8a8da`, [CI 41657032913](https://github.com/ksobczak321-oss/gra/actions/runs/41657032913) **SUCCESS, 13m 13s**, [Pages 41657032922](https://github.com/ksobczak321-oss/gra/actions/runs/41657032922) **SUCCESS, 41s**. Tag `dev-0.13.0.0-20261103` jest opublikowany i wskazuje to samo źródło.

| Kontrola | Lokalny wynik |
|---|---|
| Frontend Node |1060/1060PASS, `/tmp/harborlight-v29-final-node.log`|
| Backend i planszówka |133/133 +7/7PASS|
| Python |141PASS, w tym pakowanie i zabezpieczenia wydania|
| Chromium |32dotychczasowe zestawy +4nowe zestawy v29PASS|
| Nowa nauka |PL/EN ×komputer/telefon; równe przyciski,?3×,34kroki, jedna buźka, Teatr, wznowienie i obie drogi budowyPASS|
| Nowy Teatr |PL/EN ×komputer/telefon;20miejsc, kolekcja, reklamy, warianty wizualne, zachowanie fokusuPASS|
| Przygody |9gier ×PL/EN ×komputer/telefon; rzeczywiste ruchy, nagrody i zapisPASS|
| Pełna gra v29 |PL/komputer iEN/telefon; zakup dekoracji widoczny na mapie, bieżąca misja, trafienie ładunku nad nagłówkiem i poza ramkąPASS|
| Audyt polskich paneli |112widokówPASS; komunikat powitalny ma pełne tłumaczenie|
| Excel12 |Walidacja bieżących eksportów i niezmienionego archiwumPASS|
| Rejestry |397kart/134próby ręczneNOTRUN; generatory --checkPASS|

Lokalny HTTP trzech kont sprawdza prywatne wiadomości, sojusz, odejście i trwały powrót. Nie wysyłano wiadomości na rzeczywiste konta. Początkowe niepowodzenia starych fikstur i ich powtórki zachowano w lokalnym raporcie `/tmp/v29-learning-qa-report.json`; końcowy wynik32/32 dotyczy ostatnich rzeczywistych sukcesów. Wcześniejszy przebieg Node pod równoległym Chromium miał przekroczony czas izolowanego testu96h; spokojny przebieg tego samego testu i pełna końcowa regresja przeszły bez podnoszenia limitu.

## Rozstrzygnięte błędy

- Trzech tragarzy to obsada referencyjna nowego czasu, nie wymóg blokujący budowę. Przy jednej lub dwóch osobach dostawy trwają dłużej, lecz nadal działają. Dzięki temu stare samouczki i zapisy pozostają grywalne.
- Nowy tutorial czyści demonstracyjną smutną buźkę przy zmianie kroku, także przy zatrzymanym zegarze. Wznowiony tutorial otwiera niedokończony samouczek.
- Pełnoekranowa zabawa ze spadającym ładunkiem nie może znajdować się pod nagłówkiem dialogu. Test sprawdza odbiorcę kliknięcia i dokładną nagrodę.
- Zmiana salda monet nie przebudowuje co sekundę otwartych kontrolek Teatru. Układ zachowuje fokus i wybór dekoracji.
- Ponowne rozpoczęcie świata nie odnawia wygasłego siedmiodniowego bonusu, nawet jeśli wcześniej nie odebrano żadnego mieszkańca.
- Przyjęte wcześniej starsze zlecenie pozostaje widoczne do dokończenia; nowe misje pokazują tylko bieżący etap.

## Artefakty i ewidencja

[Excel 12](arkusze/HARBORLIGHT12-zasady.xlsx) zawiera aktualne dane z eksportów gry, tabelę 100 poziomów, 34 kroki tutoriala, 25 lekcji, Teatr i przygody. Zachowuje 66 historycznych arkuszy, 48 komentarzy i 3992 wcześniejsze wyniki formuł. Generator: `python3 scripts/build_workbook_v12.py`; kontrola: `--validate-only`.

[397 kart zmian](tracking/CHANGE-REGISTER.md) i [134 scenariusze ręczne](testing/START-HERE.md) mają osobne statusy. Wszystkie próby ręczne pozostają NOT RUN. Automatyczny test strony kontrolnej nie oznacza ręcznego przeklikania tych scenariuszy.

Push na `main` potwierdzono. Źródło `cf6739a081d89bb5b2c6773a04a34f3fe2a8a8da`, [CI 41657032913](https://github.com/ksobczak321-oss/gra/actions/runs/41657032913) **SUCCESS, 13m 13s**, [Pages 41657032922](https://github.com/ksobczak321-oss/gra/actions/runs/41657032922) **SUCCESS, 41s**. Tag `dev-0.13.0.0-20261103` jest opublikowany i wskazuje to samo źródło. Nie aktywowano prawdziwych płatności, reklam ani przelewów. Planszówka pozostaje osobnym projektem bez integracji z kontami online.


## Pakiet i granice publikacji

| Właściwość | Potwierdzona wartość |
|---|---|
| Źródło |`cf6739a081d89bb5b2c6773a04a34f3fe2a8a8da`|
| Pliki i bajty |73 pliki / 11558134 bajtów|
| TAR SHA-256 |`905c097a43384db0b81a464444efcf527840abc8ba8e0217437942dfdb8386b7`|
| Manifest SHA-256 |`8767584c7abcd190eda0ec3b6dbdd4e11bb74df860fa67ddcbf31034dac97d21`|
| Weryfikacja i rozpakowanie |PASS, kontrola SHA przed ekstrakcją|
| Własne CI |[41657032913](https://github.com/ksobczak321-oss/gra/actions/runs/41657032913) SUCCESS, 13m 13s|
| GitHub Pages |[41657032922](https://github.com/ksobczak321-oss/gra/actions/runs/41657032922) SUCCESS, 41s|
| Tag |[`dev-0.13.0.0-20261103`](https://github.com/ksobczak321-oss/gra/tree/dev-0.13.0.0-20261103) → `cf6739a081d89bb5b2c6773a04a34f3fe2a8a8da`|
| PRE-PROD |Bez nowej promocji; pozostaje0.12.0.0/d9e2940|
| Dane i operatorzy |Bez resetu, PROD, prawdziwych płatności, reklam i przelewów|

TAR i manifest to lokalny niezmienny pakiet tego źródła, nie digest ZIP artefaktu GitHub ani obraz backendu. Weryfikacja i ekstrakcja przeszły. Publikację Pages potwierdza workflow; niezależny odczyt pliku wersji przez HTTP tej sesji zatrzymał proxy CONNECT403, więc nie deklarujemy dodatkowego odbioru bajtów na hoście. Gra przeszła lokalne Chromium, a własne CI sprawdza pakiet tego samego źródła. Podgląd Pages działa w pamięci; poprawki prawdziwego API są sprawdzone lokalnym HTTP i nie zostały jeszcze promowane do GCP.

Następny commit dowodów nie zmienia publicznych plików gry. Nie zastępuje źródła i nie przesuwa tagu odebranego wydania.
