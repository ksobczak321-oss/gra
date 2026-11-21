import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdvisorDevelopmentClient} from '../harborlight-v1-advisor-development-client.js';
import {createState,synchronizeResidents,freeWorkers} from '../harborlight-v1-state.js';
import {advisorDevelopmentPlan} from '../harborlight-v1-advisor-development-plan.js';

const flush = async () => {for(let n=0;n<8;n++)await Promise.resolve();};
const observe = promise => promise.then(value=>({ok:true,value}),error=>({ok:false,error}));
class MonotonicClock {
  time=0;sequence=0;timers=new Map();
  now=()=>this.time;
  setTimer=(fn,ms)=>{const id=++this.sequence;this.timers.set(id,{at:this.time+Math.max(0,Number(ms)||0),fn});return id;};
  clearTimer=id=>{this.timers.delete(id);};
  async advance(ms){
    const end=this.time+ms;let iterations=0;
    for(;;){
      const due=[...this.timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
      if(!due)break;
      assert.ok(++iterations<1000,'Unexpected zero-delay timer loop');
      this.time=due[1].at;this.timers.delete(due[0]);due[1].fn();await flush();
    }
    this.time=end;await flush();
  }
}
class FakeWorker {
  terminated=false;messages=[];listeners=new Map();
  constructor(pool){this.pool=pool;}
  postMessage(value){assert.equal(this.terminated,false,'Cannot post to a terminated Worker');this.messages.push(structuredClone(value));}
  addEventListener(type,listener){const listeners=this.listeners.get(type)||new Set();listeners.add(listener);this.listeners.set(type,listeners);}
  removeEventListener(type,listener){this.listeners.get(type)?.delete(listener);}
  terminate(){this.terminated=true;}
  emit(type,data){const event=type==='message'?{data}:{message:'Worker crashed',preventDefault(){}};this['on'+type]?.(event);for(const listener of [...(this.listeners.get(type)||[])])listener(event);}
}
function fixture(){
  const ids=['townhall','house','farm','lumber','quarry','windmill','sawmill','warehouse','bakery','dairy','slaughterhouse','fisher','leatherworks','academy','barracks','chapel','lighthouse','theatre','market','dock'];
  return {ruleset:32,worldTimeMs:1000,lastSimulatedAt:1000,population:0,islandId:'island-1',islandRole:'primary',happiness:20,
    resources:{coins:1000,wood:100,stone:100,grain:100,food:100,planks:100},bonusMaterials:{},residents:[],
    buildings:Object.fromEntries(ids.map(id=>[id,{level:id==='townhall'||id==='warehouse'?5:1,workers:0,ready:0,workProgress:[]}])) ,
    constructionProjects:[],premiumServices:[],premium:{expiresAt:0},starterTurbo:{},
    provisions:{version:1,clockMs:1000,people:{},requiredTypes:2,assignments:{},localStock:{},productionProgress:{},routeAssignments:{},legacyCrewAllowances:{},foodSettings:{priorities:[],enabled:{},limits:{}}},
    education:{version:1,people:{},courses:[],researches:[],researchLevels:{},discoveries:{},routes:{}},
    military:{version:1,people:{},courses:[],squads:[]},market:{orders:[],stock:{},locked:[],lots:[]},dock:{orders:[],stock:{},lots:[]},
    haulTrips:{warehouse:[],market:[],dock:[]},warehousePriorities:[],transportPriority:[],logisticsPriority:[],roads:{segments:[]},
    engagement:{activeUntil:0,lastRealActivityAt:1000,firstAnchorAt:1000},worldEvents:{clockMs:1000,effects:[]}};
}
function harness(t,options={}){
  const clock=new MonotonicClock(),workers=[],state=fixture(),context={uid:'dev-admin3',generation:2,activeIslandId:'island-1',epoch:1};
  let peakWorkers=0;
  const client=createAdvisorDevelopmentClient({getState:()=>state,getContext:()=>({...context}),now:clock.now,setTimer:clock.setTimer,clearTimer:clock.clearTimer,
    workerFactory:()=>{const worker=new FakeWorker(workers);workers.push(worker);peakWorkers=Math.max(peakWorkers,workers.filter(row=>!row.terminated).length);return worker;},
    ...options});
  t.after(()=>client.dispose());
  const jobs=()=>workers.flatMap(worker=>worker.messages.map(message=>({worker,message})));
  const reply=(job,plan=answer('answer'),changes={})=>job.worker.emit('message',{protocol:1,type:'complete',id:job.message.id,contextKey:job.message.contextKey,requestRevision:job.message.requestRevision,plan,...changes});
  return {client,clock,workers,state,context,jobs,reply,peak:()=>peakWorkers};
}
function answer(label){return {kind:'suggestion',title:label,text:label,goal:'dock',tasks:[{text:'Sprawdź Port.',target:'dock'}],estimate:{seconds:null,text:'Brak wiarygodnego ETA.'},limitations:[]};}

test('explicit start runs immediately once and publishes a completed worker plan',async t=>{
  const h=harness(t);assert.equal(h.client.getPlan(),null);assert.equal(h.client.getStatus().phase,'idle');assert.equal(h.jobs().length,0);
  h.client.start();h.client.start();assert.equal(h.jobs().length,1);
  const job=h.jobs()[0];assert.equal(job.message.protocol,1);assert.equal(job.message.type,'plan');assert.equal(h.client.getStatus().phase,'computing');
  assert.ok(job.message.snapshot);h.reply(job,answer('first'));await flush();
  assert.equal(h.client.getPlan().title,'first');assert.equal(h.client.getStatus().phase,'ready');assert.equal(h.client.getStatus().computedAt,0);assert.equal(h.client.getStatus().nextRunAt,120000);
});

test('120 seconds is monotonic real time despite 1x/2x/6x world-clock changes',async t=>{
  const h=harness(t);h.client.start();h.reply(h.jobs()[0]);await flush();
  for(const rate of [1,2,6]){h.state.worldTimeMs+=rate*3600000;h.state.clockRate=rate;await h.clock.advance(39999);}
  assert.equal(h.jobs().length,1,'Changes in simulated time cannot cause a planning job');
  await h.clock.advance(3);assert.equal(h.jobs().length,2);assert.equal(h.client.getStatus().phase,'computing');
  assert.equal(h.jobs()[1].message.snapshot.worldTimeMs,h.state.worldTimeMs);
  h.reply(h.jobs()[1],answer('periodic'));await flush();assert.equal(h.client.getPlan().computedAt,120000);
  assert.equal(h.peak(),1);
});

test('manual request runs without start and forwards the fresh input/options',async t=>{
  const h=harness(t),result=observe(h.client.request({input:'Rozbuduj Port',options:{language:'pl',goal:'dock',alternative:true}}));
  const job=h.jobs()[0];assert.equal(job.message.request.input,'Rozbuduj Port');
  assert.deepEqual(job.message.request.options,{language:'pl',goal:'dock',alternative:true});
  h.reply(job,answer('manual'));assert.equal((await result).value.title,'manual');
  await h.clock.advance(120000);assert.equal(h.jobs().length,1,'Manual-only use does not start an automatic interval');
});

test('one active job keeps only the latest waiting goal and never publishes the displaced result',async t=>{
  const h=harness(t),seen=[];h.client.subscribe(plan=>{if(plan)seen.push(plan.title);});
  const a=observe(h.client.request({input:'A'})),b=observe(h.client.request({input:'B'})),c=observe(h.client.request({input:'C'}));
  assert.equal(h.jobs().length,1);assert.equal((await b).error.code,'advisor-superseded');
  h.reply(h.jobs()[0],answer('stale A'));await flush();
  assert.equal((await a).error.name,'AbortError');assert.equal(h.jobs().length,2);assert.equal(h.jobs()[1].message.request.input,'C');assert.equal(h.client.getPlan(),null);
  h.reply(h.jobs()[1],answer('fresh C'));assert.equal((await c).value.title,'fresh C');assert.deepEqual(seen,['fresh C']);assert.equal(h.peak(),1);
});

for(const field of ['uid','generation','activeIslandId','epoch'])test(`a changed ${field} prevents an in-flight result crossing identity`,async t=>{
  const h=harness(t);h.client.start();h.reply(h.jobs()[0],answer('previous identity'));await flush();
  const old=observe(h.client.request({input:'Port'}));const previous=h.jobs().at(-1);
  h.context[field]=field==='generation'||field==='epoch'?7:'changed';
  const current=observe(h.client.updateContext());h.reply(previous,answer('wrong account/island'));await flush();
  assert.equal((await old).error.code,'advisor-superseded');assert.equal(h.client.getPlan(),null);
  const next=h.jobs().at(-1);assert.notEqual(next.message.contextKey,previous.message.contextKey);
  h.reply(next,answer('current identity'));assert.equal((await current).value.title,'current identity');
  h.reply(previous,answer('late stale response'));await flush();assert.equal(h.client.getPlan().title,'current identity');assert.equal(h.peak(),1);
});

test('an unknown response id is ignored without finishing the current job',async t=>{
  const h=harness(t),result=observe(h.client.request());const job=h.jobs()[0];
  h.reply(job,answer('wrong id'),{id:job.message.id+100});await flush();assert.equal(h.client.getPlan(),null);assert.equal(h.client.getStatus().phase,'computing');
  h.reply(job,answer('correct id'));assert.equal((await result).value.title,'correct id');
});

for(const changes of [{protocol:0},{contextKey:'wrong-context'},{requestRevision:-1},{type:'complete',plan:null}])test(`invalid worker envelope is rejected: ${JSON.stringify(changes)}`,async t=>{
  const h=harness(t),result=observe(h.client.request());const job=h.jobs()[0];h.reply(job,answer('invalid'),changes);
  assert.equal((await result).error.code,'advisor-invalid-response');assert.equal(h.client.getPlan(),null);assert.equal(h.client.getStatus().phase,'error');assert.equal(job.worker.terminated,true);
});

test('timeout keeps the last successful plan, rejects the manual request, and terminates the worker',async t=>{
  const h=harness(t),first=observe(h.client.request());h.reply(h.jobs()[0],answer('preserved'));await first;
  const result=observe(h.client.request({input:'Drugi cel'}));const worker=h.jobs().at(-1).worker;
  await h.clock.advance(4999);assert.equal(worker.terminated,false);assert.equal(h.client.getStatus().phase,'computing');
  await h.clock.advance(1);assert.equal((await result).error.code,'advisor-timeout');assert.equal(worker.terminated,true);
  assert.equal(h.client.getPlan().title,'preserved');assert.equal(h.client.getStatus().reason,'advisor-timeout');assert.equal(h.client.getStatus().phase,'error');
  const retry=observe(h.client.request());h.reply(h.jobs().at(-1),answer('recovered'));assert.equal((await retry).value.title,'recovered');assert.equal(h.peak(),1);
});

for(const kind of ['error','messageerror','worker-plan-error'])test(`worker ${kind} keeps the last plan and never falls back synchronously`,async t=>{
  const h=harness(t),first=observe(h.client.request());h.reply(h.jobs()[0],answer('last valid'));await first;
  const result=observe(h.client.request()),job=h.jobs().at(-1);
  if(kind==='worker-plan-error')h.reply(job,null,{type:'error'});else job.worker.emit(kind);
  assert.equal((await result).ok,false);assert.equal(h.client.getPlan().title,'last valid');assert.equal(h.client.getStatus().phase,'error');assert.equal(job.worker.terminated,true);
  assert.equal(h.jobs().length,2,'No synchronous model or extra planning request is substituted');
});

for(const eventType of ['error','messageerror'])test(`a terminated worker cannot fail a newer replacement through a late ${eventType} event`,async t=>{
  const h=harness(t),old=observe(h.client.request());const dead=h.jobs()[0].worker;await h.clock.advance(5000);await old;
  const result=observe(h.client.request({input:'nowy cel'})),current=h.jobs().at(-1);assert.notEqual(current.worker,dead);
  dead.emit(eventType);await flush();assert.equal(current.worker.terminated,false);assert.equal(h.client.getStatus().phase,'computing');
  h.reply(current,answer('new worker'));assert.equal((await result).value.title,'new worker');
});

test('worker construction failure is reported without a model fallback',async t=>{
  let creations=0;const h=harness(t,{workerFactory:()=>{creations++;throw Error('Worker unavailable');}});
  const result=await observe(h.client.request());assert.equal(result.error.code,'advisor-worker-unavailable');assert.equal(h.client.getPlan(),null);assert.equal(h.client.getStatus().phase,'error');assert.equal(creations,1);assert.equal(h.clock.timers.size,0);
});

test('subscribers receive fresh status copies, can unsubscribe, and cannot break scheduling',async t=>{
  const h=harness(t),notifications=[];h.client.subscribe(()=>{throw Error('Subscriber failure');});
  const unsubscribe=h.client.subscribe((plan,status)=>{notifications.push({title:plan?.title,phase:status.phase});status.phase='corrupted';});
  const result=observe(h.client.request());assert.equal(h.client.getStatus().phase,'computing');h.reply(h.jobs()[0],answer('broadcast'));await result;
  assert.ok(notifications.some(row=>row.title==='broadcast'&&row.phase==='ready'));assert.equal(h.client.getStatus().phase,'ready');
  const count=notifications.length;unsubscribe();const next=observe(h.client.request());h.reply(h.jobs().at(-1));await next;assert.equal(notifications.length,count);
});

test('dispose terminates work, rejects active/pending requests, clears timers and ignores late events',async t=>{
  const h=harness(t),a=observe(h.client.request({input:'active'})),b=observe(h.client.request({input:'pending'}));const job=h.jobs()[0];
  h.client.dispose();assert.equal((await a).error.code,'advisor-disposed');assert.equal((await b).error.code,'advisor-disposed');assert.equal(job.worker.terminated,true);assert.equal(h.clock.timers.size,0);
  h.reply(job,answer('too late'));job.worker.emit('error');await h.clock.advance(240000);
  assert.equal(h.client.getPlan(),null);assert.equal(h.jobs().length,1);assert.equal((await observe(h.client.request())).error.code,'advisor-disposed');
});


test('automatic timeout retries on the next real interval without an eager retry loop',async t=>{
  const h=harness(t);h.client.start();await h.clock.advance(5000);
  assert.equal(h.client.getStatus().phase,'error');assert.equal(h.jobs().length,1);assert.equal(h.workers[0].terminated,true);
  await h.clock.advance(114999);assert.equal(h.jobs().length,1);
  await h.clock.advance(1);assert.equal(h.jobs().length,2);h.reply(h.jobs()[1],answer('interval retry'));await flush();
  assert.equal(h.client.getPlan().title,'interval retry');assert.equal(h.client.getStatus().nextRunAt,240000);assert.equal(h.peak(),1);
});

test('visibility resumes an overdue interval once and dispose removes its listener',async t=>{
  const visibilityTarget=new EventTarget();visibilityTarget.visibilityState='hidden';
  const h=harness(t,{visibilityTarget});h.client.start();h.reply(h.jobs()[0]);await flush();
  // Model background timer suspension: real time moves, scheduled tasks have not fired.
  h.clock.time=121000;visibilityTarget.dispatchEvent(new Event('visibilitychange'));assert.equal(h.jobs().length,1);
  visibilityTarget.visibilityState='visible';visibilityTarget.dispatchEvent(new Event('visibilitychange'));assert.equal(h.jobs().length,2);
  h.reply(h.jobs()[1],answer('visible again'));await flush();await h.clock.advance(0);assert.equal(h.jobs().length,2);
  assert.equal(h.client.getStatus().nextRunAt,241000);h.client.dispose();h.clock.time=300000;
  visibilityTarget.dispatchEvent(new Event('visibilitychange'));assert.equal(h.jobs().length,2);assert.equal(h.clock.timers.size,0);
});

test('start uses the current language and translating the same identity preserves its tracked goal',async t=>{
  let language='en';const h=harness(t,{getLanguage:()=>language});h.client.start();
  assert.equal(h.jobs()[0].message.request.options.language,'en');
  h.reply(h.jobs()[0],{...answer('Port goal EN'),tracking:{goal:'dock',targetLevel:3,language:'en'}});await flush();
  const identity=h.jobs()[0].message.contextKey;language='pl';const translated=observe(h.client.updateContext());
  const job=h.jobs().at(-1);assert.equal(job.message.contextKey,identity);assert.equal(job.message.request.options.language,'pl');
  assert.equal(job.message.request.options.goal,'dock');assert.equal(job.message.request.options.targetLevel,3);
  h.reply(job,{...answer('Cel Port PL'),tracking:{goal:'dock',targetLevel:3,language:'pl'}});
  assert.equal((await translated).value.title,'Cel Port PL');assert.equal(h.client.getPlan().title,'Cel Port PL');
});

test('an explicit context key ignores autosave revisions and clears cached output immediately on identity change',async t=>{
  let key='admin3:g2:island1:epoch1';const h=harness(t,{getContextKey:()=>key});h.context.revision=10;
  h.client.start();h.reply(h.jobs()[0],answer('cached island'));await flush();
  h.context.revision=11;await h.client.updateContext();assert.equal(h.jobs().length,1);assert.equal(h.client.getPlan().title,'cached island');
  key='admin3:g2:island2:epoch2';const changed=observe(h.client.updateContext());
  assert.equal(h.client.getPlan(),null,'Foreign-island output must disappear before its replacement completes');
  assert.equal(h.client.getStatus().computedAt,null);assert.equal(h.jobs().at(-1).message.contextKey,key);
  h.reply(h.jobs().at(-1),answer('new island'));assert.equal((await changed).value.title,'new island');assert.equal(h.client.getPlan().title,'new island');
});

test('an unready identity clears cached advice and never snapshots or schedules until ready again',async t=>{
  let ready=true,key='admin3:g2:island1:epoch1',snapshotReads=0;const source=fixture();
  const h=harness(t,{getState:()=>{snapshotReads++;return source;},isReady:()=>ready,getContextKey:()=>key});
  h.client.start();h.reply(h.jobs()[0],answer('previous account'));await flush();assert.equal(snapshotReads,1);
  ready=false;key='signed-out:epoch2';assert.equal(await h.client.updateContext(),null);
  assert.equal(h.client.getPlan(),null);assert.equal(h.client.getStatus().phase,'idle');assert.equal(h.client.getStatus().computedAt,null);
  assert.equal(h.client.getStatus().nextRunAt,null);assert.equal(h.workers[0].terminated,true);assert.equal(h.jobs().length,1);assert.equal(snapshotReads,1);
  const blocked=await observe(h.client.request({input:'Port'}));assert.equal(blocked.error.code,'advisor-not-ready');
  await h.clock.advance(120000);assert.equal(snapshotReads,1);assert.equal(h.workers.length,1);assert.equal(h.jobs().length,1);assert.equal(h.clock.timers.size,0);
  assert.equal(h.client.getPlan(),null);assert.equal(h.client.getStatus().phase,'idle');
  ready=true;const resumed=observe(h.client.updateContext());assert.equal(snapshotReads,2);assert.equal(h.jobs().length,2);
  h.reply(h.jobs()[1],answer('ready new context'));assert.equal((await resumed).value.title,'ready new context');assert.equal(h.peak(),1);
});

test('real model reevaluates automatic development goals every interval but retains an explicit Port goal',async t=>{
  const world=createState(Date.parse('2026-11-21T12:00:00Z'),{ruleset:32,onboarding:false});
  world.buildings.townhall.level=3;world.buildings.house.level=1;world.buildings.warehouse.level=3;world.buildings.farm.level=1;
  world.capacity=108;world.population=40;synchronizeResidents(world);
  // Rich reward stock removes gathering/capacity as unrelated fixture blockers.
  for(const id of Object.keys(world.resources)){world.resources[id]=100000;if(id!=='coins')world.bonusMaterials[id]=100000;}
  const staff=(carriers=3)=>{
    for(const person of world.residents){person.workplace=null;person.arrivalRemaining=0;person.returnRemaining=0;person.visitGroup=null;person.visiting=false;person.pendingRelease=false;person.prayerRemaining=0;}
    const eligible=world.residents.filter(person=>world.education.people[person.personUid]?.profession!=='professor'&&!world.military.people[person.personUid]);
    for(const person of eligible.slice(0,carriers))person.workplace='warehouse';
    for(const person of eligible.slice(carriers,carriers+16))person.workplace='farm';
    world.buildings.warehouse.workers=carriers;world.buildings.farm.workers=16;
    world.provisions.assignments.farm={farmGrain:8,farmVegetables:8};
  };
  staff();const h=harness(t,{getState:()=>world});
  const actualResponse=async()=>{const job=h.jobs().at(-1),before=JSON.stringify(world);const plan=advisorDevelopmentPlan(job.message.snapshot,job.message.request);assert.equal(JSON.stringify(world),before);h.reply(job,plan);await flush();return plan;};
  h.client.start();let plan=await actualResponse();assert.equal(plan.goal,'house');assert.equal(plan.targetLevel,2);assert.equal(plan.tracking,null);
  world.buildings.house.level=3;world.population=81;synchronizeResidents(world);staff();
  await h.clock.advance(120000);assert.equal(h.jobs().at(-1).message.request.options.goal,undefined);
  plan=await actualResponse();assert.equal(plan.goal,'townhall');assert.equal(plan.targetLevel,4);assert.equal(plan.tracking,null);
  world.buildings.townhall.level=4;world.capacity=144;world.buildings.dock.level=1;
  const explicit=observe(h.client.request({input:'Rozbudowa Portu'}));plan=await actualResponse();
  assert.equal((await explicit).value.goal,'dock');assert.equal(plan.targetLevel,2);assert.equal(plan.tracking.goal,'dock');assert.equal(plan.tracking.targetLevel,2);
  world.population=90;synchronizeResidents(world);world.buildings.farm.level=2;world.buildings.warehouse.level=4;staff(4);
  await h.clock.advance(120000);const next=h.jobs().at(-1).message.request;
  assert.equal(next.input,'');assert.equal(next.options.goal,'dock');assert.equal(next.options.targetLevel,2);
  plan=await actualResponse();assert.equal(plan.goal,'dock');assert.equal(plan.targetLevel,2);assert.equal(plan.tracking.goal,'dock');assert.equal(h.peak(),1);
});

test('a one-off worker question answers the count without replacing or permanently tracking the development plan',async t=>{
  const world=createState(Date.parse('2026-11-21T12:00:00Z'),{ruleset:32,onboarding:false});
  world.buildings.townhall.level=3;world.buildings.house.level=1;world.buildings.warehouse.level=3;world.buildings.farm.level=1;
  world.capacity=108;world.population=40;synchronizeResidents(world);
  for(const id of Object.keys(world.resources)){world.resources[id]=100000;if(id!=='coins')world.bonusMaterials[id]=100000;}
  const staff=()=>{
    for(const person of world.residents){person.workplace=null;person.arrivalRemaining=0;person.returnRemaining=0;person.visitGroup=null;person.visiting=false;person.pendingRelease=false;person.prayerRemaining=0;}
    const eligible=world.residents.filter(person=>world.education.people[person.personUid]?.profession!=='professor'&&!world.military.people[person.personUid]);
    for(const person of eligible.slice(0,3))person.workplace='warehouse';for(const person of eligible.slice(3,19))person.workplace='farm';
    world.buildings.warehouse.workers=3;world.buildings.farm.workers=16;world.provisions.assignments.farm={farmGrain:8,farmVegetables:8};
  };
  staff();const h=harness(t,{getState:()=>world});
  const actualResponse=async()=>{const job=h.jobs().at(-1),plan=advisorDevelopmentPlan(job.message.snapshot,job.message.request);h.reply(job,plan);await flush();return plan;};
  const hasUpgrade=(plan,building)=>plan.tasks.some(task=>task.howTo.some(action=>action.target===building&&action.guidance?.action==='upgrade'));
  h.client.start();let plan=await actualResponse();assert.equal(plan.goal,'house');assert.equal(plan.targetLevel,2);
  const question=observe(h.client.request({input:'Wolni mieszkańcy'}));plan=await actualResponse();await question;
  assert.match(plan.topicSummary,new RegExp(`\\b${freeWorkers(world)}\\b`));assert.equal(plan.goal,'house');assert.equal(plan.targetLevel,2);
  assert.equal(plan.tracking,null);assert.ok(hasUpgrade(plan,'house'),'The count is additional information; the real House upgrade must remain actionable');
  world.buildings.house.level=3;world.population=81;synchronizeResidents(world);staff();
  await h.clock.advance(120000);let next=h.jobs().at(-1).message.request;
  assert.equal(next.options.topic,undefined);assert.equal(next.options.goal,undefined);
  plan=await actualResponse();assert.equal(plan.goal,'townhall');assert.equal(plan.targetLevel,4);assert.equal(plan.tracking,null);assert.equal(Boolean(plan.topicSummary),false);
  world.buildings.townhall.level=4;world.capacity=144;world.buildings.dock.level=1;
  const port=observe(h.client.request({input:'Rozbudowa Portu'}));plan=await actualResponse();await port;
  assert.equal(plan.goal,'dock');assert.equal(plan.tracking.targetLevel,2);
  const followup=observe(h.client.request({input:'Wolni mieszkańcy',options:{goal:'dock',targetLevel:2}}));plan=await actualResponse();await followup;
  assert.match(plan.topicSummary,new RegExp(`\\b${freeWorkers(world)}\\b`));assert.equal(plan.goal,'dock');assert.equal(plan.targetLevel,2);
  assert.equal(plan.tracking.goal,'dock');assert.equal(plan.tracking.targetLevel,2);assert.equal(plan.tracking.topic,null);assert.ok(hasUpgrade(plan,'dock'));
  await h.clock.advance(120000);next=h.jobs().at(-1).message.request;
  assert.equal(next.options.goal,'dock');assert.equal(next.options.targetLevel,2);assert.ok(next.options.topic==null);
  plan=await actualResponse();assert.equal(plan.goal,'dock');assert.equal(plan.targetLevel,2);assert.equal(Boolean(plan.topicSummary),false);assert.ok(hasUpgrade(plan,'dock'));
});
