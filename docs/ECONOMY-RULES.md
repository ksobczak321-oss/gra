# Uzgodnione reguły gospodarki HARBORLIGHT

Stan: 2026-10-23, lokalny prototyp, schemat zapisu 8. Źródłem bazowym są HARBORLIGHT6 i decyzje D01–D17 z [HARBORLIGHT7-zasady.xlsx](arkusze/HARBORLIGHT7-zasady.xlsx), uzupełnione późniejszym pakietem frontendu zatwierdzonym „go”. Najnowsza rozmowa zmieniła lokalną pojemność na zależną od samego producenta; limit pracy nadal wynika z własnego poziomu danego miejsca pracy. Oryginalnego arkusza 7 nie zmieniano. Wcześniejsze wpisy dziennika zachowują historyczne reguły i wyniki publikacji. Bieżące sprawdzenia oraz stan wdrożenia zapisujemy w [dzienniku](IMPLEMENTATION-LOG.md).

## Czas i start

Wszystkie mechaniki używają rzeczywistego czasu, również przy ukrytej karcie i po zamknięciu gry: produkcja, przewozy, jedzenie, podatki, szczęście, populacja, budowa, wizyty, premie i wygaśnięcia. Zapis przechowuje znacznik ostatniego rozliczenia; powrót do gry rozlicza tylko czas od tego znacznika. Ponowne rozliczenie tej samej chwili nie przyznaje postępu drugi raz. Usunięto sterowanie pauzą i prędkością gospodarki. Ograniczenie animacji dotyczy obrazu.

Nowa wyspa: ratusz 1, dom 1, 12 osób w domu, **0 pracowników**, szczęście 0%, po 100 monet, drewna, kamienia, zboża, żywności i desek. Startowa dwunastka nie podlega blokadzie szczęścia noworodków. Starszy zapis zachowuje istniejący postęp; migracja do schematu 8 rozpoczyna nowy model czasu od chwili migracji, bez dopisywania nieznanej historii offline.

Wyłącznie dla testowania budowy w tej piaskownicy aktualizacja ma jednorazowo uzupełnić materiały centralne przy następnym otwarciu. Oba limity pojemności obowiązują. Saldo monet jest uzupełniane do minimum **10 000**, bez obniżania większego salda; poziomy i istniejący postęp pozostają zachowane. Zapisane wykonanie uniemożliwia ponowny grant po samym odświeżeniu. Zwykła reguła startu po 100 pozostaje odrębna.

Poziom ratusza jest poziomem gry i maksymalnym poziomem pozostałych budynków. Limit populacji wynosi `24 × poziom ratusza`, miejsca mieszkalne `24 × poziom domu`. Minimum populacji to 6; techniczne maksimum poziomu wynosi 100.

## Człowiek, praca i podatki

Każda osoba ma trwałe ID, indywidualne szczęście, stan miejsca pobytu i własne liczniki. Dokładnie osiem miejsc pracy: farma, młyn, drwale, tartak, kamieniołom, magazyn, targ i przystań. Limit każdego miejsca pracy to **12 × własny poziom budynku**. Ratusz nadal ogranicza rozbudowę budynku; liczba wolnych osób w domu ogranicza rzeczywisty nowy przydział. W panelu są trzy liczby: przypisani / wolni w domu / limit, a podatek dotyczy tego miejsca pracy. Ratusz, dom, kaplica i latarnia nie zatrudniają.

Manage all workers jest zbiorczym narzędziem otwieranym wyłącznie z domu. Globalny Residents pokazuje informacje o mieszkańcach i kieruje do domu, a w poszczególnych miejscach pracy pozostają własne małe −/+. To organizacja dostępu w interfejsie, bez zmiany limitów, kosztów czy czasu dojścia.

Dojście do pracy trwa 300 sekund. Dopiero po dotarciu zaczynają się praca, produkcja/transport i podatki. Zwolnienie zawsze uruchamia 300 sekund powrotu do domu; w tym czasie nie ma nowego przydziału ani podatku. Niedokończona sztuka produkcji przepada, gotowe towary pozostają. Już zabrany ładunek kończy swój kurs również po odwołaniu osoby.

Pracownik, który dotarł, płaci **1 monetę/h**. Przestój lub głód nie zmniejszają podatku. Kaplica podwaja go przez okres swojej premii; latarnia go nie podwaja. Ułamki zachowuje `taxProgress`, a do skarbca trafiają pełne monety. Bezrobotni, osoby w drodze i zwiedzający nie płacą podatku.

Przy ujemnym szczęściu ludzie odchodzą, nie umierają. Najpierw odchodzą osoby bez aktywnego miejsca pracy, w tym osoby w drodze; następnie z największej załogi. Remisy rozstrzyga kolejność: port → targ → tartak → kamieniołom → drwale → farma → młyn → magazyn. Zwiedzający są chronieni przed takim wyborem. Nowa osoba trafia do domu, bez automatycznego zatrudnienia.

## Jedzenie i indywidualne szczęście

Każdy mieszkaniec zjada automatycznie **1 Food/h**, wyłącznie z magazynu centralnego. Dotyczy także bezrobotnych, osób w drodze, zwiedzających i nowych mieszkańców. Cała jednostka jedzenia jest przydzielana do posiłku, a jej niezużyty ułamek zapisuje `foodCredit`; tej samej porcji nie można wydać drugi raz.

Magazyn chroni **50 × swój poziom Food** przed budową, sprzedażą, wpłatami i innymi wydatkami nieżywieniowymi. Ludzie mogą tę rezerwę zjadać. Gdy Food jest poniżej progu, a żywność czeka w młynie, jeden istniejący magazynier dostaje ratunkowy przewóz Food. Nie wolno wtedy ręcznie zwolnić ostatniego takiego magazyniera; gra nie tworzy pracownika, jeśli obsada wynosi zero.

| Stan osoby, bez przeludnienia i premii | Zmiana szczęścia/h | Wydajność | Podatek/h |
| --- | --- | --- | --- |
| Je i rzeczywiście pracuje | +2 pp | 100% | 1 moneta |
| Je, bez pracy przez pierwsze 12 h | +1 pp | 0 | 0 |
| Je, bez pracy ponad 12 h | −4 pp | 0 | 0 |
| Nie je przez pierwsze 12 h, pracuje | +1 pp | 50% | 1 moneta |
| Nie je ponad 12 h, pracuje | −4 pp | 50% | 1 moneta |
| Nie je i nie pracuje; oba braki do 12 h | 0 | 0 | 0 |
| Nie je i nie pracuje; jeden brak ponad 12 h | −5 pp | 0 | 0 |
| Nie je i nie pracuje; oba braki ponad 12 h | −10 pp | 0 | 0 |

Jedzenie i rzeczywista praca dają osobno +1 pp/h. Każdy brak po 12 h daje osobne −5 pp/h, bez karania pierwszych 12 h wstecz. Jedzenie zeruje licznik głodu, a zatrudnienie licznik bezrobocia. Przestój produkcji z braku wejścia lub miejsca nie daje +1 za pracę, nie dodaje kary bezrobocia i nadal daje podatek. Ma własną karę: −10 pp, kolejne −10 co 24 h do **−50 pp wyłącznie za ten składnik**. Po usunięciu blokady lub zwolnieniu licznik przestoju się zeruje. −40 z innych przyczyn i −20 za przestój daje −60%, a nie −50%.

Głód od razu zmniejsza produkcję i tempo przewozu do połowy, jeszcze przed karą szczęścia po 12 h. Przeludnienie dodaje każdej osobie karę `max(0, populacja − 24 × poziom domu)` pp/h. Większy dom zatrzymuje dalszą karę dopiero po ukończeniu, bez zwrotu już utraconych punktów.

**Nowa osoba ma dokładnie 0% szczęścia przez pierwsze 24 h**, także podczas premii kaplicy i latarni. W tym okresie nie gromadzi wzrostu ani spadku własnego szczęścia; po nim zwykłe naliczanie zaczyna od 0%. Stan jedzenia i pozostałe mechaniki nadal działają. Ta zasada nie obejmuje początkowych 12 osób.

Każdą osobę ograniczamy do −100…+100%, a dopiero potem liczymy średnią populacji. W obliczeniach i zapisie są ułamki; interfejs pokazuje pełne procenty zaokrąglone w górę: 20,2 → 21%, −20,2 → −20%.

Dodatnia średnia daje przyrost, ujemna ubytek. Dla `h = abs(szczęście)` tempo osób/h wynosi `h/300` do 50% oraz `1/6 + (h−50)/60` powyżej 50%. Punkty odniesienia: 0% — brak zmiany; 25% — osoba co 12 h; 50% — co 6 h; 75% — co około 1 h 43 min; 100% — co 1 h. Zmiana znaku i 0% zerują postęp poprzedniego kierunku. Przy granicach populacji nie odkłada się zapasu narodzin ani odejść.

## Dzienna pula domu

Dom dostaje raz na 24 h pulę pełnych punktów równą populacji **w chwili odnowienia**. Liczba ta pozostaje zamrożona do kolejnego odnowienia. Gracz może przyznać punkty jednej osobie lub rozdzielić po wskazanej liczbie wszystkim uprawnionym. Punkt dodaje 1 pp do osobistego szczęścia; nie kasuje kar, przydziałów ani ich liczników.

Po 23 h 58 min automat rozdziela tylko niewykorzystaną resztę, po jednym pełnym punkcie najmniej szczęśliwym; przy remisie losuje. Nie zwiększa osób już na 100% ani osób z zamrożonym szczęściem. Po 24 h powstaje nowa pula. Nie jest to codzienne podwójne przyznanie całej początkowej puli.

## Produkcja i przewozy

Wydajność nakarmionego pracownika na kolejnych poziomach producenta wynosi **10, 12, 13, 14… szt./h**: poziom 1 = 10; poziom `L ≥ 2` = `L + 10`. Każda osoba ma własną fazę produkcji; niedokończone jednostki różnych osób nie łączą się. Na poziomie 1 po 7 minutach jest 1 gotowa sztuka, po 13 minutach 2. Głód mnoży wydajność przez 0,5, a premia latarni produkcję przez 2.

| Budynek | Wejście z centrali | Produkt lokalny |
| --- | --- | --- |
| Farma | — | Zboże |
| Drwale | — | Drewno |
| Kamieniołom | — | Kamień |
| Młyn | 2 zboża | 1 żywność |
| Tartak | 2 drewna | 1 deska |

Lokalny skład producenta mieści `200 × własny poziom producenta`. Rozbudowa ratusza sama nie zwiększa już jego bufora. Pojemność w panelu to zapas / obecny limit / limit po następnym ulepszeniu; przy poziomie 1 przykład wynosi 50 / 200 / 400. Zboże i drewno muszą przejść przez centralę przed przetworzeniem. Nie ma ręcznego odbioru omijającego transport. Produkcyjny status podaje, dlaczego budynek pracuje lub czeka, oraz najbliższy produkt, liczbę sztuk i czas odłożenia do lokalnego magazynu.

Resources w dolnym pasku ma dokładnie pięć kart produktów: Wood, Planks, Stone, Grain, Food. Każda otwiera panel właściwego producenta. Górny znacznik liczy osoby już przybyłe i faktycznie pracujące bez blokady; dolny pokazuje wolne osoby w domu / dotychczasowy limit zakładu. Ten widok nie zmienia receptur ani normy wymagań zadań. Monety są walutą skarbca, bez osobnej karty produktu w tym pasku.

Pełny kurs z powrotem trwa **5 minut**, a głodnemu pracownikowi efektywnie 10 minut. Każdy kurs niesie jeden rodzaj materiału; pracownik zabiera dostępny częściowy ładunek i nie czeka na zapełnienie. Ładunek magazynu, targu i portu to `floor(60 × 1,1^(własny poziom−1))`: 60, 66, 72… Jedna osoba na poziomie 1 może wykonać 12 kursów, czyli przewieźć do 720 szt./h przy stale pełnych ładunkach. Dawne 60 szt./h zastąpiono tym modelem.

Kursy liczymy jako **sumę `ceil(ilość danego materiału / ładunek)`**, nie sufit sumy wszystkich materiałów. Przykład: 61 drewna i 1 kamień przy ładunku 60 wymagają 3 kursów. Domyślnie zaopatrzenie centrali poprzedza budowy; można wskazać konkretną budowę. Ratunkowy Food ma pierwszeństwo. Towar opuszcza źródło przy zabraniu i staje się dostępny w celu po zakończeniu kursu. Panel Warehouse pokazuje każdego magazyniera, ładunek, trasę i pozostały czas; wolna osoba jest oznaczona jako oczekująca.

Użytkownik wybiera do trzech materiałów jako podświetlone priorytety 1/2/3. Podział dziesięciu rzeczywistych kursów wynosi:

| Liczba priorytetów | Przydział kursów |
| --- | --- |
| Jeden | 8 dla pierwszego, 2 losowe z pozostałych |
| Dwa | 5 dla pierwszego, 3 dla drugiego, 2 losowe z pozostałych |
| Trzy | 5 dla pierwszego, 3 dla drugiego, 2 dla trzeciego |

Liczymy także ostatni niepełny kurs. Jeżeli wskazany towar nie jest gotowy albo nie ma dla niego miejsca, magazynier podejmuje inny dostępny przewóz; priorytet nie zatrzymuje całej załogi. Ładunki i stan rozdziału muszą przetrwać wczytanie bez ponownego zabierania towaru.

Zgodnie z doprecyzowaniem użytkownika wybór **nie wygasa po 10 kursach**. Podział powtarza się w kolejnych dziesiątkach, dopóki gracz nie zmieni priorytetów. Stan bieżącego bloku oraz losowania jest zapisywany, aby ponowne wczytanie nie zaczynało stale od priorytetu 1.

## Magazyn, targ i port

Magazyn centralny i port mają limit na rodzaj `floor(1000 × 1,5^(L−1))` oraz łączny `floor(4000 × 1,5^(L−1))`. Targ ma tylko limit łączny `floor(1000 × 1,5^(L−1))`. Monety znajdują się w skarbcu i nie zajmują miejsca. Starsze nadwyżki są zachowane w oczekujących dostawach, wymagających miejsca i transportu.

Targ od ratusza 2 wymienia wyłącznie w grupach **drewno/kamień/zboże** oraz **deski/żywność**. Nie używa monet. Paczka 10 daje 9 innego towaru po marży 10%. Własna załoga targu przewozi towary w obu kierunkach. Każda dostawa jest zablokowana przez godzinę; niewykorzystany towar przepada 24 h po przybyciu, a wynik wymiany ma nowe 24 h.

Port od ratusza 4 handluje pełnymi paczkami po 100 za monety:

| Towary | Cena sprzedaży /100 | Bazowa cena zakupu /100 |
| --- | --- | --- |
| Drewno, kamień, zboże | 40 | 50 |
| Deski, żywność | 140 | 150 |

Każda kolejna kupiona paczka **tego samego rodzaju** w ruchomych 3 h dodaje liniowo 10% ceny bazowej. Drewno kosztuje kolejno 50, 55, 60…; pierwszy kamień nadal kosztuje 50. Wielopaczkowe zamówienie rozlicza kolejne paczki. Sprzedaż nie ma tej dopłaty. Cena jest zamrażana przy zatwierdzeniu transakcji; kupno pobiera monety od razu.

Własna załoga portu obsługuje dwa etapy sprzedaży: centrala → port oraz port → statek. Zapłata i powiadomienie następują przy wypłynięciu. Rejs zakupu trwa 5 minut, następnie towar wymaga rozładunku i przewozu do centrali. Pojemność statku odpowiada portowi. Nieodebrany towar wygasa po 24 h, także offline; dawnej opłaty 10 monet za składowanie nie ma.

Przy przejściu składu do stanu pełnego powstaje powiadomienie, także po ponownym opróżnieniu i zapełnieniu. Stan przeczytania pozostaje w zapisie. Powiadomienia obejmują również budowę i dostawy, przeludnienie, wizyty, premie, port oraz wygaśnięcia.

## Koszty i czas budowy

`L` to poziom przed daną rozbudową; `N = L + 1` to nowy poziom. Kolejne zlecenie tego samego budynku korzysta z odpowiedniego przyszłego poziomu, bez budowania dwóch jego poziomów równocześnie. Wszystkie poniższe ceny są bazowe, przed dopłatą kolejki.

| Budynek | Bazowy koszt |
| --- | --- |
| Farma | `L × (72 drewna + 72 kamienia + 120 zboża)` |
| Młyn | `2L × (72 drewna + 72 kamienia + 120 żywności)` |
| Drwale | `2L × (192 drewna + 72 kamienia)` |
| Tartak | `2L × (72 drewna + 72 kamienia + 120 desek)` |
| Kamieniołom | `2L × (72 drewna + 192 kamienia)` |
| Ratusz, dom | `500L` każdego z sześciu zasobów |
| Magazyn, targ | `300L` każdego z sześciu zasobów |
| Port | `400L` każdego z sześciu zasobów |
| Latarnia | `500 × max(1,L)` każdego z sześciu zasobów |
| Kaplica | `N × (180 monet + 20 drewna + 60 kamienia + 10 desek)` |

Kaplica ma **zatwierdzony**, pełnoprawny koszt: 1→2 to 360 monet, 40 drewna, 120 kamienia i 20 desek. Pierwsza latarnia kosztuje po 500 również monet. Koszt producentów wywodzi się z normy 240/dobę × poziom; nie jest procentem całej faktycznej produkcji gracza. Cztery wskazane receptury mają później uzgodniony mnożnik 2.

Zwykłe zlecenie rezerwuje od razu pełny koszt z centrali i skarbca, z zachowaniem rezerwy Food. Lokalny towar nie opłaca budowy przed dostawą. Zlecenie trafiające do kolejki kosztuje **+10% każdego składnika, zaokrąglone w górę**. Dopłata zwiększa również ilość przewożonych materiałów.

`T` oznacza rzeczywisty czas transportu materiałów tej budowy. Standard: transport `T` + budowanie `T` = `2T`. Latarnia: `T + 4T = 5T`. Kaplica: `T + 3T × (N−1)`, czyli 4T, 7T, 10T dla docelowych poziomów 2, 3, 4. Monety nie jadą na budowę. Przy stałych nakarmionych `W` tragarzach i gotowych materiałach minimum transportu wynosi `ceil(suma kursów / W) × 5 min`. Faktyczne `T` uwzględnia obsadę, priorytety i blokady; ETA aktualizuje się po ich zmianie. Czas samej budowy opiera się na zakończonym przewozie. Zbieranie surowców, wcześniejsze rozbudowy i oczekiwanie w kolejce są poza takim zestawieniem czasu transport + budowa.

Ratusz `L` daje `L` aktywnych budów oraz `L` opłaconych miejsc kolejki. Nowy poziom i jego skutki działają po ukończeniu. Przed większą rozbudową trzeba zapewnić pojemność magazynu dla całego kosztu i rezerwy Food; zależność od wcześniejszej rozbudowy magazynu jest zamierzona.

Zarządzanie Construction and queue oraz licznik zajętości są dostępne wyłącznie w ratuszu. Każdy budynek nadal pozwala zamówić własną rozbudowę. U pięciu producentów obok Upgrade są małe, oddzielne Delivery time i Building time oraz ramka Premium z dwoma głównymi przyciskami, w obrębie Building upgrade. Opisy monet, usług i sposobu rozbudowy są pod „i” rozbudowy; osobna dolna sekcja Premium building options jest usunięta z producentów. Brak drogi, materiałów lub magazynierów nie jest wyświetlany jako natychmiastowa budowa.

Estymator odtwarza bieżący plan dostaw na kopii stanu: uwzględnia priorytety, ładunki już w drodze, dostępność i dojście magazynierów oraz konkurujące przewozy. Nie zużywa prawdziwych zasobów ani nie zmienia losowania. Podaje oddzielnie transport i budowę przy obecnych warunkach pracy; zbieranie oraz oczekiwanie w kolejce nie wchodzą do tych dwóch czasów. Ograniczona symulacja albo niemożliwa dostawa daje opis przyczyny zamiast fałszywego zera.

## Kaplica i latarnia

Kaplica poziomu 1 nie daje pasywnego bonusu. Ukończenie rozbudowy do `N` daje +`10N` pp szczęścia i podatki ×2 na 10 h. Osobne darmowe błogosławieństwa mają łączną liczbę użyć równą poziomowi kaplicy. Każde daje natychmiast +50 wszystkich sześciu zasobów i +20 pp szczęścia na 1 h. Nie można nakładać dwóch aktywnych błogosławieństw.

Płatne użycie kosztuje `100 × poziom kaplicy` monet i ma ten sam efekt. Następne płatne użycie jest dostępne **4 h po zakończeniu efektu**: start 12:00, koniec 13:00, kolejne od 17:00. Rozbudowa i ręczne błogosławieństwo mogą działać równocześnie, z limitem szczęścia każdej osoby.

Ukończenie latarni ustawia efektywne szczęście uprawnionych mieszkańców na **100%**, a produkcję pięciu materiałów mnoży przez 2. Obie premie trwają `24 h × nowy poziom`. Podatki i transport nie mają mnożnika. Po zakończeniu przywracany jest osobisty stan szczęścia zapisany przed premią; nowy mieszkaniec nadal podlega 24 h zamrożenia 0%.

Zwiedzanie jest osobną mechaniką: maksymalnie `2 × poziom latarni` osób jednocześnie, z domu, na 4 h. Nie ma czasu dojścia i możliwości wycofania. Osoby jedzą normalnie, nie pracują i nie płacą podatku. **Po powrocie** uczestnicy dostają osobiste 100% na 24 h oraz 24 h zakazu kolejnej wizyty; cała populacja dostaje +10 pp na 6 h za daną wysłaną grupę. Kolejne grupy mają własne zegary, a ich premie populacji się sumują. Osobiste 100% ma pierwszeństwo przed zwykłymi dodatkami, z wyjątkiem zamrożenia noworodka.

Poza limitem jednoczesnych miejsc obowiązuje `2L` darmowych wejść w ruchomych 24 h. Można kupić do 3 dodatkowych pakietów w tym oknie, każdy po `2L` wejść. Kolejne numery pakietów, razem z darmowym, to 2, 3, 4; cena to `300 × numer × poziom latarni`. Pakiet nie zwiększa jednoczesnej liczby miejsc ani nie omija osobistego zakazu powrotnej wizyty.

## Zadania latarni

Zawsze widoczne są trzy zadania i ich nagrody. Na starcie: małe, średnie, duże. Po ukończeniu lub wygaśnięciu nowe losowe zadanie trafia na koniec FIFO; mogą wystąpić trzy małe albo trzy duże. Aktywne jest maksymalnie **jedno** zadanie: tylko ono przyjmuje wpłaty, a druga akceptacja jest blokowana do ukończenia lub wygaśnięcia bieżącego. Lista i prawy panel pokazują ten sam stan Active oraz dostarczone / wymagane każdego produktu. Pozostałe karty są wyszarzone i nie można ich rozpocząć ani zasilać; podgląd wymagań pozostaje dostępny. Wcześniejsze wpłaty i utrwalony mnożnik starszych zadań są zachowane przy migracji.

| Rozmiar | Wymagane rodzaje | Godziny zachowanej normy produkcyjnej | Bazowe monety na poziomie 3 | Rodzaje materiałów nagrody |
| --- | --- | --- | --- | --- |
| Małe | 2 | 2–6 h | 100–200 | 1 |
| Średnie | 2–3 | 3–8 h | 100–400 | 2 |
| Duże | 4 | 4–10 h | 100–600 | 3 |

Wymaganie materiału to `12 × poziom jego producenta × wydajność/os./h × wylosowane godziny`, zapisane przy powstaniu zadania. Ta norma i dotychczasowy limit obsady zależny od miejsca pracy pozostają zachowane. Wymagania nie zmieniają się po pokazaniu zadania; nie są obietnicą uzbierania całej wpłaty od zera w takim czasie przy współdzielonej populacji i karmieniu. Nowe średnie ma co najmniej tyle godzin co największe aktualne małe; nowe duże co najmniej tyle co największe aktualne średnie. Pula obejmuje 100 narracji napraw i zaopatrzenia latarni. Nagrody materiałowe bazowo wynoszą 50–1000 **każdego** wylosowanego rodzaju na poziomie 3. Monety i ilości materiałów zachowują skalę `12 × L_ratusza × wydajność(L_ratusza) / 468`. Nagroda pozostaje stała po pokazaniu zadania.

Bazowe nagrody monetowe aktualnych zadań zachowują kolejność małe < średnie < duże. Po zmianie poziomu nowy zakres może nie pasować między zamrożone stare nagrody. Wtedy losujemy rozmiar spośród tych, które spełniają zakres i kolejność, bez zmiany już pokazanych nagród; rozmiary nie mają zagwarantowanych równych szans. Warunki godzinowe są sprawdzane przy generowaniu, a mnożnik szybkiej akceptacji jest osobną premią.

Kliknięcie przyjęcia przed upływem 15 s zapisuje ×3; od 15 s do przed 5 min ×2; później ×1. Mnożnik obejmuje całą nagrodę, nie wymaga natychmiastowego ukończenia. Wpłaty są bezpośrednio z centrali, również w ratach, z licznikiem dostarczone/wymagane. Nie ma tragarza ani zwrotu; nieukończone wpłaty przepadają z terminem. Nagroda jest przyznawana raz po ostatniej wpłacie. Materiały przekraczające pojemność trafiają do bufora nagród i automatycznie uzupełniają centralę, gdy zwolni się miejsce.

Każdy z trzech łańcuchów ma osobny termin. Przed pierwszym ukończeniem zadania mają 6 h. Pierwsze ukończenie zapisuje stałą dobową godzinę odnowienia danego łańcucha w Europe/Warsaw; następny termin wypada o tej godzinie kolejnego dnia. Kolejne zadanie po ukończeniu pojawia się od razu. Powrót offline nie odnawia okna reakcji ×3 ani nie zwraca przeterminowanych wpłat.

## Ekspedycje, ranking i lojalność

Ekspedycje mają osobne plansze i wypłacają **wyłącznie monety**. Pierwszy ukończony etap daje pulę 50, następne 100, 200, 400… Gracz wypłaca do skarbca albo ryzykuje całą pulę na kolejnym etapie. Porażka lub wygaśnięcie czasu traci niewypłaconą pulę. Tryb ma limit ruchów albo czasu; wynik sprawdza poprawną trasę i etap bieżącego przebiegu. Ponowne rozliczenie zamkniętego etapu lub wypłaty jest odrzucane. W lokalnym prototypie weryfikacja klienta nie zastępuje serwera.

Ranking w ustawieniach to lokalny zapis `poziom ratusza × monety`, aktualizowany o pełnej godzinie zegarowej. Nie jest jeszcze rankingiem wielu kont. Seria wizyt liczy kolejne dni kalendarzowe Europe/Warsaw do 10, bez nieokreślonych nagród lojalnościowych.

## Usługi za monety i integracje

Monety i złoto to jedna waluta. Uzgodniono `1 PLN = 10 monet`; nie oznacza to działającej płatności ani wypłaty na PLN. Lokalne operacje pobierają istniejące monety z prototypu.

- Skrócenie **pozostałej fazy budowy** o 25%, 50%, 75% albo 100% kosztuje `max(5, floor(zaoszczędzone sekundy / 60))` monet. Cena i skrócenie są podawane przed zatwierdzeniem. Transport ma osobną operację.
- Natychmiastowy transport od ratusza 4: 10 monet za każdy wymagany kurs, także ostatni niepełny, osobno dla każdego materiału. Obsługuje bufor producenta → centrala, centrala → budowa, targ w obie strony i osobne etapy portowe; za dostawę do portu i załadunek są osobne opłaty. Usługa nie tworzy miejsca ani towaru i zachowuje terminy/blokady handlu.
- Kupno kompletnego budynku od ratusza 4: pełna proporcjonalna bazowa cena portowa wszystkich materiałów ×1,25 + osobno natywne monety kosztu budynku + opłata natychmiastowego transportu. Nie pobiera własnych materiałów; końcowa cena monet jest zaokrąglona w górę. Budynek jest gotowy po **10 sekundach**, bez wymogu rzeczywistych tragarzy; obowiązują zależności poziomu i miejsca budowy.
- Pakiet budowlany: `1000 × poziom ratusza` monet na 24 h, kolejne kupno przedłuża ważność. Daje +4 aktywne budowy i kolejkę bez limitu. Nie znosi +10% kosztu kolejki.
- Plan z prognozy wymaga aktywnego pakietu i wykonalnej produkcji/dostawy. Dodatkowo kosztuje 25% bazowej portowej wartości **brakujących** materiałów, liczonych po dopłacie kolejki. Przykład: baza 300, kolejka 330, centrala 200 — dopłata dotyczy 130. Plan nie tworzy towaru; pełna rezerwacja i start czekają na fizyczne dostawy, z ochroną Food. Po wygaśnięciu pakietu aktywne budowy kończą się, opłacona kolejka podlega zwykłym limitom, a nieopłacone plany czekają.

Zapisano przyszłe nagrody: 1000 monet za informację o grze, 500 za informację o nowym poziomie, 1000 za poleconego logującego się gracza, 500 każdego materiału po jego trzecim aktywnym dniu i 1000 za każdy trzeci post FB. **Nie przyznajemy ich z niezweryfikowanego kliknięcia.** Warunki integracji, reklam do 30 s, dokupowania czasu/ruchów i ukrytego kodu pozostają odłożone. Tak samo nie uruchomiono OAuth Google/Facebook ani płatności zewnętrznych.

## Rozstrzygnięcia 23 października — D01–D17

| Decyzja | Przyjęta reguła |
| --- | --- |
| D01 | Po powrocie wizyty: populacja +10 pp/6 h, uczestnicy 100%/24 h. |
| D02 | 2L miejsc jednocześnie i 2L darmowych wejść/24 h; do 3 płatnych pakietów po 2L, cena 300 × numer 2/3/4 × L. |
| D03 | Punkty domu dodają osobiste pp, nie usuwają kar ani liczników. |
| D04 | Pula zamrożona przy odnowieniu; po 23 h 58 min rozdział reszty najmniej szczęśliwym, losowanie remisów; odnowienie co 24 h. |
| D05 | Start S/M/L, później losowe rozmiary na koniec FIFO. |
| D06 | Pierwsze ukończenie wyznacza dobową godzinę łańcucha; nowe zadanie od razu; początkowo terminy 6 h. |
| D07 | Zakresy nagród bazują na poziomie 3 i skalują się do 468 szt./h. |
| D08 | Nagrody materiałowe mają 1/2/3 rodzaje dla S/M/L. |
| D09 | Pakiet 1000 × poziom ratusza monet/24 h; kolejka nadal +10%. |
| D10 | Prognoza: +25% wartości braków po uwzględnieniu dopłaty kolejki; materiały nadal muszą dotrzeć. |
| D11 | Pełny kupiony budynek: komplet materiałów +25%, natywne monety i transport; bez własnych materiałów/tragarzy; gotowy po 10 s. |
| D12 | Minimalna opłata przyspieszenia zawsze 5 monet. |
| D13 | Nowa osoba ma zamrożone 0% przez 24 h, również podczas premii; początkowa dwunastka wyłączona. |
| D14 | Limit −50 pp dotyczy tylko składnika przestoju. |
| D15 | Kolejne płatne błogosławieństwo 4 h po końcu efektu. |
| D16 | Portowa historia podwyżek jest osobna dla każdego rodzaju towaru. |
| D17 | Zatwierdzony koszt kaplicy: nowy poziom × (180 monet +20 drewna +60 kamienia +10 desek). |

## Granice obecnej implementacji

Reguły działają w lokalnej przeglądarce i są zapisywane w schemacie 8. Nie ma jeszcze autorytatywnego serwera, kont, wspólnego rankingu, synchronizacji web/Android/iPhone, płatności, potwierdzania poleceń ani reklam. Zegar, stan i komendy klienta nie są dowodem uprawnienia lub zakupu. Backend musi sam rozliczać czas, zasoby i nagrody, weryfikować tożsamość i transakcje oraz chronić operacje przed powtórzeniem i równoległymi sesjami. Zakres zapisano w [backlogu](BACKLOG.md).
