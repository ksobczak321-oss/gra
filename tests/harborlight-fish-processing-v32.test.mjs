import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, normalizeState} from '../harborlight-v1-state.js';
import * as P from '../harborlight-v1-provisions.js';
import * as E from '../harborlight-v1-education.js';
import * as D from '../harborlight-v1-development-logistics.js';
import * as L from '../harborlight-v1-logistics.js';

const NOW=Date.parse('2026-11-15T12:00:00Z');
function world() {
 const s=createState(NOW,{ruleset:32});
 s.buildings.townhall.level=5;s.buildings.house.level=5;s.buildings.fisher.level=5;s.buildings.academy.level=1;
 s.resources.fish=1000;s.resources.planks=100;
 return s;
}
function processing(s) {
 s.education.discoveries.fishProcessing=true;
 s.buildings.fisher.workers=2;
 s.residents.slice(0,2).forEach(p=>{p.workplace='fisher';p.arrivalRemaining=0;p.returnRemaining=0;});
 s.provisions.assignments.fisher={fish:0,smokedFish:1,fishPreserves:1};
 D.normalizeDevelopmentLogistics(s);
}

test('one Fisher5 discovery unlocks two category III local recipes, independently of Academy level5',()=>{
 const s=world();s.buildings.fisher.level=4;
 assert.equal(E.researchQuote(s,'fishProcessing').ok,false);
 s.buildings.fisher.level=5;
 const q=E.researchQuote(s,'fishProcessing');assert.equal(q.ok,true);assert.equal(q.definition.minimumAcademy,1);
 assert.deepEqual(P.availableRecipes(s,'fisher').map(x=>x.id),['fish']);
 s.education.discoveries.fishProcessing=true;
 assert.deepEqual(P.availableRecipes(s,'fisher').map(x=>x.id),['fish','smokedFish','fishPreserves']);
 for(const id of ['smokedFish','fishPreserves']) {
  assert.equal(P.GOODS[id].category,3);assert.equal(P.GOODS[id].edible,true);
  assert.ok(P.FOOD_IDS.includes(id));assert.equal(P.RECIPE_CATALOG[id].building,'fisher');assert.equal(P.RECIPE_CATALOG[id].localInputs,true);
 }
 s.buildings.fisher.level=4;
 assert.deepEqual(P.availableRecipes(s,'fisher').map(x=>x.id),['fish']);
});

test('research charges its frozen cost and completion retains the shared unlock across normalization',()=>{
 const s=world(),teacher=s.residents[0];
 E.importPersonEducation(s,teacher,{profession:'professor',rounds:1,protectedUntil:0});
 const q=E.researchQuote(s,'fishProcessing'),before={fish:s.resources.fish,planks:s.resources.planks};
 const started=E.educationAction(s,{type:'educationResearchStart',topic:'fishProcessing',professorUids:[E.personKey(teacher)]},{now:NOW,hasHousing:()=>true,feedingMultiplier:()=>1});
 assert.equal(started.ok,true);assert.equal(s.resources.fish,before.fish-q.cost.fish);assert.equal(s.resources.planks,before.planks-q.cost.planks);
 E.advanceEducation(s,q.work,{now:NOW,hasHousing:()=>true,feedingMultiplier:()=>1});
 assert.equal(s.education.discoveries.fishProcessing,true);assert.equal(s.education.researches.length,0);
 const restored=normalizeState(structuredClone(s),NOW);
 assert.equal(restored.education.discoveries.fishProcessing,true);
 assert.ok(P.availableRecipes(restored,'fisher').some(x=>x.id==='fishPreserves'));
 assert.equal(E.researchQuote(restored,'fishProcessing').ok,false);
});

test('atomic fish batches use only the local catch and can process a full local buffer',()=>{
 const s=world();processing(s);
 s.provisions.localStock.fisher.fish=10;
 assert.equal(P.produceRecipeBatch(s,'smokedFish').ok,true);
 assert.equal(P.produceRecipeBatch(s,'fishPreserves').ok,true);
 assert.equal(s.resources.fish,1000);assert.equal(s.provisions.localStock.fisher.fish,0);
 assert.equal(s.provisions.localStock.fisher.smokedFish,1);assert.equal(s.provisions.localStock.fisher.fishPreserves,1);
 const before=structuredClone(s.provisions.localStock.fisher);
 assert.equal(P.produceRecipeBatch(s,'smokedFish').ok,false);
 assert.deepEqual(s.provisions.localStock.fisher,before,'central fish cannot silently replace a missing local catch');
 s.provisions.localStock.fisher={fish:1000,wood:500};
 assert.equal(P.produceRecipeBatch(s,'smokedFish').ok,true,'consuming four local inputs frees capacity before one output is made');
 assert.equal(s.provisions.localStock.fisher.fish,996);
});

test('physical worker jobs transform local fresh fish without a carrier delivery or central debit',()=>{
 const s=world();processing(s);s.provisions.localStock.fisher.fish=10;
 L.advanceLogistics(s,90);
 assert.equal(s.provisions.localStock.fisher.fish,0);
 assert.equal(s.provisions.localStock.fisher.smokedFish,1);assert.equal(s.provisions.localStock.fisher.fishPreserves,1);
 assert.equal(s.resources.fish,1000);assert.equal(s.statistics.crafted,2);
 assert.ok(!Object.values(s.haulTrips).flat().some(t=>t.resource==='fish'));
});

test('local processing reserves its catch, exports surplus, and releases raw fish when workers are reassigned',()=>{
 const s=world();processing(s);s.provisions.localStock.fisher.fish=100;
 s.provisions.localStock.fisher.smokedFish=3;s.provisions.localStock.fisher.fishPreserves=2;
 const context={centralRoom:()=>10000,centralAvailable:()=>1000};
 let sources=D.developmentWarehouseSources(s,context);
 assert.equal(sources.find(x=>x.kind==='producer'&&x.producer==='fisher'&&x.resource==='fish').available,60);
 assert.equal(sources.some(x=>x.kind==='producerInput'&&x.target==='fisher'&&x.resource==='fish'),false);
 assert.ok(sources.some(x=>x.kind==='producer'&&x.resource==='smokedFish'));
 assert.ok(sources.some(x=>x.kind==='producer'&&x.resource==='fishPreserves'));
 s.provisions.assignments.fisher={fish:2,smokedFish:0,fishPreserves:0};
 sources=D.developmentWarehouseSources(s,context);
 assert.equal(sources.find(x=>x.kind==='producer'&&x.producer==='fisher'&&x.resource==='fish').available,100);
 s.education.routes['route:local-fish']={source:'fisher',target:'fisher',product:'fish'};s.education.discoveries['route:local-fish']=true;
 assert.equal(D.directRouteCatalog(s).some(x=>x.id==='route:local-fish'),false);
});

test('new meals join food settings and diet history without dropping old stock, assignments or discovery receipts',()=>{
 const s=world();processing(s);
 s.provisions.localStock.fisher.smokedFish=7;s.provisions.localStock.fisher.fishPreserves=9;
 s.resources.smokedFish=100;s.resources.fishPreserves=100;
 const restored=normalizeState(structuredClone(s),NOW);
 assert.equal(restored.resources.smokedFish,100);assert.equal(restored.resources.fishPreserves,100);
 assert.equal(restored.provisions.localStock.fisher.smokedFish,7);assert.equal(restored.provisions.localStock.fisher.fishPreserves,9);
 assert.deepEqual(restored.provisions.assignments.fisher,{fish:0,smokedFish:1,fishPreserves:1});
 assert.ok(restored.provisions.foodSettings.priorities.includes('smokedFish'));assert.ok(restored.provisions.foodSettings.priorities.includes('fishPreserves'));
 restored.provisions.foodSettings.priorities=['smokedFish','fishPreserves'];
 for(const id of P.FOOD_IDS)if(!['smokedFish','fishPreserves'].includes(id))restored.resources[id]=0;
 const fed=P.feedResidents(restored,3600,{now:NOW,hasHousing:()=>true});
 assert.equal(fed.coverage,1);assert.ok(fed.consumed.smokedFish>0);assert.ok(fed.consumed.fishPreserves>0);
 const diet=P.dietStatus(restored,restored.residents[0],{now:NOW+3600000});
 assert.ok(diet.shares.smokedFish>0);assert.ok(diet.shares.fishPreserves>0);
 assert.equal(L.warehouseLimits(restored).total,40000,'two new goods do not multiply the shared Warehouse basket');
});
