import assert from 'node:assert/strict';
import test from 'node:test';
import { createCharityService, charityMonth } from '../charity-service.mjs';
import { createCharityLedgerStore, spendWallet } from '../charity-ledger.mjs';
import { createIslandDocumentStore } from '../island-document-store.mjs';

const DAY = 86400000, NOW = Date.parse('2026-10-31T12:00:00Z');
class Store {
  records = new Map(); tail = Promise.resolve();
  put(key, value) { this.records.set(key, structuredClone(value)); }
  get(key) { return structuredClone(this.records.get(key)); }
  runTransaction(work) {
    const promise = this.tail.then(async () => {
      const copy = new Map([...this.records].map(([key, value]) => [key, structuredClone(value)])); let wrote = false;
      const result = await work({
        get: async key => { assert.equal(wrote, false, 'all reads precede writes'); return structuredClone(copy.get(key)); },
        set: async (key, value) => { wrote = true; copy.set(key, structuredClone(value)); },
        delete: async key => { wrote = true; copy.delete(key); }
      }); this.records = copy; return result;
    }); this.tail = promise.catch(() => {}); return promise;
  }
}
const world = coins => ({ version: 9, islandStartedAt: NOW - DAY, lastSimulatedAt: NOW, resources: { coins, wood: 100, stone: 100, grain: 100, food: 100, planks: 100 }, buildings: { townhall: { level: 4 }, house: { level: 1 } } });
function fixture({ simulation = true, balance = 5000, prefund = 5000, pilot = true, margin = null } = {}) {
  const store = new Store(); let at = NOW;
  for (const uid of ['one', 'two']) { store.put(`accounts/${uid}`, { islandGeneration: 1 }); store.put(`islands/${uid}`, { payload: JSON.stringify(world(balance)), revision: 1, generation: 1 }); }
  const credits = new Map();
  const service = createCharityService({ store, simulation, environment: simulation ? 'development' : 'production', now: () => at,
    verifyCredit: async ({ eventId }) => credits.get(eventId),
    verifyFunding: async () => ({ organization: 'Organizacja', goal: 'Cel rzeczywisty', prefundedCents: prefund, pilot, previousMarginCents: margin }),
    verifyTransfer: async ({ donationId, mode }) => ({ donationId, mode, amountCents: 100, reference: 'BANK-123' }) });
  return { store, service, credits, time: value => { at = value; },
    fund: () => service.configureCampaign({ organization: 'TEST DEV', goal: 'Demonstracja', prefundedCents: prefund, pilot, previousMarginCents: margin, fundingEventId: 'funding_12345' }),
    earn: async (uid = 'one', amount = 1000, eventId = 'credit_12345', source = 'tax-base', extra = {}) => { credits.set(eventId, { amount, source, ...extra }); return service.recordVerifiedCredit({ uid, eventId }); } };
}
const data = (f, uid = 'one') => JSON.parse(f.store.get(`islands/${uid}`).payload);
const donate = (f, uid = 'one', requestId = 'donate_12345') => f.service.donate({ uid, requestId, islandId: 'island-1' });
const rejects = (promise, code) => assert.rejects(promise, error => error.code === code);

test('historical balances and opaque client saves never qualify; spending provenance is preserved only by trusted operations', async () => {
  const f = fixture(); const store = createCharityLedgerStore(createIslandDocumentStore(f.store));
  assert.equal((await f.service.status({ uid: 'one' })).qualifiedCoins, 0);
  await f.earn('one', 1000);
  await store.runTransaction(async tx => { const document = await tx.get('islands/one'), state = JSON.parse(document.payload); state.resources.coins += 400; document.payload = JSON.stringify(state); await tx.set('islands/one', document); });
  let status = await f.service.status({ uid: 'one' }); assert.equal(status.qualifiedCoins, 0); assert.equal(status.unqualifiedCoins, 6400);
  await store.runTransaction(async tx => { const document = await tx.get('islands/one'), state = JSON.parse(document.payload); state.resources.coins -= 600; document.payload = JSON.stringify(state); await tx.set('islands/one', document); });
  status = await f.service.status({ uid: 'one' }); assert.equal(status.qualifiedCoins, 0); assert.equal(status.unqualifiedCoins, 5800);
  const trustedWallet = { qualified: 1000, unqualified: 500 };
  assert.deepEqual(spendWallet(trustedWallet, 200), { qualified: 200, unqualified: 0 });
  assert.deepEqual(trustedWallet, { qualified: 800, unqualified: 500 });
});

test('net-zero client spend plus unqualified income cannot wash spent qualified coins back into eligibility', async () => {
  const f = fixture({ balance: 0 }); await f.fund(); await f.earn();
  const store = createCharityLedgerStore(createIslandDocumentStore(f.store));
  await store.runTransaction(async tx => {
    const document = await tx.get('islands/one'), state = JSON.parse(document.payload);
    state.resources.coins -= 1000; state.resources.wood += 2000; // purchased goods
    state.resources.coins += 1000; state.resources.stone -= 100; // sale proceeds
    document.payload = JSON.stringify(state); await tx.set('islands/one', document);
  });
  const status = await f.service.status({ uid: 'one' }); assert.equal(status.qualifiedCoins, 0); assert.equal(status.unqualifiedCoins, 1000);
  await rejects(donate(f), 'charity-insufficient-qualified-coins'); assert.equal(data(f).resources.coins, 1000);
});

test('trusted credits are idempotent and preserve paid/trade/unknown provenance', async () => {
  const f = fixture();
  assert.equal((await f.earn()).qualified, true); assert.equal((await f.earn()).alreadyApplied, true); assert.equal(data(f).resources.coins, 6000);
  for (const source of ['purchase', 'trade-sale', 'unknown', 'league', 'physical-game']) await f.earn('one', 100, `credit_${source}`, source);
  await f.earn('one', 100, 'credit_multiplier', 'tax-base', { paidMultiplier: true });
  await f.earn('one', 100, 'credit_simulated', 'free-task', { simulated: true });
  const status = await f.service.status({ uid: 'one' }); assert.equal(status.qualifiedCoins, 1000); assert.equal(status.unqualifiedCoins, 5700);
  f.credits.set('credit_12345', { amount: 2000, source: 'tax-base' });
  await rejects(f.service.recordVerifiedCredit({ uid: 'one', eventId: 'credit_12345' }), 'charity-request-reused');
});

test('client assertions cannot fund or confirm a real campaign, or mint qualified coins', async () => {
  const f = fixture(); const real = createCharityService({ store: f.store });
  await rejects(real.recordVerifiedCredit({ uid: 'one', eventId: 'fakecredit_123', amount: 1000, source: 'tax-base', verified: true }), 'charity-trusted-issuer-unavailable');
  await rejects(real.configureCampaign({ month: '2026-10', organization: 'Fake', goal: 'Fake', prefundedCents: 5000, verified: true }), 'charity-funding-unverified');
  await rejects(real.confirmTransfer({ donationId: `charity_${'a'.repeat(40)}`, transferEventId: 'fakeproof_123', verified: true }), 'charity-transfer-unverified');
  assert.throws(() => createCharityService({ store: f.store, simulation: true, environment: 'preprod' }), /restricted/);
});

test('donation reserves exactly PLN1, burns 1000 qualified coins once, and waits for a verified transfer', async () => {
  const f = fixture(); await f.fund(); await f.earn();
  const first = await donate(f), id = first.donation.id;
  assert.equal(first.donation.status, 'reserved'); assert.equal(data(f).resources.coins, 5000);
  assert.equal((await donate(f)).alreadyApplied, true); assert.equal(data(f).resources.coins, 5000);
  assert.equal((await f.service.status({ uid: 'one' })).campaign.availableCents, 4900);
  await rejects(f.service.claimReward({ uid: 'one', donationId: id }), 'charity-reward-awaits-transfer');
  await f.service.confirmTransfer({ donationId: id, transferEventId: 'transfer_12345' });
  const reward = await f.service.claimReward({ uid: 'one', donationId: id });
  assert.equal(reward.reward.happinessPoints, 20); assert.equal(reward.reward.expiresAt - NOW, 6 * 3600000); assert.equal(data(f).charityReward.id, id);
  f.time(NOW + DAY); const replay = await f.service.claimReward({ uid: 'one', donationId: id }); assert.equal(replay.alreadyApplied, true); assert.equal(replay.reward.expiresAt, NOW + 6 * 3600000);
  await rejects(f.service.claimReward({ uid: 'two', donationId: id }), 'charity-donation-not-found');
});

test('a client save cannot forge, extend, or copy a server reward between islands', async () => {
  const f = fixture(); const store = createCharityLedgerStore(createIslandDocumentStore(f.store));
  await store.runTransaction(async tx => { const document = await tx.get('islands/one'), state = JSON.parse(document.payload); state.charityReward = { id: 'fake', expiresAt: NOW + DAY, happinessPoints: 20 }; document.payload = JSON.stringify(state); await tx.set('islands/one', document); });
  assert.equal(data(f).charityReward, undefined);
  await f.fund(); await f.earn(); const { donation } = await donate(f); await f.service.confirmTransfer({ donationId: donation.id, transferEventId: 'transfer_12345' }); await f.service.claimReward({ uid: 'one', donationId: donation.id });
  const original = data(f).charityReward;
  await store.runTransaction(async tx => { const document = await tx.get('islands/one'), state = JSON.parse(document.payload); state.charityReward.expiresAt += DAY; document.payload = JSON.stringify(state); await tx.set('islands/one', document); });
  assert.deepEqual(data(f).charityReward, original);
});

test('concurrent donors cannot oversubscribe the last PLN1; loser keeps every coin', async () => {
  const f = fixture({ prefund: 100 }); await f.fund(); await f.earn('one', 1000, 'earn_one_123'); await f.earn('two', 1000, 'earn_two_123');
  const results = await Promise.allSettled([donate(f, 'one'), donate(f, 'two')]);
  assert.equal(results.filter(value => value.status === 'fulfilled').length, 1);
  assert.equal(results.find(value => value.status === 'rejected').reason.code, 'charity-fund-exhausted');
  assert.equal(data(f).resources.coins + data(f, 'two').resources.coins, 11000);
});

test('both Warsaw calendar month and rolling30days apply across islands', async () => {
  const f = fixture(); await f.fund(); await f.earn('one', 3000); await donate(f);
  f.time(Date.parse('2026-11-01T12:00:00Z')); await f.fund(); await rejects(donate(f, 'one', 'donate_nextmonth'), 'charity-account-limit');
  f.time(NOW + 30 * DAY); await donate(f, 'one', 'donate_after30days');
  assert.equal((await f.service.status({ uid: 'one' })).monthUsed, true);
  assert.equal(charityMonth(Date.parse('2026-10-31T23:30:00Z')), '2026-11');
});

test('cancelled reservations refund original provenance exactly once and release only reserved funds', async () => {
  const f = fixture(); await f.fund(); await f.earn(); const { donation } = await donate(f);
  await f.service.cancelReservation({ donationId: donation.id }); await f.service.cancelReservation({ donationId: donation.id });
  const status = await f.service.status({ uid: 'one' }); assert.equal(status.qualifiedCoins, 1000); assert.equal(status.campaign.availableCents, 5000); assert.equal(data(f).resources.coins, 6000);
  assert.equal(status.eligible, false, 'cancellation does not reset the monthly/rolling limit');
  await rejects(f.service.confirmTransfer({ donationId: donation.id, transferEventId: 'transfer_12345' }), 'charity-donation-closed');
});

test('later campaigns use the minimum of50PLN,5percent actualmargin and prefunding, floored to fullPLN', async () => {
  const f = fixture({ simulation: false, prefund: 4210, pilot: false, margin: 12345 });
  const campaign = await f.fund(); assert.equal(campaign.budgetCents, 600);
  const zero = fixture({ simulation: false, prefund: 5000, pilot: false, margin: 0 }); assert.equal((await zero.fund()).active, false);
});

test('old world generation cannot redeem a reward on a replacement world', async () => {
  const f = fixture(); await f.fund(); await f.earn(); const { donation } = await donate(f); await f.service.confirmTransfer({ donationId: donation.id, transferEventId: 'transfer_12345' });
  const document = f.store.get('islands/one'); document.generation = 2; f.store.put('islands/one', document);
  await rejects(f.service.claimReward({ uid: 'one', donationId: donation.id }), 'charity-world-changed');
});

test('missing funds or qualified coins never remove an ordinary historical balance', async () => {
  const f = fixture(); await rejects(donate(f), 'charity-campaign-unavailable'); await f.fund(); await rejects(donate(f), 'charity-insufficient-qualified-coins'); assert.equal(data(f).resources.coins, 5000);
});
