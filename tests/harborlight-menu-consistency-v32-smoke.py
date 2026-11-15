"""Check common menu card, form and header geometry at desktop/mobile widths."""
import json
import mimetypes
import os
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright
from helpers.browser_offers import acknowledge_daily_offer

SOURCE=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',SOURCE)).resolve()
BASE='http://127.0.0.1:47449'
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import {createState} from './harborlight-v1-state.js';import * as Development from './harborlight-v1-development.js';
const state=createState(Date.now(),{ruleset:32});state.settings.language='pl';state.tutorial.autoOpenDisabled=true;
state.buildings.townhall.level=5;state.buildings.house.level=5;state.buildings.warehouse.level=5;
Development.settleDevelopment(state,{});console.log(JSON.stringify(state));
"""],cwd=SOURCE))
acknowledge_daily_offer(fixture)

def asset(route):
    target=(ROOT/unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if not target.is_relative_to(ROOT) or not target.is_file():
        route.fulfill(status=404,body='Missing isolated fixture asset');return
    if target.name=='harborlight-v1-play.js':
        route.fulfill(content_type='text/javascript',body=target.read_text()+'\nwindow.__layoutOpenPanel=openPanel;')
    else:
        route.fulfill(path=str(target),content_type=mimetypes.guess_type(target)[0] or 'application/octet-stream')

def boxes(nodes):
    return nodes.evaluate_all('''nodes=>nodes.filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom}})''')

reports=[]
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for width,height in [(1440,1000),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height});page.route(BASE+'/**',asset)
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(fixture))
        page.goto(BASE+'/harborlight-v1-layered.html',wait_until='networkidle')
        page.wait_for_function('typeof window.__layoutOpenPanel==="function"')
        checked=[]
        for kind in ['menu','settings','premium','kingdom','buildings','workers','residents','resources']:
            page.evaluate('kind=>window.__layoutOpenPanel(kind)',kind)
            dialog=page.locator('#island-dialog');dialog.wait_for(state='visible')
            assert dialog.locator('.dialog-body').evaluate('e=>e.scrollWidth<=e.clientWidth+1'),(width,kind,'horizontal overflow')
            controls=boxes(dialog.locator('button.action'))
            assert all(r['h']>=43.9 for r in controls),(width,kind,'short action',controls)
            header=dialog.locator('.dialog-header');feedback=header.locator('.dialog-header-feedback')
            assert feedback.count()==1,(width,kind,'missing permanent header feedback')
            before=header.bounding_box();body_y=dialog.locator('.dialog-body').bounding_box()['y']
            feedback.evaluate('e=>{e.textContent="Pracownicy: 3. Pracownicy docierają do miejsca pracy w 2 minuty.";}')
            after=header.bounding_box()
            assert abs(before['height']-after['height'])<.1 and abs(body_y-dialog.locator('.dialog-body').bounding_box()['y'])<.1,(width,kind,'feedback moved content')
            if kind=='settings':
                footer=dialog.locator('.dialog-footer');assert footer.count()==1
                actions=boxes(footer.locator('button.action'));assert len(actions)==3
                assert abs(actions[0]['w']-actions[1]['w'])<1.1,(width,kind,actions)
                if width<600:assert max(r['w'] for r in actions)-min(r['w'] for r in actions)<1.1
            if kind=='premium':
                for form in dialog.locator('.promo-code-fields').all():
                    field=boxes(form.locator('input,select'))[0];button=boxes(form.locator('button.action'))[0]
                    assert abs(field['h']-44)<1.1 and abs(button['h']-44)<1.1,(width,kind,field,button)
                    if width>1100:assert abs(field['b']-button['b'])<1.1,(width,kind,'form baseline',field,button)
            if kind=='kingdom':
                tabs=boxes(dialog.locator('.hl-kingdom-tabs>button'));assert len(tabs)==4
                assert max(r['w'] for r in tabs)-min(r['w'] for r in tabs)<1.1,(width,kind,tabs)
                assert dialog.locator('.hl-kingdom-panel').evaluate('e=>getComputedStyle(e).backgroundColor')=='rgba(0, 0, 0, 0)'
            checked.append(kind)
            dialog.locator('.dialog-close').click()
        assert not errors,errors
        reports.append({'width':width,'menus':checked,'header_feedback_stable':True,'controls_min_height':44,'horizontal_overflow':False,'js_errors':errors})
        page.close()
    browser.close()
print(json.dumps(reports,ensure_ascii=False))
print('PASS common menu geometry: stable header feedback, 44px actions/forms, equal settings actions and Kingdom tabs, desktop/mobile bounds.')
