// Private simulation clock. This module does not replace real service time.
export const DEV_CLOCK_RATES = Object.freeze([1, 2, 6]);
const MAX_JUMP_SECONDS = 31 * 86400;
const invalid = () => Object.assign(new Error('Invalid DEV simulation clock.'), { code: 'invalid-state', status: 400 });
const safeTime = value => Number.isSafeInteger(value) && value >= 0;

export function normalizeDevAccountClock(saved, realNow) {
  if (!safeTime(realNow)) throw invalid();
  if (!saved) return { schema: 2, realAnchorMs: realNow, effectiveAnchorMs: realNow, rate: 1, revision: 0, receipts: {} };
  if (saved.schema === undefined) {
    if (!Number.isSafeInteger(saved.offsetSeconds) || saved.offsetSeconds < 0 || !safeTime(realNow + saved.offsetSeconds * 1000)) throw invalid();
    return { schema: 2, realAnchorMs: realNow, effectiveAnchorMs: realNow + saved.offsetSeconds * 1000, rate: 1, revision: 0, receipts: { ...saved.receipts } };
  }
  if (saved.schema !== 2 || !safeTime(saved.realAnchorMs) || !safeTime(saved.effectiveAnchorMs) || saved.effectiveAnchorMs < saved.realAnchorMs || !DEV_CLOCK_RATES.includes(saved.rate) || !Number.isSafeInteger(saved.revision) || saved.revision < 0) throw invalid();
  return { ...saved, receipts: { ...saved.receipts } };
}

export function devAccountClockStatus(saved, realNow) {
  const clock = normalizeDevAccountClock(saved, realNow);
  const now = clock.effectiveAnchorMs + Math.max(0, realNow - clock.realAnchorMs) * clock.rate;
  if (!safeTime(now)) throw invalid();
  return { rate: clock.rate, clockRevision: clock.revision, realNow, now, offsetSeconds: Math.max(0, (now - realNow) / 1000) };
}

export function changeDevAccountClock(saved, operation, realNow) {
  const clock = normalizeDevAccountClock(saved, realNow);
  if (!operation || typeof operation.requestId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(operation.requestId)) throw invalid();
  const hasRate = Object.hasOwn(operation, 'rate'), hasSeconds = Object.hasOwn(operation, 'seconds');
  if (hasRate === hasSeconds || hasRate && !DEV_CLOCK_RATES.includes(operation.rate) || hasSeconds && (!Number.isSafeInteger(operation.seconds) || operation.seconds < 1 || operation.seconds > MAX_JUMP_SECONDS)) throw invalid();
  const previous = Object.hasOwn(clock.receipts, operation.requestId) ? clock.receipts[operation.requestId] : null;
  if (previous) {
    if (hasRate ? previous.kind !== 'rate' || previous.rate !== operation.rate : previous.seconds !== operation.seconds || previous.kind === 'rate') throw Object.assign(new Error('DEV clock request was reused.'), { code: 'request-reused', status: 409 });
    return { clock, alreadyApplied: true, advancedSeconds: 0 };
  }
  const at = Math.max(realNow, clock.realAnchorMs);
  const effectiveAnchorMs = devAccountClockStatus(clock, at).now + (hasSeconds ? operation.seconds * 1000 : 0);
  if (!safeTime(effectiveAnchorMs) || !Number.isSafeInteger(clock.revision + 1)) throw invalid();
  const receipts = Object.assign(Object.create(null), clock.receipts);
  receipts[operation.requestId] = hasRate ? { kind: 'rate', rate: operation.rate, at } : { seconds: operation.seconds, at };
  const ids = Object.keys(receipts);
  for (const id of ids.slice(0, Math.max(0, ids.length - 1000))) delete receipts[id];
  return { clock: { schema: 2, realAnchorMs: at, effectiveAnchorMs, rate: hasRate ? operation.rate : clock.rate, revision: clock.revision + 1, receipts }, alreadyApplied: false, advancedSeconds: hasSeconds ? operation.seconds : 0 };
}
