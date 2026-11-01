"""Real game mission UI/save acceptance using isolated Firebase REST fixtures.

Accept and partially deliver the main mission, reload the actual game, then
cross its real deadline and the support deadline to exercise 8→5→3 paths.
No live cloud account, payment, identity or saved player history is accessed.
"""
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import subprocess

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('missions_v27_cloud', ROOT / 'tests/harborlight-dev-game-smoke.py')
cloud = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cloud)
UID = 'dev-admin3'


def initial_state():
    code = '''import {createState,normalizeState} from './harborlight-v1-state.js';
      import {grantBonusMaterials} from './harborlight-v1-inventory.js';
      const at=Date.parse('2026-11-01T12:00:00Z');let state=createState(at);
      state.islandName='Światło Przystani';state.tutorial.autoOpenDisabled=true;
      state.engagementSchedule.initialCompleted=true;state.engagementSchedule.initialAnchored=true;
      state.engagementSchedule.nextAt=1e12;
      for(const id of ['townhall','house','warehouse','lumber'])state.buildings[id].level=2;
      state.capacity=48;state.buildings.lighthouse.level=1;
      grantBonusMaterials(state,{wood:5000,stone:5000,grain:5000,food:5000,planks:5000});
      state=normalizeState(state,at);console.log(JSON.stringify(state));'''
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT, capture_output=True, text=True, check=True).stdout)


def saved(page):
    page.evaluate('window.dispatchEvent(new Event("pagehide"))')
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    return cloud.cloud_state(UID)


def open_missions(page, mobile):
    if mobile:
        page.locator('.mobile-activities').click()
    else:
        page.locator('[data-open-lighthouse-missions]').click()
    expect(page.locator('#island-dialog [data-lighthouse-missions]')).to_be_visible()


def open_game(browser, language, mobile):
    context, page = cloud.context(browser, UID, language=language, mobile=mobile)
    assert page.goto(cloud.ORIGIN + '/harborlight-v1-layered.html?profile=new-player').ok
    page.wait_for_function('document.getElementById("loading").hidden')
    open_missions(page, mobile)
    return context, page


def scenario(browser, language, mobile):
    state = initial_state()
    cloud.NOW = datetime.fromtimestamp(state['worldTimeMs'] / 1000, tz=timezone.utc)
    cloud.DOCUMENTS.clear()
    cloud.DOCUMENTS[UID] = {'payload': json.dumps(state), 'revision': 5, 'updateTime': cloud.timestamp()}
    errors = len(cloud.ERRORS)
    context, page = open_game(browser, language, mobile)
    panel = page.locator('[data-lighthouse-missions]')
    expect(panel.locator('[data-mission-path="main"]')).to_contain_text('1 / 8')
    page.locator('[data-mission-start]').click()
    expect(page.locator('[data-mission-active]')).to_be_visible()
    page.locator('[data-mission-deposit-input="wood"]').fill('1')
    page.locator('[data-mission-deposit="wood"]').click()
    expect(page.locator('[data-mission-deposited="wood"]')).to_have_text('1 / 50')
    first = saved(page)
    task = first['lighthouseMissions']['stack'][-1]['task']
    assert task['status'] == 'active' and task['deposited'] == {'wood': 1}
    assert task['deadline'] > task['acceptedAt']
    assert first['buildings']['lighthouse']['level'] == 1
    identities = {person['id']: person.get('personUid') for person in first['residents']}
    context.close()

    # The actual cloud-loaded island resumes the same task and deposited stock.
    context, page = open_game(browser, language, mobile)
    expect(page.locator('[data-mission-deposited="wood"]')).to_have_text('1 / 50')
    reloaded = saved(page)
    restored = reloaded['lighthouseMissions']['stack'][-1]['task']
    assert restored['id'] == task['id'] and restored['deadline'] == task['deadline']
    assert restored['deposited'] == task['deposited']
    assert reloaded['resources']['coins'] == first['resources']['coins']
    assert reloaded['buildings']['lighthouse']['level'] == 1
    context.close()

    # Offline catch-up runs the real deadline transition, without a debug UI.
    cloud.NOW = datetime.fromtimestamp((task['deadline'] + 1000) / 1000, tz=timezone.utc)
    context, page = open_game(browser, language, mobile)
    expect(page.locator('[data-mission-path="main"]')).to_contain_text('1 / 8')
    expect(page.locator('[data-mission-path="support"]')).to_have_attribute('aria-current', 'step')
    expect(page.locator('[data-mission-path="support"]')).to_contain_text('1 / 5')
    page.locator('[data-mission-start]').click()
    support = saved(page)
    assert [frame['kind'] for frame in support['lighthouseMissions']['stack']] == ['main', 'support']
    assert support['lighthouseMissions']['stack'][0]['task']['deposited'] == {'wood': 1}
    support_task = support['lighthouseMissions']['stack'][-1]['task']
    assert support_task['status'] == 'active'
    context.close()

    cloud.NOW = datetime.fromtimestamp((support_task['deadline'] + 1000) / 1000, tz=timezone.utc)
    context, page = open_game(browser, language, mobile)
    expect(page.locator('[data-mission-path="rescue"]')).to_have_attribute('aria-current', 'step')
    expect(page.locator('[data-mission-path="rescue"]')).to_contain_text('1 / 3')
    final = saved(page)
    stack = final['lighthouseMissions']['stack']
    assert [frame['kind'] for frame in stack] == ['main', 'support', 'rescue']
    assert [frame['total'] for frame in stack] == [8, 5, 3]
    assert stack[0]['task']['id'] == task['id'] and stack[0]['task']['deposited'] == {'wood': 1}
    assert final['buildings']['townhall']['level'] == 2 and final['buildings']['lighthouse']['level'] == 1
    for person in final['residents']:
        if person['id'] in identities:
            assert person.get('personUid') == identities[person['id']]
    cloud.no_island_cache(page)
    assert not cloud.ERRORS[errors:], cloud.ERRORS[errors:]
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal overflow'
    context.close()


if __name__ == '__main__':
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    scenario(browser, language, mobile)
                    print(f'PASS real-game missions {language} {"mobile" if mobile else "desktop"}: start, contribution, cloud reload, 8→5→3 deadlines', flush=True)
        finally:
            browser.close()
