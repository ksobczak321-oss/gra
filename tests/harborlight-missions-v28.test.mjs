import test from 'node:test';
import assert from 'node:assert/strict';
import * as State from '../harborlight-v1-state.js';
import * as Missions from '../harborlight-v1-missions.js';
import { grantBonusMaterials } from '../harborlight-v1-inventory.js';
import { synchronizeResidents } from '../harborlight-v1-residents.js';
import { constructionEstimate, missionProductionMultiplier } from '../harborlight-v1-logistics.js';

const NOW=Date.parse('2026-11-02T12:00:00Z');
const context={buildingCost:State.buildingCost,constructionEstimate};
const clone=value=>JSON.parse(JSON.stringify(value));
function island(){
  const state=State.createState(NOW);
  state.tutorial.autoOpenDisabled=true;
  state.buildings.townhall.level=2;state.buildings.house.level=2;state.capacity=48;
  state.buildings.lighthouse.level=1;
  state.resources.coins=10000;
  grantBonusMaterials(state,{wood:5000,stone:5000,grain:5000,food:5000,planks:5000});
  Missions.normalizeMissions(state,{});Missions.advanceMissions(state,0,context);
  return state;
}
function preparedReward(state,reward){
  const frame=state.lighthouseMissions.stack.at(-1);
  frame.task.requirements={wood:1};frame.task.deposited={};frame.task.reward=reward;
  let result=Missions.missionAction(state,{type:'missionStart',id:frame.task.id},context);assert.equal(result.ok,true,result.message);
  result=Missions.missionAction(state,{type:'missionDeposit',id:frame.task.id,resource:'wood',amount:1},context);assert.equal(result.ok,true,result.message);
  return frame.task?.id||state.lighthouseMissions.lastReward.id;
}
const value=goods=>Object.entries(goods).reduce((sum,[id,n])=>sum+n*(id==='coins'?1:['food','planks'].includes(id)?1.5:.5),0);

test('tiny affordable requirements cannot retain the reward of the original large offer',()=>{
  const request={wood:500,stone:500};
  const reward={coins:109,stone:514};
  const fitted=Missions.fitTaskRewardToRequirements(reward,request,{wood:1,stone:1});
  assert.deepEqual(fitted,{coins:1});
  assert.ok(value(fitted)<=value({wood:1,stone:1}));
  assert.deepEqual(request,{wood:500,stone:500});
  assert.deepEqual(reward,{coins:109,stone:514});
});

test('reward fitting values processed goods separately and never exceeds the final requirement budget',()=>{
  for(const requirements of [{wood:1,stone:1},{wood:1,planks:1},{food:7,grain:2},{stone:30,wood:20}]){
    const fitted=Missions.fitTaskRewardToRequirements({coins:1,wood:1000,food:50},{wood:1000,food:1000},requirements);
    assert.ok(value(fitted)<=value(requirements)+1e-8);
  }
  const wood=Missions.fitTaskRewardToRequirements({coins:100},{wood:100},{wood:10});
  const planks=Missions.fitTaskRewardToRequirements({coins:100},{wood:100},{planks:10});
  assert.ok(planks.coins>wood.coins);
});

test('invitation preparation uses the completed Town Hall even when its next level is queued',()=>{
  const state=island();state.constructionProjects.push({building:'townhall',targetLevel:3,stage:'queued',order:99});
  const expected=Object.fromEntries(['coins','wood','stone','grain','food','planks'].map(id=>[id,1000]));
  assert.deepEqual(Missions.missionResidentCost(state),expected);
  const frame=state.lighthouseMissions.stack[0];frame.index=5;frame.task=null;
  for(const key of Object.keys(state.resources))state.resources[key]=0;
  state.bonusMaterials={wood:0,stone:0,grain:0,food:0,planks:0};
  Missions.advanceMissions(state,0,context);
  assert.deepEqual(Missions.missionStatus(state,context).task.requirements,expected);
});

test('fast Town Hall growth keeps the current chapter and queues every intervening level',()=>{
  const state=island();state.buildings.townhall.level=5;
  Missions.advanceMissions(state,0,context);
  assert.equal(state.lighthouseMissions.chapter.level,2);
  for(const completed of [2,3,4]){
    state.lighthouseMissions.chapter.status='completed';state.lighthouseMissions.completedLevels.push(completed);state.lighthouseMissions.stack=[];
    Missions.advanceMissions(state,0,context);
    assert.equal(state.lighthouseMissions.chapter.level,completed+1);
  }
});

test('chapter introduction is narrative, persistent and never starts a task deadline',()=>{
  const state=island();const intro=Missions.missionStoryIntro(state);
  assert.equal(intro.available,true);assert.equal(intro.id,'meteor-tourists');assert.equal(intro.steps,8);
  assert.match(intro.descriptionPl,/gości|turyst/);
  assert.equal(Missions.missionStatus(state).task.deadline,null);
  const result=Missions.missionAction(state,{type:'missionIntroSeen',chapterId:intro.chapterId},context);
  assert.equal(result.ok,true);assert.equal(Missions.missionStoryIntro(state).available,false);
  assert.equal(Missions.missionStatus(state).task.deadline,null);
  const restored=clone(state);Missions.normalizeMissions(restored,restored);Missions.advanceMissions(restored,0,context);
  assert.equal(Missions.missionStoryIntro(restored).available,false);
  assert.equal(Missions.missionStatus(restored).task.deadline,null);
  assert.equal(Missions.missionAction(restored,{type:'missionIntroSeen',chapterId:'lighthouse-chapter-99'},context).ok,false);
});

test('castaway reward admits only free Town Hall places and never queues the rest or repeats on reload',()=>{
  const state=island();state.population=46;synchronizeResidents(state);
  const existing=new Set(state.residents.map(p=>p.personUid));
  preparedReward(state,{coins:0,residents:5});
  assert.equal(state.population,48);assert.equal(state.residents.length,48);
  assert.equal(state.residents.filter(p=>!existing.has(p.personUid)).length,2);
  assert.deepEqual([state.lighthouseMissions.lastReward.residentsRequested,state.lighthouseMissions.lastReward.residentsAccepted,state.lighthouseMissions.lastReward.residentsUnaccepted],[5,2,3]);
  assert.match(state.notifications.find(n=>n.kind==='lighthouse-mission-step').messagePl,/2 z 5/);
  assert.equal(state.pendingCastaways,undefined);
  const restored=clone(state);Missions.normalizeMissions(restored,restored);Missions.advanceMissions(restored,0,context);
  assert.equal(restored.population,48);assert.equal(restored.residents.length,48);
});

test('production prize multiplies Lighthouse output, expires inside offline catch-up and is not paid twice',()=>{
  const state=island();
  const person=state.residents[0];person.workplace='quarry';person.arrivalRemaining=0;state.buildings.quarry.workers=1;
  state.resources.stone=0;state.bonusMaterials.stone=0;
  state.lighthouseRemaining=600;state.engagement.activeUntil=0;state.engagement.lastRealActivityAt=state.worldTimeMs;
  preparedReward(state,{coins:0,production:{building:'quarry',multiplier:2,seconds:60}});
  assert.equal(missionProductionMultiplier(state,'quarry'),2);
  assert.equal(State.resourceRates(state).stone.production,160);
  const until=state.missionProductionBonuses[0].until;
  const restored=clone(state);Missions.normalizeMissions(restored,restored);Missions.advanceMissions(restored,0,context);
  assert.equal(restored.missionProductionBonuses[0].until,until);
  State.tick(state,120);
  assert.equal(missionProductionMultiplier(state,'quarry'),1);
  assert.equal(state.buildings.quarry.ready,4);
  assert.equal(State.resourceRates(state).stone.production,80);
});

test('a second producer prize extends the same factor rather than multiplying it',()=>{
  const state=island();preparedReward(state,{coins:0,production:{building:'quarry',multiplier:2,seconds:120}});
  const initial=state.missionProductionBonuses[0].until;
  const frame=state.lighthouseMissions.stack[0];frame.index=3;
  frame.task={id:'lighthouse-chapter-2:test-second',status:'active',objective:{type:'production',resource:'stone',baseline:0,count:0},requirements:{},deposited:{},title:'Reward',titlePl:'Nagroda',description:'',descriptionPl:'',reward:{coins:0,production:{building:'quarry',multiplier:2,seconds:120}},duration:600,offeredAt:state.worldTimeMs,acceptedAt:state.worldTimeMs,deadline:state.worldTimeMs+600000,attempt:0};
  Missions.advanceMissions(state,0,context);
  assert.equal(state.missionProductionBonuses.length,1);
  assert.equal(state.missionProductionBonuses[0].until,initial+120000);
  assert.equal(missionProductionMultiplier(state,'quarry'),2);
});

test('saved accepted task rewards stay unchanged and malformed bonus entries cannot block loading',()=>{
  const state=island();const original=state.lighthouseMissions.stack[0].task;
  original.reward={coins:57};original.status='active';original.deadline=state.worldTimeMs+600000;original.acceptedAt=state.worldTimeMs;
  state.missionProductionBonuses=[null,{building:'unknown',until:state.worldTimeMs+100000},{building:'farm',until:state.worldTimeMs-1000}];
  Missions.normalizeMissions(state,state);
  assert.deepEqual(state.lighthouseMissions.stack[0].task.reward,{coins:57});
  assert.deepEqual(state.missionProductionBonuses,[]);
});
