"""Read-only acceptance of the actual hosted release.

Checks every published byte against the verified package, anonymous entry,
project/API routing and an existing authenticated island rendering. Browser
island/activity writes are blocked before navigation. No starter, reward,
upgrade, promotion claim or reset is performed by this test.
"""
import base64
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import time
from urllib.parse import quote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
HOST_PROJECTS = {'harborlight-dev.web.app':'harborlight-dev', 'harborlight-dev.firebaseapp.com':'harborlight-dev',
                 'harborlight-prod.web.app':'harborlight-prod', 'harborlight-prod.firebaseapp.com':'harborlight-prod',
                 'harborlight.pl':'harborlight-prod', 'www.harborlight.pl':'harborlight-prod'}


def origin_project(base):
    parsed = urlsplit(base)
    if parsed.scheme != 'https' or parsed.hostname not in HOST_PROJECTS or parsed.username or parsed.password or parsed.port or parsed.path not in ('','/') or parsed.query or parsed.fragment:
        raise ValueError('Use an exact HTTPS HARBORLIGHT Hosting origin.')
    return HOST_PROJECTS[parsed.hostname]


def read_json(response, label):
    try:
        body = response.json()
    except Exception as error:
        raise AssertionError(label + ' did not return JSON') from error
    if not isinstance(body, dict):
        raise AssertionError(label + ' returned an invalid object')
    return body


def verify_assets(http, base, manifest_bytes):
    expected = json.loads(manifest_bytes)
    if expected.get('schema_version') != 1 or not re.fullmatch(r'[a-f0-9]{40}', expected.get('commit','')) or not isinstance(expected.get('files'),dict):
        raise ValueError('A verified local release manifest is required.')
    response = http.get(base + '/release.json?acceptance=' + expected['commit'], timeout=30000, max_redirects=0)
    assert response.status == 200, 'Hosted release manifest is unavailable'
    assert response.body() == manifest_bytes, 'Hosted manifest differs from the verified frontend package'
    for name, metadata in expected['files'].items():
        path = PurePosixPath(name)
        assert not path.is_absolute() and '..' not in path.parts and re.fullmatch(r'[A-Za-z0-9._/-]+',name), 'Invalid package path'
        response = http.get(base + '/' + quote(name,safe='/') + '?acceptance=' + expected['commit'], timeout=30000, max_redirects=0)
        assert response.status == 200, 'Hosted asset unavailable: ' + name
        data = response.body()
        assert len(data) == metadata['size'] and hashlib.sha256(data).hexdigest() == metadata['sha256'], 'Hosted asset differs: ' + name
    return len(expected['files'])


def existing_identity(http, base, project, config, api_enabled=False):
    if project == 'harborlight-dev':
        candidates = [(login, login + '@dev.harborlight.pl', login) for login in ('admin1','admin2','admin3')]
    else:
        email = os.environ.get('HARBORLIGHT_PROD_SMOKE_EMAIL','')
        password = os.environ.get('HARBORLIGHT_PROD_SMOKE_PASSWORD','')
        if not email or not password:
            raise AssertionError('A real owner-selected PROD smoke account must be configured in scoped GitHub secrets. No account is created by this test.')
        candidates = [(email,email,password)]
    api_key = config.get('apiKey')
    assert isinstance(api_key,str) and len(api_key) >= 20, 'Firebase public runtime configuration is incomplete'
    for login, email, password in candidates:
        response = http.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + quote(api_key,safe=''),
                             data={'email':email,'password':password,'returnSecureToken':True}, timeout=30000, max_redirects=0)
        assert response.status == 200, 'The configured smoke identity could not sign in; no account was created'
        body = read_json(response,'Authentication')
        uid, token = body.get('localId'), body.get('idToken')
        assert isinstance(uid,str) and isinstance(token,str) and isinstance(body.get('refreshToken'),str), 'Authentication did not return a session'
        if project == 'harborlight-dev':
            assert uid == 'dev-' + login and body.get('email') == email, 'PRE-PROD identity does not match its permanent UID'
        if api_enabled or project != 'harborlight-dev':
            # After the guarded PRE-PROD reset, direct Firestore reads are
            # deliberately denied even to the owner. Read the same API route
            # the game uses; never recreate an empty smoke world automatically.
            response = http.get(base + '/api/v1/island', headers={'Authorization': 'Bearer ' + token}, timeout=30000, max_redirects=0)
            assert response.status == 200, 'The enabled account API did not return the smoke island'
            payload = read_json(response, 'Existing island')
            assert payload.get('account', {}).get('expired') is not True, 'The smoke island expired; its owner must start it again'
            if payload.get('island') is None:
                continue
            assert isinstance(payload['island'], dict) and isinstance(payload['island'].get('payload'), str), 'Existing API smoke island has no payload'
        else:
            response = http.get('https://firestore.googleapis.com/v1/projects/' + project + '/databases/(default)/documents/islands/' + uid,
                                headers={'Authorization': 'Bearer ' + token}, timeout=30000, max_redirects=0)
            if response.status == 404:
                continue
            assert response.status == 200, 'Could not read the existing smoke island'
            document = read_json(response, 'Existing island')
            assert isinstance(document.get('fields', {}).get('payload', {}).get('stringValue'), str), 'Existing smoke island has no payload'
        duration = int(body.get('expiresIn',0))
        assert 0 < duration <= 86400, 'Authentication expiry is invalid'
        # Time spent checking the existing island must not make our stored
        # session outlive the actual Firebase token. The application correctly
        # rejects such an inconsistent expiry instead of trusting this fixture.
        encoded = token.split('.')[1]
        claims = json.loads(base64.urlsafe_b64decode(encoded + '=' * (-len(encoded) % 4)))
        assert claims.get('sub') == uid and claims.get('aud') == project, 'Authentication token identity does not match its project'
        expiry = min(int(time.time()*1000)+duration*1000, int(claims['exp'])*1000)
        assert expiry > int(time.time()*1000)+60000, 'Smoke authentication token is already near expiry'
        return {'projectId':project,'uid':uid,'login':login,'idToken':token,'refreshToken':body['refreshToken'],
                'expiresAt':expiry}
    raise AssertionError('No existing smoke island was found. An owner must first enter the game; this acceptance never creates or resets an island.')


def run():
    from playwright.sync_api import expect, sync_playwright
    base = os.environ.get('HARBORLIGHT_BASE_URL','').rstrip('/')
    project = origin_project(base)
    frontend = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',str(ROOT/'build/frontend')))
    manifest_bytes = (frontend/'release.json').read_bytes()
    enabled = os.environ.get('HARBORLIGHT_ACCOUNT_API_ENABLED','false').lower() in ('true','1')
    errors, blocked_writes, island_reads, api_reads = [], [], [], []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
        http = pw.request.new_context(extra_http_headers={'Cache-Control':'no-cache'})
        try:
            count = verify_assets(http,base,manifest_bytes)
            config_response = http.get(base+'/__/firebase/init.json',timeout=30000,max_redirects=0)
            assert config_response.status == 200, 'Firebase runtime config is unavailable'
            config = read_json(config_response,'Firebase runtime config')
            assert config.get('projectId') == project, 'Hosted Firebase runtime config points to another project'
            api = http.get(base+'/api/v1/island',timeout=30000,max_redirects=0)
            assert api.status == (401 if enabled else 503), 'Anonymous API status does not match the configured runtime feature flag'
            assert read_json(api,'Anonymous API').get('error') == ('auth-required' if enabled else 'account_api_disabled'), 'Hosting API rewrite did not reach the expected protected/disabled account service'
            runtime = http.get(base+'/api/v1/config',timeout=30000,max_redirects=0)
            if enabled:
                runtime_body = read_json(runtime,'Account API runtime config')
                assert runtime.status == 200 and runtime_body.get('accountApi') is True and runtime_body.get('projectId') == project, 'Account API runtime config does not match the enabled isolated project'
            else:
                assert runtime.status == 503 and read_json(runtime,'Disabled account API').get('error') == 'account_api_disabled', 'Unexpected disabled API runtime response'

            context = browser.new_context(viewport={'width':1366,'height':900},reduced_motion='reduce')
            def prohibit_writes(route):
                parsed = urlsplit(route.request.url)
                read_only_auth = route.request.method == 'POST' and ((parsed.netloc == 'identitytoolkit.googleapis.com' and parsed.path == '/v1/accounts:lookup') or (parsed.netloc == 'securetoken.googleapis.com' and parsed.path == '/v1/token'))
                if route.request.method not in ('GET','HEAD','OPTIONS') and not read_only_auth:
                    blocked_writes.append((route.request.method,urlsplit(route.request.url).path))
                    route.abort('blockedbyclient')
                else:
                    route.continue_()
            context.route('**/*',prohibit_writes)
            page = context.new_page()
            page.on('pageerror',lambda error: errors.append(str(error)))
            page.goto(base+'/harborlight-v1-layered.html',wait_until='domcontentloaded')
            expect(page).to_have_url(re.compile(re.escape(base)+r'/harborlight-auth\.html(?:\?.*)?$'))
            expect(page.locator('#account-fields')).to_be_enabled()
            expect(page.locator('.guest-entry')).to_be_hidden()
            assert page.evaluate('typeof window.__HARBORLIGHT_SET_DEV_STATE__ === "undefined"'), 'Hosted QA bypass must not be enabled'
            context.close()

            identity = existing_identity(http,base,project,config,enabled)
            context = browser.new_context(viewport={'width':1366,'height':900},reduced_motion='reduce')
            context.route('**/*',prohibit_writes)
            session_key = 'harborlight-dev-auth-v1' if project == 'harborlight-dev' else 'harborlight-prod-auth-v1'
            context.add_init_script('(value=>localStorage.setItem(value.key,JSON.stringify(value.session)))('+json.dumps({'key':session_key,'session':identity})+')')
            page = context.new_page()
            page.on('pageerror',lambda error: errors.append(str(error)))
            page.on('response',lambda response: island_reads.append(response.status) if response.request.method == 'GET' and (urlsplit(response.url).path == '/api/v1/island' or '/documents/islands/' in urlsplit(response.url).path) else None)
            page.on('response',lambda response: api_reads.append(response.status) if response.request.method == 'GET' and urlsplit(response.url).path == '/api/v1/island' else None)
            page.goto(base+'/harborlight-v1-layered.html',wait_until='domcontentloaded')
            page.wait_for_function('document.getElementById("loading").hidden',timeout=30000)
            expect(page.locator('[data-hud="working"]')).to_have_text(re.compile(r'\d'))
            assert 200 in island_reads, 'The rendered game did not read its authenticated island successfully'
            if enabled:
                assert 200 in api_reads, 'The enabled account API was not actually used by the hosted signed-in game'
            assert urlsplit(page.url).path == '/harborlight-v1-layered.html', 'Authenticated game redirected away from its island'
            assert page.evaluate('typeof window.__HARBORLIGHT_SET_DEV_STATE__ === "undefined"'), 'Hosted QA fixture injection is not allowed'
            assert page.evaluate('!Object.keys(localStorage).some(k=>/^(harborlight-(?:dev|prod)-island-|harborlight-v1-(?:interactive|new-player)-save)/.test(k))'), 'Game progress must not be written to browser storage'
            assert not errors, 'Hosted browser raised an unexpected application error'
            context.close()
            evidence = {'project':project,'commit':json.loads(manifest_bytes)['commit'],'account_api':enabled,'authenticated_island_render':True,'hosted_assets':count}
            evidence_path = os.environ.get('HARBORLIGHT_HOSTED_EVIDENCE_PATH')
            if evidence_path:
                Path(evidence_path).write_text(json.dumps(evidence)+'\n',encoding='utf-8')
            print('PASS hosted: '+str(count)+' exact asset hashes, anonymous Auth entry, isolated runtime/API routing, actual existing signed-in island render; all browser writes blocked; no gameplay claims/upgrades/resets performed')
        finally:
            http.dispose()
            browser.close()


if __name__ == '__main__':
    run()
