// UID-scoped DEV persistence. Firebase/Firestore remain responsible for identity
// and access control; this coordinator preserves a local copy on failed writes.
import { accountSaveKey } from './harborlight-dev-cloud.js?v=dev-accounts-v1';

export function createDevSync({ cloud, account, storage, saveKey, onStatus = () => {},
  schedule = (callback, delay) => setTimeout(callback, delay), cancel = handle => clearTimeout(handle),
  delay = 20000, retryDelay = 60000 } = {}) {
  if (!account?.uid || !cloud || saveKey !== accountSaveKey(account.uid)) throw new Error('A DEV account and its own save key are required.');
  const metaKey = `${saveKey}:cloud`, backupKey = `${saveKey}:backup`;
  let version = null, pending = null, savedPayload = null, timer = null, inFlight = null;
  let stopped = false, disposed = false, status = 'loading';
  const emit = value => { status = value; onStatus(value); };
  const read = key => { try { return storage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { storage.setItem(key, value); return true; } catch { return false; } };
  const validVersion = value => value && Number.isSafeInteger(value.revision) && value.revision > 0 && typeof value.updateTime === 'string';
  const sameVersion = (first, second) => first === null && second === null || !!first && !!second &&
    first.revision === second.revision && first.updateTime === second.updateTime;
  const persist = () => write(metaKey, JSON.stringify({ uid: account.uid, version, pending: pending !== null }));
  const backup = payload => { if (payload !== null) write(backupKey, payload); };
  const clearTimer = () => { if (timer !== null) cancel(timer); timer = null; };
  const later = wait => {
    if (timer === null && !disposed && !stopped && pending !== null) timer = schedule(() => {
      timer = null;
      void flush();
    }, wait);
  };

  async function open(initialPayload) {
    if (typeof initialPayload !== 'string') throw new Error('The starter island must be serialized.');
    const cached = read(saveKey);
    let metadata;
    try { metadata = JSON.parse(read(metaKey)); } catch { /* Missing or damaged cache metadata is not authority. */ }
    const known = metadata?.uid === account.uid;
    version = known && validVersion(metadata.version) ? metadata.version : null;
    const wasPending = known && metadata.pending === true && cached !== null;
    emit('loading');
    try {
      const remote = await cloud.loadIsland();
      const remoteVersion = remote?.version || null;
      if (wasPending && !sameVersion(version, remoteVersion) || !remote && version !== null) {
        pending = cached;
        backup(cached);
        stopped = true;
        emit('conflict');
        return cached ?? initialPayload;
      }
      version = remoteVersion;
      savedPayload = remote?.payload ?? null;
      const selected = wasPending ? cached : remote?.payload ?? cached ?? initialPayload;
      // Keep uncommitted data recoverable if an old, unversioned cache and a
      // cloud island both exist (for example after clearing only metadata).
      if (!wasPending && cached !== null && remote && cached !== remote.payload) backup(cached);
      pending = selected !== savedPayload ? selected : null;
      write(saveKey, selected);
      persist();
      emit(pending === null ? 'saved' : 'pending');
      later(delay);
      return selected;
    } catch (error) {
      pending = cached ?? initialPayload;
      write(saveKey, pending);
      persist();
      stopped = ['auth-required', 'permission', 'configuration', 'invalid-cloud-data'].includes(error?.code);
      emit(stopped ? error.code : 'offline');
      later(retryDelay);
      return pending;
    }
  }

  function queue(payload) {
    if (disposed || typeof payload !== 'string') return;
    write(saveKey, payload);
    pending = payload === savedPayload && !inFlight ? null : payload;
    persist();
    if (stopped) { backup(payload); return; }
    if (pending === null) { emit('saved'); return; }
    if (status !== 'offline' && status !== 'saving') emit('pending');
    later(delay); // The timer is not restarted by continuous gameplay.
  }

  async function flush() {
    if (disposed || stopped) return false;
    if (inFlight) {
      await inFlight;
      if (disposed || stopped || status === 'offline') return false;
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
        persist();
        emit(pending === null ? 'saved' : 'pending');
        later(delay);
        return pending === null;
      } catch (error) {
        persist();
        backup(pending);
        const code = error?.code;
        stopped = ['conflict', 'auth-required', 'permission', 'configuration', 'invalid-state', 'invalid-cloud-data'].includes(code);
        emit(stopped ? code : 'offline');
        later(retryDelay);
        return false;
      } finally { inFlight = null; }
    });
    return inFlight;
  }

  async function reloadCloud() {
    // Explicit recovery always keeps the current island before replacing it.
    if (inFlight) await inFlight;
    const remote = await cloud.loadIsland();
    if (!remote) throw Object.assign(new Error('Nie znaleziono zapisu w chmurze.'), { code: 'missing-save' });
    backup(pending ?? read(saveKey));
    clearTimer();
    version = remote.version;
    pending = null;
    savedPayload = remote.payload;
    stopped = false;
    write(saveKey, remote.payload);
    persist();
    emit('saved');
    return remote.payload;
  }

  return { open, queue, flush, reloadCloud, get status() { return status; },
    get pending() { return pending !== null; },
    pause(code = 'invalid-save') { stopped = true; clearTimer(); backup(pending ?? read(saveKey)); emit(code); },
    dispose() { disposed = true; clearTimer(); } };
}
