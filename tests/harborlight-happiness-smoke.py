"""Individual happiness, upward whole-percent display and saved identities.

Fixtures reach the 12-hour boundaries; browser timers and public staffing controls
exercise transitions, rather than waiting through twelve hours of wall time.
"""
import json
import os
from datetime import datetime, timedelta, timezone

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get('HARBORLIGHT_BASE_URL', 'http://127.0.0.1:8002').rstrip('/')
KEY = 'harborlight-v1-interactive-save'
IDS = ['house', 'farm', 'sawmill', 'quarry', 'dock', 'warehouse', 'lighthouse', 'lumber', 'windmill', 'townhall', 'chapel', 'market']
MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks']
NOW = datetime(2026, 10, 22, 12, 0, 0, tzinfo=timezone.utc)
errors, failures = [], []


def fixture(values=None, jobs=None, hunger=0, unemployment=0, food=100):
    values, jobs = values or [0] * 6, jobs or {}
    residents = [{'id': index + 1, 'happiness': value, 'workplace': jobs.get(index + 1),
                  'hungerSeconds': hunger, 'unemployedSeconds': 0 if jobs.get(index + 1) else unemployment,
                  'arrivalRemaining': 0, 'returnRemaining': 0,
                  'newbornRemaining': 0} for index, value in enumerate(values)]
    buildings = {key: {'level': 0 if key == 'lighthouse' else 1,
                      'workers': sum(person['workplace'] == key for person in residents),
                      'ready': 0, 'workProgress': []} for key in IDS}
    return {'version': 8, 'population': 6, 'residentSequence': 6, 'residents': residents,
            'happiness': sum(values) / len(values), 'baseHappiness': sum(values) / len(values),
            'buildings': buildings, 'resources': {'coins': 100, **dict.fromkeys(MATERIALS, 100), 'food': food},
            'lastSimulatedAt': int(NOW.timestamp() * 1000),
            'savedAt': int(NOW.timestamp() * 1000),
            'settings': {'motion': False}}


def visit(browser, data, width=1672, height=941):
    context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce', has_touch=True)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failures.append((response.status, response.url)) if response.status >= 400 else None)
    page.on('requestfailed', lambda request: failures.append((request.failure, request.url)))
    page.clock.install(time=NOW - timedelta(seconds=5))
    page.clock.pause_at(NOW)
    page.add_init_script('''if (!sessionStorage.getItem('happiness-fixture')) {
      localStorage.setItem(%s, %s); sessionStorage.setItem('happiness-fixture', '1');
    }''' % (json.dumps(KEY), json.dumps(json.dumps(data))))
    assert page.goto(BASE + '/harborlight-v1-layered.html').status == 200
    page.wait_for_selector('[data-hud="happiness"]')
    page.wait_for_function('document.getElementById("loading").hidden')
    return context, page


def close(page):
    if page.locator('#island-dialog').evaluate('(node) => node.open'):
        page.locator('.dialog-close').click()


def save(page):
    close(page)
    page.locator('#hit-settings').click()
    page.get_by_role('button', name='Save now', exact=True).click()
    close(page)
    return page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', KEY)


def person(saved, resident_id):
    return next(resident for resident in saved['residents'] if resident['id'] == resident_id)


def roster(page):
    close(page)
    page.locator('#hit-happiness').click()
    page.locator('[data-resident-roster] > summary').click()
    return page.locator('[data-resident-list]')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
    try:
        # Effective mean is computed from exact personal values before rounding.
        context, page = visit(browser, fixture(values=[0.1] * 5 + [1.1]))
        expect(page.locator('[data-hud="happiness"]')).to_have_text('+1%')
        rows = roster(page)
        expect(rows.locator('[data-resident-id]')).to_have_count(6)
        expect(rows.locator('[data-resident-id="1"] [data-resident-value]')).to_have_text('+1%')
        expect(rows.locator('[data-resident-id="6"] [data-resident-value]')).to_have_text('+2%')
        before = save(page)
        assert abs(before['happiness'] - 1.6 / 6) < 1e-9
        assert person(before, 1)['happiness'] == 0.1
        for width, height in [(390, 844), (844, 390)]:
            page.set_viewport_size({'width': width, 'height': height})
            expect(page.locator('[data-mobile-hud="happiness"]')).to_have_text('+1%')
            rows = roster(page)
            bounds = rows.bounding_box()
            assert bounds['x'] >= 0 and bounds['x'] + bounds['width'] <= width + 1, bounds
            assert page.locator('.dialog-body').evaluate('(node) => node.scrollWidth <= node.clientWidth + 1')
        context.close()

        context, page = visit(browser, fixture(values=[-1.2, 1.2, -0.2, 2.0000000000000027, -1.000000000000002, 0]))
        rows = roster(page)
        for resident_id, text in [(1, '−1%'), (2, '+2%'), (3, '0%'), (4, '+2%'), (5, '−1%')]:
            expect(rows.locator(f'[data-resident-id="{resident_id}"] [data-resident-value]')).to_have_text(text)
        assert not any('.' in text for text in rows.locator('[data-resident-value]').all_text_contents())
        context.close()
        print('PASS personal values, exact population mean, upward whole percentages, negative zero and responsive roster')

        # The grace ends exactly at 12h, then feeding +1 and unemployment -5 yield -4.
        context, page = visit(browser, fixture(values=[32] * 6, unemployment=43200 - 1))
        page.clock.run_for(1_000)
        threshold = save(page)
        assert abs(person(threshold, 1)['happiness'] - (32 + 1 / 3600)) < 1e-8
        page.clock.run_for(1_000)
        penalized = save(page)
        assert abs(person(penalized, 1)['happiness'] - (32 - 3 / 3600)) < 1e-8
        rows = roster(page)
        expect(rows.locator('[data-resident-id="1"] [data-resident-rate]')).to_contain_text('−4')
        context.close()
        print('PASS exact unemployment grace boundary and individual −4 pp/hour net rate')

        # The same resident carries accumulated happiness through dismissal, return and rehire.
        context, page = visit(browser, fixture(values=[20, 0, 0, 0, 0, 0], jobs={1: 'quarry'}))
        page.locator('#hit-world-quarry').click()
        page.locator('[data-worker-building="quarry"][data-worker-delta="-1"]').click()
        dismissed = save(page)
        assert person(dismissed, 1)['workplace'] is None
        assert person(dismissed, 1)['happiness'] == 20
        assert person(dismissed, 1)['returnRemaining'] == 300
        page.clock.fast_forward(300_000)
        returned = save(page)
        assert person(returned, 1)['returnRemaining'] == 0
        assert abs(person(returned, 1)['happiness'] - (20 + 1 / 12)) < 1e-8
        assert abs(person(returned, 1)['unemployedSeconds'] - 300) < 1e-8
        page.reload()
        page.wait_for_selector('[data-hud="happiness"]')
        page.locator('#hit-world-quarry').click()
        page.locator('[data-worker-building="quarry"][data-worker-delta="1"]').click()
        rehired = save(page)
        assert person(rehired, 1)['workplace'] == 'quarry'
        assert person(rehired, 1)['unemployedSeconds'] == 300
        assert person(rehired, 1)['arrivalRemaining'] == 300
        assert abs(person(rehired, 1)['happiness'] - person(returned, 1)['happiness']) < 1e-8
        assert rehired['buildings']['quarry']['ready'] == 0 and rehired['taxProgress'] == 0
        page.clock.fast_forward(300_000)
        arrived = save(page)
        assert person(arrived, 1)['arrivalRemaining'] == 0
        assert person(arrived, 1)['unemployedSeconds'] == 0
        assert abs(person(arrived, 1)['happiness'] - (20 + 1 / 6)) < 1e-8
        assert arrived['buildings']['quarry']['ready'] == 0 and arrived['taxProgress'] == 0
        page.clock.fast_forward(360_000)
        working = save(page)
        assert working['buildings']['quarry']['ready'] == 1
        assert abs(working['taxProgress'] - 0.1) < 1e-8
        assert abs(person(working, 1)['happiness'] - (20 + 1 / 6 + 0.2)) < 1e-8
        context.close()
        print('PASS stable identity, five-minute home/work journeys, reset on arrival and work/tax only after arrival')

        # Hungry workers lose four/h after grace and make one unit in 12 minutes.
        data = fixture(jobs={1: 'quarry'}, hunger=43200, food=0)
        context, page = visit(browser, data)
        page.locator('#hit-world-quarry').click()
        expect(page.locator('[data-local-rate="quarry"]')).to_have_text('5 units/h')
        expect(page.locator('[data-work-progress="quarry"]')).to_contain_text('12 min')
        page.clock.fast_forward(720_000)
        hungry = save(page)
        assert hungry['buildings']['quarry']['ready'] == 1
        assert abs(person(hungry, 1)['happiness'] + 4 / 5) < 1e-8
        assert abs(hungry['taxProgress'] - 1 / 5) < 1e-8
        rows = roster(page)
        expect(rows.locator('[data-resident-id="1"] [data-resident-rate]')).to_contain_text('−4')
        page.locator('.dialog-close').click()
        before = save(page)
        page.goto(BASE + '/harborlight-v1-screen.html')
        page.clock.fast_forward(360_000)
        assert page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', KEY)['lastSimulatedAt'] == before['lastSimulatedAt']
        page.goto(BASE + '/harborlight-v1-layered.html')
        page.wait_for_function('document.getElementById("loading").hidden')
        offline = save(page)
        assert offline['buildings']['quarry']['ready'] == 1
        assert abs(person(offline, 1)['happiness'] + 1.2) < 1e-8
        assert abs(offline['taxProgress'] - 0.3) < 1e-8
        page.clock.fast_forward(360_000)
        continued = save(page)
        assert continued['buildings']['quarry']['ready'] == 2
        assert abs(person(continued, 1)['happiness'] + 1.6) < 1e-8
        assert abs(continued['taxProgress'] - 0.4) < 1e-8
        context.close()
        print('PASS hungry half output, full employment tax, hunger penalty and continuous offline work')

        # Frozen newborns ignore every happiness bonus during their first day.
        # After offline catchup to the exact boundary, normal hourly rates start
        # from zero. Initial residents remain ordinary people.
        data = fixture(values=[0, -100, -100, -100, -100, -100], food=1000)
        data['residents'][0]['newbornRemaining'] = 86400
        data['blessingRemaining'] = 3600
        data['chapelRemaining'] = 3600
        context, page = visit(browser, data)
        rows = roster(page)
        expect(rows.locator('[data-resident-id="1"] [data-resident-value]')).to_have_text('0%')
        expect(rows.locator('[data-resident-id="1"] [data-resident-timers]')).to_contain_text('Newborn')
        frozen_start = save(page)
        assert person(frozen_start, 1)['happiness'] == 0
        page.goto(BASE + '/harborlight-v1-screen.html')
        page.clock.fast_forward(86_399_000)
        page.goto(BASE + '/harborlight-v1-layered.html')
        page.wait_for_function('document.getElementById("loading").hidden')
        almost = save(page)
        assert person(almost, 1)['newbornRemaining'] == 1
        assert person(almost, 1)['happiness'] == 0
        assert almost['population'] == 6
        page.clock.run_for(1_000)
        boundary = save(page)
        assert person(boundary, 1)['newbornRemaining'] == 0
        assert person(boundary, 1)['happiness'] == 0
        page.clock.fast_forward(3_600_000)
        first_hour = save(page)
        assert abs(person(first_hour, 1)['happiness'] + 4) < 1e-8
        assert first_hour['resources']['food'] > 0
        assert len({person['id'] for person in first_hour['residents']}) == 6
        context.close()
        print('PASS newborn frozen 0% through bonuses/offline/exact 24h, then normal rate without backcharge')
    finally:
        browser.close()
    assert not errors, errors
    assert not failures, failures
    print('PASS individual happiness browser checks without JavaScript or HTTP errors')
