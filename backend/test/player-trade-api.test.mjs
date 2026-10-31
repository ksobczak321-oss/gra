import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { createServer } from '../server.mjs';
import { createPlayerTradeService } from '../player-trade.mjs';
import { createAccountService } from '../account-service.mjs';

const OFFER='trade_'+'c'.repeat(40);
async function fixture(t,{trade=true,serviceOverride=null,accountOverride=null,identities={valid:'verified-owner'}}={}) {
  const calls=[];
  const record=name=>async input=>{calls.push([name,input]);return {ok:true};};
  const service=serviceOverride||{listOffers:record('list'),listInbox:record('inbox'),createOffer:record('create'),acceptOffer:record('accept'),cancelOffer:record('cancel'),claimInbox:record('claim')};
  const server=createServer({environment:'test',accountService:accountOverride||{readIsland:async()=>({})},playerTradeService:trade?service:null,verifyIdentityToken:async token=>{
    if(!identities[token])throw Object.assign(new Error('invalid'),{code:'auth-required',status:401});return {uid:identities[token]};
  }});
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));
  const request=(path,method='GET',body,authorization='Bearer valid')=>new Promise((resolve,reject)=>{
    const encoded=body===undefined?null:JSON.stringify(body);
    const req=http.request({host:'127.0.0.1',port:server.address().port,path,method,agent:false,headers:{...(authorization?{Authorization:authorization}:{}),...(encoded?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(encoded)}:{})}},res=>{
      const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.once('end',()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks))}));
    });req.once('error',reject);req.end(encoded);
  });return {request,calls};
}

test('auction routes require authentication and receive identity only from the verified token',async t=>{
  const {request,calls}=await fixture(t);
  assert.equal((await request('/api/v1/trade/offers','GET',undefined,null)).status,401);
  assert.equal((await request('/api/v1/trade/inbox','GET',undefined,'Bearer wrong')).status,401);assert.equal(calls.length,0);
  assert.equal((await request('/api/v1/trade/offers?islandId=island-2&limit=10&cursor=page')).status,200);
  assert.deepEqual(calls[0],['list',{uid:'verified-owner',islandId:'island-2',limit:10,cursor:'page'}]);
  assert.equal((await request('/api/v1/trade/inbox?limit=5')).status,200);
  assert.deepEqual(calls[1],['inbox',{uid:'verified-owner',limit:5,cursor:null}]);
  const body={uid:'victim',requestId:'operation_123',islandId:'island-2',generation:3,expectedRevision:8,give:{resource:'stone',amount:20},want:{resource:'wood',amount:30},createdAt:1,verified:true};
  assert.equal((await request('/api/v1/trade/offers','POST',body)).status,201);
  assert.deepEqual(calls[2],['create',{uid:'verified-owner',requestId:body.requestId,generation:3,expectedRevision:8,islandId:'island-2',give:body.give,want:body.want}]);
  assert.equal((await request(`/api/v1/trade/offers/${OFFER}/accept`,'POST',body)).status,200);
  assert.deepEqual(calls[3],['accept',{uid:'verified-owner',requestId:body.requestId,generation:3,expectedRevision:8,offerId:OFFER,islandId:'island-2'}]);
  assert.equal((await request(`/api/v1/trade/offers/${OFFER}/cancel`,'POST',body)).status,200);
  assert.deepEqual(calls[4],['cancel',{uid:'verified-owner',requestId:body.requestId,generation:3,expectedRevision:8,offerId:OFFER}]);
  assert.equal((await request(`/api/v1/trade/inbox/${OFFER}/claim`,'POST',body)).status,200);
  assert.deepEqual(calls[5],['claim',{uid:'verified-owner',requestId:body.requestId,generation:3,expectedRevision:8,inboxId:OFFER}]);
});

test('unconfigured trading is explicit and invalid paths or methods cannot mutate it',async t=>{
  const disabled=await fixture(t,{trade:false});
  const unavailable=await disabled.request('/api/v1/trade/offers');assert.equal(unavailable.status,503);assert.equal(unavailable.body.error,'trade-api-unavailable');
  const {request,calls}=await fixture(t);
  assert.equal((await request('/api/v1/trade/offers/../../accounts/victim','POST',{})).status,404);
  assert.equal((await request('/api/v1/trade/offers','DELETE')).status,405);
  assert.equal((await request(`/api/v1/trade/inbox/${OFFER}/claim`)).status,405);
  assert.equal(calls.length,0);
});

test('real HTTP exchange between two verified identities keeps escrow, global revisions and both island histories consistent',async t=>{
  const at=Date.parse('2026-10-31T12:00:00Z'),records=new Map();let tail=Promise.resolve();
  const store={
    runTransaction(work){
      const next=tail.then(async()=>{
        const draft=new Map([...records].map(([key,value])=>[key,structuredClone(value)]));let wrote=false;
        const result=await work({get:async key=>{assert.equal(wrote,false);return structuredClone(draft.get(key));},set:async(key,value)=>{wrote=true;draft.set(key,structuredClone(value));},delete:async key=>{wrote=true;draft.delete(key);}});
        records.clear();for(const [key,value] of draft)records.set(key,value);return result;
      });tail=next.catch(()=>{});return next;
    },
    async listTradeOffers({at}){return {offers:[...records].filter(([key,value])=>key.startsWith('playerTradeOffers/')&&value.expiresAt>at).sort(([,a],[,b])=>a.expiresAt-b.expiresAt).map(([,value])=>structuredClone(value)),cursor:null};},
    async listTradeInbox({uid}){return {items:[...records].filter(([key])=>key.startsWith(`accounts/${uid}/tradeInbox/`)).map(([,value])=>structuredClone(value)),cursor:null};}
  };
  const world=(name)=>({version:9,islandGeneration:1,population:12,lastSimulatedAt:at,islandName:name,islandStartedAt:at-100000,resources:{coins:100,wood:500,stone:500,grain:100,food:100,planks:100},buildings:{...Object.fromEntries(['house','farm','sawmill','quarry','dock','warehouse','lighthouse','lumber','windmill','chapel','market'].map(id=>[id,{level:1}])),townhall:{level:10}},statistics:{traded:0},tutorial:{completed:{'rules-read':true},claimed:{'rules-read':true}},welcome:{startedAt:at-86400000,until:at+86400000}});
  for(const uid of ['one','two']){
    const state=world('Historia '+uid);state.archipelago={version:1,activeIslandId:'island-2',secondIsland:world('Druga '+uid),transfers:[{id:'existing-voyage-'+uid,amount:70}],shipCapacity:2000,capacityReceipts:[{id:'confirmed-'+uid}]};
    records.set(`accounts/${uid}`,{islandGeneration:1,lastPlayedAt:at});records.set(`islands/${uid}`,{payload:JSON.stringify(state),revision:1,generation:1,updatedAt:at});
  }
  const snapshot=uid=>JSON.parse(records.get(`islands/${uid}`).payload);
  const originalOne=snapshot('one'),originalTwo=snapshot('two');
  const service=createPlayerTradeService({store,now:()=>at});
  const account=createAccountService({store,now:()=>at});
  const {request}=await fixture(t,{serviceOverride:service,accountOverride:account,identities:{maker:'one',buyer:'two'}});
  const maker=(path,method='GET',body)=>request(path,method,body,'Bearer maker');
  const buyer=(path,method='GET',body)=>request(path,method,body,'Bearer buyer');
  const offerBody={uid:'two',requestId:'http_create_123',islandId:'island-2',generation:1,expectedRevision:1,give:{resource:'wood',amount:100},want:{resource:'stone',amount:50}};
  const created=await maker('/api/v1/trade/offers','POST',offerBody);assert.equal(created.status,201);assert.equal(created.body.offer.ownerUid,'one');
  const id=created.body.offer.id;
  assert.equal(snapshot('one').archipelago.secondIsland.resources.wood,400);assert.deepEqual(snapshot('one').resources,originalOne.resources);
  assert.equal(records.get('islands/one').revision,2);
  const board=await buyer('/api/v1/trade/offers?islandId=island-1');assert.equal(board.body.offers[0].id,id);
  const acceptedBody={uid:'one',requestId:'http_accept_123',islandId:'island-1',generation:1,expectedRevision:1};
  const accepted=await buyer(`/api/v1/trade/offers/${id}/accept`,'POST',acceptedBody);assert.equal(accepted.status,200);
  assert.equal(snapshot('one').archipelago.secondIsland.resources.stone,550);assert.equal(snapshot('two').resources.stone,450);assert.equal(snapshot('two').resources.wood,600);
  assert.equal(records.get('islands/one').revision,3);assert.equal(records.get('islands/two').revision,2);
  assert.deepEqual(snapshot('two').archipelago.secondIsland,originalTwo.archipelago.secondIsland);
  assert.deepEqual(snapshot('one').tutorial,originalOne.tutorial);assert.deepEqual(snapshot('one').archipelago.transfers,originalOne.archipelago.transfers);
  assert.deepEqual(snapshot('one').archipelago.capacityReceipts,originalOne.archipelago.capacityReceipts);
  const duplicate=await buyer(`/api/v1/trade/offers/${id}/accept`,'POST',acceptedBody);assert.equal(duplicate.body.alreadyApplied,true);assert.equal(records.get('islands/two').revision,2);
  const stale=await maker('/api/v1/island','PUT',{payload:JSON.stringify(originalOne),generation:1,expectedRevision:1});assert.equal(stale.status,409);assert.equal(stale.body.error,'island-conflict');
  assert.equal(snapshot('one').archipelago.secondIsland.resources.wood,400);
  const cancelCreate=await maker('/api/v1/trade/offers','POST',{...offerBody,requestId:'http_cancel_create',islandId:'island-1',expectedRevision:3});assert.equal(cancelCreate.status,201);
  const cancelId=cancelCreate.body.offer.id;
  assert.equal(snapshot('one').resources.wood,400);
  const denied=await buyer(`/api/v1/trade/offers/${cancelId}/cancel`,'POST',{requestId:'http_steal_cancel',generation:1,expectedRevision:2});assert.equal(denied.status,403);
  const cancelled=await maker(`/api/v1/trade/offers/${cancelId}/cancel`,'POST',{requestId:'http_cancel_123',generation:1,expectedRevision:4});assert.equal(cancelled.status,200);assert.equal(snapshot('one').resources.wood,500);
  const cancelledAgain=await maker(`/api/v1/trade/offers/${cancelId}/cancel`,'POST',{requestId:'http_cancel_123',generation:1,expectedRevision:4});assert.equal(cancelledAgain.body.alreadyApplied,true);assert.equal(records.get('islands/one').revision,5);
  assert.equal((await maker('/api/v1/trade/inbox')).body.inbox.length,0);
});
