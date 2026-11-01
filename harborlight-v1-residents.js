// Persistent residents and visits. Every duration is a real elapsed second.
import { residentLeisureBonus } from './harborlight-v1-leisure.js?v=frontend-v26';
import { centralAvailable } from './harborlight-v1-inventory.js?v=frontend-v26';
import { worldEventHappinessPenalty } from './harborlight-v1-events.js?v=frontend-v26';
export const RESIDENT_WORKPLACES = ['farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'warehouse', 'dock', 'market'];
export const NEED_GRACE_SECONDS = 12 * 3600;
export const NEED_PENALTY = 5;
export const FED_RECOVERY_SECONDS = 3600;
export const WALK_SECONDS = 300;
export const LIGHTHOUSE_VISIT_SECONDS = 4 * 3600;
export const LIGHTHOUSE_PERSONAL_SECONDS = 24 * 3600;
// The population bonus lasts six hours; each dispatch group has its own clock.
export const LIGHTHOUSE_POPULATION_SECONDS = 6 * 3600;
export const NEWBORN_HAPPINESS_SECONDS = 24 * 3600;
export const residentHappinessFrozen = person => (person.newbornRemaining || 0) > 1e-7;
export const WELCOME_SECONDS = 72 * 3600;
export function welcomeStatus(state) {
  const until = Number.isFinite(state.welcome?.until) ? state.welcome.until : 0;
  const remaining = Math.max(0, (until - (state.worldTimeMs || 0)) / 1000);
  return { active: remaining > 1e-7, remaining, until, floor: remaining > 1e-7 ? 20 : 0 };
}
const EPS = 1e-7;
const bounded = (value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const elapsed = (clock, seconds) => clock - seconds > EPS ? clock - seconds : 0;
export const clampHappiness = value => Math.max(-100, Math.min(100, value));
export const hasFoodForResidents = state => state.foodCredit > 1e-12 || centralAvailable(state, 'food') >= 1;
export const productionMultiplier = state => hasFoodForResidents(state) ? 1 : 0.5;
const unlocked = (state, id) => state.buildings[id]?.level > 0 && state.buildings.townhall.level >= (id === 'market' ? 2 : id === 'dock' ? 4 : 1);
const reachedGrace = seconds => seconds >= NEED_GRACE_SECONDS - EPS;
const producerRecipes = { farm: null, lumber: null, quarry: null, windmill: 'grain', sawmill: 'wood' };
export const residentPopulationMinimum = state => state.islandRole === 'daughter' ? 6 : 12;
export const residentAtHome = person => !person.workplace && !person.visitGroup && !person.prayerRemaining && person.returnRemaining <= EPS && person.arrivalRemaining <= EPS;
export const workingResidents = (state, id) => (state.residents || []).filter(person => person.workplace === id && person.arrivalRemaining <= EPS && !person.visitGroup);
// Arrived employees continue paying taxes during a production blockage.
export const activeWorkerCount = (state, id) => workingResidents(state, id).length;
export const availableResidentCount = state => (state.residents || []).filter(residentAtHome).length;
export const visitCapacity = state => Math.max(0, 2 * (state.buildings.lighthouse?.level || 0));
export const visitOccupancy = state => (state.lighthouseVisits || []).reduce((sum, group) => sum + group.residentIds.length, 0);
export const canVisitLighthouse = (state, person) => residentAtHome(person) && person.visitCooldownRemaining <= EPS && visitCapacity(state) > visitOccupancy(state) && visitQuota(state).entriesRemaining > 0;
export function visitQuota(state) {
  const limit = visitCapacity(state);
  const history = (state.visitEntryHistory || []).filter(entry => entry.remaining > EPS);
  const packages = (state.visitPackages || []).filter(item => item.remaining > EPS);
  const freeUsed = history.reduce((sum, entry) => sum + entry.count, 0);
  const freeRemaining = Math.max(0, limit - freeUsed);
  const paidRemaining = packages.reduce((sum, item) => sum + item.entriesRemaining, 0);
  return { limit, freeUsed, freeRemaining, paidRemaining, entriesRemaining: freeRemaining + paidRemaining,
    packagesBought: packages.length, packagesRemaining: Math.max(0, 3 - packages.length),
    nextFreeIn: history.length ? Math.min(...history.map(entry => entry.remaining)) : 0 };
}
export function visitPackageQuote(state) {
  const quota = visitQuota(state), level = state.buildings.lighthouse?.level || 0;
  const ordinal = quota.packagesBought + 2;
  const cost = 300 * ordinal * level;
  return { ok: level > 0 && quota.packagesRemaining > 0, cost, ordinal, entries: 2 * level,
    remainingPurchases: quota.packagesRemaining,
    message: !level ? 'Build the Lighthouse first.' : quota.packagesRemaining ? `${2 * level} extra visitor entries for ${cost} coins. Entries expire after 24 hours.` : 'All three extra visitor packages in this 24-hour window have been purchased.' };
}
export function residentProductionBlocked(state, person) {
  if (!person.workplace || person.arrivalRemaining > EPS || !Object.hasOwn(producerRecipes, person.workplace)) return false;
  const building = state.buildings[person.workplace];
  const input = producerRecipes[person.workplace];
  return !!(building.ready >= 200 * building.level || (input && centralAvailable(state, input) < 2));
}
export const residentIsWorking = (state, person) => !!person.workplace && person.arrivalRemaining <= EPS && !person.visitGroup && !residentProductionBlocked(state, person);

function allocateId(state, used = new Set((state.residents || []).map(person => person.id))) {
  let id = (state.residentSequence || 0) + 1;
  if (!Number.isSafeInteger(id) || used.has(id)) { id = 1; while (used.has(id)) id++; }
  state.residentSequence = Math.max(state.residentSequence || 0, id);
  return id;
}
function newResident(state, happiness = 0, newborn = false) {
  const id = allocateId(state);
  return { id, personUid: `${state.islandId || 'island-1'}:resident-${id}`, happiness, hungerSeconds: 0, fedRecoverySeconds: 0, unemployedSeconds: 0,
    newbornRemaining: newborn ? NEWBORN_HAPPINESS_SECONDS : 0,
    workplace: null, arrivalRemaining: 0, returnRemaining: 0, returnFrom: null, blockedSeconds: 0,
    visitGroup: null, prayerRemaining: 0, visitHappinessRemaining: 0, visitCooldownRemaining: 0,
    pendingRelease: false, forcedHappinessSnapshot: state.lighthouseRemaining > EPS ? happiness : null,
    preVisitHappiness: null, globalLighthouseSnapshot: state.lighthouseRemaining > EPS ? happiness : null };
}
function releaseResidentNow(state, person) {
  const workplace = person.workplace;
  const crewIndex = state.residents.filter(resident => resident.workplace === person.workplace).indexOf(person);
  // Loaded cargo completes its course independently after a recall. Do not
  // attach it to a new resident who later occupies the same crew index.
  for (const trip of state.haulTrips?.[person.workplace] || []) {
    if (trip.worker === crewIndex) trip.worker = -1;
    else if (trip.worker > crewIndex) trip.worker--;
  }
  if (state.buildings[workplace]?.workProgress && crewIndex >= 0) state.buildings[workplace].workProgress.splice(crewIndex, 1);
  person.workplace = null; person.arrivalRemaining = 0; person.returnRemaining = WALK_SECONDS;
  person.returnFrom = workplace;
  person.pendingRelease = false; person.blockedSeconds = 0;
  if (state.buildings[workplace]) state.buildings[workplace].workers = state.residents.filter(resident => resident.workplace === workplace).length;
}
function loadedTrip(state, person) {
  const crewIndex = state.residents.filter(resident => resident.workplace === person.workplace).indexOf(person);
  return (state.haulTrips?.[person.workplace] || []).find(trip => trip.remaining > EPS &&
    (trip.residentId === person.id || !trip.residentId && trip.worker === crewIndex));
}
function releaseResident(state, person) {
  if (loadedTrip(state, person)) { person.pendingRelease = true; return; }
  releaseResidentNow(state, person);
}
// Call after the interval's resident clocks have advanced. A carrier finishes
// the already loaded trip before beginning a fresh five-minute walk home.
export function settleRecalledCarriers(state) {
  for (const person of state.residents || []) if (person.pendingRelease && !loadedTrip(state, person)) releaseResidentNow(state, person);
}
function emit(state, kind, title, message) {
  state.notificationSequence = (state.notificationSequence || 0) + 1;
  if (!Array.isArray(state.notifications)) state.notifications = [];
  state.notifications.unshift({ id: state.notificationSequence, kind, title, message, at: state.activeSeconds || 0, read: false });
  state.notifications.length = Math.min(100, state.notifications.length);
}

// Every continuously overlapping 100% effect shares the same original balance.
// Its independent timers do not create nested snapshots or restore early.
function settlePersonLighthouseSnapshot(state, person, global) {
  const active = global || person.visitHappinessRemaining > EPS;
  if (active && typeof person.forcedHappinessSnapshot !== 'number') person.forcedHappinessSnapshot = person.happiness;
  else if (!active && typeof person.forcedHappinessSnapshot === 'number') {
    person.happiness = clampResidentBalance(state, person, person.forcedHappinessSnapshot);
    person.forcedHappinessSnapshot = null;
  }
  // Legacy aliases remain readable to migrate existing saves and avoid
  // duplicating ownership: both point at the one active snapshot.
  person.globalLighthouseSnapshot = global ? person.forcedHappinessSnapshot : null;
  person.preVisitHappiness = person.visitHappinessRemaining > EPS ? person.forcedHappinessSnapshot : null;
}
function settleLighthouseSnapshot(state) {
  const global = state.lighthouseRemaining > EPS;
  for (const person of state.residents || []) settlePersonLighthouseSnapshot(state, person, global);
  state.lighthouseSnapshotActive = global;
}
export function beginLighthouseBonus(state, durationSeconds = 86400 * state.buildings.lighthouse.level) {
  state.lighthouseRemaining = Math.max(0, durationSeconds);
  settleLighthouseSnapshot(state);
}

export function settleResidentEvents(state) {
  if (!Array.isArray(state.lighthouseVisits)) state.lighthouseVisits = [];
  if (!Array.isArray(state.lighthouseVisitBonuses)) state.lighthouseVisitBonuses = [];
  state.visitEntryHistory = (state.visitEntryHistory || []).filter(entry => entry.remaining > EPS);
  state.visitPackages = (state.visitPackages || []).filter(item => item.remaining > EPS);
  state.lighthouseVisitBonuses = state.lighthouseVisitBonuses.filter(bonus => bonus.remaining > EPS);
  const complete = state.lighthouseVisits.filter(group => group.remaining <= EPS);
  for (const group of complete) {
    const visitors = (state.residents || []).filter(person => person.visitGroup === group.id && group.residentIds.includes(person.id));
    for (const person of visitors) {
      person.visitGroup = null;
      person.visitHappinessRemaining = LIGHTHOUSE_PERSONAL_SECONDS;
      person.visitCooldownRemaining = LIGHTHOUSE_PERSONAL_SECONDS;
      person.returnRemaining = 0;
    }
    if (visitors.length) {
      state.lighthouseVisitBonuses.push({ groupId: group.id, amount: 10,
        remaining: bounded(state.lighthouseVisitPopulationSeconds, LIGHTHOUSE_POPULATION_SECONDS, 1, 86400) });
      emit(state, 'lighthouse-visit-return', 'Visitors returned home', `${visitors.length} residents have 100% happiness for 24 hours. Their group adds +10 pp to the population while its bonus lasts.`);
    }
  }
  if (complete.length) state.lighthouseVisits = state.lighthouseVisits.filter(group => group.remaining > EPS);
  settleLighthouseSnapshot(state);
  settleRecalledCarriers(state);
  for (const person of state.residents || []) {
    if (residentHappinessFrozen(person)) person.happiness = welcomeStatus(state).active ? Math.max(20, person.happiness) : 0;
    else if (welcomeStatus(state).active) person.happiness = clampResidentBalance(state, person, person.happiness);
    if (person.returnRemaining <= EPS) person.returnFrom = null;
    if (!residentHappinessFrozen(person) && person.arrivalRemaining <= EPS && person.workplace) person.unemployedSeconds = 0;
    if (!residentProductionBlocked(state, person)) person.blockedSeconds = 0;
  }
  state.returningWorkers = (state.residents || []).filter(person => !person.workplace && person.returnRemaining > EPS).map(person => person.returnRemaining);
}

// Preserve person identities and order within each crew (workProgress uses it).
export function synchronizeResidents(state) {
  if (!Array.isArray(state.residents)) state.residents = [];
  const populationGrowth = state.residents.length > 0;
  while (state.residents.length < state.population) state.residents.push(newResident(state, 0, populationGrowth));
  while (state.residents.length > state.population) {
    const person = departureCandidate(state);
    if (!person) { state.population = state.residents.length; break; }
    removePerson(state, person, false);
  }
  for (const person of state.residents) {
    if (!RESIDENT_WORKPLACES.includes(person.workplace) || !unlocked(state, person.workplace)) {
      person.workplace = null; person.arrivalRemaining = 0;
    }
    if (person.visitGroup || person.prayerRemaining > EPS) { person.workplace = null; person.arrivalRemaining = 0; person.returnRemaining = 0; }
  }
  for (const id of RESIDENT_WORKPLACES) {
    const desired = unlocked(state, id) ? Math.max(0, state.buildings[id].workers) : 0;
    const crew = state.residents.filter(person => person.workplace === id);
    for (const person of crew.slice(desired)) releaseResident(state, person);
    let missing = desired - Math.min(desired, crew.length);
    const assigned = [];
    for (const person of state.residents.filter(residentAtHome)) {
      if (missing <= 0) break;
      person.workplace = id; person.arrivalRemaining = 0; person.unemployedSeconds = 0;
      assigned.push(person); missing--;
    }
    if (assigned.length) state.residents = state.residents.filter(person => !assigned.includes(person)).concat(assigned);
    state.buildings[id].workers = state.residents.filter(person => person.workplace === id).length;
  }
  settleResidentConditions(state);
}

export function normalizeResidents(state, raw = {}) {
  if (raw === state) raw = structuredClone(raw);
  const legacyReturnClocks = [...(state.returningWorkers || [])];
  state.residentSequence = Math.floor(bounded(raw.residentSequence));
  state.residentRandomSeed = (Math.floor(bounded(raw.residentRandomSeed, (Math.floor(state.worldTimeMs || 0) ^ 0x76a42d11) >>> 0, 0, 0xffffffff)) >>> 0) || 1;
  state.lighthouseSnapshotActive = raw.lighthouseSnapshotActive === true;
  state.lighthouseVisitPopulationSeconds = bounded(raw.lighthouseVisitPopulationSeconds, LIGHTHOUSE_POPULATION_SECONDS, 1, 86400);
  state.lighthouseVisitSequence = Math.floor(bounded(raw.lighthouseVisitSequence));
  state.visitPackageSequence = Math.floor(bounded(raw.visitPackageSequence));
  state.visitEntryHistory = (Array.isArray(raw.visitEntryHistory) ? raw.visitEntryHistory : []).filter(item => item && item.remaining > 0 && item.count > 0).slice(0, 10000)
    .map(item => ({ count: Math.floor(bounded(item.count, 0, 0, 20000)), remaining: bounded(item.remaining, 0, 0, 86400) }));
  state.visitPackages = (Array.isArray(raw.visitPackages) ? raw.visitPackages : []).filter(item => item && item.remaining > 0).slice(0, 3)
    .map(item => ({ id: Math.floor(bounded(item.id)), ordinal: Math.floor(bounded(item.ordinal, 2, 2, 4)),
      cost: Math.floor(bounded(item.cost)), entriesRemaining: Math.floor(bounded(item.entriesRemaining, 0, 0, 20000)), remaining: bounded(item.remaining, 0, 0, 86400) }));
  state.visitPackageSequence = Math.max(state.visitPackageSequence, ...state.visitPackages.map(item => item.id), 0);
  const seen = new Set(); state.residents = [];
  const savedPeople = raw.version >= 7 && Array.isArray(raw.residents) ? raw.residents : [];
  for (const saved of savedPeople.slice(0, state.population)) {
    if (!saved || typeof saved !== 'object') continue;
    let id = Math.floor(bounded(saved.id));
    if (!id || seen.has(id)) id = allocateId(state, seen);
    seen.add(id); state.residentSequence = Math.max(state.residentSequence, id);
    const newbornRemaining = bounded(saved.newbornRemaining, 0, 0, NEWBORN_HAPPINESS_SECONDS);
    const frozen = newbornRemaining > EPS;
    const snapshot = typeof saved.forcedHappinessSnapshot === 'number' ? saved.forcedHappinessSnapshot :
      state.lighthouseRemaining > EPS && typeof saved.globalLighthouseSnapshot === 'number' ? saved.globalLighthouseSnapshot :
      saved.visitHappinessRemaining > EPS && typeof saved.preVisitHappiness === 'number' ? saved.preVisitHappiness : null;
    state.residents.push({ id, personUid: typeof saved.personUid === 'string' && /^[A-Za-z0-9:_-]{1,100}$/.test(saved.personUid) ? saved.personUid : `${state.islandId || 'island-1'}:resident-${id}`, happiness: frozen ? 0 : bounded(saved.happiness, 0, -10000000, 10000000), newbornRemaining,
      hungerSeconds: frozen ? 0 : bounded(saved.hungerSeconds), fedRecoverySeconds: frozen ? 0 : bounded(saved.fedRecoverySeconds, 0, 0, FED_RECOVERY_SECONDS),
      unemployedSeconds: frozen ? 0 : bounded(saved.unemployedSeconds),
      workplace: RESIDENT_WORKPLACES.includes(saved.workplace) && unlocked(state, saved.workplace) ? saved.workplace : null,
      arrivalRemaining: bounded(saved.arrivalRemaining, 0, 0, WALK_SECONDS), returnRemaining: bounded(saved.returnRemaining, 0, 0, WALK_SECONDS),
      returnFrom: saved.returnRemaining > EPS && RESIDENT_WORKPLACES.includes(saved.returnFrom) ? saved.returnFrom : null,
      prayerRemaining: bounded(saved.prayerRemaining),
      blockedSeconds: bounded(saved.blockedSeconds, 0, 0, 432000), visitGroup: Number.isSafeInteger(saved.visitGroup) && saved.visitGroup > 0 ? saved.visitGroup : null,
      visitHappinessRemaining: bounded(saved.visitHappinessRemaining, 0, 0, LIGHTHOUSE_PERSONAL_SECONDS),
      visitCooldownRemaining: bounded(saved.visitCooldownRemaining, 0, 0, LIGHTHOUSE_PERSONAL_SECONDS),
      pendingRelease: saved.pendingRelease === true && ['warehouse', 'market', 'dock'].includes(saved.workplace),
      forcedHappinessSnapshot: snapshot === null ? null : bounded(snapshot, 0, -10000000, 10000000),
      preVisitHappiness: typeof saved.preVisitHappiness === 'number' ? bounded(saved.preVisitHappiness, 0, -100, 100) : null,
      globalLighthouseSnapshot: typeof saved.globalLighthouseSnapshot === 'number' ? bounded(saved.globalLighthouseSnapshot, 0, -100, 100) : null });
  }
  const legacy = !savedPeople.length;
  while (state.residents.length < state.population) state.residents.push(newResident(state, legacy ? state.baseHappiness : 0));
  state.lighthouseVisits = [];
  const grouped = new Set();
  for (const source of Array.isArray(raw.lighthouseVisits) ? raw.lighthouseVisits : []) {
    if (!source || !Number.isSafeInteger(source.id) || source.id < 1 || state.lighthouseVisits.some(g => g.id === source.id)) continue;
    const ids = [...new Set(Array.isArray(source.residentIds) ? source.residentIds : [])].filter(id => state.residents.some(p => p.id === id) && !grouped.has(id));
    if (!ids.length) continue;
    const group = { id: source.id, residentIds: ids, remaining: bounded(source.remaining, 0, 0, LIGHTHOUSE_VISIT_SECONDS) };
    state.lighthouseVisits.push(group); state.lighthouseVisitSequence = Math.max(state.lighthouseVisitSequence, group.id);
    ids.forEach(id => { grouped.add(id); state.residents.find(person => person.id === id).visitGroup = group.id; });
  }
  for (const person of state.residents) if (!grouped.has(person.id)) person.visitGroup = null;
  state.lighthouseVisitBonuses = (Array.isArray(raw.lighthouseVisitBonuses) ? raw.lighthouseVisitBonuses : []).filter(b => b && b.remaining > 0)
    .slice(0, 10000).map(b => ({ groupId: Math.floor(bounded(b.groupId)), amount: 10, remaining: bounded(b.remaining, 0, 0, 86400) }));
  synchronizeResidents(state);
  if (legacy) {
    const available = state.residents.filter(residentAtHome);
    legacyReturnClocks.slice(0, available.length).forEach((seconds, index) => { available[index].returnRemaining = seconds; });
    settleResidentConditions(state);
  }
}

export function assignResidents(state, id, delta) {
  if (delta > 0) {
    const assigned = state.residents.filter(residentAtHome).slice(0, delta);
    for (const person of assigned) { person.workplace = id; person.arrivalRemaining = WALK_SECONDS; person.returnRemaining = 0; person.returnFrom = null; person.blockedSeconds = 0; }
    state.residents = state.residents.filter(person => !assigned.includes(person)).concat(assigned);
  } else {
    const assigned = state.residents.filter(person => person.workplace === id && !person.pendingRelease);
    for (const person of assigned.slice(delta)) releaseResident(state, person);
  }
  if (state.buildings[id]) state.buildings[id].workers = state.residents.filter(person => person.workplace === id).length;
  settleResidentEvents(state);
}

export function settleResidentConditions(state) {
  const fed = hasFoodForResidents(state);
  for (const person of state.residents || []) {
    if (residentHappinessFrozen(person)) {
      person.hungerSeconds = 0; person.unemployedSeconds = 0; person.fedRecoverySeconds = 0;
    } else {
      if (!fed) person.fedRecoverySeconds = 0;
      if (fed && (person.fedRecoverySeconds || 0) >= FED_RECOVERY_SECONDS - EPS) person.hungerSeconds = 0;
      if (person.workplace && person.arrivalRemaining <= EPS) person.unemployedSeconds = 0;
    }
  }
  settleResidentEvents(state);
}
export function residentOffset(state, person) {
  if (residentHappinessFrozen(person)) return 0;
  let offset = (state.chapelRemaining > EPS ? state.buildings.chapel.level * 10 : 0) + (state.blessingRemaining > EPS ? 20 : 0);
  offset += (state.lighthouseVisitBonuses || []).reduce((sum, bonus) => sum + (bonus.remaining > EPS ? 10 : 0), 0);
  offset += residentLeisureBonus(state, person);
  if (state.charityReward?.happinessPoints === 20 && state.charityReward.expiresAt > (state.worldTimeMs || state.lastSimulatedAt || 0)) offset += 20;
  offset -= worldEventHappinessPenalty(state);
  if (residentProductionBlocked(state, person)) offset -= Math.min(50, 10 * (1 + Math.floor((person.blockedSeconds + EPS) / 86400)));
  return offset;
}
// The public limit applies to the final personal happiness. A negative cause
// must not prevent a House point or ordinary gain merely because the stored
// balance has reached 100 before applying that cause.
export function residentHappinessBounds(state, person) {
  const offset = residentOffset(state, person), bounds = happinessBoundsForOffset(offset);
  if (welcomeStatus(state).active) bounds.min = Math.max(bounds.min, 20 - offset);
  return bounds;
}
const happinessBoundsForOffset = offset => ({ min: -100 - Math.max(0, offset), max: 100 - Math.min(0, offset) });
function clampResidentBalance(state, person, value) {
  const bounds = residentHappinessBounds(state, person);
  return Math.max(bounds.min, Math.min(bounds.max, value));
}
export function residentHappiness(state, person) {
  const global = state.lighthouseRemaining > EPS;
  // Population averages read every resident. Settling only the queried person
  // keeps that read linear; event boundaries still settle the entire group.
  settlePersonLighthouseSnapshot(state, person, global);
  state.lighthouseSnapshotActive = global;
  if (global || person.visitHappinessRemaining > EPS) return 100;
  if (residentHappinessFrozen(person)) return welcomeStatus(state).active ? 20 : 0;
  return Math.max(welcomeStatus(state).active ? 20 : -100, clampHappiness(person.happiness + residentOffset(state, person)));
}
export function residentHappinessRate(state, person) {
  if (state.lighthouseRemaining > EPS || person.visitHappinessRemaining > EPS) return 0;
  if (residentHappinessFrozen(person)) return 0;
  const fed = hasFoodForResidents(state);
  const housingPenalty = Math.max(0, state.population - state.buildings.house.level * 24);
  const employed = !!person.workplace && person.arrivalRemaining <= EPS;
  const work = employed ? residentProductionBlocked(state, person) ? 0 : 1 : person.workplace ? 0 : reachedGrace(person.unemployedSeconds) ? -NEED_PENALTY : 0;
  const rate = (fed ? 1 : reachedGrace(person.hungerSeconds) ? -NEED_PENALTY : 0) + work - housingPenalty;
  return welcomeStatus(state).active && residentHappiness(state, person) <= 20 + EPS && rate < 0 ? 0 : rate;
}
export const hungerPenaltyPerHour = state => !hasFoodForResidents(state) && state.population ?
  NEED_PENALTY * (state.residents || []).filter(person => !residentHappinessFrozen(person) && reachedGrace(person.hungerSeconds)).length / state.population : 0;
export const unemploymentPenaltyPerHour = state => state.population ?
  NEED_PENALTY * (state.residents || []).filter(person => !residentHappinessFrozen(person) && !person.workplace && reachedGrace(person.unemployedSeconds)).length / state.population : 0;

export function nextResidentEvent(state) {
  let next = Infinity;
  const fed = hasFoodForResidents(state);
  const consider = value => { if (value > EPS) next = Math.min(next, value); };
  consider(welcomeStatus(state).remaining);
  if (state.charityReward?.happinessPoints === 20) consider((state.charityReward.expiresAt - (state.worldTimeMs || state.lastSimulatedAt || 0)) / 1000);
  for (const person of state.residents || []) {
    consider(person.newbornRemaining);
    consider(person.arrivalRemaining); consider(person.returnRemaining); consider(person.prayerRemaining); consider(person.visitHappinessRemaining); consider(person.visitCooldownRemaining);
    if (residentProductionBlocked(state, person) && person.blockedSeconds < 4 * 86400 - EPS) consider(86400 - person.blockedSeconds % 86400);
    if (!residentHappinessFrozen(person) && fed && person.hungerSeconds > EPS && (person.fedRecoverySeconds || 0) < FED_RECOVERY_SECONDS - EPS)
      consider(FED_RECOVERY_SECONDS - (person.fedRecoverySeconds || 0));
  }
  for (const group of state.lighthouseVisits || []) consider(group.remaining);
  for (const bonus of state.lighthouseVisitBonuses || []) consider(bonus.remaining);
  for (const entry of state.visitEntryHistory || []) consider(entry.remaining);
  for (const item of state.visitPackages || []) consider(item.remaining);
  return next;
}

export function residentSegments(state) {
  settleResidentEvents(state);
  let nextEvent = nextResidentEvent(state), meanSlope = 0;
  const fed = hasFoodForResidents(state);
  const people = state.residents.map(person => {
    const frozen = residentHappinessFrozen(person);
    const rate = residentHappinessRate(state, person) / 3600;
    const offset = residentOffset(state, person);
    const bounds = residentHappinessBounds(state, person);
    const slope = person.happiness >= bounds.max && rate >= 0 || person.happiness <= bounds.min && rate <= 0 ? 0 : rate;
    const forced = frozen || state.lighthouseRemaining > EPS || person.visitHappinessRemaining > EPS;
    const raw = person.happiness + offset;
    const minimum = welcomeStatus(state).floor || -100;
    const effectiveSlope = forced || raw > 100 || raw < minimum || raw === 100 && slope >= 0 || raw === minimum && slope <= 0 ? 0 : slope;
    meanSlope += effectiveSlope / state.population;
    if (slope) {
      const intrinsicTime = ((slope > 0 ? bounds.max : bounds.min) - person.happiness) / slope;
      if (intrinsicTime > EPS) nextEvent = Math.min(nextEvent, intrinsicTime);
      if (!forced) for (const limit of [minimum, 100]) { const time = (limit - raw) / slope; if (time > EPS) nextEvent = Math.min(nextEvent, time); }
    }
    if (!frozen && !fed && !reachedGrace(person.hungerSeconds)) nextEvent = Math.min(nextEvent, NEED_GRACE_SECONDS - person.hungerSeconds);
    if (!frozen && !person.workplace && !reachedGrace(person.unemployedSeconds)) nextEvent = Math.min(nextEvent, NEED_GRACE_SECONDS - person.unemployedSeconds);
    return { person, slope, frozen, blocked: residentProductionBlocked(state, person), employed: !!person.workplace && person.arrivalRemaining <= EPS };
  });
  return { people, nextEvent, meanSlope, fed, state };
}
export function advanceResidents(segment, seconds) {
  const state = segment.state;
  for (const { person, slope, frozen = residentHappinessFrozen(person), blocked, employed } of segment.people) {
    person.happiness = frozen ? welcomeStatus(state).active ? 20 : 0 : clampResidentBalance(state, person, person.happiness + slope * seconds);
    person.newbornRemaining = elapsed(person.newbornRemaining || 0, seconds);
    if (frozen) { person.hungerSeconds = 0; person.unemployedSeconds = 0; person.fedRecoverySeconds = 0; }
    else {
      person.fedRecoverySeconds = segment.fed ? Math.min(FED_RECOVERY_SECONDS, (person.fedRecoverySeconds || 0) + seconds) : 0;
      if (!segment.fed) person.hungerSeconds = Math.min(Number.MAX_SAFE_INTEGER, person.hungerSeconds + seconds);
      else if (person.fedRecoverySeconds >= FED_RECOVERY_SECONDS - EPS) person.hungerSeconds = 0;
      person.unemployedSeconds = employed ? 0 : person.workplace ? person.unemployedSeconds : Math.min(Number.MAX_SAFE_INTEGER, person.unemployedSeconds + seconds);
    }
    person.blockedSeconds = blocked ? Math.min(432000, person.blockedSeconds + seconds) : 0;
    person.prayerRemaining = elapsed(person.prayerRemaining || 0, seconds);
    person.arrivalRemaining = elapsed(person.arrivalRemaining, seconds); person.returnRemaining = elapsed(person.returnRemaining, seconds);
    person.visitHappinessRemaining = elapsed(person.visitHappinessRemaining, seconds); person.visitCooldownRemaining = elapsed(person.visitCooldownRemaining, seconds);
  }
  for (const group of state.lighthouseVisits || []) group.remaining = elapsed(group.remaining, seconds);
  for (const bonus of state.lighthouseVisitBonuses || []) bonus.remaining = elapsed(bonus.remaining, seconds);
  for (const entry of state.visitEntryHistory || []) entry.remaining = elapsed(entry.remaining, seconds);
  for (const item of state.visitPackages || []) item.remaining = elapsed(item.remaining, seconds);
  settleResidentEvents(state);
}
export function adjustResidentHappiness(state, amount, residentIds = null) {
  const selected = residentIds ? new Set(residentIds) : null;
  for (const person of state.residents) {
    if (residentHappinessFrozen(person) || selected && !selected.has(person.id)) continue;
    person.happiness = clampResidentBalance(state, person, person.happiness + amount);
  }
}

const DEPARTURE_ORDER = ['dock', 'market', 'sawmill', 'quarry', 'lumber', 'farm', 'windmill', 'warehouse'];
function leastHappyCandidate(state, people) {
  if (!people.length) return null;
  const lowest = Math.min(...people.map(person => residentHappiness(state, person)));
  const tied = people.filter(person => Math.abs(residentHappiness(state, person) - lowest) <= EPS);
  if (tied.length === 1) return tied[0];
  let seed = state.residentRandomSeed >>> 0 || 1;
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  state.residentRandomSeed = seed >>> 0 || 1;
  return tied[Math.floor(state.residentRandomSeed / 0x100000000 * tied.length)];
}
function departureCandidate(state) {
  const eligible = (state.residents || []).filter(person => !person.visitGroup && !person.prayerRemaining);
  const home = eligible.filter(person => !person.workplace || person.arrivalRemaining > EPS || person.returnRemaining > EPS);
  if (home.length) return leastHappyCandidate(state, home);
  let selected = [], size = 0;
  for (const id of DEPARTURE_ORDER) {
    const crew = eligible.filter(person => person.workplace === id);
    if (crew.length > size) { selected = crew; size = crew.length; }
  }
  return leastHappyCandidate(state, selected);
}
function removePerson(state, person, decrement = true) {
  if (person.workplace) {
    const building = state.buildings[person.workplace];
    const crew = state.residents.filter(p => p.workplace === person.workplace);
    const index = crew.indexOf(person);
    if (Array.isArray(building.workProgress)) building.workProgress.splice(index, 1);
    // Already loaded cargo finishes its final trip even when its carrier leaves.
    for (const trip of state.haulTrips?.[person.workplace] || []) {
      if (trip.worker === index) trip.worker = -1;
      else if (trip.worker > index) trip.worker--;
    }
    building.workers = Math.max(0, building.workers - 1);
  }
  state.residents = state.residents.filter(p => p !== person);
  if (decrement) state.population = state.residents.length;
  state.returningWorkers = state.residents.filter(p => !p.workplace && p.returnRemaining > EPS).map(p => p.returnRemaining);
}
export function removeResidentForDeparture(state) {
  if (state.population <= residentPopulationMinimum(state)) return false;
  const person = departureCandidate(state);
  if (!person) return false;
  removePerson(state, person);
  return true;
}

export function residentVisitAction(state, action) {
  if (!['visitLighthouse', 'lighthouseVisit', 'cancelLighthouseVisit', 'buyVisitPackage'].includes(action.type)) return null;
  const bad = message => ({ ok: false, message });
  if (action.type === 'buyVisitPackage') {
    settleResidentEvents(state);
    const quote = visitPackageQuote(state);
    if (!quote.ok) return bad(quote.message);
    if (!Number.isFinite(state.resources.coins) || state.resources.coins < quote.cost) return bad(`This visitor package costs ${quote.cost} coins.`);
    state.resources.coins -= quote.cost;
    state.visitPackages.push({ id: ++state.visitPackageSequence, ordinal: quote.ordinal, cost: quote.cost, entriesRemaining: quote.entries, remaining: 86400 });
    emit(state, 'lighthouse-visit-package', 'Visitor package purchased', `${quote.entries} extra entries are available for 24 hours. Paid package ${quote.ordinal - 1} of 3.`);
    return { ok: true, message: `${quote.entries} extra visitor entries purchased for ${quote.cost} coins.` };
  }
  if (action.type === 'cancelLighthouseVisit') return bad('A Lighthouse visit lasts four hours and cannot be cancelled.');
  if (!state.buildings.lighthouse?.level) return bad('Build the Lighthouse before sending visitors.');
  settleResidentEvents(state);
  const free = visitCapacity(state) - visitOccupancy(state);
  const eligible = state.residents.filter(person => residentAtHome(person) && person.visitCooldownRemaining <= EPS);
  let people;
  if (Array.isArray(action.residentIds)) {
    if (!action.residentIds.length || new Set(action.residentIds).size !== action.residentIds.length) return bad('Choose distinct residents for this group.');
    people = action.residentIds.map(id => eligible.find(person => person.id === id));
    if (people.some(p => !p)) return bad('Visitors must be at home and their 24-hour visit cooldown must have ended.');
  } else {
    const count = action.count === undefined ? 1 : action.count;
    if (!Number.isSafeInteger(count) || count < 1) return bad('Choose a positive whole number of visitors.');
    people = eligible.slice(0, count);
    if (people.length !== count) return bad('Not enough eligible residents at home.');
  }
  if (people.length > free) return bad(`The Lighthouse has ${Math.max(0, free)} free visitor places.`);
  const quota = visitQuota(state);
  if (people.length > quota.entriesRemaining) return bad('The visitor-entry allowance for this 24-hour window has been used. Wait or purchase an extra visitor package.');
  const freeCount = Math.min(people.length, quota.freeRemaining);
  if (freeCount) state.visitEntryHistory.push({ count: freeCount, remaining: 86400 });
  let paid = people.length - freeCount;
  for (const item of [...state.visitPackages].sort((a, b) => a.remaining - b.remaining)) {
    const used = Math.min(paid, item.entriesRemaining); item.entriesRemaining -= used; paid -= used;
    if (!paid) break;
  }
  const id = ++state.lighthouseVisitSequence;
  const group = { id, residentIds: people.map(person => person.id), remaining: LIGHTHOUSE_VISIT_SECONDS };
  state.lighthouseVisits.push(group);
  for (const person of people) person.visitGroup = id;
  emit(state, 'lighthouse-visit-start', 'Lighthouse visit started', `${people.length} residents will return in four hours. The group cannot be withdrawn.`);
  return { ok: true, message: `${people.length} residents sent to the Lighthouse. Their bonuses begin when they return in four hours.` };
}
