"""Population HUD, real browser clock and migration acceptance checks.

Run the static server first. Uses saved-game fixtures only to reach population
boundaries; time advances through the browser's real application timers.
"""
import json
import os
from datetime import datetime, timezone

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get('HARBORLIGHT_BASE_URL', 'http://127.0.0.1:8002').rstrip('/')
CHROMIUM = os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium')
SAVE_KEY = 'harborlight-v1-interactive-save'
RESOURCES = ['coins', 'wood', 'stone', 'food', 'planks']


def visit(context, fixture=None, clock=False):
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failures.append((response.status, response.url)) if response.status >= 400 else None)
    page.on('requestfailed', lambda request: failures.append((request.failure, request.url)))
    if fixture is not None:
        page.add_init_script('''if (!sessionStorage.getItem('population-fixture')) {
          localStorage.setItem('harborlight-v1-interactive-save', %s);
          sessionStorage.setItem('population-fixture', '1');
        }''' % json.dumps(json.dumps(fixture)))
    if clock:
        now = datetime(2026, 10, 21, 12, 0, 0, tzinfo=timezone.utc)
        page.clock.install(time=now)
        page.clock.pause_at(now)
    assert page.goto(BASE + '/harborlight-v1-layered.html').status == 200
    page.wait_for_selector('[data-hud="level"]')
    page.wait_for_function('document.getElementById("loading").hidden')
    return page


def save(page):
    page.locator('#hit-settings').click()
    page.get_by_role('button', name='Zapisz teraz', exact=True).click()
    page.locator('.dialog-close').click()
    return json.loads(page.evaluate('key => localStorage.getItem(key)', SAVE_KEY))


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROMIUM, args=['--no-sandbox'])
    errors, failures = [], []
    try:
        # Fresh sessions really use the new starter kit, including the fifth resource.
        context = browser.new_context(viewport={'width': 1672, 'height': 941}, reduced_motion='reduce')
        page = visit(context)
        page.locator('#hit-pause').click()
        expect(page.locator('[data-hud="level"]')).to_have_text('1')
        expect(page.locator('[data-hud="happiness"]')).to_have_text('0%')
        expect(page.locator('[data-hud="population"]')).to_have_text('12 / 24')
        for resource in RESOURCES:
            expect(page.locator(f'[data-hud="{resource}"]')).to_have_text('100')
        initial = save(page)
        assert initial['population'] == 12 and initial['happiness'] == 0
        assert initial['resources'] == dict.fromkeys(RESOURCES, 100)
        assert initial['version'] == 2
        page.locator('#hit-level').click()
        expect(page.locator('#dialog-title')).to_have_text('Ratusz')
        page.locator('.dialog-close').click()
        page.locator('#hit-happiness').click()
        expect(page.locator('[data-population-stat="growth"]')).to_contain_text('brak przyrostu i ubytku')
        page.locator('.dialog-close').click()
        for width, height in [(390, 844), (844, 390)]:
            page.set_viewport_size({'width': width, 'height': height})
            expect(page.locator('.mobile-island-hud')).to_be_visible()
            for key, expected in [('level', '1'), ('happiness', '0%'), ('population', '12 / 24')]:
                node = page.locator(f'[data-mobile-hud="{key}"]')
                expect(node).to_have_text(expected)
                bounds = node.bounding_box()
                assert 0 <= bounds['x'] and bounds['x'] + bounds['width'] <= width
            page.locator('[data-mobile-hud="happiness"]').click()
            expect(page.locator('[data-population-stat="happiness"]')).to_have_text('0%')
            page.locator('.dialog-close').click()
        context.close()
        print('PASS starter kit, five resources, level/happiness navigation and mobile HUD')

        # A full active hour at 4x production still yields exactly one resident.
        context = browser.new_context(viewport={'width': 1672, 'height': 941}, reduced_motion='reduce')
        page = visit(context, {'version': 2, 'happiness': 100, 'population': 12,
                               'populationProgress': 0, 'populationDirection': 1,
                               'speed': 4, 'settings': {'motion': False}}, clock=True)
        page.locator('#hit-happiness').click()
        page.clock.run_for(3_599_000)
        expect(page.locator('[data-hud="population"]')).to_have_text('12 / 24')
        page.clock.run_for(1_000)
        expect(page.locator('[data-hud="population"]')).to_have_text('13 / 24')
        expect(page.locator('[data-population-stat="population"]')).to_have_text('13 / 24')
        page.locator('.dialog-close').click()
        page.locator('#hit-pause').click()
        page.clock.run_for(3_600_000)
        expect(page.locator('[data-hud="population"]')).to_have_text('13 / 24')
        recorded = save(page)
        assert recorded['population'] == 13 and recorded['paused']
        page.reload()
        expect(page.locator('[data-hud="population"]')).to_have_text('13 / 24')
        context.close()
        print('PASS full real active hour at 4x, live population panel, pause and saved reload')

        # Existing signed saves migrate without giving the user another starter kit.
        context = browser.new_context(viewport={'width': 1672, 'height': 941}, reduced_motion='reduce')
        page = visit(context, {'version': 1, 'resources': dict.fromkeys(RESOURCES, 321),
                               'population': 30, 'happiness': -50, 'paused': True,
                               'buildings': {'townhall': {'level': 3, 'workers': 1}}})
        expect(page.locator('[data-hud="level"]')).to_have_text('3')
        expect(page.locator('[data-hud="happiness"]')).to_have_text('−50%')
        expect(page.locator('#hit-happiness')).to_have_attribute('data-sentiment', 'negative')
        expect(page.locator('[data-hud="population"]')).to_have_text('30 / 72')
        migrated = save(page)
        assert migrated['version'] == 2 and migrated['resources'] == dict.fromkeys(RESOURCES, 321)
        context.close()
        print('PASS existing save migration, negative happiness and townhall-derived limit')

        # Negative happiness crosses the last allowed boundary through application timers.
        context = browser.new_context(viewport={'width': 1672, 'height': 941}, reduced_motion='reduce')
        page = visit(context, {'version': 2, 'population': 7, 'happiness': -100,
                               'populationProgress': 3599 / 3600, 'populationDirection': -1,
                               'settings': {'motion': False}}, clock=True)
        page.locator('#hit-happiness').click()
        page.clock.run_for(2_000)
        expect(page.locator('[data-hud="population"]')).to_have_text('6 / 24')
        expect(page.locator('[data-population-stat="population"]')).to_have_text('6 / 24')
        expect(page.locator('[data-population-stat="growth"]')).to_contain_text('minimum 6')
        page.clock.run_for(3_600_000)
        expect(page.locator('[data-hud="population"]')).to_have_text('6 / 24')
        page.locator('.dialog-close').click()
        at_floor = save(page)
        assert sum(b['workers'] for b in at_floor['buildings'].values()) <= 6
        assert at_floor['populationProgress'] == 0
        assert all(value >= 0 for value in at_floor['resources'].values())
        context.close()
        print('PASS negative happiness, minimum six, live worker trim and nonnegative resources')
    finally:
        browser.close()
    assert not errors, errors
    assert not failures, failures
    print('PASS population browser checks without JavaScript or HTTP errors')
