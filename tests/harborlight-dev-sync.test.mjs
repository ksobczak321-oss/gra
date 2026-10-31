import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOUD_AUTOSAVE_MS, createDevSync } from '../harborlight-dev-sync.js';
const account = { uid: 'dev-admin1', login: 'admin1' }, key = 'harborlight-dev-island-dev-admin1';
const V1 = { revision: 1, updateTime: '2026-10-30T12:00:00.000001Z' };
const V2 = { revision: 2, updateTime: '2026-10-30T12:00:01.000002Z' };
const json = coins => JSON.stringify({resources:{coins}});
function fixture({remote={payload:json(100),version:V1},save,load}={}) {
  const statuses=[],writes=[],restores=[],delays=[],timers=new Map(); let seq=0;
  const storage={getItem(){throw Error('Island storage must never be read')},setItem(){throw Error('Island storage must never be written')}};
  const sync=createDevSync({account,saveKey:key,storage,onStatus:s=>statuses.push(s),onRestore:(payload,context)=>restores.push({payload,...context}),schedule:(fn,delay)=>{delays.push(delay);timers.set(++seq,fn);return seq},cancel:id=>timers.delete(id),cloud:{loadIsland:load||(async()=>remote),saveIsland:save||(async(payload,version)=>{writes.push({payload,version});return version?V2:V1})}});
  return {sync,statuses,writes,timers,delays,restores};
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
  assert.equal(await f.sync.flush(),false);assert.equal(calls,1);assert.equal(f.timers.size,1);
  assert.equal(f.delays.at(-1),5000,'only a read-before-retry recovery is scheduled');
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

test('autosave is due thirty seconds after the first dirty state, not postponed by more input',async()=>{
  const f=fixture();await f.sync.open(json(100));f.sync.queue(json(90));f.sync.queue(json(80));
  assert.equal(CLOUD_AUTOSAVE_MS,30000);assert.deepEqual(f.delays,[30000]);assert.equal(f.timers.size,1);
  const [id,fire]=[...f.timers][0];f.timers.delete(id);fire();
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(f.writes,[{payload:json(80),version:V1}]);assert.equal(f.sync.status,'saved');
});
test('a temporary failed write is retried only after a cloud read confirms its unchanged version',async()=>{
  let remote={payload:json(100),version:V1},calls=0;const operations=[];
  const f=fixture({load:async()=>{operations.push('read');return remote},save:async(payload,version)=>{
    operations.push(['write',payload,version]);if(++calls===1)throw Object.assign(Error('offline'),{code:'offline'});
    remote={payload,version:V2};return V2;
  }});
  await f.sync.open(json(100));f.sync.queue(json(90));assert.equal(await f.sync.flush(),false);
  assert.equal(f.sync.queue(json(80)),false,'new gameplay remains blocked until recovery');
  assert.equal(await f.sync.recover(),true);
  assert.deepEqual(operations,['read',['write',json(90),V1],'read',['write',json(90),V1]]);
  assert.deepEqual(f.restores,[{payload:json(90),reason:'recovered'}]);assert.equal(f.sync.writable,true);
});
test('a lost success response is reconciled without charging or advancing the version twice',async()=>{
  let remote={payload:json(100),version:V1},calls=0;
  const f=fixture({load:async()=>remote,save:async(payload)=>{calls++;remote={payload,version:V2};throw Object.assign(Error('lost response'),{code:'offline'})}});
  await f.sync.open(json(100));f.sync.queue(json(90));await f.sync.flush();assert.equal(await f.sync.recover(),true);
  assert.equal(calls,1);assert.equal(f.sync.confirmedPayload,json(90));assert.deepEqual(f.restores,[{payload:json(90),reason:'recovered'}]);
});
test('automatic conflict recovery adopts newer cloud progress and never overwrites another session',async()=>{
  let remote={payload:json(100),version:V1},calls=0;
  const f=fixture({load:async()=>remote,save:async()=>{calls++;remote={payload:json(777),version:V2};throw Object.assign(Error('conflict'),{code:'conflict'})}});
  await f.sync.open(json(100));f.sync.queue(json(90));await f.sync.flush();assert.equal(await f.sync.recover(),true);
  assert.equal(calls,1);assert.equal(f.sync.confirmedPayload,json(777));assert.equal(f.sync.pending,false);
  assert.deepEqual(f.restores,[{payload:json(777),reason:'conflict'}]);
});
test('a newer version with coincidentally identical data is authoritative, not proof of our commit',async()=>{
  let remote={payload:json(100),version:V1},calls=0;
  const f=fixture({load:async()=>remote,save:async()=>{calls++;remote={payload:json(90),version:{revision:4,updateTime:'2026-10-30T12:00:04.000004Z'}};throw Object.assign(Error('offline'),{code:'offline'})}});
  await f.sync.open(json(100));f.sync.queue(json(90));await f.sync.flush();await f.sync.recover();
  assert.equal(calls,1);assert.deepEqual(f.restores,[{payload:json(90),reason:'conflict'}]);
});
test('unavailable reads use bounded backoff, keep memory only, and never create a replacement island',async()=>{
  let reads=0,writes=0;
  const f=fixture({load:async()=>{if(++reads===1)return{payload:json(100),version:V1};throw Object.assign(Error('offline'),{code:'offline'})},save:async()=>{writes++;throw Object.assign(Error('offline'),{code:'offline'})}});
  await f.sync.open(json(100));f.sync.queue(json(90));await f.sync.flush();
  for(let i=0;i<5;i++)assert.equal(await f.sync.recover(),false);
  assert.deepEqual(f.delays.slice(1),[5000,10000,20000,30000,30000,30000]);assert.equal(writes,1);
  assert.equal(f.sync.confirmedPayload,json(100));assert.equal(f.sync.pending,true);
  f.sync.dispose();assert.equal(f.timers.size,0);
});
test('an island disappearing during recovery is blocked instead of silently starting again',async()=>{
  let reads=0;
  const f=fixture({load:async()=>++reads===1?{payload:json(777),version:V1}:null,save:async()=>{throw Object.assign(Error('offline'),{code:'offline'})}});
  await f.sync.open(json(100));f.sync.queue(json(700));await f.sync.flush();assert.equal(await f.sync.recover(),false);
  assert.equal(f.sync.status,'missing-save');assert.equal(f.sync.confirmedPayload,json(777));assert.equal(f.sync.writable,false);assert.equal(f.timers.size,0);
});
test('a definitive permission failure is not automatically retried as a transient outage',async()=>{
  const f=fixture({save:async()=>{throw Object.assign(Error('permission'),{code:'permission'})}});
  await f.sync.open(json(100));f.sync.queue(json(90));await f.sync.flush();assert.equal(await f.sync.recover(),false);
  assert.equal(f.sync.status,'permission');assert.equal(f.timers.size,0);assert.equal(f.sync.writable,false);
});

test('a concurrent activity failure remains recoverable when an in-flight save succeeds',async()=>{
  let release;let remote={payload:json(100),version:V1};
  const f=fixture({load:async()=>remote,save:async payload=>{await new Promise(resolve=>release=resolve);remote={payload,version:V2};return V2}});
  await f.sync.open(json(100));f.sync.queue(json(90));const writing=f.sync.flush();await Promise.resolve();
  f.sync.pause('offline');release();assert.equal(await writing,false);
  assert.equal(f.sync.status,'offline');assert.equal(f.sync.writable,false);
  assert.equal(await f.sync.recover(),true);assert.equal(f.sync.status,'saved');assert.equal(f.sync.writable,true);
  assert.deepEqual(f.restores,[{payload:json(90),reason:'recovered'}]);
});

test('signing out while a cloud save is in flight cannot restore or reopen the disposed UI',async()=>{
  let release;
  const f=fixture({save:async()=>{await new Promise(resolve=>release=resolve);return V2}});
  await f.sync.open(json(100));f.sync.queue(json(90));const writing=f.sync.flush();await Promise.resolve();
  f.sync.dispose();release();assert.equal(await writing,false);assert.equal(f.sync.writable,false);
  assert.equal(await f.sync.recover(),false);assert.equal(f.restores.length,0);
});
