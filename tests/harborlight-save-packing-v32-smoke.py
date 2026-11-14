"""Run the dependency-free save codec in real Chromium without Node globals."""
from pathlib import Path
from urllib.parse import unquote,urlsplit
import os
from playwright.sync_api import sync_playwright
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',Path(__file__).resolve().parents[1])).resolve()
BASE='http://127.0.0.1:47433'
DOCUMENT='''<!doctype html><meta charset="utf-8"><script type="module">
import {packAdventureSave,unpackAdventureSave} from './harborlight-v1-save-packing.js';
const source={ruleset:32,islandId:'island-1',resources:{coins:345,wood:71},residents:[{id:1}],adventures:{version:1,entries:Array.from({length:16000},(_,id)=>({id,route:'Przystań Żółwia 🌊⚓',clue:'Każda wskazówka pozostaje po powrocie.',seed:Math.imul(id+1,0x9e3779b9)>>>0}))},expeditionHour:{version:2,variants:{}},adventureBudget:{version:1,receipts:['paid-once']}};
const before=JSON.stringify(source),saved=structuredClone(source);packAdventureSave(saved);const restored=unpackAdventureSave(saved);let rejected=false;const bad=structuredClone(saved);bad.adventuresPacked.data=bad.adventuresPacked.data.slice(0,-4)+'AAAA';try{unpackAdventureSave(bad);}catch(e){rejected=e.code==='invalid-cloud-data';}
window.result={exact:JSON.stringify(restored)===before,sourceUnchanged:JSON.stringify(source)===before,nodeBufferAbsent:typeof Buffer==='undefined',packed:!!saved.adventuresPacked,beforeBytes:new TextEncoder().encode(before).length,afterBytes:new TextEncoder().encode(JSON.stringify(saved)).length,businessPlain:JSON.stringify(saved.resources)===JSON.stringify(source.resources)&&JSON.stringify(saved.residents)===JSON.stringify(source.residents),corruptionRejected:rejected};window.ready=true;
</script>'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context=browser.new_context()
    def asset(route):
        path=urlsplit(route.request.url).path
        if path=='/codec.html':return route.fulfill(body=DOCUMENT,content_type='text/html')
        target=(ROOT/unquote(path).lstrip('/')).resolve()
        if not target.is_relative_to(ROOT) or not target.is_file():return route.fulfill(status=404,body='Missing')
        return route.fulfill(body=target.read_bytes(),content_type='text/javascript')
    context.route(BASE+'/**',asset);page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE+'/codec.html');page.wait_for_function('window.ready===true');r=page.evaluate('window.result')
    assert not errors,errors
    assert all(r[k] for k in ['exact','sourceUnchanged','nodeBufferAbsent','packed','businessPlain','corruptionRejected']),r
    assert r['afterBytes']<r['beforeBytes'],r
    print('PASS browser UTF8 LZW: '+str(r),flush=True);context.close();browser.close()
