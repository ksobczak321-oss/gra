import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeActivities, advanceActivities, nextActivitiesEvent, activityAction,
  taskAcceptanceStatus, activeLighthouseTask, pendingTaskAchievements,
  activeExpeditionRun, expeditionRoundStatus, expeditionRoundRules,
  quotePremiumBuilding, quoteForecastPlan, TASK_NARRATIVES
} from '../harborlight-v1-activities.js';
import { normalizeLogisticsState, MATERIAL_IDS } from '../harborlight-v1-logistics.js';

const HOUR = 3600, DAY = 86400;
const NOW = Date.parse('2026-10-23T10:00:00Z'); // 12:00 Warsaw.
const PUZZLE = { id: 'proof', map: ['S..G'], tools: {} };
const OTHER = { id: 'other', map: ['S.G'], tools: {} };
const context = { expeditions: [PUZZLE, OTHER] };
const path = [[0, 1], [0, 2], [0, 3]];
function island(now = NOW) {
  const state = {
    resources: { coins: 100000, wood: 100, stone: 100, grain: 100, food: 100, planks: 100 },
    population: 12, foodCredit: 1, activeSeconds: 0, worldTimeMs: now,
    buildings: Object.fromEntries(['farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'warehouse', 'market', 'dock', 'house', 'townhall', 'chapel', 'lighthouse'].map(id => [id, { level: id === 'townhall' ? 4 : 1, workers: 0, ready: 0, workProgress: [] }])),
    residents: [], returningWorkers: [], constructionProjects: [], premiumServices: [],
    premium: { expiresAt: 0 }, notifications: [], statistics: { expeditions: 0 },
    roads: { segments: Array(100).fill(0) }
  };
  normalizeLogisticsState(state, state);
  normalizeActivities(state, { activityClock: 0, activitySeed: 123456789 });
  return state;
}
function reload(state) {
  const raw = JSON.parse(JSON.stringify(state));
  const restored = { ...raw };
  normalizeActivities(restored, raw);
  return restored;
}
function simpleTask(state, task = state.lighthouseTasks[0], reward = { coins: 10, planks: 20 }) {
  task.requirements = { wood: 1, stone: 1 }; task.deposited = { wood: 0, stone: 0 }; task.reward = reward;
  return task;
}
function accept(state, task) {
  assert.equal(activityAction(state, { type: 'beginTaskAcceptance', task: task.id }).ok, true);
  const result = activityAction(state, { type: 'confirmTaskAcceptance', task: task.id });
  assert.equal(result.ok, true, result.message);
}
function complete(state, task) {
  accept(state, task);
  for (const [resource, amount] of Object.entries(task.requirements)) {
    const result = activityAction(state, { type: 'taskDeposit', task: task.id, resource, amount });
    assert.equal(result.ok, true, result.message);
  }
}
function start(state, extras = {}) {
  const result = activityAction(state, { type: 'expeditionStart', expedition: 'proof', gameVersion: 9, ...extras }, context);
  assert.equal(result.ok, true, result.message);
  return state.expeditionRuns.proof;
}
function win(state, run) {
  return activityAction(state, { type: 'expeditionWin', runId: run.id, stage: run.level, path }, context);
}
function onward(state, run, extras = {}) {
  const result = activityAction(state, { type: 'expeditionContinue', runId: run.id, ...extras }, context);
  assert.equal(result.ok, true, result.message);
}

test('first-click draft keeps its fast multiplier across confirmation and reload', () => {
  let state = island(); const taskId = state.lighthouseTasks[0].id;
  advanceActivities(state, 14.5);
  assert.equal(activityAction(state, { type: 'beginTaskAcceptance', task: taskId }).ok, true);
  assert.equal(activeLighthouseTask(state), null);
  assert.equal(taskAcceptanceStatus(state).multiplier, 3);
  advanceActivities(state, 59);
  state = reload(state);
  assert.equal(taskAcceptanceStatus(state).remaining, 1);
  assert.equal(activityAction(state, { type: 'confirmTaskAcceptance', task: taskId }).ok, true);
  assert.equal(activeLighthouseTask(state).multiplier, 3);
  assert.equal(activeLighthouseTask(reload(state)).multiplier, 3);
});

test('cancellation and sixty-second timeout act as never clicked; opening is not acceptance', () => {
  const state = island(), task = state.lighthouseTasks[0];
  activityAction(state, { type: 'taskAccept', task: task.id }); // Compatibility opens the draft.
  assert.equal(task.acceptedAt, null);
  activityAction(state, { type: 'cancelTaskAcceptance' });
  assert.equal(taskAcceptanceStatus(state).pending, false);
  assert.equal(task.acceptedAt, null);
  advanceActivities(state, 16);
  activityAction(state, { type: 'beginTaskAcceptance', task: task.id });
  assert.equal(taskAcceptanceStatus(state).multiplier, 2);
  advanceActivities(state, 60);
  assert.equal(taskAcceptanceStatus(state).pending, false);
  assert.equal(activityAction(state, { type: 'confirmTaskAcceptance', task: task.id }).ok, false);
  assert.equal(task.acceptedAt, null);
});

test('a repeated draft click cannot refresh its timer and the offer must still exist at confirmation', () => {
  const state = island(), task = state.lighthouseTasks[0];
  task.expiresAt = 20;
  activityAction(state, { type: 'beginTaskAcceptance', task: task.id });
  advanceActivities(state, 10);
  activityAction(state, { type: 'beginTaskAcceptance', task: task.id });
  assert.equal(state.taskAcceptanceDraft.expiresAt, 60);
  advanceActivities(state, 10);
  assert.equal(state.taskAcceptanceDraft, null);
  assert.equal(activityAction(state, { type: 'confirmTaskAcceptance', task: task.id }).ok, false);
  assert.equal(activeLighthouseTask(state), null);
});

test('only one confirmed task is active and cancellation never abandons that task', () => {
  const state = island(), [first, second] = state.lighthouseTasks;
  accept(state, first);
  assert.equal(activityAction(state, { type: 'beginTaskAcceptance', task: second.id }).ok, false);
  activityAction(state, { type: 'cancelTaskAcceptance' });
  assert.equal(activeLighthouseTask(state).id, first.id);
  assert.equal(activityAction(state, { type: 'taskDeposit', task: second.id, resource: Object.keys(second.requirements)[0], amount: 1 }).ok, false);
});

test('unconfirmed and excessive deposits are rejected without changing central stock', () => {
  const state = island(), task = simpleTask(state), original = { ...state.resources };
  assert.equal(activityAction(state, { type: 'taskDeposit', task: task.id, resource: 'wood', amount: 1 }).ok, false);
  assert.deepEqual(state.resources, original);
  accept(state, task);
  assert.equal(activityAction(state, { type: 'taskDeposit', task: task.id, resource: 'wood', amount: 2 }).ok, false);
  assert.equal(activityAction(state, { type: 'taskDeposit', task: task.id, resource: 'wood', amount: 1 }).ok, true);
  assert.equal(state.resources.wood, original.wood - 1);
});

test('initial offers last six hours; completed chains use Warsaw midnight and early successors share it', () => {
  const state = island();
  assert.ok(state.lighthouseTasks.every(task => task.expiresAt === 6 * HOUR));
  advanceActivities(state, 72 * 60);
  const original = simpleTask(state), chain = original.chainId;
  complete(state, original);
  let next = state.lighthouseTasks.find(task => task.chainId === chain);
  assert.equal(next.expiresAt, 12 * HOUR); // Midnight, not next-day13:12.
  advanceActivities(state, HOUR);
  complete(state, simpleTask(state, next));
  next = state.lighthouseTasks.find(task => task.chainId === chain);
  assert.equal(next.expiresAt, 12 * HOUR);
});

test('daily chains respect the twenty-five and twenty-three hour Warsaw DST days', () => {
  for (const [date, hours] of [['2026-10-24T22:00:00Z', 25], ['2027-03-27T23:00:00Z', 23]]) {
    const state = island(Date.parse(date)), task = simpleTask(state), chain = task.chainId;
    complete(state, task);
    assert.equal(state.lighthouseTasks.find(item => item.chainId === chain).expiresAt, hours * HOUR);
    advanceActivities(state, hours * HOUR);
    assert.equal(state.lighthouseTasks.find(item => item.chainId === chain).expiresAt, (hours + 24) * HOUR);
  }
});

test('offline midnight renewal retains its real appearance time instead of restoring fast click bonuses', () => {
  const state = island(), task = simpleTask(state), chain = task.chainId;
  complete(state, task);
  advanceActivities(state, 4 * DAY + HOUR);
  const renewed = state.lighthouseTasks.find(item => item.chainId === chain);
  assert.ok(state.activityClock - renewed.createdAt > 300);
  activityAction(state, { type: 'beginTaskAcceptance', task: renewed.id });
  assert.equal(taskAcceptanceStatus(state).multiplier, 1);
});

test('unresolved share decisions remain available after opening/reload and the prototype bonus pays once', () => {
  let state = island(); complete(state, simpleTask(state));
  const achievement = pendingTaskAchievements(state)[0], coins = state.resources.coins;
  activityAction(state, { type: 'seeTaskAchievement', id: achievement.id });
  state = reload(state);
  assert.equal(pendingTaskAchievements(state).length, 1);
  assert.equal(activityAction(state, { type: 'shareTaskAchievement', id: achievement.id }).ok, true);
  assert.equal(state.resources.coins, coins + 500);
  assert.equal(activityAction(state, { type: 'shareTaskAchievement', id: achievement.id }).ok, false);
  assert.equal(pendingTaskAchievements(state).length, 0);
});

test('Skip resolves a notification without paying and bonus rewards remain spendable without carriers', () => {
  const state = island();
  state.resources = { coins: 1000, wood: 1000, stone: 1000, grain: 1000, food: 1000, planks: 0 };
  advanceActivities(state, 301); // A plain ×1 reward makes quantities explicit.
  complete(state, simpleTask(state, state.lighthouseTasks[0], { coins: 10, planks: 1000 }));
  const achievement = pendingTaskAchievements(state)[0], coins = state.resources.coins;
  activityAction(state, { type: 'skipTaskAchievement', id: achievement.id });
  assert.equal(state.resources.coins, coins);
  assert.equal(state.rewardBuffer.planks, 0);
  assert.equal(state.bonusMaterials.planks, 1000);
  const total = state.resources.planks;
  advanceActivities(state, 30 * DAY);
  assert.equal(state.resources.planks, total);
  const before = state.resources.planks;
  state.resources.wood -= 100;
  advanceActivities(state, 0);
  assert.equal(state.resources.planks, before);
  assert.equal(state.buildings.warehouse.workers, 0);
});

test('only one expedition series can be open globally, including its post-win decision', () => {
  const state = island(), run = start(state);
  assert.equal(activeExpeditionRun(state).id, run.id);
  assert.equal(activityAction(state, { type: 'expeditionStart', expedition: 'other' }, context).ok, false);
  assert.equal(win(state, run).ok, true);
  assert.equal(activityAction(state, { type: 'expeditionStart', expedition: 'other' }, context).ok, false);
  activityAction(state, { type: 'expeditionCashout', runId: run.id });
  assert.equal(activityAction(state, { type: 'expeditionStart', expedition: 'other' }, context).ok, true);
});

test('timely wins add fifty linearly and cash out once to island coins only', () => {
  const state = island(), original = { ...state.resources }, run = start(state);
  for (const pot of [50, 100, 150]) {
    assert.equal(win(state, run).ok, true); assert.equal(run.pot, pot);
    if (pot < 150) onward(state, run);
  }
  assert.deepEqual(state.resources, original);
  assert.equal(activityAction(state, { type: 'expeditionCashout', runId: run.id }).ok, true);
  assert.equal(state.resources.coins, original.coins + 150);
  for (const id of MATERIAL_IDS) assert.equal(state.resources[id], original[id]);
  assert.equal(activityAction(state, { type: 'expeditionCashout', runId: run.id }).ok, false);
});

test('whole overtime seconds reduce the actual potential pot and the next round adds50 to that remainder', () => {
  const state = island(), run = start(state, { limit: 10 }), coins = state.resources.coins;
  advanceActivities(state, 10.99);
  assert.equal(expeditionRoundStatus(state, run).potentialPot, 50);
  advanceActivities(state, 0.01);
  assert.equal(expeditionRoundStatus(state, run).potentialPot, 40);
  assert.equal(win(state, run).ok, true); assert.equal(run.pot, 40);
  onward(state, run, { limit: 10 });
  assert.equal(run.roundBasePot, 90);
  advanceActivities(state, 12);
  assert.equal(win(state, run).ok, true); assert.equal(run.pot, 70);
  onward(state, run); assert.equal(run.roundBasePot, 120);
  assert.equal(state.resources.coins, coins);
});

test('overtime loses the whole series exactly when the potential pot reaches zero', () => {
  const state = island(), run = start(state, { limit: 10 }), coins = state.resources.coins;
  advanceActivities(state, 14.999); assert.equal(run.status, 'active');
  advanceActivities(state, 0.001); assert.equal(run.status, 'lost');
  assert.equal(run.lossReason, 'overtime'); assert.equal(run.pot, 0);
  assert.equal(state.resources.coins, coins);
  const again = start(state); assert.equal(again.roundBasePot, 50);
});

test('presence confirmation leaves the puzzle clock running and refreshes only the activity grace period', () => {
  const state = island(), run = start(state, { limit: 1000 });
  advanceActivities(state, 300);
  assert.equal(expeditionRoundStatus(state, run).presenceRequired, true);
  assert.equal(expeditionRoundStatus(state, run).presenceRemaining, 60);
  advanceActivities(state, 30);
  assert.equal(expeditionRoundStatus(state, run).elapsed, 330);
  assert.equal(expeditionRoundStatus(state, run).remaining, 670);
  assert.equal(activityAction(state, { type: 'expeditionPresenceConfirm', runId: run.id }).ok, true);
  advanceActivities(state, 299); assert.equal(run.presencePromptAt, null);
  advanceActivities(state, 1); assert.equal(run.presencePromptAt, 630);
  advanceActivities(state, 60); assert.equal(run.status, 'lost');
  assert.equal(run.lossReason, 'presence-timeout');
});

test('ordinary activity does not silently dismiss an already displayed presence prompt', () => {
  const state = island(), run = start(state, { limit: 1000 });
  advanceActivities(state, 300);
  state.lastMeaningfulActivityAt = 330; // Progression's visible/focused input source.
  advanceActivities(state, 60);
  assert.equal(run.status, 'lost');
});

test('post-win time stops, but its unclaimed pot is still subject to presence loss', () => {
  const state = island(), run = start(state);
  advanceActivities(state, 20); win(state, run);
  advanceActivities(state, 280);
  assert.equal(expeditionRoundStatus(state, run).elapsed, 20);
  assert.equal(expeditionRoundStatus(state, run).potentialPot, 50);
  assert.equal(expeditionRoundStatus(state, run).presenceRequired, true);
  advanceActivities(state, 60); assert.equal(run.status, 'lost');
});

test('saved elapsed timestamps survive reload and offline presence/overtime cannot be reset', () => {
  let state = island(); const runId = start(state, { limit: 1000 }).id;
  advanceActivities(state, 30); state = reload(state);
  const run = activeExpeditionRun(state);
  assert.equal(run.id, runId); assert.equal(expeditionRoundStatus(state, run).elapsed, 30);
  advanceActivities(state, 330); assert.equal(run.status, 'lost');
  assert.equal(run.finishedAt, 360);
});

test('failed or duplicate puzzle proofs never pay, and abandon loses only the unclaimed pot', () => {
  const state = island(), run = start(state), coins = state.resources.coins;
  assert.equal(activityAction(state, { type: 'expeditionWin', runId: run.id, stage: 1, path: [[0, 3]] }, context).ok, false);
  win(state, run); assert.equal(win(state, run).ok, false);
  onward(state, run);
  assert.equal(activityAction(state, { type: 'expeditionLose', runId: run.id }).ok, true);
  assert.equal(run.pot, 0); assert.equal(state.resources.coins, coins);
});

test('designer curve is configurable and harder later; no time/move/ad button grants free extension', () => {
  assert.ok(expeditionRoundRules(2).timeLimit < expeditionRoundRules(1).timeLimit);
  assert.ok(expeditionRoundRules(1000).timeLimit < expeditionRoundRules(100).timeLimit);
  assert.equal(expeditionRoundRules(3, { baseSeconds: 300, difficultyPerStage: 0.25 }).timeLimit, 200);
  assert.equal(expeditionRoundRules(1).provisional, true);
  const state = island(), run = start(state), before = JSON.stringify(run), coins = state.resources.coins;
  for (const type of ['expeditionExtraTime', 'expeditionExtraMoves', 'expeditionAdReward']) assert.equal(activityAction(state, { type, runId: run.id }).ok, false);
  assert.equal(JSON.stringify(run), before); assert.equal(state.resources.coins, coins);
});

test('full building purchases quote actual road cargo capacity and use a separate ten-second service callback', () => {
  const state = island(), requests = [], options = [];
  state.roads.segments.fill(5); const stock = { ...state.resources };
  const ctx = {
    buildingCost: (_state, _id, opts) => { options.push(opts); return { wood: 121 }; },
    requestUpgrade: request => { requests.push(request); return { ok: true, message: 'service started' }; }
  };
  const quote = quotePremiumBuilding(state, 'farm', ctx);
  assert.equal(quote.capacity, 156); assert.equal(quote.trips, 1); assert.equal(quote.coins, 86);
  assert.equal(activityAction(state, { type: 'premiumBuyBuilding', building: 'farm' }, ctx).ok, true);
  assert.equal(requests[0].premiumService, true); assert.equal(requests[0].skipTransport, true);
  assert.equal(options[0].queued, false); assert.equal(quote.buildSeconds, 10);
  assert.equal(state.constructionProjects.length, 0);
  for (const id of MATERIAL_IDS) assert.equal(state.resources[id], stock[id]);
});

test('forecast fees exclude FIFO pledged stock and are held before reservation callbacks', () => {
  const state = island(); state.premium.expiresAt = NOW + DAY * 1000;
  state.constructionProjects = [{ order: 1, reservedMaterials: { wood: 80 } }];
  const coins = state.resources.coins, requests = [];
  const ctx = {
    buildingCost: () => ({ wood: 150 }), estimateMaterialsSeconds: () => 600,
    requestUpgrade: request => { assert.equal(state.resources.coins, coins - 17); requests.push(request); return { ok: true, message: 'planned' }; }
  };
  const quote = quoteForecastPlan(state, 'house', ctx);
  assert.equal(quote.missing.wood, 130); assert.equal(quote.coins, 17);
  assert.equal(activityAction(state, { type: 'forecastPlan', building: 'house' }, ctx).ok, true);
  assert.equal(requests[0].forecastFee, 17);
});

test('rejected full purchases refund their held fee without spending any of the island inventory', () => {
  const state = island(), before = JSON.stringify(state);
  const ctx = { buildingCost: () => ({ wood: 100 }), requestUpgrade: () => ({ ok: false, message: 'Previous level unfinished' }) };
  assert.equal(activityAction(state, { type: 'premiumBuyBuilding', building: 'farm' }, ctx).ok, false);
  assert.equal(JSON.stringify(state), before);
});

test('next-event scheduling includes drafts, round overtime and presence boundaries', () => {
  const state = island(), task = state.lighthouseTasks[0];
  activityAction(state, { type: 'beginTaskAcceptance', task: task.id });
  assert.equal(nextActivitiesEvent(state), 60);
  activityAction(state, { type: 'cancelTaskAcceptance' });
  const run = start(state, { limit: 10 });
  assert.equal(nextActivitiesEvent(state), 10);
  advanceActivities(state, 10); assert.equal(nextActivitiesEvent(state), 1);
  advanceActivities(state, 4); assert.equal(run.status, 'active');
  assert.equal(nextActivitiesEvent(state), 1);
});

test('the lighthouse narrative catalog remains one hundred distinct titles', () => {
  assert.equal(TASK_NARRATIVES.length, 100); assert.equal(new Set(TASK_NARRATIVES).size, 100);
});
