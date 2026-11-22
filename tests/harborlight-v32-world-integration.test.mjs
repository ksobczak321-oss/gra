import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, tick, advanceTo, act, taxRate, townhallPopulationRequirement, upgradeEligibility, workerLimit, recordVisit, requestUpgrade, buildingCost, canAfford } from '../harborlight-v1-state.js';
import * as Arch from '../harborlight-v1-archipelago.js';
import * as E from '../harborlight-v1-education.js';
import * as M from '../harborlight-v1-military.js';
import * as P from '../harborlight-v1-provisions.js';
import { housingStatus } from '../harborlight-v1-housing.js';
import { centralReserved, centralAvailable } from '../harborlight-v1-inventory.js';

const NOW=Date.parse('2026-11-14T12:00:00Z'),H=3600000;
const adapters={createState,normalizeState,advanceTo};
const json=s=>JSON.parse(JSON.stringify(s));
function fundedWorld(level=4,population=18){
 const raw=createState(NOW,{ruleset:32,onboarding:false});raw.buildings.townhall.level=level;raw.buildings.house.level=level;raw.buildings.warehouse.level=10;raw.population=population;raw.welcome={startedAt:0,until:0};
 for(const b of Object.values(raw.buildings))b.workers=0;
 for(const id of Object.keys(raw.resources))raw.resources[id]=1000000;
 raw.resources.food=0;const s=normalizeState(raw,NOW);for(const p of s.residents){p.happiness=0;p.newbornRemaining=0;}return s;
}
function account(){const b=Arch.restoreArchipelago(fundedWorld(10,60),adapters,NOW);assert.equal(Arch.createNextIsland(b,{name:'Wschód'},NOW).ok,true);return b;}
function targetPopulation(bundle,count,townhall=4){
 const raw=json(bundle.secondary);raw.buildings.townhall.level=townhall;raw.buildings.house.level=townhall;raw.population=count;raw.welcome={startedAt:0,until:0};raw.resources.coins=0;
 for(const b of Object.values(raw.buildings))b.workers=0;
 bundle.secondary=normalizeState(raw,NOW);for(const p of bundle.secondary.residents){p.happiness=0;p.newbornRemaining=0;}
 Arch.serializeArchipelago(bundle);return bundle.secondary;
}
test('actual v32 creation starts at eighteen; TH4 founding survives repeated root save normalization',()=>{
 const fresh=createState(NOW,{ruleset:32,onboarding:false});assert.equal(fresh.population,18);assert.equal(fresh.capacity,36);assert.equal(housingStatus(fresh).houseBeds,36);
 let s=fundedWorld();assert.equal(s.population,26);assert.equal(E.educationStatus(s).professors.length,4);assert.equal(M.militaryStatus(s).soldiers.length,4);assert.equal(taxRate(s),8);
 for(let i=0;i<3;i++)s=normalizeState(json(s),NOW);assert.equal(s.population,26);assert.equal(E.educationStatus(s).professors.length,4);assert.equal(M.militaryStatus(s).soldiers.length,4);
});
test('root act and tick finish education at exact snapshot boundary with one fee and preserved rounds after reload',()=>{
 let s=fundedWorld(),teacher=E.educationStatus(s).professors[0],student=s.residents.find(p=>!E.educationRecord(s,p)&&!M.militaryRecord(s,p));const before=s.resources.coins;
 const started=act(s,{type:'educationEnroll',studentUid:student.personUid,teacherUid:teacher.personUid},NOW);assert.equal(started.ok,true);assert.equal(s.resources.coins,before-10);assert.equal(started.remainingSeconds,243);
 tick(s,100);s=normalizeState(json(s),s.worldTimeMs);assert.equal(s.education.courses[0].remainingWork,143);assert.equal(s.resources.coins,before-10);tick(s,143);
 assert.equal(E.educationRecord(s,student.personUid).rounds,1);assert.equal(E.educationRecord(s,student.personUid).protectedUntil,NOW+243000+7*24*H);assert.equal(s.education.courses.length,0);
});
test('root military training consumes clothing once, no tax while learning, and respects half rations',()=>{
 const s=fundedWorld(),teacher=M.militaryStatus(s).soldiers[0],student=s.residents.find(p=>!E.educationRecord(s,p)&&!M.militaryRecord(s,p));const before=s.resources.militaryClothes;
 const started=act(s,{type:'militaryRecruit',recruitUid:student.personUid,instructorUid:teacher.personUid},NOW);assert.equal(started.ok,true);assert.equal(s.resources.militaryClothes,before-3);assert.equal(taxRate(s),8);
 s.provisions.people[student.personUid].coverage=0;assert.equal(M.militaryStatus(s).courses[0].remainingSeconds,486);
 // Food itself is paid by the root interval feeder and restores the full pace.
 tick(s,243);assert.equal(s.military.courses.length,0);assert.equal(M.militaryRecord(s,student.personUid).rank,'soldier');assert.equal(s.resources.militaryClothes,before-3);assert.equal(taxRate(s),9);
});
test('founding a daughter never grants another four plus four and the wallet stays singular across restore',()=>{
 let b=account();assert.equal(b.secondary.population,6);assert.equal(E.educationStatus(b.secondary).professors.length,0);assert.equal(M.militaryStatus(b.secondary).soldiers.length,0);
 const before=b.primary.resources.coins;b.secondary.resources.coins-=123;assert.equal(b.primary.resources.coins,before-123);assert.equal(b.primary.resources.coins,b.secondary.resources.coins);
 const saved=Arch.serializeArchipelago(b);assert.equal(saved.archipelago.islands['island-2'].resources.coins,0);b=Arch.restoreArchipelago(json(saved),adapters,NOW);assert.equal(b.primary.resources.coins,before-123);assert.equal(b.secondary.resources.coins,before-123);
});
test('passenger quote accepts new edible goods without any legacy Food and charges one voyage meal mix',()=>{
 const b=account(),p=b.primary.residents.find(p=>!E.educationRecord(b.primary,p)&&!M.militaryRecord(b.primary,p));b.primary.resources.food=0;b.primary.resources.grain=100000;
 const before=P.mealStatus(b.primary).reserve;assert.ok(before.requiredSatiety>0||before.satiety>0||before.materials);
 const quote=Arch.quotePassengerTransfer(b,{toIslandId:'island-2',passengerIds:[p.id]},NOW);assert.equal(quote.ok,true,quote.message);
 const coins=b.primary.resources.coins,foodBefore=Object.fromEntries(P.FOOD_IDS.map(id=>[id,b.primary.resources[id]]));const sent=Arch.sendPassengerTransfer(b,{toIslandId:'island-2',passengerIds:[p.id]},NOW);assert.equal(sent.ok,true,sent.message);assert.equal(b.primary.resources.coins,coins);assert.ok(P.FOOD_IDS.some(id=>b.primary.resources[id]<foodBefore[id]));
});
test('passenger unloading prioritizes specialists; overflow returns without losing civilian UID rounds',()=>{
 const b=account(),to=targetPopulation(b,143),from=b.primary;from.resources.food=100000;
 const professor=from.residents.find(p=>E.educationRecord(from,p)?.profession==='professor'),graduate=from.residents.find(p=>!E.educationRecord(from,p)&&!M.militaryRecord(from,p));E.importPersonEducation(from,graduate,{profession:'civilian',rounds:3,protectedUntil:NOW+H});const uid=graduate.personUid;
 const sent=Arch.sendPassengerTransfer(b,{toIslandId:'island-2',passengerIds:[graduate.id,professor.id]},NOW);assert.equal(sent.ok,true,sent.message);
 Arch.advanceArchipelago(b,NOW+H/2);assert.ok(to.residents.some(p=>p.personUid===professor.personUid));assert.equal(to.residents.some(p=>p.personUid===uid),false);assert.equal(sent.transfer.passengerPhase,'return');
 Arch.advanceArchipelago(b,NOW+H);const returned=from.residents.find(p=>p.personUid===uid);assert.ok(returned);assert.equal(E.educationRecord(from,returned).rounds,3);assert.equal(sent.transfer.status,'complete');
});
test('migrating graduate keeps rounds and immediately catches up on destination round after save reload',()=>{
 let b=account();targetPopulation(b,20);b.primary.resources.food=100000;const from=b.primary,professor=from.residents.find(p=>E.educationRecord(from,p)?.profession==='professor'),graduate=from.residents.find(p=>!E.educationRecord(from,p)&&!M.militaryRecord(from,p));E.importPersonEducation(from,graduate,{profession:'civilian',rounds:3,protectedUntil:0});const uid=graduate.personUid,teacherUid=professor.personUid;
 assert.equal(Arch.sendPassengerTransfer(b,{toIslandId:'island-2',passengerIds:[graduate.id,professor.id]},NOW).ok,true);Arch.advanceArchipelago(b,NOW+H/2);b=Arch.restoreArchipelago(json(Arch.serializeArchipelago(b)),adapters,NOW+H/2);b.secondary.education.round.number=5;b.secondary.resources.grain=100000;
 assert.equal(E.educationRecord(b.primary,uid),null);assert.equal(E.educationRecord(b.secondary,uid).rounds,3);const started=act(b.secondary,{type:'educationEnroll',studentUid:uid,teacherUid},NOW+H/2);assert.equal(started.ok,true,started.message);tick(b.secondary,started.remainingSeconds);assert.equal(E.educationRecord(b.secondary,uid).rounds,4);
});
test('account bind and reload do not replace professors sailing on the shared ship',()=>{
 let b=account();b.primary.resources.food=100000;const professors=b.primary.residents.filter(p=>E.educationRecord(b.primary,p)?.profession==='professor');assert.equal(professors.length,4);
 const sent=Arch.sendPassengerTransfer(b,{toIslandId:'island-2',passengerIds:professors.map(p=>p.id)},NOW);assert.equal(sent.ok,true,sent.message);const population=b.primary.population;const saved=Arch.serializeArchipelago(b);assert.equal(b.primary.population,population);assert.equal(E.educationStatus(b.primary).professors.length,0);
 b=Arch.restoreArchipelago(json(saved),adapters,NOW);assert.equal(b.primary.population,population);assert.equal(E.educationStatus(b.primary).professors.length,0);assert.equal(b.transfers[0].passengers.length,4);
});
test('account rescue does not duplicate soldiers away or waiting outside a full townhall',()=>{
 const b=account(),s=b.primary,soldiers=s.residents.filter(p=>M.militaryRecord(s,p));assert.equal(soldiers.length,4);const sent=M.militaryAction(s,{type:'militaryDispatch',personUids:soldiers.map(p=>p.personUid)},{now:NOW,random:()=>.5});assert.equal(sent.ok,true);const population=s.population;Arch.serializeArchipelago(b);assert.equal(s.population,population);assert.equal(M.militaryStatus(s).soldiers.length,0);
 const q=s.military.squads[0];while(s.residents.length<s.buildings.townhall.level*36)E.addSpecialistResident(s);M.advanceMilitary(s,(q.returnAt-NOW)/1000,{now:NOW});assert.equal(q.stage,'waiting');const before=s.population;Arch.serializeArchipelago(b);assert.equal(s.population,before);assert.equal(M.militaryStatus(s).soldiers.length,0);
});
test('one long offline advance resolves a full outbound passenger and return journey',()=>{
 const b=account();targetPopulation(b,144);b.primary.resources.food=100000;const p=b.primary.residents.find(p=>!E.educationRecord(b.primary,p)&&!M.militaryRecord(b.primary,p)),uid=p.personUid;const sent=Arch.sendPassengerTransfer(b,{toIslandId:'island-2',passengerIds:[p.id]},NOW);assert.equal(sent.ok,true);Arch.advanceArchipelago(b,NOW+H+60000);assert.equal(sent.transfer.status,'complete');assert.ok(b.primary.residents.some(p=>p.personUid===uid));
});
test('v32 townhall three to four requires eighty-one people, not legacy fifty-four',()=>{
 const s=fundedWorld(3,80);const req=townhallPopulationRequirement(s,4);assert.equal(req.populationCapacity,108);assert.equal(req.populationRequired,81);assert.equal(req.ok,false);assert.equal(upgradeEligibility(s,'townhall').ok,false);
 E.addSpecialistResident(s);assert.equal(townhallPopulationRequirement(s,4).ok,true);assert.equal(upgradeEligibility(s,'townhall').ok,true);
});
test('saved four-product Farm retains the full 30L crew after actual root normalization',()=>{
 const raw=json(fundedWorld(4,144));raw.buildings.farm.level=4;raw.buildings.farm.workers=120;raw.provisions.assignments.farm={farmGrain:48,farmVegetables:24,farmLivestock:24,farmMilk:24};
 raw.residents.forEach((p,i)=>{p.workplace=i<120?'farm':null;p.arrivalRemaining=0;});const s=normalizeState(raw,NOW);assert.equal(P.crewCapacity(s,'farm').total,120);assert.equal(workerLimit(s,'farm'),120);assert.equal(s.buildings.farm.workers,120);assert.equal(s.residents.filter(p=>p.workplace==='farm').length,120);
});
test('a welcome person waits twenty-four hours at full capacity and an ordinary vacancy does not admit them',()=>{
 const s=fundedWorld(3,108);s.welcomeWorkers={version:1,startedAt:NOW,claimedDays:[],granted:0,announced:true};recordVisit(s,NOW);assert.equal(s.welcomeWorkers.pending.length,1);assert.equal(s.welcomeWorkers.pending[0].expiresAt,NOW+24*H);assert.equal(s.population,108);
 s.residents.pop();s.population--;tick(s,1);assert.equal(s.population,107);assert.equal(s.welcomeWorkers.pending.length,1);assert.equal(s.welcomeWorkers.granted,0);
 // A real completed Town Hall project, rather than the vacancy, admits them.
 s.education.foundingGranted=true;s.military.foundingGranted=true;const r=requestUpgrade(s,{building:'townhall',skipTransport:true});assert.equal(r.ok,true,r.message);tick(s,10);assert.equal(s.buildings.townhall.level,4);assert.equal(s.population,108);assert.equal(s.welcomeWorkers.pending.length,0);assert.equal(s.welcomeWorkers.granted,1);
});
test('expired welcome reservation survives save but cannot be claimed after a later townhall completion',()=>{
 let s=fundedWorld(3,108);s.welcomeWorkers={version:1,startedAt:NOW,claimedDays:[],granted:0,announced:true};recordVisit(s,NOW);s=normalizeState(json(s),NOW);assert.equal(s.welcomeWorkers.pending.length,1);
 // DEV clock manipulation is deliberately local; settlement checks the absolute deadline.
 s.worldTimeMs=NOW+24*H+1000;tick(s,1);assert.equal(s.welcomeWorkers.pending.length,0);assert.equal(s.welcomeWorkers.granted,0);
 s.education.foundingGranted=true;s.military.foundingGranted=true;const r=requestUpgrade(s,{building:'townhall',skipTransport:true});assert.equal(r.ok,true,r.message);tick(s,10);assert.equal(s.population,108);assert.equal(s.welcomeWorkers.granted,0);
});
test('current building orders need only materials and coins even with no food or grain',()=>{
 const s=fundedWorld();s.buildings.house.level=3;for(const id of P.FOOD_IDS)s.resources[id]=0;
 const quote=buildingCost(s,'house',{foodMix:{grain:999999}});
 assert.deepEqual(quote,{coins:1500,wood:1500,stone:1500,planks:1500});assert.equal(quote.foodQuote,undefined);assert.equal(quote.foodUnits,undefined);assert.equal(canAfford(s,quote),true);
 const ordered=requestUpgrade(s,{building:'house',foodMix:{grain:999999}});assert.equal(ordered.ok,true,ordered.message);assert.deepEqual(ordered.project.cost,quote);
 for(const id of P.FOOD_IDS){assert.equal(s.resources[id],0,id);assert.equal(ordered.project.remainingMaterials[id]||0,0,id);assert.equal(centralReserved(s,id),0,id);}
});
test('food already reserved by an older paid project survives reload and resident meals',()=>{
 let s=fundedWorld();s.buildings.house.level=3;const r=requestUpgrade(s,{building:'house'});assert.equal(r.ok,true,r.message);
 // A historical paid receipt includes its original ration. It is preserved
 // as saved data rather than re-priced from today's food-free building quote.
 const bread=5;r.project.cost.bread=bread;r.project.remainingMaterials.bread=bread;r.project.reservedMaterials.bread=bread;r.project.goodsTotal+=bread;r.project.goodsRemaining+=bread;
 assert.equal(centralReserved(s,'bread'),bread);
 s=normalizeState(json(s),NOW);assert.equal(centralReserved(s,'bread'),bread);const reserved=centralReserved(s,'bread'),available=centralAvailable(s,'bread');P.feedResidents(s,3600,{now:NOW,hasHousing:()=>true,centralAvailable:id=>centralAvailable(s,id),consume:(id,n)=>{s.resources[id]-=Math.min(n,centralAvailable(s,id));}});assert.equal(centralReserved(s,'bread'),reserved);assert.ok(s.resources.bread>=reserved);assert.ok(centralAvailable(s,'bread')<=available);
});
test('actual tick starts individual hunger loss exactly after the twelve-hour shortage boundary',()=>{
 const s=fundedWorld(1),p=s.residents[0];for(const id of P.FOOD_IDS)s.resources[id]=0;
 for(const v of Object.values(s.provisions.people)){v.coverage=0;v.hungerSeconds=12*3600-.25;v.fullFedSeconds=0;}
 tick(s,.25);assert.equal(p.happiness,0);assert.equal(P.hungerPenalty(s,p),5);tick(s,.25);assert.ok(Math.abs(p.happiness-(-5*.25/3600))<1e-9);
});
test('replenishing food stops mature hunger immediately and earns food happiness in the next tiny tick',()=>{
 const s=fundedWorld(1),person=s.residents[0];for(const id of P.FOOD_IDS)s.resources[id]=0;
 for(const entry of Object.values(s.provisions.people)){entry.coverage=0;entry.hungerSeconds=12*3600;entry.fullFedSeconds=0;}
 tick(s,.1);const hungry=person.happiness;assert.ok(Math.abs(hungry-(-5*.1/3600))<1e-9);
 s.resources.grain=1;tick(s,.1);assert.equal(P.hungerPenalty(s,person),0);assert.ok(Math.abs(person.happiness-(hungry+.1/3600))<1e-9);assert.ok(s.provisions.people[person.personUid].hungerSeconds>=12*3600,'feeding stops the penalty before erasing its one-hour recovery timer');
});
test('root save normalization retains fractional bread and raw milk without minting or truncating stock',()=>{
 const s=fundedWorld(1);s.resources.bread=.75;s.resources.rawMilk=.5;P.syncMilkLots(s);
 let restored=normalizeState(json(s),NOW);assert.equal(restored.resources.bread,.75);assert.equal(restored.resources.rawMilk,.5);assert.ok(Math.abs(restored.provisions.milkLots.reduce((sum,l)=>sum+l.amount,0)-.5)<1e-9);
 restored=normalizeState(json(restored),NOW);assert.equal(restored.resources.bread,.75);assert.equal(restored.resources.rawMilk,.5);
});
