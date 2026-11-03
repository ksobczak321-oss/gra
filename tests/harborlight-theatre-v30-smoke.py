"""Theatre studio acceptance using real commands and isolated saved worlds.

These checks exercise ownership, arrangements and ad settlement through the UI.
They never contact accounts, an ad provider, payments or a cloud database.
"""
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
ORIGIN = 'https://theatre-studio.harborlight.test'
SCREENSHOTS = Path(os.environ.get('HARBORLIGHT_SCREENSHOT_DIR', '/tmp/harborlight-theatre-v30'))


def make_assets(missing):
    def assets(route):
        path = unquote(urlsplit(route.request.url).path)
        if path == '/':
            return route.fulfill(content_type='text/html', body='''<!doctype html><html><head>
              <meta name="viewport" content="width=device-width,initial-scale=1">
              <style>body{margin:20px;background:#0b2935;color:#fff;font:16px system-ui}
              #fixture{max-width:1350px;margin:0 auto}@media(max-width:500px){body{margin:10px}}</style>
              </head><body><main id="fixture"></main></body></html>''')
        target = (ROOT / path.lstrip('/')).resolve()
        if not target.is_relative_to(ROOT) or not target.is_file():
            if '/assets/theatre-' in path:
                missing.append(path)
            return route.fulfill(status=404, body='Not found')
        return route.fulfill(body=target.read_bytes(), content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')
    return assets


def saved(page):
    return page.evaluate('structuredClone(fixture.state.theatre)')


def item(page, identity):
    return page.evaluate('(id)=>structuredClone(fixture.state.theatre.collection.find(entry=>entry.id===id))', identity)


def coins(page):
    return page.evaluate('fixture.state.resources.coins')


def select_owned(page, identity):
    page.locator(f'[data-theatre-owned="{identity}"]').click()


def change_mood(page, lighting, paving):
    page.locator('select[data-theatre-lighting]').select_option(lighting)
    page.locator('select[data-theatre-paving]').select_option(paving)
    assert saved(page)['atmosphere'] == {'lighting': lighting, 'paving': paving}


def scenario(browser, language, mobile):
    missing, errors, assets_seen = [], [], []
    context = browser.new_context(viewport={'width': 390 if mobile else 1440, 'height': 844 if mobile else 1100},
                                  device_scale_factor=1, reduced_motion='reduce')
    context.route(f'{ORIGIN}/**', make_assets(missing))
    page = context.new_page()
    page.set_default_timeout(10000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: assets_seen.append(urlsplit(response.url).path) if '/assets/theatre-' in response.url else None)
    try:
        page.goto(ORIGIN)
        page.evaluate('''async language=>{
          const [T,U,A]=await Promise.all([import('/harborlight-v1-theatre.js?v=frontend-v30'),
            import('/harborlight-v1-theatre-ui.js?v=frontend-v30'),import('/harborlight-v1-theatre-art.js?v=frontend-v30')]);
          const state={worldTimeMs:1793700000000,resources:{coins:100000},settings:{language}};
          T.normalizeTheatre(state);
          const foundation=[['fountain',0,4],['bench',6,8],['tree',19,12]];
          const identities=foundation.map(([kind,slot,level])=>{
            const bought=T.theatreAction(state,{type:'theatreBuy',decoration:kind,slot});
            if(!bought.ok)throw Error(bought.message);
            while(state.theatre.collection.find(item=>item.id===bought.item.id).level<level){
              const result=T.theatreAction(state,{type:'theatreUpgrade',id:bought.item.id},{noAds:true});
              if(!result.ok)throw Error(result.message);
            }
            return bought.item.id;
          });
          const f=window.fixture={T,U,A,state,language,identities,adMode:'cancel',noAds:false,saveStatus:'saved'};
          f.perform=action=>T.theatreAction(state,action,{noAds:f.noAds});
          f.panel=U.createTheatrePanel({state,language,persistence:'cloud',getSaveStatus:()=>f.saveStatus,noAds:()=>f.noAds,perform:f.perform,
            requestRewardedAd:async({nonce})=>f.adMode==='cancel'
              ?f.perform({type:'theatreCancelUpgradeAd',nonce})&&false
              :T.theatreAction(state,{type:'theatreCompleteUpgradeAd',nonce,receiptId:'dev-studio-'+nonce},
                {environment:'development',devSimulation:true,rewardedAdVerified:true})});
          document.querySelector('#fixture').append(f.panel.element);
        }''', language)
        panel = page.locator('[data-theatre-panel]')
        canvas = panel.locator('.theatre-canvas')
        expect(panel).to_be_visible()
        expect(page.locator('[data-theatre-slot]')).to_have_count(20)
        expect(page.locator('[data-theatre-kind]')).to_have_count(10)
        expect(page.locator('[data-theatre-save-layout]')).to_have_count(3)
        assert 'null' not in panel.inner_text() and 'undefined' not in panel.inner_text()
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'), 'Studio overflowed the viewport'
        scene_box = canvas.bounding_box()
        assert scene_box['width'] >= (330 if mobile else 600), scene_box
        assert scene_box['y'] < 320, 'The scenery was pushed below a long settings form'
        assert scene_box['height'] >= 200, scene_box
        # Real generated artwork must load; an SVG fallback alone cannot pass.
        page.wait_for_function('document.querySelectorAll(".theatre-scene image").length>0')
        assert not missing, missing
        # Raster sprites must be clipped to their own icon. A valid SVG root
        # alone would also accept an entire leaking atlas painted over the UI.
        assert page.evaluate('''()=>{
          const probe=document.createElement('div');
          Object.assign(probe.style,{position:'fixed',inset:'0',zIndex:'999999',background:'#12313b'});
          const host=document.createElement('span');host.className='theatre-art';
          Object.assign(host.style,{display:'block',position:'absolute',left:'25%',top:'25%',width:'188px',height:'184px'});
          host.innerHTML=fixture.A.theatreIconSvg('fountain',10,'coastal');probe.append(host);document.body.append(probe);
          const r=host.getBoundingClientRect(),points=[[r.left-8,r.top+r.height/2],[r.right+8,r.top+r.height/2],
            [r.left+r.width/2,r.top-8],[r.left+r.width/2,r.bottom+8],[r.right+35,r.bottom+35]];
          const leaked=points.filter(([x,y])=>x>=0&&y>=0&&x<innerWidth&&y<innerHeight).some(([x,y])=>{
            const hit=document.elementFromPoint(x,y);return hit?.closest?.('.theatre-sprite-window')!=null;
          });probe.remove();return !leaked;
        }'''), 'A decoration painted the atlas outside its icon viewport'

        # A tax tick preserves focus and the selected native control.
        assert page.evaluate('''()=>{const selector=document.querySelector('[data-theatre-style]');selector.focus();
          fixture.state.worldTimeMs+=1000;fixture.state.resources.coins+=4;fixture.panel.update(fixture.state);
          return document.activeElement===selector&&selector.isConnected;}''')

        # A cloud status change is presentation only and never replaces the
        # scenery or focused arrangement controls. A preview is checked below.
        assert page.evaluate('''()=>{
          const f=fixture,canvas=document.querySelector('.theatre-canvas'),style=document.querySelector('[data-theatre-style]');
          style.focus();const labels=[];
          for(const status of ['pending','offline','saved']){
            f.saveStatus=status;f.panel.update(f.state);
            const note=document.querySelector('[data-theatre-save-status]');labels.push(note.textContent);
            if(note.dataset.saveStatus!==status||document.querySelector('.theatre-canvas')!==canvas||document.activeElement!==style)return false;
          }
          return new Set(labels).size===3;
        }'''), 'Saving/offline status replaced the scene or did not explain the real state'

        # Viewing the garden hides editable targets without changing ownership.
        before_view = saved(page)
        page.locator('[data-theatre-view-mode]').click()
        expect(panel).to_have_attribute('data-theatre-editing', 'false')
        expect(page.locator('[data-theatre-slot]').first).to_be_hidden()
        assert saved(page) == before_view
        page.locator('[data-theatre-view-mode]').click()
        expect(panel).to_have_attribute('data-theatre-editing', 'true')
        expect(page.locator('[data-theatre-slot]').first).to_be_visible()
        page.locator('[data-theatre-slot="0"]').focus()
        page.keyboard.press('ArrowRight')
        assert page.evaluate('document.activeElement.dataset.theatreSlot') == '1'
        page.keyboard.press('Home')
        page.keyboard.press('ArrowDown')
        assert page.evaluate('document.activeElement.dataset.theatreSlot') == '4'

        fountain_id, bench_id, tree_id = page.evaluate('fixture.identities')
        select_owned(page, bench_id)
        page.locator(f'[data-theatre-upgrade="{bench_id}"]').click()
        assert item(page, bench_id)['level'] == 9
        coins_before = coins(page)
        change_mood(page, 'night', 'stone')
        assert coins(page) == coins_before, 'Changing the scenery charged coins'
        page.locator('[data-theatre-save-layout="0"]').click()
        original_layout = saved(page)['layouts'][0]
        assert original_layout and len(original_layout['placements']) == 3

        # Level10 requires the real ad callback. Cancellation leaves the item
        # and wallet unchanged; verified completion upgrades this possession.
        select_owned(page, bench_id)
        page.locator(f'[data-theatre-upgrade="{bench_id}"]').click()
        assert item(page, bench_id)['level'] == 9
        assert coins(page) == coins_before
        assert saved(page)['pendingUpgrade'] is None
        page.evaluate('fixture.adMode="complete"')
        page.locator(f'[data-theatre-upgrade="{bench_id}"]').click()
        assert item(page, bench_id)['level'] == 10
        assert coins(page) < coins_before

        # Make another design, including a newly acquired decoration. Restoring
        # the old design cannot delete it, duplicate it, refund coins or undo10.
        page.locator(f'[data-theatre-move="{bench_id}"]').click()
        page.locator('[data-theatre-slot="10"]').click()
        assert item(page, bench_id)['slot'] == 10
        change_mood(page, 'golden', 'brick')
        page.locator('[data-theatre-kind="flowerbed"]').click()
        page.locator('[data-theatre-buy="flowerbed"]').click()
        assert len(saved(page)['collection']) == 4
        page.locator('[data-theatre-save-layout="1"]').click()
        change_mood(page, 'day', 'sandstone')
        page.locator('[data-theatre-save-layout="2"]').click()
        before_restore = saved(page)
        coins_before_restore = coins(page)
        page.locator('[data-theatre-restore-layout="0"]').click()
        restored = saved(page)
        assert restored['atmosphere'] == original_layout['atmosphere']
        assert len(restored['collection']) == len(before_restore['collection']) == 4
        assert {entry['id'] for entry in restored['collection']} == {entry['id'] for entry in before_restore['collection']}
        assert coins(page) == coins_before_restore
        assert item(page, bench_id)['level'] == 10
        for placement in original_layout['placements']:
            actual = item(page, placement['id'])
            assert actual['slot'] == placement['slot'] and actual['style'] == placement['style']
        assert all(layout is not None for layout in restored['layouts'])
        page.locator('[data-theatre-delete-layout="2"]').click()
        assert saved(page)['layouts'][2] is None
        assert coins(page) == coins_before_restore

        # The garden can keep growing beyond its original twenty levels.
        # Earlier no-ad entitlement is a fixture licence, but all upgrades are
        # actual UI commands and spend their current quoted game-coin price.
        select_owned(page, bench_id)
        page.evaluate('fixture.noAds=true;fixture.panel.update(fixture.state)')
        while item(page, bench_id)['level'] < 20:
            page.locator(f'[data-theatre-upgrade="{bench_id}"]').click()
        page.evaluate('fixture.noAds=false;fixture.panel.update(fixture.state)')
        balance_at_twenty = coins(page)
        for expected_level in [21, 22, 23, 24]:
            page.locator(f'[data-theatre-upgrade="{bench_id}"]').click()
            assert item(page, bench_id)['level'] == expected_level
        assert coins(page) < balance_at_twenty
        before_twenty_five = coins(page)
        page.evaluate('fixture.adMode="cancel"')
        page.locator(f'[data-theatre-upgrade="{bench_id}"]').click()
        assert item(page, bench_id)['level'] == 24
        assert coins(page) == before_twenty_five
        assert saved(page)['pendingUpgrade'] is None
        page.evaluate('fixture.adMode="complete"')
        page.locator(f'[data-theatre-upgrade="{bench_id}"]').click()
        assert item(page, bench_id)['level'] == 25
        assert coins(page) < before_twenty_five
        page.locator(f'[data-theatre-move="{bench_id}"]').click()
        page.locator('[data-theatre-slot="11"]').click()
        balance_at_twenty_five = coins(page)
        page.locator('[data-theatre-restore-layout="0"]').click()
        assert item(page, bench_id)['level'] == 25
        assert item(page, bench_id)['slot'] == next(entry['slot'] for entry in original_layout['placements'] if entry['id'] == bench_id)
        assert coins(page) == balance_at_twenty_five
        assert len(saved(page)['collection']) == 4

        # Stored ornaments remain owned and retain their level on reinstall.
        select_owned(page, tree_id)
        page.locator(f'[data-theatre-remove="{tree_id}"]').click()
        assert item(page, tree_id)['slot'] is None
        page.locator(f'[data-theatre-move="{tree_id}"]').click()
        page.locator('[data-theatre-slot="17"]').click()
        assert item(page, tree_id)['slot'] == 17
        assert item(page, tree_id)['level'] == 12

        # Same-origin render/reload uses the normalized real saved model.
        before_reload = saved(page)
        page.evaluate('''()=>{const f=fixture,raw=structuredClone(f.state);f.panel.destroy();
          f.state={worldTimeMs:raw.worldTimeMs,resources:raw.resources,settings:raw.settings};
          f.T.normalizeTheatre(f.state,raw);
          f.panel=f.U.createTheatrePanel({state:f.state,language:f.language,persistence:'preview',getSaveStatus:()=>f.saveStatus,perform:action=>f.T.theatreAction(f.state,action)});
          document.querySelector('#fixture').append(f.panel.element);}''')
        assert saved(page) == before_reload
        expect(page.locator('[data-theatre-save-status]')).to_have_attribute('data-save-status', 'preview')
        assert ('podgląd' in page.locator('[data-theatre-save-status]').inner_text().lower() if language == 'pl' else 'preview' in page.locator('[data-theatre-save-status]').inner_text().lower())
        assert page.evaluate("fixture.A.theatreIconSvg('bench',20,'coastal')!==fixture.A.theatreIconSvg('bench',21,'coastal')"), 'The art stopped developing at level20'
        assert page.evaluate('''()=>fixture.T.THEATRE_DECORATIONS.every(kind=>[...Array.from({length:20},(_,i)=>i+1),21,22,25,100].every(level=>{
          const doc=new DOMParser().parseFromString(fixture.A.theatreIconSvg(kind.id,level,'coastal'),'image/svg+xml');
          return !doc.querySelector('parsererror,script')&&!!doc.querySelector('svg');}))''')
        page.locator('[data-theatre-view-mode]').click()
        expect(page.locator('[data-theatre-panel]')).to_have_attribute('data-theatre-editing', 'false')
        SCREENSHOTS.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(SCREENSHOTS / (language + ('-mobile' if mobile else '-desktop') + '.png')), full_page=True)
        page.locator('[data-theatre-view-mode]').click()
        change_mood(page, 'day', 'stone')
        inspector = page.locator('[data-theatre-inspector]')
        assert ('Wszystkie miejsca są zajęte' if language == 'pl' else 'All places are occupied') not in inspector.inner_text(), 'An occupied selected place was described as a full garden'
        page.screenshot(path=str(SCREENSHOTS / (language + ('-mobile' if mobile else '-desktop') + '-day-edit.png')), full_page=True)
        assert not errors, errors
        assert not missing, missing
        assert any('theatre-courtyard-v30' in path for path in assets_seen), assets_seen
        assert any('theatre-decor-atlas-v30' in path for path in assets_seen), assets_seen
        print(json.dumps({'language': language, 'mobile': mobile, 'result': 'PASS', 'owned': 4, 'layouts': 2,
                          'milestoneLevel': 25, 'aboveOriginalLimit': [21,22,25], 'generatedArt': True}), flush=True)
    finally:
        context.close()


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                    headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    scenario(browser, language, mobile)
        finally:
            browser.close()
    print('PASS Theatre studio: generated art,20places/10types,keyboard/view mode,lighting/paving,three saved designs,ownership-preserving restoration,unlimited21/22/25,cloud/previewstatus,admilestones,currency and focus;PL/EN desktop/mobile')


if __name__ == '__main__':
    run()
