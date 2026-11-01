"""Rendered Polish audit of ordinary game panels on isolated DEV fixtures.

The catalog is used only to find real navigation buttons. Assertions inspect
the rendered language and actual model-derived statuses, not catalog equality.
No account, Firebase document, payment or external request is changed.
"""
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import mimetypes
import os
import re
import subprocess

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
ORIGIN = 'http://127.0.0.1:47389'
NOW = datetime(2026, 11, 15, 18, 30, tzinfo=timezone.utc)
BUILDINGS = {
    'townhall': 'Ratusz', 'house': 'Dom', 'farm': 'Gospodarstwo',
    'windmill': 'Młyn', 'quarry': 'Kamieniołom', 'lumber': 'Drwale',
    'sawmill': 'Tartak', 'warehouse': 'Magazyn', 'market': 'Targ',
    'dock': 'Port', 'chapel': 'Kaplica', 'lighthouse': 'Latarnia morska',
}
HOME_ROUTES = ['rules', 'objective', 'buildings', 'expeditions', 'tasks',
               'residents', 'resources', 'trade', 'archipelago', 'map',
               'help', 'tutorial', 'settings']
USER_NAMES = ['Old Harbor', 'QA Island']
# These are UI words, not a general English-language detector. Brand names,
# technical DEV/API identifiers and user-written names are deliberately allowed.
ENGLISH_UI = re.compile(
    r'\b(?:This|Choose|Assign|Claim|Upgrade|Workers|Construction|Storage|Available|'
    r'Central|Next|Level|Food|Wood|Stone|Grain|Planks|Purchase|Return|Cancel|'
    r'Confirm|Waiting|Expires|Remaining|Happiness|Residents|Warehouse|Market|'
    r'Harbor|Chapel|Sawmill|Windmill|Lighthouse|Town Hall|Home|Map|Day|Settings|Notifications|'
    r'Payment|Resident|Fed|Assigned|Lumber Camp)\b'
    r'|\b(?:coins|wood|stone|grain|planks|food|workers|residents|carriers|units|'
    r'stock|details|upgrade|building|level|remaining|waiting|storage|available|days|hours|'
    r'speed|load|selected|sections|locked|complete|without|cannot|unavailable|quote)\b'
    r'|\bunits/(?:h|hour)\b'
    r'|\bpp/h\b|\bAt home\b|\bWithout work\b'
    r'|\bin \d'
)


def seed():
    script = """import * as S from './harborlight-v1-state.js';
      import * as A from './harborlight-v1-archipelago.js';
      import * as P from './harborlight-v1-progression.js';
      import {grantBonusMaterials} from './harborlight-v1-inventory.js';
      const now=%d, start=now-6*60000;
      let s=S.createState(start);s.islandName='Old Harbor';s.population=50;
      for(const b of Object.values(s.buildings))b.level=3;
      s.buildings.townhall.level=13;s.buildings.house.level=10;s.buildings.warehouse.level=10;
      s.resources.coins=1000000;
      grantBonusMaterials(s,{wood:100000,stone:100000,grain:100000,food:100000,planks:100000});
      s=S.normalizeState(s,start);
      s.tutorial.autoOpenDisabled=true;s.tutorial.rewardDisabled=true;s.tutorial.settled=true;
      s.tutorial.completed=Object.fromEntries(P.TUTORIAL_LESSONS.map(x=>[x.id,true]));
      s.tutorial.claimed=Object.fromEntries(P.TUTORIAL_LESSONS.map(x=>[x.id,true]));s.tutorial.chests={};
      s.engagementSchedule.initialCompleted=true;s.engagementSchedule.initialAnchored=true;
      s.engagementSchedule.nextAt=1e12;
      for(const building of ['lumber','warehouse','windmill']){
        const r=S.act(s,{type:'assign',building,delta:1},start);
        if(!r.ok)throw new Error(building+': '+r.message);
      }
      const blessing=S.act(s,{type:'blessing'},start);if(!blessing.ok)throw new Error(blessing.message);
      S.advanceTo(s,now);
      const worlds=A.restoreArchipelago(s,{createState:S.createState,normalizeState:S.normalizeState,advanceTo:S.advanceTo},now);
      const founded=A.createNextIsland(worlds,{name:'QA Island'},now);if(!founded.ok)throw new Error(founded.message);
      const work=S.act(worlds.primary,{type:'upgrade',building:'quarry'},now);if(!work.ok)throw new Error(work.message);
      const trade=S.act(worlds.primary,{type:'trade',resource:'wood',amount:100,direction:'buy'},now);if(!trade.ok)throw new Error(trade.message);
      console.log(JSON.stringify(A.serializeArchipelago(worlds)));""" % int(NOW.timestamp()*1000)
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', script],
                                    cwd=SOURCE, capture_output=True, text=True,
                                    check=True).stdout)


def close_panel(page):
    dialog = page.locator('#island-dialog')
    if dialog.evaluate('(node)=>node.open'):
        dialog.locator('.dialog-close').click()


def home(page, mobile):
    close_panel(page)
    page.locator('.mobile-island-menu' if mobile else '#hit-home').click()
    expect(page.locator('#dialog-title')).to_have_text('Old Harbor')


def route(page, mobile, kind):
    if kind in ['help', 'tutorial']:
        # Both learning entries moved from the overview to the actual ? Help
        # control. Keep auditing their real rendered views through that route.
        close_panel(page)
        page.locator('[data-mobile-control="tutorial"]' if mobile else '#hit-tutorial').click()
        expect(page.locator('[data-help-panel]')).to_be_visible()
        if kind == 'tutorial':
            page.locator('[data-help-return-lessons]').click()
        expect(page.locator('#island-dialog')).to_have_attribute('data-panel-kind', kind)
        return
    home(page, mobile)
    grid = page.locator('#island-dialog .panel-grid').filter(
        has=page.locator('[data-archipelago-open]')).first
    overview_routes = [route for route in HOME_ROUTES if route not in ['help', 'tutorial']]
    grid.locator(':scope > button').nth(overview_routes.index(kind)).click()
    expect(page.locator('#island-dialog')).to_have_attribute('data-panel-kind', kind)


def source_button(page, source):
    label = page.evaluate("""async source=>{
      const copy=await import('/harborlight-v1-i18n.js?v=polish-audit-navigation');
      return copy.translate(source,'pl');
    }""", source)
    selector = page.locator('#island-dialog').get_by_role('button', name=label, exact=True)
    if not selector.count() and label != source:
        selector = page.locator('#island-dialog').get_by_role('button', name=source, exact=True)
    selector.first.click()


def visible_controls(page, scope):
    return page.locator(scope).evaluate("""node=>[...node.querySelectorAll('[aria-label],[title],[placeholder]')]
      .filter(x=>x.getClientRects().length&&getComputedStyle(x).visibility!=='hidden')
      .flatMap(x=>['aria-label','title','placeholder'].map(k=>x.getAttribute(k)).filter(Boolean))""")


def record(page, records, failures, name, mobile, scope='#island-dialog'):
    # Reading native explanatory disclosures does not execute game commands.
    # Keep the full individual roster collapsed; its labels have separate tests.
    page.locator(scope+' details:not([data-resident-roster])').evaluate_all(
        '(nodes)=>nodes.forEach(node=>{node.open=true})')
    text = page.locator(scope).inner_text()
    controls = visible_controls(page, scope)
    record = {'panel': name, 'viewport': 'mobile' if mobile else 'desktop',
              'text': text, 'control_labels': controls}
    records.append(record)
    source = '\n'.join([text, *controls])
    for value in USER_NAMES:
        source = source.replace(value, '')
    for line in source.splitlines():
        if ENGLISH_UI.search(line):
            failures.append({'panel': name, 'viewport': record['viewport'], 'text': line})
    # User-entered names also appear in native options. A translated model is
    # insufficient if the DOM translator still changes the player's label.
    for label in page.locator(scope+' [data-island-destination] option').all_text_contents():
        if label != 'Old Harbor - QA Island':
            failures.append({'panel': name, 'viewport': record['viewport'],
                             'text': 'User-written destination name changed: '+label})
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), name


def scenario(browser, mobile, records, failures):
    context = browser.new_context(viewport={'width': 390 if mobile else 1366,
                                          'height': 844 if mobile else 900},
                                  is_mobile=mobile, has_touch=mobile, reduced_motion='reduce')
    errors, external = [], []

    def asset(request):
        if not request.request.url.startswith(ORIGIN):
            external.append(request.request.url)
            return request.abort()
        target = (ROOT / unquote(urlsplit(request.request.url).path).lstrip('/')).resolve()
        if not target.is_relative_to(ROOT) or not target.is_file():
            return request.fulfill(status=404, body='Missing fixture asset')
        return request.fulfill(body=target.read_bytes(),
                               content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')

    context.route('**/*', asset)
    context.add_init_script('window.__HARBORLIGHT_DEV_FIXTURE__=%s;localStorage.setItem("harborlight-language","pl");' % json.dumps(seed()))
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.clock.install(time=NOW)
    page.clock.pause_at(NOW)
    try:
        page.goto(ORIGIN+'/harborlight-v1-layered.html?profile=new-player', wait_until='domcontentloaded')
        page.wait_for_function('window.__HARBORLIGHT_DEV_STATE__&&document.getElementById("loading").hidden')
        initial_coins = page.evaluate('window.__HARBORLIGHT_DEV_STATE__.resources.coins')
        home(page, mobile)
        record(page, records, failures, 'home', mobile)
        for kind in HOME_ROUTES:
            route(page, mobile, kind)
            if kind == 'tutorial':
                summary = page.locator('details.tutorial-v16-list > summary')
                if summary.count():
                    summary.click()
            record(page, records, failures, kind, mobile)
            if kind == 'resources':
                expect(page.locator('[data-resource-notation]')).to_contain_text('magazynie centralnym')
                expect(page.locator('[data-resource-notation]')).to_contain_text('w transporcie')
            if kind == 'archipelago':
                expect(page.locator('[data-archipelago-panel]')).to_contain_text('Old Harbor - QA Island')
            if kind == 'settings':
                expect(page.get_by_role('combobox', name='Język', exact=True)).to_have_value('pl')
        route(page, mobile, 'residents')
        page.locator('[data-resident-roster] > summary').click()
        expect(page.locator('[data-resident-list] [data-resident-id]')).to_have_count(44)
        for person, job in [('1', 'Drwale'), ('2', 'Magazyn'), ('3', 'Młyn'), ('10', 'W domu')]:
            row = page.locator('[data-resident-id="%s"]' % person)
            expect(row.locator('.resident-summary').get_by_text('Mieszkaniec #'+person, exact=True)).to_be_visible()
            expect(row.locator('[data-resident-job]')).to_have_text(job)
        worker = page.locator('[data-resident-id="2"]')
        expect(worker.locator('[data-resident-timers]')).to_contain_text('Najedzony')
        expect(worker.locator('[data-resident-timers]')).to_contain_text('Przydzielony')
        expect(worker.locator('[data-resident-rate]')).to_have_text('+2 p.p./godz.')
        record(page, records, failures, 'resident-roster', mobile)
        for building, label in BUILDINGS.items():
            route(page, mobile, 'buildings')
            card = page.locator('[data-building-purpose="%s"]' % building).locator('..')
            card.get_by_role('button').click()
            expect(page.locator('#island-dialog')).to_have_attribute('data-panel-building', building)
            expect(page.locator('#dialog-title')).to_have_text(label)
            record(page, records, failures, 'building:'+building, mobile)
            details = page.locator('[data-building-more="%s"]' % building)
            if details.count():
                details.click()
                record(page, records, failures, 'building-details:'+building, mobile)
        route(page, mobile, 'buildings')
        page.locator('[data-building-purpose="townhall"]').locator('..').get_by_role('button').click()
        page.locator('[data-construction-entry]').click()
        record(page, records, failures, 'construction', mobile)
        route(page, mobile, 'buildings')
        page.locator('[data-building-purpose="house"]').locator('..').get_by_role('button').click()
        page.locator('[data-manage-workers]').click()
        record(page, records, failures, 'workers', mobile)
        route(page, mobile, 'settings')
        source_button(page, 'Premium options')
        record(page, records, failures, 'premium', mobile)
        home(page, mobile)
        page.locator('[data-open-community]').click()
        expect(page.locator('[data-community-demo-warning]')).to_be_visible()
        for tab in ['ranking', 'alliance', 'league', 'chat']:
            page.locator('[data-community-tab="%s"]' % tab).click()
            if tab == 'league':
                expect(page.locator('[data-league-schedule]')).to_contain_text('19:00–21:00')
            record(page, records, failures, 'community:'+tab, mobile)
        home(page, mobile)
        page.locator('[data-open-charity]').click()
        expect(page.locator('[data-charity-panel]')).to_contain_text('SYMULACJA DEV')
        record(page, records, failures, 'charity', mobile)
        home(page, mobile)
        source_button(page, 'Notifications')
        record(page, records, failures, 'notifications', mobile)
        route(page, mobile, 'buildings')
        page.locator('[data-building-purpose="townhall"]').locator('..').get_by_role('button').click()
        source_button(page, 'All bonuses and penalties')
        record(page, records, failures, 'effects', mobile)
        route(page, mobile, 'trade')
        source_button(page, 'Open Market — goods for goods')
        record(page, records, failures, 'market', mobile)
        route(page, mobile, 'settings')
        source_button(page, 'Start a new island')
        expect(page.locator('[data-reset-island]')).to_be_disabled()
        record(page, records, failures, 'reset-explanation', mobile)
        close_panel(page)
        page.locator('[data-mobile-control="clock"]' if mobile else '#hit-clock').click()
        record(page, records, failures, 'island-time', mobile)
        close_panel(page)
        for category in ['administration', 'economy', 'resources', 'decorations', 'paths']:
            page.locator('[data-mobile-category="%s"]' % category if mobile else '#hit-category-'+category).click()
            scope = '.mobile-bottom-dock' if mobile else (
                '[data-building-dock]' if category in ['administration', 'economy'] else
                '[data-resource-dock]' if category == 'resources' else '[data-leisure-dock]')
            expect(page.locator(scope)).to_be_visible()
            record(page, records, failures, 'dock:'+category, mobile, scope=scope)
        close_panel(page)
        assert page.evaluate('window.__HARBORLIGHT_DEV_STATE__.islandName') == 'Old Harbor'
        assert page.evaluate('window.__HARBORLIGHT_DEV_STATE__.resources.coins') == initial_coins, 'Reading translated panels must not spend coins or grant rewards'
        assert page.evaluate('Object.keys(localStorage).filter(k=>/island|save|community|chat|league/i.test(k))') == []
        assert not errors, errors
        assert not external, external
    finally:
        context.close()


def run():
    records, failures = [], []
    problem = None
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                     headless=True, args=['--no-sandbox'])
        try:
            scenario(browser, False, records, failures)
            scenario(browser, True, records, failures)
        except BaseException as error:
            problem = error
        finally:
            browser.close()
    report = Path(os.environ.get('HARBORLIGHT_POLISH_AUDIT_REPORT', '/tmp/harborlight-polish-panels-audit.json'))
    report.write_text(json.dumps({'panels': records, 'english_ui_findings': failures,
                                  'execution_error': str(problem) if problem else None},
                                 ensure_ascii=False, indent=2))
    if problem:
        raise problem
    assert not failures, json.dumps(failures, ensure_ascii=False, indent=2)
    print('PASS Polish panels: %d actual panel snapshots desktop/mobile, model notifications and prices, shared league window, preserved player names and no external/cloud access' % len(records))


if __name__ == '__main__':
    run()
