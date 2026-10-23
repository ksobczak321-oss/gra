import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MATERIAL_IDS, PRODUCTION_RECIPES, normalizeLogisticsState, advanceLogistics,
  nextLogisticsEvent, logisticsAction, warehouseUsed, stockRoom, availableGoods,
  centralReserved, centralAvailable, reserveConstructionMaterials, promoteConstructionQueue,
  receiveMaterials, updateStorageStatus, cancelConstruction, constructionScheduleEstimate,
  quoteInstantTransport, instantTransport, productionBlocked, haulCapacity, estimateMaterialsSeconds
} from '../harborlight-v1-logistics.js';

function island() {
  const buildings=['house','farm','sawmill','quarry','dock','warehouse','lighthouse','lumber','windmill','townhall','chapel','market'];
  const raw={version:9,population:12,worldTimeMs:1_800_000_000_000,resources:{coins:10000,wood:0,stone:0,grain:0,food:500,planks:0},
    buildings:Object.fromEntries(buildings.map(id=>[id,{level:id==='townhall'?4:1,workers:0,ready:0,workProgress:[]} ])),
    residents:Array.from({length:12},(_,i)=>({id:i+1,workplace:null,arrivalRemaining:0,returnRemaining:0,pendingRelease:false})),
    statistics:{collected:0,crafted:0,traded:0,upgrades:0},foodCredit:0,lighthouseRemaining:0,chapelRemaining:0};
  const state=structuredClone(raw);normalizeLogisticsState(state,raw);return state;
}
function crew(state,id,count) {
  state.residents.filter(person=>person.workplace===id).forEach(person=>{person.workplace=null;});
  state.residents.filter(person=>!person.workplace).slice(0,count).forEach(person=>{person.workplace=id;person.arrivalRemaining=0;person.pendingRelease=false;});
  state.buildings[id].workers=count;state.buildings[id].workProgress=Array(count).fill(0);
}
function project(state,cost,{building='house',stage='queued',fund=true,fee=0}={}) {
  if(fund)for(const id of MATERIAL_IDS)state.resources[id]=Math.max(state.resources[id],(cost[id]||0)+centralReserved(state,id)+(id==='food'?50:0));
  const p={building,targetLevel:state.buildings[building].level+1,cost:{...cost},goodsTotal:MATERIAL_IDS.reduce((n,id)=>n+(cost[id]||0),0),
    goodsRemaining:MATERIAL_IDS.reduce((n,id)=>n+(cost[id]||0),0),remainingMaterials:Object.fromEntries(MATERIAL_IDS.map(id=>[id,cost[id]||0])),
    delivered:Object.fromEntries(MATERIAL_IDS.map(id=>[id,0])),reservedMaterials:Object.fromEntries(MATERIAL_IDS.map(id=>[id,0])),
    reservedCoins:0,reservationVersion:9,transportSeconds:0,buildRemaining:0,stage,order:++state.constructionSequence,forecastFee:fee};
  state.constructionProjects.push(p);promoteConstructionQueue(state);return p;
}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);

test('construction reservations stay in physical central stock until pickup and cannot be spent twice',()=>{
  const s=island();s.resources.wood=200;const p=project(s,{wood:120});
  assert.equal(s.resources.wood,200);assert.equal(centralReserved(s,'wood'),120);assert.equal(availableGoods(s,'wood'),80);assert.equal(warehouseUsed(s),700);
  crew(s,'warehouse',1);nextLogisticsEvent(s);
  assert.equal(s.resources.wood,140);assert.equal(p.reservedMaterials.wood,60);assert.equal(availableGoods(s,'wood'),80);
  assert.equal(s.haulTrips.warehouse[0].amount,60);
  assert.equal(s.resources.wood+s.haulTrips.warehouse[0].amount+p.delivered.wood,200);
  assert.equal(logisticsAction(s,{type:'marketOrder',resource:'wood',amount:81}).ok,false);
});

test('market and Harbor reservations share central availability without freeing storage space',()=>{
  const s=island();s.resources.wood=300;
  assert.equal(logisticsAction(s,{type:'marketOrder',resource:'wood',amount:100}).ok,true);
  assert.equal(logisticsAction(s,{type:'trade',resource:'wood',direction:'sell',amount:100}).ok,true);
  assert.equal(s.resources.wood,300);assert.equal(centralReserved(s,'wood'),200);assert.equal(availableGoods(s,'wood'),100);
  const p=project(s,{wood:100},{fund:false});assert.equal(p.reservedMaterials.wood,100);assert.equal(availableGoods(s,'wood'),0);
  assert.equal(logisticsAction(s,{type:'marketOrder',resource:'wood',amount:1}).ok,false);
  crew(s,'market',1);crew(s,'dock',1);nextLogisticsEvent(s);
  assert.equal(s.resources.wood,180);assert.equal(centralReserved(s,'wood'),180);
});

test('forecast partial reservations claim future goods in FIFO order',()=>{
  const s=island();s.premium.expiresAt=s.worldTimeMs+86400000;s.resources.wood=70;
  const first=project(s,{wood:100,coins:10},{stage:'planned',fund:false,building:'house'});
  const second=project(s,{wood:100,coins:10},{stage:'planned',fund:false,building:'farm'});
  assert.equal(first.reservedMaterials.wood,70);assert.equal(second.reservedMaterials.wood,0);
  receiveMaterials(s,{wood:50});promoteConstructionQueue(s);
  assert.equal(s.resources.wood,120);assert.equal(first.reservedMaterials.wood,100);assert.equal(second.reservedMaterials.wood,20);
  assert.equal(first.stage,'transport');assert.equal(second.stage,'planned');assert.equal(availableGoods(s,'wood'),0);
});

test('cancellation unpledges queue costs and refunds native coins but not the forecast fee',()=>{
  const s=island();s.resources.wood=110;s.resources.coins-=25;
  const p=project(s,{wood:110,coins:22},{fee:25});const before=s.resources.coins;
  assert.equal(s.resources.wood,110);assert.equal(availableGoods(s,'wood'),0);
  const result=cancelConstruction(s,p.order);
  assert.equal(result.ok,true);assert.equal(s.resources.wood,110);assert.equal(availableGoods(s,'wood'),110);
  assert.equal(s.resources.coins,before+22);assert.equal(s.resources.coins,10000-25);
  assert.equal(cancelConstruction(s,p.order).ok,false,'cannot receive the same refund twice');
  const q=project(s,{wood:60});crew(s,'warehouse',1);nextLogisticsEvent(s);
  assert.equal(cancelConstruction(s,q.order).ok,false,'first pickup permanently closes ordinary cancellation');
});

test('earlier upgrades cannot be cancelled while later levels depend on them',()=>{
  const s=island();const first=project(s,{wood:60});
  const second=project(s,{wood:60});second.targetLevel=3;second.stage='queued';
  assert.equal(cancelConstruction(s,first.order).ok,false);
  assert.equal(cancelConstruction(s,second.order).ok,true);
  assert.equal(cancelConstruction(s,first.order).ok,true);
});

test('all overflow returns automatically without a carrier when central space becomes free',()=>{
  const s=island();Object.assign(s.resources,{wood:1000,stone:1000,grain:1000,planks:950,food:50});
  receiveMaterials(s,{wood:100});assert.equal(s.pendingDeliveries.wood,100);
  s.resources.wood-=40;updateStorageStatus(s);
  assert.equal(s.resources.wood,1000);assert.equal(s.pendingDeliveries.wood,60);assert.equal(s.buildings.warehouse.workers,0);
  advanceLogistics(s,30*86400);assert.equal(s.pendingDeliveries.wood,60,'overflow never expires');
  s.resources.wood-=60;updateStorageStatus(s);
  assert.equal(s.resources.wood,1000);assert.equal(s.pendingDeliveries.wood,0);
});

test('non-Food inventory cannot fill the central space reserved for emergency meals',()=>{
  const s=island();Object.assign(s.resources,{wood:1000,stone:1000,grain:1000,planks:950,food:0});
  assert.equal(warehouseUsed(s),3950);assert.equal(stockRoom(s,'planks'),0);assert.equal(stockRoom(s,'food'),50);
  receiveMaterials(s,{planks:50});assert.equal(s.pendingDeliveries.planks,50);assert.equal(s.resources.planks,950);
  receiveMaterials(s,{food:50});assert.equal(s.resources.food,50);assert.equal(warehouseUsed(s),4000);
  s.resources.food-=20;updateStorageStatus(s);assert.equal(s.pendingDeliveries.planks,50,'Food-reserved space cannot be filled with pending boards');
});

test('actual construction T includes interruptions after the first pickup',()=>{
  const s=island();crew(s,'warehouse',1);const p=project(s,{wood:120});
  advanceLogistics(s,300);assert.equal(p.delivered.wood,60);assert.equal(p.transportSeconds,300);
  s.buildings.lumber.ready=60;
  advanceLogistics(s,300);assert.equal(p.delivered.wood,60);assert.equal(p.transportSeconds,600,'a competing course remains part of the already-started transport phase');
  advanceLogistics(s,300);assert.equal(p.stage,'building');assert.equal(p.transportSeconds,900);assert.equal(p.buildRemaining,900);
  crew(s,'warehouse',0);advanceLogistics(s,100);assert.equal(p.buildRemaining,800,'building time freezes when transport finishes');
});

test('a construction carrier serves the oldest active project until all its loads are dispatched',()=>{
  const s=island();crew(s,'warehouse',2);const first=project(s,{wood:180},{building:'house'});const second=project(s,{stone:60},{building:'farm'});
  nextLogisticsEvent(s);assert.deepEqual(s.haulTrips.warehouse.map(t=>t.projectOrder),[first.order,first.order]);
  advanceLogistics(s,300);nextLogisticsEvent(s);
  assert.deepEqual(s.haulTrips.warehouse.map(t=>t.projectOrder),[first.order,second.order]);
});

test('instant construction delivery uses one virtual carrier at zero staffing and never skips the normal building phase',()=>{
  const s=island();const p=project(s,{wood:120});const before=JSON.stringify(s);
  const quote=quoteInstantTransport(s,{route:'construction',project:p.order});
  assert.equal(quote.ok,true);assert.equal(quote.virtualCarrier,true);assert.equal(quote.normalTransport,600);assert.equal(quote.normalBuilding,600);
  assert.equal(JSON.stringify(s),before,'quotes do not change stock, assignments or the scheduling RNG');
  assert.equal(instantTransport(s,{route:'construction',project:p.order}).ok,true);
  assert.equal(s.resources.wood,0);assert.equal(p.stage,'building');assert.equal(p.buildRemaining,600);assert.equal(p.delivered.wood,120);
});

test('instant construction delivery preserves elapsed T plus the current remaining delivery estimate',()=>{
  const s=island();crew(s,'warehouse',1);const p=project(s,{wood:120});
  advanceLogistics(s,300);s.buildings.lumber.ready=60;advanceLogistics(s,300);
  const quote=quoteInstantTransport(s,{route:'construction',project:p.order});
  assert.equal(p.transportSeconds,600);assert.equal(quote.normalTransport,300);assert.equal(quote.normalBuilding,900);
  instantTransport(s,{route:'construction',project:p.order});assert.equal(p.buildRemaining,900);
});

test('the virtual carrier quote uses current road speed, load and hunger without assigning an employee',()=>{
  const s=island();s.roads={segments:Array(100).fill(3)};const p=project(s,{wood:132});s.resources.food=0;
  const quote=quoteInstantTransport(s,{route:'construction',project:p.order});
  assert.equal(quote.ok,true);assert.equal(quote.capacity,66);close(quote.normalBuilding,600/(1.3*0.5));
  assert.equal(s.buildings.warehouse.workers,0);assert.ok(s.residents.every(person=>person.workplace===null));
});

test('a one-hour market lock permits exact ten-for-nine exchanges even with no staff',()=>{
  const s=island();s.resources.wood=20;crew(s,'market',1);
  assert.equal(logisticsAction(s,{type:'marketOrder',resource:'wood',amount:20}).ok,true);
  advanceLogistics(s,300);crew(s,'market',0);
  assert.equal(logisticsAction(s,{type:'marketExchange',from:'wood',to:'stone',amount:20}).ok,false);
  advanceLogistics(s,3600);
  assert.equal(logisticsAction(s,{type:'marketExchange',from:'wood',to:'stone',amount:5}).ok,false);
  assert.equal(logisticsAction(s,{type:'marketExchange',from:'wood',to:'stone',amount:20}).ok,true);
  assert.equal(s.market.stock.stone,18);assert.equal(s.buildings.market.workers,0);
});

test('market cargo picked up before expiry is protected during its final return course',()=>{
  const s=island();s.market.stock.wood=10;s.market.lots=[{resource:'wood',amount:10,remaining:1}];s.market.dispatch.wood=10;crew(s,'market',1);
  advanceLogistics(s,1);assert.equal(s.haulTrips.market[0].amount,10);assert.equal(s.market.stock.wood,0);
  advanceLogistics(s,299);assert.equal(s.resources.wood,10);assert.equal(s.haulTrips.market.length,0);
});

test('older saved reservations and in-flight goods migrate once without duplication',()=>{
  const s=island();const p=project(s,{wood:120});crew(s,'warehouse',1);advanceLogistics(s,100);
  const old=structuredClone(s);delete old.constructionProjects[0].reservationVersion;delete old.constructionProjects[0].reservedMaterials;delete old.constructionProjects[0].reservedCoins;
  old.resources.wood-=60;
  const restored=structuredClone(old);normalizeLogisticsState(restored,old);
  assert.equal(restored.resources.wood,60);assert.equal(restored.haulTrips.warehouse[0].amount,60);assert.equal(centralReserved(restored,'wood'),60);
  const reloaded=structuredClone(restored);normalizeLogisticsState(reloaded,restored);
  assert.equal(reloaded.resources.wood,60);assert.deepEqual(reloaded.haulTrips,restored.haulTrips);
  advanceLogistics(reloaded,500);assert.equal(reloaded.constructionProjects[0].delivered.wood,120);assert.equal(reloaded.resources.wood,0);
});

test('reserved processing inputs remain unavailable until a real output can consume them',()=>{
  const s=island();s.resources.wood=2;project(s,{wood:2},{fund:false,building:'house'});crew(s,'sawmill',1);
  assert.equal(productionBlocked(s,'sawmill'),true);assert.equal(centralAvailable(s,'wood'),0);
  advanceLogistics(s,360);assert.equal(s.buildings.sawmill.ready,0);assert.equal(s.resources.wood,2);
});

test('market physical arrivals keep distinct twenty-four-hour expiry clocks',()=>{
  const s=island();s.resources.wood=100;crew(s,'market',1);
  logisticsAction(s,{type:'marketOrder',resource:'wood',amount:100});advanceLogistics(s,600);crew(s,'market',0);
  assert.deepEqual(s.market.locked.map(lot=>[lot.amount,lot.expiresRemaining]),[[60,86100],[40,86400]]);
  advanceLogistics(s,86100);
  assert.equal(s.market.stock.wood,40);assert.equal(s.market.lots.length,1);assert.equal(s.market.lots[0].remaining,300);
  advanceLogistics(s,300);assert.equal(s.market.stock.wood,0);
});

test('a purchased ship starts its whole-batch expiry on arrival even without port workers',()=>{
  const s=island();const trade=logisticsAction(s,{type:'trade',resource:'wood',direction:'buy',amount:100});
  assert.equal(trade.ok,true);advanceLogistics(s,300);
  const order=s.dock.orders[0];assert.equal(order.stage,'unloading');assert.equal(order.expiresRemaining,86400);
  advanceLogistics(s,86399);assert.equal(order.remainingToUnload,100);assert.equal(order.expiresRemaining,1);
  crew(s,'dock',1);advanceLogistics(s,1);
  assert.equal(order.remainingToUnload,0);assert.equal(order.expiredAmount,40);assert.equal(s.haulTrips.dock[0].amount,60);
  advanceLogistics(s,299);
  assert.equal(s.dock.stock.wood,0,'unloading cannot renew an expired ship-arrival deadline');
  assert.equal(order.expiredAmount,100);assert.equal(order.stage,'expired');
});

test('final Harbor cargo picked up before expiry reaches central storage after the deadline',()=>{
  const s=island();s.dock.orders=[{id:1,direction:'buy',resource:'wood',amount:100,price:50,stage:'collecting',remainingToUnload:0,remainingToPort:0,remainingToShip:0,remaining:0,expiresRemaining:1,delivered:0,paid:false,reservationVersion:9,expiredAmount:0}];
  s.dock.stock.wood=100;s.dock.lots=[{resource:'wood',amount:100,remaining:1,orderId:1,direction:'buy'}];crew(s,'dock',1);
  advanceLogistics(s,1);assert.equal(s.haulTrips.dock[0].amount,60);assert.equal(s.dock.stock.wood,0,'only the unpicked forty units expire');
  advanceLogistics(s,299);assert.equal(s.resources.wood,60);assert.equal(s.dock.orders[0].delivered,60);assert.equal(s.dock.orders[0].expiredAmount,40);
});

test('central Harbor sale reservations do not expire before their first physical arrival',()=>{
  const s=island();s.resources.wood=100;logisticsAction(s,{type:'trade',resource:'wood',direction:'sell',amount:100});
  advanceLogistics(s,2*86400);assert.equal(s.dock.orders[0].stage,'supplying');assert.equal(s.resources.wood,100);assert.equal(centralReserved(s,'wood'),100);
  crew(s,'dock',1);advanceLogistics(s,300);assert.equal(s.dock.lots[0].remaining,86400);assert.equal(s.dock.lots[0].amount,60);
});

test('an exceptional partially expired Harbor sale pays only its actual loaded quantity at the frozen price',()=>{
  const s=island();s.dock.orders=[{id:1,direction:'sell',resource:'wood',amount:100,price:40,stage:'loading',remainingToPort:0,remainingToUnload:0,remainingToShip:100,remaining:0,expiresRemaining:86400,delivered:0,paid:false,reservationVersion:9,loaded:0,expiredAmount:0}];
  s.dock.stock.wood=100;s.dock.lots=[{resource:'wood',amount:60,remaining:1,orderId:1,direction:'sell'},{resource:'wood',amount:40,remaining:301,orderId:1,direction:'sell'}];
  advanceLogistics(s,1);assert.equal(s.dock.stock.wood,40);assert.equal(s.dock.orders[0].remainingToShip,40);
  const coins=s.resources.coins;crew(s,'dock',1);advanceLogistics(s,300);
  assert.equal(s.dock.orders[0].loaded,40);assert.equal(s.dock.orders[0].paidCoins,16);assert.equal(s.resources.coins,coins+16);
  assert.ok(s.notifications.some(notice=>notice.kind==='harbor-sale'&&notice.message.includes('Sold 40 wood for 16 coins')));
  advanceLogistics(s,300);assert.equal(s.resources.coins,coins+16,'settlement is never paid twice');
});

test('processing consumes inputs only on a finished output and preserves a blocked partial phase',()=>{
  const s=island();s.resources.wood=2;crew(s,'sawmill',1);advanceLogistics(s,180);
  assert.equal(s.resources.wood,2);assert.equal(s.buildings.sawmill.ready,0);assert.equal(s.buildings.sawmill.workProgress[0],180);
  const p=project(s,{wood:2},{fund:false});advanceLogistics(s,180);
  assert.equal(s.buildings.sawmill.workProgress[0],180);assert.equal(s.resources.wood,2);
  cancelConstruction(s,p.order);advanceLogistics(s,180);
  assert.equal(s.resources.wood,0);assert.equal(s.buildings.sawmill.ready,1);assert.equal(s.buildings.sawmill.workProgress[0],0);
});

test('legacy Harbor sales restore only the reserved goods not already loaded, exactly once',()=>{
  const s=island();s.resources.wood=100;crew(s,'dock',1);logisticsAction(s,{type:'trade',resource:'wood',direction:'sell',amount:100});nextLogisticsEvent(s);
  const old=structuredClone(s);delete old.dock.orders[0].reservationVersion;old.resources.wood=0;
  const restored=structuredClone(old);normalizeLogisticsState(restored,old);
  assert.equal(restored.resources.wood,40);assert.equal(centralReserved(restored,'wood'),40);assert.equal(restored.haulTrips.dock[0].amount,60);
  const again=structuredClone(restored);normalizeLogisticsState(again,restored);
  assert.equal(again.resources.wood,40);assert.equal(again.dock.orders[0].reservationVersion,9);
});

test('forecast gathering ETA credits its own physical pledges but never another plan’s goods',()=>{
  const s=island();s.premium.expiresAt=s.worldTimeMs+86400000;
  Object.assign(s.resources,{wood:100,stone:100,grain:122});s.buildings.farm.ready=10;crew(s,'warehouse',1);
  const p=project(s,{wood:80,stone:80,grain:132},{building:'farm',stage:'planned',fund:false});
  assert.deepEqual(p.reservedMaterials,{wood:80,stone:80,grain:122,food:0,planks:0});
  const before=JSON.stringify(s);
  assert.equal(estimateMaterialsSeconds(s,p.cost),300,'only the ten ready Grain need one delivery');
  assert.equal(estimateMaterialsSeconds(s,{...p.cost},p),300,'explicit owner can accompany a copied cost');
  assert.equal(estimateMaterialsSeconds(s,{...p.cost},{project:p.order}),300,'an explicit canonical project order is also accepted');
  assert.equal(estimateMaterialsSeconds(s,{...p.cost}),Infinity,'an unrelated new quote cannot spend the pledged Wood or Stone');
  assert.equal(JSON.stringify(s),before,'all estimates are read-only');
  advanceLogistics(s,300);assert.equal(p.stage,'transport');assert.equal(estimateMaterialsSeconds(s,p.cost),0);
});
