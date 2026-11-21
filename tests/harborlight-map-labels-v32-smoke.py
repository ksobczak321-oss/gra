"""Actual map hover/focus labels avoid the HUD, sidebar and dock at all widths.

The loopback fixture uses the real game bytes and map camera. No remote account
or game write is performed; only the read-only tooltip UI is exercised.
"""
import json
import mimetypes
import os
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright
from helpers.browser_offers import acknowledge_daily_offer, dismiss_player_offers

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
OUTPUT = Path(os.environ.get('HARBORLIGHT_TEST_OUTPUT', '/tmp/harborlight-map-labels'))
OUTPUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:47498'
BLOCKERS = '.island-topbar,.island-activity-stack,.mobile-island-hud,.mobile-bottom-dock,.dock-tabs,.building-dock-cards,.resource-dock-cards,.island-choice-bar'


def fixture(level):
    code = """
import { createState } from './harborlight-v1-state.js';
const state=createState(Date.now(),{ruleset:32,onboarding:false});
state.settings.language='pl';state.tutorial.autoOpenDisabled=true;
state.buildings.townhall.level=LEVEL;state.buildings.house.level=LEVEL;
for(const [id,building] of Object.entries(state.buildings))if(id!=='townhall'&&id!=='house')building.level=LEVEL===1?0:1;
console.log(JSON.stringify(state));
""".replace('LEVEL', str(level))
    return acknowledge_daily_offer(json.loads(subprocess.check_output(['node', '--input-type=module', '-e', code], cwd=SOURCE)))


def asset(route):
    address = urlsplit(route.request.url)
    if address.hostname != '127.0.0.1' or route.request.method != 'GET':
        raise AssertionError('Tooltip attempted a non-local read or a write')
    target = (ROOT / unquote(address.path).lstrip('/')).resolve()
    if target.is_relative_to(ROOT) and target.is_file():
        route.fulfill(path=str(target), content_type=mimetypes.guess_type(target)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='Missing tooltip test asset')


def geometry(page):
    return page.evaluate("""(selectors)=>{
      const tooltip=document.getElementById('map-building-tooltip');
      const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
      const visible=node=>!!node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden';
      return {label:rect(tooltip),visible:visible(tooltip),font:parseFloat(getComputedStyle(tooltip).fontSize),
        blockers:[...document.querySelectorAll(selectors)].filter(visible).map(rect),
        viewport:rect(document.getElementById('viewport')),screen:{width:innerWidth,height:innerHeight}};
    }""", BLOCKERS)


def assert_clear(page):
    result = geometry(page)
    box = result['label']
    assert result['visible'] and box['width'] > 0 and box['height'] > 0, result
    assert box['left'] >= -0.5 and box['top'] >= -0.5, result
    assert box['right'] <= result['screen']['width'] + 0.5, result
    assert box['bottom'] <= result['screen']['height'] + 0.5, result
    assert result['font'] >= 11, result
    for blocker in result['blockers']:
        assert not (box['left'] < blocker['right'] - 0.1 and box['right'] > blocker['left'] + 0.1 and box['top'] < blocker['bottom'] - 0.1 and box['bottom'] > blocker['top'] + 0.1), result
    return result


def centre_camera(page, marker):
    region = marker.evaluate('(node)=>[parseFloat(node.style.left),parseFloat(node.style.top),parseFloat(node.style.width),parseFloat(node.style.height)]')
    page.evaluate('(region)=>dispatchEvent(new CustomEvent("island-tour-focus",{detail:{region}}))', region)


def keyboard_label(page, marker):
    centre_camera(page, marker)
    page.keyboard.press('Tab')
    marker.evaluate('(node)=>node.focus({preventScroll:true})')
    tooltip = page.locator('#map-building-tooltip')
    expect(tooltip).to_be_visible()
    expect(tooltip).to_have_text(marker.get_attribute('data-label'))
    expect(tooltip).to_have_attribute('data-map-label-for', marker.get_attribute('id'))
    return assert_clear(page)


report = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    for width, height in [(1672,1100),(1440,1000),(1024,768),(900,700),(390,844),(320,740)]:
        context = browser.new_context(viewport={'width':width,'height':height}, has_touch=width<600, reduced_motion='reduce')
        context.route('**/*', asset)
        page = context.new_page()
        errors, writes = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: writes.append(request.url) if request.method != 'GET' else None)
        page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(fixture(5)))
        page.goto(BASE+'/harborlight-v1-layered.html', wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.gameStartup==="ready"', timeout=30000)
        dismiss_player_offers(page)
        tooltip = page.locator('#map-building-tooltip')
        expect(tooltip).to_be_hidden()
        checked = []
        for marker in page.locator('.world-hotspot').all():
            result = keyboard_label(page, marker)
            checked.append(marker.get_attribute('id'))
            if width == 1440 and marker.get_attribute('id') in ['hit-world-chapel','hit-world-lighthouse']:
                page.screenshot(path=str(OUTPUT/(marker.get_attribute('id')+'.png')))
            page.keyboard.press('Escape')
            expect(tooltip).to_be_hidden()
            assert 'map-building-tooltip' not in (marker.get_attribute('aria-describedby') or '')
        assert len(checked) == 20, checked
        if width == 1440:
            chapel = page.locator('#hit-world-chapel')
            hit = chapel.locator('.map-hitshape')
            (hit if hit.count() else chapel).hover()
            expect(tooltip).to_be_visible()
            assert_clear(page)
            page.mouse.move(0, 0)
            expect(tooltip).to_be_hidden()
            keyboard_label(page, chapel)
            page.set_viewport_size({'width':1280,'height':800})
            expect(tooltip).to_be_visible()
            page.wait_for_timeout(80)
            assert_clear(page)
            page.locator('#hit-settings').click()
            expect(page.locator('#island-dialog')).to_be_visible()
            expect(tooltip).to_be_hidden()
            page.locator('#island-dialog .dialog-close').click()
        if width == 390:
            lighthouse = page.locator('#hit-world-lighthouse')
            keyboard_label(page, lighthouse)
            page.screenshot(path=str(OUTPUT/'portrait-lighthouse.png'))
            centre_camera(page, page.locator('#hit-world-farm'))
            expect(tooltip).to_be_hidden()
        assert not errors, errors
        assert not writes, writes
        report.append({'viewport':[width,height],'all_buildings':len(checked),'Chapel_and_Lighthouse_clear':True,'hover_focus_only':True,'errors':errors,'writes':writes})
        context.close()
    # Locked targets retain an informative hover/focus label and the ordinary
    # read-only unlock menu. Tooltip presentation never unlocks the building.
    context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
    context.route('**/*', asset)
    page = context.new_page()
    page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(fixture(1)))
    page.goto(BASE+'/harborlight-v1-layered.html', wait_until='networkidle')
    page.wait_for_function('document.documentElement.dataset.gameStartup==="ready"', timeout=30000)
    dismiss_player_offers(page)
    academy = page.locator('#hit-world-academy')
    keyboard_label(page, academy)
    expect(academy).to_have_attribute('data-locked','true')
    page.keyboard.press('Enter')
    expect(page.locator('[data-building-locked="academy"]')).to_be_visible()
    expect(page.locator('#map-building-tooltip')).to_be_hidden()
    assert page.evaluate('window.__HARBORLIGHT_DEV_STATE__.buildings.academy.level') == 0
    context.close()
    browser.close()

(OUTPUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
print('PASS map labels: all20 buildings at6 widths; actual Chapel/Lighthouse clear of top/right/bottom menus; hover/focus, resize, pan, modal and locked entry; no remote game writes.')
