import { developmentText } from './harborlight-v1-development-copy.js?v=frontend-v32-12';
// DEV v32 military training, housing and deterministic expedition lifecycle.
// Public status never exposes a squad's hidden return time or outcome draws.
import { personKey, educationRecord, isGraduate, educationBusy, addSpecialistResident, ensureFoundingProfessors, normalizeEducation, townhallBuildSeconds } from './harborlight-v1-education.js?v=frontend-v32-12';
const HOUR=3600,DAY=86400,EPS=1e-8;
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const integer=(v,d=0,max=Number.MAX_SAFE_INTEGER)=>Math.min(max,Math.max(0,Math.floor(finite(v,d))));
const positive=v=>Math.max(0,finite(v));
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const rows=(v,n=10000)=>Array.isArray(v)?v.slice(0,n):[];
const copy=v=>JSON.parse(JSON.stringify(v));
const ids=v=>[...new Set(rows(v).filter(k=>typeof k==='string'&&k.length<160))];
const level=(s,id)=>integer(s.buildings?.[id]?.level);
const at=(s,c={})=>finite(c.now,s.worldTimeMs||s.lastSimulatedAt||0);
const find=(s,key)=>(s.residents||[]).find(p=>personKey(p)===String(key)||String(p.id)===String(key));
const result=(ok,message,extra={})=>({ok,message,...extra});
const ensure=s=>s.military?.version===1?s.military:normalizeMilitary(s,{});
const idle=p=>!!p&&!p.workplace&&!p.pendingRelease&&!(p.arrivalRemaining>EPS)&&!(p.returnRemaining>EPS)&&!p.visitGroup&&!p.visiting&&!(p.prayerRemaining>EPS);
const inBarracks=p=>!!p&&(!p.workplace||p.workplace==='barracks')&&!p.pendingRelease&&!(p.arrivalRemaining>EPS)&&!(p.returnRemaining>EPS)&&!p.visitGroup;
function notify(s,c,title,message){if(typeof c.notify==='function')return c.notify.length>=3?c.notify(s,'military',title,message):c.notify(s,{kind:'military',title,message});s.notifications ||= [];s.notificationSequence=integer(s.notificationSequence)+1;s.notifications.unshift({id:s.notificationSequence,kind:'military',title,message,at:at(s,c),read:false});s.notifications=s.notifications.slice(0,100);}
function spend(s,cost,c={}){if(!Object.entries(cost).every(([id,n])=>Number.isFinite(n)&&n>=0&&finite(typeof c.availableGoods==='function'?c.availableGoods(s,id):s.resources?.[id])>=n))return false;if(typeof c.spendGoods==='function'){const r=c.spendGoods(s,cost);return r===true||r?.ok===true;}for(const[id,n]of Object.entries(cost))s.resources[id]-=n;return true;}
function random(s,c={}){if(typeof c.random==='function')return Math.max(0,Math.min(1-Number.EPSILON,finite(c.random(),.5)));const m=ensure(s);let x=m.seed>>>0||0x9e3779b9;x^=x<<13;x^=x>>>17;x^=x<<5;m.seed=x>>>0;return (x>>>0)/4294967296;}
const randomInt=(s,c,min,max)=>min+Math.floor(random(s,c)*Math.max(1,max-min+1));
export function normalizeMilitary(state,raw=state,context={}){
 const source=object(raw.military)?raw.military:{};const people={};
 for(const[key,p]of Object.entries(object(source.people)?source.people:{}).slice(0,30000))if(object(p)&&['soldier','officer'].includes(p.rank))people[key]={rank:p.rank,trainedAt:positive(p.trainedAt),restUntil:positive(p.restUntil),rescueGift:p.rescueGift===true};
 const courses=rows(source.courses,5000).filter(c=>object(c)&&typeof c.id==='string'&&typeof c.studentUid==='string').map(c=>({id:c.id,kind:c.kind==='officer'?'officer':'recruit',studentUid:c.studentUid,instructorUid:typeof c.instructorUid==='string'?c.instructorUid:null,initialWork:Math.max(1,positive(c.initialWork)),remainingWork:positive(c.remainingWork),cost:object(c.cost)?Object.fromEntries(Object.entries(c.cost).map(([id,n])=>[id,integer(n)])):{},startedAt:positive(c.startedAt),paused:c.paused===true}));
 const squads=rows(source.squads,500).filter(q=>object(q)&&typeof q.id==='string').map(q=>({...copy(q),id:q.id.slice(0,100),stage:['away','waiting','returned','lost','departed'].includes(q.stage)?q.stage:'away',people:rows(q.people,5000).filter(p=>object(p)&&typeof p.personUid==='string').map(copy),departedAt:positive(q.departedAt),returnAt:positive(q.returnAt),returningUids:ids(q.returningUids),lostUids:ids(q.lostUids),loot:object(q.loot)?Object.fromEntries(Object.entries(q.loot).map(([id,n])=>[id,integer(n)])):{},captives:integer(q.captives,0,10000),nominationUid:typeof q.nominationUid==='string'?q.nominationUid:null,waiting:object(q.waiting)?copy(q.waiting):null,settled:q.settled===true}));
 state.military={version:1,people,courses,squads,foundingGranted:source.foundingGranted===true,sequence:integer(source.sequence),seed:integer(source.seed,((integer(state.worldTimeMs)^0x6d2b79f5)>>>0)||1,0xffffffff)||1,festiveUntil:positive(source.festiveUntil),rescueGrants:integer(source.rescueGrants)};return state.military;
}
export const barracksBeds=s=>level(s,'barracks')?4+2*Math.max(0,level(s,'barracks')-1):0;
export const militaryRecord=(s,p)=>ensure(s).people[personKey(p)]||null;
export function militaryHousingAssignment(s){const m=ensure(s),cap=barracksBeds(s);return new Set((s.residents||[]).filter(p=>m.people[personKey(p)]&&inBarracks(p)).sort((a,b)=>a.id-b.id).slice(0,cap).map(personKey));}
export function militaryBusy(s,p){const key=personKey(p),m=ensure(s);return m.courses.some(c=>c.studentUid===key||c.instructorUid===key)||m.squads.some(q=>['away','waiting'].includes(q.stage)&&q.people.some(p=>personKey(p)===key));}
export const militaryWorkMultiplier=(s,p)=>militaryRecord(s,p) ? .5 : 1;
export const militaryHappiness=(s,p)=>militaryRecord(s,p)?100:null;
export function militaryTaxable(s,p){const key=personKey(p),m=ensure(s);if(m.courses.some(c=>c.studentUid===key))return false;return m.people[key]?true:null;}
export function canAssignSpecialist(s,p,context={}){
 if(educationBusy(s,p)||militaryBusy(s,p))return result(false,'Najpierw zakończ albo przerwij bieżące zajęcie tej osoby.');
 if((militaryRecord(s,p)?.restUntil||0)>at(s,context))return result(false,'Ta osoba odpoczywa po wyprawie.');
 return result(true,'Osoba jest dostępna.');
}
function trainingFactor(s,p,c){if(!p)return 0;const coverage=s.provisions?.people?.[personKey(p)]?.coverage,food=typeof c.feedingMultiplier==='function'?finite(c.feedingMultiplier(s,p),1):Number.isFinite(coverage) ? .5+.5*Math.max(0,Math.min(1,coverage)):1;return Math.max(0,Math.min(1,food))*(typeof c.hasHousing==='function'&&!c.hasHousing(s,p) ? .5 : 1);}
function ready(s,p,c={},ignoreCourse=null){const rec=militaryRecord(s,p),key=personKey(p);return !!rec&&inBarracks(p)&&militaryHousingAssignment(s).has(key)&&rec.restUntil<=at(s,c)&&!educationBusy(s,p)&&!ensure(s).courses.some(x=>x!==ignoreCourse&&(x.studentUid===key||x.instructorUid===key));}
function courseRate(s,course,c){const teacher=find(s,course.instructorUid),student=find(s,course.studentUid);return teacher&&student&&ready(s,teacher,c,course)&&(course.kind!=='officer'||militaryRecord(s,teacher)?.rank==='officer')?Math.min(trainingFactor(s,teacher,c),trainingFactor(s,student,c)):0;}
function giveLoot(s,loot,c){if(typeof c.grantGoods==='function')return c.grantGoods(s,loot);s.resources ||= {};for(const[id,n]of Object.entries(loot))s.resources[id]=positive(s.resources[id])+n;}
function waitingRequirements(s,squad){const count=squad.returningUids.length,occupied=militaryHousingAssignment(s).size,neededBeds=occupied+count,requiredBarracks=Math.max(level(s,'barracks'),neededBeds<=4?1:1+Math.ceil((neededBeds-4)/2));return {requiredBarracks,requiredTownhall:Math.max(requiredBarracks,Math.ceil(((s.residents||[]).length+count)/36)),count};}
function remainingPeople(squad){const keys=new Set(squad.returningUids);return squad.people.filter(p=>keys.has(personKey(p)));}
function removeLostRecords(s,squad){const m=ensure(s);for(const key of squad.lostUids)delete m.people[key];}
function beginWaiting(s,q,time,c){const need=waitingRequirements(s,q),hall=level(s,'townhall');q.stage='waiting';q.waiting={...need,observedTownhallLevel:hall,townhallDeadline:need.requiredTownhall>hall?time+96*HOUR*1000:0,upgradeDeadline:need.requiredTownhall<=hall?time+DAY*1000:0,startedAt:time};notify(s,{...c,now:time},'Oddział czeka na miejsce','Powracający żołnierze czekają poza populacją. Sprawdź wymagania Ratusza i bezpłatnej rozbudowy Koszar.');}
function canAdmit(s,q){return level(s,'townhall')*36>=(s.residents||[]).length+q.returningUids.length&&barracksBeds(s)-militaryHousingAssignment(s).size>=q.returningUids.length;}
function admit(s,q,time,c){if(!canAdmit(s,q))return false;const m=ensure(s),returning=remainingPeople(q);s.residents ||= [];const existing=new Set(s.residents.map(personKey));
 for(const saved of returning){const key=personKey(saved);if(existing.has(key))continue;const p=copy(saved);p.workplace=null;p.arrivalRemaining=0;p.returnRemaining=0;p.pendingRelease=false;p.visitGroup=null;s.residents.push(p);m.people[key] ||= {rank:'soldier',trainedAt:time,restUntil:0,rescueGift:false};m.people[key].restUntil=time+DAY*1000;}
 s.population=s.residents.length;removeLostRecords(s,q);q.stage='returned';q.returnedAt=time;q.waiting=null;
 if(!q.settled){q.settled=true;giveLoot(s,q.loot,c);if(q.captives){if(typeof c.grantRescuedPeople==='function')c.grantRescuedPeople(s,q.captives);else{s.rescuedPeople ||= [];s.rescuedPeople.push({id:'war-'+q.id,count:q.captives,at:time,source:'military',waiting:true});}}
  if(q.nominationUid&&m.people[q.nominationUid]){m.people[q.nominationUid].rank='officer';m.festiveUntil=time+6*HOUR*1000;notify(s,{...c,now:time},'Nominacja oficerska','Żołnierz otrzymał nominację oficerską. Wyspa świętuje: +10 punktów szczęścia przez sześć godzin.');}
  notify(s,{...c,now:time},q.lostUids.length?'Część oddziału wróciła':'Oddział wrócił',`Powróciło ${returning.length} z ${q.people.length} żołnierzy. Rozpoczynają 24 godziny odpoczynku.`);
 }return true;}
function resolveSquad(s,q,time,c){removeLostRecords(s,q);if(!q.returningUids.length){q.stage='lost';q.settled=true;notify(s,{...c,now:time},'Wieści o wyprawie',developmentText('MSG-RETURN-NONE'));return;}
 if(!admit(s,q,time,c))beginWaiting(s,q,time,c);
}
function updateWaiting(s,q,time,c){const w=q.waiting,need=waitingRequirements(s,q),hall=level(s,'townhall');
 w.requiredTownhall=need.requiredTownhall;w.requiredBarracks=need.requiredBarracks;
 if(w.townhallDeadline>0&&hall>w.observedTownhallLevel){if(time>w.townhallDeadline)return abandon(s,q,time,c);w.observedTownhallLevel=hall;w.townhallDeadline=hall<w.requiredTownhall?time+96*HOUR*1000:0;if(!w.townhallDeadline)w.upgradeDeadline=time+DAY*1000;}
 if(w.requiredTownhall>hall&&!w.townhallDeadline&&!w.upgradeDeadline)w.townhallDeadline=time+96*HOUR*1000;
 if(w.townhallDeadline&&time>=w.townhallDeadline||w.upgradeDeadline&&time>=w.upgradeDeadline)return abandon(s,q,time,c);
 if(canAdmit(s,q))admit(s,q,time,c);
}
function abandon(s,q,time,c){q.stage='departed';q.departedPermanentlyAt=time;for(const p of q.people)delete ensure(s).people[personKey(p)];q.waiting=null;q.settled=true;notify(s,{...c,now:time},'Żołnierze odeszli',developmentText('MSG-MISSED-DEADLINE'));}
export function militaryAction(s,action,context={}){
 const type=action?.type;if(!['militaryAccelerate','militaryCancelCourse','militaryClaimReturn','militaryFreeBarracksUpgrade','militaryRecall','militaryRecruit','militaryOfficerTrain','militaryReplaceInstructor','militaryDispatch'].includes(type))return null;const m=ensure(s),now=at(s,context);
 if(type==='militaryAccelerate'){const quote=militaryAccelerationQuote(s,action.id||action.courseId,context);if(!quote.ok)return quote;const job=m.courses.find(c=>c.id===quote.id);if(action.method==='ad'){job.remainingWork=Math.max(0,job.remainingWork-quote.advertSeconds*courseRate(s,job,context));return result(true,'Reklama skróciła szkolenie.',{reducedSeconds:quote.advertSeconds});}if(action.method!=='coins')return result(false,'Wybierz monetę lub reklamę.');if(!spend(s,{coins:quote.cost},context))return result(false,'Brakuje monet.');job.remainingWork=0;advanceMilitary(s,0,context);return result(true,'Szkolenie ukończone.',{cost:quote.cost});}
 if(type==='militaryCancelCourse'){const c=m.courses.find(c=>c.id===action.courseId);if(!c)return result(false,'Nie znaleziono szkolenia.');m.courses=m.courses.filter(x=>x!==c);return result(true,'Szkolenie przerwane. Cały bieżący postęp i przekazane wyposażenie przepadły.');}
 if(type==='militaryClaimReturn'){const q=m.squads.find(q=>q.id===action.squadId&&q.stage==='waiting');if(!q)return result(false,'Nie ma takiego oczekującego oddziału.');return admit(s,q,now,context)?result(true,'Przyjęto oddział. Żołnierze rozpoczynają odpoczynek.'):result(false,'Najpierw zapewnij wymagane miejsca w Ratuszu i Koszarach.');}
 if(type==='militaryFreeBarracksUpgrade'){
  const q=m.squads.find(q=>q.id===action.squadId&&q.stage==='waiting');if(!q)return result(false,'Nie ma oczekującego oddziału z tym bonusem.');updateWaiting(s,q,now,context);if(q.stage!=='waiting')return result(q.stage==='returned',q.stage==='returned'?'Oddział został już przyjęty.':'Termin bonusu minął.');const w=q.waiting;
  if(level(s,'townhall')<w.requiredTownhall||!w.upgradeDeadline)return result(false,'Najpierw ukończ wymagane rozbudowy Ratusza.');
  if(w.requiredBarracks>level(s,'townhall')||w.requiredBarracks>100)return result(false,'Ratusz nie pozwala na wymagany poziom Koszar.');
  s.buildings.barracks.level=Math.max(level(s,'barracks'),w.requiredBarracks);if(admit(s,q,now,context))return result(true,'Koszary rozbudowano bezpłatnie. Przyjęto oddział.');return result(false,'Nadal brakuje miejsca w Ratuszu.');
 }
 if(level(s,'townhall')<4||!level(s,'barracks'))return result(false,'Koszary są dostępne od poziomu Ratusza 4.');
 if(type==='militaryRecall'){
  const p=find(s,action.personUid);if(!p||!militaryRecord(s,p))return result(false,'Nie znaleziono żołnierza.');const allowed=canAssignSpecialist(s,p,context);if(!allowed.ok)return allowed;
  if(typeof context.recallPerson==='function')return context.recallPerson(s,p,'barracks');p.workplace=null;p.arrivalRemaining=0;p.returnRemaining=0;return result(true,'Żołnierz wrócił do Koszar.');
 }
 if(type==='militaryRecruit'||type==='militaryOfficerTrain'||type==='militaryReplaceInstructor'){
  const existing=type==='militaryReplaceInstructor'?m.courses.find(c=>c.id===action.courseId):null;
  if(type==='militaryReplaceInstructor'&&!existing)return result(false,'Nie znaleziono szkolenia.');
  const teacher=find(s,action.instructorUid||action.officerUid);if(!teacher||!ready(s,teacher,context,existing))return result(false,developmentText('MSG-NO-INSTRUCTOR'));
  const kind=existing?.kind||(type==='militaryOfficerTrain'?'officer':'recruit');if(kind==='officer'&&militaryRecord(s,teacher)?.rank!=='officer')return result(false,developmentText('MSG-OFFICER-INSTRUCTOR'));
  if(existing){if(personKey(teacher)===existing.studentUid)return result(false,'Instruktor nie może szkolić samego siebie.');existing.instructorUid=personKey(teacher);existing.paused=false;return result(true,'Przydzielono zastępczego instruktora.');}
  const student=find(s,action.recruitUid||action.soldierUid||action.studentUid),key=personKey(student);
  if(!student||student===teacher||militaryBusy(s,student)||educationBusy(s,student))return result(false,'Ta osoba nie jest dostępna do szkolenia.');
  if(kind==='recruit'&&(!idle(student)||militaryRecord(s,student)||isGraduate(s,student)||educationRecord(s,student)?.profession==='professor'))return result(false,'Rekrut musi być wolnym mieszkańcem Domu bez ukończonej Akademii.');
  if(kind==='officer'&&(!ready(s,student,context)||militaryRecord(s,student)?.rank!=='soldier'))return result(false,developmentText('MSG-OFFICER-CANDIDATE'));
  const cost=kind==='recruit'?{militaryClothes:3}:{militaryClothes:8,coins:250+50*Math.max(0,level(s,'townhall')-4)};
  if(!spend(s,cost,context))return result(false,'Brakuje strojów wojskowych lub monet na szkolenie.');
  const base=townhallBuildSeconds(s,context),work=kind==='recruit'?Math.max(1,base/3):Math.max(4*HOUR,Math.min(72*HOUR,base*3)),course={id:`military-course-${++m.sequence}`,kind,studentUid:key,instructorUid:personKey(teacher),initialWork:work,remainingWork:work,cost,startedAt:now,paused:false};m.courses.push(course);
  return result(true,kind==='recruit'?'Rozpoczęto szkolenie rekruta.':'Rozpoczęto szkolenie oficerskie.',{courseId:course.id,cost,remainingSeconds:work/courseRate(s,course,context)});
 }
 if(type==='militaryDispatch'){
  const selected=ids(action.personUids||action.soldierUids),people=selected.map(key=>find(s,key));
  if(!selected.length||people.some(p=>!p||!ready(s,p,context)))return result(false,'Wybierz gotowych żołnierzy z Koszar, bez szkolenia i odpoczynku.');
  const officers=people.filter(p=>militaryRecord(s,p).rank==='officer').length,draw=random(s,context),full=officers ? .85 : .8,partial=.1;
  let count=draw<full?people.length:draw<full+partial?(people.length===1?(random(s,context)<.75?1:0):randomInt(s,context,1,people.length-1)):0;
  const shuffled=[...people];for(let i=shuffled.length-1;i>0;i--){const j=randomInt(s,context,0,i);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  const returning=shuffled.slice(0,count),returningUids=returning.map(personKey),lostUids=people.filter(p=>!returningUids.includes(personKey(p))).map(personKey),multiplier=officers?1.25+.05*(officers-1):1,l=level(s,'townhall');
  const loot=count?{coins:Math.ceil(randomInt(s,context,10*l,25*l)*multiplier),wood:Math.ceil(randomInt(s,context,2*l,5*l)*multiplier),stone:Math.ceil(randomInt(s,context,2*l,5*l)*multiplier)}:{};
  const captives=count&&random(s,context)<.2?randomInt(s,context,1,Math.max(2,l)):0,eligible=returning.filter(p=>militaryRecord(s,p).rank==='soldier'),nominationUid=eligible.length&&random(s,context)<.2?personKey(eligible[randomInt(s,context,0,eligible.length-1)]):null;
  const q={id:`squad-${++m.sequence}`,stage:'away',people:people.map(copy),departedAt:now,returnAt:now+randomInt(s,context,HOUR,96*HOUR)*1000,returningUids,lostUids,loot,captives,nominationUid,officers,lootMultiplier:multiplier,settled:false,waiting:null};m.squads.push(q);
  const set=new Set(selected);s.residents=(s.residents||[]).filter(p=>!set.has(personKey(p)));s.population=s.residents.length;
  notify(s,context,'Oddział wyruszył','Żołnierze opuścili wyspę. Na wieści o wyprawie trzeba poczekać.');return result(true,'Oddział wyruszył.',{squadId:q.id,count:selected.length});
 }
 return null;
}
export function advanceMilitary(s,elapsed,context={}){
 const m=ensure(s),seconds=positive(elapsed),end=finite(context.endAt,at(s,context)+seconds*1000);
 for(const c of [...m.courses]){
  const student=find(s,c.studentUid);if(!student){m.courses=m.courses.filter(x=>x!==c);continue;}
  const rate=courseRate(s,c,context),completedAt=Math.min(end,at(s,context)+(rate>0?c.remainingWork/rate:seconds)*1000);c.paused=rate<=0;c.remainingWork=Math.max(0,c.remainingWork-seconds*rate);
  if(c.remainingWork<=EPS&&rate>0){const old=m.people[c.studentUid];m.people[c.studentUid]={rank:c.kind==='officer'?'officer':'soldier',trainedAt:completedAt,restUntil:old?.restUntil||0,rescueGift:old?.rescueGift===true};s.housingRevision=(s.housingRevision||0)+1;student.happiness=100;m.courses=m.courses.filter(x=>x!==c);notify(s,{...context,now:completedAt},c.kind==='officer'?'Oficer gotowy':'Nowy żołnierz',c.kind==='officer'?developmentText('MSG-TRAINING-COMPLETE').replace('Nowy żołnierz','Nowy oficer'):developmentText('MSG-TRAINING-COMPLETE'));}
 }
 for(const q of [...m.squads]){
  if(q.stage==='away'&&q.returnAt<=end)resolveSquad(s,q,q.returnAt,{...context,now:q.returnAt});
  if(q.stage==='waiting')updateWaiting(s,q,end,{...context,now:end});
 }
}
export function nextMilitaryEvent(s,context={}){
 const m=ensure(s),now=at(s,context);let next=Infinity;
 for(const c of m.courses){const rate=courseRate(s,c,context);if(rate>0)next=Math.min(next,Math.max(EPS,c.remainingWork/rate));}
 for(const p of Object.values(m.people))if(p.restUntil>now)next=Math.min(next,(p.restUntil-now)/1000);
 for(const q of m.squads){if(q.stage==='away')next=Math.min(next,Math.max(EPS,(q.returnAt-now)/1000));if(q.stage==='waiting'){const deadline=q.waiting?.townhallDeadline||q.waiting?.upgradeDeadline;if(deadline)next=Math.min(next,Math.max(.001,(deadline-now)/1000));}}
 if(m.festiveUntil>now)next=Math.min(next,(m.festiveUntil-now)/1000);return next;
}
export function militaryStatus(s,context={}){
 const m=ensure(s),now=at(s,context),housed=militaryHousingAssignment(s),view=p=>({personUid:personKey(p),id:p.id,name:p.name||p.nickname||`Mieszkaniec ${p.id}`,rank:militaryRecord(s,p)?.rank||null,ready:ready(s,p,context),restUntil:positive(militaryRecord(s,p)?.restUntil),housed:housed.has(personKey(p)),busy:militaryBusy(s,p)});
 const publicSquad=q=>({id:q.id,stage:q.stage,count:q.people.length,departedAt:q.departedAt,...(q.stage==='waiting'?{waiting:{...q.waiting},returningCount:q.returningUids.length}:{}),...(q.stage==='returned'?{returnedAt:q.returnedAt,returningCount:q.returningUids.length,lostCount:q.lostUids.length,loot:{...q.loot},captives:q.captives}:{})});
 return {unlocked:level(s,'townhall')>=4&&level(s,'barracks')>0,level:level(s,'barracks'),beds:barracksBeds(s),soldiers:(s.residents||[]).filter(p=>militaryRecord(s,p)).map(view),candidates:(s.residents||[]).filter(p=>idle(p)&&!militaryRecord(s,p)&&!isGraduate(s,p)&&!educationBusy(s,p)&&!militaryBusy(s,p)).map(view),courses:m.courses.map(c=>({...c,paused:courseRate(s,c,context)<=0,remainingSeconds:courseRate(s,c,context)>0?c.remainingWork/courseRate(s,c,context):null})),squads:m.squads.map(publicSquad),waiting:m.squads.filter(q=>q.stage==='waiting').map(publicSquad),festiveUntil:m.festiveUntil,now};
}
export function ensureFoundingSoldiers(s,context={}){
 const m=ensure(s);if(m.foundingGranted||level(s,'townhall')<4||!level(s,'barracks')||s.islandRole==='daughter'||s.islandId&&s.islandId!=='island-1')return [];
 m.foundingGranted=true;const granted=[];for(let n=0;n<4;n++){const p=addSpecialistResident(s,{name:`Żołnierz ${n+1}`},context);m.people[personKey(p)]={rank:'soldier',trainedAt:at(s,context),restUntil:0,rescueGift:false};granted.push(p);}return granted;
}
export function ensureFoundingSpecialists(s,context={}){return {professors:ensureFoundingProfessors(s,context),soldiers:ensureFoundingSoldiers(s,context)};}
function allAccountPeople(s,context){
 const worlds=typeof context.getWorlds==='function'?context.getWorlds():context.worlds;const list=Array.isArray(worlds)?worlds:object(worlds)?Object.values(worlds):[s];if(!list.includes(s))list.push(s);
 const found=[];for(const world of list){for(const p of world.residents||[])found.push({person:p,world,education:world.education?.people?.[personKey(p)],military:world.military?.people?.[personKey(p)]});for(const q of world.military?.squads||[])if(['away','waiting'].includes(q.stage))for(const p of q.people||[])found.push({person:p,world,education:world.education?.people?.[personKey(p)],military:world.military?.people?.[personKey(p)]});}
 for(const entry of context.travellers||context.passengers||[])found.push(entry.person?entry:{person:entry,education:entry.education,military:entry.military});
 if(typeof context.getAccountPeople==='function')for(const entry of context.getAccountPeople()||[])found.push(entry.person?entry:{person:entry,education:entry.education,military:entry.military});
 return found;
}
export function ensureRescueSpecialist(s,kind,context={}){
 if(s.islandRole==='daughter'||s.islandId&&s.islandId!=='island-1'||level(s,'townhall')<4)return null;
 const people=allAccountPeople(s,context);
 if(kind==='professor'){
  if(!level(s,'academy')||people.some(x=>x.education?.profession==='professor'||integer(x.education?.rounds)>0))return null;
  const p=addSpecialistResident(s,{name:'Profesor z Królestwa'},context);if(!s.education?.courses)normalizeEducation(s,s);s.education.people[personKey(p)]={profession:'professor',rounds:1,protectedUntil:at(s,context)+7*DAY*1000,rescueGift:true,appointedAt:at(s,context)};notify(s,context,'Pomoc Królestwa',developmentText('MSG-RESCUE-PROFESSOR'));return p;
 }
 if(kind==='soldier'){
  if(!level(s,'barracks')||people.some(x=>['soldier','officer'].includes(x.military?.rank)))return null;
  const p=addSpecialistResident(s,{name:'Żołnierz z Królestwa'},context);ensure(s).people[personKey(p)]={rank:'soldier',trainedAt:at(s,context),restUntil:0,rescueGift:true};ensure(s).rescueGrants++;notify(s,context,'Pomoc Królestwa',developmentText('MSG-RESCUE-SOLDIER'));return p;
 }return null;
}

export function exportPersonMilitary(state,person){const r=militaryRecord(state,person);return r?copy(r):null;}
export function importPersonMilitary(state,person,record){if(record&&['soldier','officer'].includes(record.rank))ensure(state).people[personKey(person)]=copy(record);return militaryRecord(state,person);}
export function detachPersonMilitary(state,person){const r=exportPersonMilitary(state,person);delete ensure(state).people[personKey(person)];return r;}
export function militaryAccelerationQuote(state,id,context={}){const job=ensure(state).courses.find(c=>c.id===id);if(!job)return result(false,'Nie znaleziono szkolenia.');const rate=courseRate(state,job,context);return result(rate>0,rate>0?'Warunki przyspieszenia.':'Najpierw przydziel gotowego instruktora.',{id,remainingSeconds:rate>0?job.remainingWork/rate:null,cost:Math.max(1,Math.ceil(job.remainingWork/60)),advertSeconds:rate>0?Math.min(600,job.remainingWork/rate*.1):0});}
