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
from helpers.building_stage_acceptance import staged_manifest, assert_scene, assert_art


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


def package_app_version(frontend, manifest):
    """Read the version only from bytes covered by the verified manifest."""
    name = 'harborlight-version.js'
    metadata = manifest.get('files', {}).get(name)
    assert isinstance(metadata, dict), 'The verified release must include its application version module'
    data = (Path(frontend) / name).read_bytes()
    assert len(data) == metadata.get('size') and hashlib.sha256(data).hexdigest() == metadata.get('sha256'), 'Local application version differs from the verified release manifest'
    versions = re.findall(r'''^\s*export\s+const\s+GAME_VERSION\s*=\s*['"](\d+\.\d+\.\d+\.\d+)['"]\s*;\s*$''', data.decode('utf-8'), re.M)
    assert len(versions) == 1, 'The verified release has no unique valid GAME_VERSION export'
    return versions[0]


def assert_modern_hosted_front(page, manifest, expected_version):
    """Inspect the real signed-in DOM without clicks, state injection or writes.

    The retained 0.14 release has its historical smoke contract. Every 0.15+
    release must render the accepted v32 front even for a low-level island.
    Locked buildings remain map functions and dock entries.
    """
    assert isinstance(expected_version, str) and re.fullmatch(r'\d+\.\d+\.\d+\.\d+', expected_version), 'A valid verified application version is required for hosted UI acceptance'
    version = tuple(int(part) for part in expected_version.split('.'))
    if version[:2] == (0, 14):
        return {'required': False, 'app_version': expected_version, 'reason': 'historical-0.14-release'}
    assert version >= (0, 15, 0, 0), 'Unsupported application version for hosted UI acceptance'
    assert isinstance(manifest.get('files'), dict), 'The verified release manifest is required for hosted UI acceptance'
    assert page.locator('body').get_attribute('data-ruleset') == '32', 'The actual authenticated island rendered the old UI instead of the current v32 front'
    stages = staged_manifest(Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',ROOT)))
    if stages:
        page.wait_for_function('''()=>document.querySelectorAll('[data-building-stage-map]:not([data-building-stage-decoration])').length===20&&document.querySelector('#island-ambient')?.dataset.ready==='true' ''', timeout=30000)
        stage_report=assert_scene(page,stages)
    else:
        page.wait_for_function('''()=>document.querySelectorAll('[data-accepted-artwork]').length===4&&
          [...document.querySelectorAll('[data-accepted-map-art] img')].every(image=>image.complete&&image.naturalWidth>0)''', timeout=30000)
        stage_report=None
    snapshot = page.evaluate('''()=>{
      const all=selector=>[...document.querySelectorAll(selector)];
      const region=node=>[node.style.left,node.style.top,node.style.width,node.style.height].map(parseFloat);
      const box=node=>{if(!node)return null;const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right};};
      const surface=selector=>{const node=document.querySelector(selector);if(!node)return{selector,missing:true};const style=getComputedStyle(node);return{selector,background:style.backgroundImage+' '+style.backgroundColor,color:style.color,colorScheme:style.colorScheme};};
      const dock=document.querySelector('[data-building-dock]');
      return{
        functions:all('.world-hotspot[id^="hit-world-"]').map(node=>({id:node.id.slice(10),region:region(node)})),
        markers:all('[data-v32-building]').map(node=>({id:node.dataset.v32Building,hit:node.querySelectorAll('.v32-native-hit').length})),
        acceptedLayers:all('[data-accepted-map-art]').length,
        acceptedPatches:all('[data-accepted-artwork]').map(node=>node.dataset.acceptedArtwork),
        acceptedOcean:all('[data-accepted-ocean]').length,
        oldTheatreScenes:all('[data-theatre-map]').length,
        dockCategory:dock?.dataset.buildingDock,
        dockCards:all('[data-building-dock] [data-dock-building]').map(node=>({id:node.dataset.dockBuilding,hidden:node.hidden,art:node.querySelector('[data-map-building-art]')?.dataset.mapBuildingArt})),
        tabs:all('.dock-tabs [data-dock-category]').map(node=>node.dataset.dockCategory),
        dock:box(document.querySelector('.dock-tabs')),
        boat:box(document.querySelector('#hit-boat')),
        activity:box(document.querySelector('.island-activity-stack')),
        logicalDock:document.querySelector('.dock-tabs')?{left:parseFloat(getComputedStyle(document.querySelector('.dock-tabs')).left),width:parseFloat(getComputedStyle(document.querySelector('.dock-tabs')).width)}:null,
        surfaces:['#island-dialog','.island-topbar','.island-activity-stack','.dock-tabs','[data-building-dock] .building-dock-card'].map(surface),
        resources:all('[data-resource-dock] [data-dock-resource]').map(node=>{const icon=node.querySelector('[data-resource-icon]'),sprite=icon?.querySelector('.goods-icon-sprite'),style=sprite?getComputedStyle(sprite):null;return{id:node.dataset.dockResource,icon:icon?.dataset.resourceIcon,role:icon?.getAttribute('role'),label:icon?.getAttribute('aria-label'),background:style?.backgroundImage,position:style?.backgroundPosition,fallback:!!node.querySelector('[data-resource-icon-fallback]'),oldSvg:!!node.querySelector('svg.resource-dock-illustration')};})
      };
    }''')
    functions = {'townhall','house','farm','lumber','quarry','windmill','sawmill','warehouse','bakery','dairy','slaughterhouse','fisher','leatherworks','academy','barracks','chapel','lighthouse','theatre','market','dock'}
    actual = [item['id'] for item in snapshot['functions']]
    assert len(actual) == 20 and set(actual) == functions, ('Authenticated v32 map must retain all 20 functions regardless of locks', actual)
    markers = [item['id'] for item in snapshot['markers']]
    assert len(markers) == 7 and set(markers) == {'bakery','dairy','slaughterhouse','fisher','leatherworks','academy','barracks'}, ('Authenticated v32 map is missing its seven new building markers', markers)
    assert all(item['hit'] == 1 for item in snapshot['markers']), 'Each new map marker must retain its native hit target'
    assert snapshot['acceptedLayers'] == 1 and snapshot['acceptedOcean'] == 1, 'Authenticated v32 map lacks the accepted artwork and ocean layers'
    if stages:
        assert snapshot['acceptedPatches'] == [], 'Old patches would repaint outdated building levels'
    else:
        assert len(snapshot['acceptedPatches']) == 4 and set(snapshot['acceptedPatches']) == {'farm','lumber','slaughterhouse','fisher'}, ('Authenticated v32 map lacks the four accepted art patches', snapshot['acceptedPatches'])
    theatre = next(item for item in snapshot['functions'] if item['id'] == 'theatre')
    assert theatre['region'] == [634,360,112,66] and snapshot['oldTheatreScenes'] == 0, ('Authenticated Theatre must use its accepted native region', theatre)
    groups = {
        'administration': {'townhall','house','warehouse','market','dock','chapel','lighthouse','academy','barracks'},
        'economy': {'farm','windmill','quarry','lumber','sawmill','bakery','dairy','slaughterhouse','fisher','leatherworks'},
    }
    cards = snapshot['dockCards']
    assert len(cards) == 19 and {item['id'] for item in cards} == groups['administration'] | groups['economy'], ('Authenticated dock must retain nine Administration and ten Economy entries regardless of locks', cards)
    assert all(item['art'] == item['id'] for item in cards), 'Authenticated dock thumbnails must show their accepted building artwork'
    if stages:
        levels=page.locator('[data-building-stage-scene] [data-building-stage-map]:not([data-building-stage-decoration])').evaluate_all('ns=>Object.fromEntries(ns.map(n=>[n.dataset.mapBuildingArt,Number(n.dataset.level)]))')
        for card in page.locator('[data-building-dock] [data-dock-building]').all():
            identity=card.get_attribute('data-dock-building')
            assert_art(card.locator('[data-map-building-art]'),stages,identity,levels[identity])
    assert snapshot['tabs'] == ['administration','economy','resources','decorations','paths'], ('Authenticated v32 dock must retain all five categories', snapshot['tabs'])
    active = snapshot['dockCategory']
    assert active in groups and {item['id'] for item in cards if not item['hidden']} == groups[active], ('Authenticated dock must show its complete selected building group', active, cards)
    assert snapshot['logicalDock'] == {'left':474,'width':1190}, ('Authenticated dock lost its accepted logical position', snapshot['logicalDock'])
    dock, activity = snapshot['dock'], snapshot['activity']
    assert dock and activity and dock['width'] > 0 and activity['width'] > 0 and abs(dock['right'] - activity['right']) <= 1, ('Authenticated dock and activity panel right edges must align', dock, activity)
    boat = snapshot['boat']
    assert boat and boat['width'] > 0 and boat['right'] + 1 < dock['x'], ('Authenticated dock must leave the ship clear', boat, dock)
    for surface in snapshot['surfaces']:
        colors = re.findall(r'rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)', surface.get('background',''))
        assert 'gradient(' in surface.get('background','') and colors and all(.2126*int(r)+.7152*int(g)+.0722*int(b) < 110 for r,g,b in colors), ('Authenticated UI lost its dark surface', surface)
    assert snapshot['surfaces'][0]['colorScheme'] == 'dark', 'Authenticated dialogs must retain the dark control theme'
    resources = snapshot['resources']
    products = {'wood','stone','grain','planks','vegetables','livestock','rawMilk','sourMilk','fish','flour','pasteurizedMilk','meat','leather','bread','cake','cheese','civilianClothes','militaryClothes','professorRobes','smokedFish','fishPreserves'}
    actual_resources = [item['id'] for item in resources]
    # Historical food stock remains visible until used; it must use the same
    # current atlas, while all 21 current products are always represented.
    assert len(actual_resources) == len(set(actual_resources)) and products <= set(actual_resources) and set(actual_resources) - products <= {'food'}, ('Authenticated resource dock lacks the current product icons', actual_resources)
    for item in resources:
        assert item['icon'] == item['id'] and item['role'] == 'img' and item['label'] and 'harborlight-goods-v32.png' in (item['background'] or '') and not item['fallback'] and not item['oldSvg'], ('Authenticated resource dock must use the current labeled product atlas', item)
    assert len({item['position'] for item in resources}) == len(resources), 'Authenticated resource dock must use distinct product atlas tiles'
    return {'required': True, 'app_version': expected_version, 'map_functions':20,'new_markers':7,'accepted_art_patches':0 if stages else 4,'building_stages':stage_report,'administration_entries':9,'economy_entries':10,'native_theatre':True,'dock_right_edge_aligned':True,'ship_clear':True,'dark_ui':True,'current_product_icons':len(products)}


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
    manifest = json.loads(manifest_bytes)
    expected_version = package_app_version(frontend, manifest)
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
            modern_front = assert_modern_hosted_front(page, manifest, expected_version)
            assert not errors, 'Hosted browser raised an unexpected application error'
            context.close()
            evidence = {'project':project,'commit':manifest['commit'],'app_version':expected_version,'account_api':enabled,'authenticated_island_render':True,'hosted_assets':count,'modern_front':modern_front}
            evidence_path = os.environ.get('HARBORLIGHT_HOSTED_EVIDENCE_PATH')
            if evidence_path:
                Path(evidence_path).write_text(json.dumps(evidence)+'\n',encoding='utf-8')
            print('PASS hosted: '+str(count)+' exact asset hashes, anonymous Auth entry, isolated runtime/API routing, actual existing signed-in island render; all browser writes blocked; no gameplay claims/upgrades/resets performed')
        finally:
            http.dispose()
            browser.close()


if __name__ == '__main__':
    run()
