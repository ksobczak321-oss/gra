import assert from 'node:assert/strict';
import test from 'node:test';
import { changeDevAccountClock, devAccountClockStatus, normalizeDevAccountClock } from '../backend/dev-account-clock.mjs';
import { createDevTimeController } from '../harborlight-dev-cloud.js';
import { advanceTo, createState } from '../harborlight-v1-state.js';

const START = 1_800_000_000_000;

test('private clock continuously projects x1/x2/x6 and returning to Play never rewinds', () => {
  let clock = normalizeDevAccountClock(null, START);
  clock = changeDevAccountClock(clock, { rate: 2, requestId: 'rate_two_request' }, START + 1000).clock;
  assert.equal(devAccountClockStatus(clock, START + 6000).now, START + 11000);
  clock = changeDevAccountClock(clock, { rate: 6, requestId: 'rate_six_request' }, START + 6000).clock;
  assert.equal(devAccountClockStatus(clock, START + 11000).now, START + 41000);
  clock = changeDevAccountClock(clock, { rate: 1, requestId: 'rate_one_request' }, START + 11000).clock;
  assert.equal(devAccountClockStatus(clock, START + 11000).now, START + 41000);
  assert.equal(devAccountClockStatus(clock, START + 16000).now, START + 46000);
  assert.equal(devAccountClockStatus(clock, START + 16000).offsetSeconds, 30);
});

test('active rate survives durable JSON reload and repeated rate/jump requests apply once', () => {
  const changed = changeDevAccountClock(null, { rate: 6, requestId: 'persist_rate_six' }, START);
  const restored = normalizeDevAccountClock(JSON.parse(JSON.stringify(changed.clock)), START + 10000);
  assert.equal(devAccountClockStatus(restored, START + 10000).now, START + 60000);
  const replay = changeDevAccountClock(restored, { rate: 6, requestId: 'persist_rate_six' }, START + 10000);
  assert.equal(replay.alreadyApplied, true); assert.equal(replay.clock.revision, 1);
  assert.throws(() => changeDevAccountClock(restored, { rate: 2, requestId: 'persist_rate_six' }, START + 10000), error => error.code === 'request-reused');
  const jumped = changeDevAccountClock(restored, { seconds: 3600, requestId: 'persist_jump_hour' }, START + 10000);
  assert.equal(devAccountClockStatus(jumped.clock, START + 10000).now, START + 3660000);
  assert.equal(changeDevAccountClock(jumped.clock, { seconds: 3600, requestId: 'persist_jump_hour' }, START + 10000).advancedSeconds, 0);
});

test('legacy offset and jump receipts migrate without losing earned time or replaying jumps', () => {
  const legacy = { offsetSeconds: 3600, receipts: { legacy_request_1: { seconds: 3600, at: START } } };
  const original = structuredClone(legacy), clock = normalizeDevAccountClock(legacy, START + 1000);
  assert.equal(devAccountClockStatus(clock, START + 1000).now, START + 3601000);
  assert.equal(changeDevAccountClock(clock, { seconds: 3600, requestId: 'legacy_request_1' }, START + 2000).alreadyApplied, true);
  assert.deepEqual(legacy, original);
  for (const operation of [{ rate: 3 }, { rate: 0 }, { rate: 6, seconds: 1 }, { seconds: 0 }]) {
    assert.throws(() => changeDevAccountClock(clock, { ...operation, requestId: 'invalid_request_1' }, START), error => error.code === 'invalid-state');
  }
  assert.throws(() => normalizeDevAccountClock({ ...clock, rate: 100 }, START), error => error.code === 'invalid-state');
});

test('client uses monotonic elapsed time and ignores late stale responses without changing real time', async () => {
  let real = START, elapsed = 1000;
  const requests = [];
  const cloud = { local: true, projectId: 'harborlight-local-dev', requestGameService: (path, body) => new Promise(resolve => requests.push({ path, body, resolve })) };
  const clock = createDevTimeController(cloud, { now: () => real, monotonic: () => elapsed });
  const initial = clock.status();
  requests[0].resolve({ now: START, realNow: START, rate: 1, clockRevision: 0, canAdvance: true }); await initial;
  const stale = clock.status(), fast = clock.setRate(6, 'browser_rate_six');
  requests[2].resolve({ now: START, realNow: START, rate: 6, clockRevision: 1, canAdvance: true }); await fast;
  elapsed += 5000; real -= 60000;
  assert.equal(clock.now(), START + 30000); assert.equal(real, START - 60000);
  requests[1].resolve({ now: START + 1000, realNow: START + 1000, rate: 1, clockRevision: 0, canAdvance: true }); await stale;
  assert.equal(clock.snapshot().rate, 6); assert.equal(clock.now(), START + 30000);
  const play = clock.setRate(1, 'browser_rate_one');
  requests[3].resolve({ now: START + 29000, realNow: START + 5000, rate: 1, clockRevision: 2, canAdvance: true }); await play;
  assert.equal(clock.now(), START + 30000);
  elapsed += 5000; assert.equal(clock.now(), START + 35000);
});

test('production and nonlocal projects cannot construct a working time-control transport', async () => {
  for (const cloud of [{ local: true, projectId: 'harborlight-prod' }, { local: true, projectId: 'harborlight-dev' }, { local: false, projectId: 'harborlight-local-dev' }]) {
    cloud.requestGameService = () => { throw Error('forbidden transport called'); };
    const clock = createDevTimeController(cloud);
    await assert.rejects(clock.setRate(6, 'forbidden_rate_1'), error => error.code === 'permission');
    await assert.rejects(clock.status(), error => error.code === 'permission');
    assert.throws(() => clock.now(), error => error.code === 'permission');
  }
});

test('PRE-PROD controller sends the server-owned generation and never permits jump requests', async () => {
  let elapsed = 0, revision = 0, rate = 1;
  const calls = [], cloud = { preprod: true, projectId: 'harborlight-dev', requestGameService: async (path, body) => {
    calls.push({ path, body });
    if (body) { rate = body.rate; revision++; }
    return { enabled: true, canAdvance: false, canSetRate: true, generation: 2, rate, clockRevision: revision, realNow: START, now: START };
  } };
  const clock = createDevTimeController(cloud, { now: () => START, monotonic: () => elapsed });
  await clock.setRate(2, 'preprod_rate_two');
  assert.deepEqual(calls, [{ path: '/api/v1/dev-time', body: undefined }, { path: '/api/v1/dev-time', body: { rate: 2, requestId: 'preprod_rate_two', generation: 2 } }]);
  elapsed = 10000; assert.equal(clock.now(), START + 20000);
  const before = calls.length;
  await assert.rejects(clock.advance(3600, 'preprod_jump_denied'), error => error.code === 'permission');
  assert.equal(calls.length, before);
});

test('a later reset generation starts its own clock and ignores delayed old-generation status', async () => {
  let elapsed = 0, value = { now: START, realNow: START, rate: 6, clockRevision: 4, generation: 2, canAdvance: false, canSetRate: true };
  const clock = createDevTimeController({ preprod: true, projectId: 'harborlight-dev', requestGameService: async () => value }, { now: () => START, monotonic: () => elapsed });
  await clock.status(); elapsed = 60000; assert.equal(clock.now(), START + 360000);
  value = { ...value, rate: 1, clockRevision: 0, generation: 3, now: START + 60000, realNow: START + 60000 };
  await clock.status(); assert.equal(clock.now(), START + 60000);
  value = { ...value, rate: 6, clockRevision: 5, generation: 2, now: START + 370000 };
  await clock.status(); assert.equal(clock.snapshot().generation, 3); assert.equal(clock.snapshot().rate, 1);
});

test('returning after six hours adopts another window x1 clock without inventing elapsed x6 time', async () => {
  let elapsed = 0, value = { now: START, realNow: START, rate: 6, clockRevision: 1, generation: 2, canAdvance: false, canSetRate: true };
  const clock = createDevTimeController({ preprod: true, projectId: 'harborlight-dev', requestGameService: async () => value }, { now: () => START + elapsed, monotonic: () => elapsed });
  await clock.status(); assert.equal(clock.now(), START);
  elapsed = 6 * 3600000;
  value = { ...value, now: START + elapsed, realNow: START + elapsed, rate: 1, clockRevision: 2 };
  await clock.status(); assert.equal(clock.now(), START + 6 * 3600000);
  elapsed += 10000; assert.equal(clock.now(), START + 6 * 3600000 + 10000);
});

test('adopting a newer slower rate never goes below a timestamp already returned to simulation', async () => {
  let elapsed = 0, value = { now: START, realNow: START, rate: 6, clockRevision: 1, generation: 2, canAdvance: false, canSetRate: true };
  const clock = createDevTimeController({ preprod: true, projectId: 'harborlight-dev', requestGameService: async () => value }, { now: () => START + elapsed, monotonic: () => elapsed });
  await clock.status(); elapsed = 10000; assert.equal(clock.now(), START + 60000);
  elapsed = 20000;
  value = { ...value, now: START + 50000, realNow: START + 20000, rate: 1, clockRevision: 2 };
  await clock.status(); assert.equal(clock.now(), START + 60000);
  elapsed += 10000; assert.equal(clock.now(), START + 70000);
});

test('accelerated timestamps leave an unfinished introduction paused in the actual simulation', () => {
  const state = createState(START, { onboarding: true, ruleset: 32 }), before = JSON.stringify(state);
  const fast = changeDevAccountClock(null, { rate: 6, requestId: 'intro_rate_six' }, START).clock;
  assert.equal(advanceTo(state, devAccountClockStatus(fast, START + 86400000).now), 0);
  assert.equal(JSON.stringify(state), before);
});
