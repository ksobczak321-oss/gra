"""Browser regression checks for the interactive HARBORLIGHT island.

Run a static server at the repository root, then:
    python3 tests/harborlight-browser-smoke.py
Optional environment: HARBORLIGHT_BASE_URL, HARBORLIGHT_CHROMIUM.
Requires Python Playwright and Chromium; never mutates application state directly.
"""

from collections import deque
import json
import os
from datetime import datetime, timedelta, timezone

from playwright.sync_api import expect, sync_playwright


BASE_URL = os.environ.get("HARBORLIGHT_BASE_URL", "http://127.0.0.1:8002").rstrip("/")
CHROMIUM = os.environ.get("HARBORLIGHT_CHROMIUM", "/usr/bin/chromium")
SAVE_KEY = "harborlight-v1-interactive-save"
PAGE_PATH = "/harborlight-v1-layered.html"

EXPEDITIONS = [
    {
        "id": "misty",
        "name": "Misty Isles",
        "map": ["S..T..", ".WWT..", ".W.TC.", ".W....", ".TTTW.", "...W.G"],
        "tools": (1, 1, 0),
        "reward": {"coins": 180, "wood": 50, "planks": 20},
    },
    {
        "id": "quarry",
        "name": "Forgotten Quarry",
        "map": ["S.R...", ".TRR..", "..R.C.", ".TT...", ".R.RT.", "C...G."],
        "tools": (0, 1, 1),
        "reward": {"coins": 220, "stone": 80, "wood": 25},
    },
    {
        "id": "ruins",
        "name": "Watchtower Ruins",
        "map": ["S.TW..", ".R.WC.", ".K.W..", ".R.D..", ".TT...", "....G."],
        "tools": (1, 1, 1),
        "reward": {"coins": 300, "planks": 40, "stone": 50},
    },
]


def solution(expedition):
    """Find a legal path collecting a chest; ruins also visits the key.

    This solves the displayed puzzle as a player would, without invoking app
    functions. Every returned step is exercised with a real browser click.
    """
    grid = expedition["map"]
    obstacles = {(r, c): i for i, (r, c) in enumerate(
        (r, c) for r, line in enumerate(grid) for c, tile in enumerate(line)
        if tile in "WTR"
    )}
    caches = {(r, c): i for i, (r, c) in enumerate(
        (r, c) for r, line in enumerate(grid) for c, tile in enumerate(line)
        if tile == "C"
    )}
    start = next((r, line.index("S")) for r, line in enumerate(grid) if "S" in line)
    initial = (*start, *expedition["tools"], False, 0, 0)
    queue = deque([(initial, [])])
    visited = {initial}
    while queue:
        current, route = queue.popleft()
        row, col, bridge, axe, dynamite, key, cleared, collected = current
        if grid[row][col] == "G" and collected and (expedition["id"] != "ruins" or key):
            return route, collected.bit_count()
        for dr, dc in [(1, 0), (0, 1), (-1, 0), (0, -1)]:
            r, c = row + dr, col + dc
            if not (0 <= r < len(grid) and 0 <= c < len(grid[r])):
                continue
            tile = grid[r][c]
            if tile == "D" and not key:
                continue
            tools = [bridge, axe, dynamite]
            new_cleared = cleared
            if tile in "WTR":
                bit = 1 << obstacles[r, c]
                if not cleared & bit:
                    tool = "WTR".index(tile)
                    if not tools[tool]:
                        continue
                    tools[tool] -= 1
                    new_cleared |= bit
            new_collected = collected | (1 << caches[r, c]) if tile == "C" else collected
            following = (r, c, *tools, key or tile == "K", new_cleared, new_collected)
            if following not in visited:
                visited.add(following)
                queue.append((following, route + [(r, c)]))
    raise AssertionError(f"No legal route for {expedition['id']}")


def saved(page):
    # Reading the public browser save is evidence, not a shortcut to game actions.
    raw = page.evaluate("key => localStorage.getItem(key)", SAVE_KEY)
    assert raw, "Expected the action to persist a browser save"
    return json.loads(raw)


def visit(page):
    response = page.goto(BASE_URL + PAGE_PATH)
    assert response and response.status == 200
    page.wait_for_function(
        "document.querySelectorAll('.island-hotspot').length >= 50 && "
        "document.getElementById('loading').hidden"
    )
    expect(page.locator(".slice canvas")).to_have_count(9)


def close_panel(page):
    page.locator(".dialog-close").click()
    expect(page.locator("#island-dialog")).not_to_be_visible()


def within_viewport(page):
    dialog = page.locator("#island-dialog")
    expect(dialog).to_be_visible()
    bounds = dialog.bounding_box()
    viewport = page.viewport_size
    assert bounds["x"] >= -1 and bounds["y"] >= -1, bounds
    assert bounds["x"] + bounds["width"] <= viewport["width"] + 1, bounds
    assert bounds["y"] + bounds["height"] <= viewport["height"] + 1, bounds
    sizes = dialog.evaluate("e => ({client:e.clientWidth, scroll:e.scrollWidth})")
    assert sizes["scroll"] <= sizes["client"] + 1, sizes


def gameplay_checks(browser, errors, failed):
    context = browser.new_context(viewport={"width": 1672, "height": 941}, reduced_motion="reduce")
    page = context.new_page()
    attach_observers(page, errors, failed)
    now = datetime(2026, 10, 22, 12, 0, 0, tzinfo=timezone.utc)
    page.clock.install(time=now - timedelta(seconds=5))
    page.clock.pause_at(now)
    visit(page)
    page.locator("#hit-pause").click()
    assert saved(page)["paused"] is True

    # The first townhall level does not allow a second-level house yet.
    before = saved(page)
    page.locator("#hit-dock-house").click()
    expect(page.get_by_role("button", name="Upgrade", exact=True)).to_be_disabled()
    expect(page.locator("#island-dialog")).to_contain_text("Town Hall")
    assert saved(page)["resources"] == before["resources"]
    close_panel(page)

    # Work and carrier timers, rather than a collect shortcut, unlock the first reward.
    page.locator("#hit-play").click()
    page.clock.run_for(420_000)
    page.locator("#hit-pause").click()
    produced = saved(page)
    assert produced["statistics"]["collected"] > 0
    assert produced["statistics"]["crafted"] > 0
    assert all(produced["buildings"][id]["ready"] >= 0 for id in ["farm", "lumber", "quarry", "windmill", "sawmill"])
    page.locator("#hit-world-farm").click()
    expect(page.locator('[data-collect]')).to_have_count(0)
    expect(page.locator('[data-local-buffer="farm"]')).to_be_visible()
    close_panel(page)

    # Earn the construction budget through real expedition play from the 100-each start.
    for expedition in EXPEDITIONS:
        page.locator("#hit-nav-expeditions").click()
        expedition_card = page.locator(".info-card").filter(
            has=page.get_by_role("heading", name=expedition["name"], exact=True)
        )
        before = saved(page)
        expedition_card.get_by_role("button", name="Depart", exact=True).click()
        expect(page.locator(".puzzle-cell")).to_have_count(36)
        # Distant squares are explicitly unavailable until reached legitimately.
        expect(page.locator('.puzzle-cell[data-row="5"][data-col="5"]')).to_be_disabled()
        route, caches = solution(expedition)
        for row, col in route:
            page.locator(f'.puzzle-cell[data-row="{row}"][data-col="{col}"]').click()
        after = saved(page)
        assert after["expeditions"][expedition["id"]]["completed"] is True
        for resource, amount in expedition["reward"].items():
            bonus = caches * 10 if resource == "coins" else 0
            assert after["resources"][resource] == before["resources"][resource] + amount + bonus
        page.get_by_role("button", name="Return to island", exact=True).click()
        print(f"PASS expedition: {expedition['id']} ({len(route)} moves, {caches} chests)")


    # Claim the earned starter reward before buying the townhall and house upgrades.
    page.locator("#hit-nav-tasks").click()
    before = saved(page)
    collect_task = page.locator(".info-card").filter(has=page.get_by_role("heading", name="First Harvest", exact=True))
    collect_task.get_by_role("button", name="Claim reward", exact=True).click()
    after = saved(page)
    assert after["tasks"]["collect"] is True
    assert after["resources"]["coins"] == before["resources"]["coins"] + 100
    assert after["resources"]["wood"] == before["resources"]["wood"] + 20
    expect(collect_task.get_by_role("button", name="Reward claimed", exact=True)).to_be_disabled()
    close_panel(page)

    # New expensive upgrades cannot start from local stock or the expedition budget.
    before = saved(page)
    page.locator('#hit-level').click()
    expect(page.locator('[data-upgrade-building="townhall"]')).to_be_disabled()
    expect(page.locator('#island-dialog')).to_contain_text('500')
    assert saved(page)['resources'] == before['resources']
    page.get_by_role('button', name='Construction and queue', exact=True).click()
    expect(page.locator('[data-construction-summary]')).to_contain_text('Construction: 0 / 1')
    close_panel(page)
    page.locator('#hit-resource-coins').click()
    page.get_by_role('button', name='Trade at the harbor', exact=True).click()
    expect(page.locator('#island-dialog')).to_contain_text('Town Hall level 4')
    close_panel(page)
    page.locator('#hit-objective-title').click()
    page.locator('#island-dialog').get_by_role('button', name='Lighthouse — construction and upgrades', exact=True).click()
    expect(page.locator('[data-upgrade-building="lighthouse"]')).to_be_disabled()
    expect(page.locator('#island-dialog')).to_contain_text('500')
    close_panel(page)

    before = saved(page)
    page.reload()
    page.wait_for_selector("#hit-nav-tasks")
    page.locator("#hit-settings").click()
    page.get_by_role("button", name="Save now", exact=True).click()
    after = saved(page)
    assert after["objective"] == before["objective"]
    assert after["expeditions"] == before["expeditions"]
    assert after["buildings"]["house"]["level"] == 1
    assert after["buildings"]["townhall"]["level"] == 1
    assert after["tasks"]["collect"] is True
    assert after["resources"] == before["resources"]
    close_panel(page)

    # An open local-stock panel updates on the six-minute worker cycle.
    page.locator("#hit-world-farm").click()
    before = saved(page)
    expect(page.locator('[data-collect]')).to_have_count(0)
    close_panel(page)
    page.locator("#hit-play").click()
    page.locator("#hit-world-farm").click()
    page.clock.run_for(360_000)
    expect(page.locator('[data-local-buffer="farm"]')).to_be_visible()
    close_panel(page)
    page.locator("#hit-pause").click()
    after = saved(page)
    assert after["statistics"]["collected"] > before["statistics"]["collected"]
    assert after["buildings"]["farm"]["workProgress"] != before["buildings"]["farm"]["workProgress"] or after["resources"] != before["resources"]
    print("PASS gameplay: real production/hauling, upgrade costs/locks, queue navigation, claim, port/lighthouse gates, persistence and live local-stock panel")
    context.close()


def navigation_checks(browser, errors, failed):
    routes = [
        "home", "settings", "resource-coins", "resource-wood", "resource-stone",
        "resource-food", "resource-planks", "resource-grain", "notifications", "level", "happiness", "population", "clock", "menu", "nav-expeditions",
        "nav-tasks", "nav-residents", "nav-map", "objective-title",
        "objective-wood", "objective-stone", "expedition-preview", "expedition-start",
        "category-buildings", "category-resources", "category-decorations", "category-paths",
        "dock-house", "dock-farm", "dock-sawmill", "dock-quarry", "dock-dock",
        "dock-warehouse", "dock-lighthouse",
    ]
    for width, height in [(1672, 941), (390, 844), (844, 390)]:
        context = browser.new_context(viewport={"width": width, "height": height})
        page = context.new_page()
        attach_observers(page, errors, failed)
        visit(page)
        blocked = page.evaluate("""Array.from(document.querySelectorAll('.island-hotspot')).map(button => {
          const box=button.getBoundingClientRect();
          const target=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
          return {id:button.id,hit:target?.closest('button')?.id};
        }).filter(item => item.id !== item.hit)""")
        assert not blocked, (width, height, blocked)
        for route in routes:
            page.locator("#hit-" + route).click()
            within_viewport(page)
            close_panel(page)
        if width == 390:
            menu = page.locator(".mobile-island-menu")
            expect(menu).to_be_visible()
            bounds = menu.bounding_box()
            assert bounds["height"] >= 44 and bounds["width"] >= 44, bounds
            menu.click()
            within_viewport(page)
            page.locator("#island-dialog").get_by_role("button", name="Buildings", exact=True).click()
            within_viewport(page)
            expect(page.locator("#dialog-title")).to_have_text("Buildings")
            close_panel(page)
        print(f"PASS navigation: {len(routes)} dialogs at {width}x{height}")
        context.close()


def attach_observers(page, errors, failed):
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("response", lambda response: failed.append((response.status, response.url)) if response.status >= 400 else None)
    page.on("requestfailed", lambda request: failed.append((request.failure, request.url)))


def main():
    errors, failed = [], []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=CHROMIUM, headless=True, args=["--no-sandbox"])
        try:
            gameplay_checks(browser, errors, failed)
            navigation_checks(browser, errors, failed)
        finally:
            browser.close()
    assert not errors, errors
    assert not failed, failed
    print("PASS: no browser JavaScript errors or failed HTTP requests")


if __name__ == "__main__":
    main()
