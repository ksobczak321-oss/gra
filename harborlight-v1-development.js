// The DEV v32 coordinator. Engines own their sidecars; the normal game owns
// residents, physical inventory, its event clock and persistence.
import * as Provisions from './harborlight-v1-provisions.js?v=frontend-v32-3';
import * as Education from './harborlight-v1-education.js?v=frontend-v32-3';
import * as Military from './harborlight-v1-military.js?v=frontend-v32-3';
import * as Kingdom from './harborlight-v1-kingdom.js?v=frontend-v32-3';
import * as OriginalPuzzles from './harborlight-v1-original-puzzles.js?v=frontend-v32-3';
import { centralAvailable, consumeMaterial, spendMaterials } from './harborlight-v1-inventory.js?v=frontend-v32-3';
import { residentHasHousing, synchronizeResidents, recallSpecialistResident } from './harborlight-v1-residents.js?v=frontend-v32-3';
import { receiveMaterials, stockRoom, warehouseUsed, warehouseLimits, notify as notifyWorld } from './harborlight-v1-logistics.js?v=frontend-v32-3';
import { longestConstructionSeconds } from './harborlight-v1-economy.js?v=frontend-v32-3';
export { Provisions, Education, Military, Kingdom, OriginalPuzzles };
export const DEVELOPMENT_RULESET = 32;
export const isDevelopment = state => state?.ruleset === DEVELOPMENT_RULESET;
export const developmentBuildingIds = Object.keys(Provisions.NEW_BUILDINGS);
export const developmentResourceIds = Object.keys(Provisions.GOODS);
export function developmentContext(state, extra = {}) {
  const ctx = {
    now: state.worldTimeMs,
    worlds: [state], highestTownhall: state.highestTownhall || state.buildings?.townhall?.level || 1, highestAcademyLevel:state.highestAcademyLevel || state.buildings?.academy?.level || 1,
    hasHousing: (world, person) => residentHasHousing(person ? world : state, person || world),
    feedingMultiplier: (world, person) => Provisions.feedingMultiplier(person ? world : state, person || world),
    availableGoods: (world, id) => centralAvailable(typeof world === 'string' ? state : world, typeof world === 'string' ? world : id),
    centralAvailable: id => centralAvailable(state, id),
    stockRoom: id => stockRoom(state,id),
    spendGoods: (world, goods) => spendMaterials(goods ? world : state, goods || world),
    consume: (id, amount) => consumeMaterial(state, id, amount),
    getCoins: world => (world || state).resources.coins,
    spendCoins: amount => {
      if (!Number.isFinite(amount) || amount < 0 || state.resources.coins < Math.ceil(amount)) return false;
      state.resources.coins -= Math.ceil(amount); return true;
    },
    grantReward: (reward, receipt, attempt) => {
      if(attempt?.civilianRescue){state.civilianRescue ||= {version:32,groups:[],receipts:[],sequence:0};const r=state.civilianRescue;if(r.receipts.includes(receipt))return false;r.groups.push({id:`rescue-${++r.sequence}`,originIslandId:attempt.civilianRescue.originIslandId,remaining:attempt.civilianRescue.requested,requested:attempt.civilianRescue.requested,earnedAt:state.worldTimeMs});r.receipts.push(receipt);return {rescued:attempt.civilianRescue.requested,waiting:attempt.civilianRescue.requested};}
      for(const[id,n]of Object.entries(reward)){if(id==='coins')state.resources.coins=Math.min(Number.MAX_SAFE_INTEGER,state.resources.coins+Math.ceil(n));else if(id in Provisions.GOODS)state.resources[id]=(state.resources[id]||0)+n;}return true;
    },
    grantCoins: amount => { state.resources.coins = Math.min(Number.MAX_SAFE_INTEGER, state.resources.coins + Math.ceil(Math.max(0, amount))); },
    gainGoods: (world, goods) => receiveMaterials(goods?world:state,goods||world),
    canReceiveGoods: (world,goods) => Object.entries(goods).every(([id,n])=>stockRoom(world,id)>=n)&&warehouseUsed(world)+Object.values(goods).reduce((n,x)=>n+x,0)<=warehouseLimits(world).total,
    militaryCount: (world,kind) => world.residents.filter(p=>{const r=Military.militaryRecord(world,p);return !!r&&(kind!=='officer'||r.rank==='officer');}).length,
    eligiblePeople: (world,kind) => kind==='professor'?world.residents.filter(p=>Education.canHandOverProfessor(world,p)):world.residents.filter(p=>{const r=Military.militaryRecord(world,p);return !!r&&(kind!=='officer'||r.rank==='officer')&&!Military.militaryBusy(world,p)&&!Education.educationBusy(world,p)&&r.restUntil<=world.worldTimeMs&&!p.workplace&&!(p.arrivalRemaining>0)&&!(p.returnRemaining>0);}),
    sendSquad: (world,{ids}) => Military.militaryAction(world,{type:'militaryDispatch',personUids:ids},developmentContext(world,extra)),
    handOverProfessor: (world,{personId}) => {const p=world.residents.find(p=>Education.personKey(p)===personId);if(!p||!Education.canHandOverProfessor(world,p))return {ok:false,message:'Ten profesor nie może zostać przekazany.'};Education.detachPersonEducation(world,p);if(world.provisions?.people)delete world.provisions.people[Education.personKey(p)];world.residents=world.residents.filter(x=>x!==p);world.population=world.residents.length;return {ok:true};},
    grantRescuedPeople: (world,count) => {world.civilianRescue ||= {version:32,groups:[],receipts:[],sequence:0};world.civilianRescue.groups.push({id:`military-rescue-${++world.civilianRescue.sequence}`,originIslandId:world.islandId,remaining:count,requested:count,earnedAt:world.worldTimeMs});},
    buildSeconds: (world, building, level) => longestConstructionSeconds(level || world.buildings?.[building]?.level || 1)*.6,
    notify: (world, kind, title, message) => {
      if(typeof world === 'string'){message=kind;title=world;kind=world;world=state;}
      else if(kind&&typeof kind==='object'){({kind,title,message}=kind);}
      notifyWorld(world,kind||'development',title||'HARBORLIGHT',message||'');
    },
    recallPerson: (world, person) => recallSpecialistResident(world,person),
    ...extra
  };
  ctx.hasResearch ||= id => Education.hasDiscovery(state, id);
  return ctx;
}
export function normalizeDevelopment(state, raw = state, extra = {}) {
  if (!isDevelopment(state)) return;
  const ctx = developmentContext(state, extra);
  for (const [id, definition] of Object.entries(Provisions.NEW_BUILDINGS)) {
    state.buildings[id] ||= {level:0,workers:0,ready:0,workProgress:[]};
    if (state.buildings.townhall.level >= definition.unlockLevel && !state.buildings[id].level) state.buildings[id].level = 1;
  }
  Education.normalizeEducation(state, raw, ctx);
  Military.normalizeMilitary(state, raw, ctx);
  Provisions.normalizeProvisions(state, raw, {...ctx, hasHousing: person => residentHasHousing(state, person)});
  state.civilianRescue = raw.civilianRescue?.version === 32 ? structuredClone(raw.civilianRescue) : {version:32,groups:[],receipts:[],sequence:0};
  if(raw.accountGifts?.version===32)state.accountGifts=structuredClone(raw.accountGifts);
  Kingdom.normalizeKingdom(state, raw, ctx);
  OriginalPuzzles.normalizeOriginalPuzzles(state, raw, ctx);
  Military.ensureFoundingSpecialists(state, ctx);
  synchronizeResidents(state);
}
export function settleDevelopment(state, extra = {}) {
  if (!isDevelopment(state)) return;
  const ctx = developmentContext(state, extra);
  for (const [id, definition] of Object.entries(Provisions.NEW_BUILDINGS)) if (state.buildings.townhall.level >= definition.unlockLevel && !state.buildings[id]?.level) state.buildings[id] = {level:1,workers:0,ready:0,workProgress:[]};
  Military.ensureFoundingSpecialists(state, ctx);
  Education.advanceEducation(state, 0, ctx);
  Military.advanceMilitary(state, 0, ctx);
}
export function feedDevelopment(state, seconds, extra = {}) {
  if (isDevelopment(state)) Provisions.feedResidents(state, seconds, {...developmentContext(state, extra), hasHousing: person => residentHasHousing(state, person)});
}
export function advanceDevelopment(state, seconds, extra = {}) {
  if (!isDevelopment(state)) return;
  const ctx = developmentContext(state, extra);
  Provisions.advanceProvisions(state, seconds, {...ctx, hasHousing: person => residentHasHousing(state, person), feed:false});
  Education.advanceEducation(state, seconds, ctx);
  Military.advanceMilitary(state, seconds, ctx);
  if (!ctx.serverKingdom) Kingdom.advanceKingdom(state, seconds, ctx);
  OriginalPuzzles.advanceOriginalPuzzles(state, seconds, ctx);
  settleDevelopment(state, {...ctx, now:ctx.endAt ?? ctx.now + seconds*1000});
}
export function nextDevelopmentEvent(state, extra = {}) {
  if (!isDevelopment(state)) return Infinity;
  const ctx = developmentContext(state, extra);
  return Math.min(60, Provisions.nextProvisionsEvent(state, ctx), Education.nextEducationEvent(state,ctx), Military.nextMilitaryEvent(state,ctx), ctx.serverKingdom ? Infinity : Kingdom.nextKingdomEvent(state,ctx), OriginalPuzzles.nextOriginalPuzzleEvent(state,ctx));
}
export function developmentAction(state, action, extra = {}) {
  if (!isDevelopment(state)) return null;
  const ctx = developmentContext(state, extra);
  if (ctx.serverKingdom && action.type?.startsWith('kingdom')) return {ok:false,message:'To działanie Królestwa wymaga potwierdzenia przez serwer DEV.',code:'kingdom-server-required'};
  let result = civilianRescueAction(state,action,ctx);
  if(result === null) result = Provisions.provisionsAction(state,action,ctx);
  if (result === null) result = Education.educationAction(state,action,ctx);
  if (result === null) result = Military.militaryAction(state,action,ctx);
  if (result === null) result = Kingdom.kingdomAction(state,action,ctx);
  if (result === null) result = OriginalPuzzles.originalPuzzleAction(state,action,ctx);
  if (result?.ok) settleDevelopment(state,ctx);
  return result;
}

export function civilianRescueStatus(state,context={}){
 const r=state.civilianRescue||{groups:[]};const waiting=r.groups.reduce((n,g)=>n+Math.max(0,g.remaining),0), capacity=state.buildings.townhall.level*36;
 return {groups:structuredClone(r.groups),waiting,available:state.population+waiting<capacity,reward:2*state.buildings.townhall.level};
}
function civilianRescueAction(state,action,context){
 if(!String(action.type||'').startsWith('civilianRescue'))return null;
 state.civilianRescue ||= {version:32,groups:[],receipts:[],sequence:0};const ledger=state.civilianRescue;
 if(action.type==='civilianRescueStart'){
  const status=civilianRescueStatus(state,context);if(!status.available)return {ok:false,message:'Przyjmij oczekujących mieszkańców lub zwiększ limit Ratusza przed kolejnym ratunkiem.'};
  const result=OriginalPuzzles.originalPuzzleAction(state,{type:'originalPuzzleStart',variant:'signal-line'},context);
  if(result.ok)state.originalPuzzles.attempts['signal-line'].civilianRescue={originIslandId:state.islandId,requested:status.reward,startTH:state.buildings.townhall.level};
  return {...result,variant:'signal-line',residentsRequested:status.reward};
 }
 if(action.type==='civilianRescueClaim'){
  const worlds=Array.isArray(context.worlds)?context.worlds:Object.values(context.worlds||{}),target=worlds.find(w=>w.islandId===(action.islandId||state.islandId))||(!action.islandId?state:null),group=ledger.groups.find(g=>g.id===action.groupId);
  const n=action.amount;if(!target||!group||!Number.isSafeInteger(n)||n<1||n>group.remaining||target.population+n>target.buildings.townhall.level*36)return {ok:false,message:'Wybierz grupę, wyspę i liczbę osób mieszczącą się w limicie Ratusza.'};
  target.population+=n;synchronizeResidents(target);Provisions.normalizeProvisions(target,target);group.remaining-=n;return {ok:true,message:`Przyjęto ${n} uratowanych mieszkańców.`,accepted:n,remaining:group.remaining,islandId:target.islandId};
 }
 return {ok:false,message:'Nieznane działanie ratunkowe.'};
}
