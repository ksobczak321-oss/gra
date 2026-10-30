import test from 'node:test';
import assert from 'node:assert/strict';
import { createDevSync } from '../harborlight-dev-sync.js';

const A = { uid: 'dev-admin1', login: 'admin1' }, B = { uid: 'dev-admin2', login: 'admin2' };
const KEY = uid => `harborlight-dev-island-${uid}`;
const V1 = { revision: 1, updateTime: '2026-10-30T12:00:00.000001Z' };
const V2 = { revision: 2, updateTime: '2026-10-30T12:00:01.000002Z' };
const payload = coins => JSON.stringify({ resources: { coins } });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
function harness({ account = A, cache = storage(), remote = null, save, load } = {}) {
  const timers = new Map(), statuses = [], writes = [];
  let clock = 0;
  const sync = createDevSync({ account, saveKey: KEY(account.uid), storage: cache,
    cloud: { loadIsland: load || (async () => remote), saveIsland: save || (async (value, version) => {
      writes.push({ value, version }); return version ? V2 : V1;
    }) }, onStatus: value => statuses.push(value),
    schedule: (fn, delay) => { const id = ++clock; timers.set(id, { fn, delay }); return id; },
    cancel: id => timers.delete(id) });
  return { sync, cache, timers, statuses, writes };
}

test('new account starts separately and never imports a guest island or another account', async () => {
  const cache = storage({ 'harborlight-v1-new-player-save': payload(999), [KEY(B.uid)]: payload(888) });
  const first = harness({ cache });
  assert.equal(await first.sync.open(payload(100)), payload(100));
  assert.equal(await first.sync.flush(), true);
  assert.deepEqual(first.writes, [{ value: payload(100), version: null }]);
  const second = harness({ account: B, cache });
  assert.equal(await second.sync.open(payload(100)), payload(888));
  assert.equal(cache.getItem(KEY(A.uid)), payload(100));
  assert.equal(cache.getItem('harborlight-v1-new-player-save'), payload(999));
  assert.throws(() => createDevSync({ account: A, saveKey: KEY(B.uid), cloud: {}, storage: cache }));
});

test('a different device restores the cloud island before queued gameplay changes', async () => {
  const { sync, cache, writes } = harness({ remote: { payload: payload(321), version: V1 } });
  assert.equal(await sync.open(payload(100)), payload(321));
  assert.equal(sync.status, 'saved');
  assert.equal(writes.length, 0);
  sync.queue(payload(320));
  await sync.flush();
  assert.deepEqual(writes, [{ value: payload(320), version: V1 }]);
  assert.equal(cache.getItem(KEY(A.uid)), payload(320));
});

test('continuous activity schedules one bounded write using the newest snapshot', async () => {
  const { sync, timers, writes } = harness();
  await sync.open(payload(100));
  for (let i = 0; i < 50; i++) sync.queue(payload(i));
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 20000);
  [...timers.values()][0].fn();
  await sync.flush();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].value, payload(49));
});

test('network failure retains pending cache and retries with the same compare-and-swap version', async () => {
  let online = false;
  const calls = [];
  const { sync, cache, timers } = harness({ remote: { payload: payload(100), version: V1 }, save: async (value, version) => {
    calls.push({ value, version });
    if (!online) throw Object.assign(new Error('offline'), { code: 'offline' });
    return V2;
  } });
  await sync.open(payload(100)); sync.queue(payload(222));
  assert.equal(await sync.flush(), false);
  assert.equal(sync.status, 'offline');
  assert.equal(cache.getItem(KEY(A.uid)), payload(222));
  assert.equal(JSON.parse(cache.getItem(`${KEY(A.uid)}:cloud`)).pending, true);
  assert.equal([...timers.values()][0].delay, 60000);
  online = true;
  assert.equal(await sync.flush(), true);
  assert.deepEqual(calls.map(value => value.version), [V1, V1]);
  assert.equal(sync.status, 'saved');
});

test('CAS conflict stops further writes while preserving local progress and an exportable backup', async () => {
  let calls = 0;
  const { sync, cache, timers } = harness({ remote: { payload: payload(100), version: V1 }, save: async () => {
    calls++; throw Object.assign(new Error('conflict'), { code: 'conflict' });
  } });
  await sync.open(payload(100)); sync.queue(payload(120));
  assert.equal(await sync.flush(), false);
  sync.queue(payload(121));
  assert.equal(await sync.flush(), false);
  assert.equal(calls, 1); assert.equal(timers.size, 0);
  assert.equal(sync.status, 'conflict');
  assert.equal(cache.getItem(`${KEY(A.uid)}:backup`), payload(121));
});

test('pending local changes survive reload when the remote version has not changed', async () => {
  const cache = storage({ [KEY(A.uid)]: payload(222),
    [`${KEY(A.uid)}:cloud`]: JSON.stringify({ uid: A.uid, version: V1, pending: true }) });
  const { sync, writes } = harness({ cache, remote: { payload: payload(100), version: V1 } });
  assert.equal(await sync.open(payload(100)), payload(222));
  await sync.flush();
  assert.deepEqual(writes, [{ value: payload(222), version: V1 }]);
});

test('a newer cloud version on reload does not erase uncommitted local data or overwrite the server', async () => {
  const cache = storage({ [KEY(A.uid)]: payload(222),
    [`${KEY(A.uid)}:cloud`]: JSON.stringify({ uid: A.uid, version: V1, pending: true }) });
  const { sync, writes } = harness({ cache, remote: { payload: payload(444), version: V2 } });
  assert.equal(await sync.open(payload(100)), payload(222));
  assert.equal(sync.status, 'conflict');
  assert.equal(await sync.flush(), false); assert.equal(writes.length, 0);
  assert.equal(await sync.reloadCloud(), payload(444));
  assert.equal(cache.getItem(`${KEY(A.uid)}:backup`), payload(222));
  assert.equal(cache.getItem(KEY(A.uid)), payload(444));
  assert.equal(sync.status, 'saved');
});

test('offline startup uses only its own cache and a create precondition protects an unknown cloud save', async () => {
  const cache = storage({ [KEY(A.uid)]: payload(123), [KEY(B.uid)]: payload(999) });
  const { sync, writes } = harness({ cache, load: async () => { throw Object.assign(new Error(), { code: 'offline' }); } });
  assert.equal(await sync.open(payload(100)), payload(123));
  assert.equal(sync.status, 'offline');
  await sync.flush();
  assert.equal(writes[0].version, null);
});

test('changes made while a write is in flight are not overwritten by that completed snapshot', async () => {
  const first = deferred(), calls = [];
  const { sync, cache } = harness({ remote: { payload: payload(100), version: V1 }, save: async (value, version) => {
    calls.push({ value, version }); return calls.length === 1 ? first.promise : { ...V2, revision: 3 };
  } });
  await sync.open(payload(100)); sync.queue(payload(101));
  const write = sync.flush();
  await Promise.resolve();
  sync.queue(payload(100)); // Reverting to the formerly saved payload is still a new write.
  first.resolve(V2); await write;
  assert.equal(cache.getItem(KEY(A.uid)), payload(100));
  assert.equal(sync.pending, true);
  await sync.flush();
  assert.deepEqual(calls, [{ value: payload(101), version: V1 }, { value: payload(100), version: V2 }]);
});

test('disposal cancels scheduled writes without deleting the account or local save', async () => {
  const { sync, cache, timers, writes } = harness();
  await sync.open(payload(100)); sync.queue(payload(111)); sync.dispose();
  assert.equal(timers.size, 0); assert.equal(await sync.flush(), false);
  assert.equal(cache.getItem(KEY(A.uid)), payload(111)); assert.equal(writes.length, 0);
});
