"""English interface and saved notification migration across the active island.

Tests render actual panels and accessible labels. Economy and schema stay intact;
fixtures provide unlocked buildings and previously saved Polish notifications.
"""
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

BASE=os.environ.get('HARBORLIGHT_BASE_URL','http://127.0.0.1:8002').rstrip('/')
KEY='harborlight-v1-interactive-save'
BUILDINGS=['house','farm','sawmill','quarry','dock','warehouse','lighthouse','lumber','windmill','townhall','chapel','market']
MATERIALS=['wood','stone','grain','food','planks']
POLISH=re.compile(r'[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]|\b(?:Ratusz|Mieszkańcy|Pracownicy|Podatki|Ulepsz|Buduj|Drewno|Zboże|Deski|Monety|Magazyn|Szczęście|Poziom|Zadania|Ekspedycje|Zapisz|Zamknij|Wybierz|Przynieś|Brakuje|Nieprawidłowe)\b')
errors=[];failures=[]

def language_check(page,where):
    content=page.evaluate('''() => {
      const roots=[document.querySelector('.island-topbar'),document.querySelector('.mobile-island-hud'),document.querySelector('#island-dialog'),document.querySelector('#island-toast')].filter(Boolean);
      const text=roots.filter(e=>e.getClientRects().length&&(!('open' in e)||e.open)).map(e=>e.innerText).join('\\n');
      const attributes=[...document.querySelectorAll('[aria-label],[title],[placeholder]')].map(e=>[e.getAttribute('aria-label'),e.getAttribute('title'),e.getAttribute('placeholder')].filter(Boolean).join(' ')).join('\\n');
      return text+'\\n'+attributes;
    }''')
    found=POLISH.search(content)
    assert not found,(where,found.group() if found else '',content)

def close(page):
    if page.locator('#island-dialog').evaluate('(e)=>e.open'):page.locator('.dialog-close').click()

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('HARBORLIGHT_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1672,'height':941},reduced_motion='reduce')
        page=context.new_page()
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('response',lambda r:failures.append((r.status,r.url)) if r.status>=400 else None)
        page.on('requestfailed',lambda r:failures.append((r.failure,r.url)))
        buildings={id:{'level':4 if id in ['townhall','warehouse','house'] else 1,'workers':0,'ready':0,'workProgress':[]} for id in BUILDINGS}
        buildings['farm']['workers']=1
        data={'version':6,'paused':True,'population':23,'happiness':0,'baseHappiness':0,'buildings':buildings,
              'resources':{'coins':3000,**dict.fromkeys(MATERIALS,2000)},
              'notifications':[{'id':41,'kind':'storage-full','title':'Farma: magazyn jest pełny','message':'Pełny zapas: zboże. Produkcja czeka na transport.','at':10,'read':True},
                               {'id':42,'kind':'construction-start','title':'Ratusz: poziom 2','message':'materiały zarezerwowane, oczekiwanie na transport','at':12,'read':False}],
              'notificationSequence':42}
        page.add_init_script('''if(!sessionStorage.getItem('language-fixture')){localStorage.setItem(%s,%s);sessionStorage.setItem('language-fixture','1')}'''%(json.dumps(KEY),json.dumps(json.dumps(data))))
        assert page.goto(BASE+'/harborlight-v1-layered.html').status==200
        page.wait_for_function('document.getElementById("loading").hidden && document.querySelectorAll(".island-hotspot").length>=56')
        assert page.locator('html').get_attribute('lang')=='en'
        assert page.title()=='HARBORLIGHT — Your Island'
        language_check(page,'island HUD')
        for id in BUILDINGS:
            close(page);page.locator('#hit-world-'+id).click();language_check(page,id)
            if id=='townhall':
                expect(page.locator('#dialog-title')).to_have_text('Town Hall')
                expect(page.locator('[data-population-stat="population"]')).to_have_text('23 / 96')
                expect(page.locator('[data-population-stat="taxes"]')).to_have_text('1 coin/h')
        for id in ['home','settings','resource-coins','resource-wood','resource-stone','resource-grain','resource-food','resource-planks','population','happiness','clock','menu','nav-tasks','nav-expeditions','nav-map','category-decorations','category-paths','objective-title','boat','notifications']:
            close(page);page.locator('#hit-'+id).click();language_check(page,id)
        expect(page.locator('#dialog-title')).to_have_text('Notifications')
        migrated=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',KEY)
        assert migrated['version']==7
        assert migrated['resources']==data['resources']
        assert [n['id'] for n in migrated['notifications']]==[41,42]
        assert [n['read'] for n in migrated['notifications']]==[True,False]
        for entry in migrated['notifications']:
            assert not POLISH.search(entry['title']+' '+entry['message']),entry
        page.reload();page.wait_for_selector('[data-hud="level"]');language_check(page,'reload')
        close(page);page.locator('#hit-nav-expeditions').click()
        expedition=page.locator('.info-card').filter(has=page.get_by_role('heading',name='Misty Isles',exact=True))
        expedition.locator('button').click();language_check(page,'expedition puzzle')
        close(page);page.locator('#hit-settings').click()
        page.locator('#island-dialog button.action.danger').click();language_check(page,'reset confirmation')
        for width,height in [(390,844),(844,390)]:
            close(page);page.set_viewport_size({'width':width,'height':height})
            page.locator('.mobile-island-menu').click();language_check(page,f'mobile {width}x{height}')
            expect(page.locator('[data-mobile-hud="level"]')).to_have_text('4')
            bounds=page.locator('#island-dialog').bounding_box()
            assert bounds['x']>=0 and bounds['x']+bounds['width']<=width+1,bounds
        context.close();browser.close()
    assert not errors,errors
    assert not failures,failures
    print('PASS English HUD, all buildings, all main panels, puzzle/reset, accessibility labels, two mobile orientations and preserved English notification history')

if __name__=='__main__':run()
