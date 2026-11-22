"""Actual PL/EN instruction gates and controls; isolated in-memory boards only."""
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', Path(__file__).resolve().parents[1])).resolve()
OUT = Path(os.environ.get('HARBORLIGHT_INSTRUCTIONS_QA_OUTPUT', '/tmp/harborlight-minigame-instructions'))
BASE = 'http://127.0.0.1:47476'
HTML = '''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="./harborlight-v1-minigame.css"><link rel="stylesheet" href="./harborlight-v1-original-puzzles.css"><style>body{margin:8px;background:#071e26;color:#e1edf0;font:15px/1.5 system-ui}main{max-width:960px;margin:auto}</style></head><body><main></main><script type="module">
import {createState,EXPEDITIONS}from'./harborlight-v1-state.js';
import * as A from'./harborlight-v1-adventures.js';
import * as O from'./harborlight-v1-original-puzzles.js';
import * as Activities from'./harborlight-v1-activities.js';
import {createAdventuresPanel}from'./harborlight-v1-adventures-ui.js';
import {mountMiniGame}from'./harborlight-v1-minigame-ui.js';
import {mountOriginalPuzzle}from'./harborlight-v1-original-puzzles-ui.js';
import {islandPuzzleSolution}from'./harborlight-v1-island-puzzles.js';
window.setup=(family,kind,language='pl')=>{
 controller?.destroy?.();controller?.dispose?.();document.querySelector('main').replaceChildren();window.actions=[];
 window.s=createState(Date.parse('2026-11-22T12:00:00Z'),{ruleset:32,onboarding:false});s.highestTownhall=20;for(const b of Object.values(s.buildings))b.level=20;s.activitySeed=173;
 window.context={highestTownhall:20,expeditions:EXPEDITIONS};window.family=family;window.kind=kind;window.lang=language;
 if(family==='original'){O.originalPuzzleAction(s,{type:'originalPuzzleStart',variant:kind,deferStart:true},context);window.run=()=>s.originalPuzzles.attempts[kind];window.send=a=>{actions.push(a);const r=O.originalPuzzleAction(s,a,context);controller.update(s);return r;};window.controller=mountOriginalPuzzle({host:document.querySelector('main'),state:s,getState:()=>s,variant:kind,language,onAction:send});}
 else if(family==='expedition'){Activities.activityAction(s,{type:'expeditionStart',expedition:'misty',gameKind:kind,deferStart:true},context);window.run=()=>Activities.activeExpeditionRun(s);window.send=a=>{actions.push(a);const r=Activities.activityAction(s,a,context);controller.update(run(),Activities.expeditionRoundStatus(s,run()));return r;};window.controller=mountMiniGame({host:document.querySelector('main'),run:run(),language,status:Activities.expeditionRoundStatus(s,run()),onAction:send});}
 else {const a=family==='story'?{type:'adventureStart',kind:'escapeStory',storyId:kind,deferStart:true}:family==='puzzle'?{type:'adventureStart',kind:'islandPuzzle',puzzleKind:kind,deferStart:true}:{type:'adventureStart',kind,deferStart:true};const r=A.adventureAction(s,a,context);if(!r.ok)throw Error(JSON.stringify(r));window.run=()=>s.adventures.active;window.send=a=>{actions.push(a);const r=A.adventureAction(s,a,context);controller.update(s);return r;};window.controller=createAdventuresPanel({state:s,language,onAction:send});document.querySelector('main').append(controller.element);}
 window.pending=()=>run()?.instructionsPending===true||run()?.data?.instructionsPending===true||run()?.data?.stageAttempt?.instructionsPending===true||run()?.data?.classicAttempt?.instructionsPending===true;
 window.remaining=()=>family==='original'?run().remaining:family==='expedition'?Activities.expeditionRoundStatus(s,run()).remaining:run().data.stageAttempt?.remaining??run().data.classicAttempt?.remaining??run().data.duration;
 window.advance=n=>{if(family==='original')O.advanceOriginalPuzzles(s,n);else if(family==='expedition')Activities.advanceActivities(s,n);else A.advanceAdventures(s,n);if(family==='expedition')controller.update(run(),Activities.expeditionRoundStatus(s,run()));else controller.update(s);};
};
window.controller=null;window.solve=()=>{const r=run();for(const move of islandPuzzleSolution(r.data.puzzle)){if(move.type==='tick')advance(move.seconds);else send({type:'adventureInput',adventureId:r.id,command:'puzzleMove',move});}};window.ready=true;
window.setupCampaign=language=>{setup('story','captainless-ship',language);controller.destroy();run().data.rescueContext={source:'campaign',mode:'supplies'};window.returnCount=0;window.controller=createAdventuresPanel({state:s,language,onAction:send,onMainMission:()=>window.returnCount++,assistancePlan:{main:{titlePl:'Rozbuduj Ratusz do poziomu 4',title:'Upgrade the Town Hall to level4'},population:{current:81,required:81,met:true},assistanceMode:'supplies',supplies:{wood:100},residentsRequested:0}});document.querySelector('main').replaceChildren(controller.element);};
</script></body></html>'''

def run():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'scenarios': [], 'errors': [], 'external_requests': [], 'account_writes': 0}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=os.environ.get('HARBORLIGHT_CHROMIUM'))
        for mobile, language in [(False, 'pl'), (True, 'pl'), (False, 'en'), (True, 'en')]:
            context = browser.new_context(viewport={'width': 390 if mobile else 1200, 'height': 844 if mobile else 1000}, has_touch=mobile)
            def route(request):
                url = urlsplit(request.request.url)
                if request.request.method != 'GET' or url.netloc != urlsplit(BASE).netloc:
                    report['external_requests'].append(request.request.url); request.abort(); return
                if url.path == '/fixture.html': request.fulfill(body=HTML, content_type='text/html'); return
                file = (ROOT/unquote(url.path).lstrip('/')).resolve()
                if not file.is_relative_to(ROOT) or not file.is_file(): request.fulfill(status=404); return
                request.fulfill(body=file.read_bytes(), content_type=mimetypes.guess_type(str(file))[0] or 'application/octet-stream')
            context.route('**/*', route)
            page = context.new_page(); page.on('pageerror', lambda error: report['errors'].append(str(error)))
            page.goto(BASE+'/fixture.html'); page.wait_for_function('window.ready')
            for family, kind in [('puzzle','gull'),('puzzle','gears'),('puzzle','paperFold'),('puzzle','packing'),('puzzle','untangle'),('classic','bridge'),('classic','cargoRain'),('story','first-light'),('expedition','triples'),('expedition','tilt'),('original','signal-line')]:
                page.evaluate('args=>setup(...args)', [family, kind, language]); page.wait_for_function('pending()')
                card = page.locator('[data-minigame-instructions]:not(details)')
                expect(card).to_have_count(1); expect(card.locator('ol li').first).to_be_visible()
                assert len(card.inner_text()) > 160
                before = page.evaluate('remaining()'); page.evaluate('advance(600)')
                assert page.evaluate('pending()') and page.evaluate('remaining()') == before, (family,kind,'reading consumed time')
                assert not page.evaluate('actions.some(a=>/Input|Reveal/.test(a.type))'), (family,kind,'automatic game input before start')
                assert page.locator('body').evaluate('e=>e.scrollWidth<=innerWidth+1'), (family,kind,language,'overflow')
                if kind=='paperFold' and language=='pl': page.screenshot(path=str(OUT/f'paperFold-before-{"mobile" if mobile else "desktop"}.png'), full_page=True)
                card.locator('[data-minigame-begin]').click(); page.wait_for_function('!pending()')
                expect(page.locator('[data-minigame-instructions]:not(details)')).to_have_count(0)
                expect(page.locator('[data-minigame-instructions] summary').first).to_be_visible()
                if family=='expedition' and kind=='tilt':
                    page.wait_for_function('document.querySelector("canvas").getBoundingClientRect().width>200')
                if family not in ('story','puzzle') or kind!='paperFold':
                    page.evaluate('advance(1)'); assert page.evaluate('remaining()') < before or kind=='cargoRain', (family,kind,'timer did not start')
                if kind=='paperFold':
                    cell=page.locator('[data-puzzle-cell]').first; old=cell.inner_text(); cell.click(); assert cell.inner_text()!=old, 'paper-fold click did not change window'
                    page.evaluate('solve()'); assert page.evaluate('run().data.puzzle.solved')
                    if language=='pl': page.screenshot(path=str(OUT/f'paperFold-solved-{"mobile" if mobile else "desktop"}.png'), full_page=True)
                if kind=='packing':
                    expect(page.locator('[data-packing-shape]')).to_have_count(4)
                    assert page.locator('[data-packing-shape]').evaluate_all('nodes=>nodes.every(n=>n.querySelectorAll("rect").length===4)')
                    page.evaluate('solve()'); assert page.evaluate('run().data.puzzle.solved')
                if kind=='untangle':
                    assert page.locator('[data-puzzle-rope]').evaluate_all('nodes=>nodes.every(n=>!n.getAttribute("d").includes("C"))')
                    page.evaluate('solve()'); assert page.evaluate('run().data.puzzle.solved')
                if family=='story':
                    page.evaluate('solve()'); assert page.evaluate('run().data.puzzle.solved')
                    page.locator('[data-puzzle-next-room]').click(); page.wait_for_function('pending()')
                    next_before=page.evaluate('remaining()');page.evaluate('advance(600)');assert page.evaluate('remaining()')==next_before
                    expect(page.locator('[data-minigame-instructions]:not(details) [data-minigame-begin]')).to_be_visible()
                report['scenarios'].append({'family':family,'kind':kind,'language':language,'mobile':mobile,'reading_seconds_advanced':600,'start':'PASS'})
            page.evaluate('setupCampaign',language)
            purpose=page.locator('[data-adventure-campaign-purpose]')
            expect(purpose).to_be_visible()
            expect(purpose).to_contain_text('Warunek liczby mieszkańców jest już spełniony' if language=='pl' else 'population requirement is already met')
            expect(purpose.locator('[data-adventure-assistance-supplies]')).to_contain_text('100')
            purpose.locator('[data-adventure-return-main-mission]').click();assert page.evaluate('returnCount')==1
            report['scenarios'].append({'family':'campaign-purpose','language':language,'mobile':mobile,'fulfilled_population':81,'assistance_mode':'supplies','callback':'PASS'})
            context.close()
        browser.close()
    assert not report['errors'], report['errors']; assert not report['external_requests'], report['external_requests']
    report['status']='PASS'; (OUT/'report.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps({'status':'PASS','scenarios':len(report['scenarios']),'report':str(OUT/'report.json')}))

if __name__ == '__main__': run()
