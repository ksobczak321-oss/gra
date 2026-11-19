"""Pure deployment configuration checks; no cloud calls or credentials."""
import hashlib
import base64
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


RUNTIME = module('runtime_settings', 'infra/google-cloud/runtime-config.py')
HOSTING = module('hosting_settings', 'infra/google-cloud/hosting-config.py')
HOSTED = module('hosted_checks', 'tests/harborlight-hosted-v18-smoke.py')


class ConfigurationTests(unittest.TestCase):
    def test_account_api_requires_explicit_enablement_and_correct_project(self):
        sha = 'a' * 40
        for project, environment in [('harborlight-dev','development'),('harborlight-prod','production')]:
            self.assertEqual(RUNTIME.runtime_config(project, sha), {'HARBORLIGHT_ENV': environment, 'HARBORLIGHT_RELEASE': sha})
            enabled = RUNTIME.runtime_config(project, sha, 'true')
            self.assertEqual(enabled['HARBORLIGHT_PROJECT_ID'], project)
            self.assertEqual(enabled['HARBORLIGHT_ACCOUNT_API'], '1')
        for project, release, flag in [('other-project',sha,'false'),('harborlight-dev','latest','true'),('harborlight-prod',sha,'true,OTHER=bad')]:
            with self.assertRaises(ValueError):
                RUNTIME.runtime_config(project, release, flag)

    def test_generated_rewrite_targets_correct_service_without_touching_package(self):
        base = json.loads((ROOT / 'firebase.json').read_text())
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory) / 'frontend'
            public.mkdir()
            manifest = public / 'release.json'
            manifest.write_text('{"commit":"' + 'a' * 40 + '"}')
            before = hashlib.sha256(manifest.read_bytes()).hexdigest()
            for project, service in HOSTING.SERVICES.items():
                result = HOSTING.hosting_config(base, project, service, 'europe-central2', public)['hosting']
                self.assertEqual(result['site'], project)
                self.assertEqual(result['public'], str(public.resolve()))
                self.assertNotIn('target', result)
                self.assertEqual(result['rewrites'], [{'source':'/api/**','run':{'serviceId':service,'region':'europe-central2'}}])
                self.assertEqual(hashlib.sha256(manifest.read_bytes()).hexdigest(), before)
            self.assertNotIn('rewrites', base['hosting'])
            for project, service, region in [('harborlight-prod','harborlight-api-dev','europe-central2'),('harborlight-dev','harborlight-api-dev','us-central1')]:
                with self.assertRaises(ValueError):
                    HOSTING.hosting_config(base, project, service, region, public)

    def test_config_does_not_introduce_spa_fallback(self):
        base = json.loads((ROOT / 'firebase.json').read_text())
        base['hosting']['rewrites'] = [{'source':'**','destination':'/index.html'}]
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory)
            (public / 'release.json').write_text('{}')
            with self.assertRaises(ValueError):
                HOSTING.hosting_config(base,'harborlight-dev','harborlight-api-dev','europe-central2',public)

    def test_hosted_acceptance_rejects_unrelated_or_credential_bearing_origins(self):
        self.assertEqual(HOSTED.origin_project('https://harborlight-dev.web.app'), 'harborlight-dev')
        self.assertEqual(HOSTED.origin_project('https://harborlight.pl'), 'harborlight-prod')
        for value in ['https://harborlight-dev.web.app.attacker.invalid','http://harborlight.pl','https://user:password@harborlight.pl','https://harborlight.pl/nested']:
            with self.assertRaises(ValueError):
                HOSTED.origin_project(value)

    def test_hosted_explicit_account_selection_is_preprod_only_and_bounded(self):
        with patch.dict(HOSTED.os.environ, {'HARBORLIGHT_HOSTED_PREPROD_ACCOUNT': ''}):
            self.assertIsNone(HOSTED.selected_preprod_account('harborlight-dev'))
            self.assertIsNone(HOSTED.selected_preprod_account('harborlight-prod'))
        for login in ('admin1', 'admin2', 'admin3'):
            with patch.dict(HOSTED.os.environ, {'HARBORLIGHT_HOSTED_PREPROD_ACCOUNT': login}):
                self.assertEqual(HOSTED.selected_preprod_account('harborlight-dev'), login)
                with self.assertRaises(ValueError):
                    HOSTED.selected_preprod_account('harborlight-prod')
        for login in ('admin4', 'other@example.invalid', 'admin3,admin1', ' admin3'):
            with patch.dict(HOSTED.os.environ, {'HARBORLIGHT_HOSTED_PREPROD_ACCOUNT': login}):
                with self.assertRaises(ValueError):
                    HOSTED.selected_preprod_account('harborlight-dev')
        for project, selected in [('harborlight-dev', None), ('harborlight-dev', 'admin1'),
                                  ('harborlight-dev', 'admin2'), ('harborlight-prod', None)]:
            self.assertEqual(HOSTED.startup_timeout_ms(project, selected), 30000)
        self.assertEqual(HOSTED.startup_timeout_ms('harborlight-dev', 'admin3'), 600000)

    def test_hosted_replay_requires_responsive_observed_heartbeats(self):
        self.assertEqual(HOSTED.assert_replay_observation({'observed': False, 'ticks': 0, 'max_gap_ms': 0})['observed'], False)
        self.assertEqual(HOSTED.assert_replay_observation({'observed': True, 'ticks': 200, 'max_gap_ms': 1499})['ticks'], 200)
        for report in [None, {}, {'observed': True, 'ticks': 0, 'max_gap_ms': 100},
                       {'observed': True, 'ticks': 10, 'max_gap_ms': 1501},
                       {'observed': True, 'ticks': 10, 'max_gap_ms': float('nan')}]:
            with self.assertRaises(AssertionError):
                HOSTED.assert_replay_observation(report)

    def test_slow_admin3_startup_cannot_pass_without_observed_offthread_replay(self):
        recent = {'observed': False, 'ticks': 0, 'max_gap_ms': 0}
        active = {'observed': True, 'ticks': 200, 'max_gap_ms': 120}
        self.assertEqual(HOSTED.assert_replay_startup(recent, 2000), recent)
        self.assertEqual(HOSTED.assert_replay_startup(active, 540000), active)
        for report, elapsed in [(recent, 30001), (recent, 540000), (active, 600001),
                                (active, float('nan')), (active, -1)]:
            with self.assertRaises(AssertionError):
                HOSTED.assert_replay_startup(report, elapsed)

    def test_hosted_admin3_stays_responsive_after_startup(self):
        valid = {'ready': True, 'ticks': 79, 'max_gap_ms': 814, 'elapsed_ms': 10093}
        self.assertEqual(HOSTED.assert_post_ready_observation(valid), valid)
        for patch in [{'ready': False}, {'ticks': 0}, {'ticks': True}, {'max_gap_ms': 4017},
                      {'max_gap_ms': float('nan')}, {'elapsed_ms': 9999}, {'elapsed_ms': float('inf')}]:
            with self.assertRaises(AssertionError):
                HOSTED.assert_post_ready_observation({**valid, **patch})

    def test_hosted_acceptance_checks_every_asset_against_the_verified_package(self):
        data = b'approved frontend'
        manifest = json.dumps({'schema_version':1,'commit':'a'*40,'files':{'game.js':{'size':len(data),'sha256':hashlib.sha256(data).hexdigest()}}}).encode()
        class Response:
            status = 200
            def __init__(self,value): self.value = value
            def body(self): return self.value
        class Http:
            def __init__(self,asset): self.asset = asset
            def get(self,url,**options):
                self_options = options
                if self_options.get('max_redirects') != 0: raise AssertionError('Do not follow redirects')
                return Response(manifest if '/release.json?' in url else self.asset)
        self.assertEqual(HOSTED.verify_assets(Http(data),'https://harborlight-dev.web.app',manifest),1)
        with self.assertRaises(AssertionError):
            HOSTED.verify_assets(Http(b'mutated'),'https://harborlight-dev.web.app',manifest)

    def test_hosted_session_expiry_never_exceeds_its_google_token(self):
        current = 1_793_361_600
        claims = {'sub': 'dev-admin1', 'aud': 'harborlight-dev', 'exp': current + 900}
        encoded = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip('=')
        token = 'header.' + encoded + '.signature'
        class Response:
            status = 200
            def __init__(self, body): self.body = body
            def json(self): return self.body
        class Http:
            def post(self, url, **options):
                return Response({'localId': 'dev-admin1', 'email': 'admin1@dev.harborlight.pl',
                    'idToken': token, 'refreshToken': 'fixture-refresh', 'expiresIn': '3600'})
            def get(self, url, **options):
                return Response({'fields': {'payload': {'stringValue': '{"coins":100}'}}})
        with patch.object(HOSTED.time, 'time', return_value=current):
            result = HOSTED.existing_identity(Http(), 'https://harborlight-dev.web.app', 'harborlight-dev',
                {'apiKey': 'fixture-public-api-key-123'})
        self.assertEqual(result['expiresAt'], claims['exp'] * 1000)

    def test_hosted_api_only_preprod_reads_existing_world_without_direct_firestore_or_writes(self):
        current = 1_793_361_600
        calls = []
        class Response:
            status = 200
            def __init__(self, body): self.body = body
            def json(self): return self.body
        class Http:
            def post(self, url, **options):
                self_uid = 'dev-' + options['data']['email'].split('@')[0]
                claims = {'sub': self_uid, 'aud': 'harborlight-dev', 'exp': current + 900}
                encoded = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip('=')
                calls.append(('POST', url))
                return Response({'localId': self_uid, 'email': options['data']['email'],
                    'idToken': 'header.' + encoded + '.signature', 'refreshToken': 'fixture-refresh', 'expiresIn': '3600'})
            def get(self, url, **options):
                calls.append(('GET', url))
                assert url == 'https://harborlight-dev.web.app/api/v1/island'
                uid = json.loads(base64.urlsafe_b64decode(options['headers']['Authorization'].split('.')[1] + '=='))['sub']
                return Response({'account': {'expired': False, 'generation': 2},
                    'island': None if uid == 'dev-admin1' else {'generation': 2, 'payload': '{"coins":100}'}})
        with patch.object(HOSTED.time, 'time', return_value=current):
            result = HOSTED.existing_identity(Http(), 'https://harborlight-dev.web.app', 'harborlight-dev',
                {'apiKey': 'fixture-public-api-key-123'}, api_enabled=True)
        self.assertEqual(result['uid'], 'dev-admin2')
        self.assertEqual(len(calls), 4)
        self.assertTrue(all('signInWithPassword' in url if method == 'POST' else url.endswith('/api/v1/island') for method, url in calls))

    def test_hosted_api_only_preprod_never_starts_empty_worlds_for_acceptance(self):
        class Response:
            status = 200
            def __init__(self, body): self.body = body
            def json(self): return self.body
        class Http:
            def post(self, url, **options):
                uid = 'dev-' + options['data']['email'].split('@')[0]
                return Response({'localId': uid, 'email': options['data']['email'], 'idToken': 'fixture-token', 'refreshToken': 'fixture-refresh'})
            def get(self, url, **options):
                assert url == 'https://harborlight-dev.web.app/api/v1/island'
                return Response({'account': {'expired': False}, 'island': None})
        with self.assertRaisesRegex(AssertionError, 'No existing smoke island'):
            HOSTED.existing_identity(Http(), 'https://harborlight-dev.web.app', 'harborlight-dev',
                {'apiKey': 'fixture-public-api-key-123'}, api_enabled=True)

    def test_hosted_selected_admin3_never_falls_back_or_starts_its_empty_world(self):
        calls = []
        class Response:
            status = 200
            def __init__(self, body): self.body = body
            def json(self): return self.body
        class Http:
            def post(self, url, **options):
                calls.append(('POST', url))
                self.asserted_email = options['data']['email']
                if self.asserted_email != 'admin3@dev.harborlight.pl':
                    raise AssertionError('The selected account must not fall back')
                return Response({'localId': 'dev-admin3', 'email': self.asserted_email,
                    'idToken': 'fixture-token', 'refreshToken': 'fixture-refresh'})
            def get(self, url, **options):
                calls.append(('GET', url))
                if url != 'https://harborlight-dev.web.app/api/v1/island':
                    raise AssertionError('Only the existing account API may be read')
                return Response({'account': {'expired': False}, 'island': None})
        with patch.dict(HOSTED.os.environ, {'HARBORLIGHT_HOSTED_PREPROD_ACCOUNT': 'admin3'}):
            with self.assertRaisesRegex(AssertionError, 'No existing smoke island'):
                HOSTED.existing_identity(Http(), 'https://harborlight-dev.web.app', 'harborlight-dev',
                    {'apiKey': 'fixture-public-api-key-123'}, api_enabled=True)
        self.assertEqual([method for method, _ in calls], ['POST', 'GET'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
