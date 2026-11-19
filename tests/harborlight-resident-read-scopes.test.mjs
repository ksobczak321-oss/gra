import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../harborlight-v1-provisions.js';
import * as D from '../harborlight-v1-development-logistics.js';
import * as Development from '../harborlight-v1-development.js';
import { createState } from '../harborlight-v1-state.js';
import { synchronizeResidents, advanceResidents } from '../harborlight-v1-residents.js';

const NOW = Date.parse('2026-11-19T12:00:00Z');
const DAY = 86400 * 1000;
function island() {
  const ids = ['townhall', 'house', 'farm', 'windmill', 'quarry', 'lumber', 'sawmill', ...Object.keys(P.NEW_BUILDINGS)];
  const state = {
    ruleset: 32, worldTimeMs: NOW, population: 97,
    buildings: Object.fromEntries([...new Set(ids)].map(id => [id, { level: id === 'townhall' ? 4 : 3, workers: 0 }])),
    residents: Array.from({ length: 97 }, (_, i) => ({ id: i + 1, personUid: `scope-person-${i + 1}`, workplace: null, arrivalRemaining: 0, returnRemaining: 0 })),
    resources: Object.fromEntries(P.MATERIAL_IDS.map(id => [id, 0])), education: { discoveries: {} },
  };
  P.normalizeProvisions(state);
  D.normalizeDevelopmentLogistics(state);
  for (const [building, from, count] of [['farm', 0, 30], ['bakery', 30, 20], ['windmill', 50, 15], ['quarry', 65, 10]]) {
    for (const person of state.residents.slice(from, from + count)) person.workplace = building;
    state.buildings[building].workers = count;
  }
  state.provisions.assignments.farm = { farmGrain: 20, farmVegetables: 10 };
  state.provisions.assignments.bakery = { bread: 10, cake: 10 };
  state.provisions.localStock.farm.grain = 600;
  state.provisions.localStock.bakery.flour = 3;
  state.provisions.localStock.windmill.grain = 8;
  state.residents[3].arrivalRemaining = 20;
  state.residents[5].pendingRelease = true;
  state.residents[7].visitGroup = 1;
  state.residents[9].returnRemaining = 20;
  state.provisions.legacyCrewAllowances = { farm: { workers: 50, recipes: { farmGrain: 40, farmVegetables: 30 } } };
  for (const entry of Object.values(state.provisions.people)) {
    entry.dietGraceUntil = NOW - 1;
    entry.history = [
      { resource: 'meat', satiety: 12, from: NOW - DAY - 3600000, at: NOW - DAY + 3600000 },
      { resource: 'vegetables', satiety: 3, from: NOW - 3600000, at: NOW },
      { resource: 'fish', satiety: 1, at: NOW - DAY - 1 },
    ];
  }
  return state;
}

function productionQuote(state) {
  return state.residents.map(person => D.developmentWorkerProductionBlocked(state, person));
}

test('a scoped production quote preserves per-person assignment order and all legacy allowance mutations', () => {
  const reference = island(), scoped = structuredClone(reference);
  const expected = [productionQuote(reference), productionQuote(reference)];
  const actual = D.withDevelopmentProductionReadScope(scoped, () => [productionQuote(scoped), productionQuote(scoped)]);
  assert.deepEqual(actual, expected);
  assert.deepEqual(scoped, reference);
  assert.equal(actual[0][0], true, 'full grain output blocks its assigned workers');
  assert.equal(actual[0][24], false, 'the vegetable direction can still work');
  assert.equal(actual[0][30], true, 'insufficient local flour blocks the baker');
});

test('new quote phases see changed local goods, allocation order and arriving workers', () => {
  const reference = island(), scoped = structuredClone(reference);
  const quote = () => {
    const expected = productionQuote(reference);
    const actual = D.withDevelopmentProductionReadScope(scoped, () => productionQuote(scoped));
    assert.deepEqual(actual, expected);
    assert.deepEqual(scoped, reference);
    return actual;
  };
  const before = quote();
  for (const state of [reference, scoped]) {
    state.provisions.localStock.farm.grain = 1;
    state.provisions.localStock.bakery.flour = 100;
    state.provisions.localStock.bakery.rawMilk = 100;
    state.provisions.assignments.farm = { farmGrain: 5, farmVegetables: 25 };
    state.residents[3].arrivalRemaining = 0;
    state.residents.unshift(state.residents.pop());
  }
  const after = quote();
  assert.notDeepEqual(after, before);
  assert.equal(after[31], false, 'new ingredients unblock the baker');
});

test('scoped diet reads retain the exact rolling-history pruning and fractions', () => {
  const reference = island(), scoped = structuredClone(reference);
  function quote(state) {
    return state.residents.map(person => [P.dietStatus(state, person), P.dietPenalty(state, person), P.dietStatus(state, person)]);
  }
  const expected = quote(reference);
  const actual = P.withProvisionsReadScope(scoped, () => quote(scoped));
  assert.deepEqual(actual, expected);
  assert.deepEqual(scoped, reference);
  assert.equal(scoped.provisions.people[scoped.residents[0].personUid].history[0].satiety, 6);
  assert.equal(scoped.provisions.people[scoped.residents[0].personUid].history.length, 2);
});

test('returned public diet reports cannot mutate a later report or the private penalty quote', () => {
  const state = island(), person = state.residents[0];
  P.withProvisionsReadScope(state, () => {
    const first = P.dietStatus(state, person), expected = structuredClone(first);
    first.penalty = 1000;
    first.shares.meat = 0;
    assert.deepEqual(P.dietStatus(state, person), expected);
    assert.equal(P.dietPenalty(state, person), expected.penalty);
  });
});

test('a throwing or nested quote leaves no stale cached diet for subsequent state and clock changes', () => {
  const state = island(), person = state.residents[0], other = island();
  assert.throws(() => P.withProvisionsReadScope(state, () => {
    const before = P.dietStatus(state, person);
    P.withProvisionsReadScope(other, () => P.dietStatus(other, other.residents[0]));
    assert.deepEqual(P.dietStatus(state, person), before);
    throw new Error('interrupted quote');
  }), /interrupted quote/);
  const entry = state.provisions.people[person.personUid];
  entry.history = [];
  state.worldTimeMs += DAY;
  assert.equal(P.dietPenalty(state, person), 20);
  entry.history = [{ resource: 'meat', satiety: 5, at: state.worldTimeMs }, { resource: 'vegetables', satiety: 5, at: state.worldTimeMs }];
  assert.equal(P.withProvisionsReadScope(state, () => P.dietPenalty(state, person)), 0);
});

test('population feeding averages remain exact and the next call includes newly created residents', () => {
  const state = island();
  for (const entry of Object.values(state.provisions.people)) entry.coverage = 0;
  assert.equal(P.feedingMultiplier(state), .5);
  const first = state.residents[0];
  state.provisions.people[first.personUid].coverage = 1;
  const expected = state.residents.reduce((sum, person) => sum + P.feedingMultiplier(state, person), 0) / state.residents.length;
  assert.equal(P.feedingMultiplier(state), expected);
  state.residents.push({ id: 98, personUid: 'scope-person-98' });
  assert.equal(P.feedingMultiplier(state, state.residents.at(-1)), 1);
});

test('static recipe indexing retains live level/research gates and every research callback in catalog order', () => {
  const state = island(), research = [];
  state.buildings.fisher.level = 5;
  const context = { hasResearch: id => { research.push(id); return true; } };
  assert.deepEqual(P.availableRecipes(state, 'fisher', context).map(row => row.id), ['fish', 'smokedFish', 'fishPreserves']);
  assert.deepEqual(research, ['fishProcessing', 'fishProcessing']);
  assert.deepEqual(P.availableRecipes(state, 'fisher', { hasResearch: () => false }).map(row => row.id), ['fish']);
  state.buildings.fisher.level = 4;
  research.length = 0;
  assert.deepEqual(P.availableRecipes(state, 'fisher', context).map(row => row.id), ['fish']);
  assert.deepEqual(research, []);
  state.buildings.fisher.level = 0;
  assert.deepEqual(P.availableRecipes(state, 'fisher', context), []);
});

test('static producer membership still returns a fresh list of the current buildings', () => {
  const state = island(), original = D.developmentProducerIds(state);
  original.pop();
  assert.ok(D.developmentProducerIds(state).length > original.length);
  const farm = state.buildings.farm;
  delete state.buildings.farm;
  assert.equal(D.developmentProducerIds(state).includes('farm'), false);
  state.buildings.farm = farm;
  assert.equal(D.developmentProducerIds(state).includes('farm'), true);
});

test('production job callbacks retain ordinary mutation semantics unless the host explicitly promises a read-only quote', () => {
  const state = island(), person = state.residents[0], penalties = [];
  D.developmentProductionJobs(state, { speed: () => {
    if (penalties.length === 1) state.provisions.people[person.personUid].history = [];
    penalties.push(Development.Provisions.dietPenalty(state, person));
    return 1;
  } });
  assert.ok(penalties.length >= 2);
  assert.equal(penalties[0], 0);
  assert.equal(penalties[1], 20);
});

function orderedArrivalSegment(timer, remaining) {
  const state=createState(NOW,{ruleset:32,onboarding:false});
  state.population=3;synchronizeResidents(state);
  state.welcome={startedAt:0,until:0};
  state.buildings.farm.level=1;state.buildings.farm.workers=3;
  state.provisions.assignments.farm={farmGrain:2,farmVegetables:1};
  state.provisions.localStock.farm.grain=200;
  for(const person of state.residents){
    Object.assign(person,{workplace:'farm',happiness:105,newbornRemaining:0,arrivalRemaining:0,returnRemaining:0,visitGroup:null});
    state.provisions.people[person.personUid].dietGraceUntil=NOW+DAY;
  }
  state.residents[1][timer]=remaining;
  const people=state.residents.map(person=>({person,slope:0,frozen:false,blocked:false,employed:true,praying:false,fed:true}));
  return {state,people,fed:true};
}

test('a later resident sees the earlier worker arrival before its own happiness clamp', () => {
  const segment=orderedArrivalSegment('arrivalRemaining',1);
  advanceResidents(segment,1);
  assert.equal(segment.state.residents[1].arrivalRemaining,0);
  assert.equal(segment.state.residents[2].happiness,100,'third ready worker belongs to the unblocked vegetable direction');
});

test('a returning worker crossing the boundary also changes the later recipe assignment in order', () => {
  const segment=orderedArrivalSegment('returnRemaining',1);
  advanceResidents(segment,1);
  assert.equal(segment.state.residents[1].returnRemaining,0);
  assert.equal(segment.state.residents[2].happiness,100);
});

test('a noncrossing journey keeps the existing ready crew and its compensated happiness balance', () => {
  const segment=orderedArrivalSegment('arrivalRemaining',10);
  advanceResidents(segment,1);
  assert.equal(segment.state.residents[1].arrivalRemaining,9);
  assert.equal(segment.state.residents[2].happiness,105,'second ready worker still belongs to the blocked grain direction');
});

function compareSettlementReads(script) {
  const reference=island(),scoped=structuredClone(reference);
  const expected=script(reference);
  const actual=P.withProvisionsSettlementScope(scoped,()=>script(scoped));
  assert.deepEqual(actual,expected);
  assert.deepEqual(scoped,reference);
}
function readDietPhase(state,context={now:NOW}) {
  return P.withProvisionsReadScope(state,()=>P.dietStatus(state,state.residents[0],context));
}

test('atomic advancement reuses only unchanged diet inputs across separate read phases',()=>{
  compareSettlementReads(state=>{
    const person=state.residents[0],results=[readDietPhase(state),readDietPhase(state)];
    state.provisions.people[person.personUid].dietGraceUntil=NOW+1;
    results.push(readDietPhase(state));
    state.buildings.townhall.level=8;
    results.push(readDietPhase(state));
    results.push(readDietPhase(state,{now:NOW+DAY}));
    return results;
  });
});

test('same-clock feeding that merges an existing meal invalidates the earlier aggregate even without history-length growth',()=>{
  compareSettlementReads(state=>{
    state.resources.meat=100000;
    for(const entry of Object.values(state.provisions.people))entry.history=[{resource:'meat',satiety:6,from:NOW-3600000,at:NOW}];
    const before=readDietPhase(state),length=state.provisions.people[state.residents[0].personUid].history.length;
    P.feedResidents(state,600,{now:NOW,hasHousing:()=>true});
    const after=readDietPhase(state);
    assert.equal(state.provisions.people[state.residents[0].personUid].history.length,length);
    assert.ok(after.shares.meat>before.shares.meat);
    return [before,after,readDietPhase(state)];
  });
});

test('a time shift invalidates in-place history changes even with a fixed explicit diet clock',()=>{
  compareSettlementReads(state=>{
    const entry=state.provisions.people[state.residents[0].personUid];
    entry.history=[{resource:'meat',satiety:2,from:NOW-DAY-1000,at:NOW-DAY+1000}];
    const before=readDietPhase(state);
    P.shiftProvisionsTime(state,-2000);
    const after=readDietPhase(state);
    assert.ok(before.total>0);
    assert.equal(after.total,0);
    return [before,after];
  });
});

test('compact, hydrate and normalize inside advancement reset every active memo and keep exact model fields',()=>{
  compareSettlementReads(state=>{
    const results=[readDietPhase(state)];
    P.withProvisionsReadScope(state,()=>{
      P.compactDietHistories(state);
      results.push(P.dietStatus(state,state.residents[0],{now:NOW}));
    });
    P.normalizeProvisions(state,structuredClone(state));
    results.push(readDietPhase(state));
    return results;
  });
});

test('nested settlement writes cannot resurrect an earlier aggregate when the outer scope resumes',()=>{
  compareSettlementReads(state=>{
    const results=[readDietPhase(state)];
    P.withProvisionsSettlementScope(state,()=>{
      P.shiftProvisionsTime(state,-DAY);
      results.push(readDietPhase(state));
    });
    results.push(readDietPhase(state));
    assert.equal(results[2].total,results[1].total);
    return results;
  });
});

test('settlement finally cleanup after nested errors leaves subsequent external in-place edits visible',()=>{
  const state=island(),person=state.residents[0];
  assert.throws(()=>P.withProvisionsSettlementScope(state,()=>{
    readDietPhase(state);
    P.withProvisionsSettlementScope(state,()=>{throw new Error('stop nested advance');});
  }),/stop nested advance/);
  const entry=state.provisions.people[person.personUid];
  const before=P.dietStatus(state,person,{now:NOW});
  entry.history[0].satiety+=17;
  const after=P.dietStatus(state,person,{now:NOW});
  assert.equal(after.total,before.total+17);
});
