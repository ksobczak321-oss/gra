"""The explicit public DEV link opens a bounded TH5 test world, without an account."""
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import expect, sync_playwright
from helpers.browser_offers import dismiss_player_offers

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
PAGES = 'ksobczak321-oss.github.io'
NEW_BUILDINGS = ['bakery', 'dairy', 'slaughterhouse', 'fisher', 'leatherworks', 'academy', 'barracks']
QUERY = '?profile=new-player&preview=admin1-level5'


def asset(route):
    url = urlparse(route.request.url)
    path = unquote(url.path)
    if path.endswith('/harborlight-auth.html'):
        route.fulfill(content_type='text/html', body='<p data-account-login-required>Account login required</p>')
        return
    if url.hostname == PAGES:
        path = path.removeprefix('/gra').removeprefix('/other')
    file = (ROOT / path.lstrip('/')).resolve()
    if file.is_relative_to(ROOT) and file.is_file():
        route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='Missing test asset')


report = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    for width, height in [(1440, 1000), (390, 844)]:
        context = browser.new_context(viewport={'width': width, 'height': height})
        context.route('**/*', asset)
        page = context.new_page()
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request.url))
        page.add_init_script('localStorage.setItem("harborlight-language","pl")')
        page.goto(f'https://{PAGES}/gra/harborlight-v1-layered.html{QUERY}', wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"')
        dismiss_player_offers(page)
        badge = page.locator('[data-dev-preview]:visible').first
        expect(badge).to_be_visible()
        assert 'admin1' in badge.inner_text()
        assert 'poziom 5' in badge.inner_text()
        assert '5' in page.locator('#hit-level').get_attribute('aria-label')
        assert '180' in page.locator('#hit-level').get_attribute('aria-label')
        assert 'Twoja wyspa, Twoje decyzje' not in page.locator('body').inner_text()
        for building in NEW_BUILDINGS + ['market', 'dock']:
            page.locator('#hit-world-' + building).evaluate('(element)=>element.click()')
            page.locator('#island-dialog[open]').wait_for()
            assert page.locator('[data-building-locked]').count() == 0, building
            if building in NEW_BUILDINGS:
                expect(page.locator('[data-v32-panel="' + building + '"]')).to_be_visible()
            page.locator('#island-dialog .dialog-close').click()
        assert page.evaluate('typeof window.__HARBORLIGHT_DEV_STATE__') == 'undefined'
        assert page.evaluate('Object.keys(localStorage)') == ['harborlight-language']
        assert page.evaluate('Object.keys(sessionStorage)') == []
        assert not errors, errors
        assert not any('/api/' in url or '/__/firebase/' in url for url in requests), requests
        report.append({'width': width, 'level': 5, 'capacity': 180, 'available_buildings_checked': 9, 'public_guest': True, 'saved_world': False, 'errors': errors})
        context.close()

    # The complete scenario stays bounded even when a tester omits profile=new-player.
    for query in [QUERY, '?preview=admin1-level5']:
        context = browser.new_context()
        context.route('**/*', asset)
        page = context.new_page()
        page.goto('http://127.0.0.1:47448/harborlight-v1-layered.html' + query, wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"')
        dismiss_player_offers(page)
        state = page.evaluate('window.__HARBORLIGHT_DEV_STATE__')
        assert state['buildings']['townhall']['level'] == 5
        assert state['buildings']['fisher']['level'] == 5
        assert state['buildings']['warehouse']['level'] == 5
        assert state['buildings']['house']['level'] == 5
        assert state['resources']['coins'] <= 5000
        assert state['resources']['wood'] <= 5000
        assert sum(amount for resource, amount in state['resources'].items() if resource != 'coins') < 130000
        assert not state['education']['discoveries']
        context.close()

    context = browser.new_context()
    context.route('**/*', asset)
    page = context.new_page()
    page.goto(f'https://{PAGES}/gra/harborlight-v1-layered.html?profile=new-player', wait_until='networkidle')
    assert '18 / 36' in page.locator('body').inner_text()
    assert 'Twoja wyspa, Twoje decyzje' in page.locator('body').inner_text()
    assert page.locator('[data-dev-preview]').count() == 0
    context.close()

    for hostname in ['harborlight-dev.web.app', 'harborlight-prod.web.app', 'harborlight.pl']:
        context = browser.new_context()
        context.route('**/*', asset)
        page = context.new_page()
        page.goto(f'https://{hostname}/harborlight-v1-layered.html{QUERY}', wait_until='networkidle')
        expect(page.locator('[data-account-login-required]')).to_be_visible()
        assert page.locator('[data-dev-preview]').count() == 0
        context.close()
    browser.close()
print(json.dumps(report, ensure_ascii=False))
print('PASS explicit level5 DEV: public desktop/mobile, nine available buildings, bounded loopback stock, normal starter unchanged, hosted accounts gated.')
