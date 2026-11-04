import test from 'node:test';
import assert from 'node:assert/strict';
import { createIslandPuzzle, normalizeIslandPuzzle, applyIslandPuzzle, recordIslandPuzzleTick, islandPuzzleSolution, getIslandPuzzleView, validateIslandPuzzle, ISLAND_PUZZLE_KINDS } from '../harborlight-v1-island-puzzles.js';
import { STORY_CATALOG, ISLAND_PUZZLE_CATALOG, storyRoomKinds } from '../harborlight-v1-story-catalog.js';
import { normalizeAdventures, adventureAction, adventureChoices, advanceAdventures } from '../harborlight-v1-adventures.js';
const NOW=Date.parse('2026-11-04T12:00:00Z');
const copy=x=>JSON.parse(JSON.stringify(x));
function island(){const s={worldTimeMs:NOW,activityClock:0,activitySeed:1234567,resources:{coins:100,wood:100,stone:100,grain:100,food:100,planks:100},buildings:{townhall:{level:20}},notifications:[]};normalizeAdventures(s);return s;}
function reload(s){const raw=copy(s),next=copy(s);normalizeAdventures(next,raw);return next;}
function mazeWaypoints(p){const g=p.data.miniGame,cols=3,cell=184,start=Math.max(0,Math.min(8,Math.floor((g.balls[0].y-24)/cell)*3+Math.floor((g.balls[0].x-24)/cell))),goal=Math.floor((g.goals[0].y-24)/cell)*3+Math.floor((g.goals[0].x-24)/cell),q=[start],prev=new Map([[start,null]]);const xy=i=>({x:24+(i%3+.5)*cell,y:24+(Math.floor(i/3)+.5)*cell});for(const i of q){if(i===goal)break;const a=xy(i);for(const j of[i-3,i+3,i-1,i+1]){if(j<0||j>8||Math.abs(Math.floor(i/3)-Math.floor(j/3))+Math.abs(i%3-j%3)!==1||prev.has(j))continue;const b=xy(j),x=(a.x+b.x)/2,y=(a.y+b.y)/2;if(g.walls.some(w=>x>=w.x&&x<=w.x+w.width&&y>=w.y&&y<=w.y+w.height))continue;prev.set(j,i);q.push(j);}}assert.ok(prev.has(goal),'generated maze must have a route');const path=[];for(let i=goal;i!==null;i=prev.get(i))path.unshift(xy(i));return path.slice(1);}
function solve(p,send=move=>applyIslandPuzzle(p,move),advance=seconds=>recordIslandPuzzleTick(p,seconds)){
 if(p.kind!=='marbleMaze'){for(const move of islandPuzzleSolution(p)){if(p.solved)break;const r=send(move);assert.equal(r.ok,true,`${p.kind}: ${JSON.stringify(move)}: ${r.message}`);}assert.equal(p.solved,true,p.kind);return;}
 for(const goal of mazeWaypoints(p)){
  for(let steps=0;steps<600&&!p.solved;steps++){
   const b=p.data.miniGame.balls[0],dx=goal.x-b.x,dy=goal.y-b.y;
   if(Math.hypot(dx,dy)<6&&Math.hypot(b.vx,b.vy)<22)break;
   const tiltX=Math.max(-1,Math.min(1,dx*.018-b.vx*.014)),tiltY=Math.max(-1,Math.min(1,dy*.018-b.vy*.014));
   assert.equal(send({type:'tilt',tiltX,tiltY}).ok,true);advance(.05);
  }
 }
 assert.equal(p.solved,true,'marble must reach the real generated target through its walls');
}
function start(s,action){const result=adventureAction(s,{type:'adventureStart',...action});assert.equal(result.ok,true,result.message);return s.adventures.active;}
function input(s,command,extra={},ctx={}){return adventureAction(s,{type:'adventureInput',adventureId:s.adventures.active.id,command,...extra},ctx);}

test('twenty-two concrete mechanics have generated solvable boards for every variant and representative levels',()=>{
 assert.equal(ISLAND_PUZZLE_KINDS.length,22);assert.equal(ISLAND_PUZZLE_CATALOG.length,22);
 let checked=0;
 for(const kind of ISLAND_PUZZLE_KINDS)for(let seed=1;seed<=25;seed++)for(let variant=1;variant<=5;variant++){
  const p=createIslandPuzzle(kind,{seed:seed*271,variant,level:[1,5,10,20][seed%4]});
  assert.equal(p.solved,false,`fresh board ${kind}`);assert.equal(validateIslandPuzzle(p),true,kind);
  if(kind!=='marbleMaze')solve(p);else if(seed<=3)solve(p);
  checked++;
 }
 assert.equal(checked,2750);
});

test('saved partial moves, free hints, undo and reset preserve actual state without claimed solved flags',()=>{
 for(const kind of ISLAND_PUZZLE_KINDS.filter(k=>k!=='marbleMaze')){
  let p=createIslandPuzzle(kind,{seed:912,variant:3,clock:21});
  const move=islandPuzzleSolution(p)[0];assert.equal(applyIslandPuzzle(p,move).ok,true,kind);
  const snapshot=copy(p.data);applyIslandPuzzle(p,{type:'hint'});
  p=normalizeIslandPuzzle(copy(p));assert.deepEqual(p.data,snapshot,kind);assert.equal(p.hints,1);
  assert.equal(applyIslandPuzzle(p,{type:'undo'}).ok,true,kind);
  assert.equal(p.solved,false,kind);solve(p);
  const saved=copy(p);saved.solved=false;const normalized=normalizeIslandPuzzle(saved);assert.equal(normalized.solved,true,kind);
  const forged=createIslandPuzzle(kind,{seed:342});forged.solved=true;forged.data.complete=true;
  assert.equal(normalizeIslandPuzzle(copy(forged)).solved,false,`${kind} does not trust a solved flag`);
 }
});

test('all one hundred connected stories finish through real inputs and keep proof across every room reload',()=>{
 assert.equal(STORY_CATALOG.length,20);
 let complete=0;
 for(const story of STORY_CATALOG)for(let variant=1;variant<=5;variant++){
  let s=island();start(s,{kind:'escapeStory',storyId:story.id,variant});
  let paid=0;
  const ctx={claimAdventureReward(state,payload){paid++;assert.equal(payload.storyId,story.id);state.resources.coins+=7;return{reward:{coins:7},practice:false};}};
  while(s.adventures.active.stage!=='complete'){
   const run=s.adventures.active,p=run.data.puzzle;
   assert.equal(input(s,'puzzleNextRoom',{},ctx).ok,false,'cannot advance an unsolved room');
   solve(p,move=>input(s,'puzzleMove',{move},ctx),seconds=>advanceAdventures(s,seconds));
   s=reload(s);
   assert.equal(s.adventures.active.data.puzzle.solved,true,`${story.id}/${variant}/${p.kind} keeps solved proof`);
   const result=input(s,'puzzleNextRoom',{},ctx);assert.equal(result.ok,true,result.message);
   s=reload(s);
  }
  const run=s.adventures.active;
  assert.equal(run.data.story.completedRooms.length,story.mechanics.length);
  assert.equal(s.adventures.completedEscapeStories[story.id],1);assert.equal(paid,1);
  const again=input(s,'puzzleNextRoom',{},ctx);assert.equal(again.duplicate,true);assert.equal(paid,1);
  assert.equal(s.resources.coins,107);complete++;
 }
 assert.equal(complete,100);
});

test('variants alter connected-room solutions rather than only the displayed story title',()=>{
 for(const story of STORY_CATALOG){const signatures=new Set();for(let variant=1;variant<=5;variant++){const s=island();start(s,{kind:'escapeStory',storyId:story.id,variant});signatures.add(JSON.stringify({kinds:storyRoomKinds(story,variant),seed:s.adventures.active.data.puzzle.seed,data:s.adventures.active.data.puzzle.data}));}assert.equal(signatures.size,5,story.id);}
});

test('story proof rejects forged room indices, completed rooms and player-supplied payouts',()=>{
 let s=island(),run=start(s,{kind:'escapeStory',storyId:'captainless-ship',variant:1});
 assert.equal(input(s,'puzzleNextRoom',{solved:true,reward:{coins:999999},residentsAccepted:54}).ok,false);
 const raw=copy(s);raw.adventures.active.data.story.roomIndex=5;raw.adventures.active.stage='complete';raw.adventures.active.claimed=true;
 s=reload(raw);run=s.adventures.active;assert.equal(run.data.story.roomIndex,0);assert.notEqual(run.stage,'complete');assert.equal(s.resources.coins,100);
});

test('free practice remains available when the shared economic budget has been exhausted',()=>{
 const s=island();s.adventureBudget={version:1,day:'2026-11-04',highestLevel:20,dailyLimit:2000,dailySpent:2000,chapters:{'chapter-20':{limit:3000,spent:3000}},receipts:[]};
 const options=adventureChoices(s).filter(c=>c.kind==='islandPuzzle');assert.equal(options.length,22);assert.ok(options.every(c=>c.available&&c.practice));
 const run=start(s,{kind:'islandPuzzle',puzzleKind:'gull'});solve(run.data.puzzle,move=>input(s,'puzzleMove',{move}));
 const result=input(s,'puzzleNextRoom');assert.equal(result.completed,true);assert.equal(result.practice,true);assert.equal(s.resources.coins,100);
});

test('completed canonical story variants never ask their reward coordinator to pay a second time',()=>{
 let s=island(),paid=0;const ctx={claimAdventureReward(){paid++;return{reward:{coins:1}};}};
 for(let replay=0;replay<2;replay++){
  start(s,{kind:'escapeStory',storyId:'first-light',variant:1});
  while(s.adventures.active.stage!=='complete'){const p=s.adventures.active.data.puzzle;solve(p,move=>input(s,'puzzleMove',{move},ctx));input(s,'puzzleNextRoom',{},ctx);}
  s=reload(s);
 }
 assert.equal(paid,1);assert.equal(s.adventures.completedEscapeStories['first-light'],2);
});

test('different saved stories and an old adventure resume independently',()=>{
 let s=island();const first=start(s,{kind:'escapeStory',storyId:'first-light',variant:2}),move=islandPuzzleSolution(first.data.puzzle)[0];input(s,'puzzleMove',{move});
 start(s,{kind:'escapeStory',storyId:'captainless-ship',variant:3});
 start(s,{kind:'bridge'});s=reload(s);
 const resumed=start(s,{kind:'escapeStory',storyId:'first-light',variant:2});assert.equal(resumed.id,first.id);assert.equal(resumed.data.puzzle.moves,1);
});

test('English and Polish puzzle views provide usable moves, clues and no hidden win action',()=>{
 for(const kind of ISLAND_PUZZLE_KINDS)for(const language of['pl','en']){
  const p=createIslandPuzzle(kind,{seed:19,variant:2}),v=getIslandPuzzleView(p,language);
  assert.equal(v.kind,kind);assert.ok(v.title&&v.instruction&&v.clues.length);
  assert.ok(v.miniGame||[...v.items,...v.targets,...v.controls,...(v.grid?.cells||[])].some(item=>item.move));
  assert.ok(!JSON.stringify(v).includes('"type":"win"'));
 }
});

test('a previously discovered story can settle two different canonical rescue contracts without repeating its ordinary reward',()=>{
 let s=island(),calls=[];
 for(const id of['chapter-3-help','chapter-4-help']){
  const rescueContext={source:'campaign',missionId:id,chapterId:id,receiptId:'rescue-contract-'+id};
  const ctx={adventureRescueContext:rescueContext,claimAdventureReward(_state,payload){calls.push(copy(payload));return{reward:payload.reward,residentsAccepted:2,recruitmentReceiptId:rescueContext.receiptId};}};
  const r=adventureAction(s,{type:'adventureStart',kind:'escapeStory',storyId:'captainless-ship',variant:1},ctx);assert.equal(r.ok,true);
  s=reload(s);assert.deepEqual(s.adventures.active.data.rescueContext,rescueContext);
  while(s.adventures.active.stage!=='complete'){const p=s.adventures.active.data.puzzle;solve(p,move=>input(s,'puzzleMove',{move},ctx));const result=input(s,'puzzleNextRoom',{},ctx);if(result.completed)assert.equal(result.residentsAccepted,2);}
  s=reload(s);
 }
 assert.equal(calls.length,2);assert.notEqual(calls[0].completionReceiptId,calls[1].completionReceiptId);
 assert.ok(calls[0].reward.coins>0);assert.ok(Object.values(calls[1].reward).every(v=>v===0));
});

test('visible search clues identify one object and a failed settlement can be retried after reload',()=>{
 for(let seed=1;seed<=100;seed++)for(let variant=1;variant<=5;variant++){
  const p=createIslandPuzzle('hiddenObjects',{seed,variant}),d=p.data;
  assert.deepEqual(d.objects.filter(o=>o.color===d.color&&o.symbol===d.symbol).map(o=>Number(o.id)),[d.target]);
 }
 let s=island();start(s,{kind:'escapeStory',storyId:'first-light',variant:1});
 const reject={claimAdventureReward(){return{ok:false,message:'Temporarily unavailable'};}};
 while(s.adventures.active.data.story.roomIndex<s.adventures.active.data.story.roomCount-1){const p=s.adventures.active.data.puzzle;solve(p,move=>input(s,'puzzleMove',{move},reject));input(s,'puzzleNextRoom',{},reject);}
 const p=s.adventures.active.data.puzzle;solve(p,move=>input(s,'puzzleMove',{move},reject));assert.equal(input(s,'puzzleNextRoom',{},reject).ok,false);
 s=reload(s);assert.equal(s.adventures.active.stage,'roomComplete');
 const result=input(s,'puzzleNextRoom',{}, {claimAdventureReward(){return{reward:{coins:5}};}});assert.equal(result.completed,true);
});

test('unknown prototype kinds and claimed wins do not enter the puzzle model',()=>{
 for(const kind of['constructor','__proto__','toString'])assert.equal(normalizeIslandPuzzle({version:1,kind,seed:1}),null);
 for(const kind of ISLAND_PUZZLE_KINDS){const p=createIslandPuzzle(kind,{seed:3});assert.equal(applyIslandPuzzle(p,{type:'win',solved:true,reward:999999}).ok,false);assert.equal(p.solved,false);}
});

test('a long absence clears a memory mismatch and preserves the same saved clock without a deadline',()=>{
 let p=createIslandPuzzle('memoryTriples',{seed:17,clock:40});const seen=new Set(),indices=[];p.data.miniGame.cards.forEach((v,i)=>{if(!seen.has(v)&&indices.length<3){indices.push(i);seen.add(v);}});
 for(const index of indices)applyIslandPuzzle(p,{type:'reveal',index});assert.equal(p.data.miniGame.revealed.length,3);
 recordIslandPuzzleTick(p,100000);const before=p.clock;p=normalizeIslandPuzzle(copy(p));assert.equal(p.clock,before);assert.equal(p.data.miniGame.revealed.length,0);solve(p);
});

test('twelve thousand legal memory inputs and ticks checkpoint without losing the current board or blocking play',()=>{
 let p=createIslandPuzzle('memoryTriples',{seed:912,variant:3}),clock=0;
 for(let round=0;round<3000;round++){
  const symbols=new Set(),indices=[];p.data.miniGame.cards.forEach((v,i)=>{if(!symbols.has(v)&&indices.length<3){symbols.add(v);indices.push(i);}});
  for(const index of indices)assert.equal(applyIslandPuzzle(p,{type:'reveal',index}).ok,true);
  recordIslandPuzzleTick(p,.9);clock+=.9;
  if(round%151===0){const before=copy(p.data);p=normalizeIslandPuzzle(copy(p));assert.deepEqual(p.data,before);}
  assert.ok(p.log.length<64);assert.ok(JSON.stringify(p).length<16000);
 }
 assert.ok(p.clock>2600);assert.ok(p.checkpoint);solve(p);assert.equal(p.solved,true);
});

test('twelve thousand physical controls never fill a move log or strand a marble player',()=>{
 let p=createIslandPuzzle('marbleMaze',{seed:43});
 for(let i=0;i<12000;i++){
  assert.equal(applyIslandPuzzle(p,{type:'tilt',tiltX:i%2?.01:-.01,tiltY:0}).ok,true);recordIslandPuzzleTick(p,.02);
  if(i%1000===0)p=normalizeIslandPuzzle(copy(p));
 }
 assert.equal(p.log.length,0);assert.ok(JSON.stringify(p).length<10000);assert.equal(p.moves,12000);solve(p);
});

test('thirty-two parked six-room stories and one active story fit a real cloud-world document',async()=>{
 const{createState}=await import('../harborlight-v1-state.js');
 let s=createState(NOW,{onboarding:false});s.buildings.townhall.level=20;
 const cases=STORY_CATALOG.filter(story=>story.mechanics.length===6).flatMap(story=>Array.from({length:5},(_,i)=>({story,variant:i+1}))).slice(0,33);assert.equal(cases.length,33);
 for(const{story,variant}of cases){
  start(s,{kind:'escapeStory',storyId:story.id,variant});
  while(s.adventures.active.data.story.roomIndex<5){const p=s.adventures.active.data.puzzle;solve(p,move=>input(s,'puzzleMove',{move}),seconds=>advanceAdventures(s,seconds));assert.equal(input(s,'puzzleNextRoom').ok,true);}
  const p=s.adventures.active.data.puzzle;
  // Long real sessions: try an actual move, undo, and retain the room for later.
  if(p.kind!=='marbleMaze'){for(let i=0;i<100;i++){const move=islandPuzzleSolution(p)[0];assert.equal(input(s,'puzzleMove',{move}).ok,true);assert.equal(input(s,'puzzleUndo').ok,true);}}
 }
 assert.equal(Object.keys(s.adventures.parked).length,32);
 const bytes=Buffer.byteLength(JSON.stringify(s));assert.ok(bytes<500000,`cloud world is ${bytes} bytes`);
 const before=copy(s.adventures);s=reload(s);assert.equal(Object.keys(s.adventures.parked).length,32);
 assert.equal(s.adventures.active.data.story.roomIndex,5);
 assert.ok(Buffer.byteLength(JSON.stringify(s))<500000);
 console.log(`v31 maximum parked-story stress: ${bytes} bytes before reload, ${Buffer.byteLength(JSON.stringify(s))} after; cloud document limit700000`);
});

test('suspending a standalone or story marble freezes its board until actual resumption',()=>{
 for(const action of[{kind:'islandPuzzle',puzzleKind:'marbleMaze'},{kind:'escapeStory',storyId:'merchant-rescue',variant:1}]){
  let s=island(),run=start(s,action);assert.equal(run.data.puzzle.kind,'marbleMaze');
  assert.equal(input(s,'puzzleMove',{move:{type:'tilt',tiltX:.5,tiltY:0}}).ok,true);advanceAdventures(s,.25);
  const before=copy(run.data.puzzle),id=run.id;
  assert.equal(adventureAction(s,{type:'adventureSuspend'}).ok,true);advanceAdventures(s,1);advanceAdventures(s,300);
  assert.equal(s.adventures.clock,301.25);assert.equal(s.adventures.active,null);
  const parked=Object.values(s.adventures.parked).find(r=>r.id===id);assert.deepEqual(copy(parked.data.puzzle),before);
  s=reload(s);run=start(s,action);assert.equal(run.id,id);assert.deepEqual(copy(run.data.puzzle),before);
  advanceAdventures(s,.25);assert.ok(run.data.puzzle.clock>before.clock);assert.notDeepEqual(run.data.puzzle.data.miniGame.balls,before.data.miniGame.balls);
 }
});

test('parking a legacy cargo event still consumes its ordinary timer while library play continues',()=>{
 const s=island(),cargo=start(s,{kind:'cargoRain'});advanceAdventures(s,2);
 start(s,{kind:'islandPuzzle',puzzleKind:'gull'});advanceAdventures(s,45);
 assert.equal(s.adventures.parked.cargoRain.id,cargo.id);assert.equal(s.adventures.parked.cargoRain.stage,'complete');assert.equal(s.resources.coins,100);
 assert.equal(s.adventures.active.kind,'islandPuzzle');assert.equal(s.adventures.active.stage,'puzzle');
});

test('trusted assistance attaches to an active or parked unfinished story without restarting its earned rooms',()=>{
 for(const parked of[false,true]){
  let s=island();const first=start(s,{kind:'escapeStory',storyId:'captainless-ship',variant:1});
  solve(first.data.puzzle,move=>input(s,'puzzleMove',{move}));input(s,'puzzleNextRoom');
  const partial=first.data.puzzle;assert.equal(applyIslandPuzzle(partial,islandPuzzleSolution(partial)[0]).ok,true);
  const before=copy(first.data),id=first.id;
  if(parked)start(s,{kind:'islandPuzzle',puzzleKind:'gull'});
  const canonical={source:'campaign',missionId:'new-mission',chapterId:'chapter-3',receiptId:'registered-rescue'};let accepted=0;
  const ctx={adventureRescueContext:canonical,claimAdventureReward(_state,payload){assert.deepEqual(payload.rescueContext,canonical);accepted++;return{reward:{},residentsAccepted:3,recruitmentReceiptId:canonical.receiptId};}};
  const result=adventureAction(s,{type:'adventureStart',kind:'escapeStory',storyId:'captainless-ship',variant:1,rescueContext:{source:'player',residentsRequested:999}},ctx);
  assert.equal(result.ok,true);assert.equal(s.adventures.active.id,id);assert.equal(s.adventures.active.data.story.roomIndex,1);
  assert.deepEqual(s.adventures.active.data.puzzle,before.puzzle);assert.deepEqual(s.adventures.active.data.story,before.story);
  s=reload(s);assert.deepEqual(s.adventures.active.data.rescueContext,canonical);
  while(s.adventures.active.stage!=='complete'){const p=s.adventures.active.data.puzzle;solve(p,move=>input(s,'puzzleMove',{move},ctx));const done=input(s,'puzzleNextRoom',{},ctx);if(done.completed)assert.equal(done.residentsAccepted,3);}
  assert.equal(accepted,1);input(s,'puzzleNextRoom',{},ctx);assert.equal(accepted,1);
 }
});

test('only new trusted host context can replace a stale contract on an unfinished story',()=>{
 for(const parked of[false,true]){
  let s=island();const old={source:'campaign',missionId:'old-mission',chapterId:'chapter-2',receiptId:'old-contract'};
  assert.equal(adventureAction(s,{type:'adventureStart',kind:'escapeStory',storyId:'captainless-ship',variant:1},{adventureRescueContext:old}).ok,true);
  const run=s.adventures.active;solve(run.data.puzzle,move=>input(s,'puzzleMove',{move}));input(s,'puzzleNextRoom');
  if(parked)start(s,{kind:'islandPuzzle',puzzleKind:'gull'});
  adventureAction(s,{type:'adventureStart',kind:'escapeStory',storyId:'captainless-ship',variant:1,rescueContext:{source:'campaign',missionId:'forged',chapterId:'forged',receiptId:'forged'}});
  assert.deepEqual(s.adventures.active.data.rescueContext,old,'raw action cannot replace a registered contract');
  const canonical={source:'campaign',missionId:'current-mission',chapterId:'chapter-3',receiptId:'current-contract'};
  adventureAction(s,{type:'adventureStart',kind:'escapeStory',storyId:'captainless-ship',variant:1},{adventureRescueContext:canonical});
  s=reload(s);assert.equal(s.adventures.active.id,run.id);assert.equal(s.adventures.active.data.story.roomIndex,1);assert.deepEqual(s.adventures.active.data.rescueContext,canonical);
 }
});

test('a full set of thirty-two parked adventures permits swapping, rejects overflow and admits a new start after completion',()=>{
 let s=island();const first=start(s,{kind:'islandPuzzle',puzzleKind:'gull'}),firstId=first.id;
 assert.equal(input(s,'puzzleMove',{move:{type:'choose',index:0}}).ok,true);const firstBoard=copy(first.data.puzzle);
 for(const puzzleKind of ISLAND_PUZZLE_KINDS.filter(kind=>kind!=='gull'))start(s,{kind:'islandPuzzle',puzzleKind});
 const storyStarts=STORY_CATALOG.flatMap(story=>Array.from({length:5},(_,i)=>({kind:'escapeStory',storyId:story.id,variant:i+1}))).slice(0,11);
 for(const action of storyStarts)start(s,action);
 assert.equal(Object.keys(s.adventures.parked).length,32);const formerActiveId=s.adventures.active.id;
 const fresh={type:'adventureStart',kind:'escapeStory',storyId:'homecoming',variant:5},before=copy(s);
 const overflow=adventureAction(s,fresh);assert.equal(overflow.ok,false,'cannot add a thirty-third parked unfinished adventure');assert.deepEqual(copy(s),before,'rejected overflow changes no progress, resource or sequence');
 const resumed=start(s,{kind:'islandPuzzle',puzzleKind:'gull'});assert.equal(resumed.id,firstId);assert.deepEqual(copy(resumed.data.puzzle),firstBoard);assert.equal(Object.keys(s.adventures.parked).length,32);assert.ok(Object.values(s.adventures.parked).some(run=>run.id===formerActiveId));
 s=reload(s);assert.equal(s.adventures.active.id,firstId);assert.deepEqual(copy(s.adventures.active.data.puzzle),firstBoard);assert.equal(Object.keys(s.adventures.parked).length,32);
 assert.equal(adventureAction(s,fresh).ok,false);
 solve(s.adventures.active.data.puzzle,move=>input(s,'puzzleMove',{move}));assert.equal(input(s,'puzzleNextRoom').completed,true);assert.equal(s.adventures.active.stage,'complete');
 assert.equal(adventureAction(s,fresh).ok,true,'a completed active run needs no parked slot');assert.equal(s.adventures.active.data.story.storyId,'homecoming');assert.equal(Object.keys(s.adventures.parked).length,32);
 s=reload(s);assert.equal(Object.keys(s.adventures.parked).length,32);assert.equal(s.adventures.active.data.story.storyId,'homecoming');assert.equal(s.resources.coins,100);
});
