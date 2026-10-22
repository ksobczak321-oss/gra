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


def fixture(values=None, jobs=None, hunger=0, unemployment=0, food=100, paused=True):
    values, jobs = values or [0] * 6, jobs or {}
    residents = [{'id': index + 1, 'happiness': value, 'workplace': jobs.get(index + 1),
                  'hungerSeconds': hunger, 'unemployedSeconds': 0 if jobs.get(index + 1) else unemployment,
                  'returnRemaining': 0} for index, value in enumerate(values)]
    buildings = {key: {'level': 0 if key == 'lighthouse' else 1,
                      'workers': sum(person['workplace'] == key for person in residents),
                      'ready': 0, 'workProgress': []} for key in IDS}
    return {'version': 7, 'population': 6, 'residentSequence': 6, 'residents': residents,
            'happiness': sum(values) / len(values), 'baseHappiness': sum(values) / len(values),
            'buildings': buildings, 'resources': {'coins': 100, **dict.fromkeys(MATERIALS, 100), 'food': food},
            'paused': paused, 'settings': {'motion': False}}


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
        context, page = visit(browser, fixture(values=[32] * 6, unemployment=43200 - 1, paused=False))
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
        page.locator('#hit-play').click()
        page.clock.run_for(300_000)
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
        assert person(rehired, 1)['unemployedSeconds'] == 0
        assert abs(person(rehired, 1)['happiness'] - person(returned, 1)['happiness']) < 1e-8
        context.close()
        print('PASS stable happiness identity, five-minute return, save/reload and reset on rehire')

        # Hungry workers lose four/h after grace and make one unit in 12 minutes.
        data = fixture(jobs={1: 'quarry'}, hunger=43200, food=0, paused=False)
        context, page = visit(browser, data)
        page.locator('#hit-world-quarry').click()
        expect(page.locator('[data-local-rate="quarry"]')).to_have_text('5 units/h')
        expect(page.locator('[data-work-progress="quarry"]')).to_contain_text('12 min')
        page.clock.run_for(720_000)
        hungry = save(page)
        assert hungry['buildings']['quarry']['ready'] == 1
        assert abs(person(hungry, 1)['happiness'] + 4 / 5) < 1e-8
        assert abs(hungry['taxProgress'] - 1 / 5) < 1e-8
        rows = roster(page)
        expect(rows.locator('[data-resident-id="1"] [data-resident-rate]')).to_contain_text('−4')
        page.locator('.dialog-close').click()
        page.locator('#hit-pause').click()
        before = save(page)
        page.clock.run_for(3_600_000)
        assert save(page)['residents'] == before['residents']
        context.close()
        print('PASS hungry half output, unchanged employment taxes, individual hunger penalty and paused timers')
    finally:
        browser.close()
    assert not errors, errors
    assert not failures, failures
    print('PASS individual happiness browser checks without JavaScript or HTTP errors')
