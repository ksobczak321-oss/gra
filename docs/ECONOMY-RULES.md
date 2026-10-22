# Uzgodnione reguły gospodarki HARBORLIGHT

Stan: 2026-10-22, frontend `happiness-v8`, schemat zapisu 7. Ten dokument opisuje bieżące reguły i zastępuje historyczne ceny oraz natychmiastowe ulepszenia z wcześniejszych iteracji. Dowody testów i publikacji są w [dzienniku](IMPLEMENTATION-LOG.md). Pełna [tabela 12 budynków](BUILDINGS.md) zestawia ich obecną logikę, stan, koszty i efekty.

## Czas, ludzie i podatki

Nowa wyspa ma po 100 monet, drewna, kamienia, zboża, żywności i desek, 12 mieszkańców, ratusz/dom 1 oraz 0% szczęścia. Pracuje sześć osób: po jednej w pięciu producentach i magazynie; sześć jest wolnych. Targ jest dostępny od ratusza 2, przystań od 4. Ratusz, dom, kaplica i latarnia nie zatrudniają pracowników.

Dokładnie osiem miejsc pracy to farma, młyn, drwale, tartak, kamieniołom, magazyn, targ i przystań. Każde przyjmuje najwyżej `floor(obecna populacja / 2)`, a wszyscy korzystają ze wspólnej puli. Po odwołaniu osoba przez 300 sekund wraca do domu, nie pracuje, nie płaci podatku i nie może być ponownie przydzielona. Niedokończona jednostka jej produkcji przepada.

Każda przydzielona osoba daje 1 monetę za aktywną godzinę. Przydział nadal jest opodatkowany przy chwilowym braku materiałów albo pełnym magazynie. Kaplica może podwoić tę stawkę. Latarnia nie zmienia podatków. Ratusz pokazuje mieszkańców obecni/limit i bieżące podatki na godzinę.

Produkcja, transport, budowa, powroty, premie, szczęście i populacja liczą rzeczywisty czas aktywnej, widocznej karty. Pauza, ukryta karta i zamknięcie gry zatrzymują te systemy. Tempo 1×/2×/4× zmienia zegar oraz animacje; nie skraca godzin gospodarki. **Ważność przyszłego płatnego pakietu jest datą kalendarzową**, więc wygasa również przy pauzie i poza grą.

## Automatyczne żywienie

Każda osoba, również bezrobotna albo wracająca do domu, zużywa **1 Food na aktywną godzinę**. Popyt wyspy wynosi więc aktualna populacja/h. Jedzenie jest przydzielane automatycznie wyłącznie z magazynu centralnego; lokalny zapas młyna, targ i dostawa oczekująca nie są dostępne przed centralnym przyjęciem.

Przy rozpoczęciu jedzenia cała jednostka jest pobierana ze stanu centralnego do wspólnego posiłku, którego pozostała część jest konsumowana proporcjonalnie do czasu i populacji. Pozostały ułamek zachowuje się po zapisie. Przydzielona jednostka nie może być użyta ponownie do rozbudowy albo handlu. Dlatego przy pierwszym aktywnym kroku dostępny Food może od razu spaść o 1; jednostka została już przydzielona mieszkańcom, a nie utracona. Na dokładnym końcu odcinka nie pobiera się dodatkowej porcji na zapas.

Gdy skończy się centralne i już przydzielone jedzenie, każdy mieszkaniec przestaje dostawać bonus za jedzenie i rozpoczyna własny licznik ciągłego głodu. **Wydajność pracowników od razu spada do 50%**: produkcja z 10 do 5 sztuk/os./h, transport magazynu i targu z 60 do 30 sztuk/os./h, także przy przewożeniu materiałów na budowę. Podatki przydzielonych osób pozostają bez zmiany. Po 12 godzinach ciągłego głodu nalicza się −5 punktów procentowych/os./h; to zastępuje wcześniejszą karę −25/h. Dostawa kończy głód i zeruje jego licznik, bez zwrotu utraconych punktów. Kara za przeludnienie może działać równocześnie. Przybycie żywności w środku odcinka czasu i zmiana populacji są rozliczane na rzeczywistych granicach zdarzeń.

Pauza, ukryta karta i czas poza grą zatrzymują żywienie i karę; tempo zegara nie skraca godzin. Food oraz Residents pokazują popyt/h, centralny stan i żywienie albo brak jedzenia. W grze wszystkie te etykiety są po angielsku.

## Indywidualne szczęście

Każdy mieszkaniec ma trwałą tożsamość, własne zgromadzone szczęście, przydział i dwa niezależne liczniki: ciągłego głodu oraz ciągłego bezrobocia. Startowa osoba i nowy mieszkaniec zaczynają od 0%, bez naliczania premii za czas sprzed ich pojawienia się. Zwolnienie, pięciominutowy powrót i ponowne zatrudnienie nie przenoszą szczęścia między ludźmi ani go nie zerują.

- Jedzenie daje +1 punkt procentowy na aktywną godzinę, a przydział do pracy osobne +1.
- Po 12 godzinach ciągłego bezrobocia dochodzi −5 punktów/h. Pierwsze 12 godzin nie jest karane wstecz. Powrót do domu liczy się jako czas bez pracy; ponowny przydział zeruje ten licznik.
- Po 12 godzinach ciągłego głodu dochodzi osobne −5 punktów/h. Jedzenie zeruje tylko licznik głodu; praca zeruje tylko licznik bezrobocia.
- Przydział daje bonus za pracę i podatki również podczas blokady pełnego składu lub braku surowca wejściowego. Kara pełnego składu pozostaje osobnym efektem tej załogi.

| Stan osoby | Bilans szczęścia na godzinę, bez innych efektów | Wydajność pracy | Podatki |
| --- | --- | --- | --- |
| Je i pracuje | +2 punkty | 100% | 1 moneta/h |
| Je, bez pracy do 12 h | +1 punkt | 0 | 0 |
| Je, bez pracy ponad 12 h | +1 −5 = −4 punkty | 0 | 0 |
| Nie je do 12 h, pracuje | +1 punkt | 50% | 1 moneta/h |
| Nie je ponad 12 h, pracuje | +1 −5 = −4 punkty | 50% | 1 moneta/h |
| Nie je i nie pracuje, oba braki do 12 h | 0 | 0 | 0 |
| Nie je i nie pracuje, jeden brak ponad 12 h | −5 punktów | 0 | 0 |
| Nie je i nie pracuje, oba braki ponad 12 h | −10 punktów | 0 | 0 |

Przykład tej samej osoby: 0% → po 10 h jedzenia i pracy 20% → po kolejnych 12 h jedzenia bez pracy 32% → po kolejnej godzinie bezrobocia 28%. Kary i premie są proporcjonalne również do części godziny. Przy progu dokładnie 12 h nie pobiera się kary za poprzedni czas; dopiero dalszy czas podlega karze.

Szczęście każdej osoby ograniczamy do **−100…+100%**, z dotychczasowymi osobnymi efektami kaplicy, błogosławieństwa, latarni i pełnego składu. Dopiero z indywidualnych wyników liczymy średnią populacji; nie ograniczamy dopiero jednej zbiorczej sumy. Przeludnienie nadal obniża szczęście każdej osoby o liczbę mieszkańców bez miejsca na godzinę, zgodnie z wcześniejszą zaakceptowaną regułą. Dekoracja lub ścieżka daje +1 punkt obecnym mieszkańcom.

HUD, średnie grup i lista mieszkańców pokazują wyłącznie pełne procenty, **zaokrąglone w górę**: 20,2% → 21%, −20,2% → −20%. W stanie gry zachowujemy części ułamkowe. Zaokrąglenie jest wyłącznie prezentacją: średnia, granice, przyrosty i demografia korzystają z dokładnych wartości, więc częstotliwość odświeżania nie zmienia wyniku.

Liczniki, premie i kary korzystają wyłącznie z aktywnego czasu, z tą samą pauzą, widocznością karty i brakiem naliczania offline co reszta gospodarki. W schemacie 7 zapisujemy osoby, ich szczęście, oba liczniki, przydziały i pozostały czas powrotu. Migracja wcześniejszych zapisów odtwarza osoby z dotychczasowego bazowego szczęścia, zachowuje zasoby oraz postęp i nie dopisuje nieznanej historii głodu ani bezrobocia. Opis w [instrukcji](INTERACTIVE-ISLAND.md).

## Produkcja i magazyny

Każdy nakarmiony pracownik producenta wytwarza 10 jednostek na godzinę: po 7 minutach ma 1, po 13 minutach 2, z indywidualnym postępem co 360 sekund. Ułamki różnych osób nie łączą się. Bez jedzenia wydajność od razu wynosi 5/h, czyli 1 sztukę co 12 minut. Premia latarni daje nakarmionej osobie 20/h, a głodnej 10/h. Zmiany tempa zachowują indywidualny rozpoczęty postęp.

| Producent | Wejście z magazynu centralnego | Produkt lokalny |
| --- | --- | --- |
| Farma | — | Zboże |
| Drwale | — | Drewno |
| Kamieniołom | — | Kamień |
| Młyn | 2 zboża | 1 żywność |
| Tartak | 2 drewna | 1 deska |

Każdy lokalny skład ma `200 × poziom ratusza` jednostek. Nie jest to zasób dostępny do wydania. Nakarmieni magazynierzy przewożą po 60 sztuk/osobę/h (głodni 30/h), zgodnie z priorytetami pięciu materiałów; pomijają puste źródła i pełne centralne miejsca.

Magazyn centralny ma limit rodzaju `floor(1000 × 1,5^(poziom−1))` oraz limit wspólny `floor(4000 × 1,5^(poziom−1))`. Poziomy 1/2/3 dają odpowiednio 1000/1500/2250 na rodzaj i 4000/6000/9000 łącznie. Pięć materiałów współdzieli limit; monety są w osobnym skarbcu. Nadwyżki starych zapisów i nagród czekają w dostawach, zamiast przepadać lub stawać się natychmiast dostępne.

Pełny skład zatrzymuje produkcję i daje jego załodze −10 szczęścia. Każde kolejne 24 aktywne godziny ciągłego zapełnienia dodają −10, maksymalnie −50 po 96 godzinach. Po opróżnieniu poniżej limitu kara i licznik znikają. Dotyczy to również załogi pełnego magazynu centralnego i targu. Pełny centralny rodzaj materiału daje osobne powiadomienie; kara magazynierów wymaga pełnego limitu łącznego.

Powiadomienie powstaje przy każdym przejściu do stanu pełnego, także po wcześniejszym opróżnieniu. Panel zachowuje przeczytanie i ostatnie 100 wpisów. Szczęście wyspy jest średnią wszystkich mieszkańców, po ograniczeniu szczęścia każdej osoby do −100…+100. Przykład: sześciu drwali z karą −10 i sześciu pozostałych przy 0 daje −5% dla wyspy.

## Koszty i czas rozbudowy

Poziom ratusza ogranicza ukończone poziomy innych budynków. Dom daje `24 × poziom` miejsc, ratusz taki sam teoretyczny limit populacji. Sześć osób bez miejsca nadal daje każdemu mieszkańcowi karę 6 punktów na aktywną godzinę, sumowaną z jego premiami za jedzenie i pracę; rozbudowa domu zatrzymuje dalszy spadek dopiero po ukończeniu. Reguły tempa populacji i minimum sześciu osób pozostają zgodne z [instrukcją](INTERACTIVE-ISLAND.md).

Użytkownik zaakceptował łagodniejszą **normę kosztową 240 jednostek dziennie × obecny poziom producenta**. To podstawa ceny, nie dodatkowa produkcja ani wzrost wydajności pracownika. Cena to 30% normy w drewnie + 30% w kamieniu + 50% we własnym produkcie.

| Rozbudowa producenta na obecnym poziomie 1 | Koszt |
| --- | --- |
| Farma | 72 drewna + 72 kamienia + 120 zboża |
| Młyn | 72 drewna + 72 kamienia + 120 żywności |
| Drwale | 192 drewna + 72 kamienia |
| Tartak | 72 drewna + 72 kamienia + 120 desek |
| Kamieniołom | 72 drewna + 192 kamienia |

Każdą kwotę mnoży się przez obecny poziom producenta. Drewno i kamień jako produkt sumują się z kosztem bazowym. Podniesienie ratusza, domu, targu, magazynu i przystani kosztuje **500 każdego z sześciu zasobów × obecny poziom**. Monety również są wymagane. Kaplica zachowuje wcześniejszy cennik w `BUILDINGS.chapel.cost`, mnożony przez docelowy poziom; jej nowej ceny użytkownik jeszcze nie określił.

Koszt pochodzi tylko z magazynu centralnego i skarbca. Jest odejmowany i rezerwowany w całości przy zleceniu, także w opłaconej kolejce. Żadna część lokalnej produkcji, targu czy spodziewanej dostawy nie płaci zwykłego zlecenia. Panel pokazuje `posiadane / wymagane`, czerwone przy braku, zielone przy wystarczającym zapasie. **„Upgrade” zleca bieżący budynek bez dodatkowego wyboru miejsca.** Opis źródła kosztu, szacunek transportu/budowania i wyjaśnienie braków są schowane pod ikoną „i” obok nagłówka; rzeczywiste blokady i postęp są widoczne na karcie.

Etapy zwykłej rozbudowy:

1. Dostarczenie zarezerwowanych materiałów przez magazynierów, 60 sztuk/osobę/h przy jedzeniu lub 30 bez jedzenia. Monety nie wymagają przewozu.
2. Budowa przez tyle samo czasu, ile zajęło aktywne przewożenie materiałów tej rozbudowy.
3. Dopiero ukończenie zmienia poziom, pojemność, limit mieszkańców lub uruchamia premię.

Przy sześciu nakarmionych magazynierach przewóz 264 materiałów kosztu farmy trwa 44 minuty, a budowa kolejne 44. Przy stałym głodzie są to odpowiednio 88 i 88 minut. Osoby na budowie są obsługiwane przez istniejącą logistykę; nie wprowadzono nowego miejsca zatrudnienia budowniczych. Magazynierzy najpierw dostarczają najwcześniejszą aktywną budowę, potem odbierają lokalną produkcję. Równoległe budowy dzielą tę samą załogę. Czas bez magazynierów i oczekiwanie na wcześniejszy transport nie doliczają się do późniejszego czasu samej budowy.

### Ocena trudności

Przy pierwotnej normie 12 pracowników na poziom surowcowa rozbudowa wymagałaby minimum około 31 godzin, a przetwórcza około 59 godzin od zera przy 12 mieszkańcach, wspólnej obsadzie produkcji i przewozu. Zaakceptowana norma 240 obniżyła minimum do około 2,6 godziny surowcowej i 4,9 godziny przetwórczej przed wprowadzeniem jedzenia. Po dodaniu żywienia stałe 12 nakarmionych osób bez bonusów i nagród wymaga około 4,2 osobogodziny dodatkowej produkcji/przewozu jedzenia na godzinę gry. Przy założeniu stałej populacji dostępne pozostaje 7,8 z 12 osobogodzin; wynik około 4,0 godziny dla producenta surowca i 7,5 godziny dla przetwórcy jest historycznym oszacowaniem tego scenariusza, a nie aktualną prognozą rozwijającej się wyspy. Nowe indywidualne szczęście zmienia wzrost populacji, a głód obniża wydajność, więc bieżący czas zależy od ich przebiegu. To scenariusz dobrej organizacji; przestoje, braki załogi i inne zużycie wydłużają zbieranie. Startowe zapasy mogą skrócić pierwsze zlecenie. Sam transport na budowę i budowanie to dodatkowy czas.

Dla pięciu głównych budynków reguła 500 każdego zasobu jest oddzielną, celowo większą ceną. Nie obniżono jej samowolnie do cennika producentów.

## Miejsca budowy, kolejka i przyszły pakiet

Zwykły gracz ma **poziom ratusza aktywnych budów oraz tyle samo miejsc opłaconej kolejki**. Na poziomie 2 są to 2 + 2. Transport i sama budowa zajmują aktywne miejsce. Kolejka automatycznie uruchamia najwcześniejsze możliwe zlecenie, po spełnieniu zależności poziomu. Można zamówić kolejne poziomy tego samego budynku, ale każdy startuje dopiero po poprzednim i w granicach ratusza. Wszystkie standardowe pozycje muszą mieć pełną rezerwację.

Przyszły płatny pakiet daje w czasie ważności:

- limit aktywnych rozbudów `poziom ratusza + 4`;
- kolejkę bez limitu liczby pozycji;
- plany kolejnych poziomów na podstawie spodziewanych dostaw, bez obowiązku posiadania kosztu w chwili planowania.

Plan pokazuje optymistyczną estymatę z aktualnej załogi, buforów i transportu. To najwcześniejszy szacunek, bez gwarancji: inne zużycie materiałów, priorytety, wejścia przetwórców i zmiana obsady mogą go wydłużyć. Plan **nie tworzy zasobów i nie startuje na prognozie**. Dopiero obecność całego kosztu centralnie umożliwia atomową rezerwację. Zależność od wcześniejszego ratusza i poprzedniego poziomu nadal obowiązuje.

Po wygaśnięciu rozpoczęte budowy kończą się. Kolejne opłacone projekty ruszają w standardowym limicie, a nieopłacone plany pozostają wstrzymane do ponownego uprawnienia. Materiały opłaconej kolejki nie przepadają. Frontend ma lokalny model `premium.expiresAt` i testowe stany; **nie ma sprzedaży, ceny ani weryfikacji zapłaty**. Backend musi nadawać i weryfikować uprawnienia serwerowo; zmiana lokalnego zapisu nie może być źródłem prawdy o realnej płatności.

## Latarnia Morska

Pierwsza budowa kosztuje **500 każdego zasobu razem z monetami/złotem**. Dalsze ceny stosują 500 × obecny poziom, tak jak główne budynki. Użytkownik zaakceptował zachowanie pierwszego kosztu po przedstawieniu jego trudności.

Od startowych 100 każdego zasobu potrzeba dodatkowych 400 monet oraz po 400 pięciu materiałów. Deski i żywność wymagają jeszcze po 800 wejściowego drewna/zboża. W sumie jest to 3600 jednostek pracy produkcyjnej, czyli 360 osobogodzin, oraz około 60 osobogodzin przewozu. Przed dodaniem jedzenia dolna granica przy 12 osobach wynosiła około 35 godzin. Nowa reguła żywienia wymaga dodatkowo 12 Food/h, czyli 4,2 osobogodziny produkcji i przewozu na godzinę gry. Historyczny szacunek dla stałej, cały czas nakarmionej populacji 12 osób bez nagród i bonusów wynosił zatem `420 / (12 − 4,2)`, około **54 godziny aktywnej gry**, przed przewozem materiałów na budowę i samym budowaniem. Nie jest to dolna granica ani prognoza bieżącej wersji: indywidualne bonusy szczęścia zmieniają przyrost populacji, a okresy głodu zmniejszają produkcję i transport do połowy. Nowego czasu nie wyznaczono bez symulacji obsady, żywienia i zmian populacji. Faktyczny czas zależy także od pięciominutowych powrotów i blokad. Koszt mieści się w magazynie poziomu 1: 500 na rodzaj i 2500 łącznie. Trzeba też zachować osobny bufor Food na czas budowy: zarezerwowanie wszystkich 500 Food zostawi tylko wcześniej przydzieloną część posiłku, więc może szybko uruchomić głód. Ceny nie obniżono bez nowej instrukcji użytkownika.

Latarnia ma dłuższą budowę: transport **T** oraz sama budowa **2T**, razem **3T**. Przy sześciu stale nakarmionych magazynierach 2500 sztuk jedzie 417 minut, a budowa trwa 834 minuty: 20 godzin 51 minut po zleceniu, niezależnie od wcześniejszego zbierania.

Po ukończeniu **obu premii używa się przez 24 godziny × osiągnięty poziom**:

- +100 szczęścia każdemu mieszkańcowi, z indywidualnym limitem +100;
- produkcja pięciu materiałów ×2, z takim samym stosunkiem wejść 2:1.

Poziom 2 daje więc 48 godzin obu efektów. Kolejna rozbudowa odświeża okres według nowego poziomu, bez mnożenia ×4. Podatki i tempo przewozu pozostają bez zmiany. Premia zaczyna się po ukończeniu, nie po opłaceniu. Historyczna dostawa po 50 drewna/30 kamienia i natychmiastowa naprawa za 300 monet zostały zastąpione tą budową.

## Targ, kaplica i lojalność

Targ ma pojemność `floor(1000 × 1,5^(poziom−1))`. Jego nakarmieni pracownicy przenoszą zamówione towary z magazynu centralnego po 60 sztuk/os./h, a głodni po 30/h. Każda faktyczna dostawa czeka godzinę od przybycia. Wymienia się wyłącznie w obrębie grup drewno/kamień/zboże albo deski/żywność. Stosunek nominalny 1:1 ma marżę 10%; partie po 10 dają 9 sztuk. Nie ma wymiany za monety. Wynik pozostaje na targu do zlecenia odbioru przez magazynierów i dopiero po przyjęciu centralnie może finansować budowę.

Kaplica 1 nie daje pasywnej premii. Ukończenie rozbudowy daje wszystkim +10 × nowy poziom szczęścia i podatki ×2 na 10 aktywnych godzin. Kolejna rozbudowa odświeża, zamiast nakładać mnożniki. Ręczne błogosławieństwo jest osobne: +50 każdego z sześciu zasobów i +20 szczęścia każdemu przez godzinę. Nie uruchamia się drugiego podczas trwania pierwszego. Łączna dożywotnia liczba użyć to poziom kaplicy, więc podniesienie poziomu dodaje jedno nowe użycie. Oba rodzaje premii mogą działać równocześnie.

Lojalność zlicza kolejne daty wizyty w strefie Europe/Warsaw do 10. Tego samego dnia nie wzrasta, luka resetuje serię do 1. Nagrody nie są przyznawane: użytkownik ustali je później. Obecna wizyta to lokalny prototyp, a rzeczywiste logowanie i wspólny stan konta są zadaniem backendu.

## Kompaktowe panele produkcyjne

Farm, Windmill, Lumber Camp, Sawmill i Quarry mają identyczny układ: Level oraz Storage w pierwszym wierszu, mały czas do kolejnej sztuki pod magazynem, a niżej Workers aktualni/limit z małym −/+ oraz Taxes/h. Wyjaśnienia produkcji są pod osobną ikoną „i”; pełny magazyn, brak wejść lub pauza są pokazane zamiast obiecanej daty produkcji, kiedy nie da się jej policzyć. Duże zbiorcze akcje i powtórzona karta produkcji nie zajmują tych paneli. Globalny Residents zachowuje zarządzanie całą wyspą.
