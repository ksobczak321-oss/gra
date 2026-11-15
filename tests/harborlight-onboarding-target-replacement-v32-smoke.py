"""An active tour follows a real dock control after the dock replaces its DOM."""
import json
import mimetypes
import os
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright

SOURCE=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',SOURCE)).resolve()
BASE='http://127.0.0.1:47483'
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import {createState} from './harborlight-v1-state.js';
import {APPROVED_TOUR_IDS} from './harborlight-v1-approved-copy.js';
const state=createState(Date.now(),{ruleset:32,onboarding:true});
state.islandName='Przystań Ramki';state.settings.language='pl';
state.onboarding.stage='tour';state.onboarding.index=APPROVED_TOUR_IDS.indexOf('category-resources');
console.log(JSON.stringify(state));
"""],cwd=SOURCE))
SNAPSHOT='''()=>{const s=window.__HARBORLIGHT_DEV_STATE__;return {worldTimeMs:s.worldTimeMs,lastSimulatedAt:s.lastSimulatedAt,resources:s.resources,buildings:s.buildings,residents:s.residents,tutorial:s.tutorial}}'''


def asset(route):
    file=(ROOT/unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if file.is_relative_to(ROOT) and file.is_file():
        route.fulfill(path=str(file),content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404,body='Missing tour regression asset')


def follows_real_target(page,selector):
    highlight=page.locator('[data-onboarding-highlight]')
    expect(highlight).to_be_visible()
    page.wait_for_function('''selector=>{const target=document.querySelector(selector),frame=document.querySelector('[data-onboarding-highlight]');if(!target||!frame||frame.hidden)return false;const r=target.getBoundingClientRect(),f=frame.getBoundingClientRect();return Math.abs(f.x-r.x+4)<2&&Math.abs(f.y-r.y+4)<2&&Math.abs(f.width-r.width-8)<2&&Math.abs(f.height-r.height-8)<2}''',arg=selector)


report=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for width,height,touch in [(1440,1000,False),(390,844,True)]:
        page=browser.new_page(viewport={'width':width,'height':height},has_touch=touch,reduced_motion='reduce')
        page.route(BASE+'/**',asset)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(fixture))
        page.goto(BASE+'/harborlight-v1-layered.html?profile=new-player',wait_until='networkidle')
        expect(page.locator('[data-island-onboarding]')).to_have_attribute('data-onboarding-step','category-resources')
        selector='[data-mobile-category="resources"]' if touch else '#hit-category-resources'
        follows_real_target(page,selector)
        before=page.evaluate(SNAPSHOT)
        page.locator(selector).evaluate('''target=>{const replacement=target.cloneNode(true);target.replaceWith(replacement);window.dispatchEvent(new Event('resize'))}''')
        follows_real_target(page,selector)
        # The replacement must also be observed, not merely found once. Its
        # resize schedules the real highlight without an explicit window event.
        page.locator(selector).evaluate('target=>target.style.minHeight="64px"')
        follows_real_target(page,selector)
        assert page.evaluate(SNAPSHOT)==before,'Following a visual target advanced the frozen world'
        assert not errors,errors
        report.append({'width':width,'detached_target_replaced':True,'replacement_resize_observed':True,'frozen_world_unchanged':True,'errors':errors})
        page.close()
    browser.close()
print(json.dumps(report,ensure_ascii=False))
print('PASS tour DOM replacement: highlight follows the current dock button and its later resize, without advancing the frozen world; desktop/mobile.')
