import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, buildingCost, requestUpgrade, canAfford, ALL_BUILDINGS } from '../harborlight-v1-state.js';
import * as P from '../harborlight-v1-provisions.js';
import { centralReserved, centralUnreserved } from '../harborlight-v1-inventory.js';
import { advanceLogistics } from '../harborlight-v1-logistics.js';
import { constructionTiming, longestConstructionSeconds, BUILDING_TIME_WEIGHTS } from '../harborlight-v1-economy.js';
import { quotePremiumBuilding, quoteForecastPlan } from '../harborlight-v1-activities.js';
import { developmentText, developmentBuildingInformation } from '../harborlight-v1-development-copy.js';
import { translate } from '../harborlight-v1-i18n.js';
import { getTourCopy } from '../harborlight-v1-approved-copy.js';
import { ADVISOR_INTRO_IDS, ADVISOR_INTRO_COPY } from '../harborlight-v1-advisor-intro.js';

const NOW=Date.parse('2026-11-22T12:00:00Z');
const json=value=>JSON.parse(JSON.stringify(value));
function island(level=4){
 const s=createState(NOW,{ruleset:32,onboarding:false});
 s.buildings.townhall.level=level;s.buildings.house.level=level;s.buildings.warehouse.level=20;
 s.tutorial.buildingSuppliesClaimed=true;s.welcome={startedAt:0,until:0};
 for(const b of Object.values(s.buildings))b.workers=0;
 for(const id of Object.keys(s.resources))s.resources[id]=100000;
 return s;
}
function noFood(cost){for(const id of P.FOOD_IDS)assert.equal(Object.hasOwn(cost,id),false,id);assert.equal(cost.foodUnits,undefined);assert.equal(cost.foodQuote,undefined);}

test('building quotes exclude every edible good, including grain, without changing resident goods definitions',()=>{
 const raw={coins:17,...Object.fromEntries(P.MATERIAL_IDS.map((id,index)=>[id,index+1]))},snapshot=structuredClone(raw);
 const filtered=P.buildingMaterialCost(raw);noFood(filtered);assert.deepEqual(raw,snapshot);
 for(const[id,n]of Object.entries(raw))if(!P.FOOD_IDS.includes(id))assert.equal(filtered[id],n,id);
 assert.equal(P.GOODS.grain.edible,true);assert.equal(P.GOODS.grain.satiety,1);assert.equal(P.GOODS.food.satiety,6);
});

// These are the pre-change non-food price coefficients. Food removal does not
// re-balance wood, stone, planks, coins or the existing queue surcharge.
const PRICE_BASIS={
 farm:{wood:72,stone:72},lumber:{wood:384,stone:144},quarry:{wood:144,stone:384},windmill:{wood:144,stone:144},sawmill:{wood:144,stone:144,planks:240},
 townhall:{coins:500,wood:500,stone:500,planks:500},house:{coins:500,wood:500,stone:500,planks:500},lighthouse:{coins:500,wood:500,stone:500,planks:500},
 market:{coins:300,wood:300,stone:300,planks:300},warehouse:{coins:300,wood:300,stone:300,planks:300},dock:{coins:400,wood:400,stone:400,planks:400},
 chapel:{coins:180,wood:20,stone:60,planks:10},
 bakery:{coins:180,wood:60,stone:60,planks:30},dairy:{coins:180,wood:60,stone:60,planks:30},slaughterhouse:{coins:180,wood:60,stone:60,planks:30},
 fisher:{coins:180,wood:60,stone:60,planks:30},leatherworks:{coins:180,wood:60,stone:60,planks:30},academy:{coins:180,wood:60,stone:60,planks:30},barracks:{coins:180,wood:60,stone:60,planks:30},theatre:{}
};
const nextLevelPrices=new Set(['chapel',...Object.keys(P.NEW_BUILDINGS)]);
test('all building levels1–20 retain exact non-food ordinary, queued and premium price coefficients',()=>{
 assert.deepEqual(Object.keys(PRICE_BASIS).sort(),Object.keys(ALL_BUILDINGS).sort());
 const s=island(20);
 for(const[id,basis]of Object.entries(PRICE_BASIS))for(let target=1;target<=(id==='theatre'?1:20);target++){
  s.constructionProjects=[];s.buildings[id].level=target-1;
  const multiplier=nextLevelPrices.has(id)?target:Math.max(1,target-1);
  for(const options of [{queued:false,starterDiscount:false},{queued:true,starterDiscount:false},{queued:false,premiumService:true}]){
   const expected=Object.fromEntries(Object.entries(basis).map(([key,n])=>[key,options.queued?Math.ceil(n*multiplier*1.1-1e-9):n*multiplier]));
   const cost=buildingCost(s,id,options);assert.deepEqual(cost,expected,`${id},target${target},${JSON.stringify(options)}`);noFood(cost);
  }
  if(id!=='theatre'){
   const timing=constructionTiming(s,{building:id,targetLevel:target,cost:buildingCost(s,id,{queued:false,starterDiscount:false})});
   const expectedSeconds=longestConstructionSeconds(target)*BUILDING_TIME_WEIGHTS[id];
   assert.equal(timing.totalSeconds,expectedSeconds);assert.equal(timing.transportDuration,expectedSeconds*.4);assert.equal(timing.buildingDuration,expectedSeconds-expectedSeconds*.4);
  }
 }
});
test('new quotes do not depend on food inventory or a stale chosen-food mix and do not mutate the world',()=>{
 const s=island(),expected=buildingCost(s,'house'),before=JSON.stringify(s);
 assert.deepEqual(buildingCost(s,'house',{foodMix:{bread:Number.MAX_SAFE_INTEGER,unknown:-5}}),expected);assert.equal(JSON.stringify(s),before);
 for(const id of P.FOOD_IDS)s.resources[id]=0;
 assert.deepEqual(buildingCost(s,'house'),expected);assert.equal(canAfford(s,expected),true);
});
test('the introductory Town Hall discount retains100coins and each100non-foodmaterial',()=>{
 const s=island(1);s.starterTurbo={version:1,unlocked:true};
 assert.deepEqual(buildingCost(s,'townhall'),{coins:100,wood:100,stone:100,planks:100});
 assert.deepEqual(buildingCost(s,'townhall',{queued:true}),{coins:110,wood:110,stone:110,planks:110});
 assert.deepEqual(buildingCost(s,'townhall',{premiumService:true,queued:false}),{coins:500,wood:500,stone:500,planks:500});
});
test('new ordinary orders reserve non-food materials once, charge native coins once and leave meals untouched',()=>{
 const s=island();s.buildings.house.level=3;const foods=Object.fromEntries(P.FOOD_IDS.map(id=>[id,s.resources[id]])),coins=s.resources.coins;
 const r=requestUpgrade(s,{building:'house',foodMix:{bread:99999}});assert.equal(r.ok,true,r.message);noFood(r.project.cost);
 assert.equal(s.resources.coins,coins-1500);for(const[id,n]of Object.entries(foods)){assert.equal(s.resources[id],n,id);assert.equal(centralReserved(s,id),0,id);}
 assert.equal(centralReserved(s,'wood'),1500);assert.equal(r.project.goodsTotal,4500);
});
test('missing non-food materials still block atomic orders and forecasts retain the exact quoted non-food price',()=>{
 const s=island();s.buildings.house.level=3;s.resources.wood=0;const before=JSON.stringify(s.resources);
 assert.equal(requestUpgrade(s,{building:'house'}).ok,false);assert.equal(JSON.stringify(s.resources),before);assert.equal(s.constructionProjects.length,0);
 s.premium.expiresAt=NOW+3600000;
 s.buildings.lumber.workers=1;s.residents[0].workplace='lumber';
 s.buildings.warehouse.workers=2;s.residents[1].workplace='warehouse';s.residents[2].workplace='warehouse';
 const forecast=quoteForecastPlan(s,'house',{buildingCost});assert.equal(forecast.ok,true,forecast.message);noFood(forecast.cost);
 const planned=requestUpgrade(s,{building:'house',forecast:true});assert.equal(planned.ok,true,planned.message);assert.equal(planned.project.stage,'planned');noFood(planned.project.cost);
 assert.deepEqual(planned.project.cost,forecast.cost);assert.equal(planned.project.cost.wood,1650);assert.equal(planned.project.cost.coins,1650);
});
test('new premium quotes and orders use the same food-free materials and keep the ten-second purchased build',()=>{
 const s=island();s.buildings.house.level=3;for(const id of P.FOOD_IDS)s.resources[id]=0;
 const quote=quotePremiumBuilding(s,'house',{buildingCost});assert.equal(quote.ok,true,quote.message);noFood(quote.cost);
 assert.equal(quote.nativeCoins,1500);assert.equal(quote.buildSeconds,10);
 const r=requestUpgrade(s,{building:'house',premiumService:true,paidMaterials:true});assert.equal(r.ok,true,r.message);noFood(r.project.cost);assert.equal(r.project.buildRemaining,10);
});
function historicalProject(stage){
 const s=island();s.buildings.house.level=3;
 const r=requestUpgrade(s,{building:'house',skipTransport:stage==='building'});assert.equal(r.ok,true,r.message);
 const p=r.project;p.cost.grain=120;p.cost.bread=5;p.goodsTotal+=125;
 for(const[id,n]of [['grain',120],['bread',5]]){
  p.remainingMaterials[id]=stage==='building'?0:n;p.delivered[id]=stage==='building'?n:0;p.reservedMaterials[id]=stage==='building'?0:n;
 }
 p.goodsRemaining=stage==='building'?0:p.goodsTotal;p.stage=stage;
 return s;
}
test('old queued and transporting paid receipts retain grain/bread, reservations and coins across repeated reloads',()=>{
 for(const stage of ['queued','transport']){
  let s=historicalProject(stage);const savedCost=json(s.constructionProjects[0].cost),coins=s.resources.coins;
  for(let n=0;n<3;n++){
   s=normalizeState(json(s),NOW);const p=s.constructionProjects[0];
   assert.deepEqual(p.cost,savedCost);assert.equal(p.remainingMaterials.grain,120);assert.equal(p.remainingMaterials.bread,5);assert.equal(p.reservedMaterials.grain,120);assert.equal(p.reservedMaterials.bread,5);assert.equal(s.resources.coins,coins);
   noFood(buildingCost(s,'house',{queued:false}));
  }
 }
});
test('an already-delivered historical ration completes its saved building timer without re-pricing or charging again',()=>{
 let s=historicalProject('building');const cost=json(s.constructionProjects[0].cost),coins=s.resources.coins,grain=s.resources.grain,bread=s.resources.bread;
 s=normalizeState(json(s),NOW);assert.deepEqual(s.constructionProjects[0].cost,cost);assert.equal(s.constructionProjects[0].buildRemaining,10);
 advanceLogistics(s,10);assert.equal(s.buildings.house.level,4);assert.equal(s.constructionProjects.length,0);assert.equal(s.resources.coins,coins);assert.equal(s.resources.grain,grain);assert.equal(s.resources.bread,bread);
});
test('ordinary resident meals and protected passenger meal quotes retain their satiety and resource costs',()=>{
 const s=island();for(const id of P.FOOD_IDS)s.resources[id]=0;s.resources.bread=100;
 const quote=P.quoteConstructionFood(s,6);assert.equal(quote.ok,true);assert.equal(quote.satietyRequired,36);assert.deepEqual(quote.materials,{bread:1});
 s.resources.meat=100;const points=()=>P.FOOD_IDS.reduce((total,id)=>total+s.resources[id]*P.GOODS[id].satiety,0),before=points(),residents=s.residents.length;
 P.feedResidents(s,3600,{now:NOW,hasHousing:()=>true,centralAvailable:id=>centralUnreserved(s,id),consume:(id,n)=>{s.resources[id]-=n;}});
 assert.equal(before-points(),residents*6);assert.equal(P.foodReservePlan(s).complete,true);
 assert.deepEqual(P.RECIPE_CATALOG.flour.inputs,{grain:4});assert.deepEqual(P.RECIPE_CATALOG.pasteurizedMilk.inputs,{rawMilk:4});
});
test('current construction help and ordinary meal messages do not promise a construction ration',()=>{
 const s=island(),obsolete=/jedzeni[ea] na budow|sytości na budow|żywnoś[ćc]i? na budow|jedzenie jest częścią kosztu budowy/i;
 for(const value of [developmentText('TOUR-23'),...developmentBuildingInformation('warehouse',s),developmentText('MSG-MEAL-COST',{sytość:6}),developmentText('MSG-MEAL-COST-MISSING',{brak:6}),P.quoteConstructionFood(s,1).message])assert.equal(obsolete.test(value),false,value);
 const notice='One-time supplies cover missing Town Hall coins and construction materials, plus food for residents.';
 assert.match(translate(notice,'pl'),/dla mieszkańców/);assert.equal(obsolete.test(translate(notice,'pl')),false);
 const index=ADVISOR_INTRO_IDS.indexOf('construction');assert.ok(index>=0);
 for(const firstIntroduction of [true,false])for(const cloudAccount of [true,false]){
  const options={state:s,firstIntroduction,cloudAccount},pl=getTourCopy('construction','pl',options),en=getTourCopy('construction','en',options);
  assert.equal(pl.text,developmentText('TOUR-23'));assert.equal(obsolete.test(pl.text),false);assert.match(en.text,/wood, stone or planks/);assert.equal(/[ąćęłńóśźż]/i.test(en.text),false);
  assert.equal(ADVISOR_INTRO_COPY[index][1],pl.text);assert.equal(ADVISOR_INTRO_COPY[index][3],en.text);
 }
});
