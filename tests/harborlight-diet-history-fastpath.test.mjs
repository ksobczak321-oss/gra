import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../harborlight-v1-provisions.js';
import { createDietAccumulator } from '../harborlight-v1-diet-accumulator.js';

const NOW=Date.parse('2026-11-19T12:00:00Z'),DAY=86400000,EPS=1e-8;
function island(rows,{th=3,protectedUntil=0}={}) {
  const person={id:1,personUid:'history-test-person',workplace:null};
  const state={ruleset:32,worldTimeMs:NOW,residents:[person],
    buildings:{townhall:{level:th},house:{level:1}},
    resources:Object.fromEntries(P.MATERIAL_IDS.map(id=>[id,0])),education:{discoveries:{}}};
  P.normalizeProvisions(state);
  const entry=state.provisions.people[person.personUid];
  entry.dietGraceUntil=protectedUntil;
  entry.history=structuredClone(rows);
  return state;
}
const row=(resource,satiety,extra={})=>({resource,satiety,at:NOW,...extra});

function comparePenalty(rows,options={}) {
  const reference=island(rows,options),candidate=structuredClone(reference);
  const expected=P.dietStatus(reference,reference.residents[0],{now:NOW});
  const result=P.withProvisionsSettlementScope(candidate,()=>{
    const person=candidate.residents[0];
    const penalty=P.withProvisionsReadScope(candidate,()=>P.dietPenalty(candidate,person,{now:NOW}));
    const report=P.dietStatus(candidate,person,{now:NOW});
    assert.equal(penalty,expected.penalty);
    assert.deepEqual(report,expected,'public shares/total remain the original ordered floating-point aggregate');
    assert.equal(P.dietPenalty(candidate,person,{now:NOW}),expected.penalty);
    return report;
  });
  assert.deepEqual(candidate,reference,'all actual history rows and world fields remain exact');
  return result;
}

test('certified integer penalties agree with the ordered model at every variety requirement and threshold side',()=>{
  const cases=[[],[row('meat',100)],[row('meat',80),row('fish',20)],
    [row('meat',80+EPS),row('fish',20-EPS)],
    [row('meat',80+2*EPS),row('fish',20-2*EPS)],
    [row('grain',40),row('vegetables',30),row('fish',30)],
    [row('grain',25),row('vegetables',25),row('fish',25),row('meat',25)]];
  for(const th of [1,3,8])for(const rows of cases)comparePenalty(rows,{th});
});

test('uncertain IEEE comparisons fall back to the complete ordered model instead of guessing a type count',()=>{
  const uncertain=[row('grain',8e11),row('fish',2e11)];
  assert.equal(createDietAccumulator(uncertain).typeCount(EPS,.2),null);
  comparePenalty(uncertain);
  const epsilonBoundary=[row('grain',EPS)];
  assert.equal(createDietAccumulator(epsilonBoundary).typeCount(EPS,.2),null);
  comparePenalty(epsilonBoundary);
});

test('unsupported numeric domains and saturated resource prefixes preserve the original fallback arithmetic',()=>{
  for(const rows of [[row('grain',Number.MIN_VALUE)],
    [row('grain',Number.MAX_SAFE_INTEGER),row('grain',100),row('grain',100),row('fish',1e15)]]){
    assert.equal(createDietAccumulator(rows).typeCount(EPS,.2),null);
    comparePenalty(rows);
  }
});

test('unsupported resource and aliased-row histories use the original pruning and do not partially mutate',()=>{
  comparePenalty([row('wood',80),row('fish',20)]);
  const repeated=row('meat',12,{from:NOW-DAY-3600000,at:NOW-DAY+3600000});
  const result=comparePenalty([repeated,repeated,row('fish',3)]);
  assert.equal(result.shares.meat,12,'the one aliased partial row is clipped once and then counted twice');
});

test('protected diets still prune expired history before returning the zero penalty',()=>{
  const result=comparePenalty([row('meat',10,{at:NOW-DAY-1}),row('fish',3)],{protectedUntil:NOW+DAY});
  assert.equal(result.penalty,0);
  assert.deepEqual(result.shares,{fish:3});
});

test('partial-row pruning updates the certified accumulator with the exact old IEEE-scaled value',()=>{
  const rows=[row('meat',80),row('fish',20,{from:NOW-DAY,at:NOW-DAY+3600000})];
  const reference=island(rows),candidate=structuredClone(reference);
  function sequence(state){
    const person=state.residents[0],before=P.dietPenalty(state,person,{now:NOW});
    const after=P.dietPenalty(state,person,{now:NOW+1800000});
    return {before,after,status:P.dietStatus(state,person,{now:NOW+1800000})};
  }
  const expected=sequence(reference),actual=P.withProvisionsSettlementScope(candidate,()=>sequence(candidate));
  assert.deepEqual(actual,expected);assert.deepEqual(candidate,reference);
  assert.equal(actual.before,0);assert.equal(actual.after,10);assert.equal(actual.status.shares.fish,10);
});

test('indexed history writes, normalization and clock shifts retain complete sequential model fields',()=>{
  const rows=[row('meat',6,{from:NOW-3600000}),row('fish',2,{from:NOW-1800000})];
  const reference=island(rows),candidate=structuredClone(reference);
  function sequence(state){
    state.resources.meat=1000;state.resources.fish=1000;
    const results=[];
    for(const [at,seconds]of [[NOW,120],[NOW+120000,180],[NOW+300000,600]]){
      results.push(P.dietPenalty(state,state.residents[0],{now:at}));
      P.feedResidents(state,seconds,{now:at,hasHousing:()=>true});
      results.push(P.dietStatus(state,state.residents[0],{now:at}));
    }
    P.shiftProvisionsTime(state,123.125);
    results.push(P.dietPenalty(state,state.residents[0],{now:NOW+900000}));
    P.normalizeProvisions(state,structuredClone(state));
    results.push(P.dietStatus(state,state.residents[0],{now:NOW+900000}));
    return results;
  }
  const expected=sequence(reference),actual=P.withProvisionsSettlementScope(candidate,()=>sequence(candidate));
  assert.deepEqual(actual,expected);assert.deepEqual(candidate,reference);
});

test('the next public advance sees external in-place history edits after the previous index scope ends',()=>{
  const state=island([row('meat',80),row('fish',20)]),person=state.residents[0];
  assert.equal(P.withProvisionsSettlementScope(state,()=>P.dietPenalty(state,person,{now:NOW})),0);
  state.provisions.people[person.personUid].history[1].satiety=0;
  assert.equal(P.withProvisionsSettlementScope(state,()=>P.dietPenalty(state,person,{now:NOW})),10);
  assert.equal(P.dietStatus(state,person,{now:NOW}).penalty,10);
});
