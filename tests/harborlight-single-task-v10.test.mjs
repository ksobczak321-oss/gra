import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../harborlight-v1-state.js';
import {
  activeLighthouseTask, activityAction, advanceActivities,
  nextActivitiesEvent, normalizeActivities, taskStatus
} from '../harborlight-v1-activities.js';

const NOW = Date.UTC(2026, 9, 23, 12);
const HOUR = 3600;
function island() {
  const state = createState(NOW);
  for (const task of state.lighthouseTasks) {
    task.requirements = { wood: 20, stone: 10 };
    task.deposited = { wood: 0, stone: 0 };
    task.levelSnapshot = { wood: 1, stone: 1 };
    task.reward = { coins: 100, grain: 50 };
  }
  return state;
}
function reload(state, legacy = false) {
  const raw = structuredClone(state);
  if (legacy) delete raw.activeTaskId;
  const restored = structuredClone(raw);
  normalizeActivities(restored, raw);
  return restored;
}
function accept(state, task) {
  const result = activityAction(state, { type: 'taskAccept', task: task.id });
  assert.equal(result.ok, true, result.message);
  assert.equal(result.draft, true);
  const confirmed = activityAction(state, { type: 'confirmTaskAcceptance', task: task.id });
  assert.equal(confirmed.ok, true, confirmed.message);
}
function deposit(state, task, resource, amount) {
  const result = activityAction(state, { type: 'taskDeposit', task: task.id, resource, amount });
  assert.equal(result.ok, true, result.message);
  return result;
}

test('starting one task locks other starts and deposits without changing their rewards or stock', () => {
  const state = island(), [first, second] = state.lighthouseTasks;
  assert.equal(state.activeTaskId, null);
  assert.equal(taskStatus(state, first).canActivate, true);
  accept(state, first);
  assert.equal(activeLighthouseTask(state), first);
  assert.equal(taskStatus(state, first).active, true);
  assert.equal(taskStatus(state, second).active, false);
  assert.equal(taskStatus(state, second).canActivate, false);
  deposit(state, first, 'wood', 5);
  const before = structuredClone(state);
  assert.equal(activityAction(state, { type: 'taskAccept', task: second.id }).ok, false);
  assert.equal(activityAction(state, { type: 'taskDeposit', task: second.id, resource: 'wood', amount: 1 }).ok, false);
  assert.equal(activityAction(state, { type: 'taskAccept', task: first.id }).ok, false);
  assert.deepEqual(state, before);
  assert.equal(first.deposited.wood, 5);
});

test('a partial active task and its locked early bonus survive reload without reselection', () => {
  let state = island();
  const id = state.lighthouseTasks[1].id;
  accept(state, state.lighthouseTasks[1]);
  deposit(state, state.lighthouseTasks[1], 'stone', 4);
  advanceActivities(state, 301);
  state = reload(state);
  const active = activeLighthouseTask(state);
  assert.equal(active.id, id);
  assert.deepEqual(active.deposited, { wood: 0, stone: 4 });
  assert.equal(active.acceptedAt, 0);
  assert.equal(active.multiplier, 3);
  assert.equal(taskStatus(state, active).active, true);
});

test('completion pays once, releases the active slot and leaves the replacement unstarted', () => {
  let state = island();
  const [first, second] = state.lighthouseTasks;
  const coins = state.resources.coins, grain = state.resources.grain;
  accept(state, first);
  deposit(state, first, 'wood', 20);
  assert.equal(deposit(state, first, 'stone', 10).completed, true);
  assert.equal(state.resources.coins, coins + 300);
  assert.equal(state.resources.grain, grain + 150);
  assert.equal(state.activeTaskId, null);
  assert.equal(activeLighthouseTask(state), null);
  assert.equal(state.lighthouseTasks.length, 3);
  const after = structuredClone(state);
  assert.equal(activityAction(state, { type: 'taskDeposit', task: first.id, resource: 'stone', amount: 10 }).ok, false);
  assert.deepEqual(state, after);
  state = reload(state);
  assert.equal(state.activeTaskId, null);
  accept(state, state.lighthouseTasks.find(task => task.id === second.id));
  assert.equal(state.activeTaskId, second.id);
});

test('expiry loses the active deposit and releases the slot at the actual task deadline', () => {
  const state = island(), [first, second] = state.lighthouseTasks;
  accept(state, first);
  deposit(state, first, 'wood', 7);
  const stock = state.resources.wood;
  first.expiresAt = 300;
  assert.equal(nextActivitiesEvent(state), 300);
  advanceActivities(state, 299);
  assert.equal(state.activeTaskId, first.id);
  advanceActivities(state, 1);
  assert.equal(state.activeTaskId, null);
  assert.equal(activeLighthouseTask(state), null);
  assert.equal(state.resources.wood, stock);
  assert.equal(state.lighthouseTasks.some(task => task.id === first.id), false);
  accept(state, second);
  assert.equal(state.activeTaskId, second.id);
});

test('legacy multiple accepts choose largest deposits, preserve dormant work and retain the bonus on resume', () => {
  let state = island();
  state.activityClock = 600;
  const [first, second, third] = state.lighthouseTasks;
  first.acceptedAt = 10; first.bonusLockedAt = 10; first.multiplier = 3; first.deposited.wood = 2;
  second.acceptedAt = 100; second.bonusLockedAt = 100; second.multiplier = 2; second.deposited.wood = 8;
  third.acceptedAt = 0; third.bonusLockedAt = 0; third.multiplier = 3; third.deposited.wood = 3;
  const before = structuredClone(state.lighthouseTasks);
  state = reload(state, true);
  assert.equal(state.activeTaskId, second.id);
  assert.deepEqual(state.lighthouseTasks, before);
  const dormant = state.lighthouseTasks.find(task => task.id === first.id);
  const beforeRejected = structuredClone(state);
  assert.equal(activityAction(state, { type: 'taskDeposit', task: first.id, resource: 'wood', amount: 1 }).ok, false);
  assert.equal(activityAction(state, { type: 'taskAccept', task: first.id }).ok, false);
  assert.deepEqual(state, beforeRejected);

  const active = activeLighthouseTask(state);
  deposit(state, active, 'wood', 12); deposit(state, active, 'stone', 10);
  state = reload(state);
  assert.equal(state.activeTaskId, null);
  assert.equal(state.lighthouseTasks.find(task => task.id === third.id).deposited.wood, 3);
  accept(state, state.lighthouseTasks.find(task => task.id === first.id));
  const resumed = activeLighthouseTask(state);
  assert.equal(resumed.id, first.id);
  assert.equal(resumed.acceptedAt, dormant.acceptedAt);
  assert.equal(resumed.multiplier, dormant.multiplier);
  assert.equal(resumed.expiresAt, dormant.expiresAt);
  assert.deepEqual(resumed.deposited, dormant.deposited);
});

test('legacy ties use oldest acceptance, while a valid saved active selection takes precedence', () => {
  let state = island();
  state.activityClock = 600;
  const [first, second] = state.lighthouseTasks;
  first.acceptedAt = 100; first.multiplier = 2; first.deposited.stone = 4;
  second.acceptedAt = 10; second.multiplier = 3; second.deposited.wood = 4;
  state = reload(state, true);
  assert.equal(state.activeTaskId, second.id);
  state.activeTaskId = first.id;
  state = reload(state);
  assert.equal(state.activeTaskId, first.id);
});

test('an explicit empty active slot and dormant deposits stay empty through reload and offline expiry', () => {
  let state = island();
  const dormant = state.lighthouseTasks[0];
  dormant.acceptedAt = 10; dormant.multiplier = 3; dormant.deposited.wood = 4;
  state.activityClock = 600;
  state.activeTaskId = null;
  state = reload(state);
  assert.equal(state.activeTaskId, null);
  assert.equal(activeLighthouseTask(state), null);
  assert.equal(state.lighthouseTasks[0].deposited.wood, 4);
  advanceActivities(state, 6 * HOUR);
  assert.equal(state.activeTaskId, null);
  assert.equal(state.lighthouseTasks.length, 3);
  assert.equal(state.lighthouseTasks.some(task => task.id === dormant.id), false);
});

test('expiry of another offer does not release the active task', () => {
  const state = island(), [active, other] = state.lighthouseTasks;
  accept(state, active);
  other.expiresAt = 300;
  advanceActivities(state, 300);
  assert.equal(state.activeTaskId, active.id);
  assert.equal(activeLighthouseTask(state), active);
  assert.equal(state.lighthouseTasks.length, 3);
});
