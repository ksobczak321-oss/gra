// Economy and progression for the interactive approved-screen prototype.
// Pure data module: browser UI and Node tests share the same rules.
export const RESOURCES = {
  coins: { name: 'Monety', short: 'monet', symbol: '◉', price: 1 },
  wood: { name: 'Drewno', short: 'drewna', symbol: '▰', price: 3 },
  stone: { name: 'Kamień', short: 'kamienia', symbol: '◆', price: 4 },
  food: { name: 'Żywność', short: 'żywności', symbol: '✦', price: 2 },
  planks: { name: 'Deski', short: 'desek', symbol: '▤', price: 6 }
};

export const BUILDINGS = {
  house: { name: 'Dom', description: 'Każdy poziom zapewnia 24 miejsca do mieszkania. Osoby bez miejsca obniżają szczęście o 1 punkt procentowy na godzinę każda.', cost: { coins: 100, wood: 40, stone: 20, planks: 10 }, maxLevel: 5 },
  farm: { name: 'Farma', description: 'Rolnicy zbierają żywność. Odbieraj gotowe plony.', cost: { coins: 80, wood: 30, stone: 10 }, resource: 'food', rate: 3, maxLevel: 5 },
  sawmill: { name: 'Tartak', description: 'Przetwarza drewno w deski potrzebne do rozbudowy.', cost: { coins: 120, wood: 45, stone: 25 }, resource: 'planks', rate: 2, input: 'wood', inputRate: 3, maxLevel: 5 },
  quarry: { name: 'Kamieniołom', description: 'Kamieniarze wydobywają surowiec do budowy i naprawy latarni.', cost: { coins: 150, wood: 35, stone: 20 }, resource: 'stone', rate: 3, maxLevel: 5 },
  dock: { name: 'Przystań', description: 'Łączy wyspę z handlem i ekspedycjami. Załoga zarabia monety.', cost: { coins: 200, wood: 60, planks: 25 }, resource: 'coins', rate: 3, maxLevel: 5 },
  warehouse: { name: 'Magazyn', description: 'Chroni zapasy. Każdy poziom zwiększa limit gotowej produkcji.', cost: { coins: 160, wood: 35, stone: 30, planks: 15 }, maxLevel: 5 },
  lighthouse: { name: 'Latarnia', description: 'Dostarcz drewno i kamień, a potem przywróć światło starej latarni. Naprawioną latarnię możesz rozbudować do poziomu ratusza.', cost: { coins: 300, planks: 30 }, maxLevel: 5 },
  lumber: { name: 'Obóz drwali', description: 'Drwale pozyskują drewno potrzebne do budowy.', cost: { coins: 90, wood: 25, stone: 15 }, resource: 'wood', rate: 4, maxLevel: 5 },
  windmill: { name: 'Młyn', description: 'Przetwarza zbiory w zapasy żywności dla osady.', cost: { coins: 140, wood: 40, stone: 20, planks: 15 }, resource: 'food', rate: 4, input: 'food', inputRate: 2, maxLevel: 5 },
  townhall: { name: 'Ratusz', description: 'Poziom ratusza jest poziomem wyspy i maksymalnym poziomem pozostałych budynków. Każdy poziom daje teoretyczny limit 24 mieszkańców; miejsca do mieszkania zapewnia dom.', cost: { coins: 240, wood: 50, stone: 50, planks: 20 }, resource: 'coins', rate: 5, maxLevel: 5 },
  chapel: { name: 'Kaplica', description: 'Każda rozbudowa podnosi zadowolenie mieszkańców.', cost: { coins: 180, wood: 20, stone: 60, planks: 10 }, maxLevel: 5 },
  market: { name: 'Targ', description: 'Kupcy wymieniają towary i generują monety dla wyspy.', cost: { coins: 130, wood: 35, stone: 15 }, resource: 'coins', rate: 4, maxLevel: 5 }
};

// Alias used by view components when presenting production summaries.
for (const definition of Object.values(BUILDINGS)) {
  if (definition.resource) definition.production = definition.resource;
}

export const EXPEDITIONS = [
  { id: 'misty', name: 'Mgliste Wyspy', description: 'Odszukaj szlak do portu. Most pozwoli przekroczyć jedną wodną przeszkodę.', reward: { coins: 180, wood: 50, planks: 20 }, par: 10, tools: { bridge: 1, axe: 1, dynamite: 0 }, map: ['S..T..', '.WWT..', '.W.TC.', '.W....', '.TTTW.', '...W.G'] },
  { id: 'quarry', name: 'Zapomniany kamieniołom', description: 'Zabierz zapasy z opuszczonej kopalni i znajdź wyjście.', reward: { coins: 220, stone: 80, wood: 25 }, par: 13, tools: { bridge: 0, axe: 1, dynamite: 1 }, map: ['S.R...', '.TRR..', '..R.C.', '.TT...', '.R.RT.', 'C...G.'] },
  { id: 'ruins', name: 'Ruiny strażnicy', description: 'Zdobądź klucz do bramy i wróć z zapasami dla latarni.', reward: { coins: 300, planks: 40, stone: 50 }, par: 14, tools: { bridge: 1, axe: 1, dynamite: 1 }, map: ['S.TW..', '.R.WC.', '.K.W..', '.R.D..', '.TT...', '....G.'] }
];

export const TASKS = [
  { id: 'collect', name: 'Pierwsze zbiory', description: 'Odbierz co najmniej jedną partię gotowej produkcji.', reward: { coins: 100, wood: 20 } },
  { id: 'upgrade', name: 'Wyspa rośnie', description: 'Ulepsz dowolny budynek osady.', reward: { coins: 150, planks: 15 } },
  { id: 'expedition', name: 'Poza horyzont', description: 'Ukończ ekspedycję i wróć z nagrodą.', reward: { coins: 200, food: 40 } },
  { id: 'craft', name: 'Dobry rzemieślnik', description: 'Przetwórz surowce w tartaku lub młynie.', reward: { coins: 100, stone: 20 } },
  { id: 'lighthouse', name: 'Światło wraca', description: 'Dostarcz materiały i napraw starą latarnię.', reward: { coins: 500, planks: 50 } }
];

const owns = (object, key) => object !== null && typeof object === 'object' && Object.hasOwn(object, key);
const integer = (value, fallback = 0, min = 0, max = 10000000) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
const amount = (value, fallback = 0, max = 10000000) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : fallback;
const good = message => ({ ok: true, message });
const bad = message => ({ ok: false, message });
const productionIds = Object.keys(BUILDINGS).filter(id => BUILDINGS[id].resource);

export function createState() {
  const buildings = {};
  for (const id of Object.keys(BUILDINGS)) buildings[id] = { level: id === 'lighthouse' ? 0 : 1, workers: BUILDINGS[id].resource ? 1 : 0, ready: 0 };
  // Give the first session something tangible to collect immediately.
  buildings.farm.ready = 12;
  buildings.lumber.ready = 16;
  buildings.quarry.ready = 10;
  return {
    version: 3,
    resources: Object.fromEntries(Object.keys(RESOURCES).map(id => [id, 100])),
    population: 12, capacity: 24, happiness: 0,
    populationProgress: 0, populationDirection: 0,
    buildings,
    objective: { wood: 20, stone: 12, repaired: false },
    speed: 1, paused: false, day: 18, minutes: 564, productionSeconds: 0,
    settings: { sound: false, motion: true },
    tasks: Object.fromEntries(TASKS.map(task => [task.id, false])),
    expeditions: {},
    statistics: { collected: 0, upgrades: 0, crafted: 0, expeditions: 0, traded: 0 },
    decorations: { flowers: 0, lamp: 0, bench: 0 }, paths: 0,
    lastActionAt: 0
  };
}

export function totalWorkers(state) {
  return Object.values(state.buildings).reduce((sum, building) => sum + building.workers, 0);
}

export function housingCapacity(state) {
  return state.buildings.house.level * 24;
}

export function unhousedResidents(state) {
  return Math.max(0, state.population - housingCapacity(state));
}

export function buildingLevelLimit(state, id) {
  if (!owns(BUILDINGS, id)) return 0;
  return id === 'townhall' ? BUILDINGS[id].maxLevel : Math.min(BUILDINGS[id].maxLevel, state.buildings.townhall.level);
}

export function upgradeEligibility(state, id) {
  if (!owns(BUILDINGS, id)) return bad('Nie ma takiego budynku.');
  const nextLevel = state.buildings[id].level + 1;
  if (nextLevel > BUILDINGS[id].maxLevel) return bad('Osiągnięto najwyższy poziom.');
  if (nextLevel > buildingLevelLimit(state, id)) return bad(`Najpierw rozbuduj ratusz do poziomu ${nextLevel}.`);
  return good('Rozbudowa jest dostępna.');
}

// Rates interpolate the agreed anchors: 0%=0, 50%=1/6, 100%=1 person/hour.
// Negative happiness uses the same rate for population loss.
export function populationRate(happiness) {
  if (typeof happiness !== 'number' || !Number.isFinite(happiness)) return 0;
  const magnitude = Math.min(100, Math.abs(happiness));
  return Math.sign(happiness) * (magnitude <= 50 ? magnitude / 300 : 1 / 6 + (magnitude - 50) / 60);
}

export function populationIntervalSeconds(happiness) {
  const rate = Math.abs(populationRate(happiness));
  return rate ? 3600 / rate : Infinity;
}

function trimWorkers(state) {
  let excess = totalWorkers(state) - state.population;
  while (excess > 0) {
    // Remove from the largest crew first, preserving a spread of working buildings.
    const id = [...productionIds].reverse().reduce((selected, candidate) =>
      state.buildings[candidate].workers > state.buildings[selected].workers ? candidate : selected);
    if (!state.buildings[id].workers) break;
    state.buildings[id].workers -= 1;
    excess -= 1;
  }
}

function resetPopulationProgress(state, direction = 0) {
  state.populationProgress = 0;
  state.populationDirection = direction;
}

function populationAtLimit(state, direction) {
  return direction > 0 ? state.population >= state.capacity : direction < 0 && state.population <= 6;
}

function syncPopulationProgress(state) {
  const direction = Math.sign(populationRate(state.happiness));
  if (direction !== state.populationDirection || !direction || populationAtLimit(state, direction)) {
    resetPopulationProgress(state, direction);
  }
  return direction;
}

function advancePopulation(state, activeSeconds) {
  state.capacity = state.buildings.townhall.level * 24;
  let remaining = activeSeconds;
  // Between population changes the housing penalty is constant. Integrate each
  // linear happiness/rate segment exactly, rather than applying a whole hour at
  // its starting rate or looping once for every second in a long saved interval.
  while (remaining > 0) {
    const happiness = state.happiness;
    const happinessSlope = happiness > -100 ? -unhousedResidents(state) / 3600 : 0;
    let boundary = null;
    if (happinessSlope < 0) boundary = happiness > 50 ? 50 : happiness > 0 ? 0 : happiness > -50 ? -50 : -100;
    const boundaryTime = boundary === null ? Infinity : (boundary - happiness) / happinessSlope;
    const direction = Math.sign(happiness) || (happinessSlope < 0 ? -1 : 0);
    if (direction !== state.populationDirection || !direction || populationAtLimit(state, direction)) resetPopulationProgress(state, direction);
    const blocked = !direction || populationAtLimit(state, direction);
    const rate = Math.abs(populationRate(happiness)) / 3600;
    const rateDerivative = Math.abs(happiness) > 50 || (happiness === -50 && happinessSlope < 0) ? 1 / 60 : 1 / 300;
    const rateSlope = direction * happinessSlope * rateDerivative / 3600;
    let duration = Math.min(remaining, boundaryTime);
    let changesPopulation = false;
    if (!blocked) {
      const gain = Math.max(0, (rate + rateSlope * duration / 2) * duration);
      const needed = 1 - state.populationProgress;
      if (gain + 1e-12 >= needed) {
        const discriminant = Math.max(0, rate * rate + 2 * rateSlope * needed);
        const denominator = rate + Math.sqrt(discriminant);
        if (denominator > 0) {
          duration = Math.min(duration, 2 * needed / denominator);
          changesPopulation = true;
        }
      }
    }
    state.happiness = Math.max(-100, Math.min(100, boundary !== null && duration === boundaryTime ? boundary : happiness + happinessSlope * duration));
    if (!blocked) state.populationProgress = Math.max(0, state.populationProgress + (rate + rateSlope * duration / 2) * duration);
    if (changesPopulation) {
      state.population += direction;
      state.populationProgress = 0;
      if (direction < 0) trimWorkers(state);
    }
    syncPopulationProgress(state);
    remaining = Math.max(0, remaining - duration);
  }
}

export function normalizeState(raw) {
  const state = createState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return state;
  for (const key of Object.keys(RESOURCES)) state.resources[key] = integer(raw.resources?.[key], state.resources[key]);
  for (const id of Object.keys(BUILDINGS)) {
    const saved = raw.buildings?.[id];
    if (!saved || typeof saved !== 'object') continue;
    const level = integer(saved.level, state.buildings[id].level, id === 'townhall' ? 1 : 0, BUILDINGS[id].maxLevel);
    state.buildings[id] = { level, workers: BUILDINGS[id].resource && level > 0 ? integer(saved.workers, state.buildings[id].workers, 0, level * 2 + 2) : 0, ready: BUILDINGS[id].resource && level > 0 ? integer(saved.ready, 0, 0, 1000) : 0 };
  }
  if (raw.version !== 3) {
    // Older versions allowed other buildings above the townhall. Preserve their
    // paid-for levels by promoting the legacy townhall once during migration.
    state.buildings.townhall.level = Math.max(state.buildings.townhall.level, ...Object.values(state.buildings).map(building => building.level));
  }
  for (const id of Object.keys(BUILDINGS)) {
    const building = state.buildings[id];
    building.level = Math.min(building.level, buildingLevelLimit(state, id));
    building.workers = Math.min(building.workers, building.level ? building.level * 2 + 2 : 0);
    if (!building.level) building.ready = 0;
  }
  state.capacity = state.buildings.townhall.level * 24;
  state.population = integer(raw.population, state.population, 6, state.capacity);
  state.happiness = typeof raw.happiness === 'number' && Number.isFinite(raw.happiness) ? Math.max(-100, Math.min(100, raw.happiness)) : 0;
  const direction = Math.sign(populationRate(state.happiness));
  state.populationDirection = direction;
  if (direction && raw.populationDirection === direction &&
      !(direction > 0 && state.population >= state.capacity) && !(direction < 0 && state.population <= 6)) {
    state.populationProgress = amount(raw.populationProgress, 0, 0.999999999999);
  }
  trimWorkers(state);
  state.objective.wood = integer(raw.objective?.wood, 20, 0, 50);
  state.objective.stone = integer(raw.objective?.stone, 12, 0, 30);
  state.objective.repaired = raw.objective?.repaired === true;
  // Keep the chapter milestone and its visible building level consistent.
  if (state.objective.repaired || state.buildings.lighthouse.level > 0) {
    state.objective = { wood: 50, stone: 30, repaired: true };
    state.buildings.lighthouse.level = Math.max(1, state.buildings.lighthouse.level);
  }
  state.speed = [1, 2, 4].includes(raw.speed) ? raw.speed : 1;
  state.paused = raw.paused === true;
  state.day = integer(raw.day, 18, 1, 99999);
  state.minutes = amount(raw.minutes, 564, 1439.999);
  state.productionSeconds = amount(raw.productionSeconds, 0, 9.999);
  for (const key of ['sound', 'motion']) state.settings[key] = typeof raw.settings?.[key] === 'boolean' ? raw.settings[key] : state.settings[key];
  for (const task of TASKS) state.tasks[task.id] = raw.tasks?.[task.id] === true;
  for (const expedition of EXPEDITIONS) {
    const record = raw.expeditions?.[expedition.id];
    if (record && typeof record === 'object' && record.completed === true) {
      state.expeditions[expedition.id] = { completed: true, runs: integer(record.runs, 1, 1, 1000000), bestMoves: integer(record.bestMoves, 99, 1, 1000000) };
    }
  }
  for (const key of Object.keys(state.statistics)) state.statistics[key] = integer(raw.statistics?.[key], 0);
  for (const key of Object.keys(state.decorations)) state.decorations[key] = integer(raw.decorations?.[key], 0, 0, 100);
  state.paths = integer(raw.paths, 0, 0, 100);
  state.lastActionAt = integer(raw.lastActionAt, 0, 0, Number.MAX_SAFE_INTEGER);
  return state;
}

export function buildingCost(state, id) {
  if (!owns(BUILDINGS, id)) return null;
  const nextLevel = state.buildings[id].level + 1;
  return Object.fromEntries(Object.entries(BUILDINGS[id].cost).map(([resource, cost]) => [resource, cost * nextLevel]));
}

export function canAfford(state, cost) {
  return !!cost && Object.entries(cost).every(([resource, value]) => owns(RESOURCES, resource) && typeof value === 'number' && Number.isFinite(value) && value >= 0 && state.resources[resource] >= value);
}

function spend(state, cost) {
  for (const [resource, value] of Object.entries(cost)) state.resources[resource] -= value;
}

function reward(state, values) {
  for (const [resource, value] of Object.entries(values)) state.resources[resource] = Math.min(10000000, state.resources[resource] + value);
}

export function taskReady(state, id) {
  if (state.tasks[id]) return false;
  switch (id) {
    case 'collect': return state.statistics.collected > 0;
    case 'upgrade': return state.statistics.upgrades > 0;
    case 'expedition': return state.statistics.expeditions > 0;
    case 'craft': return state.statistics.crafted > 0;
    case 'lighthouse': return state.objective.repaired;
    default: return false;
  }
}

export function tick(state, elapsedSeconds) {
  if (state.paused || typeof elapsedSeconds !== 'number' || !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return;
  // Demographics uses active real seconds, independently of production speed.
  advancePopulation(state, elapsedSeconds);
  const elapsed = Math.min(elapsedSeconds, 3600) * state.speed;
  const nextMinutes = state.minutes + elapsed;
  state.day = Math.min(99999, state.day + Math.floor(nextMinutes / 1440));
  state.minutes = nextMinutes % 1440;
  const production = state.productionSeconds + elapsed;
  const batches = Math.floor(production / 10);
  state.productionSeconds = production % 10;
  if (!batches) return;
  const storageLimit = 100 + state.buildings.warehouse.level * 100;
  for (const id of productionIds) {
    const building = state.buildings[id], definition = BUILDINGS[id];
    if (building.level === 0 || building.workers === 0 || building.ready >= storageLimit) continue;
    const batchSize = definition.rate * building.level * building.workers;
    let count = batches;
    const remainingBatches = Math.ceil((storageLimit - building.ready) / batchSize);
    count = Math.min(count, remainingBatches);
    if (definition.input) {
      const cost = definition.inputRate * building.level * building.workers;
      count = Math.min(count, Math.floor(state.resources[definition.input] / cost));
      state.resources[definition.input] -= cost * count;
    }
    building.ready = Math.min(storageLimit, building.ready + batchSize * count);
  }
}

export function act(state, action, now = Date.now()) {
  if (!action || typeof action !== 'object') return bad('Nieznane działanie.');
  const id = action.building;
  if (['build', 'upgrade', 'collect', 'assign', 'craft'].includes(action.type) && !owns(BUILDINGS, id)) return bad('Nie ma takiego budynku.');
  let result;
  switch (action.type) {
    case 'build':
    case 'upgrade': {
      if (id === 'lighthouse' && state.buildings.lighthouse.level === 0) return act(state, { type: 'repair' }, now);
      const building = state.buildings[id], definition = BUILDINGS[id];
      if (action.type === 'build' && building.level > 0) return bad('Ten budynek już istnieje. Wybierz ulepszenie.');
      if (action.type === 'upgrade' && building.level === 0) return bad('Najpierw zbuduj ten budynek.');
      const eligibility = upgradeEligibility(state, id);
      if (!eligibility.ok) return eligibility;
      const cost = buildingCost(state, id);
      if (!canAfford(state, cost)) return bad('Brakuje surowców do rozbudowy.');
      spend(state, cost);
      building.level += 1;
      if (definition.resource && building.workers === 0 && totalWorkers(state) < state.population) building.workers = 1;
      if (id === 'townhall') state.capacity = building.level * 24;
      if (id === 'chapel') state.happiness = Math.min(100, state.happiness + 3);
      state.statistics.upgrades += 1;
      result = good(`${definition.name}: poziom ${building.level}.`);
      break;
    }
    case 'collect': {
      const building = state.buildings[id], definition = BUILDINGS[id];
      if (!definition.resource || !building.ready) return bad('Nie ma jeszcze gotowej produkcji do odbioru.');
      const quantity = building.ready;
      reward(state, { [definition.resource]: quantity });
      building.ready = 0;
      state.statistics.collected += 1;
      result = good(`Odebrano ${quantity} ${RESOURCES[definition.resource].short}.`);
      break;
    }
    case 'assign': {
      const building = state.buildings[id];
      if (!BUILDINGS[id].resource || !building.level) return bad('Ten budynek nie zatrudnia pracowników.');
      if (action.delta !== 1 && action.delta !== -1) return bad('Zmieniaj przydział o jednego pracownika.');
      if (action.delta > 0 && totalWorkers(state) >= state.population) return bad('Brakuje wolnych mieszkańców.');
      if (building.workers + action.delta < 0 || building.workers + action.delta > building.level * 2 + 2) return bad('Osiągnięto limit pracowników budynku.');
      building.workers += action.delta;
      result = good(`Pracownicy: ${building.workers}.`);
      break;
    }
    case 'craft': {
      if (!['sawmill', 'windmill'].includes(id) || !state.buildings[id].level) return bad('Nie można tu przetwarzać surowców.');
      const cost = id === 'sawmill' ? { wood: 10 } : { food: 4, coins: 2 };
      const output = id === 'sawmill' ? { planks: 6 } : { food: 10 };
      if (!canAfford(state, cost)) return bad('Brakuje surowców do przetworzenia.');
      spend(state, cost); reward(state, output); state.statistics.crafted += 1;
      result = good(id === 'sawmill' ? 'Przetworzono 10 drewna w 6 desek.' : 'Zmielono zbiory: +6 żywności, koszt 2 monety.');
      break;
    }
    case 'deliver': {
      const resource = action.resource;
      if (!['wood', 'stone'].includes(resource)) return bad('Latarnia potrzebuje drewna i kamienia.');
      if (state.objective.repaired) return bad('Latarnia jest już naprawiona.');
      const goal = resource === 'wood' ? 50 : 30;
      const quantity = Math.min(goal - state.objective[resource], 10, state.resources[resource]);
      if (quantity <= 0) return bad(state.objective[resource] >= goal ? 'Dostarczono już wszystkie materiały tego rodzaju.' : 'Nie masz tego surowca.');
      state.resources[resource] -= quantity;
      state.objective[resource] += quantity;
      result = good(`Dostarczono ${quantity} ${RESOURCES[resource].short} do latarni.`);
      break;
    }
    case 'repair': {
      if (state.objective.repaired) return bad('Latarnia jest już naprawiona.');
      const eligibility = upgradeEligibility(state, 'lighthouse');
      if (!eligibility.ok) return eligibility;
      if (state.objective.wood < 50 || state.objective.stone < 30) return bad('Najpierw dostarcz 50 drewna i 30 kamienia.');
      const cost = BUILDINGS.lighthouse.cost;
      if (!canAfford(state, cost)) return bad('Naprawa wymaga 300 monet i 30 desek.');
      spend(state, cost); state.objective.repaired = true; state.buildings.lighthouse.level = 1;
      state.happiness = Math.min(100, state.happiness + 10);
      result = good('Latarnia znów świeci! Odbierz nagrodę w zadaniach.');
      break;
    }
    case 'claim': {
      const task = TASKS.find(item => item.id === action.task);
      if (!task || !taskReady(state, task.id)) return bad('To zadanie nie jest ukończone albo nagroda została już odebrana.');
      state.tasks[task.id] = true; reward(state, task.reward);
      result = good(`Odebrano nagrodę: ${task.name}.`);
      break;
    }
    case 'trade': {
      const resource = action.resource, quantity = action.amount === undefined ? 10 : action.amount;
      if (!owns(RESOURCES, resource) || resource === 'coins' || typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) return bad('Nieprawidłowy towar lub ilość.');
      if (!state.buildings.dock.level) return bad('Zbuduj przystań, aby rozpocząć handel.');
      const buying = action.direction === 'buy';
      if (action.direction !== undefined && !['buy', 'sell'].includes(action.direction)) return bad('Nieznany rodzaj handlu.');
      const price = RESOURCES[resource].price * quantity * (buying ? 2 : 1);
      const cost = buying ? { coins: price } : { [resource]: quantity };
      if (!canAfford(state, cost)) return bad(buying ? 'Brakuje monet na zakup.' : 'Nie masz tylu towarów na sprzedaż.');
      spend(state, cost); reward(state, buying ? { [resource]: quantity } : { coins: price });
      state.statistics.traded += 1;
      result = good(buying ? `Kupiono ${quantity} ${RESOURCES[resource].short} za ${price} monet.` : `Sprzedano ${quantity} ${RESOURCES[resource].short} za ${price} monet.`);
      break;
    }
    case 'expeditionComplete': {
      const expedition = EXPEDITIONS.find(item => item.id === action.expedition);
      if (!expedition || !Number.isSafeInteger(action.moves) || action.moves < 1 || action.moves > 100000) return bad('Nieprawidłowy wynik ekspedycji.');
      const caches = action.caches === undefined ? 0 : action.caches;
      const availableCaches = expedition.map.reduce((sum, row) => sum + [...row].filter(tile => tile === 'C').length, 0);
      if (!Number.isSafeInteger(caches) || caches < 0 || caches > availableCaches) return bad('Nieprawidłowa liczba skrzyń ekspedycji.');
      const old = state.expeditions[expedition.id];
      // A completed run has a single settlement reward; UI clears the run after this action.
      if (old?.completed) return bad('Nagroda za tę ekspedycję została już odebrana. Wybierz kolejną wyspę.');
      reward(state, expedition.reward);
      if (caches > 0) reward(state, { coins: caches * 10 });
      state.expeditions[expedition.id] = { completed: true, runs: 1, bestMoves: action.moves };
      state.statistics.expeditions += 1;
      result = good(`Ekspedycja „${expedition.name}” ukończona! Nagroda trafiła do magazynu.${caches > 0 ? ` Bonus za skrzynie: ${caches * 10} monet.` : ''}`);
      break;
    }
    case 'decorate': {
      const costs = { flowers: 25, lamp: 40, bench: 35 };
      if (!owns(costs, action.decoration)) return bad('Nie ma takiej dekoracji.');
      if (state.decorations[action.decoration] >= 100) return bad('Osiągnięto limit dekoracji tego rodzaju.');
      if (!canAfford(state, { coins: costs[action.decoration] })) return bad('Brakuje monet na dekorację.');
      spend(state, { coins: costs[action.decoration] });
      state.decorations[action.decoration] += 1;
      state.happiness = Math.min(100, state.happiness + 1);
      result = good('Dekoracja dodana. Wyspa jest jeszcze piękniejsza!');
      break;
    }
    case 'path': {
      if (state.paths >= 100) return bad('Wszystkie ścieżki są już rozbudowane.');
      const cost = { stone: 10, wood: 5 };
      if (!canAfford(state, cost)) return bad('Ścieżka wymaga 10 kamienia i 5 drewna.');
      spend(state, cost);
      state.paths += 1;
      state.happiness = Math.min(100, state.happiness + 1);
      result = good('Nowa ścieżka połączyła osadę.');
      break;
    }
    case 'pause':
      state.paused = !state.paused;
      result = good(state.paused ? 'Symulacja wstrzymana.' : 'Wyspa znów żyje.');
      break;
    case 'speed':
      if (![1, 2, 4].includes(action.speed)) return bad('Dostępne tempo: 1×, 2× lub 4×.');
      state.speed = action.speed;
      result = good(`Tempo wyspy: ${state.speed}×.`);
      break;
    case 'setting':
      if (!['sound', 'motion'].includes(action.key) || typeof action.value !== 'boolean') return bad('Nieprawidłowe ustawienie.');
      state.settings[action.key] = action.value;
      result = good('Zapisano ustawienia.');
      break;
    default:
      return bad('Nieznane działanie.');
  }
  syncPopulationProgress(state);
  state.lastActionAt = integer(now, state.lastActionAt, 0, Number.MAX_SAFE_INTEGER);
  return result;
}
