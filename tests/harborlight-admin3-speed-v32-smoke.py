"""Admin3 speed controls through real login and isolated account APIs.

Local DEV uses its actual ephemeral runtime. PRE-PROD uses the actual account
API/server/store behind transport fixtures at its ordinary HTTPS origin; only
Google identity responses are mocked. No live cloud, game-state setters,
browser game fixture or seeded authentication session is used.
"""
import base64
import json
import mimetypes
import os
from pathlib import Path
import re
import subprocess
import time
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ASSETS = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
ORIGIN = 'https://harborlight-dev.web.app'
SESSION_KEYS = {'local': 'harborlight-local-dev-auth-v1', 'preprod': 'harborlight-dev-auth-v1'}
OUT = Path(os.environ.get('HARBORLIGHT_SPEED_EVIDENCE', '/tmp/harborlight-admin3-speed-v32'))
OUT.mkdir(parents=True, exist_ok=True)
REPORT = []

server = subprocess.Popen(['node', '--input-type=module', '-e', r"""
import {createLocalDevRuntime,LocalDevDocumentStore} from './backend/dev-runtime.mjs';
import {createAccountService} from './backend/account-service.mjs';
import {createServer} from './backend/server.mjs';
const local=await createLocalDevRuntime({ephemeral:true});await local.listen(0);
const store=new LocalDevDocumentStore();
const service=createAccountService({store,environment:'preprod',projectId:'harborlight-dev'});
const cloud=createServer({environment:'preprod',accountProjectId:'harborlight-dev',accountService:service,
 verifyIdentityToken:async token=>{
  if(!token.endsWith('.speed-fixture'))throw Object.assign(new Error('auth-required'),{code:'auth-required',status:401});
  const value=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
  if(value.aud!=='harborlight-dev'||!['dev-admin1','dev-admin2','dev-admin3'].includes(value.sub))throw Error('invalid fixture token');
  return {uid:value.sub};
 }});
await new Promise(resolve=>cloud.listen(0,'127.0.0.1',resolve));
console.log(JSON.stringify({local:local.server.address().port,preprod:cloud.address().port}));
process.once('SIGTERM',()=>Promise.all([local.close(),new Promise(resolve=>cloud.close(resolve))]).then(()=>process.exit(0)));
"""], cwd=SOURCE, stdout=subprocess.PIPE, text=True)


def fixture_token(login):
    claims = {'aud': 'harborlight-dev', 'iss': 'https://securetoken.google.com/harborlight-dev',
              'sub': 'dev-' + login, 'exp': int(time.time()) + 3600}
    encode = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
    return encode({'alg': 'RS256'}) + '.' + encode(claims) + '.speed-fixture'


class PreprodTransport:
    def __init__(self, backend):
        self.backend = backend
        self.auth_logins = []
        self.unexpected = []
        self.time_requests = []

    def route(self, route):
        request = route.request
        parsed = urlsplit(request.url)
        if parsed.hostname == 'identitytoolkit.googleapis.com':
            headers = {'access-control-allow-origin': ORIGIN, 'access-control-allow-headers': 'content-type',
                       'access-control-allow-methods': 'POST,OPTIONS'}
            if request.method == 'OPTIONS':
                return route.fulfill(status=204, headers=headers)
            body = request.post_data_json
            if parsed.path.endswith('/accounts:signInWithPassword'):
                login = body['email'].split('@')[0]
                assert login in ['admin1', 'admin2', 'admin3'] and body['password'] == login
                self.auth_logins.append(login)
                return route.fulfill(headers=headers, json={'localId': 'dev-' + login,
                    'email': login + '@dev.harborlight.pl', 'idToken': fixture_token(login),
                    'refreshToken': 'fixture-refresh-' + login, 'expiresIn': '3600'})
            if parsed.path.endswith('/accounts:lookup'):
                claims = json.loads(base64.urlsafe_b64decode(body['idToken'].split('.')[1] + '==='))
                return route.fulfill(headers=headers, json={'users': [{'localId': claims['sub'], 'displayName': ''}]})
        if parsed.hostname == 'harborlight-dev.web.app':
            if parsed.path == '/__/firebase/init.json':
                return route.fulfill(json={'projectId': 'harborlight-dev', 'apiKey': 'fixture-public-speed-test-key',
                                           'messagingSenderId': '123456789'})
            if parsed.path.startswith('/api/'):
                if parsed.path == '/api/v1/dev-time':
                    self.time_requests.append({'method': request.method,
                        'body': request.post_data_json if request.method == 'POST' else None})
                response = route.fetch(url=self.backend + parsed.path + ('?' + parsed.query if parsed.query else ''))
                return route.fulfill(response=response)
            file = (ASSETS / unquote(parsed.path).lstrip('/')).resolve()
            if file.is_relative_to(ASSETS) and file.is_file():
                return route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
            if parsed.path == '/favicon.ico':
                return route.fulfill(status=204)
        self.unexpected.append(request.url)
        route.abort()


def login(page, address, account):
    page.goto(address + '/harborlight-auth.html', wait_until='networkidle')
    page.locator('#email').fill(account)
    page.locator('#password').fill(account)
    page.locator('#account-submit').click()
    page.wait_for_url('**/harborlight-v1-layered.html**')
    page.wait_for_function('document.getElementById("loading").hidden')


def finish_introduction(page, name):
    if page.locator('[data-onboarding-next]').count():
        page.locator('[data-onboarding-next]').click()
        page.locator('[data-onboarding-name]').fill(name)
        page.locator('[data-onboarding-next]').click()
        page.locator('[data-onboarding-exit]').click()
    for _ in range(10):
        popup = page.locator('dialog[open]:not(#island-dialog)')
        if popup.count():
            popup.last.locator('button:not([data-v32-speed-normal]):not([data-v32-speed-fast])').last.click()
            page.wait_for_timeout(80)
        elif page.locator('#island-dialog[open]').count():
            page.locator('#island-dialog .dialog-close').click()
            page.wait_for_timeout(80)
        else:
            break


def api(page, scope, path):
    # This reads the ordinary authentication metadata obtained by the login form.
    # No credentials, session or game-state values are injected into the page.
    return page.evaluate("""async ({key,path})=>{
      const session=JSON.parse(localStorage.getItem(key));
      const response=await fetch(path,{headers:{Authorization:'Bearer '+session.idToken}});
      return {status:response.status,body:await response.json()};
    }""", {'key': SESSION_KEYS[scope], 'path': path})


def clock(page, scope):
    response = api(page, scope, '/api/dev/time' if scope == 'local' else '/api/v1/dev-time')
    assert response['status'] == 200, response
    return response['body']


def rate(page, expected):
    expect(page.locator('[data-v32-speed-rate]')).to_have_text('×' + str(expected))
    expect(page.locator('[data-v32-speed-controls]')).to_have_attribute('aria-busy', 'false')


def measure_clock(page, scope, expected):
    before = clock(page, scope)
    page.wait_for_timeout(600)
    after = clock(page, scope)
    real_delta = after['realNow'] - before['realNow']
    world_delta = after['now'] - before['now']
    assert real_delta >= 500 and abs(world_delta - real_delta * expected) <= 12, (expected, before, after)
    return {'rate': expected, 'real_delta_ms': real_delta, 'game_delta_ms': world_delta}


try:
    addresses = json.loads(server.stdout.readline())
    local = 'http://127.0.0.1:' + str(addresses['local'])
    cloud_backend = 'http://127.0.0.1:' + str(addresses['preprod'])
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
            headless=True, args=['--no-sandbox'])
        for scope, address in [('local', local), ('preprod', ORIGIN)]:
            transport = PreprodTransport(cloud_backend) if scope == 'preprod' else None
            for account in ['admin1', 'admin2', 'admin3']:
                context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
                if transport:
                    context.route('**/*', transport.route)
                # Language is the only browser preference this test seeds.
                context.add_init_script('localStorage.setItem("harborlight-language","pl")')
                page = context.new_page();page.set_default_timeout(15000)
                errors = [];page.on('pageerror', lambda error: errors.append(str(error)))
                clock_requests = []
                page.on('request', lambda request: clock_requests.append(request.url)
                    if urlsplit(request.url).path in ['/api/dev/time', '/api/v1/dev-time'] else None)
                login(page, address, account)
                if account != 'admin3':
                    assert page.locator('[data-v32-speed-controls]').count() == 0
                    finish_introduction(page, 'Speed QA ' + account)
                    assert page.locator('[data-v32-speed-controls]').count() == 0
                    # Ordinary accounts must never probe the privileged clock.
                    # The deliberate API permission check below is separate.
                    assert clock_requests == [], (scope, account, 'automatic clock request', clock_requests)
                    response = api(page, scope, '/api/dev/time' if scope == 'local' else '/api/v1/dev-time')
                    if scope == 'local':
                        assert response['status'] == 200 and not response['body'].get('canSetRate'), response
                    else:
                        assert response['status'] == 403, response
                    assert not errors, errors
                    REPORT.append({'scope': scope, 'account': account, 'controls_absent': True, 'automatic_clock_requests': 0, 'api_cannot_set_rate': True})
                    context.close();continue
                controls = page.locator('[data-v32-speed-controls]')
                expect(controls).to_be_visible();rate(page, 1)
                assert controls.locator('[data-v32-speed-normal]').inner_text() == '▶'
                assert controls.locator('[data-v32-speed-fast]').inner_text() == '⏩'
                # The first introduction is modal too; the controls must join it.
                assert controls.evaluate('e=>e.parentElement.matches("dialog:modal")')
                intro_clock = clock(page, scope)
                finish_introduction(page, 'Speed QA admin3 ' + scope)
                rate(page, 1)
                measures = [measure_clock(page, scope, 1)]
                clocks = [intro_clock['now'], clock(page, scope)['now']]
                # The first daily offer can appear on the first live world tick,
                # after the introduction has closed. Dismiss it through its
                # normal controls before navigating to a different modal.
                finish_introduction(page, 'Already named')
                expect(page.locator('dialog[open]')).to_have_count(0)
                page.locator('#hit-world-house').evaluate('(e)=>e.click()')
                expect(page.locator('#island-dialog')).to_be_visible()
                assert controls.evaluate('e=>e.parentElement.id==="island-dialog"&&e.parentElement.matches(":modal")')
                controls.locator('[data-v32-speed-fast]').click();rate(page, 2)
                assert controls.evaluate('e=>e.parentElement.id==="island-dialog"'), 'controls lost after renderPanel'
                measures.append(measure_clock(page, scope, 2));clocks.append(clock(page, scope)['now'])
                controls.locator('[data-v32-speed-fast]').click();rate(page, 6)
                measures.append(measure_clock(page, scope, 6));clocks.append(clock(page, scope)['now'])
                world_before_fast_reload = json.loads(api(page, scope, '/api/v1/island')['body']['island']['payload'])['worldTimeMs']
                fast_real_start = time.monotonic()
                expect(controls.locator('[data-v32-speed-fast]')).to_be_disabled()
                page.screenshot(path=str(OUT / (scope + '-admin3-modal-1440.png')))
                page.reload(wait_until='networkidle');rate(page, 6)
                assert clock(page, scope)['rate'] == 6
                clocks.append(clock(page, scope)['now'])
                finish_introduction(page, 'Already named')
                page.set_viewport_size({'width': 390, 'height': 844})
                expect(page.locator('dialog[open]')).to_have_count(0)
                page.locator('#hit-world-house').evaluate('(e)=>e.click()')
                assert controls.evaluate('e=>e.parentElement.id==="island-dialog"')
                box = controls.bounding_box()
                assert box and box['x'] >= 0 and box['x'] + box['width'] <= 391, box
                assert box['y'] >= 0 and box['y'] + box['height'] <= 845, box
                controls.locator('[data-v32-speed-normal]').click();rate(page, 1)
                expect(controls.locator('[data-v32-speed-normal]')).to_be_disabled()
                world_after_fast_reload = json.loads(api(page, scope, '/api/v1/island')['body']['island']['payload'])['worldTimeMs']
                fast_real_elapsed = (time.monotonic() - fast_real_start) * 1000
                accelerated_world_elapsed = world_after_fast_reload - world_before_fast_reload
                assert accelerated_world_elapsed > fast_real_elapsed * 3, (scope, fast_real_elapsed, accelerated_world_elapsed)
                measures.append(measure_clock(page, scope, 1));clocks.append(clock(page, scope)['now'])
                assert clocks == sorted(clocks), clocks
                assert page.locator('[data-v32-speed-feedback]').inner_text() == ''
                page.screenshot(path=str(OUT / (scope + '-admin3-modal-390.png')))
                page.reload(wait_until='networkidle');rate(page, 1)
                assert clock(page, scope)['rate'] == 1
                assert not errors, errors
                assert page.evaluate('typeof window.__HARBORLIGHT_DEV_FIXTURE__') == 'undefined'
                assert page.evaluate('typeof window.__HARBORLIGHT_SET_DEV_STATE__') == 'undefined'
                REPORT.append({'scope': scope, 'account': account, 'rates': [1, 2, 6, 1], 'clock_measures': measures,
                    'monotonic_transitions': True, 'persisted_reload': [6, 1], 'actual_saved_world_advanced_faster': {'real_elapsed_ms': fast_real_elapsed, 'world_elapsed_ms': accelerated_world_elapsed}, 'intro_and_building_modal_access': True,
                    'mobile_in_viewport': True, 'no_game_fixture_or_setter': True, 'js_errors': errors})
                context.close()
            if transport:
                assert transport.auth_logins == ['admin1', 'admin2', 'admin3'], transport.auth_logins
                assert not transport.unexpected, transport.unexpected
                mutations = [row['body'] for row in transport.time_requests if row['method'] == 'POST']
                assert [row['rate'] for row in mutations] == [2, 6, 1], mutations
                assert all(row['generation'] == 1 for row in mutations), mutations
        browser.close()
    (OUT / 'report.json').write_text(json.dumps(REPORT, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(REPORT, ensure_ascii=False))
    print('PASS admin3-only speed: real login/API clocks, x1/x2/x6/Play, monotonic and reload-persistent, intro/building modal access, desktop/mobile; DEV and PRE-PROD transport fixture.')
finally:
    server.terminate()
    try:
        server.wait(timeout=8)
    except subprocess.TimeoutExpired:
        server.kill();server.wait()
