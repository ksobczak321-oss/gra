import test from 'node:test';
import assert from 'node:assert/strict';
import { centralAvailable } from '../harborlight-v1-inventory.js';
import {
  MATERIAL_IDS, normalizeLogisticsState, advanceLogistics, logisticsAction,
  productionRate, haulCapacity, foodReserve, constructionEstimate,
  quoteTrade, quoteInstantTransport, instantTransport, updateStorageStatus, storagePenalty
} from '../harborlight-v1-logistics.js';
const ids=['house','farm','sawmill','quarry','dock','warehouse','lighthouse','lumber','windmill','townhall','chapel','market'];
function island(level=4) {
  const s={version:8,population:12,resources:{coins:10000,wood:0,stone:0,grain:0,food:100,planks:0},buildings:Object.fromEntries(ids.map(id=>[id,{level:id==='townhall'||id==='house'?level:id==='lighthouse'?0:1,workers:0,ready:0,workProgress:[]}])),statistics:{collected:0,crafted:0,traded:0,upgrades:0},residents:Array.from({length:12},(_,i)=>({id:i+1,workplace:null,happiness:0,arrivalRemaining:0,returnRemaining:0,visitGroup:null})),foodCredit:0,lighthouseRemaining:0,chapelRemaining:0,worldTimeMs:1700000000000};
  normalizeLogisticsState(s,structuredClone(s));return s;
}
function crew(s,id,count,arrival=0){s.buildings[id].workers=count;s.buildings[id].workProgress=Array(count).fill(0);for(const p of s.residents.filter(p=>!p.workplace).slice(0,count)){p.workplace=id;p.arrivalRemaining=arrival;}}
function project(s,cost={wood:60},building='house',targetLevel=2){const p={building,targetLevel,cost,goodsTotal:Object.values(cost).reduce((a,b)=>a+b,0),goodsRemaining:Object.values(cost).reduce((a,b)=>a+b,0),remainingMaterials:Object.fromEntries(MATERIAL_IDS.map(id=>[id,cost[id]||0])),delivered:Object.fromEntries(MATERIAL_IDS.map(id=>[id,0])),transportSeconds:0,buildRemaining:0,stage:'transport',order:1};p.reservationVersion=9;p.reservedMaterials={...p.remainingMaterials};for(const id of MATERIAL_IDS)s.resources[id]+=p.reservedMaterials[id];s.constructionProjects.push(p);return p;}

test('production uses own producer level and individual complete units',()=>{
 const s=island();s.buildings.farm.level=2;crew(s,'farm',2);
 assert.equal(productionRate(s,'farm'),12);advanceLogistics(s,299);assert.equal(s.buildings.farm.ready,0);advanceLogistics(s,1);assert.equal(s.buildings.farm.ready,2);advanceLogistics(s,3300);assert.equal(s.buildings.farm.ready,24);
});
test('walking assignees neither produce nor carry before arriving',()=>{
 const s=island();crew(s,'farm',1,300);crew(s,'warehouse',1,300);s.buildings.lumber.ready=60;advanceLogistics(s,300);assert.equal(s.buildings.farm.ready,0);assert.equal(s.resources.wood,0);assert.equal(s.haulTrips.warehouse.length,0);
});
test('hauling carries60 in300seconds and dispatches a partial lastload',()=>{
 const s=island();crew(s,'warehouse',1);s.buildings.lumber.ready=100;
 advanceLogistics(s,299);assert.equal(s.resources.wood,0);assert.equal(s.buildings.lumber.ready,40);
 advanceLogistics(s,1);assert.equal(s.resources.wood,60);advanceLogistics(s,300);assert.equal(s.resources.wood,100);assert.equal(s.buildings.lumber.ready,0);
});
test('one carrier never mixes two products into one course',()=>{
 const s=island();crew(s,'warehouse',1);s.buildings.lumber.ready=30;s.buildings.quarry.ready=30;advanceLogistics(s,300);assert.equal(s.resources.wood+s.resources.stone,30);advanceLogistics(s,300);assert.equal(s.resources.wood+s.resources.stone,60);
});
test('higher own carrier level changes capacity, hunger slows full course',()=>{
 const s=island();s.buildings.warehouse.level=2;assert.equal(haulCapacity(s),66);crew(s,'warehouse',1);s.buildings.lumber.ready=66;s.resources.food=0;advanceLogistics(s,300);assert.equal(s.resources.wood,0);advanceLogistics(s,300);assert.equal(s.resources.wood,66);
});
test('construction estimates count courses separately per material',()=>{
 const s=island();crew(s,'warehouse',6);const p=project(s,{wood:72,stone:72,grain:120});const e=constructionEstimate(s,p);assert.equal(e.trips,6);assert.equal(e.transport,300);assert.equal(e.building,300);assert.equal(e.total,600);advanceLogistics(s,300);assert.deepEqual(p.delivered,{wood:72,stone:72,grain:120,food:0,planks:0});assert.equal(p.stage,'building');assert.equal(p.buildRemaining,300);advanceLogistics(s,300);assert.equal(s.buildings.house.level,2);
});
test('warehouse replenishment precedes construction unless explicitly reprioritized',()=>{
 const s=island();crew(s,'warehouse',1);s.buildings.lumber.ready=60;const p=project(s);
 advanceLogistics(s,300);assert.equal(s.resources.wood,120);assert.equal(centralAvailable(s,'wood'),60);assert.equal(p.goodsRemaining,60);
 const t=island();crew(t,'warehouse',1);t.buildings.lumber.ready=60;const q=project(t);logisticsAction(t,{type:'transportPriority',target:'construction:1'});advanceLogistics(t,300);assert.equal(q.goodsRemaining,0);assert.equal(t.resources.wood,0);
});
test('urgent food receives a carrier despite construction priority',()=>{
 const s=island();s.resources.food=49;s.buildings.windmill.ready=60;crew(s,'warehouse',1);project(s);s.logisticsPriority=['construction:1'];assert.equal(foodReserve(s),50);advanceLogistics(s,300);assert.equal(s.resources.food,109);assert.equal(s.constructionProjects[0].goodsRemaining,60);
});
test('market has its own carriers, onehour lock, fresh output expiry, own returnhaul',()=>{
 const s=island();s.resources.wood=100;crew(s,'market',1);assert.equal(logisticsAction(s,{type:'marketOrder',resource:'wood',amount:100}).ok,true);advanceLogistics(s,600);assert.equal(s.market.locked.reduce((n,l)=>n+l.amount,0),100);assert.equal(s.resources.wood,0);assert.equal(logisticsAction(s,{type:'marketExchange',from:'wood',to:'stone',amount:100}).ok,false);
 advanceLogistics(s,3600);assert.equal(s.market.stock.wood,100);assert.equal(logisticsAction(s,{type:'marketExchange',from:'wood',to:'stone',amount:100}).ok,true);assert.equal(s.market.stock.stone,90);assert.equal(s.market.lots[0].remaining,86400);assert.equal(logisticsAction(s,{type:'marketDispatch',resource:'stone',amount:90}).ok,true);advanceLogistics(s,600);assert.equal(s.resources.stone,90);assert.equal(s.buildings.warehouse.workers,0);
});
test('market uncollected stock expires after24h fromarrival',()=>{
 const s=island();s.resources.wood=60;crew(s,'market',1);logisticsAction(s,{type:'marketOrder',resource:'wood',amount:60});advanceLogistics(s,300);advanceLogistics(s,86400);assert.equal(s.market.stock.wood,0);assert.equal(s.market.locked.length,0);assert.ok(s.notifications.some(n=>n.kind==='goods-expired'));
});
test('harbor price is per100 with linear rolling inflation frozenatorder',()=>{
 const s=island();const a=logisticsAction(s,{type:'trade',direction:'buy',resource:'wood',amount:100});const b=logisticsAction(s,{type:'trade',direction:'buy',resource:'wood',amount:100});assert.equal(a.price,50);assert.equal(b.price,55);assert.equal(s.dock.orders[0].price,50);assert.equal(quoteTrade(s,{direction:'buy',resource:'wood',amount:100}).price,60);assert.equal(quoteTrade(s,{direction:'sell',resource:'planks',amount:100}).ok,false);advanceLogistics(s,10800);assert.equal(quoteTrade(s,{direction:'buy',resource:'wood',amount:100}).price,50);
});
test('harbor sale reserves physical central goods on confirmation and pays only at departure',()=>{
 const s=island();s.resources.wood=100;crew(s,'dock',1);const result=logisticsAction(s,{type:'trade',direction:'sell',resource:'wood',amount:100});assert.equal(result.ok,true);assert.equal(s.resources.wood,100);assert.equal(centralAvailable(s,'wood'),0);assert.equal(s.resources.coins,10000);advanceLogistics(s,1199);assert.equal(s.resources.coins,10000);advanceLogistics(s,1);assert.equal(s.resources.coins,10040);assert.equal(s.dock.orders[0].stage,'voyage');advanceLogistics(s,300);assert.equal(s.dock.orders[0].stage,'complete');assert.equal(s.resources.coins,10040);
});
test('harbor purchase pays immediately, has5min voyage, unloads andcarrieswithowncrew',()=>{
 const s=island();crew(s,'dock',1);assert.equal(logisticsAction(s,{type:'trade',direction:'buy',resource:'stone',amount:100}).ok,true);assert.equal(s.resources.coins,9950);advanceLogistics(s,299);assert.equal(s.resources.stone,0);assert.equal(s.dock.orders[0].stage,'voyage');advanceLogistics(s,1);assert.equal(s.dock.orders[0].stage,'unloading');advanceLogistics(s,1200);assert.equal(s.resources.stone,100);assert.equal(s.dock.orders[0].stage,'complete');assert.equal(s.buildings.warehouse.workers,0);
});
test('protected foodcannotbe dispatched to marketorharbor',()=>{
 const s=island();s.resources.food=100;assert.equal(logisticsAction(s,{type:'marketOrder',resource:'food',amount:60}).ok,false);assert.equal(logisticsAction(s,{type:'trade',direction:'sell',resource:'food',amount:100}).ok,false);
});
test('instant transport quotes each required course including partiallast',()=>{
 const s=island();s.buildings.lumber.ready=100;const q=quoteInstantTransport(s,{route:'producer',building:'lumber'});assert.equal(q.trips,2);assert.equal(q.capacity,60);assert.equal(instantTransport(s,{route:'producer',building:'lumber'}).ok,true);assert.equal(s.resources.wood,100);assert.equal(s.buildings.lumber.ready,0);
});
test('paid port stages remain separately executable andsale pays once',()=>{
 const s=island();s.resources.wood=100;logisticsAction(s,{type:'trade',direction:'sell',resource:'wood',amount:100});assert.equal(quoteInstantTransport(s,{route:'dockInbound',order:1}).trips,2);assert.equal(instantTransport(s,{route:'dockInbound',order:1}).ok,true);assert.equal(s.resources.coins,10000);assert.equal(s.dock.stock.wood,100);assert.equal(quoteInstantTransport(s,{route:'dockLoad',order:1}).trips,2);assert.equal(instantTransport(s,{route:'dockLoad',order:1}).ok,true);assert.equal(s.resources.coins,10040);assert.equal(instantTransport(s,{route:'dockLoad',order:1}).ok,false);
});
test('normalization preserves in-flight material ownership andremainingcourse',()=>{
 const s=island();crew(s,'warehouse',1);s.buildings.lumber.ready=100;advanceLogistics(s,150);const copy=structuredClone(s);normalizeLogisticsState(copy,structuredClone(s));advanceLogistics(copy,450);assert.equal(copy.resources.wood,100);assert.equal(copy.buildings.lumber.ready,0);
});
test('blocked producer penaltyis tiedactualblockage andcapsat50',()=>{
 const s=island();s.buildings.sawmill.workers=1;s.resources.wood=0;updateStorageStatus(s);assert.equal(storagePenalty(s,'sawmill'),10);advanceLogistics(s,86400);assert.equal(storagePenalty(s,'sawmill'),20);advanceLogistics(s,5*86400);assert.equal(storagePenalty(s,'sawmill'),50);s.resources.wood=2;updateStorageStatus(s);assert.equal(storagePenalty(s,'sawmill'),0);
});

test('construction ETA includes already loaded courses and the next partial course',()=>{
 const s=island();crew(s,'warehouse',1);const p=project(s,{wood:100});advanceLogistics(s,150);const estimate=constructionEstimate(s,p);assert.equal(estimate.transport,450);assert.equal(estimate.trips,2);advanceLogistics(s,450);assert.equal(p.goodsRemaining,0);
});
