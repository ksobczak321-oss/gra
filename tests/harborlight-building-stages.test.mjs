import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUILDING_STAGE_IDS, buildingStageIndex, buildingStageLevel, activeBuildingConstruction,
  normalizeBuildingStageManifest, buildingStageFrame, buildingStagePlacement, buildingCranePlacement,
  buildingStageSmokeSources, readBuildingStageAssets, getBuildingStages } from '../harborlight-v1-building-stages.js';
import { sampleSmoke, SMOKE_SOURCES } from '../harborlight-v1-smoke.js';
import { buildingStageFixture } from './helpers/building-stage-fixture.mjs';
import { createState, normalizeState } from '../harborlight-v1-state.js';
const json = value => JSON.stringify(value);
const manifest = () => normalizeBuildingStageManifest(buildingStageFixture());

test('all20families map every pair1–20 to the same approved frame',()=>{
  const m=manifest();assert.equal(BUILDING_STAGE_IDS.length,20);
  for(const id of BUILDING_STAGE_IDS) for(let tier=0;tier<10;tier++) {
    const first=buildingStageFrame(m,id,tier*2+1),second=buildingStageFrame(m,id,tier*2+2);
    assert.equal(first.index,tier);assert.deepEqual(first.viewBox,second.viewBox);
    assert.equal(first.src,`assets/building-upgrades-v1/${id}.webp`);
  }
});
test('visual clamp preserves level0preview and reuses last frame through100 without changing levels',()=>{
  assert.equal(buildingStageIndex(0),0);assert.equal(buildingStageIndex(20),9);
  assert.equal(buildingStageIndex(21),9);assert.equal(buildingStageIndex(100),9);
  assert.equal(buildingStageIndex(NaN),0);assert.equal(buildingStageIndex(Infinity),0);
  const state={buildings:{townhall:{level:100},house:{level:0}}},before=json(state);
  assert.equal(buildingStageFrame(manifest(),'townhall',state.buildings.townhall.level).index,9);
  assert.equal(json(state),before);
});
test('decorative House follows the TownHall rather than its own family building',()=>{
  const state={buildings:{townhall:{level:3},house:{level:19}}};
  assert.equal(buildingStageIndex(buildingStageLevel(state,'house',true)),1);
  assert.equal(buildingStageIndex(buildingStageLevel(state,'house')),9);
});
test('real normalizer preserves Theatre actuallevel1 while TownHall19 selects its tenth appearance',()=>{
  const raw=createState(0,{ruleset:32,onboarding:false});raw.buildings.townhall.level=19;raw.buildings.theatre.level=19;
  const state=normalizeState(raw,0),before=json(state);
  assert.equal(state.buildings.theatre.level,1);
  assert.equal(buildingStageFrame(manifest(),'theatre',buildingStageLevel(state,'theatre')).index,9);
  assert.equal(json(state),before);assert.equal(state.buildings.theatre.level,1);
});
test('manifest normalization is immutable and leaves the caller unchanged',()=>{
  const raw=buildingStageFixture(),before=json(raw),m=normalizeBuildingStageManifest(raw);
  assert.equal(json(raw),before);assert.ok(Object.isFrozen(m.buildings.house.bboxes[0]));
  raw.buildings.house.bboxes[0][0]=999;assert.notEqual(m.buildings.house.bboxes[0][0],999);
});
test('enabledfalse is an explicit old-art fallback, without invented partial families',()=>{
  assert.deepEqual(normalizeBuildingStageManifest({version:1,enabled:false}),{version:1,enabled:false});
  assert.equal(buildingStageFrame({enabled:false},'house',3),null);
});
test('enabled manifests reject missing families, fewer than10frames and an alpha bbox outside its frame',()=>{
  let raw=buildingStageFixture();delete raw.buildings.warehouse;
  assert.throws(()=>normalizeBuildingStageManifest(raw),/warehouse/);
  raw=buildingStageFixture();raw.buildings.house.frameRects.pop();
  assert.throws(()=>normalizeBuildingStageManifest(raw),/dziesięciu klatek/);
  raw=buildingStageFixture();raw.buildings.house.bboxes[0]=[0,0,161,160];
  assert.throws(()=>normalizeBuildingStageManifest(raw),/poza obrazem/);
});
test('all20terrain masks and local manifest-owned image paths are required',()=>{
  let raw=buildingStageFixture();raw.terrain.patches=raw.terrain.patches.filter(p=>p.id!=='dock');
  assert.throws(()=>normalizeBuildingStageManifest(raw),/wszystkie20/);
  raw=buildingStageFixture();raw.buildings.house.src='https://example.invalid/house.webp';
  assert.throws(()=>normalizeBuildingStageManifest(raw),/lokalnego pakietu/);
});
test('map placement uses one family scale and aligns all stages to the same ground',()=>{
  const m=manifest();
  for(const id of BUILDING_STAGE_IDS) {
    const small=buildingStagePlacement(m,id,1),large=buildingStagePlacement(m,id,19);
    assert.equal(small.scale,large.scale);assert.ok(small.h<large.h);
    assert.ok(Math.abs(small.y+small.h-large.y-large.h)<1e-8);
    assert.ok(Math.abs(small.x+small.w/2-large.x-large.w/2)<1e-8);
  }
});
test('the38non-Lighthouse min/max crane placements preserve their pre-fix geometry',()=>{
  // Captured before the Lighthouse repair against the unchanged synthetic
  // layout, not calculated with the placement function under test.
  const before={
    townhall:[[578.656098,308.875122,36.214634,36.214634],[566.773171,231.805854,63.37561,63.37561]],
    house:[[523.353659,221.558537,34,34],[515.792683,161.263415,51.902439,51.902439]],
    farm:[[251.156098,339.875122,36.214634,36.214634],[239.273171,262.805854,63.37561,63.37561]],
    lumber:[[645.287805,153.369756,42.770732,42.770732],[631.253659,62.348293,74.84878,74.84878]],
    quarry:[[1108.321951,340.142439,58.692683,58.692683],[1090.419512,217,100,100]],
    windmill:[[260.519512,242.18439,36.526829,36.526829],[248.534146,164.450732,63.921951,63.921951]],
    sawmill:[[773.329268,173.936585,48.390244,48.390244],[757.45122,70.956098,84.682927,84.682927]],
    warehouse:[[602.565854,599.947317,35.278049,35.278049],[590.990244,524.87122,61.736585,61.736585]],
    bakery:[[689.060976,307.87561,34,34],[685.378049,260.590244,43.707317,43.707317]],
    dairy:[[479.580488,319.387805,34,34],[475.639024,271.235122,44.253659,44.253659]],
    slaughterhouse:[[333.495122,262.021951,34,34],[334.241463,235.9,34,34]],
    fisher:[[387.702439,559.638049,34.965854,34.965854],[376.229268,485.226341,61.190244,61.190244]],
    leatherworks:[[1227.178049,404.94878,34,34],[1221.943902,352.459512,46.985366,46.985366]],
    academy:[[472.541463,524.363415,34,34],[469.117073,477.945366,43.160976,43.160976]],
    barracks:[[462.656098,441.875122,36.214634,36.214634],[450.773171,364.805854,63.37561,63.37561]],
    chapel:[[1323.295122,187.021951,34,34],[1316.509756,129.32878,50.263415,50.263415]],
    theatre:[[674.287805,371.704878,34,34],[674.22439,336.561951,36.058537,36.058537]],
    market:[[771.307317,357.217073,34,34],[770.985366,321.206829,36.604878,36.604878]],
    dock:[[458.746341,661.802927,37.15122,37.15122],[446.556098,582.740488,65.014634,65.014634]]
  },m=manifest();
  assert.equal(Object.keys(before).length,19);
  for(const[id,expected]of Object.entries(before))for(const[index,level]of[1,19].entries()){
    const p=buildingCranePlacement(m,id,level);
    assert.deepEqual([p.left,p.top,p.width,p.height].map(v=>Math.round(v*1e6)/1e6),expected[index],`${id}/${level}`);
  }
});
test('actual Lighthouse crane stands beside its fixed ground anchor at both ends and level100',()=>{
  const m=normalizeBuildingStageManifest(JSON.parse(readFileSync(new URL('../assets/building-upgrades-v1/manifest.json',import.meta.url),'utf8'))),before=json(m);
  for(const level of[1,19,100]){
    const f=buildingStagePlacement(m,'lighthouse',level),p=buildingCranePlacement(m,'lighthouse',level);
    assert.ok(p.top>78,`Lighthouse${level} is under the78px HUD`);
    assert.ok(Math.abs(p.top+p.height*.95-m.buildings.lighthouse.groundAnchor[1])<1e-8);
    assert.ok(Math.abs(p.left+p.width*.5-f.x)<1e-8);
    assert.ok(p.left>=0&&p.left+p.width<1401,'Outside the world or behind the right mission panel');
  }
  assert.equal(json(m),before);
});
test('a queued pointer does not hide a real active project; waiting delivery never creates a crane',()=>{
  const queued={building:'house',stage:'queued',buildRemaining:90},active={building:'house',stage:'building',buildRemaining:8};
  const state={buildings:{house:{construction:queued}},constructionProjects:[queued,active]};
  const before=json(state);assert.equal(activeBuildingConstruction(state,'house'),active);assert.equal(json(state),before);
  for(const stage of ['planned','queued','transport']) assert.equal(activeBuildingConstruction({constructionProjects:[{...active,stage}]},'house'),null);
});
test('premium uses its actual model clock, completed/malformed projects do not retain a crane',()=>{
  const active={building:'dock',stage:'building',buildRemaining:10,premiumService:true};
  assert.equal(activeBuildingConstruction({premiumServices:[active]},'dock'),active);
  for(const buildRemaining of [0,-1,NaN,Infinity,undefined]) assert.equal(activeBuildingConstruction({premiumServices:[{...active,buildRemaining}]},'dock'),null);
  assert.equal(activeBuildingConstruction({premiumServices:[active]},'house'),null);
});
test('disabled asset loader requests no atlas, terrain or crane',async()=>{
  let images=0;
  const result=await readBuildingStageAssets({fetcher:async()=>({ok:true,json:async()=>({version:1,enabled:false})}),imageLoader:()=>{images++;}});
  assert.equal(images,0);assert.equal(result.manifest.enabled,false);assert.equal(result.images.size,0);
});
test('catalog fetch uses a release-specific URL and conditional revalidation instead of a fresh legacy HTTP cache entry',async()=>{
  let request;
  await readBuildingStageAssets({fetcher:async(url,options)=>{request={url,options};return {ok:true,json:async()=>({version:1,enabled:false})};}});
  assert.match(request.url,/^assets\/building-upgrades-v1\/manifest\.json\?v=frontend-v32-\d+$/);
  assert.equal(request.options.cache,'no-cache');
  assert.equal(request.options.credentials,'same-origin');
});
test('legacy loader bounds concurrent decodes and waits for all22required images',async()=>{
  const pending=[];let settled=false;
  const result=readBuildingStageAssets({fetcher:async()=>({ok:true,json:async()=>buildingStageFixture()}),imageLoader:spec=>new Promise(resolve=>pending.push(()=>resolve({naturalWidth:spec.width,naturalHeight:spec.height})))}).then(value=>{settled=true;return value;});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(pending.length,3);
  let cursor=0;
  for(let turn=0;turn<10&&cursor<21;turn++){
    while(cursor<pending.length&&cursor<21)pending[cursor++]();
    await new Promise(resolve=>setImmediate(resolve));
  }
  assert.equal(pending.length,22);assert.equal(settled,false);
  pending[21]();const ready=await result;assert.equal(ready.images.size,22);
});
function spriteFixture(){
  const raw=buildingStageFixture();
  for(const [id,family]of Object.entries(raw.buildings))family.sprites=family.frameRects.map((r,i)=>({src:`assets/building-upgrades-v1/frame-${id}-${String(i+1).padStart(2,'0')}.webp`,width:r[2],height:r[3]}));
  return raw;
}
test('current-world loader fetches only20families plus the distinct visible decorative tier, no future tiers or idle crane',async()=>{
  const raw=spriteFixture(),requested=[],state={ruleset:32,buildings:{townhall:{level:19},house:{level:7},farm:{level:4},theatre:{level:1}}},before=json(state);
  const ready=await readBuildingStageAssets({state,fetcher:async()=>({ok:true,json:async()=>raw}),imageLoader:async spec=>{
    requested.push(spec.src);assert.ok(!/\/house\.webp$/.test(spec.src),'The legacy atlas must never load');
    return {naturalWidth:spec.width,naturalHeight:spec.height};
  }});
  assert.equal(requested.length,22);assert.equal(ready.images.size,22);
  assert.ok(requested.includes(raw.buildings.townhall.sprites[9].src));
  assert.ok(requested.includes(raw.buildings.theatre.sprites[9].src));
  assert.ok(requested.includes(raw.buildings.house.sprites[3].src));
  assert.ok(requested.includes(raw.buildings.house.sprites[9].src),'The decorative House follows TownHall19, independently of House7');
  assert.ok(requested.includes(raw.buildings.farm.sprites[1].src));
  assert.ok(!requested.includes(raw.crane.src));assert.equal(json(state),before);
});
test('Leatherworks explicit paint depth prevents Quarry occlusion without moving or resizing either building',()=>{
  const raw=JSON.parse(readFileSync(new URL('../assets/building-upgrades-v1/manifest.json',import.meta.url),'utf8'));
  const m=normalizeBuildingStageManifest(raw),before=structuredClone(raw);delete before.buildings.leatherworks.paintDepth;
  const original=normalizeBuildingStageManifest(before);
  assert.ok(m.buildings.leatherworks.paintDepth>m.buildings.quarry.groundAnchor[1]);
  for(let level=1;level<=20;level++)assert.deepEqual(buildingStagePlacement(m,'leatherworks',level),buildingStagePlacement(original,'leatherworks',level));
  const bad=spriteFixture();bad.buildings.leatherworks.paintDepth=Infinity;
  assert.throws(()=>normalizeBuildingStageManifest(bad),/kolejność warstw/);
});
test('actual construction includes crane while optional gallery metadata decodes no images',async()=>{
  const raw=spriteFixture(),requested=[],options={fetcher:async()=>({ok:true,json:async()=>raw}),imageLoader:async spec=>{requested.push(spec.src);return {naturalWidth:spec.width,naturalHeight:spec.height};}};
  await readBuildingStageAssets({...options,state:{constructionProjects:[{building:'farm',stage:'building',buildRemaining:4}]}});
  assert.equal(requested.length,22);assert.ok(requested.includes(raw.crane.src));requested.length=0;
  const metadata=await readBuildingStageAssets({...options,preload:false});assert.equal(requested.length,0);assert.equal(metadata.images.size,0);
});
test('cropped sprites preserve alpha bounds, placement and smoke; malformed sizes/remote URLs reject',()=>{
  const raw=spriteFixture(),m=normalizeBuildingStageManifest(raw),legacy=manifest();
  for(const id of BUILDING_STAGE_IDS)for(let tier=0;tier<10;tier++){
    const f=buildingStageFrame(m,id,tier*2+1),a=buildingStagePlacement(m,id,tier*2+1),b=buildingStagePlacement(legacy,id,tier*2+1);
    assert.equal(f.src,raw.buildings[id].sprites[tier].src);assert.deepEqual(f.viewBox,f.bbox);
    for(const key of ['x','y','w','h','scale'])assert.equal(a[key],b[key]);
  }
  const bad=spriteFixture();bad.buildings.house.sprites[0].width++;
  assert.throws(()=>normalizeBuildingStageManifest(bad),/wymiary/);
  bad.buildings.house.sprites[0].src='https://invalid.example/image.webp';assert.throws(()=>normalizeBuildingStageManifest(bad),/lokalnego pakietu/);
});
test('a failed or wrongly-sized atlas rejects rather than accepting mixed old/new art',async()=>{
  const options={fetcher:async()=>({ok:true,json:async()=>buildingStageFixture()}),imageLoader:async spec=>({naturalWidth:spec.width,naturalHeight:spec.height})};
  await assert.rejects(readBuildingStageAssets({...options,imageLoader:async spec=>{if(spec.src.includes('house.webp'))throw Error('corrupt atlas');return options.imageLoader(spec);}}),/corrupt atlas/);
  await assert.rejects(readBuildingStageAssets({...options,imageLoader:async spec=>({naturalWidth:spec.width+1,naturalHeight:spec.height})}),/wymiary/);
  assert.equal(getBuildingStages(),null);
});
test('staged smoke has only declared moving frame-local chimneys; legacy keeps its original9emitters',()=>{
  const m=manifest(),state={ruleset:32,buildings:{house:{level:1}}},before=json(state);
  const sources=buildingStageSmokeSources(m,state);assert.deepEqual(sources.map(s=>s.id),['building-house']);
  assert.ok(sampleSmoke(5,sources).every(p=>p.emitter==='building-house'));
  assert.deepEqual(sampleSmoke(5,[]),[]);assert.equal(SMOKE_SOURCES.length,9);
  assert.equal(buildingStageSmokeSources(m,{ruleset:31}),null);assert.equal(json(state),before);
});
