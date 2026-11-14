import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeActivities, activityAction, advanceActivities, expeditionRoundStatus, expeditionRoundReward,
  expeditionPot, quoteExtraTime, taskReward } from '../harborlight-v1-activities.js';
import { normalizeLogisticsState } from '../harborlight-v1-logistics.js';

const NOW = Date.parse('2026-10-30T12:00:00Z');
const context = { expeditions: [{ id: 'proof', map: ['S.G'], tools: {} }] };
function island(ruleset=32) {
  const state = { ruleset,resources: { coins: 1000, wood: 100, stone: 100, grain: 100, food: 100, planks: 100 },
    population: 12, foodCredit: 1, worldTimeMs: NOW, activeSeconds: 0,
    buildings: Object.fromEntries(['farm','windmill','lumber','sawmill','quarry','warehouse','market','dock','house','townhall','chapel','lighthouse'].map(id => [id, { level: id === 'townhall' ? 4 : 1, workers: 0, ready: 0, workProgress: [] }])),
    residents: [], returningWorkers: [], constructionProjects: [], premiumServices: [], premium: { expiresAt: 0 },
    notifications: [], statistics: { expeditions: 0 }, roads: { segments: Array(100).fill(0) } };
  normalizeLogisticsState(state, state); normalizeActivities(state, { activitySeed: 2 });
  return state;
}
const act = (s, type, details = {}, extra = {}) => activityAction(s, { type, ...details }, { ...context, ...extra });
function start(s) {
  const result = act(s, 'expeditionStart', { expedition: 'proof', gameKind: 'triples' });
  assert.equal(result.ok, true, result.message); return s.expeditionRuns.proof;
}
function solve(s, run) {
  for (const symbol of new Set(run.miniGame.cards)) {
    for (let index = 0; index < run.miniGame.cards.length; index++) if (run.miniGame.cards[index] === symbol && !run.miniGame.matched[index]) {
      const result = act(s, 'expeditionMiniGameReveal', { runId: run.id, index });
      assert.equal(result.ok, true, result.message);
    }
  }
  assert.equal(run.status, 'decision');
}
function reload(s) {
  const raw = structuredClone(s), restored = structuredClone(s);
  normalizeLogisticsState(restored, raw); normalizeActivities(restored, raw); return restored;
}

test('new round awards double and add to the pot; reload and cashout never pay twice', () => {
  let s = island(), run = start(s);
  for (const [stage, pot] of [[1,50],[2,150],[3,350],[4,750]]) {
    assert.equal(expeditionRoundReward(stage), 50 * 2 ** (stage - 1));
    solve(s, run); assert.equal(run.pot, pot);
    if (stage < 4) assert.equal(act(s, 'expeditionContinue', { runId: run.id }).ok, true);
  }
  s = reload(s); run = s.expeditionRuns.proof;
  assert.equal(run.pot, 750); assert.equal(act(s, 'expeditionCashout', { runId: run.id }).coins, 750);
  assert.equal(s.resources.coins, 1750); assert.equal(act(s, 'expeditionCashout', { runId: run.id }).ok, false);
  assert.equal(expeditionPot(20), 52428750);
});

test('time decay subtracts from the correct doubled round award', () => {
  const s = island(), run = start(s); solve(s, run);
  act(s, 'expeditionContinue', { runId: run.id });
  advanceActivities(s, 203); assert.equal(expeditionRoundStatus(s, run).roundReward, 99);
  solve(s, run); assert.equal(run.pot, 149);
});

test('unsafe exponential continuation is rejected without truncating or losing the completed pot', () => {
  const s = island(), run = start(s); solve(s, run);
  run.level = 47; run.pot = Number.MAX_SAFE_INTEGER - 100;
  assert.equal(act(s, 'expeditionContinue', { runId: run.id }).ok, false);
  assert.equal(run.status, 'decision'); assert.equal(run.pot, Number.MAX_SAFE_INTEGER - 100);
  assert.equal(expeditionRoundReward(49), null);
});

test('the legacy generated task reward survives an already reserved incoming delivery', () => {
  const s=island(31), task = s.lighthouseTasks[1];
  act(s, 'beginTaskAcceptance', { task: task.id }); act(s, 'confirmTaskAcceptance', { task: task.id });
  for (const [id, amount] of Object.entries(task.requirements)) task.deposited[id] = amount;
  task.deposited.stone--; s.resources.wood = 880;
  s.haulTrips.warehouse = [{ worker: 0, kind: 'producer', producer: 'lumber', resource: 'wood', amount: 120, remaining: 100 }];
  const promised = taskReward(task).wood;
  const result = act(s, 'taskDeposit', { task: task.id, resource: 'stone', amount: 1 });
  assert.equal(result.completed, true); assert.equal(s.resources.wood, 880 + promised);
  assert.equal(s.bonusMaterials.wood, promised); assert.equal(s.rewardBuffer.wood, 0);
  assert.equal(s.haulTrips.warehouse[0].amount, 120);
});

test('time purchases cost 10×highest town hall, add 50% remaining with min60 and have no two-purchase cap',()=>{
 const s=island(),run=start(s);assert.equal(quoteExtraTime(s,run).seconds,120);assert.equal(quoteExtraTime(s,run).coins,40);
 for(let i=0;i<4;i++){const before=expeditionRoundStatus(s,run).remaining,quote=quoteExtraTime(s,run);assert.equal(quote.seconds,Math.max(60,before*.5));assert.equal(act(s,'expeditionExtraTime',{runId:run.id}).ok,true);assert.equal(expeditionRoundStatus(s,run).remaining,before+quote.seconds);}
 assert.equal(s.resources.coins,840);assert.equal(run.extraTimePurchases,4);advanceActivities(s,100000);assert.equal(run.status,'lost');assert.equal(act(s,'expeditionExtraTime',{runId:run.id}).ok,false);assert.equal(s.resources.coins,840);
});
test('an ad pauses the round and card timers, while elapsed world activity time still advances', () => {
  const s = island(), run = start(s);
  const different = [...new Set(run.miniGame.cards)].slice(0, 3).map(symbol => run.miniGame.cards.indexOf(symbol));
  for (const index of different) act(s, 'expeditionMiniGameReveal', { runId: run.id, index });
  const before = expeditionRoundStatus(s, run).remaining;
  const begin = act(s, 'expeditionAdBegin', { runId: run.id }); assert.equal(begin.ok, true);
  advanceActivities(s, 20);
  assert.equal(s.activityClock, 20); assert.equal(expeditionRoundStatus(s, run).remaining, before);
  assert.equal(run.miniGame.revealed.length, 3);
  assert.equal(act(s, 'expeditionMiniGameReveal', { runId: run.id, index: 0 }).ok, false);
  assert.equal(act(s, 'expeditionExtraTime', { runId: run.id }).ok, false);
  const completed = act(s, 'expeditionAdComplete', { runId: run.id, nonce: begin.nonce, receiptId: 'verified-1' }, { rewardedAdVerified: true });
  assert.equal(completed.seconds,120);assert.equal(expeditionRoundStatus(s,run).remaining,before+120);
  advanceActivities(s, 0.8); assert.equal(run.miniGame.revealed.length, 0);
});

test('unverified and replayed ad completions cannot grant time, including for premium players', () => {
  const s = island(), run = start(s); s.commerce = { noAds: true };
  const begin = act(s, 'expeditionAdBegin', { runId: run.id });
  const completion = { runId: run.id, nonce: begin.nonce, receiptId: 'receipt-1', verified: true };
  assert.equal(act(s, 'expeditionAdComplete', completion).ok, false); assert.equal(run.roundLimit, 240);
  assert.equal(act(s, 'expeditionAdComplete', completion, { rewardedAdVerified: true }).ok, true);
  assert.equal(run.roundLimit,360);
  assert.equal(act(s, 'expeditionAdComplete', completion, { rewardedAdVerified: true }).ok, false);
  solve(s, run); act(s, 'expeditionContinue', { runId: run.id });
  const next = act(s, 'expeditionAdBegin', { runId: run.id });
  assert.equal(act(s, 'expeditionAdComplete', { ...completion, nonce: next.nonce }, { rewardedAdVerified: true }).ok, false);
});

test('an accepted ad keeps the live stage paused until completion, while exiting and reloading ends that attempt',()=>{
 let s=island(),run=start(s);act(s,'expeditionAdBegin',{runId:run.id});const remaining=expeditionRoundStatus(s,run).remaining;advanceActivities(s,1000);assert.equal(expeditionRoundStatus(s,run).remaining,remaining);assert.equal(run.status,'active');s=reload(s);run=s.expeditionRuns.proof;assert.equal(run.status,'lost');assert.equal(run.lossReason,'abandoned');assert.equal(run.adPause,null);assert.equal(run.adTimeRewards,0);
});
test('cancelling an ad awards no time and another optional ad may be attempted, with only one operation active',()=>{
 const s=island(),run=start(s),begin=act(s,'expeditionAdBegin',{runId:run.id});advanceActivities(s,10);assert.equal(act(s,'expeditionAdCancel',{runId:run.id,nonce:begin.nonce}).ok,true);assert.equal(run.roundLimit,240);const next=act(s,'expeditionAdBegin',{runId:run.id});assert.equal(next.ok,true);assert.equal(act(s,'expeditionAdBegin',{runId:run.id}).ok,false);assert.notEqual(next.nonce,begin.nonce);assert.equal(run.adTimeRewards,0);
});
