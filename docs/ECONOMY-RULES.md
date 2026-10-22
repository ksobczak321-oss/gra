# Uzgodnione reguły gospodarki HARBORLIGHT

Stan: 2026-10-22, frontend `economy-v6`, schemat zapisu 6. Ten dokument opisuje bieżące reguły i zastępuje historyczne ceny oraz natychmiastowe ulepszenia z wcześniejszych iteracji. Dowody testów i publikacji są w [dzienniku](IMPLEMENTATION-LOG.md).

## Czas, ludzie i podatki

Nowa wyspa ma po 100 monet, drewna, kamienia, zboża, żywności i desek, 12 mieszkańców, ratusz/dom 1 oraz 0% szczęścia. Pracuje sześć osób: po jednej w pięciu producentach i magazynie; sześć jest wolnych. Targ jest dostępny od ratusza 2, przystań od 4. Ratusz, dom, kaplica i latarnia nie zatrudniają pracowników.

Dokładnie osiem miejsc pracy to farma, młyn, drwale, tartak, kamieniołom, magazyn, targ i przystań. Każde przyjmuje najwyżej `floor(obecna populacja / 2)`, a wszyscy korzystają ze wspólnej puli. Po odwołaniu osoba przez 300 sekund wraca do domu, nie pracuje, nie płaci podatku i nie może być ponownie przydzielona. Niedokończona jednostka jej produkcji przepada.

Każda przydzielona osoba daje 1 monetę za aktywną godzinę. Przydział nadal jest opodatkowany przy chwilowym braku materiałów albo pełnym magazynie. Kaplica może podwoić tę stawkę. Latarnia nie zmienia podatków. Ratusz pokazuje mieszkańców obecni/limit i bieżące podatki na godzinę.

Produkcja, transport, budowa, powroty, premie, szczęście i populacja liczą rzeczywisty czas aktywnej, widocznej karty. Pauza, ukryta karta i zamknięcie gry zatrzymują te systemy. Tempo 1×/2×/4× zmienia zegar oraz animacje; nie skraca godzin gospodarki. **Ważność przyszłego płatnego pakietu jest datą kalendarzową**, więc wygasa również przy pauzie i poza grą.

## Produkcja i magazyny

Każdy pracownik producenta wytwarza 10 jednostek na godzinę: po 7 minutach ma 1, po 13 minutach 2, z indywidualnym postępem co 360 sekund. Ułamki różnych osób nie łączą się. Premia latarni daje 20/h, zachowując indywidualny rozpoczęty postęp.

| Producent | Wejście z magazynu centralnego | Produkt lokalny |
| --- | --- | --- |
| Farma | — | Zboże |
| Drwale | — | Drewno |
| Kamieniołom | — | Kamień |
| Młyn | 2 zboża | 1 żywność |
| Tartak | 2 drewna | 1 deska |

Każdy lokalny skład ma `200 × poziom ratusza` jednostek. Nie jest to zasób dostępny do wydania. Magazynierzy przewożą po 60 sztuk/osobę/h, zgodnie z priorytetami pięciu materiałów; pomijają puste źródła i pełne centralne miejsca.

Magazyn centralny ma limit rodzaju `floor(1000 × 1,5^(poziom−1))` oraz limit wspólny `floor(4000 × 1,5^(poziom−1))`. Poziomy 1/2/3 dają odpowiednio 1000/1500/2250 na rodzaj i 4000/6000/9000 łącznie. Pięć materiałów współdzieli limit; monety są w osobnym skarbcu. Nadwyżki starych zapisów i nagród czekają w dostawach, zamiast przepadać lub stawać się natychmiast dostępne.

Pełny skład zatrzymuje produkcję i daje jego załodze −10 szczęścia. Każde kolejne 24 aktywne godziny ciągłego zapełnienia dodają −10, maksymalnie −50 po 96 godzinach. Po opróżnieniu poniżej limitu kara i licznik znikają. Dotyczy to również załogi pełnego magazynu centralnego i targu. Pełny centralny rodzaj materiału daje osobne powiadomienie; kara magazynierów wymaga pełnego limitu łącznego.

Powiadomienie powstaje przy każdym przejściu do stanu pełnego, także po wcześniejszym opróżnieniu. Panel zachowuje przeczytanie i ostatnie 100 wpisów. Szczęście wyspy jest średnią wszystkich mieszkańców, po ograniczeniu szczęścia każdej grupy do −100…+100. Przykład: sześciu drwali z karą −10 i sześciu pozostałych przy 0 daje −5% dla wyspy.

## Koszty i czas rozbudowy

Poziom ratusza ogranicza ukończone poziomy innych budynków. Dom daje `24 × poziom` miejsc, ratusz taki sam teoretyczny limit populacji. Sześć osób bez miejsca nadal obniża bazowe szczęście o 6 punktów na aktywną godzinę; rozbudowa domu zatrzymuje dalszy spadek dopiero po ukończeniu. Reguły tempa populacji i minimum sześciu osób pozostają zgodne z [instrukcją](INTERACTIVE-ISLAND.md).

Użytkownik zaakceptował łagodniejszą **normę kosztową 240 jednostek dziennie × obecny poziom producenta**. To podstawa ceny, nie dodatkowa produkcja ani wzrost wydajności pracownika. Cena to 30% normy w drewnie + 30% w kamieniu + 50% we własnym produkcie.

| Rozbudowa producenta na obecnym poziomie 1 | Koszt |
| --- | --- |
| Farma | 72 drewna + 72 kamienia + 120 zboża |
| Młyn | 72 drewna + 72 kamienia + 120 żywności |
| Drwale | 192 drewna + 72 kamienia |
| Tartak | 72 drewna + 72 kamienia + 120 desek |
| Kamieniołom | 72 drewna + 192 kamienia |

Każdą kwotę mnoży się przez obecny poziom producenta. Drewno i kamień jako produkt sumują się z kosztem bazowym. Podniesienie ratusza, domu, targu, magazynu i przystani kosztuje **500 każdego z sześciu zasobów × obecny poziom**. Monety również są wymagane. Kaplica zachowuje wcześniejszy cennik w `BUILDINGS.chapel.cost`, mnożony przez docelowy poziom; jej nowej ceny użytkownik jeszcze nie określił.

Koszt pochodzi tylko z magazynu centralnego i skarbca. Jest odejmowany i rezerwowany w całości przy zleceniu, także w opłaconej kolejce. Żadna część lokalnej produkcji, targu czy spodziewanej dostawy nie płaci zwykłego zlecenia. Panel pokazuje `posiadane / wymagane`, czerwone przy braku, zielone przy wystarczającym zapasie. **„Ulepsz” zleca bieżący budynek bez dodatkowego wyboru miejsca.**

Etapy zwykłej rozbudowy:

1. Dostarczenie zarezerwowanych materiałów przez magazynierów, 60 sztuk/osobę/h. Monety nie wymagają przewozu.
2. Budowa przez tyle samo czasu, ile zajęło aktywne przewożenie materiałów tej rozbudowy.
3. Dopiero ukończenie zmienia poziom, pojemność, limit mieszkańców lub uruchamia premię.

Przy sześciu magazynierach przewóz 264 materiałów kosztu farmy trwa 44 minuty, a budowa kolejne 44. Osoby na budowie są obsługiwane przez istniejącą logistykę; nie wprowadzono nowego miejsca zatrudnienia budowniczych. Magazynierzy najpierw dostarczają najwcześniejszą aktywną budowę, potem odbierają lokalną produkcję. Równoległe budowy dzielą tę samą załogę. Czas bez magazynierów i oczekiwanie na wcześniejszy transport nie doliczają się do późniejszego czasu samej budowy.

### Ocena trudności

Przy pierwotnej normie 12 pracowników na poziom surowcowa rozbudowa wymagałaby minimum około 31 godzin, a przetwórcza około 59 godzin od zera przy 12 mieszkańcach, wspólnej obsadzie produkcji i przewozu. Zaakceptowana norma 240 obniża minimum do około 2,6 godziny surowcowej i 4,9 godziny przetwórczej. To dolne granice dobrej organizacji; przestoje, braki załogi i inne zużycie wydłużają zbieranie. Startowe zapasy mogą skrócić pierwsze zlecenie. Sam transport na budowę i budowanie to dodatkowy czas.

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

Od startowych 100 każdego zasobu potrzeba dodatkowych 400 monet oraz po 400 pięciu materiałów. Deski i żywność wymagają jeszcze po 800 wejściowego drewna/zboża. W sumie jest to 3600 jednostek pracy produkcyjnej, czyli 360 osobogodzin, oraz około 60 osobogodzin przewozu. Przy 12 osobach dolna granica wynosi około **35 godzin aktywnej gry**, bez nagród i bonusów. Faktyczny czas zależy od obsady, pięciominutowych powrotów i blokad. Koszt mieści się w magazynie poziomu 1: 500 na rodzaj i 2500 łącznie.

Latarnia ma dłuższą budowę: transport **T** oraz sama budowa **2T**, razem **3T**. Przy sześciu magazynierach 2500 sztuk jedzie 417 minut, a budowa trwa 834 minuty: 20 godzin 51 minut po zleceniu, niezależnie od wcześniejszego zbierania.

Po ukończeniu **obu premii używa się przez 24 godziny × osiągnięty poziom**:

- +100 szczęścia każdemu mieszkańcowi, z indywidualnym limitem +100;
- produkcja pięciu materiałów ×2, z takim samym stosunkiem wejść 2:1.

Poziom 2 daje więc 48 godzin obu efektów. Kolejna rozbudowa odświeża okres według nowego poziomu, bez mnożenia ×4. Podatki i tempo przewozu pozostają bez zmiany. Premia zaczyna się po ukończeniu, nie po opłaceniu. Historyczna dostawa po 50 drewna/30 kamienia i natychmiastowa naprawa za 300 monet zostały zastąpione tą budową.

## Targ, kaplica i lojalność

Targ ma pojemność `floor(1000 × 1,5^(poziom−1))`. Jego pracownicy przenoszą zamówione towary z magazynu centralnego po 60 sztuk/os./h. Każda faktyczna dostawa czeka godzinę od przybycia. Wymienia się wyłącznie w obrębie grup drewno/kamień/zboże albo deski/żywność. Stosunek nominalny 1:1 ma marżę 10%; partie po 10 dają 9 sztuk. Nie ma wymiany za monety. Wynik pozostaje na targu do zlecenia odbioru przez magazynierów i dopiero po przyjęciu centralnie może finansować budowę.

Kaplica 1 nie daje pasywnej premii. Ukończenie rozbudowy daje wszystkim +10 × nowy poziom szczęścia i podatki ×2 na 10 aktywnych godzin. Kolejna rozbudowa odświeża, zamiast nakładać mnożniki. Ręczne błogosławieństwo jest osobne: +50 każdego z sześciu zasobów i +20 szczęścia każdemu przez godzinę. Nie uruchamia się drugiego podczas trwania pierwszego. Łączna dożywotnia liczba użyć to poziom kaplicy, więc podniesienie poziomu dodaje jedno nowe użycie. Oba rodzaje premii mogą działać równocześnie.

Lojalność zlicza kolejne daty wizyty w strefie Europe/Warsaw do 10. Tego samego dnia nie wzrasta, luka resetuje serię do 1. Nagrody nie są przyznawane: użytkownik ustali je później. Obecna wizyta to lokalny prototyp, a rzeczywiste logowanie i wspólny stan konta są zadaniem backendu.
