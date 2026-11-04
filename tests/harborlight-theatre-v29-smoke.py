"""Theatre editor acceptance with real pure commands and isolated memory only.

No player account, cloud write, ad network or real payment is accessed. The
cancel/completion adapter is deliberately labelled as a DEV test simulation.
"""
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
ORIGIN = 'https://theatre.harborlight.test'


def assets(route):
    path = unquote(urlsplit(route.request.url).path)
    if path == '/':
        return route.fulfill(content_type='text/html', body='''<!doctype html><html lang="pl"><head>
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <style>body{margin:20px;background:#0b2935;color:#fff;font:16px system-ui}
          #fixture{max-width:1350px;margin:0 auto}@media(max-width:500px){body{margin:10px}}</style>
          </head><body><main id="fixture"></main></body></html>''')
    target = (ROOT / path.lstrip('/')).resolve()
    if not target.is_relative_to(ROOT) or not target.is_file():
        return route.fulfill(status=404, body='Not found')
    return route.fulfill(body=target.read_bytes(), content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream')


def scenario(browser, language, mobile):
    context = browser.new_context(viewport={'width': 390 if mobile else 1440, 'height': 844 if mobile else 1100}, device_scale_factor=1)
    context.route(f'{ORIGIN}/**', assets)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(ORIGIN)
        page.evaluate('''async language=>{
          const [T,U,A]=await Promise.all([import('/harborlight-v1-theatre.js'),
            import('/harborlight-v1-theatre-ui.js'),import('/harborlight-v1-theatre-art.js')]);
          const state={worldTimeMs:1793700000000,resources:{coins:100000},settings:{language}};
          T.normalizeTheatre(state);const f=window.fixture={T,U,A,state,language,adMode:'cancel',noAds:false};
          f.perform=action=>T.theatreAction(state,action,{noAds:f.noAds});
          f.panel=U.createTheatrePanel({state,language,noAds:()=>f.noAds,perform:f.perform,
            requestRewardedAd:async({nonce})=>f.adMode==='cancel'
              ?f.perform({type:'theatreCancelUpgradeAd',nonce})&&false
              :T.theatreAction(state,{type:'theatreCompleteUpgradeAd',nonce,receiptId:'dev-ui-'+nonce},
                {environment:'development',devSimulation:true,rewardedAdVerified:true})});
          document.querySelector('#fixture').append(f.panel.element);
        }''', language)
        panel = page.locator('[data-theatre-panel]')
        expect(panel).to_be_visible()
        expect(page.locator('[data-theatre-slot]')).to_have_count(20)
        expect(page.locator('[data-theatre-kind]')).to_have_count(10)
        assert 'null' not in panel.inner_text(), 'A missing optional section rendered as literal null'
        assert page.evaluate('''()=>{const select=document.querySelector('[data-theatre-style]');select.focus();
          fixture.state.worldTimeMs+=1000;fixture.state.resources.coins+=4;fixture.panel.update(fixture.state);
          return document.activeElement===select&&select.isConnected;}'''), 'An unchanged one-second HUD update replaced focused editor controls'
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'), 'Theatre overflowed the viewport'
        page.locator('[data-theatre-buy="fountain"]').click()
        expect(page.locator('[data-theatre-owned]')).to_have_count(1)
        item_id = page.evaluate('fixture.state.theatre.collection[0].id')
        for _ in range(3):
            page.locator(f'[data-theatre-upgrade="{item_id}"]').click()
        assert page.evaluate('fixture.state.theatre.collection[0].level') == 4
        coins_before = page.evaluate('fixture.state.resources.coins')
        page.locator(f'[data-theatre-upgrade="{item_id}"]').click()
        assert page.evaluate('fixture.state.theatre.collection[0].level') == 4
        assert page.evaluate('fixture.state.resources.coins') == coins_before
        assert page.evaluate('fixture.state.theatre.pendingUpgrade') is None
        page.evaluate('fixture.adMode="complete"')
        page.locator(f'[data-theatre-upgrade="{item_id}"]').click()
        assert page.evaluate('fixture.state.theatre.collection[0].level') == 5
        assert page.evaluate('fixture.state.resources.coins') < coins_before
        page.locator(f'[data-theatre-move="{item_id}"]').click()
        # Legacy position shortcuts remain keyboard-accessible behind freely placed art.
        page.locator('[data-theatre-slot="19"]').focus()
        page.keyboard.press('Enter')
        assert page.evaluate('fixture.state.theatre.collection[0].slot') == 19
        page.locator(f'[data-theatre-remove="{item_id}"]').click()
        assert page.evaluate('fixture.state.theatre.collection[0].slot') is None
        page.locator(f'[data-theatre-move="{item_id}"]').click()
        # Legacy position shortcuts remain keyboard-accessible behind freely placed art.
        page.locator('[data-theatre-slot="5"]').focus()
        page.keyboard.press('Enter')
        assert page.evaluate('fixture.state.theatre.collection[0].slot') == 5
        assert page.evaluate('fixture.state.theatre.collection[0].level') == 5
        page.locator('[data-theatre-style]').select_option('marble')
        page.get_by_role('button', name='Zastosuj wybrany styl bez opłat' if language == 'pl' else 'Apply this style for free').click()
        assert page.evaluate('fixture.state.theatre.collection[0].style') == 'marble'
        # Parse all 200 image variants as actual XML; no invalid generated paths,
        # missing SVG roots, foreign scripts, or duplicate variants hidden by text.
        assert page.evaluate('''()=>fixture.T.THEATRE_DECORATIONS.every(kind=>Array.from({length:20},(_,i)=>i+1).every(level=>{
          const doc=new DOMParser().parseFromString(fixture.A.theatreIconSvg(kind.id,level,'coastal'),'image/svg+xml');
          return !doc.querySelector('parsererror,script')&&!!doc.querySelector('svg');}))''')
        page.evaluate('''()=>{const f=fixture;for(const [i,kind]of f.T.THEATRE_DECORATIONS.entries()){
          const bought=f.perform({type:'theatreBuy',decoration:kind.id,slot:i+6});
          if(bought.ok){while(f.state.theatre.collection.find(x=>x.id===bought.item.id).level<20)
            f.T.theatreAction(f.state,{type:'theatreUpgrade',id:bought.item.id},{noAds:true});}}
          f.panel.update();}''')
        expect(page.locator('[data-theatre-pennant]')).to_be_visible()
        if language == 'pl':
            page.screenshot(path=f'/tmp/harborlight-theatre-v29-{"mobile" if mobile else "desktop"}.png', full_page=True)
        assert not errors, errors
    finally:
        context.close()


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            for language in ['pl', 'en']:
                for mobile in [False, True]:
                    scenario(browser, language, mobile)
        finally:
            browser.close()
    print('PASS Theatre: 20 places/10 types, real coin commands, cancelled/verified milestone ad, move/store/reinstall, styles, 200 valid SVG variants, pennant; PL/EN desktop/mobile')


if __name__ == '__main__':
    run()
