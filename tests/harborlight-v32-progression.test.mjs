import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, advanceTo, buildingCost } from '../harborlight-v1-state.js';
import { TUTORIAL_LESSONS, tutorialRows, tutorialStatus, tutorialPendingRewards, recordProgressionLogin, loyaltyStatus } from '../harborlight-v1-progression.js';
import { quoteTransport, quoteAcceleration } from '../harborlight-v1-activities.js';
import { leisureOffers } from '../harborlight-v1-leisure.js';
import { ordinaryWarehouseUsed } from '../harborlight-v1-inventory.js';
import { warehouseLimits } from '../harborlight-v1-logistics.js';

const NOW=Date.parse('2026-11-15T10:00:00Z');
function runCourse({through=25,pause=0}={}){
 const state=createState(NOW,{ruleset:32,onboarding:false}),trace=[];
 const command=action=>{const r=act(state,action,state.worldTimeMs);assert.equal(r.ok,true,JSON.stringify({action,r,lesson:tutorialStatus(state).nextLessonId,stock:state.resources}));assert.equal(state.resources.food,0,'no course action mints legacy Food');return r;};
 const wait=seconds=>{advanceTo(state,state.worldTimeMs+seconds*1000);command({type:'userActivity',visible:true,focused:true});};
 for(const lesson of TUTORIAL_LESSONS.slice(0,through)){
  if(pause)wait(pause);command({type:'userActivity',visible:true,focused:true});
  if(!state.tutorial.completed[lesson.id]){
   if(lesson.kind==='condition'){let seconds=0;while(!state.tutorial.completed[lesson.id]&&seconds<86400){wait(10);seconds+=10;}assert.equal(state.tutorial.completed[lesson.id],true,lesson.id);}
   else if(lesson.guidedService==='construction'){
    if(lesson.id==='townhall-upgrade')command({type:'prepareTutorialUpgrade'});
    const project=command({type:state.buildings[lesson.route].level?'upgrade':'build',building:lesson.route}).project;
    assert.equal(quoteTransport(state,{route:'construction',project:project.order}).ok,true);command({type:'premiumTransport',route:'construction',project:project.order});assert.equal(quoteAcceleration(state,project.order,100).ok,true);command({type:'premiumAccelerate',project:project.order,percent:100});wait(1);
   }else if(lesson.guidedService==='full-purchase')command({type:'premiumBuyBuilding',building:lesson.route});
   else if(lesson.guidedService==='pickup'){command({type:'assign',building:'warehouse',delta:1});command({type:'warehousePriority',priorities:['construction','grain']});}
   else if(lesson.subject.startsWith('assign-')){for(let n=0;n<(lesson.assignmentCount||1);n++)command({type:'assign',building:lesson.subject.slice(7),delta:1});}
   else if(lesson.subject.startsWith('upgrade-')&&lesson.subject!=='upgrade-road'){if(lesson.id==='townhall-upgrade')command({type:'prepareTutorialUpgrade'});const b=lesson.subject.slice(8);command({type:state.buildings[b].level?'upgrade':'build',building:b});}
   else if(lesson.subject==='transport-priority')command({type:'warehousePriority',priorities:['construction']});
   else if(lesson.subject==='house-points')command({type:'houseHappinessAll',amount:1});
   else if(lesson.subject==='upgrade-road')command({type:'upgradeRoad',level:1});
   else if(lesson.subject==='buy-attraction'){const offer=leisureOffers(state).filter(o=>o.available&&o.price<=state.resources.coins).sort((a,b)=>a.price-b.price)[0];assert.ok(offer);command({type:'buyAttraction',id:offer.id});}
   else if(lesson.subject==='chapel-blessing')command({type:'blessing'});
   else if(lesson.subject==='task-complete'){
    const task=state.lighthouseTasks.find(t=>t.tutorialStarter||t.tutorial||t.id.startsWith('tutorial-'));assert.ok(task,'introductory lighthouse task');command({type:'taskAccept',task:task.id});command({type:'confirmTaskAcceptance',task:task.id});for(const[resource,amount]of Object.entries(task.requirements))command({type:'taskDeposit',task:task.id,resource,amount});const a=state.taskAchievements.find(a=>a.taskId===task.id);if(a)command({type:'skipTaskAchievement',id:a.id});
   }else if(lesson.subject==='expedition-complete'){
    command({type:'expeditionStart',expedition:'misty',gameKind:'triples'});const run=state.expeditionRuns.misty;for(let symbol=0;symbol<run.miniGame.symbolCount;symbol++)for(let index=0;index<run.miniGame.cards.length;index++)if(run.miniGame.cards[index]===symbol)command({type:'expeditionMiniGameReveal',runId:run.id,index});command({type:'expeditionCashout',runId:run.id});
   }else if(lesson.subject==='finish-tutorial')command({type:'finishTutorial'});
   else assert.fail('Unknown course action '+lesson.subject);
  }
  assert.equal(state.tutorial.completed[lesson.id],true,lesson.id);
  if(!state.tutorial.claimed[lesson.id]&&!state.tutorial.skippedLessons[lesson.id])command({type:'claimTutorial',taskId:lesson.id});
  const chest=state.tutorial.chests[lesson.id];if(chest&&!chest.shared&&!chest.skipped)command({type:'skipTutorialShare',taskId:lesson.id});
  assert.equal(chest?.reward?.food||0,0);trace.push({id:lesson.id,reward:{...chest?.reward}});
 }
 return {state,trace,command,wait};
}

test('the actual 25-lesson DEV course completes without old Food or developer stock',()=>{
 const{state:s,trace}=runCourse();assert.equal(trace.length,25);assert.equal(tutorialStatus(s).finished,true);assert.equal(tutorialStatus(s).claimed,25);assert.equal(s.buildings.townhall.level,2);assert.equal(s.buildings.lighthouse.level,1);assert.equal(s.buildings.warehouse.level,2);assert.equal(s.buildings.farm.level,2);assert.equal(s.resources.food,0);assert.ok(['wood','stone','grain','flour','planks'].every(id=>s.resources[id]>0&&s.resources[id]<=warehouseLimits(s).perResource));assert.ok(Math.abs(ordinaryWarehouseUsed(s)-warehouseLimits(s).total)<1e-6);assert.deepEqual(tutorialPendingRewards(s),[]);assert.equal(s.tutorial.actionLedger.taskReceipts.length,1);assert.equal(s.tutorial.actionLedger.expeditionReceipts.length,1);assert.ok(Object.keys(trace.at(-1).reward).every(id=>['coins','wood','stone','grain','flour','planks'].includes(id)),'final aid does not create undiscovered products or specialist outfits');
});
test('reading between every lesson keeps the DEV course funded while real rations and production run',()=>{
 const{state:s,trace}=runCourse({pause:30});assert.equal(trace.length,25);assert.equal(s.tutorial.settled,true);assert.ok(s.statistics.crafted>0);assert.ok(s.resources.flour>0);assert.equal(s.resources.food,0);
});
test('first building aid keeps resident meals while the Town Hall quote has no food or grain',()=>{
 const{state:s,command}=runCourse({through:4});for(const id of ['grain','vegetables','flour'])s.resources[id]=0;
 const raw=buildingCost(s,'townhall');assert.equal(raw.foodQuote,undefined);assert.equal(raw.foodUnits,undefined);assert.equal(raw.grain,undefined);assert.equal(raw.food,undefined);
 const supplied=command({type:'prepareTutorialUpgrade'});assert.ok(supplied.reward.flour>0,'ordinary aid still supplies resident meals');assert.equal(supplied.reward.food,undefined);assert.deepEqual(buildingCost(s,'townhall'),raw);assert.equal(command({type:'upgrade',building:'townhall'}).ok,true);
});
test('typed flour rewards and unopened saved chests survive root normalization without rerolls',()=>{
 const{state:s}=runCourse({through:4});const previous=structuredClone(s.tutorial.chests),restored=normalizeState(JSON.parse(JSON.stringify(s)),s.worldTimeMs);assert.deepEqual(restored.tutorial.chests,previous);assert.equal(restored.resources.food,0);assert.ok(restored.resources.flour>0);
});
test('daily login rewards use flour rather than newly minted legacy Food and remain stable after save',()=>{
 const s=createState(NOW,{ruleset:32});recordProgressionLogin(s,NOW);const reward=loyaltyStatus(s).reward;assert.ok(reward.flour>=50&&reward.flour<=200);assert.equal(reward.food,undefined);const restored=normalizeState(JSON.parse(JSON.stringify(s)),NOW);assert.deepEqual(loyaltyStatus(restored).reward,reward);assert.equal(act(restored,{type:'claimLoyalty'},NOW).ok,true);assert.equal(restored.resources.food,0);
});
