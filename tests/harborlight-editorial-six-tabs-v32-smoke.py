"""Approved six-sheet copy is actually reachable, clean and bounded in Polish.

The literal expectations below come only from Tutorial, Budynki — opisy,
Budynki — informacje, Dolny pasek, Komunikaty and Przyciski. No workbook or
other uploaded-sheet content is read by this test, including in CI.
"""
import json
import mimetypes
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote,urlsplit

from playwright.sync_api import expect,sync_playwright
from helpers.browser_offers import dismiss_player_offers

SOURCE=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',SOURCE)).resolve()
BASE='http://127.0.0.1:47489'
OUTPUT=Path(os.environ.get('HARBORLIGHT_EDITORIAL_QA_OUTPUT','/tmp/harborlight-editorial-six-tabs-v32'))
OUTPUT.mkdir(parents=True,exist_ok=True)
BUILDINGS=['townhall','house','farm','lumber','quarry','windmill','sawmill','warehouse','bakery','dairy','slaughterhouse','fisher','leatherworks','academy','barracks','chapel','lighthouse','theatre','market','dock']
FISHER_MENU='Zatrudnij rybaków, by dostarczali ryby. To dodatkowe źródło pożywienia, które pomaga urozmaicać posiłki mieszkańców.'
PORT_MENU='Kupuj i sprzedawaj towary oraz wysyłaj statki między własnymi wyspami. Przed rejsem sprawdź czy na docelowej wyspie jest wystarczająco miejsca na nowych mieszkańców i towary.'
FOOD_SETTINGS='Tutaj ustawiasz priorytety i limity wydawanych porcji żywieniowych. W przypadku gdy objęty limitem produkt jest jedynym dostępnym jedzeniem zostanie wydany mieszkańcom jako gwarantowana porcja żywieniowa.'
FARM_BUTTONS={'farmGrain':'Przydziel do zbioru zboża','farmVegetables':'Przydziel do zbioru warzyw','farmLivestock':'Przydziel do produkcji żywca','farmMilk':'Przydziel do produkcji mleka'}
LEAK=re.compile(r'\{[^{}\n]+\}|\[object Object\]|\bundefined\b|\bNaN\b|\bniejasne\b|poł[ąa]cz\s+(?:linie|\d+\s+i\s+\d+)|\bpo\s+Tour\s*\d+|do potwierdzeni[ae].*lekcji|niebieskie.*czerwone|dostosuj\s+(?:sytosc|sytość|ze ser)|sytość do sprawdzenia|zjedzona sytosc brzmi dziwnie|Dopisek na kontach testowych:',re.I)
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import {createState} from './harborlight-v1-state.js';
import {APPROVED_TOUR_IDS,getTourCopy} from './harborlight-v1-approved-copy.js';
import {ADVISOR_INTRO_IDS} from './harborlight-v1-advisor-intro.js';
const now=Date.now(),make=onboarding=>{const s=createState(now,{ruleset:32,onboarding});s.settings.language='pl';s.islandName='Przystań redakcji';s.tutorial.autoOpenDisabled=true;for(const b of Object.values(s.buildings))b.level=6;s.capacity=216;s.highestTownhall=6;for(const id of Object.keys(s.resources))s.resources[id]=100000;s.education.discoveries.cheese=true;s.education.discoveries.cake=true;s.objective.repaired=true;return s};
const normal=make(false),tour=make(true);tour.onboarding.stage='tour';tour.onboarding.index=0;
const locked=createState(now,{ruleset:32});locked.settings.language='pl';locked.tutorial.autoOpenDisabled=true;
console.log(JSON.stringify({normal,tour,locked,ids:APPROVED_TOUR_IDS,activeIds:ADVISOR_INTRO_IDS,retainedCopy:Object.fromEntries(APPROVED_TOUR_IDS.map(id=>[id,getTourCopy(id,'pl')]))}));
"""],cwd=SOURCE))


def asset(route):
    file=(ROOT/unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if file.is_relative_to(ROOT) and file.is_file():
        route.fulfill(path=str(file),content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
    else:route.fulfill(status=404,body='Missing editorial QA asset')


def clean(text,where):
    leak=LEAK.search(text)
    assert not leak,(where,'Editorial note or raw placeholder displayed',leak.group(0) if leak else '',text)


def bounded(page,locator,where):
    expect(locator).to_be_visible()
    box=locator.bounding_box();v=page.viewport_size
    assert box and box['x']>=-1 and box['y']>=-1 and box['x']+box['width']<=v['width']+1 and box['y']+box['height']<=v['height']+1,(where,box,v)
    assert locator.evaluate('n=>n.scrollWidth<=n.clientWidth+1'),(where,'horizontal content overflow')


def open_page(browser,width,height,state,*,fixed_time=False):
    page=browser.new_page(viewport={'width':width,'height':height},has_touch=width<600,reduced_motion='reduce')
    page.set_default_timeout(12000);page.route(BASE+'/**',asset)
    errors=[];failed=[];writes=[]
    def read_only(route):
        if route.request.method != 'GET':
            writes.append((route.request.method,route.request.url));route.abort();return
        route.fallback()
    page.route('**/*',read_only)
    if fixed_time:page.clock.set_fixed_time(state['worldTimeMs']/1000)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:failed.append((r.status,r.url)) if r.status>=400 else None)
    page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(state))
    page.goto(BASE+'/harborlight-v1-layered.html?profile=new-player',wait_until='networkidle')
    page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"')
    dismiss_player_offers(page)
    return page,errors,failed,writes


report=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for width,height in [(1672,941),(1366,768),(390,844)]:
        mobile=width<600
        page,errors,failed,writes=open_page(browser,width,height,fixture['normal'])
        tooltips={}
        for category,identity,expected in [('economy','fisher',FISHER_MENU),('administration','dock',PORT_MENU)]:
            dismiss_player_offers(page)
            page.locator('[data-mobile-category="'+category+'"]' if mobile else '#hit-category-'+category).click()
            card=page.locator('[data-mobile-building="'+identity+'"]' if mobile else '[data-building-dock] [data-dock-building="'+identity+'"]')
            title=card.get_attribute('title') or ''
            assert ' '.join(title.split())==' '.join(expected.split()),(identity,title,expected)
            clean(title,'bottom tooltip '+identity);tooltips[identity]=title
        info_checked=[];labels_checked=[]
        for identity in BUILDINGS:
            page.locator('#hit-world-'+identity).evaluate('n=>n.click()')
            expect(page.locator('#island-dialog')).to_be_visible()
            details=page.locator('[data-building-information="'+identity+'"]')
            if details.count():
                details.locator('summary').click();info=details
            else:
                info=page.locator('[data-v32-panel="'+identity+'"] .v32-section').filter(has=page.get_by_role('heading',name='Zasady działania',exact=True))
            expect(info).to_be_visible()
            body=info.inner_text();assert len(body)>35,(identity,body);clean(body,'INFO '+identity)
            assert all(line.strip().lower() not in {'usuń','do zmiany','po piekarni','po zakładzie skórzanym'} for line in body.splitlines()),(identity,body)
            if identity=='house':
                assert 'Każdy poziom daje 36 łóżek.' in body and 'siedmiu niewydanych porcji dobowych' in body,body
            if identity=='academy':
                assert '3 + poziom Akademii' in body and 'po przeprowadzce na inną wyspę zachowuje poziom nauki' in body,body
                assert '100 punktów szczęścia przez tydzień' in body,body
            if identity=='bakery':
                expect(page.locator('.v32-building-description')).to_contain_text('Zatrudnij piekarzy, by wypiekali chleb i ciasto.')
            if identity=='farm':
                for recipe,label in FARM_BUTTONS.items():
                    button=page.locator('[data-v32-workers="'+recipe+'"]').locator('xpath=ancestor::form').locator('button[type="submit"]')
                    expect(button).to_have_text(label);button.scroll_into_view_if_needed()
                    assert button.bounding_box()['height']>=43.9,(recipe,button.bounding_box())
                    assert button.evaluate('n=>n.scrollWidth<=n.clientWidth+1&&n.scrollHeight<=n.clientHeight+1'),recipe
                    labels_checked.append(label)
                page.screenshot(path=str(OUTPUT/f'farm-buttons-{width}.png'))
            if identity=='warehouse':
                page.locator('[data-warehouse-section-toggle="feeding"]').click()
                feeding=page.locator('[data-warehouse-section="feeding"]')
                expect(feeding).to_contain_text(FOOD_SETTINGS);clean(feeding.inner_text(),'food settings')
            bounded(page,page.locator('#island-dialog'),'building '+identity)
            clean(page.locator('#island-dialog').inner_text(),'building '+identity)
            if identity in ['house','academy','barracks','theatre','warehouse']:
                page.screenshot(path=str(OUTPUT/f'info-{identity}-{width}.png'))
            info_checked.append(identity)
            page.locator('#island-dialog .dialog-close').click()
        assert not errors,errors
        assert not failed,failed
        assert not writes,writes
        page.close()

        # Follow the current 28-stop introduction to the same Farm pause point.
        # Saved progress still uses the original 56-entry catalogue (Farm=26).
        # A fixed test Date prevents ordinary play from changing the read-only
        # snapshot, while real layout/camera timers continue to run normally.
        page,errors,failed,writes=open_page(browser,width,height,fixture['tour'],fixed_time=True)
        guide=page.locator('[data-island-onboarding]')
        active_ids=fixture['activeIds']
        assert len(active_ids)==28 and len(fixture['ids'])==56
        farm_position=active_ids.index('building-farm')
        for identity in active_ids[:farm_position+1]:
            expect(guide).to_have_attribute('data-onboarding-step',identity)
            clean(page.locator('#island-onboarding-description').inner_text(),'initial tour '+identity)
            if identity!='building-farm':guide.locator('[data-onboarding-next]').click()
        guide.locator('[data-onboarding-exit]').click()
        expect(guide).to_have_count(0)
        page.locator('[data-close-tutorial-exit-reminder]').click()
        paused=page.evaluate('window.__HARBORLIGHT_DEV_STATE__.learning.tour')
        assert paused['paused'] and paused['index']==fixture['ids'].index('building-farm')==26,paused
        dismiss_player_offers(page)
        page.locator('[data-mobile-control="tutorial"]:visible,#hit-tutorial:visible').first.click()
        page.locator('[data-help-tour-from-start]').click()
        guide=page.locator('[data-onboarding-replay="true"]')
        tour_seen=[]
        frozen=page.evaluate('''()=>{const s=window.__HARBORLIGHT_DEV_STATE__;return {world:s.worldTimeMs,resources:s.resources,residents:s.residents,buildings:s.buildings,tutorial:s.tutorial}}''')
        for identity in active_ids:
            expect(guide).to_have_attribute('data-onboarding-step',identity)
            description=page.locator('#island-onboarding-description').inner_text();clean(description,'active tour '+identity)
            for selector in ['[data-onboarding-card]','[data-onboarding-next]','[data-onboarding-exit]','[data-onboarding-highlight]']:
                bounded(page,page.locator(selector),'active tour '+identity+' '+selector)
            if identity=='construction':assert '6 punktów sytości' in description,description
            if identity=='building-house':assert 'Każdy poziom daje 36 łóżek.' in description,description
            if identity in ['construction','building-house','building-farm']:
                page.screenshot(path=str(OUTPUT/f'tour28-{identity}-{width}.png'))
            tour_seen.append(identity)
            if identity!=active_ids[-1]:guide.locator('[data-onboarding-next]').click()
        assert page.evaluate('''()=>{const s=window.__HARBORLIGHT_DEV_STATE__;return {world:s.worldTimeMs,resources:s.resources,residents:s.residents,buildings:s.buildings,tutorial:s.tutorial}}''')==frozen
        # Removed stops remain in the reviewed catalogue. Their real Academy
        # and food-setting UI was checked above through ordinary building menus;
        # these source-copy checks do not claim they are active tour stops.
        start=fixture['ids'].index('construction');end=fixture['ids'].index('education')
        retained_seen=[]
        for identity in fixture['ids'][start:end+1]:
            description=fixture['retainedCopy'][identity]['text'];clean(description,'retained catalogue '+identity)
            if identity=='construction':assert '6 punktów sytości' in description,description
            if identity=='building-house':assert 'Każdy poziom daje 36 łóżek.' in description,description
            if identity=='education':assert 'Absolwent otrzymuje 100 punktów szczęścia na 7 dni' in description,description
            retained_seen.append(identity)
        assert not errors,errors
        assert not failed,failed
        assert not writes,writes
        page.close()

        page,errors,failed,writes=open_page(browser,width,height,fixture['locked'])
        page.locator('#hit-world-academy').evaluate('n=>n.click()')
        expect(page.locator('[data-building-locked]')).to_be_visible()
        text=page.locator('#island-dialog').inner_text();clean(text,'locked Academy')
        assert 'Ratusz' in text and '4' in text,text
        bounded(page,page.locator('#island-dialog'),'locked Academy')
        assert not errors,errors
        assert not failed,failed
        assert not writes,writes
        page.close()
        report.append({'width':width,'info_buildings':info_checked,'approved_tooltips':tooltips,'production_labels':labels_checked,'active_tour_steps':tour_seen,'retained_reviewed_catalogue_steps':retained_seen,'canonical_farm_pause_index':26,'notes_and_placeholders_absent':True,'locked_message_resolved':True,'horizontal_overflow':False,'tour_world_frozen':True,'network_writes':0,'current_28_stop_guide_opened_through_help':True})
    browser.close()
(OUTPUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
print('PASS six-sheet editorial UI: 20 reachable building INFOs, approved tooltips/actions/messages, no editorial notes/placeholders and bounded active28 tutorial copy and retained reviewed catalogue; canonical Farm26; 1672/1366/390.')
