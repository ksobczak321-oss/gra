"""v15 acceptance of the approved UI, complete Polish and changed attraction rules.

Run directly for localhost, or set HARBORLIGHT_BASE_URL for a public deployment.
Expensive states are controlled saves; navigation, purchases and puzzle moves use
the real UI. The browser owns isolated storage and never touches a user's save.
"""
from collections import deque
from datetime import datetime, timedelta, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import re
import threading

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SLOT = 'qa-v15'
SAVE_KEY = 'harborlight-v1-new-player-save-' + SLOT
NOW = datetime(2026, 10, 29, 12, tzinfo=timezone.utc)
ADMIN = ['townhall', 'house', 'warehouse', 'market', 'dock', 'chapel', 'lighthouse']
ECONOMY = ['farm', 'windmill', 'quarry', 'lumber', 'sawmill']
BUILDINGS = ADMIN + ECONOMY
POLISH_NAMES = {'townhall': 'Ratusz', 'house': 'Dom', 'warehouse': 'Magazyn', 'market': 'Targ', 'dock': 'Port',
                'chapel': 'Kaplica', 'lighthouse': 'Latarnia morska', 'farm': 'Gospodarstwo',
                'windmill': 'Młyn', 'quarry': 'Kamieniołom', 'lumber': 'Drwale', 'sawmill': 'Tartak'}
ENGLISH_NAMES = {'townhall':'Town Hall','house':'House','warehouse':'Warehouse','market':'Market','dock':'Harbor',
                 'chapel':'Chapel','lighthouse':'Lighthouse','farm':'Farm','windmill':'Windmill','quarry':'Quarry',
                 'lumber':'Lumber Camp','sawmill':'Sawmill'}
errors, failures = [], []
catalogues = {}
LAYOUT_ONLY = os.environ.get('HARBORLIGHT_QA_LAYOUT_ONLY') == '1'
english_leaks = re.compile(r'\b(?:Deliver goods|central storage|instalments|irreversible|deadline|Each task|Uses|Waiting for|Choose to|not built|Potential pot|risk it|or an earlier upgrade|Food available|Happiness|Current pot|Your island|the|and|or|for|from|with|without|until|before|after|cannot|unavailable|available|completed|building|construction|workers|residents|coins|food|reward|waiting|remaining|storage|deposit|level|potential|pot)\b', re.I)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = os.environ.get('HARBORLIGHT_BASE_URL', 'http://127.0.0.1:' + str(server.server_port)).rstrip('/')
URL = BASE + '/harborlight-v1-layered.html?profile=new-player&slot=' + SLOT + '&v=frontend-v15'


def visit(browser, width=1672, height=941, language='pl'):
    mobile = width < 901
    context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=mobile,
                                  has_touch=mobile, reduced_motion='reduce')
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failures.append((response.status, response.url)) if response.status >= 400 else None)
    page.on('requestfailed', lambda request: failures.append((request.failure, request.url)))
    page.clock.install(time=NOW - timedelta(seconds=1))
    page.clock.pause_at(NOW)
    page.add_init_script('localStorage.setItem("harborlight-language",%s);' % json.dumps(language))
    assert page.goto(URL).ok
    page.wait_for_function('document.getElementById("loading").hidden')
    page.wait_for_selector('[data-hud="working"]', state='attached')
    # v16 opens the real tutorial on a fresh profile. This older acceptance
    # exercises unrelated panels after the player chooses to return later.
    if page.locator('[data-tutorial-panel]').count():
        page.locator('[data-tutorial-later]').click()
    return context, page


def saved(page):
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    return json.loads(page.evaluate('(key)=>localStorage.getItem(key)', SAVE_KEY))


def install_save(page, value):
    page.evaluate('(value)=>sessionStorage.setItem("v15-next-save",JSON.stringify(value))', value)
    page.add_init_script('''(() => {
      const value = sessionStorage.getItem('v15-next-save');
      if (value) { localStorage.setItem(%s,value);sessionStorage.removeItem('v15-next-save'); }
    })();''' % json.dumps(SAVE_KEY))
    page.reload()
    page.wait_for_function('document.getElementById("loading").hidden')


def fixture(page, mode='rich'):
    value = page.evaluate('''async mode => {
      const {createState,act,EXPEDITIONS} = await import('./harborlight-v1-state.js?v=frontend-v15');
      const s=createState(Date.now());
      s.tutorial.autoOpenDisabled=true;
      if(mode==='rich') {
        for(const [id,b]of Object.entries(s.buildings))b.level=id==='lighthouse'?1:2;
        s.buildings.townhall.level=4;s.buildings.house.level=4;s.buildings.warehouse.level=4;
        s.resources={coins:100000,wood:1800,stone:1800,grain:1800,food:2000,planks:1800};
      }
      if(mode==='challenge') {
        s.activitySettings={taskMode:'queue',expeditionCurve:{baseSeconds:1000,difficultyPerStage:0.1}};
        // Preserve this suite's original route proof as an explicit legacy save.
        act(s,{type:'expeditionStart',expedition:EXPEDITIONS[0].id,gameVersion:9});
      }
      return s;
    }''', mode)
    install_save(page, value)


def close(page):
    page.locator('.dialog-close').click()
    expect(page.locator('#island-dialog')).not_to_be_visible()


def category(page, id, mobile=False):
    page.locator(f'[data-mobile-category="{id}"]' if mobile else f'#hit-category-{id}').click()


def building(page, id, mobile=False):
    category(page, 'economy' if id in ECONOMY else 'administration', mobile)
    item = page.locator(f'[data-mobile-building="{id}"]' if mobile else f'#hit-dock-{id}')
    item.scroll_into_view_if_needed()
    item.click()
    expect(page.locator(f'[data-building-panel="{id}"]')).to_be_visible()


def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    assert page.locator('#island-dialog .dialog-body').evaluate('(node)=>node.scrollWidth<=node.clientWidth+1')
    bounds = page.locator('#island-dialog').bounding_box()
    assert bounds and bounds['x'] >= -1 and bounds['x'] + bounds['width'] <= page.viewport_size['width'] + 1
    clipped = page.locator('#island-dialog .stat,#island-dialog .labelled-value,#island-dialog .workers-food-metrics>div').evaluate_all('''nodes=>nodes.filter(node=>{
      if(!node.getClientRects().length || !node.checkVisibility())return false;
      return node.scrollWidth>node.clientWidth+1;
    }).map(node=>({text:node.innerText,width:node.clientWidth,scroll:node.scrollWidth}))''')
    if clipped:
        page.screenshot(path='/tmp/harborlight-v15-overflow.png')
    assert not clipped, clipped


def one_screen(page, id):
    expect(page.locator(f'[data-building-purpose="{id}"]')).to_be_visible()
    expect(page.locator(f'[data-building-upgrade="{id}"]')).to_be_visible()
    for selector in ['#island-dialog','#island-dialog .dialog-body']:
        dimensions=page.locator(selector).evaluate('(node)=>({height:node.clientHeight,scroll:node.scrollHeight})')
        assert dimensions['scroll']<=dimensions['height']+1,(id,page.viewport_size,selector,dimensions)
    no_overflow(page)


def polish(page, scope='#island-dialog'):
    if LAYOUT_ONLY:
        return
    content = page.locator(scope).inner_text()
    matches = english_leaks.findall(content)
    assert not matches, {'english': matches, 'content': content}


def audit_help(page):
    for selector in ['[data-section-info]', '[data-upgrade-info]']:
        count = page.locator(selector + ':visible').count()
        for index in range(count):
            trigger = page.locator(selector + ':visible').nth(index)
            trigger.click()
            polish(page)
            page.keyboard.press('Escape')


def catalogue(page,label):
    catalogues[label]=page.evaluate("async()=>[...(await import('./harborlight-v1-i18n.js?v=frontend-v15')).untranslatedTexts].sort()")


def route():
    grid=['S..T..','.WWT..','.W.TC.','.W....','.TTTW.','...W.G']
    obstacles={(r,c):i for i,(r,c) in enumerate((r,c) for r,line in enumerate(grid) for c,t in enumerate(line) if t in 'WTR')}
    first=(0,0,1,1,0,0);seen={first};queue=deque([(first,[])])
    while queue:
        current,path=queue.popleft();r,c,bridge,axe,dynamite,cleared=current
        if grid[r][c]=='G': return path
        for dr,dc in [(1,0),(0,1),(-1,0),(0,-1)]:
            nr,nc=r+dr,c+dc
            if not(0<=nr<6 and 0<=nc<6): continue
            tile=grid[nr][nc];tools=[bridge,axe,dynamite];mask=cleared
            if tile in 'WTR':
                bit=1<<obstacles[nr,nc]
                if not mask&bit:
                    index='WTR'.index(tile)
                    if not tools[index]: continue
                    tools[index]-=1;mask|=bit
            nxt=(nr,nc,*tools,mask)
            if nxt not in seen:
                seen.add(nxt);queue.append((nxt,path+[(nr,nc)]))
    raise AssertionError('No legal route')


with sync_playwright() as playwright:
    browser=playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    try:
        context,page=visit(browser)
        state=saved(page)
        assert state['resources']==dict.fromkeys(['coins','wood','stone','grain','food','planks'],100)
        assert state['population']==12 and state['buildings']['townhall']['level']==1
        for group in ['administration','economy']:
            category(page,group)
            sizes=page.locator('[data-dock-building]:visible .building-dock-picture').evaluate_all('nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return [r.width,r.height];})')
            assert sizes and all(abs(item[0]-sizes[0][0])<=1 and abs(item[1]-sizes[0][1])<=1 for item in sizes),sizes
            labels=page.locator('[data-dock-building]:visible [data-dock-workers]').all_inner_texts()
            assert labels and all('Pracuje:' in label for label in labels),labels
        page.screenshot(path='/tmp/harborlight-v15-economy.png')
        fixture(page)
        for width,height in [(1672,941),(1366,768)]:
            page.set_viewport_size({'width':width,'height':height})
            for id in BUILDINGS:
                building(page,id)
                one_screen(page,id);polish(page);audit_help(page)
                if id in ['windmill','lighthouse','townhall'] and width==1366:
                    page.screenshot(path=f'/tmp/harborlight-v15-{id}-desktop.png')
                close(page)
        high=saved(page);high['buildings']['townhall']['level']=100;high['buildings']['lighthouse']['level']=69
        install_save(page,high);building(page,'lighthouse');one_screen(page,'lighthouse');polish(page);close(page)
        fixture(page);building(page,'farm');page.locator('[data-upgrade-building="farm"]').click()
        one_screen(page,'farm');polish(page)
        page.locator('[data-building-more="farm"]').click();expect(page.locator('[data-panel-back]')).to_be_visible()
        polish(page)
        expect(page.locator('[data-project-status]')).to_contain_text('budowa:')
        page.locator('[data-panel-back]').click();expect(page.locator('[data-building-panel="farm"]')).to_be_visible()
        one_screen(page,'farm');close(page)
        print('PASS equal thumbnails and staffed labels; all12 building overviews fit desktop at1672x941 and1366x768')
        if LAYOUT_ONLY:
            context.close()
            assert not errors,errors
            assert not failures,failures
            raise SystemExit(0)

        catalogue(page,'all-building-help-pl')
        fixture(page)
        page.locator('#hit-settings').click();page.locator('select').first.select_option('en');close(page)
        for id in BUILDINGS:
            building(page,id);one_screen(page,id)
            expect(page.locator('#dialog-title')).to_have_text(ENGLISH_NAMES[id])
            close(page)
        page.locator('#hit-settings').click();page.locator('select').first.select_option('pl');close(page)
        print('PASS all12 English building titles/primary-actions on one screen at1366x768 and reversible PL/EN')

        page.locator('#hit-home').click()
        assert 'Zaloguj się lub załóż konto' not in page.locator('#island-dialog').inner_text()
        page.get_by_role('button',name='Ratusz',exact=True).click()
        expect(page.locator('[data-panel-back]')).to_be_visible()
        page.locator('[data-panel-back]').click()
        expect(page.locator('#dialog-title')).not_to_have_text('Ratusz')
        page.get_by_role('button',name='Budynki',exact=True).click()
        assert page.locator('[data-building-purpose]').count()==12
        polish(page);close(page)
        page.locator('#hit-home').click();page.get_by_role('button',name='Główny cel',exact=True).click()
        goal=page.locator('#island-dialog').inner_text()
        assert 'mieszkań' in goal.lower() and 'wysp' in goal.lower(),goal
        polish(page);close(page)
        fixture(page,'starter');building(page,'lighthouse')
        expect(page.locator('#island-dialog')).not_to_contain_text('Nie zbudowano')
        expect(page.locator('#island-dialog')).to_contain_text('Ruiny')
        close(page)
        page.locator('#hit-home').click();page.get_by_role('button',name='Mieszkańcy',exact=True).click()
        no_overflow(page);polish(page)
        page.locator('#island-dialog .dialog-body').evaluate('(node)=>node.scrollTop=node.scrollHeight')
        no_overflow(page);polish(page);close(page)
        page.locator('#hit-home').click();page.get_by_role('button',name='Magazyn',exact=True).click()
        polish(page);no_overflow(page);close(page)
        print('PASS home has no sign-in, contextual back arrow, complete purpose list, whole-island goal, Ruins and readable Residents/Warehouse')

        fixture(page)
        page.locator('.activity-task-button').first.click()
        polish(page,'#task-acceptance')
        page.locator('[data-confirm-task]').click()
        polish(page);expect(page.locator('[data-task-deposit]').first).to_have_text('Przekaż')
        close(page);building(page,'chapel');polish(page);audit_help(page);close(page)
        category(page,'decorations')
        candidates=page.locator('[data-attraction]:enabled')
        assert candidates.count()>0
        before=saved(page)['resources']['coins'];candidates.first.click()
        after=saved(page)
        assert len(after['leisure']['effects'])==1 and after['resources']['coins']<before
        assert page.locator('[data-attraction]:enabled').count()==0
        page.reload();page.wait_for_function('document.getElementById("loading").hidden');category(page,'decorations')
        assert page.locator('[data-attraction]:enabled').count()==0
        print('PASS Polish task confirmation/donations, Chapel, and one six-hour attraction blocking all other starts across reload')

        fixture(page,'challenge')
        if not page.locator('.puzzle-board').count():
            page.locator('.activity-expedition').first.click()
        for row,col in route():page.locator(f'.puzzle-cell[data-row="{row}"][data-col="{col}"]').click()
        polish(page);expect(page.locator('[data-expedition-cashout]')).to_contain_text('50')
        page.screenshot(path='/tmp/harborlight-v15-expedition-win-pl.png')
        page.locator('[data-expedition-cashout]').click()
        catalogue(page,'tasks-chapel-attractions-expedition-pl')
        context.close()
        print('PASS complete Polish expedition win text and real payout')

        context,page=visit(browser,390,844)
        fixture(page)
        for id in ['windmill','lighthouse','house','warehouse','chapel']:
            building(page,id,True);no_overflow(page);polish(page)
            if id=='windmill':page.screenshot(path='/tmp/harborlight-v15-windmill-phone.png')
            close(page)
        context.close()
        print('PASS responsive Polish building panels on390px phone')

        # Literal names that match translated source words must stay user text.
        for island_name in ['Food','Twoja wyspa','Your island']:
            context,page=visit(browser)
            page.goto(BASE+'/harborlight-auth.html?mode=register&profile=new-player&slot='+SLOT+'&v=frontend-v15')
            page.locator('#display-name').fill('Captain')
            page.locator('#island-name').fill(island_name)
            page.locator('#email').fill('captain@example.com')
            page.locator('#password').fill('island-password-123')
            page.locator('#confirm-password').fill('different-password')
            page.locator('#account-submit').click()
            pref='harborlight-island-name:'+SAVE_KEY
            assert page.evaluate('(key)=>localStorage.getItem(key)',pref) is None
            page.locator('#confirm-password').fill('island-password-123')
            page.locator('#terms-accepted').check()
            page.locator('#privacy-acknowledged').check()
            page.locator('#account-submit').click()
            stored=json.loads(page.evaluate('(key)=>localStorage.getItem(key)',pref))
            assert stored['name']==island_name
            passwords=page.evaluate('JSON.stringify(localStorage)')
            assert 'island-password-123' not in passwords and 'captain@example.com' not in passwords
            page.locator('.guest-link').click()
            assert 'slot='+SLOT in page.url
            assert saved(page)['islandName']==island_name
            if page.locator('[data-tutorial-panel]').count():
                page.locator('[data-tutorial-later]').click()
            expect(page.locator('[data-island-name]').first).to_have_text(island_name)
            page.locator('#hit-home').click();expect(page.locator('#dialog-title')).to_have_text(island_name)
            close(page);page.locator('#hit-settings').click();page.locator('select').first.select_option('en');close(page)
            expect(page.locator('[data-island-name]').first).to_have_text(island_name)
            page.locator('#hit-home').click();expect(page.locator('#dialog-title')).to_have_text(island_name)
            context.close()
        print('PASS registration name validation/route isolation/persistence and literal user names in PL/EN, no credential storage')
        assert not errors,errors
        assert not failures,failures
        Path('/tmp/harborlight-v15-untranslated-catalogues.json').write_text(json.dumps(catalogues,ensure_ascii=False,indent=2))
        print('PASS v15 browser acceptance without JavaScript or HTTP errors')
    finally:
        browser.close();server.shutdown()
