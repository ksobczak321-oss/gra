import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MATERIAL_IDS, PRODUCTION_RECIPES, normalizeLogisticsState, nextLogisticsEvent,
  advanceLogistics, logisticsAction, producerCapacity, productionBlocked,
  warehousePrioritySchedule, warehouseCarrierJobs, warehouseLimits, constructionScheduleEstimate
} from '../harborlight-v1-logistics.js';

function island() {
  const ids=['house','farm','sawmill','quarry','dock','warehouse','lighthouse','lumber','windmill','townhall','chapel','market'];
  const state={ version:8, population:12, worldTimeMs:Date.UTC(2026,9,23),
    resources:{coins:10000,wood:0,stone:0,grain:0,food:150,planks:0},
    buildings:Object.fromEntries(ids.map(id=>[id,{level:id==='warehouse'?2:id==='lighthouse'?0:10,workers:id==='warehouse'?1:0,ready:PRODUCTION_RECIPES[id]?2000:0,workProgress:id==='warehouse'?[0]:[]} ])),
    residents:Array.from({length:12},(_,index)=>({id:index+1,workplace:index===0?'warehouse':null,arrivalRemaining:0,returnRemaining:0,happiness:0})),
    foodCredit:0,lighthouseRemaining:0,chapelRemaining:0,
    statistics:{collected:0,crafted:0,traded:0,upgrades:0}
  };
  normalizeLogisticsState(state,structuredClone(state));
  return state;
}
function reserveProject(state, project) {
  project.reservationVersion = 9;
  project.reservedMaterials = { ...project.remainingMaterials };
  for (const resource of MATERIAL_IDS) state.resources[resource] += project.reservedMaterials[resource] || 0;
  return project;
}

function priorities(state, selected) {
  assert.equal(logisticsAction(state,{type:'warehousePriority',priorities:selected}).ok,true);
}
function course(state) {
  nextLogisticsEvent(state);
  const trip=state.haulTrips.warehouse[0];
  assert.ok(trip,'a free carrier should find an eligible course');
  const result={...trip};
  advanceLogistics(state,300);
  return result;
}
const counts = trips => trips.reduce((result,trip)=>(result[trip.resource]=(result[trip.resource]||0)+1,result),{});

test('each local store follows its own building level and exposes the next level limit',()=>{
  const state=island();
  state.buildings.windmill.level=1;state.buildings.windmill.ready=199;
  state.resources.grain=100;
  assert.equal(producerCapacity(state,'windmill'),200);
  assert.equal(producerCapacity(state,'windmill',2),400);
  assert.equal(productionBlocked(state,'windmill'),false);
  state.buildings.windmill.ready=200;
  assert.equal(productionBlocked(state,'windmill'),true);
  state.buildings.townhall.level=20;
  assert.equal(producerCapacity(state,'windmill'),200);
  state.buildings.windmill.level=2;
  assert.equal(productionBlocked(state,'windmill'),false);
  assert.equal(producerCapacity(state,'windmill'),400);
});

test('one selected priority reserves eight courses and two carry other eligible materials',()=>{
  const state=island();priorities(state,['food']);
  const trips=Array.from({length:10},()=>course(state));
  assert.equal(counts(trips).food,8);
  assert.ok(trips.slice(8).every(trip=>trip.resource!=='food'));
  assert.equal(state.warehousePriorityCycle.position,0);
  assert.equal(warehousePrioritySchedule(state).filter(id=>id==='food').length,8);
});

test('two selected priorities split ten courses five, three and two random other goods',()=>{
  const state=island();priorities(state,['food','wood']);
  const trips=Array.from({length:10},()=>course(state)),actual=counts(trips);
  assert.equal(actual.food,5);assert.equal(actual.wood,3);
  assert.ok(trips.slice(8).every(trip=>!['food','wood'].includes(trip.resource)));
});

test('three selected priorities repeat a five-three-two allocation indefinitely',()=>{
  const state=island();priorities(state,['food','wood','grain']);
  const first=Array.from({length:10},()=>course(state));
  const second=Array.from({length:10},()=>course(state));
  assert.deepEqual(counts(first),{food:5,wood:3,grain:2});
  assert.deepEqual(counts(second),{food:5,wood:3,grain:2});
  assert.deepEqual(state.warehousePriorities,['food','wood','grain']);
});

test('Construction joins the same three priorities and receives five-three-two dispatch slots alongside Food',()=>{
  const state=island();
  state.buildings.warehouse.level=1;
  state.buildings.warehouse.workers=10;state.buildings.warehouse.workProgress=Array(10).fill(0);
  state.residents.slice(0,10).forEach(person=>{person.workplace='warehouse';});
  state.constructionProjects.push({building:'house',targetLevel:11,cost:{wood:600,stone:600},goodsTotal:1200,goodsRemaining:1200,
    remainingMaterials:{wood:600,stone:600,grain:0,food:0,planks:0},delivered:{wood:0,stone:0,grain:0,food:0,planks:0},
    transportSeconds:0,buildRemaining:0,stage:'transport',order:1});
  reserveProject(state, state.constructionProjects.at(-1));
  priorities(state,['food','construction']);
  nextLogisticsEvent(state);
  const trips=state.haulTrips.warehouse;
  assert.equal(trips.length,10);
  assert.ok(trips.slice(0,5).every(trip=>trip.kind==='producer'&&trip.resource==='food'));
  assert.ok(trips.slice(5,8).every(trip=>trip.kind==='construction'));
  assert.ok(trips.slice(8).every(trip=>trip.kind!=='construction'&&trip.resource!=='food'));
  assert.equal(state.warehousePriorityCycle.position,0);
  assert.deepEqual(state.warehousePriorities,['food','construction']);
  const persisted=structuredClone(state);
  normalizeLogisticsState(state,persisted);
  assert.deepEqual(state.warehousePriorities,['food','construction']);
  assert.deepEqual(state.haulTrips,persisted.haulTrips);
});

test('a priority on Construction does not idle carriers when no building needs transport',()=>{
  const state=island();
  priorities(state,['construction']);
  const trip=course(state);
  assert.equal(trip.kind,'producer');
  assert.ok(trip.amount>0);
  assert.equal(state.warehousePriorityCycle.position,1);
  assert.equal(logisticsAction(state,{type:'warehousePriority',resource:'food'}).ok,true);
  assert.equal(logisticsAction(state,{type:'warehousePriority',resource:'wood'}).ok,true);
  const before=JSON.stringify(state);
  assert.equal(logisticsAction(state,{type:'warehousePriority',resource:'stone'}).ok,false);
  assert.equal(JSON.stringify(state),before);
});

test('parallel carriers share one dispatch allocation rather than restarting it per worker',()=>{
  const state=island();priorities(state,['food','wood','grain']);
  state.buildings.warehouse.workers=10;state.buildings.warehouse.workProgress=Array(10).fill(0);
  state.residents.slice(0,10).forEach(person=>{person.workplace='warehouse';});
  nextLogisticsEvent(state);
  assert.equal(state.haulTrips.warehouse.length,10);
  assert.deepEqual(counts(state.haulTrips.warehouse),{food:5,wood:3,grain:2});
  assert.equal(new Set(state.haulTrips.warehouse.map(trip=>trip.worker)).size,10);
  assert.equal(state.warehousePriorityCycle.position,0);
});

test('priority selection is ordered, highlighted by canonical state and limited to three',()=>{
  const state=island();
  for(const resource of ['food','wood','grain'])assert.equal(logisticsAction(state,{type:'warehousePriority',resource}).ok,true);
  assert.deepEqual(state.warehousePriorities,['food','wood','grain']);
  const snapshot=JSON.stringify(state);
  assert.equal(logisticsAction(state,{type:'warehousePriority',resource:'stone'}).ok,false);
  assert.equal(JSON.stringify(state),snapshot);
  assert.equal(logisticsAction(state,{type:'warehousePriority',priorities:['food','food']}).ok,false);
  assert.equal(JSON.stringify(state),snapshot);
  logisticsAction(state,{type:'warehousePriority',resource:'wood'});
  logisticsAction(state,{type:'warehousePriority',resource:'stone'});
  assert.deepEqual(state.warehousePriorities,['food','grain','stone']);
});

test('new selections restart the next dispatch block without interrupting loaded cargo',()=>{
  const state=island();priorities(state,['food']);nextLogisticsEvent(state);
  const original=structuredClone(state.haulTrips.warehouse[0]);
  priorities(state,['wood','grain']);
  assert.deepEqual(state.haulTrips.warehouse[0],original);
  assert.equal(state.warehousePriorityCycle.position,0);
  advanceLogistics(state,300);
  assert.equal(course(state).resource,'wood');
});

test('empty selected sources fall back immediately without stopping the ten-course cycle',()=>{
  const state=island();priorities(state,['food']);state.buildings.windmill.ready=0;
  const trips=Array.from({length:10},()=>course(state));
  assert.ok(trips.every(trip=>trip.resource!=='food'));
  assert.equal(state.warehousePriorityCycle.position,0);
  assert.equal(state.resources.food,150);
});

test('full resource slots are skipped and a completely blocked warehouse does not consume a course',()=>{
  const state=island();priorities(state,['food']);
  state.resources.food=warehouseLimits(state).perResource;
  assert.notEqual(course(state).resource,'food');
  for(const resource of MATERIAL_IDS)state.resources[resource]=warehouseLimits(state).perResource;
  const before=structuredClone(state.warehousePriorityCycle);
  nextLogisticsEvent(state);
  assert.equal(state.haulTrips.warehouse.length,0);
  assert.deepEqual(state.warehousePriorityCycle,before);
});

test('partial courses count once and never create goods or mix cargo',()=>{
  const state=island();priorities(state,['food']);
  for(const [id,recipe] of Object.entries(PRODUCTION_RECIPES))state.buildings[id].ready=recipe.output==='food'?7:0;
  const trip=course(state);
  assert.equal(trip.amount,7);assert.equal(trip.resource,'food');
  assert.equal(state.resources.food,157);assert.equal(state.buildings.windmill.ready,0);
  assert.equal(state.warehousePriorityCycle.position,1);
  nextLogisticsEvent(state);assert.equal(state.haulTrips.warehouse.length,0);
  assert.equal(state.warehousePriorityCycle.position,1);
});

test('scheduler position, random state and in-flight cargo survive reload without rerolling',()=>{
  const state=island();priorities(state,['food','wood']);
  Array.from({length:8},()=>course(state));
  state.warehousePriorityCycle.seed=0xfedcba98;
  nextLogisticsEvent(state);advanceLogistics(state,123);
  const saved=structuredClone(state),restored=structuredClone(saved);
  normalizeLogisticsState(restored,saved);
  assert.deepEqual(restored.warehousePriorityCycle,state.warehousePriorityCycle);
  assert.deepEqual(restored.haulTrips.warehouse,state.haulTrips.warehouse);
  advanceLogistics(state,177);advanceLogistics(restored,177);
  const a=Array.from({length:10},()=>course(state)),b=Array.from({length:10},()=>course(restored));
  assert.deepEqual(a,b);
  assert.deepEqual(state.resources,restored.resources);
});

test('resource priorities apply to real construction courses and reserved materials stay conserved',()=>{
  const state=island();priorities(state,['wood']);
  for(const id of Object.keys(PRODUCTION_RECIPES))state.buildings[id].ready=0;
  const project={building:'house',targetLevel:11,cost:{wood:70,stone:12},goodsTotal:82,goodsRemaining:82,remainingMaterials:{wood:70,stone:12,grain:0,food:0,planks:0},delivered:{wood:0,stone:0,grain:0,food:0,planks:0},transportSeconds:0,buildRemaining:0,stage:'transport',order:1};
  state.constructionProjects.push(reserveProject(state,project));
  const trips=[course(state),course(state),course(state)];
  assert.deepEqual(trips.map(trip=>[trip.resource,trip.amount]),[['wood',66],['wood',4],['stone',12]]);
  assert.equal(project.goodsRemaining,0);assert.equal(project.stage,'building');
  assert.deepEqual(project.delivered,{wood:70,stone:12,grain:0,food:0,planks:0});
  assert.equal(state.resources.wood,0);assert.equal(state.resources.stone,0);
});

test('urgent Food still protects meals even when another resource is selected',()=>{
  const state=island();priorities(state,['wood','stone','grain']);
  state.resources.food=0;state.foodCredit=1;
  nextLogisticsEvent(state);
  assert.equal(state.haulTrips.warehouse[0].resource,'food');
  assert.equal(state.warehousePriorityCycle.position,1);
});

test('carrier rows expose assignments, cargo, destinations and hunger-adjusted arrival time',()=>{
  const state=island();
  state.buildings.warehouse.workers=3;state.buildings.warehouse.workProgress=[0,0,0];
  state.residents[1].workplace='warehouse';state.residents[1].arrivalRemaining=220;
  state.residents[2].workplace='warehouse';
  for(const id of Object.keys(PRODUCTION_RECIPES))state.buildings[id].ready=0;
  state.buildings.lumber.ready=60;
  nextLogisticsEvent(state);
  const rows=warehouseCarrierJobs(state);
  assert.equal(rows.length,3);
  assert.deepEqual(rows.map(row=>row.status),['delivering','walking','idle']);
  assert.deepEqual([rows[0].resource,rows[0].amount,rows[0].from,rows[0].to,rows[0].remaining],['wood',60,'lumber','warehouse',300]);
  assert.equal(rows[1].remaining,220);
  state.resources.food=0;state.foodCredit=0;
  assert.equal(warehouseCarrierJobs(state)[0].remaining,600);
});

function upgradePreviewIsland() {
  const state=island();
  for(const id of Object.keys(PRODUCTION_RECIPES))state.buildings[id].ready=0;
  state.buildings.farm.level=1;
  const project={building:'farm',targetLevel:2,cost:{wood:66},goodsTotal:66,goodsRemaining:66,
    remainingMaterials:{wood:66,stone:0,grain:0,food:0,planks:0},delivered:{wood:0,stone:0,grain:0,food:0,planks:0},
    transportSeconds:0,buildRemaining:0,stage:'transport',order:1};
  state.constructionProjects.push(reserveProject(state,project));state.constructionSequence=1;
  return {state,project};
}

test('scheduled total includes eight competing Food courses and never mutates the real island',()=>{
  const {state,project}=upgradePreviewIsland();
  state.buildings.windmill.level=3;state.buildings.windmill.ready=528;priorities(state,['food']);
  const before=JSON.stringify(state);
  const estimate=constructionScheduleEstimate(state,project);
  assert.equal(estimate.transport,2700);assert.equal(estimate.building,300);assert.equal(estimate.total,3000);
  assert.equal(estimate.queueWait,0);assert.equal(estimate.completionTotal,3000);
  assert.equal(JSON.stringify(state),before,'preview must preserve stock, priority position, RNG and all cargo');
  let elapsed=0;
  while(state.constructionProjects.includes(project)&&elapsed<6000){advanceLogistics(state,300);elapsed+=300;}
  assert.equal(elapsed,estimate.total);
});

test('scheduled preview retains an already loaded delivery and its completed transport phase',()=>{
  const {state,project}=upgradePreviewIsland();
  advanceLogistics(state,150);
  const estimate=constructionScheduleEstimate(state,project);
  assert.equal(estimate.transport,150);assert.equal(estimate.building,300);assert.equal(estimate.total,450);
  assert.equal(state.haulTrips.warehouse[0].remaining,150);
});

test('scheduled preview reports blocked carriers, and includes the walk when a carrier is arriving',()=>{
  const {state,project}=upgradePreviewIsland();
  state.buildings.warehouse.workers=0;state.residents[0].workplace=null;
  const blocked=constructionScheduleEstimate(state,project);
  assert.equal(blocked.total,Infinity);assert.match(blocked.reason,/warehouse carriers/i);
  state.buildings.warehouse.workers=1;state.residents[0].workplace='warehouse';state.residents[0].arrivalRemaining=300;
  const arriving=constructionScheduleEstimate(state,project);
  assert.equal(arriving.transport,600);assert.equal(arriving.building,300);assert.equal(arriving.total,900);
});

test('queue wait is separate from the physical transport plus building estimate',()=>{
  const {state,project}=upgradePreviewIsland();
  state.buildings.townhall.level=1;project.stage='queued';project.order=2;state.constructionSequence=2;
  state.constructionProjects.unshift({building:'townhall',targetLevel:2,cost:{wood:1},goodsTotal:1,goodsRemaining:0,remainingMaterials:{wood:0,stone:0,grain:0,food:0,planks:0},delivered:{wood:1,stone:0,grain:0,food:0,planks:0},stage:'building',order:1,transportSeconds:600,buildRemaining:600});
  const estimate=constructionScheduleEstimate(state,project);
  assert.equal(estimate.queueWait,600);assert.equal(estimate.transport,300);assert.equal(estimate.building,300);
  assert.equal(estimate.total,600);assert.equal(estimate.completionTotal,1200);
});

test('hypothetical construction excludes gathering and preserves the actual Food reserve',()=>{
  const {state}=upgradePreviewIsland();state.constructionProjects=[];
  const before=JSON.stringify(state);
  const estimate=constructionScheduleEstimate(state,{wood:66},'farm');
  assert.equal(estimate.total,600);assert.equal(JSON.stringify(state),before);
  const foodEstimate=constructionScheduleEstimate(state,{food:150,wood:66},'farm');
  assert.ok(Number.isFinite(foodEstimate.total));
  assert.equal(JSON.stringify(state),before);
});

test('building phase and unfunded forecast previews report their exact current status',()=>{
  const {state,project}=upgradePreviewIsland();
  project.stage='building';project.buildRemaining=123;
  const building=constructionScheduleEstimate(state,project);
  assert.equal(building.transport,0);assert.equal(building.building,123);assert.equal(building.total,123);
  project.stage='planned';state.premium.expiresAt=0;
  const planned=constructionScheduleEstimate(state,project);
  assert.equal(planned.total,Infinity);assert.match(planned.reason,/planned materials|construction package/i);
});
