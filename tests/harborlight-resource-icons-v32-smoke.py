"""The actual resource dock uses coherent product art on desktop and phone."""
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright
from helpers.browser_offers import dismiss_player_offers

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
BASE = 'http://127.0.0.1:47462'
OUTPUT = Path(os.environ.get('HARBORLIGHT_GOODS_OUTPUT', '/tmp/harborlight-resource-icons'))
OUTPUT.mkdir(parents=True, exist_ok=True)
PRODUCTS = ['wood','stone','grain','planks','vegetables','livestock','rawMilk','sourMilk','fish','flour','pasteurizedMilk','meat','leather','bread','cake','cheese','civilianClothes','militaryClothes','professorRobes','smokedFish','fishPreserves']

def asset(route):
    file = (ROOT / unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if file.is_relative_to(ROOT) and file.is_file():
        route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='Missing test asset')

reports = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    for width, height in [(1440,1000),(390,844)]:
        page = browser.new_page(viewport={'width':width,'height':height})
        page.route(BASE+'/**',asset)
        errors, failed = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: failed.append(response.url) if response.status>=400 else None)
        page.add_init_script('localStorage.setItem("harborlight-language","pl")')
        page.goto(BASE+'/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5', wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"')
        dismiss_player_offers(page)
        page.evaluate('mobile=>document.querySelector(mobile?"[data-mobile-category=resources]":"#hit-category-resources").click()', width<900)
        scope = '.mobile-bottom-dock .mobile-dock-scroll' if width<900 else '[data-resource-dock]'
        cards = page.locator(scope+' [data-dock-resource]')
        actual = cards.evaluate_all('nodes=>nodes.map(node=>node.dataset.dockResource)')
        assert set(actual)==set(PRODUCTS),(width,'missing product cards',actual)
        positions = cards.evaluate_all('''nodes=>nodes.map(card=>{const art=card.querySelector('.goods-icon'),sprite=art?.querySelector('.goods-icon-sprite'),r=art?.getBoundingClientRect(),s=sprite?.getBoundingClientRect();return {resource:card.dataset.dockResource,icon:art?.dataset.resourceIcon,role:art?.getAttribute('role'),label:art?.getAttribute('aria-label'),background:sprite?getComputedStyle(sprite).backgroundImage:'',position:sprite?getComputedStyle(sprite).backgroundPosition:'',size:s?{w:s.width,h:s.height}:null,frame:r?{w:r.width,h:r.height}:null,oldSvg:!!card.querySelector('svg.resource-dock-illustration')}})''')
        for row in positions:
            assert row['icon']==row['resource'] and row['role']=='img' and row['label'],(width,row)
            assert 'harborlight-goods-v32.png' in row['background'] and not row['oldSvg'],(width,row)
            assert row['size'] and row['size']['w']>30 and row['size']['h']>30,(width,row)
            assert abs(row['size']['w']-row['size']['h'])<1.1,(width,'stretched sprite',row)
            assert row['size']['w']<=row['frame']['w']+1 and row['size']['h']<=row['frame']['h']+1,(width,row)
        assert len({row['position'] for row in positions})==len(PRODUCTS),(width,'duplicate product tiles')
        atlas = page.evaluate('''()=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(new Error('Resource atlas failed to load'));image.src='assets/harborlight-goods-v32.png';})''')
        assert atlas['width']>0 and atlas['height']>0,atlas
        assert page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1')
        page.screenshot(path=str(OUTPUT/f'resources-{width}.png'))
        # The new art keeps normal resource-to-building navigation.
        page.evaluate('scope=>document.querySelector(scope+" [data-dock-resource=flour]").click()',scope)
        assert page.locator('[data-building-panel="windmill"]').count()==1
        assert not errors and not failed,(errors,failed)
        reports.append({'width':width,'products':len(PRODUCTS),'distinct_tiles':len(PRODUCTS),'atlas':atlas,'unmodified_resource_navigation':True,'errors':errors,'failed_http':failed})
        page.close()
    browser.close()
print(json.dumps(reports,ensure_ascii=False))
print('PASS resource art: 21 distinct readable product icons, shared atlas loaded, unstretched desktop/mobile frames and normal building navigation.')
