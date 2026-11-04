// Calendar-based welcome residents. The account host calls this once after a
// confirmed login; catch-up simulation and ordinary activity never grant one.
import { uiCopy } from './harborlight-v1-approved-copy.js?v=frontend-v31';
import { warsawDayKey, calendarDayDistance } from './harborlight-v1-calendar.js?v=frontend-v31';

export const WELCOME_WORKER_DAYS = 7;
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const whole = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;

export function normalizeWelcomeWorkers(source = {}, { startedAt = 0 } = {}) {
  source = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  const origin = finite(source.startedAt) ? source.startedAt : finite(startedAt) ? startedAt : 0;
  const firstDay = warsawDayKey(origin);
  const claims = [...new Set((Array.isArray(source.claimedDays) ? source.claimedDays : []).filter(day))]
    .filter(key => { const offset = calendarDayDistance(firstDay, key); return offset >= 0 && offset < WELCOME_WORKER_DAYS; }).sort();
  return { version: 1, startedAt: origin, claimedDays: claims,
    granted: Math.min(claims.length, whole(source.granted)), announced: source.announced === true };
}

export function welcomeWorkerStatus(state, { now = state.worldTimeMs, population = state.population, limit = Infinity } = {}) {
  const ledger = state.welcomeWorkers || {};
  const origin = finite(ledger.startedAt) ? ledger.startedAt : 0;
  const validTime = finite(now) && now >= origin;
  const currentDay = warsawDayKey(finite(now) ? now : origin);
  const offset = validTime ? calendarDayDistance(warsawDayKey(origin), currentDay) : -1;
  const inWindow = origin > 0 && validTime && offset >= 0 && offset < WELCOME_WORKER_DAYS;
  const alreadyClaimed = (ledger.claimedDays || []).includes(currentDay);
  const hasRoom = Number.isFinite(population) && population >= 0 && (limit === Infinity || Number.isFinite(limit)) && population < limit;
  return { active: inWindow, day: currentDay, dayNumber: offset + 1,
    eligible: inWindow && !alreadyClaimed, hasRoom, count: inWindow && !alreadyClaimed && hasRoom ? 1 : 0,
    claimedDays: [...(ledger.claimedDays || [])], granted: whole(ledger.granted), maximum: WELCOME_WORKER_DAYS };
}

/** Claiming records today's opportunity even at full population. No deferred
 * residents, missed-day backfill or grants on a second island/account reload.
 * The caller adds result.count residents through its normal resident model. */
export function claimWelcomeWorker(state, options = {}) {
  const status = welcomeWorkerStatus(state, options);
  if (!status.eligible) return { ok: false, count: 0, reason: status.active ? 'already-claimed' : 'outside-window', day: status.day };
  state.welcomeWorkers.claimedDays.push(status.day);
  state.welcomeWorkers.claimedDays.sort();
  state.welcomeWorkers.granted = Math.min(WELCOME_WORKER_DAYS, whole(state.welcomeWorkers.granted) + status.count);
  return { ok: true, count: status.count, day: status.day, dayNumber: status.dayNumber, reason: status.count ? 'granted' : 'population-limit' };
}

export function welcomeWorkerCopy(language = 'pl') {
  return { title: uiCopy('welcomeWorkersTitle', language), text: uiCopy('welcomeWorkersBody', language) };
}
