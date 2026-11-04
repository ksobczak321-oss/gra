import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignSessionAt, createCampaignPlanner, simulateCampaignV31 } from '../scripts/simulate-campaign-v31.mjs';

const NOW=Date.parse('2026-11-04T07:00:00Z'),HOUR=3600000,DAY=24*HOUR;

test('a fifty-day plan exposes exactly150 bounded active sessions and offline gaps',()=>{
  let now=NOW,activeMs=0,sessions=0;
  while(now<NOW+50*DAY){
    const s=campaignSessionAt(now,NOW,50);
    if(s.active){sessions++;activeMs+=s.endAt-now;now=s.endAt;}
    else {assert.ok(s.nextAt>now,'an offline gap must advance the calendar');now=s.nextAt;}
  }
  assert.equal(sessions,150);assert.equal(activeMs,150*HOUR);
  assert.equal(campaignSessionAt(NOW+50*DAY,NOW,50).finished,true);
  assert.equal(campaignSessionAt(NOW+HOUR,NOW,50).active,false);
  assert.equal(campaignSessionAt(NOW+6*HOUR,NOW,50).active,true);
});

test('the planner starts from normal untouched onboarding and rejects external reward shortcuts',()=>{
  const p=createCampaignPlanner({days:1,startAt:NOW});
  assert.equal(p.state.population,12);assert.equal(p.state.buildings.townhall.level,1);
  assert.equal(p.state.onboarding.stage,'intro');
  assert.deepEqual(p.state.resources,{coins:100,wood:100,stone:100,grain:100,food:100,planks:100});
  const before=structuredClone(p.state);
  for(const action of [{type:'buyCoins'},{type:'adBlessing'},{type:'adventureAssist'},{type:'redeemCode'}])assert.throws(()=>p.command(action),/free planner cannot authorize/);
  assert.deepEqual(p.state,before);
  assert.throws(()=>createCampaignPlanner({days:51}),/up to50days/);
  assert.throws(()=>createCampaignPlanner({days:0}),/up to50days/);
});

test('a bounded actual first-session run completes the course through commands and honestly stops short of its target', {timeout:60000},()=>{
  const result=simulateCampaignV31({startAt:NOW,days:.1,targetLevel:20,throwOnError:true});
  assert.equal(result.stopReason,'observation-horizon');
  assert.equal(result.elapsedDays,.1);assert.equal(result.targetReached,false);assert.equal(result.targetReachedDay,null);
  assert.equal(result.final.tutorialFinished,true);
  assert.ok(result.final.level>=2);assert.ok(result.final.population>=13,'the real welcome worker is admitted by normal onboarding');
  assert.equal(result.sessions,1);assert.equal(result.activeHours,1);
  assert.equal(result.actionCounts.onboardingFinish,1);
  assert.equal(result.actionCounts.claimTutorial,24);
  assert.equal(result.actionCounts.expeditionStart,1);assert.equal(result.actionCounts.expeditionCashout,1);
  assert.ok(result.actionCounts.expeditionMiniGameReveal>=24,'the round is actually played');
  assert.ok(result.actionCounts.upgrade>0);assert.ok(result.actionCounts.premiumTransport>0);
  assert.ok(result.actionCounts.premiumAccelerate>0,'the normal coin service is taught, not free-completed');
  assert.equal(result.realMoneyPurchases,0);assert.equal(result.rewardedAdvertisements,0);assert.equal(result.externalPlayerTrades,0);
  assert.equal(result.checkpoints.length,0,'a partial day must not be labelled a completed calendar day');
});
