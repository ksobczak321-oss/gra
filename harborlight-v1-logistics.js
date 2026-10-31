// Physical goods and event-based logistics. Durations are real elapsed seconds,
// including catch-up after the browser is closed.
import { productionMultiplier, beginLighthouseBonus } from './harborlight-v1-residents.js?v=frontend-v24-2';
import { roadSpeedMultiplier, roadCapacityMultiplier } from './harborlight-v1-leisure.js?v=frontend-v24-2';
import { centralReserved, centralAvailable, ordinaryStock, bonusStock, ordinaryWarehouseUsed, normalizeBonusMaterials, grantBonusMaterials, consumeMaterial, spendMaterials } from './harborlight-v1-inventory.js?v=frontend-v24-2';
import { activePlayMultiplier } from './harborlight-v1-progression.js?v=frontend-v24-2';
import { eventTransportMultiplier, eventProductionMultiplier } from './harborlight-v1-events.js?v=frontend-v24-2';
export { centralReserved, centralAvailable, ordinaryStock, bonusStock, ordinaryWarehouseUsed, grantBonusMaterials, consumeMaterial, spendMaterials } from './harborlight-v1-inventory.js?v=frontend-v24-2';
export const workerEfficiency = productionMultiplier;
// Paths improve cargo courses, independently of production and resident walks.
export const transportEfficiency = (state, efficiency = workerEfficiency(state)) => efficiency * roadSpeedMultiplier(state) * activePlayMultiplier(state) * eventTransportMultiplier(state);
export const MATERIAL_IDS = ['wood', 'stone', 'grain', 'food', 'planks'];
export const WAREHOUSE_PRIORITY_IDS = [...MATERIAL_IDS, 'construction'];
export const PRODUCTION_RECIPES = {
  farm: { output: 'grain' }, lumber: { output: 'wood' }, quarry: { output: 'stone' },
  sawmill: { output: 'planks', input: 'wood', amount: 2 },
  windmill: { output: 'food', input: 'grain', amount: 2 }
};
const EPS = 1e-7;
const clamp = (n, min = 0, max = 10000000) => Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
const whole = n => Math.floor(clamp(n));
const stock = () => Object.fromEntries(MATERIAL_IDS.map(id => [id, 0]));
const good = (message, extra = {}) => ({ ok: true, message, ...extra });
const bad = message => ({ ok: false, message });
const quantity = n => Number.isSafeInteger(n) && n > 0;
const buildingNames = { farm: 'Farm', lumber: 'Lumber Camp', quarry: 'Quarry', windmill: 'Windmill', sawmill: 'Sawmill', warehouse: 'Warehouse', market: 'Market', dock: 'Harbor', house: 'House', townhall: 'Town Hall', chapel: 'Chapel', lighthouse: 'Lighthouse' };
const materialNames = { wood: 'wood', stone: 'stone', grain: 'grain', food: 'food', planks: 'planks' };
// Local storage belongs to the producing building, independently of Town Hall.
export const producerCapacity = (state, id = 'farm', level = state.buildings[id]?.level || 0) => 200 * Math.max(0, level);
export const PRODUCTION_RATE_VERSION = 2;
// The base economy was doubled in v15. Temporary bonuses still multiply this
// rate; staffing, meals, taxes and five-minute carrier clocks are independent.
export const productionRate = (state, id) => state.buildings[id]?.level === 1 ? 20 : state.buildings[id]?.level > 1 ? 2 * (state.buildings[id].level + 10) : 0;
export const WAREHOUSE_CAP_LEVEL = 24;
export const effectiveWarehouseLevel = state => Math.min(WAREHOUSE_CAP_LEVEL, state.buildings.warehouse.level || 0);
export const foodReserve = state => 50 * effectiveWarehouseLevel(state);
export const availableGoods = (state, id) => Math.max(0, Math.floor(centralAvailable(state, id) - (id === 'food' ? foodReserve(state) : 0)));
export const forecastAvailableGoods = availableGoods;
export const haulCapacity = (state, id = 'warehouse') => Math.max(1, Math.floor(Math.floor(120 * 1.1 ** Math.max(0, (id === 'warehouse' ? effectiveWarehouseLevel(state) : state.buildings[id]?.level || 1) - 1)) * roadCapacityMultiplier(state)));
export const workplaceUnlocked = (state, id) => state.buildings.townhall.level >= (id === 'market' ? 2 : id === 'dock' ? 4 : 1);
export function activeWorkerIndices(state, id) {
  const people = Array.isArray(state.residents) ? state.residents.filter(person => person.workplace === id) : [];
  if (!people.length && !Array.isArray(state.residents)) return Array.from({ length: state.buildings[id]?.workers || 0 }, (_, index) => index);
  return people.flatMap((person, index) => person.pendingRelease || (person.arrivalRemaining || 0) > EPS || person.visitGroup || person.visiting || (person.returnRemaining || 0) > EPS ? [] : [index]);
}
export function warehouseLimits(state) {
  const factor = state.buildings.warehouse.level ? 1.5 ** (state.buildings.warehouse.level - 1) : 0;
  return { perResource: Math.floor(Math.min(10000000, 1000 * factor)), total: Math.floor(Math.min(40000000, 4000 * factor)) };
}
export const warehouseUsed = state => MATERIAL_IDS.reduce((sum, id) => sum + (state.resources[id] || 0), 0);
export function inventoryOverfull(state) {
  const limits = warehouseLimits(state);
  return warehouseUsed(state) > limits.total || MATERIAL_IDS.some(id => (state.resources[id] || 0) > limits.perResource);
}
export function stockRoom(state, id) {
  if (!MATERIAL_IDS.includes(id)) return 0;
  const limits = warehouseLimits(state);
  const foodSpace = id === 'food' ? 0 : Math.max(0, foodReserve(state) - ordinaryStock(state,'food'));
  return Math.max(0, Math.floor(Math.min(limits.perResource - ordinaryStock(state, id), limits.total - ordinaryWarehouseUsed(state) - foodSpace)));
}
export const marketCapacity = state => Math.floor(Math.min(10000000, 1000 * 1.5 ** Math.max(0, state.buildings.market.level - 1)));
export const marketUsed = state => MATERIAL_IDS.reduce((sum, id) => sum + (state.market?.stock[id] || 0), 0) + (state.market?.locked || []).reduce((sum, lot) => sum + lot.amount, 0);
export function dockCapacity(state) {
  const factor = 1.5 ** Math.max(0, state.buildings.dock.level - 1);
  return { perResource: Math.floor(Math.min(10000000, 1000 * factor)), total: Math.floor(Math.min(40000000, 4000 * factor)) };
}
export const dockUsed = state => MATERIAL_IDS.reduce((sum, id) => sum + (state.dock?.stock[id] || 0), 0);
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
  const populationCapacity = previous * 24;
  const populationRequired = target >= 4 ? Math.ceil(populationCapacity * .75) : 0;
  const populationCurrent = Math.max(0, Math.floor(Number(state.population) || 0));
  return { ok: populationCurrent >= populationRequired, populationRequired, populationCurrent,
    populationCapacity, populationLevel: previous, targetLevel: target };
}
export const constructionBuildFactor = project => project.building === 'lighthouse' ? 4 : project.building === 'chapel' ? 3 * Math.max(1, project.targetLevel - 1) : 1;
function projectGoods(project) {
  if (!project.remainingMaterials) {
    project.remainingMaterials = Object.fromEntries(MATERIAL_IDS.map(id => [id, whole(project.cost?.[id])]));
    // Legacy projects recorded only an aggregate remaining quantity. Preserve
    // that quantity deterministically without recreating already delivered goods.
    let trim = Math.max(0, MATERIAL_IDS.reduce((n,id) => n + project.remainingMaterials[id], 0) - (project.goodsRemaining ?? project.goodsTotal ?? 0));
    for (const id of MATERIAL_IDS) { const used = Math.min(trim, project.remainingMaterials[id]); project.remainingMaterials[id] -= used; trim -= used; }
  }
  if (!project.delivered) project.delivered = Object.fromEntries(MATERIAL_IDS.map(id => [id, Math.max(0, whole(project.cost?.[id]) - project.remainingMaterials[id])]));
  return project.remainingMaterials;
}
export function constructionEstimate(state, projectOrCost, buildingId) {
  const project = projectOrCost?.cost ? projectOrCost : { cost: projectOrCost || {}, building: buildingId || 'house', targetLevel: (state.buildings[buildingId || 'house']?.level || 0) + 1 };
  const capacity = haulCapacity(state), crew = activeWorkerIndices(state, 'warehouse').length;
  const required = project.stage === 'building' ? stock() : project.remainingMaterials || project.cost;
  const queuedTrips = MATERIAL_IDS.reduce((n,id) => n + Math.ceil((required?.[id] || 0) / capacity), 0);
  const inFlight = (state.haulTrips?.warehouse || []).filter(t => t.kind === 'construction' && t.projectOrder === project.order);
  const trips = queuedTrips + inFlight.length;
  const waves = crew ? Math.ceil(trips / crew) : trips ? Infinity : 0;
  const efficiency = transportEfficiency(state);
  const available = activeWorkerIndices(state, 'warehouse').map(index => ((state.haulTrips?.warehouse || []).find(t => t.worker === index)?.remaining || 0) / efficiency);
  let transport = inFlight.reduce((end,t) => Math.max(end,t.remaining / efficiency),0);
  for (let index=0; index<queuedTrips; index++) {
    if (!available.length) { transport=Infinity; break; }
    const first=available.indexOf(Math.min(...available));
    available[first]+=300 / efficiency;
    transport=Math.max(transport,available[first]);
  }
  const building = project.stage === 'building' ? project.buildRemaining : ((project.transportSeconds || 0) + transport) * constructionBuildFactor(project);
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
  if (existing?.stage === 'building') return { ...baseline, transport: 0, building: existing.buildRemaining, total: existing.buildRemaining, queueWait: 0, completionTotal: existing.buildRemaining, scheduled: true, reason: '' };
  const clock = () => globalThis.performance?.now?.() ?? Date.now();
  const started = clock();
  const snapshot = structuredClone(state);
  const efficiency = workerEfficiency(state);
  let target = existing ? snapshot.constructionProjects.find(project => project.order === existing.order) : null;
  if (!target) {
    const cost = Object.fromEntries([...MATERIAL_IDS, 'coins'].filter(resource => whole((spec?.cost || projectOrCost)?.[resource])).map(resource => [resource, whole((spec?.cost || projectOrCost)[resource])]));
    const targetLevel = spec?.targetLevel || plannedLevel(snapshot, id) + 1;
    const possibleTownLevel = Math.max(snapshot.buildings.townhall.level, ...snapshot.constructionProjects.filter(project => project.building === 'townhall').map(project => project.targetLevel));
    if (id !== 'townhall' && targetLevel > possibleTownLevel) return unavailable('Upgrade the Town Hall first.');
    // Gathering is outside this preview. Supply missing hypothetical materials
    // only in the clone and reserve them physically until carrier pickup.
    for (const resource of MATERIAL_IDS) snapshot.resources[resource] = Math.max(snapshot.resources[resource] || 0, centralReserved(snapshot, resource) + (cost[resource] || 0) + (resource === 'food' ? foodReserve(snapshot) : 0));
    const goodsTotal = MATERIAL_IDS.reduce((sum, resource) => sum + (cost[resource] || 0), 0);
    target = { building: id, targetLevel, cost, goodsTotal, goodsRemaining: goodsTotal,
      remainingMaterials: Object.fromEntries(MATERIAL_IDS.map(resource => [resource, cost[resource] || 0])), delivered: stock(),
      stage: 'queued', order: ++snapshot.constructionSequence, transportSeconds: 0, buildRemaining: 0,
      reservationVersion:9,reservedMaterials:Object.fromEntries(MATERIAL_IDS.map(resource=>[resource,cost[resource]||0])),reservedCoins:cost.coins||0 };
    snapshot.constructionProjects.push(target);
  }
  const targetOrder = target.order;
  promoteConstructionQueue(snapshot);
  if (target.stage === 'planned') return unavailable('Waiting for the planned materials or an active construction package.');
  let elapsed = 0, activeAt = null, transport = null, building = null;
  for (let events = 0; events < 2048; events++) {
    promoteConstructionQueue(snapshot);
    target = snapshot.constructionProjects.find(project => project.order === targetOrder);
    if (!target) {
      const phase = building ?? 0;
      const queueWait = activeAt ?? 0;
      return { ...baseline, transport: (transport ?? Math.max(0, elapsed - phase)) - queueWait, building: phase, total: elapsed - queueWait, queueWait, completionTotal: elapsed, scheduled: true, reason: '' };
    }
    if (['transport', 'building'].includes(target.stage) && activeAt === null) activeAt = elapsed;
    if (target.stage === 'building' && transport === null) {
      transport = elapsed; building = target.buildRemaining;
    }
    const arrivals = (snapshot.residents || []).filter(person => person.workplace && person.arrivalRemaining > EPS).map(person => person.arrivalRemaining);
    const nextArrival = arrivals.length ? Math.min(...arrivals) : Infinity;
    const next = nextLogisticsEvent(snapshot, efficiency);
    const duration = Math.min(next, nextArrival);
    if (!Number.isFinite(duration)) return unavailable(target.stage === 'planned' ? 'Waiting for the planned materials or an active construction package.' : 'Waiting for available warehouse carriers or an earlier upgrade.');
    if (!(duration > 0) || elapsed + duration > 90 * 86400 || events >= 32 && clock() - started > 35) return unavailable('The delivery schedule is too long to estimate from the current snapshot.');
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
  project.reservedMaterials ||= stock();
  project.reservedCoins = Math.max(0, project.reservedCoins || 0);
  project.reservationVersion = 9;
  if (!partial && (MATERIAL_IDS.some(id => Math.max(0, remaining[id] - (project.reservedMaterials[id] || 0)) > availableGoods(state, id)) || Math.max(0, (project.cost.coins || 0) - project.reservedCoins) > (state.resources.coins || 0))) return false;
  for (const id of MATERIAL_IDS) {
    const required = Math.max(0, remaining[id] - (project.reservedMaterials[id] || 0));
    project.reservedMaterials[id] = (project.reservedMaterials[id] || 0) + Math.min(required, availableGoods(state, id));
  }
  const coinNeed = Math.max(0, (project.cost.coins || 0) - project.reservedCoins);
  const coins = Math.min(coinNeed, state.resources.coins || 0);
  state.resources.coins -= coins; project.reservedCoins += coins;
  return MATERIAL_IDS.every(id => (project.reservedMaterials[id] || 0) >= remaining[id]) && project.reservedCoins >= (project.cost.coins || 0);
}
export function promoteConstructionQueue(state) {
  flushPendingDeliveries(state);
  const counts = constructionCounts(state);
  let slots = counts.limit - counts.active;
  for (const project of [...state.constructionProjects].sort((a, b) => a.order - b.order)) {
    projectGoods(project);
    const funded = reserveConstructionMaterials(state, project);
    if (project.stage === 'planned' && counts.premium && funded) {
      project.stage = 'queued';
      notify(state,'construction-reserved',`${buildingNames[project.building]}: materials reserved`,'The forecast supplies have reached the warehouse. The full cost is now reserved.');
    }
    if (project.stage !== 'queued' || slots <= 0 || !funded && !project.instantTransport) continue;
    if (project.targetLevel !== state.buildings[project.building].level + 1 || (project.building !== 'townhall' && project.targetLevel > state.buildings.townhall.level)) continue;
    if (state.constructionProjects.some(other => other !== project && other.building === project.building && ['transport','building'].includes(other.stage))) continue;
    project.stage=project.instantTransport&&project.goodsRemaining===0?'building':'transport'; slots--;
    notify(state,'construction-promoted',`${buildingNames[project.building]}: upgrade started`,'Reserved materials are waiting for transport.');
  }
  syncConstructionPointers(state);
}
export function cancelConstruction(state, order) {
  const project = state.constructionProjects.find(item => item.order === Number(order));
  if (!project) return bad('Choose an existing construction project.');
  const pickedUp = project.transportStarted || project.transportSeconds > EPS || (state.haulTrips?.warehouse || []).some(trip => trip.projectOrder === project.order) || MATERIAL_IDS.some(id => (project.delivered?.[id] || 0) > 0);
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
  if(id==='townhall') state.capacity=building.level*24;
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
  const limits=warehouseLimits(state);
  if(MATERIAL_IDS.some(id=>(cost[id]||0)>limits.perResource)||MATERIAL_IDS.reduce((n,id)=>n+(cost[id]||0),0)>limits.total)return Infinity;
  const crew=activeWorkerIndices(state,'warehouse').length, capacity=haulCapacity(state), efficiency=workerEfficiency(state);
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
    const workers=activeWorkerIndices(state,producer).length, rate=workers*productionRate(state,producer)*efficiency*(state.lighthouseRemaining>0?2:1)-(id==='food'?state.population:0);
    if(make&&rate<=0)return Infinity;
    time=Math.max(time,make?make/rate*3600:0);trips+=Math.ceil(missing/capacity);
    if(make&&recipe.input) {
      const upstream=Object.keys(PRODUCTION_RECIPES).find(k=>PRODUCTION_RECIPES[k].output===recipe.input), need=Math.max(0,make*recipe.amount-centralAvailable(state,recipe.input)-state.buildings[upstream].ready);
      const upstreamRate=activeWorkerIndices(state,upstream).length*productionRate(state,upstream)*efficiency;
      if(need&&!upstreamRate)return Infinity;
      time=Math.max(time,need/upstreamRate*3600||0);trips+=Math.ceil(need/capacity);
    }
  }
  return Math.max(time,crew?Math.ceil(trips/crew)*300/transportEfficiency(state,efficiency):0);
}
export function flushPendingDeliveries(state) {
  normalizeBonusMaterials(state);
  state.pendingDeliveries ||= stock();
  let moved = 0;
  for (const id of ['food', ...MATERIAL_IDS.filter(resource => resource !== 'food')]) {
    const accepted = Math.min(state.pendingDeliveries[id] || 0, centralRoom(state, id));
    if (accepted <= 0) continue;
    state.resources[id] = (state.resources[id] || 0) + accepted;
    state.pendingDeliveries[id] -= accepted; moved += accepted;
  }
  return moved;
}
export function receiveMaterials(state,values,{overflowToPending=true,bonus=true}={}) {
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
  for(let i=0;i<Math.max(0,oldCount-newCount);i++)state.returningWorkers.push(300);
}
export function notify(state,kind,title,message) {
  state.notifications ||= [];
  state.notificationSequence=(state.notificationSequence||0)+1;
  state.notifications.unshift({id:state.notificationSequence,kind,title,message,at:state.activeSeconds||0,read:false});
  state.notifications.length=Math.min(100,state.notifications.length);
}
export function productionBlocked(state,id) {
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
  for(const [id,r] of Object.entries(PRODUCTION_RECIPES)) {
    const b=state.buildings[id],full=b.ready>=producerCapacity(state,id),blocked=productionBlocked(state,id);
    if(full&&!b.storageFull)notify(state,'storage-full',`${buildingNames[id]}: storage is full`,`Storage full: ${materialNames[r.output]}. Production is waiting for transport.`);
    b.fullSeconds=blocked?Math.min(432000,(b.productionBlocked?b.fullSeconds||0:0)+elapsed):0;
    b.productionBlocked=blocked;b.storageFull=full;
  }
  for(const [id,full,label] of [['warehouse',ordinaryWarehouseUsed(state)>=limits.total,'The central warehouse is full'],['market',workplaceUnlocked(state,'market')&&marketUsed(state)>=marketCapacity(state),'The market is full'],['dock',workplaceUnlocked(state,'dock')&&dockUsed(state)>=dockCapacity(state).total,'The harbor is full']]) {
    const b=state.buildings[id];if(full&&!b.storageFull)notify(state,'storage-full',label,'Use or collect goods, or upgrade this building.');b.storageFull=full;
  }
  state.fullResources ||= {};
  for(const id of MATERIAL_IDS) {
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
function normalizeLots(values, { locked = false, protectedCargo = false } = {}) {
  return (Array.isArray(values) ? values : []).filter(x => x && MATERIAL_IDS.includes(x.resource) && whole(x.amount) > 0).slice(0,10000).map(x => ({ resource:x.resource,amount:whole(x.amount),remaining:clamp(x.remaining,0,locked?3600:86400),...(locked?{expiresRemaining:clamp(x.expiresRemaining??86400,0,86400)}:{}),...(x.orderId?{orderId:whole(x.orderId)}:{}),...(x.direction?{direction:x.direction}:{}),...(protectedCargo&&x.protected===true&&x.direction==='buy'?{protected:true}:{}) }));
}
const liveCargo = entry => entry.protected === true || entry.remaining > EPS;
function removeLots(lots,resource,amount,orderId) {
  let left=amount;
  for(const entry of lots.filter(x=>x.resource===resource&&liveCargo(x)&&(orderId===undefined||x.orderId===orderId)).sort((a,b)=>a.remaining-b.remaining)) {
    const moved=Math.min(left,entry.amount);entry.amount-=moved;left-=moved;if(left<=0)break;
  }
  for(let i=lots.length-1;i>=0;i--)if(!lots[i].amount)lots.splice(i,1);
  return amount-left;
}
function inboundAmount(state,destination,resource) {
  return Object.values(state.haulTrips||{}).flat().filter(t=>['producer','pending','marketOutbound','dockOutbound'].includes(t.kind)?destination==='warehouse':['marketInbound'].includes(t.kind)?destination==='market':['dockInbound','dockUnload'].includes(t.kind)?destination==='dock':false).filter(t=>!resource||t.resource===resource).reduce((n,t)=>n+t.amount,0);
}
export function centralRoom(state,resource) {
  const limits=warehouseLimits(state), inbound=inboundAmount(state,'warehouse');
  const protectedFoodSpace = resource === 'food' ? 0 : Math.max(0, foodReserve(state) - ordinaryStock(state,'food') - inboundAmount(state, 'warehouse', 'food'));
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
export function normalizeLogisticsState(state,raw) {
  const legacyBonusInventory = raw.bonusInventoryVersion !== 1;
  const savedBonus = { ...(raw.bonusMaterials || {}) };
  const savedPending = Object.fromEntries(MATERIAL_IDS.map(id => [id, Math.floor(clamp(raw.pendingDeliveries?.[id],0,Number.MAX_SAFE_INTEGER))]));
  const savedRewards = Object.fromEntries(MATERIAL_IDS.map(id => [id, Math.floor(clamp(raw.rewardBuffer?.[id],0,Number.MAX_SAFE_INTEGER))]));
  // Preserve the completed fraction of a pre-v15 unit, rather than clamp its
  // old seconds into the now shorter cycle and award a unit on reload. Capture
  // the marker before writing because callers may pass state as raw too.
  const legacyProductionProgress = raw.productionRateVersion !== PRODUCTION_RATE_VERSION;
  state.productionRateVersion = PRODUCTION_RATE_VERSION;
  state.activeSeconds=clamp(raw.activeSeconds,0,Number.MAX_SAFE_INTEGER);
  state.constructionSequence=whole(raw.constructionSequence);
  state.pendingDeliveries=legacyBonusInventory?stock():savedPending;
  state.returningWorkers=Array.isArray(raw.returningWorkers)?raw.returningWorkers.filter(x=>Number.isFinite(x)&&x>0).slice(0,state.population).map(x=>clamp(x,0,300)):[];
  const order=Array.isArray(raw.transportPriority)?raw.transportPriority.filter(id=>MATERIAL_IDS.includes(id)):[];
  state.transportPriority=[...new Set([...order,...MATERIAL_IDS])];
  state.logisticsPriority=Array.isArray(raw.logisticsPriority)?[...new Set(raw.logisticsPriority.filter(x=>typeof x==='string').slice(0,100))]:[];
  const selected = Array.isArray(raw.warehousePriorities) ? raw.warehousePriorities : state.logisticsPriority.flatMap(target => target.startsWith('producer:') ? [PRODUCTION_RECIPES[target.slice(9)]?.output] : []);
  state.warehousePriorities = [...new Set(selected.filter(id => WAREHOUSE_PRIORITY_IDS.includes(id)))].slice(0,3);
  state.warehousePriorityCycle = {
    position: whole(raw.warehousePriorityCycle?.position) % 10,
    seed: (Math.floor(clamp(raw.warehousePriorityCycle?.seed,0,0xffffffff)) >>> 0) || ((Math.floor(state.worldTimeMs || 0) ^ 0x6d2b79f5) >>> 0) || 1
  };
  state.market={stock:stock(),locked:normalizeLots(raw.market?.locked,{locked:true}),lots:normalizeLots(raw.market?.lots),orders:[],dispatch:stock()};
  for(const id of MATERIAL_IDS) { state.market.stock[id]=whole(raw.market?.stock?.[id]);state.market.dispatch[id]=Math.min(state.market.stock[id],whole(raw.market?.dispatch?.[id])); }
  state.market.orders=(Array.isArray(raw.market?.orders)?raw.market.orders:[]).filter(x=>x&&MATERIAL_IDS.includes(x.resource)&&whole(x.amount)>0).slice(0,100).map(x=>({resource:x.resource,amount:whole(x.amount)}));
  for(const id of MATERIAL_IDS) {
    const represented=state.market.lots.filter(x=>x.resource===id).reduce((n,x)=>n+x.amount,0);
    if(represented<state.market.stock[id])state.market.lots.push(lot(id,state.market.stock[id]-represented));
  }
  state.dock={stock:stock(),lots:normalizeLots(raw.dock?.lots,{protectedCargo:true}),orders:[],purchaseHistory:[],nextOrderId:whole(raw.dock?.nextOrderId)};
  for(const id of MATERIAL_IDS)state.dock.stock[id]=whole(raw.dock?.stock?.[id]);
  for(const x of Array.isArray(raw.dock?.orders)?raw.dock.orders:[]) {
    if(!x||!MATERIAL_IDS.includes(x.resource)||!['buy','sell'].includes(x.direction)||!quantity(x.amount)||x.amount%100)continue;
    const normalized={id:whole(x.id)||++state.dock.nextOrderId,direction:x.direction,resource:x.resource,amount:whole(x.amount),price:clamp(x.price,0,Number.MAX_SAFE_INTEGER),stage:['voyage','unloading','collecting','supplying','loading','complete','expired'].includes(x.stage)?x.stage:'expired',remainingToPort:whole(x.remainingToPort),remainingToUnload:whole(x.remainingToUnload),remainingToShip:whole(x.remainingToShip),remaining:clamp(x.remaining,0,300),expiresRemaining:clamp(x.expiresRemaining??86400,0,86400),delivered:whole(x.delivered),paid:x.paid===true,reservationVersion:9};
    normalized.expiredAmount=whole(x.expiredAmount);normalized.loaded=whole(x.loaded??Math.max(0,normalized.amount-normalized.remainingToShip-normalized.expiredAmount));
    if(x.paidCoins!==undefined)normalized.paidCoins=whole(x.paidCoins);
    if(x.reservationVersion!==9&&normalized.direction==='sell'&&!['complete','expired'].includes(normalized.stage))state.resources[normalized.resource]+=normalized.remainingToPort;
    state.dock.nextOrderId=Math.max(state.dock.nextOrderId,normalized.id);state.dock.orders.push(normalized);
  }
  state.dock.orders=state.dock.orders.slice(-100);
  state.dock.purchaseHistory=(Array.isArray(raw.dock?.purchaseHistory)?raw.dock.purchaseHistory:[]).filter(x=>x&&MATERIAL_IDS.includes(x.resource)&&whole(x.lots)&&x.remaining>0).slice(-10000).map(x=>({resource:x.resource,lots:whole(x.lots),remaining:clamp(x.remaining,0,10800)}));
  state.haulTrips={warehouse:[],market:[],dock:[]};
  const kinds=['producer','pending','construction','marketInbound','marketOutbound','dockInbound','dockLoad','dockUnload','dockOutbound'];
  for(const id of Object.keys(state.haulTrips))for(const t of Array.isArray(raw.haulTrips?.[id])?raw.haulTrips[id]:[]) {
    if(!t||!kinds.includes(t.kind)||!MATERIAL_IDS.includes(t.resource)||!whole(t.amount))continue;
    state.haulTrips[id].push({worker:Number.isInteger(t.worker)&&t.worker>=-1?t.worker:0,remaining:clamp(t.remaining,0,300),resource:t.resource,amount:whole(t.amount),kind:t.kind,...(Number.isSafeInteger(t.residentId)?{residentId:t.residentId}:{}),...(t.producer&&PRODUCTION_RECIPES[t.producer]?{producer:t.producer}:{}),...(t.projectOrder?{projectOrder:whole(t.projectOrder)}:{}),...(t.orderId?{orderId:whole(t.orderId)}:{})});
  }
  state.notifications=(Array.isArray(raw.notifications)?raw.notifications:[]).slice(0,100).filter(n=>n&&typeof n.title==='string'&&typeof n.message==='string').map(n=>({id:whole(n.id),kind:String(n.kind||'info').slice(0,40),title:translateSavedNotificationText(n.title.slice(0,150)),message:translateSavedNotificationText(n.message.slice(0,800)),at:clamp(n.at,0,Number.MAX_SAFE_INTEGER),read:n.read===true,...(typeof n.titlePl==='string'?{titlePl:n.titlePl.slice(0,150)}:{}),...(typeof n.messagePl==='string'?{messagePl:n.messagePl.slice(0,800)}:{}),...(typeof n.worldEventId==='string'?{worldEventId:n.worldEventId.slice(0,80)}:{})}));
  state.notificationSequence=Math.max(whole(raw.notificationSequence),...state.notifications.map(n=>n.id),0);
  state.fullResources=Object.fromEntries(MATERIAL_IDS.map(id=>[id,raw.fullResources?.[id]===true]));
  for(const [id,b] of Object.entries(state.buildings)) {
    const cycle=PRODUCTION_RECIPES[id]?3600/Math.max(1,productionRate(state,id)):300;
    const progressScale = legacyProductionProgress && PRODUCTION_RECIPES[id] ? 0.5 : 1;
    b.workProgress=Array.from({length:b.workers},(_,i)=>clamp(raw.buildings?.[id]?.workProgress?.[i] * progressScale,0,cycle));
    b.storageFull=raw.buildings?.[id]?.storageFull===true;b.productionBlocked=raw.buildings?.[id]?.productionBlocked===true;b.fullSeconds=clamp(raw.buildings?.[id]?.fullSeconds,0,432000);
  }
  state.premium={...(raw.premium||{}),expiresAt:clamp(raw.premium?.expiresAt,0,Number.MAX_SAFE_INTEGER)};
  const levels=Object.fromEntries(Object.entries(state.buildings).map(([id,b])=>[id,b.level]));state.constructionProjects=[];
  for(const x of [...(Array.isArray(raw.constructionProjects)?raw.constructionProjects:[])].sort((a,b)=>(a?.order||0)-(b?.order||0))) {
    if(!x||!buildingNames[x.building]||!['transport','building','queued','planned'].includes(x.stage)||x.targetLevel!==levels[x.building]+1||x.targetLevel>100)continue;
    const cost=Object.fromEntries([...MATERIAL_IDS,'coins'].filter(id=>whole(x.cost?.[id])).map(id=>[id,whole(x.cost[id])]));
    const p={...x,building:x.building,targetLevel:x.targetLevel,cost,goodsTotal:whole(x.goodsTotal),goodsRemaining:whole(x.goodsRemaining),transportSeconds:clamp(x.transportSeconds,0,Number.MAX_SAFE_INTEGER),buildRemaining:clamp(x.buildRemaining,0,Number.MAX_SAFE_INTEGER),stage:x.stage,order:whole(x.order)||++state.constructionSequence};
    if(x.remainingMaterials)p.remainingMaterials=Object.fromEntries(MATERIAL_IDS.map(id=>[id,whole(x.remainingMaterials[id])]));
    if(x.delivered)p.delivered=Object.fromEntries(MATERIAL_IDS.map(id=>[id,whole(x.delivered[id])]));
    projectGoods(p);
    p.reservationVersion=9;
    p.reservedCoins=whole(x.reservedCoins ?? (x.stage === 'planned' ? 0 : cost.coins || 0));
    p.reservedMaterials=Object.fromEntries(MATERIAL_IDS.map(id=>[id,x.reservationVersion===9?Math.min(p.remainingMaterials[id],whole(x.reservedMaterials?.[id])):x.stage==='planned'?0:p.remainingMaterials[id]]));
    if(x.reservationVersion!==9&&x.stage!=='planned')for(const id of MATERIAL_IDS)state.resources[id]+=p.reservedMaterials[id];
    p.transportStarted=x.transportStarted===true||p.transportSeconds>EPS||MATERIAL_IDS.some(id=>p.delivered[id]>0)||state.haulTrips.warehouse.some(trip=>trip.projectOrder===p.order);
    state.constructionSequence=Math.max(state.constructionSequence,p.order);state.constructionProjects.push(p);levels[p.building]=p.targetLevel;
  }
  normalizeBonusMaterials(state,{bonusMaterials:savedBonus});
  grantBonusMaterials(state,Object.fromEntries(MATERIAL_IDS.map(id=>[id,(legacyBonusInventory?savedPending[id]:0)+savedRewards[id]])));
  state.rewardBuffer=stock();
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
function chooseWarehouseJob(state) {
  const sources=[];
  for(const resource of state.transportPriority) {
    const room=centralRoom(state,resource);if(!room)continue;
    for(const [producer,r] of Object.entries(PRODUCTION_RECIPES))if(r.output===resource&&state.buildings[producer].ready>0)sources.push({kind:'producer',producer,resource,available:Math.min(room,state.buildings[producer].ready),priority:state.logisticsPriority.indexOf(`producer:${producer}`)});
  }
  if(state.resources.food<foodReserve(state)) {
    const urgent=sources.find(s=>s.resource==='food');if(urgent)return urgent;
  }
  const project = [...state.constructionProjects].filter(item=>item.stage==='transport'&&MATERIAL_IDS.some(resource=>(projectGoods(item)[resource]||0)>0)).sort((a,b)=>a.order-b.order)[0];
  if(project) {
    const remaining=projectGoods(project);
    for (const resource of state.transportPriority) if (remaining[resource] > 0) sources.push({kind:'construction',projectOrder:project.order,resource,available:Math.min(remaining[resource],project.reservedMaterials?.[resource]||0,state.resources[resource]||0),priority:state.logisticsPriority.indexOf(`construction:${project.order}`)});
  }
  if (!sources.length) return null;
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
  const amount=Math.floor(Math.min(source.available,haulCapacity(state,id)));if(!amount)return false;
  if(source.kind==='producer')state.buildings[source.producer].ready-=amount;
  if(source.kind==='pending')state.pendingDeliveries[source.resource]-=amount;
  if(source.kind==='construction') {
    const project=state.constructionProjects.find(p=>p.order===source.projectOrder);
    projectGoods(project)[source.resource]-=amount;
    project.reservedMaterials[source.resource]-=amount;
    consumeMaterial(state,source.resource,amount);
    project.transportStarted=true;
  }
  if(source.kind==='marketInbound') {
    const order=state.market.orders.find(x=>x.resource===source.resource&&x.amount>0);order.amount-=amount;consumeMaterial(state,source.resource,amount);
  }
  if(source.kind==='marketOutbound') {state.market.stock[source.resource]-=amount;state.market.dispatch[source.resource]-=amount;removeLots(state.market.lots,source.resource,amount);}
  const order=source.orderId?state.dock.orders.find(o=>o.id===source.orderId):null;
  if(source.kind==='dockInbound'){order.remainingToPort-=amount;consumeMaterial(state,source.resource,amount);}
  if(source.kind==='dockUnload')order.remainingToUnload-=amount;
  if(['dockLoad','dockOutbound'].includes(source.kind)){state.dock.stock[source.resource]-=amount;removeLots(state.dock.lots,source.resource,amount,source.orderId);}
  const resident=(state.residents||[]).filter(person=>person.workplace===id)[index];
  state.haulTrips[id].push({worker:index,...(resident?{residentId:resident.id}:{}),remaining:300,kind:source.kind,resource:source.resource,amount,...(source.producer?{producer:source.producer}:{}),...(source.projectOrder?{projectOrder:source.projectOrder}:{}),...(source.orderId?{orderId:source.orderId}:{})});
  if (id === 'warehouse') state.warehousePriorityCycle.position = (state.warehousePriorityCycle.position + 1) % 10;
  return true;
}
export function warehouseCarrierJobs(state) {
  const trips = state.haulTrips?.warehouse || [];
  const efficiency = transportEfficiency(state);
  const describeTrip = trip => ({
    resource: trip.resource, amount: trip.amount,
    from: trip.kind === 'producer' ? trip.producer : trip.kind === 'pending' ? 'pending' : 'warehouse',
    to: trip.kind === 'construction' ? state.constructionProjects.find(project => project.order === trip.projectOrder)?.building || 'construction' : 'warehouse',
    remaining: Math.max(0, trip.remaining) / efficiency,
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
  for(const id of ['warehouse','market','dock'])for(const index of activeWorkerIndices(state,id)) {
    if(state.haulTrips[id].some(t=>t.worker===index))continue;
    const source=id==='warehouse'?chooseWarehouseJob(state):id==='market'?chooseMarketJob(state):chooseDockJob(state);
    if(source)launchTrip(state,id,index,source);
  }
}
function startBuilding(state,p) {
  p.stage='building';p.buildRemaining=Math.max(0,p.transportSeconds)*constructionBuildFactor(p);
  notify(state,'construction-delivered',`${buildingNames[p.building]}: materials delivered`,'Transport is complete. Building work has started.');
}
function completeTrip(state,t) {
  if(['producer','pending','marketOutbound','dockOutbound'].includes(t.kind)) {
    receiveMaterials(state,{[t.resource]:t.amount},{bonus:false});state.statistics.collected=Math.min(10000000,(state.statistics.collected||0)+t.amount);
    if(t.kind==='dockOutbound') {const o=state.dock.orders.find(x=>x.id===t.orderId);if(o){o.delivered+=t.amount;if(o.delivered>=o.amount)o.stage='complete';}}
  } else if(t.kind==='construction') {
    const p=state.constructionProjects.find(x=>x.order===t.projectOrder);if(!p)return;
    p.delivered[t.resource]=(p.delivered[t.resource]||0)+t.amount;p.goodsRemaining=Math.max(0,p.goodsRemaining-t.amount);
    if(!p.goodsRemaining)startBuilding(state,p);
  } else if(t.kind==='marketInbound')state.market.locked.push({resource:t.resource,amount:t.amount,remaining:3600,expiresRemaining:86400});
  else {
    const o=state.dock.orders.find(x=>x.id===t.orderId);if(!o)return;
    if(['dockInbound','dockUnload'].includes(t.kind)) {
      // Ship cargo actually picked up before expiry stays protected through
      // both delivery legs. Unpicked goods keep their original deadline.
      const remaining=t.kind==='dockInbound'?86400:o.expiresRemaining;
      state.dock.stock[t.resource]+=t.amount;state.dock.lots.push(lot(t.resource,t.amount,remaining,{orderId:o.id,direction:o.direction,...(t.kind==='dockUnload'?{protected:true}:{})}));
      if(o.direction==='buy'&&!o.remainingToUnload&&!state.haulTrips.dock.some(x=>x!==t&&x.orderId===o.id&&x.kind==='dockUnload'))o.stage='collecting';
      if(o.direction==='sell'&&!o.remainingToPort)o.stage='loading';
    }else if(t.kind==='dockLoad') {
      o.remainingToShip=Math.max(0,o.remainingToShip-t.amount);o.loaded=(o.loaded||0)+t.amount;
      finishSaleLoading(state,o);
    }
  }
}
function productionJobs(state,efficiency) {
  const jobs=[];
  for(const [id,r] of Object.entries(PRODUCTION_RECIPES)) {
    if(productionBlocked(state,id))continue;
    const cycle=3600/Math.max(1,productionRate(state,id));
    const engaged=activePlayMultiplier(state);
    for(const index of activeWorkerIndices(state,id))jobs.push({id,index,cycle,speed:efficiency*(state.lighthouseRemaining>0?2:1)*engaged*eventProductionMultiplier(state,id)});
  }
  return jobs;
}
export function nextLogisticsEvent(state,efficiency=workerEfficiency(state)) {
  promoteConstructionQueue(state);
  dispatchTrips(state);
  let next=Infinity;
  for(const j of productionJobs(state,efficiency))next=Math.min(next,Math.max(0,j.cycle-(state.buildings[j.id].workProgress[j.index]||0))/j.speed);
  for(const t of Object.values(state.haulTrips).flat())next=Math.min(next,t.remaining/transportEfficiency(state,efficiency));
  for(const t of state.returningWorkers)next=Math.min(next,t);
  for(const l of state.market.locked)next=Math.min(next,l.remaining,l.expiresRemaining);
  for(const l of [...state.market.lots,...state.dock.lots])if(!l.protected)next=Math.min(next,l.remaining);
  for(const o of state.dock.orders)if(!['complete','expired'].includes(o.stage)){if(o.stage==='voyage')next=Math.min(next,o.remaining);else if(o.direction==='buy'&&o.expiresRemaining>EPS)next=Math.min(next,o.expiresRemaining);}
  for(const h of state.dock.purchaseHistory)next=Math.min(next,h.remaining);
  for(const p of state.constructionProjects)if(p.stage==='building')next=Math.min(next,p.buildRemaining);
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
  const loaded=Math.min(order.amount,order.loaded||0),price=Math.floor(order.price*loaded/Math.max(1,order.amount));
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
    for(const p of [...state.constructionProjects]) {
      if(p.stage==='building'){p.buildRemaining=Math.max(0,p.buildRemaining-duration);if(p.buildRemaining<=EPS)finishConstruction(state,p);}
      else if(p.stage==='transport'&&p.transportStarted)p.transportSeconds+=duration;
    }
    for(const j of jobs)state.buildings[j.id].workProgress[j.index]=Math.min(j.cycle,(state.buildings[j.id].workProgress[j.index]||0)+duration*j.speed);
    state.returningWorkers=state.returningWorkers.map(t=>t-duration).filter(t=>t>EPS);
    for(const l of state.market.locked){l.remaining=Math.max(0,l.remaining-duration);l.expiresRemaining=Math.max(0,l.expiresRemaining-duration);}
    for(const l of [...state.market.lots,...state.dock.lots])if(!l.protected)l.remaining=Math.max(0,l.remaining-duration);
    state.market.locked=expireLots(state,state.market.locked,true);state.market.lots=expireLots(state,state.market.lots);state.dock.lots=expireLots(state,state.dock.lots);
    for(const l of state.market.locked.filter(l=>l.remaining<=EPS)){state.market.stock[l.resource]+=l.amount;state.market.lots.push(lot(l.resource,l.amount,l.expiresRemaining));}
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
    for(const id of ['warehouse','market','dock'])for(const trip of state.haulTrips[id])trip.remaining=Math.max(0,trip.remaining-duration*transportEfficiency(state,efficiency));
    updateStorageStatus(state,duration);state.activeSeconds=Math.min(Number.MAX_SAFE_INTEGER,state.activeSeconds+duration);
    for(const j of jobs)if(state.buildings[j.id].workProgress[j.index]>=j.cycle-EPS) {
      const b=state.buildings[j.id],r=PRODUCTION_RECIPES[j.id];
      if(!productionBlocked(state,j.id)){if(r.input)consumeMaterial(state,r.input,r.amount);b.ready++;b.workProgress[j.index]=0;if(r.input)state.statistics.crafted=Math.min(10000000,(state.statistics.crafted||0)+1);}
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
  if(!MATERIAL_IDS.includes(resource)||!['buy','sell'].includes(direction)||!quantity(amount)||amount%100)return bad('Trade whole batches of 100 materials.');
  const capacity=dockCapacity(state);
  if(reservedPort(state,resource)+amount>capacity.perResource||reservedPort(state)+amount>capacity.total)return bad('Not enough harbor capacity for this order.');
  const lots=amount/100,base=portPrice(resource,direction);
  // Inflation is tracked per material in a rolling real-time three-hour window.
  const previous=direction==='buy'?state.dock.purchaseHistory.filter(h=>h.resource===resource&&h.remaining>EPS).reduce((n,h)=>n+h.lots,0):0;
  const price=direction==='buy'?Math.round(base*(lots+.1*(previous*lots+lots*(lots-1)/2))):base*lots;
  if(direction==='buy'&&state.resources.coins<price)return bad('Not enough coins for this order.');
  if(direction==='sell'&&availableGoods(state,resource)<amount)return bad(resource==='food'?'This sale would spend the protected food reserve.':'Not enough unreserved goods in the warehouse.');
  return good('Harbor quote. The price is frozen when you confirm the order.',{resource,direction,amount,price,lots,basePrice:base,previousLots:previous});
}
export function logisticsAction(state,action,now=Date.now()) {
  if(!action||typeof action!=='object')return null;
  if(action.type==='cancelConstruction')return cancelConstruction(state,action.order??action.project??action.projectOrder);
  if (action.type === 'warehousePriority') {
    let selected;
    if (Object.hasOwn(action, 'priorities')) {
      if (!Array.isArray(action.priorities) || action.priorities.length > 3 || action.priorities.some(resource => !WAREHOUSE_PRIORITY_IDS.includes(resource)) || new Set(action.priorities).size !== action.priorities.length) return bad('Choose up to three different transport priorities.');
      selected = [...action.priorities];
    } else {
      if (!WAREHOUSE_PRIORITY_IDS.includes(action.resource)) return bad('Choose goods or Construction to prioritize.');
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
      if(!(target==='pending'||target.startsWith('producer:')&&Object.hasOwn(PRODUCTION_RECIPES,target.slice(9))||target.startsWith('construction:')&&state.constructionProjects.some(p=>p.order===Number(target.slice(13)))))return bad('Choose a producer or construction project.');
      const values=state.logisticsPriority;const index=values.indexOf(target);
      if(action.direction===undefined){if(index>=0)values.splice(index,1);values.unshift(target);return good('Transport priority updated.');}
      if(![-1,1].includes(action.direction))return bad('Invalid priority direction.');
      if(index<0)values.push(target);
      const current=values.indexOf(target),next=current+action.direction;
      if(next<0||next>=values.length)return bad('This priority is already at the end of the list.');
      [values[current],values[next]]=[values[next],values[current]];return good('Transport priority updated.');
    }
    if(!MATERIAL_IDS.includes(action.resource)||![-1,1].includes(action.direction))return bad('Invalid transport priority change.');
    const i=state.transportPriority.indexOf(action.resource),j=i+action.direction;
    if(j<0||j>=state.transportPriority.length)return bad('This material is already at the end of the priority list.');
    [state.transportPriority[i],state.transportPriority[j]]=[state.transportPriority[j],state.transportPriority[i]];return good('Transport priority updated.');
  }
  if(action.type==='marketOrder') {
    if(!workplaceUnlocked(state,'market'))return bad('The market unlocks at Town Hall level 2.');
    const resource=action.resource,amount=action.amount;
    if(!MATERIAL_IDS.includes(resource)||!quantity(amount))return bad('Enter a whole material quantity.');
    const ordered=state.market.orders.reduce((n,o)=>n+o.amount,0);
    if(availableGoods(state,resource)<amount)return bad(resource==='food'?'Protect the warehouse food reserve.':'Not enough unreserved goods in the warehouse.');
    if(marketUsed(state)+inboundAmount(state,'market')+ordered+amount>marketCapacity(state))return bad('Not enough market capacity for this delivery.');
    state.market.orders.push({resource,amount});return good('Market workers will carry these goods. Each delivery is locked for one hour and expires after 24 hours.');
  }
  if(action.type==='marketExchange') {
    if(!workplaceUnlocked(state,'market'))return bad('The market unlocks at Town Hall level 2.');
    const {from,to}=action,amount=action.amount,groups=[['wood','stone','grain'],['planks','food']];
    if(from===to||!groups.some(g=>g.includes(from)&&g.includes(to)))return bad('Choose different goods from the same category.');
    if(!quantity(amount)||amount%10)return bad('Exchange batches of 10 to receive 9 after the 10% margin.');
    if(state.market.stock[from]-state.market.dispatch[from]<amount)return bad('Not enough unlocked, unreserved goods in the market.');
    const output=amount*.9;state.market.stock[from]-=amount;removeLots(state.market.lots,from,amount);state.market.stock[to]+=output;state.market.lots.push(lot(to,output));state.statistics.traded=(state.statistics.traded||0)+1;
    return good(`Exchanged ${amount} ${materialNames[from]} for ${output} ${materialNames[to]}. The new goods expire in 24 hours.`);
  }
  if(action.type==='marketDispatch') {
    const resource=action.resource,amount=action.amount;
    if(!workplaceUnlocked(state,'market')||!MATERIAL_IDS.includes(resource)||!quantity(amount))return bad('Invalid collection order.');
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
  if(activeWorkerIndices(state,'warehouse').length)return constructionScheduleEstimate(state,project);
  const snapshot=structuredClone(state);
  for(const person of snapshot.residents||[])if(person.workplace==='warehouse')person.workplace=null;
  snapshot.residents||=[];
  const id=Math.max(0,...snapshot.residents.map(person=>person.id||0))+1;
  snapshot.residents.push({id,workplace:'warehouse',arrivalRemaining:0,returnRemaining:0,pendingRelease:false,visitGroup:null});
  snapshot.buildings.warehouse.workers=1;snapshot.buildings.warehouse.workProgress=[0];
  for(const trip of snapshot.haulTrips.warehouse)trip.worker=-1;
  const target=snapshot.constructionProjects.find(item=>item.order===project.order);
  return {...constructionScheduleEstimate(snapshot,target),virtualCarrier:true};
}
function instantPlan(state,action) {
  const route=action.route,amounts=stock();let carrier='warehouse',project=null,orders=[],normalEstimate=null;
  const add=(resource,n)=>{amounts[resource]+=Math.max(0,n||0);};
  if(route==='producer') {
    if(!Object.hasOwn(PRODUCTION_RECIPES,action.building))return bad('Choose a producer.');
    add(PRODUCTION_RECIPES[action.building].output,state.buildings[action.building].ready);
  }else if(route==='construction') {
    project=state.constructionProjects.find(p=>p.order===Number(action.project??action.projectOrder)&&['transport','queued'].includes(p.stage));
    if(!project)return bad('Choose an upgrade waiting for materials.');
    for(const id of MATERIAL_IDS)add(id,Math.max(0,(project.cost[id]||0)-(project.delivered?.[id]||0)));
    normalEstimate=instantConstructionEstimate(state,project);
    if(!Number.isFinite(normalEstimate.transport))return bad(normalEstimate.reason||'The remaining delivery schedule could not be estimated.');
  }else if(route==='marketInbound') {
    carrier='market';
    for(const o of state.market.orders)if(!action.resource||o.resource===action.resource)add(o.resource,o.amount);
    if(action.resource&&action.amount!==undefined) {
      if(!MATERIAL_IDS.includes(action.resource)||!quantity(action.amount))return bad('Enter a whole material quantity.');
      amounts[action.resource]=action.amount;
    }
    for(const id of MATERIAL_IDS){const ownReservation=state.market.orders.filter(order=>order.resource===id).reduce((sum,order)=>sum+order.amount,0);if(amounts[id]>availableGoods(state,id)+ownReservation)return bad('Not enough goods above the protected food reserve.');}
    if(MATERIAL_IDS.reduce((n,id)=>n+amounts[id],0)+marketUsed(state)+inboundAmount(state,'market')>marketCapacity(state))return bad('Not enough market capacity.');
  }else if(route==='marketOutbound') {
    carrier='market';for(const id of MATERIAL_IDS)if(!action.resource||action.resource===id)add(id,action.amount===undefined?state.market.dispatch[id]:action.amount);
    for(const id of MATERIAL_IDS)if(amounts[id]>state.market.stock[id])return bad('Not enough unlocked market goods.');
  }else if(['dockInbound','dockLoad','dockOutbound','dockUnload'].includes(route)) {
    carrier='dock';orders=selectedOrders(state,action,route==='dockInbound'||route==='dockLoad'?'sell':'buy');
    for(const o of orders) {
      if(route==='dockInbound')add(o.resource,o.remainingToPort+state.haulTrips.dock.filter(t=>t.orderId===o.id&&t.kind==='dockInbound').reduce((n,t)=>n+t.amount,0));
      if(route==='dockLoad')add(o.resource,state.dock.lots.filter(l=>l.orderId===o.id).reduce((n,l)=>n+l.amount,0)+state.haulTrips.dock.filter(t=>t.orderId===o.id&&t.kind==='dockLoad').reduce((n,t)=>n+t.amount,0));
      if(route==='dockOutbound')add(o.resource,state.dock.lots.filter(l=>l.orderId===o.id).reduce((n,l)=>n+l.amount,0)+state.haulTrips.dock.filter(t=>t.orderId===o.id&&t.kind==='dockOutbound').reduce((n,t)=>n+t.amount,0));
      if(route==='dockUnload'&&o.stage==='unloading')add(o.resource,o.remainingToUnload+state.haulTrips.dock.filter(t=>t.orderId===o.id&&t.kind==='dockUnload').reduce((n,t)=>n+t.amount,0));
    }
  }else return bad('Choose a supported transport route.');
  const total=MATERIAL_IDS.reduce((n,id)=>n+amounts[id],0);if(!total)return bad('There are no goods waiting on this route.');
  if(['producer','marketOutbound','dockOutbound'].includes(route)) {
    const limits=warehouseLimits(state);
    const selectedIds=new Set(orders.map(order=>order.id));
    const admission=route==='dockOutbound'?{...state,haulTrips:{...state.haulTrips,dock:state.haulTrips.dock.filter(trip=>trip.kind!=='dockOutbound'||!selectedIds.has(trip.orderId))}}:state;
    const incoming=inboundAmount(admission,'warehouse');
    const protectedFood=Math.max(0,foodReserve(admission)-ordinaryStock(admission,'food')-inboundAmount(admission,'warehouse','food')-amounts.food);
    if(MATERIAL_IDS.some(id=>amounts[id]>centralRoom(admission,id))||total>limits.total-ordinaryWarehouseUsed(admission)-incoming-protectedFood)return bad('Make room in the central warehouse, including incoming cargo, before sending this whole batch.');
  }
  const capacity=haulCapacity(state,carrier),trips=MATERIAL_IDS.reduce((n,id)=>n+Math.ceil(amounts[id]/capacity),0);
  return good('Instant transport quote.',{quantities:amounts,capacity,trips,route,carrier,project,orders,...(normalEstimate?{normalTransport:normalEstimate.transport,normalBuilding:(project.transportSeconds+normalEstimate.transport)*constructionBuildFactor(project),virtualCarrier:normalEstimate.virtualCarrier===true}:{})});
}
export function quoteInstantTransport(state,action) {
  const result=instantPlan(state,action);
  if(!result.ok)return result;
  const {project,orders,...publicQuote}=result;return publicQuote;
}
export function instantTransport(state,action) {
  const plan=instantPlan(state,action);if(!plan.ok)return plan;
  const {route,quantities,project,orders}=plan;
  if(route==='producer') {state.buildings[action.building].ready=0;receiveMaterials(state,quantities,{bonus:false});}
  else if(route==='construction') {
    const fullCost=Object.fromEntries(MATERIAL_IDS.map(id=>[id,project.cost[id]||0]));
    for(const id of MATERIAL_IDS)consumeMaterial(state,id,project.reservedMaterials?.[id]||0);
    state.haulTrips.warehouse=state.haulTrips.warehouse.filter(t=>t.projectOrder!==project.order);
    project.remainingMaterials=stock();project.reservedMaterials=stock();project.delivered=fullCost;project.goodsRemaining=0;project.transportSeconds+=plan.normalTransport;project.transportStarted=true;project.buildRemaining=project.transportSeconds*constructionBuildFactor(project);project.instantTransport=true;
    if(project.stage==='transport')startBuilding(state,project);
  }else if(route==='marketInbound') {
    for(const id of MATERIAL_IDS)if(quantities[id]) {
      consumeMaterial(state,id,quantities[id]);let left=quantities[id];
      for(const o of state.market.orders.filter(o=>o.resource===id)){const used=Math.min(left,o.amount);o.amount-=used;left-=used;}
      state.market.locked.push({resource:id,amount:quantities[id],remaining:3600,expiresRemaining:86400});
    }
    state.market.orders=state.market.orders.filter(o=>o.amount);
  }else if(route==='marketOutbound') {
    for(const id of MATERIAL_IDS)if(quantities[id]){
      const unreserved=Math.max(0,state.market.stock[id]-state.market.dispatch[id]);
      const fulfilledReservation=action.amount===undefined?quantities[id]:Math.max(0,quantities[id]-unreserved);
      state.market.stock[id]-=quantities[id];
      state.market.dispatch[id]=Math.max(0,state.market.dispatch[id]-fulfilledReservation);
      removeLots(state.market.lots,id,quantities[id]);
    }receiveMaterials(state,quantities,{bonus:false});
  }else {
    for(const o of orders) {
      const matches=t=>t.orderId===o.id&&t.kind===route;
      const carried=state.haulTrips.dock.filter(matches).reduce((n,t)=>n+t.amount,0);
      state.haulTrips.dock=state.haulTrips.dock.filter(t=>!matches(t));
      if(route==='dockInbound'||route==='dockUnload') {
        const unpicked=route==='dockInbound'?o.remainingToPort:o.remainingToUnload;
        const amount=unpicked+carried;if(!amount)continue;
        if(route==='dockInbound'){consumeMaterial(state,o.resource,o.remainingToPort);o.remainingToPort=0;}else o.remainingToUnload=0;
        const deadline=route==='dockInbound'?86400:o.expiresRemaining;
        const accepted=deadline>EPS?amount:carried;
        if(accepted){state.dock.stock[o.resource]+=accepted;state.dock.lots.push(lot(o.resource,accepted,deadline,{orderId:o.id,direction:o.direction,...(route==='dockUnload'?{protected:true}:{})}));}
        if(accepted<amount){const expired=amount-accepted;o.expiredAmount=(o.expiredAmount||0)+expired;notify(state,'goods-expired','Harbor cargo expired',`${expired} ${materialNames[o.resource]} expired after its purchase deadline.`);}
        o.stage=route==='dockInbound'?'loading':'collecting';
      }else {
        const amount=state.dock.lots.filter(l=>l.orderId===o.id).reduce((n,l)=>n+l.amount,0)+carried;if(!amount)continue;
        const fromPort=amount-carried;state.dock.stock[o.resource]-=fromPort;removeLots(state.dock.lots,o.resource,fromPort,o.id);
        if(route==='dockOutbound'){receiveMaterials(state,{[o.resource]:amount},{bonus:false});o.delivered+=amount;if(o.delivered>=o.amount)o.stage='complete';}
        else {o.remainingToShip-=amount;o.loaded=(o.loaded||0)+amount;finishSaleLoading(state,o);}
      }
    }
  }
  updateStorageStatus(state);return good('Goods transported instantly.',{quantities,trips:plan.trips});
}
