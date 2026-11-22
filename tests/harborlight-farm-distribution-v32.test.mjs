import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../harborlight-v1-provisions.js';
import { createState, normalizeState, act, freeWorkers, tick } from '../harborlight-v1-state.js';

function farmState(workers, level=1, selection=null) {
  const state={worldTimeMs:0,resources:{},residents:[],education:{discoveries:{}},
    buildings:{farm:{level,workers},townhall:{level:Math.max(1,level)},house:{level:1}}};
  P.normalizeProvisions(state);
  if(selection!==null)state.provisions.assignments.farm={...selection};
  return state;
}
const counts=state=>Object.fromEntries(P.productionAssignments(state,'farm').map(row=>[row.recipeId,row.workers]));
const allocated=state=>Object.values(counts(state)).reduce((sum,count)=>sum+count,0);
const set=(state,recipeId,workers)=>P.provisionsAction(state,{type:'provisionsSetWorkers',building:'farm',recipeId,workers});

test('new farm crews split basic crops equally, with the odd worker on grain',()=>{
  for(const workers of [0,1,2,3,5,10,17,18]){
    const state=farmState(workers),actual=counts(state);
    assert.deepEqual(actual,{farmGrain:Math.ceil(workers/2),farmVegetables:Math.floor(workers/2)});
    assert.equal(allocated(state),workers);
    assert.equal(state.buildings.farm.workers,workers);
    assert.deepEqual(state.provisions.assignments,{});
  }
});

test('manual vegetable increases transfer existing farm workers without hiring',()=>{
  const state=farmState(10,1,{farmGrain:10,farmVegetables:0});
  assert.equal(set(state,'farmVegetables',1).ok,true);assert.deepEqual(counts(state),{farmGrain:9,farmVegetables:1});
  assert.equal(set(state,'farmVegetables',2).ok,true);assert.deepEqual(counts(state),{farmGrain:8,farmVegetables:2});
  assert.equal(set(state,'farmGrain',10).ok,true);assert.deepEqual(counts(state),{farmGrain:10,farmVegetables:0});
  assert.equal(state.buildings.farm.workers,10);assert.equal(allocated(state),10);
});

test('manual decreases transfer the released production slot to the other crop',()=>{
  const state=farmState(10);
  assert.equal(set(state,'farmGrain',4).ok,true);assert.deepEqual(counts(state),{farmGrain:4,farmVegetables:6});
  assert.equal(set(state,'farmVegetables',0).ok,true);assert.deepEqual(counts(state),{farmGrain:10,farmVegetables:0});
  assert.equal(state.buildings.farm.workers,10);
});

test('a manual split survives production reads, normalization and a save clone',()=>{
  const state=farmState(10,1,{farmGrain:10,farmVegetables:0});
  assert.equal(set(state,'farmVegetables',1).ok,true);
  for(let index=0;index<20;index++)assert.deepEqual(counts(state),{farmGrain:9,farmVegetables:1});
  const saved=JSON.parse(JSON.stringify(state));P.normalizeProvisions(saved,saved);
  assert.deepEqual(counts(saved),{farmGrain:9,farmVegetables:1});
  assert.deepEqual(saved.provisions.assignments.farm,state.provisions.assignments.farm);
});

test('new workers fill the smaller crop without resetting an existing manual split',()=>{
  const state=farmState(10,1,{farmGrain:9,farmVegetables:1});
  state.buildings.farm.workers=11;
  assert.deepEqual(counts(state),{farmGrain:9,farmVegetables:2});
  assert.deepEqual(state.provisions.assignments.farm,{farmGrain:9,farmVegetables:1});
  assert.equal(set(state,'farmVegetables',3).ok,true);
  assert.deepEqual(counts(state),{farmGrain:8,farmVegetables:3});
  state.buildings.farm.workers=10;
  assert.deepEqual(counts(state),{farmGrain:7,farmVegetables:3});
});

test('unlocked animal products retain manual assignments and share the same crew',()=>{
  const state=farmState(10,2,{farmGrain:4,farmVegetables:2,farmLivestock:3,farmMilk:1});
  assert.deepEqual(counts(state),{farmGrain:4,farmVegetables:2,farmLivestock:3,farmMilk:1});
  assert.equal(set(state,'farmVegetables',3).ok,true);
  assert.deepEqual(counts(state),{farmGrain:3,farmVegetables:3,farmLivestock:3,farmMilk:1});
  assert.equal(set(state,'farmMilk',2).ok,true);
  assert.deepEqual(counts(state),{farmGrain:3,farmVegetables:3,farmLivestock:2,farmMilk:2});
  assert.equal(allocated(state),10);
  assert.equal(state.buildings.farm.workers,10);
});

test('fresh higher-level farms fill the crops first and respect every product cap',()=>{
  const state=farmState(10,2);
  assert.deepEqual(counts(state),{farmGrain:5,farmVegetables:5,farmLivestock:0,farmMilk:0});
  state.buildings.farm.workers=60;
  const all=counts(state);
  assert.deepEqual(all,{farmGrain:24,farmVegetables:24,farmLivestock:6,farmMilk:6});
  assert.equal(allocated(state),60);
  assert.ok(Object.values(all).every(count=>count<=24));
});

test('locked farm directions and impossible redistribution fail without editing the selection',()=>{
  const state=farmState(18,1,{farmGrain:9,farmVegetables:9}),original=structuredClone(state.provisions.assignments);
  for(const [recipeId,workers]of [['farmLivestock',1],['farmCheese',1],['farmVegetables',19],['farmVegetables',13],['farmVegetables',.5],['farmVegetables',-1],['farmGrain',0]]){
    assert.equal(set(state,recipeId,workers).ok,false,`${recipeId}/${workers}`);
    assert.deepEqual(state.provisions.assignments,original);
    assert.equal(state.buildings.farm.workers,18);
  }
});

test('farm transfers preserve an upgraded legacy crew allowance and never clone workers',()=>{
  const state=farmState(24,1,{farmGrain:24,farmVegetables:0});
  state.provisions.legacyCrewAllowances={farm:{workers:24,recipes:{farmGrain:24,farmVegetables:0}}};
  assert.equal(set(state,'farmVegetables',1).ok,true);
  assert.deepEqual(counts(state),{farmGrain:23,farmVegetables:1});
  assert.equal(state.provisions.legacyCrewAllowances.farm.recipes.farmGrain,23);
  assert.equal(allocated(state),24);
  assert.equal(set(state,'farmGrain',24).ok,false);
});

test('other workplaces keep their existing explicit product allocation contract',()=>{
  const state=farmState(0);
  state.buildings.slaughterhouse={level:1,workers:4};
  assert.equal(P.provisionsAction(state,{type:'provisionsSetWorkers',building:'slaughterhouse',recipeId:'leather',workers:1}).ok,false);
  assert.deepEqual(P.productionAssignments(state,'slaughterhouse').map(row=>row.workers),[4,0]);
});

test('real world actions redistribute the same arriving residents and survive tick plus restore',()=>{
  const now=Date.parse('2026-11-22T12:00:00Z');
  const state=createState(now,{ruleset:32,onboarding:false});
  assert.equal(act(state,{type:'assign',building:'farm',delta:10},now).ok,true);
  assert.deepEqual(counts(state),{farmGrain:5,farmVegetables:5});
  assert.equal(act(state,{type:'provisionsSetWorkers',building:'farm',recipeId:'farmGrain',workers:10},now).ok,true);
  const people=structuredClone(state.residents),free=freeWorkers(state),population=state.population;
  assert.equal(act(state,{type:'provisionsSetWorkers',building:'farm',recipeId:'farmVegetables',workers:1},now).ok,true);
  assert.deepEqual(counts(state),{farmGrain:9,farmVegetables:1});
  assert.deepEqual(state.residents,people,'moving a production slot must not restart a resident journey or replace people');
  assert.equal(state.population,population);assert.equal(freeWorkers(state),free);assert.equal(state.buildings.farm.workers,10);
  tick(state,300);
  assert.deepEqual(counts(state),{farmGrain:9,farmVegetables:1});
  assert.ok(state.provisions.localStock.farm.grain>0);assert.ok(state.provisions.localStock.farm.vegetables>0);
  const restored=normalizeState(JSON.parse(JSON.stringify(state)),state.worldTimeMs);
  assert.deepEqual(counts(restored),{farmGrain:9,farmVegetables:1});
  assert.equal(restored.buildings.farm.workers,10);assert.equal(restored.population,state.population);
});

test('every basic-crop target across the first-level crew range preserves shared and individual limits',()=>{
  for(let crew=0;crew<=18;crew++)for(let target=0;target<=13;target++){
    const state=farmState(crew),before=structuredClone(state.provisions.assignments);
    const outcome=set(state,'farmVegetables',target);
    const feasible=target<=12&&target<=crew&&crew-target<=12;
    assert.equal(outcome.ok,feasible,`${crew} workers, ${target} vegetables`);
    if(feasible){const actual=counts(state);assert.equal(actual.farmVegetables,target);assert.equal(actual.farmGrain,crew-target);assert.equal(allocated(state),crew);}
    else assert.deepEqual(state.provisions.assignments,before);
    assert.equal(state.buildings.farm.workers,crew);
  }
});

test('higher-level and research-gated crews keep every feasible requested direction exact',()=>{
  for(const crew of [0,1,5,12,40,100,216])for(const recipeId of ['farmGrain','farmVegetables','farmLivestock','farmMilk','farmCheese'])for(const target of [0,1,12,72,73]){
    const state=farmState(crew,6);state.education.discoveries.cheese=true;
    const effectiveCrew=Math.min(crew,P.crewCapacity(state,'farm').total),before=structuredClone(state.provisions.assignments);
    const outcome=set(state,recipeId,target),feasible=target<=72&&target<=effectiveCrew&&effectiveCrew-target<=4*72;
    assert.equal(outcome.ok,feasible,`${crew} workers, ${recipeId}=${target}`);
    if(feasible){const actual=counts(state);assert.equal(actual[recipeId],target);assert.equal(allocated(state),effectiveCrew);assert.ok(Object.values(actual).every(n=>Number.isInteger(n)&&n>=0&&n<=72));}
    else assert.deepEqual(state.provisions.assignments,before);
  }
});
