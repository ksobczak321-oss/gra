"""Current default: the preserved practical course has no game entry or popup.

Loads unmodified app bytes with old saved cursors and pending lesson chests.
Unlike the archival course suites, this test never enables the legacy policy.
Only local in-memory worlds are used; account/API requests and writes fail.
"""
import json
import mimetypes
import os
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
BASE = 'http://127.0.0.1:47523'
NOW = 1795262400000
FIXTURES = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', f'''
import {{createState, normalizeState}} from './harborlight-v1-state.js';
import {{tutorialRows}} from './harborlight-v1-progression.js';
import {{PRACTICAL_TUTORIAL_ENABLED}} from './harborlight-v1-learning-policy.js';
if (PRACTICAL_TUTORIAL_ENABLED !== false) throw Error('Default course must remain paused');
const now={NOW}, cases=[];
for (const [index, active, paused, claimed] of [[7,true,false,true],[12,false,true,false],[24,true,true,true]]) {{
  const s=createState(now,{{ruleset:32}});
  s.islandName='Przystań Zachowanego Kursu';
  s.learning.practical={{reviewIndex:index,reviewActive:active,reviewPaused:paused}};
  const id=tutorialRows(s)[0].id;
  s.tutorial.completed[id]=true;
  s.tutorial.claimed[id]=claimed;
  s.tutorial.chests[id]={{reward:{{coins:17,wood:13}},quotePending:false,claimed,shared:false,skipped:false,seen:false}};
  s.loyalty.lastOfferDay='2026-11-21';
  const canonical=normalizeState(s,now);
  cases.push({{state:canonical,id}});
}}
console.log(JSON.stringify(cases));
'''], cwd=SOURCE))


def asset(route):
    request = route.request
    if request.method != 'GET' or '/api/' in request.url:
        raise AssertionError('Paused-course test attempted an account/game write')
    file = (ROOT / unquote(urlsplit(request.url).path).lstrip('/')).resolve()
    if not file.is_relative_to(ROOT) or not file.is_file():
        return route.fulfill(status=404, body='Missing paused-course fixture asset')
    route.fulfill(path=str(file), content_type=mimetypes.guess_type(file)[0] or 'application/octet-stream')


def preserved(page, fixture):
    actual = page.evaluate('''id => {const s=window.__HARBORLIGHT_DEV_STATE__;return {
      practical:s.learning.practical,chest:s.tutorial.chests[id],
      completed:s.tutorial.completed[id]===true,claimed:s.tutorial.claimed[id]===true,
      settled:s.tutorial.settled,autoOpenDisabled:s.tutorial.autoOpenDisabled,
      rewardDisabled:s.tutorial.rewardDisabled,resources:s.resources
    }}''', fixture['id'])
    before = fixture['state']
    expected = {
        'practical': before['learning']['practical'],
        'chest': before['tutorial']['chests'][fixture['id']],
        'completed': before['tutorial']['completed'].get(fixture['id']) is True,
        'claimed': before['tutorial']['claimed'].get(fixture['id']) is True,
        'resources': before['resources'],
    }
    for key in ('settled', 'autoOpenDisabled', 'rewardDisabled'):
        if key in before['tutorial']:
            expected[key] = before['tutorial'][key]
    assert actual == expected, (actual, expected)


report = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    for (width, height, language), fixture in zip([(1440,1000,'pl'),(390,844,'en'),(390,844,'pl')], FIXTURES):
        context = browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce')
        context.route(BASE+'/**', asset)
        page = context.new_page()
        errors, failed, requests = [], [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: failed.append((response.status,response.url)) if response.status >= 400 else None)
        page.on('request', lambda request: requests.append(request.url) if request.method != 'GET' or '/api/' in request.url else None)
        # Keep Date.now stable for exact stock/cursor comparisons while real
        # animation frames and UI/network timers continue to run normally.
        page.clock.set_fixed_time(NOW/1000)
        page.add_init_script('localStorage.setItem("harborlight-language",'+json.dumps(language)+');window.__HARBORLIGHT_DEV_FIXTURE__='+json.dumps(fixture['state']))
        page.goto(BASE+'/harborlight-v1-layered.html?profile=new-player', wait_until='networkidle')
        try:
            page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"', timeout=20000, polling=100)
        except Exception:
            print(json.dumps({'errors':errors,'failed_assets':failed,'startup':page.evaluate('document.documentElement.dataset.gameStartup'),'loading':page.locator('#loading').inner_text() if page.locator('#loading').count() else None},ensure_ascii=False))
            raise
        expect(page.locator('[data-advisor-open]')).to_be_visible()
        expect(page.locator('[data-tutorial-panel], [data-active-tutorial-guide], [data-tutorial-pointer], [data-tutorial-reward], #starter-construction-guide')).to_have_count(0)
        expect(page.locator('#island-dialog[open]')).to_have_count(0)
        preserved(page, fixture)

        page.locator('[data-mobile-control="tutorial"]:visible,#hit-tutorial:visible').first.click()
        help_panel = page.locator('[data-help-panel]')
        expect(help_panel).to_be_visible()
        expect(help_panel.locator('[data-help-return-lessons], [data-help-lessons-from-start]')).to_have_count(0)
        expect(help_panel.locator('[data-help-return-tour], [data-help-tour-from-start]')).to_have_count(2)
        assert 'samouczek' not in help_panel.inner_text().lower()
        assert '25 lessons' not in help_panel.inner_text().lower()
        page.locator('#island-dialog .dialog-close').click()
        preserved(page, fixture)

        page.locator('[data-mobile-control="menu"]:visible,#hit-menu:visible,.mobile-island-menu:visible').first.click()
        page.locator('#island-dialog').get_by_role('button', name='Island rules' if language=='en' else 'Zasady wyspy', exact=True).click()
        dialog = page.locator('#island-dialog')
        assert 'samouczek' not in dialog.inner_text().lower()
        assert 'practical guide' not in dialog.inner_text().lower()
        assert not dialog.get_by_role('button', name='Continue tutorial', exact=True).count()
        page.locator('#island-dialog .dialog-close').click()
        preserved(page, fixture)
        assert not requests, requests
        assert not errors, errors
        assert not failed, failed
        report.append({'width':width,'language':language,'saved_review_index':fixture['state']['learning']['practical']['reviewIndex'],'saved_cursor_and_rewards_preserved':True,'no_course_entry_or_auto_popup':True,'ordinary_help_rules_and_advisor_available':True,'no_account_requests_or_writes':True})
        context.close()
    browser.close()
print(json.dumps(report,ensure_ascii=False))
print('PASS current default practical pause: saved review cursors and earned chests preserved, course entries/popups absent, introduction/Help/advisor available.')
