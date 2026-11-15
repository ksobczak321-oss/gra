"""Check the real Pages document with local source files and its actual HTTPS origin.

No external deployment or account is used. Requests under each tested origin are
fulfilled from this checkout, so browser location and module origins remain real.
"""
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright


ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', Path(__file__).resolve().parents[1])).resolve()
PAGES_HOST = 'ksobczak321-oss.github.io'
BUILDINGS = ['bakery', 'dairy', 'slaughterhouse', 'fisher', 'leatherworks', 'academy', 'barracks']


def document_route(route):
    url = urlparse(route.request.url)
    path = unquote(url.path)
    if path.endswith('/harborlight-auth.html'):
        route.fulfill(content_type='text/html', body='<p data-account-login-required>Account login required</p>')
        return
    if url.hostname == PAGES_HOST:
        path = path.removeprefix('/gra').removeprefix('/other')
    file = (ROOT / path.lstrip('/')).resolve()
    if file.is_relative_to(ROOT) and file.is_file():
        route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='Not found')


report = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    for width, height in [(1440, 1000), (390, 844)]:
        context = browser.new_context(viewport={'width': width, 'height': height})
        context.route('**/*', document_route)
        page = context.new_page()
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request.url))
        # Neither the loopback-only fixture nor its local API bootstrap may be
        # trusted by the public preview, even if supplied by the browser.
        page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__={population:999};window.__HARBORLIGHT_LOCAL_DEV__={projectId:"harborlight-local-dev"};')
        page.goto(f'https://{PAGES_HOST}/gra/harborlight-v1-layered.html?profile=new-player', wait_until='networkidle')
        page.locator('[data-v32-building]').first.wait_for()
        assert page.locator('[data-v32-building]').count() == 7
        for building in BUILDINGS:
            assert page.locator(f'#hit-world-{building}').count() == 1, building
        body = page.locator('body').inner_text()
        assert '18 / 36' in body, body[-1500:]
        assert 'Twoja wyspa, Twoje decyzje' in body
        assert page.get_by_role('button', name='Dalej →', exact=True).count() == 1
        assert page.evaluate('typeof window.__HARBORLIGHT_DEV_STATE__') == 'undefined'
        assert page.evaluate('Object.keys(localStorage)') == ['harborlight-language']
        assert page.evaluate('Object.keys(sessionStorage)') == []
        assert not errors, errors
        assert all(urlparse(url).hostname == PAGES_HOST for url in requests), requests
        assert not any('/api/' in url or '/__/firebase/' in url for url in requests), requests
        report.append({'origin': PAGES_HOST, 'width': width, 'new_buildings': 7, 'population': '18 / 36', 'tutorial': 'PL', 'api_requests': 0, 'game_storage': False})
        context.close()

    # The exact repository path matters; another Pages path retains the legacy
    # static preview, and Firebase hostnames continue to require account login.
    for hostname, prefix, login_required in [
        (PAGES_HOST, '/other', False),
        ('harborlight-dev.web.app', '', True),
        ('harborlight-prod.web.app', '', True),
        ('harborlight.pl', '', True),
    ]:
        context = browser.new_context()
        context.route('**/*', document_route)
        page = context.new_page()
        page.goto(f'https://{hostname}{prefix}/harborlight-v1-layered.html?profile=new-player', wait_until='networkidle')
        if login_required:
            page.locator('[data-account-login-required]').wait_for()
            assert urlparse(page.url).path == '/harborlight-auth.html', page.url
        else:
            assert '12 / 24' in page.locator('body').inner_text()
        assert page.locator('[data-v32-building]').count() == 0
        report.append({'origin': hostname, 'path': prefix or '/', 'v32_guest_enabled': False, 'login_required': login_required})
        context.close()
    browser.close()

print(json.dumps(report, ensure_ascii=False))
print('Pages DEV v32 origin, gameplay, tutorial, cloud isolation and browser-storage checks passed.')
