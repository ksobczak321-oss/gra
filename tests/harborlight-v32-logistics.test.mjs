import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../harborlight-v1-logistics.js';
import * as P from '../harborlight-v1-provisions.js';
import * as D from '../harborlight-v1-development-logistics.js';
import {centralUnreserved,spendMaterials} from '../harborlight-v1-inventory.js';
const NOW=Date.parse('2026-11-14T12:00:00Z');
function island() {
 const names=['house','townhall','warehouse','market','dock','lumber','quarry','farm','windmill','sawmill','lighthouse','chapel',...Object.keys(P.NEW_BUILDINGS)];
 const raw={ruleset:32,population:18,worldTimeMs:NOW,activeSeconds:0,resources:{coins:100000,...Object.fromEntries(P.MATERIAL_IDS.map(id=>[id,0]))},bonusInventoryVersion:1,
 buildings:Object.fromEntries([...new Set(names)].map(id=>[id,{level:id==='townhall'?3:1,workers:0,ready:0,workProgress:[]}])),residents:Array.from({length:18},(_,i)=>({id:i+1,personUid:`p${i+1}`,workplace:null,arrivalRemaining:0,returnRemaining:0,pendingRelease:false})),statistics:{collected:0,crafted:0,traded:0,upgrades:0},lighthouseRemaining:0,chapelRemaining:0,roads:{segments:Array(100).fill(0)}};
 const s=structuredClone(raw);L.normalizeLogisticsState(s,raw);return s;
}
function crew(s,id,n,start=0) {for(const p of s.residents)if(p.workplace===id)p.workplace=null;for(const p of s.residents.slice(start,start+n))p.workplace=id;s.buildings[id].workers=n;}
function reload(s){const raw=structuredClone(s),out=structuredClone(raw);L.normalizeLogisticsState(out,raw);return out;}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
test('locked level-zero producers have no full-storage warnings while an unlocked full producer still warns once',()=>{
 const s=island();s.buildings.townhall.level=1;
 for(const id of ['bakery','dairy','leatherworks']){s.buildings[id].level=0;s.provisions.localStock[id]={bread:0};}
 s.notifications=[];L.updateStorageStatus(s);
 for(const id of ['bakery','dairy','leatherworks']){assert.equal(s.buildings[id].storageFull,false,id);assert.equal(s.buildings[id].productionBlocked,false,id);assert.equal(s.buildings[id].fullSeconds,0,id);assert.equal(L.storagePenalty(s,id),0,id);}
 assert.equal(s.notifications.filter(n=>n.kind==='storage-full').length,0);assert.equal(s.notifications.some(n=>`${n.title} ${n.message}`.includes('undefined')),false);
 s.buildings.townhall.level=2;s.buildings.bakery.level=1;s.provisions.localStock.bakery={bread:200};L.updateStorageStatus(s);
 assert.equal(s.buildings.bakery.storageFull,true);assert.equal(s.notifications.filter(n=>n.kind==='storage-full').length,1);assert.equal(s.notifications[0].title,'Piekarnia: storage is full');assert.equal(s.notifications[0].message.includes('undefined'),false);
 L.updateStorageStatus(s);assert.equal(s.notifications.filter(n=>n.kind==='storage-full').length,1);
});
test('legacy material list remains five while32inventoryandpendingcapacity count every good',()=>{
 const s=island();assert.equal(L.MATERIAL_IDS.length,5);assert.equal(L.materialIds(s).length,22);s.resources.cheese=500;s.resources.professorRobes=400;assert.equal(L.ordinaryWarehouseUsed(s),900);assert.equal(L.warehouseUsed(s),900);
 const limits=L.warehouseLimits(s);s.resources.cheese=limits.perResource;const before=s.resources.cheese;L.receiveMaterials(s,{cheese:100});assert.equal(s.resources.cheese,before);assert.equal(s.pendingDeliveries.cheese,100);s.resources.cheese-=100;L.flushPendingDeliveries(s);assert.equal(s.resources.cheese,before);assert.equal(s.pendingDeliveries.cheese,0);
});
test('multiple farm directions produce separately with real assigned workers and reload keeps fractions',()=>{
 let s=island();crew(s,'farm',3);s.provisions.assignments.farm={farmGrain:1,farmVegetables:2};L.advanceLogistics(s,45);near(s.provisions.productionProgress.farmGrain.p1,.5);s=reload(s);L.advanceLogistics(s,45);assert.equal(s.provisions.localStock.farm.grain,1);assert.equal(s.provisions.localStock.farm.vegetables,2);assert.equal(s.buildings.farm.ready,3);L.advanceLogistics(s,90);assert.equal(s.provisions.localStock.farm.grain,2);assert.equal(s.provisions.localStock.farm.vegetables,4);
});
test('a processor waits for ingredients carried physically from central stock',()=>{
 const s=island();s.resources.grain=1000;s.resources.vegetables=1000;crew(s,'warehouse',1);crew(s,'windmill',1,1);const before=s.resources.grain;
 L.advanceLogistics(s,299);assert.equal(s.provisions.localStock.windmill.flour,0);assert.ok(s.haulTrips.warehouse.some(t=>t.kind==='producerInput'&&t.target==='windmill'));assert.ok(s.resources.grain<before);assert.equal(s.provisions.localStock.windmill.grain,0);
 L.advanceLogistics(s,1);assert.ok(s.provisions.localStock.windmill.grain>=4);L.advanceLogistics(s,90);assert.equal(s.provisions.localStock.windmill.flour,1);
});
test('local ingredient plus output shared capacity and per-product cap stop complete batches',()=>{
 const s=island();crew(s,'slaughterhouse',1);s.provisions.localStock.slaughterhouse.livestock=100;s.provisions.localStock.slaughterhouse.meat=199;L.advanceLogistics(s,180);assert.equal(s.provisions.localStock.slaughterhouse.meat,199);assert.equal(s.provisions.localStock.slaughterhouse.livestock,100);
 s.provisions.localStock.slaughterhouse.meat=198;L.advanceLogistics(s,180);assert.equal(s.provisions.localStock.slaughterhouse.meat,200);assert.equal(s.provisions.localStock.slaughterhouse.livestock,98);assert.equal(s.statistics.crafted,1);
});
test('warehouse picks and delivers actual multiple outputs without teleporting them',()=>{
 const s=island();D.putLocalGoods(s,'farm','grain',50);D.putLocalGoods(s,'farm','vegetables',40);crew(s,'warehouse',2);L.advanceLogistics(s,299);assert.equal(s.resources.grain,0);assert.equal(s.resources.vegetables,0);assert.equal(s.provisions.localStock.farm.grain,0);assert.equal(s.provisions.localStock.farm.vegetables,0);L.advanceLogistics(s,1);assert.equal(s.resources.grain,50);assert.equal(s.resources.vegetables,40);assert.equal(s.economyLedger.delivered.grain,50);assert.equal(s.economyLedger.delivered.vegetables,40);
});
test('centralAvailable protects variety reserve while feeding sees physical unreserved stock',()=>{
 const s=island();s.resources.grain=100;s.resources.vegetables=100;const reserve=P.foodReservePlan(s);near(Object.values(reserve.shares).reduce((a,b)=>a+b,0),108);assert.ok(L.centralAvailable(s,'grain')<100);assert.equal(centralUnreserved(s,'grain'),100);const before=s.resources.grain+s.resources.vegetables;P.feedResidents(s,3600);near(before-s.resources.grain-s.resources.vegetables,108);
});
test('legacyfood mission spending consumes six satiety per unit and preserves reserve',()=>{
 const s=island();s.resources.bread=10;s.resources.meat=100;s.resources.flour=100;const before=s.resources.meat;assert.ok(L.availableGoods(s,'food')>6);assert.equal(spendMaterials(s,{food:6}),true);assert.equal(s.resources.meat,before-6);assert.equal(s.resources.food,0);assert.equal(P.foodReservePlan(s).complete,true);
});
test('direct route needs exact researched direction and preserves a general carrier',()=>{
 const s=island();s.buildings.warehouse.level=5;crew(s,'warehouse',4);s.education={discoveries:{'route:grain':true},routes:{'route:grain':{source:'farm',target:'windmill',product:'grain'}}};
 assert.equal(L.logisticsAction(s,{type:'developmentRoute',routeId:'route:grain',workers:3}).ok,false);assert.equal(L.logisticsAction(s,{type:'developmentRoute',routeId:'route:grain',workers:2}).ok,true);D.putLocalGoods(s,'farm','grain',500);L.advanceLogistics(s,1);const routed=s.haulTrips.warehouse.filter(t=>t.kind==='directRoute');assert.equal(routed.reduce((n,t)=>n+t.amount,0),200,'inbound routes reserve the full receiver product capacity');assert.equal(routed[0].target,'windmill');assert.ok(s.haulTrips.warehouse.some(t=>t.kind==='producer'),'general carriers may collect excess to central');L.advanceLogistics(s,299);assert.equal(s.provisions.localStock.windmill.grain,200);assert.ok(s.resources.grain>0);
 const absent=island();absent.buildings.warehouse.level=5;crew(absent,'warehouse',4);assert.equal(L.logisticsAction(absent,{type:'developmentRoute',routeId:'route:grain',workers:1}).ok,false);
});
test('milk age survives central pickup, processor and direct-route cargo and reload',()=>{
 let s=island();s.resources.rawMilk=1000;s.resources.bread=100;s.resources.meat=100;s.resources.flour=100;P.syncMilkLots(s);s.provisions.milkLots[0].centralSeconds=172800;crew(s,'warehouse',1);crew(s,'dairy',1,1);L.advanceLogistics(s,100);assert.equal(s.haulTrips.warehouse[0].kind,'producerInput');assert.equal(s.haulTrips.warehouse[0].milkLots[0].centralSeconds,172800);s=reload(s);L.advanceLogistics(s,200);assert.equal(s.provisions.localMilkLots.dairy[0].centralSeconds,172800);assert.equal(s.provisions.localStock.dairy.rawMilk,16);L.advanceLogistics(s,90);assert.equal(s.provisions.localStock.dairy.pasteurizedMilk,1);assert.equal(s.provisions.localStock.dairy.rawMilk,12);
});
test('processed harbor pricing and market exchange use full transaction value',()=>{
 const s=island();s.buildings.townhall.level=4;const q=L.quoteTrade(s,{resource:'meat',direction:'buy',amount:100});assert.equal(q.ok,true);assert.equal(q.price,375);s.market.stock.meat=10;s.market.lots.push({resource:'meat',amount:10,remaining:10000});const x=L.logisticsAction(s,{type:'marketExchange',from:'meat',to:'flour',amount:10});assert.equal(x.ok,true);assert.equal(s.market.stock.flour,2);
});
test('all instant producer outputs use real local buffers and returned milk keeps its age',()=>{
 const s=island();D.putLocalGoods(s,'farm','grain',5);D.putLocalGoods(s,'farm','vegetables',7);s.buildings.farm.level=2;D.putLocalGoods(s,'farm','rawMilk',9,[{amount:9,centralSeconds:172800}]);
 const q=L.quoteInstantTransport(s,{route:'producer',building:'farm'});assert.equal(q.ok,true);assert.equal(q.quantities.vegetables,7);assert.equal(q.quantities.rawMilk,9);assert.equal(L.instantTransport(s,{route:'producer',building:'farm'}).ok,true);assert.equal(s.provisions.localStock.farm.grain,0);assert.equal(s.provisions.localStock.farm.rawMilk,0);assert.equal(s.resources.vegetables,7);assert.equal(s.provisions.milkLots[0].centralSeconds,172800);
});
test('disposal fee rounds the complete monetary operation and cannot spend protected food',()=>{
 const s=island();s.resources.meat=100; s.resources.flour=100;const quote=L.logisticsAction(s,{type:'discardQuote',resource:'meat',amount:6});assert.equal(quote.price,2);const coins=s.resources.coins;assert.equal(L.logisticsAction(s,{type:'discardGoods',resource:'meat',amount:6}).ok,true);assert.equal(s.resources.coins,coins-2);assert.equal(s.resources.meat,94);assert.equal(L.logisticsAction(s,{type:'discardGoods',resource:'meat',amount:94}).ok,false);
});
test('harbor whole quantity quotes never treat virtual legacyFood as physical cargo',()=>{
 const s=island();s.buildings.townhall.level=4;s.resources.meat=1000;s.resources.flour=1000;assert.equal(L.quoteTrade(s,{resource:'meat',direction:'buy',amount:2}).price,8);assert.equal(L.quoteTrade(s,{resource:'food',direction:'sell',amount:100}).ok,false);assert.equal(L.logisticsAction(s,{type:'marketOrder',resource:'food',amount:10}).ok,false);
});
test('new chain estimates are finite with a ready physical chain and do not throw for an unstaffed product',()=>{
 const s=island();s.resources.grain=1000;s.resources.vegetables=1000;crew(s,'warehouse',1);crew(s,'windmill',1,1);assert.ok(Number.isFinite(L.estimateMaterialsSeconds(s,{flour:10})));assert.equal(L.estimateMaterialsSeconds(s,{cake:10}),Infinity);
});
test('a theatre audience porter finishes an existing course and starts no crossing course',()=>{
 const s=island();crew(s,'warehouse',1);D.putLocalGoods(s,'farm','grain',50);s.theatre={version:1,collection:[],layouts:[null,null,null],positions:[],atmosphere:{},shows:[{id:'theatre-show-1',status:'planned',startAt:NOW+299000,endAt:NOW+899000,personUids:['p1'],attendeeUids:[],coins:2}],showSequence:1,showBonuses:{}};
 L.nextLogisticsEvent(s);assert.equal(s.haulTrips.warehouse.length,0);assert.equal(s.provisions.localStock.farm.grain,50);
 s.theatre.shows[0].startAt=NOW+301000;L.nextLogisticsEvent(s);assert.equal(s.haulTrips.warehouse.length,1);s.theatre.shows[0].startAt=NOW;L.advanceLogistics(s,300);assert.equal(s.resources.grain,50);assert.equal(s.haulTrips.warehouse.length,0);
});
test('market milk round trip, instant collection and reload keep cumulative central age',()=>{
 let s=island();s.buildings.townhall.level=4;s.resources.rawMilk=100;s.resources.meat=1000;s.resources.flour=1000;P.syncMilkLots(s);s.provisions.milkLots[0].centralSeconds=72000;crew(s,'market',1);assert.equal(L.logisticsAction(s,{type:'marketOrder',resource:'rawMilk',amount:10}).ok,true);L.advanceLogistics(s,300);assert.equal(s.market.locked[0].milkLots[0].centralSeconds,72000);s=reload(s);L.advanceLogistics(s,3600);assert.equal(L.logisticsAction(s,{type:'marketDispatch',resource:'rawMilk',amount:10}).ok,true);assert.equal(L.instantTransport(s,{route:'marketOutbound',resource:'rawMilk',amount:10}).ok,true);assert.ok(s.provisions.milkLots.some(l=>l.amount===10&&l.centralSeconds===72000));
});
test('warehouse and construction research affect actual capacity and actual building clocks once',()=>{
 const s=island(),base=L.warehouseLimits(s);s.education={researchLevels:{warehouse:2,construction:2},people:{},discoveries:{},routes:{}};assert.equal(L.warehouseLimits(s).perResource,Math.floor(base.perResource*1.1));
 const project={building:'house',targetLevel:2,order:1,cost:{},goodsTotal:0,goodsRemaining:0,remainingMaterials:{},delivered:{},stage:'building',buildRemaining:110,transportSeconds:0};s.constructionProjects=[project];near(L.constructionEstimate(s,project).building,100);near(L.nextLogisticsEvent(s),100);L.advanceLogistics(s,99);assert.equal(s.buildings.house.level,1);L.advanceLogistics(s,1);assert.equal(s.buildings.house.level,2);
});
test('one atomic quote allocates explicit food ingredients before legacy Food payment',()=>{
 const s=island();s.residents=s.residents.slice(0,1);s.population=1;s.resources.meat=10;s.resources.flour=10;const quote=L.quoteMaterialSpend(s,{meat:9,food:1,coins:10});assert.equal(quote.ok,true);assert.equal(quote.materials.meat,9);assert.equal(quote.materials.flour,1);assert.equal(spendMaterials(s,{meat:9,food:1,coins:10}),true);assert.equal(s.resources.meat,1);assert.equal(s.resources.flour,9);assert.equal(P.foodReservePlan(s).complete,true);
 s.resources.bread=.99;s.resources.meat=0;s.resources.flour=0;assert.equal(L.availableGoods(s,'food'),0,'fractional balances cannot promise a whole-item food mix');
});
test('a full core day with production, real carriers, arrivals and meal depletion still saves under one world limit',async t=>{
 const {createState,act,tick}=await import('../harborlight-v1-state.js');const s=createState(NOW,{ruleset:32,onboarding:false});s.resources.grain=100;s.resources.vegetables=100;
 assert.equal(act(s,{type:'assign',building:'farm',delta:6},s.worldTimeMs).ok,true);assert.equal(act(s,{type:'assign',building:'warehouse',delta:4},s.worldTimeMs).ok,true);s.provisions.assignments.farm={farmGrain:3,farmVegetables:3};tick(s,86400);
 assert.ok(s.economyLedger.delivered.grain>1000);assert.ok(s.economyLedger.delivered.vegetables>1000);assert.equal(s.resources.food,0);assert.equal(P.mealStatus(s).coverage,1);
 const clone=structuredClone(s),rawBytes=Buffer.byteLength(JSON.stringify(clone)),compaction=P.compactDietHistories(clone),savedBytes=Buffer.byteLength(JSON.stringify(clone));assert.ok(savedBytes<700000);assert.ok(savedBytes<rawBytes);assert.ok(s.provisions.people[s.residents[0].personUid].history);
 t.diagnostic(JSON.stringify({population:s.population,producedGrain:s.economyLedger.produced.grain,deliveredGrain:s.economyLedger.delivered.grain,rawBytes,savedBytes,compaction}));
});
test('actual TH100 population with clothing, cake, full rations and hunger counters fits the700KB save boundary',async t=>{
 const {createState}=await import('../harborlight-v1-state.js'),{synchronizeResidents}=await import('../harborlight-v1-residents.js'),{compactResidentSnapshot}=await import('../harborlight-v1-archipelago.js');
 const s=createState(NOW,{ruleset:32,onboarding:false});s.buildings.townhall.level=100;s.buildings.house.level=100;s.population=3600;s.capacity=3600;synchronizeResidents(s);P.normalizeProvisions(s,s);
 const sizes={};for(const variant of ['baseline','clothed','fullfed','hunger']){
  const clone=structuredClone(s);if(variant!=='baseline')for(const entry of Object.values(clone.provisions.people)){entry.clothingRemaining=21*86400;entry.fullFedSeconds=variant==='fullfed'?999999:0;entry.coverage=variant==='hunger'?.5:1;entry.hungerSeconds=variant==='hunger'?12345.6789:0;entry.clothesSpare=0;entry.cakeSatiety=.12345;entry.cakeBonusUntil=NOW+3600000;}
  clone.residents=clone.residents.map(compactResidentSnapshot);P.compactDietHistories(clone);sizes[variant]=Buffer.byteLength(JSON.stringify(clone));assert.ok(sizes[variant]<700000);
  const saved=JSON.stringify(clone);P.compactDietHistories(clone);assert.equal(JSON.stringify(clone),saved,'compaction is idempotent');P.normalizeProvisions(clone,clone);const person=clone.provisions.people[clone.residents[0].personUid];assert.equal(person.coverage,variant==='hunger'?.5:1);if(variant==='fullfed')assert.equal(person.fullFedSeconds,3600);if(variant==='hunger')near(person.hungerSeconds,12345.6789);if(variant!=='baseline')near(person.clothingRemaining,21*86400);
 }
 t.diagnostic(JSON.stringify({population:s.population,sizes}));
});
test('new32 rewards mint flour rather than legacy Food and new bonus overflow waits for capacity',()=>{
 const s=island(),limits=L.warehouseLimits(s);s.resources.flour=limits.perResource;L.receiveMaterials(s,{food:5,flour:3});assert.equal(s.resources.food,0);assert.equal(s.resources.flour,limits.perResource);assert.equal(s.pendingDeliveries.flour,8);assert.equal(s.bonusMaterials.flour,0);
 L.grantBonusMaterials(s,{food:7,wood:4});assert.equal(s.resources.food,0);assert.equal(s.pendingDeliveries.flour,15);assert.equal(s.bonusMaterials.flour,0);assert.equal(s.bonusMaterials.wood,0);L.flushPendingDeliveries(s);assert.equal(s.resources.wood,4);s.resources.flour-=15;L.flushPendingDeliveries(s);assert.equal(s.resources.flour,limits.perResource);assert.equal(s.pendingDeliveries.flour,0);
});
test('existing physical old Food remains edible, transferable and sellable but32NPC cannot create it',()=>{
 const s=island();s.buildings.townhall.level=4;assert.equal(L.quoteTrade(s,{resource:'food',direction:'buy',amount:10}).ok,false);assert.equal(L.logisticsAction(s,{type:'trade',resource:'food',direction:'buy',amount:10}).ok,false);assert.equal(P.quoteGoods('food',10,'buy').ok,false);
 L.receiveMaterials(s,{food:100},{bonus:false});assert.equal(s.resources.food,100);s.resources.flour=100;assert.equal(L.quoteTrade(s,{resource:'food',direction:'sell',amount:10}).ok,true);const before=s.resources.food;P.feedResidents(s,60);assert.ok(s.resources.food<before);
 s.market.stock.flour=100;s.market.lots.push({resource:'flour',amount:100,remaining:10000});assert.equal(L.logisticsAction(s,{type:'marketExchange',from:'flour',to:'food',amount:100}).ok,false);assert.equal(P.provisionsAction(s,{type:'provisionsExchange',from:'flour',to:'food',amount:100,confirm:true}).ok,false);
 const stock=s.resources.food;L.grantBonusMaterials(s,{food:2},{preserveLegacyFood:true});assert.equal(s.resources.food,stock+2);assert.equal(s.bonusMaterials.food,2);
});
test('legacy rules still receive legacy Food rewards and retain old NPC purchase rules',()=>{
 const s=island();delete s.ruleset;s.buildings.townhall.level=4;L.receiveMaterials(s,{food:4});assert.equal(s.resources.food,4);assert.equal(s.bonusMaterials.food,4);assert.equal(L.quoteTrade(s,{resource:'food',direction:'buy',amount:100}).ok,true);
});
