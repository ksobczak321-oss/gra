"""Stage-runtime contract against real UI/model and synthetic test-only images.

These colored RGBA charts deliberately are not approval of the final artwork.
No real account, payment provider or cloud is used or written.
"""
import json
import mimetypes
import os
from pathlib import Path
import subprocess
import struct
import zlib
from datetime import datetime, timezone
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright
from helpers.browser_offers import acknowledge_daily_offer, dismiss_player_offers

SOURCE=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',SOURCE)).resolve()
BASE='http://127.0.0.1:47539'
OUTPUT=Path(os.environ.get('HARBORLIGHT_TEST_OUTPUT','/tmp/harborlight-building-stages-v32'))
OUTPUT.mkdir(parents=True,exist_ok=True)
NOW=datetime(2026,11,18,12,tzinfo=timezone.utc)
MANIFEST=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{buildingStageFixture}from'./tests/helpers/building-stage-fixture.mjs';console.log(JSON.stringify(buildingStageFixture()));"],cwd=SOURCE,text=True))
FIXTURE=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import{createRequestedDevPreview}from'./harborlight-v1-dev-preview.js';
import{createState,requestUpgrade}from'./harborlight-v1-state.js';
import{settleDevelopment}from'./harborlight-v1-development.js';
const s=createRequestedDevPreview({search:'?preview=admin1-level5',hostname:'127.0.0.1',pathname:'/harborlight-v1-layered.html',authenticated:false,now:Date.UTC(2026,10,18,12),createState,settleDevelopment});
s.buildings.house.level=1;s.buildings.farm.level=2;s.settings.motion=true;s.settings.motionOverride=true;
const r=requestUpgrade(s,{building:'farm',premiumService:true,paidMaterials:true,paidCoins:true});
if(!r.ok)throw Error(r.message);console.log(JSON.stringify(s));
"""],cwd=SOURCE,text=True))
acknowledge_daily_offer(FIXTURE)


def png(width,height,pixels):
    def chunk(kind,data):
        return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    raw=b''.join(b'\0'+pixels[y*width*4:(y+1)*width*4] for y in range(height))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')


def charts():
    result={}
    for identity,spec in MANIFEST['buildings'].items():
        pixels=bytearray(spec['width']*spec['height']*4)
        for index,(rect,bbox) in enumerate(zip(spec['frameRects'],spec['bboxes'])):
            x,y=rect[0]+bbox[0],rect[1]+bbox[1]
            row=bytes((35+index*18,90+index*8,165-index*9,255))*bbox[2]
            for yy in range(y,y+bbox[3]):
                offset=(yy*spec['width']+x)*4;pixels[offset:offset+len(row)]=row
        result[spec['src']]=png(spec['width'],spec['height'],pixels)
    result[MANIFEST['crane']['src']]=png(80,80,bytes((165,100,40,255))*80*80)
    result[MANIFEST['terrain']['src']]=png(1672,941,bytes((12,34,56,255))*1672*941)
    return result


CHARTS=charts()


def routing(context,*,enabled=True,corrupt=False,held=None,synthetic=True):
    def route(request):
        assert request.request.method=='GET','Unexpected write: '+request.request.url
        path=unquote(urlsplit(request.request.url).path).lstrip('/')
        if synthetic and path=='assets/building-upgrades-v1/manifest.json':
            request.fulfill(content_type='application/json',body=json.dumps(MANIFEST if enabled else {'version':1,'enabled':False}));return
        if synthetic and path in CHARTS:
            if held is not None and path==MANIFEST['buildings']['house']['src']:
                held.append(request);return
            request.fulfill(content_type='image/png',body=b'corrupt atlas' if corrupt and path==MANIFEST['buildings']['house']['src'] else CHARTS[path]);return
        file=(ROOT/path).resolve()
        if file.is_relative_to(ROOT) and file.is_file():request.fulfill(path=str(file),content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')
        else:request.fulfill(status=404,body='Missing stage test asset')
    context.route(BASE+'/**',route)


def context_for(browser,width=1440,height=1000,**routes):
    context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<901,reduced_motion='reduce')
    routing(context,**routes)
    page=context.new_page();page.set_default_timeout(12000)
    page.clock.install(time=NOW);page.clock.pause_at(NOW)
    page.add_init_script('localStorage.setItem("harborlight-language","pl");window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(FIXTURE))
    return context,page


def loaded(page):
    page.goto(BASE+'/harborlight-v1-layered.html?profile=new-player',wait_until='networkidle')
    page.wait_for_function('document.documentElement.dataset.gameStartup==="ready"')
    dismiss_player_offers(page)


def canvas_hashes(page):
    return page.locator('#island-ambient').evaluate('''canvas=>{
        const sx=canvas.width/1672,sy=canvas.height/941,ctx=canvas.getContext('2d');
        return [[20,650,160,110],[810,520,60,130]].map(([x,y,w,h])=>{
            const data=ctx.getImageData(Math.round(x*sx),Math.round(y*sy),Math.round(w*sx),Math.round(h*sy)).data;
            let hash=2166136261;for(let i=0;i<data.length;i++){hash^=data[i];hash=Math.imul(hash,16777619);}return hash>>>0;
        });
    }''')


report=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for width,height in [(1440,1000),(390,844)]:
        context,page=context_for(browser,width,height)
        errors=[];writes=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda request:writes.append(request.url) if request.method!='GET' or '/api/' in request.url else None)
        loaded(page)
        expect(page.locator('[data-building-stage-scene]')).to_be_visible()
        assert page.locator('[data-building-stage-map]').count()==21
        assert page.locator('[data-building-stage-decoration] button').count()==0
        expect(page.locator('[data-building-stage-map="house"]')).to_have_attribute('data-building-stage','1')
        expect(page.locator('[data-building-stage-decoration]')).to_have_attribute('data-building-stage','3')
        expect(page.locator('[data-building-stage-map="farm"]')).to_have_attribute('data-building-stage','1')
        assert page.locator('[data-accepted-artwork]').count()==0,'Old four building patches were reintroduced'
        expect(page.locator('[data-building-construction-crane="farm"]')).to_be_visible()
        assert page.locator('[data-building-construction-crane]').count()==1
        # The actual model-owned paid fixture has ten seconds of work. Its
        # finish switches2->3 (new frame) and removes the crane without UI actions.
        before=canvas_hashes(page);page.clock.run_for(11000);after=canvas_hashes(page)
        assert all(a!=b for a,b in zip(before,after)),('Frozen ocean/waterfall',before,after)
        expect(page.locator('[data-building-stage-map="farm"]')).to_have_attribute('data-building-stage','2')
        assert page.locator('[data-building-construction-crane]').count()==0
        assert page.evaluate('window.__HARBORLIGHT_DEV_STATE__.buildings.farm.level')==3
        for identity,point in [('warehouse',[620,618]),('dock',[495,680]),('boat',[380,690])]:
            page.evaluate('p=>window.dispatchEvent(new CustomEvent("island-tour-focus",{detail:{region:[p[0]-40,p[1]-40,80,80]}}))',point)
            pos=page.evaluate('''([x,y])=>{const r=document.querySelector('#stage').getBoundingClientRect(),s=r.width/1672;return{x:r.x+x*s,y:r.y+y*s}}''',point)
            expected='hit-boat' if identity=='boat' else 'hit-world-'+identity
            top=page.evaluate('p=>document.elementFromPoint(p.x,p.y)?.closest(".island-hotspot")?.id',pos)
            assert top==expected,(width,identity,top,pos)
            if width<901:page.touchscreen.tap(pos['x'],pos['y'])
            else:page.mouse.click(pos['x'],pos['y'])
            expect(page.locator('#island-dialog')).to_be_visible()
            if identity!='boat':
                header=page.locator('[data-building-stage-header="'+identity+'"]')
                expect(header).to_be_visible()
                assert header.get_attribute('data-building-stage')==page.locator('[data-building-stage-map="'+identity+'"]').get_attribute('data-building-stage')
            page.locator('#island-dialog .dialog-close').click()
        for category in ['administration','economy']:
            page.locator('[data-mobile-category="'+category+'"]' if width<901 else '#hit-category-'+category).click()
            scope='.mobile-bottom-dock' if width<901 else '[data-building-dock]'
            for art in page.locator(scope+' [data-map-building-art]:visible').all():
                identity=art.get_attribute('data-map-building-art')
                assert art.get_attribute('data-building-stage')==page.locator('[data-building-stage-map="'+identity+'"]').get_attribute('data-building-stage'),identity
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not writes,writes
        assert not errors,errors
        page.screenshot(path=str(OUTPUT/f'fixture-runtime-{width}.png'))
        report.append({'width':width,'sprites':21,'real_model_completion_2_to_3':True,'canvas_ocean_waterfall_animate':True,'trusted_warehouse_port_ship_clicks':True,'same_map_dock_header_frame':True,'no_cloud_writes':True})
        print('PASS synthetic real-UI runtime '+str(width),flush=True)
        context.close()
    # Test compositor pixels and live scene replacement in a detached test host,
    # not by modifying the application's private game state.
    context,page=context_for(browser);loaded(page)
    result=page.evaluate('''async()=>{
        const api=await import('./harborlight-v1-building-stages.js?v=frontend-v32-22'),m=api.getBuildingStages();
        const make=color=>{const c=document.createElement('canvas');c.width=1672;c.height=941;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,1672,941);return c};
        const composed=api.composeBuildingTerrain(make('rgb(200,10,20)'),make('rgb(12,34,56)'),m),ctx=composed.getContext('2d');
        const pixel=(x,y)=>[...ctx.getImageData(x,y,1,1).data];
        let state={ruleset:32,buildings:Object.fromEntries(api.BUILDING_STAGE_IDS.map(id=>[id,{level:1}]))};
        state.buildings.townhall.level=3;state.buildings.house.level=19;
        state.constructionProjects=[{building:'house',stage:'queued',buildRemaining:20},{building:'house',stage:'building',buildRemaining:2}];
        const host=document.createElement('div'),before=JSON.stringify(state),scene=api.createBuildingStageScene({getState:()=>state,manifest:m,host});
        const initial=host.querySelector('[data-building-stage-decoration]').dataset.buildingStage;
        const active=host.querySelectorAll('[data-building-construction-crane]').length;
        const depth=+host.querySelector('[data-building-stage-map="fisher"]').style.zIndex > +host.querySelector('[data-building-stage-map="academy"]').style.zIndex;
        const unchanged=before===JSON.stringify(state);
        state={...state,buildings:{...state.buildings,townhall:{level:19}},constructionProjects:[],premiumServices:[]};scene.update();
        const replaced=host.querySelector('[data-building-stage-decoration]').dataset.buildingStage;
        const completed=host.querySelectorAll('[data-building-construction-crane]').length;scene.destroy();
        return{outside:pixel(0,0),inside:pixel(594,331),boat:pixel(330,700),initial,replaced,active,completed,depth,unchanged};
    }''')
    assert result=={'outside':[200,10,20,255],'inside':[12,34,56,255],'boat':[200,10,20,255],'initial':'2','replaced':'10','active':1,'completed':0,'depth':True,'unchanged':True},result
    print('PASS compositor pixels, protected boat, state replacement and depth',flush=True)
    page.clock.resume()
    clip=page.evaluate('''async()=>{
        const api=await import('./harborlight-v1-building-stages.js?v=frontend-v32-22');
        const wrapper=document.createElement('span');api.applyBuildingStageArtwork(wrapper,'house',1);
        const svg=wrapper.firstElementChild,image=svg.querySelector('image'),atlas=api.getBuildingStageImage(image.getAttribute('href'));
        const original=document.createElement('canvas');original.width=atlas.naturalWidth;original.height=atlas.naturalHeight;original.getContext('2d').drawImage(atlas,0,0);
        image.setAttribute('href',original.toDataURL());svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
        svg.setAttribute('width','1000');svg.setAttribute('height','100');svg.style.width='1000px';svg.style.height='100px';
        const paint=async()=>{const img=new Image();img.src='data:image/svg+xml;base64,'+btoa(new XMLSerializer().serializeToString(svg));await Promise.race([img.decode(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Test SVG decode timed out')),5000))]);
            const c=document.createElement('canvas');c.width=1000;c.height=100;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
            const row=ctx.getImageData(0,50,1000,1).data;let outside=0;for(let x=0;x<1000;x++)if((x<458||x>541)&&row[x*4+3]>16)outside++;
            return{outside,center:row[500*4+3]};};
        const positive=await paint();image.style.clipPath='none';const oldBug=await paint();return{positive,oldBug};
    }''')
    assert clip['positive']['center']==255 and clip['positive']['outside']==0,clip
    assert clip['oldBug']['outside']>0,'Negative control failed to expose adjacent atlas cells'
    print('PASS atlas crop and negative control exposing the former letterbox bug',flush=True)
    context.close()
    # Holding one declared atlas must keep all source slices and controls hidden.
    held=[];context,page=context_for(browser,held=held)
    print('START held mandatory atlas',flush=True)
    page.goto(BASE+'/harborlight-v1-layered.html?profile=new-player',wait_until='commit')
    page.wait_for_function('document.documentElement.dataset.gameStartup!=="ready"')
    for _ in range(50):
        if held:break
        page.wait_for_timeout(50)
    assert held,'No request for the held mandatory atlas'
    assert page.evaluate('document.documentElement.dataset.gameStartup')=='loading'
    expect(page.locator('#loading')).to_be_visible()
    held[0].fulfill(content_type='image/png',body=CHARTS[MANIFEST['buildings']['house']['src']])
    page.wait_for_function('document.documentElement.dataset.gameStartup==="ready"');context.close()
    print('PASS startup waits for its mandatory atlas',flush=True)
    context,page=context_for(browser,corrupt=True)
    page.goto(BASE+'/harborlight-v1-layered.html?profile=new-player',wait_until='networkidle')
    page.wait_for_function('document.documentElement.dataset.gameStartup==="error"')
    expect(page.locator('#loading button')).to_be_visible()
    assert page.locator('[data-building-stage-scene]').count()==0,'A partial staged world escaped a failed atlas'
    print('PASS corrupt mandatory atlas keeps error/retry gate closed',flush=True)
    context.close()
    # Independently decode the production WebPs and exercise the actual island.
    actual_manifest=json.loads((ROOT/'assets/building-upgrades-v1/manifest.json').read_text())
    assert actual_manifest.get('enabled') is True,'The real release must enable its complete staged artwork'
    context,page=context_for(browser,synthetic=False);loaded(page)
    real=page.evaluate('''async()=>{
        const api=await import('./harborlight-v1-building-stages.js?v=frontend-v32-22'),m=api.getBuildingStages();
        let variants=0;const failures=[];
        for(const id of api.BUILDING_STAGE_IDS){
            const spec=m.buildings[id];
            for(let tier=0;tier<10;tier++){
                // This independent audit deliberately decodes all200 shipped
                // files. Normal startup loads only the visible scene.
                const asset=spec.sprites?.[tier]||spec;
                let img=api.getBuildingStageImage(asset.src);
                if(!img){img=new Image();img.src=asset.src;await img.decode();}
                const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
                c.getContext('2d').drawImage(img,0,0);const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
                const [x,y,w,h]=spec.sprites?[0,0,asset.width,asset.height]:spec.frameRects[tier];let left=w,top=h,right=-1,bottom=-1,transparent=0;
                for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const a=pixels[((y+yy)*c.width+x+xx)*4+3];
                    if(a>16){left=Math.min(left,xx);top=Math.min(top,yy);right=Math.max(right,xx);bottom=Math.max(bottom,yy);}else transparent++;}
                const actual=[left,top,right-left+1,bottom-top+1];
                if(JSON.stringify(actual)!==JSON.stringify(spec.bboxes[tier]))failures.push({id,tier,actual,declared:spec.bboxes[tier]});
                if(transparent<w*h*.01)failures.push({id,tier,opaque:true});variants++;
            }
        }
        return{variants,failures,sprites:document.querySelectorAll('[data-building-stage-map]').length,
            source:document.querySelector('[data-building-stage-map="theatre"]').dataset.buildingStage,
            actualTheatre:window.__HARBORLIGHT_DEV_STATE__.buildings.theatre.level};
    }''')
    assert real['variants']==200 and not real['failures'],real
    assert real['sprites']==20+len(actual_manifest.get('decorations',[{}])) and real['actualTheatre']==1 and real['source']=='3',real
    page.screenshot(path=str(OUTPUT/'real-atlases-level5-active-crane.png'))
    # Geometry fixtures do not modify the application's model or save. Theatre
    # construction is hypothetical here (its actual building level stays1).
    # Derive the ink bounds from the actual crane pixels, not its transparent
    # outer SVG box: the old Lighthouse19 hid its working arm below the HUD.
    page.evaluate('''async()=>{
        const api=await import('./harborlight-v1-building-stages.js?v=frontend-v32-22'),m=api.getBuildingStages();
        const original=document.querySelector('[data-building-stage-scene]'),img=api.getBuildingStageImage(m.crane.src),[x,y,w,h]=m.crane.frameRect;
        const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(img,x,y,w,h,0,0,w,h);
        const pixels=ctx.getImageData(0,0,w,h).data;let left=w,top=h,right=-1,bottom=-1;
        for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(pixels[(yy*w+xx)*4+3]>16){left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,yy);bottom=Math.max(bottom,yy);}
        const fixture={ruleset:32,buildings:Object.fromEntries(api.BUILDING_STAGE_IDS.map(id=>[id,{level:1}])),constructionProjects:[]};
        const audit={api,m,original,world:fixture,ink:[left,top,right-left+1,bottom-top+1]};
        audit.scene=api.createBuildingStageScene({manifest:m,getState:()=>audit.world,host:document.querySelector('#stage')});
        original.hidden=true;window.stageCraneGeometry=audit;
    }''')
    crane_geometry=[];world_positions={}
    for width,height in [(1672,941),(1440,1000),(901,1000),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        # Let the ordinary HUD populate the responsive menu after resizing;
        # then hide only its original visual layer beneath this test fixture.
        page.clock.run_for(1100)
        page.evaluate('stageCraneGeometry.original.hidden=true')
        for level in [1,19]:
            for identity in actual_manifest['buildings']:
                row=page.evaluate('''([level,id])=>{
                    const a=stageCraneGeometry;
                    a.world={ruleset:32,buildings:Object.fromEntries(a.api.BUILDING_STAGE_IDS.map(k=>[k,{level:k==='theatre'?1:level}])),constructionProjects:[{building:id,stage:'building',buildRemaining:300,order:1}]};
                    a.scene.update();window.dispatchEvent(new CustomEvent('island-tour-focus',{detail:{region:a.m.buildings[id].mapRect}}));
                    const node=a.scene.element.querySelector('[data-building-construction-crane="'+id+'"]'),r=node.getBoundingClientRect(),[x,y,w,h]=a.ink,[,,fw,fh]=a.m.crane.frameRect;
                    const inkBounds=r=>({left:r.left+x/fw*r.width,top:r.top+y/fh*r.height,right:r.left+(x+w)/fw*r.width,bottom:r.top+(y+h)/fh*r.height});
                    const paint=inkBounds(r);
                    const box=n=>n.getBoundingClientRect().toJSON(),visible=s=>[...document.querySelectorAll(s)].filter(n=>n.getClientRects().length).map(box);
                    const viewport=box(document.querySelector('#viewport')),stage=box(document.querySelector('#stage')),hud=visible('.island-topbar,.mobile-island-hud');
                    let oldWouldClip=false;
                    if(id==='lighthouse'&&level===19){
                        const saved=node.style.cssText,f=a.api.buildingStagePlacement(a.m,id,level),cw=parseFloat(node.style.width),ch=parseFloat(node.style.height);
                        node.style.left=`${f.x+f.w*.55-cw/2}px`;node.style.top=`${f.y-ch*.65}px`;
                        const previous=inkBounds(node.getBoundingClientRect());
                        oldWouldClip=previous.top<Math.max(viewport.top,stage.top)-1||hud.some(h=>Math.min(previous.right,h.right)-Math.max(previous.left,h.left)>1&&Math.min(previous.bottom,h.bottom)-Math.max(previous.top,h.top)>1);
                        node.style.cssText=saved;
                    }
                    return{id,level,paint,viewport,stage,hud,oldWouldClip,world:[node.style.left,node.style.top,node.style.width,node.style.height]};
                }''',[level,identity])
                paint=row['paint'];vp=row['viewport'];stage_box=row['stage']
                assert paint['left']>=max(vp['left'],stage_box['left'],0)-1,(width,identity,level,row)
                assert paint['right']<=min(vp['right'],stage_box['right'],width)+1,(width,identity,level,row)
                assert paint['top']>=max(vp['top'],stage_box['top'],0)-1,(width,identity,level,row)
                assert paint['bottom']<=min(vp['bottom'],stage_box['bottom'],height)+1,(width,identity,level,row)
                for hud in row['hud']:
                    overlap_width=min(paint['right'],hud['right'])-max(paint['left'],hud['left'])
                    overlap_height=min(paint['bottom'],hud['bottom'])-max(paint['top'],hud['top'])
                    assert overlap_width<=1 or overlap_height<=1,(width,identity,level,'Crane working arm beneath HUD',row)
                key=(identity,level)
                assert world_positions.setdefault(key,row['world'])==row['world'],'World placement changed with viewport or panning'
                if identity=='lighthouse' and level==19:
                    assert row['oldWouldClip'],'Negative control failed to recreate the former Lighthouse HUD clipping'
                crane_geometry.append({'width':width,'height':height,**row})
                if identity=='lighthouse' and level==19 and width in [1672,390]:
                    page.screenshot(path=str(OUTPUT/f'real-lighthouse-crane19-{width}.png'))
    page.evaluate('stageCraneGeometry.scene.destroy();stageCraneGeometry.original.hidden=false;delete window.stageCraneGeometry')
    print('PASS160actual crane alpha-bounds:20families×min/max×1672/1440/901/390, fixed world placement and no HUD clipping',flush=True)
    context.close();browser.close()
(OUTPUT/'report.json').write_text(json.dumps({'runtime':report,'compositor_and_recovery':result,'atlas_clip_negative_control':clip,'startup_hold_and_corruption':'PASS','real_atlases':real,'crane_alpha_geometry':crane_geometry,'synthetic_images_not_art_approval':True},indent=2)+'\n')
print('PASS staged-building runtime:20families+noninteractive decoration,real model finish,cranes,ground order,same frame across views,physical taps,live ocean/waterfall,strict startup and protected pixels. Synthetic test images only.')
