"""Kingdom resident groups and role labels preserve selected immutable identities."""
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
BASE = 'http://127.0.0.1:47453'
DOCUMENT = '''<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/harborlight-v1-play.css"><style>body{margin:0;background:#0c293a}#island-dialog{display:block}</style><dialog open id="island-dialog"><section class="dialog-body" id="body"></section></dialog><script type="module">
import {createState} from '/harborlight-v1-state.js';
import * as Education from '/harborlight-v1-education.js';
import * as Military from '/harborlight-v1-military.js';
import {createKingdomPanel} from '/harborlight-v1-kingdom-ui.js';
const now=Date.parse('2026-11-15T12:00:00Z');
window.world=createState(now,{ruleset:32});world.buildings.townhall.level=5;world.buildings.academy.level=1;world.buildings.barracks.level=1;world.islandName='Wyspa pierwsza';
for(const index of [0,3]){Education.importPersonEducation(world,world.residents[index],{profession:'professor',rounds:1});world.residents[index].workplace='academy';}
for(const [index,rank] of [[1,'soldier'],[2,'officer']]){Military.importPersonMilitary(world,world.residents[index],{rank,trainedAt:1,restUntil:0});world.residents[index].workplace='barracks';}
window.second=structuredClone(world);second.islandId='island-2';second.islandName='Wyspa druga';
const newEducation={},newMilitary={};for(const person of second.residents){const old=person.personUid;person.personUid='island-2:resident-'+person.id;if(second.education.people[old])newEducation[person.personUid]=second.education.people[old];if(second.military.people[old])newMilitary[person.personUid]=second.military.people[old];}second.education.people=newEducation;second.military.people=newMilitary;
const task=(id,kind)=>({id,kind,title:kind==='professor'?'Profesor dla Królestwa':'Oddział dla Królestwa',status:'active',acceptedAt:now,deadline:now+86400000,remaining:{goods:{},...(kind==='professor'?{professors:1}:{soldiers:1,officers:1})},requirements:{goods:{}},reward:{coins:10},participants:[],allianceAllowed:false});
window.actions=[];const status={offers:[],tasks:[task('professor-task','professor'),task('army-task','army')],events:[]};
window.panel=createKingdomPanel({state:world,getState:()=>world,getStatus:()=>status,language:'pl',context:()=>({now,worlds:[world,second],eligiblePeople:(w,kind)=>(w.residents||[]).filter(p=>kind==='professor'?w.education.people[p.personUid]?.profession==='professor':w.military.people[p.personUid]?.rank).map(p=>kind==='professor'?{personUid:p.personUid,id:p.id,name:'Mieszkaniec '+p.id}:p.personUid)}),onAction:action=>{actions.push(action);return{ok:true,message:'Zapis testowy'};}});
document.querySelector('#body').append(panel.element);window.ready=true;
</script></html>'''


def asset(route):
    path = urlsplit(route.request.url).path
    if path == '/kingdom-labels.html':
        return route.fulfill(body=DOCUMENT, content_type='text/html')
    target = (ROOT / unquote(path).lstrip('/')).resolve()
    if target.is_relative_to(ROOT) and target.is_file():
        return route.fulfill(path=str(target), content_type=mimetypes.guess_type(target)[0] or 'application/octet-stream')
    route.fulfill(status=404, body='Missing fixture asset')


report = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    for width, height in [(1440, 1000), (390, 844)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        page.route(BASE + '/**', asset)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + '/kingdom-labels.html', wait_until='networkidle')
        page.wait_for_function('window.ready === true')
        page.get_by_role('button', name='Zadania (2)', exact=True).click()
        professor_picker = page.locator('[data-kingdom-person-picker="professor"]')
        professor_labels = professor_picker.locator('label').all_text_contents()
        assert professor_labels == ['Profesor 1', 'Profesor 2'], professor_labels
        assert professor_picker.locator('[data-resident-group]').count() > 0
        second_professor_uid = page.evaluate('world.residents[3].personUid')
        professor_picker.get_by_role('radio', name='Profesor 2', exact=True).check()
        page.evaluate('panel.update()')
        expect(professor_picker.get_by_role('radio', name='Profesor 2', exact=True)).to_be_checked()
        page.get_by_role('button', name='Przekaż profesora', exact=True).click()
        page.locator('[data-confirm]').click()
        page.wait_for_function('actions.length === 1')
        professor_action = page.evaluate('actions[0]')
        assert professor_action['personId'] == second_professor_uid
        assert professor_action['worldId'] == 'island-1'
        assert professor_action['type'] == 'kingdomHandOverProfessor'

        soldier_picker = page.locator('[data-kingdom-person-picker="soldier"]')
        labels = soldier_picker.locator('label').all_text_contents()
        assert set(labels) == {'Żołnierz 1', 'Oficer 1'}, labels
        for role in labels:
            soldier_picker.get_by_role('checkbox', name=role, exact=True).check()
        page.evaluate('panel.update()')
        assert soldier_picker.locator('input:checked').count() == 2
        page.get_by_role('button', name='Wyślij wybranych', exact=True).click()
        page.locator('[data-confirm]').click()
        page.wait_for_function('actions.length === 2')
        army_action = page.evaluate('actions[1]')
        expected_uids = page.evaluate('[world.residents[1].personUid,world.residents[2].personUid]')
        assert set(army_action['ids']) == set(expected_uids)
        assert army_action['type'] == 'kingdomDispatchArmy'

        professor_card = page.locator('[data-card-id="professor-task"]')
        professor_card.locator('select').select_option('island-2')
        switched = professor_card.locator('[data-kingdom-person-picker="professor"]')
        assert switched.locator('label').all_text_contents() == ['Profesor 1', 'Profesor 2']
        assert all(value.startswith('island-2:') for value in switched.locator('input').evaluate_all('nodes=>nodes.map(node=>node.value)'))
        assert switched.locator('[data-resident-group]').count() == professor_picker.locator('[data-resident-group]').count()
        assert 'Mieszkaniec' not in page.locator('.hl-kingdom-body').inner_text()
        assert page.locator('#island-dialog .dialog-body').evaluate('node=>node.scrollWidth <= node.clientWidth + 1')
        assert not errors, errors
        report.append({'width': width, 'professors': professor_labels, 'soldiers': labels, 'draft_preserved': True, 'immutable_uid_actions': True, 'world_switch': True, 'errors': errors})
        page.close()
    browser.close()
print(json.dumps(report, ensure_ascii=False))
print('PASS Kingdom labels: grouped professions, role numbering, selected UID/drafts and island switch remain exact on desktop/mobile.')
