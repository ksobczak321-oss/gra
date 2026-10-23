"""Motion preferences: system default, explicit enable, reload and visibility.

Uses actual canvas pixels and the visible settings checkbox. Runs its own HTTP
server unless HARBORLIGHT_BASE_URL is provided. The visibility check supplies
the browser visibility signal without changing application simulation state.
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
KEY = 'harborlight-v1-interactive-save'


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextmanager
def static_site():
    configured = os.environ.get('HARBORLIGHT_BASE_URL')
    if configured:
        yield configured.rstrip('/')
        return
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{server.server_address[1]}'
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def visit(page, base):
    assert page.goto(base + '/harborlight-v1-layered.html').status == 200
    page.wait_for_selector('#island-ambient[data-ready="true"]')
    page.wait_for_function("document.getElementById('island-ambient').dataset.mode !== 'loading'")


def snapshot(page, region=None):
    return page.locator('#island-ambient').evaluate('''(canvas, region) => {
      const sx = canvas.width / 1672, sy = canvas.height / 941;
      const [x,y,w,h] = region || [0,0,1672,941];
      const pixels = canvas.getContext('2d').getImageData(Math.floor(x*sx), Math.floor(y*sy), Math.ceil(w*sx), Math.ceil(h*sy)).data;
      let hash = 2166136261;
      for (const pixel of pixels) hash = Math.imul(hash ^ pixel, 16777619);
      return {hash: hash >>> 0, time: Number(canvas.dataset.time), mode: canvas.dataset.mode};
    }''', region)


def frozen(page, mode):
    page.wait_for_function("mode => document.getElementById('island-ambient').dataset.mode === mode", arg=mode)
    first = snapshot(page)
    page.wait_for_timeout(400)
    second = snapshot(page)
    assert first == second, (first, second)


def moving(page):
    page.wait_for_function("document.getElementById('island-ambient').dataset.mode === 'running'")
    regions = {'water': [20,650,160,110], 'smoke': [480,150,84,75]}
    before = {name: snapshot(page, region) for name, region in regions.items()}
    page.wait_for_timeout(600)
    for name, region in regions.items():
        after = snapshot(page, region)
        assert after['time'] > before[name]['time'], (name, before[name], after)
        assert after['hash'] != before[name]['hash'], (name, 'actual canvas pixels did not move')


def run():
    with static_site() as base, sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
        errors, failures = [], []
        context = browser.new_context(viewport={'width':1672, 'height':941}, reduced_motion='reduce')
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: failures.append((response.status,response.url)) if response.status >= 400 else None)
        visit(page, base)
        frozen(page, 'reduced')
        page.locator('#hit-settings').click()
        motion = page.get_by_role('checkbox', name='Animations and highlights')
        expect(motion).not_to_be_checked()
        motion.check()
        moving(page)
        saved = json.loads(page.evaluate('key => localStorage.getItem(key)', KEY))
        assert saved['settings']['motion'] is True
        assert saved['settings']['motionOverride'] is True
        print('PASS OS preference is respected by default; explicit enable moves actual water and smoke')

        page.reload()
        page.wait_for_selector('#island-ambient[data-ready="true"]')
        moving(page)
        page.locator('#hit-settings').click()
        motion = page.get_by_role('checkbox', name='Animations and highlights')
        expect(motion).to_be_checked()
        motion.uncheck()
        frozen(page, 'reduced')
        motion.check()
        moving(page)
        page.locator('.dialog-close').click()
        print('PASS explicit motion choice survives reload, and the off/on control remains effective')

        # Drive the visibility dependency directly; no private game state is
        # changed. A hidden world must stop its RAF and resume when visible.
        page.evaluate('''() => {
          Object.defineProperty(document, 'hidden', {configurable:true, get:() => true});
          document.dispatchEvent(new Event('visibilitychange'));
        }''')
        frozen(page, 'hidden')
        page.evaluate('''() => {
          Object.defineProperty(document, 'hidden', {configurable:true, get:() => false});
          document.dispatchEvent(new Event('visibilitychange'));
        }''')
        moving(page)
        print('PASS hidden-world frame suspension resumes when the visibility signal changes')
        context.close()

        # A legacy pause or zero speed flag cannot freeze real-time island art.
        context = browser.new_context(viewport={'width':1672, 'height':941}, reduced_motion='no-preference')
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        legacy = {'version':7, 'paused':True, 'speed':0, 'settings':{'motion':True}}
        page.add_init_script('localStorage.setItem(' + json.dumps(KEY) + ',' + json.dumps(json.dumps(legacy)) + ');')
        visit(page, base)
        moving(page)
        assert not errors, errors
        assert not failures, failures
        print('PASS legacy pause/speed cannot freeze the island; no JavaScript or HTTP errors')
        context.close()
        browser.close()


if __name__ == '__main__':
    run()
