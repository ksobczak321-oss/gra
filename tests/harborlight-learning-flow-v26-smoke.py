"""Real game/cloud learning flows, reloads and advertising protection.

Only Firebase REST responses are isolated. The actual game UI performs tour
navigation, pauses, resumes and lesson review. Earned lesson history is prepared
with successful model commands, never by injecting completion/reward flags.
The last scenario moves only the invitation clock to its one-second boundary;
this avoids an hour-long test while retaining the saved deadline from a real X.
"""
import importlib.util
import json
import os
from pathlib import Path
import subprocess

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('learning_v26_cloud', ROOT / 'tests/harborlight-dev-game-smoke.py')
cloud = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cloud)
UID = 'dev-admin2'


def world(*, introduction=False, earned=False, due=False):
    code = '''import {createState,act} from './harborlight-v1-state.js';
      import {tutorialRows} from './harborlight-v1-progression.js';
      const state=createState(%d,{onboarding:%s});
      const run=action=>{const result=act(state,action,state.worldTimeMs);if(!result.ok)throw Error(JSON.stringify({action,result}));};
      if(%s){
        for(let i=0;i<6;i++)run({type:'assign',building:'warehouse',delta:1});
        const id=tutorialRows(state)[0].id;
        run({type:'claimTutorial',taskId:id});run({type:'skipTutorialShare',taskId:id});
      }
      state.tutorial.autoOpenDisabled=%s;state.resources.coins=777;
      if(!%s)state.islandName='Zapisana wyspa';
      if(%s){
        state.engagementSchedule.activeSeconds=600;
        state.engagementSchedule.initialAt=240;
        state.engagementSchedule.initialCompleted=false;
        state.engagementSchedule.initialAnchored=false;
        state.engagementSchedule.pending={id:'engagement-1',kind:'initial-ad',sequence:1,started:false,choice:null,runId:null};
      }
      console.log(JSON.stringify(state));''' % (int(cloud.NOW.timestamp() * 1000), json.dumps(introduction), json.dumps(earned), json.dumps(not introduction), json.dumps(introduction), json.dumps(due))
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT, text=True, capture_output=True, check=True).stdout)


def seed(state):
    cloud.DOCUMENTS[UID] = {'payload': json.dumps(state), 'revision': 7, 'updateTime': cloud.timestamp()}


def visit(page):
    assert page.goto(cloud.ORIGIN + '/harborlight-v1-layered.html?profile=new-player').ok
    page.wait_for_function('document.getElementById("loading").hidden')


def saved(page):
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    return cloud.cloud_state(UID)


def flush_pagehide(page):
    # The game deliberately queues the post-onboarding visit for its normal
    # autosave. A real pagehide is also a supported immediate flush path.
    page.evaluate('window.dispatchEvent(new Event("pagehide"))')
    return saved(page)


def help_panel(page):
    page.locator('[data-mobile-control="tutorial"]' if page.viewport_size['width'] < 901 else '#hit-tutorial').click()
    expect(page.locator('[data-help-panel]')).to_be_visible()
    expect(page.locator('[data-help-panel] button')).to_have_count(2)


def dismiss_tour_reminder(page):
    expect(page.locator('[data-tutorial-exit-reminder]')).to_be_visible()
    page.locator('[data-close-tutorial-exit-reminder]').click()


def history(state):
    tutorial = state['tutorial']
    return {key: tutorial.get(key) for key in ['completed', 'claimed', 'chests', 'skippedLessons', 'actionLedger']}


def no_offer(page):
    expect(page.locator('#engagement-choice, #rewarded-ad')).to_have_count(0)


def replay_roundtrip(browser, mobile):
    initial = world(earned=True)
    initial['learning']['tour'].update({'index': 3, 'paused': True})
    before = history(initial)
    seed(initial)
    context, page = cloud.context(browser, UID, mobile=mobile)
    try:
        visit(page)
        help_panel(page)
        page.locator('[data-help-return-tour]').click()
        tour = page.locator('[data-onboarding-replay="true"]')
        expect(tour).to_have_attribute('data-onboarding-step', 'coins')
        tour.locator('[data-onboarding-next]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'working')
        active = saved(page)
        assert active['learning']['tour']['index'] == 4 and active['learning']['tour']['active']
        page.reload()
        page.wait_for_function('document.getElementById("loading").hidden')
        expect(tour).to_have_attribute('data-onboarding-step', 'working')
        tour.locator('[data-onboarding-exit]').click()
        expect(tour).to_have_count(0)
        dismiss_tour_reminder(page)
        paused = saved(page)
        assert paused['learning']['tour']['index'] == 4 and paused['learning']['tour']['paused']
        assert not paused['learning']['tour']['active']
        page.reload()
        page.wait_for_function('document.getElementById("loading").hidden')
        expect(tour).to_have_count(0)
        help_panel(page)
        page.locator('[data-help-return-tour]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'working')
        tour.locator('[data-onboarding-exit]').click()
        dismiss_tour_reminder(page)
        help_panel(page)
        page.locator('[data-help-return-tour]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'working')
        tour.locator('[data-onboarding-restart]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'home')
        page.clock.run_for(31_000)
        running = saved(page)
        assert running['worldTimeMs'] > initial['worldTimeMs'], 'Replay paused a started island'
        assert running['islandName'] == initial['islandName']
        assert running['islandGeneration'] == initial['islandGeneration']
        assert history(running) == before, 'Tour replay reset or awarded practical lessons'
        tour.locator('[data-onboarding-exit]').click()
        dismiss_tour_reminder(page)
        cloud.no_island_cache(page)
    finally:
        context.close()


def review_roundtrip(browser, mobile):
    initial = world(earned=True, due=True)
    before = history(initial)
    seed(initial)
    context, page = cloud.context(browser, UID, mobile=mobile)
    try:
        # A due invitation must not race Help before the review is opened.
        initial['learning']['adsNotBeforeActiveSeconds'] = 601
        seed(initial)
        visit(page)
        help_panel(page)
        page.locator('[data-help-return-lessons]').click()
        page.locator('[data-tutorial-review-from-start]').first.click()
        review = page.locator('[data-tutorial-instructions-review]')
        expect(review).to_have_attribute('data-tutorial-review-index', '0')
        for index in range(1, 4):
            review.locator('[data-tutorial-review-next]').click()
            expect(review).to_have_attribute('data-tutorial-review-index', str(index))
        page.clock.run_for(3_000)
        no_offer(page)
        active = saved(page)
        assert active['learning']['practical']['reviewIndex'] == 3
        assert active['learning']['practical']['reviewActive']
        page.reload()
        page.wait_for_function('document.getElementById("loading").hidden')
        expect(review).to_have_attribute('data-tutorial-review-index', '3')
        no_offer(page)
        review.locator('[data-tutorial-review-exit]').click()
        expect(review).to_be_hidden()
        expect(page.locator('#island-dialog')).not_to_have_attribute('open', '')
        paused = saved(page)
        assert paused['learning']['practical']['reviewPaused']
        assert paused['learning']['practical']['reviewIndex'] == 3
        assert not paused['learning']['practical']['reviewActive']
        assert paused['learning']['adsNotBeforeActiveSeconds'] - paused['engagementSchedule']['activeSeconds'] >= 3599
        help_panel(page)
        page.locator('[data-help-return-lessons]').click()
        expect(review).to_have_attribute('data-tutorial-review-index', '3')
        review.locator('[data-tutorial-review-next]').click()
        expect(review).to_have_attribute('data-tutorial-review-index', '4')
        page.locator('#island-dialog .dialog-close').click()
        paused_outer = saved(page)
        assert paused_outer['learning']['practical']['reviewPaused']
        assert paused_outer['learning']['practical']['reviewIndex'] == 4
        assert history(paused_outer) == before, 'Instruction review changed earned lesson history'
        help_panel(page)
        page.locator('[data-help-return-lessons]').click()
        expect(review).to_have_attribute('data-tutorial-review-index', '4')
        review.locator('[data-tutorial-review-to-practical]').click()
        expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'happiness-action')
        expect(page.locator('[data-tutorial-instructions-review]')).to_have_count(0)
        no_offer(page)
        assert history(saved(page)) == before, 'Resuming practical lessons reset their history'
        cloud.no_island_cache(page)
    finally:
        context.close()


def initial_pause_and_ads(browser):
    initial = world(introduction=True, due=True)
    seed(initial)
    context, page = cloud.context(browser, UID)
    try:
        visit(page)
        tour = page.locator('[data-island-onboarding]')
        expect(tour).to_have_attribute('data-onboarding-stage', 'intro')
        page.clock.run_for(3_000)
        assert saved(page)['worldTimeMs'] == initial['worldTimeMs']
        no_offer(page)
        tour.locator('[data-onboarding-next]').click()
        tour.locator('[data-onboarding-name]').fill('Moja przystań')
        tour.locator('[data-onboarding-next]').click()
        for step in ['level', 'happiness']:
            tour.locator('[data-onboarding-next]').click()
            expect(tour).to_have_attribute('data-onboarding-step', step)
        tour.locator('[data-onboarding-exit]').click()
        expect(tour).to_have_count(0)
        dismiss_tour_reminder(page)
        expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'island-map')
        started = flush_pagehide(page)
        assert started['onboarding']['worldStartedAt'] is not None
        assert started['learning']['tour']['paused'] and started['learning']['tour']['index'] == 2
        assert started['learning']['adsNotBeforeActiveSeconds'] - started['engagementSchedule']['activeSeconds'] >= 3599
        page.clock.run_for(31_000)
        no_offer(page)
        assert saved(page)['worldTimeMs'] > started['worldTimeMs'], 'X did not start the new world clock'
        page.locator('#island-dialog .dialog-close').click()
        closed = saved(page)
        assert closed['tutorial']['autoOpenDisabled']
        deadline = closed['learning']['adsNotBeforeActiveSeconds']
        assert deadline - closed['engagementSchedule']['activeSeconds'] >= 3599
        page.clock.run_for(3_000)
        no_offer(page)
        page.reload()
        page.wait_for_function('document.getElementById("loading").hidden')
        no_offer(page)
        after_reload = flush_pagehide(page)
        assert after_reload['learning']['adsNotBeforeActiveSeconds'] == deadline
        # Keep the deadline written by the real X. Move only its active-time
        # clock to one second before expiry and reload the real game renderer.
        boundary = cloud.cloud_state(UID)
        boundary['engagementSchedule']['activeSeconds'] = deadline - 1
        cloud.DOCUMENTS[UID]['payload'] = json.dumps(boundary)
        cloud.DOCUMENTS[UID]['revision'] += 1
        cloud.DOCUMENTS[UID]['updateTime'] = cloud.timestamp()
        page.reload()
        page.wait_for_function('document.getElementById("loading").hidden')
        no_offer(page)
        page.clock.run_for(2_000)
        expect(page.locator('#engagement-choice')).to_be_visible()
        expect(page.locator('[data-engagement-ad]')).to_be_visible()
        page.locator('[data-engagement-skip]').click()
        cloud.no_island_cache(page)
    finally:
        context.close()


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            for mobile in [False, True]:
                replay_roundtrip(browser, mobile)
                review_roundtrip(browser, mobile)
            initial_pause_and_ads(browser)
            assert not cloud.ERRORS, cloud.ERRORS
        finally:
            browser.close()
    print('PASS learning game flow: cloud active/paused cursors, fresh-X clock start,25lesson read-only review, preserved history, ads suppressed and one-hour active cooldown')


if __name__ == '__main__':
    run()
