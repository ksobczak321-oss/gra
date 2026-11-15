"""Warehouse sections and production column bounds in the real DEV interface."""
import json
import mimetypes
import os
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright
from helpers.browser_offers import acknowledge_daily_offer

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
BASE = 'http://127.0.0.1:47439'
fixture = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', """
import {createState} from './harborlight-v1-state.js';
const s=createState(Date.now(),{ruleset:32});s.settings.language='pl';s.tutorial.autoOpenDisabled=true;
s.buildings.townhall.level=6;s.buildings.house.level=6;s.buildings.warehouse.level=5;
for(const id of Object.keys(s.resources))s.resources[id]=100000;
console.log(JSON.stringify(s));
"""], cwd=SOURCE))
acknowledge_daily_offer(fixture)


def asset(route):
    target = (ROOT / unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if target.is_relative_to(ROOT) and target.is_file():
        route.fulfill(path=str(target), content_type=mimetypes.guess_type(target)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='Missing fixture asset')


def open_building(page, building):
    page.locator('#hit-world-'+building).evaluate('(e)=>e.click()')
    page.locator('#island-dialog[open]').wait_for()


def close(page):
    page.locator('#island-dialog .dialog-close').click()


report=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for width,height in [(1440,1000),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height},has_touch=width<600)
        page.route(BASE+'/**',asset)
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(fixture))
        page.goto(BASE+'/harborlight-v1-layered.html',wait_until='networkidle')
        open_building(page,'warehouse')
        controls=page.locator('[data-warehouse-controls]')
        toggles=controls.locator('[data-warehouse-section-toggle]')
        expect(toggles).to_have_count(3)
        assert toggles.all_text_contents()==['Przegląd Magazynu','Wyżywienie','Priorytety transportu']
        for toggle in toggles.all():
            expect(toggle).to_have_attribute('aria-expanded','false')
            assert toggle.evaluate('(e)=>parseFloat(getComputedStyle(e).minHeight)')>=44
            assert toggle.bounding_box()['height']>=43.9
        assert controls.locator('[data-v32-food-list]').count()==0,'Food form rendered before its section opens'
        assert controls.locator('[data-transport-priority-list]').count()==0,'Priority editor rendered before click'
        controls.locator('[data-warehouse-section-toggle="feeding"]').click()
        expect(controls.locator('[data-warehouse-section="feeding"]')).to_be_visible()
        limit=controls.locator('[data-v32-food="vegetables"] input[type=number]')
        limit.fill('25')
        page.wait_for_timeout(1200)
        expect(limit).to_have_value('25')
        expect(controls.locator('[data-warehouse-section-toggle="feeding"]')).to_have_attribute('aria-expanded','true')
        controls.get_by_role('button',name='Zapisz ustawienia',exact=True).click()
        expect(page.locator('[data-warehouse-section-toggle="feeding"]')).to_have_attribute('aria-expanded','true')
        assert page.evaluate('window.__HARBORLIGHT_DEV_STATE__.provisions.foodSettings.limits.vegetables')==25
        controls=page.locator('[data-warehouse-controls]')
        controls.locator('[data-warehouse-section-toggle="priorities"]').click()
        expect(controls.locator('[data-warehouse-section="feeding"]')).to_be_hidden()
        expect(controls.locator('[data-warehouse-section="priorities"]')).to_be_visible()
        controls.locator('[data-warehouse-priority="wood"]').click()
        expect(page.locator('[data-warehouse-section-toggle="priorities"]')).to_have_attribute('aria-expanded','true')
        assert 'wood' in page.evaluate('window.__HARBORLIGHT_DEV_STATE__.warehousePriorities')
        controls=page.locator('[data-warehouse-controls]')
        controls.locator('[data-warehouse-section-toggle="overview"]').click()
        expect(controls.locator('[data-warehouse-section="priorities"]')).to_be_hidden()
        expect(controls.locator('[data-warehouse-section="overview"]')).to_be_visible()
        assert controls.locator('[data-carrier-jobs]').count()==1
        controls.locator('[data-warehouse-section-toggle="overview"]').click()
        for toggle in controls.locator('[data-warehouse-section-toggle]').all():expect(toggle).to_have_attribute('aria-expanded','false')
        close(page)
        measurements=[]
        for building in ['windmill','farm','townhall']:
            open_building(page,building)
            geometry=page.locator('[data-building-panel="'+building+'"] .building-layout').evaluate("""e=>{
              const a=e.querySelector('.building-main').getBoundingClientRect(),b=e.querySelector('.building-upgrade-column').getBoundingClientRect();
              return {left:{x:a.x,right:a.right,width:a.width},right:{x:b.x,right:b.right,width:b.width},overflow:[...e.children].flatMap(col=>[...col.children].map(c=>{const r=c.getBoundingClientRect(),p=col.getBoundingClientRect();return {tag:c.className,left:r.left-p.left,right:r.right-p.right}}))};
            }""")
            if width>=1100:assert abs(geometry['left']['width']-geometry['right']['width'])<1,(building,geometry)
            assert all(c['left']>=-1 and c['right']<=1 for c in geometry['overflow']),(building,geometry)
            assert 'null' not in page.locator('#island-dialog .dialog-body').inner_text(),building
            assert page.locator('#island-dialog .dialog-body').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
            measurements.append({'building':building,**geometry})
            close(page)
        assert not errors,errors
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        report.append({'width':width,'sections':3,'initially_closed':True,'food_save':True,'priority_save':True,'section_survives_model_render':True,'columns':measurements,'errors':errors})
        page.close()
    browser.close()
print(json.dumps(report))
print('PASS Warehouse sections: three closed controls, lazy food/overview/priorities, real saves and stable expanded state; equal contained production columns on desktop/mobile.')
