// Economy and progression for the interactive approved-screen prototype.
// Pure data module: browser UI and Node tests share the same rules.
import { MATERIAL_IDS, PRODUCTION_RECIPES, productionRate, receiveMaterials, stockRoom, warehouseLimits, warehouseUsed, syncCrewProgress, advanceLogistics, normalizeLogisticsState, nextLogisticsEvent, storagePenalty, updateStorageStatus, workplaceUnlocked, marketCapacity, marketUsed, notify, constructionCounts, premiumActive, plannedLevel, promoteConstructionQueue, logisticsAction, availableGoods, foodReserve, finishConstruction, centralReserved, centralAvailable, reserveConstructionMaterials, notifyConstructionEtaChange } from './harborlight-v1-logistics.js?v=frontend-v20';
export { workplaceUnlocked, marketCapacity, marketUsed, storagePenalty } from './harborlight-v1-logistics.js?v=frontend-v20';

import { normalizeResidents, synchronizeResidents, assignResidents, residentHappiness, residentHappinessRate, residentSegments, advanceResidents, adjustResidentHappiness, hasFoodForResidents, productionMultiplier, hungerPenaltyPerHour, unemploymentPenaltyPerHour, activeWorkerCount, availableResidentCount, settleResidentEvents, residentVisitAction, removeResidentForDeparture, residentIsWorking, residentHappinessBounds } from './harborlight-v1-residents.js?v=frontend-v20';
export { synchronizeResidents, residentHappiness, residentHappinessRate, productionMultiplier, hasFoodForResidents, hungerPenaltyPerHour, unemploymentPenaltyPerHour } from './harborlight-v1-residents.js?v=frontend-v20';

import { normalizeActivities, advanceActivities, nextActivitiesEvent, activityAction } from './harborlight-v1-activities.js?v=frontend-v20';
import { normalizeLeisure, advanceLeisure, nextLeisureEvent, leisureAction } from './harborlight-v1-leisure.js?v=frontend-v20';
import { normalizeEffectNotifications, syncEffectNotifications } from './harborlight-v1-effects.js?v=frontend-v20';
import { normalizeProgression, advanceProgression, nextProgressionEvent, progressionAction, activePlayMultiplier, recordProgressionAction, recordProgressionLogin } from './harborlight-v1-progression.js?v=frontend-v20';
import { nextWarsawMidnightMs } from './harborlight-v1-calendar.js?v=frontend-v20';
import { normalizeIslandProfile, validateIslandName } from './harborlight-v1-profile.js?v=frontend-v20';
import { consumeMaterial, spendMaterials } from './harborlight-v1-inventory.js?v=frontend-v20';
import { warsawParts, warsawDayKey, calendarDayDistance } from './harborlight-v1-calendar.js?v=frontend-v20';
import { welcomeStatus, WELCOME_SECONDS } from './harborlight-v1-residents.js?v=frontend-v20';
export { welcomeStatus } from './harborlight-v1-residents.js?v=frontend-v20';
import { normalizeWorldEvents, advanceWorldEvents, nextWorldEvent, recordChapelBlessing, eventProductionMultiplier } from './harborlight-v1-events.js?v=frontend-v20';
import { normalizeCommerce, commerceAction, nextCommerceEvent, advanceCommerce } from './harborlight-v1-commerce.js?v=frontend-v20';
import { normalizeEngagementSchedule } from './harborlight-v1-engagement.js?v=frontend-v20';

export const RESOURCES = {
  coins: { name: 'Coins', short: 'coins', symbol: '◉', price: 1 },
  wood: { name: 'Wood', short: 'wood', symbol: '▰', price: 3 },
  stone: { name: 'Stone', short: 'stone', symbol: '◆', price: 4 },
  grain: { name: 'Grain', short: 'grain', symbol: '❧', price: 1 },
  food: { name: 'Food', short: 'food', symbol: '✦', price: 2 },
  planks: { name: 'Planks', short: 'planks', symbol: '▤', price: 6 }
};

export const MAX_BUILDING_LEVEL = 100;
export const WORKPLACE_IDS = ['farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'warehouse', 'dock', 'market'];
export const CONSTRUCTION_IDS = ['farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'townhall', 'house', 'market', 'warehouse', 'dock', 'chapel', 'lighthouse'];

export const BUILDINGS = {
  house: { name: 'House', description: 'Each level provides housing for 24 residents. Every resident without a home reduces happiness by 1 percentage point per hour.', cost: { coins: 100, wood: 40, stone: 20, planks: 10 }, maxLevel: MAX_BUILDING_LEVEL },
  farm: { name: 'Farm', description: 'Each farmer produces 20 grain per hour at level 1, 24 at level 2, and two more per level thereafter. Harvests wait locally for warehouse workers.', cost: { coins: 80, wood: 30, stone: 10 }, resource: 'grain', rate: 20, maxLevel: MAX_BUILDING_LEVEL },
  sawmill: { name: 'Sawmill', description: 'Each worker produces 20 planks per hour at level 1, 24 at level 2, and two more per level thereafter. Each plank requires 2 wood from central storage.', cost: { coins: 120, wood: 45, stone: 25 }, resource: 'planks', rate: 20, input: 'wood', inputRate: 2, maxLevel: MAX_BUILDING_LEVEL },
  quarry: { name: 'Quarry', description: 'Each quarry worker produces 20 stone per hour at level 1, 24 at level 2, and two more per level thereafter. Stone waits locally for transport.', cost: { coins: 150, wood: 35, stone: 20 }, resource: 'stone', rate: 20, maxLevel: MAX_BUILDING_LEVEL },
  dock: { name: 'Harbor', description: 'Connects the island to trade and expeditions.', cost: { coins: 200, wood: 60, planks: 25 }, maxLevel: MAX_BUILDING_LEVEL },
  warehouse: { name: 'Warehouse', description: 'At level 1 each carrier carries 120 items per base five-minute course; storage holds 1,000 per material and 4,000 total. Capacity grows by 50% up to 10 million per material and 40 million total. After level 24 only crew capacity grows; separate road upgrades still apply.', cost: { coins: 160, wood: 35, stone: 30, planks: 15 }, maxLevel: MAX_BUILDING_LEVEL },
  lighthouse: { name: 'Lighthouse', description: 'Completing a level sets everyone’s happiness to 100% and doubles material production for 24 hours × the new level. Construction takes four times as long as transport.', cost: { coins: 300, planks: 30 }, maxLevel: MAX_BUILDING_LEVEL },
  lumber: { name: 'Lumber Camp', description: 'Each lumberjack produces 20 wood per hour at level 1, 24 at level 2, and two more per level thereafter. Wood waits locally for transport.', cost: { coins: 90, wood: 25, stone: 15 }, resource: 'wood', rate: 20, maxLevel: MAX_BUILDING_LEVEL },
  windmill: { name: 'Windmill', description: 'Each miller produces 20 food per hour at level 1, 24 at level 2, and two more per level thereafter. Each Food requires 2 grain from central storage.', cost: { coins: 140, wood: 40, stone: 20, planks: 15 }, resource: 'food', rate: 20, input: 'grain', inputRate: 2, maxLevel: MAX_BUILDING_LEVEL },
  townhall: { name: 'Town Hall', description: 'The Town Hall determines the island level and the upgrade limit for other buildings. Each level allows 24 residents; the House provides their housing.', cost: { coins: 240, wood: 50, stone: 50, planks: 20 }, maxLevel: MAX_BUILDING_LEVEL },
  chapel: { name: 'Chapel', description: 'Completing an upgrade grants +10 happiness × the new level for 10 hours. One free blessing renews at Warsaw midnight without accumulation. Every manual blessing gives +50 of every resource and +20 happiness for one hour. Paid and ad blessings share a four-hour wait after their effect ends.', cost: { coins: 180, wood: 20, stone: 60, planks: 10 }, maxLevel: MAX_BUILDING_LEVEL },
  market: { name: 'Market', description: 'Merchants exchange goods without coins.', cost: { coins: 130, wood: 35, stone: 15 }, maxLevel: MAX_BUILDING_LEVEL }
};

// Alias used by view components when presenting production summaries.
for (const definition of Object.values(BUILDINGS)) {
  if (definition.resource) definition.production = definition.resource;
}

export const EXPEDITIONS = [
  { id: 'misty', name: 'Misty Isles', description: 'Find a route to the harbor. A bridge lets you cross one water obstacle.', reward: { coins: 50 }, par: 10, tools: { bridge: 1, axe: 1, dynamite: 0 }, map: ['S..T..', '.WWT..', '.W.TC.', '.W....', '.TTTW.', '...W.G'] },
  { id: 'quarry', name: 'Forgotten Quarry', description: 'Collect supplies from the abandoned mine and find the exit.', reward: { coins: 50 }, par: 13, tools: { bridge: 0, axe: 1, dynamite: 1 }, map: ['S.R...', '.TRR..', '..R.C.', '.TT...', '.R.RT.', 'C...G.'] },
  { id: 'ruins', name: 'Watchtower Ruins', description: 'Find the gate key and return with supplies for the lighthouse.', reward: { coins: 50 }, par: 14, tools: { bridge: 1, axe: 1, dynamite: 1 }, map: ['S.TW..', '.R.WC.', '.K.W..', '.R.D..', '.TT...', '....G.'] }
];

export const TASKS = [
  { id: 'collect', name: 'First Harvest', description: 'Have warehouse workers collect at least one batch of finished goods.', reward: { coins: 100, wood: 20 } },
  { id: 'upgrade', name: 'Growing Island', description: 'Upgrade any settlement building.', reward: { coins: 150, planks: 15 } },
  { id: 'expedition', name: 'Beyond the Horizon', description: 'Complete an expedition and return with its reward.', reward: { coins: 200, food: 40 } },
  { id: 'craft', name: 'Skilled Craftsperson', description: 'Process materials in the sawmill or windmill.', reward: { coins: 100, stone: 20 } },
  { id: 'lighthouse', name: 'The Light Returns', description: 'Deliver the materials and complete the lighthouse.', reward: { coins: 500, planks: 50 } }
];

const owns = (object, key) => object !== null && typeof object === 'object' && Object.hasOwn(object, key);
const integer = (value, fallback = 0, min = 0, max = 10000000) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
const amount = (value, fallback = 0, max = 10000000) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : fallback;
const countdown = (remaining, elapsed) => remaining - elapsed > 1e-9 ? remaining - elapsed : 0;
const good = message => ({ ok: true, message });
const bad = message => ({ ok: false, message });
export function createState(now = Date.now(), options = {}) {
  const buildings = {};
  for (const id of Object.keys(BUILDINGS)) {
    const workers = 0;
    buildings[id] = { level: id === 'lighthouse' ? 0 : 1, workers, ready: 0, workProgress: Array(workers).fill(0) };
  }
  const state = {
    version: 9,
    islandGeneration: 1,
    islandName: '', islandNameUpdatedAt: 0,
    islandStartedAt: options.onboarding === true ? null : now,
    onboarding: { version: 1, stage: options.onboarding === true ? 'intro' : 'complete', index: 0,
      worldStartedAt: options.onboarding === true ? null : now, completedAt: options.onboarding === true ? null : now },
    resources: Object.fromEntries(Object.keys(RESOURCES).map(id => [id, 100])),
    population: 12, capacity: 24, happiness: 20, baseHappiness: 20, chapelRemaining: 0, lighthouseRemaining: 0,
    welcome: { startedAt: now, until: now + WELCOME_SECONDS * 1000 },
    blessingRemaining: 0, blessingsUsed: 0, dailyBlessingDay: null, blessingAdReceipts: [], paidBlessingCooldownRemaining: 0, loyalty: { lastDay: null, streak: 0 },
    populationProgress: 0, populationDirection: 0, taxProgress: 0, foodCredit: 0,
    returningWorkers: [], transportPriority: [...MATERIAL_IDS],
    pendingDeliveries: Object.fromEntries(MATERIAL_IDS.map(id => [id, 0])),
    buildings,
    objective: { wood: 20, stone: 12, repaired: false },
    speed: 1, paused: false, day: 1, minutes: Number(warsawParts(now).hour) * 60 + Number(warsawParts(now).minute),
    calendar: { startDay: warsawDayKey(now), year: Number(warsawParts(now).year) },
    settings: { sound: true, motion: true, motionOverride: false, language: 'en', notificationCategories: {} },
    premiumServices: [],
    previewBuildStockVersion: null,
    tasks: Object.fromEntries(TASKS.map(task => [task.id, false])),
    expeditions: {},
    statistics: { collected: 0, upgrades: 0, crafted: 0, expeditions: 0, traded: 0, taxCollected: 0 },
    decorations: { flowers: 0, lamp: 0, bench: 0 }, paths: 0,
    lastActionAt: 0, lastSimulatedAt: now, savedAt: now, worldTimeMs: now,
    nextRankingAt: (Math.floor(now / 3600000) + 1) * 3600000,
    ranking: { score: 100, level: 1, coins: 100, at: Math.floor(now / 3600000) * 3600000 }
  };
  normalizeLogisticsState(state, state);
  normalizeResidents(state, { version: 6 });
  normalizeActivities(state, {});
  normalizeHouseHappiness(state, {});
  normalizeLeisure(state, state);
  normalizeProgression(state, {});
  normalizeEngagementSchedule(state, {});
  normalizeWorldEvents(state, {});
  normalizeCommerce(state, {});
  normalizeEffectNotifications(state);
  state.paused = options.onboarding === true;
  return state;
}

/** Only explicitly marked, newly created islands have a frozen introduction.
 * Saves from previous releases are already-running worlds and must never be
 * sent back through naming, the interface tour or a new starter kit.
 */
export function onboardingStatus(state) {
  const source = state?.onboarding;
  const pending = source?.version === 1 && ['intro', 'name', 'tour'].includes(source.stage) && source.worldStartedAt === null;
  return { pending, stage: pending ? source.stage : 'complete', index: integer(source?.index, 0, 0, 255),
    worldStartedAt: pending ? null : amount(source?.worldStartedAt, amount(state?.islandStartedAt, amount(state?.worldTimeMs)), Number.MAX_SAFE_INTEGER),
    completedAt: pending ? null : amount(source?.completedAt, amount(state?.islandStartedAt, amount(state?.worldTimeMs)), Number.MAX_SAFE_INTEGER) };
}

function normalizeOnboarding(state, raw) {
  const status = onboardingStatus({ ...raw, worldTimeMs: state.worldTimeMs });
  state.onboarding = { version: 1, stage: status.stage, index: status.index,
    worldStartedAt: status.worldStartedAt, completedAt: status.completedAt };
  state.islandStartedAt = status.worldStartedAt;
  state.paused = status.pending;
}

function startOnboardedWorld(state, now) {
  const at = Math.max(state.worldTimeMs, integer(now, state.worldTimeMs, 0, Number.MAX_SAFE_INTEGER));
  const origin = state.worldTimeMs;
  const delta = at - state.worldTimeMs;
  const shift = (object, keys) => {
    if (!object) return;
    for (const key of keys) if (typeof object[key] === 'number' && Number.isFinite(object[key])) object[key] += delta;
  };
  // These are absolute anchors, not elapsed durations. No production, food,
  // happiness, task, ad, welcome or world-event time passes during the tour,
  // including when it is saved and resumed on a later day.
  shift(state, ['worldTimeMs', 'lastSimulatedAt', 'savedAt', 'activityEpochMs']);
  // Only this first world's new welcome window is paused. Account-level
  // welcome history inherited after expiry stays at its original dates.
  if (state.welcome?.until > 0 && state.welcome.startedAt >= origin) shift(state.welcome, ['startedAt', 'until']);
  shift(state.engagement, ['firstAnchorAt', 'lastRealActivityAt']);
  if (state.engagement?.lastActionAt > 0) shift(state.engagement, ['lastActionAt']);
  if (state.engagement?.activeUntil > 0) shift(state.engagement, ['activeUntil']);
  shift(state.worldEvents, ['startedAt', 'clockMs', 'nextGoodAt', 'lastBlessingAt', 'monitoringStartedAt', 'nextBadAt', 'badAnchorAt', 'lastBadAt', 'lastBadActivityAt', 'protectionUntilMs']);
  for (const effect of state.worldEvents?.effects || []) shift(effect, ['untilMs']);
  for (const entry of state.worldEvents?.history || []) shift(entry, ['at']);
  shift(state.ranking, ['at']);
  state.nextRankingAt = (Math.floor(at / 3600000) + 1) * 3600000;
  state.calendar = { startDay: warsawDayKey(at), year: Number(warsawParts(at).year) };
  const calendar = islandCalendar(state);
  state.day = calendar.day;
  state.minutes = calendar.hour * 60 + calendar.minute + calendar.second / 60;
  state.islandStartedAt = at;
  state.onboarding = { ...state.onboarding, stage: 'complete', worldStartedAt: at, completedAt: at };
  state.paused = false;
  return good('The introduction is complete. Your island clock has started.');
}

function onboardingAction(state, action, now) {
  if (!['onboardingUpdate', 'onboardingNext', 'onboardingName', 'onboardingStep', 'onboardingFinish'].includes(action.type)) return null;
  const current = onboardingStatus(state);
  if (!current.pending) return bad('This island has already started. Your existing progress is preserved.');
  if (action.type === 'onboardingFinish') {
    if (current.stage !== 'tour' || !validateIslandName(state.islandName).ok) return bad('Choose your island name before finishing the introduction.');
    return startOnboardedWorld(state, now);
  }
  let stage = action.stage ?? current.stage;
  let index = action.index ?? action.step ?? current.index;
  const nameValue = action.islandName ?? action.name;
  if (action.type === 'onboardingNext') stage = current.stage === 'intro' ? 'name' : 'tour';
  if (action.type === 'onboardingName') stage = 'tour';
  if (action.type === 'onboardingStep') stage = 'tour';
  if (!['intro', 'name', 'tour'].includes(stage) || !Number.isSafeInteger(index) || index < 0 || index > 255) return bad('Choose a valid introduction step.');
  const name = nameValue === undefined ? null : validateIslandName(nameValue);
  if (name && !name.ok) return bad(name.message);
  if (stage === 'tour' && !(name?.ok || validateIslandName(state.islandName).ok)) return bad('Choose your island name before the island tour.');
  if (name) {
    state.islandName = name.name;
    state.islandNameUpdatedAt = integer(now, state.worldTimeMs, 0, Number.MAX_SAFE_INTEGER);
  }
  state.onboarding = { ...state.onboarding, stage, index };
  return good('Introduction progress saved.');
}

// The island's fictional date starts on January 1. Daily rewards and durations
// continue to use the real Warsaw calendar and the real simulation anchor.
export function islandCalendar(state) {
  const parts = warsawParts(state.worldTimeMs), today = warsawDayKey(state.worldTimeMs);
  const origin = /^\d{4}-\d{2}-\d{2}$/.test(state.calendar?.startDay || '') ? state.calendar.startDay : today;
  const day = Math.max(0, calendarDayDistance(origin, today));
  const year = Number.isSafeInteger(state.calendar?.year) ? state.calendar.year : Number(parts.year);
  const date = new Date(Date.UTC(year, 0, 1 + day));
  return { day: day + 1, date: date.getUTCDate(), month: date.getUTCMonth() + 1, year: date.getUTCFullYear(),
    hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second), timeZone: 'Europe/Warsaw' };
}

export function dailyBlessingStatus(state) {
  const day = warsawDayKey(state.worldTimeMs);
  const available = state.buildings.chapel.level > 0 && state.dailyBlessingDay !== day;
  const nextRefreshAt = nextWarsawMidnightMs(state.worldTimeMs);
  return { available, remaining: available ? 1 : 0, day, lastUsedDay: state.dailyBlessingDay,
    nextRefreshAt, remainingSeconds: Math.max(0, (nextRefreshAt - state.worldTimeMs) / 1000) };
}

export function totalWorkers(state) {
  return WORKPLACE_IDS.reduce((sum, id) => sum + (state.buildings[id].level > 0 && workplaceUnlocked(state, id) ? state.buildings[id].workers : 0), 0);
}

export function workerLimit(state, id) {
  return WORKPLACE_IDS.includes(id) && state.buildings[id].level > 0 && workplaceUnlocked(state, id) ? 12 * state.buildings[id].level : 0;
}

// One release-specific preview grant; the UI applies it after offline catch-up.
// The normal starter kit and subsequent simulation never replenish this stock.
export const BUILD_TEST_STOCK_VERSION = 'frontend-v10';
export function applyBuildTestStock(state) {
  if (state.previewBuildStockVersion === BUILD_TEST_STOCK_VERSION) return false;
  const limits = warehouseLimits(state);
  let remaining = Math.max(0, limits.total - warehouseUsed(state));
  while (remaining > 0) {
    const eligible = MATERIAL_IDS.filter(id => state.resources[id] < limits.perResource)
      .sort((a, b) => state.resources[a] - state.resources[b]);
    if (!eligible.length) break;
    const lowest = state.resources[eligible[0]];
    const group = eligible.filter(id => state.resources[id] === lowest);
    const next = eligible.find(id => state.resources[id] > lowest);
    const target = next ? Math.min(limits.perResource, state.resources[next]) : limits.perResource;
    const step = Math.min(remaining, (target - lowest) * group.length);
    const each = Math.floor(step / group.length), extra = step % group.length;
    group.forEach((id, index) => { state.resources[id] += each + (index < extra ? 1 : 0); });
    remaining -= step;
  }
  state.resources.coins = Math.max(10000, state.resources.coins);
  state.previewBuildStockVersion = BUILD_TEST_STOCK_VERSION;
  updateStorageStatus(state);
  notify(state, 'preview-stock', 'Warehouse ready for building tests', 'Central storage has been filled to its current limits and the treasury has at least 10,000 coins, once for this preview.');
  return true;
}

export function freeWorkers(state) {
  return availableResidentCount(state);
}

export function taxRate(state) {
  return WORKPLACE_IDS.reduce((sum, id) => sum + activeWorkerCount(state, id), 0) * (state.chapelRemaining > 0 ? 2 : 1) * activePlayMultiplier(state);
}

export const foodDemandPerHour = state => state.population;

function reserveResidentFood(state) {
  if (state.foodCredit > 1e-12) return;
  state.foodCredit = 0;
  if (centralAvailable(state, 'food') >= 1) {
    // One whole warehouse unit is allocated to meals. Only its unused fraction
    // remains available to residents; buildings cannot spend that unit again.
    consumeMaterial(state, 'food', 1);
    state.foodCredit = 1;
  }
}

export function happinessGroups(state) {
  const groups = new Map();
  for (const person of state.residents) {
    const key = person.workplace || 'available';
    if (!groups.has(key)) groups.set(key, { count: 0, total: 0, ...(person.workplace ? { building: person.workplace } : {}) });
    const group = groups.get(key);
    group.count++;
    group.total += residentHappiness(state, person);
  }
  return [...groups.values()].map(({ total, ...group }) => ({ ...group, happiness: total / group.count }));
}

export function updateHappiness(state) {
  synchronizeResidents(state);
  state.baseHappiness = state.residents.reduce((sum, person) => sum + person.happiness, 0) / state.population;
  state.happiness = state.residents.reduce((sum, person) => sum + residentHappiness(state, person), 0) / state.population;
  // Event boundaries must be exact: floating point residue near zero must not
  // repeatedly schedule an interval too small to change a resident's value.
  for (const boundary of [-100, -50, 0, 50, 100]) if (Math.abs(state.happiness - boundary) < 1e-10) state.happiness = boundary;
}

export function recordVisit(state, now = Date.now()) {
  if (onboardingStatus(state).pending) return false;
  return recordProgressionLogin(state, now);
}

export function housingCapacity(state) {
  return state.buildings.house.level * 24;
}

export function unhousedResidents(state) {
  return Math.max(0, state.population - housingCapacity(state));
}

export function buildingLevelLimit(state, id) {
  if (!owns(BUILDINGS, id)) return 0;
  return id === 'townhall' ? BUILDINGS[id].maxLevel : Math.min(BUILDINGS[id].maxLevel, state.buildings.townhall.level);
}

export function upgradeEligibility(state, id, options = {}) {
  if (!owns(BUILDINGS, id)) return bad('This building does not exist.');
  if (!workplaceUnlocked(state, id)) return bad(`This building unlocks at level ${id === 'market' ? 2 : 4}.`);
  const nextLevel = plannedLevel(state, id) + 1;
  if (nextLevel > BUILDINGS[id].maxLevel) return bad('Maximum level reached.');
  const limit = id === 'townhall' ? MAX_BUILDING_LEVEL : options.premiumService ? buildingLevelLimit(state, id) : premiumActive(state) ? plannedLevel(state, 'townhall') : buildingLevelLimit(state, id);
  if (nextLevel > limit) return bad(`Upgrade the Town Hall to level ${nextLevel} first.`);
  if ((state.premiumServices || []).some(service => service.building === id)) return bad('Wait for the purchased upgrade of this building to finish first.');
  if (options.premiumService && state.constructionProjects.some(project => project.building === id)) return bad('Finish the preceding upgrade of this building before buying its next level.');
  const construction = constructionCounts(state);
  const needsQueue = construction.active >= construction.limit || state.constructionProjects.some(project => project.building === id);
  if (!options.premiumService && needsQueue && construction.queued >= construction.queueLimit) return bad(`Construction slots and the queue are full (${construction.limit} + ${construction.queueLimit}). Wait for an upgrade to finish.`);
  return good('An upgrade is available.');
}

// Arrival times are half the former anchors; negative departures retain their
// original rate. Hunger, effects and personal walking keep their real clocks.
export function populationRate(happiness) {
  if (typeof happiness !== 'number' || !Number.isFinite(happiness)) return 0;
  const magnitude = Math.min(100, Math.abs(happiness));
  return Math.sign(happiness) * (happiness > 0 ? 2 : 1) * (magnitude <= 50 ? magnitude / 300 : 1 / 6 + (magnitude - 50) / 60);
}

export function populationIntervalSeconds(happiness) {
  const rate = Math.abs(populationRate(happiness));
  return rate ? 3600 / rate : Infinity;
}

function trimWorkers(state) {
  for (const [id, building] of Object.entries(state.buildings)) {
    const nextWorkers = Math.min(integer(building.workers), workerLimit(state, id));
    syncCrewProgress(state, id, building.workers, nextWorkers);
    building.workers = nextWorkers;
  }
  let excess = totalWorkers(state) - state.population;
  while (excess > 0) {
    // Remove from the largest crew first, preserving a spread of working buildings.
    const id = [...WORKPLACE_IDS].reverse().reduce((selected, candidate) =>
      state.buildings[candidate].workers > state.buildings[selected].workers ? candidate : selected);
    if (!state.buildings[id].workers) break;
    syncCrewProgress(state, id, state.buildings[id].workers, state.buildings[id].workers - 1);
    state.buildings[id].workers -= 1;
    excess -= 1;
  }
  // Population loss also removes people who were already walking home. Keep
  // every remaining resident in exactly one of work, return or available pools.
  const availableReturnPlaces = Math.max(0, state.population - totalWorkers(state));
  if (state.returningWorkers.length > availableReturnPlaces) state.returningWorkers.length = availableReturnPlaces;
}

function accrueTaxes(state, activeSeconds, workers = taxRate(state)) {
  if (!workers || activeSeconds <= 0) return;
  const progress = state.taxProgress + workers * activeSeconds / 3600;
  if (!Number.isFinite(progress) || progress >= Number.MAX_SAFE_INTEGER) {
    state.resources.coins = Number.MAX_SAFE_INTEGER;
    state.statistics.taxCollected = Number.MAX_SAFE_INTEGER;
    state.taxProgress = 0;
    return;
  }
  const coins = Math.floor(progress + 1e-12);
  state.taxProgress = Math.max(0, progress - coins);
  state.resources.coins = Math.min(Number.MAX_SAFE_INTEGER, state.resources.coins + coins);
  state.statistics.taxCollected = Math.min(Number.MAX_SAFE_INTEGER, state.statistics.taxCollected + coins);
}

function resetPopulationProgress(state, direction = 0) {
  state.populationProgress = 0;
  state.populationDirection = direction;
}

function populationAtLimit(state, direction) {
  return direction > 0 ? state.population >= state.capacity : direction < 0 && state.population <= 6;
}

function syncPopulationProgress(state) {
  const direction = Math.sign(populationRate(state.happiness));
  if (direction !== state.populationDirection || !direction || populationAtLimit(state, direction)) {
    resetPopulationProgress(state, direction);
  }
  return direction;
}

function advancePopulation(state, elapsedSeconds) {
  state.capacity = state.buildings.townhall.level * 24;
  let remaining = elapsedSeconds;
  // Integrate between actual events: arrivals, production, meals, bonuses and
  // demographic thresholds. Idle/offline time can span a whole segment at once.
  while (remaining > 1e-9) {
    settleResidentEvents(state);
    settleHouseHappiness(state);
    // Reward/refund arrivals are instantaneous and may become today's meal.
    // Allocate that meal before computing a fed interval, including offline.
    updateStorageStatus(state);
    reserveResidentFood(state);
    updateStorageStatus(state);
    let efficiency = productionMultiplier(state);
    // Dispatch reserves cargo immediately. A pickup can unblock a producer,
    // so settle it before capturing personal happiness and demographic rates.
    let logisticsEvent = nextLogisticsEvent(state, efficiency);
    updateStorageStatus(state);
    reserveResidentFood(state);
    if (productionMultiplier(state) !== efficiency) {
      efficiency = productionMultiplier(state);
      logisticsEvent = nextLogisticsEvent(state, efficiency);
    }
    updateHappiness(state);
    const happiness = state.happiness;
    const segment = residentSegments(state);
    const happinessSlope = happiness >= 100 && segment.meanSlope > 0 || happiness <= -100 && segment.meanSlope < 0 ? 0 : segment.meanSlope;
    let boundary = null;
    if (happinessSlope < 0) boundary = happiness > 50 ? 50 : happiness > 0 ? 0 : happiness > -50 ? -50 : -100;
    else if (happinessSlope > 0) boundary = happiness < -50 ? -50 : happiness < 0 ? 0 : happiness < 50 ? 50 : 100;
    const boundaryTime = boundary === null || !happinessSlope ? Infinity : (boundary - happiness) / happinessSlope;
    const direction = Math.sign(happiness) || Math.sign(happinessSlope);
    if (direction !== state.populationDirection || !direction || populationAtLimit(state, direction)) resetPopulationProgress(state, direction);
    const blocked = !direction || populationAtLimit(state, direction);
    const rate = Math.abs(populationRate(happiness)) / 3600;
    const rateDerivative = (direction > 0 ? 2 : 1) * (Math.abs(happiness) > 50 || Math.abs(happiness) === 50 && direction * happinessSlope > 0 ? 1 / 60 : 1 / 300);
    const rateSlope = direction * happinessSlope * rateDerivative / 3600;
    const foodTime = state.foodCredit > 1e-12 ? state.foodCredit * 3600 / foodDemandPerHour(state) : Infinity;
    const taxesPerHour = taxRate(state);
    let taxFundingTime = Infinity;
    if (taxesPerHour > 0 && premiumActive(state)) {
      for (const project of state.constructionProjects) {
        const missingCoins = (project.cost.coins || 0) - state.resources.coins;
        if (project.stage === 'planned' && missingCoins > 0) taxFundingTime = Math.min(taxFundingTime, Math.max(0, missingCoins - state.taxProgress) * 3600 / taxesPerHour);
      }
    }
    const rankingTime = state.nextRankingAt > state.worldTimeMs ? (state.nextRankingAt - state.worldTimeMs) / 1000 : Infinity;
    const houseTime = nextHouseHappinessEvent(state);
    const premiumTime = state.premium?.expiresAt > state.worldTimeMs ? (state.premium.expiresAt - state.worldTimeMs) / 1000 : Infinity;
    const serviceTime = Math.min(Infinity, ...(state.premiumServices || []).map(service => service.buildRemaining > 1e-9 ? service.buildRemaining : 1e-8));
    // residentSegments already includes nextResidentEvent and narrows it with
    // happiness boundaries; no resident clock changes during these quotes.
    let duration = Math.min(remaining, boundaryTime, segment.nextEvent, logisticsEvent, nextActivitiesEvent(state), nextLeisureEvent(state), nextProgressionEvent(state), nextWorldEvent(state), nextCommerceEvent(state), serviceTime, foodTime, taxFundingTime, rankingTime, premiumTime, houseTime,
      state.chapelRemaining > 0 ? state.chapelRemaining : Infinity,
      state.blessingRemaining > 0 ? state.blessingRemaining : Infinity,
      state.paidBlessingCooldownRemaining > 0 ? state.paidBlessingCooldownRemaining : Infinity,
      state.lighthouseRemaining > 0 ? state.lighthouseRemaining : Infinity);
    let changesPopulation = false;
    if (!blocked) {
      const gain = Math.max(0, (rate + rateSlope * duration / 2) * duration);
      const needed = 1 - state.populationProgress;
      if (gain + 1e-12 >= needed) {
        const discriminant = Math.max(0, rate * rate + 2 * rateSlope * needed);
        const denominator = rate + Math.sqrt(discriminant);
        if (denominator > 0) { duration = Math.min(duration, 2 * needed / denominator); changesPopulation = true; }
      }
    }
    // Epsilon boundaries may coincide after floating-point integration. Settle
    // them once without allowing a zero-length loop to stall an offline load.
    if (!(duration > 1e-9)) duration = Math.min(remaining, 1e-8);
    const previousChapelLevel = state.buildings.chapel.level;
    const previousLighthouseLevel = state.buildings.lighthouse.level;
    const previouslyForcedLighthouse = state.lighthouseSnapshotActive === true;
    const previouslyForcedPeople = new Set(state.residents.filter(person => Number.isFinite(person.forcedHappinessSnapshot)).map(person => person.id));
    // Jobs see residents who were already at work at this interval's start.
    // Arrival events happen at its end and cannot earn work retroactively.
    advanceLogistics(state, duration, efficiency);
    // End-of-interval taxes may fund a forecast, but cannot pay for transport
    // that would have occurred before those coins were earned.
    accrueTaxes(state, duration, taxesPerHour);
    state.blessingRemaining = countdown(state.blessingRemaining, duration);
    state.paidBlessingCooldownRemaining = countdown(state.paidBlessingCooldownRemaining, duration);
    if (state.buildings.chapel.level === previousChapelLevel) state.chapelRemaining = countdown(state.chapelRemaining, duration);
    if (state.buildings.lighthouse.level === previousLighthouseLevel) state.lighthouseRemaining = countdown(state.lighthouseRemaining, duration);
    advanceResidents(segment, duration);
    advanceLeisure(state, duration);
    if (!previouslyForcedLighthouse && state.lighthouseSnapshotActive && state.buildings.lighthouse.level !== previousLighthouseLevel) {
      for (const person of state.residents) if (!previouslyForcedPeople.has(person.id)) {
        person.forcedHappinessSnapshot = person.happiness;
        person.globalLighthouseSnapshot = person.happiness;
      }
    }
    state.foodCredit = Math.max(0, state.foodCredit - foodDemandPerHour(state) * duration / 3600);
    state.worldTimeMs = Math.min(Number.MAX_SAFE_INTEGER, state.worldTimeMs + duration * 1000);
    advanceWorldEvents(state, duration, { removeResident: removeResidentForDeparture, synchronizeResidents });
    advanceCommerce(state, duration);
    advanceActivities(state, duration);
    advanceProgression(state, duration);
    for (const service of [...(state.premiumServices || [])]) {
      service.buildRemaining = countdown(service.buildRemaining, duration);
      if (service.buildRemaining <= 1e-9) {
        finishConstruction(state, service);
        state.premiumServices = state.premiumServices.filter(item => item !== service);
        state.buildings[service.building].premiumService = null;
      }
    }
    advanceProgression(state, 0);
    promoteConstructionQueue(state);
    if (!blocked) state.populationProgress = Math.max(0, state.populationProgress + (rate + rateSlope * duration / 2) * duration);
    if (changesPopulation) {
      if (direction > 0) state.population += 1;
      else removeResidentForDeparture(state);
      state.populationProgress = 0;
      synchronizeResidents(state);
    }
    advanceHouseHappiness(state, duration);
    if (state.worldTimeMs >= state.nextRankingAt - 1e-4) {
      state.ranking = { score: Math.min(Number.MAX_SAFE_INTEGER, state.buildings.townhall.level * state.resources.coins), level: state.buildings.townhall.level, coins: state.resources.coins, at: state.nextRankingAt };
      state.nextRankingAt = Math.max(state.nextRankingAt + 3600000, (Math.floor(state.worldTimeMs / 3600000) + 1) * 3600000);
    }
    settleResidentEvents(state);
    updateHappiness(state);
    syncPopulationProgress(state);
    syncEffectNotifications(state);
    remaining = Math.max(0, remaining - duration);
  }
}

export function normalizeState(raw, now = Date.now()) {
  const state = createState(now);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return state;
  normalizeIslandProfile(state, raw);
  const simulationAnchor = raw.version >= 8 ? Math.min(now, amount(raw.lastSimulatedAt ?? raw.savedAt, now, Number.MAX_SAFE_INTEGER)) : now;
  state.worldTimeMs = state.lastSimulatedAt = state.savedAt = simulationAnchor;
  state.islandGeneration = Number.isSafeInteger(raw.islandGeneration) && raw.islandGeneration > 0 ? raw.islandGeneration : 1;
  const hasWelcome = Number.isFinite(raw.welcome?.startedAt) && Number.isFinite(raw.welcome?.until);
  const welcomeStart = hasWelcome ? Math.min(simulationAnchor, Math.max(0, raw.welcome.startedAt)) : 0;
  state.welcome = { startedAt: welcomeStart, until: hasWelcome ? Math.min(welcomeStart + WELCOME_SECONDS * 1000, Math.max(welcomeStart, raw.welcome.until)) : 0 };
  for (const key of Object.keys(RESOURCES)) state.resources[key] = integer(raw.resources?.[key], state.resources[key], 0, Number.MAX_SAFE_INTEGER);
  if (!owns(raw.resources, 'grain')) state.resources.grain = 0;
  if ([1, 2, 3].includes(raw.version)) {
    // Settle already-earned legacy coin batches once. Version 4 has no passive
    // coin production and persists these buildings with an empty ready balance.
    const earnedCoins = ['dock', 'market', 'townhall'].reduce((sum, id) => {
      const ready = raw.buildings?.[id]?.ready;
      return sum + (Number.isSafeInteger(ready) && ready > 0 ? Math.min(1000, ready) : 0);
    }, 0);
    state.resources.coins = Math.min(Number.MAX_SAFE_INTEGER, state.resources.coins + earnedCoins);
  }
  for (const id of Object.keys(BUILDINGS)) {
    const saved = raw.buildings?.[id];
    if (!saved || typeof saved !== 'object') continue;
    const level = integer(saved.level, state.buildings[id].level, id === 'townhall' ? 1 : 0, BUILDINGS[id].maxLevel);
    const workers = WORKPLACE_IDS.includes(id) && level > 0 ? integer(saved.workers, state.buildings[id].workers, 0, MAX_BUILDING_LEVEL * 24) : 0;
    state.buildings[id] = { level, workers, ready: BUILDINGS[id].resource && level > 0 ? integer(saved.ready, 0, 0, 10000000) : 0, workProgress: [] };
  }
  if (raw.version === 1 || raw.version === 2) {
    // Older versions allowed other buildings above the townhall. Preserve their
    // paid-for levels by promoting the legacy townhall once during migration.
    state.buildings.townhall.level = Math.max(state.buildings.townhall.level, ...Object.values(state.buildings).map(building => building.level));
  }
  for (const id of Object.keys(BUILDINGS)) {
    const building = state.buildings[id];
    building.level = Math.min(building.level, buildingLevelLimit(state, id));
    if (!building.level || !WORKPLACE_IDS.includes(id)) building.workers = 0;
    if (!building.level) building.ready = 0;
  }
  state.capacity = state.buildings.townhall.level * 24;
  state.population = integer(raw.population, state.population, 6, state.capacity);
  state.happiness = typeof raw.happiness === 'number' && Number.isFinite(raw.happiness) ? Math.max(-100, Math.min(100, raw.happiness)) : 0;
  state.baseHappiness = typeof raw.baseHappiness === 'number' && Number.isFinite(raw.baseHappiness) ? Math.max(-100, Math.min(100, raw.baseHappiness)) : state.happiness;
  state.foodCredit = amount(raw.foodCredit, 0, 1);
  state.chapelRemaining = amount(raw.chapelRemaining, 0, 36000);
  state.lighthouseRemaining = amount(raw.lighthouseRemaining, 0, 8640000);
  state.blessingRemaining = amount(raw.blessingRemaining, 0, 3600);
  state.blessingsUsed = integer(raw.blessingsUsed, 0, 0, MAX_BUILDING_LEVEL);
  state.dailyBlessingDay = typeof raw.dailyBlessingDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dailyBlessingDay) ? raw.dailyBlessingDay : null;
  state.blessingAdReceipts = [...new Set((Array.isArray(raw.blessingAdReceipts) ? raw.blessingAdReceipts : []).filter(id => typeof id === 'string' && id.length > 0 && id.length <= 200))].slice(-100);
  state.paidBlessingCooldownRemaining = amount(raw.paidBlessingCooldownRemaining, 0, 18000);
  state.loyalty = { lastDay: typeof raw.loyalty?.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.loyalty.lastDay) ? raw.loyalty.lastDay : null, streak: integer(raw.loyalty?.streak, 0, 0, 10) };
  const direction = Math.sign(populationRate(state.happiness));
  state.populationDirection = direction;
  if (direction && raw.populationDirection === direction &&
      !(direction > 0 && state.population >= state.capacity) && !(direction < 0 && state.population <= 6)) {
    state.populationProgress = amount(raw.populationProgress, 0, 0.999999999999);
  }
  let logisticsRaw = raw;
  if ((!raw.version || raw.version < 5) && state.buildings.farm.ready) {
    // Before grain was introduced, already-produced farm stock was food.
    // Preserve its material type rather than converting earned food to grain.
    logisticsRaw = { ...raw, pendingDeliveries: { ...raw.pendingDeliveries,
      food: integer(raw.pendingDeliveries?.food) + state.buildings.farm.ready } };
    state.buildings.farm.ready = 0;
  }
  normalizeLogisticsState(state, logisticsRaw);
  trimWorkers(state);
  normalizeResidents(state, raw);
  if (raw.version >= 4) state.taxProgress = amount(raw.taxProgress, 0, 0.999999999999);
  state.objective.wood = integer(raw.objective?.wood, 20, 0, 50);
  state.objective.stone = integer(raw.objective?.stone, 12, 0, 30);
  state.objective.repaired = raw.objective?.repaired === true;
  // Keep the chapter milestone and its visible building level consistent.
  if (state.objective.repaired || state.buildings.lighthouse.level > 0) {
    state.objective = { wood: 50, stone: 30, repaired: true };
    state.buildings.lighthouse.level = Math.max(1, state.buildings.lighthouse.level);
  }
  // Economy time is wall-clock time. Legacy pause/speed flags do not stop it.
  state.speed = 1;
  state.paused = false;
  state.calendar = { startDay: typeof raw.calendar?.startDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.calendar.startDay) && Number.isFinite(Date.parse(raw.calendar.startDay)) ? raw.calendar.startDay : warsawDayKey(simulationAnchor),
    year: integer(raw.calendar?.year, Number(warsawParts(simulationAnchor).year), 1900, 9999) };
  const displayCalendar = islandCalendar(state);
  state.day = displayCalendar.day;
  state.minutes = displayCalendar.hour * 60 + displayCalendar.minute + displayCalendar.second / 60;
  for (const key of ['sound', 'motion', 'motionOverride']) state.settings[key] = typeof raw.settings?.[key] === 'boolean' ? raw.settings[key] : state.settings[key];
  state.settings.language = ['en', 'pl'].includes(raw.settings?.language) ? raw.settings.language : 'en';
  state.settings.notificationCategories = raw.settings?.notificationCategories && typeof raw.settings.notificationCategories === 'object' && !Array.isArray(raw.settings.notificationCategories)
    ? Object.fromEntries(Object.entries(raw.settings.notificationCategories).filter(([key, value]) => /^[a-z-]{1,30}$/.test(key) && typeof value === 'boolean')) : {};
  state.previewBuildStockVersion = raw.previewBuildStockVersion === BUILD_TEST_STOCK_VERSION ? BUILD_TEST_STOCK_VERSION : null;
  for (const task of TASKS) state.tasks[task.id] = raw.tasks?.[task.id] === true;
  for (const expedition of EXPEDITIONS) {
    const record = raw.expeditions?.[expedition.id];
    if (record && typeof record === 'object' && record.completed === true) {
      state.expeditions[expedition.id] = { completed: true, runs: integer(record.runs, 1, 1, 1000000), bestMoves: integer(record.bestMoves, 99, 1, 1000000) };
    }
  }
  for (const key of Object.keys(state.statistics)) state.statistics[key] = integer(raw.statistics?.[key], 0, 0, key === 'taxCollected' ? Number.MAX_SAFE_INTEGER : 10000000);
  for (const key of Object.keys(state.decorations)) state.decorations[key] = integer(raw.decorations?.[key], 0, 0, 100);
  state.paths = integer(raw.paths, 0, 0, 100);
  state.lastActionAt = integer(raw.lastActionAt, 0, 0, Number.MAX_SAFE_INTEGER);
  // Old active-time saves have no reliable offline anchor; migration starts now.
  const anchor = raw.version >= 8 ? amount(raw.lastSimulatedAt ?? raw.savedAt, now, Number.MAX_SAFE_INTEGER) : now;
  state.lastSimulatedAt = Math.min(now, anchor);
  state.savedAt = state.lastSimulatedAt;
  state.worldTimeMs = state.lastSimulatedAt;
  state.nextRankingAt = (Math.floor(state.worldTimeMs / 3600000) + 1) * 3600000;
  state.ranking = raw.ranking && typeof raw.ranking === 'object' ? { score: integer(raw.ranking.score, 0, 0, Number.MAX_SAFE_INTEGER), level: integer(raw.ranking.level, state.buildings.townhall.level, 1, MAX_BUILDING_LEVEL), coins: integer(raw.ranking.coins, state.resources.coins, 0, Number.MAX_SAFE_INTEGER), at: amount(raw.ranking.at, state.worldTimeMs, Number.MAX_SAFE_INTEGER) } : { score: Math.min(Number.MAX_SAFE_INTEGER, state.buildings.townhall.level * state.resources.coins), level: state.buildings.townhall.level, coins: state.resources.coins, at: state.worldTimeMs };
  normalizeActivities(state, raw);
  normalizeProgression(state, raw);
  normalizeEngagementSchedule(state, raw);
  normalizeWorldEvents(state, raw);
  normalizeCommerce(state, raw);
  const serviceBuildings = new Set();
  state.premiumServices = (Array.isArray(raw.premiumServices) ? raw.premiumServices : []).filter(service => {
    if (!service || !owns(BUILDINGS, service.building) || serviceBuildings.has(service.building) || service.targetLevel !== state.buildings[service.building].level + 1 || service.targetLevel > buildingLevelLimit(state, service.building)) return false;
    serviceBuildings.add(service.building); return true;
  }).map(service => ({ building: service.building, targetLevel: service.targetLevel, stage: 'building', premiumService: true,
    order: integer(service.order, 0, 0, Number.MAX_SAFE_INTEGER), buildRemaining: amount(service.buildRemaining, 10, 10), transportSeconds: 0,
    cost: Object.fromEntries(Object.keys(RESOURCES).map(id => [id, integer(service.cost?.[id])])), remainingMaterials: Object.fromEntries(MATERIAL_IDS.map(id => [id, 0])), delivered: Object.fromEntries(MATERIAL_IDS.map(id => [id, integer(service.cost?.[id])])), goodsRemaining: 0, instantTransport: true }));
  for (const service of state.premiumServices) state.buildings[service.building].premiumService = service;
  normalizeHouseHappiness(state, raw);
  normalizeLeisure(state, raw);
  // Saved balances may exceed100 only to compensate an active negative cause.
  // Clamp after all causes (including saved attractions) have been restored.
  for (const person of state.residents) {
    const bounds = residentHappinessBounds(state, person);
    person.happiness = Math.max(bounds.min, Math.min(bounds.max, person.happiness));
    if (Number.isFinite(person.forcedHappinessSnapshot)) person.forcedHappinessSnapshot = Math.max(bounds.min, Math.min(bounds.max, person.forcedHappinessSnapshot));
  }
  settleResidentEvents(state);
  updateStorageStatus(state);
  updateHappiness(state);
  normalizeEffectNotifications(state);
  normalizeOnboarding(state, raw);
  return state;
}

export function buildingCost(state, id, options = {}) {
  if (!owns(BUILDINGS, id)) return null;
  const level = Math.max(1, plannedLevel(state, id));
  let cost;
  if (PRODUCTION_RECIPES[id]) {
    const factor = id === 'farm' ? 1 : 2;
    cost = { wood: 72 * level, stone: 72 * level };
    const output = PRODUCTION_RECIPES[id].output;
    cost[output] = (cost[output] || 0) + 120 * level;
    for (const key of Object.keys(cost)) cost[key] *= factor;
  } else if (['townhall', 'house', 'market', 'warehouse', 'dock', 'lighthouse'].includes(id)) {
    const each = ['market', 'warehouse'].includes(id) ? 300 : id === 'dock' ? 400 : 500;
    cost = Object.fromEntries(Object.keys(RESOURCES).map(resource => [resource, each * level]));
  } else {
    const nextLevel = plannedLevel(state, id) + 1;
    cost = Object.fromEntries(Object.entries(BUILDINGS[id].cost).map(([resource, value]) => [resource, value * nextLevel]));
  }
  const counts = constructionCounts(state);
  const queued = options.queued ?? (counts.active >= counts.limit || state.constructionProjects.some(project => project.building === id));
  if (queued) for (const key of Object.keys(cost)) cost[key] = Math.ceil(cost[key] * 1.1 - 1e-9);
  return cost;
}

export function canAfford(state, cost) {
  return !!cost && Object.entries(cost).every(([resource, value]) => owns(RESOURCES, resource) && typeof value === 'number' && Number.isFinite(value) && value >= 0 && (resource === 'coins' ? state.resources.coins : availableGoods(state, resource)) >= value);
}

function spend(state, cost) {
  if (cost.coins) state.resources.coins -= cost.coins;
  spendMaterials(state, Object.fromEntries(Object.entries(cost).filter(([resource]) => resource !== 'coins')));
}

function reward(state, values) {
  if (values.coins) state.resources.coins = Math.min(Number.MAX_SAFE_INTEGER, state.resources.coins + values.coins);
  receiveMaterials(state, values);
}

function normalizeHouseHappiness(state, raw) {
  const source = raw.houseHappinessPool || {};
  const grantPopulation = integer(source.grantPopulation, state.population, 0, 2400);
  const nextMidnight = nextWarsawMidnightMs(state.worldTimeMs);
  const nextRefreshAt = Number.isFinite(source.nextRefreshAt) && source.nextRefreshAt > state.worldTimeMs && source.nextRefreshAt <= nextMidnight + 1 ? source.nextRefreshAt : nextMidnight;
  const refreshRemaining = Math.max(0, (nextRefreshAt - state.worldTimeMs) / 1000);
  state.houseHappinessPool = {
    points: integer(source.points, grantPopulation, 0, grantPopulation), grantPopulation,
    nextRefreshAt, refreshRemaining,
    autoRemaining: Math.max(0, refreshRemaining - 120), autoDone: source.nextRefreshAt === nextRefreshAt && source.autoDone === true,
    generation: integer(source.generation, 1, 1, Number.MAX_SAFE_INTEGER),
    randomSeed: integer(source.randomSeed, (state.worldTimeMs >>> 0) || 0x6d2b79f5, 1, 0xffffffff)
  };
}
function houseRandom(state, length) {
  let seed = state.houseHappinessPool.randomSeed >>> 0;
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  state.houseHappinessPool.randomSeed = seed >>> 0 || 0x6d2b79f5;
  return Math.floor(state.houseHappinessPool.randomSeed / 0x100000000 * length);
}
function canGainHouseHappiness(state, person) {
  return !(person.newbornRemaining > 1e-9) && residentHappiness(state, person) < 100 - 1e-9;
}
function automaticHouseHappiness(state) {
  const pool = state.houseHappinessPool;
  let spent = 0;
  while (pool.points > 0) {
    const eligible = state.residents.filter(person => canGainHouseHappiness(state, person));
    if (!eligible.length) break;
    const lowest = Math.min(...eligible.map(person => residentHappiness(state, person)));
    const tied = eligible.filter(person => Math.abs(residentHappiness(state, person) - lowest) < 1e-9);
    const person = tied[houseRandom(state, tied.length)];
    person.happiness = Math.min(residentHappinessBounds(state, person).max, person.happiness + 1);
    pool.points--; spent++;
  }
  pool.autoDone = true;
  if (spent) notify(state, 'house-happiness', 'House happiness distributed', `${spent} remaining happiness points were given to the least happy residents.`);
}
function settleHouseHappiness(state) {
  const pool = state.houseHappinessPool;
  if (!pool) return;
  pool.refreshRemaining = Math.max(0, (pool.nextRefreshAt - state.worldTimeMs) / 1000);
  pool.autoRemaining = Math.max(0, pool.refreshRemaining - 120);
  if (pool.refreshRemaining <= 1e-8) {
    pool.points = state.population; pool.grantPopulation = state.population;
    pool.nextRefreshAt = nextWarsawMidnightMs(state.worldTimeMs);
    pool.refreshRemaining = (pool.nextRefreshAt - state.worldTimeMs) / 1000;
    pool.autoRemaining = Math.max(0, pool.refreshRemaining - 120); pool.autoDone = false; pool.generation++;
    notify(state, 'house-happiness-refresh', 'House happiness pool refreshed', `${state.population} happiness points are available until the next Warsaw midnight.`);
  }
  if (!pool.autoDone && pool.autoRemaining <= 1e-8) automaticHouseHappiness(state);
}
function nextHouseHappinessEvent(state) {
  const pool = state.houseHappinessPool;
  return pool ? Math.min(pool.refreshRemaining > 1e-8 ? pool.refreshRemaining : Infinity,
    !pool.autoDone && pool.autoRemaining > 1e-8 ? pool.autoRemaining : Infinity) : Infinity;
}
function advanceHouseHappiness(state, seconds) {
  const pool = state.houseHappinessPool;
  if (!pool) return;
  settleHouseHappiness(state);
}
function manualHouseHappiness(state, action) {
  const pool = state.houseHappinessPool;
  const amountRequested = action.amount === undefined ? 1 : action.amount;
  if (!Number.isSafeInteger(amountRequested) || amountRequested < 1) return bad('Choose a positive whole number of happiness points.');
  if (!pool || pool.points <= 0) return bad('No happiness points remain in the House pool.');
  if (action.type === 'houseHappinessAll') {
    const eligible = state.residents.filter(person => canGainHouseHappiness(state, person));
    if (!eligible.length) return bad('No resident can currently receive House happiness points.');
    const allocations = eligible.map(person => ({ person, points: Math.min(amountRequested, Math.ceil(100 - residentHappiness(state, person))) }));
    const total = allocations.reduce((sum, entry) => sum + entry.points, 0);
    if (total > pool.points) return bad('Not enough House points to give this amount to everyone.');
    for (const { person, points } of allocations) person.happiness = Math.min(residentHappinessBounds(state, person).max, person.happiness + points);
    pool.points -= total;
    notify(state, 'house-happiness', 'House happiness distributed', `${total} happiness points were given to ${eligible.length} residents.`);
    return good(`Distributed ${total} House happiness points.`);
  }
  const person = state.residents.find(person => person.id === action.residentId);
  if (!person) return bad('This resident does not exist.');
  if (person.newbornRemaining > 1e-9) return bad('New residents cannot receive House happiness points during their first 24 hours.');
  if (!canGainHouseHappiness(state, person)) return bad('This resident already has the highest happiness this pool can provide.');
  const used = Math.min(amountRequested, Math.ceil(100 - residentHappiness(state, person)));
  if (used > pool.points) return bad('Not enough happiness points remain in the House pool.');
  person.happiness = Math.min(residentHappinessBounds(state, person).max, person.happiness + used); pool.points -= used;
  notify(state, 'house-happiness', 'House happiness distributed', `Resident ${person.id} received ${used} happiness points.`);
  return good(`Resident ${person.id} received ${used} happiness points.`);
}

export function taskReady(state, id) {
  if (state.tasks[id]) return false;
  switch (id) {
    case 'collect': return state.statistics.collected > 0;
    case 'upgrade': return state.statistics.upgrades > 0;
    case 'expedition': return state.statistics.expeditions > 0;
    case 'craft': return state.statistics.crafted > 0;
    case 'lighthouse': return state.objective.repaired;
    default: return false;
  }
}

export function tick(state, elapsedSeconds) {
  if (onboardingStatus(state).pending) return;
  if (typeof elapsedSeconds !== 'number' || !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return;
  state.speed = 1;
  state.paused = false;
  if (!Number.isFinite(state.worldTimeMs)) state.worldTimeMs = state.lastSimulatedAt || Date.now();
  advancePopulation(state, elapsedSeconds);
  state.lastSimulatedAt = state.worldTimeMs;
  state.savedAt = state.lastSimulatedAt;
  const calendar = islandCalendar(state);
  state.day = calendar.day;
  state.minutes = calendar.hour * 60 + calendar.minute + calendar.second / 60;
}

export function advanceTo(state, now = Date.now()) {
  if (onboardingStatus(state).pending) return 0;
  if (!Number.isFinite(now) || now < 0) return 0;
  const anchor = Number.isFinite(state.lastSimulatedAt) ? state.lastSimulatedAt : now;
  const elapsed = Math.max(0, (now - anchor) / 1000);
  if (elapsed > 0) tick(state, elapsed);
  state.lastSimulatedAt = Math.max(anchor, now);
  state.worldTimeMs = state.lastSimulatedAt;
  state.savedAt = state.lastSimulatedAt;
  return elapsed;
}

// Shared transaction endpoint for ordinary upgrades and pre-paid Premium offers.
export function requestUpgrade(state, request) {
  if (onboardingStatus(state).pending) return bad('Finish or leave the island tour before starting gameplay.');
  const id = request?.building;
  if (!owns(BUILDINGS, id)) return bad('This building does not exist.');
  const premiumService = request.premiumService === true;
  const eligibility = upgradeEligibility(state, id, { premiumService });
  if (!eligibility.ok) return eligibility;
  const cost = buildingCost(state, id, { ...(premiumService ? { queued: false, premiumService: true } : request.forecast ? { queued: true } : {}) });
  if (request.cost && Object.keys(RESOURCES).some(resource => (request.cost[resource] || 0) !== (cost[resource] || 0))) return bad('The upgrade quote has changed. Review its current cost.');
  const paidMaterials = request.paidMaterials === true, paidCoins = request.paidCoins === true;
  const remainingCost = Object.fromEntries(Object.entries(cost).filter(([resource]) => resource === 'coins' ? !paidCoins : !paidMaterials));
  const affordable = canAfford(state, remainingCost);
  const planned = request.forecast === true && !affordable;
  if (!affordable && !planned) return bad('Not enough unreserved resources. The Food reserve must remain in the warehouse.');
  const targetLevel = plannedLevel(state, id) + 1;
  if (!planned && !paidCoins && remainingCost.coins) state.resources.coins -= remainingCost.coins;
  const goodsTotal = MATERIAL_IDS.reduce((sum, resource) => sum + (cost[resource] || 0), 0);
  const immediate = request.skipTransport === true && !planned;
  const project = { building: id, targetLevel, goodsTotal, goodsRemaining: immediate ? 0 : goodsTotal,
    remainingMaterials: Object.fromEntries(MATERIAL_IDS.map(resource => [resource, immediate ? 0 : cost[resource] || 0])),
    delivered: Object.fromEntries(MATERIAL_IDS.map(resource => [resource, immediate ? cost[resource] || 0 : 0])),
    transportSeconds: 0, buildRemaining: immediate ? 10 : 0,
    stage: planned ? 'planned' : 'queued', order: ++state.constructionSequence, cost,
    instantTransport: immediate, forecast: planned, forecastFee: Number.isFinite(request.forecastFee) ? request.forecastFee : 0,
    reservationVersion: 9, reservedMaterials: Object.fromEntries(MATERIAL_IDS.map(resource => [resource, 0])), reservedCoins: !planned && !paidCoins ? cost.coins || 0 : 0 };
  if (premiumService) {
    project.premiumService = true; project.stage = 'building'; project.buildRemaining = 10;
    state.premiumServices ||= [];
    state.premiumServices.push(project);
    state.buildings[id].premiumService = project;
  } else {
    state.constructionProjects.push(project);
    reserveConstructionMaterials(state, project, { partial: planned });
    promoteConstructionQueue(state);
  }
  const status = project.stage === 'planned' ? 'plan waiting for deliveries' : project.stage === 'queued' ? 'materials reserved in the queue' : immediate ? 'materials delivered; construction started' : 'materials reserved, waiting for transport';
  notify(state, 'construction-start', `${BUILDINGS[id].name}: level ${targetLevel}`, status);
  return { ...good(`${BUILDINGS[id].name}: ${status}.`), project };
}

export function residentPurchaseQuote(state, quantity = 1) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return bad('Choose a positive whole number of residents.');
  const spaces = Math.max(0, Math.min(housingCapacity(state), state.buildings.townhall.level * 24) - state.population);
  const unitCost = Object.fromEntries(Object.keys(RESOURCES).map(id => [id, 500 * state.buildings.townhall.level]));
  const cost = Object.fromEntries(Object.entries(unitCost).map(([id, value]) => [id, value * quantity]));
  return { ok: spaces >= quantity && canAfford(state, cost), spaces, max: spaces, quantity, unitCost, cost,
    message: spaces < quantity ? 'Upgrade the House to provide enough empty beds.' : !canAfford(state, cost) ? 'Not enough available resources for a resident. The protected Food reserve must remain.' : 'A new resident can move into the House.' };
}
export const quoteResidentPurchase = residentPurchaseQuote;

export function resourceRates(state) {
  const rates = Object.fromEntries(MATERIAL_IDS.map(id => [id, { production: 0, consumption: 0, net: 0 }]));
  const multiplier = productionMultiplier(state) * activePlayMultiplier(state) * (state.lighthouseRemaining > 0 ? 2 : 1);
  for (const [id, recipe] of Object.entries(PRODUCTION_RECIPES)) {
    const workers = (state.residents || []).filter(person => person.workplace === id && residentIsWorking(state, person)).length;
    const output = workers * productionRate(state, id) * multiplier * eventProductionMultiplier(state, id);
    rates[recipe.output].production += output;
    if (recipe.input) rates[recipe.input].consumption += output * 2;
  }
  rates.food.consumption += state.population;
  for (const rate of Object.values(rates)) rate.net = rate.production - rate.consumption;
  return rates;
}

export function act(state, action, now = Date.now(), context = {}) {
  if (!action || typeof action !== 'object') return bad('Unknown action.');
  const introduction = onboardingAction(state, action, now);
  if (introduction !== null) return introduction;
  if (onboardingStatus(state).pending && action.type !== 'setting') {
    if (action.type === 'userActivity') return good('Introduction activity does not start the island clock.');
    return bad('Finish or leave the island tour before starting gameplay.');
  }
  const id = action.building;
  if (['build', 'upgrade', 'collect', 'assign', 'craft'].includes(action.type) && !owns(BUILDINGS, id)) return bad('This building does not exist.');
  let result = commerceAction(state, action, { ...context, receiveMaterials, buildingCost,
    requestUpgrade: request => requestUpgrade(state, request),
    activateBlessing: receiptId => act(state, { type: 'adBlessing', receiptId }, now, { ...context, rewardedAdVerified: true }) });
  if (result === null) result = progressionAction(state, action, { ...context, receiveMaterials });
  if (result === null) result = residentVisitAction(state, action);
  if (result === null) result = leisureAction(state, action);
  if (result === null) result = logisticsAction(state, action, state.worldTimeMs);
  if (result === null) result = activityAction(state, action, { ...context, buildingCost, requestUpgrade: request => requestUpgrade(state, request), expeditions: EXPEDITIONS });
  if (result !== null) {
    if (result.ok) {
      if (action.type === 'premiumAccelerate') for (const project of [...state.constructionProjects]) if (project.stage === 'building' && project.buildRemaining <= 1e-8) finishConstruction(state, project);
      recordProgressionAction(state, action, result);
      updateStorageStatus(state); updateHappiness(state); syncPopulationProgress(state); syncEffectNotifications(state); state.lastActionAt = integer(now, state.lastActionAt, 0, Number.MAX_SAFE_INTEGER); }
    return result;
  }
  switch (action.type) {
    case 'renameIsland': {
      const name = validateIslandName(action.name);
      if (!name.ok) return bad(name.message);
      state.islandName = name.name;
      state.islandNameUpdatedAt = integer(now, state.worldTimeMs, 0, Number.MAX_SAFE_INTEGER);
      result = good(name.message);
      break;
    }
    case 'build':
    case 'upgrade': {
      if (action.type === 'build' && state.buildings[id].level > 0) return bad('This building already exists. Choose Upgrade.');
      if (action.type === 'upgrade' && state.buildings[id].level === 0) return bad('Build this building first.');
      result = requestUpgrade(state, { building: id });
      if (!result.ok) return result;
      break;
    }
    case 'collect': {
      return bad('Warehouse workers carry goods. Assign workers to the warehouse and set transport priorities.');
    }
    case 'assign': {
      const building = state.buildings[id];
      if (!WORKPLACE_IDS.includes(id) || !building.level) return bad('This building does not employ workers.');
      if (!Number.isSafeInteger(action.delta) || action.delta === 0) return bad('Enter a nonzero whole number of workers.');
      const nextWorkers = building.workers + action.delta;
      if (!Number.isSafeInteger(nextWorkers) || nextWorkers < 0 || nextWorkers > workerLimit(state, id)) return bad('This workplace can employ up to 12 residents per building level.');
      if (action.delta > freeWorkers(state)) return bad('Not enough residents available at Home.');
      if (action.delta < 0 && -action.delta > state.residents.filter(person => person.workplace === id && !person.pendingRelease).length) return bad('Those workers are already returning or waiting to finish their current delivery.');
      if (id === 'warehouse' && nextWorkers === 0 && state.resources.food < foodReserve(state) && state.buildings.windmill.ready > 0) return bad('Keep at least one warehouse worker to collect the Food waiting at the Windmill.');
      synchronizeResidents(state);
      assignResidents(state, id, action.delta);
      building.workers = state.residents.filter(person => person.workplace === id).length;
      if (id === 'warehouse') notifyConstructionEtaChange(state);
      result = good(`Workers: ${building.workers}.${action.delta < 0 ? ' Dismissed workers take 5 minutes to return home.' : ' New workers take 5 minutes to reach the workplace.'}`);
      break;
    }
    case 'buyResident': {
      const quantity = action.quantity === undefined ? 1 : action.quantity;
      const quote = residentPurchaseQuote(state, quantity);
      if (!quote.ok) return bad(quote.message);
      spend(state, quote.cost);
      state.population += quantity;
      synchronizeResidents(state);
      notify(state, 'resident-purchased', 'New residents arrived', `${quantity} residents moved into the House. Their initial 24-hour settling period remains protected by active Lighthouse or Welcome bonuses.`);
      result = { ...good('New residents moved into the House.'), quantity, cost: quote.cost };
      break;
    }
    case 'blessing':
    case 'paidBlessing':
    case 'adBlessing': {
      if (!state.buildings.chapel.level) return bad('Build the Chapel first.');
      if (state.blessingRemaining > 0) return bad('A blessing is already active. Wait for it to end.');
      const advertisement = action.type === 'adBlessing';
      if (advertisement && (context.rewardedAdVerified !== true || typeof action.receiptId !== 'string' || !action.receiptId || action.receiptId.length > 200)) return bad('A verified rewarded advertisement is required.');
      if (advertisement && (state.blessingAdReceipts || []).includes(action.receiptId)) return bad('This advertisement reward was already received.');
      const paid = action.type === 'paidBlessing' || action.paid === true || advertisement;
      if (paid) {
        if (state.paidBlessingCooldownRemaining > 0) return bad('A paid blessing becomes available four hours after its previous one-hour effect ends.');
        const price = advertisement ? 0 : 100 * state.buildings.chapel.level;
        if (state.resources.coins < price) return bad('Not enough coins for this blessing.');
        state.resources.coins -= price;
        state.paidBlessingCooldownRemaining = 5 * 3600;
      } else {
        if (!dailyBlessingStatus(state).available) return bad('Today’s free blessing was already used. It renews at Warsaw midnight.');
        state.dailyBlessingDay = warsawDayKey(state.worldTimeMs);
        state.blessingsUsed += 1;
      }
      if (advertisement) state.blessingAdReceipts = [...(state.blessingAdReceipts || []), action.receiptId].slice(-100);
      state.blessingRemaining = 3600;
      recordChapelBlessing(state);
      reward(state, Object.fromEntries(Object.keys(RESOURCES).map(resource => [resource, 50])));
      notify(state, 'blessing', 'Blessing', '+50 of every resource and +20 happiness for every resident for one hour.');
      result = good('Granted +50 of every resource and +20 happiness for one hour.');
      break;
    }
    case 'readNotifications': {
      for (const notification of state.notifications) notification.read = true;
      result = good('Notifications marked as read.');
      break;
    }
    case 'deleteReadNotifications':
    case 'clearReadNotifications': {
      const before = state.notifications.length;
      state.notifications = state.notifications.filter(notification => !notification.read);
      result = { ...good('Read notifications deleted.'), deleted: before - state.notifications.length };
      break;
    }
    case 'marketOrder': {
      if (!workplaceUnlocked(state, 'market')) return bad('The market unlocks at Town Hall level 2.');
      const { resource, amount: quantity } = action;
      if (!MATERIAL_IDS.includes(resource) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) return bad('Invalid material or quantity.');
      const ordered = state.market.orders.reduce((sum, order) => sum + order.amount, 0);
      const same = state.market.orders.filter(order => order.resource === resource).reduce((sum, order) => sum + order.amount, 0);
      if (state.resources[resource] - same < quantity) return bad('Not enough unreserved goods in the central warehouse.');
      if (marketUsed(state) + ordered + quantity > marketCapacity(state)) return bad('Not enough space in the market.');
      state.market.orders.push({ resource, amount: quantity });
      result = good('Market delivery ordered. Goods must wait one hour after arrival before they can be exchanged.');
      break;
    }
    case 'marketExchange': {
      if (!workplaceUnlocked(state, 'market')) return bad('The market unlocks at Town Hall level 2.');
      const { from, to, amount: quantity } = action;
      const groups = [['wood', 'stone', 'grain'], ['planks', 'food']];
      if (from === to || !groups.some(group => group.includes(from) && group.includes(to))) return bad('Choose different goods from the same category.');
      if (!Number.isSafeInteger(quantity) || quantity < 10 || quantity % 10 !== 0) return bad('Exchange in batches of 10: you receive 9 after the fee.');
      if (state.market.stock[from] - state.market.dispatch[from] < quantity) return bad('Not enough unlocked goods in the market.');
      const output = quantity * 9 / 10;
      state.market.stock[from] -= quantity;
      state.market.stock[to] += output;
      state.statistics.traded += 1;
      result = good(`Exchanged ${quantity} ${RESOURCES[from].short} for ${output} ${RESOURCES[to].short}. Market fee: 10%.`);
      break;
    }
    case 'marketDispatch': {
      const { resource, amount: quantity } = action;
      if (!workplaceUnlocked(state, 'market') || !MATERIAL_IDS.includes(resource) || !Number.isSafeInteger(quantity) || quantity < 1) return bad('Invalid collection order.');
      if (state.market.stock[resource] - state.market.dispatch[resource] < quantity) return bad('Not enough unlocked goods in the market.');
      state.market.dispatch[resource] += quantity;
      result = good('Goods are waiting for collection by warehouse workers.');
      break;
    }
    case 'craft': {
      return bad('Assigned workers process materials. Production requires time and inputs from the central warehouse.');
    }
    case 'transportPriority': {
      if (!MATERIAL_IDS.includes(action.resource) || ![-1, 1].includes(action.direction)) return bad('Invalid transport priority change.');
      const index = state.transportPriority.indexOf(action.resource), target = index + action.direction;
      if (target < 0 || target >= state.transportPriority.length) return bad('This material is already at the end of the priority list.');
      [state.transportPriority[index], state.transportPriority[target]] = [state.transportPriority[target], state.transportPriority[index]];
      result = good('Transport priority updated.');
      break;
    }
    case 'deliver': return bad('The full lighthouse cost must be in the warehouse. Start construction from its building panel.');
    case 'repair': {
      if (state.buildings.lighthouse.level || state.buildings.lighthouse.construction) return bad('The lighthouse is already built or under construction.');
      return act(state, { type: 'build', building: 'lighthouse' }, now);
    }
    case 'claim': return bad('Use the current Lighthouse tasks. Starter achievement rewards belong to an earlier game version.');
    case 'houseHappiness':
    case 'giveHouseHappiness':
    case 'houseHappinessAll': {
      result = manualHouseHappiness(state, action);
      if (!result.ok) return result;
      break;
    }
    case 'trade': {
      const resource = action.resource, quantity = action.amount === undefined ? 10 : action.amount;
      if (!owns(RESOURCES, resource) || resource === 'coins' || typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) return bad('Invalid material or quantity.');
      if (!state.buildings.dock.level || !workplaceUnlocked(state, 'dock')) return bad('Harbor trading with coins unlocks at Town Hall level 4.');
      const buying = action.direction === 'buy';
      if (action.direction !== undefined && !['buy', 'sell'].includes(action.direction)) return bad('Unknown trade type.');
      const price = RESOURCES[resource].price * quantity * (buying ? 2 : 1);
      const cost = buying ? { coins: price } : { [resource]: quantity };
      if (!canAfford(state, cost)) return bad(buying ? 'Not enough coins for this purchase.' : 'You do not have enough goods to sell.');
      if (buying && stockRoom(state, resource) < quantity) return bad('Not enough space in the central warehouse for this purchase.');
      spend(state, cost); reward(state, buying ? { [resource]: quantity } : { coins: price });
      state.statistics.traded += 1;
      result = good(buying ? `Bought ${quantity} ${RESOURCES[resource].short} for ${price} coins.` : `Sold ${quantity} ${RESOURCES[resource].short} for ${price} coins.`);
      break;
    }
    case 'expeditionComplete': return bad('Start an expedition run and submit its completed route before claiming a reward.');
    case 'decorate': {
      return bad('Choose one of the five daily attractions in Decorations.');
    }
    case 'path': {
      return act(state, { type: 'upgradeRoad', ...(action.level !== undefined ? { level: action.level } : {}) }, now);
    }
    case 'pause':
    case 'speed':
      return bad('The island follows real time. Use a building’s Premium controls to shorten a specific action.');
    case 'setting':
      if (action.key === 'language') {
        if (!['en', 'pl'].includes(action.value)) return bad('Choose English or Polish.');
      } else if (action.key === 'notificationCategories') {
        if (!action.value || typeof action.value !== 'object' || Array.isArray(action.value) || Object.entries(action.value).some(([key, value]) => !/^[a-z-]{1,30}$/.test(key) || typeof value !== 'boolean')) return bad('Choose notification categories.');
      } else if (!['sound', 'motion'].includes(action.key) || typeof action.value !== 'boolean') return bad('Invalid setting.');
      state.settings[action.key] = action.value;
      if (action.key === 'motion') state.settings.motionOverride = action.value;
      result = good('Settings saved.');
      break;
    default:
      return bad('Unknown action.');
  }
  updateStorageStatus(state);
  updateHappiness(state);
  syncPopulationProgress(state);
  if (!onboardingStatus(state).pending) recordProgressionAction(state, action, result);
  syncEffectNotifications(state);
  state.lastActionAt = integer(now, state.lastActionAt, 0, Number.MAX_SAFE_INTEGER);
  return result;
}
