import test from 'node:test';
import assert from 'node:assert/strict';
import * as State from '../harborlight-v1-state.js';
import * as Arch from '../harborlight-v1-archipelago.js';
import {adventureAction} from '../harborlight-v1-adventures.js';
import {STORY_CATALOG,ISLAND_PUZZLE_CATALOG} from '../harborlight-v1-story-catalog.js';
import {islandPuzzleSolution} from '../harborlight-v1-island-puzzles.js';
import {grantBonusMaterials} from '../harborlight-v1-inventory.js';
const NOW=Date.parse('2026-11-14T15:00:00Z'),adapters={createState:State.createState,normalizeState:State.normalizeState,advanceTo:State.advanceTo};
const bytes=value=>Buffer.byteLength(JSON.stringify(value));
const count=world=>[world.adventures.active,...Object.values(world.adventures.parked)].filter(r=>r&&r.stage!=='complete').length;
function account(){let s=State.createState(NOW,{ruleset:32,onboarding:false});s.islandName='Port audytowy';s.buildings.townhall.level=100;s.buildings.house.level=100;s.buildings.warehouse.level=100;s.population=30;s.resources.coins=1000000;grantBonusMaterials(s,{wood:500000,stone:500000,grain:500000,food:500000,planks:500000});s=State.normalizeState(s,NOW);return Arch.restoreArchipelago(s,adapters,NOW);}
const starts=()=>[...ISLAND_PUZZLE_CATALOG.map(p=>({type:'adventureStart',kind:'islandPuzzle',puzzleKind:p.id})),...STORY_CATALOG.flatMap(s=>Array.from({length:5},(_,i)=>({type:'adventureStart',kind:'escapeStory',storyId:s.id,variant:i+1})))];
function start(world,action,context){const result=adventureAction(world,action,context);assert.equal(result.ok,true,result.message);return world.adventures.active;}
function suspend(world){const current=world.adventures.active;assert.equal(adventureAction(world,{type:'adventureSuspend'}).ok,true);assert.equal(current.data.stageAttempt.status,'abandoned');return current;}
function docSizes(snapshot){const root=structuredClone(snapshot);const children=root.archipelago.islands;root.archipelago.islands={};return{root:bytes(root),...Object.fromEntries(Object.entries(children).map(([id,w])=>[id,bytes(w)]))};}

test('TH100 can retain 300 legitimate started adventures across three islands under each 700KB cloud document budget',()=>{
 let bundle=account();for(const name of['Północ','Południe']){const made=Arch.createNextIsland(bundle,{name},NOW);assert.equal(made.ok,true,made.message);}
 const worlds=Object.values(bundle.worlds),context={worlds,highestTownhall:100},cases=starts().slice(0,100);
 // A canonical unfinished story/puzzle resumes its slot; 300 account slots are
 // filled with100 different canonical starts on each of3 real founded islands.
 for(const world of worlds)for(const action of cases){start(world,action,context);suspend(world);}
 assert.equal(worlds.reduce((n,w)=>n+count(w),0),300);
 const before=Arch.serializeArchipelago(bundle),sizes=docSizes(before);
 for(const [id,size]of Object.entries(sizes))assert.ok(size<700000,`${id} actual serialized document: ${size} bytes`);
 assert.equal(adventureAction(worlds[0],starts()[100],context).code,'adventure-limit');
 bundle=Arch.restoreArchipelago(before,adapters,NOW);const restored=Object.values(bundle.worlds);assert.equal(restored.reduce((n,w)=>n+count(w),0),300);
 const restoredContext={worlds:restored,highestTownhall:100};assert.equal(adventureAction(restored[0],starts()[100],restoredContext).code,'adventure-limit');
 assert.equal(adventureAction(restored[0],cases[0],restoredContext).ok,true,'an existing slot can resume at the cap');assert.equal(restored.reduce((n,w)=>n+count(w),0),300);
 console.log('v32 TH100 adventure payload: '+JSON.stringify({started:300,islands:3,aggregateBytes:bytes(before),cloudDocumentBytes:sizes,restoredStarted:300}));
});

test('a single TH100 island preserves 100 proof-rich late-stage adventures and their clues below700KB',()=>{
 let bundle=account(),world=bundle.primary;const context={worlds:[world],highestTownhall:100};
 const cases=[...STORY_CATALOG.filter(s=>!s.mechanics.includes('marbleMaze')).flatMap(s=>Array.from({length:5},(_,i)=>({type:'adventureStart',kind:'escapeStory',storyId:s.id,variant:i+1}))),...ISLAND_PUZZLE_CATALOG.slice(0,5).map(p=>({type:'adventureStart',kind:'islandPuzzle',puzzleKind:p.id}))];assert.equal(cases.length,100);
 let completedRooms=0;
 for(const action of cases){const run=start(world,action,context);while(run.data.story&&run.data.story.roomIndex<run.data.story.roomCount-1){const p=run.data.puzzle;for(const move of islandPuzzleSolution(p)){if(p.solved)break;const result=adventureAction(world,{type:'adventureInput',adventureId:run.id,command:'puzzleMove',move},context);assert.equal(result.ok,true,result.message);}assert.equal(p.solved,true,p.kind);assert.equal(adventureAction(world,{type:'adventureInput',adventureId:run.id,command:'puzzleNextRoom'},context).ok,true);completedRooms++;}suspend(world);}
 const before=Arch.serializeArchipelago(bundle),size=bytes(before);assert.equal(count(world),100);assert.ok(size<700000,`actual rich single-world serialized payload is ${size} bytes`);
 const clues=Object.values(world.adventures.parked).reduce((n,r)=>n+(r.data.story?.knowledge.length||0),0);assert.equal(clues,completedRooms);
 bundle=Arch.restoreArchipelago(before,adapters,NOW);world=bundle.primary;assert.equal(count(world),100);assert.equal(Object.values(world.adventures.parked).reduce((n,r)=>n+(r.data.story?.knowledge.length||0),0),clues);assert.ok(bytes(Arch.serializeArchipelago(bundle))<700000);
 console.log('v32 proof-rich single-world payload: '+JSON.stringify({started:100,completedRooms,clues,bytes:size,restoredBytes:bytes(Arch.serializeArchipelago(bundle))}));
});
