// Account-wide, per-variant difficulty. Only a settled win raises the counter.
// A reload, another island, or an unfinished attempt cannot reset its level.
export const EXPEDITION_HOUR_RULES = Object.freeze({ version: 2, seconds: 3600, maximumDifficulty: 1000000, maximumRoundReward: 800 });
const whole = (value, fallback = 0) => Number.isSafeInteger(value) && value >= 0 ? value : fallback;
const at = state => Math.max(0, Number.isFinite(state.worldTimeMs) ? state.worldTimeMs : (state.activityEpochMs || 0) + (state.activityClock || 0) * 1000);
const variantId = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,59}$/.test(value) ? value : 'legacy';
const cleanRows = rows => (Array.isArray(rows) ? rows : []).filter(row => typeof row?.id === 'string' && row.id.length > 0 && row.id.length <= 120 && Number.isSafeInteger(row.difficulty) && row.difficulty > 0 && row.difficulty <= EXPEDITION_HOUR_RULES.maximumDifficulty).slice(-256).map(row => ({ id: row.id, difficulty: row.difficulty, active: row.active === true }));
const cleanVariant = source => ({ failures: whole(source?.failures), wins: Math.min(EXPEDITION_HOUR_RULES.maximumDifficulty, whole(source?.wins)), roundsStarted: whole(source?.roundsStarted), reservations: cleanRows(source?.reservations), results: (Array.isArray(source?.results) ? source.results : []).filter(x => typeof x?.id === 'string' && ['won','lost','abandoned'].includes(x.outcome)).slice(-256).map(x => ({ id: x.id, outcome: x.outcome })) });
function legacyAliases(ledger) {
  const old = ledger.variants.legacy || (ledger.variants.legacy = cleanVariant());
  ledger.roundsStarted = old.roundsStarted;
  ledger.nextDifficulty = Math.min(EXPEDITION_HOUR_RULES.maximumDifficulty, old.wins + 1);
  ledger.reservations = old.reservations;
  return ledger;
}
export function normalizeExpeditionHour(state, raw = state) {
  const previous = state.expeditionHour, source = raw.expeditionHour;
  const nowHour = Math.floor(at(state) / 3600000);
  let ledger = { version: 2, hourIndex: nowHour, sequence: whole(source?.sequence), variants: {} };
  if (source?.version === 2 && source.variants && typeof source.variants === 'object') {
    ledger.hourIndex = Math.max(nowHour, whole(source.hourIndex, nowHour));
    for (const [id, value] of Object.entries(source.variants)) if (variantId(id) === id) {
      const item = cleanVariant(value);
      if (whole(source.hourIndex, nowHour) < nowHour) { item.wins = 0; item.roundsStarted = 0; }
      ledger.variants[id] = item;
    }
  } else if (source?.version === 1) {
    // v31 counted starts. They are not evidence of wins and cannot become wins.
    ledger.variants.legacy = cleanVariant({ reservations: source.reservations, roundsStarted: source.roundsStarted });
  }
  legacyAliases(ledger);
  if (previous && typeof previous === 'object') { Object.assign(previous, ledger); ledger = previous; }
  state.expeditionHour = ledger;
  return ledger;
}
function current(state) {
  const ledger = state.expeditionHour;
  return ledger?.version === 2 && ledger.hourIndex >= Math.floor(at(state) / 3600000) ? ledger : normalizeExpeditionHour(state);
}
function itemFor(state, variant) {
  const ledger = current(state), id = variantId(variant);
  return { ledger, item: ledger.variants[id] || (ledger.variants[id] = cleanVariant()), id };
}
export function allocateExpeditionAttemptId(state, variant='legacy') {
  const ledger=current(state);ledger.sequence=whole(ledger.sequence)+1;
  return `attempt:${variantId(variant)}:${ledger.sequence}:${Math.floor(at(state))}`;
}
export function reserveExpeditionDifficulty(state, roundId, variant = 'legacy') {
  if (typeof roundId !== 'string' || !roundId || roundId.length > 120) throw new TypeError('A round identity is required.');
  const { ledger, item } = itemFor(state, variant);
  const existing = item.reservations.find(row => row.id === roundId);
  if (existing) return existing.difficulty;
  if (item.results.some(row => row.id === roundId)) { const error = new Error('This attempt has already ended.'); error.code = 'attempt-already-ended'; throw error; }
  const active = item.reservations.find(row => row.active);
  if (active) { const error = new Error('Only one attempt of this variant may be active.'); error.code = 'active-round-exists'; throw error; }
  const difficulty = Math.min(EXPEDITION_HOUR_RULES.maximumDifficulty, item.wins + 1);
  item.roundsStarted++;
  item.reservations.push({ id: roundId, difficulty, active: true });
  item.reservations = item.reservations.slice(-256);
  legacyAliases(ledger);
  return difficulty;
}
export function recordExpeditionOutcome(state, roundId, outcome = 'won', variant = 'legacy') {
  if (!['won','lost','abandoned'].includes(outcome)) return false;
  const { ledger, item } = itemFor(state, variant);
  if (item.results.some(row => row.id === roundId)) return false;
  const row = item.reservations.find(row => row.id === roundId);
  if (!row) return false;
  row.active = false;
  item.results.push({ id: roundId, outcome }); item.results = item.results.slice(-256);
  if (outcome === 'won') {item.wins = Math.min(EXPEDITION_HOUR_RULES.maximumDifficulty, item.wins + 1);item.failures=0;} else item.failures=whole(item.failures)+1;
  legacyAliases(ledger);
  return true;
}
export function expeditionHourStatus(state, variant = 'legacy') {
  const { ledger, item, id } = itemFor(state, variant);
  return { variant: id, hourIndex: ledger.hourIndex, wins: item.wins, failures: whole(item.failures), nextDifficulty: Math.min(EXPEDITION_HOUR_RULES.maximumDifficulty, item.wins + 1), roundsStarted: item.roundsStarted, activeRoundId: item.reservations.find(row => row.active)?.id || null,
    resetsAt: (ledger.hourIndex + 1) * 3600000, remaining: Math.max(0, ((ledger.hourIndex + 1) * 3600000 - at(state)) / 1000) };
}
export function cappedExpeditionReward(stage) {
  if (!Number.isSafeInteger(stage) || stage < 1 || stage > EXPEDITION_HOUR_RULES.maximumDifficulty) return null;
  return Math.min(EXPEDITION_HOUR_RULES.maximumRoundReward, 50 * 2 ** Math.min(4, stage - 1));
}
/** Reconcile restored island outcomes only after the account ledger is attached.
 * A daughter intentionally does not serialize another copy of the account data. */
export function reconcileExpeditionOutcomes(state) {
  const settle=(id,status,variant)=>{const outcome=['won','decision','closed'].includes(status)?'won':['lost','abandoned'].includes(status)?status:null;if(id&&outcome)recordExpeditionOutcome(state,id,outcome,variant);};
  for(const run of Object.values(state.expeditionRuns||{}))settle(run.roundIdentity,run.status,run.miniGame?.kind||'legacy');
  for(const a of Object.values(state.originalPuzzles?.attempts||{}))settle(a.id,a.status,a.variant);
  for(const run of[state.adventures?.active,...Object.values(state.adventures?.parked||{})].filter(Boolean)){for(const a of[run.data?.stageAttempt,run.data?.classicAttempt].filter(Boolean))settle(a.id,a.status,a.variant);}
  return current(state);
}
