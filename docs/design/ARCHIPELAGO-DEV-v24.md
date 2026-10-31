# Archipelag DEV 0.10.0.0 — kontrakt implementacji

Stan: kod w DEV; wdrożenie GCP i reset kont nie są częścią tej zmiany. Projekt analityczny [v23](ARCHIPELAGO-AND-TRADE-v23.md) zachowuje historię decyzji. Poniższe parametry uzupełniające są **jawnymi założeniami prototypu DEV**, przedstawionymi użytkownikowi podczas oczekiwania na odpowiedzi, a nie nowymi odpowiedziami użytkownika.

## Wyspy i migracja

- Maksymalnie 20 światów: macierzysta `island-1` oraz 19 córek. Kolejne progi sprawdza tylko Ratusz matki: 10, 13, 16…64.
- Cena kolonizacji to po `500 × A × (A−1)` monet i każdego z pięciu materiałów; A=7,8,9 oraz przyjęte na DEV dalsze 10…25. Rezerwacje i chroniona żywność nie mogą finansować kolonizacji. Nie ma dopłaty kolejki budowy.
- Kolonizacja wymaga co najmniej 18 mieszkańców matki, w tym sześciu rzeczywiście w Domu. Dokładnie sześć istniejących rekordów osób teleportuje się natychmiast; nie powstają nowi ludzie i nie jest zajmowany statek.
- Ratusz i Magazyn córki jednorazowo kopiują poziomy matki; pozostałe budynki zaczynają na 1. **Założenie DEV:** bez kolejnego pakietu po 100 zasobów — nowe zasoby córki wynoszą 0, a zaopatrzenie trzeba dowieźć. To nie usuwa zasobów starszych córek.
- Matka jest chroniona przed dalszym spadkiem poniżej 12 przez odejścia i dżumę. Córka ma minimum 6. Historyczna matka z mniej niż 12 zachowuje rzeczywistych mieszkańców; migracja nikogo nie dopisuje, a nowe przesiedlenie pozostaje zablokowane.
- Córka przechowuje sufiks 2–40 znaków, matka nazwę 2–40 znaków. Pełna nazwa `<matka> - <sufiks>` może mieć 83 znaki. Zmiana nazwy matki aktualizuje prefiksy; ID, historia i osobiste stany mieszkańców pozostają.
- Zapis archipelagu v1 z `secondIsland` migruje do v2 `islands`. Zachowuje osoby, fundusze i istniejące rejsy; nie pobiera wstecz ceny i nie zabiera ponownie kolonistów. Zwykły schemat świata pozostaje 9.

## Jeden statek, dwa odrębne tryby

- Towary: 1000 sztuk, 10 minut, bez opłaty. Rozszerzenia Paynow dotyczą tylko towarów i nadal są symulacją. Zwykłe przepełnienie czeka na rozładunek, a towar pochodzący z premii zachowuje pochodzenie.
- Ludzie: 100 osób, 30 minut, bez monetowej opłaty transportowej. Wszyscy muszą rzeczywiście przebywać w Domu; powrót z pracy nie oznacza już obecności w Domu.
- Miejsce docelowe musi mieć wolne miejsca Ratusza i łóżka. Przy wysyłce rezerwujemy miejsca: przyrost ludności podczas podróży nie może ich zająć. Kolejny rejs towarowy lub pasażerski ruszy dopiero po zakończeniu bieżącego.
- **Założenie DEV dotyczące zwykłych posiłków:** na 30 minut pakowane jest `0,5 × liczba pasażerów` żywności, bez zaokrąglania kosztu do całych porcji na osobę. Wykorzystujemy zwykły kredyt posiłków i całe pobrane jednostki; niewykorzystany ułamek zostaje na źródle. To normalne wyżywienie, nie dodatkowa opłata; do posiłków można użyć rezerwy żywności. Brak wystarczającego wyżywienia blokuje nowy rejs.
- Osobiste zegary głodu, regeneracji, bezrobocia i czasowych wizyt nadal biegną podczas podróży. W rejsie nie ma pracy, przyrostu populacji ani losowania osobnej dżumy. Bonusy miejscowe wyspy nie są przenoszone jako nowa premia pasażera.
- Lądowanie następuje dokładnie po 30 minutach, następny okres nieobecności jest symulowany już w celu. Zachowujemy `personUid`, a lokalny numer mieszkańca otrzymuje wolną wartość u celu. Ponowny rozładunek nie dodaje osób drugi raz.
- Nie wolno odtworzyć świata od zera podczas rejsu. Zwykłe wdrożenie nie odtwarza żadnego konta.

## Handel

NPC w Porcie od Ratusza 4 i barter na Rynku od 2 pozostają dostępne również po 6. Od 6 równolegle działa sprzedaż materiałów innym graczom za monety. Maksymalna cena to `floor(ilość × bazowa cena NPC / 100)`: 50 monet/100 drewna, kamienia i zboża; 150/100 desek i żywności. Żądana cena jest dodatnią całkowitą liczbą monet, więc ilość z pułapem poniżej 1 monety nie tworzy poprawnej oferty. Tania odsprzedaż jest dozwolona, nie dodajemy prowizji.

Nowe kontrakty mają wersję 2. Historyczne oferty v1 pozostają literalnym barterem i mogą zostać przyjęte lub zwrócone według zapisanej treści. Nie interpretujemy ich żądanego materiału jako monet. Towar jest w escrow, a zapłata i dostawa obu kont przechodzą atomowo tylko raz. Własna inna wyspa nie jest drugim nabywcą. Cały przychód handlowy jest niekwalifikowany dla dobroczynności.

## Przechowywanie i granice uruchomienia

API i klient prywatnego Firestore udostępniają jeden spójny snapshot oraz wspólną rewizję CAS, ale format magazynowy 2 przechowuje matkę i metadane w korzeniu `islands/<uid>`, a córki w `islands/<uid>/worlds/<islandId>`. Każdy dokument payloadu ma limit 700 000 bajtów, całość limit 14 000 000; nie próbujemy zmieścić 20 pełnych wysp w pojedynczym dokumencie Firestore.

Zmiana korzenia i brudnych córek jest atomowa; niezmienione córki nie są ponownie zapisywane w autosave. Odczyt musi potwierdzić wszystkie wskazane córki i zgodność generacji. Brak córki jest błędem, a nie powodem do założenia nowej wyspy. Retencja serwera usuwa również znane dokumenty córek.

Nowe reguły prywatnego Firestore są przygotowane w repozytorium i **nie zostały zastosowane w GCP**. Przyszła promocja PRE-PROD wymaga migracji reguł oraz sprawdzenia rzeczywistego API/konfiguracji; bieżący GCP pozostaje przy poprzedniej wersji. Gospodarka wyspy pozostaje obliczana w kliencie; atomowy escrow i ewidencja monet nie są potwierdzeniem autorytatywnej symulacji całej gry.
