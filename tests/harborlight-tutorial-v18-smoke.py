"""Actionable tutorial and loyalty acceptance against the packaged frontend.

Fixtures are injected only at loopback bootstrap. All tutorial completion,
upgrading, spending and claiming in each scenario uses the actual user controls.
No island is stored by the application in browser storage.
"""
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('v18_acceptance_helpers', ROOT / 'tests/harborlight-frontend-v18-smoke.py')
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
RELAY = 'qa-v18-tutorial-fixture'
MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks']
RESOURCES = ['coins', *MATERIALS]


def snapshot(page):
    return qa.state(page)


def install(page, value):
    page.evaluate('(value)=>sessionStorage.setItem(%s,JSON.stringify(value))' % json.dumps(RELAY), value)
    page.reload()
    page.wait_for_function('document.getElementById("loading").hidden && !!window.__HARBORLIGHT_DEV_STATE__')


def open_fixture(browser, mode='tutorial', *, now=None, width=1366, height=768):
    old_now = qa.NOW
    if now:
        qa.NOW = now
    try:
        context, page = qa.open_page(browser, width=width, height=height)
    finally:
        qa.NOW = old_now
    page.add_init_script('''(() => {
      const value=sessionStorage.getItem(%s);
      if(value){window.__HARBORLIGHT_DEV_FIXTURE__=JSON.parse(value);sessionStorage.removeItem(%s);}
    })();''' % (json.dumps(RELAY), json.dumps(RELAY)))
    state = page.evaluate('''async mode=>{
      const {createState}=await import('./harborlight-v1-state.js?v=frontend-v18');
      const {LEGACY_TUTORIAL_LESSONS:TUTORIAL_LESSONS,normalizeProgression}=await import('./harborlight-v1-progression.js?v=frontend-v18');
      const s=createState(Date.now());s.tutorial.seed=57;
      // Preserve this historical curriculum as new islands get the turbo course.
      normalizeProgression(s,{...s,tutorial:{version:3,seed:57}});
      s.engagementSchedule.initialCompleted=true;s.engagementSchedule.initialAnchored=true;s.engagementSchedule.nextAt=1000000000;
      if(mode==='loyalty')s.tutorial.autoOpenDisabled=true;
      if(mode==='expedition'){
        for(const lesson of TUTORIAL_LESSONS.slice(0,22)){
          s.tutorial.completed[lesson.id]=true;s.tutorial.claimed[lesson.id]=true;
        }
      }
      return s;
    }''', mode)
    install(page, state)
    return context, page


def assert_arrow(page, building):
    target = page.locator(f'[data-worker-building="{building}"][data-worker-delta="1"]')
    expect(target).to_have_class(__import__('re').compile('tutorial-action-target'))
    pointer = page.locator('[data-tutorial-pointer]')
    expect(pointer).to_be_visible()
    bounds = pointer.bounding_box()
    assert bounds and bounds['x'] >= 0 and bounds['y'] >= 0
    assert bounds['x'] + bounds['width'] <= page.viewport_size['width'] + 1
    assert bounds['y'] + bounds['height'] <= page.viewport_size['height'] + 1
    return target


def dismiss_chest(page, lesson):
    popup = page.locator(f'[data-tutorial-achievement="{lesson}"]')
    expect(popup).to_be_visible()
    page.locator(f'[data-tutorial-skip="{lesson}"]').click()
    expect(popup).not_to_be_visible()


def first_four_actions(browser, *, width=1366, height=768):
    context, page = open_fixture(browser, width=width, height=height)
    expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'rules-read')
    assert snapshot(page)['tutorial']['completed'] == {}
    assert not page.locator('[data-tutorial-observe]').count()
    page.locator('[data-tutorial-visit="rules-read"]').click()
    page.locator('#hit-world-farm').click()
    assert snapshot(page)['buildings']['farm']['workers'] == 0
    assert snapshot(page)['tutorial']['completed'] == {}
    assert snapshot(page)['tutorial']['chests'] == {}
    page.locator('[data-production-info="farm"]').click()
    expect(page.locator('[data-production-help="farm"]')).to_be_visible()
    assert snapshot(page)['tutorial']['completed'] == {}, 'Reading production help must not complete an action lesson'
    page.locator('[data-production-info="farm"]').click()

    steps = [('rules-read', 'farm'), ('island-map', 'warehouse'), ('first-job', 'windmill'), ('food-check', 'lumber')]
    for index, (lesson, building) in enumerate(steps):
        if index:
            page.locator(f'[data-tutorial-go="{lesson}"]').click()
            page.locator('#hit-world-' + building).click()
        before = snapshot(page)
        assert not before['tutorial']['completed'].get(lesson)
        assert_arrow(page, building).click()
        current = snapshot(page)
        assert current['buildings'][building]['workers'] == 1
        assert current['tutorial']['completed'][lesson]
        assert current['tutorial']['claimed'][lesson]
        reward = current['tutorial']['chests'][lesson]['reward']
        assert all(100 <= reward[material] <= 300 for material in MATERIALS)
        for material in MATERIALS:
            assert current['resources'][material] == before['resources'][material] + reward[material]
        assert current['resources']['coins'] == before['resources']['coins']
        if lesson == 'food-check':
            # Seed57 legally fills past capacity on this fourth base claim.
            expect(page.locator('[data-tutorial-share="food-check"]')).to_be_disabled()
        dismiss_chest(page, lesson)

    return context, page


def assert_supplies_guide_geometry(page):
    # This exact legacy state failed in CI: the fourth chest has been
    # acknowledged and the new supplies action joins the map/course buttons.
    # The v27 in-flow review entry adds a fourth control. All must fit before
    # Playwright or the player tries to scroll them.
    guide = page.locator('[data-active-tutorial-guide].tutorial-guide-floating')
    expect(guide).to_be_visible()
    expect(guide).to_be_in_viewport(ratio=0.99)
    expect(guide.locator('button')).to_have_count(4)
    bounds = guide.bounding_box()
    copy = guide.locator('.tutorial-v16-guide-copy').bounding_box()
    assert bounds and copy and copy['width'] >= 160, 'The lesson explanation must remain readable'
    for control in guide.locator('button').all():
        expect(control).to_be_in_viewport(ratio=0.99)
        box = control.bounding_box()
        assert box and box['x'] >= bounds['x'] - 1 and box['y'] >= bounds['y'] - 1
        assert box['x'] + box['width'] <= bounds['x'] + bounds['width'] + 1
        assert box['y'] + box['height'] <= bounds['y'] + bounds['height'] + 1


def first_five_actions(browser):
    context, page = first_four_actions(browser)
    overfull = snapshot(page)
    assert sum(overfull['resources'][material] for material in MATERIALS) > 4000
    assert overfull['tutorial']['claimed']['food-check']
    assert_supplies_guide_geometry(page)
    page.locator('[data-tutorial-go="townhall-upgrade"]').click()
    page.locator('[data-tutorial-supplies]').click()
    page.locator('#hit-world-townhall').click()
    supplied = snapshot(page)
    assert supplied['tutorial']['buildingSuppliesClaimed']
    assert supplied['resources']['coins'] == 500
    assert all(supplied['resources'][material] >= 500 for material in MATERIALS)
    upgrade = page.locator('[data-upgrade-building="townhall"]')
    expect(upgrade).to_be_enabled()
    upgrade.click()
    ordered = snapshot(page)
    assert ordered['tutorial']['completed']['townhall-upgrade']
    assert not ordered['tutorial']['claimed'].get('townhall-upgrade'), 'Overfull storage must defer the next chest'
    assert ordered['resources']['coins'] == 0
    project = next(project for project in ordered['constructionProjects'] if project['building'] == 'townhall')
    assert project['targetLevel'] == 2
    assert all(project['reservedMaterials'][material] == 500 for material in MATERIALS)
    expect(page.locator('[data-tutorial-storage-blocked]')).to_be_visible()

    # Management stays usable while chests are blocked. Extra real carriers
    # pick up the reserved materials and thereby free the physical storage.
    qa.close_panel(page)
    # The floating guide must not catch island clicks merely because fonts or
    # viewport geometry put its background over another building (CI Chromium
    #151 exposed this at the happiness-action step). Its real buttons remain
    # interactive. Reproduce the overlap deterministically before a real click.
    guide = page.locator('[data-active-tutorial-guide].tutorial-guide-floating')
    expect(guide).to_be_visible()
    warehouse = page.locator('#hit-world-warehouse').bounding_box()
    assert warehouse
    guide.evaluate('''(node,point)=>{
      Object.assign(node.style,{left:(point.x-4)+'px',top:(point.y-4)+'px',bottom:'auto'});
    }''', {'x':warehouse['x']+warehouse['width']/2,'y':warehouse['y']+warehouse['height']/2})
    assert guide.evaluate('(node)=>getComputedStyle(node).pointerEvents') == 'none'
    assert guide.locator('button').first.evaluate('(node)=>getComputedStyle(node).pointerEvents') == 'auto'
    page.locator('#hit-world-warehouse').click()
    for _ in range(3):
        page.locator('[data-worker-building="warehouse"][data-worker-delta="1"]').click()
    assert snapshot(page)['buildings']['warehouse']['workers'] == 4
    # A shared limit and each material limit must both be freed. Real carriers
    # collect wood first, so food can remain over its own limit even after the
    # shared usage has dropped below4000. Keep the test player active while
    # they inspect the delivery; do not fast-forward past the global logout.
    for _ in range(12):
        qa.close_panel(page)
        page.locator('#hit-world-warehouse').click()
        page.clock.fast_forward(5 * 60 * 1000)
        released = snapshot(page)
        if released['tutorial']['claimed'].get('townhall-upgrade'):
            break
        totals = [released['resources'][material] for material in MATERIALS]
        assert sum(totals) > 4000 or max(totals) > 1000, 'An eligible completed chest must be paid without another tutorial action'
    assert released['tutorial']['claimed'].get('townhall-upgrade'), {
        'resources': released['resources'], 'projects': released['constructionProjects'],
        'trips': released['haulTrips']}
    expect(page.locator('[data-tutorial-achievement="townhall-upgrade"]')).to_be_visible()
    assert released['tutorial']['completed'].get('happiness-action') is not True
    dismiss_chest(page, 'townhall-upgrade')
    assert not page.evaluate("Object.keys(localStorage).filter(key=>/island|save/.test(key))")
    context.close()
    print('PASS firstfive real tutorial actions: arrows, no reading reward, four chests, overfull gate, spendable upgrade help and physical pickup recovery', flush=True)


def legacy_supplies_mobile(browser):
    context, page = first_four_actions(browser, width=360, height=640)
    try:
        before = snapshot(page)
        assert_supplies_guide_geometry(page)
        page.locator('[data-tutorial-go="townhall-upgrade"]').click()
        assert snapshot(page)['resources'] == before['resources']
        assert snapshot(page)['tutorial']['completed'] == before['tutorial']['completed']
        page.locator('[data-tutorial-supplies]').click()
        townhall = page.locator('#hit-world-townhall')
        expect(townhall).to_have_attribute('data-tutorial-map-target', 'townhall-upgrade')
        expect(townhall).to_be_in_viewport(ratio=0.99)
        townhall.click()
        expect(page.locator('[data-upgrade-building="townhall"]')).to_be_enabled()
    finally:
        context.close()
    print('PASS25 legacy fourth-chest supplies, map and tutorial buttons fit on360px and lead to the real TownHall', flush=True)


def loyalty_once_per_warsaw_day(browser):
    context, page = open_fixture(browser, 'loyalty', now=datetime(2026, 10, 30, 22, 59, 55, tzinfo=timezone.utc))
    page.locator('#hit-home').click()
    before = snapshot(page)
    reward = before['loyalty']['pendingReward']
    assert set(reward) == set(RESOURCES)
    assert all(50 <= reward[resource] <= 200 for resource in RESOURCES)
    page.locator('[data-claim-loyalty]').click()
    claimed = snapshot(page)
    for resource in RESOURCES:
        assert claimed['resources'][resource] == before['resources'][resource] + reward[resource]
    assert len(claimed['loyalty']['claimedDays']) == 1
    install(page, claimed)
    page.locator('#hit-home').click()
    assert not page.locator('[data-claim-loyalty]').count()
    assert snapshot(page)['resources'] == claimed['resources']
    page.clock.fast_forward(10000)
    install(page, snapshot(page))
    page.locator('#hit-home').click()
    next_day = snapshot(page)
    assert next_day['loyalty']['streak'] == 2
    assert next_day['loyalty']['lastDay'] == '2026-10-31'
    next_reward = next_day['loyalty']['pendingReward']
    page.locator('[data-claim-loyalty]').click()
    second = snapshot(page)
    assert len(second['loyalty']['claimedDays']) == 2
    for resource in RESOURCES:
        assert second['resources'][resource] == next_day['resources'][resource] + next_reward[resource]
    context.close()
    print('PASS loyalty draws persist and each Warsawday pays allsix resources exactlyonce across fixture reload', flush=True)


def expedition_defers_tutorial_reward(browser):
    context, page = open_fixture(browser, 'expedition')
    expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'expedition-rules')
    page.locator('[data-tutorial-visit="expedition-rules"]').click()
    page.locator('[data-expedition-choice="triples"]').click()
    current = snapshot(page)
    assert current['tutorial']['completed']['expedition-rules']
    assert not current['tutorial']['claimed'].get('expedition-rules')
    assert not page.locator('[data-tutorial-achievement],[data-tutorial-pointer],[data-active-tutorial-guide]').count()
    run = next(run for run in current['expeditionRuns'].values() if run['status'] == 'active')
    page.clock.fast_forward(15000)
    progressed = next(run for run in snapshot(page)['expeditionRuns'].values() if run['status'] == 'active')
    assert progressed['remaining'] < run['remaining']
    assert not page.locator('[data-tutorial-achievement]').count()
    page.locator('[data-minigame-result-actions] button').first.click()
    page.locator('[data-confirm-choice]').click()
    expect(page.locator('[data-tutorial-achievement="expedition-rules"]')).to_be_visible()
    assert snapshot(page)['tutorial']['claimed']['expedition-rules']
    dismiss_chest(page, 'expedition-rules')
    context.close()
    print('PASS expedition runs unobstructed and its tutorial chest appears only after the series ends', flush=True)


def run():
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                                 headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
            try:
                for check in (first_five_actions, legacy_supplies_mobile, loyalty_once_per_warsaw_day, expedition_defers_tutorial_reward):
                    check(browser)
                assert not qa.ERRORS, qa.ERRORS
            finally:
                browser.close()
    finally:
        qa.server.shutdown()


if __name__ == '__main__':
    run()
