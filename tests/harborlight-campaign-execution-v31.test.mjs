import test from 'node:test';
import assert from 'node:assert/strict';

// Deliberately funded independent fixtures prove command reachability, not
// the fifty-day economy. No real account, cloud or provider is accessed.
import * as S from '../harborlight-v1-state.js';
import * as M from '../harborlight-v1-missions.js';
import * as L from '../harborlight-v1-logistics.js';
import {grantBonusMaterials} from '../harborlight-v1-inventory.js';
import {synchronizeResidents} from '../harborlight-v1-residents.js';
import {islandPuzzleSolution} from '../harborlight-v1-island-puzzles.js';
const NOW=Date.parse('2026-11-04T12:00:00Z'),ctx={buildingCost:S.buildingCost,constructionEstimate:L.constructionScheduleEstimate};
function action(s,a){const r=S.act(s,a,s.worldTimeMs);if(!r.ok)throw Error(JSON.stringify({a,r,level:s.buildings.townhall.level,mission:M.missionStatus(s,ctx)}));return r;}
function tick(s,n){S.tick(s,n);M.advanceMissions(s,0,ctx);}
function setup(level){const s=S.createState(NOW);s.tutorial.autoOpenDisabled=true;for(const id of ['townhall','house','warehouse','farm','windmill','lumber','quarry','sawmill'])s.buildings[id].level=level;s.buildings.dock.level=level>=4?1:0;s.buildings.lighthouse.level=level-1;s.population=level===2?13:Math.min(level*24,Math.max(54,level*18));s.capacity=level*24;synchronizeResidents(s);s.resources.coins=1000000;grantBonusMaterials(s,{wood:1000000,stone:1000000,grain:1000000,food:1000000,planks:1000000});M.normalizeMissions(s,{lighthouseMissions:{version:1,campaignEnabled:true,completedLevels:Array.from({length:level-2},(_,i)=>i+2)}});M.advanceMissions(s,0,ctx);for(const id of ['farm','windmill','lumber','quarry','sawmill'])action(s,{type:'assign',building:id,delta:1});action(s,{type:'assign',building:'warehouse',delta:3});if(level>=4)action(s,{type:'assign',building:'dock',delta:1});tick(s,120);return s;}
function mazeWaypoints(p){const g=p.data.miniGame,cell=184,start=Math.max(0,Math.min(8,Math.floor((g.balls[0].y-24)/cell)*3+Math.floor((g.balls[0].x-24)/cell))),goal=Math.floor((g.goals[0].y-24)/cell)*3+Math.floor((g.goals[0].x-24)/cell),q=[start],prev=new Map([[start,null]]),xy=i=>({x:24+(i%3+.5)*cell,y:24+(Math.floor(i/3)+.5)*cell});for(const i of q){if(i===goal)break;const a=xy(i);for(const j of[i-3,i+3,i-1,i+1]){if(j<0||j>8||Math.abs(Math.floor(i/3)-Math.floor(j/3))+Math.abs(i%3-j%3)!==1||prev.has(j))continue;const b=xy(j),x=(a.x+b.x)/2,y=(a.y+b.y)/2;if(g.walls.some(w=>x>=w.x&&x<=w.x+w.width&&y>=w.y&&y<=w.y+w.height))continue;prev.set(j,i);q.push(j);}}if(!prev.has(goal))throw Error('No generated marble route');const path=[];for(let i=goal;i!==null;i=prev.get(i))path.unshift(xy(i));return path.slice(1);}
function solve(s){let guard=0;while(s.adventures.active.stage!=='complete'&&guard++<12){const run=s.adventures.active,p=run.data.puzzle;const send=move=>action(s,{type:'adventureInput',adventureId:run.id,command:'puzzleMove',move});if(p.kind!=='marbleMaze'){for(const move of islandPuzzleSolution(p)){if(p.solved)break;send(move);}}else for(const goal of mazeWaypoints(p))for(let steps=0;steps<600&&!p.solved;steps++){const b=p.data.miniGame.balls[0],dx=goal.x-b.x,dy=goal.y-b.y;if(Math.hypot(dx,dy)<6&&Math.hypot(b.vx,b.vy)<22)break;send({type:'tilt',tiltX:Math.max(-1,Math.min(1,dx*.018-b.vx*.014)),tiltY:Math.max(-1,Math.min(1,dy*.018-b.vy*.014))});tick(s,.05);}if(!p.solved)throw Error('Actual puzzle did not solve '+p.kind);action(s,{type:'adventureInput',adventureId:run.id,command:'puzzleNextRoom'});}if(s.adventures.active.stage!=='complete')throw Error('Unfinished actual story');}

test('all nineteen chapters complete through real commands, puzzles, transport and builds in explicitly funded fixtures',{timeout:120000},()=>{
const rows=[];
for(let level=2;level<=20;level++){
 const s=setup(level);let events=0;const seen=new Set();
 while(!s.lighthouseMissions.completedLevels.includes(level)&&events++<500){
  M.advanceMissions(s,0,ctx);if(s.lighthouseMissions.completedLevels.includes(level))break;
  const st=M.missionStatus(s,ctx),o=st.task?.objective;if(!o)throw Error('Missing step '+level);seen.add(st.index);
  if(o.type==='review'){action(s,{type:'missionReview',id:st.task.id});continue;}
  if(o.type==='adventure'||o.type==='recruitment'){
   const a={type:'adventureStart',kind:o.kind||'escapeStory',...(o.storyId?{storyId:o.storyId}:{}),...(o.puzzleKind?{puzzleKind:o.puzzleKind}:{})};
   if(o.type==='recruitment'||o.recruitmentTarget){a.storyId='captainless-ship';a.assistanceMissionId=st.task.id;}
   action(s,a);solve(s);continue;
  }
  if(o.type==='shipping'){
   if(!st.active)action(s,{type:'missionStart',id:st.task.id});
   action(s,{type:'trade',resource:'grain',amount:100,direction:'buy'});
   let n=0;while(!s.dock.orders.some(x=>x.stage==='complete')&&n++<100)tick(s,60);
   tick(s,1200);continue;
  }
  if(o.type==='building'){
   if(!st.active){if(!st.canStart)throw Error('Building preflight blocked '+level+':'+st.index+':'+JSON.stringify(st.plan));action(s,{type:'missionStart',id:st.task.id});}
   action(s,{type:'upgrade',building:o.building});let n=0;while(s.buildings[o.building].level<o.target&&n++<500)tick(s,300);if(s.buildings[o.building].level<o.target)throw Error('Build did not finish');continue;
  }
  if(o.type==='contribute'){
   if(!st.active)action(s,{type:'missionStart',id:st.task.id});
   for(const [resource,total]of Object.entries(st.task.requirements)){const n=total-(st.task.deposited[resource]||0);if(n)action(s,{type:'missionDeposit',id:st.task.id,resource,amount:n});}continue;
  }
  if(['production','delivered'].includes(o.type)){
   if(o.type==='delivered')action(s,{type:'warehousePriority',priorities:[o.resource,...(o.resource==='food'?[]:['food'])]});if(!st.active)action(s,{type:'missionStart',id:st.task.id});tick(s,600);continue;
  }
  if(o.type==='check'||o.type==='stock'){tick(s,600);continue;}
  throw Error('Unknown objective '+o.type);
 }
 if(!s.lighthouseMissions.completedLevels.includes(level))throw Error('Unfinished level '+level+':'+JSON.stringify(M.missionStatus(s,ctx)));
 rows.push({level,events,seen:[...seen],worldChanges:s.lighthouseMissions.worldChanges.filter(x=>x.level===level).length,coinsAwarded:s.lighthouseMissions.chapter.level===level?s.lighthouseMissions.chapter.coinsAwarded:null});assert.ok(events<500,'bounded action loop for chapter '+level);
}
assert.equal(rows.length,19);assert.deepEqual(rows.map(r=>r.level),Array.from({length:19},(_,i)=>i+2));assert.ok(rows.every(r=>r.worldChanges===1),'each completed chapter changes the world exactly once');

});
