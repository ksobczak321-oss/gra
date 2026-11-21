"""Actual legacy rosters and prayer/visit choices use roles without renaming saves."""
import json
import mimetypes
import os
from pathlib import Path
import subprocess
from urllib.parse import unquote,urlsplit

from playwright.sync_api import expect,sync_playwright
from helpers.browser_offers import dismiss_player_offers

SOURCE=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',SOURCE)).resolve()
BASE='http://127.0.0.1:47484'
OUTPUT=Path(os.environ.get('HARBORLIGHT_ROLE_OUTPUT','/tmp/harborlight-legacy-resident-labels-v32'))
OUTPUT.mkdir(parents=True,exist_ok=True)
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import {createState,normalizeState} from './harborlight-v1-state.js';
import {synchronizeResidents} from './harborlight-v1-residents.js';
import * as Education from './harborlight-v1-education.js';
import * as Military from './harborlight-v1-military.js';
import {warsawDayKey} from './harborlight-v1-calendar.js';
const now=Date.now(),s=createState(now,{ruleset:32});
for(const building of Object.values(s.buildings))building.level=Math.max(1,building.level);
for(const id of ['townhall','house','warehouse','lighthouse','chapel'])s.buildings[id].level=5;
s.population=100;s.capacity=180;synchronizeResidents(s);
// This fixed 100-person scenario already received its one-time starter gifts.
s.education.foundingGranted=true;s.military.foundingGranted=true;
s.welcomeWorkers.claimedDays=[warsawDayKey(now)];s.welcomeWorkers.granted=1;s.welcomeWorkers.pending=[];
s.islandName='Przystań Zawodów';s.settings.language='pl';s.tutorial.autoOpenDisabled=true;
s.engagementSchedule.initialCompleted=true;s.engagementSchedule.initialAnchored=true;s.engagementSchedule.nextAt=1e12;
s.objective.repaired=true;s.resources.coins=10000;s.resources.grain=10000;s.resources.vegetables=10000;
for(const p of s.residents){p.name='Mieszkaniec '+p.id;p.newbornRemaining=0;p.happiness=35;p.arrivalRemaining=0;p.returnRemaining=0;}
for(const [start,end,job] of [[0,10,'farm'],[10,20,'slaughterhouse'],[20,30,'bakery'],[30,36,'quarry'],[36,40,'warehouse']])for(let i=start;i<end;i++)s.residents[i].workplace=job;
for(const i of [40,41,46,47]){Education.importPersonEducation(s,s.residents[i],{profession:'professor',rounds:1});if(i<42)s.residents[i].workplace='academy';}
for(const [i,rank] of [[42,'soldier'],[43,'soldier'],[44,'officer']]){Military.importPersonMilitary(s,s.residents[i],{rank,trainedAt:1,restUntil:0});s.residents[i].workplace='barracks';}
for(const [id,b]of Object.entries(s.buildings))b.workers=s.residents.filter(p=>p.workplace===id).length;
console.log(JSON.stringify({state:normalizeState(s,now),prayerId:s.residents[47].id,prayerUid:s.residents[47].personUid,visitorIds:[s.residents[46].id,s.residents[79].id],visitorUids:[s.residents[46].personUid,s.residents[79].personUid]}));
"""],cwd=SOURCE))


def asset(route):
    file=(ROOT/unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if file.is_relative_to(ROOT) and file.is_file():
        route.fulfill(path=str(file),content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404,body='Missing resident-role fixture asset')


def open_building(page,identity,mobile):
    if mobile:
        page.locator('[data-mobile-category="administration"]').click()
        target=page.locator('[data-mobile-building="'+identity+'"]')
        # The live dock can rerender on a resource tick. Locator.click()
        # scrolls and reacquires the current control before the real click.
        target.click()
    else:
        page.locator('#hit-world-'+identity+' .map-hitshape').click()
    expect(page.locator('[data-building-panel="'+identity+'"]')).to_be_visible()


report=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for width,height,mobile in [(1440,1000,False),(390,844,True)]:
        page=browser.new_page(viewport={'width':width,'height':height},has_touch=mobile,reduced_motion='reduce')
        page.route(BASE+'/**',asset)
        errors=[];failed=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('response',lambda r:failed.append((r.status,r.url)) if r.status>=400 else None)
        page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(fixture['state']))
        page.goto(BASE+'/harborlight-v1-layered.html?profile=new-player',wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"')
        dismiss_player_offers(page)
        before=page.evaluate('window.__HARBORLIGHT_DEV_STATE__.residents.map(p=>({id:p.id,uid:p.personUid,name:p.name}))')
        assert len(before)==100,{'actual':len(before),'fixture':len(fixture['state']['residents']),'last':before[-4:]}
        if mobile:
            page.locator('.mobile-island-menu').click()
            page.locator('#island-dialog').get_by_role('button',name='Mieszkańcy',exact=True).click()
        else:
            page.locator('#hit-population').click()
        page.locator('[data-resident-roster] summary').click()
        expect(page.locator('[data-resident-id]')).to_have_count(100)
        groups=page.locator('[data-resident-group]').evaluate_all('nodes=>nodes.map(n=>({key:n.dataset.residentGroup,title:n.querySelector("h4")?.textContent,count:n.querySelectorAll("[data-resident-id]").length}))')
        by_group={row['key']:row for row in groups}
        assert by_group['workplace:farm']['count']==10 and 'Gospodarstwa' in by_group['workplace:farm']['title'],groups
        assert by_group['workplace:slaughterhouse']['count']==10 and 'Rzeźni' in by_group['workplace:slaughterhouse']['title'],groups
        assert by_group['professors']['count']==4 and 'Profesorowie' in by_group['professors']['title'],groups
        assert 'Wolni w Domu' in by_group['home']['title'],groups
        names=page.locator('[data-resident-name]').all_text_contents()
        assert not any('Mieszkaniec' in name for name in names),names
        assert {'Profesor 1','Profesor 2','Profesor 3','Profesor 4','Rolnik 1','Pracownik Rzeźni 1'}.issubset(set(names)),names
        page.screenshot(path=str(OUTPUT/f'roster-{width}.png'))
        page.locator('#island-dialog .dialog-close').click()

        open_building(page,'house',mobile)
        prayer=page.locator('[data-prayer-resident]')
        prayer_groups=prayer.locator('optgroup').evaluate_all('nodes=>nodes.map(n=>n.label)')
        assert {'Wolni w Domu','Profesorowie'}.issubset(set(prayer_groups)),prayer_groups
        assert prayer.locator('option[value="'+str(fixture['prayerId'])+'"]').inner_text()=='Profesor 4'
        assert not any('Mieszkaniec' in label for label in prayer.locator('option').all_text_contents())
        prayer.select_option(str(fixture['prayerId']))
        page.locator('[data-prayer-start]').click()
        page.wait_for_function('id=>window.__HARBORLIGHT_DEV_STATE__.residents.find(p=>p.id===id)?.prayerRemaining>0',arg=fixture['prayerId'])
        expect(page.locator('[data-prayer-active="'+str(fixture['prayerId'])+'"]')).to_contain_text('Profesor 4')
        prayed=page.evaluate('id=>window.__HARBORLIGHT_DEV_STATE__.residents.find(p=>p.id===id)',fixture['prayerId'])
        assert prayed['personUid']==fixture['prayerUid']
        page.locator('#island-dialog .dialog-close').click()

        open_building(page,'lighthouse',mobile)
        page.locator('#island-dialog').get_by_role('button',name='Zwiedzanie latarni',exact=True).click()
        visit_groups=page.locator('[data-resident-choice-group]').evaluate_all('nodes=>nodes.map(n=>n.dataset.residentChoiceGroup)')
        assert {'home','professors'}.issubset(set(visit_groups)),visit_groups
        assert not any('Mieszkaniec' in label for label in page.locator('.visit-resident-picker label').all_text_contents())
        expect(page.locator('.visit-resident-picker input[value="'+str(fixture['visitorIds'][0])+'"]').locator('xpath=ancestor::label')).to_contain_text('Profesor 3')
        for identity in fixture['visitorIds']:
            page.locator('.visit-resident-picker input[value="'+str(identity)+'"]').check()
        page.locator('[data-send-visit]').click()
        page.wait_for_function('window.__HARBORLIGHT_DEV_STATE__.lighthouseVisits.length===1')
        sent=page.evaluate('window.__HARBORLIGHT_DEV_STATE__.lighthouseVisits[0].residentIds')
        assert set(sent)==set(fixture['visitorIds']),sent
        after=page.evaluate('window.__HARBORLIGHT_DEV_STATE__.residents.map(p=>({id:p.id,uid:p.personUid,name:p.name}))')
        assert after==before,'Presentational role labels renamed a saved resident or changed an identity'
        assert page.locator('#island-dialog .dialog-body').evaluate('n=>n.scrollWidth<=n.clientWidth+1')
        assert not errors,errors
        assert not failed,failed
        report.append({'width':width,'residents':100,'groups':groups,'prayer_groups':prayer_groups,'visitor_groups':visit_groups,'prayer_and_visit_identities_preserved':True,'saved_names_unchanged':True,'errors':errors})
        page.close()
    browser.close()
(OUTPUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
print('PASS legacy resident roles: grouped 100-person roster, prayer and Lighthouse visitors use role names, exact selected identities and unchanged saved names; desktop/mobile.')
