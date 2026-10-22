import test from 'node:test';
import { estimateMaterialsSeconds, updateStorageStatus } from '../harborlight-v1-logistics.js';
import assert from 'node:assert/strict';
import {
  createState, normalizeState, tick, act, foodDemandPerHour,
  hasFoodForResidents, hungerPenaltyPerHour, updateHappiness,
  synchronizeResidents
} from '../harborlight-v1-state.js';

const HOUR = 3600;
const GRACE = 12 * HOUR;
const close = (actual, expected, tolerance = 1e-7) => {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
};

function island({ population = 12, happiness = 0, food = 100 } = {}) {
  const raw = createState();
  raw.version = 6;
  delete raw.residents;
  raw.buildings.townhall.level = 4;
  raw.buildings.house.level = 4;
  raw.capacity = 96;
  raw.population = population;
  raw.baseHappiness = happiness;
  raw.happiness = happiness;
  raw.resources.food = food;
  for (const building of Object.values(raw.buildings)) {
    building.workers = 0;
    building.workProgress = [];
  }
  return normalizeState(raw);
}

function worker(state, id, count = 1) {
  synchronizeResidents(state);
  const delta = count - state.buildings[id].workers;
  if (delta) assert.equal(act(state, { type: 'assign', building: id, delta }).ok, true);
}

function reload(state) {
  return normalizeState(JSON.parse(JSON.stringify(state)));
}

function person(state, id) {
  return state.residents.find(resident => resident.id === id);
}

function matureHunger(state) {
  for (const resident of state.residents) resident.hungerSeconds = GRACE;
}

test('each resident consumes one food per active hour, independently of clock speed', () => {
  for (const speed of [1, 2, 4]) {
    const state = island();
    state.speed = speed;
    assert.equal(foodDemandPerHour(state), 12);
    tick(state, HOUR);
    assert.equal(state.resources.food, 88);
    close(state.foodCredit, 0);
    close(state.happiness, 1);
    assert.ok(state.residents.every(resident => Math.abs(resident.happiness - 1) < 1e-7));
    assert.equal(hungerPenaltyPerHour(state), 0);
  }
});

test('meals reserve whole warehouse units but preserve fractional consumption through reload', () => {
  const state = island();
  tick(state, 137);
  assert.equal(state.resources.food, 99);
  close(state.foodCredit, 1 - 12 * 137 / HOUR);
  const saved = reload(state);
  close(saved.foodCredit, state.foodCredit);
  tick(saved, 163);
  assert.equal(saved.resources.food, 99);
  close(saved.foodCredit, 0);
  tick(saved, 3300);
  assert.equal(saved.resources.food, 88);
  close(saved.foodCredit, 0);
  close(saved.happiness, 1);
});

test('the last allocated meal feeds residents until its exact exhaustion boundary', () => {
  const state = island({ food: 1 });
  tick(state, 1);
  assert.equal(state.resources.food, 0);
  assert.equal(hasFoodForResidents(state), true);
  assert.equal(hungerPenaltyPerHour(state), 0);
  tick(state, 299);
  close(state.foodCredit, 0);
  assert.equal(hasFoodForResidents(state), false);
  assert.equal(hungerPenaltyPerHour(state), 0);
  close(state.happiness, 300 / HOUR);
});

test('no extra food is fetched at the exact end of an interval', () => {
  const state = island({ food: 2 });
  tick(state, 300);
  assert.equal(state.resources.food, 1);
  close(state.foodCredit, 0);
  tick(state, 300);
  assert.equal(state.resources.food, 0);
  close(state.foodCredit, 0);
  close(state.happiness, 600 / HOUR);
});

test('the hunger grace lasts twelve continuous hours and is not charged retrospectively', () => {
  const state = island({ population: 6, food: 0 });
  // Work keeps unemployment from contributing to the hunger threshold test.
  worker(state, 'dock', 3);
  worker(state, 'market', 3);
  const id = state.residents.find(resident => resident.workplace === 'dock').id;
  tick(state, GRACE - 1);
  close(person(state, id).happiness, 12 - 1 / HOUR);
  assert.equal(hungerPenaltyPerHour(state), 0);
  tick(state, 1);
  close(person(state, id).happiness, 12);
  assert.equal(hungerPenaltyPerHour(state), 5);
  tick(state, HOUR);
  close(person(state, id).happiness, 8);
});

test('hunger penalties are individual and their population mean is not multiplied by headcount', () => {
  for (const population of [6, 12, 72]) {
    const state = island({ population, food: 0 });
    matureHunger(state);
    tick(state, HOUR);
    close(state.happiness, -5);
    assert.ok(state.residents.every(resident => Math.abs(resident.happiness + 5) < 1e-7));
    assert.equal(state.population, population);
  }
});

test('hunger starts only after central meals are exhausted', () => {
  const state = island({ food: 2 });
  tick(state, 4200);
  close(state.happiness, 600 / HOUR);
  assert.equal(state.resources.food, 0);
  for (const resident of state.residents) close(resident.hungerSeconds, HOUR);
});

test('a central food delivery resets each hunger timer and starts earning food happiness again', () => {
  const state = island({ population: 6, food: 0 });
  matureHunger(state);
  tick(state, HOUR);
  close(state.happiness, -5);
  state.resources.food = 1;
  tick(state, 600);
  close(state.happiness, -5 + 600 / HOUR);
  assert.ok(state.residents.every(resident => resident.hungerSeconds === 0));
  tick(state, HOUR);
  close(state.happiness, -5 + 600 / HOUR);
  assert.ok(state.residents.every(resident => Math.abs(resident.hungerSeconds - HOUR) < 1e-7));
});

test('local mill output, market goods and pending deliveries do not feed residents', () => {
  const state = island({ food: 0 });
  matureHunger(state);
  state.buildings.windmill.ready = 100;
  state.market.stock.food = 100;
  state.pendingDeliveries.food = 100;
  tick(state, HOUR);
  close(state.happiness, -5);
  assert.equal(state.resources.food, 0);
  assert.equal(state.buildings.windmill.ready, 100);
  assert.equal(state.market.stock.food, 100);
  assert.equal(state.pendingDeliveries.food, 100);
});

test('a hungry warehouse worker takes two minutes to deliver food and its arrival ends mature hunger', () => {
  const state = island({ food: 0 });
  matureHunger(state);
  worker(state, 'warehouse');
  state.buildings.windmill.ready = 1;
  const id = state.residents.find(resident => resident.workplace === 'warehouse').id;
  tick(state, 420);
  assert.equal(state.resources.food, 0);
  close(state.foodCredit, 0);
  close(person(state, id).happiness, (-4 * 120 + 2 * 300) / HOUR);
  tick(state, 1);
  close(person(state, id).happiness, (-4 * 120 + 2 * 300 + 1) / HOUR);
});

test('an arrival at interval end is available but is not prefetched until active time resumes', () => {
  const state = island({ food: 0 });
  matureHunger(state);
  worker(state, 'warehouse');
  state.buildings.warehouse.workProgress = [59.5];
  state.buildings.windmill.ready = 1;
  tick(state, 1);
  assert.equal(state.resources.food, 1);
  close(state.foodCredit, 0);
  const before = state.residents.map(resident => resident.happiness);
  assert.equal(hungerPenaltyPerHour(state), 0);
  tick(state, 1);
  assert.equal(state.resources.food, 0);
  close(state.foodCredit, 1 - 12 / HOUR);
  state.residents.forEach((resident, index) => close(resident.happiness, before[index] + (resident.workplace ? 2 : 1) / HOUR));
});

test('birth and departure events change meal demand at their exact time', () => {
  const growing = island({ happiness: 100 });
  growing.lighthouseRemaining = 3 * HOUR;
  tick(growing, 2 * HOUR);
  assert.equal(growing.population, 14);
  assert.equal(growing.resources.food, 100 - 12 - 13);
  close(growing.foodCredit, 0);
  const shrinking = island({ happiness: -100 });
  // Overcrowding offsets feeding recovery, keeping the loss rate at its clamp.
  shrinking.buildings.house.level = 0;
  tick(shrinking, 2 * HOUR);
  assert.equal(shrinking.population, 10);
  assert.equal(shrinking.resources.food, 100 - 12 - 11);
  close(shrinking.foodCredit, 0);
});

test('housing and mature hunger penalties add for each individual, then the mean is computed', () => {
  const state = island({ population: 78, food: 0 });
  state.buildings.house.level = 3;
  matureHunger(state);
  tick(state, HOUR);
  close(state.happiness, -11);
  assert.ok(state.residents.every(resident => Math.abs(resident.happiness + 11) < 1e-7));
  tick(state, 100 * HOUR);
  assert.equal(state.population, 6);
  assert.equal(state.happiness, -100);
});

test('pause and save preserve personal happiness, meal credit and lack timers without offline aging', () => {
  let state = island({ food: 1 });
  tick(state, 100);
  state.paused = true;
  const before = JSON.stringify(state);
  tick(state, 10 * HOUR);
  assert.equal(JSON.stringify(state), before);
  state = reload(state);
  close(state.foodCredit, 2 / 3);
  assert.equal(state.resources.food, 0);
  close(state.happiness, 100 / HOUR);
  assert.ok(state.residents.every(resident => Math.abs(resident.unemployedSeconds - 100) < 1e-7));
});

test('food allocated to residents cannot pay for construction again', () => {
  const state = island({ food: 500 });
  state.buildings.house.level = 1;
  for (const resource of Object.keys(state.resources)) state.resources[resource] = 500;
  tick(state, 1);
  assert.equal(state.resources.food, 499);
  const before = JSON.stringify(state);
  assert.equal(act(state, { type: 'upgrade', building: 'house' }).ok, false);
  assert.equal(JSON.stringify(state), before);
  assert.equal(state.constructionProjects.length, 0);
});

test('legacy saves preserve stock and initialize meals and individual timers safely', () => {
  const old = island({ happiness: 37 });
  old.version = 6;
  delete old.residents;
  delete old.foodCredit;
  const migrated = reload(old);
  assert.equal(migrated.version, 7);
  assert.equal(migrated.foodCredit, 0);
  assert.equal(migrated.resources.food, old.resources.food);
  assert.equal(migrated.residents.length, old.population);
  assert.ok(migrated.residents.every(resident => resident.happiness === 37 && resident.hungerSeconds === 0 && resident.unemployedSeconds === 0));
  for (const invalid of [-1, NaN, Infinity, '0.5']) {
    const state = normalizeState({ ...old, foodCredit: invalid });
    assert.equal(state.foodCredit, 0);
    assert.equal(state.resources.food, old.resources.food);
  }
  assert.equal(normalizeState({ ...old, foodCredit: 5 }).foodCredit, 1);
});

test('whole and split ticks agree across deliveries, feeding, personal timers and demographic progress', () => {
  const whole = island({ happiness: 20, food: 2 });
  matureHunger(whole);
  worker(whole, 'warehouse');
  whole.pendingDeliveries.food = 2;
  whole.buildings.windmill.ready = 3;
  const split = reload(whole);
  tick(whole, 2 * HOUR);
  for (let i = 0; i < 2 * HOUR; i++) tick(split, 1);
  assert.deepEqual(whole.resources, split.resources);
  assert.equal(whole.population, split.population);
  close(whole.foodCredit, split.foodCredit);
  close(whole.happiness, split.happiness);
  close(whole.populationProgress, split.populationProgress);
  whole.residents.forEach(resident => {
    const other = person(split, resident.id);
    close(resident.happiness, other.happiness);
    close(resident.hungerSeconds, other.hungerSeconds);
    close(resident.unemployedSeconds, other.unemployedSeconds);
  });
});

test('meal horizons fully expire temporary bonuses despite fractional event intervals', () => {
  const state = island();
  state.buildings.chapel.level = 2;
  state.chapelRemaining = HOUR;
  state.blessingRemaining = HOUR;
  state.lighthouseRemaining = HOUR;
  updateHappiness(state);
  assert.equal(state.happiness, 100);
  tick(state, 180);
  tick(state, 3420);
  assert.equal(state.chapelRemaining, 0);
  assert.equal(state.blessingRemaining, 0);
  assert.equal(state.lighthouseRemaining, 0);
  assert.equal(state.population, 13);
  close(state.happiness, 12 / 13);
});

test('Food delivery plans subtract resident demand from prospective output', () => {
  const state = island({ food: 0 });
  worker(state, 'windmill', 1);
  worker(state, 'warehouse', 1);
  assert.equal(estimateMaterialsSeconds(state, { food: 120 }), Infinity);
  worker(state, 'windmill', 2);
  worker(state, 'farm', 3);
  close(estimateMaterialsSeconds(state, { food: 16 }), 7200);
});

test('the same resident earns twenty points in ten fed working hours then loses four per hour after unemployment grace', () => {
  const state = island({ food: 1000 });
  worker(state, 'quarry');
  const id = state.residents.find(resident => resident.workplace === 'quarry').id;
  tick(state, 10 * HOUR);
  close(person(state, id).happiness, 20);
  assert.equal(act(state, { type: 'assign', building: 'quarry', delta: -1 }).ok, true);
  assert.equal(person(state, id).workplace, null);
  assert.equal(person(state, id).returnRemaining, 300);
  tick(state, 12 * HOUR);
  close(person(state, id).happiness, 32);
  tick(state, HOUR);
  close(person(state, id).happiness, 28);
});

test('reassignment resets unemployment without erasing individual accumulated happiness', () => {
  const state = island({ population: 6, food: 1000 });
  const id = state.residents[0].id;
  tick(state, 12 * HOUR);
  close(person(state, id).happiness, 12);
  worker(state, 'quarry');
  assert.equal(person(state, id).workplace, 'quarry');
  assert.equal(person(state, id).unemployedSeconds, 0);
  tick(state, HOUR);
  close(person(state, id).happiness, 14);
  assert.equal(act(state, { type: 'assign', building: 'quarry', delta: -1 }).ok, true);
  tick(state, HOUR);
  close(person(state, id).happiness, 15);
  close(person(state, id).unemployedSeconds, HOUR);
});

test('hunger and unemployment have separate clocks and can charge both penalties', () => {
  const state = island({ population: 6, food: 0 });
  const id = state.residents[0].id;
  for (const resident of state.residents) resident.unemployedSeconds = GRACE;
  tick(state, HOUR);
  close(person(state, id).happiness, -5);
  close(person(state, id).hungerSeconds, HOUR);
  person(state, id).hungerSeconds = GRACE;
  tick(state, HOUR);
  close(person(state, id).happiness, -15);
  state.resources.food = 100;
  tick(state, HOUR);
  close(person(state, id).happiness, -19);
  assert.equal(person(state, id).hungerSeconds, 0);
  assert.ok(person(state, id).unemployedSeconds >= GRACE);
});

test('hungry workers produce half output immediately and still pay full employment tax', () => {
  const state = island({ food: 0 });
  worker(state, 'quarry');
  tick(state, HOUR);
  assert.equal(state.buildings.quarry.ready, 5);
  assert.equal(state.resources.coins, 101);
  const id = state.residents.find(resident => resident.workplace === 'quarry').id;
  close(person(state, id).happiness, 1);
});

test('a partly completed unit retains its phase when food runs out and returns', () => {
  const state = island({ food: 1 });
  worker(state, 'quarry');
  tick(state, 300);
  close(state.buildings.quarry.workProgress[0], 300);
  tick(state, 119);
  assert.equal(state.buildings.quarry.ready, 0);
  close(state.buildings.quarry.workProgress[0], 359.5);
  state.resources.food = 1;
  tick(state, .5);
  assert.equal(state.buildings.quarry.ready, 1);
  close(state.buildings.quarry.workProgress[0], 0);
});

test('hungry warehouse and market workers each carry thirty items per hour', () => {
  const state = island({ food: 0 });
  worker(state, 'warehouse');
  worker(state, 'market');
  state.buildings.quarry.ready = 50;
  assert.equal(act(state, { type: 'marketOrder', resource: 'wood', amount: 40 }).ok, true);
  tick(state, HOUR);
  assert.equal(state.resources.stone, 130);
  assert.equal(state.resources.wood, 70);
  assert.equal(state.market.locked.reduce((sum, batch) => sum + batch.amount, 0), 30);
});

test('hungry Lighthouse workers recover normal production while taxes remain unchanged', () => {
  const state = island({ food: 0 });
  worker(state, 'quarry');
  state.lighthouseRemaining = HOUR;
  tick(state, HOUR);
  assert.equal(state.buildings.quarry.ready, 10);
  assert.equal(state.resources.coins, 101);
});

test('the population average uses each clamped individual rather than clamping the average', () => {
  const state = island({ population: 6 });
  state.residents.forEach((resident, index) => { resident.happiness = index < 3 ? 95 : -95; });
  state.blessingRemaining = HOUR;
  updateHappiness(state);
  close(state.happiness, 12.5);
  state.blessingRemaining = 0;
  worker(state, 'quarry', 3);
  state.buildings.quarry.ready = 800;
  updateStorageStatus(state);
  updateHappiness(state);
  close(state.happiness, -5);
});

test('new residents begin at zero and do not inherit an older resident history', () => {
  const state = island({ happiness: 100, food: 1000 });
  const previous = new Set(state.residents.map(resident => resident.id));
  tick(state, HOUR);
  assert.equal(state.population, 13);
  const newcomer = state.residents.find(resident => !previous.has(resident.id));
  assert.ok(newcomer);
  assert.equal(newcomer.happiness, 0);
  assert.equal(newcomer.hungerSeconds, 0);
  assert.equal(newcomer.unemployedSeconds, 0);
  close(state.happiness, 1200 / 13);
});

test('individual records and both timers survive save without duplicate identities', () => {
  const state = island({ food: 0 });
  worker(state, 'quarry');
  tick(state, 1234);
  const saved = reload(state);
  assert.deepEqual(saved.residents, state.residents);
  assert.equal(new Set(saved.residents.map(resident => resident.id)).size, saved.population);
  assert.deepEqual(saved.resources, state.resources);
});

test('long and split ticks agree through both twelve-hour thresholds, clipping and multiple departures', () => {
  const whole = island({ food: 1 });
  worker(whole, 'dock', 3);
  worker(whole, 'market', 3);
  const split = reload(whole);
  tick(whole, 40 * HOUR);
  let remaining = 40 * HOUR;
  while (remaining > 0) {
    const seconds = Math.min(79, remaining);
    tick(split, seconds);
    remaining -= seconds;
  }
  assert.equal(whole.population, 6);
  assert.equal(split.population, whole.population);
  assert.deepEqual(whole.resources, split.resources);
  close(whole.happiness, split.happiness);
  close(whole.populationProgress, split.populationProgress);
  assert.equal(whole.residents.length, 6);
  whole.residents.forEach(resident => {
    const other = person(split, resident.id);
    assert.ok(other, `resident ${resident.id} survives both integrations`);
    close(resident.happiness, other.happiness);
    close(resident.hungerSeconds, other.hungerSeconds);
    close(resident.unemployedSeconds, other.unemployedSeconds);
  });
});

test('positive demographic integration respects individual upper clamps and newborn zero happiness', () => {
  const whole = island({ happiness: 98, food: 1000 });
  worker(whole, 'dock', 6);
  const split = reload(whole);
  tick(whole, 4 * HOUR);
  for (let i = 0; i < 4 * HOUR / 13; i++) tick(split, Math.min(13, 4 * HOUR - i * 13));
  assert.ok(whole.population > 12);
  assert.equal(whole.population, split.population);
  close(whole.happiness, split.happiness);
  close(whole.populationProgress, split.populationProgress);
  assert.ok(whole.residents.every(resident => resident.happiness >= -100 && resident.happiness <= 100));
  whole.residents.forEach(resident => close(resident.happiness, person(split, resident.id).happiness));
});

test('a returning worker keeps personal hunger and starts unemployment immediately without paying taxes', () => {
  const state = island({ food: 0 });
  worker(state, 'quarry');
  const id = state.residents.find(resident => resident.workplace === 'quarry').id;
  tick(state, HOUR);
  assert.equal(act(state, { type: 'assign', building: 'quarry', delta: -1 }).ok, true);
  const before = person(state, id).happiness;
  const coins = state.resources.coins;
  tick(state, 299);
  close(person(state, id).happiness, before);
  close(person(state, id).hungerSeconds, HOUR + 299);
  close(person(state, id).unemployedSeconds, 299);
  close(person(state, id).returnRemaining, 1);
  assert.equal(state.resources.coins, coins);
  const saved = reload(state);
  assert.deepEqual(person(saved, id), person(state, id));
  tick(saved, 1);
  assert.equal(person(saved, id).returnRemaining, 0);
  close(person(saved, id).unemployedSeconds, 300);
});

test('legacy and individual saves normalize malformed residents without illegal pools or duplicate IDs', () => {
  const state = island();
  state.residents[0] = { ...state.residents[0], happiness: Infinity, hungerSeconds: -10, unemployedSeconds: '12', workplace: 'townhall' };
  state.residents[1] = { ...state.residents[1], id: state.residents[2].id, happiness: 500, returnRemaining: Infinity };
  const saved = reload(state);
  assert.equal(saved.residents.length, saved.population);
  assert.equal(new Set(saved.residents.map(resident => resident.id)).size, saved.population);
  for (const resident of saved.residents) {
    assert.ok(Number.isFinite(resident.happiness) && resident.happiness >= -100 && resident.happiness <= 100);
    assert.ok(Number.isFinite(resident.hungerSeconds) && resident.hungerSeconds >= 0);
    assert.ok(Number.isFinite(resident.unemployedSeconds) && resident.unemployedSeconds >= 0);
    assert.ok(Number.isFinite(resident.returnRemaining) && resident.returnRemaining >= 0 && resident.returnRemaining <= 300);
    assert.notEqual(resident.workplace, 'townhall');
  }
});

test('staggered dismissals preserve each person\'s home-return clock across save and completion', () => {
  for (const sameBuilding of [false, true]) {
    const state = island();
    worker(state, 'quarry', sameBuilding ? 2 : 1);
    if (!sameBuilding) worker(state, 'farm');
    const assigned = state.residents.filter(resident => resident.workplace);
    const lowerId = Math.min(...assigned.map(resident => resident.id));
    const higherId = Math.max(...assigned.map(resident => resident.id));
    const higherBuilding = person(state, higherId).workplace;
    const lowerBuilding = person(state, lowerId).workplace;
    assert.equal(act(state, { type: 'assign', building: higherBuilding, delta: -1 }).ok, true);
    tick(state, 60);
    assert.equal(act(state, { type: 'assign', building: lowerBuilding, delta: -1 }).ok, true);
    close(person(state, higherId).returnRemaining, 240);
    close(person(state, lowerId).returnRemaining, 300);
    const saved = reload(state);
    close(person(saved, higherId).returnRemaining, 240);
    close(person(saved, lowerId).returnRemaining, 300);
    tick(saved, 240);
    assert.equal(person(saved, higherId).returnRemaining, 0);
    close(person(saved, lowerId).returnRemaining, 60);
    assert.deepEqual(saved.returningWorkers, [60]);
    tick(saved, 60);
    assert.equal(person(saved, lowerId).returnRemaining, 0);
    assert.deepEqual(saved.returningWorkers, []);
  }
});

test('reassigned crew order preserves the identity belonging to each unfinished production phase', () => {
  const state = island();
  worker(state, 'farm');
  const lowerId = state.residents.find(resident => resident.workplace === 'farm').id;
  worker(state, 'quarry');
  const higherId = state.residents.find(resident => resident.workplace === 'quarry').id;
  assert.ok(lowerId < higherId);
  assert.equal(act(state, { type: 'assign', building: 'farm', delta: -1 }).ok, true);
  tick(state, 300);
  assert.equal(act(state, { type: 'assign', building: 'quarry', delta: 1 }).ok, true);
  tick(state, 30);
  assert.deepEqual(state.buildings.quarry.workProgress, [330, 30]);
  const saved = reload(state);
  assert.equal(act(saved, { type: 'assign', building: 'quarry', delta: -1 }).ok, true);
  assert.equal(person(saved, lowerId).workplace, null);
  assert.equal(person(saved, higherId).workplace, 'quarry');
  assert.deepEqual(saved.buildings.quarry.workProgress, [330]);
  tick(saved, 30);
  assert.equal(saved.buildings.quarry.ready, 1);
});

test('maximum and duplicate saved resident IDs remain safe and unique when a new resident arrives', () => {
  const state = island({ happiness: 100, food: 1000 });
  state.residentSequence = Number.MAX_SAFE_INTEGER;
  state.residents[0].id = Number.MAX_SAFE_INTEGER;
  state.residents[1].id = Number.MAX_SAFE_INTEGER;
  const saved = reload(state);
  assert.equal(new Set(saved.residents.map(resident => resident.id)).size, saved.population);
  tick(saved, HOUR);
  assert.equal(saved.population, 13);
  assert.equal(new Set(saved.residents.map(resident => resident.id)).size, saved.population);
  assert.ok(saved.residents.every(resident => Number.isSafeInteger(resident.id) && resident.id > 0));
});

test('hungry construction hauling takes twice as long and the ordinary building phase matches that transport time', () => {
  const state = island({ food: 0 });
  worker(state, 'warehouse');
  state.resources.grain = 120;
  assert.equal(act(state, { type: 'upgrade', building: 'farm' }).ok, true);
  tick(state, 31679);
  assert.equal(state.buildings.farm.construction.goodsRemaining, 1);
  assert.equal(state.buildings.farm.construction.stage, 'transport');
  tick(state, 1);
  assert.equal(state.buildings.farm.construction.stage, 'building');
  close(state.buildings.farm.construction.transportSeconds, 31680);
  close(state.buildings.farm.construction.buildRemaining, 31680);
  tick(state, 31680);
  assert.equal(state.buildings.farm.level, 2);
  assert.equal(state.constructionProjects.length, 0);
});
