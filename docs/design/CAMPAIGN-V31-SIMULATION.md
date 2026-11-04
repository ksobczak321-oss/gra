# Kampania v31 — częściowa obserwacja bezpłatnego gracza

**Zaobserwowano 35 z planowanych 50 pełnych dób. Nie jest to zakończony test 50-dniowy.** Proces nadal pracuje; ten raport zachowuje tylko dotychczasowe fakty. Ratusz 20: jeszcze nie zaobserwowano. Ukończenie rozdziału 20: jeszcze nie zaobserwowano.

To normalny nowy świat gry 0.14.0.0, obsługiwany rzeczywistymi poleceniami modelu. Nie dodano testowych monet, mieszkańców, poziomów ani flag zaliczenia. Plan nie korzysta z prawdziwych płatności, reklam, prezentów innych graczy, kodów promocyjnych ani nieograniczonego farmienia opcjonalnych minigier.

## Założenia i granice

Start: 4 listopada 2026, 08:00 czasu Warszawy. Każdego dnia są trzy jednogodzinne okna sterowania: 08:00–09:00, 14:00–15:00 i 20:00–21:00. Między nimi model rozlicza upływ czasu i kolejne wejścia. **Nie twierdzimy, że wykonano 150 godzin aktywności ani że zakończono wszystkie 50 dni.** Okna wyznaczają budżet obsługi; odcinki oczekiwania nie są dowodem tylu godzin unikalnej treści ani dobrej zabawy.

Samouczek wykonuje normalne przydziały pracowników, budowy, transport, skracanie za rzeczywiście posiadane monety i wypłatę rozegranej rundy. Później plan utrzymuje fizyczny łańcuch jedzenia i materiałów, zapewnia Dom, Magazyn i producentów oraz przechodzi kolejne cele. Realne nadwyżki sprzedaje NPC; zakupy fabularne wymagają pracowników Portu i rzeczywistego przewozu. Nie ma fikcyjnego kontrahenta PvP. Z usług za monety korzysta wyłącznie tam, gdzie uczy ich samouczek. Brakujący mieszkańcy mogą dołączyć przez dostępne w misji kontrakty ratunkowe: plan uruchamia prawdziwą przygodę, rozwiązuje jej pokoje i zatwierdza nagrodę. Nie podmienia liczby mieszkańców.

Zagadki rozwiązuje deterministyczny solver ze znajomością wygenerowanej planszy. Wysyła legalne ruchy; fizyczna kulka faktycznie przechodzi labirynt. Nie ustawia `solved`, wyników ani nagród. Na pojedynczą zagadkę przewidziano co najmniej 5 aktywnych minut, na połączoną opowieść 15; brakujący czas jest odliczany przed ostatnim zatwierdzeniem nagrody. To założenie planera, nie pomiar zachowania ludzi ani potwierdzenie, że początkujący rozwiąże ją w tym czasie.

## Obserwacje bieżącego przebiegu

Poniższe wiersze pochodzą z prawdziwego dziennego wyjścia procesu. Pokazują stan na koniec pełnej doby od startu; nie są interpolacją ani dokładnymi chwilami awansu. Bieżący proces zachowuje szczegółowe liczniki poleceń i dzienne stany zapasów w pamięci do zakończenia. W tej częściowej publikacji nie odtwarzamy tych brakujących danych z założeń. Nie znamy końcowego licznika błędnych poleceń bieżącego procesu; nie twierdzimy, że wynosi zero.

| Doba od startu | Ratusz | Mieszkańcy | Monety (część całkowita) | Bieżący etap |
|---:|---:|---:|---:|---|
| 1 | 4 | 95 | 1097 | 3: 8/8 |
| 2 | 5 | 120 | 3043 | Brak aktywnego etapu |
| 3 | 6 | 144 | 2254 | Brak aktywnego etapu |
| 4 | 7 | 168 | 4181 | Brak aktywnego etapu |
| 5 | 8 | 184 | 5224 | 8: 1/8 |
| 6 | 8 | 192 | 7448 | Brak aktywnego etapu |
| 7 | 9 | 216 | 9413 | 9: 8/8 |
| 8 | 9 | 216 | 12314 | Brak aktywnego etapu |
| 9 | 10 | 240 | 10621 | 10: 8/8 |
| 10 | 11 | 254 | 10974 | 11: 1/8 |
| 11 | 11 | 264 | 16659 | Brak aktywnego etapu |
| 12 | 11 | 264 | 18875 | Brak aktywnego etapu |
| 13 | 12 | 281 | 20593 | 12: 1/8 |
| 14 | 12 | 288 | 25260 | Brak aktywnego etapu |
| 15 | 13 | 295 | 21643 | 13: 1/8 |
| 16 | 13 | 312 | 21340 | 13: 8/8 |
| 17 | 13 | 312 | 30641 | Brak aktywnego etapu |
| 18 | 14 | 322 | 32665 | 14: 1/8 |
| 19 | 14 | 336 | 36845 | 14: 8/8 |
| 20 | 15 | 336 | 33369 | 15: 1/8 |
| 21 | 15 | 360 | 40643 | Brak aktywnego etapu |
| 22 | 15 | 360 | 43471 | Brak aktywnego etapu |
| 23 | 15 | 360 | 53296 | Brak aktywnego etapu |
| 24 | 16 | 371 | 55638 | 16: 1/8 |
| 25 | 16 | 384 | 54496 | 16: 8/8 |
| 26 | 17 | 408 | 56707 | 17: 1/8 |
| 27 | 17 | 408 | 57257 | Brak aktywnego etapu |
| 28 | 17 | 408 | 68405 | Brak aktywnego etapu |
| 29 | 17 | 408 | 79540 | Brak aktywnego etapu |
| 30 | 18 | 416 | 82174 | 18: 1/8 |
| 31 | 18 | 432 | 82434 | Brak aktywnego etapu |
| 32 | 19 | 439 | 85234 | 19: 1/8 |
| 33 | 19 | 456 | 94492 | Brak aktywnego etapu |
| 34 | 19 | 456 | 97931 | Brak aktywnego etapu |
| 35 | 19 | 456 | 110383 | Brak aktywnego etapu |

Ukończenie rozdziału 20 uznajemy z wyjścia częściowego dopiero, gdy wcześniej widoczny jest cel rozdziału 20, a następny wiersz przy Ratuszu 20 nie ma już aktywnego etapu. Model odblokowuje najwcześniejszy nieukończony rozdział, więc aktywny rozdział 20 oznacza już ukończone rozdziały 2–19. Ukończenie rozdziału dodaje go do `completedLevels` i czyści ramkę. Jest to wniosek z rzeczywistego śladu i kodu, odróżniony od odczytu pełnego pola `completedLevels`, dostępnego dopiero w końcowym JSON.

## Zachowane dowody

[Pełny zapis częściowego odbioru](CAMPAIGN-V31-SIMULATION.json) zawiera powyższe wiersze, surowy ślad procesu oraz **oddzielny wcześniejszy, zakończony przebieg trzech dób**. Ten wcześniejszy wariant osiągnął Ratusz 6 i 144 mieszkańców po 9 godzinach okien obsługi, bez błędnych poleceń i bez edycji zasobów. Jego metryk nie mieszamy z bieżącym procesem: kolejność i rozliczanie czasu zagadek później doprecyzowano.

Trzy krótkie testy planera sprawdzają granicę 150 sesji w 50 dobach, zwykły start i odmowę zewnętrznych skrótów oraz realne pierwsze polecenia. Oddzielny test 19 rozdziałów z jawnym testowym finansowaniem potwierdza wykonanie scenariuszy, ale nie dowodzi ich bezpłatnego bilansu. Żaden z tych odbiorów nie zastępuje bieżącego długiego przebiegu.

## Pochodzenie i odtworzenie

Proces uruchomiono przed późniejszymi, równoważnymi optymalizacjami dróg, nadchodzącego ładunku i kalendarza. Ich zgodność sprawdzono oddzielnie. Późniejsze poprawki ponownego wiązania rozpoczętej przygody z nową pomocą, limitu 32 odłożonych przygód i zamykania okna nie występują na tej ścieżce: plan kończy rozpoczętą opowieść, zanim poprosi o następny kontrakt. Parametry nagród i rekrutacji nie zostały w tym czasie zmienione. Raport nie twierdzi, że bieżący proces załadował późniejsze bajty kodu z dysku.

Proces był wstrzymany sygnałem SIGSTOP na czas oddzielnej pełnej regresji i wznowiony bez zmiany czasu świata. Czas wykonania na VM obejmuje takie przerwy; nie jest czasem gry, czystym pomiarem CPU ani dowodem wydajności telefonu. W śladzie występuje także odrzucona przez środowisko próba otwarcia lokalnego inspektora; to diagnostyka narzędzia, nie błąd gry ani użycie edytora stanu.

Nie logowano prawdziwych kont i nie wysyłano nic do GCP. Ten odbiór nie sprawdza przeglądarki, zapisu chmurowego, rzeczywistego Auth, starej przyjętej misji, zamykania okien ani pauzy zagadek. Ponowne wejścia są poleceniami modelu. Liga, PvP, Pomagam, kolejne wyspy i płatna dekoracja nie są obowiązkowym warunkiem tej głównej ścieżki.

```sh
node scripts/simulate-campaign-v31.mjs --days 50 > /tmp/campaign-v31.json
node --test --test-concurrency=1 --test-isolation=none tests/harborlight-campaign-planner-v31.test.mjs
```
