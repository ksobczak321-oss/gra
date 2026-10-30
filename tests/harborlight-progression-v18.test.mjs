import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProgression, registerMeaningfulActivity, activePlayMultiplier,
  nextProgressionEvent, advanceProgression, recordProgressionLogin, progressionAction,
  loyaltyStatus } from '../harborlight-v1-progression.js';
import { grantBonusMaterials } from '../harborlight-v1-inventory.js';

const START = Date.parse('2026-10-23T12:00:00Z');
const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const context = { receiveMaterials: grantBonusMaterials };
function island(now = START) {
  const state = { worldTimeMs: now, activeSeconds: 0, activityClock: 0,
    resources: { coins: 100, ...Object.fromEntries(MATERIALS.map(id => [id, 100])) },
    buildings: { townhall: { level: 1 }, warehouse: { level: 1 } },
    notifications: [], statistics: { collected: 0, crafted: 0 }, residents: [] };
  normalizeProgression(state, {});
  return state;
}
const active = state => registerMeaningfulActivity(state, { visible: true, focused: true });
const jump = (state, seconds) => { state.worldTimeMs += seconds * 1000; advanceProgression(state); };
function reload(state) {
  const raw = structuredClone(state), restored = structuredClone(raw);
  normalizeProgression(restored, raw);
  return restored;
}

test('economic activity has exact five-minute and48-hour boundaries without renewing on reload or login', () => {
  let state = island();
  assert.equal(activePlayMultiplier(state), 1);
  active(state);
  jump(state, 300);
  assert.equal(activePlayMultiplier(state), 1);
  assert.equal(nextProgressionEvent(state) <= 48 * 3600 - 300, true);
  jump(state, 48 * 3600 - 300 - 0.001);
  assert.equal(activePlayMultiplier(state), 1);
  jump(state, 0.001);
  assert.equal(activePlayMultiplier(state), 0.5);
  const lastReal = state.engagement.lastRealActivityAt;
  recordProgressionLogin(state);
  assert.equal(state.engagement.lastRealActivityAt, lastReal);
  state = reload(state);
  assert.equal(activePlayMultiplier(state), 0.5);
  assert.equal(state.engagement.lastRealActivityAt, lastReal);
  active(state);
  assert.equal(activePlayMultiplier(state), 2);
});

test('automatic heartbeat cannot become real activity even with visibility flags', () => {
  const state = island(); jump(state, 48 * 3600);
  const before = structuredClone(state);
  assert.equal(progressionAction(state, { type: 'heartbeat', visible: true, focused: true }).ok, false);
  assert.deepEqual(state, before);
  assert.equal(activePlayMultiplier(state), 0.5);
});

test('a 60-hour catch-up splits into active, ordinary and neglected intervals', () => {
  const state = island(); active(state);
  const end = START + 60 * 3600000, totals = new Map([[2, 0], [1, 0], [0.5, 0]]);
  while (state.worldTimeMs < end) {
    const duration = Math.min(nextProgressionEvent(state), (end - state.worldTimeMs) / 1000);
    assert.ok(duration > 0);
    totals.set(activePlayMultiplier(state), totals.get(activePlayMultiplier(state)) + duration);
    jump(state, duration);
  }
  assert.equal(totals.get(2), 300);
  assert.equal(totals.get(1), 48 * 3600 - 300);
  assert.equal(totals.get(0.5), 12 * 3600);
});

test('loyalty rolls50–200 of all six resources once and persists an unclaimed draw', () => {
  let state = island();
  recordProgressionLogin(state);
  const reward = loyaltyStatus(state).reward;
  assert.deepEqual(Object.keys(reward).sort(), ['coins', ...MATERIALS].sort());
  for (const amount of Object.values(reward)) assert.ok(Number.isInteger(amount) && amount >= 50 && amount <= 200);
  const seed = state.loyalty.seed;
  recordProgressionLogin(state);
  state = reload(state);
  assert.equal(state.loyalty.seed, seed);
  assert.deepEqual(loyaltyStatus(state).reward, reward);
  const before = structuredClone(state.resources);
  assert.equal(progressionAction(state, { type: 'claimLoyalty' }, context).ok, true);
  for (const [id, amount] of Object.entries(reward)) assert.equal(state.resources[id], before[id] + amount);
  const after = structuredClone(state.resources);
  state = reload(state);
  assert.equal(progressionAction(state, { type: 'claimLoyalty' }, context).ok, false);
  assert.deepEqual(state.resources, after);
});

test('real play after Warsaw midnight opens the next loyalty day without reauthentication', () => {
  const state = island(Date.parse('2026-10-24T21:59:59Z'));
  active(state);
  assert.equal(loyaltyStatus(state).rewardDay, '2026-10-24');
  assert.equal(progressionAction(state, { type: 'claimLoyalty' }, context).ok, true);
  jump(state, 2);
  assert.equal(loyaltyStatus(state).eligible, false);
  active(state);
  assert.equal(loyaltyStatus(state).rewardDay, '2026-10-25');
  assert.equal(loyaltyStatus(state).eligible, true);
});

test('ten received days close loyalty even when gaps reset the consecutive streak', () => {
  let state = island();
  for (let day = 0; day < 10; day++) {
    recordProgressionLogin(state);
    assert.equal(progressionAction(state, { type: 'claimLoyalty' }, context).ok, true);
    state = reload(state);
    if (day < 9) jump(state, 2 * 86400);
  }
  assert.equal(state.loyalty.streak, 1);
  assert.equal(state.loyalty.claimedDays.length, 10);
  assert.equal(loyaltyStatus(state).closed, true);
  jump(state, 86400); recordProgressionLogin(state);
  assert.equal(progressionAction(state, { type: 'claimLoyalty' }, context).ok, false);
});

test('verified referral activity rejects dates before the already processed first login', () => {
  const state = island(Date.parse('2026-10-06T12:00:00Z'));
  const proof = { ...context, verifiedAccountEvent: true, accountId: 'owner' };
  assert.equal(progressionAction(state, { type: 'referralRegistration', accountId: 'friend', inviterId: 'owner', registeredAt: Date.parse('2026-10-01T12:00:00Z') }, proof).ok, true);
  assert.equal(progressionAction(state, { type: 'referralLogin', accountId: 'friend' }, proof).ok, true);
  const before = structuredClone(state.resources);
  for (const day of [1, 2, 3]) assert.equal(progressionAction(state, { type: 'referralActiveDay', accountId: 'friend', active: true, at: Date.parse(`2026-10-0${day}T12:00:00Z`) }, proof).ok, false);
  assert.deepEqual(state.resources, before);
  assert.deepEqual(state.referrals.entries[0].activeDays, []);
});
