"""Browser regression for the living-island graphics.

Run the static server first, then:
    python3 tests/harborlight-animation-smoke.py

Uses the real Canvas renderer and public game controls. HARBORLIGHT_BASE_URL and
HARBORLIGHT_CHROMIUM have the same meaning as in harborlight-browser-smoke.py.
"""

import os

from playwright.sync_api import expect, sync_playwright


BASE_URL = os.environ.get("HARBORLIGHT_BASE_URL", "http://127.0.0.1:8002").rstrip("/")
CHROMIUM = os.environ.get("HARBORLIGHT_CHROMIUM", "/usr/bin/chromium")
PAGE_PATH = "/harborlight-v1-layered.html"
GROUPS = {
    "windmill", "smoke", "gulls", "waterfalls", "waves", "people", "clouds",
    "construction", "animals",
}
REGIONS = {
    "windmill": [232, 197, 99, 111],
    "smoke": [480, 150, 84, 75],
    "clouds": [120, 78, 330, 99],
    "construction": [1084, 294, 45, 74],
    "waterfalls": [810, 520, 60, 130],
    "waves": [20, 650, 160, 110],
}


def frame(page, region=None):
    """Read pixels without altering the renderer or simulation state."""
    return page.locator("#island-ambient").evaluate(
        """(canvas, region) => {
          const sx=canvas.width/1672,sy=canvas.height/941;
          const [x,y,w,h] = region
            ? [Math.floor(region[0]*sx),Math.floor(region[1]*sy),Math.ceil(region[2]*sx),Math.ceil(region[3]*sy)]
            : [0,0,canvas.width,canvas.height];
          const data = canvas.getContext('2d').getImageData(x,y,w,h).data;
          let hash = 2166136261, painted = 0;
          for (let i=0; i<data.length; i++) {
            hash = Math.imul(hash ^ data[i],16777619);
            if (i%4===3 && data[i]>0) painted++;
          }
          return {hash:hash>>>0,painted,time:Number(canvas.dataset.time),
                  frames:Number(canvas.dataset.frames),mode:canvas.dataset.mode};
        }""",
        region,
    )


def visit(page):
    response = page.goto(BASE_URL + PAGE_PATH)
    assert response and response.status == 200
    page.wait_for_function(
        "document.querySelectorAll('.island-hotspot').length===51 && "
        "document.getElementById('loading').hidden && "
        "document.getElementById('island-ambient')?.dataset.ready==='true'"
    )
    canvas = page.locator("#island-ambient")
    groups = set(canvas.get_attribute("data-effect-groups").split())
    assert groups == GROUPS, groups
    assert canvas.evaluate("el=>[parseFloat(getComputedStyle(el).width),parseFloat(getComputedStyle(el).height)]") == [1672, 941]
    assert canvas.evaluate("el=>getComputedStyle(el).pointerEvents") == "none"
    return canvas


def independent_life_motion(page):
    results=page.evaluate("""async () => {
      const {drawLife}=await import(new URL('./harborlight-v1-life.js',location.href));
      const canvas=document.createElement('canvas');
      canvas.width=1672;canvas.height=941;
      const ctx=canvas.getContext('2d');
      function sample(t,channel) {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        const options={residents:false,animals:false,gulls:false};
        options[channel]=true;
        drawLife(ctx,t,options);
        const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let hash=2166136261,painted=0;
        for(let i=0;i<data.length;i++){
          hash=Math.imul(hash^data[i],16777619);
          if(i%4===3&&data[i]>0)painted++;
        }
        return {hash:hash>>>0,painted};
      }
      return Object.fromEntries(['residents','animals','gulls'].map(channel=>[channel,[sample(1,channel),sample(4,channel)]]));
    }""")
    for channel,(first,second) in results.items():
        assert first["painted"]>5, (channel,first)
        assert first["hash"]!=second["hash"], (channel,first,second)
    print("PASS walking residents, farm animals and flying gulls independently change real rendered pixels")


def frozen(page, mode):
    page.wait_for_function(
        "mode => document.getElementById('island-ambient').dataset.mode===mode",
        arg=mode,
    )
    first = frame(page)
    page.wait_for_timeout(650)
    second = frame(page)
    assert second["time"] == first["time"], (first, second)
    assert second["hash"] == first["hash"], (first, second)


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox"])
        context = browser.new_context(viewport={"width":1672,"height":941})
        page = context.new_page()
        errors, failures = [], []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("response", lambda response: failures.append((response.status,response.url)) if response.status>=400 else None)
        visit(page)
        page.wait_for_function("document.getElementById('island-ambient').dataset.mode==='running'")
        first = frame(page)
        assert first["painted"] > 100
        regions_before={name:frame(page,region) for name,region in REGIONS.items()}
        page.wait_for_timeout(1100)
        second = frame(page)
        assert second["hash"] != first["hash"], "Canvas remains static"
        assert second["time"] > first["time"]
        assert second["frames"] > first["frames"]
        for name,region in REGIONS.items():
            after=frame(page,region)
            before=regions_before[name]
            assert before["painted"]>0 or after["painted"]>0, (name,"region empty")
            assert before["hash"]!=after["hash"], (name,"region remains static")
        print("PASS nine effect groups mounted; real canvas pixels and animation time advance")
        print("PASS windmill, smoke, clouds, crane, waterfall and ocean regions visibly change")
        independent_life_motion(page)
        for name,region in {
            "top HUD":[0,0,1672,70], "navigation":[0,76,114,530],
            "objective cards":[1400,76,270,390], "build dock":[300,777,1023,164],
        }.items():
            assert frame(page,region)["painted"]==0, (name,"effects paint over fixed interface")
        print("PASS effects do not paint over HUD, navigation, objective cards or build dock")

        page.locator("#hit-pause").click()
        frozen(page,"paused")
        page.locator("#hit-play").click()
        page.wait_for_function("document.getElementById('island-ambient').dataset.mode==='running'")
        assert frame(page)["time"] >= second["time"]
        print("PASS simulation pause freezes actual animation pixels and resume restarts it")

        page.locator("#hit-settings").click()
        motion = page.locator("#island-dialog").get_by_role("checkbox", name="Animacje i podświetlenia")
        motion.uncheck()
        frozen(page,"reduced")
        motion.check()
        page.wait_for_function("document.getElementById('island-ambient').dataset.mode==='running'")
        page.locator(".dialog-close").click()
        print("PASS motion setting freezes and restores canvas without blocking controls")

        # Effects must never become pointer targets over existing controls.
        obstruction = page.locator(".island-hotspot").evaluate_all(
            """nodes=>nodes.filter(node=>{
              const b=node.getBoundingClientRect();
              const top=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
              return top!==node && !node.contains(top);
            }).map(node=>node.id)"""
        )
        assert not obstruction, obstruction
        print("PASS all 51 island controls remain unobstructed")

        for width,height in [(390,844),(844,390)]:
            page.set_viewport_size({"width":width,"height":height})
            page.get_by_role("button", name="Otwórz menu wyspy").click()
            expect(page.locator("#dialog-title")).to_have_text("HARBORLIGHT")
            bounds=page.locator("#island-dialog").bounding_box()
            assert bounds["x"]>=-1 and bounds["y"]>=-1
            assert bounds["x"]+bounds["width"]<=width+1
            assert bounds["y"]+bounds["height"]<=height+1
            page.locator(".dialog-close").click()
        print("PASS animated island and menu remain usable in mobile portrait and landscape")

        reduced_context=browser.new_context(viewport={"width":1672,"height":941},reduced_motion="reduce")
        reduced_page=reduced_context.new_page()
        reduced_page.on("pageerror", lambda error: errors.append(str(error)))
        visit(reduced_page)
        frozen(reduced_page,"reduced")
        reduced_page.locator("#hit-menu").click()
        expect(reduced_page.locator("#dialog-title")).to_have_text("HARBORLIGHT")
        print("PASS OS reduced-motion preference freezes animation while menus still work")
        reduced_context.close()
        assert not errors, errors
        assert not failures, failures
        print("PASS no JavaScript or HTTP failures")
        browser.close()


if __name__ == "__main__":
    run()
