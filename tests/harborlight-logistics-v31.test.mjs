import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, requestUpgrade, act, tick } from '../harborlight-v1-state.js';
import { MATERIAL_IDS, advanceLogistics, nextLogisticsEvent, centralRoom, centralAvailable,
  constructionEstimate, constructionScheduleEstimate, warehouseDispatchStatus } from '../harborlight-v1-logistics.js';

const NOW = Date.parse('2026-11-04T12:00:00Z');
const near = (a,b) => assert.ok(Math.abs(a-b) < 1e-5, `${a} != ${b}`);
function island(carriers = 3, level = 8) {
  let s = createState(NOW);
  s.buildings.townhall.level = level; s.capacity = 24 * level;
  s.buildings.windmill.level = 2;
  s.buildings.warehouse.level = carriers > 12 ? 2 : 1;
  if (carriers > s.population) { s.population = 24; s = normalizeState(s,NOW); }
  s.resources = { coins:10000, ...Object.fromEntries(MATERIAL_IDS.map(id => [id,1000])) };
  for (const p of s.residents) { p.workplace = null; p.arrivalRemaining = 0; p.returnRemaining = 0; p.visitGroup = null; p.pendingRelease = false; }
  for (let i = 0; i < carriers; i++) s.residents[i].workplace = 'warehouse';
  s.buildings.warehouse.workers = carriers; s.buildings.warehouse.workProgress = Array(carriers).fill(0);
  s.warehousePriorities = ['food']; s.buildings.windmill.ready = 400;
  return s;
}
function build(s, building = 'house') {
  const result = requestUpgrade(s,{building}); assert.equal(result.ok,true,result.message); return result.project;
}

test('a hypothetical building cost uses its computed reference clock and the actual ready crew', () => {
  const s = island(); s.buildings.windmill.ready = 0;
  const before = JSON.stringify(s), quote = constructionEstimate(s,{wood:100},'lighthouse');
  assert.equal(quote.workers,3); assert.equal(quote.waitingForCarriers,false);
  assert.ok(Number.isFinite(quote.total)); assert.equal(JSON.stringify(s),before);
});

test('three reference carriers collect a full Mill while the other two keep building', () => {
  const s = island(), p = build(s), before = JSON.stringify(s);
  const status = warehouseDispatchStatus(s), estimate = constructionScheduleEstimate(s,p);
  assert.equal(JSON.stringify(s),before,'diagnostics and ETA must be read-only');
  assert.equal(status.readyCrew,3); assert.equal(status.constructionCrew,2); assert.equal(status.utilityCrew,1);
  assert.equal(status.waitReason,'food-collection-crew-reserved');
  assert.equal(status.centralFoodRoom,centralRoom(s,'food')); assert.ok(Number.isFinite(estimate.total));
  advanceLogistics(s,1800);
  assert.equal(s.buildings.windmill.ready,0); assert.equal(s.resources.food,1400);
  assert.ok(p.goodsRemaining < p.goodsTotal,'production pickup must not freeze construction');
  const rest = constructionScheduleEstimate(s,p); advanceLogistics(s,rest.transport);
  assert.equal(p.stage,'building'); near(p.buildRemaining,rest.building);
  advanceLogistics(s,rest.building); assert.equal(s.buildings.house.level,2);
  for (const id of MATERIAL_IDS.filter(id => id !== 'food')) assert.equal(s.resources[id],500);
  assert.equal(s.resources.food,900,'all four hundred Mill goods arrive and the exact five hundred building food is consumed');
});

test('urgent food uses available meals rather than construction-pledged food', () => {
  const s = island(); s.warehousePriorities = ['construction'];
  s.resources.food = 550; const p = build(s);
  s.resources.food = 501;
  assert.equal(centralAvailable(s,'food'),1); assert.equal(warehouseDispatchStatus(s).urgentFood,true);
  nextLogisticsEvent(s);
  assert.ok(s.haulTrips.warehouse.some(trip => trip.kind === 'producer' && trip.resource === 'food'));
  assert.ok(s.haulTrips.warehouse.some(trip => trip.kind === 'construction' && trip.projectOrder === p.order));
});

test('twenty carriers do not park on an excluded construction priority before collecting food', () => {
  const s = island(20); s.warehousePriorities = ['construction','food']; const p = build(s);
  assert.equal(warehouseDispatchStatus(s).constructionCrew,3); assert.equal(warehouseDispatchStatus(s).utilityCrew,17);
  nextLogisticsEvent(s);
  assert.equal(s.haulTrips.warehouse.filter(trip => trip.kind === 'construction').length,3);
  assert.equal(s.haulTrips.warehouse.filter(trip => trip.kind === 'producer' && trip.resource === 'food').reduce((sum,trip) => sum+trip.amount,0),400);
  advanceLogistics(s,300);
  assert.equal(s.buildings.windmill.ready,0); assert.equal(s.resources.food,1400);
  assert.ok(p.goodsRemaining > 0,'extra carriers cannot silently replace the reference construction clock');
});

test('a lone carrier alternates real Mill pickup and construction with a finite saved schedule', () => {
  let s = island(1,3), p = build(s);
  assert.equal(warehouseDispatchStatus(s).sharedCarrier,true);
  const estimate = constructionScheduleEstimate(s,p); assert.ok(Number.isFinite(estimate.total));
  nextLogisticsEvent(s); assert.equal(s.haulTrips.warehouse[0].kind,'producer');
  advanceLogistics(s,150); const goodsBefore = s.resources.food;
  s = normalizeState(JSON.parse(JSON.stringify(s)),NOW); p = s.constructionProjects.find(item => item.order === p.order);
  assert.equal(s.resources.food,goodsBefore); assert.equal(s.haulTrips.warehouse[0].kind,'producer');
  const remaining = constructionScheduleEstimate(s,p); assert.ok(Number.isFinite(remaining.total));
  advanceLogistics(s,remaining.transport); assert.equal(p.stage,'building');
  assert.equal(s.buildings.windmill.ready,0); near(p.buildRemaining,remaining.building);
  advanceLogistics(s,remaining.building); assert.equal(s.buildings.house.level,2);
});

test('an old six-carrier turbo save finishes with three actual carriers without repricing or resetting cargo', () => {
  let s = island(3,1); s.buildings.windmill.ready = 0; s.warehousePriorities = ['construction'];
  const p = build(s,'lighthouse');
  delete p.economyTiming; delete p.economyVersion;
  p.starterTurbo = { version:1,level:1,carriers:6,capacity:120,trips:25,waves:5,transportDuration:30,buildingDuration:240,courseSeconds:6 };
  advanceLogistics(s,13); const cost = structuredClone(p.cost), clock = structuredClone(p.starterTurbo);
  const carried = s.haulTrips.warehouse.reduce((sum,trip) => sum+trip.amount,0), delivered = Object.values(p.delivered).reduce((a,b) => a+b,0);
  s = normalizeState(JSON.parse(JSON.stringify(s)),NOW); const restored = s.constructionProjects.find(item => item.order === p.order);
  assert.deepEqual(restored.cost,cost); assert.deepEqual(restored.starterTurbo,clock);
  assert.equal(s.haulTrips.warehouse.reduce((sum,trip) => sum+trip.amount,0),carried);
  assert.equal(Object.values(restored.delivered).reduce((a,b) => a+b,0),delivered);
  const estimate = constructionScheduleEstimate(s,restored);
  assert.equal(estimate.waitingForCarriers,false); assert.ok(Number.isFinite(estimate.total));
  advanceLogistics(s,estimate.transport); assert.equal(restored.stage,'building'); near(restored.buildRemaining,240);
  assert.deepEqual(restored.delivered,Object.fromEntries(MATERIAL_IDS.map(id => [id,500])));
  advanceLogistics(s,240); assert.equal(s.buildings.lighthouse.level,1);
});

test('an accepted paid forecast finishes after its package expires and is never charged twice', () => {
  const s = island(3,3); s.buildings.windmill.ready = 0; s.resources.stone = 400;
  s.premium = {expiresAt:NOW+10000}; s.residents[3].workplace = 'quarry'; s.buildings.quarry.workers = 1;
  const beforeCoins = s.resources.coins, beforeTaxes = s.statistics.taxCollected;
  const result = act(s,{type:'forecastPlan',building:'house'},NOW); assert.equal(result.ok,true,result.message);
  assert.equal(result.project.stage,'planned'); assert.equal(result.project.forecastFee,19);
  tick(s,5*3600);
  assert.ok(s.premium.expiresAt < s.worldTimeMs); assert.equal(s.buildings.house.level,2); assert.equal(s.constructionProjects.length,0);
  assert.equal(s.resources.coins,beforeCoins-550-19+(s.statistics.taxCollected-beforeTaxes));
  assert.equal(s.resources.wood,450); assert.equal(s.resources.planks,450);
  const after = normalizeState(JSON.parse(JSON.stringify(s)),s.worldTimeMs);
  assert.equal(after.buildings.house.level,2); assert.equal(after.resources.coins,s.resources.coins);
});

test('walking carriers are reported and a full Food slot is not reported as usable free space', () => {
  const s = island(); s.residents.slice(0,3).forEach(person => {person.arrivalRemaining=120;});
  s.resources.food = 2688;
  const status = warehouseDispatchStatus(s);
  assert.equal(status.assignedCrew,3); assert.equal(status.readyCrew,0); assert.equal(status.walkingCrew,3);
  assert.equal(status.waitReason,'carriers-walking'); assert.equal(status.centralFoodRoom,0);
});
