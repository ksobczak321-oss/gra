import { warsawDayKey, nextWarsawMidnightMs } from './harborlight-v1-calendar.js?v=frontend-v31';

// One bounded reward budget per account, shared by every island and puzzle.
// A chapter identity survives goal changes, reloads and practice replays.
export const ADVENTURE_BUDGET_RULES = Object.freeze({ version: 1, dailyFraction: .2, chapterFraction: .3, canonicalPerLevel: 500, maximumReceipts: 512, maximumChapters: 100 });
const materials = ['wood', 'stone', 'grain', 'food', 'planks'];
const goods = ['coins', ...materials];
const weight = id => id === 'coins' ? 1 : ['food', 'planks'].includes(id) ? 1.5 : .5;
const integer = (n, fallback = 0) => Number.isSafeInteger(n) && n >= 0 ? n : fallback;
const timeOf = state => Number.isFinite(state.worldTimeMs) ? Math.max(0, state.worldTimeMs) : 0;
const levelOf = state => Math.max(1, Math.min(100, integer(state.buildings?.townhall?.level, 1)));
const chapterOf = state => Math.max(2, Math.min(100, integer(state.lighthouseMissions?.chapter?.level, levelOf(state))));

export function normalizeAdventureBudget(state, raw = state) {
  const saved = raw.adventureBudget?.version === 1 ? raw.adventureBudget : {};
  const previous = state.adventureBudget;
  const nowDay = warsawDayKey(timeOf(state));
  const day = /^\d{4}-\d{2}-\d{2}$/.test(saved.day || '') && saved.day > nowDay ? saved.day : nowDay;
  const sameDay = saved.day === day;
  const highestLevel = Math.max(levelOf(state), Math.min(100, integer(saved.highestLevel, 1)));
  const chapters = {};
  for (const [key, item] of Object.entries(saved.chapters || {}).slice(-100)) {
    if (!/^chapter-(?:[2-9]|[1-9]\d|100)$/.test(key) || !item || typeof item !== 'object') continue;
    const level = Number(key.slice(8));
    chapters[key] = { limit: Math.floor(500 * level * ADVENTURE_BUDGET_RULES.chapterFraction), spent: integer(item.spent) };
  }
  state.adventureBudget = { version: 1, day, highestLevel,
    dailyLimit: Math.floor(500 * highestLevel * ADVENTURE_BUDGET_RULES.dailyFraction),
    dailySpent: sameDay ? integer(saved.dailySpent) : 0, chapters,
    receipts: Array.isArray(saved.receipts) ? [...new Set(saved.receipts.filter(id => typeof id === 'string' && id.length <= 240))].slice(-512) : [] };
  if (previous?.version === 1 && previous !== state.adventureBudget) { Object.assign(previous, state.adventureBudget); state.adventureBudget = previous; }
  return state.adventureBudget;
}

function ensure(state) {
  const saved = state.adventureBudget;
  if (saved?.version !== 1 || saved.day < warsawDayKey(timeOf(state))) return normalizeAdventureBudget(state);
  if (levelOf(state) > saved.highestLevel) {
    saved.highestLevel = levelOf(state);
    saved.dailyLimit = Math.floor(500 * saved.highestLevel * ADVENTURE_BUDGET_RULES.dailyFraction);
  }
  return saved;
}

export function adventureRewardStatus(state) {
  const budget = ensure(state), chapter = chapterOf(state), key = `chapter-${chapter}`;
  const entry = budget.chapters[key] || { limit: Math.floor(500 * chapter * ADVENTURE_BUDGET_RULES.chapterFraction), spent: 0 };
  return { chapter, key, dailyRemaining: Math.max(0, budget.dailyLimit - budget.dailySpent),
    chapterRemaining: Math.max(0, entry.limit - entry.spent), resetAt: nextWarsawMidnightMs(timeOf(state)),
    dailyLimit: budget.dailyLimit, chapterLimit: entry.limit };
}

export function claimAdventureBudget(state, { receiptId, reward = {} } = {}) {
  const budget = ensure(state), status = adventureRewardStatus(state);
  if (typeof receiptId !== 'string' || !receiptId || receiptId.length > 240 || budget.receipts.includes(receiptId)) return { reward: {}, practice: true, duplicate: true, ...status };
  const remaining = Math.min(status.dailyRemaining, status.chapterRemaining);
  const requested = Object.fromEntries(goods.map(id => [id, Math.min(100000, integer(reward[id]))]));
  const value = goods.reduce((sum, id) => sum + requested[id] * weight(id), 0);
  const scale = value > 0 ? Math.min(1, remaining / value) : 0;
  const awarded = Object.fromEntries(goods.map(id => [id, Math.floor(requested[id] * scale)]).filter(([, n]) => n > 0));
  const spent = Math.ceil(goods.reduce((sum, id) => sum + (awarded[id] || 0) * weight(id), 0));
  budget.chapters[status.key] ||= { limit: status.chapterLimit, spent: 0 };
  budget.dailySpent += spent; budget.chapters[status.key].spent += spent;
  budget.receipts.push(receiptId); budget.receipts = budget.receipts.slice(-ADVENTURE_BUDGET_RULES.maximumReceipts);
  return { reward: awarded, practice: spent === 0, value: spent, ...adventureRewardStatus(state) };
}
