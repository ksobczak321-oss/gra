import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLogisticsState, receiveMaterials, ordinaryStock, bonusStock,
  ordinaryWarehouseUsed, warehouseUsed, stockRoom, centralRoom, centralAvailable,
  consumeMaterial, spendMaterials, quoteInstantTransport, instantTransport,
  advanceLogistics, haulCapacity, foodReserve, warehouseLimits
} from '../harborlight-v1-logistics.js';

const NOW = Date.parse('2026-10-30T12:00:00Z');
function island() {
  const raw = { population: 12, worldTimeMs: NOW, activeSeconds: 0,
    resources: { coins: 10000, wood: 0, stone: 0, grain: 0, food: 500, planks: 0 },
    buildings: Object.fromEntries(['house','farm','sawmill','quarry','dock','warehouse','lighthouse','lumber','windmill','townhall','chapel','market'].map(id => [id, { level: id === 'townhall' ? 4 : 1, workers: 0, ready: 0, workProgress: [] }])),
    residents: Array.from({ length: 12 }, (_, index) => ({ id: index + 1, workplace: null, arrivalRemaining: 0, returnRemaining: 0, pendingRelease: false })),
    statistics: { collected: 0, crafted: 0, traded: 0, upgrades: 0 }, foodCredit: 0,
    lighthouseRemaining: 0, chapelRemaining: 0, roads: { segments: Array(100).fill(0) } };
  const state = structuredClone(raw);
  normalizeLogisticsState(state, raw);
  return state;
}
function crew(state, id, count) {
  state.residents.filter(person => person.workplace === id).forEach(person => { person.workplace = null; });
  state.residents.filter(person => !person.workplace).slice(0, count).forEach(person => { person.workplace = id; person.arrivalRemaining = 0; });
  state.buildings[id].workers = count;
  state.buildings[id].workProgress = Array(count).fill(0);
}
function reload(state) {
  const raw = structuredClone(state), next = structuredClone(raw);
  normalizeLogisticsState(next, raw);
  return next;
}

test('reward overflow is spendable and leaves ordinary production slots intact', () => {
  const state = island(); state.resources.wood = 800;
  receiveMaterials(state, { wood: 400 });
  assert.equal(state.resources.wood, 1200);
  assert.equal(bonusStock(state, 'wood'), 400);
  assert.equal(ordinaryStock(state, 'wood'), 800);
  assert.equal(stockRoom(state, 'wood'), 200);
  assert.equal(centralAvailable(state, 'wood'), 1200);
  receiveMaterials(state, { wood: 200 }, { bonus: false });
  assert.equal(state.resources.wood, 1400);
  assert.equal(ordinaryStock(state, 'wood'), 1000);
  assert.equal(stockRoom(state, 'wood'), 0);
  assert.equal(state.pendingDeliveries.wood, 0);
});

test('spending consumes bonus first and only then frees ordinary warehouse capacity', () => {
  const state = island(); state.resources.wood = 1000;
  receiveMaterials(state, { wood: 400 });
  assert.equal(consumeMaterial(state, 'wood', 250), 250);
  assert.equal(state.resources.wood, 1150);
  assert.equal(bonusStock(state, 'wood'), 150);
  assert.equal(stockRoom(state, 'wood'), 0);
  assert.equal(spendMaterials(state, { wood: 200, coins: 10 }), true);
  assert.equal(bonusStock(state, 'wood'), 0);
  assert.equal(ordinaryStock(state, 'wood'), 950);
  assert.equal(stockRoom(state, 'wood'), 50);
  const before = structuredClone(state.resources);
  assert.equal(spendMaterials(state, { wood: 1000, coins: 100 }), false);
  assert.deepEqual(state.resources, before, 'a failed multi-resource spend is atomic');
});

test('fractional meals consume reward Food without corrupting its origin ledger', () => {
  const state = island(); receiveMaterials(state, { food: 10 });
  consumeMaterial(state, 'food', 0.5);
  assert.equal(state.resources.food, 509.5);
  assert.equal(bonusStock(state, 'food'), 9.5);
  assert.equal(ordinaryStock(state, 'food'), 500);
});

test('legacy pending and task reward buffers migrate exactly once without losing goods', () => {
  const original = island(); original.resources.wood = 1000;
  delete original.bonusInventoryVersion; delete original.bonusMaterials;
  original.pendingDeliveries.wood = 200; original.rewardBuffer.wood = 300;
  const state = reload(original);
  assert.equal(state.resources.wood, 1500);
  assert.equal(bonusStock(state, 'wood'), 500);
  assert.equal(ordinaryStock(state, 'wood'), 1000);
  assert.equal(state.pendingDeliveries.wood, 0);
  assert.equal(state.rewardBuffer.wood, 0);
  const again = reload(state);
  assert.equal(again.resources.wood, 1500);
  assert.equal(bonusStock(again, 'wood'), 500);
});

test('a full material reward survives inbound reservations and remains immediately available', () => {
  const state = island(); state.resources.wood = 880;
  state.haulTrips.warehouse.push({ kind: 'producer', resource: 'wood', amount: 120, remaining: 100, producer: 'lumber', worker: -1 });
  receiveMaterials(state, { wood: 369 });
  assert.equal(state.resources.wood, 1249);
  assert.equal(bonusStock(state, 'wood'), 369);
  assert.equal(centralAvailable(state, 'wood'), 1249);
  advanceLogistics(state, 100);
  assert.equal(state.resources.wood, 1369);
  assert.equal(ordinaryStock(state, 'wood'), 1000);
  assert.equal(bonusStock(state, 'wood'), 369);
});

test('instant producer delivery refuses space reserved by ordinary inbound cargo', () => {
  const state = island(); state.resources.stone = 880; state.buildings.quarry.ready = 120;
  state.haulTrips.warehouse.push({ kind: 'producer', resource: 'stone', amount: 120, remaining: 100, producer: 'quarry', worker: -1 });
  const before = structuredClone(state);
  assert.equal(quoteInstantTransport(state, { route: 'producer', building: 'quarry' }).ok, false);
  assert.equal(instantTransport(state, { route: 'producer', building: 'quarry' }).ok, false);
  assert.deepEqual(state.resources, before.resources);
  assert.equal(state.buildings.quarry.ready, 120);
  assert.equal(state.haulTrips.warehouse.length, 1);
});

test('an instant ordinary delivery can still use capacity beside bonus overflow', () => {
  const state = island(); state.resources.stone = 800;
  receiveMaterials(state, { stone: 400 }); state.buildings.quarry.ready = 200;
  assert.equal(instantTransport(state, { route: 'producer', building: 'quarry' }).ok, true);
  assert.equal(state.resources.stone, 1400);
  assert.equal(ordinaryStock(state, 'stone'), 1000);
  assert.equal(bonusStock(state, 'stone'), 400);
});

test('instant return of unreserved Market stock does not cancel earlier normal dispatch', () => {
  const state = island(); state.market.stock.wood = 200; state.market.dispatch.wood = 100;
  state.market.lots = [{ resource: 'wood', amount: 200, remaining: 80000 }];
  assert.equal(instantTransport(state, { route: 'marketOutbound', resource: 'wood', amount: 100 }).ok, true);
  assert.equal(state.market.stock.wood, 100);
  assert.equal(state.market.dispatch.wood, 100);
  crew(state, 'market', 1); advanceLogistics(state, 300);
  assert.equal(state.resources.wood, 200);
  assert.equal(state.market.dispatch.wood, 0);
});

test('Warehouse levels above its capacity cap only raise staffing, not cargo or meal reserve', () => {
  const state = island(); state.buildings.warehouse.level = 24;
  const limits = warehouseLimits(state), cargo = haulCapacity(state), food = foodReserve(state);
  state.buildings.warehouse.level = 25;
  assert.deepEqual(warehouseLimits(state), limits);
  assert.equal(haulCapacity(state), cargo);
  assert.equal(foodReserve(state), food);
  state.buildings.market.level = 24; const market = haulCapacity(state, 'market');
  state.buildings.market.level = 25;
  assert.ok(haulCapacity(state, 'market') > market, 'the cap is not imposed on other workplaces');
  state.roads.segments.fill(3);
  assert.ok(haulCapacity(state) > cargo, 'independent completed road improvements still apply');
});

test('ship cargo picked before expiry survives both legs, a crew gap and reloading', () => {
  let state = island();
  assert.equal((buyWood(state)).ok, true);
  advanceLogistics(state, 300 + 86399);
  crew(state, 'dock', 1); advanceLogistics(state, 1);
  assert.equal(state.dock.orders[0].expiredAmount, 80);
  advanceLogistics(state, 299);
  assert.equal(state.dock.stock.wood, 120);
  assert.equal(state.dock.lots[0].protected, true);
  crew(state, 'dock', 0); advanceLogistics(state, 86400);
  state = reload(state);
  assert.equal(state.dock.stock.wood, 120);
  assert.equal(state.dock.lots[0].protected, true);
  crew(state, 'dock', 1); advanceLogistics(state, 300);
  assert.equal(state.resources.wood, 120);
  assert.equal(state.dock.stock.wood, 0);
  assert.equal(state.dock.orders[0].expiredAmount, 80);
});

// Keep the order fixture on the public logistics command path.
import { logisticsAction } from '../harborlight-v1-logistics.js';
function buyWood(state) { return logisticsAction(state, { type: 'trade', resource: 'wood', direction: 'buy', amount: 200 }); }


test('transport activity changes remaining travel speed without changing carried quantity', () => {
  const state = island(); state.buildings.lumber.ready = 120; crew(state, 'warehouse', 1);
  state.engagement = { activeUntil: NOW + 300000, lastRealActivityAt: NOW, firstAnchorAt: NOW };
  advanceLogistics(state, 150);
  assert.equal(state.resources.wood, 120);
  const abandoned = island(); abandoned.buildings.lumber.ready = 120; crew(abandoned, 'warehouse', 1);
  abandoned.engagement = { activeUntil: 0, lastRealActivityAt: NOW - 48 * 3600000, firstAnchorAt: NOW - 48 * 3600000 };
  advanceLogistics(abandoned, 300);
  assert.equal(abandoned.resources.wood, 0);
  assert.equal(abandoned.haulTrips.warehouse[0].amount, 120);
  assert.equal(abandoned.haulTrips.warehouse[0].remaining, 150);
  advanceLogistics(abandoned, 300);
  assert.equal(abandoned.resources.wood, 120);
});


test('bonus Food cannot consume the ordinary emergency Food delivery reserve', () => {
  const state = island(); Object.assign(state.resources, { wood: 1000, stone: 1000, grain: 1000, planks: 950, food: 0 });
  receiveMaterials(state, { food: 100 });
  assert.equal(stockRoom(state, 'planks'), 0);
  assert.equal(centralRoom(state, 'planks'), 0);
  consumeMaterial(state, 'food', 100);
  assert.equal(centralRoom(state, 'food'), 50);
  receiveMaterials(state, { food: 50 }, { bonus: false });
  assert.equal(ordinaryStock(state, 'food'), 50);
});
