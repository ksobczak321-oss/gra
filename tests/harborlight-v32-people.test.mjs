import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../harborlight-v1-education.js';
import * as M from '../harborlight-v1-military.js';
import * as P from '../harborlight-v1-provisions.js';
import { housingStatus, residentHasHousing, residentWorkMultiplier } from '../harborlight-v1-housing.js';
import { residentTaxable, residentHappiness, residentHappinessRate, residentSegments, advanceResidents, assignResidents, availableResidentCount } from '../harborlight-v1-residents.js';

const H=3600, D=86400, NOW=1700000000000;
const context={now:NOW,buildSeconds:()=>900,hasHousing:()=>true};
function world(n=8,levels={}){
 const s={ruleset:32,version:32,islandId:'island-1',islandRole:'mother',worldTimeMs:NOW,population:0,residentSequence:0,residents:[],notifications:[],resources:{coins:100000,wood:100000,stone:100000,grain:100000,planks:100000,professorRobes:1000,militaryClothes:1000,sourMilk:100000},buildings:Object.fromEntries(Object.entries({townhall:4,house:4,academy:1,barracks:1,farm:6,warehouse:5,...levels}).map(([id,level])=>[id,{level,workers:0}]))};
 E.normalizeEducation(s);M.normalizeMilitary(s);for(let i=0;i<n;i++)E.addSpecialistResident(s);return s;
}
function prof(s,index=0,rounds=1){const p=s.residents[index];E.importPersonEducation(s,p,{profession:'professor',rounds,protectedUntil:0,rescueGift:false});return p;}
function soldier(s,index=0,rank='soldier'){const p=s.residents[index];M.importPersonMilitary(s,p,{rank,trainedAt:NOW,restUntil:0,rescueGift:false});return p;}
const uid=E.personKey;
test('founding specialists are equipped, once, and restricted to mother',()=>{
 const s=world(18);assert.equal(E.ensureFoundingProfessors(s,context).length,4);assert.equal(M.ensureFoundingSoldiers(s,context).length,4);assert.equal(s.population,26);assert.equal(s.resources.professorRobes,1000);assert.equal(s.resources.militaryClothes,1000);
 E.normalizeEducation(s,structuredClone(s));M.normalizeMilitary(s,structuredClone(s));assert.equal(E.ensureFoundingProfessors(s,context).length,0);assert.equal(M.ensureFoundingSoldiers(s,context).length,0);
 const d=world();d.islandId='island-2';d.islandRole='daughter';assert.equal(E.ensureFoundingProfessors(d).length,0);assert.equal(M.ensureFoundingSoldiers(d).length,0);
});
test('academy freezes fee and work; forced teacher loss preserves progress, replacement resumes',()=>{
 const s=world(),p=prof(s),student=s.residents[2],other=prof(s,1);const r=E.educationAction(s,{type:'educationEnroll',teacherUid:uid(p),studentUid:uid(student)},context);assert.equal(r.ok,true);assert.equal(s.resources.coins,99990);assert.equal(r.remainingSeconds,300);
 s.buildings.academy.level=8;s.buildings.townhall.level=20;E.advanceEducation(s,100,context);assert.equal(s.education.courses[0].remainingWork,200);
 s.residents=s.residents.filter(x=>x!==p);E.advanceEducation(s,100,context);assert.equal(s.education.courses[0].remainingWork,200);assert.equal(s.education.courses[0].paused,true);
 assert.equal(E.educationAction(s,{type:'educationReplaceTeacher',courseId:r.courseId,teacherUid:uid(other)},context).ok,true);E.advanceEducation(s,200,{...context,now:NOW+200000});assert.equal(E.educationRecord(s,student).rounds,1);assert.equal(E.educationRecord(s,student).protectedUntil,NOW+400000+7*D*1000);assert.equal(s.education.courses.length,0);
});
test('manual cancellation loses fee and current progress but retains prior rounds',()=>{
 const s=world(),p=prof(s),student=s.residents[1];E.importPersonEducation(s,student,{profession:'civilian',rounds:1});s.education.round.number=2;const r=E.educationAction(s,{type:'educationEnroll',teacherUid:uid(p),studentUid:uid(student)},context);E.advanceEducation(s,30,context);assert.equal(E.educationAction(s,{type:'educationCancelCourse',courseId:r.courseId},context).ok,true);assert.equal(s.resources.coins,99990);assert.equal(E.educationRecord(s,student).rounds,1);
});
test('academy multiplier adds rounds and research before highest archipelago academy; professors stay half base',()=>{
 const s=world(),p=s.residents[0];E.importPersonEducation(s,p,{profession:'civilian',rounds:3});s.education.researchLevels.lumber=2;
 assert.equal(E.educationWorkMultiplier(s,p,{highestAcademyLevel:5,topic:'lumber'}),6.000000000000001);
 prof(s,0,30);assert.equal(E.educationWorkMultiplier(s,p,{highestAcademyLevel:20,topic:'lumber'}),.55);
});
test('academy courses do not gain graduate multiplier and food/housing do slow them',()=>{
 const s=world(),p=prof(s,0,20),student=s.residents[1];s.buildings.academy.level=20;const c={...context,highestAcademyLevel:20,feedingMultiplier:()=>.5,hasHousing:()=>false};assert.equal(E.educationAction(s,{type:'educationEnroll',teacherUid:uid(p),studentUid:uid(student)},c).remainingSeconds,1200);E.advanceEducation(s,100,c);assert.equal(s.education.courses[0].remainingWork,275);
});
test('parallel research locks staff; island multiplier and professor hours settle correctly',()=>{
 const s=world(),a=prof(s),b=prof(s,1),c=prof(s,2);s.islandId='island-3';const r=E.educationAction(s,{type:'educationResearchStart',topic:'lumber',professorUids:[uid(a),uid(b)]},context);assert.equal(r.remainingSeconds,300);assert.equal(E.educationAction(s,{type:'educationResearchStart',topic:'quarry',professorUids:[uid(c)]},context).ok,true);assert.equal(E.educationAction(s,{type:'educationReturnProfessor',personUid:uid(a)},context).ok,false);assert.equal(E.educationAction(s,{type:'educationResearchAssign',researchId:r.researchId,professorUids:[]},context).ok,false);
 E.advanceEducation(s,300,context);assert.equal(s.education.researchLevels.lumber,1);assert.equal(s.education.researches.length,1);assert.equal(s.education.researches[0].remainingWork,900);assert.equal(E.researchQuote(s,'lumber').ok,false);s.buildings.academy.level=2;assert.deepEqual(E.researchQuote(s,'lumber').cost,{wood:48,stone:32});
});
test('cheese needs farm six, not academy six; basic cake is absent from discovery gates',()=>{
 const s=world();assert.equal(E.researchQuote(s,'cheese').ok,true);s.buildings.farm.level=5;assert.equal(E.researchQuote(s,'cheese').ok,false);assert.equal(E.RESEARCH_CATALOG.some(x=>x.id==='cake'),false);
});
test('route discovery survives serialization and supports one direction/product',()=>{
 const s=world(),p=prof(s);const r=E.educationAction(s,{type:'educationResearchStart',topic:'route:farm:bakery:grain',route:{source:'farm',target:'bakery',product:'grain'},professorUids:[uid(p)]},context);assert.equal(r.ok,true);E.advanceEducation(s,1800,context);E.normalizeEducation(s,structuredClone(s));assert.deepEqual(s.education.routes['route:farm:bakery:grain'],{source:'farm',target:'bakery',product:'grain'});
});
test('UID rounds survive transport and an arrival can catch up to island round',()=>{
 const source=world(),target=world();target.islandId='island-2';target.residents.forEach(p=>p.personUid='island-2:resident-'+p.id);const p=source.residents[0],teacher=prof(target);E.importPersonEducation(source,p,{profession:'civilian',rounds:3,protectedUntil:0});const record=E.detachPersonEducation(source,p);assert.equal(source.education.round.members.includes(uid(p)),false);p.id=90;target.residents.push(p);target.education.round.number=5;E.importPersonEducation(target,p,record);assert.equal(E.educationAction(target,{type:'educationEnroll',studentUid:uid(p),teacherUid:uid(teacher)},context).ok,true);E.advanceEducation(target,300,context);assert.equal(E.educationRecord(target,p).rounds,4);
});
test('careers are mutually exclusive and irreversible after graduation or military training',()=>{
 const s=world(),p=prof(s),a=soldier(s,1),civilian=s.residents[2];E.importPersonEducation(s,civilian,{profession:'civilian',rounds:1});assert.equal(E.educationAction(s,{type:'educationEnroll',studentUid:uid(a),teacherUid:uid(p)},context).ok,false);assert.equal(M.militaryAction(s,{type:'militaryRecruit',recruitUid:uid(civilian),instructorUid:uid(a)},context).ok,false);
});
test('recruit gear and progress are lost on cancel; overflow soldiers live Home and cannot teach',()=>{
 const s=world(),a=soldier(s),recruit=s.residents[6];for(let i=1;i<5;i++)soldier(s,i);const r=M.militaryAction(s,{type:'militaryRecruit',recruitUid:uid(recruit),instructorUid:uid(a)},context);assert.equal(r.ok,true);assert.equal(s.resources.militaryClothes,997);assert.equal(M.militaryTaxable(s,recruit),false);assert.equal(M.militaryAction(s,{type:'militaryCancelCourse',courseId:r.courseId},context).ok,true);assert.equal(s.resources.militaryClothes,997);assert.equal(M.militaryAction(s,{type:'militaryRecruit',recruitUid:uid(recruit),instructorUid:uid(s.residents[4])},context).ok,false);
});
test('officers require an officer teacher, extra gear, snapshot coin cost and bounded duration',()=>{
 const s=world(),a=soldier(s),b=soldier(s,1);assert.equal(M.militaryAction(s,{type:'militaryOfficerTrain',soldierUid:uid(b),officerUid:uid(a)},context).ok,false);s.military.people[uid(a)].rank='officer';const r=M.militaryAction(s,{type:'militaryOfficerTrain',soldierUid:uid(b),officerUid:uid(a)},context);assert.equal(r.ok,true);assert.deepEqual(r.cost,{militaryClothes:8,coins:250});assert.equal(r.remainingSeconds,4*H);M.advanceMilitary(s,4*H,context);assert.equal(M.militaryRecord(s,b).rank,'officer');
});
test('away troops leave population and beds, keep UID snapshots, and hide return/outcome from UI',()=>{
 const s=world(),p=soldier(s),r=M.militaryAction(s,{type:'militaryDispatch',personUids:[uid(p)]},{...context,random:()=>.5});assert.equal(r.ok,true);assert.equal(s.population,7);assert.equal(s.residents.includes(p),false);assert.equal(M.militaryHousingAssignment(s).size,0);const view=M.militaryStatus(s).squads[0];assert.equal('returnAt' in view,false);assert.equal('returningUids' in view,false);assert.equal('loot' in view,false);M.normalizeMilitary(s,structuredClone(s));assert.equal(s.military.squads[0].people[0].personUid,uid(p));
 const q=s.military.squads[0];M.advanceMilitary(s,(q.returnAt-NOW)/1000,context);assert.equal(s.population,8);assert.equal(M.militaryRecord(s,p).restUntil,q.returnAt+D*1000);assert.equal(M.militaryAction(s,{type:'militaryDispatch',personUids:[uid(p)]},{now:q.returnAt}).ok,false);assert.equal(s.military.squads[0].stage,'returned');
});
test('full townhall waits outside population; each necessary level gets 96h and rest begins upon actual admission',()=>{
 const s=world(144),p=soldier(s),r=M.militaryAction(s,{type:'militaryDispatch',personUids:[uid(p)]},{...context,random:()=>.5});E.addSpecialistResident(s);const q=s.military.squads[0];M.advanceMilitary(s,(q.returnAt-NOW)/1000,context);assert.equal(q.stage,'waiting');assert.equal(s.population,144);assert.equal(q.waiting.townhallDeadline,q.returnAt+96*H*1000);assert.equal(M.militaryRecord(s,p).restUntil,0);s.buildings.townhall.level=5;const admittedAt=q.returnAt+H*1000;M.advanceMilitary(s,0,{now:admittedAt});assert.equal(q.stage,'returned');assert.equal(M.militaryRecord(s,p).restUntil,admittedAt+D*1000);assert.equal(r.ok,true);
});
test('barracks overflow permits recurring free upgrades bounded by townhall',()=>{
 const s=world(12),a=soldier(s),b=soldier(s,1),c=soldier(s,2),d=soldier(s,3);M.militaryAction(s,{type:'militaryDispatch',personUids:[uid(a)]},{...context,random:()=>.5});soldier(s,4);const q=s.military.squads[0];M.advanceMilitary(s,(q.returnAt-NOW)/1000,context);assert.equal(q.stage,'waiting');assert.equal(q.waiting.upgradeDeadline,q.returnAt+D*1000);assert.equal(M.militaryAction(s,{type:'militaryFreeBarracksUpgrade',squadId:q.id},{now:q.returnAt}).ok,true);assert.equal(s.buildings.barracks.level,2);assert.equal(q.stage,'returned');
 // A later qualifying return can claim another gift; there is no lifetime cap.
 s.military.people[uid(a)].restUntil=0;M.militaryAction(s,{type:'militaryDispatch',personUids:[uid(a)]},{...context,now:q.returnAt,random:()=>.5});soldier(s,5);soldier(s,6);const q2=s.military.squads[1];M.advanceMilitary(s,(q2.returnAt-q.returnAt)/1000,{now:q.returnAt});assert.equal(q2.stage,'waiting');assert.equal(M.militaryAction(s,{type:'militaryFreeBarracksUpgrade',squadId:q2.id},{now:q2.returnAt}).ok,true);assert.equal(s.buildings.barracks.level,3);
});
test('missed waiting deadline permanently removes troop and does not pay loot twice',()=>{
 const s=world(144),p=soldier(s);M.militaryAction(s,{type:'militaryDispatch',personUids:[uid(p)]},{...context,random:()=>.5});E.addSpecialistResident(s);const q=s.military.squads[0],money=s.resources.coins;M.advanceMilitary(s,(q.returnAt-NOW)/1000+97*H,context);assert.equal(q.stage,'departed');assert.equal(M.militaryRecord(s,p),null);assert.equal(s.resources.coins,money);M.advanceMilitary(s,D,context);assert.equal(s.resources.coins,money);
});
test('rescue gift checks the whole account including away and transit, and gifted professors cannot be surrendered',()=>{
 const s=world(),p=prof(s);assert.equal(M.ensureRescueSpecialist(s,'professor',context),null);s.residents=s.residents.filter(x=>x!==p);const education=s.education.people[uid(p)];delete s.education.people[uid(p)];assert.equal(M.ensureRescueSpecialist(s,'professor',{...context,travellers:[{person:p,education}]}),null);const gifted=M.ensureRescueSpecialist(s,'professor',context);assert.ok(gifted);assert.equal(E.canHandOverProfessor(s,gifted),false);const sol=soldier(s);M.militaryAction(s,{type:'militaryDispatch',personUids:[uid(sol)]},{...context,random:()=>.5});assert.equal(M.ensureRescueSpecialist(s,'soldier',context),null);
});
test('advertisement advances calendar fraction; research instant payment uses staffed calendar minutes',()=>{
 const s=world(),a=prof(s),b=prof(s,1);const r=E.educationAction(s,{type:'educationResearchStart',topic:'lumber',professorUids:[uid(a),uid(b)]},context);assert.equal(E.educationAccelerationQuote(s,r.researchId,context).cost,15);assert.equal(E.educationAction(s,{type:'educationAccelerate',id:r.researchId,method:'ad'},context).reducedSeconds,90);assert.equal(s.education.researches[0].remainingWork,1620);assert.equal(E.educationAction(s,{type:'educationAccelerate',id:r.researchId,method:'coins'},context).cost,14);assert.equal(s.education.researchLevels.lumber,1);
});
test('v32 specialist beds are separate, delegated workers need Home, and free bed reassignment is immediate',()=>{
 const s=world(48,{house:1}),a=prof(s),b=soldier(s,1);assert.equal(housingStatus(s).houseBeds,36);assert.equal(housingStatus(s).housed,38);assert.equal(residentHasHousing(s,s.residents[37]),true);assert.equal(residentHasHousing(s,s.residents[38]),false);
 a.workplace='lumber';s.residents=[...s.residents];assert.equal(housingStatus(s).housed,37);assert.equal(residentHasHousing(s,a),true);assert.equal(residentHasHousing(s,s.residents[37]),false);assert.equal(housingStatus(s).foodDemandPerHour,6*(37+22));
 b.workplace='quarry';s.residents=[...s.residents];assert.equal(housingStatus(s).housed,36);
});
test('v32 actual production combines per-person food, beds and career once and retains legacy behavior',()=>{
 const s=world(40,{house:1,academy:5}),a=prof(s),b=soldier(s,1),graduate=s.residents[2];a.workplace='lumber';b.workplace='quarry';graduate.workplace='lumber';P.normalizeProvisions(s);s.highestAcademyLevel=6;E.importPersonEducation(s,graduate,{profession:'civilian',rounds:3});s.education.researchLevels.lumber=2;s.provisions.people[uid(graduate)].coverage=0;
 assert.equal(residentWorkMultiplier(s,a),.55);assert.equal(residentWorkMultiplier(s,b),.5);assert.ok(Math.abs(residentWorkMultiplier(s,graduate)-3.6)<1e-9);assert.equal(residentWorkMultiplier(s,s.residents[39]),.5);s.ruleset=31;assert.equal(housingStatus(s).beds,24);assert.equal(residentWorkMultiplier(s,graduate),1);
});
test('courses are occupations without tax; all ready housed specialists pay tax and cannot be stolen by a job',()=>{
 const s=world(),a=prof(s),b=soldier(s,1),student=s.residents[2];E.educationAction(s,{type:'educationEnroll',studentUid:uid(student),teacherUid:uid(a)},context);assert.equal(residentTaxable(s,a),true);assert.equal(residentTaxable(s,b),true);assert.equal(residentTaxable(s,student),false);assert.equal(residentHappinessRate(s,student),2);assert.equal(availableResidentCount(s),6);assignResidents(s,'lumber',8);assert.equal(a.workplace,null);assert.equal(student.workplace,null);assert.equal(b.workplace,'lumber');
});
test('research staffing lets one of two professors work but protects the final researcher',()=>{
 const s=world(2),a=prof(s),b=prof(s,1);E.educationAction(s,{type:'educationResearchStart',topic:'lumber',professorUids:[uid(a),uid(b)]},context);assignResidents(s,'lumber',2);assert.equal(s.buildings.lumber?.workers||s.residents.filter(p=>p.workplace==='lumber').length,1);assert.equal(s.education.researches[0].professorUids.length,1);
});
test('financial loss remains below protected military happiness and is recovered by food and work',()=>{
 const s=world(),a=soldier(s);P.normalizeProvisions(s);s.kingdom={version:32,financialOffsets:{[uid(a)]:10}};assert.equal(residentHappiness(s,a),90);assert.equal(residentHappinessRate(s,a),2);advanceResidents(residentSegments(s),H);assert.equal(residentHappiness(s,a),92);assert.equal(s.kingdom.financialOffsets[uid(a)],8);s.blessingRemaining=100;assert.equal(residentHappiness(s,a),100);assert.equal(s.kingdom.financialOffsets[uid(a)],8);s.lighthouseRemaining=100;assert.equal(residentHappiness(s,a),100);
});
test('ordinary capped happiness recovers financial debt without double-counting food/work gains',()=>{
 const s=world(),p=s.residents[0];p.happiness=100;P.normalizeProvisions(s);s.kingdom={version:32,financialOffsets:{[uid(p)]:10}};advanceResidents(residentSegments(s),H);assert.equal(residentHappiness(s,p),91);p.happiness=50;advanceResidents(residentSegments(s),H);assert.equal(residentHappiness(s,p),42);
});
