"""Opt into the preserved practical course through actual user controls.

The Advisor is the default experience. A course regression must choose Help ->
lessons explicitly, including after reload, without changing world/fixture flags.
"""
from playwright.sync_api import expect


def request_practical_guidance(page):
    panel = page.locator('[data-tutorial-panel]')
    if panel.is_visible():
        return
    dialog = page.locator('#island-dialog[open]')
    if dialog.count():
        dialog.locator('.dialog-close').click()
    page.locator('[data-mobile-control="tutorial"]:visible,#hit-tutorial:visible').first.click()
    page.locator('[data-help-return-lessons]').click()
    expect(panel).to_be_visible()
