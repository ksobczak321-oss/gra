import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, normalizeState, advanceTo} from '../harborlight-v1-state.js';
import * as Arch from '../harborlight-v1-archipelago.js';

const NOW = Date.parse('2026-11-19T12:00:00Z');
const adapters = {createState, normalizeState, advanceTo};
function fixture(ruleset = 32) {
  const world = createState(NOW, {...(ruleset ? {ruleset} : {}), onboarding:false});
  world.islandName = 'Test transportu';
  return Arch.restoreArchipelago(world, adapters, NOW);
}
const transfer = bundle => Arch.restoreSimulationBundle(structuredClone(Arch.captureSimulationBundle(bundle)), adapters);

test('simulation transport preserves hidden flags and histories without a save normalization pass', () => {
  const bundle = fixture(), world = bundle.primary;
  Object.defineProperty(world,'runtimeOnline',{configurable:true,writable:true,value:true});
  Object.defineProperty(world,'runtimeKingdomServer',{configurable:true,writable:true,value:false});
  world.originalPuzzleTest = {history:undefined};
  Object.defineProperty(world.originalPuzzleTest,'history',{configurable:true,writable:true,enumerable:false,value:[{move:1}]});
  const before = structuredClone(world), copy = transfer(bundle);
  assert.deepEqual(structuredClone(copy.primary),before);
  assert.equal(copy.primary.runtimeOnline,true);
  assert.equal(copy.primary.runtimeKingdomServer,false);
  assert.equal(Object.getOwnPropertyDescriptor(copy.primary,'runtimeOnline').enumerable,false);
  assert.deepEqual(copy.primary.originalPuzzleTest.history,[{move:1}]);
  assert.equal(Object.getOwnPropertyDescriptor(copy.primary.originalPuzzleTest,'history').enumerable,false);
  copy.primary.originalPuzzleTest.history[0].move = 2;
  assert.equal(world.originalPuzzleTest.history[0].move,1);
  assert.equal(copy.primary.highestAcademyLevel,world.highestAcademyLevel);
});

test('simulation transport reinstalls active island aliases and one shared wallet without minting coins', () => {
  const bundle = fixture(), daughter = structuredClone(bundle.primary);
  daughter.islandId='island-2'; daughter.islandRole='daughter'; daughter.islandSuffix='Druga';
  for (const person of daughter.residents) person.personUid=`island-2:${person.personUid}`;
  bundle.secondary=daughter;
  for (const field of Arch.SHARED_ACCOUNT_FIELDS) daughter[field]=bundle.primary[field];
  bundle.activeIslandId='island-2';
  const copy=transfer(bundle), before=copy.sharedWallet.coins;
  assert.equal(copy.secondary,copy.worlds['island-2']);
  assert.equal(copy.primary,copy.worlds['island-1']);
  assert.equal(copy.primary.settings,copy.secondary.settings);
  assert.equal(Arch.activeIsland(copy),copy.secondary);
  copy.secondary.resources.coins-=3;
  assert.equal(copy.primary.resources.coins,before-3);
  assert.equal(bundle.primary.resources.coins,before);
  const replacement=structuredClone(copy.secondary);
  copy.secondary=replacement;
  assert.equal(copy.worlds['island-2'],replacement);
});

for (const ruleset of [null,32]) test(`transferred one-call replay matches the synchronous model exactly (${ruleset ?? 'legacy'})`, () => {
  const original=fixture(ruleset), copy=transfer(original), target=NOW+3_600_000;
  Arch.advanceArchipelago(original,target);
  Arch.advanceArchipelago(copy,target);
  const result=transfer(copy);
  assert.deepEqual(structuredClone(result),structuredClone(original));
  assert.deepEqual(Arch.serializeArchipelago(result),Arch.serializeArchipelago(original));
});

test('one-call transfer replay keeps voyage arrival boundaries and shared account effects identical', () => {
  const world=createState(NOW,{ruleset:32,onboarding:false});
  world.buildings.townhall.level=10; world.buildings.warehouse.level=9;
  const original=Arch.restoreArchipelago(world,adapters,NOW);
  Object.assign(original.primary.resources,{coins:100000,wood:30000,stone:30000,grain:30000,planks:30000,flour:30000});
  assert.equal(Arch.createNextIsland(original,{name:'Druga'},NOW).ok,true);
  assert.equal(Arch.sendIslandTransfer(original,{toIslandId:'island-2',cargo:{wood:100}},NOW).ok,true);
  for (const [id,world] of Object.entries(original.worlds)) {
    Object.defineProperty(world,'runtimeOnline',{configurable:true,writable:true,value:id==='island-2'});
    Object.defineProperty(world,'runtimeKingdomServer',{configurable:true,writable:true,value:false});
  }
  const copy=transfer(original);
  Arch.advanceArchipelago(original,NOW+3_600_000);
  Arch.advanceArchipelago(copy,NOW+3_600_000);
  const result=transfer(copy);
  assert.equal(result.transfers[0].status,'complete');
  assert.deepEqual(structuredClone(result),structuredClone(original));
  assert.deepEqual(Arch.serializeArchipelago(result),Arch.serializeArchipelago(original));
  assert.equal(result.secondary.settings,result.primary.settings);
  assert.equal(result.secondary.runtimeOnline,true);
});
