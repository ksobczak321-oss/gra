import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createIslandPuzzle,normalizeIslandPuzzle,applyIslandPuzzle,islandPuzzleSolution,islandPuzzleProof,getIslandPuzzleView,ISLAND_PUZZLE_KINDS} from '../harborlight-v1-island-puzzles.js';
import {createHarborRoutes,availableConvoyIds,createOriginalAttempt,applyOriginalInput,advanceOriginalAttempt,normalizeOriginalPuzzles,originalPuzzleAction,nextOriginalPuzzleEvent,advanceOriginalPuzzles} from '../harborlight-v1-original-puzzles.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const changed=['crabs','parrot','packing','untangle','navigation','optics','hotel','invention','cooking','hiddenObjects','harbor-routes'];
const move=(p,m)=>{const result=applyIslandPuzzle(p,m);assert.equal(result.ok,true,`${p.kind}: ${JSON.stringify(m)} ${result.message}`);return result;};
const solve=p=>{for(const action of islandPuzzleSolution(p)){if(p.solved)break;move(p,action);}assert.equal(p.solved,true,p.kind);};

for(const kind of changed)test(`feedback ${kind}: five variants and twenty deterministic seeds solve and restore through legal moves`,()=>{
 for(let seed=1;seed<=20;seed++)for(let variant=1;variant<=5;variant++){
  const p=createIslandPuzzle(kind,{seed:seed*1193,variant,difficulty:variant});
  assert.equal(p.generatorVersion,2);assert.equal(p.solved,false,`${kind} starts with real work`);
  solve(p);const restored=normalizeIslandPuzzle(islandPuzzleProof(p));assert.ok(restored,kind);assert.equal(restored.solved,true,kind);assert.deepEqual(restored.data,p.data,kind);
 }
});

test('immutable pre-update partial boards and completed proofs replay with their original generators',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./fixtures/harborlight-puzzles-before-20261122.json',import.meta.url)));
 assert.equal(fixtures.source,'ab0f914dda59b0ec830d7e3a6aa23eb36a5a4fb4');assert.equal(fixtures.rows.length,46);
 for(const row of fixtures.rows){assert.equal(row.raw.generatorVersion,undefined);const p=normalizeIslandPuzzle(row.raw);assert.ok(p,`${row.kind}/${row.phase}`);assert.equal(p.generatorVersion,undefined);assert.deepEqual(p.data,row.expectedData,`${row.kind}/${row.phase}`);assert.equal(p.solved,row.expectedSolved);}
 const state={worldTimeMs:0,resources:{coins:100},buildings:{townhall:{level:1}}};
 normalizeOriginalPuzzles(state,{originalPuzzles:{version:1,sequence:1,seed:912,attempts:{'harbor-routes':fixtures.originalWon}}});
 const saved=state.originalPuzzles.attempts['harbor-routes'];assert.equal(saved.status,'won');assert.equal(saved.boardVersion,undefined);assert.deepEqual(saved.board,fixtures.originalWon.board);
});

test('convoy density is at least ten and independent geometric exits always empty every generated board',()=>{
 let sawBlocked=false;
 for(let seed=1;seed<=60;seed++)for(const difficulty of[1,2,3,4,5,1000]){
  const b=createHarborRoutes(difficulty,seed);assert.ok(b.paths.length>=10);const used=new Set();
  for(const path of b.paths)for(const [x,y]of path.cells){const key=x+','+y;assert.equal(used.has(key),false,'convoys may not overlap');used.add(key);}
  while(b.removed.length<b.paths.length){const remaining=b.paths.filter(p=>!b.removed.includes(p.id)),free=remaining.filter(p=>{let[x,y]=p.cells.at(-1);const[dx,dy]=p.direction;for(x+=dx,y+=dy;x>=0&&y>=0&&x<b.size&&y<b.size;x+=dx,y+=dy)if(remaining.some(q=>q!==p&&q.cells.some(c=>c[0]===x&&c[1]===y)))return false;return true;}).map(p=>p.id);assert.deepEqual([...availableConvoyIds(b)].sort(),[...free].sort());assert.ok(free.length);if(free.length<remaining.length)sawBlocked=true;b.removed.push(free[0]);}
 }
 assert.equal(sawBlocked,true,'there are actual ordering dependencies');
});

test('one crab must remember its route; a wrong adjacent cell resets it without moving other characters',()=>{
 const p=createIslandPuzzle('crabs',{seed:43,variant:5});assert.equal(p.data.revealing,true);assert.equal(p.data.crabs,undefined);assert.ok(p.data.path.length>=11);
 assert.equal(applyIslandPuzzle(p,{type:'navigate',index:p.data.path[1]}).ok,false,'preview is observation');
 move(p,{type:'submit'});move(p,{type:'navigate',index:p.data.path[1]});
 const at=p.data.position,next=p.data.path[p.data.step+1],wrong=[at-5,at+5,at-1,at+1].find(i=>i>=0&&i<25&&i!==next&&Math.abs(Math.floor(i/5)-Math.floor(at/5))+Math.abs(i%5-at%5)===1);
 move(p,{type:'navigate',index:wrong});assert.equal(p.data.position,0);assert.equal(p.data.step,0);assert.equal(p.data.revealing,false);move(p,{type:'reveal'});assert.equal(p.data.revealing,true);solve(p);
});

test('parrot accepts individual unused letters, preserves English answers and rejects a wrong anagram',()=>{
 const p=createIslandPuzzle('parrot',{seed:16}),v=getIslandPuzzleView(p,'en');const letters=v.controls.filter(c=>c.id.startsWith('letter-'));assert.ok(letters.length>=3);assert.ok(letters.every(c=>[...c.label].length===1));
 move(p,letters[0].move);assert.equal(applyIslandPuzzle(p,letters[0].move).ok,false,'the same tile cannot be reused');move(p,{type:'submit'});assert.equal(p.data.wordIndex,0);assert.equal(p.data.entered.length,0);
 const a=getIslandPuzzleView(p,'en').controls.find(c=>c.id.startsWith('letter-'));move(p,a.move);const restored=normalizeIslandPuzzle(copy(p));assert.deepEqual(restored.data,p.data);solve(restored);assert.equal(restored.solved,true);
});

test('packing pieces contain genuine notches and all sixteen cells must be covered without overlap',()=>{
 const p=createIslandPuzzle('packing',{seed:92});assert.ok(p.data.items.some(item=>item.shape.length<(Math.max(...item.shape.map(c=>c[0]))+1)*(Math.max(...item.shape.map(c=>c[1]))+1)));
 solve(p);const grid=getIslandPuzzleView(p).grid.cells;assert.equal(grid.filter(cell=>cell.tone==='active').length,16);assert.equal(new Set(p.data.items.map(item=>item.at)).size,4);
});

test('untangle uses an eight-anchor graph rather than matching sorted left/right numbers',()=>{
 const p=createIslandPuzzle('untangle',{seed:44});const before=getIslandPuzzleView(p);assert.equal(p.data.positions.length,8);assert.ok(before.connections.length>8);assert.ok(before.connections.some(c=>c.crossed));assert.ok(before.connections.every(c=>c.straight));assert.ok(before.items.every(item=>!/^\d+$/.test(item.label)));solve(p);assert.equal(getIslandPuzzleView(p).connections.some(c=>c.crossed),false);
});

test('fog hides reefs; discovering one returns the boat to the start and stays visible through reload',()=>{
 const p=createIslandPuzzle('navigation',{seed:64});assert.equal(getIslandPuzzleView(p).grid.cells.filter(c=>c.tone==='obstacle').length,0);
 let found=false;const walls=new Set(p.data.walls),queue=[[0]],seen=new Set([0]);
 while(queue.length&&!found){const path=queue.shift(),at=path.at(-1);for(const n of[at-6,at+6,at-1,at+1]){if(n<0||n>=36||Math.abs(Math.floor(at/6)-Math.floor(n/6))+Math.abs(at%6-n%6)!==1)continue;if(walls.has(n)){for(const index of path.slice(1))move(p,{type:'navigate',index});move(p,{type:'navigate',index:n});assert.equal(p.data.position,0);assert.deepEqual(p.data.route,[0]);assert.ok(p.data.discovered.includes(n));found=true;break;}if(!seen.has(n)){seen.add(n);queue.push([...path,n]);}}}
 assert.equal(found,true);const restored=normalizeIslandPuzzle(copy(p));assert.deepEqual(restored.data,p.data);solve(restored);
});

test('light puzzle needs a six-mirror route and hotel validates a global compatible room assignment',()=>{
 const light=createIslandPuzzle('optics',{seed:14});assert.equal(light.data.mirrors.length,6);assert.equal(getIslandPuzzleView(light).grid.cells.length,49);solve(light);
 const hotel=createIslandPuzzle('hotel',{seed:14});assert.equal(hotel.data.guests.length,6);assert.ok(hotel.data.guests.some(g=>hotel.data.rooms.filter(r=>r.beds>=g.needs.beds&&(g.needs.sea===null||r.sea===g.needs.sea)&&r.floor<=g.needs.maxFloor).length>1));solve(hotel);
 const assigned=new Set();for(const guest of hotel.data.guests){const room=hotel.data.rooms[guest.at];assert.ok(room.beds>=guest.needs.beds);assert.ok(room.floor<=guest.needs.maxFloor);assert.ok(guest.needs.sea===null||room.sea===guest.needs.sea);assigned.add(guest.at);}assert.equal(assigned.size,6);
});

test('inventions require compatible rated parts, and cooking permits real ingredient and temperature mistakes',()=>{
 const p=createIslandPuzzle('invention',{seed:914});assert.equal(p.data.parts.length,9);for(const index of p.data.parts.map((part,index)=>part.role==='reach'?index:null).filter(index=>index!==null))move(p,{type:'choose',index});move(p,{type:'submit'});assert.equal(p.solved,false,'three poles do not form a working invention');solve(p);
 const parts=p.data.selected.map(i=>p.data.parts[i]);assert.equal(new Set(parts.map(x=>x.role)).size,3);assert.equal(new Set(parts.map(x=>x.joint)).size,1);
 const kitchen=createIslandPuzzle('cooking',{seed:914});assert.equal(kitchen.data.pot.length,6);const wrong=kitchen.data.recipes[0].findIndex(n=>n===0);for(let i=0;i<4;i++)move(kitchen,{type:'choose',index:wrong});move(kitchen,{type:'submit'});assert.equal(kitchen.data.served,0);assert.equal(kitchen.data.pot.reduce((a,b)=>a+b,0),0);solve(kitchen);
});

test('generation-two checkpoints remain exact after repeated moves and compact before log growth becomes unbounded',()=>{
 for(const kind of['packing','untangle','crabs','parrot','cooking','navigation']){
  let p=createIslandPuzzle(kind,{seed:397,variant:4});
  for(let i=0;i<90;i++){
   const action=kind==='packing'?{type:'rotate'}:kind==='untangle'?{type:'place',id:'0',target:'1'}:kind==='crabs'?{type:i%2?'reveal':'submit'}:kind==='parrot'?{type:i%2?'clear':'choose',index:0,value:1}:kind==='cooking'?{type:'rotate'}:{type:'reveal'};
   move(p,action);
  }
  assert.ok(p.log.length<64,kind);assert.ok(p.checkpoint,kind);const restored=normalizeIslandPuzzle(copy(p));assert.ok(restored,kind);assert.deepEqual(restored.data,p.data,kind);solve(restored);
 }
});

const world=()=>({ruleset:32,worldTimeMs:1000,resources:{coins:1000},buildings:{townhall:{level:3}}});
test('reading original puzzle instructions never spends time, makes a move or records an exit failure',()=>{
 for(const variant of['signal-line','harbor-routes']){
  const state=world();let result=originalPuzzleAction(state,{type:'originalPuzzleStart',variant,deferStart:true});assert.equal(result.ok,true);
  let attempt=state.originalPuzzles.attempts[variant];const remaining=attempt.remaining;assert.equal(attempt.instructionsPending,true);assert.equal(nextOriginalPuzzleEvent(state),Infinity);
  advanceOriginalPuzzles(state,86400);assert.equal(attempt.remaining,remaining);assert.equal(attempt.status,'active');
  assert.equal(originalPuzzleAction(state,{type:'originalPuzzleInput',variant,input:variant==='signal-line'?{kind:'node',node:attempt.board.starts[0]}:{kind:'convoy',id:availableConvoyIds(attempt.board)[0]}}).code,'instructions-pending');
  assert.equal(originalPuzzleAction(state,{type:'originalPuzzleHint',variant}).code,'instructions-pending');assert.equal(originalPuzzleAction(state,{type:'originalPuzzleTimeChoice',variant,method:'coins'}).code,'instructions-pending');assert.equal(state.resources.coins,1000);
  assert.equal(originalPuzzleAction(state,{type:'originalPuzzleExit',variant}).ok,true);assert.equal(attempt.status,'active');assert.equal(state.originalPuzzles.failures[variant],0);
  const raw=copy(state);normalizeOriginalPuzzles(state,raw);attempt=state.originalPuzzles.attempts[variant];assert.equal(attempt.instructionsPending,true);assert.equal(attempt.remaining,remaining);
  assert.equal(originalPuzzleAction(state,{type:'originalPuzzleBegin',variant}).ok,true);assert.equal(attempt.instructionsPending,undefined);advanceOriginalAttempt(attempt,1);assert.equal(attempt.remaining,remaining-1);assert.ok(Number.isFinite(nextOriginalPuzzleEvent(state)));
 }
});


test('checkpoint undo keeps the exact partial English anagram state after log compaction',()=>{
 const p=createIslandPuzzle('parrot',{seed:24});
 for(let i=0;i<46;i++){move(p,{type:'choose',index:0,value:1});move(p,{type:'clear'});}
 const q=normalizeIslandPuzzle(copy(p));assert.ok(q);assert.deepEqual(q.data,p.data);
 for(let n=0;n<4;n++){assert.equal(applyIslandPuzzle(p,{type:'undo'}).ok,true);assert.equal(applyIslandPuzzle(q,{type:'undo'}).ok,true);assert.deepEqual(q.data,p.data);}
});

test('mixed-language exploration preserves state through saves rather than trusting claimed wins',()=>{
 let state=751,made=0;const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
 for(const kind of['parrot','crabs','packing','untangle','navigation','cooking','hotel','invention','optics','hiddenObjects'])for(let seed=1;seed<=5;seed++){
  const p=createIslandPuzzle(kind,{seed,variant:1+seed%5});
  for(let step=0;step<80&&!p.solved;step++){const view=getIslandPuzzleView(p,step%2?'pl':'en'),actions=[...view.controls,...view.items,...view.targets,...(view.grid?.cells||[])].filter(x=>x.move&&!x.disabled);if(!actions.length)break;const result=applyIslandPuzzle(p,actions[Math.floor(random()*actions.length)].move);if(!result.ok)continue;made++;if(step%7===0){const restored=normalizeIslandPuzzle(copy(p));assert.ok(restored,kind);assert.deepEqual(restored.data,p.data,kind);}}
 }
 assert.ok(made>1500);
});
