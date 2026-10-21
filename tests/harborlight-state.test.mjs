import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, tick, buildingCost, totalWorkers, taskReady, populationRate, populationIntervalSeconds, EXPEDITIONS } from '../harborlight-v1-state.js';

function fundedState() {
  const state = createState();
  for (const id of Object.keys(state.resources)) state.resources[id] = 1000;
  return state;
}

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should equal ${expected}`);
}

test('a fresh island starts at townhall level one with 100 of every resource and twelve residents', () => {
  const state = createState();
  assert.equal(state.version, 2);
  assert.deepEqual(state.resources, { coins: 100, wood: 100, stone: 100, food: 100, planks: 100 });
  assert.equal(state.buildings.townhall.level, 1);
  assert.equal(state.capacity, 24);
  assert.equal(state.population, 12);
  assert.equal(state.happiness, 0);
  assert.equal(state.populationProgress, 0);
  assert.equal(totalWorkers(state), 8);
});

test('construction spends exact cost once without bypassing happiness or townhall population rules', () => {
  const state = fundedState(), initial = { ...state.resources }, cost = buildingCost(state, 'house');
  assert.equal(act(state, { type: 'upgrade', building: 'house' }).ok, true);
  for (const key of Object.keys(cost)) assert.equal(state.resources[key], initial[key] - cost[key]);
  assert.equal(state.buildings.house.level, 3);
  assert.equal(state.capacity, 24);
  assert.equal(state.population, 12);
  state.resources.coins = 0;
  const before = JSON.stringify(state);
  assert.equal(act(state, { type: 'upgrade', building: 'house' }).ok, false);
  assert.equal(JSON.stringify(state), before);
  assert.equal(act(state, { type: 'upgrade', building: '__proto__' }).ok, false);
});

test('production, collection, pause and speed use actual simulation time', () => {
  const state = createState(), wood = state.resources.wood, ready = state.buildings.lumber.ready;
  tick(state, 9); assert.equal(state.buildings.lumber.ready, ready);
  tick(state, 1); assert.equal(state.buildings.lumber.ready, ready + 4);
  assert.equal(act(state, { type: 'collect', building: 'lumber' }).ok, true);
  assert.equal(state.resources.wood, wood + ready + 4 - 3); // One sawmill worker consumed 3 wood in this production cycle.
  assert.equal(state.buildings.lumber.ready, 0);
  assert.equal(taskReady(state, 'collect'), true);
  act(state, { type: 'pause' });
  const before = JSON.stringify(state); tick(state, 100); assert.equal(JSON.stringify(state), before);
  act(state, { type: 'pause' }); act(state, { type: 'speed', speed: 4 });
  const minutes = state.minutes; tick(state, 2.5);
  assert.equal(state.minutes, minutes + 10);
  assert.equal(state.buildings.lumber.ready, 4);
  tick(state, NaN); tick(state, -50); tick(state, Infinity);
  assert.ok(Number.isFinite(state.minutes));
});

test('lighthouse requires real deliveries and spends repair resources once', () => {
  const state = fundedState();
  assert.equal(act(state, { type: 'repair' }).ok, false);
  const wood = state.resources.wood, stone = state.resources.stone;
  for (let i = 0; i < 3; i++) assert.equal(act(state, { type: 'deliver', resource: 'wood' }).ok, true);
  for (let i = 0; i < 2; i++) assert.equal(act(state, { type: 'deliver', resource: 'stone' }).ok, true);
  assert.equal(state.resources.wood, wood - 30);
  assert.equal(state.resources.stone, stone - 18);
  assert.equal(act(state, { type: 'repair' }).ok, true);
  assert.equal(state.buildings.lighthouse.level, 1);
  assert.equal(state.objective.repaired, true);
  const before = { ...state.resources };
  assert.equal(act(state, { type: 'repair' }).ok, false);
  assert.deepEqual(state.resources, before);
});

test('task and expedition rewards cannot be claimed twice, including after save reload', () => {
  const state = createState();
  assert.equal(act(state, { type: 'claim', task: 'expedition' }).ok, false);
  assert.equal(act(state, { type: 'expeditionComplete', expedition: EXPEDITIONS[0].id, moves: 14 }).ok, true);
  assert.equal(act(state, { type: 'claim', task: 'expedition' }).ok, true);
  const reloaded = normalizeState(JSON.parse(JSON.stringify(state))), before = { ...reloaded.resources };
  assert.equal(act(reloaded, { type: 'expeditionComplete', expedition: EXPEDITIONS[0].id, moves: 12 }).ok, false);
  assert.equal(act(reloaded, { type: 'claim', task: 'expedition' }).ok, false);
  assert.deepEqual(reloaded.resources, before);
});

test('save normalization rejects bad numbers and invalid prototype keys, and caps workers', () => {
  const raw = createState();
  raw.resources.coins = Infinity; raw.resources.wood = -100; raw.resources.stone = '500';
  raw.buildings.house.level = 999;
  for (const building of Object.values(raw.buildings)) building.workers = 999;
  raw.population = 1; raw.day = NaN; raw.minutes = -1; raw.speed = 17;
  const state = normalizeState(raw);
  assert.equal(state.resources.coins, 100);
  assert.equal(state.resources.wood, 0);
  assert.equal(state.resources.stone, 100);
  assert.equal(state.buildings.house.level, 5);
  assert.equal(state.population, 6);
  assert.equal(totalWorkers(state), 6);
  assert.equal(state.day, 18);
  assert.equal(state.minutes, 0);
  assert.equal(state.speed, 1);
  assert.deepEqual(normalizeState(null), createState());
});

test('crafting and trade require inputs and never allow negative or fractional exploitation', () => {
  const state = createState(), wood = state.resources.wood, planks = state.resources.planks;
  assert.equal(act(state, { type: 'craft', building: 'sawmill' }).ok, true);
  assert.equal(state.resources.wood, wood - 10);
  assert.equal(state.resources.planks, planks + 6);
  const before = { ...state.resources };
  for (const quantity of [-1, 1.5, Infinity, NaN, '10']) assert.equal(act(state, { type: 'trade', resource: 'wood', amount: quantity }).ok, false);
  assert.deepEqual(state.resources, before);
  assert.equal(act(state, { type: 'trade', resource: 'wood', amount: 10 }).ok, true);
  assert.equal(state.resources.wood, before.wood - 10);
  assert.equal(state.resources.coins, before.coins + 30);
  assert.equal(act(state, { type: 'trade', direction: 'buy', resource: 'stone', amount: 10 }).ok, true);
  assert.equal(state.resources.stone, before.stone + 10);
});

test('worker assignments respect population, building capacity and bounds', () => {
  const state = createState();
  assert.equal(act(state, { type: 'assign', building: 'house', delta: 1 }).ok, false);
  assert.equal(act(state, { type: 'assign', building: 'lumber', delta: 0.5 }).ok, false);
  assert.equal(act(state, { type: 'assign', building: 'lumber', delta: 1 }).ok, true);
  assert.equal(state.buildings.lumber.workers, 2);
  state.population = totalWorkers(state);
  assert.equal(act(state, { type: 'assign', building: 'farm', delta: 1 }).ok, false);
  assert.equal(act(state, { type: 'assign', building: 'farm', delta: -1 }).ok, true);
});


test('decorations and paths spend resources, improve happiness and persist', () => {
  const state = createState(), initial = { ...state.resources };
  assert.equal(act(state, { type: 'decorate', decoration: 'flowers' }).ok, true);
  assert.equal(state.decorations.flowers, 1);
  assert.equal(state.resources.coins, initial.coins - 25);
  assert.equal(act(state, { type: 'path' }).ok, true);
  assert.equal(state.paths, 1);
  assert.equal(state.resources.stone, initial.stone - 10);
  assert.equal(state.resources.wood, initial.wood - 5);
  assert.equal(state.happiness, 2);
  assert.equal(act(state, { type: 'decorate', decoration: '__proto__' }).ok, false);
  const reloaded = normalizeState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(reloaded.decorations, state.decorations);
  assert.equal(reloaded.paths, 1);
});


test('optional expedition chests grant ten coins each only on the first completed run', () => {
  const state = createState(), initial = { ...state.resources };
  const expedition = EXPEDITIONS.find(item => item.id === 'quarry');
  for (const caches of [-1, 0.5, 3, NaN, Infinity, '1']) {
    assert.equal(act(state, { type: 'expeditionComplete', expedition: expedition.id, moves: 15, caches }).ok, false);
  }
  assert.deepEqual(state.resources, initial);
  assert.equal(act(state, { type: 'expeditionComplete', expedition: expedition.id, moves: 15, caches: 2 }).ok, true);
  assert.equal(state.resources.coins, initial.coins + expedition.reward.coins + 20);
  const reloaded = normalizeState(JSON.parse(JSON.stringify(state))), before = { ...reloaded.resources };
  assert.equal(act(reloaded, { type: 'expeditionComplete', expedition: expedition.id, moves: 15, caches: 2 }).ok, false);
  assert.deepEqual(reloaded.resources, before);
  const noCaches = createState();
  assert.equal(act(noCaches, { type: 'expeditionComplete', expedition: expedition.id, moves: 15 }).ok, true);
  assert.equal(noCaches.resources.coins, initial.coins + expedition.reward.coins);
});

test('happiness rates match approved anchors, intermediate values and symmetric population loss', () => {
  for (const [happiness, interval] of [[25, 12 * 3600], [50, 6 * 3600], [75, 3600 * 12 / 7], [100, 3600]]) {
    close(populationIntervalSeconds(happiness), interval);
    close(populationRate(happiness), 3600 / interval);
    close(populationRate(-happiness), -3600 / interval);
    close(populationIntervalSeconds(-happiness), interval);
  }
  assert.equal(populationRate(0), 0);
  assert.equal(populationIntervalSeconds(0), Infinity);
  for (let happiness = 1; happiness <= 100; happiness++) {
    assert.ok(populationRate(happiness) > populationRate(happiness - 1));
  }
  for (const invalid of [undefined, NaN, Infinity, '50']) assert.equal(populationRate(invalid), 0);
});

test('zero happiness never changes population, including across a long active session', () => {
  const state = createState();
  tick(state, 7 * 24 * 3600);
  assert.equal(state.population, 12);
  assert.equal(state.populationProgress, 0);
});

test('positive and negative happiness change population at exact real-hour thresholds', () => {
  for (const [happiness, seconds] of [[25, 43200], [50, 21600], [75, 43200 / 7], [100, 3600]]) {
    for (const direction of [-1, 1]) {
      const state = createState();
      state.happiness = happiness * direction;
      tick(state, seconds - 1);
      assert.equal(state.population, 12, `${state.happiness}% should wait for the full interval`);
      tick(state, 1);
      assert.equal(state.population, 12 + direction);
      close(state.populationProgress, 0);
      assert.ok(Object.values(state.resources).every(value => value >= 0));
    }
  }
});

test('short ticks accumulate before the production batch and survive serialization midway', () => {
  let state = createState();
  state.happiness = 100;
  for (let index = 0; index < 1800; index++) tick(state, 1);
  assert.equal(state.population, 12);
  close(state.populationProgress, 0.5);
  state = normalizeState(JSON.parse(JSON.stringify(state)));
  close(state.populationProgress, 0.5);
  assert.equal(state.populationDirection, 1);
  for (let index = 0; index < 1799; index++) tick(state, 1);
  assert.equal(state.population, 12);
  tick(state, 1);
  assert.equal(state.population, 13);
  close(state.populationProgress, 0);
});

test('population uses real active time regardless of production speed, with pause stopping progress', () => {
  for (const speed of [1, 2, 4]) {
    const state = createState();
    state.happiness = 100;
    act(state, { type: 'speed', speed });
    tick(state, 1800);
    assert.equal(state.population, 12);
    close(state.populationProgress, 0.5);
    act(state, { type: 'pause' });
    const before = JSON.stringify(state);
    tick(state, 3600);
    assert.equal(JSON.stringify(state), before);
    act(state, { type: 'pause' });
    tick(state, 1800);
    assert.equal(state.population, 13);
  }
});

test('zero happiness and sign reversals discard old demographic progress', () => {
  const state = createState();
  state.happiness = 100;
  tick(state, 1800);
  state.happiness = 0;
  tick(state, 1);
  assert.equal(state.populationProgress, 0);
  assert.equal(state.populationDirection, 0);
  state.happiness = 100;
  tick(state, 1800);
  assert.equal(state.population, 12);
  state.happiness = -100;
  tick(state, 1800);
  assert.equal(state.population, 12);
  close(state.populationProgress, 0.5);
  tick(state, 1800);
  assert.equal(state.population, 11);
  state.happiness = 100;
  tick(state, 1800);
  assert.equal(state.population, 11);
  tick(state, 1800);
  assert.equal(state.population, 12);
});

test('happiness actions immediately clear progress at zero or a sign change, preserving the same direction', () => {
  const zero = fundedState();
  zero.happiness = -1;
  tick(zero, 1800);
  assert.ok(zero.populationProgress > 0);
  assert.equal(act(zero, { type: 'decorate', decoration: 'flowers' }).ok, true);
  assert.equal(zero.happiness, 0);
  assert.equal(zero.populationProgress, 0);
  assert.equal(zero.populationDirection, 0);

  const crossed = fundedState();
  crossed.happiness = -1;
  tick(crossed, 1800);
  assert.equal(act(crossed, { type: 'upgrade', building: 'chapel' }).ok, true);
  assert.equal(crossed.happiness, 2);
  assert.equal(crossed.populationProgress, 0);
  assert.equal(crossed.populationDirection, 1);
  assert.equal(crossed.population, 12);

  for (const happiness of [-2, 25]) {
    const sameDirection = fundedState();
    sameDirection.happiness = happiness;
    tick(sameDirection, 1800);
    const before = sameDirection.populationProgress;
    assert.equal(act(sameDirection, { type: 'decorate', decoration: 'flowers' }).ok, true);
    assert.equal(sameDirection.happiness, happiness + 1);
    assert.equal(sameDirection.populationProgress, before);
    assert.equal(sameDirection.populationDirection, Math.sign(happiness));
  }
});

test('changing happiness within the same sign preserves earned fractional progress', () => {
  const state = createState();
  state.happiness = 100;
  tick(state, 1800);
  state.happiness = 50;
  tick(state, 3 * 3600);
  assert.equal(state.population, 13);
  close(state.populationProgress, 0);
});

test('townhall alone expands capacity by 24 per level without awarding instant residents', () => {
  const state = fundedState();
  for (const id of Object.keys(state.resources)) state.resources[id] = 10000;
  for (let level = 2; level <= 5; level++) {
    assert.equal(act(state, { type: 'upgrade', building: 'townhall' }).ok, true);
    assert.equal(state.buildings.townhall.level, level);
    assert.equal(state.capacity, level * 24);
    assert.equal(state.population, 12);
  }
  assert.equal(act(state, { type: 'upgrade', building: 'townhall' }).ok, false);
  assert.equal(state.capacity, 120);
});

test('population capacity prevents banking births before a townhall upgrade', () => {
  const state = fundedState();
  state.population = 23;
  state.happiness = 100;
  tick(state, 10 * 3600);
  assert.equal(state.population, 24);
  assert.equal(state.populationProgress, 0);
  tick(state, 30 * 3600);
  assert.equal(state.population, 24);
  assert.equal(act(state, { type: 'upgrade', building: 'townhall' }).ok, true);
  assert.equal(state.capacity, 48);
  tick(state, 3599);
  assert.equal(state.population, 24);
  tick(state, 1);
  assert.equal(state.population, 25);
});

test('negative happiness stops at six, releases excess workers and leaves production playable', () => {
  const state = createState();
  state.happiness = -100;
  tick(state, 100 * 3600);
  assert.equal(state.population, 6);
  assert.equal(totalWorkers(state), 6);
  assert.equal(state.populationProgress, 0);
  assert.ok(Object.values(state.buildings).every(building => building.workers >= 0));
  assert.ok(state.buildings.farm.workers > 0);
  assert.ok(state.buildings.lumber.workers > 0);
  assert.ok(state.buildings.quarry.workers > 0);
  assert.equal(act(state, { type: 'collect', building: 'lumber' }).ok, true);
  tick(state, 10);
  assert.ok(state.buildings.lumber.ready > 0);
  assert.equal(act(state, { type: 'collect', building: 'lumber' }).ok, true);
  assert.equal(act(state, { type: 'trade', resource: 'wood', amount: 10 }).ok, true);
  state.happiness = 100;
  tick(state, 3599);
  assert.equal(state.population, 6);
  tick(state, 1);
  assert.equal(state.population, 7);
});

test('legacy saves retain earned assets and progression while deriving capacity from townhall', () => {
  const raw = fundedState();
  raw.version = 1;
  raw.resources.coins = 2480;
  raw.buildings.house.level = 5;
  raw.buildings.townhall.level = 2;
  raw.population = 32;
  raw.capacity = 40;
  raw.happiness = 85;
  raw.tasks.collect = true;
  raw.expeditions.misty = { completed: true, runs: 1, bestMoves: 10 };
  delete raw.populationProgress;
  delete raw.populationDirection;
  const state = normalizeState(raw);
  assert.equal(state.version, 2);
  assert.equal(state.resources.coins, 2480);
  assert.equal(state.buildings.house.level, 5);
  assert.equal(state.buildings.townhall.level, 2);
  assert.equal(state.capacity, 48);
  assert.equal(state.population, 32);
  assert.equal(state.happiness, 85);
  assert.equal(state.tasks.collect, true);
  assert.equal(state.expeditions.misty.completed, true);
  assert.equal(state.populationProgress, 0);
});

test('save normalization enforces signed happiness, townhall floor and valid fractional demographics', () => {
  for (const [rawHappiness, expected] of [[-999, -100], [-50, -50], [999, 100], [NaN, 0], ['50', 0]]) {
    const raw = createState();
    raw.happiness = rawHappiness;
    raw.buildings.townhall.level = 0;
    raw.population = 999;
    raw.capacity = 100000;
    const state = normalizeState(raw);
    assert.equal(state.happiness, expected);
    assert.equal(state.buildings.townhall.level, 1);
    assert.equal(state.capacity, 24);
    assert.equal(state.population, 24);
    assert.ok(Object.values(state.resources).every(value => value >= 0));
  }
  for (const rawProgress of [-1, NaN, Infinity, '0.5']) {
    const raw = createState();
    raw.happiness = -50;
    raw.populationDirection = -1;
    raw.populationProgress = rawProgress;
    assert.equal(normalizeState(raw).populationProgress, 0);
  }
  const mismatched = createState();
  mismatched.happiness = -50;
  mismatched.populationDirection = 1;
  mismatched.populationProgress = 0.75;
  assert.equal(normalizeState(mismatched).populationProgress, 0);
});
