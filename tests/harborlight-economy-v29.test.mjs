import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, buildingCost } from '../harborlight-v1-state.js';
import { longestConstructionSeconds, BUILDING_TIME_WEIGHTS, warehouseCapacityPlan, constructionTiming } from '../harborlight-v1-economy.js';
import { MATERIAL_IDS, attachConstructionTiming, constructionEstimate, constructionScheduleEstimate, advanceLogistics,
  normalizeLogisticsState, warehouseLimits, stockRoom, grantBonusMaterials, inventoryOverfull, productionRate, quoteInstantTransport, instantTransport } from '../harborlight-v1-logistics.js';
import { quotePremiumBuilding, quoteForecastPlan } from '../harborlight-v1-activities.js';
const NOW = Date.parse('2026-11-03T12:00:00Z');
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-5, `${a} != ${b}`);
function island(level=1, workers=3) {
  const s=createState(NOW);s.buildings.townhall.level=level;s.buildings.house.level=level;s.capacity=24*level;
  s.resources={coins:10000,...Object.fromEntries(MATERIAL_IDS.map(id=>[id,1000]))};
  for(let index=0;index<workers;index++) {s.residents[index].workplace='warehouse';s.residents[index].arrivalRemaining=0;}
  s.buildings.warehouse.workers=workers;s.buildings.warehouse.workProgress=Array(workers).fill(0);
  s.warehousePriorities=['construction'];
  return s;
}
function project(s,building='townhall',cost={wood:100,stone:100,grain:100,food:100,planks:100}) {
  const p={building,targetLevel:s.buildings[building].level+1,cost,goodsTotal:MATERIAL_IDS.reduce((n,id)=>n+(cost[id]||0),0),
    remainingMaterials:Object.fromEntries(MATERIAL_IDS.map(id=>[id,cost[id]||0])),delivered:Object.fromEntries(MATERIAL_IDS.map(id=>[id,0])),
    reservedMaterials:Object.fromEntries(MATERIAL_IDS.map(id=>[id,cost[id]||0])),reservedCoins:0,reservationVersion:9,
    transportSeconds:0,buildRemaining:0,stage:'transport',order:++s.constructionSequence};
  p.goodsRemaining=p.goodsTotal;attachConstructionTiming(s,p);s.constructionProjects.push(p);return p;
}

test('v29 accepted multipliers, explicit level23 and level24+ cap use completed Town Hall',()=>{
  const expected=[45,135,405,1215,3645,7290,14580,29160,34992,41990.4,50388.48,55427.328,60970.0608,67067.06688,70420.420224,73941.4412352,77638.51329696,79191.2835628992,80775.10923415718,82390.61141884033,84038.42364721714,85719.19212016148,86100,86400];
  expected.forEach((seconds,i)=>near(longestConstructionSeconds(i+1),seconds));
  for(let level=24;level<=100;level++)assert.equal(longestConstructionSeconds(level),86400);
  const s=island();const p=project(s);assert.equal(p.targetLevel,2);assert.equal(p.economyTiming.totalSeconds,45);
  for(const [building,weight]of Object.entries(BUILDING_TIME_WEIGHTS))near(constructionTiming(s,{building,cost:{wood:1}}).totalSeconds,45*weight);
  assert.equal(constructionTiming(s,{building:'theatre',cost:{wood:1}}),null);
});
test('ready three-person crew physically consumes and delivers five materials then builds within45seconds',()=>{
  const s=island();const p=project(s);const quote=constructionEstimate(s,p);
  near(quote.transport,18);near(quote.building,27);near(quote.total,45);
  advanceLogistics(s,8.9);assert.equal(p.goodsRemaining,500);assert.equal(s.resources.wood,900);
  advanceLogistics(s,9.1);assert.deepEqual(p.delivered,{wood:100,stone:100,grain:100,food:100,planks:100});
  assert.equal(p.goodsRemaining,0);assert.equal(p.stage,'building');near(p.buildRemaining,27);
  advanceLogistics(s,26.9);assert.equal(s.buildings.townhall.level,1);
  advanceLogistics(s,.1);assert.equal(s.buildings.townhall.level,2);assert.equal(s.constructionProjects.length,0);
  assert.equal(s.resources.coins,10000); // The timing engine never mints coins.
});
test('new budget needs real cargo and at least one arrived carrier; walking remains separate',()=>{
  for(const count of[0]){const s=island(1,count);const p=project(s);advanceLogistics(s,900);assert.equal(p.goodsRemaining,500);assert.equal(s.buildings.townhall.level,1);assert.equal(constructionEstimate(s,p).transport,Infinity);}
  const s=island();const p=project(s);for(const person of s.residents.filter(x=>x.workplace==='warehouse'))person.arrivalRemaining=120;
  assert.equal(constructionEstimate(s,p).waitingForCarriers,true);
  const schedule=constructionScheduleEstimate(s,p);near(schedule.completionTotal,165);
  advanceLogistics(s,45);assert.equal(p.goodsRemaining,500);assert.equal(s.haulTrips.warehouse.length,0);
});

test('one or two carriers deliver more courses instead of blocking construction',()=>{
  for(const [workers,seconds] of [[1,72],[2,54]]) {
    const s=island(1,workers);const p=project(s);const quote=constructionEstimate(s,p);
    near(quote.total,seconds);assert.equal(quote.waitingForCarriers,false);
    advanceLogistics(s,seconds-.01);assert.equal(s.buildings.townhall.level,1);
    advanceLogistics(s,.01);assert.equal(s.buildings.townhall.level,2);
    assert.equal(s.haulTrips.warehouse.length,0);assert.equal(s.resources.wood,900);
  }
});
test('new construction retains hunger and missing-bed penalties in its quote and actual deliveries',()=>{
  for(const [hungry,unhoused,speed] of [[true,false,.5],[false,true,.5],[true,true,.25]]) {
    const s=island();
    if(hungry)s.resources.food=0;
    if(unhoused)s.buildings.house.level=0; // An existing world without usable beds.
    const p=project(s,'townhall',{wood:500});
    const quote=constructionEstimate(s,p), scheduled=constructionScheduleEstimate(s,p);
    near(quote.transport,18/speed);near(quote.building,27);near(scheduled.total,quote.total);
    advanceLogistics(s,quote.transport-.001);assert.ok(p.goodsRemaining>0);
    advanceLogistics(s,.001);assert.equal(p.goodsRemaining,0);near(p.buildRemaining,27);
    advanceLogistics(s,27);assert.equal(s.buildings.townhall.level,2);
    assert.equal(s.resources.wood,500);assert.equal(s.resources.coins,10000);
  }
});
test('active play and completed paths accelerate new deliveries while keeping the recorded building duration',()=>{
  const s=island();s.roads.segments=Array(100).fill(1);
  assert.equal(act(s,{type:'userActivity',visible:true,focused:true},NOW).ok,true);
  const p=project(s,'townhall',{wood:500});
  const quote=constructionEstimate(s,p), scheduled=constructionScheduleEstimate(s,p);
  near(quote.transport,18/(2*1.1));near(quote.building,27);near(scheduled.total,quote.total);
  near(p.economyTiming.totalSeconds,45); // The baseline is not silently rewritten.
  advanceLogistics(s,quote.total-.001);assert.equal(s.buildings.townhall.level,1);
  advanceLogistics(s,.001);assert.equal(s.buildings.townhall.level,2);
});
test('a completed House grants carrier speed from its completion boundary without changing past travel',()=>{
  const s=island(2,1);s.buildings.house.level=0;
  const p=project(s,'townhall',{wood:500});
  const house={building:'house',targetLevel:1,cost:{},goodsTotal:0,goodsRemaining:0,
    remainingMaterials:Object.fromEntries(MATERIAL_IDS.map(id=>[id,0])),delivered:{},
    reservedMaterials:{},reservationVersion:9,reservedCoins:0,transportSeconds:0,
    stage:'building',buildRemaining:12,order:++s.constructionSequence};
  s.constructionProjects.push(house);
  near(p.economyTiming.courseSeconds,27);
  advanceLogistics(s,12);
  assert.equal(s.buildings.house.level,1);
  assert.equal(p.goodsRemaining,500);
  near(s.haulTrips.warehouse[0].remaining,21); // 27 − 12 × half speed.
  advanceLogistics(s,20.99);assert.equal(p.goodsRemaining,500);
  advanceLogistics(s,.01);assert.equal(p.delivered.wood,120);
  assert.equal(p.goodsRemaining,380);
});
test('missing actual reserved materials cannot auto-finish an apparently funded project',()=>{
  const s=island();const p=project(s);s.resources.wood=0;
  advanceLogistics(s,1000);assert.ok(p.goodsRemaining>=100);assert.equal(s.buildings.townhall.level,1);
  s.resources.wood=100;advanceLogistics(s,1000);assert.equal(s.buildings.townhall.level,2);
});
test('new snapshots and in-flight long courses survive save reload without changing ETA',()=>{
  const s=island(24);const p=project(s);advanceLogistics(s,1);
  const before=constructionEstimate(s,p);assert.ok(s.haulTrips.warehouse[0].remaining>300);
  const raw=structuredClone(s);const loaded=normalizeState(raw,NOW);const q=loaded.constructionProjects.find(x=>x.order===p.order);
  assert.deepEqual(q.economyTiming,p.economyTiming);near(loaded.haulTrips.warehouse[0].remaining,s.haulTrips.warehouse[0].remaining);
  near(constructionEstimate(loaded,q).total,before.total);
  loaded.buildings.townhall.level=100;near(constructionEstimate(loaded,q).total,before.total);
});
test('legacy transport, started building and historical starter snapshots retain their clocks',()=>{
  const s=island();const p=project(s);delete p.economyTiming;delete p.economyVersion;
  advanceLogistics(s,150);near(s.haulTrips.warehouse[0].remaining,150);
  const legacy=normalizeState(structuredClone(s),NOW);assert.equal(legacy.constructionProjects[0].economyTiming,undefined);near(legacy.haulTrips.warehouse[0].remaining,150);
  p.stage='building';p.buildRemaining=9876;const loaded=normalizeState(structuredClone(s),NOW);near(loaded.constructionProjects[0].buildRemaining,9876);
  const historical=island(1,6);const old=project(historical,'townhall',{wood:500});delete old.economyTiming;delete old.economyVersion;
  old.starterTurbo={version:1,level:1,carriers:6,capacity:120,trips:5,waves:1,transportDuration:30,buildingDuration:60,courseSeconds:30};
  const restored=normalizeState(structuredClone(historical),NOW);assert.deepEqual(restored.constructionProjects[0].starterTurbo,old.starterTurbo);
  restored.resources.food=0;restored.buildings.house.level=0;
  advanceLogistics(restored,90);assert.equal(restored.buildings.townhall.level,2);
});
test('capacity is a static stage envelope, five material limits, and permits its own next upgrade through100',()=>{
  for(let level=1;level<=100;level++){
    const s=island(level);s.buildings.warehouse.level=level;const cap=warehouseLimits(s);const plan=warehouseCapacityPlan(level);
    assert.equal(cap.total,cap.perResource*5);assert.ok(cap.perResource>=Math.min(10000000,Math.floor(1000*1.5**(Math.min(level,24)-1))));
    const cost=buildingCost(s,'warehouse',{queued:false});for(const id of MATERIAL_IDS)assert.ok((cost[id]||0)+(id==='food'?50*Math.min(level,24):0)<=cap.perResource,`self-upgrade${level}:${id}`);
    if(level<=24)assert.ok(cap.perResource>=(plan.largestUpgrade+plan.mission+plan.foodReserve)*1.25);
    const original={...cap};s.missions={chapter:{level:100}};assert.deepEqual(warehouseLimits(s),original);
  }
  const s=island();const cap=warehouseLimits(s);s.resources=Object.fromEntries(['coins',...MATERIAL_IDS].map(id=>[id,id==='coins'?100000000:cap.perResource]));
  assert.equal(inventoryOverfull(s),false);assert.equal(stockRoom(s,'wood'),0);
});
test('bonus materials remain spendable outside ordinary five-resource capacity',()=>{
  const s=island();const cap=warehouseLimits(s);s.resources.wood=cap.perResource;grantBonusMaterials(s,{wood:20000});
  assert.equal(inventoryOverfull(s),false);assert.equal(stockRoom(s,'wood'),0);assert.equal(s.bonusMaterials.wood,20000);
});
test('new production preserves the completed fraction of both v2 and pre-v15 saves',()=>{
  for(const[version,oldRate]of[[2,20],[undefined,10]]){
    const s=island();s.buildings.farm.workers=1;s.buildings.farm.workProgress=[3600/oldRate*.25];s.productionRateVersion=version;
    const loaded=structuredClone(s);normalizeLogisticsState(loaded,structuredClone(s));
    assert.equal(loaded.productionRateVersion,3);assert.equal(productionRate(loaded,'farm'),40);near(loaded.buildings.farm.workProgress[0],22.5);
    const again=structuredClone(loaded);normalizeLogisticsState(again,structuredClone(loaded));near(again.buildings.farm.workProgress[0],22.5);
  }
});
test('real coin transport can bypass a missing crew while preserving the fixed building phase',()=>{
  const s=island(1,0);const p=project(s);const quote=quoteInstantTransport(s,{route:'construction',project:p.order});assert.equal(quote.ok,true);near(quote.normalBuilding,27);
  assert.equal(instantTransport(s,{route:'construction',project:p.order}).ok,true);assert.equal(p.goodsRemaining,0);near(p.buildRemaining,27);
  advanceLogistics(s,27);assert.equal(s.buildings.townhall.level,2);
});
test('static Theatre is excluded from ordinary/premium forecast construction catalogues',()=>{
  const s=island();s.buildings.theatre={level:1};
  assert.equal(quotePremiumBuilding(s,'theatre',{buildingCost}).ok,false);assert.equal(quoteForecastPlan(s,'theatre',{buildingCost}).ok,false);
});
