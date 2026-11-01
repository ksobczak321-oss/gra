import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, tick } from '../harborlight-v1-state.js';
import { haulCapacity, transportEfficiency, warehouseCarrierJobs, constructionScheduleEstimate } from '../harborlight-v1-logistics.js';
import { roadSummary } from '../harborlight-v1-leisure.js';

const NOW = Date.UTC(2026, 9, 23, 12);
const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
function island(tier = 0) {
  const state = createState(NOW);
  state.buildings.townhall.level = state.buildings.house.level = 4;
  state.resources = { coins: 10000, wood: 600, stone: 600, grain: 600, food: 600, planks: 600 };
  state.roads.segments.fill(tier);
  return state;
}
function crew(state, id, count = 1) {
  const people = state.residents.filter(person => !person.workplace).slice(0, count);
  assert.equal(people.length, count);
  for (const person of people) {
    person.workplace = id; person.arrivalRemaining = 0; person.returnRemaining = 0;
  }
  state.buildings[id].workers = count;
  state.buildings[id].workProgress = Array(count).fill(0);
}

test('road capacity adds its tier factor after the workplace base capacity is rounded', () => {
  for (const tier of [0, 1, 2, 3, 4, 5]) for (const level of [1, 2, 3, 4]) {
    const state = island(tier);
    const factor = 1 + .1 * Math.max(0, tier - 2);
    for (const id of ['warehouse', 'market', 'dock']) {
      state.buildings[id].level = level;
      const base = Math.floor(120 * 1.1 ** (level - 1));
      assert.equal(haulCapacity(state, id), Math.floor(base * factor));
    }
    near(transportEfficiency(state), 1 + .1 * tier);
  }
});

test('a completed road tier changes actual warehouse arrival time, not only the displayed estimate', () => {
  for (const tier of [0, 1, 3, 5]) {
    const state = island(tier);
    crew(state, 'warehouse'); state.buildings.lumber.ready = 200;
    const load = haulCapacity(state), expected = 300 / (1 + .1 * tier);
    tick(state, expected - .001);
    assert.equal(state.resources.wood, 600);
    near(warehouseCarrierJobs(state)[0].remaining, .001);
    tick(state, .001);
    assert.equal(state.resources.wood, 600 + load);
    assert.equal(state.statistics.collected, load);
  }
});

test('food shortage halves hauling efficiency in addition to the completed road speed factor', () => {
  const state = island(3);
  crew(state, 'warehouse'); state.buildings.lumber.ready = 150;
  state.resources.food = 0; state.foodCredit = 0;
  near(transportEfficiency(state), .5 * 1.3);
  const arrival = 300 / (.5 * 1.3);
  tick(state, arrival - .001);
  assert.equal(state.resources.wood, 600);
  tick(state, .001);
  assert.equal(state.resources.wood, 732);
});

test('upgrading the final path speeds up an already loaded trip without changing its cargo or duplicating goods', () => {
  const state = island();
  crew(state, 'warehouse'); state.buildings.lumber.ready = 150;
  tick(state, 100);
  const cargo = state.haulTrips.warehouse[0].amount;
  state.roads.segments.fill(1); state.roads.segments[99] = 0;
  const stone = state.resources.stone;
  assert.equal(act(state, { type: 'upgradeRoad', level: 1 }, NOW).ok, true);
  assert.equal(state.resources.stone, stone - 100);
  assert.equal(roadSummary(state).level, 1);
  assert.equal(state.haulTrips.warehouse[0].amount, cargo);
  near(warehouseCarrierJobs(state)[0].remaining, 200 / 1.1);
  tick(state, 200 / 1.1);
  assert.equal(state.resources.wood, 600 + cargo);
  assert.equal(state.statistics.collected, cargo);
});

test('road speed does not shorten the two-minute walk or accelerate production', () => {
  const state = island(5);
  assert.equal(act(state, { type: 'assign', building: 'farm', delta: 1 }, NOW).ok, true);
  tick(state, 119);
  near(state.residents.find(person => person.workplace === 'farm').arrivalRemaining, 1);
  assert.equal(state.buildings.farm.ready, 0);
  tick(state, 1);
  near(state.residents.find(person => person.workplace === 'farm').arrivalRemaining, 0);
  tick(state, 179);
  assert.equal(state.buildings.farm.ready, 0);
  tick(state, 1);
  assert.equal(state.buildings.farm.ready, 1);
});

test('Harbor sea voyages stay five minutes while its cargo carriers receive road speed and capacity', () => {
  const state = island(5);
  crew(state, 'dock');
  assert.equal(act(state, { type: 'trade', direction: 'buy', resource: 'wood', amount: 200 }, NOW).ok, true);
  tick(state, 299);
  assert.equal(state.dock.orders[0].stage, 'voyage');
  near(state.dock.orders[0].remaining, 1);
  assert.equal(state.dock.stock.wood, 0);
  tick(state, 1);
  assert.equal(state.dock.orders[0].stage, 'unloading');
  tick(state, 199.999);
  assert.equal(state.dock.stock.wood, 0);
  tick(state, .001);
  assert.equal(state.dock.stock.wood, 156);
});

test('scheduled construction ETA agrees with actual road-accelerated transport and building phases', () => {
  const state = island(3);
  crew(state, 'warehouse');
  const project = { building: 'farm', targetLevel: 2, cost: { wood: 66 }, goodsTotal: 66, goodsRemaining: 66,
    remainingMaterials: { wood: 66, stone: 0, grain: 0, food: 0, planks: 0 },
    delivered: { wood: 0, stone: 0, grain: 0, food: 0, planks: 0 },
    transportSeconds: 0, buildRemaining: 0, stage: 'transport', order: 1 };
  state.constructionProjects = [project]; state.constructionSequence = 1;
  const before = JSON.stringify(state), eta = constructionScheduleEstimate(state, project);
  near(eta.transport, 300 / 1.3);
  near(eta.building, 300 / 1.3);
  near(eta.total, 600 / 1.3);
  assert.equal(JSON.stringify(state), before);
  tick(state, eta.transport);
  assert.equal(project.stage, 'building');
  near(project.buildRemaining, eta.building);
  tick(state, eta.building);
  assert.equal(state.buildings.farm.level, 2);
  assert.equal(state.constructionProjects.length, 0);
});

test('road transport, loaded cargo and fractional ETA survive reload and split simulation', () => {
  const whole = island(4);
  crew(whole, 'warehouse'); whole.buildings.lumber.ready = 150;
  tick(whole, 73.25);
  const split = normalizeState(JSON.parse(JSON.stringify(whole)), whole.lastSimulatedAt);
  near(warehouseCarrierJobs(whole)[0].remaining, warehouseCarrierJobs(split)[0].remaining);
  tick(whole, 600);
  for (let index = 0; index < 120; index++) tick(split, 5);
  assert.deepEqual(whole.resources, split.resources);
  assert.deepEqual(whole.haulTrips, split.haulTrips);
  assert.deepEqual(whole.roads, split.roads);
  near(whole.happiness, split.happiness);
});
