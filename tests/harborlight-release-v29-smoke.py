"""Actual game integration for the v29 venues, active missions and cargo event.

Runs with isolated in-memory worlds; no hosted account or provider is contacted.
"""
import importlib.util
import json
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('v29_release_base', SOURCE / 'tests/harborlight-release-v28-smoke.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def open_menu_item(page, mobile, label):
    base.home(page, mobile)
    page.locator('#island-dialog').get_by_role('button', name=label, exact=True).click()


def scenario(browser, language, mobile):
    initial = base.fixture(level=3)
    context, page, errors, external = base.new_page(browser, initial, language, mobile)
    try:
        expect(page.locator('[data-theatre-map] svg')).to_have_count(1)
        expect(page.locator('[data-theatre-map] .theatre-map-building-image')).to_have_count(1)
        expect(page.locator('[data-theatre-map] [data-theatre-scene-slot], [data-theatre-map] .theatre-decoration')).to_have_count(0)
        open_menu_item(page, mobile, 'Teatr' if language == 'pl' else 'Theatre')
        theatre = page.locator('[data-theatre-panel]')
        expect(theatre).to_be_visible()
        expect(theatre.locator('[data-theatre-slot]')).to_have_count(20)
        # Select and buy a real decoration, then observe its saved ownership
        # inside the real Theatre. The revised island intentionally shows only
        # its integrated building, keeping the decorated courtyard behind a click.
        buy = theatre.locator('[data-theatre-buy]')
        expect(buy).to_be_visible()
        before = base.state_of(page)['resources']['coins']
        buy.click()
        page.wait_for_function('window.__HARBORLIGHT_DEV_STATE__.theatre.collection.length === 1')
        saved = base.state_of(page)
        assert saved['resources']['coins'] < before
        assert saved['theatre']['collection'][0]['level'] == 1
        first = saved['theatre']['collection'][0]
        assert first['slot'] is not None
        expect(page.locator('[data-theatre-map] .theatre-map-building-image')).to_have_count(1)
        expect(page.locator('[data-theatre-map] [data-theatre-scene-slot], [data-theatre-map] .theatre-decoration')).to_have_count(0)
        expect(theatre.locator(f'[data-theatre-scene-slot="{first["slot"]}"] .theatre-decoration-fountain')).to_have_count(1)
        # A background tick keeps the same interactive panel alive.
        page.clock.fast_forward(1200)
        expect(page.locator('[data-theatre-panel]')).to_have_count(1)
        expect(page.locator('[data-theatre-panel] [data-theatre-upgrade]')).to_be_visible()
        open_menu_item(page, mobile, 'Zadania' if language == 'pl' else 'Tasks')
        expect(page.locator('[data-sequential-mission]')).to_have_count(1)
        expect(page.locator('[data-lighthouse-missions]')).to_be_visible()
        assert page.locator('[data-task-card]').count() == 0
        expect(page.locator('[data-open-adventures]')).to_be_visible()
        page.locator('[data-open-adventures]').click()
        expect(page.locator('[data-adventures-panel]')).to_be_visible()
        expect(page.locator('[data-current-mission-choice]')).to_have_count(1)
        expect(page.locator('[data-adventure-start]')).to_have_count(2)
        page.locator('[data-adventure-all]').click()
        expect(page.locator('[data-adventure-start]:not([data-adventure-start="escapeStory"]):not([data-adventure-start="islandPuzzle"])')).to_have_count(9)
        page.locator('[data-adventure-start="cargoRain"]').click()
        overlay = page.locator('[data-cargo-flight]')
        expect(overlay).to_be_visible()
        box = overlay.bounding_box()
        size = page.viewport_size
        assert abs(box['width'] - size['width']) <= 2, (box, size)
        assert abs(box['height'] - size['height']) <= 2, (box, size)
        coins_before = base.state_of(page)['resources']['coins']
        # Advance only to a real falling object's visibility window, then click
        # its moving target. The model decides its resource and exact amount.
        page.clock.fast_forward(2500)
        drop = page.locator('[data-cargo-drop]').first
        expect(drop).to_be_visible()
        drop_id = drop.get_attribute('data-cargo-drop')
        run_before = base.state_of(page)['adventures']['active']
        item = next(item for item in run_before['data']['drops'] if str(item['id']) == drop_id)
        stock_before = base.state_of(page)['resources'][item['resource']]
        page.evaluate('''window.__adventureClickTrace=[];for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,e=>window.__adventureClickTrace.push({type,target:e.target.outerHTML?.slice(0,300),path:e.composedPath().slice(0,4).map(x=>x.tagName+':'+x.className),x:e.clientX,y:e.clientY}),true)''')
        click_box=drop.bounding_box()
        assert drop.evaluate('node=>{const box=node.getBoundingClientRect();return document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)?.closest("[data-cargo-drop]")===node}'), 'Falling cargo must receive pointer input above the dialog header'
        clock_before=base.state_of(page)['adventures']['clock']
        drop.click(force=True)
        after = base.state_of(page)
        assert after['resources'][item['resource']] == stock_before + item['amount'], {'item':item,'stock_before':stock_before,'after_resources':after['resources'],'clock_before':clock_before,'clock_after':after['adventures']['clock'],'caught_after':after['adventures']['active']['data']['caught'],'click_box':click_box,'trace':page.evaluate('window.__adventureClickTrace'),'text':page.locator('body').inner_text()[-2000:]}
        assert after['resources']['coins'] >= coins_before
        # The event also receives input above the original dialog rectangle,
        # proving that its fixed viewport is interactive rather than visual only.
        next_item=next(item for item in after['adventures']['active']['data']['drops'] if item['appearAt'] > after['adventures']['clock'] and 15 < item['x'] < 75)
        advance_ms=round((next_item['appearAt']-after['adventures']['clock']+.12)*1000)
        page.clock.fast_forward(advance_ms)
        edge_drop=page.locator('[data-cargo-drop="%s"]'%next_item['id'])
        expect(edge_drop).to_be_visible()
        assert edge_drop.evaluate('node=>{const box=node.getBoundingClientRect();return document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)?.closest("[data-cargo-drop]")===node}'), 'Viewport cargo must receive input outside the original dialog content'
        edge_before=base.state_of(page)['resources'][next_item['resource']]
        edge_drop.click(force=True)
        assert base.state_of(page)['resources'][next_item['resource']]==edge_before+next_item['amount']
        assert not errors, errors
        assert not external, external
        screenshots = Path('/tmp/harborlight-v29-integrated')
        screenshots.mkdir(exist_ok=True)
        page.screenshot(path=str(screenshots / f'{language}-{ "mobile" if mobile else "desktop" }-cargo.png'))
        print(json.dumps({'language': language, 'mobile': mobile, 'theatre': first['id'], 'cargo': item['resource'], 'caught': item['amount'], 'result': 'PASS'}), flush=True)
    finally:
        context.close()


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        try:
            scenario(browser, 'pl', False)
            scenario(browser, 'en', True)
        finally:
            browser.close()
