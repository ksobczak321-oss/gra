"""Accepted map functions, their actual clicks, and the shifted dock agree.

Only the in-memory public level-five preview is used. Nothing is written to an
account, and the original map PNG must remain byte-for-byte unchanged.
"""
import hashlib
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
BASE = 'http://127.0.0.1:47482'
OUTPUT = Path(os.environ.get('HARBORLIGHT_FRONT_OUTPUT', '/tmp/harborlight-accepted-front-v32'))
OUTPUT.mkdir(parents=True, exist_ok=True)

FUNCTIONS = {'townhall','house','farm','lumber','quarry','windmill','sawmill',
             'warehouse','bakery','dairy','slaughterhouse','fisher','leatherworks',
             'academy','barracks','chapel','lighthouse','theatre','market','dock'}
CHANGED = {
    'townhall': [536,273,117,116],
    'sawmill': [714,126,161,155],
    'fisher': [335,525,136,112],
    'barracks': [412,406,133,116],
    'chapel': [1295,162,87,92],
    'leatherworks': [1197,383,91,86],
    'warehouse': [532,565,172,113],
}
# These are the user's approved crops, not generic substitutes for their roles.
ECONOMY_ART = {
    'farm': ('farm',[44,573,250,170]),
    'windmill': ('map',[184,194,191,130]),
    'quarry': ('map',[991,275,260,177]),
    'lumber': ('farm',[1265,105,250,170]),
    'sawmill': ('map',[690,135,225,153]),
    'bakery': ('map',[636,282,138,94]),
    'dairy': ('map',[433,300,129,88]),
    'slaughterhouse': ('farm',[402,327,231,157]),
    'fisher': ('harbor',[155,395,412,280]),
    'leatherworks': ('map',[1178,376,125,85]),
}
CLICK_POINTS = {
    'townhall': [594,331], 'sawmill': [795,204], 'fisher': [403,581],
    'barracks': [473,450], 'chapel': [1338,213],
    'leatherworks': [1242,430], 'warehouse': [620,618],
    'academy': [488,545],
}

assert hashlib.sha256((ROOT/'assets/harborlight-v1-approved.png').read_bytes()).hexdigest() == \
    '4063f003002f95dd7b00f77a8d6d610b04f134766e52afc97e8a10712fd6d823'


def asset(route):
    file = (ROOT/unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if file.is_relative_to(ROOT) and file.is_file():
        route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='Missing accepted-front asset')


def logical_point(page, point):
    return page.evaluate('''([x,y])=>{const stage=document.querySelector('#stage'),r=stage.getBoundingClientRect(),s=r.width/1672;return {x:r.x+x*s,y:r.y+y*s};}''', point)


report = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    for width,height,touch in [(1672,941,False),(1440,1000,False),(390,844,True)]:
        context = browser.new_context(viewport={'width':width,'height':height},has_touch=touch,reduced_motion='reduce')
        context.route(BASE+'/**',asset)
        page = context.new_page()
        page.set_default_timeout(12000)
        errors,failed = [],[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('response',lambda r:failed.append((r.status,r.url)) if r.status>=400 else None)
        page.add_init_script('localStorage.setItem("harborlight-language","pl")')
        page.goto(BASE+'/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5',wait_until='networkidle')
        before = page.evaluate('Object.fromEntries(Object.entries(window.__HARBORLIGHT_DEV_STATE__.buildings).map(([id,b])=>[id,{level:b.level,workers:b.workers||0}]))')
        assert before['townhall']['level']==5
        actual = page.locator('.world-hotspot[id^="hit-world-"]').evaluate_all('nodes=>nodes.map(n=>n.id.slice(10))')
        assert set(actual)==FUNCTIONS and len(actual)==20,actual
        assert page.locator('[data-accepted-map-art]').count()==1
        assert set(page.locator('[data-accepted-artwork]').evaluate_all('nodes=>nodes.map(n=>n.dataset.acceptedArtwork)')) == {'farm','lumber','slaughterhouse','fisher'}
        assert page.locator('[data-accepted-ocean]').count()==1
        for identity,region in CHANGED.items():
            marker=page.locator('#hit-world-'+identity)
            actual=marker.evaluate('(n)=>[parseFloat(n.style.left),parseFloat(n.style.top),parseFloat(n.style.width),parseFloat(n.style.height)]')
            assert actual==region,(identity,actual,region)

        # Real hit-testing catches overlapping areas that programmatic click()
        # would conceal, including the former decorative Leatherworks hut.
        for identity,point in CLICK_POINTS.items():
            region=CHANGED.get(identity,[439,506,98,79])
            page.evaluate('region=>window.dispatchEvent(new CustomEvent("island-tour-focus",{detail:{region}}))',region)
            location=logical_point(page,point)
            top=page.evaluate('p=>document.elementFromPoint(p.x,p.y)?.closest(".world-hotspot")?.id',location)
            assert top=='hit-world-'+identity,(width,identity,top,location)
            if touch:
                page.touchscreen.tap(location['x'],location['y'])
            else:
                page.mouse.move(location['x'],location['y'])
                expect(page.locator('#hit-world-'+identity)).to_have_css('border-top-color','rgba(255, 220, 125, 0.95)')
                page.mouse.click(location['x'],location['y'])
            panel=page.locator(f'[data-v32-panel="{identity}"],[data-building-panel="{identity}"]')
            expect(panel.first).to_be_visible()
            if identity in {'fisher','barracks','leatherworks','academy'}:
                art=panel.locator('[data-map-building-art="'+identity+'"]')
                expect(art.first).to_be_visible()
                assert art.first.locator('svg image').get_attribute('href'),identity
            page.locator('#island-dialog .dialog-close').click()
        page.evaluate('region=>window.dispatchEvent(new CustomEvent("island-tour-focus",{detail:{region}}))',[498,475,60,60])
        decoration=logical_point(page,[530,500])
        top=page.evaluate('p=>document.elementFromPoint(p.x,p.y)?.closest(".world-hotspot")?.id',decoration)
        assert not top,('Old Leatherworks must be decorative',width,top)
        page.mouse.click(decoration['x'],decoration['y'])
        assert page.locator('#island-dialog[open]').count()==0

        checked_categories=[]
        for category in ['administration','economy','resources','decorations','paths']:
            tab=page.locator(f'[data-mobile-category="{category}"]' if touch else '#hit-category-'+category)
            tab.click()
            expect(tab).to_have_attribute('aria-pressed','true')
            checked_categories.append(category)
            if not touch:
                tabs=page.locator('.dock-tabs').bounding_box()
                panel=page.locator('.island-activity-stack').bounding_box()
                assert abs(tabs['x']+tabs['width']-panel['x']-panel['width'])<=1,(width,category,tabs,panel)
                geometry=page.locator('.dock-tabs').evaluate('n=>({left:parseFloat(getComputedStyle(n).left),width:parseFloat(getComputedStyle(n).width)})')
                assert geometry=={'left':474,'width':1190},geometry
                boat=page.locator('#hit-boat').bounding_box()
                assert boat['x']+boat['width']+1<tabs['x'],('Ship hidden',boat,tabs)
            if category in ['administration','economy']:
                scope='.mobile-bottom-dock .mobile-dock-scroll' if touch else '[data-building-dock]'
                cards=page.locator(scope+' [data-dock-building]:visible')
                assert cards.count()==(9 if category=='administration' else 10)
                for card in cards.all():
                    identity=card.get_attribute('data-dock-building')
                    art=card.locator('[data-map-building-art="'+identity+'"]')
                    assert art.count()==1,(category,identity)
                    if category=='economy':
                        source,rect=ECONOMY_ART[identity]
                        assert art.get_attribute('data-map-art-source')==source,(identity,art.get_attribute('data-map-art-source'))
                        assert json.loads(art.get_attribute('data-map-art-rect'))==rect,identity
                    assert art.locator('svg').get_attribute('preserveAspectRatio')=='xMidYMid slice'
                if not touch:
                    bands=cards.evaluate_all('nodes=>nodes.map(n=>({level:n.querySelector(".building-dock-level").getBoundingClientRect().top,art:n.querySelector("[data-map-building-art]").getBoundingClientRect().top}))')
                    assert max(b['level'] for b in bands)-min(b['level'] for b in bands)<1.1,bands
                    assert all(b['level']<=b['art'] for b in bands),bands
                page.mouse.move(width-3,5)
                page.screenshot(path=str(OUTPUT/f'{category}-{width}.png'))
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        after = page.evaluate('Object.fromEntries(Object.entries(window.__HARBORLIGHT_DEV_STATE__.buildings).map(([id,b])=>[id,{level:b.level,workers:b.workers||0}]))')
        assert before==after,'Visual remapping changed levels or worker assignments'
        assert not errors,errors
        assert not failed,failed
        assert page.evaluate('Object.keys(localStorage)')==['harborlight-language']
        assert page.evaluate('Object.keys(sessionStorage)')==[]
        report.append({'width':width,'functions':20,'physical_map_clicks':8,'old_leatherworks_decorative':True,'all_tabs':checked_categories,'matching_economy_art':10,'levels_workers_unchanged':True,'right_edges_aligned':not touch,'errors':errors})
        context.close()
    browser.close()
(OUTPUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
print('PASS accepted front: 20 functions, physical clicks, decoration, source-matched thumbnails, shared right edge, visible ship and unchanged levels/workers; desktop/mobile.')
