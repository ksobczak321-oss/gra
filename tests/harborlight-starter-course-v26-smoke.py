"""Fresh v5 practical course through actual map clicks and cloud saves.

The later task/expedition fixtures are outputs of successful course commands.
No completion flags, free stock, project phases or winning outcomes are injected.
Only Firebase responses are intercepted; the real public UI performs each step.
"""
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('starter_v26_cloud', ROOT / 'tests/harborlight-dev-game-smoke.py')
cloud = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cloud)
START = int(cloud.NOW.timestamp() * 1000)
UID = 'dev-admin3'


def model(through=0, decision=False):
    script = '''import {runTutorialV26} from './tests/helpers/tutorial-v26-course.mjs';
      const {state,command}=runTutorialV26({now:%d,through:%d});
      state.islandName='Start nowej przygody';
      if(%s){
        command({type:'expeditionStart',expedition:'misty',gameKind:'triples'});
        const run=state.expeditionRuns.misty;
        for(let symbol=0;symbol<run.miniGame.symbolCount;symbol++){
          for(let index=0;index<run.miniGame.cards.length;index++)if(run.miniGame.cards[index]===symbol)
            command({type:'expeditionMiniGameReveal',runId:run.id,index});
        }
        if(run.status!=='decision')throw Error('Actual card solver did not win');
      }
      console.log(JSON.stringify(state));''' % (START, through, json.dumps(decision))
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT, capture_output=True, text=True, check=True).stdout)


def enter(browser, state, *, language='pl', mobile=False):
    cloud.NOW = datetime.fromtimestamp(state['worldTimeMs'] / 1000, tz=timezone.utc)
    cloud.DOCUMENTS[UID] = {'payload': json.dumps(state), 'revision': 7, 'updateTime': cloud.timestamp()}
    context, page = cloud.context(browser, UID, language=language, mobile=mobile)
    assert page.goto(cloud.ORIGIN + '/harborlight-v1-layered.html?profile=new-player').ok
    page.wait_for_function('document.getElementById("loading").hidden')
    return context, page


def saved(page):
    # Routing records a harmless visit in the ordinary autosave queue. Flush
    # through the supported pagehide lifecycle before comparing cloud evidence.
    # The independent learning-flow suite checks the 30-second timer itself.
    page.evaluate('window.dispatchEvent(new Event("pagehide"))')
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    return cloud.cloud_state(UID)


def pending_reward(page, lesson):
    saved(page)
    popup = page.locator('[data-tutorial-achievement="%s"]' % lesson)
    if not popup.is_visible():
        # The fixture clock is stopped. Use the real reward control when it
        # becomes available, rather than expecting the next automatic tick.
        claim = page.locator('[data-tutorial-claim="%s"]' % lesson)
        if claim.is_visible():
            claim.click()
        else:
            page.clock.run_for(1000)
    expect(popup).to_be_visible()
    return popup


def reward(page, lesson, *, flush=True):
    popup = pending_reward(page, lesson)
    page.locator('[data-tutorial-skip="%s"]' % lesson).click()
    expect(popup).to_have_count(0)
    if flush:
        page.clock.run_for(30_000)
        saved(page)


def find_building(page, lesson, building):
    target = page.locator('#hit-world-' + building)
    expect(page.locator('#island-dialog')).not_to_be_visible()
    expect(target).to_have_attribute('data-tutorial-map-target', lesson)
    expect(target).to_have_class(re.compile('tutorial-map-target'))
    expect(page.locator('[data-tutorial-pointer]')).to_have_attribute('data-tutorial-phase', 'map')
    expect(page.locator('[data-worker-building="%s"]:visible' % building)).to_have_count(0)
    target.click()
    expect(page.locator('[data-building-panel="%s"]' % building)).to_be_visible()


def fresh_starter(browser, language, mobile):
    initial = model()
    assert initial['tutorial']['curriculum'] == 5
    context, page = enter(browser, initial, language=language, mobile=mobile)
    try:
        expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'island-map')
        expect(page.locator('[data-tutorial-assignment-progress]')).to_contain_text('0 / 6')
        page.locator('[data-tutorial-visit="island-map"]').click()
        find_building(page, 'island-map', 'warehouse')
        plus = page.locator('[data-worker-building="warehouse"][data-worker-delta="1"]')
        for count in range(1, 6):
            expect(plus).to_have_class(re.compile('tutorial-action-target'))
            plus.click()
            current = saved(page)
            assert current['buildings']['warehouse']['workers'] == count
            assert current['resources']['coins'] == initial['resources']['coins']
            assert not current['tutorial']['completed'].get('island-map')
            assert not current['tutorial']['claimed'].get('island-map')
            expect(page.locator('[data-tutorial-achievement]')).to_have_count(0)
            expect(page.locator('[data-tutorial-assignment-progress]')).to_contain_text('%d / 6' % count)
        plus.click()
        reward(page, 'island-map')
        sixth = saved(page)
        assert sixth['buildings']['warehouse']['workers'] == 6
        assert sixth['tutorial']['claimed']['island-map']
        assert sixth['tutorial']['chests']['island-map']['reward']['coins'] == 100
        # All workers, including the first six, now walk for120s. The real
        # reward acknowledgment above advanced30s, leaving90s to reach work.
        assert all(person.get('arrivalRemaining', 0) == 90 for person in sixth['residents'] if person.get('workplace') == 'warehouse')

        find_building(page, 'happiness-action', 'warehouse')
        details = page.locator('[data-building-more="warehouse"]')
        expect(details).to_have_class(re.compile('tutorial-action-target'))
        expect(page.locator('[data-warehouse-priority]')).to_have_count(0)
        details.click()
        priority = page.locator('[data-warehouse-priority="construction"]')
        expect(priority).to_have_class(re.compile('tutorial-action-target'))
        assert not saved(page)['tutorial']['completed'].get('happiness-action')
        priority.click()
        reward(page, 'happiness-action')
        assert saved(page)['warehousePriorities'] == ['construction']

        for lesson, building in [('rules-read', 'farm'), ('first-job', 'lumber')]:
            before = saved(page)
            find_building(page, lesson, building)
            assert saved(page)['tutorial']['claimed'] == before['tutorial']['claimed'], 'Opening a building paid a lesson reward'
            control = page.locator('[data-worker-building="%s"][data-worker-delta="1"]' % building)
            expect(control).to_have_class(re.compile('tutorial-action-target'))
            control.click()
            reward(page, lesson)
            assert saved(page)['buildings'][building]['workers'] == 1

        supplies = page.locator('[data-tutorial-supplies]')
        if supplies.is_visible():
            expect(supplies).to_have_class(re.compile('tutorial-action-target'))
            supplies.click()
        find_building(page, 'townhall-upgrade', 'townhall')
        upgrade = page.locator('[data-upgrade-building="townhall"]')
        expect(upgrade).to_be_enabled()
        before = saved(page)
        assert before['resources']['coins'] < 2000 and not before['commerce']['receipts'], 'Starter must be funded by course rewards'
        upgrade.click()
        pending_reward(page, 'townhall-upgrade')
        expect(page.locator('#starter-construction-guide')).to_have_count(0)
        reward(page, 'townhall-upgrade', flush=False)
        explanation = page.locator('[data-starter-construction-guide]')
        expect(explanation).to_be_visible()
        expect(explanation).to_contain_text('30')
        expect(explanation).to_contain_text('1 min')
        expect(explanation).to_contain_text('monetach' if language == 'pl' else 'coin price')
        page.locator('#starter-construction-guide').get_by_role('button').click()
        page.clock.run_for(30_000)
        delivery_done = saved(page)
        project = next(item for item in delivery_done['constructionProjects'] if item['building'] == 'townhall')
        assert project['starterTurbo']['transportDuration'] == 30
        assert project['starterTurbo']['buildingDuration'] == 60
        assert project['stage'] == 'building'
        page.clock.run_for(60_000)
        finished = saved(page)
        assert finished['buildings']['townhall']['level'] == 2
        assert not finished['commerce']['receipts']
        cloud.no_island_cache(page)
    finally:
        context.close()


def task_and_cashout_targets(browser):
    initial = model(20)
    context, page = enter(browser, initial)
    try:
        expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'lighthouse-visits')
        page.locator('[data-tutorial-visit="lighthouse-visits"]').click()
        task = next(task for task in initial['lighthouseTasks'] if task.get('tutorialStarter'))
        task_id = task['id']
        accept = page.locator('[data-task-accept="%s"]' % task_id)
        expect(accept).to_have_class(re.compile('tutorial-action-target'))
        accept.click()
        page.locator('[data-confirm-task="%s"]' % task_id).click()
        active = saved(page)
        assert active['activeTaskId'] == task_id
        assert not active['tutorial']['completed'].get('lighthouse-visits'), 'Accepting alone completed the real task lesson'
        deposit = page.locator('[data-task="%s"] [data-task-deposit]:not(:disabled)' % task_id).first
        expect(deposit).to_have_class(re.compile('tutorial-action-target'))
        expect(page.locator('[data-tutorial-pointer]')).to_contain_text('Dostarcz wymagane materiały')
        deposit.click()
        assert not saved(page)['tutorial']['completed'].get('lighthouse-visits'), 'A partial delivery completed a two-material task'
        cloud.no_island_cache(page)
    finally:
        context.close()

    decision = model(21, decision=True)
    before_coins = decision['resources']['coins']
    pot = decision['expeditionRuns']['misty']['pot']
    context, page = enter(browser, decision)
    try:
        cashout = page.locator('[data-expedition-cashout]')
        expect(cashout).to_be_visible()
        expect(cashout).to_have_class(re.compile('tutorial-action-target'))
        expect(page.locator('[data-tutorial-pointer]')).to_contain_text('Odbierz zgromadzone monety')
        assert not saved(page)['tutorial']['completed'].get('lighthouse-task')
        cashout.click()
        reward(page, 'lighthouse-task')
        actual = saved(page)
        assert actual['tutorial']['completed']['lighthouse-task']
        assert actual['tutorial']['claimed']['lighthouse-task']
        assert actual['resources']['coins'] >= before_coins + pot
        cloud.no_island_cache(page)
    finally:
        context.close()


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    fresh_starter(browser, language, mobile)
            task_and_cashout_targets(browser)
            assert not cloud.ERRORS, cloud.ERRORS
        finally:
            browser.close()
    print('PASS starter v5 UI: rewardonlysixcarriers, prioritydetails, farmer/lumbermap, funded30+60sTownHall2, taskaccept→deposit and wonround→cashout targets; PL/ENdesktop/mobile')


if __name__ == '__main__':
    run()
