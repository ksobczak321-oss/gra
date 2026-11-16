import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccountService } from '../account-service.mjs';
import { createCurrentStarterIsland } from '../starter-island.mjs';

const NOW = Date.parse('2026-11-16T12:00:00Z'), UID = 'dev-admin3';
const ACCOUNT = `accounts/${UID}`, ISLAND = `islands/${UID}`;
class MemoryTransactions {
  records = new Map(); tail = Promise.resolve();
  put(path, value) { this.records.set(path, structuredClone(value)); }
  get(path) { return structuredClone(this.records.get(path)); }
  runTransaction(work) {
    const operation = this.tail.then(async () => {
      const draft = new Map([...this.records].map(([path, value]) => [path, structuredClone(value)]));
      let wrote = false;
      const result = await work({
        get: async path => { assert.equal(wrote, false, 'Firestore reads precede writes'); return structuredClone(draft.get(path)); },
        set: async (path, value) => { wrote = true; draft.set(path, structuredClone(value)); },
        delete: async path => { wrote = true; draft.delete(path); }
      });
      this.records = draft; return result;
    });
    this.tail = operation.catch(() => {}); return operation;
  }
}
function world(at = NOW, generation = 2) {
  const state = JSON.parse(createCurrentStarterIsland(at));
  state.islandGeneration = generation; state.islandStartedAt = at;
  state.onboarding = { ...state.onboarding, stage: 'complete', worldStartedAt: at, completedAt: at };
  return state;
}
function fixture({ initialized = true } = {}) {
  const store = new MemoryTransactions(); let at = NOW;
  store.put(ACCOUNT, { islandGeneration: 2, createdAt: NOW - 86400000, lastPlayedAt: NOW - 1000 });
  if (initialized) store.put(ISLAND, { generation: 2, revision: 1, payload: JSON.stringify(world()), updatedAt: NOW });
  const create = (options = {}) => createAccountService({ store, now: () => at, environment: 'preprod', projectId: 'harborlight-dev', ...options });
  const service = create();
  return { store, service, create, time: value => { at = value; },
    rate: (rate, requestId, generation = 2) => service.setDevClock({ uid: UID, rate, requestId, generation }) };
}
const rejects = (operation, code, status) => assert.rejects(operation, error => error.code === code && error.status === status);

test('a generation-two clock read before island creation returns x1 without creating documents or activity', async () => {
  const f = fixture({ initialized: false }), before = structuredClone(f.store.records);
  const status = await f.service.readDevClock({ uid: UID });
  assert.deepEqual(status, { enabled: true, canAdvance: false, canSetRate: true, generation: 2, rate: 1,
    clockRevision: 0, realNow: NOW, now: NOW, offsetSeconds: 0 });
  assert.deepEqual(f.store.records, before);
  await rejects(f.rate(2, 'rate_before_world'), 'island-not-initialized', 409);
  assert.deepEqual(f.store.records, before);
});

test('clock bootstrap can read a legacy island generation before normal account metadata migration', async () => {
  const f = fixture(); f.store.records.delete(ACCOUNT);
  const before = structuredClone(f.store.records), status = await f.service.readDevClock({ uid: UID });
  assert.equal(status.generation, 2); assert.equal(status.rate, 1); assert.equal(status.now, NOW);
  assert.deepEqual(f.store.records, before);
  await f.service.readIsland({ uid: UID });
  const changed = await f.rate(2, 'legacy_metadata_rate');
  assert.equal(changed.generation, 2); assert.equal(changed.rate, 2);
});

test('rates x1/x2/x6 preserve continuity and survive service recreation without rewinding on x6 to x1', async () => {
  const f = fixture(), originalIsland = f.store.get(ISLAND), lastPlayedAt = f.store.get(ACCOUNT).lastPlayedAt;
  assert.equal((await f.service.readDevClock({ uid: UID })).now, NOW);
  const two = await f.rate(2, 'rate_two_request'); assert.equal(two.now, NOW); assert.equal(two.rate, 2);
  f.time(NOW + 10000);
  assert.equal((await f.service.readDevClock({ uid: UID })).now, NOW + 20000);
  const six = await f.rate(6, 'rate_six_request'); assert.equal(six.now, NOW + 20000); assert.equal(six.clockRevision, 2);
  f.time(NOW + 15000);
  const restarted = f.create();
  const restored = await restarted.readDevClock({ uid: UID }); assert.equal(restored.now, NOW + 50000); assert.equal(restored.rate, 6);
  f.time(NOW + 16000);
  const one = await restarted.setDevClock({ uid: UID, rate: 1, requestId: 'rate_one_request', generation: 2 });
  assert.equal(one.now, NOW + 56000); assert.equal(one.rate, 1); assert.equal(one.clockRevision, 3);
  f.time(NOW + 26000);
  assert.equal((await f.create().readDevClock({ uid: UID })).now, NOW + 66000);
  assert.deepEqual(f.store.get(ISLAND), originalIsland, 'changing the private clock never simulates or rewrites a world');
  assert.equal(f.store.get(ACCOUNT).lastPlayedAt, lastPlayedAt, 'clock operations are not real player activity');
});

test('parallel retries apply a rate once; replay and reused request IDs cannot touch reset-fence revision or activity', async () => {
  const f = fixture(), lastPlayedAt = f.store.get(ACCOUNT).lastPlayedAt;
  const results = await Promise.all(Array.from({ length: 8 }, () => f.rate(6, 'rate_shared_request')));
  assert.equal(results.filter(result => result.alreadyApplied === false).length, 1);
  assert.equal(results.filter(result => result.alreadyApplied === true).length, 7);
  assert.equal(f.store.get(ACCOUNT).devClockMutationRevision, 1);
  assert.equal(f.store.get(`${ACCOUNT}/devClock/2`).revision, 1);
  f.time(NOW + 5000); const before = structuredClone(f.store.records);
  const replay = await f.create().setDevClock({ uid: UID, rate: 6, requestId: 'rate_shared_request', generation: 2 });
  assert.equal(replay.alreadyApplied, true); assert.equal(replay.now, NOW + 30000);
  assert.deepEqual(f.store.records, before);
  await rejects(f.rate(2, 'rate_shared_request'), 'request-reused', 409);
  assert.deepEqual(f.store.records, before);
  assert.equal(f.store.get(ACCOUNT).lastPlayedAt, lastPlayedAt);
});

test('invalid rates roll back the clock document and account reset-fence revision', async () => {
  const f = fixture(); await f.rate(2, 'rate_valid_request');
  const before = structuredClone(f.store.records);
  for (const [index, rate] of [0, 3, -1, 1.5, '2', null, undefined, NaN, Infinity].entries()) {
    await rejects(f.rate(rate, `rate_invalid_${index}`), 'invalid-state', 400);
    assert.deepEqual(f.store.records, before, `invalid rate ${String(rate)}`);
  }
});

test('direct clock service calls enforce account, environment and project restrictions before writing', async () => {
  const f = fixture(), before = structuredClone(f.store.records);
  for (const [service, uid] of [
    [f.service, 'dev-admin1'], [f.service, 'dev-admin2'], [f.service, 'another-account'],
    [f.create({ environment: 'production', projectId: 'harborlight-prod' }), UID],
    [f.create({ environment: 'preprod', projectId: 'harborlight-prod' }), UID],
    [f.create({ environment: 'development', projectId: 'harborlight-dev' }), UID],
    [f.create({ environment: 'preprod', projectId: 'unknown-project' }), UID]
  ]) {
    await rejects(service.readDevClock({ uid }), 'permission', 403);
    await rejects(service.setDevClock({ uid, rate: 6, requestId: 'rate_denied_request', generation: 2 }), 'permission', 403);
    assert.deepEqual(f.store.records, before);
  }
});

test('a new island generation starts x1 and cannot reuse the old generation clock or stale mutations', async () => {
  const f = fixture(); await f.rate(6, 'rate_generation_two');
  f.time(NOW + 10000);
  assert.equal((await f.service.readDevClock({ uid: UID })).now, NOW + 60000);
  const account = f.store.get(ACCOUNT), oldClock = f.store.get(`${ACCOUNT}/devClock/2`);
  f.store.put(ACCOUNT, { ...account, islandGeneration: 3 });
  f.store.put(ISLAND, { generation: 3, revision: 1, payload: JSON.stringify(world(NOW + 10000, 3)), updatedAt: NOW + 10000 });
  const beforeRead = structuredClone(f.store.records), reset = await f.create().readDevClock({ uid: UID });
  assert.equal(reset.generation, 3); assert.equal(reset.rate, 1); assert.equal(reset.now, NOW + 10000); assert.equal(reset.clockRevision, 0);
  assert.deepEqual(f.store.records, beforeRead);
  await rejects(f.rate(2, 'rate_generation_stale', 2), 'island-expired', 410);
  assert.deepEqual(f.store.records, beforeRead);
  const fresh = await f.rate(2, 'rate_generation_two', 3);
  assert.equal(fresh.alreadyApplied, false); assert.equal(fresh.generation, 3); assert.equal(fresh.now, NOW + 10000);
  assert.deepEqual(f.store.get(`${ACCOUNT}/devClock/2`), oldClock, 'the old generation remains isolated');
  assert.equal(f.store.get(`${ACCOUNT}/devClock/3`).rate, 2);
});

test('future private-world timestamps survive save/read exactly while account activity and document updates use real time', async () => {
  const f = fixture(); await f.rate(6, 'rate_future_world');
  f.time(NOW + 10000);
  const clock = await f.service.readDevClock({ uid: UID }), state = world(clock.now);
  assert.equal(clock.now, NOW + 60000);
  state.resources.wood = 137; state.buildings.farm.workProgress = [12.5];
  const payload = JSON.stringify(state), lastPlayedAt = f.store.get(ACCOUNT).lastPlayedAt;
  const result = await f.service.saveIsland({ uid: UID, payload, expectedRevision: 1, generation: 2 });
  assert.equal(result.updatedAt, NOW + 10000);
  const reopened = await f.create().readIsland({ uid: UID });
  assert.deepEqual(JSON.parse(reopened.island.payload), state, 'server transport must not clamp simulation dates to real time');
  assert.equal(reopened.island.version.updateTime, new Date(NOW + 10000).toISOString());
  assert.equal(f.store.get(ACCOUNT).lastPlayedAt, lastPlayedAt);
  f.time(NOW + 11000);
  const activity = await f.service.recordActivity({ uid: UID, generation: 2 });
  assert.equal(activity.lastPlayedAt, NOW + 11000);
  assert.equal(f.store.get(ACCOUNT).lastPlayedAt, NOW + 11000);
  assert.deepEqual(JSON.parse(f.store.get(ISLAND).payload), state, 'real activity does not rewrite private simulation timestamps');
});
