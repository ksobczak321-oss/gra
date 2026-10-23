"""Frontend review acceptance: consistent building panels, live jobs and one active task.

Use HARBORLIGHT_BASE_URL for an existing static server. Fixtures establish states;
all reviewed interactions use actual visible controls and the browser clock.
"""
import json
import os
from datetime import datetime, timezone
from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get('HARBORLIGHT_BASE_URL', 'http://127.0.0.1:8002').rstrip('/')
KEY = 'harborlight-v1-interactive-save'
MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks']
BUILDINGS = ['house', 'farm', 'sawmill', 'quarry', 'dock', 'warehouse', 'lighthouse', 'lumber', 'windmill', 'townhall', 'chapel', 'market']
PRODUCERS = ['farm', 'windmill', 'lumber', 'sawmill', 'quarry']
NOW = datetime(2026, 10, 23, 12, 0, 0, tzinfo=timezone.utc)
errors, failures = [], []


def visit(browser, data=None, width=1672, height=941, mobile=False):
    context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce', has_touch=True, is_mobile=mobile)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failures.append((response.status, response.url)) if response.status >= 400 else None)
    page.on('requestfailed', lambda request: failures.append((request.failure, request.url)))
    page.clock.install(time=NOW)
    page.clock.pause_at(NOW)
    if data is not None:
        page.add_init_script('''if (!sessionStorage.getItem('v10-fixture')) {
          localStorage.setItem(%s, %s); sessionStorage.setItem('v10-fixture','1');
        }''' % (json.dumps(KEY), json.dumps(json.dumps(data))))
    assert page.goto(BASE + '/harborlight-v1-layered.html').ok
    page.wait_for_function('document.getElementById("loading").hidden')
    expect(page.locator('.activity-task')).to_have_count(3)
    return context, page


def saved(page):
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    return json.loads(page.evaluate('(key) => localStorage.getItem(key)', KEY))


def close(page):
    if page.locator('#island-dialog').evaluate('(node) => node.open'):
        page.locator('.dialog-close').click()


def building(page, id):
    close(page)
    page.locator('#hit-world-' + id).click()
    expect(page.locator('[data-building-status="' + id + '"]')).to_be_visible()


def progressed():
    buildings = {id: {'level': 1, 'workers': 0, 'ready': 0, 'workProgress': []} for id in BUILDINGS}
    buildings['townhall']['level'] = 4
    buildings['house']['level'] = 2
    buildings['warehouse']['level'] = 2
    buildings['windmill'].update(workers=1, ready=50, workProgress=[0])
    buildings['quarry'].update(workers=1, ready=0, workProgress=[0])
    return {'version': 6, 'population': 12, 'happiness': 0, 'baseHappiness': 0,
            'resources': {'coins': 10000, 'wood': 100, 'stone': 100, 'grain': 0, 'food': 300, 'planks': 100},
            'buildings': buildings, 'previewBuildStockVersion': 'frontend-v10',
            'warehousePriorities': [], 'settings': {'motion': False}}


def single_task_and_stock(browser):
    context, page = visit(browser)
    initial = saved(page)
    assert initial['previewBuildStockVersion'] == 'frontend-v10'
    assert {id: initial['resources'][id] for id in MATERIALS} == dict.fromkeys(MATERIALS, 800)
    assert sum(initial['resources'][id] for id in MATERIALS) == 4000
    assert initial['resources']['coins'] == 10000
    assert initial['buildings']['townhall']['level'] == 1
    assert initial['buildings']['warehouse']['level'] == 1
    assert initial['warehousePriorities'] == []
    page.locator('#hit-nav-tasks').click()
    task = initial['lighthouseTasks'][0]
    page.locator('[data-task-accept="' + task['id'] + '"]').click()
    expect(page.locator('.island-activity-stack [data-task-active="true"]')).to_have_count(1)
    expect(page.locator('#island-dialog [data-task-active="true"]')).to_have_count(1)
    expect(page.locator('[data-task-active-label="' + task['id'] + '"]')).to_have_count(2)
    for other in initial['lighthouseTasks'][1:]:
        for root in ['.island-activity-stack', '#island-dialog']:
            inactive = page.locator(root + ' [data-task="' + other['id'] + '"]')
            expect(inactive).to_have_attribute('data-task-inactive', 'true')
            assert inactive.evaluate("node => parseFloat(getComputedStyle(node).opacity) < 1 || getComputedStyle(node).filter.includes('grayscale')"), 'Other offers must visibly gray out'
        expect(page.locator('[data-task-accept="' + other['id'] + '"]')).to_be_disabled()
        for resource in other['requirements']:
            expect(page.locator('[data-task-deposit="' + other['id'] + '-' + resource + '"]')).to_be_disabled()
    resource = next(iter(task['requirements']))
    field = page.locator('[data-task-input="' + task['id'] + '-' + resource + '"]')
    field.fill('1')
    page.locator('[data-task-deposit="' + task['id'] + '-' + resource + '"]').click()
    expected = '1 / ' + format(task['requirements'][resource], ',')
    for root in ['.island-activity-stack', '#island-dialog']:
        expect(page.locator(root + ' [data-task-progress="' + task['id'] + '"][data-task-resource="' + resource + '"]')).to_have_text(expected)
    page.screenshot(path='/tmp/harborlight-frontend-v11-active-task.png')
    contributed = saved(page)
    assert contributed['resources'][resource] == 799
    close(page)
    # Viewing another task does not silently change the active one.
    page.locator('[data-task-open="' + initial['lighthouseTasks'][1]['id'] + '"]').click()
    assert saved(page)['activeTaskId'] == task['id']
    close(page)
    page.reload()
    page.wait_for_selector('.activity-task')
    restored = saved(page)
    assert restored['resources'] == contributed['resources'], 'Reload must not refill spent test materials'
    assert restored['activeTaskId'] == task['id']
    expect(page.locator('.island-activity-stack [data-task-active="true"]')).to_have_count(1)
    # Completing the active task releases the slot; another task can then start.
    page.locator('#hit-nav-tasks').click()
    for material, required in task['requirements'].items():
        remaining = required - restored['lighthouseTasks'][0]['deposited'][material]
        page.locator('[data-task-input="' + task['id'] + '-' + material + '"]').fill(str(remaining))
        page.locator('[data-task-deposit="' + task['id'] + '-' + material + '"]').click()
    assert saved(page)['activeTaskId'] is None
    expect(page.locator('.island-activity-stack [data-task-active="true"]')).to_have_count(0)
    next_task = saved(page)['lighthouseTasks'][0]
    page.locator('[data-task-accept="' + next_task['id'] + '"]').click()
    assert saved(page)['activeTaskId'] == next_task['id']
    context.close()
    print('PASS one-time full warehouse, no refill on reload, one active task and synchronized per-product progress')


def building_panels(browser):
    context, page = visit(browser, progressed())
    for id in BUILDINGS:
        building(page, id)
        expect(page.locator('[data-building-status="' + id + '"] [data-status-label]')).not_to_have_text('')
        expect(page.locator('[data-construction-entry]')).to_have_count(1 if id == 'townhall' else 0)
        expect(page.locator('[data-construction-summary]')).to_have_count(1 if id == 'townhall' else 0)
        expect(page.locator('[data-manage-workers]')).to_have_count(1 if id == 'house' else 0)
        if id not in PRODUCERS:
            expect(page.locator('[data-upgrade-estimate="' + id + '"]')).to_be_visible()
            expect(page.locator('[data-section-help="premium-' + id + '"]')).not_to_be_visible()
        assert 'Coins earned in the game' not in page.locator('#island-dialog').inner_text()
        if id in PRODUCERS:
            upgrade = page.locator('[data-building-upgrade="' + id + '"]')
            expect(upgrade.locator('[data-upgrade-building="' + id + '"]')).to_be_visible()
            expect(upgrade.locator('[data-upgrade-delivery-time="' + id + '"]')).to_be_visible()
            expect(upgrade.locator('[data-upgrade-build-time="' + id + '"]')).to_be_visible()
            premium = upgrade.locator('[data-producer-premium="' + id + '"]')
            expect(premium).to_be_visible()
            expect(premium.locator('button')).to_have_count(2)
            expect(premium.locator('[data-premium-buy="' + id + '"]')).to_have_count(1)
            expect(premium.locator('[data-premium-route="producer"]')).to_have_count(1)
            assert premium.evaluate("node => parseFloat(getComputedStyle(node).borderTopWidth) > 0"), 'Premium must have a visible frame'
            expect(page.locator('.premium-building-panel')).to_have_count(0)
            stock = 50 if id == 'windmill' else 0
            expect(page.locator('[data-local-buffer="' + id + '"]')).to_have_text(str(stock) + ' / 200 / 400')
            expect(page.locator('[data-worker-count="' + id + '"]')).to_have_text('1' if id in ['windmill', 'quarry'] else '0')
            expect(page.locator('[data-worker-free="' + id + '"]')).to_have_text('10')
            expect(page.locator('[data-worker-limit="' + id + '"]')).to_have_text('12')
    building(page, 'windmill')
    expect(page.locator('[data-status-label]')).to_have_text('Waiting for resources')
    expect(page.locator('[data-status-detail]')).to_contain_text('Grain')
    help_button = page.locator('[data-upgrade-info="windmill"]')
    help_button.hover()
    expect(page.locator('[data-upgrade-help="windmill"]')).to_be_visible()
    expect(page.locator('[data-upgrade-help="windmill"]')).to_contain_text('Coins earned')
    expect(page.locator('[data-upgrade-help="windmill"]')).to_contain_text('Instant transport')
    page.keyboard.press('Escape')
    expect(page.locator('[data-upgrade-help="windmill"]')).not_to_be_visible()
    buttons = page.locator('[data-producer-premium="windmill"] button')
    expect(buttons).to_have_count(2)
    upgrade_button = page.locator('[data-upgrade-building="windmill"]').bounding_box()
    frame = page.locator('[data-producer-premium="windmill"]').bounding_box()
    assert frame['x'] >= upgrade_button['x'] + upgrade_button['width'] - 1, (upgrade_button, frame)
    assert max(frame['y'], upgrade_button['y']) < min(frame['y'] + frame['height'], upgrade_button['y'] + upgrade_button['height']), (upgrade_button, frame)
    page.screenshot(path='/tmp/harborlight-frontend-v11-producer-upgrade.png')
    building(page, 'quarry')
    expect(page.locator('[data-status-label]')).to_have_text('Producing')
    expect(page.locator('[data-status-detail]')).to_contain_text('Stone to local storage in')
    expect(page.locator('[data-workplace-tax="quarry"]')).to_have_text('1 coin/h')
    building(page, 'house')
    expect(page.locator('.housing-capacity-summary > .stat')).to_have_count(4)
    for field, value in [('current-population','12'), ('capacity','96'), ('housing','48')]:
        expect(page.locator('[data-population-stat="' + field + '"]')).to_have_text(value)
    expect(page.locator('[data-population-stat="growth-rate"]')).to_contain_text('residents/h')
    for key in ['housing', 'house-happiness']:
        expect(page.locator('[data-section-help="' + key + '"]')).not_to_be_visible()
        page.locator('[data-section-info="' + key + '"]').focus()
        expect(page.locator('[data-section-help="' + key + '"]')).to_be_visible()
        page.keyboard.press('Escape')
    page.locator('[data-manage-workers]').click()
    expect(page.locator('#dialog-title')).to_have_text('Manage all workers')
    expect(page.locator('[data-workplace]')).to_have_count(8)
    expect(page.locator('[data-worker-action="max"]')).to_have_count(8)
    close(page)
    page.locator('#hit-nav-residents').click()
    expect(page.locator('[data-worker-action],[data-worker-delta]')).to_have_count(0)
    # A new carrier first walks, then shows real cargo, a route and a decreasing ETA.
    building(page, 'warehouse')
    page.locator('[data-worker-building="warehouse"][data-worker-delta="1"]').click()
    expect(page.locator('[data-carrier-status="walking"]')).to_have_count(1)
    for resource, number in [('food','1'), ('wood','2'), ('grain','3')]:
        page.locator('[data-warehouse-priority="' + resource + '"]').click()
        expect(page.locator('[data-warehouse-priority="' + resource + '"]')).to_have_attribute('aria-pressed', 'true')
        expect(page.locator('[data-warehouse-priority="' + resource + '"]')).to_have_attribute('data-priority-number', number)
        expect(page.locator('[data-warehouse-priority="' + resource + '"]')).to_have_class('material-priority-button is-active')
    expect(page.locator('[data-warehouse-priority="stone"]')).to_be_disabled()
    expect(page.locator('[data-priority-progress]')).to_contain_text('5 Food · 3 Wood · 2 Grain')
    page.clock.fast_forward(301000)
    delivery = page.locator('[data-carrier-status="delivering"]')
    expect(delivery).to_have_count(1)
    expect(delivery).to_contain_text('Food')
    expect(delivery).to_contain_text('Windmill → Warehouse')
    eta = delivery.locator('[data-carrier-eta]').inner_text()
    page.clock.fast_forward(10000)
    assert delivery.locator('[data-carrier-eta]').inner_text() != eta
    building(page, 'quarry')
    expect(page.locator('[data-upgrade-delivery-time="quarry"]')).not_to_contain_text('Waiting')
    expect(page.locator('[data-upgrade-build-time="quarry"]')).not_to_contain_text('Waiting')
    expect(page.locator('[data-upgrade-delivery-time="quarry"]')).to_contain_text('min')
    expect(page.locator('[data-upgrade-build-time="quarry"]')).to_contain_text('min')
    close(page)
    page.reload();page.wait_for_selector('.activity-task')
    building(page, 'warehouse')
    for resource, number in [('food','1'), ('wood','2'), ('grain','3')]:
        expect(page.locator('[data-warehouse-priority="' + resource + '"]')).to_have_attribute('data-priority-number', number)
    page.locator('[data-warehouse-priority="wood"]').click()
    expect(page.locator('[data-warehouse-priority="grain"]')).to_have_attribute('data-priority-number', '2')
    expect(page.locator('[data-priority-progress]')).to_contain_text('5 Food · 3 Grain · 2 random')
    building(page, 'townhall')
    page.locator('[data-construction-entry]').click()
    expect(page.locator('[data-construction-summary]')).to_be_visible()
    context.close()
    print('PASS all building statuses/storage/staffing, housing4stats, hidden explanations, totalETA and live carrier priorities/jobs')


def mobile_panels(browser):
    context, page = visit(browser, progressed(), width=390, height=844, mobile=True)
    for id in ['windmill', 'house', 'warehouse']:
        building(page, id)
        sizes = page.locator('#island-dialog').evaluate('(node) => [node.clientWidth,node.scrollWidth]')
        assert sizes[1] <= sizes[0] + 1, (id, sizes)
        key = 'housing' if id == 'house' else 'premium-' + id
        info = page.locator('[data-upgrade-info="windmill"]') if id == 'windmill' else page.locator('[data-section-info="' + key + '"]')
        info.tap()
        popup = page.locator('[data-upgrade-help="windmill"]') if id == 'windmill' else page.locator('[data-section-help="' + key + '"]')
        expect(popup).to_be_visible()
        bounds = popup.bounding_box()
        assert bounds['x'] >= 0 and bounds['x'] + bounds['width'] <= 391, bounds
        page.locator('#dialog-title').tap()
        expect(popup).not_to_be_visible()
    page.screenshot(path='/tmp/harborlight-frontend-v10-mobile.png')
    context.close()
    print('PASS mobile panels, readable compact values and touch-accessible information')


def header_and_resource_dock(browser):
    routes = {'wood': 'Lumber Camp', 'planks': 'Sawmill', 'stone': 'Quarry', 'grain': 'Farm', 'food': 'Windmill'}
    for width, height in [(1672,941),(1440,941),(1200,941),(390,844)]:
        context, page = visit(browser, progressed(), width=width, height=height, mobile=width == 390)
        rectangles = page.evaluate("""() => {
          const rect = selector => {const b=document.querySelector(selector).getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom};};
          const text=document.querySelector('#hit-home > span:last-child');
          const range=document.createRange();range.selectNodeContents(text.firstChild);
          const textBounds=range.getBoundingClientRect();
          return {brand:rect('#hit-home'),level:rect('#hit-level'),header:rect('.island-topbar'),navigation:rect('.island-left-nav'),textRight:textBounds.right};
        }""")
        assert rectangles['brand']['right'] <= rectangles['level']['x'] + 1, (width, rectangles)
        assert rectangles['textRight'] <= rectangles['level']['x'] + 1, (width, rectangles)
        assert rectangles['header']['bottom'] <= rectangles['navigation']['y'] + 1, (width, rectangles)
        for id in ['island','expeditions','tasks','residents','map']:
            control = page.locator('#hit-nav-' + id)
            assert control.evaluate("""node => {const b=node.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button')===node;}"""), (width, id)
        expect(page.locator('[data-resource-dock]')).not_to_be_visible()
        page.locator('#hit-category-resources').click()
        expect(page.locator('#island-dialog')).not_to_be_visible()
        expect(page.locator('[data-resource-dock]')).to_be_visible()
        expect(page.locator('[data-dock-resource]')).to_have_count(5)
        expect(page.locator('[data-dock-resource="coins"]')).to_have_count(0)
        for resource, title in routes.items():
            card = page.locator('[data-dock-resource="' + resource + '"]')
            expect(card.locator('svg[role="img"]')).to_be_visible()
            expect(card.locator('[data-dock-active="' + resource + '"]')).to_have_text('1' if resource == 'stone' else '0')
            expect(card.locator('[data-dock-staffing="' + resource + '"]')).to_have_text('10 / 12')
            expect(card.locator('[data-dock-stock]')).to_have_count(0)
            card.click()
            expect(page.locator('#dialog-title')).to_have_text(title)
            close(page)
        if width == 1672:
            page.locator('[data-dock-resource="stone"]').click()
            page.locator('[data-worker-building="quarry"][data-worker-delta="1"]').click()
            close(page)
            expect(page.locator('[data-dock-active="stone"]')).to_have_text('1')
            expect(page.locator('[data-dock-staffing="stone"]')).to_have_text('9 / 12')
            page.clock.fast_forward(300000)
            expect(page.locator('[data-dock-active="stone"]')).to_have_text('2')
            expect(page.locator('[data-dock-active="food"]')).to_have_text('0')  # Its assigned miller lacks grain.
            page.screenshot(path='/tmp/harborlight-frontend-v11-resource-dock.png')
        page.locator('#hit-category-buildings').click()
        expect(page.locator('[data-resource-dock]')).not_to_be_visible()
        expect(page.locator('#hit-category-buildings')).to_have_attribute('aria-pressed','true')
        for id in ['house','farm','sawmill','quarry','dock','warehouse','lighthouse']:
            expect(page.locator('#hit-dock-' + id)).to_be_visible()
        if width == 1672:
            page.screenshot(path='/tmp/harborlight-frontend-v10-header-dock.png')
        context.close()
    print('PASS header/Level/navigation geometry at four widths and five illustrated product cards with live staffing, producer routes and Buildings restoration')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'), args=['--no-sandbox'])
    try:
        single_task_and_stock(browser)
        building_panels(browser)
        mobile_panels(browser)
        header_and_resource_dock(browser)
    finally:
        browser.close()
assert not errors, errors
assert not failures, failures
print('PASS frontend-v10 review acceptance with no JavaScript or HTTP errors')
