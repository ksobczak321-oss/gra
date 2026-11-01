import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createState, normalizeState, act, tick, advanceTo, populationRate, taxRate,
  updateHappiness, dailyBlessingStatus, islandCalendar
} from '../harborlight-v1-state.js';
import {
  normalizeResidents, synchronizeResidents, residentHappiness, residentHappinessRate,
  residentSegments, advanceResidents, beginLighthouseBonus, settleResidentEvents,
  welcomeStatus, NEED_GRACE_SECONDS
} from '../harborlight-v1-residents.js';
import { activeEffects } from '../harborlight-v1-effects.js';
import { constructionCounts } from '../harborlight-v1-logistics.js';

const NOW = Date.parse('2026-10-30T12:00:00Z');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
function simulateResidents(state, seconds) {
  let left = seconds;
  while (left > 1e-7) {
    const segment = residentSegments(state);
    const elapsed = Math.min(left, segment.nextEvent);
    assert.ok(elapsed > 1e-8, 'resident time must move forward');
    advanceResidents(segment, elapsed);
    state.worldTimeMs += elapsed * 1000;
    settleResidentEvents(state);
    left = Math.max(0, left - elapsed);
  }
}

test('welcome protects every arrival at20 and expiry does not backcharge remembered losses', () => {
  const state = createState(NOW);
  assert.equal(state.happiness, 20);
  assert.equal(state.residents.every(person => residentHappiness(state, person) === 20), true);
  state.population++;
  synchronizeResidents(state);
  const newcomer = state.residents.at(-1);
  assert.ok(newcomer.newbornRemaining > 0);
  assert.equal(residentHappiness(state, newcomer), 20);
  state.resources.food = 0; state.foodCredit = 0;
  for (const person of state.residents) {
    person.happiness = 20;
    person.hungerSeconds = NEED_GRACE_SECONDS + 3600;
    person.unemployedSeconds = NEED_GRACE_SECONDS + 3600;
  }
  simulateResidents(state, 72 * 3600);
  assert.equal(welcomeStatus(state).active, false);
  for (const person of state.residents) close(residentHappiness(state, person), 20);
  simulateResidents(state, 3600);
  for (const person of state.residents) close(residentHappiness(state, person), 10);
});

test('Lighthouse100 overrides newborn0 only for the remaining shared duration across reload', () => {
  let state = createState(NOW);
  state.welcome = { startedAt: 0, until: 0 };
  state.resources.food = 10000;
  beginLighthouseBonus(state, 7200);
  state.population++;
  synchronizeResidents(state);
  const id = state.residents.at(-1).id;
  assert.equal(residentHappiness(state, state.residents.at(-1)), 100);
  assert.equal(residentHappinessRate(state, state.residents.at(-1)), 0);
  tick(state, 3600);
  state = normalizeState(JSON.parse(JSON.stringify(state)), state.worldTimeMs);
  close(state.lighthouseRemaining, 3600);
  assert.equal(residentHappiness(state, state.residents.find(person => person.id === id)), 100);
  tick(state, 3600);
  const newcomer = state.residents.find(person => person.id === id);
  assert.equal(state.lighthouseRemaining, 0);
  assert.ok(newcomer.newbornRemaining > 0);
  assert.equal(residentHappiness(state, newcomer), 0);
});

test('assignment pauses unemployment immediately but recall before arrival does not reset its clock', () => {
  const state = createState(NOW);
  state.welcome = { startedAt: 0, until: 0 };
  state.resources.food = 0; state.foodCredit = 0;
  const person = state.residents[0]; person.unemployedSeconds = 13 * 3600;
  assert.equal(residentHappinessRate(state, person), -5);
  assert.equal(act(state, { type: 'assign', building: 'quarry', delta: 1 }, NOW).ok, true);
  assert.equal(residentHappinessRate(state, person), 0);
  assert.equal(taxRate(state), 0);
  assert.equal(activeEffects(state).some(effect => effect.id === 'unemployment' && effect.residentIds.includes(person.id)), false);
  tick(state, 60);
  assert.equal(person.unemployedSeconds, 13 * 3600);
  assert.equal(act(state, { type: 'assign', building: 'quarry', delta: -1 }, state.worldTimeMs).ok, true);
  assert.equal(residentHappinessRate(state, person), -5);
  assert.ok(person.unemployedSeconds >= 13 * 3600);
  tick(state, 120);
  state.residents = [person, ...state.residents.filter(other => other !== person)];
  assert.equal(act(state, { type: 'assign', building: 'quarry', delta: 1 }, state.worldTimeMs).ok, true);
  tick(state, 120);
  assert.equal(person.unemployedSeconds, 0);
  assert.equal(taxRate(state), 1);
});

test('positive arrivals are twice as frequent while negative departures keep the agreed rate', () => {
  close(populationRate(20), 1 / 7.5);
  close(populationRate(50), 1 / 3);
  close(populationRate(100), 2);
  close(populationRate(-20), -1 / 15);
  close(populationRate(-100), -1);
  const state = createState(NOW);
  state.resources.food = 10000;
  beginLighthouseBonus(state, 3600);
  tick(state, 1800);
  assert.equal(state.population, 13);
});

test('daily blessing renews atWarsawmidnight and ads share the paid wait without a coin charge', () => {
  const state = createState(Date.parse('2026-10-30T22:30:00Z'));
  state.resources.coins = 1000;
  assert.equal(act(state, { type: 'blessing' }, state.worldTimeMs).ok, true);
  assert.equal(dailyBlessingStatus(state).remaining, 0);
  tick(state, 3600);
  assert.equal(dailyBlessingStatus(state).available, true);
  assert.equal(act(state, { type: 'paidBlessing' }, state.worldTimeMs).ok, true);
  tick(state, 3600);
  assert.equal(act(state, { type: 'adBlessing', receiptId: 'ad-1' }, state.worldTimeMs, { rewardedAdVerified: true }).ok, false);
  tick(state, 4 * 3600);
  const before = state.resources.coins;
  assert.equal(act(state, { type: 'adBlessing', receiptId: 'ad-1' }, state.worldTimeMs).ok, false);
  assert.equal(act(state, { type: 'adBlessing', receiptId: 'ad-1' }, state.worldTimeMs, { rewardedAdVerified: true }).ok, true);
  assert.equal(state.resources.coins, before + 50);
  tick(state, 5 * 3600);
  assert.equal(act(state, { type: 'adBlessing', receiptId: 'ad-1' }, state.worldTimeMs, { rewardedAdVerified: true }).ok, false);
});

test('queue capacity remains binding when a different active construction slot is free', () => {
  const state = createState(NOW);
  state.buildings.townhall.level = 4; state.buildings.warehouse.level = 4;
  Object.assign(state.resources, { coins: 10000, wood: 2500, stone: 2500, grain: 1000, food: 2000, planks: 1500 });
  for (const building of ['farm', 'farm', 'farm', 'windmill', 'windmill', 'windmill', 'sawmill']) assert.equal(act(state, { type: 'upgrade', building }, NOW).ok, true);
  const counts = constructionCounts(state);
  assert.equal(counts.active, 3); assert.equal(counts.queued, 4);
  assert.equal(act(state, { type: 'upgrade', building: 'sawmill' }, NOW).ok, false);
  assert.equal(constructionCounts(state).queued, 4);
});

test('deleting read notifications preserves every unread message', () => {
  const state = createState(NOW);
  state.notifications = [{ id: 1, read: true }, { id: 2, read: false }, { id: 3, read: true }];
  const result = act(state, { type: 'deleteReadNotifications' }, NOW);
  assert.equal(result.deleted, 2);
  assert.deepEqual(state.notifications.map(item => item.id), [2]);
});

test('fictionalJanuary1 uses the realWarsawclock and calendar survives saved progression', () => {
  let state = createState(Date.parse('2026-10-30T22:30:00Z'));
  let calendar = islandCalendar(state);
  assert.deepEqual([calendar.date, calendar.month, calendar.hour, calendar.minute], [1, 1, 23, 30]);
  advanceTo(state, Date.parse('2026-10-30T23:30:00Z'));
  calendar = islandCalendar(state);
  assert.deepEqual([calendar.date, calendar.month, calendar.hour, calendar.minute], [2, 1, 0, 30]);
  state = normalizeState(JSON.parse(JSON.stringify(state)), state.worldTimeMs);
  assert.equal(islandCalendar(state).date, 2);
  const legacy = JSON.parse(JSON.stringify(state)); delete legacy.welcome;
  const restored = normalizeState(legacy, state.worldTimeMs);
  assert.equal(welcomeStatus(restored).active, false, 'upgrading an existing save must not recreate the welcome reward');
});

test('reload preserves an expedition20 wallet and spendable bonus materials above storage capacity', () => {
  const state = createState(NOW);
  state.resources.coins = 52_428_750;
  state.resources.wood = 12_000_000;
  state.bonusMaterials.wood = 11_999_000;
  const restored = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
  assert.equal(restored.resources.coins, 52_428_750);
  assert.equal(restored.resources.wood, 12_000_000);
  assert.equal(restored.bonusMaterials.wood, 11_999_000);
  const again = normalizeState(JSON.parse(JSON.stringify(restored)), NOW);
  assert.equal(again.resources.coins, state.resources.coins);
  assert.equal(again.resources.wood, state.resources.wood);
  assert.equal(again.bonusMaterials.wood, state.bonusMaterials.wood);
});

test('server-issued island generations survive reload and malformed generations cannot become authority', () => {
  const state = createState(NOW);
  assert.equal(state.islandGeneration, 1);
  state.islandGeneration = 3;
  const restored = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
  assert.equal(restored.islandGeneration, 3);
  for (const value of [0, -1, 3.5, null, '3', Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(normalizeState({ ...state, islandGeneration: value }, NOW).islandGeneration, 1);
  }
});
