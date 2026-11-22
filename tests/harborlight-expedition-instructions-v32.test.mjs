import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeActivities, activityAction, advanceActivities, expeditionRoundStatus, nextActivitiesEvent, quoteExtraTime, expeditionHourStatus } from '../harborlight-v1-activities.js';
import { normalizeLogisticsState } from '../harborlight-v1-logistics.js';
import { createState, normalizeState, act, tick, EXPEDITIONS } from '../harborlight-v1-state.js';

const NOW=Date.parse('2026-11-22T12:00:00Z');
const definition={id:'islands',map:['S.G'],tools:{}};
const context={expeditions:[definition]};
function island(){
  const state={ruleset:32,resources:{coins:100,wood:100,stone:100,grain:100,food:100,planks:100},population:12,foodCredit:1,activeSeconds:0,worldTimeMs:NOW,
    buildings:Object.fromEntries(['farm','windmill','lumber','sawmill','quarry','warehouse','market','dock','house','townhall','chapel','lighthouse'].map(id=>[id,{level:1,workers:0,ready:0,workProgress:[]}])),
    residents:[],returningWorkers:[],constructionProjects:[],premiumServices:[],premium:{expiresAt:0},notifications:[],statistics:{expeditions:0},roads:{segments:Array(100).fill(0)}};
  normalizeLogisticsState(state,state);normalizeActivities(state,{activityClock:0,activitySeed:123456789});return state;
}
function start(state,kind='tilt',extra={}){
  const result=activityAction(state,{type:'expeditionStart',expedition:definition.id,gameKind:kind,deferStart:true,...extra},context);
  assert.equal(result.ok,true,result.message);return state.expeditionRuns.islands;
}
function begin(state,run,extra={}){return activityAction(state,{type:'expeditionBegin',runId:run.id,stage:run.level,...extra},context);}
function reload(state){const raw=structuredClone(state),restored={...raw};normalizeActivities(restored,raw);return restored;}
function completeTriples(state,run){
  for(const symbol of new Set(run.miniGame.cards))for(const index of run.miniGame.cards.flatMap((card,index)=>card===symbol?[index]:[])){
    if(run.miniGame.matched[index])continue;
    const result=activityAction(state,{type:'expeditionMiniGameReveal',runId:run.id,index},context);assert.equal(result.ok,true,result.message);
  }
}

test('fifteen minutes of reading cannot use either expedition timer, physics or card state',()=>{
  for(const kind of ['tilt','triples']){
    const state=island(),run=start(state,kind),game=structuredClone(run.miniGame),ledger=structuredClone(state.expeditionHour),before=state.lastMeaningfulActivityAt;
    advanceActivities(state,900);
    assert.equal(state.activityClock,900);assert.equal(run.status,'active');assert.equal(run.instructionsPending,true);assert.equal(run.miniGame.instructionsPending,true);
    assert.equal(run.remaining,run.roundLimit);assert.equal(expeditionRoundStatus(state,run).elapsed,0);assert.equal(expeditionRoundStatus(state,run).remaining,run.roundLimit);
    assert.equal(expeditionRoundStatus(state,run).overtimePenalty,0);assert.equal(run.presencePromptAt,null);assert.equal(run.timeOffer,null);assert.equal(run.adPause,null);
    assert.deepEqual(run.miniGame,game);assert.deepEqual(state.expeditionHour,ledger);assert.equal(state.lastMeaningfulActivityAt,before);assert.equal(state.statistics.expeditions,0);
    assert.ok(nextActivitiesEvent(state)>run.roundLimit,'only ordinary island task events remain scheduled during reading');
  }
});

test('reading rejects every game, help, presence, ad and time purchase action without spending',()=>{
  const state=island(),run=start(state),before=structuredClone(run),coins=state.resources.coins;
  const actions=[{type:'expeditionMiniGameInput',tiltX:.5,tiltY:.5},{type:'expeditionMiniGameReveal',index:0},{type:'expeditionWin',stage:run.level},{type:'expeditionHint'},
    {type:'expeditionExtraTime'},{type:'expeditionAdBegin'},{type:'expeditionAdComplete',nonce:'no-ad',receiptId:'not-a-receipt'},{type:'expeditionAdCancel',nonce:'no-ad'},
    {type:'expeditionTimeChoice',method:'decline'},{type:'expeditionPresenceConfirm'},{type:'presenceConfirm'},{type:'expeditionContinue'}];
  for(const action of actions){assert.equal(activityAction(state,{...action,runId:run.id},context).ok,false,action.type);assert.deepEqual(run,before);}
  assert.equal(quoteExtraTime(state,run).ok,false);assert.equal(state.resources.coins,coins);assert.equal(state.statistics.expeditions,0);
});

test('explicit Begin starts a full round at the current clock and cannot restart it twice',()=>{
  const state=island(),run=start(state);
  advanceActivities(state,900);assert.equal(begin(state,run,{stage:run.level+1}).ok,false);assert.equal(run.instructionsPending,true);
  assert.equal(begin(state,run).ok,true);assert.equal(run.instructionsPending,undefined);assert.equal(run.miniGame.instructionsPending,undefined);
  assert.equal(run.roundStartedAt,900);assert.equal(run.startedAt,900);assert.equal(state.lastMeaningfulActivityAt,900);
  assert.equal(begin(state,run).ok,false);
  assert.equal(activityAction(state,{type:'expeditionMiniGameInput',runId:run.id,tiltX:.4,tiltY:0},context).ok,true);
  advanceActivities(state,2);assert.equal(expeditionRoundStatus(state,run).remaining,run.roundLimit-2);assert.equal(run.status,'active');
});

test('pending save/restore and close keep the same attempt and avoid an abandoned failure',()=>{
  const state=island(),run=start(state,'triples');advanceActivities(state,900);
  const identity=run.roundIdentity,ledger=structuredClone(state.expeditionHour),game=structuredClone(run.miniGame);
  const closed=activityAction(state,{type:'expeditionLose',runId:run.id},context);assert.equal(closed.ok,true);assert.equal(closed.outcome,'pending');
  assert.equal(run.status,'active');assert.equal(state.activeExpeditionId,definition.id);
  const restored=reload(state),savedRun=restored.expeditionRuns.islands;
  assert.equal(savedRun.status,'active');assert.equal(savedRun.instructionsPending,true);assert.equal(savedRun.roundIdentity,identity);assert.equal(savedRun.remaining,savedRun.roundLimit);
  assert.deepEqual(savedRun.miniGame,game);assert.deepEqual(restored.expeditionHour,ledger);
  advanceActivities(restored,900);assert.equal(savedRun.status,'active');assert.equal(expeditionRoundStatus(restored,savedRun).elapsed,0);
  assert.equal(begin(restored,savedRun).ok,true);
  const activeReload=reload(restored);assert.equal(activeReload.expeditionRuns.islands.status,'lost');assert.equal(activeReload.expeditionRuns.islands.lossReason,'abandoned');
  assert.equal(expeditionHourStatus(activeReload,'triples').failures,1,'ordinary begun-round reload policy remains intact');
});

test('memory shuffle gets its complete first interval after reading and repeated restores',()=>{
  const state=island();state.expeditionHour.variants.triples={wins:3,failures:0,roundsStarted:0,reservations:[],results:[]};
  const run=start(state,'triples');assert.equal(run.difficultyLevel,4);const interval=run.miniGame.shuffleInterval;assert.ok(interval>0);
  advanceActivities(state,900);let restored=reload(state);restored=reload(restored);const savedRun=restored.expeditionRuns.islands;
  assert.equal(savedRun.miniGame.nextShuffleAt,interval);assert.equal(savedRun.miniGame.shuffleCount,0);
  assert.equal(begin(restored,savedRun).ok,true);assert.equal(savedRun.miniGame.nextShuffleAt,900+interval);
  advanceActivities(restored,interval-1);assert.equal(savedRun.miniGame.shuffleCount,0);
  advanceActivities(restored,1);assert.equal(savedRun.miniGame.shuffleCount,1);
});

test('next-round instructions keep the won pot while waiting for a fresh explicit Begin',()=>{
  const state=island(),run=start(state,'triples');assert.equal(begin(state,run).ok,true);completeTriples(state,run);
  assert.equal(run.status,'decision');const pot=run.pot;assert.ok(pot>0);
  const result=activityAction(state,{type:'expeditionContinue',runId:run.id,deferStart:true},context);assert.equal(result.ok,true);assert.equal(run.level,2);
  assert.equal(run.instructionsPending,true);assert.equal(run.miniGame.instructionsPending,true);advanceActivities(state,900);
  assert.equal(run.status,'active');assert.equal(run.pot,pot);assert.equal(state.statistics.expeditions,1);assert.equal(expeditionRoundStatus(state,run).elapsed,0);
  const restored=reload(state),next=restored.expeditionRuns.islands;assert.equal(next.pot,pot);assert.equal(next.instructionsPending,true);
  assert.equal(begin(restored,next).ok,true);completeTriples(restored,next);assert.equal(next.status,'decision');assert.ok(next.pot>pot);
});

test('easier restart also waits for instructions without settling another failure',()=>{
  const state=island();let run;
  for(let index=0;index<3;index++){
    run=start(state,'tilt',{deferStart:false});assert.equal(activityAction(state,{type:'expeditionLose',runId:run.id},context).ok,true);
  }
  assert.equal(expeditionHourStatus(state,'tilt').failures,3);
  const result=activityAction(state,{type:'expeditionRestartEasier',runId:run.id,deferStart:true},context);assert.equal(result.ok,true);
  run=state.expeditionRuns.islands;assert.equal(run.instructionsPending,true);assert.equal(run.rewardScale,.5);advanceActivities(state,900);
  assert.equal(run.status,'active');assert.equal(expeditionHourStatus(state,'tilt').failures,3);assert.equal(begin(state,run).ok,true);
});

test('older callers start immediately and retain legacy route proof and overtime',()=>{
  const state=island(),run=start(state,'tilt',{deferStart:false});assert.equal(run.instructionsPending,undefined);advanceActivities(state,2);assert.equal(expeditionRoundStatus(state,run).elapsed,2);
  assert.equal(reload(state).expeditionRuns.islands.lossReason,'abandoned');
  const routeState=island(),route=start(routeState,'tilt',{gameVersion:9,deferStart:false,limit:10});advanceActivities(routeState,11);
  const result=activityAction(routeState,{type:'expeditionWin',runId:route.id,stage:1,path:[[0,1],[0,2]]},context);
  assert.equal(result.ok,true);assert.equal(route.pot,40);assert.equal(route.instructionsPending,undefined);
});

test('known interruption offsets are consumed by Begin rather than delaying play again',()=>{
  const state=island();state.expeditionHour.variants.triples={wins:3,failures:0,roundsStarted:0,reservations:[],results:[]};
  const run=start(state,'triples'),interval=run.miniGame.shuffleInterval;
  run.roundStartedAt+=90;run.startedAt+=90;run.miniGame.nextShuffleAt+=90;run.knownPauseRemaining=90;
  assert.equal(begin(state,run).ok,true);assert.equal(run.knownPauseRemaining,undefined);assert.equal(run.roundStartedAt,0);assert.equal(run.miniGame.nextShuffleAt,interval);
  advanceActivities(state,1);assert.equal(expeditionRoundStatus(state,run).elapsed,1);
});

test('real island tick and restore leave instruction reading untimed while the world advances',()=>{
  const state=createState(NOW,{ruleset:32,onboarding:false}),expedition=EXPEDITIONS[0].id;
  assert.equal(act(state,{type:'expeditionStart',expedition,gameKind:'tilt',deferStart:true},NOW).ok,true);
  const run=state.expeditionRuns[expedition],game=structuredClone(run.miniGame);
  tick(state,900);assert.ok(state.worldTimeMs>NOW);assert.equal(state.activityClock,900);assert.equal(run.instructionsPending,true);assert.equal(run.status,'active');assert.deepEqual(run.miniGame,game);
  const restored=normalizeState(JSON.parse(JSON.stringify(state)),state.worldTimeMs),savedRun=restored.expeditionRuns[expedition];
  assert.equal(savedRun.instructionsPending,true);assert.equal(savedRun.status,'active');assert.equal(act(restored,{type:'expeditionBegin',runId:savedRun.id,stage:1},restored.worldTimeMs).ok,true);
  tick(restored,1);assert.equal(expeditionRoundStatus(restored,savedRun).elapsed,1);
});
