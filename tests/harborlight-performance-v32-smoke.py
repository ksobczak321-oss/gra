"""Real-asset startup contract: load the visible scene, not every upgrade atlas.

Uses only the official in-memory level-five preview over local HTTP. No real
account, cloud document, payment, resource award or browser memory threshold is
used. The budgets constrain shipped bytes and requested artwork deterministically.
"""
from copy import deepcopy
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import threading
from urllib.parse import unquote, urlsplit

from playwright.sync_api import expect, sync_playwright
from helpers.browser_offers import dismiss_player_offers
from helpers.building_stage_acceptance import staged_manifest, assert_scene

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
OUTPUT = Path(os.environ.get('HARBORLIGHT_PERFORMANCE_QA_OUTPUT', '/tmp/harborlight-performance-v32'))
OUTPUT.mkdir(parents=True, exist_ok=True)
MANIFEST = staged_manifest(ROOT)
assert MANIFEST and all(len(family.get('sprites', [])) == 10 for family in MANIFEST['buildings'].values()), 'This release requires all 200 standalone level variants'
SPRITE_PATHS = {sprite['src'] for family in MANIFEST['buildings'].values() for sprite in family['sprites']}
ATLAS_PATHS = {family['src'] for family in MANIFEST['buildings'].values()}
TERRAIN = MANIFEST['terrain']['src']
CRANE = MANIFEST['crane']['src']
CURRENT_HOUSE = MANIFEST['buildings']['house']['sprites'][2]['src']
FUTURE_HOUSE = MANIFEST['buildings']['house']['sprites'][9]['src']
UNUSED_OLD_ART = {
    'assets/harborlight-farm-forest-approved-v32.png',
    'assets/harborlight-harbor-approved-v32.png',
    'assets/harborlight-windmill-clean.png',
}
# This fixed, generous byte budget catches a return to the 52.6 MB cold start.
# It is independent of machine speed, GPU capabilities, timing and RSS noise.
STARTUP_IMAGE_BYTES_LIMIT = 20 * 1024 * 1024


class StaticHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def current_sprite_paths(state):
    paths = set()
    for identity, family in MANIFEST['buildings'].items():
        owner = 'townhall' if identity == 'theatre' else identity
        level = state['buildings'][owner]['level']
        index = min(9, max(0, (max(1, int(level)) - 1) // 2))
        paths.add(family['sprites'][index]['src'])
    functional_paths = paths.copy()
    for decoration in MANIFEST['decorations']:
        index = min(9, max(0, (max(1, int(state['buildings']['townhall']['level'])) - 1) // 2))
        paths.add(MANIFEST['buildings'][decoration['family']]['sprites'][index]['src'])
    return functional_paths, paths


def run_case(browser, base, width, height, *, unavailable_future=False, fail_current_once=False):
    requests, writes, external, missing, errors = [], [], [], [], []
    failed_once = False
    future_manifest = deepcopy(MANIFEST)
    # Keep real current-frame files. Only the unused future metadata points to
    # an unavailable, normally shaped filename in the same asset directory.
    unavailable = 'assets/building-upgrades-v1/frame-house-10-unavailable.webp'
    if unavailable_future:
        future_manifest['buildings']['house']['sprites'][9]['src'] = unavailable
    context = browser.new_context(viewport={'width': width, 'height': height},
                                  has_touch=width < 901, device_scale_factor=2 if width < 901 else 1,
                                  reduced_motion='no-preference')

    def route(request):
        nonlocal failed_once
        parsed = urlsplit(request.request.url)
        path = unquote(parsed.path).lstrip('/')
        if request.request.method not in ('GET', 'HEAD'):
            writes.append(request.request.method + ' ' + request.request.url)
            return request.abort('blockedbyclient')
        if parsed.netloc != urlsplit(base).netloc:
            external.append(request.request.url)
            return request.abort('blockedbyclient')
        requests.append(path)
        if unavailable_future and path == 'assets/building-upgrades-v1/manifest.json':
            return request.fulfill(content_type='application/json', body=json.dumps(future_manifest))
        if path == unavailable:
            missing.append(path)
            return request.fulfill(status=404, body='Future variant unavailable')
        if fail_current_once and not failed_once and path == CURRENT_HOUSE:
            failed_once = True
            missing.append(path)
            return request.fulfill(status=404, body='Current visible variant unavailable')
        return request.continue_()

    context.route('**/*', route)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.add_init_script('localStorage.setItem("harborlight-language","pl")')
    page.goto(base + '/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5',
              wait_until='domcontentloaded')
    if fail_current_once:
        expect(page.locator('#loading[role="alert"]')).to_be_visible(timeout=30000)
        expect(page.locator('#viewport')).to_be_hidden()
        assert page.evaluate('document.documentElement.dataset.gameStartup') == 'error'
        assert missing == [CURRENT_HOUSE]
        retry = page.get_by_role('button', name='Spróbuj ponownie', exact=True)
        expect(retry).to_be_enabled()
        retry.click()
    page.wait_for_function('document.documentElement.dataset.gameStartup === "ready"', timeout=30000)
    dismiss_player_offers(page)
    expect(page.locator('#loading')).to_be_hidden()
    assert_scene(page, MANIFEST)
    state = page.evaluate('window.__HARBORLIGHT_DEV_STATE__')
    functional_expected, expected = current_sprite_paths(state)
    assert state['buildings']['townhall']['level'] == 5
    assert len(functional_expected) == 20, 'The official preview needs exactly one current frame per functional family'
    assert len(expected - functional_expected) <= len(MANIFEST['decorations'])
    actual = set(requests) & SPRITE_PATHS
    assert actual == expected, {'missing': sorted(expected - actual), 'extra': sorted(actual - expected)}
    assert not (set(requests) & ATLAS_PATHS), 'A full 10-level source atlas was loaded by gameplay'
    assert not (set(requests) & UNUSED_OLD_ART), 'Superseded farm, harbor or windmill art was downloaded'
    assert CRANE not in requests, 'A crane must not delay a world with no active construction'
    building_images = {path for path in requests if path.startswith('assets/building-upgrades-v1/') and path.endswith(('.png', '.webp'))}
    assert building_images == expected | {TERRAIN}
    resources = page.evaluate("performance.getEntriesByType('resource').map(e=>({path:new URL(e.name).pathname.slice(1),url:e.name,bytes:e.encodedBodySize}))")
    image_resources = [row for row in resources if row['path'].endswith(('.png', '.webp', '.jpg', '.jpeg', '.svg'))]
    assert all(row['bytes'] > 0 for row in image_resources), 'Local real-asset timing must expose transferred bytes'
    image_bytes = sum(row['bytes'] for row in image_resources)
    assert image_bytes < STARTUP_IMAGE_BYTES_LIMIT, (image_bytes, STARTUP_IMAGE_BYTES_LIMIT)
    approved = [row for row in resources if row['path'] == 'assets/harborlight-v1-approved.png']
    assert len(approved) == 1, 'The reference PNG must not be loaded under both versioned and bare URLs'
    assert not errors and not writes and not external, {'errors': errors, 'writes': writes, 'external': external}
    depths = page.locator('[data-building-stage-scene]').evaluate('''scene=>Object.fromEntries(['leatherworks','quarry'].map(id=>[id,Number(getComputedStyle(scene.querySelector('[data-building-stage-map="'+id+'"]')).zIndex)]))''')
    assert depths['leatherworks'] > depths['quarry'], 'The Leatherworks must paint in front of the adjacent Quarry'
    if unavailable_future:
        assert unavailable not in requests and FUTURE_HOUSE not in requests
        assert not missing, 'An unused future variant must never be requested during startup'
    current_image_requests = [path for path in requests if path.endswith(('.png', '.webp', '.jpg', '.jpeg', '.svg'))]
    page.wait_for_timeout(1200)  # Cross one ordinary HUD/model refresh tick.
    assert [path for path in requests if path.endswith(('.png', '.webp', '.jpg', '.jpeg', '.svg'))] == current_image_requests, 'Unchanged levels must not request artwork again on a normal refresh'
    report = {'width': width, 'current_functional_frames': 20, 'additional_current_decoration_frames': len(expected-functional_expected), 'total_current_frames': len(expected), 'terrain': True, 'full_atlases_requested': 0,
              'unused_old_art_requested': 0, 'idle_world_crane_requested': False,
              'reference_image_requests': len(approved), 'startup_image_bytes': image_bytes,
              'startup_image_byte_limit': STARTUP_IMAGE_BYTES_LIMIT,
              'unavailable_future_is_not_requested': unavailable_future,
              'current_frame_404_hides_game_and_retry_recovers': fail_current_once,
              'leatherworks_paints_above_quarry': depths,
              'unchanged_refresh_additional_image_requests': 0,
              'errors': errors, 'account_or_cloud_writes': False}
    page.screenshot(path=str(OUTPUT / f'{width}-future{int(unavailable_future)}-retry{int(fail_current_once)}.png'))
    context.close()
    print('PASS performance startup:', json.dumps(report), flush=True)
    return report


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(StaticHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'
    report = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'),
                                         headless=True, args=['--no-sandbox'])
            try:
                report.append(run_case(browser, base, 1440, 900))
                report.append(run_case(browser, base, 390, 844))
                report.append(run_case(browser, base, 1440, 900, unavailable_future=True))
                report.append(run_case(browser, base, 1440, 900, fail_current_once=True))
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('PASS real-asset performance contract: only current frames, bounded download, no stale art, future independence and mandatory-frame retry.')


if __name__ == '__main__':
    run()
