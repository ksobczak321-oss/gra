"""Acceptance after feedback: real walking, every shore sector and chimney smoke.

Run after starting the static server. Requires Python Playwright and Chromium.
"""
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('HARBORLIGHT_BASE_URL', 'http://127.0.0.1:8002').rstrip('/')
CHROMIUM = os.environ.get('HARBORLIGHT_CHROMIUM', '/usr/bin/chromium')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROMIUM, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1672, 'height': 941})
    errors, failures = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failures.append((response.status, response.url)) if response.status >= 400 else None)
    assert page.goto(BASE + '/harborlight-v1-layered.html').status == 200
    page.wait_for_function("document.getElementById('island-ambient')?.dataset.ready==='true'")
    assert page.locator('#island-ambient').get_attribute('data-revision') == 'coast-life-2'
    report = page.evaluate("""async () => {
      const {drawWater,COASTAL_ZONES} = await import('./harborlight-v1-water.js');
      const {sampleLifePositions} = await import('./harborlight-v1-life.js');
      const {drawSmoke,smokeParticle,SMOKE_SOURCES} = await import('./harborlight-v1-smoke.js');
      const {createInhabitantsBackground,ORIGINAL_PEOPLE,ORIGINAL_ANIMALS} = await import('./harborlight-v1-inhabitants.js');
      const image = new Image(); image.src='./assets/harborlight-v1-approved.png'; await image.decode();
      const clean = new Image(); clean.src='./assets/harborlight-inhabitants-clean.png'; await clean.decode();
      const canvas = document.createElement('canvas');canvas.width=1672;canvas.height=941;
      const ctx = canvas.getContext('2d',{willReadFrequently:true});
      function sample(draw,t) {
        ctx.clearRect(0,0,1672,941);draw(t);return ctx.getImageData(0,0,1672,941).data;
      }
      function delta(a,b,roi) {
        const [x,y,w,h]=roi;let painted=0,changed=0;
        for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++){
          const i=(row*1672+col)*4;
          if(a[i+3]||b[i+3])painted++;
          if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])+Math.abs(a[i+3]-b[i+3])>12)changed++;
        }
        return {painted,changed};
      }
      const waterA=sample(t=>drawWater(ctx,image,t),1),waterB=sample(t=>drawWater(ctx,image,t),3.2);
      const shores=COASTAL_ZONES.map(zone=>({id:zone.id,...delta(waterA,waterB,zone.roi)}));
      const guards={HUD:[0,0,1672,76],nav:[0,76,114,530],cards:[1400,76,272,390],dock:[300,777,1023,164],
        house:[455,430,50,38],farm:[270,330,80,30],lighthouse:[1285,105,30,100]};
      const protectedAreas=Object.fromEntries(Object.entries(guards).map(([name,roi])=>[name,delta(waterA,waterB,roi).painted]));
      const positions=[1,3,8,10].map(sampleLifePositions);
      const distances=(a,b,key)=>a[key].map((value,i)=>Math.hypot(value.x-b[key][i].x,value.y-b[key][i].y));
      const people=distances(positions[0],positions[1],'residents');
      const animalSamples=Array.from({length:13},(_,t)=>sampleLifePositions(t));
      const animals=animalSamples[0].animals.map((animal,i)=>Math.max(...animalSamples.map(sample=>Math.hypot(animal.x-sample.animals[i].x,animal.y-sample.animals[i].y))));
      const smokeA=sample(t=>drawSmoke(ctx,t),1),smokeB=sample(t=>drawSmoke(ctx,t),3.2);
      const smoke=SMOKE_SOURCES.map(source=>({id:source.id,...delta(smokeA,smokeB,[source.x-15,Math.max(76,source.y-source.rise),68,Math.min(source.rise,source.y-76)]),
        early:smokeParticle(source,.12),late:smokeParticle(source,.85),end:smokeParticle(source,1)}));
      const background=createInhabitantsBackground(clean),pixels=background.getContext('2d').getImageData(0,0,1672,941).data;
      const coveredPeople=ORIGINAL_PEOPLE.filter(([x,y])=>pixels[((y-9)*1672+x)*4+3]>200).length;
      const coveredAnimals=ORIGINAL_ANIMALS.filter(([x,y])=>pixels[((y-7)*1672+x)*4+3]>200).length;
      const opaquePeople=ORIGINAL_PEOPLE.every(([x,y])=>[-16,-9,-2].every(dy=>[-3,0,3].every(dx=>pixels[((y+dy)*1672+x+dx)*4+3]>240)));
      return {shores,protectedAreas,people,animals,smoke,coveredPeople,coveredAnimals,opaquePeople};
    }""")
    for zone in report['shores']:
        assert zone['painted'] >= 30 and zone['changed'] >= 25, zone
        print('PASS shore:', zone['id'], zone['changed'], 'moving pixels')
    assert all(value == 0 for value in report['protectedAreas'].values()), report['protectedAreas']
    assert sum(value >= 10 for value in report['people']) >= len(report['people']) * .8, report['people']
    assert all(value >= 8 for value in report['animals']), report['animals']
    print('PASS real translation: residents >=10px in2sec; every animal travels >=8px over its grazing cycle')
    for source in report['smoke']:
        assert source['changed'] > 25, source
        assert source['late']['y'] < source['early']['y'] - 30, source
        assert source['late']['size'] > source['early']['size'] and source['end']['alpha'] == 0, source
    assert report['coveredPeople'] == 48 and report['coveredAnimals'] == 6, report
    assert report['opaquePeople'], 'Old figures need opaque coverage, not a translucent fade through their bodies'
    print('PASS six smoking chimneys: emission rises, expands and fades; frozen inhabitants have clean-background coverage')
    assert not errors, errors
    assert not failures, failures
    print('PASS no JavaScript/HTTP errors; water leaves UI, sampled houses, farmland and lighthouse untouched')
    browser.close()
