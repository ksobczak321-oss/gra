"""Real module Worker, compact current state and UI heartbeat. No accounts.

Uses actual model/Worker bytes with a detached 3,600-person fixture. Large
histories and other islands are inaccessible getters, not shortened game saves.
"""
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright

SOURCE=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',SOURCE)).resolve()
OUT=Path(os.environ.get('HARBORLIGHT_TEST_OUTPUT','/tmp/harborlight-advisor-development-worker'))
OUT.mkdir(parents=True,exist_ok=True)
BASE='http://127.0.0.1:47564'

def asset(route):
    assert route.request.method=='GET','Planner attempted a write'
    path=unquote(urlsplit(route.request.url).path)
    if path=='/advisor-worker.html':
        route.fulfill(status=200,content_type='text/html',body='<!doctype html><html lang="en"><body><button id="ping">UI responds</button></body></html>')
        return
    file=(ROOT/path.lstrip('/')).resolve()
    assert file.is_relative_to(ROOT) and file.is_file(),path
    route.fulfill(path=str(file),content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')

with sync_playwright() as playwright:
    browser=playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1280,'height':800})
    context.route(BASE+'/**',asset)
    page=context.new_page();errors=[];workers=[];writes=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('worker',lambda worker:workers.append(worker.url))
    page.on('request',lambda request:writes.append(request.url) if request.method!='GET' else None)
    page.goto(BASE+'/advisor-worker.html',wait_until='networkidle')
    page.evaluate('''async () => {
      const {createState}=await import('/harborlight-v1-state.js');
      const {createAdvisorDevelopmentClient}=await import('/harborlight-v1-advisor-development-client.js');
      const {advisorDevelopmentSnapshot}=await import('/harborlight-v1-advisor-development-plan.js');
      const s=createState(Date.UTC(2026,10,21,15),{ruleset:32});
      s.buildings.townhall.level=100;s.buildings.house.level=100;s.buildings.farm.level=100;s.buildings.warehouse.level=24;s.buildings.lumber.level=99;s.buildings.quarry.level=99;s.buildings.sawmill.level=99;
      const initial=s.residents[0];s.residents=Array.from({length:3600},(_,i)=>({...initial,id:i+1,personUid:'fixture:'+i}));s.population=3600;
      for(const id of Object.keys(s.resources))s.resources[id]=1000000;
      for(const p of s.residents){s.provisions.people[p.personUid]={coverage:.75};Object.defineProperty(s.provisions.people[p.personUid],'history',{get(){throw Error('Historical meal payload was read');}});}
      for(const key of ['archipelago','adventuresPacked','statistics','notifications'])Object.defineProperty(s,key,{get(){throw Error('Nonplanning payload was read: '+key);}});
      const freeze=value=>{if(!value||typeof value!=='object'||Object.isFrozen(value))return;Object.freeze(value);for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if('value'in descriptor)freeze(descriptor.value);};freeze(s);
      const snapshotStart=performance.now(),snapshot=advisorDevelopmentSnapshot(s),snapshotMs=performance.now()-snapshotStart;
      const f=window.fixture={state:s,identity:'fixture-user:2:island-1:start-1',language:'en',snapBytes:JSON.stringify(snapshot).length,snapshotMs,beats:[],events:[],clicks:0};
      f.before={resources:JSON.stringify(s.resources),worldTimeMs:s.worldTimeMs,residents:s.residents.map(p=>[p.id,p.workplace,p.arrivalRemaining]),pool:JSON.stringify(s.houseHappinessPool)};
      document.querySelector('#ping').onclick=()=>f.clicks++;
      f.timer=setInterval(()=>f.beats.push(performance.now()),16);
      f.client=createAdvisorDevelopmentClient({getState:()=>s,getContextKey:()=>f.identity,getLanguage:()=>f.language});
      f.client.subscribe((plan,status)=>f.events.push({phase:status.phase,goal:plan?.goal,at:performance.now()}));
      await new Promise(resolve=>setTimeout(resolve,40));f.started=performance.now();f.client.start();
    }''')
    page.click('#ping')
    page.wait_for_function("fixture.client.getStatus().phase==='ready'",timeout=15000)
    result=page.evaluate('''async () => {
      const f=fixture,readyAt=performance.now(),first=f.client.getPlan(),beats=f.beats.filter(t=>t>=f.started&&t<=readyAt);
      const gaps=[f.started,...beats,readyAt].slice(1).map((t,i)=>t-[f.started,...beats,readyAt][i]);
      if(!/Goal:/.test(first.title))throw Error('Initial English request was ignored');
      if(first.tasks.length<2||first.tasks.length>5)throw Error('Unbounded cards');
      const port=await f.client.request({input:'Upgrade the Port',options:{language:'en'}});
      if(port.goal!=='dock')throw Error('Explicit Port goal missing');
      f.language='pl';await f.client.updateContext();const polish=f.client.getPlan();
      if(polish.goal!=='dock'||!/Cel:/.test(polish.title))throw Error('Locale switch lost goal or kept stale language');
      const after={resources:JSON.stringify(f.state.resources),worldTimeMs:f.state.worldTimeMs,residents:f.state.residents.map(p=>[p.id,p.workplace,p.arrivalRemaining]),pool:JSON.stringify(f.state.houseHappinessPool)};
      if(JSON.stringify(after)!==JSON.stringify(f.before))throw Error('Planner changed the live fixture');
      f.identity='another-user:2:island-2:start-1';const reset=f.client.updateContext();if(f.client.getPlan()!==null)throw Error('Old-account cached plan survived context change');await reset;
      f.client.dispose();clearInterval(f.timer);
      return {snapshotMs:f.snapshotMs,snapshotBytes:f.snapBytes,readyMs:readyAt-f.started,heartbeats:beats.length,maxHeartbeatGapMs:Math.max(...gaps),clicks:f.clicks,cards:first.tasks.length,variants:first.candidates.length,languageGoalPreserved:true,contextCacheCleared:true,liveFixtureUnchanged:true,events:f.events};
    }''')
    assert workers and all('harborlight-v1-advisor-development-worker.js' in url for url in workers),workers
    assert result['heartbeats']>=2,result
    assert result['maxHeartbeatGapMs']<250,result
    assert result['snapshotMs']<100,result
    assert result['snapshotBytes']<1_500_000,result
    assert result['readyMs']<5000,result
    assert result['clicks']==1,result
    assert not errors,errors
    assert not writes,writes
    (OUT/'report.json').write_text(json.dumps({**result,'workers':workers,'errors':errors,'writes':writes,'realAccounts':False},ensure_ascii=False,indent=2))
    print('PASS native advisory Worker: 3600 residents, inaccessible histories, heartbeat, EN→PL goal, context cache and no writes',flush=True)
    print(json.dumps({key:result[key] for key in ['snapshotMs','snapshotBytes','readyMs','heartbeats','maxHeartbeatGapMs','cards','variants']}),flush=True)
    browser.close()
