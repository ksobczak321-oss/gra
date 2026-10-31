import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlayerTradeService } from '../player-trade.mjs';
import { createAccountService } from '../account-service.mjs';

const NOW = Date.parse('2026-10-31T12:00:00Z');
class Store {
  records = new Map(); tail = Promise.resolve();
  put(key, value) { this.records.set(key, structuredClone(value)); }
  get(key) { return structuredClone(this.records.get(key)); }
  runTransaction(work) {
    const promise = this.tail.then(async () => {
      const copy = new Map([...this.records].map(([key,value]) => [key,structuredClone(value)]));
      let wrote = false;
      const result = await work({
        get: async key => { assert.equal(wrote,false,'all reads precede writes');return structuredClone(copy.get(key)); },
        set: async(key,value) => { wrote=true;copy.set(key,structuredClone(value)); },
        delete: async key => { wrote=true;copy.delete(key); }
      });
      this.records=copy;return result;
    });
    this.tail=promise.catch(()=>{});return promise;
  }
  async listTradeOffers({limit,cursor,at}) {
    assert.ok(Number.isSafeInteger(at),'query receives the trusted server clock');
    const rows=[...this.records].filter(([key,v])=>key.startsWith('playerTradeOffers/')&&v.expiresAt>at).sort(([a,x],[b,y])=>x.expiresAt-y.expiresAt||a.localeCompare(b)).filter(([key])=>!cursor||key>cursor);
    return {offers:rows.slice(0,limit).map(([,v])=>structuredClone(v)),cursor:rows.length>limit?rows[limit-1][0]:null};
  }
  async listTradeInbox({uid,limit,cursor}) {
    const rows=[...this.records].filter(([key])=>key.startsWith(`accounts/${uid}/tradeInbox/`)).sort(([a],[b])=>a.localeCompare(b)).filter(([key])=>!cursor||key>cursor);
    return {items:rows.slice(0,limit).map(([,v])=>structuredClone(v)),cursor:rows.length>limit?rows[limit-1][0]:null};
  }
}
const world = (name='Port',level=6) => ({version:9,islandGeneration:1,population:12,lastSimulatedAt:NOW,islandName:name,islandStartedAt:NOW-100000,
  resources:{coins:100,wood:500,stone:500,grain:100,food:100,planks:100},
  buildings:{...Object.fromEntries(['house','farm','sawmill','quarry','dock','warehouse','lighthouse','lumber','windmill','chapel','market'].map(id=>[id,{level:1}])),townhall:{level}},statistics:{traded:0},bonusMaterials:{wood:0,stone:0,grain:0,food:0,planks:0}});
function fixture(environment='production') {
  const store=new Store();let at=NOW;
  for(const uid of ['one','two','three']) {
    store.put(`accounts/${uid}`,{islandGeneration:1,lastPlayedAt:NOW});
    store.put(`islands/${uid}`,{payload:JSON.stringify(world(uid)),revision:4,generation:1,updatedAt:NOW});
  }
  return {store,service:createPlayerTradeService({store,environment,now:()=>at}),time:value=>{at=value;}};
}
const data=(f,uid='one')=>JSON.parse(f.store.get(`islands/${uid}`).payload);
const revision=(f,uid='one')=>f.store.get(`islands/${uid}`).revision;
function alter(f,uid,change) {const doc=f.store.get(`islands/${uid}`),state=JSON.parse(doc.payload);change(state);doc.payload=JSON.stringify(state);f.store.put(`islands/${uid}`,doc);}
const create=(f,extra={})=>f.service.createOffer({uid:'one',requestId:'create_12345',generation:1,expectedRevision:revision(f),islandId:'island-1',give:{resource:'wood',amount:100},want:{resource:'stone',amount:50},...extra});
const rejects=(promise,code)=>assert.rejects(promise,error=>error.code===code);

test('an offer escrows material once; full acceptance atomically exchanges both islands and conserves goods',async()=>{
  const f=fixture();const created=await create(f),id=created.offer.id;
  assert.equal(data(f).resources.wood,400);assert.equal(revision(f),5);
  const publicList = await f.service.listOffers({ uid: 'two' });
  assert.equal(publicList.offers[0].ownerUid, undefined, 'Other players receive an island label, not its private Auth UID');
  assert.equal(publicList.offers[0].ownerIslandName, 'one');
  const repeat=await create(f,{expectedRevision:4});assert.equal(repeat.alreadyApplied,true);assert.equal(revision(f),5);
  const accepted=await f.service.acceptOffer({uid:'two',offerId:id,requestId:'accept_12345',generation:1,expectedRevision:4,islandId:'island-1'});
  assert.equal(accepted.offer.status,'accepted');assert.equal(data(f).resources.stone,550);assert.equal(data(f,'two').resources.stone,450);
  assert.equal(data(f).resources.wood,400);assert.equal(data(f,'two').resources.wood,600);
  assert.equal(data(f).resources.wood+data(f,'two').resources.wood,1000);
  assert.equal(revision(f),6);assert.equal(revision(f,'two'),5);
  assert.equal(data(f).statistics.traded,1);assert.equal(data(f,'two').statistics.traded,1);
  const retry=await f.service.acceptOffer({uid:'two',offerId:id,requestId:'accept_12345',generation:1,expectedRevision:4,islandId:'island-1'});
  assert.equal(retry.alreadyApplied,true);assert.equal(revision(f,'two'),5);
});

test('two simultaneous takers cannot both receive the same escrow',async()=>{
  const f=fixture(),offer=(await create(f)).offer;
  const results=await Promise.allSettled(['two','three'].map(uid=>f.service.acceptOffer({uid,offerId:offer.id,requestId:'accept_race_'+uid,generation:1,expectedRevision:4,islandId:'island-1'})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected')[0].reason.code,'trade-offer-closed');
  assert.equal(data(f,'two').resources.wood+data(f,'three').resources.wood,1100);
});

test('unlock, caller versions, offer shape and owner checks fail without removing stock',async()=>{
  const f=fixture();alter(f,'one',s=>s.buildings.townhall.level=5);
  await rejects(create(f),'trade-level-required');assert.equal(data(f).resources.wood,500);
  alter(f,'one',s=>s.buildings.townhall.level=6);
  await rejects(create(f,{expectedRevision:3}),'island-conflict');
  await rejects(create(f,{expectedRevision:undefined}),'invalid-revision');
  await rejects(create(f,{generation:2}),'island-expired');
  await rejects(create(f,{give:{resource:'coins',amount:1}}),'trade-invalid-material');
  await rejects(create(f,{want:{resource:'wood',amount:1}}),'trade-same-material');
  await rejects(create(f,{give:{resource:'wood',amount:-1}}),'trade-invalid-material');
  const offer=(await create(f)).offer;
  await rejects(f.service.acceptOffer({uid:'one',offerId:offer.id,requestId:'self_accept_123',generation:1,expectedRevision:5}),'trade-own-offer');
  await rejects(f.service.cancelOffer({uid:'two',offerId:offer.id,requestId:'steal_cancel_123',generation:1,expectedRevision:4}),'trade-not-owner');
});

test('construction reservations and protected Food cannot be offered or spent as payment',async()=>{
  const f=fixture();alter(f,'one',s=>s.constructionProjects=[{reservedMaterials:{wood:450}}]);
  await rejects(create(f),'trade-insufficient-stock');
  await rejects(create(f,{give:{resource:'food',amount:51}}),'trade-insufficient-stock');
  assert.equal(revision(f),4);
  const offer=(await create(f,{give:{resource:'stone',amount:100},want:{resource:'food',amount:51}})).offer;
  await rejects(f.service.acceptOffer({uid:'two',offerId:offer.id,requestId:'food_accept_123',generation:1,expectedRevision:4}),'trade-insufficient-stock');
  assert.equal(data(f,'two').resources.food,100);
});

test('incoming ordinary inventory must fit on both sides; failure rolls back buyer payment',async()=>{
  const f=fixture(),offer=(await create(f)).offer;
  alter(f,'two',s=>s.resources.wood=1000);
  await rejects(f.service.acceptOffer({uid:'two',offerId:offer.id,requestId:'full_accept_123',generation:1,expectedRevision:4}),'trade-storage-full');
  assert.equal(data(f,'two').resources.stone,500);assert.equal(f.store.get(`playerTradeOffers/${offer.id}`).status,'open');
  alter(f,'two',s=>s.resources.wood=500);alter(f,'one',s=>s.resources.stone=1000);
  await rejects(f.service.acceptOffer({uid:'two',offerId:offer.id,requestId:'full_accept_456',generation:1,expectedRevision:4}),'trade-storage-full');
  assert.equal(data(f,'two').resources.stone,500);
});

test('cancellation restores bonus provenance and keeps ordinary overflow in a durable partial-claim inbox',async()=>{
  const f=fixture();alter(f,'one',s=>{s.resources.wood=300;s.bonusMaterials.wood=200;});
  const offer=(await create(f,{give:{resource:'wood',amount:250}})).offer;
  assert.equal(data(f).resources.wood,50);assert.equal(data(f).bonusMaterials.wood,0);
  alter(f,'one',s=>s.resources.wood=1000);
  const cancelled=await f.service.cancelOffer({uid:'one',offerId:offer.id,requestId:'cancel_12345',generation:1,expectedRevision:5});
  assert.equal(cancelled.returned,200);assert.equal(cancelled.inbox.amount,50);
  assert.equal(data(f).resources.wood,1200);assert.equal(data(f).bonusMaterials.wood,200);
  const repeated=await f.service.cancelOffer({uid:'one',offerId:offer.id,requestId:'cancel_12345',generation:1,expectedRevision:5});assert.equal(repeated.alreadyApplied,true);assert.equal(data(f).resources.wood,1200);
  await rejects(f.service.claimInbox({uid:'one',inboxId:offer.id,requestId:'claim_12345',generation:1,expectedRevision:6}),'trade-storage-full');
  alter(f,'one',s=>s.resources.wood=1180);
  const partial=await f.service.claimInbox({uid:'one',inboxId:offer.id,requestId:'claim_23456',generation:1,expectedRevision:6});
  assert.equal(partial.received,20);assert.equal(partial.inbox.amount,30);
  alter(f,'one',s=>s.resources.wood=1170);
  const final=await f.service.claimInbox({uid:'one',inboxId:offer.id,requestId:'claim_34567',generation:1,expectedRevision:7});
  assert.equal(final.received,30);assert.equal(final.inbox,null);assert.equal(data(f).resources.wood,1200);
  assert.equal((await f.service.listInbox({uid:'one'})).inbox.length,0);
});

test('expiry is checked at acceptance and only an owner POST settles a return; GET never mutates',async()=>{
  const f=fixture(),offer=(await create(f)).offer;f.time(NOW+86400000);
  const before=JSON.stringify([...f.store.records]);
  const listed=await f.service.listOffers({uid:'one'});assert.equal(listed.offers.length,0);assert.equal(listed.ownOffers[0].expired,true);
  assert.equal(JSON.stringify([...f.store.records]),before);
  await rejects(f.service.acceptOffer({uid:'two',offerId:offer.id,requestId:'late_accept_123',generation:1,expectedRevision:4}),'trade-offer-expired');
  const result=await f.service.cancelOffer({uid:'one',offerId:offer.id,requestId:'expired_cancel_123',generation:1,expectedRevision:5});
  assert.equal(result.offer.status,'expired');assert.equal(data(f).resources.wood,500);
});

test('more than one page of old OPEN offers cannot hide a current offer; closed future offers remain filtered',async()=>{
  const f=fixture();
  const base={ownerUid:'two',ownerIslandId:'island-1',ownerIslandName:'Aktualna wyspa',give:{resource:'wood',amount:10},want:{resource:'stone',amount:5},status:'open',createdAt:NOW-86400000,expiresAt:NOW-1};
  for(let n=0;n<60;n++) {
    const id='trade_'+n.toString(16).padStart(40,'0');f.store.put(`playerTradeOffers/${id}`,{...base,id});
  }
  const id='trade_'+'f'.repeat(40);f.store.put(`playerTradeOffers/${id}`,{...base,id,createdAt:NOW,expiresAt:NOW+1000});
  const closed='trade_'+'e'.repeat(40);f.store.put(`playerTradeOffers/${closed}`,{...base,id:closed,status:'accepted',expiresAt:NOW+1000});
  const before=JSON.stringify([...f.store.records]);
  const listed=await f.service.listOffers({uid:'one',limit:50});
  assert.deepEqual(listed.offers.map(offer=>offer.id),[id]);assert.equal(listed.cursor,null);
  assert.equal(JSON.stringify([...f.store.records]),before,'listing never changes expired escrow or any island');
});

test('island-2 trades affect only its resources and preserve primary, transfers, capacity and one-time records',async()=>{
  const f=fixture();alter(f,'one',s=>{
    s.buildings.townhall.level=10;
    s.archipelago={version:1,activeIslandId:'island-2',secondIsland:world('Druga wyspa',10),transfers:[{id:'ship-existing',amount:80}],shipCapacity:2000,capacityReceipts:[{id:'existing-receipt'}]};
  });
  const before=data(f),offer=(await create(f,{islandId:'island-2'})).offer;
  assert.equal(data(f).resources.wood,before.resources.wood);assert.equal(data(f).archipelago.secondIsland.resources.wood,400);
  await f.service.acceptOffer({uid:'two',offerId:offer.id,requestId:'second_accept_123',generation:1,expectedRevision:4});
  const after=data(f);assert.deepEqual(after.resources,before.resources);assert.equal(after.archipelago.secondIsland.resources.stone,550);
  assert.deepEqual(after.archipelago.transfers,before.archipelago.transfers);assert.deepEqual(after.archipelago.capacityReceipts,before.archipelago.capacityReceipts);assert.equal(after.archipelago.shipCapacity,2000);
});

test('request IDs cannot be reused for a different price or operation, and a replaced world cannot receive old escrow',async()=>{
  const f=fixture(),offer=(await create(f)).offer;
  await rejects(create(f,{want:{resource:'stone',amount:1}}),'trade-request-reused');
  alter(f,'one',s=>s.islandStartedAt=NOW+1);
  await rejects(f.service.cancelOffer({uid:'one',offerId:offer.id,requestId:'changed_cancel_123',generation:1,expectedRevision:5}),'trade-world-changed');
  await rejects(f.service.acceptOffer({uid:'two',offerId:offer.id,requestId:'changed_accept_123',generation:1,expectedRevision:4}),'trade-world-changed');
  assert.equal(data(f,'two').resources.stone,500);
  const fresh=await create(f,{requestId:'replacement_create_123',expectedRevision:5});
  assert.deepEqual(f.store.get('accounts/one').openTradeOfferIds,[fresh.offer.id],'old-world escrow cannot permanently occupy replacement-world offer slots');
});

test('production capacity requires a trusted payment and ordinary saves cannot drop an established second island',async()=>{
  const f=fixture(),service=createAccountService({store:f.store,now:()=>NOW,environment:'production'});
  alter(f,'one',s=>s.buildings.townhall.level=10);
  let state=data(f);state.archipelago={version:1,activeIslandId:'island-1',secondIsland:null,transfers:[],shipCapacity:2000,capacityReceipts:[{verified:true}]};
  await rejects(service.saveIsland({uid:'one',payload:JSON.stringify(state),generation:1,expectedRevision:4}),'unverified-ship-capacity');
  state.archipelago.shipCapacity=1000;state.archipelago.secondIsland=world('Druga',10);
  await service.saveIsland({uid:'one',payload:JSON.stringify(state),generation:1,expectedRevision:4});
  assert.deepEqual(data(f).archipelago.capacityReceipts,[],'untrusted receipts are discarded');
  state=data(f);delete state.archipelago;
  await rejects(service.saveIsland({uid:'one',payload:JSON.stringify(state),generation:1,expectedRevision:5}),'archipelago-island-loss');
  const locked=fixture();state=data(locked);state.archipelago={version:1,activeIslandId:'island-1',secondIsland:world(),transfers:[],shipCapacity:1000,capacityReceipts:[]};
  await rejects(createAccountService({store:locked.store,now:()=>NOW}).saveIsland({uid:'one',payload:JSON.stringify(state),generation:1,expectedRevision:4}),'second-island-locked');
});
