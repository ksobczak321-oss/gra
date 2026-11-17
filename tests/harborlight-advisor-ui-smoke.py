"""Real DEV island UI: optional advisor, goal chat, navigation and compact intro.

Uses the existing bounded loopback level-5 preview. All page bytes and model
actions are real; no account or remote game write is made.
"""
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
OUTPUT = Path(os.environ.get('HARBORLIGHT_TEST_OUTPUT', '/tmp/harborlight-advisor-ui'))
OUTPUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:47491'

def asset(route):
    file = (ROOT / unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if route.request.method != 'GET':
        raise AssertionError('Advisor attempted a write: ' + route.request.url)
    if file.is_relative_to(ROOT) and file.is_file():
        route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='Missing advisor test asset')

def bounded(page, selector):
    node = page.locator(selector)
    expect(node).to_be_visible()
    box = node.bounding_box()
    viewport = page.viewport_size
    assert box and box['width'] > 0 and box['height'] > 0, (selector, box)
    assert box['x'] >= -1 and box['y'] >= -1, (selector, box)
    assert box['x'] + box['width'] <= viewport['width'] + 1, (selector, box)
    assert box['y'] + box['height'] <= viewport['height'] + 1, (selector, box)
    return box

report = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    for width, height in [(1440,1000),(390,844),(390,480)]:
        context = browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce')
        context.route(BASE + '/**', asset)
        page = context.new_page()
        errors, failed, writes = [], [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: failed.append((response.status,response.url)) if response.status >= 400 else None)
        page.on('request', lambda request: writes.append(request.url) if request.method != 'GET' or '/api/' in request.url else None)
        page.add_init_script('localStorage.setItem("harborlight-language","pl")')
        page.goto(BASE + '/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5', wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"', timeout=20000)
        bounded(page,'[data-advisor-open]')
        mobile_dock = page.locator('.mobile-bottom-dock')
        if mobile_dock.is_visible():
            advisor_box = page.locator('[data-advisor-open]').bounding_box()
            assert advisor_box['y'] + advisor_box['height'] <= mobile_dock.bounding_box()['y'] - 2, 'Advisor covers the bottom menu'
        assert page.locator('[data-active-tutorial-guide]').count() == 0
        assert page.locator('#island-dialog[open]').count() == 0
        page.locator('[data-advisor-open]').click()
        bounded(page,'[data-advisor-conversation]')
        user_input = page.locator('[data-advisor-input]')
        user_input.fill('Chcę najszybciej jak to możliwe rozbudować Port')
        user_input.press('Enter')
        answer = page.locator('[data-advisor-answer]')
        expect(answer.locator('h3')).to_have_text('Cel: rozbudowa — Port')
        expect(answer).to_contain_text('Następny poziom')
        bounded(page,'[data-advisor-input]')
        bounded(page,'[data-advisor-send]')
        bounded(page,'[data-advisor-close]')
        assert answer.locator('[data-advisor-target]').count() > 0
        if width == 390 and height == 844:
            # A mobile keyboard reduces the viewport after the conversation is open.
            page.set_viewport_size({'width':390,'height':350})
            bounded(page,'[data-advisor-input]')
            bounded(page,'[data-advisor-send]')
            bounded(page,'[data-advisor-close]')
            user_input.fill('Wpis podczas otwartej klawiatury')
            expect(user_input).to_have_value('Wpis podczas otwartej klawiatury')
            page.set_viewport_size({'width':width,'height':height})
        page.locator('[data-advisor-why]').click()
        expect(page.locator('[data-advisor-why]')).to_have_attribute('aria-expanded','true')
        expect(answer).to_contain_text('chronioną rezerwę')
        user_input.fill('niedokończony wpis gracza')
        # Update has to recompute advice while preserving the actual input node.
        user_input.evaluate('(e)=>{window.advisorInputBefore=e}')
        page.wait_for_timeout(5600)
        expect(user_input).to_have_value('niedokończony wpis gracza')
        assert user_input.evaluate('(e)=>e===window.advisorInputBefore')
        page.locator('[data-advisor-alternative]').click()
        expect(answer).to_contain_text('Inna droga')
        page.screenshot(path=str(OUTPUT/f'advisor-port-{width}-{height}.png'))
        # Navigation opens existing UI and highlights it; it never applies a plan.
        user_input.fill('Wolni mieszkańcy')
        user_input.press('Enter')
        target = answer.locator('[data-advisor-target="house"]')
        target.click()
        expect(page.locator('#island-dialog')).to_be_visible()
        expect(page.locator('[data-kingdom-advisor]')).not_to_be_visible()
        expect(page.locator('.advisor-navigation-target')).to_be_visible()
        page.locator('#island-dialog .dialog-close').click()
        page.locator('[data-advisor-open]').click()
        expect(user_input).to_have_value('Wolni mieszkańcy')
        user_input.fill('<img src=x onerror=alert(1)>')
        user_input.press('Enter')
        expect(answer).to_contain_text('Doprecyzuj cel')
        assert answer.locator('img,script').count() == 0
        user_input.press('Escape')
        expect(page.locator('[data-advisor-conversation]')).not_to_be_visible()
        expect(page.locator('[data-advisor-open]')).to_be_focused()
        page.locator('[data-advisor-mute]').click()
        expect(page.locator('[data-advisor-hint]')).to_contain_text('wyciszone')
        page.locator('[data-advisor-open]').click()
        expect(page.locator('[data-advisor-conversation]')).to_be_visible()
        page.locator('[data-advisor-close]').click()
        page.locator('[data-advisor-mute]').click()
        expect(page.locator('[data-advisor-hint]')).not_to_contain_text('wyciszone')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal page overflow'
        assert page.evaluate('Object.keys(localStorage)') == ['harborlight-language']
        assert page.evaluate('Object.keys(sessionStorage)') == []
        assert not errors, errors
        assert not failed, failed
        assert not writes, writes
        report.append({'width':width,'height':height,'port_plan':True,'live_input_preserved':True,'why_and_alternative':True,'navigation_highlight':True,'optional_mute':True,'no_api_or_storage_writes':True,'errors':errors})
        context.close()
    browser.close()
(OUTPUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
print('PASS advisor UI: real Port goal, live update, explanation, alternative, navigation/highlight, keyboard, mute/reopen, desktop/mobile and short viewport; no account/storage writes.')
