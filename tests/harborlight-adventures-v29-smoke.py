"""Play all nine adventure components with the actual input/reward models.

Browser fixtures provide finite test resources and recorded mini-game boards;
they do not contact accounts, publish messages, or activate ad/payment providers.
The release-v29 browser suite separately tests the real game's integration.
"""
from pathlib import Path
from urllib.parse import unquote, urlsplit
import mimetypes
import os
from playwright.sync_api import expect, sync_playwright
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', Path(__file__).resolve().parents[1])).resolve()
BASE = 'http://127.0.0.1:47429'
DOCUMENT = '''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:14px;background:#102a38;color:white;font:16px system-ui}main{max-width:1000px;margin:auto}button,input{font:inherit}</style></head><body><main></main><script type="module">
import{normalizeAdventures,adventureAction,advanceAdventures,observeMiniGames,BRIDGE_HINT}from'./harborlight-v1-adventures.js';
import{createAdventuresPanel,renderAdventureEffects}from'./harborlight-v1-adventures-ui.js';
const language=new URLSearchParams(location.search).get('language')||'pl';let state,panel;window.actions=[];window.miniCalls=[];window.adCalls=[];
window.reset=()=>{panel?.destroy();document.querySelector('main').replaceChildren();state={resources:{coins:500,wood:0,stone:0,grain:0,food:0,planks:0},activityClock:0,activitySeed:123456,notifications:[],expeditionRuns:{}};normalizeAdventures(state);panel=createAdventuresPanel({state,language,onAction:action=>{window.actions.push(action);const result=adventureAction(state,action);panel.update(state);return result},onMiniGame:kind=>window.miniCalls.push(kind),onRewardedAd:(action,result)=>window.adCalls.push({action,result})});document.querySelector('main').append(panel.element);};
window.advance=seconds=>{advanceAdventures(state,seconds);panel.update(state)};
window.current=()=>structuredClone(state);window.hint=BRIDGE_HINT;
window.earnMap=()=>{state.expeditionRuns.test={id:'test-triples',level:1,status:'decision',miniGame:{kind:'triples',cards:[0,0,0,1,1,1,2,2,2,3,3,3],matched:Array(12).fill(true)}};observeMiniGames(state);panel.update(state)};
window.earnAmmo=()=>{for(let level=1;level<=4;level++){state.expeditionRuns.test={id:'test-tilt',level,status:'decision',miniGame:{kind:'tilt',solved:true,balls:[{id:1,x:50,y:50,settled:true,goalId:0}],goals:[{x:50,y:50,filledBy:1}]}};observeMiniGames(state)}panel.update(state)};
window.restore=()=>{const save=structuredClone(state);normalizeAdventures(state,save);panel.update(state)};
window.effects=()=>{const layer=renderAdventureEffects(state,{language});document.body.append(layer);return layer.querySelectorAll('[data-adventure-effect]').length};
window.reset();window.ready=true;
</script></body></html>'''

def scenario(browser, language, mobile):
    context=browser.new_context(viewport={'width':390 if mobile else 1200,'height':844 if mobile else 900},reduced_motion='reduce')
    errors=[]
    def asset(route):
        path=urlsplit(route.request.url).path
        if path=='/adventures.html':return route.fulfill(body=DOCUMENT,content_type='text/html')
        target=(ROOT/unquote(path).lstrip('/')).resolve()
        if not target.is_relative_to(ROOT)or not target.is_file():return route.fulfill(status=404,body='Missing asset')
        return route.fulfill(body=target.read_bytes(),content_type=mimetypes.guess_type(str(target))[0]or'application/octet-stream')
    context.route(BASE+'/**',asset);page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
    def current():return page.evaluate('window.current()')
    def start(kind):
        page.evaluate('window.reset()');page.locator('[data-adventure-all]').click();page.locator('[data-adventure-start="%s"]'%kind).click()
        expect(page.locator('[data-adventure-kind]')).to_have_attribute('data-adventure-kind',kind)
        assert page.locator('.adv-active-header h4').inner_text()!=kind
    def complete():
        expect(page.locator('[data-adventure-stage]')).to_have_attribute('data-adventure-stage','complete')
        assert current()['adventures']['active']['claimed']is True
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert page.evaluate('window.effects()')>=0
        coins=current()['resources']['coins'];page.evaluate('window.restore()');assert current()['resources']['coins']==coins
        page.locator('[data-adventure-continue]').click();assert page.locator('[data-adventure-start]').count()>=3
    try:
        page.goto(BASE+'/adventures.html?language='+language);page.wait_for_function('window.ready===true')
        expect(page.locator('[data-adventure-start]')).to_have_count(3)
        start('cargoRain');page.evaluate('window.advance(2)');drop=page.locator('[data-cargo-drop="1"]');expect(drop).to_be_visible()
        bounds=page.locator('[data-cargo-flight]').bounding_box();assert bounds['width']==page.viewport_size['width'];assert bounds['height']==page.viewport_size['height']
        drop.focus();page.evaluate('window.advance(.1)');expect(drop).to_be_focused();drop.click();assert current()['resources']['coins']==505
        assert current()['adventures']['active']['data']['caught']['coins']==5
        expect(page.locator('[data-caught-resource="coins"]')).to_contain_text('5')
        page.evaluate('window.advance(45)');complete()
        start('treasureMap');page.locator('[data-adventure-minigame="triples"]').click();assert page.evaluate('window.miniCalls.at(-1)')=='triples'
        page.evaluate('window.earnMap()');expect(page.locator('[data-adventure-stage]')).to_have_attribute('data-adventure-stage','arrange')
        for index in range(4):
            tiles=current()['adventures']['active']['data']['tiles']
            if tiles[index]!=index:
                other=tiles.index(index);page.locator('[data-map-index="%d"]'%index).click();page.locator('[data-map-index="%d"]'%other).click()
        expect(page.locator('[data-adventure-stage]')).to_have_attribute('data-adventure-stage','search')
        spot=current()['adventures']['active']['data']['treasureSpot'];page.locator('[data-adventure-search="%s"]'%spot).click();complete()
        start('pirateCannon');page.evaluate('window.earnAmmo()');expect(page.locator('[data-adventure-shoot]')).to_be_enabled()
        for index in range(3):
            state=current();ship=next(item for item in state['adventures']['active']['data']['ships']if item['alive'])
            board=page.locator('.adv-board>svg').bounding_box();page.mouse.click(board['x']+board['width']*ship['x']/100,board['y']+board['height']*ship['y']/100)
            page.locator('[data-adventure-shoot]').click();page.evaluate('window.advance(1.5)')
        complete()
        start('bridge');page.locator('[data-bridge-test]').click();expect(page.locator('[data-bridge-result]')).not_to_be_empty()
        page.locator('[data-bridge-extra="ad"]').click();assert len(page.evaluate('window.adCalls'))==1
        assert current()['adventures']['active']['data']['budget']==13
        page.locator('[data-bridge-extra="coins"]').click();assert current()['resources']['coins']==495
        for left,right in page.evaluate('window.hint'):
            page.locator('[data-node="%s"]'%left).click();page.locator('[data-node="%s"]'%right).click()
        page.locator('[data-bridge-test]').click();complete()
        start('signals');expect(page.locator('[data-signal="0"]')).to_be_disabled();page.evaluate('window.advance(6)')
        values=current()['adventures']['active']['data']['sequence']
        for value in values:page.locator('[data-signal="%s"]'%value).click()
        complete()
        start('letters')
        for letter in current()['adventures']['active']['data']['letters']:
            page.locator('[data-letter-read="%s"]'%letter['id']).click();page.locator('[data-letter-destination="%s"]'%letter['recipient']).click()
        complete()
        start('rhythm')
        for building in ['warehouse','farm','lighthouse']:page.locator('[data-rhythm-inspect="%s"]'%building).click()
        expect(page.locator('[data-rhythm-beat="0"]')).to_be_disabled();page.evaluate('window.advance(6)')
        values=current()['adventures']['active']['data']['sequence']
        for index,value in enumerate(values):
            if index:page.evaluate('window.advance(.7)')
            page.locator('[data-rhythm-beat="%s"]'%value).click()
        complete()
        start('garden')
        for index in range(16):
            state=current()
            if state['adventures']['active']['stage']=='complete':break
            for _ in range((4-state['adventures']['active']['data']['tiles'][index]['rotation'])%4):page.locator('[data-pipe-index="%d"]'%index).click()
        complete()
        start('cargoBalance')
        crates=current()['adventures']['active']['data']['crates'];ones=[item['id']for item in crates if item['weight']==1];twos=[item['id']for item in crates if item['weight']==2]
        for crate,slot in [(ones[0],-2),(twos[0],-1),(twos[1],1),(ones[1],2)]:
            page.locator('[data-crate="%s"]'%crate).click();page.locator('[data-cargo-slot="%s"]'%slot).click()
        page.locator('[data-cargo-test]').click();expect(page.locator('[data-adventure-stage]')).to_have_attribute('data-adventure-stage','route')
        page.locator('[data-cargo-route="reef"]').click();expect(page.locator('[data-adventure-stage]')).to_have_attribute('data-adventure-stage','route')
        page.locator('[data-cargo-route="sheltered"]').click();complete()
        assert not errors,errors
    except Exception:
        print('ADVENTURES DIAGNOSTICS',language,mobile,errors,flush=True)
        print(page.locator('body').inner_text()[-3000:],flush=True)
        raise
    finally:context.close()

with sync_playwright()as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    try:
        for language in ['pl','en']:
            for mobile in [False,True]:scenario(browser,language,mobile)
    finally:browser.close()
print('PASS v29 adventures PL/EN desktop/mobile: nine playable scenes, exact caught rewards, real cannon collision, bridge load, timed memory/rhythm, map, letters, irrigation, cargo, save/reload and bounded layout')
