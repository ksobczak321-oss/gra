// Bed allocation is independent of worker assignments and population capacity.
// Resident IDs remain immutable after admission. Membership changes replace the
// array, change its length, or advance residentSequence when admitting a person.
// Normalizing a save creates a fresh array.
// This lets production query each person's factor without sorting every worker.
const allocations = new WeakMap();
const count = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
const keyOf = person => Number.isSafeInteger(person?.id) && person.id > 0
  ? `id:${person.id}` : typeof person?.personUid === 'string' ? `uid:${person.personUid}` : null;

export const housingCapacity = state => 24 * count(state?.buildings?.house?.level);

function allocation(state) {
  const residents = Array.isArray(state?.residents) ? state.residents : [];
  const beds = housingCapacity(state);
  const population = Number.isFinite(state?.population) ? count(state.population) : residents.length;
  const sequence = count(state?.residentSequence);
  const previous = allocations.get(state);
  if (previous?.residents === residents && previous.length === residents.length && previous.beds === beds && previous.population === population && previous.sequence === sequence) return previous;
  const ordered = residents.map((person, index) => ({ person, index })).sort((a, b) => {
    const left = Number.isSafeInteger(a.person.id) && a.person.id > 0 ? a.person.id : Number.MAX_SAFE_INTEGER;
    const right = Number.isSafeInteger(b.person.id) && b.person.id > 0 ? b.person.id : Number.MAX_SAFE_INTEGER;
    return left - right || String(a.person.personUid || '').localeCompare(String(b.person.personUid || ''), 'en') || a.index - b.index;
  });
  const selected = ordered.slice(0, beds).map(item => item.person);
  const keys = new Set(selected.map(keyOf).filter(Boolean));
  const value = { residents, length: residents.length, beds, population, sequence, keys,
    housedResidentIds: selected.map(person => person.id),
    unhousedResidentIds: ordered.slice(beds).map(item => item.person.id) };
  allocations.set(state, value);
  return value;
}

export function residentHasHousing(state, person) {
  const key = keyOf(person);
  return !!key && allocation(state).keys.has(key);
}

export const residentWorkMultiplier = (state, person) => residentHasHousing(state, person) ? 1 : 0.5;
export const residentFoodMultiplier = (state, person) => residentHasHousing(state, person) ? 1 : 2;

export function housingStatus(state) {
  const current = allocation(state);
  const housed = Math.min(current.population, current.beds);
  const unhoused = Math.max(0, current.population - current.beds);
  return { beds: current.beds, housed, unhoused,
    housedResidentIds: [...current.housedResidentIds], unhousedResidentIds: [...current.unhousedResidentIds],
    foodDemandPerHour: housed + 2 * unhoused };
}

// Simulation asks for aggregate meal demand at every economy boundary. It does
// not need resident identities or the copied arrays intended for the UI.
export function foodDemandPerHour(state) {
  const population = Number.isFinite(state?.population) ? count(state.population) :
    Array.isArray(state?.residents) ? state.residents.length : 0;
  return population + Math.max(0, population - housingCapacity(state));
}
