import test from 'node:test';
import assert from 'node:assert/strict';
import { createDevSync } from '../harborlight-dev-sync.js';
const account = { uid: 'dev-admin1', login: 'admin1' }, key = 'harborlight-dev-island-dev-admin1';
const V1 = { revision: 1, updateTime: '2026-10-30T12:00:00.000001Z' };
const V2 = { revision: 2, updateTime: '2026-10-30T12:00:01.000002Z' };
const json = coins => JSON.stringify({resources:{coins}});
function fixture({remote={payload:json(100),version:V1},save,load}={}) {
  const statuses=[],writes=[],timers=new Map(); let seq=0;
  const storage={getItem(){throw Error('Island storage must never be read')},setItem(){throw Error('Island storage must never be written')}};
  const sync=createDevSync({account,saveKey:key,storage,onStatus:s=>statuses.push(s),schedule:fn=>{timers.set(++seq,fn);return seq},cancel:id=>timers.delete(id),cloud:{loadIsland:load||(async()=>remote),saveIsland:save||(async(payload,version)=>{writes.push({payload,version});return version?V2:V1})}});
  return {sync,statuses,writes,timers};
}
test('cloud-only new island is confirmed before opening, without importing any browser cache',async()=>{
  const f=fixture({remote:null});assert.equal(await f.sync.open(json(100)),json(100));
  assert.deepEqual(f.writes,[{payload:json(100),version:null}]);assert.equal(f.sync.pending,false);assert.equal(f.sync.status,'saved');
});
test('existing cloud island takes precedence and is never reset by a starter',async()=>{
  const f=fixture({remote:{payload:json(777),version:V1}});assert.equal(await f.sync.open(json(100)),json(777));assert.equal(f.writes.length,0);
});
test('an unavailable cloud blocks opening instead of starting an offline island',async()=>{
  const f=fixture({load:async()=>{throw Object.assign(Error('offline'),{code:'offline'})}});
  await assert.rejects(f.sync.open(json(100)),/offline/);assert.equal(f.sync.writable,false);assert.equal(f.sync.queue(json(999)),false);assert.equal(f.writes.length,0);
});
test('failed first cloud commit does not claim a created starter',async()=>{
  const f=fixture({remote:null,save:async()=>{throw Object.assign(Error('offline'),{code:'offline'})}});
  await assert.rejects(f.sync.open(json(100)));assert.equal(f.sync.status,'offline');assert.equal(f.sync.confirmedPayload,null);
});
test('successful command snapshots use cloud compare-and-swap and become confirmed',async()=>{
  const f=fixture();await f.sync.open(json(100));f.sync.queue(json(90));assert.equal(await f.sync.flush(),true);
  assert.deepEqual(f.writes,[{payload:json(90),version:V1}]);assert.equal(f.sync.confirmedPayload,json(90));
});
test('failed or ambiguous write stops gameplay and never retries blindly',async()=>{
  let calls=0;const f=fixture({save:async()=>{calls++;throw Object.assign(Error('offline'),{code:'offline'})}});
  await f.sync.open(json(100));f.sync.queue(json(90));assert.equal(await f.sync.flush(),false);
  assert.equal(f.sync.writable,false);assert.equal(f.sync.confirmedPayload,json(100));assert.equal(f.sync.queue(json(80)),false);
  assert.equal(await f.sync.flush(),false);assert.equal(calls,1);assert.equal(f.timers.size,0);
});
test('explicit reload recovers the server truth after a lost response',async()=>{
  let loads=0;const f=fixture({load:async()=>({payload:json(++loads===1?100:90),version:loads===1?V1:V2}),save:async()=>{throw Object.assign(Error('offline'),{code:'offline'})}});
  await f.sync.open(json(100));f.sync.queue(json(90));await f.sync.flush();assert.equal(await f.sync.reloadCloud(),json(90));assert.equal(f.sync.writable,true);
});
test('conflict stops writes and leaves the confirmed island unchanged',async()=>{
  const f=fixture({save:async()=>{throw Object.assign(Error('conflict'),{code:'conflict'})}});
  await f.sync.open(json(100));f.sync.queue(json(120));await f.sync.flush();assert.equal(f.sync.status,'conflict');assert.equal(f.sync.confirmedPayload,json(100));
});
test('concurrent flushes serialize snapshots instead of overwriting their versions',async()=>{
  let release;const gate=new Promise(r=>release=r),calls=[];
  const f=fixture({save:async(payload,version)=>{calls.push({payload,version});if(calls.length===1)await gate;return calls.length===1?V2:{revision:3,updateTime:'2026-10-30T12:00:02.000003Z'}}});
  await f.sync.open(json(100));f.sync.queue(json(90));const first=f.sync.flush();await Promise.resolve();f.sync.queue(json(80));const second=f.sync.flush();release();await Promise.all([first,second]);
  assert.deepEqual(calls.map(x=>x.version),[V1,V2]);assert.equal(f.sync.confirmedPayload,json(80));
});
test('cross-account save keys and disposed coordinators cannot save',async()=>{
  assert.throws(()=>createDevSync({account,saveKey:'harborlight-dev-island-dev-admin2',cloud:{}}));
  const f=fixture();await f.sync.open(json(100));f.sync.dispose();assert.equal(f.sync.queue(json(90)),false);assert.equal(await f.sync.flush(),false);
});
test('a new production island comes from the server, never from a browser-supplied starter',async()=>{
 let creates=0,saves=0;
 const cloud={projectId:'harborlight-prod',environment:'prod',accountStatus:{expired:false},loadIsland:async()=>null,createIsland:async()=>{creates++;return{payload:json(100),version:V1}},saveIsland:async()=>{saves++;return V2}};
 const sync=createDevSync({account:{uid:'real-user'},saveKey:'harborlight-prod-island-real-user',cloud});
 assert.equal(await sync.open(json(999999)),json(100));assert.equal(creates,1);assert.equal(saves,0);
});
test('an expired production island is not silently recreated by opening the page',async()=>{
 let creates=0;
 const cloud={projectId:'harborlight-prod',environment:'prod',accountStatus:{expired:true},loadIsland:async()=>null,createIsland:async()=>{creates++;return{payload:json(100),version:V1}}};
 const sync=createDevSync({account:{uid:'real-user'},saveKey:'harborlight-prod-island-real-user',cloud});
 await assert.rejects(sync.open(json(100)),error=>error.code==='island-expired');assert.equal(creates,0);assert.equal(sync.writable,false);
});
test('PRE-PROD with the account API enabled also uses the server-owned starter',async()=>{
 let creates=0,saves=0;
 const cloud={projectId:'harborlight-dev',environment:'preprod',accountApiEnabled:true,accountStatus:{expired:false},loadIsland:async()=>null,createIsland:async()=>{creates++;return{payload:json(100),version:V1}},saveIsland:async()=>{saves++;throw Error('No client starter')}};
 const sync=createDevSync({account,saveKey:key,cloud});
 assert.equal(await sync.open(json(999999)),json(100));assert.equal(creates,1);assert.equal(saves,0);
});
