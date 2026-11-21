"""Advisor hierarchy and async presentation; no game, account or clock writes.

Real UI/CSS consume an independent, explicit plan fixture. The separate game
smoke covers the live model/Worker and map-to-control integration.
"""
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import expect, sync_playwright

SOURCE=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',SOURCE)).resolve()
OUT=Path(os.environ.get('HARBORLIGHT_TEST_OUTPUT','/tmp/harborlight-advisor-layout'))
OUT.mkdir(parents=True,exist_ok=True)
BASE='http://127.0.0.1:47492'

def asset(route):
    assert route.request.method=='GET', 'UI presentation attempted an external mutation'
    path=unquote(urlsplit(route.request.url).path)
    if path=='/advisor-layout.html':
        route.fulfill(status=200,content_type='text/html',body='<!doctype html><html lang="pl"><head><link rel="stylesheet" href="harborlight-v1-advisor.css"></head><body style="background:#123449"><button id="map-building">Budynek na mapie</button></body></html>')
        return
    file=(ROOT/path.lstrip('/')).resolve()
    assert file.is_relative_to(ROOT) and file.is_file(), path
    route.fulfill(path=str(file),content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')

def bounded(page,selector):
    item=page.locator(selector)
    expect(item).to_be_visible()
    box=item.bounding_box();view=page.viewport_size
    assert box and box['width']>0 and box['height']>0,(selector,box)
    assert box['x']>=-1 and box['y']>=-1,(selector,box)
    assert box['x']+box['width']<=view['width']+1,(selector,box,view)
    assert box['y']+box['height']<=view['height']+1,(selector,box,view)

reports=[]
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for width,height in [(1440,1000),(390,844),(320,568),(390,350)]:
        context=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce')
        context.route(BASE+'/**',asset)
        page=context.new_page();errors=[];writes=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda request:writes.append(request.url) if request.method!='GET' else None)
        page.goto(BASE+'/advisor-layout.html',wait_until='networkidle')
        page.evaluate('''async () => {
          const {createKingdomAdvisor}=await import('/harborlight-v1-advisor-ui.js');
          const f=window.fixture={language:'pl',listeners:new Set(),asks:[],cheapCalls:0,queries:0,navCalls:[],navMode:'pending',unsubscribed:0,mapClicks:0};
          document.querySelector('#map-building').onclick=()=>f.mapClicks++;
          f.makePlan=(number=2,english=false)=>{
            const row=(id,text,target,action,why)=>({id,text,target,why,guidance:{action,resourceId:id.startsWith('wood')?'wood':'stone',targetCount:1}});
            return {taskId:'townhall-'+number,kind:'upgrade',goal:'townhall',targetLevel:number,tracking:null,title:english?'Upgrade the Town Hall to level '+number:'Rozbuduj Ratusz do poziomu '+number,
              text:english?'I suggest upgrading the Town Hall, because it enables further island development.':'Sugeruję rozbudować Ratusz, bo otwiera dalszy rozwój wyspy.',
              why:english?'Production must create the goods before carriers can collect and deliver them.':'Produkcja musi wytworzyć towary, zanim tragarze je odbiorą i dostarczą.',
              explanation:english?'Every task is shown. The resource and transport order is preserved.':'Widać wszystkie zadania. Kolejność produkcji i transportu jest zachowana.',
              tasks:[{id:'wood',title:english?'Prepare wood':'Przygotuj drewno',status:'ready',parallelGroup:'materials',dependsOn:[],howTo:[
                row('wood-staff',english?'Assign a lumberjack.':'Przydziel drwala.','lumber','assign-workers',english?'A worker must reach the producer first.':'Pracownik musi najpierw dotrzeć do producenta.'),
                row('wood-produce',english?'Produce the missing wood.':'Wyprodukuj brakujące drewno.','lumber','inspect',english?'Carriers can collect only finished goods.':'Tragarze mogą odbierać tylko gotowe towary.'),
                row('wood-collect',english?'Collect the finished wood.':'Odbierz gotowe drewno.','warehouse','transport-priority',english?'Collection follows production.':'Odbiór następuje po produkcji.')
              ]},{id:'stone',title:english?'Prepare stone':'Przygotuj kamień',status:'ready',parallelGroup:'materials',dependsOn:[],howTo:[
                row('stone-staff',english?'Assign a quarry worker.':'Przydziel kamieniarza.','quarry','assign-workers',english?'This can run alongside wood production.':'Można to robić równolegle z produkcją drewna.'),
                row('stone-produce',english?'Produce the missing stone.':'Wyprodukuj brakujący kamień.','quarry','inspect',english?'The missing material must first exist.':'Brakujący materiał trzeba najpierw wytworzyć.'),
                row('stone-collect',english?'Collect the finished stone.':'Odbierz gotowy kamień.','warehouse','transport-priority',english?'Collection follows production.':'Odbiór następuje po produkcji.')
              ]},{id:'supply',title:english?'Supply the upgrade':'Dostarcz materiały do budowy',status:'waiting',parallelGroup:'construction',dependsOn:['wood','stone'],howTo:[
                row('supply-carriers',english?'Check carrier staffing.':'Sprawdź obsadę tragarzy.','warehouse','assign-workers',english?'Deliveries require a carrier.':'Dostawa wymaga tragarza.'),
                row('supply-priority',english?'Set construction delivery priority.':'Ustaw priorytet dostawy do budowy.','warehouse','transport-priority',english?'Priorities decide which available goods move first.':'Priorytety określają kolejność przewozu dostępnych towarów.'),
                row('supply-review',english?'Review the upgrade cost.':'Sprawdź koszt rozbudowy.','townhall','inspect',english?'The current price is confirmed in the building.':'Aktualną cenę potwierdzisz w budynku.'),
                row('supply-order',english?'Order the funded upgrade.':'Zleć rozbudowę po zgromadzeniu materiałów.','townhall','upgrade',english?'Ordering follows preparation of the materials.':'Zlecenie następuje po przygotowaniu materiałów.')
              ]}]};
          };
          f.plan=f.makePlan();f.status={phase:'ready',computedAt:performance.now(),nextRunAt:performance.now()+120000};
          f.publish=(plan,status)=>{f.plan=plan;f.status=status;for(const fn of f.listeners)fn(plan,status);};
          f.ui=createKingdomAdvisor({getState:()=>({}),getLanguage:()=>f.language,getCachedPlan:()=>f.plan,getPlanningStatus:()=>f.status,
            subscribePlan:listener=>{f.listeners.add(listener);return()=>{f.listeners.delete(listener);f.unsubscribed++;};},
            getSuggestion:()=>{f.cheapCalls++;throw Error('Unexpected cheap recomputation with a valid cached plan');},
            getPlan:(input,options)=>{f.queries++;f.status={...f.status,phase:'computing'};for(const fn of f.listeners)fn(f.plan,f.status);return new Promise((resolve,reject)=>f.asks.push({input,options,resolve,reject}));},
            onNavigate:step=>{f.navCalls.push(step);if(f.navMode==='good'){document.querySelector('#map-building').focus();return true;}return new Promise(resolve=>f.resolveNavigation=resolve);}});
          f.ui.open();
        }''')
        bounded(page,'[data-advisor-conversation]')
        bounded(page,'[data-advisor-input]')
        bounded(page,'[data-advisor-send]')
        bounded(page,'[data-advisor-close]')
        expect(page.locator('[data-advisor-main-goal] h3')).to_have_count(1)
        expect(page.locator('[data-advisor-main-goal] h3')).to_have_text('Rozbuduj Ratusz do poziomu 2')
        expect(page.locator('[data-advisor-main-goal]')).to_contain_text('Cześć! Oto moja propozycja:')
        expect(page.locator('[data-advisor-choice]')).to_have_text('To tylko propozycja — możesz wybrać inną drogę.')
        expect(page.locator('[data-advisor-goal-why]')).not_to_be_visible()
        expect(page.locator('[data-advisor-plan-context]')).to_have_text('Sugeruję rozbudować Ratusz, bo otwiera dalszy rozwój wyspy.')
        expect(page.locator('[data-advisor-hint]')).to_have_text('Cześć! Sugeruję rozbudować Ratusz, bo otwiera dalszy rozwój wyspy.')
        expect(page.locator('[data-advisor-hint]')).not_to_contain_text('Produkcja musi wytworzyć towary')
        page.locator('[data-advisor-why]').click()
        expect(page.locator('[data-advisor-goal-why]')).to_be_visible()
        page.locator('[data-advisor-why]').click()
        cards=page.locator('[data-advisor-task-card]')
        expect(cards).to_have_count(3)
        first,second=cards.nth(0).bounding_box(),cards.nth(1).bounding_box()
        assert abs(first['y']-second['y'])<2 and second['x']>first['x'], 'Parallel cards are not side by side'
        expect(page.locator('[data-advisor-task-group]')).to_have_count(3)
        expect(page.locator('[data-advisor-howto-step]')).to_have_count(10)
        expect(page.locator('[data-advisor-step-why]')).to_have_count(10)
        assert page.locator('[data-advisor-task-group][hidden], [data-advisor-howto-step][hidden]').count()==0
        order=page.locator('[data-advisor-howto-step]').evaluate_all('(items)=>items.map(item=>item.dataset.advisorHowtoStep)')
        assert order.index('wood:wood-produce')<order.index('wood:wood-collect')<order.index('supply:supply-order')
        expect(page.locator('[data-advisor-dependencies]')).to_contain_text('Przygotuj drewno, Przygotuj kamień')
        cards.nth(2).click()
        expect(cards.nth(2)).to_have_attribute('aria-pressed','true')
        expect(page.locator('[data-advisor-howto-step]')).to_have_count(10)
        # Selecting a card emphasizes an anchor; it never hides another task.
        assert page.locator('[data-advisor-task-group][hidden]').count()==0
        user_input=page.locator('[data-advisor-input]')
        user_input.fill('Mój niedokończony wpis')
        user_input.evaluate('(input)=>window.originalAdvisorInput=input')
        page.evaluate('''() => {const f=fixture;f.publish(f.plan,{...f.status,phase:'computing'});for(let i=0;i<20;i++)f.ui.update(true);}''')
        expect(page.locator('[data-advisor-planning-status]')).to_contain_text('Możesz dalej grać')
        assert page.evaluate('fixture.queries')==0
        assert page.evaluate('fixture.cheapCalls')==0
        expect(page.locator('[data-advisor-live-status]')).to_have_text('')
        expect(user_input).to_have_value('Mój niedokończony wpis')
        expect(user_input).to_be_focused()
        assert user_input.evaluate('(input)=>input===window.originalAdvisorInput')
        page.evaluate('''() => {const f=fixture;f.publish({...f.plan,topicSummary:'Dostępni mieszkańcy: 18.'},{...f.status,phase:'ready',computedAt:performance.now()});}''')
        expect(cards.nth(2)).to_have_attribute('aria-pressed','true')
        expect(page.locator('[data-advisor-topic-answer]')).to_contain_text('Dostępni mieszkańcy: 18.')
        expect(page.locator('[data-advisor-main-goal] h3')).to_have_text('Rozbuduj Ratusz do poziomu 2')
        expect(user_input).to_be_focused()
        expect(page.locator('[data-advisor-planning-status]')).to_contain_text('Ostatnia aktualizacja')
        expect(page.locator('[data-advisor-live-status]')).to_have_text('')
        user_input.fill('Chcę rozbudować Port')
        user_input.press('Enter')
        expect(page.locator('[data-advisor-answer]')).to_have_attribute('aria-busy','true')
        user_input.fill('Chcę rozbudować Ratusz')
        user_input.press('Enter')
        assert page.evaluate('fixture.queries')==2
        page.evaluate('''() => {const f=fixture;f.asks[0].resolve({...f.makePlan(),title:'NIEAKTUALNY PORT'});}''')
        expect(page.locator('[data-advisor-main-goal] h3')).not_to_have_text('NIEAKTUALNY PORT')
        user_input.fill('Nadal piszę')
        page.evaluate('''() => {const f=fixture,next=f.makePlan(3);f.publish(next,{...f.status,phase:'ready',computedAt:performance.now()});f.asks[1].resolve(next);}''')
        expect(page.locator('[data-advisor-main-goal] h3')).to_have_text('Rozbuduj Ratusz do poziomu 3')
        expect(page.locator('[data-advisor-answer]')).to_have_attribute('aria-busy','false')
        expect(user_input).to_have_value('Nadal piszę')
        page.locator('[data-advisor-current]').click()
        assert page.evaluate('fixture.asks[2].input')==''
        assert page.evaluate('fixture.asks[2].options.goal===null&&fixture.asks[2].options.targetLevel===null&&fixture.asks[2].options.topic===null')
        page.evaluate('''() => {const f=fixture,next=f.makePlan(3);f.publish(next,{...f.status,phase:'ready',computedAt:performance.now()});f.asks[2].resolve(next);}''')
        expect(page.locator('[data-advisor-answer]')).to_have_attribute('aria-busy','false')
        expect(user_input).to_have_value('Nadal piszę')
        # An automatically chosen goal is not promoted to an explicit player
        # commitment merely because they ask why or review transport.
        user_input.fill('Dlaczego?')
        user_input.press('Enter')
        assert page.evaluate('fixture.asks[3].options.goal===null&&fixture.asks[3].options.targetLevel===null')
        page.evaluate('''() => {const f=fixture,next=f.makePlan(3);f.publish(next,{...f.status,phase:'ready',computedAt:performance.now()});f.asks[3].resolve(next);}''')
        expect(page.locator('[data-advisor-answer]')).to_have_attribute('aria-busy','false')
        user_input.fill('Priorytety transportu')
        user_input.press('Enter')
        assert page.evaluate('fixture.asks[4].options.goal===null&&fixture.asks[4].options.targetLevel===null')
        page.evaluate('''() => {const f=fixture,next=f.makePlan(3);f.publish(next,{...f.status,phase:'ready',computedAt:performance.now()});f.asks[4].resolve(next);}''')
        expect(page.locator('[data-advisor-answer]')).to_have_attribute('aria-busy','false')
        user_input.fill('Chcę rozbudować Port')
        user_input.press('Enter')
        assert page.evaluate('fixture.asks[5].options.goal===null')
        page.evaluate('''() => {const f=fixture,next={...f.makePlan(3),title:'Rozbuduj Port do poziomu 2',goal:'dock',targetLevel:2,requestedGoal:'dock',tracking:{goal:'dock',targetLevel:2,language:'pl'}};f.publish(next,{...f.status,phase:'ready',computedAt:performance.now()});f.asks[5].resolve(next);}''')
        expect(page.locator('[data-advisor-answer]')).to_have_attribute('aria-busy','false')
        user_input.fill('Dlaczego?')
        user_input.press('Enter')
        assert page.evaluate('fixture.asks[6].options.goal')=='dock'
        assert page.evaluate('fixture.asks[6].options.targetLevel')==2
        page.evaluate('''() => {const f=fixture;f.status={...f.status,phase:'ready',computedAt:performance.now()};for(const fn of f.listeners)fn(f.plan,f.status);f.asks[6].resolve(f.plan);}''')
        expect(page.locator('[data-advisor-answer]')).to_have_attribute('aria-busy','false')
        spoken=page.locator('[data-advisor-live-status]').inner_text()
        page.evaluate('''() => {const f=fixture;f.publish(f.makePlan(4),{...f.status,phase:'ready',computedAt:performance.now()});}''')
        expect(page.locator('[data-advisor-main-goal] h3')).to_have_text('Rozbuduj Ratusz do poziomu 4')
        expect(page.locator('[data-advisor-live-status]')).to_have_text(spoken)
        # Navigation must report a real start before the conversation closes.
        target=page.locator('[data-advisor-target="lumber"]').first
        target.click()
        expect(page.locator('[data-advisor-conversation]')).to_be_visible()
        page.evaluate('fixture.resolveNavigation(false)')
        expect(page.locator('[data-advisor-planning-status]')).to_contain_text('Otwórz właściwy budynek')
        expect(page.locator('[data-advisor-conversation]')).to_be_visible()
        page.evaluate("fixture.navMode='good'")
        target.click()
        expect(page.locator('[data-advisor-conversation]')).not_to_be_visible()
        expect(page.locator('#map-building')).to_be_focused()
        assert page.evaluate('fixture.navCalls[0].guidance.action')=='assign-workers'
        assert page.evaluate('fixture.navCalls[0].why')=='Pracownik musi najpierw dotrzeć do producenta.'
        assert page.evaluate('fixture.mapClicks')==0, 'UI clicked a map building instead of only requesting guidance'
        page.locator('[data-advisor-mute]').click()
        expect(page.locator('[data-advisor-hint]')).to_contain_text('wyciszone')
        page.evaluate('''() => {const f=fixture;f.language='en';f.publish(f.makePlan(3,true),{phase:'ready',computedAt:performance.now()});f.ui.open();}''')
        expect(page.locator('#kingdom-advisor-title')).to_have_text('Kingdom Advisor')
        expect(page.locator('[data-advisor-main-goal] h3')).to_have_text('Upgrade the Town Hall to level 3')
        expect(page.locator('[data-advisor-main-goal]')).to_contain_text('Hi! Here’s my suggestion:')
        expect(page.locator('[data-advisor-choice]')).to_have_text('This is a suggestion; you’re free to choose another path.')
        expect(page.locator('[data-advisor-step-why]').first).to_contain_text('Why:')
        expect(page.locator('[data-advisor-send]')).to_have_text('Ask')
        page.locator('[data-advisor-close]').click()
        page.locator('[data-advisor-mute]').click()
        expect(page.locator('[data-advisor-hint]')).to_have_text('Hi! I suggest upgrading the Town Hall, because it enables further island development.')
        page.locator('[data-advisor-open]').click()
        bounded(page,'[data-advisor-conversation]')
        bounded(page,'[data-advisor-input]')
        bounded(page,'[data-advisor-send]')
        page.locator('[data-advisor-answer]').evaluate('(element)=>element.scrollTop=0')
        page.screenshot(path=str(OUT/f'advisor-layout-{width}-{height}.png'))
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert page.evaluate('Object.keys(localStorage).length===0&&Object.keys(sessionStorage).length===0')
        page.evaluate('fixture.ui.destroy()')
        assert page.evaluate('fixture.unsubscribed')==1
        expect(page.locator('[data-kingdom-advisor]')).to_have_count(0)
        assert not errors,errors
        assert not writes,writes
        reports.append({'width':width,'height':height,'one_goal':True,'parallel_cards':3,'all_howto_steps':10,'short_why':10,'dependency_order':True,'cached_updates_no_computation':True,'async_draft_focus_preserved':True,'stale_request_rejected':True,'navigation_waits_for_true':True,'guidance_gets_full_step':True,'no_map_autoclick':True,'PL_EN':True,'friendly_bubble_and_choice':True,'single_natural_recommendation':True,'additional_why_only_in_details':True,'quiet_background_updates':True,'automatic_goal_not_pinned_by_questions':True,'explicit_Port_followups_preserved':True,'dispose_unsubscribes':True})
        context.close()
    browser.close()
(OUT/'report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(reports,ensure_ascii=False))
print('PASS advisor hierarchy: one recommendation, parallel cards, all ordered how-to with why, cached async refresh, preserved draft/focus, true-only map guidance start, PL/EN and320/390/1440 layouts; no game/account writes.')
