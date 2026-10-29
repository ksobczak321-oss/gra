"""v14 dock, friendly workforce panel and isolated fresh-start acceptance.

Run directly for a temporary local server, or set HARBORLIGHT_BASE_URL to test
the public deployment. Browser storage belongs only to these test contexts.
"""
from datetime import datetime, timedelta, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import threading

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
MAIN_KEY = 'harborlight-v1-interactive-save'
DEFAULT_KEY = 'harborlight-v1-new-player-save'
SLOT_KEY = DEFAULT_KEY + '-start-20261029'
NOW = datetime(2026, 10, 29, 12, tzinfo=timezone.utc)
ADMINISTRATION = ['townhall', 'house', 'warehouse', 'market', 'dock', 'chapel', 'lighthouse']
ECONOMY = ['farm', 'windmill', 'quarry', 'lumber', 'sawmill']
CATEGORIES = ['administration', 'economy', 'resources', 'decorations', 'paths']
ORIGINAL = json.dumps({'sentinel': 'existing-island', 'resources': {'coins': 43210}})
DEFAULT = json.dumps({'sentinel': 'previous-new-player', 'population': 17})


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = os.environ.get('HARBORLIGHT_BASE_URL', 'http://127.0.0.1:' + str(server.server_port)).rstrip('/')
URL = BASE + '/harborlight-v1-layered.html?profile=new-player&slot=start-20261029&v=frontend-v14'
errors, failures = [], []


def visit(browser, mobile=False, language='pl'):
    context = browser.new_context(
        viewport={'width': 390 if mobile else 1672, 'height': 844 if mobile else 941},
        is_mobile=mobile, has_touch=mobile, reduced_motion='reduce')
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failures.append((response.status, response.url)) if response.status >= 400 else None)
    page.on('requestfailed', lambda request: failures.append((request.failure, request.url)))
    page.clock.install(time=NOW - timedelta(seconds=1))
    page.clock.pause_at(NOW)
    page.add_init_script('''(() => {
      if (!sessionStorage.getItem('v14-seeded')) {
        localStorage.setItem(%s, %s);
        localStorage.setItem(%s, %s);
        localStorage.setItem('harborlight-language', %s);
        sessionStorage.setItem('v14-seeded', 'yes');
      }
    })();''' % (json.dumps(MAIN_KEY), json.dumps(ORIGINAL), json.dumps(DEFAULT_KEY), json.dumps(DEFAULT), json.dumps(language)))
    response = page.goto(URL)
    assert response and response.ok
    page.wait_for_function('document.getElementById("loading").hidden')
    page.wait_for_selector('[data-hud="working"]', state='attached')
    return context, page


def saved(page):
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    value = page.evaluate('(key) => localStorage.getItem(key)', SLOT_KEY)
    assert value, 'The fresh slot must have its own persistent save'
    return json.loads(value)


def untouched(page):
    assert page.evaluate('(key) => localStorage.getItem(key)', MAIN_KEY) == ORIGINAL
    assert page.evaluate('(key) => localStorage.getItem(key)', DEFAULT_KEY) == DEFAULT


def close(page):
    page.locator('.dialog-close').click()
    expect(page.locator('#island-dialog')).not_to_be_visible()


def category(page, name, mobile=False):
    selector = f'[data-mobile-category="{name}"]' if mobile else f'#hit-category-{name}'
    page.locator(selector).click()
    expect(page.locator(selector)).to_have_attribute('aria-pressed', 'true')


def buildings(page, mobile=False):
    selector = '[data-mobile-building]' if mobile else '[data-dock-building]:visible'
    key = 'mobileBuilding' if mobile else 'dockBuilding'
    return page.locator(selector).evaluate_all('(nodes,key) => nodes.map(node => node.dataset[key])', key)


def no_overflow(page, root='#island-dialog .dialog-body'):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Page overflows horizontally'
    assert page.locator(root).evaluate('(node) => node.scrollWidth <= node.clientWidth + 1'), 'Panel overflows horizontally'
    bounds = page.locator('#island-dialog').bounding_box()
    assert bounds and bounds['x'] >= -1 and bounds['x'] + bounds['width'] <= page.viewport_size['width'] + 1
    clipped = page.locator('.workers-metric,.workers-food-metrics>div').evaluate_all('(nodes) => nodes.filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.textContent)')
    assert not clipped, clipped


def open_workers(page, mobile=False):
    category(page, 'administration', mobile)
    page.locator('[data-mobile-building="house"]' if mobile else '#hit-dock-house').click()
    page.locator('[data-manage-workers]').click()
    expect(page.locator('[data-workers-panel]')).to_be_visible()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
        headless=True, args=['--no-sandbox'])
    try:
        context, page = visit(browser)
        state = saved(page)
        assert state['resources'] == dict.fromkeys(['coins', 'wood', 'stone', 'grain', 'food', 'planks'], 100), state['resources']
        assert state['population'] == 12 and state['buildings']['townhall']['level'] == 1
        assert sum(building['workers'] for building in state['buildings'].values()) == 0
        assert state.get('previewBuildStockVersion') is None
        untouched(page)
        assert page.locator('[data-dock-category]').evaluate_all('(nodes) => nodes.map(node => node.dataset.dockCategory)') == CATEGORIES
        category(page, 'administration')
        assert buildings(page) == ADMINISTRATION
        expect(page.locator('#hit-category-administration')).to_have_text('Administracja')
        expect(page.locator('#hit-category-economy')).to_have_text('Gospodarka')
        dimensions = page.locator('[data-dock-building]:visible').evaluate_all('(nodes) => nodes.map(node => {const r=node.getBoundingClientRect();return {width:r.width,height:r.height,font:parseFloat(getComputedStyle(node).fontSize)};})')
        assert all(item['width'] >= 130 and item['height'] >= 140 and item['font'] >= 13 for item in dimensions), dimensions
        page.screenshot(path='/tmp/harborlight-v14-administration.png')
        category(page, 'economy')
        assert buildings(page) == ECONOMY
        page.screenshot(path='/tmp/harborlight-v14-economy.png')
        page.locator('#hit-dock-farm').click()
        expect(page.locator('#dialog-title')).to_have_text('Gospodarstwo')
        close(page)
        category(page, 'resources')
        expect(page.locator('[data-dock-resource]:visible')).to_have_count(5)
        category(page, 'decorations')
        expect(page.locator('[data-attraction]:visible')).to_have_count(5)
        category(page, 'paths')
        expect(page.locator('[data-road-level]:visible')).to_have_count(5)
        print('PASS larger desktop dock, all five tabs, exact Administration/Economy split and preserved resources/attractions/paths')

        open_workers(page)
        expect(page.locator('[data-population-stat="free"]')).to_have_text('12')
        no_overflow(page)
        page.screenshot(path='/tmp/harborlight-v14-workers-pl.png')
        page.locator('[data-worker-building="farm"][data-worker-delta="1"]').click()
        state = saved(page)
        assert state['buildings']['farm']['workers'] == 1
        expect(page.locator('[data-population-stat="free"]')).to_have_text('11')
        expect(page.locator('[data-population-stat="arriving"]')).to_have_text('1')
        page.clock.fast_forward(300000)
        crew = [person for person in saved(page)['residents'] if person['workplace'] == 'farm']
        assert len(crew) == 1 and crew[0]['arrivalRemaining'] == 0, crew
        expect(page.locator('[data-population-stat="arriving"]')).to_have_text('0')
        page.locator('[data-worker-building="farm"][data-worker-delta="-1"]').click()
        assert saved(page)['buildings']['farm']['workers'] == 0
        expect(page.locator('[data-population-stat="returning"]')).to_have_text('1')
        page.clock.fast_forward(300000)
        expect(page.locator('[data-population-stat="free"]')).to_have_text('12')
        expect(page.locator('[data-population-stat="returning"]')).to_have_text('0')
        no_overflow(page)
        close(page)
        page.reload()
        page.wait_for_function('document.getElementById("loading").hidden')
        assert saved(page)['buildings']['farm']['workers'] == 0
        untouched(page)
        page.locator('#hit-settings').click()
        page.locator('select[aria-label="Język"]').select_option('en')
        close(page)
        expect(page.locator('#hit-category-administration')).to_have_text('Administration')
        expect(page.locator('#hit-category-economy')).to_have_text('Economy')
        open_workers(page)
        no_overflow(page)
        expect(page.locator('#dialog-title')).to_have_text('Manage all workers')
        page.screenshot(path='/tmp/harborlight-v14-workers-en.png')
        context.close()
        print('PASS friendly workforce panel EN/PL, real assignment/walk/recall/return, stable fresh slot and untouched previous saves')

        context, page = visit(browser, mobile=True)
        expect(page.locator('.mobile-bottom-dock')).to_be_visible()
        world = page.locator('#viewport').bounding_box()
        dock = page.locator('.mobile-bottom-dock').bounding_box()
        assert world and dock and world['y'] + world['height'] + 6 <= dock['y'] + 1, {'world': world, 'dock': dock}
        expect(page.locator('[data-mobile-category]')).to_have_count(5)
        category(page, 'administration', True)
        assert buildings(page, True) == ADMINISTRATION
        dimensions = page.locator('[data-mobile-building]').evaluate_all('(nodes) => nodes.map(node => {const r=node.getBoundingClientRect();return {width:r.width,height:r.height};})')
        assert all(item['width'] >= 125 and item['height'] >= 140 for item in dimensions), dimensions
        page.screenshot(path='/tmp/harborlight-v14-mobile-dock.png')
        category(page, 'economy', True)
        assert buildings(page, True) == ECONOMY
        category(page, 'resources', True)
        expect(page.locator('[data-mobile-resource]')).to_have_count(5)
        category(page, 'decorations', True)
        expect(page.locator('.mobile-dock-scroll .attraction-dock-card')).to_have_count(5)
        category(page, 'paths', True)
        expect(page.locator('.mobile-dock-scroll .path-dock-card')).to_have_count(5)
        open_workers(page, True)
        no_overflow(page)
        page.locator('[data-worker-building="farm"][data-worker-delta="1"]').click()
        expect(page.locator('[data-population-stat="arriving"]')).to_have_text('1')
        no_overflow(page)
        page.screenshot(path='/tmp/harborlight-v14-mobile-workers-pl.png')
        untouched(page)
        close(page)
        page.locator('.mobile-island-menu').click()
        page.get_by_role('button', name='Ustawienia', exact=True).click()
        page.locator('select[aria-label="Język"]').select_option('en')
        close(page)
        expect(page.locator('[data-mobile-category="administration"]')).to_have_text('Administration')
        expect(page.locator('[data-mobile-category="economy"]')).to_have_text('Economy')
        open_workers(page, True)
        no_overflow(page)
        expect(page.locator('#dialog-title')).to_have_text('Manage all workers')
        hungry = saved(page)
        hungry['resources']['food'] = 0
        hungry['foodCredit'] = 0
        for person in hungry['residents']:
            person['hungerSeconds'] = 12 * 3600
            person['fedRecoverySeconds'] = 0
        page.evaluate('(value) => sessionStorage.setItem("v14-hungry-fixture", JSON.stringify(value))', hungry)
        page.add_init_script('''const hungryFixture = sessionStorage.getItem('v14-hungry-fixture');
          if (hungryFixture) {
            localStorage.setItem(%s, hungryFixture);
            sessionStorage.removeItem('v14-hungry-fixture');
          }''' % json.dumps(SLOT_KEY))
        page.reload()
        page.wait_for_function('document.getElementById("loading").hidden')
        open_workers(page, True)
        expect(page.locator('[data-food-stat="status"]')).to_have_attribute('data-fed', 'false')
        expect(page.locator('[data-food-stat="efficiency"]')).to_have_text('50%')
        assert '5' in page.locator('[data-food-stat="penaltyCompact"]').inner_text()
        no_overflow(page)
        page.screenshot(path='/tmp/harborlight-v14-mobile-workers-hungry.png')
        context.close()
        print('PASS larger touch cards, all five mobile tabs and unclipped EN/PL workforce panel at390px')
        assert not errors, errors
        assert not failures, failures
        print('PASS v14 acceptance with no JavaScript/HTTP errors')
    finally:
        browser.close()
        server.shutdown()
