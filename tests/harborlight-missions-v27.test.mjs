import test from 'node:test';
import assert from 'node:assert/strict';
import * as State from '../harborlight-v1-state.js';
import * as Missions from '../harborlight-v1-missions.js';
import { grantBonusMaterials } from '../harborlight-v1-inventory.js';
import { normalizeActivities, taskStatus } from '../harborlight-v1-activities.js';
import { constructionEstimate, constructionScheduleEstimate } from '../harborlight-v1-logistics.js';

const NOW=Date.parse('2026-11-01T12:00:00Z');
const context={buildingCost:State.buildingCost,constructionEstimate};
function island({ready=true}={}){
  const state=State.createState(NOW);
  state.tutorial.autoOpenDisabled=ready;
  for(const id of ['townhall','house','warehouse','lumber'])state.buildings[id].level=2;
  state.capacity=48;state.buildings.lighthouse.level=1;
  state.resources.coins=10000;
  grantBonusMaterials(state,{wood:5000,stone:5000,grain:5000,food:5000,planks:5000});
  Missions.normalizeMissions(state,{});Missions.advanceMissions(state,0,context);
  return state;
}
function ordinary(state,action){
  const before=state.lighthouseMissions?.invited||0;
  const result=State.act(state,action,state.worldTimeMs);
  assert.equal(result.ok,true,result.message);
  if(action.type!=='buyResident'||state.lighthouseMissions?.invited===before)Missions.recordMissionAction(state,action,result,context);
  else Missions.advanceMissions(state,0,context);
  return result;
}
function mission(state,type,details={}){
  const status=Missions.missionStatus(state,context);
  const result=Missions.missionAction(state,{type,id:status.task?.id,...details},context);
  assert.equal(result.ok,true,result.message);
  Missions.advanceMissions(state,0,context);return result;
}
function tick(state,seconds){State.tick(state,seconds);Missions.advanceMissions(state,seconds,context);}
function finishContribution(state){
  let status=Missions.missionStatus(state,context);
  if(!status.active)mission(state,'missionStart');
  status=Missions.missionStatus(state,context);
  for(const[id,amount]of Object.entries(status.task.requirements)){
    const remaining=amount-(status.task.deposited[id]||0);
    if(remaining)mission(state,'missionDeposit',{resource:id,amount:remaining});
  }
}
function production(state,resource,amount){
  const producer={wood:'lumber',stone:'quarry',grain:'farm',food:'windmill',planks:'sawmill'}[resource];
  if(!state.buildings[producer].workers)ordinary(state,{type:'assign',building:producer,delta:1});
  if(!state.buildings.warehouse.workers)ordinary(state,{type:'assign',building:'warehouse',delta:6});
  const target=(state.economyLedger?.produced?.[resource]||0)+amount;
  for(let i=0;i<100&&(state.economyLedger?.produced?.[resource]||0)<target;i++)tick(state,120);
  assert.ok(state.economyLedger.produced[resource]>=target);
}

test('Lighthouse chapter waits for the course to finish or be dismissed; target is the actual next level',()=>{
  const state=island({ready:false});
  assert.equal(Missions.missionStatus(state).available,false);
  assert.equal(Missions.missionStatus(state).preview,true);
  state.tutorial.autoOpenDisabled=true;Missions.advanceMissions(state,0,context);
  const status=Missions.missionStatus(state,context);
  assert.equal(status.chapter.level,2);assert.equal(status.chapter.targetLevel,2);
  assert.equal(status.index,1);assert.equal(status.total,8);
  assert.equal(state.buildings.lighthouse.level,1);
});

test('new contribution offers fit the joint spendable inventory, including protected food',()=>{
  const state=island();state.resources={coins:0,wood:100,stone:30,grain:5,food:110,planks:3};state.bonusMaterials={wood:0,stone:0,grain:0,food:0,planks:0};
  const fit=Missions.affordableTaskRequirements(state,{wood:300,stone:200,food:500},{duration:7200});
  assert.equal(fit.feasible,true);assert.deepEqual(fit.requirements,{wood:100,stone:30,food:10});
  const impossible=Missions.missionFeasibility(state,{wood:300},{duration:7200,allowProduction:false});
  assert.equal(impossible.feasible,false);assert.equal(impossible.maximum.wood,100);
  normalizeActivities(state,{});
  for(const task of state.lighthouseTasks){
    assert.equal(taskStatus(state,task).feasible,true);
    for(const[id,n]of Object.entries(task.requirements))assert.ok(n<=Missions.missionFeasibility(state,{},{}).stock[id]);
  }
});

test('a 100 stock / 10 hourly output cannot authorize a 300 contribution in two hours',()=>{
  const state=island();
  state.resources.wood=100;state.bonusMaterials.wood=0;
  // Restrict the free workforce: one producer and one carrier, no hidden hires.
  state.residents=state.residents.slice(0,2);state.population=2;
  const result=Missions.missionFeasibility(state,{wood:300},{duration:7200});
  assert.equal(result.feasible,false);
  assert.ok(result.maximum.wood<300);
});

test('requirements share raw recipe inputs, capacity and the same available workforce',()=>{
  const state=island();state.resources.wood=100;state.resources.planks=0;state.bonusMaterials.wood=0;state.bonusMaterials.planks=0;
  state.residents=[];state.population=0;
  const result=Missions.missionFeasibility(state,{wood:100,planks:50},{duration:7200});
  assert.equal(result.feasible,false);
  assert.equal(result.stock.wood,100);
  assert.equal(result.maximum.planks,0);
});

test('failed main step uses five support steps and returns to the next main step without duplicate contribution charges',()=>{
  const state=island();mission(state,'missionStart');
  const first=Missions.missionStatus(state,context).task;
  const portion=Math.floor(first.requirements.wood/2);
  mission(state,'missionDeposit',{resource:'wood',amount:portion});
  state.worldTimeMs=first.deadline;Missions.advanceMissions(state,0,context);
  let status=Missions.missionStatus(state,context);
  assert.equal(status.kind,'support');assert.equal(status.total,5);
  assert.equal(state.lighthouseMissions.lastIncident.narrativeOnly,true);
  // The branch's final contribution uses the original total with its partial
  // deposit, and does not teleport a completed building or grant a fake level.
  const support=state.lighthouseMissions.stack.at(-1);
  support.index=5;support.task=null;Missions.advanceMissions(state,0,context);
  status=Missions.missionStatus(state,context);
  assert.equal(status.task.deposited.wood,portion);
  const before=state.resources.wood;
  finishContribution(state);
  assert.equal(before-state.resources.wood,first.requirements.wood-portion);
  status=Missions.missionStatus(state,context);
  // Lumber2 already exists, so it is precredited; next real objective is3/8.
  assert.equal(status.kind,'main');assert.equal(status.index,3);
  assert.ok(state.lighthouseMissions.receipts.includes(first.id));
});

test('support failure enters three rescue steps, failed rescue can retry and preserves receipts',()=>{
  const state=island();mission(state,'missionStart');
  state.worldTimeMs=Missions.missionStatus(state).task.deadline;Missions.advanceMissions(state,0,context);
  let top=state.lighthouseMissions.stack.at(-1);
  // Use a production step so an already-present crew cannot precredit it.
  top.index=2;top.task=null;Missions.advanceMissions(state,0,context);
  mission(state,'missionStart');state.worldTimeMs=Missions.missionStatus(state).task.deadline;Missions.advanceMissions(state,0,context);
  let status=Missions.missionStatus(state,context);
  assert.equal(status.kind,'rescue');assert.equal(status.total,3);
  // The assignment step may be ready; start it through the real resident action.
  if(status.task.objective.type==='assign'){
    ordinary(state,{type:'assign',building:status.task.objective.building,delta:1});
    status=Missions.missionStatus(state,context);
  }
  assert.equal(status.index,2);
  mission(state,'missionStart');
  const id=Missions.missionStatus(state).task.id;
  state.worldTimeMs=Missions.missionStatus(state).task.deadline;Missions.advanceMissions(state,0,context);
  status=Missions.missionStatus(state,context);
  assert.equal(status.kind,'rescue');assert.equal(status.index,2);assert.equal(status.task.status,'retry');
  assert.equal(status.task.id,id);
  const receipts=[...state.lighthouseMissions.receipts],coins=state.resources.coins;
  mission(state,'missionRetry');
  assert.deepEqual(state.lighthouseMissions.receipts,receipts);assert.equal(state.resources.coins,coins);
});

test('actual support and rescue deliveries resolve a nested contribution without charging it twice',()=>{
  const state=island();mission(state,'missionStart');
  const first=Missions.missionStatus(state,context).task;
  const portion=Math.floor(first.requirements.wood/2);
  mission(state,'missionDeposit',{resource:'wood',amount:portion});
  state.worldTimeMs=first.deadline;Missions.advanceMissions(state,0,context);
  ordinary(state,{type:'assign',building:'lumber',delta:1});
  assert.equal(Missions.missionStatus(state).index,2);
  mission(state,'missionStart');production(state,'wood',4);
  let status=Missions.missionStatus(state,context);
  assert.equal(status.kind,'support');assert.equal(status.index,3);
  mission(state,'missionStart');
  for(let i=0;i<50&&Missions.missionStatus(state).index===3;i++)tick(state,120);
  status=Missions.missionStatus(state,context);
  assert.equal(status.kind,'support');assert.equal(status.index,5);
  mission(state,'missionStart');
  state.worldTimeMs=Missions.missionStatus(state).task.deadline;Missions.advanceMissions(state,0,context);
  status=Missions.missionStatus(state,context);
  assert.equal(status.kind,'rescue');assert.equal(status.index,2);
  mission(state,'missionStart');
  for(let i=0;i<50&&Missions.missionStatus(state).kind==='rescue'&&Missions.missionStatus(state).index===2;i++)tick(state,120);
  status=Missions.missionStatus(state,context);
  assert.equal(status.kind,'rescue');assert.equal(status.index,3);
  assert.equal(status.task.deposited.wood,portion);
  const before=state.resources.wood;
  finishContribution(state);
  assert.equal(before-state.resources.wood,first.requirements.wood-portion);
  status=Missions.missionStatus(state,context);
  assert.equal(status.kind,'main');assert.equal(status.index,3);
  assert.equal(state.lighthouseMissions.stack.length,1);
  const receipts=state.lighthouseMissions.receipts;
  assert.equal(receipts.filter(id=>id===first.id).length,1);
  assert.equal(receipts.length,new Set(receipts).size);
});

test('mission normalization keeps the stack, precise deadline and one-time receipts after reload',()=>{
  const state=island();mission(state,'missionStart');
  const before=clone(state.lighthouseMissions);
  const restored=clone(state);Missions.normalizeMissions(restored,restored);Missions.advanceMissions(restored,0,context);
  assert.deepEqual(restored.lighthouseMissions,before);
  assert.equal(Missions.nextMissionEvent(restored),Missions.nextMissionEvent(state));
  assert.equal(Missions.missionAction(restored,{type:'missionStart',id:before.stack[0].task.id},context).ok,false);
});

test('malformed optional mission history arrays cannot prevent loading an existing island',()=>{
  const state=island();
  state.lighthouseMissions.completedLevels='2,3';
  state.lighthouseMissions.receipts={legacy:true};
  state.lighthouseMissions.stack='main';
  Missions.normalizeMissions(state,state);
  assert.deepEqual(state.lighthouseMissions.completedLevels,[]);
  assert.deepEqual(state.lighthouseMissions.receipts,[]);
  assert.equal(state.lighthouseMissions.stack.length,1);
  Missions.advanceMissions(state,0,context);
  assert.equal(Missions.missionStatus(state,context).index,1);
  assert.equal(state.resources.coins,10000);
});

function lighthouseSeven(){
  const state=island();
  for(const id of ['townhall','house','warehouse','lumber'])state.buildings[id].level=7;
  state.capacity=168;state.buildings.lighthouse.level=6;
  Missions.normalizeMissions(state,{});Missions.advanceMissions(state,0,context);
  state.lighthouseMissions.stack[0].index=8;state.lighthouseMissions.stack[0].task=null;
  Missions.advanceMissions(state,0,context);
  return state;
}

test('stock-ready building missions cannot start while all potential carriers are on non-recallable visits',()=>{
  const schedule={buildingCost:State.buildingCost,constructionEstimate:constructionScheduleEstimate};
  for(const alreadyStarted of [false,true]){
    const state=lighthouseSeven();
    if(alreadyStarted)ordinary(state,{type:'upgrade',building:'lighthouse'});
    ordinary(state,{type:'visitLighthouse',residentIds:state.residents.map(person=>person.id)});
    assert.equal(state.lighthouseVisits[0].remaining,14400);
    const status=Missions.missionStatus(state,schedule);
    assert.equal(status.canStart,false);
    assert.equal(status.plan.feasible,false);
    assert.equal(Missions.missionAction(state,{type:'missionStart',id:status.task.id},schedule).ok,false);
    assert.equal(status.task.deadline,null);
  }
});

test('building mission deadline includes the complete queue wait and stays frozen after acceptance',()=>{
  const state=lighthouseSeven();ordinary(state,{type:'upgrade',building:'lighthouse'});
  const schedule={buildingCost:State.buildingCost,constructionEstimate:()=>({total:300,queueWait:7200,completionTotal:7500})};
  const status=Missions.missionStatus(state,schedule);
  assert.equal(status.canStart,true);
  assert.ok(status.plan.duration>=7500*1.25);
  const result=Missions.missionAction(state,{type:'missionStart',id:status.task.id},schedule);
  assert.equal(result.ok,true);
  const deadline=Missions.missionStatus(state,schedule).task.deadline;
  Missions.missionStatus(state,{...schedule,constructionEstimate:()=>({total:300,completionTotal:300})});
  assert.equal(Missions.missionStatus(state,schedule).task.deadline,deadline);
});

test('assignment steps cannot promise a ten-minute completion using residents away on four-hour visits',()=>{
  const state=lighthouseSeven();
  state.lighthouseMissions.stack[0].index=1;state.lighthouseMissions.stack[0].task=null;Missions.advanceMissions(state,0,context);
  mission(state,'missionStart');
  ordinary(state,{type:'visitLighthouse',residentIds:state.residents.map(person=>person.id)});
  state.worldTimeMs=Missions.missionStatus(state).task.deadline;Missions.advanceMissions(state,0,context);
  const status=Missions.missionStatus(state,context);
  assert.equal(status.kind,'support');assert.equal(status.task.objective.type,'assign');
  assert.equal(status.canStart,false);
  assert.equal(Missions.missionAction(state,{type:'missionStart',id:status.task.id},context).ok,false);
});

test('a complete chapter uses actual production, purchased invitation and finished Lighthouse, once',()=>{
  const state=island();
  for(let i=0;i<6;i++)ordinary(state,{type:'assign',building:'warehouse',delta:1});
  tick(state,120);
  finishContribution(state);
  assert.equal(Missions.missionStatus(state).index,3);
  mission(state,'missionStart');production(state,'planks',20);
  let status=Missions.missionStatus(state,context);
  assert.equal(status.index,6); // Existing House2 and owned invitation cost count.
  mission(state,'missionStart');ordinary(state,{type:'buyResident'});
  status=Missions.missionStatus(state,context);
  assert.equal(status.index,8);
  assert.equal(state.buildings.lighthouse.level,1);
  mission(state,'missionStart');ordinary(state,{type:'upgrade',building:'lighthouse'});
  for(let i=0;i<100&&state.buildings.lighthouse.level<2;i++)tick(state,120);
  assert.equal(state.buildings.lighthouse.level,2);
  assert.equal(Missions.missionStatus(state).finished,true);
  assert.deepEqual(state.lighthouseMissions.completedLevels,[2]);
  assert.equal(new Set(state.lighthouseMissions.receipts).size,8);
  const coins=state.resources.coins;
  Missions.advanceMissions(state,0,context);Missions.missionAction(state,{type:'missionNext'},context);
  assert.equal(state.resources.coins,coins);assert.equal(state.buildings.lighthouse.level,2);
  const restored=clone(state);Missions.normalizeMissions(restored,restored);Missions.advanceMissions(restored,0,context);
  assert.equal(restored.resources.coins,coins);assert.equal(Missions.missionStatus(restored).finished,true);
});

const clone=value=>JSON.parse(JSON.stringify(value));
