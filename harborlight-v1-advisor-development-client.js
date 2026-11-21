import {advisorDevelopmentSnapshot} from './harborlight-v1-advisor-development-plan.js?v=frontend-v32-23';
export const ADVISOR_DEVELOPMENT_INTERVAL_MS=120_000;
export const ADVISOR_DEVELOPMENT_WORKER_URL=new URL('./harborlight-v1-advisor-development-worker.js?v=frontend-v32-23',import.meta.url);
const error=code=>Object.assign(new Error(code),{code,name:code==='advisor-superseded'?'AbortError':'Error'});
// Schedules by monotonic *real* time, independently of the world's 1×/2×/6×.
// There is at most one running worker and one latest waiting request. No
// strategy, simulation, serialization or full-world clone is a UI fallback.
export function createAdvisorDevelopmentClient({getState,getContext=()=>({}),getContextKey,getLanguage=()=> 'pl',isReady=()=>true,workerFactory=()=>new Worker(ADVISOR_DEVELOPMENT_WORKER_URL,{type:'module',name:'harborlight-advisor-plan',credentials:'same-origin'}),now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout,refreshMs=ADVISOR_DEVELOPMENT_INTERVAL_MS,timeoutMs=5000,visibilityTarget=typeof document==='undefined'?null:document}={}) {
 if(typeof getState!=='function')throw new TypeError('getState is required');
 let plan=null,status={phase:'idle',computedAt:null,nextRunAt:null,reason:null},started=false,disposed=false,timer=null,worker=null,active=null,pending=null,sequence=0,revision=0,options={},currentInput='',contextKey='',lastRun=-Infinity;
 const listeners=new Set(),key=()=>getContextKey?String(getContextKey()):JSON.stringify(getContext()||{});
 const publish=patch=>{status={...status,...patch};for(const fn of listeners)try{fn(plan,{...status});}catch{ /* A UI subscriber must not stop the scheduler. */ }};
 const stopWorker=()=>{worker?.terminate();worker=null;};
 function clearUnreadyContext(){
  const current=key();if(current===contextKey)return;
  contextKey=current;revision++;plan=null;options={language:getLanguage()};currentInput='';
  if(timer!==null)clearTimer(timer);timer=null;stopWorker();
  if(active)settle(active,error('advisor-superseded'));if(pending)settle(pending,error('advisor-superseded'));active=pending=null;
  publish({phase:'idle',computedAt:null,nextRunAt:null,reason:null});
 }
 const schedule=()=>{if(timer!==null)clearTimer(timer);timer=null;if(disposed||!started)return;const at=lastRun+refreshMs;publish({nextRunAt:at});timer=setTimer(()=>{timer=null;enqueue('',options,false).catch(()=>{});},Math.max(0,at-now()));};
 function settle(job,err,value){if(job.timeout!==null)clearTimer(job.timeout);job.timeout=null;if(err)job.reject(err);else job.resolve(value);}
 function finish(job,err,value){
  if(active!==job)return;active=null;
  const current=!disposed&&job.contextKey===key()&&job.revision===revision;
  if(!current){settle(job,error('advisor-superseded'));}
  else if(err){settle(job,err);publish({phase:'error',reason:err.code||'advisor-planning-failed'});}
  else {
   plan={...value,computedAt:now(),sourceSignature:job.contextKey+':'+job.id};
   if(plan.tracking){options={...options,...plan.tracking};}else options={language:options.language};currentInput='';
   settle(job,null,plan);publish({phase:'ready',computedAt:plan.computedAt,reason:null});
  }
  if(pending){const next=pending;pending=null;launch(next);}else schedule();
 }
 function launch(job){
  if(disposed){settle(job,error('advisor-disposed'));return;}
  if(job.contextKey!==key()||job.revision!==revision){settle(job,error('advisor-superseded'));schedule();return;}
  active=job;lastRun=now();publish({phase:'computing',reason:null,nextRunAt:lastRun+refreshMs});
  try{
   const state=getState(),snapshot=advisorDevelopmentSnapshot(state); // whitelist before postMessage
   if(!worker)worker=workerFactory();const instance=worker;
   instance.onmessage=event=>{
    if(worker!==instance)return;
    const data=event.data,job=active;if(!job||data?.id!==job.id)return;
    if(data.protocol!==1||data.contextKey!==job.contextKey||data.requestRevision!==job.revision){stopWorker();finish(job,error('advisor-invalid-response'));return;}
    if(data.type==='complete'&&data.plan&&Array.isArray(data.plan.tasks))finish(job,null,data.plan);
    else if(data.type==='error'){stopWorker();finish(job,error('advisor-planning-failed'));}
    else{stopWorker();finish(job,error('advisor-invalid-response'));}
   };
   instance.onerror=event=>{if(worker!==instance)return;event.preventDefault?.();const job=active;stopWorker();if(job)finish(job,error('advisor-worker-failed'));};
   instance.onmessageerror=()=>{if(worker!==instance)return;const job=active;stopWorker();if(job)finish(job,error('advisor-invalid-response'));};
   job.timeout=setTimer(()=>{stopWorker();finish(job,error('advisor-timeout'));},timeoutMs);
   instance.postMessage({protocol:1,type:'plan',id:job.id,contextKey:job.contextKey,requestRevision:job.revision,snapshot,request:{input:job.input,options:job.options}});
  }catch{stopWorker();finish(job,error('advisor-worker-unavailable'));}
 }
 function enqueue(input,nextOptions,explicit){
  if(disposed)return Promise.reject(error('advisor-disposed'));
  if(!isReady()){clearUnreadyContext();return Promise.reject(error('advisor-not-ready'));}
  const current=key();if(current!==contextKey){contextKey=current;revision++;plan=null;options={language:nextOptions?.language||options.language};currentInput=String(input||'').slice(0,300);publish({computedAt:null});}
  if(explicit){revision++;currentInput=String(input||'').slice(0,300);options={...options,...nextOptions};}
  if(timer!==null)clearTimer(timer);timer=null;
  return new Promise((resolve,reject)=>{
   const job={id:++sequence,contextKey,revision,input:explicit?currentInput:currentInput||'',options:{...options},resolve,reject,timeout:null};
   if(active){if(pending)settle(pending,error('advisor-superseded'));pending=job;publish({phase:'computing',reason:null});return;}
   launch(job);
  });
 }
 const visibility=()=>{if(!disposed&&started&&(!visibilityTarget||visibilityTarget.visibilityState!=='hidden')&&now()>=lastRun+refreshMs)enqueue('',options,false).catch(()=>{});};
 visibilityTarget?.addEventListener('visibilitychange',visibility);
 return {
  getPlan:()=>plan,getCurrentPlan:()=>plan,getStatus:()=>({...status}),
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  start(){if(disposed||started||!isReady())return;started=true;options={language:getLanguage(),...options};enqueue('',options,false).catch(()=>{});},
  request(value={}){const {input='',options:requested={}}=typeof value==='string'?{input:value}:value;return enqueue(input,{language:getLanguage(),...requested},true);},
  updateContext(){if(disposed)return Promise.reject(error('advisor-disposed'));if(!isReady()){clearUnreadyContext();return Promise.resolve(null);}if(!started){this.start();return Promise.resolve(plan);}if(key()!==contextKey||options.language!==getLanguage()||!active&&now()>=lastRun+refreshMs)return enqueue('',{language:getLanguage()},true);return Promise.resolve(plan);},
  dispose(){disposed=true;if(timer!==null)clearTimer(timer);timer=null;visibilityTarget?.removeEventListener('visibilitychange',visibility);stopWorker();if(active)settle(active,error('advisor-disposed'));if(pending)settle(pending,error('advisor-disposed'));active=pending=null;listeners.clear();}
 };
}
