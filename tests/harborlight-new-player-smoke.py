"""The new-player URL has a normal starter kit and a separate persistent island.

Set HARBORLIGHT_BASE_URL to verify an existing local or public static deployment.
The test never changes a real user's browser storage.
"""
import json
import os
from datetime import datetime, timezone

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get('HARBORLIGHT_BASE_URL', 'http://127.0.0.1:8017').rstrip('/')
MAIN_KEY = 'harborlight-v1-interactive-save'
NEW_KEY = 'harborlight-v1-new-player-save'
NOW = datetime(2026, 10, 23, 12, 0, 0, tzinfo=timezone.utc)


def checkpoint(page):
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    return json.loads(page.evaluate('(key) => localStorage.getItem(key)', NEW_KEY))


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
        args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1672, 'height': 941}, reduced_motion='reduce')
    page = context.new_page()
    errors, failures = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failures.append((response.status, response.url)) if response.status >= 400 else None)
    page.on('requestfailed', lambda request: failures.append((request.failure, request.url)))
    page.clock.install(time=NOW)
    page.clock.pause_at(NOW)
    original = json.dumps({'version': 8, 'population': 17, 'resources': {'coins': 43210}, 'sentinel': 'existing-island-must-survive'}, separators=(',', ':'))
    page.add_init_script('localStorage.setItem(%s, %s)' % (json.dumps(MAIN_KEY), json.dumps(original)))
    response = page.goto(BASE + '/harborlight-v1-layered.html?profile=new-player')
    assert response and response.ok
    page.wait_for_function('document.getElementById("loading").hidden')
    expect(page.locator('html')).to_have_attribute('data-profile', 'new-player')
    state = checkpoint(page)
    assert state['resources'] == dict.fromkeys(['coins', 'wood', 'stone', 'grain', 'food', 'planks'], 100), state['resources']
    assert state['population'] == 12 and state['happiness'] == 0
    assert state['buildings']['townhall']['level'] == 1
    assert sum(building['workers'] for building in state['buildings'].values()) == 0
    assert all(person['workplace'] is None for person in state['residents'])
    assert state.get('previewBuildStockVersion') is None
    assert page.evaluate('(key) => localStorage.getItem(key)', MAIN_KEY) == original
    print('PASS new-player URL: normal 100 of all six resources, 12 residents, level 1, zero workers and no preview grant')

    page.locator('#hit-world-farm').click()
    page.locator('[data-worker-building="farm"][data-worker-delta="1"]').click()
    assigned = checkpoint(page)
    assert assigned['buildings']['farm']['workers'] == 1
    assert page.evaluate('(key) => localStorage.getItem(key)', MAIN_KEY) == original
    page.reload()
    page.wait_for_function('document.getElementById("loading").hidden')
    reloaded = checkpoint(page)
    assert reloaded['buildings']['farm']['workers'] == 1
    assert reloaded['resources'] == assigned['resources']
    assert reloaded.get('previewBuildStockVersion') is None
    assert page.evaluate('(key) => localStorage.getItem(key)', MAIN_KEY) == original
    print('PASS separate new-player progress persists across reload without changing the existing island or applying test stock')
    page.screenshot(path='/tmp/harborlight-new-player-profile.png')
    assert not errors, errors
    assert not failures, failures
    print('PASS no JavaScript or HTTP errors')
    context.close()
    browser.close()
