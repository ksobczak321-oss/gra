import { DEVELOPMENT_NAMES, GOODS_NAMES, developmentText, developmentBuildingCopy } from './harborlight-v1-development-copy.js';

// Reuse the previously unused buildings painted into the approved island.
// Coordinates refer to its original 1672 × 941 canvas; no new artwork overlays it.
export const DEVELOPMENT_BUILDINGS = Object.freeze({
  bakery:{name:'Piekarnia',x:651,y:289,width:107,height:80,footprint:'polygon(7% 41%,28% 13%,76% 3%,96% 48%,87% 84%,13% 85%)'},
  dairy:{name:'Mleczarnia',x:447,y:300,width:96,height:81,footprint:'polygon(4% 46%,27% 14%,81% 10%,98% 47%,90% 93%,13% 100%)'},
  slaughterhouse:{name:'Rzeźnia',x:351,y:260,width:52,height:46,footprint:'polygon(9% 37%,44% 9%,89% 29%,96% 81%,29% 100%,8% 78%)'},
  fisher:{name:'Rybak',x:1197,y:383,width:91,height:86,footprint:'polygon(8% 42%,36% 10%,78% 20%,96% 53%,85% 93%,16% 98%)'},
  leatherworks:{name:'Zakład skórzany',x:498,y:475,width:60,height:60,footprint:'polygon(8% 42%,34% 10%,79% 22%,97% 59%,81% 96%,30% 93%)'},
  academy:{name:'Akademia',x:439,y:506,width:98,height:79,footprint:'polygon(3% 37%,20% 8%,53% 2%,91% 43%,90% 88%,34% 98%,8% 78%)'},
  barracks:{name:'Koszary',x:1295,y:162,width:87,height:92,footprint:'polygon(9% 38%,35% 6%,72% 16%,96% 44%,88% 91%,18% 100%)'}
});
const RECIPE_LABELS={farmGrain:'Zboże',farmVegetables:'Warzywa',farmLivestock:'Żywiec',farmMilk:'Surowe mleko',farmCheese:'Ser',wood:'Drewno',stone:'Kamień',flour:'Mąka',planks:'Deski',bread:'Chleb',cake:'Ciasto',pasteurizedMilk:'Mleko pasteryzowane',meat:'Mięso',leather:'Skóry',fish:'Ryby',civilianClothes:'Ubrania cywilne',militaryClothes:'Stroje wojskowe',professorRobes:'Szaty profesorskie'};
const FALLBACK_RECIPES={farm:['farmGrain','farmVegetables','farmLivestock','farmMilk','farmCheese'],windmill:['flour'],bakery:['bread','cake'],dairy:['pasteurizedMilk'],slaughterhouse:['meat','leather'],fisher:['fish'],leatherworks:['civilianClothes','militaryClothes','professorRobes'],lumber:['wood'],quarry:['stone'],sawmill:['planks']};
const RECIPE_INPUTS={flour:{grain:4},bread:{flour:4},cake:{flour:4,rawMilk:2},pasteurizedMilk:{rawMilk:4},meat:{livestock:2},leather:{livestock:2},farmCheese:{sourMilk:4},civilianClothes:{leather:4},militaryClothes:{leather:8},professorRobes:{leather:8},planks:{wood:2}};
const FOOD_IDS=['grain','vegetables','rawMilk','sourMilk','fish','flour','pasteurizedMilk','meat','bread','cake','cheese','food'];
const SATIETY={grain:1,vegetables:1,rawMilk:1,sourMilk:.5,fish:1,flour:6,pasteurizedMilk:6,meat:6,bread:36,cake:48,cheese:12,food:6};
const num=value=>Number.isFinite(Number(value))?Number(value):0;
const whole=value=>Math.max(0,Math.floor(num(value)));
const label=id=>GOODS_NAMES[id]||RECIPE_LABELS[id]||DEVELOPMENT_NAMES[id]||id;
const uid=person=>String(person?.personUid??person?.uid??person?.id??'');
const name=person=>person?.name||`Mieszkaniec ${person?.id??''}`;
const format=value=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(num(value));
const duration=seconds=>{const n=Math.max(0,Math.ceil(num(seconds)));return n>=3600?`${Math.floor(n/3600)} godz. ${Math.ceil(n%3600/60)} min`:`${Math.ceil(n/60)} min`;};
function node(tag,attrs={},...children){const e=document.createElement(tag);for(const [key,value] of Object.entries(attrs)){if(value==null)continue;if(key==='class')e.className=value;else if(key==='text')e.textContent=value;else if(key.startsWith('on'))e.addEventListener(key.slice(2).toLowerCase(),value);else if(key in e&&!key.startsWith('aria')&&!key.startsWith('data'))e[key]=value;else e.setAttribute(key,String(value));}for(const child of children.flat(Infinity)){if(child==null)continue;e.append(child instanceof Node?child:document.createTextNode(String(child)));}return e;}
const p=(text,cls='')=>node('p',{class:cls,text});
const btn=(text,action,attrs={})=>node('button',{type:'button',class:'v32-button',onClick:action,...attrs},text);
function section(title,...children){return node('section',{class:'v32-section'},node('h3',{text:title}),...children);}
function field(title,input){const item=node('label',{class:'v32-field'},node('span',{text:title}),input);return item;}
function integerInput(value=0,max,attrs={}){return node('input',{type:'number',min:0,step:1,inputMode:'numeric',value:whole(value),...(max==null?{}:{max:whole(max)}),...attrs});}
function selectPeople(people,placeholder='Wybierz mieszkańca'){return node('select',{},node('option',{value:'',text:placeholder}),...people.map(person=>node('option',{value:uid(person),text:name(person)})));}
function stateOf(options){return options.getState?.()||options.state||{};}
function api(options,key){return options.context?.[key]||options[key]||{};}
function call(options,key,method,...args){const handler=api(options,key)[method]||options.context?.[method];return typeof handler==='function'?handler(...args):undefined;}
function announce(options,message,ok=true){if(options.message){options.message.textContent=message||'';options.message.dataset.kind=ok?'success':'error';}options.onFeedback?.(message,ok);}
async function act(options,type,payload={}){try{const result=await options.onAction?.({type,...payload});if(result?.ok===false){announce(options,result.message||'Nie można teraz wykonać tej czynności.',false);return result;}announce(options,result?.message||'Zapisano.');options.onRefresh?.();return result;}catch(error){announce(options,error?.message||'Nie udało się wykonać tej czynności.',false);return {ok:false};}}
function submit(text,handler){return node('button',{type:'submit',class:'v32-button v32-primary',text,onClick:event=>{if(!event.currentTarget.form){event.preventDefault();handler(event);}}});}
function form(handler,...children){return node('form',{class:'v32-form',onSubmit:event=>{event.preventDefault();if(event.currentTarget.reportValidity())handler(event);}},...children);}

/** The same native building, cropped with CSS for its dock and panel thumbnail. */
export function developmentBuildingArt(id){
  const config=DEVELOPMENT_BUILDINGS[id]||DEVELOPMENT_BUILDINGS.bakery;
  const size=Math.max(config.width,config.height)+12;
  const x=config.x+(config.width-size)/2,y=config.y+(config.height-size)/2;
  const wrapper=node('span',{class:'v32-building-art v32-building-art--native','aria-hidden':'true','data-native-building-art':id});
  wrapper.style.backgroundSize=`${1672/size*100}% ${941/size*100}%`;
  wrapper.style.backgroundPosition=`${x/(1672-size)*100}% ${y/(941-size)*100}%`;
  return wrapper;
}

export function renderProductionControls(building,options={}){
  const state=stateOf(options),b=state.buildings?.[building]||{};
  const available=call(options,'provisions','availableRecipes',state,building);
  const catalog=api(options,'provisions').RECIPE_CATALOG||{};
  const ids=Array.isArray(available)?available.map(item=>typeof item==='string'?item:item.id||item.recipeId):FALLBACK_RECIPES[building]||[];
  const recipes=ids.filter(id=>id&&!(id==='farmCheese'&&!(num(b.level)>=6&&state.education?.discoveries?.cheese))&&!(id==='professorRobes'&&!num(state.buildings?.academy?.level))&&!(building==='farm'&&num(b.level)<2&&['farmLivestock','farmMilk'].includes(id)));
  if(!recipes.length)return null;
  const assignments=call(options,'provisions','productionAssignments',state,building)||state.provisions?.assignments?.[building]||{};
  const assigned=Array.isArray(assignments)?Object.fromEntries(assignments.map(item=>[item.recipeId||item.id,item.workers])):assignments;
  const capacity=call(options,'provisions','crewCapacity',state,building);
  const crewLimit=typeof capacity==='object'?capacity.total??capacity.capacity:capacity;
  const title=section('Produkty i pracownicy',p(`Załoga: ${whole(b.workers)}${crewLimit==null?'':` / ${whole(crewLimit)}`}. Każdą osobę przydziel do jednego produktu.`),p('Przed zmianą produktu zmniejsz dotychczasowy przydział, a następnie przydziel wolne osoby do nowego produktu.','v32-muted'));
  const shownGoods=new Set();
  for(const recipeId of recipes){
    const recipe=Array.isArray(catalog)?catalog.find(r=>(r.id||r.recipeId)===recipeId)||{}:catalog[recipeId]||{};
    const inputs=recipe.inputs||recipe.input||RECIPE_INPUTS[recipeId]||{};
    const output=recipe.output||recipe.outputs;
    for(const id of typeof inputs==='string'?[inputs]:Object.keys(inputs))shownGoods.add(id);
    for(const id of typeof output==='string'?[output]:Object.keys(output||{}))shownGoods.add(id);
    const inputText=Object.entries(inputs).map(([id,qty])=>`${format(qty)} ${label(id)}`).join(' + ');
    const outText=output&&typeof output==='object'?Object.entries(output).map(([id,qty])=>`${format(qty)} ${label(id)}`).join(', '):RECIPE_LABELS[recipeId]||recipe.name||recipeId;
    const input=integerInput(assigned[recipeId]?.workers??assigned[recipeId]??0,b.workers,{'data-v32-workers':recipeId,'aria-label':`Pracownicy: ${RECIPE_LABELS[recipeId]||recipeId}`});
    title.append(form(()=>act(options,'provisionsSetWorkers',{building,recipeId,workers:whole(input.value)}),node('div',{class:'v32-recipe'},node('div',{},node('strong',{text:RECIPE_LABELS[recipeId]||recipe.name||recipeId}),p(inputText?`${inputText} → ${outText}`:'Pozyskiwanie surowca','v32-muted')),field('Osoby',input),submit('Przydziel'))));
  }
  const local=call(options,'provisions','localStorageStatus',state,building);
  if(local){const goods=local.stock||local.goods||local.materials||local.products||{};title.append(p(`Magazyn lokalny: ${format(local.used??Object.values(goods).reduce((sum,v)=>sum+num(v),0))} / ${format(local.totalCapacity??local.capacity??local.total??300*num(b.level))}`,'v32-muted'));if(Object.keys(goods).length)title.append(p(Object.entries(goods).filter(([id,qty])=>shownGoods.has(id)||num(qty?.quantity??qty)>0).map(([id,qty])=>`${label(id)}: ${format(qty?.quantity??qty)}`).join(' · '),'v32-muted'));}
  return title;
}

export function renderFoodControls(options={}){
  const state=stateOf(options),settings=state.provisions?.foodSettings||{},reserve=call(options,'provisions','foodReservePlan',state)||{};
  const ids=[...new Set([...(settings.priorities||[]),...FOOD_IDS])].filter(id=>id!=='food'||num(state.resources?.food)>0);
  const controls=new Map();
  const table=node('div',{class:'v32-food-list','data-v32-food-list':''});
  const root=section('Wyżywienie mieszkańców',p('Ustaw kolejność wydawania jedzenia. Limit oznacza jednorazową partię; puste pole pozwala wydawać bez limitu. Chroniona rezerwa obejmuje najtańsze wyżywienie na godzinę i wymaganą różnorodność.'));
  const rebuild=()=>{table.replaceChildren();ids.forEach((id,index)=>{let c=controls.get(id);if(!c){c={enabled:node('input',{type:'checkbox',checked:settings.enabled?.[id]!==false,'aria-label':`Wydawaj: ${label(id)}`}),limit:node('input',{type:'number',min:0,step:'any',inputMode:'decimal',value:settings.limits?.[id]??'',placeholder:'Bez limitu','aria-label':`Jednorazowy limit: ${label(id)}`})};controls.set(id,c);}const protectedQty=reserve.materials?.[id]??reserve.reserved?.[id]??reserve.reserve?.[id]??0;table.append(node('div',{class:'v32-food-row','data-v32-food':id},field(label(id),c.enabled),node('span',{class:'v32-muted',text:`${format(SATIETY[id])} pkt · rezerwa ${format(protectedQty)}`}),c.limit,node('div',{class:'v32-order'},btn('↑',()=>{[ids[index-1],ids[index]]=[ids[index],ids[index-1]];rebuild();},{disabled:index===0,'aria-label':`Wcześniej: ${label(id)}`}),btn('↓',()=>{[ids[index+1],ids[index]]=[ids[index],ids[index+1]];rebuild();},{disabled:index===ids.length-1,'aria-label':`Później: ${label(id)}`}))));});};
  rebuild();root.append(form(()=>act(options,'provisionsFoodSettings',{priorities:ids,enabled:Object.fromEntries([...controls].map(([id,c])=>[id,c.enabled.checked])),limits:Object.fromEntries([...controls].map(([id,c])=>[id,c.limit.value===''?null:Math.max(0,num(c.limit.value))]))}),table,submit('Zapisz wyżywienie')));
  root.append(p('Jeśli to jedyne dostępne jedzenie, mieszkańcy mogą przekroczyć limit ilości. Pominięcie wyłączonego rodzaju jedzenia podlega osobnej zasadzie awaryjnej.','v32-muted'));
  return root;
}

export function renderConstructionFoodMix(building,options={}){
  const state=stateOf(options),quote=options.context?.constructionQuote?.(building)||options.quote||{};
  const foodUnits=quote.foodUnits??options.foodUnits;
  if(foodUnits==null&&!quote.satietyRequired)return null;
  const defaultQuote=call(options,'provisions','quoteConstructionFood',state,foodUnits)||quote;
  const mix=defaultQuote.materials||defaultQuote.foodMix||{};
  const inputs=new Map(),required=num(quote.satietyRequired)||num(foodUnits)*6;
  const summary=p('','v32-status');
  const body=section('Jedzenie na budowę',p(`Potrzeba ${format(required)} punktów sytości. Propozycja korzysta z najtańszych zapasów ponad chronioną rezerwę. Możesz ją zmienić przed zatwierdzeniem.`));
  const update=()=>{const provided=[...inputs].reduce((sum,[id,input])=>sum+whole(input.value)*(SATIETY[id]||0),0);summary.textContent=`Wybrane jedzenie: ${format(provided)} / ${format(required)} pkt sytości`;summary.dataset.kind=provided>=required?'success':'error';};
  const grid=node('div',{class:'v32-mix-grid'});
  for(const id of FOOD_IDS.filter(id=>id!=='food'||num(state.resources?.food)>0)){const input=integerInput(mix[id]||0,undefined,{'data-v32-build-food':id,onInput:update});inputs.set(id,input);grid.append(field(`${label(id)} (${format(SATIETY[id])} pkt)`,input));}
  body.append(form(async()=>{const selected=Object.fromEntries([...inputs].filter(([,input])=>whole(input.value)>0).map(([id,input])=>[id,whole(input.value)]));if(options.context?.constructionSubmit){const result=await options.context.constructionSubmit(building,selected);if(result?.ok===false)announce(options,result.message,false);else options.onRefresh?.();}else await act(options,options.context?.constructionActionType||'upgrade',{building,id:building,foodMix:selected,mix:selected});},grid,summary,submit('Zatwierdź rozbudowę')));update();return body;
}

export function renderTransportControls(building,options={}){
  const status=options.context?.transportStatus?.(building);if(!status)return null;
  const routes=status.routes||[];
  if(status.direct){const root=section('Dostawy bezpośrednie',p('Każda trasa wymaga osobnego odkrycia w Akademii i Magazynu na poziomie 5. Do jednej trasy przydzielisz najwyżej połowę tragarzy; co najmniej jeden pozostaje do zwykłych dostaw.'));for(const route of routes){const workers=integerInput(route.workers,Math.floor(num(stateOf(options).buildings?.warehouse?.workers)/2));root.append(form(()=>act(options,'developmentRoute',{routeId:route.id,workers:whole(workers.value)}),field(`${DEVELOPMENT_NAMES[route.source]||route.source} → ${DEVELOPMENT_NAMES[route.target]||route.target}: ${label(route.product)}`,workers),submit('Zapisz trasę')));}return root;}
  const root=section('Dostawy bezpośrednie',p('Wyznacz trasę dla konkretnego produktu. Trasa korzysta z tragarzy przypisanych przez Magazyn; brak wolnego tragarza wstrzymuje dostawę.'));
  for(const route of routes){root.append(node('div',{class:'v32-list-row'},node('span',{text:`${label(route.resource||route.good)} → ${DEVELOPMENT_NAMES[route.destination]||route.destination} · ${route.workers||0} tragarzy`}),btn('Usuń',()=>act(options,options.context?.transportRemoveActionType||'v32TransportRouteRemove',{building,routeId:route.id}))));}
  const destinations=status.destinations||[],products=status.products||[];
  if(destinations.length&&products.length){const product=node('select',{},...products.map(item=>node('option',{value:item.id||item,text:label(item.id||item)})));const destination=node('select',{},...destinations.map(item=>node('option',{value:item.id||item,text:DEVELOPMENT_NAMES[item.id||item]||item.name||item})));const workers=integerInput(1,status.freeCarriers);root.append(form(()=>act(options,options.context?.transportActionType||'v32TransportRoute',{building,resource:product.value,destination:destination.value,workers:whole(workers.value)}),field('Produkt',product),field('Odbiorca',destination),field('Tragarze',workers),submit('Dodaj trasę')));}
  if(!routes.length&&!destinations.length)root.append(p('Brak dostępnej trasy. Najpierw odblokuj budynek odbierający dany surowiec.','v32-muted'));
  return root;
}

function educationState(options){const state=stateOf(options);return call(options,'education','educationStatus',state,options.context)||{unlocked:num(state.buildings?.townhall?.level)>=4,level:num(state.buildings?.academy?.level),professorLimit:3+num(state.buildings?.academy?.level),professors:[],candidates:[],courses:state.education?.courses||[],researches:state.education?.researches||[],researchCatalog:[],round:state.education?.round||{number:1}};}
function accelerationControls(options,kind,id){
  const quote=call(options,kind,kind==='education'?'educationAccelerationQuote':'militaryAccelerationQuote',stateOf(options),id,options.context);
  if(!quote?.ok)return null;
  return node('div',{class:'v32-form'},btn(`Ukończ za ${format(quote.cost)} monet`,()=>act(options,`${kind}Accelerate`,{id,method:'coins'})),options.context?.requestRewardedAd?btn(`Reklama: krócej o ${duration(quote.advertSeconds)}`,()=>options.context.requestRewardedAd({type:`${kind}Accelerate`,id,method:'ad'})):null);
}
export function renderAcademyControls(options={}){
  const state=stateOf(options),s=educationState(options),root=node('div',{'data-v32-academy':''});
  if(!s.unlocked){root.append(p('Akademia jest dostępna od 4. poziomu Ratusza.'));return root;}
  root.append(section('Profesorowie i nauka',p(`Profesorowie: ${s.professors?.length||0} / ${s.professorLimit??3+num(s.level)}. Runda nauki: ${s.round?.number||1}. Każdy profesor uczy jedną osobę albo prowadzi badania.`)));
  const professors=s.professors||[],candidates=(s.candidates||[]).filter(person=>!(s.professors||[]).some(professor=>uid(person)===uid(professor)));
  const teacher=selectPeople(professors.filter(person=>!person.busy&&person.present!==false),'Wybierz wolnego profesora'),student=selectPeople(candidates,'Wybierz adepta');teacher.required=true;student.required=true;
  root.append(section('Rozpocznij naukę',p(`Opłata: ${format(10*num(s.level))} monet. Uczestnik musi być wolnym cywilem zakwaterowanym w Domu.`),form(()=>act(options,'educationEnroll',{studentUid:student.value,teacherUid:teacher.value}),field('Adept',student),field('Profesor',teacher),submit('Rozpocznij naukę'))));
  const courseList=section('Trwające zajęcia');
  if(!s.courses?.length)courseList.append(p('Nie trwa żaden kurs.','v32-muted'));
  for(const course of s.courses||[]){const title=course.studentName||name((state.residents||[]).find(person=>uid(person)===String(course.studentUid)));const item=node('article',{class:'v32-card'},node('strong',{text:title}),p(course.paused?'Nauka wstrzymana. Opłata i postęp są zachowane.':`Pozostało około ${duration(course.remainingSeconds??course.remainingWork)}`));if(course.paused){const replacement=selectPeople(professors.filter(person=>!person.busy&&person.present!==false),'Wybierz nowego profesora');replacement.required=true;item.append(form(()=>act(options,'educationReplaceTeacher',{courseId:course.id,teacherUid:replacement.value}),field('Profesor',replacement),submit('Wznów naukę')));}const confirmation=node('input',{type:'checkbox',required:true});item.append(form(()=>act(options,'educationCancelCourse',{courseId:course.id}),field('Potwierdzam utratę opłaty i postępu',confirmation),submit('Przerwij kurs')));const speed=accelerationControls(options,'education',course.id);if(speed)item.append(speed);courseList.append(item);}
  root.append(courseList);
  const graduates=candidates.filter(person=>person.graduate||person.rounds>0||state.education?.people?.[uid(person)]?.rounds>0),appointment=selectPeople(graduates,'Wybierz absolwenta');appointment.required=true;
  root.append(section('Mianowanie profesora',p('Mianowanie zużywa jedną szatę profesorską. Profesor zajmuje miejsce i łóżko Akademii. Poza Akademią pracuje z połową wydajności niewykształconego mieszkańca.'),form(()=>act(options,'educationAppoint',{personUid:appointment.value}),field('Absolwent',appointment),submit('Mianuj profesora'))));
  for(const professor of professors){root.append(node('div',{class:'v32-list-row'},node('span',{text:`${name(professor)}${professor.present===false?' · poza Akademią':professor.busy?' · zajęty':' · wolny'}`}),btn('Powrót do Akademii',()=>act(options,'educationReturnProfessor',{personUid:uid(professor)}),{disabled:Boolean(professor.busy)||professor.present!==false})));}
  root.append(renderResearchControls(options,s));
  root.append(section('Kolejna runda',p('Kolejna runda obejmuje mieszkańców aktualnie należących do wyspy. Przyrost wydajności z ukończonych rund pozostaje przy danej osobie.'),btn('Rozpocznij następną rundę',()=>act(options,'educationStartRound'),{'data-v32-next-round':''})));
  return root;
}

export function renderResearchControls(options={},provided){
  const s=provided||educationState(options),root=section('Badania i odkrycia');
  const catalog=Array.isArray(s.researchCatalog)?s.researchCatalog:Object.entries(s.researchCatalog||{}).map(([id,item])=>({id,...item}));
  const topic=node('select',{},node('option',{value:'',text:'Wybierz badanie'}),...catalog.map(item=>node('option',{value:item.id||item.topic,text:item.name||item.title||item.id||item.topic,disabled:item.available===false||item.quote?.ok===false})));topic.required=true;
  const selectProfessors=(selected=[])=>{const checks=new Map(),box=node('fieldset',{class:'v32-check-list'},node('legend',{text:'Profesorowie'}));for(const professor of s.professors||[]){const key=uid(professor),checkbox=node('input',{type:'checkbox',value:key,checked:selected.includes(key),disabled:professor.present===false||Boolean(professor.busy&&!selected.includes(key))});checks.set(key,checkbox);box.append(field(name(professor),checkbox));}return {element:box,values:()=>[...checks].filter(([,c])=>c.checked).map(([id])=>id)};};
  const staff=selectProfessors(),quoteInfo=p('Wybierz temat, aby zobaczyć koszt i bazowy czas.','v32-status');topic.addEventListener('change',()=>{const selected=catalog.find(item=>(item.id||item.topic)===topic.value),quote=selected?.quote;quoteInfo.textContent=quote?.ok?`${selected.effect||''} Koszt: ${Object.entries(quote.cost||{}).map(([id,n])=>`${format(n)} ${label(id)}`).join(', ')}. Bazowy czas jednego profesora: ${duration(quote.work)}.`:quote?.message||'Wybierz temat, aby zobaczyć koszt i bazowy czas.';});root.append(form(()=>{if(!staff.values().length){announce(options,'Wybierz co najmniej jednego profesora.',false);return;}act(options,'educationResearchStart',{topic:topic.value,professorUids:staff.values()});},field('Temat',topic),quoteInfo,staff.element,submit('Rozpocznij badanie')));
  for(const research of s.researches||[]){const speed=accelerationControls(options,'education',research.id);if(speed)root.append(speed);const staffEdit=selectProfessors(research.professorUids||[]);root.append(node('article',{class:'v32-card'},node('strong',{text:research.name||catalog.find(item=>(item.id||item.topic)===research.topic)?.name||research.topic}),p(`${research.paused?'Badanie wstrzymane. ':''}Pozostało około ${duration(research.remainingSeconds??research.remainingWork)}. Koszt opłacony: ${typeof research.cost==='object'?Object.entries(research.cost).map(([id,n])=>`${format(n)} ${label(id)}`).join(', '):`${format(research.cost)} monet`}.`),form(()=>act(options,'educationResearchAssign',{researchId:research.id,professorUids:staffEdit.values()}),staffEdit.element,submit('Zmień zespół')),btn('Anuluj badanie',()=>{const confirm=node('input',{type:'checkbox',required:true});const panel=node('div',{class:'v32-confirm'},p('Anulowanie usuwa postęp i opłatę.'),form(()=>act(options,'educationResearchCancel',{researchId:research.id}),field('Potwierdzam anulowanie',confirm),submit('Potwierdź anulowanie')));root.append(panel);})));}
  if(num(stateOf(options).buildings?.warehouse?.level)>=5){
    const catalog=api(options,'provisions').RECIPE_CATALOG||{},routes=[];
    for(const [sourceId,source]of Object.entries(catalog))for(const target of Object.values(catalog))for(const product of Object.keys(source.outputs||{}))if(source.building!==target.building&&target.inputs?.[product]&&num(stateOf(options).buildings?.[source.building]?.level)>0&&num(stateOf(options).buildings?.[target.building]?.level)>0){const id=`route:${source.building}:${target.building}:${product}`;if(!routes.some(route=>route.id===id)&&!s.discoveries?.[id])routes.push({id,source:source.building,target:target.building,product});}
    if(routes.length){const select=node('select',{},...routes.map(route=>node('option',{value:route.id,text:`${DEVELOPMENT_NAMES[route.source]||route.source} → ${DEVELOPMENT_NAMES[route.target]||route.target}: ${label(route.product)}`}))),teachers=selectProfessors(),details=p('','v32-status');const update=()=>{const route=routes.find(route=>route.id===select.value),quote=call(options,'education','researchQuote',stateOf(options),route.id,options.context,route);details.textContent=quote?.ok?`Koszt: ${Object.entries(quote.cost).map(([id,n])=>`${format(n)} ${label(id)}`).join(', ')}. Bazowy czas: ${duration(quote.work)}.`:quote?.message||'';};select.addEventListener('change',update);update();root.append(section('Odkryj trasę dostaw',form(()=>{if(!teachers.values().length){announce(options,'Wybierz co najmniej jednego profesora.',false);return;}const route=routes.find(route=>route.id===select.value);act(options,'educationResearchStart',{topic:route.id,route:{source:route.source,target:route.target,product:route.product},professorUids:teachers.values()});},field('Kierunek i produkt',select),details,teachers.element,submit('Zbadaj trasę'))));}
  }
  root.append(p('Szaty profesorskie są dostępne automatycznie po odblokowaniu Akademii. Podstawowe ciasto nie wymaga badań.','v32-muted'));return root;
}

export function renderBarracksControls(options={}){
  const state=stateOf(options),s=call(options,'military','militaryStatus',state,options.context)||{unlocked:num(state.buildings?.townhall?.level)>=4,level:num(state.buildings?.barracks?.level),beds:4+2*num(state.buildings?.barracks?.level),soldiers:[],candidates:[],courses:state.military?.courses||[],squads:state.military?.squads||[],waiting:[]};
  const root=node('div',{'data-v32-barracks':''});if(!s.unlocked){root.append(p('Koszary są dostępne od 4. poziomu Ratusza.'));return root;}
  const soldiers=s.soldiers||[],ready=soldiers.filter(person=>person.ready&&person.housed&&!person.busy);
  root.append(section('Załoga Koszar',p(`Żołnierze na wyspie: ${soldiers.length}. Łóżka w Koszarach: ${s.beds}. Osoby na wyprawie lub oczekujące poza wyspą nie zajmują miejsca w Ratuszu.`)));
  const recruit=selectPeople(s.candidates||[],'Wybierz rekruta'),instructor=selectPeople(ready,'Wybierz instruktora');recruit.required=true;instructor.required=true;
  root.append(section('Rekrutacja',p('Szkolenie kosztuje 3 stroje wojskowe. Gotowy instruktor zakwaterowany w Koszarach szkoli jednego rekruta.'),form(()=>act(options,'militaryRecruit',{recruitUid:recruit.value,instructorUid:instructor.value}),field('Rekrut',recruit),field('Instruktor',instructor),submit('Rozpocznij szkolenie'))));
  const officerCandidate=selectPeople(ready.filter(person=>person.rank!=='officer'),'Wybierz żołnierza'),officer=selectPeople(ready.filter(person=>person.rank==='officer'),'Wybierz oficera');officerCandidate.required=true;officer.required=true;
  root.append(section('Szkolenie oficerskie',p('Potrzeba 8 dodatkowych strojów wojskowych oraz 250 monet i po 50 monet za każdy poziom Ratusza ponad 4. Szkolenie trwa od 4 do 72 godzin.'),form(()=>act(options,'militaryOfficerTrain',{soldierUid:officerCandidate.value,officerUid:officer.value}),field('Kandydat',officerCandidate),field('Oficer szkolący',officer),submit('Szkol na oficera'))));
  const courses=section('Trwające szkolenia');if(!s.courses?.length)courses.append(p('Nie trwa żadne szkolenie.','v32-muted'));for(const course of s.courses||[]){const row=node('article',{class:'v32-card'},node('strong',{text:course.name||`${course.kind==='officer'?'Szkolenie oficera':'Szkolenie rekruta'}`}),p(course.paused?'Szkolenie wstrzymane; opłata i postęp są zachowane.':`Pozostało około ${duration(course.remainingSeconds??course.remainingWork)}`));if(course.paused){const replacement=selectPeople(ready,'Wybierz instruktora');replacement.required=true;row.append(form(()=>act(options,'militaryReplaceInstructor',{courseId:course.id,instructorUid:replacement.value}),field('Instruktor',replacement),submit('Wznów szkolenie')));}const confirmation=node('input',{type:'checkbox',required:true});row.append(form(()=>act(options,'militaryCancelCourse',{courseId:course.id}),field('Potwierdzam utratę opłaty i postępu',confirmation),submit('Przerwij szkolenie')));const speed=accelerationControls(options,'military',course.id);if(speed)row.append(speed);courses.append(row);}root.append(courses);
  const checks=new Map(),expedition=section('Wyprawa oddziału',p('Wybierz gotowych żołnierzy. W czasie wyprawy nie zajmują miejsc na wyspie. Po przyjęciu z powrotem odpoczywają przez 24 godziny.'));
  for(const soldier of soldiers){const c=node('input',{type:'checkbox',disabled:!soldier.ready||!soldier.housed||soldier.busy});checks.set(uid(soldier),c);expedition.append(node('div',{class:'v32-list-row'},field(`${name(soldier)} · ${soldier.rank==='officer'?'oficer':'żołnierz'}${!soldier.ready?' · odpoczynek lub szkolenie':''}`,c),!soldier.housed?btn('Powrót do Koszar',()=>act(options,'militaryRecall',{personUid:uid(soldier)}),{disabled:Boolean(soldier.busy)}):null));}
  expedition.append(btn('Wyślij wybrany oddział',()=>{const selected=[...checks].filter(([,input])=>input.checked).map(([id])=>id);if(!selected.length){announce(options,'Wybierz co najmniej jednego gotowego żołnierza.',false);return;}act(options,'militaryDispatch',{personUids:selected});}));root.append(expedition);
  const away=section('Oddziały i powroty');if(!s.squads?.length&&!s.waiting?.length)away.append(p('Żaden oddział nie oczekuje na powrót.','v32-muted'));
  const squads=[...(s.squads||[]).filter(item=>!item.stage||['away','waiting'].includes(item.stage)),...(s.waiting||[])].filter((item,index,all)=>all.findIndex(other=>other.id===item.id)===index);
  for(const squad of squads){const waiting=squad.stage==='waiting'||squad.status==='waiting'||squad.waiting||s.waiting?.some(item=>item.id===squad.id);away.append(node('article',{class:'v32-card'},node('strong',{text:squad.name||`Oddział ${squad.id}`}),p(waiting?'Oddział czeka poza wyspą. Odpoczynek zacznie się dopiero po jego przyjęciu.':'Oddział jest na wyprawie.'),waiting?p(squad.message||squad.waitReason||`Potrzeba Ratusza ${squad.waiting?.requiredTownhall||'—'} i Koszar ${squad.waiting?.requiredBarracks||'—'}. ${squad.waiting?.townhallDeadline?`Termin Ratusza: ${new Date(squad.waiting.townhallDeadline).toLocaleString('pl-PL')}.`:squad.waiting?.upgradeDeadline?`Bezpłatna rozbudowa Koszar do: ${new Date(squad.waiting.upgradeDeadline).toLocaleString('pl-PL')}.`:''}`):null,waiting?btn('Przyjmij oddział',()=>act(options,'militaryClaimReturn',{squadId:squad.id})):null,waiting&&(squad.freeBarracksUpgradeAvailable||num(squad.waiting?.upgradeDeadline)>num(s.now??state.worldTimeMs)&&num(state.buildings?.townhall?.level)>=num(squad.waiting?.requiredTownhall)&&num(state.buildings?.barracks?.level)<num(squad.waiting?.requiredBarracks))?btn('Bezpłatnie rozbuduj Koszary',()=>act(options,'militaryFreeBarracksUpgrade',{squadId:squad.id})):null));}
  root.append(away);return root;
}

export function renderTheatreControls(options={}){
  const state=stateOf(options),s=options.context?.theatreStatus?.(state)||state.theatre||{};
  const root=section('Przedstawienia',p('Zaplanuj przedstawienie co najmniej 45 minut wcześniej. Trwa 10 minut i kosztuje 2 monety za osobę. Zaproszeni nadal pracują, studiują i prowadzą badania. Udział daje +10 punktów szczęścia na 6 godzin.'));
  const selected=new Set((s.audience||[]).map(item=>typeof item==='object'?uid(item):String(item))),checks=new Map();
  const audience=node('fieldset',{class:'v32-check-list'},node('legend',{text:'Zaproszeni mieszkańcy'}));for(const person of state.residents||[]){const checkbox=node('input',{type:'checkbox',checked:selected.has(uid(person))});checks.set(uid(person),checkbox);audience.append(field(name(person),checkbox));}
  const all=node('input',{type:'checkbox',onChange:event=>{for(const c of checks.values())c.checked=event.target.checked;updateCost();}});audience.prepend(field('Zaznacz wszystkich',all));
  const now=num(state.worldTimeMs)||Date.now(),earliest=new Date(Math.ceil((now+45*60000)/60000)*60000),toLocal=date=>new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const time=node('input',{type:'datetime-local',required:true,value:toLocal(earliest),min:toLocal(earliest),'data-v32-theatre-time':''});
  const cost=p('','v32-status'),updateCost=()=>{const n=[...checks.values()].filter(c=>c.checked).length;cost.textContent=`Zaproszeni: ${n} · pełny koszt: ${n*2} monet`;};audience.addEventListener('change',updateCost);updateCost();
  root.append(form(()=>{const personUids=[...checks].filter(([,c])=>c.checked).map(([id])=>id);if(!personUids.length){announce(options,'Wybierz widzów przedstawienia.',false);return;}const startsAt=new Date(time.value).getTime();if(startsAt<(num(stateOf(options).worldTimeMs)||Date.now())+45*60000){announce(options,'Wybierz termin co najmniej 45 minut od teraz.',false);return;}act(options,options.context?.theatreScheduleActionType||'theatreSchedule',{personUids,audience:personUids,startsAt,startAt:startsAt,audienceScope:'island'});},field('Początek przedstawienia',time),audience,cost,p('Przy zatwierdzeniu utrwalamy listę widzów oraz pełną opłatę. Późniejsza zmiana pracy mieszkańca nie zmienia rezerwacji.','v32-muted'),submit('Zaplanuj przedstawienie')));
  const shows=s.shows||s.scheduled||s.performances||[];for(const show of shows){root.append(node('article',{class:'v32-card'},node('strong',{text:show.active||show.status==='running'?'Przedstawienie trwa':show.status==='completed'?'Zakończone przedstawienie':show.status==='cancelled'?'Odwołane przedstawienie':'Zaplanowane przedstawienie'}),p(`${new Date(show.startAt??show.startsAt).toLocaleString('pl-PL')} · ${show.audience?.length??show.personUids?.length??show.viewers??0} widzów · opłata ${format(show.cost??show.coins)} monet`),show.stage==='planned'||show.status==='planned'?btn('Anuluj przedstawienie',()=>act(options,'theatreCancelShow',{showId:show.id})):null));}
  return root;
}

/** Standalone building body, also usable inside the existing game panel. */
export function renderDevelopmentBuildingPanel(id,options={}){
  const state=stateOf(options),b=state.buildings?.[id]||{},config=DEVELOPMENT_BUILDINGS[id];
  const root=node('div',{class:'v32-building-body','data-v32-panel':id});
  root.append(node('div',{class:'v32-building-summary'},config?developmentBuildingArt(id):null,node('div',{},node('h2',{text:config?.name||DEVELOPMENT_NAMES[id]||id}),p(`Poziom ${whole(b.level)}`,'v32-eyebrow'))),p(developmentBuildingCopy(id,state)));
  const info=node('details',{class:'v32-info'},node('summary',{text:'Więcej o budynku'}),p(developmentBuildingCopy(id,state,'INFO')));root.append(info);
  if(num(b.level)<=0){root.append(p('Ten budynek wymaga odblokowania i wybudowania.'));if(options.context?.buildingControls)root.append(options.context.buildingControls(id));return root;}
  if(options.context?.workerControls&&FALLBACK_RECIPES[id])root.append(options.context.workerControls(id));
  const production=renderProductionControls(id,options);if(production)root.append(production);
  if(id==='academy')root.append(renderAcademyControls(options));
  if(id==='barracks')root.append(renderBarracksControls(options));
  if(id==='warehouse')root.append(renderFoodControls(options));
  if(id==='theatre')root.append(renderTheatreControls(options));
  const transport=renderTransportControls(id,options);if(transport)root.append(transport);
  if(options.context?.buildingControls)root.append(options.context.buildingControls(id));
  if(options.showConstructionMix){const build=renderConstructionFoodMix(id,options);if(build)root.append(build);}
  return root;
}

export function createDevelopmentUI(options={}){
  const mapLayer=node('div',{class:'v32-map-layer','data-v32-map':''});
  const dock=node('div',{class:'v32-building-dock','data-v32-dock':'','aria-label':'Nowe budynki'});
  const element=node('div',{class:'v32-ui-root'}),message=node('p',{class:'v32-feedback',role:'status','aria-live':'polite'});
  let activeId=null,dialog=null,previousFocus=null,disposed=false;
  const fullOptions={...options,message,onRefresh:()=>{options.onRefresh?.();update();}};
  const close=()=>{if(!dialog)return;dialog.remove();dialog=null;activeId=null;previousFocus?.focus?.();};
  const keydown=event=>{if(!dialog)return;if(event.key==='Escape'){event.preventDefault();close();return;}if(event.key==='Tab'){const focusable=[...dialog.querySelectorAll('button,input,select,summary,[tabindex="0"]')].filter(item=>!item.disabled&&item.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};
  function renderOpen(){if(!dialog)return;const content=dialog.querySelector('[data-v32-dialog-body]');const focused=document.activeElement?.getAttribute('data-v32-workers');content.replaceChildren(renderDevelopmentBuildingPanel(activeId,fullOptions));if(focused)content.querySelector(`[data-v32-workers="${focused}"]`)?.focus();}
  function open(id){if(disposed)return;if(options.openPanel&&options.context?.useExistingPanel){options.openPanel(id);return;}previousFocus=document.activeElement;activeId=id;if(!dialog){const closeButton=btn('Zamknij',close,{class:'v32-button v32-close','aria-label':'Zamknij okno budynku'});dialog=node('div',{class:'v32-modal-backdrop',onClick:event=>{if(event.target===event.currentTarget)close();}},node('section',{class:'v32-modal',role:'dialog','aria-modal':'true','aria-label':DEVELOPMENT_BUILDINGS[id]?.name||DEVELOPMENT_NAMES[id]||id},closeButton,node('div',{'data-v32-dialog-body':''}),message));element.append(dialog);queueMicrotask(()=>closeButton.focus());}renderOpen();}
  const mapButtons=new Map(),dockButtons=new Map();
  for(const [id,config]of Object.entries(DEVELOPMENT_BUILDINGS)){
    const marker=node('button',{type:'button',class:'island-hotspot world-hotspot v32-map-building',style:`left:${config.x}px;top:${config.y}px;width:${config.width}px;height:${config.height}px`,'data-v32-building':id,'data-label':config.name,'aria-label':config.name,onClick:()=>open(id)},node('span',{class:'v32-native-hit','aria-hidden':'true',style:`clip-path:${config.footprint}`}));
    const card=node('button',{type:'button',class:'v32-dock-building','data-v32-dock-building':id,'aria-label':config.name,onClick:()=>open(id)},developmentBuildingArt(id),node('span',{text:config.name}),node('small',{'data-v32-building-level':''}));
    mapButtons.set(id,marker);dockButtons.set(id,card);mapLayer.append(marker);dock.append(card);
  }
  function update(){const state=stateOf(options);for(const [id,button]of mapButtons){const level=whole(state.buildings?.[id]?.level),unlocked=state.buildings?.[id]?.unlocked!==false&&(id!=='academy'&&id!=='barracks'||num(state.buildings?.townhall?.level)>=4);button.dataset.locked=String(!unlocked);button.dataset.level=String(level);button.setAttribute('aria-label',`${DEVELOPMENT_BUILDINGS[id].name}, ${unlocked?`poziom ${level}`:'zablokowany'}`);const card=dockButtons.get(id);card.dataset.locked=String(!unlocked);card.querySelector('[data-v32-building-level]').textContent=unlocked?`Poz. ${level}`:'Ratusz 4';}if(dialog){const active=document.activeElement;if(active&&dialog.contains(active)&&/^(INPUT|SELECT)$/.test(active.tagName))return;renderOpen();}}
  document.addEventListener('keydown',keydown);update();
  return {element,mapLayer,dock,open,close,update,renderBuildingPanel:id=>renderDevelopmentBuildingPanel(id,fullOptions),destroy(){disposed=true;close();document.removeEventListener('keydown',keydown);element.remove();mapLayer.remove();dock.remove();}};
}
