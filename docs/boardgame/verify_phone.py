#!/usr/bin/env python3
"""Standalone browser checks; fixtures only, no game accounts or network."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parent
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for n in [2,6]:
  context=browser.new_context(viewport={'width':390,'height':844})
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  requests=[];page.on('request',lambda r:requests.append(r.url))
  origin='https://tabletop.harborlight.test/telefon.html'
  page.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html',body=(root/'telefon.html').read_text()) if route.request.url==origin else route.abort())
  page.goto(origin)
  page.locator('#app select').select_option(str(n))
  page.get_by_role('button',name='Zaczynamy przygodę').click()
  for r in range(8):
   sels=page.locator('#app select')
   for i in range(sels.count()//2):
    sels.nth(i*2).select_option('Ratusz');sels.nth(i*2+1).select_option('2')
   page.get_by_role('button',name='Zatwierdź ruchy').click()
   page.get_by_role('button',name='Wykonawcy: pokaż sekret').click()
   expect(page.get_by_text('Tylko wykonawcy',exact=True)).to_be_visible()
   page.get_by_role('button',name='Zasłoń sekret i rozpocznij 90 sekund').click()
   assert page.get_by_text('Tylko wykonawcy',exact=True).count()==0
   if r==0:
    page.get_by_role('button',name='Odkryj podpowiedź (zużywa 1 żeton)').click()
    expect(page.get_by_text('Podpowiedź:',exact=False)).to_be_visible()
    page.reload();expect(page.locator('#scene-timer')).to_be_visible()
   page.get_by_role('button',name='Zamknij odpowiedź i sprawdź').click()
   page.get_by_role('button',name='Wykonane — przyznaj sukces').click()
   if r==1:page.get_by_role('button',name='Dom',exact=True).click()
   elif r==3:page.get_by_role('button',name='Zapisujemy świadectwo').click()
   else:page.get_by_role('button',name='Finał' if r==7 else 'Następna runda',exact=True).click()
  expect(page.get_by_role('heading',name='Pełne światło',exact=True)).to_be_visible()
  assert page.locator('table tr').count()==n+1
  assert not errors,errors
  assert all(x==origin for x in requests),requests
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1')
  if n==2:page.screenshot(path='/tmp/harborlight-tabletop-phone.png',full_page=True)
  context.close();print(f'PASS: {n} players / 8 rounds, secret masking, score, reload/resume, mobile layout, offline-only.')
 browser.close()
