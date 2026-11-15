import { developmentText } from './harborlight-v1-development-copy.js?v=frontend-v32-11';
import { warsawDayKey } from './harborlight-v1-calendar.js?v=frontend-v32-11';

// Account-level DEV model. Persistence and authorization belong to the adapter.
// Random outcomes are sampled once and saved; opening a panel never rerolls them.
export const KINGDOM_VERSION = 32;
export const KINGDOM_RULES = Object.freeze({ offerHours: 24, minimumPreparationHours: 6, invitationHours: 2, maximumAllianceMembers: 5, normalPenaltyProbability: .2, normalPenaltyShare: .1, normalPenaltyHours: 72, loanDailyRate: .05, lendingDailyRate: .03, loanApprovalProbability: .7, loanRetryHours: 24, loanMaximumDays: 28, loanDefaultBanDays: 28, maximumPendingLending: 3, collectionFactor: 1.5, shortfallCoinsPerHappiness: 200, forgivenessDraws: 5, forgivenessProbability: .1 });
export const KINGDOM_DEV_BALANCE = Object.freeze({ version: 1, status: 'DEV_PROPOSAL_REQUIRES_REVIEW', forgivenessSkipPrincipalShare: .1, forgivenessSkipMinimumElapsedHours: 24, missionGoodsPerTownhall: 12, missionCoinsPerTownhall: 25, rewardShare: .15, lendingGiftProbability:.1,lendingGiftInterestValueShare:.1,maximumRecordCount: 1000 });
const HOUR = 3600000, DAY = 24 * HOUR, EPS = 1e-8;
const finite = (x, fallback = 0) => Number.isFinite(Number(x)) ? Number(x) : fallback;
const positive = x => Math.max(0, finite(x));
const integer = x => Math.min(Number.MAX_SAFE_INTEGER, Math.floor(positive(x)));
const money = x => Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(positive(x) - EPS));
const clone = value => JSON.parse(JSON.stringify(value));
const ok = (message, extra = {}) => ({ ok: true, message, ...extra });
const bad = (message, code = 'kingdom-invalid-action') => ({ ok: false, message, code });
const identity = (state, ctx) => String(ctx.accountId || state.accountId || state.player?.id || 'local');
const atOf = (state, ctx = {}) => finite(typeof ctx.now === 'function' ? ctx.now() : ctx.now, finite(state.worldTimeMs, finite(state.lastSimulatedAt, 0)));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const worldsOf = (state, ctx = {}) => {
  const values = typeof ctx.worlds === 'function' ? ctx.worlds() : ctx.worlds;
  const worlds = Array.isArray(values) ? values : values && typeof values === 'object' ? Object.values(values) : [state];
  return [...new Set(worlds.filter(w => w && w.resources && w.buildings))];
};
const primary = (state, ctx) => worldsOf(state, ctx).find(w => w.islandRole !== 'daughter') || state;
const maxTownhall = (state, ctx) => Math.max(1, ...worldsOf(state, ctx).map(w => integer(w.buildings?.townhall?.level)));
const uidOf = (world, person) => String(person?.personUid || `${world.islandId || 'island-1'}:resident-${person?.id}`);
const defaultPrices = Object.freeze({ wood: 3, stone: 4, grain: 2, vegetables: 2, livestock: 2, rawMilk: 2, sourMilk: 2, fish: 2, flour: 10, pasteurizedMilk: 10, meat: 2.5, leather: 5, bread: 50, cake: 55, cheese: 10, civilianClothes: 25, militaryClothes: 50, professorRobes: 50, planks: 6, food: 2 });
export const kingdomGoodsValue = (id, ctx = {}) => Math.max(.01, finite(typeof ctx.goodsValue === 'function' ? ctx.goodsValue(id) : defaultPrices[id], 1));
const reserveOf = (world, id, ctx) => {
  const plan = typeof ctx.foodReservePlan === 'function' ? ctx.foodReservePlan(world) : world.provisions?.reservePlan || world.provisions?.protectedReserve || {};
  return positive(plan.goods?.[id] ?? plan.reserved?.[id] ?? plan[id]);
};
const available = (world, id, ctx) => Math.max(0, Math.floor(typeof ctx.availableGoods === 'function' ? finite(ctx.availableGoods(world, id)) : positive(world.resources[id]) - reserveOf(world, id, ctx)));
const getCoins = (state, ctx) => integer(typeof ctx.getCoins === 'function' ? ctx.getCoins() : ctx.sharedWallet?.coins ?? state.resources?.coins);
function spendCoins(state, amount, ctx, meta = {}) {
  amount = money(amount); const k = normalizeKingdom(state), coins = getCoins(state, ctx);
  k.borrowedCoins = Math.min(k.borrowedCoins, coins);
  if (amount > coins || meta.ownOnly && amount > coins - k.borrowedCoins) return false;
  if (typeof ctx.spendCoins === 'function') { const r = ctx.spendCoins(amount, meta); if (r === false || r?.ok === false) return false; }
  else if (ctx.sharedWallet) ctx.sharedWallet.coins -= amount;
  else state.resources.coins -= amount;
  if (!meta.ownOnly) kingdomRecordCoinSpend(state, amount);
  k.borrowedCoins = Math.min(k.borrowedCoins, getCoins(state, ctx));
  return true;
}
function grantCoins(state, amount, ctx) {
  amount = money(amount); if (!amount) return;
  if (typeof ctx.grantCoins === 'function') ctx.grantCoins(amount);
  else if (ctx.sharedWallet) ctx.sharedWallet.coins = integer(ctx.sharedWallet.coins) + amount;
  else state.resources.coins = integer(state.resources.coins) + amount;
}
function spendGoods(world, goods, ctx, meta = {}) {
  const entries = Object.entries(goods).filter(([, amount]) => amount > 0);
  if(!entries.length)return true;
  if (entries.some(([id, amount]) => !Number.isSafeInteger(amount) || amount > available(world, id, ctx))) return false;
  if (typeof ctx.spendGoods === 'function') { const r = ctx.spendGoods(world, Object.fromEntries(entries), meta); return r !== false && r?.ok !== false; }
  for (const [id, amount] of entries) world.resources[id] -= amount;
  return true;
}
function gainGoods(world, goods, ctx, meta = {}) {
  if (typeof ctx.gainGoods === 'function') return ctx.gainGoods(world, goods, meta);
  for (const [id, amount] of Object.entries(goods)) world.resources[id] = positive(world.resources[id]) + integer(amount);
}
function emit(state, ctx, kind, title, message, at = atOf(state, ctx)) {
  const k = normalizeKingdom(state);
  k.events.push({ id: `${kind}-${++k.eventSequence}`, kind, title, message, at });
  k.events = k.events.slice(-100);
  if (typeof ctx.notify === 'function') ctx.notify(state, kind, title, message);
}
function random(k) { let x = k.seed >>> 0 || 0x9e3779b9; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; k.seed = x >>> 0; return k.seed / 4294967296; }
function nextId(k, state, ctx, prefix) { return `${prefix}-${identity(state, ctx).replace(/[^A-Za-z0-9_-]/g, '_')}-${++k.sequence}`; }
function balance(ctx) { return { ...KINGDOM_DEV_BALANCE, ...(ctx.balance || {}) }; }
function accountSeed(seed,id){let hash=seed>>>0;for(const c of String(id)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619)>>>0;}return hash||1;}

export function normalizeKingdom(state, raw = state, ctx = {}) {
  if (raw === state && state.kingdom?.version === KINGDOM_VERSION) {const k=state.kingdom;if(ctx.accountId&&!k.accountSeedId){if(!k.sequence&&!k.offerSequence&&!k.loan&&!k.loanHistory.length)k.seed=accountSeed(k.seed,ctx.accountId);k.accountSeedId=String(ctx.accountId);}return k;}
  const source = raw.kingdom?.version === KINGDOM_VERSION ? raw.kingdom : {};
  const saved = source.version ? clone(source) : {};
  const at = atOf(state, ctx);
  state.kingdom = {
    version: KINGDOM_VERSION, seed: integer(saved.seed) >>> 0 || accountSeed(((integer(at) ^ 0x51f15e) >>> 0) || 1,identity(state,ctx)),accountSeedId:typeof saved.accountSeedId==='string'?saved.accountSeedId:ctx.accountId||state.accountId||null,
    sequence: integer(saved.sequence), eventSequence: integer(saved.eventSequence), offerSequence: integer(saved.offerSequence),
    lastOfferAt: Number.isFinite(saved.lastOfferAt) ? saved.lastOfferAt : null, lastActiveDay: typeof saved.lastActiveDay === 'string' ? saved.lastActiveDay : null,
    processedAt: finite(saved.processedAt, at), offers: Array.isArray(saved.offers) ? saved.offers.slice(-1000) : [], tasks: Array.isArray(saved.tasks) ? saved.tasks.slice(-1000) : [],
    lending: Array.isArray(saved.lending) ? saved.lending.slice(-1000) : [], loan: saved.loan && typeof saved.loan === 'object' ? saved.loan : null,
    loanHistory: Array.isArray(saved.loanHistory) ? saved.loanHistory.slice(-100) : [], loanNextAttemptAt: positive(saved.loanNextAttemptAt), loanBannedUntil: positive(saved.loanBannedUntil),
    forgivenessSkipPending: saved.forgivenessSkipPending === true, lastForgivenPrincipal: positive(saved.lastForgivenPrincipal), borrowedCoins: positive(saved.borrowedCoins),
    lastPenaltyAt: Number.isFinite(saved.lastPenaltyAt) ? saved.lastPenaltyAt : null,
    deferredPenalties: Array.isArray(saved.deferredPenalties) ? saved.deferredPenalties.slice(-1000) : [], financialOffsets: saved.financialOffsets && typeof saved.financialOffsets === 'object' ? saved.financialOffsets : {},
    receipts: Object.assign(Object.create(null), saved.receipts && typeof saved.receipts === 'object' ? saved.receipts : {}), events: Array.isArray(saved.events) ? saved.events.slice(-100) : []
  };
  return state.kingdom;
}
export function kingdomRecordCoinSpend(state, amount) { const k = normalizeKingdom(state); k.borrowedCoins = Math.max(0, k.borrowedCoins - positive(amount)); }
export function financialHappinessPenalty(state, person) { const k = normalizeKingdom(state); return positive(k.financialOffsets[uidOf(state, person)]); }
export function recoverFinancialHappiness(state, person, points) { const k = normalizeKingdom(state), id = uidOf(state, person); k.financialOffsets[id] = Math.max(0, positive(k.financialOffsets[id]) - positive(points)); return k.financialOffsets[id]; }

function memberState(owner, memberId, ctx) {
  if (memberId === identity(owner, ctx)) return { state: owner, context: ctx };
  const member = typeof ctx.getAccount === 'function' ? ctx.getAccount(memberId) : null;
  if (!member?.state) return null;
  const shared = { accountId: memberId, now: ctx.now, goodsValue: ctx.goodsValue, availableGoods: ctx.availableGoods, spendGoods: ctx.spendGoods, gainGoods: ctx.gainGoods, foodReservePlan: ctx.foodReservePlan, notify: ctx.notify, sharedTasks: ctx.sharedTasks, getAccount: ctx.getAccount, balance: ctx.balance };
  return { state: member.state, context: { ...shared, ...member.context, worlds: member.worlds || [member.state], sharedWallet: member.sharedWallet } };
}
function sharedTaskList(state, ctx) {
  const shared = ctx.sharedTasks instanceof Map ? [...ctx.sharedTasks.values()] : Array.isArray(ctx.sharedTasks) ? ctx.sharedTasks : ctx.sharedTasks && typeof ctx.sharedTasks === 'object' ? Object.values(ctx.sharedTasks) : [];
  const map = new Map([...normalizeKingdom(state).tasks, ...shared].filter(Boolean).map(t => [t.id, t]));
  return [...map.values()];
}
function shareTask(task, ctx) {
  if (ctx.sharedTasks instanceof Map) ctx.sharedTasks.set(task.id, task);
  else if (Array.isArray(ctx.sharedTasks)) { const index = ctx.sharedTasks.findIndex(t => t.id === task.id); if (index < 0) ctx.sharedTasks.push(task); else ctx.sharedTasks[index] = task; }
  else if (ctx.sharedTasks && typeof ctx.sharedTasks === 'object') ctx.sharedTasks[task.id] = task;
}
function lendingRecords(state,ctx){const k=normalizeKingdom(state),tasks=sharedTaskList(state,ctx),records=[...k.lending,...tasks.map(t=>t.lendingRecord).filter(Boolean)],map=new Map();for(const record of records){const known=map.get(record.id);if(!known||known.status!=='returned'&&record.status==='returned')map.set(record.id,record);else for(const[id,payout]of Object.entries(record.payouts||{}))if(payout.claimed&&!known.payouts?.[id]?.claimed){known.payouts||={};known.payouts[id]=payout;}}k.lending=k.lending.map(l=>map.get(l.id));for(const task of tasks)if(task.lendingRecord)task.lendingRecord=map.get(task.lendingRecord.id);return [...map.values()];}
function pendingLending(state,ctx){const self=identity(state,ctx);return lendingRecords(state,ctx).filter(l=>l.status==='funded'&&l.participants.includes(self));}
export function kingdomAllianceLocked(state, ctx = {}) { return sharedTaskList(state, ctx).some(t => (t.status === 'active'||t.lendingRecord?.status==='funded') && t.allianceId && (!ctx.alliance?.id || t.allianceId === ctx.alliance.id)); }
function militaryCount(world, kind, ctx) {
  if (typeof ctx.militaryCount === 'function') return integer(ctx.militaryCount(world, kind));
  const people = world.military?.people || {},present=new Set((world.residents||[]).map(p=>uidOf(world,p)));
  return Object.entries(people).filter(([key,p]) => present.has(key)&&!p.away && !p.waiting && (kind === 'officer' ? p.officer === true || p.rank === 'officer' : true)).length;
}
function personValues(state, ctx) { const level = maxTownhall(state, ctx), soldier = kingdomGoodsValue('militaryClothes', ctx) * 3; const officer = soldier + kingdomGoodsValue('militaryClothes', ctx) * 8 + 250 + 50 * Math.max(0, level - 4); return { soldiers: soldier, officers: officer, professors: officer }; }
function requirementsValue(requirements, values, ctx) { return positive(requirements.coins) + Object.entries(requirements.goods || {}).reduce((sum, [id, n]) => sum + positive(n) * kingdomGoodsValue(id, ctx), 0) + positive(requirements.soldiers) * values.soldiers + positive(requirements.officers) * values.officers + positive(requirements.professors) * values.professors; }
function contributedValue(task, ctx) { return Object.values(task.contributions || {}).reduce((sum, c) => sum + requirementsValue(c, task.personValues, ctx), 0); }
function totalAvailable(state, resource, ctx) { return worldsOf(state, ctx).reduce((sum, world) => sum + available(world, resource, ctx), 0); }
function possessionValue(state, task, ctx) {
  const req = task.requirements;
  return Math.min(positive(req.coins), getCoins(state, ctx)) + Object.entries(req.goods || {}).reduce((sum, [id, n]) => sum + Math.min(positive(n), totalAvailable(state, id, ctx)) * kingdomGoodsValue(id, { goodsValue: id => task.goodsValues[id] }), 0)
    + Math.min(positive(req.soldiers), worldsOf(state, ctx).reduce((s, w) => s + militaryCount(w, 'soldier', ctx), 0)) * task.personValues.soldiers
    + Math.min(positive(req.officers), worldsOf(state, ctx).reduce((s, w) => s + militaryCount(w, 'officer', ctx), 0)) * task.personValues.officers
    + Math.min(positive(req.professors), worldsOf(state, ctx).reduce((s, w) => s + (typeof ctx.eligiblePeople === 'function' ? integer(ctx.eligiblePeople(w, 'professor')?.length) : Object.values(w.education?.people || {}).filter(p => p.profession==='professor' && !p.rescueGift).length), 0)) * task.personValues.professors;
}
const buildingLevel = (state, id) => integer(state.buildings?.[id]?.level);
function eligibleGoods(state, ctx) {
  const worlds = worldsOf(state, ctx), has = (id, n = 1) => worlds.some(w => buildingLevel(w, id) >= n);
  return ['wood', 'stone', ...(has('farm') ? ['grain', 'vegetables'] : []), ...(has('farm', 2) ? ['livestock', 'rawMilk'] : []), ...(has('windmill') ? ['flour'] : []), ...(has('sawmill') ? ['planks'] : []), ...(has('fisher') ? ['fish'] : []), ...(has('slaughterhouse') ? ['meat', 'leather'] : []), ...(has('dairy') ? ['pasteurizedMilk'] : []), ...(has('bakery') ? ['bread', 'cake'] : []), ...(has('leatherworks') ? ['civilianClothes', 'militaryClothes'] : [])];
}
export function kingdomPortfolioQuote(state,requirements={goods:{}},ctx={}){
  const self=identity(state,ctx),committed={coins:0,goods:{},soldiers:0,officers:0,professors:0};
  for(const task of sharedTaskList(state,ctx))if(task.status==='active'&&task.kind!=='deposit'&&task.participants.includes(self)){const req=outstandingRequirements(task);for(const key of ['coins','soldiers','officers','professors'])committed[key]+=positive(req[key]);for(const[id,n]of Object.entries(req.goods||{}))committed.goods[id]=positive(committed.goods[id])+n;}
  const freeGoods={};for(const id of new Set([...Object.keys(requirements.goods||{}),...Object.keys(committed.goods)]))freeGoods[id]=Math.max(0,totalAvailable(state,id,ctx)-positive(committed.goods[id]));
  return {committed,freeCoins:Math.max(0,getCoins(state,ctx)-committed.coins),freeGoods};
}
function preparationSeconds(state, requirements, ctx) {
  const portfolio=kingdomPortfolioQuote(state,requirements,ctx);
  if (typeof ctx.estimatePreparation === 'function') return Math.max(0, finite(ctx.estimatePreparation(state, requirements, {...ctx,portfolio})));
  const workers = Math.max(1, worldsOf(state, ctx).reduce((sum, w) => sum + (w.residents?.length || w.population || 0), 0) * .15);
  const goods = Object.entries(requirements.goods || {}).reduce((sum, [id, n]) => sum + Math.max(0, n - portfolio.freeGoods[id]), 0);
  return goods / (40 * workers) * 3600 + (positive(requirements.soldiers)+positive(requirements.officers)+portfolio.committed.soldiers+portfolio.committed.officers) * maxTownhall(state, ctx) * 300;
}
function createOffer(state, ctx, at) {
  const k = normalizeKingdom(state), cfg = balance(ctx), level = maxTownhall(state, ctx), goods = eligibleGoods(state, ctx);
  const military = (k.offerSequence + 1) % 5 === 0 && worldsOf(state, ctx).some(w => buildingLevel(w, 'barracks'));
  let kind, title, requirements = { goods: {} }, options = {};
  if (military) {
    const types = ['army', 'development', 'officerTraining']; kind = types[Math.floor(random(k) * types.length)];
    if (kind === 'army') { title = 'Straż dla królewskiego konwoju'; requirements.soldiers = Math.max(1, Math.ceil(level / 3)); }
    if (kind === 'development') { title = 'Pułk odstraszający najeźdźców'; requirements.soldiers = Math.max(4, level * 2); }
    if (kind === 'officerTraining') { title = 'Kadra na trudniejsze czasy'; requirements.officers = Math.max(1, Math.ceil(level / 5)); }
  } else {
    const draw = random(k);
    if (draw < .18 && getCoins(state, ctx) > 0) { kind = 'lending'; title = 'Pożyczka na odbudowę królewskiej przystani'; requirements.coins = Math.max(10, Math.min(level * 100, Math.floor(getCoins(state, ctx) * .3))); options.lendingHours = [12, 24, 48, 72, 96][Math.floor(random(k) * 5)]; }
    else if (draw < .3) { kind = 'deposit'; title = 'Królewskie zapasy na przechowanie'; requirements.goods.wood = Math.max(10, level * cfg.missionGoodsPerTownhall); options.depositHours = 24 + Math.floor(random(k) * 4) * 24; }
    else if (draw < .36 && worldsOf(state, ctx).some(w => buildingLevel(w, 'academy'))) { kind = 'professor'; title = 'Uczony dla królewskiej szkoły'; requirements.professors = 1; }
    else {
      kind = draw < .6 ? 'supply' : draw < .8 ? 'mixed' : 'coins'; title = kind === 'coins' ? 'Wsparcie królewskiego skarbca' : kind === 'mixed' ? 'Zapasy dla nadmorskich osad' : 'Dostawa do królewskiego portu';
      if (kind !== 'coins') { const first = goods[Math.floor(random(k) * goods.length)]; requirements.goods[first] = Math.max(5, level * cfg.missionGoodsPerTownhall); if (kind === 'mixed') { const second = goods.filter(id => id !== first)[Math.floor(random(k) * Math.max(1, goods.length - 1))]; if (second) requirements.goods[second] = Math.max(3, level * 6); } }
      if (kind !== 'supply') requirements.coins = level * cfg.missionCoinsPerTownhall;
    }
  }
  k.offerSequence++;
  const values = personValues(state, ctx), goodsValues = Object.fromEntries(Object.keys(requirements.goods).map(id => [id, kingdomGoodsValue(id, ctx)]));
  const value = requirementsValue(requirements, values, { goodsValue: id => goodsValues[id] });
  const preparation = preparationSeconds(state, requirements, ctx), duration = Math.max(KINGDOM_RULES.minimumPreparationHours * 3600, preparation * 2);
  const offer = { id: nextId(k, state, ctx, 'royal-offer'), kind, title, requirements, goodsValues, personValues: values, value, offeredAt: at, expiresAt: at + DAY, executionSeconds: duration,
    portfolio:kingdomPortfolioQuote(state,requirements,ctx),allianceAllowed: !['deposit', 'development', 'officerTraining'].includes(kind), reward: { coins: Math.max(5, money(value * cfg.rewardShare)), goods: {} }, status: 'offered', penaltyRoll: random(k), ...options };
  if (kind === 'lending') { offer.interest = money(requirements.coins * .03 * options.lendingHours / 24); offer.reward = { coins: offer.interest, goods: {} };offer.thankYouReward=random(k)<cfg.lendingGiftProbability?{wood:Math.max(1,Math.floor(offer.interest*cfg.lendingGiftInterestValueShare/kingdomGoodsValue('wood',ctx)))}:{}; }
  if (kind === 'deposit' && random(k) < .2) offer.reward.coins = 0;
  k.offers.push(offer);k.lastOfferAt = at;k.lastActiveDay = warsawDayKey(at);
  emit(state, ctx, 'kingdom-offer', 'Prośba Królestwa', `${title}. Oferta jest dostępna przez 24 godziny.`, at);
  return offer;
}
function canOffer(state, ctx, at) { const k = normalizeKingdom(state); return k.lastOfferAt === null || at - k.lastOfferAt >= HOUR; }
function outstandingRequirements(task) {
  const req = clone(task.requirements), totals = { coins: 0, goods: {}, soldiers: 0, officers: 0, professors: 0 };
  for (const c of Object.values(task.contributions || {})) { for (const key of ['coins','soldiers','officers','professors']) totals[key] += positive(c[key]); for (const [id,n] of Object.entries(c.goods || {})) totals.goods[id] = positive(totals.goods[id]) + positive(n); }
  req.coins = Math.max(0, positive(req.coins) - totals.coins);
  for (const [id,n] of Object.entries(req.goods || {})) req.goods[id] = Math.max(0,n - positive(totals.goods[id]));
  for (const key of ['soldiers','officers','professors']) req[key] = Math.max(0,positive(req[key]) - totals[key]);
  return req;
}
function completed(req) { return positive(req.coins) + positive(req.soldiers) + positive(req.officers) + positive(req.professors) + Object.values(req.goods || {}).reduce((s,n)=>s+positive(n),0) <= EPS; }
function applyRewards(state, task, ctx, at) {
  task.pendingPayouts ||= {};
  for (const id of task.participants) if (!own(task.pendingPayouts,id)) task.pendingPayouts[id] = { coins: money(task.reward.coins), goods: clone(task.reward.goods || {}), claimed: false };
  claimPayouts(state, task, ctx, at);
}
function claimPayouts(state, task, ctx, at) {
  for (const [id,payout] of Object.entries(task.pendingPayouts || {})) {
    if (payout.claimed) continue;
    const member = memberState(state,id,ctx);if(!member)continue;
    grantCoins(member.state,payout.coins,member.context);gainGoods(primary(member.state,member.context),payout.goods,member.context,{kind:'kingdom-reward',taskId:task.id});payout.claimed=true;payout.claimedAt=at;
    emit(member.state,member.context,'kingdom-reward','Nagroda Królestwa',`Zadanie „${task.title}”: ${payout.coins} monet.`,at);
  }
}
function completeTask(state, task, ctx, at) {
  if(task.status!=='active')return;
  task.status='completed';task.completedAt=at;
  if(task.kind==='lending'){
    task.lendingReturnAt=at+task.lendingHours*HOUR;
    const owner=memberState(state,task.ownerId,ctx)||{state,context:ctx},k=normalizeKingdom(owner.state),record={id:task.id,taskId:task.id,title:task.title,principal:task.requirements.coins,contributions:clone(task.contributions),participants:[...task.participants],interest:task.interest,thankYouReward:clone(task.thankYouReward||{}),dueAt:task.lendingReturnAt,fundedAt:at,status:'funded',payouts:{}};
    k.lending.push(record);task.lendingRecord=record;emit(state,ctx,'kingdom-lending','Pożyczka przekazana',`Kapitał wróci w podanym terminie; każdemu uczestnikowi należy się ${record.interest} monet odsetek.`,at);
  }else applyRewards(state,task,ctx,at);
}
function addContribution(task,id,values){task.contributions[id]||={coins:0,goods:{},soldiers:0,officers:0,professors:0};const c=task.contributions[id];for(const key of ['coins','soldiers','officers','professors'])c[key]+=positive(values[key]);for(const[key,n]of Object.entries(values.goods||{}))c.goods[key]=positive(c.goods[key])+positive(n);}
function applyHappinessDebt(state, points, ctx, at, reason) {
  if(!(points>EPS))return;
  const k=normalizeKingdom(state);
  for(const world of worldsOf(state,ctx)){
    const ids=(world.residents||[]).map(p=>uidOf(world,p));
    if(world.lighthouseRemaining>EPS){k.deferredPenalties.push({id:nextId(k,state,ctx,'deferred-penalty'),worldId:world.islandId||'island-1',residentIds:ids,points,reason,createdAt:at,dueAt:at+world.lighthouseRemaining*1000,status:'waiting'});continue;}
    for(const id of ids)k.financialOffsets[id]=positive(k.financialOffsets[id])+points;
  }
  emit(state,ctx,'kingdom-financial-penalty','Niepokryta należność',developmentText('MSG-HAPPINESS-SHORTFALL',{brak:Math.round(points*200),punkty:Math.round(points*100)/100}),at);
}
function collect(state,value,ctx,at,reason){
  let remaining=money(value);const initial=remaining,coinTake=Math.min(remaining,getCoins(state,ctx));
  if(coinTake&&spendCoins(state,coinTake,ctx,{kind:'kingdom-collection',reason}))remaining-=coinTake;
  const worlds=worldsOf(state,ctx),goods={};
  const ids=[...new Set(worlds.flatMap(w=>Object.keys(w.resources||{})))].filter(id=>id!=='coins');
  ids.sort((a,b)=>worlds.reduce((s,w)=>s+available(w,b,ctx),0)-worlds.reduce((s,w)=>s+available(w,a,ctx),0)||a.localeCompare(b));
  for(const id of ids){if(remaining<=EPS)break;const price=kingdomGoodsValue(id,ctx);for(const world of worlds){const take=Math.min(available(world,id,ctx),Math.ceil(remaining/price));if(take&&spendGoods(world,{[id]:take},ctx,{kind:'kingdom-collection',reason})){remaining=Math.max(0,remaining-take*price);goods[id]=positive(goods[id])+take;}if(remaining<=EPS)break;}}
  if(remaining>EPS)applyHappinessDebt(state,remaining/200,ctx,at,reason);
  return {value:initial,coins:coinTake,goods,uncovered:money(remaining),happinessPoints:remaining/200};
}
function normalPenalty(state,task,ctx,at){
  if(task.normalPenaltyResolved)return;task.normalPenaltyResolved=true;task.penalties={};
  if(task.penaltyRoll>=.2)return;
  const req=outstandingRequirements(task),value=money(requirementsValue(req,task.personValues,{goodsValue:id=>task.goodsValues[id]||kingdomGoodsValue(id,ctx)})*.1);
  for(const id of task.participants||[identity(state,ctx)]){const member=memberState(state,id,ctx);if(!member){task.penalties[id]={pending:true,value,at};continue;}const k=normalizeKingdom(member.state);if(k.lastPenaltyAt!==null&&at-k.lastPenaltyAt<72*HOUR){task.penalties[id]={skipped:'cooldown'};continue;}k.lastPenaltyAt=at;task.penalties[id]=collect(member.state,value,member.context,at,'normal-tax');emit(member.state,member.context,'kingdom-tax','Dodatkowy podatek',developmentText('MSG-TAX-IMPOSED',{wartość:value}),at);}
}
function accrueLoan(loan,at){if(!loan||loan.status!=='active')return;const until=Math.max(loan.lastAccruedAt,Math.min(at,loan.dueAt));loan.interestAccrued+=loan.principalOutstanding*.05*(until-loan.lastAccruedAt)/DAY;loan.lastAccruedAt=until;}
function closeLoan(state,loan,status,ctx,at){
  const k=normalizeKingdom(state);loan.status=status;loan.closedAt=at;
  if(status==='forgiven'){k.forgivenessSkipPending=true;k.lastForgivenPrincipal=loan.initialPrincipal;k.borrowedCoins=0;emit(state,ctx,'kingdom-forgiveness','Królewski gest łaski!',developmentText('MSG-LOAN-FORGIVEN'),at);}
  if(status==='repaid'&&!loan.forgivenessEligible&&k.forgivenessSkipPending){const cfg=balance(ctx),threshold=Math.max(1,money(k.lastForgivenPrincipal*cfg.forgivenessSkipPrincipalShare));if(loan.initialPrincipal>=threshold&&at-loan.issuedAt>=cfg.forgivenessSkipMinimumElapsedHours*HOUR)k.forgivenessSkipPending=false;}
  k.loanHistory.push(clone(loan));k.loanHistory=k.loanHistory.slice(-100);k.loan=null;
}
function repayLoan(state,amount,ctx,at){
  const k=normalizeKingdom(state),loan=k.loan;if(!loan)return bad('Nie masz aktywnej pożyczki.','kingdom-no-loan');accrueLoan(loan,at);
  const due=money(loan.principalOutstanding+loan.interestAccrued),pay=amount===undefined?due:money(amount);
  if(!pay||pay>due)return bad('Podaj dodatnią kwotę nie większą niż pozostała należność.');
  if(!spendCoins(state,pay,ctx,{kind:'kingdom-repayment'}))return bad('Brakuje monet na tę spłatę.','kingdom-insufficient-coins');
  const interestPaid=Math.min(loan.interestAccrued,pay);loan.interestAccrued-=interestPaid;loan.principalOutstanding=Math.max(0,loan.principalOutstanding-(pay-interestPaid));loan.paidCoins+=pay;
  if(loan.principalOutstanding+loan.interestAccrued<=EPS)closeLoan(state,loan,'repaid',ctx,at);
  return ok(k.loan?'Część pożyczki została spłacona. Dalsze odsetki naliczamy od pozostałego kapitału.':developmentText('MSG-LOAN-REPAID'),{paid:pay,remaining:k.loan?money(k.loan.principalOutstanding+k.loan.interestAccrued):0});
}
function loanDiscovery(state,ctx){if(typeof ctx.hasLoanDiscovery==='function')return worldsOf(state,ctx).some(w=>ctx.hasLoanDiscovery(w));return worldsOf(state,ctx).some(w=>['royal-credit','kingdom-loans','royalCredit'].some(id=>w.education?.discoveries?.[id]||w.education?.research?.[id]?.level>0||w.education?.researches?.[id]?.completed));}
export function kingdomLoanQuote(state,action={},ctx={}){
  const k=normalizeKingdom(state),at=atOf(state,ctx),level=maxTownhall(state,ctx),wealth=getCoins(state,ctx)+worldsOf(state,ctx).reduce((sum,w)=>sum+Object.entries(w.resources).filter(([id])=>id!=='coins').reduce((s,[id,n])=>s+positive(n)*kingdomGoodsValue(id,ctx),0),0);
  const limit=Math.min(level*2000,Math.floor(wealth*2)),amount=integer(action.amount),days=integer(action.days);
  const eligibility=level<5?'Pożyczka wymaga Ratusza na poziomie 5.':!loanDiscovery(state,ctx)?'Pożyczka wymaga odpowiedniego odkrycia w Akademii.':k.loan?'Na koncie może być tylko jedna zaciągnięta pożyczka.':at<k.loanBannedUntil?'Po niespłaceniu pożyczki obowiązuje 28-dniowa przerwa.':at<k.loanNextAttemptAt?'Po odmowie kolejny wniosek można złożyć po 24 godzinach.':null;
  return {ok:!eligibility&&amount>0&&amount<=limit&&days>=1&&days<=28,message:eligibility||(!(amount>0&&amount<=limit)?developmentText('MSG-LOAN-LIMIT',{limit}):days<1||days>28?'Wybierz termin od 1 do 28 pełnych dni.':'Warunki pożyczki gotowe.'),limit,amount,days,interest:money(amount*.05*days),total:money(amount*(1+.05*days)),dueAt:at+days*DAY,approvalProbability:.7,forgivenessEligible:!k.forgivenessSkipPending,nextAttemptAt:k.loanNextAttemptAt,bannedUntil:k.loanBannedUntil};
}
function eventList(state,ctx){
  const k=normalizeKingdom(state),events=[];
  for(const o of k.offers)if(o.status==='offered')events.push({at:o.expiresAt,kind:'offer',item:o,priority:5});
  for(const t of sharedTaskList(state,ctx))if(t.status==='active')events.push({at:t.deadline,kind:t.kind==='deposit'?'deposit':'task',item:t,priority:t.kind==='deposit'?3:4});
  for(const l of pendingLending(state,ctx))events.push({at:l.dueAt,kind:'lending',item:l,priority:0});
  if(k.loan?.status==='active'){events.push({at:k.loan.dueAt,kind:'loan',item:k.loan,priority:2});for(const d of k.loan.draws||[])if(!d.processed)events.push({at:d.at,kind:'forgiveness',item:d,loan:k.loan,priority:1});}
  for(const d of k.deferredPenalties)if(d.status==='waiting'){const world=worldsOf(state,ctx).find(w=>(w.islandId||'island-1')===d.worldId);if(world)events.push({at:finite(d.dueAt,d.createdAt+positive(world.lighthouseRemaining)*1000),kind:'deferred',item:d,priority:6});}
  return events.filter(e=>Number.isFinite(e.at)).sort((a,b)=>a.at-b.at||a.priority-b.priority||String(a.item.id||'').localeCompare(String(b.item.id||'')));
}
function settleEvent(state,e,ctx,at){
  const k=normalizeKingdom(state);
  if(e.kind==='offer'&&e.item.status==='offered'){e.item.status='expired';normalPenalty(state,{...e.item,participants:[identity(state,ctx)],contributions:{}},ctx,at);e.item.normalPenaltyResolved=true;}
  else if(e.kind==='task'&&e.item.status==='active'){e.item.status='failed';e.item.failedAt=at;normalPenalty(state,e.item,ctx,at);emit(state,ctx,'kingdom-task-failed','Termin zadania minął','Wpłacone wcześniej materiały nie wracają.',at);}
  else if(e.kind==='deposit'&&e.item.status==='active'){
    const task=e.item,missing={};
    for(const[id,n]of Object.entries(task.requirements.goods)){let remaining=n;for(const world of worldsOf(state,ctx)){const take=Math.min(remaining,available(world,id,ctx));if(take&&spendGoods(world,{[id]:take},ctx,{kind:'kingdom-deposit-return'}))remaining-=take;if(!remaining)break;}if(remaining)missing[id]=remaining;}
    const value=Object.entries(missing).reduce((s,[id,n])=>s+n*(task.goodsValues[id]||kingdomGoodsValue(id,ctx)),0);task.depositCollection=value?collect(state,value*1.5,ctx,at,'deposit-shortfall'):null;task.status=value?'failed':'completed';task.completedAt=at;if(!value)applyRewards(state,task,ctx,at);emit(state,ctx,'kingdom-deposit-return',value?'Niepełny zwrot depozytu':'Depozyt zwrócony',value?'Brakującą część rozliczono z dopłatą 50%.':'Królewskie towary zostały zwrócone w terminie.',at);
  } else if(e.kind==='lending'&&e.item.status==='funded'){
    const l=e.item;l.status='returned';l.returnedAt=at;
    for(const id of l.participants){const member=memberState(state,id,ctx),capital=money(l.contributions[id]?.coins);l.payouts[id]={coins:capital+l.interest,goods:clone(l.thankYouReward||{}),principal:capital,interest:l.interest,claimed:false};if(member){grantCoins(member.state,capital+l.interest,member.context);gainGoods(primary(member.state,member.context),l.payouts[id].goods,member.context,{kind:'kingdom-lending-thanks',taskId:l.id});l.payouts[id].claimed=true;emit(member.state,member.context,'kingdom-lending-return','Królestwo zwróciło pożyczkę',`Zwrot Twojego kapitału: ${capital}. Nagroda: ${l.interest} monet.${Object.keys(l.thankYouReward||{}).length?' Dodatkowy prezent trafił do Magazynu.':''}`,at);}}
  } else if(e.kind==='forgiveness'&&k.loan===e.loan&&e.loan.status==='active'){
    e.item.processed=true;if(e.item.success){accrueLoan(e.loan,at);closeLoan(state,e.loan,'forgiven',ctx,at);}
  } else if(e.kind==='loan'&&k.loan===e.item&&e.item.status==='active'){
    const l=e.item;accrueLoan(l,at);const due=money(l.principalOutstanding+l.interestAccrued);
    if(getCoins(state,ctx)>=due){spendCoins(state,due,ctx,{kind:'kingdom-auto-repayment'});l.paidCoins+=due;l.principalOutstanding=0;l.interestAccrued=0;closeLoan(state,l,'repaid',ctx,at);}
    else {l.collection=collect(state,due*1.5,ctx,at,'loan-default');k.loanBannedUntil=at+28*DAY;closeLoan(state,l,'defaulted',ctx,at);emit(state,ctx,'kingdom-loan-default','Pożyczka niespłacona w terminie',developmentText('MSG-LOAN-OVERDUE'),at);}
  } else if(e.kind==='deferred'&&e.item.status==='waiting'){
    e.item.status='applied';e.item.appliedAt=at;for(const id of e.item.residentIds)k.financialOffsets[id]=positive(k.financialOffsets[id])+e.item.points;
    emit(state,ctx,'kingdom-deferred-penalty','Ochrona Latarni dobiegła końca',developmentText('MSG-PENALTY-DEFERRED-APPLIED',{punkty:Math.round(e.item.points*100)/100}),at);
  }
}
export function advanceKingdom(state,elapsedSeconds,ctx={}){
  const k=normalizeKingdom(state),start=atOf(state,ctx),end=start+Math.max(0,finite(elapsedSeconds))*1000;
  if(end<k.processedAt-EPS)return;
  for(const deferred of k.deferredPenalties)if(deferred.status==='waiting'){const world=worldsOf(state,ctx).find(w=>(w.islandId||'island-1')===deferred.worldId);if(world&&world.lighthouseRemaining>0)deferred.dueAt=Math.max(finite(deferred.dueAt,deferred.createdAt),start+world.lighthouseRemaining*1000);}
  let cursor=k.processedAt,guard=0;
  while(guard++<10000){const e=eventList(state,{...ctx,now:cursor}).find(e=>e.at<=end+EPS);if(!e)break;const at=Math.max(cursor,e.at);accrueLoan(k.loan,at);settleEvent(state,e,{...ctx,now:at},at);cursor=at;}
  accrueLoan(k.loan,end);k.processedAt=end;
  for(const t of sharedTaskList(state,ctx)){claimPayouts(state,t,ctx,end);for(const[id,p]of Object.entries(t.penalties||{}))if(p.pending){const member=memberState(state,id,ctx);if(member){const mk=normalizeKingdom(member.state);if(mk.lastPenaltyAt===null||p.at-mk.lastPenaltyAt>=72*HOUR){mk.lastPenaltyAt=p.at;t.penalties[id]=collect(member.state,p.value,member.context,p.at,'normal-tax');}else t.penalties[id]={skipped:'cooldown'};}}}
  for(const l of lendingRecords(state,ctx))for(const[id,p]of Object.entries(l.payouts||{}))if(!p.claimed){const member=memberState(state,id,ctx);if(member){grantCoins(member.state,p.coins,member.context);gainGoods(primary(member.state,member.context),p.goods||{},member.context,{kind:'kingdom-lending-thanks',taskId:l.id});p.claimed=true;}}
  if(ctx.online===true&&canOffer(state,ctx,end))createOffer(state,ctx,end);
}
export function nextKingdomEvent(state,ctx={}){const at=atOf(state,ctx),event=eventList(state,ctx)[0];return event?Math.max(0,(event.at-at)/1000):Infinity;}

function performAction(state,action,ctx,at){
  const k=normalizeKingdom(state),self=identity(state,ctx),type=action.type;
  if(type==='kingdomOffer'){if(!canOffer(state,ctx,at))return bad('Następna prośba Królestwa może pojawić się najwcześniej po godzinie.','kingdom-offer-cooldown');return ok('Nowa prośba Królestwa.',{offer:clone(createOffer(state,ctx,at))});}
  if(type==='kingdomApplyLoan'){
    const quote=kingdomLoanQuote(state,action,{...ctx,now:at});if(!quote.ok)return bad(quote.message,'kingdom-loan-unavailable');
    if(random(k)>=.7){k.loanNextAttemptAt=at+DAY;return bad('Królestwo odmówiło pożyczki. Kolejny wniosek możesz złożyć po 24 godzinach.','kingdom-loan-refused');}
    const eligible=!k.forgivenessSkipPending,draws=[];
    if(eligible)for(let i=0;i<5;i++)draws.push({at:at+(i+random(k))*(quote.days*DAY/5),success:random(k)<.1,processed:false});
    k.loan={id:nextId(k,state,ctx,'royal-loan'),status:'active',initialPrincipal:quote.amount,principalOutstanding:quote.amount,interestAccrued:0,paidCoins:0,issuedAt:at,lastAccruedAt:at,dueAt:quote.dueAt,days:quote.days,forgivenessEligible:eligible,draws};grantCoins(state,quote.amount,ctx);k.borrowedCoins+=quote.amount;return ok('Pożyczka została przyznana.',{loanId:k.loan.id,amount:quote.amount,dueAt:quote.dueAt,total:quote.total});
  }
  if(type==='kingdomRepayLoan')return repayLoan(state,action.amount,ctx,at);
  if(type==='kingdomClaimRewards'){advanceKingdom(state,0,{...ctx,now:at,online:false});return ok('Sprawdzono należne nagrody i zwroty.');}
  if(type==='kingdomAccept'||type==='kingdomDeposit'){
    const offer=k.offers.find(o=>o.id===action.offerId);if(!offer||offer.status!=='offered'||offer.expiresAt<=at)return bad('Ta oferta nie jest już dostępna.','kingdom-offer-unavailable');
    if(offer.kind==='lending'&&pendingLending(state,ctx).length>=3)return bad(developmentText('MSG-LEND-PENDING-LIMIT'),'kingdom-lending-limit');
    const task={...clone(offer),id:nextId(k,state,ctx,'royal-task'),offerId:offer.id,status:'active',acceptedAt:at,deadline:at+Math.max(offer.executionSeconds,preparationSeconds(state,offer.requirements,ctx)*2)*1000,ownerId:self,participants:[self],contributions:{},pendingPayouts:{},allianceId:null};
    if(task.kind==='lending')task.lendingReturnAt=at+task.lendingHours*HOUR;
    if(task.kind==='deposit'){
      if(typeof ctx.canReceiveGoods==='function'&&!ctx.canReceiveGoods(state,task.requirements.goods))return bad('Magazyn nie ma miejsca na królewskie towary.','kingdom-storage-full');
      task.deadline=at+task.depositHours*HOUR;gainGoods(state,task.requirements.goods,ctx,{kind:'kingdom-deposit',taskId:task.id});
    }
    offer.status='accepted';k.tasks.push(task);return ok('Zadanie zostało przyjęte.',{taskId:task.id,deadline:task.deadline});
  }
  if(type==='kingdomDecline'){
    const offer=k.offers.find(o=>o.id===action.offerId);if(!offer||offer.status!=='offered')return bad('Ta oferta nie jest już dostępna.');offer.status='declined';normalPenalty(state,{...offer,participants:[self],contributions:{}},ctx,at);return ok('Oferta została odrzucona.');
  }
  const task=sharedTaskList(state,ctx).find(t=>t.id===action.taskId);
  if(!task||task.status!=='active'||!task.participants.includes(self))return bad('To zadanie nie jest aktywne lub nie należysz do jego uczestników.','kingdom-task-unavailable');
  if(type==='kingdomAbandon'){if(task.kind==='deposit'){settleEvent(state,{kind:'deposit',item:task},ctx,at);return ok('Depozyt został rozliczony wcześniej. Braki rozliczono z dopłatą 50%.');}task.status='abandoned';task.abandonedAt=at;normalPenalty(state,task,ctx,at);return ok('Zadanie zostało przerwane. Wpłacone towary nie wracają.');}
  if(type==='kingdomInviteAlliance'){
    if(!task.allianceAllowed)return bad(developmentText('MSG-SOLO-ONLY'),'kingdom-individual-only');if(task.allianceId)return bad('Sojusz już uczestniczy w tym zadaniu.');if(at-task.acceptedAt>2*HOUR)return bad(developmentText('MSG-INVITE-WINDOW'),'kingdom-invitation-expired');
    const ids=[...new Set((ctx.alliance?.members||ctx.alliance?.memberIds||[]).map(m=>String(typeof m==='object'?m.id:m)))];if(!ctx.alliance?.id||!ids.includes(self)||!ids.length||ids.length>5)return bad('Potrzebujesz sojuszu liczącego najwyżej pięć osób.','kingdom-alliance-required');
    const active=sharedTaskList(state,ctx).filter(t=>t.status==='active'&&t.allianceId===ctx.alliance.id).length;if(active>=ids.length)return bad('Sojusz wykorzystuje limit wspólnych zadań.','kingdom-alliance-task-limit');
    if(task.kind==='lending'&&ids.some(id=>{const m=memberState(state,id,ctx);return m&&pendingLending(m.state,m.context).length>=3;}))return bad('Jeden z uczestników ma już trzy pożyczki oczekujące na zwrot.','kingdom-lending-limit');
    if(possessionValue(state,task,ctx)+contributedValue(task,{goodsValue:id=>task.goodsValues[id]||kingdomGoodsValue(id,ctx)})>task.value*.5+EPS)return bad(developmentText('MSG-INVITE-VALUE'),'kingdom-invitation-value');
    task.participants=ids;task.allianceId=ctx.alliance.id;task.deadline=at+Math.max(0,task.deadline-at)/ids.length;shareTask(task,ctx);return ok('Cały sojusz dołączył do zadania. Każdy otrzyma pełną nagrodę lub karę.',{taskId:task.id,deadline:task.deadline,participants:ids});
  }
  const req=outstandingRequirements(task),world=action.worldId?worldsOf(state,ctx).find(w=>w.islandId===action.worldId):state;
  if(!world)return bad('Nie znaleziono wybranej wyspy.');
  if(type==='kingdomContribute'||type==='kingdomLend'){
    if(['deposit','development','officerTraining','army','professor'].includes(task.kind))return bad('To zadanie wymaga innego rodzaju działania.');
    const goods={};for(const[id,n]of Object.entries(action.goods||{})){if(!Number.isSafeInteger(n)||n<=0||n>positive(req.goods[id]))return bad('Podaj dodatnią ilość nie większą niż brakująca dostawa.');goods[id]=n;}
    const coins=type==='kingdomLend'?integer(req.coins):integer(action.coins);
    if(coins>positive(req.coins)||!coins&&!Object.keys(goods).length)return bad('Brak prawidłowej wpłaty.');
    if(Object.entries(goods).some(([id,n])=>n>available(world,id,ctx)))return bad('Brakuje dostępnych towarów ponad chronioną rezerwę.','kingdom-insufficient-goods');
    if(coins>getCoins(state,ctx)||(task.kind==='lending'&&coins>getCoins(state,ctx)-Math.min(k.borrowedCoins,getCoins(state,ctx))))return bad(task.kind==='lending'?developmentText('MSG-BORROWED-FUNDS-BLOCKED'):'Brakuje monet.','kingdom-insufficient-own-coins');
    if(task.kind==='lending'&&task.lendingReturnAt<=at)return bad('Termin zwrotu tej pożyczki już minął.');
    if(task.kind==='lending'&&task.participants.some(id=>{const m=memberState(state,id,ctx);return m&&pendingLending(m.state,m.context).length>=3;}))return bad(developmentText('MSG-LEND-PENDING-LIMIT'),'kingdom-lending-limit');
    const borrowedBefore=k.borrowedCoins;
    if(coins&&!spendCoins(state,coins,ctx,{ownOnly:task.kind==='lending',kind:'kingdom-contribution'}))return bad('Nie udało się pobrać monet.');
    if(!spendGoods(world,goods,ctx,{kind:'kingdom-contribution',taskId:task.id})){if(coins)grantCoins(state,coins,ctx);k.borrowedCoins=borrowedBefore;return bad('Nie udało się pobrać towarów.');}
    addContribution(task,self,{coins,goods});if(completed(outstandingRequirements(task)))completeTask(state,task,ctx,at);return ok(task.status==='completed'?developmentText('MSG-SUPPLY-COMPLETE'):'Wkład został zapisany.',{taskId:task.id});
  }
  if(type==='kingdomDispatchArmy'){
    if(task.kind!=='army')return bad('To zadanie nie wymaga wysłania oddziału.');if(!Array.isArray(action.ids)||!action.ids.length||new Set(action.ids).size!==action.ids.length||action.ids.length>req.soldiers)return bad(`Wybierz od 1 do ${req.soldiers} gotowych żołnierzy.`);
    if(typeof ctx.sendSquad!=='function')return bad('Wysyłanie oddziałów nie jest dostępne.','kingdom-military-unavailable');const r=ctx.sendSquad(world,{ids:action.ids,taskId:task.id,requestId:action.requestId});if(r===false||r?.ok===false)return r?.message?r:bad('Wybrany oddział nie jest gotowy.');addContribution(task,self,{soldiers:action.ids.length});if(completed(outstandingRequirements(task)))completeTask(state,task,ctx,at);return ok(task.status==='completed'?'Oddział wyruszył. Zadanie zostało wykonane; jego powrót rozliczymy osobno.':'Część oddziału wyruszyła. Do wykonania zadania potrzebni są pozostali żołnierze.');
  }
  if(type==='kingdomHandOverProfessor'){
    if(task.kind!=='professor')return bad('To zadanie nie wymaga profesora.');const record=world.education?.people?.[action.personId];if(record?.rescueGift)return bad(developmentText('MSG-RESCUE-PROFESSOR-GIVE-BLOCKED'));if(typeof ctx.handOverProfessor!=='function')return bad('Przekazywanie profesorów nie jest dostępne.');const r=ctx.handOverProfessor(world,{personId:action.personId,taskId:task.id});if(r===false||r?.ok===false)return r?.message?r:bad('Nie można przekazać wybranego profesora.');addContribution(task,self,{professors:1});completeTask(state,task,ctx,at);return ok('Profesor dołączył do królewskiej szkoły i opuścił Twoją wyspę na stałe.');
  }
  if(type==='kingdomCompleteDevelopment'){
    if(!['development','officerTraining'].includes(task.kind))return bad('To nie jest zadanie rozwoju wojska.');const kind=task.kind==='officerTraining'?'officer':'soldier',needed=positive(task.requirements[kind==='officer'?'officers':'soldiers']),count=worldsOf(state,ctx).reduce((sum,w)=>sum+militaryCount(w,kind,ctx),0);if(count<needed)return bad(`Potrzebujesz ${needed} osób odpowiedniego stopnia na swoich wyspach. Osób na wyprawach nie wliczamy.`);task.contributions[self]={[kind==='officer'?'officers':'soldiers']:needed,goods:{}};completeTask(state,task,ctx,at);return ok('Cel rozwoju wojska został osiągnięty.');
  }
  return bad('Nieznane działanie Królestwa.');
}
export function kingdomAction(state,action,ctx={}){
  if(!action||typeof action.type!=='string'||!action.type.startsWith('kingdom'))return null;
  const k=normalizeKingdom(state),at=atOf(state,ctx);advanceKingdom(state,0,{...ctx,now:at,online:false});
  const request=action.requestId;if(request!==undefined&&!/^[A-Za-z0-9:._-]{1,128}$/.test(request))return bad('Nieprawidłowy identyfikator potwierdzenia.');
  const fingerprint=JSON.stringify(action);
  if(request&&own(k.receipts,request)){const receipt=k.receipts[request];return receipt.fingerprint===fingerprint?{...clone(receipt.result),alreadyApplied:true}:bad('Ten identyfikator potwierdzenia dotyczy innego działania.','kingdom-request-reused');}
  const result=performAction(state,action,{...ctx,now:at},at);
  if(request){k.receipts[request]={fingerprint,result:clone(result),at};const keys=Object.keys(k.receipts);for(const key of keys.slice(0,Math.max(0,keys.length-1000)))delete k.receipts[key];}
  return result;
}
export function kingdomStatus(state,ctx={}){
  const k=normalizeKingdom(state),at=atOf(state,ctx),self=identity(state,ctx),loan=k.loan?{...k.loan,draws:undefined}:null;
  if(loan){loan.interestAccrued+=loan.principalOutstanding*.05*Math.max(0,Math.min(at,loan.dueAt)-loan.lastAccruedAt)/DAY;loan.totalOutstanding=money(loan.principalOutstanding+loan.interestAccrued);}
  return {version:32,accountId:self,coins:getCoins(state,ctx),borrowedCoins:Math.min(k.borrowedCoins,getCoins(state,ctx)),ownCoins:Math.max(0,getCoins(state,ctx)-k.borrowedCoins),offers:k.offers.filter(o=>o.status==='offered'&&o.expiresAt>at).map(o=>{const copy=clone(o);delete copy.penaltyRoll;return copy;}),tasks:sharedTaskList(state,ctx).filter(t=>t.participants.includes(self)&&['active','completed','failed','abandoned'].includes(t.status)).slice(-100).map(t=>{const copy=clone(t);delete copy.penaltyRoll;copy.remaining=outstandingRequirements(t);copy.invitationPossessionValue=possessionValue(state,t,ctx)+contributedValue(t,{goodsValue:id=>t.goodsValues[id]||kingdomGoodsValue(id,ctx)});return copy;}),lending:lendingRecords(state,ctx).filter(l=>l.participants.includes(self)).map(l=>clone(l)),loan,loanLimit:kingdomLoanQuote(state,{amount:1,days:1},ctx).limit,loanAvailable:kingdomLoanQuote(state,{amount:1,days:1},ctx).ok,loanNextAttemptAt:k.loanNextAttemptAt,loanBannedUntil:k.loanBannedUntil,forgivenessSkipPending:k.forgivenessSkipPending,allianceLocked:kingdomAllianceLocked(state,ctx),events:clone(k.events.slice(-30)),deferredPenalties:k.deferredPenalties.filter(p=>p.status==='waiting').map(p=>({points:p.points,worldId:p.worldId,createdAt:p.createdAt})),devBalanceProposal:balance(ctx)};
}
