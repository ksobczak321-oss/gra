"""Actual v28 Farm purchase and resumed construction guidance in PL/EN.

Fixtures are earned through successful prior course commands. After entering
Google REST is isolated; all purchases, map clicks, timers, pointers and saves
use the public game. No building/project completion or service proof is forged.
The separate starter-v26 suite covers the first five fresh v6 lessons.
"""
import importlib.util
import os
from pathlib import Path
import re
from playwright.sync_api import expect,sync_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('v28_course_browser_base',ROOT/'tests/harborlight-starter-course-v26-smoke.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
cloud=base.cloud


def open_map(page,lesson,building):
    controls=page.locator('[data-tutorial-visit="%s"]:visible,[data-tutorial-go="%s"]:visible'%(lesson,lesson))
    if controls.count():controls.first.click()
    base.find_building(page,lesson,building)


def farm_direct_purchase(browser,language,mobile):
    initial=base.model(15)
    assert initial['tutorial']['curriculum']==6
    assert initial['buildings']['farm']['level']==1
    assert not any(p['building']=='farm' for p in initial['constructionProjects'])
    context,page=base.enter(browser,initial,language=language,mobile=mobile)
    try:
        expect(page.locator('[data-tutorial-current]')).to_have_attribute('data-tutorial-current','construction-queue')
        open_map(page,'construction-queue','farm')
        buy=page.locator('[data-premium-buy="farm"]')
        expect(buy).to_have_class(re.compile('tutorial-action-target'));expect(buy).to_be_enabled()
        # Going straight to the package must not charge the ordinary order
        # first or dispatch a cash checkout below Town Hall3.
        before=base.saved(page)
        quoted=buy.inner_text()
        assert quoted and not before['commerce']['receipts']
        buy.click()
        bought=base.saved(page)
        project=bought['buildings']['farm']['premiumService']
        assert project['premiumService'] and project['stage']=='building' and project['buildRemaining']<=10
        assert bought['resources']['coins']<before['resources']['coins']
        assert bought['tutorial']['guided']['farm']['purchased']
        assert not bought['commerce']['receipts']
        page.clock.run_for(10000)
        finished=base.saved(page)
        assert finished['buildings']['farm']['level']==2
        assert not any(p['building']=='farm' for p in finished['constructionProjects'])
        base.reward(page,'construction-queue')
        page.reload();page.wait_for_function('document.body.dataset.cloudStatus !== undefined');page.clock.run_for(30000)
        current=base.saved(page)
        assert current['buildings']['farm']['level']==2
        assert current['tutorial']['guided']['farm']['purchased']
        assert current['tutorial']['claimed']['construction-queue']
        assert not current['tutorial']['completed'].get('path-upgrade')
        assert not current['commerce']['receipts']
        cloud.no_island_cache(page)
    except Exception:
        print('V28 browser diagnostics',language,mobile,cloud.ERRORS,flush=True)
        print(page.locator('body').inner_text()[-2500:],flush=True)
        raise
    finally:context.close()


def natural_delivery_and_resume(browser,language,mobile):
    initial=base.model(4)
    context,page=base.enter(browser,initial,language=language,mobile=mobile)
    try:
        supplies=page.locator('[data-tutorial-supplies]')
        if supplies.is_visible():supplies.click()
        open_map(page,'townhall-upgrade','townhall')
        page.locator('[data-upgrade-building="townhall"]').click()
        expect(page.locator('[data-starter-construction-guide]')).to_be_visible()
        page.locator('[data-start-acceleration-guide]').click()
        started=base.saved(page)
        project=next(p for p in started['constructionProjects'] if p['building']=='townhall')
        assert not project.get('starterTurbo') and project['stage']=='transport'
        assert not started['tutorial']['guided']['townhall']['transported']
        # Refresh while the real delivery is pending. The saved guide must
        # still explain transport, without paying or completing it on reload.
        page.reload();page.wait_for_function('document.body.dataset.cloudStatus !== undefined');page.clock.run_for(30000)
        expect(page.locator('[data-tutorial-current-substep="transport"]:visible').first).to_be_visible()
        open_map(page,'townhall-upgrade','townhall')
        expect(page.locator('[data-premium-route="construction"]')).to_have_class(re.compile('tutorial-action-target'))
        # Let three actual carriers walk and complete every ordinary delivery.
        # This checks recovery when the player waits instead of buying delivery.
        for _ in range(36):
            page.clock.fast_forward(5000)
            current=base.saved(page)
            project=next((p for p in current['constructionProjects'] if p['building']=='townhall'),None)
            if project and project['stage']=='building':break
        assert project and project['stage']=='building'
        assert current['buildings']['warehouse']['workers']==3
        assert not project.get('starterTurbo') and not project['instantTransport']
        assert not current['tutorial']['guided']['townhall']['transported']
        expect(page.locator('[data-premium-percent="100"]')).to_have_class(re.compile('tutorial-action-target'))
        expect(page.locator('[data-tutorial-current-substep="building"]:visible').first).to_be_visible()
        # Reload a second time at the changed phase. No dead transport button
        # may reclaim the arrow; the actual100% construction service is next.
        page.reload();page.wait_for_function('document.body.dataset.cloudStatus !== undefined');page.clock.run_for(1000)
        expect(page.locator('[data-tutorial-current-substep="building"]:visible').first).to_be_visible()
        open_map(page,'townhall-upgrade','townhall')
        accelerate=page.locator('[data-premium-percent="100"]')
        expect(accelerate).to_have_class(re.compile('tutorial-action-target'));expect(accelerate).to_be_enabled()
        accelerate.click()
        if page.locator('[data-construction-reduction]').is_visible():page.locator('[data-close-construction-reduction]').click()
        base.reward(page,'townhall-upgrade')
        completed=base.saved(page)
        assert completed['buildings']['townhall']['level']==2
        assert completed['tutorial']['guided']['townhall']['accelerated']
        assert not completed['tutorial']['guided']['townhall']['transported']
        assert completed['tutorial']['claimed']['townhall-upgrade']
        assert not completed['commerce']['receipts']
        cloud.no_island_cache(page)
    except Exception:
        print('V28 browser diagnostics',language,mobile,cloud.ERRORS,flush=True)
        print(page.locator('body').inner_text()[-2500:],flush=True)
        raise
    finally:context.close()


def run():
    with sync_playwright()as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
        try:
            for language in ['pl','en']:
                for mobile in [False,True]:
                    farm_direct_purchase(browser,language,mobile)
                    natural_delivery_and_resume(browser,language,mobile)
                    print('PASS v28 direct Farm + resumed real delivery: %s/%s'%(language,'mobile'if mobile else'desktop'),flush=True)
            assert not cloud.ERRORS,cloud.ERRORS
        finally:browser.close()
    print('PASS v28 course browser: direct coin Farm package, ordinary carrier delivery, transport/building reload pointers, actual100% acceleration; PL/EN desktop/mobile')

if __name__=='__main__':run()
