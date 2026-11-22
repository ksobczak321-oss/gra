"""DEV v32 real-interface smoke test with its own ephemeral loopback server.
HARBORLIGHT_BASE_URL can select an existing server. No remote account is used.
"""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import subprocess
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', ROOT)).resolve()
BASE = os.environ.get('HARBORLIGHT_BASE_URL', '').rstrip('/')


@contextmanager
def frontend_base():
    if BASE:
        yield BASE
        return

    class StaticHandler(SimpleHTTPRequestHandler):
        extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                          '.js': 'text/javascript', '.html': 'text/html'}

        def log_message(self, format, *args):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(StaticHandler, directory=str(FRONTEND_ROOT)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield 'http://127.0.0.1:' + str(server.server_port)
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


fixture = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', """
import {createState} from './harborlight-v1-state.js';
const s=createState(Date.now(),{ruleset:32});s.settings.language='pl';s.tutorial.autoOpenDisabled=true;
s.buildings.townhall.level=6;s.buildings.house.level=6;s.buildings.warehouse.level=5;
for(const id of ['bakery','dairy','slaughterhouse','fisher','leatherworks','academy','barracks'])s.buildings[id].level=1;
for(const id of Object.keys(s.resources))s.resources[id]=100000;
s.civilianRescue={version:32,sequence:1,receipts:[],groups:[{id:'rescue-ui',remaining:2,requested:2,originIslandId:'island-1',earnedAt:s.worldTimeMs}]};
console.log(JSON.stringify(s));
"""], cwd=ROOT))

def boot(browser, width, height):
    page=browser.new_page(viewport={'width':width,'height':height})
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(fixture))
    page.goto(BASE+'/harborlight-v1-layered.html', wait_until='networkidle')
    page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"')
    return page, errors

def building(page, building_id):
    page.locator('#hit-world-'+building_id).evaluate('(e)=>e.click()')
    page.locator('#island-dialog[open]').wait_for()

def close(page):
    page.locator('#island-dialog .dialog-close').click()

def state(page, expression):
    return page.evaluate('window.__HARBORLIGHT_DEV_STATE__.'+expression)

with frontend_base() as BASE, sync_playwright() as playwright:
    browser=playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for width,height in [(1440,1000),(390,844)]:
        page,errors=boot(browser,width,height)
        assert page.locator('[data-v32-building]').count()==7
        for building_id in ['bakery','dairy','slaughterhouse','fisher','leatherworks','academy','barracks']:
            building(page,building_id)
            assert page.locator('[data-v32-panel="'+building_id+'"]').count()==1
            assert page.locator('#island-dialog .dialog-body').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
            page.locator('#island-dialog [data-v32-panel="'+building_id+'"]').wait_for(state='visible')
            geometries=page.locator('#island-dialog .v32-recipe').evaluate_all("""els=>els.filter(e=>e.isConnected&&e.querySelector('input')?.getClientRects().length).map(e=>{const a=e.querySelector('input').getBoundingClientRect(),b=e.querySelector('button').getBoundingClientRect();return {top:Math.abs(a.top-b.top),bottom:Math.abs(a.bottom-b.bottom),gap:b.left-a.right,height:a.height,buttonHeight:b.height}})""")
            if building_id in ['bakery','dairy','slaughterhouse','fisher','leatherworks']:
                assert geometries, (width,building_id,'missing production controls')
            for geometry in geometries:
                assert geometry['top']<1.1 and geometry['bottom']<1.1, (width,building_id,geometry)
                assert geometry['height']>=40 and geometry['buttonHeight']>=40, (width,building_id,geometry)
                assert 6<=geometry['gap']<=20, (width,building_id,geometry)
            close(page)
        assert not errors, errors
        page.close()
    page,errors=boot(browser,1440,1000)
    building(page,'bakery')
    page.locator('[data-worker-building="bakery"][data-worker-delta="1"]').click()
    for recipe,amount in [('bread','0'),('cake','1')]:
        control=page.locator('[data-v32-workers="'+recipe+'"]');control.fill(amount)
        page.wait_for_timeout(1200)
        assert control.input_value()==amount, (recipe,'production draft changed during live tick')
        control.locator('xpath=ancestor::form').locator('button[type="submit"]').click()
    assert state(page,'provisions.assignments.bakery.cake')==1, {'building':state(page,'buildings.bakery'),'assignments':state(page,'provisions.assignments.bakery'),'feedback':page.locator('#island-toast').inner_text()}
    close(page)
    building(page,'warehouse')
    page.locator('[data-warehouse-section-toggle="feeding"]').click()
    page.locator('[data-v32-food="vegetables"] input[type=number]').fill('25')
    page.get_by_role('button',name='Zapisz ustawienia',exact=True).click()
    assert state(page,'provisions.foodSettings.limits.vegetables')==25
    page.locator('[data-upgrade-building="warehouse"]').click()
    assert page.locator('[data-v32-construction="warehouse"]').count()==0
    assert page.locator('#development-construction').count()==0
    assert state(page,'buildings.warehouse.construction') is not None
    close(page)
    building(page,'academy')
    form=page.get_by_role('button',name='Zapisz na kurs',exact=True).locator('xpath=ancestor::form')
    form.locator('select').nth(0).select_option(index=1);form.locator('select').nth(1).select_option(index=1)
    form.get_by_role('button').click()
    assert state(page,'education.courses.length')==1
    assert page.get_by_role('button',name='Zbadaj trasę',exact=True).count()==1
    close(page)
    building(page,'barracks')
    form=page.get_by_role('button',name='Rozpocznij szkolenie rekruta',exact=True).locator('xpath=ancestor::form')
    form.locator('select').nth(0).select_option(index=1);form.locator('select').nth(1).select_option(index=1)
    form.get_by_role('button').click()
    assert state(page,'military.courses.length')==1
    close(page)
    building(page,'theatre')
    form=page.get_by_role('button',name='Zaplanuj przedstawienie',exact=True).locator('xpath=ancestor::form')
    form.locator('[data-v32-theatre-audience] summary').click()
    form.locator('[data-v32-theatre-person]').first.check()
    form.get_by_role('button',name='Zaplanuj przedstawienie',exact=True).click()
    assert state(page,'theatre.shows.length')==1
    assert state(page,'theatre.shows[0].coins')==2
    page.get_by_role('button',name='Anuluj przedstawienie',exact=True).click()
    assert state(page,'theatre.shows[0].status')=='cancelled'
    close(page)
    page.locator('#hit-menu').evaluate('(e)=>e.click()');page.get_by_role('button',name='Królestwo',exact=True).click()
    assert page.locator('.hl-kingdom-panel').count()==1
    close(page)
    page.locator('#hit-menu').evaluate('(e)=>e.click()');page.get_by_role('button',name='Ekspedycje',exact=True).click()
    assert page.locator('[data-expedition-choice]').count()==2
    assert page.locator('[data-original-puzzle-choice]').count()==2
    page.locator('[data-original-puzzle-choice="signal-line"]').click()
    page.get_by_role('button',name='Rozpocznij próbę',exact=True).click()
    assert page.locator('.original-puzzle-signal').count()==1
    close(page)
    assert state(page,'originalPuzzles.attempts["signal-line"].status')=='abandoned'
    assert not errors, errors
    browser.close()
print('DEV v32 interface smoke passed: desktop/mobile panels, recipes, meals, food-free construction, academy, barracks, theatre, Kingdom and minigames.')
