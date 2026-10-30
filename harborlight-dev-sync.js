// Cloud-only island persistence. Authentication storage is separate; this
// coordinator never reads or writes an island in browser storage.
import { accountSaveKey } from './harborlight-dev-cloud.js?v=frontend-v18';

export function createDevSync({ cloud, account, saveKey, onStatus = () => {},
  schedule = (callback, delay) => setTimeout(callback, delay), cancel = handle => clearTimeout(handle),
  delay = 20000 } = {}) {
  if (!account?.uid || !cloud || saveKey !== accountSaveKey(account.uid, cloud.projectId)) throw new Error('An authenticated account and its own save key are required.');
  let version = null, pending = null, savedPayload = null, timer = null, inFlight = null;
  let stopped = false, disposed = false, status = 'loading';
  const emit = value => { status = value; onStatus(value); };
  const clearTimer = () => { if (timer !== null) cancel(timer); timer = null; };
  const later = () => {
    if (timer === null && !disposed && !stopped && pending !== null) timer = schedule(() => {
      timer = null; void flush();
    }, delay);
  };
  async function open(initialPayload) {
    if (typeof initialPayload !== 'string') throw new Error('The starter island must be serialized.');
    emit('loading');
    try {
      let remote = await cloud.loadIsland();
      if (!remote && cloud.accountStatus?.expired) throw Object.assign(new Error('This island expired after three months without play.'), { code: 'island-expired' });
      if (!remote && (cloud.accountApiEnabled === true || cloud.environment === 'prod') && typeof cloud.createIsland === 'function') remote = await cloud.createIsland();
      version = remote?.version || null;
      savedPayload = remote?.payload ?? null;
      pending = remote ? null : initialPayload;
      stopped = false;
      if (!remote && !await flush()) throw Object.assign(new Error('The starter island could not be confirmed in the cloud.'), { code: status });
      emit('saved');
      return savedPayload;
    } catch (error) {
      pending = null; stopped = true;
      emit(error?.code || 'offline');
      throw error;
    }
  }
  function queue(payload) {
    if (disposed || stopped || typeof payload !== 'string') return false;
    pending = payload === savedPayload && !inFlight ? null : payload;
    if (pending === null) emit('saved');
    else { if (status !== 'saving') emit('pending'); later(); }
    return true;
  }
  async function flush() {
    if (disposed || stopped) return false;
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
        version = await cloud.saveIsland(snapshot, version);
        savedPayload = snapshot;
        if (pending === snapshot) pending = null;
        emit(pending === null ? 'saved' : 'pending');
        later();
        return pending === null;
      } catch (error) {
        // A response may have been lost after a successful server commit.
        // Never blindly retry or keep accepting local gameplay.
        pending = null; stopped = true; clearTimer();
        emit(error?.code || 'offline');
        return false;
      } finally { inFlight = null; }
    });
    return inFlight;
  }
  async function reloadCloud() {
    if (inFlight) await inFlight;
    emit('loading');
    try {
      const remote = await cloud.loadIsland();
      if (!remote) throw Object.assign(new Error('Nie znaleziono zapisu w chmurze.'), { code: cloud.accountStatus?.expired ? 'island-expired' : 'missing-save' });
      clearTimer(); version = remote.version; pending = null; savedPayload = remote.payload;
      stopped = false; emit('saved'); return savedPayload;
    } catch (error) { stopped = true; emit(error?.code || 'offline'); throw error; }
  }
  return { open, queue, flush, reloadCloud,
    get status() { return status; }, get pending() { return pending !== null; },
    get writable() { return !stopped && !disposed && status !== 'loading'; },
    get confirmedPayload() { return savedPayload; },
    pause(code = 'invalid-save') { stopped = true; clearTimer(); pending = null; emit(code); },
    dispose() { disposed = true; clearTimer(); pending = null; } };
}
