"""Authenticated live CAS regression; owns an ephemeral local server and accounts.
Periodic Kingdom polling must preserve live original and classic minigames.
A real page reload still ends the current attempt under the approved rules.
"""
import json
import os
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['node','--input-type=module','-e',"""
import {createLocalDevRuntime} from './backend/dev-runtime.mjs';
const runtime=await createLocalDevRuntime({ephemeral:true});await runtime.listen(0);
console.log(JSON.stringify({port:runtime.server.address().port}));
process.once('SIGTERM',()=>runtime.close().then(()=>process.exit(0)));
"""],cwd=ROOT,stdout=subprocess.PIPE,text=True)
try:
    address='http://127.0.0.1:'+str(json.loads(server.stdout.readline())['port'])
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(12000)
        errors=[];polls=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('response',lambda response:polls.append(response.status) if '/api/v1/kingdom' in response.url else None)
        # Only shorten the heartbeat in the harness, preserving actual model clocks.
        page.add_init_script('localStorage.setItem("harborlight-language","pl");const original=setInterval;window.setInterval=(fn,delay,...args)=>original(fn,delay===60000?1800:delay,...args);')
        page.goto(address+'/harborlight-auth.html',wait_until='networkidle')
        page.locator('#email').fill('admin3');page.locator('#password').fill('admin3');page.locator('#account-submit').click()
        page.wait_for_url('**/harborlight-v1-layered.html**')
        page.locator('[data-onboarding-next]').click();page.locator('[data-onboarding-name]').fill('Live CAS Harbor')
        page.locator('[data-onboarding-next]').click();page.locator('[data-onboarding-exit]').click()
        page.wait_for_timeout(700)
        for _ in range(7):
            external=page.locator('dialog[open]:not(#island-dialog)')
            if external.count():external.last.locator('button:not([data-v32-speed-normal]):not([data-v32-speed-fast])').last.click();page.wait_for_timeout(120)
            elif page.locator('#island-dialog[open]').count():page.locator('#island-dialog .dialog-close').click();page.wait_for_timeout(120)
            else:break
        def state(expression):return page.evaluate('window.__HARBORLIGHT_DEV_STATE__.'+expression)
        def expeditions():
            page.locator('#hit-menu').evaluate('(e)=>e.click()');page.get_by_role('button',name='Ekspedycje',exact=True).click()
        expeditions();page.locator('[data-original-puzzle-choice="signal-line"]').click()
        for _ in range(8):
            page.get_by_role('button',name='Rozpocznij próbę',exact=True).click();page.wait_for_timeout(300)
            if state('originalPuzzles.attempts["signal-line"]?.status')=='active':break
        assert state('originalPuzzles.attempts["signal-line"].status')=='active'
        before=len(polls);page.wait_for_timeout(4500)
        assert len(polls)>before and all(status==200 for status in polls[before:]),polls
        assert state('originalPuzzles.attempts["signal-line"].status')=='active'
        assert state('originalPuzzles.failures["signal-line"]')==0
        page.locator('.dialog-close').click();page.wait_for_timeout(300)
        expeditions()
        for _ in range(8):
            page.locator('[data-expedition-choice="triples"]').click();page.wait_for_timeout(300)
            if page.evaluate('Object.values(window.__HARBORLIGHT_DEV_STATE__.expeditionRuns).some(run=>run.status==="active")'):break
        before=len(polls);page.wait_for_timeout(4500)
        assert len(polls)>before and all(status==200 for status in polls[before:]),polls
        assert page.evaluate('Object.values(window.__HARBORLIGHT_DEV_STATE__.expeditionRuns).some(run=>run.status==="active")')
        page.reload(wait_until='networkidle');page.wait_for_timeout(500)
        assert not page.evaluate('Object.values(window.__HARBORLIGHT_DEV_STATE__.expeditionRuns).some(run=>run.status==="active")')
        assert not errors,errors
        browser.close()
    print('Live Kingdom CAS preserves both active minigame families; real browser reload still ends the active attempt.')
finally:
    server.terminate()
    try:server.wait(timeout=8)
    except subprocess.TimeoutExpired:server.kill();server.wait()
