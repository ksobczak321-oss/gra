"""Packaged v21 acceptance with isolated account and cloud responses.

The real public game runs in Chromium; only Firebase identities/documents are
fixtures. No real island, payment provider or Cloud project is accessed.
"""
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('v21_cloud_fixture', SOURCE / 'tests/harborlight-dev-game-smoke.py')
cloud = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cloud)
UID = 'dev-admin2'
START = int(cloud.NOW.timestamp() * 1000)


def world(mode='copy', population=12):
    script = '''
      import {createState,normalizeState} from './harborlight-v1-state.js';
      import * as Progression from './harborlight-v1-progression.js';
      let s=createState(%d);
      s.islandName='Port Zachowanego Postępu';
      s.tutorial={...s.tutorial,version:3,autoOpenDisabled:true,completed:{},claimed:{},chests:{}};
      for(const row of Progression.tutorialRows(s)){s.tutorial.completed[row.id]=true;s.tutorial.claimed[row.id]=true;}
      s.tutorial.chests={};
      s.engagementSchedule.initialCompleted=true;s.engagementSchedule.initialAnchored=true;
      s.engagementSchedule.nextAt=1000000000;
      s.buildings.townhall.level=%d;
      s.buildings.house.level=3;s.buildings.warehouse.level=3;s.buildings.chapel.level=3;
      s.population=%d;
      s.resources={coins:1000000,wood:1000,stone:537,grain:500,food:1000,planks:1000};
      if(['gate','archipelago'].includes(%s)){
        s.resources={coins:1000000,wood:100000,stone:100000,grain:100000,food:100000,planks:100000};
        s.bonusMaterials={wood:99000,stone:99000,grain:99000,food:99000,planks:99000};
      }
      s.statistics.expeditions=7;s.statistics.traded=3;
      s=normalizeState(s,%d);
      console.log(JSON.stringify(s));
    ''' % (START, 6 if mode == 'peer' else 10 if mode == 'archipelago' else 3,
           24 if mode == 'archipelago' and population == 12 else population, json.dumps(mode), START)
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', script], cwd=SOURCE,
                                     capture_output=True, text=True, check=True).stdout)


def enter(browser, state, *, mobile=False):
    for key in list(cloud.DOCUMENTS):
        if key.startswith(UID + '/worlds/'):
            del cloud.DOCUMENTS[key]
    cloud.DOCUMENTS[UID] = {'payload': json.dumps(state), 'revision': 5, 'updateTime': cloud.timestamp()}
    context, page = cloud.context(browser, UID, mobile=mobile)
    cloud.visit(page)
    page.wait_for_function("['saved','pending'].includes(document.body.dataset.cloudStatus)")
    return context, page


def close_panel(page):
    if page.locator('#island-dialog').evaluate('(node)=>node.open'):
        page.locator('#island-dialog .dialog-close').click()


def building(page, name):
    close_panel(page)
    page.locator('#hit-world-' + name).click()
    expect(page.locator('[data-building-panel="' + name + '"]')).to_be_visible()


def exact_history():
    value = cloud.cloud_state(UID)
    assert value['islandName'] == 'Port Zachowanego Postępu'
    assert value['statistics']['expeditions'] == 7
    assert value['statistics']['traded'] == 3


def confirmed_island(page, island_id):
    # Switching is acknowledged before its overview opens. Opening that panel
    # can queue a separate harmless visit event; pending is not an unconfirmed
    # switch and must not be confused with the saving/error states.
    expect(page.locator('body')).to_have_attribute('data-active-island', island_id)
    expect(page.locator('body')).to_have_attribute('data-cloud-status', re.compile(r'^(saved|pending)$'))
    assert cloud.cloud_state(UID)['archipelago']['activeIslandId'] == island_id


def resource_notation_and_payment(browser):
    context, page = enter(browser, world())
    page.locator('#hit-category-resources').click()
    expect(page.locator('[data-dock-staffing="stone"]')).to_have_text(re.compile(r'0\s*/\s*537\s*\(\s*0\s*\)'))
    expect(page.locator('[data-resource-trend="stone"]')).to_contain_text(re.compile(r'0\s+(?:szt\./(?:h|godz\.)|units/h)'))
    page.locator('[data-dock-resource="stone"]').click()
    close_panel(page)
    page.locator('#hit-resource-coins').click()
    notation = page.locator('[data-resource-notation]')
    expect(notation).to_contain_text('537')
    expect(notation).to_contain_text('Kamieniołomie')
    expect(notation).to_contain_text('magazynie centralnym')
    expect(notation).to_contain_text('w transporcie')
    expect(notation).to_contain_text('bilans godzinowy')
    taxes = page.locator('[data-treasury-income]')
    for text in ['Podatki', 'rzeczywiście dotarli', 'Wolni mieszkańcy', 'reklama', '50, 100, 200, 400', '50, 150, 350, 750']:
        expect(taxes).to_contain_text(text)
    building(page, 'sawmill')
    premium = page.locator('.compact-building-premium')
    expect(premium.locator('[data-paynow-kind]')).to_have_count(1)
    expect(premium.locator('[data-paynow-kind="building"]')).to_be_visible()
    assert not premium.locator('[data-paynow-kind="transport"]').count()
    cloud.no_island_cache(page)
    context.close()
    print('PASS21 resource notation, hourly balance, tax/ad/minigame explanation and exactly one building Paynow payment', flush=True)


def house_and_chapel(browser):
    context, page = enter(browser, world())
    building(page, 'house')
    guide = page.locator('[data-house-population-guide]')
    for text in ['pięć minut', 'Szczęście steruje populacją', '0%', 'minimum dwunastu osób na matce lub sześciu na córce', 'Ratusz', 'łóżka']:
        expect(guide).to_contain_text(text)
    assignments = page.locator('[data-house-worker-assignments]')
    expect(assignments.locator('[data-worker-building="farm"][data-worker-delta="1"]')).to_be_visible()
    assignments.locator('[data-worker-building="farm"][data-worker-delta="1"]').click()
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    assert cloud.cloud_state(UID)['buildings']['farm']['workers'] == 1
    points = int(page.locator('[data-house-pool="points"]').inner_text().replace(' ', ''))
    page.locator('[data-house-allocate]').click()
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    assert cloud.cloud_state(UID)['houseHappinessPool']['points'] == points - 1
    building(page, 'chapel')
    chapel = page.locator('[data-chapel-grace-wrath]')
    for text in ['Łaska i gniew', 'losowe', '6 dni', '6–15', 'dżuma', 'Latarnia']:
        expect(chapel).to_contain_text(text)
    expect(page.locator('[data-blessing]')).to_be_enabled()
    page.locator('[data-blessing]').click()
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    assert cloud.cloud_state(UID)['blessingRemaining'] > 0
    expect(page.locator('[data-blessing]')).to_be_disabled()
    exact_history()
    cloud.no_island_cache(page)
    context.close()
    print('PASS21 House actual worker assignment and daily happiness spending; Chapel explains and performs its real blessing', flush=True)


def townhall_population_gate(browser):
    context, page = enter(browser, world('gate', population=53))
    building(page, 'townhall')
    expect(page.locator('[data-townhall-population-prerequisite]')).to_contain_text('54')
    expect(page.locator('[data-upgrade-building="townhall"]')).to_be_disabled()
    building(page, 'quarry')
    expect(page.locator('[data-upgrade-building="quarry"]')).to_be_enabled()
    context.close()
    context, page = enter(browser, world('gate', population=54))
    building(page, 'townhall')
    expect(page.locator('[data-upgrade-building="townhall"]')).to_be_enabled()
    page.locator('[data-upgrade-building="townhall"]').click()
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    assert cloud.cloud_state(UID)['constructionProjects'][0]['building'] == 'townhall'
    exact_history()
    cloud.no_island_cache(page)
    context.close()
    print('PASS21 Town Hall3→4 requires54 of72 residents; the population rule does not block another building', flush=True)


def peer_market_gate(browser):
    previous = world('peer')
    previous['buildings']['townhall']['level'] = 5
    context, page = enter(browser, previous)
    building(page, 'market')
    page.locator('[data-market-entry]').click()
    expect(page.locator('[data-market-exchange]')).to_be_visible()
    assert not page.locator('[data-player-trade]').count()
    context.close()

    context, page = enter(browser, world('peer'))
    building(page, 'market')
    page.locator('[data-market-entry]').click()
    expect(page.locator('[data-player-trade]')).to_be_visible()
    expect(page.locator('[data-player-trade-unavailable]')).to_have_text('Handel między graczami wymaga konta gry i uruchomionej usługi handlu. W tym podglądzie nie jest jeszcze dostępny.')
    expect(page.locator('[data-market-exchange]')).to_be_visible()
    assert not page.locator('[data-create-trade-offer]').count(), 'An unconfigured service must not expose a fake successful offer form'
    close_panel(page)
    page.locator('#hit-boat').click()
    expect(page.locator('[data-player-trade]')).to_be_visible()
    expect(page.locator('[data-player-trade-unavailable]')).to_be_visible()
    assert page.locator('#island-dialog').get_by_role('button', name=re.compile(r'^(Kup|Sprzedaj|Buy|Sell) 100')).count() > 0
    exact_history()
    cloud.no_island_cache(page)
    context.close()
    print('PASS24 level6 keeps NPC Market/Harbor alongside player coin sales; unavailable API is explained honestly', flush=True)


def open_archipelago(page):
    close_panel(page)
    page.locator('#hit-home').click()
    page.locator('[data-archipelago-open]').click()
    expect(page.locator('[data-archipelago-panel]')).to_be_visible()


def archipelago_cloud_and_shipping(browser):
    low = world('archipelago')
    low['buildings']['townhall']['level'] = 9
    context, page = enter(browser, low)
    open_archipelago(page)
    expect(page.locator('[data-create-second-island-confirm]')).to_have_count(0)
    context.close()

    short = world('archipelago')
    short['population'] = 12
    short['residents'] = short['residents'][:12]
    context, page = enter(browser, short)
    open_archipelago(page)
    expect(page.locator('[data-archipelago-panel]')).to_contain_text('Założenie wymaga 18 mieszkańców na matce')
    expect(page.locator('[data-create-second-island-confirm]')).to_be_disabled()
    context.close()

    missing = world('archipelago')
    missing['resources']['wood'] = 0
    missing['bonusMaterials']['wood'] = 0
    context, page = enter(browser, missing)
    open_archipelago(page)
    expect(page.locator('[data-archipelago-panel]')).to_contain_text('Założenie wymaga wskazanego łącznego kosztu')
    expect(page.locator('[data-create-second-island-confirm]')).to_be_disabled()
    context.close()

    original = world('archipelago')
    context, page = enter(browser, original)
    open_archipelago(page)
    expect(page.locator('[data-create-second-island-confirm]')).to_be_enabled()
    expect(page.locator('[data-archipelago-panel]')).to_contain_text('Monety')
    expect(page.locator('[data-archipelago-panel]')).to_contain_text('Drewno')
    page.locator('[data-second-island-name]').fill('Wyspa Bursztynowa')
    page.locator('[data-create-second-island-confirm]').click()
    expect(page.locator('[data-switch-island="island-2"]')).to_be_enabled()
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    both = cloud.cloud_state(UID)
    second = both['archipelago']['islands']['island-2']
    assert second['islandName'] == 'Port Zachowanego Postępu - Wyspa Bursztynowa'
    assert second['population'] == 6 and both['population'] == 18
    assert second['buildings']['townhall']['level'] == 10
    assert second['buildings']['warehouse']['level'] == original['buildings']['warehouse']['level'] == 3
    assert all(value['level'] == 1 for key, value in second['buildings'].items() if key not in ['townhall', 'warehouse'])
    assert not second['lighthouseRemaining'], 'Second-island Lighthouse1 must not manufacture a restoration reward'
    assert both['welcome'] == original['welcome'], 'Founding another world must not restart account welcome protection'
    assert 'welcome' not in second or second['welcome'] == both['welcome'], 'The second world must use the account welcome window'
    assert both['archipelago']['shipCapacity'] == 1000
    expect(page.locator('[data-create-second-island]')).to_have_count(0)

    primary_filter = page.locator('#worldLayer').evaluate('(node)=>getComputedStyle(node).filter')
    page.locator('[data-switch-island="island-2"]').click()
    confirmed_island(page, 'island-2')
    expect(page).to_have_title('Port Zachowanego Postępu - Wyspa Bursztynowa — HARBORLIGHT')
    expect(page.locator('#island-dialog .eyebrow')).to_have_text('HARBORLIGHT · WYSPA 02')
    second_filter = page.locator('#worldLayer').evaluate('(node)=>getComputedStyle(node).filter')
    assert second_filter != primary_filter, 'The second island must have a visibly distinct palette'
    page.screenshot(path='/tmp/harborlight-v21-second-island.png')
    page.locator('[data-switch-island="island-1"]').click()
    confirmed_island(page, 'island-1')
    assert cloud.cloud_state(UID)['resources']['wood'] == original['resources']['wood'] - 21000

    # Ordinary material physically leaves the source once and reaches the
    # other island after10 real minutes, without a coin charge.
    page.locator('[data-island-cargo="wood"]').fill('100')
    page.locator('[data-send-island-transfer]').click()
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    sent = cloud.cloud_state(UID)
    voyage = sent['archipelago']['transfers'][0]
    assert voyage['arrivesAt'] - voyage['departedAt'] == 600000
    assert voyage['capacityAtDeparture'] == 1000
    assert sent['resources']['wood'] == original['resources']['wood'] - 21000 - 100
    assert sent['archipelago']['islands']['island-2']['resources']['wood'] == 0
    assert sent['resources']['coins'] == original['resources']['coins'] - 21000
    expect(page.locator('[data-island-voyage-status]')).to_contain_text('Rejs')
    page.clock.fast_forward(599000)
    expect(page.locator('[data-island-voyage-status]')).to_contain_text('1 s')
    page.clock.run_for(1000)
    page.locator('[data-switch-island="island-2"]').click()
    confirmed_island(page, 'island-2')
    delivered = cloud.cloud_state(UID)
    assert delivered['archipelago']['transfers'][0]['status'] == 'complete'
    assert delivered['archipelago']['islands']['island-2']['resources']['wood'] == 100
    assert delivered['resources']['wood'] == original['resources']['wood'] - 21000 - 100
    exact_history()

    page.reload()
    page.wait_for_function("document.body.dataset.activeIsland==='island-2'")
    page.wait_for_function('document.getElementById("loading").hidden')
    open_archipelago(page)
    assert cloud.cloud_state(UID)['archipelago']['islands']['island-2']['resources']['wood'] == 100
    expect(page.locator('[data-ship-capacity]')).to_have_text('1000')
    page.locator('[data-ship-capacity-units]').fill('1000')
    page.locator('[data-ship-capacity-payment]').click()
    expect(page.locator('#ship-capacity-checkout')).to_contain_text('SYMULACJA')
    expect(page.locator('[data-ship-capacity-price]')).to_contain_text('4,99')
    page.locator('[data-confirm-ship-capacity-payment]').click()
    expect(page.locator('#ship-capacity-checkout')).not_to_be_visible()
    expect(page.locator('[data-ship-capacity]')).to_have_text('2000')
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    paid = cloud.cloud_state(UID)
    assert paid['archipelago']['shipCapacity'] == 2000
    assert len(paid['archipelago']['capacityReceipts']) == 1
    assert paid['archipelago']['capacityReceipts'][0]['grossGrosz'] == 499
    assert paid['commerce']['receipts'][-1]['kind'] == 'ship-capacity'
    assert paid['resources']['coins'] == original['resources']['coins'] - 21000
    assert paid['archipelago']['islands']['island-2']['resources']['coins'] == 0
    page.reload()
    page.wait_for_function("document.body.dataset.activeIsland==='island-2'")
    open_archipelago(page)
    expect(page.locator('[data-ship-capacity]')).to_have_text('2000')
    assert len(cloud.cloud_state(UID)['archipelago']['capacityReceipts']) == 1
    assert cloud.cloud_state(UID)['archipelago']['islands']['island-2']['resources']['wood'] == 100
    # The paid cargo expansion does not expand the distinct100-passenger hold.
    page.locator('[data-switch-island="island-1"]').click()
    confirmed_island(page, 'island-1')
    page.locator('[data-island-passenger-amount]').fill('2')
    page.locator('[data-send-island-passengers]').click()
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    moving = cloud.cloud_state(UID)
    passenger = moving['archipelago']['transfers'][-1]
    assert passenger['mode'] == 'passengers' and passenger['capacityAtDeparture'] == 100
    assert passenger['passengerCount'] == 2 and passenger['mealFood'] == 1
    assert passenger['arrivesAt'] - passenger['departedAt'] == 1800000
    assert moving['population'] == 16 and moving['archipelago']['islands']['island-2']['population'] == 6
    page.clock.fast_forward(1200000)
    page.locator('[data-archipelago-panel] h3').first.click()  # Real pointer input renews the inactivity deadline.
    page.clock.fast_forward(600000)
    page.locator('[data-switch-island="island-2"]').click()
    confirmed_island(page, 'island-2')
    arrived = cloud.cloud_state(UID)
    assert arrived['archipelago']['transfers'][-1]['status'] == 'complete'
    assert arrived['archipelago']['islands']['island-2']['population'] == 8
    identities = [person['personUid'] for person in arrived['residents']] + [person['personUid'] for person in arrived['archipelago']['islands']['island-2']['residents']]
    assert len(identities) == len(set(identities)) == 24
    assert arrived['resources']['coins'] == original['resources']['coins'] - 21000
    exact_history()
    cloud.no_island_cache(page)
    context.close()
    print('PASS24 funded TownHall10 founding, six actual colonists, prefix, copied levels, bounded cloud docs, free10-minute cargo and499gr simulated capacity exactly once', flush=True)


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                     headless=True, args=['--no-sandbox'])
        try:
            resource_notation_and_payment(browser)
            house_and_chapel(browser)
            townhall_population_gate(browser)
            peer_market_gate(browser)
            archipelago_cloud_and_shipping(browser)
            assert not cloud.ERRORS, cloud.ERRORS
        finally:
            browser.close()


if __name__ == '__main__':
    run()
