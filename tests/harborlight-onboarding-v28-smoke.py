"""Actual tour UI: stable-ID migration, requested copy and acknowledged pauses.

An isolated page serves local files only. No account, network provider or saved
player island is used; this verifies the removed clock does not shift a resume.
"""
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import expect, sync_playwright

ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', Path(__file__).resolve().parents[1])).resolve()
ORIGIN = 'https://onboarding-v28.harborlight.test'


def assets(route):
    path = unquote(urlsplit(route.request.url).path)
    if path == '/':
        return route.fulfill(content_type='text/html', body='''<!doctype html><html><head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="stylesheet" href="/harborlight-v1-onboarding.css"></head>
          <body style="margin:20px;background:#123746;color:#fff"><button id="target">?</button></body></html>''')
    target = (ROOT / path.lstrip('/')).resolve()
    if not target.is_relative_to(ROOT) or not target.is_file():
        return route.fulfill(status=404, body='Not found')
    route.fulfill(body=target.read_bytes(), content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')


def bounded(page):
    card = page.locator('[data-onboarding-card]')
    expect(card).to_be_visible()
    page.wait_for_function("document.querySelector('[data-onboarding-card]').style.left !== ''")
    box = card.bounding_box()
    assert box and box['x'] >= -1 and box['y'] >= -1, box
    assert box['x'] + box['width'] <= page.viewport_size['width'] + 1, box
    assert box['y'] + box['height'] <= page.viewport_size['height'] + 1, box
    for button in card.locator('.island-onboarding-actions button').all():
        button.scroll_into_view_if_needed()
        b = button.bounding_box()
        assert b and b['x'] >= box['x'] and b['x'] + b['width'] <= box['x'] + box['width'] + 1, b


def scenario(page, language):
    page.goto(ORIGIN)
    page.evaluate('''async language => {
      const [copy, ui] = await Promise.all([import('/harborlight-v1-approved-copy.js'), import('/harborlight-v1-onboarding-ui.js')]);
      const f = window.fixture = {copy,ui,language,updates:[],pauses:[],after:[],reject:false,
        world:{worldTimeMs:1793653200000,population:12,resources:{coins:100,wood:100},claimed:['old-reward']}};
      f.before = JSON.stringify(f.world);
      f.steps = copy.APPROVED_TOUR_IDS.map(id=>({id,target:'#target',
        title:()=>copy.getTourCopy(id,language,{cloudAccount:true}).title,
        text:()=>copy.getTourCopy(id,language,{cloudAccount:true}).text}));
      window.openTour = async options => {
        f.flow?.destroy();
        f.flow = ui.createIslandOnboarding({language,stage:'tour',replay:true,steps:f.steps,
          routeVersion:1,index:25,...options,
          onUpdate:next=>{f.updates.push(next);return !f.reject;},
          onPause:next=>{f.pauses.push(next);return !f.reject;},
          onAfterPause:next=>f.after.push({...next,removed:!document.querySelector('[data-island-onboarding]')})});
        await f.flow.start();
      };
      await openTour({});
    }''', language)
    tour = page.locator('[data-island-onboarding]')
    expect(tour).to_have_attribute('data-onboarding-step', 'category-economy')
    expect(tour.locator('[data-onboarding-counter]')).to_contain_text('25 z 33' if language == 'pl' else '25 of 33')
    expect(tour.locator('[data-onboarding-paused]')).to_contain_text('biegnie dalej' if language == 'pl' else 'keeps running')
    bounded(page)
    page.evaluate('fixture.reject=true')
    tour.locator('[data-onboarding-next]').click()
    expect(tour).to_have_attribute('data-onboarding-step', 'category-economy')
    expect(tour.locator('[data-onboarding-error]')).to_be_visible()
    page.evaluate('fixture.reject=false')
    tour.locator('[data-onboarding-next]').click()
    expect(tour).to_have_attribute('data-onboarding-step', 'category-resources')
    last = page.evaluate('fixture.updates.at(-1)')
    assert last['index'] == 25 and last['routeVersion'] == 2, last
    tour.locator('[data-onboarding-exit]').click()
    expect(tour).to_have_count(0)
    detail = page.evaluate('fixture.after.at(-1)')
    assert detail['index'] == 25 and detail['stepId'] == 'category-resources' and detail['routeVersion'] == 2 and detail['removed'], detail
    assert page.evaluate('JSON.stringify(fixture.world)===fixture.before')
    # A current persisted position must not migrate for a second time.
    page.evaluate('openTour({routeVersion:2,index:25})')
    expect(tour).to_have_attribute('data-onboarding-step', 'category-resources')
    for producer in ['farm', 'windmill', 'quarry', 'lumber', 'sawmill']:
        page.evaluate('''async producer => {
          await fixture.flow.update({index:fixture.copy.APPROVED_TOUR_IDS.indexOf('building-'+producer),routeVersion:2});
        }''', producer)
        expect(tour).to_have_attribute('data-onboarding-step', 'building-' + producer)
        expect(tour.locator('#island-onboarding-description')).to_contain_text('lekcję 11' if language == 'pl' else 'lesson 11')
        bounded(page)
    page.evaluate('''fixture.flow.update({index:fixture.copy.APPROVED_TOUR_IDS.indexOf('ship'),routeVersion:2})''')
    expect(tour).to_have_attribute('data-onboarding-step', 'ship')
    expect(tour.locator('#island-onboarding-description')).to_contain_text('sama transakcja nie zastępuje dostawy' if language == 'pl' else 'does not deliver the goods')
    tour.locator('[data-onboarding-exit]').click()
    expect(tour).to_have_count(0)
    assert page.evaluate('JSON.stringify(fixture.world)===fixture.before')


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    context = browser.new_context(viewport={'width':360 if mobile else 1280,'height':740 if mobile else 800}, is_mobile=mobile, has_touch=mobile, reduced_motion='reduce')
                    errors = []
                    context.route(ORIGIN + '/**', assets)
                    page = context.new_page()
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    try:
                        scenario(page, language)
                        assert not errors, errors
                    finally:
                        context.close()
        finally:
            browser.close()
    print('PASS v28 onboarding: 33 native steps, old/current resume, rejected navigation, acknowledged pause, full-store help, ship copy and bounded controls; PL/EN desktop/mobile')


if __name__ == '__main__':
    run()
