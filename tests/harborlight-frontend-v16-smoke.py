"""Real-browser acceptance for guided learning and the two expedition games.

The suite uses its own local profile. Hard-to-reach game states are installed as
saved fixtures; all card reveals, tilt input, tutorial visits, rewards and
cash-outs go through the actual browser controls.
"""
from collections import Counter, deque
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
SLOT = 'qa-v16'
SAVE_KEY = 'harborlight-v1-new-player-save-' + SLOT
NOW = datetime(2026, 10, 29, 12, tzinfo=timezone.utc)
MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks']
ERRORS, FAILURES = [], []
ENGLISH = re.compile(r'\b(?:reward|claim|tutorial|completed|remaining|waiting|coins|residents|storage|match|shuffle|balls|permission|tilt|pointer|start|continue|try again|your island)\b', re.I)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = os.environ.get('HARBORLIGHT_BASE_URL', 'http://127.0.0.1:' + str(server.server_port)).rstrip('/')
URL = BASE + '/harborlight-v1-layered.html?profile=new-player&slot=' + SLOT + '&v=frontend-v16'


def visit(browser, width=1366, height=768, language='pl', sensor=None):
    mobile = width < 901
    context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=mobile,
                                  has_touch=mobile, reduced_motion='reduce')
    page = context.new_page()
    page.on('pageerror', lambda error: ERRORS.append(str(error)))
    page.on('response', lambda response: FAILURES.append((response.status, response.url)) if response.status >= 400 else None)
    page.on('requestfailed', lambda request: FAILURES.append((request.failure, request.url)))
    page.clock.install(time=NOW - timedelta(seconds=1))
    page.clock.pause_at(NOW)
    page.add_init_script('localStorage.setItem("harborlight-language",%s);' % json.dumps(language))
    page.add_init_script('''(() => {
      window.fanfareTones=0;
      const Native=window.AudioContext || window.webkitAudioContext;
      if(Native) window.AudioContext=class extends Native {
        createOscillator() {
          const tone=super.createOscillator(), start=tone.start.bind(tone);
          tone.start=(...args)=>{window.fanfareTones++;return start(...args);};
          return tone;
        }
      };
    })();''')
    if sensor:
        page.add_init_script('''(() => {
          window.orientationRequests = 0;
          class TestOrientationEvent extends Event {
            static requestPermission() {
              window.orientationRequests++;
              return Promise.resolve(%s);
            }
          }
          Object.defineProperty(window, 'DeviceOrientationEvent', {configurable:true, value:TestOrientationEvent});
        })();''' % json.dumps(sensor))
    assert page.goto(URL).ok
    page.wait_for_function('document.getElementById("loading").hidden')
    page.wait_for_selector('[data-hud="working"]', state='attached')
    return context, page


def saved(page):
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    return json.loads(page.evaluate('(key)=>localStorage.getItem(key)', SAVE_KEY))


def install_save(page, value):
    page.evaluate('(value)=>sessionStorage.setItem("v16-next-save",JSON.stringify(value))', value)
    page.add_init_script('''(() => {
      const value = sessionStorage.getItem('v16-next-save');
      if (value) { localStorage.setItem(%s,value);sessionStorage.removeItem('v16-next-save'); }
    })();''' % json.dumps(SAVE_KEY))
    page.reload()
    page.wait_for_function('document.getElementById("loading").hidden')


def new_state(page, *, completed=0, disabled=True):
    return page.evaluate('''async options => {
      const {createState} = await import('./harborlight-v1-state.js?v=frontend-v16');
      const {TUTORIAL_LESSONS} = await import('./harborlight-v1-progression.js?v=frontend-v16');
      const state = createState(Date.now());
      state.tutorial.autoOpenDisabled = options.disabled;
      for (const lesson of TUTORIAL_LESSONS.slice(0, options.completed)) {
        state.tutorial.completed[lesson.id] = true;
        state.tutorial.claimed[lesson.id] = true;
      }
      return state;
    }''', {'completed': completed, 'disabled': disabled})


def game_fixture(page, kind='triples', stage=1, *, finishable=False, elapsed=0, pot=0):
    return page.evaluate('''async options => {
      const {createState,act,EXPEDITIONS} = await import('./harborlight-v1-state.js?v=frontend-v16');
      const {createMiniGame,miniGameRoundRules} = await import('./harborlight-v1-minigames.js?v=frontend-v16');
      const state = createState(Date.now());
      state.tutorial.autoOpenDisabled = true;
      state.activityClock=options.elapsed;
      state.lastMeaningfulActivityAt=options.elapsed;
      const definition = EXPEDITIONS[0];
      const started = act(state, {type:'expeditionStart', expedition:definition.id});
      if(!started.ok) throw new Error(started.message);
      const run = state.expeditionRuns[definition.id], rules=miniGameRoundRules(options.kind,options.stage);
      run.level=options.stage; run.pot=options.pot; run.rulesVersion=16;
      run.roundLimit=rules.timeLimit; run.roundStartedAt=state.activityClock-options.elapsed;
      run.startedAt=run.roundStartedAt; run.roundBasePot=options.pot+50;
      run.remaining=rules.timeLimit-options.elapsed;
      run.miniGame=createMiniGame(options.kind,options.stage,23456,state.activityClock);
      if(options.kind==='tilt') {
        run.miniGame.walls=[];
        run.miniGame.balls=[{id:0,x:100,y:300,vx:0,vy:0,settled:false,goalId:null}];
        run.miniGame.goals=[{id:0,x:options.finishable?180:550,y:300,filledBy:null}];
      } else if(options.finishable) {
        const symbol=run.miniGame.cards[0];
        run.miniGame.matched=run.miniGame.cards.map(value=>value!==symbol);
      }
      return state;
    }''', {'kind': kind, 'stage': stage, 'finishable': finishable, 'elapsed': elapsed, 'pot': pot})


def active_run(state):
    return next(run for run in state['expeditionRuns'].values() if run['status'] in ['active', 'decision'])


def material_totals(state):
    return {key: state['resources'].get(key, 0) + state.get('pendingDeliveries', {}).get(key, 0) +
            state.get('rewardBuffer', {}).get(key, 0) + (state.get('foodCredit', 0) if key == 'food' else 0)
            for key in MATERIALS}


def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    for selector in ['#island-dialog:visible', '#island-dialog:visible .dialog-body', '[data-tutorial-achievement]:visible']:
        for node in page.locator(selector).all():
            assert node.evaluate('(node)=>node.scrollWidth<=node.clientWidth+1'), (selector, node.inner_text())


def polish(page, scope='#island-dialog'):
    source = page.locator(scope).inner_text()
    leaks = ENGLISH.findall(source)
    assert not leaks, {'english': leaks, 'content': source}


def resume_game(page):
    if not page.locator('[data-minigame-kind]').count():
        page.locator('.activity-expedition').first.click()
    expect(page.locator('[data-minigame-kind]')).to_be_visible()


def close_panel(page):
    page.locator('.dialog-close').click()
    expect(page.locator('#island-dialog')).not_to_be_visible()


def tutorial(page):
    if not page.locator('[data-tutorial-panel]').count():
        guide = page.locator('[data-tutorial-return]')
        if guide.count():
            guide.first.click()
        else:
            page.locator('#hit-home').click()
            page.locator('#island-dialog').get_by_role('button', name='Samouczek', exact=True).click()
    expect(page.locator('[data-tutorial-panel]')).to_be_visible()


def go_lesson(page, id):
    tutorial(page)
    expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', id)
    page.locator(f'[data-tutorial-visit="{id}"]').click()


def chest(page, id, share=False, before=None):
    popup = page.locator(f'[data-tutorial-achievement="{id}"]')
    expect(popup).to_be_visible()
    polish(page, f'[data-tutorial-achievement="{id}"]')
    no_overflow(page)
    state = saved(page)
    reward = state['tutorial']['chests'][id]['reward']
    assert set(reward) == set(MATERIALS), reward
    assert all(100 <= amount <= 300 for amount in reward.values()), reward
    for material, amount in reward.items():
        expect(popup.locator(f'[data-tutorial-reward-quantity="{material}"]')).to_have_text(str(amount))
    if before:
        after = material_totals(state)
        for material in MATERIALS:
            assert abs(after[material] - before[material] - reward[material]) < .001, (material, before, after, reward)
    totals = material_totals(state)
    popup.locator('[data-tutorial-share]' if share else '[data-tutorial-skip]').click()
    expect(popup).not_to_be_visible()
    resolved = saved(page)
    assert resolved['tutorial']['chests'][id]['shared' if share else 'skipped']
    for material, amount in reward.items():
        expected = totals[material] + (amount if share else 0)
        assert abs(material_totals(resolved)[material] - expected) < .001
    page.clock.run_for(1)
    return reward


def tutorial_acceptance(browser):
    context, page = visit(browser)
    expect(page.locator('[data-tutorial-panel]')).to_be_visible()
    assert page.locator('[data-tutorial-list-item]').count() == 25
    expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'rules-read')
    expect(page.locator('[data-tutorial-observe="rules-read"]')).to_be_disabled()
    state = saved(page)
    assert state['resources'] == dict.fromkeys(['coins'] + MATERIALS, 100), state['resources']
    assert state['tutorial']['version'] == 2 and not state['tutorial']['claimed']
    polish(page); no_overflow(page)
    page.locator('[data-tutorial-later]').click()
    page.reload(); page.wait_for_function('document.getElementById("loading").hidden')
    expect(page.locator('[data-tutorial-panel]')).to_be_visible()
    page.locator('[data-tutorial-later]').click()
    before = material_totals(saved(page))
    page.locator('#hit-home').click()
    page.get_by_role('button', name='Zasady wyspy', exact=True).click()
    page.locator('[data-tutorial-observe="rules-read"]').click()
    reward = chest(page, 'rules-read', share=True, before=before)
    if page.evaluate('!!window.AudioContext'):
        assert page.evaluate('window.fanfareTones') >= 4
    inventory = material_totals(saved(page))
    page.reload(); page.wait_for_function('document.getElementById("loading").hidden')
    expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current', 'island-map')
    state = saved(page)
    assert state['tutorial']['chests']['rules-read']['reward'] == reward
    assert state['tutorial']['chests']['rules-read']['shared']
    for material, amount in inventory.items():
        assert abs(material_totals(state)[material] - amount) < .001
    go_lesson(page, 'island-map')
    expect(page.locator('#island-dialog')).to_have_attribute('data-panel-kind', 'map')
    before = material_totals(saved(page))
    page.locator('[data-tutorial-observe="island-map"]').click()
    chest(page, 'island-map', before=before)
    go_lesson(page, 'first-job')
    page.locator('[data-worker-building="farm"][data-worker-delta="1"]').click()
    assert not saved(page)['tutorial']['completed'].get('first-job')
    page.locator('[data-worker-building="warehouse"][data-worker-delta="1"]').click()
    chest(page, 'first-job')
    state = saved(page)
    assert state['buildings']['farm']['workers'] == state['buildings']['warehouse']['workers'] == 1
    go_lesson(page, 'food-check')
    expect(page.locator('[data-food-stat="status"]').first).to_contain_text('zapewnione')
    page.locator('[data-tutorial-observe="food-check"]').click()
    chest(page, 'food-check')
    tutorial(page)
    page.locator('[data-tutorial-supplies]').click()
    supplies = saved(page)
    assert supplies['tutorial']['buildingSuppliesClaimed']
    for material in MATERIALS:
        assert supplies['resources'][material] >= (600 if material == 'food' else 500)
    assert supplies['resources']['coins'] == 500
    page.locator('[data-tutorial-visit="townhall-upgrade"]').click()
    page.locator('[data-upgrade-building="townhall"]').click()
    chest(page, 'townhall-upgrade')
    assert any(project['building'] == 'townhall' and project['targetLevel'] == 2 for project in saved(page)['constructionProjects'])
    go_lesson(page, 'happiness-action')
    page.locator('[data-house-allocate]').click()
    chest(page, 'happiness-action')
    assert saved(page)['tutorial']['completed']['happiness-action']
    tutorial(page)
    page.screenshot(path='/tmp/harborlight-v16-tutorial-desktop.png')
    page.locator('[data-tutorial-dismiss]').click()
    assert saved(page)['tutorial']['autoOpenDisabled']
    page.reload(); page.wait_for_function('document.getElementById("loading").hidden')
    expect(page.locator('#island-dialog')).not_to_be_visible()
    page.locator('#hit-settings').click(); page.locator('[data-resume-tutorial]').click()
    expect(page.locator('[data-tutorial-panel]')).to_be_visible()
    assert not saved(page)['tutorial']['autoOpenDisabled']
    page.reload(); page.wait_for_function('document.getElementById("loading").hidden')
    expect(page.locator('[data-tutorial-panel]')).to_be_visible()
    completed = new_state(page, completed=25, disabled=False)
    install_save(page, completed)
    expect(page.locator('#island-dialog')).not_to_be_visible()
    page.locator('#hit-home').click(); page.locator('#island-dialog').get_by_role('button', name='Samouczek', exact=True).click()
    expect(page.locator('[data-tutorial-finished]')).to_be_visible()
    context.close()
    print('PASS25 lessons: automatic opening/resume/opt-out, real first6 actions, sound fanfare, five-material chest/share×2 and persistent completion')


def memory_acceptance(browser):
    context, page = visit(browser)
    install_save(page, game_fixture(page, 'triples'))
    resume_game(page)
    expect(page.locator('[data-minigame-kind]')).to_have_attribute('data-minigame-kind', 'triples')
    assert page.locator('[data-memory-card]').count() == 24
    assert page.locator('[data-memory-card][data-symbol]').count() == 0
    assert page.locator('.memory-symbol').evaluate_all('nodes=>nodes.every(node=>!node.checkVisibility())')
    initial = active_run(saved(page))['miniGame']
    selected, symbols = [], set()
    for index, symbol in enumerate(initial['cards']):
        if symbol not in symbols:
            selected.append(index); symbols.add(symbol)
        if len(selected) == 3:
            break
    for index in selected:
        page.locator(f'[data-memory-card="{index}"]').click()
    assert page.locator('[data-memory-state="revealed"]').count() == 3
    # The island settles elapsed time on its one-second UI heartbeat.
    page.clock.run_for(1100)
    assert page.locator('[data-memory-state="revealed"]').count() == 0
    triple = [index for index, symbol in enumerate(initial['cards']) if symbol == initial['cards'][0]]
    for index in triple:
        page.locator(f'[data-memory-card="{index}"]').click()
    assert page.locator('[data-memory-state="matched"]').count() == 3
    remaining = next(index for index in range(24) if index not in triple)
    page.locator(f'[data-memory-card="{remaining}"]').click()
    persisted = active_run(saved(page))['miniGame']
    page.reload(); page.wait_for_function('document.getElementById("loading").hidden'); resume_game(page)
    assert active_run(saved(page))['miniGame']['cards'] == persisted['cards']
    expect(page.locator(f'[data-memory-card="{remaining}"]')).to_have_attribute('data-memory-state', 'revealed')
    no_overflow(page); polish(page)
    page.screenshot(path='/tmp/harborlight-v16-memory-desktop.png')
    install_save(page, game_fixture(page, 'triples', finishable=True, elapsed=180))
    resume_game(page)
    before = saved(page); run = active_run(before)
    final_indices = [index for index, matched in enumerate(run['miniGame']['matched']) if not matched]
    assert len(final_indices) == 3
    for index in final_indices:
        page.locator(f'[data-memory-card="{index}"]').click()
    expect(page.locator('[data-expedition-cashout]')).to_contain_text('49')
    assert active_run(saved(page))['status'] == 'decision'
    page.locator('[data-expedition-cashout]').click()
    assert saved(page)['resources']['coins'] == before['resources']['coins'] + 49
    page.reload(); page.wait_for_function('document.getElementById("loading").hidden')
    assert saved(page)['resources']['coins'] == before['resources']['coins'] + 49
    assert page.locator('[data-expedition-cashout]').count() == 0
    context.close()
    print('PASS memory:24 hidden monochrome pictures, unlimited retries, real triples, saved reveals, decaying reward and one cash-out')


def shuffle_acceptance(browser):
    context, page = visit(browser)
    install_save(page, game_fixture(page, 'triples', stage=4))
    resume_game(page)
    assert page.locator('[data-memory-card]').count() == 42
    page.clock.run_for(59800)
    page.locator('[data-memory-card="0"]').click()
    before = active_run(saved(page))['miniGame']
    page.clock.run_for(300)
    after = active_run(saved(page))['miniGame']
    assert after['shuffleCount'] == before['shuffleCount'] + 1
    assert Counter(before['cards']) == Counter(after['cards'])
    assert after['cards'][0] == before['cards'][0] and after['revealed'] == [0]
    expect(page.locator('[data-memory-card="0"]')).to_have_attribute('data-symbol', str(before['cards'][0]))
    expect(page.locator('[data-memory-shuffle]')).to_contain_text('miejsca')
    no_overflow(page); polish(page)
    context.close()
    print('PASS later-stage memory shuffles only hidden unmatched pictures and preserves the revealed symbol')


def tilt_acceptance(browser):
    context, page = visit(browser)
    install_save(page, game_fixture(page, 'tilt', finishable=True, elapsed=135, pot=100))
    resume_game(page)
    expect(page.locator('[data-minigame-kind]')).to_have_attribute('data-minigame-kind', 'tilt')
    before = saved(page)
    board = page.locator('[data-tilt-board]'); bounds = board.bounding_box()
    assert bounds
    page.mouse.move(bounds['x'] + bounds['width'] * .76, bounds['y'] + bounds['height'] * .5)
    for _ in range(12):
        page.clock.run_for(250)
        if active_run(saved(page))['status'] == 'decision':
            break
    won = active_run(saved(page))
    assert won['status'] == 'decision' and won['pot'] == 149, won
    expect(page.locator('[data-tilt-ball="0"]')).to_have_attribute('data-settled', 'true')
    expect(page.locator('[data-tilt-goal="0"]')).to_have_attribute('data-filled', 'true')
    page.screenshot(path='/tmp/harborlight-v16-tilt-desktop.png')
    page.locator('[data-expedition-cashout]').click()
    assert saved(page)['resources']['coins'] == before['resources']['coins'] + 149
    install_save(page, game_fixture(page, 'tilt', elapsed=179, pot=100))
    resume_game(page)
    page.clock.run_for(1100)
    lost = next(iter(saved(page)['expeditionRuns'].values()))
    assert lost['status'] == 'lost' and lost['lossReason'] == 'deadline' and lost['pot'] == 0
    expect(page.locator('[data-minigame-message]')).to_contain_text('rozsypują')
    assert page.locator('[data-expedition-cashout]').count() == 0
    page.reload(); page.wait_for_function('document.getElementById("loading").hidden')
    assert all(run['status'] == 'lost' for run in saved(page)['expeditionRuns'].values())
    context.close()
    print('PASS marble maze: real pointer physics enters a goal, old pot is retained, hard deadline loses the series and remains lost after reload')


def phone_acceptance(browser):
    context, page = visit(browser, 390, 844, sensor='denied')
    install_save(page, game_fixture(page, 'tilt'))
    resume_game(page)
    assert page.evaluate('window.orientationRequests') == 0
    page.locator('[data-motion-enable]').click()
    assert page.evaluate('window.orientationRequests') == 1
    expect(page.locator('[data-motion-status]')).to_contain_text('niedostępne')
    joystick = page.locator('[data-tilt-touch]'); bounds = joystick.bounding_box()
    assert bounds
    cdp = context.new_cdp_session(page)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': bounds['x'] + bounds['width'] * .8, 'y': bounds['y'] + bounds['height'] * .5}]})
    page.clock.run_for(500)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    page.clock.run_for(100)
    assert active_run(saved(page))['miniGame']['balls'][0]['x'] > 105
    no_overflow(page); polish(page)
    page.screenshot(path='/tmp/harborlight-v16-tilt-phone.png')
    install_save(page, game_fixture(page, 'triples', stage=17))
    resume_game(page)
    assert page.locator('[data-memory-card]').count() == 120
    no_overflow(page); polish(page)
    page.screenshot(path='/tmp/harborlight-v16-memory-phone.png')
    context.close()
    context, page = visit(browser, 390, 844, sensor='granted')
    install_save(page, game_fixture(page, 'tilt'))
    resume_game(page)
    page.locator('[data-motion-enable]').click()
    page.evaluate('''() => {
      for(const gamma of [0,15]) {
        const event=new Event('deviceorientation');
        Object.defineProperties(event,{beta:{value:0},gamma:{value:gamma}});
        dispatchEvent(event);
      }
    }''')
    page.clock.run_for(500)
    assert active_run(saved(page))['miniGame']['balls'][0]['x'] > 105
    expect(page.locator('[data-motion-status]')).to_contain_text('włączone')
    context.close()
    print('PASS390px phone: explicit sensor grant/denial, real touch fallback, synthetic orientation controls and120-card layout without horizontal overflow')


def deferred_chest_acceptance(browser):
    context, page = visit(browser)
    fixture = new_state(page, disabled=False)
    fixture['tutorial']['completed']['rules-read'] = True
    install_save(page, fixture)
    popup = page.locator('[data-tutorial-achievement="rules-read"]')
    expect(popup).to_be_visible()
    state = saved(page); reward = state['tutorial']['chests']['rules-read']['reward']
    inventory = material_totals(state)
    popup.locator('[data-tutorial-reward-later]').click()
    expect(popup).not_to_be_visible()
    tutorial(page); page.locator('[data-tutorial-dismiss]').click()
    assert saved(page)['tutorial']['autoOpenDisabled']
    page.locator('#hit-home').click()
    page.locator('#island-dialog').get_by_role('button', name='Samouczek', exact=True).click()
    page.locator('[data-tutorial-review="rules-read"]').click()
    expect(popup).to_be_visible()
    assert saved(page)['tutorial']['chests']['rules-read']['reward'] == reward
    popup.locator('[data-tutorial-share]').click()
    doubled = saved(page)
    assert doubled['tutorial']['chests']['rules-read']['shared']
    for material in MATERIALS:
        assert abs(material_totals(doubled)[material] - inventory[material] - reward[material]) < .001
    page.reload(); page.wait_for_function('document.getElementById("loading").hidden')
    assert saved(page)['tutorial']['autoOpenDisabled']
    assert page.locator('[data-tutorial-achievement]').count() == 0
    context.close()
    print('PASS deferred chest can be reopened and doubled exactly once even after opting out of automatic tutorial')


def legacy_path():
    grid = ['S..T..', '.WWT..', '.W.TC.', '.W....', '.TTTW.', '...W.G']
    obstacles = {(row, col): index for index, (row, col) in enumerate(
        (row, col) for row, line in enumerate(grid) for col, tile in enumerate(line) if tile in 'WTR')}
    first = (0, 0, 1, 1, 0, 0)
    seen, queue = {first}, deque([(first, [])])
    while queue:
        current, path = queue.popleft()
        row, col, bridge, axe, dynamite, cleared = current
        if grid[row][col] == 'G':
            return path
        for dr, dc in [(1, 0), (0, 1), (-1, 0), (0, -1)]:
            nr, nc = row + dr, col + dc
            if not (0 <= nr < 6 and 0 <= nc < 6):
                continue
            tile, tools, mask = grid[nr][nc], [bridge, axe, dynamite], cleared
            if tile in 'WTR':
                bit = 1 << obstacles[nr, nc]
                if not mask & bit:
                    index = 'WTR'.index(tile)
                    if not tools[index]:
                        continue
                    tools[index] -= 1
                    mask |= bit
            following = (nr, nc, *tools, mask)
            if following not in seen:
                seen.add(following)
                queue.append((following, path + [(nr, nc)]))
    raise AssertionError('No valid old expedition route')


def language_and_legacy_acceptance(browser):
    context, page = visit(browser, language='en')
    expect(page.locator('[data-tutorial-current] h3')).to_have_text('Read your island rules')
    no_overflow(page)
    install_save(page, game_fixture(page, 'triples', finishable=True))
    resume_game(page)
    expect(page.locator('.minigame-title')).to_have_text('Find the triples')
    state = saved(page); run = active_run(state)
    for index, matched in enumerate(run['miniGame']['matched']):
        if not matched:
            page.locator(f'[data-memory-card="{index}"]').click()
    expect(page.locator('[data-expedition-cashout]')).to_contain_text('Cash out 50')
    page.locator('[data-expedition-cashout]').click()
    legacy = new_state(page)
    legacy['tutorial'] = {'completed': {'island-level': True}, 'claimed': {'island-level': True}, 'activeDays': ['2026-10-29']}
    legacy['tutorial']['autoOpenDisabled'] = True
    legacy['expeditionSequence'] = 77
    legacy['activeExpeditionId'] = 'misty'
    legacy['expeditionRuns'] = {'misty': {
        'id': 'run-77', 'expedition': 'misty', 'level': 1, 'pot': 100, 'status': 'active',
        'mode': 'time', 'roundStartedAt': 0, 'startedAt': 0, 'roundLimit': 1000,
        'roundBasePot': 150, 'remaining': 1000, 'presencePromptAt': None, 'finishedAt': None, 'lossReason': None}}
    install_save(page, legacy)
    state = saved(page)
    assert state['tutorial']['legacy']['claimed']['island-level']
    assert state['tutorial']['claimed']['rules-read']
    assert state['resources']['wood'] == 100 and 'rules-read' not in state['tutorial']['chests']
    assert page.locator('.puzzle-board').count() == 1
    assert page.locator('[data-minigame-kind]').count() == 0
    for row, col in legacy_path():
        page.locator(f'.puzzle-cell[data-row="{row}"][data-col="{col}"]').click()
    expect(page.locator('[data-expedition-cashout]')).to_contain_text('150')
    page.locator('[data-expedition-cashout]').click()
    assert saved(page)['resources']['coins'] == 250
    page.locator('.activity-expedition').click()
    page.locator('[data-expedition-choice="triples"]').click()
    assert active_run(saved(page))['rulesVersion'] == 16
    expect(page.locator('[data-minigame-kind]')).to_be_visible()
    # New production starts explicitly honor the player's chosen type, while
    # the retained legacy route above still uses its original proof.
    for seed, kind in [(1, 'tilt'), (8192, 'triples')]:
        ordinary = new_state(page)
        ordinary['activitySeed'] = seed
        install_save(page, ordinary)
        page.locator('.activity-expedition').click()
        page.locator(f'[data-expedition-choice="{kind}"]').click()
        drawn = active_run(saved(page))
        assert drawn['rulesVersion'] == 16 and drawn['miniGame']['kind'] == kind
        expect(page.locator('[data-minigame-kind]')).to_have_attribute('data-minigame-kind', kind)
    context.close()
    print('PASS English tutorial/game, preserved paid legacy lesson/active route/pot and explicit choice starts both new minigames')


def run():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                             headless=True, args=['--no-sandbox'])
        try:
            tutorial_acceptance(browser)
            memory_acceptance(browser)
            shuffle_acceptance(browser)
            tilt_acceptance(browser)
            phone_acceptance(browser)
            deferred_chest_acceptance(browser)
            language_and_legacy_acceptance(browser)
            assert not ERRORS, ERRORS
            assert not FAILURES, FAILURES
            print('PASS v16 browser acceptance without JavaScript or HTTP errors')
        finally:
            browser.close()
            server.shutdown()


if __name__ == '__main__':
    run()
