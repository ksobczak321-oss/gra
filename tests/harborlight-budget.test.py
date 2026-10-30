"""Safety/identity/readback checks for the owner-only 100 USD budget."""
import copy
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('budget', ROOT/'infra/google-cloud/prepare-budget.py')
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


class FakeCloud:
    def __init__(self):
        self.calls = []
        self.enabled = True
        self.project_overrides = {}
        self.billing_overrides = {}
        self.account = {'name': M.BILLING_ACCOUNT, 'open': True, 'currencyCode': 'USD'}
        self.budgets = []
        self.bad_readback = False

    def gcloud(self, *arguments, **options):
        self.calls.append(('gcloud', arguments, options))
        if arguments[:2] == ('projects', 'describe'):
            project = arguments[2]
            return {'projectId': project, 'projectNumber': M.PROJECTS[project],
                    'labels': {'harborlight_env': project.rsplit('-',1)[1]},
                    **self.project_overrides.get(project,{})}
        if arguments[:3] == ('billing','projects','describe'):
            project = arguments[3]
            return {'projectId': project, 'billingEnabled': True, 'billingAccountName': M.BILLING_ACCOUNT,
                    **self.billing_overrides.get(project,{})}
        if arguments[:3] == ('billing','accounts','describe'):
            assert arguments[3] == M.BILLING_ACCOUNT.split('/',1)[1]
            return copy.deepcopy(self.account)
        if arguments[:2] == ('services','list'):
            return [{'config': {'name': M.API_SERVICE}}] if self.enabled else []
        if arguments[:2] == ('services','enable'):
            assert options.get('mutate') is True
            assert arguments[2:] == (M.API_SERVICE, '--project='+M.QUOTA_PROJECT)
            self.enabled = True
            return {}
        raise AssertionError(arguments)

    def request(self, method, url, body=None):
        self.calls.append((method,url,copy.deepcopy(body)))
        path = urlsplit(url).path
        if method == 'GET' and path.endswith('/budgets'):
            return {'budgets': copy.deepcopy(self.budgets)}
        if method == 'POST':
            assert url == M.BUDGETS_ORIGIN+M.BILLING_ACCOUNT+'/budgets'
            data = {**copy.deepcopy(body), 'name':M.BILLING_ACCOUNT+'/budgets/managed-1','etag':'first-etag'}
            self.budgets.append(data)
            return copy.deepcopy(data)
        name = path.removeprefix('/v1/')
        existing = next(b for b in self.budgets if b['name'] == name)
        if method == 'PATCH':
            assert body['etag'] == existing['etag']
            existing.update(copy.deepcopy(body),etag='next-etag')
            return copy.deepcopy(existing)
        if method == 'GET':
            result = copy.deepcopy(existing)
            if self.bad_readback:
                result['amount']['specifiedAmount']['units']='101'
            return result
        raise AssertionError((method,url,body))

    def writes(self):
        return [c for c in self.calls if c[0] in ('POST','PATCH','DELETE') or c[0]=='gcloud' and c[2].get('mutate')]


def existing_budget(**updates):
    return {**M.desired_budget(), 'name':M.BILLING_ACCOUNT+'/budgets/managed-1','etag':'etag-1',**updates}


class BudgetTests(unittest.TestCase):
    def test_check_missing_budget_is_read_only(self):
        cloud = FakeCloud()
        self.assertFalse(M.prepare(cloud)['ready'])
        self.assertEqual(cloud.writes(),[])

    def test_check_never_enables_the_api(self):
        cloud=FakeCloud();cloud.enabled=False
        self.assertFalse(M.prepare(cloud)['ready'])
        self.assertEqual(cloud.writes(),[])

    def test_apply_creates_only_scoped_usd_monthly_alert_budget_and_rechecks_it(self):
        cloud=FakeCloud();cloud.enabled=False
        self.assertTrue(M.prepare(cloud,True)['ready'])
        created=cloud.budgets[0]
        self.assertEqual(created['amount'],{'specifiedAmount':{'currencyCode':'USD','units':'100'}})
        self.assertEqual(set(created['budgetFilter']['projects']),{'projects/28040211190','projects/992911312434'})
        self.assertEqual(created['budgetFilter']['calendarPeriod'],'MONTH')
        self.assertEqual(created['budgetFilter']['creditTypesTreatment'],'INCLUDE_ALL_CREDITS')
        self.assertEqual([r['thresholdPercent'] for r in created['thresholdRules']],[.5,.75,.9,1.])
        self.assertNotIn('spendCap',created)
        self.assertEqual(created['notificationsRule'],{'disableDefaultIamRecipients':False})
        self.assertTrue(any(c[0]=='GET' and c[1]==M.BUDGETS_ORIGIN+created['name'] for c in cloud.calls))
        self.assertTrue(any(c[0]=='gcloud' and c[1][:3]==('billing','accounts','describe') for c in cloud.calls))
        self.assertFalse(any(c[0]=='GET' and c[1].startswith('https://cloudbilling.googleapis.com/') for c in cloud.calls))
        self.assertEqual([c[0] for c in cloud.writes()],['gcloud','POST'])

    def test_second_apply_does_not_duplicate_or_rewrite_budget(self):
        cloud=FakeCloud();M.prepare(cloud,True);cloud.calls=[]
        self.assertEqual(M.prepare(cloud,True),{'ready':True,'changed':False,'name':cloud.budgets[0]['name']})
        self.assertEqual(cloud.writes(),[])

    def test_wrong_project_billing_and_currency_fail_before_writes(self):
        for field in ('project','billing','currency'):
            with self.subTest(field=field):
                cloud=FakeCloud()
                if field=='project':cloud.project_overrides['harborlight-dev']={'projectNumber':'123'}
                if field=='billing':cloud.billing_overrides['harborlight-prod']={'billingAccountName':'billingAccounts/OTHER'}
                if field=='currency':cloud.account['currencyCode']='PLN'
                with self.assertRaises(M.BudgetError):M.prepare(cloud,True)
                self.assertEqual(cloud.writes(),[])

    def test_existing_spend_cap_is_never_converted_or_lifted(self):
        for cap in ({'inputState':'CONFIGURED','outputState':'ENFORCED'},{}):
            with self.subTest(cap=cap):
                cloud=FakeCloud();cloud.budgets=[existing_budget(spendCap=cap)]
                with self.assertRaisesRegex(M.BudgetError,'Spend Cap'):M.prepare(cloud,True)
                self.assertEqual(cloud.writes(),[])

    def test_updates_use_etag_and_preserve_existing_notification_channels(self):
        cloud=FakeCloud();budget=existing_budget()
        budget['amount']['specifiedAmount']['units']='50'
        budget['notificationsRule']['monitoringNotificationChannels']=['projects/harborlight-dev/notificationChannels/123']
        cloud.budgets=[budget]
        self.assertTrue(M.prepare(cloud,True)['changed'])
        patch=next(c for c in cloud.calls if c[0]=='PATCH')
        self.assertEqual(patch[2]['etag'],'etag-1')
        self.assertEqual(patch[2]['notificationsRule']['monitoringNotificationChannels'],budget['notificationsRule']['monitoringNotificationChannels'])
        self.assertNotIn('spendCap',patch[2])

    def test_missing_etag_and_foreign_currency_existing_budget_are_not_overwritten(self):
        for field in ('etag','currency'):
            with self.subTest(field=field):
                cloud=FakeCloud();budget=existing_budget()
                if field=='etag':budget.pop('etag')
                else:budget['amount']['specifiedAmount']['currencyCode']='EUR'
                cloud.budgets=[budget]
                with self.assertRaises(M.BudgetError):M.prepare(cloud,True)
                self.assertEqual(cloud.writes(),[])

    def test_readback_failure_cannot_report_success(self):
        cloud=FakeCloud();cloud.bad_readback=True
        with self.assertRaisesRegex(M.BudgetError,'Odczyt po zapisie'):M.prepare(cloud,True)

    def test_duplicate_managed_names_are_not_arbitrarily_overwritten(self):
        cloud=FakeCloud();cloud.budgets=[existing_budget(),existing_budget(name=M.BILLING_ACCOUNT+'/budgets/managed-2')]
        with self.assertRaisesRegex(M.BudgetError,'kilka budżetów'):M.prepare(cloud,True)
        self.assertEqual(cloud.writes(),[])

    def test_unrelated_budgets_remain_untouched(self):
        cloud=FakeCloud();other=existing_budget(displayName='Other budget',name=M.BILLING_ACCOUNT+'/budgets/unrelated')
        cloud.budgets=[copy.deepcopy(other)]
        self.assertTrue(M.prepare(cloud,True)['changed'])
        self.assertEqual(cloud.budgets[0],other)

    def test_foreign_resource_and_endpoint_are_rejected_before_authentication(self):
        with self.assertRaises(M.BudgetError):M.budget_name('billingAccounts/FOREIGN/budgets/123')
        with self.assertRaises(M.BudgetError):M.Cloud().request('GET','https://example.invalid/v1/'+M.BILLING_ACCOUNT)

    def test_provider_diagnostics_do_not_disclose_tokens(self):
        secret='ya29.secret-owner-token'
        value=M.safe_message('Bearer '+secret+' access_token="'+secret+'"',secret)
        self.assertNotIn(secret,value)
        self.assertIn('[REDACTED]',value)

    def test_successful_api_enable_can_have_empty_stdout(self):
        calls=[]
        def runner(command,**kwargs):
            calls.append(command)
            return SimpleNamespace(returncode=0,stdout='',stderr='Operation finished successfully.')
        cloud=M.Cloud(runner=runner)
        self.assertEqual(cloud.gcloud('services','enable',M.API_SERVICE,'--project='+M.QUOTA_PROJECT,mutate=True),{})
        self.assertIn('--quiet',calls[0])


if __name__=='__main__':
    unittest.main(verbosity=2)
