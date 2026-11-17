"""Standalone practice hub: all linked boards, real input, documents and isolation.

Use HARBORLIGHT_FRONTEND_ROOT for exact packaged bytes, or HARBORLIGHT_BASE_URL
for the native hosted PRE-PROD. No account, island fixture or session is used.
Every browser request except same-origin GET is rejected before it is sent.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
import json
import os
from pathlib import Path
import threading
from urllib.parse import urljoin, urlsplit
from zipfile import ZipFile
from xml.etree import ElementTree

from playwright.sync_api import expect, sync_playwright

SOURCE = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', SOURCE)).resolve()
OUTPUT = Path(os.environ.get('HARBORLIGHT_MINIGAMES_QA_OUTPUT', '/tmp/harborlight-minigames-standalone'))
OUTPUT.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get('HARBORLIGHT_BASE_URL', '').rstrip('/')
server = None
if not BASE:
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    BASE = f'http://127.0.0.1:{server.server_port}'
ORIGIN = urlsplit(BASE).netloc
report = {'base': BASE, 'native': bool(os.environ.get('HARBORLIGHT_BASE_URL')), 'boards': [], 'story_variants': [], 'documents': [], 'interactions': [], 'blocked': [], 'errors': [], 'failed_requests': []}


def link(slug, variant=1, level=1):
    return f'{BASE}/minigames/?game={slug}&variant={variant}&level={level}'


def safe_route(route):
    request = route.request
    url = urlsplit(request.url)
    if request.method != 'GET' or url.netloc != ORIGIN or url.path.startswith('/api/') or 'firestore.googleapis.com' in url.netloc or 'identitytoolkit' in url.netloc:
        report['blocked'].append({'method': request.method, 'url': request.url})
        route.abort()
    else:
        route.continue_()


def bounded(page, locator, name):
    box = locator.bounding_box()
    assert box, (name, 'missing box')
    assert box['x'] >= -1 and box['x'] + box['width'] <= page.viewport_size['width'] + 1, (name, box, page.viewport_size)
    overflow = page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
    assert not overflow, (name, 'horizontal document overflow')


def open_board(page, entry, variant=1, level=1):
    page.goto(link(entry['slug'], variant, level), wait_until='networkidle')
    expect(page.locator('#error')).to_be_hidden()
    expect(page.locator('#game-title')).to_have_text(entry['title'])
    board = page.locator('#board')
    expect(board).to_have_attribute('aria-busy', 'false')
    expect(board).to_have_attribute('data-game', entry['slug'])
    assert len(board.inner_text()) > 30, entry['slug']
    engine = entry['engine']
    if engine['type'] in ('puzzle', 'story'):
        expect(board.locator('[data-puzzle-title]')).to_be_visible()
        if engine['type'] == 'story':
            expect(board.locator('[data-puzzle-story]')).to_be_visible()
    elif engine['type'] == 'expedition':
        expect(board.locator('[data-minigame-kind]')).to_have_attribute('data-minigame-kind', engine['id'])
    else:
        expect(board.locator('[data-adventure-kind]')).to_have_attribute('data-adventure-kind', engine['id'])
    for ident, extension in [('word', 'docx'), ('txt', 'txt')]:
        assert page.locator('#' + ident).get_attribute('href') == f'./docs/{entry["slug"]}.{extension}'
    bounded(page, board, entry['slug'])
    assert page.evaluate('localStorage.length') == 0, entry['slug']
    assert page.evaluate('sessionStorage.length') == 0, entry['slug']


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce', service_workers='block')
        context.route('**/*', safe_route)
        page = context.new_page()
        page.set_default_timeout(15000)
        page.on('pageerror', lambda error: report['errors'].append(str(error)))
        page.on('response', lambda response: report['failed_requests'].append({'status': response.status, 'url': response.url}) if response.status >= 400 else None)
        page.goto(BASE + '/minigames/', wait_until='networkidle')
        expect(page.locator('#catalog')).to_be_visible()
        catalog = page.evaluate('async()=>{const r=await fetch("./catalog.json");return r.json()}')
        entries = catalog['entries']
        assert len(entries) == 55
        assert len({entry['slug'] for entry in entries}) == 55
        assert page.locator('[data-game-card]').count() == 55
        cards = {row['slug']: row for row in entries}
        for anchor in page.locator('[data-play-game]').all():
            slug = anchor.get_attribute('data-play-game')
            assert slug in cards
            assert anchor.get_attribute('href') == f'./?game={slug}&variant=1&level=1'
        assert page.locator('.card-variants a').count() == 100
        page.screenshot(path=str(OUTPUT / 'hub-1440.png'), full_page=False)
        for family, expected in [('puzzle', 24), ('story', 20), ('adventure', 9), ('expedition', 2)]:
            page.locator('[data-filter="' + family + '"]').click()
            assert page.locator('[data-game-card]:visible').count() == expected
        page.locator('[data-filter="all"]').click()
        page.locator('#search').fill('zzzzzz-no-such-game')
        expect(page.locator('#empty')).to_be_visible()
        page.locator('#search').fill('')
        assert page.locator('[data-game-card]:visible').count() == 55
        page.goto(BASE + '/minigames', wait_until='networkidle')
        expect(page.locator('#catalog')).to_be_visible()
        assert page.locator('[data-game-card]').count() == 55
        # Exercise every real deep link on desktop and phone. All engines are
        # loaded from the package/publication, with no injected model or state.
        for width, height in [(1440, 1000), (390, 844)]:
            page.set_viewport_size({'width': width, 'height': height})
            for entry in entries:
                open_board(page, entry)
                report['boards'].append({'slug': entry['slug'], 'width': width, 'passed': True})
            page.goto(BASE + '/minigames/', wait_until='networkidle')
            bounded(page, page.locator('#catalog'), 'hub')
            page.screenshot(path=str(OUTPUT / f'hub-{width}.png'), full_page=False)
        page.set_viewport_size({'width': 1440, 'height': 1000})
        for entry in [row for row in entries if row['engine']['type'] == 'story']:
            for variant in range(1, 6):
                open_board(page, entry, variant)
                expect(page.locator('#variant')).to_have_value(str(variant))
                expect(page.locator('#variant-links [aria-current="page"]')).to_have_text('Wariant ' + str(variant))
                report['story_variants'].append({'slug': entry['slug'], 'variant': variant, 'passed': True})
        # Real model-driven interaction: turn a memory card, pause/resume/reset.
        triples = next(entry for entry in entries if entry['engine'] == {'type': 'expedition', 'id': 'triples'})
        open_board(page, triples)
        card = page.locator('[data-memory-card]').first
        before = card.get_attribute('data-memory-state')
        card.click()
        assert card.get_attribute('data-memory-state') != before
        page.locator('#pause').click()
        expect(page.locator('#pause')).to_have_attribute('aria-pressed', 'true')
        assert page.locator('#board').evaluate('node=>node.inert') is True
        page.locator('#restart').click()
        expect(page.locator('#pause')).to_have_attribute('aria-pressed', 'false')
        assert page.locator('#board').evaluate('node=>node.inert') is False
        assert page.locator('[data-memory-card]').first.get_attribute('data-memory-state') == before
        report['interactions'].append('expedition-memory-reveal-pause-reset')
        # Group the rendered pictures, then make only normal UI reveals.
        groups = page.locator('[data-memory-card]').evaluate_all('nodes=>{const groups={};nodes.forEach(n=>{const face=n.querySelector("svg").innerHTML;(groups[face]??=[]).push(n.dataset.memoryCard)});return Object.values(groups)}')
        assert all(len(group) == 3 for group in groups)
        for group in groups:
            for index in group:
                page.locator('[data-memory-card="' + index + '"]').click()
        expect(page.locator('#expedition-controls')).to_contain_text('Runda 1 ukończona.')
        page.locator('#expedition-controls').get_by_role('button', name='Następna runda').click()
        expect(page.locator('[data-memory-card]')).to_have_count(30)
        report['interactions'].append('expedition-triples-solved-and-next-round')
        groups = page.locator('[data-memory-card]').evaluate_all('nodes=>{const groups={};nodes.forEach(n=>{const face=n.querySelector("svg").innerHTML;(groups[face]??=[]).push(n.dataset.memoryCard)});return Object.values(groups)}')
        for group in groups:
            for index in group:
                page.locator('[data-memory-card="' + index + '"]').click()
        expect(page.locator('#expedition-controls')).to_contain_text('Runda 2 ukończona.')
        page.locator('[data-practice-cashout]').click()
        expect(page.locator('[data-practice-settled]')).to_contain_text('Seria zakończona. Wypłata próbna: 150 monet.')
        report['interactions'].append('expedition-cashout-settles-only-practice-pot')
        # Actual puzzle interaction: collecting the gull distraction advances
        # the model/renderer rather than merely changing a heading.
        gull = next(entry for entry in entries if entry['engine'] == {'type': 'puzzle', 'id': 'gull'})
        open_board(page, gull)
        page.screenshot(path=str(OUTPUT / 'gull-before.png'), full_page=True)
        page.locator('[data-puzzle-target="0"]').click()
        page.locator('[data-puzzle-control="key"]').click()
        expect(page.locator('[data-room-success]')).to_be_visible()
        page.locator('[data-puzzle-next-room]').click()
        expect(page.locator('[data-adventure-stage]')).to_have_attribute('data-adventure-stage', 'complete')
        expect(page.locator('#board')).to_contain_text('postęp i nagrody na Twojej wyspie nie zmieniają się')
        report['interactions'].append('gull-solved-through-real-ui-and-finished')
        # A story shares the real puzzle renderer, then must advance to its
        # next room through the same action path used by the island.
        first_story = next(entry for entry in entries if entry['engine'] == {'type': 'story', 'id': 'first-light'})
        open_board(page, first_story)
        for move in [{'type': 'inspect', 'index': 0}, {'type': 'choose', 'index': 0}]:
            locator = page.locator('#board button')
            matching = locator.evaluate_all('(nodes,move)=>nodes.flatMap((n,i)=>JSON.stringify(n._puzzleRecord?.move)===JSON.stringify(move)?[i]:[])', move)
            assert matching, ('story move button', move)
            locator.nth(matching[0]).click()
        expect(page.locator('[data-room-success]')).to_be_visible()
        page.locator('[data-puzzle-next-room]').click()
        expect(page.locator('[data-room-index][data-current="true"]')).to_have_attribute('data-room-index', '1')
        report['interactions'].append('story-first-room-solved-and-next-room')
        classic = next(entry for entry in entries if entry['engine'] == {'type': 'adventure', 'id': 'letters'})
        open_board(page, classic)
        for letter, destination in [('stone-letter', 'quarry'), ('grain-letter', 'windmill'), ('light-letter', 'lighthouse')]:
            page.locator('[data-letter-read="' + letter + '"]').click()
            page.locator('[data-letter-destination="' + destination + '"]').click()
        expect(page.locator('[data-adventure-stage]')).to_have_attribute('data-adventure-stage', 'complete')
        report['interactions'].append('classic-letters-solved-through-real-ui')
        # Invalid input is contained in a readable error view; query numbers
        # are bounded before reaching a real model.
        page.goto(BASE + '/minigames/?game=missing-game', wait_until='networkidle')
        expect(page.locator('#error')).to_be_visible()
        open_board(page, triples, variant=999, level=999999)
        expect(page.locator('#level')).to_have_value('100')
        page.locator('#level').fill('8')
        page.locator('#settings').get_by_role('button', name='Otwórz wybraną próbę').click()
        expect(page.locator('#level')).to_have_value('8')
        expect(page.locator('[data-memory-card]')).to_have_count(66)
        assert 'level=8' in page.url
        report['interactions'].append('selected-difficulty-form-starts-real-66-card-model')
        # Every document link resolves to its own actual downloadable format.
        # APIRequestContext issues only these explicit same-origin GETs.
        for entry in entries:
            for extension in ('docx', 'txt'):
                url = f'{BASE}/minigames/docs/{entry["slug"]}.{extension}'
                response = context.request.get(url, timeout=30000)
                assert response.status == 200, (url, response.status)
                data = response.body()
                assert len(data) > 500, (url, len(data))
                if extension == 'docx':
                    with ZipFile(BytesIO(data)) as package:
                        content = ''.join(ElementTree.fromstring(package.read('word/document.xml')).itertext())
                else:
                    content = data.decode('utf-8-sig')
                assert entry['title'] in content, (entry['slug'], extension, 'wrong game document')
                report['documents'].append({'slug': entry['slug'], 'format': extension, 'bytes': len(data)})
        assert not context.cookies(), 'Practice page must not create account cookies'
        assert not report['blocked'], report['blocked']
        assert not report['errors'], report['errors']
        assert not report['failed_requests'], report['failed_requests']
        report['status'] = 'PASS'
        browser.close()
finally:
    if server:
        server.shutdown()
    (OUTPUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'boards': len(report['boards']), 'story_variants': len(report['story_variants']), 'documents': len(report['documents']), 'interactions': report['interactions'], 'native': report['native']}, ensure_ascii=False))
