import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../harborlight-v1-provisions.js';
const H=3600,D=86400;
function state({population=1,th=1,stocks={}}={}) {
 const buildings=Object.fromEntries(['townhall','house','farm','windmill','bakery','dairy','slaughterhouse','fisher','leatherworks','academy','barracks','lumber','quarry','sawmill','warehouse'].map(id=>[id,{level:id==='townhall'?th:1,workers:0}]));
 const s={worldTimeMs:0,buildings,residents:Array.from({length:population},(_,i)=>({id:i+1,personUid:'p'+(i+1),workplace:null})),resources:Object.fromEntries(P.MATERIAL_IDS.map(id=>[id,stocks[id]||0])),education:{discoveries:{}}};P.normalizeProvisions(s);return s;
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≠ ${b}`);
test('farm directions, baseline cake and automatic robes follow actual unlocks',()=>{
 const s=state();assert.deepEqual(P.availableRecipes(s,'farm').map(r=>r.id),['farmGrain','farmVegetables']);assert.equal(P.availableRecipes(s,'slaughterhouse').length,2);assert.equal(P.availableRecipes(s,'bakery').length,0);
 s.buildings.townhall.level=2;s.buildings.farm.level=2;assert.equal(P.availableRecipes(s,'farm').length,4);assert.deepEqual(P.availableRecipes(s,'bakery').map(r=>r.id),['bread','cake']);assert.equal(P.availableRecipes(s,'leatherworks').some(r=>r.id==='professorRobes'),false);
 s.buildings.townhall.level=4;assert.equal(P.availableRecipes(s,'leatherworks').some(r=>r.id==='professorRobes'),true);
 s.buildings.farm.level=6;s.education.discoveries.cheese=true;assert.equal(P.availableRecipes(s,'farm').length,5);
 assert.deepEqual(P.RECIPE_CATALOG.meat.inputs,{livestock:2});assert.deepEqual(P.RECIPE_CATALOG.meat.outputs,{meat:2});assert.deepEqual(P.RECIPE_CATALOG.leather.outputs,{leather:1});
});
test('whole-person staffing has shared and per-direction caps without cloning crew',()=>{
 const s=state();s.buildings.farm.workers=12;assert.deepEqual(P.crewCapacity(s,'farm'),{perProduct:12,total:18,products:2});
 assert.deepEqual(P.productionAssignments(s,'farm').map(row=>row.workers),[6,6]);
 assert.equal(P.provisionsAction(s,{type:'provisionsSetWorkers',building:'farm',recipeId:'farmVegetables',workers:7}).ok,true);assert.deepEqual(P.productionAssignments(s,'farm').map(row=>row.workers),[5,7]);
 assert.equal(P.provisionsAction(s,{type:'provisionsSetWorkers',building:'farm',recipeId:'farmGrain',workers:13}).ok,false);
 assert.equal(P.provisionsAction(s,{type:'provisionsSetWorkers',building:'farm',recipeId:'farmGrain',workers:6}).ok,true);assert.equal(P.provisionsAction(s,{type:'provisionsSetWorkers',building:'farm',recipeId:'farmVegetables',workers:6}).ok,true);
 assert.equal(P.productionAssignments(s,'farm').reduce((n,x)=>n+x.workers,0),12);assert.equal(P.provisionsAction(s,{type:'provisionsSetWorkers',building:'farm',recipeId:'farmVegetables',workers:.5}).ok,false);
 s.buildings.farm.level=2;assert.equal(P.crewCapacity(s,'farm').total,60);
});
test('local shared stock counts ingredients and output and blocks an entire overflowing batch',()=>{
 const s=state({stocks:{livestock:10}}),local={rawMilk:190,vegetables:109};assert.equal(P.localStorageStatus(s,'farm',local).used,299);assert.equal(P.localStockRoom(s,'farm','grain',local),1);
 s.provisions.localStock.slaughterhouse={meat:199};assert.equal(P.recipeBatchQuote(s,'meat').ok,false);assert.equal(s.resources.livestock,10);
 s.provisions.localStock.slaughterhouse={meat:198};assert.equal(P.produceRecipeBatch(s,'meat').ok,true);assert.equal(s.resources.livestock,8);assert.equal(s.provisions.localStock.slaughterhouse.meat,200);
});
test('whole monetary quotes round the transaction, not every unit, and reject unsafe money',()=>{
 assert.equal(P.quoteGoods('meat',1,'sell').coins,3);assert.equal(P.quoteGoods('meat',2,'sell').coins,5);assert.equal(P.quoteGoods('meat',2,'buy').coins,8);assert.equal(P.quoteGoods('cake',2,'buy').coins,165);
 assert.equal(P.quoteGoods('cake',Number.MAX_SAFE_INTEGER,'buy').ok,false);assert.equal(P.quoteGoods('cake',.5,'buy').ok,false);
});
test('value exchange cannot turn ten cheap meat into nine expensive flour',()=>{
 const s=state({population:0,stocks:{meat:10}}),q=P.quoteExchange(s,'meat','flour',10);assert.equal(q.ok,true);assert.equal(q.receive,2);assert.ok(q.outputValue<=q.inputValue*.9);
 assert.equal(P.provisionsAction(s,{type:'provisionsExchange',from:'meat',to:'flour',amount:10,confirm:true}).ok,true);assert.equal(s.resources.meat,0);assert.equal(s.resources.flour,2);
 assert.equal(P.quoteExchange(s,'flour','bread',1).ok,false);
});
test('cheapest reserve covers one hour and variety, while ordinary meal quotes remain available',()=>{
 const s=state({th:3,stocks:{meat:100,flour:100,bread:100}});const r=P.foodReservePlan(s);near(r.requiredSatiety,6);assert.equal(r.requiredTypes,2);assert.equal(r.complete,true);assert.ok(Object.values(r.shares).filter(x=>x>=1.2-1e-8).length>=2);assert.ok(r.materials.meat>0);
 const all=Math.floor(s.resources.meat);assert.equal(P.quoteConstructionFood(s,1,{meat:all}).ok,false);
 const one=state({stocks:{bread:10}});const q=P.quoteConstructionFood(one,6);assert.equal(q.ok,true);assert.deepEqual(q.materials,{bread:1});assert.equal(P.quoteConstructionFood(one,-1).ok,false);
 one.ruleset=32;const before=structuredClone(one);assert.equal(P.provisionsAction(one,{type:'provisionsConstructionSpend',foodUnits:6,mix:{bread:1}}).ok,false);assert.deepEqual(one,before);
});
test('ration shortage is proportional for housed and unhoused residents',()=>{
 const s=state({population:2,stocks:{grain:9}}),ctx={hasHousing:p=>p.id===1,now:0};const m=P.feedResidents(s,H,ctx);near(m.coverage,.5);near(P.feedingMultiplier(s,s.residents[0]),.75);near(P.feedingMultiplier(s,s.residents[1]),.75);
 const a=s.provisions.people.p1.history.reduce((n,x)=>n+x.satiety,0),b=s.provisions.people.p2.history.reduce((n,x)=>n+x.satiety,0);near(a,3);near(b,6);
});
test('one-off limits never renew; quantity override needs the sole edible stock',()=>{
 const s=state({stocks:{grain:100,vegetables:100}});P.provisionsAction(s,{type:'provisionsFoodSettings',limits:{grain:0,vegetables:0}});P.feedResidents(s,H,{now:0});assert.equal(s.resources.grain,100);assert.equal(s.resources.vegetables,100);near(P.feedingMultiplier(s),.5);
 s.resources.vegetables=0;P.feedResidents(s,H,{now:H*1000});assert.equal(s.resources.grain,94);assert.equal(s.provisions.foodSettings.limits.grain,0);near(P.feedingMultiplier(s),1);
 const loaded=structuredClone(s);P.normalizeProvisions(loaded,loaded);assert.equal(loaded.provisions.foodSettings.limits.grain,0);
});
test('another permitted food is used instead of overriding the first food limit',()=>{
 const s=state({stocks:{grain:100,vegetables:100}});P.provisionsAction(s,{type:'provisionsFoodSettings',priorities:['grain','vegetables'],limits:{grain:0,vegetables:null}});P.feedResidents(s,H,{now:0});assert.equal(s.resources.grain,100);assert.equal(s.resources.vegetables,94);
});
test('diet ratios come from real meals with 24h grace on joining and higher requirements',()=>{
 const s=state({th:3,stocks:{grain:100,vegetables:100}});P.feedResidents(s,H,{now:0});const d=P.dietStatus(s,s.residents[0],{now:H*1000});assert.equal(d.types,2);assert.equal(d.penalty,0);assert.equal(d.protected,true);
 assert.equal(P.dietStatus(s,s.residents[0],{now:(D+H+1)*1000}).penalty,20);
 s.buildings.townhall.level=8;const after=P.dietStatus(s,s.residents[0],{now:2*D*1000});assert.equal(after.requiredTypes,3);assert.equal(after.protected,true);assert.equal(after.penalty,0);
 const saved=structuredClone(s);P.normalizeProvisions(saved,saved,{now:2*D*1000});assert.equal(saved.provisions.people.p1.dietGraceUntil,s.provisions.people.p1.dietGraceUntil);
});
test('cake bonus needs a whole hourly ration and does not trigger from a crumb',()=>{
 const s=state({stocks:{cake:2}});P.feedResidents(s,H/2,{now:0});assert.equal(P.cakeHappinessBonus(s,s.residents[0],{now:H/2*1000}),0);
 P.feedResidents(s,H/2,{now:H/2*1000});assert.equal(P.cakeHappinessBonus(s,s.residents[0],{now:H*1000}),5);assert.equal(P.cakeHappinessBonus(s,s.residents[0],{now:7*H*1000+1}),0);
 const p=state({population:100,stocks:{cake:.001}});P.feedResidents(p,H,{now:0});assert.ok(p.residents.every(x=>P.cakeHappinessBonus(p,x,{now:H*1000})===0));
});
test('half rations accumulate equivalent hunger and a full hour recovers it',()=>{
 const s=state();for(let i=0;i<24;i++){s.resources.grain=3;P.feedResidents(s,H,{now:i*H*1000});}near(s.provisions.people.p1.hungerSeconds,12*H);near(P.hungerPenalty(s,s.residents[0]),2.5);
 s.resources.grain=6;P.feedResidents(s,H,{now:24*H*1000});assert.equal(s.provisions.people.p1.hungerSeconds,0);assert.equal(P.hungerPenalty(s,s.residents[0]),0);
});
test('milk accumulates only central residence and keeps its clock through a trip and reload',()=>{
 const s=state({population:0,stocks:{rawMilk:5}});P.advanceProvisions(s,2*D);near(s.provisions.milkLots[0].centralSeconds,2*D);const cargo=P.withdrawMilk(s,5);assert.equal(s.resources.rawMilk,0);
 P.advanceProvisions(s,2*D);const loaded=structuredClone(s);P.normalizeProvisions(loaded,loaded);P.depositMilk(loaded,5,cargo);P.advanceProvisions(loaded,D-1);assert.equal(loaded.resources.rawMilk,5);P.advanceProvisions(loaded,1);assert.equal(loaded.resources.rawMilk,0);assert.equal(loaded.resources.sourMilk,5);
});
test('milk overflow is lost and fresh incoming milk does not inherit the old batch clock',()=>{
 const s=state({population:0,stocks:{rawMilk:5,sourMilk:2}});s.provisions.milkLots[0].centralSeconds=3*D-1;P.depositMilk(s,2);P.advanceProvisions(s,1,{stockRoom:id=>id==='sourMilk'?Math.max(0,4-s.resources.sourMilk):100});assert.equal(s.resources.rawMilk,2);assert.equal(s.resources.sourMilk,4);assert.ok(s.provisions.notices.some(n=>n.message.includes('przepadł')));near(s.provisions.milkLots[0].centralSeconds,1);
});
test('civilian starting outfits survive reload, start wearing at TH5 and have 21-day lifetime',()=>{
 const s=state();assert.equal(s.provisions.people.p1.clothesSpare,2);P.advanceProvisions(s,D,{feed:false});assert.equal(s.provisions.people.p1.clothesSpare,2);
 P.normalizeProvisions(s,s);assert.equal(s.provisions.people.p1.clothesSpare,2);s.buildings.townhall.level=5;P.advanceProvisions(s,1,{feed:false});assert.equal(s.provisions.people.p1.clothesSpare,1);near(s.provisions.people.p1.clothingRemaining,21*D-1);
 const newcomer={id:2,personUid:'p2'};s.residents.push(newcomer);P.normalizeProvisions(s,s);assert.equal(s.provisions.people.p2.clothesSpare,0);assert.equal(P.clothingPenalty(s,newcomer),10);
});
test('next event stays positive and onboarding shifts do not age milk or outfits',()=>{
 const s=state({stocks:{rawMilk:1}});const until=s.provisions.people.p1.dietGraceUntil;P.shiftProvisionsTime(s,7*D*1000);assert.equal(s.provisions.people.p1.dietGraceUntil,until+7*D*1000);assert.equal(s.provisions.milkLots[0].centralSeconds,0);assert.ok(P.nextProvisionsEvent(s)>0);assert.ok(P.nextProvisionsEvent(s)<=60);
});
test('foreign actions are not swallowed and invalid settings do not alter the policy',()=>{
 const s=state();assert.equal(P.provisionsAction(s,{type:'upgrade'}),null);const old=structuredClone(s.provisions.foodSettings);assert.equal(P.provisionsAction(s,{type:'provisionsFoodSettings',limits:{grain:-1}}).ok,false);assert.deepEqual(s.provisions.foodSettings,old);
});
test('a full day of stable meals is losslessly compact and sliding24h cuts interval weights',()=>{
 const s=state({population:18,th:3,stocks:{grain:50000,vegetables:50000}});
 for(let minute=0;minute<1440;minute++)P.feedResidents(s,60,{now:minute*60000});
 assert.ok(Object.values(s.provisions.people).every(p=>p.history.length===2));assert.ok(JSON.stringify(s.provisions).length<20000);
 const p=s.residents[0],history=P.dietStatus(s,p,{now:D*1000});
 near(history.total,144); //6satiety/h for24h.
 const one=P.dietStatus(s,p,{now:25*3600*1000});near(one.total,138);
 P.normalizeProvisions(s,s);const restored=P.dietStatus(s,p,{now:25*3600*1000});near(restored.total,138);assert.equal(restored.types,2);
});

test('save clone deduplicates identical diets and reload hydrates independent histories',()=>{
 const s=state({population:18,th:3,stocks:{grain:10000,vegetables:10000}});P.feedResidents(s,3600);const clone=structuredClone(s),before=JSON.stringify(clone).length;
 const compact=P.compactDietHistories(clone);assert.equal(compact.histories,1);assert.ok(JSON.stringify(clone).length<before);assert.ok(s.provisions.people.p1.history);
 P.normalizeProvisions(clone,clone);assert.equal(clone.provisions.people.p1.history.length,2);clone.provisions.people.p1.history[0].satiety=999;assert.notEqual(clone.provisions.people.p2.history[0].satiety,999);
});
test('save history suffixes are shared across hundreds of different arrival cohorts',()=>{
 const s=state({population:720,th:20,stocks:{grain:1000000,vegetables:1000000}}),common=Array.from({length:100},(_,i)=>({resource:i%2?'grain':'vegetables',satiety:1,from:720000+i*60000,at:780000+i*60000}));
 for(const[index,p]of Object.values(s.provisions.people).entries())p.history=[{resource:'grain',satiety:.1+index*.00001,from:index*1000,at:720000},...common.map(h=>({...h}))];
 const saved=structuredClone(s),stats=P.compactDietHistories(saved);assert.ok(stats.nodes<900);assert.ok(JSON.stringify(saved).length<700000);P.normalizeProvisions(saved,saved);assert.equal(saved.provisions.people.p720.history.length,101);near(saved.provisions.people.p720.history[0].satiety,.10719);
});
