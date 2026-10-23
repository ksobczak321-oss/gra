import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeActivities, advanceActivities, nextActivitiesEvent, activityAction,
  quoteAcceleration, quoteTransport, quotePremiumBuilding, quoteForecastPlan,
  quoteConstructionPackage, taskReward, taskStatus, taskRewardScale,
  TASK_NARRATIVES, verifyExpeditionPath, expeditionPot, nextDailyTaskDeadline
} from '../harborlight-v1-activities.js';
import { normalizeLogisticsState, MATERIAL_IDS } from '../harborlight-v1-logistics.js';

const HOUR = 3600, DAY = 24 * HOUR;
const world = Date.parse('2026-10-23T10:00:00Z'); // 12:00 in Warsaw.
function island(townLevel = 4) {
  const state = {
    resources: { coins: 100000, wood: 100, stone: 100, grain: 100, food: 100, planks: 100 },
    population: 12, foodCredit: 1, activeSeconds: 0, worldTimeMs: world,
    activityClock: 0, activitySeed: 123456789,
    buildings: Object.fromEntries(['farm','windmill','lumber','sawmill','quarry','warehouse','market','dock','house','townhall','chapel','lighthouse'].map(id => [id, { level: id === 'townhall' ? townLevel : 1, workers: 0, ready: 0, workProgress: [] }])),
    statistics: { expeditions: 0, collected: 0, upgraded: 0, traded: 0 },
    notifications: [], constructionProjects: [], premium: { expiresAt: 0 },
    residents: [], returningWorkers: []
  };
  normalizeLogisticsState(state, state);
  normalizeActivities(state, { activityClock: 0, activitySeed: 123456789 });
  return state;
}
function refresh(state) {
  const raw = JSON.parse(JSON.stringify(state)), target = island(raw.buildings.townhall.level);
  Object.assign(target, raw);
  normalizeActivities(target, raw);
  return target;
}
function smallTask(state, requirements = { wood: 20, stone: 10 }, reward = { coins: 100, planks: 50 }) {
  const task = state.lighthouseTasks[0];
  task.requirements = { ...requirements };
  task.deposited = Object.fromEntries(Object.keys(requirements).map(id => [id, 0]));
  task.reward = { ...reward };
  return task;
}
function contribute(state, task) {
  assert.equal(activityAction(state, { type: 'taskAccept', task: task.id }).ok, true);
  for (const [resource, amount] of Object.entries(task.requirements)) {
    const result = activityAction(state, { type: 'taskDeposit', task: task.id, resource, amount });
    assert.equal(result.ok, true, result.message);
  }
}
const simpleExpedition = {
  id: 'proof', map: ['S..G'], tools: { bridge: 0, axe: 0, dynamite: 0 }
};
const context = { expeditions: [simpleExpedition] };
function startRun(state, extras = {}) {
  const result = activityAction(state, { type: 'expeditionStart', expedition: 'proof', ...extras }, context);
  assert.equal(result.ok, true, result.message);
  return state.expeditionRuns.proof;
}
function win(state, run) {
  return activityAction(state, { type: 'expeditionWin', runId: run.id, stage: run.level, path: [[0, 1], [0, 2], [0, 3]] }, context);
}
function assertGoldOrder(tasks) {
  const rank = { small: 0, medium: 1, large: 2 };
  for (const lower of tasks) for (const higher of tasks) {
    if (rank[lower.size] < rank[higher.size]) {
      assert.ok(higher.reward.coins - lower.reward.coins >= rank[higher.size] - rank[lower.size],
        JSON.stringify(tasks.map(task => [task.size, task.reward.coins])));
    }
  }
}
function assertRewardRange(state, task) {
  const rank = { small: 0, medium: 1, large: 2 };
  const scale = taskRewardScale(state), max = { small: 200, medium: 400, large: 600 }[task.size];
  assert.ok(task.reward.coins >= Math.floor(100 * scale) + rank[task.size]);
  assert.ok(task.reward.coins <= Math.floor(max * scale));
}

test('one hundred distinct narrative tasks and initial small/medium/large offers', () => {
  assert.equal(TASK_NARRATIVES.length, 100);
  assert.equal(new Set(TASK_NARRATIVES).size, 100);
  const s = island(3);
  assert.deepEqual(s.lighthouseTasks.map(t => t.size), ['small', 'medium', 'large']);
  assert.deepEqual(s.lighthouseTasks.map(t => Object.keys(t.reward).length - 1), [1, 2, 3]);
  assert.ok(s.lighthouseTasks[1].hours >= s.lighthouseTasks[0].hours);
  assert.ok(s.lighthouseTasks[2].hours >= s.lighthouseTasks[1].hours);
  for (const task of s.lighthouseTasks) {
    assert.equal(task.expiresAt, 6 * HOUR);
    for (const [resource, quantity] of Object.entries(task.requirements)) {
      assert.equal(quantity, 12 * 1 * 10 * task.hours);
      assert.ok(MATERIAL_IDS.includes(resource));
    }
  }
});
test('random FIFO replacements retain the largest current smaller-task hourly floor without rewriting old tasks', () => {
  const s = island();
  const [small, medium] = s.lighthouseTasks;
  small.hours = 6; medium.hours = 8;
  small.expiresAt = medium.expiresAt = DAY;
  const frozen = JSON.stringify([small, medium]);
  const seen = new Set();
  for (let count = 0; count < 60; count++) {
    s.lighthouseTasks[2].expiresAt = s.activityClock;
    advanceActivities(s, 0);
    const replacement = s.lighthouseTasks[2];
    seen.add(replacement.size);
    if (replacement.size === 'medium') assert.ok(replacement.hours >= 6);
    if (replacement.size === 'large') assert.ok(replacement.hours >= 8);
    assert.equal(JSON.stringify(s.lighthouseTasks.slice(0, 2)), frozen);
  }
  assert.deepEqual([...seen].sort(), ['large', 'medium', 'small']);
});
test('initial gold rewards are strictly ordered within their scaled ranges for100seeds', () => {
  for (const townLevel of [1, 3, 4, 10]) for (let seed = 1; seed <= 100; seed++) {
    const s = island(townLevel);
    normalizeActivities(s, { activitySeed: seed, activityClock: 0 });
    assert.deepEqual(s.lighthouseTasks.map(task => task.size), ['small', 'medium', 'large']);
    assertGoldOrder(s.lighthouseTasks);
    for (const task of s.lighthouseTasks) assertRewardRange(s, task);
  }
});
test('FIFO gold generation compares every current size and retains frozen shown rewards', () => {
  const s = island(3), seen = new Set();
  for (let count = 0; count < 100; count++) {
    const retained = s.lighthouseTasks.slice(1), frozen = JSON.stringify(retained);
    s.lighthouseTasks[0].expiresAt = s.activityClock;
    advanceActivities(s, 0);
    assert.equal(JSON.stringify(s.lighthouseTasks.slice(0, 2)), frozen);
    assertGoldOrder(s.lighthouseTasks);
    const generated = s.lighthouseTasks[2];
    seen.add(generated.size); assertRewardRange(s, generated);
  }
  assert.deepEqual([...seen].sort(), ['large', 'medium', 'small']);
});
test('a player level increase selects a feasible new size without changing old low rewards', () => {
  const s = island(3);
  s.lighthouseTasks.forEach((task, index) => { task.reward.coins = 100 + index; task.expiresAt = DAY; });
  const frozen = JSON.stringify(s.lighthouseTasks.slice(1));
  s.buildings.townhall.level = 4;
  s.lighthouseTasks[0].expiresAt = 0;
  advanceActivities(s, 0);
  assert.equal(JSON.stringify(s.lighthouseTasks.slice(0, 2)), frozen);
  assert.equal(s.lighthouseTasks[2].size, 'large');
  assertRewardRange(s, s.lighthouseTasks[2]);
  assertGoldOrder(s.lighthouseTasks);
});
test('cost snapshots use each actual producer level and ignore transient production multipliers', () => {
  const s = island(4);
  for (const id of ['farm','windmill','lumber','sawmill','quarry']) s.buildings[id].level = 2;
  s.lighthouseRemaining = DAY; s.resources.food = 0; s.foodCredit = 0;
  normalizeActivities(s, { activitySeed: 555, activityClock: 0 });
  for (const task of s.lighthouseTasks) {
    for (const q of Object.values(task.requirements)) assert.equal(q, 24 * 12 * task.hours);
  }
  const saved = JSON.stringify(s.lighthouseTasks);
  s.buildings.farm.level = 4;
  assert.equal(JSON.stringify(s.lighthouseTasks), saved);
});
test('reward ranges are based on level3 and scale by theoretical townhall production', () => {
  assert.equal(taskRewardScale(island(3)), 1);
  assert.equal(taskRewardScale(island(1)), 120 / 468);
  for (const l of [1, 2, 3, 4, 8]) {
    const s = island(l), factor = taskRewardScale(s);
    for (const task of s.lighthouseTasks) {
      const max = { small: 200, medium: 400, large: 600 }[task.size];
      assert.ok(task.reward.coins >= Math.floor(100 * factor));
      assert.ok(task.reward.coins <= Math.floor(max * factor));
      for (const [id, q] of Object.entries(task.reward)) if (id !== 'coins') {
        assert.ok(q >= Math.floor(50 * factor) && q <= Math.floor(1000 * factor));
      }
    }
  }
});
test('acceptance locks exact reaction windows and survives reload', () => {
  for (const [seconds, expected] of [[0,3],[14.999,3],[15,2],[299.999,2],[300,1]]) {
    let s = island(), task = smallTask(s);
    advanceActivities(s, seconds);
    assert.equal(taskStatus(s, task).multiplier, expected);
    assert.equal(activityAction(s, { type: 'taskAccept', task: task.id }).ok, true);
    advanceActivities(s, 600);
    s = refresh(s);
    task = s.lighthouseTasks.find(t => t.id === task.id);
    assert.equal(task.multiplier, expected);
    assert.equal(taskReward(task).coins, 100 * expected);
    assert.equal(activityAction(s, { type: 'taskAccept', task: task.id }).ok, false);
  }
});
test('contributions are whole, irreversible and draw only unprotected central goods', () => {
  const s = island(), task = smallTask(s, { food: 60, stone: 10 });
  assert.equal(activityAction(s, { type: 'taskDeposit', task: task.id, resource: 'food', amount: 1 }).ok, false);
  activityAction(s, { type: 'taskAccept', task: task.id });
  const before = JSON.stringify(s);
  assert.equal(activityAction(s, { type: 'taskDeposit', task: task.id, resource: 'food', amount: 51 }).ok, false);
  assert.equal(JSON.stringify(s), before);
  assert.equal(activityAction(s, { type: 'taskDeposit', task: task.id, resource: 'food', amount: 50 }).ok, true);
  assert.equal(s.resources.food, 50);
  assert.equal(task.deposited.food, 50);
  assert.equal(activityAction(s, { type: 'taskWithdraw', task: task.id, resource: 'food', amount: 50 }), null);
});
test('expiry forfeits partial contributions and moves a random replacement to FIFO end', () => {
  const s = island(), task = smallTask(s), secondId = s.lighthouseTasks[1].id;
  activityAction(s, { type: 'taskAccept', task: task.id });
  activityAction(s, { type: 'taskDeposit', task: task.id, resource: 'wood', amount: 5 });
  advanceActivities(s, 6 * HOUR);
  assert.equal(s.resources.wood, 95);
  assert.equal(s.lighthouseTasks.length, 3);
  assert.ok(!s.lighthouseTasks.some(t => t.id === task.id));
  assert.ok(!s.lighthouseTasks.some(t => t.id === secondId));
  assert.ok(s.notifications.some(n => n.kind === 'lighthouse-task-expired'));
  assert.equal(activityAction(s, { type: 'taskAccept', task: task.id }).ok, false);
});
test('first completion anchors that chain daily and an early second success keeps its deadline', () => {
  const s = island(), first = smallTask(s), untouched = s.lighthouseTasks[1].id;
  advanceActivities(s, HOUR + 12 * 60); // First success at13:12 Warsaw.
  const at = s.activityClock;
  contribute(s, first);
  assert.equal(s.lighthouseTasks[0].id, untouched);
  let next = s.lighthouseTasks.at(-1);
  assert.equal(next.chainId, first.chainId);
  assert.equal(next.anchorAt, at);
  assert.equal(next.expiresAt, at + DAY);
  const deadline = next.expiresAt;
  next.requirements = { wood: 1, stone: 1 }; next.deposited = { wood: 0, stone: 0 };
  advanceActivities(s, 48 * 60);
  contribute(s, next);
  next = s.lighthouseTasks.at(-1);
  assert.equal(next.expiresAt, deadline);
  assert.equal(next.anchorAt, at);
});
test('daily deadlines retain Warsaw clock through autumn and spring DST changes', () => {
  for (const [epoch, next] of [
    ['2026-10-24T11:12:00Z', '2026-10-25T12:12:00Z'],
    ['2027-03-27T12:12:00Z', '2027-03-28T11:12:00Z']
  ]) {
    const s = island();
    s.activityEpochMs = Date.parse(epoch); s.activityClock = 0;
    assert.equal(s.activityEpochMs + nextDailyTaskDeadline(s, 0, 0) * 1000, Date.parse(next));
  }
});
test('offline return preserves the real daily appearance time and does not refresh reaction bonuses', () => {
  const s = island(), first = smallTask(s);
  advanceActivities(s, HOUR + 12 * 60);
  const anchor = s.activityClock, chain = first.chainId;
  contribute(s, first);
  advanceActivities(s, DAY + HOUR);
  const current = s.lighthouseTasks.find(t => t.chainId === chain);
  assert.equal(current.createdAt, anchor + DAY);
  assert.equal(s.activityEpochMs + current.expiresAt * 1000, Date.parse('2026-10-25T12:12:00Z'));
  assert.equal(taskStatus(s, current).age, HOUR);
  assert.equal(taskStatus(s, current).multiplier, 1);
});
test('task reward overflow is retained and auto-filled after space becomes available', () => {
  const s = island(), task = smallTask(s, { wood: 20, stone: 10 }, { coins: 100, planks: 1000 });
  s.resources.planks = 1000;
  const coins = s.resources.coins;
  contribute(s, task);
  assert.equal(s.resources.coins, coins + 300);
  assert.equal(s.resources.planks, 1000);
  assert.equal(s.rewardBuffer.planks, 3000);
  s.resources.planks -= 200;
  advanceActivities(s, 0);
  assert.equal(s.resources.planks, 1000);
  assert.equal(s.rewardBuffer.planks, 2800);
  assert.ok(s.notifications.some(n => n.kind === 'reward-buffer'));
  const old = refresh(s);
  assert.equal(old.rewardBuffer.planks, 2800);
});
test('normalization preserves accepted tasks, de-duplicates IDs and is safe in place', () => {
  const s = island(), task = smallTask(s);
  activityAction(s, { type: 'taskAccept', task: task.id });
  const id = task.id;
  normalizeActivities(s, s);
  assert.equal(s.lighthouseTasks[0].id, id);
  assert.equal(s.lighthouseTasks[0].acceptedAt, 0);
  const raw = JSON.parse(JSON.stringify(s)); raw.taskSequence = 0;
  raw.lighthouseTasks[1].id = raw.lighthouseTasks[0].id;
  normalizeActivities(s, raw);
  assert.equal(new Set(s.lighthouseTasks.map(t => t.id)).size, 3);
});
test('acceleration uses remaining phase, rounds full saved minutes down and always costs at least5', () => {
  const s = island(); s.constructionProjects.push({ order: 1, building: 'farm', stage: 'building', buildRemaining: 50 * 60 });
  assert.equal(quoteAcceleration(s, 1, 50).coins, 25);
  assert.equal(activityAction(s, { type: 'premiumAccelerate', project: 1, percent: 50 }).ok, true);
  assert.equal(s.constructionProjects[0].buildRemaining, 25 * 60);
  s.constructionProjects[0].buildRemaining = 90;
  assert.equal(quoteAcceleration(s, 1, 50).coins, 5);
  assert.equal(quoteAcceleration(s, 1, 100).coins, 5);
  s.constructionProjects[0].buildRemaining = 9 * 60;
  assert.equal(quoteAcceleration(s, 1, 25).coins, 5);
  assert.equal(quoteAcceleration(s, 1, 50).coins, 5);
  assert.equal(quoteAcceleration(s, 1, 75).coins, 6);
  assert.equal(quoteAcceleration(s, 1, 33).ok, false);
});
test('premium transport counts the final partial load and is gated at townhall4', () => {
  const s = island(); s.buildings.lumber.ready = 100;
  const quote = quoteTransport(s, { route: 'producer', building: 'lumber' });
  assert.equal(quote.ok, true, quote.message); assert.equal(quote.trips, 2); assert.equal(quote.coins, 20);
  const coins = s.resources.coins;
  assert.equal(activityAction(s, { type: 'premiumTransport', route: 'producer', building: 'lumber' }).ok, true);
  assert.equal(s.resources.coins, coins - 20); assert.equal(s.resources.wood, 200);
  assert.equal(s.buildings.lumber.ready, 0);
  s.buildings.townhall.level = 3;
  assert.equal(quoteTransport(s, { route: 'producer', building: 'lumber' }).ok, false);
});
test('premium building price includes allmaterials+25%, nativecoins and each haul course', () => {
  const s = island(), cost = { wood: 100, stone: 100, grain: 100, food: 100, planks: 100, coins: 500 };
  const requests = [], ctx = {
    buildingCost: () => cost,
    requestUpgrade: request => { requests.push(request); return { ok: true, message: 'created' }; }
  };
  const quote = quotePremiumBuilding(s, 'farm', ctx);
  assert.equal(quote.materialValue, 450);
  assert.equal(quote.materialCoins, 562.5); assert.equal(quote.transportCoins, 100);
  assert.equal(quote.coins, 1163);
  assert.equal(quote.buildSeconds, 10);
  const oldStock = Object.fromEntries(MATERIAL_IDS.map(id => [id, s.resources[id]])), coins = s.resources.coins;
  assert.equal(activityAction(s, { type: 'premiumBuyBuilding', building: 'farm' }, ctx).ok, true);
  assert.equal(s.resources.coins, coins - 1163);
  assert.deepEqual(Object.fromEntries(MATERIAL_IDS.map(id => [id, s.resources[id]])), oldStock);
  assert.equal(requests[0].paidMaterials, true); assert.equal(requests[0].paidCoins, true);
  assert.equal(requests[0].skipTransport, true);
});
test('failed premium upgrade and rejected quotes do not charge or consume existing stock', () => {
  const s = island(), before = JSON.stringify(s);
  const ctx = { buildingCost: () => ({ wood: 100 }), requestUpgrade: () => ({ ok: false, message: 'Slots full' }) };
  assert.equal(activityAction(s, { type: 'premiumBuyBuilding', building: 'farm' }, ctx).ok, false);
  assert.equal(JSON.stringify(s), before);
  assert.equal(activityAction(s, { type: 'socialReward', reward: 'playing' }).ok, false);
  assert.equal(JSON.stringify(s), before);
});
test('Premium building charges are held before callbacks can promote other coin-funded plans', () => {
  const s = island(); s.resources.coins = 300;
  const result = activityAction(s, { type: 'premiumBuyBuilding', building: 'farm' }, {
    buildingCost: () => ({ wood: 72, stone: 72, grain: 120 }),
    requestUpgrade: () => {
      assert.equal(s.resources.coins, 75);
      if (s.resources.coins >= 100) s.resources.coins -= 100;
      return { ok: true, message: 'created' };
    }
  });
  assert.equal(result.ok, true);
  assert.equal(s.resources.coins, 75);
});
test('forecast scheduling charges25%ofmissingmaterialportvalue and waitsforactualgoods', () => {
  const s = island(), cost = { stone: 300 };
  s.resources.stone = 200; s.premium.expiresAt = s.worldTimeMs + DAY * 1000;
  const ctx = { buildingCost: () => cost, estimateMaterialsSeconds: () => 300, requestUpgrade: () => ({ ok: true, message: 'planned' }) };
  const q = quoteForecastPlan(s, 'house', ctx);
  assert.equal(q.coins, 13); // 100stone*0.5portprice*25%=12.5roundedup.
  const coins = s.resources.coins;
  assert.equal(activityAction(s, { type: 'forecastPlan', building: 'house' }, ctx).ok, true);
  assert.equal(s.resources.coins, coins - 13);
  assert.equal(s.resources.stone, 200);
});
test('forecast fees use the missing quantity after the queued building surcharge', () => {
  const s = island();
  s.resources.stone = 200; s.premium.expiresAt = s.worldTimeMs + DAY * 1000;
  const cost = { stone: 330 }, requests = [];
  const ctx = {
    buildingCost: () => cost, estimateMaterialsSeconds: () => 300,
    requestUpgrade: request => { requests.push(request); return { ok: true, message: 'planned' }; }
  };
  const quote = quoteForecastPlan(s, 'house', ctx);
  assert.equal(quote.missing.stone, 130);
  assert.equal(quote.coins, 17);
  const coins = s.resources.coins;
  assert.equal(activityAction(s, { type: 'forecastPlan', building: 'house' }, ctx).ok, true);
  assert.equal(s.resources.coins, coins - 17);
  assert.equal(s.resources.stone, 200);
  assert.deepEqual(requests[0].cost, cost);
  assert.equal(requests[0].forecast, true);
});
test('forecast fees are held before callbacks and are refunded when scheduling is rejected', () => {
  const s = island(); s.resources.coins = 100; s.resources.stone = 200;
  s.premium.expiresAt = s.worldTimeMs + DAY * 1000;
  const ctx = {
    buildingCost: () => ({ stone: 300 }), estimateMaterialsSeconds: () => 300,
    requestUpgrade: () => {
      assert.equal(s.resources.coins, 87);
      return { ok: false, message: 'Queue full' };
    }
  };
  const before = JSON.stringify(s);
  assert.equal(activityAction(s, { type: 'forecastPlan', building: 'house' }, ctx).ok, false);
  assert.equal(JSON.stringify(s), before);
});
test('forecast fees treat the protected food reserve as unavailable for construction', () => {
  const s = island(); s.resources.food = 100;
  s.premium.expiresAt = s.worldTimeMs + DAY * 1000;
  const quote = quoteForecastPlan(s, 'house', {
    buildingCost: () => ({ food: 100 }), estimateMaterialsSeconds: () => 300
  });
  assert.equal(quote.ok, true);
  assert.equal(quote.missing.food, 50);
  assert.equal(quote.coins, 19); // 50 food ×1.5 base port buy ×25%, rounded up.
  assert.equal(s.resources.food, 100);
});
test('24hconstructionpackagecosts1000perTownHalllevel and renewals extendremainingtime', () => {
  const s = island(3), coins = s.resources.coins;
  assert.equal(quoteConstructionPackage(s).coins, 3000);
  assert.equal(activityAction(s, { type: 'purchaseConstructionPackage' }).ok, true);
  assert.equal(s.resources.coins, coins - 3000);
  assert.equal(s.premium.expiresAt, world + DAY * 1000);
  assert.equal(activityAction(s, { type: 'purchaseConstructionPackage' }).ok, true);
  assert.equal(s.premium.expiresAt, world + 2 * DAY * 1000);
});
test('path verification enforces adjacent steps, obstacles, tools and keys', () => {
  assert.deepEqual(verifyExpeditionPath(simpleExpedition, [[0,0],[0,1],[0,2],[0,3]]), { moves: 3 });
  assert.equal(verifyExpeditionPath(simpleExpedition, [[0,3]]), false);
  assert.equal(verifyExpeditionPath({ map: ['SWG'], tools: {} }, [[0,1],[0,2]]), false);
  assert.deepEqual(verifyExpeditionPath({ map: ['SWG'], tools: { bridge: 1 } }, [[0,1],[0,2]]), { moves: 2 });
  assert.equal(verifyExpeditionPath({ map: ['SDG'], tools: {} }, [[0,1],[0,2]]), false);
  assert.deepEqual(verifyExpeditionPath({ map: ['SKDG'], tools: {} }, [[0,1],[0,2],[0,3]]), { moves: 3 });
});
test('expeditionpotsdouble, settleonlyonce, payonlycoins andwithdrawonlytotheisland', () => {
  const s = island(), coins = s.resources.coins, materials = MATERIAL_IDS.map(id => s.resources[id]), run = startRun(s);
  assert.equal(win(s, run).ok, true); assert.equal(run.pot, 50); assert.equal(s.resources.coins, coins);
  assert.equal(win(s, run).ok, false);
  assert.equal(activityAction(s, { type: 'expeditionContinue', runId: run.id }, context).ok, true);
  assert.equal(win(s, run).ok, true); assert.equal(run.pot, 100);
  assert.equal(activityAction(s, { type: 'expeditionCashout', runId: run.id }, context).ok, true);
  assert.equal(s.resources.coins, coins + 100);
  assert.deepEqual(MATERIAL_IDS.map(id => s.resources[id]), materials);
  assert.equal(activityAction(s, { type: 'expeditionCashout', runId: run.id }, context).ok, false);
});
test('expeditionfailurelosesonlytheunclaimedpot andmovementlimitcountsactualpathsteps', () => {
  const s = island(), coins = s.resources.coins, run = startRun(s, { limit: 2 });
  const result = win(s, run);
  assert.equal(result.outcome, 'lost'); assert.equal(run.pot, 0); assert.equal(s.resources.coins, coins);
  assert.equal(activityAction(s, { type: 'expeditionContinue', runId: run.id }, context).ok, false);
});
test('timedexpeditionstexpireofflineandunknownadrewardscannotgrantfreecoins', () => {
  let s = island(), run = startRun(s, { mode: 'time', limit: 60 });
  assert.equal(nextActivitiesEvent(s), 60);
  advanceActivities(s, 59); assert.equal(run.status, 'active');
  s = refresh(s); run = s.expeditionRuns.proof;
  advanceActivities(s, 1);
  assert.equal(run.status, 'lost'); assert.equal(run.pot, 0);
  assert.equal(activityAction(s, { type: 'expeditionAdReward', runId: run.id }).ok, false);
  assert.equal(expeditionPot(20), 26214400); assert.equal(expeditionPot(49), null);
});
