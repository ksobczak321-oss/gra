import { getTourCopy, uiCopy as approvedCopy } from './harborlight-v1-approved-copy.js?v=frontend-v27';

// Presentation only: descriptions and level names never affect saved mechanics.
const purposes = {
  townhall: ['Sets the island level, population limit and highest available upgrade level.', 'Rozbudowuj ratusz, aby pomieścić więcej mieszkańców i podnosić poziomy pozostałych budynków. Jego poziom jest też poziomem twojej wyspy.'],
  house: ['Provides beds, lets you assign residents to work and offers daily happiness points.', 'Tutaj przydzielasz mieszkańców do pracy i rozdajesz im codzienne punkty szczęścia. Rozbudowuj dom, gdy potrzebujesz więcej łóżek.'],
  farm: ['Grows grain for the Windmill, where it becomes food for residents.', 'Zatrudnij rolników, by zbierali zboże. Młyn przerobi je później na jedzenie dla mieszkańców.'],
  windmill: ['Turns two grain from central storage into one food for residents.', 'Przydziel młynarzy i zadbaj o zapas zboża w magazynie centralnym. Z dwóch jednostek zboża powstaje jedna jednostka żywności.'],
  quarry: ['Extracts stone for building upgrades and better paths.', 'Przydziel tu mieszkańców, aby wydobywali kamień. Przyda ci się do rozbudowy budynków i ulepszania ścieżek.'],
  lumber: ['Produces wood for construction and processing at the Sawmill.', 'Zatrudnij drwali, by zbierali drewno. Wykorzystasz je do budowy albo przerobisz w tartaku.'],
  sawmill: ['Turns two wood from central storage into one plank for construction.', 'Przydziel pracowników i zapewnij im drewno w magazynie centralnym. Z dwóch jednostek drewna wyprodukują jedną deskę do budowy.'],
  warehouse: ['Stores the island’s materials and sends carriers to collect production and supply construction.', 'Przydziel tu tragarzy. Odbiorą towary od producentów i dowiozą materiały na budowę. Rozbudowuj magazyn, gdy brakuje miejsca na zasoby.'],
  market: ['Exchanges goods with the game within the same category with a 10% margin. From Town Hall 6 you can also sell materials to other players for coins, up to the base NPC sale price.', 'Wymieniaj towary z grą w obrębie tej samej kategorii. Prowizja wynosi 10%. Od 6. poziomu ratusza możesz też sprzedawać materiały innym graczom za monety. Możesz ustawić niższą cenę, ale nie wyższą niż podstawowa cena zakupu tych towarów od gry.'],
  dock: ['Opens material trading with the game at Town Hall 4 and adds player offers from Town Hall 6. Town Hall levels 10, 13, 16 and so on on the mother island unlock more islands, up to 20 in total. The ship carries goods or passengers.', 'Od 4. poziomu ratusza kupujesz i sprzedajesz materiały za monety. Od 6. poziomu możesz też korzystać z ofert innych graczy. Rozbudowuj ratusz na wyspie macierzystej, by zakładać kolejne wyspy: na poziomach 10, 13, 16 i dalej co trzy poziomy, do 20 wysp łącznie. Statkiem przewozisz towary albo pasażerów.'],
  chapel: ['Blessings at the Chapel make residents happier. How often you pray affects the Creator’s favour.', 'W kaplicy zdobywasz błogosławieństwa, które zapewniają szczęście mieszkańców. Częstotliwość modlitw wpływa na przychylność Stwórcy.'],
  lighthouse: ['Rewards restoration with temporary bonuses and offers visits that improve residents’ happiness.', 'Odbudowuj latarnię, by na pewien czas zwiększać szczęście i produkcję. Możesz też wysyłać mieszkańców na zwiedzanie, aby po powrocie byli szczęśliwsi.']
};

const previousPurposeAliases = Object.entries(purposes).map(([id, pair]) => [pair[0], id]);
for (const id of Object.keys(purposes)) {
  const english = getTourCopy(`building-${id}`, 'en'), polish = getTourCopy(`building-${id}`, 'pl');
  if (english.text && polish.text) purposes[id] = [english.text, polish.text];
}
purposes.house = [approvedCopy('houseDescription', 'en'), approvedCopy('houseDescription', 'pl')];
purposes.lighthouse = [approvedCopy('lighthouseDescription', 'en'), approvedCopy('lighthouseDescription', 'pl')];

const goal = {
  title: [approvedCopy('goalTitle', 'en'), approvedCopy('goalTitle', 'pl')],
  description: [approvedCopy('goalDescription', 'en'), approvedCopy('goalDescription', 'pl')]
};
const residents = [
  'Provide food, housing and work: residents produce goods and transport them. Positive average happiness attracts settlers; negative happiness causes departures. At least twelve residents remain on the mother island and six on a daughter. The Town Hall sets the population limit independently of the House’s beds. At 0% happiness the population is stable. At a constant 100%, one person arrives every 30 minutes while the Town Hall has room. Residents without housing work at half speed, eat twice as much and do not receive daily House happiness points. Missing beds do not lower happiness for the whole island. All residents have a welcome minimum of 20% during the island’s first 72 hours; the Lighthouse’s forced 100% takes precedence.',
  'Dbaj o jedzenie, mieszkanie i pracę mieszkańców — to oni produkują zasoby i wożą towary. Gdy średnie szczęście jest dodatnie, przybywają nowe osoby; gdy spada poniżej zera, mieszkańcy odchodzą. Na wyspie macierzystej pozostaje co najmniej 12 osób, a na wyspie córce — 6. Ratusz wyznacza limit ludności niezależnie od liczby łóżek w Domu. Przy szczęściu 0% populacja jest stała, a przy stałym 100% nowa osoba przybywa co 30 minut, jeśli Ratusz pozwala przyjąć kolejną. Mieszkańcy bez miejsca w Domu pracują dwa razy wolniej, jedzą dwa razy więcej i nie otrzymują codziennych punktów szczęścia z Domu. Brak łóżek nie obniża szczęścia całej wyspy. Przez pierwsze 72 godziny wszyscy mieszkańcy mają minimum 20% szczęścia; wymuszone 100% Latarni ma pierwszeństwo.'
];
const warehouse = ['The central warehouse stores materials used for meals, construction, trade and tasks, with both a total limit and a separate limit for each material. Warehouse carriers collect goods from producers and supply construction; a level-one carrier carries up to 120 items on a five-minute round trip. Storage and Warehouse-level carrying capacity grow up to level 24; later levels only add crew places. Reward materials remain spendable outside ordinary capacity. Active play doubles carrying speed; after 48 hours without play it halves. Paths independently improve transport.', 'Zbieraj w magazynie centralnym zapasy na jedzenie, budowę, handel i zadania. Pilnuj zarówno łącznego miejsca, jak i limitu dla każdego materiału. Przydziel tragarzy, aby odbierali gotowe towary i dowozili materiały na budowę. Na 1. poziomie każdy z nich przewozi do 120 sztuk w pięciominutowym kursie w obie strony. Rozbudowuj magazyn, by zwiększać jego pojemność i ładowność tragarzy do poziomu 24. Dalsza rozbudowa dodaje już tylko miejsca pracy. Materiały z nagród możesz wydawać także ponad zwykłym limitem miejsca. Gdy aktywnie grasz, towary są przewożone dwa razy szybciej. Po 48 godzinach bez gry przewóz spowalnia o połowę. Ulepszaj też ścieżki, aby dodatkowo usprawnić transport.'];

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
  ...Object.values(purposes), ...previousPurposeAliases.map(([source, id]) => [source, purposes[id][1]]), goal.title, goal.description, residents, warehouse,
  // Keep earlier presentation strings translatable in an already open panel.
  ['Provides beds, free residents for work and daily happiness points.', purposes.house[1]],
  ['Buys and sells materials for coins alongside player offers from Town Hall 6. Town Hall levels 10, 13, 16 and so on on the mother island unlock more islands, up to 20 in total. The shared ship carries goods or passengers.', purposes.dock[1]],
  ['Ruins', 'Ruiny'], ...lighthouseStages
]));
