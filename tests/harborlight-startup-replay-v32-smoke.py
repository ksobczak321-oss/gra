"""Native module Worker startup, responsiveness and atomic adoption.

Only isolated identity/storage responses and a diagnostic worker delay/failure
are fixtures. The actual HTML, Worker, model and images are served unchanged
otherwise. No request is sent to Google and no real account is written.
"""
import importlib.util
from datetime import timedelta
import json
import os
from pathlib import Path
import subprocess
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
OUTPUT = Path(os.environ.get('HARBORLIGHT_REPLAY_QA_OUTPUT', '/tmp/harborlight-startup-replay-v32'))
OUTPUT.mkdir(parents=True, exist_ok=True)
spec = importlib.util.spec_from_file_location('replay_startup_fixture', SOURCE/'tests/harborlight-startup-no-flash-v32-smoke.py')
startup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(startup)
cloud = startup.cloud
NOW = int(cloud.NOW.timestamp()*1000)

PROBE = r'''(() => {
  window.__qaReplay={workers:0,terminations:0,messages:[],beats:[],started:false,done:false};
  const qa=window.__qaReplay,Native=window.Worker;
  window.Worker=new Proxy(Native,{construct(Target,args){
    const worker=Reflect.construct(Target,args);qa.workers++;
    const post=worker.postMessage.bind(worker),terminate=worker.terminate.bind(worker);
    worker.postMessage=(data,...rest)=>{
      qa.messages.push({targetNow:data.targetNow,recovery:data.recoverInterruptions,
        population:Object.values(data.packet.bundle.worlds).map(w=>w.population),
        from:Object.values(data.packet.bundle.worlds).map(w=>w.lastSimulatedAt)});
      return post(data,...rest);
    };
    worker.terminate=()=>{qa.terminations++;return terminate();};
    worker.addEventListener('message',event=>{
      if(event.data?.type==='qa-started')qa.started=true;
      if(event.data?.type==='complete'){
        qa.done=true;qa.finishedAt=performance.now();
        qa.result=Object.values(event.data.packet.bundle.worlds).map(w=>({lastSimulatedAt:w.lastSimulatedAt,population:w.population,worldTimeMs:w.worldTimeMs}));
      }
    });return worker;
  }});
  setInterval(()=>qa.beats.push({at:performance.now(),pending:qa.started&&!qa.done}),50);
})();'''


def fixture(*, dense=False, intro=False):
    elapsed = 48*3600000 if dense else 600000
    code = """import {createState,normalizeState,advanceTo} from './harborlight-v1-state.js';
      import * as Arch from './harborlight-v1-archipelago.js';
      import {synchronizeResidents,assignResidents} from './harborlight-v1-residents.js';
      import * as Development from './harborlight-v1-development.js';
      const s=createState(%d,{ruleset:32,onboarding:%s});
      s.islandName='Próba responsywnego startu';s.tutorial.autoOpenDisabled=true;
      if(%s){
        // The ordinary account bind supplies eight rescue specialists below.
        s.buildings.townhall.level=4;s.buildings.house.level=4;s.population=89;
        s.buildings.farm.level=5;s.buildings.windmill.level=5;s.buildings.warehouse.level=4;
        synchronizeResidents(s);
        assignResidents(s,'farm',20);assignResidents(s,'windmill',10);assignResidents(s,'warehouse',5);
        s.provisions.assignments.farm={farmGrain:10,farmVegetables:10};
        s.provisions.assignments.windmill={flour:10};
      }
      if(!%s){s.objective.repaired=true;s.engagementSchedule.initialCompleted=true;s.engagementSchedule.initialAnchored=true;s.engagementSchedule.nextAt=1e15;}
      const bundle=Arch.restoreArchipelago(s,{createState,normalizeState,advanceTo},%d);
      console.log(JSON.stringify(Arch.serializeArchipelago(bundle)));""" % (NOW-elapsed, json.dumps(intro), json.dumps(dense), json.dumps(intro),NOW-elapsed)
    return cloud.acknowledge_daily_offer(json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=SOURCE)))


class Replay(startup.Startup):
    def __init__(self,browser,*,dense=False,intro=False,fail=False,before_launch=None,hold_confirm=False,clock_change=False):
        self.worker_fail=fail
        self.before_launch=before_launch
        self.hold_confirm=hold_confirm
        self.confirm=[]
        self.cloud_reads=0
        self.clock_change=clock_change
        self.clock_reads=0
        super().__init__(browser,1440,1000,intro=intro)
        saved=fixture(dense=dense,intro=intro)
        cloud.DOCUMENTS[startup.UID]['payload']=json.dumps(saved)
        self.original=cloud.DOCUMENTS[startup.UID]['payload']
        self.context.add_init_script(PROBE)
        if before_launch:
            self.context.add_init_script('''new MutationObserver(()=>{
              if(document.querySelector('[data-startup-replay="running"]')&&!window.__qaBeforeLaunch){
                window.__qaBeforeLaunch=true;%s
              }
            }).observe(document,{subtree:true,attributes:true,attributeFilter:['data-startup-replay']});''' % before_launch)

    def route(self,route):
        request=route.request;parsed=urlsplit(request.url)
        if self.clock_change and parsed.hostname=='harborlight-dev.web.app':
            if parsed.path=='/api/v1/config':
                return route.fulfill(json={'accountApi':True,'projectId':'harborlight-dev','environment':'preprod'})
            if parsed.path=='/api/v1/island':
                assert request.method=='GET','Replay must never write before adoption'
                self.cloud_reads+=1
                value=cloud.DOCUMENTS[startup.UID]
                return route.fulfill(json={'account':{'generation':2,'expired':False},'island':{'payload':value['payload'],'generation':2,'version':{'revision':value['revision'],'updateTime':value['updateTime']}}})
            if parsed.path=='/api/v1/dev-time':
                assert request.method=='GET','Replay must never change the developer clock'
                self.clock_reads+=1
                return route.fulfill(json={'now':NOW,'realNow':NOW,'offsetSeconds':0,'rate':1,'clockRevision':12 if self.clock_reads==1 else 13,'generation':2,'canAdvance':False,'canSetRate':True})
        if parsed.hostname=='firestore.googleapis.com' and request.method=='GET':
            self.cloud_reads+=1
            if self.hold_confirm and self.cloud_reads==2:
                self.confirm.append(route);return
        if Path(parsed.path).name=='harborlight-v1-startup-replay-worker.js':
            # Keep a real native module Worker and real model. This diagnostic
            # synchronous CPU delay makes responsiveness/cancellation reliable
            # on fast CI, without changing the game's simulation clock/events.
            text=(startup.ROOT/'harborlight-v1-startup-replay-worker.js').read_text()
            suffix="""\nconst original=self.onmessage;self.onmessage=event=>{
              self.postMessage({type:'qa-started'});
              const until=performance.now()+1200;while(performance.now()<until){}
              %s
            };""" % ("throw Error('Diagnostic worker failure');" if self.worker_fail else "original(event);")
            return route.fulfill(body=text+suffix,content_type='text/javascript')
        return super().route(route)

    def pending(self):
        self.page.wait_for_function('window.__qaReplay.started',timeout=30000)
        expect(self.page.locator('#loading[data-startup-replay="running"]')).to_be_visible()
        assert self.page.locator('#loading').get_attribute('role')=='status'
        assert not self.page.locator('#viewport').is_visible()
        assert self.page.locator('#viewport').get_attribute('inert') is not None
        self.page.wait_for_timeout(300)
        self.page.keyboard.press('Tab')
        assert not self.page.evaluate('!!document.activeElement?.closest("#viewport")')
        assert len(cloud.WRITES)==self.writes_before and cloud.DOCUMENTS[startup.UID]['payload']==self.original

    def error(self):
        expect(self.page.locator('#loading[role="alert"]')).to_be_visible(timeout=10000)
        assert self.page.evaluate('document.documentElement.dataset.gameStartup')=='error'
        assert len(cloud.WRITES)==self.writes_before and cloud.DOCUMENTS[startup.UID]['payload']==self.original
        assert not self.page.locator('#viewport').is_visible()

    def release_confirm(self):
        for route in self.confirm:self.deliver(route)
        self.confirm.clear()

    def close(self):
        for route in self.confirm:
            try:route.abort('aborted')
            except Exception:pass
        self.confirm.clear()
        super().close()


def run():
    report=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
        try:
            app=Replay(browser)
            try:
                # Match the unchanged legacy missions acceptance clock: game
                # time, animation frames and window timers stay paused. Worker
                # launch/completion must not require manually pumping them.
                app.page.clock.install(time=cloud.NOW-timedelta(seconds=1))
                app.page.clock.pause_at(cloud.NOW)
                app.context.add_init_script('''window.__qaReplayFrameRan=false;window.__qaReplayTimerRan=false;
                  requestAnimationFrame(()=>window.__qaReplayFrameRan=true);
                  setTimeout(()=>window.__qaReplayTimerRan=true,1);''')
                app.start(wait_loading=False)
                expect(app.page.locator('html')).to_have_attribute('data-game-startup','ready',timeout=30000)
                qa=app.page.evaluate('window.__qaReplay')
                assert qa['workers']==qa['terminations']==1 and qa['done'],qa
                assert qa['messages'][0]['targetNow']==NOW and qa['messages'][0]['from'][0]==NOW-600000,qa
                assert all(w['lastSimulatedAt']==NOW and w['worldTimeMs']==NOW for w in qa['result']),qa
                assert app.page.evaluate('Date.now()')==NOW
                assert app.page.evaluate('!window.__qaReplayFrameRan&&!window.__qaReplayTimerRan'), 'The clock regression must keep both window scheduling APIs paused'
                assert app.cloud_reads==2 and not app.errors,app.errors
                report.append({'case':'paused-browser-clock-worker-start-and-completion','workers':1,'fixed_target':NOW,'clock_pumped':False,'cloud_reads':2,'js_errors':0})
                print('PASS paused browser clock launches/completes Worker without frame/timer pumping',flush=True)
            finally:app.close()

            app=Replay(browser,intro=True)
            try:
                app.start();app.page.wait_for_function('document.documentElement.dataset.gameStartup==="ready"',timeout=30000)
                assert app.page.evaluate('window.__qaReplay.workers')==0
                expect(app.page.locator('[data-island-onboarding]')).to_be_visible()
                report.append({'case':'paused-new-world-introduction','workers':0})
                print('PASS paused introduction does not create a Worker',flush=True)
            finally:app.close()

            app=Replay(browser,fail=True)
            try:
                app.start();app.pending();app.error()
                assert app.page.evaluate('window.__qaReplay.terminations')==1
                report.append({'case':'worker-runtime-failure','partial_adoption':False,'writes':0})
                print('PASS Worker failure keeps original world and offers retry',flush=True)
            finally:app.close()

            # Both boundaries matter: cancellation can happen before the first
            # worker exists, or after completion while the read-only CAS GET
            # is in flight. Neither path may adopt or queue a save.
            for phase in ['before-worker','during-worker','during-confirmation']:
                for event in ['pagehide','storage']:
                    dispatch="dispatchEvent(new Event('pagehide'))" if event=='pagehide' else "dispatchEvent(new StorageEvent('storage',{key:'harborlight-dev-auth-v1',newValue:JSON.stringify({uid:'dev-admin1'})}))"
                    app=Replay(browser,before_launch=dispatch if phase=='before-worker' else None,hold_confirm=phase=='during-confirmation')
                    try:
                        app.start()
                        if phase=='during-worker':app.pending();app.page.evaluate(dispatch)
                        elif phase=='during-confirmation':
                            app.page.wait_for_function('window.__qaReplay.done',timeout=30000)
                            for _ in range(100):
                                if app.confirm:break
                                app.page.wait_for_timeout(20)
                            assert app.confirm
                            app.page.evaluate(dispatch);app.release_confirm()
                        if event=='pagehide':
                            app.error()
                            if phase=='before-worker':assert app.page.evaluate('window.__qaReplay.workers')==0
                        else:app.page.wait_for_url('**/harborlight-auth.html?mode=login')
                        assert len(cloud.WRITES)==app.writes_before and cloud.DOCUMENTS[startup.UID]['payload']==app.original
                        report.append({'case':phase+'-'+event,'partial_adoption':False,'writes':0})
                        print('PASS cancellation:',phase,event,flush=True)
                    finally:app.close()

            app=Replay(browser,hold_confirm=True)
            try:
                app.start();app.page.wait_for_function('window.__qaReplay.done',timeout=30000)
                for _ in range(100):
                    if app.confirm:break
                    app.page.wait_for_timeout(20)
                assert app.confirm
                cloud.DOCUMENTS[startup.UID]['revision']+=1
                cloud.DOCUMENTS[startup.UID]['updateTime']=cloud.timestamp()
                app.release_confirm();app.error()
                report.append({'case':'server-revision-changed','partial_adoption':False,'writes':0})
                print('PASS changed authoritative revision drops the replay result',flush=True)
            finally:app.close()

            previous_uid=startup.UID;startup.UID='dev-admin3'
            try:
                app=Replay(browser,clock_change=True)
                try:
                    app.start();app.pending();app.error()
                    assert app.clock_reads==2 and app.cloud_reads==2
                    report.append({'case':'authoritative-developer-clock-changed','clock_reads':2,'island_reads':2,'partial_adoption':False,'writes':0})
                    print('PASS changed authoritative developer clock drops the replay result',flush=True)
                finally:app.close()
            finally:startup.UID=previous_uid

            app=Replay(browser,hold_confirm=True)
            try:
                app.start();app.page.wait_for_function('window.__qaReplay.done',timeout=30000)
                for _ in range(100):
                    if app.confirm:break
                    app.page.wait_for_timeout(20)
                assert app.confirm
                # A slow server read adds a whole ordinary elapsed tick. Its
                # model work must remain off the UI thread, with no second ad
                # recovery or repeated confirmation GET.
                app.page.clock.set_fixed_time(cloud.NOW+timedelta(seconds=10))
                app.release_confirm()
                app.page.wait_for_function('document.documentElement.dataset.gameStartup==="ready"',timeout=30000)
                qa=app.page.evaluate('window.__qaReplay')
                assert qa['workers']==qa['terminations']==2 and app.cloud_reads==2,qa
                assert [m['recovery'] for m in qa['messages']]==[True,False],qa
                assert qa['messages'][1]['targetNow']==NOW+10000 and all(w['lastSimulatedAt']==NOW+10000 for w in qa['result']),qa
                assert not app.errors,app.errors
                report.append({'case':'slow-confirmation-residual-remains-on-worker','workers':2,'cloud_reads':2,'recovery_calls':1,'full_residual_tick':True,'js_errors':0})
                print('PASS slow confirmation keeps the next complete elapsed tick on Worker',flush=True)
            finally:app.close()

            app=Replay(browser,dense=True)
            try:
                app.start();app.pending()
                app.page.wait_for_function('document.documentElement.dataset.gameStartup==="ready"',timeout=180000)
                qa=app.page.evaluate('window.__qaReplay')
                pending=[b['at'] for b in qa['beats'] if b['pending']]
                assert qa['workers']==qa['terminations']==1 and qa['done'],qa
                assert len(pending)>=10 and max(b-a for a,b in zip(pending,pending[1:]))<1000,qa
                assert qa['messages'][0]['population']==[97] and qa['messages'][0]['targetNow']-qa['messages'][0]['from'][0]==48*3600000,qa
                assert all(w['lastSimulatedAt']==NOW and w['worldTimeMs']==NOW for w in qa['result']),qa
                assert app.cloud_reads==2 and not app.errors,app.errors
                app.page.screenshot(path=str(OUTPUT/'dense-48h-ready.png'))
                report.append({'case':'dense-97-person-48h-native-worker','workers':qa['workers'],'pending_heartbeats':len(pending),'max_heartbeat_gap_ms':max(b-a for a,b in zip(pending,pending[1:])),'full_fixed_target':True,'cloud_recheck_reads':app.cloud_reads,'original_unchanged_while_pending':True,'js_errors':0})
                print('PASS dense native Worker: 97 people, full 48h, responsive heartbeat and one atomic adoption',flush=True)
            finally:app.close()

        finally:browser.close()
    (OUTPUT/'report.json').write_text(json.dumps({'cases':report,'case_count':len(report),'real_native_workers':True,'real_assets_and_model':True,'real_account_writes':0},indent=2)+'\n')


if __name__=='__main__':run()
