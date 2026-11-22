import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, ALL_BUILDINGS, buildingCost} from '../harborlight-v1-state.js';
import {advisorSuggestion, advisorPlan} from '../harborlight-v1-advisor.js';
import {foodReservePlan, feedResidents, FOOD_IDS} from '../harborlight-v1-provisions.js';
import {centralAvailable} from '../harborlight-v1-inventory.js';
import {expeditionRoundReward} from '../harborlight-v1-activities.js';

const NOW=Date.parse('2026-11-21T10:00:00Z');
function world(level=1){const state=createState(NOW,{ruleset:32});state.buildings.townhall.level=level;state.buildings.house.level=level;return state;}
function rich(state){for(const id of Object.keys(state.resources))state.resources[id]=1000;state.resources.coins=100000;return state;}
function freeze(value,seen=new Set()){if(!value||typeof value!=='object'||seen.has(value))return value;seen.add(value);for(const child of Object.values(value))freeze(child,seen);return Object.freeze(value);}
function bounded(plan){assert.equal(plan.live,true);assert.ok(plan.title);assert.ok(plan.taskId);assert.ok(plan.steps.length>=2&&plan.steps.length<=5,plan.steps.length);assert.equal(new Set(plan.steps.map(row=>row.id)).size,plan.steps.length);return plan;}

test('continuous advisor chooses a concrete growth goal without requiring a chat question',()=>{
 const state=rich(world()),plan=bounded(advisorSuggestion(state));
 assert.equal(plan.kind,'upgrade');assert.equal(plan.goal,'townhall');assert.equal(plan.targetLevel,2);
 assert.ok(plan.steps.some(row=>row.id==='staff-carrier'&&row.hire===1));assert.ok(plan.steps.some(row=>row.id==='upgrade-townhall'));
 assert.equal(plan.estimate.seconds,null,'continuous guidance does not simulate a construction forecast');
});

test('protected reserve and disabled serving settings take priority over expansion',()=>{
 const state=world(3);for(const id of ['grain','food','vegetables','flour'])state.resources[id]=0;
 const reserve=foodReservePlan(structuredClone(state)),plan=bounded(advisorSuggestion(state));
 assert.equal(plan.kind,'food');assert.equal(plan.reserve.requiredSatiety,reserve.requiredSatiety);
 assert.equal(plan.steps[0].section,'food');assert.ok(plan.steps.some(row=>row.resource==='grain'));
 const stocked=rich(world(3));for(const id of Object.keys(stocked.resources))stocked.provisions.foodSettings.enabled[id]=false;
 assert.equal(foodReservePlan(structuredClone(stocked)).complete,true);
 const disabled=bounded(advisorSuggestion(stocked));assert.equal(disabled.kind,'food');assert.match(disabled.text,/ustawienia wydawania/);
});

test('safety advice still follows real variety rules rather than inventing three products at level3',()=>{
 const state=world(3);for(const id of Object.keys(state.resources))state.resources[id]=0;state.resources.grain=10000;
 const plan=bounded(advisorSuggestion(state));assert.equal(plan.reserve.requiredTypes,2);assert.match(plan.text,/różnorodności: 2/);
});

test('serving readiness checks actual enabled foods and quantity limits independently of cheapest reserve selection',()=>{
 const state=rich(world(3));for(const id of FOOD_IDS)state.provisions.foodSettings.limits[id]=0;
 const blocked=bounded(advisorSuggestion(state)),actual=feedResidents(structuredClone(state),3600);
 assert.equal(blocked.kind,'food');assert.equal(blocked.serving.coverage,actual.coverage);assert.deepEqual(blocked.serving.consumed,actual.consumed);assert.equal(actual.coverage,0);
 const alternate=rich(world(3));alternate.provisions.foodSettings.enabled.food=false;
 assert.equal(feedResidents(structuredClone(alternate),3600).coverage,1);
 assert.notEqual(advisorSuggestion(alternate).kind,'food','enabled alternatives already satisfy meals; the cheapest reserve is not the serving menu');
});

test('read-only one-hour serving quote agrees with actual feeding under priorities, disabled flags and partial limits',()=>{
 for(const variant of ['limited','disabled','emergency','priority']){
  const state=rich(world(3));
  if(variant==='limited')for(const id of FOOD_IDS)state.provisions.foodSettings.limits[id]=id==='grain'?5:0;
  if(variant==='disabled')for(const id of FOOD_IDS)state.provisions.foodSettings.enabled[id]=false;
  if(variant==='emergency'){for(const id of Object.keys(state.resources))state.resources[id]=0;state.resources.flour=1000;state.provisions.foodSettings.limits.flour=0;}
  if(variant==='priority'){state.provisions.foodSettings.priorities=['rawMilk','fish','flour'];state.provisions.foodSettings.limits.rawMilk=1;for(const id of FOOD_IDS)if(!['rawMilk','fish','flour'].includes(id))state.provisions.foodSettings.enabled[id]=false;}
  const plan=advisorSuggestion(state),actual=feedResidents(structuredClone(state),3600);
  if(plan.serving){assert.equal(plan.serving.coverage,actual.coverage,variant);assert.deepEqual(plan.serving.consumed,actual.consumed,variant);}
  else assert.equal(actual.coverage,1,variant);
 }
});

test('continuous advice never reads, clones or serializes historical meal or other-island payloads',()=>{
 const state=rich(world());
 for(const key of ['people','dietHistories','personProfiles'])Object.defineProperty(state.provisions,key,{get(){throw new Error('historical sidecar read: '+key);}});
 for(const key of ['archipelago','adventuresPacked','statistics','notifications'])Object.defineProperty(state,key,{get(){throw new Error('non-planning state read: '+key);}});
 const clone=globalThis.structuredClone;globalThis.structuredClone=()=>{throw new Error('whole-world clone');};
 try{bounded(advisorSuggestion(state));}finally{globalThis.structuredClone=clone;}
});

test('continuous guidance leaves every current normalized sidecar unchanged, including legacy crew allowances',()=>{
 const state=rich(world(5));state.provisions.legacyCrewAllowances={farm:{workers:100,recipes:{farmGrain:100}}};
 const before=structuredClone(state);advisorSuggestion(freeze(state));assert.deepEqual(structuredClone(state),before);
});

test('missing and partly normalized planning sidecars do not mutate the live island',()=>{
 const state=rich(world());delete state.education;delete state.military;delete state.provisions.foodSettings;
 const before=structuredClone(state);bounded(advisorSuggestion(state));assert.deepEqual(structuredClone(state),before);
});

test('resident occupation and all recommended hires share the real free-person budget',()=>{
 const state=world();for(const id of Object.keys(state.resources))state.resources[id]=0;state.resources.flour=10000;state.resources.grain=10000;
 for(const person of state.residents.slice(2)){person.workplace='farm';person.arrivalRemaining=0;}state.buildings.farm.workers=state.residents.length-2;
 const plan=bounded(advisorSuggestion(state));assert.equal(plan.freeWorkers,2);
 assert.ok(plan.steps.reduce((sum,row)=>sum+(row.hire||0),0)<=2);
});

test('full local output storage points to collection before assigning additional producers',()=>{
 const state=rich(world());state.buildings.quarry.workers=1;state.provisions.localStock.quarry={stone:200};
 const plan=bounded(advisorSuggestion(state));assert.equal(plan.kind,'storage');assert.match(plan.title,/Kamieniołom/);
 assert.ok(plan.steps.some(row=>row.section==='priorities'));assert.equal(plan.steps.filter(row=>row.target==='quarry'&&row.hire).length,0);
});

test('input starvation reports the current local shortfall and skips an unrelated upgrade',()=>{
 const state=rich(world());state.buildings.sawmill.workers=1;state.provisions.localStock.sawmill={wood:1};
 const plan=bounded(advisorSuggestion(state));assert.equal(plan.kind,'input');assert.match(plan.text,/Drewno 1/);assert.ok(plan.steps.some(row=>row.target==='sawmill'));
});

test('an accepted project remains the current task and no duplicate level is ordered',()=>{
 const state=rich(world());state.constructionProjects=[{order:42,building:'farm',targetLevel:2,stage:'building',buildRemaining:100,reservedMaterials:{}}];
 const plan=bounded(advisorSuggestion(state));assert.equal(plan.kind,'construction');assert.equal(plan.goal,'farm');assert.equal(plan.targetLevel,2);
 assert.ok(plan.steps.every(row=>!row.id.startsWith('upgrade-')));assert.match(plan.text,/budowa już trwa/);
});

test('an explicit locked goal shows its true Town Hall prerequisite',()=>{
 const plan=bounded(advisorSuggestion(rich(world()),{goal:'dock'}));
 assert.equal(plan.kind,'locked');assert.equal(plan.goal,'townhall');assert.equal(plan.requestedGoal,'dock');assert.match(plan.text,/poziomie 4/);
});

test('English locked requests retain their original building goal through the Town Hall prerequisite',()=>{
 const state=rich(world()),locked=advisorPlan(state,'Upgrade the Port',{language:'en'});
 assert.equal(locked.kind,'locked');assert.equal(locked.requestedGoal,'dock');assert.equal(locked.requestedTargetLevel,2);
 state.buildings.townhall.level=4;
 const unlocked=advisorSuggestion(state,{goal:locked.requestedGoal,targetLevel:locked.requestedTargetLevel,language:'en'});
 assert.equal(unlocked.kind,'upgrade');assert.equal(unlocked.goal,'dock');assert.equal(unlocked.targetLevel,2);
});

test('housing shortage selects the House while sufficient beds select the population gate',()=>{
 const state=rich(world(3));state.population=40;state.residents=Array.from({length:40},(_,id)=>({...state.residents[0],id:id+1,personUid:'island-1:resident-'+(id+1)}));state.buildings.house.level=1;
 const house=bounded(advisorSuggestion(state));assert.equal(house.kind,'upgrade');assert.equal(house.goal,'house');
 state.buildings.house.level=3;const population=bounded(advisorSuggestion(state));assert.equal(population.kind,'population');assert.equal(population.populationRequired,81);assert.match(population.text,/40 mieszkańców/);
});

test('dedicated Academy beds avoid recommending an unnecessary House upgrade',()=>{
 const state=rich(world(4));state.buildings.house.level=3;state.buildings.academy.level=4;state.population=110;
 state.residents=Array.from({length:110},(_,id)=>({...state.residents[0],id:id+1,personUid:'island-1:resident-'+(id+1)}));
 for(const person of state.residents.slice(0,6))state.education.people[person.personUid]={profession:'professor',rounds:1};
 const plan=bounded(advisorSuggestion(state));assert.equal(plan.kind,'materials');assert.equal(plan.goal,'townhall');assert.ok(plan.steps.every(row=>row.id!=='upgrade-house'));
});

test('new levels and player staffing immediately replace completed steps instead of repeating them',()=>{
 const state=rich(world(2));const before=bounded(advisorSuggestion(state,{goal:'farm',targetLevel:2}));assert.equal(before.goal,'farm');
 state.buildings.farm.level=2;state.buildings.warehouse.workers=1;
 const after=bounded(advisorSuggestion(state,{goal:'farm',targetLevel:2}));assert.equal(after.goal,'townhall');assert.equal(after.steps.some(row=>row.id==='staff-carrier'),false);
});

test('upgrade material deficits equal the official live quote above protected reserves',()=>{
 const state=world(2),copy=structuredClone(state),cost=buildingCost(copy,'farm'),plan=bounded(advisorSuggestion(state,{goal:'farm'}));
 assert.equal(plan.kind,'upgrade');assert.deepEqual(plan.cost,Object.fromEntries(Object.entries(cost)));
 for(const row of plan.missing){assert.equal(row.required,cost[row.id]);assert.equal(row.available,row.id==='coins'?state.resources.coins:centralAvailable(copy,row.id));}
});

test('a coin deficit suggests an actual reward-bearing minigame with conditional payout',()=>{
 const state=rich(world());state.resources.coins=0;
 const plan=bounded(advisorSuggestion(state)),game=plan.steps.find(row=>row.target==='expeditions');
 assert.ok(game);assert.equal(game.rewardCoins,expeditionRoundReward(1,31));assert.equal(game.rewardKind,'conditional-timely-win');
 assert.match(game.text,/wypłać/);assert.match(game.text,/Nagroda zależy/);
 state.resources.coins=100000;assert.equal(advisorSuggestion(state).steps.some(row=>row.target==='expeditions'),false);
});

test('an existing minigame series resumes or cashes out instead of promising a second new series',()=>{
 const state=rich(world());state.resources.coins=0;state.expeditionRuns={misty:{id:'run-1',status:'decision',level:2,pot:150}};
 const cash=bounded(advisorSuggestion(state)).steps.find(row=>row.target==='expeditions');assert.equal(cash.rewardKind,'existing-pot');assert.equal(cash.rewardCoins,150);
 state.expeditionRuns.misty.status='active';const resume=bounded(advisorSuggestion(state)).steps.find(row=>row.target==='expeditions');assert.equal(resume.rewardKind,'unfinished-run');assert.match(resume.text,/rozpoczętą/);
});

test('the Theatre remains a permanent-level service and completed maximum levels do not invent101',()=>{
 const theatre=bounded(advisorSuggestion(rich(world(5)),{goal:'theatre'}));assert.equal(theatre.kind,'leisure');assert.ok(theatre.steps.every(row=>row.target==='theatre'));
 const state=rich(world(100));for(const [id,definition]of Object.entries(ALL_BUILDINGS))state.buildings[id].level=definition.maxLevel;
 const final=bounded(advisorSuggestion(state,{goal:'townhall'}));assert.equal(final.kind,'maintenance');assert.doesNotMatch(final.text,/101/);
});

test('new continuous plans and English questions have coherent English copy and the same current goal',()=>{
 const state=rich(world()),plan=bounded(advisorSuggestion(state,{language:'en'}));assert.equal(plan.goal,'townhall');assert.match(plan.title,/Town Hall/);assert.match(plan.steps[0].text,/carrier/);
 const port=bounded(advisorPlan(rich(world(5)),'Upgrade the Port',{language:'en'}));assert.equal(port.goal,'dock');assert.match(port.title,/Port/);
 const food=advisorPlan(state,'How do I feed my residents?',{language:'en'});assert.equal(food.kind,'food');assert.ok(food.steps.length>=2);
 const planks=advisorPlan(state,'I need more planks',{language:'en'});assert.equal(planks.kind,'resource');assert.match(planks.title,/planks/);
});

test('Polish quick topics show2–5 meaningful steps and refresh cheap current counts',()=>{
 const state=rich(world());
 for(const question of ['Wolni mieszkańcy','Priorytety transportu','Jak zapewnić jedzenie?']){
  const plan=advisorPlan(state,question);assert.ok(plan.steps.length>=2&&plan.steps.length<=5,question);
 }
 const before=advisorSuggestion(state,{topic:'workers'});state.residents[0].workplace='warehouse';state.residents[0].arrivalRemaining=120;state.buildings.warehouse.workers=1;
 const after=advisorSuggestion(state,{topic:'workers'});assert.equal(after.freeWorkers,before.freeWorkers-1);assert.notEqual(after.text,before.text);
 const port=advisorPlan(world(5),'Port');assert.ok(port.steps.length>5,'the full manual production dependencies remain available beyond the five main UI actions');
 const locked=advisorPlan(state,'Port');assert.equal(locked.steps.length,2);
});


test('legacy locked fallback distinguishes the immediate Town Hall level from the later Port unlock',()=>{
 const state=rich(world(2)),p=bounded(advisorSuggestion(state,{goal:'dock'}));
 assert.equal(p.kind,'locked');assert.equal(p.targetLevel,3);assert.equal(p.longTermRequirement,4);assert.match(p.title,/Ratusz 3/);assert.doesNotMatch(p.title,/Ratusz 4/);assert.equal(p.requestedGoal,'dock');
});

test('legacy unfunded fallback prepares resources without an actionable upgrade order',()=>{
 const state=world(2),p=bounded(advisorSuggestion(state,{goal:'lumber'}));assert.equal(p.kind,'materials');assert.ok(p.steps.every(row=>!row.id.startsWith('upgrade-')));assert.ok(p.steps.some(row=>row.id==='prepare-lumber'));
});
