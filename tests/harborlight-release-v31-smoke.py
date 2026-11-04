"""Actual v31 map, approved copy and recovery-friendly player navigation.

PL/EN desktop/mobile use isolated in-memory fixtures and the real layered game.
No account, payment, advertisement provider or deployed data is contacted.
"""
import importlib.util
import json
import os
import re
import subprocess
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('release_v31_base', SOURCE / 'tests/harborlight-release-v28-smoke.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
SCREENSHOTS = Path(os.environ.get('HARBORLIGHT_SCREENSHOT_DIR', '/tmp/harborlight-v31-map'))


def screen(page, name):
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SCREENSHOTS / (name + '.png')), full_page=True)


def menu_item(page, mobile, label):
    base.home(page, mobile)
    page.locator('#island-dialog').get_by_role('button', name=label, exact=True).click()


def next_to(page, step):
    tour = page.locator('[data-island-onboarding]')
    for _ in range(35):
        if tour.get_attribute('data-onboarding-step') == step:
            # The fixture clock is paused; allow real layout/camera frames.
            page.clock.run_for(200)
            return tour
        tour.locator('[data-onboarding-next]').click()
        page.clock.run_for(100)
    raise AssertionError('Tour did not reach ' + step)


def house_guide_fixture():
    # Earn the first thirteen lessons with the command runner used by the
    # curriculum suite. The regression needs lesson14 genuinely unresolved.
    code = """import {runTutorialV29} from './tests/helpers/tutorial-v29-course.mjs';
      import {act,recordVisit} from './harborlight-v1-state.js';
      import {tutorialRows} from './harborlight-v1-progression.js';
      const {state:s}=runTutorialV29({now:%d,through:13});
      s.islandName='Przystań testowa';
      s.buildings.lighthouse.level=1;s.lighthouseRemaining=3600;
      recordVisit(s,s.worldTimeMs);
      if(s.loyalty.pendingReward&&!s.loyalty.closed&&s.loyalty.lastClaimedDay!==s.loyalty.pendingDay)act(s,{type:'claimLoyalty'},s.worldTimeMs);
      act(s,{type:'learningUpdate',patch:{adsNotBeforeActiveSeconds:100000}},s.worldTimeMs);
      act(s,{type:'resumeTutorial'},s.worldTimeMs);
      const next=tutorialRows(s).find(r=>!r.completed);
      if(next?.id!=='personal-happiness'||next.index!==14)throw Error('Fixture is not on real lesson14');
      console.log(JSON.stringify(s));""" % base.NOW
    result = subprocess.run(['node', '--input-type=module', '-e', code],
                            cwd=SOURCE, text=True, capture_output=True, check=True)
    return json.loads(result.stdout)


def house_guide_scenario(browser, language, mobile):
    context, page, errors, external = base.new_page(browser, house_guide_fixture(), language, mobile)
    try:
        # A later independently finished construction may have its own earned
        # reward. Acknowledge it normally, then follow the active lesson onto
        # the map. Closing the course with X would intentionally pause guidance.
        for _ in range(25):
            reward = page.locator('[data-tutorial-achievement]')
            if reward.count() == 0:
                break
            reward.locator('[data-tutorial-skip]').click()
            page.clock.run_for(50)
        page.locator('[data-tutorial-go="personal-happiness"], [data-tutorial-visit="personal-happiness"]').click()
        page.clock.run_for(200)
        page.locator('#hit-world-house').click()
        expect(page.locator('[data-building-panel="house"]')).to_be_visible()
        page.clock.run_for(100)
        keep = page.locator('[data-house-save-points]')
        expect(keep).to_be_enabled()
        expect(page.locator('[data-house-everyone]')).to_be_disabled()
        expect(keep).to_have_class(re.compile(r'\btutorial-action-target\b'))
        expect(keep).to_have_attribute('aria-describedby', re.compile(r'\bisland-tutorial-pointer\b'))
        expect(page.locator('[data-tutorial-pointer]')).to_be_visible()
        assert not base.state_of(page)['tutorial']['completed'].get('personal-happiness')
        before = base.state_of(page)
        keep.click()
        page.wait_for_function('window.__HARBORLIGHT_DEV_STATE__.tutorial.completed["personal-happiness"] === true')
        after = base.state_of(page)
        assert after['houseHappinessPool']['points'] == before['houseHappinessPool']['points']
        # The course may grant its normal lesson reward immediately. Keeping
        # the bank must not consume anything; the ledger proves actual action.
        assert after['resources']['coins'] >= before['resources']['coins']
        base.clean(errors, external)
        print(json.dumps({'language': language, 'mobile': mobile,
                          'houseLesson14EnabledGuide': True, 'result': 'PASS'}), flush=True)
    finally:
        context.close()


def open_adventure_catalog(page, language, mobile):
    menu_item(page, mobile, 'Zadania' if language == 'pl' else 'Tasks')
    page.locator('[data-open-adventures]').click()
    page.locator('[data-adventure-all]').click()


def move_actual_marble(page, mobile):
    joystick = page.locator('[data-tilt-touch]')
    expect(joystick).to_be_visible()
    joystick.scroll_into_view_if_needed()
    bounds = joystick.bounding_box()
    assert bounds
    center = {'x': bounds['x'] + bounds['width'] * .5,
              'y': bounds['y'] + bounds['height'] * .5}
    tilted = {'x': bounds['x'] + bounds['width'] * .8,
              'y': bounds['y'] + bounds['height'] * .6}
    if mobile:
        touch = page.context.new_cdp_session(page)
        try:
            touch.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [center]})
            touch.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [tilted]})
            page.clock.run_for(700)
            touch.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        finally:
            touch.detach()
    else:
        page.mouse.move(center['x'], center['y'])
        page.mouse.down()
        page.mouse.move(tilted['x'], tilted['y'])
        page.clock.run_for(700)
        page.mouse.up()
    page.clock.run_for(400)


def saved_run(state, run_id):
    return next(run for run in state['adventures']['parked'].values() if run['id'] == run_id)


def journey_close_scenario(browser, language, mobile):
    context, page, errors, external = base.new_page(browser, base.fixture(level=20), language, mobile)
    try:
        for kind, selector in [('marble', '[data-puzzle-start="marbleMaze"]'),
                               ('story', '[data-story-start="merchant-rescue"]')]:
            open_adventure_catalog(page, language, mobile)
            page.locator(selector).first.click()
            before = base.state_of(page)['adventures']['active']
            assert before['data']['puzzle']['kind'] == 'marbleMaze'
            move_actual_marble(page, mobile)
            moved = base.state_of(page)['adventures']['active']
            assert moved['data']['puzzle']['data']['miniGame']['balls'] != before['data']['puzzle']['data']['miniGame']['balls'], (kind, 'Actual joystick did not move the ball')
            run_id = moved['id']

            # The window X goes through the host close path, rather than the
            # library's existing explicit Suspend action.
            page.locator('#island-dialog .dialog-close').click()
            closed = base.state_of(page)
            assert closed['adventures']['active'] is None, (kind, 'X left a hidden active journey')
            checkpoint = saved_run(closed, run_id)['data']['puzzle']
            clock = closed['adventures']['clock']
            page.clock.fast_forward(300000)
            waiting = base.state_of(page)
            assert waiting['adventures']['clock'] > clock, 'The island must keep running during this assertion'
            assert saved_run(waiting, run_id)['data']['puzzle'] == checkpoint, (kind, 'Hidden parked physics changed')
            base.clean(errors, external)

            # Reload the persisted state through a fresh real game bootstrap.
            # This isolated fixture checks normalization, not a deployed cloud.
            context.close()
            context, page, errors, external = base.new_page(browser, waiting, language, mobile)
            assert base.state_of(page)['adventures']['active'] is None
            assert saved_run(base.state_of(page), run_id)['data']['puzzle'] == checkpoint
            page.clock.fast_forward(10000)
            assert saved_run(base.state_of(page), run_id)['data']['puzzle'] == checkpoint
            open_adventure_catalog(page, language, mobile)
            resume = page.locator(selector).first
            expect(resume).to_contain_text('Wróć do przygody' if language == 'pl' else 'Resume adventure')
            resume.click()
            resumed = base.state_of(page)['adventures']['active']
            assert resumed['id'] == run_id
            assert resumed['data']['puzzle'] == checkpoint, (kind, 'Resume did not retain the same physical board')
            move_actual_marble(page, mobile)
            assert base.state_of(page)['adventures']['active']['data']['puzzle']['clock'] > checkpoint['clock']

            # Also cover the adventure header's Return to island button.
            page.locator('[data-adventure-close]').click()
            returned = base.state_of(page)
            assert returned['adventures']['active'] is None, (kind, 'Header return left a hidden active journey')
            second_checkpoint = saved_run(returned, run_id)['data']['puzzle']
            page.clock.fast_forward(300000)
            assert saved_run(base.state_of(page), run_id)['data']['puzzle'] == second_checkpoint
            base.clean(errors, external)
        print(json.dumps({'language': language, 'mobile': mobile,
                          'marbleAndStoryHostCloseResume': True, 'result': 'PASS'}), flush=True)
    finally:
        context.close()


def scenario(browser, language, mobile):
    initial = base.fixture(level=3)
    # Fixture setup: a built Lighthouse with its real global happiness effect.
    # Later actions use only the player controls; no browser state is injected.
    initial['buildings']['lighthouse']['level'] = 1
    initial['lighthouseRemaining'] = 3600
    initial['houseHappinessPool'] = {
        **initial.get('houseHappinessPool', {}), 'version': 2, 'points': 12,
        'portions': [{'points': 12, 'population': 12, 'day': '2026-11-02', 'legacy': False}]
    }
    context, page, errors, external = base.new_page(browser, initial, language, mobile)
    label = language + '-' + ('mobile' if mobile else 'desktop')
    try:
        main = page.locator('[data-theatre-map]')
        expect(main.locator('.theatre-map-building-image')).to_have_count(1)
        expect(main.locator('[data-theatre-scene-slot],.theatre-decoration')).to_have_count(0)
        assert page.locator('.theatre-courtyard-image').count() == 0
        geometry = main.evaluate('''node=>{
          const s=getComputedStyle(node),hit=document.getElementById('hit-world-theatre'),h=getComputedStyle(hit),q=getComputedStyle(document.getElementById('hit-world-quarry'));
          return {left:parseFloat(s.left),top:parseFloat(s.top),width:parseFloat(s.width),height:parseFloat(s.height),hit:{left:parseFloat(h.left),top:parseFloat(h.top),width:parseFloat(h.width),height:parseFloat(h.height)},quarry:{left:parseFloat(q.left),top:parseFloat(q.top),width:parseFloat(q.width),height:parseFloat(q.height)}};
        }''')
        assert [geometry[k] for k in ['left', 'top', 'width', 'height']] == [1075, 444, 114, 124], geometry
        assert geometry['hit'] == {'left': 1080, 'top': 450, 'width': 104, 'height': 112}, geometry
        assert geometry['top'] + geometry['height'] / 2 > geometry['quarry']['top'] + geometry['quarry']['height'] / 2, geometry
        assert geometry['left'] > 1000 and abs((geometry['left'] + 57) - (geometry['quarry']['left'] + geometry['quarry']['width'] / 2)) < 50, geometry

        page.locator('[data-mobile-control="tutorial"]' if mobile else '#hit-tutorial').click()
        page.locator('[data-help-tour-from-start]').click()
        tour = next_to(page, 'building-theatre')
        expect(tour.locator('[data-onboarding-title]')).to_have_text('Teatr' if language == 'pl' else 'Theatre')
        expect(page.locator('#hit-world-theatre')).to_be_visible()
        screen(page, label + '-theatre-position')
        next_to(page, 'producer-storage')
        face = page.locator('[data-production-penalty="farm"]')
        expect(face).to_be_visible()
        farm_box, face_box = page.locator('#hit-world-farm').bounding_box(), face.bounding_box()
        assert face_box and farm_box and face_box['y'] + face_box['height'] <= farm_box['y'] - .5, {'farm': farm_box, 'face': face_box}
        assert farm_box['x'] <= face_box['x'] + face_box['width'] / 2 <= farm_box['x'] + farm_box['width'], {'farm': farm_box, 'face': face_box}
        card_box = tour.locator('[data-onboarding-card]').bounding_box()
        assert card_box and (face_box['x'] + face_box['width'] <= card_box['x'] or
                             card_box['x'] + card_box['width'] <= face_box['x'] or
                             face_box['y'] + face_box['height'] <= card_box['y'] or
                             card_box['y'] + card_box['height'] <= face_box['y']), {'face': face_box, 'card': card_box}
        screen(page, label + '-farm-face')
        next_to(page, 'building-market')
        if language == 'pl':
            expect(tour).to_contain_text('Od 6 poziomu Ratusza')
            assert 'Od 6. poziomu' not in tour.inner_text()
        else:
            expect(tour).to_contain_text('From Town Hall level 6')
        tour.locator('[data-onboarding-exit]').click()
        page.locator('[data-close-tutorial-exit-reminder]').click()
        expect(page.locator('body')).not_to_have_attribute('data-tour-storage-demo', 'true')
        expect(page.locator('[data-production-penalty="farm"]')).to_have_count(0)

        # The courtyard remains behind its building and never decorates the map.
        menu_item(page, mobile, 'Teatr' if language == 'pl' else 'Theatre')
        panel = page.locator('[data-theatre-panel]')
        expect(panel).to_be_visible()
        expect(panel.locator('.theatre-courtyard-image').first).to_be_visible()
        assert main.locator('.theatre-courtyard-image,[data-theatre-scene-slot]').count() == 0
        assert panel.locator('.theatre-environment').evaluate('n=>parseFloat(getComputedStyle(n.querySelector("select")).fontSize)') >= 16
        assert page.locator('#island-dialog .dialog-body').evaluate('n=>n.scrollWidth<=n.clientWidth+2')

        base.building(page, language, mobile, 'lighthouse')
        purpose = page.locator('[data-building-panel="lighthouse"] [data-building-purpose="lighthouse"]')
        if language == 'pl':
            expect(purpose).to_contain_text('po powrocie ze zwiedzania otrzymają premię szczęścia')
        else:
            expect(purpose).to_contain_text('happiness')

        # All residents at100 may keep House points instead of a dead-end lesson.
        base.building(page, language, mobile, 'house')
        expect(page.locator('[data-house-everyone]')).to_be_disabled()
        keep = page.locator('[data-house-save-points]')
        expect(keep).to_be_visible()
        expect(keep).to_have_text('Zachowaj punkty na później' if language == 'pl' else 'Keep points for later')
        before = base.state_of(page)
        keep.click()
        after = base.state_of(page)
        assert after['houseHappinessPool']['points'] == before['houseHappinessPool']['points']
        assert after['resources']['coins'] == before['resources']['coins']

        # Three simultaneous directions: main progress, a story, a short activity.
        menu_item(page, mobile, 'Zadania' if language == 'pl' else 'Tasks')
        expect(page.locator('[data-sequential-mission]')).to_have_count(1)
        page.locator('[data-open-adventures]').click()
        adventures = page.locator('[data-adventures-panel]')
        expect(adventures).to_be_visible()
        expect(adventures.locator('[data-current-mission-choice]')).to_have_count(1)
        expect(adventures.locator('.adv-choices > .adv-choice')).to_have_count(3)
        expect(adventures.locator('[data-adventure-start]')).to_have_count(2)
        assert adventures.locator('[data-adventure-start]:not([disabled])').count() >= 1
        screen(page, label + '-three-directions')
        adventures.locator('[data-open-main-mission]').click()
        expect(page.locator('[data-sequential-mission]')).to_have_count(1)
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+2')
        assert not errors, errors
        assert not external, external
        print(json.dumps({'language': language, 'mobile': mobile, 'map': geometry,
                          'farmFaceAbove': True, 'copy': True, 'houseKeepPoints': True,
                          'threeDirections': True, 'result': 'PASS'}), flush=True)
    finally:
        context.close()


if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    scenario(browser, language, mobile)
                    house_guide_scenario(browser, language, mobile)
                    journey_close_scenario(browser, language, mobile)
        finally:
            browser.close()
    print('PASS v31 actual game: Theatre map relocation/private courtyard, raised Farm face, approved copy, keep House points and three activity directions; PL/EN desktop/mobile')
