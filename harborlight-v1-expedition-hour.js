// Account-wide expedition difficulty. A new series, another island or a reload
// cannot reset it; a completed UTC clock hour opens the next period.
export const EXPEDITION_HOUR_RULES = Object.freeze({ version: 1, seconds: 3600, maximumDifficulty: 1000000, maximumRoundReward: 800 });
const whole = (value, fallback = 0) => Number.isSafeInteger(value) && value >= 0 ? value : fallback;
const at = state => Math.max(0, Number.isFinite(state.worldTimeMs) ? state.worldTimeMs : (state.activityEpochMs || 0) + (state.activityClock || 0) * 1000);

export function normalizeExpeditionHour(state, raw = state) {
  const previous = state.expeditionHour;
  const nowHour = Math.floor(at(state) / 3600000), source = raw.expeditionHour;
  if (source?.version === 1 && whole(source.hourIndex, -1) >= nowHour) {
    const started = Math.min(EXPEDITION_HOUR_RULES.maximumDifficulty, whole(source.roundsStarted));
    state.expeditionHour = { version: 1, hourIndex: source.hourIndex, roundsStarted: started,
      nextDifficulty: Math.min(EXPEDITION_HOUR_RULES.maximumDifficulty, Math.max(started + 1, whole(source.nextDifficulty, 1))),
      reservations: Array.isArray(source.reservations) ? source.reservations.filter(row => typeof row?.id === 'string' && row.id.length <= 120 && Number.isSafeInteger(row.difficulty) && row.difficulty > 0 && row.difficulty <= EXPEDITION_HOUR_RULES.maximumDifficulty).slice(-128).map(row => ({ id: row.id, difficulty: row.difficulty })) : [] };
  } else state.expeditionHour = { version: 1, hourIndex: nowHour, roundsStarted: 0, nextDifficulty: 1, reservations: [] };
  if (previous?.version === 1 && previous !== state.expeditionHour) { Object.assign(previous, state.expeditionHour); state.expeditionHour = previous; }
  return state.expeditionHour;
}

function current(state) {
  const ledger = state.expeditionHour;
  return ledger?.version === 1 && ledger.hourIndex >= Math.floor(at(state) / 3600000) ? ledger : normalizeExpeditionHour(state);
}

export function reserveExpeditionDifficulty(state, roundId) {
  if (typeof roundId !== 'string' || !roundId || roundId.length > 120) throw new TypeError('A round identity is required.');
  const ledger = current(state), existing = ledger.reservations.find(row => row.id === roundId);
  if (existing) return existing.difficulty;
  const difficulty = Math.max(1, ledger.nextDifficulty);
  ledger.roundsStarted = Math.min(EXPEDITION_HOUR_RULES.maximumDifficulty, ledger.roundsStarted + 1);
  ledger.nextDifficulty = Math.min(EXPEDITION_HOUR_RULES.maximumDifficulty, difficulty + 1);
  ledger.reservations.push({ id: roundId, difficulty });
  ledger.reservations = ledger.reservations.slice(-128);
  return difficulty;
}

export function expeditionHourStatus(state) {
  const ledger = current(state);
  return { hourIndex: ledger.hourIndex, nextDifficulty: ledger.nextDifficulty, roundsStarted: ledger.roundsStarted,
    resetsAt: (ledger.hourIndex + 1) * 3600000, remaining: Math.max(0, ((ledger.hourIndex + 1) * 3600000 - at(state)) / 1000) };
}

export function cappedExpeditionReward(stage) {
  if (!Number.isSafeInteger(stage) || stage < 1 || stage > EXPEDITION_HOUR_RULES.maximumDifficulty) return null;
  return Math.min(EXPEDITION_HOUR_RULES.maximumRoundReward, 50 * 2 ** Math.min(4, stage - 1));
}
