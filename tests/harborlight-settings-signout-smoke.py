"""Direct Settings logout: safe cloud flush, PL/EN and preserved account history.

Uses isolated Firebase responses. No real account or cloud document is changed.
"""
import importlib.util
import json
import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('cloud_game_fixture', ROOT / 'tests/harborlight-dev-game-smoke.py')
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)
UID = 'dev-admin1'


def seed():
    saved = fixture.starter(777, 'Port admin1')
    for building in ['townhall', 'house', 'warehouse']:
        saved['buildings'][building]['level'] = 4
    saved['buildings']['farm']['ready'] = 17
    saved['statistics']['expeditions'] = 7
    saved['statistics']['upgrades'] = 12
    fixture.DOCUMENTS[UID] = {'payload': json.dumps(saved), 'revision': 5, 'updateTime': fixture.timestamp()}


def assert_history():
    saved = fixture.cloud_state(UID)
    assert saved['resources']['coins'] == 777
    assert saved['islandName'] == 'Port admin1'
    assert saved['population'] == 12
    assert saved['buildings']['townhall']['level'] == 4
    assert saved['buildings']['farm']['ready'] == 17
    assert saved['statistics']['expeditions'] == 7
    assert saved['statistics']['upgrades'] == 12


def auth_landing(route):
    # The login screen has its own acceptance. This scenario owns only the
    # logout navigation and removed session, not provider/legal form setup.
    route.fulfill(content_type='text/html', body='<!doctype html><title>Signed out</title>')


def delayed_signout(browser, language, mobile):
    seed()
    context, page = fixture.context(browser, UID, language=language, mobile=mobile)
    context.route(fixture.ORIGIN + '/harborlight-auth.html*', auth_landing)
    held = []
    armed = {'value': False}

    def firebase(route):
        if armed['value'] and route.request.method == 'POST' and not held:
            held.append(route)
            return
        fixture.firebase(route)

    context.route('https://firestore.googleapis.com/**', firebase)
    fixture.visit(page)
    fixture.settings(page)
    signout = page.locator('[data-settings-signout]')
    expect(signout).to_be_visible()
    expect(signout).to_have_text('Wyloguj się' if language == 'pl' else 'Sign out')
    expect(page.locator('[data-settings-legal] a')).to_have_count(2)
    expect(page.locator('[data-settings-legal] a').first).to_have_attribute('href', 'harborlight-terms.html')
    expect(page.locator('[data-settings-legal] a').last).to_have_attribute('href', 'harborlight-privacy.html')
    assert page.locator('[data-dev-signout]').count() == 1
    signout_box = signout.bounding_box()
    account_box = page.locator('[data-dev-account]').bounding_box()
    assert signout_box and account_box and signout_box['y'] < account_box['y'], 'Logout must be immediately visible above account details'

    # Keep an actual settings command awaiting its server acknowledgement, then
    # request logout. Authentication must stay until that pending write settles.
    armed['value'] = True
    new_language = 'en' if language == 'pl' else 'pl'
    page.locator('#island-dialog select').first.select_option(new_language)
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saving')
    page.locator('[data-settings-signout]').click()
    assert held and page.evaluate('(key)=>localStorage.getItem(key)', fixture.SESSION) is not None
    assert '/harborlight-v1-layered.html' in page.url
    assert_history()

    fixture.firebase(held[0])
    page.wait_for_url('**/harborlight-auth.html?mode=login')
    assert page.evaluate('(key)=>localStorage.getItem(key)', fixture.SESSION) is None
    assert fixture.cloud_state(UID)['settings']['language'] == new_language
    assert_history()
    fixture.no_island_cache(page)
    context.close()


def offline_signout(browser):
    seed()
    context, page = fixture.context(browser, UID)
    context.route(fixture.ORIGIN + '/harborlight-auth.html*', auth_landing)
    fixture.visit(page)
    fixture.settings(page)
    before = fixture.DOCUMENTS[UID]['payload']
    fixture.OFFLINE = True
    try:
        page.locator('[data-settings-signout]').click()
        page.wait_for_url('**/harborlight-auth.html?mode=login')
        assert page.evaluate('(key)=>localStorage.getItem(key)', fixture.SESSION) is None
        assert fixture.DOCUMENTS[UID]['payload'] == before
        assert_history()
        fixture.no_island_cache(page)
    finally:
        fixture.OFFLINE = False
        context.close()


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                     headless=True, args=['--no-sandbox'])
        try:
            delayed_signout(browser, 'pl', False)
            delayed_signout(browser, 'en', True)
            offline_signout(browser)
            assert not fixture.ERRORS, fixture.ERRORS
        finally:
            browser.close()
    print('PASS Settings logout: prominent PL/EN desktop/mobile button waits for pending cloud acknowledgement; offline logout preserves confirmed admin1 history; no island cache')


if __name__ == '__main__':
    run()
