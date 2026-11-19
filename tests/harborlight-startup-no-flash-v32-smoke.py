"""No reference-screen frame may escape during normal authenticated startup.

The real hosted HTML/CSS/modules run at the PRE-PROD origin. Only static file
delivery, Firebase session renewal and the isolated saved document are fixtures.
Requests are released in real startup order; no game-state hook is installed.
"""
import importlib.util
import json
import mimetypes
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright
from helpers.building_stage_acceptance import staged_manifest, assert_scene

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
STAGES = staged_manifest(ROOT)
SPRITES = bool(STAGES and all(family.get('sprites') for family in STAGES['buildings'].values()))
STAGE_IMAGE_PHASE = 'current-frames' if SPRITES else 'atlases'
PHASES = ('module','auth','cloud','manifest',STAGE_IMAGE_PHASE,'terrain',*(() if SPRITES else ('crane',)),'accepted','ambient','css') if STAGES else ('module','auth','cloud','accepted','ambient','css')
OUTPUT = Path(os.environ.get('HARBORLIGHT_STARTUP_QA_OUTPUT', '/tmp/harborlight-startup-no-flash-v32'))
OUTPUT.mkdir(parents=True, exist_ok=True)
spec = importlib.util.spec_from_file_location('startup_cloud_fixture', SOURCE/'tests/harborlight-dev-game-smoke.py')
cloud = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cloud)
UID = 'dev-admin2'
ACCEPTED = {'harborlight-ocean-approved-v32.png'} if SPRITES else {'harborlight-farm-forest-approved-v32.png', 'harborlight-harbor-approved-v32.png', 'harborlight-ocean-approved-v32.png'}
AMBIENT = {'harborlight-inhabitants-clean.png'} if SPRITES else {'harborlight-windmill-clean.png', 'harborlight-inhabitants-clean.png'}
GAME_UI = '.island-topbar,.mobile-island-hud,.mobile-bottom-dock,dialog[open],[data-island-onboarding]'

# Pure DOM telemetry, installed before the first inline script. It cannot read
# or modify the game's model, authentication or startup controller.
FRAME_PROBE = r'''(() => {
  function visible(node) {
    if(!node || !node.getClientRects().length)return false;
    for(let n=node;n&&n.nodeType===1;n=n.parentElement){
      const s=getComputedStyle(n);
      if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse'||Number(s.opacity)===0||s.contentVisibility==='hidden')return false;
    }
    const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight;
  }
  window.__qaStartupFrames=[];
  window.__qaStartupSnapshot=()=>{
    const loader=document.querySelector('#loading'),v=document.querySelector('#viewport');
    const accepted=[...document.querySelectorAll('[data-accepted-map-art] img')];
    const stageRequired=__BUILDING_STAGES_REQUIRED__;
    const artReady=(stageRequired ? document.querySelectorAll('[data-building-stage-scene] [data-building-stage-map]:not([data-building-stage-decoration])').length===20&&document.querySelectorAll('[data-building-stage-decoration]').length>=1&&document.querySelectorAll('[data-accepted-artwork]').length===0&&accepted.length===1 : document.querySelectorAll('[data-accepted-artwork]').length===4&&accepted.length>=4)&&accepted.every(n=>n.complete&&n.naturalWidth>0);
    const ready=artReady&&document.querySelector('#island-ambient')?.dataset.ready==='true'&&document.querySelectorAll('.world-hotspot[id^="hit-world-"]').length===20;
    const rect=loader?.getBoundingClientRect();
    return {at:performance.now(),ready,viewportVisible:visible(v),loaderVisible:visible(loader),loaderRole:loader?.getAttribute('role'),loaderLive:loader?.getAttribute('aria-live'),
      loaderRect:rect?{x:rect.x,y:rect.y,width:rect.width,height:rect.height,right:rect.right,bottom:rect.bottom}:null,
      paintedGame:[...document.querySelectorAll('.island-topbar,.mobile-island-hud,.mobile-bottom-dock,dialog[open],[data-island-onboarding]')].filter(visible).map(n=>n.id||n.className||n.tagName),
      referenceCanvases:document.querySelectorAll('.slice canvas').length,
      oldHudVisible:visible(document.querySelector('[data-label="hud-resources"]')),
      activeGame:!!document.activeElement?.closest('#viewport,.island-topbar,.mobile-island-hud,.mobile-bottom-dock,dialog[open]:not(#loading)')};
  };
  function frame(){const s=window.__qaStartupSnapshot();if(s.viewportVisible||s.paintedGame.length||s.loaderVisible){window.__qaStartupFrames.push(s);if(typeof window.__qaReportStartupFrame==='function')void window.__qaReportStartupFrame(s).catch(()=>{});}requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();'''.replace('__BUILDING_STAGES_REQUIRED__',json.dumps(bool(STAGES)))


class Startup:
    def __init__(self, browser, width, height, *, staged=False, fail=None, authenticated=True, cloud_failure=False, intro=False, construction=False):
        self.width, self.staged, self.fail = width, staged, fail
        self.cloud_failure = cloud_failure
        self.held, self.requests, self.errors = {}, [], []
        self.frames=[]
        # A non-staged construction test may need the conditional crane phase,
        # even though an idle island correctly excludes it from PHASES.
        self.released = set() if staged else set(PHASES) | {'crane'}
        saved = cloud.starter(321, 'Wyspa bez starej klatki')
        if construction:
            # A real model request creates the fixture's building stage. The
            # ordinary idle island must not preload a crane; this island must.
            code="""import {createState,requestUpgrade} from './harborlight-v1-state.js';
              const state=createState(%d,{ruleset:32,onboarding:false});
              state.tutorial.autoOpenDisabled=true;state.buildings.townhall.level=2;
              const result=requestUpgrade(state,{building:'farm',premiumService:true,paidMaterials:true,paidCoins:true});
              if(!result.ok || !state.premiumServices.some(p=>p.building==='farm'&&p.stage==='building'&&p.buildRemaining>0))throw Error('Missing real construction fixture');
              console.log(JSON.stringify(state));""" % int(cloud.NOW.timestamp()*1000)
            saved=cloud.acknowledge_daily_offer(json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=SOURCE)))
        if intro:
            code="import {createState} from './harborlight-v1-state.js';console.log(JSON.stringify(createState(%d,{ruleset:32,onboarding:true})));" % int(cloud.NOW.timestamp()*1000)
            saved=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=SOURCE))
        if not intro:
            saved['welcomeWorkers']['claimedDays'] = ['2026-10-30']
            saved['welcomeWorkers']['granted'] = 1
            saved['objective']['repaired'] = True
            saved['engagementSchedule'].update(initialCompleted=True, initialAnchored=True, nextAt=10**15)
        cloud.DOCUMENTS.clear()
        cloud.DOCUMENTS[UID] = {'payload': json.dumps(saved), 'revision': 41, 'updateTime': cloud.timestamp()}
        self.original = cloud.DOCUMENTS[UID]['payload']
        self.writes_before = len(cloud.WRITES)
        self.context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=width<901, has_touch=width<901, reduced_motion='reduce')
        self.context.route('**/*', self.route)
        self.context.expose_binding('__qaReportStartupFrame', lambda source,frame:self.frames.append(frame))
        self.context.add_init_script(FRAME_PROBE)
        identity = cloud.session(UID)
        identity['expiresAt'] = int(cloud.NOW.timestamp()*1000) + 30000 if staged else identity['expiresAt']
        if authenticated:
            self.context.add_init_script('localStorage.setItem("harborlight-dev-auth-v1",'+json.dumps(json.dumps(identity))+');localStorage.setItem("harborlight-language","pl");')
        else:
            self.context.add_init_script('localStorage.setItem("harborlight-language","pl")')
        self.context.add_init_script('''(() => {
          window.__qaIslandStorageCalls=[];
          for(const operation of ['getItem','setItem']) {
            const original=Storage.prototype[operation];
            Storage.prototype[operation]=function(key,...values) {
              if(/^harborlight-(?:dev-island-|v1-(?:new-player-)?save|island-name:)/.test(String(key)))
                window.__qaIslandStorageCalls.push([operation,String(key)]);
              return original.call(this,key,...values);
            };
          }
        })();''')
        self.page = self.context.new_page()
        self.page.clock.set_fixed_time(cloud.NOW)
        self.page.on('pageerror', lambda error:self.errors.append(str(error)))

    def route(self, route):
        request=route.request;parsed=urlsplit(request.url);name=Path(parsed.path).name
        self.requests.append([request.method, parsed.hostname, parsed.path])
        if request.method == 'OPTIONS':
            return route.fulfill(status=204, headers={'access-control-allow-origin':cloud.ORIGIN,'access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'})
        building_asset = '/assets/building-upgrades-v1/' in parsed.path
        stage_phase = ('manifest' if name=='manifest.json' else 'terrain' if name=='terrain.webp' else 'crane' if name=='crane.webp' else STAGE_IMAGE_PHASE) if building_asset else None
        phase = 'auth' if parsed.hostname=='securetoken.googleapis.com' else 'cloud' if parsed.hostname=='firestore.googleapis.com' and request.method=='GET' else 'module' if name=='harborlight-v1-play.js' else stage_phase if stage_phase else 'accepted' if name in ACCEPTED else 'ambient' if name in AMBIENT else 'css' if name=='harborlight-v1-adventures.css' else None
        if phase and phase not in self.released:
            self.held.setdefault(phase,[]).append(route);return
        self.deliver(route)

    def deliver(self, route):
        request=route.request;parsed=urlsplit(request.url);name=Path(parsed.path).name
        if self.fail == name:
            self.fail=None
            return route.abort('failed')
        if parsed.hostname=='securetoken.googleapis.com':
            assert parsed.path=='/v1/token' and request.method=='POST'
            return route.fulfill(headers={'access-control-allow-origin':cloud.ORIGIN},json={'id_token':cloud.token(UID),'refresh_token':'fixture-renewed-token','user_id':UID,'expires_in':'3600','project_id':'harborlight-dev'})
        if parsed.hostname=='firestore.googleapis.com':
            if self.cloud_failure and request.method=='GET':
                return route.abort('internetdisconnected')
            return cloud.firebase(route)
        if parsed.hostname=='identitytoolkit.googleapis.com':
            return cloud.identity_lookup(route)
        assert parsed.hostname=='harborlight-dev.web.app', 'Unexpected external startup request: '+request.url
        if parsed.path=='/__/firebase/init.json':
            return route.fulfill(json={'projectId':'harborlight-dev','apiKey':'AIza-fixture-public-key-123456789','messagingSenderId':'28040211190'})
        if parsed.path=='/api/v1/config':
            return route.fulfill(status=503,json={'error':'account_api_disabled'})
        file=(ROOT/unquote(parsed.path).lstrip('/')).resolve()
        assert file.is_relative_to(ROOT) and file.is_file(), str(file)
        return route.fulfill(path=str(file),content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')

    def start(self, *, wait_loading=True):
        self.page.goto(cloud.ORIGIN+'/harborlight-v1-layered.html',wait_until='commit')
        if wait_loading:self.page.wait_for_function('!!document.querySelector("#loading")')

    def wait_held(self, phase):
        for _ in range(150):
            if self.held.get(phase):return
            self.page.wait_for_timeout(20)
        raise AssertionError('Startup did not reach held '+phase)

    def release(self, phase):
        self.released.add(phase)
        for route in self.held.pop(phase,[]):self.deliver(route)

    def blocked(self, phase, *, alert=False):
        self.page.wait_for_timeout(80)  # Several actual browser paints, not a frozen game timer.
        shot=self.page.evaluate('window.__qaStartupSnapshot()')
        (OUTPUT/f'{phase}-{self.width}.json').write_text(json.dumps(shot,indent=2)+'\n')
        self.page.screenshot(path=str(OUTPUT/f'{phase}-{self.width}.png'))
        assert not shot['viewportVisible'] and not shot['paintedGame'], ('An old reference/game frame escaped before startup was ready',phase,shot)
        assert not self.page.evaluate('window.__qaStartupFrames.some(s=>!s.ready&&(s.viewportVisible||s.paintedGame.length))'), ('An earlier browser paint exposed the reference before this barrier',phase)
        if not alert:
            assert shot['loaderVisible'], ('Startup must show progress rather than a blank screen',phase,shot)
            assert shot['loaderRole']=='status', ('A healthy delayed dependency must not be reported as an error',phase,shot)
        if shot['loaderVisible']:
            assert shot['loaderRole'] in ('status','alert') and shot['loaderLive'] in ('polite','assertive'), ('Startup progress must be accessible',phase,shot)
            rect=shot['loaderRect']
            assert rect and rect['x']<=1 and rect['y']<=1 and rect['right']>=self.width-1 and rect['bottom']>=self.page.viewport_size['height']-1, ('Startup must cover the actual viewport on mobile and desktop',rect)
        self.page.keyboard.press('Tab')
        assert not self.page.evaluate('window.__qaStartupSnapshot().activeGame'), 'Tab reached a hidden game before startup completed'
        assert cloud.DOCUMENTS[UID]['payload']==self.original and len(cloud.WRITES)==self.writes_before, 'Startup barrier changed an island or awarded a reward'

    def ready(self):
        try:
            self.page.wait_for_function('window.__qaStartupSnapshot().ready && window.__qaStartupSnapshot().viewportVisible && !window.__qaStartupSnapshot().loaderVisible',timeout=30000)
        except Exception:
            diagnostic={'width':self.width,'snapshot':self.page.evaluate('window.__qaStartupSnapshot()'),'errors':self.errors,'held_phases':list(self.held),'loading_text':self.page.locator('#loading').inner_text()}
            (OUTPUT/f'ready-timeout-{self.width}.json').write_text(json.dumps(diagnostic,indent=2)+'\n')
            self.page.screenshot(path=str(OUTPUT/f'ready-timeout-{self.width}.png'))
            print('STARTUP TIMEOUT:',json.dumps(diagnostic),flush=True)
            raise
        expect(self.page.locator('[data-v32-building]')).to_have_count(7)
        if STAGES: assert_scene(self.page,STAGES)
        assert not self.page.evaluate('window.__qaStartupFrames.some(s=>!s.ready&&(s.viewportVisible||s.paintedGame.length))'), 'A sampled pre-ready paint exposed the reference or interactive game'
        assert not any(not frame.get('ready') and (frame['viewportVisible'] or frame['paintedGame']) for frame in self.frames), 'An earlier document exposed the game before readiness'
        assert self.page.evaluate('typeof window.__HARBORLIGHT_DEV_STATE__ === "undefined" && typeof window.__HARBORLIGHT_DEV_FIXTURE__ === "undefined"')
        assert not self.errors,self.errors
        cloud.no_island_cache(self.page)

    def close(self):
        for routes in self.held.values():
            for route in routes:
                try:route.abort('aborted')
                except Exception:pass
        self.held.clear()
        self.context.close()


def run():
    report=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
        try:
            for width,height in [(1440,1000),(390,844)]:
                app=Startup(browser,width,height,staged=True)
                try:
                    app.start()
                    for phase in PHASES:
                        app.wait_held(phase)
                        if phase=='module':
                            app.page.wait_for_function('document.querySelector("#worldLayer canvas") || getComputedStyle(document.querySelector("#viewport")).visibility === "hidden" || getComputedStyle(document.querySelector("#viewport")).display === "none"')
                        app.blocked(phase);app.release(phase)
                    app.ready()
                    if width<901:
                        app.page.locator('[data-mobile-category="administration"]').click()
                        target=app.page.locator('[data-mobile-building="warehouse"]');target.scroll_into_view_if_needed();target.click()
                    else:
                        app.page.locator('#hit-world-warehouse .map-hitshape').click()
                    expect(app.page.locator('[data-building-panel="warehouse"]')).to_be_visible()
                    app.page.screenshot(path=str(OUTPUT/f'ready-{width}.png'))
                    report.append({'width':width,'delayed_phases':list(PHASES),'no_exposed_pre_ready_frames':True,'functional_current_game':True,'sampled_frames':len(app.frames)})
                    print('PASS startup phases and functional game:',width,flush=True)
                finally:app.close()
                app=Startup(browser,width,height,staged=True,intro=True)
                try:
                    art_phase=STAGE_IMAGE_PHASE if STAGES else 'accepted'
                    for phase in PHASES:
                        if phase!=art_phase:app.released.add(phase)
                    app.start();app.wait_held(art_phase);app.blocked('intro-art')
                    app.release(art_phase);app.ready()
                    expect(app.page.locator('[data-island-onboarding]')).to_be_visible()
                    assert cloud.cloud_state(UID)['population']==18 and cloud.cloud_state(UID)['welcomeWorkers']['granted']==0, 'Asset readiness must not complete the introduction or grant its welcome resident'
                    report.append({'width':width,'intro_waits_for_complete_art':True,'intro_reachable_after_reveal':True})
                    print('PASS gated new-player intro:',width,flush=True)
                finally:app.close()
                app=Startup(browser,width,height,staged=True)
                try:
                    for phase in PHASES:
                        if phase!='ambient':app.released.add(phase)
                    app.start();app.wait_held('ambient')
                    canvas=app.page.locator('#island-ambient')
                    canvas.dispatch_event('contextlost',{'cancelable':True})
                    expect(canvas).to_have_attribute('data-mode','context-lost')
                    app.blocked('canvas-context-lost')
                    app.release('ambient')
                    expect(app.page.locator('#loading[role="alert"]')).to_be_visible()
                    app.blocked('canvas-context-error',alert=True)
                    app.page.get_by_role('button',name='Spróbuj ponownie',exact=True).click()
                    app.ready()
                    report.append({'width':width,'canvas_presentation_event':'contextlost before ambient assets ready','accessible_error':True,'retry_recovers_current_game':True,'sampled_frames':len(app.frames)})
                    print('PASS canvas context-loss presentation/retry:',width,flush=True)
                finally:app.close()
                current_house=Path(STAGES['buildings']['house']['sprites'][0]['src']).name if SPRITES else 'house.webp'
                failed_assets=('harborlight-v1-play.js','harborlight-v1-approved.png','manifest.json',current_house,'terrain.webp','harborlight-inhabitants-clean.png','harborlight-v1-play.css') if SPRITES else ('harborlight-v1-play.js','harborlight-v1-approved.png','manifest.json','house.webp','terrain.webp','crane.webp','harborlight-windmill-clean.png','harborlight-v1-play.css') if STAGES else ('harborlight-v1-play.js','harborlight-v1-approved.png','harborlight-farm-forest-approved-v32.png','harborlight-windmill-clean.png','harborlight-v1-play.css')
                for failed in failed_assets:
                    app=Startup(browser,width,height,fail=failed)
                    try:
                        app.start()
                        error=app.page.locator('#loading [role="alert"],#loading[role="alert"]')
                        expect(error.first).to_be_visible(timeout=30000)
                        app.blocked('error-'+failed,alert=True)
                        retry=app.page.get_by_role('button',name=re.compile(r'Odśwież|Ponów|Spróbuj|Wczytaj|Retry|Reload',re.I)).first
                        expect(retry).to_be_visible();expect(retry).to_be_enabled();retry.click()
                        app.ready()
                        report.append({'width':width,'failed_asset':failed,'accessible_error':True,'retry_recovers_current_game':True,'sampled_frames':len(app.frames)})
                        print('PASS startup error/retry:',width,failed,flush=True)
                    finally:app.close()
                if SPRITES:
                    app=Startup(browser,width,height,fail=Path(STAGES['crane']['src']).name,construction=True)
                    try:
                        app.start()
                        expect(app.page.locator('#loading[role="alert"]')).to_be_visible(timeout=30000)
                        app.blocked('active-construction-crane-error',alert=True)
                        app.page.get_by_role('button',name='Spróbuj ponownie',exact=True).click()
                        app.ready()
                        expect(app.page.locator('[data-building-construction-crane="farm"]')).to_have_count(1)
                        report.append({'width':width,'active_construction_crane_is_required':True,'accessible_error':True,'retry_recovers_current_game':True,'sampled_frames':len(app.frames)})
                        print('PASS active-construction crane error/retry:',width,flush=True)
                    finally:app.close()
                app=Startup(browser,width,height,cloud_failure=True)
                try:
                    app.start();alert=app.page.locator('[data-cloud-startup-blocked]')
                    expect(alert).to_be_visible();app.blocked('cloud-error',alert=True)
                    app.cloud_failure=False
                    alert.get_by_role('button',name=re.compile('Spróbuj|Retry',re.I)).click()
                    app.ready()
                    report.append({'width':width,'cloud_retry_accessible':True,'cloud_retry_preserves_identity':True})
                    print('PASS cloud retry:',width,flush=True)
                finally:app.close()
                app=Startup(browser,width,height,authenticated=False)
                try:
                    app.start(wait_loading=False)
                    app.page.wait_for_url('**/harborlight-auth.html?mode=login')
                    expect(app.page.locator('#account-fields')).to_be_enabled()
                    expect(app.page.locator('.guest-entry')).to_be_hidden()
                    assert not any(not frame.get('ready') and (frame['viewportVisible'] or frame['paintedGame']) for frame in app.frames), 'Anonymous navigation exposed the old game before Auth'
                    report.append({'width':width,'anonymous_redirects_to_real_auth':True})
                    print('PASS actual anonymous Auth redirect:',width,flush=True)
                finally:app.close()
        finally:browser.close()
    (OUTPUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('PASS startup: no old reference frame during delayed module/Auth/cloud/art; accessible desktop/mobile progress, image-error retry, cloud retry, real Auth redirect and current interactive game.')


if __name__=='__main__':run()
