import test from 'node:test';
import assert from 'node:assert/strict';
import {ADVISOR_GUIDANCE_ACTIONS,normalizeAdvisorGuidance,advisorGuidanceSelectors,placeAdvisorGuidance} from '../harborlight-v1-advisor-guidance.js';

const step=(target,action,extra={})=>({target,text:'This translated sentence is not a selector.',guidance:{action,...extra}});

test('visual guidance requires explicit whitelisted semantics and never parses a description',()=>{
 assert.equal(normalizeAdvisorGuidance({target:'farm',text:'Assign3grainworkers then click upgrade'}),null);
 assert.equal(normalizeAdvisorGuidance(step('farm','run-arbitrary-command')),null);
 assert.equal(normalizeAdvisorGuidance(step('farm','assign-workers',{targetCount:'3'})).targetCount,null);
 assert.equal(normalizeAdvisorGuidance(step('farm','assign-workers',{targetCount:3})).targetCount,3);
 assert.equal(normalizeAdvisorGuidance(step('farm','assign-workers',{targetCount:0})).targetCount,0);
 assert.equal(normalizeAdvisorGuidance(step('farm','assign-workers',{targetCount:Infinity})).targetCount,null);
 assert.equal(normalizeAdvisorGuidance(step('farm','assign-workers',{targetCount:-1})).targetCount,null);
 assert.ok(Object.isFrozen(ADVISOR_GUIDANCE_ACTIONS));
});

test('exact recipe, material and feeding targets retain their model IDs without mutating the step',()=>{
 const source=step('farm','recipe-workers',{recipeId:'farmGrain',targetCount:3});const before=structuredClone(source);
 const guide=normalizeAdvisorGuidance(source);
 assert.deepEqual(advisorGuidanceSelectors(guide),['[data-v32-workers="farmGrain"]']);
 assert.ok(Object.isFrozen(guide));assert.deepEqual(source,before);
 assert.deepEqual(advisorGuidanceSelectors(normalizeAdvisorGuidance(step('warehouse','transport-priority',{priority:'construction'}))),['[data-warehouse-section-toggle="priorities"]','[data-warehouse-priority="construction"]']);
 assert.deepEqual(advisorGuidanceSelectors(normalizeAdvisorGuidance(step('warehouse','food-settings',{resourceId:'vegetables',control:'enabled',targetEnabled:true}))),['[data-warehouse-section-toggle="feeding"]','[data-v32-food="vegetables"]']);
});

test('missing required semantics and selector injection fail closed',()=>{
 for(const source of [step('missing','upgrade'),step('farm','recipe-workers'),step('farm','recipe-workers',{recipeId:'grain"] button'}),step('farm"]','assign-workers'),step('expeditions','minigame')])assert.equal(normalizeAdvisorGuidance(source),null);
 assert.equal(normalizeAdvisorGuidance(step('warehouse','food-settings',{resourceId:'grain"] input'})).resourceId,null);
 assert.equal(normalizeAdvisorGuidance(step('farm','house-happiness')),null);
 assert.equal(normalizeAdvisorGuidance(step('farm','minigame',{gameId:'triples'})),null);
 assert.equal(normalizeAdvisorGuidance(step('warehouse','food-settings',{control:'cashout'})),null);
});

test('happiness and minigames have their own controls rather than falling back to staffing',()=>{
 assert.deepEqual(advisorGuidanceSelectors(normalizeAdvisorGuidance(step('house','house-happiness'))),['[data-house-everyone]']);
 const game=normalizeAdvisorGuidance(step('expeditions','minigame',{gameId:'triples'}));
 assert.equal(game.building,'expeditions');assert.deepEqual(advisorGuidanceSelectors(game),['[data-expedition-choice="triples"]','[data-original-puzzle-choice="triples"]']);
 assert.deepEqual(advisorGuidanceSelectors(normalizeAdvisorGuidance(step('expeditions','minigame',{control:'cashout'}))),['[data-expedition-cashout]']);
});

test('callouts stay bounded and choose a clear side of the target across desktop/mobile edges',()=>{
 for(const [vw,vh,w,h] of [[1440,1000,280,115],[390,844,280,130],[320,350,280,130],[320,200,240,80]]){
  for(const rect of [{left:20,top:20,right:100,bottom:64,width:80,height:44},{left:vw-100,top:vh-64,right:vw-20,bottom:vh-20,width:80,height:44},{left:vw/2-30,top:vh/2-20,right:vw/2+30,bottom:vh/2+20,width:60,height:40}]){
   const result=placeAdvisorGuidance(rect,w,h,vw,vh);
   assert.ok(result.left>=10&&result.top>=10);
   assert.ok(result.left+w<=vw-10&&result.top+h<=vh-10,JSON.stringify({vw,vh,rect,result}));
   assert.ok(['above','below','left','right'].includes(result.placement));
  }
 }
});
