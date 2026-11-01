"""Isolated Lighthouse panel acceptance: real model actions, PL/EN and mobile.

No account, cloud write, saved island or deployed environment is used.
"""
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', ROOT)).resolve()
BASE = 'http://harborlight-missions.test'

DOCUMENT = '''<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:12px;background:#092331;color:#e5f0f4;font:16px Arial,sans-serif}
main{max-width:760px;margin:auto}button{touch-action:manipulation}
</style></head><body><main></main><script type="module">
import {createState} from './harborlight-v1-state.js?v=frontend-v27';
import * as Missions from './harborlight-v1-missions.js?v=frontend-v27';
import {createLighthouseMissionsPanel} from './harborlight-v1-missions-ui.js?v=contract';
import {grantBonusMaterials} from './harborlight-v1-inventory.js?v=frontend-v27';
const language=new URLSearchParams(location.search).get('language')||'pl';
const state=createState(Date.parse('2026-11-01T12:00:00Z'));
state.settings.language=language;state.tutorial.autoOpenDisabled=true;
for(const id of ['townhall','house','warehouse','lumber'])state.buildings[id].level=2;
state.capacity=48;state.buildings.lighthouse.level=1;
grantBonusMaterials(state,{wood:5000,stone:5000,grain:5000,food:5000,planks:5000});
Missions.normalizeMissions(state,{});Missions.advanceMissions(state);
let fixture=null,panel;window.calls=[];window.opened=[];window.changes=0;
const read=()=>fixture||Missions.missionStatus(state);
window.mount=(scenario='actual')=>{
 fixture=null;
 if(scenario!=='actual'){
   fixture=structuredClone(Missions.missionStatus(state));
   fixture.available=true;fixture.active=false;fixture.kind='main';fixture.index=3;fixture.total=8;
   fixture.task={id:'fixture-1',status:'offered',title:'Prepare the crew',titlePl:'Przygotuj załogę',description:'Prepare supplies for the island.',descriptionPl:'Przygotuj zapasy dla wyspy.',objective:{type:'assign',building:'farm',count:1},requirements:{},deposited:{},reward:{coins:12},duration:600,deadline:null};
   fixture.plan={feasible:true,duration:600,staffing:{farm:1,warehouse:2}};fixture.canStart=true;
   if(scenario==='blocked'){fixture.canStart=false;fixture.plan.feasible=false;fixture.plan.reason='Prepare stock first.';fixture.plan.reasonPl='Najpierw przygotuj zapasy.';}
   if(scenario==='retry'){fixture.kind='rescue';fixture.index=2;fixture.total=3;fixture.task.status='retry';fixture.parents=[{kind:'main',index:4,total:8},{kind:'support',index:3,total:5}];}
   if(scenario==='stock'){fixture.task.objective={type:'stock',requirements:{wood:120,stone:40}};fixture.task.requirements={wood:120,stone:40};}
   if(scenario==='production'){fixture.active=true;fixture.task.status='active';fixture.task.objective={type:'production',resource:'planks',count:20};fixture.task.deadline=state.worldTimeMs+600000;fixture.remaining=600;fixture.progress=3;}
   if(scenario==='finished'){fixture.available=false;fixture.finished=true;}
 }
 panel=createLighthouseMissionsPanel({state,missionStatus:read,perform:action=>{
   window.calls.push(action);
   if(fixture)return false;
   const result=Missions.missionAction(state,action);Missions.advanceMissions(state);return result;
 },onOpenBuilding:id=>window.opened.push(id),onChange:()=>window.changes++});
 document.querySelector('main').replaceChildren(panel);
};
window.inspect=()=>({status:read(),lighthouse:state.buildings.lighthouse.level,coins:state.resources.coins,wood:state.resources.wood});
window.advanceClock=seconds=>{state.worldTimeMs+=seconds*1000;panel.refresh();};
window.refreshProgress=()=>{fixture.progress=8;fixture.remaining=550;panel.refresh();};
window.mount();
</script></body></html>'''


def route_asset(route):
    path = unquote(urlsplit(route.request.url).path)
    if path == '/mission-contract.html':
        return route.fulfill(body=DOCUMENT, content_type='text/html')
    target = (FRONTEND_ROOT / path.lstrip('/')).resolve()
    if not target.is_relative_to(FRONTEND_ROOT) or not target.is_file():
        return route.fulfill(status=404, body='Missing fixture asset')
    route.fulfill(body=target.read_bytes(), content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')


def exercise(browser, language, mobile):
    context = browser.new_context(viewport={'width': 360 if mobile else 1080, 'height': 800})
    context.route(BASE + '/**', route_asset)
    page = context.new_page()
    failures = []
    page.on('pageerror', lambda error: failures.append(str(error)))
    page.goto(BASE + '/mission-contract.html?language=' + language)
    panel = page.locator('[data-lighthouse-missions]')
    expect(panel).to_be_visible()
    expect(panel).to_have_attribute('lang', language)
    expect(panel).to_contain_text('Latarnia — wspólny cel wyspy' if language == 'pl' else 'Lighthouse — the island’s shared goal')
    expect(panel.locator('[data-mission-path]')).to_have_count(3)
    expect(panel.locator('[data-mission-path="main"]')).to_contain_text('1 / 8')
    # The model, rather than the UI, starts the immutable accepted deadline.
    page.locator('[data-mission-start]').click()
    expect(page.locator('[data-mission-active]')).to_be_visible()
    before = page.locator('[data-mission-countdown]').inner_text()
    page.locator('[data-mission-deposit-input="wood"]').fill('1')
    page.evaluate('window.advanceClock(2)')
    assert page.locator('[data-mission-deposit-input="wood"]').input_value() == '1'
    assert page.locator('[data-mission-countdown]').inner_text() != before
    page.locator('[data-mission-deposit="wood"]').click()
    expect(page.locator('[data-mission-deposited="wood"]')).to_have_text('1 / 50')
    state_before = page.evaluate('window.inspect()')
    page.locator('[data-mission-deposit-input="wood"]').fill('49')
    page.locator('[data-mission-deposit="wood"]').click()
    expect(page.locator('[data-mission-task]')).not_to_have_attribute('data-mission-task', state_before['status']['task']['id'])
    after = page.evaluate('window.inspect()')
    # The already-built Lumber Camp pre-credits main step 2 as well. Both
    # receipts come from the model, with no UI-side reward or level mutation.
    assert after['status']['index'] == 3
    assert after['coins'] == state_before['coins'] + 28
    assert after['lighthouse'] == state_before['lighthouse'] == 1
    assert page.evaluate('window.calls.map(x=>x.type)') == ['missionStart', 'missionDeposit', 'missionDeposit']
    assert page.evaluate('window.changes') == 3
    # Feasibility is explicit and cannot be bypassed with the start button.
    page.evaluate('window.mount("blocked")')
    expect(page.locator('[data-mission-start]')).to_be_disabled()
    expect(page.locator('[data-mission-feasibility]')).to_contain_text('Najpierw przygotuj zapasy.' if language == 'pl' else 'Prepare stock first.')
    expect(page.locator('[data-mission-staffing]')).to_contain_text('2')
    page.locator('[data-mission-open-building="farm"]').click()
    assert page.evaluate('window.opened.at(-1)') == 'farm'
    # A rescue retry uses the real retry action; it does not complete a step.
    page.evaluate('window.mount("retry")')
    expect(page.locator('[data-mission-path="main"]')).to_contain_text('4 / 8')
    expect(page.locator('[data-mission-path="support"]')).to_contain_text('3 / 5')
    expect(page.locator('[data-mission-path="rescue"]')).to_contain_text('2 / 3')
    page.locator('[data-mission-start]').click()
    assert page.evaluate('window.calls.at(-1).type') == 'missionRetry'
    expect(page.locator('[data-mission-start]')).to_be_visible()
    # Stock goals show spendable inventory and offer no donation/claim shortcut.
    page.evaluate('window.mount("stock")')
    expect(page.locator('[data-mission-requirement]')).to_have_count(2)
    expect(page.locator('[data-mission-deposit]')).to_have_count(0)
    # Actual production is shown as a model metric; timer refresh preserves it.
    page.evaluate('window.mount("production")')
    expect(page.locator('[data-mission-objective-progress]')).to_contain_text('3 / 20')
    page.evaluate('window.refreshProgress()')
    expect(page.locator('[data-mission-objective-progress]')).to_contain_text('8 / 20')
    expect(page.locator('progress')).to_have_attribute('value', '8')
    # Completion only offers a check for the next chapter, never a fake level.
    page.evaluate('window.mount("finished")')
    expect(page.locator('[data-mission-unavailable]')).to_contain_text('Rozdział ukończony!' if language == 'pl' else 'Chapter complete!')
    page.locator('[data-mission-next]').click()
    assert page.evaluate('window.calls.at(-1).type') == 'missionNext'
    assert page.evaluate('window.inspect().lighthouse') == 1
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal overflow'
    assert not failures, failures
    context.close()


if __name__ == '__main__':
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox', '--disable-dev-shm-usage'])
        for language in ['pl', 'en']:
            for mobile in [False, True]:
                exercise(browser, language, mobile)
                print(f'PASS missions UI {language} {"mobile" if mobile else "desktop"}')
        browser.close()
