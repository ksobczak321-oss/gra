"""Exercise DEV login on its actual origin with isolated, mocked Google APIs.

All assets come from this checkout. No real account, password or Google request
is used; fixture sessions prove UI wiring without touching permanent DEV saves.
"""

import base64
import json
import mimetypes
import os
from pathlib import Path
import time
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
ASSETS = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', str(ROOT))).resolve()
DEV = 'https://harborlight-dev.web.app'
SESSION_KEY = 'harborlight-dev-auth-v1'
API_KEY = 'fixtureFirebasePublicApiKey123'


def token(uid):
    def encode(value):
        return base64.urlsafe_b64encode(json.dumps(value).encode()).rstrip(b'=').decode()
    return '.'.join([encode({'alg': 'RS256'}), encode({
        'aud': 'harborlight-dev', 'iss': 'https://securetoken.google.com/harborlight-dev',
        'sub': uid, 'exp': int(time.time()) + 3600,
    }), 'fixture-signature'])


def authentication(login):
    return {'localId': 'dev-' + login, 'email': login + '@dev.harborlight.pl',
            'idToken': token('dev-' + login), 'refreshToken': 'fixture-refresh-' + login,
            'expiresIn': '3600'}


class Site:
    def __init__(self, origin=DEV):
        self.origin = origin
        self.config_project = 'harborlight-dev'
        self.auth_calls = []
        self.unexpected = []
        self.offline = False

    def route(self, route):
        request = route.request
        parsed = urlsplit(request.url)
        if parsed.netloc == 'identitytoolkit.googleapis.com' and parsed.path == '/v1/accounts:signInWithPassword':
            body = json.loads(request.post_data)
            self.auth_calls.append((request.method, request.url, body))
            if self.offline:
                route.abort('internetdisconnected')
                return
            login = body.get('email', '').split('@', 1)[0]
            if body.get('password') != login:
                route.fulfill(status=400, content_type='application/json', body=json.dumps({
                    'error': {'message': 'INVALID_LOGIN_CREDENTIALS'}}))
            else:
                route.fulfill(content_type='application/json', body=json.dumps(authentication(login)))
            return
        if request.url == self.origin + '/api/v1/config':
            route.fulfill(status=503, content_type='application/json', body=json.dumps({'error':'account_api_disabled'}))
            return
        if request.url.startswith(self.origin + '/'):
            if parsed.path == '/__/firebase/init.json':
                route.fulfill(content_type='application/json', body=json.dumps({
                    'projectId': self.config_project, 'apiKey': API_KEY, 'messagingSenderId': '123456789'}))
                return
            if parsed.path == '/harborlight-v1-layered.html':
                # The game itself has separate acceptance coverage. This target
                # keeps this test focused on session/redirect correctness.
                route.fulfill(content_type='text/html', body='<h1>Testowa wyspa</h1>')
                return
            relative = unquote(parsed.path).lstrip('/')
            file = (ASSETS / relative).resolve()
            if ASSETS in file.parents and file.is_file():
                route.fulfill(content_type=mimetypes.guess_type(str(file))[0] or 'application/octet-stream',
                              body=file.read_bytes())
                return
            if parsed.path == '/favicon.ico':
                route.fulfill(status=204)
                return
        self.unexpected.append((request.method, request.url))
        route.abort()


def context_for(browser, site, width=1366, height=900, storage=None):
    context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
    context.route('**/*', site.route)
    if storage:
        context.add_init_script('for (const [key,value] of Object.entries(%s)) localStorage.setItem(key,value);' % json.dumps(storage))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    return context, page, errors


def form_ready(page):
    expect(page.locator('#account-fields')).to_be_enabled()
    expect(page.locator('#email')).to_have_attribute('autocomplete', 'username')


def run():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
            headless=True, args=['--no-sandbox'])
        try:
            site = Site()
            context, page, errors = context_for(browser, site)
            page.goto(DEV + '/harborlight-auth.html?profile=preview&slot=old-preview&mode=register#register')
            form_ready(page)
            expect(page).to_have_title('HARBORLIGHT — logowanie PRE-PROD')
            expect(page.locator('#auth-title')).to_have_text('Zaloguj się do PRE-PROD')
            expect(page.locator('#tab-register')).to_be_hidden()
            expect(page.locator('.social-options')).to_be_visible()
            expect(page.locator('.guest-entry')).to_be_hidden()
            expect(page.locator('.back-link')).to_be_hidden()
            expect(page.locator('label[for="email"]')).to_have_text('Login')
            expect(page.locator('#email')).to_have_attribute('type', 'text')
            page.locator('#email').fill('admi1')
            page.locator('#password').fill('irrelevant-fixture')
            page.locator('#account-submit').click()
            expect(page.locator('#email-error')).to_have_text('Wpisz login PRE-PROD: admin1, admin2 lub admin3.')
            assert not site.auth_calls
            page.locator('#email').fill('admin1')
            page.locator('#password').fill('wrong-fixture-password')
            page.locator('#account-submit').click()
            expect(page.locator('#account-status')).to_have_text('Login lub hasło są nieprawidłowe.')
            expect(page.locator('#account-fields')).to_be_enabled()
            expect(page.locator('#password')).to_be_focused()
            expect(page.locator('#password')).to_have_value('')
            assert page.evaluate('localStorage.getItem(%s)' % json.dumps(SESSION_KEY)) is None
            page.locator('#auth-language').select_option('en')
            expect(page.locator('#account-status')).to_have_text('The username or password is incorrect.')
            expect(page.locator('label[for="email"]')).to_have_text('Username')
            page.locator('#auth-language').select_option('pl')
            for width, height in [(1366, 900), (390, 844), (320, 740)]:
                page.set_viewport_size({'width': width, 'height': height})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                bounds = page.locator('#account-submit').bounding_box()
                assert bounds and bounds['height'] >= 44 and bounds['width'] >= 44
            page.screenshot(path='/tmp/harborlight-dev-auth-mobile.png', full_page=True)
            page.locator('#password').fill('admin1')
            page.locator('#account-submit').click()
            expect(page).to_have_url(DEV + '/harborlight-v1-layered.html?profile=new-player')
            saved = page.evaluate('({...localStorage})')
            session = json.loads(saved[SESSION_KEY])
            assert session['uid'] == 'dev-admin1' and session['login'] == 'admin1'
            assert set(session) == {'projectId', 'uid', 'login', 'idToken', 'refreshToken', 'expiresAt', 'lastActivityAt'}
            assert 0 <= page.evaluate('Date.now()') - session['lastActivityAt'] < 30000
            assert all('password' not in key.lower() for key in session)
            assert not any('wrong-fixture-password' in value for value in saved.values())
            method, url, payload = site.auth_calls[-1]
            assert method == 'POST' and url == 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + API_KEY
            assert payload == {'email': 'admin1@dev.harborlight.pl', 'password': 'admin1', 'returnSecureToken': True}
            # Reopening DEV restores this existing session, without resubmitting
            # credentials, carrying old slots, or resetting an island.
            calls = len(site.auth_calls)
            page.goto(DEV + '/harborlight-auth.html?slot=another-island')
            expect(page).to_have_url(DEV + '/harborlight-v1-layered.html?profile=new-player')
            assert len(site.auth_calls) == calls
            assert not errors and not site.unexpected, (errors, site.unexpected)
            context.close()

            # Each permanent login gets its own UID/session.
            for login in ['admin2', 'admin3']:
                site = Site()
                context, page, errors = context_for(browser, site)
                page.goto(DEV + '/harborlight-auth.html')
                form_ready(page)
                page.locator('#email').fill(login)
                page.locator('#password').fill(login)
                page.locator('#account-submit').click()
                expect(page).to_have_url(DEV + '/harborlight-v1-layered.html?profile=new-player')
                session = json.loads(page.evaluate('localStorage.getItem(%s)' % json.dumps(SESSION_KEY)))
                assert session['uid'] == 'dev-' + login
                assert not errors and not site.unexpected
                context.close()

            # Failed configuration and connection keep the form retryable.
            site = Site()
            site.config_project = 'harborlight-prod'
            context, page, errors = context_for(browser, site)
            page.goto(DEV + '/harborlight-auth.html')
            form_ready(page)
            page.locator('#email').fill('admin1')
            page.locator('#password').fill('admin1')
            page.locator('#account-submit').click()
            expect(page.locator('#account-status')).to_have_text('Konfiguracja kont nie jest zakończona. Poproś właściciela o jej dokończenie.')
            assert not site.auth_calls
            site.config_project = 'harborlight-dev'
            site.offline = True
            page.locator('#password').fill('admin1')
            page.locator('#account-submit').click()
            expect(page.locator('#account-status')).to_have_text('Nie udało się połączyć z usługą logowania. Sprawdź połączenie z internetem i spróbuj ponownie.')
            expect(page.locator('#account-fields')).to_be_enabled()
            expect(page.locator('#password')).to_have_value('')
            assert not errors and not site.unexpected
            context.close()

            # An unrelated preview origin never activates a cloud account service.
            site = Site('https://preview.harborlight.invalid')
            context, page, errors = context_for(browser, site)
            page.goto(site.origin + '/harborlight-auth.html')
            expect(page.locator('#account-fields')).to_be_enabled()
            expect(page.locator('#email')).to_have_attribute('type', 'email')
            expect(page.locator('#tab-register')).to_be_visible()
            expect(page.locator('.guest-entry')).to_be_visible()
            page.locator('#email').fill('preview@example.invalid')
            page.locator('#password').fill('preview-only-value')
            page.locator('#account-submit').click()
            expect(page.locator('#account-status')).to_have_text('Account sign-in is coming soon. Continue as a guest to explore your island.')
            assert not site.auth_calls and not errors and not site.unexpected
            assert page.evaluate('localStorage.length') == 0
            context.close()
        finally:
            browser.close()
    print('PASS DEV login: real form/client wiring for three UID sessions, safe retry, PL/EN, mobile, session restore and production isolation')


if __name__ == '__main__':
    run()
