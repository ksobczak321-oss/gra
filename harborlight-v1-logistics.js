// Physical goods and event-based logistics. Durations are real elapsed seconds,
// including catch-up after the browser is closed.
import { productionMultiplier, beginLighthouseBonus } from './harborlight-v1-residents.js?v=frontend-v32-2';
import { roadSpeedMultiplier, roadCapacityMultiplier } from './harborlight-v1-leisure.js?v=frontend-v32-2';
import { centralReserved, centralAvailable, ordinaryStock, bonusStock, ordinaryWarehouseUsed, normalizeBonusMaterials, grantBonusMaterials, consumeMaterial, spendMaterials, centralUnreserved, materialReward } from './harborlight-v1-inventory.js?v=frontend-v32-2';
import { activePlayMultiplier } from './harborlight-v1-progression.js?v=frontend-v32-2';
import { eventTransportMultiplier, eventProductionMultiplier } from './harborlight-v1-events.js?v=frontend-v32-2';
import { residentWorkMultiplier, foodDemandPerHour } from './harborlight-v1-housing.js?v=frontend-v32-2';
import { theatrePorterCanStart } from './harborlight-v1-theatre.js?v=frontend-v32-2';
import { MATERIAL_IDS as DEVELOPMENT_MATERIAL_IDS, GOODS, foodReservePlan, normalizeProvisions, quoteGoods, availableRecipes, productionAssignments } from './harborlight-v1-provisions.js?v=frontend-v32-2';
import { normalizeDevelopmentLogistics, developmentProducerIds, developmentProductionBlocked, developmentProductionJobs, progressDevelopmentJob, completeDevelopmentJob, developmentWarehouseSources, takeLocalGoods, putLocalGoods, directRouteWorkers, directRouteSource, developmentLogisticsAction, milkCargoFromCentral, milkCargoToCentral } from './harborlight-v1-development-logistics.js?v=frontend-v32-2';
import { constructionTiming, normalizeConstructionTiming, warehouseCapacityForLevel, productionPerWorkerHour } from './harborlight-v1-economy.js?v=frontend-v32-2';
export { centralReserved, centralAvailable, ordinaryStock, bonusStock, ordinaryWarehouseUsed, grantBonusMaterials, consumeMaterial, spendMaterials, centralUnreserved, quoteMaterialSpend } from './harborlight-v1-inventory.js?v=frontend-v32-2';
export const workerEfficiency = productionMultiplier;
// Paths improve cargo courses, independently of production and resident walks.
export const transportEfficiency = (state, efficiency = workerEfficiency(state)) => efficiency * roadSpeedMultiplier(state) * activePlayMultiplier(state) * eventTransportMultiplier(state);
export const MATERIAL_IDS = ['wood', 'stone', 'grain', 'food', 'planks'];
export const materialIds = state => state?.ruleset === 32 ? DEVELOPMENT_MATERIAL_IDS : MATERIAL_IDS;
const warehousePriorityIds = state => [...materialIds(state), 'construction'];
export const WAREHOUSE_PRIORITY_IDS = [...MATERIAL_IDS, 'construction'];
export const PRODUCTION_RECIPES = {
  farm: { output: 'grain' }, lumber: { output: 'wood' }, quarry: { output: 'stone' },
  sawmill: { output: 'planks', input: 'wood', amount: 2 },
  windmill: { output: 'food', input: 'grain', amount: 2 }
};
const EPS = 1e-7;
const clamp = (n, min = 0, max = 10000000) => Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
const whole = n => Math.floor(clamp(n));
const stock = (state = null) => Object.fromEntries(materialIds(state).map(id => [id, 0]));
const good = (message, extra = {}) => ({ ok: true, message, ...extra });
const bad = message => ({ ok: false, message });
const quantity = n => Number.isSafeInteger(n) && n > 0;
const buildingNames = { farm: 'Farm', lumber: 'Lumber Camp', quarry: 'Quarry', windmill: 'Windmill', sawmill: 'Sawmill', warehouse: 'Warehouse', market: 'Market', dock: 'Harbor', house: 'House', townhall: 'Town Hall', chapel: 'Chapel', lighthouse: 'Lighthouse', bakery:'Piekarnia', dairy:'Mleczarnia', slaughterhouse:'Rzeźnia', fisher:'Rybak', leatherworks:'Zakład skórzany', academy:'Akademia', barracks:'Koszary', theater:'Teatr' };
const materialNames = { wood: 'wood', stone: 'stone', grain: 'grain', food: 'food', planks: 'planks' };
// Local storage belongs to the producing building, independently of Town Hall.
export const producerCapacity = (state, id = 'farm', level = state.buildings[id]?.level || 0) => 200 * Math.max(0, level);
export const PRODUCTION_RATE_VERSION = 3;
// V29 raises the material rate conservatively; staffing, meals and taxes retain
// their own rules. Old partially completed units preserve their fraction.
export const productionRate = (state, id) => productionPerWorkerHour(state.buildings[id]?.level);
export const WAREHOUSE_CAP_LEVEL = 24;
export const effectiveWarehouseLevel = state => Math.min(WAREHOUSE_CAP_LEVEL, state.buildings.warehouse.level || 0);
export const foodReserve = state => state.ruleset === 32 ? foodReservePlan(state).requiredSatiety / 6 : 50 * effectiveWarehouseLevel(state);
export const availableGoods = (state, id) => state.ruleset === 32 ? id === 'food' ? Math.floor(materialIds(state).reduce((sum,resource)=>sum+Math.floor(centralAvailable(state,resource)+EPS)*(GOODS[resource]?.satiety||0),0)/6+EPS) : Math.floor(centralAvailable(state,id)+EPS) : Math.max(0, Math.floor(centralAvailable(state, id) - (id === 'food' ? foodReserve(state) : 0)));
export const forecastAvailableGoods = availableGoods;
const physicalAvailableGoods = (state,id) => state.ruleset === 32 ? Math.floor(centralAvailable(state,id)+EPS) : availableGoods(state,id);
export const haulCapacity = (state, id = 'warehouse') => Math.max(1, Math.floor(Math.floor(120 * 1.1 ** Math.max(0, (id === 'warehouse' ? effectiveWarehouseLevel(state) : state.buildings[id]?.level || 1) - 1)) * roadCapacityMultiplier(state)));
export const workplaceUnlocked = (state, id) => state.buildings.townhall.level >= (id === 'market' ? 2 : id === 'dock' ? 4 : 1);
export function activeWorkerIndices(state, id) {
  const people = Array.isArray(state.residents) ? state.residents.filter(person => person.workplace === id) : [];
  if (!people.length && !Array.isArray(state.residents)) return Array.from({ length: state.buildings[id]?.workers || 0 }, (_, index) => index);
  return people.flatMap((person, index) => person.pendingRelease || (person.arrivalRemaining || 0) > EPS || person.visitGroup || person.visiting || (person.returnRemaining || 0) > EPS ? [] : [index]);
}
const residentAtWorkIndex = (state, id, index) => (state.residents || []).filter(person => person.workplace === id)[index];
const residentLookups = new WeakMap();
function residentById(state, id) {
  if (id == null) return null;
  const people = state.residents || [];
  let cached = residentLookups.get(state);
  if (cached?.people !== people || cached.length !== people.length) {
    cached = { people, length: people.length, byId: new Map(people.map(person => [person.id, person])) };
    residentLookups.set(state, cached);
  }
  return cached.byId.get(id) || null;
}
const workerMultiplier = (state, id, index) => {
  const person = residentAtWorkIndex(state, id, index);
  return person ? residentWorkMultiplier(state, person) : 1;
};
export function effectiveWorkerCount(state, id) {
  const people = (state.residents || []).filter(person => person.workplace === id);
  return activeWorkerIndices(state, id).reduce((sum, index) => sum + (people[index] ? residentWorkMultiplier(state, people[index]) : 1), 0);
}
const ledgerStock = (values,state) => Object.fromEntries(materialIds(state).map(id => [id, Math.floor(clamp(values?.[id], 0, Number.MAX_SAFE_INTEGER))]));
function normalizeEconomyLedger(state, raw = state) {
  const source = raw.economyLedger?.version === 1 ? raw.economyLedger : {};
  state.economyLedger = { version: 1, produced: ledgerStock(source.produced,state), delivered: ledgerStock(source.delivered,state) };
}
function recordEconomyOutput(state, kind, resource, amount) {
  if (!materialIds(state).includes(resource) || !(amount > 0)) return;
  if (state.economyLedger?.version !== 1) normalizeEconomyLedger(state);
  state.economyLedger[kind][resource] = Math.min(Number.MAX_SAFE_INTEGER, (state.economyLedger[kind][resource] || 0) + Math.floor(amount));
}
export function warehouseLimits(state) {
  const base=warehouseCapacityForLevel(state.buildings.warehouse.level,{ruleset:state.ruleset}),factor=state.ruleset === 32 ? 1+.05*Math.max(0,state.education?.researchLevels?.warehouse||0) : 1;
  return {perResource:Math.floor(base.perResource*factor),total:Math.floor(base.total*factor)};
}
export const warehouseUsed = state => materialIds(state).reduce((sum, id) => sum + (state.resources[id] || 0), 0);
export function inventoryOverfull(state) {
  const limits = warehouseLimits(state);
  return ordinaryWarehouseUsed(state) > limits.total || materialIds(state).some(id => ordinaryStock(state,id) > limits.perResource);
}
export function stockRoom(state, id) {
  if (!materialIds(state).includes(id)) return 0;
  const limits = warehouseLimits(state);
  const foodSpace = state.ruleset === 32 || id === 'food' ? 0 : Math.max(0, foodReserve(state) - ordinaryStock(state,'food'));
  return Math.max(0, Math.floor(Math.min(limits.perResource - ordinaryStock(state, id), limits.total - ordinaryWarehouseUsed(state) - foodSpace)));
}
export const marketCapacity = state => Math.floor(Math.min(10000000, 1000 * 1.5 ** Math.max(0, state.buildings.market.level - 1)));
export const marketUsed = state => materialIds(state).reduce((sum, id) => sum + (state.market?.stock[id] || 0), 0) + (state.market?.locked || []).reduce((sum, lot) => sum + lot.amount, 0);
export function dockCapacity(state) {
  const factor = 1.5 ** Math.max(0, state.buildings.dock.level - 1);
  return { perResource: Math.floor(Math.min(10000000, 1000 * factor)), total: Math.floor(Math.min(40000000, 4000 * factor)) };
}
export const dockUsed = state => materialIds(state).reduce((sum, id) => sum + (state.dock?.stock[id] || 0), 0);
export const premiumActive = (state, now = state.worldTimeMs ?? Date.now()) => (state.premium?.expiresAt || 0) > now;
export function constructionCounts(state) {
  const projects = state.constructionProjects || [], premium = premiumActive(state);
  return { active: projects.filter(p => ['transport', 'building'].includes(p.stage)).length, queued: projects.filter(p => ['queued', 'planned'].includes(p.stage)).length, limit: state.buildings.townhall.level + (premium ? 4 : 0), queueLimit: premium ? Infinity : state.buildings.townhall.level, premium };
}
export function syncConstructionPointers(state) {
  for (const building of Object.values(state.buildings)) delete building.construction;
  for (const project of state.constructionProjects) if (!state.buildings[project.building].construction) state.buildings[project.building].construction = project;
}
export const nextConstruction = state => state.constructionProjects.find(project => project.stage === 'transport') || null;
export const plannedLevel = (state, id) => Math.max(state.buildings[id].level, ...(state.constructionProjects || []).filter(project => project.building === id).map(project => project.targetLevel));
export const PLAYER_TRADE_UNLOCK_LEVEL = 6;
export const playerTradeUnlocked = state => Number(state.buildings?.townhall?.level || 0) >= PLAYER_TRADE_UNLOCK_LEVEL;

// The prerequisite belongs to the level being ordered, including a future
// queued level. Otherwise a premium queue at level two could bypass level
// four's population requirement before that level is actually reached.
export function townhallPopulationRequirement(state, targetLevel = plannedLevel(state, 'townhall') + 1) {
  const target = Math.max(1, Math.floor(Number(targetLevel) || 1));
  const previous = Math.max(1, target - 1);
  const populationCapacity = previous * (state.ruleset === 32 ? 36 : 24);
  const populationRequired = target >= 4 ? Math.ceil(populationCapacity * .75) : 0;
  const populationCurrent = Math.max(0, Math.floor(Number(state.population) || 0));
  return { ok: populationCurrent >= populationRequired, populationRequired, populationCurrent,
    populationCapacity, populationLevel: previous, targetLevel: target };
}
export const constructionBuildFactor = project => project.building === 'lighthouse' ? 4 : project.building === 'chapel' ? 3 * Math.max(1, project.targetLevel - 1) : 1;
// The introductory crew is an earned, persisted milestone. Never infer it
// from an old save's staffing: already ordered buildings retain their clocks.
export const starterTurboAvailable = state => state.starterTurbo?.version === 1 && state.starterTurbo.unlocked === true && state.islandRole !== 'daughter' && (!state.islandId || state.islandId === 'island-1') && state.buildings.townhall.level <= 2;
export function unlockStarterTurbo(state) {
  if (starterTurboAvailable(state) || state.starterTurbo?.unlocked || state.islandRole === 'daughter' || state.islandId && state.islandId !== 'island-1' || state.buildings.townhall.level > 2) return false;
  const carriers = (state.residents || []).filter(person => person.workplace === 'warehouse' && !person.pendingRelease);
  if (carriers.length < ([6,7].includes(state.tutorial?.curriculum) ? 3 : 6)) return false;
  state.starterTurbo = { version: 1, unlocked: true, unlockedAt: state.worldTimeMs || 0 };
  return true;
}
export function starterConstructionTiming(state, project) {
  // The former introductory clocks are only historical project snapshots.
  // New projects use ordinary transport/building and the real coin services;
  // the persisted starter milestone still grants its separate material price.
  return null;
}
export function attachConstructionTiming(state, project) {
  if (!project || project.starterTurbo || project.premiumService || project.instantTransport) return project;
  project.economyTiming = constructionTiming(state, project, { capacity: haulCapacity(state) });
  if (project.economyTiming) project.economyVersion = 1;
  return project;
}

export function missionProductionMultiplier(state, building) {
  return (state.missionProductionBonuses || []).some(effect => effect.building === building && effect.multiplier === 2 && Number.isFinite(effect.until) && effect.until > (state.worldTimeMs || 0)) ? 2 : 1;
}
const constructionBuildingSeconds = (project, transport = project.transportSeconds || 0) => project.starterTurbo?.buildingDuration ?? project.economyTiming?.buildingDuration ?? Math.max(0, transport) * constructionBuildFactor(project);
const constructionEfficiency = state => state.ruleset === 32 ? 1+.05*Math.max(0,state.education?.researchLevels?.construction||0) : 1;
function tripWorkerMultiplier(state, trip) {
  const person = residentById(state, trip.residentId);
  if (person) return residentWorkMultiplier(state, person);
  // A departing resident cannot make loaded cargo disappear or change its
  // speed to that of a different worker who later occupies the crew slot.
  if (trip.residentId != null || trip.worker < 0) return state.ruleset === 32 && Number.isFinite(trip.workMultiplier) ? Math.max(.01,trip.workMultiplier) : trip.workMultiplier === .5 ? .5 : 1;
  const workplace = ['warehouse', 'market', 'dock'].find(id => state.haulTrips?.[id]?.includes(trip));
  return workplace ? workerMultiplier(state, workplace, trip.worker) : 1;
}
// Only already-recorded starter turbo promises an unconditional old clock.
// New construction budgets are reference times: the carrier still needs a
// meal and a bed, and benefits from the island's ordinary transport bonuses.
const tripEfficiency = (state, trip, efficiency = workerEfficiency(state)) => trip.starterTurboClock === true ? 1 : transportEfficiency(state, efficiency) * tripWorkerMultiplier(state, trip);
function projectGoods(project) {
  const materials = [...new Set([...MATERIAL_IDS,...Object.keys(project.cost||{}).filter(id=>GOODS[id])])];
  if (!project.remainingMaterials) {
    project.remainingMaterials = Object.fromEntries(materials.map(id => [id, whole(project.cost?.[id])]));
    // Legacy projects recorded only an aggregate remaining quantity. Preserve
    // that quantity deterministically without recreating already delivered goods.
    let trim = Math.max(0, materials.reduce((n,id) => n + project.remainingMaterials[id], 0) - (project.goodsRemaining ?? project.goodsTotal ?? 0));
    for (const id of materials) { const used = Math.min(trim, project.remainingMaterials[id]); project.remainingMaterials[id] -= used; trim -= used; }
  }
  if (!project.delivered) project.delivered = Object.fromEntries(materials.map(id => [id, Math.max(0, whole(project.cost?.[id]) - project.remainingMaterials[id])]));
  return project.remainingMaterials;
}
export function constructionEstimate(state, projectOrCost, buildingId) {
  const project = projectOrCost?.cost ? projectOrCost : { cost: projectOrCost || {}, building: buildingId || 'house', targetLevel: (state.buildings[buildingId || 'house']?.level || 0) + 1 };
  const turbo = project.starterTurbo || (!project.order ? starterConstructionTiming(state, project) : null);
  const timing = project.economyTiming || (!project.order ? constructionTiming(state, project, {capacity:haulCapacity(state)}) : null);
  const clock = turbo || timing;
  if (clock) {
    const requiredWorkers = turbo ? 6 : clock.requiredWorkers;
    // A hypothetical cost has no persisted timing yet. Pass the same computed
    // clock used by this quote so ready carriers are not mistaken for no crew.
    const allocation = warehouseConstructionCrew(state, { ...project, starterTurbo: turbo, economyTiming: timing });
    const crew = allocation.builders;
    const required = project.stage === 'building' ? stock(state) : project.remainingMaterials || project.cost;
    const queuedTrips = materialIds(state).reduce((sum, id) => sum + Math.ceil((required?.[id] || 0) / clock.capacity), 0);
    const inFlight = (state.haulTrips?.warehouse || []).filter(trip => trip.kind === 'construction' && trip.projectOrder === project.order);
    const trips = queuedTrips + inFlight.length;
    // An old six-person introductory clock is a reference, not a staffing gate.
    const minimumCrew = 1;
    const waitingForCarriers = project.stage !== 'building' && queuedTrips > 0 && crew.length < minimumCrew;
    const available = crew.map(index => { const trip = (state.haulTrips?.warehouse || []).find(item => item.worker === index); return trip ? trip.remaining / tripEfficiency(state, trip) : 0; });
    let transport = inFlight.reduce((end, trip) => Math.max(end, trip.remaining / tripEfficiency(state, trip)), 0);
    let sharedPosition = state.warehousePriorityCycle?.position || 0;
    let waitingFood = state.buildings.windmill?.ready || 0;
    for (let index = 0; index < queuedTrips && !waitingForCarriers; index++) {
      const first = available.indexOf(Math.min(...available));
      const speed = turbo ? 1 : transportEfficiency(state) * workerMultiplier(state, 'warehouse', crew[first]);
      if (allocation.sharedCarrier && sharedPosition % 2 === 0 && (waitingFood > 0 || allocation.foodProductionExpected)) {
        // A lone carrier alternates collection and building. Future output is
        // a conservative delivery bound, never an invented material reward.
        available[first] += 300 / (transportEfficiency(state) * workerMultiplier(state, 'warehouse', crew[first]));
        waitingFood = Math.max(0, waitingFood - haulCapacity(state));
        sharedPosition++;
      }
      available[first] += clock.courseSeconds / speed;
      sharedPosition++;
      transport = Math.max(transport, available[first]);
    }
    if (waitingForCarriers) transport = Infinity;
    const building = (project.stage === 'building' ? project.buildRemaining : clock.buildingDuration)/constructionEfficiency(state);
    return { transport, building, total: transport + building, trips, waves: Math.ceil(trips / (crew.length || requiredWorkers)), capacity: clock.capacity, workers: crew.length, readyWorkers: allocation.ready.length, utilityWorkers: allocation.utility.length, referenceWorkers: requiredWorkers, starterTurbo: !!turbo, economyTiming: !!timing, waitingForCarriers, requiredWorkers, fixedTransport: clock.transportDuration, fixedBuilding: clock.buildingDuration,
      ...(allocation.sharedCarrier ? { estimateConservative: true, sharedCarrier: true } : {}),
      ...(waitingForCarriers ? {reason:`Waiting for ${minimumCrew} warehouse carriers to reach work. Walking and earlier deliveries are outside the construction budget.`} : {}) };
  }
  const capacity = haulCapacity(state), crew = activeWorkerIndices(state, 'warehouse').length;
  const required = project.stage === 'building' ? stock(state) : project.remainingMaterials || project.cost;
  const queuedTrips = materialIds(state).reduce((n,id) => n + Math.ceil((required?.[id] || 0) / capacity), 0);
  const inFlight = (state.haulTrips?.warehouse || []).filter(t => t.kind === 'construction' && t.projectOrder === project.order);
  const trips = queuedTrips + inFlight.length;
  const waves = crew ? Math.ceil(trips / crew) : trips ? Infinity : 0;
  const efficiency = transportEfficiency(state);
  const indices = activeWorkerIndices(state, 'warehouse');
  const durations = indices.map(index => 300 / (efficiency * workerMultiplier(state, 'warehouse', index)));
  const available = indices.map(index => { const trip = (state.haulTrips?.warehouse || []).find(t => t.worker === index); return trip ? trip.remaining / tripEfficiency(state, trip) : 0; });
  let transport = inFlight.reduce((end,t) => Math.max(end,t.remaining / tripEfficiency(state, t)),0);
  for (let index=0; index<queuedTrips; index++) {
    if (!available.length) { transport=Infinity; break; }
    const finishes = available.map((at, worker) => at + durations[worker]);
    const first=finishes.indexOf(Math.min(...finishes));
    available[first]=finishes[first];
    transport=Math.max(transport,available[first]);
  }
  const building = (project.stage === 'building' ? project.buildRemaining : ((project.transportSeconds || 0) + transport) * constructionBuildFactor(project))/constructionEfficiency(state);
  return { transport, building, total: transport + building, trips, waves, capacity, workers: crew };
}
export const constructionEstimateSeconds = (state, projectOrCost, buildingId) => constructionEstimate(state, projectOrCost, buildingId).total;
// Scheduling preview only: never reserve goods, advance a carrier or consume
// randomness in the real island. Current cargo, ready goods and priorities all
// compete for the same carriers in this snapshot, just as in the live island.
export function constructionScheduleEstimate(state, projectOrCost, buildingId) {
  const spec = projectOrCost?.cost ? projectOrCost : null;
  const id = spec?.building || buildingId || 'house';
  if (!state.buildings[id]) return { transport: Infinity, building: Infinity, total: Infinity, scheduled: true, reason: 'Choose an existing building.' };
  const baseline = constructionEstimate(state, projectOrCost, buildingId);
  const unavailable = reason => ({ ...baseline, transport: Infinity, building: Infinity, total: Infinity, scheduled: true, reason });
  const existing = spec && (state.constructionProjects || []).find(project => project === spec || spec.order && project.order === spec.order);
  if (existing?.stage === 'building') {const remaining=existing.buildRemaining/constructionEfficiency(state);return { ...baseline, transport: 0, building: remaining, total: remaining, queueWait: 0, completionTotal: remaining, scheduled: true, reason: '' };}
  const snapshot = structuredClone(state);
  const efficiency = workerEfficiency(state);
  let target = existing ? snapshot.constructionProjects.find(project => project.order === existing.order) : null;
  if (!target) {
    const cost = Object.fromEntries([...materialIds(state), 'coins'].filter(resource => whole((spec?.cost || projectOrCost)?.[resource])).map(resource => [resource, whole((spec?.cost || projectOrCost)[resource])]));
    const targetLevel = spec?.targetLevel || plannedLevel(snapshot, id) + 1;
    const possibleTownLevel = Math.max(snapshot.buildings.townhall.level, ...snapshot.constructionProjects.filter(project => project.building === 'townhall').map(project => project.targetLevel));
    if (id !== 'townhall' && targetLevel > possibleTownLevel) return unavailable('Upgrade the Town Hall first.');
    // Gathering is outside this preview. Supply missing hypothetical materials
    // only in the clone and reserve them physically until carrier pickup.
    for (const resource of materialIds(state)) snapshot.resources[resource] = Math.max(snapshot.resources[resource] || 0, centralReserved(snapshot, resource) + (cost[resource] || 0) + (resource === 'food' ? foodReserve(snapshot) : 0));
    const goodsTotal = materialIds(state).reduce((sum, resource) => sum + (cost[resource] || 0), 0);
    target = { building: id, targetLevel, cost, goodsTotal, goodsRemaining: goodsTotal,
      remainingMaterials: Object.fromEntries(materialIds(state).map(resource => [resource, cost[resource] || 0])), delivered: stock(state),
      stage: 'queued', order: ++snapshot.constructionSequence, transportSeconds: 0, buildRemaining: 0,
      reservationVersion:9,reservedMaterials:Object.fromEntries(materialIds(state).map(resource=>[resource,cost[resource]||0])),reservedCoins:cost.coins||0 };
    attachConstructionTiming(snapshot, target);
    snapshot.constructionProjects.push(target);
  }
  const targetOrder = target.order;
  promoteConstructionQueue(snapshot);
  if (target.stage === 'planned') return unavailable('Waiting for the planned materials of the accepted construction order.');
  let elapsed = 0, activeAt = null;
  for (let events = 0; events < 2048; events++) {
    promoteConstructionQueue(snapshot);
    target = snapshot.constructionProjects.find(project => project.order === targetOrder);
    if (!target) {
      const queueWait = activeAt ?? 0;
      return { ...baseline, transport: Math.max(0, elapsed - queueWait), building: 0, total: elapsed - queueWait, queueWait, completionTotal: elapsed, scheduled: true, reason: '' };
    }
    if (['transport', 'building'].includes(target.stage) && activeAt === null) activeAt = elapsed;
    if (target.stage === 'transport' && target.economyTiming) {
      // Reference carriers guarantee progress and a utility carrier can collect
      // food. Simulate a finite waiting batch first; a staffed Mill keeps its
      // utility assignment and permits the same direct construction bound.
      const remaining = projectGoods(target);
      const first = [...snapshot.constructionProjects].filter(project => project.stage === 'transport' && materialIds(state).some(id => projectGoods(project)[id] > 0)).sort((a,b)=>a.order-b.order)[0];
      const funded = materialIds(state).every(id => remaining[id] <= (target.reservedMaterials?.[id] || 0) && remaining[id] <= (snapshot.resources[id] || 0));
      const allocation = warehouseConstructionCrew(snapshot, target);
      const stableCrew = !allocation.foodUtility || allocation.foodProductionExpected;
      if (stableCrew && (!first || first.order === target.order || materialIds(state).every(id => remaining[id] === 0)) && funded) {
        const direct = constructionEstimate(snapshot,target);
        if (Number.isFinite(direct.total)) {
          const queueWait = activeAt ?? 0, transport = Math.max(0,elapsed - queueWait) + direct.transport;
          return { ...direct, transport, total:transport+direct.building, queueWait,
            completionTotal:elapsed+direct.total, scheduled:true, reason:'' };
        }
      }
    }
    if (target.stage === 'building') {
      // Building is a fixed real-time clock. Once the last cargo has arrived,
      // unrelated future production cannot affect this completion time. Stop
      // here instead of simulating hours of unrelated factory/port events.
      const queueWait = activeAt ?? 0;
      const transport = Math.max(0, elapsed - queueWait);
      const building=target.buildRemaining/constructionEfficiency(snapshot);
      return { ...baseline, transport, building,
        total: transport + building, queueWait,
        completionTotal: elapsed + building, scheduled: true, reason: '' };
    }
    const arrivals = (snapshot.residents || []).filter(person => person.workplace && person.arrivalRemaining > EPS).map(person => person.arrivalRemaining);
    const nextArrival = arrivals.length ? Math.min(...arrivals) : Infinity;
    const next = nextLogisticsEvent(snapshot, efficiency);
    const duration = Math.min(next, nextArrival);
    if (!Number.isFinite(duration)) return unavailable(target.stage === 'planned' ? 'Waiting for the planned materials of the accepted construction order.' : 'Waiting for available warehouse carriers or an earlier upgrade.');
    if (!(duration > 0) || elapsed + duration > 90 * 86400) return unavailable('The delivery schedule is too long to estimate from the current snapshot.');
    advanceLogistics(snapshot, duration, efficiency);
    for (const person of snapshot.residents || []) person.arrivalRemaining = Math.max(0, (person.arrivalRemaining || 0) - duration);
    snapshot.worldTimeMs = (snapshot.worldTimeMs || 0) + duration * 1000;
    elapsed += duration;
  }
  return unavailable('The delivery schedule is too long to estimate from the current snapshot.');
}
export function reserveConstructionMaterials(state, project, { partial = true } = {}) {
  if (!project || project.stage === 'building' || project.instantTransport) return false;
  const remaining = projectGoods(project);
  project.reservedMaterials ||= stock(state);
  project.reservedCoins = Math.max(0, project.reservedCoins || 0);
  project.reservationVersion = 9;
  if (!partial && (materialIds(state).some(id => Math.max(0, remaining[id] - (project.reservedMaterials[id] || 0)) > physicalAvailableGoods(state, id)) || Math.max(0, (project.cost.coins || 0) - project.reservedCoins) > (state.resources.coins || 0))) return false;
  for (const id of materialIds(state)) {
    const required = Math.max(0, remaining[id] - (project.reservedMaterials[id] || 0));
    project.reservedMaterials[id] = (project.reservedMaterials[id] || 0) + Math.min(required, physicalAvailableGoods(state, id));
  }
  const coinNeed = Math.max(0, (project.cost.coins || 0) - project.reservedCoins);
  const coins = Math.min(coinNeed, state.resources.coins || 0);
  state.resources.coins -= coins; project.reservedCoins += coins;
  return materialIds(state).every(id => (project.reservedMaterials[id] || 0) >= remaining[id]) && project.reservedCoins >= (project.cost.coins || 0);
}
export function promoteConstructionQueue(state) {
  flushPendingDeliveries(state);
  const counts = constructionCounts(state);
  let slots = counts.limit - counts.active;
  for (const project of [...state.constructionProjects].sort((a, b) => a.order - b.order)) {
    projectGoods(project);
    const funded = reserveConstructionMaterials(state, project);
    // The package authorizes accepting a plan. Its later expiry must not
    // revoke a paid order or strand already reserved materials and coins.
    if (project.stage === 'planned' && (counts.premium || project.forecast === true) && funded) {
      project.stage = 'queued';
      notify(state,'construction-reserved',`${buildingNames[project.building]}: materials reserved`,'The forecast supplies have reached the warehouse. The full cost is now reserved.');
    }
    if (project.stage !== 'queued' || slots <= 0 || !funded && !project.instantTransport) continue;
    if (project.targetLevel !== state.buildings[project.building].level + 1 || (project.building !== 'townhall' && project.targetLevel > state.buildings.townhall.level)) continue;
    if (state.constructionProjects.some(other => other !== project && other.building === project.building && ['transport','building'].includes(other.stage))) continue;
    project.stage=(project.instantTransport || project.economyTiming) && project.goodsRemaining===0?'building':'transport';
    if (project.stage === 'building' && project.economyTiming && !project.instantTransport) project.buildRemaining = constructionBuildingSeconds(project);
    slots--;
    notify(state,'construction-promoted',`${buildingNames[project.building]}: upgrade started`,'Reserved materials are waiting for transport.');
  }
  syncConstructionPointers(state);
}
export function cancelConstruction(state, order) {
  const project = state.constructionProjects.find(item => item.order === Number(order));
  if (!project) return bad('Choose an existing construction project.');
  const pickedUp = project.transportStarted || project.transportSeconds > EPS || (state.haulTrips?.warehouse || []).some(trip => trip.projectOrder === project.order) || materialIds(state).some(id => (project.delivered?.[id] || 0) > 0);
  if (project.stage === 'building' || pickedUp) return bad('A project cannot be cancelled after the first material pickup or the start of building.');
  if (state.constructionProjects.some(other => other.building === project.building && other.targetLevel > project.targetLevel)) return bad('Cancel later upgrades of this building first.');
  const refunded = { ...(project.reservedMaterials || {}), coins: project.reservedCoins || 0 };
  state.resources.coins += refunded.coins;
  state.constructionProjects = state.constructionProjects.filter(item => item !== project);
  promoteConstructionQueue(state);
  notify(state, 'construction-cancelled', `${buildingNames[project.building]}: upgrade cancelled`, 'Reserved materials are available again and the building coin cost was refunded. A paid forecast planning fee is not refunded.');
  return good('Construction cancelled. Reserved materials and the building coin cost are available again.', { refunded });
}
export function notifyConstructionEtaChange(state) {
  if (!state.constructionProjects.some(project => ['transport', 'queued', 'planned'].includes(project.stage))) return;
  notify(state, 'construction-eta-updated', 'Construction delivery estimates changed', 'Warehouse staffing changed. Delivery and building estimates now use the available carriers; completed building time does not change.');
}
export function finishConstruction(state, project) {
  const id=project.building, building=state.buildings[id];
  building.level=project.targetLevel;
  state.constructionProjects=state.constructionProjects.filter(other=>other!==project);
  if(id==='townhall') state.capacity=building.level*(state.ruleset === 32 ? 36 : 24);
  if(id==='lighthouse') {
    state.objective={wood:50,stone:30,repaired:true};
    beginLighthouseBonus(state,86400*building.level);
    notify(state,'lighthouse-bonus','Lighthouse bonus',`For ${24*building.level} hours: happiness is 100% and material production ×2.`);
  }
  if(id==='chapel') {
    state.chapelRemaining=36000;
    notify(state,'chapel-upgrade','Chapel upgrade bonus',`For 10 hours: +${building.level*10} happiness.`);
  }
  state.statistics.upgrades=Math.min(10000000,(state.statistics.upgrades||0)+1);
  notify(state,'construction-finished',`${buildingNames[id]}: level ${building.level}`,'Upgrade complete. The new level is now active.');
  syncConstructionPointers(state);
}
// Keep the forecast's existing assumptions for other multipliers, but do not
// extend a finite mission reward across the whole material-production plan.
// Food consumption remains a separate constant cost in both time segments.
function missionProductionSeconds(state, building, quantity, baseOutput, consumption = 0) {
  if (!(quantity > 0)) return 0;
  const now = state.worldTimeMs || 0;
  const boostedSeconds = Math.max(0, ...(state.missionProductionBonuses || [])
    .filter(effect => effect.building === building && effect.multiplier === 2 && Number.isFinite(effect.until) && effect.until > now)
    .map(effect => (effect.until - now) / 1000));
  const ordinaryRate = baseOutput - consumption;
  if (!boostedSeconds) return ordinaryRate > 0 ? quantity / ordinaryRate * 3600 : Infinity;
  const boostedRate = baseOutput * 2 - consumption;
  if (!(boostedRate > 0)) return Infinity;
  const boostedQuantity = boostedRate * boostedSeconds / 3600;
  if (quantity <= boostedQuantity) return quantity / boostedRate * 3600;
  return ordinaryRate > 0 ? boostedSeconds + (quantity - boostedQuantity) / ordinaryRate * 3600 : Infinity;
}
export function estimateMaterialsSeconds(state,cost,ownerContext=null) {
  // A plan has already pledged part of its cost. Credit only that plan's own
  // assets; a fresh quote must never count another project's reservations.
  // Exact cost identity preserves the existing project.cost call sites.
  const candidate=ownerContext?.project??ownerContext;
  const owner=(state.constructionProjects||[]).find(project=>candidate?
    project===candidate||project.order===(typeof candidate==='number'?candidate:candidate.order):project.cost===cost);
  const owned = id => {
    if(!owner)return 0;
    if(id==='coins')return owner.reservedCoins||0;
    const carried=(state.haulTrips?.warehouse||[]).filter(trip=>trip.kind==='construction'&&trip.projectOrder===owner.order&&trip.resource===id).reduce((sum,trip)=>sum+trip.amount,0);
    return (owner.reservedMaterials?.[id]||0)+(owner.delivered?.[id]||0)+carried;
  };
  if(state.ruleset === 32)return estimateDevelopmentMaterialsSeconds(state,cost,owned);
  const limits=warehouseLimits(state);
  if(materialIds(state).some(id=>(cost[id]||0)>limits.perResource)||materialIds(state).reduce((n,id)=>n+(cost[id]||0),0)>limits.total)return Infinity;
  const crew=effectiveWorkerCount(state,'warehouse'), capacity=haulCapacity(state), efficiency=workerEfficiency(state);
  let time=0,trips=0;
  for(const [id,value] of Object.entries(cost)) {
    const missing=Math.max(0,value-(id==='coins'?state.resources.coins:availableGoods(state,id))-owned(id));
    if(!missing)continue;
    if(id==='coins') {
      const workers=Object.keys(buildingNames).reduce((n,k)=>n+activeWorkerIndices(state,k).length,0);
      if(!workers)return Infinity; time=Math.max(time,missing/workers*3600/(state.chapelRemaining>0?2:1));continue;
    }
    if(!crew)return Infinity;
    const producer=Object.keys(PRODUCTION_RECIPES).find(k=>PRODUCTION_RECIPES[k].output===id), b=state.buildings[producer], recipe=PRODUCTION_RECIPES[producer];
    const buffered=b.ready+(state.pendingDeliveries[id]||0), make=Math.max(0,missing-buffered);
    const workers=effectiveWorkerCount(state,producer), rate=workers*productionRate(state,producer)*efficiency*(state.lighthouseRemaining>0?2:1)*activePlayMultiplier(state)*eventProductionMultiplier(state,producer);
    const productionSeconds=missionProductionSeconds(state,producer,make,rate,id==='food'?foodDemandPerHour(state):0);
    if(!Number.isFinite(productionSeconds))return Infinity;
    time=Math.max(time,productionSeconds);trips+=Math.ceil(missing/capacity);
    if(make&&recipe.input) {
      const upstream=Object.keys(PRODUCTION_RECIPES).find(k=>PRODUCTION_RECIPES[k].output===recipe.input), need=Math.max(0,make*recipe.amount-centralAvailable(state,recipe.input)-state.buildings[upstream].ready);
      const upstreamRate=effectiveWorkerCount(state,upstream)*productionRate(state,upstream)*efficiency*(state.lighthouseRemaining>0?2:1)*activePlayMultiplier(state)*eventProductionMultiplier(state,upstream);
      const upstreamSeconds=missionProductionSeconds(state,upstream,need,upstreamRate);
      if(!Number.isFinite(upstreamSeconds))return Infinity;
      time=Math.max(time,upstreamSeconds);trips+=Math.ceil(need/capacity);
    }
  }
  return Math.max(time,crew?Math.ceil(trips/crew)*300/transportEfficiency(state,efficiency):0);
}
// A conservative preparation estimate: finish input chains before the final
// process and count physical carrier waves. It is not a50-day balance proof.
function estimateDevelopmentMaterialsSeconds(state,cost,owned) {
  const limits=warehouseLimits(state),materials=materialIds(state),carriers=effectiveWorkerCount(state,'warehouse'),capacity=haulCapacity(state);
  if(materials.some(id=>(cost[id]||0)>limits.perResource)||materials.reduce((s,id)=>s+(cost[id]||0),0)>limits.total)return Infinity;
  const pool=Object.fromEntries(materials.map(id=>[id,physicalAvailableGoods(state,id)+owned(id)]));
  if(carriers>0)for(const id of materials){pool[id]+=state.pendingDeliveries?.[id]||0;for(const building of developmentProducerIds(state))if(availableRecipes(state,building).some(r=>r.outputs[id]))pool[id]+=state.provisions?.localStock?.[building]?.[id]||0;}
  const recipes=developmentProducerIds(state).flatMap(building=>productionAssignments(state,building).filter(r=>r.workers>0).map(row=>{
    const ready=activeWorkerIndices(state,building).length;
    const crew=Math.min(row.workers,ready)*effectiveWorkerCount(state,building)/Math.max(1,ready);
    const rate=crew*row.ratePerWorkerHour*workerEfficiency(state)*(state.lighthouseRemaining>0?2:1)*activePlayMultiplier(state)*eventProductionMultiplier(state,building)*missionProductionMultiplier(state,building);
    return {...row,rate};
  }));
  let trips=0;
  const make=(resource,quantity,path=[])=>{
    const used=Math.min(pool[resource]||0,quantity);pool[resource]=(pool[resource]||0)-used;let missing=quantity-used;if(missing<=EPS)return 0;
    if(!carriers||path.includes(resource))return Infinity;
    const choices=recipes.filter(row=>row.outputs[resource]&&row.rate>0),row=choices.sort((a,b)=>b.rate*b.outputs[resource]-a.rate*a.outputs[resource])[0];if(!row)return Infinity;
    const batches=Math.ceil(missing/row.outputs[resource]-EPS);let upstream=0;
    for(const[id,n]of Object.entries(row.inputs)){upstream=Math.max(upstream,make(id,n*batches,[...path,resource]));trips+=Math.ceil(n*batches/capacity);}
    pool[resource]+=(batches*row.outputs[resource]-missing);trips+=Math.ceil(missing/capacity);
    return upstream+batches/row.rate*3600;
  };
  let time=0;
  for(const[resource,quantity]of Object.entries(cost)) {
    if(resource==='coins') {const missing=Math.max(0,quantity-state.resources.coins-owned('coins')),workers=(state.residents||[]).filter(p=>p.workplace&&!p.pendingRelease).length;if(missing&&!workers)return Infinity;time=Math.max(time,missing/Math.max(1,workers)*3600/(state.chapelRemaining>0?2:1));continue;}
    if(!GOODS[resource]||typeof quantity!=='number')continue;
    // Old missions quote virtual Food. Construction already has a physical mix.
    if(resource==='food'&&!quantityIsPhysicalFood(cost)) {const missing=Math.max(0,quantity-availableGoods(state,'food')-owned('food'));if(missing>0)time=Math.max(time,make('grain',missing*6));continue;}
    time=Math.max(time,make(resource,quantity));
  }
  return time+(trips?Math.ceil(trips/Math.max(1,carriers))*300/transportEfficiency(state):0);
}
const quantityIsPhysicalFood=cost=>!!cost.foodQuote||cost.physicalFood===true;
export function flushPendingDeliveries(state) {
  normalizeBonusMaterials(state);
  state.pendingDeliveries ||= stock(state);
  let moved = 0;
  for (const id of ['food', ...materialIds(state).filter(resource => resource !== 'food')]) {
    const accepted = Math.min(state.pendingDeliveries[id] || 0, centralRoom(state, id));
    if (accepted <= 0) continue;
    if(!(state.ruleset === 32 && milkCargoToCentral(state,id,accepted,state.provisions?.pendingMilkLots||[])))state.resources[id] = (state.resources[id] || 0) + accepted;
    if(state.ruleset === 32 && id === 'rawMilk')takeMilkMetadata(state.provisions.pendingMilkLots||=[],accepted);
    state.pendingDeliveries[id] -= accepted; moved += accepted;
  }
  return moved;
}
export function receiveMaterials(state,values,{overflowToPending=true,bonus=true}={}) {
  if(state.ruleset === 32) {
    if(bonus)values=materialReward(state,values);
    normalizeBonusMaterials(state);state.pendingDeliveries||=stock(state);
    for(const id of materialIds(state)) {
      const amount=Math.floor(clamp(values[id],0,Number.MAX_SAFE_INTEGER)),accepted=Math.min(amount,centralRoom(state,id));
      if(!milkCargoToCentral(state,id,accepted))state.resources[id]=(state.resources[id]||0)+accepted;
      if(overflowToPending)state.pendingDeliveries[id]=Math.min(Number.MAX_SAFE_INTEGER,(state.pendingDeliveries[id]||0)+amount-accepted);
    }
    flushPendingDeliveries(state);return;
  }
  if (bonus) {
    grantBonusMaterials(state, values);
    return;
  }
  normalizeBonusMaterials(state);
  state.pendingDeliveries ||= stock();
  for(const id of ['food', ...MATERIAL_IDS.filter(resource => resource !== 'food')]) {
    const amount=Math.floor(clamp(values[id],0,Number.MAX_SAFE_INTEGER)), accepted=Math.min(amount,centralRoom(state,id));
    state.resources[id]+=accepted;
    if(overflowToPending)state.pendingDeliveries[id]=Math.min(Number.MAX_SAFE_INTEGER,(state.pendingDeliveries[id]||0)+amount-accepted);
  }
  flushPendingDeliveries(state);
}
export function syncCrewProgress(state,id,oldCount,newCount) {
  const b=state.buildings[id],cycle=PRODUCTION_RECIPES[id]?3600/Math.max(1,productionRate(state,id)):300;
  b.workProgress=Array.from({length:newCount},(_,i)=>i<oldCount?clamp(b.workProgress?.[i],0,cycle):0);
  for(let i=0;i<Math.max(0,oldCount-newCount);i++)state.returningWorkers.push(120);
}
export function notify(state,kind,title,message) {
  state.notifications ||= [];
  state.notificationSequence=(state.notificationSequence||0)+1;
  state.notifications.unshift({id:state.notificationSequence,kind,title,message,at:state.activeSeconds||0,read:false});
  state.notifications.length=Math.min(100,state.notifications.length);
}
export function productionBlocked(state,id) {
  if(state.ruleset === 32)return developmentProductionBlocked(state,id);
  const r=PRODUCTION_RECIPES[id],b=state.buildings[id];
  return !!r&&(b.ready>=producerCapacity(state,id)||(r.input&&centralAvailable(state,r.input)<r.amount));
}
export function storagePenalty(state,id) {
  const b=state.buildings[id];
  return productionBlocked(state,id)?Math.min(50,10*(1+Math.floor(((b.fullSeconds||0)+EPS)/86400))):0;
}
export function updateStorageStatus(state,elapsed=0) {
  flushPendingDeliveries(state);
  const limits=warehouseLimits(state);
  const producers=state.ruleset === 32 ? developmentProducerIds(state).map(id=>[id,{output:'towarów'}]) : Object.entries(PRODUCTION_RECIPES);
  for(const [id,r] of producers) {
    const b=state.buildings[id],local=state.provisions?.localStock?.[id]||{},full=state.ruleset === 32 ? Object.values(local).reduce((s,n)=>s+n,0)>=300*b.level || Object.values(local).some(n=>n>=200*b.level) : b.ready>=producerCapacity(state,id),blocked=productionBlocked(state,id);
    if(full&&!b.storageFull)notify(state,'storage-full',`${buildingNames[id]}: storage is full`,`Storage full: ${materialNames[r.output]}. Production is waiting for transport.`);
    b.fullSeconds=blocked?Math.min(432000,(b.productionBlocked?b.fullSeconds||0:0)+elapsed):0;
    b.productionBlocked=blocked;b.storageFull=full;
  }
  for(const [id,full,label] of [['warehouse',ordinaryWarehouseUsed(state)>=limits.total,'The central warehouse is full'],['market',workplaceUnlocked(state,'market')&&marketUsed(state)>=marketCapacity(state),'The market is full'],['dock',workplaceUnlocked(state,'dock')&&dockUsed(state)>=dockCapacity(state).total,'The harbor is full']]) {
    const b=state.buildings[id];if(full&&!b.storageFull)notify(state,'storage-full',label,'Use or collect goods, or upgrade this building.');b.storageFull=full;
  }
  state.fullResources ||= {};
  for(const id of materialIds(state)) {
    const full=ordinaryStock(state,id)>=limits.perResource&&limits.perResource>0;
    if(full&&!state.fullResources[id])notify(state,'storage-full','Material storage limit reached',`The central warehouse has no more space for ${materialNames[id]}.`);
    state.fullResources[id]=full;
  }
}
// Translate only recognized messages produced by earlier game releases.
// Unknown/custom notification content and every saved metadata field are preserved.
const legacyNotificationText = {
  "plan czeka na dostawy": "plan waiting for deliveries",
  "materiały zarezerwowane w kolejce": "materials reserved in the queue",
  "materiały zarezerwowane, oczekiwanie na transport": "materials reserved, waiting for transport",
  "Błogosławieństwo": "Blessing",
  "+50 każdego zasobu oraz +20 szczęścia każdemu mieszkańcowi przez godzinę.": "+50 of every resource and +20 happiness for every resident for one hour.",
  "Spodziewane materiały są już w magazynie. Pełny koszt został zarezerwowany.": "The expected materials have arrived in the warehouse. The full cost is now reserved.",
  "Zwolniło się miejsce budowy. Zarezerwowane materiały czekają na transport.": "A construction slot is available. Reserved materials are waiting for transport.",
  "Premia latarni morskiej": "Lighthouse bonus",
  "Premia za rozbudowę kaplicy": "Chapel upgrade bonus",
  "Rozbudowa zakończona. Nowy poziom już działa.": "Upgrade complete. The new level is now active.",
  "Magazyn centralny jest pełny": "The central warehouse is full",
  "Brak wspólnego miejsca. Rozbuduj magazyn lub zużyj towary.": "No shared storage space remains. Upgrade the warehouse or use some goods.",
  "Targ jest pełny": "The market is full",
  "Wymień towary albo zleć ich odbiór do magazynu.": "Exchange goods or order their collection by warehouse workers.",
  "Pełna pojemność towaru": "Material storage limit reached",
  "Rozpoczęła się budowa latarni. Potrwa dwa razy tyle co transport.": "Lighthouse construction has started. It will take twice as long as transport.",
  "Rozpoczęła się budowa. Potrwa tyle samo co transport materiałów.": "Construction has started. It will take as long as material transport."
};
const legacyBuildingNames = { 'Farma': 'Farm', 'Obóz drwali': 'Lumber Camp', 'Kamieniołom': 'Quarry', 'Młyn': 'Windmill', 'Tartak': 'Sawmill', 'Magazyn': 'Warehouse', 'Targ': 'Market', 'Przystań': 'Harbor', 'Dom': 'House', 'Ratusz': 'Town Hall', 'Kaplica': 'Chapel', 'Latarnia': 'Lighthouse', 'Latarnia Morska': 'Lighthouse' };
const legacyMaterialNames = { 'drewno': 'wood', 'kamień': 'stone', 'zboże': 'grain', 'żywność': 'food', 'deski': 'planks' };
const legacyBuildingSuffixes = { 'materiały zarezerwowane': 'materials reserved', 'rozbudowa ruszyła': 'upgrade started', 'magazyn jest pełny': 'storage is full', 'materiały dostarczone': 'materials delivered' };
function translateSavedNotificationText(text) {
  if (Object.hasOwn(legacyNotificationText, text)) return legacyNotificationText[text];
  for (const [oldName, englishName] of Object.entries(legacyBuildingNames)) {
    if (!text.startsWith(`${oldName}: `)) continue;
    const suffix = text.slice(oldName.length + 2);
    if (Object.hasOwn(legacyBuildingSuffixes, suffix)) return `${englishName}: ${legacyBuildingSuffixes[suffix]}`;
    const level = /^poziom (\d+)$/.exec(suffix);
    if (level) return `${englishName}: level ${level[1]}`;
  }
  const full = /^Pełny zapas: (drewno|kamień|zboże|żywność|deski)\. Produkcja czeka na transport\.$/.exec(text);
  if (full) return `Storage full: ${legacyMaterialNames[full[1]]}. Production is waiting for transport.`;
  const resource = /^W magazynie centralnym nie ma już miejsca na towar: (drewno|kamień|zboże|żywność|deski)\.$/.exec(text);
  if (resource) return `The central warehouse has no more space for ${legacyMaterialNames[resource[1]]}.`;
  const chapel = /^Przez 10 godzin: \+(\d+) szczęścia każdemu mieszkańcowi oraz podatki ×2\.$/.exec(text);
  if (chapel) return `For 10 hours: +${chapel[1]} happiness for every resident and taxes ×2.`;
  const lighthouse = /^Przez (\d+) godzin: \+100 szczęścia wszystkim i produkcja materiałów ×2\. Podatki bez zmian\.$/.exec(text);
  if (lighthouse) return `For ${lighthouse[1]} hours: +100 happiness for everyone and material production ×2. Taxes are unchanged.`;
  return text;
}


const lot = (resource, amount, remaining = 86400, extra = {}) => ({ resource, amount, remaining, ...extra });
function normalizeLots(values, { locked = false, protectedCargo = false, materials = MATERIAL_IDS } = {}) {
  return (Array.isArray(values) ? values : []).filter(x => x && materials.includes(x.resource) && whole(x.amount) > 0).slice(0,10000).map(x => ({ resource:x.resource,amount:whole(x.amount),remaining:clamp(x.remaining,0,locked?3600:86400),...(locked?{expiresRemaining:clamp(x.expiresRemaining??86400,0,86400)}:{}),...(x.resource==='rawMilk'&&Array.isArray(x.milkLots)?{milkLots:x.milkLots.filter(l=>l&&l.amount>0).map(l=>({amount:l.amount,centralSeconds:clamp(l.centralSeconds,0,259200)}))}:{}),...(x.orderId?{orderId:whole(x.orderId)}:{}),...(x.direction?{direction:x.direction}:{}),...(protectedCargo&&x.protected===true&&x.direction==='buy'?{protected:true}:{}) }));
}
const liveCargo = entry => entry.protected === true || entry.remaining > EPS;
function takeMilkMetadata(lots,amount) {
  let left=amount;const result=[];
  for(const entry of lots) {const moved=Math.min(left,entry.amount||0);if(moved>0){result.push({amount:moved,centralSeconds:entry.centralSeconds||0});entry.amount-=moved;left-=moved;}if(left<=EPS)break;}
  for(let index=lots.length-1;index>=0;index--)if(lots[index].amount<=EPS)lots.splice(index,1);
  if(left>EPS)result.push({amount:left,centralSeconds:0});return result;
}
function removeLots(lots,resource,amount,orderId,milkLots=[]) {
  let left=amount;
  for(const entry of lots.filter(x=>x.resource===resource&&liveCargo(x)&&(orderId===undefined||x.orderId===orderId)).sort((a,b)=>a.remaining-b.remaining)) {
    const moved=Math.min(left,entry.amount);if(resource==='rawMilk')milkLots.push(...takeMilkMetadata(entry.milkLots||=[{amount:entry.amount,centralSeconds:0}],moved));entry.amount-=moved;left-=moved;if(left<=0)break;
  }
  for(let i=lots.length-1;i>=0;i--)if(!lots[i].amount)lots.splice(i,1);
  return amount-left;
}
function inboundAmount(state,destination,resource) {
  const groups = state.haulTrips;
  let total = 0;
  for (const key in groups) {
    if (!Object.prototype.hasOwnProperty.call(groups, key)) continue;
    const trips = groups[key], array = Array.isArray(trips), length = array ? trips.length : 1;
    for (let index = 0; index < length; index++) {
      if (array && !(index in trips)) continue;
      const trip = array ? trips[index] : trips;
      if ((!resource || trip.resource === resource) && (
        destination === 'warehouse' && (trip.kind === 'producer' || trip.kind === 'pending' || trip.kind === 'marketOutbound' || trip.kind === 'dockOutbound') ||
        destination === 'market' && trip.kind === 'marketInbound' ||
        destination === 'dock' && (trip.kind === 'dockInbound' || trip.kind === 'dockUnload')
      )) total += trip.amount;
    }
  }
  return total;
}
export function centralRoom(state,resource) {
  const limits=warehouseLimits(state), inbound=inboundAmount(state,'warehouse');
  const protectedFoodSpace = state.ruleset === 32 || resource === 'food' ? 0 : Math.max(0, foodReserve(state) - ordinaryStock(state,'food') - inboundAmount(state, 'warehouse', 'food'));
  return Math.max(0,Math.floor(Math.min(limits.perResource-ordinaryStock(state,resource)-inboundAmount(state,'warehouse',resource),limits.total-ordinaryWarehouseUsed(state)-inbound-protectedFoodSpace)));
}
function reservedPort(state,resource) {
  let reserved=resource?state.dock.stock[resource]:dockUsed(state);
  for(const order of state.dock.orders) {
    if(resource&&order.resource!==resource)continue;
    if(order.direction==='buy'&&['voyage','unloading'].includes(order.stage))reserved+=order.remainingToUnload||0;
    if(order.direction==='sell'&&['supplying','loading'].includes(order.stage))reserved+=order.remainingToPort||0;
  }
  return reserved+inboundAmount(state,'dock',resource);
}
function savedEffectTransition(value) {
  if (!value || typeof value !== 'object' || !['started', 'changed', 'ended'].includes(value.transition) || typeof value.effectId !== 'string') return null;
  const detail = { transition: value.transition, effectId: value.effectId.slice(0, 120),
    residentIds: [...new Set((Array.isArray(value.residentIds) ? value.residentIds : []).filter(id => Number.isSafeInteger(id) && id >= 1))].slice(0, 2400),
    affectedCount: Math.min(2400, whole(value.affectedCount)) };
  for (const key of ['building','resource','blockageReason','reason']) if (typeof value[key] === 'string') detail[key] = value[key].slice(0, 80);
  for (const key of ['resumedCount','recalledCount','remainingLocal','amount']) if (Number.isFinite(value[key])) detail[key] = clamp(value[key], 0, Number.MAX_SAFE_INTEGER);
  return detail;
}
export function normalizeLogisticsState(state,raw) {
  if(state.ruleset === 32)normalizeProvisions(state,raw);
  normalizeEconomyLedger(state, raw);
  state.starterTurbo = raw.starterTurbo?.version === 1 && raw.starterTurbo.unlocked === true ? { version: 1, unlocked: true, unlockedAt: clamp(raw.starterTurbo.unlockedAt, 0, Number.MAX_SAFE_INTEGER) } : null;
  const legacyBonusInventory = raw.bonusInventoryVersion !== 1;
  const savedBonus = { ...(raw.bonusMaterials || {}) };
  const savedPending = Object.fromEntries(materialIds(state).map(id => [id, Math.floor(clamp(raw.pendingDeliveries?.[id],0,Number.MAX_SAFE_INTEGER))]));
  const savedRewards = Object.fromEntries(materialIds(state).map(id => [id, Math.floor(clamp(raw.rewardBuffer?.[id],0,Number.MAX_SAFE_INTEGER))]));
  // Preserve the completed fraction of a pre-v15 unit, rather than clamp its
  // old seconds into the now shorter cycle and award a unit on reload. Capture
  // the marker before writing because callers may pass state as raw too.
  const savedProductionVersion = raw.productionRateVersion;
  state.productionRateVersion = PRODUCTION_RATE_VERSION;
  state.activeSeconds=clamp(raw.activeSeconds,0,Number.MAX_SAFE_INTEGER);
  state.constructionSequence=whole(raw.constructionSequence);
  state.pendingDeliveries=legacyBonusInventory?stock(state):savedPending;
  state.returningWorkers=Array.isArray(raw.returningWorkers)?raw.returningWorkers.filter(x=>Number.isFinite(x)&&x>0).slice(0,state.population).map(x=>clamp(x,0,120)):[];
  const order=Array.isArray(raw.transportPriority)?raw.transportPriority.filter(id=>materialIds(state).includes(id)):[];
  state.transportPriority=[...new Set([...order,...materialIds(state)])];
  state.logisticsPriority=Array.isArray(raw.logisticsPriority)?[...new Set(raw.logisticsPriority.filter(x=>typeof x==='string').slice(0,100))]:[];
  const selected = Array.isArray(raw.warehousePriorities) ? raw.warehousePriorities : state.logisticsPriority.flatMap(target => target.startsWith('producer:') ? [PRODUCTION_RECIPES[target.slice(9)]?.output] : []);
  state.warehousePriorities = [...new Set(selected.filter(id => warehousePriorityIds(state).includes(id)))].slice(0,3);
  state.warehousePriorityCycle = {
    position: whole(raw.warehousePriorityCycle?.position) % 10,
    seed: (Math.floor(clamp(raw.warehousePriorityCycle?.seed,0,0xffffffff)) >>> 0) || ((Math.floor(state.worldTimeMs || 0) ^ 0x6d2b79f5) >>> 0) || 1
  };
  state.market={stock:stock(state),locked:normalizeLots(raw.market?.locked,{locked:true,materials:materialIds(state)}),lots:normalizeLots(raw.market?.lots,{materials:materialIds(state)}),orders:[],dispatch:stock(state)};
  for(const id of materialIds(state)) { state.market.stock[id]=whole(raw.market?.stock?.[id]);state.market.dispatch[id]=Math.min(state.market.stock[id],whole(raw.market?.dispatch?.[id])); }
  state.market.orders=(Array.isArray(raw.market?.orders)?raw.market.orders:[]).filter(x=>x&&materialIds(state).includes(x.resource)&&whole(x.amount)>0).slice(0,100).map(x=>({resource:x.resource,amount:whole(x.amount)}));
  for(const id of materialIds(state)) {
    const represented=state.market.lots.filter(x=>x.resource===id).reduce((n,x)=>n+x.amount,0);
    if(represented<state.market.stock[id])state.market.lots.push(lot(id,state.market.stock[id]-represented));
  }
  state.dock={stock:stock(state),lots:normalizeLots(raw.dock?.lots,{protectedCargo:true,materials:materialIds(state)}),orders:[],purchaseHistory:[],nextOrderId:whole(raw.dock?.nextOrderId)};
  for(const id of materialIds(state))state.dock.stock[id]=whole(raw.dock?.stock?.[id]);
  for(const x of Array.isArray(raw.dock?.orders)?raw.dock.orders:[]) {
    if(!x||!materialIds(state).includes(x.resource)||!['buy','sell'].includes(x.direction)||!quantity(x.amount)||x.amount%100)continue;
    const normalized={id:whole(x.id)||++state.dock.nextOrderId,direction:x.direction,resource:x.resource,amount:whole(x.amount),price:clamp(x.price,0,Number.MAX_SAFE_INTEGER),stage:['voyage','unloading','collecting','supplying','loading','complete','expired'].includes(x.stage)?x.stage:'expired',remainingToPort:whole(x.remainingToPort),remainingToUnload:whole(x.remainingToUnload),remainingToShip:whole(x.remainingToShip),remaining:clamp(x.remaining,0,300),expiresRemaining:clamp(x.expiresRemaining??86400,0,86400),delivered:whole(x.delivered),paid:x.paid===true,reservationVersion:9};
    normalized.expiredAmount=whole(x.expiredAmount);normalized.loaded=whole(x.loaded??Math.max(0,normalized.amount-normalized.remainingToShip-normalized.expiredAmount));
    if(x.paidCoins!==undefined)normalized.paidCoins=whole(x.paidCoins);
    if(x.reservationVersion!==9&&normalized.direction==='sell'&&!['complete','expired'].includes(normalized.stage))state.resources[normalized.resource]+=normalized.remainingToPort;
    state.dock.nextOrderId=Math.max(state.dock.nextOrderId,normalized.id);state.dock.orders.push(normalized);
  }
  state.dock.orders=state.dock.orders.slice(-100);
  state.dock.purchaseHistory=(Array.isArray(raw.dock?.purchaseHistory)?raw.dock.purchaseHistory:[]).filter(x=>x&&materialIds(state).includes(x.resource)&&whole(x.lots)&&x.remaining>0).slice(-10000).map(x=>({resource:x.resource,lots:whole(x.lots),remaining:clamp(x.remaining,0,10800)}));
  state.haulTrips={warehouse:[],market:[],dock:[]};
  const kinds=['producerInput','directRoute','producer','pending','construction','marketInbound','marketOutbound','dockInbound','dockLoad','dockUnload','dockOutbound'];
  for(const id of Object.keys(state.haulTrips))for(const t of Array.isArray(raw.haulTrips?.[id])?raw.haulTrips[id]:[]) {
    if(!t||!kinds.includes(t.kind)||!materialIds(state).includes(t.resource)||!whole(t.amount))continue;
    state.haulTrips[id].push({worker:Number.isInteger(t.worker)&&t.worker>=-1?t.worker:0,remaining:clamp(t.remaining,0,t.kind === 'construction' && t.economyClock === true ? 86400 : 300),resource:t.resource,amount:whole(t.amount),kind:t.kind,...(t.kind === 'construction' && t.starterTurboClock === true ? { starterTurboClock: true } : {}),...(t.kind === 'construction' && t.economyClock === true ? { economyClock: true } : {}),...(Number.isSafeInteger(t.residentId)?{residentId:t.residentId}:{}),...((state.ruleset===32?Number.isFinite(t.workMultiplier)&&t.workMultiplier>0:[.5,1].includes(t.workMultiplier)) ? {workMultiplier:clamp(t.workMultiplier,.01,1000)} : {}),...(t.producer&&state.buildings[t.producer]?{producer:t.producer}:{}),...(t.target&&state.buildings[t.target]?{target:t.target}:{}),...(typeof t.routeId==='string'?{routeId:t.routeId}:{}),...(t.resource==='rawMilk'&&Array.isArray(t.milkLots)?{milkLots:t.milkLots.filter(l=>l&&l.amount>0).map(l=>({amount:l.amount,centralSeconds:clamp(l.centralSeconds,0,259200)}))}:{}),...(t.projectOrder?{projectOrder:whole(t.projectOrder)}:{}),...(t.orderId?{orderId:whole(t.orderId)}:{})});
  }
  state.notifications=(Array.isArray(raw.notifications)?raw.notifications:[]).slice(0,100).filter(n=>n&&typeof n.title==='string'&&typeof n.message==='string').map(n=>({id:whole(n.id),kind:String(n.kind||'info').slice(0,40),title:translateSavedNotificationText(n.title.slice(0,150)),message:translateSavedNotificationText(n.message.slice(0,800)),at:clamp(n.at,0,Number.MAX_SAFE_INTEGER),read:n.read===true,...(typeof n.titlePl==='string'?{titlePl:n.titlePl.slice(0,150)}:{}),...(typeof n.messagePl==='string'?{messagePl:n.messagePl.slice(0,800)}:{}),...(typeof n.worldEventId==='string'?{worldEventId:n.worldEventId.slice(0,80)}:{}),...(typeof n.effectId==='string'?{effectId:n.effectId.slice(0,120)}:{}),...(savedEffectTransition(n.effectTransition)?{effectTransition:savedEffectTransition(n.effectTransition)}:{})}));
  state.notificationSequence=Math.max(whole(raw.notificationSequence),...state.notifications.map(n=>n.id),0);
  state.fullResources=Object.fromEntries(materialIds(state).map(id=>[id,raw.fullResources?.[id]===true]));
  for(const [id,b] of Object.entries(state.buildings)) {
    const cycle=PRODUCTION_RECIPES[id]?3600/Math.max(1,productionRate(state,id)):300;
    const oldLevel = b.level || 0;
    const oldRate = savedProductionVersion === 3 ? productionRate(state,id) : oldLevel === 1 ? 20 : oldLevel > 1 ? 2 * (oldLevel + 10) : 0;
    const legacyRate = savedProductionVersion === 2 || savedProductionVersion === 3 ? oldRate : oldRate / 2;
    const progressScale = PRODUCTION_RECIPES[id] && legacyRate > 0 ? legacyRate / productionRate(state,id) : 1;
    b.workProgress=Array.from({length:b.workers},(_,i)=>clamp(raw.buildings?.[id]?.workProgress?.[i] * progressScale,0,cycle));
    b.storageFull=raw.buildings?.[id]?.storageFull===true;b.productionBlocked=raw.buildings?.[id]?.productionBlocked===true;b.fullSeconds=clamp(raw.buildings?.[id]?.fullSeconds,0,432000);
  }
  state.premium={...(raw.premium||{}),expiresAt:clamp(raw.premium?.expiresAt,0,Number.MAX_SAFE_INTEGER)};
  const levels=Object.fromEntries(Object.entries(state.buildings).map(([id,b])=>[id,b.level]));state.constructionProjects=[];
  for(const x of [...(Array.isArray(raw.constructionProjects)?raw.constructionProjects:[])].sort((a,b)=>(a?.order||0)-(b?.order||0))) {
    if(!x||!buildingNames[x.building]||!['transport','building','queued','planned'].includes(x.stage)||x.targetLevel!==levels[x.building]+1||x.targetLevel>100)continue;
    const cost=Object.fromEntries([...materialIds(state),'coins'].filter(id=>whole(x.cost?.[id])).map(id=>[id,whole(x.cost[id])]));
    const p={...x,building:x.building,targetLevel:x.targetLevel,cost,goodsTotal:whole(x.goodsTotal),goodsRemaining:whole(x.goodsRemaining),transportSeconds:clamp(x.transportSeconds,0,Number.MAX_SAFE_INTEGER),buildRemaining:clamp(x.buildRemaining,0,Number.MAX_SAFE_INTEGER),stage:x.stage,order:whole(x.order)||++state.constructionSequence};
    const turbo = x.starterTurbo;
    if (turbo?.version === 1 && [1,2].includes(turbo.level) && turbo.carriers === 6 && Number.isSafeInteger(turbo.capacity) && turbo.capacity > 0 && Number.isSafeInteger(turbo.trips) && turbo.trips > 0 && Number.isSafeInteger(turbo.waves) && turbo.waves === Math.ceil(turbo.trips / 6) && Number.isFinite(turbo.transportDuration) && turbo.transportDuration > 0 && turbo.transportDuration <= 300 && Number.isFinite(turbo.buildingDuration) && turbo.buildingDuration > 0 && turbo.buildingDuration <= 10000000 && Number.isFinite(turbo.courseSeconds) && Math.abs(turbo.courseSeconds * turbo.waves - turbo.transportDuration) < EPS) p.starterTurbo = { version: 1, level: turbo.level, carriers: 6, capacity: turbo.capacity, trips: turbo.trips, waves: turbo.waves, transportDuration: turbo.transportDuration, buildingDuration: turbo.buildingDuration, courseSeconds: turbo.courseSeconds };
    else delete p.starterTurbo;
    const economyTiming = normalizeConstructionTiming(x.economyTiming);
    if (!p.starterTurbo && economyTiming && economyTiming.weight === constructionTiming(state, p)?.weight) {
      p.economyTiming = economyTiming; p.economyVersion = 1;
    } else { delete p.economyTiming; delete p.economyVersion; }
    if(x.remainingMaterials)p.remainingMaterials=Object.fromEntries(materialIds(state).map(id=>[id,whole(x.remainingMaterials[id])]));
    if(x.delivered)p.delivered=Object.fromEntries(materialIds(state).map(id=>[id,whole(x.delivered[id])]));
    projectGoods(p);
    p.reservationVersion=9;
    p.reservedCoins=whole(x.reservedCoins ?? (x.stage === 'planned' ? 0 : cost.coins || 0));
    p.reservedMaterials=Object.fromEntries(materialIds(state).map(id=>[id,x.reservationVersion===9?Math.min(p.remainingMaterials[id],whole(x.reservedMaterials?.[id])):x.stage==='planned'?0:p.remainingMaterials[id]]));
    if(x.reservationVersion!==9&&x.stage!=='planned')for(const id of materialIds(state))state.resources[id]+=p.reservedMaterials[id];
    p.transportStarted=x.transportStarted===true||p.transportSeconds>EPS||materialIds(state).some(id=>p.delivered[id]>0)||state.haulTrips.warehouse.some(trip=>trip.projectOrder===p.order);
    state.constructionSequence=Math.max(state.constructionSequence,p.order);state.constructionProjects.push(p);levels[p.building]=p.targetLevel;
  }
  for (const trip of state.haulTrips.warehouse) if (trip.starterTurboClock && !state.constructionProjects.some(project => project.order === trip.projectOrder && project.starterTurbo)) delete trip.starterTurboClock;
  for (const trip of state.haulTrips.warehouse) if (trip.economyClock && !state.constructionProjects.some(project => project.order === trip.projectOrder && project.economyTiming)) delete trip.economyClock;
  normalizeBonusMaterials(state,{bonusMaterials:savedBonus});
  if(state.ruleset === 32)normalizeDevelopmentLogistics(state,raw);
  grantBonusMaterials(state,Object.fromEntries(materialIds(state).map(id=>[id,(legacyBonusInventory?savedPending[id]:0)+savedRewards[id]])),{preserveLegacyFood:true});
  state.rewardBuffer=stock(state);
  promoteConstructionQueue(state);
}
export function warehousePrioritySchedule(state) {
  const selected = (state.warehousePriorities || []).slice(0,3);
  if (selected.length === 1) return [...Array(8).fill(selected[0]), null, null];
  if (selected.length === 2) return [...Array(5).fill(selected[0]), ...Array(3).fill(selected[1]), null, null];
  if (selected.length === 3) return [...Array(5).fill(selected[0]), ...Array(3).fill(selected[1]), ...Array(2).fill(selected[2])];
  return Array(10).fill(null);
}
function warehouseRandom(state, values) {
  const cycle = state.warehousePriorityCycle;
  let seed = cycle.seed >>> 0;
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  cycle.seed = seed >>> 0 || 1;
  return values[Math.floor(cycle.seed / 0x100000000 * values.length)];
}
function preferredWarehouseSource(sources) {
  const prioritized = sources.filter(source => source.priority >= 0).sort((a,b) => a.priority - b.priority);
  return prioritized[0] || sources[0] || null;
}
const warehousePriorityKey = source => source.kind === 'construction' ? 'construction' : source.resource;
function warehouseConstructionCrew(state, project = null) {
  const allReady = activeWorkerIndices(state, 'warehouse'),routes=state.ruleset === 32?directRouteWorkers(state,allReady):new Map(),ready=allReady.filter(index=>!routes.has(index));
  const first = project || [...(state.constructionProjects || [])].filter(item => item.stage === 'transport' && materialIds(state).some(resource => projectGoods(item)[resource] > 0)).sort((a,b) => a.order - b.order)[0] || null;
  const referenceWorkers = first?.starterTurbo ? 6 : first?.economyTiming?.requiredWorkers || 0;
  const builders = referenceWorkers ? ready.slice(0, referenceWorkers) : [];
  let utility = referenceWorkers ? ready.slice(referenceWorkers) : [...ready];
  const urgentFood = centralAvailable(state, 'food') < foodReserve(state);
  const foodPriority = (state.warehousePriorities || []).includes('food');
  const foodProductionExpected = (state.buildings.windmill?.workers || 0) > 0;
  const foodExpected = (state.buildings.windmill?.ready || 0) > 0 || foodProductionExpected || (state.haulTrips?.warehouse || []).some(trip => trip.kind === 'producer' && trip.resource === 'food');
  const foodUtility = !!referenceWorkers && ready.length > 0 && !utility.length && foodExpected && (urgentFood || foodPriority);
  const sharedCarrier = foodUtility && builders.length === 1;
  if (foodUtility) utility = [sharedCarrier ? builders[0] : builders.pop()];
  return { project: first, ready, builders, utility, referenceWorkers, urgentFood, foodPriority, foodProductionExpected, foodUtility, sharedCarrier, routedCrew:routes.size };
}
export function warehouseDispatchStatus(state) {
  const allocation = warehouseConstructionCrew(state);
  const assigned = (state.residents || []).filter(person => person.workplace === 'warehouse' && !person.pendingRelease);
  const walking = assigned.filter(person => (person.arrivalRemaining || 0) > EPS).length;
  const waitReason = !allocation.ready.length ? walking ? 'carriers-walking' : 'no-ready-carriers' :
    allocation.sharedCarrier ? 'shared-food-and-construction-carrier' : allocation.foodUtility ? 'food-collection-crew-reserved' : '';
  return { assignedCrew: assigned.length, readyCrew: allocation.ready.length+(allocation.routedCrew||0), routedCrew:allocation.routedCrew||0, constructionCrew: allocation.builders.length,
    utilityCrew: allocation.utility.length, sharedCarrier: allocation.sharedCarrier, walkingCrew: walking,
    constructionOrder: allocation.referenceWorkers ? allocation.project.order : null, foodPriority: allocation.foodPriority,
    urgentFood: allocation.urgentFood, foodReserve: foodReserve(state), centralFoodRoom: centralRoom(state, 'food'), waitReason };
}
function chooseWarehouseJob(state, { excludedConstructionOrder = null } = {}) {
  const sources=state.ruleset === 32 ? developmentWarehouseSources(state,{centralRoom:resource=>centralRoom(state,resource),centralAvailable:resource=>centralAvailable(state,resource)}) : [];
  for(const resource of state.transportPriority) {
    const room=centralRoom(state,resource);if(!room)continue;
    if(state.ruleset !== 32)for(const [producer,r] of Object.entries(PRODUCTION_RECIPES))if(r.output===resource&&state.buildings[producer].ready>0)sources.push({kind:'producer',producer,resource,available:Math.min(room,state.buildings[producer].ready),priority:state.logisticsPriority.indexOf(`producer:${producer}`)});
  }
  if(state.ruleset === 32 && !foodReservePlan(state).complete) {
    const urgent=sources.find(s=>s.kind==='producer'&&GOODS[s.resource]?.edible);if(urgent)return urgent;
  }
  if(state.ruleset !== 32 && centralAvailable(state,'food')<foodReserve(state)) {
    const urgent=sources.find(s=>s.resource==='food');if(urgent)return urgent;
  }
  const project = [...state.constructionProjects].filter(item=>item.stage==='transport'&&materialIds(state).some(resource=>(projectGoods(item)[resource]||0)>0)).sort((a,b)=>a.order-b.order)[0];
  if(project && project.order !== excludedConstructionOrder) {
    const remaining=projectGoods(project);
    for (const resource of state.transportPriority) if (remaining[resource] > 0) sources.push({kind:'construction',projectOrder:project.order,resource,available:Math.min(remaining[resource],project.reservedMaterials?.[resource]||0,state.resources[resource]||0),priority:state.logisticsPriority.indexOf(`construction:${project.order}`)});
  }
  if (!sources.length) return null;
  if(state.ruleset === 32){const ingredients=sources.filter(s=>s.kind==='producerInput');const missing=ingredients.find(s=>(state.provisions.localStock[s.target]?.[s.resource]||0)<1);if(missing)return missing;}
  if (!(state.warehousePriorities || []).length) return preferredWarehouseSource(sources);
  const selected = state.warehousePriorities;
  const desired = warehousePrioritySchedule(state)[state.warehousePriorityCycle.position];
  if (desired) {
    const matching = sources.filter(source => warehousePriorityKey(source) === desired);
    if (matching.length) return preferredWarehouseSource(matching);
  }
  // An unavailable priority never parks a free carrier. Random slots prefer
  // unselected goods; the same fallback applies to empty or blocked sources.
  const unselected = sources.filter(source => !selected.includes(warehousePriorityKey(source)));
  const eligible = unselected.length ? unselected : sources;
  const categories = [...new Set(eligible.map(warehousePriorityKey))];
  const category = warehouseRandom(state, categories);
  return preferredWarehouseSource(eligible.filter(source => warehousePriorityKey(source) === category));
}
function chooseMarketJob(state) {
  if(!workplaceUnlocked(state,'market'))return null;
  for(const resource of state.transportPriority) {
    const ready=state.market.lots.filter(entry=>entry.resource===resource&&entry.remaining>EPS).reduce((sum,entry)=>sum+entry.amount,0);
    const amount=Math.min(state.market.dispatch[resource],state.market.stock[resource],ready,centralRoom(state,resource));
    if(amount>0)return {kind:'marketOutbound',resource,available:amount};
  }
  const room=marketCapacity(state)-marketUsed(state)-inboundAmount(state,'market');
  if(room<=0)return null;
  const order=state.market.orders.find(x=>x.amount>0&&(state.resources[x.resource]||0)>0);
  return order?{kind:'marketInbound',resource:order.resource,available:Math.min(order.amount,state.resources[order.resource],room)}:null;
}
function chooseDockJob(state) {
  if(!workplaceUnlocked(state,'dock'))return null;
  for(const order of state.dock.orders) {
    if(['complete','expired'].includes(order.stage))continue;
    const r=order.resource;
    if(order.direction==='buy') {
      const port=state.dock.lots.filter(l=>l.orderId===order.id&&l.resource===r&&liveCargo(l)).reduce((n,l)=>n+l.amount,0);
      if(port>0&&centralRoom(state,r)>0)return {kind:'dockOutbound',resource:r,available:Math.min(port,centralRoom(state,r)),orderId:order.id};
      if(order.stage==='unloading'&&order.remainingToUnload>0&&order.expiresRemaining>EPS)return {kind:'dockUnload',resource:r,available:order.remainingToUnload,orderId:order.id};
    }else{
      const port=state.dock.lots.filter(l=>l.orderId===order.id&&l.resource===r&&l.remaining>EPS).reduce((n,l)=>n+l.amount,0);
      if(port>0)return {kind:'dockLoad',resource:r,available:port,orderId:order.id};
      if(order.remainingToPort>0)return {kind:'dockInbound',resource:r,available:order.remainingToPort,orderId:order.id};
    }
  }
  return null;
}
function launchTrip(state,id,index,source) {
  const construction = source.kind === 'construction' ? state.constructionProjects.find(project => project.order === source.projectOrder) : null;
  const turbo = construction?.starterTurbo, economy = construction?.economyTiming, clock = turbo || economy;
  const amount=Math.floor(Math.min(source.available,clock?.capacity || haulCapacity(state,id)));if(!amount)return false;
  const resident=(state.residents||[]).filter(person=>person.workplace===id)[index];
  if(state.ruleset === 32 && resident && !theatrePorterCanStart(state,resident,(clock?.courseSeconds||300)/(transportEfficiency(state)*residentWorkMultiplier(state,resident))))return false;
  let milkLots=[];
  if(source.kind==='producer') {if(state.ruleset === 32)milkLots=takeLocalGoods(state,source.producer,source.resource,amount).milkLots;else state.buildings[source.producer].ready-=amount;}
  if(source.kind==='directRoute')milkLots=takeLocalGoods(state,source.producer,source.resource,amount).milkLots;
  if(source.kind==='producerInput')milkLots=milkCargoFromCentral(state,source.resource,amount,(resource,n)=>consumeMaterial(state,resource,n));
  if(source.kind==='pending')state.pendingDeliveries[source.resource]-=amount;
  if(source.kind==='construction') {
    const project=state.constructionProjects.find(p=>p.order===source.projectOrder);
    projectGoods(project)[source.resource]-=amount;
    project.reservedMaterials[source.resource]-=amount;
    if(state.ruleset === 32)milkLots=milkCargoFromCentral(state,source.resource,amount,(resource,n)=>consumeMaterial(state,resource,n));else consumeMaterial(state,source.resource,amount);
    project.transportStarted=true;
  }
  if(source.kind==='marketInbound') {
    const order=state.market.orders.find(x=>x.resource===source.resource&&x.amount>0);order.amount-=amount;if(state.ruleset === 32)milkLots=milkCargoFromCentral(state,source.resource,amount,(resource,n)=>consumeMaterial(state,resource,n));else consumeMaterial(state,source.resource,amount);
  }
  if(source.kind==='marketOutbound') {state.market.stock[source.resource]-=amount;state.market.dispatch[source.resource]-=amount;removeLots(state.market.lots,source.resource,amount,undefined,milkLots);}
  const order=source.orderId?state.dock.orders.find(o=>o.id===source.orderId):null;
  if(source.kind==='dockInbound'){order.remainingToPort-=amount;if(state.ruleset === 32)milkLots=milkCargoFromCentral(state,source.resource,amount,(resource,n)=>consumeMaterial(state,resource,n));else consumeMaterial(state,source.resource,amount);}
  if(source.kind==='dockUnload')order.remainingToUnload-=amount;
  if(['dockLoad','dockOutbound'].includes(source.kind)){state.dock.stock[source.resource]-=amount;removeLots(state.dock.lots,source.resource,amount,source.orderId,milkLots);}
  state.haulTrips[id].push({worker:index,...(resident?{residentId:resident.id,workMultiplier:residentWorkMultiplier(state,resident)}:{}),remaining:clock?.courseSeconds || 300,...(turbo ? { starterTurboClock: true } : {}),...(economy ? { economyClock: true } : {}),kind:source.kind,resource:source.resource,amount,...(source.producer?{producer:source.producer}:{}),...(source.target?{target:source.target}:{}),...(source.routeId?{routeId:source.routeId}:{}),...(source.resource==='rawMilk'?{milkLots}:{}),...(source.projectOrder?{projectOrder:source.projectOrder}:{}),...(source.orderId?{orderId:source.orderId}:{})});
  if (id === 'warehouse') state.warehousePriorityCycle.position = (state.warehousePriorityCycle.position + 1) % 10;
  return true;
}
export function warehouseCarrierJobs(state) {
  const trips = state.haulTrips?.warehouse || [];
  const efficiency = transportEfficiency(state);
  const describeTrip = trip => ({
    resource: trip.resource, amount: trip.amount,
    from: ['producer','directRoute'].includes(trip.kind) ? trip.producer : trip.kind === 'pending' ? 'pending' : 'warehouse',
    to: trip.target || (trip.kind === 'construction' ? state.constructionProjects.find(project => project.order === trip.projectOrder)?.building || 'construction' : 'warehouse'),
    remaining: Math.max(0, trip.remaining) / tripEfficiency(state, trip),
    kind: trip.kind, projectOrder: trip.projectOrder || null
  });
  const people = (state.residents || []).filter(person => person.workplace === 'warehouse');
  const rows = people.map((person, worker) => {
    const trip = trips.find(item => item.worker === worker);
    return {
      residentId: person.id, worker,
      status: trip ? 'delivering' : (person.arrivalRemaining || 0) > EPS ? 'walking' : 'idle',
      resource: null, amount: 0, from: 'house', to: 'warehouse', remaining: Math.max(0, person.arrivalRemaining || 0),
      ...(trip ? describeTrip(trip) : {})
    };
  });
  // A recalled/departed carrier must not make already loaded cargo disappear.
  for (const trip of trips.filter(item => item.worker < 0 || item.worker >= people.length)) rows.push({ residentId: null, worker: trip.worker, status: 'delivering', ...describeTrip(trip) });
  return rows;
}
function dispatchTrips(state) {
  const allocation = warehouseConstructionCrew(state);
  const routeWorkers = state.ruleset === 32 ? directRouteWorkers(state,activeWorkerIndices(state,'warehouse')) : new Map();
  const turbo = allocation.referenceWorkers ? allocation.project : null;
  for(const id of ['warehouse','market','dock'])for(const index of activeWorkerIndices(state,id)) {
    if(state.haulTrips[id].some(t=>t.worker===index))continue;
    if(id === 'warehouse' && routeWorkers.has(index)) {const source=directRouteSource(state,routeWorkers.get(index));if(source)launchTrip(state,id,index,source);continue;}
    if (id === 'warehouse' && turbo) {
      // Keep construction progressing without taking every carrier away from
      // the Mill. A lone carrier alternates actual collection/building courses.
      const sharedTurn = allocation.sharedCarrier && (state.warehousePriorityCycle.position % 2 === 0);
      if (allocation.utility.includes(index) && (!allocation.sharedCarrier || sharedTurn)) {
        // Exclude the reserved order before choosing a job. Rejecting it only
        // after selection used to park every extra carrier on the same cycle.
        const source = chooseWarehouseJob(state, { excludedConstructionOrder: turbo.order });
        if (source) launchTrip(state, id, index, source);
        if (source || !allocation.sharedCarrier) continue;
      }
      if (allocation.builders.includes(index)) {
        const resource = state.transportPriority.find(resource => projectGoods(turbo)[resource] > 0 && turbo.reservedMaterials?.[resource] > 0);
        if (resource) launchTrip(state, id, index, { kind: 'construction', projectOrder: turbo.order, resource, available: Math.min(projectGoods(turbo)[resource], turbo.reservedMaterials[resource], state.resources[resource] || 0) });
      }
      continue;
    }
    const source=id==='warehouse'?chooseWarehouseJob(state):id==='market'?chooseMarketJob(state):chooseDockJob(state);
    if(source)launchTrip(state,id,index,source);
  }
}
function startBuilding(state,p) {
  p.stage='building';p.buildRemaining=constructionBuildingSeconds(p);
  notify(state,'construction-delivered',`${buildingNames[p.building]}: materials delivered`,'Transport is complete. Building work has started.');
}
function completeTrip(state,t) {
  if(state.ruleset === 32 && ['producerInput','directRoute'].includes(t.kind)) {putLocalGoods(state,t.target,t.resource,t.amount,t.milkLots);return;}
  if(['producer','pending','marketOutbound','dockOutbound'].includes(t.kind)) {
    const producedArrival = t.kind === 'producer' ? Math.min(t.amount, centralRoom(state, t.resource)) : 0;
    if(state.ruleset === 32 && t.resource === 'rawMilk') {
      const accepted=Math.min(t.amount,centralRoom(state,t.resource)),metadata=(t.milkLots||[]).map(l=>({...l})),stored=takeMilkMetadata(metadata,accepted);
      milkCargoToCentral(state,t.resource,accepted,stored);state.pendingDeliveries.rawMilk=(state.pendingDeliveries.rawMilk||0)+t.amount-accepted;
      state.provisions.pendingMilkLots||=[];state.provisions.pendingMilkLots.push(...metadata);
    }else receiveMaterials(state,{[t.resource]:t.amount},{bonus:false});state.statistics.collected=Math.min(10000000,(state.statistics.collected||0)+t.amount);
    if (producedArrival) recordEconomyOutput(state, 'delivered', t.resource, producedArrival);
    if(t.kind==='dockOutbound') {const o=state.dock.orders.find(x=>x.id===t.orderId);if(o){o.delivered+=t.amount;if(o.delivered>=o.amount)o.stage='complete';}}
  } else if(t.kind==='construction') {
    const p=state.constructionProjects.find(x=>x.order===t.projectOrder);if(!p)return;
    p.delivered[t.resource]=(p.delivered[t.resource]||0)+t.amount;p.goodsRemaining=Math.max(0,p.goodsRemaining-t.amount);
    if(!p.goodsRemaining)startBuilding(state,p);
  } else if(t.kind==='marketInbound')state.market.locked.push({resource:t.resource,amount:t.amount,remaining:3600,expiresRemaining:86400,...(t.milkLots?{milkLots:t.milkLots}:{})});
  else {
    const o=state.dock.orders.find(x=>x.id===t.orderId);if(!o)return;
    if(['dockInbound','dockUnload'].includes(t.kind)) {
      // Ship cargo actually picked up before expiry stays protected through
      // both delivery legs. Unpicked goods keep their original deadline.
      const remaining=t.kind==='dockInbound'?86400:o.expiresRemaining;
      state.dock.stock[t.resource]+=t.amount;state.dock.lots.push(lot(t.resource,t.amount,remaining,{orderId:o.id,direction:o.direction,...(t.milkLots?{milkLots:t.milkLots}:{}),...(t.kind==='dockUnload'?{protected:true}:{})}));
      if(o.direction==='buy'&&!o.remainingToUnload&&!state.haulTrips.dock.some(x=>x!==t&&x.orderId===o.id&&x.kind==='dockUnload'))o.stage='collecting';
      if(o.direction==='sell'&&!o.remainingToPort)o.stage='loading';
    }else if(t.kind==='dockLoad') {
      o.remainingToShip=Math.max(0,o.remainingToShip-t.amount);o.loaded=(o.loaded||0)+t.amount;
      finishSaleLoading(state,o);
    }
  }
}
function productionJobs(state,efficiency) {
  if(state.ruleset === 32)return developmentProductionJobs(state,{activeWorkerIndices:id=>activeWorkerIndices(state,id),speed:(id,index,person,recipeId)=>efficiency*(state.lighthouseRemaining>0?2:1)*activePlayMultiplier(state)*eventProductionMultiplier(state,id)*missionProductionMultiplier(state,id)*(person?residentWorkMultiplier(state,person,{recipeId}):1)});
  const jobs=[];
  for(const [id,r] of Object.entries(PRODUCTION_RECIPES)) {
    if(productionBlocked(state,id))continue;
    const cycle=3600/Math.max(1,productionRate(state,id));
    const engaged=activePlayMultiplier(state);
    const people = (state.residents || []).filter(person => person.workplace === id);
    for(const index of activeWorkerIndices(state,id))jobs.push({id,index,cycle,speed:efficiency*(state.lighthouseRemaining>0?2:1)*engaged*eventProductionMultiplier(state,id)*missionProductionMultiplier(state,id)*(people[index] ? residentWorkMultiplier(state,people[index]) : 1)});
  }
  return jobs;
}
export function nextLogisticsEvent(state,efficiency=workerEfficiency(state)) {
  promoteConstructionQueue(state);
  dispatchTrips(state);
  let next=Infinity;
  for (const effect of state.missionProductionBonuses || []) if (Number.isFinite(effect.until) && effect.until > (state.worldTimeMs || 0)) next = Math.min(next, (effect.until - (state.worldTimeMs || 0)) / 1000);
  for(const j of productionJobs(state,efficiency))next=Math.min(next,Math.max(0,j.cycle-(j.development?j.progress:state.buildings[j.id].workProgress[j.index]||0))/j.speed);
  for(const t of Object.values(state.haulTrips).flat())next=Math.min(next,t.remaining/tripEfficiency(state,t,efficiency));
  for(const t of state.returningWorkers)next=Math.min(next,t);
  for(const l of state.market.locked)next=Math.min(next,l.remaining,l.expiresRemaining);
  for(const l of [...state.market.lots,...state.dock.lots])if(!l.protected)next=Math.min(next,l.remaining);
  for(const o of state.dock.orders)if(!['complete','expired'].includes(o.stage)){if(o.stage==='voyage')next=Math.min(next,o.remaining);else if(o.direction==='buy'&&o.expiresRemaining>EPS)next=Math.min(next,o.expiresRemaining);}
  for(const h of state.dock.purchaseHistory)next=Math.min(next,h.remaining);
  for(const p of state.constructionProjects)if(p.stage==='building')next=Math.min(next,p.buildRemaining/constructionEfficiency(state));
  for(const b of Object.values(state.buildings))if(b.productionBlocked&&b.fullSeconds<345600)next=Math.min(next,86400-b.fullSeconds%86400);
  if(state.premium?.expiresAt>(state.worldTimeMs||Date.now()))next=Math.min(next,(state.premium.expiresAt-(state.worldTimeMs||Date.now()))/1000);
  if(state.engagement?.activeUntil>(state.worldTimeMs||0))next=Math.min(next,(state.engagement.activeUntil-(state.worldTimeMs||0))/1000);
  return next===Infinity?Infinity:Math.max(EPS,next);
}
function expireLots(state,container,locked=false) {
  for(const l of container.filter(x=>!x.protected&&(locked?x.expiresRemaining:x.remaining)<=EPS)) {
    if(!locked){const owner=container===state.market.lots?state.market:state.dock;owner.stock[l.resource]=Math.max(0,owner.stock[l.resource]-l.amount);if(owner.dispatch)owner.dispatch[l.resource]=Math.min(owner.dispatch[l.resource],owner.stock[l.resource]);
      if(owner===state.dock){const order=state.dock.orders.find(item=>item.id===l.orderId);if(order){order.expiredAmount=(order.expiredAmount||0)+l.amount;if(order.direction==='sell')order.remainingToShip=Math.max(0,order.remainingToShip-l.amount);}}
    }
    notify(state,'goods-expired','Goods expired',`${l.amount} ${materialNames[l.resource]} expired after 24 hours.`);
  }
  return container.filter(x=>x.protected||(locked?x.expiresRemaining:x.remaining)>EPS);
}
function finishSaleLoading(state,order) {
  if(order.direction!=='sell'||order.remainingToShip>EPS||order.paid)return;
  const loaded=Math.min(order.amount,order.loaded||0),price=state.ruleset === 32?Math.ceil((GOODS[order.resource]?.price||0)*loaded-EPS):Math.floor(order.price*loaded/Math.max(1,order.amount));
  order.paid=true;order.paidCoins=price;
  if(loaded>0){state.resources.coins+=price;order.stage='voyage';order.remaining=300;notify(state,'harbor-sale','Ship departed',`Sold ${loaded} ${materialNames[order.resource]} for ${price} coins.`);}
  else order.stage='expired';
}
export function advanceLogistics(state,elapsed,efficiency=workerEfficiency(state)) {
  if(!Number.isFinite(elapsed)||elapsed<=0)return;
  let remaining=elapsed;
  promoteConstructionQueue(state);updateStorageStatus(state);
  // Event estimates deliberately use EPS as their smallest positive duration.
  // That duration must still advance the underlying clocks; otherwise a
  // near-boundary event keeps returning EPS forever during offline catch-up.
  while(remaining>0) {
    dispatchTrips(state);
    const jobs=productionJobs(state,efficiency),duration=Math.min(remaining,nextLogisticsEvent(state,efficiency));
    // Housing can change when a House finishes at this segment's end. Keep
    // each loaded carrier's starting speed, just as productionJobs snapshots
    // its workers, so new beds cannot accelerate time already spent travelling.
    let tripSpeeds = null;
    for(const id of ['warehouse','market','dock'])for(const trip of state.haulTrips[id]) {
      tripSpeeds ||= new Map();
      tripSpeeds.set(trip, tripEfficiency(state,trip,efficiency));
    }
    for(const p of [...state.constructionProjects]) {
      if(p.stage==='building'){p.buildRemaining=Math.max(0,p.buildRemaining-duration*constructionEfficiency(state));if(p.buildRemaining<=EPS)finishConstruction(state,p);}
      else if(p.stage==='transport'&&p.transportStarted)p.transportSeconds+=duration;
    }
    for(const j of jobs) {if(j.development)progressDevelopmentJob(state,j,duration);else state.buildings[j.id].workProgress[j.index]=Math.min(j.cycle,(state.buildings[j.id].workProgress[j.index]||0)+duration*j.speed);}
    state.returningWorkers=state.returningWorkers.map(t=>t-duration).filter(t=>t>EPS);
    for(const l of state.market.locked){l.remaining=Math.max(0,l.remaining-duration);l.expiresRemaining=Math.max(0,l.expiresRemaining-duration);}
    for(const l of [...state.market.lots,...state.dock.lots])if(!l.protected)l.remaining=Math.max(0,l.remaining-duration);
    state.market.locked=expireLots(state,state.market.locked,true);state.market.lots=expireLots(state,state.market.lots);state.dock.lots=expireLots(state,state.dock.lots);
    for(const l of state.market.locked.filter(l=>l.remaining<=EPS)){state.market.stock[l.resource]+=l.amount;state.market.lots.push(lot(l.resource,l.amount,l.expiresRemaining,l.milkLots?{milkLots:l.milkLots}:{}));}
    state.market.locked=state.market.locked.filter(l=>l.remaining>EPS);
    for(const o of state.dock.orders)if(!['complete','expired'].includes(o.stage)) {
      if(o.stage==='voyage') {
        o.remaining=Math.max(0,o.remaining-duration);
        if(o.remaining<=EPS){if(o.direction==='sell')o.stage='complete';else{o.stage='unloading';o.expiresRemaining=86400;notify(state,'harbor-arrival','Ship arrived',`${o.amount} ${materialNames[o.resource]} is ready for unloading.`);}}
      }else if(o.direction==='buy') {
        const previous=o.expiresRemaining;o.expiresRemaining=Math.max(0,o.expiresRemaining-duration);
        if(previous>EPS&&o.expiresRemaining<=EPS&&o.remainingToUnload>0){const lost=o.remainingToUnload;o.remainingToUnload=0;o.expiredAmount=(o.expiredAmount||0)+lost;notify(state,'goods-expired','Harbor cargo expired',`${lost} uncollected ${materialNames[o.resource]} expired 24 hours after the ship arrived.`);}
      }
    }
    state.dock.purchaseHistory=state.dock.purchaseHistory.map(h=>({...h,remaining:h.remaining-duration})).filter(h=>h.remaining>EPS);
    for(const id of ['warehouse','market','dock'])for(const trip of state.haulTrips[id]) {
      const person = residentById(state, trip.residentId);
      if (person) trip.workMultiplier = residentWorkMultiplier(state, person);
      const speed = tripSpeeds?.get(trip) ?? tripEfficiency(state,trip,efficiency);
      trip.remaining=Math.max(0,trip.remaining-duration*speed);
    }
    updateStorageStatus(state,duration);state.activeSeconds=Math.min(Number.MAX_SAFE_INTEGER,state.activeSeconds+duration);
    for(const j of jobs)if(j.development)completeDevelopmentJob(state,j,{record:(...args)=>recordEconomyOutput(state,...args)});else if(state.buildings[j.id].workProgress[j.index]>=j.cycle-EPS) {
      const b=state.buildings[j.id],r=PRODUCTION_RECIPES[j.id];
      if(!productionBlocked(state,j.id)){if(r.input)consumeMaterial(state,r.input,r.amount);b.ready++;b.workProgress[j.index]=0;recordEconomyOutput(state,'produced',r.output,1);if(r.input)state.statistics.crafted=Math.min(10000000,(state.statistics.crafted||0)+1);}
    }
    for(const id of ['warehouse','market','dock']) {
      const done=state.haulTrips[id].filter(t=>t.remaining<=EPS);state.haulTrips[id]=state.haulTrips[id].filter(t=>t.remaining>EPS);
      for(const t of done)completeTrip(state,t);
    }
    for(const order of state.dock.orders)finishSaleLoading(state,order);
    for(const order of state.dock.orders)if(order.direction==='buy'&&order.expiresRemaining<=EPS&&!['complete','expired','voyage'].includes(order.stage)&&!state.dock.lots.some(entry=>entry.orderId===order.id)&&!state.haulTrips.dock.some(trip=>trip.orderId===order.id))order.stage=order.delivered>=order.amount?'complete':'expired';
    state.market.orders=state.market.orders.filter(x=>x.amount>0);
    promoteConstructionQueue(state);updateStorageStatus(state);
    remaining=Math.max(0,remaining-duration);
  }
}

export const portPrice = (resource,direction='buy') => ['planks','food'].includes(resource)?(direction==='sell'?140:150):(direction==='sell'?40:50);
export function quoteTrade(state,action) {
  if(!state.buildings.dock.level||!workplaceUnlocked(state,'dock'))return bad('Harbor trading unlocks at Town Hall level 4.');
  const {resource,direction}=action,amount=action.amount;
  if(!materialIds(state).includes(resource)||!['buy','sell'].includes(direction)||!quantity(amount)||state.ruleset !== 32&&amount%100)return bad('Trade whole batches of 100 materials.');
  if(state.ruleset===32&&direction==='buy'&&GOODS[resource]?.legacy)return bad('Dawna żywność nie jest już dostępna w nowych zakupach. Wybierz jeden z obecnych produktów.');
  const capacity=dockCapacity(state);
  if(reservedPort(state,resource)+amount>capacity.perResource||reservedPort(state)+amount>capacity.total)return bad('Not enough harbor capacity for this order.');
  const lots=amount/100,base=portPrice(resource,direction);
  // Inflation is tracked per material in a rolling real-time three-hour window.
  const previous=direction==='buy'?state.dock.purchaseHistory.filter(h=>h.resource===resource&&h.remaining>EPS).reduce((n,h)=>n+h.lots,0):0;
  const materialQuote=state.ruleset === 32?quoteGoods(resource,amount,direction):null;
  if(materialQuote&&!materialQuote.ok)return materialQuote;
  const price=materialQuote?materialQuote.coins:direction==='buy'?Math.round(base*(lots+.1*(previous*lots+lots*(lots-1)/2))):base*lots;
  if(direction==='buy'&&state.resources.coins<price)return bad('Not enough coins for this order.');
  if(direction==='sell'&&physicalAvailableGoods(state,resource)<amount)return bad(resource==='food'?'This sale would spend the protected food reserve.':'Not enough unreserved goods in the warehouse.');
  return good('Harbor quote. The price is frozen when you confirm the order.',{resource,direction,amount,price,lots,basePrice:base,previousLots:previous});
}
export function logisticsAction(state,action,now=Date.now()) {
  if(!action||typeof action!=='object')return null;
  if(state.ruleset === 32){const development=developmentLogisticsAction(state,action);if(development)return development;}
  if(state.ruleset === 32 && ['discardGoods','discard','discardQuote'].includes(action.type)) {
    const resource=action.resource,amount=action.amount;
    if(!GOODS[resource]||!quantity(amount)||amount>physicalAvailableGoods(state,resource))return bad('Nie ma tylu niezarezerwowanych towarów ponad chronioną rezerwę.');
    const price=Math.max(1,Math.ceil(GOODS[resource].price*amount*.1-EPS));
    if(state.resources.coins<price)return bad('Brakuje monet na wyrzucenie tych towarów.');
    if(action.type!=='discardQuote'){state.resources.coins-=price;consumeMaterial(state,resource,amount);updateStorageStatus(state);}
    return good(action.type==='discardQuote'?'Koszt wyrzucenia całej partii.':'Wybrana partia została wyrzucona.',{resource,amount,price});
  }
  if(action.type==='cancelConstruction')return cancelConstruction(state,action.order??action.project??action.projectOrder);
  if (action.type === 'warehousePriority') {
    let selected;
    if (Object.hasOwn(action, 'priorities')) {
      if (!Array.isArray(action.priorities) || action.priorities.length > 3 || action.priorities.some(resource => !warehousePriorityIds(state).includes(resource)) || new Set(action.priorities).size !== action.priorities.length) return bad('Choose up to three different transport priorities.');
      selected = [...action.priorities];
    } else {
      if (!warehousePriorityIds(state).includes(action.resource)) return bad('Choose goods or Construction to prioritize.');
      selected = [...(state.warehousePriorities || [])];
      const index = selected.indexOf(action.resource);
      if (index >= 0) selected.splice(index,1);
      else if (selected.length < 3) selected.push(action.resource);
      else return bad('Only three priorities can be active. Remove one before choosing another.');
    }
    if (JSON.stringify(selected) !== JSON.stringify(state.warehousePriorities || [])) {
      state.warehousePriorities = selected;
      state.warehousePriorityCycle.position = 0;
    }
    return good(selected.length ? 'Transport priorities updated. Their ten-course distribution repeats until you change them.' : 'Transport priorities cleared. Carriers use the regular source order.');
  }
  if(action.type==='transportPriority') {
    if(action.target) {
      const target=String(action.target);
      if(!(target==='pending'||target.startsWith('producer:')&&(state.ruleset===32?developmentProducerIds(state).includes(target.slice(9)):Object.hasOwn(PRODUCTION_RECIPES,target.slice(9)))||target.startsWith('construction:')&&state.constructionProjects.some(p=>p.order===Number(target.slice(13)))))return bad('Choose a producer or construction project.');
      const values=state.logisticsPriority;const index=values.indexOf(target);
      if(action.direction===undefined){if(index>=0)values.splice(index,1);values.unshift(target);return good('Transport priority updated.');}
      if(![-1,1].includes(action.direction))return bad('Invalid priority direction.');
      if(index<0)values.push(target);
      const current=values.indexOf(target),next=current+action.direction;
      if(next<0||next>=values.length)return bad('This priority is already at the end of the list.');
      [values[current],values[next]]=[values[next],values[current]];return good('Transport priority updated.');
    }
    if(!materialIds(state).includes(action.resource)||![-1,1].includes(action.direction))return bad('Invalid transport priority change.');
    const i=state.transportPriority.indexOf(action.resource),j=i+action.direction;
    if(j<0||j>=state.transportPriority.length)return bad('This material is already at the end of the priority list.');
    [state.transportPriority[i],state.transportPriority[j]]=[state.transportPriority[j],state.transportPriority[i]];return good('Transport priority updated.');
  }
  if(action.type==='marketOrder') {
    if(!workplaceUnlocked(state,'market'))return bad('The market unlocks at Town Hall level 2.');
    const resource=action.resource,amount=action.amount;
    if(!materialIds(state).includes(resource)||!quantity(amount))return bad('Enter a whole material quantity.');
    const ordered=state.market.orders.reduce((n,o)=>n+o.amount,0);
    if(physicalAvailableGoods(state,resource)<amount)return bad(resource==='food'?'Protect the warehouse food reserve.':'Not enough unreserved goods in the warehouse.');
    if(marketUsed(state)+inboundAmount(state,'market')+ordered+amount>marketCapacity(state))return bad('Not enough market capacity for this delivery.');
    state.market.orders.push({resource,amount});return good('Market workers will carry these goods. Each delivery is locked for one hour and expires after 24 hours.');
  }
  if(action.type==='marketExchange') {
    if(!workplaceUnlocked(state,'market'))return bad('The market unlocks at Town Hall level 2.');
    const {from,to}=action,amount=action.amount,groups=state.ruleset === 32?[1,2,3].map(category=>materialIds(state).filter(id=>GOODS[id].category===category)):[['wood','stone','grain'],['planks','food']];
    if(state.ruleset===32&&GOODS[to]?.legacy)return bad('Dawna żywność nie jest już wynikiem nowych wymian. Wybierz jeden z obecnych produktów.');
    if(from===to||!groups.some(g=>g.includes(from)&&g.includes(to)))return bad('Choose different goods from the same category.');
    if(!quantity(amount)||state.ruleset !== 32&&amount%10)return bad('Exchange batches of 10 to receive 9 after the 10% margin.');
    if(state.market.stock[from]-state.market.dispatch[from]<amount)return bad('Not enough unlocked, unreserved goods in the market.');
    const output=state.ruleset === 32?Math.floor((amount*GOODS[from].price*.9+EPS)/GOODS[to].price):amount*.9;
    if(output<1||marketUsed(state)-amount+output>marketCapacity(state))return bad('Not enough market capacity for this exchange.');
    state.market.stock[from]-=amount;removeLots(state.market.lots,from,amount);state.market.stock[to]+=output;state.market.lots.push(lot(to,output));state.statistics.traded=(state.statistics.traded||0)+1;
    return good(`Exchanged ${amount} ${materialNames[from]} for ${output} ${materialNames[to]}. The new goods expire in 24 hours.`);
  }
  if(action.type==='marketDispatch') {
    const resource=action.resource,amount=action.amount;
    if(!workplaceUnlocked(state,'market')||!materialIds(state).includes(resource)||!quantity(amount))return bad('Invalid collection order.');
    if(state.market.stock[resource]-state.market.dispatch[resource]<amount)return bad('Not enough unlocked goods in the market.');
    state.market.dispatch[resource]+=amount;return good('Market workers will carry the goods back to the central warehouse.');
  }
  if(action.type==='trade') {
    const quote=quoteTrade(state,action);if(!quote.ok)return quote;
    const order={id:++state.dock.nextOrderId,direction:quote.direction,resource:quote.resource,amount:quote.amount,price:quote.price,stage:quote.direction==='buy'?'voyage':'supplying',remainingToPort:quote.direction==='sell'?quote.amount:0,remainingToUnload:quote.direction==='buy'?quote.amount:0,remainingToShip:quote.direction==='sell'?quote.amount:0,remaining:quote.direction==='buy'?300:0,expiresRemaining:86400,delivered:0,paid:false,reservationVersion:9,loaded:0,expiredAmount:0};
    if(quote.direction==='buy'){state.resources.coins-=quote.price;state.dock.purchaseHistory.push({resource:quote.resource,lots:quote.lots,remaining:10800});}
    state.dock.orders.push(order);state.statistics.traded=(state.statistics.traded||0)+1;
    notify(state,'harbor-order',quote.direction==='buy'?'Purchase confirmed':'Sale confirmed',quote.direction==='buy'?`${quote.price} coins paid. The ship arrives in 5 minutes; harbor workers unload and return the cargo to the warehouse.`:`${quote.amount} ${materialNames[quote.resource]} reserved. Harbor workers carry and load it; ${quote.price} coins arrive when the ship departs.`);
    return good(quote.direction==='buy'?`Order paid: ${quote.price} coins. Ship arrives in 5 minutes.`:`Sale reserved. Payment of ${quote.price} coins follows loading and departure.`,{orderId:order.id,price:quote.price});
  }
  return null;
}
function selectedOrders(state,action,direction) {
  const id=Number(action.order??action.orderId);
  return state.dock.orders.filter(o=>o.direction===direction&&!['complete','expired'].includes(o.stage)&&(!id||o.id===id)&&(!action.resource||o.resource===action.resource));
}
export function instantConstructionEstimate(state,project) {
  const required = project.economyTiming?.requiredWorkers || (project.starterTurbo ? 6 : 1);
  if(activeWorkerIndices(state,'warehouse').length >= (project.starterTurbo ? 6 : 1))return constructionScheduleEstimate(state,project);
  const snapshot=structuredClone(state);
  for(const person of snapshot.residents||[])if(person.workplace==='warehouse')person.workplace=null;
  snapshot.residents||=[];
  const id=Math.max(0,...snapshot.residents.map(person=>person.id||0))+1;
  for (let index = 0; index < required; index++) snapshot.residents.push({id:id+index,workplace:'warehouse',arrivalRemaining:0,returnRemaining:0,pendingRelease:false,visitGroup:null});
  snapshot.buildings.warehouse.workers=required;snapshot.buildings.warehouse.workProgress=Array(required).fill(0);
  for(const trip of snapshot.haulTrips.warehouse)trip.worker=-1;
  const target=snapshot.constructionProjects.find(item=>item.order===project.order);
  return {...constructionScheduleEstimate(snapshot,target),virtualCarrier:true};
}
function instantPlan(state,action) {
  const route=action.route,amounts=stock(state);let carrier='warehouse',project=null,orders=[],normalEstimate=null;
  const add=(resource,n)=>{amounts[resource]+=Math.max(0,n||0);};
  if(route==='producer') {
    if(state.ruleset === 32) {
      if(!developmentProducerIds(state).includes(action.building))return bad('Choose a producer.');
      const outputs=new Set(availableRecipes(state,action.building).flatMap(r=>Object.keys(r.outputs)));
      for(const resource of outputs)if(!action.resource||action.resource===resource)add(resource,state.provisions?.localStock?.[action.building]?.[resource]);
    }else {if(!Object.hasOwn(PRODUCTION_RECIPES,action.building))return bad('Choose a producer.');add(PRODUCTION_RECIPES[action.building].output,state.buildings[action.building].ready);}
  }else if(route==='construction') {
    project=state.constructionProjects.find(p=>p.order===Number(action.project??action.projectOrder)&&['transport','queued'].includes(p.stage));
    if(!project)return bad('Choose an upgrade waiting for materials.');
    for(const id of materialIds(state))add(id,Math.max(0,(project.cost[id]||0)-(project.delivered?.[id]||0)));
    normalEstimate=instantConstructionEstimate(state,project);
    if(!Number.isFinite(normalEstimate.transport))return bad(normalEstimate.reason||'The remaining delivery schedule could not be estimated.');
  }else if(route==='marketInbound') {
    carrier='market';
    for(const o of state.market.orders)if(!action.resource||o.resource===action.resource)add(o.resource,o.amount);
    if(action.resource&&action.amount!==undefined) {
      if(!materialIds(state).includes(action.resource)||!quantity(action.amount))return bad('Enter a whole material quantity.');
      amounts[action.resource]=action.amount;
    }
    for(const id of materialIds(state)){const ownReservation=state.market.orders.filter(order=>order.resource===id).reduce((sum,order)=>sum+order.amount,0);if(amounts[id]>physicalAvailableGoods(state,id)+ownReservation)return bad('Not enough goods above the protected food reserve.');}
    if(materialIds(state).reduce((n,id)=>n+amounts[id],0)+marketUsed(state)+inboundAmount(state,'market')>marketCapacity(state))return bad('Not enough market capacity.');
  }else if(route==='marketOutbound') {
    carrier='market';for(const id of materialIds(state))if(!action.resource||action.resource===id)add(id,action.amount===undefined?state.market.dispatch[id]:action.amount);
    for(const id of materialIds(state))if(amounts[id]>state.market.stock[id])return bad('Not enough unlocked market goods.');
  }else if(['dockInbound','dockLoad','dockOutbound','dockUnload'].includes(route)) {
    carrier='dock';orders=selectedOrders(state,action,route==='dockInbound'||route==='dockLoad'?'sell':'buy');
    for(const o of orders) {
      if(route==='dockInbound')add(o.resource,o.remainingToPort+state.haulTrips.dock.filter(t=>t.orderId===o.id&&t.kind==='dockInbound').reduce((n,t)=>n+t.amount,0));
      if(route==='dockLoad')add(o.resource,state.dock.lots.filter(l=>l.orderId===o.id).reduce((n,l)=>n+l.amount,0)+state.haulTrips.dock.filter(t=>t.orderId===o.id&&t.kind==='dockLoad').reduce((n,t)=>n+t.amount,0));
      if(route==='dockOutbound')add(o.resource,state.dock.lots.filter(l=>l.orderId===o.id).reduce((n,l)=>n+l.amount,0)+state.haulTrips.dock.filter(t=>t.orderId===o.id&&t.kind==='dockOutbound').reduce((n,t)=>n+t.amount,0));
      if(route==='dockUnload'&&o.stage==='unloading')add(o.resource,o.remainingToUnload+state.haulTrips.dock.filter(t=>t.orderId===o.id&&t.kind==='dockUnload').reduce((n,t)=>n+t.amount,0));
    }
  }else return bad('Choose a supported transport route.');
  const total=materialIds(state).reduce((n,id)=>n+amounts[id],0);if(!total)return bad('There are no goods waiting on this route.');
  if(['producer','marketOutbound','dockOutbound'].includes(route)) {
    const limits=warehouseLimits(state);
    const selectedIds=new Set(orders.map(order=>order.id));
    const admission=route==='dockOutbound'?{...state,haulTrips:{...state.haulTrips,dock:state.haulTrips.dock.filter(trip=>trip.kind!=='dockOutbound'||!selectedIds.has(trip.orderId))}}:state;
    const incoming=inboundAmount(admission,'warehouse');
    const protectedFood=state.ruleset === 32?0:Math.max(0,foodReserve(admission)-ordinaryStock(admission,'food')-inboundAmount(admission,'warehouse','food')-amounts.food);
    if(materialIds(state).some(id=>amounts[id]>centralRoom(admission,id))||total>limits.total-ordinaryWarehouseUsed(admission)-incoming-protectedFood)return bad('Make room in the central warehouse, including incoming cargo, before sending this whole batch.');
  }
  const capacity=haulCapacity(state,carrier),trips=materialIds(state).reduce((n,id)=>n+Math.ceil(amounts[id]/capacity),0);
  return good('Instant transport quote.',{quantities:amounts,capacity,trips,route,carrier,project,orders,...(normalEstimate?{normalTransport:normalEstimate.transport,normalBuilding:constructionBuildingSeconds(project,project.transportSeconds+normalEstimate.transport),virtualCarrier:normalEstimate.virtualCarrier===true}:{})});
}
export function quoteInstantTransport(state,action) {
  const result=instantPlan(state,action);
  if(!result.ok)return result;
  const {project,orders,...publicQuote}=result;return publicQuote;
}
export function instantTransport(state,action) {
  const plan=instantPlan(state,action);if(!plan.ok)return plan;
  const {route,quantities,project,orders}=plan;
  if(route==='producer') {if(state.ruleset === 32){for(const[resource,amount]of Object.entries(quantities))if(amount>0){const cargo=takeLocalGoods(state,action.building,resource,amount);completeTrip(state,{kind:'producer',producer:action.building,resource,amount:cargo.amount,milkLots:cargo.milkLots});}}else {state.buildings[action.building].ready=0;receiveMaterials(state,quantities,{bonus:false});}}
  else if(route==='construction') {
    const fullCost=Object.fromEntries(materialIds(state).map(id=>[id,project.cost[id]||0]));
    for(const id of materialIds(state))consumeMaterial(state,id,project.reservedMaterials?.[id]||0);
    state.haulTrips.warehouse=state.haulTrips.warehouse.filter(t=>t.projectOrder!==project.order);
    project.remainingMaterials=stock(state);project.reservedMaterials=stock(state);project.delivered=fullCost;project.goodsRemaining=0;project.transportSeconds+=plan.normalTransport;project.transportStarted=true;project.buildRemaining=constructionBuildingSeconds(project);project.instantTransport=true;
    if(project.stage==='transport')startBuilding(state,project);
  }else if(route==='marketInbound') {
    for(const id of materialIds(state))if(quantities[id]) {
      const milkLots=state.ruleset === 32?milkCargoFromCentral(state,id,quantities[id],(resource,n)=>consumeMaterial(state,resource,n)):[];if(state.ruleset !== 32)consumeMaterial(state,id,quantities[id]);let left=quantities[id];
      for(const o of state.market.orders.filter(o=>o.resource===id)){const used=Math.min(left,o.amount);o.amount-=used;left-=used;}
      state.market.locked.push({resource:id,amount:quantities[id],remaining:3600,expiresRemaining:86400,...(id==='rawMilk'?{milkLots}:{})});
    }
    state.market.orders=state.market.orders.filter(o=>o.amount);
  }else if(route==='marketOutbound') {
    for(const id of materialIds(state))if(quantities[id]){
      const unreserved=Math.max(0,state.market.stock[id]-state.market.dispatch[id]);
      const fulfilledReservation=action.amount===undefined?quantities[id]:Math.max(0,quantities[id]-unreserved);
      state.market.stock[id]-=quantities[id];
      state.market.dispatch[id]=Math.max(0,state.market.dispatch[id]-fulfilledReservation);
      const milkLots=[];removeLots(state.market.lots,id,quantities[id],undefined,milkLots);
      if(state.ruleset === 32)completeTrip(state,{kind:'marketOutbound',resource:id,amount:quantities[id],milkLots});
    }if(state.ruleset !== 32)receiveMaterials(state,quantities,{bonus:false});
  }else {
    for(const o of orders) {
      const matches=t=>t.orderId===o.id&&t.kind===route;
      const carriedMilkLots=state.haulTrips.dock.filter(matches).flatMap(t=>(t.milkLots||[]).map(l=>({...l})));
      const carried=state.haulTrips.dock.filter(matches).reduce((n,t)=>n+t.amount,0);
      state.haulTrips.dock=state.haulTrips.dock.filter(t=>!matches(t));
      if(route==='dockInbound'||route==='dockUnload') {
        const unpicked=route==='dockInbound'?o.remainingToPort:o.remainingToUnload;
        const amount=unpicked+carried;if(!amount)continue;
        let milkLots=carriedMilkLots;
        if(route==='dockInbound'){if(state.ruleset === 32)milkLots.push(...milkCargoFromCentral(state,o.resource,o.remainingToPort,(resource,n)=>consumeMaterial(state,resource,n)));else consumeMaterial(state,o.resource,o.remainingToPort);o.remainingToPort=0;}else o.remainingToUnload=0;
        const deadline=route==='dockInbound'?86400:o.expiresRemaining;
        const accepted=deadline>EPS?amount:carried;
        if(accepted){state.dock.stock[o.resource]+=accepted;state.dock.lots.push(lot(o.resource,accepted,deadline,{orderId:o.id,direction:o.direction,...(o.resource==='rawMilk'?{milkLots}:{}),...(route==='dockUnload'?{protected:true}:{})}));}
        if(accepted<amount){const expired=amount-accepted;o.expiredAmount=(o.expiredAmount||0)+expired;notify(state,'goods-expired','Harbor cargo expired',`${expired} ${materialNames[o.resource]} expired after its purchase deadline.`);}
        o.stage=route==='dockInbound'?'loading':'collecting';
      }else {
        const amount=state.dock.lots.filter(l=>l.orderId===o.id).reduce((n,l)=>n+l.amount,0)+carried;if(!amount)continue;
        const fromPort=amount-carried,milkLots=carriedMilkLots;state.dock.stock[o.resource]-=fromPort;removeLots(state.dock.lots,o.resource,fromPort,o.id,milkLots);
        if(route==='dockOutbound'){if(state.ruleset === 32)completeTrip(state,{kind:'dockOutbound',resource:o.resource,amount,milkLots,orderId:o.id});else {receiveMaterials(state,{[o.resource]:amount},{bonus:false});o.delivered+=amount;if(o.delivered>=o.amount)o.stage='complete';}}
        else {o.remainingToShip-=amount;o.loaded=(o.loaded||0)+amount;finishSaleLoading(state,o);}
      }
    }
  }
  updateStorageStatus(state);return good('Goods transported instantly.',{quantities,trips:plan.trips});
}
