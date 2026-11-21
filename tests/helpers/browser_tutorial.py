"""Isolated regression fixture for the temporarily hidden practical course.

The shipped game keeps this course disabled. Historical course regressions opt
into its preserved presentation module before bootstrap, then use the actual
Help controls and ordinary game actions. This fixture never changes a world,
saved progress, reward, public URL option or production configuration. Tests of
the current default experience must not install this fixture.
"""
import os
from pathlib import Path

from playwright.sync_api import expect
from helpers.browser_offers import dismiss_player_offers


def install_legacy_practical_course(page):
    """Serve the original module with only its presentation gate enabled.

    Page-level routing deliberately works with both loopback HTTP assets and
    the fake HTTPS origins used by the cloud-response fixtures. Reading the
    same packaged frontend root also preserves their exact imports and code.
    """
    if getattr(page, '_legacy_practical_course_fixture', False):
        return
    if page.url != 'about:blank':
        raise AssertionError('Install the legacy practical-course fixture before page bootstrap')
    root = Path(os.environ.get('HARBORLIGHT_FRONTEND_ROOT', Path(__file__).resolve().parents[2])).resolve()
    source = root / 'harborlight-v1-learning-policy.js'
    declaration = 'export const PRACTICAL_TUTORIAL_ENABLED = false;'

    def preserved_module(route):
        body = source.read_text(encoding='utf-8')
        if body.count(declaration) != 1:
            raise AssertionError('Expected one disabled practical-course presentation declaration')
        route.fulfill(status=200, content_type='text/javascript; charset=utf-8',
                      body=body.replace(declaration, 'export const PRACTICAL_TUTORIAL_ENABLED = true;', 1))

    page.route('**/harborlight-v1-learning-policy.js*', preserved_module)
    page._legacy_practical_course_fixture = True


def request_practical_guidance(page):
    panel = page.locator('[data-tutorial-panel]')
    if panel.is_visible():
        return
    dialog = page.locator('#island-dialog[open]')
    if dialog.count():
        dialog.locator('.dialog-close').click()
    # Course tests leave unrelated first-visit notices through their real UI.
    dismiss_player_offers(page)
    page.locator('[data-mobile-control="tutorial"]:visible,#hit-tutorial:visible').first.click()
    page.locator('[data-help-return-lessons]').click()
    expect(panel).to_be_visible()
