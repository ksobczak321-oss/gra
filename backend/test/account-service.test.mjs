import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccountService, threeMonthDeadline, LEGAL_DOCUMENT_VERSIONS } from '../account-service.mjs';

// A serializable, rollback-capable test adapter. The service never defaults to
// this volatile store in production; real handlers must inject a durable store.
class MemoryTransactions {
  records = new Map(); tail = Promise.resolve();
  put(path, value) { this.records.set(path, structuredClone(value)); }
  get(path) { return structuredClone(this.records.get(path)); }
  runTransaction(work) {
    const operation = this.tail.then(async () => {
      const draft = new Map([...this.records].map(([path, value]) => [path, structuredClone(value)]));
      let wrote = false;
      const result = await work({
        get: async path => { assert.equal(wrote, false, 'Firestore transaction reads must precede writes'); return structuredClone(draft.get(path)); },
        set: async (path, value) => { wrote = true; draft.set(path, structuredClone(value)); },
        delete: async path => { wrote = true; draft.delete(path); }
      });
      this.records = draft;
      return result;
    });
    this.tail = operation.catch(() => {});
    return operation;
  }
  async listAccounts({ before, limit, cursor }) {
    const entries = [...this.records].filter(([path, value]) => /^accounts\/[^/]+$/.test(path) && value.lastPlayedAt < before).map(([path]) => ({ uid: path.slice(9) })).sort((a, b) => a.uid.localeCompare(b.uid)).filter(entry => cursor === null || entry.uid > cursor);
    const accounts = entries.slice(0, limit);
    return { accounts, cursor: entries.length > limit ? accounts.at(-1).uid : null };
  }
}
const NOW = Date.parse('2026-10-30T12:00:00Z');
const payload = (coins = 100) => JSON.stringify({ resources: { coins, wood: 100, stone: 100, grain: 100, food: 100, planks: 100 } });
function fixture(time = NOW, environment = 'production') {
  const store = new MemoryTransactions();
  let clock = time;
  return { store, service: createAccountService({ store, now: () => clock, environment }), setTime: value => { clock = value; } };
}
async function starter(f, uid, content = payload()) {
  await f.service.acceptLegal({ uid, ...LEGAL_DOCUMENT_VERSIONS, termsAccepted: true, privacyAcknowledged: true });
  return f.service.startIsland({ uid, payload: content });
}
function promotion(f, extras = {}) { f.store.put('promotions/LAUNCH20', { enabled: true, maxClaims: 20, claimedCount: 0, reward: { coins: 25, wood: 150 }, ...extras }); }
const rejects = (operation, code) => assert.rejects(operation, error => error.code === code);

test('three calendar months use Warsaw dates, month-end clamping and DST', () => {
  assert.equal(threeMonthDeadline(Date.parse('2026-01-31T11:15:20.123Z')), Date.parse('2026-04-30T10:15:20.123Z'));
  assert.equal(threeMonthDeadline(Date.parse('2026-11-30T11:00:00Z')), Date.parse('2027-02-28T11:00:00Z'));
  assert.equal(threeMonthDeadline(Date.parse('2026-08-31T10:00:00Z')), Date.parse('2026-11-30T11:00:00Z'));
  assert.equal(threeMonthDeadline(Date.parse('2025-12-29T01:30:00Z')), Date.parse('2026-03-29T01:30:00Z'), 'a missing Warsaw 02:30 moves forward to 03:30');
  assert.equal(threeMonthDeadline(Date.parse('2026-07-25T00:30:00Z')), Date.parse('2026-10-25T00:30:00Z'), 'an ambiguous Warsaw 02:30 uses its first occurrence');
});

test('a promotion caps twenty simultaneous claims globally and credits only winners', async () => {
  const f = fixture(); promotion(f);
  await Promise.all(Array.from({ length: 40 }, (_, index) => starter(f, `player-${index}`)));
  const outcomes = await Promise.allSettled(Array.from({ length: 40 }, (_, index) => f.service.redeemCode({ uid: `player-${index}`, code: ' launch20 ', generation: 1 })));
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 20);
  assert.ok(outcomes.filter(result => result.status === 'rejected').every(result => result.reason.code === 'promotion-exhausted'));
  assert.equal(f.store.get('promotions/LAUNCH20').claimedCount, 20);
  const balances = Array.from({ length: 40 }, (_, index) => JSON.parse(f.store.get(`islands/player-${index}`).payload));
  assert.equal(balances.reduce((sum, state) => sum + state.resources.coins, 0), 40 * 100 + 20 * 25);
  assert.equal(balances.reduce((sum, state) => sum + (state.bonusMaterials?.wood || 0), 0), 20 * 150);
});

test('parallel repeats by one account consume one global place and one reward', async () => {
  const f = fixture(); promotion(f); await starter(f, 'one');
  const results = await Promise.all(Array.from({ length: 20 }, () => f.service.redeemCode({ uid: 'one', code: 'LAUNCH20', generation: 1 })));
  assert.equal(results.filter(result => !result.alreadyRedeemed).length, 1);
  assert.equal(f.store.get('promotions/LAUNCH20').claimedCount, 1);
  const state = JSON.parse(f.store.get('islands/one').payload);
  assert.equal(state.resources.wood, 250); assert.equal(state.bonusMaterials.wood, 150);
  assert.equal(state.resources.coins, 125);
});

test('invalid, premature, ended and unverifiable promotions never consume a place', async () => {
  const f = fixture(); await starter(f, 'one');
  for (const [extra, code] of [[{ startsAt: NOW + 1 }, 'promotion-not-started'], [{ endsAt: NOW }, 'promotion-ended'], [{ requiresFacebookLike: true }, 'unsupported-promotion-verification'], [{ reward: { coins: -1 } }, 'invalid-promotion-reward']]) {
    promotion(f, extra);
    await rejects(f.service.redeemCode({ uid: 'one', code: 'LAUNCH20', generation: 1 }), code);
    assert.equal(f.store.get('promotions/LAUNCH20').claimedCount, 0);
    assert.equal(JSON.parse(f.store.get('islands/one').payload).resources.coins, 100);
  }
  await rejects(f.service.redeemCode({ uid: 'one', code: '../oops', generation: 1 }), 'invalid-code');
});

test('inventory overflow rolls back the global claim and permits retry after spending', async () => {
  const f = fixture(); await starter(f, 'one', payload(Number.MAX_SAFE_INTEGER)); promotion(f);
  await rejects(f.service.redeemCode({ uid: 'one', code: 'LAUNCH20', generation: 1 }), 'inventory-overflow');
  assert.equal(f.store.get('promotions/LAUNCH20').claimedCount, 0);
  assert.equal(f.store.get('accounts/one/redemptions/LAUNCH20'), undefined);
  const current = f.store.get('islands/one'), state = JSON.parse(current.payload); state.resources.coins = 100;
  await f.service.saveIsland({ uid: 'one', payload: JSON.stringify(state), generation: 1, expectedRevision: 1 });
  assert.equal((await f.service.redeemCode({ uid: 'one', code: 'LAUNCH20', generation: 1 })).alreadyRedeemed, false);
});

test('expiry removes only the island and preserves identity, payments and one-time histories', async () => {
  const at = Date.parse('2026-01-31T11:00:00Z'), f = fixture(at); await starter(f, 'one'); promotion(f);
  await f.service.redeemCode({ uid: 'one', code: 'LAUNCH20', generation: 1 });
  f.store.put('accounts/one/payments/p-1', { grossGrosz: 1999, verified: true });
  f.store.put('accounts/one/referrals/person', { paid: true });
  const deadline = threeMonthDeadline(at);
  f.setTime(deadline - 1); assert.equal((await f.service.expireIsland({ uid: 'one' })).expired, false);
  f.setTime(deadline); const result = await f.service.expireIsland({ uid: 'one' });
  assert.equal(result.expired, true); assert.equal(result.refunds, false);
  assert.equal(f.store.get('islands/one'), undefined);
  assert.equal(f.store.get('accounts/one').islandGeneration, 2);
  assert.equal(f.store.get('accounts/one/payments/p-1').grossGrosz, 1999);
  assert.equal(f.store.get('accounts/one/referrals/person').paid, true);
  assert.ok(f.store.get('accounts/one/redemptions/LAUNCH20'));
  assert.equal((await f.service.expireIsland({ uid: 'one' })).expired, false, 'retries never reset another generation or refund twice');
});

test('old tabs cannot save or record activity after expiry or after a new island starts', async () => {
  const f = fixture(); await starter(f, 'one'); const old = f.store.get('islands/one');
  f.setTime(threeMonthDeadline(NOW)); await f.service.expireIsland({ uid: 'one' });
  await rejects(f.service.saveIsland({ uid: 'one', payload: old.payload, expectedRevision: 0, generation: 1 }), 'island-expired');
  await rejects(f.service.recordActivity({ uid: 'one', generation: 1 }), 'island-expired');
  const newIsland = await starter(f, 'one'); assert.equal(newIsland.generation, 2);
  await rejects(f.service.saveIsland({ uid: 'one', payload: old.payload, expectedRevision: 1, generation: 1 }), 'island-expired');
  await rejects(f.service.saveIsland({ uid: 'one', payload: old.payload, expectedRevision: 1, generation: 2 }), 'island-expired');
  assert.equal(JSON.parse(f.store.get('islands/one').payload).resources.coins, 100);
});

test('restarting a forfeited island does not make an account promotion reusable', async () => {
  const f = fixture(); await starter(f, 'one'); promotion(f);
  await f.service.redeemCode({ uid: 'one', code: 'LAUNCH20', generation: 1 });
  f.setTime(threeMonthDeadline(NOW)); await f.service.expireIsland({ uid: 'one' }); await starter(f, 'one');
  const result = await f.service.redeemCode({ uid: 'one', code: 'LAUNCH20', generation: 2 });
  assert.equal(result.alreadyRedeemed, true);
  assert.equal(f.store.get('promotions/LAUNCH20').claimedCount, 1);
  assert.equal(JSON.parse(f.store.get('islands/one').payload).resources.coins, 100);
});

test('world expiry carries account rewards and histories into a fresh world without replaying them', async () => {
  const f = fixture(); await starter(f, 'one');
  const old = f.store.get('islands/one'), state = JSON.parse(old.payload);
  Object.assign(state, {
    population: 30, resources: { ...state.resources, coins: 12000, wood: 500 },
    bonusMaterials: { wood: 400 }, buildings: { townhall: { level: 4 } },
    welcome: { startedAt: NOW, until: NOW + 72 * 3600000 },
    loyalty: { claimedDays: [1, 2], closed: false, receivedRewards: { '2026-10-30': { coins: 50 } } },
    socialRewards: { firstShareClaimed: true, publicationIds: ['post-1'], levelShares: [2, 3] },
    referrals: { ownerId: 'one', entries: [{ accountId: 'friend', firstLoginPaid: true, thirdDayPaid: true }] },
    commerce: { receipts: [{ id: 'p-1', at: NOW, grossGrosz: 1999, verified: true }], promoClaims: { LAUNCH20: { at: NOW } },
      adReceipts: ['ad-1'], ad: { nonce: 'interrupted' }, checkouts: [{ id: 'complete', status: 'complete' }, { id: 'pending', status: 'pending' }] },
    engagementSchedule: { version: 1, seed: 57, activeSeconds: 1000, completedChoices: 0, initialCompleted: true,
      initialAnchored: true, initialBonusClaimed: true, initialPremiumBonusAvailable: false,
      pending: { id: 'run-1', kind: 'choice', started: true, choice: 'minigame', runId: 'old-run' } }
  });
  f.store.put('islands/one', { ...old, payload: JSON.stringify(state) });
  f.setTime(threeMonthDeadline(NOW));
  await f.service.readIsland({ uid: 'one' });
  const preserved = f.store.get('accounts/one').islandAccountProgress;
  assert.equal(preserved.loyalty.closed, true); assert.equal(preserved.loyalty.closedReason, 'townhall-level-4');
  assert.equal(preserved.engagementSchedule.pending, null); assert.equal(preserved.engagementSchedule.completedChoices, 1);
  assert.ok(preserved.engagementSchedule.nextAt >= 3580 && preserved.engagementSchedule.nextAt <= 4720);
  assert.equal(preserved.commerce.ad, null); assert.equal(preserved.commerce.checkouts[1].status, 'cancelled');
  await starter(f, 'one');
  const restored = JSON.parse(f.store.get('islands/one').payload);
  assert.equal(restored.islandGeneration, 2); assert.deepEqual(restored.resources, JSON.parse(payload()).resources);
  assert.equal(restored.population, undefined, 'expired population was not copied over the supplied server starter');
  assert.equal(restored.bonusMaterials, undefined, 'forfeited material balances are not restored');
  for (const field of ['welcome', 'loyalty', 'socialRewards', 'referrals', 'commerce', 'engagementSchedule']) assert.deepEqual(restored[field], preserved[field]);
  assert.equal(restored.welcome.until, NOW + 72 * 3600000, 'the old welcome clock is never renewed');
  assert.equal(restored.engagementSchedule.initialBonusClaimed, true);
  assert.equal(restored.commerce.receipts[0].verified, true);
  const generation2 = f.store.get('islands/one');
  await f.service.saveIsland({ uid: 'one', payload: generation2.payload, generation: 2, expectedRevision: 1 });
  assert.deepEqual(JSON.parse(f.store.get('islands/one').payload).commerce.receipts, preserved.commerce.receipts, 'production receipt validation accepts the restored trusted history');
  f.setTime(threeMonthDeadline(threeMonthDeadline(NOW)));
  await f.service.expireIsland({ uid: 'one' }); await starter(f, 'one');
  const again = JSON.parse(f.store.get('islands/one').payload);
  assert.equal(again.islandGeneration, 3); assert.equal(again.engagementSchedule.completedChoices, 1);
  assert.deepEqual(again.loyalty.claimedDays, [1, 2]); assert.equal(again.socialRewards.firstShareClaimed, true);
});

test('a legacy island with no welcome metadata cannot gain fresh protection after expiry', async () => {
  const f = fixture(); await starter(f, 'one'); f.setTime(threeMonthDeadline(NOW));
  await f.service.expireIsland({ uid: 'one' });
  const renewedStarter = JSON.parse(payload()); renewedStarter.welcome = { startedAt: threeMonthDeadline(NOW), until: threeMonthDeadline(NOW) + 72 * 3600000 };
  await f.service.startIsland({ uid: 'one', payload: JSON.stringify(renewedStarter) });
  assert.deepEqual(JSON.parse(f.store.get('islands/one').payload).welcome, { startedAt: 0, until: 0 });
});

test('real play advances retention but ordinary saves do not keep an idle world alive', async () => {
  const f = fixture(); await starter(f, 'one');
  f.setTime(NOW + 40 * 86400000);
  const current = f.store.get('islands/one');
  await f.service.saveIsland({ uid: 'one', payload: current.payload, expectedRevision: 1, generation: 1 });
  assert.equal(f.store.get('accounts/one').lastPlayedAt, NOW);
  await f.service.recordActivity({ uid: 'one', generation: 1 });
  assert.equal(f.store.get('accounts/one').lastPlayedAt, NOW + 40 * 86400000);
});

test('permanent PRE-PROD users are exempt while production has no implicit admin exemption', async () => {
  const f = fixture(NOW, 'preprod'); await starter(f, 'dev-admin1');
  f.setTime(threeMonthDeadline(NOW)); assert.equal((await f.service.expireIsland({ uid: 'dev-admin1' })).reason, 'exempt');
  const prod = fixture(); await starter(prod, 'dev-admin1'); prod.setTime(threeMonthDeadline(NOW));
  assert.equal((await prod.service.expireIsland({ uid: 'dev-admin1' })).expired, true);
});

test('retention scans paginate and an activity transaction wins over a later expiry check', async () => {
  const f = fixture(); await starter(f, 'alice'); await starter(f, 'bob');
  f.setTime(threeMonthDeadline(NOW) - 1);
  await f.service.recordActivity({ uid: 'alice', generation: 1 });
  f.setTime(threeMonthDeadline(NOW));
  const first = await f.service.sweepExpired({ limit: 1 });
  assert.equal(first.results.length, 1); assert.equal(first.results[0].uid, 'bob'); assert.equal(first.results[0].expired, true);
  assert.ok(f.store.get('islands/alice'));
});

test('stale activity, saves and promotion claims expire worlds before renewing or granting anything', async () => {
  for (const operation of ['activity', 'save', 'promotion']) {
    const f = fixture(); await starter(f, 'one'); promotion(f);
    const current = f.store.get('islands/one'), state = JSON.parse(current.payload);
    state.socialRewards = { firstShareClaimed: true, publicationIds: ['retained-post'] };
    f.store.put('islands/one', { ...current, payload: JSON.stringify(state) });
    f.setTime(threeMonthDeadline(NOW));
    const request = operation === 'activity' ? f.service.recordActivity({ uid: 'one', generation: 1 })
      : operation === 'save' ? f.service.saveIsland({ uid: 'one', payload: current.payload, generation: 1, expectedRevision: 1 })
        : f.service.redeemCode({ uid: 'one', code: 'LAUNCH20', generation: 1 });
    await rejects(request, 'island-expired');
    const account = f.store.get('accounts/one');
    assert.equal(account.islandGeneration, 2, `${operation}: tombstone committed before the 410`);
    assert.equal(account.lastPlayedAt, NOW, `${operation}: old activity did not renew the deadline`);
    assert.equal(account.islandAccountProgress.socialRewards.firstShareClaimed, true);
    assert.equal(f.store.get('islands/one'), undefined);
    assert.ok(f.store.get('accounts/one/islandResets/1'));
    assert.equal(f.store.get('promotions/LAUNCH20').claimedCount, 0);
    assert.equal(f.store.get('accounts/one/redemptions/LAUNCH20'), undefined);
  }
});

test('late PRE-PROD admin activity, saves and promotions remain exempt from automatic expiry', async () => {
  const f = fixture(NOW, 'preprod'); await starter(f, 'dev-admin1'); promotion(f);
  f.setTime(threeMonthDeadline(NOW) + 1000);
  const current = f.store.get('islands/dev-admin1');
  await f.service.saveIsland({ uid: 'dev-admin1', payload: current.payload, generation: 1, expectedRevision: 1 });
  await f.service.redeemCode({ uid: 'dev-admin1', code: 'LAUNCH20', generation: 1 });
  await f.service.recordActivity({ uid: 'dev-admin1', generation: 1 });
  assert.equal(f.store.get('accounts/dev-admin1').islandGeneration, 1);
  assert.equal(f.store.get('accounts/dev-admin1').lastPlayedAt, threeMonthDeadline(NOW) + 1000);
  assert.equal(f.store.get('promotions/LAUNCH20').claimedCount, 1);
  assert.ok(f.store.get('islands/dev-admin1'));
});


test('the first return expires an abandoned world even without a scheduled sweep', async () => {
  const f = fixture(); await starter(f, 'one');
  f.store.put('accounts/one/payments/receipt', { verified: true, grossGrosz: 1999 });
  f.setTime(threeMonthDeadline(NOW));
  const result = await f.service.readIsland({ uid: 'one' });
  assert.equal(result.island, null); assert.equal(result.account.expired, true); assert.equal(result.account.generation, 2);
  assert.equal(f.store.get('islands/one'), undefined);
  assert.equal(f.store.get('accounts/one/payments/receipt').grossGrosz, 1999);
  assert.equal(f.store.get('accounts/one').lastPlayedAt, NOW, 'loading is not a genuine play event');
  await rejects(f.service.recordActivity({ uid: 'one', generation: 1 }), 'island-expired');
  const again = await f.service.readIsland({ uid: 'one' });
  assert.equal(again.account.generation, 2);
});

test('production snapshots cannot manufacture verified purchase or ad receipts', async () => {
  const f = fixture(); await starter(f, 'one');
  const current = f.store.get('islands/one'), state = JSON.parse(current.payload);
  state.commerce = { receipts: [{ id: 'forged', verified: true, grossGrosz: 100000 }], adReceipts: ['forged-ad'], promoClaims: { FREE: true }, ad: { nonce: 'fake' } };
  await f.service.saveIsland({ uid: 'one', payload: JSON.stringify(state), expectedRevision: 1, generation: 1 });
  const restored = JSON.parse(f.store.get('islands/one').payload);
  assert.deepEqual(restored.commerce.receipts, []); assert.deepEqual(restored.commerce.adReceipts, []);
  assert.deepEqual(restored.commerce.promoClaims, {}); assert.equal(restored.commerce.ad, null);
});

test('legacy PRE-PROD islands gain metadata without resetting payload, revision or inventory', async () => {
  const f = fixture(NOW, 'preprod'), uid = 'dev-admin1';
  const legacy = { schemaVersion: 1, revision: 7, payload: payload(1234), updatedAt: '2026-10-29T12:00:00.000Z' };
  f.store.put(`islands/${uid}`, legacy);
  const read = await f.service.readIsland({ uid });
  assert.equal(read.island.payload, legacy.payload); assert.equal(read.island.version.revision, 7);
  assert.deepEqual(f.store.get(`islands/${uid}`), legacy, 'metadata migration never rewrites the existing island document');
  assert.equal(f.store.get(`accounts/${uid}`).lastPlayedAt, NOW);
  assert.equal(f.store.get(`accounts/${uid}`).islandGeneration, 1);
  const state = JSON.parse(read.island.payload); state.resources.wood += 1;
  const saved = await f.service.saveIsland({ uid, payload: JSON.stringify(state), expectedRevision: 7, generation: 1 });
  assert.equal(saved.revision, 8); assert.equal(JSON.parse(f.store.get(`islands/${uid}`).payload).resources.coins, 1234);
  promotion(f);
  const claim = await f.service.redeemCode({ uid, code: 'LAUNCH20', generation: 1 });
  assert.equal(claim.claimedNumber, 1);
  const after = JSON.parse(f.store.get(`islands/${uid}`).payload);
  assert.equal(after.resources.coins, 1259); assert.equal(after.resources.wood, 251); assert.equal(after.bonusMaterials.wood, 150);
});
