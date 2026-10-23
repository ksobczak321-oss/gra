"""Focused v13 frontend checks, served from localhost with no external services.

Run: python3 tests/harborlight-frontend-v13-smoke.py
Uses controlled saves only to establish expensive boundaries; actions use the UI.
"""
from collections import deque
from datetime import datetime, timedelta, timezone
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json
import os
import threading
from playwright.sync_api import expect, sync_playwright

ROOT=Path(__file__).resolve().parent.parent
KEY='harborlight-v1-new-player-save'
NOW=datetime(2026,10,23,12,0,tzinfo=timezone.utc)
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=os.environ.get('HARBORLIGHT_BASE_URL','http://127.0.0.1:'+str(server.server_port)).rstrip('/')
URL=BASE+'/harborlight-v1-layered.html?profile=new-player'
errors=[]


def visit(browser,mobile=False):
    context=browser.new_context(viewport={'width':390 if mobile else 1672,'height':844 if mobile else 941},is_mobile=mobile,has_touch=mobile,reduced_motion='reduce')
    page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
    page.clock.install(time=NOW-timedelta(seconds=1));page.clock.pause_at(NOW)
    page.goto(URL);page.wait_for_selector('[data-hud="working"]',state='attached');page.wait_for_function('document.getElementById("loading").hidden')
    return context,page


def saved(page):
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    return json.loads(page.evaluate('key=>localStorage.getItem(key)',KEY))


def fixture(page,mode):
    value=page.evaluate("""async mode=>{
      const {createState}=await import('./harborlight-v1-state.js?v=frontend-v13');const s=createState();
      if(mode==='rich') {
        for(const[id,b]of Object.entries(s.buildings)){b.level=id==='lighthouse'?1:4;b.workers=0;}
        s.buildings.farm.level=3;
        s.resources={coins:100000,wood:2200,stone:2200,grain:2200,food:2400,planks:2200};
      }
      if(mode==='overtime')s.activitySettings={taskMode:'queue',expeditionCurve:{baseSeconds:3,difficultyPerStage:0.1}};
      if(mode==='presence')s.activitySettings={taskMode:'queue',expeditionCurve:{baseSeconds:1000,difficultyPerStage:0.1}};
      if(mode==='cargo') {
        for(const[id,b]of Object.entries(s.buildings)){b.level=id==='lighthouse'?1:4;b.workers=0;}
        s.resources.wood=100;s.buildings.lumber.ready=10;
        s.haulTrips={warehouse:[{worker:0,remaining:200,resource:'wood',amount:3,kind:'construction',projectOrder:1}],market:[{worker:0,remaining:200,resource:'wood',amount:5,kind:'marketInbound'}],dock:[{worker:0,remaining:200,resource:'wood',amount:7,kind:'dockInbound',orderId:1}]};
      }
      return JSON.stringify(s);
    }""",mode)
    page.evaluate('(value)=>sessionStorage.setItem("v13-next-fixture",value)',value)
    page.add_init_script("if(sessionStorage.getItem('v13-next-fixture')){localStorage.setItem('"+KEY+"',sessionStorage.getItem('v13-next-fixture'));sessionStorage.removeItem('v13-next-fixture');}")
    page.reload();page.wait_for_selector('[data-hud="working"]',state='attached')


def close(page):
    page.locator('.dialog-close').click();expect(page.locator('#island-dialog')).not_to_be_visible()


def route():
    grid=['S..T..','.WWT..','.W.TC.','.W....','.TTTW.','...W.G']
    obstacles={(r,c):i for i,(r,c)in enumerate((r,c)for r,line in enumerate(grid)for c,t in enumerate(line)if t in'WTR')}
    first=(0,0,1,1,0,0);seen={first};queue=deque([(first,[])])
    while queue:
        current,path=queue.popleft();r,c,bridge,axe,dynamite,cleared=current
        if grid[r][c]=='G':return path
        for dr,dc in[(1,0),(0,1),(-1,0),(0,-1)]:
            nr,nc=r+dr,c+dc
            if not(0<=nr<6 and 0<=nc<6):continue
            tile=grid[nr][nc];tools=[bridge,axe,dynamite];mask=cleared
            if tile in'WTR':
                bit=1<<obstacles[nr,nc]
                if not mask&bit:
                    index='WTR'.index(tile)
                    if not tools[index]:continue
                    tools[index]-=1;mask|=bit
            nxt=(nr,nc,*tools,mask)
            if nxt not in seen:seen.add(nxt);queue.append((nxt,path+[(nr,nc)]))
    raise AssertionError('No legal route')


with sync_playwright()as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    try:
        ctx,page=visit(browser)
        expect(page.locator('.island-left-nav,[id^="hit-nav-"],#hit-beach,#hit-waterfall,#hit-bridge')).to_have_count(0)
        expect(page.locator('[data-hud="wood"],[data-hud="stone"],[data-hud="grain"],[data-hud="food"],[data-hud="planks"]')).to_have_count(0)
        assert page.locator('[data-dock-building]').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.dockBuilding)')==['townhall','house','farm','windmill','quarry','lumber','sawmill','warehouse','market','dock','chapel','lighthouse']
        labels=page.locator('.building-dock-cards [data-dock-workers]').evaluate_all('(nodes)=>nodes.map(node=>{const r=node.getBoundingClientRect();return r.bottom;})')
        assert max(labels)<=937,labels
        page.screenshot(path='/tmp/harborlight-v13-desktop.png')
        page.locator('#hit-dock-farm').click();page.locator('[data-worker-building="farm"][data-worker-delta="1"]').click();close(page)
        expect(page.locator('[data-dock-workers="farm"]')).to_have_text('0 (+1)')
        expect(page.locator('[data-hud="working"]')).to_have_text('0')
        page.clock.fast_forward(300000)
        expect(page.locator('[data-hud="working"]')).to_have_text('1')
        expect(page.locator('[data-dock-workers="farm"]')).to_have_text('1')
        page.locator('#hit-dock-farm').click();page.locator('[data-worker-building="farm"][data-worker-delta="-1"]').click();close(page)
        expect(page.locator('[data-dock-workers="farm"]')).to_have_text('0 (−1)')
        page.locator('#hit-settings').click();page.locator('select[aria-label="Language"]').select_option('pl')
        expect(page.locator('#dialog-title')).to_have_text('Ustawienia');close(page)
        expect(page.locator('[data-hud="points"]').locator('..')).to_contain_text('Punkty')
        page.locator('#hit-dock-townhall').click();expect(page.locator('#dialog-title')).to_have_text('Ratusz')
        expect(page.locator('[data-active-effects] details summary').first).to_be_visible()
        page.locator('[data-active-effects] details summary').first.click()
        expect(page.locator('[data-active-effects] details[open]')).to_have_count(1)
        page.clock.fast_forward(1000);expect(page.locator('[data-active-effects] details[open]')).to_have_count(1)
        close(page);page.locator('#hit-settings').click();page.locator('select[aria-label="Język"]').select_option('en');close(page)
        assert page.evaluate("localStorage.getItem('harborlight-language')")=='en'
        page.locator('#hit-tutorial').click()
        expect(page.locator('.tutorial-day')).to_have_count(5)
        expect(page.locator('[data-tutorial-observe="island-level"]')).to_be_enabled()
        page.locator('[data-tutorial-observe="island-level"]').click();page.locator('[data-tutorial-claim="island-level"]').click()
        assert saved(page)['tutorial']['claimed']['island-level']is True
        close(page)
        fixture(page,'cargo');page.locator('#hit-category-resources').click()
        card=page.locator('[data-dock-resource="wood"]')
        expect(card.locator('[data-dock-local]')).to_have_text('10');expect(card.locator('[data-dock-central]')).to_have_text('100');expect(card.locator('[data-dock-transit]')).to_have_text('15')
        expect(card.locator('[data-resource-trend]')).to_have_text('→ 0 units/h')
        fixture(page,'rich');page.locator('#hit-dock-house').click();before=saved(page)
        page.locator('[data-buy-resident]').click();after=saved(page)
        assert after['population']==before['population']+1
        for resource in ['coins','wood','stone','grain','food','planks']:assert after['resources'][resource]==before['resources'][resource]-2000
        assert after['residents'][-1]['newbornRemaining']==86400
        close(page)
        fixture(page,'rich');page.locator('#hit-dock-farm').click();before=saved(page)
        page.locator('[data-premium-buy="farm"]').click();after=saved(page)
        assert len(after['premiumServices'])==1 and len(after['constructionProjects'])==0
        assert after['premiumServices'][0]['buildRemaining']==10
        for resource in ['wood','stone','grain','planks']:assert after['resources'][resource]==before['resources'][resource]
        page.clock.fast_forward(10000);assert saved(page)['buildings']['farm']['level']==4
        close(page);fixture(page,'rich');page.locator('#hit-dock-farm').click();page.locator('[data-upgrade-building="farm"]').click();close(page)
        page.locator('#hit-dock-townhall').click();page.locator('[data-construction-entry]').click()
        page.locator('[data-cancel-project]').click();assert saved(page)['constructionProjects']==[]
        close(page)
        page.evaluate("Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.sharedMilestone=payload;}})")
        page.locator('#hit-dock-townhall').click();before=saved(page)['resources']['coins'];page.locator('[data-share-level="4"]').click()
        expect(page.locator('#milestone-share')).to_be_visible()
        assert 'Town Hall level 4' in page.locator('[data-share-post]').input_value()
        assert 'ksobczak321-oss.github.io/gra/' in page.locator('[data-share-post]').input_value()
        page.locator('[data-native-share]').click();expect(page.locator('[data-share-status]')).to_contain_text('no coins were awarded')
        assert saved(page)['resources']['coins']==before and page.evaluate('window.sharedMilestone.title')=='HARBORLIGHT'
        assert 'facebook.com/sharer/' in page.locator('[data-facebook-share]').get_attribute('href')
        page.locator('[data-close-share]').click();close(page);ctx.close()
        print('PASS layout, all 12 cards, real staffing badges, reversible PL/EN, compact effects, tutorial, transit/rates and resident purchase')

        ctx,page=visit(browser)
        page.locator('.activity-task-button').first.click()
        expect(page.locator('#task-acceptance')).to_be_visible();assert saved(page)['activeTaskId']is None
        page.clock.fast_forward(20000);page.reload();page.wait_for_selector('#task-acceptance');page.locator('[data-confirm-task]').click()
        data=saved(page);assert data['lighthouseTasks'][0]['multiplier']==3 and data['activeTaskId']==data['lighthouseTasks'][0]['id']
        expect(page.locator('[data-task-deposit]').first).to_have_text('Donate');close(page)
        fixture(page,'presence');page.locator('.activity-expedition').first.click();page.reload();page.wait_for_selector('.puzzle-board')
        for row,col in route():page.locator(f'.puzzle-cell[data-row="{row}"][data-col="{col}"]').click()
        expect(page.locator('[data-expedition-cashout]')).to_have_text('Cash out 50 coins')
        page.clock.fast_forward(300000);expect(page.locator('#expedition-presence')).to_be_visible()
        page.locator('[data-presence-confirm]').click();expect(page.locator('#expedition-presence')).to_have_count(0)
        page.locator('.dialog-close').click();expect(page.locator('#island-confirmation')).to_be_visible()
        page.locator('[data-cancel-choice]').click();expect(page.locator('#island-dialog')).to_be_visible()
        before=saved(page)['resources']['coins'];page.locator('.dialog-close').click();page.locator('[data-confirm-choice]').click()
        expect(page.locator('#island-dialog')).not_to_be_visible();assert saved(page)['resources']['coins']==before+50
        fixture(page,'overtime');page.locator('.activity-expedition').first.click();page.clock.fast_forward(4000)
        expect(page.locator('[data-expedition-pot]')).to_have_text('40 coins')
        for row,col in route():page.locator(f'.puzzle-cell[data-row="{row}"][data-col="{col}"]').click()
        expect(page.locator('[data-expedition-continue]')).to_have_text('Risk 40 for 90')
        page.locator('[data-expedition-continue]').click();expect(page.locator('[data-expedition-pot]')).to_have_text('90 coins')
        page.locator('.dialog-close').click();page.locator('[data-confirm-choice]').click();assert saved(page)['expeditionRuns']['misty']['status']=='lost'
        ctx.close();print('PASS task multiplier snapshot + explicit confirmation, challenge presence, close confirmations, actual overtime pot and loss')

        ctx,page=visit(browser,mobile=True)
        expect(page.locator('.mobile-bottom-dock')).to_be_visible()
        expect(page.locator('[data-mobile-building]')).to_have_count(12)
        expect(page.locator('.island-topbar')).not_to_be_visible()
        world=page.locator('#viewport').bounding_box();assert world and world['height']>450
        before=page.locator('#stage').get_attribute('style');page.locator('#viewport').focus();page.keyboard.press('ArrowRight');assert page.locator('#stage').get_attribute('style')!=before
        page.screenshot(path='/tmp/harborlight-v13-mobile-island.png')
        page.locator('[data-mobile-building="townhall"]').click();expect(page.locator('#dialog-title')).to_have_text('Town Hall');close(page)
        page.locator('.mobile-dock-tab').filter(has_text='Resources').click();expect(page.locator('[data-mobile-resource]')).to_have_count(5)
        page.locator('.mobile-activities').click();expect(page.locator('#dialog-title')).to_have_text('Tasks')
        page.screenshot(path='/tmp/harborlight-v13-mobile.png')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        bounds=page.locator('#island-dialog').bounding_box();assert bounds and bounds['x']>=0 and bounds['x']+bounds['width']<=391
        ctx.close();print('PASS touch-sized mobile dock, all five resources and modal layout')
        assert not errors,errors
    finally:browser.close();server.shutdown()
    print('PASS v13 browser checks without JavaScript errors')
