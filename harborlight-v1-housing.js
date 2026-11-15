// Bed allocation is independent of worker assignments and population capacity.
// Resident IDs remain immutable after admission. Membership changes replace the
// array, change its length, or advance residentSequence when admitting a person.
// Normalizing a save creates a fresh array.
// This lets production query each person's factor without sorting every worker.
import { educationHousingAssignment, educationWorkMultiplier, personKey } from './harborlight-v1-education.js?v=frontend-v32-10';
import { militaryHousingAssignment, militaryRecord } from './harborlight-v1-military.js?v=frontend-v32-10';
import { feedingMultiplier } from './harborlight-v1-provisions.js?v=frontend-v32-10';
const allocations = new WeakMap();
const count = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
const keyOf = person => Number.isSafeInteger(person?.id) && person.id > 0
  ? `id:${person.id}` : typeof person?.personUid === 'string' ? `uid:${person.personUid}` : null;

export const housingCapacity = state => (state?.ruleset === 32 ? 36 : 24) * count(state?.buildings?.house?.level);

function developmentAllocation(state) {
  const residents = state.residents || [], houseBeds = housingCapacity(state), academyLevel = count(state.buildings?.academy?.level), barracksLevel = count(state.buildings?.barracks?.level);
  const stamp = state.worldTimeMs || 0, previous = allocations.get(state);
  if (previous?.development && previous.residents === residents && previous.length === residents.length && previous.houseBeds === houseBeds && previous.academyLevel === academyLevel && previous.barracksLevel === barracksLevel && previous.educationPeople === state.education?.people && previous.militaryPeople === state.military?.people && previous.stamp === stamp && previous.revision === state.housingRevision) return previous;
  const academy = educationHousingAssignment(state), barracks = militaryHousingAssignment(state), dedicated = new Set([...academy,...barracks]);
  const home = residents.filter(p=>!dedicated.has(personKey(p))).sort((a,b)=>a.id-b.id);
  const selected = residents.filter(p=>dedicated.has(personKey(p))).concat(home.slice(0,houseBeds));
  const keys = new Set(selected.map(keyOf).filter(Boolean));
  const academyBeds = academyLevel ? 3+academyLevel : 0, barracksBeds = barracksLevel ? 4+2*(barracksLevel-1) : 0;
  const value={development:true,residents,length:residents.length,houseBeds,academyLevel,barracksLevel,educationPeople:state.education?.people,militaryPeople:state.military?.people,stamp,revision:state.housingRevision,beds:houseBeds+academyBeds+barracksBeds,population:residents.length,keys,academy,barracks,housedResidentIds:selected.map(p=>p.id),unhousedResidentIds:home.slice(houseBeds).map(p=>p.id)};
  allocations.set(state,value);return value;
}

function allocation(state) {
  if(state.ruleset===32)return developmentAllocation(state);
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

const researchTopics={farmGrain:'grain',farmVegetables:'vegetables',farmLivestock:'livestock',farmMilk:'rawMilk',farmCheese:'grain',flour:'windmill',bread:'bakery',cake:'bakery',pasteurizedMilk:'dairy',meat:'slaughterhouse',leather:'slaughterhouse',fish:'fisher',civilianClothes:'leatherworks',militaryClothes:'leatherworks',professorRobes:'leatherworks',wood:'lumber',stone:'quarry',planks:'sawmill',warehouse:'roads',dock:'roads',market:'roads'};
export function residentWorkMultiplier(state,person,context={}){
  const housing=residentHasHousing(state,person)?1:.5;if(state.ruleset!==32)return housing;
  const runtime={highestAcademyLevel:state.highestAcademyLevel,...(state.runtimeContext||{}),...context},topic=researchTopics[context.recipeId||person?.productionRecipe||person?.workplace]||person?.workplace;
  const career=militaryRecord(state,person) ? .5*educationWorkMultiplier(state,person,{...runtime,topic}) : educationWorkMultiplier(state,person,{...runtime,topic});
  return housing*career*feedingMultiplier(state,person);
}
export const residentFoodMultiplier = (state, person) => residentHasHousing(state, person) ? 1 : 2;

export function housingStatus(state) {
  const current = allocation(state);
  if(state.ruleset===32){const housed=current.housedResidentIds.length,unhoused=current.unhousedResidentIds.length;return {beds:current.beds,houseBeds:current.houseBeds,academyBeds:current.academyLevel?3+current.academyLevel:0,barracksBeds:current.barracksLevel?4+2*(current.barracksLevel-1):0,housed,unhoused,housedResidentIds:[...current.housedResidentIds],unhousedResidentIds:[...current.unhousedResidentIds],academyResidentIds:state.residents.filter(p=>current.academy.has(personKey(p))).map(p=>p.id),barracksResidentIds:state.residents.filter(p=>current.barracks.has(personKey(p))).map(p=>p.id),foodDemandPerHour:6*(housed+2*unhoused)};}
  const housed = Math.min(current.population, current.beds);
  const unhoused = Math.max(0, current.population - current.beds);
  return { beds: current.beds, housed, unhoused,
    housedResidentIds: [...current.housedResidentIds], unhousedResidentIds: [...current.unhousedResidentIds],
    foodDemandPerHour: housed + 2 * unhoused };
}

// Simulation asks for aggregate meal demand at every economy boundary. It does
// not need resident identities or the copied arrays intended for the UI.
export function foodDemandPerHour(state) {
  if(state.ruleset===32){const a=allocation(state);return 6*(a.population+a.unhousedResidentIds.length);}
  const population = Number.isFinite(state?.population) ? count(state.population) :
    Array.isArray(state?.residents) ? state.residents.length : 0;
  return population + Math.max(0, population - housingCapacity(state));
}
