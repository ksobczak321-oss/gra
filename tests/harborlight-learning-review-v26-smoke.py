"""Persistable learning cursors without replaying island actions or rewards.

Runs the actual UI/model modules against local assets. No account, cloud save,
advertising service or existing player world is accessed.
"""
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright

ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', Path(__file__).resolve().parents[1])).resolve()
ORIGIN = 'https://learning.harborlight.test'


def assets(route):
    path = unquote(urlsplit(route.request.url).path)
    if path == '/':
        return route.fulfill(content_type='text/html', body='''<!doctype html>
          <html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/harborlight-v1-tutorial.css">
          <link rel="stylesheet" href="/harborlight-v1-onboarding.css">
          <style>body{margin:16px;background:#092638;color:#fff;font-family:system-ui}</style>
          </head><body><button id="target">Map target</button><main id="fixture"></main></body></html>''')
    target = (ROOT / path.lstrip('/')).resolve()
    if not target.is_relative_to(ROOT) or not target.is_file():
        return route.fulfill(status=404, body='Not found')
    route.fulfill(body=target.read_bytes(), content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')


def setup(page, language):
    page.goto(ORIGIN)
    page.evaluate('''async language => {
      const [ui, onboarding, model, progression, copy, translations] = await Promise.all([
        import('/harborlight-v1-tutorial-ui.js'), import('/harborlight-v1-onboarding-ui.js'),
        import('/harborlight-v1-state.js'), import('/harborlight-v1-progression.js'),
        import('/harborlight-v1-copy.js'), import('/harborlight-v1-v16-copy.js')]);
      const state = model.createState(1793491200000), rows = progression.tutorialRows(state);
      state.tutorial.completed[rows[0].id] = true;
      state.tutorial.claimed[rows[0].id] = true;
      state.tutorial.completed[rows[1].id] = true;
      state.tutorial.skippedLessons[rows[1].id] = true;
      window.fixture = {ui,onboarding,state,progression,copy,translations,language,
        rows: progression.tutorialRows(state), before: JSON.stringify(state),
        updates: [], exits: [], actions: [], visits: [], reject: false};
      window.openReview = options => {
        const f = window.fixture;
        f.element?.remove();
        f.element = ui.createTutorialPanel({state, progression, language,
          reviewIndex:1, ...options,
          onReviewUpdate:index=>{f.updates.push(index);return !f.reject},
          onReviewExit:index=>{f.exits.push(index);return true},
          onClose:()=>f.element.remove(),onAction:a=>f.actions.push(a),onVisit:r=>f.visits.push(r)});
        document.querySelector('#fixture').append(f.element);
      };
      openReview({});
    }''', language)


def review(page, language):
    panel = page.locator('[data-tutorial-instructions-review]')
    expect(panel).to_have_attribute('data-tutorial-review-index', '1')
    expect(panel.locator('[data-tutorial-review-status]')).to_contain_text('samodzielnie' if language == 'pl' else 'independently')
    expect(panel.locator('[data-tutorial-claim], [data-tutorial-visit], [data-tutorial-supplies]')).to_have_count(0)
    panel.locator('[data-tutorial-review-previous]').click()
    expect(panel).to_have_attribute('data-tutorial-review-index', '0')
    expect(panel.locator('[data-tutorial-review-previous]')).to_be_disabled()
    expect(panel.locator('[data-tutorial-review-status]')).to_contain_text('ukończona' if language == 'pl' else 'already complete')
    page.evaluate('fixture.reject = true')
    panel.locator('[data-tutorial-review-next]').click()
    expect(panel).to_have_attribute('data-tutorial-review-index', '0')
    expect(panel.locator('[data-tutorial-review-error]')).to_be_visible()
    page.evaluate('fixture.reject = false')
    count = page.evaluate('fixture.rows.length')
    assert count == 25, count
    for index in range(1, count):
        panel.locator('[data-tutorial-review-next]').click()
        expect(panel).to_have_attribute('data-tutorial-review-index', str(index))
    panel.locator('[data-tutorial-review-next]').click()
    expect(panel).to_have_count(0)
    assert page.evaluate('fixture.exits') == [24]
    page.evaluate('openReview({reviewIndex:12})')
    expect(panel).to_have_attribute('data-tutorial-review-index', '12')
    panel.locator('[data-tutorial-review-exit]').click()
    expect(panel).to_have_count(0)
    assert page.evaluate('fixture.exits') == [24, 12]
    page.evaluate('openReview({reviewFromStart:true,reviewIndex:12})')
    expect(panel).to_have_attribute('data-tutorial-review-index', '0')
    box = panel.bounding_box()
    assert box and box['x'] >= 0 and box['x'] + box['width'] <= page.viewport_size['width'] + 1, box
    panel.locator('[data-tutorial-review-exit]').click()
    assert page.evaluate('JSON.stringify(fixture.state) === fixture.before'), 'Review mutated island state'
    assert page.evaluate('fixture.actions.length + fixture.visits.length') == 0, 'Review dispatched a game action'


def tour(page, language):
    page.evaluate('''async () => {
      const f=fixture;f.pauses=[];f.finishes=[];f.tourUpdates=[];
      f.steps=['one','two','three'].map(id=>({id,title:{pl:id,en:id},text:{pl:'Opis',en:'Description'},target:'#target'}));
      window.openTour=async options=>{
        f.tour?.destroy();
        f.tour=f.onboarding.createIslandOnboarding({language:f.language,stage:'tour',index:1,replay:true,steps:f.steps,
          onUpdate:value=>{f.tourUpdates.push(value);return true},
          onPause:value=>{f.pauses.push(value);return true},onFinish:value=>{f.finishes.push(value);return true},...options});
        await f.tour.start();
      };await openTour({});
    }''')
    modal = page.locator('[data-island-onboarding]')
    expect(modal).to_have_attribute('data-onboarding-step', 'two')
    modal.locator('[data-onboarding-next]').click()
    expect(modal).to_have_attribute('data-onboarding-step', 'three')
    modal.locator('[data-onboarding-exit]').click()
    expect(modal).to_have_count(0)
    assert page.evaluate('fixture.pauses[0].index') == 2
    assert page.evaluate('fixture.pauses[0].skipped && fixture.pauses[0].replay') is True
    assert page.evaluate('fixture.finishes.length') == 0, 'Pausing marked the tour complete'
    page.evaluate('openTour({index:fixture.pauses[0].index})')
    expect(modal).to_have_attribute('data-onboarding-step', 'three')
    modal.locator('[data-onboarding-next]').click()
    expect(modal).to_have_count(0)
    assert page.evaluate('fixture.finishes[0].index') == 2
    assert page.evaluate('fixture.finishes[0].skipped') is False
    page.evaluate('openTour({index:1})')
    page.keyboard.press('Escape')
    expect(modal).to_have_count(0)
    assert page.evaluate('fixture.pauses[1].index') == 1
    assert page.evaluate('JSON.stringify(fixture.state) === fixture.before')


def introduction(page, language):
    page.evaluate('openTour({stage:"intro",replay:false})')
    modal = page.locator('[data-island-onboarding]')
    expect(modal.locator('#island-onboarding-description > p')).to_have_count(2)
    if language == 'pl':
        expect(modal.locator('#island-onboarding-description')).to_contain_text('Celem gry jest rozwój i dbanie o dobrostan mieszkańców.')
    modal.locator('[data-onboarding-next]').click()
    field = modal.locator('[data-onboarding-name]')
    expect(field).to_have_attribute('minlength', '3')
    expect(field).to_have_attribute('maxlength', '40')
    assert field.evaluate('element => parseFloat(getComputedStyle(element).fontSize)') >= 24
    field.fill('Ab')
    modal.locator('[data-onboarding-next]').click()
    expect(modal).to_have_attribute('data-onboarding-stage', 'name')
    expect(modal.locator('[data-onboarding-error]')).to_contain_text('3')
    field.fill('fuck')
    modal.locator('[data-onboarding-next]').click()
    expect(modal).to_have_attribute('data-onboarding-stage', 'name')
    expect(modal.locator('[data-onboarding-error]')).to_contain_text('niedozwolone' if language == 'pl' else 'prohibited')
    field.fill('Przystań')
    modal.locator('[data-onboarding-next]').click()
    expect(modal).to_have_attribute('data-onboarding-stage', 'tour')
    modal.locator('[data-onboarding-exit]').click()
    assert page.evaluate('''() => ['farm','windmill','quarry','lumber','sawmill'].every(id=>
      fixture.copy.buildingPurpose(id,fixture.language).includes(fixture.language==='pl'?'smutna buźka':'sad face'))''')


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    context = browser.new_context(viewport={'width': 360 if mobile else 1280, 'height': 740 if mobile else 800}, reduced_motion='reduce', is_mobile=mobile, has_touch=mobile)
                    errors = []
                    context.route(ORIGIN + '/**', assets)
                    page = context.new_page()
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    try:
                        setup(page, language)
                        review(page, language)
                        tour(page, language)
                        introduction(page, language)
                        assert not errors, errors
                    finally:
                        context.close()
        finally:
            browser.close()
    print('PASS learning review: all25 instructions, saved cursor, rejected writes, pause/resume, no actions/rewards, accepted W1 and names; PL/EN desktop/mobile')


if __name__ == '__main__':
    run()
