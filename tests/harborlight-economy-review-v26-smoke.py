"""Focused actual-game acceptance for the DEV economy view changes.

Fixtures are served from loopback and kept only in memory. No account, cloud
save, real advertising service, bank transfer or existing island is touched.
"""
from datetime import datetime, timezone
import json
import mimetypes
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
ORIGIN = 'http://127.0.0.1:47386'
NOW = datetime(2026, 11, 1, 12, tzinfo=timezone.utc)
PRODUCERS = ['farm', 'windmill', 'lumber', 'sawmill', 'quarry']
STOCK = {'wood': 2851, 'stone': 165, 'grain': 2758, 'food': 49, 'planks': 2785}


def seed(forced):
    script = '''import {createState,act} from './harborlight-v1-state.js';
      import {producerCapacity} from './harborlight-v1-logistics.js';
      const at=%d,state=createState(at),forced=%s;
      state.islandName='Przystań';state.tutorial.autoOpenDisabled=true;
      state.engagementSchedule.initialCompleted=true;state.engagementSchedule.initialAnchored=true;
      state.engagementSchedule.nextAt=1e12;
      for(const [id,b] of Object.entries(state.buildings)){b.level=id==='warehouse'?1:4;b.workers=0;}
      state.resources={coins:10000,wood:2851,stone:165,grain:2758,food:49,planks:2785};
      state.bonusMaterials={wood:1851,stone:0,grain:1758,food:0,planks:2733};
      state.residents.forEach(p=>{p.workplace=null;p.arrivalRemaining=0;p.returnRemaining=0;});
      if(forced){
        for(const building of ['farm','windmill','lumber','sawmill','quarry']){
          const result=act(state,{type:'assign',building,delta:1},at);if(!result.ok)throw new Error(result.message);
        }
        state.residents.forEach(p=>{p.arrivalRemaining=0;});state.lighthouseRemaining=3600;
      }
      for(const id of ['farm','windmill','lumber','sawmill','quarry'])state.buildings[id].ready=producerCapacity(state,id);
      console.log(JSON.stringify(state));''' % (int(NOW.timestamp() * 1000), 'true' if forced else 'false')
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', script], cwd=SOURCE, capture_output=True, text=True, check=True).stdout)


def open_building(page, building, mobile):
    if mobile:
        page.locator('[data-mobile-category="administration"]').click()
        page.locator('[data-mobile-building="%s"]' % building).click()
    else:
        page.locator('#hit-world-%s' % building).click()
    expect(page.locator('#island-dialog')).to_have_attribute('data-panel-kind', 'building')


def scenario(browser, language, mobile, forced):
    context = browser.new_context(viewport={'width': 390 if mobile else 1366, 'height': 844 if mobile else 900},
                                  is_mobile=mobile, has_touch=mobile, reduced_motion='reduce')
    errors = []

    def asset(route):
        target = (ROOT / unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
        if not target.is_relative_to(ROOT) or not target.is_file():
            return route.fulfill(status=404, body='Missing fixture asset')
        return route.fulfill(body=target.read_bytes(), content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')

    context.route(ORIGIN + '/**', asset)
    context.add_init_script('window.__HARBORLIGHT_DEV_FIXTURE__=%s;localStorage.setItem("harborlight-language",%s);' % (json.dumps(seed(forced)), json.dumps(language)))
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.clock.install(time=NOW)
    page.clock.pause_at(NOW)
    try:
        assert page.goto(ORIGIN + '/harborlight-v1-layered.html?profile=new-player').ok
        page.wait_for_function('window.__HARBORLIGHT_DEV_STATE__ !== undefined && document.getElementById("loading").hidden')
        for building in PRODUCERS:
            face = page.locator('#hit-world-%s [data-production-penalty="%s"]' % (building, building))
            expect(face).to_have_count(1)
            expect(face).to_have_text('☹')
            expect(face).to_have_attribute('aria-label', re.compile('Lokalny magazyn jest pełny' if language == 'pl' else 'Local storage is full'))
        state = page.evaluate('window.__HARBORLIGHT_DEV_STATE__')
        assert all(state['buildings'][building]['workers'] == (1 if forced else 0) for building in PRODUCERS)
        if forced:
            assert state['happiness'] == 100, state['happiness']

        open_building(page, 'warehouse', mobile)
        page.locator('[data-building-more="warehouse"]').click()
        help_box = page.locator('[data-section-help="central-warehouse"]')
        expect(help_box).to_be_hidden()
        for resource, amount in STOCK.items():
            row = page.locator('[data-central-resource="%s"]' % resource)
            expect(row).to_have_attribute('data-value', str(amount))
            assert int(''.join(re.findall(r'\d', row.inner_text()))) == amount
            assert '/' not in row.inner_text(), row.inner_text()
            assert 'nagrod' not in row.inner_text().lower()
            assert 'reward' not in row.inner_text().lower()
        expect(page.locator('summary').filter(has_text='Jak działa magazyn' if language == 'pl' else 'How storage works')).to_have_count(0)
        trigger = page.locator('[data-section-info="central-warehouse"]')
        trigger.click()
        expect(help_box).to_be_visible()
        expect(trigger).to_have_attribute('aria-expanded', 'true')
        expect(help_box).to_contain_text('nagrody' if language == 'pl' else 'rewards')
        expect(help_box).to_contain_text('ze zwykłych dostaw' if language == 'pl' else 'ordinary')
        box = help_box.bounding_box()
        assert box and box['x'] >= 0 and box['x'] + box['width'] <= page.viewport_size['width'] + 1, box
        trigger.click()
        expect(help_box).to_be_hidden()
        page.locator('#island-dialog .dialog-close').click()

        open_building(page, 'house', mobile)
        house = page.locator('[data-building-panel="house"]')
        expect(house.locator('[data-manage-workers]')).to_be_visible()
        expect(house.locator('[data-worker-building]')).to_have_count(0)
        expect(house.locator('[data-house-allocate]')).to_be_visible()
        house.locator('[data-manage-workers]').click()
        expect(page.locator('#island-dialog')).to_have_attribute('data-panel-kind', 'workers')
        for building in PRODUCERS + ['warehouse', 'dock', 'market']:
            expect(page.locator('[data-worker-building="%s"][data-worker-delta="1"]' % building)).to_have_count(1)
        assert page.evaluate('Object.keys(localStorage).filter(key=>/^harborlight.*(?:island|save)/i.test(key))') == []
        assert not errors, errors
    finally:
        context.close()


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    for forced in [False, True]:
                        scenario(browser, language, mobile, forced)
        finally:
            browser.close()
    print('PASS economy review: warehouse available totals and info-only origin details; House manage-workers destination; five full-store sad faces with no workers and at forced100 happiness; PL/EN desktop/mobile')


if __name__ == '__main__':
    run()
