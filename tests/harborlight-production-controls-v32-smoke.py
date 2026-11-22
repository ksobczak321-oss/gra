"""Real building menus: product-description alignment and farm staff transfers."""
import json
import mimetypes
import os
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright
from helpers.browser_offers import dismiss_player_offers, acknowledge_daily_offer

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
OUT = Path(os.environ.get('HARBORLIGHT_PRODUCTION_QA_OUTPUT', '/tmp/harborlight-production-controls'))
BASE = 'http://127.0.0.1:47478'
PRODUCERS = ['farm','windmill','lumber','quarry','sawmill','bakery','dairy','slaughterhouse','fisher','leatherworks']
fixture = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', """
import {createState,act} from './harborlight-v1-state.js';
const s=createState(Date.now(),{ruleset:32});s.settings.language='pl';s.tutorial.autoOpenDisabled=true;
s.buildings.townhall.level=6;s.buildings.house.level=6;s.buildings.warehouse.level=6;
for(const id of ['farm','windmill','lumber','quarry','sawmill','bakery','dairy','slaughterhouse','fisher','leatherworks'])s.buildings[id].level=5;
for(let n=0;n<10;n++){const r=act(s,{type:'assign',building:'farm',delta:1});if(!r.ok)throw Error(r.message);}
console.log(JSON.stringify(s));
"""], cwd=SOURCE))
acknowledge_daily_offer(fixture)

def asset(route):
    if not route.request.url.startswith(BASE+'/'):
        route.abort();return
    target = (ROOT/unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
    if not target.is_relative_to(ROOT) or not target.is_file():
        route.fulfill(status=404,body='Missing isolated fixture asset');return
    if target.name == 'harborlight-v1-play.js':
        route.fulfill(content_type='text/javascript',body=target.read_text()+"\nwindow.__productionOpen=id=>openPanel('building',id);")
    else:
        route.fulfill(path=str(target),content_type=mimetypes.guess_type(target)[0] or 'application/octet-stream')

OUT.mkdir(parents=True,exist_ok=True)
reports=[]
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for width,height,language in [(1440,1000,'pl'),(390,844,'pl'),(1440,1000,'en'),(390,844,'en')]:
        page=browser.new_page(viewport={'width':width,'height':height});page.route('**/*',asset)
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        current=json.loads(json.dumps(fixture));current['settings']['language']=language
        page.add_init_script('localStorage.setItem("harborlight-language",'+json.dumps(language)+');window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(current))
        page.goto(BASE+'/harborlight-v1-layered.html',wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"')
        dismiss_player_offers(page)
        rows=0
        for building in PRODUCERS:
            page.evaluate('id=>window.__productionOpen(id)',building)
            dialog=page.locator('#island-dialog');dialog.wait_for(state='visible')
            assert dialog.locator('.dialog-body').evaluate('e=>e.scrollWidth<=e.clientWidth+1'),(width,language,building,'overflow')
            geometry=dialog.locator('.v32-recipe').evaluate_all('''nodes=>nodes.map(e=>{const f=e.querySelector('[data-v32-workers]'),a=e.querySelector('.v32-recipe-assign'),d=e.querySelector('details:last-of-type');const b=x=>{const r=x.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height,width:r.width}};return{field:b(f),action:b(a),description:d?b(d):null}})''')
            assert geometry,(width,language,building,'missing recipes')
            for item in geometry:
                field,action=item['field'],item['action'];rows+=1
                assert abs(field['bottom']-action['bottom'])<1.1,(width,language,building,item)
                assert abs(field['height']-44)<1.1 and abs(action['height']-44)<1.1,(width,language,building,item)
                if width>600 and item['description']:
                    assert abs(field['bottom']-item['description']['bottom'])<1.1,(width,language,building,item)
                    assert abs(item['description']['height']-44)<1.1,(width,language,building,item)
            if building=='windmill':page.screenshot(path=str(OUT/f'mill-{width}-{language}.png'))
            dialog.locator('.dialog-close').click()
        page.evaluate("window.__productionOpen('farm')")
        grain=page.locator('[data-v32-workers="farmGrain"]');vegetables=page.locator('[data-v32-workers="farmVegetables"]')
        assert grain.input_value()=='5' and vegetables.input_value()=='5'
        page.locator('[data-recipe="farmVegetables"][data-v32-product-worker-step="1"]').click()
        page.wait_for_function('document.querySelector("[data-v32-workers=farmVegetables]").value==="6"')
        assert grain.input_value()=='4' and vegetables.input_value()=='6'
        page.locator('[data-recipe="farmGrain"][data-v32-product-worker-step="1"]').click()
        page.wait_for_function('document.querySelector("[data-v32-workers=farmGrain]").value==="5"')
        assert vegetables.input_value()=='5'
        assert page.evaluate('window.__HARBORLIGHT_DEV_STATE__.buildings.farm.workers')==10
        assert not errors,errors
        reports.append({'width':width,'language':language,'production_rows':rows,'baseline_and_height':True,'farm_transfers_preserve_crew':True,'account_writes':0})
        page.close()
    browser.close()
(OUT/'report.json').write_text(json.dumps({'status':'PASS','contexts':reports},indent=2))
print(json.dumps(reports))
print('PASS production menus: aligned descriptions/fields/actions, four PL/EN desktop/mobile contexts, actual farm transfers.')
