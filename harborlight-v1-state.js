// Economy and progression for the interactive approved-screen prototype.
// Pure data module: browser UI and Node tests share the same rules.
import { MATERIAL_IDS, PRODUCTION_RECIPES, receiveMaterials, stockRoom, syncCrewProgress, advanceLogistics, normalizeLogisticsState, nextLogisticsEvent, storagePenalty, updateStorageStatus, workplaceUnlocked, marketCapacity, marketUsed, notify, constructionCounts, premiumActive, plannedLevel, promoteConstructionQueue } from './harborlight-v1-logistics.js?v=english-v7';
export { workplaceUnlocked, marketCapacity, marketUsed, storagePenalty } from './harborlight-v1-logistics.js?v=english-v7';

export const RESOURCES = {
  coins: { name: 'Coins', short: 'coins', symbol: '◉', price: 1 },
  wood: { name: 'Wood', short: 'wood', symbol: '▰', price: 3 },
  stone: { name: 'Stone', short: 'stone', symbol: '◆', price: 4 },
  grain: { name: 'Grain', short: 'grain', symbol: '❧', price: 1 },
  food: { name: 'Food', short: 'food', symbol: '✦', price: 2 },
  planks: { name: 'Planks', short: 'planks', symbol: '▤', price: 6 }
};

export const MAX_BUILDING_LEVEL = 100;
export const WORKPLACE_IDS = ['farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'warehouse', 'dock', 'market'];
export const CONSTRUCTION_IDS = ['farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'townhall', 'house', 'market', 'warehouse', 'dock', 'chapel', 'lighthouse'];

export const BUILDINGS = {
  house: { name: 'House', description: 'Each level provides housing for 24 residents. Every resident without a home reduces happiness by 1 percentage point per hour.', cost: { coins: 100, wood: 40, stone: 20, planks: 10 }, maxLevel: MAX_BUILDING_LEVEL },
  farm: { name: 'Farm', description: 'Each farmer produces 10 grain per working hour. Harvests wait in the farm storage until warehouse workers collect them.', cost: { coins: 80, wood: 30, stone: 10 }, resource: 'grain', rate: 10, maxLevel: MAX_BUILDING_LEVEL },
  sawmill: { name: 'Sawmill', description: 'Each worker produces 10 planks per hour. Each plank requires 2 wood from the central warehouse.', cost: { coins: 120, wood: 45, stone: 25 }, resource: 'planks', rate: 10, input: 'wood', inputRate: 2, maxLevel: MAX_BUILDING_LEVEL },
  quarry: { name: 'Quarry', description: 'Each quarry worker produces 10 stone per working hour. Stone waits at the quarry for transport.', cost: { coins: 150, wood: 35, stone: 20 }, resource: 'stone', rate: 10, maxLevel: MAX_BUILDING_LEVEL },
  dock: { name: 'Harbor', description: 'Connects the island to trade and expeditions. Assigned workers pay employment taxes.', cost: { coins: 200, wood: 60, planks: 25 }, maxLevel: MAX_BUILDING_LEVEL },
  warehouse: { name: 'Warehouse', description: 'Each warehouse worker carries 60 items per hour. Level 1 holds 1,000 of each material and 4,000 in total. Each additional level increases both limits by 50%.', cost: { coins: 160, wood: 35, stone: 30, planks: 15 }, maxLevel: MAX_BUILDING_LEVEL },
  lighthouse: { name: 'Lighthouse', description: 'Completing a level grants +100 happiness and doubles material production for 24 hours × the new level. Taxes are unchanged. Construction takes twice as long as transport.', cost: { coins: 300, planks: 30 }, maxLevel: MAX_BUILDING_LEVEL },
  lumber: { name: 'Lumber Camp', description: 'Each lumberjack produces 10 wood per working hour. Wood waits in local storage for transport.', cost: { coins: 90, wood: 25, stone: 15 }, resource: 'wood', rate: 10, maxLevel: MAX_BUILDING_LEVEL },
  windmill: { name: 'Windmill', description: 'Each miller produces 10 food per hour. Each food requires 2 grain from the central warehouse.', cost: { coins: 140, wood: 40, stone: 20, planks: 15 }, resource: 'food', rate: 10, input: 'grain', inputRate: 2, maxLevel: MAX_BUILDING_LEVEL },
  townhall: { name: 'Town Hall', description: 'The Town Hall determines the island level and the upgrade limit for other buildings. Each level allows 24 residents; the House provides their housing.', cost: { coins: 240, wood: 50, stone: 50, planks: 20 }, maxLevel: MAX_BUILDING_LEVEL },
  chapel: { name: 'Chapel', description: 'Completing an upgrade grants +10 happiness × the new level and doubles taxes for 10 hours. Separate one-use blessings give +50 of every resource and +20 happiness for one hour.', cost: { coins: 180, wood: 20, stone: 60, planks: 10 }, maxLevel: MAX_BUILDING_LEVEL },
  market: { name: 'Market', description: 'Merchants exchange goods. Assigned workers pay employment taxes.', cost: { coins: 130, wood: 35, stone: 15 }, maxLevel: MAX_BUILDING_LEVEL }
};

// Alias used by view components when presenting production summaries.
for (const definition of Object.values(BUILDINGS)) {
  if (definition.resource) definition.production = definition.resource;
}

export const EXPEDITIONS = [
  { id: 'misty', name: 'Misty Isles', description: 'Find a route to the harbor. A bridge lets you cross one water obstacle.', reward: { coins: 180, wood: 50, planks: 20 }, par: 10, tools: { bridge: 1, axe: 1, dynamite: 0 }, map: ['S..T..', '.WWT..', '.W.TC.', '.W....', '.TTTW.', '...W.G'] },
  { id: 'quarry', name: 'Forgotten Quarry', description: 'Collect supplies from the abandoned mine and find the exit.', reward: { coins: 220, stone: 80, wood: 25 }, par: 13, tools: { bridge: 0, axe: 1, dynamite: 1 }, map: ['S.R...', '.TRR..', '..R.C.', '.TT...', '.R.RT.', 'C...G.'] },
  { id: 'ruins', name: 'Watchtower Ruins', description: 'Find the gate key and return with supplies for the lighthouse.', reward: { coins: 300, planks: 40, stone: 50 }, par: 14, tools: { bridge: 1, axe: 1, dynamite: 1 }, map: ['S.TW..', '.R.WC.', '.K.W..', '.R.D..', '.TT...', '....G.'] }
];

export const TASKS = [
  { id: 'collect', name: 'First Harvest', description: 'Have warehouse workers collect at least one batch of finished goods.', reward: { coins: 100, wood: 20 } },
  { id: 'upgrade', name: 'Growing Island', description: 'Upgrade any settlement building.', reward: { coins: 150, planks: 15 } },
  { id: 'expedition', name: 'Beyond the Horizon', description: 'Complete an expedition and return with its reward.', reward: { coins: 200, food: 40 } },
  { id: 'craft', name: 'Skilled Craftsperson', description: 'Process materials in the sawmill or windmill.', reward: { coins: 100, stone: 20 } },
  { id: 'lighthouse', name: 'The Light Returns', description: 'Deliver the materials and complete the lighthouse.', reward: { coins: 500, planks: 50 } }
];

const owns = (object, key) => object !== null && typeof object === 'object' && Object.hasOwn(object, key);
const integer = (value, fallback = 0, min = 0, max = 10000000) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
const amount = (value, fallback = 0, max = 10000000) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : fallback;
const countdown = (remaining, elapsed) => remaining - elapsed > 1e-9 ? remaining - elapsed : 0;
const good = message => ({ ok: true, message });
const bad = message => ({ ok: false, message });
export function createState() {
  const buildings = {};
  for (const id of Object.keys(BUILDINGS)) {
    const workers = WORKPLACE_IDS.includes(id) && !['market', 'dock'].includes(id) ? 1 : 0;
    buildings[id] = { level: id === 'lighthouse' ? 0 : 1, workers, ready: 0, workProgress: Array(workers).fill(0) };
  }
  const state = {
    version: 6,
    resources: Object.fromEntries(Object.keys(RESOURCES).map(id => [id, 100])),
    population: 12, capacity: 24, happiness: 0, baseHappiness: 0, chapelRemaining: 0, lighthouseRemaining: 0,
    blessingRemaining: 0, blessingsUsed: 0, loyalty: { lastDay: null, streak: 0 },
    populationProgress: 0, populationDirection: 0, taxProgress: 0, foodCredit: 0,
    returningWorkers: [], transportPriority: [...MATERIAL_IDS],
    pendingDeliveries: Object.fromEntries(MATERIAL_IDS.map(id => [id, 0])),
    buildings,
    objective: { wood: 20, stone: 12, repaired: false },
    speed: 1, paused: false, day: 18, minutes: 564,
    settings: { sound: false, motion: true },
    tasks: Object.fromEntries(TASKS.map(task => [task.id, false])),
    expeditions: {},
    statistics: { collected: 0, upgrades: 0, crafted: 0, expeditions: 0, traded: 0, taxCollected: 0 },
    decorations: { flowers: 0, lamp: 0, bench: 0 }, paths: 0,
    lastActionAt: 0
  };
  normalizeLogisticsState(state, state);
  return state;
}

export function totalWorkers(state) {
  return WORKPLACE_IDS.reduce((sum, id) => sum + (state.buildings[id].level > 0 && workplaceUnlocked(state, id) ? state.buildings[id].workers : 0), 0);
}

export function workerLimit(state, id) {
  return WORKPLACE_IDS.includes(id) && state.buildings[id].level > 0 && workplaceUnlocked(state, id) ? Math.floor(state.population / 2) : 0;
}

export function freeWorkers(state) {
  return Math.max(0, state.population - totalWorkers(state) - state.returningWorkers.length);
}

export function taxRate(state) {
  return totalWorkers(state) * (state.chapelRemaining > 0 ? 2 : 1);
}

export const foodDemandPerHour = state => state.population;
export const hasFoodForResidents = state => state.foodCredit > 1e-12 || state.resources.food > 0;
export const hungerPenaltyPerHour = state => hasFoodForResidents(state) ? 0 : 25;

function reserveResidentFood(state) {
  if (state.foodCredit > 1e-12) return;
  state.foodCredit = 0;
  if (state.resources.food >= 1) {
    // One whole warehouse unit is allocated to meals. Only its unused fraction
    // remains available to residents; buildings cannot spend that unit again.
    state.resources.food -= 1;
    state.foodCredit = 1;
  }
}

export function happinessGroups(state) {
  const bonus = (state.chapelRemaining > 0 ? state.buildings.chapel.level * 10 : 0) + (state.blessingRemaining > 0 ? 20 : 0) + (state.lighthouseRemaining > 0 ? 100 : 0);
  const groups = [{ count: state.population - totalWorkers(state), offset: bonus }];
  for (const id of WORKPLACE_IDS) if (workplaceUnlocked(state, id) && state.buildings[id].workers) groups.push({ count: state.buildings[id].workers, offset: bonus - storagePenalty(state, id), building: id });
  return groups.filter(group => group.count > 0).map(group => ({ ...group, happiness: Math.max(-100, Math.min(100, state.baseHappiness + group.offset)) }));
}

export function updateHappiness(state) {
  state.happiness = happinessGroups(state).reduce((sum, group) => sum + group.count * group.happiness, 0) / state.population;
}

export function recordVisit(state, now = Date.now()) {
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) return false;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(part => [part.type, part.value]));
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  if (state.loyalty.lastDay === day) return false;
  const previous = Date.parse(`${state.loyalty.lastDay}T12:00:00Z`);
  const consecutive = Number.isFinite(previous) && Date.parse(`${day}T12:00:00Z`) - previous === 86400000;
  state.loyalty = { lastDay: day, streak: consecutive ? Math.min(10, state.loyalty.streak + 1) : 1 };
  return true;
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
  if (!owns(BUILDINGS, id)) return bad('This building does not exist.');
  if (!workplaceUnlocked(state, id)) return bad(`This building unlocks at level ${id === 'market' ? 2 : 4}.`);
  const nextLevel = plannedLevel(state, id) + 1;
  if (nextLevel > BUILDINGS[id].maxLevel) return bad('Maximum level reached.');
  const limit = id === 'townhall' ? MAX_BUILDING_LEVEL : premiumActive(state) ? plannedLevel(state, 'townhall') : buildingLevelLimit(state, id);
  if (nextLevel > limit) return bad(`Upgrade the Town Hall to level ${nextLevel} first.`);
  const construction = constructionCounts(state);
  if (construction.active >= construction.limit && construction.queued >= construction.queueLimit) return bad(`Construction slots and the queue are full (${construction.limit} + ${construction.limit}). Wait for an upgrade to finish.`);
  return good('An upgrade is available.');
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
  for (const [id, building] of Object.entries(state.buildings)) {
    const nextWorkers = Math.min(integer(building.workers), workerLimit(state, id));
    syncCrewProgress(state, id, building.workers, nextWorkers);
    building.workers = nextWorkers;
  }
  let excess = totalWorkers(state) - state.population;
  while (excess > 0) {
    // Remove from the largest crew first, preserving a spread of working buildings.
    const id = [...WORKPLACE_IDS].reverse().reduce((selected, candidate) =>
      state.buildings[candidate].workers > state.buildings[selected].workers ? candidate : selected);
    if (!state.buildings[id].workers) break;
    syncCrewProgress(state, id, state.buildings[id].workers, state.buildings[id].workers - 1);
    state.buildings[id].workers -= 1;
    excess -= 1;
  }
  // Population loss also removes people who were already walking home. Keep
  // every remaining resident in exactly one of work, return or available pools.
  const availableReturnPlaces = Math.max(0, state.population - totalWorkers(state));
  if (state.returningWorkers.length > availableReturnPlaces) state.returningWorkers.length = availableReturnPlaces;
}

function accrueTaxes(state, activeSeconds) {
  const workers = taxRate(state);
  if (!workers || activeSeconds <= 0) return;
  const progress = state.taxProgress + workers * activeSeconds / 3600;
  if (!Number.isFinite(progress) || progress >= Number.MAX_SAFE_INTEGER) {
    state.resources.coins = 10000000;
    state.statistics.taxCollected = 10000000;
    state.taxProgress = 0;
    return;
  }
  const coins = Math.floor(progress + 1e-12);
  state.taxProgress = Math.max(0, progress - coins);
  state.resources.coins = Math.min(10000000, state.resources.coins + coins);
  state.statistics.taxCollected = Math.min(10000000, state.statistics.taxCollected + coins);
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
  // Between population/food changes the housing and hunger penalties are constant. Integrate each
  // linear happiness/rate segment exactly, rather than applying a whole hour at
  // its starting rate or looping once for every second in a long saved interval.
  while (remaining > 1e-9) {
    reserveResidentFood(state);
    updateStorageStatus(state);
    updateHappiness(state);
    const happiness = state.happiness;
    const baseSlope = state.baseHappiness > -100 ? -(unhousedResidents(state) + hungerPenaltyPerHour(state)) / 3600 : 0;
    const groups = happinessGroups(state);
    const activeWeight = groups.filter(group => state.baseHappiness + group.offset <= 100 && state.baseHappiness + group.offset > -100).reduce((sum, group) => sum + group.count, 0) / state.population;
    const happinessSlope = baseSlope * activeWeight;
    let clippingTime = baseSlope < 0 ? (-100 - state.baseHappiness) / baseSlope : Infinity;
    if (baseSlope < 0) for (const group of groups) {
      const raw = state.baseHappiness + group.offset;
      const target = raw > 100 ? 100 - group.offset : raw > -100 ? -100 - group.offset : null;
      if (target !== null) clippingTime = Math.min(clippingTime, (target - state.baseHappiness) / baseSlope);
    }
    let boundary = null;
    if (happinessSlope < 0) boundary = happiness > 50 ? 50 : happiness > 0 ? 0 : happiness > -50 ? -50 : -100;
    const boundaryTime = boundary === null ? Infinity : (boundary - happiness) / happinessSlope;
    const direction = Math.sign(happiness) || (happinessSlope < 0 ? -1 : 0);
    if (direction !== state.populationDirection || !direction || populationAtLimit(state, direction)) resetPopulationProgress(state, direction);
    const blocked = !direction || populationAtLimit(state, direction);
    const rate = Math.abs(populationRate(happiness)) / 3600;
    const rateDerivative = Math.abs(happiness) > 50 || (happiness === -50 && happinessSlope < 0) ? 1 / 60 : 1 / 300;
    const rateSlope = direction * happinessSlope * rateDerivative / 3600;
    const foodTime = state.foodCredit > 1e-12 ? state.foodCredit * 3600 / foodDemandPerHour(state) : Infinity;
    let duration = Math.min(remaining, boundaryTime, clippingTime, nextLogisticsEvent(state), foodTime, state.chapelRemaining > 0 ? state.chapelRemaining : Infinity, state.blessingRemaining > 0 ? state.blessingRemaining : Infinity, state.lighthouseRemaining > 0 ? state.lighthouseRemaining : Infinity);
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
    // Charge each interval for its actual crew before a population-loss event
    // releases workers. Production speed does not multiply real hours of work.
    accrueTaxes(state, duration);
    state.foodCredit = Math.max(0, state.foodCredit - foodDemandPerHour(state) * duration / 3600);
    state.chapelRemaining = countdown(state.chapelRemaining, duration);
    state.blessingRemaining = countdown(state.blessingRemaining, duration);
    const previousLighthouseLevel = state.buildings.lighthouse.level;
    advanceLogistics(state, duration);
    if (state.buildings.lighthouse.level === previousLighthouseLevel) state.lighthouseRemaining = countdown(state.lighthouseRemaining, duration);
    state.baseHappiness = Math.max(-100, Math.min(100, state.baseHappiness + baseSlope * duration));
    if (!blocked) state.populationProgress = Math.max(0, state.populationProgress + (rate + rateSlope * duration / 2) * duration);
    if (changesPopulation) {
      state.population += direction;
      state.populationProgress = 0;
      if (direction < 0) trimWorkers(state);
    }
    updateHappiness(state);
    syncPopulationProgress(state);
    remaining = Math.max(0, remaining - duration);
  }
}

export function normalizeState(raw) {
  const state = createState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return state;
  for (const key of Object.keys(RESOURCES)) state.resources[key] = integer(raw.resources?.[key], state.resources[key]);
  if (!owns(raw.resources, 'grain')) state.resources.grain = 0;
  if ([1, 2, 3].includes(raw.version)) {
    // Settle already-earned legacy coin batches once. Version 4 has no passive
    // coin production and persists these buildings with an empty ready balance.
    const earnedCoins = ['dock', 'market', 'townhall'].reduce((sum, id) => {
      const ready = raw.buildings?.[id]?.ready;
      return sum + (Number.isSafeInteger(ready) && ready > 0 ? Math.min(1000, ready) : 0);
    }, 0);
    state.resources.coins = Math.min(10000000, state.resources.coins + earnedCoins);
  }
  for (const id of Object.keys(BUILDINGS)) {
    const saved = raw.buildings?.[id];
    if (!saved || typeof saved !== 'object') continue;
    const level = integer(saved.level, state.buildings[id].level, id === 'townhall' ? 1 : 0, BUILDINGS[id].maxLevel);
    const workers = WORKPLACE_IDS.includes(id) && level > 0 ? integer(saved.workers, state.buildings[id].workers, 0, MAX_BUILDING_LEVEL * 24) : 0;
    state.buildings[id] = { level, workers, ready: BUILDINGS[id].resource && level > 0 ? integer(saved.ready, 0, 0, 10000000) : 0, workProgress: [] };
  }
  if (raw.version === 1 || raw.version === 2) {
    // Older versions allowed other buildings above the townhall. Preserve their
    // paid-for levels by promoting the legacy townhall once during migration.
    state.buildings.townhall.level = Math.max(state.buildings.townhall.level, ...Object.values(state.buildings).map(building => building.level));
  }
  for (const id of Object.keys(BUILDINGS)) {
    const building = state.buildings[id];
    building.level = Math.min(building.level, buildingLevelLimit(state, id));
    if (!building.level || !WORKPLACE_IDS.includes(id)) building.workers = 0;
    if (!building.level) building.ready = 0;
  }
  state.capacity = state.buildings.townhall.level * 24;
  state.population = integer(raw.population, state.population, 6, state.capacity);
  state.happiness = typeof raw.happiness === 'number' && Number.isFinite(raw.happiness) ? Math.max(-100, Math.min(100, raw.happiness)) : 0;
  state.baseHappiness = typeof raw.baseHappiness === 'number' && Number.isFinite(raw.baseHappiness) ? Math.max(-100, Math.min(100, raw.baseHappiness)) : state.happiness;
  state.foodCredit = amount(raw.foodCredit, 0, 1);
  state.chapelRemaining = amount(raw.chapelRemaining, 0, 36000);
  state.lighthouseRemaining = amount(raw.lighthouseRemaining, 0, 8640000);
  state.blessingRemaining = amount(raw.blessingRemaining, 0, 3600);
  state.blessingsUsed = integer(raw.blessingsUsed, 0, 0, MAX_BUILDING_LEVEL);
  state.loyalty = { lastDay: typeof raw.loyalty?.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.loyalty.lastDay) ? raw.loyalty.lastDay : null, streak: integer(raw.loyalty?.streak, 0, 0, 10) };
  const direction = Math.sign(populationRate(state.happiness));
  state.populationDirection = direction;
  if (direction && raw.populationDirection === direction &&
      !(direction > 0 && state.population >= state.capacity) && !(direction < 0 && state.population <= 6)) {
    state.populationProgress = amount(raw.populationProgress, 0, 0.999999999999);
  }
  let logisticsRaw = raw;
  if ((!raw.version || raw.version < 5) && state.buildings.farm.ready) {
    // Before grain was introduced, already-produced farm stock was food.
    // Preserve its material type rather than converting earned food to grain.
    logisticsRaw = { ...raw, pendingDeliveries: { ...raw.pendingDeliveries,
      food: integer(raw.pendingDeliveries?.food) + state.buildings.farm.ready } };
    state.buildings.farm.ready = 0;
  }
  normalizeLogisticsState(state, logisticsRaw);
  trimWorkers(state);
  if ([4, 5, 6].includes(raw.version)) state.taxProgress = amount(raw.taxProgress, 0, 0.999999999999);
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
  updateStorageStatus(state);
  updateHappiness(state);
  return state;
}

export function buildingCost(state, id) {
  if (!owns(BUILDINGS, id)) return null;
  const level = Math.max(1, plannedLevel(state, id));
  if (PRODUCTION_RECIPES[id]) {
    // Agreed accessible cost norm: one worker's daily output per current level.
    const cost = { wood: 72 * level, stone: 72 * level };
    const output = PRODUCTION_RECIPES[id].output;
    cost[output] = (cost[output] || 0) + 120 * level;
    return cost;
  }
  if (['townhall', 'house', 'market', 'warehouse', 'dock', 'lighthouse'].includes(id)) return Object.fromEntries(Object.keys(RESOURCES).map(resource => [resource, 500 * level]));
  const nextLevel = plannedLevel(state, id) + 1;
  return Object.fromEntries(Object.entries(BUILDINGS[id].cost).map(([resource, cost]) => [resource, cost * nextLevel]));
}

export function canAfford(state, cost) {
  return !!cost && Object.entries(cost).every(([resource, value]) => owns(RESOURCES, resource) && typeof value === 'number' && Number.isFinite(value) && value >= 0 && state.resources[resource] >= value);
}

function spend(state, cost) {
  for (const [resource, value] of Object.entries(cost)) state.resources[resource] -= value;
}

function reward(state, values) {
  if (values.coins) state.resources.coins = Math.min(10000000, state.resources.coins + values.coins);
  receiveMaterials(state, values);
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
}

export function act(state, action, now = Date.now()) {
  if (!action || typeof action !== 'object') return bad('Unknown action.');
  const id = action.building;
  if (['build', 'upgrade', 'collect', 'assign', 'craft'].includes(action.type) && !owns(BUILDINGS, id)) return bad('This building does not exist.');
  let result;
  switch (action.type) {
    case 'build':
    case 'upgrade': {
      const building = state.buildings[id], definition = BUILDINGS[id];
      if (action.type === 'build' && building.level > 0) return bad('This building already exists. Choose Upgrade.');
      if (action.type === 'upgrade' && building.level === 0) return bad('Build this building first.');
      const eligibility = upgradeEligibility(state, id);
      if (!eligibility.ok) return eligibility;
      const cost = buildingCost(state, id);
      const affordable = canAfford(state, cost);
      if (!affordable && !premiumActive(state)) return bad('Not enough resources for this upgrade.');
      if (affordable) spend(state, cost);
      const goodsTotal = MATERIAL_IDS.reduce((sum, resource) => sum + (cost[resource] || 0), 0);
      const targetLevel = plannedLevel(state, id) + 1;
      const project = { building: id, targetLevel, goodsTotal, goodsRemaining: goodsTotal, transportSeconds: 0, buildRemaining: 0, stage: affordable ? 'queued' : 'planned', order: ++state.constructionSequence, cost };
      state.constructionProjects.push(project);
      promoteConstructionQueue(state);
      const status = project.stage === 'planned' ? 'plan waiting for deliveries' : project.stage === 'queued' ? 'materials reserved in the queue' : 'materials reserved, waiting for transport';
      notify(state, 'construction-start', `${definition.name}: level ${targetLevel}`, status);
      result = good(`${definition.name}: ${status}.`);
      break;
    }
    case 'collect': {
      return bad('Warehouse workers carry goods. Assign workers to the warehouse and set transport priorities.');
    }
    case 'assign': {
      const building = state.buildings[id];
      if (!WORKPLACE_IDS.includes(id) || !building.level) return bad('This building does not employ workers.');
      if (!Number.isSafeInteger(action.delta) || action.delta === 0) return bad('Enter a nonzero whole number of workers.');
      const nextWorkers = building.workers + action.delta;
      if (!Number.isSafeInteger(nextWorkers) || nextWorkers < 0 || nextWorkers > workerLimit(state, id)) return bad('A building can employ at most half the current population.');
      if (action.delta > freeWorkers(state)) return bad('Not enough available residents.');
      syncCrewProgress(state, id, building.workers, nextWorkers);
      building.workers = nextWorkers;
      result = good(`Workers: ${building.workers}.${action.delta < 0 ? ' Dismissed workers take 5 minutes to return home.' : ''}`);
      break;
    }
    case 'blessing': {
      if (!state.buildings.chapel.level) return bad('Build the chapel first.');
      if (state.blessingRemaining > 0) return bad('A blessing is already active. Wait for it to end.');
      if (state.blessingsUsed >= state.buildings.chapel.level) return bad('All blessings available at this chapel level have been used.');
      state.blessingRemaining = 3600;
      state.blessingsUsed += 1;
      reward(state, Object.fromEntries(Object.keys(RESOURCES).map(id => [id, 50])));
      notify(state, 'blessing', 'Blessing', '+50 of every resource and +20 happiness for every resident for one hour.');
      result = good('Granted +50 of every resource and +20 happiness for one hour.');
      break;
    }
    case 'readNotifications': {
      for (const notification of state.notifications) notification.read = true;
      result = good('Notifications marked as read.');
      break;
    }
    case 'marketOrder': {
      if (!workplaceUnlocked(state, 'market')) return bad('The market unlocks at Town Hall level 2.');
      const { resource, amount: quantity } = action;
      if (!MATERIAL_IDS.includes(resource) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) return bad('Invalid material or quantity.');
      const ordered = state.market.orders.reduce((sum, order) => sum + order.amount, 0);
      const same = state.market.orders.filter(order => order.resource === resource).reduce((sum, order) => sum + order.amount, 0);
      if (state.resources[resource] - same < quantity) return bad('Not enough unreserved goods in the central warehouse.');
      if (marketUsed(state) + ordered + quantity > marketCapacity(state)) return bad('Not enough space in the market.');
      state.market.orders.push({ resource, amount: quantity });
      result = good('Market delivery ordered. Goods must wait one hour after arrival before they can be exchanged.');
      break;
    }
    case 'marketExchange': {
      if (!workplaceUnlocked(state, 'market')) return bad('The market unlocks at Town Hall level 2.');
      const { from, to, amount: quantity } = action;
      const groups = [['wood', 'stone', 'grain'], ['planks', 'food']];
      if (from === to || !groups.some(group => group.includes(from) && group.includes(to))) return bad('Choose different goods from the same category.');
      if (!Number.isSafeInteger(quantity) || quantity < 10 || quantity % 10 !== 0) return bad('Exchange in batches of 10: you receive 9 after the fee.');
      if (state.market.stock[from] - state.market.dispatch[from] < quantity) return bad('Not enough unlocked goods in the market.');
      const output = quantity * 9 / 10;
      state.market.stock[from] -= quantity;
      state.market.stock[to] += output;
      state.statistics.traded += 1;
      result = good(`Exchanged ${quantity} ${RESOURCES[from].short} for ${output} ${RESOURCES[to].short}. Market fee: 10%.`);
      break;
    }
    case 'marketDispatch': {
      const { resource, amount: quantity } = action;
      if (!workplaceUnlocked(state, 'market') || !MATERIAL_IDS.includes(resource) || !Number.isSafeInteger(quantity) || quantity < 1) return bad('Invalid collection order.');
      if (state.market.stock[resource] - state.market.dispatch[resource] < quantity) return bad('Not enough unlocked goods in the market.');
      state.market.dispatch[resource] += quantity;
      result = good('Goods are waiting for collection by warehouse workers.');
      break;
    }
    case 'craft': {
      return bad('Assigned workers process materials. Production requires time and inputs from the central warehouse.');
    }
    case 'transportPriority': {
      if (!MATERIAL_IDS.includes(action.resource) || ![-1, 1].includes(action.direction)) return bad('Invalid transport priority change.');
      const index = state.transportPriority.indexOf(action.resource), target = index + action.direction;
      if (target < 0 || target >= state.transportPriority.length) return bad('This material is already at the end of the priority list.');
      [state.transportPriority[index], state.transportPriority[target]] = [state.transportPriority[target], state.transportPriority[index]];
      result = good('Transport priority updated.');
      break;
    }
    case 'deliver': return bad('The full lighthouse cost must be in the warehouse. Start construction from its building panel.');
    case 'repair': {
      if (state.buildings.lighthouse.level || state.buildings.lighthouse.construction) return bad('The lighthouse is already built or under construction.');
      return act(state, { type: 'build', building: 'lighthouse' }, now);
    }
    case 'claim': {
      const task = TASKS.find(item => item.id === action.task);
      if (!task || !taskReady(state, task.id)) return bad('This task is incomplete or its reward has already been claimed.');
      state.tasks[task.id] = true; reward(state, task.reward);
      result = good(`Reward claimed: ${task.name}.`);
      break;
    }
    case 'trade': {
      const resource = action.resource, quantity = action.amount === undefined ? 10 : action.amount;
      if (!owns(RESOURCES, resource) || resource === 'coins' || typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) return bad('Invalid material or quantity.');
      if (!state.buildings.dock.level || !workplaceUnlocked(state, 'dock')) return bad('Harbor trading with coins unlocks at Town Hall level 4.');
      const buying = action.direction === 'buy';
      if (action.direction !== undefined && !['buy', 'sell'].includes(action.direction)) return bad('Unknown trade type.');
      const price = RESOURCES[resource].price * quantity * (buying ? 2 : 1);
      const cost = buying ? { coins: price } : { [resource]: quantity };
      if (!canAfford(state, cost)) return bad(buying ? 'Not enough coins for this purchase.' : 'You do not have enough goods to sell.');
      if (buying && stockRoom(state, resource) < quantity) return bad('Not enough space in the central warehouse for this purchase.');
      spend(state, cost); reward(state, buying ? { [resource]: quantity } : { coins: price });
      state.statistics.traded += 1;
      result = good(buying ? `Bought ${quantity} ${RESOURCES[resource].short} for ${price} coins.` : `Sold ${quantity} ${RESOURCES[resource].short} for ${price} coins.`);
      break;
    }
    case 'expeditionComplete': {
      const expedition = EXPEDITIONS.find(item => item.id === action.expedition);
      if (!expedition || !Number.isSafeInteger(action.moves) || action.moves < 1 || action.moves > 100000) return bad('Invalid expedition result.');
      const caches = action.caches === undefined ? 0 : action.caches;
      const availableCaches = expedition.map.reduce((sum, row) => sum + [...row].filter(tile => tile === 'C').length, 0);
      if (!Number.isSafeInteger(caches) || caches < 0 || caches > availableCaches) return bad('Invalid expedition chest count.');
      const old = state.expeditions[expedition.id];
      // A completed run has a single settlement reward; UI clears the run after this action.
      if (old?.completed) return bad('This expedition reward has already been claimed. Choose another island.');
      reward(state, expedition.reward);
      if (caches > 0) reward(state, { coins: caches * 10 });
      state.expeditions[expedition.id] = { completed: true, runs: 1, bestMoves: action.moves };
      state.statistics.expeditions += 1;
      result = good(`Expedition “${expedition.name}” complete! The reward has been sent to the warehouse.${caches > 0 ? ` Chest bonus: ${caches * 10} coins.` : ''}`);
      break;
    }
    case 'decorate': {
      const costs = { flowers: 25, lamp: 40, bench: 35 };
      if (!owns(costs, action.decoration)) return bad('This decoration does not exist.');
      if (state.decorations[action.decoration] >= 100) return bad('The limit for this decoration has been reached.');
      if (!canAfford(state, { coins: costs[action.decoration] })) return bad('Not enough coins for this decoration.');
      spend(state, { coins: costs[action.decoration] });
      state.decorations[action.decoration] += 1;
      state.baseHappiness = Math.min(100, state.baseHappiness + 1);
      result = good('Decoration added. The island looks even better!');
      break;
    }
    case 'path': {
      if (state.paths >= 100) return bad('All paths have already been upgraded.');
      const cost = { stone: 10, wood: 5 };
      if (!canAfford(state, cost)) return bad('A path requires 10 stone and 5 wood.');
      spend(state, cost);
      state.paths += 1;
      state.baseHappiness = Math.min(100, state.baseHappiness + 1);
      result = good('A new path now connects the settlement.');
      break;
    }
    case 'pause':
      state.paused = !state.paused;
      result = good(state.paused ? 'Simulation paused.' : 'Island activity resumed.');
      break;
    case 'speed':
      if (![1, 2, 4].includes(action.speed)) return bad('Available speeds: 1×, 2× or 4×.');
      state.speed = action.speed;
      result = good(`Island speed: ${state.speed}×.`);
      break;
    case 'setting':
      if (!['sound', 'motion'].includes(action.key) || typeof action.value !== 'boolean') return bad('Invalid setting.');
      state.settings[action.key] = action.value;
      result = good('Settings saved.');
      break;
    default:
      return bad('Unknown action.');
  }
  updateStorageStatus(state);
  updateHappiness(state);
  syncPopulationProgress(state);
  state.lastActionAt = integer(now, state.lastActionAt, 0, Number.MAX_SAFE_INTEGER);
  return result;
}
