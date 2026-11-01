"""Replay explanation and resume lessons without restarting an existing island."""
import importlib.util
import json
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('help_fixture', ROOT / 'tests/harborlight-dev-game-smoke.py')
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)
UID = 'dev-admin1'


def scenario(browser, language, mobile):
    saved = fixture.starter(777, 'Stara wyspa')
    saved['statistics']['upgrades'] = 12
    fixture.DOCUMENTS[UID] = {'payload': json.dumps(saved), 'revision': 5, 'updateTime': fixture.timestamp()}
    context, page = fixture.context(browser, UID, language=language, mobile=mobile)
    try:
        fixture.visit(page)
        fixture.settings(page)
        page.locator('[data-open-help]').click()
        expect(page.locator('[data-help-panel] button')).to_have_count(2)
        expect(page.locator('[data-help-return-tour]')).to_have_text('Wznów tutorial' if language == 'pl' else 'Continue tutorial')
        expect(page.locator('[data-help-return-lessons]')).to_have_text('Wznów samouczek' if language == 'pl' else 'Continue practical tutorial')
        page.locator('[data-help-return-tour]').click()
        tour = page.locator('[data-onboarding-replay="true"]')
        expect(tour).to_be_visible()
        expect(tour).to_have_attribute('data-onboarding-step', 'home')
        expect(tour.locator('[data-onboarding-paused]')).to_contain_text('biegnie dalej' if language == 'pl' else 'keeps running')
        for step in ['level', 'happiness', 'coins', 'working']:
            tour.locator('[data-onboarding-next]').click()
            expect(tour).to_have_attribute('data-onboarding-step', step)
        page.clock.run_for(31_000)
        current = fixture.cloud_state(UID)
        assert current['resources']['coins'] == 777
        assert current['islandName'] == 'Stara wyspa'
        assert current['statistics']['upgrades'] == 12
        assert current['tutorial'].get('rewards', {}) == saved['tutorial'].get('rewards', {})
        assert current['tutorial'].get('claimed', []) == saved['tutorial'].get('claimed', [])
        assert current['worldTimeMs'] > saved['worldTimeMs'], 'Help must not pause an already started world'
        tour.locator('[data-onboarding-exit]').click()
        expect(tour).to_have_count(0)
        expect(page.locator('[data-tutorial-exit-reminder]')).to_be_visible()
        page.locator('[data-close-tutorial-exit-reminder]').click()
        paused = fixture.cloud_state(UID)['learning']['tour']
        assert paused['index'] == 4 and paused['paused'] and not paused['active'], paused
        fixture.settings(page)
        page.locator('[data-open-help]').click()
        page.locator('[data-help-return-lessons]').click()
        expect(page.locator('[data-tutorial-resume], [data-tutorial-panel], [data-tutorial-go]').first).to_be_visible()
        assert fixture.cloud_state(UID)['statistics']['upgrades'] == 12
        fixture.no_island_cache(page)
    finally:
        context.close()


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    scenario(browser, language, mobile)
            assert not fixture.ERRORS, fixture.ERRORS
        finally:
            browser.close()
    print('PASS Help: explanation replay and practical tutorial resume, PL/EN desktop/mobile, running clock and preserved progress')


if __name__ == '__main__':
    run()
