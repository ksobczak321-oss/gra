// Read-only advice. Model getters can normalize sidecars, so every public entry
// works on its own snapshot and never receives the live world for an action.
import { ALL_BUILDINGS, buildingCost, upgradeEligibility, workerLimit, freeWorkers } from './harborlight-v1-state.js?v=frontend-v32-16';
import { centralAvailable, centralUnreserved } from './harborlight-v1-inventory.js?v=frontend-v32-16';
import { constructionScheduleEstimate, activeWorkerIndices, plannedLevel, warehouseLimits, warehouseUsed, quoteTrade } from './harborlight-v1-logistics.js?v=frontend-v32-16';
import { GOODS, NEW_BUILDINGS, RECIPE_CATALOG, availableRecipes, productionAssignments, crewCapacity, localStorageStatus, foodReservePlan } from './harborlight-v1-provisions.js?v=frontend-v32-16';
import { quotePremiumBuilding } from './harborlight-v1-activities.js?v=frontend-v32-16';

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
 return base(state,{kind:'food',title:'Najpierw zadbaj o jedzenie',text:missing>0?`Do chronionej rezerwy na godzinę brakuje ${n(missing)} punktów sytości.`:`Zapasy pokrywają sytość, ale brakuje wymaganej różnorodności: ${reserve.requiredTypes} produktów.`,steps:[step('Sprawdź wyżywienie i wydawanie dostępnych produktów. Chronionej rezerwy nie przeznaczaj na rozbudowę.','warehouse','food'),step('Zapewnij zbiór zboża i warzyw w Gospodarstwie; Młyn może przerabiać zboże na pożywniejszą mąkę.','farm')],explanation:`Rezerwa wynosi ${n(reserve.requiredSatiety)} punktów sytości na godzinę. Od poziomu 3 Ratusza potrzebne są dwa produkty, od 8 — trzy, każdy z udziałem co najmniej 20%.`,reserve});
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
export function advisorSuggestion(state) { return suggestion(snapshot(state)); }
function lockAdvice(state,id,eligibility,next) {
 const unlock=NEW_BUILDINGS[id]?.unlockLevel || (id==='dock'?4:id==='market'?2:1);
 if(amount(state.buildings.townhall?.level)<unlock)return {text:`${name(id)} odblokuje się na poziomie ${unlock} Ratusza.`,target:'townhall'};
 if(eligibility.code==='townhall-population')return {text:`Ratusz ${next} wymaga co najmniej ${n(eligibility.populationRequired)} mieszkańców; masz ${n(eligibility.populationCurrent)}. Zadbaj o łóżka, wyżywienie i szczęście, aby przyciągnąć kolejne osoby.`,target:'house'};
 if(id!=='townhall'&&next>amount(state.buildings.townhall?.level))return {text:`Najpierw rozbuduj Ratusz do poziomu ${next}. Jego poziom wyznacza limit tego budynku.`,target:'townhall'};
 if((state.premiumServices||[]).some(p=>p.building===id))return {text:'Poczekaj na zakończenie kupionej rozbudowy tego budynku.',target:id};
 return {text:'Zajęte są miejsca budowy lub kolejka. Sprawdź rozpoczęte prace i poczekaj na zwolnienie miejsca.',target:'townhall'};
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
 if(id==='theatre')return {...result,text:'Teatr nie ma kolejnych poziomów budynku. Rozwijasz jego dekoracje i organizujesz wizyty mieszkańców.',steps:[step('Otwórz plac Teatru i wybierz dekoracje.','theatre')]};
 if(!building)return {...result,kind:'unavailable',text:'Tego budynku nie ma na tej wyspie.',steps:[]};
 const project=(state.constructionProjects||[]).find(p=>p.building===id);
 if(project){
  const estimate=constructionScheduleEstimate(state,project,id),seconds=estimate.completionTotal??estimate.total;
  return {...result,text:`Rozbudowa do poziomu ${n(project.targetLevel)} już trwa${project.stage==='planned'?' i czeka na materiały':''}.`,steps:[step('Sprawdź etap i postęp rozpoczętej rozbudowy.',id),...(project.stage==='building'?[]:[step('Sprawdź obsadę tragarzy i priorytet budowy. Nie zamawiaj kolejnego poziomu, jeśli chcesz najpierw ukończyć obecny.','warehouse','priorities')])],estimate:{seconds:Number.isFinite(seconds)?seconds:null,text:Number.isFinite(seconds)?`Około ${duration(seconds)} do końca przy obecnej obsadzie i dostawach.`:'Brakuje warunków do wiarygodnego oszacowania końca. Sprawdź materiały, tragarzy i wcześniejsze budowy.'},explanation:'Plan uwzględnia już przyjętą budowę, a nie koszt następnego poziomu.'};
 }
 const next=plannedLevel(state,id)+1;
 if(next>ALL_BUILDINGS[id].maxLevel)return {...result,text:'Ten budynek osiągnął maksymalny poziom.',steps:[step('Sprawdź dostępne funkcje budynku.',id)]};
 const eligibility=upgradeEligibility(state,id),unlock=NEW_BUILDINGS[id]?.unlockLevel||1;
 if(!eligibility.ok||state.buildings.townhall.level<unlock){const lock=lockAdvice(state,id,eligibility,next);return {...result,kind:'locked',text:lock.text,steps:[step(lock.text,lock.target)],explanation:'Najpierw trzeba spełnić warunek odblokowania. Doradca nie omija limitów ani zajętej kolejki.'};}
 const cost=buildingCost(state,id),missing=Object.entries(cost).map(([resource,q])=>({id:resource,required:q,available:resource==='coins'?amount(state.resources.coins):centralAvailable(state,resource)})).map(row=>({...row,missing:Math.max(0,row.required-row.available)})).filter(row=>row.missing>1e-7);
 result.missing=missing;
 result.text=`Następny poziom: ${n(next)}. ${missing.length?`Brakuje w centrali: ${missing.map(row=>`${goodName(row.id)} ${n(row.missing)}`).join(', ')}.`:'Materiały i monety są dostępne.'}`;
 result.cost=Object.fromEntries(Object.entries(cost));
 const reserve=foodReservePlan(state,{available:resource=>centralUnreserved(state,resource)});
 if(!reserve.complete)result.steps.push(step('Najpierw uzupełnij chronioną rezerwę jedzenia i wymaganą różnorodność.','warehouse','food'));
 if(cost.foodQuote?.ok===false){result.text+=` Ponadto brakuje ${n(cost.foodQuote.missingSatiety)} punktów sytości na budowę ponad rezerwę.`;result.steps.push(step(`Zapewnij ${n(cost.foodQuote.missingSatiety)} dodatkowych punktów sytości na budowę; to osobny koszt od posiłków mieszkańców.`, 'warehouse','food'));result.foodMissing=cost.foodQuote.missingSatiety;}
 const budget={free:freeWorkers(state),hired:{}},warehouseCrew=amount(state.buildings.warehouse?.workers),room=hireRoom(state,'warehouse');
 if(!warehouseCrew&&budget.free>0&&room>0){budget.free--;budget.hired.warehouse=1;result.steps.push(step('Przydziel 1 wolną osobę do Magazynu jako tragarza. Dojście zajmuje do 2 minut.','warehouse','workers'));}
 else if(!warehouseCrew)result.steps.push(step('Zapewnij co najmniej jednego tragarza w Magazynie. Najpierw sprawdź wolnych mieszkańców; nie zdejmuj obsady potrzebnej do karmienia wyspy.','warehouse','workers'));
 const supply=productionPlan(state,cost,budget);result.steps.push(...supply.steps);result.productionNeeds=supply.needs;result.incomingForPlan=supply.arrivals;
 const coinShortfall=missing.find(row=>row.id==='coins');if(coinShortfall)result.steps.push(...resourceAdvice(state,'coins',coinShortfall.missing,budget));
 if(missing.length||cost.foodQuote?.ok===false){result.steps.push(step('W priorytetach transportu ustaw odbiór potrzebnych produktów i dostawy do budowy. Zachowaj obsługę jedzenia.','warehouse','priorities'));result.estimate={seconds:null,text:'Pełny czas zależy od zebrania materiałów i wolnej obsady. Po ich zapewnieniu przeliczę transport i budowę.'};}
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
 const world=snapshot(state),text=fold(input);
 const target=Object.entries(aliases).find(([,pattern])=>matches(text,pattern))?.[0];
 const resource=Object.entries(resourceAliases).find(([,pattern])=>matches(text,pattern))?.[0];
 const followup=matches(text,'dlaczego|czemu|inaczej|inna\\w*|alternatyw\\w*|szybciej|dalej|przelicz\\w*|odswiez\\w*');
 const upgrading=matches(text,'rozbud\\w*|ulepsz\\w*|wybud\\w*|budow\\w*|awans\\w*|poziom\\w*');
 const topicQuestion=!upgrading&&matches(text,'jedzeni\\w*|wyzywieni\\w*|sytosc|glod\\w*|karm\\w*|priorytet\\w*|transport\\w*|dostaw\\w*|pracownik\\w*|mieszkanc\\w*|przydziel\\w*|woln\\w*');
 if(target&&!topicQuestion&&(upgrading||!resource)||!target&&!resource&&!topicQuestion&&followup&&options.goal&&ADVISOR_BUILDING_NAMES[options.goal])return upgradePlan(world,target||options.goal,{...options,alternative:options.alternative||matches(text,'inaczej|inna\\w*|alternatyw\\w*')});
 if(matches(text,'jedzeni\\w*|wyzywieni\\w*|sytosc|glod\\w*|karm\\w*'))return foodAdvice(world)||base(world,{kind:'food',title:'Wyżywienie mieszkańców',text:'Chroniona rezerwa na godzinę jest obecnie pokryta. Sprawdź też różnorodność rzeczywiście wydawanych posiłków i stałą produkcję.',steps:[step('Sprawdź kolejność, limity i wydawanie jedzenia.','warehouse','food')],reserve:foodReservePlan(world)});
 if(matches(text,'priorytet\\w*|transport\\w*|dostaw\\w*'))return base(world,{kind:'transport',title:'Ustaw transport pod cel',text:`W Magazynie pracuje ${n(world.buildings.warehouse?.workers)} tragarzy, z czego ${n(activeWorkerIndices(world,'warehouse').length)} dotarło do pracy.`,steps:[step('Sprawdź obsadę, odbiór produktów oraz priorytety transportu. Zachowaj dostawy potrzebne do karmienia mieszkańców.','warehouse','priorities')],explanation:'Te same osoby odbierają towary i dostarczają je do kolejnych etapów. Sam wysoki priorytet nie zastąpi pracowników, surowców ani miejsca w magazynie.'});
 if(matches(text,'pracownik\\w*|mieszkanc\\w*|przydziel\\w*|woln\\w*'))return base(world,{kind:'workers',title:'Mieszkańcy i praca',text:`Możesz teraz przydzielić do pracy ${people(freeWorkers(world))}. Osoby idące do pracy, wracające lub zajęte nauką mogą być niedostępne.`,steps:[step('Sprawdź wolnych mieszkańców i ich zajęcia.','house','workers')],alternatives:['Chcę rozbudować Port','Potrzebuję więcej desek']});

 if(resource)return base(world,{kind:'resource',title:`Cel: ${goodName(resource)}`,text:`W centrali ponad rezerwy masz ${n(Math.floor(resource==='coins'?world.resources.coins:centralAvailable(world,resource)))} szt. Jeśli podasz budynek do rozbudowy, wyliczę jego pełne potrzeby.`,steps:resourceAdvice(world,resource),explanation:'Podana ilość w centrali nie obejmuje lokalnych magazynów i nie pozwala wydać chronionej rezerwy jedzenia.'});
 if(!text.trim())return suggestion(world);
 return base(world,{kind:'unknown',title:'Doprecyzuj cel',text:'Pomogę w rozbudowie budynków, produkcji, wyżywieniu, obsadzie i transporcie. Napisz na przykład „Chcę rozbudować Port” albo „Potrzebuję więcej desek”.',alternatives:['Chcę rozbudować Port','Jak zapewnić jedzenie?','Jak ustawić priorytety transportu?']});
}
