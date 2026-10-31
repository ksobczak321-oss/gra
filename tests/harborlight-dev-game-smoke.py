"""DEV cloud-game integration with isolated Firebase REST fixtures.

The browser loads the actual public assets from the selected frontend root.
Only Google identity/storage responses are simulated; no account data is sent
to a live project or overwritten by this acceptance test.
"""
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlsplit, unquote
import base64
import json
import mimetypes
import os
import re
import subprocess

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
ORIGIN = 'https://harborlight-dev.web.app'
NOW = datetime(2026, 10, 30, 12, tzinfo=timezone.utc)
SESSION = 'harborlight-dev-auth-v1'
PREFIX = 'projects/harborlight-dev/databases/(default)/documents/islands/'
KEY = lambda uid: 'harborlight-dev-island-' + uid
ERRORS, REQUESTS = [], []
DOCUMENTS = {}
WRITES = []
SEQUENCE = 0
OFFLINE = False


def starter(coins, name):
    code = """import {createState} from './harborlight-v1-state.js';
      const state=createState(%d);
      state.tutorial.autoOpenDisabled=true;
      state.resources.coins=%d;state.islandName=%s;
      console.log(JSON.stringify(state));""" % (int(NOW.timestamp()*1000), coins, json.dumps(name))
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', code], cwd=SOURCE,
                                    text=True, capture_output=True, check=True).stdout)


def timestamp():
    global SEQUENCE
    SEQUENCE += 1
    return (NOW + timedelta(microseconds=SEQUENCE)).isoformat(timespec='microseconds').replace('+00:00', 'Z')


def token(uid):
    claims = {'aud': 'harborlight-dev', 'iss': 'https://securetoken.google.com/harborlight-dev',
              'sub': uid, 'exp': int(NOW.timestamp()) + 3600}
    encoded = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip('=')
    return 'header.' + encoded + '.signature'


def session(uid):
    return {'projectId': 'harborlight-dev', 'uid': uid, 'login': uid.removeprefix('dev-'),
            'idToken': token(uid), 'refreshToken': 'fixture-refresh-' + uid,
            'expiresAt': int(NOW.timestamp()*1000) + 3600000,
            'lastActivityAt': int(NOW.timestamp()*1000)}


def document(uid):
    value = DOCUMENTS[uid]
    return {'name': PREFIX + uid, 'fields': {'schemaVersion': {'integerValue': '1'},
            'revision': {'integerValue': str(value['revision'])}, 'payload': {'stringValue': value['payload']}},
            'updateTime': value['updateTime']}


def firebase(route):
    request = route.request
    if OFFLINE:
        return route.abort('internetdisconnected')
    def reply(**arguments):
        return route.fulfill(headers={'access-control-allow-origin': ORIGIN,
                                     'access-control-allow-headers': 'authorization,content-type',
                                     'access-control-allow-methods': 'GET,POST,OPTIONS'}, **arguments)
    if request.method == 'OPTIONS':
        return reply(status=204)
    REQUESTS.append(request.url)
    authorization = request.headers.get('authorization', '')
    try:
        encoded = authorization.removeprefix('Bearer ').split('.')[1]
        uid = json.loads(base64.urlsafe_b64decode(encoded + '='*(-len(encoded) % 4)))['sub']
    except (ValueError, KeyError, IndexError):
        return reply(status=401, json={'error': {'status': 'UNAUTHENTICATED'}})
    if request.method == 'GET':
        wanted = unquote(urlsplit(request.url).path).rsplit('/', 1)[1]
        if wanted != uid:
            return reply(status=403, json={'error': {'status': 'PERMISSION_DENIED'}})
        if wanted not in DOCUMENTS:
            return reply(status=404, json={'error': {'status': 'NOT_FOUND'}})
        return reply(json=document(wanted))
    body = request.post_data_json
    assert request.url.endswith('/documents:commit'), request.url
    assert len(body['writes']) == 1
    write = body['writes'][0]
    assert write['update']['name'] == PREFIX + uid
    assert write['updateTransforms'] == [{'fieldPath': 'updatedAt', 'setToServerValue': 'REQUEST_TIME'}]
    existing = DOCUMENTS.get(uid)
    condition = write['currentDocument']
    if (condition == {'exists': False} and existing) or (
            condition != {'exists': False} and (not existing or condition.get('updateTime') != existing['updateTime'])):
        return reply(status=409, json={'error': {'status': 'FAILED_PRECONDITION'}})
    fields = write['update']['fields']
    revision = int(fields['revision']['integerValue'])
    assert revision == (existing['revision'] + 1 if existing else 1)
    assert fields['schemaVersion'] == {'integerValue': '1'}
    updated = timestamp()
    DOCUMENTS[uid] = {'payload': fields['payload']['stringValue'], 'revision': revision, 'updateTime': updated}
    WRITES.append(uid)
    return reply(json={'writeResults': [{'updateTime': updated}], 'commitTime': updated})


def identity_lookup(route):
    headers = {'access-control-allow-origin': ORIGIN,
               'access-control-allow-headers': 'content-type',
               'access-control-allow-methods': 'POST,OPTIONS'}
    if route.request.method == 'OPTIONS':
        return route.fulfill(status=204, headers=headers)
    assert '/accounts:lookup?' in route.request.url, route.request.url
    value = route.request.post_data_json['idToken'].split('.')[1]
    uid = json.loads(base64.urlsafe_b64decode(value + '='*(-len(value) % 4)))['sub']
    return route.fulfill(headers=headers, json={'users': [{'localId': uid, 'displayName': ''}]})


def assets(route):
    path = unquote(urlsplit(route.request.url).path)
    if path == '/__/firebase/init.json':
        return route.fulfill(json={'projectId': 'harborlight-dev', 'apiKey': 'AIza-fixture-public-key-123456789',
                                   'messagingSenderId': '28040211190'})
    if path == '/api/v1/config':
        return route.fulfill(status=503, json={'error': 'account_api_disabled'})
    target = (ROOT / path.lstrip('/')).resolve()
    assert target.is_relative_to(ROOT) and target.is_file(), str(target)
    route.fulfill(body=target.read_bytes(), content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')


def context(browser, uid, *, language='pl', mobile=False):
    result = browser.new_context(viewport={'width': 390 if mobile else 1366, 'height': 844 if mobile else 768},
                                 reduced_motion='reduce', is_mobile=mobile, has_touch=mobile)
    result.route(ORIGIN + '/**', assets)
    result.route('https://firestore.googleapis.com/**', firebase)
    result.route('https://identitytoolkit.googleapis.com/**', identity_lookup)
    initial = {'session': session(uid), 'language': language,
               'guest': json.dumps(starter(999, 'Guest island must stay separate'))}
    result.add_init_script('''(() => {
      const initial=%s;
      if(!localStorage.getItem('qa-dev-game-seeded')) {
        localStorage.setItem(%s,JSON.stringify(initial.session));
        localStorage.setItem('qa-dev-game-seeded','1');
        localStorage.setItem('harborlight-v1-new-player-save',initial.guest);
        localStorage.setItem('harborlight-island-name:harborlight-v1-new-player-save',JSON.stringify({name:'Wrong guest name',updatedAt:9999999999999}));
        if(initial.language) localStorage.setItem('harborlight-language',initial.language);
      }
      window.__qaIslandStorageCalls=[];
      for(const operation of ['getItem','setItem']) {
        const original=Storage.prototype[operation];
        Storage.prototype[operation]=function(key,...values) {
          if(/^harborlight-(?:dev-island-|v1-(?:new-player-)?save|island-name:)/.test(String(key)))
            window.__qaIslandStorageCalls.push([operation,String(key)]);
          return original.call(this,key,...values);
        };
      }
    })();''' % (json.dumps(initial), json.dumps(SESSION)))
    page = result.new_page()
    page.on('pageerror', lambda error: ERRORS.append(str(error)))
    page.clock.install(time=NOW - timedelta(seconds=1))
    page.clock.pause_at(NOW)
    return result, page


def visit(page):
    page.goto(ORIGIN + '/harborlight-v1-layered.html?profile=preview&slot=wrong-account')
    page.wait_for_selector('[data-hud="working"]', state='attached')
    page.wait_for_function('document.getElementById("loading").hidden')
    if page.locator('[data-tutorial-dismiss]').is_visible():
        page.locator('[data-tutorial-dismiss]').click()
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
    elif page.locator('#island-dialog').is_visible():
        page.locator('#island-dialog .dialog-close').click()


def cloud_state(uid):
    return json.loads(DOCUMENTS[uid]['payload'])


def no_island_cache(page):
    assert page.evaluate('window.__qaIslandStorageCalls') == [], 'The application read or wrote a browser island cache'
    assert page.evaluate("Object.keys(localStorage).filter(key=>key.startsWith('harborlight-dev-island-'))") == []



def settings(page):
    if page.viewport_size['width'] < 901:
        page.locator('.mobile-island-menu').click()
        page.locator('#island-dialog').get_by_role('button', name=re.compile(r'^(Ustawienia|Settings)$')).click()
    else:
        page.locator('#hit-settings').click()


def save_cloud(page):
    # Passive progress is saved automatically at30-second intervals. There is
    # no manual cloud-save/load panel in the player Settings.
    page.clock.run_for(30000)
    expect(page.locator('body')).to_have_attribute('data-cloud-status', re.compile(r'^(saved|pending)$'))
    assert page.locator('[data-cloud-save-now],[data-cloud-reload],[data-dev-account]').count() == 0


def finish_onboarding(page, name='Nowa wyspa'):
    guide = page.locator('[data-island-onboarding]')
    expect(guide).to_be_visible()
    if guide.get_attribute('data-onboarding-stage') == 'intro':
        page.locator('[data-onboarding-next]').click()
        expect(guide).to_have_attribute('data-onboarding-stage', 'name')
    if guide.get_attribute('data-onboarding-stage') == 'name':
        page.locator('[data-onboarding-name]').fill(name)
        page.locator('[data-onboarding-next]').click()
        expect(guide).to_have_attribute('data-onboarding-stage', 'tour')
    page.locator('[data-onboarding-exit]').click()
    expect(guide).not_to_be_visible()
    if page.locator('[data-tutorial-dismiss]').is_visible():
        page.locator('[data-tutorial-dismiss]').click()
    elif page.locator('#island-dialog').is_visible():
        page.locator('#island-dialog .dialog-close').click()


def run():
    global OFFLINE
    for uid, coins in [('dev-admin1', 321), ('dev-admin2', 654)]:
        DOCUMENTS[uid] = {'payload': json.dumps(starter(coins, 'Wyspa ' + uid)), 'revision': 4, 'updateTime': timestamp()}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                             headless=True, args=['--no-sandbox'])
        first, page = context(browser, 'dev-admin1')
        visit(page)
        no_island_cache(page)
        assert cloud_state('dev-admin1')['resources']['coins'] == 321
        settings(page)
        expect(page.locator('[data-settings-signout]')).to_be_visible()
        assert page.locator('[data-dev-account],[data-cloud-save-now],[data-cloud-reload]').count() == 0
        page.locator('#island-dialog select').first.select_option('en')
        # A successful action is acknowledged in the cloud without waiting for
        # the thirty-second autosave or writing a browser recovery copy.
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
        assert cloud_state('dev-admin1')['settings']['language'] == 'en'
        save_cloud(page)
        assert cloud_state('dev-admin1')['islandName'] == 'Wyspa dev-admin1'
        no_island_cache(page)

        # A fresh device has no island cache and restores the same cloud state.
        second, device = context(browser, 'dev-admin1', language=None, mobile=True)
        visit(device)
        settings(device)
        expect(device.locator('#island-dialog select').first).to_have_value('en')
        save_cloud(device)
        assert cloud_state('dev-admin1')['resources']['coins'] == 321
        no_island_cache(device)
        second.close()

        # Account switching never copies guest or previous-account progress.
        page.evaluate('(value)=>localStorage.setItem(%s,JSON.stringify(value))' % json.dumps(SESSION), session('dev-admin2'))
        visit(page)
        settings(page)
        expect(page.locator('[data-settings-signout]')).to_be_visible()
        save_cloud(page)
        assert cloud_state('dev-admin2')['resources']['coins'] == 654
        assert cloud_state('dev-admin1')['resources']['coins'] == 321
        no_island_cache(page)

        # A concurrent device advances the version before the next action.
        remote = starter(900, 'Nowsza wyspa')
        DOCUMENTS['dev-admin2'] = {'payload': json.dumps(remote), 'revision': DOCUMENTS['dev-admin2']['revision']+1,
                                  'updateTime': timestamp()}
        commits_before = len(WRITES)
        page.locator('#island-dialog select').first.select_option('pl')
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'conflict')
        assert cloud_state('dev-admin2')['resources']['coins'] == 900
        assert len(WRITES) == commits_before
        no_island_cache(page)
        # Recovery reads the authoritative cloud version before enabling play;
        # it cannot overwrite another device with the stale pending snapshot.
        page.evaluate("window.dispatchEvent(new Event('online'))")
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
        page.wait_for_selector('[data-hud="working"]', state='attached')
        page.wait_for_function('document.getElementById("loading").hidden')
        if not page.locator('[data-settings-signout]').is_visible():
            settings(page)
        save_cloud(page)
        assert cloud_state('dev-admin2')['resources']['coins'] == 900
        assert cloud_state('dev-admin2')['islandName'] == 'Nowsza wyspa'
        assert page.locator('[data-cloud-backup],[data-cloud-earlier-backup]').count() == 0

        # A disconnected action cannot be reported as saved on this device.
        confirmed = DOCUMENTS['dev-admin2']['payload']
        OFFLINE = True
        page.locator('#island-dialog select').first.select_option('en')
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'offline')
        assert DOCUMENTS['dev-admin2']['payload'] == confirmed
        assert 'lokaln' not in page.locator('.dev-cloud-alert').inner_text().lower()
        no_island_cache(page)
        OFFLINE = False
        page.evaluate("window.dispatchEvent(new Event('online'))")
        expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
        page.wait_for_selector('[data-hud="working"]', state='attached')
        page.wait_for_function('document.getElementById("loading").hidden')
        if not page.locator('[data-settings-signout]').is_visible():
            settings(page)
        save_cloud(page)
        assert cloud_state('dev-admin2')['resources']['coins'] == 900
        no_island_cache(page)
        page.locator('[data-dev-signout]').click()
        page.wait_for_url('**/harborlight-auth.html?mode=login')
        assert page.evaluate('(key)=>localStorage.getItem(key)', SESSION) is None
        assert cloud_state('dev-admin2')['resources']['coins'] == 900
        first.close()

        # New permanent identity receives the normal starter exactly once.
        third, new_page = context(browser, 'dev-admin3', mobile=True)
        visit(new_page)
        finish_onboarding(new_page)
        settings(new_page)
        save_cloud(new_page)
        assert DOCUMENTS['dev-admin3']['revision'] >= 1
        fresh = cloud_state('dev-admin3')
        assert fresh['resources']['coins'] == fresh['resources']['wood'] == 100
        assert fresh['population'] == 12
        assert fresh['happiness'] >= 20
        assert int(NOW.timestamp()*1000) <= fresh['welcome']['startedAt'] <= int(NOW.timestamp()*1000) + 1000
        no_island_cache(new_page)
        new_page.reload()
        new_page.wait_for_selector('[data-hud="working"]', state='attached')
        assert cloud_state('dev-admin3')['welcome']['startedAt'] == fresh['welcome']['startedAt']
        assert cloud_state('dev-admin3')['resources']['coins'] == 100
        no_island_cache(new_page)
        third.close()

        # Initial cloud failure blocks entry instead of importing the deliberately
        # seeded guest island or creating another local starter.
        OFFLINE = True
        blocked_context, blocked_page = context(browser, 'dev-admin1')
        blocked_page.goto(ORIGIN + '/harborlight-v1-layered.html')
        expect(blocked_page.locator('[data-cloud-startup-blocked]')).to_be_visible()
        assert blocked_page.locator('[data-hud="working"]').count() == 0
        no_island_cache(blocked_page)
        OFFLINE = False
        blocked_page.locator('[data-cloud-startup-retry]').click()
        blocked_page.wait_for_selector('[data-hud="working"]', state='attached')
        settings(blocked_page)
        save_cloud(blocked_page)
        assert cloud_state('dev-admin1')['resources']['coins'] == 321
        assert cloud_state('dev-admin1')['islandName'] == 'Wyspa dev-admin1'
        no_island_cache(blocked_page)
        blocked_context.close()
        browser.close()
    assert not ERRORS, ERRORS
    assert all('islands/dev-admin' in url or '/documents:commit' in url for url in REQUESTS), REQUESTS
    print('PASS cloud-only game: isolatedaccounts, immediateack, 30secondautosave, second-device restore, CAS conflict, offlineblocking, saferecovery, sign-out and one-time starter without browserislandcopies')


if __name__ == '__main__':
    run()
