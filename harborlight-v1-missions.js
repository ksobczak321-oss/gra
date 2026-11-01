// Lighthouse chapters are optional world objectives, independent of the
// practical course. Accepted clocks and receipts are persisted with the island.
import { MATERIAL_IDS, PRODUCTION_RECIPES, productionRate, availableGoods,
  haulCapacity, warehouseLimits, ordinaryStock, bonusStock, foodReserve } from './harborlight-v1-logistics.js?v=frontend-v27';
import { consumeMaterial } from './harborlight-v1-inventory.js?v=frontend-v27';
import { housingStatus } from './harborlight-v1-housing.js?v=frontend-v27';
import { residentAtHome } from './harborlight-v1-residents.js?v=frontend-v27';

const HOUR = 3600, DAY = 24 * HOUR, EPS = 1e-7, SAFE = Number.MAX_SAFE_INTEGER;
const RESOURCES = ['coins', ...MATERIAL_IDS];
const PRODUCER = { wood: 'lumber', stone: 'quarry', grain: 'farm', food: 'windmill', planks: 'sawmill' };
const finite = n => typeof n === 'number' && Number.isFinite(n);
const positive = (n, fallback = 0) => finite(n) ? Math.max(0, Math.min(SAFE, n)) : fallback;
const whole = (n, fallback = 0) => Math.floor(positive(n, fallback));
const object = n => !!n && typeof n === 'object' && !Array.isArray(n);
const clock = state => positive(state.worldTimeMs, positive(state.lastSimulatedAt));
const lev = (state, id) => whole(state.buildings?.[id]?.level);
const good = (message, extra = {}) => ({ ok: true, message, ...extra });
const bad = (message, extra = {}) => ({ ok: false, message, ...extra });
const cleanCost = cost => Object.fromEntries(RESOURCES.filter(id => whole(cost?.[id]) > 0).map(id => [id, whole(cost[id])]));
const clone = value => JSON.parse(JSON.stringify(value));
const available = (state, resource) => resource === 'coins' ? whole(state.resources?.coins) : whole(availableGoods(state, resource));
const count = cost => Object.values(cost || {}).reduce((a, b) => a + b, 0);
const metric = (state, kind, resource) => whole(state.economyLedger?.[kind]?.[resource]);

export const MISSION_RULES = Object.freeze({ version: 1, firstTownHallLevel: 2,
  mainSteps: 8, supportSteps: 5, rescueSteps: 3, minimumSeconds: 600,
  maximumSeconds: 7 * DAY, maximumReceipts: 256, workerWalkSeconds: 120 });

// This is a conservative free-action plan, not a promise about every possible
// future strategy. It can propose recalling/reassigning the existing workforce,
// but never assumes a paid boost, future immigrant, random reward or trade.
// Four production/delivery phases per batch account for recipe dependencies.
export function missionFeasibility(state, requirements, options = {}) {
  const cost = cleanCost(requirements), mode = options.mode || 'gather';
  const duration = Math.max(1, Math.min(MISSION_RULES.maximumSeconds, positive(options.duration, 6 * HOUR)));
  const stock = Object.fromEntries(RESOURCES.map(id => [id, available(state, id)]));
  const missing = Object.fromEntries(RESOURCES.map(id => [id, Math.max(0, (cost[id] || 0) - stock[id])]));
  const ready = RESOURCES.every(id => missing[id] === 0);
  if (ready && options.productionResource == null) return { feasible: true, ready: true, duration, requirements: cost, stock,
    maximum: { ...stock }, missing, staffing: {}, preparationSeconds: 0, reason: null };
  if (options.allowProduction === false) return { feasible: false, ready, duration, requirements: cost, stock,
    maximum: { ...stock }, missing, staffing: {}, reason: 'Prepare the required unreserved stock first.', reasonPl: 'Najpierw przygotuj wymagany wolny zapas.' };

  const people = Array.isArray(state.residents) ? state.residents.filter(person => !person.visitGroup && !(person.prayerRemaining > EPS)) : [];
  const workers = people.length;
  const housing = housingStatus(state);
  const totalCapacity = Math.max(whole(state.capacity), lev(state, 'townhall') * 24, workers);
  const mealDemand = totalCapacity + Math.max(0, totalCapacity - housing.beds);
  const housingFactor = housing.unhoused > 0 ? .5 : 1;
  const lastActivity = positive(state.engagement?.lastRealActivityAt, clock(state));
  const ordinaryFactor = clock(state) + duration * 1000 > lastActivity + 48 * HOUR * 1000 ? .5 : 1;
  const lighthouse = positive(state.lighthouseRemaining) >= duration ? 2 : 1;
  // Hungry output is a lower bound. Full meals and voluntary play only improve it.
  const outputFactor = .5 * housingFactor * ordinaryFactor * lighthouse;
  const tripFactor = .5 * housingFactor * ordinaryFactor;
  const loaded = Math.max(0, ...Object.values(state.haulTrips || {}).flat().map(trip => positive(trip.remaining) / Math.max(.125, tripFactor)));
  const returns = Math.max(0, ...people.map(person => positive(person.returnRemaining) + positive(person.arrivalRemaining)));
  const preparation = 2 * MISSION_RULES.workerWalkSeconds + Math.max(loaded, returns);
  const window = Math.max(0, duration - preparation) / 4;
  const staffing = {}, produced = Object.fromEntries(MATERIAL_IDS.map(id => [id, missing[id]]));
  if (options.productionResource && MATERIAL_IDS.includes(options.productionResource)) {
    produced[options.productionResource] = Math.max(produced[options.productionResource], whole(options.productionAmount, 1));
  }
  if (mode !== 'contribute' && count(missing) > 0 && (cost.food || 0) > 0) produced.food += Math.ceil(mealDemand * duration / HOUR);
  // Recipe inputs belong to the same joint budget, never also to a donation.
  produced.wood = Math.max(produced.wood, Math.max(0, (cost.wood || 0) + 2 * produced.planks - stock.wood));
  produced.grain = Math.max(produced.grain, Math.max(0, (cost.grain || 0) + 2 * produced.food - stock.grain));
  let possible = workers > 0 && window > 0;
  for (const resource of MATERIAL_IDS) {
    if (!produced[resource]) continue;
    const id = PRODUCER[resource], rate = productionRate(state, id) * outputFactor;
    const needed = rate > 0 && window > 0 ? Math.ceil(produced[resource] * HOUR / window / rate) : SAFE;
    staffing[id] = needed;
    if (!lev(state, id) || needed > lev(state, id) * 12) possible = false;
  }
  const limits = warehouseLimits(state);
  const ordinaryRequired = MATERIAL_IDS.reduce((n, id) => n + Math.max(0, (cost[id] || 0) + (id === 'food' ? foodReserve(state) : 0) - bonusStock(state, id)), 0);
  if (mode !== 'contribute' && (ordinaryRequired > limits.total || MATERIAL_IDS.some(id => Math.max(0, (cost[id] || 0) + (id === 'food' ? foodReserve(state) : 0) - bonusStock(state, id)) > limits.perResource))) possible = false;
  // Any stock-only part of a contribution can be delivered first, releasing
  // real ordinary capacity. The remaining production can then arrive in batches.
  const freed = mode === 'contribute' ? MATERIAL_IDS.reduce((n, id) => n + Math.min(ordinaryStock(state, id), Math.max(0, Math.min(cost[id] || 0, stock[id]) - bonusStock(state, id))), 0) : 0;
  const used = MATERIAL_IDS.reduce((n, id) => n + ordinaryStock(state, id), 0);
  const globalRoom = Math.max(0, limits.total - used + freed);
  let courses = 0;
  for (const resource of MATERIAL_IDS) {
    if (!produced[resource]) continue;
    const initialUse = mode === 'contribute' ? Math.min(ordinaryStock(state, resource), Math.max(0, Math.min(cost[resource] || 0, stock[resource]) - bonusStock(state, resource))) : 0;
    // Consumed recipe inputs also release space before the dependent product.
    const recipeRoom = resource === 'food' ? 2 * produced.food : resource === 'planks' ? 2 * produced.planks : 0;
    const resourceRoom = limits.perResource - ordinaryStock(state, resource) + initialUse + (resource === 'food' ? mealDemand * duration / HOUR : 0);
    const capacity = Math.floor(Math.min(haulCapacity(state), Math.max(globalRoom, recipeRoom), Math.max(0, resourceRoom)));
    if (capacity < 1) { possible = false; continue; }
    courses += Math.ceil(produced[resource] / capacity);
  }
  const carriers = courses ? Math.max(1, Math.ceil(courses * 300 / Math.max(.125, tripFactor) / Math.max(1, window))) : 0;
  if (carriers) staffing.warehouse = carriers;
  if (carriers > lev(state, 'warehouse') * 12 || Object.values(staffing).reduce((a, b) => a + b, 0) > workers) possible = false;
  // Taxes can be earned only by a real reachable assignment, not empty slots.
  const paidWorkers = Math.max(Object.values(staffing).reduce((a, b) => a + b, 0), missing.coins ? Math.min(workers, 12 * Math.max(1, lev(state, 'lumber'))) : 0);
  const coins = stock.coins + Math.floor(paidWorkers * ordinaryFactor * Math.max(0, duration - preparation) / HOUR);
  if ((cost.coins || 0) > coins) possible = false;
  const maximum = { ...stock, coins };
  for (const resource of MATERIAL_IDS) maximum[resource] += possible ? Math.max(0, produced[resource]) : 0;
  return { feasible: possible, ready, duration, requirements: cost, stock, maximum, missing, staffing, preparationSeconds: preparation,
    reason: possible ? null : 'Prepare stock, production, carriers and storage space before starting this task.',
    reasonPl: possible ? null : 'Przed rozpoczęciem przygotuj zapasy, produkcję, tragarzy i miejsce w Magazynie.' };
}

export function affordableTaskRequirements(state, requested, { duration = 6 * HOUR } = {}) {
  // Prefer stock already usable at the instant of acceptance. It is a joint
  // physical budget, so recipe inputs and shipping slots cannot be double spent.
  const capped = {};
  for (const id of MATERIAL_IDS) {
    const amount = Math.min(whole(requested?.[id]), available(state, id));
    if (amount > 0) capped[id] = amount;
  }
  if (Object.keys(capped).length >= 2) return { requirements: capped, feasible: true, stockOnly: true };
  const raw = ['wood', 'stone', 'grain'];
  for (const id of raw) {
    if (Object.keys(capped).length >= 2) break;
    if (!capped[id] && lev(state, PRODUCER[id]) > 0) capped[id] = Math.min(whole(requested?.[id], 1) || 1, Math.max(1, available(state, id)));
  }
  const plan = missionFeasibility(state, capped, { duration, mode: 'contribute' });
  return { requirements: capped, feasible: Object.keys(capped).length >= 2 && plan.feasible, stockOnly: false, plan };
}

function event(state, kind, title, titlePl, message, messagePl) {
  state.notificationSequence = whole(state.notificationSequence) + 1;
  state.notifications ||= [];
  state.notifications.unshift({ id: state.notificationSequence, kind, title, titlePl, message, messagePl, at: positive(state.activeSeconds), read: false });
  state.notifications.length = Math.min(100, state.notifications.length);
}
function courseOpen(state) {
  const t = state.tutorial;
  return t?.autoOpenDisabled === true || t?.rewardDisabled === true || t?.settled === true || t?.version && Object.values(t.completed || {}).filter(x => x === true).length >= 25;
}
function eligible(state) {
  return lev(state, 'townhall') >= 2 && !(state.onboarding?.worldStartedAt === null) && courseOpen(state);
}
function defaults() {
  return { version: 1, chapter: null, stack: [], completedLevels: [], receipts: [], invited: 0, lastIncident: null, lastCompletion: null };
}
function normalizeObjective(raw) {
  if (!object(raw) || !['contribute','building','production','stock','invitation','assign','delivered'].includes(raw.type)) return null;
  const result = { type: raw.type };
  if (typeof raw.building === 'string' && /^[a-z-]{1,30}$/.test(raw.building)) result.building = raw.building;
  if (MATERIAL_IDS.includes(raw.resource)) result.resource = raw.resource;
  for (const name of ['target','baseline','count']) if (finite(raw[name])) result[name] = whole(raw[name]);
  if (raw.requirements) result.requirements = cleanCost(raw.requirements);
  return result;
}
function normalizeTask(raw) {
  if (!object(raw) || typeof raw.id !== 'string' || raw.id.length > 160 || !['offered','active','assistance','retry'].includes(raw.status)) return null;
  const objective = normalizeObjective(raw.objective); if (!objective) return null;
  return { id: raw.id, status: raw.status, objective, requirements: cleanCost(raw.requirements), deposited: cleanCost(raw.deposited),
    title: String(raw.title || '').slice(0, 180), titlePl: String(raw.titlePl || '').slice(0, 180), description: String(raw.description || '').slice(0, 600), descriptionPl: String(raw.descriptionPl || '').slice(0, 600),
    reward: { coins: whole(raw.reward?.coins) }, duration: Math.max(600, Math.min(7 * DAY, positive(raw.duration, 6 * HOUR))),
    offeredAt: positive(raw.offeredAt), acceptedAt: finite(raw.acceptedAt) ? positive(raw.acceptedAt) : null,
    deadline: finite(raw.deadline) ? positive(raw.deadline) : null, attempt: whole(raw.attempt) };
}
export function normalizeMissions(state, raw = state) {
  const source = raw.lighthouseMissions?.version === 1 ? raw.lighthouseMissions : {}, m = defaults();
  m.completedLevels = [...new Set((Array.isArray(source.completedLevels) ? source.completedLevels : []).filter(n => Number.isSafeInteger(n) && n >= 2 && n <= 100))].sort((a,b) => a-b);
  m.receipts = [...new Set((Array.isArray(source.receipts) ? source.receipts : []).filter(id => typeof id === 'string' && id.length <= 160))].slice(-MISSION_RULES.maximumReceipts);
  m.invited = whole(source.invited);
  if (object(source.chapter) && whole(source.chapter.level) >= 2 && whole(source.chapter.level) <= 100) {
    const c = source.chapter;
    m.chapter = { id: `lighthouse-chapter-${whole(c.level)}`, level: whole(c.level), targetLevel: Math.max(1, Math.min(100, whole(c.targetLevel, 1))),
      startedAt: positive(c.startedAt), invitedBaseline: whole(c.invitedBaseline), productionBaseline: Object.fromEntries(MATERIAL_IDS.map(id => [id, whole(c.productionBaseline?.[id])])),
      status: c.status === 'completed' ? 'completed' : 'active' };
    for (const item of Array.isArray(source.stack) ? source.stack.slice(0,3) : []) {
      const kinds = ['main','support','rescue'], kind = kinds[m.stack.length];
      if (item?.kind !== kind) break;
      const total = kind === 'main' ? 8 : kind === 'support' ? 5 : 3;
      const frame = { kind, index: Math.max(1, Math.min(total, whole(item.index, 1))), total,
        prefix: typeof item.prefix === 'string' && item.prefix.length <= 140 ? item.prefix : m.chapter.id,
        task: normalizeTask(item.task) };
      m.stack.push(frame);
    }
    if (!m.stack.length && m.chapter.status !== 'completed') m.stack.push({ kind:'main',index:1,total:8,prefix:m.chapter.id,task:null });
  }
  if (object(source.lastIncident)) m.lastIncident = { at: positive(source.lastIncident.at), id: String(source.lastIncident.id || '').slice(0,160), kind:'plague-ship', narrativeOnly:true };
  if (object(source.lastCompletion)) m.lastCompletion = { level: whole(source.lastCompletion.level), at:positive(source.lastCompletion.at) };
  state.lighthouseMissions = m;
  return m;
}
function ensure(state) { return state.lighthouseMissions?.version === 1 ? state.lighthouseMissions : normalizeMissions(state); }
function costFor(state, building, context = {}) {
  if (typeof context.buildingCost === 'function') return cleanCost(context.buildingCost(state, building, { queued:false }));
  const l = Math.max(1, lev(state,building));
  if (PRODUCTION_RECIPES[building]) {
    const factor = building === 'farm' ? 1 : 2, result = {wood:72*l,stone:72*l};
    const output = PRODUCTION_RECIPES[building].output; result[output] = (result[output] || 0) + 120*l;
    return Object.fromEntries(Object.entries(result).map(([id,n])=>[id,n*factor]));
  }
  return Object.fromEntries(RESOURCES.map(id=>[id,500*l]));
}
function taskText(index) {
  return [null,
    ['Prepare the scaffolding','Przygotujmy rusztowanie','Deliver Wood for the Lighthouse crew.','Dostarcz drewno ekipie pracującej przy Latarni. To pierwszy krok do przywrócenia jej dawnego blasku.'],
    ['More Wood for the settlement','Więcej drewna dla osady','Upgrade the Lumber Camp to support island growth.','Rozbuduj budynek drwali. Sprawniejsza produkcja pomoże przygotować materiały dla Latarni i kolejnych budynków.'],
    ['Planks for the new structure','Deski na nową konstrukcję','Produce the displayed Planks and arrange collection.','Wyprodukuj wskazaną liczbę desek w Tartaku. Zadbaj o drewno w magazynie centralnym i odbiór gotowych materiałów.'],
    ['Room for new residents','Miejsce dla nowych mieszkańców','Upgrade the House to provide more beds.','Rozbuduj Dom. Więcej łóżek zapewni mieszkańcom miejsce do odpoczynku.'],
    ['Prepare an invitation','Przygotuj środki na zaproszenie','Gather the full cost of inviting one resident.','Zgromadź środki potrzebne do zaproszenia jednego mieszkańca. Sprawdź pełny koszt i miejsce w limicie Ratusza.'],
    ['Welcome a new resident','Powitaj nowego mieszkańca','Invite one resident rather than waiting for natural population growth.','Zaproś jednego mieszkańca na wyspę. Dzięki Twoim przygotowaniom osada może rozwijać się bez czekania na naturalny przyrost ludności.'],
    ['Lighthouse materials','Materiały dla Latarni','Gather the displayed building materials; the actual upgrade uses them in the next step.','Przygotuj pozostałe materiały potrzebne do rozbudowy Latarni. Gotowy zapas wykorzystasz w następnym etapie.'],
    ['Restore the Lighthouse light','Przywróćmy Latarni blask','Finish the actual Lighthouse upgrade.','Ukończ wskazaną rozbudowę Latarni. Zaczekaj na zakończenie dostaw i prac budowlanych.']][index];
}
function firstNeeded(task) {
  return MATERIAL_IDS.find(id => (task?.requirements?.[id] || task?.objective?.requirements?.[id] || 0) > (task?.deposited?.[id] || 0)) || task?.objective?.resource || 'wood';
}
function newTask(state, m, frame, context) {
  const level = m.chapter.level, base = { id:`${frame.prefix}:${frame.index}`,status:'offered',requirements:{},deposited:{},offeredAt:clock(state),acceptedAt:null,deadline:null,attempt:0,
    duration:6*HOUR,reward:{coins:Math.min(60,10+2*level)} };
  if (frame.kind === 'main') {
    const [title,titlePl,description,descriptionPl]=taskText(frame.index); Object.assign(base,{title,titlePl,description,descriptionPl});
    const target = id => Math.min(level, Math.max(1, lev(state,id)) + 1);
    if (frame.index === 1) { base.objective={type:'contribute'};base.requirements={wood:Math.max(1,Math.min(25*level,available(state,'wood') || 1))}; }
    if (frame.index === 2) base.objective={type:'building',building:'lumber',target:target('lumber')};
    if (frame.index === 3) base.objective={type:'production',resource:'planks',count:Math.min(100,10*level),baseline:m.chapter.productionBaseline.planks};
    if (frame.index === 4) base.objective={type:'building',building:'house',target:target('house')};
    if (frame.index === 5) base.objective={type:'stock',requirements:costFor(state,'townhall',context)};
    if (frame.index === 6) base.objective={type:'invitation',count:1,baseline:m.chapter.invitedBaseline};
    if (frame.index === 7) base.objective={type:'stock',requirements:costFor(state,'lighthouse',context)};
    if (frame.index === 8) base.objective={type:'building',building:'lighthouse',target:m.chapter.targetLevel};
  } else {
    const parent=m.stack[m.stack.length-2]?.task, resource=firstNeeded(parent), producer=PRODUCER[resource];
    const n=Math.max(1,Math.min(10,level*2));
    const texts=frame.kind==='support' ? [null,
      ['Gather the support crew','Zbierz ekipę wsparcia','Assign the displayed crew to help prepare supplies.','Przydziel mieszkańców do wskazanego miejsca pracy, aby przygotować potrzebne zapasy.'],
      ['Prepare useful supplies','Przygotuj potrzebne materiały','Produce the displayed materials.','Wyprodukuj wskazany zapas materiałów potrzebnych do dokończenia przygotowań.'],
      ['Get deliveries moving','Uruchom dostawy','Receive a real producer delivery into central storage.','Zadbaj, aby tragarze odebrali wskazane towary i dowieźli je do magazynu centralnego.'],
      ['Supplies for the crew','Zgromadź zapas dla ekipy','Gather the remaining cost without paying it twice.','Zgromadź zasoby potrzebne do dokończenia przerwanego celu. Wykorzystasz je w ostatnim etapie pomocy.'],
      ['Finish the interrupted step','Dokończ przerwany etap','Finish the prepared parent objective.','Dokończ wskazany cel. Po jego wykonaniu wrócisz do kolejnego zadania misji głównej.']]
      : [null,
        ['Residents lend a hand','Przygotujmy pomoc','Prepare a crew in an available workplace.','Przygotuj wymaganą obsadę w dostępnym miejscu pracy.'],
        ['Urgent supplies','Najpilniejsze zapasy','Receive the displayed real supplies.','Wyprodukuj i odbierz wskazane materiały potrzebne do dokończenia przerwanego etapu.'],
        ['Back to work','Wracamy do działania','Finish the interrupted support objective.','Dokończ wskazany etap pomocniczy. Gdy będzie gotowy, przejdziemy do następnego zadania.']];
    const [title,titlePl,description,descriptionPl]=texts[frame.index];Object.assign(base,{title,titlePl,description,descriptionPl,reward:{coins:Math.min(20,2+level)}});
    if(frame.index===1)base.objective={type:'assign',building:producer,count:1};
    else if(frame.kind==='support'&&frame.index===2)base.objective={type:'production',resource,count:n,baseline:metric(state,'produced',resource)};
    else if(frame.kind==='support'&&frame.index===3||frame.kind==='rescue'&&frame.index===2)base.objective={type:'delivered',resource,count:n,baseline:metric(state,'delivered',resource)};
    else if(frame.kind==='support'&&frame.index===4)base.objective={type:'stock',requirements:remainingCost(state,parent,context)};
    else {
      base.objective=clone(parent.objective);base.requirements=clone(parent.requirements);base.deposited=clone(parent.deposited);
    }
  }
  if(base.objective.type==='stock')base.requirements=cleanCost(base.objective.requirements);
  if(base.objective.type==='building')base.requirements=lev(state,base.objective.building)>=base.objective.target?{}:costFor(state,base.objective.building,context);
  if(base.objective.type==='invitation')base.requirements=costFor(state,'townhall',context);
  return base;
}
function remainingCost(state, task, context) {
  if(!task)return{};
  if(task.objective.type==='building'){
    const project=state.buildings?.[task.objective.building]?.construction;
    return lev(state,task.objective.building)>=task.objective.target||project?.targetLevel>=task.objective.target?{}:costFor(state,task.objective.building,context);
  }
  return Object.fromEntries(Object.entries(task.requirements||{}).map(([id,n])=>[id,Math.max(0,n-(task.deposited?.[id]||0))]).filter(([,n])=>n>0));
}
function accomplished(state,m,task) {
  if(!task)return false;const o=task.objective;
  if(o.type==='building')return lev(state,o.building)>=o.target;
  if(o.type==='production'||o.type==='delivered')return metric(state,o.type==='production'?'produced':'delivered',o.resource)-o.baseline>=o.count;
  if(o.type==='stock')return Object.entries(o.requirements||{}).every(([id,n])=>available(state,id)>=n);
  if(o.type==='invitation')return m.invited-o.baseline>=o.count;
  if(o.type==='assign')return whole(state.buildings?.[o.building]?.workers)>=o.count;
  return Object.entries(task.requirements).every(([id,n])=>whole(task.deposited?.[id])>=n);
}
function proof(state,m,task,context={}) {
  if(accomplished(state,m,task))return{feasible:true,ready:true,duration:600,staffing:{},reason:null};
  const o=task.objective;
  if(o.type==='assign'){
    const free=(state.residents||[]).filter(residentAtHome).length;
    const assigned=whole(state.buildings?.[o.building]?.workers);
    return{feasible:lev(state,o.building)>0&&o.count<=lev(state,o.building)*12&&assigned+free>=o.count,ready:false,duration:600,staffing:{[o.building]:o.count},reasonPl:'Przygotuj mieszkańca do pracy we wskazanym budynku.'};
  }
  if(o.type==='invitation'&&whole(state.population)+whole(state.incomingPassengers)>=lev(state,'townhall')*24)return{feasible:false,ready:false,reasonPl:'Najpierw przygotuj wolne miejsce w limicie Ratusza.'};
  const cost=remainingCost(state,task,context);
  if(o.type==='building'&&o.target>lev(state,'townhall'))return{feasible:false,ready:false,reasonPl:'Najpierw rozbuduj Ratusz do wymaganego poziomu.'};
  let constructionSeconds=0;
  if(o.type==='building'){
    const project=state.buildings?.[o.building]?.construction;
    if(typeof context.constructionEstimate==='function'){
      const estimate=context.constructionEstimate(state,project||cost,o.building);
      const completion=estimate?.completionTotal??estimate?.total;
      // A stock-ready result cannot prove that a carrier exists. In particular,
      // Lighthouse visitors cannot be recalled before their four-hour return.
      if(!finite(completion))return{feasible:false,ready:false,requirements:cost,
        reason:'Prepare available warehouse carriers and a finite delivery schedule before starting.',
        reasonPl:'Najpierw przygotuj dostępnych tragarzy w Magazynie i możliwy do oszacowania harmonogram dostaw.'};
      constructionSeconds=Math.max(0,completion);
    }else if(project?.stage==='building')constructionSeconds=positive(project.buildRemaining);
    else{
      // Callers without the scheduling callback may use this deliberately slow
      // serial bound only when a real carrier is already at work and no earlier
      // construction could add unknown queue time.
      const carriers=(state.residents||[]).filter(person=>person.workplace==='warehouse'&&!person.visitGroup&&!(person.prayerRemaining>EPS)&&!(person.arrivalRemaining>EPS)).length;
      const earlier=(state.constructionProjects||[]).some(item=>item!==project&&(!project||item.order<project.order));
      if(!carriers||earlier)return{feasible:false,ready:false,requirements:cost,
        reason:'Prepare available warehouse carriers and a finite delivery schedule before starting.',
        reasonPl:'Najpierw przygotuj dostępnych tragarzy w Magazynie i możliwy do oszacowania harmonogram dostaw.'};
      const materialCost=project?.remainingMaterials||cost;
      const trips=MATERIAL_IDS.reduce((n,id)=>n+Math.ceil((materialCost[id]||0)/Math.max(1,haulCapacity(state))),0);
      constructionSeconds=positive(project?.transportSeconds)* (o.building==='lighthouse'?4:1)+trips*1200*(o.building==='lighthouse'?5:2)+240;
    }
  }
  const productionResource=['production','delivered'].includes(o.type)?o.resource:null;
  const productionAmount=productionResource?Math.max(1,o.count-(metric(state,o.type==='production'?'produced':'delivered',o.resource)-o.baseline)):null;
  const durations=productionResource?[6*HOUR,12*HOUR,DAY,2*DAY,7*DAY]:[600,1800,HOUR,2*HOUR,6*HOUR,12*HOUR,DAY,2*DAY,7*DAY];
  for(const duration of durations){
    const plan=missionFeasibility(state,cost,{duration,mode:o.type==='contribute'?'contribute':'gather',productionResource,productionAmount});
    if(!plan.feasible)continue;
    const needed=Math.max(600,duration+Math.ceil(constructionSeconds*1.25));
    if(needed>7*DAY)continue;
    return{...plan,duration:needed};
  }
  return{feasible:false,ready:false,requirements:cost,reasonPl:'Przygotuj zapasy, produkcję i transport. Zadanie otrzymasz, gdy będzie możliwe do wykonania.'};
}
function credit(state,m,task){
  if(m.receipts.includes(task.id))return;
  const amount=task.reward.coins;
  if(!Number.isSafeInteger(whole(state.resources?.coins)+amount))return;
  state.resources.coins=whole(state.resources?.coins)+amount;m.receipts.push(task.id);m.receipts=m.receipts.slice(-256);
}
function completeFrameTask(state,m,frame){
  const task=frame.task;credit(state,m,task);
  event(state,'lighthouse-mission-step','Lighthouse mission step complete','Etap misji Latarni ukończony','The reward is already in your resources. Continue to the next task.','Nagroda została dodana do Twoich zasobów. Przejdź do kolejnego zadania.');
  if(frame.index<frame.total){frame.index++;frame.task=null;return;}
  if(frame.kind==='main'){
    m.chapter.status='completed';m.completedLevels=[...new Set([...m.completedLevels,m.chapter.level])].slice(-100);
    m.lastCompletion={level:m.chapter.level,at:clock(state)};m.stack=[];
    event(state,'lighthouse-mission-chapter','A shared goal achieved','Wspólny cel osiągnięty','The Lighthouse is ready. Prepare your island for the next challenge.','Latarnia znów świeci, a Twoja osada jest gotowa na dalszy rozwój.');return;
  }
  m.stack.pop();const parent=m.stack.at(-1);
  // The final repair objective is the same actual objective, not a fake level.
  if(parent?.task&&accomplished(state,m,parent.task)){
    // A rescue may finish the final support contribution. Carry its real
    // deposits through the support frame before resolving the main objective.
    repairContributionParent(m,parent.task);
    completeFrameTask(state,m,parent);
    event(state,'lighthouse-mission-return','Back to the next step','Wracamy do kolejnego etapu','The support plan is complete. Your previous progress is preserved.','Plan pomocy zakończony. Wcześniejszy postęp pozostaje zachowany.');
  }
}
function repairContributionParent(m,task){
  const parent=m.stack[m.stack.length-2]?.task;
  if(parent?.objective.type==='contribute'&&task.objective.type==='contribute')for(const[id,n]of Object.entries(task.deposited))parent.deposited[id]=Math.max(parent.deposited[id]||0,n);
}
function fail(state,m,frame){
  frame.task.status=frame.kind==='rescue'?'retry':'assistance';frame.task.deadline=null;frame.task.acceptedAt=null;
  if(frame.kind==='rescue'){
    frame.task.attempt++;
    event(state,'lighthouse-mission-retry','Try this step again','Spróbujmy jeszcze raz','Keep completed steps and prepare another attempt.','Przygotuj osadę i spróbuj ponownie. Wcześniejszy postęp pozostaje zachowany.');return;
  }
  const kind=frame.kind==='main'?'support':'rescue',total=kind==='support'?5:3;
  if(kind==='support')m.lastIncident={id:frame.task.id,at:clock(state),kind:'plague-ship',narrativeOnly:true};
  m.stack.push({kind,index:1,total,prefix:`${frame.task.id}:${kind}`,task:null});
  event(state,'lighthouse-mission-support',kind==='support'?'The settlement needs support':'A short rescue plan',kind==='support'?'Zorganizujmy wsparcie':'Mieszkańcy ruszają z pomocą',
    'Complete the support steps to return to the next interrupted task.','Wykonaj etapy pomocy, aby wrócić do kolejnego zadania przerwanej ścieżki.');
}
function unlock(state,m){
  if(!eligible(state)||m.chapter?.status==='active')return;
  const level=lev(state,'townhall');if(m.completedLevels.includes(level))return;
  const target=Math.min(100,lev(state,'lighthouse')+1);
  // A maxed Lighthouse has no remaining real upgrade to promise.
  if(lev(state,'lighthouse')>=100)return;
  m.chapter={id:`lighthouse-chapter-${level}`,level,targetLevel:target,startedAt:clock(state),invitedBaseline:m.invited,
    productionBaseline:Object.fromEntries(MATERIAL_IDS.map(id=>[id,metric(state,'produced',id)])),status:'active'};
  m.stack=[{kind:'main',index:1,total:8,prefix:m.chapter.id,task:null}];m.receipts=[];
}
export function advanceMissions(state,seconds=0,context={}){
  const m=ensure(state);if(state._missionForecast===true)return m;
  unlock(state,m);
  for(let guard=0;guard<24&&m.stack.length;guard++){
    const frame=m.stack.at(-1);frame.task ||= newTask(state,m,frame,context);const task=frame.task;
    const precredited=['building','stock','invitation','assign'].includes(task.objective.type);
    if(accomplished(state,m,task)&&(task.status==='active'||precredited)){
      repairContributionParent(m,task);completeFrameTask(state,m,frame);continue;
    }
    if(task.status==='active'&&task.deadline!==null&&clock(state)>=task.deadline-EPS){fail(state,m,frame);continue;}
    break;
  }
  return m;
}
export function nextMissionEvent(state){
  const task=ensure(state).stack.at(-1)?.task;
  return task?.status==='active'&&finite(task.deadline)?Math.max(0,(task.deadline-clock(state))/1000):Infinity;
}
export function recordMissionAction(state,action,result,context={}){
  if(!result?.ok)return;
  const m=ensure(state);
  if(action?.type==='buyResident')m.invited=Math.min(SAFE,m.invited+Math.max(1,whole(result.quantity,1)));
  advanceMissions(state,0,context);
}
export function missionStatus(state,context={}){
  const m=ensure(state),frame=m.stack.at(-1),task=frame?.task;
  if(!frame||!task)return{available:false,preview:lev(state,'townhall')>=2&&!courseOpen(state),finished:m.chapter?.status==='completed',chapter:m.chapter?clone(m.chapter):null,
    reasonPl:!courseOpen(state)?'Misje Latarni czekają po ukończeniu lub zamknięciu samouczka.':'Rozbuduj Ratusz, aby rozpocząć kolejny rozdział.',completedLevels:[...m.completedLevels]};
  const plan=proof(state,m,task,context);
  return{available:true,finished:false,chapter:clone(m.chapter),kind:frame.kind,index:frame.index,total:frame.total,task:clone(task),plan,
    active:task.status==='active',canStart:task.status!=='active'&&plan.feasible,
    remaining:task.deadline===null?null:Math.max(0,(task.deadline-clock(state))/1000),
    progress:task.objective.type==='production'||task.objective.type==='delivered'?Math.min(task.objective.count,Math.max(0,metric(state,task.objective.type==='production'?'produced':'delivered',task.objective.resource)-task.objective.baseline)):null,
    incident:m.lastIncident?clone(m.lastIncident):null,parents:m.stack.slice(0,-1).map(f=>({kind:f.kind,index:f.index,total:f.total}))};
}
export function missionAction(state,action,context={}){
  if(!['missionStart','missionRetry','missionDeposit','missionNext'].includes(action?.type))return null;
  advanceMissions(state,0,context);const m=ensure(state),frame=m.stack.at(-1),task=frame?.task;
  if(action.type==='missionNext'){unlock(state,m);advanceMissions(state,0,context);return good('Lighthouse missions refreshed.');}
  if(!task||action.id!==task.id)return bad('This Lighthouse mission step is no longer available.');
  if(action.type==='missionStart'||action.type==='missionRetry'){
    if(task.status==='active')return bad('This Lighthouse mission step is already active.');
    const plan=proof(state,m,task,context);if(!plan.feasible)return bad('Prepare the required stock, production and transport before starting.',{plan});
    task.duration=plan.duration;task.acceptedAt=clock(state);task.deadline=clock(state)+plan.duration*1000;task.status='active';
    return good('Lighthouse mission step started.',{missionId:task.id,duration:task.duration,plan});
  }
  if(task.status!=='active'||task.objective.type!=='contribute')return bad('Start the material contribution step first.');
  const resource=action.resource,amount=action.amount;
  if(!MATERIAL_IDS.includes(resource)||!Number.isSafeInteger(amount)||amount<1||amount>(task.requirements[resource]||0)-(task.deposited[resource]||0))return bad('Choose a whole amount within the remaining mission requirement.');
  if(available(state,resource)<amount)return bad('Use unreserved central stock and preserve the food reserve.');
  consumeMaterial(state,resource,amount);task.deposited[resource]=(task.deposited[resource]||0)+amount;repairContributionParent(m,task);
  advanceMissions(state,0,context);
  return good('Mission contribution delivered.',{missionId:task.id,completed:m.receipts.includes(task.id)});
}
