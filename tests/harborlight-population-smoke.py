"""Population, housing, upgrade locks and browser-clock acceptance checks.

Run the static server first. Uses saved-game fixtures only to reach population
boundaries; time advances through the browser's real application timers.
"""
import json
import os
from datetime import datetime, timedelta, timezone

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get('HARBORLIGHT_BASE_URL', 'http://127.0.0.1:8002').rstrip('/')
CHROMIUM = os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium')
SAVE_KEY = 'harborlight-v1-interactive-save'
RESOURCES = ['coins', 'wood', 'stone', 'food', 'planks', 'grain']


def visit(context, fixture=None, clock=True):
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
        page.clock.install(time=now - timedelta(seconds=5))
        page.clock.pause_at(now)
    assert page.goto(BASE + '/harborlight-v1-layered.html').status == 200
    page.wait_for_selector('[data-hud="level"]')
    page.wait_for_function('document.getElementById("loading").hidden')
    return page


def save(page):
    page.locator('#hit-settings').click()
    page.get_by_role('button', name='Save now', exact=True).click()
    page.locator('.dialog-close').click()
    return json.loads(page.evaluate('key => localStorage.getItem(key)', SAVE_KEY))


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROMIUM, args=['--no-sandbox'])
    errors, failures = [], []
    try:
        # Fresh sessions really use the new starter kit, including grain.
        context = browser.new_context(viewport={'width': 1672, 'height': 941}, reduced_motion='reduce')
        page = visit(context, clock=True)
        expect(page.locator('[data-hud="level"]')).to_have_text('1')
        expect(page.locator('[data-hud="happiness"]')).to_have_text('0%')
        expect(page.locator('[data-hud="population"]')).to_have_text('12 / 24')
        for resource in RESOURCES:
            expect(page.locator(f'[data-hud="{resource}"]')).to_have_text('100')
        initial = save(page)
        assert initial['population'] == 12 and initial['happiness'] == 0
        assert initial['resources'] == dict.fromkeys(RESOURCES, 100)
        assert initial['version'] == 8
        assert initial['buildings']['house']['level'] == 1
        assert all(building['workers'] == 0 for building in initial['buildings'].values())
        assert all(person['newbornRemaining'] == 0 for person in initial['residents'])
        assert initial['paused'] is False and initial['speed'] == 1
        expect(page.locator('[data-hud="housing"]')).to_have_text('Housing: 24')
        page.locator('#hit-level').click()
        expect(page.locator('#dialog-title')).to_have_text('Town Hall')
        page.locator('.dialog-close').click()
        page.locator('#hit-happiness').click()
        expect(page.locator('[data-population-stat="growth"]')).to_contain_text('no population growth or decline')
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
        print('PASS starter kit, six resources, level/happiness navigation and mobile HUD')

        # Legacy speed flags do not accelerate the wall clock. Birth freezes
        # the new person's happiness for 24h; offline elapsed time still runs.
        context = browser.new_context(viewport={'width': 1672, 'height': 941}, reduced_motion='reduce')
        page = visit(context, {'version': 6, 'happiness': 100, 'population': 12,
                               'populationProgress': 0, 'populationDirection': 1,
                               'speed': 4, 'settings': {'motion': False}}, clock=True)
        page.locator('#hit-happiness').click()
        page.clock.fast_forward(3_599_000)
        expect(page.locator('[data-hud="population"]')).to_have_text('12 / 24')
        page.clock.run_for(1_000)
        expect(page.locator('[data-hud="population"]')).to_have_text('13 / 24')
        expect(page.locator('[data-population-stat="population"]')).to_have_text('13 / 24')
        page.locator('.dialog-close').click()
        recorded = save(page)
        assert recorded['population'] == 13 and recorded['paused'] is False and recorded['speed'] == 1
        newborn = max(recorded['residents'], key=lambda person: person['id'])
        assert newborn['happiness'] == 0 and newborn['newbornRemaining'] == 86400
        # No simulation runs in this static page. Returning catches up once,
        # including food and the newborn clock, from the saved wall timestamp.
        page.goto(BASE + '/harborlight-v1-screen.html')
        away = json.loads(page.evaluate('key => localStorage.getItem(key)', SAVE_KEY))
        page.clock.fast_forward(900_000)
        assert json.loads(page.evaluate('key => localStorage.getItem(key)', SAVE_KEY)) == away
        page.goto(BASE + '/harborlight-v1-layered.html')
        page.wait_for_function('document.getElementById("loading").hidden')
        caught_up = save(page)
        returning_newborn = next(person for person in caught_up['residents'] if person['id'] == newborn['id'])
        assert returning_newborn['happiness'] == 0 and returning_newborn['newbornRemaining'] == 85500
        available_food = lambda state: state['resources']['food'] + state['foodCredit']
        assert abs(available_food(away) - available_food(caught_up) - 13 / 4) < 1e-8
        assert caught_up['lastSimulatedAt'] - away['lastSimulatedAt'] == 900_000
        page.reload()
        expect(page.locator('[data-hud="population"]')).to_have_text('13 / 24')
        context.close()
        print('PASS real hour birth despite legacy speed, newborn freeze, offline food/catchup and saved reload')

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
        assert migrated['version'] == 8 and migrated['resources'] == dict.fromkeys(RESOURCES, 321)
        assert migrated['paused'] is False and migrated['speed'] == 1
        assert migrated['buildings']['townhall']['workers'] == 0
        context.close()
        print('PASS existing save migration, negative happiness and townhall-derived limit')

        # Negative happiness crosses the last allowed boundary through application timers.
        context = browser.new_context(viewport={'width': 1672, 'height': 941}, reduced_motion='reduce')
        page = visit(context, {'version': 6, 'population': 7, 'happiness': -100,
                               'populationProgress': 3599 / 3600, 'populationDirection': -1,
                               'settings': {'motion': False}}, clock=True)
        page.locator('#hit-happiness').click()
        page.clock.run_for(2_000)
        expect(page.locator('[data-hud="population"]')).to_have_text('6 / 24')
        expect(page.locator('[data-population-stat="population"]')).to_have_text('6 / 24')
        expect(page.locator('[data-population-stat="growth"]')).to_contain_text('Minimum population of 6')
        page.clock.fast_forward(3_600_000)
        expect(page.locator('[data-hud="population"]')).to_have_text('6 / 24')
        page.locator('.dialog-close').click()
        at_floor = save(page)
        assert sum(b['workers'] for b in at_floor['buildings'].values()) <= 6
        assert at_floor['populationProgress'] == 0
        assert all(value >= 0 for value in at_floor['resources'].values())
        context.close()
        print('PASS negative happiness, minimum six, live worker trim and nonnegative resources')

        # The user's example distinguishes the townhall cap from actual housing.
        context = browser.new_context(viewport={'width': 1672, 'height': 941}, reduced_motion='reduce')
        page = visit(context, {'version': 6, 'resources': {'coins': 10000, **dict.fromkeys([key for key in RESOURCES if key != 'coins'], 600)},
                               'population': 78, 'happiness': 0, 'speed': 4,
                               'buildings': {'townhall': {'level': 4, 'workers': 0},
                                             'house': {'level': 3, 'workers': 0},
                                             **{key: {'level': 1, 'workers': 0} for key in ['farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'warehouse']}},
                               'settings': {'motion': False}}, clock=True)
        page.locator('#hit-population').click()
        for key, value in [('capacity', '96'), ('housing', '72'), ('unhoused', '6'),
                           ('penalty', '−6 percentage points/h')]:
            expect(page.locator(f'[data-population-stat="{key}"]')).to_have_text(value)
        expect(page.locator('[data-housing-warning]')).to_have_attribute('data-overcrowded', 'true')
        expect(page.locator('[data-hud="housing"]')).to_have_text('Housing: 72')
        page.clock.run_for(60_000)
        expect(page.locator('[data-hud="happiness"]')).to_have_text('0%')
        page.clock.fast_forward(3_540_000)
        expect(page.locator('[data-hud="happiness"]')).to_have_text('−5%')
        expect(page.locator('[data-hud="population"]')).to_have_text('78 / 96')
        expect(page.locator('[data-population-stat="happiness"]')).to_have_text('−5%')
        page.locator('.dialog-close').click()
        crowded = save(page)
        assert abs(crowded['happiness'] + 5) < 1e-8
        assert crowded['population'] == 78

        # Reach the completion boundary with a saved, already-funded house project.
        # Detailed reservation and full transport durations are covered separately.
        page.locator('#hit-world-house').click()
        expect(page.locator('[data-upgrade-building="house"]')).to_be_disabled()
        completed = crowded
        completed['paused'] = False
        completed['constructionSequence'] = 1
        completed['constructionProjects'] = [{'building': 'house', 'targetLevel': 4,
            'goodsTotal': 7500, 'goodsRemaining': 0, 'transportSeconds': 11580,
            'buildRemaining': 1, 'stage': 'building', 'order': 1,
            'cost': dict.fromkeys(RESOURCES, 1500)}]
        page.evaluate('(value) => sessionStorage.setItem("housing-completion-fixture", JSON.stringify(value))', completed)
        page.add_init_script('if(sessionStorage.getItem("housing-completion-fixture")){localStorage.setItem("harborlight-v1-interactive-save",sessionStorage.getItem("housing-completion-fixture"));sessionStorage.removeItem("housing-completion-fixture")}')
        page.reload()
        page.wait_for_selector('[data-hud="housing"]')
        page.clock.run_for(1_000)
        expect(page.locator('[data-hud="housing"]')).to_have_text('Housing: 96')
        expanded = save(page)
        assert expanded['buildings']['house']['level'] == 4
        assert expanded['happiness'] <= crowded['happiness']
        page.locator('#hit-world-house').click()
        expect(page.locator('[data-upgrade-building="house"]')).to_be_disabled()
        expect(page.locator('[data-upgrade-lock="house"]')).to_contain_text('Town Hall to level 5')
        page.locator('.dialog-close').click()
        page.clock.run_for(60_000)
        assert abs(save(page)['happiness'] - expanded['happiness'] - 1 / 60) < 1e-8
        page.reload()
        expect(page.locator('[data-hud="housing"]')).to_have_text('Housing: 96')
        expect(page.locator('[data-hud="population"]')).to_have_text('78 / 96')
        context.close()
        print('PASS townhall4/house3: 96 cap, 72 beds, six unhoused, −6 housing +1 feeding = −5 points/hour; housing changes only on construction completion')

        # Legacy investment is retained by promoting the townhall once during migration.
        context = browser.new_context(viewport={'width': 1672, 'height': 941}, reduced_motion='reduce')
        page = visit(context, {'version': 2, 'resources': dict.fromkeys(RESOURCES, 321),
                               'population': 30, 'happiness': -0.01, 'paused': True,
                               'buildings': {'townhall': {'level': 1, 'workers': 1},
                                             'house': {'level': 3, 'workers': 0}}})
        expect(page.locator('[data-hud="level"]')).to_have_text('3')
        expect(page.locator('[data-hud="housing"]')).to_have_text('Housing: 72')
        expect(page.locator('[data-hud="happiness"]')).to_have_text('0%')
        migrated = save(page)
        assert migrated['version'] == 8 and migrated['buildings']['townhall']['level'] == 3
        assert migrated['buildings']['house']['level'] == 3
        assert migrated['resources'] == dict.fromkeys(RESOURCES, 321)
        assert abs(migrated['happiness'] + 0.01) < 1e-10
        context.close()
        print('PASS legacy above-townhall house preserved, assets retained, fractional happiness and no negative zero')


    finally:
        browser.close()
    assert not errors, errors
    assert not failures, failures
    print('PASS population browser checks without JavaScript or HTTP errors')
