import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, tick, buildingCost, totalWorkers, taskReady, EXPEDITIONS } from '../harborlight-v1-state.js';

test('construction spends exact cost once, changes housing and rejects unavailable upgrades', () => {
  const state = createState(), initial = { ...state.resources }, cost = buildingCost(state, 'house');
  assert.equal(act(state, { type: 'upgrade', building: 'house' }).ok, true);
  for (const key of Object.keys(cost)) assert.equal(state.resources[key], initial[key] - cost[key]);
  assert.equal(state.buildings.house.level, 3);
  assert.equal(state.capacity, 32);
  assert.equal(state.population, 26);
  state.resources.coins = 0;
  const before = JSON.stringify(state);
  assert.equal(act(state, { type: 'upgrade', building: 'house' }).ok, false);
  assert.equal(JSON.stringify(state), before);
  assert.equal(act(state, { type: 'upgrade', building: '__proto__' }).ok, false);
});

test('production, collection, pause and speed use actual simulation time', () => {
  const state = createState(), wood = state.resources.wood, ready = state.buildings.lumber.ready;
  tick(state, 9); assert.equal(state.buildings.lumber.ready, ready);
  tick(state, 1); assert.equal(state.buildings.lumber.ready, ready + 8);
  assert.equal(act(state, { type: 'collect', building: 'lumber' }).ok, true);
  assert.equal(state.resources.wood, wood + ready + 8 - 6); // sawmill consumed 6 wood in its production cycle.
  assert.equal(state.buildings.lumber.ready, 0);
  assert.equal(taskReady(state, 'collect'), true);
  act(state, { type: 'pause' });
  const before = JSON.stringify(state); tick(state, 100); assert.equal(JSON.stringify(state), before);
  act(state, { type: 'pause' }); act(state, { type: 'speed', speed: 4 });
  const minutes = state.minutes; tick(state, 2.5);
  assert.equal(state.minutes, minutes + 10);
  assert.equal(state.buildings.lumber.ready, 8);
  tick(state, NaN); tick(state, -50); tick(state, Infinity);
  assert.ok(Number.isFinite(state.minutes));
});

test('lighthouse requires real deliveries and spends repair resources once', () => {
  const state = createState();
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
  assert.equal(state.resources.coins, 2480);
  assert.equal(state.resources.wood, 0);
  assert.equal(state.resources.stone, 860);
  assert.equal(state.buildings.house.level, 5);
  assert.equal(state.population, 1);
  assert.equal(totalWorkers(state), 1);
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
  assert.equal(state.buildings.lumber.workers, 3);
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
  assert.equal(state.happiness, 87);
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
