"""Browser regression checks for the interactive HARBORLIGHT island.

Run a static server at the repository root, then:
    python3 tests/harborlight-browser-smoke.py
Optional environment: HARBORLIGHT_BASE_URL, HARBORLIGHT_CHROMIUM.
Requires Python Playwright and Chromium; never mutates application state directly.
"""

from collections import deque
import json
import os

from playwright.sync_api import expect, sync_playwright


BASE_URL = os.environ.get("HARBORLIGHT_BASE_URL", "http://127.0.0.1:8002").rstrip("/")
CHROMIUM = os.environ.get("HARBORLIGHT_CHROMIUM", "/usr/bin/chromium")
SAVE_KEY = "harborlight-v1-interactive-save"
PAGE_PATH = "/harborlight-v1-layered.html"

EXPEDITIONS = [
    {
        "id": "misty",
        "name": "Mgliste Wyspy",
        "map": ["S..T..", ".WWT..", ".W.TC.", ".W....", ".TTTW.", "...W.G"],
        "tools": (1, 1, 0),
        "reward": {"coins": 180, "wood": 50, "planks": 20},
    },
    {
        "id": "quarry",
        "name": "Zapomniany kamieniołom",
        "map": ["S.R...", ".TRR..", "..R.C.", ".TT...", ".R.RT.", "C...G."],
        "tools": (0, 1, 1),
        "reward": {"coins": 220, "stone": 80, "wood": 25},
    },
    {
        "id": "ruins",
        "name": "Ruiny strażnicy",
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
    context = browser.new_context(viewport={"width": 1672, "height": 941})
    page = context.new_page()
    attach_observers(page, errors, failed)
    visit(page)
    page.locator("#hit-pause").click()
    assert saved(page)["paused"] is True

    # Production collection spends no currency and awards the actual ready batch.
    before = saved(page)
    page.locator("#hit-world-farm").click()
    page.locator('[data-collect="farm"]').click()
    after = saved(page)
    assert after["resources"]["food"] == before["resources"]["food"] + 12
    assert after["buildings"]["farm"]["ready"] == 0
    expect(page.locator('[data-collect="farm"]')).to_be_disabled()
    close_panel(page)

    # Earn the construction budget through real expedition play from the 100-each start.
    for expedition in EXPEDITIONS:
        page.locator("#hit-nav-expeditions").click()
        expedition_card = page.locator(".info-card").filter(
            has=page.get_by_role("heading", name=expedition["name"], exact=True)
        )
        before = saved(page)
        expedition_card.get_by_role("button", name="Wyrusz", exact=True).click()
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
        page.get_by_role("button", name="Wróć na wyspę", exact=True).click()
        print(f"PASS expedition: {expedition['id']} ({len(route)} moves, {caches} chests)")


    # A real placement click confirms the upgrade and charges the displayed cost.
    before = saved(page)
    page.locator("#hit-dock-house").click()
    page.get_by_role("button", name="Wybierz miejsce ulepszenia", exact=True).click()
    expect(page.locator("#placement-banner")).to_be_visible()
    page.locator("#hit-world-house").click()
    after = saved(page)
    assert after["buildings"]["house"]["level"] == 3
    assert after["capacity"] == 24
    assert after["population"] == 12
    for resource, amount in {"coins": 300, "wood": 120, "stone": 60, "planks": 30}.items():
        assert after["resources"][resource] == before["resources"][resource] - amount
    expect(page.locator("#hit-world-house .world-level")).to_have_text("Poz. 3")
    close_panel(page)

    page.locator("#hit-nav-tasks").click()
    before = saved(page)
    page.get_by_role("button", name="Odbierz nagrodę", exact=True).first.click()
    after = saved(page)
    assert after["tasks"]["collect"] is True
    assert after["resources"]["coins"] == before["resources"]["coins"] + 100
    assert after["resources"]["wood"] == before["resources"]["wood"] + 20
    expect(page.get_by_role("button", name="Nagroda odebrana", exact=True).first).to_be_disabled()
    close_panel(page)

    page.locator("#hit-resource-coins").click()
    page.get_by_role("button", name="Handluj w porcie", exact=True).click()
    before = saved(page)
    page.get_by_role("button", name="Sprzedaj 10 → 30 monet", exact=True).click()
    after = saved(page)
    assert after["resources"]["wood"] == before["resources"]["wood"] - 10
    assert after["resources"]["coins"] == before["resources"]["coins"] + 30
    close_panel(page)

    page.locator("#hit-objective-title").click()
    expect(page.get_by_role("button", name="Odbuduj latarnię", exact=True)).to_be_disabled()
    for _ in range(3):
        page.get_by_role("button", name="Dostarcz brakujące drewno", exact=True).click()
    for _ in range(2):
        page.get_by_role("button", name="Dostarcz brakujący kamień", exact=True).click()
    before = saved(page)
    page.get_by_role("button", name="Odbuduj latarnię", exact=True).click()
    after = saved(page)
    assert after["objective"]["repaired"] is True
    assert after["resources"]["coins"] == before["resources"]["coins"] - 300
    assert after["resources"]["planks"] == before["resources"]["planks"] - 30
    expect(page.get_by_role("button", name="Latarnia odbudowana", exact=True)).to_be_disabled()
    close_panel(page)

    before = saved(page)
    page.reload()
    page.wait_for_selector("#hit-nav-tasks")
    page.locator("#hit-settings").click()
    page.get_by_role("button", name="Zapisz teraz", exact=True).click()
    after = saved(page)
    assert after["objective"] == before["objective"]
    assert after["expeditions"] == before["expeditions"]
    assert after["buildings"]["house"]["level"] == 3
    assert after["tasks"]["collect"] is True
    assert after["resources"] == before["resources"]
    close_panel(page)

    # Live production must update an open panel, including the disabled action.
    page.locator("#hit-play").click()
    page.locator("#hit-world-farm").click()
    expect(page.locator('[data-ready="farm"]')).to_have_text("0")
    expect(page.locator('[data-collect="farm"]')).to_be_disabled()
    page.wait_for_function(
        "Number(document.querySelector('[data-ready=\"farm\"]').textContent) > 0",
        timeout=20000,
    )
    expect(page.locator('[data-collect="farm"]')).to_be_enabled()
    page.locator('[data-collect="farm"]').click()
    assert saved(page)["buildings"]["farm"]["ready"] == 0
    close_panel(page)
    print("PASS gameplay: collection, upgrade cost/placement, claim, trade, repair, persistence, live production")
    context.close()


def navigation_checks(browser, errors, failed):
    routes = [
        "home", "settings", "resource-coins", "resource-wood", "resource-stone",
        "resource-food", "resource-planks", "level", "happiness", "population", "clock", "menu", "nav-expeditions",
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
            page.locator("#island-dialog").get_by_role("button", name="Budynki", exact=True).click()
            within_viewport(page)
            expect(page.locator("#dialog-title")).to_have_text("Budynki")
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
