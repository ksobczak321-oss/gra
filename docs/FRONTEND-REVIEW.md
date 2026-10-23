# Odbiór frontendu v13 i decyzji V9

Stan wydania **frontend-v13 / Excel 9**: implementacja i odbiór lokalny zakończone — **388/388 testów modelu PASS** oraz zaliczone testy interfejsu, nowego gracza, formularzy i animacji. Publikacja i sprawdzenie rzeczywistego Pages pozostają do potwierdzenia w [dzienniku](IMPLEMENTATION-LOG.md); lokalny wynik nie potwierdza publicznej wersji. Historyczne wyniki v12 są oddzielone od v13.

Źródło kompletności: [manifest](decisions-v9.json). Poniższa tabela opisuje wszystkie 19 nowych wymagań; samo istnienie tabeli nie potwierdza wyniku testów. Weryfikacja obejmuje również 58 reguł, migrację zapisu, zachowanie czasu offline i dotychczasowe animacje.

| ID | Wymaganie | Kryterium odbioru | Stan weryfikacji |
|---|---|---|---|
| F01 | Lewy pasek | Usunąć cały lewy pasek nawigacji i pozostawić dostęp do funkcji przez inne dostępne elementy interfejsu. | PASS lokalnie; publiczny odbiór oczekuje |
| F02 | Górny pasek | Usunąć pięć liczników materiałów; dodać faktycznie pracujących, czas do nowego mieszkańca i Punkty. Monety, poziom, szczęście i ludność pozostają. | PASS lokalnie; publiczny odbiór oczekuje |
| F03 | Kolejność budynków | Ratusz, Dom, Farma, Młyn, Kamieniołom, Drwale, Tartak, Magazyn, Targ, Port, Kaplica, Latarnia. | PASS lokalnie; publiczny odbiór oczekuje |
| F04 | Kafelki budynków | U góry własny poziom; na dole liczba faktycznie pracujących oraz osobno (+n) idących do pracy i (−n) odwołanych. Ratusz, Dom, Kaplica i Latarnia mają tylko poziom. | PASS lokalnie; publiczny odbiór oczekuje |
| F05 | Kafelki zasobów | Pięć materiałów pokazuje pracujących na górze i stan lokalny / centralny (w transporcie) na dole. Nawias obejmuje wszystkie fizyczne przewozy tego zasobu, w tym budowy, targ i port. | PASS lokalnie; publiczny odbiór oczekuje |
| F06 | Język | W ustawieniach wybór angielskiego lub polskiego. Przełączenie obejmuje cały widoczny interfejs, liczby, komunikaty i podpowiedzi. | PASS lokalnie; publiczny odbiór oczekuje |
| F07 | Samouczek | 25 mikrozadań, po pięć przez pierwszych pięć aktywnych dni gry, z nagrodami i trwałym postępem. Zadania uczą obsady, transportu, jedzenia, szczęścia, rozbudowy i pozostałych podstaw. | PASS lokalnie; publiczny odbiór oczekuje |
| F08 | Premia aktywności | Rzeczywista akcja w aktywnym widocznym oknie odnawia pięciominutowy bonus ×2 produkcji materiałów i podatków. Czas się nie sumuje; mnożnik działa razem z latarnią i kaplicą, bez przyspieszania transportu. | PASS lokalnie; publiczny odbiór oczekuje |
| F09 | Przestoje | Przyczyny zatrzymania produkcji, np. brak wejścia, trafiają do powiadomień bez powtarzania co sekundę. | PASS lokalnie; publiczny odbiór oczekuje |
| F10 | Ścieżki | Udane ulepszenie odcinka daje krótkie wizualne potwierdzenie/fajerwerki, z uwzględnieniem ustawienia animacji. | PASS lokalnie; publiczny odbiór oczekuje |
| F11 | Powiadomienia | Gracz wybiera kategorie widocznych powiadomień. Historia mechanik nie ginie przez zmianę filtra. | PASS lokalnie; publiczny odbiór oczekuje |
| F12 | Pola otoczenia | Usunąć klikalne pola otoczenia takie jak plaża, zachowując ilustrację wyspy. | PASS lokalnie; publiczny odbiór oczekuje |
| F13 | Trwałość animacji | Usunąć przyczynę zatrzymywania animacji podczas dłuższej gry i po przywróceniu karty. | PASS lokalnie; publiczny odbiór oczekuje |
| F14 | Nazewnictwo zadań | Deposit zmienić na Donation/Donate w angielskim oraz Darowizna/Przekaż w polskim. | PASS lokalnie; publiczny odbiór oczekuje |
| F15 | Efekty | Każda aktywna premia lub kara zajmuje jeden wiersz: nazwa, wartość, czas/status i ⓘ na końcu. Kliknięcie rozwija szczegóły zakresu i warunku zakończenia. | PASS lokalnie; publiczny odbiór oczekuje |
| F16 | Kupno mieszkańców | Jedna kupiona osoba kosztuje tyle co najbliższa rozbudowa Ratusza: 500 × obecny poziom każdego z sześciu zasobów. Zakup ograniczają wolne miejsca w Domu i limit Ratusza; nowe osoby podlegają regułom pierwszych 24 godzin. | PASS lokalnie; publiczny odbiór oczekuje |
| F17 | Dom i Ratusz | Uprościć i uporządkować obie karty: najważniejsze liczby od razu, oszczędne ramki i opisy pod ⓘ. | PASS lokalnie; publiczny odbiór oczekuje |
| F18 | Punkty | Punkty = poziom Ratusza × stan monet, według migawki przeliczanej o pełnej godzinie zegarowej. | PASS lokalnie; publiczny odbiór oczekuje |
| F19 | Tempo zasobów | Pokazać ↑ dodatni, ↓ ujemny lub → zerowy bilans godzinowy produkcji i zużycia. Sam transport między składami nie zwiększa ani nie zmniejsza bilansu całej wyspy. | PASS lokalnie; publiczny odbiór oczekuje |

## Odbiór mechanik

- Głód po częściowym posiłku, pełna godzina resetującego karmienia, zamrożenie nowych osób i wspólny stan nakładających się wymuszeń 100%.
- Atrakcje: rzeczywista liczba odbiorców, losowanie remisów, cena i osobne zegary; północ kalendarzowa wobec ruchomej przerwy 24 h.
- T rzeczywiste z przerwami, zmiana obsady, FIFO Construction, fizyczne rezerwacje, zajętość centrali, miejsce Food, prognozy bez podwójnego zastawu i anulowanie ze zwrotami.
- Dowóz Premium bez obsady, zamrożenie fazy budowania, osobne opłaty etapów i pełny zakup 10 s w usłudze poza kolejką.
- Potwierdzenie zadania 60 s i szybki mnożnik, darowizny, sześć godzin/północ, bezterminowy Share/Skip i bonus 500 tylko raz.
- Pula ekspedycji +50, spóźnienie −10/s, bezterminowa seria, obecność 5 min +60 s, rzeczywisty zegar i blokada wyspy także po wygranej do wypłaty.
- Kalendarz wspólny dla dni aktywności; samouczek 25 i kwoty projektowe, lojalność bez fikcyjnych nagród, punkty godzinowe oraz czyste potwierdzone zdarzenia social/referral bez integracji zewnętrznej.
- Partie portowe/targowe 24 h, chroniony rozpoczęty odbiór, 10→9 na targu i barter przy zerowej obsadzie.
- Cztery widoczne zakładki Excela 9, cała historia V8 ukryta, komentarze i formuły zachowane; pliki 7/8 byte-identical.

## Pliki testowe i dowody

Bieżące scenariusze nowych reguł: [activities-v9](../tests/harborlight-v9-activities.test.mjs), [residents-leisure-v9](../tests/harborlight-v9-residents-leisure.test.mjs), [logistics-v9](../tests/harborlight-v9-logistics.test.mjs), [progression-v13](../tests/harborlight-progression-v13.test.mjs), [frontend-v13](../tests/harborlight-frontend-v13-smoke.py). Końcowy wynik lokalny: **388/388 PASS, 0 błędów i 0 pominiętych**. Zaliczone [frontend-v13](../tests/harborlight-frontend-v13-smoke.py), [new-player](../tests/harborlight-new-player-smoke.py), [auth](../tests/harborlight-auth-smoke.py) i [v13-auth-motion](../tests/harborlight-v13-auth-motion-smoke.py) oraz [dodatkowy odbiór](../scripts/harborlight-v13-extra-acceptance.py): sześć grup wymagań, w tym wszystkie 24 widoki budynków w EN/PL oraz pięć zasobów. Obejrzano desktop i telefon, w tym Ratusz i Dom po polsku. Publikację i wynik rzeczywistego Pages zapisuje [dziennik](IMPLEMENTATION-LOG.md) dopiero po sprawdzeniu.

Historycznie v12 zaliczyło 270 testów modelu, 14 lokalnych zestawów Chromium i 3 publiczne zestawy; wynik ten nie jest automatycznym potwierdzeniem zmienionej wersji v13.
