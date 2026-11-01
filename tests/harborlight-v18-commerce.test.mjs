import test from 'node:test';
import assert from 'node:assert/strict';
import { createState,act,buildingCost } from '../harborlight-v1-state.js';
import { quoteCheckout,commerceStatus,runtimeCapabilities,preserveAccountProgress,ACCOUNT_PROGRESS_FIELDS } from '../harborlight-v1-commerce.js';
import { quotePremiumBuilding } from '../harborlight-v1-activities.js';
import { advanceEngagementSchedule,engagementOfferStatus,startEngagementOffer } from '../harborlight-v1-engagement.js';
import { tutorialRows } from '../harborlight-v1-progression.js';
const NOW=Date.parse('2026-10-30T12:00:00Z'), DAY=86400000;
const dev={devSimulation:true,environment:'development'}, verified={...dev,rewardedAdVerified:true};
const run=(s,a,c=dev)=>act(s,a,s.worldTimeMs,c);
// Reward transaction tests start after all practical lessons. The independent
// learning/advertising tests verify that an unfinished course blocks offers.
function advertisingIsland(){const state=createState(NOW);for(const row of tutorialRows(state)){state.tutorial.completed[row.id]=true;state.tutorial.claimed[row.id]=true;}return state;}
test('simulated Paynow settlement grants a package once and creates rolling no-ad entitlement',()=>{
 const s=createState(NOW),start=run(s,{type:'startCheckout',kind:'coins',grossGrosz:2000});assert.equal(start.ok,true);
 assert.equal(s.resources.coins,100);assert.equal(run(s,{type:'completeCheckout',checkoutId:start.checkoutId}).ok,true);
 assert.equal(s.resources.coins,300);assert.equal(commerceStatus(s).noAds,true);
 assert.equal(run(s,{type:'completeCheckout',checkoutId:start.checkoutId}).ok,false);assert.equal(s.resources.coins,300);
 s.worldTimeMs+=30*DAY;assert.equal(commerceStatus(s).noAds,false);
});
test('production never accepts browser simulated payments',()=>{
 const s=createState(NOW);assert.equal(run(s,{type:'startCheckout',kind:'coins',grossGrosz:2000},{devSimulation:true,environment:'production'}).ok,false);
 assert.equal(s.resources.coins,100);assert.equal(runtimeCapabilities('harborlight.pl').simulatedPayments,false);
 assert.equal(runtimeCapabilities('harborlight-prod.web.app').simulatedAds,false);
});
test('separate cash building checkout is available at TH1 but earned coin services stay locked',()=>{
 const s=createState(NOW);assert.equal(quotePremiumBuilding(s,'farm',{buildingCost}).ok,false);
 assert.equal(quoteCheckout(s,{kind:'building',building:'townhall'},{buildingCost}).ok,true);
 assert.equal(quoteCheckout(s,{kind:'building',building:'farm'},{buildingCost}).ok,false);
 const before={...s.resources},r=run(s,{type:'startCheckout',kind:'building',building:'townhall'});
 assert.equal(r.ok,true);assert.equal(run(s,{type:'completeCheckout',checkoutId:r.checkoutId}).ok,true);
 assert.deepEqual(s.resources,before);assert.equal(s.premiumServices[0].buildRemaining,10);
 assert.equal(run(s,{type:'premiumBuyBuilding',building:'windmill',cashPurchase:true}).ok,false);
});
test('cancelling checkout cannot grant money or paid entitlement',()=>{
 const s=createState(NOW),r=run(s,{type:'startCheckout',kind:'coins',grossGrosz:2000});
 assert.equal(run(s,{type:'cancelCheckout',checkoutId:r.checkoutId}).ok,true);
 assert.equal(run(s,{type:'completeCheckout',checkoutId:r.checkoutId}).ok,false);assert.equal(commerceStatus(s).noAds,false);
});
test('rolling threshold is a sum of eligible payments, not thirty days after latest payment',()=>{
 const s=createState(NOW);s.commerce.receipts=[{id:'a',at:NOW-29*DAY,grossGrosz:1000,verified:true},{id:'b',at:NOW-14*DAY,grossGrosz:999,verified:true}];
 assert.equal(commerceStatus(s).noAds,true);assert.equal(commerceStatus(s).noAdsUntil,NOW+DAY);
 s.worldTimeMs+=DAY;assert.equal(commerceStatus(s).noAds,false);
 s.commerce.receipts[1].refunded=true;assert.equal(commerceStatus(s).paidLast30DaysGrosz,0);
});
test('material ad reward requires completion, never rerolls on completion and cannot be replayed',()=>{
 const s=advertisingIsland(),before={...s.resources};advanceEngagementSchedule(s,480,{visible:true,focused:true});
 const offer=engagementOfferStatus(s);assert.equal(startEngagementOffer(s,offer.id,'ad'),true);
 const r=run(s,{type:'beginRewardedAd',purpose:'materials',offerId:offer.id});assert.equal(r.ok,true);
 assert.equal(run(s,{type:'completeRewardedAd',nonce:r.nonce,receiptId:'proof'},dev).ok,false);
 const reward={...s.commerce.ad.reward};assert.ok(Object.values(reward).every(x=>x>=10&&x<=30));
 assert.equal(run(s,{type:'completeRewardedAd',nonce:r.nonce,receiptId:'proof'},verified).ok,true);
 for(const id of Object.keys(reward)){assert.equal(s.resources[id],before[id]+reward[id]);assert.equal(s.bonusMaterials[id],reward[id]);}
 const balance={...s.resources};assert.equal(run(s,{type:'completeRewardedAd',nonce:r.nonce,receiptId:'proof'},verified).ok,false);assert.deepEqual(s.resources,balance);
});
test('material rewards cannot be farmed without a scheduled invitation',()=>{
 const s=advertisingIsland();assert.equal(run(s,{type:'beginRewardedAd',purpose:'materials'}).ok,false);
 s.commerce.receipts.push({id:'paid',at:NOW,grossGrosz:2000,verified:true});
 advanceEngagementSchedule(s,480,{visible:true,focused:true,premium:true});
 const first=run(s,{type:'beginRewardedAd',purpose:'materials',offerId:'initial-premium-bonus'});assert.equal(first.ok,true);
 assert.equal(run(s,{type:'completeRewardedAd',nonce:first.nonce,receiptId:'initial'},{}).ok,true);
 assert.equal(run(s,{type:'beginRewardedAd',purpose:'materials',offerId:'initial-premium-bonus'}).ok,false);
});
test('no-ad entitlement delivers standard benefit without a film, including shared Chapel cooldown',()=>{
 const s=createState(NOW);s.commerce.receipts.push({id:'paid',at:NOW,grossGrosz:2000,verified:true});
 const r=run(s,{type:'beginRewardedAd',purpose:'blessing'});assert.equal(r.noFilm,true);
 assert.equal(run(s,{type:'completeRewardedAd',nonce:r.nonce,receiptId:'chapel'},{}).ok,true);
 assert.equal(s.blessingRemaining,3600);assert.equal(s.paidBlessingCooldownRemaining,18000);
 assert.equal(run(s,{type:'beginRewardedAd',purpose:'blessing'}).ok,false);
});
test('promo code text cannot impersonate a server receipt or redeem twice',()=>{
 const s=createState(NOW);assert.equal(run(s,{type:'redeemPromoCode',code:'HELLO',reward:{coins:9999}}).ok,false);
 const c={verifiedPromoReceipt:{id:'server-1',code:'HELLO',reward:{coins:10,wood:20}}};
 assert.equal(run(s,{type:'redeemPromoCode',code:'hello'},c).ok,true);assert.equal(s.resources.coins,110);
 assert.equal(run(s,{type:'redeemPromoCode',code:'HELLO'},c).ok,false);
});
test('starting over preserves account benefits and original welcome without retaining the old island',()=>{
 const previous=createState(NOW),fresh=createState(NOW+DAY);
 previous.islandGeneration=7;previous.islandName='Still my island';previous.resources.coins=9999;
 previous.commerce.receipts.push({id:'paid',at:NOW,grossGrosz:2000,verified:true});
 previous.commerce.promoClaims.WELCOME_2026='claim-1';
 previous.commerce.checkouts.push({id:'pending',status:'pending'});
 previous.commerce.ad={nonce:'unfinished'};
 previous.loyalty={...previous.loyalty,claimed:['2026-10-30'],closed:true};
 previous.referrals={...previous.referrals,invited:['friend']};
 const reset=preserveAccountProgress(previous,fresh);
 assert.equal(reset.resources.coins,100);assert.equal(reset.islandGeneration,7);
 assert.equal(reset.islandName,'Still my island');assert.deepEqual(reset.welcome,previous.welcome);
 assert.equal(reset.commerce.receipts[0].id,'paid');assert.equal(reset.commerce.promoClaims.WELCOME_2026,'claim-1');
 assert.equal(reset.commerce.ad,null);assert.equal(reset.commerce.checkouts[0].status,'cancelled');
 assert.deepEqual(reset.loyalty,previous.loyalty);assert.deepEqual(reset.referrals,previous.referrals);
 for(const field of ACCOUNT_PROGRESS_FIELDS)if(previous[field] && typeof previous[field]==='object')assert.notEqual(reset[field],previous[field]);
});
