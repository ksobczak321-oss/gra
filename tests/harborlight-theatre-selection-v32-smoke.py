"""Large Theatre audiences: grouped dropdown, real quotes, all/subset and UI drafts."""
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
BASE = 'http://127.0.0.1:47436'
DOCUMENT = '''<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/harborlight-v1-play.css"><link rel="stylesheet" href="/harborlight-v1-development.css"><style>body{margin:0;background:#0877b4;font-family:Inter,system-ui,sans-serif}#island-dialog{display:block}#island-dialog .dialog-body{padding:16px}</style><dialog open id="island-dialog"><section class="dialog-body" id="body"></section></dialog><script type="module">
import {createState} from '/harborlight-v1-state.js';
import {synchronizeResidents} from '/harborlight-v1-residents.js';
import * as Education from '/harborlight-v1-education.js';
import * as Military from '/harborlight-v1-military.js';
import * as Theatre from '/harborlight-v1-theatre.js';
import {renderTheatreControls} from '/harborlight-v1-development-ui.js';
window.results=[];window.generation=0;
window.mount=()=>{document.querySelector('#body').replaceChildren(renderTheatreControls({getState:()=>s,onAction:action=>{const r=Theatre.theatreAction(s,action,{now:s.worldTimeMs});results.push(r);return r;},onRefresh:()=>mount(),context:{accountId:'test-admin1',education:Education,military:Military,theatreScheduleActionType:'theatrePlanShow',theatreStatus:()=>Theatre.theatreStatus(s,{now:s.worldTimeMs}),theatreShowQuote:(world,action)=>Theatre.theatreShowQuote(world,action,{now:world.worldTimeMs})}}));};
window.reset=(coins=1000)=>{window.s=createState(Date.parse('2026-11-15T12:00:00Z'),{ruleset:32});s.islandGeneration=++generation;s.buildings.townhall.level=5;s.buildings.house.level=5;s.population=102;s.capacity=180;synchronizeResidents(s);s.resources.coins=coins;s.buildings.academy.level=1;s.buildings.barracks.level=1;for(let i=0;i<20;i++)s.residents[i].workplace='farm';for(let i=20;i<30;i++)s.residents[i].workplace='bakery';for(let i=30;i<38;i++)s.residents[i].workplace='warehouse';for(let i=38;i<40;i++){Education.importPersonEducation(s,s.residents[i],{profession:'professor',rounds:1});s.residents[i].workplace='academy';}for(let i=40;i<42;i++){Military.importPersonMilitary(s,s.residents[i],{rank:'soldier',trainedAt:1,restUntil:0});s.residents[i].workplace='barracks';}s.residents[100].shipId='away-ship';s.residents[101].atSea=true;window.results=[];mount();};
window.cas=()=>{window.s=structuredClone(s);mount();};window.reset();window.ready=true;
</script></html>'''


def asset(route):
    path = urlsplit(route.request.url).path
    if path == '/audience.html':
        return route.fulfill(body=DOCUMENT, content_type='text/html')
    target = (ROOT / unquote(path).lstrip('/')).resolve()
    if target.is_relative_to(ROOT) and target.is_file():
        return route.fulfill(path=str(target), content_type=mimetypes.guess_type(target)[0] or 'application/octet-stream')
    route.fulfill(status=404, body='Missing fixture asset')


report = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    for width, height in [(1440, 1000), (390, 844)]:
        context = browser.new_context(viewport={'width': width, 'height': height})
        context.route(BASE+'/**', asset)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE+'/audience.html', wait_until='networkidle')
        page.wait_for_function('window.ready===true')
        picker = page.locator('[data-v32-theatre-audience]')
        people = page.locator('[data-v32-theatre-person]')
        assert people.count() == 100, 'The model excludes both people at sea'
        groups = page.locator('[data-v32-theatre-group]').evaluate_all('(els)=>els.map(e=>e.dataset.v32TheatreGroup)')
        assert {'Rolnicy', 'Piekarze', 'Tragarze', 'Profesorowie', 'Żołnierze', 'Bez przydziału'}.issubset(groups), groups
        assert page.evaluate('(a)=>JSON.stringify(a)===JSON.stringify([...a].sort(new Intl.Collator("pl",{numeric:true,sensitivity:"base"}).compare))', groups)
        expect(picker).not_to_have_attribute('open', '')
        picker.locator('summary').click()
        page.locator('[data-v32-theatre-group="Rolnicy"] [data-v32-theatre-person]').first.check()
        page.locator('[data-v32-theatre-group="Piekarze"] [data-v32-theatre-person]').first.check()
        page.locator('[data-v32-theatre-time]').fill('2026-11-15T14:30')
        expect(page.locator('[data-v32-theatre-cost]')).to_contain_text('Zaproszeni: 2 · pełny koszt: 4 monet')
        selected = people.evaluate_all('(els)=>els.filter(e=>e.checked).map(e=>e.dataset.v32TheatrePerson)')
        page.evaluate('window.cas()')
        expect(picker).to_have_attribute('open', '')
        assert people.evaluate_all('(els)=>els.filter(e=>e.checked).map(e=>e.dataset.v32TheatrePerson)') == selected
        assert page.locator('[data-v32-theatre-time]').input_value() == '2026-11-15T14:30'
        page.get_by_role('button', name='Zaplanuj przedstawienie', exact=True).click()
        assert page.evaluate('s.theatre.shows.length') == 1
        assert page.evaluate('s.theatre.shows[0].personUids.length') == 2
        assert page.evaluate('s.theatre.shows[0].coins') == 4
        assert page.evaluate('s.resources.coins') == 996
        assert page.evaluate('results.at(-1).ok') is True
        # Generation changes clear the draft, whereas an ordinary CAS does not.
        page.evaluate('window.reset()')
        assert people.evaluate_all('(els)=>els.filter(e=>e.checked).length') == 0
        expect(page.locator('[data-v32-theatre-all-cost]')).to_contain_text('100 osób · pełny koszt: 200 monet')
        page.get_by_role('button', name='Wyślij wszystkich', exact=True).click()
        assert page.evaluate('s.theatre.shows.length') == 1
        assert page.evaluate('s.theatre.shows[0].personUids.length') == 100
        assert page.evaluate('s.theatre.shows[0].coins') == 200
        assert page.evaluate('s.resources.coins') == 800
        assert page.evaluate('results.at(-1).ok') is True
        snapshot = page.evaluate('JSON.stringify(s.theatre.shows[0])')
        page.evaluate("s.residents[0].workplace='warehouse';window.cas()")
        assert page.evaluate('JSON.stringify(s.theatre.shows[0])') == snapshot, 'Confirmed audience and price stay frozen'
        expect(page.get_by_role('button', name='Wyślij wszystkich', exact=True)).to_be_disabled()
        assert page.evaluate('s.theatre.shows.length') == 1, 'Overlapping shows are rejected by the actual model quote'
        page.evaluate('window.reset(199)')
        expect(page.get_by_role('button', name='Wyślij wszystkich', exact=True)).to_be_disabled()
        expect(page.locator('[data-v32-theatre-all-cost]')).to_contain_text('brakuje monet')
        assert page.evaluate('s.theatre.shows.length') == 0
        assert page.evaluate('s.resources.coins') == 199
        picker.locator('summary').click()
        page.locator('[data-v32-theatre-group="Rolnicy"] [data-v32-theatre-person]').first.check()
        page.locator('[data-v32-theatre-group="Piekarze"] [data-v32-theatre-person]').first.check()
        page.get_by_role('button', name='Zaplanuj przedstawienie', exact=True).click()
        assert page.evaluate('s.theatre.shows[0].personUids.length') == 2
        assert page.evaluate('s.resources.coins') == 195
        assert page.locator('#island-dialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
        assert page.evaluate('localStorage.length') == 0 and page.evaluate('sessionStorage.length') == 0
        assert not errors, errors
        report.append({'width': width, 'eligible': 100, 'all_cost': 200, 'subset_cost': 4, 'groups': groups, 'cas_draft': True, 'new_generation_clears_draft': True, 'frozen_roster': True, 'model_limits': True, 'js_errors': errors})
        context.close()
    browser.close()
print(json.dumps(report, ensure_ascii=False))
print('PASS Theatre100: occupation groups, dropdown/CAS draft, all100=200, subset2=4, frozen roster, real overlap/funds checks; desktop/mobile.')
