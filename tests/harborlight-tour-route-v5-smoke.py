"""Walk the actual first introduction through all 56 grouped targets.

Only the fresh in-memory loopback fixture is injected. Naming, every Next,
viewport layout, smiley demo, tab changes and finishing use the real interface.
"""
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
BASE = 'http://127.0.0.1:47438'
OUTPUT = Path(os.environ.get('HARBORLIGHT_TEST_OUTPUT', '/tmp/harborlight-tour-route-v5'))
OUTPUT.mkdir(parents=True, exist_ok=True)
fixture = json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import {createState} from './harborlight-v1-state.js';
import {APPROVED_TOUR_IDS,APPROVED_TOUR_VERSION} from './harborlight-v1-approved-copy.js';
console.log(JSON.stringify({state:createState(Date.now(),{ruleset:32,onboarding:true}),ids:APPROVED_TOUR_IDS,version:APPROVED_TOUR_VERSION}));
"""], cwd=SOURCE))
assert fixture['version'] == 5 and len(fixture['ids']) == 56
acknowledge_daily_offer(fixture['state'])
LOWER = ['administration','economy','resources','decorations','paths']
SNAPSHOT = """()=>{const s=window.__HARBORLIGHT_DEV_STATE__;return {
worldTimeMs:s.worldTimeMs,lastSimulatedAt:s.lastSimulatedAt,population:s.population,
resources:s.resources,buildings:s.buildings,residents:s.residents,tutorial:s.tutorial};}"""


def asset(route):
    target=(ROOT / unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if target.is_relative_to(ROOT) and target.is_file():
        route.fulfill(path=str(target), content_type=mimetypes.guess_type(target)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='Missing fixture asset')


def bounded(page, selector):
    target=page.locator(selector)
    expect(target).to_be_visible()
    rect=target.bounding_box()
    assert rect and rect['width']>0 and rect['height']>0, (selector,rect)
    viewport=page.viewport_size
    assert rect['x']>=-1 and rect['y']>=-1, (selector,rect,viewport)
    assert rect['x']+rect['width']<=viewport['width']+1, (selector,rect,viewport)
    assert rect['y']+rect['height']<=viewport['height']+1, (selector,rect,viewport)
    return rect


report=[]
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for width,height,touch in [(1440,1000,False),(390,844,True)]:
        context=browser.new_context(viewport={'width':width,'height':height},has_touch=touch,reduced_motion='reduce')
        context.route(BASE+'/**',asset)
        page=context.new_page()
        page.set_default_timeout(12000)
        errors=[];failed=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('response',lambda response:failed.append((response.status,response.url)) if response.status>=400 else None)
        page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(fixture['state']))
        assert page.goto(BASE+'/harborlight-v1-layered.html?profile=new-player',wait_until='networkidle').ok
        guide=page.locator('[data-island-onboarding]')
        expect(guide).to_have_attribute('data-onboarding-stage','intro')
        page.locator('[data-onboarding-next]').click()
        expect(guide).to_have_attribute('data-onboarding-stage','name')
        page.locator('[data-onboarding-name]').fill('Przystań Podświetleń')
        page.locator('[data-onboarding-next]').click()
        expect(guide).to_have_attribute('data-onboarding-stage','tour')
        before=page.evaluate(SNAPSHOT)
        seen=[];tab_records=[];smiley_record=None
        for index,identity in enumerate(fixture['ids']):
            expect(guide).to_have_attribute('data-onboarding-step',identity)
            expect(page.locator('[data-onboarding-highlight]')).to_have_attribute('data-target',identity)
            seen.append(identity)
            frame=bounded(page,'[data-onboarding-highlight]')
            for selector in ['[data-onboarding-card]','[data-onboarding-next]','[data-onboarding-previous]','[data-onboarding-exit]']:
                bounded(page,selector)
            expect(page.locator('[data-onboarding-counter]')).to_contain_text(f'{index+1} z 56')
            assert page.locator('[data-onboarding-card]').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),identity
            if identity=='clothing':
                expect(page.locator('[data-onboarding-title]')).to_have_text('Ubrani')
            if identity=='producer-storage':
                face=page.locator('#hit-world-farm [data-production-penalty="farm"]')
                expect(face).to_be_visible()
                box=face.bounding_box()
                assert abs(frame['x']-(box['x']-4))<=2,(frame,box)
                assert abs(frame['y']-(box['y']-4))<=2,(frame,box)
                assert abs(frame['width']-(box['width']+8))<=2,(frame,box)
                assert abs(frame['height']-(box['height']+8))<=2,(frame,box)
                assert frame['width']<100 and frame['height']<100,'The highlight must cover the face, not the Farm'
                smiley_record={'highlight':frame,'face':box}
                page.screenshot(path=str(OUTPUT/f'smiley-{width}.png'))
            elif index>fixture['ids'].index('producer-storage'):
                assert not page.evaluate('document.body.hasAttribute("data-tour-storage-demo")'),identity
            if identity.startswith('category-'):
                category=identity.removeprefix('category-')
                expect(page.locator('#hit-category-'+category)).to_have_attribute('aria-pressed','true')
                tab_records.append(category)
                page.screenshot(path=str(OUTPUT/f'tab-{category}-{width}.png'))
            current=page.evaluate(SNAPSHOT)
            assert current==before, f'Tour step {index+1}/{identity} changed clock, stock, workers or practical history'
            page.locator('[data-onboarding-next]').click()
        expect(guide).not_to_be_visible()
        after=page.evaluate('window.__HARBORLIGHT_DEV_STATE__')
        assert after['onboarding']['stage']=='complete'
        assert after['onboarding']['worldStartedAt'] is not None
        assert seen==fixture['ids']
        assert tab_records==LOWER
        assert seen.index('building-townhall')<seen.index('building-theatre')<seen.index('building-dock')<seen.index('category-administration')
        assert not errors,errors
        assert not failed,failed
        assert page.evaluate('Object.keys(localStorage).filter(k=>k!=="harborlight-language")')==[]
        assert page.evaluate('Object.keys(sessionStorage)')==[]
        report.append({'width':width,'steps':len(seen),'all_highlights_bounded':True,'grouped_top_buildings_bottom':True,'lower_tabs':tab_records,'smiley':smiley_record,'practical_and_world_frozen':True,'finished_normally':True,'errors':errors})
        context.close()
    browser.close()
(OUTPUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
print('PASS actual first tutorial: all56 grouped targets, native Theatre with buildings, five bottom tabs, Ubrani, smiley-only frame, frozen stock/workers/practical history; desktop/mobile.')
