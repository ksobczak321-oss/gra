"""A real cloud bootstrap must upgrade an existing legacy save, without reset.

Only Firebase Auth and isolated Firestore/Account API responses are fixtures. Public assets and
the normal authenticated startup run unchanged at the actual PRE-PROD hostname;
there is no loopback DEV fixture, production state getter, or live account call.
"""
import base64
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import mimetypes
import os
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright
from helpers.browser_offers import dismiss_player_offers

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
BASE = 'https://harborlight-dev.web.app'
NOW = datetime(2026, 11, 18, 12, tzinfo=timezone.utc)
NOW_MS = int(NOW.timestamp() * 1000)
OUTPUT = Path(os.environ.get('HARBORLIGHT_CLOUD_RULES_OUTPUT', '/tmp/harborlight-cloud-rules-v32'))
OUTPUT.mkdir(parents=True, exist_ok=True)


def legacy_state():
    code = '''
      import {createState,normalizeState} from './harborlight-v1-state.js';
      const now=%d,s=createState(now);
      s.islandName='Istniejąca wyspa bez resetu';s.settings.language='pl';s.population=31;
      s.buildings.townhall.level=5;s.buildings.house.level=5;s.buildings.warehouse.level=4;
      s.islandStartedAt=now-123456789;s.onboarding.worldStartedAt=s.islandStartedAt;
      s.onboarding.completedAt=now-9876543;
      s.tutorial.autoOpenDisabled=true;s.objective.repaired=true;
      s.engagementSchedule.initialCompleted=true;s.engagementSchedule.initialAnchored=true;
      s.engagementSchedule.nextAt=now+86400000;
      s.loyalty.lastOfferDay='2026-11-18';
      s.welcomeWorkers.claimedDays=['2026-11-18'];s.welcomeWorkers.granted=1;
      s.welcome={startedAt:now-123000,until:now+987000};
      let index=1;for(const id of Object.keys(s.resources))s.resources[id]=100+index++*37;
      s.statistics.collected=234;s.statistics.upgrades=17;s.taxProgress=0.25;
      const result=normalizeState(s,now);
      for(const person of result.residents){person.personUid='legacy:person-'+person.id;person.name='Zachowana osoba '+person.id;}
      for(const [index,workplace]of [[0,'farm'],[1,'farm'],[2,'quarry'],[3,'warehouse'],[4,'warehouse'],[5,'warehouse']])result.residents[index].workplace=workplace;
      for(const [id,building]of Object.entries(result.buildings)){building.workers=result.residents.filter(p=>p.workplace===id).length;building.workProgress=Array(building.workers).fill(0.25);}
      if(result.ruleset===32||Object.keys(result.buildings).length!==13)throw Error('Fixture must be legacy, not v32');
      console.log(JSON.stringify(result));
    ''' % NOW_MS
    return json.loads(subprocess.check_output(['node', '--input-type=module', '-e', code], cwd=SOURCE))


def session():
    claims = {'aud': 'harborlight-dev', 'iss': 'https://securetoken.google.com/harborlight-dev',
              'sub': 'dev-admin1', 'exp': int(NOW.timestamp()) + 3600}
    encoded = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip('=')
    return {'projectId': 'harborlight-dev', 'uid': 'dev-admin1', 'login': 'admin1',
            'idToken': 'header.' + encoded + '.signature', 'refreshToken': 'isolated-fixture-refresh',
            'expiresAt': NOW_MS + 3600000, 'lastActivityAt': NOW_MS}


def run(api_enabled):
    output = OUTPUT / ('account-api' if api_enabled else 'firestore')
    output.mkdir(parents=True, exist_ok=True)
    original = legacy_state()
    snapshot = json.loads(json.dumps(original))
    version = {'revision': 41, 'updateTime': '2026-11-18T12:00:00.000000Z'}
    schema_version = 1
    reads, writes, requests, errors = [], [], [], []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                     headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1672, 'height': 941}, reduced_motion='reduce')
        def route(request_route):
            nonlocal snapshot, version, schema_version
            request = request_route.request
            parsed = urlsplit(request.url)
            requests.append([request.method, parsed.hostname, parsed.path])
            if parsed.hostname == 'identitytoolkit.googleapis.com':
                assert parsed.path == '/v1/accounts:lookup' and request.method == 'POST'
                assert request.post_data_json['idToken'] == session()['idToken']
                return request_route.fulfill(json={'users': [{'localId': 'dev-admin1', 'displayName': ''}]})
            if parsed.hostname == 'firestore.googleapis.com':
                assert not api_enabled, 'Enabled Account API must not fall back to Firestore'
                cors = {'access-control-allow-origin': BASE, 'access-control-allow-headers': 'authorization,content-type',
                        'access-control-allow-methods': 'GET,POST,OPTIONS'}
                if request.method == 'OPTIONS':
                    return request_route.fulfill(status=204, headers=cors)
                assert request.headers.get('authorization') == 'Bearer ' + session()['idToken']
                name = 'projects/harborlight-dev/databases/(default)/documents/islands/dev-admin1'
                if request.method == 'GET':
                    assert parsed.path == '/v1/' + name
                    reads.append(json.loads(json.dumps(snapshot)))
                    fields = {'schemaVersion': {'integerValue': str(schema_version)}, 'revision': {'integerValue': str(version['revision'])},
                              'payload': {'stringValue': json.dumps(snapshot)}, 'generation': {'integerValue': '7'}}
                    if schema_version == 2:
                        fields['worldIds'] = {'arrayValue': {'values': []}}
                    return request_route.fulfill(headers=cors, json={'name': name, 'fields': fields, 'updateTime': version['updateTime']})
                assert request.method == 'POST' and parsed.path == '/v1/projects/harborlight-dev/databases/(default)/documents:commit'
                body = request.post_data_json
                assert len(body['writes']) == 1
                write = body['writes'][0]
                assert write['update']['name'] == name and write['currentDocument'] == {'updateTime': version['updateTime']}, 'Firestore writes must use the existing island CAS, never creation/reset'
                assert write['updateTransforms'] == [{'fieldPath': 'updatedAt', 'setToServerValue': 'REQUEST_TIME'}]
                fields = write['update']['fields']
                assert int(fields['revision']['integerValue']) == version['revision'] + 1
                schema_version = int(fields['schemaVersion']['integerValue'])
                assert schema_version == 2 and fields['generation'] == {'integerValue': '7'}
                assert fields['worldIds']['arrayValue']['values'] == []
                snapshot = json.loads(fields['payload']['stringValue'])
                writes.append(json.loads(json.dumps(snapshot)))
                version = {'revision': version['revision'] + 1, 'updateTime': '2026-11-18T12:00:00.%06dZ' % len(writes)}
                return request_route.fulfill(headers=cors, json={'writeResults': [{'updateTime': version['updateTime']}], 'commitTime': version['updateTime']})
            assert parsed.hostname == 'harborlight-dev.web.app', 'Unexpected external request: ' + request.url
            if parsed.path == '/__/firebase/init.json':
                return request_route.fulfill(json={'projectId': 'harborlight-dev', 'apiKey': 'AIza-fixture-public-key-123456789', 'messagingSenderId': '28040211190'})
            if parsed.path == '/api/v1/config':
                return request_route.fulfill(json={'accountApi': True, 'projectId': 'harborlight-dev', 'environment': 'preprod'}) if api_enabled else request_route.fulfill(status=503, json={'error': 'account_api_disabled'})
            if parsed.path == '/api/v1/island':
                assert api_enabled, 'Disabled Account API must load the existing Firestore island'
                assert request.headers.get('authorization') == 'Bearer ' + session()['idToken']
                if request.method == 'GET':
                    reads.append(json.loads(json.dumps(snapshot)))
                elif request.method == 'PUT':
                    body = request.post_data_json
                    assert body['expectedRevision'] == version['revision'] and body['generation'] == 7
                    snapshot = json.loads(body['payload'])
                    writes.append(json.loads(json.dumps(snapshot)))
                    version = {'revision': version['revision'] + 1, 'updateTime': '2026-11-18T12:00:00.%06dZ' % len(writes)}
                    return request_route.fulfill(json={**version, 'generation': 7})
                else:
                    raise AssertionError('Existing islands must never be created/reset: ' + request.method)
                return request_route.fulfill(json={'account': {'generation': 7, 'expired': False, 'lastPlayedAt': NOW_MS},
                                                    'island': {'payload': json.dumps(snapshot), 'version': version, 'generation': 7}})
            if parsed.path == '/api/v1/activity':
                assert api_enabled
                assert request.method == 'POST' and request.post_data_json == {'generation': 7}
                return request_route.fulfill(json={'recorded': True, 'lastPlayedAt': NOW_MS})
            if parsed.path.startswith('/api/'):
                raise AssertionError('Unrelated API request: ' + request.url)
            assert request.method == 'GET', 'Unexpected static write: ' + request.url
            file = (ROOT / unquote(parsed.path).lstrip('/')).resolve()
            assert file.is_relative_to(ROOT) and file.is_file(), str(file)
            return request_route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
        context.route('**/*', route)
        context.add_init_script('localStorage.setItem("harborlight-dev-auth-v1",' + json.dumps(json.dumps(session())) + ');localStorage.setItem("harborlight-language","pl");')
        page = context.new_page()
        page.clock.set_fixed_time(NOW)
        page.on('pageerror', lambda error: errors.append(str(error)))
        try:
            page.goto(BASE + '/harborlight-v1-layered.html', wait_until='networkidle')
            page.wait_for_function('document.getElementById("loading").hidden', timeout=30000)
            dismiss_player_offers(page)
            assert reads and reads[0] == original, 'Normal API must read the exact pre-existing legacy save'
            assert page.evaluate('typeof window.__HARBORLIGHT_DEV_FIXTURE__ === "undefined" && typeof window.__HARBORLIGHT_DEV_STATE__ === "undefined" && typeof window.__HARBORLIGHT_SET_DEV_STATE__ === "undefined"'), 'Hosted test bypass must remain unavailable'
            actual = page.locator('.world-hotspot[id^="hit-world-"]').evaluate_all('nodes=>nodes.map(n=>n.id.slice(10))')
            (output/'bootstrap.json').write_text(json.dumps({'origin': BASE, 'account_api': api_enabled, 'legacy_buildings': list(original['buildings']), 'rendered_functions': actual, 'errors': errors}, ensure_ascii=False, indent=2)+'\n')
            assert len(actual) == 20, 'Authenticated legacy cloud save rendered %d functions instead of modern20: %s' % (len(actual), actual)
            expect(page.locator('[data-v32-building]')).to_have_count(7)
            from helpers.building_stage_acceptance import staged_manifest, assert_scene
            stages=staged_manifest(ROOT)
            if stages: assert_scene(page,stages)
            else: expect(page.locator('[data-accepted-artwork]')).to_have_count(4)
            helper_spec = importlib.util.spec_from_file_location('hosted_acceptance', SOURCE/'tests/harborlight-hosted-v18-smoke.py')
            helper = importlib.util.module_from_spec(helper_spec)
            helper_spec.loader.exec_module(helper)
            version_bytes = (ROOT/'harborlight-version.js').read_bytes()
            manifest = json.loads((ROOT/'release.json').read_text()) if (ROOT/'release.json').exists() else {
                'files': {'harborlight-version.js': {'size': len(version_bytes), 'sha256': hashlib.sha256(version_bytes).hexdigest()}}}
            expected_version = helper.package_app_version(ROOT, manifest)
            modern_front = helper.assert_modern_hosted_front(page, manifest, expected_version)
            def save_response(response):
                parsed = urlsplit(response.url)
                return response.request.method == ('PUT' if api_enabled else 'POST') and parsed.path == ('/api/v1/island' if api_enabled else '/v1/projects/harborlight-dev/databases/(default)/documents:commit')
            with page.expect_response(save_response):
                page.locator('#hit-category-economy').click()
            expect(page.locator('[data-building-dock] [data-dock-building]:visible')).to_have_count(10)
            expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
            page.wait_for_function('document.body.dataset.cloudStatus === "saved"')
            assert writes, 'The migrated in-memory save must be observable through an ordinary isolated cloud save'
            saved = writes[-1]
            assert saved.get('ruleset') == 32
            assert saved['islandName'] == original['islandName']
            before_people = [(p['id'], p['personUid'], p['name'], p.get('workplace')) for p in original['residents']]
            after_people = [(p['id'], p['personUid'], p['name'], p.get('workplace')) for p in saved['residents']]
            assert all(person in after_people for person in before_people), 'Migration lost or renamed an existing resident'
            assert len({p['personUid'] for p in saved['residents']}) == len(saved['residents']), 'Resident identity collision after migration'
            assert saved['population'] == len(saved['residents']) == 39, 'TH5 migration grants its four founding professors and four founding soldiers exactly once'
            for identity, building in original['buildings'].items():
                assert saved['buildings'][identity]['level'] == building['level'], identity
                assert saved['buildings'][identity]['workers'] == building['workers'], identity
                assert saved['buildings'][identity]['workProgress'] == building['workProgress'], identity
            for identity, value in original['resources'].items():
                assert saved['resources'][identity] == value, (identity, value, saved['resources'][identity])
            assert saved['worldTimeMs'] == original['worldTimeMs'] == NOW_MS
            assert saved['lastSimulatedAt'] == original['lastSimulatedAt'] == NOW_MS
            assert saved['islandStartedAt'] == original['islandStartedAt']
            assert saved['welcome'] == original['welcome']
            assert saved['onboarding'] == original['onboarding']
            assert saved['statistics'] == original['statistics']
            assert page.evaluate('!Object.keys(localStorage).some(k=>/^(harborlight-(?:dev|prod)-island-|harborlight-v1-(?:interactive|new-player)-save)/.test(k))')
            assert not errors, errors
            page.screenshot(path=str(output/'authenticated-modern-cloud.png'))
            read_count = len(reads)
            page.reload(wait_until='networkidle')
            page.wait_for_function('document.getElementById("loading").hidden', timeout=30000)
            dismiss_player_offers(page)
            assert len(reads) > read_count and reads[-1].get('ruleset') == 32, 'Reload must use the migrated cloud save'
            assert reads[-1]['resources'] == saved['resources'], 'Reload replaced the cloud inventory'
            assert [(p['id'], p['personUid'], p['name'], p.get('workplace')) for p in reads[-1]['residents']] == after_people, 'Reload changed the persisted resident identities'
            helper.assert_modern_hosted_front(page, manifest, expected_version)
            with page.expect_response(save_response):
                page.locator('#hit-category-resources').click()
            expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
            reopened = writes[-1]
            assert reopened['population'] == 39 and [(p['id'], p['personUid'], p['name'], p.get('workplace')) for p in reopened['residents']] == after_people, 'Reload repeated specialist grants or changed a resident'
            assert reopened['resources'] == saved['resources'], 'Reload altered the preserved inventory'
            assert not errors, errors
            (output/'report.json').write_text(json.dumps({'mode': 'isolated normal hosted Auth and cloud bootstrap', 'account_api': api_enabled, 'origin': BASE, 'legacy_read': True, 'modern_front': modern_front, 'cloud_saves': len(writes), 'resident_identities_preserved': len(before_people), 'clocks_preserved': True, 'migrated_cloud_reload': True, 'requests': requests}, ensure_ascii=False, indent=2)+'\n')
            print('PASS existing authenticated legacy cloud save (%s): 20 modern functions, 7 new building functions and complete current artwork; two normal cloud saves and reload preserve identities, stocks, levels and clocks without reset or browser save.' % ('Account API' if api_enabled else 'Firestore CAS'))
        except Exception:
            page.screenshot(path=str(output/'failure.png'))
            raise
        finally:
            context.close()
            browser.close()


if __name__ == '__main__':
    for enabled in (False, True):
        run(enabled)
