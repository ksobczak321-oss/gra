// Protection for a known, foreground cloud interruption. Ordinary absence never
// creates a snapshot. This module only moves matching accepted clocks; it does
// not advance the world, grant rewards, spend money or adopt a foreign save.
import { pauseAdventureFor } from './harborlight-v1-adventures.js?v=frontend-v31-2';

const MAX_SECONDS = 31 * 24 * 3600;
const MAX_RECEIPTS = 128;
const validTime = value => Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
const whole = value => Number.isSafeInteger(value) && value > 0 ? value : 1;
const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
let sequence = 0;

function identity(state) {
  return {
    islandId: typeof state?.islandId === 'string' ? state.islandId : 'island-1',
    generation: whole(state?.islandGeneration),
    startedAt: validTime(state?.welcome?.startedAt) ? state.welcome.startedAt : null
  };
}

export function normalizeInterruptions(state, raw = state) {
  const receipts = [], seen = new Set();
  const source = raw?.knownInterruptions?.version === 1 && Array.isArray(raw.knownInterruptions.receipts) ? raw.knownInterruptions.receipts : [];
  for (const item of source.slice(-MAX_RECEIPTS)) {
    if (!isRecord(item) || typeof item.id !== 'string' || item.id.length > 180 || !item.id.startsWith('interruption:') || seen.has(item.id) ||
      !validTime(item.atMs) || !validTime(item.resumedMs) || item.resumedMs < item.atMs || !Number.isFinite(item.seconds) || item.seconds < 0 || item.seconds > MAX_SECONDS) continue;
    seen.add(item.id); receipts.push({ id: item.id, atMs: item.atMs, resumedMs: item.resumedMs, seconds: item.seconds });
  }
  state.knownInterruptions = { version: 1, receipts };
  return state.knownInterruptions;
}

export function captureInterruption(state, atMs = Date.now()) {
  if (!isRecord(state) || !validTime(atMs)) return null;
  const world = identity(state);
  const snapshot = { version: 1, id: `interruption:${world.islandId}:${world.generation}:${atMs}:${++sequence}`, atMs, world };
  const missions = state.lighthouseMissions, frame = missions?.stack?.at(-1), mission = frame?.task;
  if (mission?.status === 'active' && validTime(mission.deadline) && validTime(mission.acceptedAt)) {
    snapshot.mission = { chapterId: missions.chapter?.id ?? null, id: mission.id, attempt: mission.attempt ?? 0, acceptedAt: mission.acceptedAt };
  }
  const task = (state.lighthouseTasks || []).find(item => item.id === state.activeTaskId && validTime(item.acceptedAt) && validTime(item.expiresAt));
  if (task) snapshot.task = { id: task.id, acceptedAt: task.acceptedAt };
  const run = state.expeditionRuns?.[state.activeExpeditionId];
  if (run && ['active', 'decision'].includes(run.status) && typeof run.id === 'string') {
    snapshot.expedition = { expedition: state.activeExpeditionId, id: run.id, level: run.level, seed: run.miniGame?.seed ?? null };
  }
  const adventure = state.adventures?.active;
  if (adventure && adventure.stage !== 'complete' && typeof adventure.id === 'string') {
    snapshot.adventure = { id: adventure.id, kind: adventure.kind, seed: adventure.seed };
  }
  return snapshot;
}

function addTimestamp(object, key, amount) {
  if (validTime(object?.[key]) && object[key] + amount <= Number.MAX_SAFE_INTEGER) object[key] += amount;
}

export function applyInterruption(state, snapshot, resumedMs = Date.now(), { reason } = {}) {
  const none = code => ({ ok: false, code, seconds: 0 });
  if (reason !== 'recovered') return none('interruption-not-own-recovery');
  if (!isRecord(state) || snapshot?.version !== 1 || typeof snapshot.id !== 'string' || !snapshot.id.startsWith('interruption:') ||
    snapshot.id.length > 180 || !validTime(snapshot.atMs) || !validTime(resumedMs) || !isRecord(snapshot.world)) return none('invalid-interruption');
  const world = identity(state);
  if (world.islandId !== snapshot.world.islandId || world.generation !== snapshot.world.generation || world.startedAt !== snapshot.world.startedAt) return none('interruption-world-changed');
  const existing = state.knownInterruptions?.version === 1 ? state.knownInterruptions.receipts : [];
  if (Array.isArray(existing) && existing.some(receipt => receipt.id === snapshot.id)) return { ok: true, duplicate: true, seconds: 0 };
  const anchor = validTime(state.lastSimulatedAt) ? Math.max(snapshot.atMs, state.lastSimulatedAt) : snapshot.atMs;
  const seconds = Math.max(0, resumedMs - anchor) / 1000;
  if (seconds > MAX_SECONDS) return none('interruption-too-long');
  const changed = { mission: false, task: false, expedition: false, adventure: false };
  if (seconds > 0) {
    const mission = state.lighthouseMissions?.stack?.at(-1)?.task, expected = snapshot.mission;
    if (expected && state.lighthouseMissions.chapter?.id === expected.chapterId && mission?.id === expected.id &&
      mission.status === 'active' && mission.acceptedAt === expected.acceptedAt && (mission.attempt ?? 0) === expected.attempt && validTime(mission.deadline)) {
      addTimestamp(mission, 'deadline', seconds * 1000); changed.mission = true;
    }
    const task = (state.lighthouseTasks || []).find(item => item.id === state.activeTaskId && item.id === snapshot.task?.id && item.acceptedAt === snapshot.task.acceptedAt);
    if (task && validTime(task.expiresAt) && (task.knownPauseSeconds || 0) + seconds <= MAX_SECONDS) {
      addTimestamp(task, 'expiresAt', seconds); task.knownPauseSeconds = (task.knownPauseSeconds || 0) + seconds; changed.task = true;
    }
    const expectedRun = snapshot.expedition, run = state.expeditionRuns?.[expectedRun?.expedition];
    if (expectedRun && state.activeExpeditionId === expectedRun.expedition && run?.id === expectedRun.id && run.level === expectedRun.level &&
      (run.miniGame?.seed ?? null) === expectedRun.seed && ['active', 'decision'].includes(run.status) && (run.knownPauseRemaining || 0) + seconds <= MAX_SECONDS) {
      for (const key of ['roundStartedAt', 'startedAt', 'presencePromptAt', 'finishedAt']) addTimestamp(run, key, seconds);
      addTimestamp(state, 'lastMeaningfulActivityAt', seconds);
      for (const key of ['hideAt', 'nextShuffleAt']) addTimestamp(run.miniGame, key, seconds);
      run.knownPauseRemaining = (run.knownPauseRemaining || 0) + seconds; changed.expedition = true;
    }
    const adventure = state.adventures?.active, wanted = snapshot.adventure;
    if (wanted && adventure?.id === wanted.id && adventure.kind === wanted.kind && adventure.seed === wanted.seed && adventure.stage !== 'complete') {
      changed.adventure = pauseAdventureFor(state, wanted.id, seconds)?.ok === true;
    }
  }
  const ledger = normalizeInterruptions(state);
  ledger.receipts.push({ id: snapshot.id, atMs: snapshot.atMs, resumedMs, seconds });
  if (ledger.receipts.length > MAX_RECEIPTS) ledger.receipts.splice(0, ledger.receipts.length - MAX_RECEIPTS);
  return { ok: true, seconds, compensated: changed };
}

export const INTERRUPTION_RULES = Object.freeze({ maximumSeconds: MAX_SECONDS, maximumReceipts: MAX_RECEIPTS });
