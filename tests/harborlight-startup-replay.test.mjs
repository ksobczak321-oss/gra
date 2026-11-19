import test from 'node:test';
import assert from 'node:assert/strict';
import * as Arch from '../harborlight-v1-archipelago.js';
import * as State from '../harborlight-v1-state.js';
import * as Development from '../harborlight-v1-development.js';
import {theatreAction} from '../harborlight-v1-theatre.js';
import {replayStartupPacket} from '../harborlight-v1-startup-replay-model.js';
import {createStartupReplayClient,startupReplayGap,startupReplayIdentityKey,STARTUP_REPLAY_MIN_GAP_MS} from '../harborlight-v1-startup-replay.js';

const NOW=Date.parse('2026-11-19T12:00:00Z');
const adapters={createState:State.createState,normalizeState:State.normalizeState,advanceTo:State.advanceTo};
const identity={uid:'dev-admin3',generation:2,revision:591,updateTime:'2026-11-17T12:00:00Z',adoptionEpoch:1,activeIslandId:'island-1',clockGeneration:2,clockRevision:12,clockRate:1};
const packet=()=>({bundle:{worlds:{}},hiddenProperties:[]});
class FakeWorker {
  terminated=false;
  postMessage(value){this.sent=structuredClone(value);}
  terminate(){this.terminated=true;}
  reply(changes={}){this.onmessage({data:{...this.sent,type:'complete',packet:packet(),...changes}});}
}
function transport(){
  const workers=[];let current={...identity};
  const client=createStartupReplayClient({workerFactory:()=>{const w=new FakeWorker();workers.push(w);return w;},isCurrent:expected=>startupReplayIdentityKey(expected)===startupReplayIdentityKey(current)});
  return {client,workers,run:()=>client.run({packet:packet(),targetNow:NOW,realNow:NOW,identity}),change:(key,value)=>current[key]=value};
}

test('only finite eligible elapsed world clocks trigger startup replay',()=>{
  const bundle={worlds:{old:{lastSimulatedAt:NOW-STARTUP_REPLAY_MIN_GAP_MS},new:{lastSimulatedAt:NOW-1},invalid:{lastSimulatedAt:NaN},future:{lastSimulatedAt:NOW+1000}}};
  assert.equal(startupReplayGap(bundle,NOW),STARTUP_REPLAY_MIN_GAP_MS);
  assert.equal(startupReplayGap(bundle,NOW,w=>w!==bundle.worlds.old),1);
  assert.equal(startupReplayGap(bundle,NaN),0);
});
test('worker replies require a live identity guard and terminate after one result',async()=>{
  assert.throws(()=>createStartupReplayClient(),TypeError);
  const t=transport(),result=t.run();
  assert.equal(t.client.pending,true);assert.equal(t.workers[0].sent.targetNow,NOW);
  await assert.rejects(t.run(),{code:'startup-replay-unavailable'});
  t.workers[0].reply();assert.equal((await result).targetNow,NOW);
  assert.equal(t.workers[0].terminated,true);assert.equal(t.client.pending,false);
});
for(const key of ['uid','generation','revision','updateTime','adoptionEpoch','activeIslandId','clockGeneration','clockRevision','clockRate'])test(`a stale ${key} discards the entire worker result`,async()=>{
  const t=transport(),result=t.run();t.change(key,'changed');t.workers[0].reply();
  await assert.rejects(result,{code:'startup-state-changed'});assert.equal(t.workers[0].terminated,true);
});
for(const changes of [{protocol:0},{targetNow:NOW+1},{identityKey:'wrong'},{packet:null},{type:'error'}])test(`invalid/failed worker response is never adopted (${JSON.stringify(changes)})`,async()=>{
  const t=transport(),result=t.run();t.workers[0].reply(changes);
  await assert.rejects(result);assert.equal(t.client.pending,false);assert.equal(t.workers[0].terminated,true);
});
test('cancel before launch and during replay cannot fall back to synchronous work',async()=>{
  const t=transport();t.change('uid','signed-out');
  await assert.rejects(t.run(),{code:'startup-state-changed'});assert.equal(t.workers.length,0);
  const live=transport(),result=live.run();live.client.cancel();
  await assert.rejects(result,{code:'startup-replay-cancelled'});
  live.workers[0].reply();assert.equal(live.workers[0].terminated,true);
  live.client.dispose();await assert.rejects(live.run(),{code:'startup-replay-unavailable'});
});
test('worker creation, structured clone, and runtime failures produce no partial result',async()=>{
  for(const workerFactory of [()=>{throw Error('unavailable');},()=>({postMessage(){throw Error('clone');},terminate(){}})]){
    const client=createStartupReplayClient({workerFactory,isCurrent:()=>true});
    await assert.rejects(client.run({packet:packet(),targetNow:NOW,realNow:NOW,identity}));
    assert.equal(client.pending,false);
  }
  const t=transport(),result=t.run();t.workers[0].onerror({preventDefault(){}});
  await assert.rejects(result,{code:'startup-worker-failed'});
});

function fixture(ruleset){
  const world=State.createState(NOW,{...(ruleset?{ruleset}:{}),onboarding:false});
  world.resources.coins=100000;
  Object.defineProperty(world,'runtimeOnline',{configurable:true,writable:true,value:false});
  Object.defineProperty(world,'runtimeKingdomServer',{configurable:true,writable:true,value:false});
  const bundle=Arch.restoreArchipelago(world,adapters,NOW);
  // Both pending ad kinds are real model state and must be cancelled without
  // granting rewards before offline time is settled.
  bundle.primary.commerce.ad={nonce:'interrupted-standard',purpose:'materials',startedAt:NOW,offerId:'initial-premium-bonus'};
  const purchase=theatreAction(bundle.primary,{type:'theatreBuy',decoration:'fountain',slot:0});
  assert.equal(purchase.ok,true);
  for(let i=0;i<3;i++)assert.equal(theatreAction(bundle.primary,{type:'theatreUpgrade',id:purchase.item.id},{noAds:true}).ok,true);
  // An upgraded v32 save can carry an interrupted film from its legacy rules.
  const currentRules=bundle.primary.ruleset;delete bundle.primary.ruleset;
  assert.equal(theatreAction(bundle.primary,{type:'theatreBeginUpgradeAd',id:purchase.item.id}).ok,true);
  if(currentRules)bundle.primary.ruleset=currentRules;
  return bundle;
}
function reference(bundle,targetNow,realNow,context,recover=true){
  const world=Arch.activeIsland(bundle),worlds=Object.values(bundle.worlds),caps=context.capabilities||{};
  const ctx=extra=>Development.isDevelopment(world)?Development.developmentContext(world,{worlds,highestTownhall:Math.max(...worlds.map(w=>w.buildings?.townhall?.level||1)),highestAcademyLevel:Math.max(...worlds.map(w=>w.buildings?.academy?.level||0)),accountId:context.accountId,serverKingdom:false,online:context.online,allowAdSimulation:caps.simulatedAds===true,...extra}):extra;
  const at=context.simulatedActionClock?targetNow:realNow;
  if(recover){
    if(world.commerce?.ad)State.act(world,{type:'cancelRewardedAd',nonce:world.commerce.ad.nonce},at,ctx({...caps,devSimulation:caps.simulatedPayments===true||caps.simulatedAds===true}));
    if(world.theatre?.pendingUpgrade)State.act(world,{type:'theatreCancelUpgradeAd',nonce:world.theatre.pendingUpgrade.nonce},at,ctx({}));
  }
  for(const item of worlds)if(Development.isDevelopment(item))item.runtimeOnline=item===world&&context.online===true;
  Arch.advanceArchipelago(bundle,targetNow);
}
for(const ruleset of [null,32])for(const simulatedActionClock of [false,true])test(`one full worker replay preserves the original recovery/model result (${ruleset??'legacy'}, simulated=${simulatedActionClock})`,()=>{
  const original=fixture(ruleset),before=structuredClone(original),targetNow=NOW+3600000;
  const context={accountId:'dev-admin3',online:true,capabilities:{environment:'development',simulatedAds:true,simulatedPayments:true},simulatedActionClock};
  const transferred=structuredClone(Arch.captureSimulationBundle(original));
  const reply=replayStartupPacket({packet:transferred,targetNow,realNow:NOW+1000,context});
  assert.deepEqual(structuredClone(original),before,'worker-side processing must not mutate the main-thread source');
  reference(original,targetNow,NOW+1000,context);
  const actual=Arch.restoreSimulationBundle(structuredClone(reply),adapters);
  assert.deepEqual(structuredClone(actual),structuredClone(original));
  assert.deepEqual(Arch.serializeArchipelago(actual),Arch.serializeArchipelago(original));
  assert.equal(actual.primary.commerce.ad,null);assert.equal(actual.primary.theatre.pendingUpgrade,null);
  assert.equal(actual.primary.theatre.collection[0].level,4,'unfinished film grants no decoration upgrade');
  if(ruleset)assert.equal(actual.primary.runtimeOnline,true);
});
test('a later worker tick preserves cargo boundaries/shared coins and does not repeat pre-actions',()=>{
  const original=fixture(32),world=original.primary;
  world.buildings.townhall.level=10;world.buildings.warehouse.level=9;
  Object.assign(world.resources,{coins:100000,wood:30000,stone:30000,grain:30000,planks:30000,flour:30000});
  assert.equal(Arch.createNextIsland(original,{name:'Druga'},NOW).ok,true);
  assert.equal(Arch.sendIslandTransfer(original,{toIslandId:'island-2',cargo:{wood:100}},NOW).ok,true);
  const context={accountId:'dev-admin3',online:false,capabilities:{}};
  const reply=replayStartupPacket({packet:structuredClone(Arch.captureSimulationBundle(original)),targetNow:NOW+3600000,realNow:NOW,context,recoverInterruptions:false});
  reference(original,NOW+3600000,NOW,context,false);
  const actual=Arch.restoreSimulationBundle(structuredClone(reply),adapters);
  assert.deepEqual(Arch.serializeArchipelago(actual),Arch.serializeArchipelago(original));
  assert.equal(actual.transfers[0].status,'complete');assert.equal(actual.primary.settings,actual.secondary.settings);
  const before=actual.sharedWallet.coins;actual.secondary.resources.coins-=1;assert.equal(actual.primary.resources.coins,before-1);
});
