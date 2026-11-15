"""Actual-game housing acceptance against isolated Firebase REST responses.

The two legacy snapshots are created with the real model. The second House is
ordered and completed normally, then its pool renews at Warsaw midnight. Normal
official-cloud startup migrates both to the current housing and satiety rules,
while retaining their residents and already earned daily points. A new midnight
portion and collective allocation use the actual browser controls and clock.
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
from helpers.browser_offers import acknowledge_daily_offer, dismiss_player_offers

SOURCE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    'housing_v27_cloud', SOURCE / 'tests/harborlight-dev-game-smoke.py')
cloud = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cloud)
UID = 'dev-admin3'


def model(completed_house=False):
    """Keep the old 48-person save as input, including its earned 24/72 points."""
    code = '''import {createState,normalizeState,act,tick,recordVisit} from './harborlight-v1-state.js';
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
      const midnight=Date.parse('2026-11-01T23:00:00Z');
      if(%s){
        const project=run({type:'upgrade',building:'house'}).project;
        run({type:'premiumTransport',route:'construction',project:project.order});
        run({type:'premiumAccelerate',project:project.order,percent:100});tick(state,1);
        if(state.buildings.house.level!==2||state.buildings.house.construction)
          throw Error('The real House construction did not finish');
        if(state.worldTimeMs>=midnight)throw Error('House missed the intended midnight fixture');
        tick(state,(midnight-state.worldTimeMs)/1000);
      }else tick(state,(midnight-2000-state.worldTimeMs)/1000);
      // This saved login already used today's welcome opportunity at the old
      // full population cap. A later unrelated welcome grant must not change
      // the roster under this housing-only acceptance.
      recordVisit(state,state.worldTimeMs);
      // These old values belong to the legacy fixture, not the hosted runtime.
      const housing=housingStatus(state),expected=%d;
      if(state.ruleset===32||state.population!==48||state.capacity!==48||housing.beds!==expected||
        housing.foodDemandPerHour!==96-expected||state.houseHappinessPool.points!==24+(expected===48?48:0))
        throw Error(JSON.stringify({housing,pool:state.houseHappinessPool,population:state.population}));
      console.log(JSON.stringify(state));''' % (json.dumps(completed_house), 48 if completed_house else 24)
    return acknowledge_daily_offer(json.loads(subprocess.run(
        ['node', '--input-type=module', '-e', code], cwd=SOURCE,
        capture_output=True, text=True, check=True).stdout))


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
    for resident_id in [1, 24, 25, 36, 37, 48]:
        row = page.locator('[data-resident-id="%s"]' % resident_id)
        expect(row.locator('[data-resident-housing]')).to_have_attribute(
            'data-resident-housing', 'housed' if resident_id <= housed else 'unhoused')


def open_residents(page, language, mobile):
    if mobile:
        page.locator('.mobile-island-menu').click()
        page.locator('#island-dialog').get_by_role(
            'button', name='Mieszkańcy' if language == 'pl' else 'Residents', exact=True).click()
    else:
        page.locator('#hit-population').click()
    expect(page.locator('.residents-panel')).to_be_visible()


def assert_meals(page, demand, *, fed=True):
    # The current meals card replaces the retired one-Food-per-hour counters.
    # Its four metrics are demand in satiety, coverage, variety and protected
    # hourly reserve. Keep exact amounts, including the empty-stock case.
    meals = page.locator('.residents-panel .info-card').first
    expect(meals.locator('.stat strong')).to_have_count(4)
    expect(meals.locator('.stat strong').nth(0)).to_have_text(
        re.compile(r'^%d (?:pkt sytości|satiety points)$' % demand))
    expect(meals.locator('.stat strong').nth(1)).to_have_text('100%' if fed else '0%')
    expect(meals.locator('.stat strong').nth(2)).to_have_text('1')
    expect(meals.locator('.stat strong').nth(3)).to_have_text(
        re.compile(r'^%d / %d (?:pkt|points)$' % (demand if fed else 0, demand)))


def scenario(browser, language, mobile, completed_house):
    initial = model(completed_house)
    beds = 72 if completed_house else 36
    housed = min(48, beds)
    cloud.NOW = datetime.fromtimestamp(initial['worldTimeMs'] / 1000, tz=timezone.utc)
    cloud.DOCUMENTS.clear()
    cloud.DOCUMENTS[UID] = {'payload': json.dumps(initial), 'revision': 7,
                            'updateTime': cloud.timestamp()}
    error_start = len(cloud.ERRORS)
    context, page = cloud.context(browser, UID, language=language, mobile=mobile)
    try:
        assert page.goto(cloud.ORIGIN + '/harborlight-v1-layered.html?profile=new-player').ok
        page.wait_for_function('document.getElementById("loading").hidden')
        expect(page.locator('[data-hud="housing"]')).to_contain_text(str(beds))
        open_residents(page, language, mobile)
        expect(page.locator('[data-population-stat="population"]')).to_have_text('48 / 72')
        expect(page.locator('[data-population-stat="capacity"]')).to_have_text('72')
        expect(page.locator('[data-population-stat="housing"]')).to_have_text(str(beds))
        expect(page.locator('[data-population-stat="unhoused"]')).to_have_text(str(48 - housed))
        housing_card = page.locator('.info-card').filter(has=page.locator('[data-population-stat="capacity"]'))
        expect(housing_card).to_contain_text(
            'Limit populacji = 36 × poziom Ratusza. Miejsca mieszkalne = 36 × poziom Domu.' if language == 'pl'
            else 'Population capacity = 36 × Town Hall level. Housing = 36 × House level.')
        assert not re.search(r'24\s*[×x]', housing_card.inner_text()), housing_card.inner_text()
        assert_meals(page, 6 * (96 - housed))
        notice = page.locator('[data-housing-warning]')
        expect(notice).to_have_attribute('data-overcrowded', str(not completed_house).lower())
        if completed_house:
            expect(notice).to_contain_text('48 / 72')
        else:
            expect(notice).to_contain_text('12')
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
        bank_points = 24 + (48 if completed_house else 0)
        expect(page.locator('[data-house-pool="points"]')).to_have_text(str(bank_points))
        migrated = saved(page)
        assert migrated['ruleset'] == 32 and migrated['capacity'] == 72
        assert migrated['houseHappinessPool']['portions'] == initial['houseHappinessPool']['portions'], 'Migration must not replace already earned daily portions'
        assert [(p['id'], p['personUid']) for p in migrated['residents']] == [
            (p['id'], p['personUid']) for p in initial['residents']]
        if not completed_house:
            # The legacy 24 points are retained, not inflated to the new 36
            # housed residents. Incomplete collective rounds stay in the bank.
            expect(page.locator('[data-house-everyone]')).to_be_disabled()
            page.clock.run_for(2000)
            dismiss_player_offers(page)
            bank_points += housed
            expect(page.locator('[data-house-pool="points"]')).to_have_text(str(bank_points))
            renewed = saved(page)
            assert renewed['houseHappinessPool']['portions'] == initial['houseHappinessPool']['portions'] + [{
                'points': 36, 'population': 36, 'day': '2026-11-01', 'legacy': False}]
        expect(page.locator('[data-house-everyone]')).to_be_enabled()
        expect(page.locator('[data-house-allocate]')).to_have_count(0)
        before = saved(page)
        page.locator('[data-house-everyone]').click()
        after = saved(page)
        assert after['houseHappinessPool']['points'] == bank_points - housed
        before_people = {person['id']: person for person in before['residents']}
        after_people = {person['id']: person for person in after['residents']}
        assert set(after_people) == set(before_people) == set(range(1, 49))
        assert [after_people[key]['personUid'] for key in sorted(after_people)] == [
            before_people[key]['personUid'] for key in sorted(before_people)]
        for resident_id in range(1, 49):
            delta = after_people[resident_id]['happiness'] - before_people[resident_id]['happiness']
            assert abs(delta - (1 if resident_id <= housed else 0)) < 1e-7, (resident_id, delta)
        assert after['population'] == 48 and after['buildings']['house']['level'] == (2 if completed_house else 1)
        expect(page.locator('[data-house-pool="points"]')).to_have_text(str(bank_points - housed))
        expect(page.locator('[data-house-everyone]')).to_be_disabled()
        cloud.no_island_cache(page)
        assert not cloud.ERRORS[error_start:], cloud.ERRORS[error_start:]
    finally:
        context.close()


def no_food_scenario(browser):
    """Non-food stock must not cover the migrated hourly satiety reserve."""
    initial = model()
    initial['resources']['grain'] = initial['resources']['food'] = 0
    initial['foodCredit'] = 0
    cloud.NOW = datetime.fromtimestamp(initial['worldTimeMs'] / 1000, tz=timezone.utc)
    cloud.DOCUMENTS.clear()
    cloud.DOCUMENTS[UID] = {'payload': json.dumps(initial), 'revision': 7,
                            'updateTime': cloud.timestamp()}
    error_start = len(cloud.ERRORS)
    context, page = cloud.context(browser, UID, language='pl')
    try:
        assert page.goto(cloud.ORIGIN + '/harborlight-v1-layered.html').ok
        page.wait_for_function('document.getElementById("loading").hidden')
        open_residents(page, 'pl', False)
        assert_meals(page, 360, fed=False)
        expect(page.locator('[data-population-stat="housing"]')).to_have_text('36')
        expect(page.locator('[data-population-stat="unhoused"]')).to_have_text('12')
        migrated = saved(page)
        assert migrated['ruleset'] == 32 and migrated['population'] == 48
        assert migrated['resources']['coins'] > 0 and migrated['resources']['wood'] > 0
        # The save may compact person profiles. Hydrate a detached copy using
        # the public decoder, never a live game state getter or array offsets.
        feeding = page.evaluate('''async snapshot => {
          const {normalizeProvisions,feedingMultiplier}=await import('./harborlight-v1-provisions.js?v=frontend-v32-10');
          normalizeProvisions(snapshot);
          return {coverage:Object.values(snapshot.provisions.people).map(p=>p.coverage),
                  multiplier:feedingMultiplier(snapshot)};
        }''', migrated)
        assert feeding['coverage'] == [0] * 48
        assert feeding['multiplier'] == 0.5
        assert migrated['houseHappinessPool']['points'] == 24
        assert [(p['id'], p['personUid']) for p in migrated['residents']] == [
            (p['id'], p['personUid']) for p in initial['residents']]
        cloud.no_island_cache(page)
        assert not cloud.ERRORS[error_start:], cloud.ERRORS[error_start:]
    finally:
        context.close()
    print('PASS housing empty-food migration: 360 satiety/h required, 0% meal coverage and 0/360 protected reserve; non-food goods, 48 identities and 24 earned points preserved', flush=True)


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
            no_food_scenario(browser)
        finally:
            browser.close()
    print('PASS housing legacy→current32 actual game: 48 stable residents, TH2 capacity72, House1/2 beds36/72, 360/288 satiety per hour and protected reserve; earned24/72 points preserved, incomplete rounds retained, current36-point Warsaw-midnight portion and real cloud-saved collective allocation; no-food coverage0%; PL/EN desktop/mobile')


if __name__ == '__main__':
    run()
