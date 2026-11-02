import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState } from '../harborlight-v1-state.js';
import { estimateMaterialsSeconds } from '../harborlight-v1-logistics.js';

const NOW = Date.parse('2026-11-02T12:00:00Z'), HOUR = 3600;
function island(population = 12) {
  const raw = createState(NOW);
  raw.population = population; raw.capacity = 96;
  raw.buildings.townhall.level = 4; raw.buildings.house.level = 4;
  raw.resources.food = 1000; raw.resources.grain = 1000;
  for (const id of ['wood', 'stone', 'planks']) raw.resources[id] = 0;
  const state = normalizeState(raw, NOW);
  state.engagement.activeUntil = 0; state.engagement.lastRealActivityAt = NOW;
  for (const resident of state.residents) { resident.workplace = null; resident.arrivalRemaining = 0; resident.newbornRemaining = 0; }
  return state;
}
function assign(state, workplace, count = 1) {
  const free = state.residents.filter(resident => !resident.workplace).slice(0, count);
  assert.equal(free.length, count);
  for (const resident of free) resident.workplace = workplace;
  state.buildings[workplace].workers = count;
}
function boost(state, building, hours = 2) {
  state.missionProductionBonuses = [{ building, multiplier: 2, until: NOW + hours * HOUR * 1000, receiptIds: ['forecast-proof'] }];
}

test('400 stone at 20 per hour takes 20 hours without a mission reward and 18 with a two-hour double reward', () => {
  const state = island(); assign(state, 'quarry'); assign(state, 'warehouse');
  assert.equal(estimateMaterialsSeconds(state, { stone: 400 }), 20 * HOUR);
  boost(state, 'quarry');
  const saved = JSON.stringify(state);
  assert.equal(estimateMaterialsSeconds(state, { stone: 400 }), 18 * HOUR);
  assert.equal(JSON.stringify(state), saved, 'quoting must not consume the reward, goods or worker progress');
});

test('a short production plan finishes inside the reward and an expired reward adds no output', () => {
  const state = island(); assign(state, 'quarry'); assign(state, 'warehouse'); boost(state, 'quarry');
  assert.equal(estimateMaterialsSeconds(state, { stone: 40 }), HOUR);
  state.missionProductionBonuses[0].until = NOW;
  assert.equal(estimateMaterialsSeconds(state, { stone: 400 }), 20 * HOUR);
});

test('transport remains the lower bound when a tiny order is produced faster than its delivery', () => {
  const state = island(); assign(state, 'quarry'); assign(state, 'warehouse'); boost(state, 'quarry');
  assert.equal(estimateMaterialsSeconds(state, { stone: 1 }), 300);
});

test('only the producer reward applies and duplicate rewards extend time without multiplying output', () => {
  const state = island(); assign(state, 'quarry'); assign(state, 'warehouse'); boost(state, 'lumber');
  assert.equal(estimateMaterialsSeconds(state, { stone: 400 }), 20 * HOUR);
  state.missionProductionBonuses.push({ building: 'quarry', multiplier: 2, until: NOW + HOUR * 1000 });
  state.missionProductionBonuses.push({ building: 'quarry', multiplier: 2, until: NOW + 2 * HOUR * 1000 });
  assert.equal(estimateMaterialsSeconds(state, { stone: 400 }), 18 * HOUR);
});

test('food subtracts the same meal demand during the boosted and ordinary phases', () => {
  const state = island(24); state.resources.food = 50;
  assign(state, 'windmill', 2); assign(state, 'warehouse'); boost(state, 'windmill');
  // Gross 40/h, demand 24/h. First 2h: (80−24)×2=112.
  // The last 8 take 0.5h at ordinary net output 40−24=16/h.
  assert.equal(estimateMaterialsSeconds(state, { food: 120 }), 2.5 * HOUR);
  state.missionProductionBonuses = [];
  assert.equal(estimateMaterialsSeconds(state, { food: 120 }), 7.5 * HOUR);
});

test('a food reward cannot finance stock that exceeds its burst when ordinary net output is negative', () => {
  const state = island(24); state.resources.food = 50;
  assign(state, 'windmill'); assign(state, 'warehouse'); boost(state, 'windmill');
  // Reward net: 40−24=16/h, lasting 2h. Ordinary net: 20−24=−4/h.
  assert.equal(estimateMaterialsSeconds(state, { food: 16 }), HOUR);
  assert.equal(estimateMaterialsSeconds(state, { food: 40 }), Infinity);
});

test('an upstream ingredient reward expires before the rest of a recipe can be supplied', () => {
  const state = island(); assign(state, 'lumber'); assign(state, 'sawmill'); assign(state, 'warehouse');
  assert.equal(estimateMaterialsSeconds(state, { planks: 400 }), 40 * HOUR);
  boost(state, 'lumber');
  // 800 wood: 80 during the 2h reward, followed by 720 at 20/h.
  // This 38h ingredient forecast dominates the 20h processing forecast.
  assert.equal(estimateMaterialsSeconds(state, { planks: 400 }), 38 * HOUR);
});
