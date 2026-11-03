import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, advanceTo, buildingCost } from '../harborlight-v1-state.js';
import { TUTORIAL_VERSION, V6_TUTORIAL_LESSONS as TUTORIAL_LESSONS, V5_TUTORIAL_LESSONS, tutorialRows, tutorialStatus, tutorialPendingRewards, normalizeProgression, loyaltyOfferStatus, recordProgressionLogin } from '../harborlight-v1-progression.js';
import { quoteTransport, quoteAcceleration, quotePremiumBuilding } from '../harborlight-v1-activities.js';
import { ordinaryWarehouseUsed, centralAvailable } from '../harborlight-v1-inventory.js';
import { warehouseLimits, starterConstructionTiming, constructionScheduleEstimate } from '../harborlight-v1-logistics.js';
import { runTutorialV28 } from './helpers/tutorial-v28-course.mjs';
const NOW = Date.parse('2026-11-02T10:00:00Z');
const MATERIALS = ['wood','stone','grain','food','planks'];
const command = (state, action) => { const r = act(state, action, state.worldTimeMs); assert.equal(r.ok,true,JSON.stringify({action,r})); return r; };
const reward = (state,id) => { command(state,{type:'claimTutorial',taskId:id});command(state,{type:'skipTutorialShare',taskId:id}); };
const reload = state => normalizeState(JSON.parse(JSON.stringify(state)),state.worldTimeMs);

test('curriculum 6 keeps 25 stable lessons and rewards the third carrier, not the first or second',()=>{
 const s=createState(NOW);
 assert.equal(TUTORIAL_VERSION,7);assert.equal(s.tutorial.curriculum,7);
 s.tutorial.curriculum=6;assert.equal(TUTORIAL_LESSONS.length,25);
 assert.deepEqual(TUTORIAL_LESSONS.map(x=>x.id).sort(),V5_TUTORIAL_LESSONS.map(x=>x.id).sort());
 assert.equal(tutorialRows(s)[0].progressRequired,3);
 for(let n=1;n<=2;n++){
  command(s,{type:'assign',building:'warehouse',delta:1});assert.equal(tutorialRows(s)[0].completed,false);
  assert.equal(act(s,{type:'claimTutorial',taskId:'island-map'},s.worldTimeMs).ok,false);
 }
 command(s,{type:'assign',building:'warehouse',delta:1});assert.equal(tutorialRows(s)[0].completed,true);
 assert.equal(s.tutorial.completed['storage-limits'],undefined);reward(s,'island-map');
 assert.deepEqual(buildingCost(s,'townhall'),{coins:100,wood:100,stone:100,grain:100,food:100,planks:100});
 assert.equal(starterConstructionTiming(s,{building:'townhall',cost:buildingCost(s,'townhall'),targetLevel:2}),null);
});

test('Town Hall lesson requires real transport and full acceleration receipts, preserved through reload',()=>{
 const {state:s,command:run}=runTutorialV28({through:4});
 run({type:'prepareTutorialUpgrade'});
 const project=run({type:'upgrade',building:'townhall'}).project;
 assert.equal(project.starterTurbo,undefined);assert.equal(s.tutorial.completed['townhall-upgrade'],undefined);
 assert.equal(tutorialRows(s)[4].currentSubstep.id,'transport');
 let restored=reload(s);assert.equal(restored.tutorial.guided.townhall.projectOrder,project.order);
 const transport=quoteTransport(restored,{route:'construction',project:project.order});assert.equal(transport.ok,true);assert.ok(restored.resources.coins>=transport.coins);
 command(restored,{type:'premiumTransport',route:'construction',project:project.order});
 assert.equal(tutorialRows(restored)[4].currentSubstep.id,'building');assert.equal(restored.tutorial.completed['townhall-upgrade'],undefined);
 restored=reload(restored);const quote=quoteAcceleration(restored,project.order,100);assert.equal(quote.ok,true);assert.ok(restored.resources.coins>=quote.coins);
 command(restored,{type:'premiumAccelerate',project:project.order,percent:100});
 assert.equal(restored.tutorial.completed['townhall-upgrade'],true);assert.equal(tutorialRows(restored)[4].currentSubstep,null);
 reward(restored,'townhall-upgrade');assert.equal(act(restored,{type:'claimTutorial',taskId:'townhall-upgrade'},restored.worldTimeMs).ok,false);
});

test('preceding reward funds the first construction using actual service quotes',()=>{
 const {state:s,command:run}=runTutorialV28({through:3});
 s.resources.coins=0;
 run({type:'assign',building:'lumber',delta:1});reward(s,'first-job');run({type:'prepareTutorialUpgrade'});
 const p=run({type:'upgrade',building:'townhall'}).project;
 const t=quoteTransport(s,{route:'construction',project:p.order});assert.equal(t.ok,true);assert.ok(s.resources.coins>=t.coins);
 run({type:'premiumTransport',route:'construction',project:p.order});
 const b=quoteAcceleration(s,p.order,100);assert.equal(b.ok,true);assert.ok(s.resources.coins>=b.coins);run({type:'premiumAccelerate',project:p.order,percent:100});
 assert.ok(s.resources.coins>=100,'fundingretainsasmallbufferwithoutcash');
});

test('return after ordinary delivery guides building acceleration instead of an unavailable transport button',()=>{
 const {state:s,command:run}=runTutorialV28({through:4});run({type:'prepareTutorialUpgrade'});
 const project=run({type:'upgrade',building:'townhall'}).project;
 const estimate=constructionScheduleEstimate(s,project);assert.ok(Number.isFinite(estimate.transport));
 advanceTo(s,s.worldTimeMs+estimate.transport*1000);
 assert.equal(project.stage,'building');assert.equal(s.tutorial.guided.townhall.transported,false);
 assert.equal(tutorialRows(s)[4].currentSubstep.id,'building');
 command(s,{type:'premiumAccelerate',project:project.order,percent:100});
 assert.equal(s.tutorial.completed['townhall-upgrade'],true);assert.equal(tutorialRows(reload(s))[4].currentSubstep,null);
});

test('lesson 11 keeps Construction and requires another carrier and Grain pickup preference',()=>{
 const {state:s,command:run}=runTutorialV28({through:10});
 assert.equal(tutorialRows(s)[10].currentSubstep.id,'carrier');
 run({type:'assign',building:'warehouse',delta:1});assert.equal(s.tutorial.completed['storage-limits'],undefined);
 assert.equal(tutorialRows(s)[10].currentSubstep.id,'priority');
 const restored=reload(s);command(restored,{type:'warehousePriority',priorities:['grain']});
 assert.equal(restored.tutorial.completed['storage-limits'],undefined,'constructionprioritymustremain');
 command(restored,{type:'warehousePriority',priorities:['construction','grain']});assert.equal(restored.tutorial.completed['storage-limits'],true);
 assert.equal(restored.tutorial.actionLedger.counts['assign-warehouse'],4);
 command(restored,{type:'warehousePriority',priorities:['construction']});
 assert.equal(tutorialRows(reload(restored))[10].currentSubstep,null,'later priority choices do not undo an earned lesson receipt');
});

test('Farm purchase charges one real quote without spending materials or an ordinary reservation',()=>{
 const {state:s}=runTutorialV28({through:15});
 const q=quotePremiumBuilding(s,'farm',{buildingCost});assert.equal(q.ok,true);assert.ok(s.resources.coins>=q.coins);
 const before=structuredClone(s.resources);
 command(s,{type:'premiumBuyBuilding',building:'farm'});
 assert.equal(s.resources.coins,before.coins-q.coins);
 for(const id of MATERIALS)assert.equal(s.resources[id],before[id]);
 assert.equal(s.constructionProjects.some(p=>p.building==='farm'),false);
 assert.equal(s.premiumServices.some(p=>p.building==='farm'),true);
 assert.equal(s.tutorial.completed['construction-queue'],true);
 advanceTo(s,s.worldTimeMs+10000);assert.equal(s.buildings.farm.level,2);
});

test('fresh 25-lesson course finishes through real services at TH2 with a full Warehouse and no pending chests',()=>{
 const {state:s,trace}=runTutorialV28();
 assert.equal(trace.length,25);assert.equal(tutorialStatus(s).finished,true);assert.equal(tutorialStatus(s).claimed,25);
 assert.equal(s.buildings.townhall.level,2);assert.equal(s.buildings.lighthouse.level,1);assert.equal(s.buildings.farm.level,2);assert.equal(s.buildings.warehouse.level,2);
 assert.equal(ordinaryWarehouseUsed(s),warehouseLimits(s).total);assert.ok(MATERIALS.every(id=>s.bonusMaterials[id]===0));
 assert.deepEqual(tutorialPendingRewards(s),[]);assert.equal(s.tutorial.actionLedger.taskReceipts.length,1);assert.equal(s.tutorial.actionLedger.expeditionReceipts.length,1);
 for(const id of ['townhall','quarry','warehouse','lighthouse'])assert.deepEqual({...s.tutorial.guided[id],projectOrder:0},{projectOrder:0,transported:true,accelerated:true});
 const old=structuredClone(s.resources),restored=reload(s);assert.equal(act(restored,{type:'finishTutorial'},restored.worldTimeMs).ok,false);assert.deepEqual(restored.resources,old);
});

test('paced course budgets remain affordable while the Mill and Sawmill consume real inputs between lessons',()=>{
 for(const seconds of [30,120]) {
  let warehouseInputs;
  const {state:s,trace}=runTutorialV28({beforeLesson:(state,_command,lesson)=>{
   advanceTo(state,state.worldTimeMs+seconds*1000);
   if(lesson.id==='house-points') {
    const cost=buildingCost(state,'warehouse');
    warehouseInputs={grain:state.resources.grain,wood:state.resources.wood,cost};
   }
  }});
  assert.ok(warehouseInputs.grain>warehouseInputs.cost.grain,'funding protects Grain consumed while reading the previous reward');
  assert.ok(warehouseInputs.wood>warehouseInputs.cost.wood,'funding protects Wood consumed while finding the Warehouse');
  assert.ok(s.statistics.crafted>0,'production actually ran during the course');
  assert.equal(trace.length,25);assert.equal(s.tutorial.settled,true);
  assert.equal(ordinaryWarehouseUsed(s),warehouseLimits(s).total);assert.ok(MATERIALS.every(id=>s.bonusMaterials[id]===0));
  assert.deepEqual(tutorialPendingRewards(s),[]);assert.equal(s.commerce.receipts.length,0);
 }
});

test('saved curriculum 5 keeps six carriers, old goals and rewards without switching to 6',()=>{
 const s=createState(NOW);normalizeProgression(s,{...s,tutorial:{version:5}});
 assert.equal(s.tutorial.version,7);assert.equal(s.tutorial.curriculum,5);assert.equal(tutorialRows(s)[0].assignmentCount,6);
 for(let n=0;n<6;n++)command(s,{type:'assign',building:'warehouse',delta:1});reward(s,'island-map');
 const old=structuredClone(s.tutorial.chests['island-map']);const restored=reload(s);
 assert.equal(restored.tutorial.curriculum,5);assert.deepEqual(restored.tutorial.chests['island-map'],old);
 assert.deepEqual(tutorialRows(restored).map(x=>[x.id,x.subject,x.goalLevel,x.assignmentCount]),V5_TUTORIAL_LESSONS.map(x=>[x.id,x.subject,x.goalLevel,x.assignmentCount]));
});

test('independently completed Town Hall cannot trap a player into buying the same level again',()=>{
 const {state:s,command:run}=runTutorialV28({through:4});run({type:'prepareTutorialUpgrade'});run({type:'upgrade',building:'townhall'});
 advanceTo(s,s.worldTimeMs+3600000);
 assert.equal(s.buildings.townhall.level,2);assert.equal(s.tutorial.skippedLessons['townhall-upgrade'],true);
 assert.equal(s.tutorial.chests['townhall-upgrade'],undefined);assert.notEqual(tutorialStatus(s).nextLessonId,'townhall-upgrade');
});

test('daily loyalty notification and popup offer appear once per Warsaw day and persist across reload',()=>{
 const s=createState(NOW);assert.equal(recordProgressionLogin(s),true);
 const first=loyaltyOfferStatus(s);assert.equal(first.available,true);assert.equal(s.notifications.filter(n=>n.kind==='loyalty-available').length,1);
 recordProgressionLogin(s);assert.equal(s.notifications.filter(n=>n.kind==='loyalty-available').length,1);
 const rewardBefore=structuredClone(first.reward);command(s,{type:'seeLoyaltyOffer'});
 let restored=reload(s);assert.equal(loyaltyOfferStatus(restored).available,false);assert.deepEqual(loyaltyOfferStatus(restored).reward,rewardBefore);
 assert.equal(restored.notifications.filter(n=>n.kind==='loyalty-available').length,1);
 command(restored,{type:'claimLoyalty'});restored=reload(restored);assert.equal(loyaltyOfferStatus(restored).eligible,false);assert.equal(loyaltyOfferStatus(restored).available,false);
 advanceTo(restored,NOW+86400000);recordProgressionLogin(restored);assert.equal(loyaltyOfferStatus(restored).available,true);
 assert.equal(restored.notifications.filter(n=>n.kind==='loyalty-available').length,2);
 restored.buildings.townhall.level=4;assert.equal(loyaltyOfferStatus(restored).available,false);
});
