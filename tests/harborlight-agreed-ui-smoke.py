"""Browser acceptance checks for the confirmed Excel 6 mechanics.

Run a static server at repository root and set HARBORLIGHT_BASE_URL if needed:
    HARBORLIGHT_BASE_URL=http://127.0.0.1:8002 python3 tests/harborlight-agreed-ui-smoke.py
Fixtures establish a progressed island; all checked actions use actual controls.
"""
from collections import deque
from datetime import datetime, timezone
import json
import os
from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get('HARBORLIGHT_BASE_URL', 'http://127.0.0.1:8002').rstrip('/')
CHROMIUM = os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium')
KEY = 'harborlight-v1-interactive-save'
PATH = '/harborlight-v1-layered.html'


def employment_tax_rate(page):
    # Tax remains an engine rule although the UI no longer displays it.
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    return page.evaluate("""async key => {
      const {taxRate} = await import('./harborlight-v1-state.js');
      return taxRate(JSON.parse(localStorage.getItem(key)));
    }""", 'harborlight-v1-interactive-save')


def assert_storage(page, building, current, capacity, next_capacity):
    for selector, value in [('data-local-current', current), ('data-local-capacity', capacity), ('data-local-next', next_capacity)]:
        expect(page.locator(f'[{selector}="{building}"]')).to_have_text(format(value, ','))


def visit(page):
    response = page.goto(BASE + PATH)
    assert response and response.ok
    page.wait_for_selector('.island-activity-stack .activity-task')
    page.wait_for_function("document.getElementById('loading').hidden")
    expect(page.locator('.slice canvas')).to_have_count(9)


def saved(page):
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    return json.loads(page.evaluate('(key) => localStorage.getItem(key)', KEY))


def close(page):
    page.locator('.dialog-close').click()
    expect(page.locator('#island-dialog')).not_to_be_visible()


def fixture(page):
    raw=page.evaluate("""async key => {
      const {createState} = await import('./harborlight-v1-state.js');
      const state = createState();
      for (const [id,b] of Object.entries(state.buildings)) { b.level=id==='lighthouse'?1:id==='farm'?3:4; b.workers=0; }
      state.resources={coins:100000,wood:2000,stone:2000,grain:2000,food:2000,planks:2000};
      state.previewBuildStockVersion='frontend-v10';
      state.residents.forEach(person=>{person.workplace=null;person.arrivalRemaining=0;person.returnRemaining=0;});
      state.lastSimulatedAt=Date.now();state.worldTimeMs=Date.now();state.savedAt=Date.now();
      return JSON.stringify(state);
    }""", KEY)
    page.add_init_script("localStorage.setItem("+json.dumps(KEY)+","+json.dumps(raw)+");")
    visit(page)


def solve_misty():
    grid=['S..T..','.WWT..','.W.TC.','.W....','.TTTW.','...W.G']
    obstacles={(r,c):i for i,(r,c) in enumerate((r,c) for r,line in enumerate(grid) for c,tile in enumerate(line) if tile in 'WTR')}
    initial=(0,0,1,1,0,0)
    queue=deque([(initial,[])])
    seen={initial}
    while queue:
        current,path=queue.popleft()
        r,c,bridge,axe,dynamite,cleared=current
        if grid[r][c]=='G':return path
        for dr,dc in [(1,0),(0,1),(-1,0),(0,-1)]:
            nr,nc=r+dr,c+dc
            if not(0<=nr<6 and 0<=nc<6):continue
            tile=grid[nr][nc];tools=[bridge,axe,dynamite];new_cleared=cleared
            if tile in 'WTR':
                bit=1<<obstacles[nr,nc]
                if not cleared&bit:
                    index='WTR'.index(tile)
                    if not tools[index]:continue
                    tools[index]-=1;new_cleared|=bit
            following=(nr,nc,*tools,new_cleared)
            if following not in seen:
                seen.add(following);queue.append((following,path+[(nr,nc)]))
    raise AssertionError('Misty map has no legal route')


with sync_playwright() as playwright:
    browser=playwright.chromium.launch(executable_path=CHROMIUM,headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1672,'height':941},reduced_motion='reduce')
    page=context.new_page();errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.clock.install(time=datetime.now(timezone.utc))
    visit(page)
    expect(page.locator('.activity-task')).to_have_count(3)
    page.screenshot(path='/tmp/harborlight-agreed-desktop.png')
    expect(page.locator('#hit-pause,#hit-play,#hit-speed')).to_have_count(0)
    expect(page.locator('[data-hud="population"]')).to_have_text('12 / 24')
    expect(page.locator('[data-hud="taxes"]')).to_have_count(0)
    assert employment_tax_rate(page) == 0
    assert all(person['workplace'] is None for person in saved(page)['residents'])

    # First specific task click locks the early reward before any contribution.
    page.locator('.activity-task-button').first.click()
    expect(page.locator('[data-task-accept]').first).to_have_text('Active · bonus ×3')
    initial=saved(page);task=initial['lighthouseTasks'][0]
    resource=next(iter(task['requirements']))
    field=page.locator(f'[data-task-input="{task["id"]}-{resource}"]')
    field.fill('1')
    page.locator(f'[data-task-deposit="{task["id"]}-{resource}"]').click()
    assert saved(page)['lighthouseTasks'][0]['deposited'][resource]==1
    expect(page.get_by_text('Deposited goods cannot be withdrawn.',exact=False).first).to_be_visible()
    close(page)

    # A worker walks for five real minutes; taxes and production start on arrival.
    page.locator('#hit-world-farm').click()
    page.locator('[data-worker-building="farm"][data-worker-delta="1"]').click()
    expect(page.locator('[data-worker-count="farm"]')).to_have_text('1')
    expect(page.locator('[data-worker-limit="farm"]')).to_have_text('12')
    expect(page.locator('[data-workplace-tax="farm"]')).to_have_count(0)
    assert employment_tax_rate(page) == 0
    expect(page.locator('[data-work-progress="farm"]')).to_contain_text('Workers arrive')
    page.clock.fast_forward(300000)
    expect(page.locator('[data-workplace-tax="farm"]')).to_have_count(0)
    assert employment_tax_rate(page) == 1
    page.clock.fast_forward(360000)
    assert saved(page)['buildings']['farm']['ready']>=1
    page.locator('[data-worker-building="farm"][data-worker-delta="-1"]').click()
    expect(page.locator('[data-workplace-tax="farm"]')).to_have_count(0)
    assert employment_tax_rate(page) == 0
    assert saved(page)['residents'][-1]['returnRemaining']>0
    close(page)

    # Individual House allocation spends one point without removing other rules.
    page.locator('#hit-world-house').click()
    before=saved(page)['houseHappinessPool']['points']
    page.locator('[data-house-allocate]').click()
    assert saved(page)['houseHappinessPool']['points']==before-1
    page.locator('[data-resident-roster] summary').click()
    expect(page.locator('[data-resident-id]')).to_have_count(12)
    close(page)

    # Proven puzzle wins yield a coin pot only, then explicit cash-out.
    before=saved(page)['resources'].copy()
    page.locator('.activity-expedition').first.click()
    for row,col in solve_misty():page.locator(f'.puzzle-cell[data-row="{row}"][data-col="{col}"]').click()
    expect(page.locator('[data-expedition-cashout="misty"]')).to_have_text('Cash out 50 coins')
    assert saved(page)['resources']['coins']==before['coins']
    page.locator('[data-expedition-cashout="misty"]').click()
    after=saved(page)['resources']
    assert after['coins']==before['coins']+50
    for material in ['wood','stone','grain','planks']:assert after[material]==before[material]
    close(page)

    fixture(page)
    # Home-only visitor selection, four-hour visit, separate free-entry quota.
    page.locator('#hit-world-lighthouse').click()
    expect(page.get_by_text('Rolling 24-hour entries:',exact=False)).to_contain_text('2 free + 0 paid')
    expect(page.locator('[data-buy-visit-package]')).to_contain_text('600 coins')
    page.locator('.visit-resident-picker input').first.check()
    page.locator('[data-send-visit]').click()
    data=saved(page)
    assert len(data['lighthouseVisits'])==1 and len(data['lighthouseVisits'][0]['residentIds'])==1
    assert data['lighthouseVisits'][0]['remaining']>14390
    expect(page.get_by_text('Rolling 24-hour entries:',exact=False)).to_contain_text('1 free + 0 paid')
    page.locator('[data-buy-visit-package]').click()
    expect(page.get_by_text('Rolling 24-hour entries:',exact=False)).to_contain_text('1 free + 2 paid')
    expect(page.locator('[data-buy-visit-package]')).to_contain_text('900 coins')
    close(page)

    # Premium purchase is shown with a concrete quote and a fixed ten-second build.
    page.locator('#hit-world-farm').click()
    expect(page.locator('[data-premium-buy="farm"]')).to_be_enabled()
    before=saved(page)['resources'].copy()
    page.locator('[data-premium-buy="farm"]').click()
    after=saved(page)
    assert after['resources']['coins']<before['coins']
    for resource in ['wood','stone','grain','planks']:assert after['resources'][resource]==before[resource]
    project=next(p for p in after['constructionProjects'] if p['building']=='farm')
    assert project['stage']=='building' and 0<project['buildRemaining']<=10
    expect(page.locator('[data-project-materials]')).to_have_count(1)
    page.clock.fast_forward(10000)
    expect(page.locator('[data-production-summary="farm"] .stat strong').first).to_have_text('4')
    close(page)

    # Package duration/price are explicit. Credits buy another full day.
    page.locator('#hit-settings').click()
    page.get_by_role('button',name='Premium options',exact=True).click()
    expect(page.locator('[data-construction-package]')).to_contain_text('4,000 coins')
    page.locator('[data-construction-package]').click()
    first_expiry=saved(page)['premium']['expiresAt']
    page.locator('[data-construction-package]').click()
    assert saved(page)['premium']['expiresAt']==first_expiry+86400000
    close(page)

    # Both trade surfaces are reachable with all approved stages and no console errors.
    page.locator('#hit-world-market').click()
    page.locator('[data-market-order="wood"]').click()
    expect(page.locator('[data-premium-route="marketInbound"]')).to_have_count(1)
    page.locator('[data-premium-route="marketInbound"]').click()
    expect(page.locator('[data-market-locked="wood"]')).to_have_text('10')
    close(page)
    page.locator('#hit-boat').click()
    expect(page.get_by_role('button',name='Buy 100 for 50 coins',exact=True)).to_have_count(3)
    page.get_by_role('button',name='Buy 100 for 50 coins',exact=True).first.click()
    expect(page.get_by_text('Stage: voyage',exact=False)).to_be_visible()
    close(page)

    # Account is a real route, while authentication providers remain a separate UI.
    page.locator('#hit-account').click()
    page.wait_for_url('**/harborlight-auth.html')
    assert not errors,errors
    context.close()

    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
    page=mobile.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
    visit(page)
    page.locator('.mobile-activities').click()
    expect(page.locator('#dialog-title')).to_have_text('Tasks')
    page.screenshot(path='/tmp/harborlight-agreed-mobile.png')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    bounds=page.locator('#island-dialog').bounding_box()
    assert bounds and bounds['x']>=0 and bounds['x']+bounds['width']<=391
    close(page)
    page.locator('.mobile-island-menu').click()
    page.locator('#island-dialog').get_by_role('button',name='Sign in or create an account',exact=True).click()
    page.wait_for_url('**/harborlight-auth.html')
    assert not errors,errors
    mobile.close();browser.close()
    print('PASS: confirmed mechanics UI, real-time travel, tasks, House, expeditions, visits, Premium, trade, account, mobile')
