"""Balanced tutorial receipts and its real final storage action.

Uses the packaged frontend on loopback. The final fixture is the output of 24
actual model lessons, not hand-written completion flags or a live account.
"""
import importlib.util
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import subprocess

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('balanced_tutorial_browser_helpers', ROOT / 'tests/harborlight-frontend-v18-smoke.py')
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks']


def model(through=0, extra=False):
    code = """import {runTutorialCourse} from './tests/helpers/tutorial-v21-course.mjs';
    import {grantBonusMaterials} from './harborlight-v1-inventory.js';
    const {state}=runTutorialCourse({through:%d});
    if(%s)grantBonusMaterials(state,{stone:100});
    console.log(JSON.stringify(state));""" % (through, 'true' if extra else 'false')
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT,
                                    text=True, capture_output=True, check=True).stdout)


def enter(browser, value, *, language='pl', mobile=False, motion='reduce'):
    context = browser.new_context(viewport={'width': 390 if mobile else 1366, 'height': 844 if mobile else 768}, reduced_motion=motion, is_mobile=mobile, has_touch=mobile)
    context.add_init_script('localStorage.setItem("harborlight-language",' + json.dumps(language) + ');window.__HARBORLIGHT_DEV_FIXTURE__=' + json.dumps(value, ensure_ascii=False))
    page = context.new_page()
    page.on('pageerror', lambda error: qa.ERRORS.append(str(error)))
    now = datetime.fromtimestamp(value['worldTimeMs'] / 1000, tz=timezone.utc)
    page.clock.install(time=now - timedelta(seconds=1))
    page.clock.pause_at(now)
    assert page.goto(qa.URL).ok
    page.wait_for_function('document.getElementById("loading").hidden && !!window.__HARBORLIGHT_DEV_STATE__')
    return context, page


def immediate_first_rewards(browser):
    context, page = enter(browser, model())
    expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'rules-read')
    expect(page.locator('[data-tutorial-current]')).to_contain_text('537')
    page.locator('[data-tutorial-visit="rules-read"]').click()
    for index, (lesson, building) in enumerate([('rules-read', 'farm'), ('island-map', 'warehouse'), ('first-job', 'lumber'), ('food-check', 'windmill')]):
        if index:
            page.locator('[data-tutorial-go="%s"]' % lesson).click()
        expect(page.locator('#island-dialog')).not_to_be_visible()
        page.locator('#hit-world-' + building).click()
        before = qa.state(page)
        page.locator('[data-worker-building="%s"][data-worker-delta="1"]' % building).click()
        popup = page.locator('[data-tutorial-achievement="%s"]' % lesson)
        expect(popup).to_be_visible()
        assert popup.locator('[data-tutorial-share],[data-tutorial-reward-later]').count() == 0
        after = qa.state(page)
        assert after['tutorial']['claimed'][lesson]
        assert after['resources']['coins'] - before['resources']['coins'] == 100
        for resource in MATERIALS:
            assert after['resources'][resource] - before['resources'][resource] == 25
            assert after['bonusMaterials'][resource] == 0
        page.locator('[data-tutorial-skip="%s"]' % lesson).click()
        expect(popup).not_to_be_visible()
    assert qa.state(page)['tutorial']['chests']['food-check']['skipped']
    assert page.locator('[data-tutorial-storage-blocked]').count() == 0
    context.close()
    print('PASS21 tutorial first four assignments: immediate small materials and Coins, explicit Continue, no doubling or deferred chest queue', flush=True)


def final_real_action(browser):
    value = model(24)
    assert sum(value['resources'][resource] for resource in MATERIALS) < 6000
    context, page = enter(browser, value)
    finish = page.locator('[data-finish-tutorial]')
    expect(finish).to_be_enabled()
    finish.click()
    expect(page.locator('[data-tutorial-finished]')).to_be_visible()
    after = qa.state(page)
    assert after['tutorial']['settled']
    assert sum(after['resources'][resource] for resource in MATERIALS) == 6000
    assert all(after['bonusMaterials'][resource] == 0 for resource in MATERIALS)
    assert all(chest['claimed'] and chest['skipped'] for chest in after['tutorial']['chests'].values())
    assert not page.locator('[data-tutorial-achievement],[data-tutorial-claim],[data-tutorial-review]').count()
    context.close()
    print('PASS21 real final button: actual 24-lesson model outcome becomes full6000 Warehouse and all25 settled rewards without waiting crates', flush=True)


def external_bonus_is_preserved(browser):
    value = model(24, extra=True)
    context, page = enter(browser, value)
    expect(page.locator('[data-finish-tutorial]')).to_be_disabled()
    expect(page.locator('[data-tutorial-settlement-blocked]')).to_contain_text('bonusowe')
    assert qa.state(page)['resources'] == value['resources']
    assert qa.state(page)['bonusMaterials']['stone'] == 100
    context.close()
    print('PASS21 external bonus blocks final refill with an explanation; no materials are deleted or converted', flush=True)


def run():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            immediate_first_rewards(browser)
            final_real_action(browser)
            external_bonus_is_preserved(browser)
            assert not qa.ERRORS, qa.ERRORS
        finally:
            browser.close()


if __name__ == '__main__':
    run()
