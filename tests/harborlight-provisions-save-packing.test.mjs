import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ADVENTURE_PACKING_RULES, packAdventureSave, unpackAdventureSave, packArchipelagoSave, unpackArchipelagoSave } from '../harborlight-v1-save-packing.js';
import { packAdventureSave as oldPackAdventureSave, unpackAdventureSave as oldUnpackAdventureSave } from './fixtures/harborlight-save-packing-v32-19.mjs';
import * as P from '../harborlight-v1-provisions.js';

const NOW=1795000000000,copy=value=>structuredClone(value),bytes=value=>Buffer.byteLength(JSON.stringify(value));
function denseWorld(id='island-1',count=5500) {
  const world={version:9,ruleset:32,islandId:id,islandRole:id==='island-1'?'mother':'daughter',lastSimulatedAt:NOW,worldTimeMs:NOW,
    population:2,resources:{coins:100,...Object.fromEntries(P.MATERIAL_IDS.map(id=>[id,100]))},
    buildings:{townhall:{level:6},house:{level:6},warehouse:{level:6}},
    residents:[{id:1,personUid:'p1'},{id:2,personUid:'p2'}],adventures:{version:1},
    expeditionHour:{version:2,results:[{id:'exact-result',at:NOW-.125}]},adventureBudget:{version:1,receipts:[{id:'exact-receipt',coins:7}]}};
  P.normalizeProvisions(world);
  const history=Array.from({length:count},(_,index)=>({resource:index%2?'pasteurizedMilk':'vegetables',satiety:.123456789012+(index%7)/100,
    from:NOW-86000000+index*13000.125,at:NOW-86000000+(index+1)*13000.125}));
  for(const person of Object.values(world.provisions.people))person.history=copy(history);
  P.compactDietHistories(world);
  return world;
}

test('large existing DAG diets fit the unchanged world limit and restore every exact stored row and number',()=>{
  const live=denseWorld(),original=copy(live),before=JSON.stringify(live),packed=copy(live);
  assert.ok(bytes(packed)>700000,'fixture reproduces a complete world that the transport previously rejected');
  packAdventureSave(packed);
  assert.ok(bytes(packed)<700000);assert.ok(packed.adventuresPacked.sections.includes('provisions'));
  assert.equal(packed.provisions,undefined);assert.deepEqual(packed.resources,live.resources);assert.deepEqual(packed.residents,live.residents);
  assert.deepEqual(unpackAdventureSave(packed),original);assert.equal(JSON.stringify(live),before);
  const restored=unpackAdventureSave(packed);P.normalizeProvisions(restored,restored);
  const expected=copy(original);P.normalizeProvisions(expected,expected);
  assert.deepEqual(restored,expected);assert.equal(restored.provisions.people.p1.history.length,5500);
  restored.provisions.people.p1.history[0].satiety=999;
  assert.notEqual(restored.provisions.people.p2.history[0].satiety,999,'hydrated residents retain independent histories');
});

test('the frozen previous reader fails closed on the explicit provisions section instead of normalizing an empty diet',()=>{
  const fixture=readFileSync(new URL('./fixtures/harborlight-save-packing-v32-19.mjs',import.meta.url));
  assert.equal(createHash('sha256').update(fixture).digest('hex'),'44d6c2d63ec44fca4b4b263ca283722a1ff21193c9100def76c46a4c409fd56c');
  const packed=denseWorld('island-1',700);packAdventureSave(packed);const before=JSON.stringify(packed);
  assert.ok(packed.adventuresPacked.sections.includes('provisions'));
  assert.throws(()=>oldUnpackAdventureSave(packed),{code:'invalid-cloud-data'});
  assert.equal(JSON.stringify(packed),before);assert.deepEqual(unpackAdventureSave(packed).provisions,denseWorld('island-1',700).provisions);
});

test('small provisions retain the previous plain format and the previous reader still restores that world',()=>{
  const world=denseWorld('island-1',2);world.adventures.note='Zachowana przygoda. '.repeat(6000);
  const before=copy(world);packAdventureSave(world);
  assert.ok(world.adventuresPacked);assert.ok(world.provisions);assert.ok(!world.adventuresPacked.sections.includes('provisions'));
  assert.deepEqual(oldUnpackAdventureSave(world),before);
});

test('large provisions do not narrow the previous near-four-megabyte adventure stream domain',()=>{
  const world=denseWorld('island-1',700);world.adventures.note='a'.repeat(ADVENTURE_PACKING_RULES.maximumUncompressedBytes-1000);
  const old=copy(world),current=copy(world);oldPackAdventureSave(old);packAdventureSave(current);
  assert.deepEqual(current,old);assert.ok(current.provisions);assert.ok(bytes(current)<700000);
  assert.deepEqual(unpackAdventureSave(current),world);
});

test('mother and daughter sections are decoded without mutation and each dirty world can be repacked independently',()=>{
  const mother=denseWorld('island-1',700),daughter=denseWorld('island-2',700);
  mother.archipelago={version:2,activeIslandId:'island-2',islands:{'island-2':daughter}};
  const before=JSON.stringify(mother),packed=packArchipelagoSave(mother);
  assert.equal(JSON.stringify(mother),before);assert.deepEqual(unpackArchipelagoSave(packed),mother);
  assert.equal(JSON.stringify(packArchipelagoSave(unpackArchipelagoSave(packed))),JSON.stringify(packed),'unchanged saves keep exact payload bytes for uncertain-commit recovery');
  assert.ok(packed.adventuresPacked.sections.includes('provisions'));
  assert.deepEqual(packed.archipelago.islands['island-2'].adventuresPacked.sections,['adventures','provisions']);
  assert.deepEqual(packed.archipelago.islands['island-2'].expeditionHour,daughter.expeditionHour,'account ledgers keep their historical mother-only rule');
  const decoded=unpackArchipelagoSave(packed);decoded.archipelago.islands['island-2'].resources.wood-=10;
  const packedAgain=packArchipelagoSave(decoded);assert.deepEqual(unpackArchipelagoSave(packedAgain),decoded);
  assert.deepEqual(unpackArchipelagoSave(packedAgain).provisions,mother.provisions);
  const legacy=copy(mother);legacy.archipelago={version:1,activeIslandId:'island-2',secondIsland:daughter};
  assert.deepEqual(unpackArchipelagoSave(packArchipelagoSave(legacy)),legacy);
});

test('standalone provisions normalization and compaction decode before touching an opaque history',()=>{
  const original=denseWorld('island-1',700),packed=copy(original);packAdventureSave(packed);
  const normalized=copy(packed);P.normalizeProvisions(normalized,normalized);
  const expected=copy(original);P.normalizeProvisions(expected,expected);
  assert.deepEqual(normalized,expected);assert.equal(normalized.adventuresPacked,undefined);
  P.compactDietHistories(packed);assert.deepEqual(packed,original);
});

test('invalid metadata, corrupted streams, mixed plain sections and oversize input fail without changing any input world',()=>{
  const original=denseWorld('island-1',700),packed=packArchipelagoSave(original);
  for(const change of[
    world=>world.adventuresPacked.uncompressedBytes=ADVENTURE_PACKING_RULES.maximumUncompressedBytes+1,
    world=>world.adventuresPacked.sections.push('provisions'),
    world=>world.provisions={version:1,people:{}},
    world=>world.adventuresPacked.data=world.adventuresPacked.data.slice(0,-4)+'AAAA'
  ]){
    const invalid=copy(packed);change(invalid);const before=JSON.stringify(invalid);
    assert.throws(()=>unpackArchipelagoSave(invalid),{code:'invalid-cloud-data'});
    assert.throws(()=>P.compactDietHistories(invalid),{code:'invalid-cloud-data'});
    assert.throws(()=>P.normalizeProvisions(invalid,invalid),{code:'invalid-cloud-data'});
    assert.equal(JSON.stringify(invalid),before);
    const parent={...packed,archipelago:{version:2,islands:{'island-2':invalid}}},parentBefore=JSON.stringify(parent);
    assert.throws(()=>unpackArchipelagoSave(parent),{code:'invalid-cloud-data'});assert.equal(JSON.stringify(parent),parentBefore);
  }
  const tooLarge=copy(original);tooLarge.adventures.extra='x'.repeat(ADVENTURE_PACKING_RULES.maximumUncompressedBytes);
  const before=JSON.stringify(tooLarge);assert.throws(()=>packArchipelagoSave(tooLarge),{code:'invalid-cloud-data'});
  assert.equal(JSON.stringify(tooLarge),before);assert.equal(ADVENTURE_PACKING_RULES.maximumUncompressedBytes,4000000);
});
