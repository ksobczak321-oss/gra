"""First-login introduction and persisted, paused island walkthrough.

Actual packaged assets run against isolated Firebase REST responses. No real
account, island, or authentication provider is accessed or changed.
"""
import importlib.util
import json
import os
from pathlib import Path
import subprocess

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('onboarding_cloud_fixture', SOURCE / 'tests/harborlight-dev-game-smoke.py')
cloud = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cloud)
UID = 'dev-admin2'
START = int(cloud.NOW.timestamp() * 1000)
BUILDINGS = ['townhall', 'house', 'farm', 'windmill', 'quarry', 'lumber', 'sawmill', 'warehouse', 'market', 'dock', 'chapel', 'lighthouse']


def starter():
    source = "import {createState} from './harborlight-v1-state.js'; console.log(JSON.stringify(createState(%d,{onboarding:true})));" % START
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', source], cwd=SOURCE,
                                    capture_output=True, text=True, check=True).stdout)


def seed(value):
    cloud.DOCUMENTS[UID] = {'payload': json.dumps(value), 'revision': 3, 'updateTime': cloud.timestamp()}


def enter(browser, *, language='pl', mobile=False):
    context, page = cloud.context(browser, UID, language=language, mobile=mobile)
    page.goto(cloud.ORIGIN + '/harborlight-v1-layered.html?profile=new-player')
    page.wait_for_function('document.getElementById("loading").hidden')
    return context, page


def saved(page):
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    return cloud.cloud_state(UID)


def bounded(page, locator):
    expect(locator).to_be_visible()
    box = locator.bounding_box()
    assert box, 'Expected a rendered onboarding target/card'
    viewport = page.viewport_size
    assert box['x'] >= -1 and box['y'] >= -1, box
    assert box['x'] + box['width'] <= viewport['width'] + 1, box
    assert box['y'] + box['height'] <= viewport['height'] + 1, box


def frozen(value, original):
    assert value['worldTimeMs'] == original['worldTimeMs'], 'Island world time advanced before the tour finished'
    assert value['lastSimulatedAt'] == original['lastSimulatedAt']
    assert value['resources'] == original['resources'], 'Food/stock changed before play began'
    assert value['population'] == original['population'] == 12
    assert value['welcome'] == original['welcome'], 'Welcome protection was consumed during onboarding'
    assert value['tutorial']['completed'] == {}, 'A tour explanation must not complete a tutorial action'
    assert value['engagementSchedule']['activeSeconds'] == 0, 'Forced activity scheduling started too soon'
    assert value['onboarding']['worldStartedAt'] is None


def name_island(page, name):
    guide = page.locator('[data-island-onboarding]')
    expect(guide).to_have_attribute('data-onboarding-stage', 'intro')
    expect(page.locator('[data-onboarding-paused]')).to_be_visible()
    assert page.locator('[data-tutorial-current]').count() == 0
    page.locator('[data-onboarding-next]').click()
    expect(guide).to_have_attribute('data-onboarding-stage', 'name')
    page.locator('[data-onboarding-name]').fill('x')
    page.locator('[data-onboarding-next]').click()
    expect(guide).to_have_attribute('data-onboarding-stage', 'name')
    page.locator('[data-onboarding-name]').fill(name)
    page.locator('[data-onboarding-next]').click()
    expect(guide).to_have_attribute('data-onboarding-stage', 'tour')
    page.clock.run_for(32)  # Flush the spotlight positioning animation frame.
    return guide


def persisted_tour_and_skip(browser):
    original = starter()
    seed(original)
    context, page = enter(browser)
    guide = name_island(page, 'Port Żółtej Latarni')
    first_step = guide.get_attribute('data-onboarding-step')
    assert first_step
    expect(page.locator('[data-onboarding-previous]')).to_be_disabled()
    bounded(page, page.locator('[data-onboarding-card]'))
    bounded(page, page.locator('[data-onboarding-highlight]'))
    frozen(saved(page), original)

    # Tour navigation only explains controls. It cannot buy, upgrade, or assign
    # anyone, and the regular 25-step tutorial remains untouched.
    page.locator('[data-onboarding-next]').click()
    expect(guide).not_to_have_attribute('data-onboarding-step', first_step)
    second_step = guide.get_attribute('data-onboarding-step')
    assert second_step != first_step
    page.locator('[data-onboarding-previous]').click()
    expect(guide).to_have_attribute('data-onboarding-step', first_step)
    page.locator('[data-onboarding-next]').click()
    expect(guide).to_have_attribute('data-onboarding-step', second_step)
    # Follow the real tour arrows through the requested HUD order, then return
    # to the same saved step before checking resume-after-reload behaviour.
    for expected in ['happiness', 'coins', 'population']:
        page.locator('[data-onboarding-next]').click()
        expect(guide).to_have_attribute('data-onboarding-step', expected)
    for expected in ['coins', 'happiness', 'level']:
        page.locator('[data-onboarding-previous]').click()
        expect(guide).to_have_attribute('data-onboarding-step', expected)
    page.clock.run_for(61000)
    frozen(saved(page), original)
    assert cloud.cloud_state(UID)['islandName'] == 'Port Żółtej Latarni'
    expected_index = cloud.cloud_state(UID)['onboarding']['index']

    page.reload()
    page.wait_for_function('document.getElementById("loading").hidden')
    guide = page.locator('[data-island-onboarding]')
    expect(guide).to_have_attribute('data-onboarding-stage', 'tour')
    expect(guide).to_have_attribute('data-onboarding-step', second_step)
    assert saved(page)['onboarding']['index'] == expected_index
    frozen(saved(page), original)
    cloud.no_island_cache(page)

    # Leaving the walkthrough is the explicit start of real island time.
    now = page.evaluate('Date.now()')
    page.locator('[data-onboarding-exit]').click()
    expect(guide).not_to_be_visible()
    started = cloud.cloud_state(UID)
    assert started['onboarding']['stage'] == 'complete'
    assert started['onboarding']['worldStartedAt'] == now
    assert started['welcome']['startedAt'] == now
    assert started['welcome']['until'] - now == 72 * 3600 * 1000
    expect(page.locator('[data-tutorial-current]')).to_be_visible()
    page.clock.run_for(31000)
    progressed = cloud.cloud_state(UID)
    assert progressed['worldTimeMs'] >= now + 28000
    assert progressed['resources']['food'] < original['resources']['food']
    assert progressed['onboarding']['worldStartedAt'] == now
    cloud.no_island_cache(page)
    context.close()
    print('PASS20 persisted intro/name/arrows, frozen clocks across reload, explicit exit starts time and regular tutorial', flush=True)


def complete_mobile_tour(browser):
    seed(starter())
    context, page = enter(browser, language='en', mobile=True)
    guide = name_island(page, 'Harbor Breeze')
    ids = []
    for _ in range(100):
        step_id = guide.get_attribute('data-onboarding-step')
        assert step_id and step_id not in ids, 'The walkthrough repeated a step instead of finishing'
        ids.append(step_id)
        page.clock.run_for(32)
        for selector in ['[data-onboarding-card]', '[data-onboarding-highlight]', '[data-onboarding-next]', '[data-onboarding-previous]', '[data-onboarding-exit]']:
            bounded(page, page.locator(selector))
        previous = page.locator('[data-onboarding-previous]').bounding_box()
        following = page.locator('[data-onboarding-next]').bounding_box()
        close = page.locator('[data-onboarding-exit]').bounding_box()
        assert previous['x'] < following['x'], 'Back and next arrows must retain left/right order'
        assert close['y'] < following['y'], 'The exit control belongs above the bottom navigation arrows'
        assert page.locator('[data-onboarding-title]').inner_text().strip()
        assert page.locator('[data-onboarding-card]').evaluate('(n)=>n.scrollWidth <= n.clientWidth + 1')
        assert not page.locator('[data-tutorial-current]').count()
        final_step = page.locator('[data-onboarding-next]').inner_text().startswith('Start playing')
        page.locator('[data-onboarding-next]').click()
        if final_step:
            expect(guide).not_to_be_visible()
            break
        expect(guide).not_to_have_attribute('data-onboarding-step', step_id)
    else:
        raise AssertionError('The complete walkthrough did not finish in100 steps')
    assert len(ids) >= 25, ids
    assert ids[:6] == ['home', 'level', 'happiness', 'coins', 'population', 'working'], ids[:6]
    for building in BUILDINGS:
        assert any(building in step_id for step_id in ids), (building, ids)
    for expected in ['home', 'level', 'happiness', 'coins', 'population', 'working', 'arrival', 'points', 'clock', 'administration', 'economy', 'resources', 'decorations', 'paths', 'settings', 'tutorial']:
        assert any(expected in step_id for step_id in ids), (expected, ids)
    assert cloud.cloud_state(UID)['onboarding']['stage'] == 'complete'
    expect(page.locator('[data-tutorial-current]')).to_be_visible()
    cloud.no_island_cache(page)
    context.close()
    print('PASS20 complete English mobile tour: every HUD control, building and bottom category, visible spotlight/arrows and no horizontal overflow', flush=True)


def existing_history(browser):
    old = cloud.starter(777, 'Historia bez zmian')
    old.pop('onboarding', None)  # A real pre-v20 cloud save has no new marker.
    old['buildings']['townhall']['level'] = 4
    old['buildings']['farm']['ready'] = 17
    old['statistics']['expeditions'] = 7
    old['tutorial']['completed']['rules-read'] = True
    old['tutorial']['claimed']['rules-read'] = True
    seed(old)
    context, page = enter(browser)
    assert page.locator('[data-island-onboarding]').count() == 0
    cloud.settings(page)
    expect(page.locator('[data-settings-signout]')).to_be_visible()
    assert not page.locator('[data-dev-account],[data-cloud-save-now],[data-cloud-reload],[data-cloud-save-status]').count()
    cloud.save_cloud(page)
    value = cloud.cloud_state(UID)
    assert value['islandName'] == old['islandName']
    assert value['resources']['coins'] == 777
    assert value['buildings']['townhall']['level'] == 4
    assert value['buildings']['farm']['ready'] == 17
    assert value['statistics']['expeditions'] == 7
    assert value['tutorial']['completed']['rules-read']
    assert value['tutorial']['claimed']['rules-read']
    assert value['onboarding']['stage'] == 'complete'
    cloud.no_island_cache(page)
    context.close()
    print('PASS20 legacy cloud island skips first-time tour and preserves existing tutorial/building/history data; Settings has logout only for session controls', flush=True)


def lost_finish_acknowledgement(browser):
    seed(starter())
    context, page = cloud.context(browser, UID)
    interrupted = {'done': False}

    def firestore(route):
        if route.request.method == 'POST' and not interrupted['done']:
            fields = route.request.post_data_json['writes'][0]['update']['fields']
            payload = json.loads(fields['payload']['stringValue'])
            if payload.get('onboarding', {}).get('stage') == 'complete':
                interrupted['done'] = True

                class LostResponse:
                    request = route.request

                    def fulfill(self, **_kwargs):
                        # The exact application snapshot was committed by the
                        # fixture, but its successful HTTP response was lost.
                        return route.abort('connectionreset')

                return cloud.firebase(LostResponse())
        return cloud.firebase(route)

    context.route('https://firestore.googleapis.com/**', firestore)
    page.goto(cloud.ORIGIN + '/harborlight-v1-layered.html?profile=new-player')
    page.wait_for_function('document.getElementById("loading").hidden')
    guide = name_island(page, 'Port po utracie odpowiedzi')
    page.locator('[data-onboarding-exit]').click()
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'offline')
    assert interrupted['done']
    committed = cloud.cloud_state(UID)
    assert committed['onboarding']['stage'] == 'complete'
    revision = cloud.DOCUMENTS[UID]['revision']
    page.evaluate("window.dispatchEvent(new Event('online'))")
    expect(guide).not_to_be_visible()
    expect(page.locator('[data-tutorial-current]')).to_be_visible()
    assert cloud.DOCUMENTS[UID]['revision'] == revision, 'A confirmed ambiguous completion must not be sent twice'
    assert cloud.cloud_state(UID)['population'] == 12
    assert cloud.cloud_state(UID)['islandName'] == 'Port po utracie odpowiedzi'

    # Recovery must start the standard tutorial after the cloud coordinator
    # has become writable, so its first real worker assignment still works.
    page.locator('[data-tutorial-visit="rules-read"]').click()
    page.locator('[data-worker-building="farm"][data-worker-delta="1"]').click()
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    assert cloud.cloud_state(UID)['buildings']['farm']['workers'] == 1
    assert cloud.cloud_state(UID)['population'] == 12
    cloud.no_island_cache(page)
    context.close()
    print('PASS20 lost finish acknowledgement is reconciled once; tutorial and a real worker assignment continue without an island reset', flush=True)


def passive_autosave(browser):
    seed(cloud.starter(333, 'Automatyczny zapis'))
    context, page = enter(browser)
    # The artwork loads independently of the authenticated world. Advancing
    # the fake clock before cloud bootstrap finishes would expire its network
    # timeout instead of exercising a running island's autosave interval.
    page.wait_for_function("['saved','pending'].includes(document.body.dataset.cloudStatus)")
    revision = cloud.DOCUMENTS[UID]['revision']
    page.clock.run_for(29000)
    assert cloud.DOCUMENTS[UID]['revision'] == revision, 'Passive progress should use the30-second autosave cadence'
    page.clock.run_for(1000)
    expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    confirmed = cloud.cloud_state(UID)
    assert cloud.DOCUMENTS[UID]['revision'] >= revision + 1
    assert confirmed['worldTimeMs'] >= START + 30000
    assert confirmed['resources']['food'] < 100
    assert confirmed['resources']['coins'] == 333
    assert page.locator('[data-cloud-save-now],[data-cloud-reload],[data-dev-account]').count() == 0
    cloud.no_island_cache(page)
    context.close()
    print('PASS20 passive world progress is cloud-confirmed at30 seconds without manual save or browser island storage', flush=True)


def pending_introduction_idle_logout(browser):
    original = starter()
    seed(original)
    context, page = cloud.context(browser, UID)
    context.route(cloud.ORIGIN + '/harborlight-auth.html*', lambda route: route.fulfill(content_type='text/html', body='<!doctype html><title>Login</title>'))
    page.goto(cloud.ORIGIN + '/harborlight-v1-layered.html?profile=new-player')
    page.wait_for_function('document.getElementById("loading").hidden')
    expect(page.locator('[data-island-onboarding]')).to_have_attribute('data-onboarding-stage', 'intro')
    page.clock.fast_forward(29 * 60 * 1000 + 59000)
    assert not page.locator('#session-idle-warning').count()
    page.clock.run_for(1000)
    expect(page.locator('#session-idle-warning')).to_be_visible()
    frozen(cloud.cloud_state(UID), original)
    page.clock.run_for(30000)
    page.wait_for_url('**/harborlight-auth.html?mode=login')
    assert page.evaluate('(key)=>localStorage.getItem(key)', cloud.SESSION) is None
    frozen(cloud.cloud_state(UID), original)
    assert cloud.cloud_state(UID)['onboarding']['stage'] == 'intro'
    context.close()
    print('PASS20 idle session warns at30 minutes and signs out30 seconds later while the unfinished introduction keeps island time frozen', flush=True)


def expired_session(browser):
    # A browser closed overnight has no running idle timer. Authentication
    # activity metadata must still reject yesterday's stored session on return.
    value = cloud.starter(641, 'Port nocny')
    seed(value)
    writes_before = len(cloud.WRITES)
    context = browser.new_context(viewport={'width': 1366, 'height': 768})
    context.route(cloud.ORIGIN + '/**', cloud.assets)
    context.route('https://firestore.googleapis.com/**', cloud.firebase)
    context.route('https://identitytoolkit.googleapis.com/**', cloud.identity_lookup)
    context.route(cloud.ORIGIN + '/harborlight-auth.html*', lambda route: route.fulfill(content_type='text/html', body='<!doctype html><title>Login</title>'))
    previous = cloud.session(UID)
    previous['lastActivityAt'] = START - 12 * 3600 * 1000
    context.add_init_script('if(!localStorage.getItem("qa-overnight-seeded")){localStorage.setItem(%s, %s);localStorage.setItem("qa-overnight-seeded","1");}' % (json.dumps(cloud.SESSION), json.dumps(json.dumps(previous))))
    page = context.new_page()
    page.clock.install(time=cloud.NOW)
    page.goto(cloud.ORIGIN + '/harborlight-v1-layered.html?profile=new-player')
    page.wait_for_url('**/harborlight-auth.html?mode=login')
    assert page.evaluate('(key)=>localStorage.getItem(key)', cloud.SESSION) is None
    assert cloud.cloud_state(UID)['islandName'] == 'Port nocny'
    assert cloud.cloud_state(UID)['resources']['coins'] == 641
    assert len(cloud.WRITES) == writes_before
    context.close()
    print('PASS20 overnight session expires before reading or overwriting the cloud island', flush=True)


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                     headless=True, args=['--no-sandbox'])
        try:
            persisted_tour_and_skip(browser)
            complete_mobile_tour(browser)
            existing_history(browser)
            passive_autosave(browser)
            lost_finish_acknowledgement(browser)
            expired_session(browser)
            pending_introduction_idle_logout(browser)
            assert not cloud.ERRORS, cloud.ERRORS
        finally:
            browser.close()


if __name__ == '__main__':
    run()
