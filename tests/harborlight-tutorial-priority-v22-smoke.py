"""Tutorial pointers follow Warehouse compact -> details -> actual priority.

The two fixtures are produced by successful model commands. Navigation cannot
complete a lesson or grant a reward; the browser must click the actual priority
control. Runs against the packaged frontend on loopback without cloud writes.
"""
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('priority_v22_browser_helpers', ROOT / 'tests/harborlight-tutorial-v21-smoke.py')
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


def model(curriculum):
    if curriculum == 4:
        return qa.model(5)
    script = """import {createState,act} from './harborlight-v1-state.js';
      import {normalizeProgression,tutorialStatus} from './harborlight-v1-progression.js';
      const state=createState(Date.parse('2026-10-31T10:00:00Z'));
      normalizeProgression(state,{...state,tutorial:{version:3,seed:57}});
      const run=action=>{const result=act(state,action,state.worldTimeMs);if(!result.ok)throw Error(JSON.stringify({action,result}));};
      for(const [id,building] of [['rules-read','farm'],['island-map','warehouse'],['first-job','windmill'],['food-check','lumber']]){
        run({type:'assign',building,delta:1});run({type:'claimTutorial',taskId:id});run({type:'skipTutorialShare',taskId:id});
      }
      run({type:'prepareTutorialUpgrade'});run({type:'upgrade',building:'townhall'});
      run({type:'houseHappinessAll',amount:1});
      run({type:'assign',building:'quarry',delta:1});run({type:'assign',building:'sawmill',delta:1});
      if(tutorialStatus(state).nextLessonId!=='transport-priority')throw Error('Wrong real legacy fixture');
      console.log(JSON.stringify(state));"""
    result = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT,
                            capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def priority_route(browser, curriculum, mobile=False):
    lesson = 'happiness-action' if curriculum == 4 else 'transport-priority'
    context, page = qa.enter(browser, model(curriculum))
    try:
        if mobile:
            page.set_viewport_size({'width': 360, 'height': 800})
        expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', lesson)
        original = qa.qa.state(page)
        page.locator('[data-tutorial-visit="%s"]' % lesson).click()
        expect(page.locator('#island-dialog')).not_to_be_visible()
        expect(page.locator('#hit-world-warehouse')).to_have_class(re.compile('tutorial-map-target'))
        page.locator('#hit-world-warehouse').click()
        expect(page.locator('[data-building-panel="warehouse"]')).to_be_visible()
        expect(page.locator('[data-warehouse-priority]')).to_have_count(0)
        details = page.locator('[data-building-more="warehouse"]')
        expect(details).to_have_class(re.compile('tutorial-action-target'))
        expect(details).to_be_in_viewport(ratio=1)
        expect(page.locator('[data-tutorial-pointer]')).to_be_visible()
        expect(page.locator('[data-tutorial-pointer]')).to_be_in_viewport(ratio=1)
        expect(page.locator('[data-tutorial-pointer]')).to_have_text('▼ Kliknij „Więcej o budynku”')
        before_details = qa.qa.state(page)
        assert not before_details['tutorial']['completed'].get(lesson)
        assert not before_details['tutorial']['claimed'].get(lesson)
        assert before_details['resources'] == original['resources']

        # Opening the parent view only changes routing. It must neither mark
        # the priority lesson complete nor roll/claim its reward.
        details.click()
        expect(page.locator('[data-building-details="warehouse"]')).to_be_visible()
        priority = page.locator('[data-warehouse-priority="construction"]' if curriculum == 4 else '[data-warehouse-priority]').first
        expect(priority).to_have_class(re.compile('tutorial-action-target'))
        expect(priority).to_be_in_viewport(ratio=1)
        expect(page.locator('[data-building-more="warehouse"]')).to_have_count(0)
        expect(page.locator('[data-tutorial-pointer]')).to_have_text('▼ Wybierz priorytet „Budowa”' if curriculum == 4 else '▼ Wybierz wskazany priorytet transportu')
        expect(page.locator('[data-tutorial-pointer]')).to_be_in_viewport(ratio=1)
        guide_box = page.locator('[data-active-tutorial-guide]').bounding_box()
        target_box = priority.bounding_box()
        overlap_x = max(0, min(guide_box['x'] + guide_box['width'], target_box['x'] + target_box['width']) - max(guide_box['x'], target_box['x']))
        overlap_y = max(0, min(guide_box['y'] + guide_box['height'], target_box['y'] + target_box['height']) - max(guide_box['y'], target_box['y']))
        assert overlap_x * overlap_y <= 1, 'The guidance card must not cover the action it explains'
        after_details = qa.qa.state(page)
        assert not after_details['tutorial']['completed'].get(lesson)
        assert not after_details['tutorial']['claimed'].get(lesson)
        assert lesson not in after_details['tutorial']['chests']
        assert after_details['resources'] == before_details['resources']
        assert after_details['warehousePriorities'] == []

        selected = priority.get_attribute('data-warehouse-priority')
        priority.click()
        completed = qa.qa.state(page)
        assert completed['warehousePriorities'] == [selected]
        assert completed['tutorial']['completed'][lesson]
        assert not completed['tutorial']['skippedLessons'].get(lesson)
        assert completed['tutorial']['actionLedger']['counts']['transport-priority'] == 1
        assert lesson in completed['tutorial']['chests']
    finally:
        context.close()
    print('PASS22 priority curriculum%s %s: compact points at building details, then actual priority; navigation grants no completion or reward' % (curriculum, '360px' if mobile else 'desktop'), flush=True)


def run():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            for curriculum in [3, 4]:
                for mobile in [False, True]:
                    priority_route(browser, curriculum, mobile)
            assert not qa.qa.ERRORS, qa.qa.ERRORS
        finally:
            browser.close()


if __name__ == '__main__':
    run()
