// Ruleset32 physical production. No imports from state, residents or logistics.
// Timers remain in the host event loop; every job consumes local ingredients.
import { GOODS, MATERIAL_IDS, RECIPE_CATALOG, availableRecipes, productionAssignments, localStorageStatus, normalizeProvisions, withdrawMilk, depositMilk } from './harborlight-v1-provisions.js?v=frontend-v32-13';
const EPS=1e-7;
const amount=n=>Number.isFinite(n)?Math.max(0,n):0;
const whole=n=>Math.floor(amount(n));
const uid=p=>String(p?.personUid||`resident-${p?.id??'unknown'}`);
const cloneLots=lots=>(Array.isArray(lots)?lots:[]).filter(l=>amount(l.amount)>EPS).map(l=>({amount:amount(l.amount),centralSeconds:Math.min(259200,amount(l.centralSeconds))}));
export const developmentProducerIds=state=>[...new Set(Object.values(RECIPE_CATALOG).map(r=>r.building))].filter(id=>state.buildings?.[id]);
const local=(state,id)=>state.provisions.localStock[id]||=( {} );
export function normalizeDevelopmentLogistics(state,raw=state) {
 if(state.provisions?.version!==1)normalizeProvisions(state,raw);
 const src=raw.provisions||{},p=state.provisions;
 p.productionProgress=Object.fromEntries(Object.entries(src.productionProgress||{}).filter(([id])=>RECIPE_CATALOG[id]).map(([id,rows])=>[id,Object.fromEntries(Object.entries(rows||{}).slice(0,10000).map(([key,n])=>[key,Math.min(1,amount(n))]))]));
 p.localMilkLots=Object.fromEntries(Object.entries(src.localMilkLots||{}).filter(([id])=>state.buildings[id]).map(([id,lots])=>[id,cloneLots(lots)]));
 p.routeAssignments=Object.fromEntries(Object.entries(src.routeAssignments||{}).filter(([id])=>id.length<240).map(([id,r])=>[id,{workers:whole(r?.workers)}]));
 p.routeSequence=whole(src.routeSequence);
 for(const id of developmentProducerIds(state)) {
  const source=src.localStock?.[id]||{};p.localStock[id]=Object.fromEntries(MATERIAL_IDS.map(resource=>[resource,amount(source[resource])]));
  syncLocalMilk(state,id);syncReady(state,id);
 }
 return p;
}
function ensure(state) { if(!state.provisions?.productionProgress)normalizeDevelopmentLogistics(state);return state.provisions; }
function syncReady(state,id) {const outputs=new Set(availableRecipes(state,id).flatMap(r=>Object.keys(r.outputs)));state.buildings[id].ready=[...outputs].reduce((sum,r)=>sum+amount(local(state,id)[r]),0);}
function syncLocalMilk(state,id) {
 const p=state.provisions;p.localMilkLots||={};let lots=p.localMilkLots[id]||=[],actual=amount(local(state,id).rawMilk),represented=lots.reduce((s,l)=>s+l.amount,0);
 if(represented>actual+EPS){let left=represented-actual;lots.sort((a,b)=>b.centralSeconds-a.centralSeconds);for(const l of lots){const q=Math.min(left,l.amount);l.amount-=q;left-=q;if(left<=EPS)break;}lots=lots.filter(l=>l.amount>EPS);}
 else if(actual>represented+EPS)lots.push({amount:actual-represented,centralSeconds:0});p.localMilkLots[id]=lots;
}
export function takeLocalGoods(state,building,resource,requested) {
 ensure(state);const stock=local(state,building),used=Math.min(amount(requested),amount(stock[resource]));let milkLots=[];
 if(resource==='rawMilk'){syncLocalMilk(state,building);let left=used;for(const l of state.provisions.localMilkLots[building]){const q=Math.min(left,l.amount);if(q>EPS){milkLots.push({amount:q,centralSeconds:l.centralSeconds});l.amount-=q;left-=q;}if(left<=EPS)break;}state.provisions.localMilkLots[building]=state.provisions.localMilkLots[building].filter(l=>l.amount>EPS);}
 stock[resource]=Math.max(0,amount(stock[resource])-used);syncReady(state,building);return {amount:used,milkLots};
}
export function putLocalGoods(state,building,resource,quantity,milkLots=[]) {
 ensure(state);const stock=local(state,building);stock[resource]=amount(stock[resource])+amount(quantity);
 if(resource==='rawMilk'){state.provisions.localMilkLots[building]||=[];state.provisions.localMilkLots[building].push(...cloneLots(milkLots));syncLocalMilk(state,building);}syncReady(state,building);
}
export function localIncoming(state,building,resource=null) {return Object.values(state.haulTrips||{}).flat().filter(t=>['producerInput','directRoute'].includes(t.kind)&&t.target===building&&(!resource||t.resource===resource)).reduce((s,t)=>s+amount(t.amount),0);}
export function localReceivingRoom(state,building,resource) {
 ensure(state);const status=localStorageStatus(state,building);return Math.max(0,Math.floor(Math.min(status.perProduct-amount(status.stock[resource])-localIncoming(state,building,resource),status.total-status.used-localIncoming(state,building))));
}
export function developmentProductionBlocked(state,building,recipeId=null) {
 ensure(state);const rows=productionAssignments(state,building).filter(r=>r.workers>0&&(!recipeId||r.recipeId===recipeId));
 return rows.length>0&&rows.every(row=>!canProduce(state,row.recipeId));
}
export function developmentWorkerProductionBlocked(state,person) {
 if(!person?.workplace||!developmentProducerIds(state).includes(person.workplace)||person.arrivalRemaining>EPS)return false;
 ensure(state);const ready=(state.residents||[]).filter(p=>p.workplace===person.workplace&&!p.pendingRelease&&!(p.arrivalRemaining>EPS)&&!p.visitGroup&&!p.visiting&&!(p.returnRemaining>EPS)),index=ready.indexOf(person);if(index<0)return false;
 let cursor=0;for(const row of productionAssignments(state,person.workplace)){if(index>=cursor&&index<cursor+row.workers)return !canProduce(state,row.recipeId);cursor+=row.workers;}return false;
}
function canProduce(state,recipeId) {
 const r=RECIPE_CATALOG[recipeId];if(!r)return false;const stock=local(state,r.building),status=localStorageStatus(state,r.building,stock);
 if(Object.entries(r.inputs).some(([id,n])=>amount(stock[id])+EPS<n))return false;
 const remaining=status.used-Object.values(r.inputs).reduce((s,n)=>s+n,0),made=Object.values(r.outputs).reduce((s,n)=>s+n,0);
 return remaining+made<=status.total+EPS&&Object.entries(r.outputs).every(([id,n])=>amount(stock[id])-(r.inputs[id]||0)+n<=status.perProduct+EPS);
}
export function developmentProductionJobs(state,context={}) {
 const p=ensure(state),jobs=[];
 for(const building of developmentProducerIds(state)) {
  const people=(state.residents||[]).filter(x=>x.workplace===building),ready=typeof context.activeWorkerIndices==='function'?context.activeWorkerIndices(building):Array.from({length:whole(state.buildings[building].workers)},(_,i)=>i);
  let cursor=0;
  for(const row of productionAssignments(state,building)) {
   const workers=ready.slice(cursor,cursor+row.workers);cursor+=row.workers;if(!canProduce(state,row.recipeId))continue;
   const progress=p.productionProgress[row.recipeId]||=( {} ),cycle=3600/row.ratePerWorkerHour;
   for(const index of workers) {const person=people[index],key=person?uid(person):`worker-${index}`,speed=typeof context.speed==='function'?context.speed(building,index,person,row.recipeId):1;if(!(speed>0))continue;
    jobs.push({id:building,index,recipeId:row.recipeId,key,cycle,speed,development:true,progress:amount(progress[key])*cycle});
   }
  }
 }
 return jobs;
}
export function progressDevelopmentJob(state,job,seconds) {const progress=ensure(state).productionProgress[job.recipeId];progress[job.key]=Math.min(1,amount(progress[job.key])+seconds*job.speed/job.cycle);}
export function completeDevelopmentJob(state,job,context={}) {
 const p=ensure(state),progress=p.productionProgress[job.recipeId];if(amount(progress[job.key])<1-EPS||!canProduce(state,job.recipeId))return false;
 const r=RECIPE_CATALOG[job.recipeId];for(const[id,n]of Object.entries(r.inputs))takeLocalGoods(state,r.building,id,n);for(const[id,n]of Object.entries(r.outputs)){putLocalGoods(state,r.building,id,n);context.record?.('produced',id,n);}progress[job.key]=0;
 if(Object.keys(r.inputs).length){state.statistics||={};state.statistics.crafted=Math.min(10000000,(state.statistics.crafted||0)+1);}return true;
}
function localProcessingReserve(state,building,resource) {
 const needed=productionAssignments(state,building).filter(row=>row.workers>0&&RECIPE_CATALOG[row.recipeId]?.localInputs).reduce((sum,row)=>sum+(row.inputs[resource]||0)*row.workers*4,0);
 return Math.min(200*state.buildings[building].level,needed);
}
export function developmentWarehouseSources(state,context={}) {
 ensure(state);const sources=[],priority=state.transportPriority||MATERIAL_IDS;
 for(const resource of priority)for(const building of developmentProducerIds(state)) {
  const output=availableRecipes(state,building).some(r=>Object.hasOwn(r.outputs,resource)),ready=Math.max(0,amount(local(state,building)[resource])-localProcessingReserve(state,building,resource)),room=context.centralRoom?.(resource)||0;
  if(output&&ready>0&&room>0)sources.push({kind:'producer',producer:building,resource,available:Math.min(ready,room),priority:(state.logisticsPriority||[]).indexOf(`producer:${building}`)});
 }
 // Ingredients travel in a physical carrier course before a process can start.
 for(const building of developmentProducerIds(state))for(const row of productionAssignments(state,building).filter(r=>r.workers>0&&!RECIPE_CATALOG[r.recipeId]?.localInputs))for(const[resource,n]of Object.entries(row.inputs)) {
  const room=localReceivingRoom(state,building,resource),available=context.centralAvailable?.(resource)||0;if(room<1||available<1)continue;
  const buffered=amount(local(state,building)[resource])+localIncoming(state,building,resource);
  // Keep enough for several cycles without starving every other processor.
  const desired=Math.max(n,Math.min(200*state.buildings[building].level,n*Math.max(1,row.workers)*4));
  const need=Math.max(0,Math.ceil(desired-buffered));if(need>0)sources.push({kind:'producerInput',target:building,resource,available:Math.min(room,available,need),priority:buffered+EPS<n?-1:1000});
 }
 return sources;
}
export function directRouteCatalog(state) {
 return Object.entries(state.education?.routes||{}).filter(([id,r])=>state.education?.discoveries?.[id]===true&&r&&GOODS[r.product]&&state.buildings?.[r.source]&&state.buildings?.[r.target]&&availableRecipes(state,r.source).some(x=>Object.hasOwn(x.outputs,r.product))&&availableRecipes(state,r.target).some(x=>!x.localInputs&&Object.hasOwn(x.inputs,r.product))).map(([id,r])=>({id,source:r.source,target:r.target,product:r.product,workers:whole(state.provisions?.routeAssignments?.[id]?.workers)}));
}
export function directRouteWorkers(state,indices) {
 ensure(state);const count=(state.residents||[]).filter(p=>p.workplace==='warehouse'&&!p.pendingRelease).length||whole(state.buildings?.warehouse?.workers),ready=[...indices],allocation=new Map();let used=0;
 if((state.buildings?.warehouse?.level||0)<5)return allocation;
 for(const route of directRouteCatalog(state)) {const n=Math.min(route.workers,Math.floor(count/2),Math.max(0,count-1-used),Math.max(0,ready.length-1-used));for(const index of ready.slice(used,used+n))allocation.set(index,route);used+=n;}
 return allocation;
}
export function directRouteSource(state,route) {
 const stock=local(state,route.source),available=Math.min(amount(stock[route.product]),localReceivingRoom(state,route.target,route.product));return available>0?{kind:'directRoute',producer:route.source,target:route.target,routeId:route.id,resource:route.product,available}:null;
}
export function developmentLogisticsAction(state,action) {
 if(!['developmentRoute','directRoute'].includes(action?.type))return null;
 const p=ensure(state),route=directRouteCatalog(state).find(r=>r.id===(action.routeId||action.id)),workers=action.workers,count=(state.residents||[]).filter(x=>x.workplace==='warehouse'&&!x.pendingRelease).length||whole(state.buildings?.warehouse?.workers);
 if(state.buildings.warehouse.level<5||!route)return {ok:false,message:'Ta trasa wymaga Magazynu na poziomie 5 i odkrycia dla konkretnego kierunku oraz produktu.'};
 if(!Number.isSafeInteger(workers)||workers<0||workers>Math.floor(count/2))return {ok:false,message:'Do jednej stałej trasy możesz przydzielić najwyżej połowę tragarzy Magazynu.'};
 const other=directRouteCatalog(state).filter(r=>r.id!==route.id).reduce((s,r)=>s+r.workers,0);if(other+workers>Math.max(0,count-1))return {ok:false,message:'Co najmniej jeden tragarz musi pozostać bez stałej trasy.'};
 p.routeAssignments[route.id]={workers};return {ok:true,message:'Zapisano obsadę trasy bezpośredniej.',routeId:route.id,workers};
}
export function milkCargoFromCentral(state,resource,amount,consume) {if(resource==='rawMilk'){const lots=withdrawMilk(state,amount);if(state.bonusMaterials)state.bonusMaterials.rawMilk=Math.max(0,(state.bonusMaterials.rawMilk||0)-amount);return lots;}consume(resource,amount);return [];}
export function milkCargoToCentral(state,resource,amount,lots=[]) {if(resource==='rawMilk'){depositMilk(state,amount,lots);return true;}return false;}
