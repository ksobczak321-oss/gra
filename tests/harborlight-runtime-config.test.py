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


if __name__ == '__main__':
    unittest.main(verbosity=2)
