import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountService } from '../account-service.mjs';
import { createPlayerTradeService } from '../player-trade.mjs';
import { CURRENT_TRADE_RULES } from '../trade-rules-v32.mjs';
import { createCurrentStarterIsland } from '../starter-island.mjs';
import { packArchipelagoSave, unpackArchipelagoSave } from '../harborlight-v1-save-packing.js';
import * as P from '../harborlight-v1-provisions.js';

const NOW=1795000000000,copy=value=>structuredClone(value);
class Store {
  records=new Map();
  async runTransaction(work) {
    const draft=copy(this.records);let wrote=false;
    const result=await work({get:async key=>{assert.equal(wrote,false,'all transaction reads precede writes');return copy(draft.get(key));},
      set:async(key,value)=>{wrote=true;draft.set(key,copy(value));},delete:async key=>{wrote=true;draft.delete(key);}});
    this.records=draft;return result;
  }
}
function world(id='island-1',count=700) {
  const state=JSON.parse(createCurrentStarterIsland(NOW));
  Object.assign(state,{islandId:id,islandRole:id==='island-1'?'mother':'daughter',islandStartedAt:NOW-100000,adventures:{version:1}});
  state.onboarding.stage='complete';state.onboarding.worldStartedAt=state.islandStartedAt;
  state.buildings.townhall.level=6;state.resources.civilianClothes=30;
  P.normalizeProvisions(state);
  const history=Array.from({length:count},(_,i)=>({resource:i%2?'vegetables':'pasteurizedMilk',satiety:.125+(i%7)/100,
    from:NOW-86000000+i*13000.125,at:NOW-86000000+(i+1)*13000.125}));
  for(const person of Object.values(state.provisions.people))person.history=copy(history);
  P.compactDietHistories(state);return state;
}
async function fixture(state=world()) {
  const store=new Store(),service=createAccountService({store,now:()=>NOW,environment:'preprod'}),uid='dev-admin1';
  await service.startIsland({uid,payload:JSON.stringify(state)});
  const read=async()=>JSON.parse((await service.readIsland({uid})).island.payload);
  return {store,service,uid,read};
}
const rejects=(promise,code,status)=>assert.rejects(promise,error=>error.code===code&&(status===undefined||error.status===status));

test('a cached old tab cannot overwrite packed histories after adopting the latest server revision',async()=>{
  const original=world(),f=await fixture(original),stored=await f.read();
  assert.ok(stored.adventuresPacked.sections.includes('provisions'));
  const before=copy(f.store.records),stale=copy(original);stale.resources.wood=1;
  // This is the dangerous old reload path: current CAS, but the old live world
  // survived its old decoder throwing on the new provisions section.
  await rejects(f.service.saveIsland({uid:f.uid,payload:JSON.stringify(stale),generation:1,expectedRevision:1}),'unsupported-save-format',409);
  assert.deepEqual(f.store.records,before,'the format fence runs before all account/world/ledger writes');
  const decoded=unpackArchipelagoSave(stored);decoded.resources.wood-=1;
  await f.service.saveIsland({uid:f.uid,payload:JSON.stringify(packArchipelagoSave(decoded)),generation:1,expectedRevision:1,savePackingVersion:1});
  const after=unpackArchipelagoSave(await f.read());assert.equal(after.resources.wood,99);assert.deepEqual(after.provisions,original.provisions);
});

test('the capability fence also protects a packed daughter, and legacy plain worlds keep their old write contract',async()=>{
  const mother=world('island-1',2),daughter=world('island-2');daughter.resources.coins=0;
  mother.archipelago={version:2,activeIslandId:'island-2',shipCapacity:1000,transfers:[],capacityReceipts:[],islands:{'island-2':daughter}};
  const f=await fixture(mother),stored=await f.read();
  assert.equal(stored.adventuresPacked,undefined);assert.ok(stored.archipelago.islands['island-2'].adventuresPacked.sections.includes('provisions'));
  const before=copy(f.store.records);
  await rejects(f.service.saveIsland({uid:f.uid,payload:JSON.stringify(mother),generation:1,expectedRevision:1}),'unsupported-save-format',409);
  assert.deepEqual(f.store.records,before);
  const legacy=await fixture(world('island-1',2));
  await legacy.service.saveIsland({uid:legacy.uid,payload:JSON.stringify(await legacy.read()),generation:1,expectedRevision:1});
  assert.equal(legacy.store.records.get(`islands/${legacy.uid}`).revision,2);
});

test('bad capability values and malformed packed sections cannot change account or island state',async()=>{
  const f=await fixture(),stored=await f.read(),before=copy(f.store.records);
  for(const savePackingVersion of[null,0,2,'1',true,{}])await rejects(f.service.saveIsland({uid:f.uid,payload:JSON.stringify(stored),generation:1,expectedRevision:1,savePackingVersion}),'unsupported-save-format',400);
  const corrupt=copy(stored);corrupt.adventuresPacked.uncompressedBytes++;
  await rejects(f.service.saveIsland({uid:f.uid,payload:JSON.stringify(corrupt),generation:1,expectedRevision:1,savePackingVersion:1}),'invalid-island',400);
  assert.deepEqual(f.store.records,before);
});

test('a capable client may replace a formerly packed diet with a smaller plain complete representation',async()=>{
  const f=await fixture(),smaller=world('island-1',2);
  await f.service.saveIsland({uid:f.uid,payload:JSON.stringify(smaller),generation:1,expectedRevision:1,savePackingVersion:1});
  const stored=await f.read();assert.equal(stored.adventuresPacked,undefined);assert.deepEqual(stored.provisions,smaller.provisions);
});

test('an ordinary packed mother/daughter save retains the exact submitted payload bytes for commit recovery',async()=>{
  const mother=world(),daughter=world('island-2');daughter.resources.coins=0;
  mother.archipelago={version:2,activeIslandId:'island-2',shipCapacity:1000,transfers:[],capacityReceipts:[],islands:{'island-2':daughter}};
  const f=await fixture(mother),submitted=JSON.stringify(packArchipelagoSave(unpackArchipelagoSave(await f.read())));
  await f.service.saveIsland({uid:f.uid,payload:submitted,generation:1,expectedRevision:1,savePackingVersion:1});
  assert.equal((await f.service.readIsland({uid:f.uid})).island.payload,submitted);
});

test('a server-owned promotion unpacks and repacks the complete history while preserving transport limits',async()=>{
  const original=world(),f=await fixture(original);
  f.store.records.set('promotions/KEEP_DIET',{enabled:true,maxClaims:1,claimedCount:0,reward:{wood:3}});
  await f.service.redeemCode({uid:f.uid,code:'KEEP_DIET',generation:1});
  const stored=await f.read(),decoded=unpackArchipelagoSave(stored);
  assert.ok(stored.adventuresPacked.sections.includes('provisions'));assert.ok(Buffer.byteLength(JSON.stringify(stored))<700000);
  assert.equal(decoded.resources.wood,103);assert.deepEqual(decoded.provisions,original.provisions);
});

test('a dirty cloud trade consumes inventory and retains every packed milk, profile and diet entry',async()=>{
  const original=world(),f=await fixture(original),trade=createPlayerTradeService({store:f.store,now:()=>NOW,environment:'preprod',v32:CURRENT_TRADE_RULES});
  await trade.createOffer({uid:f.uid,requestId:'packed_diet_trade_1',generation:1,expectedRevision:1,islandId:'island-1',
    give:{resource:'civilianClothes',amount:10},want:{resource:'coins',amount:1}});
  const stored=await f.read(),decoded=unpackArchipelagoSave(stored);
  assert.ok(stored.adventuresPacked.sections.includes('provisions'));assert.equal(decoded.resources.civilianClothes,20);
  assert.deepEqual(decoded.provisions,original.provisions);assert.ok(Buffer.byteLength(JSON.stringify(stored))<700000);
});
