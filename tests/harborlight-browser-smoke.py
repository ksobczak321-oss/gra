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
    },
    {
        "id": "quarry",
        "name": "Forgotten Quarry",
        "map": ["S.R...", ".TRR..", "..R.C.", ".TT...", ".R.RT.", "C...G."],
        "tools": (0, 1, 1),
    },
    {
        "id": "ruins",
        "name": "Watchtower Ruins",
        "map": ["S.TW..", ".R.WC.", ".K.W..", ".R.D..", ".TT...", "....G."],
        "tools": (1, 1, 1),
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
        if grid[row][col] == "G":
            if collected and cleared and (expedition["id"] != "ruins" or key):
                return route, collected.bit_count()
            # Entering the goal ends the attempt; it cannot be crossed on a detour.
            continue
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
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    raw = page.evaluate("key => localStorage.getItem(key)", SAVE_KEY)
    assert raw, "Expected the action to persist a browser save"
    return json.loads(raw)


def visit(page):
    response = page.goto(BASE_URL + PAGE_PATH)
    assert response and response.status == 200
    page.wait_for_function(
        "document.querySelectorAll('.world-hotspot').length === 12 && "
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
    # Isolate the ordinary starter economy from the separate one-time preview
    # grant, which frontend-v10-smoke checks with a completely fresh browser.
    fixture = {'version': 8, 'previewBuildStockVersion': 'frontend-v10',
               'lastSimulatedAt': int(now.timestamp() * 1000)}
    page.add_init_script('''if (!sessionStorage.getItem('starter-economy-fixture')) {
      localStorage.setItem(%s, %s); sessionStorage.setItem('starter-economy-fixture', '1');
    }''' % (json.dumps(SAVE_KEY), json.dumps(json.dumps(fixture))))
    visit(page)
    expect(page.locator("#hit-pause,#hit-play,#hit-speed")).to_have_count(0)
    initial = saved(page)
    assert initial["version"] == 8
    assert initial["paused"] is False and initial["speed"] == 1
    assert all(person["workplace"] is None for person in initial["residents"])

    # The first townhall level does not allow a second-level house yet.
    before = saved(page)
    page.locator("#hit-dock-house").click()
    expect(page.get_by_role("button", name="Upgrade", exact=True)).to_be_disabled()
    expect(page.locator("#island-dialog")).to_contain_text("Town Hall")
    assert saved(page)["resources"] == before["resources"]
    close_panel(page)

    # A new island starts with everyone at Home. Real assignments, five-minute
    # walks, production and full carrier trips deliver goods into central stock.
    for building, workers in [("farm", 2), ("lumber", 1), ("quarry", 1),
                              ("windmill", 1), ("sawmill", 1), ("warehouse", 2)]:
        page.locator("#hit-world-" + building).click()
        for _ in range(workers):
            page.locator(f'[data-worker-building="{building}"][data-worker-delta="1"]').click()
        close_panel(page)
    walking = saved(page)
    assert sum(person["arrivalRemaining"] > 0 for person in walking["residents"]) == 8
    assert walking["statistics"]["collected"] == 0
    page.clock.fast_forward(20 * 60_000)
    produced = saved(page)
    assert produced["statistics"]["collected"] > 0
    assert produced["statistics"]["crafted"] > 0
    assert all(produced["buildings"][id]["ready"] >= 0 for id in ["farm", "lumber", "quarry", "windmill", "sawmill"])
    page.locator("#hit-world-farm").click()
    expect(page.locator('[data-collect]')).to_have_count(0)
    expect(page.locator('[data-local-buffer="farm"]')).to_be_visible()
    close_panel(page)

    # Chests are narrative markers. Three actual puzzle routes exercise tools,
    # chest visits and the ruins key, earning only an unclaimed 50-coin pot.
    for expedition in EXPEDITIONS:
        page.locator("#hit-nav-expeditions").click()
        expedition_card = page.locator(".info-card").filter(
            has=page.get_by_role("heading", name=expedition["name"], exact=True)
        )
        before = saved(page)
        expedition_card.get_by_role("button", name="Start expedition", exact=True).click()
        expect(page.locator(".puzzle-cell")).to_have_count(36)
        # Distant squares are explicitly unavailable until reached legitimately.
        expect(page.locator('.puzzle-cell[data-row="5"][data-col="5"]')).to_be_disabled()
        route, caches = solution(expedition)
        for row, col in route:
            page.locator(f'.puzzle-cell[data-row="{row}"][data-col="{col}"]').click()
        after = saved(page)
        assert after["expeditionRuns"][expedition["id"]]["status"] == "decision"
        assert after["expeditionRuns"][expedition["id"]]["pot"] == 50
        assert after["resources"] == before["resources"]
        page.locator(f'[data-expedition-cashout="{expedition["id"]}"]').click()
        paid = saved(page)
        assert paid["expeditionRuns"][expedition["id"]]["status"] == "closed"
        assert paid["resources"]["coins"] == before["resources"]["coins"] + 50
        for resource in ["wood", "stone", "grain", "food", "planks"]:
            assert paid["resources"][resource] == before["resources"][resource]
        page.get_by_role("button", name="Return to island", exact=True).click()
        print(f"PASS expedition: {expedition['id']} ({len(route)} moves, {caches} chests)")


    # Lighthouse tasks replace the obsolete free starter reward. A real
    # contribution leaves central stock and persists; it cannot be withdrawn.
    page.locator("#hit-nav-tasks").click()
    before = saved(page)
    expect(page.locator("[data-task-accept]")).to_have_count(3)
    expect(page.get_by_role("button", name="Claim reward", exact=True)).to_have_count(0)
    task = before["lighthouseTasks"][0]
    page.locator(f'[data-task-accept="{task["id"]}"]').click()
    resource = next(iter(task["requirements"]))
    page.locator(f'[data-task-input="{task["id"]}-{resource}"]').fill("1")
    page.locator(f'[data-task-deposit="{task["id"]}-{resource}"]').click()
    after = saved(page)
    assert after["lighthouseTasks"][0]["deposited"][resource] == 1
    assert after["resources"][resource] == before["resources"][resource] - 1
    assert after["resources"]["coins"] == before["resources"]["coins"]
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
    page.locator('#hit-home').click()
    page.locator('#island-dialog').get_by_role('button', name='Main objective', exact=True).click()
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
    assert after["expeditionRuns"] == before["expeditionRuns"]
    assert after["lighthouseTasks"] == before["lighthouseTasks"]
    assert after["buildings"]["house"]["level"] == 1
    assert after["buildings"]["townhall"]["level"] == 1
    assert after["resources"] == before["resources"]
    close_panel(page)

    # An open local-stock panel updates on the six-minute worker cycle.
    page.locator("#hit-world-farm").click()
    before = saved(page)
    expect(page.locator('[data-collect]')).to_have_count(0)
    page.clock.fast_forward(360_000)
    expect(page.locator('[data-local-buffer="farm"]')).to_be_visible()
    close_panel(page)
    after = saved(page)
    assert after["statistics"]["collected"] > before["statistics"]["collected"]
    assert after["buildings"]["farm"]["workProgress"] != before["buildings"]["farm"]["workProgress"] or after["resources"] != before["resources"]
    print("PASS gameplay: real hiring/production/hauling, three coin-only expedition pots, irreversible task contribution, upgrade locks, queue, port/lighthouse gates, persistence and live local stock")
    context.close()


def navigation_checks(browser, errors, failed):
    routes = [
        "home", "settings", "resource-coins", "resource-wood", "resource-stone",
        "resource-food", "resource-planks", "resource-grain", "notifications", "level", "happiness", "population", "clock", "menu", "nav-expeditions",
        "nav-tasks", "nav-residents", "nav-map",
        "category-buildings", "category-resources", "category-decorations", "category-paths",
        "dock-house", "dock-farm", "dock-sawmill", "dock-quarry", "dock-dock",
        "dock-warehouse", "dock-lighthouse",
    ]
    for width, height in [(1672, 941), (390, 844), (844, 390)]:
        context = browser.new_context(viewport={"width": width, "height": height})
        page = context.new_page()
        attach_observers(page, errors, failed)
        visit(page)
        blocked = page.evaluate("""Array.from(document.querySelectorAll('.island-hotspot')).filter(button=>button.getClientRects().length).map(button => {
          const box=button.getBoundingClientRect();
          const target=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
          return {id:button.id,hit:target?.closest('button')?.id};
        }).filter(item => item.id !== item.hit)""")
        assert not blocked, (width, height, blocked)
        for route in routes:
            page.locator("#hit-" + route).click()
            if route in ['category-buildings', 'category-resources', 'category-decorations', 'category-paths']:
                expect(page.locator('#island-dialog')).not_to_be_visible()
                expect(page.locator('#hit-' + route)).to_have_attribute('aria-pressed', 'true')
                if route == 'category-resources':
                    expect(page.locator('[data-resource-dock]')).to_be_visible()
                    expect(page.locator('[data-dock-resource]')).to_have_count(5)
                if route == 'category-decorations':
                    expect(page.locator('[data-leisure-dock="decorations"]')).to_be_visible()
                    expect(page.locator('[data-attraction]')).to_have_count(5)
                if route == 'category-paths':
                    expect(page.locator('[data-leisure-dock="paths"]')).to_be_visible()
                    expect(page.locator('[data-road-level]')).to_have_count(5)
                page.locator('#hit-category-buildings').click()
                expect(page.locator('[data-resource-dock]')).not_to_be_visible()
                continue
            within_viewport(page)
            close_panel(page)
        # Native dialog keyboard behavior remains available in each viewport.
        page.locator('#hit-settings').focus()
        page.keyboard.press('Enter')
        within_viewport(page)
        expect(page.locator('.dialog-close')).to_be_focused()
        page.keyboard.press('Tab')
        assert page.evaluate("document.activeElement.closest('#island-dialog') !== null")
        page.keyboard.press('Escape')
        expect(page.locator('#island-dialog')).not_to_be_visible()
        expect(page.locator('#hit-settings')).to_be_focused()
        # The former static objective/expedition pixels are now live activities.
        expect(page.locator('.island-activity-stack .activity-task')).to_have_count(3)
        page.locator('.activity-task-button').first.click()
        within_viewport(page)
        expect(page.locator('#dialog-title')).to_have_text('Tasks')
        close_panel(page)
        if width < 900:
            page.locator('.mobile-activities').click()
            within_viewport(page)
            expect(page.locator('#dialog-title')).to_have_text('Tasks')
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
        print(f"PASS navigation: {len(routes)-4} dialogs and four dock tabs at {width}x{height}")
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
