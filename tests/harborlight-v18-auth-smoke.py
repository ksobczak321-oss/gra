"""PROD email/OAuth form acceptance with isolated, mocked Firebase responses.

No real accounts, credentials, Google providers or production islands are used.
"""
import base64
import importlib.util
import json
import os
from pathlib import Path
import time
from urllib.parse import urlsplit
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('dev_auth_fixture', ROOT / 'tests/harborlight-dev-auth-smoke.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
PROD = 'https://harborlight.pl'
SESSION_KEY = 'harborlight-prod-auth-v1'
EMAIL, PASSWORD, UID = 'captain@example.invalid', 'captain-password', 'real-player-123'
LEGAL_VERSION = '2026-10-30-draft1'


def token():
    encode = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).rstrip(b'=').decode()
    return '.'.join([encode({'alg': 'RS256'}), encode({'aud': 'harborlight-prod',
        'iss': 'https://securetoken.google.com/harborlight-prod', 'sub': UID, 'exp': int(time.time()) + 3600}), 'fixture-signature'])


class ProdSite(base.Site):
    def __init__(self):
        super().__init__(PROD)
        self.config_project = 'harborlight-prod'
        self.profile_calls = []
        self.sdk_calls = []
        self.legal_required = False
        self.legal_calls = []
        self.legal_failures = 0
        self.provider_success = False

    def route(self, route):
        request = route.request
        parsed = urlsplit(request.url)
        if parsed.netloc == urlsplit(PROD).netloc and parsed.path == '/api/v1/legal':
            assert request.headers.get('authorization','').startswith('Bearer ')
            if request.method == 'GET':
                route.fulfill(content_type='application/json',body=json.dumps({'required':self.legal_required,'termsVersion':LEGAL_VERSION,'privacyVersion':LEGAL_VERSION}))
            else:
                body=request.post_data_json
                assert body == {'termsAccepted':True,'privacyAcknowledged':True,'termsVersion':LEGAL_VERSION,'privacyVersion':LEGAL_VERSION}
                self.legal_calls.append(body)
                if self.legal_failures:
                    self.legal_failures-=1
                    route.fulfill(status=503,content_type='application/json',body=json.dumps({'error':'account-service-unavailable'}))
                else:
                    self.legal_required=False
                    route.fulfill(content_type='application/json',body=json.dumps({'uid':UID,'termsVersion':LEGAL_VERSION,'privacyVersion':LEGAL_VERSION,'acceptedAt':int(time.time()*1000)}))
            return
        if parsed.netloc == 'identitytoolkit.googleapis.com':
            body = json.loads(request.post_data)
            if parsed.path in ['/v1/accounts:signInWithPassword', '/v1/accounts:signUp']:
                self.auth_calls.append((request.method, request.url, body))
                if body.get('email') != EMAIL or body.get('password') != PASSWORD:
                    route.fulfill(status=400, content_type='application/json', body=json.dumps({'error': {'message': 'INVALID_LOGIN_CREDENTIALS'}}))
                else:
                    if parsed.path.endswith('signUp'):
                        self.legal_required=True
                    route.fulfill(content_type='application/json', body=json.dumps({'localId': UID, 'email': EMAIL,
                        'idToken': token(), 'refreshToken': 'fixture-real-refresh', 'expiresIn': '3600'}))
                return
            if parsed.path == '/v1/accounts:update':
                self.profile_calls.append(body)
                route.fulfill(content_type='application/json', body=json.dumps({'localId': UID, 'displayName': body['displayName']}))
                return
            if parsed.path == '/v1/accounts:lookup':
                route.fulfill(content_type='application/json',body=json.dumps({'users':[{'localId':UID,'email':EMAIL,'displayName':'HARBORLIGHT:Port Mew'}]}))
                return
        if parsed.netloc == 'www.gstatic.com' and '/firebasejs/' in parsed.path:
            self.sdk_calls.append(parsed.path)
            popup = ('export const signInWithPopup=async()=>({user:{uid:'+json.dumps(UID)+',refreshToken:"oauth-refresh",getIdToken:async()=>'+json.dumps(token())+'}});') if self.provider_success else 'export const signInWithPopup=async()=>{throw {code:"auth/operation-not-allowed"}};'
            source = ('export const getApps=()=>[];export const initializeApp=(config,name)=>({config,name});'
                if parsed.path.endswith('/firebase-app.js') else
                'export class GoogleAuthProvider{};export class FacebookAuthProvider{addScope(){}};'
                'export const getAuth=()=>({}),inMemoryPersistence={},setPersistence=async()=>{},signOut=async()=>{};'
                + popup)
            route.fulfill(content_type='application/javascript', headers={'Access-Control-Allow-Origin': '*'}, body=source)
            return
        super().route(route)


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                     headless=True, args=['--no-sandbox'])
        try:
            site = ProdSite()
            context, page, errors = base.context_for(browser, site)
            page.goto(PROD + '/harborlight-auth.html?mode=register')
            expect(page.locator('#account-fields')).to_be_enabled()
            expect(page.locator('#tab-register')).to_be_visible()
            expect(page.locator('.guest-entry')).to_be_hidden()
            expect(page.locator('.back-link')).to_be_hidden()
            expect(page.locator('.social-options')).to_be_visible()
            expect(page.locator('.social-button small')).to_have_count(0)
            expect(page.locator('#display-name')).to_be_hidden()
            expect(page.locator('#island-name')).to_be_hidden()
            expect(page.locator('#island-name')).to_be_disabled()
            page.locator('#email').fill(EMAIL)
            page.locator('#password').fill(PASSWORD)
            page.locator('#confirm-password').fill(PASSWORD)
            page.locator('#account-submit').click()
            expect(page.locator('#terms-error')).to_be_visible()
            assert not site.auth_calls and not site.legal_calls
            page.locator('#terms-accepted').check()
            page.locator('#account-submit').click()
            expect(page.locator('#privacy-error')).to_be_visible()
            assert not site.auth_calls
            page.locator('#privacy-acknowledged').check()
            page.locator('#account-submit').click()
            expect(page).to_have_url(PROD + '/harborlight-v1-layered.html?profile=new-player')
            assert 'accounts:signUp' in site.auth_calls[0][1]
            assert not site.profile_calls, 'Island naming belongs after the in-game introduction'
            assert len(site.legal_calls)==1
            stored = page.evaluate('({...localStorage})')
            session = json.loads(stored[SESSION_KEY])
            assert session['uid'] == UID and session['projectId'] == 'harborlight-prod'
            assert 'islandName' not in session
            assert not any(PASSWORD in value for value in stored.values())
            assert not any('island-real-player' in key for key in stored)
            assert not errors and not site.unexpected, (errors, site.unexpected)
            context.close()

            # A new provider identity coming from the login tab must complete
            # the same admission. A failed receipt write cannot open the game.
            site=ProdSite();site.provider_success=True;site.legal_required=True;site.legal_failures=1
            context,page,errors=base.context_for(browser,site,width=390,height=844)
            page.goto(PROD+'/harborlight-auth.html')
            expect(page.locator('#account-fields')).to_be_enabled()
            page.locator('[data-provider="Google"]').click()
            expect(page.locator('#registration-legal-dialog')).to_be_visible()
            expect(page.locator('#legal-modal-confirm')).to_be_disabled()
            assert urlsplit(page.url).path=='/harborlight-auth.html' and not site.legal_calls
            page.locator('#legal-modal-terms').check()
            expect(page.locator('#legal-modal-confirm')).to_be_disabled()
            page.locator('#legal-modal-privacy').check()
            page.locator('#legal-modal-confirm').click()
            expect(page.locator('#legal-modal-confirm')).to_be_enabled()
            expect(page.locator('#registration-legal-dialog')).to_be_visible()
            assert urlsplit(page.url).path=='/harborlight-auth.html' and len(site.legal_calls)==1
            page.locator('#legal-modal-confirm').click()
            expect(page).to_have_url(PROD+'/harborlight-v1-layered.html?profile=new-player')
            assert len(site.legal_calls)==2 and not errors and not site.unexpected,(errors,site.unexpected)
            context.close()

            site = ProdSite()
            context, page, errors = base.context_for(browser, site, width=390, height=844)
            page.goto(PROD + '/harborlight-auth.html')
            expect(page.locator('#account-fields')).to_be_enabled()
            page.locator('#email').fill(EMAIL)
            page.locator('#password').fill('wrong-password')
            page.locator('#account-submit').click()
            expect(page.locator('#account-status')).to_have_text('Login lub hasło są nieprawidłowe.')
            page.locator('#password').fill(PASSWORD)
            page.locator('#account-submit').click()
            expect(page).to_have_url(PROD + '/harborlight-v1-layered.html?profile=new-player')
            assert 'accounts:signInWithPassword' in site.auth_calls[-1][1]
            assert not errors and not site.unexpected, (errors, site.unexpected)
            context.close()

            site = ProdSite()
            context, page, errors = base.context_for(browser, site)
            page.goto(PROD + '/harborlight-auth.html')
            expect(page.locator('#account-fields')).to_be_enabled()
            for provider in ['Google', 'Facebook']:
                page.locator('[data-provider="' + provider + '"]').click()
                expect(page.locator('#account-status')).to_have_text('Ta metoda logowania wymaga konfiguracji dostawcy przez właściciela gry.')
            assert site.sdk_calls and not site.auth_calls
            assert page.evaluate('localStorage.getItem(%s)' % json.dumps(SESSION_KEY)) is None
            assert not errors and not site.unexpected, (errors, site.unexpected)
            context.close()
        finally:
            browser.close()
    print('PASS PROD account UI: required separate legal confirmations and server receipt, email/existing login, provider login-to-registration admission, failed receipt retry without island access, mobile and honest unconfigured OAuth')


if __name__ == '__main__':
    run()
