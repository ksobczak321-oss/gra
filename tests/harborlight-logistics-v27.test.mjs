import test from 'node:test';
import assert from 'node:assert/strict';
import { MATERIAL_IDS, normalizeLogisticsState, nextLogisticsEvent, advanceLogistics,
  effectiveWorkerCount, warehouseCarrierJobs, constructionScheduleEstimate,
  constructionEstimate, promoteConstructionQueue, logisticsAction, receiveMaterials } from '../harborlight-v1-logistics.js';

function island() {
  const ids = ['house','farm','sawmill','quarry','dock','warehouse','lighthouse','lumber','windmill','townhall','chapel','market'];
  const raw = { version:9, population:48, worldTimeMs:1_800_000_000_000,
    resources:{coins:10000,wood:0,stone:0,grain:100,food:500,planks:0},
    buildings:Object.fromEntries(ids.map(id => [id,{level:id === 'townhall' ? 4 : id === 'lighthouse' ? 0 : 1,workers:0,ready:0,workProgress:[]}])),
    residents:Array.from({length:48},(_,i)=>({id:i+1,personUid:`person-${i+1}`,workplace:null,arrivalRemaining:0,returnRemaining:0,pendingRelease:false})),
    statistics:{collected:0,crafted:0,traded:0,upgrades:0}, foodCredit:0, lighthouseRemaining:0, chapelRemaining:0 };
  const state=structuredClone(raw); normalizeLogisticsState(state,raw); return state;
}
function crew(state, workplace, ids) {
  for (const person of state.residents) if (person.workplace === workplace) person.workplace=null;
  for (const id of ids) state.residents.find(person=>person.id===id).workplace=workplace;
  state.buildings[workplace].workers=ids.length;
  state.buildings[workplace].workProgress=Array(ids.length).fill(0);
}
function project(state,cost,building='house') {
  for (const resource of MATERIAL_IDS) state.resources[resource]=Math.max(state.resources[resource],(cost[resource]||0)+(resource==='food'?50:0));
  const goodsTotal=MATERIAL_IDS.reduce((sum,id)=>sum+(cost[id]||0),0);
  const p={building,targetLevel:state.buildings[building].level+1,cost:{...cost},goodsTotal,goodsRemaining:goodsTotal,
    remainingMaterials:Object.fromEntries(MATERIAL_IDS.map(id=>[id,cost[id]||0])),delivered:Object.fromEntries(MATERIAL_IDS.map(id=>[id,0])),
    reservedMaterials:Object.fromEntries(MATERIAL_IDS.map(id=>[id,0])),reservedCoins:0,reservationVersion:9,
    transportSeconds:0,buildRemaining:0,stage:'queued',order:++state.constructionSequence};
  state.constructionProjects.push(p); promoteConstructionQueue(state); return p;
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('only the unhoused producer works at half speed; physical product and input costs remain whole',()=>{
  const state=island(); crew(state,'windmill',[1,25]);
  assert.equal(effectiveWorkerCount(state,'windmill'),1.5);
  advanceLogistics(state,180);
  assert.equal(state.buildings.windmill.ready,1);
  assert.equal(state.resources.grain,98);
  assert.deepEqual(state.buildings.windmill.workProgress,[0,90]);
  advanceLogistics(state,180);
  assert.equal(state.buildings.windmill.ready,3);
  assert.equal(state.resources.grain,94);
  assert.equal(state.economyLedger.produced.food,3);
  assert.equal(state.economyLedger.delivered.food,0);
});

test('adding beds preserves a half-finished unit and makes its worker fully productive',()=>{
  const state=island(); crew(state,'sawmill',[25]); state.resources.wood=100;
  advanceLogistics(state,180);
  assert.equal(state.buildings.sawmill.ready,0);
  assert.equal(state.buildings.sawmill.workProgress[0],90);
  const raw=structuredClone(state), restored=structuredClone(raw);
  normalizeLogisticsState(restored,raw);
  assert.equal(restored.buildings.sawmill.workProgress[0],90);
  restored.buildings.house.level=2;
  advanceLogistics(restored,90);
  assert.equal(restored.buildings.sawmill.ready,1);
  assert.equal(restored.resources.wood,98);
  assert.equal(restored.economyLedger.produced.planks,1);
});

test('housed and unhoused warehouse carriers finish the same physical course after five and ten minutes',()=>{
  const state=island(); state.buildings.lumber.level=2; state.buildings.lumber.ready=240;
  crew(state,'warehouse',[1,25]); nextLogisticsEvent(state);
  const rows=warehouseCarrierJobs(state);
  assert.equal(rows.find(row=>row.residentId===1).remaining,300);
  assert.equal(rows.find(row=>row.residentId===25).remaining,600);
  advanceLogistics(state,300);
  assert.equal(state.resources.wood,120);
  assert.equal(state.haulTrips.warehouse[0].residentId,25);
  assert.equal(state.economyLedger.delivered.wood,120);
  advanceLogistics(state,300);
  assert.equal(state.resources.wood,240);
  assert.equal(state.economyLedger.delivered.wood,240);
});

test('the individual housing factor applies to Market and Harbor cargo as well',()=>{
  for (const workplace of ['market','dock']) {
    const state=island(); state.resources.wood=500; crew(state,workplace,[1,25]);
    const result=workplace==='market'
      ? logisticsAction(state,{type:'marketOrder',resource:'wood',amount:240})
      : logisticsAction(state,{type:'trade',resource:'wood',direction:'sell',amount:200});
    assert.equal(result.ok,true,result.message);
    nextLogisticsEvent(state);
    assert.equal(state.haulTrips[workplace].length,2);
    advanceLogistics(state,300);
    const slower=state.haulTrips[workplace].find(trip=>trip.residentId===25);
    assert.ok(slower);
    close(slower.remaining,150);
    assert.equal(state.economyLedger.delivered.wood,0,'trade does not become an own-production mission delivery');
  }
});

test('an already loaded unhoused carrier retains its cargo identity and speed through reload or departure',()=>{
  const state=island(); state.buildings.lumber.ready=120; crew(state,'warehouse',[25]);
  nextLogisticsEvent(state); advanceLogistics(state,200);
  close(state.haulTrips.warehouse[0].remaining,200);
  const raw=structuredClone(state), restored=structuredClone(raw);
  normalizeLogisticsState(restored,raw);
  const trip=restored.haulTrips.warehouse[0];
  assert.equal(trip.workMultiplier,.5);
  restored.residents=restored.residents.filter(person=>person.id!==25); restored.population--;
  restored.buildings.warehouse.workers=0; trip.worker=-1;
  advanceLogistics(restored,399.999);
  assert.equal(restored.resources.wood,0);
  advanceLogistics(restored,.001);
  assert.equal(restored.resources.wood,120);
  assert.equal(restored.haulTrips.warehouse.length,0);
});

test('construction ETA is deterministic across CPU load and predicts real completion without mutating the island',()=>{
  const state=island(); state.buildings.townhall.level=10; state.buildings.house.level=2;
  state.buildings.warehouse.level=10; state.buildings.farm.level=10;
  crew(state,'warehouse',[1,2,3,4,5,6]); crew(state,'farm',[7,8,9,10,11,12,13,14,15,16,17,18]);
  state.buildings.farm.workProgress=Array.from({length:12},(_,i)=>i*3);
  state.warehousePriorities=['construction'];
  const p=project(state,{wood:20000,coins:100},'lighthouse');
  const before=JSON.stringify(state);
  const fast=constructionScheduleEstimate(state,p);
  assert.ok(Number.isFinite(fast.total));
  assert.ok(fast.building>3600,'the expensive fixed building clock is not simulated as unrelated production');
  const original=Object.getOwnPropertyDescriptor(globalThis,'performance');
  let simulatedCpu=0;
  try {
    Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>simulatedCpu+=100000}});
    for (let i=0;i<6;i++) assert.deepEqual(constructionScheduleEstimate(state,p),fast);
  } finally {
    if(original)Object.defineProperty(globalThis,'performance',original);else delete globalThis.performance;
  }
  assert.equal(JSON.stringify(state),before,'all schedule work stays in a clone, including ledgers and random priority state');
  const actual=structuredClone(state);
  advanceLogistics(actual,fast.completionTotal-.1);
  assert.equal(actual.buildings.lighthouse.level,0);
  advanceLogistics(actual,.1);
  assert.equal(actual.buildings.lighthouse.level,1);
});

test('ordinary construction estimates account for a single unhoused carrier without slowing unrelated people',()=>{
  const state=island(); crew(state,'warehouse',[25]);
  const p=project(state,{wood:120});
  const estimate=constructionEstimate(state,p);
  assert.equal(estimate.transport,600);
  assert.equal(estimate.building,600);
  assert.equal(constructionScheduleEstimate(state,p).completionTotal,1200);
});

test('mission economy counters survive reload and ignore rewards, old inventory and purchases',()=>{
  const state=island();
  assert.deepEqual(state.economyLedger,{version:1,produced:Object.fromEntries(MATERIAL_IDS.map(id=>[id,0])),delivered:Object.fromEntries(MATERIAL_IDS.map(id=>[id,0]))});
  receiveMaterials(state,{wood:200,food:200});
  assert.equal(state.economyLedger.produced.wood,0);
  assert.equal(state.economyLedger.delivered.wood,0);
  crew(state,'lumber',[1]); advanceLogistics(state,360);
  const raw=structuredClone(state), restored=structuredClone(raw); normalizeLogisticsState(restored,raw);
  assert.deepEqual(restored.economyLedger,state.economyLedger);
  assert.equal(restored.economyLedger.produced.wood,2);
  advanceLogistics(restored,180);
  assert.equal(restored.economyLedger.produced.wood,3);
});
