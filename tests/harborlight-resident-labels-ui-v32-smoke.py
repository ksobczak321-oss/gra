"""Role labels/grouped selects keep the exact resident UIDs in new building actions."""
import json,mimetypes,os
from pathlib import Path
from urllib.parse import unquote,urlsplit
from playwright.sync_api import sync_playwright
SOURCE=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',SOURCE)).resolve()
BASE='http://127.0.0.1:47458'
DOCUMENT='''<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/harborlight-v1-play.css"><link rel="stylesheet" href="/harborlight-v1-development.css"><style>body{margin:0;background:#092b3b;font-family:Inter,system-ui,sans-serif}#island-dialog{display:block}#island-dialog .dialog-body{padding:16px}</style><dialog open id="island-dialog"><div class="dialog-body" id="body"></div></dialog><script type="module">
import {createState} from '/harborlight-v1-state.js';
import {synchronizeResidents} from '/harborlight-v1-residents.js';
import * as Education from '/harborlight-v1-education.js';
import * as Military from '/harborlight-v1-military.js';
import * as Theatre from '/harborlight-v1-theatre.js';
import * as Provisions from '/harborlight-v1-provisions.js';
import {renderAcademyControls,renderBarracksControls,renderTheatreControls} from '/harborlight-v1-development-ui.js';
window.s=createState(Date.parse('2026-11-15T12:00:00Z'),{ruleset:32});
s.buildings.townhall.level=5;s.buildings.house.level=5;s.buildings.warehouse.level=5;s.buildings.academy.level=1;s.buildings.barracks.level=1;s.population=100;s.capacity=180;synchronizeResidents(s);s.resources.coins=5000;s.resources.militaryClothes=100;s.resources.professorRobes=10;
for(const p of s.residents)p.name=`Mieszkaniec ${p.id}`;
for(let i=0;i<10;i++)s.residents[i].workplace='farm';
for(let i=10;i<20;i++)s.residents[i].workplace='bakery';
for(let i=20;i<30;i++)s.residents[i].workplace='quarry';
for(let i=30;i<38;i++)s.residents[i].workplace='warehouse';
for(let i=38;i<40;i++){Education.importPersonEducation(s,s.residents[i],{profession:'professor',rounds:1});s.residents[i].workplace='academy';}
for(let i=40;i<43;i++){Military.importPersonMilitary(s,s.residents[i],{rank:i===42?'officer':'soldier',trainedAt:1,restUntil:0});s.residents[i].workplace='barracks';}
for(let i=43;i<49;i++)s.residents[i].workplace='slaughterhouse';
window.expected={teacher:s.residents[38].personUid,researcher:s.residents[39].personUid,student:s.residents[79].personUid,instructor:s.residents[40].personUid,recruit:s.residents[89].personUid,baker:s.residents[10].personUid,quarry:s.residents[20].personUid};
window.actions=[];window.mode='academy';
window.options={getState:()=>s,onAction:action=>{actions.push(structuredClone(action));return action.type.startsWith('education')?Education.educationAction(s,action,{now:s.worldTimeMs}):action.type.startsWith('military')?Military.militaryAction(s,action,{now:s.worldTimeMs}):Theatre.theatreAction(s,action,{now:s.worldTimeMs});},onRefresh:()=>mount(mode),context:{education:Education,military:Military,provisions:Provisions,theatreScheduleActionType:'theatrePlanShow',theatreStatus:()=>Theatre.theatreStatus(s,{now:s.worldTimeMs}),theatreShowQuote:(world,action)=>Theatre.theatreShowQuote(world,action,{now:s.worldTimeMs})}};
window.mount=kind=>{window.mode=kind;document.querySelector('#body').replaceChildren(kind==='academy'?renderAcademyControls(options):kind==='barracks'?renderBarracksControls(options):renderTheatreControls(options));};window.mount('academy');window.ready=true;
</script></html>'''
def asset(route):
 path=urlsplit(route.request.url).path
 if path=='/labels.html':return route.fulfill(body=DOCUMENT,content_type='text/html')
 file=(ROOT/unquote(path).lstrip('/')).resolve()
 if file.is_relative_to(ROOT) and file.is_file():route.fulfill(path=str(file),content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
 else:route.fulfill(status=404,body='Missing source asset')
reports=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 for width,height in [(1440,1000),(390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height});page.route(BASE+'/**',asset)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE+'/labels.html',wait_until='networkidle');page.wait_for_function('window.ready===true')
  expected=page.evaluate('expected')
  enrollment=page.get_by_role('button',name='Zapisz na kurs',exact=True).locator('xpath=ancestor::form')
  selects=enrollment.locator('select')
  assert selects.nth(1).locator('optgroup').count()>=1
  assert selects.nth(1).locator('option:not([value=""])').all_text_contents()==['Profesor 1','Profesor 2']
  assert all('Mieszkaniec' not in x for x in page.locator('[data-v32-academy] input[type=checkbox]').locator('xpath=ancestor::label').all_text_contents())
  selects.nth(0).select_option(expected['student']);selects.nth(1).select_option(expected['teacher'])
  enrollment.get_by_role('button',name='Zapisz na kurs',exact=True).click()
  assert page.evaluate('s.education.courses[0].studentUid')==expected['student']
  assert page.evaluate('s.education.courses[0].teacherUid')==expected['teacher']
  remaining_teacher=page.get_by_role('button',name='Zapisz na kurs',exact=True).locator('xpath=ancestor::form').locator('select').nth(1)
  assert remaining_teacher.locator('option:not([value=""])').all_text_contents()==['Profesor 2'],'filtering busy teachers must not renumber Profesor2'
  assert 'Adept 1' in page.locator('[data-v32-academy] .v32-card>strong').all_text_contents()
  assert page.evaluate('s.residents.find(p=>p.personUid===expected.teacher).name')=='Mieszkaniec 39','presentation must not rename the saved person'
  research=page.get_by_role('button',name='Rozpocznij badanie',exact=True).locator('xpath=ancestor::form')
  research.locator('select').select_option('lumber')
  research.locator('input[type=checkbox][value="'+expected['researcher']+'"]').check()
  research.get_by_role('button',name='Rozpocznij badanie',exact=True).click()
  assert page.evaluate('s.education.researches[0].professorUids')==[expected['researcher']]
  page.evaluate('mount("barracks")')
  recruitment=page.get_by_role('button',name='Rozpocznij szkolenie rekruta',exact=True).locator('xpath=ancestor::form')
  assert recruitment.locator('select').nth(0).locator('optgroup').count()>=1
  instructor_names=recruitment.locator('select').nth(1).locator('option:not([value=""])').all_text_contents()
  assert any(x.startswith('Żołnierz ') for x in instructor_names) and any(x.startswith('Oficer ') for x in instructor_names),instructor_names
  recruitment.locator('select').nth(0).select_option(expected['recruit']);recruitment.locator('select').nth(1).select_option(expected['instructor'])
  recruitment.get_by_role('button',name='Rozpocznij szkolenie rekruta',exact=True).click()
  assert page.evaluate('s.military.courses[0].studentUid')==expected['recruit']
  assert page.evaluate('s.military.courses[0].instructorUid')==expected['instructor']
  page.evaluate('mount("theatre")')
  groups=page.locator('[data-v32-theatre-group]').evaluate_all('(els)=>els.map(e=>e.dataset.v32TheatreGroup)')
  labels=page.locator('[data-v32-theatre-person]').locator('xpath=ancestor::label').all_text_contents()
  assert len(labels)==100 and not any('Mieszkaniec' in label for label in labels)
  assert {'Profesor 1','Profesor 2'}.issubset(set(labels)),labels
  assert any('Piekarz 1' in label for label in labels) and any('Kamieniarz 1' in label for label in labels)
  assert 'Pracownicy Rzeźni' in groups and any(label=='Pracownik Rzeźni 1' for label in labels)
  page.locator('[data-v32-theatre-audience] summary').click()
  page.locator('[data-v32-theatre-person="'+expected['baker']+'"]').check()
  page.locator('[data-v32-theatre-person="'+expected['quarry']+'"]').check()
  page.get_by_role('button',name='Zaplanuj przedstawienie',exact=True).click()
  assert set(page.evaluate('s.theatre.shows[0].personUids'))=={expected['baker'],expected['quarry']}
  assert page.evaluate('s.theatre.shows[0].coins')==4
  assert page.locator('#island-dialog .dialog-body').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
  assert not errors,errors
  reports.append({'width':width,'people':100,'professor_labels':['Profesor 1','Profesor 2'],'groups':groups,'teacher_research_recruit_and_theatre_uids_preserved':True,'errors':errors})
  page.close()
 browser.close()
print(json.dumps(reports,ensure_ascii=False))
print('PASS grouped role labels: 100 actual people, professors1/2 across Academy/research/Theatre, grouped native selects, soldiers/officers, unchanged UIDs in four real actions; desktop/mobile.')
