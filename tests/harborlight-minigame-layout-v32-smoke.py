"""Read-only geometry audit of real game components in the app's dialog CSS.
Models are fixture-only; the suite never accesses a saved account or changes rules.
Use HARBORLIGHT_LAYOUT_PHASE=before to record the baseline without assertions.
"""
from pathlib import Path
from urllib.parse import unquote,urlsplit
import json,mimetypes,os
from playwright.sync_api import sync_playwright
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',Path(__file__).resolve().parents[1])).resolve()
OUT=Path(os.environ.get('HARBORLIGHT_LAYOUT_ARTIFACTS','/tmp/harborlight-minigame-layout-v32'))
PHASE=os.environ.get('HARBORLIGHT_LAYOUT_PHASE','after')
BASE='http://127.0.0.1:47434'
DOCUMENT='''<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="./harborlight-v1-play.css"><link rel="stylesheet" href="./harborlight-v1-minigame.css"><link rel="stylesheet" href="./harborlight-v1-original-puzzles.css"><link rel="stylesheet" href="./harborlight-v1-adventures.css"><style>body{margin:0;background:radial-gradient(ellipse at center,#164754,#071f2c);color:#e7f3ee;font:15px/1.5 system-ui}body:before{content:'HARBORLIGHT';position:fixed;left:24px;top:20px;font-weight:800;letter-spacing:4px;opacity:.32}#island-dialog::backdrop{background:#00121c88}</style></head><body><dialog id="island-dialog"><header class="dialog-header"><p class="eyebrow">HARBORLIGHT</p><h2 id="title"></h2><button class="dialog-close" aria-label="Zamknij">×</button></header><div class="dialog-body"></div></dialog><script type="module">
import {mountMiniGame} from './harborlight-v1-minigame-ui.js';
import {createMiniGame,miniGameRoundRules} from './harborlight-v1-minigames.js';
import {mountOriginalPuzzle} from './harborlight-v1-original-puzzles-ui.js';
import * as O from './harborlight-v1-original-puzzles.js';
import * as A from './harborlight-v1-adventures.js';
import {createAdventuresPanel} from './harborlight-v1-adventures-ui.js';
const d=document.querySelector('dialog'),body=d.querySelector('.dialog-body'),n=(tag,attrs={},text='')=>{const e=document.createElement(tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);e.textContent=text;return e;};
let controller;window.fixture=null;
window.show=({family,kind='',popup=false,large=false,decision=false})=>{
 controller?.dispose?.();controller?.destroy?.();body.replaceChildren();d.dataset.panelKind=family==='legacy'?'puzzle':family==='original'?'original-puzzle':'adventures';document.querySelector('#title').textContent=family==='legacy'?'Minigra ekspedycji':family==='original'?'Zagadka w porcie':'Przygody na wyspie';
 const state={ruleset:32,worldTimeMs:Date.parse('2026-11-14T13:20:00Z'),activityClock:0,activitySeed:173,resources:{coins:1000},buildings:{townhall:{level:6}},notifications:[]};window.fixture=state;
 if(family==='legacy'){
   const game=createMiniGame(kind,large?20:1,173,0),rules=miniGameRoundRules(kind,large?20:1),run={id:'layout-run',rulesPolicyVersion:32,status:decision?'decision':'active',level:1,difficultyLevel:large?20:1,miniGame:game,roundStartedAt:0,roundLimit:rules.timeLimit};
   body.innerHTML='<div class="minigame-panel"><div class="minigame-side"><div class="stat-grid minigame-stats"><div class="stat"><small>Runda / trudność</small><strong>1 / '+(large?20:1)+'</strong></div><div class="stat"><small>Pozostały czas</small><strong>3 min 00 s</strong></div><div class="stat"><small>Możliwa nagroda</small><strong>150 monet</strong></div></div><p class="notice" data-minigame-reward-rules>Nagroda rundy: do 150 monet. Pełna kwota do 2 min, potem o 1 monetę mniej co 15 s. Limit: 3 min. Dodatkowy czas kupujesz dobrowolnie przed końcem.</p><div data-minigame-controls-slot></div><div data-minigame-result-actions><button class="action danger">Zakończ próbę — utracisz pulę</button></div><div class="minigame-ad-slot"><button class="action secondary" data-buy-extra-time>Dodaj czas · 60 monet</button><button class="action secondary" data-minigame-ad>Obejrzyj reklamę</button></div></div><div data-minigame-host></div></div>';
   if(decision){game.solved=true;if(kind==='triples')game.matched=game.cards.map(()=>true);else for(const b of game.balls)b.settled=true;body.querySelector('[data-minigame-result-actions]').innerHTML='<div class="expedition-decision"><button class="action">Odbierz 150 monet</button><label class="next-expedition-choice"><span>Następna gra</span><select aria-label="Następna gra"><option>Kulki w labiryncie</option><option>Dopasuj trójki</option></select></label><button class="action">Zaryzykuj 150, aby zdobyć 350 monet</button></div>';for(const b of body.querySelectorAll('.minigame-ad-slot button'))b.disabled=true;}
   const status={elapsed:0,remaining:decision?0:popup?30:rules.timeLimit,highestTownhall:6,potentialPot:150,adPaused:popup,timeOffer:popup?{status:'choice',choiceRemaining:5}:null};controller=mountMiniGame({host:body.querySelector('[data-minigame-host]'),controlsHost:body.querySelector('[data-minigame-controls-slot]'),run,status,language:'pl',animations:false,onAction:()=>{},onRewardedAd:()=>{}});
 }else if(family==='original'){
   O.originalPuzzleAction(state,{type:'originalPuzzleStart',variant:kind},{highestTownhall:6});const a=state.originalPuzzles.attempts[kind];if(popup){a.remaining=30;a.timeOffer={status:'choice',choiceRemaining:5};}controller=mountOriginalPuzzle({host:body,state,variant:kind,onAction:()=>{},allowAdSimulation:true});
 }else{
   A.normalizeAdventures(state);if(family==='embedded')A.adventureAction(state,{type:'adventureStart',kind:'islandPuzzle',puzzleKind:kind},{highestTownhall:6});else if(family==='story')A.adventureAction(state,{type:'adventureStart',kind:'escapeStory',storyId:'first-light',variant:1},{highestTownhall:6});else if(family==='classic')A.adventureAction(state,{type:'adventureStart',kind:'bridge'},{highestTownhall:6});
   if(popup){const a=state.adventures.active.data.stageAttempt||state.adventures.active.data.classicAttempt;a.remaining=30;a.timeOffer={status:'choice',choiceRemaining:5};}
   controller=createAdventuresPanel({state,language:'pl',allowAdSimulation:true,onAction:()=>({ok:true}),onClose:()=>{},onMainMission:()=>{},mainMission:{title:{pl:'Zabezpieczmy osadę'},description:{pl:'Przygotuj dostawy dla mieszkańców i sprawdź wolne ekipy.'}}});body.append(controller.element);
 }
 if(!d.open)d.showModal();body.scrollTop=0;return true;
};window.ready=true;
</script></body></html>'''
CASES=[('solo-tilt',{'family':'legacy','kind':'tilt'}),('solo-triples',{'family':'legacy','kind':'triples'}),('solo-triples120',{'family':'legacy','kind':'triples','large':True}),('solo-signal',{'family':'original','kind':'signal-line'}),('solo-routes',{'family':'original','kind':'harbor-routes'}),('list',{'family':'list'}),('catalogue',{'family':'catalogue'}),('story',{'family':'story'})]
CASES += [('embedded-'+kind,{'family':'embedded','kind':kind})for kind in ['signal-line','harbor-routes','memoryTriples','marbleMaze']]
CASES += [('offer-solo-'+kind,{'family':'legacy' if kind in ['tilt','triples'] else 'original','kind':kind,'popup':True})for kind in ['tilt','triples','signal-line','harbor-routes']]
CASES += [('offer-embedded-'+kind,{'family':'embedded','kind':kind,'popup':True})for kind in ['signal-line','harbor-routes','memoryTriples','marbleMaze','deduction']]
CASES += [('decision-'+kind,{'family':'legacy','kind':kind,'decision':True})for kind in ['tilt','triples']]
CASES += [('offer-classic',{'family':'classic','popup':True})]
METRICS='''() => {
 const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
 const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
 const buttons=[...document.querySelectorAll('#island-dialog button')].filter(visible).filter(e=>!e.matches('.memory-card,.adv-puzzle-cell-button,.adv-map-tile,.adv-pipe,.adv-bridge-node-button'));
 const fields=[...document.querySelectorAll('#island-dialog input:not([type=range]),#island-dialog select')].filter(visible).map(e=>({text:e.getAttribute('aria-label')||e.name,...rect(e)}));
 const small=buttons.filter(e=>rect(e).h<43.5).map(e=>({text:e.textContent.trim(),...rect(e)}));
 const groups=[...document.querySelectorAll('.original-puzzle-controls,.original-puzzle-route-keys,.adv-tools,.adv-puzzle-journal-actions,.minigame-ad-slot')].map(g=>{const children=[...g.children].filter(e=>e.tagName==='BUTTON'&&visible(e));const boxes=children.map(e=>({text:e.textContent.trim(),...rect(e)}));return {name:g.className,boxes};});
 const popup=[...document.querySelectorAll('.original-puzzle-dialog')].find(visible);
 const popupBox=popup?rect(popup):null;
 const popupButtons=popup?[...popup.querySelectorAll('button')].filter(visible).map(e=>({text:e.textContent.trim(),font:getComputedStyle(e).fontSize,color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor,...rect(e)})):[];
 const cards=[...document.querySelectorAll('.adv-choice')].map(e=>({box:rect(e),cta:rect(e.querySelector('button')),copy:rect(e.querySelector('.adv-choice-copy'))}));
 const dialog=document.querySelector('#island-dialog'),body=dialog.querySelector('.dialog-body');
 const controller=[...document.querySelectorAll('.marble-centre,[data-motion-enable],.marble-joystick')].filter(visible).map(e=>({text:e.textContent.trim(),...rect(e)}));
 return {fields,controller,viewport:{width:innerWidth,height:innerHeight},dialog:rect(dialog),horizontalOverflow:body.scrollWidth>body.clientWidth+1,body:{w:body.clientWidth,scroll:body.scrollWidth},small,groups,popupBox,popupButtons,cards};
}'''
OUT.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 for width,height in [(1440,1000),(390,844)]:
  context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<500,reduced_motion='reduce')
  def asset(route):
   path=urlsplit(route.request.url).path
   if path=='/layout.html':return route.fulfill(body=DOCUMENT,content_type='text/html')
   target=(ROOT/unquote(path).lstrip('/')).resolve()
   if not target.is_relative_to(ROOT)or not target.is_file():return route.fulfill(status=404,body='Missing')
   data=target.read_bytes()
   markers={'harborlight-v1-minigame.css':'/* v32: consistent touch targets', 'harborlight-v1-adventures.css':'/* v32: action rows', 'harborlight-v1-original-puzzles.css':'/* v32: time offers'}
   if PHASE=='before' and target.name in markers:data=data.decode().split(markers[target.name])[0].encode()
   return route.fulfill(body=data,content_type=mimetypes.guess_type(str(target))[0]or'application/octet-stream')
  context.route(BASE+'/**',asset);page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)));page.goto(BASE+'/layout.html');page.wait_for_function('window.ready')
  for name,case in CASES:
   page.evaluate('c=>window.show(c)',case)
   if name=='catalogue':page.locator('[data-adventure-all]').click()
   page.wait_for_timeout(90)
   metric=page.evaluate(METRICS);metric.update({'name':name,'width':width,'errors':errors[:]});results.append(metric)
   page.screenshot(path=str(OUT/f'{PHASE}-{width}-{name}.png'),full_page=True)
   if PHASE!='before':
    assert not metric['horizontalOverflow'],(name,width,metric)
    assert not metric['small'],(name,width,metric['small'])
    assert all(f['h']>=43.5 for f in metric['fields']),(name,width,metric['fields'])
    if case.get('popup'):
     b=metric['popupBox'];assert b and b['x']>=8 and b['y']>=8 and b['right']<=width-8 and b['bottom']<=height-8,(name,width,b)
     assert all(b['y']>=8 and b['bottom']<=height-8 for b in metric['popupButtons']),(name,width,metric['popupButtons'])
     assert all(float(b['font'].removesuffix('px'))>=14.5 for b in metric['popupButtons']),(name,width,metric['popupButtons'])
    if case.get('decision'):
     for field in metric['fields']:
      for group in metric['groups']:
       for button in group['boxes']:
        assert min(field['right'],button['right'])-max(field['x'],button['x'])<1 or min(field['bottom'],button['bottom'])-max(field['y'],button['y'])<1,(name,width,'selector/action overlap',field,button)
     choice=page.get_by_role('combobox',name='Następna gra',exact=True);choice.select_option(label='Dopasuj trójki');assert choice.input_value()=='Dopasuj trójki'
    if len(metric['controller'])==3:
     centers=[b['y']+b['h']/2 for b in metric['controller']];assert max(centers)-min(centers)<=1,(name,width,metric['controller'])
    if width>1000 and name=='list':
     tops=[c['cta']['y']for c in metric['cards']];assert max(tops)-min(tops)<=1,(name,width,tops)
    assert not errors,(name,width,errors)
  context.close()
 browser.close()
(OUT/f'{PHASE}-geometry.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(f'{PHASE}: {len(results)} real-component views at1440/390px; {sum(bool(r["small"])for r in results)} undersized-control views; {sum(r["horizontalOverflow"]for r in results)} horizontal overflows')
