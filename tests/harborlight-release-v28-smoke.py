"""Real v28 UI acceptance, with isolated in-memory worlds and local assets.

The four language/viewport combinations never contact Firebase, Paynow or an
advertising provider. The story fixture earns all 25 lessons through the real
course commands. A fresh context round-trip tests persisted offer markers; it
does not claim to test real cloud deployment or cloud autosave.
"""
from datetime import datetime, timezone
import argparse
import json
import mimetypes
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
ORIGIN = 'http://127.0.0.1:47382'
NOW = int(datetime(2026, 11, 2, 12, tzinfo=timezone.utc).timestamp() * 1000)
SCREENSHOTS = Path(os.environ.get('HARBORLIGHT_SCREENSHOT_DIR', '/tmp/harborlight-v28-browser'))


def fixture(*, level=3, loyalty=False, course=False):
    code = """import {createState,act,recordVisit} from './harborlight-v1-state.js';
      import {runTutorialV28} from './tests/helpers/tutorial-v28-course.mjs';
      import {advanceEngagementSchedule} from './harborlight-v1-engagement.js';
      const state=%s ? runTutorialV28({now:%d}).state : createState(%d);
      const run=action=>{const result=act(state,action,state.worldTimeMs);if(!result.ok)throw Error(JSON.stringify({action,result}));};
      state.islandName='Przystań testowa';
      if(!%s){state.buildings.townhall.level=%d;state.capacity=%d*24;state.resources.coins=10000;}
      run({type:'dismissTutorial'});
      recordVisit(state,state.worldTimeMs);
      if(!%s && state.loyalty.pendingReward && !state.loyalty.closed && state.loyalty.lastClaimedDay!==state.loyalty.pendingDay)run({type:'claimLoyalty'});
      run({type:'learningUpdate',patch:{adsNotBeforeActiveSeconds:%d}});
      if(%s)advanceEngagementSchedule(state,600,{visible:true,focused:true});
      console.log(JSON.stringify(state));""" % (json.dumps(course), NOW, NOW, json.dumps(course), level, level, json.dumps(loyalty), 0 if course else 100000, json.dumps(course))
    result = subprocess.run(['node', '--input-type=module', '-e', code], cwd=SOURCE,
                            text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def new_page(browser, state, language, mobile):
    context = browser.new_context(viewport={'width': 390 if mobile else 1366,
                                            'height': 844 if mobile else 900},
                                  is_mobile=mobile, has_touch=mobile, reduced_motion='reduce')
    errors, external = [], []

    def asset(route):
        request = route.request
        if not request.url.startswith(ORIGIN + '/'):
            external.append(request.url)
            return route.abort('blockedbyclient')
        target = (ROOT / unquote(urlsplit(request.url).path).lstrip('/')).resolve()
        if not target.is_relative_to(ROOT) or not target.is_file():
            return route.fulfill(status=404, body='Missing isolated fixture asset')
        return route.fulfill(body=target.read_bytes(),
                             content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')

    context.route('**/*', asset)
    context.add_init_script('window.__HARBORLIGHT_DEV_FIXTURE__=%s;localStorage.setItem("harborlight-language",%s);' %
                            (json.dumps(state), json.dumps(language)))
    page = context.new_page()
    page.set_default_timeout(10000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    now = datetime.fromtimestamp(state['worldTimeMs'] / 1000, tz=timezone.utc)
    page.clock.install(time=now)
    page.clock.pause_at(now)
    assert page.goto(ORIGIN + '/harborlight-v1-layered.html?profile=new-player').ok
    page.wait_for_function('window.__HARBORLIGHT_DEV_STATE__ !== undefined && document.getElementById("loading").hidden')
    return context, page, errors, external


def state_of(page):
    return page.evaluate('window.__HARBORLIGHT_DEV_STATE__')


def clean(errors, external):
    assert not errors, errors
    assert not external, external


def close_panel(page):
    if page.locator('#island-dialog[open]').count():
        page.locator('#island-dialog .dialog-close').click()


def home(page, mobile):
    close_panel(page)
    page.locator('[data-mobile-control="home"]' if mobile else '#hit-home').click()
    expect(page.locator('#island-dialog')).to_be_visible()


def premium(page, language, mobile):
    home(page, mobile)
    page.locator('#island-dialog').get_by_role('button', name='Opcje premium' if language == 'pl' else 'Premium options', exact=True).click()
    expect(page.locator('[data-paynow-checkout]')).to_be_visible()


def building(page, language, mobile, identity):
    home(page, mobile)
    page.locator('#island-dialog').get_by_role('button', name='Budynki' if language == 'pl' else 'Buildings', exact=True).click()
    page.locator('[data-building-purpose="%s"]' % identity).locator('..').get_by_role('button').click()
    expect(page.locator('[data-building-panel="%s"]' % identity)).to_be_visible()


def screenshot(page, name):
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SCREENSHOTS / (name + '.png')), full_page=True)


def ui_scenario(browser, language, mobile):
    context, page, errors, external = new_page(browser, fixture(), language, mobile)
    label = '%s-%s' % (language, 'mobile' if mobile else 'desktop')
    try:
        expect(page.locator('#hit-clock,[data-mobile-control="clock"],[data-mobile-hud="clock"]')).to_have_count(0)
        heading = page.locator('.mobile-hud-brand' if mobile else '[data-island-name]')
        expect(heading).to_contain_text('Przystań testowa')
        assert heading.evaluate('node=>parseFloat(getComputedStyle(node).fontSize)') == 19
        if not mobile:
            brand = page.locator('#hit-home')
            assert brand.evaluate('node=>parseFloat(getComputedStyle(node).fontSize)') == 19
        happiness = page.locator('[data-mobile-hud="happiness"]' if mobile else '[data-hud="happiness"]')
        if language == 'pl':
            expect(happiness).to_contain_text(re.compile(r'punkt|pkt'))
            assert not re.search(r'%|p\.\s*p\.', happiness.inner_text())
        happiness_geometry = happiness.evaluate('node=>({width:node.clientWidth,scroll:node.scrollWidth,height:node.clientHeight,scrollHeight:node.scrollHeight,overflowY:getComputedStyle(node).overflowY})')
        assert happiness_geometry['scroll'] <= happiness_geometry['width'] + 1, happiness_geometry
        assert happiness_geometry['overflowY'] == 'visible' or happiness_geometry['scrollHeight'] <= happiness_geometry['height'] + 1, happiness_geometry

        page.locator('[data-mobile-control="tutorial"]' if mobile else '#hit-tutorial').click()
        help_panel = page.locator('[data-help-panel]')
        expect(help_panel.locator('.help-learning-grid > .info-card')).to_have_count(2)
        for selector in ['[data-help-return-tour]', '[data-help-return-lessons]',
                         '[data-help-tour-from-start]', '[data-help-lessons-from-start]']:
            expect(help_panel.locator(selector)).to_be_visible()
        expect(help_panel).to_contain_text('25')
        screenshot(page, label + '-help')
        help_panel.locator('[data-help-tour-from-start]').click()
        tour = page.locator('[data-island-onboarding]')
        expect(tour.locator('[data-onboarding-counter]')).to_contain_text('1 z 33' if language == 'pl' else '1 of 33')
        expect(tour).to_have_attribute('data-onboarding-step', 'home')
        tour.locator('[data-onboarding-next]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'level')
        tour.locator('[data-onboarding-exit]').click()
        expect(tour).to_have_count(0)
        reminder = page.locator('[data-tutorial-exit-reminder]')
        expect(reminder).to_be_visible()
        expect(reminder).to_contain_text('? → Wznów tutorial' if language == 'pl' else '? → Resume tutorial')
        expect(page.locator('[data-mobile-control="tutorial"]' if mobile else '#hit-tutorial')).to_have_class(re.compile(r'learning-help-highlight'))
        page.locator('[data-close-tutorial-exit-reminder]').click()
        page.locator('[data-mobile-control="tutorial"]' if mobile else '#hit-tutorial').click()
        page.locator('[data-help-return-tour]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'level')
        tour.locator('[data-onboarding-exit]').click()
        page.locator('[data-close-tutorial-exit-reminder]').click()

        building(page, language, mobile, 'house')
        expect(page.locator('[data-house-everyone]')).to_be_visible()
        expect(page.locator('[data-house-allocate]')).to_have_count(0)
        expect(page.locator('[data-prayer-resident]')).to_be_visible()
        expect(page.locator('[data-prayer-start]')).to_be_enabled()
        expect(page.locator('[data-prayer-quote]')).to_contain_text('30')
        prayer_before = state_of(page)
        person_id = int(page.locator('[data-prayer-resident]').input_value())
        page.locator('[data-prayer-start]').click()
        prayer_after = state_of(page)
        person = next(person for person in prayer_after['residents'] if person['id'] == person_id)
        assert person['prayerRemaining'] == 1800, person
        assert prayer_after['resources']['coins'] == prayer_before['resources']['coins'] - 30
        if language == 'pl':
            for value in page.locator('[data-resident-value]').all_inner_texts():
                assert not re.search(r'%|p\.\s*p\.', value), value
        screenshot(page, label + '-house-prayer')

        building(page, language, mobile, 'townhall')
        expect(page.locator('[data-paynow-kind="building"],[data-paynow-kind="transport"]')).to_have_count(0)
        page.locator('[data-building-more="townhall"]').click()
        page.locator('[data-share-level="3"]').click()
        expect(page.locator('[data-close-share]')).to_have_text('Wróć na wyspę' if language == 'pl' else 'Back to island')
        if language == 'pl':
            assert 'to island' not in page.locator('#milestone-share').inner_text()
        page.locator('[data-close-share]').click()

        premium(page, language, mobile)
        expect(page.locator('[data-paynow-checkout]')).to_be_enabled()
        expect(page.locator('[data-paynow-kind]:not([data-paynow-kind="coins"])')).to_have_count(0)
        page.locator('[data-paynow-checkout]').click()
        checkout = page.locator('#paynow-checkout')
        expect(checkout).to_contain_text('SYMULACJA — bez pobrania pieniędzy' if language == 'pl' else 'SIMULATION — no money will be charged')
        actions = checkout.locator('.flow-actions')
        assert actions.evaluate('node=>parseFloat(getComputedStyle(node).gap)') >= 24
        first, second = actions.locator('button').all()
        a, b = first.bounding_box(), second.bounding_box()
        assert a and b
        if mobile:
            assert b['y'] - a['y'] - a['height'] >= 23, (a, b)
        else:
            assert b['x'] - a['x'] - a['width'] >= 23, (a, b)
        for box in [a, b]:
            assert box['x'] >= 0 and box['x'] + box['width'] <= page.viewport_size['width'] + 1, box
        screenshot(page, label + '-paynow')
        coins = state_of(page)['resources']['coins']
        page.locator('[data-confirm-simulated-payment]').click()
        expect(checkout).to_have_count(0)
        assert state_of(page)['resources']['coins'] > coins
        clean(errors, external)
    finally:
        context.close()


def topup_gates(browser, language, mobile):
    for level in [1, 2]:
        context, page, errors, external = new_page(browser, fixture(level=level), language, mobile)
        try:
            premium(page, language, mobile)
            expect(page.locator('[data-paynow-checkout]')).to_be_disabled()
            expect(page.locator('#paynow-checkout')).to_have_count(0)
            expect(page.locator('[data-construction-package]')).to_be_enabled()
            expect(page.locator('[data-paynow-kind]:not([data-paynow-kind="coins"])')).to_have_count(0)
            clean(errors, external)
        finally:
            context.close()


def loyalty_scenario(browser, language, mobile):
    initial = fixture(level=1, loyalty=True)
    context, page, errors, external = new_page(browser, initial, language, mobile)
    try:
        offer = page.locator('#daily-loyalty-offer')
        expect(offer).to_be_visible()
        expect(offer.locator('[data-loyalty-claim]')).to_be_enabled()
        expect(offer.locator('[data-loyalty-close]')).to_be_visible()
        before = state_of(page)
        assert len([n for n in before['notifications'] if n['kind'] == 'loyalty-available']) == 1
        if language == 'pl':
            assert 'Daily login reward available' not in offer.inner_text()
        screenshot(page, '%s-%s-loyalty' % (language, 'mobile' if mobile else 'desktop'))
        page.locator('[data-loyalty-claim]').click()
        expect(offer).to_have_count(0)
        after = state_of(page)
        assert after['resources']['coins'] > before['resources']['coins']
        assert after['loyalty']['lastOfferDay'] == after['loyalty']['pendingDay']
        assert after['loyalty']['lastClaimedDay'] == after['loyalty']['pendingDay']
        close_panel(page)
        page.locator('[data-mobile-control="notifications"]' if mobile else '#hit-notifications').click()
        expect(page.locator('#island-dialog')).to_contain_text(re.compile(r'logowani', re.I) if language == 'pl' else 'Daily login reward available')
        if language == 'pl':
            assert 'Daily login reward available' not in page.locator('#island-dialog').inner_text()
        clean(errors, external)
    finally:
        context.close()
    # An acknowledged but unclaimed offer can be postponed. It must not pop up
    # again, and Notifications must still provide its actual collect action.
    context, page, errors, external = new_page(browser, before, language, mobile)
    try:
        page.clock.run_for(1100)
        expect(page.locator('#daily-loyalty-offer')).to_have_count(0)
        assert state_of(page)['resources']['coins'] == before['resources']['coins']
        page.locator('[data-mobile-control="notifications"]' if mobile else '#hit-notifications').click()
        deferred_claim = page.locator('[data-notification-claim-loyalty]')
        expect(deferred_claim).to_be_enabled()
        deferred_claim.click()
        expect(deferred_claim).to_have_count(0)
        deferred = state_of(page)
        assert deferred['loyalty']['receivedRewards'] == after['loyalty']['receivedRewards']
        clean(errors, external)
    finally:
        context.close()
    # Re-open the model's acknowledged snapshot in a fresh browser context:
    # normalization and the next login must not repeat today's offer/message.
    context, page, errors, external = new_page(browser, after, language, mobile)
    try:
        page.clock.run_for(1100)
        expect(page.locator('#daily-loyalty-offer')).to_have_count(0)
        reopened = state_of(page)
        assert len([n for n in reopened['notifications'] if n['kind'] == 'loyalty-available']) == 1
        assert reopened['loyalty']['receivedRewards'] == after['loyalty']['receivedRewards']
        clean(errors, external)
    finally:
        context.close()


def story_scenario(browser, language, mobile):
    course = fixture(course=True)
    assert len(course['tutorial']['claimed']) == 25
    assert course['engagementSchedule']['pending'], 'Story fixture must have a real due invitation to test popup priority'
    context, page, errors, external = new_page(browser, course, language, mobile)
    try:
        intro = page.locator('#lighthouse-story-intro')
        expect(intro).to_be_visible()
        expect(intro.locator('[data-story-task]')).to_be_enabled()
        expect(intro.locator('[data-story-close]')).to_be_visible()
        expect(intro).to_contain_text(re.compile(r'osiem|ośmiu|8', re.I) if language == 'pl' else re.compile(r'eight|8', re.I))
        expect(page.locator('#engagement-choice,#rewarded-ad')).to_have_count(0)
        screenshot(page, '%s-%s-story' % (language, 'mobile' if mobile else 'desktop'))
        intro.locator('[data-story-task]').click()
        expect(intro).to_have_count(0)
        expect(page.locator('#island-dialog')).to_have_attribute('data-panel-kind', 'tasks')
        expect(page.locator('#engagement-choice,#rewarded-ad')).to_have_count(0)
        after = state_of(page)
        assert after['tutorial']['claimed'] == course['tutorial']['claimed']
        clean(errors, external)
    finally:
        context.close()
    context, page, errors, external = new_page(browser, after, language, mobile)
    try:
        page.clock.run_for(1100)
        expect(page.locator('#lighthouse-story-intro')).to_have_count(0)
        clean(errors, external)
    finally:
        context.close()


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--language', choices=['pl', 'en'])
    parser.add_argument('--viewport', choices=['desktop', 'mobile'])
    parser.add_argument('--case', choices=['ui', 'topup', 'loyalty', 'story'])
    options = parser.parse_args()
    cases = {'ui': ui_scenario, 'topup': topup_gates, 'loyalty': loyalty_scenario, 'story': story_scenario}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                     headless=True, args=['--no-sandbox'])
        try:
            for language in [options.language] if options.language else ['pl', 'en']:
                for mobile in [options.viewport == 'mobile'] if options.viewport else [False, True]:
                    for action in [cases[options.case]] if options.case else cases.values():
                        action(browser, language, mobile)
                    print('PASS v28 release UI: %s %s' % (language, 'mobile' if mobile else 'desktop'), flush=True)
        finally:
            browser.close()
    print('PASS isolated v28 acceptance; screenshots: %s' % SCREENSHOTS)


if __name__ == '__main__':
    run()
