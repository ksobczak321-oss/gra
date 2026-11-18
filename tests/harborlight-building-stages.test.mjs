import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDING_STAGE_IDS, buildingStageIndex, buildingStageLevel, activeBuildingConstruction,
  normalizeBuildingStageManifest, buildingStageFrame, buildingStagePlacement,
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
test('enabled loader waits for all22actual image decodes before publishing a ready result',async()=>{
  const pending=[];let settled=false;
  const result=readBuildingStageAssets({fetcher:async()=>({ok:true,json:async()=>buildingStageFixture()}),imageLoader:spec=>new Promise(resolve=>pending.push(()=>resolve({naturalWidth:spec.width,naturalHeight:spec.height})))}).then(value=>{settled=true;return value;});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(pending.length,22);
  pending.slice(0,21).forEach(resolve=>resolve());await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);
  pending[21]();const ready=await result;assert.equal(ready.images.size,22);
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
