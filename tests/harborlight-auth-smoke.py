"""Account screen: validation, accessible tabs, mobile layout and no authentication calls.

Runs its own static server unless HARBORLIGHT_BASE_URL is supplied. Passwords and
form submissions must never be written to browser storage or sent to a service.
"""
import functools
import json
import os
import threading
from contextlib import contextmanager
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextmanager
def static_site():
    configured = os.environ.get('HARBORLIGHT_BASE_URL')
    if configured:
        yield configured.rstrip('/')
        return
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{server.server_address[1]}'
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def run():
    with static_site() as base, sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
            args=['--no-sandbox'],
        )
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        page = context.new_page()
        errors = []
        requests = []
        failed = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append((request.method, request.url)))
        page.on('response', lambda response: failed.append((response.status, response.url)) if response.status >= 400 else None)
        page.add_init_script('''
          localStorage.setItem('existing-island', 'keep-me');
          sessionStorage.setItem('existing-session', 'keep-me-too');
        ''')
        assert page.goto(base + '/harborlight-auth.html').status == 200
        expect(page).to_have_title('HARBORLIGHT — Welcome Home')
        expect(page.get_by_role('heading', name='Welcome back.')).to_be_visible()
        expect(page.locator('#tab-login')).to_have_attribute('aria-selected', 'true')
        expect(page.locator('#account-fields')).to_be_enabled()
        expect(page.locator('#display-name')).to_be_hidden()
        assert page.evaluate('''async () => {
          const art = new Image();
          art.src = 'assets/harborlight-v1-approved.png';
          await art.decode();
          return art.naturalWidth;
        }''') == 1672
        initial_requests = len(requests)

        # Every provider stays on this page and honestly reports unavailability.
        for provider in ['Google', 'Facebook']:
            page.locator(f'[data-provider="{provider}"]').click()
            expect(page.locator('#account-status')).to_contain_text(provider + ' sign-in is coming soon.')
            assert page.url == base + '/harborlight-auth.html'

        # Form validation runs locally and focuses the first invalid control.
        page.locator('#account-submit').click()
        expect(page.locator('#email')).to_be_focused()
        expect(page.locator('#email')).to_have_attribute('aria-invalid', 'true')
        page.locator('#email').fill('not-an-email')
        page.locator('#password').fill('short')
        page.locator('#account-submit').click()
        expect(page.locator('#email-error')).to_have_text('Enter a valid email address.')
        expect(page.locator('#password-error')).to_have_text('Use at least 8 characters for your password.')
        page.locator('#email').fill('captain@example.com')
        page.locator('#password').fill('island-password-123')
        page.get_by_role('button', name='Show password', exact=True).click()
        expect(page.locator('#password')).to_have_attribute('type', 'text')
        page.get_by_role('button', name='Hide password', exact=True).click()
        expect(page.locator('#password')).to_have_attribute('type', 'password')
        page.locator('#account-submit').click()
        expect(page.locator('#account-status')).to_contain_text('Account sign-in is coming soon.')
        expect(page.locator('#password')).to_have_value('')

        # Tabs work with keyboard arrows, and registration gets independent checks.
        page.locator('#tab-login').focus()
        page.keyboard.press('ArrowRight')
        expect(page.locator('#tab-register')).to_be_focused()
        expect(page.locator('#tab-register')).to_have_attribute('aria-selected', 'true')
        expect(page.locator('#display-name')).to_be_visible()
        expect(page.locator('#password')).to_have_attribute('autocomplete', 'new-password')
        page.locator('#display-name').fill('Captain')
        page.locator('#password').fill('island-password-123')
        page.locator('#confirm-password').fill('another-password')
        page.locator('#account-submit').click()
        expect(page.locator('#confirm-error')).to_have_text('The passwords do not match.')
        expect(page.locator('#confirm-password')).to_be_focused()
        page.locator('#confirm-password').fill('island-password-123')
        page.locator('#account-submit').click()
        expect(page.locator('#account-status')).to_contain_text('Your account has not been created.')
        expect(page.locator('#password')).to_have_value('')
        expect(page.locator('#confirm-password')).to_have_value('')
        assert len(requests) == initial_requests, requests[initial_requests:]
        assert all(method == 'GET' and url.startswith(base + '/') for method, url in requests), requests
        assert page.evaluate('JSON.stringify(localStorage)') == json.dumps({'existing-island': 'keep-me'}, separators=(',', ':'))
        assert page.evaluate('JSON.stringify(sessionStorage)') == json.dumps({'existing-session': 'keep-me-too'}, separators=(',', ':'))

        # The screen remains scrollable and has no horizontal overflow at small sizes.
        for width, height in [(320, 740), (390, 844), (844, 390), (1440, 1000)]:
            page.set_viewport_size({'width': width, 'height': height})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (width, height)
            for selector in ['#account-submit', '.guest-link', '[data-provider="Google"]', '[data-provider="Facebook"]']:
                bounds = page.locator(selector).bounding_box()
                assert bounds and bounds['width'] >= 44 and bounds['height'] >= 44, (selector, bounds)
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.locator('#tab-login').click()
        page.screenshot(path='/tmp/harborlight-auth-desktop.png', full_page=True)
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path='/tmp/harborlight-auth-mobile.png', full_page=True)

        # Direct registration links work. Guest links deliberately retain the existing island entry.
        page.goto(base + '/harborlight-auth.html?mode=register')
        expect(page.locator('#tab-register')).to_have_attribute('aria-selected', 'true')
        expect(page.locator('.guest-link')).to_have_attribute('href', 'harborlight-v1-layered.html')
        assert not errors, errors
        assert not failed, failed
        context.close()
        browser.close()
    print('PASS account screen: forms, keyboard, mobile, no network authentication and no credential storage')


if __name__ == '__main__':
    run()
