"""The seven new functions reuse native island buildings and hover-only labels."""
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
BASE = 'http://127.0.0.1:47434'
assert hashlib.sha256((ROOT / 'assets/harborlight-v1-approved.png').read_bytes()).hexdigest() == '4063f003002f95dd7b00f77a8d6d610b04f134766e52afc97e8a10712fd6d823', 'Approved island artwork changed'
POSITIONS = {
    'bakery': [651, 289, 107, 80], 'dairy': [447, 300, 96, 81],
    'slaughterhouse': [351, 260, 52, 46], 'fisher': [1197, 383, 91, 86],
    'leatherworks': [498, 475, 60, 60], 'academy': [439, 506, 98, 79],
    'barracks': [1295, 162, 87, 92],
}
fixture = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', """
import { createState } from './harborlight-v1-state.js';
const s=createState(Date.now(),{ruleset:32});s.settings.language='pl';s.tutorial.autoOpenDisabled=true;
s.buildings.townhall.level=6;s.buildings.house.level=6;s.buildings.warehouse.level=6;
for(const id of ['bakery','dairy','slaughterhouse','fisher','leatherworks','academy','barracks'])s.buildings[id].level=1;
for(const id of Object.keys(s.resources))s.resources[id]=100000;
console.log(JSON.stringify(s));
"""], cwd=SOURCE))


def asset(route):
    path = unquote(urlsplit(route.request.url).path).lstrip('/')
    target = (ROOT / path).resolve()
    if target.is_relative_to(ROOT) and target.is_file():
        return route.fulfill(path=str(target), content_type=mimetypes.guess_type(target)[0] or 'application/octet-stream')
    route.fulfill(status=404, body='Missing')


report = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    for width, height, touch in [(1440, 1000, False), (390, 844, True)]:
        context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=touch, reduced_motion='reduce')
        context.route(BASE+'/**', asset)
        page = context.new_page()
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(fixture))
        page.goto(BASE+'/harborlight-v1-layered.html', wait_until='networkidle')
        page.locator('[data-v32-building]').first.wait_for()
        assert page.locator('[data-v32-building]').count()==7
        assert page.locator('[data-v32-building] .v32-building-art,[data-v32-building] img,.v32-map-label').count()==0
        assert page.locator('[data-theatre-map]').count()==0, 'The native Theatre must replace the added map scene'
        for key, region in POSITIONS.items():
            marker=page.locator(f'[data-v32-building="{key}"]')
            actual=marker.evaluate('(e)=>[parseFloat(e.style.left),parseFloat(e.style.top),parseFloat(e.style.width),parseFloat(e.style.height)]')
            assert actual==region,(key,actual)
            style=marker.evaluate('(e)=>{let s=getComputedStyle(e);let a=getComputedStyle(e,"::after");return {image:s.backgroundImage,color:s.backgroundColor,labelOpacity:a.opacity,labelVisibility:a.visibility}}')
            assert style['image']=='none' and style['color']=='rgba(0, 0, 0, 0)',(key,style)
            if not touch:
                page.mouse.move(0,0)
                assert marker.evaluate('(e)=>getComputedStyle(e,"::after").visibility')=='hidden'
            page.evaluate('(region)=>window.dispatchEvent(new CustomEvent("island-tour-focus",{detail:{region}}))', region)
            hit=marker.locator('.v32-native-hit')
            hit.scroll_into_view_if_needed()
            if not touch:
                hit.hover()
                page.wait_for_timeout(160)
                assert marker.evaluate('(e)=>getComputedStyle(e,"::after").visibility')=='visible',key
            hit.click()
            panel=page.locator(f'[data-v32-panel="{key}"]')
            panel.wait_for(state='visible')
            thumbnail=panel.locator('[data-native-building-art]')
            expect(thumbnail).to_have_attribute('data-native-building-art',key)
            expect(thumbnail).to_have_css('background-image', re.compile(r'.*harborlight-v1-approved\.png.*'))
            page.locator('#island-dialog .dialog-close').click()
        for key, region, title in [('theatre',[634,360,112,66],'Teatr'),('market',[747,345,80,67],'Targ')]:
            marker=page.locator('#hit-world-'+key)
            assert marker.evaluate('(e)=>[parseFloat(e.style.left),parseFloat(e.style.top),parseFloat(e.style.width),parseFloat(e.style.height)]')==region
            page.evaluate('(region)=>window.dispatchEvent(new CustomEvent("island-tour-focus",{detail:{region}}))',region)
            marker.click()
            expect(page.locator('#island-dialog #dialog-title')).to_contain_text(title)
            if key=='theatre':expect(page.locator('#island-dialog [data-v32-theatre]')).to_be_visible()
            else:expect(page.locator('[data-market-entry]')).to_be_visible()
            page.locator('#island-dialog .dialog-close').click()
        assert not errors,errors
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        report.append({'width':width,'native_buildings':7,'transparent_map_targets':True,'clicks':9,'native_theatre_and_market':True,'hover_labels':not touch,'errors':errors})
        context.close()
    browser.close()
print(json.dumps(report,ensure_ascii=False))
print('PASS native island buildings: seven exact targets, no added map art, hover-only names, native dock/header crops; desktop/mobile.')
