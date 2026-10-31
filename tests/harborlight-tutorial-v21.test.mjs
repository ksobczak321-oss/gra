import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, buildingCost } from '../harborlight-v1-state.js';
import { grantBonusMaterials, ordinaryWarehouseUsed } from '../harborlight-v1-inventory.js';
import { warehouseLimits } from '../harborlight-v1-logistics.js';
import { TUTORIAL_LESSONS, LEGACY_TUTORIAL_LESSONS, tutorialRows, tutorialStatus, tutorialPendingRewards, tutorialSettlementStatus, normalizeProgression, progressionAction } from '../harborlight-v1-progression.js';
import { runTutorialCourse } from './helpers/tutorial-v21-course.mjs';

const NOW = Date.parse('2026-10-31T10:00:00Z');
const MATERIALS = ['wood','stone','grain','food','planks'];
const run = (state, command) => act(state, command, state.worldTimeMs);

test('the new course has 25 stable real lessons and interleaves assignments, material spending and building completion', () => {
  assert.equal(TUTORIAL_LESSONS.length, 25);
  assert.deepEqual(TUTORIAL_LESSONS.map(row => row.id), LEGACY_TUTORIAL_LESSONS.map(row => row.id));
  assert.equal(TUTORIAL_LESSONS.every(row => ['action','condition'].includes(row.kind)), true);
  assert.equal(TUTORIAL_LESSONS.filter(row => row.kind === 'action').every(row => !!row.guideSelector), true);
  for (const id of ['assign-farm','assign-warehouse','assign-lumber','upgrade-townhall','upgrade-quarry','upgrade-warehouse','upgrade-farm','upgrade-road','finish-tutorial']) assert.ok(TUTORIAL_LESSONS.some(row => row.subject === id), id);
  assert.match(TUTORIAL_LESSONS[0].descriptionPl, /0 \/ 537 \(0\)/);
});

test('normal first-user play finishes all 25 actual lessons with full ordinary storage, no bonus stock and no waiting chests', () => {
  const { state, trace } = runTutorialCourse();
  assert.equal(state.buildings.townhall.level, 3);
  assert.equal(state.buildings.warehouse.level, 2);
  assert.equal(state.buildings.quarry.level, 2);
  assert.equal(state.buildings.farm.level, 2);
  assert.equal(state.buildings.lighthouse.level, 1);
  assert.equal(trace.length, 25);
  assert.equal(trace.every(row => row.pendingTutorialRewards === 0), true);
  assert.equal(trace.every(row => row.ordinaryUsed <= 4000 * 1.5 ** (row.warehouseLevel - 1) + 1e-7), true);
  assert.equal(trace.filter(row => row.action.startsWith('upgrade-')).length >= 7, true);
  assert.ok(trace[7].elapsedSeconds > 0, 'the actual first construction and deliveries took time');
  assert.equal(tutorialStatus(state).completed, 25);
  assert.equal(tutorialStatus(state).claimed, 25);
  assert.equal(tutorialStatus(state).finished, true);
  assert.equal(state.tutorial.settled, true);
  assert.equal(ordinaryWarehouseUsed(state), warehouseLimits(state).total);
  assert.deepEqual(Object.fromEntries(MATERIALS.map(id => [id, state.resources[id]])), Object.fromEntries(MATERIALS.map(id => [id, 1200])));
  assert.equal(MATERIALS.every(id => state.bonusMaterials[id] === 0), true);
  assert.deepEqual(tutorialPendingRewards(state), []);
  const before = structuredClone(state.resources);
  assert.equal(run(state, { type: 'finishTutorial' }).ok, false);
  assert.deepEqual(state.resources, before);
});

test('a later real Warsaw start still completes the course without relying on the initial House daily pool', () => {
  const { state } = runTutorialCourse({ now: Date.parse('2026-10-31T18:00:00Z'), seed: 149 });
  assert.equal(tutorialStatus(state).finished, true);
  assert.equal(ordinaryWarehouseUsed(state), warehouseLimits(state).total);
  assert.deepEqual(tutorialPendingRewards(state), []);
});

test('rewards are received one at a time, survive reload and cannot be doubled or claimed twice', () => {
  const state = createState(NOW);
  assert.equal(run(state, { type: 'assign', building: 'farm', delta: 1 }).ok, true);
  assert.equal(run(state, { type: 'assign', building: 'warehouse', delta: 1 }).ok, true);
  assert.equal(state.tutorial.completed['island-map'], undefined, 'an unconfirmed previous reward cannot create a reward queue');
  assert.equal(run(state, { type: 'claimTutorial', taskId: 'rules-read' }).ok, true);
  assert.equal(state.resources.coins, 200);
  assert.equal(MATERIALS.every(id => state.resources[id] === 125 && state.bonusMaterials[id] === 0), true);
  const before = structuredClone(state.resources);
  assert.equal(run(state, { type: 'shareTutorialReward', taskId: 'rules-read' }).ok, false);
  assert.equal(run(state, { type: 'claimTutorial', taskId: 'rules-read' }).ok, false);
  assert.deepEqual(state.resources, before);
  const restored = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
  assert.equal(restored.tutorial.curriculum, 4);
  assert.deepEqual(restored.tutorial.chests['rules-read'].reward, state.tutorial.chests['rules-read'].reward);
  assert.equal(run(restored, { type: 'skipTutorialShare', taskId: 'rules-read' }).ok, true);
  assert.equal(run(restored, { type: 'assign', building: 'warehouse', delta: 1 }).ok, true);
  assert.equal(restored.tutorial.completed['island-map'], true);
});

test('external bonus stock blocks final settlement without being deleted and can be spent on a real path upgrade', () => {
  const { state } = runTutorialCourse({ through: 24 });
  assert.equal(tutorialSettlementStatus(state).eligible, true);
  grantBonusMaterials(state, { stone: 100 });
  const before = JSON.stringify(state);
  assert.equal(tutorialSettlementStatus(state).reasonCode, 'bonus-stock');
  assert.equal(run(state, { type: 'finishTutorial' }).ok, false);
  assert.equal(JSON.stringify(state), before);
  assert.equal(run(state, { type: 'upgradeRoad', level: 1 }).ok, true);
  assert.equal(state.bonusMaterials.stone, 0);
  assert.equal(run(state, { type: 'finishTutorial' }).ok, true);
  assert.equal(ordinaryWarehouseUsed(state), warehouseLimits(state).total);
});

test('existing version-three rewards, claims and resources retain the legacy curriculum', () => {
  const state = createState(NOW);
  normalizeProgression(state, { ...state, tutorial: { version: 3, seed: 57, completed: { 'rules-read': true }, claimed: { 'rules-read': true },
    chests: { 'rules-read': { reward: Object.fromEntries(MATERIALS.map(id => [id, 155])), seen: true, skipped: true } } } });
  const before = structuredClone(state.resources);
  const restored = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
  assert.equal(restored.tutorial.curriculum, 3);
  assert.equal(tutorialRows(restored)[2].subject, 'assign-windmill');
  assert.deepEqual(restored.resources, before);
  assert.deepEqual(restored.tutorial.chests['rules-read'].reward, Object.fromEntries(MATERIALS.map(id => [id, 155])));
  assert.equal(run(restored, { type: 'claimTutorial', taskId: 'rules-read' }).ok, false);
  assert.equal(run(restored, { type: 'finishTutorial' }).ok, false);
});

test('secondary-island reward disabling survives normalization and cannot mint another course budget', () => {
  const state = createState(NOW);
  state.tutorial.rewardDisabled = true;
  const restored = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
  assert.equal(restored.tutorial.rewardDisabled, true);
  assert.equal(tutorialStatus(restored).shouldAutoOpen, false);
  assert.deepEqual(tutorialPendingRewards(restored), []);
  const before = structuredClone(restored.resources);
  for (const action of [{ type: 'prepareTutorialUpgrade' }, { type: 'finishTutorial' }, { type: 'claimTutorial', taskId: 'rules-read' }]) assert.equal(run(restored, action).ok, false);
  assert.deepEqual(restored.resources, before);
});

test('legacy Market teaching can finish with a confirmed player trade after NPC trading closes', () => {
  const state = createState(NOW);
  normalizeProgression(state, { ...state, tutorial: { version: 3,
    completed: Object.fromEntries(LEGACY_TUTORIAL_LESSONS.slice(0, 19).map(row => [row.id, true])),
    claimed: Object.fromEntries(LEGACY_TUTORIAL_LESSONS.slice(0, 19).map(row => [row.id, true])) } });
  state.buildings.townhall.level = 6;
  assert.equal(progressionAction(state, { type: 'tutorialPlayerTrade' }, { buildingCost }).ok, false);
  assert.equal(progressionAction(state, { type: 'tutorialPlayerTrade' }, { playerTradeVerified: true, buildingCost }).ok, true);
  assert.equal(state.tutorial.completed['market-rules'], true);
});
