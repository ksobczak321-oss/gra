"""Sanitized real-model support UI: earned81 people, unbuilt Town Hall4.

Local fixtures only. No authentication, player saves, network or account writes.
"""
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', ROOT)).resolve()
BASE = 'http://harborlight-assistance.test'
DOCUMENT = '''<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:12px;background:#092331;color:#e5f0f4;font:16px Arial,sans-serif}
main{max-width:760px;margin:auto}button{touch-action:manipulation}
</style></head><body><main></main><script type="module">
import * as State from './harborlight-v1-state.js';
import * as Missions from './harborlight-v1-missions.js';
import {synchronizeResidents} from './harborlight-v1-residents.js';
import {createLighthouseMissionsPanel} from './harborlight-v1-missions-ui.js';
const NOW=Date.parse('2026-11-22T12:00:00Z');
const language=new URLSearchParams(location.search).get('language')||'pl';
const state=State.createState(NOW,{ruleset:32,onboarding:false});
state.settings.language=language;state.tutorial.autoOpenDisabled=true;
state.buildings.townhall.level=3;state.buildings.house.level=3;state.population=81;
synchronizeResidents(state);for(const id of Object.keys(state.resources))state.resources[id]=0;
state.resources.coins=100;
Missions.normalizeMissions(state,{lighthouseMissions:{version:1,campaignEnabled:true,completedLevels:[2]}});
Missions.advanceMissions(state);
const m=state.lighthouseMissions;
const makeTask=(id,objective)=>({id,status:'assistance',objective,requirements:{},deposited:{},
 title:'Recover the missing supplies',titlePl:'Odzyskaj brakujące zaopatrzenie',description:'Support for the main objective.',descriptionPl:'Pomoc w przygotowaniu celu głównego.',
 reward:{},duration:21600,offeredAt:NOW,acceptedAt:null,deadline:null,attempt:0,campaignVersion:1,untimed:true});
const main={kind:'main',index:7,total:8,prefix:m.chapter.id,task:makeTask(m.chapter.id+':7',{type:'building',building:'townhall',target:4})};
main.task.title='Finish Town Hall level4';main.task.titlePl='Ukończ rozbudowę Ratusza na poziom4';
main.task.requirements={coins:1500,wood:1500,stone:1500,planks:1500,grain:1500,bread:198};main.task.reward={coins:90};
const support={kind:'support',index:2,total:5,prefix:main.task.id+':support',task:makeTask(main.task.id+':support:2',{type:'adventure',kind:'escapeStory',storyId:'captainless-ship',count:1,baseline:2})};
const rescue={kind:'rescue',index:2,total:3,prefix:support.task.id+':rescue',task:makeTask(support.task.id+':rescue:2',{type:'adventure',kind:'escapeStory',storyId:'captainless-ship',count:1,baseline:2})};
rescue.task.status='active';rescue.task.acceptedAt=NOW;
m.stack=[main,support,rescue];m.receipts=Array.from({length:6},(_,i)=>m.chapter.id+':'+(i+1));
m.chapter.coinsAwarded=630;m.chapter.materialsAwarded=0;
m.assistanceContracts=[{source:'campaign',missionId:m.chapter.id+':4',goalMissionId:m.chapter.id+':recruitment-54',chapterId:m.chapter.id,
 receiptId:'earned-crew-81',targetPopulation:81,mode:'population',goalComplete:true,maximumResidents:6,residentsRequested:6,residentsAccepted:6,
 supplies:{},claimed:true,storyId:'captainless-ship',completionReceiptId:'completed-crew-story'}];
state.adventures.completedEscapeStories['captainless-ship']=2;
const context={buildingCost:()=>({coins:1500,wood:1500,stone:1500,planks:1500}),previewSteps:false};
if(new URLSearchParams(location.search).has('paid')){
 state.buildings.townhall.construction={building:'townhall',targetLevel:4,stage:'transport',goodsRemaining:4500,cost:{coins:1500,wood:1500,stone:1500,planks:1500},reservedCoins:1500};
 Missions.advanceMissions(state,0,context);
}
window.launches=[];window.buildings=[];window.actions=[];
const panel=createLighthouseMissionsPanel({state,language,missionStatus:()=>Missions.missionStatus(state,context),
 perform:action=>{window.actions.push(action);return Missions.missionAction(state,action,context);},
 onOpenBuilding:id=>window.buildings.push(id),onOpenAdventure:(kind,options)=>window.launches.push({kind,options})});
document.querySelector('main').append(panel);
window.inspect=()=>({population:state.population,townhall:state.buildings.townhall.level,coins:state.resources.coins,
 receipts:m.receipts,contracts:m.assistanceContracts,depth:m.stack.length,index:m.stack[0].index,status:Missions.missionStatus(state,context)});
window.refreshStock=()=>{state.resources.wood=11;panel.refresh();};
</script></body></html>'''


def route_asset(route):
    path = unquote(urlsplit(route.request.url).path)
    if path == '/assistance-contract.html':
        return route.fulfill(body=DOCUMENT, content_type='text/html')
    target = (FRONTEND_ROOT / path.lstrip('/')).resolve()
    if not target.is_relative_to(FRONTEND_ROOT) or not target.is_file():
        return route.fulfill(status=404, body='Missing local fixture asset')
    return route.fulfill(body=target.read_bytes(), content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')


def exercise(browser, language, mobile):
    context = browser.new_context(viewport={'width': 360 if mobile else 1080, 'height': 900})
    context.route(BASE + '/**', route_asset)
    page = context.new_page()
    failures = []
    page.on('pageerror', lambda error: failures.append(str(error)))
    page.goto(BASE + '/assistance-contract.html?language=' + language)
    panel = page.locator('[data-lighthouse-missions]')
    explanation = page.locator('[data-mission-assistance-plan]')
    expect(explanation).to_be_visible()
    expect(explanation).to_contain_text('Ratusza' if language == 'pl' else 'Town Hall')
    expect(page.locator('[data-mission-assistance-population]')).to_contain_text('81 / 81')
    expect(page.locator('[data-mission-assistance-population]')).to_contain_text('już spełniony' if language == 'pl' else 'already met')
    expect(page.locator('[data-mission-assistance-missing]')).to_contain_text('Drewno' if language == 'pl' else 'Wood')
    expect(page.locator('[data-mission-assistance-supplies]')).to_contain_text('pomoc' if language == 'pl' else 'assistance')
    expect(explanation.locator('ol li')).to_have_count(3)
    expect(explanation.locator('ol')).to_contain_text('Statek bez kapitana' if language == 'pl' else 'captainless ship')
    expect(explanation.locator('ol')).to_contain_text('finału' if language == 'pl' else 'finale')
    assert '198' not in explanation.inner_text(), 'obsolete food costs cannot be presented as a current building shortfall'
    expect(panel).to_contain_text('bez limitu czasu' if language == 'pl' else 'without a time limit')
    expect(page.locator('[data-mission-open-adventure]')).to_have_count(1)
    page.locator('[data-mission-open-adventure]').click()
    launch = page.evaluate('window.launches.at(-1)')
    assert launch['kind'] == 'escapeStory'
    assert launch['options']['storyId'] == 'captainless-ship'
    assert launch['options']['rescueContext']['mode'] == 'supplies'
    assert launch['options']['rescueContext']['residentsRequested'] == 0
    assert launch['options']['rescueContext']['goalMissionId'] == 'lighthouse-chapter-3:7'
    before = page.evaluate('window.inspect()')
    page.evaluate('window.refreshStock()')
    expect(page.locator('[data-mission-assistance-missing]')).to_contain_text('1489' if language == 'pl' else '1,489')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'rescue explanation must fit the viewport'
    page.locator('[data-mission-return-main]').click()
    expect(page.locator('[data-mission-assistance-plan]')).to_have_count(0)
    expect(page.locator('[data-mission-task]')).to_have_attribute('data-mission-task', 'lighthouse-chapter-3:7')
    expect(panel).to_contain_text('Ratusza' if language == 'pl' else 'Town Hall')
    after = page.evaluate('window.inspect()')
    assert after['depth'] == 1 and after['index'] == 7
    assert after['population'] == 81 and after['townhall'] == 3
    assert after['receipts'] == before['receipts'] and after['contracts'] == before['contracts']
    assert after['coins'] == before['coins']
    assert page.evaluate('window.actions.at(-1).type') == 'missionReturnToMain'
    assert failures == [], failures
    page.goto(BASE + '/assistance-contract.html?language=' + language + '&paid=1')
    expect(page.locator('[data-mission-assistance-plan]')).to_have_count(0)
    expect(page.locator('[data-mission-paid-construction]')).to_be_visible()
    expect(page.locator('[data-mission-paid-construction]')).to_contain_text('już opłacony' if language == 'pl' else 'already been paid')
    expect(page.locator('[data-mission-paid-construction]')).to_contain_text('Tragarze' if language == 'pl' else 'Carriers')
    expect(page.locator('[data-mission-open-building="warehouse"]')).to_be_visible()
    expect(page.locator('[data-mission-active]')).to_be_visible()
    expect(page.locator('[data-mission-open-adventure]')).to_have_count(0)
    paid = page.evaluate('window.inspect()')
    assert paid['depth'] == 1 and paid['index'] == 7 and paid['townhall'] == 3 and paid['population'] == 81
    assert paid['coins'] == 100 and len(paid['receipts']) == 6
    assert failures == [], failures
    context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                               headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        for language in ['pl', 'en']:
            for mobile in [False, True]:
                exercise(browser, language, mobile)
                print(f'PASS mission-assistance-resolution {language} {"mobile" if mobile else "desktop"}', flush=True)
        browser.close()
