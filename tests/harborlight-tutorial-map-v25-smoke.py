"""Actual map-first lesson flow, viewport guidance and no navigation rewards.

Uses only isolated in-memory worlds produced by real earlier tutorial actions.
No cloud account or save document is touched.
"""
import importlib.util
import os
from pathlib import Path
import re
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('map_tutorial_fixture', ROOT / 'tests/harborlight-tutorial-v21-smoke.py')
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


def untouched(page, before):
    actual = qa.qa.state(page)
    assert actual['resources'] == before['resources'], 'Finding/opening a building cannot grant a reward'
    assert actual['tutorial']['claimed'] == before['tutorial']['claimed']
    assert actual['tutorial']['completed'] == before['tutorial']['completed']
    assert actual['buildings']['lumber']['workers'] == before['buildings']['lumber']['workers']


def map_first(browser, language, mobile, motion='reduce'):
    context, page = qa.enter(browser, qa.model(2), language=language, mobile=mobile, motion=motion)
    try:
        expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'first-job')
        before = qa.qa.state(page)
        page.locator('[data-tutorial-visit="first-job"]').click()
        expect(page.locator('#island-dialog')).not_to_be_visible()
        expect(page.locator('[data-worker-building="lumber"]')).not_to_be_visible()
        building = page.locator('#hit-world-lumber')
        expect(building).to_have_attribute('data-tutorial-map-target', 'first-job')
        expect(building).to_have_class(re.compile('tutorial-map-target'))
        expect(building).to_be_in_viewport(ratio=0.99)
        pointer = page.locator('[data-tutorial-pointer]')
        expect(pointer).to_have_attribute('data-tutorial-phase', 'map')
        expect(pointer).to_contain_text('Znajdź na mapie' if language == 'pl' else 'on the map')
        expect(pointer).to_be_in_viewport(ratio=0.99)
        assert building.evaluate('(n)=>getComputedStyle(n).animationName') == ('none' if motion == 'reduce' else 'tutorial-map-glow')
        assert building.evaluate('(n)=>parseFloat(getComputedStyle(n).outlineWidth)') >= 3
        untouched(page, before)
        if mobile:
            page.locator('.mobile-island-menu').click()
            page.locator('#island-dialog').get_by_role('button', name='Ustawienia' if language == 'pl' else 'Settings', exact=True).click()
        else:
            page.locator('#hit-settings').click()
        expect(page.locator('[data-tutorial-pointer],[data-tutorial-map-target]')).to_have_count(0)
        page.locator('#island-dialog .dialog-close').click()
        expect(building).to_have_attribute('data-tutorial-map-target', 'first-job')
        untouched(page, before)

        # This is the real island hotspot; neither the tutorial nor its Next
        # button opens the building for the player.
        building.click()
        expect(page.locator('[data-building-panel="lumber"]')).to_be_visible()
        expect(page.locator('[data-tutorial-map-target]')).to_have_count(0)
        plus = page.locator('[data-worker-building="lumber"][data-worker-delta="1"]')
        expect(plus).to_have_class(re.compile('tutorial-action-target'))
        expect(pointer).to_have_attribute('data-tutorial-phase', 'action')
        expect(plus).to_be_in_viewport(ratio=0.99)
        untouched(page, before)
        plus.click()
        reward = page.locator('[data-tutorial-achievement="first-job"]')
        expect(reward).to_be_visible()
        after = qa.qa.state(page)
        assert after['buildings']['lumber']['workers'] == before['buildings']['lumber']['workers'] + 1
        assert after['resources']['coins'] - before['resources']['coins'] == 100
        assert after['tutorial']['claimed']['first-job']
        expect(page.locator('[data-tutorial-pointer]')).to_have_count(0)
        page.locator('[data-tutorial-skip="first-job"]').click()

        # Continue reveals the next real building without opening it or
        # repeating the preceding assignment/reward.
        expect(page.locator('#island-dialog')).not_to_be_visible()
        expect(page.locator('#hit-world-windmill')).to_have_attribute('data-tutorial-map-target', 'food-check')
        page.locator('[data-tutorial-return]').click()
        page.locator('[data-tutorial-dismiss]').click()
        expect(page.locator('[data-tutorial-pointer],[data-tutorial-map-target]')).to_have_count(0)
        page.locator('#hit-world-windmill').click()
        expect(page.locator('[data-building-panel="windmill"]')).to_be_visible()
        assert qa.qa.state(page)['resources']['coins'] == after['resources']['coins']
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    finally:
        context.close()
    print('PASS25 map-first actual Lumber Camp click→highlighted assignment→one reward→next map target→dismiss cleanup: %s/%s/%s' % (language, 'mobile' if mobile else 'desktop', motion), flush=True)


def run():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    map_first(browser, language, mobile)
            map_first(browser, 'pl', False, motion='no-preference')
            assert not qa.qa.ERRORS, qa.qa.ERRORS
        finally:
            browser.close()


if __name__ == '__main__':
    run()
