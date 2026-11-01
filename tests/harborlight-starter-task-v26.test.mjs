import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState } from '../harborlight-v1-state.js';
import { advanceActivities, normalizeActivities, activityAction, taskReward } from '../harborlight-v1-activities.js';

const NOW = Date.parse('2026-11-01T12:00:00Z');
function eligible() {
  const state = createState(NOW); state.buildings.townhall.level = 2;
  advanceActivities(state, 0); return state;
}
const starter = state => state.lighthouseTasks.find(task => task.tutorialStarter === true);

test('the TH2 course offers one affordable task without crediting inventory and reload preserves its identity', () => {
  const state = createState(NOW), before = structuredClone(state.resources);
  assert.equal(starter(state), undefined);
  state.buildings.townhall.level = 2; advanceActivities(state, 0);
  const task = starter(state);
  assert.ok(task); assert.equal(state.lighthouseTasks.filter(row => row.tutorialStarter).length, 1);
  assert.deepEqual(task.requirements, { wood: 50, stone: 50 }); assert.deepEqual(task.reward, { coins: 100 });
  assert.deepEqual(state.resources, before);
  const raw = JSON.parse(JSON.stringify(state)), loaded = normalizeState(raw, NOW);
  assert.deepEqual(starter(loaded), task);
  advanceActivities(loaded, 0); assert.equal(starter(loaded).id, task.id);
});

test('accepted legacy tasks and open confirmations are never replaced by the starter', () => {
  for (const mode of ['accepted', 'draft']) {
    const state = createState(NOW), task = state.lighthouseTasks[0];
    if (mode === 'accepted') { task.acceptedAt = 0; task.bonusLockedAt = 0; task.deposited[Object.keys(task.requirements)[0]] = 1; state.activeTaskId = task.id; }
    else state.taskAcceptanceDraft = { taskId: task.id, startedAt: 0, expiresAt: 60, multiplier: 3 };
    const before = structuredClone(state.lighthouseTasks);
    state.buildings.townhall.level = 2; advanceActivities(state, 0);
    assert.equal(starter(state), undefined); assert.deepEqual(state.lighthouseTasks, before);
  }
});

test('the starter consumes actual contributions once and its completion receipt prevents regeneration', () => {
  const state = eligible(), task = starter(state), before = structuredClone(state.resources);
  assert.equal(activityAction(state, { type: 'taskAccept', task: task.id }).ok, true);
  assert.equal(activityAction(state, { type: 'confirmTaskAcceptance', task: task.id }).ok, true);
  const reward = taskReward(task).coins;
  const partial = activityAction(state, { type: 'taskDeposit', task: task.id, resource: 'wood', amount: 50 });
  assert.equal(partial.completed, undefined); assert.equal(state.resources.coins, before.coins);
  const complete = activityAction(state, { type: 'taskDeposit', task: task.id, resource: 'stone', amount: 50 });
  assert.equal(complete.completed, true); assert.equal(state.resources.wood, before.wood - 50);
  assert.equal(state.resources.stone, before.stone - 50); assert.equal(state.resources.coins, before.coins + reward);
  assert.equal(state.taskAchievements.find(item => item.id === complete.achievementId).tutorialStarter, true);
  const after = structuredClone(state.resources);
  advanceActivities(state, 0); assert.equal(starter(state), undefined);
  normalizeActivities(state, state); advanceActivities(state, 0);
  assert.equal(starter(state), undefined); assert.deepEqual(state.resources, after);
  assert.equal(activityAction(state, { type: 'taskDeposit', task: task.id, resource: 'stone', amount: 50 }).ok, false);
});

test('older course saves and finished/replay-only courses keep their original offers', () => {
  for (const variant of ['older', 'finished', 'review']) {
    const state = createState(NOW); state.buildings.townhall.level = 2;
    if (variant === 'older') state.tutorial.curriculum = 4;
    else if (variant === 'finished') state.tutorial.completed['lighthouse-visits'] = true;
    else state.tutorial.rewardDisabled = true;
    const before = structuredClone(state.lighthouseTasks);
    const loaded = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
    advanceActivities(loaded, 0);
    assert.equal(starter(loaded), undefined, variant); assert.deepEqual(loaded.lighthouseTasks, before, variant);
  }
});
