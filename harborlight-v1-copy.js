// Presentation only: descriptions and level names never affect saved mechanics.
const purposes = {
  townhall: ['Sets the island level, population limit and highest available upgrade level.', 'Określa poziom wyspy, limit mieszkańców i najwyższy dostępny poziom rozbudowy.'],
  house: ['Provides beds, lets you assign residents to work and offers daily happiness points.', 'Zapewnia łóżka i codzienną pulę punktów szczęścia. W tym oknie przydzielasz też mieszkańców do pracy.'],
  farm: ['Grows grain for the Windmill, where it becomes food for residents.', 'Produkuje zboże, które młyn przetwarza na żywność dla mieszkańców.'],
  windmill: ['Turns two grain from central storage into one food for residents.', 'Przetwarza dwie jednostki zboża z magazynu centralnego w jedną jednostkę żywności.'],
  quarry: ['Extracts stone for building upgrades and better paths.', 'Wydobywa kamień potrzebny do rozbudowy budynków i ulepszania ścieżek.'],
  lumber: ['Produces wood for construction and processing at the Sawmill.', 'Dostarcza drewno do budowy i przetwarzania w tartaku.'],
  sawmill: ['Turns two wood from central storage into one plank for construction.', 'Z dwóch jednostek drewna z magazynu centralnego wytwarza jedną deskę potrzebną do budowy.'],
  warehouse: ['Stores the island’s materials and sends carriers to collect production and supply construction.', 'Przechowuje zasoby wyspy. Pracujący tu tragarze odbierają gotowe towary i dowożą materiały na budowę.'],
  market: ['Exchanges goods with the game within the same category with a 10% margin. From Town Hall 6 you can also sell materials to other players for coins, up to the base NPC sale price.', 'Pozwala wymieniać towary z grą w obrębie jednej kategorii, z prowizją 10%. Od 6. poziomu ratusza możesz też sprzedawać materiały innym graczom za monety. Cena nie może przekraczać podstawowej ceny zakupu tych towarów od gry.'],
  dock: ['Opens material trading with the game at Town Hall 4 and adds player offers from Town Hall 6. Town Hall levels 10, 13, 16 and so on on the mother island unlock more islands, up to 20 in total. The shared ship carries goods or passengers.', 'Od 4. poziomu ratusza umożliwia handel materiałami z grą, a od 6. także z innymi graczami. Ratusz na wyspie macierzystej odblokowuje kolejne wyspy na poziomach 10, 13, 16 i dalej co trzy poziomy, do 20 wysp łącznie. Wspólny statek przewozi towary albo pasażerów.'],
  chapel: ['Grants blessings that provide materials and temporary happiness bonuses.', 'Udziela błogosławieństw zapewniających zasoby i czasowe premie do szczęścia.'],
  lighthouse: ['Rewards restoration with temporary bonuses and offers visits that improve residents’ happiness.', 'Za odbudowę przyznaje czasowe premie. Możesz też wysyłać mieszkańców na zwiedzanie, aby poprawić ich szczęście.']
};

const goal = {
  title: ['Grow your island and care for its residents', 'Rozwijaj wyspę i dbaj o mieszkańców'],
  description: ['Build up your settlement, provide food, homes and work, and keep residents happy. Develop production, trade, transport and every building so the island becomes an ever better place to live.', 'Rozbudowuj osadę, zapewniaj mieszkańcom żywność, domy i pracę oraz dbaj o ich szczęście. Rozwijaj produkcję, handel, transport i wszystkie budynki, aby wyspa stawała się coraz lepszym miejscem do życia.']
};
const residents = ['Residents produce materials, process goods and transport deliveries; they need food, housing and work. Positive average happiness attracts new people, while negative happiness causes departures, with at least twelve remaining on the mother island and six on a daughter. The Town Hall limits the population, and the House provides beds; at 0% happiness the population stays the same. At a constant 100% happiness one person arrives every 30 minutes while population space remains. All residents have a welcome minimum of 20% during the island’s first 72 hours; Lighthouse effects take precedence at 100%.', 'Mieszkańcy produkują zasoby i przewożą towary. Potrzebują jedzenia, domu i pracy. Dodatnia średnia szczęścia przyciąga nowe osoby, a ujemna sprawia, że mieszkańcy odchodzą. Na wyspie macierzystej pozostaje co najmniej 12 osób, a na wyspie córce — 6. Ratusz wyznacza limit ludności, a dom zapewnia łóżka. Przy szczęściu 0% liczba mieszkańców się nie zmienia. Przy stałym szczęściu 100% nowa osoba przybywa co 30 minut, jeśli pozwala na to limit ludności. Przez pierwsze 72 godziny wyspy każdy mieszkaniec ma co najmniej 20% szczęścia. Premia latarni, która ustawia szczęście na 100%, ma pierwszeństwo.'];
const warehouse = ['The central warehouse stores materials used for meals, construction, trade and tasks, with both a total limit and a separate limit for each material. Warehouse carriers collect goods from producers and supply construction; a level-one carrier carries up to 120 items on a five-minute round trip. Storage and Warehouse-level carrying capacity grow up to level 24; later levels only add crew places. Reward materials remain spendable outside ordinary capacity. Active play doubles carrying speed; after 48 hours without play it halves. Paths independently improve transport.', 'Magazyn centralny przechowuje materiały na posiłki, budowę, handel i zadania. Ma łączny limit miejsca oraz osobny limit dla każdego materiału. Magazynierzy odbierają gotowe towary i dowożą materiały na budowę. Na pierwszym poziomie tragarz przewozi do 120 sztuk w pięciominutowym kursie w obie strony. Rozbudowa magazynu zwiększa jego pojemność i ładowność tragarzy do poziomu 24; dalsze poziomy dodają tylko miejsca pracy. Materiały z nagród możesz wydawać także ponad zwykłym limitem miejsca. Aktywna gra podwaja szybkość przewozu. Po 48 godzinach bez gry przewóz spowalnia o połowę. Ulepszone ścieżki dodatkowo usprawniają transport.'];

// Every achieved level has a distinct restoration title; these are narrative
// milestones, not additional gameplay effects or requirements.
const lighthouseStages = `
Cleared ruins|Oczyszczone ruiny
Secured foundations|Zabezpieczone fundamenty
Rebuilt base|Odbudowana podstawa
First storey|Pierwsza kondygnacja
Keeper’s staircase|Schody latarnika
Observation tower|Wieża obserwacyjna
Sheltered gallery|Osłonięta galeria
Lantern room|Komnata lampy
First flame|Pierwszy płomień
Harbor light|Światło przystani
Night watch|Nocna warta
Brighter reflector|Jaśniejszy reflektor
Storm shelter|Osłona przed sztormem
Light of the bay|Światło zatoki
Keepers’ lodge|Siedziba latarników
Fog bell|Dzwon mgłowy
Precision lens|Precyzyjna soczewka
Coastal tower|Wieża wybrzeża
Far-reaching beam|Daleki promień
Port lighthouse|Latarnia portowa
Expanded gallery|Rozbudowana galeria
Coastal lookout|Nadmorski punkt obserwacyjny
Reliable beacon|Niezawodna latarnia
Twin reflectors|Bliźniacze reflektory
Storm watch|Warta sztormowa
Clear horizon|Przejrzysty horyzont
Seafarers’ guide|Przewodniczka żeglarzy
Keeper’s workshop|Warsztat latarnika
Radiant lantern|Promienna lampa
Guardian of the bay|Strażniczka zatoki
Strengthened tower|Wzmocniona wieża
Signals of the coast|Sygnały wybrzeża
Crystal optics|Kryształowa optyka
Sailors’ refuge|Ostoja marynarzy
Light above the cliffs|Światło nad klifami
Ocean-facing gallery|Galeria nad oceanem
Beacon in the mist|Blask pośród mgły
Watch of the headland|Warta przylądka
Navigator’s landmark|Drogowskaz nawigatorów
Lighthouse of the coast|Latarnia wybrzeża
High watchtower|Wysoka wieża strażnicza
Reinforced lantern|Wzmocniona komnata światła
Sweeping beam|Szeroki promień
Coastal signal station|Nadmorska stacja sygnałowa
Island’s guiding star|Gwiazda przewodnia wyspy
All-weather watch|Warta każdej pogody
Keepers’ guild|Bractwo latarników
Light of safe waters|Światło bezpiecznych wód
Cliffside sentinel|Straż nad klifami
Guardian of the strait|Strażniczka cieśniny
Beacon of distant sails|Blask dalekich żagli
Grand lens chamber|Wielka komnata soczewek
Command of the coast|Strażnica wybrzeża
Mariners’ meeting point|Przystań żeglarzy
Horizon observatory|Obserwatorium horyzontu
Unbroken night watch|Nieprzerwana nocna warta
Rays across the bay|Promienie nad zatoką
Signals beyond the reefs|Sygnały za rafami
Homeward light|Światło powrotu do domu
Lighthouse of the headland|Latarnia przylądka
Ocean lookout|Oceaniczny punkt obserwacyjny
Tower of steady light|Wieża niegasnącego światła
Keepers’ academy|Akademia latarników
Lens of the horizon|Soczewka horyzontu
Northern passage light|Światło północnego szlaku
Beacon of the trade winds|Latarnia pomyślnych wiatrów
Seaward signal gallery|Morska galeria sygnałowa
Mariners’ sanctuary|Azyl marynarzy
Keeper of safe passages|Strażniczka bezpiecznych przepraw
Guardian of the horizon|Strażniczka horyzontu
Ocean signal station|Oceaniczna stacja sygnałowa
Tower above the storms|Wieża ponad sztormami
The island’s great beacon|Wielka latarnia wyspy
Guiding light of the fleet|Przewodniczka floty
Luminous horizon|Świetlisty horyzont
Watch of distant waters|Warta dalekich wód
Beacon of returning ships|Latarnia powracających statków
Light across the open sea|Światło otwartego morza
Seafarers’ promise|Obietnica żeglarzy
Ocean lighthouse|Latarnia oceanu
Keepers’ heritage|Dziedzictwo latarników
Light through every storm|Światło każdego sztormu
Legend of the coastline|Legenda wybrzeża
Star of the sailing routes|Gwiazda morskich szlaków
Tower of many generations|Wieża wielu pokoleń
Beacon beyond the horizon|Latarnia za horyzontem
Watch of the great ocean|Warta wielkiego oceanu
Haven of guiding light|Przystań przewodniego światła
Island’s lasting pride|Trwała duma wyspy
Great maritime beacon|Wielka morska latarnia
Light of a hundred voyages|Światło stu wypraw
Keepers’ monument|Pomnik latarników
Guardian of every harbor|Strażniczka wszystkich przystani
Eternal watch|Wieczna warta
Ocean’s guiding star|Gwiazda przewodnia oceanu
Legend of returning sails|Legenda powracających żagli
Beacon for generations|Latarnia pokoleń
Light of the whole island|Światło całej wyspy
Pride of the seas|Duma mórz
Legacy of the light|Dziedzictwo światła
`.trim().split('\n').map(line => line.split('|'));

const localized = (pair, language) => pair[language === 'pl' ? 1 : 0];
export const buildingPurpose = (id, language = 'en') => localized(purposes[id] || ['', ''], language);
export const gameGoal = (language = 'en') => ({ title: localized(goal.title, language), description: localized(goal.description, language) });
export const residentsPurpose = (language = 'en') => localized(residents, language);
export const warehousePurpose = (language = 'en') => localized(warehouse, language);
export function lighthouseLevelName(level, language = 'en') {
  const achieved = Math.max(0, Math.min(100, Math.floor(Number(level) || 0)));
  return achieved ? localized(lighthouseStages[achieved - 1], language) : language === 'pl' ? 'Ruiny' : 'Ruins';
}
export const COPY_TRANSLATIONS = Object.freeze(Object.fromEntries([
  ...Object.values(purposes), goal.title, goal.description, residents, warehouse,
  // Keep earlier presentation strings translatable in an already open panel.
  ['Provides beds, free residents for work and daily happiness points.', purposes.house[1]],
  ['Buys and sells materials for coins alongside player offers from Town Hall 6. Town Hall levels 10, 13, 16 and so on on the mother island unlock more islands, up to 20 in total. The shared ship carries goods or passengers.', purposes.dock[1]],
  ['Ruins', 'Ruiny'], ...lighthouseStages
]));
