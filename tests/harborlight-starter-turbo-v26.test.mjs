import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, advanceTo, buildingCost, requestUpgrade, residentPurchaseQuote } from '../harborlight-v1-state.js';
import { MATERIAL_IDS, advanceLogistics, nextLogisticsEvent, constructionEstimate, constructionScheduleEstimate, starterConstructionTiming, cancelConstruction } from '../harborlight-v1-logistics.js';

const NOW = Date.UTC(2026, 10, 1, 12);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
function starter({ level = 1, ready = true, fund = true } = {}) {
  const state = createState(NOW);
  state.buildings.townhall.level = level;
  state.capacity = 24 * level;
  assert.equal(act(state, { type: 'assign', building: 'warehouse', delta: 6 }, NOW).ok, true);
  if (ready) for (const resident of state.residents) resident.arrivalRemaining = 0;
  if (fund) for (const resource of Object.keys(state.resources)) state.resources[resource] = 100000;
  return state;
}

// Historical snapshots are literal saved-project data, not a new timing API.
// This keeps the old-save contract testable after retiring introductory clocks.
const OLD_TH1 = { version:1, level:1, carriers:6, capacity:120, trips:5, waves:1, transportDuration:30, buildingDuration:60, courseSeconds:30 };
const OLD_LH1 = { version:1, level:1, carriers:6, capacity:120, trips:25, waves:5, transportDuration:30, buildingDuration:240, courseSeconds:6 };
const OLD_TH2 = { version:1, level:2, carriers:6, capacity:120, trips:45, waves:8, transportDuration:120, buildingDuration:300, courseSeconds:15 };
function historicalOrder(state, building, timing) {
  const result = requestUpgrade(state, { building });
  assert.equal(result.ok,true);
  delete result.project.economyTiming;delete result.project.economyVersion;
  result.project.starterTurbo = structuredClone(timing);
  return result;
}

test('three actual introductory assignments unlock the price milestone without bypassing two-minute walks', () => {
  const state = createState(NOW);
  assert.equal(act(state, { type:'assign', building:'warehouse', delta:2 }, NOW).ok,true);
  assert.equal(state.starterTurbo,null); assert.equal(buildingCost(state,'townhall').wood,500);
  assert.equal(act(state, { type:'assign', building:'warehouse', delta:1 }, NOW).starterTurboUnlocked,true);
  assert.equal(state.residents.filter(person=>person.workplace==='warehouse').every(person=>person.arrivalRemaining===120),true);
  const daughter=createState(NOW);daughter.islandRole='daughter';daughter.islandId='island-2';
  act(daughter,{type:'assign',building:'warehouse',delta:6},NOW);assert.equal(daughter.starterTurbo,null);
});

test('first Town Hall retains its 100-each price and food reserve with the new fixed budget', () => {
  const state = starter({ fund: false });
  assert.deepEqual(buildingCost(state, 'townhall'), { coins: 100, wood: 100, stone: 100, grain: 100, food: 100, planks: 100 });
  assert.equal(residentPurchaseQuote(state).unitCost.wood, 500);
  assert.equal(requestUpgrade(state, { building: 'townhall' }).ok, false);
  state.resources.food += 50;
  const order = requestUpgrade(state, { building: 'townhall' });
  assert.equal(order.ok, true); assert.equal(state.resources.food, 150);
  nextLogisticsEvent(state);
  assert.equal(state.resources.food, 150);
  assert.equal(state.haulTrips.warehouse.length, 3);
  assert.equal(state.haulTrips.warehouse.every(trip => trip.amount === 100 && trip.economyClock && !trip.starterTurboClock), true);
  assert.equal(order.project.goodsRemaining, 500);
  advanceLogistics(state, 8.999);
  assert.equal(order.project.stage, 'transport'); assert.equal(order.project.delivered.wood, 0);
  advanceLogistics(state, 9.001);
  assert.equal(state.resources.food,50);
  assert.equal(order.project.stage, 'building'); close(order.project.buildRemaining, 27);
  assert.equal(order.project.goodsRemaining, 0);
  assert.equal(MATERIAL_IDS.every(resource => order.project.delivered[resource] === 100), true);
  advanceLogistics(state, 27);
  assert.equal(state.buildings.townhall.level, 2);
  assert.equal(state.constructionProjects.length, 0);
  assert.equal(buildingCost(state, 'townhall').wood, 1000);
});

test('a saved level-one Lighthouse still hauls real cargo in its historical 30 seconds', () => {
  const state = starter();
  const order = historicalOrder(state, 'lighthouse', OLD_LH1);
  assert.equal(order.ok, true);
  assert.equal(order.project.starterTurbo.trips, 25);
  assert.equal(order.project.starterTurbo.waves, 5);
  assert.equal(order.project.starterTurbo.courseSeconds, 6);
  assert.equal(constructionScheduleEstimate(state, order.project).transport, 30);
  nextLogisticsEvent(state);
  assert.equal(state.haulTrips.warehouse.length, 6);
  assert.equal(state.haulTrips.warehouse.every(trip => trip.amount <= 120), true);
  advanceLogistics(state, 30);
  assert.equal(order.project.stage, 'building'); close(order.project.transportSeconds, 30);
  assert.equal(MATERIAL_IDS.every(resource => order.project.delivered[resource] === 500), true);
});

test('a saved level-two Town Hall retains 120-second transport and 300-second construction', () => {
  const state = starter({ level: 2 });
  state.engagement.activeUntil = NOW + 3600000;
  const order = historicalOrder(state,'townhall',OLD_TH2);
  const estimate = constructionScheduleEstimate(state, order.project);
  close(estimate.transport, 120); close(estimate.building, 300);
  assert.equal(order.project.starterTurbo.courseSeconds, 15);
  advanceLogistics(state, 60, 2);
  assert.equal(order.project.stage, 'transport');
  advanceLogistics(state, 60, .1);
  assert.equal(order.project.stage, 'building'); close(order.project.buildRemaining, 300);
  advanceLogistics(state, 299.999, 2); assert.equal(state.buildings.townhall.level, 2);
  advanceLogistics(state, .001, .1); assert.equal(state.buildings.townhall.level, 3);
});

test('new timing previews use the new fixed budget at every level and building, including saved course5',()=>{
  for(const level of [1,2,3]) for(const curriculum of [5,6]) {
    const state=starter({level});state.tutorial.curriculum=curriculum;
    for(const building of ['house','warehouse','chapel','lighthouse']) {
      assert.equal(starterConstructionTiming(state,{building,targetLevel:2,cost:{wood:1000}}),null);
    }
    const ordered=requestUpgrade(state,{building:level===1?'townhall':'house'});assert.equal(ordered.ok,true);
    const project=ordered.project;
    assert.equal(project.starterTurbo,undefined);
    nextLogisticsEvent(state);
    assert.ok(state.haulTrips.warehouse.length>0);
    assert.equal(state.haulTrips.warehouse.every(trip=>trip.remaining===project.economyTiming.courseSeconds&&trip.economyClock&&!trip.starterTurboClock),true);
  }
});

test('save/load and a later Town Hall level preserve existing starter prices, cargo and clocks', () => {
  const state = starter();
  const order = historicalOrder(state, 'lighthouse', OLD_LH1);
  advanceLogistics(state, 13);
  state.buildings.townhall.level = 3; // A separately completed project must not reprice this one.
  const saved = JSON.parse(JSON.stringify(state));
  const restored = normalizeState(saved, NOW);
  const project = restored.constructionProjects.find(item => item.order === order.project.order);
  assert.deepEqual(project.starterTurbo, order.project.starterTurbo);
  assert.deepEqual(project.cost, order.project.cost);
  assert.equal(restored.haulTrips.warehouse.every(trip => trip.starterTurboClock === true), true);
  close(constructionEstimate(restored, project).transport, 17);
  advanceLogistics(restored, 17, .1);
  assert.equal(project.stage, 'building'); close(project.buildRemaining, 240);
  advanceLogistics(restored, 240);
  assert.equal(restored.buildings.lighthouse.level, 1);
  assert.equal(starterConstructionTiming(restored, { building: 'farm', cost: { wood: 100 } }), null);
});

test('offline catch-up includes the initial carrier walk without starting the island over', () => {
  const state = starter({ ready: false });
  const order = requestUpgrade(state, { building: 'townhall' });
  assert.equal(constructionEstimate(state, order.project).workers, 0);
  close(constructionScheduleEstimate(state, order.project).total, 165);
  advanceTo(state, NOW + 137000);
  assert.equal(state.buildings.townhall.level, 1);
  assert.equal(order.project.stage, 'transport');
  advanceTo(state, NOW + 165000);
  assert.equal(state.buildings.townhall.level, 2);
});

test('old orders retain five-minute cargo while new level-three orders use a new snapshot', () => {
  const old = createState(NOW);
  for (const resource of Object.keys(old.resources)) old.resources[resource] = 10000;
  const legacy = requestUpgrade(old, { building: 'townhall' }).project;
  delete legacy.economyTiming;delete legacy.economyVersion;
  assert.equal(legacy.cost.wood, 500); assert.equal(legacy.starterTurbo, undefined);
  act(old, { type: 'assign', building: 'warehouse', delta: 6 }, NOW);
  for (const person of old.residents) person.arrivalRemaining = 0;
  nextLogisticsEvent(old);
  assert.equal(legacy.cost.wood, 500); assert.equal(legacy.starterTurbo, undefined);
  assert.equal(old.haulTrips.warehouse.every(trip => trip.remaining === 300 && !trip.starterTurboClock), true);
  const later = starter(); later.buildings.townhall.level = 3;
  const ordinary = requestUpgrade(later, { building: 'house' }).project;
  assert.equal(ordinary.starterTurbo, undefined);
  nextLogisticsEvent(later);
  assert.equal(later.haulTrips.warehouse.every(trip => trip.remaining === ordinary.economyTiming.courseSeconds && trip.economyClock && !trip.starterTurboClock), true);
});

test('cancelling before pickup restores coins and releases physical reserved goods', () => {
  const state = starter({ ready: false });
  const before = { ...state.resources };
  const project = requestUpgrade(state, { building: 'townhall' }).project;
  assert.equal(cancelConstruction(state, project.order).ok, true);
  assert.deepEqual(state.resources, before);
  assert.equal(state.haulTrips.warehouse.length, 0);
});

test('a missing carrier in a saved turbo project pauses new pickups without losing already loaded cargo', () => {
  const state = starter({ level: 2 });
  const project = historicalOrder(state,'townhall',OLD_TH2).project;
  advanceLogistics(state, 5);
  const carrier = state.residents.find(person => person.workplace === 'warehouse');
  carrier.arrivalRemaining = 100;
  advanceLogistics(state, 10);
  const delivered = MATERIAL_IDS.reduce((sum, resource) => sum + project.delivered[resource], 0);
  assert.equal(delivered, 720);
  assert.equal(state.haulTrips.warehouse.length, 0);
  assert.equal(constructionEstimate(state, project).waitingForCarriers, true);
  advanceLogistics(state, 20);
  assert.equal(MATERIAL_IDS.reduce((sum, resource) => sum + project.delivered[resource], 0), delivered);
  carrier.arrivalRemaining = 0;
  advanceLogistics(state, 105);
  assert.equal(project.stage, 'building');
  close(project.buildRemaining, 300);
  assert.equal(MATERIAL_IDS.every(resource => project.delivered[resource] === 1000), true);
});

test('locked Market and Harbor reject ordinary, forecast and premium upgrade entry paths', () => {
  const state = starter();
  for (const building of ['market', 'dock']) for (const extra of [{}, { forecast: true }, { premiumService: true, paidMaterials: true, paidCoins: true, skipTransport: true }]) {
    const resources = { ...state.resources };
    assert.equal(requestUpgrade(state, { building, ...extra }).ok, false);
    assert.deepEqual(state.resources, resources);
  }
  assert.equal(state.constructionProjects.length, 0);
  assert.equal(state.premiumServices.length, 0);
});

test('learning positions and ad cooldown persist during the frozen introduction without rewards or clock movement', () => {
  const state = createState(NOW, { onboarding: true });
  const resources = { ...state.resources };
  const patch = { tour: { index: 12, active: false, paused: true, completed: false }, practical: { reviewIndex: 7, reviewActive: false, reviewPaused: true }, adsNotBeforeActiveSeconds: 3600.25 };
  assert.equal(act(state, { type: 'learningUpdate', patch }, NOW + 86400000).ok, true);
  assert.equal(state.worldTimeMs, NOW); assert.deepEqual(state.resources, resources);
  const restored = normalizeState(JSON.parse(JSON.stringify(state)), NOW + 86400000);
  assert.deepEqual(restored.learning, { version:1, ...patch, tour:{...patch.tour,routeVersion:3} });
  assert.equal(act(state, { type: 'learningUpdate', patch: { practical: { reviewIndex: 25 } } }, NOW).ok, false);
  assert.equal(act(state, { type: 'learningUpdate', patch: { tour: { paused: 'yes' } } }, NOW).ok, false);
});
