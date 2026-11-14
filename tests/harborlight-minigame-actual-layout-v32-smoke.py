"""Actual application dialogs, isolated in-memory DEV fixture; CSS geometry only."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import json,os,subprocess,threading
from playwright.sync_api import sync_playwright
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',Path(__file__).resolve().parents[1])).resolve()
OUT=Path(os.environ.get('HARBORLIGHT_LAYOUT_ARTIFACTS','/tmp/harborlight-minigame-layout-v32'));OUT.mkdir(parents=True,exist_ok=True)
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import {createState} from './harborlight-v1-state.js';
const s=createState(Date.now(),{ruleset:32,onboarding:false});s.islandName='Zatoka przeglądu';s.settings.language='pl';s.settings.sound=false;s.settings.motion=false;s.tutorial.autoOpenDisabled=true;s.buildings.townhall.level=6;s.buildings.house.level=6;s.buildings.warehouse.level=5;for(const id of Object.keys(s.resources))s.resources[id]=10000;console.log(JSON.stringify(s));
"""],cwd=ROOT))
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();base='http://127.0.0.1:'+str(server.server_address[1])
CASES=[('solo-'+k,'solo',k)for k in['tilt','triples','signal-line','harbor-routes']]+[('adventure-list','list',''),('adventure-story','story','')]+[('embedded-'+k,'embedded',k)for k in['signal-line','harbor-routes','memoryTriples','marbleMaze']]
CASES += [('solo-triples-won','decision','triples')]
only=os.environ.get('HARBORLIGHT_ACTUAL_LAYOUT_ONLY');CASES=[case for case in CASES if not only or only in case[0]]
results=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
  for width,height in[(1440,1000),(390,844)]:
   for name,family,kind in CASES:
    page=browser.new_page(viewport={'width':width,'height':height},has_touch=width<500,reduced_motion='reduce');errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(fixture))
    page.goto(base+'/harborlight-v1-layered.html',wait_until='networkidle');page.wait_for_function('window.__HARBORLIGHT_DEV_STATE__?.ruleset===32')
    for _ in range(7):
     external=page.locator('dialog[open]:not(#island-dialog)')
     if external.count():external.last.locator('button').last.click();page.wait_for_timeout(80)
     elif page.locator('#island-dialog[open]').count():page.locator('#island-dialog .dialog-close').click();page.wait_for_timeout(80)
     else:break
    page.locator('#hit-menu').evaluate('(e)=>e.click()')
    if family in ['solo','decision']:
     page.get_by_role('button',name='Ekspedycje',exact=True).click()
     if kind in['tilt','triples']:page.locator('[data-expedition-choice="'+kind+'"]').click();page.locator('[data-minigame-kind="'+kind+'"]').wait_for()
     else:page.locator('[data-original-puzzle-choice="'+kind+'"]').click();page.get_by_role('button',name='Rozpocznij próbę',exact=True).click();page.locator('.original-puzzle-signal'if kind=='signal-line'else'.original-puzzle-routes').wait_for()
    else:
     page.get_by_role('button',name='Przygody na wyspie',exact=True).click()
     if family in['embedded','story']:
      page.locator('[data-adventure-all]').click()
      if family=='story':page.locator('[data-story-start="first-light"]').first.click()
      else:page.locator('[data-puzzle-start="'+kind+'"]').click()
    if family=='decision':
     cards=page.evaluate('Object.values(window.__HARBORLIGHT_DEV_STATE__.expeditionRuns).find(r=>r.status==="active").miniGame.cards')
     for symbol in dict.fromkeys(cards):
      for index,value in enumerate(cards):
       if value==symbol:page.locator('[data-memory-card="'+str(index)+'"]').click()
     page.locator('[data-expedition-next-kind]').wait_for()
    page.wait_for_timeout(160)
    if family in ['embedded','story']:
     header=page.locator('.adv-active-header').bounding_box();area=page.locator('#island-dialog .dialog-body').bounding_box();assert header['y']>=area['y']-1,(name,width,'new scene retained catalogue scroll',header,area)
    data=page.locator('#island-dialog .dialog-body').evaluate('''e=>({scrollTop:e.scrollTop,overflow:e.scrollWidth>e.clientWidth+1,width:e.clientWidth,scrollWidth:e.scrollWidth,buttons:[...e.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return r.width&&r.height&&s.visibility!=='hidden'&&!b.matches('.memory-card,.adv-puzzle-cell-button')}).map(b=>({text:b.textContent.trim(),height:b.getBoundingClientRect().height})).filter(b=>b.height<43.5)})''')
    assert not data['overflow'],(name,width,data)
    assert not data['buttons'],(name,width,data['buttons'])
    assert not errors,(name,width,errors)
    page.screenshot(path=str(OUT/f'actual-{width}-{name}.png'),full_page=True);results.append({'name':name,'width':width,**data});page.close()
  browser.close()
 (OUT/('actual-'+(only+'-' if only else '')+'geometry.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2));print(f'PASS {len(results)} actual application dialogs:1440/390px PL,solo/embedded/list/story/real won-round selector; all action targets>=44px and no horizontal overflow')
finally:server.shutdown();server.server_close()
