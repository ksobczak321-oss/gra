// Persistent residents and visits. Every duration is a real elapsed second.
export const RESIDENT_WORKPLACES = ['farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'warehouse', 'dock', 'market'];
export const NEED_GRACE_SECONDS = 12 * 3600;
export const NEED_PENALTY = 5;
export const WALK_SECONDS = 300;
export const LIGHTHOUSE_VISIT_SECONDS = 4 * 3600;
export const LIGHTHOUSE_PERSONAL_SECONDS = 24 * 3600;
// The population bonus lasts six hours; each dispatch group has its own clock.
export const LIGHTHOUSE_POPULATION_SECONDS = 6 * 3600;
export const NEWBORN_HAPPINESS_SECONDS = 24 * 3600;
export const residentHappinessFrozen = person => (person.newbornRemaining || 0) > 1e-7;
const EPS = 1e-7;
const bounded = (value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const elapsed = (clock, seconds) => clock - seconds > EPS ? clock - seconds : 0;
export const clampHappiness = value => Math.max(-100, Math.min(100, value));
export const hasFoodForResidents = state => state.foodCredit > 1e-12 || state.resources.food >= 1;
export const productionMultiplier = state => hasFoodForResidents(state) ? 1 : 0.5;
const unlocked = (state, id) => state.buildings[id]?.level > 0 && state.buildings.townhall.level >= (id === 'market' ? 2 : id === 'dock' ? 4 : 1);
const reachedGrace = seconds => seconds >= NEED_GRACE_SECONDS - EPS;
const producerRecipes = { farm: null, lumber: null, quarry: null, windmill: 'grain', sawmill: 'wood' };
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
  return !!(building.ready >= 200 * state.buildings.townhall.level || (input && state.resources[input] < 2));
}
export const residentIsWorking = (state, person) => !!person.workplace && person.arrivalRemaining <= EPS && !person.visitGroup && !residentProductionBlocked(state, person);

function allocateId(state, used = new Set((state.residents || []).map(person => person.id))) {
  let id = (state.residentSequence || 0) + 1;
  if (!Number.isSafeInteger(id) || used.has(id)) { id = 1; while (used.has(id)) id++; }
  state.residentSequence = Math.max(state.residentSequence || 0, id);
  return id;
}
function newResident(state, happiness = 0, newborn = false) {
  return { id: allocateId(state), happiness, hungerSeconds: 0, unemployedSeconds: 0,
    newbornRemaining: newborn ? NEWBORN_HAPPINESS_SECONDS : 0,
    workplace: null, arrivalRemaining: 0, returnRemaining: 0, blockedSeconds: 0,
    visitGroup: null, prayerRemaining: 0, visitHappinessRemaining: 0, visitCooldownRemaining: 0,
    preVisitHappiness: null, globalLighthouseSnapshot: state.lighthouseRemaining > EPS ? happiness : null };
}
function releaseResident(person) {
  person.workplace = null; person.arrivalRemaining = 0; person.returnRemaining = WALK_SECONDS;
  person.unemployedSeconds = 0; person.blockedSeconds = 0;
}
function emit(state, kind, title, message) {
  state.notificationSequence = (state.notificationSequence || 0) + 1;
  if (!Array.isArray(state.notifications)) state.notifications = [];
  state.notifications.unshift({ id: state.notificationSequence, kind, title, message, at: state.activeSeconds || 0, read: false });
  state.notifications.length = Math.min(100, state.notifications.length);
}

// A global Lighthouse upgrade and a personal visit both force effective 100%.
// Their snapshots preserve the explicitly agreed value from before the effect.
function settleLighthouseSnapshot(state) {
  const active = state.lighthouseRemaining > EPS;
  if (active && !state.lighthouseSnapshotActive) {
    for (const person of state.residents || []) person.globalLighthouseSnapshot = person.happiness;
    state.lighthouseSnapshotActive = true;
  } else if (!active && state.lighthouseSnapshotActive) {
    for (const person of state.residents || []) {
      if (typeof person.globalLighthouseSnapshot === 'number') person.happiness = clampHappiness(person.globalLighthouseSnapshot);
      person.globalLighthouseSnapshot = null;
    }
    state.lighthouseSnapshotActive = false;
  }
}
export function beginLighthouseBonus(state, durationSeconds = 86400 * state.buildings.lighthouse.level) {
  if (!state.lighthouseSnapshotActive) {
    for (const person of state.residents || []) person.globalLighthouseSnapshot = person.happiness;
    state.lighthouseSnapshotActive = true;
  }
  state.lighthouseRemaining = Math.max(0, durationSeconds);
}

export function settleResidentEvents(state) {
  settleLighthouseSnapshot(state);
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
      person.preVisitHappiness = person.happiness;
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
  for (const person of state.residents || []) {
    if (residentHappinessFrozen(person)) person.happiness = 0;
    if (person.visitHappinessRemaining <= EPS && typeof person.preVisitHappiness === 'number') {
      person.happiness = clampHappiness(person.preVisitHappiness); person.preVisitHappiness = null;
    }
    if (person.arrivalRemaining <= EPS && person.workplace) person.unemployedSeconds = 0;
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
    for (const person of crew.slice(desired)) releaseResident(person);
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
  const legacyReturnClocks = [...(state.returningWorkers || [])];
  state.residentSequence = Math.floor(bounded(raw.residentSequence));
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
    state.residents.push({ id, happiness: newbornRemaining > EPS ? 0 : bounded(saved.happiness, 0, -100, 100), newbornRemaining,
      hungerSeconds: bounded(saved.hungerSeconds), unemployedSeconds: bounded(saved.unemployedSeconds),
      workplace: RESIDENT_WORKPLACES.includes(saved.workplace) && unlocked(state, saved.workplace) ? saved.workplace : null,
      arrivalRemaining: bounded(saved.arrivalRemaining, 0, 0, WALK_SECONDS), returnRemaining: bounded(saved.returnRemaining, 0, 0, WALK_SECONDS),
      prayerRemaining: bounded(saved.prayerRemaining),
      blockedSeconds: bounded(saved.blockedSeconds, 0, 0, 432000), visitGroup: Number.isSafeInteger(saved.visitGroup) && saved.visitGroup > 0 ? saved.visitGroup : null,
      visitHappinessRemaining: bounded(saved.visitHappinessRemaining, 0, 0, LIGHTHOUSE_PERSONAL_SECONDS),
      visitCooldownRemaining: bounded(saved.visitCooldownRemaining, 0, 0, LIGHTHOUSE_PERSONAL_SECONDS),
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
    for (const person of assigned) { person.workplace = id; person.arrivalRemaining = WALK_SECONDS; person.returnRemaining = 0; person.blockedSeconds = 0; }
    state.residents = state.residents.filter(person => !assigned.includes(person)).concat(assigned);
  } else {
    const assigned = state.residents.filter(person => person.workplace === id);
    for (const person of assigned.slice(delta)) releaseResident(person);
  }
  settleResidentEvents(state);
}

export function settleResidentConditions(state) {
  const fed = hasFoodForResidents(state);
  for (const person of state.residents || []) {
    if (fed) person.hungerSeconds = 0;
    if (person.workplace && person.arrivalRemaining <= EPS) person.unemployedSeconds = 0;
  }
  settleResidentEvents(state);
}
export function residentOffset(state, person) {
  if (residentHappinessFrozen(person)) return 0;
  let offset = (state.chapelRemaining > EPS ? state.buildings.chapel.level * 10 : 0) + (state.blessingRemaining > EPS ? 20 : 0);
  offset += (state.lighthouseVisitBonuses || []).reduce((sum, bonus) => sum + (bonus.remaining > EPS ? 10 : 0), 0);
  if (residentProductionBlocked(state, person)) offset -= Math.min(50, 10 * (1 + Math.floor((person.blockedSeconds + EPS) / 86400)));
  return offset;
}
export function residentHappiness(state, person) {
  settleLighthouseSnapshot(state);
  if (residentHappinessFrozen(person)) return 0;
  if (state.lighthouseRemaining > EPS || person.visitHappinessRemaining > EPS) return 100;
  return clampHappiness(person.happiness + residentOffset(state, person));
}
export function residentHappinessRate(state, person) {
  if (residentHappinessFrozen(person)) return 0;
  const fed = hasFoodForResidents(state);
  const housingPenalty = Math.max(0, state.population - state.buildings.house.level * 24);
  const employed = !!person.workplace && person.arrivalRemaining <= EPS;
  const work = employed ? residentProductionBlocked(state, person) ? 0 : 1 : reachedGrace(person.unemployedSeconds) ? -NEED_PENALTY : 0;
  return (fed ? 1 : reachedGrace(person.hungerSeconds) ? -NEED_PENALTY : 0) + work - housingPenalty;
}
export const hungerPenaltyPerHour = state => !hasFoodForResidents(state) && state.population ?
  NEED_PENALTY * (state.residents || []).filter(person => !residentHappinessFrozen(person) && reachedGrace(person.hungerSeconds)).length / state.population : 0;
export const unemploymentPenaltyPerHour = state => state.population ?
  NEED_PENALTY * (state.residents || []).filter(person => !residentHappinessFrozen(person) && !person.workplace && reachedGrace(person.unemployedSeconds)).length / state.population : 0;

export function nextResidentEvent(state) {
  let next = Infinity;
  const consider = value => { if (value > EPS) next = Math.min(next, value); };
  for (const person of state.residents || []) {
    consider(person.newbornRemaining);
    consider(person.arrivalRemaining); consider(person.returnRemaining); consider(person.prayerRemaining); consider(person.visitHappinessRemaining); consider(person.visitCooldownRemaining);
    if (residentProductionBlocked(state, person) && person.blockedSeconds < 4 * 86400 - EPS) consider(86400 - person.blockedSeconds % 86400);
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
    const rate = residentHappinessRate(state, person) / 3600;
    const slope = person.happiness >= 100 && rate >= 0 || person.happiness <= -100 && rate <= 0 ? 0 : rate;
    const forced = residentHappinessFrozen(person) || state.lighthouseRemaining > EPS || person.visitHappinessRemaining > EPS;
    const raw = person.happiness + residentOffset(state, person);
    const effectiveSlope = forced || raw > 100 || raw < -100 || raw === 100 && slope >= 0 || raw === -100 && slope <= 0 ? 0 : slope;
    meanSlope += effectiveSlope / state.population;
    if (slope) {
      const intrinsicTime = ((slope > 0 ? 100 : -100) - person.happiness) / slope;
      if (intrinsicTime > EPS) nextEvent = Math.min(nextEvent, intrinsicTime);
      if (!forced) for (const limit of [-100, 100]) { const time = (limit - raw) / slope; if (time > EPS) nextEvent = Math.min(nextEvent, time); }
    }
    if (!fed && !reachedGrace(person.hungerSeconds)) nextEvent = Math.min(nextEvent, NEED_GRACE_SECONDS - person.hungerSeconds);
    if ((!person.workplace || person.arrivalRemaining > EPS) && !reachedGrace(person.unemployedSeconds)) nextEvent = Math.min(nextEvent, NEED_GRACE_SECONDS - person.unemployedSeconds);
    return { person, slope, blocked: residentProductionBlocked(state, person), employed: !!person.workplace && person.arrivalRemaining <= EPS };
  });
  return { people, nextEvent, meanSlope, fed, state };
}
export function advanceResidents(segment, seconds) {
  const state = segment.state;
  for (const { person, slope, blocked, employed } of segment.people) {
    person.happiness = residentHappinessFrozen(person) ? 0 : clampHappiness(person.happiness + slope * seconds);
    person.newbornRemaining = elapsed(person.newbornRemaining || 0, seconds);
    person.hungerSeconds = segment.fed ? 0 : Math.min(Number.MAX_SAFE_INTEGER, person.hungerSeconds + seconds);
    person.unemployedSeconds = employed ? 0 : Math.min(Number.MAX_SAFE_INTEGER, person.unemployedSeconds + seconds);
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
    person.happiness = clampHappiness(person.happiness + amount);
  }
}

const DEPARTURE_ORDER = ['dock', 'market', 'sawmill', 'quarry', 'lumber', 'farm', 'windmill', 'warehouse'];
function departureCandidate(state) {
  const eligible = (state.residents || []).filter(person => !person.visitGroup && !person.prayerRemaining);
  const home = eligible.filter(person => !person.workplace || person.arrivalRemaining > EPS || person.returnRemaining > EPS);
  if (home.length) return home.at(-1);
  let selected = null, size = 0;
  for (const id of DEPARTURE_ORDER) {
    const crew = eligible.filter(person => person.workplace === id);
    if (crew.length > size) { selected = crew.at(-1); size = crew.length; }
  }
  return selected;
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
  if (state.population <= 6) return false;
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
