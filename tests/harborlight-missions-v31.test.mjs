import test from 'node:test';
import assert from 'node:assert/strict';
import * as State from '../harborlight-v1-state.js';
import * as Missions from '../harborlight-v1-missions.js';
import * as Logistics from '../harborlight-v1-logistics.js';
import * as Adventures from '../harborlight-v1-adventures.js';
import {islandPuzzleSolution} from '../harborlight-v1-island-puzzles.js';
import {CAMPAIGN_CHAPTERS,CAMPAIGN_DAYS,CAMPAIGN_LEVEL_WINDOWS,campaignBudget,campaignStepReward,campaignDayPlan} from '../harborlight-v1-campaign.js';
import {STORY_CATALOG,ISLAND_PUZZLE_CATALOG} from '../harborlight-v1-story-catalog.js';
import {grantBonusMaterials} from '../harborlight-v1-inventory.js';
import {synchronizeResidents} from '../harborlight-v1-residents.js';

const NOW=Date.parse('2026-11-04T12:00:00Z');
const ctx={buildingCost:State.buildingCost,constructionEstimate:Logistics.constructionScheduleEstimate};
const copy=x=>JSON.parse(JSON.stringify(x));
function island(level=2,{campaign=true,population=13}={}){
  const s=State.createState(NOW);s.tutorial.autoOpenDisabled=true;
  for(const id of ['townhall','house','warehouse','lumber','quarry','farm','windmill','sawmill'])s.buildings[id].level=level;
  s.buildings.lighthouse.level=Math.max(1,level-1);s.capacity=level*24;s.population=population;synchronizeResidents(s);
  s.resources.coins=100000;grantBonusMaterials(s,{wood:100000,stone:100000,grain:100000,food:100000,planks:100000});
  Missions.normalizeMissions(s,{lighthouseMissions:{version:1,campaignEnabled:campaign,completedLevels:Array.from({length:Math.max(0,level-2)},(_,i)=>i+2)}});
  Missions.advanceMissions(s,0,ctx);return s;
}
function step(s,index){const frame=s.lighthouseMissions.stack[0];frame.index=index;frame.task=null;Missions.advanceMissions(s,0,ctx);return Missions.missionStatus(s,ctx);}
function lowBudget(s,amount){s.resources.coins=amount;for(const id of Logistics.MATERIAL_IDS){s.resources[id]=amount+(id==='food'?Logistics.foodReserve(s):0);s.bonusMaterials[id]=amount;}}
function actualRescue(s,offer){
  const context={adventureRescueContext:offer,claimAdventureReward(state,payload){
    const quote=Missions.recruitmentRewardQuote(state,payload.rescueContext);assert.equal(quote.ok,true,quote.message);
    state.population+=quote.residentsAccepted;synchronizeResidents(state);
    state.resources.coins+=quote.supplies.coins||0;grantBonusMaterials(state,quote.supplies);
    const committed=Missions.recordMissionAssistance(state,payload.rescueContext,{residentsAccepted:quote.residentsAccepted,supplies:quote.supplies,completionReceiptId:payload.completionReceiptId});assert.equal(committed.ok,true,committed.message);
    return {...quote,reward:quote.supplies};
  }};
  const started=Adventures.adventureAction(s,{type:'adventureStart',kind:'escapeStory',storyId:'captainless-ship',variant:1},context);assert.equal(started.ok,true,started.message);
  let final;
  while(s.adventures.active.stage!=='complete'){
    const run=s.adventures.active,p=run.data.puzzle;
    assert.equal(Adventures.adventureAction(s,{type:'adventureInput',adventureId:run.id,command:'puzzleNextRoom'},context).ok,false,'unsolved room must not advance');
    for(const move of islandPuzzleSolution(p)){
      const result=Adventures.adventureAction(s,{type:'adventureInput',adventureId:run.id,command:'puzzleMove',move},context);assert.equal(result.ok,true,result.message);
    }
    final=Adventures.adventureAction(s,{type:'adventureInput',adventureId:run.id,command:'puzzleNextRoom'},context);assert.equal(final.ok,true,final.message);
  }
  Missions.advanceMissions(s,0,ctx);return final;
}

test('nineteen varied chapters contain exactly152 achievable provider-independent objectives',()=>{
  assert.equal(CAMPAIGN_CHAPTERS.length,19);assert.equal(CAMPAIGN_CHAPTERS.flatMap(c=>c.steps).length,152);
  const signatures=new Set();
  for(const chapter of CAMPAIGN_CHAPTERS){
    assert.equal(chapter.steps.length,8);assert.equal(chapter.level>=2&&chapter.level<=20,true);
    const seen=new Set(chapter.steps.map(s=>s.title.pl));assert.equal(seen.size,8,chapter.title.pl);
    signatures.add(chapter.steps.map(s=>s.type+':'+(s.puzzleKind||s.storyId||s.resource||s.check||s.building||'')).join('|'));
    for(const o of chapter.steps){
      assert.ok(!['league','pvp','advertisement','paidDonation','colony'].includes(o.type));
      if(o.kind==='escapeStory')assert.ok(STORY_CATALOG.some(s=>s.id===o.storyId&&s.unlockLevel<=chapter.level));
      if(o.kind==='islandPuzzle')assert.ok(ISLAND_PUZZLE_CATALOG.some(s=>s.id===o.puzzleKind));
      if(o.target)assert.ok(o.target<=100);
    }
  }
  assert.equal(signatures.size,19);
  assert.equal(CAMPAIGN_CHAPTERS.flatMap(c=>c.steps).filter(o=>o.type==='recruitment'&&!o.targetPopulation).length,1,'paid invitations are not repeated every level');
});

test('fifty days and twenty windows are indicative metadata, never calendar gates',()=>{
  assert.equal(CAMPAIGN_DAYS.length,50);assert.equal(CAMPAIGN_LEVEL_WINDOWS.length,20);
  assert.deepEqual(CAMPAIGN_DAYS.map(d=>d.day),Array.from({length:50},(_,i)=>i+1));
  assert.ok(CAMPAIGN_DAYS.every(d=>d.titlePl&&d.titleEn&&d.focusPl&&d.focusEn&&d.minActiveMinutes===180));
  assert.equal(campaignDayPlan(1).levelRange,CAMPAIGN_DAYS[0].levelRange);
  const s=island(20);assert.equal(Missions.missionStatus(s,ctx).chapter.level,20,'a ready island need not wait50days');
});

test('chapter coin allocations are fixed and sum to60percent of one canonical Town Hall cost',()=>{
  for(let level=2;level<=20;level++){
    const budget=campaignBudget(level);assert.equal(budget.canonical,500*level);assert.equal(budget.materials,budget.canonical);
    assert.equal(Array.from({length:8},(_,i)=>campaignStepReward(level,i+1).coins).reduce((a,b)=>a+b,0),Math.floor(.6*budget.canonical));
  }
  const s=island(2),before=Missions.missionStatus(s,ctx).task.reward;
  s.resources.coins=0;s.buildings.townhall.level=3;
  assert.deepEqual(Missions.missionStatus(s,ctx).task.reward,before,'spending and upgrading do not raise an already offered step reward');
});

test('enabling the new campaign preserves an accepted legacy contribution and its clock',()=>{
  const s=island(2,{campaign:false});let status=Missions.missionStatus(s,ctx);
  Missions.missionAction(s,{type:'missionStart',id:status.task.id},ctx);
  Missions.missionAction(s,{type:'missionDeposit',id:status.task.id,resource:'wood',amount:1},ctx);
  const accepted=copy(s.lighthouseMissions.stack[0].task);Missions.enableCampaign(s);Missions.advanceMissions(s,0,ctx);
  assert.deepEqual(s.lighthouseMissions.stack[0].task,accepted);
  const restored=copy(s);Missions.normalizeMissions(restored,restored);
  assert.deepEqual(restored.lighthouseMissions.stack[0].task,accepted);assert.equal(restored.lighthouseMissions.campaignEnabled,true);
});

test('legacy invitation rechecks current cost before acceptance and freezes exactly one accepted purchase',()=>{
  const s=island(3,{campaign:false});let status=step(s,6);
  assert.equal(status.task.objective.type,'invitation');assert.equal(status.task.requirements.coins,1500);
  s.buildings.townhall.level=4;s.capacity=96;lowBudget(s,1500);
  status=Missions.missionStatus(s,ctx);assert.equal(status.task.requirements.coins,2000);
  assert.equal(Missions.missionAction(s,{type:'missionStart',id:status.task.id},ctx).ok,false);
  lowBudget(s,2000);status=Missions.missionStatus(s,ctx);assert.equal(Missions.missionAction(s,{type:'missionStart',id:status.task.id},ctx).ok,true);
  s.buildings.townhall.level=5;s.capacity=120;
  assert.equal(Missions.missionResidentPurchaseCost(s,1).coins,2000);
  assert.equal(Missions.missionResidentPurchaseCost(s,2),null,'optional bulk purchases cannot reuse a one-person discount');
  const restored=copy(s);Missions.normalizeMissions(restored,restored);
  assert.equal(Missions.missionResidentPurchaseCost(restored,1).coins,2000);
});

test('an accepted invitation quote survives the real five-step assistance branch',()=>{
  const s=island(3,{campaign:false});let status=step(s,6);Missions.missionAction(s,{type:'missionStart',id:status.task.id},ctx);
  s.buildings.townhall.level=4;s.capacity=96;s.worldTimeMs=Missions.missionStatus(s,ctx).task.deadline;
  Missions.advanceMissions(s,0,ctx);assert.equal(Missions.missionStatus(s,ctx).kind,'support');
  const helper=s.lighthouseMissions.stack.at(-1);helper.index=5;helper.task=null;Missions.advanceMissions(s,0,ctx);status=Missions.missionStatus(s,ctx);
  assert.equal(Missions.missionAction(s,{type:'missionStart',id:status.task.id},ctx).ok,true);
  assert.equal(Missions.missionResidentPurchaseCost(s).coins,1500);
});

test('new briefings do not pretend to solve puzzles and preparations have no ticking deadline',()=>{
  const s=island(8);let status=Missions.missionStatus(s,ctx);assert.equal(status.task.objective.type,'review');
  assert.equal(Missions.missionAction(s,{type:'missionReview',id:status.task.id},ctx).ok,true);
  status=Missions.missionStatus(s,ctx);assert.equal(status.task.objective.type,'adventure');
  assert.equal(Missions.missionAction(s,{type:'missionReview',id:status.task.id},ctx).ok,false);
  assert.equal(Missions.missionAction(s,{type:'missionStart',id:status.task.id},ctx).ok,true);
  assert.equal(Missions.missionStatus(s,ctx).task.deadline,null);
  s.worldTimeMs+=10*86400*1000;Missions.advanceMissions(s,0,ctx);
  assert.equal(Missions.missionStatus(s,ctx).kind,'main');assert.equal(Missions.missionStatus(s,ctx).index,2);
});

test('all-eight preview exposes the population prerequisite without demanding all stock at entry',()=>{
  const s=island(3,{population:13});const preview=Missions.campaignReadiness(s,ctx);
  assert.equal(preview.steps.length,8);assert.equal(preview.valid,true);assert.equal(preview.providerIndependent,true);
  const town=preview.steps.find(step=>step.objective.building==='townhall'&&step.objective.type==='building');
  assert.ok(town.prerequisites.some(p=>p.type==='population'&&p.target===54&&p.actual===13));
  assert.ok(preview.steps.some(step=>step.objective.type==='adventure'&&step.objective.storyId==='captainless-ship'));
});

test('chapter3 rescue really solves six rooms and welcomes only the missing crew up to54',()=>{
  const s=island(3,{population:13});let status=step(s,4);assert.equal(status.task.objective.storyId,'captainless-ship');
  const offer=Missions.prepareMissionAssistance(s,status.task.id,ctx);assert.equal(offer.ok,true);assert.equal(offer.targetPopulation,54);assert.equal(offer.residentsRequested,41);
  const coins=s.resources.coins,population=s.population;assert.equal(Missions.missionAction(s,{type:'missionReview',id:status.task.id,solved:true},ctx).ok,false);
  assert.equal(s.population,population);assert.equal(s.resources.coins,coins);
  const result=actualRescue(s,offer);assert.equal(result.residentsAccepted,41);assert.equal(s.population,54);
  assert.equal(State.act(s,{type:'assign',building:'warehouse',delta:3},s.worldTimeMs).ok,true);State.tick(s,120);Missions.advanceMissions(s,0,ctx);
  status=Missions.missionStatus(s,ctx);assert.equal(status.index,7);assert.equal(status.task.objective.building,'townhall');assert.equal(status.canStart,true);
  assert.equal(Missions.recruitmentRewardQuote(s,offer).ok,false,'same earned crew cannot be paid twice');
  assert.equal(Missions.missionAssistanceOffer(s,ctx),null,'no additional population refill at the completed target');
});

test('assistance contexts are looked up canonically, never taken from a player reward request',()=>{
  const s=island(3,{population:13});const status=step(s,4),offer=Missions.prepareMissionAssistance(s,status.task.id,ctx);
  const forged={...offer,targetPopulation:2400,residentsRequested:999999,supplies:{coins:9999999}};
  const quote=Missions.recruitmentRewardQuote(s,forged);assert.equal(quote.residentsAccepted,41);assert.ok((quote.supplies.coins||0)<=campaignBudget(3).coins);
  assert.equal(Missions.recruitmentRewardQuote(s,{...forged,receiptId:'invented'}).ok,false);
  assert.equal(Missions.recordMissionAssistance(s,forged,{residentsAccepted:41}).ok,false,'missing genuine completion receipt');
});

test('earned recruitment comes in bounded waves for a large legacy population shortfall',()=>{
  const s=island(20,{campaign:false,population:12});const frame=s.lighthouseMissions.stack[0];frame.index=6;
  frame.task={id:frame.prefix+':6',status:'offered',objective:{type:'building',building:'townhall',target:21},requirements:{},deposited:{},reward:{},duration:600,acceptedAt:null,deadline:null};
  const target=Logistics.townhallPopulationRequirement(s,21).populationRequired;assert.equal(target,360);
  let accepted=0,waves=0;
  while(s.population<target){
    const offer=Missions.prepareMissionAssistance(s,frame.task.id,ctx);assert.equal(offer.ok,true,offer.message);
    const quote=Missions.recruitmentRewardQuote(s,offer);assert.equal(quote.ok,true);assert.ok(quote.residentsAccepted>0&&quote.residentsAccepted<=54);
    s.population+=quote.residentsAccepted;synchronizeResidents(s);accepted+=quote.residentsAccepted;
    assert.equal(Missions.recordMissionAssistance(s,offer,{residentsAccepted:quote.residentsAccepted,supplies:{},completionReceiptId:'actual-story-wave-'+(++waves)}).ok,true);
  }
  assert.equal(accepted,348);assert.equal(waves,7);assert.equal(Missions.missionAssistanceOffer(s,ctx),null);
  s.population--;synchronizeResidents(s);assert.equal(Missions.missionAssistanceOffer(s,ctx),null,'a finished target does not become an infinite refill');
});

test('a full final population limit has a real help-neighbors alternative without forcing departures',()=>{
  const s=island(100,{campaign:false,population:2400});const frame=s.lighthouseMissions.stack[0];frame.index=6;frame.task=null;Missions.advanceMissions(s,0,ctx);
  let status=Missions.missionStatus(s,ctx);assert.equal(status.task.objective.type,'invitation');assert.equal(status.canStart,false);
  const offer=Missions.prepareMissionAssistance(s,status.task.id,ctx);assert.equal(offer.ok,true);assert.equal(offer.residentsRequested,0);
  const result=actualRescue(s,offer);assert.equal(result.residentsAccepted,0);assert.equal(s.population,2400);
  assert.notEqual(Missions.missionStatus(s,ctx).index,6,'actual completed rescue satisfies the full-limit alternative');
});

test('old chapter paid contributions survive requested help and nested rescue',()=>{
  const s=island(2,{campaign:false});let status=Missions.missionStatus(s,ctx);Missions.missionAction(s,{type:'missionStart',id:status.task.id},ctx);
  Missions.missionAction(s,{type:'missionDeposit',id:status.task.id,resource:'wood',amount:1},ctx);
  const main=s.lighthouseMissions.stack[0].task,before=copy(main.deposited);
  assert.equal(Missions.missionAction(s,{type:'missionRequestHelp',id:main.id},ctx).ok,true);
  assert.deepEqual(s.lighthouseMissions.stack[0].task.deposited,before);
  status=Missions.missionStatus(s,ctx);assert.equal(status.kind,'support');
  assert.equal(Missions.missionAction(s,{type:'missionRequestHelp',id:status.task.id},ctx).ok,true);
  assert.equal(Missions.missionStatus(s,ctx).kind,'rescue');assert.deepEqual(s.lighthouseMissions.stack[0].task.deposited,before);
});

test('chapters after20 continue the existing valid template instead of imposing a new content cap',()=>{
  const s=island(21);const status=Missions.missionStatus(s,ctx);assert.equal(status.chapter.level,21);assert.equal(status.total,8);assert.equal(status.task.objective.type,'contribute');
  assert.equal(status.chapter.campaignVersion,undefined);assert.equal(status.canStart,true);
});

test('a saved assistance contract from a completed chapter cannot spend the next chapter budget',()=>{
  const s=island(3,{population:13}),status=step(s,4),offer=Missions.prepareMissionAssistance(s,status.task.id,ctx);
  s.lighthouseMissions.chapter.status='completed';s.lighthouseMissions.completedLevels.push(3);s.lighthouseMissions.stack=[];
  s.buildings.townhall.level=4;s.capacity=96;Missions.advanceMissions(s,0,ctx);
  const before=copy(s.lighthouseMissions.chapter),quote=Missions.recruitmentRewardQuote(s,offer);
  assert.equal(quote.ok,true);assert.equal(quote.goalAlreadyResolved,true);assert.equal(quote.residentsAccepted,0);assert.deepEqual(quote.supplies,{});
  assert.equal(Missions.recordMissionAssistance(s,offer,{residentsAccepted:0,supplies:{},completionReceiptId:'actual-old-story'}).ok,true);
  assert.deepEqual(s.lighthouseMissions.chapter,before);
});

test('an assistance offer resumes after mission normalization with its canonical story and source',()=>{
  const s=island(3,{population:13}),status=step(s,4),offer=Missions.prepareMissionAssistance(s,status.task.id,ctx);
  const saved=copy(s);Missions.normalizeMissions(saved,saved);
  const resumed=Missions.prepareMissionAssistance(saved,status.task.id,ctx);
  assert.equal(resumed.ok,true);assert.equal(resumed.receiptId,offer.receiptId);assert.equal(resumed.storyId,'captainless-ship');assert.equal(resumed.source,'campaign');
  assert.equal(Missions.recruitmentRewardQuote(saved,resumed).residentsAccepted,41);
});
