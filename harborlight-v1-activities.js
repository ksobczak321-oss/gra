// Agreed activities and coin services. Timers are elapsed world seconds, including offline time.
// No network integrations. The approved task-achievement click bonus is local;
// other community rewards remain unavailable until their integrations exist.
import {
  MATERIAL_IDS, stockRoom, receiveMaterials, notify,
  quoteInstantTransport, instantTransport, estimateMaterialsSeconds, availableGoods, haulCapacity,
  townhallPopulationRequirement
} from './harborlight-v1-logistics.js?v=frontend-v22';
import { consumeMaterial } from './harborlight-v1-inventory.js?v=frontend-v22';
import { secondsUntilWarsawMidnight } from './harborlight-v1-calendar.js';
import { MINI_GAME_RULES, miniGameRoundRules, createMiniGame, normalizeMiniGame,
  setMiniGameTilt, revealMiniGameCard, advanceMiniGame } from './harborlight-v1-minigames.js?v=frontend-v22';
export { MINI_GAME_RULES, miniGameRoundRules } from './harborlight-v1-minigames.js?v=frontend-v22';

const HOUR = 3600;
const QUEST_LIFE = 6 * HOUR;
const DAY = 24 * HOUR;
export const TASK_SHARE_BONUS = 500;
const SAFE = Number.MAX_SAFE_INTEGER;
const SIZES = ['small', 'medium', 'large'];
const CONFIG = {
  small: { count: [2, 2], hours: [2, 6], gold: [100, 200] },
  medium: { count: [2, 3], hours: [3, 8], gold: [100, 400] },
  large: { count: [4, 4], hours: [4, 10], gold: [100, 600] }
};
const PRODUCER_FOR = { wood: 'lumber', stone: 'quarry', grain: 'farm', food: 'windmill', planks: 'sawmill' };
const validNumber = n => typeof n === 'number' && Number.isFinite(n);
const nonnegative = (n, fallback = 0, max = SAFE) => validNumber(n) ? Math.max(0, Math.min(max, n)) : fallback;
const integer = (n, fallback = 0, max = SAFE) => Math.floor(nonnegative(n, fallback, max));
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value);
const good = (message, detail = {}) => ({ ok: true, message, ...detail });
const bad = message => ({ ok: false, message });
const zeros = () => Object.fromEntries(MATERIAL_IDS.map(id => [id, 0]));
const entries = value => Object.entries(plain(value) ? value : {});
const sum = object => Object.values(object || {}).reduce((n, x) => n + (validNumber(x) ? x : 0), 0);
const level = (state, id) => Math.max(0, integer(state.buildings?.[id]?.level, 0, 100));
const currentClock = state => nonnegative(state.activityClock);
const owns = (object, id) => Object.prototype.hasOwnProperty.call(object, id);
const producerRate = l => l < 1 ? 0 : l === 1 ? 10 : l + 10;
const availableMaterial = (state, resource) => availableGoods(state, resource);

export const ACTIVITY_RULES = Object.freeze({
  coinsPerPLN: 10, accelerationPercentages: [25, 50, 75, 100],
  coinsPerFullMinute: 1, minimumAccelerationPrice: 5, transportCoinsPerTrip: 10,
  premiumUnlockLevel: 4, materialMarkup: 1.25,
  purchasedBuildSeconds: 10,
  packagePricePerLevel: 1000, packageDuration: DAY,
  taskConfirmationSeconds: 60,
  taskDuration: QUEST_LIFE, expeditionBase: 50, maximumAdSeconds: 120,
  extraTimeSeconds: 30, extraTimeCoins: 10, maximumExtraTimePurchases: 2,
  adTimeSeconds: 60, maximumAdTimeRewards: 1, adPauseTimeoutSeconds: 120,
  expeditionOvertimeCoinsPerSecond: 10, presenceIdleSeconds: 300, presenceConfirmationSeconds: 60,
  expeditionCurve: Object.freeze({ baseSeconds: 180, difficultyPerStage: 0.1, provisional: true }),
  social: [
    { id: 'playing', coins: 1000, available: false },
    { id: 'next-level', coins: 500, available: false },
    { id: 'referral-sign-in', coins: 1000, available: false },
    { id: 'referral-day-three', materials: 500, available: false },
    { id: 'third-facebook-post', coins: 1000, available: false }
  ]
});

// One hundred lighthouse-specific titles. Requirements and rewards are generated separately.
export const TASK_NARRATIVES = Object.freeze([
  'Repair the entrance steps', 'Replace the welcome sign', 'Restore the keeper’s door',
  'Mend the garden gate', 'Secure the stone path', 'Repair the porch railing',
  'Patch the entrance canopy', 'Rebuild the visitor bench', 'Restore the courtyard wall',
  'Weatherproof the entrance hall',
  'Replace a cracked window', 'Repair the lantern shutters', 'Clean the upper windows',
  'Restore the observation window', 'Seal the lantern glazing', 'Repair the storm panels',
  'Replace the workshop window', 'Restore the stairwell vents', 'Weatherproof the gallery door',
  'Repair the keeper’s skylight',
  'Restore the spiral stairs', 'Replace the stair handrail', 'Repair the landing boards',
  'Strengthen the stair supports', 'Install a resting platform', 'Mend the lower staircase',
  'Secure the upper landing', 'Restore the service ladder', 'Repair the tower hatch',
  'Replace worn stair treads',
  'Repair the visitor railings', 'Rebuild the viewing platform', 'Restore the gallery floor',
  'Strengthen the observation deck', 'Add a visitor shelter', 'Mend the lookout fence',
  'Repair the gallery canopy', 'Restore the coastal viewpoint', 'Secure the cliffside path',
  'Build a sheltered waiting area',
  'Repair the lantern housing', 'Restore the lamp mechanism', 'Replace the lamp supports',
  'Service the lens turntable', 'Repair the reflector frame', 'Restore the lantern shutters',
  'Rebuild the lamp workbench', 'Repair the service gantry', 'Secure the lens enclosure',
  'Prepare the lantern for storms',
  'Repair the supply winch', 'Restore the lifting platform', 'Replace the hoist supports',
  'Mend the service pulley', 'Rebuild the cargo shelter', 'Restore the supply ramp',
  'Repair the delivery landing', 'Secure the keeper’s storeroom', 'Rebuild the workshop shelves',
  'Improve the maintenance depot',
  'Repair the keeper’s roof', 'Restore the keeper’s kitchen', 'Provision the repair crew',
  'Restock the storm shelter', 'Rebuild the crew dining room', 'Prepare supplies for the keepers',
  'Restore the lighthouse pantry', 'Repair the staff quarters', 'Improve the keeper’s garden',
  'Support the night watch',
  'Restore the tower masonry', 'Repair the foundation wall', 'Strengthen the lower buttress',
  'Replace the damaged roof boards', 'Patch the coastal retaining wall', 'Restore the east wall',
  'Repair the west wall', 'Rebuild the drainage channel', 'Secure the tower foundation',
  'Repair the storm-damaged facade',
  'Restore the visitor information board', 'Repair the lighthouse museum shelves',
  'Prepare a keeper’s history display', 'Rebuild the visitor shelter', 'Restore the tour route',
  'Repair the ticket shelter', 'Improve the visitor resting area', 'Prepare the coastal exhibition',
  'Restore the keeper’s archive', 'Repair the welcome courtyard',
  'Prepare for the autumn storms', 'Restore the emergency shelter', 'Repair the rainwater gutters',
  'Secure the lighthouse outbuildings', 'Rebuild the storm supply cache', 'Restore the coastal signal post',
  'Repair the emergency stores', 'Strengthen the workshop roof', 'Prepare the annual lighthouse service',
  'Complete the lighthouse restoration'
]);

function signal(state, kind, title, message) {
  if (!Array.isArray(state.notifications)) state.notifications = [];
  notify(state, kind, title, message);
}
function random(state) {
  let value = integer(state.activitySeed, 0x1f123bb5, 0xffffffff) || 0x1f123bb5;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  state.activitySeed = value >>> 0;
  return state.activitySeed / 0x100000000;
}
export function taskRewardScale(state) {
  const l = Math.max(1, level(state, 'townhall'));
  return 12 * l * producerRate(l) / 468;
}
// The first completion enables a daily chain. All later offers end at the next
// Warsaw midnight; the old anchor argument remains for save/API compatibility.
export function nextDailyTaskDeadline(state, anchorClock, afterClock = currentClock(state)) {
  const absolute = state.activityEpochMs + afterClock * 1000;
  if (!Number.isFinite(new Date(absolute).getTime())) return afterClock + DAY;
  return afterClock + secondsUntilWarsawMidnight(absolute);
}
function randomInt(state, min, max) {
  const lo = Math.ceil(min), hi = Math.floor(Math.max(min, max));
  return lo + Math.floor(random(state) * (hi - lo + 1));
}
function shuffled(state, source) {
  const result = [...source];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(state, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function taskGoldBounds(state, size) {
  const scale = taskRewardScale(state);
  let [min, max] = CONFIG[size].gold.map(n => Math.max(1, Math.floor(n * scale)));
  min += SIZES.indexOf(size);
  const tasks = state.lighthouseTasks || [];
  for (const task of tasks) {
    const reward = task.reward?.coins;
    if (!validNumber(reward)) continue;
    if (size === 'small' && task.size === 'medium') max = Math.min(max, reward - 1);
    if (size === 'small' && task.size === 'large') max = Math.min(max, reward - 2);
    if (size === 'medium' && task.size === 'small') min = Math.max(min, reward + 1);
    if (size === 'medium' && task.size === 'large') max = Math.min(max, reward - 1);
    if (size === 'large' && task.size === 'medium') min = Math.max(min, reward + 1);
    if (size === 'large' && task.size === 'small') min = Math.max(min, reward + 2);
  }
  return [min, max];
}
function taskShape(state, requestedSize) {
  const possible = SIZES.map(size => ({ size, gold: taskGoldBounds(state, size) })).filter(option => option.gold[0] <= option.gold[1]);
  const requested = possible.find(option => option.size === requestedSize);
  if (requested) return requested;
  if (possible.length) return possible[randomInt(state, 0, possible.length - 1)];
  // Only an inconsistent legacy save can make every size infeasible. Retain
  // its shown rewards and recover above their values instead of changing them.
  const minimum = Math.min(SAFE, taskGoldBounds(state, 'large')[0]);
  signal(state, 'task-reward-recovery', 'Legacy task reward recovered', 'Existing task rewards could not fit the current reward ranges. The new large reward preserves their ordering.');
  return { size: 'large', gold: [minimum, minimum] };
}
function generateTask(state, size, slot, at = currentClock(state)) {
  const shape = taskShape(state, size);
  size = shape.size;
  const spec = CONFIG[size];
  const count = randomInt(state, ...spec.count);
  let minHours = spec.hours[0];
  const lower = size === 'medium' ? 'small' : size === 'large' ? 'medium' : null;
  for (const existing of state.lighthouseTasks || []) {
    if (existing.size === lower) minHours = Math.max(minHours, Math.min(spec.hours[1], existing.hours));
  }
  const hours = randomInt(state, minHours, spec.hours[1]);
  const requirements = {}, levelSnapshot = {};
  for (const resource of shuffled(state, MATERIAL_IDS).slice(0, count)) {
    const l = Math.max(1, level(state, PRODUCER_FOR[resource]));
    levelSnapshot[resource] = l;
    requirements[resource] = 12 * l * producerRate(l) * hours;
  }
  const reward = { coins: randomInt(state, ...shape.gold) };
  for (const resource of shuffled(state, MATERIAL_IDS).slice(0, SIZES.indexOf(size) + 1)) {
    reward[resource] = Math.max(1, Math.floor(randomInt(state, 50, 1000) * taskRewardScale(state)));
  }
  return {
    id: 'lighthouse-' + (++state.taskSequence), slot, size,
    title: TASK_NARRATIVES[randomInt(state, 0, TASK_NARRATIVES.length - 1)],
    requirements, deposited: Object.fromEntries(Object.keys(requirements).map(id => [id, 0])),
    reward, hours, levelSnapshot, rewardLevel: Math.max(1, level(state, 'townhall')),
    chainId: 'chain-' + slot, anchorAt: null, createdAt: at, expiresAt: at + QUEST_LIFE,
    acceptedAt: null, bonusLockedAt: null, multiplier: 1
  };
}
function normalizeTask(raw, slot, clock) {
  if (!plain(raw) || !SIZES.includes(raw.size) || typeof raw.id !== 'string') return null;
  const requirements = {}, deposited = {}, reward = {};
  for (const [id, value] of entries(raw.requirements)) {
    if (MATERIAL_IDS.includes(id) && integer(value) > 0) {
      requirements[id] = integer(value);
      deposited[id] = Math.min(requirements[id], integer(raw.deposited?.[id]));
    }
  }
  if (Object.keys(requirements).length < 2 || Object.keys(requirements).length > 4) return null;
  for (const id of ['coins', ...MATERIAL_IDS]) if (integer(raw.reward?.[id]) > 0) reward[id] = integer(raw.reward[id]);
  if (!reward.coins) return null;
  const createdAt = nonnegative(raw.createdAt, clock);
  const expiresAt = nonnegative(raw.expiresAt, createdAt + QUEST_LIFE);
  const anchorAt = validNumber(raw.anchorAt) && raw.anchorAt >= 0 && raw.anchorAt <= createdAt ? raw.anchorAt : null;
  if (expiresAt <= createdAt || expiresAt - createdAt > (anchorAt === null ? QUEST_LIFE : 26 * HOUR) + 1e-7) return null;
  const acceptedAt = validNumber(raw.acceptedAt) && raw.acceptedAt >= createdAt && raw.acceptedAt < expiresAt ? raw.acceptedAt : null;
  const bonusLockedAt = acceptedAt !== null && validNumber(raw.bonusLockedAt) && raw.bonusLockedAt >= createdAt && raw.bonusLockedAt <= acceptedAt ? raw.bonusLockedAt : acceptedAt;
  return {
    id: raw.id.slice(0, 80), slot, size: raw.size,
    title: typeof raw.title === 'string' ? raw.title.slice(0, 160) : TASK_NARRATIVES[slot],
    requirements, deposited, reward, hours: integer(raw.hours, CONFIG[raw.size].hours[0], 10),
    levelSnapshot: Object.fromEntries(Object.keys(requirements).map(id => [id, integer(raw.levelSnapshot?.[id], 1, 100)])),
    rewardLevel: Math.max(1, integer(raw.rewardLevel, 1, 100)),
    chainId: typeof raw.chainId === 'string' ? raw.chainId.slice(0, 80) : 'chain-' + slot,
    anchorAt, createdAt, expiresAt, acceptedAt, bonusLockedAt,
    multiplier: bonusLockedAt === null ? 1 : bonusLockedAt - createdAt < 15 ? 3 : bonusLockedAt - createdAt < 300 ? 2 : 1
  };
}

export function normalizeActivities(state, raw = {}) {
  if (raw === state) raw = JSON.parse(JSON.stringify(raw));
  state.activityClock = nonnegative(raw.activityClock, nonnegative(state.activeSeconds));
  state.activityEpochMs = validNumber(raw.activityEpochMs) ? raw.activityEpochMs : (validNumber(state.worldTimeMs) ? state.worldTimeMs : Date.now()) - state.activityClock * 1000;
  state.activitySeed = integer(raw.activitySeed, ((Date.now() ^ 0x5f3759df) >>> 0), 0xffffffff) || 1;
  state.taskSequence = integer(raw.taskSequence);
  state.taskAchievements = [];
  const achievementIds = new Set();
  for (const item of Array.isArray(raw.taskAchievements) ? raw.taskAchievements : []) {
    if (!plain(item) || typeof item.taskId !== 'string' || !/^lighthouse-\d+$/.test(item.taskId) || item.id !== 'achievement-' + item.taskId || achievementIds.has(item.id)) continue;
    achievementIds.add(item.id);
    state.taskSequence = Math.max(state.taskSequence, integer(Number(item.taskId.slice(11))));
    const shared = item.shared === true;
    state.taskAchievements.push({ id: item.id, taskId: item.taskId,
      title: typeof item.title === 'string' ? item.title.slice(0, 300) : 'Lighthouse task complete',
      createdAt: nonnegative(item.createdAt), reward: Object.fromEntries(entries(item.reward).filter(([id]) => id === 'coins' || MATERIAL_IDS.includes(id)).map(([id, value]) => [id, integer(value)])),
      shared, skipped: !shared && item.skipped === true, seen: shared || item.skipped === true || item.seen === true });
  }
  state.expeditionSequence = integer(raw.expeditionSequence);
  state.activitySettings = {
    taskMode: 'queue', expeditionCurve: {
      baseSeconds: Math.max(1, nonnegative(raw.activitySettings?.expeditionCurve?.baseSeconds, 180, 86400)),
      difficultyPerStage: nonnegative(raw.activitySettings?.expeditionCurve?.difficultyPerStage, 0.1, 10),
      provisional: true
    }
  };
  state.taskScheduleVersion = 9;
  state.lastMeaningfulActivityAt = Math.min(state.activityClock, nonnegative(raw.lastMeaningfulActivityAt, state.activityClock));
  state.rewardBuffer = zeros();
  // normalizeLogisticsState migrates legacy pending/reward goods into the
  // spendable bonus ledger. Never restore that old buffer a second time.
  state.expeditionAdReceipts = [...new Set((Array.isArray(raw.expeditionAdReceipts) ? raw.expeditionAdReceipts : []).filter(value => typeof value === 'string' && /^[A-Za-z0-9._:-]{1,160}$/.test(value)))].slice(-100);
  state.lighthouseTasks = [];
  const original = Array.isArray(raw.lighthouseTasks) ? raw.lighthouseTasks : [];
  for (const item of original) {
    const match = /^lighthouse-(\d+)$/.exec(item?.id || '');
    if (match) state.taskSequence = Math.max(state.taskSequence, integer(Number(match[1])));
  }
  const usedIds = new Set();
  for (let slot = 0; slot < 3; slot++) {
    let task = normalizeTask(original[slot], slot, state.activityClock);
    if (task && usedIds.has(task.id)) task = null;
    if (task) {
      if (task.anchorAt !== null && raw.taskScheduleVersion !== 9) task.expiresAt = nextDailyTaskDeadline(state, task.anchorAt, task.createdAt);
      usedIds.add(task.id);
      const number = /^lighthouse-(\d+)$/.exec(task.id);
      if (number) state.taskSequence = Math.max(state.taskSequence, integer(Number(number[1])));
      state.lighthouseTasks.push(task);
    } else state.lighthouseTasks.push(generateTask(state, SIZES[slot], slot));
    usedIds.add(state.lighthouseTasks[slot].id);
  }
  const acceptedTasks = state.lighthouseTasks.filter(task => task.acceptedAt !== null && task.expiresAt > state.activityClock);
  // Older saves allowed several accepted tasks. Keep their deposits and locked
  // rewards, but select a single active task without silently starting the rest.
  // An explicit null is meaningful after completing a task and survives reload.
  if (Object.hasOwn(raw, 'activeTaskId')) {
    state.activeTaskId = acceptedTasks.some(task => task.id === raw.activeTaskId) ? raw.activeTaskId : null;
  } else {
    state.activeTaskId = [...acceptedTasks].sort((a, b) =>
      sum(b.deposited) - sum(a.deposited) || a.acceptedAt - b.acceptedAt
    )[0]?.id || null;
  }
  state.taskAcceptanceDraft = null;
  const draft = raw.taskAcceptanceDraft, draftTask = state.lighthouseTasks.find(task => task.id === draft?.taskId);
  if (plain(draft) && draftTask && state.activeTaskId === null && validNumber(draft.startedAt) && draft.startedAt >= draftTask.createdAt && draft.startedAt <= state.activityClock) {
    const expiresAt = draft.startedAt + ACTIVITY_RULES.taskConfirmationSeconds;
    if (expiresAt > state.activityClock && draftTask.expiresAt > state.activityClock) state.taskAcceptanceDraft = {
      taskId: draftTask.id, startedAt: draft.startedAt, expiresAt,
      multiplier: draft.startedAt - draftTask.createdAt < 15 ? 3 : draft.startedAt - draftTask.createdAt < 300 ? 2 : 1
    };
  }
  state.expeditionRuns = {};
  for (const [id, item] of entries(raw.expeditionRuns)) {
    if (!plain(item) || typeof item.id !== 'string' || !['active', 'decision', 'closed', 'lost'].includes(item.status)) continue;
    const n = integer(item.level, 1);
    const startedAt = Math.min(state.activityClock, nonnegative(item.roundStartedAt, nonnegative(item.startedAt, state.activityClock)));
    const defaultRules = expeditionRoundRules(n, state.activitySettings.expeditionCurve);
    const oldLimit = validNumber(item.remaining) ? item.remaining + state.activityClock - startedAt : defaultRules.timeLimit;
    const roundLimit = Math.max(0.001, nonnegative(item.roundLimit, oldLimit, 86400));
    const rulesVersion = item.rulesVersion === 16 ? 16 : 9;
    const miniGame = rulesVersion === 16 ? normalizeMiniGame(item.miniGame, Math.max(1, n), state.activityClock) : null;
    state.expeditionRuns[id] = {
      id: item.id.slice(0, 80), expedition: id,
      level: Math.max(1, n), pot: integer(item.pot),
      status: item.status, mode: 'time', moveLimit: null,
      roundStartedAt: startedAt, startedAt, roundLimit,
      roundBasePot: integer(item.roundBasePot, Math.min(SAFE, integer(item.pot) + 50)),
      remaining: Math.max(0, roundLimit - (state.activityClock - startedAt)),
      presencePromptAt: validNumber(item.presencePromptAt) && item.presencePromptAt <= state.activityClock ? nonnegative(item.presencePromptAt) : null,
      finishedAt: validNumber(item.finishedAt) ? nonnegative(item.finishedAt) : null,
      lossReason: typeof item.lossReason === 'string' ? item.lossReason.slice(0, 80) : null,
      extraTimePurchases: integer(item.extraTimePurchases, 0, ACTIVITY_RULES.maximumExtraTimePurchases),
      adAttempts: integer(item.adAttempts, 0, 1),
      adTimeRewards: integer(item.adTimeRewards, 0, ACTIVITY_RULES.maximumAdTimeRewards),
      adSequence: integer(item.adSequence), adPause: null
    };
    if (rulesVersion === 16) {
      const restored = state.expeditionRuns[id];
      restored.rulesVersion = 16; restored.miniGame = miniGame;
      restored.selectedGameKind = isMiniGameKind(item.selectedGameKind) ? item.selectedGameKind : miniGame?.kind || null;
      if (restored.status === 'active' && plain(item.adPause) && typeof item.adPause.nonce === 'string' &&
          item.adPause.nonce === `${restored.id}:${restored.level}:ad:${restored.adSequence}` && validNumber(item.adPause.remaining) &&
          item.adPause.remaining > 0 && item.adPause.remaining <= ACTIVITY_RULES.adPauseTimeoutSeconds) {
        restored.adPause = { nonce: item.adPause.nonce, remaining: item.adPause.remaining };
      }
      if (!miniGame && ['active', 'decision'].includes(restored.status)) {
        restored.status = 'lost'; restored.pot = 0; restored.lossReason = 'invalid-minigame'; restored.finishedAt = state.activityClock;
      }
    }
    const number = /^run-(\d+)$/.exec(item.id);
    if (number) state.expeditionSequence = Math.max(state.expeditionSequence, integer(Number(number[1])));
  }
  const openRuns = Object.values(state.expeditionRuns).filter(run => ['active', 'decision'].includes(run.status));
  const selectedRun = openRuns.find(run => run.expedition === raw.activeExpeditionId) || openRuns[0];
  state.activeExpeditionId = selectedRun?.expedition || null;
  for (const run of openRuns) if (run !== selectedRun) {
    run.status = 'lost'; run.pot = 0; run.presencePromptAt = null; run.lossReason = 'legacy-concurrent-series';
    signal(state, 'expedition-migration', 'One expedition series retained', 'A legacy concurrent expedition was ended. Only one series can run at a time.');
  }
  advanceActivities(state, 0);
  return state;
}

export function taskReward(task) {
  const multiplier = [1, 2, 3].includes(task?.multiplier) ? task.multiplier : 1;
  return Object.fromEntries(entries(task?.reward).map(([id, value]) => [id, integer(value) * multiplier]));
}
export function activeLighthouseTask(state) {
  return (state.lighthouseTasks || []).find(task => task.id === state.activeTaskId &&
    task.acceptedAt !== null && task.expiresAt > currentClock(state)) || null;
}
export function pendingTaskAchievements(state) {
  return (state.taskAchievements || []).filter(item => !item.shared && !item.skipped);
}
export function taskAcceptanceStatus(state) {
  const draft = state.taskAcceptanceDraft;
  const task = (state.lighthouseTasks || []).find(item => item.id === draft?.taskId);
  const remaining = draft && task ? Math.max(0, Math.min(draft.expiresAt, task.expiresAt) - currentClock(state)) : 0;
  const pending = remaining > 0 && activeLighthouseTask(state) === null;
  return { pending, taskId: pending ? draft.taskId : null, remaining, multiplier: pending ? draft.multiplier : 1,
    expiresAt: pending ? draft.expiresAt : null, canConfirm: pending };
}
export function taskStatus(state, taskOrId) {
  const task = typeof taskOrId === 'string' ? state.lighthouseTasks?.find(t => t.id === taskOrId) : taskOrId;
  if (!task) return { remaining: 0, age: 0, multiplier: 1, complete: false, active: false, canActivate: false };
  const age = Math.max(0, currentClock(state) - task.createdAt);
  const activeTask = activeLighthouseTask(state);
  const remaining = Math.max(0, task.expiresAt - currentClock(state));
  return {
    age, remaining,
    multiplier: task.acceptedAt !== null ? task.multiplier : age < 15 ? 3 : age < 300 ? 2 : 1,
    complete: entries(task.requirements).every(([id, value]) => integer(task.deposited?.[id]) >= value),
    active: activeTask?.id === task.id,
    canActivate: remaining > 0 && activeTask === null
  };
}
function refillRewardBuffer(state) {
  if (!plain(state.rewardBuffer)) state.rewardBuffer = zeros();
  const remaining = Object.fromEntries(MATERIAL_IDS.map(id => [id, integer(state.rewardBuffer[id])]));
  if (sum(remaining)) receiveMaterials(state, remaining);
  state.rewardBuffer = zeros();
}
function grantTaskReward(state, task) {
  const values = taskReward(task), coins = values.coins || 0;
  if (!Number.isSafeInteger(integer(state.resources.coins) + coins)) return false;
  state.resources.coins += coins;
  // Reward materials are spendable bonus stock. Physical stock and reservations
  // in transit cannot swallow part of this credit.
  receiveMaterials(state, values);
  signal(state, 'lighthouse-task-reward', 'Lighthouse task complete', 'Reward: ' + coins + ' coins. Multiplier ×' + task.multiplier + '.');
  return true;
}
function replaceTask(state, index, at = currentClock(state), completed = false) {
  const previous = state.lighthouseTasks[index];
  if (state.activeTaskId === previous.id) state.activeTaskId = null;
  if (state.taskAcceptanceDraft?.taskId === previous.id) state.taskAcceptanceDraft = null;
  // Exclude the task being replaced from reward-order constraints.
  state.lighthouseTasks.splice(index, 1);
  const next = generateTask(state, null, previous.slot, at);
  next.chainId = previous.chainId;
  next.anchorAt = previous.anchorAt === null && completed ? at : previous.anchorAt;
  if (next.anchorAt !== null) next.expiresAt = nextDailyTaskDeadline(state, next.anchorAt, at);
  state.lighthouseTasks.push(next);
  return next;
}

// Time limits are explicit designer defaults. New mini-game round awards
// double by stage, while legacy route series retain their saved +50 rules.
export function expeditionRoundRules(stageNumber = 1, overrides = {}) {
  const stage = Math.max(1, integer(stageNumber, 1));
  const baseSeconds = Math.max(1, nonnegative(overrides.baseSeconds, 180, 86400));
  const difficultyPerStage = nonnegative(overrides.difficultyPerStage, 0.1, 10);
  return { stage, mode: 'time', timeLimit: baseSeconds / (1 + difficultyPerStage * (stage - 1)),
    baseSeconds, difficultyPerStage, provisional: true,
    overtimeCoinsPerSecond: ACTIVITY_RULES.expeditionOvertimeCoinsPerSecond,
    presenceIdleSeconds: ACTIVITY_RULES.presenceIdleSeconds,
    presenceConfirmationSeconds: ACTIVITY_RULES.presenceConfirmationSeconds };
}
export function activeExpeditionRun(state) {
  return Object.values(state.expeditionRuns || {}).find(run => ['active', 'decision'].includes(run.status)) || null;
}
export function expeditionRoundStatus(state, runOrId = activeExpeditionRun(state), atClock = currentClock(state)) {
  const run = typeof runOrId === 'string' ? expeditionOf(state, runOrId) || state.expeditionRuns?.[runOrId] : runOrId;
  if (!run) return { active: false, decision: false, stage: 0, pot: 0, potentialPot: 0, elapsed: 0, timeLimit: 0,
    remaining: 0, overtimeSeconds: 0, overtimePenalty: 0, nextOvertimeIn: 0,
    presenceRequired: false, presenceRemaining: 0, status: 'none', runId: null };
  const now = atClock, active = run.status === 'active';
  const elapsed = Math.max(0, (active ? now : run.finishedAt ?? now) - run.roundStartedAt);
  if (run.rulesVersion === 16) {
    const fullRewardUntil = run.roundLimit * MINI_GAME_RULES.fullRewardRatio;
    const penaltyEvery = run.roundLimit / MINI_GAME_RULES.penaltyIntervals;
    const penalty = Math.floor(Math.max(0, elapsed - fullRewardUntil) / penaltyEvery + 1e-9);
    const nominalReward = expeditionRoundReward(run.level);
    const roundReward = nominalReward === null ? 0 : Math.max(0, nominalReward - penalty);
    const presenceRequired = ['active', 'decision'].includes(run.status) && run.presencePromptAt !== null;
    return { active, decision: run.status === 'decision', stage: run.level, pot: run.pot,
      potentialPot: active ? Math.min(SAFE, run.pot + roundReward) : run.pot,
      roundReward, nominalReward, adPaused: !!run.adPause, extraTimePurchases: run.extraTimePurchases || 0, adTimeRewards: run.adTimeRewards || 0, elapsed, timeLimit: run.roundLimit, remaining: active ? Math.max(0, run.roundLimit - elapsed) : 0,
      overtimeSeconds: Math.max(0, elapsed - fullRewardUntil), overtimePenalty: penalty,
      nextOvertimeIn: active ? Math.max(0.001, elapsed < fullRewardUntil ? fullRewardUntil + penaltyEvery - elapsed :
        fullRewardUntil + (penalty + 1) * penaltyEvery - elapsed) : 0,
      fullRewardUntil, penaltyEvery, hardDeadline: true, gameKind: run.miniGame?.kind,
      presenceRequired, presenceRemaining: presenceRequired ? Math.max(0, run.presencePromptAt + ACTIVITY_RULES.presenceConfirmationSeconds - now) : 0,
      status: run.status, runId: run.id };
  }
  const overtime = Math.max(0, elapsed - run.roundLimit);
  const overtimeSeconds = active || run.status === 'decision' ? Math.floor(overtime + 1e-9) : 0;
  const overtimePenalty = overtimeSeconds * ACTIVITY_RULES.expeditionOvertimeCoinsPerSecond;
  const potentialPot = active ? Math.max(0, run.roundBasePot - overtimePenalty) : run.pot;
  const presenceRequired = ['active', 'decision'].includes(run.status) && run.presencePromptAt !== null;
  return { active, decision: run.status === 'decision', stage: run.level, pot: run.pot, potentialPot, elapsed,
    timeLimit: run.roundLimit, remaining: active ? Math.max(0, run.roundLimit - elapsed) : 0,
    overtimeSeconds, overtimePenalty,
    nextOvertimeIn: active ? elapsed < run.roundLimit ? run.roundLimit - elapsed + 1 : Math.max(0.001, Math.floor(overtime + 1e-9) + 1 - overtime) : 0,
    presenceRequired, presenceRemaining: presenceRequired ? Math.max(0, run.presencePromptAt + ACTIVITY_RULES.presenceConfirmationSeconds - now) : 0,
    status: run.status, runId: run.id };
}
function loseExpedition(state, run, reason, at = currentClock(state)) {
  run.status = 'lost'; run.pot = 0; run.presencePromptAt = null; run.adPause = null; run.finishedAt = at; run.lossReason = reason;
  if (state.activeExpeditionId === run.expedition) state.activeExpeditionId = null;
  if (run.miniGame?.kind === 'tilt') { run.miniGame.tiltX = 0; run.miniGame.tiltY = 0; }
  signal(state, 'expedition-lost', 'Expedition ended', reason === 'presence-timeout' ? 'The presence confirmation expired. The whole unclaimed pot was lost.' : reason === 'deadline' ? 'Time ran out. The whole unclaimed expedition pot was lost.' : reason === 'overtime' ? 'Overtime consumed the whole potential pot.' : 'The whole unclaimed expedition pot was lost.');
}
function finishMiniGameRound(state, run, at = currentClock(state)) {
  if (run.status !== 'active' || !run.miniGame?.solved || run.presencePromptAt !== null) return null;
  if (at >= run.roundStartedAt + run.roundLimit - 1e-9) {
    loseExpedition(state, run, 'deadline', run.roundStartedAt + run.roundLimit);
    return good('Time ran out. The whole unclaimed expedition pot was lost.', { outcome: 'lost' });
  }
  const status = expeditionRoundStatus(state, run, at);
  run.pot = status.potentialPot; run.status = 'decision'; run.finishedAt = at; run.remaining = 0;
  if (state.statistics) state.statistics.expeditions = integer(state.statistics.expeditions) + 1;
  return good('Level ' + run.level + ' complete. Pot: ' + run.pot + ' coins. Cash out or risk it on the next level.', { pot: run.pot, roundReward: status.roundReward, overtimePenalty: status.overtimePenalty, outcome: 'won' });
}
function settleExpedition(state, run) {
  if (!['active', 'decision'].includes(run.status)) return;
  if (run.adPause) { run.remaining = expeditionRoundStatus(state, run).remaining; return; }
  const now = currentClock(state);
  const promptAt = run.presencePromptAt ?? nonnegative(state.lastMeaningfulActivityAt, now) + ACTIVITY_RULES.presenceIdleSeconds;
  const presenceLossAt = promptAt + ACTIVITY_RULES.presenceConfirmationSeconds;
  const overtimeLossAt = run.status === 'active' ? run.roundStartedAt + run.roundLimit + (run.rulesVersion === 16 ? 0 : Math.ceil(run.roundBasePot / ACTIVITY_RULES.expeditionOvertimeCoinsPerSecond)) : Infinity;
  if (Math.min(presenceLossAt, overtimeLossAt) <= now + 1e-9) {
    loseExpedition(state, run, presenceLossAt <= overtimeLossAt ? 'presence-timeout' : run.rulesVersion === 16 ? 'deadline' : 'overtime', Math.min(presenceLossAt, overtimeLossAt));
    return;
  }
  if (run.presencePromptAt === null && promptAt <= now + 1e-9) {
    run.presencePromptAt = promptAt;
    signal(state, 'expedition-presence', 'Are you still playing?', 'Confirm your presence within 60 seconds. The expedition clock continues.');
  }
  if (run.status === 'active') run.remaining = expeditionRoundStatus(state, run).remaining;
}

export function nextActivitiesEvent(state) {
  const now = currentClock(state);
  let remaining = Infinity;
  for (const task of state.lighthouseTasks || []) remaining = Math.min(remaining, Math.max(0, task.expiresAt - now));
  if (state.taskAcceptanceDraft) remaining = Math.min(remaining, Math.max(0, state.taskAcceptanceDraft.expiresAt - now));
  for (const run of Object.values(state.expeditionRuns || {})) {
    if (!['active', 'decision'].includes(run.status)) continue;
    if (run.adPause) { remaining = Math.min(remaining, run.adPause.remaining); continue; }
    const presenceAt = run.presencePromptAt !== null ? run.presencePromptAt + ACTIVITY_RULES.presenceConfirmationSeconds : nonnegative(state.lastMeaningfulActivityAt, now) + ACTIVITY_RULES.presenceIdleSeconds;
    remaining = Math.min(remaining, Math.max(0, presenceAt - now));
    if (run.status === 'active') {
      const status = expeditionRoundStatus(state, run);
      remaining = Math.min(remaining, status.remaining > 1e-9 ? status.remaining : status.nextOvertimeIn);
      if (run.rulesVersion === 16 && run.miniGame?.kind === 'triples') {
        for (const eventAt of [run.miniGame.hideAt, run.miniGame.nextShuffleAt]) if (validNumber(eventAt)) remaining = Math.min(remaining, Math.max(0, eventAt - now));
      }
    }
  }
  return remaining;
}
export function advanceActivities(state, seconds) {
  if (!validNumber(seconds) || seconds < 0) return;
  const previousClock = currentClock(state), target = previousClock + seconds;
  for (const run of Object.values(state.expeditionRuns || {})) {
    if (run.rulesVersion !== 16 || run.status !== 'active' || !run.miniGame) continue;
    const pauseSeconds = run.adPause ? Math.min(seconds, run.adPause.remaining) : 0;
    if (pauseSeconds) {
      run.roundStartedAt += pauseSeconds;
      state.lastMeaningfulActivityAt = nonnegative(state.lastMeaningfulActivityAt, previousClock) + pauseSeconds; // Presence pause only; engagement tracks real input separately.
      for (const key of ['hideAt', 'nextShuffleAt']) if (validNumber(run.miniGame[key])) run.miniGame[key] += pauseSeconds;
      run.adPause.remaining = Math.max(0, run.adPause.remaining - pauseSeconds);
      if (run.adPause.remaining <= 1e-9) run.adPause = null;
    }
    const availableSeconds = Math.max(0, Math.min(seconds - pauseSeconds, run.roundStartedAt + run.roundLimit - previousClock - pauseSeconds));
    const result = advanceMiniGame(run.miniGame, availableSeconds, previousClock + pauseSeconds);
    if (result.solved) finishMiniGameRound(state, run, previousClock + pauseSeconds + result.elapsed);
  }
  state.activityClock = target;
  if (state.taskAcceptanceDraft && state.taskAcceptanceDraft.expiresAt <= target + 1e-9) state.taskAcceptanceDraft = null;
  for (const task of [...(state.lighthouseTasks || [])]) {
    if (task.expiresAt <= target + 1e-9) {
      if (sum(task.deposited)) signal(state, 'lighthouse-task-expired', 'Lighthouse task expired', 'Unfinished contributions were lost when the task deadline passed.');
      const periods = task.anchorAt === null ? Math.floor(Math.max(0, target - task.expiresAt) / QUEST_LIFE) : 0;
      let created = task.expiresAt + periods * QUEST_LIFE;
      if (task.anchorAt !== null) {
        const next = nextDailyTaskDeadline(state, task.anchorAt, target);
        // Keep the actual scheduled appearance time after an offline return.
        // Creating at login would incorrectly grant a fresh ×3 reaction window.
        created = Math.max(task.expiresAt, nextDailyTaskDeadline(state, task.anchorAt, next - 26 * HOUR));
      }
      replaceTask(state, state.lighthouseTasks.indexOf(task), created);
    }
  }
  for (const run of Object.values(state.expeditionRuns || {})) settleExpedition(state, run);
  refillRewardBuffer(state);
}

function projectOf(state, projectOrOrder) {
  if (plain(projectOrOrder)) return projectOrOrder;
  return state.constructionProjects?.find(project => project.order === projectOrOrder) || null;
}
export function quoteAcceleration(state, projectOrOrder, percent) {
  const project = projectOf(state, projectOrOrder);
  if (!project || project.stage !== 'building' || !(project.buildRemaining > 0)) return bad('Select a construction project that is already building.');
  if (!ACTIVITY_RULES.accelerationPercentages.includes(percent)) return bad('Choose a 25%, 50%, 75% or instant reduction.');
  const savedSeconds = project.buildRemaining * percent / 100;
  const fullMinutes = Math.floor(savedSeconds / 60 + 1e-9);
  const coins = Math.max(ACTIVITY_RULES.minimumAccelerationPrice, fullMinutes);
  return good('Construction acceleration quote.', { coins, savedSeconds, remaining: project.buildRemaining - savedSeconds, percent, project: project.order });
}
export function quoteTransport(state, action, context = {}) {
  if (!context.cashPurchase && level(state, 'townhall') < ACTIVITY_RULES.premiumUnlockLevel) return bad('Instant transport unlocks at Town Hall level 4.');
  const quote = quoteInstantTransport(state, action);
  if (!quote?.ok) return quote || bad('This transport route is unavailable.');
  return { ...quote, coins: integer(quote.trips) * ACTIVITY_RULES.transportCoinsPerTrip };
}
function baseMaterialValue(cost) {
  return MATERIAL_IDS.reduce((total, id) => total + nonnegative(cost[id]) * (['food', 'planks'].includes(id) ? 1.5 : 0.5), 0);
}
function warehouseCarryCapacity(state) {
  return haulCapacity(state, 'warehouse');
}
export function quotePremiumBuilding(state, building, context = {}) {
  if (!context.cashPurchase && level(state, 'townhall') < ACTIVITY_RULES.premiumUnlockLevel) return bad('Buying a building without materials unlocks at Town Hall level 4.');
  if (building === 'townhall') {
    const population = townhallPopulationRequirement(state);
    if (!population.ok) return { ...population, code: 'townhall-population', message: `The Town Hall upgrade to level ${population.targetLevel} requires at least ${population.populationRequired} residents (75% of level ${population.populationLevel} capacity). Current population: ${population.populationCurrent}.` };
  }
  if (typeof context.buildingCost !== 'function') return bad('The construction price is not available.');
  const cost = context.buildingCost(state, building, { queued: false, premiumService: true });
  if (!plain(cost)) return bad('This building does not exist.');
  const materialValue = baseMaterialValue(cost);
  const capacity = warehouseCarryCapacity(state);
  const trips = MATERIAL_IDS.reduce((total, id) => total + Math.ceil(nonnegative(cost[id]) / capacity), 0);
  const materialCoins = materialValue * ACTIVITY_RULES.materialMarkup;
  const nativeCoins = integer(cost.coins), transportCoins = trips * ACTIVITY_RULES.transportCoinsPerTrip;
  const coins = Math.ceil(materialCoins + nativeCoins + transportCoins - 1e-9);
  return good('Building purchase quote.', {
    coins, materialCoins, nativeCoins, transportCoins, materialValue, trips, capacity, cost,
    rounding: 'Whole final coin, rounded up.', inventoryUsed: false, premiumService: true,
    buildSeconds: ACTIVITY_RULES.purchasedBuildSeconds
  });
}
export function quoteForecastPlan(state, building, context = {}) {
  if (typeof context.buildingCost !== 'function') return bad('The construction price is not available.');
  if (!(state.premium?.expiresAt > (validNumber(state.worldTimeMs) ? state.worldTimeMs : Date.now()))) return bad('A construction package is required to schedule expected deliveries.');
  if (building === 'townhall') {
    const population = townhallPopulationRequirement(state);
    if (!population.ok) return { ...population, code: 'townhall-population', message: `The Town Hall upgrade to level ${population.targetLevel} requires at least ${population.populationRequired} residents (75% of level ${population.populationLevel} capacity). Current population: ${population.populationCurrent}.` };
  }
  const cost = context.buildingCost(state, building, { queued: true });
  if (!plain(cost)) return bad('This building does not exist.');
  const missing = Object.fromEntries(MATERIAL_IDS.map(id => [id, Math.max(0, nonnegative(cost[id]) - availableMaterial(state, id))]));
  if (!sum(missing)) return bad('These materials are already available. Order a normal upgrade.');
  const estimate = typeof context.estimateMaterialsSeconds === 'function' ? context.estimateMaterialsSeconds(state, cost) : estimateMaterialsSeconds(state, cost);
  if (!Number.isFinite(estimate)) return bad('The missing materials have no feasible production and delivery route.');
  const coins = Math.ceil(baseMaterialValue(missing) * 0.25 - 1e-9);
  return good('Forecast construction quote.', { coins, missing, cost, estimate });
}
export function quoteConstructionPackage(state) {
  const coins = 1000 * Math.max(1, level(state, 'townhall'));
  const now = validNumber(state.worldTimeMs) ? state.worldTimeMs : Date.now();
  const expiresAt = Math.max(now, nonnegative(state.premium?.expiresAt)) + DAY * 1000;
  if (!Number.isSafeInteger(Math.ceil(expiresAt))) return bad('This package cannot be extended further.');
  return good('Construction package quote.', { coins, duration: DAY, expiresAt });
}

export function verifyExpeditionPath(definition, path) {
  if (!definition || !Array.isArray(definition.map) || !Array.isArray(path) || path.length < 1 || path.length > 100000) return false;
  let row = -1, col = -1;
  for (let r = 0; r < definition.map.length; r++) {
    const c = definition.map[r].indexOf('S');
    if (c >= 0) { row = r; col = c; break; }
  }
  if (row < 0) return false;
  const tools = { ...definition.tools }, cleared = new Set();
  let hasKey = false, moves = 0, reachedGoal = false;
  for (let index = 0; index < path.length; index++) {
    const position = path[index];
    if (!Array.isArray(position) || position.length !== 2 || !position.every(Number.isSafeInteger)) return false;
    const [r, c] = position;
    if (index === 0 && r === row && c === col) continue;
    if (reachedGoal || Math.abs(r - row) + Math.abs(c - col) !== 1) return false;
    const id = r + ',' + c;
    let tile = definition.map[r]?.[c];
    if (tile === undefined || tile === '#') return false;
    if (cleared.has(id)) tile = '.';
    if (tile === 'D' && !hasKey) return false;
    const tool = ({ W: 'bridge', T: 'axe', R: 'dynamite' })[tile];
    if (tool) {
      if (!(tools[tool] > 0)) return false;
      tools[tool]--; cleared.add(id);
    }
    if (tile === 'K') hasKey = true;
    row = r; col = c; moves++;
    reachedGoal = tile === 'G';
  }
  return reachedGoal ? { moves } : false;
}
function expeditionOf(state, runId) {
  return Object.values(state.expeditionRuns || {}).find(run => run.id === runId) || null;
}
function definitionOf(context, id) {
  return (context.expeditions || []).find(definition => definition.id === id) || null;
}
export function expeditionRoundReward(stageNumber = 1) {
  if (!Number.isSafeInteger(stageNumber) || stageNumber < 1 || stageNumber > 48) return null;
  const value = ACTIVITY_RULES.expeditionBase * 2 ** (stageNumber - 1);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
export function expeditionPot(levelNumber) {
  const value = ACTIVITY_RULES.expeditionBase * (2 ** levelNumber - 1);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
function ownCoins(state, price) {
  return Number.isSafeInteger(price) && price >= 0 && integer(state.resources.coins) >= price;
}
const isMiniGameKind = kind => kind === 'tilt' || kind === 'triples';
function prepareMiniGameRound(state, run, stage, context, requestedKind) {
  // New UI supplies a choice. Retain it across rounds and reloads; keep a
  // random first choice only for callers of the pre-choice API.
  const kind = isMiniGameKind(requestedKind) ? requestedKind :
    isMiniGameKind(run.selectedGameKind) ? run.selectedGameKind : random(state) < 0.5 ? 'tilt' : 'triples';
  const seed = Math.floor(random(state) * 0x100000000) || 1;
  const rules = miniGameRoundRules(kind, stage, context.expeditionCurve || state.activitySettings?.expeditionCurve);
  run.rulesVersion = 16;
  run.selectedGameKind = kind;
  run.miniGame = createMiniGame(kind, stage, seed, currentClock(state));
  run.roundLimit = rules.timeLimit; run.remaining = rules.timeLimit;
  run.extraTimePurchases = 0; run.adTimeRewards = 0; run.adAttempts = 0; run.adPause = null;
  return rules;
}

export function quoteExtraTime(state, runOrId = activeExpeditionRun(state)) {
  const run = typeof runOrId === 'string' ? expeditionOf(state, runOrId) : runOrId;
  if (!run || run.rulesVersion !== 16 || run.status !== 'active') return bad('Choose an active mini-game round.');
  if (run.presencePromptAt !== null) return bad('Confirm your presence before buying time.');
  if (run.adPause) return bad('Finish or cancel the ad before buying time.');
  if (!(expeditionRoundStatus(state, run).remaining > 1e-9)) return bad('Additional time must be bought before the deadline.');
  const remainingPurchases = Math.max(0, ACTIVITY_RULES.maximumExtraTimePurchases - integer(run.extraTimePurchases));
  if (!remainingPurchases) return bad('The time purchase limit for this round has been reached.');
  return good('Additional time quote.', { runId: run.id, coins: ACTIVITY_RULES.extraTimeCoins,
    seconds: ACTIVITY_RULES.extraTimeSeconds, remainingPurchases, maxPurchases: ACTIVITY_RULES.maximumExtraTimePurchases });
}

export function activityAction(state, action, context = {}) {
  if (!plain(action) || typeof action.type !== 'string') return null;
  const type = action.type;
  if (type.startsWith('expedition') || ['presenceConfirm', 'taskAccept', 'beginTaskAcceptance', 'confirmTaskAcceptance', 'cancelTaskAcceptance', 'taskDeposit'].includes(type)) advanceActivities(state, 0);
  if (['expeditionExtraTime', 'expeditionAdBegin', 'expeditionAdComplete', 'expeditionAdCancel'].includes(type)) {
    const run = expeditionOf(state, action.runId);
    if (!run || run.rulesVersion !== 16 || run.status !== 'active') return bad('This mini-game round is no longer active.');
    if (type === 'expeditionExtraTime') {
      const quote = quoteExtraTime(state, run);
      if (!quote.ok) return quote;
      if (!ownCoins(state, quote.coins)) return bad('Not enough coins for additional time.');
      consumeMaterial(state, 'coins', quote.coins);
      run.roundLimit += quote.seconds; run.extraTimePurchases = integer(run.extraTimePurchases) + 1;
      run.remaining = expeditionRoundStatus(state, run).remaining;
      return good('Added ' + quote.seconds + ' seconds for ' + quote.coins + ' coins.', quote);
    }
    if (type === 'expeditionAdBegin') {
      if (run.adPause) return bad('An ad is already in progress.');
      if (run.presencePromptAt !== null || !(expeditionRoundStatus(state, run).remaining > 1e-9)) return bad('Start the ad before the round deadline and confirm your presence first.');
      if (integer(run.adAttempts) >= 1 || integer(run.adTimeRewards) >= ACTIVITY_RULES.maximumAdTimeRewards) return bad('The ad limit for this round has been reached.');
      run.adSequence = integer(run.adSequence) + 1; run.adAttempts = integer(run.adAttempts) + 1;
      const nonce = `${run.id}:${run.level}:ad:${run.adSequence}`;
      run.adPause = { nonce, remaining: ACTIVITY_RULES.adPauseTimeoutSeconds };
      if (run.miniGame?.kind === 'tilt') { run.miniGame.tiltX = 0; run.miniGame.tiltY = 0; }
      return good('The round is paused while the ad is in progress. The island world continues.',
        { runId: run.id, nonce, timeout: ACTIVITY_RULES.adPauseTimeoutSeconds, seconds: ACTIVITY_RULES.adTimeSeconds });
    }
    if (!run.adPause || action.nonce !== run.adPause.nonce) return bad('This ad is no longer pending.');
    if (!(expeditionRoundStatus(state, run).remaining > 1e-9)) { run.adPause = null; settleExpedition(state, run); return bad('The round deadline has passed.'); }
    if (type === 'expeditionAdCancel') {
      run.adPause = null;
      return good('Ad skipped. No extra time was awarded. The round continues.');
    }
    const receiptId = action.receiptId;
    if (context.rewardedAdVerified !== true || typeof receiptId !== 'string' || !/^[A-Za-z0-9._:-]{1,160}$/.test(receiptId)) return bad('A verified rewarded-ad completion is required.');
    state.expeditionAdReceipts ||= [];
    if (state.expeditionAdReceipts.includes(receiptId)) return bad('This ad completion was already used.');
    if (integer(run.adTimeRewards) >= ACTIVITY_RULES.maximumAdTimeRewards) return bad('The ad reward for this round was already received.');
    state.expeditionAdReceipts.push(receiptId); state.expeditionAdReceipts = state.expeditionAdReceipts.slice(-100);
    run.adPause = null; run.adTimeRewards = integer(run.adTimeRewards) + 1;
    run.roundLimit += ACTIVITY_RULES.adTimeSeconds; run.remaining = expeditionRoundStatus(state, run).remaining;
    return good('Added ' + ACTIVITY_RULES.adTimeSeconds + ' seconds for the verified ad.', { seconds: ACTIVITY_RULES.adTimeSeconds, runId: run.id });
  }
  if (['seeTaskAchievement', 'shareTaskAchievement', 'skipTaskAchievement'].includes(type)) {
    const achievement = (state.taskAchievements || []).find(item => item.id === action.id);
    if (!achievement) return bad('This completed task achievement is not available.');
    if (type === 'seeTaskAchievement') {
      achievement.seen = true;
      return good('Achievement opened.');
    }
    if (achievement.shared || achievement.skipped) return bad('This achievement has already been resolved.');
    if (type === 'shareTaskAchievement') {
      if (!Number.isSafeInteger(integer(state.resources.coins) + TASK_SHARE_BONUS)) return bad('Your coin balance cannot hold this bonus.');
      state.resources.coins += TASK_SHARE_BONUS;
      achievement.shared = true; achievement.seen = true;
      signal(state, 'task-sharing-bonus', 'Achievement bonus received', `+${TASK_SHARE_BONUS} coins for choosing to share your completed task. Facebook publishing is not connected yet.`);
      return good(`Achievement bonus received: ${TASK_SHARE_BONUS} coins.`, { bonus: TASK_SHARE_BONUS });
    }
    achievement.skipped = true; achievement.seen = true;
    return good('Sharing skipped. Your task reward is already yours.');
  }
  if (type === 'cancelTaskAcceptance') {
    state.taskAcceptanceDraft = null;
    return good('Task confirmation cancelled. No task was started.');
  }
  if (type === 'taskAccept' || type === 'beginTaskAcceptance' || type === 'confirmTaskAcceptance' || type === 'taskDeposit') {
    const requestedTask = action.task || (type === 'confirmTaskAcceptance' ? state.taskAcceptanceDraft?.taskId : null);
    const index = state.lighthouseTasks?.findIndex(task => task.id === requestedTask) ?? -1;
    if (index < 0) return bad('This lighthouse task is no longer available.');
    const task = state.lighthouseTasks[index], status = taskStatus(state, task);
    if (status.remaining <= 0) return bad('This lighthouse task has expired.');
    if (type === 'taskAccept' || type === 'beginTaskAcceptance' || type === 'confirmTaskAcceptance') {
      const activeTask = activeLighthouseTask(state);
      if (activeTask?.id === task.id) return bad('This task is already active.');
      if (activeTask) return bad('Finish the active task or wait for it to expire before starting another.');
      if (type !== 'confirmTaskAcceptance') {
        if (state.taskAcceptanceDraft?.taskId !== task.id) state.taskAcceptanceDraft = {
          taskId: task.id, startedAt: currentClock(state), expiresAt: currentClock(state) + ACTIVITY_RULES.taskConfirmationSeconds,
          multiplier: status.multiplier
        };
        return good('Confirm within 60 seconds to start this task. Its first-click reward multiplier is reserved in this draft.', { draft: true, ...taskAcceptanceStatus(state) });
      }
      const draft = state.taskAcceptanceDraft;
      if (!draft || draft.taskId !== task.id || !taskAcceptanceStatus(state).canConfirm) return bad('This confirmation expired. Open the task again to make a new choice.');
      // A dormant accepted legacy task keeps its original first-click bonus.
      // Confirmation resumes it; it does not create a new acceptance event.
      if (task.acceptedAt === null) {
        task.multiplier = draft.multiplier;
        task.bonusLockedAt = draft.startedAt;
        task.acceptedAt = currentClock(state);
      }
      state.activeTaskId = task.id;
      state.taskAcceptanceDraft = null;
      return good('Task accepted. Reward multiplier ×' + task.multiplier + ' is locked. The active task cannot be cancelled.');
    }
    if (task.acceptedAt === null) return bad('Accept the task before contributing goods.');
    if (!status.active) return bad('Only the active task can receive contributions.');
    const resource = action.resource, quantity = action.amount;
    if (!owns(task.requirements, resource) || !Number.isSafeInteger(quantity) || quantity < 1) return bad('Enter a positive whole quantity of a required material.');
    const needed = task.requirements[resource] - task.deposited[resource];
    if (quantity > needed) return bad('This contribution exceeds the remaining requirement.');
    if (availableMaterial(state, resource) < quantity) return bad(resource === 'food' ? 'Keep the protected food reserve in the central warehouse.' : 'Not enough goods in the central warehouse.');
    const complete = entries(task.requirements).every(([id, value]) => task.deposited[id] + (id === resource ? quantity : 0) >= value);
    if (complete && entries(taskReward(task)).some(([id, value]) => !Number.isSafeInteger(value) || !Number.isSafeInteger(integer(state.resources[id]) + value))) return bad('Your balance cannot hold this reward.');
    consumeMaterial(state, resource, quantity);
    task.deposited[resource] += quantity;
    if (complete) {
      grantTaskReward(state, task);
      const achievementId = 'achievement-' + task.id;
      state.taskAchievements ||= [];
      if (!state.taskAchievements.some(item => item.id === achievementId)) state.taskAchievements.push({
        id: achievementId, taskId: task.id, title: task.title, createdAt: currentClock(state),
        reward: taskReward(task), shared: false, skipped: false, seen: false
      });
      signal(state, 'task-share-pending', 'Share your completed task', 'Share for the prototype 500-coin bonus or choose Skip. This decision remains available in Notifications until resolved.');
      replaceTask(state, index, currentClock(state), true);
      return good('Lighthouse task complete. Reward received and a new task is available.', { completed: true, achievementId });
    }
    return good('Contribution delivered. Contributions cannot be withdrawn.');
  }
  if (type === 'premiumAccelerate') {
    const quote = quoteAcceleration(state, action.project, action.percent);
    if (!quote.ok) return quote;
    if (!ownCoins(state, quote.coins)) return bad('Not enough coins for this acceleration.');
    const project = projectOf(state, action.project);
    consumeMaterial(state, 'coins', quote.coins);
    project.buildRemaining = Math.max(0, project.buildRemaining - quote.savedSeconds);
    return good('Construction shortened by ' + Math.floor(quote.savedSeconds) + ' seconds for ' + quote.coins + ' coins.', quote);
  }
  if (type === 'premiumTransport') {
    const quote = quoteTransport(state, action);
    if (!quote.ok) return quote;
    if (!quote.trips) return bad('There are no goods to transport.');
    if (!ownCoins(state, quote.coins)) return bad('Not enough coins for instant transport.');
    const moved = instantTransport(state, action);
    if (!moved?.ok) return moved || bad('This transport route is unavailable.');
    consumeMaterial(state, 'coins', quote.coins);
    return good(moved.message + ' Cost: ' + quote.coins + ' coins.', { coins: quote.coins });
  }
  if (type === 'premiumBuyBuilding') {
    const quote = quotePremiumBuilding(state, action.building, { ...context, cashPurchase: false });
    if (!quote.ok) return quote;
    if (!ownCoins(state, quote.coins)) return bad('Not enough coins to buy the building.');
    if (typeof context.requestUpgrade !== 'function') return bad('Construction is unavailable.');
    // Reserve the full charge before promoting any other affordable forecasts.
    // The callback may start old orders, so a later charge could overspend.
    consumeMaterial(state, 'coins', quote.coins);
    const started = context.requestUpgrade({ building: action.building, cost: quote.cost, paidMaterials: true, paidCoins: true, skipTransport: true, premiumService: true });
    if (!started?.ok) {
      state.resources.coins += quote.coins;
      return started || bad('The building cannot be purchased now.');
    }
    return good('Building purchased for ' + quote.coins + ' coins. It will be ready in 10 seconds.', { ...started, coins: quote.coins, buildSeconds: quote.buildSeconds });
  }
  if (type === 'forecastPlan') {
    const quote = quoteForecastPlan(state, action.building, context);
    if (!quote.ok) return quote;
    if (!ownCoins(state, quote.coins)) return bad('Not enough coins for the forecast scheduling fee.');
    if (typeof context.requestUpgrade !== 'function') return bad('Construction is unavailable.');
    consumeMaterial(state, 'coins', quote.coins);
    const planned = context.requestUpgrade({ building: action.building, cost: quote.cost, forecast: true, forecastFee: quote.coins });
    if (!planned?.ok) {
      state.resources.coins += quote.coins;
      return planned || bad('The plan cannot be scheduled.');
    }
    return good('Expected-delivery plan scheduled. Fee: ' + quote.coins + ' coins.', { ...planned, coins: quote.coins });
  }
  if (type === 'purchaseConstructionPackage') {
    const quote = quoteConstructionPackage(state);
    if (!quote.ok) return quote;
    if (!ownCoins(state, quote.coins)) return bad('Not enough coins for the construction package.');
    consumeMaterial(state, 'coins', quote.coins);
    state.premium = { ...state.premium, expiresAt: quote.expiresAt };
    return good('Construction package activated for another 24 hours. Four additional builds, unlimited queue and expected-delivery planning are available.', quote);
  }
  if (type === 'socialReward' || type === 'referralReward') return bad('Social and referral rewards will be available after their verification rules are defined.');
  if (type === 'expeditionStart') {
    if (action.gameKind !== undefined && !isMiniGameKind(action.gameKind)) return bad('Choose Marble maze or Picture triples.');
    const definition = definitionOf(context, action.expedition);
    if (!definition) return bad('This expedition does not exist.');
    if (activeExpeditionRun(state)) return bad('Finish or cash out the current expedition series before starting another.');
    const rules = expeditionRoundRules(1, context.expeditionCurve || state.activitySettings?.expeditionCurve);
    const limit = validNumber(action.limit) && action.limit > 0 ? Math.min(86400, action.limit) : rules.timeLimit;
    const run = {
      id: 'run-' + (++state.expeditionSequence), expedition: action.expedition, level: 1, pot: 0,
      status: 'active', mode: 'time', moveLimit: null, remaining: limit,
      startedAt: currentClock(state), roundStartedAt: currentClock(state), roundLimit: limit, roundBasePot: 50,
      presencePromptAt: null, finishedAt: null, lossReason: null
    };
    const currentRules = action.gameVersion === 9 ? rules : prepareMiniGameRound(state, run, 1, context, action.gameKind);
    state.expeditionRuns[action.expedition] = run;
    state.activeExpeditionId = action.expedition;
    state.lastMeaningfulActivityAt = currentClock(state);
    return good('Expedition started for free. The first timely win earns a pot of 50 coins.', { runId: run.id, rules: currentRules });
  }
  if (['expeditionWin', 'expeditionContinue', 'expeditionLose', 'expeditionCashout', 'expeditionPresenceConfirm', 'presenceConfirm', 'expeditionMiniGameInput', 'expeditionMiniGameReveal'].includes(type)) {
    const run = expeditionOf(state, action.runId);
    if (!run) return bad('This expedition run is no longer available.');
    if (type === 'expeditionMiniGameInput' || type === 'expeditionMiniGameReveal') {
      if (run.rulesVersion !== 16 || run.status !== 'active') return bad('This mini-game round is no longer active.');
      if (run.adPause) return bad('Finish or cancel the ad before playing the round.');
      if (run.presencePromptAt !== null) return bad('Confirm your presence before completing this round.');
      if (type === 'expeditionMiniGameInput') {
        const changed = Math.hypot((action.tiltX ?? 0) - run.miniGame.tiltX, (action.tiltY ?? 0) - run.miniGame.tiltY) > 0.02;
        if (!setMiniGameTilt(run.miniGame, action.tiltX, action.tiltY)) return bad('Move the board with a valid tilt input.');
        if (changed && action.meaningful !== false) state.lastMeaningfulActivityAt = currentClock(state);
        return good('Board tilt updated.');
      }
      if (!revealMiniGameCard(run.miniGame, action.index, currentClock(state))) return bad('Choose a covered card that has not been matched.');
      state.lastMeaningfulActivityAt = currentClock(state);
      return finishMiniGameRound(state, run) || good('Card revealed.');
    }
    if (type === 'expeditionPresenceConfirm' || type === 'presenceConfirm') {
      if (!['active', 'decision'].includes(run.status) || run.presencePromptAt === null) return bad('There is no pending presence confirmation for this series.');
      run.presencePromptAt = null; state.lastMeaningfulActivityAt = currentClock(state);
      return good('Presence confirmed. The expedition clock has continued while this prompt was open.');
    }
    if (type === 'expeditionContinue') {
      if (action.gameKind !== undefined && !isMiniGameKind(action.gameKind)) return bad('Choose Marble maze or Picture triples.');
      if (run.status !== 'decision') return bad('Complete the current level before continuing.');
      if (run.presencePromptAt !== null) return bad('Confirm your presence before starting the next round.');
      const nextReward = run.rulesVersion === 16 ? expeditionRoundReward(run.level + 1) : 50;
      if (nextReward === null || !Number.isSafeInteger(run.pot + nextReward) || !Number.isSafeInteger(run.level + 1)) return bad('Cash out the current pot before starting another series.');
      const rules = expeditionRoundRules(run.level + 1, context.expeditionCurve || state.activitySettings?.expeditionCurve);
      const limit = validNumber(action.limit) && action.limit > 0 ? Math.min(86400, action.limit) : rules.timeLimit;
      run.level++; run.status = 'active'; run.startedAt = currentClock(state);
      run.roundStartedAt = currentClock(state); run.roundLimit = limit; run.remaining = limit;
      run.roundBasePot = run.pot + 50; run.finishedAt = null; run.lossReason = null;
      const currentRules = run.rulesVersion === 16 ? prepareMiniGameRound(state, run, run.level, context, action.gameKind) : rules;
      state.lastMeaningfulActivityAt = currentClock(state);
      return good('The entire ' + run.pot + '-coin pot is now at risk. A timely win adds up to ' + nextReward + ' coins.', { rules: currentRules, roundReward: nextReward });
    }
    if (type === 'expeditionCashout') {
      if (run.status !== 'decision' || !run.pot) return bad('There is no completed expedition pot to cash out.');
      if (!Number.isSafeInteger(integer(state.resources.coins) + run.pot)) return bad('Your coin balance cannot hold this pot.');
      const coins = run.pot;
      state.resources.coins += coins; run.pot = 0; run.status = 'closed'; run.presencePromptAt = null;
      state.activeExpeditionId = null;
      return good('Cashed out ' + coins + ' expedition coins to your island.', { coins });
    }
    if (type === 'expeditionLose') {
      if (!['active', 'decision'].includes(run.status)) return bad('This expedition run has already ended.');
      loseExpedition(state, run, 'abandoned');
      return good('The expedition ended. The unclaimed pot was lost.', { outcome: 'lost' });
    }
    if (run.status !== 'active' || action.stage !== run.level) return bad('This expedition stage has already been settled.');
    if (run.presencePromptAt !== null) return bad('Confirm your presence before completing this round.');
    if (run.rulesVersion === 16) return finishMiniGameRound(state, run) || bad('Complete the current mini-game to win this round.');
    const proof = verifyExpeditionPath(definitionOf(context, run.expedition), action.path);
    if (!proof) return bad('Complete a valid route to the expedition goal.');
    const status = expeditionRoundStatus(state, run), pot = status.potentialPot;
    if (!(pot > 0)) {
      loseExpedition(state, run, 'overtime');
      return good('Overtime consumed the whole potential pot.', { outcome: 'lost' });
    }
    run.pot = pot; run.status = 'decision'; run.finishedAt = currentClock(state); run.remaining = 0;
    if (state.statistics) state.statistics.expeditions = integer(state.statistics.expeditions) + 1;
    return good('Level ' + run.level + ' complete. Pot: ' + pot + ' coins. Cash out or risk it on the next level.', { pot, overtimePenalty: status.overtimePenalty, outcome: 'won' });
  }
  if (type === 'expeditionExtraMoves' || type === 'expeditionAdReward') return bad('Use the time purchase or a verified rewarded-ad completion.');
  return null;
}
