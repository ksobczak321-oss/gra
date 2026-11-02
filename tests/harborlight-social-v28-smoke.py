"""Browser contracts for approved v28 social panels, using real modules.

Fixtures have no Firebase identities, public messages, league points or money.
"""
from pathlib import Path
from urllib.parse import unquote, urlsplit
import mimetypes
import os
from playwright.sync_api import expect, sync_playwright
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',Path(__file__).resolve().parents[1])).resolve()
BASE='http://127.0.0.1:47393'
DOCUMENT='''<!doctype html><html><head><meta charset="utf-8"><style>body{margin:12px;background:#102a38;color:white;font:16px sans-serif}button,input{font:inherit}button{padding:10px}</style></head><body><main></main><script type="module">
import {createCharityPreviewAdapter,createCharityPanel}from'./harborlight-v1-charity.js';
import{createCommunityPanel}from'./harborlight-v1-community-ui.js';
import{createLeagueChallenge,emptyLeagueProgress}from'./harborlight-v1-league.js';
const language=new URLSearchParams(location.search).get('language')||'pl',at=Date.parse('2026-11-23T18:00:00Z');
let panel,state={resources:{coins:300},buildings:{townhall:{level:4}}};window.calls=[];window.changed=[];window.celebrations=[];
document.addEventListener('harborlight:charity-celebration',e=>window.celebrations.push(e.detail));
window.mountCharity=()=>{panel?.dispose?.();panel?.remove();const adapter=createCharityPreviewAdapter({environment:'preprod',getState:()=>structuredClone(state),getWorld:()=>state,now:()=>at,onPersistSimulation:m=>state.charitySimulation=m});window.testState=()=>structuredClone(state);panel=createCharityPanel({adapter,language});document.querySelector('main').append(panel);};
window.mountLeague=(finished=false)=>{panel?.dispose?.();panel?.remove();const teams=[1,2,3,4].map(i=>({id:'t'+i,name:'Port '+i,rounds:[50,50,50,50,50,50,50],tablePoints:21,seasonScore:350}));const phase={key:'semifinal-1',teamIds:['t1','t4'],day:23,round:0,status:'pending',open:true};
 const calendar={season:'2026-11',day:finished?25:23,hour:19,registration:false,playing:false,availableKinds:[]};const bracket={enabled:true,friendly:false,finished,champion:finished?'t1':null,phases:finished?[]:[phase],active:finished?{}:{t1:phase},qualified:teams.map(t=>t.id)};
 const client={simulation:false,snapshot:async()=>({self:{id:'p1',name:'Kapitan',blocked:[],muted:[]},alliance:null,players:[],alliances:[],calendar,serverTime:at}),request:async(command,data={})=>{window.calls.push({command,...data});if(command==='leagueRead')return{season:'2026-11',calendar,groups:[teams],friendly:false,registered:true,ownTeamId:'t1',playoffs:bracket,claimDay:25,rewards:{playedDays:7,completedTasks:14,goals:70,coins:750},serverTime:at};if(command==='attemptStart')return{attemptId:'playoff-real-transport',challenge:createLeagueChallenge({day:1,kind:data.kind}),progress:emptyLeagueProgress(),sequence:0,practice:false,playoff:{key:phase.key,round:0},status:'playing',startedAt:at,serverTime:at,deadlineAt:at+180000};if(command==='leagueClaimRewards')return{awards:{cup:true,coins:750},islandUpdate:{revision:2}};throw Error('Unexpected '+command);}};
 panel=createCommunityPanel({client,language,initialTab:'league',onChanged:r=>window.changed.push(r)});document.querySelector('main').append(panel);};
window.ready=true;
</script></body></html>'''

def scenario(browser,language,mobile):
 context=browser.new_context(viewport={'width':390 if mobile else 1200,'height':844 if mobile else 900})
 errors=[]
 def asset(route):
  if urlsplit(route.request.url).path=='/social.html':return route.fulfill(body=DOCUMENT,content_type='text/html')
  target=(ROOT/unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
  if not target.is_relative_to(ROOT) or not target.is_file():return route.fulfill(status=404,body='Missing asset')
  return route.fulfill(body=target.read_bytes(),content_type=mimetypes.guess_type(str(target))[0]or'application/octet-stream')
 context.route(BASE+'/**',asset);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto(BASE+'/social.html?language='+language);page.wait_for_function('window.ready===true');page.evaluate('window.mountCharity()')
  panel=page.locator('[data-charity-panel]');expect(panel).to_contain_text('SYMULACJA'if language=='pl'else'SIMULATION')
  panel.locator('[data-charity-test-credit]').click();expect(panel).not_to_have_attribute('aria-busy','true')
  amount=panel.locator('[data-charity-amount]');expect(amount).to_have_attribute('min','100');expect(amount).to_have_attribute('step','100')
  amount.fill('100');expect(panel.locator('[data-charity-donate]')).to_contain_text('100');expect(panel.locator('[data-charity-donate]')).to_contain_text('0,10'if language=='pl'else'0.10')
  panel.locator('[data-charity-confirm]').check();amount.fill('150');expect(panel.locator('[data-charity-confirm]')).not_to_be_checked();expect(panel.locator('[data-charity-donate]')).to_be_disabled()
  amount.fill('100');panel.locator('[data-charity-confirm]').check();panel.locator('[data-charity-donate]').click();expect(panel).not_to_have_attribute('aria-busy','true')
  assert page.evaluate('window.testState().resources.coins')==1200
  page.evaluate('window.mountCharity()');expect(panel.locator('[data-charity-test-transfer]')).to_be_visible();expect(panel.locator('[data-charity-donate]')).to_be_disabled()
  panel.locator('[data-charity-test-transfer]').click();expect(panel).not_to_have_attribute('aria-busy','true');expect(panel.locator('.charity-celebration')).to_contain_text('20')
  assert page.evaluate('window.testState().charitySimulation.donations[0].operatorCents')==10
  assert page.evaluate('window.celebrations.length')==1
  page.evaluate('window.mountCharity()');expect(panel.locator('[data-charity-test-transfer]')).to_have_count(0);expect(panel.locator('[data-charity-claim]')).to_have_count(0)
  page.evaluate('window.mountLeague()');panel=page.locator('[data-community-panel]');expect(panel.locator('[data-league-seven-days]')).to_be_visible();expect(panel.locator('[data-league-playoff-calendar]')).to_contain_text('19:00–21:00');expect(panel.locator('[data-league-playoff-kind]')).to_have_count(2);expect(panel.locator('[data-league-claim-rewards]')).to_be_disabled()
  panel.locator('[data-league-playoff-kind="logic"]').click();assert page.evaluate('window.calls.filter(x=>x.command==="attemptStart").at(-1).playoff')is True
  page.evaluate('window.mountLeague(true)');expect(panel.locator('[data-league-champion]')).to_contain_text('Port 1');panel.locator('[data-league-claim-rewards]').click()
  page.wait_for_function('window.changed.length===1');assert page.evaluate('window.changed[0].awards.coins')==750
  assert page.evaluate('window.changed[0].islandUpdate.revision')==2
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  assert not errors,errors
 finally:context.close()

with sync_playwright()as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 try:
  for language in ['pl','en']:
   for mobile in [False,True]:scenario(browser,language,mobile)
 finally:browser.close()
print('PASS v28 social panels PL/EN desktop/mobile: 100coin simulation, durable receipt/fanfare, playoff transport, cup reward refresh, bounded layout')
