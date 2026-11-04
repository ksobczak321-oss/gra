"""Real pointer/touch, fine keyboard placement and saved scene acceptance.
No accounts, payment providers or cloud mutations are contacted.
"""
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
ORIGIN = 'https://theatre-free-placement.harborlight.test'
SHOTS = Path('/tmp/harborlight-theatre-v31')

def assets(route):
    path = unquote(urlsplit(route.request.url).path)
    if path == '/':
        return route.fulfill(content_type='text/html', body='''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:16px;background:#0b2935;color:white;font:16px system-ui}main{max-width:1350px;margin:auto}@media(max-width:500px){body{margin:8px}}</style></head><body><main id="fixture"></main></body></html>''')
    target=(ROOT/path.lstrip('/')).resolve()
    if not target.is_relative_to(ROOT) or not target.is_file():return route.fulfill(status=404,body='Not found')
    return route.fulfill(body=target.read_bytes(),content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')

def position(page,identity):
    return page.evaluate('id=>structuredClone(fixture.state.theatre.positions[id])',identity)

def venue_ready(page):
    # The standalone fixture mounts the panel after loading its ES module. Its
    # two linked stylesheets arrive separately: visible unstyled buttons do not
    # yet mean that a pointer coordinate belongs to the final courtyard.
    page.wait_for_function('''()=>{
      const links=['harborlight-theatre-css','harborlight-theatre-scene-css'].map(id=>document.getElementById(id));
      const canvas=document.querySelector('[data-theatre-canvas]');
      if(!canvas||links.some(link=>!link?.sheet))return false;
      const rect=canvas.getBoundingClientRect();
      return getComputedStyle(canvas).position==='relative'&&rect.width>280&&rect.height>150&&Math.abs(rect.width/rect.height-10/7)<.04;
    }''')
    page.evaluate('''async()=>{
      await document.fonts.ready;
      const urls=[...new Set([...document.querySelector('[data-theatre-panel]').querySelectorAll('image')].map(image=>image.href.baseVal))];
      await Promise.all(urls.map(url=>new Promise((resolve,reject)=>{
        const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error('Theatre image failed: '+url));image.src=url;
      })));
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    }''')

def failure_details(page):
    return page.evaluate('''()=>{
      const bounds=selector=>{const n=document.querySelector(selector);if(!n)return null;const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
      return{viewport:{width:innerWidth,height:innerHeight,scrollY},
        styles:['harborlight-theatre-css','harborlight-theatre-scene-css'].map(id=>({id,loaded:!!document.getElementById(id)?.sheet})),
        canvas:bounds('[data-theatre-canvas]'),plane:bounds('.theatre-scene-plane'),
        dragged:!!document.querySelector('.is-dragging'),
        positions:fixture?.state?.theatre?.positions,calls:fixture?.calls?.slice(-3)};
    }''')

def scenario(browser,language,mobile):
    context=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1100},has_touch=mobile,reduced_motion='reduce')
    context.route(ORIGIN+'/**',assets)
    page=context.new_page();page.set_default_timeout(10000);errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    stage='mount'
    try:
        page.goto(ORIGIN)
        page.evaluate('''async language=>{
          const [T,U]=await Promise.all([import('/harborlight-v1-theatre.js?v=frontend-v31'),import('/harborlight-v1-theatre-ui.js?v=frontend-v31')]);
          const state={worldTimeMs:1793793600000,resources:{coins:100000},settings:{language}};T.normalizeTheatre(state);
          const f=window.fixture={T,U,state,language,status:'saved',calls:[]};
          f.perform=action=>{f.calls.push(structuredClone(action));return T.theatreAction(state,action,{noAds:true});};
          f.mount=()=>{f.panel?.destroy();f.panel=U.createTheatrePanel({state:f.state,language,persistence:'cloud',getSaveStatus:()=>f.status,perform:action=>{f.calls.push(structuredClone(action));return T.theatreAction(f.state,action,{noAds:true});},noAds:true});document.querySelector('#fixture').append(f.panel.element);};f.mount();
        }''',language)
        panel=page.locator('[data-theatre-panel]')
        stage='venue-ready'
        venue_ready(page)
        expect(panel.locator('[data-theatre-welcome]')).to_be_visible()
        assert page.evaluate('fixture.state.theatre.collection.length')==0
        stage='welcome-garden'
        panel.locator('[data-theatre-welcome]').click()
        page.wait_for_function('fixture.state.theatre.collection.length===6')
        identity=page.evaluate('fixture.state.theatre.collection.find(x=>x.type==="fountain").id')
        initial=position(page,identity);balance=page.evaluate('fixture.state.resources.coins')
        hit=page.locator(f'[data-theatre-item="{identity}"]');hit.scroll_into_view_if_needed()
        rect=hit.bounding_box();plane=panel.locator('.theatre-scene-plane').bounding_box()
        x=rect['x']+rect['width']/2;y=rect['y']+rect['height']*.6
        dx=plane['width']*.062;dy=plane['height']*.043
        stage='pointer-drag'
        if mobile:
            client=context.new_cdp_session(page)
            client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
            client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx*.4,'y':y+dy*.4}]})
        else:
            page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+dx*.4,y+dy*.4,steps=3)
        # A background save status update must leave the pointer capture and art alive.
        page.evaluate('fixture.dragPlane=document.querySelector(".theatre-scene-plane");fixture.status="saving";fixture.panel.update()')
        assert page.evaluate('fixture.dragPlane===document.querySelector(".theatre-scene-plane")&&fixture.dragPlane.isConnected')
        assert position(page,identity)==initial,'Drag must commit once, on release'
        if mobile:
            client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx,'y':y+dy}]})
            client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        else:
            page.mouse.move(x+dx,y+dy,steps=5);page.mouse.up()
        page.wait_for_function('(id)=>fixture.calls.some(x=>x.type==="theatreMove"&&x.id===id)',arg=identity)
        moved=position(page,identity)
        assert abs(moved['x']-initial['x']-62)<1,(initial,moved)
        assert abs(moved['y']-initial['y']-30.1)<1,(initial,moved)
        assert page.evaluate('fixture.calls.filter(x=>x.type==="theatreMove").length')==1
        assert page.evaluate('fixture.state.resources.coins')==balance
        page.evaluate('fixture.status="saved";fixture.panel.update()')
        # Click/select/move works at an arbitrary point, including touch taps.
        stage='click-destination'
        page.locator(f'[data-theatre-owned="{identity}"]').click()
        page.locator(f'[data-theatre-move="{identity}"]').click()
        panel.locator('.theatre-canvas').scroll_into_view_if_needed()
        plane=panel.locator('.theatre-scene-plane').bounding_box()
        point={'x':plane['x']+plane['width']*.6543,'y':plane['y']+plane['height']*(533.7/700)}
        if mobile:
            page.touchscreen.tap(point['x'],point['y'])
        else:page.mouse.click(point['x'],point['y'])
        page.wait_for_function('(id)=>Math.abs(fixture.state.theatre.positions[id].x-654.3)<1',arg=identity)
        tapped=position(page,identity)
        assert abs(tapped['y']-533.7)<1,{'point':point,'plane':plane,'actual':tapped,'calls':page.evaluate('fixture.calls.slice(-3)')}
        # Fine keyboard movement changes coordinates, rather than jumping grid cells.
        stage='fine-keyboard'
        page.locator(f'[data-theatre-owned="{identity}"]').click();page.locator(f'[data-theatre-move="{identity}"]').click()
        page.keyboard.press('ArrowRight')
        page.wait_for_function('(p)=>Math.abs(fixture.state.theatre.positions[p.id].x-p.x-3)<.2',arg={'id':identity,'x':tapped['x']})
        page.keyboard.press('Shift+ArrowDown')
        page.wait_for_function('(p)=>Math.abs(fixture.state.theatre.positions[p.id].y-p.y-15)<.2',arg={'id':identity,'y':tapped['y']})
        fixed=position(page,identity)
        # Remember layout, improve beyond20, change the scene, then restore and reload.
        stage='saved-layout-and-level22'
        page.locator('[data-theatre-save-layout="0"]').click()
        page.evaluate('''id=>{
          while(fixture.state.theatre.collection.find(x=>x.id===id).level<22){const r=fixture.perform({type:'theatreUpgrade',id});if(!r.ok)throw Error(r.message);}
          fixture.perform({type:'theatreMove',id,x:302.7,y:563.8});fixture.panel.update();
        }''',identity)
        after_upgrade=page.evaluate('fixture.state.resources.coins')
        page.locator('[data-theatre-restore-layout="0"]').click()
        page.wait_for_function('(p)=>fixture.state.theatre.positions[p.id].x===p.point.x',arg={'id':identity,'point':fixed})
        assert position(page,identity)==fixed
        assert page.evaluate('id=>fixture.state.theatre.collection.find(x=>x.id===id).level',identity)==22
        assert page.evaluate('fixture.state.resources.coins')==after_upgrade
        stage='reload'
        page.evaluate('''()=>{const raw=JSON.parse(JSON.stringify(fixture.state));const next={worldTimeMs:raw.worldTimeMs+86400000,resources:{...raw.resources},settings:raw.settings};fixture.T.normalizeTheatre(next,raw);fixture.state=next;fixture.mount();}''')
        assert position(page,identity)==fixed
        assert page.evaluate('fixture.state.theatre.collection.length')==6
        assert not page.locator('[data-theatre-welcome]').count()
        # Top controls are before the courtyard and legible, with no horizontal page overflow.
        stage='legible-top-controls'
        assert page.evaluate('''()=>{
          const env=document.querySelector('.theatre-environment'),canvas=document.querySelector('.theatre-canvas');
          return env.getBoundingClientRect().top<canvas.getBoundingClientRect().top&&parseFloat(getComputedStyle(env.querySelector('select')).fontSize)>=16&&document.documentElement.scrollWidth<=innerWidth+2;
        }''')
        SHOTS.mkdir(exist_ok=True)
        panel.locator('.theatre-canvas').scroll_into_view_if_needed()
        page.screenshot(path=str(SHOTS/f'{language}-{"mobile" if mobile else "desktop"}.png'))
        assert not errors,errors
        print(json.dumps({'language':language,'mobile':mobile,'result':'PASS','realDrag':True,'singleDropCommit':True,'fineKeyboard':True,'savedPosition':fixed,'preservedLevel':22}),flush=True)
    except Exception as error:
        details={'diagnostic':'unavailable'}
        try:
            details=failure_details(page)
            SHOTS.mkdir(exist_ok=True)
            page.screenshot(path=str(SHOTS/f'{language}-{"mobile" if mobile else "desktop"}-failure.png'),full_page=True)
        except Exception as diagnostic_error:
            details['diagnosticError']=str(diagnostic_error).splitlines()[0]
        raise RuntimeError(f'Theatre free placement {language}/{"mobile" if mobile else "desktop"} at {stage}: {str(error).splitlines()[0] if str(error) else type(error).__name__}; {json.dumps(details)}') from error
    finally:context.close()

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
        try:
            for language in ['pl','en']:
                for mobile in [False,True]:scenario(browser,language,mobile)
        finally:browser.close()
    print('PASS Theatrev31 freepointer/touch,onecommit,keyboardfineplacement,welcomeonce,cloudstatus,designrestore/reload,level22andcoinspreserved;PL/ENdesktop/mobile')
if __name__=='__main__':run()
