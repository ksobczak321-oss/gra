import { flushPendingDeliveries } from '../harborlight-v1-logistics.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {ADVENTURE_PACKING_RULES as RULES,packAdventureSave,unpackAdventureSave} from '../harborlight-v1-save-packing.js';
import * as State from '../harborlight-v1-state.js';
import * as Arch from '../harborlight-v1-archipelago.js';
import * as P from '../harborlight-v1-provisions.js';
import {activeEffects,normalizeEffectNotifications,syncEffectNotifications} from '../harborlight-v1-effects.js';
import {synchronizeResidents} from '../harborlight-v1-residents.js';
import {adventureAction} from '../harborlight-v1-adventures.js';
import {STORY_CATALOG,ISLAND_PUZZLE_CATALOG} from '../harborlight-v1-story-catalog.js';
import {islandPuzzleSolution} from '../harborlight-v1-island-puzzles.js';
import {claimAdventureBudget} from '../harborlight-v1-adventure-budget.js';
import {grantBonusMaterials} from '../harborlight-v1-inventory.js';
const NOW=Date.parse('2026-11-14T15:00:00Z'),bytes=value=>Buffer.byteLength(JSON.stringify(value));
const copy=value=>structuredClone(value),adapters={createState:State.createState,normalizeState:State.normalizeState,advanceTo:State.advanceTo};
const sample=()=>({version:9,ruleset:32,islandId:'island-1',islandRole:'mother',resources:{coins:921,wood:71,bread:83},residents:[{id:1,personUid:'island-1:resident-1'}],kingdom:{untouched:true},adventures:{version:1,note:'Zażółć gęślą jaźń. Łódź, śledź, żółw, 🌊⚓ oraz \u0000\n\r\t"\\. '.repeat(6000)},expeditionHour:{version:2,variants:{'signal-line':{wins:3,reservations:[{id:'proof-1',difficulty:3,active:false}],results:[{id:'proof-1',outcome:'won'}]}}},adventureBudget:{version:1,receipts:[{id:'paid-1',coins:7}]}});
function modifyData(world,change){const altered=copy(world),data=Buffer.from(altered.adventuresPacked.data,'base64');change(data);altered.adventuresPacked.data=data.toString('base64');return altered;}
function rejects(world){assert.throws(()=>unpackAdventureSave(world),{code:'invalid-cloud-data'});}

test('packing is an exact Unicode JSON roundtrip, keeps business fields plain and never mutates live state',()=>{
 const live=sample(),before=JSON.stringify(live),snapshot=copy(live);packAdventureSave(snapshot);
 assert.ok(snapshot.adventuresPacked);assert.deepEqual(snapshot.adventuresPacked.sections,['adventures','expeditionHour','adventureBudget']);
 assert.equal(snapshot.adventures,undefined);assert.equal(snapshot.expeditionHour,undefined);assert.equal(snapshot.adventureBudget,undefined);
 assert.deepEqual(snapshot.resources,live.resources);assert.deepEqual(snapshot.residents,live.residents);assert.deepEqual(snapshot.kingdom,live.kingdom);
 assert.equal(JSON.stringify(live),before);assert.deepEqual(unpackAdventureSave(snapshot),live);assert.notEqual(unpackAdventureSave(snapshot),snapshot);
 const packedOnce=JSON.stringify(snapshot);packAdventureSave(snapshot);assert.equal(JSON.stringify(snapshot),packedOnce);assert.equal(unpackAdventureSave(live),live);
 const small={adventures:{version:1,note:'Mała przygoda'}};packAdventureSave(small);assert.ok(small.adventures);assert.equal(small.adventuresPacked,undefined);
 const daughter=sample();daughter.islandId='island-2';daughter.islandRole='daughter';const original=copy(daughter);packAdventureSave(daughter);assert.deepEqual(daughter.adventuresPacked.sections,['adventures']);assert.deepEqual(daughter.expeditionHour,original.expeditionHour);assert.deepEqual(daughter.adventureBudget,original.adventureBudget);assert.deepEqual(unpackAdventureSave(daughter),original);
});

test('varying Polish and numeric data crosses every LZW code width and the bounded dictionary freezes without losing bytes',()=>{
 let random=0x5f137ec;const next=()=>{random^=random<<13;random^=random>>>17;random^=random<<5;return random>>>0;};
 for(const rows of[1,63,255,1025,4500,15000]){
  const world={adventures:{version:1,entries:Array.from({length:rows},(_,i)=>({id:i,seed:next(),route:['Przystań','Zażółć','Łódź','Wskazówka 🌊'][i%4],value:next()/4294967296,description:'Każde odkrycie i poprzednia nagroda pozostają zapisane.'}))}};
  const original=copy(world);packAdventureSave(world);assert.deepEqual(unpackAdventureSave(world),original);
  if(rows===15000){assert.ok(world.adventuresPacked);const codeCount=Buffer.from(world.adventuresPacked.data,'base64').readUInt32BE(0);assert.ok(codeCount>65536,`actual ${codeCount} codes exercise all widths and dictionary freeze`);}
 }
});

test('malformed, ambiguous, truncated and bit-corrupted packed sections throw instead of resetting adventures',()=>{
 const world=sample();packAdventureSave(world);
 for(const change of[
  w=>w.adventuresPacked.version=2,w=>w.adventuresPacked.codec='unknown',w=>w.adventuresPacked.uncompressedBytes=0,
  w=>w.adventuresPacked.uncompressedBytes=RULES.maximumUncompressedBytes+1,w=>w.adventuresPacked.uncompressedBytes=2.5,
  w=>w.adventuresPacked.uncompressedBytes++,w=>w.adventuresPacked.uncompressedBytes--,
  w=>w.adventuresPacked.sections=['adventures','adventures'],w=>w.adventuresPacked.sections=['resources'],
  w=>w.adventuresPacked.sections=['adventures','kingdom'],w=>w.adventuresPacked.sections=[],
  w=>w.adventures={version:1},w=>w.expeditionHour={version:2},w=>w.adventuresPacked.data+=' ',
  w=>w.adventuresPacked.data=w.adventuresPacked.data.slice(0,-4),w=>w.adventuresPacked.data+='AAAA'
 ]){const altered=copy(world);change(altered);rejects(altered);}
 const data=Buffer.from(world.adventuresPacked.data,'base64');
 for(const at of[0,3,4,7,8,Math.floor(data.length/2),data.length-1])rejects(modifyData(world,b=>b[at]^=1));
 rejects(modifyData(world,b=>b.writeUInt32BE(0xffffffff,0)));
 rejects(modifyData(world,b=>b.writeUInt32BE(0,0)));
 assert.deepEqual(unpackAdventureSave(world),sample());
});

test('the declared four-million-byte expansion boundary is enforced before allocation and accepts an exact-size legitimate stream',()=>{
 const skeleton=Buffer.byteLength(JSON.stringify({adventures:{version:1,note:''}})),world={adventures:{version:1,note:'a'.repeat(RULES.maximumUncompressedBytes-skeleton)}};
 const exact=copy(world);packAdventureSave(exact);assert.equal(exact.adventuresPacked.uncompressedBytes,RULES.maximumUncompressedBytes);assert.deepEqual(unpackAdventureSave(exact),world);
 const tooLarge=copy(world);tooLarge.adventures.note+='a';assert.throws(()=>packAdventureSave(tooLarge),{code:'invalid-cloud-data'});
 let read=false;const bomb={adventuresPacked:{version:1,codec:RULES.codec,sections:['adventures'],uncompressedBytes:RULES.maximumUncompressedBytes+1,get data(){read=true;return exact.adventuresPacked.data;}}};rejects(bomb);assert.equal(read,false,'oversized output metadata is rejected before touching compressed input');
});

function combinedWorld(){
 let s=State.createState(NOW,{ruleset:32,onboarding:false});s.buildings.townhall.level=100;s.buildings.house.level=100;s.buildings.warehouse.level=100;s=State.normalizeState(s,NOW);s.population=3600;s.capacity=3600;synchronizeResidents(s);P.normalizeProvisions(s,s);
 for(const person of Object.values(s.provisions.people)){person.clothingRemaining=21*86400;person.fullFedSeconds=0;person.coverage=.5;person.hungerSeconds=12345.6789;person.clothesSpare=0;person.cakeSatiety=.12345;person.cakeBonusUntil=NOW+3600000;}
 const context={worlds:[s],highestTownhall:100},cases=[...STORY_CATALOG.filter(story=>!story.mechanics.includes('marbleMaze')).flatMap(story=>Array.from({length:5},(_,i)=>({type:'adventureStart',kind:'escapeStory',storyId:story.id,variant:i+1}))),...ISLAND_PUZZLE_CATALOG.slice(0,5).map(p=>({type:'adventureStart',kind:'islandPuzzle',puzzleKind:p.id}))];
 for(const action of cases){let result=adventureAction(s,action,context);assert.equal(result.ok,true,result.message);const run=s.adventures.active;
  while(run.data.story&&run.data.story.roomIndex<run.data.story.roomCount-1){const puzzle=run.data.puzzle;for(const move of islandPuzzleSolution(puzzle)){if(puzzle.solved)break;result=adventureAction(s,{type:'adventureInput',adventureId:run.id,command:'puzzleMove',move},context);assert.equal(result.ok,true,result.message);}assert.equal(puzzle.solved,true);assert.equal(adventureAction(s,{type:'adventureInput',adventureId:run.id,command:'puzzleNextRoom'},context).ok,true);}
  assert.equal(adventureAction(s,{type:'adventureSuspend'}).ok,true);
 }
 const paid=claimAdventureBudget(s,{receiptId:'combined-audit-paid',reward:{coins:47,wood:3}});s.resources.coins+=paid.reward.coins||0;grantBonusMaterials(s,paid.reward);flushPendingDeliveries(s);
 return s;
}
function storyFacts(world){return Object.fromEntries(Object.entries(world.adventures.parked).map(([key,r])=>[key,{id:r.id,attemptStatus:r.data.stageAttempt.status,story:r.data.story||null}]));}

test('actual TH100/3600 hungry clothed residents plus100 proof-rich adventures coexist below700KB and restore all435clues, inventories and receipts',()=>{
 const live=combinedWorld();live.residents[0].visitHappinessRemaining=60;normalizeEffectNotifications(live);live.residents[0].visitHappinessRemaining=0;syncEffectNotifications(live);const originalNotifications=copy(live.notifications),originalEffectIds=activeEffects(live).map(e=>e.id).sort();assert.ok(originalNotifications.some(n=>n.kind==='effect-ended'),'fixture retains an actual delivered effect notification');const originalFacts=storyFacts(live),originalResources=copy(live.resources),before=copy(live);P.compactDietHistories(before);before.residents=before.residents.map(Arch.compactResidentSnapshot);
 const withDerivedCacheBytes=bytes(before);delete before.effectNotificationState;const originalBytes=bytes(before);assert.ok(originalBytes>700000,'combined fixture genuinely exceeded the cloud document cap before packing');assert.ok(withDerivedCacheBytes>originalBytes,'the derived observation cache is omitted without dropping persistent notifications');
 packAdventureSave(before);const packedBytes=bytes(before);assert.ok(packedBytes<700000,`actual combined payload: ${packedBytes}`);assert.ok(before.adventuresPacked);assert.equal(before.residents.length,3600);assert.deepEqual(before.resources,originalResources);
 const facts=storyFacts(unpackAdventureSave(before));assert.deepEqual(facts,originalFacts);assert.equal(Object.keys(facts).length,100);assert.equal(Object.values(facts).reduce((n,r)=>n+(r.story?.knowledge.length||0),0),435);
 const restored=State.normalizeState(copy(before),NOW);assert.equal(restored.population,3600);assert.equal(restored.residents.length,3600);assert.deepEqual(restored.resources,originalResources);assert.deepEqual(storyFacts(restored),originalFacts);assert.deepEqual(restored.notifications,originalNotifications);assert.deepEqual(Object.keys(restored.effectNotificationState.active).sort(),originalEffectIds);syncEffectNotifications(restored);assert.deepEqual(restored.notifications,originalNotifications,'rehydrated cache prevents repeat transition notices');
 const person=restored.provisions.people[restored.residents[0].personUid];assert.equal(person.coverage,.5);assert.equal(person.hungerSeconds,12345.6789);assert.equal(person.clothingRemaining,21*86400);assert.equal(person.cakeSatiety,.12345);
 assert.equal(claimAdventureBudget(restored,{receiptId:'combined-audit-paid',reward:{coins:47,wood:3}}).duplicate,true);
 const bundle=Arch.restoreArchipelago(copy(before),adapters,NOW),serialized=Arch.serializeArchipelago(bundle);assert.ok(bytes(serialized)<700000,JSON.stringify({actualBytes:bytes(serialized),parts:Object.fromEntries(Object.entries(serialized).filter(([,v])=>v!==undefined&&bytes(v)>1000).map(([k,v])=>[k,bytes(v)])),packed:serialized.adventuresPacked?.sections}));assert.ok(serialized.adventuresPacked);assert.equal(serialized.adventures,undefined);assert.equal(serialized.effectNotificationState,undefined);assert.ok(!serialized.adventuresPacked.sections.includes('effectNotificationState'));assert.deepEqual(serialized.resources,originalResources);assert.deepEqual(serialized.notifications,originalNotifications);
 const again=Arch.restoreArchipelago(copy(serialized),adapters,NOW);assert.deepEqual(storyFacts(again.primary),originalFacts);assert.equal(again.primary.population,3600);assert.deepEqual(again.primary.resources,originalResources);assert.deepEqual(again.primary.notifications,originalNotifications);syncEffectNotifications(again.primary);assert.deepEqual(again.primary.notifications,originalNotifications);
 const corrupt=copy(serialized);corrupt.adventuresPacked.data=corrupt.adventuresPacked.data.slice(0,-4)+'AAAA';assert.throws(()=>State.normalizeState(corrupt,NOW),{code:'invalid-cloud-data'});
 console.log('v32 combined actual maximum payload: '+JSON.stringify({population:3600,started:100,completedRooms:435,persistentNotifications:originalNotifications.length,withDerivedCacheBytes,beforeBytes:originalBytes,packedBytes,serializedBytes:bytes(serialized),sections:serialized.adventuresPacked.sections}));
});
