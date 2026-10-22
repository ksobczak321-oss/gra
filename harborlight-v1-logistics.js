// Physical goods, individual work phases and hauling. All time is active seconds.
import { productionMultiplier } from './harborlight-v1-residents.js?v=happiness-v8';
export const workerEfficiency = productionMultiplier;
export const MATERIAL_IDS = ['wood', 'stone', 'grain', 'food', 'planks'];
export const PRODUCTION_RECIPES = {
  farm: { output: 'grain' }, lumber: { output: 'wood' }, quarry: { output: 'stone' },
  sawmill: { output: 'planks', input: 'wood', amount: 2 },
  windmill: { output: 'food', input: 'grain', amount: 2 }
};
const clamp = (n, min = 0, max = 10000000) => Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
const whole = n => Math.floor(clamp(n));
const stock = () => Object.fromEntries(MATERIAL_IDS.map(id => [id, 0]));
export const producerCapacity = state => 200 * state.buildings.townhall.level;
export function warehouseLimits(state) {
  const factor = state.buildings.warehouse.level ? 1.5 ** (state.buildings.warehouse.level - 1) : 0;
  return { perResource: Math.floor(Math.min(10000000, 1000 * factor)), total: Math.floor(Math.min(40000000, 4000 * factor)) };
}
export const warehouseUsed = state => MATERIAL_IDS.reduce((sum, id) => sum + state.resources[id], 0);
export function stockRoom(state, id) {
  if (!MATERIAL_IDS.includes(id)) return 0;
  const limits = warehouseLimits(state);
  return Math.max(0, Math.floor(Math.min(limits.perResource - state.resources[id], limits.total - warehouseUsed(state))));
}
export const marketCapacity = state => Math.floor(Math.min(10000000, 1000 * 1.5 ** Math.max(0, state.buildings.market.level - 1)));
export const marketUsed = state => MATERIAL_IDS.reduce((sum, id) => sum + state.market.stock[id], 0) + state.market.locked.reduce((sum, lot) => sum + lot.amount, 0);
export const workplaceUnlocked = (state, id) => state.buildings.townhall.level >= (id === 'market' ? 2 : id === 'dock' ? 4 : 1);
const buildingNames = { farm: 'Farm', lumber: 'Lumber Camp', quarry: 'Quarry', windmill: 'Windmill', sawmill: 'Sawmill', warehouse: 'Warehouse', market: 'Market', dock: 'Harbor', house: 'House', townhall: 'Town Hall', chapel: 'Chapel', lighthouse: 'Lighthouse' };
const materialNames = { wood: 'wood', stone: 'stone', grain: 'grain', food: 'food', planks: 'planks' };

export const premiumActive = (state, now = Date.now()) => (state.premium?.expiresAt || 0) > now;
export function constructionCounts(state) {
  const projects = state.constructionProjects || [], premium = premiumActive(state);
  return { active: projects.filter(p => ['transport', 'building'].includes(p.stage)).length, queued: projects.filter(p => ['queued', 'planned'].includes(p.stage)).length, limit: state.buildings.townhall.level + (premium ? 4 : 0), queueLimit: premium ? Infinity : state.buildings.townhall.level, premium };
}
export function syncConstructionPointers(state) {
  for (const building of Object.values(state.buildings)) delete building.construction;
  for (const project of state.constructionProjects) if (!state.buildings[project.building].construction) state.buildings[project.building].construction = project;
}
export function nextConstruction(state) {
  return state.constructionProjects.find(project => project.stage === 'transport') || null;
}
export function plannedLevel(state, id) {
  return Math.max(state.buildings[id].level, ...state.constructionProjects.filter(project => project.building === id).map(project => project.targetLevel));
}
export function promoteConstructionQueue(state) {
  const counts = constructionCounts(state);
  let slots = counts.limit - counts.active;
  for (const project of state.constructionProjects) {
    if (project.stage === 'planned' && counts.premium && Object.entries(project.cost).every(([id, value]) => state.resources[id] >= value)) {
      for (const [id, value] of Object.entries(project.cost)) state.resources[id] -= value;
      project.stage = 'queued';
      notify(state, 'construction-reserved', `${buildingNames[project.building]}: materials reserved`, 'The expected materials have arrived in the warehouse. The full cost is now reserved.');
    }
    if (project.stage !== 'queued' || slots <= 0) continue;
    const id = project.building, building = state.buildings[id];
    if (project.targetLevel !== building.level + 1 || (id !== 'townhall' && project.targetLevel > state.buildings.townhall.level)) continue;
    if (state.constructionProjects.some(other => other !== project && other.building === id && ['transport', 'building'].includes(other.stage))) continue;
    project.stage = 'transport'; slots--;
    notify(state, 'construction-promoted', `${buildingNames[id]}: upgrade started`, 'A construction slot is available. Reserved materials are waiting for transport.');
  }
  syncConstructionPointers(state);
}
function finishConstruction(state, project) {
  const id = project.building, building = state.buildings[id];
  building.level = project.targetLevel;
  state.constructionProjects = state.constructionProjects.filter(other => other !== project);
  if (id === 'townhall') state.capacity = building.level * 24;
  if (id === 'lighthouse') {
    state.objective = { wood: 50, stone: 30, repaired: true };
    state.lighthouseRemaining = 86400 * building.level;
    notify(state, 'lighthouse-bonus', 'Lighthouse bonus', `For ${24 * building.level} hours: +100 happiness for everyone and material production ×2. Taxes are unchanged.`);
  }
  if (id === 'chapel') {
    state.chapelRemaining = 36000;
    notify(state, 'chapel-upgrade', 'Chapel upgrade bonus', `For 10 hours: +${building.level * 10} happiness for every resident and taxes ×2.`);
  }
  state.statistics.upgrades = Math.min(10000000, state.statistics.upgrades + 1);
  notify(state, 'construction-finished', `${buildingNames[id]}: level ${building.level}`, 'Upgrade complete. The new level is now active.');
  syncConstructionPointers(state);
}
function forecastWorkerEfficiency(state) {
  const current = workerEfficiency(state);
  if (current === 1 || !state.buildings.warehouse.workers || !stockRoom(state, 'food')) return current;
  const foodAwaitingTransport = state.pendingDeliveries.food + state.buildings.windmill.ready + Math.min(state.market.stock.food, state.market.dispatch.food);
  const accessibleGrain = state.resources.grain + state.pendingDeliveries.grain + state.buildings.farm.ready + Math.min(state.market.stock.grain, state.market.dispatch.grain);
  const canMakeFood = state.buildings.windmill.workers > 0 && (accessibleGrain >= PRODUCTION_RECIPES.windmill.amount || state.buildings.farm.workers > 0);
  // An actual carrier and a food source can restore full efficiency. The
  // optimistic forecast uses that prospective rate, without promising when
  // the first meal arrives. Without a recovery route it keeps the hungry rate.
  return foodAwaitingTransport > 0 || canMakeFood ? 1 : current;
}

// Optimistic delivery estimate, not a reservation or promise of future goods.
export function estimateMaterialsSeconds(state, cost) {
  const factor = 1.5 ** Math.max(0, plannedLevel(state, 'warehouse') - 1);
  if (MATERIAL_IDS.some(id => (cost[id] || 0) > Math.floor(1000 * factor)) || MATERIAL_IDS.reduce((sum, id) => sum + (cost[id] || 0), 0) > Math.floor(4000 * factor)) return Infinity;
  let estimate = 0, hauled = 0;
  const efficiency = forecastWorkerEfficiency(state);
  const materialSpeed = efficiency * (state.lighthouseRemaining > 0 ? 2 : 1);
  const carriers = state.buildings.warehouse.workers * 60 * efficiency;
  for (const [resource, required] of Object.entries(cost)) {
    const missing = Math.max(0, required - state.resources[resource]);
    if (!missing) continue;
    if (resource === 'coins') {
      const workers = Object.entries(state.buildings).reduce((sum, [id, b]) => sum + (workplaceUnlocked(state, id) ? b.workers : 0), 0);
      if (!workers) return Infinity;
      estimate = Math.max(estimate, missing / (workers * (state.chapelRemaining > 0 ? 2 : 1)) * 3600);
      continue;
    }
    if (!carriers) return Infinity;
    hauled += missing;
    const producer = Object.keys(PRODUCTION_RECIPES).find(id => PRODUCTION_RECIPES[id].output === resource);
    const recipe = PRODUCTION_RECIPES[producer], building = state.buildings[producer];
    const buffered = building.ready + state.pendingDeliveries[resource] + Math.min(state.market.stock[resource], state.market.dispatch[resource]);
    const toProduce = Math.max(0, missing - buffered);
    if (toProduce && !building.workers) return Infinity;
    if (toProduce) {
      // Residents eat before future Food can accumulate for another use.
      const output = building.workers * 10 * materialSpeed;
      const surplus = output - (resource === 'food' ? state.population : 0);
      if (surplus <= 0) return Infinity;
      estimate = Math.max(estimate, toProduce / surplus * 3600);
    }
    if (toProduce && recipe.input) {
      const inputMissing = Math.max(0, toProduce * recipe.amount - state.resources[recipe.input]);
      const upstream = Object.keys(PRODUCTION_RECIPES).find(id => PRODUCTION_RECIPES[id].output === recipe.input);
      const upstreamBuilding = state.buildings[upstream];
      const inputToProduce = Math.max(0, inputMissing - upstreamBuilding.ready - state.pendingDeliveries[recipe.input]);
      if (inputToProduce && !upstreamBuilding.workers) return Infinity;
      if (inputToProduce) estimate = Math.max(estimate, inputToProduce / (upstreamBuilding.workers * 10 * materialSpeed) * 3600);
      hauled += inputMissing;
    }
  }
  return Math.max(estimate, hauled / carriers * 3600 || 0);
}

export function receiveMaterials(state, values, { overflowToPending = true } = {}) {
  for (const id of MATERIAL_IDS) {
    const quantity = whole(values[id]);
    const stored = Math.min(quantity, stockRoom(state, id));
    state.resources[id] += stored;
    if (overflowToPending) state.pendingDeliveries[id] = Math.min(10000000, state.pendingDeliveries[id] + quantity - stored);
  }
}

export function syncCrewProgress(state, id, oldCount, newCount) {
  const building = state.buildings[id];
  const duration = PRODUCTION_RECIPES[id] ? 360 : 60;
  const phases = Array.from({ length: newCount }, (_, index) => index < oldCount ? clamp(building.workProgress?.[index], 0, duration - 1e-8) : 0);
  const released = Math.max(0, oldCount - newCount);
  for (let index = 0; index < released; index++) state.returningWorkers.push(300);
  building.workProgress = phases;
}

export function notify(state, kind, title, message) {
  state.notificationSequence = (state.notificationSequence || 0) + 1;
  state.notifications.unshift({ id: state.notificationSequence, kind, title, message, at: state.activeSeconds || 0, read: false });
  state.notifications.length = Math.min(100, state.notifications.length);
}

export function storagePenalty(state, id) {
  const building = state.buildings[id];
  return building.storageFull ? Math.min(50, 10 * (1 + Math.floor((building.fullSeconds + 1e-7) / 86400))) : 0;
}

export function updateStorageStatus(state, elapsed = 0) {
  const limits = warehouseLimits(state);
  const stores = [
    ...Object.entries(PRODUCTION_RECIPES).map(([id, recipe]) => [id, state.buildings[id].ready >= producerCapacity(state), `${buildingNames[id]}: storage is full`, `Storage full: ${materialNames[recipe.output]}. Production is waiting for transport.`]),
    ['warehouse', warehouseUsed(state) >= limits.total, 'The central warehouse is full', 'No shared storage space remains. Upgrade the warehouse or use some goods.'],
    ['market', workplaceUnlocked(state, 'market') && marketUsed(state) >= marketCapacity(state), 'The market is full', 'Exchange goods or order their collection by warehouse workers.']
  ];
  for (const [id, full, title, message] of stores) {
    const building = state.buildings[id];
    if (full && !building.storageFull) notify(state, 'storage-full', title, message);
    building.fullSeconds = full ? Math.min(432000, (building.storageFull ? building.fullSeconds || 0 : 0) + elapsed) : 0;
    building.storageFull = full;
  }
  for (const id of MATERIAL_IDS) {
    const full = state.resources[id] >= limits.perResource && limits.perResource > 0;
    if (full && !state.fullResources[id]) notify(state, 'storage-full', 'Material storage limit reached', `The central warehouse has no more space for ${materialNames[id]}.`);
    state.fullResources[id] = full;
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

export function normalizeLogisticsState(state, raw) {
  state.constructionSequence = whole(raw.constructionSequence);
  state.pendingDeliveries = stock();
  for (const id of MATERIAL_IDS) state.pendingDeliveries[id] = whole(raw.pendingDeliveries?.[id]);
  state.returningWorkers = Array.isArray(raw.returningWorkers) ? raw.returningWorkers.filter(n => Number.isFinite(n) && n > 0).slice(0, state.population).map(n => clamp(n, 0, 300)) : [];
  const ordered = Array.isArray(raw.transportPriority) ? raw.transportPriority.filter(id => MATERIAL_IDS.includes(id)) : [];
  state.transportPriority = [...new Set([...ordered, ...MATERIAL_IDS])];
  state.market = { stock: stock(), locked: [], orders: [], dispatch: stock() };
  for (const id of MATERIAL_IDS) {
    state.market.stock[id] = whole(raw.market?.stock?.[id]);
    state.market.dispatch[id] = Math.min(state.market.stock[id], whole(raw.market?.dispatch?.[id]));
  }
  if (Array.isArray(raw.market?.locked)) state.market.locked = raw.market.locked.filter(lot => MATERIAL_IDS.includes(lot.resource) && whole(lot.amount) > 0).slice(0, 10000).map(lot => ({ resource: lot.resource, amount: whole(lot.amount), remaining: clamp(lot.remaining, 0, 3600) }));
  if (Array.isArray(raw.market?.orders)) state.market.orders = raw.market.orders.filter(order => MATERIAL_IDS.includes(order.resource) && whole(order.amount) > 0).slice(0, 100).map(order => ({ resource: order.resource, amount: whole(order.amount) }));
  state.activeSeconds = clamp(raw.activeSeconds, 0, Number.MAX_SAFE_INTEGER);
  state.notifications = Array.isArray(raw.notifications) ? raw.notifications.slice(0, 100).filter(n => n && typeof n.title === 'string' && typeof n.message === 'string').map(n => ({ id: whole(n.id), kind: String(n.kind || 'info').slice(0, 40), title: translateSavedNotificationText(n.title.slice(0, 150)), message: translateSavedNotificationText(n.message.slice(0, 400)), at: clamp(n.at, 0, Number.MAX_SAFE_INTEGER), read: n.read === true })) : [];
  state.notificationSequence = Math.max(whole(raw.notificationSequence), ...state.notifications.map(n => n.id), 0);
  state.fullResources = Object.fromEntries(MATERIAL_IDS.map(id => [id, raw.fullResources?.[id] === true]));
  for (const [id, building] of Object.entries(state.buildings)) {
    const cycle = PRODUCTION_RECIPES[id] ? 360 : 60;
    building.workProgress = Array.from({ length: building.workers }, (_, index) => clamp(raw.buildings?.[id]?.workProgress?.[index], 0, cycle - 1e-8));
    building.storageFull = raw.buildings?.[id]?.storageFull === true;
    building.fullSeconds = clamp(raw.buildings?.[id]?.fullSeconds, 0, 432000);
  }
  state.premium = { expiresAt: clamp(raw.premium?.expiresAt, 0, Number.MAX_SAFE_INTEGER) };
  const projects = Array.isArray(raw.constructionProjects) ? raw.constructionProjects : [];
  state.constructionProjects = [];
  const levels = Object.fromEntries(Object.entries(state.buildings).map(([id, b]) => [id, b.level]));
  let projectOrder = 0;
  for (const project of [...projects].sort((a,b) => (a?.order || 0) - (b?.order || 0))) {
    if (!project || !Object.hasOwn(buildingNames, project.building) || !['transport', 'building', 'queued', 'planned'].includes(project.stage)) continue;
    if (project.targetLevel !== levels[project.building] + 1 || project.targetLevel > 100) continue;
    const goodsTotal = whole(project.goodsTotal);
    if (!goodsTotal) continue;
    const cost = Object.fromEntries([...MATERIAL_IDS, 'coins'].filter(id => whole(project.cost?.[id])).map(id => [id, whole(project.cost[id])]));
    if (project.stage === 'planned' && !Object.keys(cost).length) continue;
    const normalized = { building: project.building, targetLevel: project.targetLevel, goodsTotal, goodsRemaining: Math.min(goodsTotal, whole(project.goodsRemaining)), transportSeconds: clamp(project.transportSeconds, 0, Number.MAX_SAFE_INTEGER), buildRemaining: clamp(project.buildRemaining, 0, Number.MAX_SAFE_INTEGER), stage: project.stage, order: Math.max(projectOrder + 1, whole(project.order)), cost };
    projectOrder = normalized.order;
    state.constructionSequence = Math.max(state.constructionSequence, normalized.order);
    state.constructionProjects.push(normalized);
    levels[project.building] = project.targetLevel;
  }
  const original = { ...state.resources };
  for (const id of MATERIAL_IDS) state.resources[id] = 0;
  receiveMaterials(state, original);
  // Invalid oversized market saves keep their goods as pending deliveries.
  let room = marketCapacity(state);
  for (const id of MATERIAL_IDS) {
    const kept = Math.min(state.market.stock[id], room);
    state.pendingDeliveries[id] += state.market.stock[id] - kept;
    state.market.stock[id] = kept;
    state.market.dispatch[id] = Math.min(state.market.dispatch[id], kept);
    room -= kept;
  }
  state.market.locked = state.market.locked.map(lot => {
    const amount = Math.min(lot.amount, room);
    state.pendingDeliveries[lot.resource] += lot.amount - amount;
    room -= amount;
    return { ...lot, amount };
  }).filter(lot => lot.amount);
  // Existing active projects continue when a package expires; no new extra slot opens.
  promoteConstructionQueue(state);
}

function haulSource(state) {
  for (const resource of state.transportPriority) {
    if (!stockRoom(state, resource)) continue;
    if (state.pendingDeliveries[resource] > 0) return { resource, kind: 'pending' };
    if (state.market.dispatch[resource] > 0 && state.market.stock[resource] > 0) return { resource, kind: 'market' };
    const producer = Object.keys(PRODUCTION_RECIPES).find(id => PRODUCTION_RECIPES[id].output === resource && state.buildings[id].ready > 0);
    if (producer) return { resource, producer, kind: 'producer' };
  }
  return null;
}

function marketOrder(state) {
  if (!workplaceUnlocked(state, 'market') || marketUsed(state) >= marketCapacity(state)) return null;
  return state.market.orders.find(order => order.amount > 0 && state.resources[order.resource] > 0) || null;
}

function activeJobs(state, efficiency = workerEfficiency(state)) {
  const jobs = [];
  for (const [id, recipe] of Object.entries(PRODUCTION_RECIPES)) {
    const building = state.buildings[id];
    if (building.ready >= producerCapacity(state) || (recipe.input && state.resources[recipe.input] < recipe.amount)) continue;
    for (let index = 0; index < building.workers; index++) jobs.push({ id, index, cycle: 360, speed: efficiency * (state.lighthouseRemaining > 0 ? 2 : 1) });
  }
  for (const id of ['warehouse', 'market']) {
    const construction = id === 'warehouse' ? nextConstruction(state) : null;
    const remainingGoods = construction ? construction.goodsRemaining : 0;
    const source = id === 'warehouse' ? haulSource(state) : marketOrder(state);
    for (let index = 0; index < state.buildings[id].workers; index++) {
      if (index < remainingGoods) jobs.push({ id, index, cycle: 60, speed: efficiency, construction: construction.order });
      else if (source) jobs.push({ id, index, cycle: 60, speed: efficiency });
    }
  }
  return jobs;
}

export function nextLogisticsEvent(state, efficiency = workerEfficiency(state)) {
  const jobs = activeJobs(state, efficiency);
  let next = Infinity;
  for (const job of jobs) next = Math.min(next, (job.cycle - (state.buildings[job.id].workProgress[job.index] || 0)) / (job.speed || 1));
  for (const time of state.returningWorkers) next = Math.min(next, time);
  for (const lot of state.market.locked) next = Math.min(next, lot.remaining);
  for (const project of state.constructionProjects) if (project.stage === 'building') next = Math.min(next, project.buildRemaining);
  for (const building of Object.values(state.buildings)) if (building.storageFull && building.fullSeconds < 345600) next = Math.min(next, 86400 - building.fullSeconds % 86400);
  return Math.max(1e-8, next);
}

function completeJob(state, job) {
  const building = state.buildings[job.id];
  const recipe = PRODUCTION_RECIPES[job.id];
  if (recipe) {
    if (building.ready >= producerCapacity(state) || (recipe.input && state.resources[recipe.input] < recipe.amount)) return false;
    if (recipe.input) state.resources[recipe.input] -= recipe.amount;
    building.ready += 1;
    if (recipe.input) state.statistics.crafted = Math.min(10000000, state.statistics.crafted + 1);
  } else if (job.id === 'warehouse') {
    if (job.construction) {
      const construction = state.constructionProjects.find(project => project.order === job.construction);
      if (!construction || construction.stage !== 'transport' || !construction.goodsRemaining) return false;
      construction.goodsRemaining -= 1;
      if (!construction.goodsRemaining) {
        construction.stage = 'building';
        construction.buildRemaining = construction.transportSeconds * (construction.building === 'lighthouse' ? 2 : 1);
        notify(state, 'construction-delivered', `${buildingNames[construction.building]}: materials delivered`, construction.building === 'lighthouse' ? 'Lighthouse construction has started. It will take twice as long as transport.' : 'Construction has started. It will take as long as material transport.');
      }
      building.workProgress[job.index] = 0;
      return true;
    }
    const source = haulSource(state);
    if (!source) return false;
    if (source.kind === 'producer') state.buildings[source.producer].ready -= 1;
    else if (source.kind === 'pending') state.pendingDeliveries[source.resource] -= 1;
    else { state.market.stock[source.resource] -= 1; state.market.dispatch[source.resource] -= 1; }
    state.resources[source.resource] += 1;
    state.statistics.collected = Math.min(10000000, state.statistics.collected + 1);
  } else {
    const order = marketOrder(state);
    if (!order) return false;
    state.resources[order.resource] -= 1;
    order.amount -= 1;
    const last = state.market.locked.at(-1);
    if (last?.resource === order.resource && last.remaining === 3600) last.amount += 1;
    else state.market.locked.push({ resource: order.resource, amount: 1, remaining: 3600 });
    state.market.orders = state.market.orders.filter(item => item.amount > 0);
  }
  building.workProgress[job.index] = 0;
  return true;
}

// The state integrator supplies the efficiency at the start of this interval:
// consuming the last meal must not retroactively slow the work it supported.
export function advanceLogistics(state, elapsed, efficiency = workerEfficiency(state)) {
  let remaining = elapsed, events = 0;
  promoteConstructionQueue(state);
  updateStorageStatus(state);
  while (remaining > 1e-9 && events++ < 200000) {
    const jobs = activeJobs(state, efficiency);
    const duration = Math.min(remaining, nextLogisticsEvent(state, efficiency));
    const transporting = new Set(jobs.filter(job => job.construction).map(job => job.construction));
    for (const project of [...state.constructionProjects]) {
      if (project.stage === 'building') {
        project.buildRemaining = Math.max(0, project.buildRemaining - duration);
        if (project.buildRemaining <= 1e-7) finishConstruction(state, project);
      } else if (transporting.has(project.order)) project.transportSeconds += duration;
    }
    promoteConstructionQueue(state);
    for (const job of jobs) state.buildings[job.id].workProgress[job.index] = Math.min(job.cycle, (state.buildings[job.id].workProgress[job.index] || 0) + duration * (job.speed || 1));
    state.returningWorkers = state.returningWorkers.map(time => time - duration).filter(time => time > 1e-7);
    for (const lot of state.market.locked) lot.remaining = Math.max(0, lot.remaining - duration);
    for (const lot of state.market.locked.filter(item => item.remaining <= 1e-7)) state.market.stock[lot.resource] += lot.amount;
    state.market.locked = state.market.locked.filter(lot => lot.remaining > 1e-7);
    updateStorageStatus(state, duration);
    state.activeSeconds = Math.min(Number.MAX_SAFE_INTEGER, state.activeSeconds + duration);
    for (const job of jobs) if (state.buildings[job.id].workProgress[job.index] >= job.cycle - 1e-7) {
      if (!completeJob(state, job)) state.buildings[job.id].workProgress[job.index] = job.cycle - 1e-8;
      updateStorageStatus(state);
    }
    promoteConstructionQueue(state);
    updateStorageStatus(state);
    remaining = Math.max(0, remaining - duration);
  }
}
