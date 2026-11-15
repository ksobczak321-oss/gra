import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, advanceTo } from '../harborlight-v1-state.js';
import * as Arch from '../harborlight-v1-archipelago.js';
import { MATERIAL_IDS, FOOD_IDS, GOODS, foodReservePlan } from '../harborlight-v1-provisions.js';
import { availableGoods } from '../harborlight-v1-logistics.js';

const NOW = Date.parse('2026-11-15T12:00:00Z');
const adapters = { createState, normalizeState, advanceTo };
function account(stock = {}) {
  const state = createState(NOW,{ruleset:32});
  state.islandName = 'Matka'; state.buildings.townhall.level = 10;
  state.buildings.warehouse.level = 9;
  const bundle = Arch.restoreArchipelago(state,adapters,NOW);
  Object.assign(bundle.primary.resources,Object.fromEntries(MATERIAL_IDS.map(id=>[id,0])),
    {coins:100000,wood:30000,stone:30000,grain:30000,planks:30000,flour:30000},stock);
  return bundle;
}

test('v32 founding pays actual six-point meals, preserves the reserve and transfers six existing residents', () => {
  const bundle = account(), mother = bundle.primary, before = {...mother.resources};
  const reserve = foodReservePlan(mother).materials;
  const uids = mother.residents.map(person=>person.personUid);
  const quote = Arch.quoteNextIsland(bundle,{name:'Zatoka'},NOW);
  assert.equal(quote.ok,true);
  const created = Arch.createNextIsland(bundle,{name:'Zatoka'},NOW);
  assert.equal(created.ok,true);
  const paid = Object.fromEntries(MATERIAL_IDS.map(id=>[id,before[id]-mother.resources[id]]));
  assert.equal(before.coins-mother.resources.coins,quote.cost.coins);
  for (const id of ['wood','stone','planks']) assert.equal(paid[id],quote.cost[id]);
  const mealSatiety = FOOD_IDS.reduce((sum,id)=>sum+(paid[id]-(id==='grain'?quote.cost.grain:0))*GOODS[id].satiety,0);
  assert.ok(mealSatiety>=quote.cost.food*6,'the virtual Food line is actually consumed as satiety');
  assert.ok(mealSatiety<quote.cost.food*6+48,'whole meal rounding cannot consume an unrelated stockpile');
  assert.ok(paid.flour>0,'physical flour pays the Food line instead of nonexistent legacy Food');
  assert.equal(paid.food,0);
  for (const [id,amount] of Object.entries(reserve)) assert.ok(mother.resources[id]>=amount,`${id} protected reserve`);
  assert.equal(bundle.secondary.population,6);
  assert.equal(mother.population,uids.length-6);
  assert.deepEqual([...mother.residents,...bundle.secondary.residents].map(person=>person.personUid).sort(),uids.sort());
});

test('v32 founding cannot count grain toward both its material price and meal price; failure spends nothing', () => {
  const bundle = account({grain:23000,flour:18000}), mother = bundle.primary;
  // Each old independent check passes, but the combined physical price does not.
  assert.ok(availableGoods(mother,'grain')>=21000);
  assert.ok(availableGoods(mother,'food')>=21000);
  const before = structuredClone({resources:mother.resources,residents:mother.residents,worlds:Object.keys(bundle.worlds)});
  assert.equal(Arch.quoteNextIsland(bundle,{name:'Zatoka'},NOW).ok,false);
  assert.equal(Arch.createNextIsland(bundle,{name:'Zatoka'},NOW).ok,false);
  assert.deepEqual(mother.resources,before.resources);
  assert.deepEqual(mother.residents,before.residents);
  assert.deepEqual(Object.keys(bundle.worlds),before.worlds);
});
