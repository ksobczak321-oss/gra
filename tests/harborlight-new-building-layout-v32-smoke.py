"""Balanced development building cards in the actual desktop and phone dialogs."""
import json
import mimetypes
import os
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright
from helpers.browser_offers import dismiss_player_offers, acknowledge_daily_offer

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
BASE = 'http://127.0.0.1:47447'
OUTPUT = Path(os.environ.get('HARBORLIGHT_LAYOUT_OUTPUT', '/tmp/harborlight-new-building-layout'))
OUTPUT.mkdir(parents=True, exist_ok=True)
BUILDINGS = ['bakery','dairy','slaughterhouse','fisher','leatherworks','academy','barracks']
fixture = json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import {createState} from './harborlight-v1-state.js';
const s=createState(Date.now(),{ruleset:32});s.settings.language='pl';s.tutorial.autoOpenDisabled=true;
s.buildings.townhall.level=5;s.buildings.house.level=5;s.buildings.warehouse.level=5;
for(const id of ['bakery','dairy','slaughterhouse','fisher','leatherworks','academy','barracks'])s.buildings[id].level=1;
s.buildings.fisher.level=5;s.education.discoveries.fishProcessing=true;
console.log(JSON.stringify(s));
"""], cwd=SOURCE))
acknowledge_daily_offer(fixture)

def asset(route):
    target = (ROOT / unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if target.is_relative_to(ROOT) and target.is_file():
        route.fulfill(path=str(target),content_type=mimetypes.guess_type(target)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404,body='Missing fixture asset')

report=[]
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for width,height in [(1440,1000),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        page.route(BASE+'/**',asset)
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(fixture))
        page.goto(BASE+'/harborlight-v1-layered.html',wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"')
        dismiss_player_offers(page)
        for building in BUILDINGS:
            page.locator('#hit-world-'+building).evaluate('(e)=>e.click()')
            panel=page.locator('[data-v32-panel="'+building+'"]');panel.wait_for(state='visible')
            columns=panel.locator(':scope > .v32-panel-layout > [data-v32-column]')
            assert columns.count()==2,(width,building,'missing semantic columns')
            left,right=columns.nth(0).bounding_box(),columns.nth(1).bounding_box()
            assert abs(left['width']-right['width'])<1.1,(width,building,left,right)
            if width>900:
                assert abs(left['y']-right['y'])<1.1 and right['x']>left['x']+left['width'],(building,left,right)
            else:
                assert abs(left['x']-right['x'])<1.1 and right['y']>=left['y']+left['height'],(building,left,right)
            assert panel.locator('.v32-building-summary h2').count()==0,'The dialog already names the building'
            assert panel.locator('summary',has_text='Więcej o budynku').count()==0
            assert panel.get_by_role('heading',name='Zasady działania',exact=True).count()+panel.locator('summary',has_text='Zasady działania').count()==1
            assert page.locator('#island-dialog .dialog-body').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),(width,building,'overflow')
            for geometry in panel.locator('.v32-recipe').evaluate_all('''els=>els.map(e=>{const a=e.querySelector('input').getBoundingClientRect(),b=e.querySelector('button').getBoundingClientRect();return {input:a.height,button:b.height,top:Math.abs(a.top-b.top),bottom:Math.abs(a.bottom-b.bottom),gap:b.left-a.right}})'''):
                assert geometry['input']>=43.9 and geometry['button']>=43.9,(width,building,geometry)
                assert geometry['top']<1.1 and geometry['bottom']<1.1 and geometry['gap']>=6,(width,building,geometry)
            cards=columns.evaluate_all('''cols=>cols.map(col=>{const r=col.getBoundingClientRect();return [...col.children].map(e=>{const c=e.getBoundingClientRect();return {width:c.width,parent:r.width,left:c.left-r.left,right:r.right-c.right}})})''')
            assert all(abs(c['width']-c['parent'])<1.1 and abs(c['left'])<1.1 for group in cards for c in group),(width,building,cards)
            if building=='fisher':
                # Discovery rows are obtained from the real model, never a visual-only fallback.
                assert panel.locator('[data-v32-workers="smokedFish"]').count()==1
                assert panel.locator('[data-v32-workers="fishPreserves"]').count()==1
            if building=='academy':
                assert columns.nth(0).get_by_role('heading',name='Rozpocznij naukę',exact=True).count()==1
                assert columns.nth(1).get_by_role('heading',name='Badania i odkrycia',exact=True).count()==1
                assert 'Wskaż produkt oraz dwa budynki trasy.' not in columns.nth(1).inner_text(), 'The selected route must show its real quote'
            if building=='barracks':
                assert columns.nth(0).get_by_role('heading',name='Rekrutacja',exact=True).count()==1
                assert columns.nth(1).get_by_role('heading',name='Wyprawa oddziału',exact=True).count()==1
            if building in ['dairy','academy','barracks','fisher']:
                page.screenshot(path=str(OUTPUT/f'{building}-{width}.png'))
            report.append({'width':width,'building':building,'columns_equal':True,'left_height':round(left['height']),'right_height':round(right['height']),'overflow':False})
            page.locator('#island-dialog .dialog-close').click()
        assert not errors,errors
        page.close()
    browser.close()
(OUTPUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
print('PASS 14 real building views: equal task columns, consistent card edges, 44px recipe controls, no duplicate title, working fish discovery rows, desktop/mobile without overflow.')
