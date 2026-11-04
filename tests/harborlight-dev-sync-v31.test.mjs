import test from 'node:test';
import assert from 'node:assert/strict';
import { createDevSync } from '../harborlight-dev-sync.js';

const account = { uid: 'dev-admin1' };
const saveKey = 'harborlight-dev-island-dev-admin1';
const version = revision => ({ revision, updateTime: `2026-11-04T12:00:0${revision}.000001Z` });
const payload = coins => JSON.stringify({ resources: { coins } });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

function fixture({ load, save, restore } = {}) {
  let remote = { payload: payload(100), version: version(1) }, reads = 0, writes = 0;
  const operations = [], restores = [], timers = new Map(); let sequence = 0;
  const sync = createDevSync({ account, saveKey,
    cloud: {
      loadIsland: async () => { reads++; operations.push(['read']); return load ? load({ remote, reads }) : remote; },
      saveIsland: async (snapshot, expected) => {
        writes++; operations.push(['write', snapshot, expected]);
        if (save) return save({ snapshot, expected, writes, remote, commit: result => { remote = result; } });
        remote = { payload: snapshot, version: version(expected.revision + 1) }; return remote.version;
      }
    },
    onRestore: (snapshot, context) => { restores.push({ snapshot, ...context }); restore?.(snapshot, context); },
    schedule: (callback, delay) => { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
    cancel: id => timers.delete(id)
  });
  return { sync, operations, restores, timers, setRemote: value => { remote = value; }, get reads() { return reads; }, get writes() { return writes; } };
}

test('new scene snapshots coalesce during an in-flight ACK without restoring an older local state', async () => {
  const gate = deferred(); let local = payload(100);
  const f = fixture({ save: async ({ snapshot, expected, writes, commit }) => {
    if (writes === 1) await gate.promise;
    const result = { payload: snapshot, version: version(expected.revision + 1) }; commit(result); return result.version;
  }, restore: snapshot => { local = snapshot; } });
  await f.sync.open(local);
  local = payload(99); f.sync.queue(local); const first = f.sync.flush(); await nextTurn();
  assert.equal(f.sync.saving, true);
  assert.equal(f.sync.writable, true, 'the coordinator can accept a newer serialized scene while the previous ACK is pending');
  assert.equal(f.sync.hasUnconfirmedChanges, true);
  local = payload(98); assert.equal(f.sync.queue(local), true);
  local = payload(97); assert.equal(f.sync.queue(local), true);
  gate.resolve(); assert.equal(await first, false, 'a newer snapshot is still dirty');
  assert.equal(local, payload(97));
  assert.deepEqual(f.restores, [], 'an old ACK must never roll back the live scene');
  assert.equal(f.sync.confirmedPayload, payload(99));
  assert.equal(await f.sync.flush(), true);
  assert.deepEqual(f.operations.filter(([kind]) => kind === 'write').map(([, snapshot, expected]) => [snapshot, expected.revision]), [[payload(99), 1], [payload(97), 2]]);
  assert.equal(f.sync.hasUnconfirmedChanges, false);
  f.sync.dispose();
});

test('a lost ACK reconciles its exact commit before writing a newer coalesced scene once', async () => {
  const gate = deferred();
  const f = fixture({ save: async ({ snapshot, expected, writes, commit }) => {
    if (writes === 1) {
      await gate.promise; commit({ payload: snapshot, version: version(2) });
      throw Object.assign(new Error('lost ACK'), { code: 'offline' });
    }
    assert.equal(expected.revision, 2);
    commit({ payload: snapshot, version: version(3) }); return version(3);
  } });
  await f.sync.open(payload(100)); f.sync.queue(payload(99)); const first = f.sync.flush(); await nextTurn();
  f.sync.queue(payload(97)); gate.resolve(); assert.equal(await first, false);
  assert.equal(f.sync.writable, false);
  assert.equal(await f.sync.recover(), true);
  assert.deepEqual(f.operations.map(([kind]) => kind), ['read', 'write', 'read', 'write']);
  assert.deepEqual(f.operations.filter(([kind]) => kind === 'write').map(([, snapshot]) => snapshot), [payload(99), payload(97)]);
  assert.deepEqual(f.restores, [{ snapshot: payload(97), reason: 'recovered' }]);
  assert.equal(f.sync.version.revision, 3);
  f.sync.dispose();
});

test('a foreign newer revision wins over unconfirmed scene input after a lost ACK', async () => {
  const gate = deferred();
  const f = fixture({ save: async ({ commit }) => {
    await gate.promise; commit({ payload: payload(777), version: version(4) });
    throw Object.assign(new Error('another tab won'), { code: 'conflict' });
  } });
  await f.sync.open(payload(100)); f.sync.queue(payload(99)); const first = f.sync.flush(); await nextTurn();
  f.sync.queue(payload(97)); gate.resolve(); await first;
  assert.equal(await f.sync.recover(), true);
  assert.equal(f.writes, 1, 'the losing tab cannot overwrite the newer server state');
  assert.deepEqual(f.restores, [{ snapshot: payload(777), reason: 'conflict' }]);
  assert.equal(f.sync.pending, false); f.sync.dispose();
});

test('explicit recovery of a rejected snapshot reads confirmed state without resending it', async () => {
  for (const code of ['invalid-state', 'second-island-locked', 'archipelago-island-loss', 'permission']) {
    const f = fixture({ save: async () => { throw Object.assign(new Error(code), { code }); } });
    await f.sync.open(payload(100)); f.sync.queue(payload(99)); await f.sync.flush();
    assert.equal(await f.sync.recover(), false, `${code}: a permanent rejection cannot become a blind retry`);
    assert.equal(f.reads, 1); assert.equal(f.writes, 1);
    assert.equal(await f.sync.recover({ reloadConfirmed: true }), true);
    assert.equal(f.reads, 2); assert.equal(f.writes, 1, `${code}: rejected data must not be resubmitted`);
    assert.deepEqual(f.restores, [{ snapshot: payload(100), reason: 'reloaded' }]);
    assert.equal(f.sync.writable, true); assert.equal(f.sync.hasUnconfirmedChanges, false);
    f.sync.dispose();
  }
});

test('an explicit confirmed reload stays read-only after its first read fails offline', async () => {
  const f = fixture({ load: ({ remote, reads }) => {
    if (reads === 2) throw Object.assign(new Error('offline'), { code: 'offline' });
    return remote;
  }, save: async () => { throw Object.assign(new Error('invalid state'), { code: 'invalid-state' }); } });
  await f.sync.open(payload(100)); f.sync.queue(payload(99)); await f.sync.flush();
  assert.equal(await f.sync.recover({ reloadConfirmed: true }), false);
  assert.equal(f.sync.writable, false); assert.equal(f.sync.queue(payload(98)), false);
  assert.equal(f.sync.hasUnconfirmedChanges, true, 'the uncertain snapshot is kept in memory until the read succeeds');
  assert.equal(await f.sync.recover(), true, 'the following automatic recovery continues the explicit read-only route');
  assert.equal(f.writes, 1);
  assert.deepEqual(f.restores, [{ snapshot: payload(100), reason: 'reloaded' }]);
  assert.equal(f.sync.writable, true); f.sync.dispose();
});

test('explicit reload while a write is pending waits for its outcome and discards only newer unconfirmed input', async () => {
  const gate = deferred();
  const f = fixture({ save: async ({ snapshot, commit }) => { await gate.promise; commit({ payload: snapshot, version: version(2) }); return version(2); } });
  await f.sync.open(payload(100)); f.sync.queue(payload(99)); const first = f.sync.flush(); await nextTurn();
  f.sync.queue(payload(97)); const reloading = f.sync.recover({ reloadConfirmed: true });
  assert.equal(f.sync.writable, false); assert.equal(f.sync.queue(payload(96)), false);
  gate.resolve(); await first; assert.equal(await reloading, true);
  assert.equal(f.writes, 1);
  assert.deepEqual(f.restores, [{ snapshot: payload(99), reason: 'reloaded' }]);
  assert.equal(f.sync.pending, false); assert.equal(f.sync.version.revision, 2); f.sync.dispose();
});

test('explicit reload arriving during an automatic retry performs a fresh read after the already-started write', async () => {
  const gate = deferred();
  const f = fixture({ save: async ({ snapshot, writes, commit }) => {
    if (writes === 1) throw Object.assign(new Error('offline'), { code: 'offline' });
    await gate.promise; commit({ payload: snapshot, version: version(2) }); return version(2);
  } });
  await f.sync.open(payload(100)); f.sync.queue(payload(99)); await f.sync.flush();
  const retry = f.sync.recover(); await nextTurn();
  assert.equal(f.writes, 2, 'an automatic safe retry was already sent before the explicit request');
  const reloading = f.sync.recover({ reloadConfirmed: true });
  gate.resolve(); assert.equal(await retry, true); assert.equal(await reloading, true);
  assert.equal(f.reads, 3, 'the explicit reload re-reads server truth after the existing retry');
  assert.deepEqual(f.restores, [{ snapshot: payload(99), reason: 'reloaded' }]);
  f.sync.dispose();
});

test('a missing confirmed island or failed authorization never unlocks explicit recovery', async () => {
  for (const code of ['missing-save', 'auth-required']) {
    const f = fixture({ load: ({ remote, reads }) => {
      if (reads === 1) return remote;
      if (code === 'missing-save') return null;
      throw Object.assign(new Error(code), { code });
    }, save: async () => { throw Object.assign(new Error('invalid state'), { code: 'invalid-state' }); } });
    await f.sync.open(payload(100)); f.sync.queue(payload(99)); await f.sync.flush();
    assert.equal(await f.sync.recover({ reloadConfirmed: true }), false);
    assert.equal(f.sync.status, code); assert.equal(f.sync.writable, false);
    assert.deepEqual(f.restores, []); assert.equal(f.writes, 1); f.sync.dispose();
  }
});

test('signing out during an explicit reload cannot restore the old account into the UI', async () => {
  const gate = deferred();
  const f = fixture({ load: async ({ remote, reads }) => { if (reads > 1) await gate.promise; return remote; } });
  await f.sync.open(payload(100)); f.sync.queue(payload(99));
  const reloading = f.sync.recover({ reloadConfirmed: true }); await nextTurn();
  f.sync.dispose(); gate.resolve(); assert.equal(await reloading, false);
  assert.equal(f.sync.writable, false); assert.deepEqual(f.restores, []); assert.equal(f.writes, 0);
});
