import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../harborlight-v1-state.js';
import { Provisions as P } from '../harborlight-v1-development.js';

const NOW=Date.parse('2026-11-19T12:00:00Z'),DAY=86400000;
function island() {
  const state=createState(NOW,{ruleset:32,onboarding:false});
  state.buildings.townhall.level=4;
  state.buildings.house.level=2;
  state.welcome={startedAt:0,until:0};
  P.normalizeProvisions(state,state);
  state.provisions.foodSettings.enabled=Object.fromEntries(P.FOOD_IDS.map(id=>[id,id==='meat'||id==='fish']));
  state.resources.meat=1000;
  state.resources.fish=1000;
  state.buildings.farm.workers=3;
  state.provisions.assignments.farm={farmGrain:1,farmVegetables:2};
  for(const [i,person] of state.residents.entries()){
    Object.assign(person,{happiness:60,newbornRemaining:0,arrivalRemaining:0,returnRemaining:0});
    if(i<3)person.workplace='farm';
    const entry=state.provisions.people[person.personUid];
    entry.dietGraceUntil=NOW-1;
    entry.history=[
      {resource:'grain',satiety:7,at:NOW-DAY-.25},
      {resource:'fish',satiety:12,from:NOW-DAY-30000,at:NOW-DAY+30000},
      {resource:'meat',satiety:80,from:NOW-3600000,at:NOW},
      {resource:'fish',satiety:20,from:NOW-3600000,at:NOW},
    ];
  }
  state.residents[1].arrivalRemaining=1.5;
  state.residents[2].returnRemaining=2.5;
  return state;
}
const wholeModel=state=>JSON.stringify(state);
function forcedTick(state,seconds,indexHistory) {
  return P.withProvisionsSettlementScope(state,()=>tick(state,seconds),{indexHistory});
}

test('ten ordinary one-second advances preserve every field of the indexed model across arrivals and feeding',()=>{
  const adaptive=island(),indexed=structuredClone(adaptive);
  const before=wholeModel(adaptive);
  for(let i=0;i<10;i++){
    tick(adaptive,1);
    forcedTick(indexed,1,true);
    assert.equal(wholeModel(adaptive),wholeModel(indexed),`complete state after second ${i+1}`);
  }
  assert.notEqual(wholeModel(adaptive),before);
  assert.equal(adaptive.residents[1].arrivalRemaining,0);
  assert.equal(adaptive.residents[2].returnRemaining,0);
  assert.ok(adaptive.resources.meat<1000||adaptive.resources.fish<1000,'the fixture actually consumes meals');
  assert.ok(adaptive.provisions.people[adaptive.residents[0].personUid].history.every(row=>row.resource!=='grain'),'expired rows are removed');
});

test('the 60-second boundary and its next representable interval retain exact legacy-path model fields',()=>{
  for(const seconds of [60,60+Number.EPSILON*60,61]){
    const adaptive=island(),legacy=structuredClone(adaptive),indexed=structuredClone(adaptive);
    tick(adaptive,seconds);
    forcedTick(legacy,seconds,false);
    forcedTick(indexed,seconds,true);
    assert.equal(wholeModel(adaptive),wholeModel(legacy),`legacy complete state at ${seconds}s`);
    assert.equal(wholeModel(adaptive),wholeModel(indexed),`indexed complete state at ${seconds}s`);
    const history=adaptive.provisions.people[adaptive.residents[0].personUid].history;
    assert.ok(history.every(row=>row.at>adaptive.worldTimeMs-DAY),'the partial meal reaches its real expiry');
  }
});

function dietIsland() {
  const state=island(),person=state.residents[0],entry=state.provisions.people[person.personUid];
  entry.history=[{resource:'meat',satiety:80,at:NOW},{resource:'fish',satiety:20,at:NOW}];
  return {state,person,entry};
}
function policySequence(state,person,entry,innerIndexHistory) {
  const before=P.dietPenalty(state,person,{now:NOW}),first=entry.history;
  const after=P.withProvisionsSettlementScope(state,()=>P.dietPenalty(state,person,{now:NOW+1}),{indexHistory:innerIndexHistory});
  const reused=entry.history===first;
  P.feedResidents(state,1,{now:NOW+1,hasHousing:()=>true});
  const status=P.dietStatus(state,person,{now:NOW+1001});
  return {before,after,reused,status};
}

test('a disabled outer advance keeps the ordered history path even when an inner phase requests indexing',()=>{
  const {state,person,entry}=dietIsland(),reference=structuredClone(state);
  const actual=P.withProvisionsSettlementScope(state,()=>policySequence(state,person,entry,true),{indexHistory:false});
  const expected=policySequence(reference,reference.residents[0],reference.provisions.people[person.personUid],false);
  assert.equal(actual.reused,false,'short advances retain the legacy filter allocation rather than constructing an index');
  assert.deepEqual(actual,expected);
  assert.equal(wholeModel(state),wholeModel(reference));
});

test('an indexed outer advance retains its index through a disabled inner phase and updates it after feeding',()=>{
  const {state,person,entry}=dietIsland(),reference=structuredClone(state);
  const actual=P.withProvisionsSettlementScope(state,()=>policySequence(state,person,entry,false));
  const expected=policySequence(reference,reference.residents[0],reference.provisions.people[person.personUid],false);
  assert.equal(actual.reused,true,'one long advance reuses its prepared history metadata across inner phases');
  assert.deepEqual({...actual,reused:false},expected);
  assert.equal(wholeModel(state),wholeModel(reference));
});

test('a throwing disabled advance releases its policy and the next default advance builds fresh metadata',()=>{
  const {state,person,entry}=dietIsland();
  assert.throws(()=>P.withProvisionsSettlementScope(state,()=>{
    P.dietPenalty(state,person,{now:NOW});
    throw new Error('interrupted short advance');
  },{indexHistory:false}),/interrupted short advance/);
  entry.history[1].satiety=0;
  P.withProvisionsSettlementScope(state,()=>{
    assert.equal(P.dietPenalty(state,person,{now:NOW+1}),10);
    const first=entry.history;
    assert.equal(P.dietPenalty(state,person,{now:NOW+2}),10);
    assert.equal(entry.history,first,'the previous disabled policy did not leak into the next advance');
  });
});
