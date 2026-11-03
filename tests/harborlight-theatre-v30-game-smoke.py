"""Theatre v30 acceptance in the real layered game, with isolated QA worlds.

Only fixture creation uses pure model setup. Purchases, advertisements, layout
changes and restoration use the same controls as a player. No real account,
provider, cloud write or manual acceptance result is touched.
"""
import importlib.util
import json
import os
import re
from pathlib import Path
import subprocess

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('theatre_v30_game_base', SOURCE / 'tests/harborlight-release-v28-smoke.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
SCREENSHOTS = Path(os.environ.get('HARBORLIGHT_SCREENSHOT_DIR', '/tmp/harborlight-theatre-v30-game'))


def fixture():
    original = base.fixture(level=3)
    script = """import {readFileSync} from 'node:fs';
      import {act} from './harborlight-v1-state.js';
      const world=JSON.parse(readFileSync(0,'utf8'));
      const command=action=>{const r=act(world,action,world.worldTimeMs);if(!r.ok)throw Error(r.message);return r;};
      const f=command({type:'theatreBuy',decoration:'fountain',style:'coastal',slot:0});
      for(let i=0;i<3;i++)command({type:'theatreUpgrade',id:f.item.id});
      command({type:'theatreBuy',decoration:'tree',style:'garden',slot:6});
      command({type:'theatreBuy',decoration:'bench',style:'coastal',slot:11});
      command({type:'theatreSaveLayout',slot:0});
      console.log(JSON.stringify(world));"""
    result = subprocess.run(['node', '--input-type=module', '-e', script], input=json.dumps(original),
                            cwd=SOURCE, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def snapshot(page):
    return base.state_of(page)


def theatre(page):
    return snapshot(page)['theatre']


def item(page, identity):
    return next(entry for entry in theatre(page)['collection'] if entry['id'] == identity)


def image_decode(page, scope):
    return page.locator(scope).evaluate('''async node=>{
      const images=[...new Set([...node.querySelectorAll('image')].map(image=>image.href.baseVal))];
      await Promise.all(images.map(source=>new Promise((resolve,reject)=>{
        const image=new Image();image.onload=()=>image.naturalWidth>0?resolve():reject(Error('Empty '+source));
        image.onerror=()=>reject(Error('Image did not decode: '+source));image.src=source;
      })));
      return images;
    }''')


def screen(page, name):
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SCREENSHOTS / (name + '.png')), full_page=True)


def choose_owned(page, identity):
    page.locator(f'[data-theatre-owned="{identity}"]').click()
    expect(page.locator(f'[data-theatre-upgrade="{identity}"]')).to_be_visible()


def mood(page, lighting, paving):
    page.locator('select[data-theatre-lighting]').select_option(lighting)
    page.locator('select[data-theatre-paving]').select_option(paving)
    assert theatre(page)['atmosphere'] == {'lighting': lighting, 'paving': paving}


def open_theatre(page, language, mobile):
    if mobile:
        base.home(page, mobile)
        page.locator('#island-dialog').get_by_role('button', name='Teatr' if language == 'pl' else 'Theatre', exact=True).click()
    else:
        page.locator('#hit-world-theatre').click()
    expect(page.locator('[data-theatre-panel]')).to_be_visible()


def scenario(browser, language, mobile):
    initial = fixture()
    context, page, errors, external = base.new_page(browser, initial, language, mobile)
    label = language + '-' + ('mobile' if mobile else 'desktop')
    requests = []
    page.on('request', lambda request: requests.append(request.url))
    try:
        main = page.locator('[data-theatre-map]')
        expect(main.locator('.theatre-map-building-image')).to_have_count(1)
        expect(main.locator('[data-theatre-scene-slot],.theatre-decoration')).to_have_count(0)
        urls = image_decode(page, '[data-theatre-map]')
        assert len(urls) == 1 and 'theatre-building-v30.png' in urls[0]
        assert not any('theatre-courtyard-v30' in url or 'theatre-decor-atlas-v30' in url for url in requests), 'Private garden art was mounted on the island before opening it'
        if not mobile:
            screen(page, label + '-integrated-building')

        open_theatre(page, language, mobile)
        panel = page.locator('[data-theatre-panel]')
        expect(panel.locator('[data-theatre-slot]')).to_have_count(20)
        expect(panel.locator('[data-theatre-kind]')).to_have_count(10)
        assert 'Wszystkie miejsca są zajęte' not in panel.inner_text() and 'All places are occupied' not in panel.inner_text(), 'Three placed decorations were described as a full twenty-place garden'
        if page.locator('#island-dialog .dialog-back').count():
            assert page.locator('#island-dialog .dialog-header').evaluate('''header=>{
              const title=header.querySelector('h2'),back=header.querySelector('.dialog-back');
              const range=document.createRange();range.selectNodeContents(title);
              const a=range.getBoundingClientRect(),b=back.getBoundingClientRect();
              return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;
            }'''), 'The back button covers the Theatre title'
        urls = image_decode(page, '[data-theatre-panel]')
        assert any('theatre-courtyard-v30.png' in url for url in urls)
        assert any('theatre-decor-atlas-v30.png' in url for url in urls)
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'), 'Theatre forced horizontal page scrolling'
        assert page.locator('#island-dialog .dialog-body').evaluate('node=>node.scrollWidth<=node.clientWidth+2'), 'Theatre content was clipped horizontally'
        scene = panel.locator('.theatre-scene').first
        box = scene.bounding_box()
        assert box and box['width'] >= (280 if mobile else 650) and box['height'] >= 150, box
        screen(page, label + '-studio')

        fountain = initial['theatre']['collection'][0]['id']
        choose_owned(page, fountain)
        # The actual game's 10-second advertising flow is intentionally a DEV
        # simulation. A skipped film does not debit or upgrade this possession.
        before = snapshot(page)['resources']['coins']
        page.locator(f'[data-theatre-upgrade="{fountain}"]').click()
        expect(page.locator('#rewarded-ad')).to_be_visible()
        page.locator('[data-skip-ad]').click()
        assert item(page, fountain)['level'] == 4
        assert snapshot(page)['resources']['coins'] == before
        assert theatre(page)['pendingUpgrade'] is None
        page.locator(f'[data-theatre-upgrade="{fountain}"]').click()
        expect(page.locator('#rewarded-ad')).to_be_visible()
        page.clock.fast_forward(11000)
        assert item(page, fountain)['level'] == 5
        assert snapshot(page)['resources']['coins'] < before
        assert theatre(page)['pendingUpgrade'] is None

        # Arrangement is free. Restoring a remembered arrangement keeps the
        # newly earned level and current ownership/wallet rather than rolling
        # the account back to its older snapshot.
        before_layout = snapshot(page)['resources']['coins']
        mood(page, 'night', 'brick')
        choose_owned(page, fountain)
        page.locator(f'[data-theatre-move="{fountain}"]').click()
        page.locator('[data-theatre-slot="19"]').click()
        assert item(page, fountain)['slot'] == 19
        page.locator('[data-theatre-save-layout="1"]').click()
        saved_night = theatre(page)['layouts'][1]
        assert saved_night and saved_night['atmosphere']['lighting'] == 'night'
        page.locator('[data-theatre-restore-layout="0"]').click()
        assert item(page, fountain)['slot'] == 0 and item(page, fountain)['level'] == 5
        assert theatre(page)['atmosphere'] == {'lighting': 'day', 'paving': 'sandstone'}
        assert snapshot(page)['resources']['coins'] == before_layout
        assert len(theatre(page)['collection']) == 3
        page.locator('[data-theatre-restore-layout="1"]').click()
        assert item(page, fountain)['slot'] == 19
        assert theatre(page)['atmosphere'] == {'lighting': 'night', 'paving': 'brick'}
        assert snapshot(page)['resources']['coins'] == before_layout

        choose_owned(page, fountain)
        page.locator(f'[data-theatre-remove="{fountain}"]').click()
        assert item(page, fountain)['slot'] is None and item(page, fountain)['level'] == 5
        page.locator(f'[data-theatre-move="{fountain}"]').click()
        page.locator('[data-theatre-slot="5"]').click()
        assert item(page, fountain)['slot'] == 5
        assert snapshot(page)['resources']['coins'] == before_layout

        # Zoom stays inside the garden's own scrollable viewport and must not
        # turn the whole phone page into a sideways scroller.
        page.locator('[data-theatre-zoom]').click()
        page.clock.fast_forward(32)
        canvas = panel.locator('[data-theatre-canvas]')
        expect(canvas).to_have_class(re.compile(r'.*is-zoomed.*'))
        assert canvas.evaluate('node=>node.scrollWidth>node.clientWidth*1.5&&node.scrollHeight>node.clientHeight*1.5')
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
        screen(page, label + '-zoomed-garden')
        page.locator('[data-theatre-zoom]').click()

        # The world continues ticking without replacing a focused editor input.
        control = panel.locator('[data-theatre-style]')
        control.focus()
        page.clock.fast_forward(1200)
        assert control.evaluate('node=>node.isConnected&&document.activeElement===node'), 'A background game tick replaced the focused decoration control'
        page.locator('[data-theatre-view-mode]').click()
        expect(panel).to_have_attribute('data-theatre-editing', 'false')
        expect(panel.locator('[data-theatre-slot-marker]')).to_have_count(0)
        screen(page, label + '-night-admiring')
        page.locator('[data-theatre-view-mode]').click()
        expect(panel).to_have_attribute('data-theatre-editing', 'true')
        assert not errors, errors
        assert not external, external
        persisted = snapshot(page)
        context.close()
        context, page, errors, external = base.new_page(browser, persisted, language, mobile)
        open_theatre(page, language, mobile)
        assert item(page, fountain)['level'] == 5 and item(page, fountain)['slot'] == 5
        assert theatre(page)['atmosphere'] == {'lighting': 'night', 'paving': 'brick'}
        assert len(theatre(page)['collection']) == 3
        assert theatre(page)['layouts'][0] is not None and theatre(page)['layouts'][1] is not None
        assert not errors, errors
        assert not external, external
        screen(page, label + '-restored-session')
        print(json.dumps({'language': language, 'mobile': mobile, 'building_only_on_map': True,
                          'slots': 20, 'owned': 3, 'fountain_level': 5, 'ad_cancel_and_complete': 'PASS',
                          'layout_restore': 'PASS', 'reopened_saved_session': 'PASS', 'result': 'PASS'}), flush=True)
    finally:
        context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                             headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    scenario(browser, language, mobile)
        finally:
            browser.close()
