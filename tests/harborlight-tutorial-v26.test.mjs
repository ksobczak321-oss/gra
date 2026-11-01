import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, buildingCost } from '../harborlight-v1-state.js';
import { TUTORIAL_VERSION, TUTORIAL_LESSONS, V4_TUTORIAL_LESSONS, LEGACY_TUTORIAL_LESSONS, tutorialRows, tutorialStatus, tutorialPendingRewards, tutorialTaskStatus, normalizeProgression } from '../harborlight-v1-progression.js';
import { ordinaryWarehouseUsed, centralAvailable } from '../harborlight-v1-inventory.js';
import { foodReserve, warehouseLimits } from '../harborlight-v1-logistics.js';
import { runTutorialV26 } from './helpers/tutorial-v26-course.mjs';
const NOW = Date.parse('2026-11-01T10:00:00Z');
const MATERIALS = ['wood','stone','grain','food','planks'];
const command = (state, action) => { const result = act(state, action, state.worldTimeMs); assert.equal(result.ok, true, result.message); return result; };
const reward = (state, id) => { command(state, { type: 'claimTutorial', taskId: id }); command(state, { type: 'skipTutorialShare', taskId: id }); };
const reload = state => normalizeState(JSON.parse(JSON.stringify(state)), state.worldTimeMs);

test('fresh practical course orders six carriers, construction priority, farmer, lumberjack, Town Hall and mill', () => {
  const state = createState(NOW), rows = tutorialRows(state);
  assert.equal(TUTORIAL_VERSION, 5); assert.equal(state.tutorial.curriculum, 5);
  assert.equal(rows.length, 25);
  assert.deepEqual(rows.slice(0, 7).map(row => row.subject), ['assign-warehouse','transport-priority','assign-farm','assign-lumber','upgrade-townhall','assign-windmill','assign-quarry']);
  assert.equal(rows[0].assignmentCount, 6);
  assert.equal(rows[0].progressCurrent, 0); assert.equal(rows[0].progressRequired, 6);
  assert.equal(TUTORIAL_LESSONS.some(row => row.subject === 'building-townhall-3' || row.subject === 'upgrade-townhall' && row.goalLevel === 3), false);
  assert.deepEqual(TUTORIAL_LESSONS.slice(20,22).map(row => row.subject), ['task-complete','expedition-complete']);
  assert.equal(TUTORIAL_LESSONS[21].requiresCashout, true);
  assert.deepEqual(new Set(TUTORIAL_LESSONS.map(row => row.id)), new Set(V4_TUTORIAL_LESSONS.map(row => row.id)));
  for (let index = 0; index < rows.length; index++) assert.equal(rows[index].prerequisite, index ? rows[index - 1].id : null);
});

test('the first reward requires all six carriers and never consumes the later additional-carrier lesson', () => {
  const state = createState(NOW), before = structuredClone(state.resources);
  for (let count = 1; count <= 5; count++) {
    command(state, { type: 'assign', building: 'warehouse', delta: 1 });
    const row = tutorialRows(state)[0];
    assert.equal(row.progressCurrent, count); assert.equal(row.completed, false);
    assert.equal(act(state, { type: 'claimTutorial', taskId: row.id }, state.worldTimeMs).ok, false);
    assert.deepEqual(state.resources, before);
  }
  command(state, { type: 'assign', building: 'warehouse', delta: 1 });
  assert.equal(tutorialRows(state)[0].completed, true);
  assert.equal(state.tutorial.completed['storage-limits'], undefined);
  reward(state, 'island-map');
  assert.equal(state.resources.coins, before.coins + 100);
  command(state, { type: 'warehousePriority', priorities: ['construction'] });
  assert.equal(state.tutorial.completed['happiness-action'], true);
  const restored = reload(state);
  assert.equal(restored.tutorial.curriculum, 5); assert.equal(restored.tutorial.actionLedger.counts['assign-warehouse'], 6);
  assert.equal(restored.tutorial.completed['storage-limits'], undefined);
  assert.equal(act(restored, { type: 'claimTutorial', taskId: 'island-map' }, restored.worldTimeMs).ok, false);
});

test('assigning a farmer independently removes that later step without another reward or blocking the next lesson', () => {
  const state = createState(NOW);
  command(state, { type: 'assign', building: 'farm', delta: 1 });
  assert.equal(state.tutorial.skippedLessons['rules-read'], true);
  assert.equal(state.tutorial.chests['rules-read'], undefined);
  assert.equal(state.tutorial.claimed['rules-read'], undefined);
  for (let index = 0; index < 6; index++) command(state, { type: 'assign', building: 'warehouse', delta: 1 });
  reward(state, 'island-map');
  command(state, { type: 'warehousePriority', priorities: ['construction'] }); reward(state, 'happiness-action');
  assert.equal(tutorialStatus(state).nextLessonId, 'first-job');
  assert.deepEqual(tutorialPendingRewards(state), []);
  assert.equal(reload(state).tutorial.skippedLessons['rules-read'], true);
});

test('older curricula keep lesson order, conditions and rolled/paid rewards after normalization', () => {
  for (const curriculum of [3,4]) {
    const state = createState(NOW);
    normalizeProgression(state, { ...state, tutorial: { version: curriculum } });
    command(state, { type: 'assign', building: 'farm', delta: 1 });
    command(state, { type: 'claimTutorial', taskId: 'rules-read' });
    const before = structuredClone(state.tutorial.chests['rules-read']), resources = structuredClone(state.resources);
    const restored = reload(state);
    assert.equal(restored.tutorial.version, 5); assert.equal(restored.tutorial.curriculum, curriculum);
    assert.deepEqual(tutorialRows(restored).map(row => [row.id,row.subject,row.goalLevel]), (curriculum === 3 ? LEGACY_TUTORIAL_LESSONS : V4_TUTORIAL_LESSONS).map(row => [row.id,row.subject,row.goalLevel]));
    assert.deepEqual(restored.tutorial.chests['rules-read'], before); assert.deepEqual(restored.resources, resources);
    assert.equal(act(restored, { type: 'claimTutorial', taskId: 'rules-read' }, restored.worldTimeMs).ok, false);
  }
});

test('a starter Lighthouse task is affordable at Town Hall 2 and accepting/partially donating does not finish the practical lesson', () => {
  const { state, command: run } = runTutorialV26({ through: 20 });
  assert.equal(state.buildings.townhall.level, 2);
  assert.equal(tutorialTaskStatus(state).eligible, true);
  const task = state.lighthouseTasks.find(task => task.tutorialStarter === true);
  assert.ok(task, 'a real introductory task is available');
  assert.deepEqual(task.requirements, { wood: 50, stone: 50 });
  run({ type: 'taskAccept', task: task.id }); run({ type: 'confirmTaskAcceptance', task: task.id });
  assert.equal(state.tutorial.completed['lighthouse-visits'], undefined);
  run({ type: 'taskDeposit', task: task.id, resource: 'wood', amount: 49 });
  assert.equal(state.tutorial.completed['lighthouse-visits'], undefined);
  run({ type: 'taskDeposit', task: task.id, resource: 'wood', amount: 1 });
  assert.equal(state.tutorial.completed['lighthouse-visits'], undefined);
  run({ type: 'taskDeposit', task: task.id, resource: 'stone', amount: 50 });
  assert.equal(state.tutorial.completed['lighthouse-visits'], true);
  reward(state, 'lighthouse-visits');
  const cost = buildingCost(state, 'lighthouse');
  assert.ok(state.resources.coins >= cost.coins);
  for (const resource of MATERIALS) assert.ok(centralAvailable(state, resource) >= (cost[resource] || 0) + (resource === 'food' ? foodReserve(state) : 0), resource);
  assert.equal(tutorialTaskStatus(state).needed, false);
  assert.equal(reload(state).tutorial.actionLedger.taskReceipts.length, 1);
});

test('opening/starting/abandoning a minigame does not satisfy the separate won-and-cashed-out lesson', () => {
  const { state, command: run } = runTutorialV26({ through: 21 });
  assert.equal(state.tutorial.completed['lighthouse-task'], undefined);
  run({ type: 'expeditionStart', expedition: 'misty', gameKind: 'triples' });
  assert.equal(state.tutorial.completed['lighthouse-task'], undefined);
  const round = state.expeditionRuns.misty;
  run({ type: 'expeditionMiniGameReveal', runId: round.id, index: 0 });
  assert.equal(state.tutorial.completed['lighthouse-task'], undefined);
  run({ type: 'expeditionLose', runId: round.id });
  assert.equal(state.tutorial.completed['lighthouse-task'], undefined);
  assert.equal(state.tutorial.chests['lighthouse-task'], undefined);
});

test('a genuinely won minigame round remains unfinished as a lesson until its pot is cashed out', () => {
  const { state, command: run } = runTutorialV26({ through: 21 });
  run({ type: 'expeditionStart', expedition: 'misty', gameKind: 'triples' });
  const round = state.expeditionRuns.misty;
  for (const symbol of new Set(round.miniGame.cards)) for (let index = 0; index < round.miniGame.cards.length; index++) {
    if (round.miniGame.cards[index] === symbol) run({ type: 'expeditionMiniGameReveal', runId: round.id, index });
  }
  assert.equal(round.status, 'decision'); assert.equal(round.miniGame.solved, true);
  assert.equal(state.statistics.expeditions, 1);
  assert.equal(state.tutorial.completed['lighthouse-task'], undefined);
  const restored = reload(state), before = restored.resources.coins;
  const result = command(restored, { type: 'expeditionCashout', runId: round.id });
  assert.equal(restored.resources.coins, before + result.coins);
  assert.equal(restored.tutorial.completed['lighthouse-task'], true);
  assert.equal(restored.tutorial.actionLedger.expeditionReceipts.length, 1);
  reward(restored, 'lighthouse-task');
  assert.equal(act(restored, { type: 'expeditionCashout', runId: round.id }, restored.worldTimeMs).ok, false);
  assert.equal(reload(restored).tutorial.actionLedger.expeditionReceipts.length, 1);
});

test('the full fresh course ends at Town Hall 2 with an actually completed task, won minigame, full Warehouse and no pending chests', () => {
  const { state, trace } = runTutorialV26();
  assert.equal(trace.length, 25); assert.equal(state.buildings.townhall.level, 2);
  assert.equal(state.buildings.lighthouse.level, 1); assert.equal(state.buildings.warehouse.level, 2);
  assert.equal(state.taskAchievements.length, 1);
  assert.equal(state.tutorial.actionLedger.taskReceipts.length, 1);
  assert.equal(state.tutorial.actionLedger.expeditionReceipts.length, 1);
  assert.equal(state.statistics.expeditions, 1);
  assert.equal(tutorialStatus(state).finished, true); assert.equal(tutorialStatus(state).claimed, 25);
  assert.equal(state.tutorial.settled, true); assert.equal(ordinaryWarehouseUsed(state), warehouseLimits(state).total);
  assert.equal(trace.every(row => row.pending === 0), true);
  assert.deepEqual(tutorialPendingRewards(state), []);
  assert.equal(MATERIALS.every(id => state.bonusMaterials[id] === 0), true);
  const before = structuredClone(state.resources), restored = reload(state);
  assert.equal(act(restored, { type: 'finishTutorial' }, restored.worldTimeMs).ok, false);
  assert.deepEqual(restored.resources, before);
});


test('late starts and the Warsaw midnight boundary finish the same course without a daily-pool stall', () => {
  for (const start of ['2026-11-01T18:00:00Z','2026-11-01T22:59:30Z']) {
    const { state, trace } = runTutorialV26({ now: Date.parse(start) });
    assert.equal(tutorialStatus(state).finished, true);
    assert.equal(ordinaryWarehouseUsed(state), warehouseLimits(state).total);
    assert.equal(state.buildings.townhall.level, 2);
    assert.deepEqual(tutorialPendingRewards(state), []);
    // The global two-minute worker walk now also applies to the first six
    // carriers; the same fully executed course still fits within half an hour.
    assert.equal(trace.at(-1).elapsedSeconds <= 30 * 60, true, start);
  }
});
