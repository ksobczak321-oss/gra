import test from 'node:test';
import assert from 'node:assert/strict';
import { createState as freshState, normalizeState, act } from '../harborlight-v1-state.js';
import { V4_TUTORIAL_LESSONS as TUTORIAL_LESSONS, LEGACY_TUTORIAL_LESSONS, normalizeProgression, recordProgressionAction, advanceProgression, progressionAction, tutorialRows, tutorialStatus, tutorialPendingRewards, tutorialSettlementStatus } from '../harborlight-v1-progression.js';
import { ordinaryWarehouseUsed } from '../harborlight-v1-inventory.js';
import { runTutorialCourse } from './helpers/tutorial-v21-course.mjs';

// Preserve the historical curriculum exercised by these regression scenarios.
const createState = now => { const state = freshState(now); normalizeProgression(state, { ...state, tutorial: { version: 4 } }); return state; };

const NOW = Date.parse('2026-10-31T10:00:00Z');
const run = (state, action, context) => act(state, action, state.worldTimeMs, context);
const reload = state => normalizeState(JSON.parse(JSON.stringify(state)), state.worldTimeMs);
const legacy = () => { const state = createState(NOW); normalizeProgression(state, { ...state, tutorial: { version: 3 } }); return state; };
const claim = (state, id) => { assert.equal(run(state, { type: 'claimTutorial', taskId: id }).ok, true); assert.equal(run(state, { type: 'skipTutorialShare', taskId: id }).ok, true); };

test('actual early House action removes its future lesson without a reward and survives a cloud-shaped round trip', () => {
  const state = createState(NOW), resources = structuredClone(state.resources);
  assert.equal(run(state, { type: 'houseHappinessAll', amount: 1 }).ok, true);
  assert.equal(state.tutorial.skippedLessons['personal-happiness'], true);
  assert.equal(state.tutorial.completed['personal-happiness'], true);
  assert.equal(state.tutorial.claimed['personal-happiness'], undefined);
  assert.equal(state.tutorial.chests['personal-happiness'], undefined);
  assert.deepEqual(state.resources, resources);
  assert.deepEqual(tutorialPendingRewards(state), []);
  const restored = reload(state), row = tutorialRows(restored).find(item => item.id === 'personal-happiness');
  assert.equal(row.autoSkipped, true);
  assert.equal(row.canClaim, false);
  assert.deepEqual(restored.tutorial.actionLedger.counts, state.tutorial.actionLedger.counts);
  assert.equal(run(restored, { type: 'claimTutorial', taskId: row.id }).ok, false);
  assert.equal(tutorialStatus(restored).visibleTotal, 24);
  assert.equal(tutorialStatus(restored).visibleCompleted, 0);
  assert.equal(run(restored, { type: 'assign', building: 'farm', delta: 1 }).ok, true);
  claim(restored, 'rules-read');
  assert.equal(restored.tutorial.chests['rules-read'].claimed, true);
});

test('one actual Warehouse assignment never satisfies both carrier lessons; two assigned workers may cover both', () => {
  const state = createState(NOW);
  assert.equal(run(state, { type: 'assign', building: 'warehouse', delta: 1 }).ok, true);
  assert.equal(state.tutorial.skippedLessons['island-map'], true);
  assert.equal(state.tutorial.completed['storage-limits'], undefined);
  assert.equal(run(state, { type: 'assign', building: 'farm', delta: 1 }).ok, true);
  claim(state, 'rules-read');
  assert.equal(tutorialStatus(state).nextLessonId, 'first-job');
  assert.equal(run(state, { type: 'assign', building: 'warehouse', delta: 1 }).ok, true);
  assert.equal(state.tutorial.skippedLessons['storage-limits'], true);
  assert.equal(state.tutorial.actionLedger.counts['assign-warehouse'], 2);
  const batch = createState(NOW);
  assert.equal(run(batch, { type: 'assign', building: 'warehouse', delta: 2 }).ok, true);
  assert.equal(batch.tutorial.skippedLessons['island-map'], true);
  assert.equal(batch.tutorial.skippedLessons['storage-limits'], true);
});

test('current carrier action grants its normal reward while only the second separately assigned worker skips the later step', () => {
  const state = createState(NOW);
  run(state, { type: 'assign', building: 'farm', delta: 1 }); claim(state, 'rules-read');
  assert.equal(run(state, { type: 'assign', building: 'warehouse', delta: 1 }).ok, true);
  assert.equal(state.tutorial.skippedLessons['island-map'], undefined);
  assert.ok(state.tutorial.chests['island-map']);
  assert.equal(state.tutorial.completed['storage-limits'], undefined);
  claim(state, 'island-map');
  run(state, { type: 'assign', building: 'warehouse', delta: 1 });
  assert.equal(state.tutorial.skippedLessons['storage-limits'], true);
  assert.equal(state.tutorial.chests['storage-limits'], undefined);
});

test('a waiting reward does not form another chest queue when the player performs the next lesson independently', () => {
  const state = createState(NOW);
  run(state, { type: 'assign', building: 'farm', delta: 1 });
  run(state, { type: 'assign', building: 'warehouse', delta: 1 });
  assert.deepEqual(tutorialPendingRewards(state).map(item => item.lessonId), ['rules-read']);
  claim(state, 'rules-read');
  assert.equal(tutorialRows(state).find(item => item.id === 'first-job').prerequisiteMet, true);
});

test('failed actions, visits, heartbeat, mouse movement and background production do not count as independent tutorial actions', () => {
  const state = createState(NOW), before = structuredClone(state.tutorial);
  assert.equal(run(state, { type: 'houseHappinessAll', amount: 10000 }).ok, false);
  for (const action of [{ type: 'tutorialVisit', subject: 'house' }, { type: 'userActivity', visible: true, focused: true }, { type: 'heartbeat', visible: true, focused: true }]) run(state, action);
  recordProgressionAction(state, { type: 'houseHappinessAll', meaningful: false }, { ok: true });
  recordProgressionAction(state, { type: 'houseHappinessAll' }, { ok: false });
  state.statistics.collected += 100; state.statistics.crafted += 100; advanceProgression(state);
  assert.deepEqual(state.tutorial.skippedLessons, before.skippedLessons);
  assert.deepEqual(state.tutorial.actionLedger.counts, before.actionLedger.counts);
});

test('only changed notification categories and selected priorities create action evidence', () => {
  const state = legacy();
  assert.equal(run(state, { type: 'setting', key: 'notificationCategories', value: {} }).ok, true);
  assert.equal(state.tutorial.completed['personal-happiness'], undefined);
  assert.equal(run(state, { type: 'warehousePriority', priorities: [] }).ok, true);
  assert.equal(state.tutorial.completed['transport-priority'], undefined);
  run(state, { type: 'setting', key: 'notificationCategories', value: { tasks: false } });
  run(state, { type: 'warehousePriority', priorities: ['construction'] });
  assert.equal(state.tutorial.skippedLessons['personal-happiness'], true);
  assert.equal(state.tutorial.skippedLessons['transport-priority'], true);
  run(state, { type: 'warehousePriority', priorities: ['construction'] });
  assert.equal(state.tutorial.actionLedger.counts['transport-priority'], 1);
});

test('the current balanced priority lesson requires Construction rather than an unrelated material priority', () => {
  const { state } = runTutorialCourse({ through: 5 });
  assert.equal(tutorialStatus(state).nextLessonId, 'happiness-action');
  const resources = structuredClone(state.resources);
  assert.equal(run(state, { type: 'warehousePriority', resource: 'wood' }).ok, true);
  assert.deepEqual(state.warehousePriorities, ['wood']);
  assert.equal(state.tutorial.completed['happiness-action'], undefined);
  assert.equal(state.tutorial.skippedLessons['happiness-action'], undefined);
  assert.equal(state.tutorial.chests['happiness-action'], undefined);
  assert.deepEqual(state.resources, resources);
  const restored = reload(state);
  assert.equal(tutorialStatus(restored).nextLessonId, 'happiness-action');
  assert.equal(run(restored, { type: 'warehousePriority', resource: 'construction' }).ok, true);
  assert.deepEqual(restored.warehousePriorities, ['wood', 'construction']);
  assert.equal(restored.tutorial.completed['happiness-action'], true);
  assert.equal(restored.tutorial.skippedLessons['happiness-action'], undefined);
  assert.ok(restored.tutorial.chests['happiness-action']);
  assert.equal(restored.tutorial.actionLedger.counts['transport-priority'], 1);
});

test('an early unrelated priority does not remove the balanced lesson, while selecting Construction does so without a chest', () => {
  const state = createState(NOW), resources = structuredClone(state.resources);
  assert.equal(run(state, { type: 'warehousePriority', priorities: ['stone'] }).ok, true);
  assert.equal(state.tutorial.completed['happiness-action'], undefined);
  assert.equal(state.tutorial.skippedLessons['happiness-action'], undefined);
  assert.equal(state.tutorial.actionLedger.counts['transport-priority'], undefined);
  assert.equal(run(state, { type: 'warehousePriority', resource: 'construction' }).ok, true);
  assert.equal(state.tutorial.skippedLessons['happiness-action'], true);
  assert.equal(state.tutorial.chests['happiness-action'], undefined);
  assert.equal(state.tutorial.claimed['happiness-action'], undefined);
  assert.equal(state.tutorial.actionLedger.counts['transport-priority'], 1);
  assert.deepEqual(state.resources, resources);
});

test('old selected priorities migrate against the correct curriculum requirement', () => {
  for (const curriculum of [3, 4]) for (const resource of ['wood', 'construction']) {
    const state = curriculum === 3 ? legacy() : createState(NOW);
    assert.equal(run(state, { type: 'warehousePriority', resource }).ok, true);
    const lessonId = curriculum === 3 ? 'transport-priority' : 'happiness-action';
    // Restore the shape of a pre-v22 save: the actual chosen priority was
    // retained, but independent actions were not yet recorded by the tutorial.
    delete state.tutorial.actionLedger; delete state.tutorial.skippedLessons;
    delete state.tutorial.completed[lessonId];
    const restored = reload(state), expected = curriculum === 3 || resource === 'construction';
    assert.equal(restored.tutorial.skippedLessons[lessonId] === true, expected, `${curriculum}: ${resource}`);
    assert.equal(restored.tutorial.completed[lessonId] === true, expected, `${curriculum}: ${resource}`);
    assert.equal(restored.tutorial.chests[lessonId], undefined);
    assert.equal(restored.tutorial.claimed[lessonId], undefined);
  }
});

test('the current legacy lesson still accepts a selected material priority', () => {
  const state = legacy();
  for (const [id, building] of [['rules-read', 'farm'], ['island-map', 'warehouse'], ['first-job', 'windmill'], ['food-check', 'lumber']]) {
    assert.equal(run(state, { type: 'assign', building, delta: 1 }).ok, true);
    claim(state, id);
  }
  assert.equal(run(state, { type: 'prepareTutorialUpgrade' }).ok, true);
  assert.equal(run(state, { type: 'upgrade', building: 'townhall' }).ok, true);
  assert.equal(run(state, { type: 'houseHappinessAll', amount: 1 }).ok, true);
  assert.equal(run(state, { type: 'assign', building: 'quarry', delta: 1 }).ok, true);
  assert.equal(run(state, { type: 'assign', building: 'sawmill', delta: 1 }).ok, true);
  assert.equal(tutorialStatus(state).nextLessonId, 'transport-priority');
  assert.equal(run(state, { type: 'warehousePriority', resource: 'wood' }).ok, true);
  assert.deepEqual(state.warehousePriorities, ['wood']);
  assert.equal(state.tutorial.completed['transport-priority'], true);
  assert.equal(state.tutorial.skippedLessons['transport-priority'], undefined);
  assert.ok(state.tutorial.chests['transport-priority']);
});

test('successful action evidence covers every actionable subject in both existing curricula', () => {
  const commands = {
    'assign-farm': { type: 'assign', building: 'farm', delta: 1 }, 'assign-warehouse': { type: 'assign', building: 'warehouse', delta: 1 },
    'assign-lumber': { type: 'assign', building: 'lumber', delta: 1 }, 'assign-windmill': { type: 'assign', building: 'windmill', delta: 1 },
    'assign-quarry': { type: 'assign', building: 'quarry', delta: 1 }, 'assign-sawmill': { type: 'assign', building: 'sawmill', delta: 1 },
    'upgrade-townhall': { type: 'upgrade', building: 'townhall' }, 'upgrade-quarry': { type: 'upgrade', building: 'quarry' },
    'upgrade-warehouse': { type: 'upgrade', building: 'warehouse' }, 'upgrade-farm': { type: 'upgrade', building: 'farm' },
    'upgrade-house': { type: 'upgrade', building: 'house' }, 'upgrade-lighthouse': { type: 'build', building: 'lighthouse' },
    'transport-priority': { type: 'warehousePriority', resource: 'construction' }, 'house-points': { type: 'houseHappinessAll' },
    'increase-happiness': { type: 'houseHappinessAll' }, 'notification-filter': { type: 'setting', key: 'notificationCategories' },
    'upgrade-road': { type: 'upgradeRoad' }, 'buy-attraction': { type: 'buyAttraction' }, 'chapel-blessing': { type: 'blessing' },
    'market-order': { type: 'marketOrder' }, 'task-accept': { type: 'confirmTaskAcceptance' }, 'expedition-play': { type: 'expeditionStart' },
    'release-worker': { type: 'assign', building: 'farm', delta: -1 }, 'task-deposit': { type: 'taskDeposit', amount: 1 }
  };
  for (const curriculum of [3, 4]) for (const lesson of (curriculum === 3 ? LEGACY_TUTORIAL_LESSONS : TUTORIAL_LESSONS).filter(item => item.kind === 'action' && item.index > 1 && item.subject !== 'finish-tutorial')) {
    const state = curriculum === 3 ? legacy() : createState(NOW);
    state.warehousePriorities = ['construction']; state.settings.notificationCategories = { tasks: false };
    const action = commands[lesson.subject]; assert.ok(action, lesson.subject);
    if (lesson.subject === 'assign-warehouse') recordProgressionAction(state, action, { ok: true });
    recordProgressionAction(state, action, { ok: true, ...(lesson.goalLevel ? { project: { targetLevel: lesson.goalLevel } } : {}) });
    assert.equal(state.tutorial.skippedLessons[lesson.id], true, `${curriculum}: ${lesson.subject}`);
    assert.equal(state.tutorial.chests[lesson.id], undefined);
    assert.equal(state.tutorial.claimed[lesson.id], undefined);
  }
});

test('Town Hall level-two order cannot skip its separate level-three order lesson', () => {
  const state = createState(NOW);
  recordProgressionAction(state, { type: 'upgrade', building: 'townhall' }, { ok: true, project: { targetLevel: 2 } });
  assert.equal(state.tutorial.skippedLessons['townhall-upgrade'], true);
  assert.equal(state.tutorial.completed['lighthouse-visits'], undefined);
  recordProgressionAction(state, { type: 'upgrade', building: 'townhall' }, { ok: true, project: { targetLevel: 3 } });
  assert.equal(state.tutorial.skippedLessons['lighthouse-visits'], true);
});

test('future completed building targets are removed without a hidden material reward or a repeated purchase', () => {
  const state = createState(NOW), before = structuredClone(state.resources);
  state.buildings.quarry.level = 2;
  advanceProgression(state);
  assert.equal(state.tutorial.skippedLessons['transport-priority'], true);
  assert.equal(state.tutorial.skippedLessons['food-chain'], true);
  assert.equal(state.tutorial.chests['food-chain'], undefined);
  assert.deepEqual(state.resources, before);
});

test('old legacy completed building upgrades do not require buying a redundant extra level', () => {
  const state = legacy(), before = structuredClone(state.resources);
  for (const [building, level] of Object.entries({ townhall: 2, farm: 2, house: 2, lighthouse: 1 })) state.buildings[building].level = level;
  advanceProgression(state);
  for (const id of ['townhall-upgrade', 'upgrade-cost', 'construction-queue', 'lighthouse-visits']) {
    assert.equal(state.tutorial.skippedLessons[id], true, id);
    assert.equal(state.tutorial.chests[id], undefined);
  }
  assert.deepEqual(state.resources, before);
});

test('legacy confirmed player trade before its lesson skips it without rewarding; an untrusted trade cannot', () => {
  const state = legacy(), before = structuredClone(state.resources);
  const action = { type: 'tutorialPlayerTrade', receiptId: 'actual-trade-1' };
  assert.equal(run(state, action).ok, false);
  assert.equal(state.tutorial.completed['market-rules'], undefined);
  assert.equal(run(state, action, { playerTradeVerified: true }).ok, true);
  assert.equal(state.tutorial.skippedLessons['market-rules'], true);
  assert.equal(state.tutorial.chests['market-rules'], undefined);
  assert.equal(state.tutorial.actionLedger.counts['market-order'], 1);
  assert.equal(run(state, action, { playerTradeVerified: true }).ok, false);
  assert.deepEqual(state.resources, before);
});

test('a real v21 House action migrates from its manual notification without replaying its missing event or awarding a chest', () => {
  const old = createState(NOW);
  assert.equal(run(old, { type: 'houseHappinessAll', amount: 1 }).ok, true);
  delete old.tutorial.actionLedger; delete old.tutorial.skippedLessons;
  delete old.tutorial.completed['personal-happiness'];
  const before = structuredClone(old.resources), migrated = reload(old);
  assert.equal(migrated.tutorial.skippedLessons['personal-happiness'], true);
  assert.equal(migrated.tutorial.chests['personal-happiness'], undefined);
  assert.deepEqual(migrated.resources, before);
  assert.deepEqual(reload(migrated).tutorial.skippedLessons, migrated.tutorial.skippedLessons);
});

test('a depleted old House pool or its automatic allocation is not guessed to be a manual action', () => {
  for (const notification of [null, { kind: 'house-happiness', title: 'House happiness distributed', message: '12 remaining happiness points were given to the least happy residents.' }]) {
    const old = createState(NOW);
    delete old.tutorial.actionLedger; delete old.tutorial.skippedLessons;
    old.houseHappinessPool.points = 0; old.houseHappinessPool.autoDone = true;
    if (notification) old.notifications.push(notification);
    assert.equal(reload(old).tutorial.skippedLessons['personal-happiness'], undefined);
  }
});

test('old assigned workers migrate as ordinal evidence, preserving earned chests and needing two actual carriers for two steps', () => {
  const old = createState(NOW);
  run(old, { type: 'assign', building: 'farm', delta: 1 }); claim(old, 'rules-read');
  run(old, { type: 'assign', building: 'warehouse', delta: 1 }); claim(old, 'island-map');
  const chest = structuredClone(old.tutorial.chests['island-map']);
  delete old.tutorial.actionLedger; delete old.tutorial.skippedLessons;
  const migrated = reload(old);
  assert.deepEqual(migrated.tutorial.chests['island-map'], chest);
  assert.equal(migrated.tutorial.skippedLessons['storage-limits'], undefined);
  run(migrated, { type: 'assign', building: 'warehouse', delta: 1 });
  assert.equal(migrated.tutorial.skippedLessons['storage-limits'], true);
});

test('existing rolled and paid rewards take precedence over a contradictory skipped marker during normalization', () => {
  const state = createState(NOW);
  run(state, { type: 'assign', building: 'farm', delta: 1 });
  const chest = structuredClone(state.tutorial.chests['rules-read']);
  state.tutorial.skippedLessons['rules-read'] = true;
  const restored = reload(state);
  assert.equal(restored.tutorial.skippedLessons['rules-read'], undefined);
  assert.deepEqual(restored.tutorial.chests['rules-read'], chest);
  claim(restored, 'rules-read');
  assert.equal(restored.tutorial.claimed['rules-read'], true);
});

test('the full course with independent early House and first carrier actions still settles naturally with full storage and no chests waiting', () => {
  const { state } = runTutorialCourse({ beforeLesson(state, command, lesson) {
    if (lesson.index === 1) { command({ type: 'houseHappinessAll', amount: 1 }); command({ type: 'assign', building: 'warehouse', delta: 1 }); }
  } });
  assert.equal(tutorialStatus(state).finished, true);
  assert.equal(tutorialStatus(state).skipped, 2);
  assert.equal(tutorialStatus(state).claimed, 23);
  assert.equal(ordinaryWarehouseUsed(state), 6000);
  assert.deepEqual(tutorialPendingRewards(state), []);
  assert.equal(state.tutorial.chests['personal-happiness'], undefined);
  assert.equal(state.tutorial.chests['island-map'], undefined);
  assert.equal(tutorialSettlementStatus(state).reasonCode, 'settled');
});
