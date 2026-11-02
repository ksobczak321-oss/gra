"""Real PRE-PROD UI against an isolated transactional account-service fixture.

Lost purchase ACKs are injected after the actual Node service commits. No live
Firebase, cloud account, payment provider or external network is contacted.
"""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('ship_cloud_fixture', SOURCE / 'tests/harborlight-dev-game-smoke.py')
cloud = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cloud)
UID = 'dev-admin2'
NOW = int(cloud.NOW.timestamp() * 1000)

BACKEND = """
import {readFileSync} from 'node:fs';
import {createAccountService} from './backend/account-service.mjs';
const input=JSON.parse(readFileSync(0,'utf8'));
let records=new Map(input.records);
const store={runTransaction:async work=>{const draft=new Map(structuredClone([...records]));let wrote=false;
  const result=await work({get:async key=>{if(wrote)throw Error('Reads must precede writes');return structuredClone(draft.get(key));},
    set:async(key,value)=>{wrote=true;draft.set(key,structuredClone(value));},delete:async key=>{wrote=true;draft.delete(key);}});
  records=draft;return result;}};
const service=createAccountService({store,environment:'production',now:()=>input.now});
try{const result=await service[input.command](input.body);console.log(JSON.stringify({status:200,result,records:[...records]}));}
catch(error){console.log(JSON.stringify({status:error.status||500,result:{error:error.code||error.message},records:[...records]}));}
"""


def starter():
    source = """
      import {createState,normalizeState,advanceTo} from './harborlight-v1-state.js';
      import * as Arch from './harborlight-v1-archipelago.js';
      const now=%d,s=createState(now);s.islandName='Przystań testowa';s.population=18;
      s.buildings.townhall.level=10;s.buildings.warehouse.level=10;
      for(const key of Object.keys(s.resources))s.resources[key]=100000;
      s.tutorial.autoOpenDisabled=true;s.learning.practical.paused=true;
      s.engagementSchedule.initialCompleted=true;s.engagementSchedule.initialAnchored=true;s.engagementSchedule.nextAt=1e9;
      const b=Arch.restoreArchipelago(s,{createState,normalizeState,advanceTo},now);
      const result=Arch.createNextIsland(b,{name:'Zatoka'},now);if(!result.ok)throw Error(result.message);
      b.primary.resources.coins=300;b.secondary.resources.coins=1000;b.activeIslandId='island-2';
      console.log(JSON.stringify(Arch.serializeArchipelago(b)));
    """ % NOW
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', source], cwd=SOURCE,
                                     text=True, capture_output=True, check=True).stdout)


class AccountApi:
    def __init__(self, state):
        self.records = [
            ['accounts/' + UID, {'islandGeneration': 1, 'createdAt': NOW, 'lastPlayedAt': NOW}],
            ['islands/' + UID, {'schemaVersion': 1, 'revision': 5, 'generation': 1, 'updatedAt': NOW,
                               'payload': json.dumps(state)}],
        ]
        self.commands = []
        self.capacity_calls = []
        self.fail_reads = False
        self.fail_read_after_purchase = False
        self.lose_next_ack = True

    def invoke(self, command, body):
        response = subprocess.run(['node', '--input-type=module', '-e', BACKEND], cwd=SOURCE,
                                  input=json.dumps({'records': self.records, 'command': command,
                                                    'body': {'uid': UID, **body}, 'now': NOW}),
                                  text=True, capture_output=True, check=True)
        value = json.loads(response.stdout)
        self.records = value['records']
        return value

    def state(self):
        return json.loads(self.invoke('readIsland', {})['result']['island']['payload'])

    def route(self, route):
        request = route.request
        path = urlsplit(request.url).path
        if path == '/api/v1/config':
            return route.fulfill(json={'accountApi': True, 'projectId': 'harborlight-dev', 'environment': 'preprod'})
        assert request.headers.get('authorization') == 'Bearer ' + cloud.token(UID)
        self.commands.append((request.method, path))
        if path == '/api/v1/island' and request.method == 'GET':
            if self.fail_reads:
                return route.abort('internetdisconnected')
            value = self.invoke('readIsland', {})
        elif path == '/api/v1/island' and request.method == 'PUT':
            value = self.invoke('saveIsland', request.post_data_json)
            if value['status'] == 200:
                value['result']['updateTime'] = cloud.NOW.isoformat(timespec='milliseconds').replace('+00:00', 'Z')
        elif path == '/api/v1/activity':
            value = self.invoke('recordActivity', request.post_data_json)
        elif path == '/api/v1/ship-capacity':
            body = request.post_data_json
            self.capacity_calls.append(body)
            value = self.invoke('purchaseShipCapacity', body)
            assert value['status'] == 200, value
            if self.lose_next_ack:
                self.lose_next_ack = False
                self.fail_reads = self.fail_read_after_purchase
                return route.abort('timedout')
        else:
            raise AssertionError((request.method, path))
        return route.fulfill(status=value['status'], json=value['result'])


def open_shipping(page, mobile):
    if page.locator('#island-dialog[open]').count():
        page.locator('#island-dialog .dialog-close').click()
    page.locator('[data-mobile-control="home"]' if mobile else '#hit-home').click()
    page.locator('#island-dialog').get_by_role('button', name='Twoje wyspy', exact=True).click()
    expect(page.locator('[data-ship-capacity-payment]')).to_be_visible()


def scenario(browser, *, mobile=False, block_reload=False):
    api = AccountApi(starter())
    api.fail_read_after_purchase = block_reload
    cloud.ERRORS.clear()
    context, page = cloud.context(browser, UID, mobile=mobile)
    context.route(cloud.ORIGIN + '/api/v1/**', api.route)
    try:
        cloud.visit(page)
        expect(page.locator('body')).to_have_attribute('data-active-island', 'island-2')
        open_shipping(page, mobile)
        page.locator('[data-ship-capacity-payment]').click()
        page.locator('[data-confirm-ship-capacity-payment]').click()
        if block_reload:
            expect(page.locator('[data-ship-capacity-status]')).to_contain_text('Ponowienie sprawdza ten sam zakup')
            expect(page.locator('[data-confirm-ship-capacity-payment]')).to_be_enabled()
            first_request = api.capacity_calls[0]
            committed = api.state()
            assert committed['archipelago']['shipCapacity'] == 2000
            assert committed['archipelago']['islands']['island-2']['resources']['coins'] == 950
            page.locator('#ship-capacity-checkout').get_by_role('button', name='Zamknij', exact=True).click()
            page.locator('#island-dialog .dialog-close').click()
            api.fail_reads = False
            page.evaluate("window.dispatchEvent(new Event('online'))")
            expect(page.locator('body')).to_have_attribute('data-cloud-status', 'saved')
            page.locator('[data-quick-island="island-1"]').click()
            expect(page.locator('body')).to_have_attribute('data-active-island', 'island-2')
            assert len(api.capacity_calls) == 1
            open_shipping(page, mobile)
            page.locator('[data-ship-capacity-payment]').click()
            page.locator('[data-confirm-ship-capacity-payment]').click()
            expect(page.locator('#ship-capacity-checkout')).to_have_count(0)
            assert len(api.capacity_calls) == 2
            assert api.capacity_calls[1] == first_request, 'Retry must retain the original island/revision/request ID'
        else:
            expect(page.locator('#ship-capacity-checkout')).to_have_count(0)
            assert len(api.capacity_calls) == 1
        expect(page.locator('[data-ship-capacity]')).to_contain_text('2000')
        expect(page.locator('body')).to_have_attribute('data-active-island', 'island-2')
        confirmed = api.state()
        assert confirmed['archipelago']['shipCapacity'] == 2000
        assert confirmed['resources']['coins'] == 300
        assert confirmed['archipelago']['islands']['island-2']['resources']['coins'] == 950
        receipts = confirmed['commerce']['capacityPurchases']
        assert len(receipts) == 1 and receipts[0]['coins'] == 50 and receipts[0]['units'] == 1
        assert confirmed['archipelago']['capacityReceipts'] == receipts
        assert not confirmed['commerce']['receipts'], 'Coin capacity must not mint Paynow/no-ad receipts'
        cloud.no_island_cache(page)
        assert not cloud.ERRORS, cloud.ERRORS
        print('PASS capacity lost ACK: %s, reload %s, one receipt /50 coins /+1000 cargo' %
              ('mobile' if mobile else 'desktop', 'failed then retried' if block_reload else 'confirmed immediately'), flush=True)
    finally:
        context.close()


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                     headless=True, args=['--no-sandbox'])
        try:
            for mobile in [False, True]:
                for block_reload in [False, True]:
                    scenario(browser, mobile=mobile, block_reload=block_reload)
        finally:
            browser.close()


if __name__ == '__main__':
    run()
