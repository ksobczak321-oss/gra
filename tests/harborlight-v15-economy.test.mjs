import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, tick, resourceRates, taxRate } from '../harborlight-v1-state.js';
import { productionRate, haulCapacity, nextLogisticsEvent, advanceLogistics, constructionEstimate, availableGoods } from '../harborlight-v1-logistics.js';
import { quoteTransport, taskStatus } from '../harborlight-v1-activities.js';

const NOW = Date.parse('2026-10-29T12:00:00Z');
const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
function island() {
  const state = createState(NOW);
  state.buildings.townhall.level = state.buildings.house.level = 4;
  state.resources.coins = 100000;
  state.capacity = 96;
  return state;
}
function arrived(state, id) {
  assert.equal(act(state, { type: 'assign', building: id, delta: 1 }).ok, true);
  state.residents.find(person => person.workplace === id).arrivalRemaining = 0;
}
const reload = state => normalizeState(JSON.parse(JSON.stringify(state)), state.worldTimeMs);
function construction(state, amount) {
  state.resources.wood = 500;
  state.buildings.house.level = 1;
  const zero = Object.fromEntries(MATERIALS.map(id => [id, 0]));
  const project = { building: 'house', targetLevel: 2, cost: { wood: amount }, goodsTotal: amount, goodsRemaining: amount,
    remainingMaterials: { ...zero, wood: amount }, delivered: { ...zero }, reservedMaterials: { ...zero, wood: amount },
    reservedCoins: 0, reservationVersion: 9, stage: 'transport', order: 1, transportSeconds: 0, buildRemaining: 0 };
  state.constructionProjects = [project]; state.constructionSequence = 1;
  return project;
}

test('all five producers use doubled level rates while normal starter resources stay unchanged', () => {
  const state = island();
  assert.deepEqual(Object.values(state.resources), [100000, 100, 100, 100, 100, 100]);
  for (const id of ['farm', 'windmill', 'quarry', 'lumber', 'sawmill']) {
    for (const [level, expected] of [[0, 0], [1, 20], [2, 24], [3, 26], [4, 28], [100, 220]]) {
      state.buildings[id].level = level;
      assert.equal(productionRate(state, id), expected, `${id}, level ${level}`);
    }
  }
});

test('raw and processed goods actually produce twenty units per hour and recipes still consume two inputs', () => {
  const state = island();
  for (const id of ['farm', 'windmill', 'quarry', 'lumber', 'sawmill']) arrived(state, id);
  tick(state, 3600);
  for (const id of ['farm', 'windmill', 'quarry', 'lumber', 'sawmill']) assert.equal(state.buildings[id].ready, 20, id);
  assert.equal(state.resources.wood, 60); assert.equal(state.resources.grain, 60);
  near(state.resources.food + state.foodCredit, 88);
  near(state.statistics.taxCollected + state.taxProgress, 5);
});

test('hunger halves the doubled production, while taxes and meal demand keep their own rates', () => {
  const state = island(); arrived(state, 'farm');
  state.resources.food = 0; state.foodCredit = 0;
  assert.equal(resourceRates(state).grain.production, 10);
  assert.equal(resourceRates(state).food.consumption, 12);
  assert.equal(taxRate(state), 1);
  tick(state, 3600);
  assert.equal(state.buildings.farm.ready, 10);
  near(state.statistics.taxCollected + state.taxProgress, 1);
});

test('active play and lighthouse bonuses multiply the new base instead of replacing it', () => {
  const state = island(); arrived(state, 'farm');
  state.lighthouseRemaining = 1000;
  act(state, { type: 'userActivity', visible: true, focused: true });
  assert.equal(resourceRates(state).grain.production, 80);
  assert.equal(resourceRates(state).food.consumption, 12);
  tick(state, 180);
  assert.equal(state.buildings.farm.ready, 4);
  near(state.taxProgress, 360 / 3600);
});

test('all carrier workplaces have doubled base loads and retain level and road load bonuses', () => {
  const state = island();
  for (const id of ['warehouse', 'market', 'dock']) {
    assert.equal(haulCapacity(state, id), 120);
    state.buildings[id].level = 2;
    assert.equal(haulCapacity(state, id), 132);
  }
  state.roads.segments.fill(3);
  for (const id of ['warehouse', 'market', 'dock']) assert.equal(haulCapacity(state, id), 145);
});

test('a full warehouse pickup carries120 goods and still arrives after300 seconds', () => {
  const state = island(); arrived(state, 'warehouse'); state.buildings.lumber.ready = 200;
  advanceLogistics(state, 299);
  assert.equal(state.haulTrips.warehouse[0].amount, 120);
  near(state.haulTrips.warehouse[0].remaining, 1);
  assert.equal(state.resources.wood, 100);
  advanceLogistics(state, 1);
  assert.equal(state.resources.wood, 220);
});

test('hunger keeps the old slower carrier clock while the new doubled load remains120', () => {
  const state = island(); arrived(state, 'warehouse'); state.buildings.lumber.ready = 200;
  state.resources.food = 0; state.foodCredit = 0;
  advanceLogistics(state, 599);
  assert.equal(state.haulTrips.warehouse[0].amount, 120);
  near(state.haulTrips.warehouse[0].remaining, 0.5);
  assert.equal(state.resources.wood, 100);
  advanceLogistics(state, 1);
  assert.equal(state.resources.wood, 220);
});

test('market arrivals and returns use the same120-item load without shortening their clocks', () => {
  for (const direction of ['inbound', 'outbound']) {
    const state = island(); arrived(state, 'market'); state.resources.wood = 400;
    if (direction === 'inbound') state.market.orders = [{ resource: 'wood', amount: 200 }];
    else {
      state.market.stock.wood = state.market.dispatch.wood = 200;
      state.market.lots = [{ resource: 'wood', amount: 200, remaining: 86400 }];
    }
    nextLogisticsEvent(state);
    const trip = state.haulTrips.market[0];
    assert.equal(trip.kind, direction === 'inbound' ? 'marketInbound' : 'marketOutbound');
    assert.equal(trip.amount, 120); assert.equal(trip.remaining, 300);
  }
});

test('all four Harbor stages use120 goods per course and retain300-second course clocks', () => {
  for (const kind of ['dockInbound', 'dockLoad', 'dockUnload', 'dockOutbound']) {
    const state = island(); arrived(state, 'dock'); state.resources.wood = 400;
    const direction = ['dockInbound', 'dockLoad'].includes(kind) ? 'sell' : 'buy';
    assert.equal(act(state, { type: 'trade', direction, resource: 'wood', amount: 200 }).ok, true);
    const order = state.dock.orders[0];
    if (kind === 'dockUnload') { order.stage = 'unloading'; order.remaining = 0; order.expiresRemaining = 86400; }
    if (['dockLoad', 'dockOutbound'].includes(kind)) {
      order.stage = kind === 'dockLoad' ? 'loading' : 'collecting';
      order.remainingToPort = 0; order.remainingToUnload = 0;
      state.dock.stock.wood = 200;
      state.dock.lots = [{ resource: 'wood', amount: 200, remaining: 86400, orderId: order.id, direction }];
    }
    nextLogisticsEvent(state);
    const trip = state.haulTrips.dock[0];
    assert.equal(trip.kind, kind); assert.equal(trip.amount, 120); assert.equal(trip.remaining, 300);
  }
});

test('construction ETA and paid transport count120-item courses including the final partial one', () => {
  const state = island(); arrived(state, 'warehouse');
  const project = construction(state, 241);
  const estimate = constructionEstimate(state, project);
  assert.equal(estimate.trips, 3); assert.equal(estimate.transport, 900); assert.equal(estimate.building, 900);
  const premium = quoteTransport(state, { route: 'construction', project: project.order });
  assert.equal(premium.ok, true); assert.equal(premium.capacity, 120); assert.equal(premium.trips, 3); assert.equal(premium.coins, 30);
  nextLogisticsEvent(state);
  assert.equal(state.haulTrips.warehouse[0].amount, 120);
  assert.equal(state.haulTrips.warehouse[0].remaining, 300);
});

test('a three-quarter legacy unit migrates to three quarters of the new cycle exactly once', () => {
  const state = island(); arrived(state, 'farm');
  const old = JSON.parse(JSON.stringify(state));
  delete old.productionRateVersion;
  old.buildings.farm.workProgress[0] = 270;
  const migrated = normalizeState(old, NOW);
  assert.equal(migrated.productionRateVersion, 2);
  assert.equal(migrated.buildings.farm.workProgress[0], 135);
  assert.equal(migrated.buildings.farm.ready, 0);
  const twice = reload(migrated);
  assert.equal(twice.buildings.farm.workProgress[0], 135);
  tick(twice, 44); assert.equal(twice.buildings.farm.ready, 0);
  tick(twice, 1); assert.equal(twice.buildings.farm.ready, 1);
});

test('new production progress survives reload and in-flight legacy cargo is never doubled', () => {
  const state = island(); arrived(state, 'farm'); arrived(state, 'warehouse');
  state.buildings.farm.workProgress[0] = 90;
  state.haulTrips.warehouse = [{ worker: 0, residentId: state.residents.find(person => person.workplace === 'warehouse').id,
    kind: 'producer', producer: 'lumber', resource: 'wood', amount: 60, remaining: 120 }];
  const restored = reload(state);
  assert.equal(restored.buildings.farm.workProgress[0], 90);
  assert.equal(restored.haulTrips.warehouse[0].amount, 60);
  assert.equal(restored.haulTrips.warehouse[0].remaining, 120);
  tick(restored, 120);
  assert.equal(restored.resources.wood, 160);
});

test('migrating a legacy carrier preserves its cargo quantity, trip clock and nonproduction progress', () => {
  const state = island(); arrived(state, 'warehouse');
  delete state.productionRateVersion;
  state.buildings.warehouse.workProgress[0] = 180;
  state.haulTrips.warehouse = [{ worker: 0, residentId: state.residents.find(person => person.workplace === 'warehouse').id,
    kind: 'producer', producer: 'lumber', resource: 'wood', amount: 60, remaining: 90 }];
  const migrated = reload(state);
  assert.equal(migrated.buildings.warehouse.workProgress[0], 180);
  assert.equal(migrated.haulTrips.warehouse[0].amount, 60);
  assert.equal(migrated.haulTrips.warehouse[0].remaining, 90);
  const twice = reload(migrated);
  tick(twice, 90);
  assert.equal(twice.resources.wood, 160);
  assert.equal(twice.haulTrips.warehouse.length, 0);
});

test('whole, split and reloaded offline intervals preserve goods and recipe accounting at the new rates', () => {
  const whole = island(); arrived(whole, 'farm'); arrived(whole, 'windmill');
  const split = reload(whole);
  tick(whole, 1800);
  tick(split, 700); const restored = reload(split); tick(restored, 1100);
  for (const id of MATERIALS) near(restored.resources[id], whole.resources[id]);
  near(restored.foodCredit, whole.foodCredit);
  for (const id of ['farm', 'windmill']) {
    assert.equal(restored.buildings[id].ready, whole.buildings[id].ready);
    near(restored.buildings[id].workProgress[0], whole.buildings[id].workProgress[0]);
  }
});

test('new task requirements are feasible and existing legacy requirements stay frozen on reload', () => {
  const state = createState(NOW);
  for (const task of state.lighthouseTasks) {
    assert.equal(taskStatus(state, task).feasible, true);
    for (const [resource, amount] of Object.entries(task.requirements)) {
      assert.ok(amount > 0 && amount <= availableGoods(state, resource));
    }
  }
  // A legacy offer may exceed today's feasible budget. Normalization preserves
  // its snapshot; only a new acceptance must pass the current feasibility gate.
  state.lighthouseTasks[0].requirements = { wood: 4000, stone: 3000 };
  const expected = JSON.stringify(state.lighthouseTasks.map(task => task.requirements));
  assert.equal(JSON.stringify(reload(state).lighthouseTasks.map(task => task.requirements)), expected);
});
