import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TUTORIAL_LESSONS, TUTORIAL_VERSION, TUTORIAL_BUILDING_SUPPLIES,
  normalizeProgression, progressionAction, advanceProgression, recordProgressionAction,
  tutorialRows, tutorialStatus, tutorialPendingRewards, activePlayMultiplier
} from '../harborlight-v1-progression.js';
import { receiveMaterials } from '../harborlight-v1-logistics.js';
import { createState, act } from '../harborlight-v1-state.js';

const NOW = Date.parse('2026-10-29T12:00:00Z');
const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const context = { receiveMaterials };
function island() {
  const state = { worldTimeMs: NOW, activityClock: 0, activeSeconds: 0,
    resources: { coins: 100, ...Object.fromEntries(MATERIALS.map(id => [id, 100])) },
    pendingDeliveries: Object.fromEntries(MATERIALS.map(id => [id, 0])),
    buildings: { townhall: { level: 1 }, warehouse: { level: 1 } },
    residents: Array.from({ length: 12 }, (_, id) => ({ id: id + 1, workplace: null, arrivalRemaining: 0 })),
    statistics: { collected: 0 }, warehousePriorities: [], constructionProjects: [], notifications: [] };
  normalizeProgression(state, {});
  return state;
}
const action = (state, type, extra = {}) => progressionAction(state, { type, ...extra }, context);
const visit = (state, subject) => action(state, 'tutorialVisit', { subject });
const observe = (state, id) => action(state, 'tutorialObserve', { taskId: id });
const claim = (state, id) => action(state, 'claimTutorial', { taskId: id });
function reload(state) {
  const raw = structuredClone(state), restored = structuredClone(state);
  normalizeProgression(restored, raw);
  return restored;
}
function finishLesson(state, item) {
  if (item.kind === 'observe') {
    if (item.id === 'rules-read') visit(state, 'home');
    visit(state, item.route);
    assert.equal(observe(state, item.id).ok, true, item.id);
  } else if (item.subject === 'delivery') {
    state.statistics.collected = 120;
    advanceProgression(state);
  } else {
    let act;
    if (item.subject === 'assign-crew') {
      state.residents[0].workplace = 'farm';
      recordProgressionAction(state, { type: 'assign', building: 'farm', delta: 1 }, { ok: true });
      state.residents[1].workplace = 'warehouse';
      act = { type: 'assign', building: 'warehouse', delta: 1 };
    } else if (item.subject === 'upgrade-townhall') {
      assert.equal(action(state, 'prepareTutorialUpgrade').ok, true);
      state.constructionProjects.push({ building: 'townhall', targetLevel: 2 });
      act = { type: 'upgrade', building: 'townhall' };
    } else if (item.subject === 'increase-happiness') act = { type: 'houseHappinessAll' };
    else if (item.subject === 'transport-priority') { state.warehousePriorities = ['food']; act = { type: 'warehousePriority', resource: 'food' }; }
    else if (item.subject === 'upgrade-road') act = { type: 'upgradeRoad' };
    else if (item.subject === 'task-accept') act = { type: 'confirmTaskAcceptance' };
    else if (item.subject === 'expedition-play') act = { type: 'expeditionStart' };
    else act = { type: 'assign', building: 'farm', delta: -1 };
    recordProgressionAction(state, act, { ok: true });
  }
  assert.equal(tutorialRows(state).find(row => row.id === item.id).completed, true, item.id);
}
function finishThrough(state, id) {
  for (const item of TUTORIAL_LESSONS) {
    if (!state.tutorial.completed[item.id]) finishLesson(state, item);
    if (item.id === id) break;
  }
}

test('the combined tutorial has25 ordered lessons and its first six teach the requested real actions', () => {
  assert.equal(TUTORIAL_LESSONS.length, 25);
  assert.deepEqual(TUTORIAL_LESSONS.slice(0, 6).map(row => row.id), ['rules-read', 'island-map', 'first-job', 'food-check', 'townhall-upgrade', 'happiness-action']);
  assert.deepEqual(TUTORIAL_LESSONS.map(row => row.index), Array.from({ length: 25 }, (_, index) => index + 1));
  assert.equal(TUTORIAL_LESSONS.every(row => row.day === 1), true);
});

test('opening starts at the first unfinished action without calendar-day or active-day gates', () => {
  const state = island();
  assert.equal(tutorialStatus(state).shouldAutoOpen, true);
  assert.equal(tutorialStatus(state).nextLessonId, 'rules-read');
  assert.equal(tutorialRows(state)[0].unlocked, true);
  assert.equal(tutorialRows(state)[1].unlocked, false);
  state.worldTimeMs += 10 * 86400000;
  advanceProgression(state);
  assert.equal(tutorialStatus(state).nextLessonId, 'rules-read');
  finishThrough(state, 'island-map');
  assert.equal(tutorialStatus(state).nextLessonId, 'first-job');
});

test('reading the rules requires the real upper-left menu and Rules view first', () => {
  const state = island();
  assert.equal(observe(state, 'rules-read').ok, false);
  visit(state, 'rules');
  assert.equal(observe(state, 'rules-read').ok, false);
  visit(state, 'home');
  assert.equal(observe(state, 'rules-read').ok, true);
  assert.equal(observe(state, 'island-map').ok, false);
  visit(state, 'map');
  assert.equal(observe(state, 'island-map').ok, true);
});

test('assigning a producer alone cannot finish the crew lesson or unlock food checking', () => {
  const state = island(); finishThrough(state, 'island-map');
  state.residents[0].workplace = 'farm';
  recordProgressionAction(state, { type: 'assign', building: 'farm', delta: 1 }, { ok: true });
  assert.equal(state.tutorial.completed['first-job'], undefined);
  state.residents[1].workplace = 'warehouse';
  recordProgressionAction(state, { type: 'assign', building: 'warehouse', delta: 1 }, { ok: false });
  assert.equal(state.tutorial.completed['first-job'], undefined);
  recordProgressionAction(state, { type: 'assign', building: 'warehouse', delta: 1 }, { ok: true });
  assert.equal(state.tutorial.completed['first-job'], true);
});

test('food check needs an actual status view and food available beyond physical reservations', () => {
  const state = island(); finishThrough(state, 'first-job');
  visit(state, 'residents');
  state.constructionProjects.push({ reservedMaterials: { food: 100 } });
  assert.equal(observe(state, 'food-check').ok, false);
  state.foodCredit = 0.5;
  assert.equal(observe(state, 'food-check').ok, true);
});

test('building help tops up only deficits once and ordering a real Town Hall project advances the lesson', () => {
  const state = island(); finishThrough(state, 'food-check');
  state.resources.wood = 700;
  const supplied = action(state, 'prepareTutorialUpgrade');
  assert.equal(supplied.ok, true);
  for (const [id, target] of Object.entries(TUTORIAL_BUILDING_SUPPLIES)) assert.equal(state.resources[id], id === 'wood' ? 700 : target);
  assert.equal(state.tutorial.completed['townhall-upgrade'], undefined);
  assert.equal(action(state, 'prepareTutorialUpgrade').ok, false);
  state.constructionProjects.push({ building: 'townhall', targetLevel: 2 });
  advanceProgression(state);
  assert.equal(state.tutorial.completed['townhall-upgrade'], true);
  assert.equal(state.buildings.townhall.level, 1);
  assert.equal(action(reload(state), 'prepareTutorialUpgrade').ok, false);
});

test('a genuine normal starter can fund and order its Town Hall upgrade through the tutorial without a preview grant', () => {
  const state = createState(NOW);
  const run = (type, extra = {}) => act(state, { type, ...extra }, NOW);
  run('tutorialVisit', { subject: 'home' }); run('tutorialVisit', { subject: 'rules' });
  assert.equal(run('tutorialObserve', { taskId: 'rules-read' }).ok, true);
  run('tutorialVisit', { subject: 'map' });
  assert.equal(run('tutorialObserve', { taskId: 'island-map' }).ok, true);
  assert.equal(run('assign', { building: 'farm', delta: 1 }).ok, true);
  assert.equal(run('assign', { building: 'warehouse', delta: 1 }).ok, true);
  run('tutorialVisit', { subject: 'residents' });
  assert.equal(run('tutorialObserve', { taskId: 'food-check' }).ok, true);
  assert.equal(run('prepareTutorialUpgrade').ok, true);
  assert.equal(run('upgrade', { building: 'townhall' }).ok, true);
  assert.equal(state.tutorial.completed['townhall-upgrade'], true);
  assert.equal(state.buildings.townhall.level, 1);
  assert.equal(state.constructionProjects[0].targetLevel, 2);
  assert.equal(state.resources.food, 600);
  assert.equal(state.constructionProjects[0].reservedMaterials.food, 500);
  assert.equal(state.resources.coins, 0);
});

test('every lesson chest contains100–300 of each material and survives observation, quotes and reload exactly', () => {
  const state = island(); finishThrough(state, 'rules-read');
  const reward = structuredClone(state.tutorial.chests['rules-read'].reward);
  assert.deepEqual(Object.keys(reward), MATERIALS);
  assert.ok(Object.values(reward).every(value => Number.isInteger(value) && value >= 100 && value <= 300));
  for (let index = 0; index < 5; index++) tutorialRows(state);
  assert.deepEqual(reload(state).tutorial.chests['rules-read'].reward, reward);
  assert.deepEqual(tutorialPendingRewards(state)[0].reward, reward);
});

test('base claim and Share each pay the same exact chest once, including after reload', () => {
  const state = island(); finishThrough(state, 'rules-read');
  const reward = structuredClone(state.tutorial.chests['rules-read'].reward);
  assert.equal(action(state, 'shareTutorialReward', { taskId: 'rules-read' }).ok, false);
  assert.equal(claim(state, 'rules-read').ok, true);
  for (const id of MATERIALS) assert.equal(state.resources[id], 100 + reward[id]);
  assert.equal(state.resources.coins, 100);
  const restored = reload(state);
  assert.equal(claim(restored, 'rules-read').ok, false);
  assert.equal(action(restored, 'shareTutorialReward', { taskId: 'rules-read' }).ok, true);
  for (const id of MATERIALS) assert.equal(restored.resources[id], 100 + reward[id] * 2);
  assert.equal(action(reload(restored), 'shareTutorialReward', { taskId: 'rules-read' }).ok, false);
  assert.deepEqual(tutorialPendingRewards(restored), []);
});

test('Skip preserves the base chest and prevents an unresolved Share bonus from being replayed', () => {
  const state = island(); finishThrough(state, 'rules-read'); claim(state, 'rules-read');
  const before = { ...state.resources };
  assert.equal(action(state, 'skipTutorialShare', { taskId: 'rules-read' }).ok, true);
  assert.equal(action(reload(state), 'shareTutorialReward', { taskId: 'rules-read' }).ok, false);
  assert.deepEqual(state.resources, before);
});

test('full warehouses preserve both the chest and its doubled overflow without losing materials', () => {
  const state = island(); finishThrough(state, 'rules-read');
  const reward = state.tutorial.chests['rules-read'].reward;
  for (const id of MATERIALS) state.resources[id] = 800;
  claim(state, 'rules-read');
  action(state, 'shareTutorialReward', { taskId: 'rules-read' });
  for (const id of MATERIALS) {
    assert.equal(state.resources[id], 800);
    assert.equal(state.pendingDeliveries[id], reward[id] * 2);
  }
});

test('a missing material receiver cannot mark any chest or building supply as paid', () => {
  const state = island(); finishThrough(state, 'rules-read');
  const before = structuredClone(state);
  assert.equal(progressionAction(state, { type: 'claimTutorial', taskId: 'rules-read' }).ok, false);
  assert.deepEqual(state, before);
  finishThrough(state, 'food-check');
  assert.equal(progressionAction(state, { type: 'prepareTutorialUpgrade' }).ok, false);
  assert.equal(state.tutorial.buildingSuppliesClaimed, false);
});

test('opting out survives reload and manual resume preserves every completed lesson and chest', () => {
  const state = island(); finishThrough(state, 'island-map');
  const before = structuredClone(state.tutorial.chests);
  action(state, 'dismissTutorial');
  const restored = reload(state);
  assert.equal(tutorialStatus(restored).shouldAutoOpen, false);
  assert.equal(tutorialStatus(restored).nextLessonId, 'first-job');
  action(restored, 'resumeTutorial');
  assert.equal(tutorialStatus(restored).shouldAutoOpen, true);
  assert.deepEqual(restored.tutorial.chests, before);
});

test('legacy paid lessons remain archived and equivalent new lessons cannot pay them again', () => {
  const state = island();
  const raw = { ...structuredClone(state), tutorial: { completed: { 'island-level': true, 'central-food': true, 'motion-setting': true, 'expedition-rules': true }, claimed: { 'island-level': true, 'central-food': true, 'motion-setting': true, 'expedition-rules': true } } };
  normalizeProgression(state, raw);
  assert.equal(state.tutorial.version, TUTORIAL_VERSION);
  assert.equal(state.tutorial.claimed['rules-read'], true);
  assert.equal(state.tutorial.claimed['food-check'], true);
  assert.equal(state.tutorial.legacy.claimed['motion-setting'], true);
  assert.equal(state.tutorial.legacy.claimed['expedition-rules'], true);
  assert.equal(state.tutorial.claimed['expedition-rules'], undefined);
  assert.equal(claim(state, 'rules-read').ok, false);
  assert.equal(state.tutorial.chests['rules-read'], undefined);
  assert.equal(claim(state, 'motion-setting').ok, false);
});

test('all25 lessons and rewards can complete without waiting for more calendar days or replacing live construction', () => {
  const state = island();
  for (const item of TUTORIAL_LESSONS) {
    finishLesson(state, item);
    assert.equal(claim(state, item.id).ok, true, item.id);
    assert.equal(action(state, 'skipTutorialShare', { taskId: item.id }).ok, true);
  }
  assert.equal(tutorialStatus(state).finished, true);
  assert.equal(tutorialStatus(state).shouldAutoOpen, false);
  assert.equal(tutorialStatus(state).claimed, 25);
  assert.equal(state.worldTimeMs, NOW);
  assert.equal(state.constructionProjects[0].building, 'townhall');
  assert.equal(state.buildings.townhall.level, 1);
  const restored = reload(state);
  for (const item of TUTORIAL_LESSONS) assert.equal(claim(restored, item.id).ok, false);
});

test('automatic minigame input cannot renew active-play or manufacture a tutorial gameplay event', () => {
  const state = island();
  assert.equal(progressionAction(state, { type: 'userActivity', visible: true, focused: true, meaningful: false }).ok, false);
  recordProgressionAction(state, { type: 'expeditionMiniGameInput', meaningful: false }, { ok: true });
  assert.equal(activePlayMultiplier(state), 1);
  assert.equal(state.tutorial.events['expedition-play'], undefined);
});
