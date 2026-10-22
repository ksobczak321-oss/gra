import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, tick, totalWorkers, workerLimit, freeWorkers, taxRate, housingCapacity, unhousedResidents, populationRate, updateHappiness, happinessGroups, recordVisit, WORKPLACE_IDS, RESOURCES, EXPEDITIONS, MAX_BUILDING_LEVEL, buildingCost, upgradeEligibility, synchronizeResidents } from '../harborlight-v1-state.js';
import { producerCapacity, warehouseLimits, warehouseUsed, stockRoom, storagePenalty, updateStorageStatus, marketCapacity, marketUsed, MATERIAL_IDS, constructionCounts, premiumActive, promoteConstructionQueue, estimateMaterialsSeconds } from '../harborlight-v1-logistics.js';

const close = (a,b,tolerance=1e-7) => assert.ok(Math.abs(a-b)<tolerance, `${a} != ${b}`);
function idle(level=1,population=12,happiness=0) {
  const state=createState();
  state.buildings.townhall.level=level;state.buildings.house.level=level;
  state.population=population;state.capacity=level*24;
  state.baseHappiness=happiness;state.happiness=happiness;
  for(const building of Object.values(state.buildings)){building.workers=0;building.workProgress=[];}
  state.version=6;delete state.residents;
  return normalizeState(state);
}
function crew(state,id,count){synchronizeResidents(state);const delta=count-state.buildings[id].workers;if(delta)assert.equal(act(state,{type:'assign',building:id,delta}).ok,true,`assign ${count} to ${id}`);}
function intrinsic(state,value){for(const resident of state.residents)resident.happiness=value;updateHappiness(state);}
function intrinsicMean(state){return state.residents.reduce((sum,resident)=>sum+resident.happiness,0)/state.population;}
function funded(level=4){const state=idle(level);state.buildings.warehouse.level=level;state.resources.coins=10000;for(const id of MATERIAL_IDS)state.resources[id]=500*level;state.resources.food=Math.min(warehouseLimits(state).perResource,500*level+2000);return state;}
function finish(state,id){const project=state.buildings[id].construction;assert.ok(project);const transport=Math.ceil(project.goodsRemaining/state.buildings.warehouse.workers)*60;tick(state,transport);tick(state,state.buildings[id].construction?.buildRemaining||0);}
function saved(state){return normalizeState(JSON.parse(JSON.stringify(state)));}

test('fresh island has six resources, six unlocked workers and no passive chapel bonus',()=>{
 const s=createState();assert.equal(s.version,7);assert.deepEqual(s.resources,Object.fromEntries(Object.keys(RESOURCES).map(id=>[id,100])));
 assert.equal(s.population,12);assert.equal(s.capacity,24);assert.equal(housingCapacity(s),24);assert.equal(totalWorkers(s),6);assert.equal(freeWorkers(s),6);assert.equal(taxRate(s),6);assert.equal(s.happiness,0);assert.equal(s.chapelRemaining,0);
 for(const id of Object.keys(s.buildings))assert.equal(s.buildings[id].ready,0);
});
test('townhall and house provide their capacities only when real construction finishes',()=>{
 const s=funded(1);crew(s,'warehouse',6);const before=JSON.stringify(s);assert.equal(act(s,{type:'upgrade',building:'house'}).ok,false);assert.equal(JSON.stringify(s),before);
 assert.equal(act(s,{type:'upgrade',building:'townhall'}).ok,true);assert.equal(s.capacity,24);finish(s,'townhall');assert.equal(s.capacity,48);assert.equal(housingCapacity(s),24);
 for(const id of Object.keys(RESOURCES))s.resources[id]=500;s.resources.food=1000;
 assert.equal(act(s,{type:'upgrade',building:'house'}).ok,true);assert.equal(housingCapacity(s),24);finish(s,'house');assert.equal(housingCapacity(s),48);assert.ok(s.population>=12&&s.population<=s.capacity);
 for(const id of Object.keys(s.buildings).filter(id=>id!=='townhall')){s.buildings[id].level=2;const stock={...s.resources};assert.equal(act(s,{type:'upgrade',building:id}).ok,false,id);assert.deepEqual(s.resources,stock);}
});
test('level six works and worker limit uses actual population, not theoretical capacity',()=>{
 const s=funded(5);crew(s,'warehouse',6);assert.equal(act(s,{type:'upgrade',building:'townhall'}).ok,true);finish(s,'townhall');assert.equal(s.capacity,144);assert.equal(workerLimit(s,'farm'),Math.floor(s.population/2));
 s.population=144;s.buildings.house.level=6;assert.equal(workerLimit(s,'farm'),72);
 s.population=13;assert.equal(workerLimit(s,'farm'),6);assert.ok(MAX_BUILDING_LEVEL>=6);
});
test('only the eight workplaces accept assignments; market and dock unlock at two and four',()=>{
 assert.deepEqual(new Set(WORKPLACE_IDS),new Set(['farm','windmill','lumber','sawmill','quarry','warehouse','dock','market']));
 const s=idle();for(const id of ['house','townhall','chapel','lighthouse','market','dock'])assert.equal(act(s,{type:'assign',building:id,delta:1}).ok,false,id);
 s.buildings.townhall.level=2;assert.equal(act(s,{type:'assign',building:'market',delta:1}).ok,true);assert.equal(act(s,{type:'assign',building:'dock',delta:1}).ok,false);
 s.buildings.townhall.level=4;assert.equal(act(s,{type:'assign',building:'dock',delta:1}).ok,true);
});
test('bulk assignment shares a single pool and dismissal always means five minutes home',()=>{
 const s=idle(6,144);assert.equal(act(s,{type:'assign',building:'farm',delta:72}).ok,true);assert.equal(act(s,{type:'assign',building:'quarry',delta:72}).ok,true);
 assert.equal(freeWorkers(s),0);const before=JSON.stringify(s);assert.equal(act(s,{type:'assign',building:'warehouse',delta:1}).ok,false);assert.equal(JSON.stringify(s),before);
 act(s,{type:'assign',building:'farm',delta:-72});assert.equal(totalWorkers(s),72);assert.equal(s.returningWorkers.length,72);assert.equal(freeWorkers(s),0);
 tick(s,299);assert.equal(freeWorkers(s),0);tick(s,1);assert.equal(freeWorkers(s),72);
 assert.equal(act(s,{type:'assign',building:'warehouse',delta:72}).ok,true);
});
test('bad assignment deltas never mutate state',()=>{
 const s=idle();for(const delta of [0,.5,NaN,Infinity,'1',1000,-1]){const before=JSON.stringify(s);assert.equal(act(s,{type:'assign',building:'farm',delta}).ok,false);assert.equal(JSON.stringify(s),before);}
});
test('one producer has one whole unit after seven minutes and two after thirteen',()=>{
 for(const [seconds,output,phase]of[[420,1,60],[780,2,60]]){const s=idle();crew(s,'farm',1);tick(s,seconds);assert.equal(s.buildings.farm.ready,output);close(s.buildings.farm.workProgress[0],phase);assert.equal(s.resources.grain,100);}
});
test('workers do not pool unfinished units and recalled fractions are lost',()=>{
 const s=idle();crew(s,'farm',2);tick(s,180);assert.equal(s.buildings.farm.ready,0);assert.deepEqual(s.buildings.farm.workProgress,[180,180]);
 act(s,{type:'assign',building:'farm',delta:-2});assert.deepEqual(s.buildings.farm.workProgress,[]);tick(s,300);act(s,{type:'assign',building:'farm',delta:1});tick(s,359);assert.equal(s.buildings.farm.ready,0);tick(s,1);assert.equal(s.buildings.farm.ready,1);
});
test('individual work phases and home-return clocks survive reload',()=>{
 let s=idle();crew(s,'farm',1);tick(s,420);s=saved(s);close(s.buildings.farm.workProgress[0],60);act(s,{type:'assign',building:'farm',delta:-1});tick(s,240);s=saved(s);close(s.returningWorkers[0],60);tick(s,60);assert.equal(s.returningWorkers.length,0);
});
test('processors consume two central inputs for one local product',()=>{
 const s=idle();crew(s,'sawmill',1);crew(s,'windmill',1);tick(s,360);assert.equal(s.resources.wood,98);assert.equal(s.resources.grain,98);assert.equal(s.resources.planks,100);close(s.resources.food+s.foodCredit,100-12*360/3600);assert.equal(s.buildings.sawmill.ready,1);assert.equal(s.buildings.windmill.ready,1);assert.equal(s.statistics.crafted,2);
});
test('local production capacity follows townhall and full stores stop output',()=>{
 const s=idle(6,144);crew(s,'lumber',1);s.buildings.lumber.level=1;s.buildings.lumber.ready=1200;tick(s,3600);assert.equal(producerCapacity(s),1200);assert.equal(s.buildings.lumber.ready,1200);assert.equal(s.buildings.lumber.workProgress[0],0);
});
test('manual collecting and crafting cannot bypass work and transport',()=>{
 const s=idle();s.buildings.lumber.ready=50;for(const action of [{type:'collect',building:'lumber'},{type:'craft',building:'sawmill'}]){const before=JSON.stringify(s);assert.equal(act(s,action).ok,false);assert.equal(JSON.stringify(s),before);}
});
test('warehouse worker carries one item per minute according to priorities',()=>{
 const s=idle();crew(s,'warehouse',1);s.buildings.lumber.ready=3;s.buildings.farm.ready=3;s.transportPriority=['grain','wood','stone','food','planks'];tick(s,59);assert.equal(s.resources.grain,100);tick(s,1);assert.equal(s.resources.grain,101);assert.equal(s.buildings.farm.ready,2);
});
test('empty sources and full resource slots are skipped without losing goods',()=>{
 const s=idle();crew(s,'warehouse',1);s.resources.wood=1000;s.resources.stone=999;s.resources.grain=1000;s.resources.food=1000;s.resources.planks=0;s.buildings.lumber.ready=5;s.buildings.quarry.ready=5;s.buildings.sawmill.ready=5;tick(s,120);assert.equal(warehouseUsed(s),4000);assert.equal(s.resources.stone,1000);assert.equal(s.resources.planks,1);assert.equal(s.resources.food,999);assert.equal(s.buildings.sawmill.ready,4);assert.equal(s.buildings.lumber.ready,5);assert.equal(s.buildings.quarry.ready,4);
});
test('warehouse capacity scales by fifty percent per building level; coins use no space',()=>{
 const s=idle(6);for(const[level,each,total]of[[1,1000,4000],[2,1500,6000],[3,2250,9000]]){s.buildings.warehouse.level=level;assert.deepEqual(warehouseLimits(s),{perResource:each,total});}const used=warehouseUsed(s);s.resources.coins=10000000;assert.equal(warehouseUsed(s),used);
});
test('construction spends local goods only after they reach the central warehouse',()=>{
 const s=idle(2);for(const id of Object.keys(RESOURCES))s.resources[id]=500;s.resources.food=600;s.resources.planks=480;s.buildings.house.level=1;s.buildings.sawmill.ready=20;crew(s,'warehouse',1);s.transportPriority=['planks','wood','stone','grain','food'];assert.equal(act(s,{type:'upgrade',building:'house'}).ok,false);tick(s,1200);assert.equal(s.resources.planks,500);assert.equal(act(s,{type:'upgrade',building:'house'}).ok,true);assert.equal(s.resources.planks,0);assert.equal(s.buildings.sawmill.ready,0);assert.equal(s.buildings.house.level,1);
});
test('taxes use real active worker-hours, exclude unemployed and ignore production speed',()=>{
 for(const speed of [1,2,4]){const s=idle(4);crew(s,'dock',1);s.speed=speed;tick(s,3600);assert.equal(s.resources.coins,101);assert.equal(s.statistics.taxCollected,1);act(s,{type:'pause'});const before=JSON.stringify(s);tick(s,3600);assert.equal(JSON.stringify(s),before);}
 const no=idle(4);tick(no,3600);assert.equal(no.resources.coins,100);
});
test('fractional taxes persist and walking home earns none',()=>{
 let s=idle(4);crew(s,'dock',1);tick(s,1800);close(s.taxProgress,.5);s=saved(s);act(s,{type:'assign',building:'dock',delta:-1});tick(s,1800);close(s.taxProgress,.5);assert.equal(s.resources.coins,100);act(s,{type:'assign',building:'market',delta:1});tick(s,1800);assert.equal(s.resources.coins,101);close(s.taxProgress,0);
});
test('population-loss tax uses the old crew before the loss and the smaller crew afterward',()=>{
 const s=idle(4,8,-100);s.resources.food=0;for(const resident of s.residents)resident.hungerSeconds=43200;crew(s,'farm',4);crew(s,'quarry',4);tick(s,7200);assert.equal(s.population,6);assert.equal(totalWorkers(s),6);assert.equal(s.resources.coins,114);assert.equal(s.statistics.taxCollected,14);for(const id of WORKPLACE_IDS)assert.ok(s.buildings[id].workers<=workerLimit(s,id));
});
test('approved population-rate anchors remain symmetric',()=>{
 for(const[h,hours]of[[25,12],[50,6],[75,12/7],[100,1]]){close(populationRate(h),1/hours);close(populationRate(-h),-1/hours);}assert.equal(populationRate(0),0);const s=idle(4,12);tick(s,3600);close(s.happiness,1);close(s.populationProgress,1/600);assert.equal(s.population,12);
});
test('population progress persists and resets when happiness changes sign',()=>{
 let s=idle(4,12,100);tick(s,1800);close(s.populationProgress,.5);s=saved(s);tick(s,1800);assert.equal(s.population,13);intrinsic(s,-100);s.resources.food=0;s.foodCredit=0;for(const resident of s.residents)resident.hungerSeconds=43200;tick(s,1800);close(s.populationProgress,.5);intrinsic(s,0);for(const resident of s.residents){resident.hungerSeconds=0;resident.unemployedSeconds=0;}tick(s,1);assert.equal(s.populationProgress,0);
});
test('population keeps the minimum six and townhall capacity',()=>{
 const low=idle(4,12,-100);low.resources.food=0;for(const resident of low.residents){resident.hungerSeconds=43200;resident.unemployedSeconds=43200;}tick(low,100*3600);assert.equal(low.population,6);const high=idle(1,12,100);high.resources.food=1000;high.lighthouseRemaining=86400;tick(high,12*3600);assert.equal(high.population,24);tick(high,3600);assert.equal(high.population,24);assert.equal(high.populationProgress,0);
});
test('housing shortage continues during construction and ends when the new house opens',()=>{
 const s=funded(4);s.population=78;s.buildings.house.level=3;synchronizeResidents(s);crew(s,'warehouse',39);assert.equal(unhousedResidents(s),6);tick(s,3600);close(s.happiness,-4.5);assert.equal(act(s,{type:'upgrade',building:'house'}).ok,true);assert.equal(housingCapacity(s),72);finish(s,'house');assert.equal(housingCapacity(s),96);const happiness=s.happiness;assert.ok(happiness<-4.5);tick(s,3600);close(s.happiness,happiness+1.5);
});
test('mean happiness weights affected workers rather than applying their penalty to everyone',()=>{
 const s=idle(1,12);crew(s,'lumber',6);s.buildings.lumber.ready=200;updateStorageStatus(s);updateHappiness(s);assert.equal(storagePenalty(s,'lumber'),10);assert.equal(s.happiness,-5);assert.equal(happinessGroups(s).find(g=>g.building==='lumber').happiness,-10);
 intrinsic(s,-95);assert.equal(s.happiness,-97.5);
});
test('full-store penalty grows each twenty-four hours to minus fifty and clears after unloading',()=>{
 const s=idle(6,144);crew(s,'lumber',6);s.buildings.lumber.ready=1200;updateStorageStatus(s);updateHappiness(s);assert.equal(storagePenalty(s,'lumber'),10);
 for(const expected of[20,30,40,50]){for(let part=0;part<4;part++){s.resources.food=1000;tick(s,21600);}assert.equal(storagePenalty(s,'lumber'),expected);}s.resources.food=1000;tick(s,3600);assert.equal(storagePenalty(s,'lumber'),50);s.buildings.lumber.ready=1199;updateStorageStatus(s);updateHappiness(s);assert.equal(storagePenalty(s,'lumber'),0);intrinsic(s,0);assert.equal(s.happiness,0);
});
test('full notifications fire on each transition, persist and can be marked read',()=>{
 let s=idle();s.buildings.lumber.ready=200;updateStorageStatus(s);assert.equal(s.notifications.length,1);tick(s,60);assert.equal(s.notifications.length,1);s=saved(s);assert.equal(s.notifications.length,1);act(s,{type:'readNotifications'});assert.ok(s.notifications.every(n=>n.read));s.buildings.lumber.ready=199;updateStorageStatus(s);s.buildings.lumber.ready=200;updateStorageStatus(s);assert.equal(s.notifications.length,2);assert.equal(s.notifications[0].read,false);
});
test('chapel upgrade gives ten full bonus hours after completion and exactly double tax',()=>{
 const s=funded(4);crew(s,'dock',1);crew(s,'warehouse',1);assert.equal(act(s,{type:'upgrade',building:'chapel'}).ok,true);assert.equal(s.happiness,0);finish(s,'chapel');assert.equal(s.chapelRemaining,36000);close(s.happiness,intrinsicMean(s)+20);act(s,{type:'assign',building:'warehouse',delta:-1});assert.equal(taxRate(s),2);const coins=s.resources.coins;tick(s,36000);assert.equal(s.resources.coins,coins+20);close(s.happiness,intrinsicMean(s));assert.equal(taxRate(s),1);assert.equal(s.chapelRemaining,0);
});
test('manual blessing gives fifty of every resource and twenty happiness for one hour with lifetime charges',()=>{
 let s=idle(4);s.buildings.chapel.level=2;const stock={...s.resources};assert.equal(act(s,{type:'blessing'}).ok,true);for(const id of Object.keys(RESOURCES))assert.equal(s.resources[id],stock[id]+50);assert.equal(s.happiness,20);assert.equal(s.blessingsUsed,1);assert.equal(act(s,{type:'blessing'}).ok,false);s=saved(s);tick(s,3600);close(s.happiness,1);assert.equal(act(s,{type:'blessing'}).ok,true);tick(s,3600);assert.equal(act(s,{type:'blessing'}).ok,false);assert.equal(s.blessingsUsed,2);
});
test('upgrade bonus and manual blessing can coexist without exceeding person happiness bounds',()=>{
 const s=funded(4);intrinsic(s,90);act(s,{type:'upgrade',building:'chapel'});act(s,{type:'blessing'});assert.equal(s.happiness,100);assert.ok(happinessGroups(s).every(g=>g.happiness<=100));
});
test('market capacity and unlocks follow player and own building levels',()=>{
 const s=idle(1);assert.equal(act(s,{type:'marketOrder',resource:'wood',amount:10}).ok,false);s.buildings.townhall.level=2;assert.equal(act(s,{type:'marketOrder',resource:'wood',amount:10}).ok,true);assert.equal(act(s,{type:'trade',resource:'wood',amount:10}).ok,false);for(const[level,cap]of[[1,1000],[2,1500],[3,2250]]){s.buildings.market.level=level;assert.equal(marketCapacity(s),cap);}
});
test('market workers deliver sixty per hour, and every arrival locks for an hour',()=>{
 const s=idle(2);crew(s,'market',1);act(s,{type:'marketOrder',resource:'wood',amount:10});tick(s,600);assert.equal(s.resources.wood,90);assert.equal(marketUsed(s),10);assert.equal(s.market.stock.wood,0);assert.equal(s.market.locked.reduce((n,l)=>n+l.amount,0),10);tick(s,3599);assert.equal(act(s,{type:'marketExchange',from:'wood',to:'stone',amount:10}).ok,false);tick(s,1);assert.equal(s.market.stock.wood,10);
});
test('market exchanges only within groups, charges ten percent and never uses money',()=>{
 const s=idle(2);s.market.stock.wood=10;s.market.stock.planks=10;const coins=s.resources.coins;assert.equal(act(s,{type:'marketExchange',from:'planks',to:'stone',amount:10}).ok,false);assert.equal(act(s,{type:'marketExchange',from:'wood',to:'stone',amount:10}).ok,true);assert.equal(s.market.stock.stone,9);assert.equal(s.market.stock.wood,0);assert.equal(s.resources.stone,100);assert.equal(s.resources.coins,coins);assert.equal(act(s,{type:'marketExchange',from:'coins',to:'wood',amount:10}).ok,false);
});
test('market output reaches usable stock only through a requested warehouse pickup',()=>{
 const s=idle(2);crew(s,'warehouse',1);s.market.stock.stone=9;tick(s,60);assert.equal(s.resources.stone,100);assert.equal(act(s,{type:'marketDispatch',resource:'stone',amount:9}).ok,true);tick(s,540);assert.equal(s.resources.stone,109);assert.equal(s.market.stock.stone,0);
});
test('market over-capacity orders and unavailable locked inventory do not change balances',()=>{
 const s=idle(2);s.market.stock.food=995;const before=JSON.stringify(s);assert.equal(act(s,{type:'marketOrder',resource:'wood',amount:10}).ok,false);assert.equal(JSON.stringify(s),before);assert.equal(act(s,{type:'marketExchange',from:'wood',to:'stone',amount:10}).ok,false);
});
test('daily loyalty uses Warsaw calendar days, never repeats a same-day visit and caps at ten',()=>{
 const s=createState();assert.equal(recordVisit(s,'2026-10-21T22:30:00Z'),true);assert.equal(s.loyalty.lastDay,'2026-10-22');assert.equal(s.loyalty.streak,1);assert.equal(recordVisit(s,'2026-10-22T12:00:00Z'),false);for(let day=23;day<=31;day++)recordVisit(s,`2026-10-${day}T12:00:00Z`);assert.equal(s.loyalty.streak,10);recordVisit(s,'2026-11-02T12:00:00Z');assert.equal(s.loyalty.streak,1);assert.equal(s.resources.coins,100);
});
test('overflow rewards and migrated stock wait for transport without becoming spendable',()=>{
 const raw=idle();raw.resources={coins:100,wood:1000,stone:1000,grain:1000,food:1000,planks:500};let s=saved(raw);assert.equal(warehouseUsed(s),4000);assert.equal(s.resources.planks,0);assert.equal(s.pendingDeliveries.planks,500);assert.equal(stockRoom(s,'planks'),0);crew(s,'warehouse',1);s.resources.wood-=1;tick(s,60);assert.equal(s.resources.planks,1);assert.equal(s.pendingDeliveries.planks,499);
});
test('legacy farm food and unclaimed coin batches preserve their types and settle once',()=>{
 const raw=idle();raw.version=3;delete raw.resources.grain;raw.buildings.farm.ready=12;raw.buildings.dock.ready=20;raw.buildings.market.ready=30;raw.buildings.townhall.ready=40;let s=normalizeState(raw);assert.equal(s.resources.coins,190);assert.equal(s.resources.grain,0);assert.equal(s.pendingDeliveries.food,12);assert.equal(s.buildings.farm.ready,0);s=saved(s);assert.equal(s.resources.coins,190);assert.equal(s.pendingDeliveries.food,12);
});
test('legacy over-level buildings keep investments by promoting the old townhall once',()=>{
 const raw=idle();raw.version=2;raw.buildings.house.level=5;raw.buildings.townhall.level=1;const s=normalizeState(raw);assert.equal(s.buildings.house.level,5);assert.equal(s.buildings.townhall.level,5);const current=saved({...raw,version:6});assert.equal(current.buildings.house.level,1);
});
test('expedition and task rewards cannot be claimed twice after reload',()=>{
 const s=idle();assert.equal(act(s,{type:'expeditionComplete',expedition:EXPEDITIONS[0].id,moves:10,caches:1}).ok,true);assert.equal(act(s,{type:'claim',task:'expedition'}).ok,true);const after=saved(s),before=JSON.stringify(after.resources);assert.equal(act(after,{type:'expeditionComplete',expedition:EXPEDITIONS[0].id,moves:10,caches:1}).ok,false);assert.equal(act(after,{type:'claim',task:'expedition'}).ok,false);assert.equal(JSON.stringify(after.resources),before);
});
test('lighthouse costs every resource including gold and uses transport plus twice that building time',()=>{
 const s=funded(3);crew(s,'warehouse',6);const stock={...s.resources};assert.deepEqual(buildingCost(s,'lighthouse'),Object.fromEntries(Object.keys(RESOURCES).map(id=>[id,500])));assert.equal(act(s,{type:'repair'}).ok,true);for(const id of Object.keys(RESOURCES))assert.equal(s.resources[id],stock[id]-500);assert.equal(act(s,{type:'repair'}).ok,false);tick(s,25020);assert.equal(s.buildings.lighthouse.construction.stage,'building');close(s.buildings.lighthouse.construction.buildRemaining,50040);assert.equal(s.buildings.lighthouse.level,0);tick(s,50039);assert.equal(s.buildings.lighthouse.level,0);tick(s,1);assert.equal(s.buildings.lighthouse.level,1);assert.equal(s.objective.repaired,true);assert.equal(s.lighthouseRemaining,86400);close(s.happiness,s.residents.reduce((sum,resident)=>sum+Math.min(100,resident.happiness+100),0)/s.population);assert.equal(saved(s).buildings.lighthouse.level,1);
});
test('whole and split intervals agree for output, transport, taxes and average happiness',()=>{
 const a=createState(),b=saved(a);tick(a,3600);for(let i=0;i<3600;i++)tick(b,1);assert.deepEqual(a.resources,b.resources);for(const id of WORKPLACE_IDS){assert.equal(a.buildings[id].ready,b.buildings[id].ready);for(let n=0;n<a.buildings[id].workProgress.length;n++)close(a.buildings[id].workProgress[n],b.buildings[id].workProgress[n]);}close(a.happiness,b.happiness);close(a.taxProgress,b.taxProgress);
});
test('invalid saved numbers are bounded without negative materials or illegal worker pools',()=>{
 const raw=idle();raw.population=1;raw.happiness=Infinity;raw.baseHappiness=Infinity;raw.resources.wood=-100;raw.resources.coins=Infinity;for(const b of Object.values(raw.buildings))b.workers=999;const s=normalizeState(raw);assert.equal(s.population,6);assert.ok(Number.isFinite(s.happiness));assert.equal(s.resources.wood,0);assert.ok(totalWorkers(s)+s.returningWorkers.length<=s.population);for(const id of WORKPLACE_IDS)assert.ok(s.buildings[id].workers<=workerLimit(s,id));for(const amount of Object.values(s.resources))assert.ok(Number.isFinite(amount)&&amount>=0);
});

test('agreed accessible production costs use current level and add overlapping output resources',()=>{
 const s=idle(4);assert.deepEqual(buildingCost(s,'farm'),{wood:72,stone:72,grain:120});assert.deepEqual(buildingCost(s,'lumber'),{wood:192,stone:72});assert.deepEqual(buildingCost(s,'quarry'),{wood:72,stone:192});s.buildings.sawmill.level=3;assert.deepEqual(buildingCost(s,'sawmill'),{wood:216,stone:216,planks:360});
 for(const id of ['house','townhall','market','warehouse','dock']){s.buildings[id].level=3;assert.deepEqual(buildingCost(s,id),Object.fromEntries(Object.keys(RESOURCES).map(resource=>[resource,1500])));}
});
test('production upgrade reserves its whole cost, transports at sixty per carrier-hour, then builds equally long',()=>{
 const s=funded(2);crew(s,'warehouse',6);const stock={...s.resources};assert.equal(act(s,{type:'upgrade',building:'farm'}).ok,true);assert.equal(s.resources.wood,stock.wood-72);assert.equal(s.resources.grain,stock.grain-120);assert.equal(s.buildings.farm.level,1);tick(s,2639);assert.equal(s.buildings.farm.construction.goodsRemaining,6);tick(s,1);assert.equal(s.buildings.farm.construction.stage,'building');close(s.buildings.farm.construction.buildRemaining,2640);tick(s,2639);assert.equal(s.buildings.farm.level,1);tick(s,1);assert.equal(s.buildings.farm.level,2);assert.equal(s.statistics.upgrades,1);assert.equal(s.constructionProjects.length,0);
});
test('construction without carriers waits; releasing workers freezes transport but not completed building work',()=>{
 const s=funded(2);assert.equal(act(s,{type:'upgrade',building:'farm'}).ok,true);tick(s,600);assert.equal(s.buildings.farm.construction.transportSeconds,0);crew(s,'warehouse',1);tick(s,60);assert.equal(s.buildings.farm.construction.goodsRemaining,263);act(s,{type:'assign',building:'warehouse',delta:-1});tick(s,300);assert.equal(s.buildings.farm.construction.goodsRemaining,263);assert.equal(s.buildings.farm.construction.transportSeconds,60);
});
test('level two permits two active and two funded waiting projects, rejecting overflow without spending',()=>{
 const s=funded(2);crew(s,'warehouse',6);for(const id of ['farm','windmill','lumber','quarry'])assert.equal(act(s,{type:'upgrade',building:id}).ok,true);assert.deepEqual(constructionCounts(s),{active:2,queued:2,limit:2,queueLimit:2,premium:false});const before=JSON.stringify(s);assert.equal(act(s,{type:'upgrade',building:'sawmill'}).ok,false);assert.equal(JSON.stringify(s),before);const queued=s.constructionProjects.find(p=>p.building==='lumber');assert.equal(queued.stage,'queued');tick(s,5280);assert.equal(s.buildings.farm.level,2);assert.equal(queued.stage,'transport');assert.equal(constructionCounts(s).active,2);assert.equal(constructionCounts(s).queued,1);
});
test('normal waiting projects require the full cost in the central warehouse',()=>{
 const s=idle(2);s.resources.grain=119;const before=JSON.stringify(s);assert.equal(act(s,{type:'upgrade',building:'farm'}).ok,false);assert.equal(JSON.stringify(s),before);assert.equal(s.constructionProjects.length,0);
});
test('construction reserves each successive level separately and never builds one building twice in parallel',()=>{
 const s=funded(3);crew(s,'warehouse',6);assert.equal(act(s,{type:'upgrade',building:'farm'}).ok,true);assert.equal(act(s,{type:'upgrade',building:'farm'}).ok,true);assert.deepEqual(s.constructionProjects.map(p=>p.targetLevel),[2,3]);assert.equal(s.constructionProjects[1].stage,'queued');assert.deepEqual(s.constructionProjects[1].cost,{wood:144,stone:144,grain:240});tick(s,5280);assert.equal(s.buildings.farm.level,2);assert.equal(s.constructionProjects[0].stage,'transport');finish(s,'farm');assert.equal(s.buildings.farm.level,3);
});
test('paid entitlement adds four active slots and plans with missing resources, without inventing a purchase',()=>{
 const s=funded(2);s.premium.expiresAt=Date.now()+3600000;for(const id of ['farm','windmill','lumber','quarry','sawmill','chapel'])assert.equal(act(s,{type:'upgrade',building:id}).ok,true,id);assert.equal(constructionCounts(s).active,6);assert.equal(constructionCounts(s).limit,6);assert.equal(constructionCounts(s).queueLimit,Infinity);assert.equal(act(s,{type:'upgrade',building:'market'}).ok,true);assert.equal(s.buildings.market.construction.stage,'planned');assert.equal(act(s,{type:'buyPremium'}).ok,false);
});
test('paid pipeline accepts successive future levels and has no regular queue length cap',()=>{
 const s=idle(2);s.premium.expiresAt=Date.now()+3600000;for(const id of Object.keys(s.resources))s.resources[id]=0;for(let level=3;level<=12;level++){assert.equal(act(s,{type:'upgrade',building:'townhall'}).ok,true);assert.equal(act(s,{type:'upgrade',building:'farm'}).ok,true);}assert.equal(s.constructionProjects.length,20);assert.equal(constructionCounts(s).queued,20);assert.equal(s.resources.wood,0);assert.equal(s.constructionProjects.at(-1).targetLevel,11);
});
test('a paid delivery plan waits for actual central arrival and reserves materials only once',()=>{
 const s=idle(2);s.premium.expiresAt=Date.now()+3600000;s.resources.grain=110;s.buildings.farm.ready=10;crew(s,'warehouse',1);assert.equal(act(s,{type:'upgrade',building:'farm'}).ok,true);assert.equal(s.buildings.farm.construction.stage,'planned');assert.equal(s.resources.wood,100);assert.ok(Number.isFinite(estimateMaterialsSeconds(s,s.buildings.farm.construction.cost)));tick(s,599);assert.equal(s.buildings.farm.construction.stage,'planned');tick(s,1);assert.equal(s.buildings.farm.construction.stage,'transport');assert.equal(s.resources.wood,28);assert.equal(s.resources.grain,0);const after=saved(s);assert.equal(after.resources.wood,28);assert.equal(after.buildings.farm.construction.stage,'transport');
});
test('expiry preserves active paid projects, limits new starts and holds unfunded plans',()=>{
 const s=funded(2);s.premium.expiresAt=Date.now()+3600000;for(const id of ['farm','windmill','lumber','quarry','sawmill','chapel','market'])assert.equal(act(s,{type:'upgrade',building:id}).ok,true);s.premium.expiresAt=0;tick(s,1);assert.equal(constructionCounts(s).active,6);assert.equal(constructionCounts(s).limit,2);assert.equal(s.buildings.market.construction.stage,'planned');for(const id of Object.keys(RESOURCES))s.resources[id]=500;tick(s,1);assert.equal(s.buildings.market.construction.stage,'planned');const restored=saved(s);assert.equal(constructionCounts(restored).active,6);assert.equal(restored.buildings.market.construction.stage,'planned');
});
test('queued reservation and progress survive save, reload, pause and different speed settings',()=>{
 let a=funded(3);crew(a,'warehouse',6);for(const id of ['farm','windmill','lumber','quarry'])act(a,{type:'upgrade',building:id});tick(a,2000);a=saved(a);const b=saved(a);a.paused=true;const before=JSON.stringify(a);tick(a,3600);assert.equal(JSON.stringify(a),before);a.paused=false;a.speed=4;tick(a,7000);for(let i=0;i<700;i++)tick(b,10);assert.deepEqual(a.resources,b.resources);assert.deepEqual(a.constructionProjects,b.constructionProjects);assert.equal(a.buildings.farm.level,b.buildings.farm.level);
});

test('lighthouse doubles the five material outputs and consumption, but never tax or hauling',()=>{
 const s=idle(4);s.lighthouseRemaining=3600;crew(s,'sawmill',1);crew(s,'windmill',1);crew(s,'farm',1);crew(s,'lumber',1);crew(s,'quarry',1);tick(s,180);for(const id of ['farm','lumber','quarry','sawmill','windmill'])assert.equal(s.buildings[id].ready,1);assert.equal(s.resources.wood,98);assert.equal(s.resources.grain,98);tick(s,3420);assert.equal(s.resources.coins,105);assert.equal(s.lighthouseRemaining,0);assert.equal(s.buildings.farm.ready,20);tick(s,180);assert.equal(s.buildings.farm.ready,20);tick(s,180);assert.equal(s.buildings.farm.ready,21);
});
test('lighthouse bonus lasts twenty-four hours per completed level, refreshes and survives save',()=>{
 const s=funded(3);s.buildings.lighthouse.level=1;s.objective.repaired=true;s.lighthouseRemaining=100;crew(s,'warehouse',6);assert.equal(act(s,{type:'upgrade',building:'lighthouse'}).ok,true);finish(s,'lighthouse');assert.equal(s.buildings.lighthouse.level,2);assert.equal(s.lighthouseRemaining,172800);close(s.happiness,s.residents.reduce((sum,resident)=>sum+Math.min(100,resident.happiness+100),0)/s.population);s.resources.food=2250;let after=saved(s);close(after.lighthouseRemaining,172800);tick(after,172800);assert.equal(after.lighthouseRemaining,0);close(after.happiness,intrinsicMean(after));
});
test('lighthouse boost preserves unfinished individual units across activation and expiration',()=>{
 const s=idle(2);crew(s,'farm',1);tick(s,300);s.lighthouseRemaining=30;tick(s,30);assert.equal(s.buildings.farm.ready,1);assert.equal(s.lighthouseRemaining,0);tick(s,359);assert.equal(s.buildings.farm.ready,1);tick(s,1);assert.equal(s.buildings.farm.ready,2);
});
