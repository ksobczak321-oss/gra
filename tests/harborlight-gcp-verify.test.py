#!/usr/bin/env python3
"""Exercise read-only cloud verification against a credential-free fake CLI."""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
VERIFY = ROOT / "infra/google-cloud/verify.py"
FAKE_GCLOUD = r'''
import json, os, sys
a = sys.argv[1:]
with open(os.environ['VERIFY_LOG'], 'a') as out: out.write(json.dumps(a)+'\n')
if any(x in a for x in ['create', 'update', 'enable', 'deploy', 'delete', 'add-iam-policy-binding', 'login']):
 print('mutation forbidden', file=sys.stderr); sys.exit(90)
p = next(x.split('=',1)[1] for x in a if x.startswith('--project='))
a = [x for x in a if x != '--quiet' and not x.startswith('--project=') and x != '--format=json']
mode = os.environ.get('VERIFY_MODE','ok')
env = p.rsplit('-',1)[1]
number = '123456' if env == 'dev' else '654321'
runtime = f'harborlight-runtime@{p}.iam.gserviceaccount.com'
deployer = f'harborlight-deployer@{p}.iam.gserviceaccount.com'
member = 'serviceAccount:'+deployer
pool = f'projects/{number}/locations/global/workloadIdentityPools/harborlight-github'
if mode == 'subprocess-failure' and env == 'dev': sys.exit(43)
if mode == 'malformed-json' and env == 'dev': print('not JSON'); sys.exit(0)
def policy(role, principal): return {'bindings':[{'role':role,'members':[principal]}]}
if a[:2] == ['projects','describe']:
 data = {'projectId':p,'projectNumber':number,'lifecycleState':'ACTIVE','labels':{'harborlight_env':env}}
elif a[:3] == ['billing','projects','describe']:
 data = {'billingEnabled':mode!='billing-false','billingAccountName':'billingAccounts/010F11-5A6F09-27543C'}
 if mode == 'wrong-billing': data['billingAccountName']='billingAccounts/OTHER'
elif a[:3] == ['artifacts','repositories','describe']:
 data = {'name':f'projects/{p}/locations/europe-central2/repositories/harborlight','format':'DOCKER'}
elif a[:3] == ['iam','service-accounts','describe']:
 data = {'email':a[3],'disabled':mode=='disabled-sa' and a[3]==runtime}
elif a[:3] == ['iam','workload-identity-pools','describe']:
 data = {'name':pool,'state':'ACTIVE'}
elif a[:4] == ['iam','workload-identity-pools','providers','describe']:
 data = {'name':pool+'/providers/github-main','state':'ACTIVE',
  'oidc':{'issuerUri':'https://token.actions.githubusercontent.com'},
  'attributeMapping':{'google.subject':'assertion.sub','attribute.repository_id':'assertion.repository_id',
   'attribute.repository_owner_id':'assertion.repository_owner_id','attribute.ref':'assertion.ref'},
  'attributeCondition':"assertion.repository_id == '1428128759' && assertion.repository_owner_id == '222425714' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == 'ksobczak321-oss/gra/.github/workflows/google-cloud-"+env+".yml@refs/heads/main' && assertion.event_name == 'workflow_dispatch'"}
 if mode == 'wrong-wif': data['attributeCondition']='true'
elif a[:3] == ['iam','service-accounts','get-iam-policy']:
 data = policy('roles/iam.workloadIdentityUser','principalSet://iam.googleapis.com/'+pool+'/attribute.repository_id/1428128759') if a[3]==deployer else policy('roles/iam.serviceAccountUser',member)
elif a[:3] == ['artifacts','repositories','get-iam-policy']:
 data = policy('roles/artifactregistry.writer',member)
 if mode == 'missing-role': data={}
elif a[:2] == ['projects','get-iam-policy']:
 data = policy('roles/run.admin',member)
 if mode == 'runtime-editor': data['bindings'].append({'role':'roles/editor','members':['serviceAccount:'+runtime]})
else:
 print('unexpected command',file=sys.stderr); sys.exit(91)
print(json.dumps(data))
'''


class ReadOnlyVerificationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="harborlight-gcp-verify-")
        self.addCleanup(self.temporary.cleanup)
        directory = Path(self.temporary.name)
        self.log = directory / "calls.jsonl"
        executable = directory / "gcloud"
        executable.write_text(f"#!{sys.executable}\n" + FAKE_GCLOUD)
        executable.chmod(0o755)
        self.environment = dict(os.environ, PATH=str(directory)+os.pathsep+os.environ['PATH'], VERIFY_LOG=str(self.log))

    def run_verifier(self, mode="ok"):
        result = subprocess.run([sys.executable, str(VERIFY)], env=dict(self.environment, VERIFY_MODE=mode),
                                capture_output=True, text=True, timeout=20)
        calls = [json.loads(line) for line in self.log.read_text().splitlines()]
        self.assertTrue(calls)
        self.assertTrue(all("--format=json" in call for call in calls))
        self.assertFalse(any(any(word in call for word in ["create", "update", "enable", "deploy", "delete", "login"])
                             for call in calls))
        return result

    def test_both_projects_pass_with_read_only_calls(self):
        result = self.run_verifier()
        self.assertEqual(result.returncode, 0, result.stdout+result.stderr)
        self.assertIn("WYNIK: PASS=22, FAIL=0", result.stdout)
        self.assertNotIn("bindings", result.stdout)
        self.assertNotIn("principalSet", result.stdout)

    def test_missing_iam_role_fails(self):
        result = self.run_verifier("missing-role")
        self.assertEqual(result.returncode, 1)
        self.assertIn("brak zapisu obrazów", result.stdout)

    def test_disabled_service_account_fails(self):
        result = self.run_verifier("disabled-sa")
        self.assertEqual(result.returncode, 1)
        self.assertIn("konto usługowe jest wyłączone", result.stdout)

    def test_weakened_wif_condition_fails(self):
        result = self.run_verifier("wrong-wif")
        self.assertEqual(result.returncode, 1)
        self.assertIn("warunek WIF", result.stdout)

    def test_billing_must_be_active_and_on_correct_account(self):
        for mode in ["billing-false", "wrong-billing"]:
            with self.subTest(mode=mode):
                result = self.run_verifier(mode)
                self.assertEqual(result.returncode, 1)
                self.assertIn("FAIL DEV — rozliczenia", result.stdout)

    def test_cli_failure_is_not_reported_as_success_and_other_project_is_checked(self):
        result = self.run_verifier("subprocess-failure")
        self.assertEqual(result.returncode, 1)
        self.assertIn("kodem 43", result.stdout)
        self.assertIn("PASS PROD", result.stdout)
        self.assertNotIn("FAIL=0", result.stdout)

    def test_malformed_json_fails_closed(self):
        result = self.run_verifier("malformed-json")
        self.assertEqual(result.returncode, 1)
        self.assertIn("niepoprawny JSON", result.stdout)

    def test_runtime_project_role_fails(self):
        result = self.run_verifier("runtime-editor")
        self.assertEqual(result.returncode, 1)
        self.assertIn("runtime ma rolę projektową", result.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
