import test from 'node:test';
import assert from 'node:assert/strict';
import * as State from '../harborlight-v1-state.js';
import * as Progression from '../harborlight-v1-progression.js';
import * as Missions from '../harborlight-v1-missions.js';
import * as Arch from '../harborlight-v1-archipelago.js';
import { grantBonusMaterials, bonusStock, centralReserved, ordinaryStock } from '../harborlight-v1-inventory.js';
import { MATERIAL_IDS, warehouseLimits, constructionScheduleEstimate } from '../harborlight-v1-logistics.js';
import { synchronizeResidents, residentHappiness } from '../harborlight-v1-residents.js';
import { islandPuzzleSolution } from '../harborlight-v1-island-puzzles.js';
import { expeditionHourStatus } from '../harborlight-v1-expedition-hour.js';
import { adventureRewardStatus, claimAdventureBudget } from '../harborlight-v1-adventure-budget.js';
import { runTutorialV29 } from './helpers/tutorial-v29-course.mjs';
import { runTutorialV28 } from './helpers/tutorial-v28-course.mjs';

const NOW = Date.parse('2026-11-04T12:00:00Z');
const copy = value => JSON.parse(JSON.stringify(value));
const reload = state => State.normalizeState(copy(state),state.worldTimeMs);
function command(state, action) {
  const result = State.act(state,action,state.worldTimeMs);
  assert.equal(result.ok,true,JSON.stringify({action,result})); return result;
}
function nextHouseLesson(state) {
  return Progression.tutorialRows(state).find(row => row.subject === 'house-points');
}
function rescueIsland() {
  const state = State.createState(NOW); state.tutorial.autoOpenDisabled = true;
  for (const id of ['townhall','house','warehouse','lumber','quarry','farm','windmill','sawmill']) state.buildings[id].level = 3;
  state.capacity = 72; state.population = 13; synchronizeResidents(state);
  state.resources.coins = 1000;
  grantBonusMaterials(state,{wood:1000,stone:1000,grain:1000,food:1000,planks:1000});
  Missions.normalizeMissions(state,{lighthouseMissions:{version:1,campaignEnabled:true,completedLevels:[2]}});
  const context = {buildingCost:State.buildingCost,constructionEstimate:constructionScheduleEstimate};
  Missions.advanceMissions(state,0,context);
  state.lighthouseMissions.stack[0].index = 7; state.lighthouseMissions.stack[0].task = null;
  Missions.advanceMissions(state,0,context);
  const status = Missions.missionStatus(state,context);
  assert.equal(status.task.objective.building,'townhall'); assert.equal(status.task.objective.target,4);
  return {state,context,taskId:status.task.id};
}
function solveActualStory(state,{reloadAfterFirstRoom=false}={}) {
  let rooms = 0, final;
  while (state.adventures.active.stage !== 'complete') {
    const run = state.adventures.active, puzzle = run.data.puzzle;
    assert.equal(State.act(state,{type:'adventureInput',adventureId:run.id,command:'puzzleNextRoom'},state.worldTimeMs).ok,false);
    for (const move of islandPuzzleSolution(puzzle)) command(state,{type:'adventureInput',adventureId:run.id,command:'puzzleMove',move});
    assert.equal(puzzle.solved,true,'only real puzzle inputs complete a room');
    final = command(state,{type:'adventureInput',adventureId:run.id,command:'puzzleNextRoom'});
    rooms++;
    if (reloadAfterFirstRoom && rooms === 1) state = reload(state);
    assert.ok(rooms <= 8,'the connected adventure must terminate');
  }
  return {state,rooms,final};
}

test('actual Lighthouse completion allows keeping House points and resolves the practical lesson without spending the bank', () => {
  let {state} = runTutorialV29({now:NOW,through:13});
  const lesson = nextHouseLesson(state); assert.ok(lesson); assert.equal(lesson.completed,false);
  state.resources.coins += 100000;
  command(state,{type:'premiumBuyBuilding',building:'lighthouse'});
  State.advanceTo(state,state.worldTimeMs+10000);
  assert.equal(state.buildings.lighthouse.level,1); assert.ok(state.lighthouseRemaining > 0);
  assert.ok(state.residents.every(person => residentHappiness(state,person) === 100));
  const status = State.houseHappinessStatus(state); assert.ok(status.points > 0); assert.equal(status.canDistribute,false);
  const before = copy(state.houseHappinessPool), resources = copy(state.resources);
  assert.equal(State.act(state,{type:'houseHappinessAll'},state.worldTimeMs).ok,false);
  command(state,{type:'houseHappinessSave'});
  assert.deepEqual(state.houseHappinessPool,before); assert.deepEqual(state.resources,resources);
  assert.equal(state.tutorial.completed[lesson.id],true);
  state = reload(state);
  assert.equal(state.tutorial.completed[lesson.id],true); assert.deepEqual(state.houseHappinessPool,before);
});

test('the keep-for-later action cannot skip the House lesson while ordinary recipients can receive points', () => {
  const {state} = runTutorialV29({now:NOW,through:13});
  const lesson = nextHouseLesson(state), before = copy(state.houseHappinessPool);
  assert.equal(State.houseHappinessStatus(state).canDistribute,true);
  assert.equal(State.act(state,{type:'houseHappinessSave'},state.worldTimeMs).ok,false);
  assert.deepEqual(state.houseHappinessPool,before); assert.equal(state.tutorial.completed[lesson.id],undefined);
});

test('curriculum7 final settlement retains external bonus stock and an actual reserved construction order', () => {
  let {state} = runTutorialV29({now:NOW,through:24});
  assert.equal(state.tutorial.curriculum,7);
  state.resources.coins += 10000;
  grantBonusMaterials(state,{wood:1000,stone:1000,grain:1000,food:1000,planks:1000});
  const project = command(state,{type:'upgrade',building:'market'}).project;
  assert.ok(MATERIAL_IDS.every(id => centralReserved(state,id) > 0));
  const bonuses = Object.fromEntries(MATERIAL_IDS.map(id => [id,bonusStock(state,id)]));
  const reserved = copy(project), before = copy(state.resources);
  assert.equal(Progression.tutorialSettlementStatus(state).eligible,true);
  const finished = command(state,{type:'finishTutorial'});
  assert.equal(state.tutorial.settled,true); assert.equal(Progression.tutorialStatus(state).finished,true);
  assert.deepEqual(state.constructionProjects.find(item => item.order === project.order),reserved);
  for (const id of MATERIAL_IDS) {
    assert.equal(bonusStock(state,id),bonuses[id]);
    assert.equal(state.resources[id],before[id]+(finished.reward[id]||0));
    assert.equal(ordinaryStock(state,id),warehouseLimits(state).perResource);
  }
  state = reload(state);
  const restoredProject = state.constructionProjects.find(item => item.order === project.order);
  assert.deepEqual({...restoredProject,transportStarted:restoredProject.transportStarted === true},
    {...reserved,transportStarted:reserved.transportStarted === true},'normalizing a missing false flag cannot alter physical cargo or reservations');
  for (const id of MATERIAL_IDS) assert.equal(bonusStock(state,id),bonuses[id]);
  const once = copy(state.resources);
  assert.equal(State.act(state,{type:'finishTutorial'},state.worldTimeMs).ok,false); assert.deepEqual(state.resources,once);
});

test('a saved older curriculum keeps its original bonus-stock settlement gate and all earned materials', () => {
  let {state} = runTutorialV28({now:NOW,through:24,curriculum:6});
  grantBonusMaterials(state,{wood:77});
  const before = copy(state.resources), status = Progression.tutorialSettlementStatus(state);
  assert.equal(status.eligible,false); assert.equal(status.reasonCode,'bonus-stock');
  assert.equal(State.act(state,{type:'finishTutorial'},state.worldTimeMs).ok,false);
  assert.deepEqual(state.resources,before);
  state = reload(state);
  assert.equal(state.tutorial.curriculum,6); assert.equal(bonusStock(state,'wood'),77);
  assert.equal(Progression.tutorialSettlementStatus(state).reasonCode,'bonus-stock');
});

test('the real state dispatcher binds recruitment to the canonical mission, solves rooms and grants the missing people once after reload', () => {
  let {state,context,taskId} = rescueIsland();
  const initial = state.population, offer = Missions.missionAssistanceOffer(state,context);
  assert.equal(initial,13); assert.equal(offer.targetPopulation,54); assert.equal(offer.residentsRequested,41);
  command(state,{type:'adventureStart',assistanceMissionId:taskId});
  assert.equal(state.adventures.active.kind,'escapeStory');
  const solved = solveActualStory(state,{reloadAfterFirstRoom:true}); state = solved.state;
  assert.equal(solved.rooms,6); assert.equal(state.population,54);
  assert.equal(state.lighthouseMissions.recruitmentReceipts.length,1);
  const claimed = state.lighthouseMissions.assistanceContracts.find(contract => contract.receiptId === offer.receiptId);
  assert.equal(claimed.claimed,true); assert.equal(claimed.residentsAccepted,41);
  const before = copy(state.resources);
  command(state,{type:'adventureInput',adventureId:state.adventures.active.id,command:'puzzleNextRoom'});
  assert.equal(state.population,54); assert.deepEqual(state.resources,before);
  state = reload(state);
  assert.equal(state.population,54); assert.equal(state.lighthouseMissions.recruitmentReceipts.length,1);
  assert.equal(State.act(state,{type:'adventureStart',assistanceMissionId:taskId},state.worldTimeMs).ok,false);
});

test('a player-supplied rescueContext cannot grant people, but the same discovered story remains usable for real mission assistance', () => {
  let {state,context,taskId} = rescueIsland();
  const raw = Missions.missionAssistanceOffer(state,context);
  command(state,{type:'adventureStart',kind:'escapeStory',storyId:'captainless-ship',variant:1,
    rescueContext:{...raw,residentsRequested:999,supplies:{coins:999999},solved:true}});
  state = solveActualStory(state).state;
  assert.equal(state.population,13); assert.equal(state.lighthouseMissions.assistanceContracts.length,0);
  assert.deepEqual(state.lighthouseMissions.recruitmentReceipts,[]);
  command(state,{type:'adventureStart',assistanceMissionId:taskId});
  state = solveActualStory(state,{reloadAfterFirstRoom:true}).state;
  assert.equal(state.population,54); assert.equal(state.lighthouseMissions.recruitmentReceipts.length,1);
});

test('real world wrapping, daughter creation, game commands and serializer roundtrip retain one account hour and reward budget', () => {
  const initial = State.createState(NOW); initial.islandName = 'Dom';
  initial.buildings.townhall.level = 10; initial.buildings.warehouse.level = 9;
  initial.population = 18; initial.resources.coins = 100000;
  grantBonusMaterials(initial,{wood:100000,stone:100000,grain:100000,food:100000,planks:100000});
  const adapters = {createState:State.createState,normalizeState:State.normalizeState,advanceTo:State.advanceTo};
  let bundle = Arch.restoreArchipelago(initial,adapters,NOW);
  assert.equal(Arch.createNextIsland(bundle,{name:'Przystań'},NOW).ok,true);
  let mother = bundle.primary, daughter = bundle.secondary;
  assert.equal(mother.expeditionHour,daughter.expeditionHour); assert.equal(mother.adventureBudget,daughter.adventureBudget);
  command(mother,{type:'expeditionStart',expedition:'misty',gameKind:'triples'});
  const first = mother.expeditionRuns.misty; assert.equal(first.difficultyLevel,1);
  command(mother,{type:'expeditionLose',runId:first.id});
  command(daughter,{type:'expeditionStart',expedition:'misty',gameKind:'triples'});
  const second = daughter.expeditionRuns.misty; assert.equal(second.difficultyLevel,2);
  command(daughter,{type:'expeditionMiniGameReveal',runId:second.id,index:0});
  const board = copy(second.miniGame);
  const before = adventureRewardStatus(mother).dailyRemaining;
  const a = claimAdventureBudget(mother,{receiptId:'canonical-mother-result',reward:{coins:180}});
  const b = claimAdventureBudget(daughter,{receiptId:'canonical-daughter-result',reward:{coins:100}});
  assert.equal(adventureRewardStatus(mother).dailyRemaining,before-a.value-b.value);
  const budget = copy(mother.adventureBudget), hour = copy(mother.expeditionHour);
  const snapshot = Arch.serializeArchipelago(bundle);
  assert.equal(snapshot.archipelago.islands['island-2'].expeditionHour,undefined);
  assert.equal(snapshot.archipelago.islands['island-2'].adventureBudget,undefined);
  bundle = Arch.restoreArchipelago(copy(snapshot),adapters,NOW); mother = bundle.primary; daughter = bundle.secondary;
  assert.equal(mother.expeditionHour,daughter.expeditionHour); assert.equal(mother.adventureBudget,daughter.adventureBudget);
  assert.deepEqual(mother.expeditionHour,hour); assert.deepEqual(mother.adventureBudget,budget);
  assert.deepEqual(daughter.expeditionRuns.misty.miniGame,board);
  assert.equal(claimAdventureBudget(daughter,{receiptId:'canonical-mother-result',reward:{coins:180}}).duplicate,true);
  command(mother,{type:'expeditionStart',expedition:'misty',gameKind:'triples'});
  assert.equal(mother.expeditionRuns.misty.difficultyLevel,3); assert.equal(expeditionHourStatus(daughter).nextDifficulty,4);
  const spent = mother.adventureBudget.dailySpent;
  Arch.advanceArchipelago(bundle,NOW+3600000);
  assert.equal(expeditionHourStatus(mother).nextDifficulty,1); assert.equal(expeditionHourStatus(daughter).nextDifficulty,1);
  assert.equal(mother.expeditionHour,daughter.expeditionHour); assert.equal(mother.adventureBudget.dailySpent,spent);
});

test('canonical mission help reuses an ordinary unfinished active or parked rescue story and grants people after its remaining rooms',()=>{
 for(const parked of[false,true]){
  let {state,taskId}=rescueIsland();
  command(state,{type:'adventureStart',kind:'escapeStory',storyId:'captainless-ship',variant:1});
  const first=state.adventures.active,id=first.id;
  for(const move of islandPuzzleSolution(first.data.puzzle)){if(first.data.puzzle.solved)break;command(state,{type:'adventureInput',adventureId:id,command:'puzzleMove',move});}
  command(state,{type:'adventureInput',adventureId:id,command:'puzzleNextRoom'});
  const before=copy(first.data.story);assert.equal(before.roomIndex,1);assert.equal(state.population,13);
  if(parked)command(state,{type:'adventureStart',kind:'islandPuzzle',puzzleKind:'gull'});
  command(state,{type:'adventureStart',assistanceMissionId:taskId});
  assert.equal(state.adventures.active.id,id);assert.deepEqual(state.adventures.active.data.story,before);
  assert.equal(state.adventures.active.data.rescueContext.source,'campaign');
  state=reload(state);
  const solved=solveActualStory(state,{reloadAfterFirstRoom:true});state=solved.state;
  assert.equal(solved.rooms,5,'the first earned room is kept');assert.equal(state.population,54);
  assert.equal(state.lighthouseMissions.recruitmentReceipts.length,1);assert.equal(solved.final.residentsAccepted,41);
 }
});
