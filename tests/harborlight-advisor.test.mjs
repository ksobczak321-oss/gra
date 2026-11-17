import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, buildingCost, act} from '../harborlight-v1-state.js';
import {centralAvailable} from '../harborlight-v1-inventory.js';
import {foodReservePlan} from '../harborlight-v1-provisions.js';
import {advisorPlan,advisorSuggestion} from '../harborlight-v1-advisor.js';
import {ADVISOR_INTRO_IDS, ADVISOR_INTRO_COPY, introductionIndex} from '../harborlight-v1-advisor-intro.js';
import {APPROVED_TOUR_IDS} from '../harborlight-v1-approved-copy.js';
const NOW=Date.parse('2026-11-17T12:00:00Z');
test('three introduction stops retain stable saved catalogue positions and complete bilingual copy',()=>{
 assert.deepEqual(ADVISOR_INTRO_IDS,['home','category-administration','building-farm']);
 for(const [index,id] of ADVISOR_INTRO_IDS.entries()) {
  assert.equal(introductionIndex(APPROVED_TOUR_IDS.indexOf(id)),index);
  assert.equal(ADVISOR_INTRO_COPY[index].length,4);
  assert.ok(ADVISOR_INTRO_COPY[index].every(text=>typeof text==='string'&&text.length>10));
 }
 assert.equal(APPROVED_TOUR_IDS.length,56); // Existing saved positions and Help remain valid.
});
function world(){const s=createState(NOW,{ruleset:32});s.buildings.townhall.level=5;s.buildings.house.level=5;return s;}
function rich(s){for(const id of Object.keys(s.resources))s.resources[id]=10000;s.resources.coins=100000;return s;}
function staff(s,id,count){s.buildings[id].workers=count;for(const p of s.residents.slice(0,count)){p.workplace=id;p.arrivalRemaining=0;p.returnRemaining=0;}return s;}

test('Port natural-language goal uses exact live construction costs and protected stock',()=>{
 const s=world(),copy=structuredClone(s),plan=advisorPlan(s,'Chciałbym najszybciej jak to możliwe rozbudować Port');
 assert.equal(plan.kind,'upgrade');assert.equal(plan.goal,'dock');
 const cost=buildingCost(structuredClone(s),'dock');assert.deepEqual(plan.cost,Object.fromEntries(Object.entries(cost)));
 for(const row of plan.missing){assert.equal(row.required,cost[row.id]);assert.equal(row.available,row.id==='coins'?s.resources.coins:centralAvailable(structuredClone(s),row.id));}
 assert.deepEqual(structuredClone(s),copy);assert.equal(plan.foodMissing,cost.foodQuote.missingSatiety);assert.equal(plan.estimate.seconds,null);
 assert.ok(plan.steps.some(x=>x.target==='sawmill'));assert.ok(plan.steps.some(x=>x.target==='warehouse'&&x.section==='priorities'));
});

test('all public advice and quotes leave normalized and partly missing sidecars unchanged',()=>{
 const s=world();delete s.provisions.foodSettings;const before=structuredClone(s);
 for(const input of ['','Port','Jedzenie','Jak ustawić priorytety w Magazynie?','Pracownicy','Potrzebuję desek','Nieznane'])advisorPlan(s,input);
 advisorSuggestion(s);assert.deepEqual(structuredClone(s),before);
});

test('locked Port points to Town Hall instead of claiming the upgrade is available',()=>{
 const s=world();s.buildings.townhall.level=1;
 const p=advisorPlan(s,'Rozbuduj port');assert.equal(p.kind,'locked');assert.match(p.text,/poziomie 4 Ratusza/);assert.deepEqual(p.steps.map(x=>x.target),['townhall']);assert.equal(p.missing.length,0);assert.equal(p.estimate.seconds,null);
});

test('Town Hall population gate uses actual requirement and current population',()=>{
 const s=world();s.buildings.townhall.level=3;s.population=18;
 const p=advisorPlan(s,'Rozbudowa ratusza');assert.equal(p.kind,'locked');assert.match(p.text,/81 mieszkańców/);assert.match(p.text,/18/);assert.equal(p.steps[0].target,'house');
});

test('food advice gives real reserve deficit and prioritizes it before hiring',()=>{
 const s=world();for(const id of ['grain','food','flour','vegetables'])s.resources[id]=0;
 const reserve=foodReservePlan(structuredClone(s)),p=advisorSuggestion(s);
 assert.equal(p.kind,'food');assert.equal(p.reserve.requiredSatiety,reserve.requiredSatiety);assert.equal(p.steps[0].section,'food');assert.match(p.text,/punktów sytości/);
});

test('hiring recommendations never exceed all currently available residents',()=>{
 const s=world();for(const p of s.residents.slice(2)){p.workplace='farm';p.arrivalRemaining=0;}s.buildings.farm.workers=s.residents.length-2;
 const p=advisorPlan(s,'rozbuduj port');assert.equal(p.freeWorkers,2);
 const hires=p.steps.filter(x=>/^Przydziel \d/.test(x.text));const total=hires.reduce((sum,x)=>sum+Number(x.text.match(/^Przydziel (\d+)/)[1]),0);
 assert.ok(total<=2);assert.equal(hires[0].target,'warehouse');
});

test('full local product buffer suggests transport, not more production staff',()=>{
 const s=world();s.buildings.quarry.workers=1;s.provisions.localStock.quarry={stone:200};
 const p=advisorSuggestion(s);assert.equal(p.kind,'storage');assert.match(p.title,/Kamieniołom/);assert.ok(p.steps.some(x=>x.target==='warehouse'&&x.section==='priorities'));
});

test('input-starved sawmill reports exact local missing input and transport',()=>{
 const s=world();s.buildings.sawmill.workers=1;s.provisions.localStock.sawmill={wood:1};
 const p=advisorSuggestion(s);assert.equal(p.kind,'input');assert.match(p.text,/Drewno 1/);assert.ok(p.steps.some(x=>x.target==='sawmill'));
});

test('ongoing construction plans its actual level rather than ordering another',()=>{
 const s=rich(world());staff(s,'warehouse',3);
 const result=act(s,{type:'upgrade',building:'dock'});assert.equal(result.ok,true);
 const before=structuredClone(s),p=advisorPlan(s,'Chcę rozbudować Port');
 assert.match(p.text,/poziomu 2 już trwa/);assert.equal(p.missing.length,0);assert.ok(p.steps.some(x=>x.text.includes('rozpoczętej')));assert.deepEqual(structuredClone(s),before);
});

test('fully funded upgrade exposes a conditional live estimate and a separately priced optional package',()=>{
 const s=rich(world());staff(s,'warehouse',3);
 const before=structuredClone(s),p=advisorPlan(s,'Port');
 assert.equal(p.missing.length,0);assert.equal(p.foodMissing,undefined);assert.ok(Number.isFinite(p.estimate.seconds));assert.ok(p.estimate.seconds>0);
 assert.match(p.estimate.text,/szacunek od zlecenia/);assert.equal(p.premium.seconds,10);assert.ok(p.premium.coins>0);assert.deepEqual(structuredClone(s),before);
});

test('follow-up retains goal, recalculates changing stock and explains its assumptions',()=>{
 const s=world(),first=advisorPlan(s,'Port');s.resources.planks+=100;
 const follow=advisorPlan(s,'Dlaczego tak?',{goal:first.goal});assert.equal(follow.goal,'dock');
 assert.equal(follow.missing.find(x=>x.id==='planks').missing,first.missing.find(x=>x.id==='planks').missing-100);
 assert.match(follow.explanation,/chronioną rezerwę/);
 const alternate=advisorPlan(s,'Zaproponuj inną drogę',{goal:first.goal});assert.match(alternate.text,/Inna droga/);assert.ok(alternate.alternative);assert.match(alternate.text,/monet/);
});

test('topic questions about warehouse are not accidentally interpreted as building upgrades',()=>{
 const s=world();assert.equal(advisorPlan(s,'Jak ustawić priorytety transportu w Magazynie?').kind,'transport');assert.equal(advisorPlan(s,'Jak zapewnić wyżywienie w Magazynie?').kind,'food');
 assert.equal(advisorPlan(s,'Coś zupełnie niezwiązanego').kind,'unknown');
 assert.equal(advisorPlan(s,'Potrzebuję więcej desek').kind,'resource');
});

test('scarce grain reserved for meals is excluded from construction and manufacturing advice',()=>{
 const s=world();s.resources.grain=100;s.resources.vegetables=0;s.resources.food=0;
 const reserve=foodReservePlan(structuredClone(s)),p=advisorPlan(s,'Potrzebuję więcej zboża');
 assert.equal(p.kind,'resource');assert.ok(reserve.materials.grain>0);assert.match(p.text,/ponad rezerwy/);
 const upgrade=advisorPlan(s,'Port');assert.equal(upgrade.missing.find(x=>x.id==='grain').available,Math.max(0,100-reserve.materials.grain));
});

test('a local finished stock recommendation waits for collection before hiring more',()=>{
 const s=world();s.resources.planks=0;s.provisions.localStock.sawmill={planks:500};
 const p=advisorPlan(s,'Port'),sawmillHires=p.steps.filter(x=>x.target==='sawmill'&&/^Przydziel/.test(x.text));
 assert.equal(sawmillHires.length,0);assert.ok(p.steps.some(x=>x.text.includes('500 szt.')&&x.section==='priorities'));
});

test('warehouse without any carriers does not get a fabricated finite completion time',()=>{
 const s=rich(world());staff(s,'warehouse',0);
 const p=advisorPlan(s,'Port');assert.equal(p.missing.length,0);assert.equal(p.estimate.seconds,null);assert.match(p.estimate.text,/tragarze muszą dotrzeć/);
});

test('Theatre advice follows its permanent-level rule rather than suggesting an upgrade',()=>{
 const p=advisorPlan(world(),'Chcę rozbudować teatr');assert.equal(p.goal,'theatre');assert.match(p.text,/nie ma kolejnych poziomów/);assert.equal(p.premium,undefined);assert.equal(p.steps[0].target,'theatre');
});

test('one stock ledger prevents the same wood from funding construction and plank inputs',()=>{
 const s=world();s.resources.wood=100;s.resources.planks=100;
 const p=advisorPlan(s,'Port');
 assert.equal(p.cost.wood,400);assert.equal(p.cost.planks,400);
 assert.equal(p.productionNeeds.planks.outputs,300);
 assert.equal(p.productionNeeds.planks.inputs.wood.required,600);
 assert.equal(p.productionNeeds.planks.inputs.wood.central,0,'the original 100 wood is already counted toward construction');
 assert.equal(p.productionNeeds.wood.outputs,900,'300 missing construction wood plus 600 sawmill input');
});

test('local input and local finished wood each reduce manufacturing once',()=>{
 const s=world();s.resources.wood=100;s.resources.planks=100;
 s.provisions.localStock.lumber={wood:100};s.provisions.localStock.sawmill={wood:50};
 const p=advisorPlan(s,'Port');assert.equal(p.productionNeeds.planks.inputs.wood.local,50);
 assert.equal(p.productionNeeds.wood.outputs,750,'900 wood needed less 100 finished wood less 50 local sawmill input');
});

test('already carried and pending goods are not redundantly manufactured or taken from another construction',()=>{
 const s=world();s.resources.planks=100;s.pendingDeliveries.planks=50;
 s.haulTrips.warehouse=[{kind:'producer',resource:'planks',amount:100,remaining:30,producer:'sawmill',worker:0},{kind:'construction',resource:'planks',amount:100,remaining:30,projectOrder:999,worker:1}];
 const p=advisorPlan(s,'Port');assert.equal(p.productionNeeds.planks.outputs,150);assert.equal(p.incomingForPlan.planks,150);
 assert.ok(p.steps.some(x=>x.text.includes('w drodze do centrali')));
});

test('alternative route gives an actual priced available purchase and preserves construction coins',()=>{
 const s=rich(world());s.resources.planks=300;s.resources.coins=1300;
 const before=structuredClone(s),p=advisorPlan(s,'Inna droga rozbudowy Portu',{alternative:true});
 assert.equal(p.alternative.kind,'trade');assert.equal(p.alternative.resource,'planks');assert.equal(p.alternative.quantity,100);assert.equal(p.alternative.coins,900);
 assert.match(p.steps[0].text,/Kup w Porcie 100/);assert.ok(p.alternative.coins+p.cost.coins<=s.resources.coins);assert.deepEqual(structuredClone(s),before);
});

test('optional premium route is priced independently and pending premium blocks duplicate orders',()=>{
 const s=rich(world()),p=advisorPlan(s,'Port',{alternative:true});assert.equal(p.alternative.kind,'premium');assert.equal(p.alternative.coins,p.premium.coins);
 s.premiumServices=[{building:'dock',buildRemaining:8,targetLevel:2}];
 const pending=advisorPlan(s,'Port');assert.equal(pending.kind,'locked');assert.match(pending.text,/kupionej rozbudowy/);assert.equal(pending.premium,undefined);
});

test('maximum-level buildings and unavailable discoveries do not invent a further upgrade or recipe',()=>{
 const s=world();s.buildings.townhall.level=100;s.buildings.dock.level=100;
 assert.match(advisorPlan(s,'Port').text,/maksymalny poziom/);
 s.buildings.farm.level=5;const p=advisorPlan(s,'Potrzebuję więcej sera');assert.equal(p.kind,'resource');assert.match(p.steps[0].text,/Nie masz teraz dostępnej produkcji: Ser/);
});

test('specific Polish product names take precedence over generic milk, fish and clothes',()=>{
 const s=world();s.buildings.dairy.level=1;
 for(const prompt of ['Potrzebuję mleka pasteryzowanego','Potrzebuję pasteryzowanego mleka']){
  const p=advisorPlan(s,prompt);assert.equal(p.kind,'resource');assert.equal(p.title,'Cel: Mleko pasteryzowane');assert.ok(p.steps.some(x=>x.target==='dairy'));
 }
 const sour=advisorPlan(s,'Potrzebuję kwaśnego mleka');assert.equal(sour.title,'Cel: Kwaśne mleko');assert.equal(sour.steps[0].target,'warehouse');assert.match(sour.steps[0].text,/72 godzinach/);
 assert.equal(advisorPlan(s,'Potrzebuję wędzonych ryb').title,'Cel: Ryba wędzona');
 assert.equal(advisorPlan(s,'Potrzebuję strojów wojskowych').title,'Cel: Strój wojskowy');
});
