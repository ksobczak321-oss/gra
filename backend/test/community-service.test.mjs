import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommunityService } from '../community-service.mjs';
import { createLeagueChallenge, emptyLeagueProgress, applyLeagueAction, leagueTeamScore, leagueCalendar } from '../../harborlight-v1-league.js';
const START = Date.parse('2026-11-10T18:00:00Z');
class Store {
  records = new Map(); tail = Promise.resolve();
  runTransaction(work) {
    const promise = this.tail.then(async () => { const draft = new Map([...this.records].map(([k,v]) => [k,structuredClone(v)])); let wrote = false;
      const result = await work({ get: async k => { assert.equal(wrote,false,'Firestore reads precede writes'); return structuredClone(draft.get(k)); }, set: async(k,v) => { wrote = true; draft.set(k,structuredClone(v)); } }); this.records = draft; return result; });
    this.tail = promise.catch(()=>{}); return promise;
  }
}
async function fixture() { const store = new Store(); let at = START, n = 0; const service = createCommunityService({ store, now:()=>at, environment:'dev' });
  const call = (uid,command,data={}) => service.dispatch({ uid,command,requestId:'request_'+String(++n).padStart(8,'0'),...data });
  for (const uid of ['one','two','three','four','five','six']) await call(uid,'profile',{name:'Wyspa '+uid});
  const ids = Object.fromEntries((await service.snapshot({uid:'one'})).players.map(p=>[p.name.slice(6),p.id])); ids.one = (await service.snapshot({uid:'one'})).self.id;
  return { store, service, call, ids, time:v=>{at=v;}, advance:v=>{at+=v;} };
}
const rejects = (promise,code) => assert.rejects(promise,e=>e.code===code);
async function ally(f,uid='one') { return (await f.call(uid,'allianceCreate',{name:'Załoga '+uid})).alliance; }
async function join(f,id,uid='two',captain='one') { await f.call(uid,'allianceApply',{allianceId:id}); return f.call(captain,'allianceApprove',{playerId:f.ids[uid]}); }

test('create, apply, approve and immediate leave preserve one membership and transfer captain',async()=>{
  const f = await fixture(), a = await ally(f); await join(f,a.id);
  await rejects(f.call('two','allianceCreate',{name:'Druga'}),'community-already-allied');
  await rejects(f.call('two','allianceCaptain',{playerId:f.ids.two}),'community-captain-required');
  await f.call('one','allianceLeave'); const snap=await f.service.snapshot({uid:'two'});
  assert.equal(snap.alliance.captainId,f.ids.two); assert.equal(snap.alliance.members.length,1); assert.equal((await f.service.snapshot({uid:'one'})).alliance,null);
});

test('membership and private conversation authorization are rechecked on every operation',async()=>{
  const f=await fixture(),a=await ally(f); await join(f,a.id);
  await f.call('one','chatSend',{channel:'alliance',text:'Tajna trasa'});
  await rejects(f.call('three','chatRead',{channel:'alliance',targetId:a.id}),'community-chat-forbidden');
  await f.call('two','allianceLeave'); await rejects(f.call('two','chatRead',{channel:'alliance',targetId:a.id}),'community-chat-forbidden');
  await f.call('one','chatSend',{channel:'direct',targetId:f.ids.two,text:'Tylko my'});
  assert.equal((await f.call('two','chatRead',{channel:'direct',targetId:f.ids.one})).messages[0].text,'Tylko my');
  assert.equal((await f.call('three','chatRead',{channel:'direct',targetId:f.ids.one})).messages.length,0);
});

test('chat uses plain text, opaque handles, idempotency and a server enforced send rate',async()=>{
  const f=await fixture(); const first=await f.call('one','chatSend',{requestId:'same_request_123',channel:'direct',targetId:f.ids.two,text:'<img src=x onerror=alert(1)>'});
  const again=await f.call('one','chatSend',{requestId:'same_request_123',channel:'direct',targetId:f.ids.two,text:'<img src=x onerror=alert(1)>'});
  assert.equal(again.alreadyApplied,true); assert.equal(again.message.id,first.message.id);
  assert.equal((await f.call('two','chatRead',{channel:'direct',targetId:f.ids.one})).messages.length,1);
  for(let i=0;i<4;i++) await f.call('one','chatSend',{channel:'direct',targetId:f.ids.two,text:'wiadomość '+i});
  await rejects(f.call('one','chatSend',{channel:'direct',targetId:f.ids.two,text:'szósta'}),'community-chat-rate-limited');
  f.advance(10001); await f.call('one','chatSend',{channel:'direct',targetId:f.ids.two,text:'po przerwie'});
  assert.equal(JSON.stringify(await f.service.snapshot({uid:'one'})).includes('"uid"'),false);
});

test('blocking applies in both directions and reports retain only a visible message',async()=>{
  const f=await fixture(), sent=await f.call('one','chatSend',{channel:'direct',targetId:f.ids.two,text:'Hej'});
  await rejects(f.call('three','chatReport',{channel:'direct',targetId:f.ids.one,messageId:sent.message.id}),'community-message-not-found');
  await f.call('two','chatReport',{channel:'direct',targetId:f.ids.one,messageId:sent.message.id,reason:'Spam'});
  assert.equal([...f.store.records.keys()].filter(k=>k.startsWith('communityReports/')).length,1);
  await f.call('two','playerBlock',{playerId:f.ids.one}); await rejects(f.call('one','chatSend',{channel:'direct',targetId:f.ids.two,text:'Nie'}),'community-player-blocked');
  await rejects(f.call('two','chatRead',{channel:'direct',targetId:f.ids.one}),'community-player-blocked');
});

test('thirty day chat visibility is filtered even before a configured storage TTL purge',async()=>{
  const f=await fixture(); await f.call('one','chatSend',{channel:'direct',targetId:f.ids.two,text:'Stare'}); f.advance(30*86400000+1);
  assert.equal((await f.call('two','chatRead',{channel:'direct',targetId:f.ids.one})).messages.length,0);
});

test('five member capacity and simultaneous captain approval cannot overfill an alliance',async()=>{
  const f=await fixture(),a=await ally(f); for(const uid of ['two','three','four']) await join(f,a.id,uid);
  for(const uid of ['five','six']) await f.call(uid,'allianceApply',{allianceId:a.id});
  const result=await Promise.allSettled(['five','six'].map(uid=>f.call('one','allianceApprove',{playerId:f.ids[uid]})));
  assert.equal(result.filter(x=>x.status==='fulfilled').length,1); assert.equal((await f.service.snapshot({uid:'one'})).alliance.members.length,5);
});

test('Warsaw slots use local wall clock across summer/winter and league formula retains inactive zeros',()=>{
  assert.equal(leagueCalendar(Date.parse('2026-06-15T17:00:00Z')).slot,'arcade');
  assert.equal(leagueCalendar(Date.parse('2026-11-15T18:00:00Z')).slot,'arcade');
  assert.equal(leagueCalendar(Date.parse('2026-11-15T19:00:00Z')).slot,'logic');
  assert.equal(leagueCalendar(Date.parse('2026-11-15T20:00:00Z')).slot,null);
  assert.equal(leagueTeamScore([80,80,80,80,80]),88); assert.equal(leagueTeamScore([95,0,0,0,0]),19); assert.equal(leagueTeamScore([95]),95);
});

test('frozen roster keeps the denominator after a member leaves and invalidates an in-flight attempt',async()=>{
  const f=await fixture(),a=await ally(f); await join(f,a.id); await f.call('one','leagueEnroll');
  f.time(Date.parse('2026-11-15T19:00:00Z')); const attempt=await f.call('two','attemptStart',{kind:'logic'});
  await f.call('two','allianceLeave');
  await rejects(f.call('two','attemptAction',{attemptId:attempt.attemptId,sequence:0,action:{type:'load',batch:0}}),'league-membership-changed');
  const table=await f.call('one','leagueRead'); assert.equal(table.groups[0][0].roster.length,2);
});

test('ranked slots and two attempt quota are server controlled; practice works without an alliance',async()=>{
  const f=await fixture(); await rejects(f.call('one','attemptStart',{kind:'logic'}),'league-slot-closed');
  const practice=await f.call('three','attemptStart',{kind:'logic',day:4,practice:true}); assert.equal(practice.practice,true);
  await ally(f); await f.call('one','leagueEnroll'); f.time(Date.parse('2026-11-15T18:00:00Z'));
  await f.call('one','attemptStart',{kind:'arcade'}); await f.call('one','attemptStart',{kind:'arcade'});
  await rejects(f.call('one','attemptStart',{kind:'arcade'}),'league-attempt-limit');
});

test('a submitted score/verified flag cannot create points and duplicate action replay cannot duplicate goals',async()=>{
  const f=await fixture(),a=await f.call('one','attemptStart',{kind:'logic',day:1,practice:true});
  f.advance(1001); const empty=await f.call('one','attemptFinish',{attemptId:a.attemptId,score:100,verified:true}); assert.equal(empty.score,0);
  const b=await f.call('one','attemptStart',{kind:'logic',day:1,practice:true});
  await f.call('one','attemptAction',{attemptId:b.attemptId,sequence:0,action:{type:'load',batch:0}});
  await rejects(f.call('one','attemptAction',{attemptId:b.attemptId,sequence:0,action:{type:'load',batch:1}}),'league-action-conflict');
  await f.call('one','attemptAction',{attemptId:b.attemptId,sequence:1,action:{type:'deliver',batch:0,destination:'A'}});
  f.advance(1001); const done=await f.call('one','attemptFinish',{attemptId:b.attemptId}); assert.equal(done.score,16);
});

test('five convoy goals require actual load/delivery transitions and prevent boat overfill',()=>{
  const c=createLeagueChallenge({day:1}),p=emptyLeagueProgress();
  let r=applyLeagueAction(c,p,{type:'deliver',batch:0,destination:'A'},0); assert.equal(r.accepted,false);
  r=applyLeagueAction(c,p,{type:'load',batch:0},0); r=applyLeagueAction(c,r.progress,{type:'load',batch:1},0);
  assert.equal(applyLeagueAction(c,r.progress,{type:'load',batch:2},0).accepted,false);
  assert.equal(applyLeagueAction(c,r.progress,{type:'deliver',batch:0,destination:'B'},0).accepted,false);
});

test('arcade scoring requires a currently visible target and ignores replay or future targets',()=>{
  const c=createLeagueChallenge({day:1,kind:'arcade',seed:1}),p=emptyLeagueProgress();
  assert.equal(applyLeagueAction(c,p,{type:'catch',targetId:20},0).accepted,false);
  const r=applyLeagueAction(c,p,{type:'catch',targetId:0},500); assert.equal(r.accepted,true);
  assert.equal(applyLeagueAction(c,r.progress,{type:'catch',targetId:0},600).accepted,false);
  assert.equal(applyLeagueAction(c,p,{type:'catch',targetId:0},3000).accepted,false);
});

test('pre-season leave releases a registration; after day15 roster changes cannot erase a slot',async()=>{
  const f=await fixture(),a=await ally(f);await join(f,a.id);await f.call('one','leagueEnroll');
  await f.call('two','allianceLeave');await ally(f,'two');await f.call('two','leagueEnroll');
  const own=await f.call('two','leagueRead');assert.equal(own.ownTeamId,(await f.service.snapshot({uid:'two'})).alliance.id);
  const previous=own.groups.flat().find(t=>t.id===a.id);assert.equal(previous.roster.length,1);
});

test('server-owned attempt can be recovered after closing the browser panel',async()=>{
  const f=await fixture(),a=await f.call('one','attemptStart',{kind:'logic',day:1,practice:true});
  assert.equal((await f.service.snapshot({uid:'one'})).activeAttempt.attemptId,a.attemptId);
  f.advance(1001);await f.call('one','attemptFinish',{attemptId:a.attemptId});assert.equal((await f.service.snapshot({uid:'one'})).activeAttempt,null);
});

test('numbered constellation rejects a backwards hit while allowing skipped earlier lights',()=>{
  const c=createLeagueChallenge({day:7,kind:'arcade',seed:1}),p=emptyLeagueProgress();
  const r=applyLeagueAction(c,p,{type:'catch',targetId:1},1300);assert.equal(r.progress.hits.length,1);
  const backwards=applyLeagueAction(c,r.progress,{type:'catch',targetId:0},1400);assert.equal(backwards.progress.hits.length,1);assert.equal(backwards.reason,'wrong-sequence');
});

test('late-slot attempt exposes the true deadline and can settle accepted goals after closing, without new gameplay',async()=>{
  const f=await fixture();await ally(f);await f.call('one','leagueEnroll');f.time(Date.parse('2026-11-15T19:59:50Z'));
  const a=await f.call('one','attemptStart',{kind:'logic'});assert.equal(a.deadlineAt-a.startedAt,10000);
  await f.call('one','attemptAction',{attemptId:a.attemptId,sequence:0,action:{type:'load',batch:0}});
  f.advance(1001);await f.call('one','attemptAction',{attemptId:a.attemptId,sequence:1,action:{type:'deliver',batch:0,destination:'A'}});
  f.advance(10000);await rejects(f.call('one','attemptAction',{attemptId:a.attemptId,sequence:2,action:{type:'load',batch:1}}),'league-slot-closed');
  const result=await f.call('one','attemptFinish',{attemptId:a.attemptId});assert.equal(result.score,16);
  assert.equal((await f.call('one','leagueRead')).groups[0][0].rounds[0],8,'missing arcade remains zero in the daily average');
});
