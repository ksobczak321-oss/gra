"""Browser acceptance for work, individual output, hauling, storage and resident food.

Saved-game fixtures reach expensive population/storage boundaries. Every action
uses public controls, and browser timers account for every simulated work minute.
"""
import json
import os
from datetime import datetime, timedelta, timezone

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get('HARBORLIGHT_BASE_URL', 'http://127.0.0.1:8002').rstrip('/')
CHROMIUM = os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium')
SAVE_KEY = 'harborlight-v1-interactive-save'
MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks']
WORKPLACES = ['farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'warehouse', 'dock', 'market']
BUILDINGS = ['house', *WORKPLACES, 'townhall', 'chapel', 'lighthouse']


def fixture(population=12, level=1, workers=None, resources=None, ready=None):
    workers, resources, ready = workers or {}, resources or {}, ready or {}
    buildings = {key: {'level': 0 if key == 'lighthouse' else level if key in ['house', 'townhall'] else 1,
                      'workers': workers.get(key, 0), 'ready': ready.get(key, 0),
                      'workProgress': [0] * workers.get(key, 0)} for key in BUILDINGS}
    return {'version': 6, 'population': population, 'happiness': 0,
            'resources': {'coins': 100, **dict.fromkeys(MATERIALS, 100), **resources},
            'buildings': buildings, 'transportPriority': MATERIALS,
            'returningWorkers': [], 'taxProgress': 0, 'settings': {'motion': False}}


def visit(browser, data=None, width=1672, height=941, has_touch=False):
    context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce', has_touch=has_touch)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failures.append((response.status, response.url)) if response.status >= 400 else None)
    page.on('requestfailed', lambda request: failures.append((request.failure, request.url)))
    if data is not None:
        page.add_init_script('''if (!sessionStorage.getItem('logistics-fixture')) {
          localStorage.setItem('harborlight-v1-interactive-save', %s);
          sessionStorage.setItem('logistics-fixture', '1');
        }''' % json.dumps(json.dumps(data)))
    now = datetime(2026, 10, 22, 12, 0, 0, tzinfo=timezone.utc)
    page.clock.install(time=now - timedelta(seconds=5))
    page.clock.pause_at(now)
    assert page.goto(BASE + '/harborlight-v1-layered.html').status == 200
    page.wait_for_selector('[data-hud="grain"]')
    page.wait_for_function('document.getElementById("loading").hidden')
    return context, page


def close(page):
    page.locator('.dialog-close').click()


def checkpoint(page):
    if page.locator('#island-dialog').is_visible():
        close(page)
    page.locator('#hit-settings').click()
    page.get_by_role('button', name='Save now', exact=True).click()
    close(page)
    return json.loads(page.evaluate('key => localStorage.getItem(key)', SAVE_KEY))


def control(page, building, action):
    return page.locator(f'[data-worker-building="{building}"][data-worker-action="{action}"]')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROMIUM, args=['--no-sandbox'])
    errors, failures = [], []
    try:
        # All five producer panels share the same compact, live 2×2 summary.
        for producer in ['farm', 'windmill', 'lumber', 'sawmill', 'quarry']:
            data = fixture(level=2, workers={producer: 1})
            data['paused'] = True
            context, page = visit(browser, data, has_touch=True)
            page.locator('#hit-world-' + producer).click()
            grid = page.locator(f'[data-production-summary="{producer}"]')
            expect(grid).to_be_visible()
            cells = grid.locator(':scope > *')
            expect(cells).to_have_count(4)
            for index, label in enumerate(['Level', 'Storage', 'Workers', 'Taxes']):
                expect(cells.nth(index)).to_contain_text(label)
            positions = cells.evaluate_all('(nodes) => nodes.map(node => { const box = node.getBoundingClientRect(); return [box.x, box.y]; })')
            assert abs(positions[0][1] - positions[1][1]) <= 1, positions
            assert abs(positions[2][1] - positions[3][1]) <= 1, positions
            assert positions[2][1] > positions[0][1] and positions[1][0] > positions[0][0], positions
            expect(page.locator(f'[data-local-buffer="{producer}"]')).to_have_count(1)
            expect(page.locator(f'[data-local-buffer="{producer}"]')).to_have_text('0 / 400')
            phase = page.locator(f'[data-work-progress="{producer}"]')
            expect(phase).to_have_count(1)
            expect(phase).to_be_visible()
            assert grid.evaluate('(node, phase) => node.contains(document.querySelector(phase))', f'[data-work-progress="{producer}"]')
            assert phase.evaluate('(node) => parseFloat(getComputedStyle(node).fontSize)') <= 13
            expect(page.locator('[data-worker-action]')).to_have_count(0)
            minus = page.locator(f'[data-worker-building="{producer}"][data-worker-delta="-1"]')
            plus = page.locator(f'[data-worker-building="{producer}"][data-worker-delta="1"]')
            expect(minus).to_have_count(1)
            expect(plus).to_have_count(1)
            expect(page.locator(f'[data-worker-count="{producer}"]')).to_have_text('1')
            expect(page.locator(f'[data-worker-limit="{producer}"]')).to_have_text('6')
            minus.click()
            expect(minus).to_be_disabled()
            expect(page.locator(f'[data-worker-count="{producer}"]')).to_have_text('0')
            for _ in range(6): plus.click()
            expect(plus).to_be_disabled()
            expect(page.locator(f'[data-worker-count="{producer}"]')).to_have_text('6')
            expect(cells.nth(3)).to_contain_text('6 coins/h')
            production_info = page.locator(f'[data-production-info="{producer}"]')
            production_help = page.locator(f'[data-production-help="{producer}"]')
            expect(production_help).not_to_be_visible()
            production_info.click()
            expect(production_help).to_be_visible()
            assert 'warehouse' in production_help.inner_text().lower()
            page.keyboard.press('Escape')
            expect(production_help).not_to_be_visible()
            expect(page.locator('#island-dialog')).to_be_visible()
            expect(production_info).to_be_focused()
            page.set_viewport_size({'width': 390, 'height': 844})
            production_info.tap()
            expect(production_help).to_be_visible()
            bounds = production_help.bounding_box()
            assert bounds['x'] >= 0 and bounds['x'] + bounds['width'] <= 391, bounds
            production_info.tap()
            expect(production_help).not_to_be_visible()
            context.close()
        print('PASS all five compact producer grids, single storage/clock, inline staffing limits/taxes and production help on keyboard/touch')

        # Actual population, not townhall capacity, limits every workplace.
        context, page = visit(browser, fixture(population=144, level=6))
        page.locator('#hit-world-farm').click()
        expect(page.locator('[data-local-buffer="farm"]')).to_have_text('0 / 1,200')
        close(page)
        page.locator('#hit-population').click()
        expect(page.locator('[data-workplace]')).to_have_count(8)
        for key in WORKPLACES:
            expect(page.locator(f'[data-worker-limit="{key}"]')).to_have_text('72')
        control(page, 'farm', 'max').click()
        expect(page.locator('[data-worker-count="farm"]')).to_have_text('72')
        control(page, 'warehouse', 'max').click()
        expect(page.locator('[data-worker-count="warehouse"]')).to_have_text('72')
        expect(page.locator('[data-population-stat="free"]')).to_have_text('0')
        expect(page.locator('[data-population-stat="taxes"]')).to_have_text('144 coins/h')
        expect(control(page, 'windmill', 'max')).to_be_disabled()
        close(page)
        page.locator('#hit-world-quarry').click()
        expect(page.locator('[data-worker-building="quarry"][data-worker-delta="1"]')).to_be_disabled()
        expect(page.locator('[data-worker-building="quarry"][data-worker-delta="-1"]')).to_be_disabled()
        close(page)
        page.locator('#hit-population').click()
        control(page, 'farm', 'clear').click()
        expect(page.locator('[data-population-stat="returning"]')).to_have_text('72')
        expect(page.locator('[data-population-stat="free"]')).to_have_text('0')
        page.clock.run_for(299_000)
        expect(control(page, 'windmill', 'max')).to_be_disabled()
        page.clock.run_for(1_000)
        expect(page.locator('[data-population-stat="returning"]')).to_have_text('0')
        expect(page.locator('[data-population-stat="free"]')).to_have_text('72')
        control(page, 'windmill', 'max').click()
        expect(page.locator('[data-worker-count="windmill"]')).to_have_text('72')
        checkpoint(page)
        context.close()
        print('PASS level6, actual144 population, 72-worker cap, shared free pool and exact five-minute home return')

        # Individual output floors at whole six-minute units; old partial work is discarded.
        context, page = visit(browser, fixture(workers={'farm': 2}))
        page.clock.run_for(180_000)
        individual = checkpoint(page)
        assert individual['buildings']['farm']['ready'] == 0
        assert individual['buildings']['farm']['workProgress'] == [180, 180]
        context.close()

        context, page = visit(browser, fixture(workers={'farm': 1}))
        page.locator('#hit-world-farm').click()
        expect(page.locator('[data-collect]')).to_have_count(0)
        page.clock.run_for(420_000)
        expect(page.locator('[data-local-buffer="farm"]')).to_have_text('1 / 200')
        page.locator('[data-worker-building="farm"][data-worker-delta="-1"]').click()
        first = checkpoint(page)
        assert first['buildings']['farm']['ready'] == 1
        assert first['buildings']['farm']['workProgress'] == []
        assert len(first['returningWorkers']) == 1
        assert first['resources']['grain'] == 100
        page.clock.run_for(240_000)
        page.reload()
        page.wait_for_selector('[data-hud="grain"]')
        page.clock.run_for(60_000)
        page.locator('#hit-world-farm').click()
        page.locator('[data-worker-building="farm"][data-worker-delta="1"]').click()
        page.clock.run_for(300_000)
        expect(page.locator('[data-local-buffer="farm"]')).to_have_text('1 / 200')
        page.clock.run_for(60_000)
        expect(page.locator('[data-local-buffer="farm"]')).to_have_text('2 / 200')
        context.close()

        context, page = visit(browser, fixture(workers={'farm': 1}))
        page.clock.run_for(780_000)
        thirteen = checkpoint(page)
        assert thirteen['buildings']['farm']['ready'] == 2
        assert abs(thirteen['buildings']['farm']['workProgress'][0] - 60) < 1e-7
        context.close()
        print('PASS 7min→1 and 13min→2 individual outputs, discarded fraction, saved return timer and fresh job phase')

        # Both processors consume central inputs two-to-one, while outputs remain local.
        context, page = visit(browser, fixture(workers={'windmill': 1, 'sawmill': 1},
                                               resources={'grain': 10, 'wood': 10, 'food': 0, 'planks': 0}))
        page.clock.run_for(720_000)
        processed = checkpoint(page)
        assert processed['resources']['grain'] == processed['resources']['wood'] == 8
        assert processed['resources']['food'] == processed['resources']['planks'] == 0
        assert processed['buildings']['windmill']['ready'] == processed['buildings']['sawmill']['ready'] == 1
        context.close()
        print('PASS grain→food and wood→planks at 2:1; local products cannot silently enter central stock')

        # Player priorities determine which available producer inventory gets hauled first.
        data = fixture(workers={'warehouse': 1}, resources={**dict.fromkeys(MATERIALS, 0), 'food': 1},
                       ready={'farm': 3, 'lumber': 3})
        context, page = visit(browser, data)
        page.locator('#hit-world-warehouse').click()
        for _ in range(2):
            page.locator('[data-priority-resource="grain"][data-priority-direction="-1"]').click()
        page.clock.run_for(60_000)
        hauled = checkpoint(page)
        assert hauled['transportPriority'][0] == 'grain'
        assert hauled['resources']['grain'] == 1 and hauled['resources']['wood'] == 0
        assert hauled['buildings']['farm']['ready'] == 2 and hauled['buildings']['lumber']['ready'] == 3
        page.reload()
        page.wait_for_selector('[data-hud="grain"]')
        assert checkpoint(page)['transportPriority'][0] == 'grain'
        context.close()
        print('PASS warehouse worker hauls one item per minute according to saved player priorities')

        # A local plank balance cannot fund construction until centrally hauled.
        data = fixture(level=2, workers={'warehouse': 1},
                       resources={'coins': 1000, **dict.fromkeys(MATERIALS, 500), 'planks': 480, 'food': 600},
                       ready={'sawmill': 20})
        data['buildings']['house']['level'] = 1
        data['transportPriority'] = ['planks', 'wood', 'stone', 'grain', 'food']
        context, page = visit(browser, data)
        page.locator('#hit-pause').click()
        before = checkpoint(page)
        page.locator('#hit-world-house').click()
        expect(page.locator('[data-upgrade-building="house"]')).to_be_disabled()
        assert checkpoint(page)['resources'] == before['resources']
        page.locator('#hit-play').click()
        page.clock.run_for(1_200_000)
        page.locator('#hit-pause').click()
        brought = checkpoint(page)
        assert brought['resources']['planks'] == 500 and brought['buildings']['sawmill']['ready'] == 0
        page.locator('#hit-world-house').click()
        page.locator('[data-upgrade-building="house"]').click()
        built = checkpoint(page)
        assert built['buildings']['house']['level'] == 1
        assert built['buildings']['house']['construction']['stage'] == 'transport'
        assert built['resources']['planks'] == 0
        assert built['resources']['coins'] == brought['resources']['coins'] - 500
        context.close()
        print('PASS construction reserves central stock only, after real warehouse transport')

        # Shared and per-kind limits both apply; unavailable priority sources are skipped.
        data = fixture(workers={'warehouse': 1},
                       resources={'wood': 1000, 'stone': 999, 'grain': 1000, 'food': 1000, 'planks': 0},
                       ready={'lumber': 5, 'quarry': 5, 'sawmill': 5})
        context, page = visit(browser, data)
        page.locator('#hit-world-warehouse').click()
        expect(page.locator('[data-logistics-stat="total"]')).to_have_text('4,000')
        expect(page.locator('[data-logistics-stat="per-resource"]')).to_have_text('1,000')
        page.clock.run_for(120_000)
        full = checkpoint(page)
        assert sum(full['resources'][key] for key in MATERIALS) == 4000
        assert full['resources']['stone'] == 1000 and full['resources']['wood'] == 1000
        assert full['resources']['planks'] == 1
        assert full['resources']['food'] == 999  # Eating freed a shared storage place.
        assert full['buildings']['quarry']['ready'] == 4
        context.close()
        print('PASS independent per-resource and shared warehouse capacity, with full-priority skipping')

        data = fixture(level=6)
        data['buildings']['warehouse']['level'] = 2
        context, page = visit(browser, data)
        page.locator('#hit-world-warehouse').click()
        expect(page.locator('[data-logistics-stat="total"]')).to_have_text('6,000')
        expect(page.locator('[data-logistics-stat="per-resource"]')).to_have_text('1,500')
        context.close()
        print('PASS local storage follows townhall level while central storage follows warehouse level at +50%')

        # Food is automatically reserved and consumed at one unit/resident/hour.
        # A saved partial meal remains available even with zero central units.
        context, page = visit(browser, fixture(resources={'food': 1}, ready={'windmill': 50}))
        page.locator('#hit-resource-food').click()
        expect(page.locator('[data-food-stat="demand"]')).to_have_text('12 food/h')
        expect(page.locator('[data-food-stat="status"]')).to_have_text('Feeding')
        page.clock.run_for(1_000)
        expect(page.locator('[data-food-stat="status"]')).to_have_text('Feeding')
        meal = checkpoint(page)
        assert meal['resources']['food'] == 0
        assert abs(meal['foodCredit'] - (1 - 12 / 3600)) < 1e-8
        page.reload()
        page.wait_for_selector('[data-hud="food"]')
        page.locator('#hit-resource-food').click()
        expect(page.locator('[data-food-stat="status"]')).to_have_text('Feeding')
        page.clock.run_for(299_000)
        expect(page.locator('[data-food-stat="status"]')).to_have_text('Hungry')
        expect(page.locator('[data-food-stat="penalty"]')).to_have_text('0 percentage points/h')
        exhausted = checkpoint(page)
        assert exhausted['resources']['food'] == 0 and exhausted['foodCredit'] < 1e-8
        assert abs(exhausted['happiness'] - 1 / 12) < 1e-8
        page.clock.run_for(3_600_000)
        hungry = checkpoint(page)
        assert hungry['population'] == 12
        assert abs(hungry['happiness'] - 1 / 12) < 1e-7
        assert all(abs(person['hungerSeconds'] - 3600) < 1e-7 for person in hungry['residents'])
        assert hungry['buildings']['windmill']['ready'] == 50
        page.locator('#hit-pause').click()
        page.clock.run_for(60_000)
        assert abs(checkpoint(page)['happiness'] - hungry['happiness']) < 1e-7
        context.close()
        print('PASS automatic resident food, saved meal credit, exact exhaustion, individual 12h hunger grace, central-only supply and pause')

        # A full active hour at 4x production still taxes exactly one coin per assigned worker.
        context, page = visit(browser)
        page.locator('#hit-speed').click()
        page.locator('#hit-speed').click()
        page.locator('#hit-population').click()
        expect(page.locator('[data-population-stat="taxes"]')).to_have_text('6 coins/h')
        page.clock.run_for(3_600_000)
        page.locator('.dialog-close').click()
        page.locator('#hit-pause').click()
        taxed = checkpoint(page)
        assert taxed['resources']['coins'] == 106
        assert taxed['statistics']['taxCollected'] == 6
        assert sum(building['workers'] for building in taxed['buildings'].values()) == 6
        assert taxed['buildings']['townhall']['workers'] == 0
        assert all(taxed['buildings'][key]['ready'] == 0 for key in ['dock', 'market', 'townhall'])
        context.close()
        print('PASS exact six hourly tax coins at 4x; unemployed and retired coin factories do not mint money')
    finally:
        browser.close()
    assert not errors, errors
    assert not failures, failures
    print('PASS logistics browser checks without JavaScript or HTTP errors')
