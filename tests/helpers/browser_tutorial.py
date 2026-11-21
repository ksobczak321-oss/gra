"""Isolated regression fixture for the temporarily hidden practical course.

The shipped game keeps this course disabled. Historical course regressions opt
into its preserved policy before generating a world and bootstrapping the
browser, then use the actual Help controls and ordinary game actions. This
fixture never edits an existing world, saved progress, reward, public URL option
or production configuration. Current default-experience tests must not use it.
"""
import os
from pathlib import Path

from playwright.sync_api import expect
from helpers.browser_offers import dismiss_player_offers


def legacy_practical_node_env():
    """Scope the retained course policy to one Node fixture subprocess.

    Its browser counterpart uses the same policy. Enabling before model import
    prevents a new default campaign from being created in an archival world;
    no existing campaign, progress, flag or reward is deleted or rewritten.
    Never install this environment globally or in default-experience checks.
    """
    environment = os.environ.copy()
    preload = Path(__file__).with_name('legacy-practical-course.mjs').resolve().as_uri()
    option = '--import=' + preload
    environment['NODE_OPTIONS'] = (environment.get('NODE_OPTIONS', '') + ' ' + option).strip()
    return environment


def install_legacy_practical_course(page):
    """Serve the original module with its course availability enabled.

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
            raise AssertionError('Expected one disabled practical-course availability declaration')
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
