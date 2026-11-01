import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, tick, foodDemandPerHour as worldFoodDemandPerHour } from '../harborlight-v1-state.js';
import { housingStatus, residentHasHousing, residentWorkMultiplier,
  residentFoodMultiplier, foodDemandPerHour } from '../harborlight-v1-housing.js';
import { WALK_SECONDS, residentAtHome, residentHappinessRate,
  residentIsWorking } from '../harborlight-v1-residents.js';
import { activeEffects } from '../harborlight-v1-effects.js';

const NOW = Date.parse('2026-11-01T12:00:00Z');
const command = (state, action) => {
  const result = act(state, action, state.worldTimeMs);
  assert.equal(result.ok, true, result.message);
  return result;
};
function crowded() {
  const state = createState(NOW);
  state.buildings.townhall.level = 2;
  state.buildings.house.level = 1;
  state.population = 48;
  state.resources.food = 1000;
  return normalizeState(state, NOW);
}
function freshCrowdedPool() {
  const state = crowded();
  delete state.houseHappinessPool;
  return normalizeState(state, NOW);
}
const ids = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => i + start);

test('Town Hall population places remain independent of the 24 existing beds', () => {
  const state = crowded(), status = housingStatus(state);
  assert.equal(state.population, 48);
  assert.equal(state.capacity, 48);
  assert.equal(status.beds, 24);
  assert.equal(status.housed, 24);
  assert.equal(status.unhoused, 24);
  assert.deepEqual(status.housedResidentIds, ids(1, 24));
  assert.deepEqual(status.unhousedResidentIds, ids(25, 48));
  assert.equal(foodDemandPerHour(state), 72);
});

test('aggregate meals follow population and beds without inspecting or copying resident identities', () => {
  const state = crowded();
  state.residents = new Proxy(state.residents, {
    get(target, property, receiver) {
      assert.notEqual(property, Symbol.iterator, 'Meal quotes must not iterate over all resident identities');
      assert.notEqual(property, 'map', 'Meal quotes must not construct the bed-allocation arrays');
      return Reflect.get(target, property, receiver);
    }
  });
  assert.equal(foodDemandPerHour(state), 72);
  state.buildings.house.level = 2;
  assert.equal(foodDemandPerHour(state), 48);
  state.population++;
  assert.equal(foodDemandPerHour(state), 50);
  assert.equal(foodDemandPerHour({ buildings: { house: { level: 1 } }, residents: state.residents }), 72);
});

test('assignments, working and recall do not move beds to a different group', () => {
  const state = crowded(), before = housingStatus(state).housedResidentIds;
  command(state, { type: 'assign', building: 'farm', delta: 12 });
  command(state, { type: 'assign', building: 'quarry', delta: 12 });
  command(state, { type: 'assign', building: 'lumber', delta: 12 });
  assert.notDeepEqual(state.residents.map(person => person.id), ids(1, 48), 'Actual assignments should rearrange crew order in this regression');
  assert.deepEqual(housingStatus(state).housedResidentIds, before);
  tick(state, 120);
  assert.ok(state.residents.filter(person => person.workplace === 'lumber').every(person => !residentHasHousing(state, person)));
  assert.ok(state.residents.filter(person => person.workplace === 'farm').every(person => residentHasHousing(state, person)));
  command(state, { type: 'assign', building: 'farm', delta: -1 });
  assert.deepEqual(housingStatus(state).housedResidentIds, before);
});

test('only the unhoused subset has half work speed and double meal demand', () => {
  const state = crowded();
  for (const person of state.residents) {
    const housed = person.id <= 24;
    assert.equal(residentHasHousing(state, person), housed);
    assert.equal(residentWorkMultiplier(state, person), housed ? 1 : 0.5);
    assert.equal(residentFoodMultiplier(state, person), housed ? 1 : 2);
  }
  assert.equal(state.residents.reduce((sum, person) => sum + residentFoodMultiplier(state, person), 0), 72);
});

test('loaded save preserves people and derived bed allocation even after crew reordering', () => {
  const state = crowded();
  command(state, { type: 'assign', building: 'farm', delta: 12 });
  const before = housingStatus(state);
  const restored = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
  assert.deepEqual(housingStatus(restored), before);
  assert.deepEqual(restored.residents.map(person => person.personUid), state.residents.map(person => person.personUid));
  assert.equal(restored.version, state.version);
});

test('new arrivals wait for an available bed; a vacated bed or completed House level supplies one', () => {
  const state = crowded();
  state.population++;
  state.residents.push({ ...state.residents[0], id: 49, personUid: 'island-1:resident-49' });
  assert.equal(residentHasHousing(state, state.residents.at(-1)), false);
  state.residents = state.residents.filter(person => person.id !== 5);
  state.population--;
  assert.equal(residentHasHousing(state, state.residents.find(person => person.id === 25)), true);
  assert.equal(residentHasHousing(state, state.residents.find(person => person.id === 26)), false);
  state.buildings.house.level = 2;
  assert.equal(housingStatus(state).unhoused, 0);
  assert.equal(foodDemandPerHour(state), 48);
  assert.ok(state.residents.every(person => residentHasHousing(state, person)));
});

test('a same-array death and admission refresh beds even when population and array length are unchanged', () => {
  const state = crowded(), originalArray = state.residents;
  assert.deepEqual(housingStatus(state).housedResidentIds, ids(1, 24));
  const [departed] = state.residents.splice(4, 1);
  state.residentSequence++;
  const newcomer = { ...departed, id: state.residentSequence, personUid: `island-1:resident-${state.residentSequence}` };
  state.residents.push(newcomer);
  assert.equal(state.residents, originalArray);
  assert.equal(state.residents.length, 48);
  assert.equal(state.population, 48);
  assert.equal(residentHasHousing(state, departed), false);
  assert.equal(residentHasHousing(state, state.residents.find(person => person.id === 25)), true);
  assert.equal(residentHasHousing(state, newcomer), false);
  assert.deepEqual(housingStatus(state).housedResidentIds, ids(1, 25).filter(id => id !== 5));
});

test('missing beds no longer subtract happiness from every resident', () => {
  const state = crowded();
  for (const person of state.residents) {
    person.newbornRemaining = 0;
    person.workplace = 'farm';
    person.arrivalRemaining = 0;
    person.hungerSeconds = person.unemployedSeconds = 0;
  }
  assert.equal(residentHappinessRate(state, state.residents[0]), 2);
  assert.equal(residentHappinessRate(state, state.residents[47]), 2);
  assert.equal(residentWorkMultiplier(state, state.residents[47]), 0.5);
});

test('housing effect names only the unhoused subset and reports actual work and Food consequences', () => {
  const state = crowded(), before = JSON.stringify(state);
  const rows = activeEffects(state), row = rows.find(item => item.id === 'unhoused-residents');
  assert.equal(JSON.stringify(state), before, 'Housing effect inspection must remain read-only');
  assert.equal(rows.find(item => item.id === 'overcrowding'), undefined);
  assert.deepEqual(row.residentIds, ids(25, 48));
  assert.equal(row.scope, '24 residents');
  assert.equal(row.amount, null, 'A work/meal modifier must not be presented as happiness subtraction');
  assert.match(row.effect, /Work speed ×0\.5.*Food consumption ×2.*no House points/);
  assert.doesNotMatch(row.effect, /pp happiness/);
  state.lighthouseRemaining = 3600;
  assert.deepEqual(activeEffects(state).find(item => item.id === 'unhoused-residents').residentIds, ids(25, 48));
  state.buildings.house.level = 2;
  assert.equal(activeEffects(state).find(item => item.id === 'unhoused-residents'), undefined);
});

test('ordinary worker reaches work in exactly two minutes and returns in exactly two minutes', () => {
  assert.equal(WALK_SECONDS, 120);
  const state = createState(NOW);
  command(state, { type: 'assign', building: 'farm', delta: 1 });
  const person = state.residents.find(resident => resident.workplace === 'farm');
  assert.equal(person.arrivalRemaining, 120);
  tick(state, 119);
  assert.equal(person.arrivalRemaining, 1);
  assert.equal(residentIsWorking(state, person), false);
  tick(state, 1);
  assert.equal(person.arrivalRemaining, 0);
  assert.equal(residentIsWorking(state, person), true);
  command(state, { type: 'assign', building: 'farm', delta: -1 });
  assert.equal(person.returnRemaining, 120);
  tick(state, 119);
  assert.equal(residentAtHome(person), false);
  tick(state, 1);
  assert.equal(residentAtHome(person), true);
});

test('legacy five-minute walks restore with at most two minutes remaining without changing identity', () => {
  const state = createState(NOW);
  command(state, { type: 'assign', building: 'farm', delta: 1 });
  const person = state.residents.find(resident => resident.workplace === 'farm');
  person.arrivalRemaining = 300;
  const restored = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
  const samePerson = restored.residents.find(resident => resident.personUid === person.personUid);
  assert.equal(samePerson.arrivalRemaining, 120);
  assert.equal(samePerson.workplace, 'farm');
});

test('world consumption actually charges 72 Food for 48 residents with 24 beds over one hour', () => {
  const state = crowded(), before = state.resources.food + state.foodCredit;
  assert.equal(worldFoodDemandPerHour(state), 72);
  tick(state, 3600);
  assert.ok(Math.abs(before - state.resources.food - state.foodCredit - 72) < 1e-7);
  assert.equal(state.population, 48);
});

test('fresh daily House pool is 24, rejects an unhoused recipient and gives everyone only to the housed group', () => {
  const state = freshCrowdedPool();
  assert.equal(state.houseHappinessPool.grantPopulation, 24);
  assert.equal(state.houseHappinessPool.points, 24);
  const before = state.residents.map(person => person.happiness);
  const rejected = act(state, { type: 'houseHappiness', residentId: 25, amount: 1 }, NOW);
  assert.equal(rejected.ok, false);
  assert.equal(state.houseHappinessPool.points, 24);
  assert.deepEqual(state.residents.map(person => person.happiness), before);
  command(state, { type: 'houseHappinessAll', amount: 1 });
  assert.equal(state.houseHappinessPool.points, 0);
  assert.ok(state.residents.filter(person => person.id <= 24).every(person => person.happiness === before[person.id - 1] + 1));
  assert.ok(state.residents.filter(person => person.id > 24).every(person => person.happiness === before[person.id - 1]));
});

test('housing migration retains points already spent instead of refunding a larger old population grant', () => {
  const state = crowded();
  state.houseHappinessPool.grantPopulation = 48;
  state.houseHappinessPool.points = 30; // Eighteen points already spent today.
  const restored = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
  assert.equal(restored.houseHappinessPool.grantPopulation, 24);
  assert.equal(restored.houseHappinessPool.points, 6);
  const again = normalizeState(JSON.parse(JSON.stringify(restored)), NOW);
  assert.equal(again.houseHappinessPool.points, 6);
});

test('automatic distribution affects only the same housed residents and Warsaw midnight refreshes 24 points', () => {
  const withPoints = freshCrowdedPool();
  const withoutPoints = normalizeState(JSON.parse(JSON.stringify(withPoints)), NOW);
  withoutPoints.houseHappinessPool.points = 0;
  const untilAutomatic = (withPoints.houseHappinessPool.nextRefreshAt - NOW) / 1000 - 120;
  tick(withPoints, untilAutomatic);
  tick(withoutPoints, untilAutomatic);
  assert.equal(withPoints.houseHappinessPool.autoDone, true);
  assert.equal(withPoints.houseHappinessPool.points, 0);
  let distributed = 0;
  for (const person of withPoints.residents) {
    const other = withoutPoints.residents.find(value => value.id === person.id);
    const delta = person.happiness - other.happiness;
    if (person.id > 24) assert.ok(Math.abs(delta) < 1e-7, 'An unhoused resident received automatic House points');
    else distributed += delta;
  }
  assert.ok(Math.abs(distributed - 24) < 1e-7);
  tick(withPoints, 120);
  assert.equal(withPoints.houseHappinessPool.grantPopulation, 24);
  assert.equal(withPoints.houseHappinessPool.points, 24);
  assert.equal(withPoints.houseHappinessPool.autoDone, false);
});
