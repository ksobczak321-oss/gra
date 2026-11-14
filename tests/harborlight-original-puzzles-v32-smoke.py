"""Original v32 puzzles: real DOM, pointer geometry, keyboard, timer and claim callbacks."""
from pathlib import Path
from urllib.parse import unquote, urlsplit
import mimetypes
import os
from playwright.sync_api import sync_playwright
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',Path(__file__).resolve().parents[1])).resolve()
BASE='http://127.0.0.1:47432'
DOCUMENT='''<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="./harborlight-v1-original-puzzles.css"><style>body{margin:8px;background:#071e26;font:16px system-ui}main{max-width:700px;margin:auto}</style></head><body><main></main><script type="module">
import * as P from './harborlight-v1-original-puzzles.js';
import * as A from './harborlight-v1-adventures.js';
import {createAdventuresPanel} from './harborlight-v1-adventures-ui.js';
import {mountOriginalPuzzle} from './harborlight-v1-original-puzzles-ui.js';
window.reset=(variant='signal-line')=>{window.controller?.dispose();window.s={worldTimeMs:Date.parse('2026-11-14T13:20:00Z'),resources:{coins:1000},buildings:{townhall:{level:3}}};window.variant=variant;window.actions=[];window.claims=0;window.controller=mountOriginalPuzzle({host:document.querySelector('main'),state:s,getState:()=>s,variant,allowAdSimulation:true,onAction:a=>{window.actions.push(a);return P.originalPuzzleAction(s,a,{allowAdSimulation:true,grantReward:r=>{window.claims++;s.resources.coins+=r.coins;return true;}});}});};
window.startEmbedded=(kind='harbor-routes')=>{window.controller?.dispose();window.panel?.destroy();window.es={ruleset:32,worldTimeMs:Date.parse('2026-11-14T13:20:00Z'),activityClock:0,activitySeed:173,resources:{coins:1000},buildings:{townhall:{level:3}},notifications:[]};A.normalizeAdventures(es);window.embeddedClaims=0;window.panel=createAdventuresPanel({state:es,allowAdSimulation:true,onAction:action=>{const result=A.adventureAction(es,action,{allowAdSimulation:true,claimAdventureReward:(_s,payload)=>{window.embeddedClaims++;es.resources.coins+=7;return{reward:{coins:7}};}});panel.update(es);return result;}});document.querySelector('main').replaceChildren(panel.element);A.adventureAction(es,kind==='bridge'?{type:'adventureStart',kind:'bridge'}:{type:'adventureStart',kind:'islandPuzzle',puzzleKind:kind});panel.update(es);};window.ea=()=>es.adventures.active.data.stageAttempt||es.adventures.active.data.classicAttempt;window.eb=()=>es.adventures.active.data.puzzle.data.attempt.board;window.eadvance=n=>{A.advanceAdventures(es,n);panel.update(es);};
window.advance=n=>{P.advanceOriginalPuzzles(s,n);controller.update(s);};window.current=()=>structuredClone(s.originalPuzzles.attempts[variant]);window.action=(type,extra={})=>{const r=P.originalPuzzleAction(s,{type,variant,...extra},{allowAdSimulation:true});controller.update(s);return r;};window.reset();window.ready=true;
</script></body></html>'''
def scenario(browser,mobile):
    context=browser.new_context(viewport={'width':390 if mobile else 1100,'height':844 if mobile else 1000},has_touch=mobile,reduced_motion='reduce')
    def asset(route):
        path=urlsplit(route.request.url).path
        if path=='/puzzles.html':return route.fulfill(body=DOCUMENT,content_type='text/html')
        target=(ROOT/unquote(path).lstrip('/')).resolve()
        if not target.is_relative_to(ROOT) or not target.is_file():return route.fulfill(status=404,body='Missing')
        return route.fulfill(body=target.read_bytes(),content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')
    context.route(BASE+'/**',asset)
    page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE+'/puzzles.html');page.wait_for_function('window.ready')
    page.get_by_role('button',name='Rozpocznij próbę',exact=True).click()
    a=page.evaluate('window.current()')
    capture=Path(os.environ.get('HARBORLIGHT_ORIGINAL_PUZZLES_ARTIFACTS','/tmp/harborlight-original-puzzles-v32'));capture.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(capture/('signal-mobile.png' if mobile else 'signal-desktop.png')),full_page=True)
    # Independent Euler traversal in Python rather than a model's solution helper.
    adj={n['id']:[] for n in a['board']['nodes']}
    for i,e in enumerate(a['board']['edges']):adj[e['a']].append((e['b'],i));adj[e['b']].append((e['a'],i))
    stack=[next(n for n,v in adj.items() if len(v)%2)];used=set();route=[]
    while stack:
        edges=adj[stack[-1]]
        while edges and edges[-1][1] in used:edges.pop()
        if edges:n,i=edges.pop();used.add(i);stack.append(n)
        else:route.append(stack.pop())
    route.reverse();assert len(route)==len(a['board']['edges'])+1
    svg=page.locator('svg.original-puzzle-signal');svg.scroll_into_view_if_needed()
    points=page.evaluate('''route=>{const svg=document.querySelector('svg'),m=svg.getScreenCTM();return route.map(id=>{const c=svg.querySelector('[data-node="'+id+'"] circle');const p=new DOMPoint(+c.getAttribute('cx'),+c.getAttribute('cy')).matrixTransform(m);return{x:p.x,y:p.y};});}''',route)
    if mobile:
        # Trusted CDP touch events go through real SVG pointer capture and CSS letterboxing.
        session=context.new_cdp_session(page)
        def touch(kind,p=None):session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if p is None else [{'x':p['x'],'y':p['y'],'id':1}]})
        touch('touchStart',points[0]);page.wait_for_timeout(30)
        for p in points[1:]:touch('touchMove',p);page.wait_for_timeout(25)
        touch('touchEnd')
    else:
        # Keyboard is a full alternate input path, with directional focus and Enter.
        svg.focus();page.keyboard.press('Enter')
        nodes={n['id']:n for n in a['board']['nodes']}
        for prev,nxt in zip(route,route[1:]):
            dx=nodes[nxt]['x']-nodes[prev]['x'];dy=nodes[nxt]['y']-nodes[prev]['y'];page.keyboard.press({(1,0):'ArrowRight',(-1,0):'ArrowLeft',(0,1):'ArrowDown',(0,-1):'ArrowUp'}[(dx,dy)]);page.keyboard.press('Enter')
    page.wait_for_function('current().status==="won"')
    assert page.evaluate('s.resources.coins')==1000
    page.get_by_role('button',name='Odbierz nagrodę',exact=True).click();page.wait_for_function('window.claims===1')
    page.evaluate("window.action('originalPuzzleClaim')");assert page.evaluate('window.claims')==1
    assert page.locator('body').evaluate('e=>e.scrollWidth<=innerWidth+1')
    # Timer offer is one downward crossing, not continuously recreated below30.
    page.get_by_role('button',name='Nowa próba',exact=True).click();page.evaluate('advance(current().remaining-30)')
    page.get_by_role('dialog',name='Dodatkowy czas').wait_for();page.evaluate('advance(4)');assert page.evaluate('current().remaining')==30
    page.get_by_role('button',name='Reklama — symulacja DEV',exact=True).click();page.evaluate('advance(1000)');assert page.evaluate('current().remaining')==30
    page.get_by_role('button',name='Zakończ symulację reklamy',exact=True).click();page.wait_for_function('current().remaining===90')
    page.evaluate('advance(60)');page.get_by_role('button',name='Gram dalej',exact=True).click();page.evaluate('advance(1)');assert page.evaluate('current().remaining')==29;assert page.evaluate('current().timeOffer') is None
    # Routes: click native keyboard buttons using an independently checked free ray.
    page.evaluate("window.reset('harbor-routes')");page.get_by_role('button',name='Rozpocznij próbę',exact=True).click()
    while True:
        board=page.evaluate('current().board');active=[p for p in board['paths'] if p['id'] not in board['removed']]
        if not active:break
        free=[]
        for p in active:
            x,y=p['cells'][-1];dx,dy=p['direction'];blocked=False;x+=dx;y+=dy
            while 0<=x<board['size'] and 0<=y<board['size']:
                if any([x,y] in q['cells'] for q in active if q['id']!=p['id']):blocked=True;break
                x+=dx;y+=dy
            if not blocked:free.append(p)
        assert free
        p=free[0];number=next(i+1 for i,q in enumerate(board['paths']) if q['id']==p['id'])
        button=page.get_by_role('button',name=f'Konwój {number}',exact=True)
        button.tap() if mobile else button.click()
    assert page.evaluate('current().status')=='won'
    # The same generated routes are playable inside the causal-adventure UI.
    page.evaluate("window.startEmbedded('harbor-routes')")
    page.screenshot(path=str(capture/('routes-adventure-mobile.png' if mobile else 'routes-adventure-desktop.png')),full_page=True)
    while True:
        board=page.evaluate('window.eb()');active=[p for p in board['paths'] if p['id'] not in board['removed']]
        if not active:break
        free=[]
        for p in active:
            x,y=p['cells'][-1];dx,dy=p['direction'];blocked=False;x+=dx;y+=dy
            while 0<=x<board['size'] and 0<=y<board['size']:
                if any([x,y] in q['cells'] for q in active if q['id']!=p['id']):blocked=True;break
                x+=dx;y+=dy
            if not blocked:free.append(p)
        assert free
        number=next(i+1 for i,p in enumerate(board['paths']) if p['id']==free[0]['id'])
        page.get_by_role('button',name=f'Konwój {number}',exact=True).click()
    page.get_by_role('button',name='Zakończ próbę',exact=True).click()
    assert page.evaluate('window.embeddedClaims')==1
    # Logic-game and classic-game offers both pause and resume through actual controls.
    for kind in ['deduction','bridge']:
        page.evaluate('kind=>window.startEmbedded(kind)',kind)
        page.evaluate('window.eadvance(ea().remaining-30)')
        page.get_by_role('button',name='30 monet',exact=True).click()
        assert page.evaluate('window.ea().remaining')==90
        assert page.evaluate('window.es.resources.coins')==970
        page.evaluate('window.eadvance(60)')
        page.get_by_role('button',name='Reklama — symulacja DEV',exact=True).click()
        page.evaluate('window.eadvance(1000)');assert page.evaluate('window.ea().remaining')==30
        page.get_by_role('button',name='Zakończ symulację reklamy',exact=True).click()
        assert page.evaluate('window.ea().remaining')==90
        page.evaluate('window.eadvance(95)')
        page.get_by_role('button',name='Spróbuj ponownie',exact=True).click()
        assert page.evaluate('window.ea().remaining===window.ea().initialDuration')
    assert not errors,errors
    print(f'PASS original puzzles {"mobile touch 390px" if mobile else "desktop keyboard"}: real wins, reward once, timer/ad pause, route order, no overflow')
    context.close()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM',os.environ.get('CHROMIUM_PATH','/usr/bin/chromium')),headless=True,args=['--no-sandbox'])
    scenario(browser,False);scenario(browser,True);browser.close()
