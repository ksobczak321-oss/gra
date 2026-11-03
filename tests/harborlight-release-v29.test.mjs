import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, recordVisit, tick, upgradeEligibility, houseHappinessStatus } from '../harborlight-v1-state.js';
import { SHARED_ACCOUNT_FIELDS } from '../harborlight-v1-archipelago.js';
import { preserveAccountProgress } from '../harborlight-v1-commerce.js';

const start = Date.parse('2026-11-03T12:00:00Z');
const copy = value => JSON.parse(JSON.stringify(value));

test('welcome residents: one per login day, no offline grant, no House tutorial deadlock', () => {
  const world = createState(start);
  recordVisit(world, start);
  assert.equal(world.population, 13);
  assert.equal(world.residents.filter(person => person.newbornRemaining > 0).length, 1);
  assert.equal(houseHappinessStatus(world).eligible, 12);
  assert.ok(houseHappinessStatus(world).perResident >= 1);
  recordVisit(world, start + 3000);
  assert.equal(world.population, 13);
  assert.deepEqual(world.welcomeWorkers.claimedDays, ['2026-11-03']);
  const restored = normalizeState(copy(world), start + 3000);
  recordVisit(restored, start + 3000);
  assert.equal(restored.population, 13);
  // No productive workers or growth capacity: offline replay must not grant
  // days four through seven. We inspect the independent claim ledger.
  restored.buildings.townhall.level = 1;
  tick(restored, 2 * 86400);
  assert.deepEqual(restored.welcomeWorkers.claimedDays, ['2026-11-03']);
  recordVisit(restored, start + 2 * 86400000);
  assert.equal(restored.welcomeWorkers.granted, 2);
  assert.deepEqual(restored.welcomeWorkers.claimedDays, ['2026-11-03', '2026-11-05']);
});

test('welcome window follows game start after paused introduction and cannot restart on an old account', () => {
  const world = createState(start, { onboarding: true });
  recordVisit(world, start + 86400000);
  assert.equal(world.population, 12);
  assert.equal(act(world, { type: 'onboardingName', name: 'Przystań' }, start + 2 * 86400000).ok, true);
  assert.equal(act(world, { type: 'onboardingFinish' }, start + 2 * 86400000).ok, true);
  assert.equal(world.population, 13);
  assert.equal(world.welcomeWorkers.startedAt, start + 2 * 86400000);
  const saved = copy(world);
  const old = normalizeState(saved, start + 10 * 86400000);
  const before = old.welcomeWorkers.granted;
  recordVisit(old, start + 10 * 86400000);
  assert.equal(old.welcomeWorkers.granted, before);
  const reset = createState(start + 20 * 86400000);
  preserveAccountProgress(old, reset);
  recordVisit(reset, start + 20 * 86400000);
  assert.equal(reset.welcomeWorkers.startedAt, saved.welcomeWorkers.startedAt);
  assert.equal(reset.welcomeWorkers.granted, before);
});

test('full Town Hall consumes only today’s welcome opportunity without a delayed resident', () => {
  const world = createState(start);
  world.population = 24;
  recordVisit(world, start);
  assert.equal(world.population, 24);
  assert.equal(world.welcomeWorkers.granted, 0);
  world.population = 23;
  recordVisit(world, start + 1000);
  assert.equal(world.population, 23);
  assert.equal(world.welcomeWorkers.granted, 0);
});

test('restarting a world cannot renew an expired welcome window with no earlier claims', () => {
  const original = createState(start);
  const restartedAt = start + 20 * 86400000;
  const fresh = createState(restartedAt, { onboarding: true });
  preserveAccountProgress(original, fresh);
  assert.equal(fresh.welcomeWorkers.granted, 0);
  assert.equal(fresh.welcomeWorkers.claimedDays.length, 0);
  assert.equal(act(fresh, { type: 'onboardingName', name: 'Nowa przystań' }, restartedAt).ok, true);
  assert.equal(act(fresh, { type: 'onboardingFinish' }, restartedAt).ok, true);
  assert.equal(fresh.population, 12);
  assert.equal(fresh.welcomeWorkers.startedAt, start);
  recordVisit(fresh, restartedAt);
  assert.equal(fresh.population, 12);
});

test('Theatre and adventures persist through the real world normalizer without allowing Theatre upgrades', () => {
  const world = createState(start);
  world.resources.coins = 1000;
  assert.equal(world.buildings.theatre.level, 1);
  assert.equal(upgradeEligibility(world, 'theatre').ok, false);
  const bought = act(world, { type: 'theatreBuy', decoration: 'fountain', style: 'coastal', slot: 0 }, start);
  assert.equal(bought.ok, true, bought.message);
  const adventure = act(world, { type: 'adventureStart', kind: 'bridge' }, start);
  assert.equal(adventure.ok, true, adventure.message);
  const restored = normalizeState(copy(world), start);
  assert.deepEqual(restored.theatre.collection, world.theatre.collection);
  assert.equal(restored.adventures.active.id, world.adventures.active.id);
  assert.equal(restored.adventures.active.kind, 'bridge');
  assert.equal(restored.resources.coins, world.resources.coins);
  assert.equal(act(restored, { type: 'upgrade', building: 'theatre' }, start).ok, false);
});

test('a login on a daughter island still grants the account’s daily welcome resident once', () => {
  const parent = createState(start);
  recordVisit(parent, start);
  const raw = copy(parent);
  raw.islandId = 'island-2'; raw.islandRole = 'daughter'; raw.population = 6;
  const daughter = normalizeState(raw, start);
  const before = daughter.population;
  recordVisit(daughter, start + 86400000);
  assert.equal(daughter.population, before + 1);
  assert.equal(daughter.welcomeWorkers.granted, 2);
  parent.welcomeWorkers = copy(daughter.welcomeWorkers);
  recordVisit(parent, start + 86400000);
  assert.equal(parent.population, 13);
  assert.equal(parent.welcomeWorkers.granted, 2);
});

test('carrier recall acknowledgement and welcome claims are account fields, survive save and do not alter recalls', () => {
  const world = createState(start);
  const reply = act(world, { type: 'acknowledgeCarrierRecall' }, start);
  assert.equal(reply.ok, true);
  assert.equal(world.carrierRecallNoticeDay, '2026-11-03');
  assert.equal(normalizeState(copy(world), start).carrierRecallNoticeDay, '2026-11-03');
  assert.ok(SHARED_ACCOUNT_FIELDS.includes('carrierRecallNoticeDay'));
  assert.ok(SHARED_ACCOUNT_FIELDS.includes('welcomeWorkers'));
});
