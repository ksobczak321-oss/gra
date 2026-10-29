"""Account locale round trips and island animation lifecycle recovery.

Uses real Chromium canvas pixels. RAF callback loss, page lifecycle and context
signals are supplied at the browser boundary without changing island logic.
"""
import importlib.util
import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

HELPER = Path(__file__).with_name('harborlight-auth-smoke.py')
SPEC = importlib.util.spec_from_file_location('auth_smoke', HELPER)
AUTH = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUTH)


def pixels(page, region):
    return page.locator('#island-ambient').evaluate('''(canvas, region) => {
      const sx = canvas.width / 1672, sy = canvas.height / 941;
      const [x,y,w,h] = region;
      const data = canvas.getContext('2d').getImageData(Math.floor(x*sx), Math.floor(y*sy), Math.ceil(w*sx), Math.ceil(h*sy)).data;
      let hash = 2166136261;
      for (const value of data) hash = Math.imul(hash ^ value, 16777619);
      return hash >>> 0;
    }''', region)


def moving(page):
    page.wait_for_function("document.getElementById('island-ambient').dataset.mode === 'running'")
    regions = [[20,650,160,110], [480,150,84,75]]
    before = [pixels(page, region) for region in regions]
    page.wait_for_timeout(450)
    after = [pixels(page, region) for region in regions]
    assert all(a != b for a, b in zip(before, after)), ('Water or smoke pixels stopped', before, after)


def stopped(page, mode):
    page.wait_for_function("mode => document.getElementById('island-ambient').dataset.mode === mode", arg=mode)
    before = page.evaluate("({frames:document.getElementById('island-ambient').dataset.frames, raf:window.rafRequests})")
    page.wait_for_timeout(1200)
    after = page.evaluate("({frames:document.getElementById('island-ambient').dataset.frames, raf:window.rafRequests})")
    assert before == after, ('A suspended world kept requesting or painting frames', mode, before, after)


def run():
    with AUTH.static_site() as base, sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
        context = browser.new_context(viewport={'width':1440, 'height':1000}, reduced_motion='no-preference')
        page = context.new_page()
        errors, failed, requests = [], [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: failed.append((response.status, response.url)) if response.status >= 400 else None)
        page.on('request', lambda request: requests.append((request.method, request.url)))
        page.add_init_script("localStorage.setItem('harborlight-language', 'pl');")
        page.goto(base + '/harborlight-auth.html?mode=register')
        expect(page.locator('#account-fields')).to_be_enabled()
        expect(page.locator('html')).to_have_attribute('lang', 'pl')
        expect(page).to_have_title('HARBORLIGHT — Witaj na wyspie')
        expect(page.locator('#auth-title')).to_have_text('Tutaj zaczyna się Twoja wyspa.')
        expect(page.locator('#password')).to_have_attribute('placeholder', 'Wybierz hasło')
        expect(page.locator('#password-visibility')).to_have_attribute('aria-label', 'Pokaż hasło')
        expect(page.locator('[data-provider="Google"]')).to_contain_text('Kontynuuj przez Google')
        page.locator('#display-name').fill('Captain')
        page.locator('#island-name').fill('Zatoka Światła')
        page.locator('#email').fill('captain@example.com')
        page.locator('#password').fill('island-password')
        page.locator('#confirm-password').fill('different-password')
        page.locator('#account-submit').click()
        expect(page.locator('#confirm-error')).to_have_text('Hasła nie są takie same.')
        page.locator('#auth-language').select_option('en')
        expect(page.locator('#confirm-error')).to_have_text('The passwords do not match.')
        expect(page.locator('#password')).to_have_value('island-password')
        expect(page.locator('#auth-title')).to_have_text('Your island starts here.')
        expect(page).to_have_title('HARBORLIGHT — Welcome Home')
        page.locator('#password-visibility').click()
        page.locator('#auth-language').select_option('pl')
        expect(page.locator('#password')).to_have_attribute('type', 'text')
        expect(page.locator('#password-visibility')).to_have_attribute('aria-label', 'Ukryj hasło')
        page.locator('[data-provider="Facebook"]').click()
        expect(page.locator('#account-status')).to_contain_text('Logowanie przez Facebook będzie dostępne wkrótce.')
        page.locator('#auth-language').select_option('en')
        expect(page.locator('#account-status')).to_contain_text('Facebook sign-in is coming soon.')
        page.locator('#tab-login').click()
        expect(page.locator('#auth-title')).to_have_text('Welcome back.')
        page.locator('#auth-language').select_option('pl')
        expect(page.locator('#auth-title')).to_have_text('Witaj ponownie.')
        for width, height in [(320,740), (390,844), (844,390), (1440,1000)]:
            page.set_viewport_size({'width':width, 'height':height})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (width, height)
            for selector in ['#auth-language', '#account-submit', '.guest-link']:
                bounds = page.locator(selector).bounding_box()
                assert bounds and bounds['width'] >= 44 and bounds['height'] >= 44, (selector, bounds)
        page.set_viewport_size({'width':390, 'height':844})
        page.screenshot(path='/tmp/harborlight-v13-auth-pl-mobile.png', full_page=True)
        assert page.evaluate("localStorage.getItem('harborlight-language')") == 'pl'
        assert all(method == 'GET' and url.startswith(base + '/') for method, url in requests), requests
        print('PASS auth: initial Polish preference, reversible titles/labels/errors, form state, responsive layout, no authentication calls')

        # Isolate the ambient canvas from game simulation while retaining its real art.
        page.set_viewport_size({'width':1672, 'height':941})
        page.evaluate('''async () => {
          document.body.innerHTML = '<div id="test-stage"></div>';
          window.rafRequests = 0; window.droppedFrames = 0; window.dropNextFrame = false;
          const nativeRaf = window.requestAnimationFrame.bind(window);
          window.requestAnimationFrame = callback => {
            window.rafRequests++;
            if (window.dropNextFrame) {
              window.dropNextFrame = false;
              return nativeRaf(() => { window.droppedFrames++; });
            }
            return nativeRaf(callback);
          };
          window.motionState = {settings:{motion:true,motionOverride:true}};
          const {createAmbientScene} = await import('./harborlight-v1-ambient.js?v=v13-lifecycle-test');
          window.ambientScene = createAmbientScene(document.getElementById('test-stage'), () => window.motionState);
          await window.ambientScene.ready;
        }''')
        moving(page)
        page.evaluate('window.dropNextFrame = true')
        page.wait_for_function('window.droppedFrames === 1')
        page.wait_for_function("Number(document.getElementById('island-ambient').dataset.recoveries) >= 1", timeout=5000)
        moving(page)
        page.evaluate("dispatchEvent(new PageTransitionEvent('pagehide', {persisted:true}))")
        stopped(page, 'hidden')
        page.evaluate("dispatchEvent(new PageTransitionEvent('pageshow', {persisted:true}))")
        moving(page)
        page.evaluate("document.getElementById('island-ambient').dispatchEvent(new Event('contextlost', {cancelable:true}))")
        stopped(page, 'context-lost')
        page.evaluate("document.getElementById('island-ambient').dispatchEvent(new Event('contextrestored'))")
        moving(page)
        page.evaluate('''() => {
          Object.defineProperty(document, 'hidden', {configurable:true,get:()=>true});
          document.dispatchEvent(new Event('visibilitychange'));
        }''')
        stopped(page, 'hidden')
        page.evaluate('''() => {
          Object.defineProperty(document, 'hidden', {configurable:true,get:()=>false});
          document.dispatchEvent(new Event('visibilitychange'));
        }''')
        moving(page)
        page.emulate_media(reduced_motion='reduce')
        page.evaluate('''() => {
          window.motionState.settings.motionOverride = false;
          document.getElementById('test-stage').dispatchEvent(new Event('island-statechange'));
        }''')
        stopped(page, 'reduced')
        page.evaluate('''() => {
          window.motionState.settings.motionOverride = true;
          document.getElementById('test-stage').dispatchEvent(new Event('island-statechange'));
        }''')
        moving(page)
        page.evaluate('window.dropNextFrame = true')
        page.wait_for_function('window.droppedFrames === 2')
        page.evaluate("dispatchEvent(new Event('focus'))")
        moving(page)
        page.evaluate('window.ambientScene.destroy()')
        assert page.locator('#island-ambient').count() == 0
        requests_after_destroy = page.evaluate('window.rafRequests')
        page.evaluate("dispatchEvent(new Event('focus')); dispatchEvent(new PageTransitionEvent('pageshow', {persisted:true})); dispatchEvent(new Event('resize'))")
        page.wait_for_timeout(2200)
        assert page.evaluate('window.rafRequests') == requests_after_destroy
        assert not errors, errors
        assert not failed, failed
        print('PASS ambient: actual water/smoke motion recovers after dropped RAF, BFCache, canvas context and visibility; reduced motion suspends RAF; destroy removes callbacks')
        context.close()
        browser.close()


if __name__ == '__main__':
    run()
