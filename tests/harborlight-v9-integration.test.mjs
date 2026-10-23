import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, tick, advanceTo, taxRate, resourceRates, residentPurchaseQuote, canAfford, recordVisit, updateHappiness, applyBuildTestStock } from '../harborlight-v1-state.js';
import { centralReserved, centralAvailable, availableGoods, constructionCounts, foodReserve, warehouseUsed } from '../harborlight-v1-logistics.js';
import { residentHappiness, hasFoodForResidents } from '../harborlight-v1-residents.js';
import { activePlayMultiplier } from '../harborlight-v1-progression.js';
import { nextWarsawMidnightMs, warsawDayKey } from '../harborlight-v1-calendar.js';

const START = Date.parse('2026-10-23T10:00:00Z');
const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
function funded(level = 2, amount = 550) {
  const state = createState(START);
  state.buildings.townhall.level = level;
  state.buildings.house.level = level;
  state.buildings.warehouse.level = level;
  state.capacity = 24 * level;
  state.resources.coins = 1000000;
  for (const id of MATERIALS) state.resources[id] = amount;
  return state;
}
function arrived(state, building, count = 1) {
  assert.equal(act(state, { type: 'assign', building, delta: count }).ok, true);
  for (const person of state.residents.filter(person => person.workplace === building)) person.arrivalRemaining = 0;
}
const reload = state => normalizeState(JSON.parse(JSON.stringify(state)), state.worldTimeMs);

test('schema9 starts with normal resources and preserves language/filter settings through reload', () => {
  const state = createState(START);
  assert.equal(state.version, 9);
  assert.deepEqual(Object.values(state.resources), [100, 100, 100, 100, 100, 100]);
  assert.equal(act(state, { type: 'setting', key: 'language', value: 'pl' }).ok, true);
  assert.equal(act(state, { type: 'setting', key: 'notificationCategories', value: { storage: false, tasks: true } }).ok, true);
  const saved = reload(state);
  assert.equal(saved.settings.language, 'pl');
  assert.deepEqual(saved.settings.notificationCategories, { storage: false, tasks: true });
  const before = JSON.stringify(saved);
  assert.equal(act(saved, { type: 'setting', key: 'language', value: 'xx' }).ok, false);
  assert.equal(JSON.stringify(saved), before);
});

test('active play doubles production and taxes for five real minutes without doubling meals', () => {
  const state = createState(START);
  arrived(state, 'farm');
  assert.equal(act(state, { type: 'userActivity', visible: true, focused: true }).ok, true);
  assert.equal(taxRate(state), 2);
  tick(state, 360);
  assert.equal(state.buildings.farm.ready, 1);
  near(state.buildings.farm.workProgress[0], 300);
  near(state.taxProgress, 660 / 3600);
  near(state.resources.food + state.foodCredit, 100 - 12 * 360 / 3600);
  assert.equal(activePlayMultiplier(state), 1);
  assert.equal(taxRate(state), 1);
});

test('offline reload applies only the remaining active bonus and does not refresh it', () => {
  const state = createState(START);
  arrived(state, 'farm');
  act(state, { type: 'userActivity', visible: true, focused: true });
  const saved = reload(state);
  advanceTo(saved, START + 360000);
  assert.equal(saved.buildings.farm.ready, 1);
  near(saved.buildings.farm.workProgress[0], 300);
  assert.equal(activePlayMultiplier(saved), 1);
  const before = JSON.stringify(saved);
  assert.equal(advanceTo(saved, START + 360000), 0);
  assert.equal(JSON.stringify(saved), before);
});

test('active play stacks with Lighthouse/Chapel but never accelerates carrier courses', () => {
  const state = createState(START);
  arrived(state, 'farm'); arrived(state, 'warehouse');
  state.lighthouseRemaining = 1000; state.chapelRemaining = 1000;
  state.buildings.lumber.ready = 60;
  act(state, { type: 'userActivity', visible: true, focused: true });
  assert.equal(taxRate(state), 8);
  assert.equal(resourceRates(state).grain.production, 40);
  tick(state, 299);
  assert.equal(state.resources.wood, 100);
  tick(state, 1);
  assert.equal(state.resources.wood, 160);
});

test('physical construction reservations remain in storage until actual pickup', () => {
  const state = funded();
  state.buildings.house.level = 1;
  state.resources.food = 600;
  arrived(state, 'warehouse');
  const initialCoins = state.resources.coins;
  assert.equal(act(state, { type: 'upgrade', building: 'house' }).ok, true);
  assert.equal(state.resources.wood, 550);
  assert.equal(centralReserved(state, 'wood'), 500);
  assert.equal(availableGoods(state, 'wood'), 50);
  assert.equal(state.resources.coins, initialCoins - 500);
  const saved = reload(state);
  assert.equal(saved.resources.wood, 550);
  assert.equal(centralReserved(saved, 'wood'), 500);
  tick(saved, 1);
  assert.equal(saved.resources.wood, 484);
  assert.equal(centralReserved(saved, 'wood'), 434);
  assert.equal(saved.haulTrips.warehouse[0].amount, 66);
  assert.equal(canAfford(saved, { wood: 51 }), false);
});

test('cancelling before pickup releases reservations and refunds coins without duplicating stock', () => {
  const state = funded(); state.buildings.house.level = 1;
  state.resources.food = 600;
  const initial = { ...state.resources };
  const started = act(state, { type: 'upgrade', building: 'house' });
  assert.equal(started.ok, true);
  assert.equal(act(state, { type: 'cancelConstruction', project: started.project.order, order: started.project.order }).ok, true);
  assert.deepEqual(state.resources, initial);
  assert.equal(centralReserved(state, 'wood'), 0);
  assert.equal(availableGoods(state, 'wood'), 550);
});

test('meals can use protected Food but cannot eat Food reserved for construction', () => {
  const state = funded(2, 600); state.buildings.house.level = 1;
  assert.equal(act(state, { type: 'upgrade', building: 'house' }).ok, true);
  assert.equal(centralReserved(state, 'food'), 500);
  tick(state, 9 * 3600);
  assert.equal(state.resources.food, 500);
  near(state.foodCredit, 0);
  assert.equal(centralAvailable(state, 'food'), 0);
  assert.equal(hasFoodForResidents(state), false);
});

test('buying a resident charges the full next achieved Town Hall cost and creates a frozen newcomer', () => {
  const state = funded(1, 550);
  const quote = residentPurchaseQuote(state);
  assert.equal(quote.ok, true);
  assert.deepEqual(quote.cost, Object.fromEntries(Object.keys(state.resources).map(id => [id, 500])));
  assert.equal(act(state, { type: 'buyResident' }).ok, true);
  assert.equal(state.population, 13);
  for (const id of MATERIALS) assert.equal(state.resources[id], 50);
  const person = state.residents.at(-1);
  assert.equal(person.newbornRemaining, 86400);
  assert.equal(person.workplace, null);
  assert.equal(residentHappiness(state, person), 0);
  const before = JSON.stringify(state);
  assert.equal(act(state, { type: 'buyResident', quantity: 12 }).ok, false);
  assert.equal(JSON.stringify(state), before);
});

test('full building purchases use separate ten-second service slots even when normal slots are full', () => {
  const state = funded(4, 2000);
  state.buildings.house.level = 1;
  for (const building of ['farm', 'sawmill', 'quarry', 'lumber']) assert.equal(act(state, { type: 'upgrade', building }).ok, true, building);
  assert.equal(constructionCounts(state).active, 4);
  assert.equal(act(state, { type: 'premiumBuyBuilding', building: 'house' }).ok, true);
  assert.equal(act(state, { type: 'premiumBuyBuilding', building: 'dock' }).ok, true);
  assert.equal(state.premiumServices.length, 2);
  assert.equal(constructionCounts(state).active, 4);
  const saved = reload(state);
  assert.equal(saved.premiumServices.length, 2);
  tick(saved, 9);
  assert.equal(saved.buildings.house.level, 1);
  assert.equal(saved.buildings.dock.level, 1);
  tick(saved, 1);
  assert.equal(saved.buildings.house.level, 2);
  assert.equal(saved.buildings.dock.level, 2);
  assert.equal(saved.premiumServices.length, 0);
  assert.equal(constructionCounts(saved).active, 4);
});

test('a purchased upgrade cannot race a normal level of the same building', () => {
  const state = funded(4, 2000); state.buildings.house.level = 1;
  assert.equal(act(state, { type: 'upgrade', building: 'house' }).ok, true);
  const before = state.resources.coins;
  assert.equal(act(state, { type: 'premiumBuyBuilding', building: 'house' }).ok, false);
  assert.equal(state.resources.coins, before);
  assert.equal(state.premiumServices.length, 0);
});

test('resource trends use production minus processing and meals, not warehouse cargo', () => {
  const state = createState(START);
  arrived(state, 'farm', 2); arrived(state, 'windmill'); arrived(state, 'sawmill');
  const rates = resourceRates(state);
  assert.equal(rates.grain.production, 20);
  assert.equal(rates.grain.consumption, 20);
  assert.equal(rates.grain.net, 0);
  assert.equal(rates.wood.net, -20);
  assert.equal(rates.food.net, -2);
  state.haulTrips.warehouse.push({ resource: 'food', amount: 60, remaining: 300, worker: 0, kind: 'producer' });
  assert.deepEqual(resourceRates(state), rates);
});

test('House points can improve effective happiness when intrinsic happiness is already100', () => {
  const state = createState(START);
  arrived(state, 'quarry');
  state.buildings.quarry.ready = 200;
  state.buildings.quarry.productionBlocked = true;
  state.buildings.quarry.fullSeconds = 86400;
  const person = state.residents.find(person => person.workplace === 'quarry');
  person.happiness = 100;
  person.blockedSeconds = 86400;
  updateHappiness(state);
  assert.equal(residentHappiness(state, person), 80);
  assert.equal(act(state, { type: 'houseHappiness', residentId: person.id, amount: 1 }).ok, true);
  assert.equal(residentHappiness(state, person), 81);
  assert.equal(person.happiness, 101);
  assert.equal(state.buildings.quarry.fullSeconds, 86400);
  const saved = reload(state);
  assert.equal(residentHappiness(saved, saved.residents.find(p => p.id === person.id)), 81);
});

test('daily House pool expires at Warsaw midnight without accumulating blocked points', () => {
  const state = createState(Date.parse('2026-10-23T21:59:00Z'));
  for (const person of state.residents) person.happiness = 100;
  updateHappiness(state);
  state.houseHappinessPool.points = 4;
  tick(state, 60);
  assert.equal(warsawDayKey(state.worldTimeMs), '2026-10-24');
  assert.equal(state.houseHappinessPool.points, state.population);
  assert.equal(state.houseHappinessPool.generation, 2);
  assert.equal(state.houseHappinessPool.autoDone, false);
});

test('calendar midnight keeps a 25-hour autumn day while effect durations remain real seconds', () => {
  const midnight = Date.parse('2026-10-24T22:00:00Z');
  assert.equal(nextWarsawMidnightMs(midnight) - midnight, 25 * 3600000);
  const state = createState(midnight);
  state.blessingRemaining = 3600;
  tick(state, 3600);
  assert.equal(state.blessingRemaining, 0);
  assert.equal(state.houseHappinessPool.refreshRemaining, 24 * 3600);
});

test('uncollected blessing materials refill automatically without carriers and preserve total goods', () => {
  const state = createState(START);
  Object.assign(state.resources, { wood: 1000, stone: 1000, grain: 1000, planks: 950, food: 50 });
  assert.equal(warehouseUsed(state), 4000);
  assert.equal(act(state, { type: 'blessing' }).ok, true);
  assert.equal(Object.values(state.pendingDeliveries).reduce((a, b) => a + b, 0), 250);
  assert.equal(act(state, { type: 'upgradeRoad', level: 1 }).ok, true);
  assert.equal(warehouseUsed(state), 4000);
  assert.equal(Object.values(state.pendingDeliveries).reduce((a, b) => a + b, 0), 150);
  assert.equal(state.buildings.warehouse.workers, 0);
  assert.ok(state.resources.food >= foodReserve(state));
});

test('loyalty closure survives recordVisit and saved reload at Town Hall4', () => {
  const state = createState(START);
  recordVisit(state, START);
  state.buildings.townhall.level = 4;
  recordVisit(state, START + 86400000);
  assert.equal(state.loyalty.closed, true);
  assert.equal(state.loyalty.closedReason, 'townhall-level-4');
  const saved = reload(state);
  assert.equal(saved.loyalty.closed, true);
});

test('the old one-time building preview stock marker is not renewed for release13', () => {
  const state = createState(START);
  assert.equal(applyBuildTestStock(state), true);
  state.resources.coins = 321;
  state.resources.wood = 12;
  const saved = reload(state);
  assert.equal(applyBuildTestStock(saved), false);
  assert.equal(saved.resources.coins, 321);
  assert.equal(saved.resources.wood, 12);
});
