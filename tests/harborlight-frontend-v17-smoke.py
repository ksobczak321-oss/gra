"""Acceptance of the approved v17 interface changes.

Every scenario owns isolated storage. Fixtures arrange long-running game states;
user controls perform recalls, blessings, game selection and advertisement review.
"""
from datetime import datetime, timedelta, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import re
import threading

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SLOT = 'qa-v17'
SAVE_KEY = 'harborlight-v1-new-player-save-' + SLOT
NOW = datetime(2026, 10, 30, 12, tzinfo=timezone.utc)
BUILDINGS = ['townhall', 'house', 'warehouse', 'market', 'dock', 'chapel', 'lighthouse',
             'farm', 'windmill', 'quarry', 'lumber', 'sawmill']
ECONOMY = ['farm', 'windmill', 'quarry', 'lumber', 'sawmill']
ERRORS, FAILURES = [], []
ENGLISH = re.compile(r'\b(?:advertisement|reward|claim|remaining|waiting|coins|residents|storage|permission|tilt|pointer|continue|your island|carrier|recall)\b', re.I)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = os.environ.get('HARBORLIGHT_BASE_URL', 'http://127.0.0.1:' + str(server.server_port)).rstrip('/')
URL = BASE + '/harborlight-v1-layered.html?profile=new-player&slot=' + SLOT + '&v=frontend-v17'


def visit(browser, width=1366, height=768, language='pl', init_script=None):
    context = browser.new_context(viewport={'width': width, 'height': height},
                                  is_mobile=width < 901, has_touch=width < 901,
                                  reduced_motion='reduce')
    if init_script:
        context.add_init_script(init_script)
    page = context.new_page()
    page.on('pageerror', lambda error: ERRORS.append(getattr(error, 'stack', None) or str(error)))
    page.on('response', lambda response: FAILURES.append((response.status, response.url)) if response.status >= 400 else None)
    page.on('requestfailed', lambda request: FAILURES.append((request.failure, request.url)))
    page.clock.install(time=NOW - timedelta(seconds=1))
    page.clock.pause_at(NOW)
    page.add_init_script('localStorage.setItem("harborlight-language",%s);' % json.dumps(language))
    assert page.goto(URL).ok
    page.wait_for_function('document.getElementById("loading").hidden')
    page.wait_for_selector('[data-hud="working"]', state='attached')
    return context, page


def saved(page):
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    return json.loads(page.evaluate('(key)=>localStorage.getItem(key)', SAVE_KEY))


def install_save(page, state):
    page.evaluate('(value)=>sessionStorage.setItem("v17-next-save",JSON.stringify(value))', state)
    page.add_init_script('''(() => {
      const value = sessionStorage.getItem('v17-next-save');
      if(value) { localStorage.setItem(%s,value);sessionStorage.removeItem('v17-next-save'); }
    })();''' % json.dumps(SAVE_KEY))
    page.reload()
    page.wait_for_function('document.getElementById("loading").hidden')


def fixture(page, mode='starter'):
    return page.evaluate('''async mode=>{
      const {createState,act,tick}=await import('./harborlight-v1-state.js?v=frontend-v17');
      const s=createState(Date.now()-(mode==='carrier'?301000:0));
      s.tutorial.autoOpenDisabled=true;
      if(mode==='rich') {
        for(const [id,b]of Object.entries(s.buildings))b.level=id==='lighthouse'?1:2;
        s.buildings.townhall.level=s.buildings.house.level=s.buildings.warehouse.level=4;
        s.resources={coins:100000,wood:1800,stone:1800,grain:1800,food:2000,planks:1800};
      }
      if(mode==='carrier') {
        s.resources.food=1000;s.resources.wood=500;s.buildings.lumber.ready=200;
        const result=act(s,{type:'assign',building:'warehouse',delta:2});
        if(!result.ok)throw new Error(result.message);
        tick(s,301);
      }
      if(mode==='blocked-input'||mode==='blocked-full') {
        s.resources.food=1000;
        const id=mode==='blocked-input'?'windmill':'farm';
        act(s,{type:'assign',building:id,delta:1});
        s.residents.find(p=>p.workplace===id).arrivalRemaining=0;
        if(id==='windmill')s.resources.grain=0;
        else s.buildings.farm.ready=200;
      }
      return s;
    }''', mode)


def game_fixture(page, kind='triples', stage=1, finishable=False):
    return page.evaluate('''async options=>{
      const {createState,act,EXPEDITIONS}=await import('./harborlight-v1-state.js?v=frontend-v17');
      const {createMiniGame,miniGameRoundRules}=await import('./harborlight-v1-minigames.js?v=frontend-v17');
      const s=createState(Date.now());s.tutorial.autoOpenDisabled=true;
      const definition=EXPEDITIONS[0];
      const result=act(s,{type:'expeditionStart',expedition:definition.id,gameKind:options.kind});
      if(!result.ok)throw new Error(result.message);
      const run=s.expeditionRuns[definition.id],rules=miniGameRoundRules(options.kind,options.stage);
      run.level=options.stage;run.roundLimit=rules.timeLimit;run.remaining=rules.timeLimit;
      run.miniGame=createMiniGame(options.kind,options.stage,23456,s.activityClock);
      if(options.finishable&&options.kind==='triples') {
        const symbol=run.miniGame.cards[0];
        run.miniGame.matched=run.miniGame.cards.map(value=>value!==symbol);
      }
      return s;
    }''', {'kind': kind, 'stage': stage, 'finishable': finishable})


def run_of(state):
    return next(run for run in state['expeditionRuns'].values() if run['status'] in ['active', 'decision'])


def close_panel(page):
    page.locator('.dialog-close').click()
    expect(page.locator('#island-dialog')).not_to_be_visible()


def building(page, id):
    mobile = page.viewport_size['width'] < 901
    group = 'economy' if id in ECONOMY else 'administration'
    page.locator(f'[data-mobile-category="{group}"]' if mobile else f'#hit-category-{group}').click()
    button = page.locator(f'[data-mobile-building="{id}"]' if mobile else f'#hit-dock-{id}')
    button.scroll_into_view_if_needed();button.click()
    expect(page.locator(f'[data-building-panel="{id}"]')).to_be_visible()


def polish(page, scope='#island-dialog'):
    source = page.locator(scope).inner_text()
    assert not ENGLISH.findall(source), source


def no_horizontal_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    assert page.locator('#island-dialog .dialog-body').evaluate('(n)=>n.scrollWidth<=n.clientWidth+1')


def whole_game(page):
    no_horizontal_overflow(page)
    for selector in ['#island-dialog', '#island-dialog .dialog-body', '.memory-viewport', '.memory-board']:
        dimensions = page.locator(selector).evaluate('(n)=>({height:n.clientHeight,scroll:n.scrollHeight,width:n.clientWidth,scrollWidth:n.scrollWidth})')
        assert dimensions['scroll'] <= dimensions['height'] + 1, (selector, page.viewport_size, dimensions)
        assert dimensions['scrollWidth'] <= dimensions['width'] + 1, (selector, page.viewport_size, dimensions)
    dimensions = page.evaluate('''()=>{
      const container=document.querySelector('.memory-viewport').getBoundingClientRect();
      return [...document.querySelectorAll('[data-memory-card]')].map(n=>{
        const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,
          inside:r.left>=container.left-1&&r.top>=container.top-1&&r.right<=container.right+1&&r.bottom<=container.bottom+1};
      });
    }''')
    assert dimensions and all(item['inside'] for item in dimensions), dimensions
    assert all(min(item['width'], item['height']) >= 20 for item in dimensions), dimensions


def overview_acceptance(browser):
    for width, height in [(1366, 768), (1536, 864)]:
        context, page = visit(browser, width, height)
        install_save(page, fixture(page, 'rich'))
        for id in BUILDINGS:
            building(page, id)
            tops = page.evaluate('''()=>{
              const first=document.querySelector('.building-main').firstElementChild.getBoundingClientRect();
              const second=document.querySelector('[data-building-upgrade]').getBoundingClientRect();
              return [first.top,second.top];
            }''')
            assert abs(tops[0]-tops[1]) <= 1, (id, tops)
            no_horizontal_overflow(page);close_panel(page)
        page.locator('#hit-home').click()
        bounds = page.locator('#island-dialog .dialog-body').bounding_box()
        assert bounds
        for name in ['Magazyn', 'Handel']:
            button = page.locator('#island-dialog').get_by_role('button', name=name, exact=True)
            rectangle = button.bounding_box()
            assert rectangle and rectangle['y'] + rectangle['height'] <= bounds['y'] + bounds['height'] - 4, (name, bounds, rectangle)
        assert page.locator('#island-dialog .dialog-body').evaluate('(n)=>n.scrollHeight<=n.clientHeight+1')
        for button in page.locator('#island-dialog .dialog-body .action').all():
            rectangle = button.bounding_box()
            assert rectangle and rectangle['y'] + rectangle['height'] <= bounds['y'] + bounds['height'] - 4, (button.inner_text(), rectangle)
        page.screenshot(path=f'/tmp/harborlight-v17-home-{width}.png')
        close_panel(page)
        page.locator('#hit-settings').click()
        assert 'Zaloguj się' not in page.locator('#island-dialog').inner_text()
        assert 'załóż konto' not in page.locator('#island-dialog').inner_text()
        polish(page);no_horizontal_overflow(page)
        close_panel(page)
        page.locator('#hit-home').click()
        page.locator('#island-dialog').get_by_role('button', name='Ratusz', exact=True).click()
        expect(page.locator('[data-panel-back]')).to_be_visible()
        page.locator('[data-panel-back]').click()
        expect(page.locator('#island-dialog')).to_have_attribute('data-panel-kind', 'home')
        context.close()
    print('PASS12 building columns aligned; home navigation stays inside its frame and Settings has no sign-in action')


def memory_layout_acceptance(browser):
    for width, height in [(1366, 768), (1536, 864), (390, 844), (360, 740)]:
        context, page = visit(browser, width, height)
        for stage, count in [(1, 24), (4, 42), (17, 120)]:
            install_save(page, game_fixture(page, 'triples', stage))
            expect(page.locator('[data-minigame-kind]')).to_have_attribute('data-minigame-kind', 'triples')
            expect(page.locator('[data-memory-card]')).to_have_count(count)
            # The board must already fit before the next animation frame;
            # opening a large saved game must not briefly create scrollbars.
            whole_game(page)
            page.clock.run_for(100)
            whole_game(page)
            assert page.locator('[data-panel-back]').count() == 0
            if stage in [1, 17]:
                page.screenshot(path=f'/tmp/harborlight-v17-memory-{width}-{count}.png')
        if width in [1366, 390]:
            for resized in ([{'width': 1536, 'height': 864}, {'width': width, 'height': height}]
                            if width == 1366 else [{'width': 360, 'height': 740}, {'width': width, 'height': height}]):
                page.set_viewport_size(resized)
                page.clock.run_for(100)
                whole_game(page)
                expect(page.locator('[data-memory-card]')).to_have_count(120)
        context.close()
    delayed_memory_resize_acceptance(browser, (390, 844), {'width': 360, 'height': 740})
    delayed_memory_resize_acceptance(browser, (1536, 864), {'width': 1366, 'height': 768})
    print('PASS24/42/120-card memory boards fit desktop and390/360px phones without scrollbars or clipped cards')


def delayed_memory_resize_acceptance(browser, initial_size, resized):
    # Hold only native resize notifications, leaving the game clock paused.
    # A narrower viewport must be safe even before application fitting runs.
    context, page = visit(browser, *initial_size, init_script='''(() => {
      const state = window.__qaResizeNotifications = {hold: false, queued: []};
      addEventListener('resize', event => {
        if (state.hold) event.stopImmediatePropagation();
      }, true);
      const NativeObserver = ResizeObserver;
      window.ResizeObserver = class extends NativeObserver {
        constructor(callback) {
          super((entries, observer) => {
            if (state.hold) state.queued.push(() => callback(entries, observer));
            else callback(entries, observer);
          });
        }
      };
    })();''')
    install_save(page, game_fixture(page, 'triples', 17))
    game = run_of(saved(page))['miniGame']
    symbol = game['cards'][0]
    for index in [i for i, value in enumerate(game['cards']) if value == symbol][:3]:
        page.locator(f'[data-memory-card="{index}"]').click()
    before = run_of(saved(page))['miniGame']
    assert sum(before['matched']) == 3
    whole_game(page)
    page.evaluate('window.__qaResizeNotifications.hold = true')
    page.set_viewport_size(resized)
    # No run_for or wait here: this checks the CSS invariant before RAF/RO.
    whole_game(page)
    rectangles = page.evaluate('''() => {
      const bounds = document.querySelector('.memory-viewport').getBoundingClientRect();
      return [...document.querySelectorAll('[data-memory-card]')].map(card => {
        const r = card.getBoundingClientRect();
        return {width:r.width,height:r.height,inside:r.left>=bounds.left-1&&
          r.right<=bounds.right+1&&r.top>=bounds.top-1&&r.bottom<=bounds.bottom+1};
      });
    }''')
    assert len(rectangles) == 120
    assert all(r['inside'] and abs(r['width'] - r['height']) <= 1 for r in rectangles), rectangles
    after = run_of(saved(page))['miniGame']
    for key in ['cards', 'matched', 'revealed']:
        assert after[key] == before[key], key
    # Wait for delivery into our held queue, not for application layout. The
    # width/square/identity checks above already ran with notifications held.
    for _ in range(50):
        if page.evaluate('window.__qaResizeNotifications.queued.length'):
            break
        page.wait_for_timeout(10)
    released = page.evaluate('''() => {
      const state = window.__qaResizeNotifications;
      state.hold = false;
      const queued = state.queued.splice(0);
      for (const callback of queued) callback();
      return queued.length;
    }''')
    assert released > 0, 'Browser did not deliver a resize notification'
    whole_game(page)
    expect(page.locator('[data-memory-card]')).to_have_count(120)
    context.close()


def choice_and_ad_acceptance(browser):
    for language in ['pl', 'en']:
        context, page = visit(browser, language=language)
        for kind in ['tilt', 'triples']:
            install_save(page, fixture(page))
            page.locator('.activity-expedition').click()
            assert page.locator('[data-expedition-choice]').count() == 2
            # Contextual back remains available outside the active minigame.
            page.locator(f'[data-expedition-choice="{kind}"]').click()
            expect(page.locator('[data-minigame-kind]')).to_have_attribute('data-minigame-kind', kind)
            assert page.locator('[data-panel-back]').count() == 0
            current = run_of(saved(page))
            assert current['miniGame']['kind'] == current['selectedGameKind'] == kind
            assert current['roundLimit'] == (180 if kind == 'tilt' else 240)
            page.reload();page.wait_for_function('document.getElementById("loading").hidden')
            assert run_of(saved(page))['selectedGameKind'] == kind
            ad = page.locator('[data-minigame-ad]')
            expect(ad).to_be_visible()
            rectangle = ad.bounding_box()
            leave = page.locator('[data-minigame-result-actions]').bounding_box()
            assert rectangle and leave and rectangle['y'] >= leave['y'] + leave['height'] - 1
            before = saved(page)
            ad.click()
            popup = page.locator('#rewarded-ad[data-rewarded-ad]')
            expect(popup).to_be_visible()
            if language == 'pl':
                polish(page, '#rewarded-ad')
                expect(popup).to_contain_text('później')
            else:
                expect(popup).to_contain_text('rules will be defined later')
            after = saved(page)
            assert after['resources'] == before['resources']
            for key in ['pot', 'roundLimit', 'roundStartedAt', 'level']:
                assert run_of(after)[key] == run_of(before)[key], (key, before, after)
            popup.locator('[data-close-rewarded-ad]').click()
            expect(popup).not_to_be_visible()
            if language == 'pl':
                polish(page)
            no_horizontal_overflow(page)
            page.locator('[data-minigame-result-actions] button').first.click()
            expect(page.locator('[data-confirm-choice]')).to_be_visible()
            page.locator('[data-confirm-choice]').click()
            expect(page.locator('[data-expedition-choice]')).to_have_count(2)
            assert page.locator('[data-minigame-kind]').count() == 0
            assert all(run['status'] == 'lost' for run in saved(page)['expeditionRuns'].values())
            assert page.locator('[data-panel-back]').count() == 0
        install_save(page, fixture(page))
        page.locator('#hit-home').click()
        page.locator('#island-dialog').get_by_role('button', name='Ekspedycje' if language == 'pl' else 'Expeditions', exact=True).click()
        page.locator('[data-expedition-choice="triples"]').click()
        assert page.locator('[data-panel-back]').count() == 0
        page.locator('[data-minigame-result-actions] button').first.click()
        page.locator('[data-confirm-choice]').click()
        expect(page.locator('[data-panel-back]')).to_be_visible()
        page.locator('[data-panel-back]').click()
        expect(page.locator('#island-dialog')).to_have_attribute('data-panel-kind', 'home')
        for next_kind in ['triples', 'tilt']:
            install_save(page, game_fixture(page, 'triples', finishable=True))
            current = run_of(saved(page))
            for index, matched in enumerate(current['miniGame']['matched']):
                if not matched:
                    page.locator(f'[data-memory-card="{index}"]').click()
            expect(page.locator('[data-expedition-next-kind]')).to_be_visible()
            assert run_of(saved(page))['pot'] == 50
            page.locator('[data-expedition-next-kind]').select_option(next_kind)
            page.locator('[data-expedition-continue]').click()
            continued = run_of(saved(page))
            assert continued['level'] == 2 and continued['pot'] == 50
            assert continued['selectedGameKind'] == continued['miniGame']['kind'] == next_kind
            expect(page.locator('[data-minigame-kind]')).to_have_attribute('data-minigame-kind', next_kind)
            if next_kind == 'triples':
                expect(page.locator('[data-memory-card]')).to_have_count(30)
            assert page.locator('[data-panel-back]').count() == 0
            page.reload();page.wait_for_function('document.getElementById("loading").hidden')
            assert run_of(saved(page))['selectedGameKind'] == next_kind
        context.close()
    print('PASS explicit game choice/next-round switch/reload in PL/EN; both ad entry screens preserve time, resources and pot')


def recall_acceptance(browser):
    context, page = visit(browser)
    install_save(page, fixture(page, 'carrier'))
    before = saved(page)
    assert len(before['haulTrips']['warehouse']) == 2
    assert before['buildings']['warehouse']['workers'] == 2
    building(page, 'warehouse')
    page.locator('[data-worker-building="warehouse"][data-worker-delta="-1"]').click()
    popup = page.locator('[data-carrier-recall-dialog]')
    expect(popup).to_be_visible()
    polish(page, '[data-carrier-recall-dialog]')
    expect(popup).to_contain_text('kurs')
    current = saved(page)
    recalled = [p for p in current['residents'] if p.get('pendingRelease')]
    assert len(recalled) == 1
    person_id = recalled[0]['id']
    assert current['buildings']['warehouse']['workers'] == 2
    assert len(current['haulTrips']['warehouse']) == 2
    expect(page.locator('[data-worker-count="warehouse"]')).to_contain_text('−1')
    page.screenshot(path='/tmp/harborlight-v17-carrier-recall.png')
    popup.locator('[data-close-carrier-recall]').click()
    close_panel(page)
    expect(page.locator('[data-dock-working-count="warehouse"]').first).to_contain_text('−1')
    page.clock.fast_forward(298000)
    current = saved(page)
    assert next(p for p in current['residents'] if p['id'] == person_id)['pendingRelease']
    assert len(current['haulTrips']['warehouse']) == 2
    page.clock.fast_forward(1000)
    delivered = saved(page)
    person = next(p for p in delivered['residents'] if p['id'] == person_id)
    assert delivered['resources']['wood'] == before['resources']['wood'] + 200
    assert delivered['buildings']['warehouse']['workers'] == 1
    assert person['workplace'] is None and abs(person['returnRemaining'] - 300) < .001
    assert sum(not p['workplace'] and not p['returnRemaining'] for p in delivered['residents']) == 10
    page.clock.fast_forward(299000)
    current = saved(page)
    assert next(p for p in current['residents'] if p['id'] == person_id)['returnRemaining'] > 0
    page.clock.fast_forward(1000)
    home = saved(page)
    assert next(p for p in home['residents'] if p['id'] == person_id)['returnRemaining'] == 0
    assert sum(not p['workplace'] and not p['returnRemaining'] for p in home['residents']) == 11
    context.close()
    print('PASS loaded carrier recall clearly announces departure/countdown; cargo arrives before the complete five-minute walk Home')


def penalty_acceptance(browser):
    context, page = visit(browser)
    install_save(page, fixture(page))
    assert page.locator('[data-world-penalty]:visible').count() == 0
    idle = fixture(page)
    idle['buildings']['farm']['ready'] = 200
    idle['resources']['grain'] = idle['resources']['wood'] = 0
    install_save(page, idle)
    assert page.locator('[data-world-penalty]:visible').count() == 0
    install_save(page, fixture(page, 'blocked-input'))
    expect(page.locator('[data-world-penalty="windmill"]')).to_be_visible()
    page.screenshot(path='/tmp/harborlight-v17-production-penalty.png')
    building(page, 'chapel')
    page.locator('[data-blessing]').click()
    close_panel(page)
    expect(page.locator('[data-world-penalty="windmill"]')).not_to_be_visible()
    install_save(page, fixture(page, 'blocked-full'))
    expect(page.locator('[data-world-penalty="farm"]')).to_be_visible()
    building(page, 'warehouse')
    page.locator('[data-worker-building="warehouse"][data-worker-delta="1"]').click()
    close_panel(page)
    # Arrival is the five-minute boundary; the next settled step dispatches
    # the first actual pickup from the previously full producer buffer.
    page.clock.fast_forward(301000)
    recovered = saved(page)
    assert recovered['buildings']['farm']['ready'] < 200
    assert any(trip.get('producer') == 'farm' for trip in recovered['haulTrips']['warehouse'])
    expect(page.locator('[data-world-penalty="farm"]')).not_to_be_visible()
    context.close()
    print('PASS sad building markers appear for real input/storage penalties and disappear when production can resume')


def run():
    groups = {'overview': overview_acceptance, 'memory': memory_layout_acceptance,
              'choice': choice_and_ad_acceptance, 'recall': recall_acceptance,
              'penalty': penalty_acceptance}
    selected = os.environ.get('HARBORLIGHT_QA_GROUP')
    if selected and selected not in groups:
        raise ValueError('Unknown QA group: ' + selected)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                             headless=True, args=['--no-sandbox'])
        try:
            for name, check in groups.items():
                if not selected or selected == name:
                    check(browser)
            assert not ERRORS, ERRORS
            assert not FAILURES, FAILURES
            print('PASS v17 browser acceptance without JavaScript or HTTP errors')
        finally:
            browser.close();server.shutdown()


if __name__ == '__main__':
    run()
