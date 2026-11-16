import test from 'node:test';
import assert from 'node:assert/strict';
import { createDevSync } from '../harborlight-dev-sync.js';

const ACCOUNT = { uid: 'dev-admin3', login: 'admin3' };
const V1 = { revision: 1, updateTime: '2026-11-16T12:00:00.000001Z' };
const V2 = { revision: 2, updateTime: '2026-11-16T12:00:01.000002Z' };
const payload = coins => JSON.stringify({ resources: { coins } });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const offline = () => Object.assign(new Error('Clock service unavailable.'), { code: 'offline' });
async function fixture({ beforeRecover, save } = {}) {
  const operations = [], timers = new Map(), restores = [];
  let remote = { payload: payload(100), version: V1 }, sequence = 0, loads = 0, saves = 0;
  const sync = createDevSync({ account: ACCOUNT, saveKey: 'harborlight-dev-island-dev-admin3',
    beforeRecover: () => beforeRecover?.(operations),
    cloud: {
      loadIsland: async () => { loads++; operations.push('load'); return remote; },
      saveIsland: async (value, version) => {
        saves++; operations.push(`save:${saves}`);
        const next = save ? await save(value, version, saves) : V2;
        remote = { payload: value, version: next }; return next;
      }
    },
    onRestore: (value, metadata) => { operations.push('restore'); restores.push({ payload: value, ...metadata }); },
    schedule: (callback, delay) => { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
    cancel: id => timers.delete(id)
  });
  await sync.open(payload(999)); operations.length = 0;
  return { sync, operations, timers, restores, get loads() { return loads; }, get saves() { return saves; } };
}

test('healthy focus adopts the authoritative clock before flushing pending state and serializes parallel focus events through the save', async t => {
  const hookEntered = deferred(), releaseHook = deferred(), saveEntered = deferred(), releaseSave = deferred();
  let hooks = 0;
  const f = await fixture({
    beforeRecover: async operations => { hooks++; operations.push('clock-start'); hookEntered.resolve(); await releaseHook.promise; operations.push('clock-ready'); },
    save: async () => { saveEntered.resolve(); await releaseSave.promise; return V2; }
  });
  t.after(() => f.sync.dispose());
  assert.equal(f.sync.queue(payload(90)), true);
  const first = f.sync.recover(); await hookEntered.promise;
  const second = f.sync.recover();
  assert.equal(hooks, 1); assert.equal(f.sync.writable, false);
  assert.equal(f.sync.queue(payload(80)), false, 'commands cannot race the clock prerequisite');
  assert.equal(f.loads, 1); assert.equal(f.saves, 0); assert.deepEqual(f.restores, []);
  releaseHook.resolve(); await saveEntered.promise;
  const third = f.sync.recover();
  assert.equal(hooks, 1, 'a focus event during the gated write shares the entire recovery');
  assert.equal(f.sync.writable, false); assert.equal(f.saves, 1);
  releaseSave.resolve();
  assert.deepEqual(await Promise.all([first, second, third]), [true, true, true]);
  assert.deepEqual(f.operations, ['clock-start', 'clock-ready', 'save:1']);
  assert.equal(f.loads, 1, 'healthy focus must not reload a running minigame');
  assert.deepEqual(f.restores, []); assert.equal(f.sync.confirmedPayload, payload(90));
  assert.equal(f.sync.writable, true); assert.equal(f.sync.pending, false);
});

test('healthy clean focus refreshes the clock without loading, saving or restoring the world', async t => {
  let adoptedRate = 2;
  const f = await fixture({ beforeRecover: async operations => { operations.push('clock-read'); adoptedRate = 6; } });
  t.after(() => f.sync.dispose());
  assert.equal(await f.sync.recover(), true);
  assert.equal(adoptedRate, 6); assert.deepEqual(f.operations, ['clock-read']);
  assert.equal(f.loads, 1); assert.equal(f.saves, 0); assert.deepEqual(f.restores, []);
  assert.deepEqual(f.sync.version, V1); assert.equal(f.sync.confirmedPayload, payload(100));
  assert.equal(f.sync.writable, true); assert.equal(f.timers.size, 0);
});

test('failed healthy clock refresh preserves pending gameplay and retries only after a successful clock read and cloud reconciliation', async t => {
  let online = false;
  const f = await fixture({ beforeRecover: async operations => {
    operations.push(online ? 'clock-ready' : 'clock-offline'); if (!online) throw offline();
  } });
  t.after(() => f.sync.dispose());
  f.sync.queue(payload(90));
  assert.equal(await f.sync.recover(), false);
  assert.deepEqual(f.operations, ['clock-offline']);
  assert.equal(f.loads, 1); assert.equal(f.saves, 0); assert.deepEqual(f.restores, []);
  assert.equal(f.sync.status, 'offline'); assert.equal(f.sync.writable, false);
  assert.equal(f.sync.pending, true); assert.equal(f.sync.confirmedPayload, payload(100));
  assert.equal(f.timers.size, 1); assert.equal([...f.timers.values()][0].delay, 5000);
  assert.equal(await f.sync.flush(), false, 'failed prerequisites cannot be bypassed by autosave');
  online = true;
  assert.equal(await f.sync.recover(), true);
  assert.deepEqual(f.operations, ['clock-offline', 'clock-ready', 'load', 'save:1', 'restore']);
  assert.deepEqual(f.restores, [{ payload: payload(90), reason: 'recovered' }]);
  assert.equal(f.sync.confirmedPayload, payload(90)); assert.equal(f.sync.pending, false);
  assert.equal(f.sync.writable, true); assert.equal(f.timers.size, 0);
});

test('healthy focus that overlaps a failed in-flight save transitions to read-before-retry recovery safely', async t => {
  const firstSaveEntered = deferred(), releaseFailure = deferred();
  let hooks = 0;
  const f = await fixture({
    beforeRecover: async operations => { hooks++; operations.push('clock-ready'); },
    save: async (_value, version, count) => {
      assert.deepEqual(version, V1);
      if (count === 1) { firstSaveEntered.resolve(); await releaseFailure.promise; throw offline(); }
      return V2;
    }
  });
  t.after(() => f.sync.dispose());
  f.sync.queue(payload(90)); const writing = f.sync.flush(); await firstSaveEntered.promise;
  const focusing = f.sync.recover();
  assert.equal(f.sync.writable, false);
  releaseFailure.resolve();
  assert.equal(await writing, false); assert.equal(await focusing, true);
  assert.equal(hooks, 1); assert.equal(f.loads, 2); assert.equal(f.saves, 2);
  assert.ok(f.operations.indexOf('clock-ready') < f.operations.indexOf('load'));
  assert.ok(f.operations.indexOf('load') < f.operations.indexOf('save:2'), 'the failed write cannot be retried blindly');
  assert.deepEqual(f.restores, [{ payload: payload(90), reason: 'recovered' }]);
  assert.equal(f.sync.writable, true); assert.equal(f.sync.pending, false);
  assert.deepEqual(f.sync.version, V2); assert.equal(f.sync.confirmedPayload, payload(90));
});
