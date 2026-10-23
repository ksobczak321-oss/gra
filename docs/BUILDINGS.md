# Budynki i mieszkaniec — wersja 9

Stan wydania **frontend-v13 / Excel 9**: implementacja, odbiór lokalny, publikacja i odbiór publiczny zakończone — **388/388 testów modelu PASS**, pięć lokalnych zestawów przeglądarkowych i trzy zestawy rzeczywistego Pages PASS. Udane [Pages 40012462614](https://github.com/ksobczak321-oss/gra/actions/runs/40012462614); publiczny Excel i 17 plików gry zwracają HTTP 200 oraz zgadzają się z lokalnymi sumami kontrolnymi. Dowody są w [dzienniku](IMPLEMENTATION-LOG.md); wyniki v12 są historią osobnego wydania.

Źródłem bieżących reguł jest [manifest 58 decyzji i 19 wymagań frontendu](decisions-v9.json), zatwierdzony w rozmowie po Excelu 8. Nowsze rozstrzygnięcia zastępują wcześniejsze opisy. Pliki 7 i 8 zachowują identyczne bajty; ich źródła i wszystkie 48 komentarzy zachowano w ukrytym archiwum Excela 9.

L oznacza **obecny własny poziom**, N — nowy. Kwoty są bazowe: przy kolejce każdy składnik rośnie o 10% i jest zaokrąglany w górę. Kolumna budowania podaje samą fazę po dostawach; wcześniejsze zbieranie i oczekiwanie w kolejce nie są doliczane.

| Budynek / EN | Po co jest | Ludzie: start / limit | Korzyść poziomu | Koszt ulepszenia | Sama budowa | Ważna zasada |
|---|---|---|---|---|---|---|
| Ratusz / Town Hall | Poziom gry i limit innych budynków | 0 | 24 × L mieszkańców; L budów + L kolejki | 500 × L każdego z 6 zasobów | T | Efekty u góry; zarządzanie budową tylko tutaj |
| Dom / House | Łóżka, mieszkańcy i pula szczęścia | 0 | 24 × L łóżek; dzienna pula według populacji | 500 × L każdego z 6 zasobów | T | Zbiorcze zarządzanie pracą tylko tutaj; automat 23:58 |
| Farma / Farm | Zboże | 0 / 12 × własny L | 10/12/13/14… szt./os./h; bufor 200L | L × (72 drewna +72 kamienia +120 zboża) | T | Osobne postępy; magazyn lokalny i centrala |
| Młyn / Windmill | 2 zboża → 1 żywność | 0 / 12 × własny L | Wydajność i bufor własnego poziomu | 2L × (72 drewna +72 kamienia +120 żywności) | T | Wejście pobierane przy gotowej sztuce |
| Kamieniołom / Quarry | Kamień | 0 / 12 × własny L | Wydajność i bufor własnego poziomu | 2L × (72 drewna +192 kamienia) | T | Suma kamienia konstrukcyjnego i własnego produktu |
| Drwale / Lumber Camp | Drewno | 0 / 12 × własny L | Wydajność i bufor własnego poziomu | 2L × (192 drewna +72 kamienia) | T | Suma drewna konstrukcyjnego i własnego produktu |
| Tartak / Sawmill | 2 drewna → 1 deska | 0 / 12 × własny L | Wydajność i bufor własnego poziomu | 2L × (72 drewna +72 kamienia +120 desek) | T | Wejście pobierane przy gotowej sztuce |
| Magazyn / Warehouse | Centrala i kursy produkcji/budów | 0 / 12 × własny L | Pojemność ×1,5; ładunek ×1,1/poziom | 300 × L każdego z 6 zasobów | T | Miejsce 50L dla Food; fizyczne rezerwacje zajmują skład |
| Targ / Market | Barter w 2 grupach, od Ratusza 2 | 0 / 12 × własny L | 1000 łącznie na L1, dalej ×1,5 | 300 × L każdego z 6 zasobów | T | 10→9; 1 h blokady; własny transport; wymiana przy 0 obsady |
| Port / Harbor | Handel monetowy od Ratusza 4 | 0 / 12 × własny L | 1000 na rodzaj /4000 łącznie na L1, dalej ×1,5 | 400 × L każdego z 6 zasobów | T | Paczki 100; 2 etapy transportu; osobne partie 24 h |
| Kaplica / Chapel | Premia rozbudowy i błogosławieństwa | 0 | +10 × N pp oraz mechaniczne podatki ×2 na 10 h | N × (180 monet +20 drewna +60 kamienia +10 desek) | 3T × (N−1) | Darmowe użycie nie przesuwa blokady płatnego |
| Latarnia / Lighthouse | Premia rozbudowy, wizyty i zadania | 0 | 100% H i produkcja ×2 przez 24 h × N | 500 × max(1,L) każdego z 6 zasobów | 4T | Wizyty 4 h, osobiste 24 h, grupa +10 pp/6 h |

## Człowiek

Osoba ma trwałe ID, indywidualne szczęście, miejsce pracy/pobytu i niezależne zegary. Nowa osoba trafia do domu; przez 24 h jej H wynosi 0%, a liczniki braków jeszcze nie biegną. Zatrudnienie jest ograniczone rzeczywiście dostępnymi osobami, nie samym limitem zakładu.

Kupno jednej osoby używa pełnego kosztu najbliższego Ratusza: `500×obecny TH` każdego z sześciu zasobów, z limitem łóżek i populacji. To jawnie ogłoszone założenie wdrożeniowe, oznaczone F16; nie dopisujemy go do historycznych reguł V7.

## Wspólne widoki

- Kolejność 12 kart: Ratusz, Dom, Farma, Młyn, Kamieniołom, Drwale, Tartak, Magazyn, Targ, Port, Kaplica, Latarnia.
- Karta ma poziom u góry; zakład pracy pokazuje faktycznie pracujących oraz osobno idących `(+n)` i odwołanych `(−n)`. Cztery budynki bez pracowników mają tylko poziom.
- Producent zachowuje Storage: zapas / pojemność teraz / pojemność następnego poziomu, a Workers: przypisani / wolni w domu / limit. Podpisy są krótkie i tłumaczone EN/PL.
- Każdy budynek ma status; producent podaje produkt, ilość i ETA najbliższej gotowej sztuki. Brak wejścia lub miejsca ma powiadomienie bez powtórzeń co sekundę.
- Construction and queue pozostaje w Ratuszu, a Manage all workers w Domu. Własny Upgrade pozostaje przy budynku; Premium i osobne czasy są obok.
- Premie/kary u góry Ratusza i w Domu zajmują po jednym wierszu z nazwą, wartością, statusem/czasem i końcowym i rozwijającym szczegóły. Wszystkie informacje o podatkach są ukryte w UI.

Koszty, łóżka i przewóz sprawdza wspólny model, również dla usług kupna; wygląd przycisku nie pomija zależności. Szczegóły: [reguły](ECONOMY-RULES.md), [58 decyzji i 19 wymagań](decisions-v9.json).
