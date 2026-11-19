import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, resourceRates } from '../harborlight-v1-state.js';
import { Provisions as P } from '../harborlight-v1-development.js';

const NOW=Date.parse('2026-11-19T12:00:00Z');
function island(histories) {
  const state=createState(NOW,{ruleset:32,onboarding:false});
  const entries=Object.values(state.provisions.people);
  for(const [i,entry]of entries.entries()){
    entry.joinedAt=NOW-((i%3)+1)*3600000;
    if(i<histories.length)entry.history=structuredClone(histories[i]);
    else entry.history=[];
  }
  return state;
}
// The previous complete meal-rate calculation, retained as a differential
// oracle. These valid unstaffed islands have no production/input consumption.
function previousRates(state) {
  const rates=Object.fromEntries(P.MATERIAL_IDS.map(id=>[id,{production:0,consumption:0,net:0}]));
  const history=Object.values(state.provisions?.people||{}).flatMap(p=>p.history||[]);
  const windowHours=Math.max(1/3600,Math.min(24,(state.worldTimeMs-Math.min(state.worldTimeMs,...Object.values(state.provisions?.people||{}).map(p=>p.joinedAt)))/3600000));
  for(const good of P.FOOD_IDS)rates[good].consumption+=history.reduce((n,e)=>n+(e.resource===good?(e.satiety||0)/P.GOODS[good].satiety:0),0)/windowHours;
  for(const rate of Object.values(rates))rate.net=rate.production-rate.consumption;
  return rates;
}
function compare(state) {
  const before=structuredClone(state),historyRefs=Object.values(state.provisions.people).map(person=>person.history);
  const expected=previousRates(state),actual=resourceRates(state);
  assert.deepEqual(actual,expected,'every Number, including NaN and signed zero, retains its previous ordered result');
  assert.deepEqual(structuredClone(state),before,'a rates read does not change the world or any meal row');
  Object.values(state.provisions.people).forEach((person,i)=>assert.equal(person.history,historyRefs[i],'history identity is preserved'));
  return actual;
}

test('meal rates preserve sensitive per-food addition and division order across people and row permutations',()=>{
  const food=P.FOOD_IDS[0],unit=P.GOODS[food].satiety;
  const values=[unit*2**53,unit,-unit*2**53,unit*.1,unit*.2,Number.MIN_VALUE,0,-0];
  const outputs=[];
  for(let shift=0;shift<values.length;shift++){
    const rotated=[...values.slice(shift),...values.slice(0,shift)];
    const rows=rotated.flatMap((satiety,i)=>[
      {resource:food,satiety},
      {resource:P.FOOD_IDS[(i+1)%P.FOOD_IDS.length],satiety:i/7},
      {resource:'unknown-resource',satiety:Number.MAX_VALUE},
    ]);
    const state=island([rows.slice(0,7),rows.slice(7,19),rows.slice(19)]);
    outputs.push(compare(state)[food].consumption);
  }
  assert.ok(new Set(outputs).size>1,'the oracle is sensitive to arithmetic reassociation and row ordering');
});

test('many deterministic mixed histories match the old repeated reducers without flattening or mutating rows',()=>{
  let seed=73013;
  const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  const values=[0,-0,Number.MIN_VALUE,1e-300,.1,.2,1/3,1e-8,1e10,Number.MAX_SAFE_INTEGER,-1e-9,-1e10,Infinity,-Infinity,NaN];
  for(let sample=0;sample<12;sample++){
    const histories=Array.from({length:12},()=>Array.from({length:75},()=>({
      resource:next()%7===0?'unknown-resource':P.FOOD_IDS[next()%P.FOOD_IDS.length],
      satiety:values[next()%values.length],
    })));
    compare(island(histories));
  }
});

test('empty, sparse, nested and non-array histories retain the previous one-level flatMap domain',()=>{
  const sparse=[];
  sparse.length=8;
  sparse[2]={resource:P.FOOD_IDS[0],satiety:3};
  sparse[7]={resource:P.FOOD_IDS[1],satiety:4};
  const state=island([sparse,null,false,0,'',
    {resource:P.FOOD_IDS[2],satiety:5},
    [[{resource:P.FOOD_IDS[3],satiety:999}],{},false,0,'ignored',
      {resource:{},satiety:99}],
  ]);
  delete state.provisions.people[state.residents.at(-1).personUid].history;
  compare(state);
});

test('malformed explicit rows retain the old failure and leave model fields untouched',()=>{
  for(const malformed of [null,undefined,{resource:P.FOOD_IDS[0],satiety:1n}]){
    const state=island([[{resource:P.FOOD_IDS[0],satiety:2},malformed]]),before=structuredClone(state);
    assert.throws(()=>previousRates(state),TypeError);
    assert.throws(()=>resourceRates(state),TypeError);
    assert.deepEqual(structuredClone(state),before);
  }
  const state=island([]);state.provisions.people['absent-null-entry']=null;
  const before=structuredClone(state);
  assert.throws(()=>previousRates(state),TypeError);
  assert.throws(()=>resourceRates(state),TypeError);
  assert.deepEqual(structuredClone(state),before);
});

test('the original minimum and maximum history windows retain exact zero and nonzero rates',()=>{
  for(const age of [0,.0001,1000,86400000,86400000*10]){
    const state=island([[{resource:P.FOOD_IDS[0],satiety:.1},{resource:P.FOOD_IDS[0],satiety:.2}]]);
    for(const person of Object.values(state.provisions.people))person.joinedAt=NOW-age;
    compare(state);
  }
});
