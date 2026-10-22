"""Construction, townhall UI, paid plans, timed bonuses and market acceptance.

Saved fixtures reach long construction boundaries; full durations and economic
rules are checked by the pure state tests. No real package purchase is exposed.
"""
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
BASE=os.environ.get('HARBORLIGHT_BASE_URL','http://127.0.0.1:8002').rstrip('/')
KEY='harborlight-v1-interactive-save'
IDS=['house','farm','sawmill','quarry','dock','warehouse','lighthouse','lumber','windmill','townhall','chapel','market']
MATERIALS=['wood','stone','grain','food','planks']
NOW=datetime(2026,10,22,12,0,0,tzinfo=timezone.utc)
errors=[]; failures=[]

def fixture(level=2,workers=None,resources=None,paused=True):
    buildings={id:{'level':0 if id=='lighthouse' else 1,'workers':(workers or {}).get(id,0),'ready':0,'workProgress':[]} for id in IDS}
    buildings['townhall']['level']=level; buildings['house']['level']=level; buildings['warehouse']['level']=level
    return {'version':6,'buildings':buildings,'resources':{'coins':1000,**dict.fromkeys(MATERIALS,1000),**(resources or {})},'population':24,'happiness':0,'baseHappiness':0,'paused':paused,'settings':{'motion':False}}

def project(building,target,stage='building',remaining=1):
    return {'building':building,'targetLevel':target,'goodsTotal':2500,'goodsRemaining':0,'transportSeconds':100,'buildRemaining':remaining,'stage':stage,'order':1,'cost':{'coins':500,**dict.fromkeys(MATERIALS,500)}}

def visit(browser,data,has_touch=False):
    context=browser.new_context(viewport={'width':1672,'height':941},reduced_motion='reduce',has_touch=has_touch)
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:failures.append((r.status,r.url)) if r.status>=400 else None)
    page.clock.install(time=NOW - timedelta(seconds=5));page.clock.pause_at(NOW)
    page.add_init_script('''if(!sessionStorage.getItem('construction-fixture')){localStorage.setItem(%s,%s);sessionStorage.setItem('construction-fixture','1')}'''%(json.dumps(KEY),json.dumps(json.dumps(data))))
    assert page.goto(BASE+'/harborlight-v1-layered.html').status==200
    page.wait_for_selector('[data-hud="level"]');page.wait_for_function('document.getElementById("loading").hidden')
    return context,page

def saved(page): return json.loads(page.evaluate('(key)=>localStorage.getItem(key)',KEY))
def replace(page,data):
    page.evaluate('(value)=>sessionStorage.setItem("next-construction-fixture",JSON.stringify(value))',data)
    page.add_init_script('if(sessionStorage.getItem("next-construction-fixture")){localStorage.setItem("harborlight-v1-interactive-save",sessionStorage.getItem("next-construction-fixture"));sessionStorage.removeItem("next-construction-fixture")}')
    page.reload();page.wait_for_selector('[data-hud="level"]')
def open_building(page,id):
    if page.locator('#island-dialog').evaluate('(node)=>node.open'):page.locator('.dialog-close').click()
    page.locator('#hit-world-'+id).click()
def clock_control(page,id):
    if page.locator('#island-dialog').evaluate('(node)=>node.open'):page.locator('.dialog-close').click()
    page.locator('#hit-'+id).click()
def queue_view(page):
    if page.locator('#island-dialog').evaluate('(node)=>node.open'):page.locator('.dialog-close').click()
    page.locator('#hit-menu').click();page.get_by_role('button',name='Construction and queue',exact=True).click()

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
    try:
        data=fixture(workers={'farm':3,'warehouse':2},resources={'wood':100,'stone':1152,'planks':100,'grain':200,'food':300})
        data['population']=23
        context,page=visit(browser,data,has_touch=True);open_building(page,'townhall')
        expect(page.locator('[data-population-stat="population"]')).to_have_text('23 / 48')
        expect(page.locator('[data-population-stat="taxes"]')).to_have_text('5 coins/h')
        expect(page.locator('[data-worker-building]')).to_have_count(0)
        expect(page.locator('[data-local-buffer]')).to_have_count(0)
        expect(page.locator('[data-upgrade-cost="wood"]')).to_have_text('100 / 1,000')
        expect(page.locator('[data-upgrade-cost="wood"]')).to_have_class('is-short')
        expect(page.locator('[data-upgrade-cost="stone"]')).to_have_text('1,152 / 1,000')
        expect(page.locator('[data-upgrade-cost="stone"]')).to_have_class('is-affordable')
        expect(page.get_by_role('button',name='Upgrade',exact=True)).to_be_disabled()
        assert 'Choose location' not in page.locator('#island-dialog').inner_text()
        assert 'Ready to collect' not in page.locator('#island-dialog').inner_text()
        # Upgrade guidance is available only through the adjacent info button.
        info = page.locator('[data-upgrade-info="townhall"]')
        help_popup = page.locator('[data-upgrade-popover="townhall"]')
        expect(info).to_have_attribute('aria-expanded', 'false')
        expect(help_popup).not_to_be_visible()
        visible_panel = page.locator('#island-dialog').inner_text().lower()
        assert 'central warehouse' not in visible_panel
        assert 'transport' not in visible_panel
        info.click()
        expect(info).to_have_attribute('aria-expanded', 'true')
        expect(help_popup).to_be_visible()
        assert 'warehouse' in help_popup.inner_text().lower()
        assert 'transport' in help_popup.inner_text().lower()
        page.keyboard.press('Escape')
        expect(help_popup).not_to_be_visible()
        expect(page.locator('#island-dialog')).to_be_visible()
        expect(info).to_be_focused()
        info.click()
        page.locator('#dialog-title').click()
        expect(help_popup).not_to_be_visible()
        Path('setup-checks').mkdir(exist_ok=True)
        page.screenshot(path='setup-checks/townhall-economy-v6.png')
        page.set_viewport_size({'width':390,'height':844})
        dims=page.locator('.dialog-body').evaluate('(e)=>[e.clientWidth,e.scrollWidth]');assert dims[1]<=dims[0]+1,dims
        info.tap()
        expect(help_popup).to_be_visible()
        bounds = help_popup.bounding_box()
        assert bounds['x'] >= 0 and bounds['x'] + bounds['width'] <= 391, bounds
        popup_sizes = help_popup.evaluate('(e) => [e.clientWidth, e.scrollWidth]')
        assert popup_sizes[1] <= popup_sizes[0] + 1, popup_sizes
        page.screenshot(path='setup-checks/townhall-english-upgrade-info-mobile.png')
        info.tap()
        expect(help_popup).not_to_be_visible()
        page.screenshot(path='setup-checks/townhall-economy-v6-mobile.png')
        page.set_viewport_size({'width':844,'height':390})
        info.tap()
        expect(help_popup).to_be_visible()
        bounds = help_popup.bounding_box()
        header = page.locator('.dialog-header').bounding_box()
        assert bounds['x'] >= 0 and bounds['x'] + bounds['width'] <= 845, bounds
        assert bounds['y'] >= header['y'] + header['height'] and bounds['y'] + bounds['height'] <= 391, (bounds, header)
        page.locator('#dialog-title').tap()
        expect(help_popup).not_to_be_visible()
        expect(page.locator('#island-dialog')).to_be_visible()
        context.close();print('PASS townhall: 23/48, taxes, current/required costs and accessible upgrade info on click, Escape, outside dismissal and touch')

        context,page=visit(browser,fixture(workers={'warehouse':6}))
        before=saved(page)
        for id in ['farm','windmill','lumber','quarry']:
            open_building(page,id);page.get_by_role('button',name='Upgrade',exact=True).click()
            expect(page.locator('#placement-banner')).not_to_be_visible()
        state=saved(page);assert [item['stage'] for item in state['constructionProjects']]==['transport','transport','queued','queued']
        assert state['resources']['grain']==before['resources']['grain']-120
        open_building(page,'sawmill');expect(page.get_by_role('button',name='Upgrade',exact=True)).to_be_disabled()
        queue_view(page);expect(page.locator('[data-construction-summary]')).to_have_text('Construction: 2 / 2 · Queue: 2 / 2')
        # Restore a real saved boundary, then let application timers complete and promote.
        state['paused']=False;state['constructionProjects'][0].update(stage='building',goodsRemaining=0,buildRemaining=1)
        state['constructionProjects'][1].update(goodsRemaining=1,transportSeconds=10)
        state['buildings']['warehouse']['workProgress']=[59]*6
        replace(page,state);page.clock.run_for(1000)
        clock_control(page,'pause');state=saved(page)
        assert state['buildings']['farm']['level']==2
        assert len(state['constructionProjects'])==3
        assert state['buildings']['lumber']['construction']['stage']=='transport'
        assert state['buildings']['windmill']['construction']['stage']=='building'
        page.reload();page.wait_for_selector('[data-hud="level"]');queue_view(page)
        expect(page.locator('[data-construction-summary]')).to_have_text('Construction: 2 / 2 · Queue: 1 / 2')
        context.close();print('PASS 2 active + 2 queued, full reservation, no placement step, automatic FIFO promotion and saved queue')

        data=fixture(resources=dict.fromkeys(['coins']+MATERIALS,0))
        data['premium']={'expiresAt':int(NOW.timestamp()*1000)+2000}
        context,page=visit(browser,data);open_building(page,'farm')
        page.get_by_role('button',name='Upgrade',exact=True).click()
        state=saved(page);assert state['buildings']['farm']['construction']['stage']=='planned';assert state['resources']['wood']==0
        queue_view(page);expect(page.locator('[data-construction-summary]')).to_contain_text('Construction: 0 / 6 · Queue: 1 / unlimited')
        page.clock.run_for(2000)
        expect(page.locator('[data-construction-summary]')).to_have_text('Construction: 0 / 2 · Queue: 1 / 2')
        expect(page.locator('[data-project-status]')).to_contain_text('package reactivation')
        context.close();print('PASS paid +4, missing-material plan, unlimited queue and wall-clock package expiry even during pause')

        data=fixture(workers={'farm':1},resources=dict.fromkeys(MATERIALS,100),paused=False)
        data['population']=12;data['buildings']['lighthouse']['level']=1;data['objective']={'repaired':True,'wood':50,'stone':30};data['constructionProjects']=[project('lighthouse',2)]
        context,page=visit(browser,data);open_building(page,'lighthouse');page.clock.run_for(1000)
        expect(page.locator('[data-lighthouse-bonus]')).to_contain_text('material production ×2')
        expect(page.locator('[data-hud="happiness"]')).to_have_text('+100%')
        clock_control(page,'pause');state=saved(page);assert state['lighthouseRemaining']==172800;assert state['buildings']['lighthouse']['level']==2
        clock_control(page,'play');open_building(page,'farm')
        expect(page.locator('[data-local-rate]')).to_have_text('20 units/h')
        page.clock.run_for(180000);expect(page.locator('[data-local-buffer="farm"]')).to_have_text('1 / 400')
        context.close();print('PASS lighthouse completion: both bonuses for 48h at level2, actual doubled production, no tax multiplier')

        data=fixture(workers={'farm':1,'warehouse':1},resources=dict.fromkeys(MATERIALS,100),paused=False)
        data['population']=12;data['constructionProjects']=[project('chapel',2)]
        context,page=visit(browser,data);open_building(page,'chapel');page.clock.run_for(1000)
        expect(page.locator('[data-hud="happiness"]')).to_have_text('+21%')
        expect(page.locator('[data-hud="taxes"]')).to_have_text('Taxes: 4/h')
        page.locator('[data-blessing]').click();state=saved(page)
        assert state['blessingsUsed']==1 and state['resources']['grain']==150
        expect(page.locator('[data-hud="happiness"]')).to_have_text('+41%')
        expect(page.locator('[data-blessing]')).to_be_disabled()
        page.locator('.dialog-close').click();page.locator('#hit-notifications').click()
        expect(page.locator('#island-dialog')).to_contain_text('Chapel upgrade bonus')
        page.get_by_role('button',name='Mark all as read',exact=True).click()
        expect(page.locator('[data-notification-count]')).to_have_text('0')
        context.close();print('PASS chapel completion, full ten-hour tax/happiness bonus, manual resource blessing and persistent notifications')

        data=fixture(workers={'market':1,'warehouse':1},resources=dict.fromkeys(MATERIALS,100))
        data['market']={'stock':{'wood':10}}
        context,page=visit(browser,data);open_building(page,'market');page.locator('[data-market-exchange]').click()
        state=saved(page);assert state['market']['stock']['wood']==0 and state['market']['stock']['stone']==9
        page.locator('[data-market-dispatch="stone"]').click();clock_control(page,'play');page.clock.run_for(60000)
        clock_control(page,'pause');state=saved(page);assert state['resources']['stone']==101 and state['market']['stock']['stone']==8
        page.locator('#hit-world-market').click();page.locator('[data-market-order="grain"]').click()
        clock_control(page,'play');page.clock.run_for(60000);clock_control(page,'pause')
        state=saved(page);assert state['market']['locked'][0]['resource']=='grain';assert state['market']['locked'][0]['remaining']==3600
        context.close();print('PASS market 10→9 without coins, warehouse pickup and one-hour lock on actual arrival')
    finally:browser.close()
    assert not errors,errors
    assert not failures,failures
    print('PASS construction, paid plans and bonuses without JavaScript or HTTP errors')
