import test from 'node:test';
import assert from 'node:assert/strict';
import { createDevCloud, DEV_PROJECT } from '../harborlight-dev-cloud.js';

const NOW = Date.parse('2026-11-02T12:00:00Z'), UID = 'dev-admin2';
const token = ['header',Buffer.from(JSON.stringify({ aud: DEV_PROJECT, iss: `https://securetoken.google.com/${DEV_PROJECT}`,
  sub: UID, exp: NOW / 1000 + 3600 })).toString('base64url'),'signature'].join('.');
const reply = (body,status=200) => ({ status,ok:status>=200&&status<300,json:async()=>body });
function harness({ enabled = true, responses = [] } = {}) {
  const calls = [], storage = new Map();
  const client = createDevCloud({ hostname:'harborlight-dev.web.app',now:()=>NOW,
    storage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    fetch:async(url,options={})=>{
      calls.push({url,options});
      if(url==='/__/firebase/init.json') return reply({projectId:DEV_PROJECT,apiKey:'fixture-public-api-key-123456789',messagingSenderId:'28040211190'});
      if(url==='/api/v1/config') return enabled ? reply({accountApi:true,projectId:DEV_PROJECT,environment:'preprod'}) : reply({error:'account_api_disabled'},503);
      if(url.includes('accounts:signInWithPassword')) return reply({localId:UID,email:'admin2@dev.harborlight.pl',idToken:token,refreshToken:'fixture-refresh',expiresIn:'3600'});
      assert.equal(url,'/api/v1/ship-capacity'); assert.ok(responses.length,`Unexpected ${url}`); return responses.shift();
    }});
  return {client,calls,storage};
}
test('capacity cloud command uses the authenticated account endpoint and retains the canonical island update',async()=>{
  const result={ok:true,capacity:3000,receipt:{id:'intent-123',kind:'ship-capacity-coins',units:2,coins:100,payerIslandId:'island-2',at:NOW},islandUpdate:{payload:'trusted-world',generation:1,version:{revision:9,updateTime:new Date(NOW).toISOString()}}};
  const h=harness({responses:[reply(result)]}); await h.client.signIn('admin2','admin2');
  const body={requestId:'intent-123',units:2,islandId:'island-2',generation:1,expectedRevision:8};
  assert.deepEqual(await h.client.requestGameService('/api/v1/ship-capacity',body),result);
  const call=h.calls.at(-1);assert.equal(call.options.method,'POST');assert.equal(call.options.headers.Authorization,'Bearer '+token);
  assert.deepEqual(JSON.parse(call.options.body),body);assert.equal(h.storage.size,1,'only authentication is cached');
});
test('capacity business errors remain specific and actionable instead of becoming revision conflicts',async()=>{
  const h=harness({responses:[reply({error:'ship-capacity-insufficient-coins'},409),reply({error:'ship-capacity-request-reused'},409)]});
  await h.client.signIn('admin2','admin2');
  await assert.rejects(h.client.requestGameService('/api/v1/ship-capacity',{}),{code:'ship-capacity-insufficient-coins'});
  await assert.rejects(h.client.requestGameService('/api/v1/ship-capacity',{}),{code:'ship-capacity-request-reused'});
});
test('an unavailable capacity account service never falls back to a client payment or local mutation',async()=>{
  const h=harness({enabled:false});await h.client.signIn('admin2','admin2');
  await assert.rejects(h.client.requestGameService('/api/v1/ship-capacity',{}),{code:'ship-capacity-api-unavailable'});
  assert.equal(h.calls.some(call=>call.url==='/api/v1/ship-capacity'),false);
  for(const path of ['https://evil.invalid/api/v1/ship-capacity','/api/v1/ship-capacity/extra','/api/v1/ship-capacity?uid=other','/api/v1/payments'])
    await assert.rejects(h.client.requestGameService(path,{}),{code:'invalid-state'});
});
