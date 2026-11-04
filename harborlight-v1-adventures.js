// Optional island adventures. They run alongside the eight main missions.
// All wins are derived from concrete inputs, physics or actual mini-game boards.
// Rewarded-ad authorizations belong to the caller's verified provider flow;
// an action's `verified` field is never accepted as proof.
import { grantBonusMaterials } from './harborlight-v1-inventory.js?v=frontend-v31-2';
import { BRIDGE_NODES, BRIDGE_HINT, bridgeEdgeAllowed, normalizedBridgeEdges, testBridge,
  createGardenPuzzle, gardenFlow, cargoMoment } from './harborlight-v1-adventure-puzzles.js?v=frontend-v31-2';
export { BRIDGE_NODES, BRIDGE_HINT, pipePorts, testBridge, cargoMoment } from './harborlight-v1-adventure-puzzles.js?v=frontend-v31-2';

import * as Journey from './harborlight-v1-adventure-journey.js?v=frontend-v31-2';
export { getIslandPuzzleView, getCurrentStoryRoom, getStoryCatalog, ISLAND_PUZZLE_CATALOG, STORY_CATALOG, adventureRewardStatus, JOURNEY_RULES } from './harborlight-v1-adventure-journey.js?v=frontend-v31-2';

const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const GOODS = ['coins', ...MATERIALS];
const EPS = 1e-7;
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const whole = (value, fallback = 0, max = Number.MAX_SAFE_INTEGER) => Math.floor(finite(value, fallback, 0, max));
// Keep persisted messages in English, as in the other world modules. The game
// registers the exported catalog so a language change also translates history.
const good = (message, extra = {}) => ({ ok: true, message: adventureMessage(message, 'en'), ...extra });
const bad = (message, code = 'adventure-input') => ({ ok: false, message: adventureMessage(message, 'en'), code });
const zeros = () => Object.fromEntries(GOODS.map(resource => [resource, 0]));
const text = (pl, en) => ({ pl, en });
export const ADVENTURE_RULES = Object.freeze({
  version: 1, cargoRainSeconds: 45, cargoRainDrops: 30, cargoRainCooldownSeconds: 1800,
  ordinaryCooldownSeconds: 900, requiredMapPieces: 4, maximumAmmunition: 12,
  bridgeBaseBeams: 13, bridgeExtraBeamCoins: 5, bridgeMaximumExtraBeams: 3,
  signalPreviewSeconds: 6, rhythmPreviewSeconds: 6, rhythmBeatSeconds: 0.7, rhythmToleranceSeconds: 0.35,
  cannonProjectileSpeed: 58, cannonProjectileLife: 2.4, cannonShipRadius: 7,
  // Parameters of the DEV balance, not additional real-money offers.
  rewards: Object.freeze({ treasureMap: { coins: 80, wood: 30, stone: 30 }, pirateCannon: { coins: 75, food: 40 },
    bridge: { coins: 60, planks: 50 }, signals: { coins: 40, stone: 30 },
    letters: { coins: 35, food: 25 }, rhythm: { coins: 40, grain: 30 },
    garden: { coins: 25, grain: 50 }, cargoBalance: { coins: 60, stone: 40 } })
});
export const ADVENTURE_CATALOG = Object.freeze([
  { kind: 'cargoRain', icon: '✈', title: text('Łap dostawę z nieba', 'Catch the falling cargo'), durationSeconds: 45,
    description: text('Samolot transportowy zgubił część ładunku. Złap monety i materiały, zanim wpadną do morza. Wszystko, co złapiesz, od razu trafia do Twoich zasobów.', 'A cargo plane lost part of its load. Catch the coins and materials before they reach the sea. Everything you catch goes straight into your resources.') },
  { kind: 'treasureMap', icon: '⌖', title: text('Mapa zapomnianego skarbu', 'Map of the forgotten treasure'), durationSeconds: 420,
    description: text('Odkrywaj trójki w ekspedycji, zbierz cztery fragmenty mapy i ułóż je. Wskazówka zaprowadzi Cię do skarbu na wyspie.', 'Match triples in an expedition, collect four map pieces and put them together. The clue leads to a treasure on your island.') },
  { kind: 'pirateCannon', icon: '⚓', title: text('Kupiec w opałach', 'A merchant in trouble'), durationSeconds: 420,
    description: text('Każda wygrana runda z kulką daje jedną kulę do armaty. Wyceluj w piratów i utoruj kupcowi drogę do portu.', 'Each won marble round gives you one cannonball. Aim at the pirates and clear the merchant’s route to the harbor.') },
  { kind: 'bridge', icon: '♜', title: text('Most na drugą stronę', 'A bridge to the other side'), durationSeconds: 300,
    description: text('Połącz podpory ograniczoną liczbą belek. Sprawdź konstrukcję, zanim przejdą po niej mieszkańcy. Wszystkie potrzebne belki dostajesz na początku.', 'Join the supports with a limited number of beams. Test the structure before the residents cross. The starting beams are enough to solve the puzzle.') },
  { kind: 'signals', icon: '✦', title: text('Nocne sygnały Latarni', 'Night signals from the Lighthouse'), durationSeconds: 180,
    description: text('Zapamiętaj kolejność świateł i powtórz sygnał. Dzięki Tobie zagubiony statek bezpiecznie trafi do portu.', 'Remember the light sequence and repeat the signal. Help a lost ship reach the harbor safely.') },
  { kind: 'letters', icon: '✉', title: text('Listy z przemokniętej torby', 'Letters from a soaked mailbag'), durationSeconds: 300,
    description: text('Adresy rozmyła woda. Przeczytaj wskazówki w trzech listach i odszukaj ich odbiorców na wyspie.', 'Water washed away the addresses. Read the clues in three letters and find their recipients on the island.') },
  { kind: 'rhythm', icon: '♪', title: text('Orkiestra z portu', 'The harbor orchestra'), durationSeconds: 300,
    description: text('Odszukaj trzy instrumenty, posłuchaj melodii i wystukaj rytm powitalnego koncertu.', 'Find three instruments, listen to the melody and tap the rhythm for a welcome concert.') },
  { kind: 'garden', icon: '❀', title: text('Ogród przypływu', 'The tidal garden'), durationSeconds: 300,
    description: text('Obracaj kamienne rynienki i doprowadź wodę do trzech sadzawek. Stary ogród znów zakwitnie.', 'Rotate the stone channels and bring water to three ponds. Let the old garden bloom again.') },
  { kind: 'cargoBalance', icon: '⚖', title: text('Ładunek pod kontrolą', 'Cargo under control'), durationSeconds: 240,
    description: text('Rozmieść skrzynie tak, aby statek utrzymał równowagę. Potem wybierz bezpieczną trasę do portu.', 'Place the crates so the ship stays balanced. Then choose a safe route to the harbor.') }
]);
const MESSAGES = [
  ['Ta przygoda jest już ukończona.', 'This adventure is already complete.'],
  ['Nagroda przekroczyłaby obsługiwaną liczbę monet.', 'This reward would exceed the supported coin balance.'],
  ['Brawo! Nagroda została dodana do Twoich zasobów.', 'Well done! The reward has been added to your resources.'],
  ['Wybierz przygodę z listy.', 'Choose an adventure from the list.'],
  ['Wracasz do rozpoczętej przygody.', 'Your adventure has resumed.'],
  ['Ta przygoda odpoczywa. Wybierz na razie inną.', 'This adventure is resting. Choose another one for now.'],
  ['Przygoda rozpoczęta. Główna misja trwa dalej.', 'Adventure started. Your main mission continues.'],
  ['Najpierw otwórz budowę mostu.', 'Open the bridge adventure first.'],
  ['Masz już wszystkie dodatkowe belki. Podstawowy zapas również wystarcza do zbudowania mostu.', 'You already have all the extra beams. The starting supply is also enough to build a bridge.'],
  ['Obejrzyj reklamę do końca, aby dostać dodatkową belkę.', 'Finish watching the ad to receive an extra beam.'],
  ['Nagroda za tę reklamę została już odebrana.', 'The reward for this ad has already been claimed.'],
  ['Reklamy z nagrodą wymagają potwierdzenia operatora.', 'Rewarded ads require verification from the provider.'],
  ['Potrzebujesz 5 monet na dodatkową belkę.', 'You need 5 coins for an extra beam.'],
  ['Wybierz monety albo reklamę.', 'Choose coins or an ad.'],
  ['Dodatkowa belka jest gotowa do użycia.', 'Your extra beam is ready to use.'],
  ['Postęp przygody został zachowany.', 'Your adventure progress has been saved.'],
  ['Nieznane działanie w przygodzie.', 'Unknown adventure action.'],
  ['Ta przygoda nie jest teraz otwarta.', 'This adventure is not currently open.'],
  ['Ta przygoda jest już ukończona. Nagroda została dodana do zasobów.', 'This adventure is already complete. Its reward has been added to your resources.'],
  ['Złap spadający ładunek.', 'Catch the falling cargo.'],
  ['Ten ładunek nie jest już w zasięgu.', 'That cargo is no longer within reach.'],
  ['Nie można teraz dodać tej nagrody.', 'This reward cannot be added right now.'],
  ['Ładunek jest Twój!', 'The cargo is yours!'],
  ['Zbierz cztery fragmenty mapy, odkrywając trójki w ekspedycji.', 'Collect four map pieces by matching triples in an expedition.'],
  ['Wybierz dwa różne fragmenty mapy, aby zamienić je miejscami.', 'Choose two different map pieces to swap them.'],
  ['Mapa jest gotowa. Przeczytaj wskazówkę i znajdź skarb na wyspie.', 'The map is ready. Read the clue and find the treasure on your island.'],
  ['Fragmenty mapy zamieniły się miejscami.', 'The map pieces have been swapped.'],
  ['Wybierz miejsce na wyspie, które pasuje do wskazówki.', 'Choose the island location that matches the clue.'],
  ['Tu nie ma skarbu. Spójrz jeszcze raz na wskazówkę.', 'There is no treasure here. Read the clue again.'],
  ['Wyceluj w morze przed armatą.', 'Aim at the sea in front of the cannon.'],
  ['Armata jest wycelowana.', 'The cannon is aimed.'],
  ['Wyceluj i wystrzel kulę.', 'Aim and fire a cannonball.'],
  ['Zdobądź kulę, wygrywając rundę minigry z kulką.', 'Earn a cannonball by winning a marble minigame round.'],
  ['Zaczekaj, aż wystrzelone kule dotrą do celu.', 'Wait for your cannonballs to reach their targets.'],
  ['Kula leci w stronę celu.', 'The cannonball is on its way.'],
  ['Połącz dwa sąsiednie punkty. Na dłuższą belkę nie starczy materiału.', 'Connect two neighboring points. A longer beam would need more material.'],
  ['Wykorzystałeś wszystkie belki. Przenieś jedną z nich albo dokup dodatkową.', 'You have used all your beams. Move one or get an extra beam.'],
  ['Belka wróciła do zapasu.', 'The beam has been returned to your supply.'],
  ['Belka jest na miejscu.', 'The beam is in place.'],
  ['Połącz podpory belkami i sprawdź konstrukcję.', 'Connect the supports with beams and test the structure.'],
  ['Most wymaga poprawki. Dodaj ukośne podpory i zadbaj o ciągły pomost.', 'The bridge needs work. Add diagonal supports and make sure the deck is continuous.'],
  ['Obejrzyj sygnał jeszcze raz.', 'Watch the signal again.'],
  ['Najpierw zapamiętaj kolejność świateł.', 'Remember the light sequence first.'],
  ['Wybierz jedno z czterech świateł.', 'Choose one of the four lights.'],
  ['Spróbuj ponownie. Latarnia pokaże sygnał jeszcze raz.', 'Try again. The Lighthouse will show the signal once more.'],
  ['Dobry sygnał. Wybierz następne światło.', 'Correct signal. Choose the next light.'],
  ['Wybierz jeden z trzech listów.', 'Choose one of the three letters.'],
  ['Przeczytaj wskazówkę i wybierz odbiorcę.', 'Read the clue and choose the recipient.'],
  ['Wybierz miejsce, w którym pracuje adresat listu.', 'Choose where the letter’s recipient works.'],
  ['Najpierw otwórz list i przeczytaj wskazówkę.', 'Open the letter and read its clue first.'],
  ['Ten list jest już doręczony.', 'This letter has already been delivered.'],
  ['To nie ten adresat. Wróć do wskazówki w liście.', 'That is not the recipient. Read the letter’s clue again.'],
  ['List doręczony. Mieszkaniec dziękuje Ci za pomoc.', 'Letter delivered. The resident thanks you for your help.'],
  ['Rozejrzyj się po wyspie i poszukaj instrumentów.', 'Look around the island for the instruments.'],
  ['Tutaj nie ma kolejnego instrumentu. Poszukaj przy Gospodarstwie, Magazynie lub Latarni.', 'There is no new instrument here. Search near the Farm, Warehouse or Lighthouse.'],
  ['Instrument znaleziony!', 'Instrument found!'],
  ['Posłuchaj rytmu jeszcze raz.', 'Listen to the rhythm again.'],
  ['Najpierw posłuchaj melodii i zobacz rytm.', 'Listen to the melody and watch the rhythm first.'],
  ['Wybierz instrument i wystukaj rytm.', 'Choose an instrument and tap the rhythm.'],
  ['Jeszcze raz! Powtórz instrumenty w pokazanym rytmie.', 'Try again! Repeat the instruments in the rhythm shown.'],
  ['Tak trzymaj!', 'Keep it up!'],
  ['Wybierz rynienkę, aby ją obrócić.', 'Choose a channel to rotate it.'],
  ['Rynienka obrócona. Poprowadź wodę do wszystkich trzech sadzawek.', 'Channel rotated. Bring water to all three ponds.'],
  ['Wybierz trasę rejsu.', 'Choose a sailing route.'],
  ['Wiatr spycha statek na rafę. Wybierz osłoniętą trasę.', 'The wind pushes the ship toward the reef. Choose the sheltered route.'],
  ['Wybierz skrzynię i miejsce na pokładzie.', 'Choose a crate and a position on deck.'],
  ['Skrzynia jest na miejscu.', 'The crate is in place.'],
  ['Rozmieść skrzynie i sprawdź równowagę.', 'Place the crates and check the balance.'],
  ['Najpierw załaduj wszystkie cztery skrzynie.', 'Load all four crates first.'],
  ['Statek się przechyla. Cięższe skrzynie ustaw bliżej środka albo zrównoważ ładunek po drugiej stronie.', 'The ship is listing. Move heavier crates closer to the middle or balance the load on the other side.'],
  ['Ładunek jest zrównoważony. Teraz wybierz bezpieczną trasę.', 'The cargo is balanced. Now choose a safe route.'],
  ['Złapany ładunek został od razu dodany do zasobów.', 'Caught cargo has been added straight to your resources.'],
  ['Nagroda została dodana do Twoich zasobów. Główna misja trwa dalej.', 'The reward has been added to your resources. Your main mission continues.'],
  ...Journey.JOURNEY_MESSAGES,
  ...ADVENTURE_CATALOG.map(item => [`Przygoda ukończona: ${item.title.pl}`, `Adventure complete: ${item.title.en}`])
];
export const ADVENTURE_TRANSLATIONS = Object.freeze(Object.fromEntries(MESSAGES.map(([pl, en]) => [en, pl])));
const ENGLISH_MESSAGES = Object.freeze(Object.fromEntries(MESSAGES));
export function adventureMessage(message, language = 'pl') {
  return language === 'pl' ? ADVENTURE_TRANSLATIONS[message] || message : ENGLISH_MESSAGES[message] || message;
}
const KINDS = [...ADVENTURE_CATALOG.map(item => item.kind), 'islandPuzzle', 'escapeStory'];
const STAGES = { cargoRain: ['catch'], treasureMap: ['pieces', 'arrange', 'search'], pirateCannon: ['battle'],
  bridge: ['build'], signals: ['memorize', 'repeat'], letters: ['deliver'], rhythm: ['find', 'listen', 'perform'], garden: ['irrigate'], cargoBalance: ['load', 'route'] };
const SPOTS = ['farm', 'lumber', 'quarry', 'windmill', 'sawmill', 'warehouse', 'lighthouse', 'theatre'];
const TREASURE_CLUES = {
  lighthouse: text('Skarbu szukaj tam, gdzie światło wskazuje statkom drogę do domu.', 'Seek the treasure where a light guides ships home.'),
  farm: text('Na mapie widać złote łany i ślady rolników. Zajrzyj do Gospodarstwa.', 'The map shows golden fields and farmers’ footprints. Search the Farm.'),
  quarry: text('Znak na mapie wyryto w szarym kamieniu. Poszukaj przy Kamieniołomie.', 'The map’s mark was carved into gray stone. Search near the Quarry.'),
  theatre: text('Dwie maski na mapie wskazują miejsce wspólnych spotkań. Zajrzyj do Teatru.', 'Two masks on the map point to a gathering place. Search the Theatre.')
};
function randomizer(seed) {
  let value = seed >>> 0 || 0x2f123bb5;
  return () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 0x100000000; };
}
function shuffled(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) { const other = Math.floor(random() * (index + 1)); [result[index], result[other]] = [result[other], result[index]]; }
  return result;
}
function letterData() {
  return [
    { id: 'stone-letter', title: text('List z rysunkiem dłuta', 'A letter with a chisel drawing'),
      clue: text('„Wciąż pamiętam, jak spod Twojego dłuta wyskakiwały iskry. Prześlij mi kamień na pamiątkę!” Gdzie pracuje adresat?', '“I still remember sparks flying from your chisel. Send me a stone as a keepsake!” Where does the recipient work?'), recipient: 'quarry', read: false, delivered: false },
    { id: 'grain-letter', title: text('List oprószony mąką', 'A letter dusted with flour'),
      clue: text('„Szum Twoich wielkich skrzydeł słychać aż w porcie. Dziękuję za jedzenie dla mojej rodziny.” Dokąd zanieść list?', '“Your great sails can be heard all the way to the harbor. Thank you for feeding my family.” Where should this letter go?'), recipient: 'windmill', read: false, delivered: false },
    { id: 'light-letter', title: text('List od kapitana', 'A letter from a captain'),
      clue: text('„Gdy zgubiliśmy drogę we mgle, Twoje światło pokazało nam bezpieczny brzeg.” Kto powinien dostać te podziękowania?', '“When we lost our way in the fog, your light showed us a safe shore.” Who should receive these thanks?'), recipient: 'lighthouse', read: false, delivered: false }
  ];
}
function makeData(kind, seed, clock) {
  const random = randomizer(seed);
  if (kind === 'cargoRain') {
    const drops = Array.from({ length: ADVENTURE_RULES.cargoRainDrops }, (_, index) => ({ id: index + 1,
      resource: GOODS[index % GOODS.length], amount: index % GOODS.length === 0 ? 5 : 10,
      x: 7 + random() * 86, appearAt: clock + 1 + index * 1.15, fallSeconds: 5 + random() * 2, caught: false }));
    return { duration: 45, drops, caught: zeros() };
  }
  if (kind === 'treasureMap') {
    const treasureSpot = ['farm', 'quarry', 'lighthouse', 'theatre'][Math.floor(random() * 4)];
    return { tiles: [2, 0, 3, 1], treasureSpot, clue: TREASURE_CLUES[treasureSpot], searches: 0 };
  }
  if (kind === 'pirateCannon') return { aim: { x: 50, y: 35 }, projectiles: [], shotSequence: 0, shots: 0,
    ships: Array.from({ length: 3 }, (_, index) => ({ id: index + 1, x: 20 + index * 28, y: 30 + index * 15, alive: true,
      centerX: 22 + index * 28, phase: random() * Math.PI * 2, speed: 0.24 + index * 0.05 })) };
  if (kind === 'bridge') return { nodes: BRIDGE_NODES.map(node => ({ ...node })), edges: [], budget: ADVENTURE_RULES.bridgeBaseBeams, extraPurchased: 0, test: null };
  if (kind === 'signals') return { sequence: Array.from({ length: 5 }, () => Math.floor(random() * 4)), entered: [], showUntil: clock + ADVENTURE_RULES.signalPreviewSeconds, attempts: 0 };
  if (kind === 'letters') return { letters: letterData(), visits: [] };
  if (kind === 'rhythm') return { instruments: [{ id: 'drum', building: 'warehouse', found: false }, { id: 'flute', building: 'farm', found: false }, { id: 'bell', building: 'lighthouse', found: false }], sequence: [0, 2, 1, 2, 0], beats: [], performStartedAt: null, playUntil: null, attempts: 0 };
  if (kind === 'garden') return createGardenPuzzle(random);
  return { crates: shuffled([{ id: 'barrel', weight: 1, slot: null }, { id: 'tools', weight: 2, slot: null }, { id: 'stone', weight: 2, slot: null }, { id: 'sail', weight: 1, slot: null }], random), slots: [-2, -1, 1, 2], moment: 0,
    routes: [{ id: 'sheltered', label: text('Osłonięta zatoka', 'Sheltered bay'), description: text('Skały osłaniają trasę od silnego wiatru. Woda jest spokojna.', 'Rocks shelter the route from the strong wind. The water is calm.') },
      { id: 'reef', label: text('Przesmyk przy rafie', 'The reef passage'), description: text('To krótsza droga, ale wiatr spycha statek wprost na rafę.', 'It is a shorter route, but the wind pushes the ship toward the reef.') }] };
}
function makeRun(state, kind) {
  const adventures = state.adventures, sequence = ++adventures.sequence;
  const seed = (Math.imul(sequence, 0x9e3779b9) ^ whole(state.activitySeed, 0x3e124a51, 0xffffffff)) >>> 0;
  let stage = STAGES[kind][0];
  if (kind === 'treasureMap' && adventures.progress.mapPieces.length >= 4) stage = 'arrange';
  const run = { id: `adventure-${sequence}`, kind, stage, seed, startedAt: adventures.clock, claimed: false, data: makeData(kind, seed, adventures.clock) };
  if (kind === 'pirateCannon') positionShips(run, adventures.clock);
  return run;
}
function normalizeRun(raw, clock) {
  if (Journey.isJourneyKind(raw?.kind)) return Journey.normalizeJourneyRun(raw, clock);
  if (!plain(raw) || !KINDS.includes(raw.kind) || typeof raw.id !== 'string' || !/^adventure-\d+$/.test(raw.id)) return null;
  const kind = raw.kind, stage = [...STAGES[kind], 'complete'].includes(raw.stage) ? raw.stage : STAGES[kind][0];
  const recoveryPauseRemaining = finite(raw.recoveryPauseRemaining, 0, 0, 2678400);
  const seed = whole(raw.seed, 1, 0xffffffff), startedAt = finite(raw.startedAt, clock, 0, clock + recoveryPauseRemaining);
  const result = { id: raw.id, kind, stage, seed, startedAt, ...(recoveryPauseRemaining > 0 ? { recoveryPauseRemaining } : {}), claimed: raw.claimed === true || stage === 'complete', data: makeData(kind, seed, startedAt) };
  const saved = plain(raw.data) ? raw.data : {}, data = result.data;
  if (kind === 'cargoRain') {
    for (const drop of data.drops) drop.caught = saved.drops?.find(item => item?.id === drop.id)?.caught === true;
    for (const resource of GOODS) data.caught[resource] = data.drops.filter(drop => drop.caught && drop.resource === resource).reduce((sum, drop) => sum + drop.amount, 0);
  } else if (kind === 'treasureMap') {
    if (Array.isArray(saved.tiles) && [...saved.tiles].sort().join(',') === '0,1,2,3') data.tiles = [...saved.tiles];
    data.searches = whole(saved.searches, 0, 1000);
  } else if (kind === 'pirateCannon') {
    data.aim = { x: finite(saved.aim?.x, 50, 0, 100), y: finite(saved.aim?.y, 35, 0, 90) };
    for (const ship of data.ships) ship.alive = saved.ships?.find(item => item?.id === ship.id)?.alive !== false;
    data.shotSequence = whole(saved.shotSequence); data.shots = whole(saved.shots);
    data.projectiles = (Array.isArray(saved.projectiles) ? saved.projectiles : []).slice(0, 12).filter(plain).map(item => ({ id: whole(item.id), x: finite(item.x, 50, -10, 110), y: finite(item.y, 94, -10, 110), vx: finite(item.vx, 0, -60, 60), vy: finite(item.vy, -58, -60, 0), age: finite(item.age, 0, 0, 2.4) }));
    positionShips(result, clock + recoveryPauseRemaining);
  } else if (kind === 'bridge') {
    data.extraPurchased = whole(saved.extraPurchased, 0, ADVENTURE_RULES.bridgeMaximumExtraBeams); data.budget += data.extraPurchased;
    data.edges = normalizedBridgeEdges(saved.edges).slice(0, data.budget);
    data.test = saved.test ? testBridge(data.edges, data.budget) : null;
  } else if (kind === 'signals') {
    data.entered = (Array.isArray(saved.entered) ? saved.entered : []).slice(0, 5).map(value => whole(value, 0, 3));
    data.showUntil = finite(saved.showUntil, data.showUntil); data.attempts = whole(saved.attempts);
  } else if (kind === 'letters') {
    for (const letter of data.letters) { const prior = saved.letters?.find(item => item?.id === letter.id); letter.read = prior?.read === true; letter.delivered = prior?.delivered === true; }
    data.visits = [...new Set((Array.isArray(saved.visits) ? saved.visits : []).filter(item => SPOTS.includes(item)))];
  } else if (kind === 'rhythm') {
    for (const instrument of data.instruments) instrument.found = saved.instruments?.find(item => item?.id === instrument.id)?.found === true;
    data.beats = (Array.isArray(saved.beats) ? saved.beats : []).slice(0, 5).map(value => whole(value, 0, 2));
    data.performStartedAt = Number.isFinite(saved.performStartedAt) ? finite(saved.performStartedAt, clock, 0, clock + recoveryPauseRemaining) : null;
    data.playUntil = Number.isFinite(saved.playUntil) ? finite(saved.playUntil) : null; data.attempts = whole(saved.attempts);
  } else if (kind === 'garden') {
    data.tiles.forEach((tile, index) => { tile.rotation = whole(saved.tiles?.[index]?.rotation, tile.rotation, 3); }); data.wet = gardenFlow(data);
  } else if (kind === 'cargoBalance') {
    const used = new Set();
    for (const crate of data.crates) { const prior = saved.crates?.find(item => item?.id === crate.id); if (data.slots.includes(prior?.slot) && !used.has(prior.slot)) { crate.slot = prior.slot; used.add(crate.slot); } }
    data.moment = cargoMoment(data.crates);
  }
  if (stage === 'complete') { data.reward = Object.fromEntries(GOODS.map(resource => [resource, whole(saved.reward?.[resource])])); data.effect = plain(saved.effect) ? { kind: String(saved.effect.kind || '').slice(0, 50), at: finite(saved.effect.at) } : null; }
  return result;
}
export function normalizeAdventures(state, raw = state) {
  const saved = plain(raw.adventures) && raw.adventures.version === 1 ? raw.adventures : {};
  const clock = finite(saved.clock, finite(state.activityClock));
  const observations = {};
  for (const [key, record] of Object.entries(plain(saved.observations) ? saved.observations : {}).slice(0, 50)) if (plain(record) && /^[\w-]{1,100}$/.test(key) && !['__proto__', 'constructor', 'prototype'].includes(key)) observations[key] = {
    runId: typeof record.runId === 'string' ? record.runId.slice(0, 150) : '', level: whole(record.level, 1, 100000),
    symbols: [...new Set((Array.isArray(record.symbols) ? record.symbols : []).filter(Number.isInteger))].slice(0, 120), solved: record.solved === true
  };
  state.adventures = { version: 1, clock, sequence: whole(saved.sequence), active: normalizeRun(saved.active, clock), parked: {},
    progress: { mapPieces: [...new Set((Array.isArray(saved.progress?.mapPieces) ? saved.progress.mapPieces : []).filter(value => typeof value === 'string'))].slice(0, 4), ammunition: whole(saved.progress?.ammunition, 0, ADVENTURE_RULES.maximumAmmunition) },
    cooldowns: Object.fromEntries(KINDS.map(kind => [kind, finite(saved.cooldowns?.[kind])])),
    completed: Object.fromEntries(KINDS.map(kind => [kind, whole(saved.completed?.[kind])])), observations,
    effects: (Array.isArray(saved.effects) ? saved.effects : []).filter(item => plain(item) && typeof item.kind === 'string').slice(0, 24).map(item => ({ kind: item.kind.slice(0, 50), at: finite(item.at), count: whole(item.count, 1) })),
    adReceipts: [...new Set((Array.isArray(saved.adReceipts) ? saved.adReceipts : []).filter(value => typeof value === 'string'))].slice(-32) };
  for (const kind of KINDS) { const run = normalizeRun(saved.parked?.[kind], clock); if (run && run.kind !== state.adventures.active?.kind) state.adventures.parked[kind] = run; }
  Journey.normalizeJourneyFields(state.adventures, saved, clock);
  const runs = [state.adventures.active, ...Object.values(state.adventures.parked)].filter(Boolean);
  state.adventures.sequence = Math.max(state.adventures.sequence, ...runs.map(run => whole(Number(run.id.slice(10)))));
  return state.adventures;
}
const ensure = state => state.adventures?.version === 1 && state.adventures.completedPuzzles && state.adventures.completedEscapeStories && Array.isArray(state.adventures.libraryReceipts) ? state.adventures : normalizeAdventures(state);
function notify(state, title, message) {
  state.notifications ||= []; state.notificationSequence = whole(state.notificationSequence) + 1;
  state.notifications.unshift({ id: state.notificationSequence, kind: 'adventure-complete', title: adventureMessage(title, 'en'), message: adventureMessage(message, 'en'), at: state.activeSeconds || 0, read: false }); state.notifications.length = Math.min(100, state.notifications.length);
}
function grant(state, reward) {
  const coins = whole(reward.coins), current = finite(state.resources?.coins);
  if (current + coins > Number.MAX_SAFE_INTEGER || MATERIALS.some(resource => finite(state.resources?.[resource]) + whole(reward[resource]) > Number.MAX_SAFE_INTEGER)) return null;
  state.resources ||= {}; state.resources.coins = current + coins;
  grantBonusMaterials(state, reward);
  return Object.fromEntries(GOODS.map(resource => [resource, whole(reward[resource])]));
}
function effect(state, kind) {
  const collection = state.adventures.effects, previous = collection.find(item => item.kind === kind);
  if (previous) { previous.count++; previous.at = state.adventures.clock; return previous; }
  const addition = { kind, at: state.adventures.clock, count: 1 }; collection.unshift(addition); collection.length = Math.min(24, collection.length); return addition;
}
const EFFECTS = { cargoRain: 'air-delivery', treasureMap: 'treasure-found', pirateCannon: 'merchant-rescued', bridge: 'residents-crossing', signals: 'guided-ship', letters: 'family-reunion', rhythm: 'harbor-concert', garden: 'tidal-flowers', cargoBalance: 'merchant-arrival' };
function complete(state, run) {
  if (run.claimed || run.stage === 'complete') return good('Ta przygoda jest już ukończona.', { completed: true, reward: run.data.reward || {} });
  const reward = run.kind === 'cargoRain' ? { ...run.data.caught } : grant(state, ADVENTURE_RULES.rewards[run.kind] || {});
  if (!reward) return bad('Nagroda przekroczyłaby obsługiwaną liczbę monet.');
  if (run.kind === 'treasureMap') state.adventures.progress.mapPieces = [];
  run.claimed = true; run.stage = 'complete'; run.data.reward = reward; run.data.effect = effect(state, EFFECTS[run.kind]);
  state.adventures.completed[run.kind]++;
  state.adventures.cooldowns[run.kind] = state.adventures.clock + (run.kind === 'cargoRain' ? ADVENTURE_RULES.cargoRainCooldownSeconds : ADVENTURE_RULES.ordinaryCooldownSeconds);
  const catalog = ADVENTURE_CATALOG.find(item => item.kind === run.kind);
  notify(state, `Przygoda ukończona: ${catalog.title.pl}`, run.kind === 'cargoRain' ? 'Złapany ładunek został od razu dodany do zasobów.' : 'Nagroda została dodana do Twoich zasobów. Główna misja trwa dalej.');
  return good('Brawo! Nagroda została dodana do Twoich zasobów.', { completed: true, kind: run.kind, runId: run.id, completionReceiptId: `legacy-adventure:${run.id}`, reward, effect: run.data.effect, coinSource: 'adventure' });
}
function stageProgress(state, kind, run) {
  if (kind === 'treasureMap') return { current: state.adventures.progress.mapPieces.length, total: 4 };
  if (kind === 'pirateCannon') return { current: state.adventures.progress.ammunition, total: 3 };
  if (!run) return { current: 0, total: 1 };
  if (run.stage === 'complete') return { current: 1, total: 1 };
  if (kind === 'letters') return { current: run.data.letters.filter(letter => letter.delivered).length, total: 3 };
  if (kind === 'garden') return { current: run.data.ponds.filter(index => run.data.wet.includes(index)).length, total: 3 };
  return { current: 0, total: 1 };
}
export function adventureChoices(state) {
  const adventures = ensure(state);
  return ADVENTURE_CATALOG.map(item => {
    const run = adventures.active?.kind === item.kind ? adventures.active : adventures.parked[item.kind];
    const remaining = Math.max(0, adventures.cooldowns[item.kind] - adventures.clock);
    return { ...item, available: !remaining || (!!run && run.stage !== 'complete'), reason: remaining ? 'cooldown' : null, cooldownSeconds: remaining,
      resume: !!run && run.stage !== 'complete', progress: stageProgress(state, item.kind, run), completed: adventures.completed[item.kind] };
  }).concat(Journey.journeyChoices(state));
}
export function adventureStatus(state) {
  const adventures = ensure(state); return { ...adventures, choices: adventureChoices(state), bridgeHint: BRIDGE_HINT };
}
function positionShips(run, clock) {
  for (const ship of run.data.ships) ship.x = ship.centerX + Math.sin((clock - run.startedAt) * ship.speed + ship.phase) * 12;
}
function advanceCannon(state, run, seconds, from) {
  const data = run.data, until = from + seconds;
  // A projectile expires after2.4s. A day offline never requires a day's physics.
  const liveDuration = Math.min(seconds, data.projectiles.length ? Math.max(...data.projectiles.map(item => ADVENTURE_RULES.cannonProjectileLife - item.age)) : 0);
  let elapsed = 0;
  while (elapsed < liveDuration - EPS && data.projectiles.length) {
    const dt = Math.min(1 / 60, liveDuration - elapsed); elapsed += dt; positionShips(run, from + elapsed);
    for (const ball of data.projectiles) {
      ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.age += dt;
      const hit = data.ships.find(ship => ship.alive && Math.hypot(ship.x - ball.x, ship.y - ball.y) <= ADVENTURE_RULES.cannonShipRadius);
      if (hit) { hit.alive = false; ball.age = ADVENTURE_RULES.cannonProjectileLife; }
    }
    data.projectiles = data.projectiles.filter(ball => ball.age < ADVENTURE_RULES.cannonProjectileLife - EPS && ball.y > -10 && ball.x > -10 && ball.x < 110);
  }
  positionShips(run, until);
  if (data.ships.every(ship => !ship.alive)) complete(state, run);
}
function refreshStages(state, run) {
  const now = state.adventures.clock;
  if (!run || run.stage === 'complete') return;
  if (run.kind === 'treasureMap' && run.stage === 'pieces' && state.adventures.progress.mapPieces.length >= 4) run.stage = 'arrange';
  if (run.kind === 'signals' && run.stage === 'memorize' && now >= run.data.showUntil - EPS) run.stage = 'repeat';
  if (run.kind === 'rhythm' && run.stage === 'listen' && now >= run.data.playUntil - EPS) run.stage = 'perform';
  if (run.kind === 'cargoRain' && now >= run.startedAt + run.data.duration - EPS) complete(state, run);
}
export function advanceAdventures(state, seconds) {
  const adventures = ensure(state);
  if (!Number.isFinite(seconds) || seconds < 0) return;
  const from = adventures.clock; adventures.clock += seconds;
  for (const run of [adventures.active, ...Object.values(adventures.parked)].filter(Boolean)) {
    const paused = Math.min(seconds, finite(run.recoveryPauseRemaining));
    if (paused > 0) { run.recoveryPauseRemaining -= paused; if (run.recoveryPauseRemaining < EPS) delete run.recoveryPauseRemaining; }
    const activeSeconds = seconds - paused;
    if (Journey.isJourneyKind(run.kind)) {
      // A suspended library board is a saved checkpoint, not a background
      // physics simulation. The original nine adventures retain their timers.
      if (run === adventures.active) Journey.advanceJourney(state, run, activeSeconds);
      continue;
    }
    if (run.kind === 'pirateCannon' && run.stage !== 'complete') advanceCannon(state, run, activeSeconds, from + paused);
    refreshStages(state, run);
  }
}
export function nextAdventuresEvent(state) {
  const adventures = ensure(state), deadlines = [];
  for (const run of [adventures.active, ...Object.values(adventures.parked)].filter(Boolean)) {
    if (run.stage === 'complete') continue;
    if (run.kind === 'cargoRain') deadlines.push(run.startedAt + run.data.duration);
    if (run.kind === 'signals' && run.stage === 'memorize') deadlines.push(run.data.showUntil);
    if (run.kind === 'rhythm' && run.stage === 'listen') deadlines.push(run.data.playUntil);
    if (run.kind === 'pirateCannon' && run.data.projectiles.length) deadlines.push(adventures.clock + Math.min(...run.data.projectiles.map(ball => ADVENTURE_RULES.cannonProjectileLife - ball.age)));
  }
  return deadlines.length ? Math.max(0, Math.min(...deadlines) - adventures.clock) : Infinity;
}

// Observe saved boards, rather than trusting action.solved/action.reward. One
// receipt per expedition keeps this bounded even after thousands of rounds.
export function observeMiniGames(state) {
  const adventures = ensure(state); let pieces = 0, ammunition = 0;
  for (const [key, run] of Object.entries(state.expeditionRuns || {})) {
    const game = run?.miniGame;
    if (!run?.id || !game || !['triples', 'tilt'].includes(game.kind) || ['__proto__', 'constructor', 'prototype'].includes(key)) continue;
    let observation = adventures.observations[key];
    const level = whole(run.level, 1, 100000);
    if (!observation || observation.runId !== run.id || level > observation.level) observation = adventures.observations[key] = { runId: run.id, level, symbols: [], solved: false };
    if (level < observation.level) continue;
    if (game.kind === 'triples' && Array.isArray(game.cards) && Array.isArray(game.matched) && game.cards.length === game.matched.length) {
      for (const symbol of new Set(game.cards)) {
        const indices = game.cards.map((value, index) => value === symbol ? index : -1).filter(index => index >= 0);
        if (indices.length !== 3 || !indices.every(index => game.matched[index] === true) || observation.symbols.includes(symbol)) continue;
        observation.symbols.push(symbol);
        if (adventures.progress.mapPieces.length < 4) { adventures.progress.mapPieces.push(`${run.id}:${level}:${symbol}`); pieces++; }
      }
    }
    const validGoals = game.kind === 'tilt' && Array.isArray(game.balls) && game.balls.length > 0 && Array.isArray(game.goals) && game.goals.length === game.balls.length &&
      new Set(game.balls.map(ball => ball.goalId)).size === game.balls.length && game.balls.every(ball => {
        const goal = Number.isInteger(ball.goalId) ? game.goals[ball.goalId] : null;
        return ball.settled === true && goal && goal.filledBy === ball.id && Number.isFinite(ball.x) && Number.isFinite(ball.y) && Math.hypot(ball.x - goal.x, ball.y - goal.y) <= 12;
      });
    if (game.kind === 'tilt' && run.status === 'decision' && game.solved === true && validGoals && !observation.solved) {
      observation.solved = true;
      if (adventures.progress.ammunition < ADVENTURE_RULES.maximumAmmunition) { adventures.progress.ammunition++; ammunition++; }
    }
  }
  for (const run of [adventures.active, ...Object.values(adventures.parked)].filter(Boolean)) refreshStages(state, run);
  return { pieces, ammunition };
}

function getActive(state, action) {
  const run = state.adventures.active;
  return run && action.adventureId === run.id ? run : null;
}
function start(state, kind) {
  if (!KINDS.includes(kind)) return bad('Wybierz przygodę z listy.');
  const adventures = state.adventures;
  if (adventures.active?.kind === kind && adventures.active.stage !== 'complete') return good('Wracasz do rozpoczętej przygody.', { adventureId: adventures.active.id });
  const parked = adventures.parked[kind];
  if ((!parked || parked.stage === 'complete') && adventures.cooldowns[kind] > adventures.clock + EPS) return bad('Ta przygoda odpoczywa. Wybierz na razie inną.', 'adventure-cooldown');
  if (adventures.active && adventures.active.stage !== 'complete') adventures.parked[Journey.journeyRunKey(adventures.active)] = adventures.active;
  adventures.active = parked && parked.stage !== 'complete' ? parked : makeRun(state, kind);
  delete adventures.parked[kind]; refreshStages(state, adventures.active);
  return good('Przygoda rozpoczęta. Główna misja trwa dalej.', { adventureId: adventures.active.id });
}
function extraBridgeBeam(state, action, context) {
  const run = getActive(state, action);
  if (!run || run.kind !== 'bridge' || run.stage !== 'build') return bad('Najpierw otwórz budowę mostu.');
  if (run.data.extraPurchased >= ADVENTURE_RULES.bridgeMaximumExtraBeams) return bad('Masz już wszystkie dodatkowe belki. Podstawowy zapas również wystarcza do zbudowania mostu.');
  if (action.method === 'ad') {
    // Caller may present a verified, one-use ad authorization. Nothing from the
    // action itself proves completion, including action.verified=true.
    const authorization = context.rewardedAdAuthorization;
    const entitled = context.noAds === true;
    const simulationAllowed = ['development', 'preprod'].includes(context.environment) && context.devSimulation === true && context.rewardedAdVerified === true;
    const valid = simulationAllowed && plain(authorization) && authorization.purpose === 'adventure-bridge' && authorization.adventureId === run.id && typeof authorization.nonce === 'string' && authorization.nonce.length >= 8 && authorization.verified === true;
    if (!entitled && context.environment === 'production') return bad('Reklamy z nagrodą wymagają potwierdzenia operatora.', 'adventure-ad-provider');
    if (!entitled && !valid) return good('Obejrzyj reklamę do końca, aby dostać dodatkową belkę.', { needsRewardedAd: true, purpose: 'adventure-bridge', adventureId: run.id });
    if (valid && state.adventures.adReceipts.includes(authorization.nonce)) return bad('Nagroda za tę reklamę została już odebrana.');
    if (valid) { state.adventures.adReceipts.push(authorization.nonce); state.adventures.adReceipts = state.adventures.adReceipts.slice(-32); }
  } else if (action.method === 'coins') {
    if (finite(state.resources?.coins) < ADVENTURE_RULES.bridgeExtraBeamCoins) return bad('Potrzebujesz 5 monet na dodatkową belkę.');
    state.resources.coins -= ADVENTURE_RULES.bridgeExtraBeamCoins;
  } else return bad('Wybierz monety albo reklamę.');
  run.data.extraPurchased++; run.data.budget++;
  return good('Dodatkowa belka jest gotowa do użycia.', { budget: run.data.budget });
}
export function adventureAction(state, action, context = {}) {
  if (typeof action?.type !== 'string' || !action.type.startsWith('adventure')) return null;
  ensure(state);
  const journeyResult = Journey.journeyAction(state, action, context);
  if (journeyResult !== null) return journeyResult;
  if (action.type === 'adventureStart') return start(state, action.kind);
  if (action.type === 'adventureSuspend') {
    const active = state.adventures.active;
    if (active && active.stage !== 'complete') state.adventures.parked[Journey.journeyRunKey(active)] = active;
    state.adventures.active = null; return good('Postęp przygody został zachowany.');
  }
  if (action.type === 'adventureBridgeExtra') return extraBridgeBeam(state, action, context);
  if (action.type !== 'adventureInput') return bad('Nieznane działanie w przygodzie.');
  const run = getActive(state, action);
  if (!run) return bad('Ta przygoda nie jest teraz otwarta.');
  refreshStages(state, run);
  if (run.stage === 'complete') return bad('Ta przygoda jest już ukończona. Nagroda została dodana do zasobów.');
  const data = run.data, now = state.adventures.clock, command = action.command;
  if (run.kind === 'cargoRain') {
    if (command !== 'catch') return bad('Złap spadający ładunek.');
    const drop = data.drops.find(item => item.id === action.dropId);
    if (!drop || drop.caught || now < drop.appearAt - EPS || now >= drop.appearAt + drop.fallSeconds - EPS) return bad('Ten ładunek nie jest już w zasięgu.');
    const reward = grant(state, { [drop.resource]: drop.amount });
    if (!reward) return bad('Nie można teraz dodać tej nagrody.');
    drop.caught = true; data.caught[drop.resource] += drop.amount;
    return good('Ładunek jest Twój!', { reward, caught: { ...data.caught }, coinSource: 'adventure' });
  }
  if (run.kind === 'treasureMap') {
    if (run.stage === 'pieces') return bad('Zbierz cztery fragmenty mapy, odkrywając trójki w ekspedycji.');
    if (run.stage === 'arrange') {
      if (command !== 'tileSwap' || !Number.isInteger(action.first) || !Number.isInteger(action.second) || action.first < 0 || action.first > 3 || action.second < 0 || action.second > 3 || action.first === action.second) return bad('Wybierz dwa różne fragmenty mapy, aby zamienić je miejscami.');
      [data.tiles[action.first], data.tiles[action.second]] = [data.tiles[action.second], data.tiles[action.first]];
      if (data.tiles.every((tile, index) => tile === index)) run.stage = 'search';
      return good(run.stage === 'search' ? 'Mapa jest gotowa. Przeczytaj wskazówkę i znajdź skarb na wyspie.' : 'Fragmenty mapy zamieniły się miejscami.');
    }
    if (command !== 'search' || !SPOTS.includes(action.building)) return bad('Wybierz miejsce na wyspie, które pasuje do wskazówki.');
    data.searches++;
    return action.building === data.treasureSpot ? complete(state, run) : bad('Tu nie ma skarbu. Spójrz jeszcze raz na wskazówkę.');
  }
  if (run.kind === 'pirateCannon') {
    if (command === 'aim') {
      if (!Number.isFinite(action.x) || !Number.isFinite(action.y) || action.x < 0 || action.x > 100 || action.y < 0 || action.y > 85) return bad('Wyceluj w morze przed armatą.');
      data.aim = { x: action.x, y: action.y }; return good('Armata jest wycelowana.');
    }
    if (command !== 'shoot') return bad('Wyceluj i wystrzel kulę.');
    if (!state.adventures.progress.ammunition) return bad('Zdobądź kulę, wygrywając rundę minigry z kulką.');
    if (data.projectiles.length >= 3) return bad('Zaczekaj, aż wystrzelone kule dotrą do celu.');
    state.adventures.progress.ammunition--; data.shots++;
    const dx = data.aim.x - 50, dy = data.aim.y - 94, distance = Math.max(1, Math.hypot(dx, dy));
    data.projectiles.push({ id: ++data.shotSequence, x: 50, y: 94, vx: dx / distance * ADVENTURE_RULES.cannonProjectileSpeed, vy: dy / distance * ADVENTURE_RULES.cannonProjectileSpeed, age: 0 });
    return good('Kula leci w stronę celu.');
  }
  if (run.kind === 'bridge') {
    if (command === 'bridgeToggle') {
      const a = action.from, b = action.to;
      if (!bridgeEdgeAllowed(a, b)) return bad('Połącz dwa sąsiednie punkty. Na dłuższą belkę nie starczy materiału.');
      const from = Math.min(a, b), to = Math.max(a, b), index = data.edges.findIndex(edge => edge[0] === from && edge[1] === to);
      if (index >= 0) data.edges.splice(index, 1);
      else { if (data.edges.length >= data.budget) return bad('Wykorzystałeś wszystkie belki. Przenieś jedną z nich albo dokup dodatkową.'); data.edges.push([from, to]); }
      data.test = null; return good(index >= 0 ? 'Belka wróciła do zapasu.' : 'Belka jest na miejscu.');
    }
    if (command !== 'bridgeTest') return bad('Połącz podpory belkami i sprawdź konstrukcję.');
    data.test = testBridge(data.edges, data.budget);
    return data.test.stable ? complete(state, run) : good('Most wymaga poprawki. Dodaj ukośne podpory i zadbaj o ciągły pomost.', { bridgeTest: data.test });
  }
  if (run.kind === 'signals') {
    if (command === 'replay') { run.stage = 'memorize'; data.entered = []; data.showUntil = now + ADVENTURE_RULES.signalPreviewSeconds; return good('Obejrzyj sygnał jeszcze raz.'); }
    if (run.stage !== 'repeat') return bad('Najpierw zapamiętaj kolejność świateł.');
    if (command !== 'signal' || !Number.isInteger(action.value) || action.value < 0 || action.value > 3) return bad('Wybierz jedno z czterech świateł.');
    if (action.value !== data.sequence[data.entered.length]) { data.attempts++; data.entered = []; run.stage = 'memorize'; data.showUntil = now + ADVENTURE_RULES.signalPreviewSeconds; return good('Spróbuj ponownie. Latarnia pokaże sygnał jeszcze raz.'); }
    data.entered.push(action.value);
    return data.entered.length === data.sequence.length ? complete(state, run) : good('Dobry sygnał. Wybierz następne światło.');
  }
  if (run.kind === 'letters') {
    const letter = data.letters.find(item => item.id === action.letterId);
    if (!letter) return bad('Wybierz jeden z trzech listów.');
    if (command === 'read') { letter.read = true; return good('Przeczytaj wskazówkę i wybierz odbiorcę.'); }
    if (command !== 'deliver' || !SPOTS.includes(action.building)) return bad('Wybierz miejsce, w którym pracuje adresat listu.');
    if (!letter.read) return bad('Najpierw otwórz list i przeczytaj wskazówkę.');
    if (letter.delivered) return bad('Ten list jest już doręczony.');
    if (action.building !== letter.recipient) return bad('To nie ten adresat. Wróć do wskazówki w liście.');
    letter.delivered = true; if (!data.visits.includes(action.building)) data.visits.push(action.building);
    return data.letters.every(item => item.delivered) ? complete(state, run) : good('List doręczony. Mieszkaniec dziękuje Ci za pomoc.');
  }
  if (run.kind === 'rhythm') {
    if (run.stage === 'find') {
      if (command !== 'inspect' || !SPOTS.includes(action.building)) return bad('Rozejrzyj się po wyspie i poszukaj instrumentów.');
      const instrument = data.instruments.find(item => item.building === action.building && !item.found);
      if (!instrument) return good('Tutaj nie ma kolejnego instrumentu. Poszukaj przy Gospodarstwie, Magazynie lub Latarni.');
      instrument.found = true;
      if (data.instruments.every(item => item.found)) { run.stage = 'listen'; data.playUntil = now + ADVENTURE_RULES.rhythmPreviewSeconds; }
      return good('Instrument znaleziony!');
    }
    if (command === 'replay') { run.stage = 'listen'; data.beats = []; data.performStartedAt = null; data.playUntil = now + ADVENTURE_RULES.rhythmPreviewSeconds; return good('Posłuchaj rytmu jeszcze raz.'); }
    if (run.stage !== 'perform') return bad('Najpierw posłuchaj melodii i zobacz rytm.');
    if (command !== 'beat' || !Number.isInteger(action.value) || action.value < 0 || action.value > 2) return bad('Wybierz instrument i wystukaj rytm.');
    const expected = data.sequence[data.beats.length];
    const validTiming = !data.beats.length || Math.abs((now - data.performStartedAt) - data.beats.length * ADVENTURE_RULES.rhythmBeatSeconds) <= ADVENTURE_RULES.rhythmToleranceSeconds + EPS;
    if (action.value !== expected || !validTiming) { data.attempts++; run.stage = 'listen'; data.beats = []; data.performStartedAt = null; data.playUntil = now + ADVENTURE_RULES.rhythmPreviewSeconds; return good('Jeszcze raz! Powtórz instrumenty w pokazanym rytmie.'); }
    if (!data.beats.length) data.performStartedAt = now;
    data.beats.push(action.value);
    return data.beats.length === data.sequence.length ? complete(state, run) : good('Tak trzymaj!');
  }
  if (run.kind === 'garden') {
    if (command !== 'rotate' || !Number.isInteger(action.index) || !data.tiles[action.index]) return bad('Wybierz rynienkę, aby ją obrócić.');
    data.tiles[action.index].rotation = (data.tiles[action.index].rotation + 1) % 4; data.wet = gardenFlow(data);
    return data.ponds.every(index => data.wet.includes(index)) ? complete(state, run) : good('Rynienka obrócona. Poprowadź wodę do wszystkich trzech sadzawek.');
  }
  if (run.kind === 'cargoBalance') {
    if (run.stage === 'route') {
      if (command !== 'route' || !data.routes.some(route => route.id === action.routeId)) return bad('Wybierz trasę rejsu.');
      return action.routeId === 'sheltered' ? complete(state, run) : good('Wiatr spycha statek na rafę. Wybierz osłoniętą trasę.');
    }
    if (command === 'place') {
      const crate = data.crates.find(item => item.id === action.crateId);
      if (!crate || (action.slot !== null && !data.slots.includes(action.slot))) return bad('Wybierz skrzynię i miejsce na pokładzie.');
      const other = data.crates.find(item => item !== crate && item.slot === action.slot && action.slot !== null);
      if (other) other.slot = crate.slot;
      crate.slot = action.slot; data.moment = cargoMoment(data.crates); return good('Skrzynia jest na miejscu.');
    }
    if (command !== 'cargoTest') return bad('Rozmieść skrzynie i sprawdź równowagę.');
    data.moment = cargoMoment(data.crates);
    if (data.crates.some(crate => crate.slot === null)) return good('Najpierw załaduj wszystkie cztery skrzynie.');
    if (Math.abs(data.moment) > EPS) return good('Statek się przechyla. Cięższe skrzynie ustaw bliżej środka albo zrównoważ ładunek po drugiej stronie.');
    run.stage = 'route'; return good('Ładunek jest zrównoważony. Teraz wybierz bezpieczną trasę.');
  }
  return bad('Nieznane działanie w przygodzie.');
}


/** Compensate only a host-confirmed, foreground interruption. Ordinary absence
 * never calls this helper. The caller verifies account/generation/run identity. */
export function pauseAdventureFor(state, adventureId, seconds) {
  if (typeof adventureId !== 'string' || !Number.isFinite(seconds) || seconds < 0 || seconds > 2678400) return { ok: false, pausedSeconds: 0 };
  const adventures = ensure(state), run = [adventures.active, ...Object.values(adventures.parked)].find(item => item?.id === adventureId && item.stage !== 'complete');
  if (!run) return { ok: false, pausedSeconds: 0 };
  const existing = finite(run.recoveryPauseRemaining);
  const paused = Math.min(seconds, 2678400 - existing);
  if (!(paused > 0)) return { ok: true, pausedSeconds: 0 };
  run.startedAt += paused;
  if (run.kind === 'cargoRain') for (const drop of run.data.drops) drop.appearAt += paused;
  if (run.kind === 'signals') run.data.showUntil += paused;
  if (run.kind === 'rhythm') {
    if (Number.isFinite(run.data.playUntil)) run.data.playUntil += paused;
    if (Number.isFinite(run.data.performStartedAt)) run.data.performStartedAt += paused;
  }
  run.recoveryPauseRemaining = existing + paused;
  return { ok: true, pausedSeconds: paused };
}
