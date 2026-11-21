"""Real repeated clicks keep controls still as feedback appears.

Uses isolated ordinary worlds and the real assignment actions/rendering.
Three same-coordinate mouse clicks cover old producers, Warehouse and new panels.
"""
import json,mimetypes,os,subprocess,sys
from pathlib import Path
from urllib.parse import unquote,urlsplit
from playwright.sync_api import sync_playwright
from helpers.browser_offers import dismiss_player_offers, acknowledge_daily_offer
SOURCE=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',SOURCE)).resolve()
BASE='http://127.0.0.1:47448'
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import {createState} from './harborlight-v1-state.js';
const s=createState(Date.now(),{ruleset:32});s.settings.language='pl';s.tutorial.autoOpenDisabled=true;s.tutorial.rewardDisabled=true;
s.buildings.townhall.level=5;s.buildings.house.level=5;s.buildings.warehouse.level=5;
for(const b of Object.values(s.buildings))b.level=Math.max(1,b.level);
console.log(JSON.stringify(s));
"""],cwd=SOURCE))
acknowledge_daily_offer(fixture)
assets={}
def asset(route):
 file=(ROOT/unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
 if file.is_relative_to(ROOT) and file.is_file():
  if file not in assets:assets[file]=file.read_bytes()
  route.fulfill(body=assets[file],content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
 else:route.fulfill(status=404,body='Missing fixture asset')
reports=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 for width,height in [(1440,1000),(390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height});page.route(BASE+'/**',asset)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(fixture))
  page.goto(BASE+'/harborlight-v1-layered.html?profile=new-player',wait_until='networkidle')
  page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"')
  dismiss_player_offers(page)
  print('Loaded',width,flush=True)
  for building in ['farm','warehouse','dairy']:
   print('Checking',width,building,flush=True)
   page.evaluate('id=>document.querySelector("#hit-world-"+id).click()',building)
   selector='[data-worker-building="'+building+'"][data-worker-delta="1"]'
   read="""args=>{const button=document.querySelector(args.selector),r=button.getBoundingClientRect(),body=document.querySelector('#island-dialog .dialog-body'),notice=document.querySelector('#island-dialog .dialog-header [data-panel-notice]');return {workers:window.__HARBORLIGHT_DEV_STATE__.buildings[args.building].workers,rect:{x:r.x,y:r.y,width:r.width,height:r.height},scroll:body.scrollTop,message:notice?.innerText||'',bodyNotices:body.querySelectorAll('[data-panel-notice]').length}}"""
   initial=page.evaluate(read,{'selector':selector,'building':building})
   rect=initial['rect']
   assert initial['workers']==0,(width,building,'fixture starts with no assignment')
   assert 0<rect['y']<height-rect['height'],(width,building,'worker button outside viewport',rect)
   for click in range(3):
    page.mouse.click(rect['x']+rect['width']/2,rect['y']+rect['height']/2)
    current=page.evaluate(read,{'selector':selector,'building':building})
    print('  Click',click+1,'assigned',current['workers'],flush=True)
    assert current['workers']==click+1,(width,building,click,'real click did not assign',current)
    assert all(abs(current['rect'][k]-rect[k])<1.1 for k in ['x','y','width','height']),(width,building,click,initial,current)
    assert abs(current['scroll']-initial['scroll'])<1.1,(width,building,'scroll changed')
    assert current['message'].strip(),(width,building,'missing header feedback')
    assert current['bodyNotices']==0,(width,building,'feedback still moves the body')
   assert not errors,errors
   reports.append({'width':width,'building':building,'rapid_clicks':3,'assigned':3,'position_and_scroll_unchanged':True,'header_feedback':current['message']})
   page.evaluate('document.querySelector("#island-dialog .dialog-close").click()')
  page.close()
 browser.close()
print(json.dumps(reports,ensure_ascii=False))
print('PASS stable worker assignment: 6 representative building/viewport cases, 18 repeated real mouse clicks, header feedback without control or scroll movement.')
