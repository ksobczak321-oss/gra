// Foreground-time invitations and the independent real-time session timeout.
// The host supplies foreground seconds; background timers never create activity.
export const SESSION_IDLE_SECONDS = 30 * 60;
export const SESSION_WARNING_SECONDS = 30;
const EPS = 1e-7;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const positive = (value, fallback = 0) => finite(value) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, value)) : fallback;
const whole = (value, fallback = 0) => Math.floor(positive(value, fallback));
const nowOf = state => positive(state.worldTimeMs, positive(state.lastSimulatedAt));

function randomSeconds(schedule, minimum, maximum) {
  let seed = schedule.seed >>> 0 || 0x56c39ab1;
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  schedule.seed = seed >>> 0 || 1;
  return minimum + Math.floor(schedule.seed / 0x100000000 * (maximum - minimum + 1));
}
function nextWindow(schedule) {
  return schedule.completedChoices === 0 ? [300, 900] : schedule.completedChoices === 1 ? [2580, 3720] : [3600, 6000];
}
function armNext(schedule) {
  const [minimum, maximum] = nextWindow(schedule);
  schedule.nextAt = schedule.activeSeconds + randomSeconds(schedule, minimum, maximum);
}

export function normalizeEngagementSchedule(state, raw = state) {
  const source = raw?.engagementSchedule || {};
  const activeSeconds = positive(source.activeSeconds);
  const initialAnchored = source.initialAnchored === true;
  const schedule = {
    version: 1, seed: whole(source.seed, (nowOf(state) ^ 0x56c39ab1) >>> 0) >>> 0 || 1,
    activeSeconds, initialAnchored, completedChoices: whole(source.completedChoices),
    sequence: whole(source.sequence), initialCompleted: source.initialCompleted === true,
    initialPremiumBonusAvailable: source.initialPremiumBonusAvailable === true && source.initialBonusClaimed !== true,
    initialBonusClaimed: source.initialBonusClaimed === true,
    initialAt: finite(source.initialAt) && source.initialAt >= 240 && source.initialAt <= 480 ? source.initialAt : 0,
    nextAt: finite(source.nextAt) ? Math.max(activeSeconds, source.nextAt) : null,
    pending: null
  };
  if (!schedule.initialAt) schedule.initialAt = randomSeconds(schedule, 240, 480);
  const pending = source.pending;
  if (pending && ['initial-ad', 'choice'].includes(pending.kind) && typeof pending.id === 'string' && pending.id.length <= 100) {
    schedule.pending = { id: pending.id, kind: pending.kind, sequence: whole(pending.sequence),
      started: pending.started === true, choice: ['ad', 'minigame'].includes(pending.choice) ? pending.choice : null,
      runId: typeof pending.runId === 'string' && pending.runId.length <= 200 ? pending.runId : null };
  }
  if (initialAnchored && schedule.nextAt === null && !schedule.pending) armNext(schedule);
  state.engagementSchedule = schedule;
  return schedule;
}
function ensure(state) {
  return state.engagementSchedule?.version === 1 ? state.engagementSchedule : normalizeEngagementSchedule(state);
}
function pendingOffer(schedule, kind) {
  schedule.sequence++;
  schedule.pending = { id: `engagement-${schedule.sequence}`, kind, sequence: schedule.sequence, started: false, choice: null, runId: null };
}
function settle(schedule, premium) {
  if (!schedule.initialCompleted && !schedule.pending && schedule.activeSeconds >= schedule.initialAt - EPS) {
    if (premium) {
      // Premium does not see the initial advertisement. Its invitation clock
      // starts at the original randomized deadline, exactly once.
      schedule.initialCompleted = true;
      schedule.initialAnchored = true;
      schedule.initialPremiumBonusAvailable = true;
      const [minimum, maximum] = nextWindow(schedule);
      schedule.nextAt = schedule.initialAt + randomSeconds(schedule, minimum, maximum);
    } else pendingOffer(schedule, 'initial-ad');
  }
  if (schedule.initialAnchored && !schedule.pending && schedule.nextAt !== null && schedule.activeSeconds >= schedule.nextAt - EPS) {
    pendingOffer(schedule, 'choice');
    schedule.nextAt = null;
  }
}

export function advanceEngagementSchedule(state, seconds, { visible = false, focused = false, premium = false } = {}) {
  const schedule = ensure(state);
  if (state?.onboarding?.version === 1 && state.onboarding.worldStartedAt === null && ['intro', 'name', 'tour'].includes(state.onboarding.stage)) return engagementOfferStatus(state);
  if (!finite(seconds) || seconds < 0) return engagementOfferStatus(state);
  if (visible && focused) schedule.activeSeconds = Math.min(Number.MAX_SAFE_INTEGER, schedule.activeSeconds + seconds);
  settle(schedule, premium === true);
  return engagementOfferStatus(state);
}

export function engagementOfferStatus(state) {
  const schedule = ensure(state), pending = schedule.pending;
  const deadline = schedule.initialCompleted ? schedule.nextAt : schedule.initialAt;
  return { pending: !!pending, id: pending?.id || null, kind: pending?.kind || null,
    sequence: pending?.sequence || schedule.sequence, started: pending?.started === true, choice: pending?.choice || null, runId: pending?.runId || null,
    activeSeconds: schedule.activeSeconds, completedChoices: schedule.completedChoices,
    initialBonusAvailable: schedule.initialPremiumBonusAvailable && !schedule.initialBonusClaimed,
    nextIn: pending ? 0 : deadline === null ? null : Math.max(0, deadline - schedule.activeSeconds) };
}

export function startEngagementOffer(state, id, choice) {
  const schedule = ensure(state), pending = schedule.pending;
  if (!pending || pending.id !== id || pending.started || !['ad', 'minigame'].includes(choice) || pending.kind === 'initial-ad' && choice !== 'ad') return false;
  pending.started = true; pending.choice = choice;
  return true;
}

export function bindEngagementRun(state, id, runId) {
  const pending = ensure(state).pending;
  if (!pending || pending.id !== id || !pending.started || pending.choice !== 'minigame' || typeof runId !== 'string' || !runId || runId.length > 200) return false;
  if (pending.runId && pending.runId !== runId) return false;
  pending.runId = runId;
  return true;
}

export function resetEngagementOffer(state, id) {
  const pending = ensure(state).pending;
  if (!pending || pending.id !== id || pending.runId) return false;
  pending.started = false;
  pending.choice = null;
  return true;
}

export function claimInitialPremiumBonus(state) {
  const schedule = ensure(state);
  if (!schedule.initialPremiumBonusAvailable || schedule.initialBonusClaimed) return false;
  schedule.initialBonusClaimed = true;
  schedule.initialPremiumBonusAvailable = false;
  return true;
}

export function completeEngagementOffer(state, { id, choice = null } = {}) {
  const schedule = ensure(state), pending = schedule.pending;
  if (!pending || pending.id !== id || choice !== null && !['ad', 'minigame', 'skip'].includes(choice)) return false;
  // A choice activity is completed only after the host explicitly started it;
  // opening or closing its invitation cannot advance the later schedule.
  if (pending.kind === 'choice' && !pending.started) return false;
  if (pending.kind === 'choice' && choice !== null && choice !== pending.choice) return false;
  if (pending.kind === 'initial-ad') {
    schedule.initialCompleted = true;
    if (!schedule.initialAnchored) { schedule.initialAnchored = true; armNext(schedule); }
  } else {
    schedule.completedChoices++;
    armNext(schedule);
  }
  schedule.pending = null;
  return true;
}

export function idleSessionStatus(state, now = nowOf(state), { sessionStartedAt = null } = {}) {
  const engagement = state.engagement || {};
  const anchor = Math.max(positive(engagement.lastRealActivityAt, positive(engagement.firstAnchorAt, nowOf(state))), positive(sessionStartedAt));
  const idleSeconds = Math.max(0, (positive(now, nowOf(state)) - anchor) / 1000);
  return { idleSeconds, warning: idleSeconds >= SESSION_IDLE_SECONDS,
    remaining: Math.max(0, SESSION_IDLE_SECONDS + SESSION_WARNING_SECONDS - idleSeconds),
    shouldLogout: idleSeconds >= SESSION_IDLE_SECONDS + SESSION_WARNING_SECONDS };
}
