import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, advanceTo, act, buildingCost } from '../harborlight-v1-state.js';
import { COMMERCE_RULES, COIN_PACKAGES, commerceStatus, quoteCheckout, preserveAccountProgress, normalizeCommerce } from '../harborlight-v1-commerce.js';
import { ACTIVITY_RULES, quoteAcceleration, quoteAccelerationOptions, quotePremiumBuilding, quoteTransport, nextDailyTaskDeadline } from '../harborlight-v1-activities.js';
import { MATERIAL_IDS } from '../harborlight-v1-logistics.js';
import { warsawDayKey } from '../harborlight-v1-calendar.js';
import * as Arch from '../harborlight-v1-archipelago.js';

const NOW=Date.parse('2026-11-02T11:00:00Z');
const DEV={environment:'development',devSimulation:true};
const ADAPTERS={createState,normalizeState,advanceTo};
const run=(s,a,c=DEV)=>act(s,a,s.worldTimeMs,c);
const grown=()=>{const s=createState(NOW);s.buildings.townhall.level=3;return s;};
function two(){const raw=createState(NOW);raw.islandName='Dom';raw.buildings.townhall.level=10;raw.buildings.warehouse.level=6;raw.population=18;raw.resources=Object.fromEntries(['coins',...MATERIAL_IDS].map(id=>[id,100000]));const b=Arch.restoreArchipelago(raw,ADAPTERS,NOW);assert.equal(Arch.createNextIsland(b,{name:'Zatoka'},NOW).ok,true);return b;}
function reopen(b,adapters=ADAPTERS){return Arch.restoreArchipelago(Arch.serializeArchipelago(b),adapters,NOW);}

// The two distinct unlocks must be enforced at execution, not only in UI.
test('coin services unlock at TH1, while every cash top-up requires completed TH3',()=>{
 assert.equal(ACTIVITY_RULES.premiumUnlockLevel,1);assert.equal(COMMERCE_RULES.topupUnlockLevel,3);
 const s=createState(NOW);assert.equal(quotePremiumBuilding(s,'townhall',{buildingCost}).ok,true);
 assert.equal(quoteCheckout(s,{kind:'coins',grossGrosz:100}).ok,false);assert.equal(commerceStatus(s).canBuyCoins,false);
 s.buildings.townhall.level=2;s.constructionProjects.push({building:'townhall',targetLevel:3});
 assert.equal(quoteCheckout(s,{kind:'coins',grossGrosz:100}).ok,false,'a planned level is not completed');
 s.buildings.townhall.level=3;assert.equal(commerceStatus(s).canBuyCoins,true);
 for(const p of COIN_PACKAGES){const q=quoteCheckout(s,{kind:'coins',grossGrosz:p.grossGrosz});assert.equal(q.ok,true);assert.equal(q.coins,p.grossGrosz/10);}
});
test('direct-money service requests and old pending service settlements never grant goods or upgrades',()=>{
 const s=grown();const before=structuredClone(s.resources);
 for(const kind of ['building','transport','blessing','ship-capacity']){
  assert.equal(run(s,{type:'startCheckout',kind,building:'townhall'}).ok,false);
  const id='old-'+kind;s.commerce.checkouts.push({id,status:'pending',action:{kind,building:'townhall'},quote:{kind,grossGrosz:100}});
  assert.equal(run(s,{type:'completeCheckout',checkoutId:id}).ok,false);
 }
 assert.deepEqual(s.resources,before);assert.equal(s.commerce.receipts.length,0);assert.equal(s.premiumServices.length,0);
 const restored=normalizeState(s,NOW);assert.ok(restored.commerce.checkouts.every(x=>x.status==='cancelled'));
});
test('a top-up rechecks TH3 at settlement and preserves single settlement and no-ad rights',()=>{
 const s=grown(),start=run(s,{type:'startCheckout',kind:'coins',grossGrosz:2000});assert.equal(start.ok,true);
 s.buildings.townhall.level=2;assert.equal(run(s,{type:'completeCheckout',checkoutId:start.checkoutId}).ok,false);assert.equal(s.resources.coins,100);
 s.buildings.townhall.level=3;assert.equal(run(s,{type:'completeCheckout',checkoutId:start.checkoutId}).ok,true);assert.equal(s.resources.coins,300);
 assert.equal(run(s,{type:'completeCheckout',checkoutId:start.checkoutId}).ok,false);assert.equal(s.resources.coins,300);assert.equal(commerceStatus(s).noAds,true);
});
test('short builds show only the greatest reduction at each price without weakening actual charges',()=>{
 const s=createState(NOW),short={order:1,stage:'building',buildRemaining:60};
 assert.deepEqual(quoteAccelerationOptions(s,short).map(q=>[q.percent,q.coins,q.savedSeconds]),[[100,5,60]]);
 assert.equal(quoteAcceleration(s,short,25).coins,5,'old explicit requests retain honest prices');
 const longer={...short,buildRemaining:600};assert.deepEqual(quoteAccelerationOptions(s,longer).map(q=>[q.percent,q.coins]),[[50,5],[75,7],[100,10]]);
 assert.deepEqual(quoteAccelerationOptions(s,{...short,stage:'delivering'}),[]);
});
test('a TH1 transport quote uses the actual route and keeps the ordinary constraints',()=>{
 const s=createState(NOW);s.resources.coins=1000;s.buildings.farm.ready=20;
 const q=quoteTransport(s,{route:'producer',building:'farm'});
 assert.equal(q.ok,true);assert.equal(q.coins,10*q.trips);
 assert.equal(quotePremiumBuilding(s,'farm',{buildingCost}).ok,false,'TH1 does not permit a level2 producer');
});
test('coin ship capacity costs50 per1000, pays active island, and gives neither passenger seats nor no-ad purchases',()=>{
 const b=two();b.secondary.resources.coins=100;assert.equal(Arch.switchIsland(b,'island-2',NOW).ok,true);
 const motherCoins=b.primary.resources.coins,q=Arch.quoteShipCapacity(b,{units:2});assert.equal(q.coins,100);assert.equal(q.currency,'coins');assert.equal(Object.hasOwn(q,'grossGrosz'),false);
 assert.equal(Arch.purchaseShipCapacity(b,{units:2,requestId:'coin-ship-one'},DEV,NOW).ok,true);
 assert.equal(b.shipCapacity,3000);assert.equal(b.secondary.resources.coins,0);assert.equal(b.primary.resources.coins,motherCoins);
 assert.equal(Arch.archipelagoStatus(b,NOW).passengerCapacity,100);assert.equal(commerceStatus(b.primary).paidLast30DaysGrosz,0);assert.equal(commerceStatus(b.primary).noAds,false);
 assert.equal(b.primary.commerce.receipts.length,0);assert.equal(b.primary.commerce.capacityPurchases.length,1);
 const restored=reopen(b);assert.equal(Arch.purchaseShipCapacity(restored,{units:2,requestId:'coin-ship-one'},DEV,NOW).duplicate,true);assert.equal(restored.secondary.resources.coins,0);
 assert.equal(Arch.purchaseShipCapacity(restored,{units:3,requestId:'coin-ship-one'},DEV,NOW).ok,false);assert.equal(restored.shipCapacity,3000);
});
test('an unaffordable or direct-cash capacity action is atomic and production cannot invent trusted capacity',()=>{
 const b=two();b.primary.resources.coins=49;const before=JSON.stringify(Arch.serializeArchipelago(b));
 assert.equal(Arch.purchaseShipCapacity(b,{requestId:'cannot-afford'},DEV,NOW).ok,false);assert.equal(JSON.stringify(Arch.serializeArchipelago(b)),before);
 assert.equal(Arch.completeShipCapacityPurchase(b,{receiptId:'fake-cash'},DEV,NOW).ok,false);assert.equal(b.shipCapacity,1000);
 b.primary.resources.coins=500;const prod=reopen(b,{...ADAPTERS,environment:'production'});
 assert.equal(Arch.purchaseShipCapacity(prod,{requestId:'browser-verified'},{...DEV,verified:true},NOW).ok,false);assert.equal(prod.shipCapacity,1000);
});
test('legacy simulated cash capacity is retained, but new coin spending does not become Paynow income',()=>{
 const b=two();const legacy={id:'legacy-paid-capacity',units:5,grossGrosz:2495,simulated:true,at:NOW};
 b.capacityReceipts.push(legacy);b.shipCapacity=6000;b.primary.commerce.receipts.push({id:legacy.id,grossGrosz:2495,kind:'ship-capacity',simulated:true,verified:false,at:NOW});
 const restored=reopen(b);assert.equal(restored.shipCapacity,6000);assert.equal(commerceStatus(restored.primary).noAds,true);
 assert.equal(Arch.completeShipCapacityPurchase(restored,{units:5,receiptId:legacy.id},DEV,NOW).duplicate,true);
 assert.equal(Arch.purchaseShipCapacity(restored,{requestId:'new-coins'},DEV,NOW).ok,true);assert.equal(restored.shipCapacity,7000);assert.equal(commerceStatus(restored.primary).paidLast30DaysGrosz,2495);
 assert.throws(()=>reopen(restored,{...ADAPTERS,environment:'production'}),e=>e.code==='invalid-cloud-data');
 const fresh=preserveAccountProgress(restored.primary,createState(NOW+1000));const recreated=Arch.restoreArchipelago(fresh,ADAPTERS,NOW+1000);
 assert.equal(recreated.shipCapacity,7000);assert.equal(recreated.secondary,null);assert.equal(recreated.primary.commerce.capacityPurchases.length,1);
});
test('a changed or missing account coin receipt cannot silently preserve forged capacity',()=>{
 const b=two();assert.equal(Arch.purchaseShipCapacity(b,{requestId:'trusted-shape'},DEV,NOW).ok,true);
 for(const mutate of [raw=>raw.archipelago.capacityReceipts[0].coins++,raw=>raw.commerce.capacityPurchases=[],raw=>raw.archipelago.capacityReceipts=[],raw=>raw.archipelago.shipCapacity+=1000]){
  const raw=Arch.serializeArchipelago(b);mutate(raw);assert.throws(()=>Arch.restoreArchipelago(raw,ADAPTERS,NOW),e=>e.code==='invalid-cloud-data');
 }
});
test('daughter suffix uniqueness applies equally at founding and renaming without mutating rejected names',()=>{
 const b=two();b.primary.buildings.townhall.level=13;b.primary.population=18;b.primary=normalizeState(b.primary,NOW);
 assert.equal(Arch.createNextIsland(b,{name:'Ekspansja'},NOW).ok,true);
 const before=JSON.stringify(Arch.serializeArchipelago(b));assert.equal(Arch.renameArchipelagoIsland(b,'island-3','  ZATOKA  ',NOW+1000).ok,false);assert.equal(JSON.stringify(Arch.serializeArchipelago(b)),before);
 assert.equal(Arch.renameArchipelagoIsland(b,'island-2','Zatoka',NOW).ok,true,'keeping one own suffix is allowed');
 assert.equal(Arch.renameArchipelagoIsland(b,'island-1','Nowy Dom',NOW).ok,true);assert.equal(b.secondary.islandName,'Nowy Dom - Zatoka');
});
test('next ordinary offer has at least30minutes, exact Warsaw midnight, and correct DST day length',()=>{
 const scenarios=[
  ['2026-11-02T22:30:00Z','2026-11-02T23:00:00Z'],
  ['2026-11-02T22:59:59.500Z','2026-11-03T23:00:00Z'],
  ['2027-03-27T22:59:59.500Z','2027-03-28T22:00:00Z'],
  ['2027-10-30T21:59:59.500Z','2027-10-31T23:00:00Z']
 ];
 for(const [at,expected] of scenarios){
  const epoch=Date.parse(at),s=createState(epoch);s.activityEpochMs=epoch;s.activityClock=0;
  const duration=nextDailyTaskDeadline(s,0,0);assert.ok(duration>=1800);assert.equal(epoch+duration*1000,Date.parse(expected));assert.notEqual(warsawDayKey(epoch+duration*1000),warsawDayKey(epoch));
 }
});
test('reduced1+1ordinary requests cannot retain hundreds of fixed reward materials',()=>{
 const raw=createState(NOW);raw.resources={coins:0,wood:1,stone:1,grain:0,food:0,planks:0};raw.lighthouseTasks=[];
 const s=normalizeState(raw,NOW);const value=g=>Object.entries(g).reduce((sum,[id,n])=>sum+n*(id==='coins'?1:['food','planks'].includes(id)?1.5:.5),0);
 for(const task of s.lighthouseTasks){assert.ok(value(task.reward)<=value(task.requirements));assert.ok(task.reward.coins>=1);}
});
