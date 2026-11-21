"""Locked map/dock entries show the real unlock requirement without building actions."""
import json
import mimetypes
import os
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright
from helpers.browser_offers import dismiss_player_offers, acknowledge_daily_offer

SOURCE=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
BASE='http://127.0.0.1:47436'
REQUIREMENTS={'bakery':2,'dairy':2,'leatherworks':2,'academy':4,'barracks':4,'market':2,'dock':4}


def fixture(level):
    code="""
import {createState} from './harborlight-v1-state.js';
const s=createState(Date.now(),{ruleset:32});s.settings.language='pl';s.tutorial.autoOpenDisabled=true;
s.buildings.townhall.level=LEVEL;s.buildings.house.level=LEVEL;
console.log(JSON.stringify(s));
""".replace('LEVEL',str(level))
    return json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=SOURCE))


def asset(route):
    target=(ROOT/unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if target.is_relative_to(ROOT) and target.is_file():
        route.fulfill(path=str(target),content_type=mimetypes.guess_type(target)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404,body='Missing')


report=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for width,height in [(1440,1000),(390,844)]:
        for level in [1,2,4]:
            state=acknowledge_daily_offer(fixture(level))
            page=browser.new_page(viewport={'width':width,'height':height},has_touch=width<600)
            page.route(BASE+'/**',asset)
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(state))
            page.goto(BASE+'/harborlight-v1-layered.html',wait_until='networkidle')
            page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"')
            dismiss_player_offers(page)
            page.locator('#hit-world-bakery').wait_for(state='attached')
            # Normal food consumption keeps running; compare command-owned stock,
            # assignments, construction and completed/claimed lesson history.
            for building,required in REQUIREMENTS.items():
                before=page.evaluate("""(()=>{const s=window.__HARBORLIGHT_DEV_STATE__;return {stock:Object.fromEntries(['coins','wood','stone','planks'].map(k=>[k,s.resources[k]])),buildings:Object.fromEntries(Object.entries(s.buildings).map(([id,b])=>[id,{level:b.level,workers:b.workers,construction:b.construction}])),tutorial:{completed:s.tutorial.completed,claimed:s.tutorial.claimed}}})()""")
                # The same map and dock click handlers are used on both layouts.
                for entry in ['#hit-world-'+building,'#hit-dock-'+building]:
                    page.locator(entry).evaluate('(e)=>e.click()')
                    if level<required:
                        message=page.locator('[data-building-locked="'+building+'"]')
                        expect(message).to_be_visible()
                        expect(message).to_contain_text(f'Aby rozbudować ten budynek potrzebujesz Ratusza na poziomie {required}.')
                        expect(message).to_contain_text(f'Obecny poziom Ratusza: {level}.')
                        expect(page.locator('[data-v32-panel],[data-building-panel]')).to_have_count(0)
                        expect(page.locator('#island-dialog .dialog-body input,#island-dialog .dialog-body select,#island-dialog .dialog-body button')).to_have_count(0)
                        after=page.evaluate("""(()=>{const s=window.__HARBORLIGHT_DEV_STATE__;return {stock:Object.fromEntries(['coins','wood','stone','planks'].map(k=>[k,s.resources[k]])),buildings:Object.fromEntries(Object.entries(s.buildings).map(([id,b])=>[id,{level:b.level,workers:b.workers,construction:b.construction}])),tutorial:{completed:s.tutorial.completed,claimed:s.tutorial.claimed}}})()""")
                        assert after==before,(level,building,'Locked entry mutated gameplay')
                    else:
                        expect(page.locator('[data-building-locked]')).to_have_count(0)
                        expect(page.locator('[data-v32-panel="'+building+'"],[data-building-panel="'+building+'"]')).to_be_visible()
                    page.locator('#island-dialog .dialog-close').click()
            assert not errors,errors
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            report.append({'width':width,'townhall':level,'checked_buildings':len(REQUIREMENTS),'entrypoints_per_building':2,'read_only_lock_information':True,'errors':errors})
            page.close()
    browser.close()
print(json.dumps(report))
print('PASS locked building access: accurate level2/4 information, no normal menu/actions or progress mutation; unlocked entries retain normal panels; desktop/mobile.')
