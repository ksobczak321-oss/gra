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
            'expiresAt': int(NOW.timestamp()*1000) + 3600000}


def document(uid):
    value = DOCUMENTS[uid]
    return {'name': PREFIX + uid, 'fields': {'schemaVersion': {'integerValue': '1'},
            'revision': {'integerValue': str(value['revision'])}, 'payload': {'stringValue': value['payload']}},
            'updateTime': value['updateTime']}


def firebase(route):
    request = route.request
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


def assets(route):
    path = unquote(urlsplit(route.request.url).path)
    if path == '/__/firebase/init.json':
        return route.fulfill(json={'projectId': 'harborlight-dev', 'apiKey': 'AIza-fixture-public-key-123456789',
                                   'messagingSenderId': '28040211190'})
    target = (ROOT / path.lstrip('/')).resolve()
    assert target.is_relative_to(ROOT) and target.is_file(), str(target)
    route.fulfill(body=target.read_bytes(), content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')


def context(browser, uid, *, language='pl', mobile=False):
    result = browser.new_context(viewport={'width': 390 if mobile else 1366, 'height': 844 if mobile else 768},
                                 reduced_motion='reduce', is_mobile=mobile, has_touch=mobile)
    result.route(ORIGIN + '/**', assets)
    result.route('https://firestore.googleapis.com/**', firebase)
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
    if page.locator('#island-dialog').is_visible():
        page.locator('#island-dialog .dialog-close').click()


def local(page, uid):
    return json.loads(page.evaluate('(key)=>localStorage.getItem(key)', KEY(uid)))


def settings(page):
    if page.viewport_size['width'] < 901:
        page.locator('.mobile-island-menu').click()
        page.locator('#island-dialog').get_by_role('button', name=re.compile(r'^(Ustawienia|Settings)$')).click()
    else:
        page.locator('#hit-settings').click()


def save_cloud(page):
    page.locator('[data-cloud-save-now]').click()
    expect(page.locator('[data-cloud-save-status]')).to_have_attribute('data-status', 'saved')


def run():
    for uid, coins in [('dev-admin1', 321), ('dev-admin2', 654)]:
        DOCUMENTS[uid] = {'payload': json.dumps(starter(coins, 'Wyspa ' + uid)), 'revision': 4, 'updateTime': timestamp()}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                             headless=True, args=['--no-sandbox'])
        first, page = context(browser, 'dev-admin1')
        visit(page)
        assert local(page, 'dev-admin1')['resources']['coins'] == 321
        assert local(page, 'dev-admin1')['islandName'] == 'Wyspa dev-admin1'
        settings(page)
        expect(page.locator('[data-dev-account="admin1"]')).to_be_visible()
        page.locator('#island-dialog select').first.select_option('en')
        save_cloud(page)
        assert json.loads(DOCUMENTS['dev-admin1']['payload'])['settings']['language'] == 'en'

        # A fresh browser/device has no island cache and restores the saved one.
        second, device = context(browser, 'dev-admin1', language=None, mobile=True)
        visit(device)
        assert local(device, 'dev-admin1')['resources']['coins'] == 321
        assert local(device, 'dev-admin1')['settings']['language'] == 'en'
        second.close()

        # Account switching in the same browser must not copy the first island.
        page.evaluate('(value)=>localStorage.setItem(%s,JSON.stringify(value))' % json.dumps(SESSION), session('dev-admin2'))
        visit(page)
        assert local(page, 'dev-admin2')['resources']['coins'] == 654
        assert local(page, 'dev-admin1')['resources']['coins'] == 321
        settings(page)
        save_cloud(page)
        assert json.loads(DOCUMENTS['dev-admin1']['payload'])['resources']['coins'] == 321
        # A concurrent device advances the version before this browser writes.
        remote = starter(900, 'Nowsza wyspa')
        DOCUMENTS['dev-admin2'] = {'payload': json.dumps(remote), 'revision': DOCUMENTS['dev-admin2']['revision']+1,
                                  'updateTime': timestamp()}
        commits_before = len(WRITES)
        page.locator('#island-dialog select').first.select_option('pl')
        page.locator('[data-cloud-save-now]').click()
        expect(page.locator('[data-cloud-save-status]')).to_have_attribute('data-status', 'conflict')
        assert local(page, 'dev-admin2')['resources']['coins'] == 654
        assert json.loads(DOCUMENTS['dev-admin2']['payload'])['resources']['coins'] == 900
        assert len(WRITES) == commits_before
        page.clock.run_for(21000)
        assert len(WRITES) == commits_before
        # Explicit recovery loads the new version while preserving a backup.
        page.reload(); page.wait_for_selector('[data-hud="working"]', state='attached')
        settings(page)
        with page.expect_navigation():
            page.locator('[data-cloud-reload]').click()
        page.wait_for_selector('[data-hud="working"]', state='attached')
        assert local(page, 'dev-admin2')['resources']['coins'] == 900
        settings(page)
        expect(page.locator('[data-cloud-earlier-backup]')).to_be_visible()
        page.locator('[data-dev-signout]').click()
        page.wait_for_url('**/harborlight-auth.html?mode=login')
        assert page.evaluate('(key)=>localStorage.getItem(key)', SESSION) is None
        assert local(page, 'dev-admin2')['resources']['coins'] == 900
        first.close()

        # A new permanent identity gets the normal starter, not guest/preview stock.
        third, new_page = context(browser, 'dev-admin3', mobile=True)
        visit(new_page)
        assert local(new_page, 'dev-admin3')['resources']['coins'] == 100
        assert local(new_page, 'dev-admin3')['resources']['wood'] == 100
        settings(new_page); save_cloud(new_page)
        assert DOCUMENTS['dev-admin3']['revision'] == 1
        assert json.loads(DOCUMENTS['dev-admin3']['payload'])['resources']['coins'] == 100
        third.close()
        browser.close()
    assert not ERRORS, ERRORS
    assert all('islands/dev-admin' in url or '/documents:commit' in url for url in REQUESTS), REQUESTS
    print('PASS DEV game: separate account islands, second-device restore, safe cloud save, CAS conflict, recovery, sign-out and normal starter')


if __name__ == '__main__':
    run()
