import { developmentText, GOODS_NAMES } from './harborlight-v1-development-copy.js?v=frontend-v32-14';
// DEV v32 provisions. No browser, network, wall-clock or world-state imports.
// The host owns production and transport; this module owns their recipes,
// protected food, individual meal history, milk batches and civilian clothing.
const HOUR = 3600, DAY = 86400, EPS = 1e-8, MAX = Number.MAX_SAFE_INTEGER;
const finite = (v, d = 0) => Number.isFinite(Number(v)) ? Math.max(0, Math.min(MAX, Number(v))) : d;
const whole = (v, d = 0) => Math.floor(finite(v, d));
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const result = (ok, message, extra = {}) => ({ ok, message, ...extra });
const keyOf = p => String(p?.personUid || `resident-${p?.id ?? 'unknown'}`);
const copyStock = source => Object.fromEntries(MATERIAL_IDS.map(id => [id, finite(source?.[id])]));
export const PROVISIONS_VERSION = 1;
export const PROVISIONS_RULES = Object.freeze({ satietyPerHour: 6, varietyShare: .2, dietWindowSeconds: DAY, dietGraceSeconds: DAY, milkCentralSeconds: 3 * DAY, clothingSeconds: 21 * DAY, localPerProduct: 200, localTotal: 300, baseCrewPerLevel: 12, extraProductCrewShare: .5, maximumStepSeconds: 60 });
const definition = (name, category, price, satiety = 0, extras = {}) => Object.freeze({ name, namePl: name, category, price, salePrice: price, satiety, edible: satiety > 0, ...extras });
export const GOODS = Object.freeze({
  wood: definition('Drewno', 1, 3), stone: definition('Kamień', 1, 4), grain: definition('Zboże', 1, 2, 1), food: definition('Dawna żywność', 2, 2, 6, { legacy: true }), planks: definition('Deski', 2, 6),
  vegetables: definition('Warzywa', 1, 2, 1), livestock: definition('Żywiec', 1, 2), rawMilk: definition('Surowe mleko', 1, 2, 1), sourMilk: definition('Kwaśne mleko', 1, 2, .5), fish: definition('Ryby', 1, 2, 1),
  flour: definition('Mąka', 2, 10, 6), pasteurizedMilk: definition('Mleko pasteryzowane', 2, 10, 6), meat: definition('Mięso', 2, 2.5, 6), leather: definition('Skóra', 2, 5),
  bread: definition('Chleb', 3, 50, 36), cake: definition('Ciasto', 3, 55, 48), cheese: definition('Ser', 3, 10, 12),
  smokedFish: definition('Ryba wędzona', 3, 10, 12, { devBalanceProposal: true }), fishPreserves: definition('Przetwory rybne', 3, 15, 18, { devBalanceProposal: true }),
  civilianClothes: definition('Strój cywilny', 2, 25), militaryClothes: definition('Strój wojskowy', 2, 50), professorRobes: definition('Szata profesorska', 2, 50)
});
export const MATERIAL_IDS = Object.freeze(Object.keys(GOODS));
export const FOOD_IDS = Object.freeze(MATERIAL_IDS.filter(id => GOODS[id].edible));
export const NEW_BUILDINGS = Object.freeze({
  bakery: Object.freeze({ name: 'Piekarnia', unlockLevel: 2, production: 'bread' }), dairy: Object.freeze({ name: 'Mleczarnia', unlockLevel: 2, production: 'pasteurizedMilk' }),
  slaughterhouse: Object.freeze({ name: 'Rzeźnia', unlockLevel: 1, production: 'meat' }), fisher: Object.freeze({ name: 'Rybak', unlockLevel: 1, production: 'fish' }),
  leatherworks: Object.freeze({ name: 'Zakład skórzany', unlockLevel: 2, production: 'civilianClothes' }), academy: Object.freeze({ name: 'Akademia', unlockLevel: 4 }), barracks: Object.freeze({ name: 'Koszary', unlockLevel: 4 })
});
const recipe = (building, inputs, outputs, level = 1, extras = {}) => Object.freeze({ building, inputs: Object.freeze(inputs), outputs: Object.freeze(outputs), level, ...extras });
export const RECIPE_CATALOG = Object.freeze({
  farmGrain: recipe('farm', {}, { grain: 1 }), farmVegetables: recipe('farm', {}, { vegetables: 1 }), farmLivestock: recipe('farm', {}, { livestock: 1 }, 2), farmMilk: recipe('farm', {}, { rawMilk: 1 }, 2),
  farmCheese: recipe('farm', { sourMilk: 4 }, { cheese: 1 }, 6, { discovery: 'cheese' }),
  flour: recipe('windmill', { grain: 4 }, { flour: 1 }), bread: recipe('bakery', { flour: 4 }, { bread: 1 }), cake: recipe('bakery', { flour: 4, rawMilk: 2 }, { cake: 1 }),
  pasteurizedMilk: recipe('dairy', { rawMilk: 4 }, { pasteurizedMilk: 1 }), meat: recipe('slaughterhouse', { livestock: 2 }, { meat: 2 }), leather: recipe('slaughterhouse', { livestock: 2 }, { leather: 1 }), fish: recipe('fisher', {}, { fish: 1 }),
  smokedFish: recipe('fisher', { fish: 4 }, { smokedFish: 1 }, 5, { discovery: 'fishProcessing', localInputs: true }),
  fishPreserves: recipe('fisher', { fish: 6 }, { fishPreserves: 1 }, 5, { discovery: 'fishProcessing', localInputs: true }),
  civilianClothes: recipe('leatherworks', { leather: 4 }, { civilianClothes: 1 }), militaryClothes: recipe('leatherworks', { leather: 8 }, { militaryClothes: 1 }), professorRobes: recipe('leatherworks', { leather: 8 }, { professorRobes: 1 }, 1, { academy: true }),
  wood: recipe('lumber', {}, { wood: 1 }), stone: recipe('quarry', {}, { stone: 1 }), planks: recipe('sawmill', { wood: 2 }, { planks: 1 })
});
// Explicit DEV calibration: rates count recipe batches, not arbitrary outputs.
// Advanced Academy/research multipliers are supplied by the production host.
export const DEV_RECIPE_RATES = Object.freeze({ farmGrain: 40, farmVegetables: 40, farmLivestock: 40, farmMilk: 40, farmCheese: 40, flour: 40, bread: 40, cake: 40, pasteurizedMilk: 40, meat: 20, leather: 40, fish: 40, smokedFish: 40, fishPreserves: 40, civilianClothes: 40, militaryClothes: 40, professorRobes: 40, wood: 40, stone: 40, planks: 40 });
export function recipeRatePerWorkerHour(state, id) {
  const r = RECIPE_CATALOG[id], level = finite(state.buildings?.[r?.building]?.level);
  return r && level > 0 ? DEV_RECIPE_RATES[id] * (1 + .1 * (level - 1)) : 0;
}
const nowOf = (state, context = {}) => Number.isFinite(context.now) ? context.now : finite(state.provisions?.clockMs, finite(state.worldTimeMs));
const townhall = s => Math.max(1, whole(s.buildings?.townhall?.level, 1));
export const requiredFoodTypes = state => townhall(state) >= 8 ? 3 : townhall(state) >= 3 ? 2 : 1;
function hasResearch(state, id, context = {}) { return typeof context.hasResearch === 'function' ? !!context.hasResearch(id) : state.education?.discoveries?.[id] === true || state.education?.research?.completed?.[id] === true; }
export function availableRecipes(state, building, context = {}) {
  const level = finite(state.buildings?.[building]?.level), th = townhall(state), unlock = NEW_BUILDINGS[building]?.unlockLevel || 1;
  if (th < unlock || !level) return [];
  return Object.entries(RECIPE_CATALOG).filter(([, r]) => r.building === building && level >= r.level && (!r.discovery || hasResearch(state, r.discovery, context)) && (!r.academy || th >= 4 && finite(state.buildings?.academy?.level) > 0)).map(([id, r]) => ({ id, ...r }));
}
export function crewCapacity(state, building, context = {}) {
  const level = whole(state.buildings?.[building]?.level), recipes = availableRecipes(state, building, context), count = recipes.length;
  const base = 12 * level, capacity = { perProduct: base, total: count ? base * (1 + .5 * (count - 1)) : 0, products: count };
  // An upgraded legacy island may already employ more people than the new
  // product limits. Retain those existing jobs, without creating hiring room:
  // reducing a crew or product allocation permanently consumes its allowance.
  const saved = state.provisions?.legacyCrewAllowances?.[building];
  if (object(saved)) {
    const workers = whole(state.buildings?.[building]?.workers), selected = state.provisions?.assignments?.[building] || {};
    saved.workers = Math.min(whole(saved.workers), workers);
    capacity.total = Math.max(capacity.total, saved.workers);
    const perRecipe = {};
    for (const r of recipes) {
      const allowed = Math.min(whole(saved.recipes?.[r.id]), workers, whole(selected[r.id]));
      if (saved.recipes) saved.recipes[r.id] = allowed;
      perRecipe[r.id] = Math.max(base, allowed);
    }
    capacity.perRecipe = perRecipe;
  }
  return capacity;
}
export function localStorageStatus(state, building, local = null) {
  const level = whole(state.buildings?.[building]?.level), stock = local || state.provisions?.localStock?.[building] || state.buildings?.[building]?.stock || {};
  const amounts = Object.fromEntries(MATERIAL_IDS.map(id => [id, finite(stock[id])])), used = Object.values(amounts).reduce((a, b) => a + b, 0);
  return { perProduct: 200 * level, total: 300 * level, used, stock: amounts, room: Math.max(0, 300 * level - used) };
}
export function localStockRoom(state, building, resource, local = null) {
  const s = localStorageStatus(state, building, local);
  return Math.max(0, Math.min(s.perProduct - finite(s.stock[resource]), s.total - s.used));
}
export function productionAssignments(state, building, context = {}) {
  const recipes = availableRecipes(state, building, context), cap = crewCapacity(state, building, context), crew = Math.min(whole(state.buildings?.[building]?.workers), cap.total), selected = state.provisions?.assignments?.[building] || {};
  let left = crew;
  return recipes.map((r, index) => {
    const requested = Object.keys(selected).length ? whole(selected[r.id]) : left;
    const workers = Math.min(left, cap.perRecipe?.[r.id] ?? cap.perProduct, requested); left -= workers;
    return { recipeId: r.id, building, workers, inputs: { ...r.inputs }, outputs: { ...r.outputs }, ratePerWorkerHour: recipeRatePerWorkerHour(state, r.id) };
  });
}
function atHome(state, person, context = {}) {
  if (typeof context.hasHousing === 'function') return !!context.hasHousing(person);
  if (typeof person.hasHousing === 'boolean') return person.hasHousing;
  const uid = keyOf(person), education = state.education?.people?.[uid], military = state.military?.people?.[uid];
  if (education?.profession==='professor' && !person.workplace) return true;
  if (military && !person.workplace && military.housed !== false) return true;
  const index = (state.residents || []).indexOf(person);
  return index >= 0 && index < 36 * whole(state.buildings?.house?.level);
}
const hourlyNeed = (state, person, context = {}) => 6 * (atHome(state, person, context) ? 1 : 2);
const specialist = (state, person) => { const id = keyOf(person); return state.education?.people?.[id]?.profession==='professor' || !!state.military?.people?.[id]; };
function newPerson(state, person, now) {
  return { joinedAt: now, dietGraceUntil: now + DAY * 1000, history: [], hungerSeconds: 0, fullFedSeconds: 0, coverage: 1, cakeSatiety: 0, cakeBonusUntil: 0, starterClothesGranted: true, clothesSpare: townhall(state) <= 3 ? 2 : 0, clothingRemaining: 0, clothesPenalty: 0 };
}
function savedHistory(source,p) {
 if(Array.isArray(p?.history))return p.history;
 const table=source.dietHistories||{},first=table[p?.historyRef];if(Array.isArray(first))return first;
 const rows=[],seen=new Set();let id=p?.historyRef;
 while(typeof id==='string'&&!seen.has(id)&&rows.length<10000){seen.add(id);const node=table[id];if(!object(node)||!object(node.row))break;rows.push(node.row);id=node.next;}
 return rows;
}
function decodePerson(state,value,source,now=0) {
 if(!Array.isArray(value))return value;
 if(typeof value[1]==='string'&&Array.isArray(source.personProfiles?.[value[1]]))value=[value[0],...source.personProfiles[value[1]]];
 const joinedAt=finite(value[0],now),person={joinedAt,dietGraceUntil:Math.max(0,joinedAt+DAY*1000+(Number.isFinite(value[1])?value[1]:0)),hungerSeconds:finite(value[2]),fullFedSeconds:Math.min(HOUR,finite(value[3])),coverage:Math.min(1,finite(value[4],1)),cakeSatiety:finite(value[5]),cakeBonusUntil:finite(value[6]),clothesSpare:value[7]===undefined?(townhall(state)<=3?2:0):finite(value[7]),clothingRemaining:finite(value[8]),clothesPenalty:finite(value[9]),starterClothesGranted:value[11]!==false};
 if(typeof value[10]==='string')person.historyRef=value[10];else person.history=Array.isArray(value[10])?value[10]:[];return person;
}
export function normalizeProvisions(state, raw = state, context = {}) {
  const source = object(raw.provisions) ? raw.provisions : {}, now = Number.isFinite(context.now) ? context.now : finite(state.worldTimeMs);
  const sourcePeople=Object.fromEntries(Object.entries(source.people||{}).slice(0,10000).map(([id,p])=>[id,source.peopleFormat===2?decodePerson(state,p,source,now):p]));
  state.resources ||= {};
  for (const id of MATERIAL_IDS) state.resources[id] = finite(state.resources[id]);
  const savedSettings = source.foodSettings || {};
  const priorities = [...new Set([...(Array.isArray(savedSettings.priorities) ? savedSettings.priorities.filter(id => FOOD_IDS.includes(id)) : []), ...FOOD_IDS])];
  const enabled = Object.fromEntries(FOOD_IDS.map(id => [id, savedSettings.enabled?.[id] !== false]));
  const limits = Object.fromEntries(FOOD_IDS.map(id => [id, savedSettings.limits?.[id] === null || savedSettings.limits?.[id] === undefined ? null : finite(savedSettings.limits[id])]));
  // People away on an account voyage retain their meal/clothing identity.
  // Active resident loops below never feed or age an absent person's outfit.
  const people = Object.fromEntries(Object.entries(sourcePeople).filter(([id, p]) => id.length <= 160 && object(p)).map(([id,p]) => {const entry={...p,history:savedHistory(source,p).slice(-10000).map(h=>({...h}))};delete entry.historyRef;return [id,entry];}));
  for (const person of state.residents || []) {
    const id = keyOf(person), old = sourcePeople[id];
    const p = old && object(old) ? { ...newPerson(state, person, finite(old.joinedAt, now)), ...old } : newPerson(state, person, now);
    p.history = (old?savedHistory(source,old):p.history).filter(h => h && FOOD_IDS.includes(h.resource) && finite(h.satiety) > 0 && Number.isFinite(h.at)).map(h => ({ resource: h.resource, satiety: finite(h.satiety), at: h.at,...(Number.isFinite(h.from)&&h.from<h.at?{from:h.from}:{}) })).slice(-10000);delete p.historyRef;
    for (const field of ['joinedAt','dietGraceUntil','hungerSeconds','fullFedSeconds','cakeSatiety','cakeBonusUntil','clothesSpare','clothingRemaining']) p[field] = finite(p[field]);
    p.coverage = Math.min(1, finite(p.coverage, 1));p.fullFedSeconds=Math.min(HOUR,p.fullFedSeconds);p.clothesPenalty = finite(p.clothesPenalty);people[id] = p;
  }
  const oldRequired = whole(source.requiredTypes, requiredFoodTypes(state)), required = requiredFoodTypes(state);
  if (required > oldRequired) for (const p of Object.values(people)) p.dietGraceUntil = Math.max(p.dietGraceUntil, now + DAY * 1000);
  const assignments = {};
  for (const [building, values] of Object.entries(source.assignments || {})) if (object(values)) assignments[building] = Object.fromEntries(Object.entries(values).filter(([id]) => RECIPE_CATALOG[id]?.building === building).map(([id, n]) => [id, whole(n)]));
  const legacyCrewAllowances = {};
  for (const [building, allowance] of Object.entries(source.legacyCrewAllowances || {})) {
    if (!object(allowance) || !state.buildings?.[building]) continue;
    const workers = Math.min(24 * whole(state.buildings[building].level), whole(state.buildings[building].workers), whole(allowance.workers));
    const recipes = Object.fromEntries(Object.entries(allowance.recipes || {}).filter(([id]) => RECIPE_CATALOG[id]?.building === building).map(([id, n]) => [id, Math.min(workers, whole(n), whole(assignments[building]?.[id]))]));
    if (workers) legacyCrewAllowances[building] = { workers, recipes };
  }
  state.provisions = { version: 1, clockMs: Number.isFinite(source.clockMs) ? source.clockMs : now, feedClockMs: Number.isFinite(source.feedClockMs) ? source.feedClockMs : now, foodSettings: { priorities, enabled, limits }, people, requiredTypes: required, assignments,
    ...(Object.keys(legacyCrewAllowances).length ? { legacyCrewAllowances } : {}),
    milkLots: (Array.isArray(source.milkLots) ? source.milkLots : []).filter(l => finite(l.amount) > EPS).map(l => ({ id: String(l.id || ''), amount: finite(l.amount), centralSeconds: Math.min(3 * DAY, finite(l.centralSeconds)) })), milkSequence: whole(source.milkSequence), localStock: object(source.localStock) ? source.localStock : {}, notices: (Array.isArray(source.notices) ? source.notices : []).slice(-100),
    ...(object(source.productionProgress)?{productionProgress:source.productionProgress}:{}),...(object(source.localMilkLots)?{localMilkLots:source.localMilkLots}:{}),...(object(source.routeAssignments)?{routeAssignments:source.routeAssignments}:{}),routeSequence:whole(source.routeSequence),pendingMilkLots:(Array.isArray(source.pendingMilkLots)?source.pendingMilkLots:[]).filter(l=>finite(l.amount)>EPS).map(l=>({amount:finite(l.amount),centralSeconds:Math.min(3*DAY,finite(l.centralSeconds))})) };
  syncMilkLots(state);
  return state.provisions;
}
// Serialization helper: call only on the host's save clone. Hydration below
// always creates separate mutable histories for individual people.
export function compactDietHistories(state) {
 const p=state.provisions;if(!p?.people)return {people:0,histories:0};const groups=new Map(),source={dietHistories:p.dietHistories};
 if(p.peopleFormat===2)p.people=Object.fromEntries(Object.entries(p.people).map(([id,value])=>[id,decodePerson(state,value,p,p.clockMs)]));
 for(const entry of Object.values(p.people)) {
  const history=savedHistory(source,entry).map(h=>({resource:h.resource,satiety:Math.round(h.satiety*1e12)/1e12,at:h.at,...(Number.isFinite(h.from)?{from:h.from}:{})})),key=JSON.stringify(history);
  const group=groups.get(key)||{history,entries:[]};group.entries.push(entry);groups.set(key,group);
 }
 const table={},interned=new Map(),roots=new Set();let sequence=0;
 for(const group of groups.values()) {
  if(group.history.length&&(group.entries.length>1||group.history.length>3)){
    let next=null;for(let i=group.history.length-1;i>=0;i--){const row=group.history[i],key=JSON.stringify([row,next]);let id=interned.get(key);if(!id){id=`diet-${++sequence}`;interned.set(key,id);table[id]={row,next};}next=id;}
    roots.add(next);for(const entry of group.entries){delete entry.history;entry.historyRef=next;}
  }
  else for(const entry of group.entries){entry.history=group.history.map(h=>({...h}));delete entry.historyRef;}
 }
 if(sequence){p.dietHistories=table;p.dietHistoryFormat=2;}else {delete p.dietHistories;delete p.dietHistoryFormat;}
 const spareDefault=townhall(state)<=3?2:0;
 const profileGroups=new Map();
 for(const[id,entry]of Object.entries(p.people)){
  const joined=finite(entry.joinedAt),history=entry.historyRef||entry.history||[],values=[joined,finite(entry.dietGraceUntil)-joined-DAY*1000,finite(entry.hungerSeconds),Math.min(HOUR,finite(entry.fullFedSeconds)),Math.min(1,finite(entry.coverage,1)),finite(entry.cakeSatiety),finite(entry.cakeBonusUntil),finite(entry.clothesSpare,spareDefault),finite(entry.clothingRemaining),finite(entry.clothesPenalty),history,entry.starterClothesGranted!==false],defaults=[null,0,0,0,1,0,0,spareDefault,0,0,null,true];
  let last=values.length-1;while(last>0&&(values[last]===defaults[last]||last===10&&Array.isArray(values[last])&&!values[last].length))last--;const row=values.slice(0,last+1);p.people[id]=row;
  if(row.length>2){const key=JSON.stringify(row.slice(1)),group=profileGroups.get(key)||{tail:row.slice(1),ids:[]};group.ids.push(id);profileGroups.set(key,group);}
 }
 const profiles={};let profileSequence=0;for(const group of profileGroups.values())if(group.ids.length>1){const ref=`p${++profileSequence}`;profiles[ref]=group.tail;for(const id of group.ids)p.people[id]=[p.people[id][0],ref];}
 if(profileSequence)p.personProfiles=profiles;else delete p.personProfiles;
 p.peopleFormat=2;return {people:Object.keys(p.people).length,histories:roots.size,nodes:sequence};
}
function ensure(state, context = {}) {
  if (state.provisions?.version !== 1 || state.provisions.peopleFormat===2) return normalizeProvisions(state, state, context);
  state.provisions.foodSettings ||= { priorities: [...FOOD_IDS], enabled: {}, limits: {} };state.provisions.people ||= {};
  const now = nowOf(state, context), required = requiredFoodTypes(state);
  for (const person of state.residents || []) if (!state.provisions.people[keyOf(person)]) state.provisions.people[keyOf(person)] = newPerson(state, person, now);
  if (required > state.provisions.requiredTypes) for (const p of Object.values(state.provisions.people)) p.dietGraceUntil = Math.max(finite(p.dietGraceUntil), now + DAY * 1000);
  state.provisions.requiredTypes = required;
  return state.provisions;
}
function notify(state, kind, message, context = {}) {
  const n = { kind, message, at: nowOf(state, context) };state.provisions.notices.push(n);state.provisions.notices=state.provisions.notices.slice(-100);
  if (typeof context.notify === 'function') context.notify(kind, message);
}
function rawAvailable(state, resource, context = {}) {
  if (typeof context.available === 'function') return Math.min(finite(state.resources?.[resource]), finite(context.available(resource)));
  const reserved = (state.constructionProjects || []).reduce((sum, p) => sum + finite(p.reservedMaterials?.[resource]), 0) + (state.market?.orders || []).filter(o => o.resource === resource).reduce((sum,o) => sum + finite(o.amount),0) + (state.dock?.orders || []).filter(o=>o.resource===resource&&o.direction==='sell'&&o.reservationVersion===9&&!['complete','expired'].includes(o.stage)).reduce((sum,o)=>sum+finite(o.remainingToPort),0);
  return Math.max(0, finite(state.resources?.[resource]) - reserved);
}
const cheapFoods = () => [...FOOD_IDS].sort((a,b) => GOODS[a].price / GOODS[a].satiety - GOODS[b].price / GOODS[b].satiety || FOOD_IDS.indexOf(a)-FOOD_IDS.indexOf(b));
export function foodReservePlan(state, context = {}) {
  ensure(state, context);
  const required = (state.residents || []).reduce((sum,p)=>sum+hourlyNeed(state,p,context),0), available = Object.fromEntries(FOOD_IDS.map(id=>[id,rawAvailable(state,id,context)])), mix = {}, types = requiredFoodTypes(state), sorted = cheapFoods();
  let remaining = required;
  const candidates = sorted.filter(id=>available[id]*GOODS[id].satiety+EPS >= required*.2);
  const selected = candidates.slice(0,types);
  if(types>1) for(const id of selected) {const pts=Math.min(remaining,required*.2);mix[id]=pts/GOODS[id].satiety;available[id]-=mix[id];remaining-=pts;}
  for(const id of sorted) {const quantity=Math.min(available[id],remaining/GOODS[id].satiety);if(quantity>EPS){mix[id]=finite(mix[id])+quantity;remaining-=quantity*GOODS[id].satiety;}if(remaining<=EPS)break;}
  const satiety=required-Math.max(0,remaining), shares=Object.fromEntries(Object.entries(mix).map(([id,q])=>[id,q*GOODS[id].satiety]));
  return { materials: mix, requiredSatiety: required, satiety, complete: required<=EPS||remaining<=EPS&&Object.values(shares).filter(p=>p+EPS>=required*.2).length>=types, requiredTypes:types, shares };
}
export const protectedFood = (state, resource, context={}) => finite(foodReservePlan(state,context).materials[resource]);
export function availableForSpending(state, resource, context={}) { return Math.max(0,rawAvailable(state,resource,context)-(GOODS[resource]?.edible?protectedFood(state,resource,context):0)); }
export const availableGoods = (state, resource, context={}) => Math.floor(availableForSpending(state,resource,context)+EPS);
export const goodsValue = resource => GOODS[resource]?.price || 0;
export function spendGoods(state, values, context={}) {
  if(!object(values)||Object.entries(values).some(([id,n])=>!GOODS[id]||!Number.isSafeInteger(n)||n<0||availableForSpending(state,id,context)+EPS<n))return result(false,'Brakuje towarów ponad chronioną rezerwę.');
  for(const[id,n]of Object.entries(values))consume(state,id,n,context);
  return result(true,'Towary zostały przekazane.');
}
export function syncMilkLots(state) {
  const p=state.provisions;if(!p)return;
  p.milkLots ||= [];p.milkSequence ||= 0;
  let represented=p.milkLots.reduce((s,l)=>s+finite(l.amount),0),actual=finite(state.resources?.rawMilk);
  if(represented>actual+EPS){let shrink=represented-actual;p.milkLots.sort((a,b)=>b.centralSeconds-a.centralSeconds);for(const l of p.milkLots){const q=Math.min(l.amount,shrink);l.amount-=q;shrink-=q;if(shrink<=EPS)break;}p.milkLots=p.milkLots.filter(l=>l.amount>EPS);}
  else if(actual>represented+EPS)p.milkLots.push({id:'milk-'+(++p.milkSequence),amount:actual-represented,centralSeconds:0});
}
export function withdrawMilk(state, requested) {
  ensure(state);syncMilkLots(state);let left=Math.min(finite(requested),finite(state.resources.rawMilk)),total=left;const lots=[];
  state.provisions.milkLots.sort((a,b)=>b.centralSeconds-a.centralSeconds);
  for(const l of state.provisions.milkLots){const q=Math.min(l.amount,left);if(q>EPS){lots.push({amount:q,centralSeconds:l.centralSeconds});l.amount-=q;left-=q;}if(left<=EPS)break;}
  state.resources.rawMilk=Math.max(0,state.resources.rawMilk-total);state.provisions.milkLots=state.provisions.milkLots.filter(l=>l.amount>EPS);return lots;
}
export function depositMilk(state, amount, lots = []) {
  ensure(state);syncMilkLots(state);let left=finite(amount);state.resources.rawMilk=finite(state.resources.rawMilk)+left;
  for(const lot of Array.isArray(lots)?lots:[]){const q=Math.min(left,finite(lot.amount));if(q>EPS){state.provisions.milkLots.push({id:'milk-'+(++state.provisions.milkSequence),amount:q,centralSeconds:Math.min(3*DAY,finite(lot.centralSeconds))});left-=q;}}
  if(left>EPS)state.provisions.milkLots.push({id:'milk-'+(++state.provisions.milkSequence),amount:left,centralSeconds:0});
}
function consume(state,id,n,context={}) {
  n=Math.min(finite(n),finite(state.resources?.[id]));
  if(typeof context.consume==='function')return finite(context.consume(id,n));
  if(id==='rawMilk'){withdrawMilk(state,n);if(state.bonusMaterials)state.bonusMaterials.rawMilk=Math.max(0,finite(state.bonusMaterials.rawMilk)-n);return n;}
  state.resources[id]=Math.max(0,finite(state.resources[id])-n);return n;
}
function pruneHistory(person, now) {
  const cutoff=now-DAY*1000;
  person.history=person.history.filter(h=>h.at>cutoff+EPS);
  for(const h of person.history)if(Number.isFinite(h.from)&&h.from<cutoff&&h.at>cutoff){h.satiety*=Math.max(0,(h.at-cutoff)/(h.at-h.from));h.from=cutoff;}
}
function aggregateHistory(p) { const map={};for(const h of p.history)map[h.resource]=finite(map[h.resource])+h.satiety;return map; }
export function dietStatus(state, person, context={}) {
  const p=ensure(state,context).people[keyOf(person)],now=nowOf(state,context);if(!p)return {requiredTypes:requiredFoodTypes(state),types:0,penalty:0,protected:true};
  pruneHistory(p,now);const shares=aggregateHistory(p),total=Object.values(shares).reduce((a,b)=>a+b,0),types=Object.values(shares).filter(n=>total>EPS&&n+EPS>=total*.2).length,requiredTypes=requiredFoodTypes(state),protectedNow=now<p.dietGraceUntil;
  return {requiredTypes,types,shares,total,protected:protectedNow,graceUntil:p.dietGraceUntil,penalty:protectedNow?0:Math.max(0,requiredTypes-types)*10};
}
export const dietPenalty=(state,person,context={})=>dietStatus(state,person,context).penalty;
export function feedingMultiplier(state,person=null) {
  const p=ensure(state);
  if(person)return .5+.5*Math.min(1,finite(p.people[keyOf(person)]?.coverage,1));
  const people=(state.residents||[]);return people.length?people.reduce((sum,x)=>sum+feedingMultiplier(state,x),0)/people.length:1;
}
export function mealStatus(state, person=null, context={}) {
  const p=ensure(state,context),people=person?[person]:(state.residents||[]),coverage=people.length?people.reduce((s,x)=>s+Math.min(1,finite(p.people[keyOf(x)]?.coverage,1)),0)/people.length:1;
  return { coverage, multiplier:.5+.5*coverage, hourlySatiety:people.reduce((s,x)=>s+hourlyNeed(state,x,context),0), requiredTypes:requiredFoodTypes(state), reserve:foodReservePlan(state,context), people:people.map(x=>({id:x.id,personUid:keyOf(x),...p.people[keyOf(x)],diet:dietStatus(state,x,context)})), foodSettings:p.foodSettings };
}
function writeHistory(p,resource,points,from,at) {
  if(points<=EPS)return;
  // Consecutive intervals with the same real intake rate merge losslessly.
  // A day of stable meals is a few runs/person, not1440 duplicated minute rows.
  let previous=null;for(let i=p.history.length-1;i>=0;i--)if(p.history[i].resource===resource){previous=p.history[i];break;}
  const duration=at-from,oldDuration=previous?previous.at-previous.from:0,rate=points/duration,oldRate=oldDuration>0?previous.satiety/oldDuration:NaN;
  if(previous&&Number.isFinite(previous.from)&&Math.abs(previous.at-from)<.01&&Math.abs(rate-oldRate)<=1e-10*Math.max(1,rate,oldRate)){previous.at=at;previous.satiety+=points;}
  else p.history.push({from,at,resource,satiety:points});
}
export function feedResidents(state, seconds, context={}) {
  const p=ensure(state,context),now=Number.isFinite(context.now)?context.now:finite(p.feedClockMs,p.clockMs),people=state.residents||[],needs=people.map(person=>hourlyNeed(state,person,context)*finite(seconds)/HOUR),required=needs.reduce((a,b)=>a+b,0),end=now+finite(seconds)*1000;
  if(!(required>EPS)){p.feedClockMs=end;return {coverage:1,consumed:{},satiety:0};}
  const remainingStock=Object.fromEntries(FOOD_IDS.map(id=>[id,rawAvailable(state,id,context)])),mix={};let remaining=required;
  const order=[...new Set([...(p.foodSettings.priorities||[]),...FOOD_IDS])].filter(id=>FOOD_IDS.includes(id));
  const permitted=id=>{const limit=p.foodSettings.limits[id];return limit===null||limit===undefined?remainingStock[id]:Math.min(remainingStock[id],Math.max(0,finite(limit)-finite(mix[id])));};
  const varied=order.filter(id=>p.foodSettings.enabled[id]!==false&&permitted(id)*GOODS[id].satiety+EPS>=required*.2).slice(0,requiredFoodTypes(state));
  if(requiredFoodTypes(state)>1)for(const id of varied){const q=Math.min(permitted(id),required*.2/GOODS[id].satiety);if(q>EPS){mix[id]=finite(mix[id])+q;remainingStock[id]-=q;remaining-=q*GOODS[id].satiety;}}
  for(const id of order){if(p.foodSettings.enabled[id]===false)continue;const q=Math.min(permitted(id),remaining/GOODS[id].satiety);if(q>EPS){mix[id]=finite(mix[id])+q;remainingStock[id]-=q;remaining-=q*GOODS[id].satiety;}}
  // Disabled types may be used to prevent hunger. Quantity-limit override is a
  // different rule: only when that food is the sole remaining edible stock.
  if(remaining>EPS)for(const id of order){if(p.foodSettings.enabled[id]!==false)continue;const limit=p.foodSettings.limits[id],max=limit===null||limit===undefined?remainingStock[id]:Math.min(remainingStock[id],finite(limit));const q=Math.min(max,remaining/GOODS[id].satiety);if(q>EPS){mix[id]=finite(mix[id])+q;remainingStock[id]-=q;remaining-=q*GOODS[id].satiety;}}
  const sole=FOOD_IDS.filter(id=>remainingStock[id]>EPS);
  if(remaining>EPS&&sole.length===1){const id=sole[0],q=Math.min(remainingStock[id],remaining/GOODS[id].satiety);if(q>EPS){mix[id]=finite(mix[id])+q;remaining-=q*GOODS[id].satiety;notify(state,'food-limit-override',developmentText('MSG-EMERGENCY-FEEDING',{produkt:GOODS[id].name}),context);}}
  const supplied=required-Math.max(0,remaining),coverage=Math.max(0,Math.min(1,supplied/required));
  for(const [id,q]of Object.entries(mix)){consume(state,id,q,context);if(p.foodSettings.limits[id]!==null&&p.foodSettings.limits[id]!==undefined)p.foodSettings.limits[id]=Math.max(0,finite(p.foodSettings.limits[id])-q);}
  for(let i=0;i<people.length;i++){
    const person=people[i],entry=p.people[keyOf(person)],share=needs[i]/required;
    entry.coverage=coverage;pruneHistory(entry,end);
    for(const[id,q]of Object.entries(mix)){const points=q*GOODS[id].satiety*share;writeHistory(entry,id,points,now,end);if(id==='cake')entry.cakeSatiety+=points;}
    if(entry.cakeSatiety+EPS>=hourlyNeed(state,person,context)){entry.cakeSatiety=Math.max(0,entry.cakeSatiety%hourlyNeed(state,person,context));entry.cakeBonusUntil=end+6*HOUR*1000;}
    if(coverage>=1-EPS){entry.fullFedSeconds=Math.min(HOUR,entry.fullFedSeconds+seconds);if(entry.fullFedSeconds>=HOUR-EPS)entry.hungerSeconds=0;}else{entry.fullFedSeconds=0;entry.hungerSeconds+=seconds*(1-coverage);}
  }
  p.feedClockMs=end;return {coverage,consumed:mix,satiety:supplied,requiredSatiety:required};
}
export function hungerPenalty(state,person) {const p=ensure(state).people[keyOf(person)];return p&&p.hungerSeconds>=12*HOUR-EPS?5*(1-p.coverage):0;}
export function cakeHappinessBonus(state,person,context={}) {const p=ensure(state,context).people[keyOf(person)];return p&&p.cakeBonusUntil>nowOf(state,context)?5:0;}
export function clothingPenalty(state,person) {if(townhall(state)<5||specialist(state,person))return 0;const p=ensure(state).people[keyOf(person)];return p&&p.clothingRemaining<=EPS&&p.clothesSpare<=0&&rawAvailable(state,'civilianClothes')<1?10:0;}
function advanceClothing(state,seconds,context={}) {
  if(townhall(state)<5)return;
  for(const person of state.residents||[]){if(specialist(state,person))continue;const entry=state.provisions.people[keyOf(person)];let left=seconds;
    while(left>EPS){if(entry.clothingRemaining<=EPS){if(entry.clothesSpare>0)entry.clothesSpare--;else if(rawAvailable(state,'civilianClothes',context)>=1)consume(state,'civilianClothes',1,context);else{entry.clothesPenalty=10;break;}entry.clothingRemaining=21*DAY;entry.clothesPenalty=0;}
      const dt=Math.min(left,entry.clothingRemaining);entry.clothingRemaining-=dt;left-=dt;
    }
  }
}
function advanceMilk(state,seconds,context={}) {
  syncMilkLots(state);let soured=0;for(const lot of state.provisions.milkLots){lot.centralSeconds+=seconds;if(lot.centralSeconds>=3*DAY-EPS){soured+=lot.amount;lot.amount=0;}}
  if(soured<=EPS)return;state.provisions.milkLots=state.provisions.milkLots.filter(l=>l.amount>EPS);state.resources.rawMilk=Math.max(0,state.resources.rawMilk-soured);
  const room=typeof context.stockRoom==='function'?finite(context.stockRoom('sourMilk')):Math.max(0,finite(context.perResourceLimit,MAX)-finite(state.resources.sourMilk));const stored=Math.min(soured,room);state.resources.sourMilk=finite(state.resources.sourMilk)+stored;
  notify(state,'milk-soured',developmentText('MSG-TURNED-SOUR',{liczba:soured})+(stored+EPS<soured?' '+developmentText('MSG-SOUR-MILK-OVERFLOW',{liczba:Math.round((soured-stored)*100)/100}):''),context);
}
export function nextProvisionsEvent(state,context={}) {
  const p=ensure(state,context),now=nowOf(state,context);let next=60;
  for(const l of p.milkLots)next=Math.min(next,Math.max(EPS,3*DAY-l.centralSeconds));
  for(const entry of Object.values(p.people)){for(const until of [entry.dietGraceUntil,entry.cakeBonusUntil])if(until>now)next=Math.min(next,(until-now)/1000);if(townhall(state)>=5&&entry.clothingRemaining>EPS)next=Math.min(next,entry.clothingRemaining);if(entry.coverage<1&&entry.hungerSeconds<12*HOUR)next=Math.min(next,(12*HOUR-entry.hungerSeconds)/Math.max(EPS,1-entry.coverage));}
  return Math.max(EPS,next);
}
export function advanceProvisions(state,seconds,context={}) {
  const p=ensure(state,context);let remaining=finite(seconds),at=Number.isFinite(context.now)?context.now:p.clockMs;
  while(remaining>EPS){const step=Math.min(remaining,60,...p.milkLots.map(l=>Math.max(EPS,3*DAY-l.centralSeconds))),ctx={...context,now:at};
    if(context.feed!==false)feedResidents(state,step,ctx);advanceMilk(state,step,ctx);advanceClothing(state,step,ctx);at+=step*1000;remaining-=step;
  }
  p.clockMs=at;return p;
}
export function shiftProvisionsTime(state,deltaMs) {
  const p=ensure(state);p.clockMs+=deltaMs;p.feedClockMs+=deltaMs;for(const v of Object.values(p.people)){v.joinedAt+=deltaMs;v.dietGraceUntil+=deltaMs;if(v.cakeBonusUntil)v.cakeBonusUntil+=deltaMs;for(const h of v.history){h.at+=deltaMs;if(Number.isFinite(h.from))h.from+=deltaMs;}}
}
export function quoteGoods(resource,quantity,direction='buy') {
  if(!GOODS[resource]||!Number.isSafeInteger(quantity)||quantity<=0||!['buy','sell'].includes(direction))return result(false,'Nieprawidłowy towar lub ilość.');
  if(direction==='buy'&&GOODS[resource].legacy)return result(false,'Dawna żywność nie jest już dostępna w nowych zakupach.');
  const exact=GOODS[resource].price*quantity*(direction==='buy'?1.5:1);if(!Number.isSafeInteger(Math.ceil(exact-EPS)))return result(false,'Cena przekracza obsługiwany zakres monet.');return result(true,'Cena całego zamówienia.',{resource,quantity,direction,coins:Math.ceil(exact-EPS),exactValue:exact});
}
export function quoteExchange(state,from,to,amount,context={}) {
  if(!GOODS[from]||!GOODS[to]||from===to||GOODS[from].category!==GOODS[to].category||!Number.isSafeInteger(amount)||amount<=0)return result(false,'Wybierz dwa różne towary tej samej kategorii i pełną liczbę sztuk.');
  if(GOODS[to].legacy)return result(false,'Dawna żywność nie jest już wynikiem nowych wymian.');
  if(availableForSpending(state,from,context)+EPS<amount)return result(false,'Brakuje towaru ponad chronioną rezerwę.');
  const inputValue=amount*GOODS[from].price,receive=Math.floor((inputValue*.9+EPS)/GOODS[to].price);
  if(!receive)return result(false,'Ta partia jest zbyt mała, aby po prowizji otrzymać sztukę wybranego towaru.');
  if(typeof context.stockRoom==='function'&&finite(context.stockRoom(to))+EPS<receive)return result(false,'Brakuje miejsca na wynik wymiany.');
  return result(true,'Wymiana według wartości, z prowizją 10%.',{from,to,amount,receive,inputValue,outputValue:receive*GOODS[to].price});
}
export function quoteConstructionFood(state,foodUnits,mix=null,context={}) {
  ensure(state,context);if(!Number.isFinite(foodUnits)||foodUnits<0||foodUnits*6>MAX)return result(false,'Nieprawidłowy koszt jedzenia na budowę.');const required=finite(foodUnits)*6,reserved=foodReservePlan(state,context).materials,available=Object.fromEntries(FOOD_IDS.map(id=>[id,Math.max(0,rawAvailable(state,id,context)-finite(reserved[id]))]));let materials={};
  if(mix!==null){if(!object(mix))return result(false,'Wybierz jedzenie na budowę.');for(const[id,q]of Object.entries(mix)){if(!FOOD_IDS.includes(id)||!Number.isSafeInteger(q)||q<0)return result(false,'Wybierz jadalne produkty i pełne liczby sztuk.');if(q>available[id]+EPS)return result(false,developmentText('MSG-PROTECTED-RESERVE'));if(q>0)materials[id]=q;}}
  else{let remaining=required;for(const id of cheapFoods()){const q=Math.min(Math.floor(available[id]+EPS),Math.ceil(Math.max(0,remaining)/GOODS[id].satiety-EPS));if(q>0){materials[id]=q;remaining-=q*GOODS[id].satiety;}if(remaining<=EPS)break;}}
  const provided=Object.entries(materials).reduce((s,[id,q])=>s+q*GOODS[id].satiety,0);
  return result(provided+EPS>=required,provided+EPS>=required?'Zestaw jedzenia na budowę jest gotowy.':developmentText('MSG-MEAL-COST-MISSING',{brak:Math.round(Math.max(0,required-provided)*100)/100}),{materials,satietyRequired:required,satietyProvided:provided,missingSatiety:Math.max(0,required-provided)});
}
export function provisionsAction(state,action,context={}) {
  if(!action||typeof action.type!=='string'||!action.type.startsWith('provisions'))return null;
  const p=ensure(state,context);
  if(action.type==='provisionsFoodSettings'){
    if(action.priorities!==undefined&&(!Array.isArray(action.priorities)||action.priorities.some(id=>!FOOD_IDS.includes(id))))return result(false,'Wybierz prawidłowe produkty żywnościowe.');
    if(action.limits!==undefined&&(!object(action.limits)||Object.entries(action.limits).some(([id,n])=>!FOOD_IDS.includes(id)||n!==null&&(!Number.isFinite(n)||n<0))))return result(false,'Ilości do wydania muszą być nieujemne.');
    if(action.enabled!==undefined&&(!object(action.enabled)||Object.entries(action.enabled).some(([id,v])=>!FOOD_IDS.includes(id)||typeof v!=='boolean')))return result(false,'Nieprawidłowy wybór produktów do wydania.');
    if(action.priorities)p.foodSettings.priorities=[...new Set([...action.priorities,...FOOD_IDS])];Object.assign(p.foodSettings.limits,action.limits||{});Object.assign(p.foodSettings.enabled,action.enabled||{});return result(true,developmentText('MSG-FOOD-SETTINGS-SAVED'));
  }
  if(action.type==='provisionsSetWorkers'){
    const building=action.building,recipes=availableRecipes(state,building,context),cap=crewCapacity(state,building,context),id=action.recipeId;
    if(!recipes.some(r=>r.id===id)||!Number.isSafeInteger(action.workers)||action.workers<0||action.workers>(cap.perRecipe?.[id]??cap.perProduct))return result(false,'Wybierz odblokowany kierunek i prawidłową liczbę pracowników.');
    const existing={...(p.assignments[building]||{})},current=productionAssignments(state,building,context);if(!Object.keys(existing).length)for(const row of current)existing[row.recipeId]=row.workers;existing[id]=action.workers;
    if(Object.values(existing).reduce((a,b)=>a+finite(b),0)>Math.min(whole(state.buildings?.[building]?.workers),cap.total))return result(false,'Nie masz tylu przydzielonych pracowników. Najpierw zmniejsz inną obsadę lub przydziel mieszkańców do budynku.');
    p.assignments[building]=existing;crewCapacity(state,building,context);return result(true,'Zmieniono podział pracowników między produkty.');
  }
  if(action.type==='provisionsConstructionQuote'||action.type==='provisionsConstructionSpend'){
    const quote=quoteConstructionFood(state,action.foodUnits,action.mix??null,context);if(quote.ok&&action.type==='provisionsConstructionSpend')for(const[id,n]of Object.entries(quote.materials))consume(state,id,n,context);return quote;
  }
  if(action.type==='provisionsExchange'){
    const quote=quoteExchange(state,action.from,action.to,action.amount,context);if(!quote.ok||action.confirm!==true)return quote;consume(state,quote.from,quote.amount,context);if(quote.to==='rawMilk')depositMilk(state,quote.receive);else state.resources[quote.to]=finite(state.resources[quote.to])+quote.receive;return result(true,'Wymiana została wykonana.',quote);
  }
  return result(false,'Nieznana czynność dotycząca zapasów.');
}

// Atomic recipe helpers for hosts that keep multi-good local buffers here.
export function recipeBatchQuote(state, recipeId, batches=1, context={}) {
 const r=RECIPE_CATALOG[recipeId];
 if(!r||!Number.isSafeInteger(batches)||batches<=0||!availableRecipes(state,r.building,context).some(x=>x.id===recipeId))return result(false,'Ten kierunek produkcji nie jest odblokowany.');
 const inputs=Object.fromEntries(Object.entries(r.inputs).map(([id,n])=>[id,n*batches])),outputs=Object.fromEntries(Object.entries(r.outputs).map(([id,n])=>[id,n*batches]));
 const local=context.localStock||state.provisions?.localStock?.[r.building]||{},status=localStorageStatus(state,r.building,local),outTotal=Object.values(outputs).reduce((a,b)=>a+b,0);
 if(r.localInputs) {
  if(Object.entries(inputs).some(([id,n])=>finite(local[id])+EPS<n))return result(false,'Brakuje świeżych ryb w magazynie przy Rybaku.');
 } else if(Object.entries(inputs).some(([id,n])=>availableForSpending(state,id,context)+EPS<n))return result(false,'Brakuje składników ponad chronioną rezerwę jedzenia.');
 const consumedLocal=r.localInputs?Object.values(inputs).reduce((a,b)=>a+b,0):0;
 if(status.used-consumedLocal+outTotal>status.total+EPS||Object.entries(outputs).some(([id,n])=>finite(local[id])-(r.localInputs?finite(inputs[id]):0)+n>status.perProduct+EPS))return result(false,developmentText('MSG-LOCAL-TOTAL-FULL'));
 return result(true,'Można wykonać recepturę.',{recipeId,building:r.building,batches,inputs,outputs,...(r.localInputs?{localInputs:true}:{})});
}
export function produceRecipeBatch(state,recipeId,batches=1,context={}) {
 const quote=recipeBatchQuote(state,recipeId,batches,context);if(!quote.ok)return quote;
 const stock=context.localStock||(ensure(state).localStock[quote.building]||=( {} ));
 for(const[id,n]of Object.entries(quote.inputs)) {
  if(quote.localInputs)stock[id]=Math.max(0,finite(stock[id])-n);else consume(state,id,n,context);
 }
 for(const[id,n]of Object.entries(quote.outputs))stock[id]=finite(stock[id])+n;return quote;
}
