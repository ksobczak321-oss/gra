import test from 'node:test';
import assert from 'node:assert/strict';
import { captureInterruption, applyInterruption, normalizeInterruptions, INTERRUPTION_RULES } from '../harborlight-v1-interruption.js';
import { createMiniGame, miniGameRoundRules } from '../harborlight-v1-minigames.js';
import { normalizeActivities, activityAction, advanceActivities, expeditionRoundStatus } from '../harborlight-v1-activities.js';
import { normalizeLogisticsState } from '../harborlight-v1-logistics.js';
import { adventureAction, advanceAdventures } from '../harborlight-v1-adventures.js';
import * as State from '../harborlight-v1-state.js';

const NOW = Date.parse('2026-11-04T12:00:00Z');
const clone = value => structuredClone(value);
const definition = { id: 'islands', map: ['S.G'], tools: {} };
const context = { expeditions: [definition] };

function island(kind = 'tilt') {
  const state = {
    islandId: 'island-1', islandGeneration: 1, welcome: { startedAt: NOW, until: NOW + 259200000 },
    worldTimeMs: NOW, lastSimulatedAt: NOW, activityClock: 0,
    resources: { coins: 100, wood: 100, stone: 100, grain: 100, food: 100, planks: 100 },
    population: 12, foodCredit: 1, activeSeconds: 0,
    buildings: Object.fromEntries(['farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'warehouse', 'market', 'dock', 'house', 'townhall', 'chapel', 'lighthouse'].map(id => [id, { level: 1, workers: 0, ready: 0, workProgress: [] }])),
    residents: [], returningWorkers: [], constructionProjects: [], premiumServices: [],
    premium: { expiresAt: 0 }, notifications: [], statistics: { expeditions: 0 }, roads: { segments: Array(100).fill(0) }
  };
  normalizeLogisticsState(state, state); normalizeActivities(state, { activityClock: 0, activitySeed: 12345 });
  const result = activityAction(state, { type: 'expeditionStart', expedition: definition.id }, context);
  assert.equal(result.ok, true, result.message);
  const run = state.expeditionRuns[definition.id];
  run.miniGame = createMiniGame(kind, 1, 789, 0);
  run.roundLimit = miniGameRoundRules(kind, 1).timeLimit; run.remaining = run.roundLimit;
  state.lighthouseMissions = { version: 1, chapter: { id: 'chapter-2' }, stack: [{ kind: 'main', task: {
    id: 'chapter-2:1', status: 'active', acceptedAt: NOW, deadline: NOW + 600000, attempt: 0, deposited: { wood: 3 }
  } }] };
  const task = state.lighthouseTasks[0]; task.acceptedAt = 0; task.bonusLockedAt = 0; state.activeTaskId = task.id;
  return state;
}

test('capturing a known foreground interruption only records active identities without changing the island', () => {
  const state = island(), before = JSON.stringify(state), snapshot = captureInterruption(state, NOW);
  assert.equal(JSON.stringify(state), before);
  assert.equal(snapshot.mission.id, 'chapter-2:1');
  assert.equal(snapshot.task.id, state.activeTaskId);
  assert.equal(snapshot.expedition.id, state.expeditionRuns.islands.id);
  assert.equal(snapshot.atMs, NOW);
  assert.equal(captureInterruption(state, NaN), null);
});

test('matching accepted clocks receive only the unconfirmed part of the interruption and no reward', () => {
  const state = island(), snapshot = captureInterruption(state, NOW + 10000);
  state.lastSimulatedAt = NOW + 15000;
  const mission = state.lighthouseMissions.stack[0].task, task = state.lighthouseTasks[0], run = state.expeditionRuns.islands;
  const resources = clone(state.resources), deposits = clone(mission.deposited), expiresAt = task.expiresAt;
  const result = applyInterruption(state, snapshot, NOW + 35000, { reason: 'recovered' });
  assert.equal(result.seconds, 20);
  assert.deepEqual(result.compensated, { mission: true, task: true, expedition: true, adventure: false });
  assert.equal(mission.deadline, NOW + 620000); assert.equal(task.expiresAt, expiresAt + 20);
  assert.equal(run.roundStartedAt, 20); assert.equal(run.knownPauseRemaining, 20);
  assert.equal(state.activityClock, 0); assert.equal(state.lastSimulatedAt, NOW + 15000);
  assert.deepEqual(state.resources, resources); assert.deepEqual(mission.deposited, deposits);
});

test('foreign conflict, manual reload and changed world identity cannot receive compensation', () => {
  for (const reason of ['conflict', 'reloaded', undefined]) {
    const state = island(), snapshot = captureInterruption(state, NOW), before = JSON.stringify(state);
    assert.equal(applyInterruption(state, snapshot, NOW + 30000, { reason }).ok, false);
    assert.equal(JSON.stringify(state), before);
  }
  for (const change of [{ islandId: 'island-2' }, { islandGeneration: 2 }, { welcome: { startedAt: NOW + 1 } }]) {
    const state = island(), snapshot = captureInterruption(state, NOW); Object.assign(state, change);
    const before = JSON.stringify(state);
    assert.equal(applyInterruption(state, snapshot, NOW + 30000, { reason: 'recovered' }).ok, false);
    assert.equal(JSON.stringify(state), before);
  }
});

test('a replacement task or new expedition round is not altered by an old interruption snapshot', () => {
  const state = island(), snapshot = captureInterruption(state, NOW);
  state.lighthouseMissions.stack[0].task.attempt = 1;
  state.lighthouseTasks[0].acceptedAt = 1;
  state.expeditionRuns.islands.level++;
  const mission = clone(state.lighthouseMissions), task = clone(state.lighthouseTasks[0]), run = clone(state.expeditionRuns.islands);
  const result = applyInterruption(state, snapshot, NOW + 30000, { reason: 'recovered' });
  assert.deepEqual(result.compensated, { mission: false, task: false, expedition: false, adventure: false });
  assert.deepEqual(state.lighthouseMissions, mission); assert.deepEqual(state.lighthouseTasks[0], task); assert.deepEqual(state.expeditionRuns.islands, run);
});

test('a persisted per-world receipt prevents double compensation after serialization', () => {
  const state = island(), snapshot = captureInterruption(state, NOW);
  applyInterruption(state, snapshot, NOW + 30000, { reason: 'recovered' });
  const restored = clone(state); normalizeInterruptions(restored, restored);
  const before = JSON.stringify(restored);
  const second = applyInterruption(restored, clone(snapshot), NOW + 60000, { reason: 'recovered' });
  assert.equal(second.duplicate, true); assert.equal(second.seconds, 0);
  assert.equal(JSON.stringify(restored), before);
});

test('ordinary absence has no interruption protection and still expires an unanswered expedition', () => {
  const state = island(), run = state.expeditionRuns.islands;
  const resources = clone(state.resources);
  advanceActivities(state, run.roundLimit + 1);
  assert.equal(run.status, 'lost'); assert.equal(run.lossReason, 'deadline');
  assert.deepEqual(state.resources, resources);
  assert.equal(state.knownInterruptions, undefined);
});

test('legacy physics is held during known catch-up while the activity clock keeps advancing', () => {
  const state = island(), run = state.expeditionRuns.islands;
  run.miniGame.tiltX = 1;
  const balls = clone(run.miniGame.balls), remaining = expeditionRoundStatus(state, run).remaining;
  const snapshot = captureInterruption(state, NOW);
  applyInterruption(state, snapshot, NOW + 40000, { reason: 'recovered' });
  for (let index = 0; index < 4; index++) advanceActivities(state, 10);
  assert.equal(state.activityClock, 40); assert.equal(run.knownPauseRemaining, undefined);
  assert.deepEqual(run.miniGame.balls, balls);
  assert.equal(expeditionRoundStatus(state, run).remaining, remaining);
  advanceActivities(state, 1);
  assert.notDeepEqual(run.miniGame.balls, balls, 'physics resumes after the protected interval');
});

test('memory hide and shuffle events are postponed rather than consumed during catch-up', () => {
  const state = island('triples'), run = state.expeditionRuns.islands;
  run.miniGame.revealed = [0, 1, 2]; run.miniGame.hideAt = 1; run.miniGame.shuffleInterval = 3; run.miniGame.nextShuffleAt = 3;
  const snapshot = captureInterruption(state, NOW);
  applyInterruption(state, snapshot, NOW + 20000, { reason: 'recovered' });
  for (let index = 0; index < 4; index++) advanceActivities(state, 5);
  assert.deepEqual(run.miniGame.revealed, [0, 1, 2]); assert.equal(run.miniGame.shuffleCount, 0);
  advanceActivities(state, 1.1); assert.deepEqual(run.miniGame.revealed, []);
  advanceActivities(state, 2); assert.equal(run.miniGame.shuffleCount, 1);
});

test('pending pause timestamps and extended ordinary tasks survive normalization before catch-up', () => {
  const state = island(), run = state.expeditionRuns.islands;
  run.presencePromptAt = 0;
  const snapshot = captureInterruption(state, NOW), previousExpiry = state.lighthouseTasks[0].expiresAt;
  applyInterruption(state, snapshot, NOW + 60000, { reason: 'recovered' });
  const raw = clone(state), restored = { ...raw };
  normalizeActivities(restored, raw); normalizeInterruptions(restored, raw);
  const restoredRun = restored.expeditionRuns.islands;
  assert.equal(restoredRun.knownPauseRemaining, 60); assert.equal(restoredRun.roundStartedAt, 60);
  assert.equal(restoredRun.presencePromptAt, 60); assert.equal(restored.lastMeaningfulActivityAt, 60);
  assert.equal(restored.activeTaskId, state.activeTaskId);
  assert.equal(restored.lighthouseTasks[0].expiresAt, previousExpiry + 60);
  advanceActivities(restored, 60);
  assert.equal(restoredRun.status, 'active'); assert.equal(restoredRun.presencePromptAt, 60);
  assert.equal(restored.knownInterruptions.receipts.length, 1);
});

test('a decision-stage legacy expedition retains its elapsed reward and presence allowance', () => {
  const state = island(), run = state.expeditionRuns.islands;
  state.activityClock = 50; state.lastMeaningfulActivityAt = 50;
  run.rulesVersion = 9; run.status = 'decision'; run.finishedAt = 50; run.roundStartedAt = 0;
  run.pot = 150; run.roundBasePot = 150;
  const status = expeditionRoundStatus(state, run), snapshot = captureInterruption(state, NOW);
  applyInterruption(state, snapshot, NOW + 60000, { reason: 'recovered' });
  advanceActivities(state, 60);
  const after = expeditionRoundStatus(state, run);
  assert.equal(run.status, 'decision'); assert.equal(run.pot, 150);
  assert.equal(after.elapsed, status.elapsed); assert.equal(after.potentialPot, status.potentialPot);
  assert.equal(after.presenceRequired, false);
});

test('only the captured adventure is paused and ordinary absence still ends falling cargo', () => {
  const state = island(); assert.equal(adventureAction(state, { type: 'adventureStart', kind: 'cargoRain' }).ok, true);
  const snapshot = captureInterruption(state, NOW), run = state.adventures.active, id = run.id;
  const result = applyInterruption(state, snapshot, NOW + 60000, { reason: 'recovered' });
  assert.equal(result.compensated.adventure, true);
  advanceAdventures(state, 60); assert.notEqual(state.adventures.active.stage, 'complete');
  assert.equal(state.adventures.active.id, id);
  advanceAdventures(state, 46); assert.equal(state.adventures.active.stage, 'complete');
});

test('full world catch-up consumes meals and advances work while protected puzzle physics stays still', () => {
  const state = State.createState(NOW);
  state.resources.food = 1000;
  assert.equal(State.act(state, { type: 'assign', building: 'lumber', delta: 1 }, NOW).ok, true);
  State.advanceTo(state, NOW + 120000);
  assert.equal(activityAction(state, { type: 'expeditionStart', expedition: definition.id }, context).ok, true);
  const run = state.expeditionRuns.islands; run.miniGame = createMiniGame('tilt', 1, 789, state.activityClock); run.miniGame.tiltX = 1;
  const control = clone(state), balls = clone(run.miniGame.balls), previousFood = state.resources.food + state.foodCredit;
  const snapshot = captureInterruption(state, NOW + 120000);
  applyInterruption(state, snapshot, NOW + 180000, { reason: 'recovered' });
  State.advanceTo(state, NOW + 180000); State.advanceTo(control, NOW + 180000);
  assert.equal(state.worldTimeMs, NOW + 180000);
  assert.equal(state.resources.food, control.resources.food);
  assert.equal(state.foodCredit, control.foodCredit); assert.ok(state.resources.food + state.foodCredit < previousFood);
  assert.equal(state.buildings.lumber.ready, control.buildings.lumber.ready);
  assert.deepEqual(state.expeditionRuns.islands.miniGame.balls, balls);
});

test('invalid or excessive compensation cannot mint resources or alter deadlines', () => {
  const state = island(), snapshot = captureInterruption(state, NOW), before = JSON.stringify(state);
  assert.equal(applyInterruption(state, snapshot, NOW + (INTERRUPTION_RULES.maximumSeconds + 1) * 1000, { reason: 'recovered' }).ok, false);
  assert.equal(JSON.stringify(state), before);
  assert.equal(applyInterruption(state, { ...snapshot, atMs: NaN }, NOW + 1000, { reason: 'recovered' }).ok, false);
  assert.equal(JSON.stringify(state), before);
});
