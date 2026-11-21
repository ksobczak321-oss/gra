"""Reviewed purple text is visible in the actual production/research interface."""
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote,urlsplit
from playwright.sync_api import expect,sync_playwright
from helpers.browser_offers import dismiss_player_offers

SOURCE=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',SOURCE)).resolve()
BASE='http://127.0.0.1:47492'
OUTPUT=Path(os.environ.get('HARBORLIGHT_TEST_OUTPUT','/tmp/harborlight-purple-editorial'))
OUTPUT.mkdir(parents=True,exist_ok=True)
def asset(route):
    assert route.request.method=='GET',route.request.url
    file=(ROOT/unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if file.is_relative_to(ROOT) and file.is_file():route.fulfill(path=str(file),content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
    else:route.fulfill(status=404,body='Missing editorial UI asset')

report=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for width,height in [(1440,1000),(390,844)]:
        context=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce')
        context.route(BASE+'/**',asset)
        page=context.new_page();errors=[];failed=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('response',lambda r:failed.append((r.status,r.url)) if r.status>=400 else None)
        page.add_init_script('localStorage.setItem("harborlight-language","pl")')
        page.goto(BASE+'/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5',wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.gameStartup==="ready"',timeout=20000)
        dismiss_player_offers(page)
        def open_building(identity):
            popup=page.locator('#island-dialog[open]')
            if popup.count():popup.locator('.dialog-close').click()
            page.locator('#hit-world-'+identity).evaluate('(e)=>e.click()')
            expect(page.locator('#island-dialog')).to_be_visible()
        for building,product,snippet in [('farm','grain','Produkt żywnościowy I kategorii; sytość: 1 punkt na porcję.'),('slaughterhouse','meat','2 porcje żywca → 2 porcje mięsa.'),('windmill','flour','4 porcje zboża → 1 porcja mąki.')]:
            open_building(building)
            detail=page.locator(f'[data-v32-product-description="{product}"]')
            detail.locator('summary').click()
            expect(detail).to_contain_text(snippet)
            expect(detail.locator('p')).to_be_visible()
        open_building('slaughterhouse')
        expect(page.locator('#island-dialog')).to_contain_text('wolne miejsce na gotowe produkty w magazynie lokalnym')
        open_building('academy')
        expect(page.locator('#island-dialog')).to_contain_text('w polu „Adept”')
        topic=page.locator('#island-dialog select').filter(has=page.locator('option[value="lumber"]'))
        topic.select_option('lumber')
        expect(page.locator('#island-dialog')).to_contain_text('za każdy ukończony poziom tego badania')
        expect(page.locator('#island-dialog')).to_contain_text('Poziom 1 daje +5%, a poziom 2 +10%')
        page.screenshot(path=str(OUTPUT/f'research-{width}.png'))
        open_building('barracks')
        expect(page.locator('#island-dialog')).to_contain_text('bez ukończonej Akademii, który nie jest obecnie na nauce ani szkoleniu')
        open_building('warehouse')
        page.locator('[data-warehouse-section-toggle="feeding"]').click()
        expect(page.locator('#island-dialog')).to_contain_text('Po wykorzystaniu ilość nie odnawia się sama')
        page.locator('[data-v32-food-product-guide]>summary').click()
        sour=page.locator('[data-v32-product-description="sourMilk"]')
        sour.locator('summary').click()
        expect(sour.locator('p')).to_be_visible()
        expect(sour).to_contain_text('0,5 punktu na porcję')
        assert not errors,errors
        assert not failed,failed
        assert page.evaluate('Object.keys(localStorage)')==['harborlight-language']
        assert page.evaluate('Object.keys(sessionStorage)')==[]
        report.append({'width':width,'actual_products':4,'research_effect':True,'academy_and_barracks_help':True,'food_help':True,'errors':errors})
        context.close()
    browser.close()
(OUTPUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
print('PASS purple editorial actual UI: product details, sour milk, research level example, Academy/Barracks and meal instructions; desktop/mobile, no account writes.')
