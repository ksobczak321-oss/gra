"""Real HTTP cache regression: an old manifest must not restore huge atlases.

No Playwright routes, cache disabling/clearing, game-state hooks or real accounts
are used. Both cache poisoning and revalidation use ordinary fetch/navigation.
The archive fixture is the exact approved cache17 manifest, with its SHA pinned.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import hashlib
import json
import os
from pathlib import Path
import subprocess
import threading
from urllib.parse import parse_qs, unquote, urlsplit

from playwright.sync_api import expect, sync_playwright
from helpers.browser_offers import dismiss_player_offers
from helpers.building_stage_acceptance import staged_manifest, assert_scene

SOURCE=Path(__file__).resolve().parents[1]
ROOT=Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT',SOURCE)).resolve()
OUTPUT=Path(os.environ.get('HARBORLIGHT_BUILDING_CACHE_QA_OUTPUT','/tmp/harborlight-building-cache-v32'))
OUTPUT.mkdir(parents=True,exist_ok=True)
LEGACY_SOURCE='e5d76110365c77d5c026b53b6195e56a3a327542'
LEGACY_SHA='aeb8d176511228f3321859425aa3aec82f1bb7dae8354f055fe25f6f8225606c'
MANIFEST_PATH='/assets/building-upgrades-v1/manifest.json'
LEGACY=(SOURCE/'tests/helpers/legacy-building-manifest-cache17.json').read_bytes()
assert hashlib.sha256(LEGACY).hexdigest()==LEGACY_SHA, 'Historical cache fixture changed'
CURRENT_BYTES=(ROOT/MANIFEST_PATH.lstrip('/')).read_bytes()
CURRENT=staged_manifest(ROOT)
assert CURRENT and all(family.get('sprites') for family in CURRENT['buildings'].values())
CURRENT_SHA=hashlib.sha256(CURRENT_BYTES).hexdigest()
constant=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {BUILDING_STAGE_MANIFEST_URL} from './harborlight-v1-building-stages.js';console.log(JSON.stringify(BUILDING_STAGE_MANIFEST_URL));"],cwd=ROOT,text=True))
CURRENT_URL='/'+constant.lstrip('/')
assert urlsplit(CURRENT_URL).path==MANIFEST_PATH and parse_qs(urlsplit(CURRENT_URL).query).get('v')==['frontend-v32-22'], 'The current app must request its cache19 manifest URL'
# Reproduce the deployed rule order rather than relying on test-only headers.
header_rules=json.loads((SOURCE/'firebase.json').read_text())['hosting']['headers']
specific=[(i,row) for i,row in enumerate(header_rules) if row['source']==MANIFEST_PATH]
assert specific and specific[-1][0]>max(i for i,row in enumerate(header_rules) if row['source']=='/assets/**'), 'The manifest rule must override the long-lived general assets policy'
CURRENT_POLICY=next(header['value'] for header in specific[-1][1]['headers'] if header['key'].lower()=='cache-control')
assert 'max-age=0' in CURRENT_POLICY and 'must-revalidate' in CURRENT_POLICY
IMAGE_LIMIT=20*1024*1024


class StaticHandler(SimpleHTTPRequestHandler):
    protocol_version='HTTP/1.1'
    def log_message(self,*_args):pass
    def end_headers(self):
        if urlsplit(self.path).path!=MANIFEST_PATH:
            self.send_header('Cache-Control','public, max-age=86400' if urlsplit(self.path).path.startswith('/assets/') else 'public, max-age=0, must-revalidate')
        super().end_headers()
    def do_POST(self):
        self.server.state['writes'].append(self.path)
        self.send_error(405)
    def do_GET(self):
        state=self.server.state;parsed=urlsplit(self.path)
        state['all_gets'].append(self.path)
        if parsed.path=='/prime.html':
            body=b'<!doctype html><html><title>Cache primer</title><body>HTTP cache primer</body></html>'
            self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
        if parsed.path==MANIFEST_PATH:
            body=LEGACY if state['generation']=='legacy' else CURRENT_BYTES
            etag='"'+hashlib.sha256(body).hexdigest()+'"'
            policy='public, max-age=86400' if state['generation']=='legacy' else CURRENT_POLICY
            status=304 if self.headers.get('If-None-Match')==etag else 200
            state['manifest_gets'].append({'url':self.path,'generation':state['generation'],'status':status,'etag':etag,'if_none_match':self.headers.get('If-None-Match'),'request_cache_control':self.headers.get('Cache-Control'),'response_cache_control':policy})
            self.send_response(status);self.send_header('Cache-Control',policy);self.send_header('ETag',etag)
            if status==200:self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)))
            self.end_headers()
            if status==200:self.wfile.write(body)
            return
        super().do_GET()


def fetch_catalog(page,path):
    return page.evaluate('''async path=>{const r=await fetch(path),m=await r.json();return{status:r.status,etag:r.headers.get('etag'),cacheControl:r.headers.get('cache-control'),hasSprites:!!m.buildings.house.sprites,paintDepth:m.buildings.leatherworks.paintDepth??null}}''',path)


def actual_game(page,base,state,label):
    before=len(state['manifest_gets'])
    page.goto(base+'/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5',wait_until='domcontentloaded')
    page.wait_for_function('document.documentElement.dataset.gameStartup==="ready"',timeout=30000)
    dismiss_player_offers(page)
    expect(page.locator('#loading')).to_be_hidden()
    assert_scene(page,CURRENT)
    result=page.evaluate('''async()=>{
      const moduleURL=performance.getEntriesByType('resource').map(e=>e.name).find(url=>url.includes('/harborlight-v1-building-stages.js'));
      const api=await import(moduleURL),catalog=api.getBuildingStages(),scene=document.querySelector('[data-building-stage-scene]');
      const images=[...scene.querySelectorAll('svg image')].map(node=>node.getAttribute('href'));
      const depth=id=>Number(getComputedStyle(scene.querySelector('[data-building-stage-map="'+id+'"]')).zIndex);
      const resources=performance.getEntriesByType('resource').map(e=>({url:e.name,path:new URL(e.name).pathname.slice(1),encoded:e.encodedBodySize,transfer:e.transferSize}));
      return{hasSprites:!!catalog.buildings.house.sprites,paintDepth:catalog.buildings.leatherworks.paintDepth,images,leatherworksDepth:depth('leatherworks'),quarryDepth:depth('quarry'),resources};
    }''')
    assert len(state['manifest_gets'])==before+1, 'The current app must issue a real manifest revalidation GET'
    request=state['manifest_gets'][-1]
    assert request['url']==CURRENT_URL and request['generation']=='current'
    assert result['hasSprites'] and result['paintDepth']==500, result
    assert result['leatherworksDepth']>result['quarryDepth'], result
    assert len(result['images'])==20+len(CURRENT['decorations'])
    all_current={sprite['src'] for family in CURRENT['buildings'].values() for sprite in family['sprites']}
    assert set(result['images'])<=all_current, 'A cached legacy atlas URL returned to the live scene'
    image_resources=[row for row in result['resources'] if row['path'].endswith(('.png','.webp','.jpg','.jpeg','.svg'))]
    image_bytes=sum(row['encoded'] for row in image_resources)
    assert image_bytes<IMAGE_LIMIT, (label,image_bytes,IMAGE_LIMIT)
    result.update(label=label,actual_manifest_request=request,startup_image_bytes=image_bytes,startup_image_byte_limit=IMAGE_LIMIT)
    page.screenshot(path=str(OUTPUT/(label+'.png')))
    return result


def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(StaticHandler,directory=str(ROOT)))
    state={'generation':'legacy','manifest_gets':[],'all_gets':[],'writes':[]}
    server.state=state
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    report={'legacy_source':LEGACY_SOURCE,'legacy_sha256':LEGACY_SHA,'current_sha256':CURRENT_SHA,'current_manifest_url':CURRENT_URL,'current_hosting_policy':CURRENT_POLICY,'real_HTTP':True,'Playwright_route_used':False,'cache_disabled_or_cleared':False,'model_or_real_account_hooks':False}
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
            context=browser.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce')
            page=context.new_page();errors=[];external=[];responses=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('request',lambda request:external.append(request.url) if urlsplit(request.url).netloc!=urlsplit(base).netloc else None)
            cdp=context.new_cdp_session(page);cdp.send('Network.enable')
            cdp.on('Network.responseReceived',lambda event:responses.append({'url':event['response']['url'],'status':event['response']['status'],'fromDiskCache':event['response'].get('fromDiskCache',False),'fromServiceWorker':event['response'].get('fromServiceWorker',False)}) if urlsplit(event['response']['url']).path==MANIFEST_PATH else None)
            try:
                page.goto(base+'/prime.html',wait_until='load')
                report['prime_bare_legacy']=fetch_catalog(page,MANIFEST_PATH)
                assert not report['prime_bare_legacy']['hasSprites'] and len(state['manifest_gets'])==1
                state['generation']='current'
                report['negative_bare_fresh_cache']=fetch_catalog(page,MANIFEST_PATH)
                assert not report['negative_bare_fresh_cache']['hasSprites'] and len(state['manifest_gets'])==1, 'Negative control must reproduce the real stale fresh-cache behavior'
                page.add_init_script('localStorage.setItem("harborlight-language","pl")')
                report['first_actual_game']=actual_game(page,base,state,'versioned-current-game')
                assert len(state['manifest_gets'])==2
                # Also prime the versioned URL with a fresh24h legacy response.
                # Its prior current response was max-age0, so normal fetch will
                # revalidate and cache this deliberately older server metadata.
                page.goto(base+'/prime.html',wait_until='load')
                state['generation']='legacy'
                report['prime_versioned_legacy']=fetch_catalog(page,CURRENT_URL)
                assert not report['prime_versioned_legacy']['hasSprites'] and len(state['manifest_gets'])==3
                # Let the HTTP cache commit its body, then leave this document
                # before probing; this excludes a same-document Blink cache
                # as an explanation for the negative control.
                page.wait_for_timeout(250)
                page.goto(base+'/prime.html?probe=versioned-cache',wait_until='load')
                state['generation']='current'
                report['negative_versioned_fresh_cache']=fetch_catalog(page,CURRENT_URL)
                assert not report['negative_versioned_fresh_cache']['hasSprites'] and len(state['manifest_gets'])==3
                # Versioning alone cannot recover this second poisoned entry.
                # The real module's cache:no-cache must force a fourth GET.
                report['second_actual_game']=actual_game(page,base,state,'forced-revalidation-current-game')
                assert len(state['manifest_gets'])==4 and state['manifest_gets'][-1]['if_none_match']=='"'+LEGACY_SHA+'"'
                # A normal reload then revalidates the unchanged current ETag.
                report['unchanged_reload']=actual_game(page,base,state,'unchanged-etag-reload')
                assert len(state['manifest_gets'])==5 and state['manifest_gets'][-1]['status']==304
                report.update(manifest_network_GETs=state['manifest_gets'],CDP_manifest_responses=responses,JS_errors=errors,external_requests=external,write_requests=state['writes'])
                atlas_paths={family['src'] for family in CURRENT['buildings'].values()}
                assert not any(unquote(urlsplit(path).path).lstrip('/') in atlas_paths for path in state['all_gets']), 'Gameplay downloaded a full historical atlas'
                assert not errors and not external and not state['writes'], report
                report.update(status='PASS',negative_controls=2,actual_current_game_boots=3,full_atlas_requests=0,account_or_cloud_writes=False)
            except Exception:
                report.update(status='FAIL',manifest_network_GETs=state['manifest_gets'],CDP_manifest_responses=responses,JS_errors=errors,external_requests=external,write_requests=state['writes'])
                (OUTPUT/'failure-report.json').write_text(json.dumps(report,indent=2)+'\n')
                raise
            finally:
                context.close();browser.close()
    finally:
        server.shutdown();server.server_close()
    (OUTPUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'status':'PASS','negative_real_HTTP_cache_controls':2,'actual_game_boots':3,'manifest_network_GETs':len(state['manifest_gets']),'only_current_sprites':True,'leatherworks_depth':report['first_actual_game']['leatherworksDepth'],'quarry_depth':report['first_actual_game']['quarryDepth'],'first_image_bytes':report['first_actual_game']['startup_image_bytes'],'no_routes_or_cache_disabling':True,'no_real_account_or_cloud_writes':True}))
    print('PASS real HTTP warm building cache: legacy bare URL and versioned fresh-cache controls, current sprites/depth, mandatory revalidation and unchanged ETag304.')


if __name__=='__main__':run()
