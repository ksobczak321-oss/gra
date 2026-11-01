"""Actual DEV Harbor UI: simulated donation, transfer gate and live happiness.

All files are fulfilled locally at loopback; no Firebase account or real money
is used. The in-memory preview and its explicit test operations are deliberate.
"""
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import mimetypes
import os
import subprocess

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
ORIGIN = 'http://127.0.0.1:47381'
NOW = datetime(2026, 10, 31, 12, tzinfo=timezone.utc)


def seed():
    source = """import {createState} from './harborlight-v1-state.js';
      const state=createState(%d);state.tutorial.autoOpenDisabled=true;
      state.engagementSchedule.initialCompleted=true;
      state.engagementSchedule.initialAnchored=true;
      state.engagementSchedule.nextAt=1000000000;
      state.resources.coins=100;console.log(JSON.stringify(state));""" % int(NOW.timestamp() * 1000)
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', source], cwd=SOURCE, capture_output=True, text=True, check=True).stdout)


def scenario(browser, language, mobile):
    context = browser.new_context(viewport={'width': 390 if mobile else 1366, 'height': 844 if mobile else 900},
                                  is_mobile=mobile, has_touch=mobile, reduced_motion='reduce')
    errors = []

    def asset(route):
        target = (ROOT / unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
        if not target.is_relative_to(ROOT) or not target.is_file():
            return route.fulfill(status=404, body='Missing fixture asset')
        return route.fulfill(body=target.read_bytes(), content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')

    context.route(ORIGIN + '/**', asset)
    context.add_init_script('window.__HARBORLIGHT_DEV_FIXTURE__=%s;localStorage.setItem("harborlight-language",%s);' % (json.dumps(seed()), json.dumps(language)))
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.clock.install(time=NOW)
    page.clock.pause_at(NOW)
    try:
        assert page.goto(ORIGIN + '/harborlight-v1-layered.html?profile=new-player').ok
        try:
            page.wait_for_function('window.__HARBORLIGHT_DEV_STATE__ !== undefined && document.getElementById("loading").hidden', timeout=10000)
        except Exception as error:
            raise AssertionError({'page_errors': errors, 'loading': page.locator('#loading').inner_text()}) from error
        if mobile:
            page.locator('.mobile-island-menu').click()
        else:
            page.locator('#hit-menu').click()
        page.locator('[data-open-charity]').click()
        panel = page.locator('[data-charity-panel]')
        expect(panel).to_contain_text('SYMULACJA DEV' if language == 'pl' else 'DEV SIMULATION')
        expect(panel.locator('[data-charity-donate]')).to_be_disabled()
        expect(panel.locator('[data-charity-beneficiary] option')).to_have_count(3)
        panel.locator('[data-charity-beneficiary]').select_option('dev-animals')
        expect(panel.locator('[data-charity-beneficiary-goal]')).to_contain_text('zwierzętami' if language == 'pl' else 'animals')
        panel.locator('[data-charity-test-credit]').click()
        expect(panel).not_to_have_attribute('aria-busy', 'true')
        expect(panel).to_contain_text('1000' if language == 'pl' else '1,000')
        assert page.evaluate('window.__HARBORLIGHT_DEV_STATE__.resources.coins') == 1100
        panel.locator('[data-charity-beneficiary]').select_option('dev-animals')
        panel.locator('[data-charity-confirm]').check()
        panel.locator('[data-charity-donate]').click()
        expect(panel).not_to_have_attribute('aria-busy', 'true')
        expect(panel.locator('[data-charity-test-transfer]')).to_be_visible()
        expect(panel.locator('[data-charity-donation]')).to_contain_text('Bezpieczna Łapa')
        assert page.evaluate('window.__HARBORLIGHT_DEV_STATE__.resources.coins') == 100
        assert page.locator('[data-charity-claim]').count() == 0
        assert page.evaluate('window.__HARBORLIGHT_DEV_STATE__.charityReward || null') is None
        panel.locator('[data-charity-test-transfer]').click()
        expect(panel).not_to_have_attribute('aria-busy', 'true')
        panel.locator('[data-charity-claim]').click()
        expect(panel).not_to_have_attribute('aria-busy', 'true')
        page.clock.run_for(1250)
        state = page.evaluate('window.__HARBORLIGHT_DEV_STATE__')
        assert state['charityReward']['mode'] == 'simulation'
        assert state['charityReward']['happinessPoints'] == 20
        assert state['charityReward']['expiresAt'] - state['charityReward']['claimedAt'] == 6 * 3600000
        assert state['happiness'] >= 39.9, state['happiness']
        for port in page.locator('[data-dock-building="dock"]').all():
            expect(port).to_have_class(__import__('re').compile(r'charity-port-lit'))
        assert page.locator('[data-charity-claim]').count() == 0
        assert page.evaluate('Object.keys(localStorage).filter(key=>/^harborlight.*(?:island|save)/i.test(key))') == []
        box = panel.bounding_box()
        assert box and box['width'] <= page.viewport_size['width'], box
        assert not errors, errors
    finally:
        context.close()


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    scenario(browser, language, mobile)
        finally:
            browser.close()
    print('PASS Charity DEV Harbor: PL/EN desktop/mobile, explicit simulation, coin burn, transfer gate, actualHappiness and port illumination; no account or cash transfer')


if __name__ == '__main__':
    run()
