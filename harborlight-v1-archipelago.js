// One cloud document owns both worlds. The root of its serialized payload is
// always island-1, so legacy account APIs never mistake island-2 for the first.
// Simulation is injected: this module does not import the state coordinator.
import { MATERIAL_IDS, availableGoods, stockRoom } from './harborlight-v1-logistics.js?v=frontend-v22-1';
import { bonusStock, consumeMaterial, grantBonusMaterials } from './harborlight-v1-inventory.js?v=frontend-v22-1';
import { TUTORIAL_LESSONS } from './harborlight-v1-progression.js?v=frontend-v22-1';
import { validateIslandName } from './harborlight-v1-profile.js?v=frontend-v22-1';

export const ISLAND_IDS = Object.freeze(['island-1', 'island-2']);
export const ARCHIPELAGO_RULES = Object.freeze({ version: 1, secondIslandLevel: 10,
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
const worldFor = (bundle, id) => id === 'island-1' ? bundle.primary : id === 'island-2' ? bundle.secondary : null;
const clock = (bundle, now) => {
  const at = Math.floor(Number.isFinite(now) ? now : Math.max(bundle.primary.worldTimeMs || 0, bundle.secondary?.worldTimeMs || 0));
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
  if (bundle.secondary) for (const field of SHARED_ACCOUNT_FIELDS) {
    if (bundle.primary[field] === undefined) delete bundle.secondary[field];
    else bundle.secondary[field] = bundle.primary[field];
  }
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
  if (!object(value) || typeof value.id !== 'string' || !/^voyage-[1-9][0-9]*$/.test(value.id) ||
    !worldFor(bundle, value.fromIslandId) || !worldFor(bundle, value.toIslandId) || value.fromIslandId === value.toIslandId ||
    !['sailing', 'waiting', 'complete'].includes(value.status) || !integer(value.departedAt) || !integer(value.arrivesAt) ||
    value.arrivesAt !== value.departedAt + ARCHIPELAGO_RULES.voyageSeconds * 1000 ||
    !integer(value.capacityAtDeparture) || value.capacityAtDeparture < ARCHIPELAGO_RULES.baseShipCapacity || value.capacityAtDeparture > bundle.shipCapacity) throw invalid('Invalid island voyage.');
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
  if (metadata !== undefined && (!object(metadata) || metadata.version !== ARCHIPELAGO_RULES.version ||
    !ISLAND_IDS.includes(metadata.activeIslandId) || metadata.secondIsland !== null && !object(metadata.secondIsland))) throw invalid('Invalid archipelago metadata.');
  const primary = adapters.normalizeState(source, now);
  let secondary = null;
  if (metadata?.secondIsland) {
    if (!worldShape(metadata.secondIsland) || metadata.secondIsland.archipelago !== undefined) throw invalid('Invalid or nested second-island payload.');
    const candidate = clone(metadata.secondIsland);
    for (const field of SHARED_ACCOUNT_FIELDS) if (primary[field] !== undefined) candidate[field] = clone(primary[field]);
    secondary = adapters.normalizeState(candidate, now); closeSecondaryTutorial(secondary);
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
    metadata?.activeIslandId === 'island-2' && !secondary || metadata && !integer(metadata.sequence)) throw invalid('Invalid archipelago capacity or active island.');
  const bundle = { version: 1, primary, secondary, activeIslandId: metadata?.activeIslandId || 'island-1',
    sequence: metadata?.sequence || 0, shipCapacity, capacityReceipts: receipts, transfers: [] };
  if (metadata && !Array.isArray(metadata.transfers)) throw invalid('Invalid voyage ledger.');
  bundle.transfers = (metadata?.transfers || []).map(value => transferRecord(value, bundle));
  if (new Set(bundle.transfers.map(item => item.id)).size !== bundle.transfers.length ||
    bundle.transfers.filter(item => item.status !== 'complete').length > 1 ||
    bundle.transfers.some(item => Number(item.id.slice(7)) > bundle.sequence)) throw invalid('Duplicate or concurrent island voyages.');
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
  if (bundle.activeIslandId === 'island-2' && bundle.secondary) {
    for (const field of SHARED_ACCOUNT_FIELDS) {
      if (bundle.secondary[field] !== undefined) bundle.primary[field] = bundle.secondary[field];
    }
  }
  bindAccount(bundle);
  const primary = compactWorld(bundle.primary), secondary = bundle.secondary ? compactWorld(bundle.secondary) : null;
  if (secondary) for (const field of SHARED_ACCOUNT_FIELDS) delete secondary[field];
  primary.archipelago = { version: 1, activeIslandId: bundle.activeIslandId, secondIsland: secondary,
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
    adapters.advanceTo(bundle.primary, voyage.arrivesAt);
    if (bundle.secondary) adapters.advanceTo(bundle.secondary, voyage.arrivesAt);
    unloadCargo(bundle, voyage, voyage.arrivesAt);
  }
  adapters.advanceTo(bundle.primary, at);
  if (bundle.secondary) adapters.advanceTo(bundle.secondary, at);
  bindAccount(bundle); return activeIsland(bundle);
}
export function switchIsland(bundle, islandId, now = Date.now()) {
  if (!worldFor(bundle, islandId)) return bad('Choose an existing island.');
  advanceArchipelago(bundle, now); bundle.activeIslandId = islandId;
  return good('Island selected.', { state: activeIsland(bundle), islandId });
}
export function createSecondIsland(bundle, { name = '' } = {}, now = Date.now()) {
  if (bundle.secondary) return bad('Your second island has already been founded.');
  if ((bundle.primary.buildings?.townhall?.level || 0) < ARCHIPELAGO_RULES.secondIslandLevel) return bad('Reach Town Hall level 10 on your first island to found a second island.');
  const chosenName = validateIslandName(name);
  if (!chosenName.ok) return bad(chosenName.message);
  const at = clock(bundle, now); advanceArchipelago(bundle, at);
  const adapters = adaptersFor.get(bundle), fresh = adapters.createState(at, { onboarding: false });
  for (const building of Object.values(fresh.buildings)) building.level = 1;
  fresh.buildings.townhall.level = bundle.primary.buildings.townhall.level;
  fresh.buildings.warehouse.level = bundle.primary.buildings.warehouse.level;
  fresh.islandName = chosenName.name; fresh.islandNameUpdatedAt = at;
  fresh.objective = { ...fresh.objective, repaired: true };
  for (const field of SHARED_ACCOUNT_FIELDS) if (bundle.primary[field] !== undefined) fresh[field] = clone(bundle.primary[field]);
  bundle.secondary = adapters.normalizeState(fresh, at); closeSecondaryTutorial(bundle.secondary);
  bindAccount(bundle);
  return good('Your second island is ready. Its Town Hall and Warehouse inherited their current levels once.', { state: bundle.secondary, islandId: 'island-2' });
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
    cargo: clone(quote.cargo), bonusCargo: bonuses, remainingCargo: clone(quote.cargo), remainingBonusCargo: clone(bonuses),
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
  return unloadCargo(bundle, transfer, clock(bundle, now));
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
  return { activeIslandId: bundle.activeIslandId, canFoundSecondIsland: !bundle.secondary && bundle.primary.buildings.townhall.level >= ARCHIPELAGO_RULES.secondIslandLevel,
    worlds: ISLAND_IDS.filter(id => worldFor(bundle, id)).map(id => ({ id, name: worldFor(bundle, id).islandName,
      theme: id === 'island-1' ? 'harbor' : 'sunset', townhallLevel: worldFor(bundle, id).buildings.townhall.level,
      warehouseLevel: worldFor(bundle, id).buildings.warehouse.level })), shipCapacity: bundle.shipCapacity,
    busy: !!busy, activeTransfer: busy ? { ...clone(busy), remainingSeconds: Math.max(0, (busy.arrivesAt - at) / 1000), amountRemaining: total(busy.remainingCargo) } : null,
    transfers: clone(bundle.transfers), capacityUnit: ARCHIPELAGO_RULES.capacityUnit, capacityUnitGrosz: ARCHIPELAGO_RULES.capacityUnitGrosz };
}
