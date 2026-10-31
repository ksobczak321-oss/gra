# Budynki i mieszkaniec — frontend v21

Opis bieżącego kodu DEV łączy [bazę v18](FRONTEND-V18-REQUIREMENTS.md), [rozszerzenie v21](FRONTEND-V21-REQUIREMENTS.md) i [reguły gospodarki](ECONOMY-RULES.md). Nie stanowi potwierdzenia publikacji. Ostatni potwierdzony PRE-PROD to v18 / `6ec3c6d`, workflow `41112673285`; nowszy kod wymaga własnego CI i promocji. Stan wydań zapisuje [dziennik](IMPLEMENTATION-LOG.md). Excel 11 jest migawką wcześniejszych reguł; nie zawiera nowych zmian v21.

L to obecny własny poziom, N — nowy. Kwoty bazowe; kolejka dodaje 10% każdego składnika, w górę do sztuk. T jest rzeczywistym czasem od pierwszego odbioru do ostatniej dostawy, także przez przerwy. Aktywność wpływająca na przewóz zmienia więc również wynikową fazę budowania.

| Budynek / EN | Po co jest | Ludzie: start / limit | Korzyść poziomu | Koszt ulepszenia | Sama budowa | Ważna zasada |
|---|---|---|---|---|---|---|
| Ratusz / Town Hall | Określa poziom wyspy, limit mieszkańców i granicę rozbudowy innych budynków. | 0 | 24 × L mieszkańców; L budów + L kolejki | 500 × L każdego z 6 zasobów | T | Od 3→4 min.75% ludności poziomu poprzedzającego cel; od TH6 handel graczy, od TH10 druga wyspa |
| Dom / House | Zapewnia miejsca mieszkalne, wolne osoby do pracy i codzienną pulę szczęścia. | 0 | 24 × L łóżek; dzienna pula według populacji | 500 × L każdego z 6 zasobów | T | Przydziały i dzienne szczęście; także widok Pracujący; automat 23:58 |
| Farma / Farm | Produkuje zboże, które młyn przetwarza na żywność. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | L × (72 drewna +72 kamienia +120 zboża) | T | Osobne postępy; magazyn lokalny i centrala |
| Młyn / Windmill | Przetwarza 2 zboża z centrali na 1 żywność dla mieszkańców. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | 2L × (72 drewna +72 kamienia +120 żywności) | T | Wejście pobierane przy gotowej sztuce |
| Kamieniołom / Quarry | Wydobywa kamień do rozbudowy budynków i ulepszania ścieżek. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | 2L × (72 drewna +192 kamienia) | T | Suma kamienia konstrukcyjnego i własnego produktu |
| Drwale / Lumber Camp | Dostarczają drewno do budowy i przetwarzania w tartaku. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | 2L × (192 drewna +72 kamienia) | T | Suma drewna konstrukcyjnego i własnego produktu |
| Tartak / Sawmill | Przetwarza 2 drewna z centrali na 1 deskę do budowy. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | 2L × (72 drewna +72 kamienia +120 desek) | T | Wejście pobierane przy gotowej sztuce |
| Magazyn / Warehouse | Przechowuje zasoby i wysyła tragarzy po produkcję oraz z materiałami na budowy. | 0 / 12 × własny L | L1:120/kurs; pojemność ×1,5 i ładunek ×1,1 do L24, potem tylko obsada | 300 × L każdego z 6 zasobów | T | Rezerwa 50 × min(L,24); zapas bonusowy nie zajmuje limitu zwykłych dostaw |
| Targ / Market | DoTH5 wymienia towary w tej samej grupie z marżą 10%, od Ratusza 2; od TH6 nowe wymiany tylko między graczami. | 0 / 12 × własny L | L1: 1000 łącznie i 120/kurs, dalej odpowiednio ×1,5 i ×1,1 | 300 × L każdego z 6 zasobów | T | 10 → 9; 1 h blokady; własny transport; wymiana przy 0 obsady |
| Port / Harbor | Od TH4 do TH5 kupuje/sprzedaje materiały z grą; od TH6 rynek graczy; także przewóz między własnymi wyspami. | 0 / 12 × własny L | L1: 1000/rodzaj, 4000 łącznie, 120/kurs; potem limity ×1,5 i ładunek ×1,1 | 400 × L każdego z 6 zasobów | T | Paczki 100; 2 etapy transportu; osobne partie 24 h |
| Kaplica / Chapel | Udziela błogosławieństw zapewniających zasoby i czasowe szczęście. | 0 | +10 × N pp oraz mechaniczne podatki ×2 na 10 h | N × (180 monet +20 drewna +60 kamienia +10 desek) | 3T × (N−1) | 1 darmowe/dzień Warszawy; płatne/reklamowe 4 h od końca; opieka odL3 |
| Latarnia / Lighthouse | Nagradza odbudowę premiami i oferuje wizyty podnoszące szczęście mieszkańców. | 0 | 100% H i produkcja ×2 przez 24 h × N | 500 × max(1,L) każdego z 6 zasobów | 4T | Poziom 0: Ruiny; własne nazwy 1–100; wizyty 4 h, osobiste 24 h, grupa +10 pp/6 h |

## Człowiek, szczęście i aktywność

Mieszkaniec ma trwałe ID, indywidualne H, miejsce pracy/pobytu i niezależne zegary. Pierwsza wyspa zaczyna z12 osobami, bez obsady i bazowym 20% szczęścia. Jej czas i 72-godzinna ochrona ruszają po zakończeniu wprowadzenia. Przez 72 h minimum 20% obejmuje także nowo przybyłych i nie tworzy długu kar. Druga wyspa nie odnawia wykorzystanej ochrony konta.

Wymuszone 100% ma pierwszeństwo nad ochroną powitalną i standardowym 24-godzinnym 0% nowych osób. Przybyły podczas Latarnianej premii korzysta do wspólnego końca; nie dostaje nowego pełnego czasu za sam moment przyjścia. Po końcu wymuszenia/ochrony wracają normalne zasady wieku i aktywnych efektów.

Dodatni przyrost populacji jest ×2; odejścia nie przyspieszone. Limit Ratusza i łóżek pozostaje oddzielny, minimum populacji 6. Przy stałym H20/50/100% jedna osoba przybywa odpowiednio co 7h30 min/3 h/30 min.

Dojście i powrót trwają 5 min. Przydział wstrzymuje karę bezrobocia w drodze, ale licznik zeruje dopiero dojście. Podatek płaci przybyły przypisany pracownik, także przy blokadzie produkcji. Tragarz odwołany z ładunkiem najpierw kończy kurs i nie bierze następnego, potem wraca.

Realna aktywność daje produkcję/podatki/prędkość przewozu ×2 przez 5 min, potem ×1, po 48 h bez grania ×0,5. Nie zmienia to pojemności kursu, osobistego dojścia, jedzenia i czasu efektów. Drogi i głód zachowują odrębne mnożniki.

Kupno osoby kosztuje 500 × TH każdego z sześciu zasobów i wymaga łóżka oraz miejsca populacji. Rozbitek bez miejsca daje tylko monetarną rekompensatę 500 × TH, nie przeliczenie całej ceny materiałów.

## Składy i materiały bonusowe

Producent odkłada gotowe produkty w buforze 200 × własnyL. Zwykłe dostawy do centrali respektują pojemność jednego materiału, sumę i rezerwę żywności. Materiały z nagród mają odrębną ewidencję bonusową: są od razu wydawalne i nie zabierają miejsca zwykłemu przewozowi. Wydajemy najpierw bonus; rezerwacje nadal uniemożliwiają wydanie tego samego dobra drugi raz.

Magazyn L24 osiąga maksimum 10 mln jednego materiału i40 mln łącznie. PoL24 nie rośnie również bazowy ładunek ani rezerwa żywności wynikająca z poziomu; nadal rośnie limit obsady. Ulepszenia dróg są niezależne. Nie rozszerzamy tego ograniczenia poziomu na Targ/Port.

Natychmiastowy przewóz liczy miejsce z wcześniej nadchodzącymi zwykłymi ładunkami i odmawia przed opłatą. Poprawka Targu zachowuje poprzednią zwykłą rezerwację odbioru. W Porcie podjęcie ładunku przed wygaśnięciem chroni rozpoczęty kurs na obu etapach, również statek → Port.

## Kaplica, Latarnia i wydarzenia

Ręczne błogosławieństwo daje 50 sześciu zasobów i20 pp/1 h; jedno darmowe na dzień Warszawy, reset o północy, bez kumulowania. Płatne i reklamowe współdzielą 4 h blokady od końca godzinnego efektu; darmowe nie przesuwa tej blokady. Ręczne efekty nie nakładają się.

Od poziomu Kaplicy 3 odstęp regularności to3+poziom Kaplicy dni; po przekroczeniu dalsze 6–15 dni do zagrożenia. Wszystkie rzeczywiste ręczne użycia odnawiają regularność. Osobna modlitwa i błogosławieństwa za wyzwania/social pozostają odłożone.

Dobre wraki co 36–60 h; podczas globalnych 100% jedno dobre może czekać, złe terminy anulujemy i losujemy po ochronie z zachowaniem opieki Kaplicy. Latarnia uruchomiona podczas plagi wymusza 100%, nie zwraca utraconych osób/materiałów. Rezerwacje i niesione ładunki pozostają chronione.

## Budynki w samouczku

Nowy program v21 ma 25 rzeczywistych kroków. Przydziały tragarza, rolnika i drwala przeplatają się z wydawaniem materiałów na rozbudowę i pozostałe działania. Nagrody są dopasowane do kolejnych potrzeb i zwykłego miejsca w Magazynie. Końcowe jawne rozliczenie uzupełnia wolne miejsce; wymaga odebrania poprzednich nagród i wykorzystania nadwyżek. Nie kasuje zewnętrznych bonusów ani zasobów. Celem jest pełny zwykły magazyn bez czekających skrzyń.

Starszy program v3 zachowuje własne 25 lekcji, pomoc piątego kroku oraz wylosowane skrzynie 100–300 pięciu materiałów. To zasady historycznych wysp, a nie nowego programu. Odebranych nagród nie wypłacamy drugi raz. Przepełnienie nie blokuje rozbudowy ani zarządzania, a trwająca minigra odkłada popup do bezpiecznego momentu. Nie ma przycisku zaliczającego samo przeczytanie.

## Próg Ratusza, rynek i druga wyspa

Awans Ratusza od 3→4 wymaga co najmniej `ceil(0,75 × 24 × (docelowy poziom − 1))` mieszkańców:54 dla4,72 dla5,90 dla6. Warunek obejmuje nowe projekty premium i kolejkę, dotyczy wyłącznie Ratusza i nie anuluje wcześniej zatwierdzonych projektów.

Od TH6 nowych transakcji NPC nie rozpoczynamy. Gracze sami ustalają ilości oddawane i oczekiwane; serwer rezerwuje ofertę i rozlicza przyjęcie atomowo. Brak miejsca wstrzymuje wymianę, a niemieszczący się zwrot czeka w trwałej skrzynce. Wcześniejsze zamówienia Targu/Portu kończą dotychczasowy przewóz. Działający rynek w chmurze wymaga osobnej aktywacji API.

Od TH10 można raz utworzyć drugą wyspę. Jej Ratusz i Magazyn kopiują bieżące poziomy pierwszej wyspy; wszystkie inne budynki zaczynają na 1. Potem rozwój jest niezależny, a kolorystyka i nazwa wskazują aktywną wyspę. Transport własnym Portem:1000 sztuk, 10 minut, bez opłaty za rejs; brak zwykłego miejsca odkłada rozładunek zwykłych materiałów; bonus zachowuje odrębne pochodzenie. Zwiększenie pojemności:4,99 zł za 1000 sztuk jako oznaczona symulacja Paynow naDEV, bez prawdziwego pobrania środków. Historie i uprawnienia pozostają wspólne dla konta.

## Wspólne widoki i ekspedycje

Administracja i Gospodarka zachowują równe miniatury, poziomy i podpisane obsady. Przy produkcji rzeczywista wydajność rośnie 20/24/26/28… zamiast stałej 20; przestój rozróżnia brak wejścia/miejsca oraz indywidualną karę. Kolumny kart są wyrównane, przewozy odświeżają ETA i etapy, a popup skrócenia pokazuje faktycznie oszczędzony czas. Menu Monet wyjaśnia podatki, reklamy i minigry; przybyły przypisany pracownik płaci podatek także przy blokadzie produkcji.

Gracz wybiera kulki albo trójki. Nagrody rund 50,100,200,400… dają pulę 50,150,350,750… . Kontynuacja ryzykuje niewypłaconą serię, wypłata ją kończy. Dodatkowy czas kupuje się przed terminem dobrowolnie; nie ma automatycznych opłat za przekroczenie. Obecny dobór wdrożeniowy:30 s/10 monet maks.2/rundę, reklama 60 s maks.1/rundę.

Pakiet budowlany 24 h za monety jest odrębny od bezreklamowego uprawnienia po zakupach 1999 gr/30 dni. To drugie usuwa reklamy standardowe i zachowuje ich bonusy bez filmu, lecz reklamy za czas ekspedycji nadal występują. Prawdziwe płatności/reklamy wymagają konfiguracji; poza PROD jest oznaczona symulacja.

Lojalność 50–200 sześciu zasobów ma zapisane losowanie raz na dzień Warszawy. Program kończy 10 odebranych nagród albo TH4. Samo odświeżenie nie odnawia nagrody.

## Historyczny odbiór wersji 9

Wydanie **frontend-v13 / Excel 9** zakończyło implementację, odbiór lokalny, publikację i odbiór publiczny: **388/388 testów modelu PASS**, pięć lokalnych zestawów przeglądarkowych i trzy zestawy rzeczywistego Pages PASS. Udane [Pages 40012462614](https://github.com/ksobczak321-oss/gra/actions/runs/40012462614); publiczny Excel i 17 plików gry zwracały HTTP 200 oraz zgadzały się z lokalnymi sumami kontrolnymi. Dowody zachowuje [dziennik](IMPLEMENTATION-LOG.md); ten wpis nie opisuje odbioru v17.
