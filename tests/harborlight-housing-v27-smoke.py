"""Actual-game housing acceptance against isolated Firebase REST responses.

The two island snapshots are created with the real model. The second House is
ordered and completed normally, then its pool renews at Warsaw midnight. The
browser loads the public game and allocates House points through real controls.
All cloud records remain in memory; no live account or island is accessed.
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
spec = importlib.util.spec_from_file_location(
    'housing_v27_cloud', SOURCE / 'tests/harborlight-dev-game-smoke.py')
cloud = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cloud)
UID = 'dev-admin3'


def model(completed_house=False):
    """Retain the same 48 immutable identities through a real House upgrade."""
    code = '''import {createState,normalizeState,act,tick} from './harborlight-v1-state.js';
      import {housingStatus} from './harborlight-v1-housing.js';
      const at=Date.parse('2026-11-01T22:43:00Z');
      let state=createState(at);
      state.islandName='Przystań mieszkańców';state.tutorial.autoOpenDisabled=true;
      state.engagementSchedule.initialCompleted=true;
      state.engagementSchedule.initialAnchored=true;state.engagementSchedule.nextAt=1e12;
      state.buildings.townhall.level=2;state.population=48;
      state.resources={coins:100000,wood:1000,stone:1000,grain:1000,food:1000,planks:1000};
      state.welcome.until=0;delete state.houseHappinessPool;
      state=normalizeState(state,at);
      state.residents.forEach(person=>{person.happiness=35;person.newbornRemaining=0;
        person.unemployedSeconds=0;person.hungerSeconds=0;});
      const run=action=>{const result=act(state,action,state.worldTimeMs);
        if(!result.ok)throw Error(JSON.stringify({action,result}));return result;};
      run({type:'assign',building:'warehouse',delta:6});tick(state,120);
      if(%s){
        run({type:'upgrade',building:'house'});
        let elapsed=0;
        while(state.buildings.house.level<2&&elapsed<3600){tick(state,1);elapsed++;}
        if(state.buildings.house.level!==2||state.buildings.house.construction)
          throw Error('The real House construction did not finish');
        const midnight=Date.parse('2026-11-01T23:00:00Z');
        if(state.worldTimeMs>=midnight)throw Error('House missed the intended midnight fixture');
        tick(state,(midnight-state.worldTimeMs)/1000);
      }
      const housing=housingStatus(state),expected=%d;
      if(state.population!==48||state.capacity!==48||housing.beds!==expected||
        housing.foodDemandPerHour!==96-expected||state.houseHappinessPool.points!==expected)
        throw Error(JSON.stringify({housing,pool:state.houseHappinessPool,population:state.population}));
      console.log(JSON.stringify(state));''' % (json.dumps(completed_house), 48 if completed_house else 24)
    return json.loads(subprocess.run(
        ['node', '--input-type=module', '-e', code], cwd=SOURCE,
        capture_output=True, text=True, check=True).stdout)


def saved(page):
    # The normal lifecycle flush also persists harmless panel-visit progress.
    page.evaluate('window.dispatchEvent(new Event("pagehide"))')
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    return cloud.cloud_state(UID)


def close_panel(page):
    page.locator('#island-dialog .dialog-close').click()
    expect(page.locator('#island-dialog')).not_to_be_visible()


def house(page, mobile):
    if mobile:
        page.locator('[data-mobile-category="administration"]').click()
        page.locator('[data-mobile-building="house"]').click()
    else:
        page.locator('#hit-world-house').click()
    expect(page.locator('[data-building-panel="house"]')).to_be_visible()


def assert_roster(page, housed):
    page.locator('[data-resident-roster] summary').click()
    expect(page.locator('[data-resident-id]')).to_have_count(48)
    expect(page.locator('[data-resident-housing="housed"]')).to_have_count(housed)
    expect(page.locator('[data-resident-housing="unhoused"]')).to_have_count(48 - housed)
    for resident_id in [1, 24, 25, 48]:
        row = page.locator('[data-resident-id="%s"]' % resident_id)
        expect(row.locator('[data-resident-housing]')).to_have_attribute(
            'data-resident-housing', 'housed' if resident_id <= housed else 'unhoused')


def scenario(browser, language, mobile, completed_house):
    initial = model(completed_house)
    housed = 48 if completed_house else 24
    cloud.NOW = datetime.fromtimestamp(initial['worldTimeMs'] / 1000, tz=timezone.utc)
    cloud.DOCUMENTS.clear()
    cloud.DOCUMENTS[UID] = {'payload': json.dumps(initial), 'revision': 7,
                            'updateTime': cloud.timestamp()}
    error_start = len(cloud.ERRORS)
    context, page = cloud.context(browser, UID, language=language, mobile=mobile)
    try:
        assert page.goto(cloud.ORIGIN + '/harborlight-v1-layered.html?profile=new-player').ok
        page.wait_for_function('document.getElementById("loading").hidden')
        expect(page.locator('[data-hud="housing"]')).to_contain_text(str(housed))
        if mobile:
            page.locator('.mobile-island-menu').click()
            page.locator('#island-dialog').get_by_role(
                'button', name='Mieszkańcy' if language == 'pl' else 'Residents', exact=True).click()
        else:
            page.locator('#hit-population').click()
        expect(page.locator('.residents-panel')).to_be_visible()
        expect(page.locator('[data-population-stat="population"]')).to_have_text('48 / 48')
        expect(page.locator('[data-population-stat="capacity"]')).to_have_text('48')
        expect(page.locator('[data-population-stat="housing"]')).to_have_text(str(housed))
        expect(page.locator('[data-population-stat="unhoused"]')).to_have_text(str(48 - housed))
        expect(page.locator('[data-food-stat="demandValue"]')).to_have_text(str(96 - housed))
        notice = page.locator('[data-housing-warning]')
        expect(notice).to_have_attribute('data-overcrowded', str(not completed_house).lower())
        if completed_house:
            expect(notice).to_contain_text('48 / 48')
        else:
            expect(notice).to_contain_text('24')
            expect(notice).to_contain_text('połową wydajności' if language == 'pl' else 'half speed')
            expect(notice).to_contain_text('dwa razy' if language == 'pl' else 'twice')
            expect(page.locator('[data-population-stat="penalty"]')).to_contain_text(
                '×0,5' if language == 'pl' else '×0.5')
        # Housing changes work and meals for that subset. It must not describe
        # the retired island-wide happiness deduction as a continuing rule.
        housing_copy = notice.inner_text() + page.locator('[data-population-stat="penalty"]').inner_text()
        assert not re.search(r'(?:pp/h|p\.p\./h|percentage points|punkt\w* szczęścia na godzinę)', housing_copy, re.I), housing_copy
        assert_roster(page, housed)
        close_panel(page)

        house(page, mobile)
        expect(page.locator('[data-house-pool="points"]')).to_have_text(str(housed))
        expect(page.locator('[data-house-everyone]')).to_be_enabled()
        allocation = page.locator('[data-building-panel="house"] .pool-actions')
        people = allocation.locator('select')
        targets = sorted(int(value) for value in people.locator('option').evaluate_all(
            '(options)=>options.map(option=>option.value)'))
        assert targets == list(range(1, housed + 1)), targets
        if not completed_house:
            expect(people.locator('option[value="25"],option[value="48"]')).to_have_count(0)
        people.select_option('1')
        allocation.locator('input[type="number"]').fill('1')
        before = saved(page)
        page.locator('[data-house-allocate]').click()
        after = saved(page)
        assert after['houseHappinessPool']['points'] == housed - 1
        before_people = {person['id']: person for person in before['residents']}
        after_people = {person['id']: person for person in after['residents']}
        assert set(after_people) == set(before_people) == set(range(1, 49))
        assert [after_people[key]['personUid'] for key in sorted(after_people)] == [
            before_people[key]['personUid'] for key in sorted(before_people)]
        for resident_id in range(1, 49):
            delta = after_people[resident_id]['happiness'] - before_people[resident_id]['happiness']
            assert abs(delta - (1 if resident_id == 1 else 0)) < 1e-7, (resident_id, delta)
        assert after['population'] == 48 and after['buildings']['house']['level'] == (2 if completed_house else 1)
        expect(page.locator('[data-house-pool="points"]')).to_have_text(str(housed - 1))
        expect(page.locator('[data-house-everyone]')).to_be_disabled()
        cloud.no_island_cache(page)
        assert not cloud.ERRORS[error_start:], cloud.ERRORS[error_start:]
    finally:
        context.close()


def run():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
            headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    for completed_house in [False, True]:
                        scenario(browser, language, mobile, completed_house)
                        print('PASS housing case:', language, 'mobile' if mobile else 'desktop',
                              'House2 after midnight' if completed_house else 'House1 crowded', flush=True)
        finally:
            browser.close()
    print('PASS housing v27 actual game: 48 residents, independent 48-person cap, 24/48 beds and eligible daily points, 72/48 food per hour, stable bed badges and real cloud-saved point allocation; completed House and Warsaw-midnight renewal; PL/EN desktop/mobile')


if __name__ == '__main__':
    run()
