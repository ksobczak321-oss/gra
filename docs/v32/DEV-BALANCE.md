# HARBORLIGHT v32 — analiza balansu DEV

Wynik: reguły dają wykonalne podstawowe racje, a 40% bufor Magazynu mieści przyjętą konserwatywną pulę. Finanse pozostają silnym źródłem nowych monet. Propozycja #30 utrudnia symboliczne obejście umorzenia, lecz sama nie równoważy gospodarki. To materiał do oceny przed PRE-PROD; podane nowe współczynniki DEV nie oznaczają akceptacji użytkownika.

Dowód: `node scripts/simulate-v32-balance.mjs`. Dane: [DEV-BALANCE.json](DEV-BALANCE.json). Stały seed 851112245, 100000 matematycznych wniosków i 1000 wniosków przez rzeczywisty silnik; 18 rzeczywistych pojedynczych procesów produkcji i 4 scenariusze żywienia przez 1440 minut. Dwa przebiegi dały identyczne bajty JSON: SHA-256 `79e6296f04b2ffea1ea1eebccfb931ae5b69b055d400698de9eac99f0f408402`.

Nie jest to 50 dni rozgrywki ani 150 godzin ludzkiego odbioru. Pojedyncze procesy sprawdzają rzeczywisty model przy gotowych składnikach lokalnych; nie dowodzą wydajności całego łańcucha z dostawami, kolejkami, dojazdem i równoczesną budową. Matematyka łańcuchów pomija te opóźnienia i jest górnym ograniczeniem wydajności.

## Magazyn, populacja i żywność

18 osób na starcie, limit 36 osób/poziom Ratusza, 6 punktów sytości/osobę/h przy łóżku i 12 bez łóżka. Dla Magazynu poziomu L kod liczy etap L+1: największa rozbudowa 550×etap×7, misja 500×etap×7 (zwykłe zboże oraz 6 punktów sytości za dawną jednostkę żywności), zapas surowego jedzenia 36×etap×6×24; następnie całość mnoży przez 1,4 i zaokrągla w górę. Wspólna pojemność to 20×limit pojedynczego towaru. Pula jest celowo konserwatywna: nalicza zapas żywności także w limicie towarów niebędących jedzeniem i nie zakłada gęstszych potraw.

| Magazyn | Limit jednego towaru | Wspólny limit 20 towarów | Pula surowego jedzenia na 24 h etapu |
| --- | ---: | ---: | ---: |
|1|17456|349120|10368|
|2|26183|523660|15552|
|3|34911|698220|20736|
|5|52366|1047320|31104|
|8|78549|1570980|46656|
|10|96004|1920080|57024|

| Populacja | Z łóżkiem | Sytość/h | Surowe jedzenie/24 h | Chleb/24 h | Całkowita liczba rolników/rybaków 40 szt./h tylko na surowe jedzenie |
| --- | ---: | ---: | ---: | ---: | ---: |
|18|18|108|2592|72|3|
|36|36|216|5184|144|6|
|36|18|324|7776|216|9|
|72|36|648|15552|432|17|

Ostatnia kolumna to **rolnicy lub rybacy**, nie pracownicy przemysłowego łańcucha; tempo 40/h przyjęto dla surowego jedzenia. Cztery rzeczywiste przebiegi `feedResidents` zużyły dokładnie wskazaną sytość przez 24 h, z pokryciem racji 100%. Nie obejmują one narastającego wymogu różnorodności po dobie łaski. Pula magazynowa zależy od poziomu **Magazynu**: przy dowolnie wyższym Ratuszu nie gwarantuje 24 h jedzenia dla każdej możliwej populacji. Przykładowo 720 osób przy samym surowym jedzeniu wymaga 103680 szt./dobę, więcej niż jeden limit Magazynu 1.

## Obsada, receptury i rzeczywista wydajność

DEV liczy 40**partii**/pracownika/h, a mięso 20 partii/h, bo partia daje 2 sztuki. Budynek poziomu L mnoży stawkę przez 1+0,1×(L−1). Jeden człowiek wykonuje wyłącznie przypisany proces. Limit kierunku wynosi 12 L; limit budynku 12 L×[1+0,5×(liczba dostępnych procesów−1)]. Przykładowo Gospodarstwo 1:12 na kierunek i 18 łącznie; Gospodarstwo 2:24 na kierunek i 60 łącznie; Gospodarstwo 6 z serem:72 na kierunek i 216 łącznie. Są to limity stanowisk, nie darmowi pracownicy. Zapełnienie wszystkich budynków naraz wymaga rzeczywistej populacji.

| Proces | Wejście → wynik partii | Partie/pracownika/h na poziomie 1 | Sytość wyniku partii | Sytość/h pracy całego idealnego łańcucha na poziomie 1 |
| --- | --- | ---: | ---: | ---: |
|Zboże / warzywa / mleko / ryby|1 sztuka|40|1|40|
|Mąka|4 zboża →1 mąka|40|6|48|
|Chleb|4 mąki →1 chleb|40|36|68,57|
|Ciasto|4 mąki+2 mleka →1 ciasto|40|48|83,48|
|Mleko pasteryzowane|4 mleka →1 sztuka|40|6|48|
|Mięso|2 żywca →2 mięsa|20|12|120|
|Ser|4 kwaśne mleka →1 ser|40 bazowo;60 na wymaganym Gospodarstwie 6|12|96 bazowo, z pominięciem 72 h kwaśnienia|

Żywiec i skóry nie są jedzeniem. Mięso daje najwyższą wyliczoną wydajność sytości pracy, ale wymaga Gospodarstwa 2, osobnych pracowników hodowli i Rzeźni oraz przewozu wejść i wyników. Przykład stanu ustalonego dla 36 osób:2 hodowców żywca 40/h i 2 pracowników mięsa 40 szt./h mogą dawać 480 sytości/h wobec 216 potrzebnych, zanim uwzględnimy transport i postoje. To mocny kandydat do praktycznego odbioru balansu. Nie zmieniono zatwierdzonych receptur.

Skóra:2 żywca →1; strój cywilny 4 skóry →1; wojskowy i szata 8 skór →1. Wszystkie te procesy mają 40 partii/pracownika/h na poziomie 1. Zboże, warzywa, żywiec, mleko, ryby, drewno i kamień również 40 partii/h; deski 2 drewna →1,40 partii/h. Zestaw 18 rzeczywistych pojedynczych partii w skrypcie potwierdza podane wejścia, wyjścia, obsadę 1 i czasy. Receptury i stawki są też zapisane pojedynczo w JSON.

## Umorzenia i koszt pomijanej pożyczki — decyzja 30

Zatwierdzone pięć niezależnych losowań po 10% daje **1−0,9 ⁵=40,951%** szans na umorzenie całej pozostałej należności. Symulacja 100000 wniosków:70136 przyznanych(70,136%),28792 umorzonych(41,051671% przyznanych); oczekiwany półprzedział 95% to 0,364 punktu procentowego. Rzeczywisty silnik w 1000 wnioskach przyznał 704, umorzył 295 i spłacił 409. Próby nie wymuszały wyników losowania ani nie zmieniały zapisanego harmonogramu.

Dla przyznanej pożyczki 1000 monet trzymanej do terminu, bez wcześniejszych spłat, przy gotówce na spłatę po nieudanych losowaniach:

| Termin | Pełna spłata bez umorzenia | Oczekiwana spłata z losowaniami | Oczekiwany przyrost monet pożyczkobiorcy |
| --- | ---: | ---: | ---: |
|1 dzień|1050|620,0145|+379,9855|
|4 dni|1200|708,588|+291,412|
|7 dni|1350|797,1615|+202,8385|
|14 dni|1700|1003,833|−3,833|
|28 dni|2400|1417,176|−417,176|

Propozycja DEV #30: po umorzeniu pożyczka bez losowań musi wynosić **co najmniej 10%poprzednio umorzonego kapitału, minimum 1 monetę**, i pozostać aktywna **co najmniej 24 rzeczywiste godziny** przed pełną spłatą. Oba warunki muszą zajść razem. Wcześniejsza symboliczna spłata pozostaje dozwolona, lecz nie usuwa blokady kolejnego umorzenia. Parametry są konfigurowalne, **użytkownik nie zatwierdził tych liczb**.

| Poprzedni umorzony kapitał | Minimalna kolejna kwota | Minimalny czas | Koszt odsetek po 24 h | Optymistyczny czas pracy 40 drewna/h po 3 monety potrzebny na same odsetki |
| --- | ---: | ---: | ---: | ---: |
|100|10|24 h|1|30 s|
|1000|100|24 h|5|2 min 30 s|
|10000|1000|24 h|50|25 min|

Jedna moneta spłacona natychmiast kosztowałaby 0 odsetek i pozwalałaby ponawiać główne losowania praktycznie od razu; model tego nie dopuszcza. Proponowane 24 h usuwa to konkretne obejście, a 10%wiąże kwotę z poprzednią korzyścią. Koszt nadal jest niski: po umorzeniu 1000 monet wystarczy 5 monet odsetek. Oczekiwany przyrost pierwszej jednodniowej kwalifikującej pożyczki 1000 monet po odjęciu ważonego kosztu pominięcia wynosi około 377,94 monety. Propozycja jest umiarkowaną blokadą ponawiania, **nie rozwiązaniem inflacji**. Dalsze zwiększenie progów, zmiana szans lub nagród wymaga osobnej decyzji.

## Sojusz, pochodzenie pieniędzy i ryzyko arbitrażu

3%/dobę od 1000 monet to 30 monet **dla każdego**. Przy 5 członkach sojusz dostaje 150 monet/dobę, mimo że łączny kapitał wynosi 1000. Kapitał wraca rzeczywistym wpłacającym. Bezpośrednie przekazanie pożyczonych monet do takiej pożyczki jest zablokowane. Towary kupione za te monety nie zachowują pochodzenia, zgodnie z decyzją 29; przychód ze sprzedaży jest własny.

Konserwatywny przykład matematyczny: pożycz 10000 monet; kup 1666 kamienia za 9996; sprzedaj za 6664 własne monety; pozostałe 4 są nadal pożyczone. Te 6664 własne monety są pożyczane Królestwu w 5 osobowym sojuszu w kolejnych terminach maksymalnie 96 h. Bez reinwestowania odsetek, bez umorzenia i przy ofertach pozwalających stale ulokować cały kapitał:

| Łączny czas | Odsetki całego sojuszu | Spłata pożyczki 10000 | Wynik całej grupy po spłacie |
| --- | ---: | ---: | ---: |
|1 dzień|1000|10500|−2832|
|4 dni|4000|12000|−1332|
|7 dni|7000|13500|+168|
|14 dni|14000|17000|+3668|
|28 dni|28000|24000|+10668|

To **górny scenariusz dostępności ofert**, nie potwierdzony exploit wykonany przez produkcyjne API. Obecne małe propozycje ofert mogą ograniczyć przepustowość, terminy i limit 3 pożyczek również ograniczają przepływ. Jednak zatwierdzone reguły same w sobie pozwalają na dodatni długoterminowy wynik po konwersji. Nie usunięto tej możliwości przez ukrytą zmianę decyzji 29 lub podział pełnych nagród. Przed PRE-PROD trzeba świadomie zaakceptować wynik albo zatwierdzić korektę gospodarki.

## Parametry wymagające przeglądu przed promocją

- #30:10%poprzedniego kapitału i 24 h czasu jako propozycja, z powyższym kosztem i ograniczeniami.
- Stawki 40 partii/h i 20 dla mięsa oraz premia 10%/poziom: obecna kalibracja DEV; sprawdzone pojedyncze partie, bez pełnej długiej rozgrywki.
- Skala próśb Królestwa:12 towarów×Ratusz i 25 monet×Ratusz, podstawowa nagroda 15%wartości, pomocnicze oszacowanie przygotowania.
- Sporadyczny prezent od pożyczki:10%szans, drewno o wartości około 10%odsetek(minimum 1 sztuka). Losowanie utrwalone raz, prezent pełny dla każdego członka.
- Dekoracje Teatru:0,05 punktu za poziom ustawionej ozdoby, limit+10. Całkowity zwrot zamrożonej opłaty za odwołanie przed rozpoczęciem jako jawna reguła UX DEV.

Wyniki tej analizy należy zachować przy przeglądzie kandydata PRE-PROD. Nie są zgodą na zmianę zatwierdzonych receptur, szans losowania ani pełnych nagród sojuszu.
