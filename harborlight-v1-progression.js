// Persistent learning, meaningful activity and future verified social hooks.
// No DOM, network requests or account creation happen in this module.
import { DAY_SECONDS, warsawDayKey, secondsUntilWarsawMidnight, calendarDayDistance } from './harborlight-v1-calendar.js?v=frontend-v13';

export const ACTIVE_PLAY_SECONDS = 300;
export const REFERRAL_WINDOW_SECONDS = 30 * DAY_SECONDS;
const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const PRODUCERS = ['farm', 'windmill', 'lumber', 'sawmill', 'quarry'];
const EPS = 1e-7;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const nonnegative = (value, fallback = 0) => finite(value) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, value)) : fallback;
const whole = (value, fallback = 0) => Math.floor(nonnegative(value, fallback));
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const textId = value => typeof value === 'string' && value.length > 0 && value.length <= 200 ? value : null;
const nowOf = state => nonnegative(state.worldTimeMs, nonnegative(state.lastSimulatedAt));
const townLevel = state => Math.max(1, whole(state.buildings?.townhall?.level, 1));
const good = (message, extra = {}) => ({ ok: true, message, ...extra });
const bad = message => ({ ok: false, message });
const validDay = value => typeof value === 'string' && DAY.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const dayList = values => [...new Set((Array.isArray(values) ? values : []).filter(validDay))].sort();

function emit(state, kind, title, message) {
  state.notificationSequence = whole(state.notificationSequence) + 1;
  state.notifications ||= [];
  state.notifications.unshift({ id: state.notificationSequence, kind, title, message, at: state.activeSeconds || 0, read: false });
  state.notifications.length = Math.min(100, state.notifications.length);
}

function lesson(id, day, title, description, kind, subject, resource, prerequisite = null) {
  const reward = { coins: day <= 2 ? 25 : 50, [resource]: day <= 2 ? 10 : 20 };
  return Object.freeze({ id, day, title, description, kind, subject, prerequisite, reward: Object.freeze(reward) });
}

export const TUTORIAL_LESSONS = Object.freeze([
  lesson('island-level', 1, 'Meet your Town Hall', 'The Town Hall sets the island level, building upgrade limits and population capacity.', 'observe', 'townhall', 'wood'),
  lesson('residents-home', 1, 'Meet your residents', 'The House provides beds. Free residents at Home can take a job.', 'observe', 'house', 'food', 'island-level'),
  lesson('first-job', 1, 'Assign a producer', 'Assign one free resident to a Farm, Windmill, Lumber Camp, Sawmill or Quarry.', 'action', 'assign-producer', 'grain', 'residents-home'),
  lesson('workplace-journey', 1, 'Give workers time to arrive', 'A new worker takes five minutes to reach work. Production begins after arrival.', 'observe', 'travel', 'stone', 'first-job'),
  lesson('resources-dock', 1, 'Read the resource dock', 'Resource cards show working people above and local / central stock below.', 'observe', 'resources', 'planks', 'workplace-journey'),
  lesson('warehouse-job', 2, 'Assign a warehouse carrier', 'Assign a resident to the Warehouse so finished goods can reach central storage.', 'action', 'assign-warehouse', 'wood'),
  lesson('first-delivery', 2, 'Receive a delivery', 'Let a carrier deliver at least one batch of finished goods to the Warehouse.', 'condition', 'delivery', 'food', 'warehouse-job'),
  lesson('transport-priority', 2, 'Choose a transport priority', 'Select a material or Construction as a numbered transport priority.', 'action', 'transport-priority', 'stone', 'first-delivery'),
  lesson('food-chain', 2, 'Learn the food chain', 'The Farm makes grain. The Windmill uses two central grain to make one local Food.', 'observe', 'windmill', 'grain', 'transport-priority'),
  lesson('central-food', 2, 'Keep food at Home', 'Each resident automatically eats one Food per hour, supplied only from central storage.', 'observe', 'food', 'food', 'food-chain'),
  lesson('personal-happiness', 3, 'Read personal happiness', 'Each person has individual happiness. The island value is the population average.', 'observe', 'residents', 'food'),
  lesson('house-points', 3, 'Learn House happiness points', 'The House receives a daily point pool; points help people without deleting their penalty history.', 'observe', 'house-happiness', 'wood', 'personal-happiness'),
  lesson('upgrade-cost', 3, 'Read an upgrade cost', 'Available / required values turn green when enough central materials are ready.', 'observe', 'upgrade', 'stone', 'house-points'),
  lesson('construction-queue', 3, 'Find construction management', 'The Town Hall contains the shared construction queue and its limits.', 'observe', 'construction', 'planks', 'upgrade-cost'),
  lesson('storage-limits', 3, 'Compare both stores', 'Local output must be carried home. Central storage has per-material and total capacity limits.', 'observe', 'warehouse', 'grain', 'construction-queue'),
  lesson('market-rules', 4, 'Learn Market exchanges', 'The Market unlocks at island level 2 and exchanges goods within categories, with a 10% fee.', 'observe', 'market', 'wood'),
  lesson('lighthouse-visits', 4, 'Learn Lighthouse visits', 'An available Lighthouse visit takes four hours. Its personal and population bonuses begin after return.', 'observe', 'lighthouse', 'food', 'market-rules'),
  lesson('lighthouse-task', 4, 'Start one Lighthouse task', 'Accept one task. Only one can be active, and its deliveries are made from central storage.', 'action', 'task-accept', 'planks', 'lighthouse-visits'),
  lesson('path-levels', 4, 'Learn path upgrades', 'All 100 path sections must finish the current level before any can begin the next.', 'observe', 'paths', 'stone', 'lighthouse-task'),
  lesson('daily-attractions', 4, 'Discover daily attractions', 'Five offers rotate daily. Repeated use of each attraction reduces its temporary happiness benefit.', 'observe', 'decorations', 'grain', 'path-levels'),
  lesson('chapel-blessing', 5, 'Learn Chapel blessings', 'A manual blessing gives materials and one hour of happiness. Another cannot overlap it.', 'observe', 'chapel', 'food'),
  lesson('expedition-rules', 5, 'Learn expedition risk', 'Expedition rewards form a coin pot. Cash out or risk it on the next stage.', 'observe', 'expeditions', 'wood', 'chapel-blessing'),
  lesson('returning-workers', 5, 'Release a worker safely', 'Release one assigned resident. Returning Home takes five minutes; already loaded cargo still arrives.', 'action', 'release-worker', 'stone', 'expedition-rules'),
  lesson('motion-setting', 5, 'Choose your animation setting', 'Change Animations and highlights in Settings to choose whether the island moves.', 'action', 'motion-setting', 'grain', 'returning-workers'),
  lesson('island-review', 5, 'Review your island', 'Check food, jobs, storage, active effects and plans. You are ready to manage the island.', 'observe', 'overview', 'planks', 'motion-setting')
]);
const LESSONS = new Map(TUTORIAL_LESSONS.map(item => [item.id, item]));

function normalizedTrueMap(source) {
  return Object.fromEntries(TUTORIAL_LESSONS.filter(item => source?.[item.id] === true).map(item => [item.id, true]));
}

function ensure(state) {
  if (!plain(state.engagement) || !plain(state.tutorial) || !plain(state.socialRewards) || !plain(state.referrals)) normalizeProgression(state, state);
}

export function normalizeProgression(state, raw = {}) {
  const saved = raw === state ? structuredClone({ engagement: raw.engagement, tutorial: raw.tutorial, socialRewards: raw.socialRewards, referrals: raw.referrals, loyalty: raw.loyalty }) : raw;
  const now = nowOf(state), engagement = plain(saved.engagement) ? saved.engagement : {};
  const lastActionAt = Math.min(now, nonnegative(engagement.lastActionAt));
  const activeUntil = Math.min(nonnegative(engagement.activeUntil), lastActionAt + ACTIVE_PLAY_SECONDS * 1000);
  state.engagement = { lastActionAt, activeUntil: activeUntil > now ? activeUntil : 0 };
  const tutorial = plain(saved.tutorial) ? saved.tutorial : {};
  const events = plain(tutorial.events) ? tutorial.events : {};
  state.tutorial = {
    activeDays: dayList(tutorial.activeDays).filter(day => day <= warsawDayKey(now)).slice(0, 5),
    completed: normalizedTrueMap(tutorial.completed), claimed: normalizedTrueMap(tutorial.claimed),
    events: Object.fromEntries([...TUTORIAL_LESSONS.map(item => item.id), 'assign-producer', 'assign-warehouse', 'transport-priority', 'task-accept', 'release-worker', 'motion-setting'].filter(id => events[id] === true).map(id => [id, true]))
  };
  for (const id of Object.keys(state.tutorial.claimed)) state.tutorial.completed[id] = true;
  const social = plain(saved.socialRewards) ? saved.socialRewards : {};
  const publicationIds = [...new Set((Array.isArray(social.publicationIds) ? social.publicationIds : []).map(textId).filter(Boolean))];
  const postDays = dayList(social.postDays).filter(day => day <= warsawDayKey(now));
  state.socialRewards = { accountId: textId(social.accountId), firstShareClaimed: social.firstShareClaimed === true,
    levelShares: [...new Set((Array.isArray(social.levelShares) ? social.levelShares : []).filter(level => Number.isInteger(level) && level >= 2 && level <= 100))].sort((a, b) => a - b),
    publicationIds, postDays, thirdPostRewards: [...new Set((Array.isArray(social.thirdPostRewards) ? social.thirdPostRewards : []).filter(number => Number.isInteger(number) && number > 0 && number % 3 === 0 && number <= postDays.length))].sort((a, b) => a - b)
  };
  const referrals = plain(saved.referrals) ? saved.referrals : {};
  const entries = [], seen = new Set();
  for (const entry of Array.isArray(referrals.entries) ? referrals.entries : []) {
    if (!plain(entry) || !textId(entry.accountId) || !textId(entry.inviterId) || seen.has(entry.accountId) || !finite(entry.registeredAt) || entry.registeredAt < 0 || entry.registeredAt > now) continue;
    seen.add(entry.accountId);
    const endDay = warsawDayKey(entry.registeredAt + REFERRAL_WINDOW_SECONDS * 1000);
    entries.push({ accountId: entry.accountId, inviterId: entry.inviterId, registeredAt: entry.registeredAt,
      firstLoginPaid: entry.firstLoginPaid === true, firstLoginAt: finite(entry.firstLoginAt) ? Math.max(entry.registeredAt, Math.min(now, entry.firstLoginAt)) : null,
      activeDays: dayList(entry.activeDays).filter(day => day >= warsawDayKey(entry.registeredAt) && day <= warsawDayKey(now) && day <= endDay),
      thirdDayPaid: entry.thirdDayPaid === true,
      expired: entry.expired === true || now >= entry.registeredAt + REFERRAL_WINDOW_SECONDS * 1000 });
  }
  state.referrals = { ownerId: textId(referrals.ownerId), entries };
  const loyalty = plain(saved.loyalty) ? saved.loyalty : {};
  const claimedDays = [...new Set((Array.isArray(loyalty.claimedDays) ? loyalty.claimedDays : []).filter(day => Number.isInteger(day) && day >= 1 && day <= 10))].sort((a, b) => a - b);
  const reachedLevel = townLevel(state) >= 4;
  state.loyalty = { lastDay: validDay(loyalty.lastDay) ? loyalty.lastDay : null,
    streak: Math.min(10, whole(loyalty.streak)), claimedDays,
    closed: loyalty.closed === true || reachedLevel || claimedDays.length >= 10,
    closedReason: loyalty.closed === true && ['townhall-level-4', 'ten-rewards'].includes(loyalty.closedReason) ? loyalty.closedReason : reachedLevel ? 'townhall-level-4' : claimedDays.length >= 10 ? 'ten-rewards' : null,
    rewardConfigured: false };
  completeLessons(state);
  return state;
}

export function activePlayMultiplier(state) {
  return nonnegative(state.engagement?.activeUntil) > nowOf(state) + EPS ? 2 : 1;
}

export function engagementStatus(state) {
  const remaining = Math.max(0, (nonnegative(state.engagement?.activeUntil) - nowOf(state)) / 1000);
  return { active: remaining > EPS, multiplier: remaining > EPS ? 2 : 1, remaining, lastActionAt: nonnegative(state.engagement?.lastActionAt) };
}

export function registerMeaningfulActivity(state, activity = {}) {
  if (activity.visible !== true || activity.focused !== true) return false;
  ensure(state);
  const now = nowOf(state), day = warsawDayKey(now);
  state.engagement.lastActionAt = now;
  state.engagement.activeUntil = Math.min(Number.MAX_SAFE_INTEGER, now + ACTIVE_PLAY_SECONDS * 1000);
  state.lastMeaningfulActivityAt = nonnegative(state.activityClock);
  if (state.tutorial.activeDays.length < 5 && !state.tutorial.activeDays.includes(day)) state.tutorial.activeDays.push(day);
  completeLessons(state);
  return true;
}

function lessonRequirement(state, item) {
  const events = state.tutorial.events;
  if (item.kind === 'action') return events[item.subject] === true;
  if (item.subject === 'delivery') return (state.statistics?.collected || 0) > 0;
  if (item.id === 'workplace-journey') return events[item.id] === true && (state.residents || []).some(person => PRODUCERS.includes(person.workplace));
  return events[item.id] === true;
}

function completeLessons(state) {
  if (!state.tutorial) return;
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of TUTORIAL_LESSONS) {
      if (state.tutorial.completed[item.id] || state.tutorial.activeDays.length < item.day) continue;
      if (item.prerequisite && !state.tutorial.completed[item.prerequisite]) continue;
      if (lessonRequirement(state, item)) { state.tutorial.completed[item.id] = true; changed = true; }
    }
  }
}

export function tutorialRows(state) {
  const tutorial = state.tutorial || { activeDays: [], completed: {}, claimed: {}, events: {} };
  return TUTORIAL_LESSONS.map(item => {
    const unlocked = tutorial.activeDays.length >= item.day;
    const prerequisiteMet = !item.prerequisite || tutorial.completed[item.prerequisite] === true;
    const completed = tutorial.completed[item.id] === true, claimed = tutorial.claimed[item.id] === true;
    return { ...item, reward: { ...item.reward }, unlocked, prerequisiteMet, completed, claimed,
      canObserve: unlocked && prerequisiteMet && !completed && item.kind === 'observe',
      canClaim: unlocked && prerequisiteMet && completed && !claimed,
      lockedReason: !unlocked ? `Available on active day ${item.day}.` : !prerequisiteMet ? 'Complete the previous lesson first.' : '' };
  });
}

export function recordProgressionAction(state, action, result) {
  if (result?.ok !== true || !action || typeof action !== 'object') return;
  ensure(state);
  const events = state.tutorial.events;
  if (action.type === 'assign' && action.delta > 0) {
    if (PRODUCERS.includes(action.building)) events['assign-producer'] = true;
    if (action.building === 'warehouse') events['assign-warehouse'] = true;
  }
  if (action.type === 'assign' && action.delta < 0) events['release-worker'] = true;
  if (action.type === 'warehousePriority' && (state.warehousePriorities || []).length > 0) events['transport-priority'] = true;
  if (action.type === 'confirmTaskAcceptance' || action.type === 'taskAccept' && (state.lighthouseTasks || []).some(task => task.id === state.activeTaskId && task.acceptedAt != null)) events['task-accept'] = true;
  if (action.type === 'setting' && action.key === 'motion' && typeof action.value === 'boolean') events['motion-setting'] = true;
  completeLessons(state);
  settleLoyaltyClosure(state);
}

function canAward(reward, context) {
  return !MATERIALS.some(resource => reward[resource] > 0) || typeof context.receiveMaterials === 'function';
}
function award(state, reward, context) {
  if (!canAward(reward, context)) return false;
  const materials = Object.fromEntries(MATERIALS.filter(resource => reward[resource] > 0).map(resource => [resource, whole(reward[resource])]));
  if (Object.keys(materials).length) context.receiveMaterials(state, materials);
  state.resources.coins = Math.min(Number.MAX_SAFE_INTEGER, nonnegative(state.resources.coins) + whole(reward.coins));
  return true;
}

function settleLoyaltyClosure(state) {
  if (!state.loyalty || state.loyalty.closed) return;
  if (townLevel(state) >= 4) { state.loyalty.closed = true; state.loyalty.closedReason = 'townhall-level-4'; }
  else if ((state.loyalty.claimedDays || []).length >= 10) { state.loyalty.closed = true; state.loyalty.closedReason = 'ten-rewards'; }
}

export function recordProgressionLogin(state, now = nowOf(state)) {
  ensure(state);
  if (!finite(now) || now < 0) return false;
  settleLoyaltyClosure(state);
  if (state.loyalty.closed) return false;
  const day = warsawDayKey(now);
  if (state.loyalty.lastDay === day) return false;
  const consecutive = state.loyalty.lastDay && calendarDayDistance(state.loyalty.lastDay, day) === 1;
  state.loyalty.lastDay = day;
  state.loyalty.streak = consecutive ? Math.min(10, state.loyalty.streak + 1) : 1;
  return true;
}

export function loyaltyStatus(state) {
  const loyalty = state.loyalty || {};
  const closed = loyalty.closed === true || townLevel(state) >= 4 || (loyalty.claimedDays || []).length >= 10;
  return { streak: Math.min(10, whole(loyalty.streak)), claimedDays: [...(loyalty.claimedDays || [])], closed,
    closedReason: loyalty.closedReason || (townLevel(state) >= 4 ? 'townhall-level-4' : null), rewardConfigured: false,
    eligible: !closed && whole(loyalty.streak) > 0,
    message: closed ? 'The introductory loyalty programme has ended.' : 'Daily reward values have not been defined yet.' };
}

export function socialSummary(state) {
  const social = state.socialRewards || {};
  const count = (social.postDays || []).length, today = warsawDayKey(nowOf(state));
  return { firstShareClaimed: social.firstShareClaimed === true, levelShares: [...(social.levelShares || [])],
    countedPosts: count, countedToday: (social.postDays || []).includes(today), nextPostRewardAt: (Math.floor(count / 3) + 1) * 3,
    available: false, message: 'Verified social sharing is not connected yet.' };
}

export function referralRows(state) {
  return (state.referrals?.entries || []).map(entry => ({ ...entry, activeDays: [...entry.activeDays],
    remaining: Math.max(0, (entry.registeredAt + REFERRAL_WINDOW_SECONDS * 1000 - nowOf(state)) / 1000),
    activeDayCount: Math.min(3, entry.activeDays.length) }));
}

export function nextProgressionEvent(state) {
  const now = nowOf(state);
  let next = secondsUntilWarsawMidnight(now);
  const remaining = (nonnegative(state.engagement?.activeUntil) - now) / 1000;
  if (remaining > EPS) next = Math.min(next, remaining);
  for (const entry of state.referrals?.entries || []) {
    const window = (entry.registeredAt + REFERRAL_WINDOW_SECONDS * 1000 - now) / 1000;
    if (!entry.thirdDayPaid && !entry.expired && window > EPS) next = Math.min(next, window);
  }
  return next > EPS ? next : Infinity;
}

export function advanceProgression(state) {
  ensure(state);
  const now = nowOf(state);
  if (state.engagement.activeUntil <= now + EPS) state.engagement.activeUntil = 0;
  for (const entry of state.referrals.entries) if (now >= entry.registeredAt + REFERRAL_WINDOW_SECONDS * 1000) entry.expired = true;
  completeLessons(state);
  settleLoyaltyClosure(state);
}

function bindSocialAccount(state, context) {
  const accountId = textId(context.accountId);
  if (accountId && state.socialRewards.accountId && state.socialRewards.accountId !== accountId) return false;
  if (accountId) state.socialRewards.accountId = accountId;
  return true;
}

function eventTime(state, action) {
  const at = action.at === undefined ? nowOf(state) : action.at;
  return finite(at) && at >= 0 && at <= nowOf(state) ? at : null;
}

function socialPublication(state, action, context) {
  if (context.verifiedSocialEvent !== true) return bad('A verified publication event is required. Opening a share dialog does not grant this reward.');
  const id = textId(action.id || action.publicationId), at = eventTime(state, action);
  if (!id || at === null) return bad('Invalid publication event.');
  if (state.socialRewards.publicationIds.includes(id)) return bad('This publication was already processed.');
  if (!bindSocialAccount(state, context)) return bad('This publication belongs to a different account.');
  const social = state.socialRewards, day = warsawDayKey(at);
  const level = action.level;
  const levelEligible = action.kind === 'level' && Number.isInteger(level) && level >= 2 && level <= townLevel(state) && !social.levelShares.includes(level);
  const first = !social.firstShareClaimed;
  const counted = !social.postDays.includes(day);
  const newCount = social.postDays.length + (counted ? 1 : 0);
  const third = counted && newCount % 3 === 0 && !social.thirdPostRewards.includes(newCount);
  const coins = (first ? 1000 : 0) + (levelEligible ? 500 : 0) + (third ? 1000 : 0);
  social.publicationIds.push(id);
  if (first) social.firstShareClaimed = true;
  if (levelEligible) social.levelShares.push(level);
  if (counted) social.postDays.push(day);
  social.postDays.sort();
  if (third) social.thirdPostRewards.push(newCount);
  award(state, { coins }, context);
  emit(state, 'verified-share', 'Verified publication processed', coins ? `Granted ${coins} coins. ${newCount} daily publications counted.` : 'This publication was recorded; no additional reward is due.');
  return good(coins ? `Granted ${coins} coins for verified sharing.` : 'Publication recorded.', { reward: { coins }, counted, firstShare: first, levelReward: levelEligible, thirdPostReward: third });
}

function referralAction(state, action, context) {
  if (context.verifiedAccountEvent !== true) return bad('A verified account event is required for referral rewards.');
  const ownerId = textId(context.accountId), accountId = textId(action.accountId);
  if (!ownerId || !accountId || accountId === ownerId) return bad('Invalid referral account.');
  if (state.referrals.ownerId && state.referrals.ownerId !== ownerId) return bad('This referral belongs to a different account.');
  const at = eventTime(state, action);
  if (at === null) return bad('Invalid referral event time.');
  let entry = state.referrals.entries.find(item => item.accountId === accountId);
  if (action.type === 'referralRegistration') {
    if (action.inviterId !== ownerId) return bad('The inviter does not match this account.');
    if (entry) return bad('This registered account already has an inviter.');
    const registeredAt = action.registeredAt === undefined ? at : action.registeredAt;
    if (!finite(registeredAt) || registeredAt < 0 || registeredAt > at) return bad('Invalid registration time.');
    entry = { accountId, inviterId: ownerId, registeredAt, firstLoginPaid: false, firstLoginAt: null, activeDays: [], thirdDayPaid: false,
      expired: nowOf(state) >= registeredAt + REFERRAL_WINDOW_SECONDS * 1000 };
    state.referrals.ownerId = ownerId;
    state.referrals.entries.push(entry);
    return good('Referral registration recorded. The inviter is fixed for this account.');
  }
  if (!entry || entry.inviterId !== ownerId) return bad('A new registered referral is required first.');
  if (at < entry.registeredAt) return bad('The referral event precedes registration.');
  state.referrals.ownerId = ownerId;
  if (action.type === 'referralLogin') {
    if (entry.firstLoginPaid) return bad('The first referral login was already rewarded.');
    entry.firstLoginPaid = true; entry.firstLoginAt = at;
    award(state, { coins: 1000 }, context);
    emit(state, 'referral-first-login', 'A referred player signed in', 'Granted 1,000 coins for the referred account’s first login.');
    return good('Granted 1,000 coins for the first referral login.', { reward: { coins: 1000 } });
  }
  if (!entry.firstLoginPaid) return bad('The referred account must sign in first.');
  if (action.active !== true) return bad('Meaningful activity is required for a referral active day.');
  if (entry.thirdDayPaid) return bad('This referral activity reward was already granted.');
  if (at >= entry.registeredAt + REFERRAL_WINDOW_SECONDS * 1000) return bad('The 30-day referral activity window has ended.');
  const day = warsawDayKey(at);
  if (entry.activeDays.includes(day)) return bad('This active calendar day was already counted.');
  const pays = entry.activeDays.length >= 2;
  const reward = Object.fromEntries(MATERIALS.map(resource => [resource, 500]));
  if (pays && !canAward(reward, context)) return bad('Material reward delivery is not available.');
  entry.activeDays.push(day); entry.activeDays.sort();
  if (pays) {
    award(state, reward, context); entry.thirdDayPaid = true;
    emit(state, 'referral-third-day', 'Referral activity reward', 'Granted 500 of each material after three distinct active days.');
  }
  return good(pays ? 'Granted 500 of each material for referral activity.' : 'Referral active day recorded.', { rewarded: pays, reward: pays ? reward : {} });
}

export function progressionAction(state, action, context = {}) {
  const types = ['userActivity', 'heartbeat', 'tutorialObserve', 'claimTutorial', 'socialPublication', 'referralRegistration', 'referralLogin', 'referralActiveDay', 'claimLoyalty'];
  if (!action || !types.includes(action.type)) return null;
  ensure(state);
  if (action.type === 'userActivity' || action.type === 'heartbeat') {
    if (!registerMeaningfulActivity(state, action)) return bad('Activity must come from the visible, focused game.');
    return good('Active play refreshed for five minutes.', { activeUntil: state.engagement.activeUntil });
  }
  if (action.type === 'tutorialObserve' || action.type === 'claimTutorial') {
    const item = LESSONS.get(action.taskId);
    if (!item) return bad('This tutorial lesson does not exist.');
    completeLessons(state);
    const row = tutorialRows(state).find(candidate => candidate.id === item.id);
    if (!row.unlocked) return bad(row.lockedReason);
    if (!row.prerequisiteMet) return bad(row.lockedReason);
    if (action.type === 'tutorialObserve') {
      if (item.kind !== 'observe') return bad('Complete this lesson through its gameplay action.');
      if (row.completed) return bad('This lesson has already been completed.');
      if (item.id === 'workplace-journey' && !(state.residents || []).some(person => PRODUCERS.includes(person.workplace))) return bad('Assign a producer before learning about their journey.');
      state.tutorial.events[item.id] = true;
      completeLessons(state);
      return good('Lesson completed. Your reward is ready to claim.', { lessonId: item.id });
    }
    if (!row.canClaim) return bad(row.claimed ? 'This tutorial reward was already claimed.' : 'Complete this lesson before claiming its reward.');
    if (!award(state, item.reward, context)) return bad('Material reward delivery is not available.');
    state.tutorial.claimed[item.id] = true;
    emit(state, 'tutorial-reward', 'Tutorial reward', `${item.title}: ${item.reward.coins} coins and materials received.`);
    return good('Tutorial reward received.', { lessonId: item.id, reward: { ...item.reward } });
  }
  if (action.type === 'socialPublication') return socialPublication(state, action, context);
  if (action.type.startsWith('referral')) return referralAction(state, action, context);
  settleLoyaltyClosure(state);
  return bad(state.loyalty.closed ? 'The introductory loyalty programme has ended.' : 'Loyalty reward values have not been defined yet.');
}
