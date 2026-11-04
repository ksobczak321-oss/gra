import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAdventures,adventureAction,advanceAdventures,pauseAdventureFor}from'../harborlight-v1-adventures.js';
const copy=x=>JSON.parse(JSON.stringify(x));
function island(){const s={worldTimeMs:Date.parse('2026-11-04T12:00:00Z'),activityClock:0,activitySeed:17,resources:{coins:100,wood:0,stone:0,grain:0,food:0,planks:0},buildings:{townhall:{level:20}},notifications:[]};normalizeAdventures(s);return s;}
function start(s,kind,extra={}){assert.equal(adventureAction(s,{type:'adventureStart',kind,...extra}).ok,true);return s.adventures.active;}
function reload(s){const r=copy(s);normalizeAdventures(r,r);return r;}
function input(s,command,extra={}){return adventureAction(s,{type:'adventureInput',adventureId:s.adventures.active.id,command,...extra});}

test('a host-confirmed pause preserves visible cargo even if serialized before catch-up',()=>{
 let s=island();const r=start(s,'cargoRain');advanceAdventures(s,2);const drop=r.data.drops[0],before=drop.appearAt;
 assert.deepEqual(pauseAdventureFor(s,r.id,60),{ok:true,pausedSeconds:60});assert.equal(drop.appearAt,before+60);
 s=reload(s);advanceAdventures(s,30);s=reload(s);advanceAdventures(s,30);
 assert.equal(s.adventures.active.stage,'catch');assert.equal(input(s,'catch',{dropId:drop.id}).ok,true);assert.equal(s.resources.coins,105);
 assert.equal(input(s,'catch',{dropId:drop.id}).ok,false);assert.equal(s.resources.coins,105);
 assert.equal(s.adventures.active.recoveryPauseRemaining,undefined);
});

test('ordinary absence still ends the cargo event and does not award missed cargo',()=>{
 const s=island();start(s,'cargoRain');advanceAdventures(s,62);assert.equal(s.adventures.active.stage,'complete');assert.equal(s.resources.coins,100);
});

test('signals retain their preview after a confirmed interruption rather than consuming it',()=>{
 let s=island();const r=start(s,'signals');pauseAdventureFor(s,r.id,40);s=reload(s);advanceAdventures(s,40);assert.equal(s.adventures.active.stage,'memorize');advanceAdventures(s,6);assert.equal(s.adventures.active.stage,'repeat');
});

test('a marble story keeps its physical position during a known network pause',()=>{
 let s=island();const r=start(s,'islandPuzzle',{puzzleKind:'marbleMaze'});input(s,'puzzleMove',{move:{type:'tilt',tiltX:.4,tiltY:0}});advanceAdventures(s,.4);const before=copy(r.data.puzzle.data.miniGame.balls);
 pauseAdventureFor(s,r.id,30);s=reload(s);advanceAdventures(s,30);assert.deepEqual(s.adventures.active.data.puzzle.data.miniGame.balls,before);
});

test('pause is bounded, identity-scoped and does not create rewards',()=>{
 const s=island(),r=start(s,'cargoRain');for(const seconds of[-1,NaN,Infinity,2678401])assert.equal(pauseAdventureFor(s,r.id,seconds).ok,false);assert.equal(pauseAdventureFor(s,'other-run',30).ok,false);assert.equal(s.resources.coins,100);assert.equal(r.startedAt,0);
});
