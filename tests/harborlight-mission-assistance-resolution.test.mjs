import test from 'node:test';
import assert from 'node:assert/strict';
import * as State from '../harborlight-v1-state.js';
import * as Missions from '../harborlight-v1-missions.js';
import { CAMPAIGN_VERSION } from '../harborlight-v1-campaign.js';
import { synchronizeResidents } from '../harborlight-v1-residents.js';

const NOW = Date.parse('2026-11-22T12:00:00Z');
const context = { buildingCost: State.buildingCost };
const clone = value => structuredClone(value);
function fixture({ population = 72, depth = 2, legacy = false } = {}) {
  const state = State.createState(NOW, { ruleset: 32, onboarding: false });
  state.tutorial.autoOpenDisabled = true;
  state.buildings.townhall.level = 3;
  state.buildings.house.level = 3;
  state.population = population;
  synchronizeResidents(state);
  for (const id of Object.keys(state.resources)) state.resources[id] = 0;
  state.resources.coins = 100;
  Missions.normalizeMissions(state, { lighthouseMissions: { version: 1,
    campaignEnabled: !legacy, completedLevels: [2], receipts: ['lighthouse-chapter-3:1'] } });
  Missions.advanceMissions(state, 0, context);
  const m = state.lighthouseMissions;
  const task = (id, objective, reward = {}) => ({ id, status: 'assistance', objective,
    requirements: {}, deposited: {}, title: 'Recruit the missing crew', titlePl: 'Przyjmij brakującą załogę',
    description: '', descriptionPl: '', reward, duration: 600, offeredAt: NOW,
    acceptedAt: null, deadline: null, attempt: 0,
    ...(!legacy ? { campaignVersion: CAMPAIGN_VERSION, untimed: true } : {}) });
  m.chapter = { ...m.chapter, level: 3, id: 'lighthouse-chapter-3', status: 'active',
    ...(!legacy ? { campaignVersion: CAMPAIGN_VERSION } : {}) };
  if (legacy) delete m.chapter.campaignVersion;
  const main = { kind: 'main', index: 5, total: 8, prefix: m.chapter.id,
    task: task(`${m.chapter.id}:5`, { type: 'recruitment', targetPopulation: 81, count: 1, baseline: 0 }, { coins: 7 }) };
  const support = { kind: 'support', index: 1, total: 5, prefix: `${main.task.id}:support`,
    task: task(`${main.task.id}:support:1`, { type: 'review', building: 'house' }, { coins: 37 }) };
  const rescue = { kind: 'rescue', index: 1, total: 3, prefix: `${support.task.id}:rescue`,
    task: task(`${support.task.id}:rescue:1`, { type: 'review', building: 'house' }, { coins: 53 }) };
  m.stack = [main, support, rescue].slice(0, depth);
  m.receipts = ['lighthouse-chapter-3:1'];
  return state;
}

test('population already at81 leaves an obsolete support or rescue branch and pays only the earned main step', () => {
  for (const depth of [2, 3]) {
    const state = fixture({ population: 81, depth });
    const main = state.lighthouseMissions.stack[0].task;
    const helpers = state.lighthouseMissions.stack.slice(1).map(frame => frame.task.id);
    const before = state.resources.coins;
    Missions.advanceMissions(state, 0, context);
    assert.equal(state.lighthouseMissions.stack.length, 1, `depth${depth}`);
    assert.equal(state.lighthouseMissions.stack[0].kind, 'main');
    assert.equal(state.lighthouseMissions.stack[0].index, 6);
    assert.ok(state.lighthouseMissions.receipts.includes(main.id));
    assert.equal(state.resources.coins, before + 7);
    assert.ok(helpers.every(id => !state.lighthouseMissions.receipts.includes(id)), 'unfinished helper steps cannot grant rewards');
    const accepted = clone(state.lighthouseMissions);
    Missions.advanceMissions(state, 0, context);
    assert.deepEqual(state.lighthouseMissions, accepted);
    assert.equal(state.resources.coins, before + 7);
  }
});

test('a genuine unfulfilled population goal keeps its existing assistance path and progress', () => {
  const state = fixture({ population: 80, depth: 3 });
  const before = clone(state.lighthouseMissions);
  const coins = state.resources.coins;
  Missions.advanceMissions(state, 0, context);
  assert.deepEqual(state.lighthouseMissions, before);
  assert.equal(state.resources.coins, coins);
});

test('a stale unclaimed assistance contract is hidden once the actual parent goal is achieved', () => {
  const state = fixture({ population: 72 });
  const offer = Missions.prepareMissionAssistance(state, state.lighthouseMissions.stack.at(-1).task.id, context);
  assert.equal(offer.ok, true);
  assert.equal(offer.residentsRequested, 9);
  const contracts = clone(state.lighthouseMissions.assistanceContracts);
  state.population = 81;
  synchronizeResidents(state);
  assert.equal(Missions.missionAssistanceOffer(state, context), null);
  assert.deepEqual(state.lighthouseMissions.assistanceContracts, contracts, 'a preview cannot rewrite an earned/unclaimed contract');
  Missions.advanceMissions(state, 0, context);
  const quote = Missions.recruitmentRewardQuote(state, offer);
  assert.equal(quote.ok, true);
  assert.equal(quote.residentsAccepted, 0);
  assert.equal(quote.goalAlreadyResolved, true);
});

test('reaching81 never substitutes for solving a story which is itself the main objective', () => {
  const state = fixture({ population: 81 });
  state.lighthouseMissions.stack[0].task.objective = { type: 'adventure', kind: 'escapeStory',
    storyId: 'captainless-ship', recruitmentTarget: 81, count: 1, baseline: 0 };
  const before = clone(state.lighthouseMissions);
  Missions.advanceMissions(state, 0, context);
  assert.deepEqual(state.lighthouseMissions, before);
  assert.equal(state.adventures.completedEscapeStories?.['captainless-ship'] || 0, 0);
});

test('an already-finished real building goal also bypasses obsolete assistance without completing unfinished work', () => {
  const state = fixture();
  const main = state.lighthouseMissions.stack[0];
  const id = main.task.id;
  main.task.objective = { type: 'building', building: 'lighthouse', target: 2 };
  state.buildings.lighthouse.level = 2;
  Missions.advanceMissions(state, 0, context);
  assert.equal(state.lighthouseMissions.stack.length, 1);
  assert.equal(state.lighthouseMissions.stack[0].index, 6);
  assert.ok(state.lighthouseMissions.receipts.includes(id));
});

// Sanitized independently constructed shape: recruitment is already earned,
// while Town Hall4 still needs a budget and a nested supply adventure is open.
// No account payload, identity or cloud metadata is part of this fixture.
function suppliesAfterRecruitment() {
  const state=fixture({population:81,depth:3}),m=state.lighthouseMissions;
  const main=m.stack[0];main.index=7;
  main.task={...main.task,id:'lighthouse-chapter-3:7',objective:{type:'building',building:'townhall',target:4},
    title:'Finish Town Hall level4',titlePl:'Ukończ rozbudowę Ratusza na poziom4',
    requirements:{coins:1500,wood:1500,stone:1500,planks:1500,grain:1500,bread:198,food:7},reward:{coins:90}};
  for(const[depth,frame]of m.stack.slice(1).entries()){
    frame.index=2;frame.task={...frame.task,id:`lighthouse-chapter-3:7:${depth?'support:2:rescue':'support'}:2`,
      objective:{type:'adventure',kind:'escapeStory',storyId:'captainless-ship',count:1,baseline:2},reward:{}};
  }
  m.receipts=Array.from({length:6},(_,i)=>`lighthouse-chapter-3:${i+1}`);
  m.chapter.coinsAwarded=630;m.chapter.materialsAwarded=0;
  m.assistanceContracts=[{source:'campaign',missionId:'lighthouse-chapter-3:4',goalMissionId:'lighthouse-chapter-3:recruitment-54',
    chapterId:m.chapter.id,receiptId:'earned-crew-81',targetPopulation:81,mode:'population',goalComplete:true,
    maximumResidents:6,residentsRequested:6,residentsAccepted:6,supplies:{},claimed:true,
    storyId:'captainless-ship',completionReceiptId:'completed-story-crew'}];
  state.adventures.completedEscapeStories['captainless-ship']=2;
  return state;
}
const currentBuildingContext={buildingCost:()=>({coins:1500,wood:1500,stone:1500,planks:1500})};

test('an earned81-person crew does not block the distinct material assistance for Town Hall4',()=>{
  const state=suppliesAfterRecruitment();
  const before=clone(state.lighthouseMissions.assistanceContracts);
  const offer=Missions.missionAssistanceOffer(state,currentBuildingContext);
  assert.equal(offer.mode,'supplies');
  assert.equal(offer.goalMissionId,'lighthouse-chapter-3:7');
  assert.equal(offer.residentsRequested,0);
  assert.equal(offer.maximumResidents,0);
  assert.ok(Object.values(offer.supplies).some(n=>n>0));
  assert.ok(Object.keys(offer.supplies).every(id=>['coins','wood','stone','planks'].includes(id)));
  assert.deepEqual(state.lighthouseMissions.assistanceContracts,before,'preview preserves the earlier earned crew');
  const prepared=Missions.prepareMissionAssistance(state,state.lighthouseMissions.stack.at(-1).task.id,currentBuildingContext);
  assert.equal(prepared.ok,true);assert.equal(prepared.mode,'supplies');
  assert.deepEqual(state.lighthouseMissions.assistanceContracts[0],before[0]);
  assert.equal(state.lighthouseMissions.assistanceContracts.length,2);
});

test('the actual unfulfilled population prerequisite still asks for the missing crew before building supplies',()=>{
  const state=suppliesAfterRecruitment();
  state.population=72;synchronizeResidents(state);state.lighthouseMissions.assistanceContracts=[];
  const offer=Missions.missionAssistanceOffer(state,currentBuildingContext);
  assert.equal(offer.mode,'population');assert.equal(offer.residentsRequested,9);
  assert.equal(offer.targetPopulation,81);
  assert.equal(offer.goalMissionId,'lighthouse-chapter-3:recruitment-54');
});

test('a campaign rescue can return to the unfinished main goal without replaying or awarding a helper',()=>{
  const state=suppliesAfterRecruitment(),m=state.lighthouseMissions;
  const receipts=clone(m.receipts),contracts=clone(m.assistanceContracts),adventures=clone(state.adventures),resources=clone(state.resources);
  const mainReward=clone(m.stack[0].task.reward);
  const result=Missions.missionAction(state,{type:'missionReturnToMain',id:m.stack.at(-1).task.id},currentBuildingContext);
  assert.equal(result.ok,true);
  assert.equal(m.stack.length,1);assert.equal(m.stack[0].index,7);
  assert.equal(m.stack[0].task.id,'lighthouse-chapter-3:7');
  assert.equal(m.stack[0].task.status,'offered');
  assert.deepEqual(m.receipts,receipts);assert.deepEqual(m.assistanceContracts,contracts);
  assert.deepEqual(state.adventures,adventures);assert.deepEqual(state.resources,resources);
  assert.deepEqual(m.stack[0].task.reward,mainReward);
  assert.equal(state.buildings.townhall.level,3,'reading the main task never grants a building level');
  const view=Missions.missionStatus(state,{...currentBuildingContext,previewSteps:false});
  assert.deepEqual(view.task.requirements,currentBuildingContext.buildingCost());
  assert.equal(view.canStart,false,'returning does not bypass the real material and carrier checks');
});

test('returning from assistance cannot discard an accepted legacy timed route',()=>{
  const state=fixture({legacy:true}),before=clone(state.lighthouseMissions);
  const result=Missions.missionAction(state,{type:'missionReturnToMain',id:state.lighthouseMissions.stack.at(-1).task.id},context);
  assert.equal(result.ok,false);assert.deepEqual(state.lighthouseMissions,before);
});

test('older cached building-food quotes disappear from unspent preparation without rewriting earned progress',()=>{
  const state=suppliesAfterRecruitment(),m=state.lighthouseMissions;
  const main=m.stack[0].task,receipts=clone(m.receipts),contracts=clone(m.assistanceContracts),resources=clone(state.resources);
  main.deposited={wood:11};
  Missions.advanceMissions(state,0,currentBuildingContext);
  assert.deepEqual(main.requirements,currentBuildingContext.buildingCost());
  assert.deepEqual(main.deposited,{wood:11});
  assert.deepEqual(m.receipts,receipts);assert.deepEqual(m.assistanceContracts,contracts);assert.deepEqual(state.resources,resources);
  assert.equal(m.stack.length,3,'an unsolved story stays unsolved until the player chooses a route');
});

test('support explanation separates completed population81 from the unbuilt Town Hall4 and exact remaining supplies',()=>{
  const state=suppliesAfterRecruitment(),before=JSON.stringify(state);
  const view=Missions.missionStatus(state,{...currentBuildingContext,previewSteps:false});
  assert.equal(view.kind,'rescue');assert.equal(view.assistancePlan.main.index,7);
  assert.deepEqual(view.assistancePlan.population,{current:81,required:81,met:true});
  assert.equal(view.assistancePlan.main.objective.target,4);
  assert.equal(view.assistancePlan.assistanceMode,'supplies');assert.equal(view.assistancePlan.canReturnToMain,true);
  assert.deepEqual(view.assistancePlan.missing,{coins:1400,wood:1500,stone:1500,planks:1500});
  assert.ok(!Object.keys(view.assistancePlan.main.requirements).some(id=>['food','grain','bread'].includes(id)));
  assert.equal(JSON.stringify(state),before,'a status preview never accepts, rewards or rewrites the player save');
});

test('mission suggestions are stable after unrelated games and prioritize the exact required story or puzzle',()=>{
  const state=suppliesAfterRecruitment();
  const choices=[
    {id:'cargoRain',kind:'cargoRain',available:true},
    {id:'story:captainless-ship:1',kind:'escapeStory',storyId:'captainless-ship',variant:1,available:true,completed:1},
    {id:'story:captainless-ship:2',kind:'escapeStory',storyId:'captainless-ship',variant:2,available:true,completed:0},
    {id:'puzzle:packing',kind:'islandPuzzle',puzzleKind:'packing',available:true,resume:true},
    {id:'locked',kind:'escapeStory',storyId:'locked',available:false},
  ];
  const original=clone(choices),a=Missions.recommendedMissionAdventures(state,choices);
  assert.equal(a[0].id,'story:captainless-ship:2');assert.equal(a[0].missionRequired,true);
  assert.equal(a[0].missionTaskId,state.lighthouseMissions.stack.at(-1).task.id);
  assert.equal(a[0].rescueContext.missionId,state.lighthouseMissions.stack.at(-1).task.id);
  assert.equal(a[1].id,'puzzle:packing');assert.equal(a.length,3);
  state.adventures.sequence+=79;
  assert.deepEqual(Missions.recommendedMissionAdventures(state,choices),a);
  state.lighthouseMissions.stack.at(-1).task.objective={type:'adventure',kind:'islandPuzzle',puzzleKind:'packing'};
  const puzzleChoice=Missions.recommendedMissionAdventures(state,choices)[0];
  assert.equal(puzzleChoice.id,'puzzle:packing');assert.equal(puzzleChoice.rescueContext,undefined);
  assert.deepEqual(choices,original);
  assert.equal(Missions.recommendedMissionAdventures(state,choices,0).length,0);
});

test('an already-paid queued Town Hall4 resumes its real construction instead of requiring another rescue',()=>{
  for(const stage of ['queued','transport','building']){
    const state=suppliesAfterRecruitment(),m=state.lighthouseMissions;
    state.buildings.townhall.construction={building:'townhall',targetLevel:4,stage,goodsRemaining:6000,cost:{coins:1500,wood:1500,stone:1500,planks:1500},reservedCoins:1500};
    const project=clone(state.buildings.townhall.construction),resources=clone(state.resources),receipts=clone(m.receipts),contracts=clone(m.assistanceContracts),adventures=clone(state.adventures);
    Missions.advanceMissions(state,0,currentBuildingContext);
    assert.equal(m.stack.length,1);assert.equal(m.stack[0].index,7);
    assert.equal(m.stack[0].task.status,'active');assert.equal(m.stack[0].task.deadline,null);
    assert.equal(state.buildings.townhall.level,3);
    assert.deepEqual(state.buildings.townhall.construction,project);
    assert.deepEqual(state.resources,resources);assert.deepEqual(m.receipts,receipts);assert.deepEqual(m.assistanceContracts,contracts);assert.deepEqual(state.adventures,adventures);
    assert.deepEqual(Missions.missionStatus(state,{...currentBuildingContext,previewSteps:false}).task.requirements,{});
    const saved=clone(state);Missions.normalizeMissions(saved,saved);Missions.advanceMissions(saved,0,currentBuildingContext);
    assert.equal(saved.lighthouseMissions.stack.length,1);assert.equal(saved.lighthouseMissions.stack[0].task.status,'active');
    assert.deepEqual(saved.resources,resources);assert.deepEqual(saved.lighthouseMissions.receipts,receipts);
    state.buildings.townhall.level=4;state.buildings.townhall.construction=null;
    Missions.advanceMissions(state,0,currentBuildingContext);
    assert.ok(m.receipts.includes('lighthouse-chapter-3:7'));
    const coins=state.resources.coins;Missions.advanceMissions(state,0,currentBuildingContext);
    assert.equal(state.resources.coins,coins,'the actual completed building pays its mission reward once');
  }
});

test('removing an obsolete paid-building stock quote cannot award an unfinished stock helper',()=>{
  const state=suppliesAfterRecruitment(),m=state.lighthouseMissions;
  state.buildings.townhall.construction={building:'townhall',targetLevel:4,stage:'transport',goodsRemaining:4500,cost:{coins:1500,wood:1500,stone:1500,planks:1500},reservedCoins:1500};
  const helper=m.stack[1].task;
  helper.objective={type:'stock',requirements:{wood:1500,grain:1500}};
  helper.requirements={wood:1500,grain:1500};helper.reward={coins:37};
  const resources=clone(state.resources),receipts=clone(m.receipts),helperId=helper.id;
  Missions.advanceMissions(state,0,currentBuildingContext);
  assert.equal(m.stack.length,1);assert.equal(m.stack[0].index,7);
  assert.equal(m.stack[0].task.status,'active');
  assert.deepEqual(state.resources,resources);
  assert.deepEqual(m.receipts,receipts);
  assert.ok(!m.receipts.includes(helperId));
  assert.equal(state.buildings.townhall.level,3);
});

test('a committed building never offers another population or supplies rescue, including stale unclaimed contracts',()=>{
  for(const population of [72,81]){
    const state=suppliesAfterRecruitment(),m=state.lighthouseMissions;
    state.population=population;synchronizeResidents(state);
    state.buildings.townhall.construction={building:'townhall',targetLevel:4,stage:'transport',goodsRemaining:4500,cost:{coins:1500,wood:1500,stone:1500,planks:1500},reservedCoins:1500};
    m.assistanceContracts.push({source:'campaign',missionId:m.stack.at(-1).task.id,goalMissionId:m.stack[0].task.id,
      chapterId:m.chapter.id,receiptId:'unclaimed-earlier-supplies',targetPopulation:81,mode:'supplies',goalComplete:false,
      maximumResidents:0,residentsRequested:0,residentsAccepted:0,supplies:{wood:37},claimed:false,storyId:'captainless-ship'});
    const contracts=clone(m.assistanceContracts);
    assert.equal(Missions.missionAssistanceOffer(state,currentBuildingContext),null);
    assert.deepEqual(m.assistanceContracts,contracts);
    Missions.advanceMissions(state,0,currentBuildingContext);
    const view=Missions.missionStatus(state,{...currentBuildingContext,previewSteps:false});
    assert.equal(view.kind,'main');assert.equal(view.index,7);assert.equal(view.active,true);
    assert.equal(view.assistance,null);
    assert.deepEqual(m.assistanceContracts,contracts,'suppressing a new offer does not rewrite a saved completion contract');
  }
});
