"""Independent final checks for v13 activity, reservations, sharing and notification filters."""
from datetime import datetime, timedelta, timezone
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json, os, threading
from playwright.sync_api import expect,sync_playwright
ROOT=Path(__file__).resolve().parent.parent;KEY='harborlight-v1-new-player-save'
NOW=datetime(2026,10,23,12,0,tzinfo=timezone.utc)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=os.environ.get('HARBORLIGHT_BASE_URL','http://127.0.0.1:'+str(server.server_port)).rstrip('/')
errors=[];failures=[];requests=[]
def saved(p):
 p.evaluate("window.dispatchEvent(new Event('pagehide'))")
 return json.loads(p.evaluate('key=>localStorage.getItem(key)',KEY))
def visit(browser,mode='idle',mobile=False,motion='reduce'):
 c=browser.new_context(viewport={'width':390 if mobile else 1672,'height':844 if mobile else 941},is_mobile=mobile,has_touch=mobile,reduced_motion=motion)
 p=c.new_page();p.on('pageerror',lambda error:errors.append(str(error)));p.on('response',lambda r:failures.append((r.status,r.url))if r.status>=400 else None)
 p.on('request',lambda request:requests.append(request.url)if 'facebook' in request.url else None)
 p.clock.install(time=NOW-timedelta(seconds=1));p.clock.pause_at(NOW)
 p.goto(BASE+'/harborlight-v1-layered.html?profile=new-player');p.wait_for_function('document.getElementById("loading").hidden')
 data=p.evaluate('''async mode=>{const {createState,act}=await import('./harborlight-v1-state.js');const s=createState(Date.now());
  s.resources={coins:10000,wood:1000,stone:1000,grain:1000,food:1200,planks:1000};
  s.buildings.townhall.level=4;s.buildings.house.level=4;s.buildings.warehouse.level=4;s.buildings.lighthouse.level=1;
  if(mode==='working'){act(s,{type:'assign',building:'farm',delta:1});for(const p of s.residents)if(p.workplace==='farm')p.arrivalRemaining=0;}
  if(mode==='task'){for(const t of s.lighthouseTasks){t.requirements={wood:2,grain:3};t.deposited={wood:0,grain:0};t.reward={coins:100,stone:50};}}
  if(mode==='notifications'){s.notifications=[{id:2,kind:'storage-full',title:'QA storage event',message:'QA full store',read:false,at:0},{id:1,kind:'effect-started',title:'Bonus: QA active effect',message:'QA bonus',read:false,at:0}];s.notificationSequence=2;}
  return JSON.stringify(s);}''',mode)
 p.evaluate('(data)=>sessionStorage.setItem("qa-fixture",data)',data)
 p.add_init_script("if(sessionStorage.getItem('qa-fixture')){localStorage.setItem('"+KEY+"',sessionStorage.getItem('qa-fixture'));sessionStorage.removeItem('qa-fixture');}")
 p.reload();p.wait_for_function('document.getElementById("loading").hidden')
 return c,p
def notifications(p):
 if p.viewport_size['width']<901:
  p.locator('.mobile-island-menu').click();p.get_by_role('button',name='Notifications',exact=True).click()
 else:p.locator('#hit-notifications').click()
def close(p):
 if p.locator('#island-dialog').evaluate('node=>node.open'): p.locator('.dialog-close').click()
with sync_playwright()as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 try:
  c,p=visit(b,'working');assert saved(p)['engagement']['activeUntil']==0
  p.locator('#hit-category-resources').click();s=saved(p);assert s['engagement']['activeUntil']==int(NOW.timestamp()*1000)+300000
  p.clock.fast_forward(600000);s=saved(p)
  assert s['buildings']['farm']['ready']==2,s['buildings']['farm']
  assert abs(s['buildings']['farm']['workProgress'][0]-180)<1e-6,s['buildings']['farm']
  assert s['engagement']['activeUntil']==0,s['engagement']
  assert s['statistics']['taxCollected']==0 and abs(s['taxProgress']-.25)<1e-6,(s['taxProgress'],s['statistics'])
  expect(p.locator('[data-resource-trend="grain"]')).to_have_text('↑ +10 units/h')
  expect(p.locator('[data-resource-trend="food"]')).to_have_text('↓ −12 units/h')
  c.close();print('PASS real pointer activates five-minute boost; offline expiry gives exact 2 units / 180s phase / 0.25 taxes; net rates production minus food')

  c,p=visit(b,'task',mobile=True);p.locator('.mobile-activities').click();p.locator('[data-task-accept]').first.click();expect(p.locator('#task-acceptance')).to_be_visible()
  assert saved(p)['activeTaskId']is None
  p.locator('[data-confirm-task]').click();s=saved(p);task=s['activeTaskId']
  p.locator('[data-task-deposit="'+task+'-wood"]').click();p.locator('[data-task-deposit="'+task+'-grain"]').click()
  expect(p.locator('#task-celebration')).to_be_visible();s=saved(p);assert len(s['taskAchievements'])==1
  earned=s['resources']['coins'];assert s['taskAchievements'][0]['seen']and not s['taskAchievements'][0]['shared']
  p.reload();p.wait_for_function('document.getElementById("loading").hidden');expect(p.locator('#task-celebration')).to_have_count(0)
  notifications(p);p.get_by_role('button',name='Review sharing reward').click();expect(p.locator('#task-celebration')).to_be_visible()
  p.locator('[data-task-share]').click();s=saved(p);assert s['resources']['coins']==earned+500
  p.reload();p.wait_for_function('document.getElementById("loading").hidden');notifications(p);expect(p.get_by_role('button',name='Review sharing reward')).to_have_count(0)
  assert saved(p)['resources']['coins']==earned+500
  c.close();print('PASS completion award stays settled; unresolved share survives reload in Notifications; Share pays exactly500 once without Facebook requests')

  c,p=visit(b,'notifications');notifications(p);expect(p.get_by_text('QA storage event',exact=True)).to_be_visible();close(p)
  p.locator('#hit-settings').click();p.get_by_text('Notification categories',exact=True).click();p.locator('[data-notification-category="storage"]').uncheck();close(p)
  notifications(p);expect(p.get_by_text('QA storage event',exact=True)).to_have_count(0);expect(p.get_by_text('Bonus: QA active effect',exact=True)).to_be_visible()
  assert any(n['title']=='QA storage event'for n in saved(p)['notifications']);close(p)
  p.locator('#hit-settings').click();p.get_by_text('Notification categories',exact=True).click();p.locator('[data-notification-category="storage"]').check();close(p)
  notifications(p);expect(p.get_by_text('QA storage event',exact=True)).to_be_visible()
  c.close();print('PASS category filters hide and restore notifications while preserving complete stored history')

  for motion in ['reduce','no-preference']:
   c,p=visit(b,'idle',motion=motion);p.locator('#hit-category-paths').click();before=saved(p)
   p.locator('[data-road-level="1"]').click();expect(p.locator('.road-success')).to_be_visible();after=saved(p)
   assert after['resources']['stone']==before['resources']['stone']-100
   expect(p.locator('.road-success .celebration-fireworks')).to_have_count(0 if motion=='reduce'else 1)
   p.screenshot(path='/tmp/harborlight-v13-paths-'+motion+'.png');c.close()
  print('PASS real path purchase pays100 stone with visual success; fireworks obey reduced-motion preference')
  c,p=visit(b,'idle')
  names={'townhall':('Town Hall','Ratusz'),'house':('House','Dom'),'farm':('Farm','Gospodarstwo'),'windmill':('Windmill','Młyn'),'quarry':('Quarry','Kamieniołom'),'lumber':('Lumber Camp','Drwale'),'sawmill':('Sawmill','Tartak'),'warehouse':('Warehouse','Magazyn'),'market':('Market','Targ'),'dock':('Harbor','Port'),'chapel':('Chapel','Kaplica'),'lighthouse':('Lighthouse','Latarnia morska')}
  for index,lang in enumerate(['en','pl']):
   if lang=='pl':
    p.locator('#hit-settings').click();p.locator('select[aria-label="Language"]').select_option('pl');close(p)
   for id,titles in names.items():
    p.locator('#hit-dock-'+id).click();expect(p.locator('#dialog-title')).to_have_text(titles[index])
    assert not __import__('re').search(r'\bTaxes?\b|Podat',p.locator('#island-dialog').inner_text(),__import__('re').I)
    assert p.locator('#island-dialog').evaluate('n=>n.scrollWidth<=n.clientWidth'),(lang,id)
    for info in p.locator('[data-section-info]').all():
     if info.is_visible():info.click();info.click()
    close(p)
   p.locator('#hit-category-resources').click()
   for resource,building in {'wood':'lumber','planks':'sawmill','stone':'quarry','grain':'farm','food':'windmill'}.items():
    p.locator('[data-dock-resource="'+resource+'"]').click();expect(p.locator('#dialog-title')).to_have_text(names[building][index]);close(p)
   p.locator('#hit-category-decorations').click();expect(p.locator('[data-attraction]')).to_have_count(5);expect(p.locator('#island-dialog')).not_to_be_visible()
   p.locator('#hit-category-paths').click();expect(p.locator('[data-road-level]')).to_have_count(5);expect(p.locator('#island-dialog')).not_to_be_visible()
   p.locator('#hit-category-buildings').click()
   p.screenshot(path='/tmp/harborlight-v13-all-panels-'+lang+'.png')
   if lang=='pl':
    missing=p.evaluate("async()=>[...(await import('./harborlight-v1-i18n.js?v=frontend-v13')).untranslatedTexts]")
    print('PL untranslated catalogue:',json.dumps(missing,ensure_ascii=False))
  c.close()
  print('PASS EN/PL all12 building titles/info popovers, Resources all5 destinations, Decorations/Paths actualdock, noTaxinformation/nooverflow')
  assert not errors,errors
  assert not failures,failures
  assert not requests,requests
  print('PASS independent v13 acceptance: no JavaScript/HTTP errors or external sharing calls')
 finally:b.close();server.shutdown()
