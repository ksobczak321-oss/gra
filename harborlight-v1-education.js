// DEV v32. Pure education/research model; all persistent identity is keyed by personUid.
// This module never advances the world's clock or calls a network service.
const HOUR = 3600, DAY = 86400, EPS = 1e-8;
const finite = (v, d=0) => Number.isFinite(Number(v)) ? Number(v) : d;
const integer = (v,d=0,max=Number.MAX_SAFE_INTEGER) => Math.min(max,Math.max(0,Math.floor(finite(v,d))));
const positive = v => Math.max(0,finite(v));
const object = v => v && typeof v==='object' && !Array.isArray(v);
const copy = v => JSON.parse(JSON.stringify(v));
const result = (ok,message,extra={}) => ({ok,message,...extra});
export const personKey = person => typeof person==='string' ? person : person?.personUid || (Number.isSafeInteger(person?.id) ? `resident:${person.id}` : '');
const find = (state,key) => (state.residents||[]).find(p=>personKey(p)===String(key)||String(p.id)===String(key));
const level = (state,id) => integer(state.buildings?.[id]?.level);
const at = (state,ctx={}) => finite(ctx.now,state.worldTimeMs||state.lastSimulatedAt||0);
const ensure = state => state.education?.version===1 ? state.education : normalizeEducation(state,{});
const rows = (v,max=10000) => Array.isArray(v)?v.slice(0,max):[];
const ids = v => [...new Set(rows(v).filter(x=>typeof x==='string'&&x.length<160))];
function notify(state,ctx,title,message) {
  if(typeof ctx.notify==='function') return ctx.notify.length>=3?ctx.notify(state,'education',title,message):ctx.notify(state,{kind:'education',title,message});
  state.notifications ||= []; state.notificationSequence=integer(state.notificationSequence)+1;
  state.notifications.unshift({id:state.notificationSequence,kind:'education',title,message,at:at(state,ctx),read:false});state.notifications=state.notifications.slice(0,100);
}
function canSpend(state,cost,ctx) {
  return Object.entries(cost).every(([id,n])=>Number.isFinite(n)&&n>=0&&finite(typeof ctx.availableGoods==='function'?ctx.availableGoods(state,id):state.resources?.[id])>=n);
}
function spend(state,cost,ctx={}) {
  if(!canSpend(state,cost,ctx))return false;
  if(typeof ctx.spendGoods==='function'){const r=ctx.spendGoods(state,cost);return r===true||r?.ok===true;}
  for(const [id,n] of Object.entries(cost))state.resources[id]-=n;return true;
}
export const RESEARCH_TIME_SECONDS = Object.freeze([1800,2700,3600,5400,7200,10800,14400,21600,28800,43200,57600,72000,86400,108000,129600,151200,172800,201600,230400,259200]);
const repeat=(id,name,firstCost,effect)=>Object.freeze({id,name,kind:'repeat',firstCost,effect,minimumAcademy:1});
export const RESEARCH_CATALOG = Object.freeze([
  repeat('lumber','Siekiera o pewnym ostrzu',{wood:12,stone:8},'+5% wydajności drwali'),
  repeat('quarry','Sekrety pękającej skały',{stone:12,wood:8},'+5% wydobycia kamienia'),
  repeat('grain','Kłosy pełne ziaren',{grain:16,wood:4},'+5% zbiorów zboża'),
  repeat('vegetables','Ogrody bez pustych grządek',{vegetables:16,stone:4},'+5% zbiorów warzyw'),
  repeat('livestock','Zdrowsze stada',{livestock:12,grain:8},'+5% pozyskiwania żywca'),
  repeat('rawMilk','Spokojny udój',{rawMilk:16,wood:4},'+5% pozyskiwania mleka'),
  repeat('fisher','Tajemnice łowisk',{fish:16,wood:4},'+5% połowu ryb'),
  repeat('windmill','Żarna mistrza młynarskiego',{grain:16,stone:4},'+5% produkcji mąki'),
  repeat('bakery','Piec o równym żarze',{flour:4,wood:4},'+5% tempa wypieków'),
  repeat('dairy','Sztuka pasteryzacji',{rawMilk:12,stone:8},'+5% pasteryzacji'),
  repeat('slaughterhouse','Sprawny rozbiór',{livestock:12,stone:8},'+5% tempa pracy Rzeźni'),
  repeat('leatherworks','Precyzyjny wykrój',{leather:2,planks:4},'+5% tempa szycia'),
  repeat('sawmill','Piła prowadzona pewną ręką',{wood:12,planks:4},'+5% produkcji desek'),
  repeat('roads','Znajomość wyspiarskich traktów',{stone:12,planks:4},'+5% prędkości tragarzy'),
  repeat('warehouse','Każda skrzynia na swoim miejscu',{planks:8,stone:4},'+5% pojemności Magazynu'),
  repeat('construction','Rusztowania dobrego budowniczego',{planks:6,stone:8},'+5% szybkości budowy'),
  Object.freeze({id:'fishProcessing',name:'Wędzenie i przetwory rybne',kind:'discovery',firstCost:{fish:24,planks:4},minimumAcademy:1,minimumBuilding:{fisher:5},effect:'Odblokowuje u Rybaka: 4 świeże ryby → 1 ryba wędzona oraz 6 świeżych ryb → 1 porcja przetworów rybnych; pożywienie III kategorii',devBalanceProposal:true}),
  Object.freeze({id:'cheese',name:'Wyrób sera',kind:'discovery',firstCost:{sourMilk:4,planks:4},minimumAcademy:1,minimumBuilding:{farm:6},effect:'Odblokowuje 4 kwaśne mleka → 1 ser',devBalanceProposal:true}),
  Object.freeze({id:'royalCredit',name:'Królewski kredyt',kind:'discovery',firstCost:{wood:40,stone:20,planks:10},minimumAcademy:1,minimumTownhall:5,effect:'Odblokowuje wniosek o pożyczkę',devBalanceProposal:true})
]);
// Explicit DEV-only costs above make the selected mechanics testable. Their
// proposal marker must be reviewed before any PRE-PROD promotion.
export function normalizeEducation(state,raw=state,context={}) {
  const source=object(raw.education)?raw.education:{};
  const people={};for(const [key,p] of Object.entries(object(source.people)?source.people:{}).slice(0,30000))if(key.length<160&&object(p))people[key]={profession:p.profession==='professor'?'professor':'civilian',rounds:integer(p.rounds,0,10000),protectedUntil:positive(p.protectedUntil),rescueGift:p.rescueGift===true,appointedAt:positive(p.appointedAt)};
  const courses=rows(source.courses,5000).filter(c=>object(c)&&typeof c.id==='string'&&typeof c.studentUid==='string').map(c=>({id:c.id.slice(0,100),studentUid:c.studentUid,teacherUid:typeof c.teacherUid==='string'?c.teacherUid:null,round:Math.max(1,integer(c.round,1,10000)),initialWork:Math.max(1,positive(c.initialWork)),remainingWork:positive(c.remainingWork),cost:integer(c.cost),startedAt:positive(c.startedAt),paused:c.paused===true}));
  const researches=rows(source.researches,500).filter(r=>object(r)&&typeof r.id==='string'&&typeof r.topic==='string').map(r=>({id:r.id.slice(0,100),topic:r.topic.slice(0,200),level:Math.max(1,integer(r.level,1,1000)),initialWork:Math.max(1,positive(r.initialWork)),remainingWork:positive(r.remainingWork),cost:object(r.cost)?Object.fromEntries(Object.entries(r.cost).map(([k,v])=>[k,integer(v)])):{},professorUids:ids(r.professorUids),startedAt:positive(r.startedAt),paused:r.paused===true,...(object(r.route)?{route:{source:String(r.route.source||''),target:String(r.route.target||''),product:String(r.route.product||'')}}:{})}));
  state.education={version:1,people,courses,researches,researchLevels:Object.fromEntries(Object.entries(object(source.researchLevels)?source.researchLevels:{}).map(([k,v])=>[k,integer(v,0,1000)])),discoveries:Object.fromEntries(Object.entries(object(source.discoveries)?source.discoveries:{}).filter(([,v])=>v===true)),round:{number:Math.max(1,integer(source.round?.number,1,10000)),members:ids(source.round?.members)},foundingGranted:source.foundingGranted===true,sequence:integer(source.sequence),routes:object(source.routes)?copy(source.routes):{}};
  return state.education;
}
export function educationRecord(state,person,create=false) {
  const e=ensure(state),key=personKey(person);if(!key)return null;
  if(!e.people[key]&&create)e.people[key]={profession:'civilian',rounds:0,protectedUntil:0,rescueGift:false,appointedAt:0};
  return e.people[key]||null;
}
export const isGraduate=(state,person)=>integer(educationRecord(state,person)?.rounds)>0;
export const hasDiscovery=(state,id)=>ensure(state).discoveries[id]===true;
export const researchEffect=(state,id)=>1+.05*integer(ensure(state).researchLevels[id]);
export function highestAcademyLevel(state,context={}) {
  if(Number.isFinite(context.highestAcademyLevel))return Math.max(1,integer(context.highestAcademyLevel));
  const worlds=typeof context.getWorlds==='function'?context.getWorlds():context.worlds;
  const list=Array.isArray(worlds)?worlds:object(worlds)?Object.values(worlds):[];
  return Math.max(1,level(state,'academy'),...list.map(w=>level(w,'academy')));
}
export function professionStatus(state,person) {
  const m=state.military?.people?.[personKey(person)];if(m?.rank)return m.rank;
  const p=educationRecord(state,person);return p?.profession==='professor'?'professor':p?.rounds?'graduate':'civilian';
}
export function educationWorkMultiplier(state,person,context={}) {
  const record=educationRecord(state,person),topic=context.topic||person?.productionRecipe||person?.workplace;
  const researchBonus=context.includeResearch===false?0:.05*integer(ensure(state).researchLevels[topic]);
  if(record?.profession==='professor')return .5*(1+researchBonus);
  if(record?.rounds)return highestAcademyLevel(state,context)*(1+.05*Math.max(0,record.rounds-1)+researchBonus);
  return 1+researchBonus;
}
export const educationHappiness=(state,person,now=state.worldTimeMs||0)=>positive(educationRecord(state,person)?.protectedUntil)>now?100:null;
export function educationBusy(state,person) {
  const key=personKey(person),e=ensure(state);
  return e.courses.some(c=>c.studentUid===key||c.teacherUid===key)||e.researches.some(r=>r.professorUids.includes(key));
}
export function canDelegateProfessor(state,person){
  const key=personKey(person),e=ensure(state);
  if(e.courses.some(c=>c.studentUid===key||c.teacherUid===key))return false;
  return e.researches.every(r=>!r.professorUids.includes(key)||r.professorUids.length>1);
}
export function releaseProfessorResearch(state,person){
  if(!canDelegateProfessor(state,person))return result(false,'Ostatni profesor musi pozostać przy badaniu. Najpierw anuluj badanie.');
  const key=personKey(person);for(const r of ensure(state).researches)r.professorUids=r.professorUids.filter(k=>k!==key);return result(true,'Profesor został oddelegowany.');
}
const idlePerson=p=>!!p&&!p.workplace&&!p.pendingRelease&&!(p.arrivalRemaining>EPS)&&!(p.returnRemaining>EPS)&&!p.visitGroup&&!p.visiting&&!(p.prayerRemaining>EPS);
const atAcademy=p=>!!p&&(!p.workplace||p.workplace==='academy')&&!p.pendingRelease&&!(p.arrivalRemaining>EPS)&&!(p.returnRemaining>EPS)&&!p.visitGroup;
const professor=(state,p)=>educationRecord(state,p)?.profession==='professor';
export function educationHousingAssignment(state) {
  const limit=3+level(state,'academy');if(!level(state,'academy'))return new Set();
  return new Set((state.residents||[]).filter(p=>professor(state,p)&&atAcademy(p)).sort((a,b)=>a.id-b.id).slice(0,limit).map(personKey));
}
export function educationTaxable(state,person) {
  const key=personKey(person);if(ensure(state).courses.some(c=>c.studentUid===key))return false;
  return professor(state,person)&&atAcademy(person)?true:null;
}
function trainingFactor(state,person,context) {
  if(!person)return 0;
  const coverage=state.provisions?.people?.[personKey(person)]?.coverage;
  const food=typeof context.feedingMultiplier==='function'?finite(context.feedingMultiplier(state,person),1):Number.isFinite(coverage)? .5+.5*Math.max(0,Math.min(1,coverage)):1;
  const housed=typeof context.hasHousing==='function'?context.hasHousing(state,person):true;
  return Math.max(0,Math.min(1,food))*(housed?1:.5);
}
export function townhallBuildSeconds(state,context={}) {
  if(typeof context.buildSeconds==='function') {
    const value=context.buildSeconds(state,'townhall',level(state,'townhall'));
    if(Number.isFinite(value)&&value>0)return value;
  }
  let seconds=45;const l=Math.max(1,level(state,'townhall'));
  if(l>=24)return 86400*.6;if(l===23)return (23*3600+55*60)*.6;
  for(let n=2;n<=l;n++)seconds*=n<=5?3:n<=8?2:n<=11?1.2:n<=14?1.1:n<=17?1.05:1.02;
  return seconds*.6;
}
function courseRate(state,course,context) {
  const teacher=find(state,course.teacherUid),student=find(state,course.studentUid);
  return teacher&&student&&professor(state,teacher)&&atAcademy(teacher)?Math.min(trainingFactor(state,teacher,context),trainingFactor(state,student,context)):0;
}
function islandFactor(state,context){return Math.max(1,integer(context.islandIndex||state.islandIndex||String(state.islandId||'island-1').match(/(\d+)$/)?.[1]||1));}
function researchRate(state,r,context) {
  return r.professorUids.reduce((sum,key)=>{const p=find(state,key);return sum+(p&&professor(state,p)&&atAcademy(p)?trainingFactor(state,p,context):0);},0)*islandFactor(state,context);
}
function syncRound(state) {
  const e=ensure(state),local=new Set((state.residents||[]).map(personKey));
  e.round.members=e.round.members.filter(key=>local.has(key)&&!state.military?.people?.[key]?.rank);
  if(!e.round.members.length)e.round.members=(state.residents||[]).filter(p=>!state.military?.people?.[personKey(p)]?.rank).map(personKey);
  return e.round;
}
export function researchQuote(state,topic,context={},route=null) {
  const e=ensure(state),l=level(state,'academy');let def=RESEARCH_CATALOG.find(d=>d.id===topic),next;
  if(!def&&typeof topic==='string'&&topic.startsWith('route:')&&route&&level(state,'warehouse')>=5){
    const valid=Object.values(route).every(x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,60}$/.test(x));
    if(!valid)return result(false,'Wskaż produkt oraz dwa budynki trasy.');
    def={id:topic,name:`Bezpośrednie dostawy: ${route.source} → ${route.target}`,kind:'route',firstCost:{stone:12,planks:4},minimumAcademy:1,effect:'Odblokowuje jeden kierunek i jeden produkt'};
  }
  if(!def||!l||level(state,'townhall')<4)return result(false,'To badanie nie jest jeszcze dostępne.');
  if(def.minimumTownhall&&level(state,'townhall')<def.minimumTownhall||Object.entries(def.minimumBuilding||{}).some(([id,v])=>level(state,id)<v))return result(false,'Nie spełniono wymagań budynków tego odkrycia.');
  if(def.kind!=='repeat'&&e.discoveries[topic])return result(false,'To odkrycie zostało już ukończone.');
  next=def.kind==='repeat'?integer(e.researchLevels[topic])+1:def.kind==='route'?Object.keys(e.discoveries).filter(k=>k.startsWith('route:')).length+1:1;
  if(def.kind==='repeat'&&next>l)return result(false,'Ten stopień badania wymaga wyższego poziomu Akademii.');
  const cost=Object.fromEntries(Object.entries(def.firstCost).map(([id,n])=>[id,Math.ceil(n*next*next)]));
  return result(true,'Warunki badania.',{topic,definition:def,level:def.kind==='repeat'?next:1,sequence:next,cost,work:RESEARCH_TIME_SECONDS[Math.min(19,next-1)],route});
}
export function educationAction(state,action,context={}) {
  const type=action?.type;if(!['educationAccelerate','educationStartRound','educationCancelCourse','educationResearchCancel','educationEnroll','educationReplaceTeacher','educationAppoint','educationReturnProfessor','educationResearchStart','educationResearchAssign'].includes(type))return null;
  const e=ensure(state),now=at(state,context),academyLevel=level(state,'academy');
  if(type==='educationAccelerate') {
    const quote=educationAccelerationQuote(state,action.id||action.courseId||action.researchId,context);if(!quote.ok)return quote;
    const job=e.courses.find(c=>c.id===quote.id)||e.researches.find(r=>r.id===quote.id);
    if(action.method==='ad'){const rate=e.courses.includes(job)?courseRate(state,job,context):researchRate(state,job,context);job.remainingWork=Math.max(0,job.remainingWork-quote.advertSeconds*rate);return result(true,'Reklama skróciła oczekiwanie.',{reducedSeconds:quote.advertSeconds});}
    if(action.method!=='coins')return result(false,'Wybierz monetę lub reklamę.');if(!spend(state,{coins:quote.cost},context))return result(false,'Brakuje monet.');job.remainingWork=0;advanceEducation(state,0,context);return result(true,'Zajęcie zakończone.',{cost:quote.cost});
  }
  if(type==='educationStartRound') {
    const round=syncRound(state);
    if(round.members.some(key=>integer(e.people[key]?.rounds)<round.number))return result(false,'Najpierw ukończ bieżącą rundę wszystkich jej uczestników.');
    round.number++;round.members=(state.residents||[]).filter(p=>!state.military?.people?.[personKey(p)]?.rank).map(personKey);
    return result(true,'Rozpoczęto kolejną rundę nauki.',{round:round.number});
  }
  if(type==='educationCancelCourse') {
    const c=e.courses.find(c=>c.id===action.courseId);if(!c)return result(false,'Nie znaleziono bieżącego kursu.');
    e.courses=e.courses.filter(x=>x!==c);return result(true,'Kurs przerwany. Postęp i opłata przepadły; wcześniejsze rundy pozostają.');
  }
  if(type==='educationResearchCancel') {
    const r=e.researches.find(r=>r.id===action.researchId);if(!r)return result(false,'Nie znaleziono badania.');
    e.researches=e.researches.filter(x=>x!==r);return result(true,'Badanie anulowane. Postęp i materiały przepadły; ukończone odkrycia pozostają.');
  }
  if(!academyLevel||level(state,'townhall')<4)return result(false,'Akademia jest dostępna od poziomu Ratusza 4.');
  if(type==='educationEnroll'||type==='educationReplaceTeacher') {
    const teacher=find(state,action.teacherUid),existing=type==='educationReplaceTeacher'?e.courses.find(c=>c.id===action.courseId):null;
    if(!teacher||!professor(state,teacher)||!atAcademy(teacher)||educationBusy(state,teacher)&&existing?.teacherUid!==personKey(teacher))return result(false,'Wybierz wolnego profesora obecnego w Akademii.');
    if(type==='educationReplaceTeacher') {
      if(!existing)return result(false,'Nie znaleziono kursu.');
      if(existing.studentUid===personKey(teacher))return result(false,'Profesor nie może uczyć samego siebie.');
      existing.teacherUid=personKey(teacher);existing.paused=false;return result(true,'Przydzielono zastępczego profesora. Postęp kursu zachowany.');
    }
    const student=find(state,action.studentUid),key=personKey(student);
    if(!student||student===teacher||!idlePerson(student)&&!(professor(state,student)&&atAcademy(student))||educationBusy(state,student))return result(false,'Wybierz wolnego mieszkańca w Domu.');
    if(state.military?.people?.[key]?.rank)return result(false,'Osoby na ścieżce wojskowej nie mogą studiować w Akademii.');
    const record=educationRecord(state,student,true),round=syncRound(state),next=record.rounds+1;
    if(next>round.number)return result(false,'Najpierw ukończ bieżącą rundę całej grupy.');
    const cost=10*academyLevel;if(!spend(state,{coins:cost},context))return result(false,'Brakuje monet na kurs.');
    const work=Math.max(1,townhallBuildSeconds(state,context)/3),c={id:`edu-${++e.sequence}`,studentUid:key,teacherUid:personKey(teacher),round:next,initialWork:work,remainingWork:work,cost,startedAt:now,paused:false};e.courses.push(c);
    return result(true,'Rozpoczęto kurs mieszkańca.',{courseId:c.id,cost,remainingSeconds:work/courseRate(state,c,context)});
  }
  if(type==='educationAppoint') {
    const person=find(state,action.personUid),p=educationRecord(state,person);
    if(!person||!idlePerson(person)||!p?.rounds||state.military?.people?.[personKey(person)]?.rank)return result(false,'Mianować można wolnego absolwenta przebywającego w Domu.');
    if(p.profession==='professor')return result(false,'Ta osoba jest już profesorem.');
    const count=(state.residents||[]).filter(p=>e.people[personKey(p)]?.profession==='professor').length;
    if(count>=3+academyLevel)return result(false,'Nie ma wolnego stanowiska profesorskiego.');
    if(!spend(state,{professorRobes:1},context))return result(false,'Potrzebujesz jednej szaty profesorskiej.');
    p.profession='professor';p.appointedAt=now;state.housingRevision=(state.housingRevision||0)+1;return result(true,'Mianowano nowego profesora.');
  }
  if(type==='educationReturnProfessor') {
    const person=find(state,action.personUid);if(!person||!professor(state,person))return result(false,'Nie znaleziono profesora.');
    if(educationBusy(state,person))return result(false,'Najpierw zakończ lub anuluj zajęcie tego profesora.');
    if(typeof context.recallPerson==='function')return context.recallPerson(state,person,'academy');
    person.workplace=null;person.arrivalRemaining=0;person.returnRemaining=0;return result(true,'Profesor wrócił do Akademii.');
  }
  if(type==='educationResearchStart'||type==='educationResearchAssign') {
    const existing=type==='educationResearchAssign'?e.researches.find(r=>r.id===action.researchId):null;
    if(type==='educationResearchAssign'&&!existing)return result(false,'Nie znaleziono badania.');
    const selected=ids(action.professorUids||action.researcherUids),people=selected.map(key=>find(state,key));
    if(!selected.length)return result(false,'Każde badanie musi mieć co najmniej jednego profesora.');
    if(people.some(p=>!p||!professor(state,p)||!atAcademy(p)||educationBusy(state,p)&&!existing?.professorUids.includes(personKey(p))))return result(false,'Wybierz wolnych profesorów obecnych w Akademii.');
    if(existing){existing.professorUids=selected;existing.paused=false;return result(true,'Zmieniono obsadę badania; materiały i postęp zachowane.');}
    if(e.researches.some(r=>r.topic===action.topic))return result(false,'To badanie już trwa.');
    const quote=researchQuote(state,action.topic,context,action.route);if(!quote.ok)return quote;
    if(!spend(state,quote.cost,context))return result(false,'Brakuje dostępnych materiałów na badanie.');
    const r={id:`research-${++e.sequence}`,topic:action.topic,level:quote.level,initialWork:quote.work,remainingWork:quote.work,cost:quote.cost,professorUids:selected,startedAt:now,paused:false,...(quote.route?{route:quote.route}:{})};e.researches.push(r);
    return result(true,'Rozpoczęto badanie.',{researchId:r.id,remainingSeconds:quote.work/researchRate(state,r,context),devBalanceProposal:quote.definition.devBalanceProposal===true});
  }
  return null;
}
export function advanceEducation(state,elapsed,context={}) {
  const e=ensure(state),seconds=positive(elapsed),end=finite(context.endAt,at(state,context)+seconds*1000);
  syncRound(state);
  for(const c of [...e.courses]) {
    const student=find(state,c.studentUid);
    if(!student){e.courses=e.courses.filter(x=>x!==c);continue;}
    const rate=courseRate(state,c,context),completedAt=Math.min(end,at(state,context)+(rate>0?c.remainingWork/rate:seconds)*1000);c.paused=rate<=0;c.remainingWork=Math.max(0,c.remainingWork-seconds*rate);
    if(c.remainingWork<=EPS&&rate>0){
      const p=educationRecord(state,student,true);p.rounds=Math.max(p.rounds,c.round);p.protectedUntil=completedAt+7*DAY*1000;student.happiness=100;
      e.courses=e.courses.filter(x=>x!==c);notify(state,{...context,now:completedAt},'Kurs ukończony',`${student.name||student.nickname||'Mieszkaniec'} otrzymuje 100 punktów szczęścia na siedem dni i trwałą premię pracy.`);
    }
  }
  for(const r of [...e.researches]) {
    r.professorUids=r.professorUids.filter(key=>{const p=find(state,key);return p&&professor(state,p);});
    const rate=researchRate(state,r,context);r.paused=rate<=0;r.remainingWork=Math.max(0,r.remainingWork-seconds*rate);
    if(r.remainingWork<=EPS&&rate>0){
      const def=RESEARCH_CATALOG.find(x=>x.id===r.topic);
      if(def?.kind==='repeat')e.researchLevels[r.topic]=Math.max(integer(e.researchLevels[r.topic]),r.level);else e.discoveries[r.topic]=true;
      if(r.route){e.discoveries[r.topic]=true;e.routes ||= {};e.routes[r.topic]={...r.route};}
      e.researches=e.researches.filter(x=>x!==r);notify(state,{...context,now:end},'Odkrycie ukończone',def?.name||'Bezpośrednia trasa jest gotowa.');
    }
  }
}
export function nextEducationEvent(state,context={}) {
  const e=ensure(state),now=at(state,context);let next=Infinity;
  for(const c of e.courses){const rate=courseRate(state,c,context);if(rate>0)next=Math.min(next,Math.max(EPS,c.remainingWork/rate));}
  for(const r of e.researches){const rate=researchRate(state,r,context);if(rate>0)next=Math.min(next,Math.max(EPS,r.remainingWork/rate));}
  for(const p of Object.values(e.people))if(p.protectedUntil>now)next=Math.min(next,(p.protectedUntil-now)/1000);
  return next;
}
export function educationStatus(state,context={}) {
  const e=ensure(state),now=at(state,context),round=syncRound(state),professors=(state.residents||[]).filter(p=>professor(state,p));
  const view=p=>({personUid:personKey(p),id:p.id,name:p.name||p.nickname||`Mieszkaniec ${p.id}`,rounds:integer(educationRecord(state,p)?.rounds),busy:educationBusy(state,p),present:atAcademy(p),protectedUntil:positive(educationRecord(state,p)?.protectedUntil)});
  return {unlocked:level(state,'townhall')>=4&&level(state,'academy')>0,level:level(state,'academy'),professorLimit:3+level(state,'academy'),professorBeds:3+level(state,'academy'),professors:professors.map(view),candidates:(state.residents||[]).filter(p=>idlePerson(p)&&!educationBusy(state,p)&&!state.military?.people?.[personKey(p)]?.rank).map(view),courses:e.courses.map(c=>({...c,paused:courseRate(state,c,context)<=0,remainingSeconds:courseRate(state,c,context)>0?c.remainingWork/courseRate(state,c,context):null})),researches:e.researches.map(r=>({...r,paused:researchRate(state,r,context)<=0,remainingSeconds:researchRate(state,r,context)>0?r.remainingWork/researchRate(state,r,context):null})),researchCatalog:RESEARCH_CATALOG.map(d=>({...d,quote:researchQuote(state,d.id,context)})),researchLevels:{...e.researchLevels},discoveries:{...e.discoveries},round:{number:round.number,members:[...round.members],remaining:round.members.filter(k=>integer(e.people[k]?.rounds)<round.number).length},now};
}
export function addSpecialistResident(state,details={},context={}) {
  if(typeof context.grantPerson==='function'){
    const before=(state.residents||[]).length,r=context.grantPerson(state,details);if(r&&typeof r==='object')return r;
    if((state.residents||[]).length>before)return state.residents.at(-1);
  }
  state.residents ||= [];const id=Math.max(integer(state.residentSequence),...state.residents.map(p=>integer(p.id)),0)+1;state.residentSequence=id;
  const p={id,personUid:`${state.islandId||'island-1'}:resident-${id}`,name:details.name||'',happiness:100,hungerSeconds:0,fedRecoverySeconds:0,unemployedSeconds:0,newbornRemaining:0,workplace:null,arrivalRemaining:0,returnRemaining:0,returnFrom:null,blockedSeconds:0,visitGroup:null,prayerRemaining:0,prayerVersion:1,prayerDuration:0,prayerRewardPending:false,prayerBonusRemaining:0,visitHappinessRemaining:0,visitCooldownRemaining:0,pendingRelease:false,forcedHappinessSnapshot:null,preVisitHappiness:null,globalLighthouseSnapshot:null};
  state.residents.push(p);state.population=state.residents.length;return p;
}
export function ensureFoundingProfessors(state,context={}) {
  const e=ensure(state);if(e.foundingGranted||level(state,'townhall')<4||!level(state,'academy')||state.islandRole==='daughter'||state.islandId&&state.islandId!=='island-1')return [];
  e.foundingGranted=true;const granted=[];
  for(let n=0;n<4;n++){const p=addSpecialistResident(state,{name:`Profesor ${n+1}`},context);e.people[personKey(p)]={profession:'professor',rounds:1,protectedUntil:at(state,context)+7*DAY*1000,rescueGift:false,appointedAt:at(state,context)};granted.push(p);}
  return granted;
}

// Persistent person records follow their UID across transport; course progress stays on its island.
export function exportPersonEducation(state,person){const r=educationRecord(state,person);return r?copy(r):null;}
export function importPersonEducation(state,person,record){if(record&&object(record))ensure(state).people[personKey(person)]=copy(record);return educationRecord(state,person);}
export function detachPersonEducation(state,person){const e=ensure(state),key=personKey(person),record=exportPersonEducation(state,person);delete e.people[key];e.round.members=e.round.members.filter(k=>k!==key);return record;}
export function canHandOverProfessor(state,person){const p=educationRecord(state,person);return !!p&&p.profession==='professor'&&!p.rescueGift&&!educationBusy(state,person);}
export function educationAccelerationQuote(state,id,context={}){const e=ensure(state),course=e.courses.find(c=>c.id===id),research=e.researches.find(r=>r.id===id),job=course||research;if(!job)return result(false,'Nie znaleziono zajęcia.');const rate=course?courseRate(state,job,context):researchRate(state,job,context);return result(rate>0,rate>0?'Warunki przyspieszenia.':'Najpierw przydziel obecną kadrę.',{id,remainingSeconds:rate>0?job.remainingWork/rate:null,cost:Math.max(1,Math.ceil((research&&rate>0?job.remainingWork/rate:job.remainingWork)/60)),advertSeconds:rate>0?Math.min(600,job.remainingWork/rate*.1):0});}
