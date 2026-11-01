"""Read-only explanations of actual model outcomes and saved tour pauses.

The component uses real game modules with isolated in-memory islands. No cloud
account, browser island cache, advertising service or real payment is accessed.
"""
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
ORIGIN = 'https://feedback.harborlight.test'


def assets(route):
    path = unquote(urlsplit(route.request.url).path)
    if path == '/':
        return route.fulfill(content_type='text/html', body='''<!doctype html><html><head>
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <link rel="stylesheet" href="/harborlight-v1-learning-feedback.css">
          <link rel="stylesheet" href="/harborlight-v1-onboarding.css">
          <link rel="stylesheet" href="/harborlight-v1-tutorial.css">
          <style>body{background:#092638;color:#fff;font:16px system-ui;margin:16px}
          .stats{display:flex;gap:12px}button{padding:8px}#fixture{margin-top:24px}</style>
          </head><body><div class="stats"><button id="level">Poziom1</button>
          <button id="happiness">20%</button><button id="lighthouse">Latarnia</button></div>
          <main id="fixture"></main></body></html>''')
    target = (ROOT / path.lstrip('/')).resolve()
    if not target.is_relative_to(ROOT) or not target.is_file():
        return route.fulfill(status=404, body='Not found')
    return route.fulfill(body=target.read_bytes(), content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')


def setup(page, language):
    page.goto(ORIGIN)
    page.evaluate('''async language=>{
      const [M,F,I,O,T,P]=await Promise.all([import('/harborlight-v1-state.js'),import('/harborlight-v1-learning-feedback.js'),
        import('/harborlight-v1-inventory.js'),import('/harborlight-v1-onboarding-ui.js'),
        import('/harborlight-v1-tutorial-ui.js'),import('/harborlight-v1-progression.js')]);
      const state=M.createState(1793552400000);state.islandName='Przystań';
      I.grantBonusMaterials(state,{wood:10000,stone:10000,grain:10000,food:10000,planks:10000});state.resources.coins=10000;
      const run=a=>{const result=M.act(state,a,state.worldTimeMs);if(!result.ok)throw Error(result.message);return result};
      const f=window.fixture={M,F,I,O,T,P,state,run,language,blocked:false,reveals:0,rejected:false,pauses:[],afterPauses:[]};
      f.feedback=F.createLearningFeedback({getState:()=>state,getLanguage:()=>language,canShow:()=>!f.blocked,
        getTarget:id=>document.getElementById(id),onReveal:()=>{f.reveals++;return true}});
      f.feedback.observe();
      f.completeTownhall=async()=>{for(let i=0;i<6;i++)run({type:'assign',building:'warehouse',delta:1});M.tick(state,120);
        run({type:'upgrade',building:'townhall'});M.tick(state,90);document.querySelector('#level').textContent='Poziom'+state.buildings.townhall.level;
        f.feedback.observe();return f.feedback.refresh()};
      f.completeLighthouse=async()=>{run({type:'build',building:'lighthouse'});M.tick(state,1000);
        document.querySelector('#happiness').textContent=state.happiness+'%';f.feedback.observe();return f.feedback.refresh()};
      f.house=async()=>{const before=F.captureLearningFeedback(state);const result=run({type:'houseHappiness',residentId:state.residents[0].id,amount:1});
        f.feedback.recordAction({type:'houseHappiness'},before,state,result);return f.feedback.refresh()};
      f.bless=async()=>{const before=F.captureLearningFeedback(state);const result=run({type:'blessing'});
        f.feedback.recordAction({type:'blessing'},before,state,result);return f.feedback.refresh()};
      f.openTour=async()=>{const first={id:'level',title:()=>language==='pl'?'Poziom wyspy':'Island level',
        text:()=>String(state.resources.stone),target:()=>document.querySelector('#level')};
        const second={id:'happiness',title:{pl:'Szczęście',en:'Happiness'},text:{pl:()=>String(state.resources.stone),en:()=>String(state.resources.stone)},target:()=>document.querySelector('#happiness')};
        f.tour=O.createIslandOnboarding({stage:'tour',index:0,replay:true,language,steps:[first,second],
          onUpdate:next=>{if(f.rejected)return false;f.cursor=next.index;return true},
          onPause:next=>{if(f.rejected)return false;f.pauses.push(next.index);return true},
          onAfterPause:next=>{if(document.querySelector('[data-island-onboarding]'))throw Error('Reminder opened before tour removal');
            f.afterPauses.push(next.index);F.showTutorialExitReminder({language,firstIntroduction:false})}});
        await f.tour.start()};
    }''', language)


def feedback_scenario(browser, language, mobile):
    context = browser.new_context(viewport={'width': 360 if mobile else 1366, 'height': 800 if mobile else 900}, is_mobile=mobile, has_touch=mobile)
    errors = []
    context.route(ORIGIN + '/**', assets)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        setup(page, language)
        page.evaluate('fixture.blocked=true')
        assert page.evaluate('fixture.completeTownhall()') is False
        expect(page.locator('[data-learning-feedback]')).to_have_count(0)
        assert page.evaluate('fixture.state.buildings.townhall.level') == 2
        before = page.evaluate('JSON.stringify(fixture.state)')
        page.evaluate('fixture.blocked=false;fixture.feedback.refresh()')
        expect(page.locator('[data-learning-feedback]')).to_have_attribute('data-learning-feedback', 'townhall')
        expect(page.locator('[data-learning-feedback-description]')).to_contain_text('limit' if language == 'pl' else 'limit')
        rects = page.evaluate('''()=>{const a=document.querySelector('#level').getBoundingClientRect(),b=document.querySelector('.learning-feedback-highlight').getBoundingClientRect();
          return {left:Math.abs(a.left-4-b.left),top:Math.abs(a.top-4-b.top),width:Math.abs(a.width+8-b.width)}}''')
        assert max(rects.values()) < 1, rects
        page.locator('[data-learning-feedback-close]').click()
        assert page.evaluate('JSON.stringify(fixture.state)') == before, 'Explaining a change mutated game state'
        assert page.evaluate('fixture.completeLighthouse()') is True
        expect(page.locator('[data-learning-feedback]')).to_have_attribute('data-learning-feedback', 'lighthouse')
        expect(page.locator('[data-learning-feedback-description]')).to_contain_text('100%')
        assert page.evaluate('fixture.state.buildings.lighthouse.level') == 1
        assert page.evaluate('fixture.state.happiness') == 100
        page.locator('[data-learning-feedback-close]').click()
        page.evaluate('fixture.bless()')
        expect(page.locator('[data-learning-feedback]')).to_have_attribute('data-learning-feedback', 'blessing')
        expect(page.locator('[data-learning-feedback-description]')).to_contain_text('100%')
        expect(page.locator('[data-learning-feedback-description]')).not_to_contain_text('120%')
        page.locator('[data-learning-feedback-close]').click()
        assert not errors, errors
    finally:
        context.close()


def tour_scenario(browser, language, mobile):
    context = browser.new_context(viewport={'width': 360 if mobile else 1366, 'height': 800 if mobile else 900}, is_mobile=mobile, has_touch=mobile)
    errors = []
    context.route(ORIGIN + '/**', assets)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        setup(page, language)
        page.evaluate('fixture.openTour()')
        tour = page.locator('[data-island-onboarding]')
        expect(tour).to_have_attribute('data-onboarding-step', 'level')
        old = page.locator('#island-onboarding-description').inner_text()
        page.evaluate('fixture.I.grantBonusMaterials(fixture.state,{stone:15})')
        tour.locator('[data-onboarding-next]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'happiness')
        assert page.locator('#island-onboarding-description').inner_text() != old, 'Live resource copy retained stale numbers'
        before = page.evaluate('JSON.stringify(fixture.state)')
        page.evaluate('fixture.rejected=true')
        tour.locator('[data-onboarding-restart]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'happiness')
        expect(page.locator('[data-onboarding-error]')).to_be_visible()
        page.evaluate('fixture.rejected=false')
        tour.locator('[data-onboarding-restart]').click()
        expect(tour).to_have_attribute('data-onboarding-step', 'level')
        assert page.evaluate('fixture.cursor') == 0
        assert page.evaluate('JSON.stringify(fixture.state)') == before
        tour.locator('[data-onboarding-exit]').click()
        expect(tour).to_have_count(0)
        popup = page.locator('[data-tutorial-exit-reminder]')
        expect(popup).to_be_visible()
        expect(popup).to_contain_text('? → Wznów tutorial' if language == 'pl' else '? → Resume tutorial')
        assert page.evaluate('fixture.pauses') == [0]
        assert page.evaluate('fixture.afterPauses') == [0]
        page.locator('[data-close-tutorial-exit-reminder]').click()
        expect(popup).to_have_count(0)
        assert not errors, errors
    finally:
        context.close()


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    feedback_scenario(browser, language, mobile)
                    tour_scenario(browser, language, mobile)
        finally:
            browser.close()
    print('PASS learning feedback: real TownHall/Lighthouse/blessing outcomes, bounded arrows, delayed queue, no world mutation, live tour text, acknowledged restart and exit reminder; PL/EN desktop/mobile')


if __name__ == '__main__':
    run()
