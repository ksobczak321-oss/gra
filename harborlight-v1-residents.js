// Persistent people, not workplace-wide happiness. All timers use active seconds.
export const RESIDENT_WORKPLACES = ['farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'warehouse', 'dock', 'market'];
export const NEED_GRACE_SECONDS = 12 * 3600;
export const NEED_PENALTY = 5;
const bounded = (value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
export const clampHappiness = value => Math.max(-100, Math.min(100, value));
export const hasFoodForResidents = state => state.foodCredit > 1e-12 || state.resources.food >= 1;
export const productionMultiplier = state => hasFoodForResidents(state) ? 1 : 0.5;
const unlocked = (state, id) => state.buildings[id]?.level > 0 && state.buildings.townhall.level >= (id === 'market' ? 2 : id === 'dock' ? 4 : 1);
const reachedGrace = seconds => seconds >= NEED_GRACE_SECONDS - 1e-7;

function allocateId(state, used = new Set((state.residents || []).map(person => person.id))) {
  let id = (state.residentSequence || 0) + 1;
  if (!Number.isSafeInteger(id) || used.has(id)) {
    id = 1;
    while (used.has(id)) id++;
  }
  state.residentSequence = Math.max(state.residentSequence || 0, id);
  return id;
}
function newResident(state, happiness = 0) {
  return { id: allocateId(state), happiness, hungerSeconds: 0, unemployedSeconds: 0, workplace: null, returnRemaining: 0 };
}

// Aggregate building counts remain the economy's public interface. Reconcile
// them without replacing residents when people change jobs or walk home.
export function synchronizeResidents(state) {
  if (!Array.isArray(state.residents)) state.residents = [];
  while (state.residents.length < state.population) state.residents.push(newResident(state));
  while (state.residents.length > state.population) {
    let index = state.residents.findLastIndex(person => !person.workplace && person.returnRemaining <= 1e-7);
    // When all survivors work, remove the same last crew member whose work
    // phase was trimmed; do not silently transfer another person's identity.
    if (index < 0) index = state.residents.findLastIndex(person => person.workplace &&
      state.residents.filter(candidate => candidate.workplace === person.workplace).length > state.buildings[person.workplace].workers);
    if (index < 0) index = state.residents.findLastIndex(person => !person.workplace);
    if (index < 0) index = state.residents.length - 1;
    state.residents.splice(index, 1);
  }
  for (const id of RESIDENT_WORKPLACES) {
    const desired = unlocked(state, id) ? state.buildings[id].workers : 0;
    const assigned = state.residents.filter(person => person.workplace === id);
    for (const person of assigned.slice(desired)) { person.workplace = null; person.returnRemaining = 300; person.unemployedSeconds = 0; }
  }
  for (const person of state.residents) if (!RESIDENT_WORKPLACES.includes(person.workplace) || !unlocked(state, person.workplace)) person.workplace = null;
  for (const id of RESIDENT_WORKPLACES) {
    const desired = unlocked(state, id) ? state.buildings[id].workers : 0;
    let missing = desired - state.residents.filter(person => person.workplace === id).length;
    const newlyAssigned = [];
    // A damaged save can claim more assigned workers than its available pool.
    // Keep the already-normalized aggregate crew count and repair that person's
    // contradictory return flag rather than leaving two different populations.
    const candidates = state.residents.filter(person => !person.workplace).sort((a, b) => (a.returnRemaining > 1e-7) - (b.returnRemaining > 1e-7));
    for (const person of candidates) {
      if (missing <= 0) break;
      person.workplace = id; person.returnRemaining = 0; person.unemployedSeconds = 0; newlyAssigned.push(person); missing--;
    }
    // Array order within a crew follows assignment order, like workProgress.
    if (newlyAssigned.length) state.residents = state.residents.filter(person => !newlyAssigned.includes(person)).concat(newlyAssigned);
  }
  // Individual clocks are authoritative. Matching clocks by array position
  // swaps people when workers are dismissed in a different order.
  state.returningWorkers = state.residents.filter(person => !person.workplace && person.returnRemaining > 1e-7).map(person => person.returnRemaining);
  settleResidentConditions(state);
}

export function normalizeResidents(state, raw) {
  const legacyReturnClocks = [...(state.returningWorkers || [])];
  state.residentSequence = Math.floor(bounded(raw.residentSequence));
  const seen = new Set();
  state.residents = [];
  if (raw.version >= 7 && Array.isArray(raw.residents)) {
    for (const saved of raw.residents.slice(0, state.population)) {
      if (!saved || typeof saved !== 'object') continue;
      let id = Math.floor(bounded(saved.id));
      if (!id || seen.has(id)) id = allocateId(state, seen);
      seen.add(id);
      state.residentSequence = Math.max(state.residentSequence, id);
      state.residents.push({ id, happiness: bounded(saved.happiness, 0, -100, 100),
        hungerSeconds: bounded(saved.hungerSeconds), unemployedSeconds: bounded(saved.unemployedSeconds),
        workplace: RESIDENT_WORKPLACES.includes(saved.workplace) && unlocked(state, saved.workplace) ? saved.workplace : null,
        returnRemaining: bounded(saved.returnRemaining, 0, 0, 300) });
    }
  }
  // Older saves have no individual history. Preserve their earned base value,
  // without inventing elapsed hunger or unemployment while the game was closed.
  const legacy = !(raw.version >= 7 && Array.isArray(raw.residents));
  while (state.residents.length < state.population) state.residents.push(newResident(state, legacy ? state.baseHappiness : 0));
  synchronizeResidents(state);
  if (legacy) {
    const available = state.residents.filter(person => !person.workplace);
    legacyReturnClocks.slice(0, available.length).forEach((seconds, index) => { available[index].returnRemaining = seconds; });
    state.returningWorkers = available.filter(person => person.returnRemaining > 1e-7).map(person => person.returnRemaining);
  }
}

export function assignResidents(state, id, delta) {
  if (delta > 0) {
    const available = state.residents.filter(person => !person.workplace && person.returnRemaining <= 1e-7);
    const assigned = available.slice(0, delta);
    for (const person of assigned) { person.workplace = id; person.unemployedSeconds = 0; }
    state.residents = state.residents.filter(person => !assigned.includes(person)).concat(assigned);
  } else {
    const assigned = state.residents.filter(person => person.workplace === id);
    for (const person of assigned.slice(delta)) { person.workplace = null; person.returnRemaining = 300; person.unemployedSeconds = 0; }
  }
}

export function settleResidentConditions(state) {
  const fed = hasFoodForResidents(state);
  for (const person of state.residents || []) {
    if (fed) person.hungerSeconds = 0;
    if (person.workplace) { person.unemployedSeconds = 0; person.returnRemaining = 0; }
  }
}

export function residentOffset(state, person) {
  let offset = (state.chapelRemaining > 0 ? state.buildings.chapel.level * 10 : 0) +
    (state.blessingRemaining > 0 ? 20 : 0) + (state.lighthouseRemaining > 0 ? 100 : 0);
  const building = person.workplace && state.buildings[person.workplace];
  if (building?.storageFull) offset -= Math.min(50, 10 * (1 + Math.floor(((building.fullSeconds || 0) + 1e-7) / 86400)));
  return offset;
}
export const residentHappiness = (state, person) => clampHappiness(person.happiness + residentOffset(state, person));
export function residentHappinessRate(state, person) {
  const fed = hasFoodForResidents(state);
  const housingPenalty = Math.max(0, state.population - state.buildings.house.level * 24);
  return (fed ? 1 : reachedGrace(person.hungerSeconds) ? -NEED_PENALTY : 0) +
    (person.workplace ? 1 : reachedGrace(person.unemployedSeconds) ? -NEED_PENALTY : 0) - housingPenalty;
}
export const hungerPenaltyPerHour = state => !hasFoodForResidents(state) && state.population ?
  NEED_PENALTY * (state.residents || []).filter(person => reachedGrace(person.hungerSeconds)).length / state.population : 0;
export const unemploymentPenaltyPerHour = state => state.population ?
  NEED_PENALTY * (state.residents || []).filter(person => !person.workplace && reachedGrace(person.unemployedSeconds)).length / state.population : 0;

// A segment ends at a personal clamp or a need's 12-hour threshold. Thus its
// population mean and the demographic rate are linear and can be integrated.
export function residentSegments(state) {
  let nextEvent = Infinity, meanSlope = 0;
  const fed = hasFoodForResidents(state);
  const people = state.residents.map(person => {
    const rate = residentHappinessRate(state, person) / 3600;
    const slope = person.happiness >= 100 && rate >= 0 || person.happiness <= -100 && rate <= 0 ? 0 : rate;
    const raw = person.happiness + residentOffset(state, person);
    const effectiveSlope = raw > 100 || raw < -100 || raw === 100 && slope >= 0 || raw === -100 && slope <= 0 ? 0 : slope;
    meanSlope += effectiveSlope / state.population;
    if (slope) {
      const intrinsicTime = ((slope > 0 ? 100 : -100) - person.happiness) / slope;
      if (intrinsicTime > 1e-8) nextEvent = Math.min(nextEvent, intrinsicTime);
      for (const limit of [-100, 100]) {
        const time = (limit - raw) / slope;
        if (time > 1e-8) nextEvent = Math.min(nextEvent, time);
      }
    }
    if (!fed && !reachedGrace(person.hungerSeconds)) nextEvent = Math.min(nextEvent, NEED_GRACE_SECONDS - person.hungerSeconds);
    if (!person.workplace && !reachedGrace(person.unemployedSeconds)) nextEvent = Math.min(nextEvent, NEED_GRACE_SECONDS - person.unemployedSeconds);
    return { person, slope };
  });
  return { people, nextEvent, meanSlope, fed };
}

export function advanceResidents(segment, seconds) {
  for (const { person, slope } of segment.people) {
    person.happiness = clampHappiness(person.happiness + slope * seconds);
    person.hungerSeconds = segment.fed ? 0 : Math.min(Number.MAX_SAFE_INTEGER, person.hungerSeconds + seconds);
    person.unemployedSeconds = person.workplace ? 0 : Math.min(Number.MAX_SAFE_INTEGER, person.unemployedSeconds + seconds);
    person.returnRemaining = person.returnRemaining - seconds > 1e-7 ? person.returnRemaining - seconds : 0;
  }
}

export function adjustResidentHappiness(state, amount) {
  for (const person of state.residents) person.happiness = clampHappiness(person.happiness + amount);
}
