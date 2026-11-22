"""Real DEV island UI: optional advisor, goal chat, navigation and compact intro.

Uses the existing bounded loopback level-5 preview. All page bytes and model
actions are real; no account or remote game write is made.
"""
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
OUTPUT = Path(os.environ.get('HARBORLIGHT_TEST_OUTPUT', '/tmp/harborlight-advisor-ui'))
OUTPUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:47491'

def asset(route):
    file = (ROOT / unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if route.request.method != 'GET':
        raise AssertionError('Advisor attempted a write: ' + route.request.url)
    if file.is_relative_to(ROOT) and file.is_file():
        route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='Missing advisor test asset')

def bounded(page, selector):
    node = page.locator(selector)
    expect(node).to_be_visible()
    box = node.bounding_box()
    viewport = page.viewport_size
    assert box and box['width'] > 0 and box['height'] > 0, (selector, box)
    assert box['x'] >= -1 and box['y'] >= -1, (selector, box)
    assert box['x'] + box['width'] <= viewport['width'] + 1, (selector, box)
    assert box['y'] + box['height'] <= viewport['height'] + 1, (selector, box)
    return box

def plan_shape(page,minimum_cards=2):
    cards=page.locator('[data-advisor-task-card]')
    assert minimum_cards <= cards.count() <= 5
    assert page.locator('[data-advisor-task-group]').count()==cards.count()
    assert page.locator('[data-advisor-howto-step]').count()>=2
    assert page.locator('[data-advisor-task-group][hidden], [data-advisor-howto-step][hidden]').count()==0

report = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    for width, height in [(1440,1000),(390,844),(390,480)]:
        context = browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce')
        context.route(BASE + '/**', asset)
        page = context.new_page()
        # With the practical course hidden, the existing Lighthouse story can
        # legitimately appear immediately. Dismiss it through its real control.
        page.add_locator_handler(page.locator('[data-story-close]'), lambda locator: locator.click())
        errors, failed, writes = [], [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: failed.append((response.status,response.url)) if response.status >= 400 else None)
        page.on('request', lambda request: writes.append(request.url) if request.method != 'GET' or '/api/' in request.url else None)
        page.add_init_script('localStorage.setItem("harborlight-language","pl")')
        page.goto(BASE + '/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5', wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"', timeout=20000)
        expect(page.locator('[data-kingdom-advisor]')).to_have_attribute('data-advisor-planning','ready',timeout=10000)
        bounded(page,'[data-advisor-open]')
        mobile_dock = page.locator('.mobile-bottom-dock')
        if mobile_dock.is_visible():
            advisor_box = page.locator('[data-advisor-open]').bounding_box()
            assert advisor_box['y'] + advisor_box['height'] <= mobile_dock.bounding_box()['y'] - 2, 'Advisor covers the bottom menu'
        assert page.locator('[data-active-tutorial-guide]').count() == 0
        assert page.locator('#island-dialog[open]').count() == 0
        page.locator('[data-advisor-open]').click()
        bounded(page,'[data-advisor-conversation]')
        plan_shape(page)
        user_input = page.locator('[data-advisor-input]')
        user_input.fill('Chcę najszybciej jak to możliwe rozbudować Port')
        user_input.press('Enter')
        answer = page.locator('[data-advisor-answer]')
        expect(answer.locator('[data-advisor-task]')).to_contain_text('Port')
        plan_shape(page)
        expect(page.locator('[data-advisor-plan-context]')).to_contain_text('Sugeruję')
        expect(page.locator('[data-advisor-goal-why]')).not_to_be_visible()
        bounded(page,'[data-advisor-input]')
        bounded(page,'[data-advisor-send]')
        bounded(page,'[data-advisor-close]')
        assert answer.locator('[data-advisor-target]').count() > 0
        if width == 390 and height == 844:
            # A mobile keyboard reduces the viewport after the conversation is open.
            page.set_viewport_size({'width':390,'height':350})
            bounded(page,'[data-advisor-input]')
            bounded(page,'[data-advisor-send]')
            bounded(page,'[data-advisor-close]')
            user_input.fill('Wpis podczas otwartej klawiatury')
            expect(user_input).to_have_value('Wpis podczas otwartej klawiatury')
            page.set_viewport_size({'width':width,'height':height})
        page.locator('[data-advisor-why]').click()
        expect(page.locator('[data-advisor-why]')).to_have_attribute('aria-expanded','true')
        assert len(page.locator('.kingdom-advisor-details').inner_text())>20
        user_input.fill('niedokończony wpis gracza')
        # Update has to recompute advice while preserving the actual input node.
        user_input.evaluate('(e)=>{window.advisorInputBefore=e}')
        page.wait_for_timeout(5600)
        expect(user_input).to_have_value('niedokończony wpis gracza')
        assert user_input.evaluate('(e)=>e===window.advisorInputBefore')
        page.locator('[data-advisor-alternative]').click()
        expect(page.locator('[data-kingdom-advisor]')).to_have_attribute('data-advisor-planning','ready',timeout=10000)
        plan_shape(page)
        page.screenshot(path=str(OUTPUT/f'advisor-port-{width}-{height}.png'))
        # Show where first marks the map. Only the user's subsequent keyboard
        # activation opens the building; the advisor does not click a control.
        user_input.fill('Wolni mieszkańcy')
        user_input.press('Enter')
        expect(page.locator('[data-kingdom-advisor]')).to_have_attribute('data-advisor-planning','ready',timeout=10000)
        target=answer.locator('[data-advisor-target]:not([data-advisor-target="expeditions"])').first
        target.click()
        expect(page.locator('#island-dialog')).not_to_be_visible()
        expect(page.locator('[data-advisor-conversation]')).not_to_be_visible()
        expect(page.locator('[data-advisor-guidance-phase="map"]')).to_be_visible()
        expect(page.locator('.advisor-guidance-map-target')).to_be_visible()
        page.locator('[data-advisor-guidance-focus]').click()
        page.keyboard.press('Enter')
        expect(page.locator('#island-dialog')).to_be_visible()
        expect(page.locator('#island-dialog .advisor-guidance-target')).to_be_visible()
        assert page.locator('[data-advisor-guidance-phase="map"]').count()==0
        page.locator('#island-dialog .dialog-close').click()
        page.locator('[data-advisor-open]').click()
        expect(user_input).to_have_value('Wolni mieszkańcy')
        user_input.fill('<img src=x onerror=alert(1)>')
        user_input.press('Enter')
        expect(page.locator('[data-kingdom-advisor]')).to_have_attribute('data-advisor-planning','ready',timeout=10000)
        expect(answer.locator('[data-advisor-task]')).to_be_visible()
        assert answer.locator('img,script').count() == 0
        user_input.press('Escape')
        expect(page.locator('[data-advisor-conversation]')).not_to_be_visible()
        expect(page.locator('[data-advisor-open]')).to_be_focused()
        page.locator('[data-advisor-mute]').click()
        expect(page.locator('[data-advisor-hint]')).to_contain_text('wyciszone')
        page.locator('[data-advisor-open]').click()
        expect(page.locator('[data-advisor-conversation]')).to_be_visible()
        page.locator('[data-advisor-close]').click()
        page.locator('[data-advisor-mute]').click()
        expect(page.locator('[data-advisor-hint]')).not_to_contain_text('wyciszone')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal page overflow'
        assert page.evaluate('Object.keys(localStorage)') == ['harborlight-language']
        assert page.evaluate('Object.keys(sessionStorage)') == []
        assert not errors, errors
        assert not failed, failed
        assert not writes, writes
        report.append({'width':width,'height':height,'port_plan':True,'live_input_preserved':True,'why_and_alternative':True,'map_then_actual_control_guidance':True,'optional_mute':True,'no_api_or_storage_writes':True,'errors':errors})
        context.close()
    # Exercise the actual UI controller with the actual island model. This
    # detached fixture is independent of the application account and proves
    # adaptation without replacing or writing an existing player's island.
    for width, height in [(1440,1000),(390,844)]:
        context = browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce')
        context.route(BASE + '/**', asset)
        context.route(BASE + '/advisor-controller-test.html', lambda route: route.fulfill(status=200, content_type='text/html', body='<!doctype html><html lang="pl"><head><link rel="stylesheet" href="harborlight-v1-advisor.css"></head><body style="background:#123449"></body></html>'))
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(BASE + '/advisor-controller-test.html')
        page.evaluate('''async () => {
          const State=await import('/harborlight-v1-state.js');
          const Model=await import('/harborlight-v1-advisor.js');
          const UI=await import('/harborlight-v1-advisor-ui.js');
          const now=Date.parse('2026-11-21T10:00:00Z');
          const state=State.createState(now,{ruleset:32});state.buildings.townhall.level=2;state.buildings.house.level=2;
          for(const id of Object.keys(state.resources))state.resources[id]=1000;state.resources.coins=100000;
          window.advisorFixture={State,state,now,language:'pl',detailedCalls:0,lightCalls:0,lastNavigation:null};
          const f=window.advisorFixture;
          f.ui=UI.createKingdomAdvisor({getState:()=>state,getLanguage:()=>f.language,
            getSuggestion:(world,options)=>{f.lightCalls++;const before=JSON.stringify(world),next=Model.advisorSuggestion(world,options);if(JSON.stringify(world)!==before)throw Error('Advice mutated its island fixture');f.lastSuggestion=next;return next;},
            getPlan:(input,options)=>{f.detailedCalls++;const before=JSON.stringify(state),next=Model.advisorPlan(state,input,options);if(JSON.stringify(state)!==before)throw Error('Detailed advice mutated its island fixture');f.lastDetailedPlan=next;return next;},
            onNavigate:row=>{f.lastNavigation=row.target;return true;}});
          f.ui.open();
        }''')
        bounded(page,'[data-advisor-conversation]')
        expect(page.locator('[data-advisor-task]')).to_contain_text('Ratusz')
        expect(page.locator('[data-advisor-answer]')).to_contain_text('jako tragarza')
        plan_shape(page,minimum_cards=1)
        assert page.evaluate('advisorFixture.detailedCalls')==0
        result=page.evaluate('''() => {
          const f=advisorFixture,r=f.State.act(f.state,{type:'assign',building:'warehouse',delta:1},f.now);
          f.State.tick(f.state,121);f.ui.update(true);return r.ok;
        }''')
        assert result is True
        expect(page.locator('[data-advisor-answer]')).not_to_contain_text('jako tragarza')
        user_input=page.locator('[data-advisor-input]')
        user_input.fill('Chcę rozbudować Gospodarstwo')
        user_input.press('Enter')
        expect(page.locator('[data-advisor-task]')).to_contain_text('Gospodarstwo')
        assert page.evaluate('advisorFixture.detailedCalls')==1
        user_input.fill('Mój niedokończony wpis')
        page.evaluate('''() => {
          const f=advisorFixture;for(let i=0;i<5;i++)f.ui.update(true);
        }''')
        assert page.evaluate('advisorFixture.detailedCalls')==1, 'Passive refresh reran a detailed forecast'
        expect(user_input).to_have_value('Mój niedokończony wpis')
        result=page.evaluate('''() => {
          const f=advisorFixture,r=f.State.act(f.state,{type:'upgrade',building:'farm'},f.state.worldTimeMs);
          f.State.tick(f.state,7200);f.ui.update(true);return {ok:r.ok,level:f.state.buildings.farm.level};
        }''')
        assert result=={'ok':True,'level':2}, result
        expect(page.locator('[data-advisor-task]')).to_contain_text('Ratusz')
        expect(user_input).to_have_value('Mój niedokończony wpis')
        assert page.evaluate('advisorFixture.detailedCalls')==1
        page.evaluate('''() => {const f=advisorFixture;f.state.resources.coins=0;f.ui.update(true);}''')
        plan_shape(page,minimum_cards=1)
        game=page.locator('[data-advisor-target="expeditions"]')
        expect(game).to_be_visible()
        expect(page.locator('[data-advisor-answer]')).to_contain_text('Nagroda zależy')
        game.click()
        assert page.evaluate('advisorFixture.lastNavigation')=='expeditions'
        page.evaluate('''() => {const f=advisorFixture;f.language='en';f.ui.open();f.ui.update(true);}''')
        expect(page.locator('#kingdom-advisor-title')).to_have_text('Kingdom Advisor')
        expect(page.locator('[data-advisor-task]')).to_contain_text('Goal:')
        expect(page.locator('[data-advisor-answer]')).to_contain_text('reward depends')
        expect(page.locator('[data-advisor-send]')).to_have_text('Ask')
        user_input.fill('Upgrade the Port')
        user_input.press('Enter')
        # The named Port remains the player's destination. Its later unlock
        # must not turn into an immediate impossible Town Hall4 order at TH2.
        expect(page.locator('[data-advisor-task]')).to_have_text('Goal: prepare the next step — Town Hall 3')
        expect(page.locator('[data-advisor-answer]')).to_contain_text('Port eventually requires Town Hall level 4')
        expect(page.locator('[data-advisor-answer]')).to_contain_text('Review the immediate level 3 first')
        assert page.evaluate('''() => {
          const p=advisorFixture.lastDetailedPlan;
          return {goal:p.goal,targetLevel:p.targetLevel,requestedGoal:p.requestedGoal,
            requestedTargetLevel:p.requestedTargetLevel,longTermRequirement:p.longTermRequirement,
            targets:p.steps.map(row=>row.target)};
        }''') == {'goal':'townhall','targetLevel':3,'requestedGoal':'dock',
                  'requestedTargetLevel':2,'longTermRequirement':4,'targets':['townhall','warehouse']}
        assert page.evaluate('advisorFixture.detailedCalls')==2
        page.evaluate('''() => {const f=advisorFixture;f.state.buildings.townhall.level=4;f.ui.update(true);}''')
        expect(page.locator('[data-advisor-task]')).to_have_text('Goal: prepare materials — Port')
        expect(page.locator('[data-advisor-answer]')).to_contain_text('Immediate level: 2')
        assert page.evaluate('''() => {
          const f=advisorFixture,p=f.lastSuggestion;
          return {kind:p.kind,goal:p.goal,targetLevel:p.targetLevel,
            coinShortfall:p.missing.find(row=>row.id==='coins')?.missing,
            expectedCoins:f.State.buildingCost(f.state,'dock').coins,
            preparation:p.steps.some(row=>row.id==='prepare-dock'),
            immediateUpgrade:p.steps.some(row=>row.id==='upgrade-dock')};
        }''') == {'kind':'materials','goal':'dock','targetLevel':2,'coinShortfall':400,
                  'expectedCoins':400,'preparation':True,'immediateUpgrade':False}
        assert page.evaluate('advisorFixture.detailedCalls')==2
        page.evaluate('''() => {const f=advisorFixture;f.language='pl';f.ui.update(true);}''')
        user_input.fill('Wolni mieszkańcy')
        user_input.press('Enter')
        plan_shape(page,minimum_cards=1)
        before=page.locator('[data-advisor-plan-context]').first.inner_text()
        result=page.evaluate('''() => {
          const f=advisorFixture,r=f.State.act(f.state,{type:'assign',building:'warehouse',delta:1},f.state.worldTimeMs);
          f.ui.update(true);return r.ok;
        }''')
        assert result is True
        assert page.locator('[data-advisor-plan-context]').first.inner_text()!=before
        assert page.evaluate('advisorFixture.detailedCalls')==3, 'A workers topic refresh reran the detailed planner'
        expect(user_input).to_have_value('Wolni mieszkańcy')
        bounded(page,'[data-advisor-input]')
        page.screenshot(path=str(OUTPUT/f'advisor-live-guidance-{width}-{height}.png'))
        assert not errors, errors
        report.append({'width':width,'height':height,'controller_live_model':True,'staffing_update':True,'completed_goal_replaced':True,'ordered_howto_preserved':True,'passive_detailed_quotes':0,'minigame_reward_navigation':True,'EN':True,'input_preserved':True})
        context.close()
    browser.close()
(OUTPUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
print('PASS advisor UI: real Port goal, one goal with2–5task cards and all ordered how-to, actual model staffing/upgrade transitions, no passive detailed forecasts, reward-bearing minigame navigation, EN, preserved input, keyboard, mute/reopen, desktop/mobile and short viewport; no account/storage writes.')
