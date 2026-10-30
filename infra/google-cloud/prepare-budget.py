#!/usr/bin/env python3
"""Configure the authorized 100 USD monthly alerts-only game budget.

Default --check is read-only. --apply may enable Budgets API in the existing
quota project, then create/update only this script's named budget. No currency
conversion, billing shutdown, service suspension, IAM grant or game-data write.
"""
import argparse
import copy
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

BILLING_ACCOUNT = 'billingAccounts/010F11-5A6F09-27543C'
PROJECTS = {'harborlight-dev': '28040211190', 'harborlight-prod': '992911312434'}
QUOTA_PROJECT = 'harborlight-dev'
API_SERVICE = 'billingbudgets.googleapis.com'
BUDGETS_ORIGIN = 'https://billingbudgets.googleapis.com/v1/'
DISPLAY_NAME = 'HARBORLIGHT 100 USD miesiecznie'
REPORT_URL = 'https://console.cloud.google.com/billing/010F11-5A6F09-27543C/reports'
THRESHOLDS = (0.5, 0.75, 0.9, 1.0)


class BudgetError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise BudgetError(message)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, file, code, message, headers, newurl):
        return None


def safe_message(message, token=None):
    if not isinstance(message, str):
        return ''
    if token:
        message = message.replace(token, '[REDACTED]')
    message = re.sub(r'(?i)\bBearer\s+[A-Za-z0-9._~+/=-]+', 'Bearer [REDACTED]', message)
    message = re.sub(r'\b(?:ya29\.|1//)[A-Za-z0-9._~+/=-]+', '[REDACTED]', message)
    message = re.sub(r'(?i)((?:access_token|refresh_token|id_token)[\s\"\x27]*[:=][\s\"\x27]*)[A-Za-z0-9._~+/=-]+', r'\1[REDACTED]', message)
    message = re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', message)
    return ' '.join(message.split())[:800]


class Cloud:
    def __init__(self, runner=subprocess.run, opener=None):
        self.runner = runner
        self.opener = opener or urllib.request.build_opener(NoRedirect())
        self.token = None

    def gcloud(self, *arguments, plain=False, mutate=False):
        command = ['gcloud', *arguments]
        if mutate:
            command.append('--quiet')
        if not plain:
            command.append('--format=json')
        try:
            result = self.runner(command, stdin=subprocess.DEVNULL, capture_output=True,
                                 text=True, timeout=120, check=False,
                                 env=dict(os.environ, CLOUDSDK_CORE_DISABLE_PROMPTS='true'))
        except (OSError, subprocess.TimeoutExpired) as error:
            raise BudgetError('Uruchom skrypt w zalogowanym Google Cloud Shell; gcloud jest niedostępny lub przekroczył czas.') from error
        if result.returncode:
            # Never dump arbitrary stderr, token output or the environment.
            raise BudgetError('Polecenie gcloud nie powiodło się: ' + ' '.join(arguments[:3]) + '. Sprawdź zalogowane konto i uprawnienia w Cloud Shell.')
        if plain:
            return result.stdout.strip()
        # Successful gcloud services enable may report its operation on stderr
        # and return no JSON object. Its zero exit status is authoritative;
        # the following Budgets API read still has to succeed.
        if mutate and not result.stdout.strip():
            return {}
        try:
            return json.loads(result.stdout)
        except ValueError as error:
            raise BudgetError('gcloud nie zwrócił poprawnego JSON.') from error

    def request(self, method, url, body=None):
        require(url.startswith(BUDGETS_ORIGIN) and not urllib.parse.urlsplit(url).fragment,
                'Odrzucono adres spoza oficjalnego API budżetów Google.')
        if self.token is None:
            self.token = self.gcloud('auth', 'print-access-token', plain=True)
            require(bool(self.token) and '\n' not in self.token, 'Brak poprawnego tokenu Cloud Shell.')
        data = json.dumps(body).encode('utf-8') if body is not None else None
        request = urllib.request.Request(url, data=data, method=method, headers={
            'Authorization': 'Bearer ' + self.token, 'Content-Type': 'application/json',
            'x-goog-user-project': QUOTA_PROJECT, 'Cache-Control': 'no-cache'})
        try:
            with self.opener.open(request, timeout=40) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            description = ''
            try:
                payload = json.loads(error.read(20000))
                description = safe_message(payload.get('error', {}).get('message'), self.token)
            except (ValueError, TypeError, AttributeError):
                pass
            raise BudgetError(f'API rozliczeń Google zwróciło HTTP {error.code}' +
                              (': ' + description if description else '.') +
                              ' Nie potwierdzono konfiguracji budżetu.') from error
        except (urllib.error.URLError, OSError, ValueError) as error:
            raise BudgetError('Nie uzyskano poprawnej odpowiedzi API rozliczeń Google; nie potwierdzono konfiguracji budżetu.') from error


def budget_name(name):
    require(isinstance(name, str) and re.fullmatch(re.escape(BILLING_ACCOUNT) + r'/budgets/[A-Za-z0-9_-]{1,200}', name),
            'Odrzucono budżet spoza konta HARBORLIGHT lub niepoprawną nazwę zasobu.')
    return name


def desired_budget(existing=None):
    existing = existing or {}
    require('spendCap' not in existing or existing['spendCap'] is None,
            'Istniejący budżet jest Spend Cap. Skrypt alertów nie zmieni ani nie wyłączy jego egzekwowania.')
    # Keep existing destinations; add no email, channel or third-party service.
    notifications = copy.deepcopy(existing.get('notificationsRule') or {})
    require(isinstance(notifications, dict), 'Niepoprawna konfiguracja odbiorców istniejącego budżetu.')
    notifications['disableDefaultIamRecipients'] = False
    result = {
        'displayName': DISPLAY_NAME,
        'budgetFilter': {'projects': ['projects/' + value for value in PROJECTS.values()],
                         'calendarPeriod': 'MONTH', 'creditTypesTreatment': 'INCLUDE_ALL_CREDITS'},
        'amount': {'specifiedAmount': {'currencyCode': 'USD', 'units': '100'}},
        'thresholdRules': [{'thresholdPercent': value, 'spendBasis': 'CURRENT_SPEND'} for value in THRESHOLDS],
        'notificationsRule': notifications}
    if existing:
        result['name'] = budget_name(existing.get('name'))
        require(isinstance(existing.get('etag'), str) and bool(existing['etag']),
                'Brak etag istniejącego budżetu; nie nadpisano równoległych zmian.')
        result['etag'] = existing['etag']
        currency = existing.get('amount', {}).get('specifiedAmount', {}).get('currencyCode')
        require(currency in (None, 'USD'), 'Istniejący budżet ma inną walutę niż USD; nie przeliczono ani nie zmieniono kwoty.')
    return result


def configuration(value):
    """Canonicalize server defaults without ignoring filter restrictions."""
    fields = copy.deepcopy(value)
    fields.pop('name', None)
    fields.pop('etag', None)
    fields.pop('ownershipScope', None)  # Not part of our update mask.
    amount = fields.get('amount', {}).get('specifiedAmount', {})
    if str(amount.get('nanos', 0)) == '0':
        amount.pop('nanos', None)
    if 'units' in amount:
        amount['units'] = str(amount['units'])
    if isinstance(fields.get('budgetFilter'), dict):
        filter_ = fields['budgetFilter']
        filter_['projects'] = sorted(filter_.get('projects', []))
        for key in ('services', 'subaccounts', 'resourceAncestors', 'creditTypes', 'labels'):
            if not filter_.get(key):
                filter_.pop(key, None)
    fields['thresholdRules'] = sorted(
        [{'thresholdPercent': r.get('thresholdPercent'), 'spendBasis': r.get('spendBasis', 'CURRENT_SPEND')}
         for r in fields.get('thresholdRules', [])], key=lambda r: (r['thresholdPercent'], r['spendBasis']))
    notifications = fields.setdefault('notificationsRule', {})
    notifications.setdefault('disableDefaultIamRecipients', False)
    for key in ('monitoringNotificationChannels', 'pubsubTopic', 'schemaVersion', 'enableProjectLevelRecipients'):
        if not notifications.get(key):
            notifications.pop(key, None)
    return fields


def find_budget(cloud):
    budgets, token, seen = [], None, set()
    for _page in range(20):
        query = {'pageSize': 100}
        if token:
            query['pageToken'] = token
        page = cloud.request('GET', BUDGETS_ORIGIN + BILLING_ACCOUNT + '/budgets?' + urllib.parse.urlencode(query))
        require(isinstance(page, dict) and isinstance(page.get('budgets', []), list), 'Niepoprawna lista budżetów Google.')
        budgets.extend(b for b in page.get('budgets', []) if isinstance(b, dict) and b.get('displayName') == DISPLAY_NAME)
        token = page.get('nextPageToken')
        if not token:
            break
        require(isinstance(token, str) and token not in seen, 'Powtarzający się token stronicowania budżetów.')
        seen.add(token)
    else:
        raise BudgetError('Lista budżetów przekroczyła bezpieczny limit odczytu; niczego nie zmieniono.')
    require(len(budgets) <= 1, 'Istnieje kilka budżetów o zarządzanej nazwie. Nie wybrano jednego do nadpisania.')
    if budgets:
        budget_name(budgets[0].get('name'))
    return budgets[0] if budgets else None


def prepare(cloud, apply=False):
    for project, number in PROJECTS.items():
        data = cloud.gcloud('projects', 'describe', project)
        require(isinstance(data, dict) and data.get('projectId') == project and str(data.get('projectNumber')) == number and
                data.get('labels', {}).get('harborlight_env') == project.rsplit('-', 1)[1],
                'Nie potwierdzono tożsamości/etykiety projektu ' + project + '.')
        billing = cloud.gcloud('billing', 'projects', 'describe', project)
        require(isinstance(billing, dict) and billing.get('projectId') == project and billing.get('billingEnabled') is True and
                billing.get('billingAccountName') == BILLING_ACCOUNT,
                'Projekt ' + project + ' nie ma aktywnych rozliczeń właściwego konta HARBORLIGHT.')
    # Use the standard Cloud SDK billing reader, as for project associations.
    # A custom Cloud Billing request with our Budgets quota-project header
    # would unnecessarily require Cloud Billing API enabled in that project.
    account = cloud.gcloud('billing', 'accounts', 'describe', BILLING_ACCOUNT.split('/', 1)[1])
    require(isinstance(account, dict) and account.get('name') == BILLING_ACCOUNT and account.get('open') is True,
            'Nie potwierdzono aktywnego konta rozliczeniowego HARBORLIGHT.')
    require(account.get('currencyCode') in (None, 'USD'),
            'Konto jest rozliczane w innej walucie niż USD; nie ustawiono 100 jednostek obcej waluty.')
    services = cloud.gcloud('services', 'list', '--enabled', '--project=' + QUOTA_PROJECT,
                            '--filter=config.name=' + API_SERVICE)
    require(isinstance(services, list) and all(isinstance(service, dict) for service in services),
            'Nie uzyskano poprawnego stanu usługi Budgets API.')
    enabled = any(service.get('config', {}).get('name') == API_SERVICE for service in services)
    if not enabled:
        if not apply:
            return {'ready': False, 'reason': 'Budgets API jest wyłączone w projekcie kwot; --check niczego nie włącza.'}
        cloud.gcloud('services', 'enable', API_SERVICE, '--project=' + QUOTA_PROJECT, mutate=True)
    existing = find_budget(cloud)
    desired = desired_budget(existing)
    if existing and configuration(existing) == configuration(desired):
        return {'ready': True, 'changed': False, 'name': existing['name']}
    if not apply:
        return {'ready': False, 'reason': 'Budżetu brak lub jego kwota/zakres/alerty wymagają uzgodnienia. Uruchom --apply.'}
    if existing:
        mask = 'displayName,budgetFilter,amount,thresholdRules,notificationsRule'
        saved = cloud.request('PATCH', BUDGETS_ORIGIN + budget_name(existing['name']) + '?updateMask=' + mask, desired)
    else:
        saved = cloud.request('POST', BUDGETS_ORIGIN + BILLING_ACCOUNT + '/budgets', desired)
    require(isinstance(saved, dict), 'Zapis budżetu nie zwrócił poprawnego zasobu; nie potwierdzono konfiguracji.')
    name = budget_name(saved.get('name'))
    confirmed = cloud.request('GET', BUDGETS_ORIGIN + name)
    require(isinstance(confirmed, dict) and configuration(confirmed) == configuration(desired) and
            confirmed.get('amount', {}).get('specifiedAmount', {}).get('currencyCode') == 'USD',
            'Odczyt po zapisie nie potwierdził dokładnie 100 USD, obu projektów i oczekiwanych alertów.')
    duplicate = find_budget(cloud)
    require(duplicate and duplicate.get('name') == name, 'Lista po zapisie nie potwierdziła jednoznacznego budżetu.')
    return {'ready': True, 'changed': True, 'name': name}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--check', action='store_true', help='Tylko odczyt; domyślny tryb.')
    mode.add_argument('--apply', action='store_true', help='Uzgodnij wyłącznie budżet alertowy 100 USD i potrzebne Budgets API.')
    args = parser.parse_args()
    print('Budżet ALERTOWY 100 USD/miesiąc łącznie dla PRE-PROD + PROD. Nie jest twardym limitem faktury.', flush=True)
    try:
        result = prepare(Cloud(), apply=args.apply)
    except BudgetError as error:
        print('BŁĄD: ' + str(error), file=sys.stderr)
        return 1
    if not result['ready']:
        print('PLAN: ' + result['reason'])
        return 2
    print(('APPLY zakończone' if args.apply else 'PASS') + ': potwierdzony budżet 100 USD, miesiąc, oba projekty, alerty 50/75/90/100 USD.')
    print('Zasób: ' + result['name'])
    print('Nie wyłączono rozliczeń/usług i nie zmieniono danych graczy. Alerty mogą docierać z opóźnieniem.')
    print('Bieżący koszt nie jest polem API Budgets. Raport kosztów: ' + REPORT_URL)
    return 0


if __name__ == '__main__':
    sys.exit(main())
