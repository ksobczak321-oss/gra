// Cloud-only island persistence. Authentication storage is separate; this
// coordinator never reads or writes an island in browser storage.
import { accountSaveKey } from './harborlight-dev-cloud.js?v=frontend-v24';

export const CLOUD_AUTOSAVE_MS = 30_000;
const RETRY_MIN_MS = 5_000, RETRY_MAX_MS = 30_000;
const recoverable = code => ['offline', 'rate-limited', 'conflict'].includes(code);
const sameVersion = (a, b) => a === b || !!a && !!b && a.revision === b.revision && a.updateTime === b.updateTime;

export function createDevSync({ cloud, account, saveKey, onStatus = () => {}, onRestore = () => {},
  schedule = (callback, delay) => setTimeout(callback, delay), cancel = handle => clearTimeout(handle),
  delay = CLOUD_AUTOSAVE_MS } = {}) {
  if (!account?.uid || !cloud || saveKey !== accountSaveKey(account.uid, cloud.projectId)) throw new Error('An authenticated account and its own save key are required.');
  let version = null, pending = null, savedPayload = null, timer = null, inFlight = null, recovering = null;
  let stopped = false, disposed = false, status = 'loading', retryDelay = RETRY_MIN_MS, failedSnapshot = null;
  const emit = value => { status = value; onStatus(value); };
  const clearTimer = () => { if (timer !== null) cancel(timer); timer = null; };
  const later = () => {
    if (timer === null && !disposed && !stopped && pending !== null) timer = schedule(() => {
      timer = null; void flush();
    }, delay);
  };
  const retryLater = () => {
    if (timer !== null || disposed || !stopped || !recoverable(status)) return;
    timer = schedule(() => { timer = null; void recover(); }, retryDelay);
    retryDelay = Math.min(RETRY_MAX_MS, retryDelay * 2);
  };
  function stop(error) {
    stopped = true; clearTimer(); emit(error?.code || 'offline'); retryLater();
  }
  function restored(payload, reason) {
    // The UI may have rolled back to the last confirmed state while paused.
    // Restore the exact reconciled snapshot before accepting any new command.
    onRestore(payload, { reason });
  }
  async function open(initialPayload) {
    if (typeof initialPayload !== 'string') throw new Error('The starter island must be serialized.');
    clearTimer(); emit('loading');
    try {
      let remote = await cloud.loadIsland();
      if (!remote && cloud.accountStatus?.expired) throw Object.assign(new Error('This island expired after three months without play.'), { code: 'island-expired' });
      if (!remote && (cloud.accountApiEnabled === true || cloud.environment === 'prod') && typeof cloud.createIsland === 'function') remote = await cloud.createIsland();
      version = remote?.version || null;
      savedPayload = remote?.payload ?? null;
      pending = remote ? null : initialPayload;
      stopped = false; failedSnapshot = null;
      if (!remote && !await flush()) throw Object.assign(new Error('The starter island could not be confirmed in the cloud.'), { code: status });
      retryDelay = RETRY_MIN_MS; emit('saved');
      return savedPayload;
    } catch (error) {
      // Opening is retried by the startup screen, never in a background task
      // that could allow a new world to replace an unread existing island.
      pending = null; failedSnapshot = null; stopped = true; clearTimer();
      emit(error?.code || 'offline');
      throw error;
    }
  }
  function queue(payload) {
    if (disposed || stopped || recovering || typeof payload !== 'string') return false;
    pending = payload === savedPayload && !inFlight ? null : payload;
    if (pending === null) emit('saved');
    else { if (status !== 'saving') emit('pending'); later(); }
    return true;
  }
  async function flush() {
    if (disposed || stopped || recovering) return false;
    if (inFlight) {
      await inFlight;
      if (disposed || stopped) return false;
      return pending === null ? true : flush();
    }
    if (pending === null) return true;
    clearTimer();
    const snapshot = pending;
    emit('saving');
    inFlight = Promise.resolve().then(async () => {
      try {
        const committedVersion = await cloud.saveIsland(snapshot, version);
        if (disposed) return false;
        version = committedVersion;
        savedPayload = snapshot;
        if (pending === snapshot) pending = null;
        failedSnapshot = null; retryDelay = RETRY_MIN_MS;
        // A parallel activity request may have paused this coordinator while
        // the write was in flight. Its success cannot silently clear that
        // failure or leave a stopped coordinator with a misleading saved UI.
        if (stopped) { retryLater(); return false; }
        emit(pending === null ? 'saved' : 'pending');
        later();
        return pending === null;
      } catch (error) {
        // Keep the uncertain write in memory only. A lost HTTP response can
        // mean the server committed it; recovery must read before any retry.
        failedSnapshot = snapshot; stop(error);
        return false;
      } finally { inFlight = null; }
    });
    return inFlight;
  }
  async function recover() {
    if (disposed) return false;
    if (recovering) return recovering;
    if (!stopped) return flush();
    if (!recoverable(status)) return false;
    clearTimer();
    recovering = Promise.resolve().then(async () => {
      if (inFlight) await inFlight;
      try {
        const remote = await cloud.loadIsland();
        if (disposed) return false;
        if (!remote) throw Object.assign(new Error('The existing cloud island is missing.'), { code: cloud.accountStatus?.expired ? 'island-expired' : 'missing-save' });
        const committed = failedSnapshot !== null && remote.payload === failedSnapshot &&
          remote.version?.revision === (version?.revision ?? 0) + 1;
        const unchanged = sameVersion(remote.version, version) && remote.payload === savedPayload;
        const reason = !unchanged && !committed ? 'conflict' : 'recovered';
        version = remote.version;
        savedPayload = remote.payload;
        if (!unchanged && !committed || pending === savedPayload) pending = null;
        if (pending !== null) {
          // A safe CAS retry is allowed only after the server confirms the
          // previous version or the exact uncertain commit. Never overwrite
          // another tab's newer state, including a newer identical payload.
          const snapshot = pending;
          failedSnapshot = snapshot;
          version = await cloud.saveIsland(snapshot, version);
          if (disposed) return false;
          savedPayload = snapshot; pending = null;
        }
        failedSnapshot = null;
        restored(savedPayload, reason);
        stopped = false; retryDelay = RETRY_MIN_MS; emit('saved');
        return true;
      } catch (error) {
        if (!disposed) stop(error);
        return false;
      } finally { recovering = null; }
    });
    return recovering;
  }
  async function reloadCloud() {
    if (recovering) await recovering;
    if (inFlight) await inFlight;
    clearTimer(); emit('loading');
    try {
      const remote = await cloud.loadIsland();
      if (!remote) throw Object.assign(new Error('Nie znaleziono zapisu w chmurze.'), { code: cloud.accountStatus?.expired ? 'island-expired' : 'missing-save' });
      version = remote.version; pending = null; failedSnapshot = null; savedPayload = remote.payload;
      stopped = false; retryDelay = RETRY_MIN_MS; emit('saved'); return savedPayload;
    } catch (error) { stop(error); throw error; }
  }
  return { open, queue, flush, recover, reloadCloud,
    get version() { return version ? { ...version } : null; },
    get status() { return status; }, get pending() { return pending !== null; },
    get writable() { return !stopped && !disposed && !recovering && status !== 'loading'; },
    get confirmedPayload() { return savedPayload; },
    pause(code = 'invalid-save') { pending = null; failedSnapshot = null; stop({ code }); },
    dispose() { disposed = true; clearTimer(); pending = null; } };
}
