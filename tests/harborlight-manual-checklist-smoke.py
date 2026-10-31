"""Isolated QA report round-trip; never connects to player accounts or GCP."""
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def run(directory):
    source = (ROOT / 'docs/testing/qa-checklist.html').read_text()
    expected_count = len(json.loads((ROOT / 'docs/testing/manual-test-cases.json').read_text())['cases'])
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium'), headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
        page = context.new_page()
        page.route('http://qa-checklist.test/**', lambda route: route.fulfill(content_type='text/html', body=source))
        page.goto('http://qa-checklist.test/checklist')
        assert page.locator('article').count() == expected_count
        assert f'NOT RUN: {expected_count}' in page.locator('#summary').inner_text()
        page.locator('#tester').fill('QA fixture')
        page.locator('#build').fill('dev-first')
        page.locator('#environment').fill('DEV isolated')
        first = page.locator('article').first
        first.locator('select').select_option('PASS')
        first.locator('textarea').fill('Fixture-only proof <script>window.evil=true</script>')
        page.locator('#build').fill('dev-second')
        assert 'dev-first' in first.locator('small').inner_text(), 'Preserve the build of each recorded result'
        assert page.evaluate('window.evil===undefined'), 'Report notes must remain inert text'
        page.reload()
        assert page.locator('article').first.locator('select').input_value() == 'PASS'
        assert page.locator('#build').input_value() == 'dev-second'
        page.locator('#filter').select_option('PASS')
        assert page.locator('article:visible').count() == 1
        with page.expect_download() as download:
            page.locator('#export').click()
        exported = directory / 'report.json'
        download.value.save_as(exported)
        report = json.loads(exported.read_text())
        assert report['results']['HL-TC-0001']['build'] == 'dev-first'
        assert report['results']['HL-TC-0001']['tester'] == 'QA fixture'
        assert report['build'] == 'dev-second'
        page.locator('#import').set_input_files(str(exported))
        page.wait_for_function("document.getElementById('notice').textContent.startsWith('Wczytano')")
        assert page.locator('article').first.locator('textarea').input_value().endswith('</script>')
        invalid = directory / 'invalid.json'
        invalid.write_text('{"schema_version":2,"results":{}}')
        page.locator('#import').set_input_files(str(invalid))
        page.wait_for_function("document.getElementById('notice').textContent.startsWith('Nieprawidłowy')")
        assert page.locator('article').first.locator('select').input_value() == 'PASS'
        page.locator('#filter').select_option('')
        page.set_viewport_size({'width': 360, 'height': 800})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'No mobile overflow'
        assert page.locator('article').count() == expected_count
        context.close()
        browser.close()
    print(f'PASS QA list: {expected_count} cards, per-result build, persistence, safe text, filter, '
          'JSON export/import, invalid import preservation and 360px layout. No game/cloud access.')


if __name__ == '__main__':
    with TemporaryDirectory(prefix='harborlight-qa-check-') as path:
        run(Path(path))
