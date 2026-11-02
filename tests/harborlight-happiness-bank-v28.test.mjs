import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, tick, act, houseHappinessStatus, HOUSE_HAPPINESS_RULES } from '../harborlight-v1-state.js';
import { residentHappiness, applyDailyHappinessDecay } from '../harborlight-v1-residents.js';
import { nextWarsawMidnightMs, warsawDayKey } from '../harborlight-v1-calendar.js';
const NOW = Date.parse('2026-11-02T12:00:00Z');
function ordinary(now = NOW, population = 12) {
  const raw = createState(now);
  raw.welcome = { startedAt: 0, until: 0 };
  raw.population = population; raw.buildings.townhall.level = Math.ceil(population / 24); raw.buildings.house.level = 1;
  delete raw.houseHappinessPool;
  const state = normalizeState(raw, now);
  for (const person of state.residents) { person.happiness = 20; person.newbornRemaining = 0; }
  return state;
}
function bank(state, portions) {
  state.houseHappinessPool.version = 2;
  state.houseHappinessPool.portions = portions.map(points => ({ points, population: points, day: warsawDayKey(state.worldTimeMs) }));
  state.houseHappinessPool.points = portions.reduce((a, b) => a + b, 0);
}
function reload(state) { return normalizeState(JSON.parse(JSON.stringify(state)), state.worldTimeMs); }

test('legacy House grant survives population loss and repeated save/load without shrinking', () => {
  const state = ordinary(NOW, 13);
  state.houseHappinessPool = { points: 13, grantPopulation: 13, nextRefreshAt: nextWarsawMidnightMs(NOW), generation: 4 };
  state.population = 12; state.residents.pop();
  const restored = reload(state), again = reload(restored);
  assert.equal(restored.houseHappinessPool.points, 13);
  assert.equal(again.houseHappinessPool.points, 13);
  assert.equal(restored.houseHappinessPool.portions[0].population, 13);
});

test('collective claim spends saved whole rounds and rejects individual gifts', () => {
  const state = ordinary(); bank(state, Array(7).fill(12));
  assert.equal(HOUSE_HAPPINESS_RULES.maximumPortions, 7);
  assert.equal(houseHappinessStatus(state).perResident, 7);
  assert.equal(act(state, { type: 'houseHappiness', residentId: 1, amount: 1 }, NOW).ok, false);
  const result = act(state, { type: 'houseHappinessAll' }, NOW);
  assert.equal(result.ok, true, result.message);
  assert.equal(result.distributed, 84);
  assert.ok(state.residents.every(person => person.happiness === 27));
  assert.equal(state.houseHappinessPool.points, 0);
  assert.equal(state.houseHappinessPool.portions.length, 0);
  assert.equal(act(state, { type: 'houseHappinessAll' }, NOW).ok, false);
});

test('incomplete collective round remains banked after a claim and reload', () => {
  const state = ordinary(); bank(state, [12, 12, 1]);
  const result = act(state, { type: 'houseHappinessAll' }, NOW);
  assert.equal(result.distributed, 24);
  assert.equal(state.houseHappinessPool.points, 1);
  assert.equal(houseHappinessStatus(state).canDistribute, false);
  assert.equal(reload(state).houseHappinessPool.points, 1);
});

test('collective claim targets housed residents and preserves protected/newborn points', () => {
  const state = ordinary(NOW, 48); bank(state, [24]);
  const result = act(state, { type: 'houseHappinessAll' }, NOW);
  assert.equal(result.distributed, 24);
  assert.ok(state.residents.filter(person => person.id <= 24).every(person => person.happiness === 21));
  assert.ok(state.residents.filter(person => person.id > 24).every(person => person.happiness === 20));
  bank(state, [24]); state.lighthouseRemaining = 3600;
  assert.equal(houseHappinessStatus(state).canDistribute, false);
  assert.equal(act(state, { type: 'houseHappinessAll' }, NOW).ok, false);
  assert.equal(state.houseHappinessPool.points, 24);
});

test('23:58 no longer auto-spends points and midnight adds a new portion', () => {
  const now = Date.parse('2026-11-02T22:57:00Z'), state = ordinary(now, 24);
  state.resources.food = 0; state.foodCredit = 0;
  bank(state, [24]);
  tick(state, 60);
  assert.equal(state.houseHappinessPool.points, 24);
  assert.equal(state.houseHappinessPool.autoDone, true);
  tick(state, 120);
  assert.equal(state.houseHappinessPool.points, 48);
  assert.equal(state.houseHappinessPool.portions.length, 2);
  assert.equal(reload(state).houseHappinessPool.points, 48);
});

test('full bank stays at seven unspent portions and reload never renews capacity', () => {
  const now = Date.parse('2026-11-02T22:59:59Z'), state = ordinary(now, 24);
  bank(state, Array(7).fill(24)); state.lighthouseRemaining = 86400 * 30;
  tick(state, 1);
  assert.equal(state.houseHappinessPool.points, 168);
  assert.equal(state.houseHappinessPool.portions.length, 7);
  const restored = reload(state); tick(restored, 86400);
  assert.equal(restored.houseHappinessPool.points, 168);
  assert.equal(restored.houseHappinessPool.portions.length, 7);
});

test('daily decay is one point at Warsaw midnight, not per hour or reload', () => {
  const now = Date.parse('2026-11-02T22:59:40Z'), state = ordinary(now);
  state.resources.food = 0; state.foodCredit = 0;
  for (const person of state.residents) person.happiness = 50;
  tick(state, 19);
  assert.equal(state.residents[0].happiness, 50);
  tick(state, 1);
  assert.equal(state.residents[0].happiness, 49);
  const restored = reload(state);
  assert.equal(restored.residents[0].happiness, 49);
  tick(restored, 30);
  assert.equal(restored.residents[0].happiness, 49);
});

test('daily decay respects welcome floor, newborn settling and forced Lighthouse happiness', () => {
  const state = ordinary();
  state.welcome = { startedAt: NOW, until: NOW + 3600000 };
  applyDailyHappinessDecay(state);
  assert.ok(state.residents.every(person => person.happiness === 20));
  state.welcome.until = 0; state.residents[0].newbornRemaining = 3600; state.residents[0].happiness = 0;
  state.lighthouseRemaining = 3600;
  const before = state.residents.map(person => person.happiness);
  applyDailyHappinessDecay(state);
  assert.deepEqual(state.residents.map(person => person.happiness), before);
  assert.equal(residentHappiness(state, state.residents[0]), 100);
});

test('DST autumn midnight does not count the repeated hour as another daily portion', () => {
  const now = Date.parse('2026-10-24T22:00:00Z'), state = ordinary(now, 24);
  bank(state, [24]); state.lighthouseRemaining = 86400 * 30;
  assert.equal(state.houseHappinessPool.refreshRemaining, 25 * 3600);
  tick(state, 24 * 3600);
  assert.equal(state.houseHappinessPool.points, 24);
  tick(state, 3600);
  assert.equal(state.houseHappinessPool.points, 48);
  assert.equal(state.houseHappinessPool.portions.length, 2);
});

test('tour removal migrates each saved index exactly once in onboarding and review', () => {
  const raw = ordinary();
  raw.onboarding = { version: 1, stage: 'tour', index: 9, worldStartedAt: null, completedAt: null };
  raw.learning.tour = { index: 9, active: true, paused: false, completed: false };
  const migrated = reload(raw), twice = reload(migrated);
  assert.equal(migrated.onboarding.index, 8);
  assert.equal(migrated.learning.tour.index, 8);
  assert.equal(migrated.onboarding.routeVersion, 2);
  assert.equal(migrated.learning.tour.routeVersion, 2);
  assert.equal(twice.onboarding.index, 8);
  assert.equal(twice.learning.tour.index, 8);
});
