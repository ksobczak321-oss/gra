"""DEV community acceptance using the real game and volatile demo identities.

No Firebase account, GCP document, real player message or ranked result changes.
"""
from datetime import datetime, timezone
from urllib.parse import urlsplit, unquote
import mimetypes
from pathlib import Path
import json
import os
import re
import subprocess
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', ROOT)).resolve()
NOW = 1793448000000

def seed():
    script = """import {createState} from './harborlight-v1-state.js';
    const s=createState(%d);s.islandName='Port społeczności';s.tutorial.autoOpenDisabled=true;
    s.engagementSchedule.initialCompleted=true;s.engagementSchedule.initialAnchored=true;s.engagementSchedule.nextAt=1e12;
    console.log(JSON.stringify(s));""" % NOW
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT, capture_output=True, text=True, check=True).stdout)


def open_community(page, language, mobile):
    if mobile:
        page.locator('.mobile-island-menu').click()
        page.locator('#island-dialog').get_by_role('button', name='Ustawienia' if language == 'pl' else 'Settings', exact=True).click()
    else:
        page.locator('#hit-settings').click()
    page.locator('[data-open-community]').click()
    expect(page.locator('[data-community-panel]')).to_be_visible()
    expect(page.locator('[data-community-demo-warning]')).to_be_visible()


def identity(page, value):
    page.locator('[data-community-demo-identity]').select_option(value)
    expect(page.locator('[data-community-panel]')).to_be_visible()


def run():
    base = 'http://127.0.0.1:47383'
    errors = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
            try:
                for language, mobile in [('pl', False), ('en', True)]:
                    context = browser.new_context(viewport={'width': 390 if mobile else 1366, 'height': 844 if mobile else 900}, is_mobile=mobile, has_touch=mobile)
                    def asset(route):
                        target = (FRONTEND_ROOT / unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
                        if not target.is_relative_to(FRONTEND_ROOT) or not target.is_file():
                            return route.fulfill(status=404, body='Missing fixture asset')
                        return route.fulfill(body=target.read_bytes(), content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')
                    context.route(base + '/**', asset)
                    context.add_init_script('window.__HARBORLIGHT_DEV_FIXTURE__=%s;localStorage.setItem("harborlight-language",%s);' % (json.dumps(seed()), json.dumps(language)))
                    page = context.new_page()
                    page.on('response', lambda response: print('BAD_RESPONSE', response.status, response.url, flush=True) if response.status >= 400 else None)
                    page.on('console', lambda message: print('BROWSER_CONSOLE', message.text, flush=True) if message.type == 'error' else None)
                    page.on('pageerror', lambda error: (errors.append(getattr(error, 'stack', None) or str(error)), print('PAGEERROR', getattr(error, 'stack', None) or str(error), flush=True)))
                    page.clock.install(time=datetime.fromtimestamp(NOW/1000, tz=timezone.utc))
                    page.clock.pause_at(datetime.fromtimestamp(NOW/1000, tz=timezone.utc))
                    page.set_default_timeout(30000)
                    page.goto(base + '/harborlight-v1-layered.html?profile=new-player', wait_until='domcontentloaded')
                    page.wait_for_function('document.getElementById("loading").hidden')
                    page.clock.run_for(100)
                    open_community(page, language, mobile)
                    panel = page.locator('[data-community-panel]')
                    panel.get_by_role('button', name='Poproś o dołączenie' if language == 'pl' else 'Request to join', exact=True).click()
                    identity(page, 'demo_2')
                    panel.get_by_role('button', name='Przyjmij' if language == 'pl' else 'Accept', exact=True).click()
                    identity(page, 'demo_1')
                    expect(panel.get_by_role('heading', level=3)).to_have_text('Latarnicy DEV')
                    panel.locator('[data-community-tab="chat"]').click()
                    panel.get_by_role('textbox', name='Wiadomość' if language == 'pl' else 'Message', exact=True).fill('<img src=x onerror=alert(1)> test')
                    panel.get_by_role('button', name='Wyślij' if language == 'pl' else 'Send', exact=True).click()
                    expect(panel.locator('[data-community-messages]')).to_contain_text('<img src=x onerror=alert(1)> test')
                    assert panel.locator('[data-community-messages] img').count() == 0
                    panel.locator('[data-community-conversation]').select_option('demo_3')
                    panel.get_by_role('textbox', name='Wiadomość' if language == 'pl' else 'Message', exact=True).fill('Prywatny kurs 73')
                    panel.get_by_role('button', name='Wyślij' if language == 'pl' else 'Send', exact=True).click()
                    identity(page, 'demo_3')
                    panel.locator('[data-community-conversation]').select_option('demo_1')
                    expect(panel.locator('[data-community-messages]')).to_contain_text('Prywatny kurs 73')
                    panel.get_by_role('button', name='Zablokuj gracza' if language == 'pl' else 'Block player', exact=True).click()
                    panel.locator('[data-community-conversation]').select_option('demo_1')
                    expect(panel.get_by_role('button', name='Odblokuj gracza' if language == 'pl' else 'Unblock player', exact=True)).to_be_visible()
                    panel.get_by_role('button', name='Odblokuj gracza' if language == 'pl' else 'Unblock player', exact=True).click()
                    identity(page, 'demo_1')
                    panel.locator('[data-community-tab="league"]').click()
                    expect(panel).to_contain_text('19:00–20:00')
                    expect(panel).to_contain_text('20:00–21:00')
                    panel.get_by_role('button', name='Ćwicz' if language == 'pl' else 'Practice', exact=True).click()
                    panel.get_by_role('button', name='Załaduj' if language == 'pl' else 'Load', exact=True).first.click()
                    panel.get_by_role('button', name='Dostarcz do A' if language == 'pl' else 'Deliver to A', exact=True).click()
                    expect(panel).to_contain_text('1/5')
                    page.clock.run_for(1100)
                    panel.get_by_role('button', name='Zakończ i zapisz wynik' if language == 'pl' else 'Finish and record score', exact=True).click()
                    expect(panel).to_contain_text('16.00 / 100')
                    panel.get_by_role('button', name='Wróć do ligi' if language == 'pl' else 'Back to league', exact=True).click()
                    panel.get_by_role('combobox', name='Rodzaj treningu' if language == 'pl' else 'Practice type', exact=True).select_option('arcade')
                    panel.get_by_role('button', name='Ćwicz' if language == 'pl' else 'Practice', exact=True).click()
                    page.clock.run_for(550)
                    panel.locator('[data-league-target="0"]').click(force=True)
                    expect(panel).to_contain_text('Trafienia: 1' if language == 'pl' else 'Hits: 1')
                    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1')
                    assert page.evaluate('Object.keys(localStorage).filter(k=>/island|save|community|chat|league/i.test(k))') == [], 'DEV demonstration must not cache worlds or messages in browser storage'
                    page.locator('.dialog-close').click()
                    context.close()
                    print('PASS community: alliance request/approval, identity switch, plaintext chat, private messages/block, league logic+arcade and bounded layout: %s/%s' % (language, 'mobile' if mobile else 'desktop'))
                assert not errors, errors
            finally:
                browser.close()
    finally:
        pass

if __name__ == '__main__':
    run()
