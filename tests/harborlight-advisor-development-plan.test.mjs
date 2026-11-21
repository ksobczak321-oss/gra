import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,buildingCost,ALL_BUILDINGS} from '../harborlight-v1-state.js';
import {advisorDevelopmentSnapshot,advisorDevelopmentIntent,advisorDevelopmentPlan,ADVISOR_PLAN_LIMITS} from '../harborlight-v1-advisor-development-plan.js';
import {centralAvailable} from '../harborlight-v1-inventory.js';
import {foodReservePlan,FOOD_IDS} from '../harborlight-v1-provisions.js';
const NOW=Date.parse('2026-11-21T15:00:00Z');
function world(level=5){const s=createState(NOW,{ruleset:32});s.buildings.townhall.level=level;s.buildings.house.level=level;for(const id of Object.keys(s.resources))s.resources[id]=10000;s.resources.coins=100000;return s;}
function staff(s,building,count,recipe){const selected=s.residents.filter(p=>!p.workplace).slice(0,count);for(const p of selected){p.workplace=building;p.arrivalRemaining=0;}s.buildings[building].workers+=selected.length;if(recipe)s.provisions.assignments[building]={[recipe]:selected.length};return selected;}
function frozen(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const row of Object.values(value))frozen(row);}return value;}
const plan=(s,input='Port',options={})=>advisorDevelopmentPlan(advisorDevelopmentSnapshot(s),{input,options});

test('compact snapshot excludes inaccessible histories, other worlds and function contexts before cloning',()=>{
 const s=world();for(const key of ['archipelago','adventuresPacked','statistics','notifications','savePacked'])Object.defineProperty(s,key,{get(){throw Error('unrelated payload '+key);}});
 for(const row of Object.values(s.provisions.people))Object.defineProperty(row,'history',{get(){throw Error('history read');}});
 s.runtimeContext={getWorlds(){throw Error('runtime function');}};
 const clone=globalThis.structuredClone;globalThis.structuredClone=()=>{throw Error('clone before compacting');};
 let compact;try{compact=advisorDevelopmentSnapshot(s);}finally{globalThis.structuredClone=clone;}
 assert.ok(structuredClone(compact));assert.equal('archipelago'in compact,false);assert.equal('runtimeContext'in compact,false);
 for(const p of Object.values(compact.provisions.people))assert.equal('history'in p,false);
});

test('planner leaves a deeply frozen normalized source and compact source byte-identical',()=>{
 const s=world();s.provisions.legacyCrewAllowances={farm:{workers:100,recipes:{farmGrain:100}}};const before=JSON.stringify(s),compact=advisorDevelopmentSnapshot(frozen(s)),encoded=JSON.stringify(compact);
 const result=advisorDevelopmentPlan(frozen(compact),{input:'Port'});assert.ok(result.tasks.length);assert.equal(JSON.stringify(s),before);assert.equal(JSON.stringify(compact),encoded);
});

test('snapshot preserves resident order, scalar food coverage, current trips, routes and real project timing',()=>{
 const s=world();s.residents.reverse();s.provisions.people[s.residents[0].personUid].coverage=.25;s.roads.segments.fill(2);s.education.routes.test={source:'farm',target:'windmill',product:'grain'};
 s.haulTrips.warehouse=[{kind:'construction',worker:0,residentId:s.residents[0].id,projectOrder:3,remaining:27,amount:120,resource:'wood',workMultiplier:.625,economyClock:true}];
 s.constructionProjects=[{order:3,building:'dock',stage:'transport',targetLevel:2,transportSeconds:33,remainingMaterials:{wood:14},reservedMaterials:{wood:14},delivered:{wood:2},economyTiming:{version:1,courseSeconds:7}}];
 const p=advisorDevelopmentSnapshot(s);assert.deepEqual(p.residents.map(p=>p.id),s.residents.map(p=>p.id));assert.equal(p.provisions.people[s.residents[0].personUid].coverage,.25);assert.deepEqual(p.haulTrips.warehouse,s.haulTrips.warehouse);assert.equal(p.constructionProjects[0].transportSeconds,33);assert.deepEqual(p.roads,s.roads);assert.deepEqual(p.education.routes,s.education.routes);
});

test('official physical construction quote and hidden food metadata survive the worker DTO',()=>{
 const s=world(),cost=buildingCost(structuredClone(s),'dock'),p=plan(s);
 assert.deepEqual(p.cost,Object.fromEntries(Object.entries(cost)));assert.deepEqual(p.foodQuote,cost.foodQuote);assert.equal(p.foodUnits,cost.foodUnits);
 const transferred=structuredClone(p);assert.deepEqual(transferred.foodQuote,cost.foodQuote);assert.ok(!Object.keys(cost).includes('foodQuote'));
 for(const row of p.missing)assert.equal(row.available,centralAvailable(structuredClone(s),row.id));
});

test('one Port goal survives its Town Hall prerequisite and a food emergency',()=>{
 const s=world(1);for(const id of FOOD_IDS)s.resources[id]=0;
 const p=plan(s);assert.equal(p.goal,'dock');assert.equal(p.requestedGoal,'dock');assert.match(p.text,/Ratusz/);assert.equal(p.tasks[0].id,'food');assert.ok(p.steps.some(row=>row.target==='townhall'));assert.equal(p.estimate.seconds,null);
 s.buildings.townhall.level=4;const resumed=plan(s,'',{...p.tracking});assert.equal(resumed.goal,'dock');assert.ok(resumed.steps.some(row=>row.target==='dock'));
});

test('shared wood ledger charges construction and sawmill ingredients exactly once',()=>{
 const s=world();s.resources.wood=410;s.resources.planks=0;
 const p=plan(s),wood=p.diagnostics.production.find(r=>r.recipeId==='wood'),planks=p.diagnostics.production.find(r=>r.recipeId==='planks');
 assert.ok(planks);assert.equal(p.cost.wood,400);assert.equal(planks.inputs.wood.central,10);assert.equal(planks.inputs.wood.make,790);assert.equal(wood.quantity,790);
 const consumed=p.diagnostics.ledger.filter(r=>r.resource==='wood'&&r.source==='central-input').reduce((n,r)=>n+r.quantity,0);assert.equal(consumed,10);
});

test('incoming and ready local boards replace production without spending protected food',()=>{
 const s=world();s.resources.planks=0;s.provisions.localStock.sawmill={planks:170};s.pendingDeliveries.planks=100;s.haulTrips.warehouse=[{kind:'producer',producer:'sawmill',resource:'planks',amount:130,remaining:30,worker:0}];
 const p=plan(s);assert.equal(p.diagnostics.production.some(r=>r.recipeId==='planks'),false);assert.equal(p.diagnostics.ledger.filter(r=>r.resource==='planks').reduce((n,r)=>n+r.quantity,0),400);assert.ok(p.steps.some(row=>/drugi raz/.test(row.text)));
});

test('all food and expansion hires share one free-person budget and desired totals are explicit',()=>{
 const s=world();for(const id of ['wood','stone','planks'])s.resources[id]=0;
 for(const p of s.residents.slice(4)){p.workplace='farm';p.arrivalRemaining=0;}s.buildings.farm.workers=s.residents.length-4;s.provisions.assignments.farm={farmGrain:s.buildings.farm.workers};
 const p=plan(s),hires=Object.values(p.diagnostics.hires).reduce((n,q)=>n+q,0);assert.ok(hires<=4,hires);
 for(const row of p.steps.filter(r=>['assign-workers','recipe-workers'].includes(r.guidance.action))){assert.ok(Number.isSafeInteger(row.guidance.targetCount));assert.ok(row.guidance.targetCount>=0);}
});

test('ongoing construction keeps its paid level and real remaining build clock',()=>{
 const s=world();s.constructionProjects=[{order:42,building:'dock',targetLevel:2,stage:'building',buildRemaining:120,remainingMaterials:{},reservedMaterials:{},cost:{wood:400}}];s.education.researchLevels.construction=2;
 const p=plan(s);assert.equal(p.targetLevel,2,'finish the existing paid level before considering another');assert.match(p.steps.find(row=>row.id==='build-dock').text,/2.*już przyjęta/);assert.equal(p.steps.find(row=>row.id==='build-dock').guidance.action,'inspect');assert.equal(p.estimate.seconds,120/1.1);
});

test('purchased upgrade never proposes a duplicate order or certain finish time',()=>{
 const s=world();s.premiumServices=[{building:'dock',targetLevel:2,stage:'building',buildRemaining:6}];const p=plan(s);
 assert.equal(p.steps.find(row=>row.id==='build-dock').guidance.action,'inspect');assert.match(p.steps.find(row=>row.id==='build-dock').text,/Kupiona/);assert.equal(p.estimate.seconds,null);
});

test('population gate sees stored House happiness and an actual minigame route for missing coins',()=>{
 const s=world(3);s.resources.coins=0;s.houseHappinessPool.points=18;const p=plan(s,'Ratusz');
 assert.ok(p.steps.some(row=>row.guidance.action==='house-happiness'&&/18/.test(row.text)));assert.ok(p.steps.some(row=>row.guidance.action==='minigame'&&row.guidance.gameId==='triples'));assert.equal(p.estimate.seconds,null);
});

test('food-incomplete construction quote is not treated as zero cost or an exact ETA',()=>{
 const s=world();for(const id of Object.keys(s.resources))if(id!=='coins')s.resources[id]=0;
 const p=plan(s);assert.equal(p.foodQuote.ok,false);assert.ok(p.foodQuote.missingSatiety>0);assert.ok(p.steps.some(row=>row.id==='construction-food'));assert.equal(p.estimate.seconds,null);
 const reserve=foodReservePlan(structuredClone(s));assert.deepEqual(p.reserve,reserve);
});

test('dependency cards precede transport and construction; every action has structured guidance',()=>{
 const s=world();s.resources.wood=s.resources.planks=0;const p=plan(s);
 assert.ok(p.tasks.length>=2&&p.tasks.length<=5);const transport=p.tasks.find(t=>t.id==='transport'),build=p.tasks.find(t=>t.id==='build');assert.ok(transport);assert.ok(build.dependsOn.includes('transport'));
 for(const task of p.tasks)for(const dep of task.dependsOn)assert.ok(p.tasks.findIndex(t=>t.id===dep)<p.tasks.indexOf(task));
 for(const step of p.steps){assert.ok(step.guidance?.action);assert.ok(step.target);assert.ok(step.why);}
 const sawmill=p.tasks.find(t=>t.howTo.some(row=>row.guidance.recipeId==='planks'));const lumber=p.tasks.find(t=>t.howTo.some(row=>row.guidance.recipeId==='wood'));if(sawmill!==lumber)assert.ok(sawmill.dependsOn.includes(lumber.id));
});

test('bounded candidates and arithmetic do not iterate once per huge cargo unit',()=>{
 const s=world(100);s.buildings.dock.level=99;s.resources.wood=0;s.resources.planks=0;const start=performance.now(),p=plan(s);
 assert.ok(performance.now()-start<1500);assert.ok(p.diagnostics.candidateCount<=ADVISOR_PLAN_LIMITS.candidates);assert.ok(p.diagnostics.variantCount<=ADVISOR_PLAN_LIMITS.variants);assert.ok(p.candidates.every(c=>c.depth<=2));assert.ok(p.tasks.length<=5);
});

test('maximum levels never invent101 and static Theatre never acquires a new level',()=>{
 const s=world(100);for(const [id,def]of Object.entries(ALL_BUILDINGS))s.buildings[id].level=def.maxLevel;
 const p=plan(s,'');assert.equal(p.kind,'maintenance');assert.doesNotMatch(JSON.stringify(p),/level101|poziom101/);
 const theatre=plan(world(),'Teatr');assert.equal(theatre.targetLevel,1);assert.ok(theatre.steps.every(r=>r.target==='theatre'||r.id.startsWith('food-')));
});

test('goal intent respects Polish and English topic questions and preserves exact requested target',()=>{
 assert.equal(advisorDevelopmentIntent('Jak ustawić transport w Porcie?').topic,'transport');assert.equal(advisorDevelopmentIntent('Upgrade the Port',{language:'en'}).goal,'dock');assert.equal(advisorDevelopmentIntent('Dlaczego tak?',{goal:'dock',targetLevel:4}).targetLevel,4);
 const p=plan(world(),'Upgrade the Port',{language:'en'});assert.match(p.title,/Port/);assert.match(p.why,/cargo workers.*trade/);
});

test('temporary boosts do not remove the permanent food workforce floor',()=>{
 const s=world();s.engagement.activeUntil=NOW+60000;s.lighthouseRemaining=30;s.worldEvents.effects=[{untilMs:NOW+60000,farmBonusPercent:100}];
 const boosted=plan(s);s.lighthouseRemaining=0;s.engagement.activeUntil=0;s.worldEvents.effects=[];const ordinary=plan(s);
 const duties=p=>p.steps.filter(row=>row.id.startsWith('food-recipe-')).map(row=>[row.guidance.recipeId,row.guidance.targetCount]);
 assert.deepEqual(duties(boosted),duties(ordinary));assert.ok(duties(boosted).length>=2);
});

test('current food coverage affects actual carrier speed instead of silently assuming everybody is fed',()=>{
 const s=world();staff(s,'warehouse',3);const fed=plan(s);
 for(const person of s.residents.filter(p=>p.workplace==='warehouse'))s.provisions.people[person.personUid].coverage=0;
 const hungry=plan(s);assert.ok(fed.estimate.seconds>0);assert.ok(hungry.estimate.seconds>fed.estimate.seconds);
});

test('full central storage and a queued project expose a real blocker rather than a finite ETA',()=>{
 const s=world();s.resources.planks=0;s.provisions.localStock.sawmill={planks:400};const p=plan(s);
 assert.equal(p.estimate.seconds,null);assert.ok(p.steps.some(row=>row.id==='central-room'));
 s.constructionProjects=[{order:1,building:'dock',targetLevel:2,stage:'queued',cost:{wood:400},remainingMaterials:{wood:400},reservedMaterials:{wood:400}}];const queued=plan(s);assert.equal(queued.estimate.seconds,null);
});

test('three selected priorities produce a real deselect-then-select construction sequence',()=>{
 const s=world();s.warehousePriorities=['grain','stone','wood'];const p=plan(s),steps=p.tasks.find(t=>t.id==='transport').howTo;
 const remove=steps.findIndex(row=>row.guidance.targetEnabled===false),select=steps.findIndex(row=>row.guidance.priority==='construction');
 assert.ok(remove>=0&&select>remove);assert.equal(steps[remove].guidance.priority,'wood');assert.equal(steps[select].guidance.targetEnabled,true);
});

test('fish processing uses the Fisher local fresh fish and never borrows central fish as its input',()=>{
 const s=world();s.buildings.fisher.level=5;s.education.discoveries.fishProcessing=true;s.provisions.localStock.fisher={};s.resources.smokedFish=0;
 s.constructionProjects=[{order:1,building:'dock',targetLevel:2,stage:'planned',cost:{smokedFish:2},remainingMaterials:{smokedFish:2},reservedMaterials:{}}];
 const p=plan(s),fish=p.diagnostics.production.find(row=>row.recipeId==='fish'),smoked=p.diagnostics.production.find(row=>row.recipeId==='smokedFish');
 assert.ok(fish&&smoked);assert.equal(fish.quantity,8);assert.equal(fish.usedLocally,8);assert.equal(smoked.inputs.fish.central,0);assert.ok(p.steps.some(row=>/bez transportu/.test(row.why)));
});

test('an in-progress construction cargo is not ordered or manufactured again',()=>{
 const s=world();s.resources.wood=0;s.constructionProjects=[{order:5,building:'dock',targetLevel:2,stage:'transport',cost:{wood:400},remainingMaterials:{wood:0},reservedMaterials:{wood:0},economyTiming:{version:1,capacity:120,trips:4,courseSeconds:10,buildingDuration:90,totalSeconds:150}}];
 staff(s,'warehouse',3);s.haulTrips.warehouse=[{kind:'construction',projectOrder:5,worker:0,residentId:s.residents[0].id,resource:'wood',amount:400,remaining:25,workMultiplier:1}];
 const p=plan(s);assert.equal(p.diagnostics.production.some(row=>row.resource==='wood'),false);assert.ok(p.steps.find(row=>row.id==='build-dock').text.includes('już przyjęta'));
});

test('topic answer survives a food prerequisite and a new explicit goal clears the old topic',()=>{
 const s=world();for(const id of FOOD_IDS)s.resources[id]=0;const p=plan(s,'Wolni mieszkańcy',{goal:'dock',targetLevel:2});
 assert.equal(p.goal,'dock');assert.match(p.topicSummary,new RegExp(String(p.freeWorkers)));assert.equal(p.tracking.goal,'dock');assert.equal(p.tracking.topic,null);assert.ok(p.steps.some(row=>row.id==='build-dock'));
 assert.equal(advisorDevelopmentIntent('Port',{topic:'workers',goal:'townhall'}).topic,null);
});

test('a compared two-upgrade route charges both real costs before promising any improvement',()=>{
 const s=world();s.buildings.warehouse.level=24;s.resources.stone=390;staff(s,'warehouse',3);
 const p=plan(s),route=p.candidates.find(row=>row.via==='quarry');assert.ok(route,'the funded quarry is a genuine compared prerequisite');
 assert.equal(route.totalCost.stone,route.prerequisiteCost.stone+route.cost.stone);assert.equal(route.totalCost.wood,route.prerequisiteCost.wood+route.cost.wood);
 assert.ok(route.seconds>p.estimate.seconds,'the extra upgrade is slower in this fixture and must not be selected');
});

test('an alternate route changes actual staffing or explicitly says no alternative exists',()=>{
 const s=world();s.buildings.warehouse.level=24;s.resources.stone=0;staff(s,'warehouse',3);
 const first=plan(s),alternate=plan(s,'Inna droga',{goal:'dock',targetLevel:2,alternative:true});
 assert.equal(alternate.goal,'dock');if(alternate.alternative.available)assert.notDeepEqual(alternate.diagnostics.hires,first.diagnostics.hires);else assert.match(alternate.text,/nie znalazłem/);
});

test('lack of free staff produces a waiting House review instead of a zero-person production instruction',()=>{
 const s=world();staff(s,'quarry',s.residents.length);s.resources.wood=s.resources.planks=0;const p=plan(s);
 assert.equal(p.freeWorkers,0);assert.equal(p.estimate.seconds,null);assert.ok(p.steps.some(row=>row.id.startsWith('recipe-')&&row.target==='house'&&row.guidance.action==='inspect'));
 assert.ok(p.steps.filter(row=>row.guidance.action==='recipe-workers').every(row=>row.guidance.targetCount>0));
});

test('ordinary-level auto plan responds to actual food staffing rather than remaining a Town Hall order',()=>{
 const s=world(3);s.bonusMaterials={...s.resources};staff(s,'farm',4);s.provisions.assignments.farm={farmGrain:2,farmVegetables:2};staff(s,'warehouse',3);
 const growth=plan(s,'');assert.equal(growth.goal,'townhall');assert.equal(growth.tracking,null);assert.ok(growth.steps.some(row=>row.id==='build-townhall'));
 for(const p of s.residents.filter(p=>p.workplace==='farm'))p.workplace=null;s.buildings.farm.workers=0;s.provisions.assignments.farm={farmGrain:0,farmVegetables:0};
 const food=plan(s,'');assert.equal(food.kind,'food');assert.equal(food.goal,null);assert.equal(food.tracking,null);assert.ok(food.tasks.every(task=>!task.id.startsWith('build')));assert.equal(food.tasks.length,2);
 staff(s,'farm',4);s.provisions.assignments.farm={farmGrain:2,farmVegetables:2};const recovered=plan(s,'');assert.equal(recovered.goal,'townhall');assert.ok(recovered.steps.some(row=>row.id==='build-townhall'));
});

test('a funded capacity bottleneck changes the actual automatic upgrade to the Warehouse',()=>{
 const s=world(5);for(const id of Object.keys(s.resources))s.resources[id]=0;Object.assign(s.resources,{coins:100000,wood:55000,stone:1000,grain:1000,vegetables:1000,food:1000,planks:1000});
 staff(s,'farm',4);s.provisions.assignments.farm={farmGrain:2,farmVegetables:2};staff(s,'warehouse',3);
 const full=plan(s,'');assert.equal(full.goal,'warehouse');assert.equal(full.targetLevel,2);assert.equal(full.tracking,null);assert.ok(full.steps.some(row=>row.id==='build-warehouse'));
 s.buildings.warehouse.level=3;const roomy=plan(s,'');assert.equal(roomy.goal,'townhall');assert.ok(roomy.steps.some(row=>row.id==='build-townhall'));
});

test('an accepted player project becomes the automatic goal while explicit Port retains its own direction',()=>{
 const s=world(5);s.bonusMaterials={...s.resources};staff(s,'farm',4);s.provisions.assignments.farm={farmGrain:2,farmVegetables:2};staff(s,'warehouse',3);
 s.constructionProjects=[{order:1,building:'quarry',targetLevel:2,stage:'building',buildRemaining:70,remainingMaterials:{},reservedMaterials:{}}];
 const automatic=plan(s,'');assert.equal(automatic.goal,'quarry');assert.equal(automatic.targetLevel,2);assert.equal(automatic.tracking,null);assert.match(automatic.why,/już przyjęta/);
 const explicit=plan(s,'Port');assert.equal(explicit.goal,'dock');assert.equal(explicit.tracking.goal,'dock');
});

test('new named goals discard old target levels, including repeating a completed named goal',()=>{
 const s=world(5);s.buildings.dock.level=2;
 const house=plan(s,'Dom',{goal:'dock',targetLevel:2});assert.equal(house.goal,'house');assert.equal(house.targetLevel,6);
 const port=plan(s,'Port',{goal:'dock',targetLevel:2});assert.equal(port.goal,'dock');assert.equal(port.targetLevel,3);
 const followup=advisorDevelopmentIntent('Dlaczego tak?',{goal:'dock',targetLevel:2});assert.equal(followup.targetLevel,2);
});

test('already sustainable manual topics and Theatre retain2–5 distinct complete cards',()=>{
 const s=world();s.bonusMaterials={...s.resources};staff(s,'farm',4);s.provisions.assignments.farm={farmGrain:2,farmVegetables:2};staff(s,'warehouse',3);
 for(const input of ['Wolni mieszkańcy','Jedzenie','Transport','Teatr']){const result=plan(s,input);assert.ok(result.tasks.length>=2&&result.tasks.length<=5,input);for(const task of result.tasks)assert.ok(task.howTo.length&&task.howTo.every(row=>row.why));}
});
