# Archipelag i handel — analiza v23 przed decyzjami

Stan analizy: 31 października 2026, uzupełniony o pięć odpowiedzi użytkownika do analizy. Punktem odniesienia reguł jest kod `34f2eb3128fde2ce2d03429f5b0b180c66525412`. Ten dokument nie zmienia mechanik, zapisów graczy ani wdrożeń. Ustalenia oznaczone jako przyjęte wynikają z odpowiedzi użytkownika; pozostałe rekomendacje są propozycjami.

## 1. Co użytkownik określił, a co pozostaje otwarte

Użytkownik określił następujący kierunek:

- Wyspy córki mają nazwę z wymuszonym początkiem od nazwy wyspy macierzystej, np. `Dom - Ekspansja`.
- Można przewozić ludzi między własnymi wyspami; statek pasażerski mieści 100 osób, rejs z ludźmi trwa 30 minut. Dany rejs przewozi albo towary, albo ludzi.
- Nowa wyspa zabiera dokładnie sześć istniejących osób z Domu macierzystej: teleportują się natychmiast, bez rejsu. Zwykłe późniejsze przewozy pasażerskie nadal trwają 30 minut.
- Wyspa macierzysta jest chroniona przed spadkiem poniżej 12 mieszkańców także przez dżumę i odejścia, a nie tylko dobrowolny wyjazd.
- Zakładanie wyspy ma pojawić się w Ratuszu i w powiadomieniu po osiągnięciu wymaganego poziomu, bez nowej osobnej ikonki zakładania wyspy.
- NPC i handel między graczami mają działać równolegle. Wycofuje to poprzednią zasadę zamknięcia handlu NPC od poziomu Ratusza 6.
- Gra ustala maksymalną cenę, a gracz może zaoferować niższą.
- Po każdych kolejnych trzech poziomach ma być dostępna następna wyspa. Użytkownik podał koszt jako sumę Ratusza A i Domu A, z A = 7/8/9 dla pierwszej/drugiej/trzeciej dodatkowej wyspy.

Użytkownik przyjął: **najpierw analiza i decyzje**, **sprzedaż materiałów za monety w PvP**, **progi Ratusza 10/13/16/19**, **limit 20 wysp łącznie**, **sumę wszystkich rozbudów Ratusza i Domu od 1 do A**, **aktualizowanie prefiksów po zmianie nazwy matki**, **natychmiastową kolonizację sześcioma osobami z Domu** oraz **ochronę matki do minimum 12 osób także przed zdarzeniami**. Maksymalna cena PvP to **bazowa cena sprzedaży NPC do gracza**; wolno wystawiać taniej i odsprzedawać zakupiony towar NPC. To ustalenia do przyszłego wdrożenia. Poziomy i zasoby startowe córki oraz szczegóły zwykłych rejsów pasażerskich pozostają otwarte.

## 2. Różnice wobec działającego modelu

| Obszar | Obecny kod | Konsekwencja nowego kierunku |
| --- | --- | --- |
| Liczba wysp | Dwie, stałe `island-1` i `island-2`, metadane archipelagu v1 | Potrzebny format wielu wysp i migracja odczytu/zapisu/API, a nie sam nowy przycisk. |
| Założenie drugiej | Ratusz matki 10, bez opłaty, bez zabierania mieszkańców | Nowa opłata i natychmiastowy teleport sześciu rzeczywistych osób zmieniają gospodarkę. |
| Nowa druga wyspa | 12 nowo utworzonych mieszkańców, po 100 wszystkich sześciu zasobów, wszystkie budynki 1; Ratusz i Magazyn jednorazowo kopiują poziomy matki | Start z sześcioma przesiedleńcami nie może zostawić jeszcze tych 12 nowych osób. Poziomy, zasoby i kopiowanie wymagają osobnej decyzji. |
| Nazwy | Każda wyspa ma niezależne `islandName`, 2–40 znaków | Wymuszony prefiks musi uwzględnić zmianę nazwy matki oraz limit długości. |
| Własny statek | Jeden rejs naraz; 1000 materiałów, 10 minut, bez monet; rozbudowa 1000 miejsc za 4,99 zł wyłącznie w symulacji | Dodajemy odrębny tryb pasażerski, nie dzielimy pojemności 100 ludzi przez przelicznik zakupionego ładunku. |
| Mieszkańcy | Numeryczne ID unikalne tylko wewnątrz jednej wyspy, populacja minimum 6; normalizacja odtwarza brakujące osoby | Przenoszenie samych liczników populacji utworzyłoby lub usunęło inne osoby. Potrzebny trwały transfer konkretnych rekordów. |
| Handel | Port NPC od Ratusza 4 do 5, barter NPC na Rynku od 2 do 5; PvP od 6, barter materiał–materiał, escrow i transakcje serwera | NPC pozostaje dostępny od 6. Potwierdzona sprzedaż PvP za monety wymaga nowej wersji kontraktu. |

Źródła: [`harborlight-v1-archipelago.js`](../../harborlight-v1-archipelago.js), [`harborlight-v1-state.js`](../../harborlight-v1-state.js), [`harborlight-v1-residents.js`](../../harborlight-v1-residents.js), [`harborlight-v1-logistics.js`](../../harborlight-v1-logistics.js), [`backend/player-trade.mjs`](../../backend/player-trade.mjs).

## 3. Nazwy i tożsamość wysp

**Przyjęte:** bieżący prefiks córki zmienia się razem z nazwą matki. **Propozycja zapisu:** matką jest zawsze pierwsza wyspa konta; córka przechowuje własny sufiks, a jej bieżąca nazwa jest wyliczana jako `<bieżąca nazwa matki> - <sufiks>`. Nie wyciągamy tożsamości z tekstu nazwy: zapis, rejs, oferty i osoby odnoszą się do niezmiennego `islandId`.

Przykład: `Dom` + `Ekspansja` daje `Dom - Ekspansja`. Zmiana matki na `Port` daje `Port - Ekspansja` bez zmiany ID, mieszkańców, rejsów czy zasobów. Zmiana nazwy córki edytuje sufiks; prefiks nie jest polem edytowalnym. Sufiksy powinny być jednoznaczne w archipelagu, również po normalizacji Unicode i wielkości liter — to propozycja walidacji, nie ustalona nowa reguła.

Dzisiejszy limit 40 znaków dla każdej pełnej nazwy jest sprzeczny z matką, która sama ma 40 znaków: nie ma wtedy miejsca na separator i sufiks. **Propozycja minimalna:** zachować 2–40 znaków dla nazwy matki i dopuścić osobne 2–40 znaków sufiksu; pełna nazwa córki ma wtedy do 83 znaków. Wymaga to świadomego podniesienia limitów w profilu, walidacji serwera, listach, powiadomieniach i ofertach — obecnie oferta obcina nazwę do 80 znaków. Alternatywa to krótszy wspólny limit, ale bez automatycznego ucinania istniejących nazw.

Historyczne wydarzenie/oferta może przechowywać nazwę z chwili utworzenia. Bieżąca etykieta wyspy musi używać aktualnego prefiksu. **Propozycja:** historia zachowuje migawkę, a nawigacja i aktywny rynek pokazują aktualną nazwę po ID; nie przepisujemy całej historii przy każdej zmianie nazwy.

## 4. Kolejne odblokowania, powiadomienie i Ratusz

Pierwsza dodatkowa wyspa jest dziś od Ratusza 10. Użytkownik potwierdził dalszy krok co trzy poziomy; początek sekwencji jest następujący:

| Dodatkowa wyspa | Wyspa łącznie | Potwierdzony próg Ratusza | Podany przez użytkownika poziom A do wyceny |
| --- | --- | --- | --- |
| 1 | 2 | 10 | 7 |
| 2 | 3 | 13 | 8 |
| 3 | 4 | 16 | 9 |
| 4 | 5 | 19 | Nie określono; A = 10 jest tylko naturalną propozycją kontynuacji. |
| 5 | 6 | 22 | Nie określono; A = 11 jest tylko propozycją. |

**Przyjęty limit: 20 wysp łącznie — jedna macierzysta i 19 córek.** Dziewiętnasta córka odblokowuje się na Ratuszu **64** (`10 + 3 × 18`). Wyższe poziomy nie odblokowują dwudziestej córki. Model nadal ma maksymalny Ratusz 100; dawny rachunek 32 wysp opisywał wariant bez osobnego limitu i nie jest obowiązującym wymaganiem.

**Propozycja:** kolejny próg sprawdza tylko Ratusz matki i wymaga istnienia poprzedniej córki. Zapobiega to odblokowaniom z tanich kopii Ratusza na córkach. Limit 20 wysp sprawdzamy niezależnie od poziomu. W Ratuszu matki opcja założenia jest ukryta poniżej progu; po osiągnięciu progu pokazuje koszt i pozostałe niespełnione warunki. Jedno trwałe powiadomienie na kolejny próg zapobiega ponawianiu go przy każdym tyknięciu lub logowaniu. Po osiągnięciu limitu nie proponujemy dalszej kolonizacji. Nie dodajemy ikony „nowa wyspa” na mapie/dolnym pasku. Wybór już założonych wysp jest osobną istniejącą funkcją.

## 5. Rzeczywiste koszty Ratusza i Domu

Obliczenia wykonano bezpośrednio przez `buildingCost(state, building, { queued: false })` z obecnego modelu, dla kolejnych faktycznych poziomów. Każdy z tych dwóch budynków kosztuje przy rozbudowie z L na L+1 po `500 × L` monet, drewna, kamienia, zboża, żywności i desek. Nie użyto starego katalogowego `BUILDINGS[id].cost`, który dla tej gałęzi wyceny nie jest ceną rozbudowy.

**Przyjęte:** sumujemy całą historię rozbudów obu budynków od poziomu 1 do A. Kolumna pojedynczych awansów poniżej pozostaje porównaniem odrzuconego wariantu:

| A | Ratusz 1→A, każdy z 6 zasobów | Dom 1→A, każdy z 6 zasobów | Suma obu 1→A, każdy z 6 zasobów | Tylko ostatni krok obu `(A−1)→A`, każdy z 6 zasobów |
| --- | ---: | ---: | ---: | ---: |
| 7 | 10 500 | 10 500 | **21 000** | **6 000** |
| 8 | 14 000 | 14 000 | **28 000** | **7 000** |
| 9 | 18 000 | 18 000 | **36 000** | **8 000** |

Pełna przykładowa cena kumulacyjna pierwszej córki to zatem **21 000 monet + 21 000 drewna + 21 000 kamienia + 21 000 zboża + 21 000 żywności + 21 000 desek**, a nie 21 000 łącznie. Samych materiałów jest 105 000. Dla kolejnych dwóch są to 140 000 i 180 000 materiałów oraz odpowiednio 28 000 i 36 000 monet.

Wzór kumulacyjny dla obu budynków od darmowego poziomu 1: `500 × A × (A−1)` **każdego** zasobu. Dzisiejsze budynki poziomu 1 są częścią startu wyspy, dlatego nie doliczamy ich ponownie. Wywołanie wyceny również dla „0→1” dodałoby niepotrzebnie po **1000 każdego zasobu** do ceny pary: dałoby 22 000/29 000/37 000 zamiast 21 000/28 000/36 000.

Jest jeszcze pułapka nazewnictwa UI: wycena pokazana budynkowi, który **już ma poziom A**, jest ceną jego awansu do A+1. Dla pary na poziomie 7/8/9 dałaby po 7000/8000/9000 każdego zasobu. To trzecia interpretacja, a nie koszt „osiągnięcia A”.

**Przyjęta nazwa kosztu:** „suma wszystkich rozbudów Ratusza i Domu od 1 do A”, płatna monetami i pięcioma materiałami. Pierwsze trzy córki kosztują po 21 000 / 28 000 / 36 000 każdego zasobu. **Pozostała propozycja techniczna:** stała opłata kolonizacji bez 10% dopłaty kolejki; nie jest ona zleceniem budowlanym. Kontynuacja poziomu wyceny A po trzeciej córce wymaga odrębnego zatwierdzenia.

### Czy te ceny mieszczą się w Magazynie?

Obecny limit to `floor(1000 × 1,5^(L−1))` na materiał i `floor(4000 × 1,5^(L−1))` łącznie, do istniejących limitów maksymalnych. Wydając żywność, trzeba zachować rezerwę `50 × poziom Magazynu`. Poniżej jest minimalny Magazyn pozwalający zapłacić jednorazowo **zwykłym zapasem**, bez innych rezerwacji i zbędnego zapasu:

| Wariant | Cena każdego materiału | Materiały razem + chroniona żywność | Minimalny Magazyn | Limit jednego / łączny tego Magazynu |
| --- | ---: | ---: | ---: | ---: |
| Kumulacyjny A7 | 21 000 | 105 500 | **10** | 38 443 / 153 773 |
| Kumulacyjny A8 | 28 000 | 140 500 | **10** | 38 443 / 153 773 |
| Kumulacyjny A9 | 36 000 | 180 550 | **11** | 57 665 / 230 660 |
| Ostatni krok do A7 | 6 000 | 30 300 | **6** | 7593 / 30 375 |
| Ostatni krok do A8 | 7 000 | 35 350 | **7** | 11 390 / 45 562 |
| Ostatni krok do A9 | 8 000 | 40 350 | **7** | 11 390 / 45 562 |

Magazyn 9 mieści 102 515 materiałów łącznie. Nie wystarcza na kumulacyjne A7, mimo że jego limit 25 628 na pojedynczy materiał mieści wymagane 21 000. **Oba limity trzeba sprawdzać równocześnie.** Ratusz 10 nie oznacza automatycznie Magazynu 10: sama ostatnia rozbudowa Ratusza 9→10 wymaga tylko po 4500 materiałów i może być obsłużona przy Magazynie 6.

Bonusowe materiały są wydawalne poza zwykłym limitem, ale nie wolno zakładać, że każdy gracz je posiada ani wymagać kupowania nagród dla wykonalności zadania. Istniejące rezerwacje budów, ofert czy portu dodatkowo pomniejszają dostępny zapas. Warunki pokazujemy na **dostępnych** zasobach, nie na samym widocznym `resources`.

Użytkownik zaakceptował wycenę kumulacyjną oraz wynikające z niej pojemności: przy zwykłym zapasie pierwsze trzy ceny mieszczą się dopiero przy Magazynie odpowiednio 10, 10 i 11. Nie jest to dodatkowy bezwzględny próg poziomu, jeśli gracz legalnie ma wydawalny bonus poza limitem. Alternatywny fundusz kolonizacji do wpłat partiami nie został wybrany; byłby osobną mechaniką. Dzisiejsza rezerwacja nie opróżnia fizycznie Magazynu do chwili odbioru — samo „zarezerwuj 105 000” nie rozwiązuje braku miejsca.

## 6. Sześciu kolonistów i warunek 12 osób na matce

Dla pierwszego założenia minimalne warunki wynikają wprost: matka ma **co najmniej 18 osób**, z czego **co najmniej sześć rzeczywiście w Domu**. Populacja 18 z pięcioma wolnymi osobami nie wystarcza. Populacja 17 z dziesięcioma wolnymi także nie wystarcza. Udana operacja zabiera **te same sześć rekordów osób**, a nie tworzy sześciu nowych i nie odejmuje losowych robotników.

„W Domu” już ma precyzyjną definicję `residentAtHome`: brak miejsca pracy, brak wycieczki do Latarni i modlitwy, zakończony powrót oraz zakończone dojście. Osoba zwolniona z pracy wciąż niosąca ładunek albo wracająca przez pięć minut nie spełnia tego warunku. Licznik `freeWorkers` należy wyliczać z tej definicji.

**Propozycja:** wybór sześciu osób jest jawny lub deterministyczny, a serwer ponownie sprawdza ich obecność i stan w transakcji zatwierdzenia. Spadek populacji przez dżumę między wyceną a kliknięciem może unieważnić wycenę; nie wolno wtedy pobrać zasobów i oddać pustej wyspy.

**Przyjęte:** minimum **12** na matce chroni także przed dżumą i odejściami. Przyszła zmiana musi objąć wszystkie ścieżki ubytku populacji: kolonizację, zwykłe wyjazdy, zdarzenia, odejścia i ich granice w rozliczeniu offline. Nie przywracamy po fakcie nowych losowych osób zamiast ochrony istniejących. Obecny kod nadal ma minimum 6 i wymaga osobnej implementacji/migracji; dla historycznej matki poniżej 12 sposób wyrównania pozostaje do decyzji. Dla córek nadal propozycją jest zachowanie minimum sześciu osób — użytkownik nie nadał im ochrony 12.

**Przyjęty wyjątek dla kolonizacji:** dokładnie sześć osób teleportuje się bezpośrednio z Domu matki do Domu nowej córki przy zatwierdzeniu założenia. Nie płyną 30 minut, nie zajmują statku i nie potrzebują racji na podróż. Koszt, odjęcie sześciu rekordów matce i utworzenie córki z tymi rekordami stanowią jedną atomową operację; ponowienie nie tworzy kolejnej córki ani dodatkowych osób. Normalizator nowego świata nie może najpierw wygenerować startera 12 lub minimum 6, a potem dopisać kolonistów. Pozostaje do uzgodnienia stan budynków/zasobów oraz reguła startu zegara i wprowadzenia córki. Wyjątek nie skraca zwykłych rejsów między już istniejącymi wyspami.

## 7. Rejs pasażerski — proponowany kontrakt

Ta sekcja dotyczy zwykłego przewozu między już istniejącymi wyspami. Jednorazowa kolonizacja sześcioma osobami jest opisanym wyżej, przyjętym wyjątkiem teleportacyjnym.

| Element | Wymaganie lub oznaczona propozycja |
| --- | --- |
| Ładowność ludzi | Użytkownik: 100 osób na rejs. **Propozycja:** stała i niezależna od płatnych powiększeń ładowni towarowej. |
| Czas | Użytkownik: 30 minut rzeczywistego czasu. Pozostałe podróże towarowe zachowują dziś 10 minut. |
| Wyłączność | Użytkownik: `cargo` albo `passengers`. **Propozycja:** jeden wspólny statek; aktywny/waiting rejs blokuje oba tryby. |
| Trasa | Użytkownik: między własnymi wyspami. **Propozycja:** wybór dowolnej pary istniejących wysp; oba porty muszą być czynne. |
| Wybór osób | Tylko osoby w Domu w chwili zatwierdzenia. Nazwy i ID z klienta nie zastępują weryfikacji rekordu. |
| Stan osoby | Zachowujemy tożsamość, szczęście, historię głodu, cooldowny i pozostały czas ochron/efektów. Przeprowadzka nie tworzy nowego mieszkańca i nie odnawia 24 h ochrony noworodka. |
| Ekonomia | Pasażer nie pracuje ani nie płaci podatku podczas rejsu. Jego pieniądze nie są osobistym bagażem — `resources.coins` pozostają na właściwych wyspach. |
| Rezerwacja przyjazdu | **Propozycja:** port rezerwuje miejsca w limicie Ratusza docelowego, a naturalne przybycia nie zużywają tych miejsc. Osobno pokazać liczbę łóżek, która dziś jest miękkim limitem kary, a nie twardym limitem populacji. Wymaganie również wolnych łóżek byłoby nową regułą do potwierdzenia. |
| Przyjście do Domu | **Propozycja:** po przybyciu są od razu w Domu, aby 30 minut oznaczało pełny czas dostępności. Dodatkowe pięć minut dojścia z portu jest możliwą alternatywą, lecz nie jest ustalone. |
| Anulowanie | **Propozycja:** można anulować niezrealizowaną rezerwację przed odpłynięciem. Po odpłynięciu nie ma natychmiastowego teleportu/zwrotu ludzi — ewentualny odwołany rejs wymaga rzeczywistej podróży powrotnej. |
| Brak miejsca mimo rezerwacji | **Propozycja awaryjna:** osoby pozostają jawnie na statku `waiting`, nie znikają i nie są kopiowane. Statek jest zajęty; ponowna próba lądowania jest idempotentna. |

### Żywność, czas i zdarzenia

Przed wypłynięciem rozliczamy oba światy do tej samej chwili, potem odejmujemy podróżnych od populacji źródłowej. W rejsie nie są jednocześnie mieszkańcami źródła i celu. Po przybyciu naliczanie podatków/pracy może zacząć się dopiero po prawdziwym przydzieleniu do pracy i istniejącym dojściu.

Nie wolno skopiować wraz z ludźmi `foodCredit`, `taxProgress`, zasobów, nagród ani zegara produkcji. Są to rozliczenia świata. Bonus Kaplicy/Latarni działający na całą wyspę jest oceniany dla właściwej wyspy; przeprowadzka nie przenosi globalnego błogosławieństwa na nowy świat. Osobiste pozostałe efekty nadal upływają według czasu rzeczywistego.

Jedzenie podczas rejsu nie zostało określone. Brak poboru przez 30 minut daje oszczędność `0,5 × liczba pasażerów` żywności i może zachęcać do stałego wożenia bezrobotnych. **Propozycja do decyzji:** przy odpłynięciu wyodrębnić racje na rejs (3 żywności dla sześciu osób, 50 dla stu) jako jawny koszt materiałowy, bez opłaty monetami i bez naruszenia chronionej rezerwy. Zaokrąglenia nieparzystych grup wymagają zdefiniowania; nie wolno po prostu skopiować ułamkowej porcji z matki. Ta propozycja nie jest dodatkowym uzgodnionym kosztem.

Racje na 30 minut nie rozwiązują stanu `waiting` ani podróży powrotnej. **Otwarte do decyzji:** źródło dalszego wyżywienia i zachowanie przy jego braku. Minimalna propozycja to jawne dalsze rozliczanie żywności z wyspy źródłowej przy oczekiwaniu/powrocie, bez obchodzenia rezerwacji i chronionego zapasu; jeżeli legalnie dostępnej żywności zabraknie, biegną zwykłe skutki głodu. Trzeba pokazać tę odpowiedzialność przed wypłynięciem. Nie dopuszczamy nieograniczonego darmowego pobytu na statku ani arbitralnego dopisania racji. Rejs do celu i powrót mają osobne przedziały, bez podwójnego pobrania za te same minuty.

**Propozycja:** nie losować nowego ryzyka śmierci na morzu, dopóki użytkownik go nie zleci. Dżuma na wyspie nie wybiera osób, których fizycznie tam nie ma. Nie oznacza to leczenia głodu/resetu szczęścia: zachowane osobiste stany i ich zegary są nadal rozliczane, a zasady racji należy uzgodnić. Przy odtworzeniu po 60 minutach rejs zostaje rozliczony dokładnie w chwili 30. minuty, a pozostałe 30 minut już w miejscu docelowym — nie całe 60 minut w obu światach.

### Niepowtarzalność osób i operacji

Obecne `id: 1` może legalnie występować na każdej z dwóch wysp. Po przeprowadzce takie numery mogą się zderzyć. **Propozycja:** dodać niezmienny identyfikator osoby w skali konta (np. `personUid` ze wspólnej sekwencji), a numeryczne ID zachować jako lokalny identyfikator potrzebny obecnej symulacji. Przy lądowaniu przydzielić wolny lokalny numer i zachować `personUid`; zaktualizować odniesienia, nie używać samego indeksu tablicy jako tożsamości.

Migrujemy z istniejących osób deterministycznie po `(islandId, dotychczasowy id)`. Dwie różne osoby o lokalnym ID 1 nie są automatycznie jedną osobą. Kontrakt każdej udanej operacji zachowuje:

`osoby na wszystkich wyspach + osoby w rejsach = osoby przed operacją`, z osobnym, jawnym uwzględnieniem narodzin/przybyć i odejść/śmierci między znacznikami czasu.

Zapis zwykłego rejsu musi zawierać `requestId`, stan rejsu, konkretne osoby, źródło, cel, `departedAt`, `arrivesAt`, generację archipelagu i potwierdzenie lądowania. Ponowienie wysyłki/lądowania po konflikcie, utracie internetu lub ponownym logowaniu nie może drugi raz odjąć ani dodać tych osób. Osobna operacja kolonizacji zapisuje teleport i założenie córki jednocześnie, bez stanu rejsu i bez czasu oczekiwania.

## 8. Migracja dwóch obecnych wysp do wielu

Dzisiejsze ograniczenie dwóch wysp jest w modelu, walidatorze chmury, backendzie kont, rynku, formularzach, szybkiej nawigacji i testach. Nie usuwamy `secondIsland`, zanim nowy zapis potrafią odczytać wszystkie te miejsca. **Propozycja formatu:** wersja archipelagu 2 z kolekcją wysp po stabilnym ID i osobnymi typami rejsów; korzeń nadal reprezentuje matkę do chwili migracji wszystkich starych API.

**Propozycja minimalnego konfliktu ze starszą historią:** istniejąca córka zachowuje 12 osób, zasoby, skopiowane poziomy i historię jako stan zastany. Nie pobieramy wstecz kosztu, nie usuwamy sześciu ludzi i nie odejmujemy ich po raz drugi od matki. Dopiero nowo zakładane wyspy stosują nowe zasady. Istniejące rejsy towarowe kończą się w niezmienionej ilości i czasie 10 minut. Płatna powiększona pojemność pozostaje towarowa i nie jest resetowana.

Do rozstrzygnięcia pozostaje nowy start: zachować kopiowanie Ratusza/Magazynu, zacząć oba od 1 czy nadać konkretne poziomy za opłatę. Koszt nawiązujący do Ratusza 7 i Domu 7 **sam z siebie nie oznacza**, że nowa wyspa otrzymuje te budynki na poziomie 7. Najmniejsza zmiana względem poprzedniego zlecenia zachowałaby jednorazową kopię Ratusza/Magazynu, sześciu przesiedleńców i inne budynki 1; jest to wyłącznie propozycja. Dom 1 zapewnia 24 łóżka, więc sześciu kolonistów się mieści nawet przy odziedziczonym Ratuszu 10, ale pełny rejs stu osób już nie mieściłby się w łóżkach bez rozbudowy Domu. Latarnia 1 nie może odtwarzać premii za ukończenie budowy, startowy kurs pozostaje wyłączony na córce, a dobowa pula Domu powinna odpowiadać rzeczywistym sześciu osobom — nie pozostałości dwunastoosobowego generatora. Trzeba także zdecydować o dotychczasowych 100 monetach i materiałach: wielokrotne tworzenie/porzucanie wysp nie może być sposobem generowania darmowych zasobów.

### Granica pojemności zapisu i skalowania

Obecny limit payloadu wynosi **700 000 bajtów**; Firestore ma ponadto własny limit dokumentu. Proste pomiary obecnego, skompaktowanego modelu dla dwóch spokojnych światów po 2400 osób dały ok. **235 187 bajtów**. Nawet z przyjętym limitem 20 światów prosta ekstrapolacja daje około **2,4 MB**, jeszcze bez dodatkowych aktywnych rejsów i rozbudowanej historii. To przybliżenie rozmiaru danych, nie pomiar 20 światów, wydajności ani kosztów GCP.

Limit 20 został przyjęty. **Propozycja architektury:** rozdzielić zapisy światów na dokumenty, zachowując serwerowy atomowy rejestr kolonizacji/rejsów/escrow. Samo podniesienie limitu JSON nie wystarczy. Autosave nie powinien co 30 sekund przepisywać wszystkich niezmienionych wysp. Jednoczesna symulacja wielu pełnych światów w przeglądarce również wymaga pomiaru, a koszty GCP wynikają z odczytów/zapisów i transferu, nie tylko liczby zalogowanych osób.

## 9. NPC i PvP równolegle — cena, dochód i brak tworzenia monet

Wycofanie wyłączności PvP usuwa blokadę portu NPC od Ratusza 6 zarówno w logice, jak i w opisach i testach. Użytkownik wskazał „zmianę portu”; przywrócenie także osobnego barterowego Rynku NPC powyżej 6 należy nazwać osobno. **Propozycja:** zachować odblokowanie portu NPC od 4 i PvP od 6, a zakres dalszego barteru NPC od 2 potwierdzić. Stary samouczek rynku musi nadal mieć wykonalną rzeczywistą akcję; zmiana handlu nie może go ponownie zablokować.

### Faktyczne dzisiejsze ceny NPC

| Materiał | NPC sprzedaje graczowi 100 szt. | NPC kupuje od gracza 100 szt. | Bazowy spread na 100 szt. |
| --- | ---: | ---: | ---: |
| Drewno, kamień, zboże | 50 monet | 40 monet | 10 monet |
| Deski, żywność | 150 monet | 140 monet | 10 monet |

Ceny kupna rosną według dzisiejszej historii zakupów danego materiału z trzech godzin. Dla `n` paczek i `p` poprzednich paczek cena kupna to `round(base × (n + 0,1 × (p×n + n×(n−1)/2)))`. Sprzedaż do NPC pozostaje `baseSell × n`. Cenę porównujemy za **taką samą ilość**, uwzględniając reguły zaokrągleń; 150 monet to cena za 100 desek, nie za jedną deskę.

NPC-rynek barterowy ma dziś inną zasadę: paczki 10 dają 9, tylko w odpowiedniej grupie materiałów. Nie wolno pomylić tej 10% straty ze spreadem monet w porcie ani automatycznie przenieść jej do prowizji PvP.

### Potwierdzona sprzedaż materiałów za monety w PvP

Użytkownik wybrał sprzedaż materiałów za monety. **Propozycja kontraktu:** oferta sprzedaje określony materiał i ilość za całkowitą dodatnią liczbę monet. Gra pokazuje limit, a wystawiający wybiera cenę równą lub niższą. Monetowy kontrakt musi otrzymać nową wersję; obecny backend akceptuje tylko pięć materiałów, bez monet. Nie można podmienić znaczenia `want.resource` w istniejących ofertach.

**Przyjęte:** maksymalna cena PvP to **bazowa cena, za którą NPC sprzedaje graczowi taką samą ilość materiału**. Nie jest to cena odkupu NPC ani indywidualna podwyżka z historii zakupów. **Do decyzji technicznej:** wersjonowanie wyceny i ważność istniejących ofert po zmianie bazowego cennika; propozycją jest zamrożenie zaakceptowanej wyceny z wersją i ponowna weryfikacja przy zawarciu.

Przykład przyjętej zasady: jeśli 100 kamienia kosztuje u NPC bazowo 50 monet, sprzedający może zażądać 50, 45 albo 30. Kupno za 30 i odsprzedaż NPC za 40 daje kupującemu 10 monet, ale drugi gracz realnie oddał kamień i otrzymał 30 — nie jest to samo w sobie duplikacja monet. Użytkownik zaakceptował tę konsekwencję; nie dodajemy zakazu odsprzedaży ani ceny minimalnej w celu jej wyeliminowania.

Przy sprzedaży PvP monety są odejmowane nabywcy i dodawane sprzedającemu dokładnie raz; system nie dopisuje ich jako nowej nagrody za „sprzedaż”. Ewentualna prowizja jest osobnym odpływem monet. Nie dodajemy nowej prowizji bez decyzji. Statystyka „przychód ze sprzedaży” nie oznacza zysku ani nowo wyemitowanych monet; należy oddzielić obrót, opłatę i bilans.

### Odrzucony wariant dalszego barteru PvP — kontekst migracji

Barter nie ma jednej „ceny maksymalnej” typu 50 monet, ponieważ oferta wymienia dwa materiały i dwie ilości. Użytkownik wybrał już wariant monetowy; nie wdrażamy alternatywnego przelicznika barterowego. Istniejące oferty nadal potrzebują jawnego zakończenia lub zwrotu według starego kontraktu, bez zmiany znaczenia zapisanych ilości.

### Co faktycznie chroni przed arbitrażem i duplikacją

- Dla operacji z samym NPC: odkup musi być niższy od zakupu tej samej ilości po uwzględnieniu zaokrągleń, rabatów i wszystkich dostępnych tras wymiany. Trzeba sprawdzić także paczki i wymiany pośrednie; sam limit PvP nie zabezpiecza NPC.
- PvP potrzebuje aktualnego escrow, wersji świata, CAS, niepowtarzalnego `requestId`, atomowego rozliczenia obu stron i zwrotu tylko raz. Te zasady już istnieją dla barteru i powinny zostać zachowane.
- Towary zarezerwowane na budowę, statek lub inną ofertę nie mogą drugi raz sfinansować tej samej sprzedaży. Używamy dostępnego zapasu oraz chronionej żywności, a nie tylko sumy widocznej w Magazynie.
- Przed rozliczeniem trzeba ustalić pojemność odbiorcy i zachowanie zwykłego/bonusowego charakteru zapasu. Dzisiejszy barter w momencie przyjęcia kredytuje odbiorcy zwykły materiał i sprawdza miejsce; anulowanie zachowuje źródłową część bonusową. Nowa wersja nie powinna przypadkowo zamieniać każdej kupionej dostawy w premię poza limitem.
- Obecnie własnych ofert nie może przyjąć to samo konto. Zmiana wyspy tego samego konta nie tworzy innego nabywcy. Przesył własny nadal idzie osobnym statkiem.
- Zachować dzisiejsze limity 10 otwartych ofert, czas 24 h i obsługę zwrotów/inbox do czasu wyraźnej zmiany; nie należy ich mylić z proponowanym pułapem ceny.
- Produkcja i zwykła gospodarka nadal są obliczane klientem. Serwerowe escrow chroni rozliczenie oferty, ale samo nie czyni całej gospodarki autorytatywną. Rozwój handlu i monetyzacji wymaga świadomego uwzględnienia tej granicy.

## 10. Decyzje potrzebne do czystej wersji

Po pięciu odpowiedziach użytkownika rozstrzygnięte są również cena kumulacyjna, dynamiczny prefiks, natychmiastowy teleport kolonistów, limit 20 wysp, ochrona matki 12 przed zdarzeniami oraz bazowy pułap ceny NPC z możliwością tańszej oferty i odsprzedaży. Do spójnego wdrożenia pozostają:

1. Kontynuacja poziomu A do wyceny po trzeciej córce: A = 10, 11… to naturalna, ale nadal niezatwierdzona propozycja.
2. Startowe poziomy i zasoby córki oraz start jej zegara/wprowadzenia. Sam teleport sześciu osób jest już natychmiastowy i bez rejsu.
3. Minimum populacji dla córek oraz postępowanie z historyczną matką, która przed migracją ma mniej niż 12 osób; nie tworzymy brakujących osób bez jawnej reguły.
4. Jedzenie, pojemność celu i moment dostępności osób po zwykłym rejsie pasażerskim, w tym oczekiwanie i powrót. Te reguły nie dotyczą natychmiastowej kolonizacji.
5. Zaokrąglenia ceny dla niestandardowych ilości oraz ważność ofert po zmianie bazowego cennika; prowizja PvP nie została wybrana. Dalszy zakres osobnego Rynku barterowego NPC pozostaje do potwierdzenia.

**Rekomendowana kolejność, jako propozycja:** zatwierdzić semantykę i wyceny; przygotować wersję zapisu wielu wysp oraz migrację; dopiero potem wprowadzać atomową kolonizację/pasażerów i wersję rynku. Żaden z tych etapów nie jest w tym dokumencie dowodem implementacji, testu chmury ani promocji do PRE-PROD/PROD.
