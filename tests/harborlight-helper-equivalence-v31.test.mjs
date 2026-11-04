import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../harborlight-v1-state.js';
import { ROAD_SECTIONS, ROAD_MAX_LEVEL, roadSummary, roadSpeedMultiplier, roadCapacityMultiplier } from '../harborlight-v1-leisure.js';
import { MATERIAL_IDS, centralRoom, warehouseLimits, ordinaryStock, ordinaryWarehouseUsed,
  foodReserve, logisticsAction, quoteTrade } from '../harborlight-v1-logistics.js';

const NOW = Date.parse('2026-11-04T12:00:00Z');
// Preserve the pre-optimization expression as an independent compatibility oracle.
function previousInbound(state, destination, resource) {
  return Object.values(state.haulTrips || {}).flat()
    .filter(t => ['producer', 'pending', 'marketOutbound', 'dockOutbound'].includes(t.kind) ? destination === 'warehouse' :
      ['marketInbound'].includes(t.kind) ? destination === 'market' : ['dockInbound', 'dockUnload'].includes(t.kind) ? destination === 'dock' : false)
    .filter(t => !resource || t.resource === resource).reduce((sum, t) => sum + t.amount, 0);
}
function previousCentralRoom(state, resource) {
  const limits = warehouseLimits(state), inbound = previousInbound(state, 'warehouse');
  const foodSpace = resource === 'food' ? 0 : Math.max(0, foodReserve(state) - ordinaryStock(state, 'food') - previousInbound(state, 'warehouse', 'food'));
  return Math.max(0, Math.floor(Math.min(limits.perResource - ordinaryStock(state, resource) - previousInbound(state, 'warehouse', resource),
    limits.total - ordinaryWarehouseUsed(state) - inbound - foodSpace)));
}
function checkRoads(state) {
  const summary = roadSummary(state), before = JSON.stringify(state);
  assert.equal(roadSpeedMultiplier(state), 1 + summary.speedPercent / 100);
  assert.equal(roadCapacityMultiplier(state), 1 + summary.capacityPercent / 100);
  assert.equal(JSON.stringify(state), before);
}

test('cargo road factors match the full summary through live partial and completed tiers', () => {
  const state = { roads: { segments: Array(ROAD_SECTIONS).fill(0) } };
  const sameArray = state.roads.segments;
  for (let level = 0; level <= ROAD_MAX_LEVEL; level++) {
    sameArray.fill(level);
    checkRoads(state);
    if (level < ROAD_MAX_LEVEL) for (let section = 0; section < ROAD_SECTIONS; section++) {
      sameArray[section] = level + 1;
      checkRoads(state);
    }
    assert.equal(state.roads.segments, sameArray, 'in-place upgrades must never need array replacement');
  }
  sameArray[37] = 0;
  checkRoads(state);
  assert.equal(roadSpeedMultiplier(state), 1, 'an in-place downgrade cannot leave a cached tier');
  for (const segments of [undefined, [], Array(99).fill(5), Array(101).fill(5), new Uint8Array(100).fill(5)]) checkRoads({ roads: { segments } });
  checkRoads({});
});

test('mixed road sections retain exact minimum-tier rounding and normalization behavior', () => {
  let seed = 31;
  for (let sample = 0; sample < 200; sample++) {
    const segments = Array.from({ length: ROAD_SECTIONS }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed % (ROAD_MAX_LEVEL + 1);
    });
    checkRoads({ roads: { segments } });
  }
  // The summary's bounds also remain intact before save normalization.
  for (const value of [-1, 1.5, 8, NaN, undefined]) checkRoads({ roads: { segments: Array(ROAD_SECTIONS).fill(value) } });
});

test('central capacity matches the previous cargo scan across destinations, fractions and mutable groups', () => {
  const state = createState(NOW);
  const kinds = ['producer', 'pending', 'marketOutbound', 'dockOutbound', 'marketInbound', 'dockInbound', 'dockUnload', 'dockLoad', 'construction', 'unknown'];
  const groups = Object.assign(Object.create({ inherited: [{ kind: 'producer', resource: 'wood', amount: 999999 }] }),
    { warehouse: [], market: [], dock: [] });
  Object.defineProperty(groups, 'hidden', { value: [{ kind: 'producer', resource: 'wood', amount: 999999 }] });
  state.haulTrips = groups;
  for (const level of [1, 4, 10, 24]) {
    state.buildings.warehouse.level = level;
    for (const id of MATERIAL_IDS) {
      state.resources[id] = id === 'food' ? 0 : 100;
      state.bonusMaterials[id] = id === 'wood' ? 35 : 0;
    }
    for (const trips of Object.values(groups)) trips.length = 0;
    for (let index = 0; index < 90; index++) {
      groups[['warehouse', 'market', 'dock'][index % 3]].push({ kind: kinds[index % kinds.length], resource: MATERIAL_IDS[Math.floor(index / kinds.length) % MATERIAL_IDS.length], amount: 3 + index / 8 });
      for (const id of MATERIAL_IDS) assert.equal(centralRoom(state, id), previousCentralRoom(state, id));
    }
    groups.warehouse[0].amount += 17.25;
    groups.market.splice(2, 3);
    delete groups.dock[1]; // Array.flat skips holes in the original scan.
    for (const id of MATERIAL_IDS) assert.equal(centralRoom(state, id), previousCentralRoom(state, id));
  }
  // A single entry was also flattened as-is by the former Object.values().flat().
  groups.single = { kind: 'producer', resource: 'wood', amount: 13 };
  for (const id of MATERIAL_IDS) assert.equal(centralRoom(state, id), previousCentralRoom(state, id));
  const before = JSON.stringify(state);
  centralRoom(state, 'food');
  assert.equal(JSON.stringify(state), before, 'capacity queries cannot mutate the cargo ledger');
  state.haulTrips = null;
  assert.equal(centralRoom(state, 'food'), previousCentralRoom(state, 'food'));
});

test('market and harbor admission count only cargo that actually arrives at that destination', () => {
  const kinds = ['producer', 'pending', 'marketOutbound', 'dockOutbound', 'marketInbound', 'dockInbound', 'dockUnload', 'dockLoad', 'construction'];
  for (const kind of kinds) {
    const state = createState(NOW);
    state.buildings.townhall.level = 4;
    state.buildings.market.level = state.buildings.dock.level = 1;
    state.resources.coins = 100000;
    state.resources.wood = 10000;
    state.haulTrips = { warehouse: [{ kind, resource: 'stone', amount: 1000 }], market: [], dock: [] };
    const before = JSON.stringify(state);
    const quote = quoteTrade(state, { direction: 'buy', resource: 'stone', amount: 100 });
    assert.equal(quote.ok, previousInbound(state, 'dock', 'stone') === 0, kind);
    assert.equal(JSON.stringify(state), before, 'trade quote cannot change any trip');
    const order = logisticsAction(state, { type: 'marketOrder', resource: 'wood', amount: 1 });
    assert.equal(order.ok, previousInbound(state, 'market') === 0, kind);
  }
});
