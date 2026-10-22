# Interaktywna wyspa HARBORLIGHT

Stan dokumentu: 2026-10-22. Dotyczy `harborlight-v1-layered.html`. Stan publikacji i wyniki kolejnych sprawdzeń są w [dzienniku implementacji](IMPLEMENTATION-LOG.md).

Bieżący priorytet: frontend, grafika i reguły osady. Wersja `happiness-v8` rozwija gospodarkę o trwałe osoby z indywidualnym szczęściem, osobne liczniki głodu i bezrobocia oraz połowę wydajności bez jedzenia. Zachowuje pracowników, indywidualną produkcję, magazyny, powiadomienia, targ, premie kaplicy i latarni oraz rzeczywistą rozbudowę z kolejką. Szczegółowe, aktualne ceny i reguły pakietu są w [uzgodnionych regułach gospodarki](ECONOMY-RULES.md). Stan sprawdzeń i publikacji zapisujemy osobno w dzienniku; model pakietu nie oznacza uruchomionej sprzedaży.

## Co działa

Interaktywny prototyp zachowuje układ i styl zaakceptowanej wyspy i dodaje kontrolki HTML na scenie oraz dodatkowy czytelny pasek i menu na telefonie. Kliknięcie budynku otwiera jego panel, a operacje zmieniają wspólny stan gospodarki. Kontrolki mają etykiety dla czytników ekranu, obsługę klawiatury oraz widoczny fokus. Dialogi dostosowują się do szerokości ekranu.

| Element ekranu | Działanie |
| --- | --- |
| Logo i menu | Podsumowanie wyspy oraz przejście do funkcji gry |
| Koło zębate | Ustawienia animacji, zapis i potwierdzany reset wyspy |
| Pasek zasobów | Pięć materiałów w magazynie centralnym, monety w osobnym skarbcu i przejście do logistyki |
| Poziom | Poziom ratusza, limit rozbudowy pozostałych budynków i przejście do rozbudowy ratusza |
| Szczęście | Średnia indywidualnych wartości od −100% do +100%, wyświetlana jako pełny procent zaokrąglony w górę, oraz zasady zmiany populacji |
| Liczba mieszkańców | Populacja, indywidualne szczęście, limit ratusza, miejsca w domu, przeludnienie, pracujący, wracający do domu, wolni mieszkańcy i podatki |
| Zegar, pauza, odtwarzanie, przyspieszenie | Zegar wyspy; tempo kalendarza 1×, 2× lub 4× nie zmienia godzin pracy, transportu ani podatków |
| Nawigacja boczna | Wyspa, ekspedycje, zadania, mieszkańcy i mapa dzielnic |
| Główny cel | Dostawy drewna i kamienia oraz naprawa latarni |
| Karta ekspedycji | Wybór jednej z trzech rozgrywalnych plansz |
| Budynki na mapie i karty dolnego doku | Szczegóły, koszty i bezpośrednie ulepszenie wybranego budynku |
| Statek i przystań | Kupno i sprzedaż towarów |
| Most, plaża i wodospad | Ścieżki, mosty i dekoracje |
| Kategorie dolnego doku | Budynki, produkcja, dekoracje i ścieżki |

Silnik obsługuje dom, farmę, tartak, kamieniołom, przystań, magazyn, latarnię, obóz drwali, młyn, ratusz, kaplicę i targ. [Tabela budynków](BUILDINGS.md) pokazuje osobno logikę, stan, koszty i efekty każdego z nich. Pracowników zatrudnia osiem wskazanych miejsc pracy. Produkcja materiałów działa w farmie, młynie, obozie drwali, tartaku i kamieniołomie; przystań, targ i magazyn również przyjmują pracowników, ale nie produkują monet w dawnym cyklu produkcyjnym. Brak wolnych mieszkańców, surowców lub miejsca na gotową produkcję ogranicza odpowiednie operacje.

## Start, poziom i szczęście

Nowa wyspa zaczyna z **100 monet, 100 zboża, 100 drewna, 100 kamienia, 100 żywności i 100 desek**, **12 mieszkańcami**, **szczęściem 0%**, **ratuszem na poziomie 1** i **domem na poziomie 1**. W obecnym prototypie oznacza to pierwszą wizytę bez zapisu albo potwierdzone rozpoczęcie nowej wyspy. Logowanie do konta jest przyszłym zakresem backendu; odświeżenie strony zachowuje istniejący postęp. Na starcie wszystkie lokalne składy producentów są puste. Pięć materiałów zajmuje łącznie 500 miejsc magazynu centralnego, a 100 monet znajduje się osobno w skarbcu.

Poziom gracza jest zawsze poziomem ratusza. **Każdy pozostały budynek można rozbudować najwyżej do poziomu ratusza**, w ramach technicznego maksimum 100. Ratusz sam można podnosić do następnego poziomu. Zablokowana rozbudowa wskazuje wymagany poziom ratusza i nie pobiera zasobów. Latarnia najpierw wymaga opłaconej budowy poziomu 1; późniejsze poziomy podlegają tej samej zasadzie co pozostałe budynki.

Teoretyczny limit populacji wynosi `24 × poziom ratusza`: przykładowo poziomy 1–6 pozwalają na 24, 48, 72, 96, 120 i 144 mieszkańców. W aktualnym prototypie wspólne techniczne maksimum poziomu budynku i ratusza wynosi 100; wcześniejszy limit 5 nie blokuje już poziomu 6. Rzeczywista liczba miejsc mieszkalnych wynosi osobno `24 × poziom domu`. Ulepszenie ratusza zwiększa limit osady, ale nie dodaje miejsc w domu. Ulepszenie domu zwiększa miejsca mieszkalne, ale nie zmienia limitu ratusza i nie dodaje od razu ludzi.

| Przykład | Wartość |
| --- | --- |
| Ratusz na poziomie 4 | Poziom gry 4, limit 96 mieszkańców, pozostałe budynki najwyżej na poziomie 4 |
| Dom na poziomie 3 | 72 miejsca mieszkalne |
| Populacja 78 | 6 mieszkańców bez miejsca, mimo wolnego limitu ratusza |
| Kara za przeludnienie | −6 punktów procentowych/h dla każdej osoby, sumowane z jej innymi efektami, dopóki liczba osób bez miejsca pozostaje równa 6 |

Populacja może przekroczyć liczbę miejsc mieszkalnych i dalej rosnąć do limitu ratusza, jeżeli szczęście jest dodatnie. **Każda osoba bez miejsca obniża szczęście o 1 punkt procentowy na rzeczywistą godzinę aktywnej gry.** Tempo jest liczone z bieżącego przeludnienia: `max(0, populacja − miejsca mieszkalne)` punktów procentowych na godzinę. Kara jest naliczana płynnie każdej osobie i sumuje się z jej pozostałymi efektami; ułamkowa wartość szczęścia zachowuje się po zapisie i odświeżeniu. Rozbudowa domu do odpowiedniej pojemności zatrzymuje dalszą karę, ale nie zwraca już utraconego szczęścia.

Szczęście jest jedyną wartością gospodarczą dopuszczającą znak ujemny. Zasoby, liczby mieszkańców i pozostałe liczniki pozostają nieujemne. Szczęście każdej osoby jest ograniczone do przedziału **−100%…+100%**, a następnie obliczamy średnią populacji. Nowa osoba zaczyna od 0%; nie dziedziczy zgromadzonego szczęścia pozostałych. HUD i lista mieszkańców pokazują pełne procenty zaokrąglone w górę: 20,2% → 21%, −20,2% → −20%. W obliczeniach, zapisie i demografii pozostają dokładne ułamki. Przy dokładnie 0% populacja się nie zmienia. Dodatnia wartość zwiększa populację, ujemna zmniejsza ją w tym samym tempie:

| Wartość bezwzględna szczęścia | Czas na zmianę o jedną osobę |
| --- | --- |
| 0% | Brak zmiany |
| 25% | 12 godzin |
| 50% | 6 godzin |
| 75% | Około 1 godziny 43 minut |
| 100% | 1 godzina |

Użytkownik zaakceptował proporcjonalne tempo pomiędzy punktami 0%, 50% i 100%. Dla `h = |szczęście|` liczba osób na godzinę wynosi `h / 300` dla `0 ≤ h ≤ 50` oraz `1/6 + (h − 50) / 60` dla `50 < h ≤ 100`. Znak szczęścia określa kierunek zmiany.

Czas oznacza rzeczywisty czas aktywnej gry na widocznej karcie. Przyspieszenie 1×/2×/4× nie przyspiesza narodzin, ubytku ani kary za przeludnienie; pauza je zatrzymuje. Ukryta karta i czas poza grą nie naliczają postępu. Niepełna część postępu jest zapisywana. Zmiana znaku lub ustawienie 0% zeruje postęp poprzedniego kierunku. Przy maksymalnej populacji nie odkłada się zapas narodzin; przy minimum nie odkłada się ubytek.

Populacja nigdy nie spada poniżej **6 osób**. Po jej spadku przydziały pracowników są ograniczane do liczby mieszkańców, a gracz może dalej rozdzielać pracę, produkować i handlować. Dekoracje i ścieżki podnoszą szczęście obecnych mieszkańców o 1 punkt. Kaplica i latarnia uruchamiają premie czasowe opisane w aktualnych regułach; nie dodają dawnych stałych +3/+10. Głód i bezrobocie mają nowe indywidualne premie oraz kary opisane poniżej, zamiast dawnego zbiorczego −25/h za głód. Przeludnienie obniża szczęście i może doprowadzić do wartości ujemnej, która uruchamia ubytek mieszkańców.

## Jedzenie, praca i indywidualne szczęście

Mieszkaniec dostaje +1 punkt procentowy szczęścia na aktywną godzinę jedzenia oraz osobne +1 za przydział do pracy. Każdy ma dwa osobne liczniki ciągłego braku: jedzenia i pracy. Po 12 godzinach danego braku zaczyna działać kara −5 punktów/h, bez kary wstecz za pierwsze 12 godzin. Jedzenie zeruje licznik głodu, a przydział do pracy licznik bezrobocia. Szczęście osoby zachowuje się przy zwolnieniu, pięciominutowym powrocie oraz ponownym zatrudnieniu; okres powrotu liczy się jako brak pracy.

| Stan osoby, bez dodatkowych efektów | Zmiana szczęścia |
| --- | --- |
| Je i pracuje | +2 punkty/h |
| Je, bezrobotna do 12 h | +1 punkt/h |
| Je, bezrobotna ponad 12 h | −4 punkty/h: +1 za jedzenie −5 za bezrobocie |
| Nie je do 12 h, pracuje | +1 punkt/h |
| Nie je ponad 12 h, pracuje | −4 punkty/h: +1 za pracę −5 za głód |
| Nie je i nie pracuje, oba braki ponad 12 h | −10 punktów/h |

Przy obu brakach młodszych niż 12 h bilans wynosi 0, a przy tylko jednym przekroczonym progu −5 punktów/h. Liczniki są niezależne, więc osoba może już podlegać karze bezrobocia, a dopiero zaczynać okres głodu. Przykład jednej osoby: 10 h jedzenia i pracy od zera daje 20%; następne 12 h z jedzeniem bez pracy daje 32%; kolejna godzina bezrobocia zmniejsza wynik do 28%.

Każda osoba zjada **1 Food na aktywną godzinę**, również bezrobotna i wracająca. Jedzenie przydziela się automatycznie wyłącznie z magazynu centralnego; lokalna żywność młyna, targ i oczekujące dostawy muszą najpierw dotrzeć centralnie. Cała jednostka rezerwuje się do wspólnego posiłku, a niezużyta część `foodCredit` jest zapisywana i nie może ponownie finansować budowy.

Brak centralnego i już przydzielonego jedzenia **od razu zmniejsza wydajność do połowy**, niezależnie od 12-godzinnego okresu bez kary szczęścia: producent 10 → 5 sztuk/os./h, magazynier i pracownik targu 60 → 30 sztuk/os./h. Dotyczy to również transportu na budowę; podatki przydzielonych osób pozostają 1 moneta/h. Latarnia nadal mnoży produkcję ×2, czyli głodny pracownik z jej premią produkuje 10/h. Zmiany tempa zachowują postęp niedokończonej jednostki.

Czas żywienia i oba liczniki liczą tylko aktywną widoczną grę, bez przyspieszenia gospodarczego, pauzy i czasu offline. Aktualna średnia wyspy jest liczona z indywidualnych wyników po uwzględnieniu dotychczasowych efektów mieszkań, pełnych składów oraz premii. Pełna specyfikacja jest w [regułach gospodarki](ECONOMY-RULES.md).

## Pracownicy, powrót do domu i podatki

Pracowników można przydzielać dokładnie do ośmiu miejsc pracy:

| Miejsce pracy | Rola |
| --- | --- |
| Farma | Produkuje zboże do lokalnego składu |
| Młyn | Zużywa 2 zboża na 1 żywność, odkładaną lokalnie |
| Obóz drwali | Produkuje drewno do lokalnego składu |
| Tartak | Zużywa 2 drewna na 1 deskę, odkładaną lokalnie |
| Kamieniołom | Produkuje kamień do lokalnego składu |
| Magazyn | Jego załoga przewozi materiały do magazynu centralnego |
| Przystań | Obsługa portu, handlu i ekspedycji |
| Targ | Obsługa handlu |

Dom, ratusz, kaplica i latarnia nie zatrudniają pracowników. Limit **każdego** miejsca pracy wynosi `floor(aktualna populacja / 2)`. Nie jest to połowa teoretycznego limitu ratusza. Każda osoba może mieć tylko jeden przydział; suma pracujących i wracających do domu nie przekracza populacji. Dodawanie załogi wykorzystuje wyłącznie dostępnych, nieprzydzielonych mieszkańców. Budowa i ulepszenie budynku nie zatrudniają automatycznie dodatkowych osób.

| Przykład | Limit jednego miejsca pracy | Wspólna pula mieszkańców |
| --- | --- | --- |
| Ratusz 6, faktycznie 144 mieszkańców | 72 | Po przydzieleniu 72 do farmy pozostaje najwyżej 72 do innych miejsc |
| Ratusz 6, faktycznie 100 mieszkańców | 50 | Do wszystkich miejsc łącznie najwyżej 100 |
| Ratusz 6, faktycznie 12 mieszkańców | 6 | Poziom 6 sam nie zapewnia 144 osób |
| Faktycznie 13 mieszkańców | 6 | Połowę populacji zaokrąglamy w dół |

Przyciski „Do limitu” i „Zwolnij wszystkich” pozwalają zmienić załogę zbiorczo, z zachowaniem wolnej puli i limitu danego miejsca. Zwolnienie uruchamia **5 minut powrotu do domu**. Taka osoba nie pracuje, nie płaci podatku i nie może dostać nowego przydziału. Po zakończeniu powrotu jest dostępna, ale nie zostaje automatycznie zatrudniona. Pozostały czas powrotu jest zapisywany i zatrzymuje się podczas pauzy, ukrycia karty i czasu poza grą.

Po spadku populacji silnik dopasowuje zarówno załogę każdego budynku do nowej połowy populacji, jak i wspólną pulę mieszkańców. Na nowej wyspie pracuje po jednej osobie w pięciu producentach i magazynie: **6 pracujących, 0 wracających i 6 dostępnych**. Targ i przystań pozostają bez załogi do odblokowania.

**Jeden przydzielony pracownik generuje 1 monetę podatku na rzeczywistą godzinę aktywnej gry.** Osiem osób pracujących przez godzinę daje 8 monet; 72 osoby dają 72 monety na godzinę. Bezrobotni i osoby wracające do domu nie płacą podatku. W tym modelu podatnik to osoba przydzielona do istniejącego miejsca pracy: pozostaje podatnikiem również przy pełnym składzie lub braku surowca wejściowego.

Podatek trafia automatycznie do osobnego skarbca w pełnych monetach. Niewypłacony ułamek jest zachowywany w `taxProgress`: pół godziny pracy jednej osoby daje postęp 0,5 monety, który nie ginie po odświeżeniu. Zmiana przydziału lub ubytek populacji rozlicza czas poprzedniej i nowej załogi. Tempo kalendarza 1×/2×/4× nie przyspiesza podatku; pauza, ukryta karta i czas poza grą zatrzymują naliczanie.

Przystań, targ i ratusz nie produkują dodatkowo monet w dawnych dziesięciosekundowych cyklach. Sprzedaż towarów oraz nagrody z zadań i ekspedycji pozostają odrębnymi źródłami monet.

## Produkcja według czasu każdego pracownika

Każdy nakarmiony pracownik jednego z pięciu producentów wytwarza **10 pełnych jednostek na godzinę aktywnej pracy**, czyli jedną co 6 minut. Bez jedzenia stawka wynosi 5/h, a jednostka wymaga 12 minut. Poziom budynku nie mnoży tej indywidualnej stawki. Produkcja jest rozliczana osobno dla każdej osoby, bez łączenia części niedokończonych sztuk:

| Czas pracy osoby przed odwołaniem | Gotowe jednostki | Los niedokończonej sztuki |
| --- | --- | --- |
| 7 minut | 1 | Pozostała minuta postępu przepada |
| 13 minut | 2 | Pozostała minuta postępu przepada |
| 2 osoby po 7 minut | Po 1 na osobę, razem 2 | Nie sumujemy ich niedokończonych części |

Gotowe jednostki pozostają w lokalnym składzie po zwolnieniu pracownika. Jego postęp niedokończonej sztuki przepada przy odwołaniu. Postęp osób nadal przydzielonych zachowuje się po zapisie i odświeżeniu. Pełny lokalny skład lub brak składnika wejściowego blokuje wytworzenie kolejnych pełnych jednostek; do ponownego uruchomienia potrzebny jest transport lub dostępny surowiec.

Zboże jest nowym, osobnym materiałem. Łańcuch żywności to **farma → zboże → młyn → żywność**. Przetwarzanie ma proporcję **2 surowce na 1 produkt**:

| Producent | Materiał wejściowy zużywany z magazynu centralnego | Gotowy produkt w składzie lokalnym |
| --- | --- | --- |
| Farma | Brak | Zboże |
| Obóz drwali | Brak | Drewno |
| Kamieniołom | Brak | Kamień |
| Tartak | 2 drewna na każdą gotową deskę | Deski |
| Młyn | 2 zboża na każdą gotową jednostkę żywności | Żywność |

Stawka 10 jednostek na nakarmioną osobę na godzinę dotyczy **produktu wyjściowego**. Pracownik młyna lub tartaku zużywa więc 20 odpowiednich surowców na godzinę pełnej, nieblokowanej produkcji. Surowiec wejściowy jest pobierany, gdy powstaje gotowy produkt. Materiał leżący przy drwalach albo na farmie nie jest jeszcze wejściem dostępnym dla tartaku lub młyna: najpierw musi trafić do magazynu centralnego.

Nie ma przycisków natychmiastowego odbioru ani ręcznego przetwarzania materiałów. Dawne akcje odbioru i wytwarzania nie mogą ominąć czasu pracy czy transportu. Zadanie pierwszego zbioru wykonuje rzeczywisty transport do magazynu, a zadanie rzemieślnika rzeczywista produkcja młyna lub tartaku.

## Składy lokalne i magazyn centralny

Każdy z pięciu producentów ma własny skład lokalny na `200 × poziom ratusza` jednostek swojego produktu. Na poziomie ratusza 1 każdy taki skład mieści 200, a na poziomie 6 — 1200 jednostek. To osobne limity przy budynkach, niezależne od poziomu magazynu centralnego. Towar w składzie lokalnym nie jest jeszcze zasobem, którym można zapłacić za budowę, dekorację, handel czy dostawę do latarni.

Załoga magazynu przewozi gotowe towary automatycznie: **60 jednostek materiału na godzinę na nakarmionego pracownika**, czyli jedną jednostkę na minutę pracy osoby. Głodna osoba przewozi 30/h, czyli jedną co dwie minuty. Bez magazynierów produkcja może wypełniać składy lokalne, ale nie przechodzi z nich do dostępnych centralnie zapasów.

Gracz ustala w magazynie lub panelu zasobów kolejność priorytetów dla pięciu materiałów: zboża, drewna, kamienia, żywności i desek. Magazynierzy wybierają zgodnie z tą kolejnością materiał dostępny do przewozu i mieszczący się w centralnym magazynie. Brak towaru albo brak miejsca dla danego rodzaju powoduje przejście do kolejnego priorytetu, zamiast blokowania całego transportu.

Magazyn centralny ma jednocześnie limit na pojedynczy rodzaj materiału i limit wspólny dla wszystkich pięciu. Oba zwiększają się o 50% za każdy kolejny poziom magazynu, z procentem składanym i zaokrągleniem w dół:

- limit rodzaju: `floor(1000 × 1,5^(poziom magazynu − 1))`;
- limit łączny: `floor(4000 × 1,5^(poziom magazynu − 1))`.

| Poziom magazynu | Maksymalnie jednego rodzaju | Wszystkie materiały łącznie |
| --- | --- | --- |
| 1 | 1000 | 4000 |
| 2 | 1500 | 6000 |
| 3 | 2250 | 9000 |

Przykładowo na poziomie 1 cztery rodzaje po 1000 jednostek wyczerpują limit wspólny, nawet jeżeli piąty rodzaj ma zapas 0. Transport kolejnego materiału czeka, dopóki nie powstanie miejsce. **Monety są w osobnym skarbcu i nie zajmują miejsca magazynu.** Wszystkie koszty pobierają materiały wyłącznie z magazynu centralnego, a monety ze skarbca.

Nagrody i starsze zapisy nie tracą materiałów przez nowe ograniczenia pojemności. Nadwyżki trafiają do kolejki dostaw `pendingDeliveries`: czekają na miejsce i transport magazynierów, a przed przyjęciem do centralnego magazynu nie są dostępne do wydania. Zakup w porcie, który nie zmieściłby się w centralnym magazynie, jest odrzucany bez pobierania monet.

## Kompaktowi producenci

Pięć paneli produkcji ma układ2×2: Level | Storage, a niżej Workers aktualni/limit z małym −/+ | Taxes. Pod magazynem jest mały czas do następnej sztuki lub przyczyna zatrzymania. Osobne „i” pokazuje reguły produkcji. Duże akcje zbiorcze i powtórzona karta nie są wyświetlane w budynku; ogólne zarządzanie pozostaje w Residents.

## Rozbudowa, premie i powiadomienia

Przycisk „Upgrade” zleca aktualny budynek bez wybierania miejsca. Opis źródła materiałów i czasu rozbudowy jest dostępny w popupie pod ikoną „i” obok nagłówka; nie zajmuje trzech akapitów pod kosztami. Aktywny interfejs używa angielskiego, także w komunikatach i historycznych znanych powiadomieniach. Koszty pokazują stan centralny / wymagane, czerwone przy braku i zielone przy wystarczającym zapasie. Ratusz pokazuje poziom, mieszkańców obecni/limit i podatki na godzinę. Widok „Construction and queue” jest dostępny z każdego budynku i menu. Limity miejsc, ceny, estymaty, wygaśnięcie pakietu, targ, indywidualne kary i obie premie latarni opisano w [aktualnych regułach](ECONOMY-RULES.md).

## Jak grać

1. Przydziel dostępnych ludzi do producentów i magazynu. Każde miejsce przyjmuje najwyżej połowę aktualnej populacji; przydzielone osoby płacą podatek.
2. Wybierz kolejność przewozu materiałów w magazynie lub zasobach. Obserwuj osobno składy lokalne i dostępne zapasy centralne.
3. Farma, drwale i kamieniołom pozyskują materiały; młyn i tartak zużywają po 2 surowce centralne na jednostkę swojego produktu. Przy jedzeniu na gotowe jednostki pracownika czekasz po 6 minut, a magazynier przewozi po jednej sztuce na minutę; bez jedzenia oba czasy są dwukrotnie dłuższe.
4. Zwolniony pracownik wraca do domu przez 5 minut. W tym czasie nie płaci podatku ani nie może dostać nowego przydziału. Przed odwołaniem weź pod uwagę utratę jego niedokończonej jednostki.
5. Rozbuduj ratusz, aby odblokować poziomy innych budynków i większe składy lokalne. Rozbudowa domu zapewnia miejsca mieszkalne; rozbudowa magazynu zwiększa centralną pojemność na każdy rodzaj i łącznie.
6. Zgromadź 500 każdego zasobu ze złotem i uruchom budowę latarni. Transport zajmuje T, budowa 2T. Po ukończeniu oba bonusy, +100 szczęścia oraz produkcja materiałów ×2, trwają 24 h × osiągnięty poziom; podatki bez zmian.
7. Rozwiązuj trzy ekspedycje, przechodząc od `S` do `G`. Nagroda każdej planszy jest przyznawana raz; skrzynie `C` dodają po 10 monet. Materiały z nagród, które nie mieszczą się w magazynie, czekają w kolejce dostaw.

Przykładowe operacje gospodarcze:

| Operacja | Zmiana zasobów |
| --- | --- |
| Gotowa deska w tartaku | −2 centralnego drewna, +1 lokalna deska |
| Gotowa żywność w młynie | −2 centralnego zboża, +1 lokalna żywność |
| Transport materiału | −1 ze składu lokalnego lub oczekującej dostawy, +1 centralnie |
| Godzina pracy jednej przydzielonej osoby | +1 moneta podatku |
| Kwiaty / lampa / ławka | −25 / −40 / −35 monet i +1 szczęścia, maksymalnie 100% |
| Ulepszenie ścieżek | −5 centralnego drewna, −10 centralnego kamienia i +1 szczęścia |

Koszty kolejnych poziomów rosną wraz z poziomem. Źródłem aktualnych liczb i cen handlu są definicje w `harborlight-v1-state.js`; interfejs korzysta z tych samych danych.

## Pliki i podział odpowiedzialności

| Plik | Odpowiedzialność |
| --- | --- |
| `harborlight-v1-layered.html` | Scena 1672×941, dziewięć wycinków obrazu, dialog i punkty montażu interfejsu |
| `assets/harborlight-v1-approved.png` | Oryginalny zaakceptowany PNG, bez zmiany pikseli |
| `harborlight-v1-play.js` | Obszary kliknięć, panele, HUD, plansze ekspedycji i zapis przeglądarkowy |
| `harborlight-v1-play.css` | Interakcje, fokus, dialogi, plansze, układ mobilny i ograniczenie ruchu |
| `harborlight-v1-state.js` | Czysty silnik: stan, rozbudowa, miejsca mieszkalne, przeludnienie, limity pracowników, powroty, podatki, indywidualna produkcja, transport i pojemności, szczęście oraz populacja |
| `harborlight-v1-logistics.js` | Indywidualne fazy pracy, składy, transport, targ, rezerwacje, kolejka budowy, estymaty i lokalny model uprawnienia |
| `harborlight-v1-residents.js` | Tożsamości mieszkańców, ich indywidualne szczęście, liczniki głodu i bezrobocia, przydziały oraz wydajność zależna od jedzenia |
| `harborlight-v1-ambient.js` | Osobna warstwa Canvas, wspólny czas, wiatrak, chmury i budowa |
| `harborlight-v1-smoke.js` | Emisja i cykl życia kłębów dymu z 9 kominów |
| `harborlight-v1-inhabitants.js` | Oczyszczone tło świata bez nieruchomych ludzi i starych smug |
| `harborlight-v1-water.js` | Maskowana animacja morza, fal i dwóch wodospadów |
| `harborlight-v1-life.js` | Ruch mieszkańców, zwierząt i mew |
| `tests/harborlight-state.test.mjs` | Testy reguł gospodarki i normalizacji zapisu |
| `tests/harborlight-browser-smoke.py` | Regresja całej gry przez rzeczywiste kliknięcia w Chromium |
| `tests/harborlight-population-smoke.py` | Nowy HUD, start, rzeczywisty licznik czasu, ujemne szczęście i migracja zapisów |
| `tests/harborlight-happiness-smoke.py` | Indywidualne szczęście i liczniki, zmiany przydziału, pełne procenty, telefon i zapis |
| `tests/harborlight-animation-smoke.py` | Ruch grup efektów, maski interfejsu i zatrzymywanie animacji |

## Zapis

Klucz `localStorage`: `harborlight-v1-interactive-save`, wersja schematu `version: 7`. Zapis następuje po udanej operacji, okresowo i przy opuszczeniu strony. „Save now” wymusza zapis; błąd dostępu do pamięci jest komunikowany graczowi. Wcześniejsze robocze etapy v4/v5 nie były publikowane; indywidualne szczęście używa wersji frontendu `happiness-v8`.

Stan zachowuje:

- `resources`: monety w skarbcu oraz centralne zboże, drewno, kamień, żywność i deski;
- `buildings`: poziom, przydział i lokalne gotowe materiały producenta;
- indywidualny postęp niedokończonej jednostki każdej nadal przydzielonej osoby oraz postęp pracy magazynierów;
- pozostały czas powrotu odwołanych pracowników i kolejność priorytetów transportu;
- `pendingDeliveries`: materiały czekające na przyjęcie do centralnego magazynu;
- `population`, `capacity`, dokładne średnie `happiness`, `populationProgress`, `populationDirection`;
- `residents`: trwałe identyfikatory, indywidualne `happiness`, `hungerSeconds`, `unemployedSeconds`, `workplace` i `returnRemaining`, oraz sekwencję identyfikatorów nowych osób;
- `foodCredit`: niezużyty ułamek wcześniej przydzielonej całej jednostki żywności;
- `taxProgress`: ułamek niewypłaconej monety, oraz `statistics.taxCollected`: wypłacone monety podatku;
- dostawy i stan latarni, zadania, ekspedycje, statystyki, dekoracje, ścieżki, kalendarz, tempo, pauzę i ustawienia;
- indywidualne i średnie szczęście, liczniki pełnych magazynów, powiadomienia i przeczytanie;
- stan targu, zlecenia, dostawy blokowane przez godzinę i odbiór;
- liczniki premii kaplicy i latarni, jednorazowe użycia błogosławieństw, serię dni;
- listę projektów budowy, rezerwacje, etapy, zależności poziomów i datę ważności lokalnego modelu pakietu.

`normalizeState()` przywraca brakujące wartości, odrzuca nieprawidłowe liczby i dopasowuje przydziały do faktycznej populacji. Zapisy 1/2 zachowują zainwestowane poziomy budynków przez podniesienie ratusza do najwyższego już posiadanego poziomu. Wersje 3 i późniejsze nie otrzymują kolejnego darmowego podniesienia ratusza; poziomy innych budynków są walidowane względem niego. Populacja pozostaje w przedziale od 6 do limitu ratusza, bez obcinania do liczby miejsc mieszkalnych. Naprawiona latarnia zachowuje poziom.

Migracja do schematu 7 odtwarza osoby z dotychczasowego bazowego szczęścia i istniejących przydziałów, z zachowaniem osobnych efektów czasowych i kar za składy. Nie nalicza nieznanej historii głodu ani bezrobocia; nowe liczniki zaczynają od zera. Poprawne indywidualne stany schematu 7 zachowują tożsamości, szczęście i oba liczniki po odświeżeniu.

Migracja nie przyznaje nowego zestawu startowego. Zachowuje wcześniejsze centralne zasoby, a nadwyżki ponad nowe limity przenosi do `pendingDeliveries`, aby nie tracić materiałów i nie czynić ich od razu dostępnymi do wydania. Gotowe, nieodebrane monety dawnej produkcji ratusza, przystani i targu są jednorazowo wypłacane do skarbca i usuwane ze starych buforów. To wcześniejszy zarobek, nie nowy podatek; nie zwiększa statystyki podatku i nie jest wypłacany ponownie przy odświeżeniu nowego zapisu.

Przydziały spoza ośmiu miejsc pracy są usuwane, a pozostałe załogi dopasowywane do połowy faktycznej populacji i wspólnej puli. Brakujące zboże starszego zapisu nie oznacza ponownego przyznania całego zestawu startowego. Postęp jednostki jest zachowywany tylko dla nadal przydzielonego pracownika; odwołanie usuwa niedokończoną sztukę i zapisuje 5 minut powrotu. Poprawne ułamki podatku i pozostałe czasy powrotu zachowują się po odświeżeniu.

Operacje nie pozwalają wielokrotnie odebrać tej samej nagrody. To integralność prototypu, nie serwerowa ochrona przed ręczną edycją zapisu przez właściciela przeglądarki. Zapis nie jest kontem użytkownika ani kopią w chmurze; usunięcie danych witryny usuwa postęp.

## Sprawdzanie zmian

Uruchomienie z katalogu repozytorium:

```sh
python3 -m http.server 8002 --bind 127.0.0.1
node --test tests/harborlight-state.test.mjs tests/harborlight-hunger.test.mjs
python3 tests/harborlight-browser-smoke.py
python3 tests/harborlight-population-smoke.py
python3 tests/harborlight-logistics-smoke.py
python3 tests/harborlight-construction-smoke.py
python3 tests/harborlight-language-smoke.py
python3 tests/harborlight-happiness-smoke.py
python3 tests/harborlight-animation-smoke.py
```

Test przeglądarkowy wymaga Python Playwright i Chromium (domyślnie `/usr/bin/chromium`). Serwer musi działać w osobnym terminalu. Inny port/adres oraz Chromium ustawia się przez `HARBORLIGHT_BASE_URL` i `HARBORLIGHT_CHROMIUM`.

Sprawdzenie obejmuje dokładnie osiem miejsc pracy i wspólną pulę, poziom 6 przy populacjach 144/100/12, nieparzystą populację, podatki od pracujących oraz zapis ułamka. Produkcja musi potwierdzić po 1 gotowej jednostce po 7 minutach i po 2 po 13 minutach na osobę, brak łączenia indywidualnych ułamków, utratę niedokończonej sztuki przy odwołaniu i powrót przez 5 minut bez podatku oraz możliwości ponownego przydziału.

Test logistyki powinien wykazać 10 jednostek produkcji i 60 jednostek transportu na nakarmioną osobę na godzinę oraz odpowiednio 5 i 30 przy głodzie, obie receptury 2:1, lokalne `200 × ratusz`, centralne limity rodzaju i sumy z mnożnikiem 1,5, priorytety z pomijaniem pustych lub pełnych rodzajów oraz brak magazynowej objętości monet. Należy sprawdzić, że wydawane są tylko centralne zapasy, brak ręcznego odbioru/przetwarzania, odrzucony zakup nie pobiera monet, a nadwyżki nagród i starego zapisu czekają bez utraty w dostawach.

Test szczęścia powinien potwierdzić osobne historie osób, +2/h przy jedzeniu i pracy, dokładny próg 12 h, kary −5/h osobno, reset odpowiedniego licznika, przykład 20% →32% →28%, ograniczenie przed średnią, brak naliczania offline i zgodność długich oraz podzielonych kroków. Wyświetlenie musi zaokrąglać w górę bez zmiany dokładnego stanu.

Regresja obejmuje koszty i blokadę rozbudowy przez ratusz, osobne limity ratusza i domu, przeludnienie, minimum 6, zapis, migrację, latarnię, handel, zadania i trzy ekspedycje. Panele muszą działać na komputerze i telefonie, z klawiaturą i ograniczeniem animacji, bez błędów JavaScript ani HTTP. Samo uruchomienie serwera nie jest potwierdzeniem zaliczenia testów.

## Granice tej wersji

Scena nadal wykorzystuje wycinki zatwierdzonego obrazu oraz kontrolki i oznaczenia stanu. Poziomy budynków, dodane dekoracje SVG, ulepszone ścieżki i światło naprawionej latarni mają osobne oznaczenia nad bazową grafiką. Nie jest to jeszcze komplet niezależnych grafik terenu, budynków, mieszkańców i efektów. Osobne pełne grafiki etapów budowy, swobodne rozmieszczanie nowych budynków oraz kamera z pan/zoom pozostają oddzielnymi pracami Frontend. Prototyp ma trzy plansze ekspedycji i uproszczoną gospodarkę.

Warstwa Canvas dodaje obracający się wiatrak, dym z 9 kominów, trzy warstwy chmur, fale i dwie kaskady, 24 chodzące sylwetki mieszkańców, 7 zwierząt, 7 mew oraz pracujące wciągniki na budowie. Sylwetki są obecnie dekoracją świata i nie odwzorowują licznika populacji 1:1. Ruch respektuje pauzę, tempo i ograniczenie animacji; efekty nie blokują kontrolek. Tło świata oczyszczono z nieruchomych postaci i starych smug. Szczegóły assetów i ograniczeń są w [dokumencie animacji świata](WORLD-ANIMATION.md).

Nie ma backendu, logowania, synchronizacji urządzeń ani serwerowej walidacji gospodarki. Prace te są opisane w [backlogu](BACKLOG.md). Model uprawnienia pakietu działa lokalnie i podlega testom, ale nie sprzedaje pakietu ani nie weryfikuje płatności. Nie dodano PvP ani reklam.
