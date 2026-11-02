"""Fixture-only helpers for unrelated browser scenarios.

The v28 acceptance suite tests the real first daily reminder separately. Older
scenarios may start after that reminder has been acknowledged, or dismiss it
through its ordinary UI before checking the feature they are responsible for.
"""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def acknowledge_daily_offer(state):
    """Prepare a model fixture after today's reminder, without claiming it."""
    worlds = state.get('worlds')
    if isinstance(worlds, dict):
        for world in worlds.values():
            acknowledge_daily_offer(world)
    instant = state.get('worldTimeMs', state.get('lastSimulatedAt'))
    if isinstance(instant, (int, float)):
        day = datetime.fromtimestamp(instant / 1000, tz=timezone.utc).astimezone(ZoneInfo('Europe/Warsaw')).date().isoformat()
        state.setdefault('loyalty', {})['lastOfferDay'] = day
    return state


def dismiss_daily_offer(page):
    """Close a visible reminder using its real button; no reward is granted."""
    popup = page.locator('#daily-loyalty-offer')
    if popup.is_visible():
        popup.locator('[data-loyalty-close]').click()


def dismiss_player_offers(page):
    """Leave first-visit story/reward notices before an unrelated scenario."""
    story = page.locator('#lighthouse-story-intro')
    if story.is_visible():
        story.locator('[data-story-close]').click()
    dismiss_daily_offer(page)
