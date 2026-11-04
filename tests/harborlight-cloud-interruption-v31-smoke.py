"""Known foreground outage protection in the actual cloud-loaded game.

The public game is unmodified. Firebase identity and Firestore REST use the
existing isolated fixtures; no real account, provider or cloud data is touched.
Visibility events exercise the real host handlers, not a direct model action.
"""
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('cloud_interruption_v31_base', SOURCE / 'tests/harborlight-dev-game-smoke.py')
cloud = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cloud)
UID = 'dev-admin3'
NOW = datetime(2026, 11, 4, 12, tzinfo=timezone.utc)
OUTAGE_MS = 240_000


def fixture():
    script = """import * as State from './harborlight-v1-state.js';
    import {adventureAction} from './harborlight-v1-adventures.js';
    const at=Date.parse('2026-11-04T12:00:00Z'); let state=State.createState(at);
    state.islandName='Przystań testowa';state.tutorial.autoOpenDisabled=true;
    state.settings.language='pl';state.engagementSchedule.initialCompleted=true;
    state.engagementSchedule.initialAnchored=true;state.engagementSchedule.nextAt=1e12;
    for(const id of ['townhall','house','warehouse'])state.buildings[id].level=2;
    state.capacity=48;state.buildings.lighthouse.level=1;
    state.resources.coins=1000;state.resources.food=1000;
    const start=State.act(state,{type:'expeditionStart',expedition:State.EXPEDITIONS[0].id,gameKind:'triples'},at);
    if(!start.ok)throw Error(start.message);
    if(!adventureAction(state,{type:'adventureStart',kind:'cargoRain'}).ok)throw Error('Cargo fixture did not start');
    state.lighthouseMissions={version:1,campaignEnabled:false,chapter:{id:'lighthouse-chapter-2',level:2,targetLevel:2,
      startedAt:at,invitedBaseline:0,productionBaseline:{wood:0,stone:0,grain:0,food:0,planks:0},status:'active',introSeen:true},
      stack:[{kind:'main',index:1,total:8,prefix:'lighthouse-chapter-2',task:{id:'lighthouse-chapter-2:1',status:'active',
        objective:{type:'contribute'},requirements:{wood:50},deposited:{wood:1},reward:{coins:5},duration:600,
        offeredAt:at,acceptedAt:at,deadline:at+120000,attempt:0,title:'Przygotuj światło',titlePl:'Przygotuj światło'}}],
      completedLevels:[],receipts:[],invited:0};
    const task=state.lighthouseTasks[0];task.createdAt=0;task.expiresAt=120;task.acceptedAt=0;task.bonusLockedAt=0;
    state.activeTaskId=task.id;
    state=State.normalizeState(state,at);
    if(state.lighthouseMissions.stack.at(-1)?.task?.status!=='active')throw Error('Accepted legacy mission was lost');
    if(!state.expeditionRuns[state.activeExpeditionId])throw Error('Expedition fixture was lost');
    console.log(JSON.stringify(state));"""
    result = subprocess.run(['node', '--input-type=module', '-e', script], cwd=SOURCE,
                            capture_output=True, text=True, check=True)
    return cloud.acknowledge_daily_offer(json.loads(result.stdout))


def status(page, value):
    expect(page.locator('body')).to_have_attribute('data-cloud-status', value)


def settle_and_save(page):
    # These are the browser events used by the real host when the page becomes
    # visible and connectivity returns. No game state or coordinator is exposed.
    page.evaluate("document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('online'))")
    status(page, 'saved')
    page.wait_for_timeout(30)
    return cloud.cloud_state(UID)


def mission(state):
    return state['lighthouseMissions']['stack'][-1]['task']


def scenario(browser, language, mobile, hidden):
    cloud.NOW = NOW
    cloud.OFFLINE = False
    cloud.DOCUMENTS.clear()
    initial = fixture()
    cloud.DOCUMENTS[UID] = {'payload': json.dumps(initial), 'revision': 7, 'updateTime': cloud.timestamp()}
    context, page = cloud.context(browser, UID, language=language, mobile=mobile)
    errors_before = len(cloud.ERRORS)
    try:
        assert page.goto(cloud.ORIGIN + '/harborlight-v1-layered.html?profile=new-player').ok
        page.wait_for_function('document.getElementById("loading").hidden')
        page.bring_to_front()
        expect(page.locator('[data-minigame-kind="triples"]')).to_be_visible()
        assert page.evaluate('!document.hidden && document.hasFocus()'), 'The outage fixture must start in the real foreground'
        # Startup queues its visit snapshot. An online event invokes the actual
        # coordinator flush; the failed REST write triggers the real host pause.
        cloud.OFFLINE = True
        page.evaluate("window.dispatchEvent(new Event('online'))")
        status(page, 'offline')
        expect(page.locator('.dev-cloud-alert')).to_be_visible()
        assert cloud.DOCUMENTS[UID]['revision'] == 7

        if hidden:
            # Simulate browser visibility without replacing any game function.
            # The host's hidden handler must clear its pending foreground token.
            page.evaluate("""Object.defineProperty(document,'hidden',{configurable:true,value:true});
              Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
              document.dispatchEvent(new Event('visibilitychange'));""")
        page.clock.run_for(OUTAGE_MS)
        status(page, 'offline')
        cloud.OFFLINE = False
        if hidden:
            page.evaluate("""delete document.hidden;delete document.visibilityState;
              document.dispatchEvent(new Event('visibilitychange'));""")
        else:
            page.evaluate("window.dispatchEvent(new Event('online'))")
        status(page, 'saved')
        # Allow normal catch-up at the next world tick, then persist through
        # the same foreground/online event flow as an actual returning player.
        page.clock.run_for(1000)
        final = settle_and_save(page)
        assert final['worldTimeMs'] >= int(NOW.timestamp() * 1000) + OUTAGE_MS
        run_id = initial['activeExpeditionId']
        run = final['expeditionRuns'][run_id]
        initial_run = initial['expeditionRuns'][run_id]
        original_task_id = initial['activeTaskId']
        ordinary = next((task for task in final['lighthouseTasks'] if task['id'] == original_task_id), None)
        if hidden:
            assert run['status'] == 'lost' and run['lossReason'] == 'deadline', run
            assert len(final['lighthouseMissions']['stack']) >= 2, final['lighthouseMissions']
            assert ordinary is None or ordinary['expiresAt'] == initial['lighthouseTasks'][0]['expiresAt']
            assert final['adventures']['active']['stage'] == 'complete'
            assert final.get('knownInterruptions', {}).get('receipts', []) == []
        else:
            assert run['status'] == 'active', run
            assert run['roundStartedAt'] == initial_run['roundStartedAt'] + OUTAGE_MS / 1000
            assert final['activeExpeditionId'] == run_id
            assert len(final['lighthouseMissions']['stack']) == 1
            assert mission(final)['deadline'] == mission(initial)['deadline'] + OUTAGE_MS
            assert mission(final)['deposited'] == {'wood': 1}
            assert ordinary is not None and ordinary['expiresAt'] == initial['lighthouseTasks'][0]['expiresAt'] + OUTAGE_MS / 1000
            assert final['adventures']['active']['stage'] == 'catch'
            receipts = final['knownInterruptions']['receipts']
            assert len(receipts) == 1 and receipts[0]['seconds'] == OUTAGE_MS / 1000
            assert not run.get('knownPauseRemaining', 0)
            expect(page.locator('[data-minigame-kind="triples"]')).to_be_visible()
            # A second connectivity event cannot extend the same protection.
            again = settle_and_save(page)
            assert mission(again)['deadline'] == mission(final)['deadline']
            assert len(again['knownInterruptions']['receipts']) == 1
        assert final['resources']['coins'] == initial['resources']['coins'], 'The outage itself cannot grant coins'
        assert not cloud.ERRORS[errors_before:], cloud.ERRORS[errors_before:]
        cloud.no_island_cache(page)
        print(f'PASS cloud interruption {language} {"mobile" if mobile else "desktop"} '
              f'{"ordinary hidden absence" if hidden else "known foreground outage"}: real host recovery and clocks', flush=True)
    finally:
        cloud.OFFLINE = False
        context.close()


if __name__ == '__main__':
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                     headless=True, args=['--no-sandbox'])
        try:
            for language, mobile in [('pl', False), ('en', True)]:
                scenario(browser, language, mobile, False)
                scenario(browser, language, mobile, True)
        finally:
            browser.close()
