# Budynki i mieszkaniec — frontend v17

Bieżący pakiet **frontend-v17** poprawia [układ, oznaczenia kar i odwołanie tragarzy](FRONTEND-V17-REQUIREMENTS.md), zachowując produkcję 20/24/26/28… na osobę oraz ładunek 120 na poziomie 1. Końcowy odbiór i stan publikacji zapisuje [dziennik](IMPLEMENTATION-LOG.md); wcześniejsze wyniki nie potwierdzają tego pakietu.

Wymagania v17 uaktualniają [manifest wersji 10](decisions-v10.json), oparty na [58 decyzjach i 19 wymaganiach](decisions-v9.json). [Excel 10](arkusze/HARBORLIGHT10-zasady.xlsx) pozostaje niezmienionym archiwum v16, w tym dawnego losowania minigier; obecne zasady opisują bieżące dokumenty.

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

## Budynki w samouczku

Pierwsze sześć akcji prowadzi przez menu w lewym górnym rogu i przeczytanie zasad, mapę wyspy, przydział producenta i tragarza, sprawdzenie jedzenia, zlecenie rozbudowy Ratusza oraz zwiększenie szczęścia. Kolejne akcje pokazują podróże do pracy, oba magazyny, priorytety i prawdziwą dostawę, łańcuch żywności, indywidualne szczęście, koszty, kolejkę, drogi, atrakcje, Kaplicę, Targ, latarnię, zadania, ekspedycję i bezpieczny powrót pracownika. Nie ma oczekiwania na następne dni: kolejne działania odblokowują się po ukończeniu poprzednich.

Przy piątej akcji jawna pomoc jednorazowo uzupełnia braki do 500 monet, po 500 drewna, kamienia, zboża i desek oraz 600 żywności. Przyjęcie rzeczywistego zlecenia rozbudowy Ratusza zalicza akcję, ale nie pomija normalnego dowozu i budowania. Przydzielony wcześniej tragarz nadal przewozi materiały, a koszt budynku i rezerwa żywności zachowują zwykłe zasady.

Samouczek otwiera się przy wejściu aż do ukończenia lub świadomej rezygnacji; po rezygnacji można go wznowić ręcznie z zachowaniem postępu. Każdy sukces ma fanfarę i skrzynię po 100–300 każdego z pięciu materiałów; Share przyznaje identyczną zawartość jeszcze raz, najwyżej raz dla danej akcji. Czytanie wymaga rzeczywistej wizyty w odpowiednim widoku, a stan nagród, decyzji i dawnych odebranych lekcji pozostaje zapisany.

## Ekspedycje i lojalność

Gracz wybiera labirynt z kulkami lub czarno-białe trójki przy rozpoczęciu oraz może zmienić rodzaj przed kolejną rundą; wybór jest zapisany, a wyspa działa pod zasłaniającym ją oknem bez równoczesnego zarządzania budynkami. Wygrana dodaje do puli do 50 monet, po 2/3 limitu nagroda rundy maleje o 1 za każdy pełny odcinek równy 1/12 limitu, a twardy koniec lub przegrana zabiera całą niewypłaconą pulę. Wypłacone wcześniej monety są bezpieczne; zapisane dawne serie trasowe zachowują poprzednie reguły do końca serii.

Lojalność liczy kolejne dni logowania od północy czasu polskiego, a dzień przerwy resetuje serię. Program kończy się po odebraniu dziesiątej nagrody albo po osiągnięciu Ratusza 4. Kwoty nagród nie zostały jeszcze ustalone i nie są zastępowane kwotami skrzyń samouczka.

## Wspólne widoki

- Administracja: Ratusz, Dom, Magazyn, Targ, Port, Kaplica i Latarnia. Gospodarka: Farma, Młyn, Kamieniołom, Drwale i Tartak. Zasoby, Dekoracje i Ścieżki pozostają oddzielnymi kategoriami.
- Wszystkie miniatury mają równą ramkę i proporcje. Karta ma poziom u góry; zakład pracy pokazuje „Pracuje: n” oraz osobno idących `(+n)` i odwołanych `(−n)`. Cztery budynki bez pracowników mają tylko poziom.
- Producent zachowuje Magazyn: zapas / pojemność teraz / pojemność następnego poziomu oraz Pracownicy: przypisani / wolni w domu / limit. Podpisy są krótkie i tłumaczone EN/PL, a liczby i jednostki mieszczą się w kartach.
- Karta komputerowa mieści podstawowe informacje i działania na jednym ekranie, a dodatkowe objaśnienia są zwijane. Górna krawędź prawej kolumny z rozbudową jest równa górnej krawędzi lewej kolumny ze statystykami. Producent podaje produkt, ilość i ETA najbliższej gotowej sztuki; brak wejścia lub miejsca ma powiadomienie bez powtórzeń co sekundę. Latarnia w ruinach nie powtarza bloku „Nie zbudowano”.
- „Budowa i kolejka” pozostaje w Ratuszu, a „Zarządzaj pracownikami” w Domu. Rozbudowa, Premium i osobne ETA są przy budynku; menu „Budynki” dodaje krótki opis funkcji każdego obiektu. Strzałka wraca do poprzedniego menu poza ekranem minigry. Menu wyspy pokazuje własną nazwę, jego dolne przyciski mieszczą się wewnątrz ramki, a Ustawienia nie oferują przycisku logowania.
- Wycofanie tragarzy daje wyraźny popup, a licznik od razu pokazuje oczekiwane odejście, np. `5 (−2)`. Osoba z ładunkiem kończy dostawę, potem idzie 5 minut do domu; dopiero powrót zwalnia ją do innej pracy.
- Nad producentem z aktywną karą za brak wejścia lub pełny lokalny magazyn jest smutna buźka. Znika po ustaniu kary; pusty zakład bez pracowników nie otrzymuje samego takiego oznaczenia.
- Premie/kary u góry Ratusza i w Domu zajmują po jednym wierszu z nazwą, wartością, statusem/czasem i końcowym i rozwijającym szczegóły. Wszystkie informacje o podatkach są ukryte w UI.

Koszty, łóżka i przewóz sprawdza wspólny model, również dla usług kupna; wygląd przycisku nie pomija zależności. Szczegóły: [reguły](ECONOMY-RULES.md), [58 decyzji i 19 wymagań](decisions-v9.json).

## Historyczny odbiór wersji 9

Wydanie **frontend-v13 / Excel 9** zakończyło implementację, odbiór lokalny, publikację i odbiór publiczny: **388/388 testów modelu PASS**, pięć lokalnych zestawów przeglądarkowych i trzy zestawy rzeczywistego Pages PASS. Udane [Pages 40012462614](https://github.com/ksobczak321-oss/gra/actions/runs/40012462614); publiczny Excel i 17 plików gry zwracały HTTP 200 oraz zgadzały się z lokalnymi sumami kontrolnymi. Dowody zachowuje [dziennik](IMPLEMENTATION-LOG.md); ten wpis nie opisuje odbioru v17.
