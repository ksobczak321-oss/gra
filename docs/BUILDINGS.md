# Budynki i mieszkaniec — frontend v15

Stan wydania **frontend-v15**: implementacja i odbiór lokalny ukończone — 440/440 testów modelu i siedem grup Chromium PASS. Publiczny odbiór v15 blokuje HTTP 403 proxy środowiska. [Pakiet 17 wymagań GO](FRONTEND-V15-REQUIREMENTS.md) dodaje krótkie opisy, nazwy etapów latarni i zwarte karty oraz podwaja bazową produkcję i ładunek. Wyniki testów i stan publikacji zawiera [dziennik](IMPLEMENTATION-LOG.md).

Reguły nienadpisane przez v15 zachowują [manifest 58 decyzji i 19 wymagań frontendu](decisions-v9.json), zatwierdzony w rozmowie po Excelu 8. Nowsze rozstrzygnięcia zastępują wcześniejsze opisy. Archiwalne Excele 7, 8 i 9 pozostają niezmienione; ten pakiet nie generuje kolejnego arkusza.

L oznacza **obecny własny poziom**, N — nowy. Kwoty są bazowe: przy kolejce każdy składnik rośnie o 10% i jest zaokrąglany w górę. Kolumna budowania podaje samą fazę po dostawach; wcześniejsze zbieranie i oczekiwanie w kolejce nie są doliczane.

| Budynek / EN | Po co jest | Ludzie: start / limit | Korzyść poziomu | Koszt ulepszenia | Sama budowa | Ważna zasada |
|---|---|---|---|---|---|---|
| Ratusz / Town Hall | Określa poziom wyspy, limit mieszkańców i granicę rozbudowy innych budynków. | 0 | 24 × L mieszkańców; L budów + L kolejki | 500 × L każdego z 6 zasobów | T | Efekty u góry; zarządzanie budową tylko tutaj |
| Dom / House | Zapewnia miejsca mieszkalne, wolne osoby do pracy i codzienną pulę szczęścia. | 0 | 24 × L łóżek; dzienna pula według populacji | 500 × L każdego z 6 zasobów | T | Zbiorcze zarządzanie pracą tylko tutaj; automat 23:58 |
| Farma / Farm | Produkuje zboże, które młyn przetwarza na żywność. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | L × (72 drewna +72 kamienia +120 zboża) | T | Osobne postępy; magazyn lokalny i centrala |
| Młyn / Windmill | Przetwarza 2 zboża z centrali na 1 żywność dla mieszkańców. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | 2L × (72 drewna +72 kamienia +120 żywności) | T | Wejście pobierane przy gotowej sztuce |
| Kamieniołom / Quarry | Wydobywa kamień do rozbudowy budynków i ulepszania ścieżek. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | 2L × (72 drewna +192 kamienia) | T | Suma kamienia konstrukcyjnego i własnego produktu |
| Drwale / Lumber Camp | Dostarczają drewno do budowy i przetwarzania w tartaku. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | 2L × (192 drewna +72 kamienia) | T | Suma drewna konstrukcyjnego i własnego produktu |
| Tartak / Sawmill | Przetwarza 2 drewna z centrali na 1 deskę do budowy. | 0 / 12 × własny L | 20/24/26/28… szt./os./h; bufor 200L | 2L × (72 drewna +72 kamienia +120 desek) | T | Wejście pobierane przy gotowej sztuce |
| Magazyn / Warehouse | Przechowuje zasoby i wysyła tragarzy po produkcję oraz z materiałami na budowy. | 0 / 12 × własny L | L1: 120/kurs; pojemność ×1,5 i ładunek ×1,1/poziom | 300 × L każdego z 6 zasobów | T | Miejsce 50L dla żywności; fizyczne rezerwacje zajmują skład |
| Targ / Market | Wymienia towary na inne w tej samej grupie z marżą 10%, od Ratusza 2. | 0 / 12 × własny L | L1: 1000 łącznie i 120/kurs, dalej odpowiednio ×1,5 i ×1,1 | 300 × L każdego z 6 zasobów | T | 10→9; 1 h blokady; własny transport; wymiana przy 0 obsady |
| Port / Harbor | Kupuje i sprzedaje materiały za monety oraz obsługuje ich transport statkiem, od Ratusza 4. | 0 / 12 × własny L | L1: 1000/rodzaj, 4000 łącznie, 120/kurs; potem limity ×1,5 i ładunek ×1,1 | 400 × L każdego z 6 zasobów | T | Paczki 100; 2 etapy transportu; osobne partie 24 h |
| Kaplica / Chapel | Udziela błogosławieństw zapewniających zasoby i czasowe szczęście. | 0 | +10 × N pp oraz mechaniczne podatki ×2 na 10 h | N × (180 monet +20 drewna +60 kamienia +10 desek) | 3T × (N−1) | Darmowe użycie nie przesuwa blokady płatnego |
| Latarnia / Lighthouse | Nagradza odbudowę premiami i oferuje wizyty podnoszące szczęście mieszkańców. | 0 | 100% H i produkcja ×2 przez 24 h × N | 500 × max(1,L) każdego z 6 zasobów | 4T | Poziom 0: Ruiny; własne nazwy 1–100; wizyty 4 h, osobiste 24 h, grupa +10 pp/6 h |

## Człowiek

Osoba ma trwałe ID, indywidualne szczęście, miejsce pracy/pobytu i niezależne zegary. Nowa osoba trafia do domu; przez 24 h jej H wynosi 0%, a liczniki braków jeszcze nie biegną. Zatrudnienie jest ograniczone rzeczywiście dostępnymi osobami, nie samym limitem zakładu.

Mieszkańcy produkują i przetwarzają materiały oraz przewożą towary, potrzebując żywności, miejsca mieszkalnego i pracy. Dodatnie średnie szczęście przyciąga nowych ludzi do limitu Ratusza, ujemne powoduje odejścia, a przy 0% populacja jest stała. Na wyspie pozostaje co najmniej sześć osób.

Kupno jednej osoby używa pełnego kosztu najbliższego Ratusza: `500×obecny TH` każdego z sześciu zasobów, z limitem łóżek i populacji. To jawnie ogłoszone założenie wdrożeniowe, oznaczone F16; nie dopisujemy go do historycznych reguł V7.

## Wspólne widoki

- Administracja: Ratusz, Dom, Magazyn, Targ, Port, Kaplica i Latarnia. Gospodarka: Farma, Młyn, Kamieniołom, Drwale i Tartak. Zasoby, Dekoracje i Ścieżki pozostają oddzielnymi kategoriami.
- Wszystkie miniatury mają równą ramkę i proporcje. Karta ma poziom u góry; zakład pracy pokazuje „Pracuje: n” oraz osobno idących `(+n)` i odwołanych `(−n)`. Cztery budynki bez pracowników mają tylko poziom.
- Producent zachowuje Magazyn: zapas / pojemność teraz / pojemność następnego poziomu oraz Pracownicy: przypisani / wolni w domu / limit. Podpisy są krótkie i tłumaczone EN/PL, a liczby i jednostki mieszczą się w kartach.
- Karta komputerowa mieści podstawowe informacje i działania na jednym ekranie, a dodatkowe objaśnienia są zwijane. Producent podaje produkt, ilość i ETA najbliższej gotowej sztuki; brak wejścia lub miejsca ma powiadomienie bez powtórzeń co sekundę. Latarnia w ruinach nie powtarza bloku „Nie zbudowano”.
- „Budowa i kolejka” pozostaje w Ratuszu, a „Zarządzaj pracownikami” w Domu. Rozbudowa, Premium i osobne ETA są przy budynku; menu „Budynki” dodaje krótki opis funkcji każdego obiektu. Strzałka wraca do poprzedniego menu, a menu wyspy pokazuje własną nazwę i nie oferuje przycisku logowania.
- Premie/kary u góry Ratusza i w Domu zajmują po jednym wierszu z nazwą, wartością, statusem/czasem i końcowym i rozwijającym szczegóły. Wszystkie informacje o podatkach są ukryte w UI.

Koszty, łóżka i przewóz sprawdza wspólny model, również dla usług kupna; wygląd przycisku nie pomija zależności. Szczegóły: [reguły](ECONOMY-RULES.md), [58 decyzji i 19 wymagań](decisions-v9.json).

## Historyczny odbiór wersji 9

Wydanie **frontend-v13 / Excel 9** zakończyło implementację, odbiór lokalny, publikację i odbiór publiczny: **388/388 testów modelu PASS**, pięć lokalnych zestawów przeglądarkowych i trzy zestawy rzeczywistego Pages PASS. Udane [Pages 40012462614](https://github.com/ksobczak321-oss/gra/actions/runs/40012462614); publiczny Excel i 17 plików gry zwracały HTTP 200 oraz zgadzały się z lokalnymi sumami kontrolnymi. Dowody zachowuje [dziennik](IMPLEMENTATION-LOG.md); ten wpis nie opisuje odbioru v15.
