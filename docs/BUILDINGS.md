# Budynki i mieszkaniec — DEV 0.12.0.0/v28

Opis kandydata DEV łączy [bazę v18](FRONTEND-V18-REQUIREMENTS.md), [rozszerzenie v21](FRONTEND-V21-REQUIREMENTS.md), [początek gry v26](FRONTEND-V26-REQUIREMENTS.md), zatwierdzone [zmiany v27](FRONTEND-V27-REQUIREMENTS.md), najnowsze [GOv28](FRONTEND-V28-REQUIREMENTS.md) i [reguły gospodarki](ECONOMY-RULES.md). Nie stanowi potwierdzenia publikacji ani promocji do PRE-PROD. Bieżące wersje, źródła i wyniki wdrożeń wskazuje [rejestr środowisk](ENVIRONMENT-STATUS.md). Wcześniejsze arkusze i historyczne wymagania pozostają migawkami swoich wersji.

L to obecny własny poziom, N — nowy. Kwoty bazowe; kolejka dodaje 10% każdego składnika, w górę do sztuk. Dla nowych zwykłych projektów T jest rzeczywistym czasem od pierwszego odbioru do ostatniej dostawy, także przez przerwy. Aktywność wpływająca na przewóz zmienia więc również wynikową fazę budowania.

| Budynek / EN | Po co jest | Ludzie: start / limit | Korzyść poziomu | Koszt ulepszenia | Sama budowa | Ważna zasada |
|---|---|---|---|---|---|---|
| Ratusz / Town Hall | Określa poziom wyspy, limit mieszkańców i granicę rozbudowy innych budynków. | 0 | 24 × L mieszkańców; L budów + L kolejki | 500 × L każdego z 6 zasobów | T | Od 3→4 min.75% ludności poziomu poprzedzającego cel; od TH6 handel graczy, od TH10 druga wyspa |
| Dom / House | Zapewnia miejsca mieszkalne oraz codzienną pulę szczęścia dla osób mających łóżko. | 0 | 24 × L łóżek; dzienna pula po 1 punkcie na mieszkańca mającego łóżko | 500 × L każdego z 6 zasobów | T | Zbiorowe punkty tylko dla uprawnionych z łóżkiem; bank 7 porcji bez automatu 23:58; limit populacji osobno z Ratusza |
| Farma / Farm | Produkuje zboże, które młyn przetwarza na żywność. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | L × (72 drewna +72 kamienia +120 zboża) | T | Osobne postępy; magazyn lokalny i centrala |
| Młyn / Windmill | Przetwarza 2 zboża z centrali na 1 żywność dla mieszkańców. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | 2L × (72 drewna +72 kamienia +120 żywności) | T | Wejście pobierane przy gotowej sztuce |
| Kamieniołom / Quarry | Wydobywa kamień do rozbudowy budynków i ulepszania ścieżek. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | 2L × (72 drewna +192 kamienia) | T | Suma kamienia konstrukcyjnego i własnego produktu |
| Drwale / Lumber Camp | Dostarczają drewno do budowy i przetwarzania w tartaku. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | 2L × (192 drewna +72 kamienia) | T | Suma drewna konstrukcyjnego i własnego produktu |
| Tartak / Sawmill | Przetwarza 2 drewna z centrali na 1 deskę do budowy. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | 2L × (72 drewna +72 kamienia +120 desek) | T | Wejście pobierane przy gotowej sztuce |
| Magazyn / Warehouse | Przechowuje zasoby i wysyła tragarzy po produkcję oraz z materiałami na budowy. | 0 / 12 × własny L | L1:120/kurs; pojemność ×1, 5 i ładunek ×1, 1 do L24, potem tylko obsada | 300 × L każdego z 6 zasobów | T | Rezerwa 50 × min(L, 24); zapas bonusowy nie zajmuje limitu zwykłych dostaw |
| Targ / Market | Od Ratusza 2 wymienia towary w tej samej grupie z marżą 10%; od Ratusza 6 dostępne są również oferty graczy za monety. | 0 / 12 × własny L | L1: 1000 łącznie i 120/kurs, dalej odpowiednio ×1, 5 i ×1, 1 | 300 × L każdego z 6 zasobów | T | 10 → 9; 1 h blokady; własny transport; wymiana przy 0 obsady; handel z grą pozostaje dostępny |
| Port / Harbor | Od Ratusza 4 kupuje i sprzedaje materiały z grą; od Ratusza 6 udostępnia także rynek graczy oraz przewóz między własnymi wyspami. | 0 / 12 × własny L | L1: 1000/rodzaj, 4000 łącznie, 120/kurs; potem limity ×1, 5 i ładunek ×1, 1 | 400 × L każdego z 6 zasobów | T | Paczki 100; 2 etapy transportu; osobne partie 24 h; handel z grą pozostaje dostępny |
| Kaplica / Chapel | Udziela błogosławieństw zapewniających zasoby i czasowe szczęście. | 0 | +10 × N punktów oraz mechaniczne podatki ×2 na 10 h | N × (180 monet +20 drewna +60 kamienia +10 desek) | 3T × (N−1) | 1 darmowe/dzień Warszawy; płatne/reklamowe 4 h od końca; opieka od L3 |
| Latarnia / Lighthouse | Jest sercem wyspy i jednym z głównych celów jej rozwoju; misje motywują do rozbudowy gospodarki i przywracania jej blasku. | 0 | 100 punktów szczęścia i produkcja ×2 przez 24 h × N | 500 × max(1, L) każdego z 6 zasobów | 4T | Poziom 0: Ruiny; nazwy 1–100; misje 8/5/3; wizyty 4 h, osobiste 24 h, grupa +10 punktów/6 h |

## Człowiek, szczęście i aktywność

Mieszkaniec ma trwałe ID, indywidualne H, miejsce pracy/pobytu i niezależne zegary. Pierwsza wyspa zaczyna z 12 osobami, bez obsady i bazowym 20 punktami szczęścia. Jej czas i 72-godzinna ochrona ruszają po zakończeniu wprowadzenia. Przez 72 h minimum 20 punktów obejmuje także nowo przybyłych i nie tworzy długu kar. Druga wyspa nie odnawia wykorzystanej ochrony konta.

Wymuszone 100 punktów ma pierwszeństwo nad ochroną powitalną i standardowym 24-godzinnym 0 punktów nowych osób. Przybyły podczas Latarnianej premii korzysta do wspólnego końca; nie dostaje nowego pełnego czasu za sam moment przyjścia. Po końcu wymuszenia/ochrony wracają normalne zasady wieku i aktywnych efektów.

Dodatni przyrost populacji jest ×2; odejścia nie są przyspieszone. Ratusz daje 24 miejsca populacji na poziom, a Dom osobno 24 łóżka na poziom. Populacja może przekroczyć liczbę łóżek, do limitu Ratusza. Minimum wynosi 12 osób na wyspie macierzystej i 6 na córce, również przy odejściach lub dżumie. Przy stałym szczęściu 20/50/100 punktów jedna osoba przybywa odpowiednio co 7 godz. 30 min / 3 godz. / 30 min.

Dojście i powrót trwają po **120 sekund** dla każdego pracownika, w tym pierwszych tragarzy. Zastępuje to dawne pięć minut oraz wyjątek dojścia pierwszej szóstki w 20 sekund. Przydział wstrzymuje karę bezrobocia w drodze, ale licznik zeruje dopiero dotarcie. Podatek płaci przybyły przypisany pracownik, także przy blokadzie produkcji. Tragarz odwołany z ładunkiem najpierw kończy rozpoczętą dostawę, nie bierze następnej i dopiero przez dwie minuty wraca do Domu.

Brak łóżka ma konsekwencje tylko dla osoby, która go nie ma: pracuje z połową wydajności, zużywa dwa razy więcej żywności i nie otrzymuje punktów szczęścia z Domu. **Nie działa już dawna wspólna kara szczęścia za każdą brakującą osobę.** Mieszkaniec z łóżkiem zużywa 1 jednostkę żywności na godzinę, bez łóżka — 2; także offline. Głód jest osobnym mnożnikiem wydajności ×0, 5, więc z brakiem łóżka daje łącznie ×0, 25. Dojście pracownika nadal trwa dwie minuty; te mnożniki dotyczą pracy i przewozu towarów, a nie osobistego marszu.

Dom na koniec doby Warszawy dopisuje porcję po jednym punkcie za faktycznie zakwaterowaną osobę. Bank zachowuje najwyżej 7 niewydanych porcji, nie przyjmuje ósmej i nie odbiera starej reszty. Rozdawanie wyłącznie zbiorowe; brak indywidualnego pola oraz automatu 23:58. Punkty trafiają do uprawnionych osób z łóżkiem, po 24 h od przybycia i bez wymuszonego 100 punktów. Wczytanie zachowuje już przyznaną pulę.

Zwykłe jedzenie i praca dają po 1 punkcie/h, razem+2. Każdy mieszkaniec traci 1 punkt na północy Warszawy, również offline, z pierwszeństwem ochrony i wymuszeń. Nie ma nowej krzywej przy 30 punktach. Gotowość przybyłych pracowników transportu/handlu jest pracą; blokada producenta nie daje premii pracy. Komunikaty przestoju wyjaśniają rzeczywistą karę i odróżniają wznowienie produkcji od polecenia powrotu do Domu.

Indywidualna modlitwa z Domu trwa 10 min×ukończony TH wraz z 120 s dojścia i 120 s powrotu; po powrocie daje+50 punktów/6 h. Normalne jedzenie, brak pracy/podatku i kary bezrobocia podczas modlitwy. Parametry DEV:10×TH monet/osobę, liczba uczestników ograniczona ukończonym poziomem Kaplicy.

Realna aktywność daje produkcję/podatki/prędkość przewozu ×2 przez 5 min, potem ×1, po 48 h bez grania ×0, 5. Nie zmienia to pojemności kursu, osobistego dojścia, jedzenia i czasu efektów. Drogi i głód zachowują odrębne mnożniki.

Zaproszenie osoby kosztuje 500×ukończony TH każdego z sześciu zasobów, tak samo w misji i opisie, bez rabatu startowego. Wymaga wolnego miejsca w limicie Ratusza; wolne łóżko nie jest warunkiem zakupu. Przy braku łóżka obowiązują opisane wyżej indywidualne skutki. Jeżeli wydarzenie nie pozwala przyjąć rozbitka, rekompensata wynosi 500 × TH monet, bez przeliczania całej ceny materiałów.

## Składy i materiały bonusowe

Producent odkłada gotowe produkty w buforze 200 × własny L. Zwykłe dostawy do centrali respektują pojemność jednego materiału, sumę i rezerwę żywności. Materiały z nagród mają odrębną ewidencję bonusową: są od razu wydawalne i nie zabierają miejsca zwykłemu przewozowi. Wydajemy najpierw bonus; rezerwacje nadal uniemożliwiają wydanie tego samego dobra drugi raz.

Magazyn L24 osiąga maksimum 10 mln jednego materiału i 40 mln łącznie. Po L24 nie rośnie również bazowy ładunek ani rezerwa żywności wynikająca z poziomu; nadal rośnie limit obsady. Ulepszenia dróg są niezależne. Nie rozszerzamy tego ograniczenia poziomu na Targ/Port.

Natychmiastowy przewóz liczy miejsce z wcześniej nadchodzącymi zwykłymi ładunkami i odmawia przed opłatą. Poprawka Targu zachowuje poprzednią zwykłą rezerwację odbioru. W Porcie podjęcie ładunku przed wygaśnięciem chroni rozpoczęty kurs na obu etapach, również statek → Port.

## Kaplica, Latarnia i wydarzenia

Misje Latarni od Ratusza 2, po ukończeniu lub zamknięciu samouczka, tworzą ścieżkę **8 etapów głównych**. Przekroczenie terminu otwiera **5 pomocniczych**, a niepowodzenie w nich — **3 ratunkowe**. Ostatni etap pomocy wymaga rzeczywistego dokończenia przerwanego celu, np. rozbudowania budynku. Następnie gracz przechodzi do kolejnego etapu ścieżki wyżej; ukończone kroki nie przepadają. Nieudany etap ratunkowy można powtórzyć. Statek z plagą na tej ścieżce jest częścią opowieści, bez dodatkowego ukrytego ubytku ludzi lub zasobów.

Przed przyjęciem celu gra konserwatywnie sprawdza zapas, obsadę, składniki produkcji, magazyn, jedzenie i transport we wspólnym budżecie. Nie zakłada zakupu za pieniądze, losowej nagrody, handlu ani nowych mieszkańców. Bez wykazanego planu pokazuje potrzebne przygotowania i nie uruchamia terminu. Termin przyjętego zadania biegnie także offline. Nowe zwykłe oferty Latarni również mają ograniczenia wykonalności; historyczne zaakceptowane oferty zachowują zapisane warunki. Zakres oceny opisują [wymagania v27](FRONTEND-V27-REQUIREMENTS.md).

Ręczne błogosławieństwo daje 50 sześciu zasobów i 20 punktów/1 h; jedno darmowe na dzień Warszawy, reset o północy, bez kumulowania. Płatne i reklamowe współdzielą 4 h blokady od końca godzinnego efektu; darmowe nie przesuwa tej blokady. Ręczne efekty nie nakładają się.

Od poziomu Kaplicy 3 odstęp regularności to 3+poziom Kaplicy dni; po przekroczeniu dalsze 6–15 dni do zagrożenia. Wszystkie rzeczywiste ręczne użycia odnawiają regularność. Osobna modlitwa jest opisana powyżej; dodatkowe błogosławieństwa za wyzwania/social pozostają odłożone.

Dobre wraki co 36–60 h; podczas globalnych 100 punktów jedno dobre może czekać, złe terminy anulujemy i losujemy po ochronie z zachowaniem opieki Kaplicy. Latarnia uruchomiona podczas plagi wymusza 100 punktów, nie zwraca utraconych osób/materiałów. Rezerwacje i niesione ładunki pozostają chronione.

## Budynki w samouczku

Tutorial to 33 opisy ekranu, samouczek to 25 praktycznych lekcji. WPomocy pod? są dwie ramki wznowienia i uruchomienia od początku bez resetu i powtórnych nagród. Zamknięcie tutoriala pokazuje informację i wskazuje?. Reklamy czekają do bezpiecznego momentu; po wcześniejszym wyjściu ochrona trwa godzinę aktywnej gry.

Nowy program 6 zaczyna się od 3 tragarzy, priorytetu Budowa, rolnika, drwala i Ratusza 2. **Brak specjalnych czasów turbo dla nowych projektów.** Zachowany rabat TH1→2 po 100 każdego zasobu. Lekcja Ratusza przechodzi przez zwykłe zlecenie, wyjaśnienie faz, natychmiastowy dowóz i 100%skrócenie budowy. Gospodarstwo pokazuje pełne kupno bez podwójnej zapłaty. Wcześniejsze nagrody pokrywają rzeczywiste ceny; lekcja 11 uczy dodatkowego tragarza i priorytetu odbioru.

Programy 3/4/5 zachowują własne kryteria i nagrody. Stare projekty z zapisanym turbo zachowują czasy; nowo zlecane projekty nie dostają dawnego 30 s/60 s wyjątku. Osobiste dojście i powrót nadal 120 s, zwykły towarowy kurs bazowo 5 min. Końcowe rozliczenie nowego kursu uzupełnia zwykły magazyn bez zaległych skrzyń i bez kasowania istniejącego majątku.

Po ostatniej nagrodzie jednorazowa opowieść zaprasza do ośmiu misji Latarni. Nie uruchamia terminu bez akceptacji etapu. Zaległe rozdziały 2→3→4 nie są pomijane po szybkim Ratuszu. Nagrody obejmują materiały/monety/ludzi/produkcję: ludzi przyjmujemy tylko do wolnego limitu, bez kolejki nadmiaru; ×2 producenta i×2Latarni dają×4, identyczne premie wydłużają czas. Jawne wartości DEV: wybrane etapy 1 osadnik, finał 1–3 według rozdziału, premia producenta 2 h.

## Próg Ratusza, rynek i druga wyspa

Awans Ratusza od 3→4 wymaga co najmniej `ceil(0, 75 × 24 × (docelowy poziom − 1))` mieszkańców:54 dla 4, 72 dla 5, 90 dla 6. Warunek obejmuje nowe projekty premium i kolejkę, dotyczy wyłącznie Ratusza i nie anuluje wcześniej zatwierdzonych projektów.

Handel z grą pozostaje dostępny: Targ od Ratusza 2, Port od Ratusza 4. Od Ratusza 6 gracze mogą dodatkowo sprzedawać materiały innym graczom za monety. Cena może być niższa od bazowej ceny sprzedaży NPC, ale nie wyższa. Serwer rezerwuje ofertę i rozlicza przyjęcie atomowo. Brak miejsca blokuje przyjęcie, a niemieszczący się zwrot czeka w trwałej skrzynce. Historyczne oferty barterowe zachowują zapisane warunki. Działający rynek w chmurze wymaga osobnej aktywacji API.

Kolejne wyspy odblokowują się przy Ratuszu matki 10, 13, 16, 19 i dalej co trzy poziomy, do 20 wysp łącznie. Koszt pierwszej córki to suma wszystkich rozbudów Ratusza i Domu do poziomu 7 w sześciu zasobach; kolejnych do poziomu 8, 9 itd. Rabat samouczka nie obniża ceny kolonii. Zakładanie wymaga co najmniej 18 osób na matce, w tym sześciu rzeczywiście w Domu; te same osoby natychmiast przechodzą na córkę bez rejsu, pozostawiając matce minimum 12.

Ratusz i Magazyn córki jednorazowo kopiują bieżące poziomy matki; inne budynki zaczynają na 1. Nie ma drugiego darmowego pakietu zasobów. Rozwój pozostaje niezależny, a kolorystyka i nazwa „Nazwa matki - Nazwa córki” wskazują aktywną wyspę. Zmiana nazwy matki aktualizuje prefiksy córek.

Wspólny statek przewozi albo 1000 sztuk towarów przez 10 minut, albo do 100 pasażerów przez 30 minut, bez opłaty za sam rejs. Pasażerowie muszą być rzeczywiście w Domu. Przy wypłynięciu przygotowuje się zwykłe posiłki: po **0, 5 jednostki żywności dla osoby mającej łóżko i po 1 jednostce dla osoby bez łóżka**. Historyczne rozpoczęte rejsy zachowują już opłacone posiłki. U celu potrzeba wolnych miejsc w limicie Ratusza, bez warunku wolnych łóżek. U źródła pozostaje minimum 12 osób na matce albo 6 na córce.

Brak zwykłego miejsca odkłada rozładunek towarów; bonus zachowuje odrębne pochodzenie. Zwiększenie pojemności towarowej kosztuje 50 monet za 1000 sztuk i jest rozliczane jednokrotnie przez zaufane API, bez bezpośredniej oferty PLN. Nie zwiększa limitu pasażerów. Historie i uprawnienia pozostają wspólne dla konta.

## Wspólne widoki i ekspedycje

Administracja i Gospodarka zachowują równe miniatury, poziomy i podpisane obsady. Przy produkcji rzeczywista wydajność rośnie 20/24/26/28… zamiast stałej 20; przestój rozróżnia brak wejścia/miejsca oraz indywidualną karę. Kolumny kart są wyrównane, przewozy odświeżają ETA i etapy, a popup skrócenia pokazuje faktycznie oszczędzony czas. Menu Monet wyjaśnia podatki, reklamy i minigry; przybyły przypisany pracownik płaci podatek także przy blokadzie produkcji.

Gracz wybiera kulki albo trójki. Nagrody rund 50, 100, 200, 400… dają pulę 50, 150, 350, 750… . Kontynuacja ryzykuje niewypłaconą serię, wypłata ją kończy. Dodatkowy czas kupuje się przed terminem dobrowolnie; nie ma automatycznych opłat za przekroczenie. Obecny dobór wdrożeniowy:30 s/10 monet maks.2/rundę, reklama 60 s maks.1/rundę.

Pakiet budowlany 24 h za monety jest odrębny od bezreklamowego uprawnienia po zakupach 1999 gr/30 dni. To drugie usuwa reklamy standardowe i zachowuje ich bonusy bez filmu, lecz reklamy za czas ekspedycji nadal występują. Prawdziwe płatności/reklamy wymagają konfiguracji; poza PROD jest oznaczona symulacja.

Lojalność 50–200 sześciu zasobów ma zapisane losowanie raz na dzień Warszawy. Program kończy 10 odebranych nagród albo TH4. Samo odświeżenie nie odnawia nagrody. Dostępna premia ma wiadomość oraz popup pierwszego wejścia danego dnia Warszawy, bez przerywania nauki i bez duplikowania po odbiorze.

## Historyczny odbiór wersji 9

Wydanie **frontend-v13 / Excel 9** zakończyło implementację, odbiór lokalny, publikację i odbiór publiczny:**388/388 testów modelu PASS**, pięć lokalnych zestawów przeglądarkowych i trzy zestawy rzeczywistego Pages PASS. Udane [Pages 40012462614](https://github.com/ksobczak321-oss/gra/actions/runs/40012462614); publiczny Excel i 17 plików gry zwracały HTTP 200 oraz zgadzały się z lokalnymi sumami kontrolnymi. Dowody zachowuje [dziennik](IMPLEMENTATION-LOG.md); ten wpis nie opisuje odbioru v17.

## Usługi za monety i bieżący odbiór

Wszystkie usługi premium za monety od TH1; PLN kupują wyłącznie monety od TH3 według 10 monet/zł. Zwykła gospodarka nadal używa materiałów. Jedno saldo ma jednakową siłę nabywczą; pochodzenie rozróżniamy wyłącznie do Pomagam. Dla równej ceny przyspieszenia widać tylko największe skrócenie.

Nowe zwykłe zadanie ma co najmniej 30 min do terminu: oferta po 23:30 kończy się dopiero o północy następnego dnia Warszawy. Nagroda odpowiada końcowej wartości wymagań. Bieżąca wersja ma własny [odbiór 0.12](DEV-0.12.0.0-VALIDATION.md); PRE-PROD pozostaje 0.11/c 7 c 3974. Kod nie jest aktywacją operatora, resetem lub promocją.
