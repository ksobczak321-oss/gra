// Read-only advice. Detailed questions use an isolated snapshot on demand.
// Continuous guidance copies current planning inputs only, never historical
// meals, packed worlds, adventure boards or another island's state.
import { ALL_BUILDINGS, EXPEDITIONS, buildingCost, upgradeEligibility, workerLimit, freeWorkers } from './harborlight-v1-state.js?v=frontend-v32-24';
import { centralAvailable, centralUnreserved, ordinaryWarehouseUsed } from './harborlight-v1-inventory.js?v=frontend-v32-24';
import { constructionScheduleEstimate, activeWorkerIndices, plannedLevel, warehouseLimits, warehouseUsed, quoteTrade } from './harborlight-v1-logistics.js?v=frontend-v32-24';
import { GOODS, FOOD_IDS, NEW_BUILDINGS, RECIPE_CATALOG, availableRecipes, productionAssignments, crewCapacity, localStorageStatus, foodReservePlan } from './harborlight-v1-provisions.js?v=frontend-v32-24';
import { quotePremiumBuilding, expeditionRoundReward } from './harborlight-v1-activities.js?v=frontend-v32-24';
import { housingStatus } from './harborlight-v1-housing.js?v=frontend-v32-24';

export const ADVISOR_BUILDING_NAMES = Object.freeze({ townhall:'Ratusz', house:'Dom', farm:'Gospodarstwo', lumber:'Drwale', quarry:'Kamieniołom', windmill:'Młyn', sawmill:'Tartak', warehouse:'Magazyn', dock:'Port', market:'Targ', lighthouse:'Latarnia', chapel:'Kaplica', theatre:'Teatr', bakery:'Piekarnia', dairy:'Mleczarnia', slaughterhouse:'Rzeźnia', fisher:'Rybak', leatherworks:'Zakład skórzany', academy:'Akademia', barracks:'Koszary' });
const aliases = {townhall:'ratusz\\w*', house:'dom(?:u|em|y|ow)?|lozk\\w*', farm:'gospodarstw\\w*|rolnik\\w*', lumber:'drwal\\w*|lesnik\\w*', quarry:'kamieniolom\\w*|kamieniarz\\w*', windmill:'mlyn\\w*|mlynarz\\w*', sawmill:'tartak\\w*', warehouse:'magazyn\\w*|tragarz\\w*', dock:'port(?:u|em|y|ow)?|porcie|przystan\\w*', market:'targ\\w*', lighthouse:'latarn\\w*', chapel:'kaplic\\w*', theatre:'teatr\\w*', bakery:'piekarn\\w*|piekarz\\w*', dairy:'mleczarn\\w*', slaughterhouse:'rzezn\\w*|rzeznik\\w*', fisher:'rybak\\w*', leatherworks:'zaklad\\w*\\s+skorz\\w*', academy:'akadem\\w*', barracks:'koszar\\w*'};
const resourceAliases = {wood:'drewn\\w*',stone:'kamien\\w*',grain:'zboz\\w*',vegetables:'warzyw\\w*',planks:'des(?:ek|k)\\w*',flour:'mak\\w*',bread:'chleb\\w*',cake:'ciast\\w*',pasteurizedMilk:'mlek\\w*\\s+pasteryz\\w*|pasteryz\\w*\\s+mlek\\w*',sourMilk:'kwasn\\w*\\s+mlek\\w*|mlek\\w*\\s+kwasn\\w*',rawMilk:'surow\\w*\\s+mlek\\w*|mlek(?:o|a|iem|u)?',smokedFish:'ryb\\w*\\s+wedz\\w*|wedz\\w*\\s+ryb\\w*',fishPreserves:'przetwor\\w*\\s+rybn\\w*',fish:'ryb\\w*',cheese:'ser(?:a|em|y|ow)?',livestock:'zywi\\w*|krow\\w*',meat:'mies\\w*',leather:'skor\\w*',militaryClothes:'ubran\\w*\\s+wojsk\\w*|stroj\\w*\\s+wojsk\\w*',professorRobes:'szat\\w*',civilianClothes:'ubran\\w*|stroj\\w*',coins:'monet\\w*'};
const fold = value => String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').slice(0,1000);
const matches = (text, pattern) => new RegExp(`(?:^|[^a-z0-9])(?:${pattern})(?=$|[^a-z0-9])`).test(text);
const amount = value => Math.max(0, Number(value)||0);
const n = value => Math.max(0,Math.ceil(amount(value) - 1e-8)).toLocaleString('pl-PL');
const plural = (value, one, few, many) => {const x=Math.floor(amount(value));return x===1?one:x%10>=2&&x%10<=4&&!(x%100>=12&&x%100<=14)?few:many;};
const people = value => `${n(value)} ${plural(value,'osobę','osoby','osób')}`;
const freePeople = value => `${n(value)} ${plural(value,'wolną osobę','wolne osoby','wolnych osób')}`;
const name = id => ADVISOR_BUILDING_NAMES[id] || id;
const goodName = id => id === 'coins' ? 'Monety' : GOODS[id]?.namePl || id;
const step = (text,target,section) => ({text,target,...(section ? {section} : {})});
const snapshot = state => structuredClone(state);
const recordCopy = value => Object.fromEntries(Object.entries(value || {}).map(([key, row]) => [key, {...row}]));
const scalarCopy = (value, fields) => Object.fromEntries(fields.filter(key => value?.[key] !== undefined).map(key => [key, value[key]]));
function planningView(source) {
 const view=scalarCopy(source,['ruleset','worldTimeMs','lastSimulatedAt','population','happiness','islandId','islandRole','chapelRemaining','lighthouseRemaining']);
 view.resources={...source?.resources};view.bonusMaterials={...source?.bonusMaterials};
 view.buildings=Object.fromEntries(Object.keys(ALL_BUILDINGS).map(id=>[id,{level:0,workers:0,...scalarCopy(source?.buildings?.[id],['level','workers','ready']),stock:{...source?.buildings?.[id]?.stock}}]));
 view.residents=(source?.residents||[]).map(person=>scalarCopy(person,['id','personUid','workplace','arrivalRemaining','returnRemaining','visitGroup','prayerRemaining','pendingRelease','hasHousing']));
 view.constructionProjects=(source?.constructionProjects||[]).map(project=>({...scalarCopy(project,['order','building','targetLevel','stage','buildRemaining','transportRemaining']),reservedMaterials:{...project.reservedMaterials}}));
 view.premium={...source?.premium};view.premiumServices=(source?.premiumServices||[]).map(service=>({...service}));view.starterTurbo={...source?.starterTurbo};
 view.market={orders:(source?.market?.orders||[]).map(order=>scalarCopy(order,['resource','amount']))};
 view.dock={orders:(source?.dock?.orders||[]).map(order=>scalarCopy(order,['resource','direction','reservationVersion','stage','remainingToPort']))};
 // Reserve calculations need current identities, housing and food settings,
 // but not any person's history or encoded history/profile tables.
 view.provisions={version:1,requiredTypes:source?.provisions?.requiredTypes,people:{},
  foodSettings:{priorities:[...(source?.provisions?.foodSettings?.priorities||[])],enabled:{...source?.provisions?.foodSettings?.enabled},limits:{...source?.provisions?.foodSettings?.limits}},
  assignments:recordCopy(source?.provisions?.assignments),localStock:recordCopy(source?.provisions?.localStock),
  legacyCrewAllowances:Object.fromEntries(Object.entries(source?.provisions?.legacyCrewAllowances||{}).map(([id,row])=>[id,{...row,recipes:{...row.recipes}}]))};
 view.education={version:1,people:recordCopy(source?.education?.people),courses:(source?.education?.courses||[]).map(row=>scalarCopy(row,['studentUid','teacherUid'])),
  researches:(source?.education?.researches||[]).map(row=>({professorUids:[...(row.professorUids||[])]})),researchLevels:{...source?.education?.researchLevels},discoveries:{...source?.education?.discoveries}};
 view.military={version:1,people:recordCopy(source?.military?.people),courses:(source?.military?.courses||[]).map(row=>scalarCopy(row,['studentUid','instructorUid'])),
  squads:(source?.military?.squads||[]).filter(row=>['away','waiting'].includes(row.stage)).map(row=>({stage:row.stage,people:(row.people||[]).map(person=>scalarCopy(person,['id','personUid']))}))};
 view.expeditionRuns=Object.fromEntries(Object.entries(source?.expeditionRuns||{}).filter(([,run])=>['active','decision'].includes(run.status)).map(([id,run])=>[id,scalarCopy(run,['id','status','level','pot','rewardPolicyVersion','rewardScale'])]));
 return view;
}
const base = (state, extra = {}) => ({ kind:'suggestion', title:'Doradca Królestwa', text:'', steps:[], goal:null, missing:[], freeWorkers:freeWorkers(state), estimate:{seconds:null,text:'Czas będzie można oszacować po ustaleniu celu.'}, explanation:'Wskazówki wynikają z obecnych zapasów, obsady i zasad Twojej wyspy. Każdą zmianę wykonujesz samodzielnie.', alternatives:[], limitations:[], ...extra });
function duration(seconds) { const minutes=Math.max(1,Math.ceil(seconds/60));return minutes<60 ? `${n(minutes)} min` : `${n(Math.floor(minutes/60))} godz. ${n(minutes%60)} min`; }
function producerFor(state, resource) {return Object.entries(RECIPE_CATALOG).find(([id,r])=>r.outputs[resource]&&availableRecipes(state,r.building).some(x=>x.id===id)) || null;}
function hireRoom(state,id,recipeId=null) {
 const building=state.buildings[id];if(!building?.level)return 0;
 const total=Math.max(0,workerLimit(state,id)-amount(building.workers));
 if(!recipeId)return total;
 const cap=crewCapacity(state,id),assigned=productionAssignments(state,id).find(x=>x.recipeId===recipeId)?.workers || 0;
 return Math.min(total,Math.max(0,(cap.perRecipe?.[recipeId]??cap.perProduct)-assigned));
}
function foodAdvice(state) {
 const reserve=foodReservePlan(state,{available:id=>centralUnreserved(state,id)});
 if(reserve.complete)return null;
 const missing=Math.max(0,reserve.requiredSatiety-reserve.satiety);
 return base(state,{kind:'food',title:'Najpierw zadbaj o jedzenie',text:missing>0?`Do chronionej rezerwy na godzinę brakuje ${n(missing)} punktów sytości.`:`Zapasy pokrywają sytość, ale brakuje wymaganej różnorodności: ${reserve.requiredTypes} produktów.`,steps:[step('Sprawdź wyżywienie i wydawanie dostępnych produktów. Zachowaj chronioną rezerwę na kolejne posiłki mieszkańców.','warehouse','food'),step('Zapewnij zbiór zboża i warzyw w Gospodarstwie; Młyn może przerabiać zboże na pożywniejszą mąkę.','farm')],explanation:`Rezerwa wynosi ${n(reserve.requiredSatiety)} punktów sytości na godzinę. Od poziomu 3 Ratusza potrzebne są dwa produkty, od 8 — trzy, każdy z udziałem co najmniej 20%.`,reserve});
}
function suggestion(state) {
 const food=foodAdvice(state);if(food)return food;
 for(const id of Object.keys(state.buildings||{})) {
  if(!availableRecipes(state,id).length)continue;
  const local=localStorageStatus(state,id),rows=productionAssignments(state,id).filter(row=>row.workers>0);
  const full=local.total>0&&(local.used>=local.total||rows.some(row=>Object.keys(row.outputs).some(resource=>amount(local.stock[resource])>=local.perProduct)));
  if(full)return base(state,{kind:'storage',title:`${name(id)} czeka na odbiór`,text:'Lokalny magazyn ogranicza produkcję.',steps:[step('Sprawdź zapasy przy tym budynku.',id),step('Zadbaj o miejsce w centrali, tragarzy i priorytet odbioru tego produktu.','warehouse','priorities')]});
  for(const row of rows) {
   const missing=Object.entries(row.inputs).filter(([resource,q])=>amount(local.stock[resource])<q);
   if(missing.length)return base(state,{kind:'input',title:`${name(id)} potrzebuje dostawy`,text:`Do kolejnej partii brakuje lokalnie: ${missing.map(([resource,q])=>`${goodName(resource)} ${n(q-amount(local.stock[resource]))}`).join(', ')}.`,steps:[step('Sprawdź surowce i przydział osób do wyrobów.',id),step('Zapewnij dowóz potrzebnego surowca bez zatrzymywania dostaw jedzenia.','warehouse','priorities')]});
  }
 }
 if(warehouseUsed(state)>=warehouseLimits(state).total)return base(state,{kind:'storage',title:'Magazyn centralny jest pełny',text:'Brak miejsca może zatrzymać odbiór towarów.',steps:[step('Sprawdź przegląd Magazynu i wybierz, które zapasy wykorzystać albo wymienić.','warehouse')]});
 const free=freeWorkers(state);
 if(free>0)return base(state,{kind:'workers',title:'Wolni mieszkańcy czekają na zadanie',text:`Możesz obecnie przydzielić do pracy ${people(free)}. Powiedz, co chcesz osiągnąć, a dobiorę kolejne kroki.`,steps:[step('Sprawdź mieszkańców i wolne miejsca pracy.','house','workers')],alternatives:['Chcę rozbudować Port','Potrzebuję więcej desek','Jak ustawić priorytety transportu?']});
 return base(state,{title:'W czym pomóc wyspie?',text:'Podaj cel, na przykład: „Chcę najszybciej rozbudować Port”. Sprawdzę wymagania i najbliższy krok.',steps:[],alternatives:['Chcę rozbudować Port','Jak zapewnić jedzenie?','Jak ustawić priorytety transportu?']});
}
export function advisorSuggestion(state, options = {}) { return developmentGuidance(planningView(state), options); }
const EN_BUILDING_NAMES=Object.freeze({townhall:'Town Hall',house:'House',farm:'Farm',lumber:'Lumber Camp',quarry:'Quarry',windmill:'Mill',sawmill:'Sawmill',warehouse:'Warehouse',dock:'Port',market:'Market',lighthouse:'Lighthouse',chapel:'Chapel',theatre:'Theatre',bakery:'Bakery',dairy:'Dairy',slaughterhouse:'Slaughterhouse',fisher:'Fisher',leatherworks:'Leatherworks',academy:'Academy',barracks:'Barracks'});
const EN_GOODS=Object.freeze({wood:'wood',stone:'stone',grain:'grain',food:'legacy food',planks:'planks',vegetables:'vegetables',livestock:'livestock',rawMilk:'raw milk',sourMilk:'sour milk',fish:'fish',flour:'flour',pasteurizedMilk:'pasteurized milk',meat:'meat',leather:'leather',bread:'bread',cake:'cake',cheese:'cheese',smokedFish:'smoked fish',fishPreserves:'fish preserves',civilianClothes:'civilian clothes',militaryClothes:'military clothes',professorRobes:'professor robes',coins:'coins'});
// Read-only one-hour serving quote. Reserve selection deliberately ignores
// serving preferences; the advisor must inspect priorities, enable flags and
// remaining quantity limits separately. This visits FOOD_IDS only and writes
// no history, clocks, settings, resources or game model sidecars.
function servingReadiness(state,reserve) {
 const required=reserve.requiredSatiety,settings=state.provisions.foodSettings,stock=Object.fromEntries(FOOD_IDS.map(id=>[id,centralUnreserved(state,id)])),mix={};
 const order=[...new Set([...(settings.priorities||[]),...FOOD_IDS])].filter(id=>FOOD_IDS.includes(id));let remaining=required,emergencyUsed=false;
 const permitted=id=>settings.limits[id]===null||settings.limits[id]===undefined?stock[id]:Math.min(stock[id],Math.max(0,amount(settings.limits[id])-amount(mix[id])));
 const add=(id,q)=>{if(q>1e-8){mix[id]=amount(mix[id])+q;stock[id]-=q;remaining-=q*GOODS[id].satiety;}};
 const varied=order.filter(id=>settings.enabled[id]!==false&&permitted(id)*GOODS[id].satiety+1e-8>=required*.2).slice(0,reserve.requiredTypes);
 if(reserve.requiredTypes>1)for(const id of varied)add(id,Math.min(permitted(id),required*.2/GOODS[id].satiety));
 for(const id of order)if(settings.enabled[id]!==false)add(id,Math.min(permitted(id),remaining/GOODS[id].satiety));
 if(remaining>1e-8)for(const id of order)if(settings.enabled[id]===false){const limit=settings.limits[id],max=limit===null||limit===undefined?stock[id]:Math.min(stock[id],amount(limit));const q=Math.min(max,remaining/GOODS[id].satiety);if(q>1e-8)emergencyUsed=true;add(id,q);}
 const sole=FOOD_IDS.filter(id=>stock[id]>1e-8);
 if(remaining>1e-8&&sole.length===1){const id=sole[0],q=Math.min(stock[id],remaining/GOODS[id].satiety);if(q>1e-8)emergencyUsed=true;add(id,q);}
 const supplied=required-Math.max(0,remaining),coverage=required>1e-8?Math.max(0,Math.min(1,supplied/required)):1;
 const types=Object.entries(mix).filter(([id,q])=>q*GOODS[id].satiety+1e-8>=required*.2).length;
 return {coverage,consumed:mix,varietyComplete:required<=1e-8||types>=reserve.requiredTypes,emergencyUsed};
}
function developmentGuidance(state,options={}) {
 const english=options.language==='en',say=(pl,en)=>english?en:pl,bname=id=>english?EN_BUILDING_NAMES[id]||id:name(id),gname=id=>english?EN_GOODS[id]||id:goodName(id);
 const free=freeWorkers(state),reserve=foodReservePlan(state,{available:id=>centralUnreserved(state,id)}),th=amount(state.buildings.townhall.level);
 const result=(kind,title,text,steps,extra={})=>({kind,title,text,steps:steps.slice(0,5),goal:null,freeWorkers:free,missing:[],live:true,
  estimate:{seconds:null,text:say('Plan aktualizuje się wraz z sytuacją na wyspie.','This plan updates as your island changes.')},
  explanation:say('Wybieram najbliższy wykonalny cel: najpierw wyżywienie i zatory, potem warunki rozwoju, materiały i rozbudowę. Korzystam z aktualnych zasad i dostępnej obsady. Decyzje należą do Ciebie.','I choose the next useful goal: food and blockages first, then growth prerequisites, materials and upgrades. Advice uses current rules and available staff. Every decision remains yours.'),
  limitations:[say('To bieżący plan rozwoju, a nie dowód matematycznie najkrótszej drogi. Nie uruchamiam akcji ani nie wydaję zasobów.','This is a current development plan, not a proof of the mathematically shortest route. I do not perform actions or spend resources.')],...extra});
 const action=(id,pl,en,target,section,extra={})=>({id,text:say(pl,en),target,...(section?{section}:{}),...extra});
 const budget={free},hire=(building,recipeId)=>{const count=Math.min(1,budget.free,hireRoom(state,building,recipeId));if(count>0)budget.free-=count;return count;};
 const carriers=()=> {
  if(amount(state.buildings.warehouse.workers)>0)return null;
  const count=hire('warehouse');
  return action('staff-carrier',count?'Przydziel 1 wolną osobę do Magazynu jako tragarza; po dojściu zacznie odbierać towary i dowozić materiały.':'Zapewnij tragarza w Magazynie. Sprawdź wolnych mieszkańców lub kończące się zajęcia; zachowaj obsadę jedzenia.',count?'Assign 1 available resident to the Warehouse as a carrier; after walking there they can collect goods and supply construction.':'Provide a Warehouse carrier. Check available residents or activities about to finish; preserve food workers.','warehouse','workers',{hire:count});
 };
 const assignProduct=(resource)=> {
  const choice=producerFor(state,resource);if(!choice)return null;
  const [recipeId,recipe]=choice,id=recipe.building,assigned=productionAssignments(state,id).find(row=>row.recipeId===recipeId)?.workers||0;
  const here=amount(state.provisions.localStock[id]?.[resource]);
  if(here>0)return action('collect-'+resource,`Odbierz produkt „${gname(resource)}” z budynku ${bname(id)}: lokalnie czeka ${n(here)} szt. Ustaw jego odbiór w priorytetach transportu.`,`Collect ${gname(resource)} from the ${bname(id)}: ${n(here)} units are waiting locally. Set its collection priority.`, 'warehouse','priorities',{resource});
  const count=!assigned?hire(id,recipeId):0;
  if(count)return action('produce-'+resource,`Przydziel 1 wolną osobę do budynku ${bname(id)} i ustaw ją przy produkcie „${gname(resource)}”.`,`Assign 1 available resident to the ${bname(id)} and select the ${gname(resource)} product.`,id,null,{resource,recipeId,hire:count});
  return action('produce-'+resource,assigned?`${bname(id)}: zapewnij surowce do produktu „${gname(resource)}” i odbiór gotowych partii; pracuje przy nim ${n(assigned)} osób.`:`${bname(id)}: ustaw obsadę produktu „${gname(resource)}”. Sprawdź wolne osoby i limit; zachowaj pracowników potrzebnych przy jedzeniu.`,assigned?`${bname(id)}: supply inputs for ${gname(resource)} and collect finished batches; ${n(assigned)} workers are assigned.`:`${bname(id)}: staff the ${gname(resource)} product. Check available people and capacity; preserve food workers.`,id,null,{resource,recipeId,hire:0});
 };
 const miniGame=()=> {
  const current=Object.values(state.expeditionRuns).find(run=>['active','decision'].includes(run.status));
  if(current?.status==='decision'&&amount(current.pot)>0)return action('minigame-cashout',`W minigrze czeka pula ${n(current.pot)} monet. Wróć do niej i wybierz wypłatę, jeśli chcesz przeznaczyć ją na rozwój.`,`A minigame pot of ${n(current.pot)} coins is waiting. Return to the game and choose cash out if you want to use it for development.`,'expeditions',null,{rewardCoins:amount(current.pot),rewardKind:'existing-pot'});
  if(current)return action('minigame-resume','Masz rozpoczętą serię minigry. Wróć do niej; monety z puli trafią do skarbca dopiero po wypłacie.','You have an unfinished minigame series. Return to it; its pot enters your treasury only after cashing out.','expeditions',null,{rewardKind:'unfinished-run'});
  const reward=expeditionRoundReward(1,31);
  if(!EXPEDITIONS.length||!Number.isFinite(reward))return null;
  return action('minigame-coins',`Zagraj w minigrę w Ekspedycjach. Pierwsza wygrana w pełnym czasie daje pulę ${n(reward)} monet; wypłać ją, aby zasilić skarbiec. Nagroda zależy od wyniku i czasu.`,`Play a minigame in Expeditions. A first timely win gives a ${n(reward)}-coin pot; cash it out to add it to your treasury. The reward depends on your result and time.`,'expeditions',null,{rewardCoins:reward,rewardKind:'conditional-timely-win'});
 };
 if(options.topic==='workers')return result('workers',say('Cel: przydziel wolnych mieszkańców','Goal: assign available residents'),say(`Możesz teraz przydzielić do pracy ${people(free)}. Osoby idące do pracy, wracające lub zajęte nauką mogą być niedostępne.`,`There are ${n(free)} residents currently available for work. Walking, returning or studying residents may be unavailable.`),[
  action('review-free-people','Otwórz Dom i sprawdź wolnych mieszkańców oraz ich zajęcia.','Open the House and review available residents and their occupations.','house','workers'),
  action('staff-required-transport','Sprawdź obsadę Magazynu i przydziel dostępne osoby do potrzebnego transportu; zachowaj pracowników jedzenia.','Review Warehouse staffing and assign available people to needed transport while preserving food workers.','warehouse','workers')],{taskId:'workers'});
 if(options.topic==='transport')return result('transport',say('Cel: ustaw transport pod rozwój wyspy','Goal: keep transport moving'),say(`W Magazynie pracuje ${n(state.buildings.warehouse.workers)} tragarzy.`,`The Warehouse has ${n(state.buildings.warehouse.workers)} assigned carriers.`),[
  action('review-carrier-staff','Sprawdź przydzielonych tragarzy i osoby docierające do Magazynu.','Review assigned carriers and people still walking to the Warehouse.','warehouse','workers'),
  action('review-transport-priorities','Ustaw odbiór potrzebnych produktów i dostawy do budowy, zachowując obsługę jedzenia.','Set collection of required products and construction deliveries while preserving food transport.','warehouse','priorities')],{taskId:'transport'});
 if(options.topic==='resource'&&GOODS[options.resource]||options.topic==='resource'&&options.resource==='coins'){
  const resource=options.resource,production=resource==='coins'?miniGame():assignProduct(resource),available=resource==='coins'?amount(state.resources.coins):Math.max(0,centralUnreserved(state,resource)-amount(reserve.materials[resource]));
  return result('resource',say(`Cel: ${gname(resource)}`,`Goal: ${gname(resource)}`),say(`W centrali ponad rezerwy masz ${n(Math.floor(available))} szt.`,`Central stock above protected reserves: ${n(Math.floor(available))} units.`),[
   ...(production?[production]:[action('review-product-unlock','Sprawdź wymagany poziom producenta i potrzebne odkrycie w Akademii.','Review the producer’s required level and Academy discovery.','academy')]),
   action('review-product-delivery','Sprawdź dowóz surowców i odbiór gotowego produktu; zachowaj chronione zapasy jedzenia.','Review input deliveries and collection of the finished product while preserving protected food stocks.','warehouse','priorities')],{taskId:'resource-'+resource,resource});
 }
 const serving=servingReadiness(state,reserve);
 if(!reserve.complete||serving.coverage<1-1e-8||!serving.varietyComplete||serving.emergencyUsed){
  const deficit=Math.max(0,reserve.requiredSatiety-reserve.satiety),disabled=reserve.complete;
  const steps=[action('feeding-settings','Sprawdź wyżywienie w Magazynie: włącz dostępne produkty, ustaw ich kolejność i limity wydawania.','Open Warehouse feeding: enable available foods and set their priority and serving limits.','warehouse','food')];
  if(!disabled){const transport=carriers();if(transport)steps.push(transport);const crop=assignProduct('grain');if(crop)steps.push(crop);if(reserve.requiredTypes>1){const vegetables=assignProduct('vegetables');if(vegetables)steps.push(vegetables);}}
  if(disabled||steps.length<2)steps.push(action('feeding-variety',`Zapewnij ${reserve.requiredTypes} ${reserve.requiredTypes===1?'rodzaj':'rodzaje'} jedzenia; wymagany udział każdego przy różnorodności to co najmniej 20% sytości.`,`Provide ${reserve.requiredTypes} food type(s); when variety is required, each must cover at least 20% of satiety.`,'warehouse','food'));
  return result('food',say('Cel: zabezpiecz wyżywienie mieszkańców','Goal: secure residents’ meals'),disabled?say('Zapasy są dostępne, ale ustawienia wydawania wymagają poprawy: sprawdź limity, różnorodność i awaryjne użycie wyłączonych produktów.','Stocks are available, but serving settings need attention: review quantity limits, variety and emergency use of disabled foods.'):deficit>0?say(`Do chronionej rezerwy na godzinę brakuje ${n(deficit)} punktów sytości.`,`The protected one-hour reserve is short by ${n(deficit)} satiety points.`):say(`Zapasy pokrywają sytość, ale brakuje wymaganej różnorodności: ${reserve.requiredTypes} produktów.`,`Stocks cover satiety but not the required variety of ${reserve.requiredTypes} foods.`),steps,{taskId:'food-reserve',reserve,serving});
 }
 if(options.topic==='food')return result('food',say('Cel: utrzymaj wyżywienie mieszkańców','Goal: maintain residents’ meals'),say('Chroniona rezerwa i ustawienia wydawania obecnie wystarczają. Utrzymuj dostawy i wymaganą różnorodność.','The protected reserve and current serving settings are sufficient. Maintain supply and the required variety.'),[
  action('review-feeding-settings','Sprawdź kolejność, limity i wydawanie jedzenia w Magazynie.','Review food order, quantity limits and serving settings in the Warehouse.','warehouse','food'),
  action('maintain-food-production','Utrzymuj produkcję i odbiór potrzebnych produktów spożywczych.','Maintain production and collection of the food types residents need.','farm')],{taskId:'food-maintenance',reserve,serving});
 for(const id of Object.keys(state.buildings)){
  if(!availableRecipes(state,id).length)continue;
  const local=localStorageStatus(state,id),rows=productionAssignments(state,id).filter(row=>row.workers>0);
  if(local.total>0&&(local.used>=local.total||rows.some(row=>Object.keys(row.outputs).some(resource=>amount(local.stock[resource])>=local.perProduct)))){
   const transport=carriers();return result('storage',say(`Cel: odblokuj produkcję — ${bname(id)}`,`Goal: unblock production — ${bname(id)}`),say('Lokalny magazyn ogranicza produkcję. Najpierw odbierz gotowe produkty.','Local storage is blocking production. Collect finished goods first.'),[
    action('inspect-local-'+id,'Sprawdź produkty czekające w magazynie lokalnym tego budynku.','Inspect the finished products waiting in this building’s local storage.',id),
    ...(transport?[transport]:[]),action('collect-local-'+id,'Ustaw priorytet odbioru tych produktów i sprawdź wolne miejsce w centrali.','Set collection priority for these products and check central storage space.','warehouse','priorities')],{taskId:'local-storage-'+id});
  }
  for(const row of rows){const missing=Object.entries(row.inputs).filter(([resource,q])=>amount(local.stock[resource])<q);if(missing.length){
   const text=missing.map(([resource,q])=>`${gname(resource)} ${n(q-amount(local.stock[resource]))}`).join(', '),transport=carriers();
   return result('input',say(`Cel: dostarcz surowce — ${bname(id)}`,`Goal: supply inputs — ${bname(id)}`),say(`Do kolejnej partii brakuje lokalnie: ${text}.`,`The next batch is locally short of: ${text}.`),[
    action('inspect-input-'+id,'Sprawdź surowce i obsadę wybranego produktu.','Inspect inputs and workers for the selected product.',id),...(transport?[transport]:[]),action('supply-input-'+id,'Ustaw dowóz brakujących surowców, zachowując dostawy jedzenia.','Prioritize delivery of the missing inputs while preserving food deliveries.','warehouse','priorities')],{taskId:'production-input-'+id});
  }}
 }
 let wanted=ADVISOR_BUILDING_NAMES[options.goal]?options.goal:null;
 if(wanted&&Number.isFinite(options.targetLevel)&&amount(state.buildings[wanted]?.level)>=options.targetLevel)wanted=null;
 if(wanted&&wanted!=='theatre'&&amount(state.buildings[wanted]?.level)>=ALL_BUILDINGS[wanted].maxLevel)wanted=null;
 if(wanted==='theatre')return result('leisure',say('Cel: rozwijaj plac Teatru','Goal: develop the Theatre square'),say('Teatr zachowuje stały poziom. Rozwijasz dekoracje i organizujesz wizyty mieszkańców.','The Theatre has a permanent building level. Develop its decorations and organize resident visits.'),[
  action('theatre-decorations','Otwórz plac Teatru i sprawdź dostępne dekoracje.','Open the Theatre square and review available decorations.','theatre'),
  action('theatre-visits','Wybierz mieszkańców, którzy mogą teraz odwiedzić Teatr.','Select residents who can currently visit the Theatre.','theatre')],{goal:'theatre',taskId:'theatre-square'});
 const project=state.constructionProjects.find(row=>!wanted||row.building===wanted);
 if(project){const transport=project.stage==='building'?null:carriers();return result('construction',say(`Cel: ukończ rozbudowę — ${bname(project.building)} ${n(project.targetLevel)}`,`Goal: complete the upgrade — ${bname(project.building)} ${n(project.targetLevel)}`),project.stage==='building'?say('Materiały są na miejscu, a budowa już trwa.','Materials have arrived and construction is in progress.'):say('Rozbudowa jest przyjęta i oczekuje na dostarczenie materiałów.','The upgrade is accepted and awaiting material deliveries.'),[
  ...(transport?[transport]:[]),action('construction-stage-'+project.building,'Sprawdź etap rozpoczętej rozbudowy i widoczny w budynku pozostały czas.','Check the accepted upgrade’s stage and the remaining time shown in the building.',project.building),
  action('construction-next-'+project.building,project.stage==='building'?'W czasie budowy przygotuj produkcję materiałów do kolejnego celu; zachowaj zapas jedzenia.':'Ustaw priorytet dostawy do rozpoczętej budowy i sprawdź brakujące materiały.',project.stage==='building'?'While construction runs, prepare materials for the next goal and preserve food stocks.':'Set delivery priority for this accepted project and inspect its missing materials.','warehouse','priorities')],{goal:project.building,targetLevel:project.targetLevel,taskId:'construction-'+project.order});}
 if(ordinaryWarehouseUsed(state)>=warehouseLimits(state).total){return result('storage',say('Cel: zrób miejsce w Magazynie','Goal: free Warehouse space'),say('Pełna centrala może zatrzymywać odbiór produktów.','Full central storage can block product collection.'),[
  action('inspect-central','Otwórz przegląd Magazynu i sprawdź największe zapasy.','Open the Warehouse overview and inspect your largest stocks.','warehouse'),
  action('use-central','Wykorzystaj nadmiar do dostępnej rozbudowy lub wymiany; chronioną rezerwę jedzenia zachowaj.','Use surplus for an available upgrade or trade while preserving the protected food reserve.','warehouse','priorities')],{taskId:'central-storage'});}
 const housing=housingStatus(state),beds=state.ruleset===32?housing.houseBeds+housing.academyResidentIds.length+housing.barracksResidentIds.length:housing.beds;
 if(!wanted&&housing.unhoused>0&&amount(state.buildings.house.level)<th)wanted='house';
 if(!wanted)wanted=th<ALL_BUILDINGS.townhall.maxLevel?'townhall':['warehouse','farm','lumber','quarry','sawmill','windmill','house','dock','academy','lighthouse','chapel'].find(id=>amount(state.buildings[id].level)<Math.min(th,ALL_BUILDINGS[id].maxLevel))||null;
 if(!wanted)return result('maintenance',say('Cel: utrzymuj sprawną gospodarkę','Goal: keep the island economy running'),say('Najważniejsze poziomy są rozwinięte. Sprawdzaj potrzeby produkcji, mieszkańców i dostępnych misji.','Core levels are developed. Review production needs, residents and available missions.'),[
  action('review-assignments','Sprawdź wolnych mieszkańców i przydziały do produktów potrzebnych w bieżących misjach.','Review available residents and product assignments for current missions.','house','workers'),
  action('review-research','Sprawdź dostępne odkrycia i badania zwiększające wydajność wyspy.','Review discoveries and research that improve island efficiency.','academy')],{taskId:'maintain-economy'});
 const unlock=NEW_BUILDINGS[wanted]?.unlockLevel||(wanted==='dock'?4:wanted==='market'?2:1),next=plannedLevel(state,wanted)+1;
 if(th<unlock||wanted!=='townhall'&&next>th){const requirement=Math.max(unlock,next),currentTownhall=plannedLevel(state,'townhall')+1;return result('locked',say(`Cel: przygotuj najbliższy krok — Ratusz ${n(currentTownhall)}`,`Goal: prepare the next step — Town Hall ${n(currentTownhall)}`),say(`${bname(wanted)} wymaga docelowo Ratusza na poziomie ${n(requirement)}. Teraz sprawdź wykonalność najbliższego poziomu ${n(currentTownhall)}; materiały i obsadę przygotuj etapami.`,`${bname(wanted)} eventually requires Town Hall level ${n(requirement)}. Review the immediate level ${n(currentTownhall)} first and prepare materials and staffing in stages.`),[
  action('unlock-townhall','Otwórz Ratusz i sprawdź warunki jego najbliższej rozbudowy.','Open the Town Hall and check the next upgrade prerequisites.','townhall'),
  action('unlock-supplies','Przygotuj brakujące materiały i transport do rozbudowy Ratusza.','Prepare the missing materials and transport for the Town Hall upgrade.','warehouse','priorities')],{goal:'townhall',requestedGoal:wanted,requestedTargetLevel:next,targetLevel:currentTownhall,longTermRequirement:requirement,taskId:'unlock-'+wanted});}
 const eligibility=upgradeEligibility(state,wanted);
 if(eligibility.code==='townhall-population'){
  if(beds<eligibility.populationRequired&&amount(state.buildings.house.level)<th)wanted='house';
  else {const work=free>0?assignProduct(amount(state.buildings.lumber.workers)?'stone':'wood'):null;return result('population',say(`Cel: przygotuj ${n(eligibility.populationRequired)} mieszkańców do rozbudowy Ratusza`,`Goal: reach ${n(eligibility.populationRequired)} residents for the Town Hall upgrade`),say(`Masz ${n(state.population)} mieszkańców. Łóżka, stałe wyżywienie i dodatnie szczęście umożliwiają dalszy napływ.`,`You have ${n(state.population)} residents. Beds, steady meals and positive happiness allow new arrivals.`),[
   action('growth-happiness','Otwórz Dom i sprawdź dostępne punkty szczęścia do przekazania mieszkańcom.','Open the House and check stored happiness points available for residents.','house'),
   ...(work?[work]:[]),action('growth-arrivals','Sprawdź licznik przybycia kolejnego mieszkańca. W czasie oczekiwania przygotowuj materiały do Ratusza.','Check the next-resident arrival counter. While waiting, prepare Town Hall materials.','house')],{goal:'townhall',populationRequired:eligibility.populationRequired,taskId:'population-'+eligibility.populationRequired});}
 }
 const chosenEligibility=upgradeEligibility(state,wanted);
 if(!chosenEligibility.ok||state.premiumServices.some(service=>service.building===wanted)){return result('locked',say(`Cel: zwolnij warunki rozbudowy — ${bname(wanted)}`,`Goal: clear upgrade prerequisites — ${bname(wanted)}`),say('Rozbudowa jest obecnie zablokowana. Sprawdź kolejkę lub kupioną budowę.','The upgrade is currently blocked. Check construction slots or a purchased upgrade.'),[
  action('inspect-locked','Sprawdź przyczynę blokady w oknie budynku.','Inspect the reason for the lock in the building window.',wanted),
  action('inspect-queue','Dokończ rozpoczęte dostawy i poczekaj na zwolnienie miejsca budowy.','Finish current deliveries and wait for a construction slot.','warehouse','priorities')],{goal:wanted,taskId:'blocked-'+wanted});}
 const targetLevel=plannedLevel(state,wanted)+1,cost=buildingCost(state,wanted),available=resource=>resource==='coins'?amount(state.resources.coins):Math.max(0,centralUnreserved(state,resource)-amount(reserve.materials[resource]));
 const missing=Object.entries(cost).map(([id,required])=>({id,required,available:available(id),missing:Math.max(0,required-available(id))})).filter(row=>row.missing>1e-7);
 const steps=[],transport=carriers();if(transport)steps.push(transport);
 const legacyFoodMissing=state.ruleset!==32&&cost.foodQuote?.ok===false?cost.foodQuote.missingSatiety:0;
 if(legacyFoodMissing)steps.push(action('building-food',`Zapewnij dodatkowe ${n(legacyFoodMissing)} punktów sytości na budowę ponad chronioną rezerwę mieszkańców.`,`Provide ${n(legacyFoodMissing)} additional construction satiety points above residents’ protected reserve.`,'warehouse','food'));
 const coins=missing.find(row=>row.id==='coins'),game=coins?miniGame():null;
 const producerSlots=Math.max(0,4-steps.length-(game?1:0));
 for(const row of missing.filter(row=>row.id!=='coins').slice(0,producerSlots)){const production=assignProduct(row.id);if(production)steps.push(production);}
 if(game)steps.push(game);
 if(steps.length<2)steps.push(action('construction-supply','Sprawdź tragarzy i priorytety dostaw do nowej budowy.','Check carriers and delivery priorities for the new project.','warehouse','priorities'));
 const funded=!missing.length&&!legacyFoodMissing;
 if(funded)steps.push(action('upgrade-'+wanted,`Otwórz ${bname(wanted)}, sprawdź koszt i zleć poziom ${n(targetLevel)}.`,`Open the ${bname(wanted)}, review the cost and order level ${n(targetLevel)}.`,wanted));
 else steps.push(action('prepare-'+wanted,`Najpierw zgromadź brakujące materiały i monety dla budynku ${bname(wanted)}. Po odbiorze Doradca sprawdzi gotowość rozbudowy.`,`First gather the missing materials and coins for the ${bname(wanted)}. After collection the advisor will review upgrade readiness.`,'warehouse','priorities'));
 return result(funded?'upgrade':'materials',funded?say(`Cel: rozbudowa — ${bname(wanted)}`,`Goal: upgrade — ${bname(wanted)}`):say(`Cel: przygotuj materiały — ${bname(wanted)}`,`Goal: prepare materials — ${bname(wanted)}`),say(`Najbliższy poziom: ${n(targetLevel)}. ${missing.length?'Do przygotowania: '+missing.map(row=>`${gname(row.id)} ${n(row.missing)}`).join(', ')+'.':'Materiały i monety są dostępne.'}`,`Immediate level: ${n(targetLevel)}. ${missing.length?'Prepare: '+missing.map(row=>`${gname(row.id)} ${n(row.missing)}`).join(', ')+'.':'Materials and coins are available.'}`),steps,{goal:wanted,targetLevel,taskId:(funded?'upgrade-':'prepare-')+wanted+'-'+targetLevel,missing,cost:Object.fromEntries(Object.entries(cost)),...(legacyFoodMissing?{foodMissing:legacyFoodMissing}:{})});
}
function lockAdvice(state,id,eligibility,next) {
 const unlock=NEW_BUILDINGS[id]?.unlockLevel || (id==='dock'?4:id==='market'?2:1);
 if(amount(state.buildings.townhall?.level)<unlock)return {text:`${name(id)} odblokuje się na poziomie ${unlock} Ratusza.`,target:'townhall'};
 if(eligibility.code==='townhall-population')return {text:`Ratusz ${next} wymaga co najmniej ${n(eligibility.populationRequired)} mieszkańców; masz ${n(eligibility.populationCurrent)}. Zadbaj o łóżka, wyżywienie i szczęście, aby przyciągnąć kolejne osoby.`,target:'house'};
 if(id!=='townhall'&&next>amount(state.buildings.townhall?.level))return {text:`Najpierw rozbuduj Ratusz do poziomu ${next}. Jego poziom wyznacza limit tego budynku.`,target:'townhall'};
 if((state.premiumServices||[]).some(p=>p.building===id))return {text:'Poczekaj na zakończenie kupionej rozbudowy tego budynku.',target:id};
 return {text:'Zajęte są miejsca budowy lub kolejka. Sprawdź rozpoczęte prace i poczekaj na zwolnienie miejsca.',target:'townhall'};
}
function englishQuestion(state,input,options) {
 const text=fold(input),target=Object.entries(aliases).find(([id,pattern])=>matches(text,pattern)||matches(text,fold(EN_BUILDING_NAMES[id]).replaceAll(' ','\\s+')))?.[0];
 const resource=Object.entries(resourceAliases).find(([id,pattern])=>matches(text,pattern)||matches(text,fold(EN_GOODS[id]).replaceAll(' ','\\s+')))?.[0];
 const upgrading=matches(text,'upgrade\\w*|build\\w*|expand\\w*|level\\w*|rozbud\\w*|ulepsz\\w*');
 if(target&&(upgrading||!resource))return developmentGuidance(state,{...options,goal:target,language:'en'});
 if(matches(text,'why|another|alternative|faster|refresh|continue')&&options.goal)return developmentGuidance(state,{...options,language:'en'});
 const base=developmentGuidance(state,{language:'en'});
 if(matches(text,'food|feed\\w*|satiety|hunger|meal\\w*|jedzeni\\w*|wyzywieni\\w*')){
  if(base.kind==='food')return base;
  return {...base,kind:'food',goal:null,title:'Goal: maintain residents’ meals',text:'The protected food reserve is currently covered. Preserve serving variety and continuous production.',steps:[step('Review food priorities, enabled products and serving limits.','warehouse','food'),step('Maintain the production and collection of the food types your residents require.','farm')]};
 }
 if(matches(text,'transport|carrier\\w*|deliver\\w*|priorit\\w*'))return {...base,kind:'transport',goal:null,title:'Goal: keep transport moving',text:`The Warehouse has ${n(state.buildings.warehouse.workers)} assigned carriers.`,steps:[step('Review carrier staffing and workers still walking to the Warehouse.','warehouse','workers'),step('Set collection and delivery priorities while preserving food deliveries.','warehouse','priorities')]};
 if(matches(text,'worker\\w*|resident\\w*|people|staff|assign\\w*'))return {...base,kind:'workers',goal:null,title:'Goal: assign available residents',text:`There are ${n(freeWorkers(state))} residents currently available for assignment.`,steps:[step('Review available residents and their current occupations.','house','workers'),step('Assign them to the production or transport needed for your current goal; preserve food staffing.','house','workers')]};
 if(resource){const choice=producerFor(state,resource),available=resource==='coins'?amount(state.resources.coins):centralAvailable(state,resource),steps=[];
  if(choice){const [,recipe]=choice;steps.push(step(`Review staffing for ${EN_GOODS[resource]} in the ${EN_BUILDING_NAMES[recipe.building]}.`,recipe.building));steps.push(step('Supply required inputs and arrange collection of finished products.','warehouse','priorities'));}
  else if(resource==='coins')steps.push(step(`A first timely minigame win gives a ${n(expeditionRoundReward(1,31))}-coin pot. Cash it out to add it to your treasury; rewards depend on result and time.`,'expeditions'),step('Keep essential food workers employed while preparing the next upgrade.','house','workers'));
  else steps.push(step('Review building unlock levels and Academy discoveries.','academy'),step('Preserve protected food stocks while preparing the missing production chain.','warehouse','food'));
  return {...base,kind:'resource',goal:null,title:`Goal: ${EN_GOODS[resource]}`,text:`Central stock above protected reserves: ${n(Math.floor(available))} units.`,steps};
 }
 return {...base,kind:'unknown',goal:null,title:'Tell me your goal',text:'Ask about a building upgrade, production, food, workers or transport. For example: “Upgrade the Port” or “I need more planks”.',steps:[]};
}
function resourceAdvice(state,resource,required=1,budget={free:freeWorkers(state)},seen=new Set()) {
 if(seen.has(resource))return [];
 seen.add(resource);
 if(resource==='sourMilk')return [step('Kwaśne mleko powstaje z surowego mleka po 72 godzinach łącznego pobytu w Magazynie centralnym. Transport i magazyn lokalny nie zużywają tego czasu. Sprawdź ilość surowego mleka i miejsce na kwaśne mleko.','warehouse'),step('Surowe mleko pozyskasz w Gospodarstwie od poziomu 2.','farm')];
 if(resource==='coins')return [step(`Brakuje monet: ${n(required)}. Pracujący mieszkańcy zapewniają wpływy; sprawdź też dostępne zadania i nagrody. Nie zwalniaj pracowników potrzebnych przy jedzeniu.`, 'townhall')];
 const choice=producerFor(state,resource);
 if(!choice)return [step(`Nie masz teraz dostępnej produkcji: ${goodName(resource)}. Sprawdź odblokowanie budynku lub odkrycia w Akademii.`, 'academy')];
 const [recipeId,recipe]=choice,building=recipe.building,local=localStorageStatus(state,building),waiting=amount(local.stock[resource]);
 const steps=[];
 if(waiting>0)steps.push(step(`${name(building)}: ${n(waiting)} szt. produktu „${goodName(resource)}” czeka w magazynie lokalnym. Najpierw zapewnij odbiór do centrali.`, 'warehouse','priorities'));
 const toMake=Math.max(0,required-waiting),batches=Math.ceil(toMake/recipe.outputs[resource]);
 if(!batches)return steps;
 for(const [input,q] of Object.entries(recipe.inputs)) {
  const need=Math.max(0,q*batches-amount(local.stock[input])-centralAvailable(state,input));
  if(need)steps.push(...resourceAdvice(state,input,need,budget,seen));
  steps.push(step(`${name(building)}: do ${n(batches)} partii potrzebujesz ${n(q*batches)} szt. produktu „${goodName(input)}”. Lokalnie masz ${n(local.stock[input])}, w centrali ponad rezerwę ${n(centralAvailable(state,input))}.`,building));
 }
 const assigned=productionAssignments(state,building).find(x=>x.recipeId===recipeId)?.workers || 0;
 const hire=Math.min(budget.free,hireRoom(state,building,recipeId),Math.max(0,2-assigned));
 if(hire>0){budget.free-=hire;steps.push(step(`Przydziel ${freePeople(hire)} do budynku ${name(building)}, do produktu „${goodName(resource)}”. Przydział do produktu ustaw po przydziale do budynku.`,building));}
 else if(!assigned)steps.push(step(`Ustaw obsadę produktu „${goodName(resource)}” w budynku ${name(building)}. Nie ma teraz wolnych miejsc lub osób na dodatkowy przydział; nie zabieraj obsady zapewniającej jedzenie.`,building));
 else steps.push(step(`${name(building)} ma ${people(assigned)} przy produkcie „${goodName(resource)}”. Sprawdź dostawy i odbiór; zwiększenie obsady ma sens dopiero po zapewnieniu surowców.`,building));
 return steps;
}
// All direct construction materials are reserved in this *planning* ledger
// before inputs are assigned to production. A board cannot use the same wood
// both as a construction material and as input for the sawmill.
function productionPlan(state,cost,budget) {
 const central=Object.fromEntries(Object.keys(GOODS).map(id=>[id,Math.max(0,centralAvailable(state,id)-amount(cost[id]))]));
 const local=structuredClone(state.provisions?.localStock || {}),rows=new Map(),waiting=new Map(),unavailable=new Map(),arrivals={};
 const incoming={...state.pendingDeliveries};
 for(const trip of Object.values(state.haulTrips||{}).flat())if(['producer','pending','marketOutbound','dockOutbound'].includes(trip.kind))incoming[trip.resource]=amount(incoming[trip.resource])+amount(trip.amount);
 const useIncoming=(resource,quantity)=>{const used=Math.min(quantity,amount(incoming[resource]));incoming[resource]=amount(incoming[resource])-used;if(used)arrivals[resource]=amount(arrivals[resource])+used;return used;};
 const make=(resource,quantity,path=[])=>{
  quantity-=useIncoming(resource,quantity);
  if(quantity<=1e-7)return;
  if(path.includes(resource)){unavailable.set(resource,'Sprawdź łańcuch produkcji.');return;}
  const choice=producerFor(state,resource);
  if(!choice){unavailable.set(resource,'Sprawdź odblokowanie budynku lub odkrycia w Akademii.');return;}
  const [recipeId,recipe]=choice,building=recipe.building;
  local[building] ||= {};
  const existing=amount(local[building][resource]),collected=Math.min(quantity,existing);
  if(collected){local[building][resource]=existing-collected;const key=`${building}:${resource}`;waiting.set(key,{building,resource,quantity:(waiting.get(key)?.quantity||0)+collected,stock:amount(state.provisions?.localStock?.[building]?.[resource])});quantity-=collected;}
  if(quantity<=1e-7)return;
  const batches=Math.ceil(quantity/recipe.outputs[resource]-1e-8),inputs={};
  for(const [input,q] of Object.entries(recipe.inputs)){
   const total=q*batches,here=Math.min(total,amount(local[building][input]));local[building][input]=amount(local[building][input])-here;
   const fromCentral=Math.min(total-here,amount(central[input]));central[input]-=fromCentral;
   const fromIncoming=useIncoming(input,Math.max(0,total-here-fromCentral));
   inputs[input]={required:total,local:here,central:fromCentral,incoming:fromIncoming,make:Math.max(0,total-here-fromCentral-fromIncoming)};
   make(input,inputs[input].make,[...path,resource]);
  }
  const row=rows.get(recipeId)||{recipeId,building,resource,batches:0,outputs:0,inputs:{}};
  row.batches+=batches;row.outputs+=batches*recipe.outputs[resource];
  for(const [input,usage] of Object.entries(inputs)){row.inputs[input] ||= {required:0,local:0,central:0,incoming:0,make:0};for(const key of Object.keys(usage))row.inputs[input][key]+=usage[key];}
  rows.set(recipeId,row);
  central[resource]=(central[resource]||0)+Math.max(0,batches*recipe.outputs[resource]-quantity);
 };
 for(const [resource,q] of Object.entries(cost)){if(resource==='coins')continue;make(resource,Math.max(0,q-centralAvailable(state,resource)));}
 const steps=[];
 for(const [resource,q] of Object.entries(arrivals))steps.push(step(`${n(q)} szt. produktu „${goodName(resource)}” jest w drodze do centrali lub czeka na przyjęcie. Zapewnij miejsce i dokończenie dostawy, zanim zlecisz nową produkcję tej ilości.`, 'warehouse','priorities'));
 for(const entry of waiting.values())steps.push(step(`${name(entry.building)}: ${n(entry.stock)} szt. produktu „${goodName(entry.resource)}” czeka lokalnie. Do tego planu wykorzystasz ${n(entry.quantity)} szt.; zapewnij odbiór do centrali.`, 'warehouse','priorities'));
 for(const [resource,reason] of unavailable)steps.push(step(`Nie masz teraz dostępnej produkcji: ${goodName(resource)}. ${reason}`,'academy'));
 for(const row of rows.values()){
  steps.push(step(`${name(row.building)}: wytwórz łącznie ${n(row.outputs)} szt. produktu „${goodName(row.resource)}” na materiały budowy i surowce dla dalszej produkcji.`,row.building));
  for(const [input,usage] of Object.entries(row.inputs))steps.push(step(`Do tego potrzeba ${n(usage.required)} szt. produktu „${goodName(input)}”: ${n(usage.local)} wykorzystasz lokalnie, ${n(usage.central)} z wolnej centrali, ${n(usage.incoming)} z dostaw w drodze, ${n(usage.make)} trzeba wytworzyć. Materiały samej budowy są liczone osobno.`,row.building));
  const assigned=productionAssignments(state,row.building).find(x=>x.recipeId===row.recipeId)?.workers || 0;
  const hire=Math.max(0,Math.min(budget.free,hireRoom(state,row.building,row.recipeId)-(budget.hired?.[row.building]||0),Math.max(0,2-assigned)));
  if(hire){budget.hired ||= {};budget.hired[row.building]=(budget.hired[row.building]||0)+hire;}
  if(hire){budget.free-=hire;steps.push(step(`Przydziel ${freePeople(hire)} do budynku ${name(row.building)}, do produktu „${goodName(row.resource)}”. Przydział do produktu ustaw po przydziale do budynku.`,row.building));}
  else if(!assigned)steps.push(step(`Sprawdź obsadę produktu „${goodName(row.resource)}” w budynku ${name(row.building)}. Brak wolnych osób lub miejsc na dodatkowy przydział. Nie zabieraj obsady potrzebnej przy jedzeniu.`,row.building));
  else steps.push(step(`${name(row.building)} ma ${people(assigned)} przy produkcie „${goodName(row.resource)}”. Zapewnij surowce i odbiór, aby ta obsada mogła pracować.`,row.building));
 }
 return {steps,needs:Object.fromEntries(rows),arrivals};
}
function alternateRoute(state,result,cost) {
 if(result.premium?.affordable)return {...result,text:`Inna droga: opcjonalny pakiet budynku za ${n(result.premium.coins)} monet, z budową ${n(result.premium.seconds)} s. Omija zbieranie własnych materiałów. To osobna płatna usługa; zwykły plan nadal znajdziesz poniżej. ${result.text}`,alternative:{kind:'premium',coins:result.premium.coins,seconds:result.premium.seconds}};
 const spendingBudget=Math.max(0,amount(state.resources.coins)-amount(cost.coins));
 for(const row of [...result.missing].filter(x=>x.id!=='coins').sort((a,b)=>(GOODS[b.id]?.category||0)-(GOODS[a.id]?.category||0))){
  const quote=quoteTrade(state,{direction:'buy',resource:row.id,amount:Math.ceil(row.missing)});
  if(quote.ok&&quote.price<=spendingBudget){const first=step(`Kup w Porcie ${n(quote.amount)} szt. produktu „${goodName(row.id)}” za ${n(quote.price)} monet. Statek płynie 5 minut; potem potrzebny jest rozładunek i transport. Najpierw sprawdź obsadę Portu.`, 'dock');return {...result,text:`Inna droga: zastąp produkcję brakującego produktu zakupem w Porcie. Koszt ${n(quote.price)} monet nie narusza monet potrzebnych na samą rozbudowę. Po dostawie przelicz plan. ${result.text}`,steps:[first,...result.steps],alternative:{kind:'trade',resource:row.id,quantity:quote.amount,coins:quote.price}};}
 }
 return {...result,text:`Inna droga wymaga dodatkowych zapasów lub monet: obecnie nie ma dostępnego zakupu całej brakującej partii z zachowaniem monet na budowę. Możesz porównać wymianę towarów tej samej kategorii na Targu (prowizja 10%) z opcjonalnym pakietem budynku. Nie wydawaj chronionej rezerwy. ${result.text}`,alternative:{kind:'unavailable'}};
}
function upgradePlan(state,id,options) {
 const result=base(state,{kind:'upgrade',goal:id,title:`Cel: rozbudowa — ${name(id)}`}),building=state.buildings[id];
 if(id==='theatre')return {...result,text:'Teatr nie ma kolejnych poziomów budynku. Rozwijasz jego dekoracje i organizujesz wizyty mieszkańców.',steps:[step('Otwórz plac Teatru i wybierz dekoracje.','theatre'),step('Sprawdź mieszkańców dostępnych do wizyty i wybierz uczestników.','theatre')]};
 if(!building)return {...result,kind:'unavailable',text:'Tego budynku nie ma na tej wyspie.',steps:[]};
 const project=(state.constructionProjects||[]).find(p=>p.building===id);
 if(project){
  result.targetLevel=project.targetLevel;
  const estimate=constructionScheduleEstimate(state,project,id),seconds=estimate.completionTotal??estimate.total;
  return {...result,text:`Rozbudowa do poziomu ${n(project.targetLevel)} już trwa${project.stage==='planned'?' i czeka na materiały':''}.`,steps:[step('Sprawdź etap i postęp rozpoczętej rozbudowy.',id),...(project.stage==='building'?[step('W czasie budowy przygotuj materiały do kolejnego celu; zachowaj rezerwę jedzenia.','warehouse','priorities')]:[step('Sprawdź obsadę tragarzy i priorytet budowy. Nie zamawiaj kolejnego poziomu, jeśli chcesz najpierw ukończyć obecny.','warehouse','priorities')])],estimate:{seconds:Number.isFinite(seconds)?seconds:null,text:Number.isFinite(seconds)?`Około ${duration(seconds)} do końca przy obecnej obsadzie i dostawach.`:'Brakuje warunków do wiarygodnego oszacowania końca. Sprawdź materiały, tragarzy i wcześniejsze budowy.'},explanation:'Plan uwzględnia już przyjętą budowę, a nie koszt następnego poziomu.'};
 }
 const next=plannedLevel(state,id)+1;
 result.targetLevel=next;
 if(next>ALL_BUILDINGS[id].maxLevel)return {...result,text:'Ten budynek osiągnął maksymalny poziom.',steps:[step('Sprawdź dostępne funkcje budynku.',id),step('Sprawdź dostępne badania zwiększające wydajność wyspy.','academy')]};
 const eligibility=upgradeEligibility(state,id),unlock=NEW_BUILDINGS[id]?.unlockLevel||1;
 if(!eligibility.ok||state.buildings.townhall.level<unlock){const lock=lockAdvice(state,id,eligibility,next);return {...result,kind:'locked',text:lock.text,steps:[step(lock.text,lock.target),step('Przygotuj dostawy do wskazanego celu; zachowaj obsadę i rezerwę jedzenia.','warehouse','priorities')],explanation:'Najpierw trzeba spełnić warunek odblokowania. Doradca nie omija limitów ani zajętej kolejki.'};}
 const cost=buildingCost(state,id),missing=Object.entries(cost).map(([resource,q])=>({id:resource,required:q,available:resource==='coins'?amount(state.resources.coins):centralAvailable(state,resource)})).map(row=>({...row,missing:Math.max(0,row.required-row.available)})).filter(row=>row.missing>1e-7);
 result.missing=missing;
 result.text=`Następny poziom: ${n(next)}. ${missing.length?`Brakuje w centrali: ${missing.map(row=>`${goodName(row.id)} ${n(row.missing)}`).join(', ')}.`:'Materiały i monety są dostępne.'}`;
 result.cost=Object.fromEntries(Object.entries(cost));
 const reserve=foodReservePlan(state,{available:resource=>centralUnreserved(state,resource)});
 if(!reserve.complete)result.steps.push(step('Najpierw uzupełnij chronioną rezerwę jedzenia i wymaganą różnorodność.','warehouse','food'));
 if(state.ruleset!==32&&cost.foodQuote?.ok===false){result.text+=` Ponadto brakuje ${n(cost.foodQuote.missingSatiety)} punktów sytości na budowę ponad rezerwę.`;result.steps.push(step(`Zapewnij ${n(cost.foodQuote.missingSatiety)} dodatkowych punktów sytości na budowę; to osobny koszt od posiłków mieszkańców.`, 'warehouse','food'));result.foodMissing=cost.foodQuote.missingSatiety;}
 const budget={free:freeWorkers(state),hired:{}},warehouseCrew=amount(state.buildings.warehouse?.workers),room=hireRoom(state,'warehouse');
 if(!warehouseCrew&&budget.free>0&&room>0){budget.free--;budget.hired.warehouse=1;result.steps.push(step('Przydziel 1 wolną osobę do Magazynu jako tragarza. Dojście zajmuje do 2 minut.','warehouse','workers'));}
 else if(!warehouseCrew)result.steps.push(step('Zapewnij co najmniej jednego tragarza w Magazynie. Najpierw sprawdź wolnych mieszkańców; nie zdejmuj obsady potrzebnej do karmienia wyspy.','warehouse','workers'));
 const supply=productionPlan(state,cost,budget);result.steps.push(...supply.steps);result.productionNeeds=supply.needs;result.incomingForPlan=supply.arrivals;
 const coinShortfall=missing.find(row=>row.id==='coins');if(coinShortfall)result.steps.push(...resourceAdvice(state,'coins',coinShortfall.missing,budget));
 if(missing.length||state.ruleset!==32&&cost.foodQuote?.ok===false){result.steps.push(step('W priorytetach transportu ustaw odbiór potrzebnych produktów i dostawy do budowy. Zachowaj obsługę jedzenia.','warehouse','priorities'));result.estimate={seconds:null,text:'Pełny czas zależy od zebrania materiałów i wolnej obsady. Po ich zapewnieniu przeliczę transport i budowę.'};}
 else {
  const estimate=constructionScheduleEstimate(state,cost,id),seconds=estimate.completionTotal??estimate.total;
  result.estimate={seconds:Number.isFinite(seconds)?seconds:null,text:Number.isFinite(seconds)?`Około ${duration(seconds)}: transport, kolejka i budowa przy obecnej obsadzie. To szacunek od zlecenia rozbudowy.`:'Czas nie jest jeszcze dostępny: tragarze muszą dotrzeć do pracy lub zakończyć wcześniejsze dostawy.'};
 }
 result.steps.push(step(`Otwórz ${name(id)} i sprawdź koszt poziomu ${n(next)} przed zatwierdzeniem rozbudowy.`,id));
 result.explanation='Najpierw sprawdzam odblokowanie i istniejące budowy, następnie zasoby ponad chronioną rezerwę, łańcuch produkcji i transport. Dodatkowe przydziały łącznie nie przekraczają liczby wolnych osób. Nie odbieram pracowników innym budynkom.';
 result.limitations=['To plan kolejnych kroków dla aktualnego stanu, bez gwarancji matematycznie najkrótszej drogi. Czas zbierania zasobów, kolejne decyzje gracza i zmiany obsady mogą zmienić wynik.'];
 const premium=quotePremiumBuilding(state,id,{buildingCost});
 if(premium.ok)result.premium={coins:premium.coins,seconds:premium.buildSeconds,affordable:amount(state.resources.coins)>=premium.coins,text:`Opcjonalnie: pakiet budynku za ${n(premium.coins)} monet, budowa ${n(premium.buildSeconds)} s. ${amount(state.resources.coins)>=premium.coins?'Masz wystarczająco monet.':'Obecnie brakuje monet na ten pakiet.'} To osobna usługa, nie warunek zwykłej rozbudowy.`};
 return options.alternative?alternateRoute(state,result,cost):result;
}
export function advisorPlan(state,input='',options={}) {
 if(!String(input||'').trim())return advisorSuggestion(state,options);
 if(options.language==='en')return englishQuestion(planningView(state),input,options);
 const world=snapshot(state),text=fold(input);
 const target=Object.entries(aliases).find(([,pattern])=>matches(text,pattern))?.[0];
 const resource=Object.entries(resourceAliases).find(([,pattern])=>matches(text,pattern))?.[0];
 const followup=matches(text,'dlaczego|czemu|inaczej|inna\\w*|alternatyw\\w*|szybciej|dalej|przelicz\\w*|odswiez\\w*');
 const upgrading=matches(text,'rozbud\\w*|ulepsz\\w*|wybud\\w*|budow\\w*|awans\\w*|poziom\\w*');
 const topicQuestion=!upgrading&&matches(text,'jedzeni\\w*|wyzywieni\\w*|sytosc|glod\\w*|karm\\w*|priorytet\\w*|transport\\w*|dostaw\\w*|pracownik\\w*|mieszkanc\\w*|przydziel\\w*|woln\\w*');
 if(target&&!topicQuestion&&(upgrading||!resource)||!target&&!resource&&!topicQuestion&&followup&&options.goal&&ADVISOR_BUILDING_NAMES[options.goal])return upgradePlan(world,target||options.goal,{...options,alternative:options.alternative||matches(text,'inaczej|inna\\w*|alternatyw\\w*')});
 if(matches(text,'jedzeni\\w*|wyzywieni\\w*|sytosc|glod\\w*|karm\\w*'))return developmentGuidance(world,{...options,topic:'food'});
 if(matches(text,'priorytet\\w*|transport\\w*|dostaw\\w*'))return developmentGuidance(world,{...options,topic:'transport'});
 if(matches(text,'pracownik\\w*|mieszkanc\\w*|przydziel\\w*|woln\\w*'))return developmentGuidance(world,{...options,topic:'workers'});

 if(resource){const steps=resourceAdvice(world,resource);if(steps.length<2)steps.push(step('Sprawdź dowóz surowców i odbiór produktu w Magazynie. Zachowaj chronioną rezerwę jedzenia.','warehouse','priorities'));return base(world,{kind:'resource',resource,title:`Cel: ${goodName(resource)}`,text:`W centrali ponad rezerwy masz ${n(Math.floor(resource==='coins'?world.resources.coins:centralAvailable(world,resource)))} szt. Jeśli podasz budynek do rozbudowy, wyliczę jego pełne potrzeby.`,steps,explanation:'Podana ilość w centrali nie obejmuje lokalnych magazynów i nie pozwala wydać chronionej rezerwy jedzenia.'});}
 if(!text.trim())return suggestion(world);
 return base(world,{kind:'unknown',title:'Doprecyzuj cel',text:'Pomogę w rozbudowie budynków, produkcji, wyżywieniu, obsadzie i transporcie. Napisz na przykład „Chcę rozbudować Port” albo „Potrzebuję więcej desek”.',alternatives:['Chcę rozbudować Port','Jak zapewnić jedzenie?','Jak ustawić priorytety transportu?']});
}
