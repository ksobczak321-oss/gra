"""Real early tutorial actions, visible routing and a cloud-only reload.

All Firebase requests are intercepted by isolated REST fixtures. The test
clicks the real House control while Farm is still the first lesson; it never
injects completed, claimed or skipped tutorial flags and never accesses a live
admin island.
"""
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('v22_tutorial_cloud_fixture', SOURCE / 'tests/harborlight-dev-game-smoke.py')
cloud = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cloud)
UID = 'dev-admin2'
EARLY_LESSON = 'personal-happiness'
MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks']


def fresh_world():
    script = """import {createState} from './harborlight-v1-state.js';
      const state=createState(%d);
      state.islandName='Samodzielny Dom';
      console.log(JSON.stringify(state));""" % int(cloud.NOW.timestamp() * 1000)
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', script], cwd=SOURCE,
                                    capture_output=True, text=True, check=True).stdout)


def confirmed(page):
    expect(page.locator('body')).to_have_attribute('data-cloud-status', re.compile(r'^(saved|pending)$'))


def close_panel(page):
    if page.locator('#island-dialog').evaluate('(node)=>node.open'):
        page.locator('#island-dialog .dialog-close').click()


def reward_grid(page, popup):
    tiles = popup.locator('[data-tutorial-reward-material]')
    expect(tiles).to_have_count(6)
    boxes = tiles.evaluate_all('''nodes => nodes.map(node => {
      const box=node.getBoundingClientRect(), label=node.querySelector('span');
      return {x:box.x,y:box.y,width:box.width,right:box.right,
        fits:node.scrollWidth<=node.clientWidth+1 && label.scrollWidth<=label.clientWidth+1,
        labelSize:parseFloat(getComputedStyle(label).fontSize)};
    })''')
    assert all(box['fits'] and box['labelSize'] >= 11 for box in boxes), boxes
    for row in [boxes[:3], boxes[3:]]:
        assert max(box['y'] for box in row) - min(box['y'] for box in row) <= 1, boxes
        assert row[0]['x'] < row[1]['x'] < row[2]['x'], boxes
    assert boxes[3]['y'] > boxes[0]['y'] + 10, boxes
    for first, second in zip(boxes[:3], boxes[3:]):
        assert abs(first['x'] - second['x']) <= 1, boxes
        assert abs(first['width'] - second['width']) <= 1, boxes
    assert min(box['x'] for box in boxes) >= 0, boxes
    assert max(box['right'] for box in boxes) <= page.viewport_size['width'], boxes
    page.screenshot(path='/tmp/harborlight-v22-reward-%s.png' % page.viewport_size['width'])


def early_house_then_reload(browser):
    initial = fresh_world()
    assert not initial['tutorial']['completed'] and not initial['tutorial']['claimed']
    cloud.DOCUMENTS[UID] = {'payload': json.dumps(initial), 'revision': 5, 'updateTime': cloud.timestamp()}
    context, page = cloud.context(browser, UID)
    try:
        assert page.goto(cloud.ORIGIN + '/harborlight-v1-layered.html?profile=new-player').ok
        expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'rules-read')
        confirmed(page)
        expect(page.locator('[data-tutorial-panel] progress')).to_have_attribute('max', '25')
        expect(page.locator('[data-tutorial-list-item="%s"]' % EARLY_LESSON)).to_have_count(1)

        # Leave the current Farm lesson and independently spend the actual
        # House's daily points. That future lesson must disappear immediately.
        close_panel(page)
        page.locator('#hit-world-house').click()
        expect(page.locator('[data-house-everyone]')).to_be_enabled()
        before = cloud.cloud_state(UID)
        page.locator('[data-house-everyone]').click()
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
        after_house = cloud.cloud_state(UID)
        assert after_house['houseHappinessPool']['points'] == 0
        assert after_house['resources'] == before['resources']
        assert after_house['tutorial']['skippedLessons'][EARLY_LESSON]
        assert not after_house['tutorial']['claimed'].get(EARLY_LESSON)
        assert EARLY_LESSON not in after_house['tutorial']['chests']
        expect(page.locator('[data-tutorial-achievement]')).to_have_count(0)
        expect(page.locator('[data-tutorial-guide]')).to_have_attribute('data-tutorial-guide', 'rules-read')
        close_panel(page)
        page.locator('[data-tutorial-return]').click()
        expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'rules-read')
        expect(page.locator('[data-tutorial-list-item="%s"]' % EARLY_LESSON)).to_have_count(0)
        expect(page.locator('[data-tutorial-panel] progress')).to_have_attribute('max', '24')
        expect(page.locator('[data-tutorial-panel] progress')).to_have_attribute('value', '0')
        expect(page.locator('[data-tutorial-current] .tutorial-v16-eyebrow')).to_have_text('Krok 1 z 24')

        # The pending Farm lesson still pays its normal immediate reward. The
        # House action neither steals nor duplicates that already earned reward.
        page.locator('[data-tutorial-visit="rules-read"]').click()
        farm_before = cloud.cloud_state(UID)
        page.locator('[data-worker-building="farm"][data-worker-delta="1"]').click()
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
        # The clock is paused: explicitly claim through the real guide instead
        # of waiting for the next periodic auto-claim tick.
        page.locator('[data-tutorial-claim="rules-read"]').click()
        reward = page.locator('[data-tutorial-achievement="rules-read"]')
        expect(reward).to_be_visible()
        reward_grid(page, reward)
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
        received = cloud.cloud_state(UID)
        assert received['resources']['coins'] == farm_before['resources']['coins'] + 100
        for material in MATERIALS:
            assert received['resources'][material] == farm_before['resources'][material] + 25
        page.locator('[data-tutorial-skip="rules-read"]').click()
        expect(page.locator('[data-tutorial-guide]')).to_have_attribute('data-tutorial-guide', 'island-map')
        expect(page.locator('[data-tutorial-guide] .tutorial-v16-guide-copy small')).to_have_text('Krok 2 z 24')
        # Reward acknowledgement uses the normal thirty-second cloud autosave.
        # Advance the real game timer rather than directly flushing internals.
        page.clock.run_for(30000)
        confirmed(page)
        earned = cloud.cloud_state(UID)
        first_receipt = earned['tutorial']['chests']['rules-read']
        assert first_receipt['claimed'] and first_receipt['skipped']
        cloud.no_island_cache(page)

        # A new page load must use the fixture cloud payload, retaining both the
        # hidden future lesson and the Farm reward, with no island browser cache.
        assert page.reload().ok
        expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'island-map')
        confirmed(page)
        expect(page.locator('[data-tutorial-list-item="%s"]' % EARLY_LESSON)).to_have_count(0)
        expect(page.locator('[data-tutorial-panel] progress')).to_have_attribute('max', '24')
        expect(page.locator('[data-tutorial-panel] progress')).to_have_attribute('value', '1')
        expect(page.locator('[data-tutorial-current] .tutorial-v16-eyebrow')).to_have_text('Krok 2 z 24')
        expect(page.locator('[data-tutorial-achievement]')).to_have_count(0)
        restored = cloud.cloud_state(UID)
        assert restored['tutorial']['skippedLessons'][EARLY_LESSON]
        assert restored['tutorial']['chests']['rules-read'] == first_receipt
        assert restored['resources']['coins'] == earned['resources']['coins']
        for material in MATERIALS:
            assert abs(restored['resources'][material] - earned['resources'][material]) < 1
        assert EARLY_LESSON not in restored['tutorial']['chests']

        # The real next action remains available and leads to the third lesson.
        page.locator('[data-tutorial-visit="island-map"]').click()
        page.locator('[data-worker-building="warehouse"][data-worker-delta="1"]').click()
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
        page.locator('[data-tutorial-claim="island-map"]').click()
        expect(page.locator('[data-tutorial-achievement="island-map"]')).to_be_visible()
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
        page.locator('[data-tutorial-skip="island-map"]').click()
        expect(page.locator('[data-tutorial-guide]')).to_have_attribute('data-tutorial-guide', 'first-job')
        confirmed(page)
        assert cloud.cloud_state(UID)['tutorial']['claimed']['island-map']
        cloud.no_island_cache(page)
    finally:
        context.close()
    print('PASS22 actual early House action disappears without reward; Farm and Warehouse retain normal rewards, visible numbering and cloud reload history', flush=True)


def mobile_reward_grid(browser):
    cloud.DOCUMENTS[UID] = {'payload': json.dumps(fresh_world()), 'revision': 5, 'updateTime': cloud.timestamp()}
    context, page = cloud.context(browser, UID, mobile=True)
    try:
        page.set_viewport_size({'width': 360, 'height': 800})
        assert page.goto(cloud.ORIGIN + '/harborlight-v1-layered.html?profile=new-player').ok
        expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'rules-read')
        page.locator('[data-tutorial-visit="rules-read"]').click()
        page.locator('[data-worker-building="farm"][data-worker-delta="1"]').click()
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
        page.locator('[data-tutorial-claim="rules-read"]').click()
        reward = page.locator('[data-tutorial-achievement="rules-read"]')
        expect(reward).to_be_visible()
        reward_grid(page, reward)
        cloud.no_island_cache(page)
    finally:
        context.close()
    print('PASS22 six real reward tiles form a readable3×2 grid on desktop and360px mobile without horizontal overflow', flush=True)


def run():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            early_house_then_reload(browser)
            mobile_reward_grid(browser)
            assert not cloud.ERRORS, cloud.ERRORS
        finally:
            browser.close()


if __name__ == '__main__':
    run()
