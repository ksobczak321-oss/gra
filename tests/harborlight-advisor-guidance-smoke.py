"""Actual visual guidance DOM: map first, then exact user-operated controls.

Only the guidance module/CSS is hosted here. Tiny UI adapters represent confirmed
model values and failed/pending writes; no game account, time or reward is used.
Full application integration has a separate acceptance scenario.
"""
import json,mimetypes,os,tempfile
from pathlib import Path
from urllib.parse import unquote,urlsplit
from playwright.sync_api import expect,sync_playwright
SOURCE=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',SOURCE)).resolve()
ORIGIN='http://127.0.0.1:47452'
OUT=Path(os.environ.get('HARBORLIGHT_TEST_OUTPUT',str(Path(tempfile.gettempdir())/'harborlight-advisor-guidance')))
OUT.mkdir(parents=True,exist_ok=True)
DOCUMENT='''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/harborlight-v1-advisor-guidance.css"><style>
body{margin:0;background:#143a4b;color:#e5f0f4;font:14px system-ui}#map{display:flex;gap:14px;flex-wrap:wrap;padding:130px 18px 0}#map button{width:100px;height:64px}button,input{font:inherit;min-height:34px}dialog{position:fixed;inset:0;width:min(650px,calc(100vw - 32px));max-height:calc(100dvh - 40px);overflow:auto;border:1px solid #e3c578;border-radius:10px;background:#143a4b;color:white;padding:15px;box-sizing:border-box}dialog button{margin:4px}.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.v32-food-row{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.v32-food-row input[type=number]{width:70px}[hidden]{display:none!important}#island-dialog h2{margin:0 0 10px}.body{min-height:180px}#spacer{height:30px}
</style></head><body><nav id="map"></nav><dialog id="island-dialog"></dialog><dialog id="other"><button>Other modal</button></dialog><script type="module">
import {createAdvisorGuidance} from './harborlight-v1-advisor-guidance.js';
const f=window.fixture={panel:null,confirmed:true,accept:true,key:'user1:gen2:island1',completed:[],cancelled:[],unavailable:[],reveals:[],reads:0,state:{workers:0,recipe:0,food:false,limit:0,priority:false,happiness:4},fields:{food:false,limit:0},section:null};
const dialog=document.getElementById('island-dialog');
const buttons={farm:'Farm',warehouse:'Warehouse',house:'House',academy:'Academy',expeditions:'Minigames'};
for(const [id,name] of Object.entries(buttons)){const b=document.createElement('button');b.id='map-'+id;b.textContent=name;b.addEventListener('click',()=>f.open(id==='expeditions'&&f.useMenu?'menu':id));document.getElementById('map').append(b);}
f.render=()=>{
 const id=f.panel?.id||'expeditions';
 dialog.innerHTML='<h2>'+id+'</h2><div class="body" data-building-panel="'+id+'"></div><button id="close-panel" type="button">Close</button>';
 const body=dialog.querySelector('.body');dialog.querySelector('#close-panel').addEventListener('click',()=>{dialog.close();f.panel=null;f.guide.update()});
 if(id==='farm'){
  body.innerHTML='<span data-worker-count="farm">'+f.state.workers+'</span><div class="row"><button data-worker-building="farm" data-worker-delta="-1">−</button><button data-worker-building="farm" data-worker-delta="1">+</button></div><form id="recipe"><label>Grain<input type="number" min="0" max="'+f.state.workers+'" data-v32-workers="farmGrain" value="'+f.state.recipe+'"></label><button type="submit">Assign grain</button></form><form id="other-recipe"><input type="number" data-v32-workers="farmVegetables" value="0"><button type="submit">Assign vegetables</button></form>';
  for(const b of body.querySelectorAll('[data-worker-delta]'))b.addEventListener('click',()=>{f.state.workers+=Number(b.dataset.workerDelta);f.render()});
  body.querySelector('#recipe').addEventListener('submit',e=>{e.preventDefault();if(f.accept){f.state.recipe=Number(e.target.querySelector('input').value);f.render();}});
  body.querySelector('#other-recipe').addEventListener('submit',e=>e.preventDefault());
 }else if(id==='warehouse'){
  body.innerHTML='<button data-warehouse-section-toggle="priorities" aria-expanded="'+(f.section==='priorities')+'">Transport priorities</button><button data-warehouse-section-toggle="feeding" aria-expanded="'+(f.section==='feeding')+'">Feeding</button><div data-warehouse-section="priorities" '+(f.section==='priorities'?'':'hidden')+'><button data-warehouse-priority="grain">Grain priority</button><button data-warehouse-priority="wood">Wood priority</button></div><div data-warehouse-section="feeding" '+(f.section==='feeding'?'':'hidden')+'><form id="food"><div data-v32-food="grain" class="v32-food-row"><label>Grain<input type="checkbox" '+(f.fields.food?'checked':'')+'></label><input type="number" min="0" value="'+f.fields.limit+'"><div class="v32-order"><button type="button">↑</button><button type="button">↓</button></div></div><button type="submit">Save feeding</button></form></div>';
  for(const b of body.querySelectorAll('[data-warehouse-section-toggle]'))b.addEventListener('click',()=>{f.section=f.section===b.dataset.warehouseSectionToggle?null:b.dataset.warehouseSectionToggle;f.render()});
  body.querySelector('[data-warehouse-priority="grain"]').addEventListener('click',()=>{if(f.accept){f.state.priority=!f.state.priority;f.render();}});
  const form=body.querySelector('#food');form.querySelector('[type=checkbox]').addEventListener('change',e=>f.fields.food=e.target.checked);form.querySelector('[type=number]').addEventListener('input',e=>f.fields.limit=Number(e.target.value));
  form.addEventListener('submit',e=>{e.preventDefault();if(f.accept){f.state.food=f.fields.food;f.state.limit=f.fields.limit;f.render();}});
 }else if(id==='house'){
  body.innerHTML='<button data-house-everyone>Give happiness</button><button data-worker-building="house" data-worker-delta="1">Wrong staffing button</button>';
  body.querySelector('[data-house-everyone]').addEventListener('click',()=>{f.state.happiness=0;f.render()});
 }else if(id==='menu'){
  body.innerHTML='<button data-advisor-expeditions-entry>Open minigames</button><button>Unrelated menu</button>';
  body.querySelector('[data-advisor-expeditions-entry]').addEventListener('click',()=>f.open('expeditions'));
 }else if(id==='expeditions'){
  body.innerHTML='<button data-expedition-choice="triples">Triples</button><button data-expedition-choice="tilt">Tilt</button>';
  for(const b of body.querySelectorAll('[data-expedition-choice]'))b.addEventListener('click',()=>f.game=b.dataset.expeditionChoice);
 }
};
f.open=id=>{f.panel={kind:['expeditions','menu'].includes(id)?id:'building',id};f.render();if(!dialog.open)dialog.showModal();f.guide.update();};
f.reset=()=>{f.guide.cancel();if(dialog.open)dialog.close();document.getElementById('other').close();f.panel=null;f.useMenu=false;f.confirmed=true;f.accept=true;f.key='user1:gen2:island1';f.section=null;f.state={workers:0,recipe:0,food:false,limit:0,priority:false,happiness:4};f.fields={food:false,limit:0};f.completed=[];f.cancelled=[];f.unavailable=[];};
f.guide=createAdvisorGuidance({getPanel:()=>f.panel,getMapTarget:id=>id==='expeditions'&&dialog.open?dialog.querySelector('[data-advisor-expeditions-entry]'):document.getElementById('map-'+id),revealBuilding:id=>f.reveals.push(id),getLanguage:()=>document.documentElement.lang,isReady:()=>true,getContextKey:()=>f.key,readValue:step=>{f.reads++;const a=step.guidance.action;return a==='assign-workers'?f.state.workers:a==='recipe-workers'?f.state.recipe:a==='food-settings'?step.guidance.control==='limit'?f.state.limit:f.state.food:a==='transport-priority'?f.state.priority:a==='house-happiness'?f.state.happiness:undefined;},isConfirmed:()=>f.confirmed,onComplete:x=>f.completed.push(x),onCancel:x=>f.cancelled.push(x),onUnavailable:x=>f.unavailable.push(x)});
window.ready=true;
</script></body></html>'''

def route(route):
 if route.request.method!='GET':raise AssertionError('Guidance attempted a write')
 p=unquote(urlsplit(route.request.url).path)
 if p=='/':return route.fulfill(content_type='text/html',body=DOCUMENT)
 file=(ROOT/p.lstrip('/')).resolve()
 if file.is_relative_to(ROOT) and file.is_file():return route.fulfill(body=file.read_bytes(),content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
 route.fulfill(status=404,body='Missing guidance fixture asset')

def start(page,target,action,**fields):
 return page.evaluate('step=>fixture.guide.start(step)',{'target':target,'guidance':{'action':action,**fields}})

def phase(page,expected):
 expect(page.locator('[data-advisor-guidance]')).to_have_attribute('data-advisor-guidance-phase',expected)

def bounded(page):
 box=page.locator('[data-advisor-guidance]').bounding_box();v=page.viewport_size
 assert box and box['x']>=-1 and box['y']>=-1 and box['x']+box['width']<=v['width']+1 and box['y']+box['height']<=v['height']+1,(box,v)

def scenario(browser,language,width,height):
 c=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce');c.route(ORIGIN+'/**',route)
 page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('document.addEventListener("DOMContentLoaded",()=>document.documentElement.lang='+json.dumps(language)+')')
 page.goto(ORIGIN);page.wait_for_function('window.ready===true')
 try:
  before=page.evaluate('JSON.stringify(fixture.state)');assert start(page,'farm','assign-workers',targetCount=3)
  phase(page,'map');assert page.evaluate('JSON.stringify(fixture.state)')==before
  assert not page.locator('#island-dialog').is_visible()
  expect(page.locator('#map-farm')).to_have_class(__import__('re').compile('advisor-guidance-map-target'));bounded(page)
  page.screenshot(path=str(OUT/f'guidance-map-{language}-{width}.png'))
  page.locator('[data-advisor-guidance-focus]').click();expect(page.locator('#map-farm')).to_be_focused();page.keyboard.press('Enter')
  phase(page,'action');plus=page.locator('[data-worker-building="farm"][data-worker-delta="1"]');expect(plus).to_have_class(__import__('re').compile('advisor-guidance-target'))
  page.evaluate('window.firstPlus=document.querySelector("[data-worker-delta=\\"1\\"]")')
  for i in range(3):
   plus.click();page.wait_for_function('(n)=>fixture.state.workers===n',arg=i+1)
   if i<2:expect(plus).to_have_class(__import__('re').compile('advisor-guidance-target'))
  page.wait_for_function('!fixture.guide.active');assert page.evaluate('fixture.completed.length')==1
  assert page.evaluate('!window.firstPlus.isConnected&&!window.firstPlus.classList.contains("advisor-guidance-target")')
  page.evaluate('fixture.reset();fixture.state.workers=5');assert start(page,'farm','assign-workers',targetCount=2);page.locator('#map-farm').click();phase(page,'action')
  expect(page.locator('[data-worker-delta="-1"]')).to_have_class(__import__('re').compile('advisor-guidance-target'))
  for count in [4,3,2]:
   page.locator('[data-worker-delta="-1"]').click();page.wait_for_function('(n)=>fixture.state.workers===n',arg=count)
  page.wait_for_function('!fixture.guide.active');assert page.evaluate('fixture.completed.length')==1
  # A desired value is a total, and typing is never a confirmed assignment.
  page.evaluate('fixture.reset();fixture.state.workers=4');assert start(page,'farm','recipe-workers',recipeId='farmGrain',targetCount=3);page.locator('#map-farm').click();phase(page,'recipe-input')
  recipe=page.locator('[data-v32-workers="farmGrain"]');recipe.fill('2');phase(page,'recipe-input');recipe.fill('3');phase(page,'recipe-submit');assert page.evaluate('fixture.state.recipe')==0
  expect(page.locator('#recipe button')).to_have_class(__import__('re').compile('advisor-guidance-target'));expect(page.locator('#other-recipe button')).not_to_have_class(__import__('re').compile('advisor-guidance-target'))
  bounded(page);page.screenshot(path=str(OUT/f'guidance-recipe-{language}-{width}.png'))
  page.evaluate('fixture.accept=false');page.locator('#recipe button').click();phase(page,'recipe-submit');assert page.evaluate('fixture.guide.active&&fixture.state.recipe===0')
  page.evaluate('fixture.accept=true;fixture.confirmed=false');page.locator('#recipe button').click();phase(page,'recipe-submit');assert page.evaluate('fixture.guide.active&&fixture.state.recipe===3')
  page.evaluate('fixture.confirmed=true;fixture.guide.update()');assert not page.evaluate('fixture.guide.active')
  # The player opens the section and activates exactly the recommended resource.
  page.evaluate('fixture.reset()');assert start(page,'warehouse','transport-priority',resourceId='grain');page.locator('#map-warehouse').click();phase(page,'priorities');assert page.evaluate('fixture.section') is None
  page.locator('[data-warehouse-section-toggle="priorities"]').click();phase(page,'action');expect(page.locator('[data-warehouse-priority="grain"]')).to_have_class(__import__('re').compile('advisor-guidance-target'))
  page.locator('[data-warehouse-priority="wood"]').click();assert page.evaluate('fixture.guide.active&&!fixture.state.priority')
  page.locator('[data-warehouse-priority="grain"]').click();page.wait_for_function('!fixture.guide.active')
  page.evaluate('fixture.reset()');assert start(page,'warehouse','food-settings',resourceId='grain',control='enabled',targetEnabled=True);page.locator('#map-warehouse').click();phase(page,'feeding')
  page.locator('[data-warehouse-section-toggle="feeding"]').click();phase(page,'action');checkbox=page.locator('[data-v32-food="grain"] input[type="checkbox"]');expect(checkbox).to_have_class(__import__('re').compile('advisor-guidance-target'))
  checkbox.check();phase(page,'food-save');assert page.evaluate('!fixture.state.food');page.evaluate('fixture.confirmed=false');page.locator('#food button[type="submit"]').click();assert page.evaluate('fixture.guide.active&&fixture.state.food');page.evaluate('fixture.confirmed=true;fixture.guide.update()');assert not page.evaluate('fixture.guide.active')
  page.evaluate('fixture.reset()');assert start(page,'house','house-happiness');page.locator('#map-house').click();expect(page.locator('[data-house-everyone]')).to_have_class(__import__('re').compile('advisor-guidance-target'));expect(page.locator('[data-worker-building="house"]')).not_to_have_class(__import__('re').compile('advisor-guidance-target'));page.locator('[data-house-everyone]').click();page.wait_for_function('!fixture.guide.active')
  page.evaluate('fixture.reset()');assert start(page,'expeditions','minigame',gameId='triples');phase(page,'route');page.locator('#map-expeditions').click();phase(page,'action');expect(page.locator('[data-expedition-choice="triples"]')).to_have_class(__import__('re').compile('advisor-guidance-target'));assert page.evaluate('fixture.reveals.at(-1)')!='expeditions';page.keyboard.press('Escape')
  page.evaluate('fixture.reset();fixture.useMenu=true');assert start(page,'expeditions','minigame',gameId='triples');page.locator('#map-expeditions').click();phase(page,'route');expect(page.locator('[data-advisor-expeditions-entry]')).to_have_class(__import__('re').compile('advisor-guidance-target'));page.locator('[data-advisor-expeditions-entry]').click();phase(page,'action');expect(page.locator('[data-expedition-choice="triples"]')).to_have_class(__import__('re').compile('advisor-guidance-target'));page.keyboard.press('Escape')
  # Missing selectors fail honestly, and their observer does not spin on itself.
  page.evaluate('fixture.reset();fixture.state.workers=4');assert start(page,'farm','recipe-workers',recipeId='missingRecipe',targetCount=3);page.locator('#map-farm').click();phase(page,'unavailable');assert page.locator('.advisor-guidance-target').count()==0
  reads=page.evaluate('fixture.reads');page.wait_for_timeout(200);assert page.evaluate('fixture.reads')-reads<=3,'Self-sustaining MutationObserver loop'
  bounded(page);page.locator('[data-advisor-guidance-cancel]').click();assert not page.evaluate('fixture.guide.active')
  # Session changes, other dialogs and panning offscreen clear stale pointers.
  page.evaluate('fixture.reset()');assert start(page,'farm','assign-workers',targetCount=3);page.evaluate('fixture.key="user1:gen2:island2";fixture.guide.update()');assert not page.evaluate('fixture.guide.active')
  assert not page.locator('#map-farm').get_attribute('aria-describedby')
  page.evaluate('fixture.reset()');assert start(page,'farm','assign-workers',targetCount=3);page.evaluate('document.getElementById("other").showModal()');page.wait_for_function('!fixture.guide.active')
  page.evaluate('fixture.reset()');assert start(page,'farm','assign-workers',targetCount=3);page.evaluate('document.getElementById("map-farm").style.transform="translateX(-4000px)";fixture.guide.update()');assert not page.evaluate('fixture.guide.active')
  assert not errors,errors;assert page.evaluate('Object.keys(localStorage).length+Object.keys(sessionStorage).length')==0
  page.screenshot(path=str(OUT/f'guidance-{language}-{width}.png'))
  return {'language':language,'width':width,'map_first':True,'keyboard':True,'DOM_replacement':True,'total_count':True,'recipe_input_then_submit':True,'failed_and_pending_write_not_completed':True,'section_then_exact_control':True,'happiness_not_staffing':True,'global_minigame':True,'missing_target_honest_and_observer_bounded':True,'session_modal_offscreen_cleanup':True,'errors':errors}
 finally:c.close()

report=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 try:
  for language,width,height in [('pl',1440,1000),('en',1440,1000),('pl',390,844),('en',390,844),('pl',320,640)]:
   row=scenario(browser,language,width,height);report.append(row);print(json.dumps(row),flush=True)
 finally:browser.close()
(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS independent advisor guidance DOM; no game account/time/reward writes.',flush=True)
