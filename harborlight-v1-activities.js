// Agreed activities and coin services. Timers are elapsed world seconds, including offline time.
// This module has no network integrations and never grants coins for unverified social actions.
import {
  MATERIAL_IDS, stockRoom, receiveMaterials, notify,
  quoteInstantTransport, instantTransport, estimateMaterialsSeconds
} from './harborlight-v1-logistics.js?v=frontend-v11';

const HOUR = 3600;
const QUEST_LIFE = 6 * HOUR;
const DAY = 24 * HOUR;
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
const foodReserve = state => 50 * level(state, 'warehouse');
const availableMaterial = (state, resource) => Math.max(0, integer(state.resources?.[resource]) - (resource === 'food' ? foodReserve(state) : 0));

export const ACTIVITY_RULES = Object.freeze({
  coinsPerPLN: 10, accelerationPercentages: [25, 50, 75, 100],
  coinsPerFullMinute: 1, minimumAccelerationPrice: 5, transportCoinsPerTrip: 10,
  premiumUnlockLevel: 4, materialMarkup: 1.25,
  purchasedBuildSeconds: 10,
  packagePricePerLevel: 1000, packageDuration: DAY,
  taskDuration: QUEST_LIFE, expeditionBase: 50, maximumAdSeconds: 30,
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
const WARSAW = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function localParts(milliseconds) {
  return Object.fromEntries(WARSAW.formatToParts(new Date(milliseconds)).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
}
function localOffset(milliseconds) {
  const p = localParts(milliseconds);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(milliseconds / 1000) * 1000;
}
// One civil-time occurrence per Warsaw date. On the spring clock gap the
// occurrence moves forward by the missing hour; on an autumn overlap the first
// occurrence is used. Other days keep the original local time exactly.
export function nextDailyTaskDeadline(state, anchorClock, afterClock = currentClock(state)) {
  const epoch = state.activityEpochMs;
  const anchorAbs = epoch + anchorClock * 1000, afterAbs = epoch + afterClock * 1000;
  if (!Number.isFinite(new Date(anchorAbs).getTime()) || !Number.isFinite(new Date(afterAbs).getTime())) return afterClock + DAY;
  const anchor = localParts(anchorAbs), after = localParts(afterAbs);
  const fraction = ((anchorAbs % 1000) + 1000) % 1000;
  for (let days = 0; days < 4; days++) {
    const day = new Date(Date.UTC(after.year, after.month - 1, after.day + days));
    const local = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), anchor.hour, anchor.minute, anchor.second, fraction);
    const offsets = new Set([-36, 0, 36].map(h => localOffset(local + h * HOUR * 1000)));
    const candidates = [...offsets].map(offset => local - offset);
    const matching = candidates.filter(absolute => {
      const p = localParts(absolute);
      return p.year === day.getUTCFullYear() && p.month === day.getUTCMonth() + 1 && p.day === day.getUTCDate() && p.hour === anchor.hour && p.minute === anchor.minute && p.second === anchor.second;
    });
    const chosen = matching.length ? Math.min(...matching) : Math.max(...candidates);
    if (chosen > afterAbs + 0.5) return (chosen - epoch) / 1000;
  }
  return afterClock + DAY;
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
    acceptedAt: null, multiplier: 1
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
  return {
    id: raw.id.slice(0, 80), slot, size: raw.size,
    title: typeof raw.title === 'string' ? raw.title.slice(0, 160) : TASK_NARRATIVES[slot],
    requirements, deposited, reward, hours: integer(raw.hours, CONFIG[raw.size].hours[0], 10),
    levelSnapshot: Object.fromEntries(Object.keys(requirements).map(id => [id, integer(raw.levelSnapshot?.[id], 1, 100)])),
    rewardLevel: Math.max(1, integer(raw.rewardLevel, 1, 100)),
    chainId: typeof raw.chainId === 'string' ? raw.chainId.slice(0, 80) : 'chain-' + slot,
    anchorAt, createdAt, expiresAt, acceptedAt,
    multiplier: acceptedAt === null ? 1 : acceptedAt - createdAt < 15 ? 3 : acceptedAt - createdAt < 300 ? 2 : 1
  };
}

export function normalizeActivities(state, raw = {}) {
  if (raw === state) raw = JSON.parse(JSON.stringify(raw));
  state.activityClock = nonnegative(raw.activityClock, nonnegative(state.activeSeconds));
  state.activityEpochMs = validNumber(raw.activityEpochMs) ? raw.activityEpochMs : (validNumber(state.worldTimeMs) ? state.worldTimeMs : Date.now()) - state.activityClock * 1000;
  state.activitySeed = integer(raw.activitySeed, ((Date.now() ^ 0x5f3759df) >>> 0), 0xffffffff) || 1;
  state.taskSequence = integer(raw.taskSequence);
  state.expeditionSequence = integer(raw.expeditionSequence);
  state.activitySettings = {
    taskMode: 'queue'
  };
  state.rewardBuffer = zeros();
  for (const id of MATERIAL_IDS) state.rewardBuffer[id] = integer(raw.rewardBuffer?.[id]);
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
  state.expeditionRuns = {};
  for (const [id, item] of entries(raw.expeditionRuns)) {
    if (!plain(item) || typeof item.id !== 'string' || !['active', 'decision', 'closed', 'lost'].includes(item.status)) continue;
    const n = integer(item.level, 1, 48);
    state.expeditionRuns[id] = {
      id: item.id.slice(0, 80), expedition: id,
      level: Math.max(1, n), pot: integer(item.pot),
      status: item.status, mode: item.mode === 'time' ? 'time' : 'moves',
      moveLimit: validNumber(item.moveLimit) ? Math.max(1, integer(item.moveLimit, 1, 100000)) : null,
      remaining: validNumber(item.remaining) ? nonnegative(item.remaining, 0, 86400) : null,
      startedAt: nonnegative(item.startedAt, state.activityClock)
    };
    const number = /^run-(\d+)$/.exec(item.id);
    if (number) state.expeditionSequence = Math.max(state.expeditionSequence, integer(Number(number[1])));
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
  let moved = 0;
  for (const id of MATERIAL_IDS) {
    const quantity = Math.min(integer(state.rewardBuffer[id]), stockRoom(state, id));
    if (quantity > 0) {
      state.resources[id] += quantity;
      state.rewardBuffer[id] -= quantity;
      moved += quantity;
    }
  }
  if (moved) signal(state, 'reward-released', 'Reward goods delivered', moved + ' stored reward items moved into the central warehouse.');
}
function grantTaskReward(state, task) {
  const values = taskReward(task);
  const coins = values.coins || 0;
  if (!Number.isSafeInteger(integer(state.resources.coins) + coins)) return false;
  state.resources.coins += coins;
  for (const id of MATERIAL_IDS) {
    const quantity = integer(values[id]);
    const stored = Math.min(quantity, stockRoom(state, id));
    if (stored) receiveMaterials(state, { [id]: stored }, { overflowToPending: false });
    state.rewardBuffer[id] = integer(state.rewardBuffer[id]) + quantity - stored;
  }
  signal(state, 'lighthouse-task-reward', 'Lighthouse task complete', 'Reward: ' + coins + ' coins. Multiplier ×' + task.multiplier + '.');
  if (sum(state.rewardBuffer)) signal(state, 'reward-buffer', 'Reward goods waiting', 'Your reward exceeds available warehouse space. The remainder will be delivered automatically when space opens.');
  return true;
}
function replaceTask(state, index, at = currentClock(state), completed = false) {
  const previous = state.lighthouseTasks[index];
  if (state.activeTaskId === previous.id) state.activeTaskId = null;
  // Exclude the task being replaced from reward-order constraints.
  state.lighthouseTasks.splice(index, 1);
  const next = generateTask(state, null, previous.slot, at);
  next.chainId = previous.chainId;
  next.anchorAt = previous.anchorAt === null && completed ? at : previous.anchorAt;
  if (next.anchorAt !== null) next.expiresAt = nextDailyTaskDeadline(state, next.anchorAt, at);
  state.lighthouseTasks.push(next);
  return next;
}

export function nextActivitiesEvent(state) {
  const now = currentClock(state);
  let remaining = Infinity;
  for (const task of state.lighthouseTasks || []) remaining = Math.min(remaining, Math.max(0, task.expiresAt - now));
  for (const run of Object.values(state.expeditionRuns || {})) {
    if (run.status === 'active' && run.mode === 'time' && run.remaining !== null) remaining = Math.min(remaining, Math.max(0, run.remaining));
  }
  return remaining;
}
export function advanceActivities(state, seconds) {
  if (!validNumber(seconds) || seconds < 0) return;
  const target = currentClock(state) + seconds;
  state.activityClock = target;
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
  for (const run of Object.values(state.expeditionRuns || {})) {
    if (run.status === 'active' && run.mode === 'time' && run.remaining !== null) {
      run.remaining = Math.max(0, run.remaining - seconds);
      if (run.remaining === 0) {
        run.status = 'lost'; run.pot = 0;
        signal(state, 'expedition-lost', 'Expedition time expired', 'The unclaimed expedition pot was lost.');
      }
    }
  }
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
export function quoteTransport(state, action) {
  if (level(state, 'townhall') < ACTIVITY_RULES.premiumUnlockLevel) return bad('Instant transport unlocks at Town Hall level 4.');
  const quote = quoteInstantTransport(state, action);
  if (!quote?.ok) return quote || bad('This transport route is unavailable.');
  return { ...quote, coins: integer(quote.trips) * ACTIVITY_RULES.transportCoinsPerTrip };
}
function baseMaterialValue(cost) {
  return MATERIAL_IDS.reduce((total, id) => total + nonnegative(cost[id]) * (['food', 'planks'].includes(id) ? 1.5 : 0.5), 0);
}
function warehouseCarryCapacity(state) {
  return Math.max(1, Math.floor(60 * 1.1 ** Math.max(0, level(state, 'warehouse') - 1)));
}
export function quotePremiumBuilding(state, building, context = {}) {
  if (level(state, 'townhall') < ACTIVITY_RULES.premiumUnlockLevel) return bad('Buying a building without materials unlocks at Town Hall level 4.');
  if (typeof context.buildingCost !== 'function') return bad('The construction price is not available.');
  const cost = context.buildingCost(state, building);
  if (!plain(cost)) return bad('This building does not exist.');
  const materialValue = baseMaterialValue(cost);
  const capacity = warehouseCarryCapacity(state);
  const trips = MATERIAL_IDS.reduce((total, id) => total + Math.ceil(nonnegative(cost[id]) / capacity), 0);
  const materialCoins = materialValue * ACTIVITY_RULES.materialMarkup;
  const nativeCoins = integer(cost.coins), transportCoins = trips * ACTIVITY_RULES.transportCoinsPerTrip;
  const coins = Math.ceil(materialCoins + nativeCoins + transportCoins - 1e-9);
  return good('Building purchase quote.', {
    coins, materialCoins, nativeCoins, transportCoins, materialValue, trips, capacity, cost,
    rounding: 'Whole final coin, rounded up.', inventoryUsed: false,
    buildSeconds: ACTIVITY_RULES.purchasedBuildSeconds
  });
}
export function quoteForecastPlan(state, building, context = {}) {
  if (typeof context.buildingCost !== 'function') return bad('The construction price is not available.');
  if (!(state.premium?.expiresAt > (validNumber(state.worldTimeMs) ? state.worldTimeMs : Date.now()))) return bad('A construction package is required to schedule expected deliveries.');
  const cost = context.buildingCost(state, building);
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
export function expeditionPot(levelNumber) {
  const value = 50 * 2 ** (levelNumber - 1);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
function ownCoins(state, price) {
  return Number.isSafeInteger(price) && price >= 0 && integer(state.resources.coins) >= price;
}

export function activityAction(state, action, context = {}) {
  if (!plain(action) || typeof action.type !== 'string') return null;
  const type = action.type;
  if (type === 'taskAccept' || type === 'taskDeposit') {
    const index = state.lighthouseTasks?.findIndex(task => task.id === action.task) ?? -1;
    if (index < 0) return bad('This lighthouse task is no longer available.');
    const task = state.lighthouseTasks[index], status = taskStatus(state, task);
    if (status.remaining <= 0) return bad('This lighthouse task has expired.');
    if (type === 'taskAccept') {
      const activeTask = activeLighthouseTask(state);
      if (activeTask?.id === task.id) return bad('This task is already active.');
      if (activeTask) return bad('Finish the active task or wait for it to expire before starting another.');
      const resumed = task.acceptedAt !== null;
      if (!resumed) { task.multiplier = status.multiplier; task.acceptedAt = currentClock(state); }
      state.activeTaskId = task.id;
      return good((resumed ? 'Task resumed.' : 'Task accepted.') + ' Reward multiplier ×' + task.multiplier + ' is locked.');
    }
    if (task.acceptedAt === null) return bad('Accept the task before contributing goods.');
    if (!status.active) return bad('Only the active task can receive contributions.');
    const resource = action.resource, quantity = action.amount;
    if (!owns(task.requirements, resource) || !Number.isSafeInteger(quantity) || quantity < 1) return bad('Enter a positive whole quantity of a required material.');
    const needed = task.requirements[resource] - task.deposited[resource];
    if (quantity > needed) return bad('This contribution exceeds the remaining requirement.');
    if (availableMaterial(state, resource) < quantity) return bad(resource === 'food' ? 'Keep the protected food reserve in the central warehouse.' : 'Not enough goods in the central warehouse.');
    const complete = entries(task.requirements).every(([id, value]) => task.deposited[id] + (id === resource ? quantity : 0) >= value);
    if (complete && !Number.isSafeInteger(integer(state.resources.coins) + (taskReward(task).coins || 0))) return bad('Your coin balance cannot hold this reward.');
    state.resources[resource] -= quantity;
    task.deposited[resource] += quantity;
    if (complete) {
      grantTaskReward(state, task);
      replaceTask(state, index, currentClock(state), true);
      return good('Lighthouse task complete. Reward received and a new task is available.', { completed: true });
    }
    return good('Contribution delivered. Contributions cannot be withdrawn.');
  }
  if (type === 'premiumAccelerate') {
    const quote = quoteAcceleration(state, action.project, action.percent);
    if (!quote.ok) return quote;
    if (!ownCoins(state, quote.coins)) return bad('Not enough coins for this acceleration.');
    const project = projectOf(state, action.project);
    state.resources.coins -= quote.coins;
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
    state.resources.coins -= quote.coins;
    return good(moved.message + ' Cost: ' + quote.coins + ' coins.', { coins: quote.coins });
  }
  if (type === 'premiumBuyBuilding') {
    const quote = quotePremiumBuilding(state, action.building, context);
    if (!quote.ok) return quote;
    if (!ownCoins(state, quote.coins)) return bad('Not enough coins to buy the building.');
    if (typeof context.requestUpgrade !== 'function') return bad('Construction is unavailable.');
    // Reserve the full charge before promoting any other affordable forecasts.
    // The callback may start old orders, so a later charge could overspend.
    state.resources.coins -= quote.coins;
    const started = context.requestUpgrade({ building: action.building, cost: quote.cost, paidMaterials: true, paidCoins: true, skipTransport: true });
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
    state.resources.coins -= quote.coins;
    const planned = context.requestUpgrade({ building: action.building, cost: quote.cost, forecast: true });
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
    state.resources.coins -= quote.coins;
    state.premium = { ...state.premium, expiresAt: quote.expiresAt };
    return good('Construction package activated for another 24 hours. Four additional builds, unlimited queue and expected-delivery planning are available.', quote);
  }
  if (type === 'socialReward' || type === 'referralReward') return bad('Social and referral rewards will be available after their verification rules are defined.');
  if (type === 'expeditionStart') {
    const definition = definitionOf(context, action.expedition);
    if (!definition) return bad('This expedition does not exist.');
    const oldRun = state.expeditionRuns[action.expedition];
    if (oldRun && ['active', 'decision'].includes(oldRun.status)) return bad('Finish or cash out the current expedition first.');
    const mode = action.mode === 'time' ? 'time' : 'moves';
    const limit = Number.isSafeInteger(action.limit) && action.limit > 0 ? action.limit : null;
    if (mode === 'time' && limit === null) return bad('Choose a time limit for this expedition.');
    const run = {
      id: 'run-' + (++state.expeditionSequence), expedition: action.expedition, level: 1, pot: 0,
      status: 'active', mode, moveLimit: mode === 'moves' ? limit : null,
      remaining: mode === 'time' ? limit : null, startedAt: currentClock(state)
    };
    state.expeditionRuns[action.expedition] = run;
    return good('Expedition started. The first completed level earns a pot of 50 coins.', { runId: run.id });
  }
  if (['expeditionWin', 'expeditionContinue', 'expeditionLose', 'expeditionCashout'].includes(type)) {
    const run = expeditionOf(state, action.runId);
    if (!run) return bad('This expedition run is no longer available.');
    if (type === 'expeditionContinue') {
      if (run.status !== 'decision') return bad('Complete the current level before continuing.');
      if (expeditionPot(run.level + 1) === null) return bad('Cash out the current pot before starting another series.');
      let limit = null;
      if (run.mode === 'time') {
        limit = Number.isSafeInteger(action.limit) && action.limit > 0 ? action.limit : null;
        if (limit === null) return bad('Choose the next level’s time limit.');
      }
      run.level++; run.status = 'active'; run.startedAt = currentClock(state);
      if (limit !== null) run.remaining = limit;
      return good('The entire ' + run.pot + '-coin pot is now at risk on level ' + run.level + '.');
    }
    if (type === 'expeditionCashout') {
      if (run.status !== 'decision' || !run.pot) return bad('There is no completed expedition pot to cash out.');
      if (!Number.isSafeInteger(integer(state.resources.coins) + run.pot)) return bad('Your coin balance cannot hold this pot.');
      const coins = run.pot;
      state.resources.coins += coins; run.pot = 0; run.status = 'closed';
      return good('Cashed out ' + coins + ' expedition coins to your island.', { coins });
    }
    if (type === 'expeditionLose') {
      if (!['active', 'decision'].includes(run.status)) return bad('This expedition run has already ended.');
      run.pot = 0; run.status = 'lost';
      return good('The expedition ended. The unclaimed pot was lost.', { outcome: 'lost' });
    }
    if (run.status !== 'active' || action.stage !== run.level) return bad('This expedition stage has already been settled.');
    const proof = verifyExpeditionPath(definitionOf(context, run.expedition), action.path);
    if (!proof) return bad('Complete a valid route to the expedition goal.');
    if ((run.mode === 'moves' && run.moveLimit !== null && proof.moves > run.moveLimit) || (run.mode === 'time' && !(run.remaining > 0))) {
      run.status = 'lost'; run.pot = 0;
      return good('The expedition limit was exceeded. The unclaimed pot was lost.', { outcome: 'lost' });
    }
    const pot = expeditionPot(run.level);
    if (pot === null) return bad('Cash out before this expedition grows beyond the supported coin balance.');
    run.pot = pot; run.status = 'decision';
    if (state.statistics) state.statistics.expeditions = integer(state.statistics.expeditions) + 1;
    return good('Level ' + run.level + ' complete. Pot: ' + pot + ' coins. Cash out or risk it on the next level.', { pot, outcome: 'won' });
  }
  if (type === 'expeditionExtraTime' || type === 'expeditionExtraMoves' || type === 'expeditionAdReward') return bad('Additional time, moves and ad rewards will be available after their prices and verification rules are defined.');
  return null;
}
