"""Real game UI acceptance for v29 learning, using isolated in-memory islands.

No cloud users, advertising provider or payments are contacted. The fixture
sets saved positions only; clicks navigate the actual game and acknowledge its
model operations. The command runner separately plays the real natural build.
"""
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SOURCE / 'tests'))
from helpers.browser_tutorial import legacy_practical_node_env
BASE = SOURCE / 'tests' / 'harborlight-release-v28-smoke.py'
spec = importlib.util.spec_from_file_location('v29_learning_browser_base', BASE)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
NOW = int(datetime(2026, 11, 3, 12, tzinfo=timezone.utc).timestamp() * 1000)
SCREENSHOTS = Path(os.environ.get('HARBORLIGHT_SCREENSHOT_DIR', '/tmp/harborlight-v29-learning-browser'))


def fixture(step=0):
    code = """import {createState,act,recordVisit} from './harborlight-v1-state.js';
      const state=createState(%d);state.islandName='Przystań testowa';
      const run=a=>{const r=act(state,a,state.worldTimeMs);if(!r.ok)throw Error(r.message);};
      run({type:'dismissTutorial'});recordVisit(state,state.worldTimeMs);
      if(state.loyalty.pendingReward&&!state.loyalty.closed&&state.loyalty.lastClaimedDay!==state.loyalty.pendingDay)run({type:'claimLoyalty'});
      run({type:'learningUpdate',patch:{tour:{index:%d,active:false,paused:true},adsNotBeforeActiveSeconds:100000}});
      console.log(JSON.stringify(state));""" % (NOW, step)
    result = subprocess.run(['node', '--input-type=module', '-e', code], cwd=SOURCE, text=True, capture_output=True, check=True, env=legacy_practical_node_env())
    return json.loads(result.stdout)


def screenshot(page, suffix):
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SCREENSHOTS / (suffix + '.png')), full_page=True)


def open_help(page, mobile):
    if page.locator('#island-dialog[open]').count():
        page.locator('#island-dialog .dialog-close').click()
    page.locator('[data-mobile-control="tutorial"]' if mobile else '#hit-tutorial').click()
    return page.locator('[data-help-panel]')


def close_tour(page):
    page.locator('[data-onboarding-exit]').click()
    reminder = page.locator('[data-tutorial-exit-reminder]')
    expect(reminder).to_be_visible()
    symbol = reminder.locator('[data-tutorial-exit-help-symbol]')
    expect(symbol).to_have_text('?')
    sizes = symbol.evaluate('node=>({symbol:parseFloat(getComputedStyle(node).fontSize),text:parseFloat(getComputedStyle(node.parentElement).fontSize)})')
    assert abs(sizes['symbol'] / sizes['text'] - 3) < .01, sizes
    page.locator('[data-close-tutorial-exit-reminder]').click()


def approved_tour_route():
    code = """import {APPROVED_TOUR_IDS} from './harborlight-v1-approved-copy.js';
      import {ADVISOR_INTRO_IDS} from './harborlight-v1-advisor-intro.js';
      console.log(JSON.stringify({visible:ADVISOR_INTRO_IDS,canonical:APPROVED_TOUR_IDS}));"""
    result = subprocess.run(['node', '--input-type=module', '-e', code], cwd=SOURCE,
                            text=True, capture_output=True, check=True)
    catalog = json.loads(result.stdout)
    route, canonical = catalog['visible'], catalog['canonical']
    assert len(route) == len(set(route)) == 28, route
    assert len(canonical) == len(set(canonical)) == 56, canonical
    assert route == canonical[:11] + ['chat'] + canonical[21:28] + canonical[47:56], route
    assert route[0] == 'home' and 'building-theatre' in route, route
    assert route[route.index('building-farm') + 1] == 'producer-storage', route
    return catalog


def scenario(browser, language, mobile, catalog):
    route, canonical = catalog['visible'], catalog['canonical']
    context, page, errors, external = base.new_page(browser, fixture(), language, mobile)
    label = '%s-%s' % (language, 'mobile' if mobile else 'desktop')
    try:
        panel = open_help(page, mobile)
        cards = panel.locator('.help-learning-grid > .info-card')
        expect(cards).to_have_count(2)
        for card in cards.all():
            buttons = card.locator('button')
            expect(buttons).to_have_count(2)
            boxes = [button.bounding_box() for button in buttons.all()]
            assert abs(boxes[0]['x'] - boxes[1]['x']) < 1, boxes
            assert abs(boxes[0]['width'] - boxes[1]['width']) < 1, boxes
        screenshot(page, label + '-aligned-help')
        panel.locator('[data-help-tour-from-start]').click()
        tour = page.locator('[data-island-onboarding]')
        expect(tour.locator('[data-onboarding-counter]')).to_contain_text(
            ('1 z %d' if language == 'pl' else '1 of %d') % len(route))
        # Skip through the actual tour to the Farm, and show its full-store
        # explanation only on the dedicated following step.
        visited = []
        storage_index = route.index('producer-storage')
        for identity in route[:storage_index]:
            expect(tour).to_have_attribute('data-onboarding-step', identity)
            visited.append(identity)
            if identity == 'building-farm':
                body = tour.locator('#island-onboarding-description')
                expect(body).not_to_contain_text('smutna buźka' if language == 'pl' else 'sad face')
                expect(page.locator('[data-production-penalty="farm"]')).to_have_count(0)
            tour.locator('[data-onboarding-next]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'producer-storage')
        visited.append('producer-storage')
        expect(tour.locator('#island-onboarding-description')).to_contain_text(
            re.compile(r'\blekcj[ęi]\s+11\b') if language == 'pl' else 'lesson 11')
        sad = page.locator('[data-production-penalty="farm"]')
        expect(sad).to_have_count(1)
        expect(sad).to_be_visible()
        screenshot(page, label + '-single-farm-storage')
        tour.locator('[data-onboarding-next]').click()
        resume_step = route[storage_index + 1]
        expect(tour).to_have_attribute('data-onboarding-step', resume_step)
        expect(sad).to_have_count(0)
        close_tour(page)
        assert base.state_of(page)['learning']['tour']['index'] == canonical.index(resume_step), 'A presentation index replaced the original saved cursor'
        expect(page.locator('[data-mobile-control="tutorial"]' if mobile else '#hit-tutorial')).to_have_class(re.compile('learning-help-highlight'))
        # Saved pause is restored exactly and completing the resumed tour
        # returns to practical work, not an idle island with the course hidden.
        panel = open_help(page, mobile)
        panel.locator('[data-help-return-tour]').click()
        expect(tour).to_have_attribute('data-onboarding-step', resume_step)
        for identity in route[storage_index + 1:]:
            expect(tour).to_have_attribute('data-onboarding-step', identity)
            visited.append(identity)
            if identity == 'building-dock':
                page.clock.run_for(32)  # Let the actual spotlight position its new target.
                highlight = page.locator('[data-onboarding-highlight]')
                expect(highlight).to_be_visible()
                admin = page.locator('[data-mobile-category="administration"]' if mobile else '#hit-category-administration')
                rect, nav = highlight.bounding_box(), admin.bounding_box()
                assert rect and nav and rect['y'] + rect['height'] <= nav['y'], (rect, nav)
            tour.locator('[data-onboarding-next]').click()
        expect(tour).to_have_count(0)
        assert visited == route and len(visited) == len(set(visited)), visited
        assert 'building-theatre' in visited, visited
        finished_tour = base.state_of(page)['learning']['tour']
        assert finished_tour['completed'] and finished_tour['index'] == canonical.index(route[-1]) == 55
        # Practical guidance is optional: explicitly resume it through Help.
        open_help(page, mobile).locator('[data-help-return-lessons]').click()
        expect(page.locator('[data-tutorial-current="island-map"]')).to_be_visible()
        expect(page.locator('[data-tutorial-assignment-progress]')).to_contain_text('0 / 3')
        current = base.state_of(page)
        assert current['tutorial']['curriculum'] == 7, current['tutorial']['curriculum']
        assert current['tutorial']['completed'] == {}, current['tutorial']['completed']
        screenshot(page, label + '-resumed-practical')
        base.clean(errors, external)
    finally:
        context.close()


def real_course():
    code = """import {runTutorialV29} from './tests/helpers/tutorial-v29-course.mjs';
      import {tutorialRows} from './harborlight-v1-progression.js';
      const actions=[];const result=runTutorialV29({through:12,beforeLesson:(state,run,lesson)=>actions.push({id:lesson.id,now:state.worldTimeMs})});
      const quarry=result.trace.find(row=>row.lessonId==='transport-priority'),finished=result.trace.find(row=>row.lessonId==='food-chain');
      if(!(finished.elapsedSeconds>quarry.elapsedSeconds))throw Error('Natural construction did not consume real time');
      if(result.state.tutorial.guided.quarry.accelerated)throw Error('Natural-wait lesson used a paid acceleration');
      if(result.state.buildings.quarry.level!==2)throw Error('Quarry did not finish naturally');
      if(!result.state.tutorial.guided.townhall.accelerated)throw Error('Town Hall speed-up was not taught');
      console.log(JSON.stringify({quarrySeconds:finished.elapsedSeconds-quarry.elapsedSeconds,lessons:result.trace.length,curriculum:result.state.tutorial.curriculum}));"""
    result = subprocess.run(['node', '--input-type=module', '-e', code], cwd=SOURCE, text=True, capture_output=True, check=True, env=legacy_practical_node_env())
    print('PASS real curriculum7 natural wait and coin acceleration: ' + result.stdout.strip())


def run():
    real_course()
    catalog = approved_tour_route()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    scenario(browser, language, mobile, catalog)
        finally:
            browser.close()
    print('PASS v29 learning: Help button edges, 3x question mark, %d-stop current route with 56 stable saved positions, single Farm storage demonstration, Theatre, saved resume and explicitly resumed preserved practical course; PL/EN desktop/mobile' % len(catalog['visible']))


if __name__ == '__main__':
    run()
