import test from 'node:test';
import { estimateMaterialsSeconds } from '../harborlight-v1-logistics.js';
import assert from 'node:assert/strict';
import {
  createState, normalizeState, tick, act, foodDemandPerHour,
  hasFoodForResidents, hungerPenaltyPerHour, updateHappiness
} from '../harborlight-v1-state.js';

const close = (actual, expected, tolerance = 1e-7) => {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
};

function island({ population = 12, happiness = 0, food = 100 } = {}) {
  const state = createState();
  state.buildings.townhall.level = 4;
  state.buildings.house.level = 4;
  state.capacity = 96;
  state.population = population;
  state.baseHappiness = happiness;
  state.happiness = happiness;
  state.resources.food = food;
  for (const building of Object.values(state.buildings)) {
    building.workers = 0;
    building.workProgress = [];
  }
  return state;
}

function worker(state, id, count = 1) {
  state.buildings[id].workers = count;
  state.buildings[id].workProgress = Array(count).fill(0);
}

function reload(state) {
  return normalizeState(JSON.parse(JSON.stringify(state)));
}

test('each resident consumes one food per active hour, independently of clock speed', () => {
  for (const speed of [1, 2, 4]) {
    const state = island();
    state.speed = speed;
    assert.equal(foodDemandPerHour(state), 12);
    tick(state, 3600);
    assert.equal(state.resources.food, 88);
    close(state.foodCredit, 0);
    assert.equal(state.happiness, 0);
    assert.equal(hungerPenaltyPerHour(state), 0);
  }
});

test('meals reserve whole warehouse units but preserve fractional consumption', () => {
  const state = island();
  tick(state, 137);
  assert.equal(state.resources.food, 99);
  close(state.foodCredit, 1 - 12 * 137 / 3600);
  let saved = reload(state);
  close(saved.foodCredit, state.foodCredit);
  tick(saved, 163);
  assert.equal(saved.resources.food, 99);
  close(saved.foodCredit, 0);
  tick(saved, 3300);
  assert.equal(saved.resources.food, 88);
  close(saved.foodCredit, 0);
});

test('the last allocated meal provides food even when central stock is empty', () => {
  const state = island({ food: 1 });
  tick(state, 1);
  assert.equal(state.resources.food, 0);
  assert.equal(hasFoodForResidents(state), true);
  assert.equal(hungerPenaltyPerHour(state), 0);
  tick(state, 299);
  assert.equal(state.resources.food, 0);
  close(state.foodCredit, 0);
  assert.equal(hasFoodForResidents(state), false);
  assert.equal(hungerPenaltyPerHour(state), 25);
  assert.equal(state.happiness, 0);
});

test('no extra food is fetched at the exact end of the interval', () => {
  const state = island({ food: 2 });
  tick(state, 300);
  assert.equal(state.resources.food, 1);
  close(state.foodCredit, 0);
  tick(state, 300);
  assert.equal(state.resources.food, 0);
  close(state.foodCredit, 0);
  assert.equal(state.happiness, 0);
});

test('food shortage lowers global happiness by 25 points per hour, not per resident', () => {
  for (const population of [6, 12, 72]) {
    const state = island({ population, food: 0 });
    tick(state, 3600);
    close(state.baseHappiness, -25);
    close(state.happiness, -25);
    assert.equal(state.population, population);
    assert.equal(state.resources.food, 0);
  }
});

test('shortage starts exactly when the available food is exhausted', () => {
  const state = island({ food: 2 });
  tick(state, 4200);
  close(state.happiness, -25);
  assert.equal(state.resources.food, 0);
  close(state.foodCredit, 0);
});

test('new warehouse food stops future hunger loss without refunding happiness', () => {
  const state = island({ food: 0 });
  tick(state, 3600);
  close(state.happiness, -25);
  state.resources.food = 1;
  assert.equal(hasFoodForResidents(state), true);
  tick(state, 300);
  close(state.happiness, -25);
  tick(state, 60);
  close(state.happiness, -25 - 25 / 60);
});

test('local mill output, market goods and pending deliveries do not feed residents', () => {
  const state = island({ food: 0 });
  state.buildings.windmill.ready = 100;
  state.market.stock.food = 100;
  state.pendingDeliveries.food = 100;
  tick(state, 3600);
  close(state.happiness, -25);
  assert.equal(state.resources.food, 0);
  assert.equal(state.buildings.windmill.ready, 100);
  assert.equal(state.market.stock.food, 100);
  assert.equal(state.pendingDeliveries.food, 100);
});

test('a warehouse arrival during a long tick immediately ends hunger until its meal is used', () => {
  const state = island({ food: 0 });
  worker(state, 'warehouse');
  state.buildings.windmill.ready = 1;
  tick(state, 360);
  close(state.happiness, -25 / 60);
  assert.equal(state.resources.food, 0);
  close(state.foodCredit, 0);
  tick(state, 1);
  close(state.happiness, -25 * 61 / 3600);
});

test('an arrival at the end is available but not prefetched until active time resumes', () => {
  const state = island({ food: 0 });
  worker(state, 'warehouse');
  state.buildings.warehouse.workProgress = [59];
  state.buildings.windmill.ready = 1;
  tick(state, 1);
  assert.equal(state.resources.food, 1);
  close(state.foodCredit, 0);
  close(state.happiness, -25 / 3600);
  assert.equal(hungerPenaltyPerHour(state), 0);
  tick(state, 1);
  assert.equal(state.resources.food, 0);
  close(state.foodCredit, 1 - 12 / 3600);
  close(state.happiness, -25 / 3600);
});

test('births and population loss change consumption at their actual event time', () => {
  const growing = island({ happiness: 100 });
  tick(growing, 7200);
  assert.equal(growing.population, 14);
  assert.equal(growing.resources.food, 100 - 12 - 13);
  close(growing.foodCredit, 0);

  const shrinking = island({ happiness: -100 });
  tick(shrinking, 7200);
  assert.equal(shrinking.population, 10);
  assert.equal(shrinking.resources.food, 100 - 12 - 11);
  close(shrinking.foodCredit, 0);
});

test('hunger and housing penalties add while preserving individual happiness bounds', () => {
  const state = island({ population: 78, food: 0 });
  state.buildings.house.level = 3;
  tick(state, 3600);
  close(state.baseHappiness, -31);
  close(state.happiness, -31);
  tick(state, 100 * 3600);
  assert.equal(state.happiness, -100);
  assert.equal(state.population, 6);
});

test('pause and save do not eat meals or age hunger outside active ticks', () => {
  let state = island({ food: 1 });
  tick(state, 100);
  state.paused = true;
  const before = JSON.stringify(state);
  tick(state, 10 * 3600);
  assert.equal(JSON.stringify(state), before);
  state = reload(state);
  close(state.foodCredit, 2 / 3);
  assert.equal(state.resources.food, 0);
  assert.equal(state.happiness, 0);
});

test('food already allocated to residents cannot pay for construction again', () => {
  const state = island({ food: 500 });
  state.buildings.house.level = 1;
  for (const resource of Object.keys(state.resources)) state.resources[resource] = 500;
  tick(state, 1);
  assert.equal(state.resources.food, 499);
  const before = JSON.stringify(state);
  assert.equal(act(state, { type: 'upgrade', building: 'house' }).ok, false);
  assert.equal(JSON.stringify(state), before);
  assert.equal(state.constructionProjects.length, 0);
  assert.equal(hasFoodForResidents(state), true);
});

test('old saves start with no reserved meal and invalid saved fractions remain bounded', () => {
  const old = island();
  delete old.foodCredit;
  assert.equal(reload(old).foodCredit, 0);
  for (const invalid of [-1, NaN, Infinity, '0.5']) {
    const state = normalizeState({ ...old, foodCredit: invalid });
    assert.equal(state.foodCredit, 0);
    assert.equal(state.resources.food, old.resources.food);
  }
  assert.equal(normalizeState({ ...old, foodCredit: 5 }).foodCredit, 1);
});

test('whole and split ticks agree across real deliveries, feeding and hunger', () => {
  const whole = island({ happiness: 20, food: 2 });
  worker(whole, 'warehouse');
  whole.pendingDeliveries.food = 2;
  whole.buildings.windmill.ready = 3;
  const split = reload(whole);
  tick(whole, 7200);
  for (let i = 0; i < 7200; i++) tick(split, 1);
  assert.deepEqual(whole.resources, split.resources);
  assert.equal(whole.population, split.population);
  close(whole.foodCredit, split.foodCredit);
  close(whole.happiness, split.happiness);
  close(whole.baseHappiness, 20 - 25 * 5100 / 3600);
  close(whole.populationProgress, split.populationProgress);
});

test('meal horizons do not leave expired bonuses active through floating point residue', () => {
  const state = island();
  state.buildings.chapel.level = 2;
  state.chapelRemaining = 3600;
  state.blessingRemaining = 3600;
  state.lighthouseRemaining = 3600;
  updateHappiness(state);
  assert.equal(state.happiness, 100);
  tick(state, 180);
  tick(state, 3420);
  assert.equal(state.chapelRemaining, 0);
  assert.equal(state.blessingRemaining, 0);
  assert.equal(state.lighthouseRemaining, 0);
  assert.equal(state.happiness, 0);
});

test('Food delivery plans account for the food residents consume before stock can accumulate', () => {
  const state = island({ food: 0 });
  worker(state, 'windmill', 1);
  worker(state, 'warehouse', 1);
  assert.equal(estimateMaterialsSeconds(state, { food: 120 }), Infinity);
  worker(state, 'windmill', 2);
  worker(state, 'farm', 3);
  close(estimateMaterialsSeconds(state, { food: 16 }), 7200);
});
