"""Real mission model/UI: complete preview, correct recruitment route, real game launch.

Isolated fixtures only; no account, cloud write or reward provider.
"""
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', ROOT)).resolve()
BASE = 'http://harborlight-campaign.test'
DOCUMENT = '''<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:12px;background:#092331;color:#e5f0f4;font:16px Arial,sans-serif}main{max-width:760px;margin:auto}
</style></head><body><main></main><script type="module">
import * as State from './harborlight-v1-state.js?v=frontend-v31';
import * as Missions from './harborlight-v1-missions.js?v=frontend-v31';
import {createLighthouseMissionsPanel} from './harborlight-v1-missions-ui.js?v=frontend-v31';
import {grantBonusMaterials} from './harborlight-v1-inventory.js?v=frontend-v31';
import {synchronizeResidents} from './harborlight-v1-residents.js?v=frontend-v31';
const language=new URLSearchParams(location.search).get('language')||'pl';
let state,panel;window.buildings=[];window.adventures=[];
window.mount=(kind='campaign')=>{
 state=State.createState(Date.parse('2026-11-04T12:00:00Z'));state.settings.language=language;state.tutorial.autoOpenDisabled=true;
 for(const id of ['townhall','house','warehouse','farm','windmill','lumber','quarry','sawmill'])state.buildings[id].level=3;
 state.capacity=72;state.population=13;synchronizeResidents(state);state.buildings.lighthouse.level=2;state.resources.coins=100000;
 grantBonusMaterials(state,{wood:100000,stone:100000,grain:100000,food:100000,planks:100000});
 Missions.normalizeMissions(state,{lighthouseMissions:{version:1,campaignEnabled:kind!=='legacy',completedLevels:[2]}});Missions.advanceMissions(state);
 if(kind==='legacy'||kind==='rescue'){state.lighthouseMissions.stack[0].index=kind==='legacy'?6:4;state.lighthouseMissions.stack[0].task=null;Missions.advanceMissions(state);}
 panel=createLighthouseMissionsPanel({state,language,missionStatus:()=>Missions.missionStatus(state),perform:action=>Missions.missionAction(state,action),
  onOpenBuilding:id=>window.buildings.push(id),onOpenAdventure:(kind,options)=>window.adventures.push({kind,options})});
 document.querySelector('main').replaceChildren(panel);
};
window.inspect=()=>({population:state.population,status:Missions.missionStatus(state),buildings:window.buildings,adventures:window.adventures});
window.mount();
</script></body></html>'''


def route_asset(route):
    path = unquote(urlsplit(route.request.url).path)
    if path == '/':
        route.fulfill(status=200, content_type='text/html', body=DOCUMENT)
        return
    candidate = (FRONTEND_ROOT / path.lstrip('/')).resolve()
    if not candidate.is_relative_to(FRONTEND_ROOT) or not candidate.is_file():
        route.fulfill(status=404, body='Missing fixture asset')
        return
    route.fulfill(status=200, content_type=mimetypes.guess_type(candidate.name)[0] or 'application/octet-stream', body=candidate.read_bytes())


def scenario(browser, language, mobile):
    context = browser.new_context(viewport={'width': 360, 'height': 720} if mobile else {'width': 1280, 'height': 900}, is_mobile=mobile, has_touch=mobile)
    context.route('**/*', route_asset)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE + '/?language=' + language)
    panel = page.locator('[data-lighthouse-missions]')
    expect(panel).to_be_visible()
    expect(page.locator('[data-campaign-preview-step]')).to_have_count(8)
    page.locator('[data-campaign-preview] summary').click()
    expect(page.locator('[data-campaign-preview]')).to_contain_text('54')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    page.locator('[data-campaign-preview] summary').click()
    expect(page.locator('[data-mission-review]')).to_be_visible()
    page.locator('[data-mission-review]').click()
    assert page.evaluate('window.inspect().population') == 13
    page.evaluate("window.mount('legacy')")
    expect(page.locator('[data-mission-open-building="house"]')).to_be_visible()
    page.locator('[data-mission-open-building="house"]').click()
    assert page.evaluate('window.inspect().buildings.at(-1)') == 'house'
    assert page.locator('[data-mission-open-building="townhall"]').count() == 0
    page.evaluate("window.mount('rescue')")
    expect(page.locator('[data-mission-open-adventure]')).to_be_visible()
    page.locator('[data-mission-open-adventure]').click()
    launch = page.evaluate('window.inspect().adventures.at(-1)')
    assert launch['kind'] == 'escapeStory'
    assert launch['options']['storyId'] == 'captainless-ship'
    assert launch['options']['rescueContext']['source'] == 'campaign'
    assert launch['options']['rescueContext']['targetPopulation'] == 54
    assert page.evaluate('window.inspect().population') == 13, 'opening a real game must not award a crew'
    expect(panel).to_contain_text('Przygotowania bez limitu czasu' if language == 'pl' else 'Preparation has no time limit')
    assert not errors, errors
    context.close()


with sync_playwright() as playwright:
    chromium = os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium')
    browser = playwright.chromium.launch(executable_path=chromium, headless=True, args=['--no-sandbox'])
    try:
        for language in ['pl', 'en']:
            for mobile in [False, True]:
                scenario(browser, language, mobile)
                print(f'PASS missions-v31 {language} {"mobile" if mobile else "desktop"}', flush=True)
    finally:
        browser.close()
