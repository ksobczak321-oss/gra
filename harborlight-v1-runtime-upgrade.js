// Official-cloud runtime migration. No network access, clocks, or save writes.
// The caller chooses the runtime policy; historical preview fixtures stay legacy.
import { MATERIAL_IDS, RECIPE_CATALOG } from './harborlight-v1-provisions.js?v=frontend-v32-12';
import { unpackAdventureSave } from './harborlight-v1-save-packing.js?v=frontend-v32-12';
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const amount = value => Number.isFinite(Number(value)) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Number(value))) : 0;
const whole = value => Math.floor(amount(value));
const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
const clone = value => JSON.parse(JSON.stringify(value));
const LEGACY_PRODUCERS = Object.freeze({ farm: ['farmGrain', 'grain'], lumber: ['wood', 'wood'], quarry: ['stone', 'stone'], sawmill: ['planks', 'planks'], windmill: ['flour', 'food'] });

export function prepareRuntimeUpgrade(raw, { enabled = false } = {}) {
  if (!enabled || !object(raw) || raw.ruleset === 32 || Number(raw.ruleset) > 32) return raw;
  const saved = clone(unpackAdventureSave(raw));
  saved.ruleset = 32;
  saved.resources = { ...(saved.resources || {}) };
  // createState32 supplies starter vegetables. Existing accounts already have
  // their own inventory and must not receive another starter grant.
  for (const id of MATERIAL_IDS) if (!own(saved.resources, id)) saved.resources[id] = 0;
  // Legacy meals prepaid one whole food unit and consumed its fractional
  // credit later. The new feeder uses fractional inventory directly instead.
  const foodCredit = Math.min(1, amount(saved.foodCredit));
  saved.resources.food = Math.min(Number.MAX_SAFE_INTEGER, amount(saved.resources.food) + foodCredit);
  saved.foodCredit = 0;
  const provisions = saved.provisions = { ...(saved.provisions || {}) };
  provisions.people = { ...(provisions.people || {}) };
  for (const person of saved.residents || []) {
    const key = String(person?.personUid || `${saved.islandId || 'island-1'}:resident-${person?.id}`);
    if (!own(provisions.people, key)) provisions.people[key] = { hungerSeconds: amount(person?.hungerSeconds), fullFedSeconds: Math.min(3600, amount(person?.fedRecoverySeconds)), coverage: foodCredit > 0 || amount(saved.resources.food) >= 1 ? 1 : 0 };
  }
  provisions.assignments = { ...(provisions.assignments || {}) };
  provisions.localStock = { ...(provisions.localStock || {}) };
  provisions.productionProgress = { ...(provisions.productionProgress || {}) };
  provisions.legacyCrewAllowances = {};
  for (const [building, [recipeId, output]] of Object.entries(LEGACY_PRODUCERS)) {
    const b = saved.buildings?.[building];
    if (!object(b)) continue;
    const workers = Math.min(whole(b.workers), 24 * whole(b.level));
    const selected = object(provisions.assignments[building]) ? provisions.assignments[building] : { [recipeId]: workers };
    provisions.assignments[building] = selected;
    if (workers) provisions.legacyCrewAllowances[building] = { workers, recipes: Object.fromEntries(Object.entries(selected).filter(([id]) => RECIPE_CATALOG[id]?.building === building).map(([id, n]) => [id, Math.min(workers, whole(n))])) };
    const local = provisions.localStock[building] = { ...(provisions.localStock[building] || {}) };
    const ready = whole(b.ready), oldFarmFood = building === 'farm' && (!saved.version || saved.version < 5);
    if (output === 'food' || oldFarmFood) {
      // Old food is edible food, never flour. It enters the existing pending
      // delivery ledger, whose overflow remains queued instead of vanishing.
      if (ready) saved.pendingDeliveries = { ...(saved.pendingDeliveries || {}), food: whole(saved.pendingDeliveries?.food) + ready };
      b.ready = 0;
    } else if (!own(local, output)) local[output] = ready;
    if (!own(provisions.productionProgress, recipeId)) {
      const level = whole(b.level), oldRate = saved.productionRateVersion === 3 ? level ? 40 + 4 * (level - 1) : 0 : level === 1 ? 20 : level > 1 ? 2 * (level + 10) : 0;
      const rate = [2, 3].includes(saved.productionRateVersion) ? oldRate : oldRate / 2;
      const people = (saved.residents || []).filter(p => p?.workplace === building);
      provisions.productionProgress[recipeId] = Object.fromEntries(Array.from({ length: workers }, (_, index) => {
        const person = people[index], key = person ? String(person.personUid || `${saved.islandId || 'island-1'}:resident-${person.id}`) : `worker-${index}`;
        return [key, Math.min(1, amount(b.workProgress?.[index]) * rate / 3600)];
      }));
    }
  }
  return saved;
}

export function normalizeRuntimeWorld(raw, now, { upgradeRules = false, normalizeState } = {}) {
  if (typeof normalizeState !== 'function') throw new TypeError('A world normalizer is required.');
  if (upgradeRules && Number(raw?.ruleset) > 32) throw Object.assign(new Error('Ten zapis wymaga nowszej wersji gry.'), { code: 'invalid-cloud-data' });
  const prepared = prepareRuntimeUpgrade(raw, { enabled: upgradeRules });
  // Existing normalizers historically share some sidecar maps with their
  // argument. Official restores also detach already-modern saves before use.
  const source = upgradeRules && prepared === raw && object(prepared) ? clone(prepared) : prepared;
  const state = normalizeState(source, now);
  if (prepared !== raw) for (const [building, [recipeId]] of Object.entries(LEGACY_PRODUCERS)) {
    const progress = state.provisions?.productionProgress?.[recipeId], people = (state.residents || []).filter(p => p.workplace === building);
    if (!progress) continue;
    for (let index = 0; index < people.length; index++) if (own(progress, `worker-${index}`)) {
      const key = people[index].personUid;
      if (!own(progress, key)) progress[key] = progress[`worker-${index}`];
      delete progress[`worker-${index}`];
    }
  }
  if (upgradeRules && Array.isArray(source?.residents)) {
    // The historical resident decoder predates optional display names. Keep
    // names by persistent UID (and by numeric ID only when no UID was saved).
    const byUid = new Map(source.residents.filter(p => typeof p?.personUid === 'string').map(p => [p.personUid, p]));
    const byId = new Map(source.residents.filter(p => !p?.personUid).map(p => [p?.id, p]));
    for (const person of state.residents || []) {
      const saved = byUid.get(person.personUid) || byId.get(person.id);
      for (const field of ['name', 'nickname']) if (typeof saved?.[field] === 'string') person[field] = saved[field];
    }
  }
  return state;
}
