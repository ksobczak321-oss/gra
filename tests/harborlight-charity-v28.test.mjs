import assert from 'node:assert/strict';
import test from 'node:test';
import { createCharityPreviewAdapter } from '../harborlight-v1-charity.js';
import { createState, normalizeState } from '../harborlight-v1-state.js';
const NOW=Date.parse('2026-11-02T12:00:00Z');
const initial=()=>{const state=createState(NOW);state.resources.coins=300;return state;};

test('PRE-PROD mock saves separate metadata through clone-safe callback and resumes exactly once',async()=>{
  let state=initial(); const mutations=[];
  const mount=()=>createCharityPreviewAdapter({environment:'preprod',getState:()=>structuredClone(state),getWorld:()=>state,
    onPersistSimulation:metadata=>{state.charitySimulation=metadata;},onMutation:result=>mutations.push(result),now:()=>NOW});
  let adapter=mount();await adapter.creditTestCoins();
  const donation=await adapter.donate({requestId:'small-payment-001',amount:100});
  assert.equal(donation.donation.coins,100);assert.equal(donation.donation.operatorCents,10);
  assert.equal(state.resources.coins,1200);assert.equal(state.charitySimulation.qualified,900);
  assert.equal(state.charitySimulation.donations[0].mode,'simulation');
  // The real provenance wallet is never fabricated by this adapter.
  assert.equal(state.charityWallet,undefined);
  state=normalizeState(JSON.parse(JSON.stringify(state)),NOW);
  adapter=mount();const status=await adapter.status();
  assert.equal(status.monthUsed,true);assert.equal(status.campaign.availableCents,4990);
  assert.equal((await adapter.donate({requestId:'small-payment-001',amount:100})).alreadyApplied,true);
  await assert.rejects(adapter.donate({requestId:'second-payment-002',amount:100}),error=>error.code==='charity-account-limit');
  await adapter.confirmTestTransfer({donationId:donation.donation.id});
  const claimed=await adapter.claimReward({donationId:donation.donation.id});
  assert.equal(claimed.reward.happinessPoints,20);assert.equal(claimed.reward.expiresAt-NOW,6*3600000);
  adapter=mount();assert.equal((await adapter.claimReward({donationId:donation.donation.id})).alreadyApplied,true);
  assert.equal((await adapter.status()).campaign.transferredCents,10);
  assert.equal(mutations.filter(value=>value.kind==='reward').length,1);
});

test('one wallet spends other coins first and later purchases cannot replenish eligible coins',async()=>{
  const state=initial();const adapter=createCharityPreviewAdapter({environment:'preprod',getState:()=>state,now:()=>NOW});
  await adapter.creditTestCoins(); // 300 ordinary plus1,000 qualified.
  state.resources.coins-=1200;
  assert.equal((await adapter.status()).qualifiedCoins,100);
  state.resources.coins+=1000; // A purchase or unknown income is never qualified.
  const current=await adapter.status();assert.equal(current.qualifiedCoins,100);assert.equal(current.unqualifiedCoins,1000);
  assert.equal((await adapter.donate({requestId:'only-earned-001',amount:100})).donation.operatorCents,10);
  assert.equal(state.resources.coins,1000);
});

test('simulation amount steps and replay mismatches fail without spending coins',async()=>{
 const state=initial();const adapter=createCharityPreviewAdapter({environment:'development',getState:()=>state,now:()=>NOW});
 await adapter.creditTestCoins();
 for(const amount of [0,50,101,150,99.9,'100',Infinity])await assert.rejects(adapter.donate({requestId:'invalid-step-001',amount}),error=>error.code==='charity-invalid-amount');
 assert.equal(state.resources.coins,1300);
 await adapter.donate({requestId:'valid-step-001',amount:100});
 await assert.rejects(adapter.donate({requestId:'valid-step-001',amount:200}),error=>error.code==='charity-request-reused');
 assert.equal(state.resources.coins,1200);
 assert.throws(()=>createCharityPreviewAdapter({environment:'production',getState:()=>state}),/simulation/);
});
