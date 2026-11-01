"""Real cloud/UI acceptance of the v27 tutorial and practical-course changes.

Firebase REST is isolated; the game, world timers, model actions and UI are real.
Construction fixtures are earned through the actual course helper, including
resource deliveries, the Lighthouse task and the solved/cashed-out minigame.
No account, world, reward or construction-completion flags are fabricated.
"""
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('learning_v27_cloud', SOURCE / 'tests/harborlight-dev-game-smoke.py')
cloud = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cloud)
UID = 'dev-admin2'


def world(*, through=0, resource_tour=False):
    code = '''import {createState,act,advanceTo} from './harborlight-v1-state.js';
      import {grantBonusMaterials} from './harborlight-v1-inventory.js';
      import {runTutorialV26} from './tests/helpers/tutorial-v26-course.mjs';
      const state=%s ? runTutorialV26({now:1793527200000,through:%d}).state : createState(1793527200000);
      const run=action=>{const result=act(state,action,state.worldTimeMs);if(!result.ok)throw Error(JSON.stringify({action,result}));};
      state.islandName='Przystań testowa';
      if(%s){
        grantBonusMaterials(state,{stone:23});
        run({type:'assign',building:'quarry',delta:1});
        advanceTo(state,state.worldTimeMs+120000);
        run({type:'dismissTutorial'});
        run({type:'learningUpdate',patch:{tour:{index:25,active:false,paused:true},adsNotBeforeActiveSeconds:100000}});
      }else{
        run({type:'learningUpdate',patch:{adsNotBeforeActiveSeconds:100000}});
      }
      console.log(JSON.stringify(state));''' % (json.dumps(through > 0), through, json.dumps(resource_tour))
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', code], cwd=SOURCE,
                                    text=True, capture_output=True, check=True).stdout)


def seed(state):
    cloud.NOW = datetime.fromtimestamp(state['worldTimeMs'] / 1000, tz=timezone.utc)
    cloud.DOCUMENTS[UID] = {'payload': json.dumps(state), 'revision': 7, 'updateTime': cloud.timestamp()}


def visit(page):
    assert page.goto(cloud.ORIGIN + '/harborlight-v1-layered.html?profile=new-player').ok
    page.wait_for_function('document.getElementById("loading").hidden')


def saved(page):
    page.evaluate('window.dispatchEvent(new Event("pagehide"))')
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    return cloud.cloud_state(UID)


def help_panel(page, mobile):
    page.locator('[data-mobile-control="tutorial"]' if mobile else '#hit-tutorial').click()
    panel = page.locator('[data-help-panel]')
    expect(panel).to_be_visible()
    expect(panel.locator('button')).to_have_count(2)
    expect(panel.locator('[data-help-return-lessons]')).to_be_visible()
    expect(panel.locator('[data-help-return-tour]')).to_be_visible()
    return panel


def no_offer(page):
    expect(page.locator('#engagement-choice, #rewarded-ad')).to_have_count(0)


def lesson_history(state):
    tutorial = state['tutorial']
    return {key: tutorial.get(key) for key in ['completed', 'claimed', 'chests', 'skippedLessons']}


def close_tour(page, language):
    page.locator('[data-onboarding-exit]').click()
    expect(page.locator('[data-island-onboarding]')).to_have_count(0)
    reminder = page.locator('[data-tutorial-exit-reminder]')
    expect(reminder).to_be_visible()
    expect(reminder).to_contain_text('? → Wznów tutorial' if language == 'pl' else '? → Resume tutorial')
    expect(reminder).to_contain_text('Twoja wyspa działa dalej.' if language == 'pl' else 'Your island keeps running.')
    page.locator('[data-close-tutorial-exit-reminder]').click()


def tour_and_help(browser, language, mobile):
    initial = world(resource_tour=True)
    before = lesson_history(initial)
    seed(initial)
    context, page = cloud.context(browser, UID, language=language, mobile=mobile)
    try:
        visit(page)
        # Island overview contains neither of the two displaced entry points.
        page.locator('[data-mobile-control="home"]' if mobile else '#hit-home').click()
        overview = page.locator('#island-dialog')
        expect(overview.get_by_role('button', name=re.compile(r'^(Pomoc|Help|Samouczek|Tutorial)$'))).to_have_count(0)
        overview.locator('.dialog-close').click()
        help_panel(page, mobile).locator('[data-help-return-tour]').click()
        tour = page.locator('[data-island-onboarding]')
        expect(tour).to_have_attribute('data-onboarding-step', 'category-economy')
        expect(tour.locator('[data-onboarding-counter]')).to_contain_text('34')
        # The tour was created before production below. T27 must resolve live
        # numbers when entered, while this already-started world keeps running.
        page.clock.run_for(240_000)
        no_offer(page)
        running = saved(page)
        assert running['worldTimeMs'] > initial['worldTimeMs']
        local = int(running['buildings']['quarry'].get('ready', 0))
        assert local > int(initial['buildings']['quarry'].get('ready', 0)), 'Actual quarry production did not advance'
        central = int(running['resources']['stone'])
        tour.locator('[data-onboarding-next]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'category-resources')
        expect(page.locator('#island-onboarding-description')).to_contain_text(
            ('Kamień' if language == 'pl' else 'Stone') + f' {local} / {central} (0)')
        # All later steps, including the added chat explanation, are reachable.
        sequence = ['category-decorations', 'category-paths', 'tutorial', 'chat', 'notifications', 'settings', 'menu']
        for step in sequence:
            tour.locator('[data-onboarding-next]').click()
            expect(tour).to_have_attribute('data-onboarding-step', step)
            if step == 'chat':
                expect(page.locator('#island-onboarding-description')).to_contain_text(
                    'rozmawiać online z innymi graczami' if language == 'pl' else 'chat online with other players')
        close_tour(page, language)
        paused = saved(page)
        assert paused['learning']['tour']['paused'] and paused['learning']['tour']['index'] == 33
        assert lesson_history(paused) == before, 'Screen explanations changed practical lesson rewards'
        page.reload()
        page.wait_for_function('document.getElementById("loading").hidden')
        help_panel(page, mobile).locator('[data-help-return-tour]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'menu')
        tour.locator('[data-onboarding-restart]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'home')
        assert saved(page)['learning']['tour']['index'] == 0
        close_tour(page, language)
        assert lesson_history(saved(page)) == before
        cloud.no_island_cache(page)
    finally:
        context.close()


def practical_review(browser, language, mobile):
    initial = world(through=1)
    seed(initial)
    before = lesson_history(initial)
    context, page = cloud.context(browser, UID, language=language, mobile=mobile)
    try:
        visit(page)
        # Real first lesson is already earned; instruction review must neither
        # award it again nor skip the next practical priority-setting action.
        expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'happiness-action')
        page.locator('[data-tutorial-review-from-start]').first.click()
        review = page.locator('[data-tutorial-instructions-review]')
        expect(review).to_have_attribute('data-tutorial-review-index', '0')
        for index in range(1, 4):
            review.locator('[data-tutorial-review-next]').click()
            expect(review).to_have_attribute('data-tutorial-review-index', str(index))
        review.locator('[data-tutorial-review-exit]').click()
        paused = saved(page)
        assert paused['learning']['practical']['reviewPaused']
        assert paused['learning']['practical']['reviewIndex'] == 3
        page.reload()
        page.wait_for_function('document.getElementById("loading").hidden')
        help_panel(page, mobile).locator('[data-help-return-lessons]').click()
        expect(review).to_have_attribute('data-tutorial-review-index', '3')
        review.locator('[data-tutorial-review-restart]').click()
        expect(review).to_have_attribute('data-tutorial-review-index', '0')
        review.locator('[data-tutorial-review-to-practical]').click()
        expect(review).to_have_count(0)
        expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'happiness-action')
        assert lesson_history(saved(page)) == before, 'Review/resetting its cursor changed practical progress'
        no_offer(page)
        cloud.no_island_cache(page)
    finally:
        context.close()


def recovered_replay_pause(browser, language, mobile):
    """A committed X with a lost HTTP response is acknowledged on readback.

    The fixture commits the exact application's write before dropping only its
    response. Recovery must close the stale tour and explain how to return,
    without advancing its cursor or sending the ambiguous write twice.
    """
    initial = world(through=1)
    seed(initial)
    before = lesson_history(initial)
    context, page = cloud.context(browser, UID, language=language, mobile=mobile)
    interrupted = {'done': False}
    try:
        visit(page)
        page.locator('#island-dialog .dialog-close').click()
        help_panel(page, mobile).locator('[data-help-return-tour]').click()
        tour = page.locator('[data-island-onboarding]')
        expect(tour).to_have_attribute('data-onboarding-step', 'home')
        tour.locator('[data-onboarding-next]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'level')

        def firestore(route):
            if route.request.method == 'POST' and not interrupted['done']:
                fields = route.request.post_data_json['writes'][0]['update']['fields']
                payload = json.loads(fields['payload']['stringValue'])
                learning = payload.get('learning', {}).get('tour', {})
                if learning.get('paused') and not learning.get('active'):
                    interrupted['done'] = True

                    class LostResponse:
                        request = route.request

                        def fulfill(self, **_kwargs):
                            return route.abort('connectionreset')

                    return cloud.firebase(LostResponse())
            return cloud.firebase(route)

        context.route('https://firestore.googleapis.com/**', firestore)
        tour.locator('[data-onboarding-exit]').click()
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'offline')
        assert interrupted['done']
        expect(tour).to_be_visible()
        expect(page.locator('[data-tutorial-exit-reminder]')).to_have_count(0)
        revision = cloud.DOCUMENTS[UID]['revision']
        page.evaluate('window.dispatchEvent(new Event("online"))')
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
        expect(tour).to_have_count(0)
        reminder = page.locator('[data-tutorial-exit-reminder]')
        expect(reminder).to_be_visible()
        expect(reminder).to_contain_text('Twoja wyspa działa dalej.' if language == 'pl' else 'Your island keeps running.')
        assert cloud.DOCUMENTS[UID]['revision'] == revision, 'A committed ambiguous pause was written twice'
        paused = cloud.cloud_state(UID)
        assert paused['learning']['tour']['index'] == 1 and paused['learning']['tour']['paused']
        assert lesson_history(paused) == before
        page.locator('[data-close-tutorial-exit-reminder]').click()
        help_panel(page, mobile).locator('[data-help-return-tour]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'level')
        close_tour(page, language)
        assert lesson_history(saved(page)) == before
        cloud.no_island_cache(page)
    finally:
        context.close()


def recovered_replay_navigation(browser, language, mobile, *, restart=False):
    """Readback adopts a committed navigation/restart whose response was lost."""
    initial = world(through=1)
    seed(initial)
    before = lesson_history(initial)
    context, page = cloud.context(browser, UID, language=language, mobile=mobile)
    interrupted = {'done': False}
    destination = 0 if restart else 2
    expected_step = 'home' if restart else 'happiness'
    try:
        visit(page)
        page.locator('#island-dialog .dialog-close').click()
        help_panel(page, mobile).locator('[data-help-return-tour]').click()
        tour = page.locator('[data-island-onboarding]')
        tour.locator('[data-onboarding-next]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'level')

        def firestore(route):
            if route.request.method == 'POST' and not interrupted['done']:
                fields = route.request.post_data_json['writes'][0]['update']['fields']
                payload = json.loads(fields['payload']['stringValue'])
                learning = payload.get('learning', {}).get('tour', {})
                if learning.get('active') and learning.get('index') == destination:
                    interrupted['done'] = True

                    class LostResponse:
                        request = route.request

                        def fulfill(self, **_kwargs):
                            return route.abort('connectionreset')

                    return cloud.firebase(LostResponse())
            return cloud.firebase(route)

        context.route('https://firestore.googleapis.com/**', firestore)
        tour.locator('[data-onboarding-restart]' if restart else '[data-onboarding-next]').click()
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'offline')
        assert interrupted['done']
        expect(tour).to_have_attribute('data-onboarding-step', 'level')
        expect(tour.locator('[data-onboarding-error]')).to_be_visible()
        revision = cloud.DOCUMENTS[UID]['revision']
        page.evaluate('window.dispatchEvent(new Event("online"))')
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
        expect(tour).to_have_attribute('data-onboarding-step', expected_step)
        expect(tour.locator('[data-onboarding-error]')).to_have_count(0)
        expect(page.locator('[data-tutorial-exit-reminder]')).to_have_count(0)
        assert cloud.DOCUMENTS[UID]['revision'] == revision, 'Confirmed navigation was written twice'
        confirmed = cloud.cloud_state(UID)
        assert confirmed['learning']['tour']['index'] == destination
        assert confirmed['learning']['tour']['active'] and not confirmed['learning']['tour']['paused']
        assert lesson_history(confirmed) == before
        close_tour(page, language)
        help_panel(page, mobile).locator('[data-help-return-tour]').click()
        expect(tour).to_have_attribute('data-onboarding-step', expected_step)
        close_tour(page, language)
        if not restart:
            # Check the rendered Residents guide in both languages as well as
            # the transport mechanics: a retained5-minute sentence must not
            # contradict the actual120-second walk after this release.
            page.locator('[data-mobile-control="home"]' if mobile else '#hit-home').click()
            page.locator('#island-dialog').get_by_role('button', name='Mieszkańcy' if language == 'pl' else 'Residents', exact=True).click()
            guide = page.locator('.residents-panel')
            expect(guide).to_contain_text('Mieszkaniec zaczyna pracę po dwóch minutach drogi z Domu.' if language == 'pl'
                                          else 'A resident starts working after the 2-minute walk to work.')
            expect(guide).not_to_contain_text(re.compile(r'(?:5-minute|five.minutes|5 minut(?:ach|y)?|pięć minut|pięciu minut)', re.I))
            page.locator('#island-dialog .dialog-close').click()
        assert lesson_history(saved(page)) == before
        cloud.no_island_cache(page)
    finally:
        context.close()


def construction_receipt_then_feedback(browser, kind, language, mobile):
    is_townhall = kind == 'townhall'
    initial = world(through=7 if is_townhall else 23)
    lesson = 'resources-dock' if is_townhall else 'returning-workers'
    seed(initial)
    context, page = cloud.context(browser, UID, language=language, mobile=mobile)
    try:
        visit(page)
        expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', lesson)
        page.locator(f'[data-tutorial-construction-status="{kind}"]').first.click()
        popup = page.locator('#tutorial-construction-status')
        expect(popup).to_be_visible()
        expect(popup).to_have_attribute('data-pending-construction', kind)
        timing = popup.locator('[data-pending-construction-text]')
        expect(timing).to_contain_text('Rozbudowa zakończy się za' if language == 'pl' else 'The upgrade will finish in')
        original = timing.inner_text()
        assert not re.search(r'NaN|undefined|Niedostępne|Unavailable', original)
        page.clock.run_for(1_000)
        expect(timing).not_to_have_text(original)
        # Observe real DOM order. A callout cannot arrive before or over the
        # receipt which tells the player this condition lesson is complete.
        page.evaluate('''() => {
          window.__qaLearningTimeline=[];
          const capture=()=>{
            const receipt=document.querySelector('[data-tutorial-achievement]');
            const effect=document.querySelector('[data-learning-feedback]');
            for(const value of [receipt ? 'receipt:'+receipt.dataset.tutorialAchievement : null,effect ? 'effect:'+effect.dataset.learningFeedback : null])
              if(value&&!window.__qaLearningTimeline.includes(value))window.__qaLearningTimeline.push(value);
          };
          new MutationObserver(capture).observe(document.body,{subtree:true,childList:true,attributes:true});capture();
        }''')
        receipt = page.locator(f'[data-tutorial-achievement="{lesson}"]')
        for _ in range(40):
            page.clock.run_for(30_000)
            if receipt.is_visible():
                break
        expect(receipt).to_be_visible()
        expect(popup).to_have_count(0)
        expect(page.locator('[data-learning-feedback]')).to_have_count(0)
        expect(receipt.locator('.tutorial-double-description')).to_have_text(
            'Nagroda została dodana do Twoich zasobów. Kliknij „Dalej”, aby przejść do kolejnej lekcji.'
            if language == 'pl' else 'The reward has been added to your resources. Select “Continue” to move to the next lesson.')
        expect(receipt).not_to_contain_text('dodatkowa skrzynia' if language == 'pl' else 'additional chest')
        receipt.locator('[data-tutorial-skip]').click()
        feedback = page.locator(f'[data-learning-feedback="{kind}"]')
        expect(feedback).to_be_visible()
        current = saved(page)
        if is_townhall:
            assert current['buildings']['townhall']['level'] == 2
            expect(feedback).to_contain_text('poziom 2' if language == 'pl' else 'level 2')
        else:
            assert current['buildings']['lighthouse']['level'] == 1
            assert current['happiness'] == 100 and current['lighthouseRemaining'] > 0
            expect(feedback.locator('[data-learning-feedback-description]')).to_contain_text('100%')
            expect(feedback.locator('[data-learning-feedback-description]')).not_to_contain_text('120%')
            expect(feedback.locator('[data-learning-feedback-description]')).to_contain_text('przez' if language == 'pl' else 'for')
        timeline = page.evaluate('window.__qaLearningTimeline')
        assert timeline.index('receipt:' + lesson) < timeline.index('effect:' + kind), timeline
        assert current['tutorial']['claimed'][lesson]
        page.locator('[data-learning-feedback-close]').click()
        if not is_townhall:
            help_panel(page, mobile).locator('[data-help-return-lessons]').click()
            page.locator('[data-finish-tutorial]').click()
            final = page.locator('[data-tutorial-finished]')
            expect(final).to_be_visible()
            expect(final).to_contain_text(
                'Teraz Ty wyznaczasz kierunek rozwoju wyspy' if language == 'pl' else 'Now you decide how your island develops')
            finished = saved(page)
            assert finished['tutorial']['settled']
            assert len(finished['tutorial']['claimed']) == 25
        no_offer(page)
        cloud.no_island_cache(page)
    finally:
        context.close()


def run():
    recovery_only = os.environ.get('HARBORLIGHT_LEARNING_RECOVERY_ONLY') == '1'
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                     headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    if not recovery_only:
                        tour_and_help(browser, language, mobile)
                        practical_review(browser, language, mobile)
                        recovered_replay_pause(browser, language, mobile)
                        construction_receipt_then_feedback(browser, 'townhall', language, mobile)
                        construction_receipt_then_feedback(browser, 'lighthouse', language, mobile)
                    recovered_replay_navigation(browser, language, mobile)
                    recovered_replay_navigation(browser, language, mobile, restart=True)
                    print('PASS learning flow', language, 'mobile' if mobile else 'desktop', flush=True)
            assert not cloud.ERRORS, cloud.ERRORS
        finally:
            browser.close()
    if recovery_only:
        print('PASS8 replay navigation/restart lost-ACK scenarios: confirmed cloud cursor adopted without duplicate writes or changed practical history; PL/EN desktop/mobile')
    else:
        print('PASS integrated v27 learning: Help has two entries, overview excludes them,34 tour steps with live T27 and chat, saved resume/restart and lost-ACK readback, read-only practical review, actual construction countdown, receipt-before-effect arrows; PL/EN desktop/mobile')


if __name__ == '__main__':
    run()
