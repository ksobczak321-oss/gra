import test from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIAL_LESSONS, TUTORIAL_VERSION, normalizeProgression, progressionAction,
  advanceProgression, recordProgressionAction, tutorialRows, tutorialStatus,
  tutorialPendingRewards, tutorialWarehouseOverfull } from '../harborlight-v1-progression.js';
import { receiveMaterials } from '../harborlight-v1-logistics.js';
import { spendMaterials } from '../harborlight-v1-inventory.js';
import { createState, act } from '../harborlight-v1-state.js';

const NOW = Date.parse('2026-10-24T01:42:26.934Z');
const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const context = { receiveMaterials };
function island() {
  const state = { worldTimeMs: NOW, activityClock: 0, activeSeconds: 0,
    resources: { coins: 100, ...Object.fromEntries(MATERIALS.map(id => [id, 100])) },
    pendingDeliveries: Object.fromEntries(MATERIALS.map(id => [id, 0])),
    buildings: { townhall: { level: 1 }, warehouse: { level: 1 } },
    residents: Array.from({ length: 12 }, (_, id) => ({ id: id + 1, workplace: null, arrivalRemaining: 0 })),
    statistics: { collected: 0, crafted: 0 }, warehousePriorities: [], constructionProjects: [], notifications: [] };
  normalizeProgression(state, {});
  return state;
}
const action = (state, type, extra = {}) => progressionAction(state, { type, ...extra }, context);
const claim = (state, taskId) => action(state, 'claimTutorial', { taskId });
function reload(state) {
  const raw = structuredClone(state), restored = structuredClone(state);
  normalizeProgression(restored, raw);
  return restored;
}
function accepted(state, command) { recordProgressionAction(state, command, { ok: true }); }
function finishLesson(state, item) {
  if (item.kind === 'condition') {
    const key = item.subject === 'delivery' ? 'collected' : 'crafted';
    state.statistics[key] = (state.statistics[key] || 0) + 1;
    advanceProgression(state);
  } else if (item.subject.startsWith('assign-')) accepted(state, { type: 'assign', building: item.subject.slice(7), delta: 1 });
  else if (item.subject.startsWith('upgrade-')) accepted(state, item.subject === 'upgrade-road' ? { type: 'upgradeRoad' } : { type: 'upgrade', building: item.subject.slice(8) });
  else if (item.subject === 'transport-priority') { state.warehousePriorities = ['food']; accepted(state, { type: 'warehousePriority', resource: 'food' }); }
  else {
    const commands = { 'increase-happiness': { type: 'houseHappinessAll' }, 'house-points': { type: 'houseHappiness', amount: 1 },
      'notification-filter': { type: 'setting', key: 'notificationCategories', value: { tasks: false } },
      'buy-attraction': { type: 'buyAttraction' }, 'chapel-blessing': { type: 'blessing' },
      'market-order': { type: 'marketOrder', resource: 'wood', amount: 10 }, 'task-accept': { type: 'confirmTaskAcceptance' },
      'expedition-play': { type: 'expeditionStart' }, 'release-worker': { type: 'assign', building: 'farm', delta: -1 },
      'task-deposit': { type: 'taskDeposit', resource: 'wood', amount: 1 } };
    assert.ok(commands[item.subject], item.subject);
    accepted(state, commands[item.subject]);
  }
  assert.equal(state.tutorial.completed[item.id], true, item.id);
}
function finishThrough(state, id) {
  for (const item of TUTORIAL_LESSONS) {
    if (!state.tutorial.completed[item.id]) finishLesson(state, item);
    if (item.id === id) break;
  }
}

test('all25 lessons require real commands or physical events and expose actionable guidance', () => {
  assert.equal(TUTORIAL_LESSONS.length, 25);
  assert.equal(TUTORIAL_LESSONS.every(row => row.kind === 'action' || row.kind === 'condition'), true);
  assert.equal(TUTORIAL_LESSONS.filter(row => row.kind === 'action').every(row => !!row.guideSelector), true);
  assert.deepEqual(TUTORIAL_LESSONS.map(row => row.index), Array.from({ length: 25 }, (_, i) => i + 1));
});

test('reading, visiting locations, rejected commands and unrelated work cannot complete a lesson', () => {
  const state = island();
  action(state, 'tutorialVisit', { subject: 'home' });
  action(state, 'tutorialVisit', { subject: 'rules' });
  assert.equal(action(state, 'tutorialObserve', { taskId: 'rules-read' }).ok, false);
  recordProgressionAction(state, { type: 'assign', building: 'farm', delta: 1 }, { ok: false });
  accepted(state, { type: 'assign', building: 'warehouse', delta: 1 });
  assert.equal(tutorialStatus(state).completed, 0);
  assert.equal(claim(state, 'rules-read').ok, false);
  accepted(state, { type: 'assign', building: 'farm', delta: 1 });
  assert.equal(tutorialStatus(state).completed, 1);
  assert.equal(state.tutorial.completed['island-map'], undefined);
});

test('each later lesson needs its own successful action even if an earlier action was similar', () => {
  const state = island();
  finishThrough(state, 'first-delivery');
  assert.equal(state.tutorial.completed['storage-limits'], undefined);
  accepted(state, { type: 'assign', building: 'warehouse', delta: 1 });
  assert.equal(state.tutorial.completed['storage-limits'], true);
});

test('condition lessons require a fresh physical delivery and a fresh processed product', () => {
  const state = island();
  state.statistics.collected = 500;
  state.statistics.crafted = 800;
  finishThrough(state, 'transport-priority');
  advanceProgression(state);
  assert.equal(state.tutorial.completed['first-delivery'], undefined);
  state.statistics.collected++;
  advanceProgression(state);
  assert.equal(state.tutorial.completed['first-delivery'], true);
  finishThrough(state, 'storage-limits');
  advanceProgression(state);
  assert.equal(state.tutorial.completed['food-chain'], undefined);
  state.statistics.crafted++;
  advanceProgression(state);
  assert.equal(state.tutorial.completed['food-chain'], true);
});

test('a real starter can collect four chests, receive spendable help and order the Town Hall upgrade', () => {
  const state = createState(NOW), run = command => act(state, command, NOW);
  for (const [taskId, building] of [['rules-read', 'farm'], ['island-map', 'warehouse'], ['first-job', 'windmill'], ['food-check', 'lumber']]) {
    assert.equal(run({ type: 'assign', building, delta: 1 }).ok, true);
    assert.equal(run({ type: 'claimTutorial', taskId }).ok, true);
  }
  const totalBefore = MATERIALS.reduce((sum, id) => sum + state.resources[id], 0);
  assert.ok(totalBefore > 0);
  assert.equal(run({ type: 'prepareTutorialUpgrade' }).ok, true);
  assert.ok(state.resources.planks >= 500);
  assert.equal(run({ type: 'upgrade', building: 'townhall' }).ok, true);
  assert.equal(state.tutorial.completed['townhall-upgrade'], true);
  assert.equal(state.buildings.townhall.level, 1);
  assert.equal(state.constructionProjects[0].targetLevel, 2);
  assert.equal(run({ type: 'prepareTutorialUpgrade' }).ok, false);
});

test('the seed57 fourth chest still has a celebration and Skip when its reward overfills storage', () => {
  const state = createState(NOW), run = command => act(state, command, NOW);
  for (const [taskId, building] of [['rules-read', 'farm'], ['island-map', 'warehouse'], ['first-job', 'windmill'], ['food-check', 'lumber']]) {
    assert.equal(run({ type: 'assign', building, delta: 1 }).ok, true);
    assert.equal(run({ type: 'claimTutorial', taskId }).ok, true);
    if (taskId !== 'food-check') assert.equal(run({ type: 'skipTutorialShare', taskId }).ok, true);
  }
  assert.equal(tutorialWarehouseOverfull(state), true);
  const row = tutorialRows(state).find(item => item.id === 'food-check');
  assert.equal(row.canShare, false);
  const pending = tutorialPendingRewards(state);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].lessonId, 'food-check');
  assert.equal(pending[0].claimed, true);
  assert.equal(run({ type: 'shareTutorialReward', taskId: 'food-check' }).ok, false);
  assert.equal(run({ type: 'seeTutorialReward', taskId: 'food-check' }).ok, true);
  const before = structuredClone(state.resources);
  assert.equal(run({ type: 'skipTutorialShare', taskId: 'food-check' }).ok, true);
  assert.deepEqual(state.resources, before);
  assert.equal(tutorialPendingRewards(state).length, 0);
});

test('opening one chest may exceed capacity, but the next claim and doubling wait until materials are spent', () => {
  const state = island(); finishThrough(state, 'island-map');
  for (const id of MATERIALS) state.resources[id] = 800;
  const firstReward = { ...state.tutorial.chests['rules-read'].reward };
  assert.equal(claim(state, 'rules-read').ok, true);
  assert.equal(tutorialWarehouseOverfull(state), true);
  assert.equal(claim(state, 'island-map').ok, false);
  assert.equal(action(state, 'shareTutorialReward', { taskId: 'rules-read' }).ok, false);
  for (const id of MATERIALS) {
    assert.equal(state.resources[id], 800 + firstReward[id]);
    assert.equal(state.pendingDeliveries[id], 0);
  }
  spendMaterials(state, firstReward);
  assert.equal(tutorialWarehouseOverfull(state), false);
  assert.equal(action(state, 'shareTutorialReward', { taskId: 'rules-read' }).ok, true);
  assert.equal(action(state, 'shareTutorialReward', { taskId: 'rules-read' }).ok, false);
  assert.equal(claim(state, 'island-map').ok, false);
});

test('overfull storage never blocks real lesson actions or the one-time upgrade help', () => {
  const state = island();
  for (const id of MATERIALS) state.resources[id] = 1500;
  finishThrough(state, 'food-check');
  assert.equal(claim(state, 'rules-read').ok, false);
  assert.equal(action(state, 'prepareTutorialUpgrade').ok, true);
  accepted(state, { type: 'upgrade', building: 'townhall' });
  assert.equal(state.tutorial.completed['townhall-upgrade'], true);
  assert.equal(action(state, 'prepareTutorialUpgrade').ok, false);
});

test('every chest draw stays100–300 per material and survives reload without rerolling', () => {
  const state = island(); finishThrough(state, 'rules-read');
  const reward = structuredClone(state.tutorial.chests['rules-read'].reward);
  for (const amount of Object.values(reward)) assert.ok(Number.isInteger(amount) && amount >= 100 && amount <= 300);
  for (let i = 0; i < 5; i++) tutorialRows(state);
  assert.deepEqual(reload(state).tutorial.chests['rules-read'].reward, reward);
  assert.deepEqual(tutorialPendingRewards(state)[0].reward, reward);
});

test('base and sharing pay the same chest once each and Skip never removes the base reward', () => {
  const state = island(); finishThrough(state, 'rules-read');
  const reward = structuredClone(state.tutorial.chests['rules-read'].reward);
  assert.equal(claim(state, 'rules-read').ok, true);
  assert.equal(claim(state, 'rules-read').ok, false);
  assert.equal(action(state, 'shareTutorialReward', { taskId: 'rules-read' }).ok, true);
  const restored = reload(state);
  assert.equal(action(restored, 'shareTutorialReward', { taskId: 'rules-read' }).ok, false);
  for (const id of MATERIALS) assert.equal(state.resources[id], 100 + 2 * reward[id]);
  finishThrough(state, 'island-map');
  // Spend any bonus overfill so another chest is eligible.
  spendMaterials(state, Object.fromEntries(MATERIALS.map(id => [id, Math.max(0, state.resources[id] - 100)])));
  assert.equal(claim(state, 'island-map').ok, true);
  const before = structuredClone(state.resources);
  assert.equal(action(state, 'skipTutorialShare', { taskId: 'island-map' }).ok, true);
  assert.deepEqual(state.resources, before);
  assert.equal(action(state, 'shareTutorialReward', { taskId: 'island-map' }).ok, false);
});

test('missing material delivery never consumes a chest or the upgrade help', () => {
  const state = island(); finishThrough(state, 'rules-read');
  const before = structuredClone(state);
  assert.equal(progressionAction(state, { type: 'claimTutorial', taskId: 'rules-read' }).ok, false);
  assert.deepEqual(state, before);
  finishThrough(state, 'food-check');
  assert.equal(progressionAction(state, { type: 'prepareTutorialUpgrade' }).ok, false);
  assert.equal(state.tutorial.buildingSuppliesClaimed, false);
});

test('opting out and resuming preserve completed real actions and chest draws', () => {
  const state = island(); finishThrough(state, 'island-map');
  const chests = structuredClone(state.tutorial.chests);
  action(state, 'dismissTutorial');
  const restored = reload(state);
  assert.equal(tutorialStatus(restored).shouldAutoOpen, false);
  assert.equal(tutorialStatus(restored).nextLessonId, 'first-job');
  action(restored, 'resumeTutorial');
  assert.equal(tutorialStatus(restored).shouldAutoOpen, true);
  assert.deepEqual(restored.tutorial.chests, chests);
});

test('version2 paid lessons migrate without fresh actions or repeated rewards', () => {
  const state = island();
  const raw = { ...structuredClone(state), tutorial: { version: 2,
    completed: { 'rules-read': true }, claimed: { 'rules-read': true },
    events: { 'transport-priority': true }, chests: {} } };
  normalizeProgression(state, raw);
  assert.equal(state.tutorial.version, TUTORIAL_VERSION);
  assert.equal(state.tutorial.claimed['rules-read'], true);
  assert.equal(claim(state, 'rules-read').ok, false);
  assert.equal(state.tutorial.events['transport-priority'], undefined);
  assert.equal(state.tutorial.completed['island-map'], undefined);
});

test('all25 lessons can record real outcomes without a calendar-day gate', () => {
  const state = island();
  state.buildings.warehouse.level = 24;
  for (const item of TUTORIAL_LESSONS) {
    finishLesson(state, item);
    assert.equal(claim(state, item.id).ok, true, item.id);
    assert.equal(action(state, 'skipTutorialShare', { taskId: item.id }).ok, true);
  }
  assert.equal(tutorialStatus(state).finished, true);
  assert.equal(tutorialStatus(state).claimed, 25);
  assert.equal(state.worldTimeMs, NOW);
  const restored = reload(state);
  for (const item of TUTORIAL_LESSONS) assert.equal(claim(restored, item.id).ok, false);
});
