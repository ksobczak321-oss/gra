"""Browser acceptance of the agreed v18 rules and actionable feedback.

The local harness injects in-memory fixtures on loopback only. It never writes
islands to browser storage or uses real cloud credentials/payment providers.
"""
from datetime import datetime, timedelta, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import threading

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
FRONTEND_ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', ROOT))
NOW = datetime(2026, 10, 30, 12, tzinfo=timezone.utc)
ERRORS = []


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(FRONTEND_ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:' + str(server.server_port)
URL = BASE + '/harborlight-v1-layered.html?profile=new-player&v=frontend-v18'


def open_page(browser, width=1366, height=768):
    context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
    context.add_init_script('localStorage.setItem("harborlight-language","pl")')
    page = context.new_page()
    page.on('pageerror', lambda error: ERRORS.append(str(error)))
    page.clock.install(time=NOW - timedelta(seconds=1))
    page.clock.pause_at(NOW)
    assert page.goto(URL).ok
    page.wait_for_function('document.getElementById("loading").hidden && !!window.__HARBORLIGHT_DEV_STATE__')
    return context, page


def fixture(page, mode):
    return page.evaluate('''async mode=>{
      const {createState,act}=await import('./harborlight-v1-state.js?v=frontend-v17');
      const s=createState(Date.now());s.tutorial.autoOpenDisabled=true;
      if(mode==='tutorial'){
        const {normalizeProgression}=await import('./harborlight-v1-progression.js?v=frontend-v27');
        normalizeProgression(s,{...s,tutorial:{version:3}});
        s.tutorial.autoOpenDisabled=false;return s;
      }
      s.buildings.townhall.level=s.buildings.house.level=s.buildings.warehouse.level=4;
      s.resources={coins:100000,wood:1800,stone:1800,grain:1800,food:2000,planks:1800};
      if(mode==='production')s.buildings.farm.level=2;
      if(mode==='blocked'){
        s.resources.grain=0;s.buildings.windmill.fullSeconds=172800;
        act(s,{type:'assign',building:'windmill',delta:1});
        s.residents.find(p=>p.workplace==='windmill').arrivalRemaining=0;
      }
      if(mode==='harbor')act(s,{type:'trade',resource:'wood',direction:'buy',amount:100});
      if(mode==='market'){
        act(s,{type:'assign',building:'market',delta:1});
        s.residents.find(p=>p.workplace==='market').arrivalRemaining=0;
        act(s,{type:'marketOrder',resource:'wood',amount:10});
      }
      if(mode==='construction'){
        act(s,{type:'upgrade',building:'farm'});
        const project=s.constructionProjects[0];
        act(s,{type:'premiumTransport',route:'construction',project:project.order});
        project.stage='building';project.buildRemaining=125;
      }
      if(mode==='notifications'){
        s.notifications=[{id:900,kind:'system',title:'Read',message:'Read',read:true,at:0},{id:901,kind:'system',title:'New',message:'New',read:false,at:0}];
        s.notificationSequence=901;
      }
      if(mode==='premium-initial'){
        s.commerce.receipts=[{id:'test-purchase',at:Date.now(),grossGrosz:2000,simulated:true,verified:false,kind:'coins'}];
        s.engagementSchedule.activeSeconds=239;s.engagementSchedule.initialAt=240;
      }
      return s;
    }''', mode)


def install(page, state):
    page.add_init_script('window.__HARBORLIGHT_DEV_FIXTURE__=' + json.dumps(state, ensure_ascii=False))
    page.reload()
    page.wait_for_function('document.getElementById("loading").hidden && !!window.__HARBORLIGHT_DEV_STATE__')


def state(page):
    return page.evaluate('window.__HARBORLIGHT_DEV_STATE__')


def close_panel(page):
    if page.locator('#island-dialog').evaluate('(node)=>node.open'):
        page.locator('#island-dialog .dialog-close').click()


def production_and_penalty(browser):
    context, page = open_page(browser)
    install(page, fixture(page, 'production'))
    page.locator('#hit-world-farm').click()
    page.locator('[data-production-info="farm"]').click()
    expect(page.locator('[data-production-help="farm"]')).to_contain_text('24')
    expect(page.locator('[data-production-help="farm"]')).not_to_contain_text('Each farmer produces 20')
    install(page, fixture(page, 'blocked'))
    page.locator('#hit-world-windmill').click()
    page.locator('[data-production-info="windmill"]').click()
    expect(page.locator('[data-full-penalty="windmill"]').first).to_contain_text('Brakuje surowca')
    expect(page.locator('[data-full-penalty="windmill"]').first).to_contain_text('−10')
    expect(page.locator('[data-full-penalty="windmill"]').first).not_to_contain_text('−30')
    assert not page.locator('.activity-lighthouse').count()
    context.close()
    print('PASS18 dynamic production, personal blockage penalties and expedition navigation', flush=True)


def live_transport(browser):
    context, page = open_page(browser)
    install(page, fixture(page, 'harbor'))
    page.locator('#hit-boat').click()
    expect(page.locator('[data-harbor-order-status]').first).to_contain_text('rejs')
    page.clock.fast_forward(310000)
    expect(page.locator('[data-harbor-order-status]').first).to_contain_text('rozładunek')
    expect(page.locator('[data-harbor-order-status]').first).not_to_contain_text('5 min')
    assert state(page)['dock']['orders'][0]['stage'] == 'unloading'
    install(page, fixture(page, 'market'))
    page.locator('#hit-world-market').click()
    page.locator('[data-market-entry]').click()
    expect(page.locator('[data-market-order-status]')).to_have_count(1)
    page.clock.fast_forward(310000)
    expect(page.locator('[data-market-order-status]')).to_have_count(0)
    assert state(page)['market']['orders'] == []
    assert any(lot['resource'] == 'wood' and lot['amount'] == 10 for lot in state(page)['market']['locked'])
    context.close()
    print('PASS18 Harbor and Market stages refresh while their panels remain open', flush=True)


def reduction_notifications_and_memory(browser):
    context, page = open_page(browser)
    install(page, fixture(page, 'construction'))
    page.locator('#hit-world-farm').click()
    page.locator('[data-premium-percent="25"]').click()
    expect(page.locator('[data-construction-reduction]')).to_contain_text('0 min 31 s')
    assert abs(state(page)['constructionProjects'][0]['buildRemaining'] - 93.75) < .1
    install(page, fixture(page, 'notifications'))
    page.locator('#hit-notifications').click()
    page.locator('[data-delete-read-notifications]').click()
    notifications = state(page)['notifications']
    assert any(n['id'] == 901 for n in notifications)
    assert not any(n['id'] == 900 for n in notifications)
    keys = page.evaluate('Object.keys(localStorage)')
    assert not any('save' in key or 'island' in key or 'new-player' in key for key in keys), keys
    context.close()
    print('PASS18 exact acceleration feedback, read-only deletion and no local island saves', flush=True)


def expedition_time_and_ad(browser):
    context, page = open_page(browser)
    install(page, fixture(page, 'production'))
    page.locator('.activity-expedition').click()
    page.locator('[data-expedition-choice="triples"]').click()
    before = next(r for r in state(page)['expeditionRuns'].values() if r['status'] == 'active')
    page.locator('[data-buy-extra-time]').click()
    purchased = next(r for r in state(page)['expeditionRuns'].values() if r['status'] == 'active')
    assert purchased['roundLimit'] == before['roundLimit'] + 30
    page.locator('[data-minigame-ad]').click()
    expect(page.locator('#rewarded-ad')).to_contain_text('SYMULACJA REKLAMY DEV')
    page.clock.fast_forward(5000)
    paused = next(r for r in state(page)['expeditionRuns'].values() if r['status'] == 'active')
    assert paused['adPause'] is not None
    page.clock.fast_forward(5000)
    expect(page.locator('#rewarded-ad')).to_have_count(0)
    rewarded = next(r for r in state(page)['expeditionRuns'].values() if r['status'] == 'active')
    assert rewarded['adTimeRewards'] == 1
    assert rewarded['roundLimit'] == before['roundLimit'] + 90
    expect(page.locator('[data-minigame-ad]')).to_be_disabled()
    assert not page.locator('[data-tutorial-achievement]').count()
    context.close()
    print('PASS18 voluntary extra time and explicit simulated rewarded-ad completion', flush=True)


def paynow_and_daily_blessing(browser):
    context, page = open_page(browser)
    install(page, fixture(page, 'production'))
    before = state(page)['resources']['coins']
    page.locator('#hit-settings').click()
    page.get_by_role('button', name='Opcje premium', exact=True).click()
    page.locator('[data-payment-amount]').select_option('2000')
    page.locator('[data-paynow-checkout]').click()
    expect(page.locator('#paynow-checkout')).to_contain_text('SYMULACJA — bez pobrania pieniędzy')
    page.locator('[data-confirm-simulated-payment]').click()
    expect(page.locator('#paynow-checkout')).to_have_count(0)
    assert state(page)['resources']['coins'] == before + 200
    assert state(page)['commerce']['receipts'][-1]['grossGrosz'] == 2000
    close_panel(page)
    page.locator('#hit-world-chapel').click()
    page.locator('[data-blessing]').click()
    expect(page.locator('[data-blessing]')).to_be_disabled()
    expect(page.locator('[data-daily-blessing-remaining]')).to_have_text('0')
    context.close()
    print('PASS18 Paynow simulation is explicit and the daily free blessing is single-use', flush=True)


def premium_initial_and_idle(browser):
    context, page = open_page(browser)
    install(page, fixture(page, 'premium-initial'))
    page.clock.fast_forward(2000)
    assert state(page)['engagementSchedule']['initialAnchored']
    assert not page.locator('#engagement-choice').count()
    expect(page.locator('[data-initial-premium-bonus]')).to_be_visible()
    before = sum(state(page)['resources'][k] for k in ['wood','stone','grain','food','planks'])
    page.locator('[data-initial-premium-bonus]').click()
    expect(page.locator('[data-initial-premium-bonus]')).to_have_count(0)
    after = sum(state(page)['resources'][k] for k in ['wood','stone','grain','food','planks'])
    assert 50 <= after - before <= 150
    assert not page.locator('#rewarded-ad').count()
    context.close()
    context, page = open_page(browser)
    install(page, fixture(page, 'production'))
    page.clock.fast_forward(1800000)
    expect(page.locator('#session-idle-warning')).to_be_visible()
    page.clock.fast_forward(30000)
    page.wait_for_url('**/harborlight-auth.html?**')
    context.close()
    print('PASS18 premium initial reward needs no film and inactivity signs out after the warning', flush=True)


def actionable_tutorial(browser):
    context, page = open_page(browser)
    install(page, fixture(page, 'tutorial'))
    expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'rules-read')
    assert not page.locator('[data-tutorial-observe]').count()
    page.locator('[data-tutorial-visit="rules-read"]').click()
    page.locator('#hit-world-farm').click()
    assert not state(page)['tutorial']['completed'].get('rules-read')
    expect(page.locator('[data-tutorial-pointer]')).to_be_visible()
    page.locator('[data-worker-building="farm"][data-worker-delta="1"]').click()
    assert state(page)['tutorial']['completed']['rules-read']
    assert state(page)['buildings']['farm']['workers'] == 1
    expect(page.locator('[data-tutorial-achievement="rules-read"]')).to_be_visible()
    page.locator('[data-tutorial-skip="rules-read"]').click()
    page.locator('[data-tutorial-go="island-map"]').click()
    page.locator('#hit-world-warehouse').click()
    expect(page.locator('[data-worker-building="warehouse"][data-worker-delta="1"]')).to_have_class(__import__('re').compile('tutorial-action-target'))
    page.locator('[data-worker-building="warehouse"][data-worker-delta="1"]').click()
    assert state(page)['tutorial']['completed']['island-map']
    assert state(page)['buildings']['warehouse']['workers'] == 1
    context.close()
    print('PASS18 tutorial arrows guide actual Farm and Warehouse assignments; reading grants nothing', flush=True)


def descriptions_match_rules(browser):
    context, page = open_page(browser)
    install(page, fixture(page, 'production'))
    page.locator('#hit-population').click()
    expect(page.locator('[data-population-rate="100"]')).to_contain_text('30 min')
    expect(page.locator('[data-population-rate="-100"]')).to_contain_text('1 godz.')
    expect(page.locator('[data-population-rate="25"]')).to_contain_text('6 godz.')
    expect(page.locator('[data-population-rate="-25"]')).to_contain_text('12 godz.')
    close_panel(page)
    page.locator('#hit-home').click()
    page.locator('#island-dialog').get_by_role('button', name='Ekspedycje', exact=True).click()
    expect(page.locator('#island-dialog')).to_contain_text('50, 100, 200, 400')
    expect(page.locator('#island-dialog')).to_contain_text('50, 150, 350, 750')
    close_panel(page)
    page.locator('#hit-world-chapel').click()
    body = page.locator('#island-dialog')
    expect(body).to_contain_text('północy Warszawy')
    assert '3 + poziom kaplicy' in body.text_content()
    assert '6–15' in body.text_content()
    context.close()
    print('PASS18 descriptions: distinct population arrival/departure rates, exponential round/pot rewards, Warsaw blessing and Chapel neglect grace', flush=True)


def run():
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox', '--disable-dev-shm-usage'])
            try:
                for check in (production_and_penalty, live_transport, reduction_notifications_and_memory, expedition_time_and_ad, paynow_and_daily_blessing, premium_initial_and_idle, actionable_tutorial, descriptions_match_rules):
                    check(browser)
                assert not ERRORS, ERRORS
            finally:
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    run()
