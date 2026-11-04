"""Exercise the connected adventure library through real browser controls.

Only local fixture boards are inspected by the solver. Every placement,
rotation, answer and room transition is sent through the real adventure model;
the test never marks a puzzle solved or fabricates a reward receipt.
"""
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import mimetypes
import os
from playwright.sync_api import expect, sync_playwright

ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', Path(__file__).resolve().parents[1])).resolve()
BASE = 'http://127.0.0.1:47431'
DOCUMENT = '''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:12px;background:#102b36;color:#eff6e8;font:16px system-ui}main{max-width:1040px;margin:auto}button,input{font:inherit}</style></head><body><main></main><script type="module">
import * as A from './harborlight-v1-adventures.js';
import {claimAdventureBudget} from './harborlight-v1-adventure-budget.js';
import {grantBonusMaterials} from './harborlight-v1-inventory.js';
import {islandPuzzleSolution,getIslandPuzzleView} from './harborlight-v1-island-puzzles.js';
import {createAdventuresPanel} from './harborlight-v1-adventures-ui.js';
const language=new URLSearchParams(location.search).get('language')||'pl';let state,panel;
window.actionLog=[];window.openMainCount=0;
window.reset=({practice=false}={})=>{panel?.destroy();document.querySelector('main').replaceChildren();state={resources:{coins:500,wood:0,stone:0,grain:0,food:0,planks:0},worldTimeMs:Date.parse('2026-11-04T12:00:00Z'),activityClock:0,activitySeed:123456,population:12,capacity:480,buildings:{townhall:{level:20},house:{level:20},lighthouse:{level:1}},notifications:[],expeditionRuns:{}};A.normalizeAdventures(state);if(practice){A.adventureRewardStatus(state);state.adventureBudget.dailySpent=state.adventureBudget.dailyLimit;}panel=createAdventuresPanel({state,language,onMainMission:()=>window.openMainCount++,mainMission:{title:language==='pl'?'Zabezpieczmy osadę':'Prepare the settlement',description:language==='pl'?'Sprawdź materiały i wolną ekipę.':'Check materials and the available crew.'},onAction:action=>{window.actionLog.push(action);const result=A.adventureAction(state,action,{claimAdventureReward:(world,payload)=>{const awarded=claimAdventureBudget(world,payload);world.resources.coins+=awarded.reward.coins||0;grantBonusMaterials(world,awarded.reward);return awarded;}});panel.update(state);return result;}});document.querySelector('main').append(panel.element);};
window.current=()=>structuredClone(state);window.view=()=>getIslandPuzzleView(state.adventures.active.data.puzzle,language);
window.solution=()=>islandPuzzleSolution(state.adventures.active.data.puzzle);
window.advance=seconds=>{A.advanceAdventures(state,seconds);panel.update(state);};
window.restore=()=>{const saved=structuredClone(state);A.normalizeAdventures(state,saved);panel.update(state);};
window.controlFor=move=>{const view=window.view();for(const[family,records]of[['control',view.controls],['item',view.items],['target',view.targets],['cell',view.grid?.cells]])for(const record of records||[])if(record.move&&Object.entries(record.move).every(([key,value])=>move[key]===value))return'[data-puzzle-'+family+'='+JSON.stringify(String(record.id??record.index))+']';return null;};
window.reset();window.ready=true;
</script></body></html>'''


def scenario(browser, language, mobile):
    context = browser.new_context(viewport={'width': 390 if mobile else 1240, 'height': 844 if mobile else 1000}, reduced_motion='reduce', has_touch=mobile)
    errors = []

    def asset(route):
        path = urlsplit(route.request.url).path
        if path == '/adventures-v31.html':
            return route.fulfill(body=DOCUMENT, content_type='text/html')
        target = (ROOT / unquote(path).lstrip('/')).resolve()
        if not target.is_relative_to(ROOT) or not target.is_file():
            return route.fulfill(status=404, body='Missing asset')
        return route.fulfill(body=target.read_bytes(), content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')

    context.route(BASE + '/**', asset)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))

    def tap(locator):
        locator.tap() if mobile else locator.click()

    def start_puzzle(kind):
        page.evaluate('window.reset()')
        tap(page.locator('[data-adventure-all]'))
        tap(page.locator('[data-puzzle-start=' + json.dumps(kind) + ']').first)
        expect(page.locator('[data-expanded-adventure]')).to_have_attribute('data-expanded-adventure', 'islandPuzzle')
        expect(page.locator('[data-puzzle-title]')).not_to_be_empty()

    def play_moves(moves):
        for move in moves:
            if page.evaluate('window.view().solved'):
                break
            if move['type'] == 'reveal':
                tap(page.locator('[data-memory-card=' + json.dumps(str(move['index'])) + ']'))
                continue
            if 'id' in move and move['type'] in ['place', 'rotate', 'navigate', 'remove']:
                item = page.locator('[data-puzzle-item=' + json.dumps(str(move['id'])) + ']')
                if item.count() and item.get_attribute('aria-pressed') != 'true':
                    tap(item)
            selector = page.evaluate('(move)=>window.controlFor(move)', move)
            assert selector, ('No real UI control for move', move, page.evaluate('window.view()'))
            tap(page.locator(selector))

    try:
        page.goto(BASE + '/adventures-v31.html?language=' + language)
        page.wait_for_function('window.ready===true')
        expect(page.locator('.adv-choice')).to_have_count(3)
        tap(page.locator('[data-open-main-mission]'))
        assert page.evaluate('window.openMainCount') == 1
        assert page.evaluate('window.current().adventures.active') is None

        # A click/touch catches a moving drop once, before a synthetic click or
        # the next animation frame can move it out from under the pointer.
        page.evaluate('window.reset()')
        tap(page.locator('[data-adventure-all]'))
        tap(page.locator('[data-adventure-start="cargoRain"]'))
        page.evaluate('window.advance(2)')
        tap(page.locator('[data-cargo-drop="1"]'))
        assert page.evaluate('window.current().resources.coins') == 505
        assert page.evaluate('window.actionLog.filter(a=>a.command==="catch").length') == 1

        # An atomic drag selects the dragged guest, even when a different guest
        # was selected before the gesture. Tapping remains the mobile route.
        if not mobile:
            start_puzzle('hotel')
            placement = page.evaluate('window.solution()[1]')
            page.locator('[data-puzzle-item=' + json.dumps(placement['id']) + ']').drag_to(page.locator('[data-puzzle-target=' + json.dumps(placement['target']) + ']'))
            assert page.evaluate('(id)=>window.current().adventures.active.data.puzzle.data.guests.find(g=>g.id===id).at', placement['id']) == int(placement['target'])

        # Keyboard activation performs the same real model inputs as touch.
        start_puzzle('gull')
        for move in page.evaluate('window.solution()'):
            selector = page.evaluate('(move)=>window.controlFor(move)', move)
            page.locator(selector).focus()
            page.locator(selector).press('Enter')
        assert page.evaluate('window.view().solved')
        page.locator('[data-puzzle-next-room]').focus()
        page.locator('[data-puzzle-next-room]').press('Enter')
        expect(page.locator('[data-adventure-stage]')).to_have_attribute('data-adventure-stage', 'complete')

        # This is an initial account fixture with its daily pool already spent,
        # not an in-game reward mutation. Real moves still finish the puzzle.
        page.evaluate('window.reset({practice:true})')
        tap(page.locator('[data-adventure-all]'))
        practice_start = page.locator('[data-puzzle-start="gull"]')
        expect(practice_start).to_contain_text('for fun' if language == 'en' else 'dla przyjemności')
        tap(practice_start)
        play_moves(page.evaluate('window.solution()'))
        tap(page.locator('[data-puzzle-next-room]'))
        assert page.evaluate('window.current().adventures.active.data.practice') is True
        assert page.evaluate('window.current().resources.coins') == 500
        expect(page.locator('.adv-reward-values > span')).to_have_count(0)
        page.evaluate('window.restore()')
        assert page.evaluate('window.current().resources.coins') == 500
        assert not errors, errors
        if os.environ.get('HARBORLIGHT_ADVENTURE_V31_EDGE_ONLY') == '1':
            print('PASS v31 adventure edges', language, mobile, 'single cargo click/tap, keyboard, atomic drag and free practice without rewards', flush=True)
            return

        kinds = ['gull', 'crabs', 'hiddenObjects', 'parrot', 'packing', 'untangle', 'navigation', 'scheduling', 'gears', 'optics', 'tides', 'hotel', 'magnets', 'paperFold', 'invention', 'photo', 'deduction', 'cooking', 'signalsDecode', 'balance', 'memoryTriples']
        for kind in kinds:
            start_puzzle(kind)
            hint = page.locator('[data-puzzle-hint-button]')
            hint.focus()
            page.evaluate('window.advance(.1)')
            expect(hint).to_be_focused()
            tap(hint)
            expect(page.locator('[data-puzzle-hint]')).not_to_be_empty()
            before = page.evaluate('window.view()')
            page.evaluate('window.restore()')
            restored = page.evaluate('window.view()')
            assert restored == before, ('Checkpoint changed', kind, {key: [before.get(key), restored.get(key)] for key in set(before) | set(restored) if before.get(key) != restored.get(key)})
            moves = page.evaluate('window.solution()')
            play_moves(moves)
            assert page.evaluate('window.view().solved'), ('Puzzle not solved through controls', kind)
            tap(page.locator('[data-puzzle-next-room]'))
            expect(page.locator('[data-adventure-stage]')).to_have_attribute('data-adventure-stage', 'complete')
            reward_before = page.evaluate('window.current().resources.coins')
            assert reward_before > 500, ('Real budget coordinator did not award the first completion', kind)
            page.evaluate('window.restore()')
            assert page.evaluate('window.current().resources.coins') == reward_before
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), kind
            assert not errors, (kind, errors)

        # The old physics engine is embedded as a real board, with a working
        # pointer/touch joystick. The model suite checks its full motion path.
        start_puzzle('marbleMaze')
        expect(page.locator('[data-tilt-board]')).to_be_visible()
        joystick = page.locator('[data-tilt-touch]')
        bounds = joystick.bounding_box()
        page.mouse.move(bounds['x'] + bounds['width'] * .5, bounds['y'] + bounds['height'] * .5)
        page.mouse.down()
        page.mouse.move(bounds['x'] + bounds['width'] * .8, bounds['y'] + bounds['height'] * .6)
        page.wait_for_timeout(180)
        page.evaluate('window.advance(.2)')
        page.mouse.up()
        assert any(a.get('command') == 'puzzleMove' and a.get('move', {}).get('type') == 'tilt' for a in page.evaluate('window.actionLog'))

        # One whole escape story: each room is solved via its actual controls,
        # a checkpoint is reloaded between rooms, and one final claim settles it.
        page.evaluate('window.reset()')
        tap(page.locator('[data-adventure-all]'))
        tap(page.locator('[data-story-start="first-light"]').first)
        expect(page.locator('[data-expanded-adventure]')).to_have_attribute('data-expanded-adventure', 'escapeStory')
        room_count = page.evaluate('window.current().adventures.active.data.story.roomCount')
        completed = 0
        while page.locator('[data-expanded-adventure]').count():
            assert completed < 8, 'Story did not advance'
            play_moves(page.evaluate('window.solution()'))
            assert page.evaluate('window.view().solved')
            if not mobile and language == 'pl':
                page.screenshot(path='/tmp/harborlight-adventure-v31-room-' + str(completed) + '.png', full_page=True)
            tap(page.locator('[data-puzzle-next-room]'))
            completed += 1
            coins = page.evaluate('window.current().resources.coins')
            page.evaluate('window.restore()')
            assert page.evaluate('window.current().resources.coins') == coins
        expect(page.locator('[data-adventure-stage]')).to_have_attribute('data-adventure-stage', 'complete')
        assert completed == room_count
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not errors, errors
        print('PASS v31 adventures', language, 'mobile' if mobile else 'desktop', '21 puzzle completions, real physics input, full multiroom story, checkpoints, exact-once rewards and layout', flush=True)
    except Exception:
        print('V31 ADVENTURE DIAGNOSTICS', language, mobile, errors, flush=True)
        print(page.locator('body').inner_text()[-4500:], flush=True)
        page.screenshot(path='/tmp/harborlight-adventure-v31-failure.png', full_page=True)
        raise
    finally:
        context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    try:
        for language in ['pl', 'en']:
            for mobile in [False, True]:
                scenario(browser, language, mobile)
    finally:
        browser.close()
