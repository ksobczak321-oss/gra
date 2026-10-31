import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommunityClient, createLocalCommunityClient } from '../harborlight-v1-community-client.js';
import { createCommunityPanel } from '../harborlight-v1-community-ui.js';

test('community UI imports without side effects and an authenticated transport acknowledges each command',async()=>{
  assert.equal(typeof createCommunityPanel,'function');const sent=[];
  const client=createCommunityClient({load:async()=>({self:{id:'self'}}),send:async body=>{sent.push(body);return{accepted:true};}});
  assert.deepEqual(await client.snapshot(),{self:{id:'self'}});
  assert.deepEqual(await client.request('chatSend',{channel:'direct',text:'tekst'}),{accepted:true});
  assert.equal(sent[0].command,'chatSend');assert.match(sent[0].requestId,/^[A-Za-z0-9_-]{8,100}$/);assert.equal(client.simulation,false);
});

test('a network rejection is preserved rather than reported as a sent chat message',async()=>{
  const failure=Object.assign(new Error('offline'),{code:'offline'});
  const client=createCommunityClient({load:async()=>({}),send:async()=>{throw failure;}});
  await assert.rejects(client.request('chatSend',{text:'niewysłane'}),e=>e===failure);
});

test('volatile demo identities need an actual application and captain approval, then share a real in-memory conversation',async()=>{
  const client=createLocalCommunityClient();assert.equal(client.simulation,true);
  await client.request('allianceApply',{allianceId:'demo_alliance'});assert.equal((await client.snapshot()).alliance,null);
  client.setIdentity('demo_2');await client.request('allianceApprove',{playerId:'demo_1'});
  client.setIdentity('demo_1');assert.equal((await client.snapshot()).alliance.members.length,3);
  await client.request('chatSend',{channel:'direct',targetId:'demo_3',text:'Sygnał latarni'});
  client.setIdentity('demo_3');assert.equal((await client.request('chatRead',{channel:'direct',targetId:'demo_1'})).messages[0].text,'Sygnał latarni');
  const another=createLocalCommunityClient();assert.equal((await another.request('chatRead',{channel:'direct',targetId:'demo_3'})).messages.length,0,'fresh preview never recovers browser-cached messages');
});

test('demo training also ignores a caller supplied score and has no ranked rewards',async()=>{
  const client=createLocalCommunityClient(),a=await client.request('attemptStart',{kind:'logic',day:1,practice:true});
  await client.request('attemptAction',{attemptId:a.attemptId,sequence:0,action:{type:'load',batch:0}});
  await client.request('attemptAction',{attemptId:a.attemptId,sequence:1,action:{type:'deliver',batch:0,destination:'A'}});
  const done=await client.request('attemptFinish',{attemptId:a.attemptId,score:100,verified:true});assert.equal(done.score,16);
  await assert.rejects(client.request('attemptStart',{kind:'arcade',practice:false}),e=>e.code==='league-demo-practice-only');
});

test('an uncertain write retry reuses its receipt ID instead of duplicating a message or scored action',async()=>{
  const bodies=[];let calls=0;const client=createCommunityClient({load:async()=>({}),send:async body=>{bodies.push(body);if(calls++===0)throw new TypeError('connection lost after commit');return{alreadyApplied:true};}});
  await assert.rejects(client.request('chatSend',{text:'Czekam w porcie'}));
  assert.deepEqual(await client.request('chatSend',{text:'Czekam w porcie'}),{alreadyApplied:true});
  assert.equal(bodies[0].requestId,bodies[1].requestId);
});
