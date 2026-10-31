// The client snapshot keeps a mother-root account revision with up to twenty
// worlds. Cloud adapters persist bounded per-world documents atomically.
// Simulation is injected: this module does not import the state coordinator.
import { MATERIAL_IDS, availableGoods, stockRoom } from './harborlight-v1-logistics.js?v=frontend-v24';
import { bonusStock, consumeMaterial, grantBonusMaterials, centralAvailable } from './harborlight-v1-inventory.js?v=frontend-v24';
import { TUTORIAL_LESSONS } from './harborlight-v1-progression.js?v=frontend-v24';
import { residentAtHome, residentPopulationMinimum, residentSegments, advanceResidents } from './harborlight-v1-residents.js?v=frontend-v24';
import { validateIslandName } from './harborlight-v1-profile.js?v=frontend-v24';

export const ISLAND_IDS = Object.freeze(Array.from({ length: 20 }, (_, index) => `island-${index + 1}`));
export const ARCHIPELAGO_RULES = Object.freeze({ version: 2, secondIslandLevel: 10, maximumIslands: 20, islandLevelStep: 3, colonists: 6,
  passengerCapacity: 100, passengerVoyageSeconds: 1800,
  baseShipCapacity: 1000, voyageSeconds: 600, capacityUnit: 1000,
  capacityUnitGrosz: 499, maximumUnitsPerCheckout: 100, completedVoyageHistory: 50 });
export const SHARED_ACCOUNT_FIELDS = Object.freeze(['commerce', 'loyalty', 'socialRewards', 'referrals', 'engagementSchedule', 'welcome', 'premium', 'settings']);
const adaptersFor = new WeakMap();
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const clone = value => structuredClone(value);
const good = (message, details = {}) => ({ ok: true, message, ...details });
const bad = message => ({ ok: false, message });
const invalid = message => Object.assign(new Error(message), { code: 'invalid-cloud-data' });
const total = cargo => Object.values(cargo).reduce((sum, amount) => sum + amount, 0);
export const worldFor = (bundle, id) => bundle.worlds?.[id] || (id === 'island-1' ? bundle.primary : id === 'island-2' ? bundle.secondary : null);
const worlds = bundle => Object.entries(bundle.worlds || { 'island-1': bundle.primary, ...(bundle.secondary ? { 'island-2': bundle.secondary } : {}) });
const clock = (bundle, now) => {
  const at = Math.floor(Number.isFinite(now) ? now : Math.max(...worlds(bundle).map(([, state]) => state.worldTimeMs || 0)));
  if (!integer(at)) throw invalid('Invalid archipelago clock.');
  return at;
};
const busyVoyage = bundle => bundle.transfers.find(transfer => transfer.status !== 'complete');
const developmentHosts = new Set(['localhost', '127.0.0.1', '[::1]', 'ksobczak321-oss.github.io', 'harborlight-dev.web.app', 'harborlight-dev.firebaseapp.com']);
const productionRuntime = adapters => ['production', 'prod'].includes(adapters?.environment) ||
  !!globalThis.location?.hostname && !developmentHosts.has(globalThis.location.hostname);
const worldShape = value => object(value) && integer(value.version) && value.version > 0 && value.version <= 9 &&
  integer(value.population) && object(value.resources) && object(value.buildings) &&
  ['townhall', 'warehouse', 'house'].every(id => object(value.buildings[id]) && integer(value.buildings[id].level)) &&
  ['coins', ...MATERIAL_IDS.filter(id => value.version > 3 || id !== 'grain')].every(id => Number.isFinite(value.resources[id]) && value.resources[id] >= 0);
const asCargo = (value, { empty = false } = {}) => {
  if (!object(value) || Object.entries(value).some(([id, amount]) => !MATERIAL_IDS.includes(id) || !integer(amount))) return null;
  const result = Object.fromEntries(MATERIAL_IDS.filter(id => value[id] > 0).map(id => [id, value[id]]));
  return Number.isSafeInteger(total(result)) && (empty || total(result) > 0) ? result : null;
};

function bindAccount(bundle) {
  const people = new Set();
  for (const [id, state] of worlds(bundle)) {
    state.islandId = id; state.islandRole = id === 'island-1' ? 'mother' : 'daughter';
    for (const person of state.residents || []) {
      person.personUid ||= `${id}:resident-${person.id}`;
      if (people.has(person.personUid)) throw invalid('A resident identity appears on more than one island.');
      people.add(person.personUid);
    }
    if (id === 'island-1') continue;
    for (const field of SHARED_ACCOUNT_FIELDS) {
      if (bundle.primary[field] === undefined) delete state[field]; else state[field] = bundle.primary[field];
    }
    state.islandName = `${bundle.primary.islandName || 'Your island'} - ${state.islandSuffix || state.islandName || id}`;
  }
  bundle.secondary = bundle.worlds['island-2'] || null;
  return bundle;
}
function closeSecondaryTutorial(state) {
  const previous = object(state.tutorial) ? state.tutorial : {};
  state.tutorial = { ...previous, rewardDisabled: true, autoOpenDisabled: true,
    completed: Object.fromEntries(TUTORIAL_LESSONS.map(lesson => [lesson.id, true])),
    claimed: Object.fromEntries(TUTORIAL_LESSONS.map(lesson => [lesson.id, true])), chests: {} };
}
function capacityReceipts(value = []) {
  if (!Array.isArray(value)) throw invalid('Invalid ship-capacity receipt ledger.');
  const seen = new Set();
  return value.map(receipt => {
    if (!object(receipt) || typeof receipt.id !== 'string' || receipt.id.length < 1 || receipt.id.length > 160 ||
      seen.has(receipt.id) || !integer(receipt.units) || receipt.units < 1 || receipt.units > ARCHIPELAGO_RULES.maximumUnitsPerCheckout ||
      receipt.grossGrosz !== receipt.units * ARCHIPELAGO_RULES.capacityUnitGrosz || receipt.simulated !== true || !integer(receipt.at)) {
      throw invalid('Invalid ship-capacity receipt.');
    }
    seen.add(receipt.id); return clone(receipt);
  });
}
function transferRecord(value, bundle) {
  if (!object(value) || ![undefined,'cargo','passengers'].includes(value.mode) || typeof value.id !== 'string' || !/^voyage-[1-9][0-9]*$/.test(value.id) ||
    !worldFor(bundle, value.fromIslandId) || !worldFor(bundle, value.toIslandId) || value.fromIslandId === value.toIslandId ||
    !['sailing', 'waiting', 'complete'].includes(value.status) || !integer(value.departedAt) || !integer(value.arrivesAt) ||
    value.arrivesAt !== value.departedAt + (value.mode === 'passengers' ? ARCHIPELAGO_RULES.passengerVoyageSeconds : ARCHIPELAGO_RULES.voyageSeconds) * 1000 ||
    !integer(value.capacityAtDeparture) || (value.mode === 'passengers' ? value.capacityAtDeparture !== 100 : value.capacityAtDeparture < ARCHIPELAGO_RULES.baseShipCapacity || value.capacityAtDeparture > bundle.shipCapacity)) throw invalid('Invalid island voyage.');
  if (value.mode === 'passengers') {
    if (!integer(value.passengerCount) || value.passengerCount < 1 || value.passengerCount > 100 || !Array.isArray(value.passengers) || !Array.isArray(value.passengerIds) || value.passengerIds.length !== value.passengerCount || new Set(value.passengerIds).size !== value.passengerCount || value.mealFood !== value.passengerCount / 2 || !['sailing','complete'].includes(value.status) ||
      value.status === 'sailing' && (value.passengers.length !== value.passengerCount || value.deliveredAt !== null) ||
      value.status === 'complete' && (value.passengers.length || !integer(value.deliveredAt) || value.deliveredAt < value.arrivesAt) ||
      value.passengers.some(person => !object(person) || !Number.isSafeInteger(person.id) || person.id < 1 || typeof person.personUid !== 'string' || !/^[A-Za-z0-9:_-]{1,100}$/.test(person.personUid) || !value.passengerIds.includes(person.personUid) || !Number.isFinite(person.happiness) || !residentAtHome(person) || ['newbornRemaining','hungerSeconds','fedRecoverySeconds','unemployedSeconds','arrivalRemaining','returnRemaining','prayerRemaining','blockedSeconds','visitHappinessRemaining','visitCooldownRemaining'].some(field => !Number.isFinite(person[field]) || person[field] < 0)) ||
      value.status === 'sailing' && new Set(value.passengers.map(person => person.personUid)).size !== value.passengerCount ||
      worlds(bundle).some(([,state]) => state.residents.some(person => value.status === 'sailing' && value.passengerIds.includes(person.personUid)))) throw invalid('Invalid passenger voyage.');
    return clone(value);
  }
  const cargo = asCargo(value.cargo), bonusCargo = asCargo(value.bonusCargo, { empty: true });
  const remainingCargo = asCargo(value.remainingCargo, { empty: true }), remainingBonusCargo = asCargo(value.remainingBonusCargo, { empty: true });
  if (!cargo || !bonusCargo || !remainingCargo || !remainingBonusCargo || total(cargo) > value.capacityAtDeparture ||
    MATERIAL_IDS.some(id => (bonusCargo[id] || 0) > (cargo[id] || 0) ||
      (remainingCargo[id] || 0) > (cargo[id] || 0) || (remainingBonusCargo[id] || 0) > (bonusCargo[id] || 0) ||
      (remainingBonusCargo[id] || 0) > (remainingCargo[id] || 0)) ||
    value.status === 'complete' && (total(remainingCargo) > 0 || !integer(value.deliveredAt) || value.deliveredAt < value.arrivesAt) ||
    value.status !== 'complete' && (!total(remainingCargo) || value.deliveredAt !== null) ||
    value.status === 'sailing' && MATERIAL_IDS.some(id => (remainingCargo[id] || 0) !== (cargo[id] || 0) || (remainingBonusCargo[id] || 0) !== (bonusCargo[id] || 0))) {
    throw invalid('Invalid island-voyage cargo.');
  }
  return { ...clone(value), cargo, bonusCargo, remainingCargo, remainingBonusCargo };
}

/** Restore a legacy single-world payload or the versioned two-world extension.
 * Invalid metadata is rejected instead of losing the second island or cargo.
 */
export function restoreArchipelago(raw, adapters, now = Date.now()) {
  if (typeof raw === 'string') raw = JSON.parse(raw);
  if (!worldShape(raw) || typeof adapters?.normalizeState !== 'function' || typeof adapters?.createState !== 'function' || typeof adapters?.advanceTo !== 'function') {
    throw invalid('World simulation adapters and a saved island are required.');
  }
  const source = clone(raw), metadata = source.archipelago;
  delete source.archipelago;
  if (metadata !== undefined && (!object(metadata) || ![1,2].includes(metadata.version) || !ISLAND_IDS.includes(metadata.activeIslandId))) throw invalid('Invalid archipelago metadata.');
  const primary = adapters.normalizeState(source, now);
  primary.islandId = 'island-1'; primary.islandRole = 'mother';
  const children = metadata?.version === 1 ? (metadata.secondIsland === null ? {} : { 'island-2': metadata.secondIsland }) : metadata?.islands || {};
  if (!object(children) || Object.keys(children).length > 19) throw invalid('Invalid archipelago worlds.');
  const ids = Object.keys(children).sort((a,b) => ISLAND_IDS.indexOf(a)-ISLAND_IDS.indexOf(b));
  if (ids.some((id,index) => id !== `island-${index+2}`)) throw invalid('Invalid archipelago island sequence.');
  const restored = { 'island-1': primary };
  for (const id of ids) {
    const saved = children[id];
    if (!worldShape(saved) || saved.archipelago !== undefined) throw invalid('Invalid or nested daughter-island payload.');
    const candidate = clone(saved);
    candidate.islandId = id; candidate.islandRole = 'daughter';
    if (metadata?.version === 1) for (const person of candidate.residents || []) person.personUid = `${id}:resident-${person.id}`;
    const prefix = `${primary.islandName || 'Your island'} - `;
    candidate.islandSuffix = saved.islandSuffix || (saved.islandName?.startsWith(prefix) ? saved.islandName.slice(prefix.length) : saved.islandName) || id;
    for (const field of SHARED_ACCOUNT_FIELDS) if (primary[field] !== undefined) candidate[field] = clone(primary[field]);
    restored[id] = adapters.normalizeState(candidate, now);
    restored[id].islandSuffix = candidate.islandSuffix;
    closeSecondaryTutorial(restored[id]);
  }
  // World recreation retains account commerce even if both world snapshots
  // expired. Permanent paid ship capacity can be reconstructed from that
  // canonical payment history, without retaining an expired second island.
  const retainedReceipts = metadata === undefined ? (primary.commerce?.receipts || []).filter(payment => payment.kind === 'ship-capacity').map(payment => ({
    id: payment.id, units: payment.grossGrosz / ARCHIPELAGO_RULES.capacityUnitGrosz,
    grossGrosz: payment.grossGrosz, simulated: payment.simulated, at: payment.at
  })) : metadata.capacityReceipts;
  const receipts = capacityReceipts(retainedReceipts);
  if (receipts.length && productionRuntime(adapters)) throw invalid('Simulated ship-capacity purchases cannot be restored as production entitlements.');
  if (receipts.some(receipt => !primary.commerce?.receipts?.some(payment => payment.id === receipt.id &&
    payment.kind === 'ship-capacity' && payment.grossGrosz === receipt.grossGrosz && payment.simulated === true))) {
    throw invalid('Ship capacity is missing its matching account payment receipt.');
  }
  const shipCapacity = ARCHIPELAGO_RULES.baseShipCapacity + receipts.reduce((sum, item) => sum + item.units * ARCHIPELAGO_RULES.capacityUnit, 0);
  if (!Number.isSafeInteger(shipCapacity) || metadata && metadata.shipCapacity !== shipCapacity ||
    metadata?.activeIslandId && !restored[metadata.activeIslandId] || metadata && !integer(metadata.sequence)) throw invalid('Invalid archipelago capacity or active island.');
  const bundle = { version: 2, primary, secondary: restored['island-2'] || null, worlds: restored, activeIslandId: metadata?.activeIslandId || 'island-1',
    sequence: metadata?.sequence || 0, shipCapacity, capacityReceipts: receipts, transfers: [] };
  for (const [field,id] of [['primary','island-1'],['secondary','island-2']]) Object.defineProperty(bundle,field,{ enumerable:true, configurable:true, get: () => bundle.worlds[id] || null, set: value => { if (value) bundle.worlds[id] = value; else delete bundle.worlds[id]; } });
  if (metadata && !Array.isArray(metadata.transfers)) throw invalid('Invalid voyage ledger.');
  bundle.transfers = (metadata?.transfers || []).map(value => transferRecord(value, bundle));
  if (new Set(bundle.transfers.map(item => item.id)).size !== bundle.transfers.length ||
    bundle.transfers.filter(item => item.status !== 'complete').length > 1 ||
    bundle.transfers.some(item => Number(item.id.slice(7)) > bundle.sequence)) throw invalid('Duplicate or concurrent island voyages.');
  for (const [,state] of worlds(bundle)) state.incomingPassengers = 0;
  for (const transfer of bundle.transfers) if (transfer.mode === 'passengers' && transfer.status !== 'complete') worldFor(bundle, transfer.toIslandId).incomingPassengers += transfer.passengerCount;
  adaptersFor.set(bundle, adapters); return bindAccount(bundle);
}

// These fields have an exact zero/null/false default in normalizeResidents.
// Happiness and numeric snapshots deliberately remain, including meaningful 0.
const ZERO_RESIDENT_FIELDS = new Set(['newbornRemaining', 'hungerSeconds', 'fedRecoverySeconds', 'unemployedSeconds', 'arrivalRemaining', 'returnRemaining', 'prayerRemaining', 'blockedSeconds', 'visitHappinessRemaining', 'visitCooldownRemaining']);
const NULL_RESIDENT_FIELDS = new Set(['workplace', 'returnFrom', 'visitGroup', 'forcedHappinessSnapshot', 'preVisitHappiness', 'globalLighthouseSnapshot']);
export function compactResidentSnapshot(person) {
  return Object.fromEntries(Object.entries(person).filter(([key, value]) =>
    !(value === 0 && ZERO_RESIDENT_FIELDS.has(key)) && !(value === null && NULL_RESIDENT_FIELDS.has(key)) && !(key === 'pendingRelease' && value === false)));
}
function compactWorld(state) {
  const world = clone(state); delete world.archipelago;
  if (Array.isArray(world.residents)) world.residents = world.residents.map(compactResidentSnapshot);
  return world;
}
function retainedVoyages(bundle) {
  const completed = bundle.transfers.filter(item => item.status === 'complete').slice(-ARCHIPELAGO_RULES.completedVoyageHistory);
  const keep = new Set(completed);
  return bundle.transfers.filter(item => item.status !== 'complete' || keep.has(item));
}
export function serializeArchipelago(bundle) {
  // Commands normally mutate the shared object, but some replace it outright
  // (for example a premium package or complete settings object). Capture the
  // active world's replacement before rebinding aliases to the account root.
  if (bundle.activeIslandId !== 'island-1' && activeIsland(bundle)) {
    for (const field of SHARED_ACCOUNT_FIELDS) {
      if (activeIsland(bundle)[field] !== undefined) bundle.primary[field] = activeIsland(bundle)[field];
    }
  }
  bindAccount(bundle);
  const primary = compactWorld(bundle.primary), daughters = {};
  for (const [id,state] of worlds(bundle)) if (id !== 'island-1') {
    const saved = compactWorld(state);
    for (const field of SHARED_ACCOUNT_FIELDS) delete saved[field];
    daughters[id] = saved;
  }
  primary.archipelago = { version: 2, activeIslandId: bundle.activeIslandId, islands: daughters,
    sequence: bundle.sequence, transfers: clone(retainedVoyages(bundle)), shipCapacity: bundle.shipCapacity,
    capacityReceipts: clone(bundle.capacityReceipts) };
  return primary;
}
export const activeIsland = bundle => worldFor(bundle, bundle.activeIslandId);
export const isPrimaryIsland = bundle => bundle.activeIslandId === 'island-1';

export function advanceArchipelago(bundle, now = Date.now()) {
  const adapters = adaptersFor.get(bundle);
  if (!adapters) throw new Error('Restore the archipelago before advancing it.');
  const at = clock(bundle, now), voyage = busyVoyage(bundle);
  if (voyage?.status === 'sailing' && voyage.arrivesAt <= at) {
    for (const [,state] of worlds(bundle)) adapters.advanceTo(state, voyage.arrivesAt);
    if (voyage.mode === 'passengers') unloadPassengers(bundle, voyage, voyage.arrivesAt); else unloadCargo(bundle, voyage, voyage.arrivesAt);
  }
  for (const [,state] of worlds(bundle)) adapters.advanceTo(state, at);
  bindAccount(bundle); return activeIsland(bundle);
}
export function switchIsland(bundle, islandId, now = Date.now()) {
  if (!worldFor(bundle, islandId)) return bad('Choose an existing island.');
  advanceArchipelago(bundle, now); bundle.activeIslandId = islandId;
  return good('Island selected.', { state: activeIsland(bundle), islandId });
}
export function quoteNextIsland(bundle, { name = '' } = {}, now = Date.now()) {
  const count = worlds(bundle).length, ordinal = count;
  const requiredLevel = ARCHIPELAGO_RULES.secondIslandLevel + (ordinal - 1) * ARCHIPELAGO_RULES.islandLevelStep;
  const valuationLevel = ordinal + 6, amount = 500 * valuationLevel * (valuationLevel - 1);
  const cost = Object.fromEntries(['coins', ...MATERIAL_IDS].map(id => [id, amount]));
  const details = { ordinal, islandId: `island-${count+1}`, requiredLevel, valuationLevel, cost, colonists: 6 };
  if (count >= ARCHIPELAGO_RULES.maximumIslands) return { ...bad('Your archipelago already has the maximum of 20 islands.'), ...details };
  if (bundle.primary.buildings.townhall.level < requiredLevel) return { ...bad(`Reach Town Hall level ${requiredLevel} on your mother island first.`), ...details };
  if (bundle.primary.population < 18 || bundle.primary.residents.filter(residentAtHome).length < 6) return { ...bad('Founding requires 18 residents on the mother island, including six actually at Home; twelve must remain.'), ...details };
  if (Object.entries(cost).some(([id, value]) => (id === 'coins' ? bundle.primary.resources.coins : availableGoods(bundle.primary,id)) < value)) return { ...bad('Founding requires the displayed cumulative cost in available coins and all five materials, above protected Food.'), ...details };
  if (name) {
    const chosen = validateIslandName(name);
    if (!chosen.ok) return { ...bad(chosen.message), ...details };
    if (worlds(bundle).some(([id,state]) => id !== 'island-1' && state.islandSuffix?.normalize('NFKC').toLocaleLowerCase() === chosen.name.normalize('NFKC').toLocaleLowerCase())) return { ...bad('Choose a different daughter-island suffix.'), ...details };
    details.suffix = chosen.name;
  }
  return good('Six residents teleport immediately from Home. The mother island keeps at least twelve.', details);
}
export function createNextIsland(bundle, { name = '' } = {}, now = Date.now()) {
  advanceArchipelago(bundle, now);
  const chosen = validateIslandName(name); if (!chosen.ok) return bad(chosen.message);
  const quote = quoteNextIsland(bundle, { name: chosen.name }, now); if (!quote.ok) return quote;
  const at = clock(bundle, now), adapters = adaptersFor.get(bundle), fresh = adapters.createState(at, { onboarding: false });
  for (const building of Object.values(fresh.buildings)) building.level = 1;
  fresh.buildings.townhall.level = bundle.primary.buildings.townhall.level;
  fresh.buildings.warehouse.level = bundle.primary.buildings.warehouse.level;
  const colonists = bundle.primary.residents.filter(residentAtHome).slice(0, 6);
  for (const [id,value] of Object.entries(quote.cost)) consumeMaterial(bundle.primary,id,value);
  const transferredIds = new Set(colonists.map(person => person.personUid));
  bundle.primary.residents = bundle.primary.residents.filter(person => !transferredIds.has(person.personUid));
  bundle.primary.population = bundle.primary.residents.length;
  fresh.residents = colonists.map((person,index) => ({ ...clone(person), id: index+1 }));
  fresh.residentSequence = 6; fresh.population = 6;
  fresh.islandId = quote.islandId; fresh.islandRole = 'daughter'; fresh.islandSuffix = chosen.name;
  fresh.islandName = `${bundle.primary.islandName || 'Your island'} - ${chosen.name}`; fresh.islandNameUpdatedAt = at;
  fresh.objective = { ...fresh.objective, repaired: true };
  // Founding is funded by the mother, never a repeatable new-player reward.
  fresh.resources = Object.fromEntries(['coins', ...MATERIAL_IDS].map(id => [id, 0]));
  for (const field of SHARED_ACCOUNT_FIELDS) if (bundle.primary[field] !== undefined) fresh[field] = clone(bundle.primary[field]);
  fresh.houseHappinessPool = { ...fresh.houseHappinessPool, points: 6, grantPopulation: 6 };
  const state = adapters.normalizeState(fresh, at); state.islandSuffix = chosen.name;
  bundle.worlds[quote.islandId] = state; closeSecondaryTutorial(state);
  bindAccount(bundle);
  return good('Your daughter island is ready. Six existing residents teleported from Home; its Town Hall and Warehouse inherited their levels once.', { state, islandId: quote.islandId, quote });
}
// Compatibility name for existing callers: it now creates the next allowed island.
export const createSecondIsland = createNextIsland;
export function renameArchipelagoIsland(bundle, islandId, name, now = Date.now()) {
  const state = worldFor(bundle,islandId), chosen = validateIslandName(name);
  if (!state || !chosen.ok) return bad(chosen.message || 'Choose an existing island.');
  if (islandId === 'island-1') state.islandName = chosen.name;
  else state.islandSuffix = chosen.name;
  state.islandNameUpdatedAt = clock(bundle,now); bindAccount(bundle);
  return good('Your island name has been saved.', { name: state.islandName });
}

export function quoteIslandTransfer(bundle, { fromIslandId = bundle.activeIslandId, toIslandId, cargo } = {}, now = Date.now()) {
  if (!bundle.secondary) return bad('Found your second island before transporting goods between islands.');
  const from = worldFor(bundle, fromIslandId), to = worldFor(bundle, toIslandId), contents = asCargo(cargo);
  if (!from || !to || fromIslandId === toIslandId) return bad('Choose two different islands.');
  if (!contents) return bad('Choose positive whole quantities of materials. Coins cannot be transported.');
  if (!(from.buildings?.dock?.level > 0) || !(to.buildings?.dock?.level > 0)) return bad('Both islands need a Harbor.');
  if (busyVoyage(bundle)) return bad('The ship is busy. Finish unloading its current cargo first.');
  if (total(contents) > bundle.shipCapacity) return bad('This cargo exceeds the ship capacity.');
  if (MATERIAL_IDS.some(id => (contents[id] || 0) > availableGoods(from, id))) return bad('Use available central stock; reserved goods and the protected Food reserve cannot be shipped.');
  if (!Number.isSafeInteger(bundle.sequence + 1)) return bad('The voyage history has reached its supported limit.');
  const at = clock(bundle, now);
  if (!Number.isSafeInteger(at + ARCHIPELAGO_RULES.voyageSeconds * 1000)) return bad('The voyage arrival time exceeds the supported clock.');
  return good('Free transport takes 10 real minutes.', { fromIslandId, toIslandId, cargo: contents,
    amount: total(contents), capacity: bundle.shipCapacity, coins: 0, seconds: ARCHIPELAGO_RULES.voyageSeconds,
    departedAt: at, arrivesAt: at + ARCHIPELAGO_RULES.voyageSeconds * 1000 });
}
export function sendIslandTransfer(bundle, action = {}, now = Date.now()) {
  advanceArchipelago(bundle, now);
  const quote = quoteIslandTransfer(bundle, action, now);
  if (!quote.ok) return quote;
  const from = worldFor(bundle, quote.fromIslandId);
  const bonuses = Object.fromEntries(Object.entries(quote.cargo).map(([id, amount]) => [id, Math.min(amount, bonusStock(from, id))]).filter(([, amount]) => amount > 0));
  for (const [id, amount] of Object.entries(quote.cargo)) consumeMaterial(from, id, amount);
  const transfer = { id: `voyage-${++bundle.sequence}`, status: 'sailing', fromIslandId: quote.fromIslandId, toIslandId: quote.toIslandId,
    mode: 'cargo', cargo: clone(quote.cargo), bonusCargo: bonuses, remainingCargo: clone(quote.cargo), remainingBonusCargo: clone(bonuses),
    capacityAtDeparture: bundle.shipCapacity, departedAt: quote.departedAt, arrivesAt: quote.arrivesAt, deliveredAt: null };
  bundle.transfers.push(transfer);
  bundle.transfers = retainedVoyages(bundle);
  return good('The ship departed. No coins were charged.', { transfer, quote });
}
function unloadCargo(bundle, transfer, now) {
  const destination = worldFor(bundle, transfer.toIslandId);
  for (const id of ['food', ...MATERIAL_IDS.filter(id => id !== 'food')]) {
    const bonus = transfer.remainingBonusCargo[id] || 0;
    const ordinary = (transfer.remainingCargo[id] || 0) - bonus;
    const accepted = Math.min(ordinary, stockRoom(destination, id));
    if ((destination.resources[id] || 0) + bonus + accepted > Number.MAX_SAFE_INTEGER) continue;
    if (bonus > 0) grantBonusMaterials(destination, { [id]: bonus });
    if (accepted > 0) destination.resources[id] += accepted;
    const remaining = ordinary - accepted;
    if (remaining > 0) transfer.remainingCargo[id] = remaining; else delete transfer.remainingCargo[id];
    delete transfer.remainingBonusCargo[id];
  }
  transfer.status = total(transfer.remainingCargo) ? 'waiting' : 'complete';
  if (transfer.status === 'complete') transfer.deliveredAt = now;
  return good(transfer.status === 'complete' ? 'Cargo unloaded.' : 'The remaining cargo is waiting visibly on the ship. Free warehouse space, then unload it.', { transfer, remaining: total(transfer.remainingCargo) });
}
export function unloadIslandTransfer(bundle, transferId, now = Date.now()) {
  advanceArchipelago(bundle, now);
  const transfer = bundle.transfers.find(item => item.id === transferId);
  if (!transfer) return bad('Choose an existing voyage.');
  if (transfer.status === 'sailing') return bad('The ship has not arrived yet.');
  if (transfer.status === 'complete') return good('This cargo has already been unloaded.', { transfer, duplicate: true });
  return transfer.mode === 'passengers' ? unloadPassengers(bundle, transfer, clock(bundle, now)) : unloadCargo(bundle, transfer, clock(bundle, now));
}

export const islandHasActiveVoyage = (bundle, islandId) => bundle.transfers.some(item => item.status !== 'complete' && [item.fromIslandId,item.toIslandId].includes(islandId));
export function quotePassengerTransfer(bundle, { fromIslandId = bundle.activeIslandId, toIslandId, passengerIds, amount } = {}, now = Date.now()) {
  const from=worldFor(bundle,fromIslandId), to=worldFor(bundle,toIslandId);
  if (!from || !to || fromIslandId===toIslandId) return bad('Choose two different existing islands.');
  if (!from.buildings?.dock?.level || !to.buildings?.dock?.level) return bad('Both islands need a Harbor.');
  if (busyVoyage(bundle)) return bad('The shared ship is busy with cargo or passengers.');
  if (passengerIds !== undefined && (!Array.isArray(passengerIds) || passengerIds.some(id => !Number.isSafeInteger(id) || id < 1))) return bad('Choose valid resident identifiers.');
  const home=from.residents.filter(residentAtHome);
  const count=passengerIds === undefined ? amount : passengerIds?.length;
  if (!Number.isSafeInteger(count) || count<1 || count>100) return bad('Choose between one and 100 passengers per voyage.');
  const chosen=passengerIds === undefined ? home.slice(0,count) : home.filter(person=>passengerIds.includes(person.id));
  if (chosen.length!==count || passengerIds && new Set(passengerIds).size!==count) return bad('All selected passengers must actually be at Home.');
  if (from.population-count < residentPopulationMinimum(from)) return bad(from.islandRole === 'daughter' ? 'At least six residents must remain on a daughter island.' : 'At least twelve residents must remain on the mother island.');
  const destinationLimit=Math.min(to.buildings.townhall.level*24,to.buildings.house.level*24);
  if (to.population+(to.incomingPassengers || 0)+count>destinationLimit) return bad('The destination needs free Town Hall population places and House beds for all passengers.');
  const mealFood=count/2;
  if ((from.foodCredit || 0)+Math.floor(centralAvailable(from,'food'))+1e-9 < mealFood) return bad('Prepare normal meals for the thirty-minute voyage: half a Food per passenger. This is their ordinary meal, without a transport fee.');
  const at=clock(bundle,now);
  if (!Number.isSafeInteger(bundle.sequence+1) || !Number.isSafeInteger(at+1800000)) return bad('The voyage exceeds the supported clock or history.');
  return good('Passengers travel for thirty real minutes, using ordinary meals and no coin fee.', { fromIslandId,toIslandId,passengerIds:chosen.map(person=>person.id),personUids:chosen.map(person=>person.personUid),amount:count,capacity:100,seconds:1800,coins:0,mealFood,departedAt:at,arrivesAt:at+1800000 });
}
export function sendPassengerTransfer(bundle, action = {}, now = Date.now()) {
  advanceArchipelago(bundle,now);
  const quote=quotePassengerTransfer(bundle,action,now);if(!quote.ok)return quote;
  const from=worldFor(bundle,quote.fromIslandId), to=worldFor(bundle,quote.toIslandId);
  const chosen=new Set(quote.personUids), passengers=from.residents.filter(person=>chosen.has(person.personUid)).map(clone);
  const foodUnits=Math.max(0,Math.ceil(quote.mealFood-(from.foodCredit || 0)-1e-9));
  consumeMaterial(from,'food',foodUnits);from.foodCredit=(from.foodCredit || 0)+foodUnits-quote.mealFood;
  from.residents=from.residents.filter(person=>!chosen.has(person.personUid));from.population=from.residents.length;
  to.incomingPassengers=(to.incomingPassengers || 0)+quote.amount;
  const transfer={ id:`voyage-${++bundle.sequence}`,mode:'passengers',status:'sailing',fromIslandId:quote.fromIslandId,toIslandId:quote.toIslandId,
    departedAt:quote.departedAt,arrivesAt:quote.arrivesAt,deliveredAt:null,capacityAtDeparture:100,
    passengers,passengerIds:quote.personUids,passengerCount:quote.amount,mealFood:quote.mealFood,passengerWelcome:clone(from.welcome),
    cargo:{},bonusCargo:{},remainingCargo:{},remainingBonusCargo:{} };
  bundle.transfers.push(transfer);bundle.transfers=retainedVoyages(bundle);
  return good('Passengers departed. Their ordinary meals are packed; no transport fee was charged.',{transfer,quote});
}
function advancePassengerClock(transfer) {
  // No jobs, island plague or population generation at sea. Personal need and
  // recovery timers still run; prepaid ordinary meals are not a new bonus.
  const residents=transfer.passengers;
  const state={ residents,population:residents.length,worldTimeMs:transfer.departedAt,resources:{food:1},foodCredit:1,
    buildings:{house:{level:Math.ceil(residents.length/24)},chapel:{level:0}},welcome:clone(transfer.passengerWelcome),
    lighthouseRemaining:0,chapelRemaining:0,blessingRemaining:0,lighthouseVisits:[],lighthouseVisitBonuses:[],visitEntryHistory:[],visitPackages:[],
    worldEvents:{effects:[]},leisure:{effects:[]},lighthouseSnapshotActive:false };
  let remaining=1800;
  while(remaining>1e-7){
    const segment=residentSegments(state), duration=Math.min(remaining,segment.nextEvent);
    if (!(duration>1e-8)) throw invalid('Invalid passenger clock boundary.');
    advanceResidents(segment,duration);state.worldTimeMs+=duration*1000;remaining-=duration;
  }
}
function unloadPassengers(bundle,transfer,now){
  if(transfer.status==='complete')return good('Passengers have already arrived.',{transfer,duplicate:true});
  const to=worldFor(bundle,transfer.toIslandId);
  advancePassengerClock(transfer);
  const used=new Set(to.residents.map(person=>person.id));
  for(const person of transfer.passengers){
    let id=Math.max(1,(to.residentSequence || 0)+1);while(used.has(id))id++;
    used.add(id);to.residentSequence=id;to.residents.push({...clone(person),id});
  }
  to.population=to.residents.length;to.incomingPassengers=Math.max(0,(to.incomingPassengers || 0)-transfer.passengerCount);
  transfer.passengers=[];transfer.status='complete';transfer.deliveredAt=now;
  return good('Passengers arrived at Home. Their identities and personal progress were preserved.',{transfer});
}

export function quoteShipCapacity(bundle, { units = 1 } = {}) {
  if (!bundle.secondary) return bad('Found a second island before expanding the transport ship.');
  if (!integer(units) || units < 1 || units > ARCHIPELAGO_RULES.maximumUnitsPerCheckout) return bad('Choose between 1 and 100 capacity increments per purchase.');
  const additionalCapacity = units * ARCHIPELAGO_RULES.capacityUnit;
  if (!Number.isSafeInteger(bundle.shipCapacity + additionalCapacity)) return bad('The supported ship-capacity limit has been reached.');
  return good('Permanent ship capacity quote.', { units, additionalCapacity,
    grossGrosz: units * ARCHIPELAGO_RULES.capacityUnitGrosz, resultingCapacity: bundle.shipCapacity + additionalCapacity,
    provider: 'Paynow' });
}
export function completeShipCapacityPurchase(bundle, { units = 1, receiptId } = {}, context = {}, now = Date.now()) {
  if (productionRuntime(adaptersFor.get(bundle)) || !['development', 'preprod'].includes(context.environment) || context.devSimulation !== true) return bad('Real ship-capacity payments are not enabled. No money was charged.');
  if (typeof receiptId !== 'string' || !receiptId || receiptId.length > 160) return bad('A valid simulated payment receipt is required.');
  const previous = bundle.capacityReceipts.find(receipt => receipt.id === receiptId);
  if (previous) return previous.units === units ? good('This capacity purchase was already applied.', { duplicate: true, capacity: bundle.shipCapacity }) : bad('This receipt belongs to a different capacity purchase.');
  if (bundle.primary.commerce?.receipts?.some(receipt => receipt.id === receiptId)) return bad('This payment receipt has already been used for a different purchase.');
  const quote = quoteShipCapacity(bundle, { units });
  if (!quote.ok) return quote;
  bundle.capacityReceipts.push({ id: receiptId, units, grossGrosz: quote.grossGrosz, simulated: true, at: clock(bundle, now) });
  bundle.primary.commerce.receipts.push({ id: receiptId, at: clock(bundle, now), grossGrosz: quote.grossGrosz,
    provider: 'Paynow', simulated: true, verified: false, kind: 'ship-capacity' });
  bundle.shipCapacity = quote.resultingCapacity;
  return good('DEV payment simulation completed. No real money was charged.', { capacity: bundle.shipCapacity, quote, simulated: true });
}
export function archipelagoStatus(bundle, now = Date.now()) {
  const at = clock(bundle, now), busy = busyVoyage(bundle);
  const nextIsland = quoteNextIsland(bundle, {}, now);
  return { activeIslandId: bundle.activeIslandId, canFoundSecondIsland: nextIsland.ordinal < 20 && bundle.primary.buildings.townhall.level >= nextIsland.requiredLevel, nextIsland,
    worlds: ISLAND_IDS.filter(id => worldFor(bundle, id)).map(id => ({ id, name: worldFor(bundle, id).islandName, suffix: worldFor(bundle,id).islandSuffix || '', population: worldFor(bundle,id).population,
      theme: id === 'island-1' ? 'harbor' : 'sunset', townhallLevel: worldFor(bundle, id).buildings.townhall.level,
      warehouseLevel: worldFor(bundle, id).buildings.warehouse.level })), shipCapacity: bundle.shipCapacity,
    passengerCapacity: 100, passengerVoyageSeconds: 1800, busy: !!busy, activeTransfer: busy ? { ...clone(busy), remainingSeconds: Math.max(0, (busy.arrivesAt - at) / 1000), amountRemaining: busy.mode === 'passengers' ? busy.passengerCount : total(busy.remainingCargo) } : null,
    transfers: clone(bundle.transfers), capacityUnit: ARCHIPELAGO_RULES.capacityUnit, capacityUnitGrosz: ARCHIPELAGO_RULES.capacityUnitGrosz };
}
