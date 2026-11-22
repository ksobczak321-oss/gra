import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,EXPEDITIONS} from '../harborlight-v1-state.js';
import * as Adventures from '../harborlight-v1-adventures.js';
import {adventurePlayCapacity} from '../harborlight-v1-adventure-journey.js';
import {STORY_CATALOG,ISLAND_PUZZLE_CATALOG} from '../harborlight-v1-story-catalog.js';
import {islandPuzzleSolution} from '../harborlight-v1-island-puzzles.js';
import {originalPuzzleAction,availableConvoyIds} from '../harborlight-v1-original-puzzles.js';
import {activityAction,advanceActivities} from '../harborlight-v1-activities.js';
import {allocateExpeditionAttemptId,reserveExpeditionDifficulty,recordExpeditionOutcome,expeditionHourStatus} from '../harborlight-v1-expedition-hour.js';
import {miniGameRoundRules} from '../harborlight-v1-minigames.js';

const NOW=Date.parse('2026-11-22T12:00:00Z');
function world(level=1){const s=createState(NOW,{ruleset:32,onboarding:false});s.buildings.townhall.level=level;return s;}
const context=worlds=>({expeditions:EXPEDITIONS,worlds,highestTownhall:Math.max(...worlds.map(s=>s.buildings.townhall.level))});
function library(s,spec,ctx=context([s])){const r=Adventures.adventureAction(s,{type:'adventureStart',...spec,deferStart:true},ctx);assert.equal(r.ok,true,r.message);return s.adventures.active;}
const begin=(s,ctx=context([s]))=>Adventures.adventureAction(s,{type:'adventureInput',adventureId:s.adventures.active.id,command:'puzzleBegin'},ctx);
const input=(s,command,extra={},ctx=context([s]))=>Adventures.adventureAction(s,{type:'adventureInput',adventureId:s.adventures.active.id,command,...extra},ctx);
function shared(a,b){b.expeditionHour=a.expeditionHour;return context([a,b]);}
function addSettledWin(s,variant){const id=allocateExpeditionAttemptId(s,variant);reserveExpeditionDifficulty(s,id,variant);assert.equal(recordExpeditionOutcome(s,id,'won',variant),true);}
function completeLibraryPuzzle(s,ctx=context([s])){for(const move of islandPuzzleSolution(s.adventures.active.data.puzzle))assert.equal(input(s,'puzzleMove',{move},ctx).ok,true);assert.equal(input(s,'puzzleNextRoom',{},ctx).ok,true);}

test('reading all24 puzzle instructions at TownHall1 consumes no3-adventure slot or hourly reservation',()=>{
 const s=world();
 for(const{id}of ISLAND_PUZZLE_CATALOG){
  const r=library(s,{kind:'islandPuzzle',puzzleKind:id}),a=r.data.stageAttempt;
  assert.equal(a.instructionsPending,true);assert.equal(expeditionHourStatus(s,a.variant).roundsStarted,0);assert.equal(expeditionHourStatus(s,a.variant).activeRoundId,null);assert.equal(adventurePlayCapacity(s).count,0);
 }
 assert.equal(Object.keys(s.adventures.parked).length,23);
 const raw=structuredClone(s);Adventures.normalizeAdventures(raw,raw);assert.equal(adventurePlayCapacity(raw).count,0);assert.equal(Object.keys(raw.adventures.parked).length,23);
 for(const row of Object.values(raw.expeditionHour.variants))assert.equal(row.reservations.length,0);
});
test('two stories with the same first puzzle remain readable without reserving that puzzle variant',()=>{
 const s=world(20),group=STORY_CATALOG.map(story=>STORY_CATALOG.filter(other=>other.mechanics[0]===story.mechanics[0])).find(rows=>rows.length>1);assert.ok(group);
 const a=library(s,{kind:'escapeStory',storyId:group[0].id}),b=library(s,{kind:'escapeStory',storyId:group[1].id});
 assert.notEqual(a.id,b.id);assert.equal(a.data.stageAttempt.variant,b.data.stageAttempt.variant);assert.equal(a.data.stageAttempt.instructionsPending,true);assert.equal(b.data.stageAttempt.instructionsPending,true);
 assert.equal(expeditionHourStatus(s,a.data.stageAttempt.variant).roundsStarted,0);assert.equal(adventurePlayCapacity(s).count,0);
});
test('actual Begin enforces the3-adventure cap, while reading more instructions remains possible',()=>{
 const s=world();
 for(const id of ['parrot','gears','balance']){library(s,{kind:'islandPuzzle',puzzleKind:id});assert.equal(begin(s).ok,true);}
 assert.equal(adventurePlayCapacity(s).count,3);
 const waiting=library(s,{kind:'islandPuzzle',puzzleKind:'packing'}),a=waiting.data.stageAttempt,ledger=structuredClone(s.expeditionHour);
 const blocked=begin(s);assert.equal(blocked.ok,false);assert.equal(blocked.code,'adventure-limit');assert.equal(a.instructionsPending,true);assert.deepEqual(s.expeditionHour,ledger);
 library(s,{kind:'islandPuzzle',puzzleKind:'parrot'});assert.equal(input(s,'puzzleReset',{deferStart:true}).ok,true);assert.equal(begin(s).ok,true,'an existing started adventure may resume at its current cap');completeLibraryPuzzle(s);
 assert.equal(adventurePlayCapacity(s).count,2);library(s,{kind:'islandPuzzle',puzzleKind:'packing'});assert.equal(begin(s).ok,true);assert.equal(adventurePlayCapacity(s).count,3);
});
test('reading the next room keeps the slot of an already-started story across reload',()=>{
 const s=world(20),r=library(s,{kind:'escapeStory',storyId:'first-light'});assert.equal(begin(s).ok,true);assert.equal(adventurePlayCapacity(s).count,1);
 for(const move of islandPuzzleSolution(r.data.puzzle))assert.equal(input(s,'puzzleMove',{move}).ok,true);
 assert.equal(input(s,'puzzleNextRoom',{deferStart:true}).ok,true);assert.equal(r.data.stageAttempt.instructionsPending,true);assert.equal(r.data.playStarted,true);assert.equal(adventurePlayCapacity(s).count,1);
 const raw=structuredClone(s);Adventures.normalizeAdventures(raw,raw);assert.equal(raw.adventures.active.data.playStarted,true);assert.equal(adventurePlayCapacity(raw).count,1);
});
test('separate islands may read the same library variant, but actual Begin reserves it until the first attempt ends',()=>{
 const a=world(),b=world(),ctx=shared(a,b),first=library(a,{kind:'islandPuzzle',puzzleKind:'memoryTriples'},ctx),second=library(b,{kind:'islandPuzzle',puzzleKind:'memoryTriples'},ctx);
 assert.equal(expeditionHourStatus(a,'triples').activeRoundId,null);assert.equal(begin(a,ctx).ok,true);assert.equal(expeditionHourStatus(a,'triples').activeRoundId,first.data.stageAttempt.id);
 const blocked=begin(b,ctx);assert.equal(blocked.ok,false);assert.equal(blocked.code,'active-round-exists');assert.equal(second.data.stageAttempt.instructionsPending,true);assert.equal(expeditionHourStatus(a,'triples').roundsStarted,1);
 Adventures.adventureAction(a,{type:'adventureSuspend'},ctx);assert.equal(begin(b,ctx).ok,true);assert.equal(expeditionHourStatus(a,'triples').roundsStarted,2);
});
test('classic instruction preparation also leaves cap and variant slots free until Begin',()=>{
 const a=world(),b=world(),ctx=shared(a,b),first=library(a,{kind:'bridge'},ctx),second=library(b,{kind:'bridge'},ctx);
 assert.equal(expeditionHourStatus(a,'classic-bridge').activeRoundId,null);assert.equal(begin(a,ctx).ok,true);assert.equal(first.data.playStarted,true);
 const blocked=begin(b,ctx);assert.equal(blocked.ok,false);assert.equal(blocked.code,'active-round-exists');assert.equal(second.data.classicAttempt.instructionsPending,true);
 Adventures.adventureAction(a,{type:'adventureSuspend'},ctx);assert.equal(begin(b,ctx).ok,true);
});
test('shared clues may open a later classic stage without counting its first unread instructions as play',()=>{
 const s=world();s.adventures.progress.mapPieces=['one','two','three','four'];
 const run=library(s,{kind:'treasureMap'});assert.equal(run.stage,'arrange');assert.equal(run.data.classicAttempt.maxStageIndex,1);assert.equal(run.data.classicAttempt.instructionsPending,true);
 assert.equal(adventurePlayCapacity(s).count,0);assert.equal(begin(s).ok,true);assert.equal(adventurePlayCapacity(s).count,1);
});
test('library Begin rebuilds an unseen board from the current earned difficulty and preserves its generator and seed',()=>{
 const s=world(),r=library(s,{kind:'islandPuzzle',puzzleKind:'memoryTriples'}),a=r.data.stageAttempt,seed=r.data.puzzle.seed;
 assert.equal(a.difficulty,1);addSettledWin(s,'triples');Adventures.advanceAdventures(s,900);
 assert.equal(begin(s).ok,true);assert.equal(a.difficulty,2);assert.equal(a.remaining,miniGameRoundRules('triples',2).timeLimit);assert.equal(r.data.puzzle.difficulty,2);assert.equal(r.data.puzzle.seed,seed);assert.equal(r.data.puzzle.generatorVersion,2);assert.equal(r.data.puzzle.clock,900);assert.equal(r.data.puzzle.startedClock,900);
});
test('a new hour may lower the unseen board difficulty without losing a room or starting its clock while reading',()=>{
 const s=world();for(let n=0;n<4;n++)addSettledWin(s,'triples');const r=library(s,{kind:'islandPuzzle',puzzleKind:'memoryTriples'}),a=r.data.stageAttempt;
 assert.equal(a.difficulty,5);s.worldTimeMs+=3600000;Adventures.advanceAdventures(s,3600);assert.equal(a.instructionsPending,true);assert.equal(begin(s).ok,true);assert.equal(a.difficulty,1);assert.equal(a.remaining,miniGameRoundRules('triples',1).timeLimit);
});
test('direct original-puzzle reading reserves nothing; Begin checks collisions and gets the actual current difficulty',()=>{
 const a=world(),b=world();shared(a,b);
 for(const s of[a,b])assert.equal(originalPuzzleAction(s,{type:'originalPuzzleStart',variant:'harbor-routes',deferStart:true}).ok,true);
 const first=a.originalPuzzles.attempts['harbor-routes'],second=b.originalPuzzles.attempts['harbor-routes'];assert.equal(expeditionHourStatus(a,'harbor-routes').roundsStarted,0);
 assert.equal(originalPuzzleAction(a,{type:'originalPuzzleBegin',variant:'harbor-routes'}).ok,true);assert.equal(originalPuzzleAction(b,{type:'originalPuzzleBegin',variant:'harbor-routes'}).code,'active-round-exists');
 while(first.status==='active'){const id=availableConvoyIds(first.board)[0];assert.ok(id);assert.equal(originalPuzzleAction(a,{type:'originalPuzzleInput',variant:'harbor-routes',input:{kind:'convoy',id}}).ok,true);}
 assert.equal(first.status,'won');const at=NOW+900000;b.worldTimeMs=at;
 assert.equal(originalPuzzleAction(b,{type:'originalPuzzleBegin',variant:'harbor-routes'}).ok,true);assert.equal(second.difficulty,2);assert.equal(second.startedAt,at);assert.equal(second.lastAt,at);assert.equal(second.remaining,second.initialDuration);assert.equal(second.boardVersion,2);
});
test('direct expedition reading reserves no hourly slot and Begin preserves a won pot while adopting current board difficulty',()=>{
 const a=world(),b=world(),ctx=shared(a,b),spec={type:'expeditionStart',expedition:EXPEDITIONS[0].id,gameKind:'triples',deferStart:true};
 assert.equal(activityAction(a,spec,ctx).ok,true);assert.equal(activityAction(b,spec,ctx).ok,true);
 const first=a.expeditionRuns[spec.expedition],second=b.expeditionRuns[spec.expedition],firstId=first.roundIdentity;assert.equal(expeditionHourStatus(a,'triples').roundsStarted,0);
 assert.equal(activityAction(a,{type:'expeditionBegin',runId:first.id},ctx).ok,true);assert.equal(expeditionHourStatus(a,'triples').activeRoundId,firstId);
 assert.equal(activityAction(b,{type:'expeditionBegin',runId:second.id},ctx).code,'active-round-exists');assert.equal(second.instructionsPending,true);
 for(const symbol of new Set(first.miniGame.cards))for(const index of first.miniGame.cards.flatMap((card,index)=>card===symbol?[index]:[]))assert.equal(activityAction(a,{type:'expeditionMiniGameReveal',runId:first.id,index},ctx).ok,true);
 assert.equal(first.status,'decision');const pot=first.pot;assert.ok(pot>0);advanceActivities(b,900);
 assert.equal(activityAction(b,{type:'expeditionBegin',runId:second.id},ctx).ok,true);assert.equal(second.difficultyLevel,2);assert.equal(second.roundLimit,miniGameRoundRules('triples',2).timeLimit);assert.equal(second.roundStartedAt,900);assert.equal(first.pot,pot);assert.equal(first.status,'decision');
});
