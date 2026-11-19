import test from 'node:test';
import assert from 'node:assert/strict';
import * as State from '../harborlight-v1-state.js';
import * as Missions from '../harborlight-v1-missions.js';

const NOW=Date.parse('2026-11-19T12:00:00Z');
const context={buildingCost:State.buildingCost,constructionEstimate:()=>({transport:120,building:120,total:240})};
function fixture(){
  const state=State.createState(NOW,{ruleset:32,onboarding:false});
  state.tutorial.autoOpenDisabled=true;
  state.buildings.townhall.level=3;
  state.buildings.house.level=2;
  state.buildings.lighthouse.level=1;
  Missions.normalizeMissions(state,{lighthouseMissions:{version:1,campaignEnabled:false,completedLevels:[]}});
  Missions.advanceMissions(state,0,context);
  assert.ok(state.lighthouseMissions.stack.length);
  return state;
}
function setTask(state,objective,status='offered'){
  const frame=state.lighthouseMissions.stack.at(-1);
  frame.kind='main';frame.index=3;frame.total=8;
  frame.task={id:'headline-task',status,title:'Current mission',titlePl:'Aktualna misja',
    description:'Full mission details remain in the panel.',objective,requirements:{wood:5},deposited:{},reward:{coins:10},
    acceptedAt:status==='active'?NOW:null,deadline:status==='active'?NOW+3600000:null,duration:3600,attempt:0,offeredAt:NOW};
  return frame.task;
}
function visible(status){
  return{available:status.available,chapter:status.chapter?{id:status.chapter.id,status:status.chapter.status}:null,
    ...(status.available?{kind:status.kind,index:status.index,total:status.total,
      task:{id:status.task.id,status:status.task.status,title:status.task.title,titlePl:status.task.titlePl}}:{})};
}

test('map mission headline matches every displayed full-status field across mission kinds and lifecycle',()=>{
  const cases=[
    [{type:'building',building:'house',target:3},'offered'],
    [{type:'building',building:'house',target:3},'active'],
    [{type:'recruitment',targetPopulation:30},'offered'],
    [{type:'invitation',count:2,baseline:0},'active'],
    [{type:'production',resource:'wood',count:10,baseline:0},'active'],
    [{type:'check',check:'warehouseCrew',value:1},'offered']
  ];
  for(const[objective,status]of cases){
    const state=fixture();setTask(state,objective,status);
    const before=JSON.stringify(state),oracle=visible(Missions.missionStatus(structuredClone(state),{...context,previewSteps:false}));
    assert.deepEqual(Missions.missionHeadline(state),oracle,JSON.stringify({objective,status}));
    assert.equal(JSON.stringify(state),before,'the headline cannot advance, accept, reward or rewrite a normalized world');
  }
  for(const completed of [false,true]){
    const state=fixture();state.lighthouseMissions.stack=[];
    if(completed)state.lighthouseMissions.chapter.status='completed';
    const before=JSON.stringify(state);
    assert.deepEqual(Missions.missionHeadline(state),visible(Missions.missionStatus(structuredClone(state),context)));
    assert.equal(JSON.stringify(state),before);
  }
});

test('headline does not traverse large unrelated history or quote construction',()=>{
  const state=fixture();setTask(state,{type:'building',building:'house',target:3});
  let forecasts=0;
  const full=Missions.missionStatus(state,{...context,previewSteps:false,constructionEstimate(){forecasts++;return{total:Infinity};}});
  assert.equal(full.plan.feasible,false);assert.ok(forecasts>0,'the ordinary full panel still performs the forecast');
  Object.defineProperty(state.provisions,'people',{configurable:true,get(){throw Error('The sidebar must not traverse meal history.');}});
  assert.deepEqual(Missions.missionHeadline(state),visible(full));
});

test('headline objects are detached and cannot mutate the accepted chapter or task',()=>{
  const state=fixture();setTask(state,{type:'building',building:'house',target:3});
  const before=JSON.stringify(state),headline=Missions.missionHeadline(state);
  headline.chapter.status='completed';headline.task.status='complete';headline.task.title='Changed heading';
  assert.equal(JSON.stringify(state),before);
});

test('visible headline never authorizes a mission that the unchanged full action rejects',()=>{
  const state=fixture();const task=setTask(state,{type:'building',building:'house',target:3});
  let forecasts=0;
  const blocked={...context,constructionEstimate(){forecasts++;return{total:Infinity};}};
  assert.equal(Missions.missionHeadline(state).available,true);
  const result=Missions.missionAction(state,{type:'missionStart',id:task.id},blocked);
  assert.equal(result.ok,false);assert.ok(forecasts>0);
  assert.equal(state.lighthouseMissions.stack.at(-1).task.status,'offered');
});
