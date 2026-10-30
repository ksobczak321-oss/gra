import { COPY_TRANSLATIONS } from './harborlight-v1-copy.js?v=frontend-v18';

/** English is the source language. Polish strings are presentation only: saves,
 * identifiers, action payloads and user-entered values are never translated. */
export const SUPPORTED_LANGUAGES = Object.freeze(['en', 'pl']);
export const locale = language => language === 'pl' ? 'pl-PL' : 'en-US';
export const formatNumber = (value, language = 'en', options = {}) => new Intl.NumberFormat(locale(language), options).format(Number.isFinite(Number(value)) ? Number(value) : 0);
export function formatDuration(seconds, language = 'en') {
  if (!Number.isFinite(seconds)) return language === 'pl' ? 'Oczekiwanie na tragarzy' : 'Waiting for carriers';
  const value = Math.max(0, Math.ceil(seconds)), hours = Math.floor(value / 3600), minutes = Math.floor(value % 3600 / 60), remainder = value % 60;
  const words = language === 'pl' ? ['godz.', 'min', 's'] : ['h', 'min', 's'];
  return [hours ? `${formatNumber(hours, language)} ${words[0]}` : '', minutes ? `${minutes} ${words[1]}` : '', `${remainder} ${words[2]}`].filter(Boolean).join(' ');
}
export const formatDateTime = (value, language = 'en', options = {}) => new Intl.DateTimeFormat(locale(language), { dateStyle: 'short', timeStyle: 'short', ...options }).format(new Date(value));
const translations = new Map();
export function registerTranslations(catalog = {}) {
  for (const [source, translated] of Object.entries(catalog)) if (typeof translated === 'string') translations.set(source, translated);
}
registerTranslations(COPY_TRANSLATIONS);
function entries(source) { for (const line of source.trim().split('\n')) { const divider = line.indexOf('|'); if (divider > 0) translations.set(line.slice(0, divider), line.slice(divider + 1)); } }
entries(`
Coins|Monety
Wood|Drewno
Stone|Kamień
Food|Żywność
Planks|Deski
Grain|Zboże
Construction|Budowa
Town Hall|Ratusz
House|Dom
Farm|Gospodarstwo
Windmill|Młyn
Lumber Camp|Drwale
Sawmill|Tartak
Quarry|Kamieniołom
Warehouse|Magazyn
Market|Targ
Harbor|Port
Chapel|Kaplica
Lighthouse|Latarnia morska
Misty Isles|Mgliste Wyspy
Forgotten Quarry|Zapomniany Kamieniołom
Watchtower Ruins|Ruiny Strażnicy
Your island|Twoja wyspa
YOUR ISLAND|TWOJA WYSPA
Island|Wyspa
Island menu|Menu wyspy
Open island menu|Otwórz menu wyspy
Game menu|Menu gry
Island map|Mapa wyspy
Map|Mapa
Tasks|Zadania
Current tasks|Bieżące zadania
Current Lighthouse tasks and expeditions|Bieżące zadania latarni i ekspedycje
Open Lighthouse tasks|Otwórz zadania latarni
Open all Lighthouse tasks|Otwórz wszystkie zadania latarni
Expeditions|Ekspedycje
Residents|Mieszkańcy
Residents and worker assignments|Mieszkańcy i przydział pracowników
Settings|Ustawienia
Notifications|Powiadomienia
Buildings|Budynki
Resources|Zasoby
Production and resources|Produkcja i zasoby
Decorations|Dekoracje
Paths|Ścieżki
Paths and bridges|Ścieżki i mosty
Island navigation|Nawigacja wyspy
Resource production buildings|Budynki produkujące zasoby
Island attractions and paths|Atrakcje i ścieżki na wyspie
Island level, happiness and resources|Poziom wyspy, szczęście i zasoby
Island status|Stan wyspy
HARBORLIGHT — island overview|HARBORLIGHT — przegląd wyspy
HARBORLIGHT · ISLAND 01|HARBORLIGHT · WYSPA 01
Sign in or create an account|Zaloguj się lub załóż konto
Close window|Zamknij okno
Close|Zamknij
Cancel|Anuluj
Confirm|Potwierdź
Continue|Kontynuuj
Back|Wróć
Next|Dalej
Previous|Poprzednie
Save|Zapisz
Read|Przeczytane
New|Nowe
All|Wszystkie
None|Brak
Explore|Wyrusz
Skip|Pomiń
Level|Poziom
Happiness|Szczęście
Happiness and population growth|Szczęście i wzrost populacji
Island level — Town Hall|Poziom wyspy — ratusz
Island day and time|Dzień i godzina na wyspie
Island day|Dzień na wyspie
Island time|Czas na wyspie
Workers|Pracownicy
Workforce|Siła robocza
Working|Pracujący
Working residents|Pracujący mieszkańcy
Active workers|Aktywni pracownicy
Currently working|Obecnie pracujący
Assigned|Przydzieleni
Free at home|Wolni w domu
Free at Home|Wolni w domu
Max workers|Limit pracowników
Available|Dostępni
Available at home|Dostępni w domu
At home|W domu
Home|Dom
Returning home|Powrót do domu
New resident|Nowy mieszkaniec
Next resident|Kolejny mieszkaniec
Population change|Zmiana populacji
Population growth|Wzrost populacji
Population|Populacja
Population limit|Limit populacji
At population limit · 0/h|Osiągnięto limit populacji · 0/godz.
Minimum population · 0/h|Minimalna populacja · 0/godz.
Stable · 0 residents/h|Bez zmian · 0 mieszkańców/godz.
Points|Punkty
Ranking|Ranking
Hourly score|Wynik godzinowy
Town Hall level|Poziom ratusza
Town Hall capacity|Limit ratusza
Housing|Miejsca mieszkalne
Housing capacity|Liczba miejsc mieszkalnych
Housing available|Są wolne miejsca mieszkalne
Beds available|Dostępne łóżka
Unhoused|Bez miejsca w domu
Happiness impact|Wpływ na szczęście
Overcrowded|Przeludnienie
Workplace limit|Limit pracowników budynku
Storage|Magazyn
Storage full|Pełny magazyn
Storage used|Zajęte miejsce
Local stock|Zapas przy budynku
Central stock|Zapas centralny
Central warehouse|Magazyn centralny
Local / Central|Lokalnie / Centralnie
LOCAL / CENTRAL|LOKALNIE / CENTRALNIE
In transit|W transporcie
Cargo in transit|Ładunek w transporcie
Total capacity|Łączna pojemność
Capacity per resource|Pojemność na zasób
Transport capacity|Zdolność transportowa
In stock|W magazynie
Current cap.|Obecna pojemność
Next level cap.|Pojemność po ulepszeniu
In stock / current capacity / capacity after the next upgrade|Zapas / obecna pojemność / pojemność po kolejnym ulepszeniu
Producer local stock / central warehouse stock|Zapas przy budynku / zapas w magazynie centralnym
Assigned workers / free residents at Home / building worker limit|Przydzieleni pracownicy / wolni mieszkańcy w domu / limit pracowników budynku
Residents currently producing at this building|Mieszkańcy obecnie produkujący w tym budynku
Not built|Nie zbudowano
Build this site to begin.|Zbuduj ten budynek, aby rozpocząć.
Producing|Produkcja w toku
Delivering|Transport w toku
Waiting|Oczekiwanie
Waiting for workers|Oczekiwanie na pracowników
Waiting for carriers|Oczekiwanie na tragarzy
Waiting for resources|Oczekiwanie na surowce
Waiting for goods|Oczekiwanie na towary
Waiting for a delivery|Oczekiwanie na zlecenie transportu
No workers assigned|Nie przydzielono pracowników
Waiting deliveries|Oczekujące dostawy
Waiting for carriers to collect local goods.|Oczekiwanie na odbiór towarów przez tragarzy.
Assign a free resident from Home to start production.|Przydziel wolnego mieszkańca z domu, aby rozpocząć produkcję.
Assign free residents from Home.|Przydziel wolnych mieszkańców z domu.
Carriers are waiting for space or a delivery order.|Tragarze czekają na wolne miejsce lub zlecenie dostawy.
Ready for the next available job|Gotowy na kolejne dostępne zlecenie
Walking to Warehouse|W drodze do magazynu
Arrives in|Przybycie za
Delivery ends in|Zakończenie dostawy za
Next delivery|Następna dostawa
Delivery|Dostawa
Building|Budowa
Queued|W kolejce
Completed|Ukończono
Complete|Ukończone
Unavailable|Niedostępne
Locked|Zablokowane
Ruins|Ruiny
Maximum level|Maksymalny poziom
Fully upgraded|Rozbudowano do końca
Upgrade|Ulepsz
Build|Buduj
Building upgrade|Rozbudowa budynku
Details and upgrades|Szczegóły i rozbudowa
Workers and details|Pracownicy i szczegóły
View building|Zobacz budynek
Manage all workers|Zarządzaj pracownikami
Open House|Otwórz dom
Upgrade House|Ulepsz dom
Upgrade Town Hall|Ulepsz ratusz
Upgrade Town Hall first|Najpierw ulepsz ratusz
Construction and queue|Budowa i kolejka
Construction site|Plac budowy
View construction package|Zobacz pakiet budowlany
Available resources compared with upgrade costs|Dostępne zasoby i koszt rozbudowy
Upgrade information|Informacje o rozbudowie
Production information|Informacje o produkcji
All required resources are available.|Wszystkie potrzebne zasoby są dostępne.
Collect the full cost in the central warehouse to start this upgrade.|Zgromadź pełny koszt w magazynie centralnym, aby rozpocząć rozbudowę.
No upgrades planned. Select a building on the island.|Nie zaplanowano rozbudowy. Wybierz budynek na wyspie.
Plan waiting for production and transport.|Plan czeka na produkcję i transport.
Materials reserved, including the 10% queue surcharge. Waiting for a construction slot.|Materiały zarezerwowano wraz z dopłatą 10% za kolejkę. Oczekiwanie na wolne miejsce budowy.
Waiting for an available construction slot and carriers.|Oczekiwanie na wolne miejsce budowy i tragarzy.
Estimated remaining transport time and subsequent building phase.|Szacowany pozostały czas transportu oraz następującej po nim budowy.
Estimated transport + building|Szacowany transport + budowa
Estimated delivery and building time|Szacowany czas dostawy i budowy
Estimated delivery and building time|Szacowany czas dostawy i budowy
Estimate unavailable|Szacunek niedostępny
Assign warehouse carriers to calculate the time.|Przydziel tragarzy w magazynie, aby obliczyć czas.
Assign warehouse carriers to estimate delivery and building time.|Przydziel tragarzy w magazynie, aby oszacować czas dostawy i budowy.
Assign warehouse|Przydziel do magazynu
warehouse carriers|tragarze magazynu
Warehouse and carriers|Magazyn i tragarze
Warehouse and transport|Magazyn i transport
Warehouse workers|Pracownicy magazynu
Warehouse workers and current deliveries|Pracownicy magazynu i bieżące dostawy
No warehouse workers assigned. Use + to send a free resident from Home.|Nie przydzielono pracowników magazynu. Użyj +, aby wysłać wolnego mieszkańca z domu.
Transport priority|Priorytety transportu
No priorities selected · available goods are collected normally.|Nie wybrano priorytetów · dostępne towary są odbierane normalnie.
Product:|Produkt:
Potential output|Możliwa produkcja
Production and transport|Produkcja i transport
Assign workers to start production.|Przydziel pracowników, aby rozpocząć produkcję.
Local storage is full. Production is waiting for carriers to collect the goods.|Magazyn przy budynku jest pełny. Produkcja czeka na odbiór towarów przez tragarzy.
Finished goods wait at the building until warehouse workers deliver them to central storage.|Gotowe towary czekają przy budynku, aż pracownicy magazynu przewiozą je do magazynu centralnego.
How the warehouse works|Jak działa magazyn
Food and residents|Żywność i mieszkańcy
Food demand|Zapotrzebowanie na żywność
Status|Stan
Shortage penalty|Kara za brak żywności
Work efficiency|Wydajność pracy
Food consumption|Zużycie żywności
Feeding|Wyżywienie zapewnione
Fed|Najedzony
Hungry|Głodny
Work and return rules|Zasady pracy i powrotu
Happiness — population average|Szczęście — średnia populacji
Town Hall and housing|Ratusz i miejsca mieszkalne
Change of 1 resident|Zmiana o 1 mieszkańca
Individual happiness rules|Indywidualne zasady szczęścia
Hourly changes before housing, storage and temporary bonuses|Zmiany godzinowe przed wpływem mieszkań, magazynów i premii czasowych
Resident state|Stan mieszkańca
Change|Zmiana
Individual residents (|Poszczególni mieszkańcy (
Individual resident happiness|Indywidualne szczęście mieszkańców
Fed and employed|Najedzony i pracujący
Fed, unemployed for up to 12 h|Najedzony, bez pracy do 12 godz.
Fed, unemployed for more than 12 h|Najedzony, bez pracy ponad 12 godz.
Hungry for up to 12 h, employed|Głodny do 12 godz., pracujący
Hungry for more than 12 h, employed|Głodny ponad 12 godz., pracujący
Hungry and unemployed, both for more than 12 h|Głodny i bez pracy przez ponad 12 godz.
Attractions|Atrakcje
Attraction|Atrakcja
Attractions and events|Atrakcje i wydarzenia
View daily attractions|Zobacz dzisiejsze atrakcje
View path upgrades|Zobacz ulepszenia ścieżek
Completed path level|Ukończony poziom ścieżek
Carrier speed bonus|Premia do szybkości tragarzy
Carrier load bonus|Premia do ładowności tragarzy
Flower beds|Rabaty kwiatowe
Village benches|Ławki wiejskie
Lantern strings|Girlandy lampionów
Harbor flags|Flagi portowe
Village fountain|Fontanna wiejska
Garden pond|Oczko wodne
Wooden sculptures|Drewniane rzeźby
Seaside mural|Nadmorski mural
Lighthouse garden|Ogród latarni
Ornamental sails|Ozdobne żagle
Travelling circus|Wędrowny cyrk
Theatre troupe|Trupa teatralna
Folk concert|Koncert folkowy
Puppet show|Teatr lalek
Harvest festival|Dożynki
Fishing contest|Zawody wędkarskie
Storytelling evening|Wieczór opowieści
Village dance|Wiejska potańcówka
Fireworks night|Noc fajerwerków
Harbor fair|Jarmark portowy
New daily attractions|Nowe atrakcje dnia
This attraction only|Tylko ta atrakcja
Completed path network|Ukończona sieć ścieżek
Warehouse, Market and Harbor carriers|Tragarze magazynu, targu i portu
Permanent benefit from the completed network level|Stała premia za ukończony poziom sieci
All 100 paths are already at level 5.|Wszystkie 100 odcinków ścieżek ma już poziom 5.
Choose a path level from 1 to 5.|Wybierz poziom ścieżek od 1 do 5.
This path level is already complete.|Ten poziom ścieżek jest już ukończony.
Upgrading one path section costs 100 stone from the central Warehouse.|Ulepszenie jednego odcinka ścieżki kosztuje 100 kamienia z magazynu centralnego.
Upgrade one section instantly for 100 Stone from central storage.|Natychmiast ulepsz jeden odcinek za 100 kamienia z magazynu centralnego.
All 100 sections completed.|Ukończono wszystkie 100 odcinków.
100 Stone|100 kamienia
Active bonuses and penalties|Aktywne premie i kary
Bonuses and penalties|Premie i kary
Bonuses|Premie
Penalties|Kary
Bonus|Premia
Penalty|Kara
Ongoing|Trwały efekt
Ended|Zakończono
Updated|Zaktualizowano
No active bonuses or penalties.|Brak aktywnych premii i kar.
Until the timer ends|Do końca odliczania
Chapel blessing|Błogosławieństwo kaplicy
Chapel upgrade bonus|Premia za rozbudowę kaplicy
Lighthouse upgrade bonus|Premia za rozbudowę latarni
Lighthouse visitors returned|Powrót zwiedzających latarnię
Lighthouse visit reward|Nagroda za zwiedzanie latarni
New resident settling in|Nowy mieszkaniec się aklimatyzuje
Regular meals|Regularne posiłki
Food shortage|Brak żywności
Hunger penalty|Kara za głód
Unemployment penalty|Kara za bezrobocie
Not enough beds|Za mało łóżek
Happiness set to 100%|Szczęście ustawione na 100%
Happiness stays at 0%|Szczęście pozostaje na 0%
Happiness set to 100% · material production ×2|Szczęście ustawione na 100% · produkcja materiałów ×2
Production and carrying speed ×0.5|Produkcja i szybkość transportu ×0,5
While Food is available in central storage|Gdy żywność jest dostępna w magazynie centralnym
While these residents are actively working|Gdy ci mieszkańcy faktycznie pracują
Until Food is available in central storage|Do pojawienia się żywności w magazynie centralnym
Until these residents receive Food|Do otrzymania żywności przez tych mieszkańców
Until these residents arrive at work|Do przybycia tych mieszkańców do pracy
Until the House has enough beds for everyone|Do zapewnienia w domu łóżek dla wszystkich
Until production can resume or the worker is released|Do wznowienia produkcji lub zwolnienia pracownika
No further happiness bonus; purchase unavailable|Brak dalszej premii do szczęścia; zakup niedostępny
Construction package|Pakiet budowlany
+4 active builds · unlimited queue · delivery planning|+4 równoczesne budowy · nieograniczona kolejka · planowanie dostaw
Island construction|Budowy na wyspie
Chapel and blessings|Kaplica i błogosławieństwa
Blessing|Błogosławieństwo
Blessing active|Błogosławieństwo aktywne
Upgrade bonus active|Premia za rozbudowę aktywna
Ready for a blessing|Gotowa na błogosławieństwo
No active upgrade bonus.|Brak aktywnej premii za rozbudowę.
Activate free blessing|Użyj darmowego błogosławieństwa
Lighthouse visits|Zwiedzanie latarni
Restore the Lighthouse to welcome visitors.|Odbuduj latarnię, aby przyjmować zwiedzających.
Places occupied|Zajęte miejsca
Send selected residents|Wyślij wybranych mieszkańców
Visiting the Lighthouse|Zwiedza latarnię
Visit in progress|Zwiedzanie trwa
Welcoming visitors|Przyjmuje zwiedzających
Ready for visitors|Gotowa na zwiedzających
Managing the island|Zarządza wyspą
Main objective|Główny cel
Restore the Lighthouse|Odbuduj latarnię
Main objective — rebuild the lighthouse|Główny cel — odbuduj latarnię
Build the lighthouse|Zbuduj latarnię
Lighthouse wood requirements|Drewno potrzebne do latarni
Lighthouse stone requirements|Kamień potrzebny do latarni
Lighthouse — construction and upgrades|Latarnia — budowa i rozbudowa
Lighthouse — visits and upgrades|Latarnia — zwiedzanie i rozbudowa
The Lighthouse shines again. Upgrade it to activate another bonus.|Latarnia znów świeci. Ulepsz ją, aby uruchomić kolejną premię.
Harbor trade|Handel w porcie
Trade|Handel
Trade at the harbor|Handluj w porcie
Open Harbor orders|Otwórz zlecenia portowe
Harbor stock|Zapas w porcie
Carriers|Tragarze
Open Market — goods for goods|Otwórz targ — towar za towar
Market — barter goods|Targ — wymiana towarów
Market — barter without coins|Targ — wymiana bez monet
Available at Market|Dostępne na targu
Locked for one hour|Zablokowane na godzinę
Bring 10 to Market|Przynieś 10 na targ
Return goods to Warehouse|Odnieś towary do magazynu
Goods offered|Oferowany towar
Goods received|Otrzymywany towar
Quantity to exchange|Ilość do wymiany
Delivery to Market|Dostawa na targ
Exchange goods|Wymień towary
Exchange — 10% fee|Wymiana — prowizja 10%
No locked goods|Brak zablokowanych towarów
Shipping orders|Zlecenia portowe
No active shipping orders.|Brak aktywnych zleceń portowych.
The Harbor unlocks at Town Hall level 4.|Port jest dostępny od 4. poziomu ratusza.
The Market unlocks at Town Hall level 2.|Targ jest dostępny od 2. poziomu ratusza.
Mark all as read|Oznacz wszystkie jako przeczytane
No notifications. Bonuses, penalties and storage alerts will appear here.|Brak powiadomień. Tutaj pojawią się informacje o premiach, karach i magazynach.
Notification filters|Filtry powiadomień
Notification categories|Kategorie powiadomień
Show notifications|Wyświetlaj powiadomienia
Storage alerts|Powiadomienia o magazynach
Economy|Gospodarka
Population and happiness|Populacja i szczęście
Construction and transport|Budowa i transport
Tutorial|Samouczek
Tutorial tasks|Zadania samouczka
Daily tutorial|Samouczek na dziś
Open tutorial|Otwórz samouczek
Today's tasks|Dzisiejsze zadania
Today's tutorial|Dzisiejszy samouczek
Active day|Aktywny dzień
Day complete|Dzień ukończony
Tutorial complete|Samouczek ukończony
Claim reward|Odbierz nagrodę
Reward|Nagroda
Rewards|Nagrody
Progress|Postęp
Next active day|Kolejny aktywny dzień
Come back tomorrow|Wróć jutro
Donation|Darowizna
Donations|Darowizny
Donate|Przekaż
Donated|Przekazano
Deposit|Przekaż
Deposits|Darowizny
Deposited|Przekazano
Start task|Rozpocznij zadanie
Start this task|Rozpocznij to zadanie
View task|Zobacz zadanie
Active · deliver goods|Aktywne · przekaż towary
Task confirmation|Potwierdzenie zadania
Confirm task|Potwierdź zadanie
Confirm acceptance|Potwierdź przyjęcie
Accept task|Przyjmij zadanie
Confirmation expires in|Potwierdzenie wygasa za
Only one task can be active.|Tylko jedno zadanie może być aktywne.
Finish the active task before starting another one.|Ukończ aktywne zadanie przed rozpoczęciem kolejnego.
Start this task to begin contributing goods. Only one task can be active.|Rozpocznij to zadanie, aby przekazywać towary. Tylko jedno zadanie może być aktywne.
Current pot|Obecna pula
Unclaimed pot|Nieodebrana pula
Potential reward|Potencjalna nagroda
Actual potential reward|Aktualna możliwa nagroda
Next win|Kolejne zwycięstwo
Resume expedition|Wznów ekspedycję
Start expedition|Rozpocznij ekspedycję
Expedition list|Lista ekspedycji
Expedition board|Plansza ekspedycji
No active attempt|Brak aktywnej próby
Attempt ended|Próba zakończona
Choose to cash out or continue.|Wybierz wypłatę lub dalszą grę.
Choose an adjacent tile to move.|Wybierz sąsiednie pole, aby się poruszyć.
This expedition attempt has ended.|Ta próba ekspedycji została zakończona.
Find the key to open the gate.|Znajdź klucz, aby otworzyć bramę.
You do not have the required tool. Find another route.|Nie masz potrzebnego narzędzia. Znajdź inną drogę.
Key found.|Znaleziono klucz.
Supply marker reached. Expedition rewards remain coin-only.|Dotarto do punktu zaopatrzenia. Ekspedycje nadal nagradzają wyłącznie monetami.
Camp|Obóz
Path|Ścieżka
Water — bridge|Woda — most
Tree — axe|Drzewo — siekiera
Rock — dynamite|Skała — dynamit
Supply marker|Punkt zaopatrzenia
Goal|Cel
Key|Klucz
Gate|Brama
Your position|Twoja pozycja
Leave attempt — lose the pot|Opuść próbę — utracisz pulę
Return to island|Wróć na wyspę
Exit challenge?|Opuścić wyzwanie?
Leave expedition?|Opuścić ekspedycję?
Leaving this round loses the entire unclaimed pot.|Opuszczenie tej rundy oznacza utratę całej nieodebranej puli.
Stay in challenge|Zostań w wyzwaniu
Leave and lose pot|Opuść i strać pulę
Cash out and leave|Wypłać i wyjdź
Cash out|Wypłać
Continue challenge|Kontynuuj wyzwanie
Keep playing|Graj dalej
Are you still there?|Nadal tu jesteś?
I'm here|Jestem tutaj
Confirm presence|Potwierdź obecność
Presence confirmation|Potwierdzenie obecności
Inactivity warning|Ostrzeżenie o bezczynności
Overtime|Dodatkowy czas
Overtime penalty|Kara za dodatkowy czas
Time limit|Limit czasu
Move limit|Limit ruchów
Moves|Ruchy
No active shipping orders.|Brak aktywnych zleceń portowych.
The last expedition was lost. Its unclaimed pot was cleared.|Poprzednia ekspedycja zakończyła się porażką. Nieodebrana pula przepadła.
Time expired. The unclaimed pot was lost.|Czas minął. Nieodebrana pula przepadła.
Premium|Premium
Premium options|Opcje premium
Premium building options|Opcje premium budynku
Premium building actions|Działania premium dla budynku
Instant transport|Transport natychmiastowy
Deliver local stock now|Dostarcz zapas lokalny teraz
Deliver building materials now|Dostarcz materiały budowlane teraz
Bring goods to Market now|Przenieś towary na targ teraz
Return Market goods now|Odnieś towary z targu teraz
Deliver to Harbor now|Dostarcz do portu teraz
Load ship now|Załaduj statek teraz
Unload ship now|Rozładuj statek teraz
Bring Harbor goods home now|Przenieś towary z portu do magazynu teraz
Buy building package|Kup pakiet budynku
Finish construction now|Ukończ budowę teraz
Schedule expected deliveries|Zaplanuj przyszłe dostawy
Building options|Opcje budynku
Extend package by 24 h|Przedłuż pakiet o 24 godz.
Activate package for 24 h|Aktywuj pakiet na 24 godz.
Community rewards|Nagrody społecznościowe
Delivered materials compared with required materials|Dostarczone materiały i wymagane ilości
Active|Aktywne
Not active|Nieaktywne
Treasury|Skarbiec
Save now|Zapisz teraz
Progress saved.|Postęp zapisany.
Start a new island|Rozpocznij nową wyspę
New island|Nowa wyspa
Yes, start over|Tak, zacznij od nowa
Keep my island|Zachowaj moją wyspę
Your new island is ready.|Twoja nowa wyspa jest gotowa.
Loyalty — consecutive days|Lojalność — kolejne dni
Animations and highlights|Animacje i podświetlenia
Language|Język
English|Angielski
Polish|Polski
Display language|Język interfejsu
Share your achievement|Podziel się osiągnięciem
Share on Facebook · +500 coins|Udostępnij na Facebooku · +500 monet
Celebrate your progress and collect 500 extra coins.|Świętuj postęp i odbierz dodatkowe 500 monet.
Well done, island keeper!|Dobra robota, opiekunie wyspy!
Lighthouse task complete|Zadanie latarni ukończone
First Harvest|Pierwsze zbiory
Growing Island|Rozwijająca się wyspa
Beyond the Horizon|Za horyzontem
Skilled Craftsperson|Wprawny rzemieślnik
The Light Returns|Światło powraca
Island updated.|Wyspa zaktualizowana.
Your island. Select a building, residents or a menu item.|Twoja wyspa. Wybierz budynek, mieszkańców lub pozycję menu.
Your browser cannot save progress. You can keep playing until this tab is closed.|Twoja przeglądarka nie może zapisać postępu. Możesz grać do zamknięcia tej karty.
Island animations could not be loaded. Refresh the page to try again.|Nie udało się wczytać animacji wyspy. Odśwież stronę, aby spróbować ponownie.
Loading approved v1 visual…|Wczytywanie widoku wyspy…
Approved v1 visual could not be loaded.|Nie udało się wczytać widoku wyspy.
`);
entries(`
Each level provides housing for 24 residents. Every resident without a home reduces happiness by 1 percentage point per hour.|Każdy poziom zapewnia miejsce dla 24 mieszkańców. Każdy mieszkaniec bez miejsca w domu obniża szczęście o 1 punkt procentowy na godzinę.
Each farmer produces 10 grain per working hour. Harvests wait in the farm storage until warehouse workers collect them.|Każdy rolnik produkuje 10 zboża na godzinę pracy. Zbiory czekają przy gospodarstwie na odbiór przez pracowników magazynu.
Each worker produces 10 planks per hour. Each plank requires 2 wood from the central warehouse.|Każdy pracownik produkuje 10 desek na godzinę. Każda deska wymaga 2 drewna z magazynu centralnego.
Each quarry worker produces 10 stone per working hour. Stone waits at the quarry for transport.|Każdy kamieniarz produkuje 10 kamienia na godzinę pracy. Kamień czeka przy kamieniołomie na transport.
Connects the island to trade and expeditions.|Łączy wyspę z handlem i ekspedycjami.
Each warehouse worker carries up to 60 items per five-minute round trip at level 1. Level 1 holds 1,000 of each material and 4,000 in total. Each additional level increases both limits by 50%.|Na poziomie 1 każdy magazynier przenosi do 60 sztuk podczas pięciominutowego kursu w obie strony. Magazyn mieści po 1 000 każdego materiału i łącznie 4 000. Każdy kolejny poziom zwiększa oba limity o 50%.
Completing a level sets everyone’s happiness to 100% and doubles material production for 24 hours × the new level. Construction takes four times as long as transport.|Ukończenie poziomu ustawia szczęście mieszkańców na 100% i podwaja produkcję materiałów przez 24 godziny × nowy poziom. Budowa trwa cztery razy dłużej niż transport.
Each lumberjack produces 10 wood per working hour. Wood waits in local storage for transport.|Każdy drwal produkuje 10 drewna na godzinę pracy. Drewno czeka w magazynie przy budynku na transport.
Each miller produces 10 food per hour. Each food requires 2 grain from the central warehouse.|Każdy młynarz produkuje 10 żywności na godzinę. Każda sztuka żywności wymaga 2 zboża z magazynu centralnego.
The Town Hall determines the island level and the upgrade limit for other buildings. Each level allows 24 residents; the House provides their housing.|Ratusz określa poziom wyspy i maksymalny poziom innych budynków. Każdy poziom pozwala na 24 mieszkańców; miejsca mieszkalne zapewnia dom.
Completing an upgrade grants +10 happiness × the new level for 10 hours. Separate one-use blessings give +50 of every resource and +20 happiness for one hour.|Ukończenie rozbudowy daje +10 szczęścia × nowy poziom przez 10 godzin. Osobne jednorazowe błogosławieństwa dają +50 każdego zasobu i +20 szczęścia przez godzinę.
Merchants exchange goods without coins.|Kupcy wymieniają towary bez użycia monet.
Find a route to the harbor. A bridge lets you cross one water obstacle.|Znajdź drogę do portu. Most pozwala pokonać jedną przeszkodę wodną.
Collect supplies from the abandoned mine and find the exit.|Zbierz zapasy z opuszczonej kopalni i znajdź wyjście.
Find the gate key and return with supplies for the lighthouse.|Znajdź klucz do bramy i wróć z zapasami dla latarni.
Have warehouse workers collect at least one batch of finished goods.|Zleć pracownikom magazynu odbiór przynajmniej jednej partii gotowych towarów.
Upgrade any settlement building.|Ulepsz dowolny budynek osady.
Complete an expedition and return with its reward.|Ukończ ekspedycję i wróć z nagrodą.
Process materials in the sawmill or windmill.|Przetwórz materiały w tartaku lub młynie.
Deliver the materials and complete the lighthouse.|Dostarcz materiały i ukończ latarnię.
The current level remains active until the upgrade is complete. Production, transport and timers continue while you are away.|Obecny poziom działa do ukończenia rozbudowy. Produkcja, transport i odliczanie trwają również pod twoją nieobecność.
Upgrade materials come from the central warehouse and coins from the treasury. Queued orders add 10% to the full cost; the displayed resource totals already include this whenever the order must queue.|Materiały do rozbudowy pochodzą z magazynu centralnego, a monety ze skarbca. Zlecenia w kolejce kosztują o 10% więcej; wyświetlone ilości uwzględniają tę dopłatę, gdy zlecenie trafi do kolejki.
Use Schedule expected deliveries for materials not yet in storage. Its separate fee is 25% of the missing goods’ base Harbor purchase value; queued costs already include their 10% surcharge.|Użyj opcji Zaplanuj przyszłe dostawy, gdy materiałów nie ma jeszcze w magazynie. Osobna opłata wynosi 25% podstawowej portowej ceny zakupu brakujących towarów; koszty kolejki uwzględniają już dopłatę 10%.
Assign warehouse carriers to estimate transport and construction time. The base carrier round trip takes 5 minutes with one material. Completed path levels increase transport speed.|Przydziel tragarzy w magazynie, aby oszacować czas transportu i budowy. Podstawowy kurs w obie strony z jednym materiałem trwa 5 minut. Ukończone poziomy ścieżek przyspieszają transport.
Your Town Hall level sets both the active construction limit and the regular queue limit. Paid queue entries already have reserved materials. Warehouse workers normally replenish central storage before supplying construction; you can change priorities.|Poziom ratusza wyznacza limit równoczesnych budów i zwykłej kolejki. Opłacone zlecenia w kolejce mają już zarezerwowane materiały. Magazynierzy zwykle najpierw uzupełniają magazyn centralny, a potem zaopatrują budowy; możesz zmienić priorytety.
Each House level provides housing for 24 residents.|Każdy poziom domu zapewnia miejsce dla 24 mieszkańców.
Each House level provides 24 beds. Upgrading does not add residents immediately; it increases housing. Every resident without a bed lowers happiness by 1 percentage point per hour. Population can grow up to the Town Hall limit.|Każdy poziom domu zapewnia 24 łóżka. Rozbudowa zwiększa liczbę miejsc, ale nie dodaje od razu mieszkańców. Każdy mieszkaniec bez łóżka obniża szczęście o 1 punkt procentowy na godzinę. Populacja może rosnąć do limitu ratusza.
A production blockage gives its assigned workers −10 happiness, then another −10 every 24 hours, down to −50 from this penalty. Releasing a worker resets their blockage timer while they return home.|Zatrzymanie produkcji daje przydzielonym pracownikom −10 szczęścia, a następnie kolejne −10 co 24 godziny, maksymalnie do −50 z tej kary. Zwolnienie pracownika zeruje licznik blokady podczas jego powrotu do domu.
Releasing a worker discards their unfinished unit. They take 5 minutes to return home and cannot work or be reassigned during that journey.|Zwolnienie pracownika usuwa postęp nieukończonej sztuki. Powrót do domu trwa 5 minut; w tym czasie nie może pracować ani dostać nowego przydziału.
Complete a Lighthouse level to give everyone 100% happiness and material production ×2 for 24 hours × that level.|Ukończ poziom latarni, aby zapewnić mieszkańcom 100% szczęścia i produkcję materiałów ×2 przez 24 godziny × ten poziom.
Collect 500 of every resource, including coins. Transport is followed by a building phase four times as long as transport.|Zbierz po 500 każdego zasobu, w tym monet. Po transporcie następuje budowa trwająca cztery razy dłużej niż transport.
Coins are stored separately and do not use goods storage.|Monety są przechowywane osobno i nie zajmują miejsca na towary.
Coins are kept in a separate treasury.|Monety są przechowywane w osobnym skarbcu.
Farm → grain → Windmill → food. Lumber Camp → wood → Sawmill → planks. Quarry → stone. Carriers deliver finished goods from buildings to the warehouse.|Gospodarstwo → zboże → młyn → żywność. Drwale → drewno → tartak → deski. Kamieniołom → kamień. Tragarze przewożą gotowe towary z budynków do magazynu.
A level 1 Warehouse holds 4,000 units in total and up to 1,000 of each resource. Each additional level increases both limits by 50%. Coins are kept in a separate treasury.|Magazyn poziomu 1 mieści łącznie 4 000 sztuk i do 1 000 każdego zasobu. Każdy kolejny poziom zwiększa oba limity o 50%. Monety trafiają do osobnego skarbca.
A carrier takes one material per trip, including a partial load. The base round trip is 5 minutes; completed path levels reduce it. Level 1 carries 60 units per trip. Hunger halves effective transport. Central replenishment comes before construction unless you change priorities. Food reserve: 50 × Warehouse level.|Tragarz zabiera podczas kursu jeden materiał, także niepełny ładunek. Podstawowy kurs w obie strony trwa 5 minut; ukończone poziomy ścieżek skracają go. Na poziomie 1 tragarz przenosi 60 sztuk. Głód zmniejsza wydajność transportu o połowę. Domyślnie uzupełnienie magazynu centralnego ma pierwszeństwo przed budową. Rezerwa żywności: 50 × poziom magazynu.
Each row shows the current carrier, cargo, route and remaining delivery time. A new worker first walks five minutes from Home. An idle worker will take the next available job; an already loaded shipment keeps its cargo.|Każdy wiersz pokazuje tragarza, ładunek, trasę i pozostały czas dostawy. Nowy pracownik najpierw idzie 5 minut z domu. Wolny pracownik podejmie kolejne dostępne zlecenie; już załadowany transport zachowuje ładunek.
Choose up to three priorities from goods and Construction. Selected priorities stay highlighted and numbered. Click a selected priority to remove it; the remaining priorities move up.|Wybierz do trzech priorytetów spośród towarów i budowy. Wybrane priorytety są podświetlone i ponumerowane. Kliknij wybrany priorytet, aby go usunąć; pozostałe przesuną się wyżej.
Each repeating block contains 10 trips: one priority gets 8 trips and 2 random; two priorities get 5 + 3 and 2 random; three get 5 + 3 + 2. Priorities stay active until you change them. Unavailable goods are skipped so carriers can continue with an available delivery.|Każdy powtarzany blok obejmuje 10 kursów: jeden priorytet otrzymuje 8 kursów, a 2 są losowe; dwa priorytety otrzymują 5 + 3 kursy i 2 losowe; trzy otrzymują 5 + 3 + 2. Priorytety działają do ich zmiany. Niedostępne towary są pomijane, aby tragarze mogli realizować inne dostawy.
Each resident consumes 1 Food per real hour from central storage, including while offline. Eating adds 1 happiness point per hour. Without food, work efficiency immediately falls to 50%; after 12 continuous hungry hours the resident also loses 5 points per hour. Food reserved for meals cannot be spent twice.|Każdy mieszkaniec zużywa 1 żywności z magazynu centralnego na godzinę czasu rzeczywistego, także po wylogowaniu. Jedzenie dodaje 1 punkt szczęścia na godzinę. Bez żywności wydajność od razu spada do 50%; po 12 godzinach ciągłego głodu mieszkaniec traci też 5 punktów na godzinę. Żywności zarezerwowanej na posiłki nie można wydać ponownie.
Each workplace can employ up to 12 × its own building level, limited by free residents at home. Each resident has one assignment. Workers shows assigned / free at Home / this building’s limit.|Każdy budynek zatrudnia do 12 × własny poziom, o ile są wolni mieszkańcy w domu. Mieszkaniec ma tylko jeden przydział. Pole Pracownicy pokazuje: przydzieleni / wolni w domu / limit tego budynku.
A released worker takes 5 minutes to return home. During that time they are unavailable and do not work. You can assign them again after they return.|Zwolniony pracownik wraca do domu przez 5 minut. W tym czasie jest niedostępny i nie pracuje. Możesz przydzielić go ponownie po powrocie.
Production per worker is 10, 12, 13, 14… units per hour by the workplace’s own level. Hunger halves production and transport immediately. Releasing a worker discards their unfinished unit.|Produkcja jednego pracownika wynosi 10, 12, 13, 14… sztuk na godzinę zależnie od poziomu jego budynku. Głód od razu zmniejsza produkcję i transport o połowę. Zwolnienie pracownika usuwa postęp nieukończonej sztuki.
A resident starts working after the 5-minute walk to work. The Town Hall, House, Chapel and Lighthouse have no employees.|Mieszkaniec zaczyna pracować po 5 minutach drogi do pracy. Ratusz, dom, kaplica i latarnia nie zatrudniają pracowników.
Every resident keeps their own happiness, from −100% to +100%. The island value is the average of individual values. Percentages are displayed rounded up to whole numbers; partial hours are still counted precisely.|Każdy mieszkaniec ma własne szczęście od −100% do +100%. Wartość wyspy jest średnią indywidualnych wyników. Procenty są wyświetlane z zaokrągleniem w górę do pełnych liczb; niepełne godziny nadal są liczone dokładnie.
A blocked producer gives its assigned workers −10 happiness, with another −10 every 24 hours, down to −50 from this penalty. The blockage resets on release; the population average uses each resident’s own happiness.|Zablokowana produkcja daje przydzielonym pracownikom −10 szczęścia i kolejne −10 co 24 godziny, maksymalnie −50 z tej kary. Zwolnienie zeruje licznik blokady; średnia populacji korzysta z indywidualnego szczęścia mieszkańców.
Population capacity = 24 × Town Hall level. Housing = 24 × House level. Population can exceed housing, up to the Town Hall capacity.|Limit populacji = 24 × poziom ratusza. Miejsca mieszkalne = 24 × poziom domu. Populacja może przekroczyć liczbę miejsc mieszkalnych, do limitu ratusza.
Each unhoused resident lowers happiness by 1 percentage point per real hour. For example, 78 residents with 72 beds lose 6 points per hour. A House upgrade stops further penalties once there is enough housing; it does not restore lost happiness.|Każdy mieszkaniec bez miejsca w domu obniża szczęście o 1 punkt procentowy na godzinę czasu rzeczywistego. Przykładowo 78 mieszkańców przy 72 łóżkach oznacza stratę 6 punktów na godzinę. Rozbudowa domu zatrzymuje dalsze kary, gdy wystarcza miejsc; nie przywraca utraconego szczęścia.
At 0% happiness, population stays the same. Positive happiness attracts new residents; negative happiness causes departures. At least 6 residents always remain.|Przy 0% szczęścia populacja się nie zmienia. Dodatnie szczęście przyciąga nowych mieszkańców, a ujemne powoduje odejścia. Zawsze pozostaje co najmniej 6 mieszkańców.
Hours mean real elapsed time. Production, feeding, happiness, population and all delivery/building timers continue while the game is closed.|Godziny oznaczają czas rzeczywisty. Produkcja, żywienie, szczęście, populacja i wszystkie dostawy oraz budowy działają również po zamknięciu gry.
Food, employment and overcrowding change individual happiness over time. The next population change is estimated using the current population average.|Żywność, zatrudnienie i przeludnienie z czasem zmieniają indywidualne szczęście. Czas kolejnej zmiany populacji jest szacowany na podstawie obecnej średniej szczęścia.
Attractions grant temporary happiness to selected residents. Upgraded paths improve transport. Chapel and Lighthouse bonuses last for a limited time.|Atrakcje czasowo zwiększają szczęście wybranych mieszkańców. Ulepszone ścieżki usprawniają transport. Premie kaplicy i latarni działają przez ograniczony czas.
Orders use full lots of 100. Purchase prices are frozen when ordered. Consecutive purchases within 3 hours increase the base price linearly. Every voyage takes 5 minutes; Harbor workers handle both transport stages.|Zlecenia obejmują pełne partie po 100 sztuk. Cena zakupu jest ustalana przy zleceniu. Kolejne zakupy w ciągu 3 godzin liniowo zwiększają cenę podstawową. Rejs trwa 5 minut; pracownicy portu obsługują oba etapy transportu.
No full-storage penalty.|Brak kary za pełny magazyn.
Eating adds +1 point per hour and employment adds another +1. Each continuous lack of food or work has its own 12-hour grace period, followed by a −5 point/hour penalty. Eating or starting a job resets the corresponding timer. Returning home counts as unemployment.|Jedzenie daje +1 punkt na godzinę, a praca kolejne +1. Ciągły brak żywności i brak pracy mają osobne 12-godzinne okresy ochronne, po których naliczana jest kara −5 punktów na godzinę. Posiłek lub rozpoczęcie pracy zeruje odpowiedni licznik. Powrót do domu liczy się jako bezrobocie.
Hunger immediately halves production and transport, even during the grace period. Timers continue offline.|Głód od razu zmniejsza produkcję i transport o połowę, także w okresie ochronnym. Liczniki działają po wylogowaniu.
Completing a Chapel upgrade gives everyone +10 happiness per new level for 10 hours. Level 1 has no passive bonus.|Ukończenie rozbudowy kaplicy daje mieszkańcom +10 szczęścia za każdy nowy poziom przez 10 godzin. Poziom 1 nie daje premii pasywnej.
A manual blessing grants +50 of every resource and +20 happiness to everyone for one hour. The Chapel level determines the total number of one-time uses. Only one manual blessing can be active at a time.|Błogosławieństwo uruchomione ręcznie daje +50 każdego zasobu i +20 szczęścia mieszkańcom przez godzinę. Poziom kaplicy określa liczbę jednorazowych użyć. Jednocześnie może działać tylko jedno ręczne błogosławieństwo.
A paid blessing costs 100 × Chapel level coins and has the same effect. Its 4-hour cooldown starts when the blessing ends; active blessings cannot overlap.|Płatne błogosławieństwo kosztuje 100 × poziom kaplicy monet i daje ten sam efekt. Czterogodzinna przerwa zaczyna się po zakończeniu błogosławieństwa; aktywne błogosławieństwa nie mogą się nakładać.
Raw materials: Wood, Stone, Grain. Processed goods: Planks, Food. Exchange within one category at 1:1 before the 10% fee: 10 units yield 9. There is no limit on the number of exchanges.|Surowce podstawowe: drewno, kamień, zboże. Towary przetworzone: deski, żywność. Wymiana odbywa się w obrębie jednej kategorii po kursie 1:1 przed prowizją 10%: z 10 sztuk otrzymasz 9. Liczba wymian nie jest ograniczona.
Market workers carry goods in both directions. Arrivals are locked for one hour and expire after 24 hours. Exchanged goods receive a fresh 24-hour deadline. Request a return delivery to bring goods back to central storage.|Pracownicy targu noszą towary w obie strony. Dostawy są zablokowane na godzinę i przepadają po 24 godzinach. Towary po wymianie otrzymują nowy termin 24 godzin. Zleć dostawę powrotną, aby przenieść je do magazynu centralnego.
Coins earned in the game and purchased coins are the same currency. 1 PLN = 10 coins. No real payment service is connected.|Monety zdobyte w grze i kupione to ta sama waluta. 1 PLN = 10 monet. Płatności rzeczywiste nie są podłączone.
Instant transport and buying a building without materials unlock at Town Hall level 4.|Transport natychmiastowy i zakup budynku bez materiałów są dostępne od 4. poziomu ratusza.
The building package includes every material at the base Harbor purchase rate +25%, the building’s coin cost and instant transport. Existing goods remain in storage. No carriers are needed; a full purchase finishes in 10 seconds.|Pakiet budynku obejmuje wszystkie materiały po podstawowej portowej cenie zakupu +25%, koszt budynku w monetach oraz transport natychmiastowy. Obecne towary zostają w magazynie. Tragarze nie są potrzebni; zakup kończy budowę w 10 sekund.
The time estimate uses the current warehouse crew, its efficiency, waiting goods, active deliveries and selected priorities. It assumes the required materials are ready. Gathering materials, queue waiting and earlier upgrades are excluded. Changing staffing, feeding or priorities updates the estimate.|Szacowany czas uwzględnia obecną załogę magazynu, jej wydajność, oczekujące towary, aktywne dostawy i wybrane priorytety. Zakłada, że wymagane materiały są gotowe. Nie obejmuje zbierania materiałów, oczekiwania w kolejce ani wcześniejszych rozbudów. Zmiana obsady, wyżywienia lub priorytetów aktualizuje szacunek.
Premium uses coins earned through island activity, trade and expedition rewards. 1 PLN = 10 coins. Real-money purchases are not connected.|Premium korzysta z monet zdobywanych dzięki aktywności na wyspie, handlowi i ekspedycjom. 1 PLN = 10 monet. Zakupy za prawdziwe pieniądze nie są podłączone.
Building acceleration charges 1 coin per full minute saved, with a minimum of 5 coins. Choose 25%, 50%, 75% or instant completion. The current quoted price is shown before you choose.|Przyspieszenie budowy kosztuje 1 monetę za pełną zaoszczędzoną minutę, co najmniej 5 monet. Wybierz 25%, 50%, 75% lub natychmiastowe ukończenie. Przed wyborem zobaczysz aktualną cenę.
Instant transport costs 10 coins per necessary trip, including a partial last trip. Each material and each Harbor transport stage is priced separately.|Transport natychmiastowy kosztuje 10 monet za każdy potrzebny kurs, także ostatni niepełny. Każdy materiał i każdy etap transportu w porcie są wyceniane osobno.
Sharing milestones and referrals will offer coin and material rewards. Reward verification and platform connections are being finalized.|Udostępnianie osiągnięć i polecenia będą nagradzane monetami i materiałami. Zasady weryfikacji nagród oraz połączenia z platformami są dopracowywane.
The House’s daily happiness pool is being prepared.|Dzienna pula szczęścia domu jest przygotowywana.
The House receives a daily pool of one point per resident. You can allocate whole points to an individual or give everyone one point. These are normal happiness additions; hunger, unemployment and other penalties still apply. Newborn residents and residents currently fixed at 100% cannot receive points.|Dom otrzymuje dzienną pulę po jednym punkcie na mieszkańca. Możesz przekazać pełne punkty jednej osobie albo dać każdemu po jednym. To zwykły wzrost szczęścia; kary za głód, bezrobocie i inne przyczyny nadal obowiązują. Nowi mieszkańcy w okresie ochronnym i osoby z ustalonym 100% nie otrzymują punktów.
Two minutes before the next pool, leftover whole points go one at a time to the least happy residents, with random selection among ties.|Dwie minuty przed odnowieniem puli pozostałe pełne punkty trafiają po jednym do najmniej szczęśliwych mieszkańców, z losowaniem przy remisie.
Visits last 4 hours, with no travel time and no early return. Rewards start when the group returns home: each visitor has 100% happiness for 24 hours and must wait those 24 hours before another visit. Each returning group adds +10 pp to everyone for 6 hours; separate groups stack.|Zwiedzanie trwa 4 godziny, bez czasu dojścia i bez wcześniejszego powrotu. Nagrody zaczynają działać po powrocie grupy do domu: każdy uczestnik ma 100% szczęścia przez 24 godziny i przez ten czas nie może wrócić na zwiedzanie. Każda powracająca grupa dodaje wszystkim +10 punktów procentowych przez 6 godzin; osobne grupy sumują się.
Only one task can be active. Deliver goods from central storage in instalments. Deposits are irreversible and are lost when the deadline expires. Food below the protected reserve cannot be donated. Each task shows its own expiry time.|Tylko jedno zadanie może być aktywne. Przekazuj towary z magazynu centralnego w ratach. Darowizn nie można cofnąć i przepadają po upływie terminu. Nie można przekazać żywności z chronionej rezerwy. Każde zadanie ma własny termin.
Deposited goods cannot be withdrawn. Complete every requirement before the deadline to receive the displayed reward.|Przekazanych towarów nie można wycofać. Uzupełnij wszystkie wymagania przed terminem, aby otrzymać pokazaną nagrodę.
Donated goods cannot be withdrawn. Complete every requirement before the deadline to receive the displayed reward.|Przekazanych towarów nie można wycofać. Uzupełnij wszystkie wymagania przed terminem, aby otrzymać pokazaną nagrodę.
Five attractions are available in the bottom dock. Offers refresh every 24 hours. Each purchase grants its displayed happiness to the displayed residents for six hours.|Na dolnym pasku dostępnych jest pięć atrakcji. Oferta odnawia się co 24 godziny. Każdy zakup daje wskazaną premię szczęścia wskazanym mieszkańcom przez sześć godzin.
Buying the same attraction repeatedly grants 100%, 75%, 50%, 25%, then 0% of its original benefit. A 24-hour break restores its full benefit.|Kolejne zakupy tej samej atrakcji dają 100%, 75%, 50%, 25%, a potem 0% pierwotnej premii. Przerwa 24 godzin przywraca pełny efekt.
Upgrade 100 path sections through five levels. Each section upgrade costs 100 Stone and is immediate. All 100 sections must reach the previous level before you start the next.|Ulepsz 100 odcinków ścieżek przez pięć poziomów. Ulepszenie odcinka kosztuje 100 kamienia i działa natychmiast. Wszystkie 100 odcinków musi osiągnąć poprzedni poziom przed rozpoczęciem kolejnego.
Animations are paused by your system’s reduced-motion preference. Enable the checkbox to turn on water, smoke and island movement.|Animacje są wstrzymane przez systemowe ograniczenie ruchu. Włącz pole wyboru, aby uruchomić wodę, dym i ruch na wyspie.
Animations are off. Enable the checkbox to turn on water, smoke and island movement.|Animacje są wyłączone. Włącz pole wyboru, aby uruchomić wodę, dym i ruch na wyspie.
Your island continues in real time, including while you are away. Progress is saved in this browser.|Wyspa działa w czasie rzeczywistym, także pod twoją nieobecność. Postęp jest zapisywany w tej przeglądarce.
Town Hall level × coins, recorded on each full hour.|Poziom ratusza × monety, zapisywane o każdej pełnej godzinie.
Island activity follows real elapsed time. Production, travel, transport, meals, happiness and construction continue offline.|Wyspa działa w czasie rzeczywistym. Produkcja, podróże, transport, posiłki, szczęście i budowa działają po wylogowaniu.
Expeditions award coins only. Win the first level for 50 coins, then choose to cash out or risk the whole unclaimed pot. Each next win doubles the pot; a loss clears it.|Ekspedycje dają wyłącznie monety. Wygraj pierwszy poziom za 50 monet, a potem wypłać nagrodę lub zaryzykuj całą nieodebraną pulę. Każde kolejne zwycięstwo podwaja pulę; porażka ją zeruje.
Move up, down, left or right. Every win increases the unclaimed coin pot; cash out to transfer it to the island.|Poruszaj się w górę, w dół, w lewo i w prawo. Każde zwycięstwo zwiększa nieodebraną pulę monet; wypłać ją, aby trafiła na wyspę.
Additional time, moves and rewarded ads will become available when their rules are finalized.|Dodatkowy czas, ruchy i reklamy z nagrodami będą dostępne po ustaleniu zasad.
Starting a new island will erase your current progress in this browser.|Rozpoczęcie nowej wyspy usunie obecny postęp w tej przeglądarce.
Rebuild the Lighthouse, manage your settlement and gather materials on expeditions.|Odbuduj latarnię, zarządzaj osadą i wyruszaj na ekspedycje.
Facebook sharing is coming soon. This preview awards the bonus when you choose Share; nothing is posted.|Udostępnianie na Facebooku pojawi się później. W tej wersji podglądowej wybór Udostępnij przyznaje premię; nic nie jest publikowane.
Each eligible resident receives the temporary happiness bonus. New residents keep their initial 0% freeze.|Każdy uprawniony mieszkaniec otrzymuje czasową premię do szczęścia. Nowi mieszkańcy zachowują początkowy okres stałego 0%.
The happiness bonus lasts ten hours after a Chapel upgrade.|Premia do szczęścia trwa dziesięć godzin po rozbudowie kaplicy.
The upgrade gives both benefits for 24 hours × the achieved Lighthouse level. New residents retain their initial 0% freeze.|Rozbudowa daje obie premie przez 24 godziny × osiągnięty poziom latarni. Nowi mieszkańcy zachowują początkowy okres stałego 0%.
Each returning group has its own six-hour population bonus. Overlapping groups add their bonuses.|Każda powracająca grupa ma własną sześciogodzinną premię dla populacji. Nakładające się grupy sumują premie.
The personal benefit starts after the four-hour visit and lasts for 24 hours.|Indywidualna premia zaczyna działać po czterogodzinnym zwiedzaniu i trwa 24 godziny.
Every new resident starts with 24 hours of frozen 0% happiness; normal calculation begins afterwards.|Każdy nowy mieszkaniec przez pierwsze 24 godziny ma stałe 0% szczęścia; potem rozpoczyna się zwykłe naliczanie.
Food is assigned automatically. Each resident consumes one Food per hour.|Żywność jest przydzielana automatycznie. Każdy mieszkaniec zużywa jedną sztukę żywności na godzinę.
The work benefit starts on arrival. A production blockage pauses this benefit.|Premia za pracę zaczyna działać po przybyciu. Blokada produkcji wstrzymuje tę premię.
The efficiency reduction starts immediately when food runs out; the happiness penalty has a separate 12-hour grace period.|Wydajność spada natychmiast po wyczerpaniu żywności; kara do szczęścia ma osobny 12-godzinny okres ochronny.
The penalty begins after twelve continuous hours without food. Earlier hours are not penalized retrospectively.|Kara zaczyna działać po dwunastu godzinach ciągłego braku żywności. Za wcześniejsze godziny nie nalicza się jej wstecz.
The penalty begins after twelve continuous hours without work. Returning home counts as unemployment.|Kara zaczyna działać po dwunastu godzinach ciągłego braku pracy. Powrót do domu liczy się jako bezrobocie.
A full local store or missing input starts a −10 pp penalty. Each additional 24 hours adds −10, up to −50 from this cause.|Pełny magazyn przy budynku lub brak surowca powoduje karę −10 punktów procentowych. Każde kolejne 24 godziny dodają −10, maksymalnie do −50 z tej przyczyny.
This purchase gives a six-hour personal bonus. Each purchase has its own recipients and expiry.|Ten zakup daje sześciogodzinną premię indywidualną. Każdy zakup ma własnych odbiorców i termin końca.
Repeated purchases give 100%, 75%, 50%, 25%, then 0%. Full effectiveness returns after 24 hours without buying this attraction.|Kolejne zakupy dają 100%, 75%, 50%, 25%, a potem 0%. Pełna skuteczność wraca po 24 godzinach bez kupowania tej atrakcji.
The active construction package adds four places, an unlimited queue and planning based on expected deliveries.|Aktywny pakiet budowlany dodaje cztery miejsca, nieograniczoną kolejkę i planowanie na podstawie przewidywanych dostaw.
Five new decorations and events are available for the next 24 hours.|Pięć nowych dekoracji i wydarzeń jest dostępnych przez kolejne 24 godziny.
Residents need a 24-hour break from this attraction.|Mieszkańcy potrzebują 24-godzinnej przerwy od tej atrakcji.
No residents can receive this happiness bonus yet.|Żaden mieszkaniec nie może jeszcze otrzymać tej premii do szczęścia.
Choose an available attraction.|Wybierz dostępną atrakcję.
This attraction is not in today’s selection.|Tej atrakcji nie ma w dzisiejszej ofercie.
`);
entries(`
This building does not exist.|Ten budynek nie istnieje.
Maximum level reached.|Osiągnięto maksymalny poziom.
An upgrade is available.|Rozbudowa jest dostępna.
House happiness distributed|Rozdzielono szczęście domu
House happiness pool refreshed|Odnowiono pulę szczęścia domu
Choose a positive whole number of happiness points.|Wybierz dodatnią całkowitą liczbę punktów szczęścia.
No happiness points remain in the House pool.|W puli domu nie zostały punkty szczęścia.
No resident can currently receive House happiness points.|Żaden mieszkaniec nie może teraz otrzymać punktów szczęścia z domu.
Not enough House points to give this amount to everyone.|W puli domu brakuje punktów, aby przekazać tę ilość wszystkim.
This resident does not exist.|Ten mieszkaniec nie istnieje.
Newborn happiness remains at zero for its first 24 hours.|Szczęście nowego mieszkańca pozostaje na zerze przez pierwsze 24 godziny.
This resident already has the highest happiness this pool can provide.|Ten mieszkaniec ma już najwyższe szczęście, jakie może zapewnić ta pula.
Not enough happiness points remain in the House pool.|W puli domu brakuje punktów szczęścia.
The upgrade quote has changed. Review its current cost.|Cena rozbudowy się zmieniła. Sprawdź aktualny koszt.
Not enough unreserved resources. The Food reserve must remain in the warehouse.|Brakuje niezarezerwowanych zasobów. Rezerwa żywności musi zostać w magazynie.
plan waiting for deliveries|plan czeka na dostawy
materials reserved in the queue|materiały zarezerwowane w kolejce
materials delivered; construction started|materiały dostarczone; budowa rozpoczęta
materials reserved, waiting for transport|materiały zarezerwowane; oczekiwanie na transport
Unknown action.|Nieznane działanie.
This building already exists. Choose Upgrade.|Ten budynek już istnieje. Wybierz Ulepsz.
Build this building first.|Najpierw zbuduj ten budynek.
Warehouse workers carry goods. Assign workers to the warehouse and set transport priorities.|Magazynierzy przenoszą towary. Przydziel pracowników do magazynu i ustaw priorytety transportu.
This building does not employ workers.|Ten budynek nie zatrudnia pracowników.
Enter a nonzero whole number of workers.|Podaj niezerową całkowitą liczbę pracowników.
This workplace can employ up to 12 residents per building level.|Ten budynek może zatrudniać do 12 mieszkańców na każdy poziom budynku.
Not enough residents available at Home.|W domu brakuje dostępnych mieszkańców.
Keep at least one warehouse worker to collect the Food waiting at the Windmill.|Zostaw co najmniej jednego magazyniera, aby odebrał żywność czekającą przy młynie.
Build the Chapel first.|Najpierw zbuduj kaplicę.
A blessing is already active. Wait for it to end.|Błogosławieństwo już działa. Poczekaj do jego zakończenia.
A paid blessing becomes available four hours after its previous one-hour effect ends.|Płatne błogosławieństwo jest dostępne cztery godziny po zakończeniu poprzedniego godzinnego efektu.
Not enough coins for this blessing.|Za mało monet na to błogosławieństwo.
All free blessings available at this Chapel level have been used.|Wykorzystano wszystkie darmowe błogosławieństwa dostępne na tym poziomie kaplicy.
+50 of every resource and +20 happiness for every resident for one hour.|+50 każdego zasobu i +20 szczęścia dla każdego mieszkańca przez godzinę.
Granted +50 of every resource and +20 happiness for one hour.|Przyznano +50 każdego zasobu i +20 szczęścia przez godzinę.
Notifications marked as read.|Oznaczono powiadomienia jako przeczytane.
The market unlocks at Town Hall level 2.|Targ jest dostępny od 2. poziomu ratusza.
Invalid material or quantity.|Nieprawidłowy materiał lub ilość.
Not enough unreserved goods in the central warehouse.|W magazynie centralnym brakuje niezarezerwowanych towarów.
Not enough space in the market.|Na targu brakuje miejsca.
Market delivery ordered. Goods must wait one hour after arrival before they can be exchanged.|Zlecono dostawę na targ. Towary trzeba przetrzymać godzinę po przybyciu, zanim będzie można je wymienić.
Choose different goods from the same category.|Wybierz różne towary z tej samej kategorii.
Exchange in batches of 10: you receive 9 after the fee.|Wymieniaj partie po 10 sztuk: po prowizji otrzymasz 9.
Not enough unlocked goods in the market.|Na targu brakuje odblokowanych towarów.
Invalid collection order.|Nieprawidłowe zlecenie odbioru.
Goods are waiting for collection by warehouse workers.|Towary czekają na odbiór przez magazynierów.
Assigned workers process materials. Production requires time and inputs from the central warehouse.|Przydzieleni pracownicy przetwarzają materiały. Produkcja wymaga czasu i surowców z magazynu centralnego.
Invalid transport priority change.|Nieprawidłowa zmiana priorytetu transportu.
This material is already at the end of the priority list.|Ten materiał jest już na końcu listy priorytetów.
Transport priority updated.|Zmieniono priorytety transportu.
The full lighthouse cost must be in the warehouse. Start construction from its building panel.|Pełny koszt latarni musi być dostępny w magazynie. Rozpocznij budowę z panelu tego budynku.
The lighthouse is already built or under construction.|Latarnia jest już zbudowana lub jej budowa trwa.
Use the current Lighthouse tasks. Starter achievement rewards belong to an earlier game version.|Korzystaj z bieżących zadań latarni. Nagrody początkowych osiągnięć należą do wcześniejszej wersji gry.
Harbor trading with coins unlocks at Town Hall level 4.|Handel za monety w porcie jest dostępny od 4. poziomu ratusza.
Unknown trade type.|Nieznany rodzaj transakcji.
Not enough coins for this purchase.|Za mało monet na ten zakup.
Not enough coins.|Za mało monet.
You do not have enough goods to sell.|Nie masz wystarczającej ilości towaru na sprzedaż.
Not enough space in the central warehouse for this purchase.|W magazynie centralnym brakuje miejsca na ten zakup.
Start an expedition run and submit its completed route before claiming a reward.|Rozpocznij ekspedycję i ukończ jej trasę przed odebraniem nagrody.
Choose one of the five daily attractions in Decorations.|Wybierz jedną z pięciu dzisiejszych atrakcji w Dekoracjach.
The island follows real time. Use a building’s Premium controls to shorten a specific action.|Wyspa działa w czasie rzeczywistym. Użyj opcji premium budynku, aby skrócić wybrane działanie.
Invalid setting.|Nieprawidłowe ustawienie.
Settings saved.|Zapisano ustawienia.
This option is not available yet.|Ta opcja nie jest jeszcze dostępna.
Select a construction project that is already building.|Wybierz budowę, która jest już w fazie wznoszenia.
Choose a 25%, 50%, 75% or instant reduction.|Wybierz skrócenie o 25%, 50%, 75% lub natychmiastowe ukończenie.
Instant transport unlocks at Town Hall level 4.|Transport natychmiastowy jest dostępny od 4. poziomu ratusza.
This transport route is unavailable.|Ta trasa transportu jest niedostępna.
Buying a building without materials unlocks at Town Hall level 4.|Zakup budynku bez materiałów jest dostępny od 4. poziomu ratusza.
The construction price is not available.|Cena budowy jest niedostępna.
A construction package is required to schedule expected deliveries.|Planowanie przyszłych dostaw wymaga pakietu budowlanego.
These materials are already available. Order a normal upgrade.|Te materiały są już dostępne. Zleć zwykłą rozbudowę.
The missing materials have no feasible production and delivery route.|Brakujące materiały nie mają wykonalnej drogi produkcji i dostawy.
This package cannot be extended further.|Nie można dalej przedłużyć tego pakietu.
There are no goods to transport.|Nie ma towarów do przewiezienia.
Not enough coins for instant transport.|Za mało monet na transport natychmiastowy.
Not enough coins to buy the building.|Za mało monet na zakup budynku.
Construction is unavailable.|Budowa jest niedostępna.
The building cannot be purchased now.|Nie można teraz kupić tego budynku.
Not enough coins for the forecast scheduling fee.|Za mało monet na opłatę za planowanie dostaw.
The plan cannot be scheduled.|Nie można zaplanować tej budowy.
Not enough coins for the construction package.|Za mało monet na pakiet budowlany.
Construction package activated for another 24 hours. Four additional builds, unlimited queue and expected-delivery planning are available.|Pakiet budowlany aktywowano na kolejne 24 godziny. Dostępne są cztery dodatkowe budowy, nieograniczona kolejka i planowanie przyszłych dostaw.
Social and referral rewards will be available after their verification rules are defined.|Nagrody za udostępnianie i polecenia będą dostępne po określeniu zasad ich weryfikacji.
This expedition does not exist.|Ta ekspedycja nie istnieje.
Finish or cash out the current expedition first.|Najpierw ukończ obecną ekspedycję lub wypłać jej pulę.
Choose a time limit for this expedition.|Wybierz limit czasu tej ekspedycji.
This expedition run does not exist.|Ta seria ekspedycji nie istnieje.
This expedition attempt has already ended.|Ta próba ekspedycji już się zakończyła.
This task does not exist.|To zadanie nie istnieje.
This task has expired.|Termin tego zadania minął.
Task accepted.|Przyjęto zadanie.
Accept this task before donating goods.|Przyjmij zadanie przed przekazaniem towarów.
Choose a whole positive contribution.|Wybierz dodatnią całkowitą ilość darowizny.
This resource is not required by the task.|Ten zasób nie jest wymagany w zadaniu.
This requirement has already been fulfilled.|To wymaganie jest już spełnione.
Not enough goods in central storage.|W magazynie centralnym brakuje towarów.
This donation would spend the protected food reserve.|Ta darowizna naruszyłaby chronioną rezerwę żywności.
The completed route is not valid for this expedition.|Ukończona trasa nie jest prawidłowa dla tej ekspedycji.
Task acceptance expired.|Potwierdzenie przyjęcia zadania wygasło.
Task acceptance cancelled.|Anulowano przyjęcie zadania.
Confirm the task within 60 seconds.|Potwierdź zadanie w ciągu 60 sekund.
Another task is already active.|Inne zadanie jest już aktywne.
Only one expedition series can be active at a time.|Jednocześnie może trwać tylko jedna seria ekspedycji.
Expedition time expired|Upłynął czas ekspedycji
The unclaimed expedition pot was lost.|Nieodebrana pula ekspedycji przepadła.
Construction started|Budowa rozpoczęta
Construction completed|Budowa ukończona
Materials reserved|Materiały zarezerwowane
Storage full|Magazyn pełny
Warehouse full|Magazyn centralny pełny
Local storage full|Magazyn przy budynku pełny
`);
entries(`
Repair the entrance steps|Napraw schody wejściowe
Replace the welcome sign|Wymień tablicę powitalną
Restore the keeper’s door|Odnów drzwi latarnika
Mend the garden gate|Napraw furtkę ogrodu
Secure the stone path|Zabezpiecz kamienną ścieżkę
Repair the porch railing|Napraw poręcz ganku
Patch the entrance canopy|Załataj daszek nad wejściem
Rebuild the visitor bench|Odbuduj ławkę dla zwiedzających
Restore the courtyard wall|Odnów mur dziedzińca
Weatherproof the entrance hall|Zabezpiecz przedsionek przed pogodą
Replace a cracked window|Wymień pęknięte okno
Repair the lantern shutters|Napraw okiennice latarni
Clean the upper windows|Wyczyść górne okna
Restore the observation window|Odnów okno obserwacyjne
Seal the lantern glazing|Uszczelnij oszklenie latarni
Repair the storm panels|Napraw osłony sztormowe
Replace the workshop window|Wymień okno warsztatu
Restore the stairwell vents|Odnów wentylację klatki schodowej
Weatherproof the gallery door|Zabezpiecz drzwi galerii przed pogodą
Repair the keeper’s skylight|Napraw świetlik latarnika
Restore the spiral stairs|Odnów spiralne schody
Replace the stair handrail|Wymień poręcz schodów
Repair the landing boards|Napraw deski podestu
Strengthen the stair supports|Wzmocnij podpory schodów
Install a resting platform|Zamontuj podest wypoczynkowy
Mend the lower staircase|Napraw dolne schody
Secure the upper landing|Zabezpiecz górny podest
Restore the service ladder|Odnów drabinę serwisową
Repair the tower hatch|Napraw właz wieży
Replace worn stair treads|Wymień zużyte stopnie
Repair the visitor railings|Napraw barierki dla zwiedzających
Rebuild the viewing platform|Odbuduj platformę widokową
Restore the gallery floor|Odnów podłogę galerii
Strengthen the observation deck|Wzmocnij taras widokowy
Add a visitor shelter|Dodaj wiatę dla zwiedzających
Mend the lookout fence|Napraw ogrodzenie punktu widokowego
Repair the gallery canopy|Napraw zadaszenie galerii
Restore the coastal viewpoint|Odnów nadmorski punkt widokowy
Secure the cliffside path|Zabezpiecz ścieżkę przy klifie
Build a sheltered waiting area|Zbuduj zadaszoną poczekalnię
Repair the lantern housing|Napraw obudowę lampy
Restore the lamp mechanism|Odnów mechanizm lampy
Replace the lamp supports|Wymień podpory lampy
Service the lens turntable|Przeprowadź serwis obrotnicy soczewki
Repair the reflector frame|Napraw ramę reflektora
Restore the lantern shutters|Odnów okiennice latarni
Rebuild the lamp workbench|Odbuduj stół do naprawy lampy
Repair the service gantry|Napraw pomost serwisowy
Secure the lens enclosure|Zabezpiecz osłonę soczewki
Prepare the lantern for storms|Przygotuj lampę na sztormy
Repair the supply winch|Napraw wyciąg zaopatrzeniowy
Restore the lifting platform|Odnów platformę podnośnika
Replace the hoist supports|Wymień podpory podnośnika
Mend the service pulley|Napraw krążek serwisowy
Rebuild the cargo shelter|Odbuduj wiatę ładunkową
Restore the supply ramp|Odnów rampę zaopatrzeniową
Repair the delivery landing|Napraw podest dostawczy
Secure the keeper’s storeroom|Zabezpiecz magazyn latarnika
Rebuild the workshop shelves|Odbuduj półki warsztatu
Improve the maintenance depot|Usprawnij zaplecze serwisowe
Repair the keeper’s roof|Napraw dach domu latarnika
Restore the keeper’s kitchen|Odnów kuchnię latarnika
Provision the repair crew|Zaopatrz ekipę remontową
Restock the storm shelter|Uzupełnij zapasy schronienia sztormowego
Rebuild the crew dining room|Odbuduj jadalnię załogi
Prepare supplies for the keepers|Przygotuj zapasy dla latarników
Restore the lighthouse pantry|Odnów spiżarnię latarni
Repair the staff quarters|Napraw kwatery pracowników
Improve the keeper’s garden|Ulepsz ogród latarnika
Support the night watch|Wesprzyj nocną wartę
Restore the tower masonry|Odnów mury wieży
Repair the foundation wall|Napraw mur fundamentowy
Strengthen the lower buttress|Wzmocnij dolną przyporę
Replace the damaged roof boards|Wymień uszkodzone deski dachu
Patch the coastal retaining wall|Załataj nadmorski mur oporowy
Restore the east wall|Odnów wschodni mur
Repair the west wall|Napraw zachodni mur
Rebuild the drainage channel|Odbuduj kanał odpływowy
Secure the tower foundation|Zabezpiecz fundament wieży
Repair the storm-damaged facade|Napraw elewację uszkodzoną przez sztorm
Restore the visitor information board|Odnów tablicę informacyjną dla zwiedzających
Repair the lighthouse museum shelves|Napraw półki muzeum latarni
Prepare a keeper’s history display|Przygotuj wystawę historii latarników
Rebuild the visitor shelter|Odbuduj wiatę dla zwiedzających
Restore the tour route|Odnów trasę zwiedzania
Repair the ticket shelter|Napraw budkę biletową
Improve the visitor resting area|Ulepsz strefę odpoczynku zwiedzających
Prepare the coastal exhibition|Przygotuj wystawę nadmorską
Restore the keeper’s archive|Odnów archiwum latarnika
Repair the welcome courtyard|Napraw dziedziniec powitalny
Prepare for the autumn storms|Przygotuj się na jesienne sztormy
Restore the emergency shelter|Odnów schronienie awaryjne
Repair the rainwater gutters|Napraw rynny deszczowe
Secure the lighthouse outbuildings|Zabezpiecz zabudowania latarni
Rebuild the storm supply cache|Odbuduj skrytkę zapasów sztormowych
Restore the coastal signal post|Odnów nadmorski punkt sygnałowy
Repair the emergency stores|Napraw magazyny awaryjne
Strengthen the workshop roof|Wzmocnij dach warsztatu
Prepare the annual lighthouse service|Przygotuj coroczny serwis latarni
Complete the lighthouse restoration|Ukończ odbudowę latarni
`);
entries(`
Meet your Town Hall|Poznaj ratusz
The Town Hall sets the island level, building upgrade limits and population capacity.|Ratusz określa poziom wyspy, limity rozbudowy budynków i limit populacji.
Meet your residents|Poznaj mieszkańców
The House provides beds. Free residents at Home can take a job.|Dom zapewnia łóżka. Wolni mieszkańcy w domu mogą podjąć pracę.
Assign a producer|Przydziel pracownika produkcji
Assign one free resident to a Farm, Windmill, Lumber Camp, Sawmill or Quarry.|Przydziel jednego wolnego mieszkańca do gospodarstwa, młyna, drwali, tartaku lub kamieniołomu.
Give workers time to arrive|Daj pracownikom czas na dojście
A new worker takes five minutes to reach work. Production begins after arrival.|Nowy pracownik dociera do pracy w pięć minut. Produkcja zaczyna się po przybyciu.
Read the resource dock|Poznaj pasek zasobów
Resource cards show working people above and local / central stock below.|Karty zasobów pokazują pracujących u góry oraz zapas lokalny / centralny na dole.
Assign a warehouse carrier|Przydziel tragarza do magazynu
Assign a resident to the Warehouse so finished goods can reach central storage.|Przydziel mieszkańca do magazynu, aby gotowe towary trafiały do magazynu centralnego.
Receive a delivery|Odbierz dostawę
Let a carrier deliver at least one batch of finished goods to the Warehouse.|Poczekaj, aż tragarz dostarczy do magazynu przynajmniej jedną partię gotowych towarów.
Choose a transport priority|Wybierz priorytet transportu
Select a material or Construction as a numbered transport priority.|Wybierz materiał lub budowę jako numerowany priorytet transportu.
Learn the food chain|Poznaj łańcuch żywności
The Farm makes grain. The Windmill uses two central grain to make one local Food.|Gospodarstwo produkuje zboże. Młyn zużywa dwie sztuki zboża z magazynu centralnego, aby wyprodukować jedną żywności przy budynku.
Keep food at Home|Zapewnij żywność mieszkańcom
Each resident automatically eats one Food per hour, supplied only from central storage.|Każdy mieszkaniec automatycznie zjada jedną żywności na godzinę, pobieraną wyłącznie z magazynu centralnego.
Read personal happiness|Sprawdź szczęście mieszkańców
Each person has individual happiness. The island value is the population average.|Każdy mieszkaniec ma własne szczęście. Wartość wyspy jest średnią populacji.
Learn House happiness points|Poznaj punkty szczęścia domu
The House receives a daily point pool; points help people without deleting their penalty history.|Dom otrzymuje dzienną pulę punktów; pomagają mieszkańcom bez usuwania historii ich kar.
Read an upgrade cost|Sprawdź koszt rozbudowy
Available / required values turn green when enough central materials are ready.|Wartości dostępne / wymagane stają się zielone, gdy w magazynie centralnym wystarcza materiałów.
Find construction management|Znajdź zarządzanie budową
The Town Hall contains the shared construction queue and its limits.|W ratuszu znajduje się wspólna kolejka budowy i jej limity.
Compare both stores|Porównaj oba magazyny
Local output must be carried home. Central storage has per-material and total capacity limits.|Towary z budynków trzeba przewieźć do magazynu centralnego. Ma on limit dla każdego materiału i limit łączny.
Learn Market exchanges|Poznaj wymianę na targu
The Market unlocks at island level 2 and exchanges goods within categories, with a 10% fee.|Targ jest dostępny od 2. poziomu wyspy i wymienia towary w obrębie kategorii za prowizją 10%.
Learn Lighthouse visits|Poznaj zwiedzanie latarni
An available Lighthouse visit takes four hours. Its personal and population bonuses begin after return.|Zwiedzanie latarni trwa cztery godziny. Premie indywidualne i dla populacji zaczynają się po powrocie.
Start one Lighthouse task|Rozpocznij zadanie latarni
Accept one task. Only one can be active, and its deliveries are made from central storage.|Przyjmij jedno zadanie. Tylko jedno może być aktywne, a towary są przekazywane z magazynu centralnego.
Learn path upgrades|Poznaj rozbudowę ścieżek
All 100 path sections must finish the current level before any can begin the next.|Wszystkie 100 odcinków ścieżek musi ukończyć obecny poziom, zanim którykolwiek zacznie następny.
Discover daily attractions|Odkryj atrakcje dnia
Five offers rotate daily. Repeated use of each attraction reduces its temporary happiness benefit.|Codziennie zmienia się pięć ofert. Ponowne używanie tej samej atrakcji zmniejsza jej czasową premię do szczęścia.
Learn Chapel blessings|Poznaj błogosławieństwa kaplicy
A manual blessing gives materials and one hour of happiness. Another cannot overlap it.|Ręczne błogosławieństwo daje materiały i godzinę premii do szczęścia. Drugie nie może działać jednocześnie.
Learn expedition risk|Poznaj ryzyko ekspedycji
Expedition rewards form a coin pot. Cash out or risk it on the next stage.|Nagrody ekspedycji tworzą pulę monet. Wypłać ją lub zaryzykuj w następnym etapie.
Release a worker safely|Bezpiecznie zwolnij pracownika
Release one assigned resident. Returning Home takes five minutes; already loaded cargo still arrives.|Zwolnij jednego przydzielonego mieszkańca. Powrót do domu trwa pięć minut; już załadowany towar nadal dotrze.
Choose your animation setting|Wybierz ustawienie animacji
Change Animations and highlights in Settings to choose whether the island moves.|Zmień opcję Animacje i podświetlenia w Ustawieniach, aby wybrać, czy wyspa się porusza.
Review your island|Sprawdź swoją wyspę
Check food, jobs, storage, active effects and plans. You are ready to manage the island.|Sprawdź żywność, pracę, magazyny, aktywne efekty i plany. Możesz już zarządzać wyspą.
Learn the island in 25 short steps: five tasks on each of your first five active days. Complete tasks and claim their displayed rewards.|Poznaj wyspę w 25 krótkich krokach: po pięć zadań przez pierwsze pięć aktywnych dni. Wykonuj zadania i odbieraj pokazane nagrody.
Reward claimed|Nagroda odebrana
Available on this active day|Dostępne w tym aktywnym dniu
Read and complete|Przeczytaj i ukończ
In progress|W toku
Other notifications|Pozostałe powiadomienia
Choose which categories are shown. All events remain in your island history.|Wybierz wyświetlane kategorie. Wszystkie zdarzenia pozostają w historii wyspy.
Beds|Łóżka
Capacity reached|Osiągnięto limit
Minimum: 6|Minimum: 6
0 · Stable|0 · Bez zmian
Invite a resident|Zaproś mieszkańca
Invite resident|Zaproś mieszkańca
Resident purchases are unavailable.|Zakup mieszkańców jest niedostępny.
A resident costs the full next Town Hall upgrade price in all six resources. An available House bed and Town Hall population place are required. New residents stay at 0% happiness for 24 hours.|Mieszkaniec kosztuje tyle, co pełna kolejna rozbudowa ratusza, we wszystkich sześciu zasobach. Wymaga wolnego łóżka w domu i miejsca w limicie ratusza. Nowi mieszkańcy mają 0% szczęścia przez 24 godziny.
Potential pot|Potencjalna pula
Overtime costs 10 coins from the potential reward per started second. Ads are a future integration.|Dodatkowy czas kosztuje 10 monet z potencjalnej nagrody za każdą rozpoczętą sekundę. Integracja reklam pojawi się w przyszłości.
Cash out and leave?|Wypłacić pulę i wyjść?
Leave this expedition?|Opuścić tę ekspedycję?
Leave and lose the pot|Opuść i strać pulę
Confirm Lighthouse task|Potwierdź zadanie latarni
The reward multiplier was saved when you opened this offer. Confirm within 60 seconds to start the task. Only one task can be active.|Mnożnik nagrody zapisano przy otwarciu oferty. Potwierdź w ciągu 60 sekund, aby rozpocząć zadanie. Tylko jedno zadanie może być aktywne.
Confirm and start|Potwierdź i rozpocznij
This confirmation has expired. Open the task again.|Potwierdzenie wygasło. Otwórz zadanie ponownie.
Are you still playing?|Nadal grasz?
Confirm your presence to continue. Round time and overtime charges continue while this prompt is open.|Potwierdź obecność, aby kontynuować. Czas rundy i opłaty za dodatkowy czas są naliczane także podczas wyświetlania tego okna.
I am here|Jestem tutaj
Path network level complete!|Ukończono poziom sieci ścieżek!
Path section upgraded|Ulepszono odcinek ścieżki
Active play|Aktywna gra
Material production ×2|Produkcja materiałów ×2
All material production|Cała produkcja materiałów
Meaningful activity in the focused visible game keeps this benefit active for five minutes. It combines with the Lighthouse production bonus.|Rzeczywista aktywność w widocznej, aktywnej grze utrzymuje tę premię przez pięć minut. Łączy się z premią produkcji latarni.
Activity must come from the visible, focused game.|Aktywność musi pochodzić z widocznej, aktywnej gry.
Active play refreshed for five minutes.|Odnowiono aktywną grę na pięć minut.
This tutorial lesson does not exist.|Ta lekcja samouczka nie istnieje.
Complete this lesson through its gameplay action.|Ukończ tę lekcję, wykonując odpowiednią czynność w grze.
This lesson has already been completed.|Ta lekcja została już ukończona.
Assign a producer before learning about their journey.|Przydziel pracownika produkcji, zanim poznasz jego drogę do pracy.
Lesson completed. Your reward is ready to claim.|Lekcja ukończona. Nagroda jest gotowa do odbioru.
This tutorial reward was already claimed.|Ta nagroda samouczka została już odebrana.
Complete this lesson before claiming its reward.|Ukończ lekcję przed odebraniem nagrody.
Tutorial reward received.|Odebrano nagrodę samouczka.
`);

const rules = [];
function rule(pattern, replacement) { rules.push([pattern, replacement]); }
function priorityRule(pattern, replacement) { rules.unshift([pattern, replacement]); }
const tr = text => translate(text, 'pl');
const plural = (number, one, few, many) => { const n = Math.abs(Number(String(number).replace(/[\s,]/g, ''))); return n === 1 ? one : Number.isInteger(n) && n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14) ? few : many; };
const coins = n => `${n} ${plural(n, 'moneta', 'monety', 'monet')}`;
const recipients = n => `${n} ${Number(String(n).replace(/[\s,]/g, '')) === 1 ? 'osoby' : 'osób'}`;
rule(/^Reward(?: received)?:\s*(.*)$/s, (_, value) => `Nagroda${_.startsWith('Reward received') ? ' otrzymana' : ''}: ${tr(value)}`);
rule(/^Reward ×(\d+):\s*(.*)$/s, (_, multiplier, value) => `Nagroda ×${multiplier}: ${tr(value)}`);
rule(/^(Bonus|Penalty|Status|Ended|Updated):\s*(.*)$/s, (_, prefix, value) => `${tr(prefix)}: ${tr(value)}`);
rule(/^(.*) — (details|stock|construction and upgrades|visits and upgrades)$/, (_, name, suffix) => `${tr(name)} — ${({ details: 'szczegóły', stock: 'zapas', 'construction and upgrades': 'budowa i rozbudowa', 'visits and upgrades': 'zwiedzanie i rozbudowa' })[suffix]}`);
rule(/^Resident #?(\d+)(.*)$/s, (_, id, rest) => `Mieszkaniec #${id}${tr(rest)}`);
rule(/^All ([\d, ]+) residents$/, (_, n) => `Wszyscy mieszkańcy: ${n}`);
rule(/^([\d, ]+) (resident|residents)$/, (_, n) => `${n} ${plural(n, 'mieszkaniec', 'mieszkańcy', 'mieszkańców')}`);
rule(/^Level ([\d, ]+)(.*)$/s, (_, n, rest) => `Poziom ${n}${tr(rest)}`);
rule(/^Lv\. ([\d, ]+)$/, (_, n) => `Poz. ${n}`);
rule(/^Day (\d+)(.*)$/s, (_, n, rest) => `Dzień ${n}${tr(rest)}`);
rule(/^(.*), level (\d+)(.*)$/s, (_, name, level, rest) => `${tr(name)}, poziom ${level}${tr(rest)}`);
rule(/^Next level:\s*(\d+)$/, (_, n) => `Kolejny poziom: ${n}`);
rule(/^Upgrade to level (\d+)$/, (_, n) => `Rozbudowa do poziomu ${n}`);
rule(/^Upgrade the Town Hall to level (\d+) first\.$/, (_, n) => `Najpierw ulepsz ratusz do poziomu ${n}.`);
rule(/^Town Hall level (\d+) allows other buildings to reach the same level\.$/, (_, n) => `Ratusz poziomu ${n} pozwala rozbudowywać pozostałe budynki do tego samego poziomu.`);
rule(/^Available (?:at|from) Town Hall level (\d+)\.$/, (_, n) => `Dostępne od ${n}. poziomu ratusza.`);
rule(/^This building unlocks at level (\d+)\.$/, (_, n) => `Ten budynek jest dostępny od poziomu ${n}.`);
rule(/^The House provides ([\d, ]+) beds\.$/, (_, n) => `Dom zapewnia ${n} miejsc mieszkalnych.`);
rule(/^([\d, ]+) residents · ([\d, ]+) beds$/, (_, people, beds) => `${people} mieszkańców · ${beds} łóżek`);
rule(/^Housing:\s*(.*)$/, (_, value) => `Miejsca mieszkalne: ${value}`);
rule(/^Working:\s*(.*)$/s, (_, value) => `Pracujący: ${tr(value.replace(/, arriving:/g, ', przybywający:').replace(/, returning home:/g, ', wracający do domu:'))}`);
rule(/^Working: ([\d, ]+)(.*)$/s, (_, n, rest) => `Pracujący: ${n}${tr(rest)}`);
rule(/^Workers arrive in (.*)$/, (_, duration) => `Pracownicy dotrą za ${tr(duration)}`);
rule(/^Arriving in (.*)$/, (_, duration) => `Przybycie za ${tr(duration)}`);
rule(/^Walking to (.*?)( · .*)?$/, (_, building, rest = '') => `W drodze: ${tr(building)}${tr(rest)}`);
rule(/^Returning home · (.*)$/, (_, duration) => `Powrót do domu · ${tr(duration)}`);
rule(/^Next worker returns in (.*)$/, (_, duration) => `Kolejny pracownik wróci za ${tr(duration)}`);
rule(/^Next unit in (.*?)(\.)?$/, (_, duration, dot = '') => `Następna sztuka za ${tr(duration)}${dot}`);
rule(/^Waiting for (Wood|Stone|Food|Grain|Planks)$/, (_, name) => `Oczekiwanie na zasób: ${tr(name)}`);
rule(/^([\d,. ]+) units\/h$/, (_, n) => `${n} szt./godz.`);
rule(/^([\d,. ]+) food\/h$/, (_, n) => `${n} żywności/godz.`);
rule(/^([\d,. ]+) carriers · ([\d,. ]+) per trip$/, (_, crew, load) => `Tragarze: ${crew} · ${load} na kurs`);
rule(/^([\d,. ]+) carriers ready for their next delivery\.$/, (_, n) => `Tragarze gotowi do kolejnej dostawy: ${n}.`);
rule(/^([\d,. ]+) residents currently producing at (.*)$/, (_, n, building) => `Obecnie produkujący: ${n} · ${tr(building)}`);
rule(/^([\d,. ]+) (.*) to local storage in (.*)$/, (_, n, resource, duration) => `Do magazynu przy budynku: ${n} ${tr(resource)} za ${tr(duration)}`);
rule(/^([\d,. ]+) (delivery|deliveries) in progress · next completes in (.*)$/, (_, n, _delivery, duration) => `Dostawy w toku: ${n} · kolejna zakończy się za ${tr(duration)}`);
rule(/^No workers are returning home\.$/, () => 'Żaden pracownik nie wraca do domu.');
rule(/^Construction:\s*(.*?) · Queue:\s*(.*)$/s, (_, active, queued) => `Budowa: ${tr(active)} · Kolejka: ${tr(queued)}`);
rule(/^Building level (\d+): (.*) remaining\.$/, (_, level, duration) => `Budowa poziomu ${level}: pozostało ${tr(duration)}.`);
rule(/^Plan waiting for materials · estimated deliveries (.*)\.$/, (_, duration) => `Plan czeka na materiały · szacowane dostawy za ${tr(duration)}.`);
rule(/^Transport for level (\d+): (.*?) delivered\.(.*)$/s, (_, level, amounts, rest) => `Transport dla poziomu ${level}: dostarczono ${amounts}.${tr(rest)}`);
rule(/^Transport (.*?) · construction (.*?)\.$/, (_, transport, building) => `Transport: ${tr(transport)} · budowa: ${tr(building)}.`);
rule(/^Transport (.*?) \+ building (.*)$/, (_, transport, building) => `Transport ${tr(transport)} + budowa ${tr(building)}`);
rule(/^(Transport|Construction) · ETA: (.*)$/, (_, phase, duration) => `${tr(phase)} · do końca: ${tr(duration)}`);
rule(/^Estimated transport: (.*?)\. Building phase: (.*?)\. Total: (.*?)\. Changes to staffing or delivery priorities recalculate this estimate\.$/, (_, transport, building, total) => `Szacowany transport: ${tr(transport)}. Budowa: ${tr(building)}. Łącznie: ${tr(total)}. Zmiana obsady lub priorytetów dostaw aktualizuje szacunek.`);
rule(/^([^:]+): in storage (.*?), required (.*?); (enough|short)$/, (_, name, have, need, status) => `${tr(name)}: w magazynie ${have}, potrzeba ${need}; ${status === 'enough' ? 'wystarcza' : 'brakuje'}`);
rule(/^(Release worker|Assign worker|Assign to limit|Release all|Prioritize|Move up|Move down):?\s*(.*)$/, (_, action, building) => `${({ 'Release worker':'Zwolnij pracownika', 'Assign worker':'Przydziel pracownika', 'Assign to limit':'Przydziel do limitu', 'Release all':'Zwolnij wszystkich', Prioritize:'Ustaw priorytet', 'Move up':'Przesuń wyżej', 'Move down':'Przesuń niżej' })[action]}${building ? `: ${tr(building)}` : ''}`);
rule(/^([\d, ]+) visitors return in (.*)\. This visit cannot be recalled\.$/, (_, n, duration) => `Zwiedzający wrócą za ${tr(duration)}: ${n} osób. Nie można ich odwołać.`);
rule(/^([\d, ]+) selected \/ ([\d, ]+) free places$/, (_, selected, free) => `Wybrano ${selected} / wolne miejsca: ${free}`);
rule(/^Send resident (\d+) to Lighthouse$/, (_, id) => `Wyślij mieszkańca ${id} na zwiedzanie latarni`);
rule(/^Buy visit package (\d*)$/, (_, n) => `Kup pakiet zwiedzania ${n}`.trim());
rule(/^Rolling 24-hour entries: (\d+) free \+ (\d+) paid\. Free entries: (\d+) per 24 hours; (\d+) extra packages remain\.$/, (_, free, paid, limit, packages) => `Wejścia w ostatnich 24 godzinach: ${free} darmowych + ${paid} płatnych. Darmowy limit: ${limit} na 24 godziny; pozostałe dodatkowe pakiety: ${packages}.`);
rule(/^Paid blessing · ([\d, ]+) coins$/, (_, n) => `Płatne błogosławieństwo · ${coins(n)}`);
rule(/^Blessing: \+20 happiness for (.*?)\.$/, (_, duration) => `Błogosławieństwo: +20 szczęścia przez ${tr(duration)}.`);
rule(/^Uses remaining: (\d+)\.$/, (_, n) => `Pozostałe użycia: ${n}.`);
rule(/^Next paid blessing in (.*)\.$/, (_, duration) => `Kolejne płatne błogosławieństwo za ${tr(duration)}.`);
rule(/^Upgrade bonus: (.*?) remaining, \+(\d+) happiness\.$/, (_, duration, n) => `Premia za rozbudowę: pozostało ${tr(duration)}, +${n} szczęścia.`);
rule(/^Lighthouse upgrade bonus: everyone has 100% happiness and material production ×2\. Remaining: (.*)\.$/, (_, duration) => `Premia za rozbudowę latarni: szczęście mieszkańców 100% i produkcja materiałów ×2. Pozostało ${tr(duration)}.`);
rule(/^Full benefit returns in (.*)$/, (_, duration) => `Pełny efekt wróci za ${tr(duration)}`);
rule(/^Finish all 100 sections of level (\d+) first\.$/, (_, level) => `Najpierw ukończ wszystkie 100 odcinków poziomu ${level}.`);
rule(/^Paths level (\d+): (\d+) of 100 sections\. Upgrade one section for 100 Stone$/, (_, level, n) => `Ścieżki poziomu ${level}: ${n} ze 100 odcinków. Ulepsz odcinek za 100 kamienia`);
rule(/^Paths: level (\d+), \+(\d+)% carrier speed, \+(\d+)% load$/, (_, level, speed, load) => `Ścieżki: poziom ${level}, +${speed}% szybkości tragarzy, +${load}% ładowności`);
rule(/^All paths reached level (\d+)$/, (_, n) => `Wszystkie ścieżki osiągnęły poziom ${n}`);
rule(/^Path level (\d+): (\d+) \/ 100 sections upgraded\.$/, (_, level, n) => `Ścieżki poziomu ${level}: ulepszono ${n} / 100 odcinków.`);
rule(/^Carrier transport speed \+(\d+)%; carrying capacity \+(\d+)%\.$/, (_, speed, load) => `Szybkość tragarzy +${speed}%; ładowność +${load}%.`);
rule(/^Upgrade all 100 paths to level (\d+) before starting a higher level\.$/, (_, n) => `Ulepsz wszystkie 100 odcinków do poziomu ${n} przed rozpoczęciem wyższego.`);
rule(/^(.+): familiarity$/, (_, title) => `${tr(title)}: przyzwyczajenie`);
rule(/^(.+): production blockage$/, (_, title) => `${tr(title)}: blokada produkcji`);
rule(/^Next purchase gives (\d+)% of its original happiness bonus$/, (_, n) => `Kolejny zakup daje ${n}% pierwotnej premii do szczęścia`);
rule(/^All 100 path sections have reached level (\d+)\. Travel time is divided by (.*?)\; ship voyages and residents walking to work keep their own rules\.$/, (_, level, factor) => `Wszystkie 100 odcinków osiągnęło poziom ${level}. Czas transportu jest dzielony przez ${factor}; rejsy i droga mieszkańców do pracy zachowują własne zasady.`);
rule(/^([\d, ]+) residents have no bed\. Each missing bed adds a one-point hourly happiness penalty to eligible residents\.$/, (_, n) => `Mieszkańcy bez łóżka: ${n}. Każde brakujące łóżko dodaje uprawnionym mieszkańcom karę jednego punktu szczęścia na godzinę.`);
rule(/^Next resident in (.*)$/, (_, duration) => `Nowy mieszkaniec za ${tr(duration)}`);
rule(/^Population capacity of (\d+) reached\. Upgrade the Town Hall to increase capacity\.$/, (_, n) => `Osiągnięto limit ${n} mieszkańców. Ulepsz ratusz, aby zwiększyć limit.`);
rule(/^Everyone has a home: (.*?) spaces occupied\. No overcrowding penalty\.$/, (_, amounts) => `Każdy ma miejsce w domu: zajęto ${amounts} miejsc. Brak kary za przeludnienie.`);
rule(/^Overcrowding: (\d+) residents have no home\. Happiness falls by (\d+) percentage points per real hour\.$/, (_, n, loss) => `Przeludnienie: mieszkańcy bez miejsca w domu: ${n}. Szczęście spada o ${loss} punktów procentowych na godzinę czasu rzeczywistego.`);
rule(/^Storage full: −(\d+) happiness for each worker here\. Work is waiting for space\.$/, (_, loss) => `Pełny magazyn: −${loss} szczęścia dla każdego pracownika tutaj. Praca czeka na wolne miejsce.`);
rule(/^Growth · \+([\d,. ]+) residents\/h$/, (_, n) => `Przyrost · +${n} mieszkańców/godz.`);
rule(/^Decline · −([\d,. ]+) residents\/h$/, (_, n) => `Spadek · −${n} mieszkańców/godz.`);
rule(/^Central: (.*?) · Harbor: (.*?)$/, (_, central, port) => `Magazyn centralny: ${central} · port: ${port}`);
rule(/^Sell 100 → ([\d, ]+) coins$/, (_, n) => `Sprzedaj 100 → ${coins(n)}`);
rule(/^Buy 100 for ([\d, ]+) coins$/, (_, n) => `Kup 100 za ${n} monet`);
rule(/^(Purchase|Sale): (\d+) (.*)$/, (_, direction, amount, resource) => `${direction === 'Purchase' ? 'Zakup' : 'Sprzedaż'}: ${amount} ${tr(resource)}`);
rule(/^Stage: (\w+) · agreed price ([\d, ]+) coins(.*)$/, (_, phase, price, rest) => `Etap: ${tr(phase)} · uzgodniona cena: ${coins(price)}${tr(rest)}`);
rule(/^Delivery to Market: (.*)$/, (_, name) => `Dostawa na targ: ${tr(name)}`);
rule(/^([\d, ]+) remaining$/, (_, n) => `Pozostało: ${n}`);
rule(/^(.+) · ([\d, ]+) coins$/, (_, label, n) => `${tr(label)} · ${coins(n)}`);
rule(/^([\d, ]+) coins$/, (_, n) => coins(n));
rule(/^Shorten building time by (\d+)%$/, (_, n) => `Skróć budowę o ${n}%`);
rule(/^Cash out ([\d, ]+) coins$/, (_, n) => `Wypłać ${n} monet`);
rule(/^Risk ([\d, ]+) for ([\d, ]+)$/, (_, current, next) => `Zaryzykuj ${current}, aby zdobyć ${next}`);
rule(/^Leaving now pays ([\d, ]+) coins into your island treasury\.$/, (_, n) => `Wyjście wypłaci ${n} monet do skarbca wyspy.`);
rule(/^Leaving during this round loses the unclaimed pot of ([\d, ]+) coins\.$/, (_, n) => `Wyjście podczas tej rundy spowoduje utratę nieodebranej puli ${n} monet.`);
rule(/^Confirm in (.*)$/, (_, duration) => `Potwierdź w ciągu ${tr(duration)}`);
rule(/^Time left: (.*)$/, (_, duration) => `Pozostały czas: ${tr(duration)}`);
rule(/^Overtime: (.*)$/, (_, duration) => `Dodatkowy czas: ${tr(duration)}`);
rule(/^Potential pot: ([\d, ]+) coins$/, (_, n) => `Potencjalna pula: ${coins(n)}`);
rule(/^Penalty: −([\d, ]+) coins$/, (_, n) => `Kara: −${n} monet`);
rule(/^Moves used: (\d+)(.*)$/, (_, n, rest) => `Wykonane ruchy: ${n}${tr(rest)}`);
rule(/^(.+), row (\d+), column (\d+)$/, (_, tile, row, col) => `${tr(tile)}, wiersz ${row}, kolumna ${col}`);
rule(/^(Start task · reward|Start task · bonus|Active · bonus|Resume task · bonus|Bonus locked|Accept task · reward|View · bonus|Deliver · bonus) ×(\d+)$/, (_, label, multiplier) => `${({ 'Start task · reward':'Rozpocznij zadanie · nagroda', 'Start task · bonus':'Rozpocznij zadanie · premia', 'Active · bonus':'Aktywne · premia', 'Resume task · bonus':'Wznów zadanie · premia', 'Bonus locked':'Zapisana premia', 'Accept task · reward':'Przyjmij zadanie · nagroda', 'View · bonus':'Zobacz · premia', 'Deliver · bonus':'Przekaż · premia' })[label]} ×${multiplier}`);
rule(/^([\d, ]+) remaining happiness points were given to the least happy residents\.$/, (_, n) => `Pozostałe punkty szczęścia przekazano najmniej szczęśliwym mieszkańcom: ${n}.`);
rule(/^([\d, ]+) happiness points are available for the next 24 hours\.$/, (_, n) => `Punkty szczęścia dostępne na kolejne 24 godziny: ${n}.`);
rule(/^Distributed ([\d, ]+) House happiness points\.$/, (_, n) => `Rozdzielono ${n} punktów szczęścia domu.`);
rule(/^Resident (\d+) received (\d+) happiness points\.$/, (_, id, n) => `Mieszkaniec ${id} otrzymał ${n} punktów szczęścia.`);
rule(/^([\d, ]+) happiness points were given to ([\d, ]+) residents\.$/, (_, points, people) => `Przekazano ${points} punktów szczęścia mieszkańcom: ${people}.`);
// Reusable short fragments also cover value-only nodes and messages assembled
// by the simulation. Longer complete sentences above always take precedence.
entries(`
Day|Dzień
All|Wszystkie
Small|Małe
Medium|Średnie
Large|Duże
12 × building level|12 × poziom budynku
Minimum population of 6 reached. Population cannot fall further; production and development remain available.|Osiągnięto minimum 6 mieszkańców. Populacja nie może spaść niżej; produkcja i rozwój nadal działają.
0% happiness · no population growth or decline.|0% szczęścia · populacja nie rośnie ani nie maleje.
Overcrowding lowers happiness and may cause population decline.|Przeludnienie obniża szczęście i może powodować spadek populacji.
Overcrowding changes this rate.|Przeludnienie zmienia to tempo.
Estimate at current happiness:|Szacunek przy obecnym szczęściu:
A new resident|Nowy mieszkaniec
One resident leaves|Odejście mieszkańca
Next paid blessing in|Kolejne płatne błogosławieństwo za
No active attempt|Brak aktywnej próby
Practice: move limit pending|Tryb próbny: limit ruchów nieustalony
Active · bonus|Aktywne · premia
Offers refresh in|Oferta odnowi się za
Full benefit returns in|Pełny efekt wróci za
Reward received:|Otrzymana nagroda:
Deliveries waiting for space:|Dostawy czekające na miejsce:
Next pool|Odnowienie puli
Give points|Przekaż punkty
Give everyone +1 pp|Daj wszystkim +1 p.p.
Points remaining|Pozostałe punkty
House happiness|Szczęście domu
Resident to receive House happiness|Mieszkaniec otrzymujący punkty szczęścia domu
House happiness points to allocate|Punkty szczęścia domu do przekazania
Visitors have returned home. Their rewards are now active.|Zwiedzający wrócili do domu. Ich nagrody są teraz aktywne.
Hungry for|Głodny przez
Without work for|Bez pracy przez
Next visit in|Kolejne zwiedzanie za
Newborn: 0% for|Nowy mieszkaniec: 0% przez
100% bonus:|Premia 100%:
production blockage|blokada produkcji
carrying speed|szybkość transportu
carrying capacity|ładowność
carrier speed|szybkość tragarzy
speed|szybkość
load|ładowność
happiness|szczęście
happiness / h|szczęścia/godz.
pp happiness / h|p.p. szczęścia/godz.
pp happiness|p.p. szczęścia
percentage points/h|punktów procentowych/godz.
pp/h|p.p./godz.
pp|p.p.
units/h|szt./godz.
food/h|żywności/godz.
coins/h|monet/godz.
coin/h|moneta/godz.
residents/h|mieszkańców/godz.
coins|monety
wood|drewno
stone|kamień
grain|zboże
food|żywność
planks|deski
residents|mieszkańcy
resident|mieszkaniec
workers|pracownicy
worker|pracownik
carriers|tragarze
carrier|tragarz
available|dostępne
unlimited|bez limitu
Package active|Pakiet aktywny
in storage|w magazynie
required|wymagane
enough|wystarcza
short|brakuje
remaining|pozostało
delivered|dostarczono
upgrade in progress|rozbudowa trwa
goods awaiting pickup|towary czekają na odbiór
at Home|w domu
at home|w domu
free places|wolne miejsca
arriving|przybywający
returning home|wracający do domu
voyage|rejs
unloading|rozładunek
collecting|odbiór
supplying|dostawa
loading|załadunek
complete|ukończone
expired|wygasłe
planned|planowane
queued|w kolejce
transport|transport
building|budowa
active|aktywne
lost|przegrane
closed|zakończone
read|przeczytane
every 12 h|co 12 godz.
every 6 h|co 6 godz.
about every 1 h 43 min|około co 1 godz. 43 min
every 1 h|co 1 godz.
for 6 hours|przez 6 godzin
for 24 hours|przez 24 godziny
for one hour|przez godzinę
per real hour|na godzinę czasu rzeczywistego
for every resident|dla każdego mieszkańca
for all residents|dla wszystkich mieszkańców
new level|nowy poziom
before the deadline|przed terminem
Available on this active day|Dostępne w tym aktywnym dniu
`);
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let fragmentPattern, fragmentSize = 0;
function fragments() {
  if (!fragmentPattern || fragmentSize !== translations.size) {
    fragmentSize = translations.size;
    fragmentPattern = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${[...translations.keys()].sort((a,b) => b.length-a.length).map(escaped).join('|')})(?![\\p{L}\\p{N}_])`, 'gu');
  }
  return fragmentPattern;
}

function polishNumbers(text) {
  return text.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/g, (_, month, day, year, hour, minute, second, meridian) => {
    let date = `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
    if (hour !== undefined) { const h = meridian ? Number(hour) % 12 + (meridian === 'PM' ? 12 : 0) : Number(hour); date += `, ${String(h).padStart(2, '0')}:${minute}${second ? `:${second}` : ''}`; }
    return date;
  }).replace(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g, value => formatNumber(Number(value.replaceAll(',', '')), 'pl', { maximumFractionDigits: 8 }))
    .replace(/(?<![\d.,])\d+\.\d+(?![\d.,])/g, value => value.replace('.', ','))
    .replace(/(\d+) yr\b/g, (_, n) => `${n} ${plural(n, 'rok', 'lata', 'lat')}`)
    .replace(/(\d+) d\b/g, (_, n) => `${n} ${Number(n) === 1 ? 'dzień' : 'dni'}`)
    .replace(/(\d) h\b\.?/g, '$1 godz.');
}
export const untranslatedTexts = new Set();
const englishResidue = /\b(?:the|this|these|those|your|each|every|from|with|when|while|without|before|after|until|cannot|should|must|will|would|another|expiry|expires|completed|delivered|received|purchase|buy|sell|waiting|assign|carriers|workers|materials|coins|rewards|storage|upgrade|goods|needed|available|expired|finish|next|previous|risk|ready|uses|or|and|for|unloading|loading|pot)\b/i;
/** Translate an English source string. Does not alter IDs or arbitrary data. */
export function translate(value, language = 'en') {
  if (value === null || value === undefined) return '';
  const source = String(value);
  if (language !== 'pl' || !source.trim()) return source;
  const prefix = source.match(/^\s*/)[0], suffix = source.match(/\s*$/)[0];
  const core = source.trim();
  let result = translations.get(core);
  if (result === undefined) {
    for (const [pattern, replacement] of rules) {
      if (pattern.test(core)) { result = core.replace(pattern, replacement); break; }
    }
  }
  if (result === undefined) {
    // Status paragraphs often join a fixed sentence to a live counter. Resolve
    // each complete sentence before using short fragments, so "Uses remaining"
    // does not become a mixture such as "Uses pozostało".
    const sentences = core.split(/(?<=[.!?])(\s+)/);
    if (sentences.length > 1) result = sentences.map((piece, index) => index % 2 ? piece : translate(piece, 'pl')).join('');
  }
  if (result === undefined && core.includes(' · ')) result = core.split(' · ').map(piece => translate(piece, 'pl')).join(' · ');
  if (result === undefined) {
    // Complete mapped sentences embedded in a status paragraph are translated
    // before the shorter labels. This also handles sentence fragments in nodes.
    result = core.replace(fragments(), text => translations.get(text));
    result = result.replace(/\b(\d+) coins\b/g, (_, n) => coins(n))
      .replace(/\b(\d+) (?:residents|resident)\b/g, (_, n) => `${n} ${plural(n, 'mieszkaniec', 'mieszkańcy', 'mieszkańców')}`);
    if (result === core && /[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(core) && !/^HARBORLIGHT\b/.test(core)) untranslatedTexts.add(core);
  }
  // Report partial translations too. The old equality-only diagnostic missed
  // precisely the mixed Polish/English paragraphs this audit is meant to find.
  if (englishResidue.test(result)) untranslatedTexts.add(core);
  return prefix + polishNumbers(result) + suffix;
}

const textSources = new WeakMap(), attributeSources = new WeakMap();
const translatedAttributes = ['aria-label', 'aria-description', 'title', 'placeholder', 'alt', 'data-label'];
function sourceRecord(records, key, current, language) {
  let record = records.get(key);
  if (!record || current !== record.rendered) record = { source: current, rendered: null, language: null };
  if (record.language === language && record.rendered === current) return null;
  return record;
}
/** Reversible translation of rendered UI. Repeated calls preserve node identity,
 * form values, focus and the English source of text subsequently updated by UI.
 * Call after each render; it safely ignores script/style/code and explicit
 * data-i18n-ignore subtrees. All timers and live labels can remain English. */
export function translateDOM(root = globalThis.document?.body, language = 'en') {
  if (!root || !root.ownerDocument && root.nodeType !== 9) return;
  const doc = root.nodeType === 9 ? root : root.ownerDocument;
  const ignored = node => node.parentElement?.closest('script,style,code,pre,[data-i18n-ignore]');
  const filter = doc.defaultView?.NodeFilter || globalThis.NodeFilter;
  const walker = doc.createTreeWalker(root, filter?.SHOW_TEXT ?? 4);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue?.trim() || ignored(node)) continue;
    const record = sourceRecord(textSources, node, node.nodeValue, language);
    if (!record) continue;
    record.rendered = translate(record.source, language); record.language = language;
    if (node.nodeValue !== record.rendered) node.nodeValue = record.rendered;
    textSources.set(node, record);
  }
  const elements = root.nodeType === 1 ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')];
  for (const element of elements) {
    if (element.closest('script,style,code,pre,[data-i18n-ignore]')) continue;
    let records = attributeSources.get(element);
    if (!records) { records = new Map(); attributeSources.set(element, records); }
    for (const name of translatedAttributes) {
      if (!element.hasAttribute(name)) continue;
      const current = element.getAttribute(name), record = sourceRecord(records, name, current, language);
      if (!record) continue;
      record.rendered = translate(record.source, language); record.language = language;
      if (current !== record.rendered) element.setAttribute(name, record.rendered);
      records.set(name, record);
    }
  }
  if (root === doc || root === doc.body || root === doc.documentElement) {
    doc.documentElement.lang = language === 'pl' ? 'pl' : 'en';
    if (!doc.querySelector('title[data-i18n-ignore]')) {
      const record = sourceRecord(textSources, doc, doc.title, language);
      if (record) { record.rendered = translate(record.source, language); record.language = language; doc.title = record.rendered; textSources.set(doc, record); }
    }
  }
}
entries(`
Choose an expedition|Wybierz ekspedycję
Ship — harbor trade|Statek — handel w porcie
Current hourly balance|Bieżący bilans godzinowy
More information|Więcej informacji
Review sharing reward|Sprawdź nagrodę za udostępnienie
Choose a district to locate it on the island.|Wybierz dzielnicę, aby wskazać ją na wyspie.
Your progress|Twój postęp
Meaningful activity activates a five-minute production ×2 and taxes ×2 bonus.|Rzeczywista aktywność uruchamia pięciominutową premię produkcji ×2 i podatków ×2.
Introductory loyalty calendar|Początkowy kalendarz lojalnościowy
Verified social sharing is not connected yet.|Zweryfikowane udostępnianie w mediach społecznościowych nie jest jeszcze podłączone.
Legacy task reward recovered|Odzyskano nagrodę starszego zadania
Existing task rewards could not fit the current reward ranges. The new large reward preserves their ordering.|Poprzednie nagrody zadań nie mieściły się w nowych przedziałach. Nowa duża nagroda zachowuje ich kolejność.
One expedition series retained|Zachowano jedną serię ekspedycji
A legacy concurrent expedition was ended. Only one series can run at a time.|Zakończono starszą równoległą ekspedycję. Jednocześnie może trwać tylko jedna seria.
Expedition ended|Ekspedycja zakończona
Whole final coin, rounded up.|Końcowy koszt w pełnych monetach, zaokrąglony w górę.
Forecast construction quote.|Wycena planowanej budowy.
Achievement opened.|Otwarto osiągnięcie.
This achievement has already been resolved.|To osiągnięcie zostało już rozliczone.
Your coin balance cannot hold this bonus.|Twoje saldo monet nie pomieści tej premii.
Achievement bonus received|Odebrano premię za osiągnięcie
Sharing skipped. Your task reward is already yours.|Pominięto udostępnianie. Nagroda za zadanie już należy do ciebie.
Accept the task before contributing goods.|Przyjmij zadanie przed przekazaniem towarów.
Your coin balance cannot hold this reward.|Twoje saldo monet nie pomieści tej nagrody.
Share your completed task|Udostępnij ukończone zadanie
Finish or cash out the current expedition series before starting another.|Ukończ obecną serię ekspedycji lub wypłać jej pulę przed rozpoczęciem następnej.
There is no pending presence confirmation for this series.|Ta seria nie oczekuje na potwierdzenie obecności.
Presence confirmed. The expedition clock has continued while this prompt was open.|Potwierdzono obecność. Czas ekspedycji biegł także podczas wyświetlania tego okna.
There is no completed expedition pot to cash out.|Nie ma ukończonej puli ekspedycji do wypłaty.
Your coin balance cannot hold this pot.|Twoje saldo monet nie pomieści tej puli.
This expedition run has already ended.|Ta seria ekspedycji już się zakończyła.
This expedition stage has already been settled.|Ten etap ekspedycji został już rozliczony.
Recovering from hunger|Powrót do formy po głodzie
The introductory loyalty programme has ended.|Początkowy program lojalnościowy dobiegł końca.
Daily reward values have not been defined yet.|Wartości dziennych nagród nie zostały jeszcze ustalone.
Invalid publication event.|Nieprawidłowe zdarzenie publikacji.
This publication was already processed.|Ta publikacja została już rozliczona.
This publication belongs to a different account.|Ta publikacja należy do innego konta.
Verified publication processed|Rozliczono zweryfikowaną publikację
This publication was recorded; no additional reward is due.|Zapisano tę publikację; nie przysługuje dodatkowa nagroda.
Publication recorded.|Zapisano publikację.
Invalid referral account.|Nieprawidłowe konto poleconej osoby.
This referral belongs to a different account.|To polecenie należy do innego konta.
Invalid referral event time.|Nieprawidłowy czas zdarzenia polecenia.
The inviter does not match this account.|Polecający nie pasuje do tego konta.
This registered account already has an inviter.|To zarejestrowane konto ma już polecającego.
Invalid registration time.|Nieprawidłowy czas rejestracji.
Referral registration recorded. The inviter is fixed for this account.|Zapisano rejestrację z polecenia. Polecający jest przypisany do tego konta na stałe.
The referral event precedes registration.|Zdarzenie polecenia jest wcześniejsze niż rejestracja.
The first referral login was already rewarded.|Pierwsze logowanie poleconego gracza zostało już nagrodzone.
A referred player signed in|Polecony gracz się zalogował
The referred account must sign in first.|Polecone konto musi się najpierw zalogować.
This referral activity reward was already granted.|Ta nagroda za aktywność poleconego gracza została już przyznana.
The 30-day referral activity window has ended.|Minął 30-dniowy okres aktywności poleconego gracza.
Referral activity reward|Nagroda za aktywność poleconego gracza
Granted 500 of each material for referral activity.|Przyznano po 500 każdego materiału za aktywność poleconego gracza.
Loyalty reward values have not been defined yet.|Wartości nagród lojalnościowych nie zostały jeszcze ustalone.
The work benefit starts on arrival. A production blockage pauses this benefit.|Premia za pracę zaczyna działać po przybyciu. Zablokowana produkcja wstrzymuje tę premię.
You are still recovering from hunger.|Nadal wracasz do formy po głodzie.
Taxes|Podatki
Taxes per hour|Podatki na godzinę
Tax income|Wpływy z podatków
Production ×2 · taxes ×2|Produkcja ×2 · podatki ×2
Material production ×2 · taxes ×2|Produkcja materiałów ×2 · podatki ×2
All residents|Wszyscy mieszkańcy
Stock|Zapas
Next unit|Następna sztuka
Incoming|W drodze
Outgoing|Wysłane
Central|Centralnie
Local|Lokalnie
Name|Nazwa
Value|Wartość
Time|Czas
Scope|Zakres
Details|Szczegóły
`);
// Additional dynamic clauses introduced by the tutorial/challenge release.
rule(/^Confirm in (.*?) · reward ×(\d+)$/, (_, duration, multiplier) => `Potwierdź w ciągu ${tr(duration)} · nagroda ×${multiplier}`);
rule(/^([^:]+) information$/, (_, title) => `Informacje: ${tr(title)}`);
rule(/^(.+) contribution for (.+)$/, (_, resource, title) => `Darowizna: ${tr(resource)} · ${tr(title)}`);
rule(/^(.+) donation for (.+)$/, (_, resource, title) => `Darowizna: ${tr(resource)} · ${tr(title)}`);
rule(/^(.+): priority (\d+), remove priority$/, (_, resource, n) => `${tr(resource)}: priorytet ${n}, usuń priorytet`);
rule(/^Construction slots and the queue are full \((.*?)\)\. Wait for an upgrade to finish\.$/, (_, slots) => `Miejsca budowy i kolejka są pełne (${slots}). Poczekaj na ukończenie rozbudowy.`);
rule(/^The package adds 4 construction slots, an unlimited queue and plans based on future deliveries\. Expires (.*)\.$/, (_, date) => `Pakiet dodaje 4 miejsca budowy, nieograniczoną kolejkę i planowanie przyszłych dostaw. Wygasa: ${date}.`);
rule(/^24 hours for ([\d, ]+) coins: \+4 active construction places, unlimited queue and planning from forecast deliveries\. Renewing adds another 24 hours to the remaining duration\. Queued material costs include a 10% surcharge\.$/, (_, n) => `24 godziny za ${n} monet: +4 miejsca budowy, nieograniczona kolejka i planowanie przyszłych dostaw. Odnowienie dodaje kolejne 24 godziny do pozostałego czasu. Koszty materiałów w kolejce uwzględniają dopłatę 10%.`);
rule(/^Each fed worker produces ([\d,. ]+) units per hour at this building level\. Hunger halves output immediately\. The Lighthouse bonus doubles material production\. Local storage holds 200 units per building level\. Storage shows current stock \/ current capacity \/ capacity after one upgrade\. Carriers carry one material per trip\. The base round trip takes 5 minutes; path levels increase carrier speed and, from level 3, load\. Workplace upgrades also increase load\.$/, (_, rate) => `Na tym poziomie budynku każdy najedzony pracownik produkuje ${rate} sztuk na godzinę. Głód od razu zmniejsza wydajność o połowę. Premia latarni podwaja produkcję materiałów. Magazyn lokalny mieści 200 sztuk na poziom budynku. Wyświetlane są: zapas / obecna pojemność / pojemność po ulepszeniu. Tragarze przewożą jeden materiał na kurs. Podstawowy kurs w obie strony trwa 5 minut; poziomy ścieżek zwiększają szybkość tragarzy, a od poziomu 3 także ładowność. Rozbudowa miejsca pracy również zwiększa ładowność.`);
rule(/^Each (.+) requires (\d+) (.+) from the central warehouse \(2:1\)\.$/, (_, output, amount, input) => `Produkt: ${tr(output)}. Każda sztuka wymaga ${amount} ${tr(input)} z magazynu centralnego (2:1).`);
rule(/^Per unit: (\d+) (.+) from the central warehouse → 1 (.+)\.$/, (_, amount, input, output) => `Na sztukę: ${amount} ${tr(input)} z magazynu centralnego → 1 ${tr(output)}.`);
rule(/^Missing central warehouse input: (\d+) (.+) per unit\.$/, (_, amount, input) => `Brak surowca w magazynie centralnym: ${amount} ${tr(input)} na sztukę.`);
rule(/^(\d+) (.+) needed from central storage per unit\.$/, (_, amount, input) => `Na sztukę potrzeba z magazynu centralnego: ${amount} ${tr(input)}.`);
rule(/^(.+) — stock in the (treasury|central warehouse): (.*)\.$/, (_, resource, place, amount) => `${tr(resource)} — zapas ${place === 'treasury' ? 'w skarbcu' : 'w magazynie centralnym'}: ${amount}.`);
rule(/^Leaving now pays ([\d, ]+) coins into your island treasury\.$/, (_, n) => `Wyjście wypłaci ${n} monet do skarbca wyspy.`);
rule(/^Leaving during this round loses the unclaimed pot of ([\d, ]+) coins\.$/, (_, n) => `Wyjście podczas tej rundy spowoduje utratę nieodebranej puli ${n} monet.`);

entries(`
HARBORLIGHT — Your Island|HARBORLIGHT — Twoja wyspa
`);
entries(`
This completed task achievement is not available.|To osiągnięcie ukończonego zadania jest niedostępne.
Task confirmation cancelled. No task was started.|Anulowano potwierdzenie. Nie rozpoczęto żadnego zadania.
This lighthouse task is no longer available.|To zadanie latarni nie jest już dostępne.
This lighthouse task has expired.|Termin tego zadania latarni minął.
This task is already active.|To zadanie jest już aktywne.
Finish the active task or wait for it to expire before starting another.|Ukończ aktywne zadanie lub poczekaj na upływ jego terminu przed rozpoczęciem kolejnego.
Confirm within 60 seconds to start this task. Its first-click reward multiplier is reserved in this draft.|Potwierdź w ciągu 60 sekund, aby rozpocząć zadanie. Mnożnik nagrody z pierwszego kliknięcia jest zapisany w tym potwierdzeniu.
This confirmation expired. Open the task again to make a new choice.|Potwierdzenie wygasło. Otwórz zadanie ponownie, aby dokonać nowego wyboru.
Only the active task can receive contributions.|Towary można przekazywać tylko do aktywnego zadania.
Enter a positive whole quantity of a required material.|Podaj dodatnią całkowitą ilość wymaganego materiału.
This contribution exceeds the remaining requirement.|Ta darowizna przekracza pozostałą wymaganą ilość.
Keep the protected food reserve in the central warehouse.|Zachowaj chronioną rezerwę żywności w magazynie centralnym.
Not enough goods in the central warehouse.|W magazynie centralnym brakuje towarów.
Share for the prototype 500-coin bonus or choose Skip. This decision remains available in Notifications until resolved.|Wybierz udostępnienie za premię 500 monet w wersji podglądowej lub Pomiń. Ta decyzja pozostaje dostępna w Powiadomieniach do rozstrzygnięcia.
Lighthouse task complete. Reward received and a new task is available.|Ukończono zadanie latarni. Przyznano nagrodę i dostępne jest nowe zadanie.
Contribution delivered. Contributions cannot be withdrawn.|Przekazano darowiznę. Nie można jej wycofać.
Not enough coins for this acceleration.|Za mało monet na to przyspieszenie.
Expedition started for free. The first timely win earns a pot of 50 coins.|Ekspedycja rozpoczęta bez opłat. Pierwsze zwycięstwo w czasie daje pulę 50 monet.
This expedition run is no longer available.|Ta seria ekspedycji nie jest już dostępna.
Complete the current level before continuing.|Ukończ obecny poziom przed kontynuowaniem.
Confirm your presence before starting the next round.|Potwierdź obecność przed rozpoczęciem następnej rundy.
Cash out the current pot before starting another series.|Wypłać obecną pulę przed rozpoczęciem kolejnej serii.
The expedition ended. The unclaimed pot was lost.|Ekspedycja zakończona. Nieodebrana pula przepadła.
Confirm your presence before completing this round.|Potwierdź obecność przed ukończeniem tej rundy.
Complete a valid route to the expedition goal.|Ukończ prawidłową trasę do celu ekspedycji.
Overtime consumed the whole potential pot.|Dodatkowy czas pochłonął całą potencjalną pulę.
Time cannot be bought. Overtime automatically reduces the potential pot by 10 coins per whole second. Rewarded ads remain a future feature.|Nie można kupić czasu. Dodatkowy czas automatycznie zmniejsza potencjalną pulę o 10 monet za każdą pełną sekundę. Reklamy z nagrodami pojawią się w przyszłości.
Choose an existing construction project.|Wybierz istniejącą budowę.
A project cannot be cancelled after the first material pickup or the start of building.|Nie można anulować zlecenia po pierwszym odbiorze materiału lub rozpoczęciu budowy.
Cancel later upgrades of this building first.|Najpierw anuluj późniejsze rozbudowy tego budynku.
Construction cancelled. Reserved materials and the building coin cost are available again.|Anulowano budowę. Zarezerwowane materiały i monety za budynek są ponownie dostępne.
Harbor trading unlocks at Town Hall level 4.|Handel w porcie jest dostępny od 4. poziomu ratusza.
Trade whole batches of 100 materials.|Handluj pełnymi partiami po 100 sztuk materiałów.
Not enough harbor capacity for this order.|W porcie brakuje miejsca na to zlecenie.
Not enough coins for this order.|Za mało monet na to zlecenie.
This sale would spend the protected food reserve.|Ta sprzedaż naruszyłaby chronioną rezerwę żywności.
Not enough unreserved goods in the warehouse.|W magazynie brakuje niezarezerwowanych towarów.
Harbor quote. The price is frozen when you confirm the order.|Wycena portowa. Cena jest ustalana przy potwierdzeniu zlecenia.
Choose up to three different transport priorities.|Wybierz do trzech różnych priorytetów transportu.
Choose goods or Construction to prioritize.|Wybierz towary lub budowę jako priorytet.
Only three priorities can be active. Remove one before choosing another.|Mogą działać tylko trzy priorytety. Usuń jeden przed dodaniem kolejnego.
Transport priorities updated. Their ten-course distribution repeats until you change them.|Zmieniono priorytety transportu. Ich podział na dziesięć kursów jest powtarzany do kolejnej zmiany.
Transport priorities cleared. Carriers use the regular source order.|Usunięto priorytety transportu. Tragarze korzystają ze zwykłej kolejności źródeł.
Choose a producer or construction project.|Wybierz producenta lub budowę.
Invalid priority direction.|Nieprawidłowy kierunek zmiany priorytetu.
This priority is already at the end of the list.|Ten priorytet jest już na końcu listy.
Enter a whole material quantity.|Podaj całkowitą ilość materiału.
Protect the warehouse food reserve.|Zachowaj rezerwę żywności magazynu.
Not enough market capacity for this delivery.|Na targu brakuje miejsca na tę dostawę.
Market workers will carry these goods. Each delivery is locked for one hour and expires after 24 hours.|Pracownicy targu przeniosą te towary. Każda dostawa jest zablokowana na godzinę i przepada po 24 godzinach.
Exchange batches of 10 to receive 9 after the 10% margin.|Wymieniaj partie po 10 sztuk, aby otrzymać 9 po prowizji 10%.
Not enough unlocked, unreserved goods in the market.|Na targu brakuje odblokowanych, niezarezerwowanych towarów.
Market workers will carry the goods back to the central warehouse.|Pracownicy targu odniosą towary do magazynu centralnego.
Choose a producer.|Wybierz producenta.
Choose an upgrade waiting for materials.|Wybierz rozbudowę oczekującą na materiały.
The remaining delivery schedule could not be estimated.|Nie udało się oszacować harmonogramu pozostałych dostaw.
Not enough goods above the protected food reserve.|Brakuje towarów poza chronioną rezerwą żywności.
Not enough market capacity.|Na targu brakuje miejsca.
Not enough unlocked market goods.|Na targu brakuje odblokowanych towarów.
Choose a supported transport route.|Wybierz obsługiwaną trasę transportu.
There are no goods waiting on this route.|Na tej trasie nie ma oczekujących towarów.
Make room in the central warehouse before sending this whole batch.|Zwolnij miejsce w magazynie centralnym przed wysłaniem całej partii.
Goods transported instantly.|Towary przewieziono natychmiast.
central warehouse|magazyn centralny
`);
rule(/^Task accepted\. Reward multiplier ×(\d+) is locked\. The active task cannot be cancelled\.$/, (_, n) => `Przyjęto zadanie. Zapisano mnożnik nagrody ×${n}. Aktywnego zadania nie można anulować.`);
rule(/^Achievement bonus received: (\d+) coins\.$/, (_, n) => `Odebrano premię za osiągnięcie: ${n} monet.`);
rule(/^\+(\d+) coins for choosing to share your completed task\. Facebook publishing is not connected yet\.$/, (_, n) => `+${n} monet za wybór udostępnienia ukończonego zadania. Publikowanie na Facebooku nie jest jeszcze podłączone.`);
rule(/^Construction shortened by (\d+) seconds for (\d+) coins\.$/, (_, seconds, price) => `Skrócono budowę o ${seconds} sekund za ${price} monet.`);
rule(/^Building purchased for (\d+) coins\. It will be ready in 10 seconds\.$/, (_, n) => `Kupiono budynek za ${n} monet. Będzie gotowy za 10 sekund.`);
rule(/^Expected-delivery plan scheduled\. Fee: (\d+) coins\.$/, (_, n) => `Zaplanowano przyszłe dostawy. Opłata: ${n} monet.`);
rule(/^The entire (\d+)-coin pot is now at risk\. A timely win adds 50 coins to its actual remainder\.$/, (_, n) => `Cała pula ${n} monet jest teraz stawką. Zwycięstwo w czasie dodaje 50 monet do jej rzeczywistej pozostałości.`);
rule(/^Cashed out (\d+) expedition coins to your island\.$/, (_, n) => `Wypłacono na wyspę ${n} monet z ekspedycji.`);
rule(/^Level (\d+) complete\. Pot: (\d+) coins\. Cash out or risk it on the next level\.$/, (_, level, n) => `Poziom ${level} ukończony. Pula: ${n} monet. Wypłać ją lub zaryzykuj na następnym poziomie.`);
rule(/^Order paid: (\d+) coins\. Ship arrives in 5 minutes\.$/, (_, n) => `Opłacono zlecenie: ${n} monet. Statek przypłynie za 5 minut.`);
rule(/^Sale reserved\. Payment of (\d+) coins follows loading and departure\.$/, (_, n) => `Zarezerwowano sprzedaż. Zapłata ${n} monet nastąpi po załadunku i wypłynięciu.`);
rule(/^Exchanged (\d+) (\w+) for (\d+) (\w+)\. The new goods expire in 24 hours\.$/, (_, amount, from, output, to) => `Wymieniono ${amount} ${tr(from)} na ${output} ${tr(to)}. Nowe towary wygasną za 24 godziny.`);
rule(/^(.*) Cost: (\d+) coins\.$/s, (_, message, n) => `${tr(message)} Koszt: ${n} monet.`);
entries(`
LOCAL / CENTRAL (IN TRANSIT)|LOKALNIE / CENTRALNIE (W TRANSPORCIE)
Local / Central (in transit)|Lokalnie / Centralnie (w transporcie)
Active tutorial days|Aktywne dni samouczka
Tutorial rewards claimed|Odebrane nagrody samouczka
Meaningful activity activates a five-minute production ×2 bonus.|Rzeczywista aktywność uruchamia pięciominutową premię produkcji ×2.
Overtime costs 10 coins from the potential reward per whole second. Ads are a future integration.|Dodatkowy czas kosztuje 10 monet z potencjalnej nagrody za każdą pełną sekundę. Integracja reklam pojawi się w przyszłości.
Expeditions award coins only. Each timely win adds 50 coins to the actual pot. Cash out or risk the entire remainder on the next level. Overtime removes 10 coins per whole second; a loss clears the pot.|Ekspedycje dają wyłącznie monety. Każde zwycięstwo w czasie dodaje 50 monet do rzeczywistej puli. Wypłać ją lub zaryzykuj całą pozostałość na następnym poziomie. Dodatkowy czas odejmuje 10 monet za każdą pełną sekundę; porażka zeruje pulę.
Presence was not confirmed. The unclaimed pot was lost.|Nie potwierdzono obecności. Nieodebrana pula przepadła.
Overtime consumed the potential pot.|Dodatkowy czas pochłonął potencjalną pulę.
At current happiness|Przy obecnym szczęściu
At-current-happiness estimate|Szacunek przy obecnym szczęściu
At current happiness; the estimate changes as happiness changes.|Przy obecnym szczęściu; szacunek zmienia się wraz ze szczęściem.
`);
rule(/^Active play: production ×2 for (.*?)\. Meaningful activity renews this five-minute bonus\.$/, (_, duration) => `Aktywna gra: produkcja ×2 przez ${tr(duration)}. Rzeczywista aktywność odnawia tę pięciominutową premię.`);

registerTranslations({
  'Cancel construction': 'Anuluj budowę',
  'Available only before the first pickup or building phase; cancel later upgrades first.': 'Dostępne tylko przed pierwszym odbiorem materiałów lub rozpoczęciem budowy; najpierw anuluj późniejsze rozbudowy.',
  'Construction cancelled. Reserved materials and the building coin cost are available again.': 'Anulowano budowę. Zarezerwowane materiały i koszt budynku w monetach są ponownie dostępne.',
  'A project cannot be cancelled after the first material pickup or the start of building.': 'Nie można anulować zlecenia po pierwszym odbiorze materiałów lub rozpoczęciu budowy.',
  'Cancel later upgrades of this building first.': 'Najpierw anuluj późniejsze rozbudowy tego budynku.'
});

registerTranslations({'Interactive island controls':'Interaktywne sterowanie wyspą'});

registerTranslations({
  'Island explorer':'Odkrywca wyspy',
  'Milestone publication verified':'Publikacja osiągnięcia potwierdzona',
  '500 coins after verified publication':'500 monet po potwierdzeniu publikacji',
  'Already verified':'Już potwierdzono',
  'Share milestone':'Udostępnij osiągnięcie',
  'Prepared milestone post':'Przygotowany wpis o osiągnięciu',
  'Share your level milestone':'Udostępnij osiągnięty poziom',
  'You control what is published. The 500-coin reward requires verified publication; verification is not connected yet. Opening or copying this post does not award coins.':'To ty decydujesz o publikacji. Nagroda 500 monet wymaga potwierdzenia publikacji; ta integracja nie jest jeszcze podłączona. Otwarcie lub skopiowanie wpisu nie przyznaje monet.',
  'Open share dialog':'Otwórz okno udostępniania',
  'The share dialog closed. Publication verification is not connected; no coins were awarded.':'Okno udostępniania zamknięto. Potwierdzanie publikacji nie jest podłączone; nie przyznano monet.',
  'Sharing cancelled. No coins were awarded.':'Anulowano udostępnianie. Nie przyznano monet.',
  'Use Copy post or the Facebook sharing link.':'Skopiuj wpis lub użyj linku do udostępniania na Facebooku.',
  'Copy post':'Skopiuj wpis',
  'Post copied. Publish it yourself; no coins were awarded.':'Skopiowano wpis. Opublikuj go samodzielnie; nie przyznano monet.',
  'Select and copy the prepared post.':'Zaznacz i skopiuj przygotowany wpis.',
  'Open Facebook sharing dialog':'Otwórz okno udostępniania na Facebooku'
});

registerTranslations({'Drag to explore the island':'Przeciągnij, aby zwiedzić wyspę','Island world — drag or use arrow keys to explore':'Wyspa — przeciągnij lub użyj strzałek, aby ją zwiedzić'});

registerTranslations({
  'Administration':'Administracja',
  'Economy':'Gospodarka',
  'Choose a workplace, then use + or − to change its team. New workers need five minutes to arrive.':'Wybierz budynek i użyj + lub −, aby zmienić obsadę. Nowi pracownicy docierają do pracy w pięć minut.',
  'Walking to work':'Idą do pracy',
  'Meals for everyone':'Posiłki mieszkańców',
  'Food available':'Posiłki zapewnione',
  'Food needed':'Potrzebna żywność',
  'Food per hour':'Żywność na godzinę',
  'Hunger penalty':'Kara za głód',
  'How meals work':'Jak działa wyżywienie',
  'The hunger penalty shows the loss for each affected resident and how many people are affected.':'Kara za głód pokazuje spadek szczęścia jednej głodującej osoby oraz liczbę osób objętych karą.',
  'Your workplaces':'Obsada budynków',
  'Assignment help':'Zasady przydzielania',
  'A recalled carrier finishes the delivery already in progress, then walks home for five minutes. Other released workers start their five-minute walk immediately. They become available again on arrival.':'Odwołany tragarz kończy rozpoczętą dostawę, a następnie wraca do domu przez pięć minut. Pozostali zwolnieni pracownicy wyruszają do domu od razu. Po powrocie można przydzielić ich ponownie.',
  'Residents and happiness':'Mieszkańcy i szczęście'
});

// Full sentences take precedence over the legacy short-fragment vocabulary.
// These cover live notifications as well as the visible/help UI, including
// messages restored from an older save after changing the interface language.
entries(`
Back|Wstecz
Back to previous menu|Wróć do poprzedniego menu
Working here:|Pracuje:
Main objective — develop your island|Główny cel — rozwijaj wyspę
More building details|Więcej o budynku
Building details|Szczegóły budynku
Storage and deliveries|Magazyn i dostawy
People and happiness|Mieszkańcy i szczęście
Construction and Premium|Budowa i premium
Available and returning|Dostępni i wracający
Island building and resource dock|Pasek budynków i zasobów wyspy
Local stock / central warehouse stock (all goods in transit)|Zapas przy budynku / zapas magazynu centralnego (wszystkie towary w transporcie)
Visitors returned home|Zwiedzający wrócili do domu
Visitor package purchased|Kupiono pakiet zwiedzania
Choose a positive whole number of visitors.|Podaj dodatnią całkowitą liczbę zwiedzających.
Build the Lighthouse first.|Najpierw odbuduj latarnię.
All three extra visitor packages in this 24-hour window have been purchased.|Wykorzystano wszystkie trzy dodatkowe pakiety zwiedzania w tym 24-godzinnym okresie.
A Lighthouse visit lasts four hours and cannot be cancelled.|Zwiedzanie latarni trwa cztery godziny i nie można go anulować.
Build the Lighthouse before sending visitors.|Odbuduj latarnię, zanim wyślesz zwiedzających.
Choose distinct residents for this group.|Wybierz różne osoby do tej grupy.
Visitors must be at home and their 24-hour visit cooldown must have ended.|Zwiedzający muszą być w domu, a od zakończenia ich poprzedniej wizyty muszą upłynąć 24 godziny.
The visitor-entry allowance for this 24-hour window has been used. Wait or purchase an extra visitor package.|Wykorzystano limit wejść w tym 24-godzinnym okresie. Poczekaj lub kup dodatkowy pakiet zwiedzania.
Upgrade the Town Hall first.|Najpierw rozbuduj ratusz.
Waiting for the planned materials or an active construction package.|Oczekiwanie na zaplanowane materiały lub aktywny pakiet budowlany.
Waiting for available warehouse carriers or an earlier upgrade.|Oczekiwanie na wolnych tragarzy z magazynu lub ukończenie wcześniejszej rozbudowy.
Assign warehouse carriers to calculate the remaining delivery time.|Przydziel tragarzy do magazynu, aby obliczyć pozostały czas dostaw.
The delivery schedule is too long to estimate from the current snapshot.|Harmonogram dostaw jest zbyt długi, aby oszacować go na podstawie obecnego stanu.
The forecast supplies have reached the warehouse. The full cost is now reserved.|Planowane dostawy dotarły do magazynu. Pełny koszt jest już zarezerwowany.
Reserved materials are waiting for transport.|Zarezerwowane materiały czekają na transport.
Reserved materials are available again and the building coin cost was refunded. A paid forecast planning fee is not refunded.|Zarezerwowane materiały są ponownie dostępne, a monety za budynek zwrócono. Opłata za planowanie przyszłych dostaw pozostaje bezzwrotna.
Warehouse staffing changed. Delivery and building estimates now use the available carriers; completed building time does not change.|Zmieniono obsadę magazynu. Szacowany czas dostaw i budowy uwzględnia teraz dostępnych tragarzy; ustalony już czas samej budowy się nie zmienia.
Upgrade complete. The new level is now active.|Rozbudowa ukończona. Nowy poziom już działa.
The central warehouse is full|Magazyn centralny jest pełny
The market is full|Targ jest pełny
The harbor is full|Port jest pełny
Use or collect goods, or upgrade this building.|Zużyj lub odbierz towary albo rozbuduj ten budynek.
Material storage limit reached|Osiągnięto limit magazynowania zasobu
The expected materials have arrived in the warehouse. The full cost is now reserved.|Spodziewane materiały dotarły do magazynu. Pełny koszt jest już zarezerwowany.
A construction slot is available. Reserved materials are waiting for transport.|Zwolniło się miejsce budowy. Zarezerwowane materiały czekają na transport.
No shared storage space remains. Upgrade the warehouse or use some goods.|Brakuje wspólnego miejsca w magazynie. Rozbuduj magazyn lub zużyj część towarów.
Exchange goods or order their collection by warehouse workers.|Wymień towary albo zleć ich odbiór do magazynu centralnego.
Construction has started. It will take as long as material transport.|Budowa rozpoczęta. Potrwa tyle samo co transport materiałów.
storage is full|magazyn jest pełny
Five new decorations and events are available until midnight in Europe/Warsaw.|Pięć nowych dekoracji i wydarzeń jest dostępnych do północy czasu polskiego.
Another attraction is active. Wait until its six-hour effect ends.|Trwa inna atrakcja. Poczekaj, aż zakończy się jej sześciogodzinny efekt.
No eligible residents can gain happiness from this attraction.|Żaden uprawniony mieszkaniec nie może teraz otrzymać szczęścia z tej atrakcji.
Upgrading one path section costs 100 unreserved stone from the central Warehouse.|Ulepszenie jednego odcinka ścieżki kosztuje 100 niezarezerwowanego kamienia z magazynu centralnego.
Choose an island name with 2–40 characters, without control characters or angle brackets.|Wybierz nazwę wyspy o długości 2–40 znaków, bez znaków sterujących i nawiasów ostrokątnych.
Your browser could not save the island name. Allow local storage and try again.|Przeglądarka nie mogła zapisać nazwy wyspy. Zezwól na zapis lokalny i spróbuj ponownie.
Every new resident starts with 24 hours of frozen 0% happiness. Hunger and unemployment counters also start only after this period.|Każdy nowy mieszkaniec przez pierwsze 24 godziny ma stałe 0% szczęścia. Dopiero po tym okresie zaczynają działać także liczniki głodu i bezrobocia.
Food is shared equally and assigned automatically. Each resident consumes one Food per hour; a full uninterrupted hour of feeding resets the hunger counter.|Żywność jest przydzielana automatycznie i dzielona po równo. Każdy mieszkaniec zużywa jedną sztukę żywności na godzinę; pełna godzina nieprzerwanego karmienia zeruje licznik głodu.
The penalty stops as soon as food is available. The remembered hunger timer resets after one uninterrupted hour of feeding; a short meal pauses it without clearing it.|Kara ustaje, gdy tylko pojawia się żywność. Zapamiętany licznik głodu zeruje pełna godzina nieprzerwanego karmienia; krótszy posiłek tylko go wstrzymuje.
Unfed time accumulates until a full uninterrupted hour of feeding clears it. After twelve hours the penalty applies only while food is unavailable, without backcharging the first twelve hours.|Czas bez jedzenia narasta, aż wyzeruje go pełna godzina nieprzerwanego karmienia. Po dwunastu godzinach kara działa tylko podczas braku żywności i nie jest naliczana wstecz za pierwsze dwanaście godzin.
Reward goods delivered|Dostarczono towary z nagrody
Reward goods waiting|Towary z nagrody czekają na miejsce
Your reward exceeds available warehouse space. The remainder will be delivered automatically when space opens.|Nagroda przekracza wolne miejsce w magazynie. Reszta trafi do niego automatycznie, gdy zwolni się miejsce.
The presence confirmation expired. The whole unclaimed pot was lost.|Upłynął czas na potwierdzenie obecności. Cała niewypłacona pula przepadła.
The whole unclaimed expedition pot was lost.|Cała niewypłacona pula ekspedycji przepadła.
Confirm your presence within 60 seconds. The expedition clock continues.|Potwierdź obecność w ciągu 60 sekund. Zegar ekspedycji nadal działa.
Unfinished contributions were lost when the task deadline passed.|Przekazane towary przepadły po upływie terminu nieukończonego zadania.
Building purchase quote.|Wycena zakupu budynku.
Each farmer produces 20 grain per working hour. Harvests wait in the farm storage until warehouse workers collect them.|Każdy rolnik produkuje 20 sztuk zboża na godzinę pracy. Zbiory czekają w magazynie gospodarstwa na odbiór przez tragarzy.
Each worker produces 20 planks per hour. Each plank requires 2 wood from the central warehouse.|Każdy pracownik produkuje 20 desek na godzinę. Każda deska wymaga dwóch sztuk drewna z magazynu centralnego.
Each quarry worker produces 20 stone per working hour. Stone waits at the quarry for transport.|Każdy pracownik kamieniołomu produkuje 20 sztuk kamienia na godzinę pracy. Kamień czeka przy budynku na transport.
Each warehouse worker carries up to 120 items per five-minute round trip at level 1. Level 1 holds 1,000 of each material and 4,000 in total. Each additional level increases both limits by 50%.|Na pierwszym poziomie każdy magazynier przewozi do 120 sztuk podczas pięciominutowego kursu w obie strony. Magazyn mieści po 1000 sztuk każdego materiału i łącznie 4000 sztuk. Każdy kolejny poziom zwiększa oba limity o 50%.
Each lumberjack produces 20 wood per working hour. Wood waits in local storage for transport.|Każdy drwal produkuje 20 sztuk drewna na godzinę pracy. Drewno czeka w magazynie przy budynku na transport.
Each miller produces 20 food per hour. Each food requires 2 grain from the central warehouse.|Każdy młynarz produkuje 20 sztuk żywności na godzinę. Każda sztuka wymaga dwóch sztuk zboża z magazynu centralnego.
Warehouse ready for building tests|Magazyn gotowy do testowania budowy
Central storage has been filled to its current limits and the treasury has at least 10,000 coins, once for this preview.|Magazyn centralny jednorazowo wypełniono do jego obecnych limitów, a skarbiec ma co najmniej 10 000 monet na testy budowy.
Wait for the purchased upgrade of this building to finish first.|Poczekaj na ukończenie kupionej rozbudowy tego budynku.
Finish the preceding upgrade of this building before buying its next level.|Ukończ poprzednią rozbudowę tego budynku przed kupnem kolejnego poziomu.
Upgrade the House to provide enough empty beds.|Rozbuduj Dom, aby zapewnić wystarczającą liczbę wolnych łóżek.
Not enough available resources for a resident. The protected Food reserve must remain.|Brakuje dostępnych zasobów na mieszkańca. Chroniona rezerwa żywności musi pozostać w magazynie.
A new resident can move into the House.|Nowy mieszkaniec może zamieszkać w Domu.
Those workers are already returning or waiting to finish their current delivery.|Ci pracownicy już wracają albo czekają na zakończenie rozpoczętej dostawy.
New workers take 5 minutes to reach the workplace.|Nowi pracownicy docierają do pracy w pięć minut.
New residents moved into the House.|Nowi mieszkańcy zamieszkali w Domu.
Choose English or Polish.|Wybierz język angielski lub polski.
Choose notification categories.|Wybierz kategorie powiadomień.
Complete the previous lesson first.|Najpierw ukończ poprzednią lekcję.
A verified publication event is required. Opening a share dialog does not grant this reward.|Wymagane jest potwierdzenie publikacji. Samo otwarcie okna udostępniania nie przyznaje tej nagrody.
A verified account event is required for referral rewards.|Nagrody za polecenia wymagają potwierdzonego zdarzenia konta.
Granted 1,000 coins for the referred account’s first login.|Przyznano 1000 monet za pierwsze logowanie poleconego konta.
Granted 1,000 coins for the first referral login.|Przyznano 1000 monet za pierwsze logowanie poleconego gracza.
Meaningful activity is required for a referral active day.|Zaliczenie aktywnego dnia poleconego gracza wymaga rzeczywistej aktywności w grze.
This active calendar day was already counted.|Ten aktywny dzień kalendarzowy został już zaliczony.
Material reward delivery is not available.|Dostawa materiałów z nagrody jest niedostępna.
Granted 500 of each material after three distinct active days.|Przyznano po 500 każdego materiału za trzy różne aktywne dni.
Your task reward is already received. Choose Share for the prototype 500-coin bonus or Skip.|Nagroda za zadanie została już odebrana. Wybierz Udostępnij, aby otrzymać premię 500 monet w wersji podglądowej, albo Pomiń.
Start this task to begin donating goods. Only one task can be active.|Rozpocznij zadanie, aby przekazywać towary. Tylko jedno zadanie może być aktywne.
Only one task can be active. Deliver goods from central storage in instalments. Donations are irreversible and are lost when the deadline expires. Food below the protected reserve cannot be donated. Each task shows its own expiry time.|Możesz realizować jedno zadanie naraz i przekazywać towary z magazynu centralnego w ratach. Darowizn nie można wycofać, a po upływie czasu zadania przekazane towary przepadają. Każde zadanie ma własny licznik czasu; chronionej rezerwy żywności nie można przekazać.
`);

// Specific complete messages must run before broad prefixes such as "Level N".
rules.unshift([
  /^Level ([\d, ]+) complete\. Pot: ([\d, ]+) coins\. Cash out or risk it on the next level\.$/,
  (_, level, n) => `Poziom ${level} ukończony. Pula: ${coins(n)}. Wypłać nagrodę lub zaryzykuj całą pulę na kolejnym poziomie.`
]);
rules.unshift([
  /^([\d, ]+) stored reward items moved into the central warehouse\.$/,
  (_, n) => `Towary z nagrody przeniesione do magazynu centralnego: ${n}.`
]);
rules.unshift([
  /^Production per worker is 20, 24, 26, 28… units per hour by the workplace’s own level\. Hunger halves production and transport immediately\. Releasing a worker discards their unfinished unit\.$/,
  () => 'Produkcja pracownika wynosi 20, 24, 26, 28… sztuk na godzinę zależnie od poziomu miejsca pracy. Głód od razu zmniejsza wydajność produkcji i transportu o połowę. Zwolnienie pracownika usuwa postęp jego niedokończonej sztuki.'
]);

entries(`
Your island name has been saved.|Zapisano nazwę wyspy.
Lighthouse construction has started. It will take twice as long as transport.|Budowa latarni rozpoczęta. Potrwa dwa razy tyle co transport.
`);
priorityRule(/^Resident (\d+) received (\d+) happiness points\.$/, (_, id, points) => `Mieszkaniec ${id} otrzymał ${points} ${plural(points, 'punkt', 'punkty', 'punktów')} szczęścia.`);
priorityRule(/^(.+): materials reserved$/, (_, name) => `${tr(name)}: zarezerwowano materiały`);
priorityRule(/^(.+): upgrade started$/, (_, name) => `${tr(name)}: rozpoczęto rozbudowę`);
priorityRule(/^(.+): upgrade cancelled$/, (_, name) => `${tr(name)}: anulowano rozbudowę`);
priorityRule(/^(.+): materials delivered$/, (_, name) => `${tr(name)}: dostarczono materiały`);
priorityRule(/^For ([\d,. ]+) hours: happiness is 100% and material production ×2\.$/, (_, hours) => `Przez ${hours} godz.: szczęście wynosi 100%, a produkcja materiałów jest podwojona.`);
priorityRule(/^For 10 hours: \+([\d,. ]+) happiness(?: for every resident)?(?: and taxes ×2)?\.$/, (_, amount) => `Przez 10 godz.: +${amount} p.p. szczęścia dla każdego mieszkańca.`);
priorityRule(/^For ([\d,. ]+) hours: \+100 happiness for everyone and material production ×2\.(?: Taxes are unchanged\.)?$/, (_, hours) => `Przez ${hours} godz.: szczęście mieszkańców wynosi 100%, a produkcja materiałów jest podwojona.`);
priorityRule(/^Storage full: (.+)\. Production is waiting for transport\.$/, (_, name) => `Pełny magazyn przy budynku: ${tr(name)}. Produkcja czeka na transport.`);
priorityRule(/^The central warehouse has no more space for (.+)\.$/, (_, resource) => `W magazynie centralnym brakuje miejsca na zasób: ${tr(resource)}.`);
priorityRule(/^([\d,. ]+) (.+) reached port storage after its purchase deadline\.$/, (_, count, resource) => `Towary trafiły do portu po upływie terminu zakupu: ${count} ${tr(resource)}.`);
priorityRule(/^([\d,. ]+) (.+) expired after 24 hours\.$/, (_, count, resource) => `Towary przepadły po 24 godzinach: ${count} ${tr(resource)}.`);
priorityRule(/^([\d,. ]+) (.+) expired after its purchase deadline\.$/, (_, count, resource) => `Towary przepadły po upływie terminu zakupu: ${count} ${tr(resource)}.`);
priorityRule(/^Sold ([\d,. ]+) (.+) for ([\d,. ]+) coins\.$/, (_, count, resource, price) => `Sprzedano ${count} ${tr(resource)} za ${price} monet.`);
priorityRule(/^Bought ([\d,. ]+) (.+) for ([\d,. ]+) coins\.$/, (_, count, resource, price) => `Kupiono ${count} ${tr(resource)} za ${price} monet.`);
priorityRule(/^([\d,. ]+) (.+) is ready for unloading\.$/, (_, count, resource) => `Towary gotowe do rozładunku: ${count} ${tr(resource)}.`);
priorityRule(/^([\d,. ]+) uncollected (.+) expired 24 hours after the ship arrived\.$/, (_, count, resource) => `Nieodebrane towary przepadły 24 godziny po przypłynięciu statku: ${count} ${tr(resource)}.`);
priorityRule(/^([\d,. ]+) (.+) reserved\. Harbor workers carry and load it; ([\d,. ]+) coins arrive when the ship departs\.$/, (_, count, resource, price) => `Zarezerwowano ${count} ${tr(resource)}. Pracownicy portu przewiozą i załadują towary; po wypłynięciu statku otrzymasz ${price} monet.`);
priorityRule(/^Select the highlighted location: (.+)\.$/, (_, name) => `Wybierz podświetlone miejsce: ${tr(name)}.`);
priorityRule(/^Another attraction is active\. Available in (.+)\.$/, (_, duration) => `Trwa inna atrakcja. Kolejna będzie dostępna za ${tr(duration)}.`);
priorityRule(/^(.+): ([\d,. ]+) coins, \+([\d,. ]+) happiness for ([\d,. ]+) (?:resident|residents) for 6 hours$/, (_, title, price, amount, people) => `${tr(title)}: ${coins(price)}, +${amount} p.p. szczęścia dla ${recipients(people)} przez 6 godzin`);
priorityRule(/^\+([\d,. ]+) pp for ([\d,. ]+) (?:resident|residents) · 6 h\. Offers refresh in (.+)$/, (_, amount, people, duration) => `+${amount} p.p. dla ${recipients(people)} · 6 godz. Oferty odnowią się za ${tr(duration)}`);
priorityRule(/^\+([\d,. ]+) pp happiness for ([\d,. ]+) (?:resident|residents) for 6 hours\. Cost: ([\d,. ]+) coins\.$/, (_, amount, people, price) => `+${amount} p.p. szczęścia dla ${recipients(people)} przez 6 godzin. Koszt: ${coins(price)}.`);
priorityRule(/^(.+): \+([\d,. ]+) pp happiness for ([\d,. ]+) residents for 6 hours\.$/, (_, title, amount, people) => `${tr(title)}: +${amount} p.p. szczęścia dla ${recipients(people)} przez 6 godzin.`);
priorityRule(/^Happiness: (.+) — residents and population growth$/, (_, value) => `Szczęście: ${value} — mieszkańcy i zmiany populacji`);
priorityRule(/^Residents: (.+); Town Hall capacity: (.+); housing: (.+); unhoused: (.+); working: (.+); available: (.+) — residents and worker assignments$/, (_, people, capacity, housing, unhoused, working, available) => `Mieszkańcy: ${people}; limit ratusza: ${capacity}; miejsca mieszkalne: ${housing}; bez domu: ${unhoused}; pracujący: ${working}; wolni: ${available} — mieszkańcy i przydział pracowników`);
priorityRule(/^Granted ([\d,. ]+) coins for verified sharing\.$/, (_, amount) => `Przyznano ${amount} monet za potwierdzone udostępnienie.`);
priorityRule(/^(.+): ([\d,. ]+) coins and materials received\.$/, (_, title, amount) => `${tr(title)}: otrzymano ${amount} monet oraz materiały.`);
priorityRule(/^([\d,. ]+) extra visitor entries for ([\d,. ]+) coins\. Entries expire after 24 hours\.$/, (_, entries, price) => `Dodatkowe wejścia: ${entries} za ${price} monet. Wejścia wygasają po 24 godzinach.`);
priorityRule(/^([\d,. ]+) residents have 100% happiness for 24 hours\. Their group adds \+10 pp to the population while its bonus lasts\.$/, (_, people) => `Premia 100% szczęścia przez 24 godziny dla ${recipients(people)}. Ich grupa daje całej populacji +10 p.p. przez czas działania premii.`);
priorityRule(/^This visitor package costs ([\d,. ]+) coins\.$/, (_, price) => `Ten pakiet zwiedzania kosztuje ${price} monet.`);
priorityRule(/^([\d,. ]+) extra visitor entries purchased for ([\d,. ]+) coins\.$/, (_, entries, price) => `Kupiono ${entries} dodatkowych wejść za ${price} monet.`);
priorityRule(/^The Lighthouse has ([\d,. ]+) free visitor places\.$/, (_, count) => `Wolne miejsca zwiedzania w latarni: ${count}.`);
priorityRule(/^([\d,. ]+) happiness points are available until the next Warsaw midnight\.$/, (_, count) => `Do najbliższej północy czasu polskiego dostępne są punkty szczęścia: ${count}.`);
priorityRule(/^([\d,. ]+) residents moved into the House\. Their happiness remains at 0% for their first 24 hours\.$/, (_, count) => `Nowi mieszkańcy w Domu: ${count}. Przez pierwsze 24 godziny ich szczęście pozostaje na 0%.`);
priorityRule(/^Exchanged ([\d,. ]+) (.+) for ([\d,. ]+) (.+)\. Market fee: 10%\.$/, (_, count, from, output, to) => `Wymieniono ${count} ${tr(from)} na ${output} ${tr(to)}. Marża targu wynosi 10%.`);
priorityRule(/^(.+) reached Town Hall level (\d+) in HARBORLIGHT! Build your own island: (.+)$/, (_, name, level, url) => `${name} osiąga ${level}. poziom ratusza w HARBORLIGHT! Rozwijaj własną wyspę: ${url}`);

entries(`
Stage|Etap rozwoju
Path lamps|Lampy przy ścieżkach
All bonuses and penalties|Wszystkie premie i kary
Open Harbor orders|Zlecenia portowe
Open Market exchange|Wymiana na targu
Blessings|Błogosławieństwa
Free uses remaining|Pozostałe darmowe użycia
Paid blessing cooldown|Przerwa między płatnymi błogosławieństwami
A manual blessing grants +50 of every resource and +20 happiness for one hour. Free uses depend on the Chapel level. The next paid blessing is available four hours after the previous effect ends.|Ręczne błogosławieństwo daje po 50 każdego zasobu i +20 p.p. szczęścia na godzinę. Liczba darmowych użyć zależy od poziomu Kaplicy. Kolejne płatne błogosławieństwo jest dostępne cztery godziny po zakończeniu poprzedniego efektu.
Harbor workers carry goods between central storage, Harbor storage and the ship.|Pracownicy portu przewożą towary między magazynem centralnym, magazynem portowym i statkiem.
Delivered building materials|Dostarczone materiały budowlane
A carrier takes one material per trip, including a partial load. The base round trip is 5 minutes; completed path levels reduce it. Level 1 carries 120 units per trip. Hunger halves effective transport. Central replenishment comes before construction unless you change priorities. Food reserve: 50 × Warehouse level.|Tragarz przewozi jeden rodzaj materiału na kurs, także przy niepełnym ładunku. Podstawowy kurs w obie strony trwa 5 minut; ukończone poziomy ścieżek skracają ten czas. Na poziomie 1 tragarz przenosi do 120 sztuk. Głód zmniejsza wydajność transportu o połowę. Uzupełnianie magazynu centralnego ma pierwszeństwo przed budową, jeśli nie zmienisz priorytetów. Rezerwa żywności wynosi 50 × poziom Magazynu.
materials reserved|zarezerwowano materiały
upgrade started|rozpoczęto rozbudowę
materials delivered|dostarczono materiały
Goods expired|Towary przepadły
Purchase confirmed|Potwierdzono zakup
Sale confirmed|Potwierdzono sprzedaż
Ship departed|Statek wypłynął
Ship arrived|Statek przypłynął
Tutorial reward|Nagroda za samouczek
Buy visit package|Kup pakiet zwiedzania
You can work on one task at a time and donate goods directly from central storage, including in instalments. Donations cannot be withdrawn and are lost if the task expires. Each task has its own countdown; protected food reserves cannot be donated.|Możesz realizować jedno zadanie naraz i przekazywać towary bezpośrednio z magazynu centralnego, również w ratach. Darowizn nie można wycofać, a po upływie czasu zadania przekazane towary przepadają. Każde zadanie ma własny licznik czasu; chronionej rezerwy żywności nie można przekazać.
Five attractions are offered each day. Every offer reaches a random share of 1–50% of residents, limited by the number of eligible people. The price depends on the total happiness points awarded.|Codziennie dostępnych jest pięć atrakcji. Każda oferta obejmuje losowo od 1% do 50% mieszkańców, najwyżej tylu, ilu może otrzymać premię. Cena zależy od łącznej liczby przyznawanych punktów szczęścia.
Only one attraction can be active across the island. Its effect lasts six hours; the next attraction becomes available as soon as it ends.|Na całej wyspie może działać tylko jedna atrakcja. Jej efekt trwa sześć godzin; po jego zakończeniu od razu można uruchomić kolejną.
`);
priorityRule(/^The next attraction is available in (.+)\.$/, (_, duration) => `Kolejna atrakcja będzie dostępna za ${tr(duration)}.`);
priorityRule(/^Available in (.+)$/, (_, duration) => `Dostępne za ${tr(duration)}`);
priorityRule(/^([\d,. ]+)% of population$/, (_, share) => `${share}% mieszkańców`);
priorityRule(/^([\d,. ]+) coins paid\. The ship arrives in 5 minutes; harbor workers unload and return the cargo to the warehouse\.$/, (_, price) => `Zapłacono ${price} monet. Statek przypłynie za 5 minut, a pracownicy portu rozładują i odwiozą towary do magazynu centralnego.`);
priorityRule(/^(.+) per 10 trips · next allocation (\d+) \/ 10$/, (_, shares, position) => `${tr(shares.replace(/\b2 random\b/g, '2 losowe'))} na 10 kursów · kolejny przydział ${position} / 10`);
priorityRule(/^([\d,. ]+) extra entries are available for 24 hours\. Paid package (\d+) of 3\.$/, (_, entries, ordinal) => `Dodatkowe wejścia dostępne przez 24 godziny: ${entries}. Płatny pakiet ${ordinal} z 3.`);
priorityRule(/^([\d,. ]+) residents will return in four hours\. The group cannot be withdrawn\.$/, (_, count) => `Zwiedzanie potrwa cztery godziny. Liczba uczestników: ${count}. Nie można odwołać tej grupy.`);
priorityRule(/^([\d,. ]+) residents sent to the Lighthouse\. Their bonuses begin when they return in four hours\.$/, (_, count) => `Wysłano do latarni grupę ${count} osób. Premie zaczną działać po ich powrocie za cztery godziny.`);

// Approved v18 rules and transaction feedback.
registerTranslations({
  "Construction shortened": "Skrócono budowę",
  "Delete read notifications": "Usuń przeczytane wiadomości",
  "Free daily use": "Darmowe użycie dzisiaj",
  "Buy 30 seconds": "Kup 30 sekund",
  "Watch an ad for extra time": "Obejrzyj reklamę za dodatkowy czas",
  "Choose an activity": "Wybierz aktywność",
  "Collect bonus without an ad": "Odbierz premię bez reklamy",
  "Collect blessing without an ad": "Odbierz błogosławieństwo bez reklamy",
  "Watch ad for a blessing": "Obejrzyj reklamę za błogosławieństwo",
  "Paynow payment": "Płatność Paynow",
  "Go to Paynow payment": "Przejdź do płatności Paynow",
  "Confirm simulated payment": "Potwierdź płatność testową",
  "Payment amount in PLN": "Kwota płatności w PLN",
  "Promotional code": "Kod promocyjny",
  "Code": "Kod",
  "Redeem code": "Wykorzystaj kod",
  "Standard game without ads": "Gra standardowa bez reklam",
  "Claim daily reward": "Odbierz nagrodę dnia",
  "Welcome bonus": "Bonus powitalny",
  "Happiness cannot fall below 20%": "Szczęście nie spada poniżej 20%",
  "Happiness set to 100% by Lighthouse protection": "Szczęście wymuszone na 100% przez ochronę Latarnianą",
  "Happiness protected at 20% by Welcome bonus": "Powitalna ochrona szczęścia do minimum 20%",
  "Island inactivity": "Nieaktywność na wyspie",
  "Island economy": "Gospodarka wyspy",
  "Island": "Wyspa",
  "You choose and confirm the post yourself. The choice bonus does not verify Facebook publication.": "Samodzielnie wybierasz i zatwierdzasz publikację. Bonus za wybór udostępnienia nie potwierdza opublikowania posta na Facebooku.",
  "A manual blessing grants +50 of every resource and +20 happiness for one hour. One free use renews at Warsaw midnight and does not accumulate. Paid and ad uses share a four-hour cooldown after the previous paid or ad effect ends.": "Ręczne błogosławieństwo daje po 50 każdego zasobu i +20 pp szczęścia na godzinę. Jedno darmowe użycie odnawia się o północy Warszawy, bez kumulowania. Płatne i reklamowe użycia mają wspólną blokadę czterech godzin od końca poprzedniego płatnego lub reklamowego efektu.",
  "A level 1 Warehouse holds 4,000 ordinary units in total and up to 1,000 of each material. Capacity grows by 50% per level up to 40 million total and 10 million per material at level 24. Later Warehouse levels only add worker places. Spendable reward stock does not use ordinary capacity. Coins are kept separately.": "Magazyn 1 mieści 4000 zwykłych materiałów łącznie i do 1000 każdego rodzaju. Pojemność rośnie o 50% na poziom do 40 mln łącznie i 10 mln danego materiału na poziomie 24. Dalsze poziomy dodają tylko miejsca pracy. Wydawalny zapas z nagród nie zajmuje zwykłej pojemności. Monety są przechowywane osobno.",
  "Each resident consumes 1 Food per real hour from central storage, including while offline. Eating adds 1 happiness point per hour. Without food, work efficiency immediately falls to 50%; after 12 accumulated hungry hours the resident also loses 5 points per hour. Feeding stops the penalty immediately; one full uninterrupted hour of feeding resets the hunger clock. Food reserved for meals cannot be spent twice.": "Każdy mieszkaniec zużywa 1 żywność na rzeczywistą godzinę z magazynu centralnego, również podczas nieobecności. Posiłki dają +1 pp szczęścia na godzinę. Brak jedzenia od razu obniża wydajność do 50%; po 12 zgromadzonych godzinach głodu działa też kara −5 pp/h. Karmienie od razu zatrzymuje karę, a pełna godzina nieprzerwanego karmienia zeruje licznik głodu. Żywności zarezerwowanej na posiłki nie można wydać drugi raz.",
  "Eating adds +1 point per hour and actual work adds another +1. After twelve accumulated hungry hours, hunger costs −5 points/hour until feeding resumes; one full uninterrupted fed hour resets that clock. Assignment pauses the unemployment penalty during the walk; arrival resets its clock. Returning home counts as unemployment.": "Posiłki dają +1 pp na godzinę, a rzeczywista praca kolejne +1. Po dwunastu zgromadzonych godzinach głodu działa kara −5 pp/h do wznowienia karmienia; pełna godzina nieprzerwanego karmienia zeruje licznik. Przydzielenie do pracy wstrzymuje karę bezrobocia na czas dojścia, a dotarcie zeruje licznik. Powrót do domu jest czasem bezrobocia.",
  "A manual blessing grants +50 of every resource and +20 happiness to everyone for one hour. One free use renews at Warsaw midnight without accumulating. Only one manual blessing can be active at a time.": "Ręczne błogosławieństwo daje po 50 każdego zasobu i +20 pp szczęścia na godzinę. Jedno darmowe użycie odnawia się o północy Warszawy, bez kumulowania. Jednocześnie może działać jedno ręczne błogosławieństwo.",
  "A paid blessing costs 100 × Chapel level coins and has the same effect. Paid and ad uses share a 4-hour cooldown from the end of the previous paid or ad effect. A free daily use does not move that deadline. Active blessings cannot overlap.": "Płatne błogosławieństwo kosztuje 100 × poziom Kaplicy monet i daje ten sam efekt. Płatne i reklamowe użycia mają wspólną blokadę 4 godzin od końca poprzedniego takiego efektu. Darmowe użycie nie przesuwa tego terminu. Aktywne błogosławieństwa nie mogą się nakładać.",
  "Choose which categories appear in the list and on the bell. The island keeps the latest 100 notifications. Only read notifications can be deleted manually.": "Wybierz kategorie widoczne na liście i w dzwoneczku. Wyspa zachowuje 100 najnowszych wiadomości. Ręcznie można usuwać tylko przeczytane.",
  "Confirm your presence to continue. The round clock continues while this prompt is open. Extra seconds can be bought voluntarily before the deadline.": "Potwierdź obecność, aby kontynuować. Zegar rundy biegnie podczas tego okna. Dodatkowe sekundy można kupić dobrowolnie przed końcem czasu.",
  "For the island’s first 72 hours every resident, including new arrivals, has at least 20% happiness. Forced 100% takes priority. Expiry removes the protection without subtracting twenty points or charging hidden losses.": "Przez pierwsze 72 godziny wyspy każdy mieszkaniec, także nowo przybyły, ma co najmniej 20% szczęścia. Wymuszone 100% ma pierwszeństwo. Koniec ochrony nie odejmuje dwudziestu punktów ani nie rozlicza ukrytych strat.",
  "The upgrade gives both benefits for 24 hours × the achieved Lighthouse level. New arrivals also receive 100%, only until the shared effect ends. Lost residents and resources are not restored.": "Ulepszenie daje obie premie na 24 godziny × osiągnięty poziom Latarni. Nowi mieszkańcy również mają 100%, tylko do wspólnego końca efektu. Utraceni mieszkańcy i zasoby nie wracają.",
  "The initial 24-hour settling period suspends hunger and unemployment counters. Forced 100% takes priority, followed by the Welcome bonus minimum; otherwise happiness stays at 0%.": "Pierwsze 24 godziny osiedlania wstrzymują liczniki głodu i bezrobocia. Pierwszeństwo ma wymuszone 100%, następnie powitalne minimum; poza tym szczęście pozostaje na 0%.",
  "Meaningful activity in the focused visible game keeps this benefit active for five minutes. Food, population clocks and effect durations keep real time. The Lighthouse production bonus can combine with it.": "Rzeczywiste działanie w widocznej, aktywnej karcie odnawia tę premię na pięć minut. Jedzenie, przyrost populacji i efekty biegną w czasie rzeczywistym. Premia produkcji z Latarni może się z nią łączyć.",
  "Only time after 48 hours without real play is slowed. Earlier offline hours retain their original multipliers; automatic session refresh does not count as play.": "Spowolnienie obejmuje tylko czas po 48 godzinach bez rzeczywistego grania. Wcześniejsze godziny zachowują właściwe mnożniki; automatyczne odnowienie sesji nie jest graniem.",
  "Until the player performs a real game action": "Do rzeczywistego działania gracza",
  "Receive 50–200 of each resource once per Warsaw day, including Coins. The stored draw does not change when you reload.": "Odbierz po 50–200 każdego zasobu, również monet, raz na dzień Warszawy. Zapisany wynik losowania nie zmienia się po odświeżeniu.",
  "Daily loyalty reward received.": "Odebrano dzienną nagrodę lojalnościową.",
  "Spend stored materials before opening or doubling another tutorial chest.": "Wykorzystaj zapas materiałów przed otwarciem lub podwojeniem następnej skrzyni samouczka.",
  "Coin package quote.": "Wycena pakietu monet.",
  "Choose an available coin package.": "Wybierz dostępny pakiet monet.",
  "Upgrade the Town Hall before buying this building level.": "Ulepsz Ratusz przed zakupem tego poziomu budynku.",
  "Wait for the blessing and its paid cooldown to end.": "Poczekaj na koniec błogosławieństwa i blokady płatnego użycia.",
  "Blessing purchase quote.": "Wycena zakupu błogosławieństwa.",
  "Choose a supported purchase.": "Wybierz dostępną usługę.",
  "Real payments are not enabled. No money was charged.": "Prawdziwe płatności nie są włączone. Nie pobrano pieniędzy.",
  "DEV payment simulation. No money will be charged.": "Symulacja płatności DEV. Nie pobierzemy pieniędzy.",
  "This checkout is no longer pending.": "Ta płatność nie oczekuje już na potwierdzenie.",
  "Checkout cancelled. No money was charged.": "Anulowano płatność. Nie pobrano pieniędzy.",
  "A verified server payment is required. No purchase was granted.": "Wymagane jest potwierdzenie płatności przez serwer. Nie przyznano zakupu.",
  "This checkout was already completed or cancelled.": "Ta płatność została już zakończona lub anulowana.",
  "The purchase changed. Start a new checkout.": "Zakup uległ zmianie. Rozpocznij nową płatność.",
  "The balance cannot hold this package.": "Saldo nie może przyjąć tego pakietu.",
  "Coin package granted.": "Przyznano pakiet monet.",
  "The purchase cannot be delivered.": "Nie można zrealizować zakupu.",
  "DEV payment completed. No money was charged.": "Zakończono płatność testową DEV. Nie pobrano pieniędzy.",
  "Choose a supported ad reward.": "Wybierz dostępną nagrodę reklamową.",
  "Finish or cancel the current reward first.": "Najpierw zakończ lub anuluj bieżącą nagrodę.",
  "A current reward invitation is required.": "Wymagane jest bieżące zaproszenie do nagrody.",
  "The advertisement provider is not configured. No reward was granted.": "Dostawca reklam nie został skonfigurowany. Nie przyznano nagrody.",
  "Your standard reward is available without an ad.": "Twoja standardowa nagroda jest dostępna bez reklamy.",
  "Start the rewarded ad.": "Rozpocznij reklamę z nagrodą.",
  "This ad is no longer active.": "Ta reklama nie jest już aktywna.",
  "Ad skipped. No reward was granted.": "Pominięto reklamę. Nie przyznano nagrody.",
  "The reward receipt was already used or is invalid.": "Potwierdzenie nagrody zostało już użyte lub jest nieprawidłowe.",
  "The ad provider has not confirmed the reward.": "Dostawca reklamy nie potwierdził nagrody.",
  "This reward invitation has already ended.": "To zaproszenie do nagrody już się zakończyło.",
  "Material reward received.": "Odebrano nagrodę materiałową.",
  "This reward cannot be delivered.": "Nie można przyznać tej nagrody.",
  "Reward received.": "Odebrano nagrodę.",
  "Enter a valid promotional code.": "Wpisz poprawny kod promocyjny.",
  "This code was already redeemed by this account.": "To konto wykorzystało już ten kod.",
  "Code redemption requires confirmation from the server.": "Wykorzystanie kodu wymaga potwierdzenia serwera.",
  "The promotional reward is invalid.": "Nagroda z kodu jest nieprawidłowa.",
  "Promotional code redeemed.": "Wykorzystano kod promocyjny.",
  "Each farmer produces 20 grain per hour at level 1, 24 at level 2, and two more per level thereafter. Harvests wait locally for warehouse workers.": "Każdy najedzony pracownik produkuje zboże: 20 szt./h na poziomie 1, 24 na poziomie 2, dalej o 2 więcej na poziom. Gotowy produkt czeka na tragarzy.",
  "Each worker produces 20 planks per hour at level 1, 24 at level 2, and two more per level thereafter. Each plank requires 2 wood from central storage.": "Każdy najedzony pracownik produkuje deski: 20 szt./h na poziomie 1, 24 na poziomie 2, dalej o 2 więcej na poziom. Gotowy produkt czeka na tragarzy. Jedna sztuka wymaga dwóch sztuk surowca z magazynu centralnego.",
  "Each quarry worker produces 20 stone per hour at level 1, 24 at level 2, and two more per level thereafter. Stone waits locally for transport.": "Każdy najedzony pracownik produkuje kamień: 20 szt./h na poziomie 1, 24 na poziomie 2, dalej o 2 więcej na poziom. Gotowy produkt czeka na tragarzy.",
  "At level 1 each carrier carries 120 items per base five-minute course; storage holds 1,000 per material and 4,000 total. Capacity grows by 50% up to 10 million per material and 40 million total. After level 24 only crew capacity grows; separate road upgrades still apply.": "Magazyn 1 mieści 1000 każdego materiału i 4000 łącznie; podstawowy kurs przenosi 120 sztuk w 5 minut. Pojemność rośnie o 50% do 10 mln każdego materiału i 40 mln łącznie. Po poziomie 24 rośnie tylko obsada. Drogi nadal niezależnie usprawniają transport.",
  "Each lumberjack produces 20 wood per hour at level 1, 24 at level 2, and two more per level thereafter. Wood waits locally for transport.": "Każdy najedzony pracownik produkuje drewno: 20 szt./h na poziomie 1, 24 na poziomie 2, dalej o 2 więcej na poziom. Gotowy produkt czeka na tragarzy.",
  "Each miller produces 20 food per hour at level 1, 24 at level 2, and two more per level thereafter. Each Food requires 2 grain from central storage.": "Każdy najedzony pracownik produkuje żywność: 20 szt./h na poziomie 1, 24 na poziomie 2, dalej o 2 więcej na poziom. Gotowy produkt czeka na tragarzy. Jedna sztuka wymaga dwóch sztuk surowca z magazynu centralnego.",
  "Completing an upgrade grants +10 happiness × the new level for 10 hours. One free blessing renews at Warsaw midnight without accumulation. Every manual blessing gives +50 of every resource and +20 happiness for one hour. Paid and ad blessings share a four-hour wait after their effect ends.": "Ulepszenie daje +10 × nowy poziom pp szczęścia przez 10 godzin. Jedno darmowe błogosławieństwo odnawia się o północy Warszawy bez kumulowania. Ręczne użycie daje po 50 każdego zasobu i +20 pp na godzinę. Płatne i reklamowe użycia mają wspólną blokadę 4 godzin od końca efektu."
});

registerTranslations({
  "Each eligible resident receives the temporary happiness bonus. During the initial settling period Lighthouse100% and the Welcome minimum take priority; otherwise happiness remains0%.": "Uprawnieni mieszkańcy otrzymują czasową premię szczęścia. Podczas początkowego osiedlania pierwszeństwo mają Latarniane 100% i powitalne minimum; poza tym szczęście pozostaje na 0%."
});
registerTranslations({
  'Each eligible resident receives the temporary happiness bonus. During the initial settling period, Lighthouse 100% and the Welcome minimum take priority; otherwise happiness remains at 0%.': 'Uprawnieni mieszkańcy otrzymują czasową premię szczęścia. Podczas początkowego osiedlania pierwszeństwo mają Latarniane 100% i powitalne minimum; poza tym szczęście pozostaje na 0%.'
});
registerTranslations({
  'Cloud confirmation is required before another action.': 'Przed kolejnym działaniem wymagane jest potwierdzenie zapisu przez chmurę.',
  'Development preview runs in memory. Hosted accounts save exclusively in the cloud.': 'Podgląd deweloperski działa w pamięci. Konta środowiska chmurowego zapisują postęp wyłącznie w chmurze.',
  'New residents cannot receive House happiness points during their first 24 hours.': 'Nowym mieszkańcom nie można przydzielać punktów szczęścia z Domu przez pierwsze 24 godziny.',
  'Base production per worker is 20, 24, 26, 28… units per hour by the workplace’s own level, before temporary multipliers. Hunger halves production and transport immediately. Releasing a worker discards their unfinished unit.': 'Bazowa wydajność pracownika przed czasowymi mnożnikami wynosi 20, 24, 26, 28… sztuk na godzinę zależnie od poziomu miejsca pracy. Głód od razu zmniejsza produkcję i szybkość przewozu o połowę. Zwolnienie pracownika usuwa postęp jego niedokończonej sztuki.',
  'A resident costs the full next Town Hall upgrade price in all six resources. An available House bed and Town Hall population place are required. New residents settle in for 24 hours: Lighthouse protection gives 100%, Welcome protection gives a minimum of 20%, otherwise happiness stays at 0%.': 'Mieszkaniec kosztuje tyle, co pełna kolejna rozbudowa Ratusza, we wszystkich sześciu zasobach. Wymaga wolnego łóżka w Domu i miejsca w limicie Ratusza. Przez pierwsze 24 godziny osiedlania ochrona Latarniana daje 100% szczęścia, powitalna co najmniej 20%, a poza nimi szczęście pozostaje na 0%.',
  'Cloud sign-in is required.': 'Wymagane jest zalogowanie do chmury.'
});
