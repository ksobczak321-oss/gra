import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../harborlight-v1-state.js';
import * as M from '../harborlight-v1-missions.js';
import * as L from '../harborlight-v1-logistics.js';
import * as P from '../harborlight-v1-provisions.js';
import { synchronizeResidents } from '../harborlight-v1-residents.js';
import { centralAvailable, quoteMaterialSpend } from '../harborlight-v1-inventory.js';

const NOW=Date.parse('2026-11-14T12:00:00Z');
const context={buildingCost:S.buildingCost,constructionEstimate:L.constructionScheduleEstimate};
function fixture({level=2,campaign=false,funded=true}={}){
 const raw=S.createState(NOW,{ruleset:32,onboarding:false});raw.tutorial.autoOpenDisabled=true;raw.welcome={startedAt:0,until:0};raw.buildings.townhall.level=level;raw.buildings.house.level=level;raw.buildings.warehouse.level=level;raw.buildings.lighthouse.level=level-1;
 for(const id of ['farm','windmill','lumber','sawmill','quarry'])raw.buildings[id].level=level;
 for(const b of Object.values(raw.buildings))b.workers=0;
 raw.resources=Object.fromEntries(Object.keys(raw.resources).map(id=>[id,funded?(id==='coins'?100000:3000):0]));raw.resources.food=0;
 const s=S.normalizeState(raw,NOW);for(const person of s.residents){person.happiness=0;person.newbornRemaining=0;}
 M.normalizeMissions(s,{lighthouseMissions:{version:1,campaignEnabled:campaign,completedLevels:[]}});M.advanceMissions(s,0,context);return s;
}
function action(s,a,extra={}){const r=S.act(s,a,s.worldTimeMs,extra);assert.equal(r.ok,true,JSON.stringify({a,r,mission:M.missionStatus(s,{...context,previewSteps:false})}));return r;}
function currentTask(s,objective,reward={}){
 const frame=s.lighthouseMissions.stack[0];frame.index=1;frame.task={id:frame.prefix+':test',status:'offered',objective,requirements:objective.requirements||{},deposited:{},title:'Test',titlePl:'Próba',description:'',descriptionPl:'',reward,duration:3600,offeredAt:s.worldTimeMs,acceptedAt:null,deadline:null,attempt:0};return frame.task;
}

test('DEV mission food checks and stock requirements accept flour without legacy Food',()=>{
 const s=fixture({funded:false});s.resources.flour=100;const task=currentTask(s,{type:'check',check:'food',value:1});M.advanceMissions(s,0,context);assert.ok(s.lighthouseMissions.receipts.includes(task.id));assert.equal(s.resources.food,0);
 const stock=currentTask(s,{type:'stock',requirements:{food:10}});M.advanceMissions(s,0,context);assert.ok(s.lighthouseMissions.receipts.includes(stock.id));assert.equal(s.resources.food,0);
});
test('virtual food mission contributions spend an actual protected food mix and rewards are real flour',()=>{
 const s=fixture({funded:false});s.resources.coins=100;s.resources.bread=20;const task=currentTask(s,{type:'contribute'},{food:7});task.requirements={food:2};s.lighthouseMissions.stack[0].index=8;const before=s.resources.bread;
 action(s,{type:'missionStart',id:task.id});action(s,{type:'missionDeposit',id:task.id,resource:'food',amount:2});assert.ok(s.lighthouseMissions.receipts.includes(task.id));assert.ok(s.resources.bread<before);assert.equal(s.resources.food,0);assert.equal(s.lighthouseMissions.lastReward.reward.food,undefined);assert.equal(s.lighthouseMissions.lastReward.reward.flour,7);assert.ok(s.resources.flour+(s.pendingDeliveries.flour||0)>=7);
});
test('food aliases and direct ingredients share a joint physical budget during mission preflight',()=>{
 const s=fixture({funded:false});s.resources.grain=s.population*6+6;assert.equal(L.availableGoods(s,'food'),1);assert.equal(centralAvailable(s,'grain'),6);assert.equal(quoteMaterialSpend(s,{grain:1,food:1}).ok,false);
 const proof=M.missionFeasibility(s,{grain:1,food:1},{allowProduction:false});assert.equal(proof.ready,false);assert.equal(proof.feasible,false);
});
test('incomplete construction-food previews preserve the full virtual meal cost in readiness',()=>{
 const s=fixture({campaign:true,funded:false});s.resources.coins=100000;s.resources.wood=3000;s.resources.stone=3000;s.resources.planks=3000;
 const readiness=M.campaignReadiness(s,context),building=readiness.steps.find(row=>row.index===8);assert.ok(building.requirements.food>0);assert.ok(building.missing.food>0);assert.equal(building.complete,false);
});
test('DEV feasibility plans four grain for each new flour output, rather than the old two-grain Food recipe',()=>{
 const s=fixture({funded:false}),plan=M.missionFeasibility(s,{}, {duration:3600,productionResource:'food',productionAmount:10});
 assert.equal(plan.feasible,true);assert.equal(plan.staffing.windmill,2);assert.equal(plan.staffing.farm,8);
});
test('DEV production and delivery mission metrics follow actual flour rather than generic food',()=>{
 const s=fixture(),initial=5;s.economyLedger.produced.flour=initial;s.economyLedger.delivered.flour=initial;
 const task=currentTask(s,{type:'production',resource:'food',count:2,baseline:initial});task.status='active';task.acceptedAt=NOW;task.deadline=NOW+3600000;s.economyLedger.produced.food=10000;M.advanceMissions(s,0,context);assert.equal(s.lighthouseMissions.receipts.includes(task.id),false);s.economyLedger.produced.flour+=2;M.advanceMissions(s,0,context);assert.ok(s.lighthouseMissions.receipts.includes(task.id));
 const delivered=currentTask(s,{type:'delivered',resource:'food',count:2,baseline:initial});delivered.status='active';delivered.acceptedAt=NOW;delivered.deadline=NOW+3600000;s.economyLedger.delivered.flour+=2;M.advanceMissions(s,0,context);assert.ok(s.lighthouseMissions.receipts.includes(delivered.id));
});
test('saved DEV mission food rewards migrate to flour once while legacy remains generic food',()=>{
 const s=fixture(),task=currentTask(s,{type:'contribute'},{food:11,flour:2});task.requirements={wood:1};const saved=JSON.parse(JSON.stringify(s));M.normalizeMissions(s,saved);assert.deepEqual(s.lighthouseMissions.stack[0].task.reward,{flour:13});M.normalizeMissions(s,JSON.parse(JSON.stringify(s)));assert.deepEqual(s.lighthouseMissions.stack[0].task.reward,{flour:13});
 const legacy=S.createState(NOW);legacy.tutorial.autoOpenDisabled=true;legacy.buildings.townhall.level=2;M.normalizeMissions(legacy,saved);assert.deepEqual(legacy.lighthouseMissions.stack[0].task.reward,{food:11});
});
test('DEV chapter three uses the actual eighty-one-person TH4 prerequisite',()=>{
 const s=fixture({level:3,campaign:true});M.normalizeMissions(s,{lighthouseMissions:{version:1,campaignEnabled:true,completedLevels:[2]}});M.advanceMissions(s,0,context);const rows=M.campaignReadiness(s,context).steps;
 assert.match(rows[0].titlePl,/81/);assert.equal(rows[3].objective.recruitmentTarget,81);assert.equal(rows[4].objective.targetPopulation,81);assert.equal(rows[6].prerequisites.find(p=>p.type==='population').target,81);
});
test('actually claimed rescued people satisfy the destination invitation, never the origin island',()=>{
 const origin=fixture({funded:false}),target=fixture({funded:false});target.islandId='island-2';target.islandRole='daughter';target.residents.forEach(p=>p.personUid='island-2:resident-'+p.id);
 const originTask=currentTask(origin,{type:'invitation',count:1,baseline:0});const targetTask=currentTask(target,{type:'invitation',count:2,baseline:0});
 origin.civilianRescue={version:32,groups:[{id:'rescue-test',remaining:3}],receipts:[],sequence:1};target.civilianRescue=origin.civilianRescue;
 const result=action(origin,{type:'civilianRescueClaim',groupId:'rescue-test',islandId:'island-2',amount:2},{worlds:[origin,target]});
 assert.equal(result.accepted,2);assert.equal(origin.lighthouseMissions.invited,0);assert.equal(origin.lighthouseMissions.receipts.includes(originTask.id),false);assert.equal(target.lighthouseMissions.invited,2);assert.ok(target.lighthouseMissions.receipts.includes(targetTask.id));
});
test('first DEV Lighthouse chapter completes its eight real steps, production and build with no old Food',{timeout:60000},()=>{
 const s=fixture({campaign:true});
 for(const id of ['farm','windmill','lumber','quarry','sawmill'])action(s,{type:'assign',building:id,delta:1});action(s,{type:'assign',building:'warehouse',delta:3});S.tick(s,120);
 const encountered=new Set();let guard=0;
 while(!s.lighthouseMissions.completedLevels.includes(2)&&guard++<160){
  M.advanceMissions(s,0,context);if(s.lighthouseMissions.completedLevels.includes(2))break;
  const status=M.missionStatus(s,context),task=status.task,o=task.objective;encountered.add(status.index);
  if(o.type==='review'){action(s,{type:'missionReview',id:task.id});continue;}
  if(o.type==='contribute'){if(!status.active)action(s,{type:'missionStart',id:task.id});for(const[id,n]of Object.entries(task.requirements))if(n>(task.deposited[id]||0))action(s,{type:'missionDeposit',id:task.id,resource:id,amount:n-(task.deposited[id]||0)});continue;}
  if(o.type==='production'){if(!status.active)action(s,{type:'missionStart',id:task.id});S.tick(s,120);continue;}
  if(o.type==='recruitment'){action(s,{type:'buyResident',quantity:1});continue;}
  if(o.type==='building'){if(!status.active)action(s,{type:'missionStart',id:task.id});if(!s.buildings[o.building].construction)action(s,{type:'upgrade',building:o.building});S.tick(s,120);continue;}
  if(['stock','check'].includes(o.type)){S.tick(s,60);continue;}
  assert.fail('Unexpected first-chapter objective '+o.type);
 }
 assert.ok(s.lighthouseMissions.completedLevels.includes(2),JSON.stringify(M.missionStatus(s,context)));assert.ok(s.economyLedger.produced.planks>=6);assert.equal(s.buildings.lighthouse.level,2);assert.equal(s.resources.food,0);assert.ok(s.lighthouseMissions.worldChanges.some(row=>row.level===2));assert.ok(encountered.has(3)&&encountered.has(4)&&encountered.has(6)&&encountered.has(8));for(let index=1;index<=8;index++)assert.ok(s.lighthouseMissions.receipts.includes(`lighthouse-chapter-2:${index}`));
});
