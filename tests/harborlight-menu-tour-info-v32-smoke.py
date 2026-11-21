"""Removed tour topics remain available behind real menu i controls.

Uses current packaged bytes, frozen in-memory worlds and no course override.
No cloud requests, gameplay commands, claimed rewards or saved-world writes.
"""
import json
import mimetypes
import os
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
BASE = 'http://127.0.0.1:47524'
NOW = 1795262400000
FIXTURE = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', f'''
import {{createState, normalizeState}} from './harborlight-v1-state.js';
import {{tourMenuInformation, ADVISOR_INTRO_IDS}} from './harborlight-v1-advisor-intro.js';
const state=normalizeState(createState({NOW},{{ruleset:32}}),{NOW});
state.loyalty.lastOfferDay='2026-11-21';
const copy=Object.fromEntries(['pl','en'].map(language=>[language,
  Object.fromEntries(['kingdom','expeditions','archipelago','charity'].map(menu=>[menu,
    tourMenuInformation(menu,language,{{state,cloudAccount:false,simulatedCharity:true}})]))]));
console.log(JSON.stringify({{state,copy,active:ADVISOR_INTRO_IDS}}));
'''], cwd=SOURCE))


def asset(route):
    if route.request.method != 'GET' or '/api/' in route.request.url:
        raise AssertionError('Menu information attempted an account/game write')
    file = (ROOT / unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if not file.is_relative_to(ROOT) or not file.is_file():
        return route.fulfill(status=404, body='Missing information test asset')
    route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')


reports = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    for width, height, language in [(1440,1000,'pl'),(390,844,'en')]:
        context = browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce')
        context.route(BASE+'/**', asset)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        # Playwright Python numeric clock values use seconds. Keep animation
        # timers real while fixing the model's wall clock to the saved instant.
        page.clock.set_fixed_time(NOW/1000)
        page.add_init_script('localStorage.setItem("harborlight-language",'+json.dumps(language)+');window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(FIXTURE['state']))
        page.goto(BASE+'/harborlight-v1-layered.html?profile=new-player', wait_until='networkidle')
        try:
            page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"', timeout=20000, polling=100)
        except Exception:
            print(json.dumps({'errors':errors,'startup':page.evaluate('document.documentElement.dataset.gameStartup'),'clock_and_world':page.evaluate('({now:Date.now(),last:window.__HARBORLIGHT_DEV_STATE__?.lastSimulatedAt,world:window.__HARBORLIGHT_DEV_STATE__?.worldTimeMs})'),'loading':page.locator('#loading').inner_text() if page.locator('#loading').count() else None},ensure_ascii=False))
            raise
        assert page.evaluate('Date.now()') == NOW
        before = page.evaluate('JSON.stringify({resources:__HARBORLIGHT_DEV_STATE__.resources,claimed:__HARBORLIGHT_DEV_STATE__.tutorial.claimed,practical:__HARBORLIGHT_DEV_STATE__.learning.practical})')
        for menu, topics in FIXTURE['copy'][language].items():
            page.locator('[data-mobile-control="menu"]:visible,#hit-menu:visible,.mobile-island-menu:visible').first.click()
            if menu == 'charity':
                page.locator('[data-open-charity]').click()
            else:
                page.locator('[data-menu-route="'+menu+'"]').click()
            dialog = page.locator('#island-dialog[open]')
            heading = dialog.locator('[data-menu-tour-information="'+menu+'"]')
            expect(heading).to_be_visible()
            popup = heading.locator('[data-section-help]')
            # A real pointer hover or focus may preview the popover; a real tap
            # pins it. Reading it never advances the introduction or course.
            heading.locator('button').click()
            expect(popup).to_be_visible()
            expect(popup.locator('[data-menu-tour-topic]')).to_have_count(len(topics))
            for topic in topics:
                assert topic['id'] not in FIXTURE['active']
                expect(popup.locator('[data-menu-tour-topic="'+topic['id']+'"]')).to_have_text(topic['title'])
                expect(popup.locator('[data-menu-tour-description="'+topic['id']+'"]')).to_have_text(topic['text'])
            box = popup.bounding_box()
            assert box and box['x'] >= 0 and box['x']+box['width'] <= width+1
            assert box['y'] >= 0 and box['y']+box['height'] <= height+1
            page.keyboard.press('Escape')
            expect(popup).to_be_hidden()
            expect(dialog).to_be_visible()
            dialog.locator('.dialog-close').click()
            reports.append({'width':width,'language':language,'menu':menu,'topics':len(topics),'original_copy':True,'real_i_control':True,'inside_viewport':True})
        after = page.evaluate('JSON.stringify({resources:__HARBORLIGHT_DEV_STATE__.resources,claimed:__HARBORLIGHT_DEV_STATE__.tutorial.claimed,practical:__HARBORLIGHT_DEV_STATE__.learning.practical})')
        assert before == after, 'Reading help must preserve resources, earned rewards and course cursor'
        assert not errors, errors
        context.close()
    browser.close()
print(json.dumps(reports,ensure_ascii=False))
print('PASS all eight removed tour explanations remain in four real menu i controls, PL/EN desktop/mobile, without gameplay changes.')
