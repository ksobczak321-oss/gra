import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExpeditionHour, reserveExpeditionDifficulty, expeditionHourStatus, cappedExpeditionReward } from '../harborlight-v1-expedition-hour.js';
import { normalizeAdventureBudget, adventureRewardStatus, claimAdventureBudget } from '../harborlight-v1-adventure-budget.js';
import { normalizeActivities, activityAction, expeditionRoundReward } from '../harborlight-v1-activities.js';
import { normalizeLogisticsState } from '../harborlight-v1-logistics.js';
const NOW = Date.parse('2026-11-04T12:10:00Z');
const definition = { id: 'islands', map: ['S.G'], tools: {} }, context = { expeditions: [definition] };
function world(at = NOW) {
  const state = { worldTimeMs: at, resources: { coins:100,wood:100,stone:100,grain:100,food:100,planks:100 }, population:12, foodCredit:1, activeSeconds:0,
    buildings: Object.fromEntries(['farm','windmill','lumber','sawmill','quarry','warehouse','market','dock','house','townhall','chapel','lighthouse'].map(id=>[id,{level:id==='townhall'?2:1,workers:0,ready:0,workProgress:[]}])),
    residents:[],returningWorkers:[],constructionProjects:[],premiumServices:[],premium:{expiresAt:0},notifications:[],statistics:{expeditions:0},roads:{segments:Array(100).fill(0)} };
  normalizeLogisticsState(state,state); normalizeActivities(state,{}); normalizeAdventureBudget(state,{}); return state;
}
function start(state) { const r=activityAction(state,{type:'expeditionStart',expedition:'islands',gameKind:'triples'},context);assert.equal(r.ok,true,r.message);return state.expeditionRuns.islands; }
function solve(state,run) { for(const symbol of new Set(run.miniGame.cards)) for(const index of run.miniGame.cards.flatMap((v,i)=>v===symbol?[i]:[])) if(!run.miniGame.matched[index]) assert.equal(activityAction(state,{type:'expeditionMiniGameReveal',runId:run.id,index},context).ok,true); }

test('cashout, losing and a new series all keep account difficulty during the hour',()=>{
  const state=world(),first=start(state);assert.equal(first.difficultyLevel,1);solve(state,first);
  assert.equal(activityAction(state,{type:'expeditionCashout',runId:first.id},context).ok,true);
  const second=start(state);assert.equal(second.level,1);assert.equal(second.difficultyLevel,2);assert.equal(second.miniGame.cards.length,30);
  assert.equal(activityAction(state,{type:'expeditionLose',runId:second.id},context).ok,true);
  const third=start(state);assert.equal(third.difficultyLevel,3);assert.equal(third.miniGame.cards.length,36);
});
test('reload preserves the exact board and hourly counter without creating another reservation',()=>{
  const state=world(),run=start(state);activityAction(state,{type:'expeditionMiniGameReveal',runId:run.id,index:0},context);
  const raw=structuredClone(state), restored={...structuredClone(raw)};normalizeActivities(restored,raw);
  assert.deepEqual(restored.expeditionRuns.islands.miniGame,run.miniGame);
  assert.equal(expeditionHourStatus(restored).nextDifficulty,2);
  assert.equal(reserveExpeditionDifficulty(restored,`${run.id}:1`),1);
  assert.equal(expeditionHourStatus(restored).roundsStarted,1);
});
test('a completed clock hour resets future difficulty, preserving the already running board',()=>{
  const state=world(),run=start(state),board=structuredClone(run.miniGame);
  state.worldTimeMs=Date.parse('2026-11-04T13:00:00Z');
  assert.equal(expeditionHourStatus(state).nextDifficulty,1);assert.deepEqual(run.miniGame,board);
  assert.equal(expeditionHourStatus(state).remaining,3600);
});
test('hour rollover mutates a shared account ledger in place and a backwards clock cannot mint a reset',()=>{
  const a=world(),b=world();b.expeditionHour=a.expeditionHour;
  reserveExpeditionDifficulty(a,'mother:1');assert.equal(reserveExpeditionDifficulty(b,'daughter:1'),2);
  a.worldTimeMs=Date.parse('2026-11-04T13:00:00Z');normalizeExpeditionHour(a,a);
  assert.equal(b.expeditionHour,a.expeditionHour);assert.equal(reserveExpeditionDifficulty(b,'daughter:2'),1);
  assert.equal(reserveExpeditionDifficulty(a,'mother:2'),2);
});
test('new series awards are capped even after the board difficulty has reached its ceiling',()=>{
  assert.deepEqual([1,2,3,4,5,6,20,1000].map(cappedExpeditionReward),[50,100,200,400,800,800,800,800]);
  assert.equal(expeditionRoundReward(20,31),800);
  assert.equal(expeditionRoundReward(3,16),200,'legacy saved-series quote remains readable');
});
test('all new puzzle types and islands consume the same daily and chapter pool',()=>{
  const a=world(),b=world();b.adventureBudget=a.adventureBudget;
  assert.equal(adventureRewardStatus(a).dailyRemaining,200);assert.equal(adventureRewardStatus(a).chapterRemaining,300);
  assert.equal(claimAdventureBudget(a,{receiptId:'story:1',reward:{coins:150}}).reward.coins,150);
  assert.equal(claimAdventureBudget(b,{receiptId:'other-island:puzzle:1',reward:{coins:150}}).reward.coins,50);
  assert.equal(claimAdventureBudget(a,{receiptId:'puzzle:2',reward:{coins:100}}).practice,true);
  assert.equal(adventureRewardStatus(a).chapterRemaining,100);
});
test('changing day renews the rate limit but not the chapter allowance or paid receipts',()=>{
  const state=world();claimAdventureBudget(state,{receiptId:'first',reward:{coins:200}});
  state.worldTimeMs+=86400000;
  assert.equal(adventureRewardStatus(state).dailyRemaining,200);assert.equal(adventureRewardStatus(state).chapterRemaining,100);
  assert.equal(claimAdventureBudget(state,{receiptId:'first',reward:{coins:200}}).duplicate,true);
  assert.equal(claimAdventureBudget(state,{receiptId:'second',reward:{coins:200}}).reward.coins,100);
  assert.equal(adventureRewardStatus(state).chapterRemaining,0);
});
test('a backwards day, reload or goal switch cannot restore spent account rewards',()=>{
  const state=world();claimAdventureBudget(state,{receiptId:'spent',reward:{coins:180}});
  const saved=structuredClone(state.adventureBudget);state.worldTimeMs-=86400000;normalizeAdventureBudget(state,{adventureBudget:saved});
  assert.equal(adventureRewardStatus(state).dailyRemaining,20);
  state.lighthouseMissions={chapter:{level:3}};claimAdventureBudget(state,{receiptId:'new-goal',reward:{coins:100}});
  state.lighthouseMissions.chapter.level=2;assert.equal(adventureRewardStatus(state).dailyRemaining,0);
  assert.equal(adventureRewardStatus(state).chapterRemaining,120);
});
test('mixed goods share one value envelope and malformed negative rewards do not add value',()=>{
  const state=world();const result=claimAdventureBudget(state,{receiptId:'mixed',reward:{coins:100,wood:200,planks:200,food:-4}});
  const value=(result.reward.coins||0)+(result.reward.wood||0)*.5+(result.reward.planks||0)*1.5;
  assert.ok(value<=200);assert.equal(result.reward.food,undefined);assert.ok(adventureRewardStatus(state).dailyRemaining>=0);
});
