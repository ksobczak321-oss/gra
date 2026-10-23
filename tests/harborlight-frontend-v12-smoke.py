"""Acceptance for the second frontend review and workbook-8 game rules.

Fixtures reach daily/upgrade boundaries. Purchases, staffing, deposits, sharing,
information popovers and navigation use the actual controls.
"""
import copy
import json
import math
import os
import re
from datetime import datetime, timezone

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get('HARBORLIGHT_BASE_URL', 'http://127.0.0.1:8017').rstrip('/')
KEY = 'harborlight-v1-interactive-save'
NOW = datetime(2026, 10, 23, 12, 0, 0, tzinfo=timezone.utc)
MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks']
PRODUCERS = {'wood': 'lumber', 'planks': 'sawmill', 'stone': 'quarry', 'grain': 'farm', 'food': 'windmill'}
BUILDINGS = ['house', 'farm', 'sawmill', 'quarry', 'dock', 'warehouse', 'lighthouse', 'lumber', 'windmill', 'townhall', 'chapel', 'market']
errors, failures, external_sharing = [], [], []


def visit(browser, data=None, mobile=False):
    context = browser.new_context(viewport={'width': 390 if mobile else 1672, 'height': 844 if mobile else 941},
                                  reduced_motion='reduce', has_touch=mobile, is_mobile=mobile)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failures.append((response.status, response.url)) if response.status >= 400 else None)
    page.on('requestfailed', lambda request: failures.append((request.failure, request.url)))
    page.on('request', lambda request: external_sharing.append(request.url) if re.search(r'facebook|fb\.com|fbcdn', request.url, re.I) else None)
    page.clock.install(time=NOW)
    page.clock.pause_at(NOW)
    page.add_init_script('''window.__haptics = [];
      Object.defineProperty(navigator, 'vibrate', {configurable:true,value:pattern=>{window.__haptics.push(pattern);return true;}});''')
    if data is not None:
        page.add_init_script('''if (!sessionStorage.getItem('v12-fixture')) {
          localStorage.setItem(%s, %s); sessionStorage.setItem('v12-fixture','1');
        }''' % (json.dumps(KEY), json.dumps(json.dumps(data))))
    response = page.goto(BASE + '/harborlight-v1-layered.html')
    assert response and response.ok
    page.wait_for_function('document.getElementById("loading").hidden')
    expect(page.locator('.activity-task')).to_have_count(3)
    return context, page


def saved(page):
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    return json.loads(page.evaluate('(key)=>localStorage.getItem(key)', KEY))


def close(page):
    if page.locator('#island-dialog').evaluate('node=>node.open'):
        page.locator('.dialog-close').click()


def open_building(page, id):
    close(page)
    page.locator('#hit-world-' + id).click()
    expect(page.locator('[data-building-status="' + id + '"]')).to_be_visible()


def no_tax_information(page):
    assert not re.search(r'\btax(?:es)?\b', page.locator('body').inner_text(), re.I), page.locator('body').inner_text()
    expect(page.locator('[data-workplace-tax],[data-hud="taxes"],[data-mobile-hud="taxes"],[data-population-stat="taxes"]')).to_have_count(0)


def fit(page, selector='#island-dialog'):
    box = page.locator(selector).bounding_box()
    assert box['x'] >= 0 and box['x'] + box['width'] <= page.viewport_size['width'] + 1, box
    widths = page.locator(selector).evaluate('node=>[node.clientWidth,node.scrollWidth]')
    assert widths[1] <= widths[0] + 1, widths


def base_fixture(browser):
    context, page = visit(browser)
    state = saved(page)
    context.close()
    state['previewBuildStockVersion'] = 'frontend-v10'
    state['resources'] = {'coins': 10000, **dict.fromkeys(MATERIALS, 1000)}
    state['buildings']['townhall']['level'] = 4
    state['buildings']['house']['level'] = 4
    state['buildings']['warehouse']['level'] = 3
    state['buildings']['lighthouse']['level'] = 1
    for task in state['lighthouseTasks']:
        task['requirements'] = {'wood': 2, 'stone': 1}
        task['deposited'] = {'wood': 0, 'stone': 0}
        task['levelSnapshot'] = {'wood': 1, 'stone': 1}
        task['reward'] = {'coins': 100, 'grain': 50}
    state['notifications'] = []
    state['notificationSequence'] = 0
    return state


def summaries_and_stock(browser, base):
    data = copy.deepcopy(base)
    for index, producer in enumerate(PRODUCERS.values()):
        data['buildings'][producer].update(workers=1, ready=20 + index, workProgress=[0])
        data['residents'][index].update(workplace=producer, arrivalRemaining=0, returnRemaining=0)
    for mobile in [False, True]:
        context, page = visit(browser, data, mobile=mobile)
        no_tax_information(page)
        for producer in PRODUCERS.values():
            open_building(page, producer)
            fit(page)
            summary = page.locator('[data-production-summary="' + producer + '"]')
            expect(summary.locator(':scope > *')).to_have_count(3)
            for selector, label, value in [('data-local-current', 'In stock', data['buildings'][producer]['ready']),
                                           ('data-local-capacity', 'Current cap.', 200),
                                           ('data-local-next', 'Next level cap.', 400)]:
                number = page.locator('[' + selector + '="' + producer + '"]')
                expect(number).to_have_text(str(value))
                expect(number.locator('..')).to_contain_text(label)
            for selector, label, value in [('data-worker-count', 'Assigned', '1'), ('data-worker-free', 'Free at home', '7'), ('data-worker-limit', 'Max workers', '12')]:
                number = page.locator('[' + selector + '="' + producer + '"]')
                expect(number).to_have_text(value)
                expect(number.locator('..')).to_contain_text(label)
            level, storage, workers = summary.locator(':scope > *').all()
            positions = [node.bounding_box() for node in [level, storage, workers]]
            assert positions[0]['x'] < positions[1]['x'], positions
            assert abs(positions[1]['x'] - positions[2]['x']) <= 1, positions
            assert positions[2]['y'] > positions[1]['y'], positions
            no_tax_information(page)
            page.locator('[data-production-info="' + producer + '"]').click()
            no_tax_information(page)
            page.keyboard.press('Escape')
        open_building(page, 'warehouse')
        expect(page.locator('[data-warehouse-priority="construction"]')).to_be_visible()
        for resource, number in [('food', '1'), ('construction', '2'), ('wood', '3')]:
            page.locator('[data-warehouse-priority="' + resource + '"]').click()
            expect(page.locator('[data-warehouse-priority="' + resource + '"]')).to_have_attribute('data-priority-number', number)
        expect(page.locator('[data-warehouse-priority="grain"]')).to_be_disabled()
        no_tax_information(page)
        assert saved(page)['warehousePriorities'] == ['food', 'construction', 'wood']
        close(page)
        page.locator('#hit-category-resources').click()
        expect(page.locator('#island-dialog')).not_to_be_visible()
        for resource, producer in PRODUCERS.items():
            expect(page.locator('[data-dock-active="' + resource + '"]')).to_have_text('1')
            expect(page.locator('[data-dock-local="' + resource + '"]')).to_have_text(str(data['buildings'][producer]['ready']))
            expect(page.locator('[data-dock-central="' + resource + '"]')).to_have_text('1,000')
        page.screenshot(path='/tmp/harborlight-v12-resource-stock-' + ('mobile' if mobile else 'desktop') + '.png')
        for id in ['townhall', 'house', 'chapel', 'lighthouse', 'market', 'dock']:
            open_building(page, id)
            no_tax_information(page)
        page.screenshot(path='/tmp/harborlight-v12-effects-' + ('mobile' if mobile else 'desktop') + '.png')
        context.close()
    print('PASS labelled storage/workers and smaller Level layout across all producers, local/central product dock, Construction priority and no tax information')


def all_tax_information_removed(browser, base):
    data = copy.deepcopy(base)
    data['chapelRemaining'] = 36000
    data['notifications'] = [{'id': 501, 'kind': 'chapel-upgrade', 'title': 'Chapel upgrade bonus',
                             'message': 'For 10 hours: +20 happiness to everyone and taxes ×2.',
                             'read': False, 'at': 0}]
    data['notificationSequence'] = 501
    context, page = visit(browser, data)
    no_tax_information(page)
    for id in BUILDINGS:
        open_building(page, id)
        no_tax_information(page)
        info = page.locator('[data-upgrade-info="' + id + '"]')
        info.click()
        no_tax_information(page)
        page.keyboard.press('Escape')
    open_building(page, 'house')
    page.locator('[data-manage-workers]').click()
    expect(page.locator('[data-workplace]')).to_have_count(8)
    no_tax_information(page)
    close(page)
    page.locator('#hit-notifications').click()
    no_tax_information(page)
    expect(page.locator('#island-dialog')).to_contain_text('Chapel upgrade bonus')
    expect(page.locator('#island-dialog')).to_contain_text('+20 happiness')
    context.close()
    print('PASS tax information removed from all12 buildings, upgrade help, Home workforce list, desktop/mobile headers and saved notification text; engine rules remain separately tested')


def attractions_and_effects(browser, base):
    data = copy.deepcopy(base)
    data['leisure']['offers'][0]['y'] = 53  # Fourth purchase stores13.25pp but every visible amount must say14pp.
    context, page = visit(browser, data)
    page.locator('#hit-category-decorations').click()
    expect(page.locator('#island-dialog')).not_to_be_visible()
    expect(page.locator('[data-leisure-dock="decorations"]')).to_be_visible()
    expect(page.locator('[data-attraction]')).to_have_count(5)
    initial = saved(page)
    offers = initial['leisure']['offers']
    assert len({offer['id'] for offer in offers}) == 5
    choice = offers[0]
    button = page.locator('[data-attraction="' + choice['id'] + '"]')
    for attempt, factor in enumerate([1, .75, .5, .25]):
        expect(page.locator('[data-attraction-effect="' + choice['id'] + '"]')).to_contain_text('+' + str(math.ceil(choice['y'] * factor)) + ' pp')
        before = saved(page)
        button.click()
        after = saved(page)
        assert after['resources']['coins'] == before['resources']['coins'] - choice['y'] * 4
        effect = after['leisure']['effects'][-1]
        assert effect['amount'] == choice['y'] * factor
        assert len(effect['residentIds']) == 4 and effect['remaining'] == 21600
        assert after['leisure']['habits'][choice['id']]['uses'] == attempt + 1
        purchase_notice = next(item for item in after['notifications'] if item['kind'] == 'attraction-purchased')
        assert '+' + str(math.ceil(choice['y'] * factor)) + ' pp' in purchase_notice['message'], purchase_notice
        assert not re.search(r'\d+\.\d+\s*(?:pp|%)', purchase_notice['message'])
    expect(button).to_be_disabled()
    blocked = saved(page)
    assert blocked['leisure']['habits'][choice['id']]['resetRemaining'] == 86400
    page.screenshot(path='/tmp/harborlight-v12-attractions-desktop.png')
    open_building(page, 'townhall')
    effect_list = page.locator('[data-active-effects]')
    expect(effect_list).to_be_visible()
    assert effect_list.bounding_box()['y'] < page.locator('[data-building-status="townhall"]').bounding_box()['y']
    for effect in blocked['leisure']['effects']:
        row = page.locator('[data-effect="attraction-' + str(effect['id']) + '"]')
        expect(row).to_contain_text(effect['title'])
        expect(row).to_contain_text('4 residents')
        expect(row).to_contain_text('6 h')
        expect(row).to_contain_text('+' + str(math.ceil(effect['amount'])) + ' pp')
        assert not re.search(r'\d+\.\d+\s*(?:pp|%)', row.inner_text())
    expect(page.locator('[data-effect="familiarity-' + choice['id'] + '"]')).to_be_visible()
    notifications = saved(page)['notifications']
    page.clock.fast_forward(10000)
    assert saved(page)['notifications'] == notifications, 'A countdown alone must not create duplicate notifications'
    page.screenshot(path='/tmp/harborlight-v12-effects-attractions.png')
    close(page)
    page.reload()
    page.wait_for_function('document.getElementById("loading").hidden')
    assert saved(page)['leisure']['offers'] == offers
    page.locator('#hit-category-decorations').click()
    expect(page.locator('[data-attraction="' + choice['id'] + '"]')).to_be_disabled()
    # One day is an actual offline boundary; the same five offers cannot be rerolled by refresh.
    page.clock.fast_forward(86400000 - 10000)
    after_day = saved(page)
    assert not after_day['leisure']['effects']
    assert choice['id'] not in after_day['leisure']['habits']
    assert len(after_day['leisure']['offers']) == 5
    assert set(offer['id'] for offer in offers).isdisjoint(offer['id'] for offer in after_day['leisure']['offers'])
    expect(page.locator('[data-attraction]')).to_have_count(5)
    context.close()
    print('PASS five daily attraction cards, real price and recipient scope, independent habituation, exact six-hour bonuses, no refresh reroll and 24-hour reset/rotation')


def paths_and_eta(browser, base):
    data = copy.deepcopy(base)
    context, page = visit(browser, data)
    page.locator('#hit-category-paths').click()
    expect(page.locator('#island-dialog')).not_to_be_visible()
    expect(page.locator('[data-road-level]')).to_have_count(5)
    expect(page.locator('[data-road-level="1"]')).to_be_enabled()
    expect(page.locator('[data-road-level="2"]')).to_be_disabled()
    before = saved(page)
    page.locator('[data-road-level="1"]').click()
    expect(page.locator('[data-road-progress="1"]')).to_have_text('1 / 100')
    assert saved(page)['resources']['stone'] == before['resources']['stone'] - 100
    assert min(saved(page)['roads']['segments']) == 0
    context.close()

    data['roads']['segments'] = [3] * 99 + [2]
    data['buildings']['warehouse'].update(workers=1, workProgress=[0])
    data['residents'][0].update(workplace='warehouse', arrivalRemaining=0, returnRemaining=0)
    context, page = visit(browser, data)
    page.locator('#hit-category-paths').click()
    expect(page.locator('[data-road-progress="3"]')).to_have_text('99 / 100')
    expect(page.locator('[data-road-level="4"]')).to_be_disabled()
    page.locator('[data-road-level="3"]').click()
    expect(page.locator('[data-road-progress="3"]')).to_have_text('100 / 100')
    expect(page.locator('[data-road-level="4"]')).to_be_enabled()
    assert min(saved(page)['roads']['segments']) == 3
    page.screenshot(path='/tmp/harborlight-v12-paths-desktop.png')
    open_building(page, 'townhall')
    expect(page.locator('[data-effect="completed-path-level"]')).to_contain_text('+30%')
    expect(page.locator('[data-effect="completed-path-level"]')).to_contain_text('+10%')
    open_building(page, 'farm')
    page.locator('[data-upgrade-building="farm"]').click()
    expect(page.locator('[data-world-transport-eta="farm"]')).to_contain_text('Transport · ETA:')
    expect(page.locator('[data-world-building-eta="farm"]')).to_contain_text('Construction · ETA:')
    assert 'Unavailable' not in page.locator('[data-world-transport-eta="farm"]').inner_text()
    assert 'Unavailable' not in page.locator('[data-world-building-eta="farm"]').inner_text()
    close(page)
    page.screenshot(path='/tmp/harborlight-v12-construction-eta.png')
    context.close()
    print('PASS path cards, 100-section gate, exact Stone spending, completed-tier carrier speed/load and two-line world construction ETA')


def complete_task(page):
    close(page)
    page.locator('#hit-nav-tasks').click()
    task = saved(page)['lighthouseTasks'][0]
    page.locator('[data-task-accept="' + task['id'] + '"]').click()
    for resource, amount in task['requirements'].items():
        page.locator('[data-task-input="' + task['id'] + '-' + resource + '"]').fill(str(amount))
        page.locator('[data-task-deposit="' + task['id'] + '-' + resource + '"]').click()
    expect(page.locator('#task-celebration')).to_be_visible()
    expect(page.locator('.celebration-fireworks i')).to_have_count(60)
    expect(page.locator('[data-share-screen]')).to_contain_text('Share your achievement')
    fit(page, '#task-celebration')
    return saved(page)['taskAchievements'][-1]


def task_celebrations(browser, base):
    for mobile in [False, True]:
        context, page = visit(browser, base, mobile=mobile)
        before = saved(page)['resources']['coins']
        achievement = complete_task(page)
        assert achievement['seen'] is True and achievement['shared'] is False
        assert saved(page)['resources']['coins'] == before + 300
        if mobile:
            assert page.evaluate('matchMedia("(pointer: coarse)").matches')
            assert page.evaluate('window.__haptics.length') == 1
        page.screenshot(path='/tmp/harborlight-v12-celebration-' + ('mobile' if mobile else 'desktop') + '.png')
        page.locator('[data-task-share="' + achievement['id'] + '"]').click()
        expect(page.locator('#task-celebration')).to_have_count(0)
        assert saved(page)['resources']['coins'] == before + 800
        assert saved(page)['taskAchievements'][-1]['shared'] is True
        page.reload()
        page.wait_for_function('document.getElementById("loading").hidden')
        expect(page.locator('#task-celebration')).to_have_count(0)
        assert saved(page)['resources']['coins'] == before + 800
        regular_before = saved(page)['resources']['coins']
        skipped = complete_task(page)
        assert saved(page)['resources']['coins'] == regular_before + 300
        page.locator('[data-task-skip="' + skipped['id'] + '"]').click()
        expect(page.locator('#task-celebration')).to_have_count(0)
        assert saved(page)['resources']['coins'] == regular_before + 300
        assert saved(page)['taskAchievements'][-1]['skipped'] is True
        no_tax_information(page)
        context.close()
    assert not external_sharing, external_sharing
    print('PASS completion fireworks, mobile vibration, optional 500-coin share exactly once, persistent dismissal and Skip preserving regular rewards, without Facebook requests')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
    base = base_fixture(browser)
    summaries_and_stock(browser, base)
    all_tax_information_removed(browser, base)
    attractions_and_effects(browser, base)
    paths_and_eta(browser, base)
    task_celebrations(browser, base)
    browser.close()
    assert not errors, errors
    assert not failures, failures
    print('PASS latest frontend/workbook-8 acceptance with no JavaScript or HTTP errors')
