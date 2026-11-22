import test from 'node:test';
import assert from 'node:assert/strict';
import * as Adventures from '../harborlight-v1-adventures.js';
import {ISLAND_PUZZLE_CATALOG,STORY_CATALOG} from '../harborlight-v1-story-catalog.js';
import {islandPuzzleSolution} from '../harborlight-v1-island-puzzles.js';
import {expeditionHourStatus} from '../harborlight-v1-expedition-hour.js';

const world=()=>{const s={ruleset:32,worldTimeMs:Date.parse('2026-11-22T12:00:00Z'),activityClock:0,activitySeed:179,notifications:[],resources:{coins:1000},buildings:{townhall:{level:20}}};Adventures.normalizeAdventures(s);return s;};
const send=(s,command,extra={})=>Adventures.adventureAction(s,{type:'adventureInput',adventureId:s.adventures.active.id,command,...extra});
const start=(s,spec,deferStart=true)=>{const result=Adventures.adventureAction(s,{type:'adventureStart',...spec,deferStart});assert.equal(result.ok,true,result.message);return s.adventures.active;};
const reload=s=>{const copy=structuredClone(s);Adventures.normalizeAdventures(copy);return copy;};

test('every island puzzle waits without consuming the timer, physics or a move until Start',()=>{
  for(const {id} of ISLAND_PUZZLE_CATALOG){
    const s=world(),r=start(s,{kind:'islandPuzzle',puzzleKind:id}),a=r.data.stageAttempt;
    const before=structuredClone(r.data.puzzle),time=a.remaining;
    assert.equal(a.instructionsPending,true,id);
    assert.equal(send(s,'puzzleMove',{move:{type:'select',id:'0'}}).ok,false,id);
    assert.equal(send(s,'puzzleHint').ok,false,id);
    Adventures.advanceAdventures(s,900);
    assert.equal(a.remaining,time,id);assert.deepEqual(r.data.puzzle,before,id);
    assert.equal(r.stage,'puzzle',id);assert.equal(Adventures.nextAdventuresEvent(s),Infinity,id);
    const restored=reload(s);assert.equal(restored.adventures.active.data.stageAttempt.instructionsPending,true,id);
    assert.equal(restored.adventures.active.stage,'puzzle',id);
    assert.equal(send(s,'puzzleBegin').ok,true,id);Adventures.advanceAdventures(s,1);
    assert.ok(a.remaining<time,id);
  }
});

test('all twenty stories allow unlimited reading before their first room',()=>{
  for(const {id} of STORY_CATALOG){
    const s=world(),r=start(s,{kind:'escapeStory',storyId:id}),a=r.data.stageAttempt,time=a.remaining;
    Adventures.advanceAdventures(s,1800);
    assert.equal(a.remaining,time,id);assert.equal(r.data.story.completedRooms.length,0,id);
    assert.equal(reload(s).adventures.active.data.stageAttempt.instructionsPending,true,id);
  }
});

test('the next story room has its own instructions and a fresh full timer',()=>{
  const s=world(),r=start(s,{kind:'escapeStory',storyId:'first-light'});send(s,'puzzleBegin');
  // This known solution is only setup for the room-transition contract.
  for(const move of islandPuzzleSolution(r.data.puzzle))assert.equal(send(s,'puzzleMove',{move}).ok,true);
  assert.equal(r.stage,'roomComplete');
  assert.equal(send(s,'puzzleNextRoom',{deferStart:true}).ok,true);
  const a=r.data.stageAttempt,time=a.remaining;assert.equal(r.data.story.roomIndex,1);
  assert.equal(a.instructionsPending,true);Adventures.advanceAdventures(s,900);
  assert.equal(a.remaining,time);assert.equal(r.data.story.completedRooms.length,1);
  send(s,'puzzleBegin');Adventures.advanceAdventures(s,1);assert.ok(a.remaining<time);
});

test('reading and closing a puzzle neither fails it nor consumes its earned difficulty',()=>{
  const s=world(),r=start(s,{kind:'islandPuzzle',puzzleKind:'parrot'}),id=r.id,a=r.data.stageAttempt;
  assert.equal(Adventures.adventureAction(s,{type:'adventureSuspend'}).ok,true);
  assert.equal(a.status,'active');assert.equal(expeditionHourStatus(s,a.variant).failures,0);
  start(s,{kind:'islandPuzzle',puzzleKind:'parrot'});
  assert.equal(s.adventures.active.id,id);assert.equal(s.adventures.active.data.stageAttempt.instructionsPending,true);
});

test('classic signals preserve their preview and full round during reading and reload',()=>{
  const s=world(),r=start(s,{kind:'signals'}),a=r.data.classicAttempt,time=a.remaining;
  Adventures.advanceAdventures(s,900);assert.equal(a.remaining,time);assert.equal(r.stage,'memorize');
  const restored=reload(s);assert.equal(restored.adventures.active.data.classicAttempt.instructionsPending,true);
  send(s,'puzzleBegin');Adventures.advanceAdventures(s,1);assert.equal(a.remaining,time-1);assert.equal(r.stage,'memorize');
});

test('cargo reading preserves its entire flight and has no live catch surface',()=>{
  const s=world(),r=start(s,{kind:'cargoRain'}),duration=r.data.duration;
  const first=r.data.drops[0],relative=first.appearAt-r.startedAt;
  assert.equal(send(s,'catch',{dropId:first.id}).ok,false);
  Adventures.advanceAdventures(s,900);assert.equal(r.stage,'catch');assert.equal(r.data.drops[0].appearAt-r.startedAt,relative);
  const restored=reload(s);assert.equal(restored.adventures.active.data.instructionsPending,true);
  send(s,'puzzleBegin');Adventures.advanceAdventures(s,duration);assert.equal(r.stage,'complete');
});

test('legacy model starts retain their normal running timers and exit rules',()=>{
  const s=world(),r=start(s,{kind:'islandPuzzle',puzzleKind:'parrot'},false),time=r.data.stageAttempt.remaining;
  Adventures.advanceAdventures(s,1);assert.equal(r.data.stageAttempt.remaining,time-1);
  assert.equal(reload(s).adventures.active.data.stageAttempt.status,'abandoned');
});
