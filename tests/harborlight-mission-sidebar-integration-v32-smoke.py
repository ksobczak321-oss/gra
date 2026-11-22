"""Full real island UI: stable named missions and readable exact game launches.

All worlds are independently constructed local in-memory fixtures. A test-only
API is appended to the locally served play module; production source is intact.
No player identity, uploaded save, authentication or external mutation is used.
"""
import json
import mimetypes
import os
from pathlib import Path
import subprocess
import tempfile
from urllib.parse import unquote, urlsplit
from playwright.sync_api import expect, sync_playwright
from helpers.browser_offers import dismiss_player_offers

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
OUTPUT = Path(os.environ.get('HARBORLIGHT_TEST_OUTPUT', str(Path(tempfile.gettempdir())/'harborlight-mission-sidebar-integration')))
BASE = 'http://127.0.0.1:47493'
NOW = 1795348800000  # 2026-11-22T12:00:00Z, independent local fixture time.
FIXTURE_JS = r'''
import * as State from './harborlight-v1-state.js';
import * as Missions from './harborlight-v1-missions.js';
import {synchronizeResidents} from './harborlight-v1-residents.js';
const scenario=process.argv[1],NOW=1795348800000;
const s=State.createState(NOW,{ruleset:32,onboarding:false});
s.islandName='Wyspa próbnej misji';s.tutorial.autoOpenDisabled=true;
s.buildings.townhall.level=3;s.buildings.house.level=3;s.buildings.warehouse.level=2;
s.buildings.lighthouse.level=2;s.population=81;synchronizeResidents(s);
for(const id of Object.keys(s.resources))s.resources[id]=0;s.resources.coins=100;
s.loyalty.lastOfferDay='2026-11-22';
s.welcomeWorkers.claimedDays=['2026-11-22'];
s.engagementSchedule.initialCompleted=true;s.engagementSchedule.initialAnchored=true;s.engagementSchedule.nextAt=1e15;
if(scenario==='paid'){
 Object.assign(s.resources,{coins:10000,wood:5000,stone:5000,planks:5000});
 const result=State.requestUpgrade(s,{building:'townhall'});
 if(!result.ok)throw Error('Real paid construction fixture failed: '+JSON.stringify(result));
}
Missions.normalizeMissions(s,{lighthouseMissions:{version:1,campaignEnabled:true,completedLevels:[2]}});
Missions.advanceMissions(s,0,{buildingCost:State.buildingCost});
const m=s.lighthouseMissions;m.chapter.introSeen=true;m.chapter.coinsAwarded=630;m.chapter.materialsAwarded=0;
const task=(id,objective)=>({id,status:'assistance',objective,requirements:{},deposited:{},title:'Recover the missing supplies',titlePl:'Odzyskaj brakujące zaopatrzenie',description:'Prepare the actual main objective.',descriptionPl:'Przygotuj rzeczywisty cel główny.',reward:{},duration:21600,offeredAt:NOW,acceptedAt:null,deadline:null,attempt:0,campaignVersion:1,untimed:true});
const main={kind:'main',index:7,total:8,prefix:m.chapter.id,task:task(m.chapter.id+':7',{type:'building',building:'townhall',target:4})};
main.task.title='Finish Town Hall level4';main.task.titlePl='Ukończ rozbudowę Ratusza na poziom4';
main.task.requirements={coins:1500,wood:1500,stone:1500,planks:1500,grain:1500,bread:198};main.task.reward={coins:90};
const support={kind:'support',index:2,total:5,prefix:main.task.id+':support',task:task(main.task.id+':support:2',{type:'adventure',kind:'escapeStory',storyId:'captainless-ship',count:1,baseline:2})};
const rescue={kind:'rescue',index:2,total:3,prefix:support.task.id+':rescue',task:task(support.task.id+':rescue:2',{type:'adventure',kind:'escapeStory',storyId:'captainless-ship',count:1,baseline:2})};
rescue.task.status='active';rescue.task.acceptedAt=NOW;
m.stack=[main,support,rescue];m.receipts=Array.from({length:6},(_,i)=>m.chapter.id+':'+(i+1));
m.assistanceContracts=[{source:'campaign',missionId:m.chapter.id+':4',goalMissionId:m.chapter.id+':recruitment-54',chapterId:m.chapter.id,receiptId:'earned-crew-81',targetPopulation:81,mode:'population',goalComplete:true,maximumResidents:6,residentsRequested:6,residentsAccepted:6,supplies:{},claimed:true,storyId:'captainless-ship',completionReceiptId:'completed-crew-story'}];
s.adventures.completedEscapeStories['captainless-ship']=2;
if(scenario==='puzzle'){
 main.index=4;main.task=task(m.chapter.id+':4',{type:'adventure',kind:'islandPuzzle',puzzleKind:'packing',count:1,baseline:0});
 main.task.title='Pack the voyage equipment';main.task.titlePl='Spakuj wyposażenie wyprawy';main.task.status='offered';m.stack=[main];
}
if(scenario==='classic'){
 main.index=1;main.task=task(m.chapter.id+':1',{type:'review',building:'lighthouse'});
 main.task.title='Read the island briefing';main.task.titlePl='Poznaj plan wyspy';main.task.status='offered';m.stack=[main];
}
console.log(JSON.stringify(s));
'''
INSTRUMENT = r'''
Object.defineProperty(window,'__missionIntegration',{value:{
 snapshot:()=>structuredClone({population:state.population,townhall:state.buildings.townhall.level,resources:state.resources,
  receipts:state.lighthouseMissions.receipts,contracts:state.lighthouseMissions.assistanceContracts,
  frames:state.lighthouseMissions.stack.map(f=>({kind:f.kind,index:f.index,status:f.task?.status,id:f.task?.id})),
  project:state.buildings.townhall.construction,adventure:state.adventures.active,adventureClock:state.adventures.clock}),
 bumpSequence:()=>{state.adventures.sequence+=79;renderActivityStack();},
 advanceReading:seconds=>{window.__missionWall+=seconds*1000;settleActiveTick();renderHUD();},
 openPanel:kind=>openPanel(kind),
},configurable:false});
'''


def fixture(scenario):
    return json.loads(subprocess.check_output(['node', '--input-type=module', '-e', FIXTURE_JS, scenario], cwd=SOURCE))


def exercise(browser, language, scenario):
    requests, errors = [], []
    context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
    def asset(route):
        request=route.request
        requests.append((request.method,request.url))
        if request.method!='GET' or not request.url.startswith(BASE+'/'):
            raise AssertionError('Full-main integration attempted an external request or write')
        path=unquote(urlsplit(request.url).path)
        target=(ROOT/path.lstrip('/')).resolve()
        if not target.is_relative_to(ROOT) or not target.is_file():
            return route.fulfill(status=404,body='Missing local integration asset')
        if path=='/harborlight-v1-play.js':
            return route.fulfill(body=target.read_text()+INSTRUMENT,content_type='text/javascript')
        return route.fulfill(path=str(target),content_type=mimetypes.guess_type(target)[0]or'application/octet-stream')
    context.route('**/*',asset)
    context.add_init_script('''window.__missionWall=%d;const NativeDate=Date;
      class FixtureDate extends NativeDate{constructor(...args){super(...(args.length?args:[window.__missionWall]));}static now(){return window.__missionWall;}}
      globalThis.Date=FixtureDate;
      localStorage.setItem('harborlight-language',%s);
      window.__HARBORLIGHT_DEV_FIXTURE__=%s;''' % (NOW,json.dumps(language),json.dumps(fixture(scenario))))
    page=context.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE+'/harborlight-v1-layered.html?profile=new-player',wait_until='networkidle')
    page.wait_for_function('document.documentElement.dataset.gameStartup==="ready"&&window.__missionIntegration',timeout=30000)
    dismiss_player_offers(page)
    choices=page.locator('.island-activity-stack [data-adventure-choice]')
    expect(choices).to_have_count(3)
    ids=choices.evaluate_all('nodes=>nodes.map(n=>n.dataset.adventureChoice)')
    page.evaluate('window.__missionIntegration.bumpSequence()')
    assert choices.evaluate_all('nodes=>nodes.map(n=>n.dataset.adventureChoice)')==ids, 'Unrelated plays cannot shuffle the mission menu'
    original=page.evaluate('window.__missionIntegration.snapshot()')
    if scenario=='paid':
        assert original['population']==81 and original['townhall']==3
        assert len(original['frames'])==1 and original['frames'][0]['index']==7 and original['frames'][0]['status']=='active'
        assert original['project']['targetLevel']==4 and original['project']['stage']=='transport'
        page.locator('[data-open-lighthouse-missions]').click()
        expect(page.locator('[data-mission-paid-construction]')).to_be_visible()
        expect(page.locator('[data-mission-paid-construction]')).to_contain_text('już opłacony'if language=='pl'else'already been paid')
        expect(page.locator('[data-mission-open-building="warehouse"]')).to_be_visible()
        expect(page.locator('[data-mission-open-adventure]')).to_have_count(0)
        after=page.evaluate('window.__missionIntegration.snapshot()')
        assert after==original,'Opening paid-construction instructions cannot change progress, resources or the paid project'
    else:
        chosen=ids[0]
        if scenario=='supply':assert chosen.startswith('story:captainless-ship:')
        elif scenario=='puzzle':assert chosen=='puzzle:packing'
        else:assert chosen=='cargoRain'
        choices.first.click()
        expect(page.locator('#island-dialog[open]')).to_be_visible()
        expect(page.locator('[data-minigame-begin]')).to_be_visible()
        running=page.evaluate('window.__missionIntegration.snapshot()')
        run=running['adventure']
        assert run is not None,'Named sidebar action must open its game, not a generic chooser'
        if scenario=='supply':
            assert run['kind']=='escapeStory' and run['data']['story']['storyId']=='captainless-ship'
            assert run['data']['story']['variant']==int(chosen.rsplit(':',1)[1])
            rescue=run['data']['rescueContext'];assert rescue['source']=='campaign'
            contract=next(c for c in running['contracts']if c['receiptId']==rescue['receiptId'])
            assert contract['mode']=='supplies' and contract['residentsRequested']==0
            assert contract['goalMissionId']=='lighthouse-chapter-3:7'
        elif scenario=='puzzle':
            assert run['kind']=='islandPuzzle' and run['data']['puzzle']['kind']=='packing'
            assert run['data'].get('rescueContext') is None, 'A required puzzle must never be replaced by a rescue story'
        else:
            assert run['kind']=='cargoRain'
            assert run['data'].get('rescueContext') is None
        if scenario=='classic':
            assert run['data']['instructionsPending'] is True
            remaining=run['data']['duration']-(running['adventureClock']-run['startedAt'])
        else:
            assert run['data']['stageAttempt']['instructionsPending'] is True
            remaining=run['data']['stageAttempt']['remaining']
        page.evaluate('window.__missionIntegration.advanceReading(120)')
        expect(page.locator('[data-minigame-begin]')).to_be_visible()
        reading_state=page.evaluate('window.__missionIntegration.snapshot()');reading=reading_state['adventure']
        if scenario=='classic':
            assert reading['data']['instructionsPending'] is True and reading['stage']!='complete'
            assert reading['data']['duration']-(reading_state['adventureClock']-reading['startedAt'])==remaining
            assert all(n==0 for n in reading['data']['caught'].values())
        else:
            assert reading['data']['stageAttempt']['remaining']==remaining and reading['data']['stageAttempt']['instructionsPending'] is True
            assert reading['data']['puzzle']['solved'] is False
        if scenario=='supply':
            expect(page.locator('[data-adventure-return-main-mission]')).to_be_visible()
            page.locator('[data-adventure-return-main-mission]').click()
            expect(page.locator('[data-lighthouse-missions]')).to_be_visible()
            page.locator('#island-dialog .dialog-close').click()
            page.locator('.island-activity-stack [data-adventure-choice]').first.click()
            expect(page.locator('[data-minigame-begin]')).to_be_visible()
            resumed=page.evaluate('window.__missionIntegration.snapshot().adventure')
            assert resumed['id']==run['id']
            assert resumed['data']['stageAttempt']['instructionsPending'] is True
            assert resumed['data']['stageAttempt']['remaining']==remaining
        page.locator('[data-minigame-begin]').click()
        page.wait_for_function('''()=>{const d=window.__missionIntegration.snapshot().adventure.data;
          return d.instructionsPending!==true&&d.stageAttempt?.instructionsPending!==true;}''')
        started=page.evaluate('window.__missionIntegration.snapshot().adventure')
        assert started['id']==run['id'] and started['kind']==run['kind']
        if scenario!='classic':assert started['data']['stageAttempt']['remaining']==remaining
    assert errors==[],errors
    assert not page.evaluate('Object.keys(localStorage).some(k=>/harborlight-(?:dev-island-|v1-(?:new-player-)?save)/.test(k))')
    context.close()
    return {'language':language,'scenario':scenario,'sidebar_ids':ids,'exact_identity':True,'reading_before_timer':scenario!='paid','external_writes':0}


if __name__=='__main__':
    OUTPUT.mkdir(parents=True,exist_ok=True)
    reports=[]
    with sync_playwright()as playwright:
        browser=playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        try:
            for language in ['pl','en']:
                for scenario in ['supply','puzzle','classic','paid']:
                    reports.append(exercise(browser,language,scenario))
                    print(f'PASS mission-sidebar-integration {language} {scenario}',flush=True)
        finally:browser.close()
    (OUTPUT/'summary.json').write_text(json.dumps({'status':'PASS','contexts':reports,'actual_player_data_used':False,'external_writes':0},indent=2)+'\n')
