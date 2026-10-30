import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountService, LEGAL_DOCUMENT_VERSIONS, threeMonthDeadline } from '../account-service.mjs';
const NOW=Date.parse('2026-10-30T12:00:00Z');
const acceptance={...LEGAL_DOCUMENT_VERSIONS,termsAccepted:true,privacyAcknowledged:true};
const payload=JSON.stringify({resources:{coins:100,wood:100,stone:100,grain:100,food:100,planks:100}});
function fixture(environment='production') {
  const records=new Map();let writes=0,clock=NOW;
  const store={runTransaction:async work=>{
    const draft=new Map([...records].map(([k,v])=>[k,structuredClone(v)]));let dirty=false;
    const result=await work({get:async k=>{assert.equal(dirty,false);return structuredClone(draft.get(k));},set:async(k,v)=>{dirty=true;writes++;draft.set(k,structuredClone(v));},delete:async k=>{dirty=true;writes++;draft.delete(k);}});
    records.clear();for(const[k,v]of draft)records.set(k,v);return result;
  }};
  return{records,service:createAccountService({store,environment,now:()=>clock}),setTime:v=>clock=v,get writes(){return writes;}};
}
test('new PROD world admission requires both current document confirmations',async()=>{
  const f=fixture();
  assert.equal((await f.service.readLegalStatus({uid:'new-user'})).required,true);assert.equal(f.writes,0);
  await assert.rejects(f.service.startIsland({uid:'new-user',payload}),{code:'legal-required',status:428});
  assert.equal(f.records.size,0);
  for(const change of [{termsAccepted:false},{privacyAcknowledged:false},{termsVersion:'old'},{privacyVersion:'old'},{termsAccepted:'true'}]){
    await assert.rejects(f.service.acceptLegal({uid:'new-user',...acceptance,...change}),{code:'legal-required'});
    assert.equal(f.records.size,0);
  }
});
test('server records account-scoped versions/time without creating or altering an island',async()=>{
  const f=fixture();const receipt=await f.service.acceptLegal({uid:'new-user',...acceptance,acceptedAt:1});
  assert.equal(receipt.uid,'new-user');assert.equal(receipt.acceptedAt,NOW);assert.equal(receipt.privacyAcknowledgedAt,NOW);
  assert.equal(f.records.has('islands/new-user'),false);
  assert.equal((await f.service.readLegalStatus({uid:'new-user'})).required,false);
  assert.ok(f.records.has('accounts/new-user/legalAcceptances/'+acceptance.termsVersion+'_'+acceptance.privacyVersion));
  await assert.rejects(f.service.saveIsland({uid:'new-user',payload:payload.replace('"coins":100','"coins":999999'),generation:1,expectedRevision:0}),{code:'island-not-initialized'});
  assert.equal(f.records.has('islands/new-user'),false,'a legal receipt cannot turn PUT into a client-owned starter');
  await f.service.startIsland({uid:'new-user',payload});assert.equal(JSON.parse(f.records.get('islands/new-user').payload).resources.coins,100);
});
test('retry preserves first server time and does not renew play activity',async()=>{
  const f=fixture();f.records.set('accounts/existing',{lastPlayedAt:NOW-1000,islandGeneration:1});
  const first=await f.service.acceptLegal({uid:'existing',...acceptance});f.setTime(NOW+5000);
  const second=await f.service.acceptLegal({uid:'existing',...acceptance});
  assert.equal(first.acceptedAt,second.acceptedAt);assert.equal(second.alreadyAccepted,true);
  assert.equal(f.records.get('accounts/existing').lastPlayedAt,NOW-1000);
});
test('existing worlds and permanent PRE-PROD users are not reset or forced through registration',async()=>{
  const f=fixture();f.records.set('islands/old',{payload,revision:8,generation:1,updatedAt:NOW});
  const old=structuredClone(f.records.get('islands/old'));
  assert.equal((await f.service.readLegalStatus({uid:'old'})).required,false);assert.equal(f.writes,0);
  assert.deepEqual(f.records.get('islands/old'),old);
  const preprod=fixture('preprod');assert.equal((await preprod.service.readLegalStatus({uid:'dev-admin1'})).required,false);
  await preprod.service.startIsland({uid:'dev-admin1',payload});assert.equal(preprod.records.get('islands/dev-admin1').revision,1);
});
test('legal proof survives island expiry while a new world keeps its own starter balance',async()=>{
  const f=fixture();await f.service.acceptLegal({uid:'person',...acceptance});await f.service.startIsland({uid:'person',payload});
  f.setTime(threeMonthDeadline(NOW));await f.service.expireIsland({uid:'person'});
  assert.equal(f.records.get('accounts/person').legalAcceptance.acceptedAt,NOW);
  await f.service.startIsland({uid:'person',payload});assert.equal(f.records.get('islands/person').generation,2);
  assert.equal(JSON.parse(f.records.get('islands/person').payload).resources.coins,100);
  assert.equal(f.records.get('accounts/person').legalAcceptance.acceptedAt,NOW);
});
