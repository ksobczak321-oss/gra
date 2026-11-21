import { createResidentDirectory } from './harborlight-v1-resident-labels.js?v=frontend-v32-23';
import { DEVELOPMENT_NAMES, GOODS_NAMES, developmentText, developmentBuildingCopy, developmentBuildingInformation, developmentProductDescription } from './harborlight-v1-development-copy.js?v=frontend-v32-23';
import { NEW_BUILDINGS } from './harborlight-v1-provisions.js?v=frontend-v32-23';
import { mapRegionFor, mapFootprintFor, buildingArtwork } from './harborlight-v1-map-art.js?v=frontend-v32-23';
import { refreshBuildingStageArtwork } from './harborlight-v1-building-stages.js?v=frontend-v32-23';

// All views share the approved presentation mapping; model IDs stay unchanged.
export const DEVELOPMENT_BUILDINGS = Object.freeze(Object.fromEntries(Object.entries({
  bakery:'Piekarnia',dairy:'Mleczarnia',slaughterhouse:'Rzeźnia',fisher:'Rybak',
  leatherworks:'Zakład skórzany',academy:'Akademia',barracks:'Koszary'
}).map(([id,name])=>{const [x,y,width,height]=mapRegionFor(id);return [id,Object.freeze({name,x,y,width,height,footprint:mapFootprintFor(id)})]})));
function productInformation(id) {
  const description = developmentProductDescription(id);
  return description ? node('details',{class:'v32-info','data-v32-product-description':id},node('summary',{text:'Opis produktu'}),p(description)) : null;
}
const RECIPE_LABELS={farmGrain:'Zboże',farmVegetables:'Warzywa',farmLivestock:'Żywiec',farmMilk:'Surowe mleko',farmCheese:'Ser',wood:'Drewno',stone:'Kamień',flour:'Mąka',planks:'Deski',bread:'Chleb',cake:'Ciasto',pasteurizedMilk:'Mleko pasteryzowane',meat:'Mięso',leather:'Skóry',fish:'Ryby',smokedFish:'Ryba wędzona',fishPreserves:'Przetwory rybne',civilianClothes:'Ubrania cywilne',militaryClothes:'Stroje wojskowe',professorRobes:'Szaty profesorskie'};
const FALLBACK_RECIPES={farm:['farmGrain','farmVegetables','farmLivestock','farmMilk','farmCheese'],windmill:['flour'],bakery:['bread','cake'],dairy:['pasteurizedMilk'],slaughterhouse:['meat','leather'],fisher:['fish','smokedFish','fishPreserves'],leatherworks:['civilianClothes','militaryClothes','professorRobes'],lumber:['wood'],quarry:['stone'],sawmill:['planks']};
const RECIPE_INPUTS={flour:{grain:4},bread:{flour:4},cake:{flour:4,rawMilk:2},pasteurizedMilk:{rawMilk:4},meat:{livestock:2},leather:{livestock:2},farmCheese:{sourMilk:4},civilianClothes:{leather:4},militaryClothes:{leather:8},professorRobes:{leather:8},planks:{wood:2},smokedFish:{fish:4},fishPreserves:{fish:6}};
const RECIPE_ACTION_COPY={farmGrain:'UI-005',farmVegetables:'UI-006',farmLivestock:'UI-007',farmMilk:'UI-008',farmCheese:'UI-009',meat:'UI-010',leather:'UI-011',bread:'UI-012',cake:'UI-013',civilianClothes:'UI-014',militaryClothes:'UI-015',professorRobes:'UI-016'};
const FOOD_IDS=['grain','vegetables','rawMilk','sourMilk','fish','flour','pasteurizedMilk','meat','bread','cake','cheese','smokedFish','fishPreserves','food'];
const SATIETY={grain:1,vegetables:1,rawMilk:1,sourMilk:.5,fish:1,flour:6,pasteurizedMilk:6,meat:6,bread:36,cake:48,cheese:12,smokedFish:12,fishPreserves:18,food:6};
const num=value=>Number.isFinite(Number(value))?Number(value):0;
const whole=value=>Math.max(0,Math.floor(num(value)));
const label=id=>GOODS_NAMES[id]||RECIPE_LABELS[id]||DEVELOPMENT_NAMES[id]||id;
const uid=person=>String(person?.personUid??person?.uid??person?.id??'');
const format=value=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2}).format(num(value));
const duration=seconds=>{const n=Math.max(0,Math.ceil(num(seconds)));return n>=3600?`${Math.floor(n/3600)} godz. ${Math.ceil(n%3600/60)} min`:`${Math.ceil(n/60)} min`;};
function node(tag,attrs={},...children){const e=document.createElement(tag);for(const [key,value] of Object.entries(attrs)){if(value==null)continue;if(key==='class')e.className=value;else if(key==='text')e.textContent=value;else if(key.startsWith('on'))e.addEventListener(key.slice(2).toLowerCase(),value);else if(key in e&&!key.startsWith('aria')&&!key.startsWith('data'))e[key]=value;else e.setAttribute(key,String(value));}for(const child of children.flat(Infinity)){if(child==null)continue;e.append(child instanceof Node?child:document.createTextNode(String(child)));}return e;}
const p=(text,cls='')=>node('p',{class:cls,text});
const btn=(text,action,attrs={})=>node('button',{type:'button',class:'v32-button',onClick:action,...attrs},text);
function section(title,...children){return node('section',{class:'v32-section'},node('h3',{text:title}),...children);}
function field(title,input){const item=node('label',{class:'v32-field'},node('span',{text:title}),input);return item;}
function integerInput(value=0,max,attrs={}){return node('input',{type:'number',min:0,step:1,inputMode:'numeric',value:whole(value),...(max==null?{}:{max:whole(max)}),...attrs});}
function selectPeople(people,placeholder,directory){
  return node('select',{'data-v32-people-select':''},node('option',{value:'',text:placeholder||'Wybierz osobę'}),
    ...directory.groups(people).map(group=>node('optgroup',{label:group.label},
      ...group.people.map(entry=>node('option',{value:uid(entry.person),text:entry.label})))));
}
function stateOf(options){return options.getState?.()||options.state||{};}
function api(options,key){return options.context?.[key]||options[key]||{};}
function call(options,key,method,...args){const handler=api(options,key)[method]||options.context?.[method];return typeof handler==='function'?handler(...args):undefined;}
function announce(options,message,ok=true){if(options.message){options.message.textContent=message||'';options.message.dataset.kind=ok?'success':'error';}options.onFeedback?.(message,ok);}
async function act(options,type,payload={}){try{const result=await options.onAction?.({type,...payload});if(result?.ok===false){announce(options,result.message||'Nie można teraz wykonać tej czynności.',false);return result;}announce(options,result?.message||'Zapisano.');options.onRefresh?.();return result;}catch(error){announce(options,error?.message||'Nie udało się wykonać tej czynności.',false);return {ok:false};}}
function submit(text,handler){return node('button',{type:'submit',class:'v32-button v32-primary',text,onClick:event=>{if(!event.currentTarget.form){event.preventDefault();handler(event);}}});}
function form(handler,...children){return node('form',{class:'v32-form',onSubmit:event=>{event.preventDefault();if(event.currentTarget.reportValidity())handler(event);}},...children);}

// Each column groups one task family; DOM order remains logical on a phone.
function controlColumns(root,secondaryNodes=[]){
  const main=node('div',{class:'v32-column','data-v32-column':'main'});
  const secondary=node('div',{class:'v32-column','data-v32-column':'secondary'});
  for(const child of [...root.children])(secondaryNodes.includes(child)?secondary:main).append(child);
  root.classList.add('v32-panel-layout');root.append(main,secondary);return root;
}

/** The same native building, cropped with CSS for its dock and panel thumbnail. */
export function developmentBuildingArt(id,level=1){
  const wrapper=buildingArtwork(id,{className:'v32-building-art v32-building-art--native',level});
  wrapper.dataset.nativeBuildingArt=id;
  return wrapper;
}

export function renderProductionControls(building,options={}){
  const state=stateOf(options),b=state.buildings?.[building]||{};
  const available=call(options,'provisions','availableRecipes',state,building);
  const catalog=api(options,'provisions').RECIPE_CATALOG||{};
  const ids=Array.isArray(available)?available.map(item=>typeof item==='string'?item:item.id||item.recipeId):FALLBACK_RECIPES[building]||[];
  const recipes=ids.filter(id=>id&&!(['smokedFish','fishPreserves'].includes(id)&&!(num(b.level)>=5&&state.education?.discoveries?.fishProcessing))&&!(id==='farmCheese'&&!(num(b.level)>=6&&state.education?.discoveries?.cheese))&&!(id==='professorRobes'&&!num(state.buildings?.academy?.level))&&!(building==='farm'&&num(b.level)<2&&['farmLivestock','farmMilk'].includes(id)));
  if(!recipes.length)return null;
  const assignments=call(options,'provisions','productionAssignments',state,building)||state.provisions?.assignments?.[building]||{};
  const assigned=Array.isArray(assignments)?Object.fromEntries(assignments.map(item=>[item.recipeId||item.id,item.workers])):assignments;
  const capacity=call(options,'provisions','crewCapacity',state,building);
  const crewLimit=typeof capacity==='object'?capacity.total??capacity.capacity:capacity;
  const title=section('Produkty i pracownicy',...(options.context?.compactProductionHelp?[]:[p(`Załoga: ${whole(b.workers)}${crewLimit==null?'':` / ${whole(crewLimit)}`}. Każdą osobę przydziel do jednego produktu.`),p('Przed zmianą produktu zmniejsz dotychczasowy przydział, a następnie przydziel wolne osoby do nowego produktu.','v32-muted')]));
  if(building==='slaughterhouse')title.append(p(developmentText('HELP-NEW-02'),'v32-muted'));
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
    const action=submit(developmentText(RECIPE_ACTION_COPY[recipeId])||'Przydziel');action.classList.add('v32-recipe-assign');
    title.append(form(()=>act(options,'provisionsSetWorkers',{building,recipeId,workers:whole(input.value)}),node('div',{class:'v32-recipe'},node('div',{},node('strong',{text:RECIPE_LABELS[recipeId]||recipe.name||recipeId}),p(inputText?`${inputText} → ${outText}`:'Pozyskiwanie surowca','v32-muted'),...Object.keys(output||{}).map(productInformation).filter(Boolean)),field('Osoby',input),action)));
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
  const root=section('Wyżywienie mieszkańców',p(developmentText('MSG-FOOD-SETTINGS')),p('Limit oznacza jednorazową partię; puste pole pozwala wydawać bez limitu. Po wykorzystaniu partii ustawiona ilość nie odnawia się sama.'),p(developmentText('MSG-FOOD-RESERVE-CHEAPEST'),'v32-muted'));
  const rebuild=()=>{table.replaceChildren();ids.forEach((id,index)=>{let c=controls.get(id);if(!c){c={enabled:node('input',{type:'checkbox',checked:settings.enabled?.[id]!==false,'aria-label':`Wydawaj: ${label(id)}`}),limit:node('input',{type:'number',min:0,step:'any',inputMode:'decimal',value:settings.limits?.[id]??'',placeholder:'Bez limitu',title:developmentText('UI-FOOD-BATCH-SET'),'aria-label':`${developmentText('UI-002')}: ${label(id)}`})};controls.set(id,c);}const protectedQty=reserve.materials?.[id]??reserve.reserved?.[id]??reserve.reserve?.[id]??0;table.append(node('div',{class:'v32-food-row','data-v32-food':id},field(label(id),c.enabled),node('span',{class:'v32-muted',text:`${format(SATIETY[id])} pkt · rezerwa ${format(protectedQty)}`}),c.limit,node('div',{class:'v32-order',title:developmentText('UI-001')},btn('↑',()=>{[ids[index-1],ids[index]]=[ids[index],ids[index-1]];rebuild();},{disabled:index===0,'aria-label':`Wcześniej: ${label(id)}`}),btn('↓',()=>{[ids[index+1],ids[index]]=[ids[index],ids[index+1]];rebuild();},{disabled:index===ids.length-1,'aria-label':`Później: ${label(id)}`}))));});};
  rebuild();root.append(form(()=>act(options,'provisionsFoodSettings',{priorities:ids,enabled:Object.fromEntries([...controls].map(([id,c])=>[id,c.enabled.checked])),limits:Object.fromEntries([...controls].map(([id,c])=>[id,c.limit.value===''?null:Math.max(0,num(c.limit.value))]))}),table,submit(developmentText('UI-003'))));
  root.append(p(developmentText('HELP-NEW-01'),'v32-muted'));
  root.append(node('details',{class:'v32-info','data-v32-food-product-guide':''},node('summary',{text:'Opisy produktów żywnościowych'}),...ids.map(productInformation).filter(Boolean)));
  root.append(p('Jeśli to jedyne dostępne jedzenie, mieszkańcy mogą przekroczyć limit ilości. Pominięcie wyłączonego rodzaju jedzenia podlega osobnej zasadzie awaryjnej.','v32-muted'));
  root.append(node('details',{class:'v32-info'},node('summary',{text:'Różnorodność posiłków i ciasto'}),p(developmentText('MSG-DIET-SHARE')),p(developmentText('MSG-CAKE-BONUS'))));
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
  const body=section('Jedzenie na budowę',p(developmentText('MSG-MEAL-COST',{'sytość':format(required)})),p('Sytość określa, ile potrzeb żywieniowych zaspokaja produkt. Na przykład 6 punktów sytości zapewnia 6 porcji zboża albo 1 porcja mąki. Możesz zmienić proponowany zestaw przed zatwierdzeniem.'));
  const update=()=>{const provided=[...inputs].reduce((sum,[id,input])=>sum+whole(input.value)*(SATIETY[id]||0),0);summary.textContent=`Wybrane jedzenie: ${format(provided)} / ${format(required)} pkt sytości`;summary.dataset.kind=provided>=required?'success':'error';};
  const grid=node('div',{class:'v32-mix-grid'});
  for(const id of FOOD_IDS.filter(id=>id!=='food'||num(state.resources?.food)>0)){const input=integerInput(mix[id]||0,undefined,{'data-v32-build-food':id,onInput:update});inputs.set(id,input);grid.append(field(`${label(id)} (${format(SATIETY[id])} pkt)`,input));}
  body.append(form(async()=>{const selected=Object.fromEntries([...inputs].filter(([,input])=>whole(input.value)>0).map(([id,input])=>[id,whole(input.value)]));if(options.context?.constructionSubmit){const result=await options.context.constructionSubmit(building,selected);if(result?.ok===false)announce(options,result.message,false);else options.onRefresh?.();}else await act(options,options.context?.constructionActionType||'upgrade',{building,id:building,foodMix:selected,mix:selected});},grid,summary,submit('Zatwierdź rozbudowę')));update();return body;
}

export function renderTransportControls(building,options={}){
  const status=options.context?.transportStatus?.(building);if(!status)return null;
  const routes=status.routes||[];
  if(status.direct){const root=section('Dostawy bezpośrednie',p('Każda trasa wymaga osobnego odkrycia w Akademii i Magazynu na poziomie 5. Do jednej trasy przydzielisz najwyżej połowę tragarzy; co najmniej jeden pozostaje do zwykłych dostaw.'));root.append(p(developmentText('HELP-NEW-06'),'v32-muted'));root.append(p(developmentText('MSG-RECEIVER-FULL'),'v32-muted'));for(const route of routes){const workers=integerInput(route.workers,Math.floor(num(stateOf(options).buildings?.warehouse?.workers)/2));root.append(form(()=>act(options,'developmentRoute',{routeId:route.id,workers:whole(workers.value)}),field(`${DEVELOPMENT_NAMES[route.source]||route.source} → ${DEVELOPMENT_NAMES[route.target]||route.target}: ${label(route.product)}`,workers),submit('Zapisz trasę')));}return root;}
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
  return node('div',{class:'v32-form'},btn(`Ukończ za ${format(quote.cost)} monet`,()=>act(options,`${kind}Accelerate`,{id,method:'coins'})),options.context?.requestRewardedAd?btn(`Reklama: krócej o ${duration(quote.advertSeconds)}`,()=>options.context.requestRewardedAd({type:`${kind}Accelerate`,id,method:'ad'}),{title:developmentText('MSG-SPEED-AD',{'skrót':duration(quote.advertSeconds)})}):null);
}
export function renderAcademyControls(options={}){
  const state=stateOf(options),s=educationState(options),directory=createResidentDirectory(state,{language:options.language||'pl'}),root=node('div',{'data-v32-academy':''});
  if(!s.unlocked){root.append(p('Akademia jest dostępna od 4. poziomu Ratusza.'));return root;}
  root.append(section('Profesorowie i nauka',p(`Profesorowie: ${s.professors?.length||0} / ${s.professorLimit??3+num(s.level)}. Runda nauki: ${s.round?.number||1}. Każdy profesor uczy jedną osobę albo prowadzi badania.`)));
  const professors=s.professors||[],candidates=(s.candidates||[]).filter(person=>!(s.professors||[]).some(professor=>uid(person)===uid(professor)));
  const teacher=selectPeople(professors.filter(person=>!person.busy&&person.present!==false),'Wybierz wolnego profesora',directory),student=selectPeople(candidates,'Wybierz adepta',directory);teacher.required=true;student.required=true;
  root.append(p(developmentText('HELP-NEW-03'),'v32-muted'));
  root.append(section('Rozpocznij naukę',p(`Opłata: ${format(10*num(s.level))} monet. Uczestnik musi być wolnym cywilem zakwaterowanym w Domu.`),form(()=>act(options,'educationEnroll',{studentUid:student.value,teacherUid:teacher.value}),field('Adept',student),field('Profesor',teacher),submit(developmentText('UI-017')))));
  const courseList=section('Trwające zajęcia');
  if(!s.courses?.length)courseList.append(p('Nie trwa żaden kurs.','v32-muted'));
  for(const course of s.courses||[]){const title=directory.label(course.studentUid);const item=node('article',{class:'v32-card'},node('strong',{text:title}),p(course.paused?'Nauka wstrzymana. Opłata i postęp są zachowane.':`Pozostało około ${duration(course.remainingSeconds??course.remainingWork)}`));if(course.paused){const replacement=selectPeople(professors.filter(person=>!person.busy&&person.present!==false),'Wybierz nowego profesora',directory);replacement.required=true;item.append(form(()=>act(options,'educationReplaceTeacher',{courseId:course.id,teacherUid:replacement.value}),field('Profesor',replacement),submit(developmentText('UI-TEACHER-REPLACE'))));}const confirmation=node('input',{type:'checkbox',required:true});item.append(form(()=>act(options,'educationCancelCourse',{courseId:course.id}),field('Potwierdzam utratę opłaty i postępu',confirmation),submit(developmentText('UI-018'))));const speed=accelerationControls(options,'education',course.id);if(speed)item.append(speed);courseList.append(item);}
  root.append(courseList);
  const graduates=candidates.filter(person=>person.graduate||person.rounds>0||state.education?.people?.[uid(person)]?.rounds>0),appointment=selectPeople(graduates,'Wybierz absolwenta',directory);appointment.required=true;
  root.append(section('Mianowanie profesora',p(`Mianowanie zużywa jedną szatę profesorską. Profesor zajmuje miejsce i łóżko Akademii. ${developmentText('MSG-PROFESSOR-CIVIL-EFFICIENCY')}`),form(()=>act(options,'educationAppoint',{personUid:appointment.value}),field('Absolwent',appointment),submit(developmentText('UI-019')))));
  const professorList=section('Zespół Akademii');
  const professorGroups=directory.groups(professors),professorViews=new Map(professors.map(person=>[uid(person),person]));
  for(const group of professorGroups){
    if(professorGroups.length>1)professorList.append(node('h4',{class:'v32-person-group-heading',text:group.label}));
    for(const entry of group.people){const professor=professorViews.get(uid(entry.person));professorList.append(node('div',{class:'v32-list-row'},node('span',{text:`${entry.label}${professor.present===false?' · poza Akademią':professor.busy?' · zajęty':' · wolny'}`}),btn('Powrót do Akademii',()=>act(options,'educationReturnProfessor',{personUid:uid(professor)}),{disabled:Boolean(professor.busy)||professor.present!==false})));}
  }
  if(professors.length)root.append(professorList);
  const research=renderResearchControls(options,s,directory);root.append(research);
  root.append(section('Kolejna runda',p('Kolejna runda obejmuje mieszkańców aktualnie należących do wyspy.'),p(developmentText('MSG-ROUND-TRANSFER'),'v32-muted'),btn(developmentText('UI-023'),()=>act(options,'educationStartRound'),{'data-v32-next-round':''})));
  return controlColumns(root,[research]);
}

export function renderResearchControls(options={},provided,providedDirectory){
  const state=stateOf(options),directory=providedDirectory||createResidentDirectory(state,{language:options.language||'pl'}),s=provided||educationState(options),root=section('Badania i odkrycia');
  root.append(p(developmentText('HELP-NEW-04'),'v32-muted'));
  const islandNumber=Math.max(1,whole(options.context?.islandIndex||state.islandIndex||String(state.islandId||'island-1').match(/(\d+)$/)?.[1]||1));
  root.append(p(developmentText('MSG-ISLAND-SPEED',{'wyspa':state.islandName||`Wyspa ${islandNumber}`,'numer':islandNumber}),'v32-muted'));
  const catalog=Array.isArray(s.researchCatalog)?s.researchCatalog:Object.entries(s.researchCatalog||{}).map(([id,item])=>({id,...item}));
  const topic=node('select',{},node('option',{value:'',text:'Wybierz badanie'}),...catalog.map(item=>node('option',{value:item.id||item.topic,text:`${item.name||item.title||item.id||item.topic}${item.quote?.ok===false&&item.minimumBuilding?` · ${Object.entries(item.minimumBuilding).map(([id,n])=>`${DEVELOPMENT_NAMES[id]||id}: poziom ${n}`).join(', ')}`:''}`,disabled:item.available===false||item.quote?.ok===false})));topic.required=true;
  const selectProfessors=(selected=[])=>{const checks=new Map(),box=node('fieldset',{class:'v32-check-list'},node('legend',{text:'Profesorowie'}));for(const professor of s.professors||[]){const key=uid(professor),checkbox=node('input',{type:'checkbox',value:key,checked:selected.includes(key),disabled:professor.present===false||Boolean(professor.busy&&!selected.includes(key))});checks.set(key,checkbox);box.append(field(directory.label(professor),checkbox));}return {element:box,values:()=>[...checks].filter(([,c])=>c.checked).map(([id])=>id)};};
  const staff=selectProfessors(),quoteInfo=p('Wybierz temat, aby zobaczyć koszt i bazowy czas.','v32-status');topic.addEventListener('change',()=>{const selected=catalog.find(item=>(item.id||item.topic)===topic.value),quote=selected?.quote;quoteInfo.textContent=quote?.ok?`${selected.effect||''} Koszt: ${Object.entries(quote.cost||{}).map(([id,n])=>`${format(n)} ${label(id)}`).join(', ')}. Bazowy czas jednego profesora: ${duration(quote.work)}.`:quote?.message||'Wybierz temat, aby zobaczyć koszt i bazowy czas.';});root.append(form(()=>{if(!staff.values().length){announce(options,'Wybierz co najmniej jednego profesora.',false);return;}act(options,'educationResearchStart',{topic:topic.value,professorUids:staff.values()});},field('Temat',topic),quoteInfo,staff.element,submit(developmentText('UI-020'))));
  for(const research of s.researches||[]){const speed=accelerationControls(options,'education',research.id);if(speed)root.append(speed);const staffEdit=selectProfessors(research.professorUids||[]);root.append(node('article',{class:'v32-card'},node('strong',{text:research.name||catalog.find(item=>(item.id||item.topic)===research.topic)?.name||research.topic}),p(`${research.paused?developmentText('MSG-TEACHER-LOST')+' ':''}Pozostało około ${duration(research.remainingSeconds??research.remainingWork)}. Koszt opłacony: ${typeof research.cost==='object'?Object.entries(research.cost).map(([id,n])=>`${format(n)} ${label(id)}`).join(', '):`${format(research.cost)} monet`}.`),form(()=>act(options,'educationResearchAssign',{researchId:research.id,professorUids:staffEdit.values()}),staffEdit.element,submit(developmentText('UI-022'))),btn(developmentText('UI-021'),()=>{const confirm=node('input',{type:'checkbox',required:true});const panel=node('div',{class:'v32-confirm'},p('Anulowanie usuwa postęp i opłatę.'),form(()=>act(options,'educationResearchCancel',{researchId:research.id}),field('Potwierdzam anulowanie',confirm),submit('Potwierdź anulowanie')));root.append(panel);})));}
  if(num(stateOf(options).buildings?.warehouse?.level)>=5){
    const catalog=api(options,'provisions').RECIPE_CATALOG||{},routes=[];
    for(const [sourceId,source]of Object.entries(catalog))for(const target of Object.values(catalog))for(const product of Object.keys(source.outputs||{}))if(source.building!==target.building&&target.inputs?.[product]&&num(stateOf(options).buildings?.[source.building]?.level)>0&&num(stateOf(options).buildings?.[target.building]?.level)>0){const id=`route:${source.building}:${target.building}:${product}`;if(!routes.some(route=>route.id===id)&&!s.discoveries?.[id])routes.push({id,source:source.building,target:target.building,product});}
    if(routes.length){const select=node('select',{},...routes.map(route=>node('option',{value:route.id,text:`${DEVELOPMENT_NAMES[route.source]||route.source} → ${DEVELOPMENT_NAMES[route.target]||route.target}: ${label(route.product)}`}))),teachers=selectProfessors(),details=p('','v32-status');const update=()=>{const route=routes.find(route=>route.id===select.value),quote=call(options,'education','researchQuote',stateOf(options),route.id,options.context,{source:route.source,target:route.target,product:route.product});details.textContent=quote?.ok?`Koszt: ${Object.entries(quote.cost).map(([id,n])=>`${format(n)} ${label(id)}`).join(', ')}. Bazowy czas: ${duration(quote.work)}.`:quote?.message||'';};select.addEventListener('change',update);update();root.append(section('Odkryj trasę dostaw',form(()=>{if(!teachers.values().length){announce(options,'Wybierz co najmniej jednego profesora.',false);return;}const route=routes.find(route=>route.id===select.value);act(options,'educationResearchStart',{topic:route.id,route:{source:route.source,target:route.target,product:route.product},professorUids:teachers.values()});},field('Kierunek i produkt',select),details,teachers.element,submit('Zbadaj trasę'))));}
  }
  root.append(p('Szaty profesorskie są dostępne automatycznie po odblokowaniu Akademii. Podstawowe ciasto nie wymaga badań.','v32-muted'));return root;
}

export function renderBarracksControls(options={}){
  const state=stateOf(options),directory=createResidentDirectory(state,{language:options.language||'pl'}),s=call(options,'military','militaryStatus',state,options.context)||{unlocked:num(state.buildings?.townhall?.level)>=4,level:num(state.buildings?.barracks?.level),beds:4+2*num(state.buildings?.barracks?.level),soldiers:[],candidates:[],courses:state.military?.courses||[],squads:state.military?.squads||[],waiting:[]};
  const root=node('div',{'data-v32-barracks':''});if(!s.unlocked){root.append(p('Koszary są dostępne od 4. poziomu Ratusza.'));return root;}
  root.append(p(developmentText('HELP-NEW-05'),'v32-muted'));
  const soldiers=s.soldiers||[],ready=soldiers.filter(person=>person.ready&&person.housed&&!person.busy);
  root.append(section('Załoga Koszar',p(`Żołnierze na wyspie: ${soldiers.length}. Łóżka w Koszarach: ${s.beds}. Osoby na wyprawie lub oczekujące poza wyspą nie zajmują miejsca w Ratuszu.`)));
  const recruit=selectPeople(s.candidates||[],'Wybierz rekruta',directory),instructor=selectPeople(ready,'Wybierz instruktora',directory);recruit.required=true;instructor.required=true;
  root.append(section('Rekrutacja',p('Szkolenie kosztuje 3 stroje wojskowe. Gotowy instruktor zakwaterowany w Koszarach szkoli jednego rekruta.'),form(()=>act(options,'militaryRecruit',{recruitUid:recruit.value,instructorUid:instructor.value}),field('Rekrut',recruit),field('Instruktor',instructor),submit(developmentText('UI-024')))));
  const officerCandidate=selectPeople(ready.filter(person=>person.rank!=='officer'),'Wybierz żołnierza',directory),officer=selectPeople(ready.filter(person=>person.rank==='officer'),'Wybierz oficera',directory);officerCandidate.required=true;officer.required=true;
  root.append(section('Szkolenie oficerskie',p('Potrzeba 8 dodatkowych strojów wojskowych oraz 250 monet i po 50 monet za każdy poziom Ratusza ponad 4. Szkolenie trwa od 4 do 72 godzin.'),form(()=>act(options,'militaryOfficerTrain',{soldierUid:officerCandidate.value,officerUid:officer.value}),field('Kandydat',officerCandidate),field('Oficer szkolący',officer),submit(developmentText('UI-026')))));
  const courses=section('Trwające szkolenia');if(!s.courses?.length)courses.append(p('Nie trwa żadne szkolenie.','v32-muted'));for(const course of s.courses||[]){const row=node('article',{class:'v32-card'},node('strong',{text:`${course.kind==='officer'?'Szkolenie oficerskie':'Szkolenie rekruta'} · ${directory.label(course.studentUid)}`}),p(course.paused?'Szkolenie wstrzymane; opłata i postęp są zachowane.':`Pozostało około ${duration(course.remainingSeconds??course.remainingWork)}`));if(course.paused){const replacement=selectPeople(ready,'Wybierz instruktora',directory);replacement.required=true;row.append(form(()=>act(options,'militaryReplaceInstructor',{courseId:course.id,instructorUid:replacement.value}),field('Instruktor',replacement),submit('Wznów szkolenie')));}const confirmation=node('input',{type:'checkbox',required:true});row.append(form(()=>act(options,'militaryCancelCourse',{courseId:course.id}),field(course.kind==='officer'?'Potwierdzam utratę opłaty i postępu':developmentText('MSG-RECRUIT-CANCEL'),confirmation),submit(developmentText('UI-025'))));const speed=accelerationControls(options,'military',course.id);if(speed)row.append(speed);courses.append(row);}root.append(courses);
  const checks=new Map(),expedition=section('Wyprawa oddziału',p('Wybierz gotowych żołnierzy. W czasie wyprawy nie zajmują miejsc na wyspie. Po przyjęciu z powrotem odpoczywają przez 24 godziny.'));
  for(const soldier of soldiers){const c=node('input',{type:'checkbox',disabled:!soldier.ready||!soldier.housed||soldier.busy});checks.set(uid(soldier),c);expedition.append(node('div',{class:'v32-list-row'},field(`${directory.label(soldier)}${!soldier.ready?' · odpoczynek lub szkolenie':''}`,c),!soldier.housed?btn(developmentText('UI-027'),()=>act(options,'militaryRecall',{personUid:uid(soldier)}),{disabled:Boolean(soldier.busy)}):null));}
  expedition.append(btn(developmentText('UI-028'),()=>{const selected=[...checks].filter(([,input])=>input.checked).map(([id])=>id);if(!selected.length){announce(options,'Wybierz co najmniej jednego gotowego żołnierza.',false);return;}act(options,'militaryDispatch',{personUids:selected});}));root.append(expedition);
  const away=section('Oddziały i powroty');if(!s.squads?.length&&!s.waiting?.length)away.append(p('Żaden oddział nie oczekuje na powrót.','v32-muted'));
  const squads=[...(s.squads||[]).filter(item=>!item.stage||['away','waiting'].includes(item.stage)),...(s.waiting||[])].filter((item,index,all)=>all.findIndex(other=>other.id===item.id)===index);
  for(const squad of squads){const waiting=squad.stage==='waiting'||squad.status==='waiting'||squad.waiting||s.waiting?.some(item=>item.id===squad.id);away.append(node('article',{class:'v32-card'},node('strong',{text:squad.name||`Oddział ${squad.id}`}),p(waiting?'Oddział czeka poza wyspą. Odpoczynek zacznie się dopiero po jego przyjęciu.':'Oddział jest na wyprawie.'),waiting&&num(squad.waiting?.requiredTownhall)>num(state.buildings?.townhall?.level)?p(developmentText('MSG-TOWNHALL-FULL-RETURN')):null,waiting?p(squad.message||squad.waitReason||`Potrzeba Ratusza ${squad.waiting?.requiredTownhall||'—'} i Koszar ${squad.waiting?.requiredBarracks||'—'}. ${squad.waiting?.townhallDeadline?`Termin Ratusza: ${new Date(squad.waiting.townhallDeadline).toLocaleString('pl-PL')}.`:squad.waiting?.upgradeDeadline?`Bezpłatna rozbudowa Koszar do: ${new Date(squad.waiting.upgradeDeadline).toLocaleString('pl-PL')}.`:''}`):null,waiting?btn('Przyjmij oddział',()=>act(options,'militaryClaimReturn',{squadId:squad.id})):null,waiting&&(squad.freeBarracksUpgradeAvailable||num(squad.waiting?.upgradeDeadline)>num(s.now??state.worldTimeMs)&&num(state.buildings?.townhall?.level)>=num(squad.waiting?.requiredTownhall)&&num(state.buildings?.barracks?.level)<num(squad.waiting?.requiredBarracks))?btn(developmentText('UI-029'),()=>act(options,'militaryFreeBarracksUpgrade',{squadId:squad.id})):null));}
  root.append(away);return controlColumns(root,[expedition,away]);
}

// Only the unfinished UI choice is retained here. It is neither a game save
// nor browser storage, and a new island generation receives a separate draft.
const theatreSelectionDrafts=new Map();
const theatrePersonUid=person=>person?.personUid||(Number.isSafeInteger(person?.id)?`resident:${person.id}`:uid(person));
function theatreAudienceGroups(state,status,directory){
  const candidates=Array.isArray(status.audienceCandidates)?status.audienceCandidates:(state.residents||[]).filter(person=>!person.pendingRelease&&!person.shipId&&!person.atSea);
  return directory.groups(candidates).map(group=>({label:group.label,people:group.people.map(entry=>({...entry.person,personUid:theatrePersonUid(entry.person),name:entry.label}))}));
}
export function renderTheatreControls(options={}){
  const state=stateOf(options),directory=createResidentDirectory(state,{language:options.language||'pl'}),s=options.context?.theatreStatus?.(state)||state.theatre||{};
  const root=section('Przedstawienia',p('Zaplanuj przedstawienie co najmniej 45 minut wcześniej. Trwa 10 minut i kosztuje 2 monety za osobę. Zaproszeni nadal pracują, studiują i prowadzą badania. Udział daje +10 punktów szczęścia na 6 godzin.'));
  const groups=theatreAudienceGroups(state,s,directory),available=groups.flatMap(group=>group.people),availableUids=new Set(available.map(theatrePersonUid));
  const draftKey=JSON.stringify([options.context?.accountId||'preview',state.islandId||'island-1',state.islandGeneration||1]);
  if(!theatreSelectionDrafts.has(draftKey)){
    if(theatreSelectionDrafts.size>=64)theatreSelectionDrafts.delete(theatreSelectionDrafts.keys().next().value);
    theatreSelectionDrafts.set(draftKey,{selected:new Set((s.audience||[]).map(item=>typeof item==='object'?theatrePersonUid(item):String(item))),open:false,timeValue:'',timeTouched:false});
  }
  const draft=theatreSelectionDrafts.get(draftKey);draft.selected=new Set([...draft.selected].filter(key=>availableUids.has(key)));
  const now=num(state.worldTimeMs)||Date.now(),earliest=new Date(Math.ceil((now+45*60000)/60000)*60000),toLocal=date=>new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16),minimumTime=toLocal(earliest);
  if(!draft.timeValue||!draft.timeTouched&&draft.timeValue<minimumTime)draft.timeValue=minimumTime;
  const time=node('input',{type:'datetime-local',required:true,value:draft.timeValue,min:minimumTime,'data-v32-theatre-time':''});
  const checks=new Map(),summary=node('summary',{'data-v32-theatre-audience-summary':''}),audience=node('details',{class:'v32-audience-picker',open:draft.open,'data-v32-theatre-audience':'',onToggle:event=>{draft.open=event.currentTarget.open;}},summary),list=node('div',{class:'v32-audience-options'});
  for(const group of groups){const box=node('fieldset',{class:'v32-audience-group','data-v32-theatre-group':group.label},node('legend',{text:`${group.label} (${group.people.length})`}));for(const person of group.people){const key=theatrePersonUid(person),checkbox=node('input',{type:'checkbox',checked:draft.selected.has(key),'data-v32-theatre-person':key,onChange:event=>{if(event.target.checked)draft.selected.add(key);else draft.selected.delete(key);updateCost();}});checks.set(key,checkbox);box.append(field(person.name,checkbox));}list.append(box);}
  if(!available.length)list.append(p('Na wyspie nie ma obecnie dostępnych widzów.','v32-muted'));audience.append(list);
  const cost=p('','v32-status'),allCost=p('','v32-muted');cost.dataset.v32TheatreCost='';allCost.dataset.v32TheatreAllCost='';
  let scheduling=false;
  const actionFor=personUids=>{const startsAt=new Date(time.value).getTime();return {personUids,audience:personUids,startsAt,startAt:startsAt,audienceScope:'island'};};
  const quoteFor=personUids=>call(options,'theatre','theatreShowQuote',stateOf(options),actionFor(personUids),options.context);
  async function schedule(personUids){
    if(scheduling)return;if(!personUids.length){announce(options,'Wybierz widzów przedstawienia.',false);return;}
    if(!time.reportValidity())return;const action=actionFor(personUids),quote=quoteFor(personUids);
    if(!Number.isFinite(action.startsAt)||action.startsAt<(num(stateOf(options).worldTimeMs)||Date.now())+45*60000){announce(options,'Wybierz termin co najmniej 45 minut od teraz.',false);return;}
    if(quote?.ok===false||quote?.affordable===false){announce(options,quote?.ok===false?quote.message||'Nie można zaplanować przedstawienia.':'Brakuje monet na przedstawienie.',false);return;}
    scheduling=true;updateCost();try{return await act(options,options.context?.theatreScheduleActionType||'theatreSchedule',action);}finally{scheduling=false;updateCost();}
  }
  const sendAll=btn('Wyślij wszystkich',()=>schedule([...availableUids]),{class:'v32-button v32-primary','data-v32-theatre-send-all':''});
  const submitSelected=submit(developmentText('UI-048'));
  function updateCost(){
    const selected=[...draft.selected].filter(key=>availableUids.has(key)),quote=quoteFor(selected),allQuote=quoteFor([...availableUids]);
    summary.textContent=`Wybierz widzów według zajęcia · wybrano ${selected.length} z ${available.length}`;
    cost.textContent=`Zaproszeni: ${selected.length} · pełny koszt: ${format(quote?.coins??selected.length*2)} monet${quote?.ok===false&&selected.length?` · ${quote.message}`:quote?.affordable===false?' · brakuje monet':''}`;
    cost.dataset.kind=quote?.ok===false&&selected.length||quote?.affordable===false?'error':'info';
    allCost.textContent=`Wszyscy dostępni: ${available.length} osób · pełny koszt: ${format(allQuote?.coins??available.length*2)} monet${allQuote?.ok===false?` · ${allQuote.message}`:allQuote?.affordable===false?' · brakuje monet':''}`;
    sendAll.disabled=scheduling||!available.length||allQuote?.ok===false||allQuote?.affordable===false;
    submitSelected.disabled=scheduling||!selected.length||quote?.ok===false||quote?.affordable===false;
  }
  time.addEventListener('input',()=>{draft.timeValue=time.value;draft.timeTouched=true;updateCost();});
  root.append(form(()=>schedule([...draft.selected].filter(key=>availableUids.has(key))),field('Początek przedstawienia',time),node('div',{class:'v32-audience-all'},sendAll,allCost),p('„Wyślij wszystkich” od razu planuje przedstawienie dla wszystkich dostępnych osób w wybranym terminie. Aby zaprosić część mieszkańców, rozwiń listę poniżej.','v32-muted'),audience,cost,p('Przy zatwierdzeniu utrwalamy listę widzów oraz pełną opłatę. Późniejsza zmiana pracy mieszkańca nie zmienia rezerwacji.','v32-muted'),submitSelected));updateCost();
  const shows=s.shows||s.scheduled||s.performances||[],showList=section('Przedstawienia na wyspie');
  if(!shows.length)showList.append(p('Nie zaplanowano jeszcze przedstawienia.','v32-muted'));
  for(const show of shows){showList.append(node('article',{class:'v32-card'},node('strong',{text:show.active||show.status==='running'?'Przedstawienie trwa':show.status==='completed'?'Zakończone przedstawienie':show.status==='cancelled'?'Odwołane przedstawienie':'Zaplanowane przedstawienie'}),p(`${new Date(show.startAt??show.startsAt).toLocaleString('pl-PL')} · ${show.audience?.length??show.personUids?.length??show.viewers??0} widzów · opłata ${format(show.cost??show.coins)} monet`),show.stage==='planned'||show.status==='planned'?btn('Anuluj przedstawienie',()=>act(options,'theatreCancelShow',{showId:show.id})):null));}
  const description=root.querySelector(':scope>p'),planning=root.querySelector(':scope>form');
  const main=section('Planowanie przedstawienia',planning),secondary=node('div',{class:'v32-column','data-v32-column':'secondary'},section('Zasady przedstawienia',description,p(developmentText('HELP-NEW-08'))),showList);
  root.classList.add('v32-theatre-controls');main.dataset.v32Column='main';main.classList.add('v32-column');
  root.append(node('div',{class:'v32-panel-layout v32-theatre-layout'},main,secondary));
  return root;
}

/** Standalone building body, also usable inside the existing game panel. */
export function renderDevelopmentBuildingPanel(id,options={}){
  const state=stateOf(options),b=state.buildings?.[id]||{},config=DEVELOPMENT_BUILDINGS[id];
  const root=node('div',{class:'v32-building-body','data-v32-panel':id});
  root.append(node('div',{class:'v32-building-summary v32-building-overview'},config?developmentBuildingArt(id,b.level):null,node('div',{},p(`Poziom ${whole(b.level)}`,'v32-eyebrow'),p(developmentBuildingCopy(id,state),'v32-building-description'))));
  const producer=Boolean(FALLBACK_RECIPES[id])&&num(b.level)>0;
  const paragraphs=developmentBuildingInformation(id,state).map(text=>p(text));
  if(id==='farm'&&!(num(state.buildings?.farm?.level)>=6&&state.education?.discoveries?.cheese))paragraphs.push(p(developmentText('MSG-CHEESE-LOCKED'),'v32-muted'));
  const info=producer?section('Zasady działania',...paragraphs,p('Każdą osobę przydziel do jednego produktu. Przed zmianą produktu zmniejsz dotychczasowy przydział, a następnie przydziel wolne osoby do nowego produktu.','v32-muted')):node('details',{class:'v32-info','data-building-information':id},node('summary',{text:'Zasady działania'}),...paragraphs);
  let layout,main,secondary;
  if(num(b.level)>0&&(id==='academy'||id==='barracks')){
    layout=id==='academy'?renderAcademyControls(options):renderBarracksControls(options);
    main=layout.querySelector('[data-v32-column="main"]');secondary=layout.querySelector('[data-v32-column="secondary"]');
  }
  if(!main||!secondary){
    layout=node('div',{class:'v32-panel-layout'});
    main=node('div',{class:'v32-column','data-v32-column':'main'});
    secondary=node('div',{class:'v32-column','data-v32-column':'secondary'});layout.append(main,secondary);
    if(num(b.level)<=0)main.append(section('Budynek oczekuje',p('Ten budynek wymaga odblokowania i wybudowania.')));
    else{
      if(options.context?.workerControls&&FALLBACK_RECIPES[id])main.append(options.context.workerControls(id));
      const production=renderProductionControls(id,{...options,context:{...options.context,compactProductionHelp:true}});if(production)main.append(production);
      if(id==='warehouse')main.append(renderFoodControls(options));
      if(id==='theatre')main.append(renderTheatreControls(options));
    }
  }
  if(options.context?.buildingControls)secondary.prepend(options.context.buildingControls(id));
  secondary.append(info);
  const transport=num(b.level)>0?renderTransportControls(id,options):null;if(transport)secondary.append(transport);
  if(options.showConstructionMix){const build=renderConstructionFoodMix(id,options);if(build)secondary.append(build);}
  root.append(layout);return root;
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
    const card=node('button',{type:'button',class:'v32-dock-building','data-v32-dock-building':id,'aria-label':config.name,onClick:()=>open(id)},developmentBuildingArt(id,stateOf(options).buildings?.[id]?.level),node('span',{text:config.name}),node('small',{'data-v32-building-level':''}));
    mapButtons.set(id,marker);dockButtons.set(id,card);mapLayer.append(marker);dock.append(card);
  }
  function update(){const state=stateOf(options);refreshBuildingStageArtwork(dock,state);for(const [id,button]of mapButtons){const level=whole(state.buildings?.[id]?.level),requiredLevel=NEW_BUILDINGS[id].unlockLevel,unlocked=num(state.buildings?.townhall?.level)>=requiredLevel;button.dataset.locked=String(!unlocked);button.dataset.level=String(level);button.dataset.label=`${DEVELOPMENT_BUILDINGS[id].name} — ${unlocked?`Poziom ${level}`:`Ratusz ${requiredLevel}`}`;button.setAttribute('aria-label',`${DEVELOPMENT_BUILDINGS[id].name}, ${unlocked?`poziom ${level}`:`odblokowanie na poziomie Ratusza ${requiredLevel}`}`);const card=dockButtons.get(id);card.dataset.locked=String(!unlocked);card.querySelector('[data-v32-building-level]').textContent=unlocked?`Poz. ${level}`:`Ratusz ${requiredLevel}`;}if(dialog){const active=document.activeElement;if(active&&dialog.contains(active)&&/^(INPUT|SELECT)$/.test(active.tagName))return;renderOpen();}}
  document.addEventListener('keydown',keydown);update();
  return {element,mapLayer,dock,open,close,update,renderBuildingPanel:id=>renderDevelopmentBuildingPanel(id,fullOptions),destroy(){disposed=true;close();document.removeEventListener('keydown',keydown);element.remove();mapLayer.remove();dock.remove();}};
}
