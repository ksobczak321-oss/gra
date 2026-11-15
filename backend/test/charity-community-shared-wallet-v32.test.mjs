import test from 'node:test';
import assert from 'node:assert/strict';
import { createCharityService } from '../charity-service.mjs';
import { createCommunityService } from '../community-service.mjs';
import { createIslandDocumentStore } from '../island-document-store.mjs';
import { createState, normalizeState, advanceTo } from '../../harborlight-v1-state.js';
import * as Arch from '../../harborlight-v1-archipelago.js';

const DAY = 86400000, NOW = Date.parse('2026-11-10T18:00:00Z');
const adapters = { createState, normalizeState, advanceTo };
class Store {
  records = new Map(); tail = Promise.resolve();
  put(key, value) { this.records.set(key, structuredClone(value)); }
  get(key) { return structuredClone(this.records.get(key)); }
  runTransaction(work) {
    const next = this.tail.then(async () => {
      const draft = new Map([...this.records].map(([key, value]) => [key, structuredClone(value)]));
      let wrote = false;
      const result = await work({
        get: async key => { assert.equal(wrote, false, 'Firestore reads precede writes'); return structuredClone(draft.get(key)); },
        set: async (key, value) => { wrote = true; draft.set(key, structuredClone(value)); },
        delete: async key => { wrote = true; draft.delete(key); }
      });
      this.records = draft; return result;
    });
    this.tail = next.catch(() => {}); return next;
  }
}
function snapshot(coins = 5000) {
  const mother = createState(NOW, { ruleset: 32 }), daughter = createState(NOW, { ruleset: 32 });
  mother.islandName = 'Matka'; mother.buildings.townhall.level = 4; mother.resources.coins = coins;
  daughter.islandId = 'island-2'; daughter.islandRole = 'daughter'; daughter.islandSuffix = 'Port'; daughter.resources.coins = 0;
  daughter.residents.forEach(person => { person.personUid = `island-2:resident-${person.id}`; });
  mother.archipelago = { version: 2, activeIslandId: 'island-2', islands: { 'island-2': daughter }, sharedWallet: { coins }, sequence: 0, transfers: [], shipCapacity: 1000, capacityReceipts: [] };
  return Arch.serializeArchipelago(Arch.restoreArchipelago(mother, adapters, NOW));
}
async function saved(store) {
  return createIslandDocumentStore(store).runTransaction(async tx => JSON.parse((await tx.get('islands/one')).payload));
}
async function assertBalance(store, coins) {
  const state = await saved(store);
  assert.equal(state.resources.coins, coins);
  assert.equal(state.archipelago.sharedWallet.coins, coins);
  assert.equal(state.archipelago.islands['island-2'].resources.coins, 0);
  let account = Arch.restoreArchipelago(state, adapters, NOW);
  for (let reload = 0; reload < 2; reload++) {
    assert.equal(account.primary.resources.coins, coins);
    assert.equal(account.secondary.resources.coins, coins, 'the daughter reads the same account wallet');
    account = Arch.restoreArchipelago(Arch.serializeArchipelago(account), adapters, NOW);
  }
  return state;
}
function charityFixture(seed = snapshot()) {
  const store = new Store(), credits = new Map();
  store.put('accounts/one', { islandGeneration: 1, createdAt: NOW - 20 * DAY, activePlayDays: ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'] });
  store.put('islands/one', { payload: JSON.stringify(seed), revision: 1, generation: 1 });
  const service = createCharityService({ store, environment: 'preprod', simulation: true, now: () => NOW,
    verifyCredit: async ({ eventId }) => credits.get(eventId),
    verifyTransfer: async ({ donationId, mode }) => ({ donationId, mode, amountCents: 100, reference: 'SIMULATION-123' }) });
  return { store, service, credits,
    fund: () => service.configureCampaign({ organization: 'SYMULACJA', goal: 'Test bez przelewu', prefundedCents: 5000, pilot: true }),
    credit: async () => { credits.set('credit_shared_123', { amount: 1000, source: 'tax-base' }); return service.recordVerifiedCredit({ uid: 'one', eventId: 'credit_shared_123', islandId: 'island-2' }); },
    donate: () => service.donate({ uid: 'one', requestId: 'donation_shared_123', islandId: 'island-2' }) };
}

test('charity credits, daughter donations and refunds update the shared wallet once across cloud reloads', async () => {
  const f = charityFixture(); await f.fund(); await f.credit();
  await assertBalance(f.store, 6000);
  assert.equal((await f.credit()).alreadyApplied, true); await assertBalance(f.store, 6000);
  const donation = await f.donate(); await assertBalance(f.store, 5000);
  assert.equal((await f.donate()).alreadyApplied, true); await assertBalance(f.store, 5000);
  await f.service.cancelReservation({ donationId: donation.donation.id }); await assertBalance(f.store, 6000);
  assert.equal((await f.service.cancelReservation({ donationId: donation.donation.id })).alreadyApplied, true);
  await assertBalance(f.store, 6000);
  assert.equal(f.store.get('charityWallets/one').qualified, 1000);
  assert.equal(f.store.get('charityWallets/one').unqualified, 5000);
});

test('charity happiness reward stays on the requested daughter while coins stay in the account wallet', async () => {
  const f = charityFixture(); await f.fund(); await f.credit(); const donation = await f.donate();
  await f.service.confirmTransfer({ donationId: donation.donation.id, transferEventId: 'transfer_shared_123' });
  const result = await f.service.claimReward({ uid: 'one', donationId: donation.donation.id, islandId: 'island-2' });
  const state = await assertBalance(f.store, 5000);
  assert.equal(state.charityReward, undefined);
  assert.deepEqual(state.archipelago.islands['island-2'].charityReward, result.reward);
  const reopened = Arch.restoreArchipelago(state, adapters, NOW);
  assert.deepEqual(reopened.secondary.charityReward, result.reward);
  assert.equal((await f.service.claimReward({ uid: 'one', donationId: donation.donation.id, islandId: 'island-2' })).alreadyApplied, true);
  await assertBalance(f.store, 5000);
});

test('charity consolidates pre-wallet v32 island balances exactly once and rejects inconsistent existing wallets atomically', async () => {
  const old = snapshot(); delete old.archipelago.sharedWallet; old.resources.coins = 4000; old.archipelago.islands['island-2'].resources.coins = 1000;
  const f = charityFixture(old); await f.credit(); await assertBalance(f.store, 6000);
  assert.equal((await f.credit()).alreadyApplied, true); await assertBalance(f.store, 6000);
  for (const corrupt of [state => { state.archipelago.sharedWallet.coins++; }, state => { state.archipelago.islands['island-2'].resources.coins = 1; }]) {
    const state = snapshot(); corrupt(state); const bad = charityFixture(state), before = structuredClone(bad.store.records);
    await assert.rejects(bad.credit(), error => error.code === 'invalid-shared-wallet' && error.status === 409);
    assert.deepEqual(bad.store.records, before, 'no credit, receipt or balance changes on rejection');
  }
});

async function communityFixture(seed = snapshot()) {
  const store = new Store(); let at = NOW, sequence = 0;
  const service = createCommunityService({ store, environment: 'preprod', now: () => at });
  const call = (command, data = {}) => service.dispatch({ uid: 'one', command, requestId: `request_${String(++sequence).padStart(8, '0')}`, ...data });
  await call('profile', { name: 'Gracz jeden' }); const team = (await call('allianceCreate', { name: 'Załoga testowa' })).alliance;
  await call('leagueEnroll');
  const teamKey = `communitySeasons/2026-11/teams/${team.id}`, enrolled = store.get(teamKey);
  enrolled.scores = { one: { 1: { logic: { score: 80, goals: 5 }, arcade: { score: 80, goals: 5 } } } }; store.put(teamKey, enrolled);
  store.put('islands/one', { payload: JSON.stringify(seed), revision: 1, generation: 1 });
  at = Date.parse('2026-11-25T08:00:00Z');
  return { store, call: () => call('leagueClaimRewards', { season: '2026-11' }) };
}

test('league participation coins survive v32 cloud reloads and repeated award claims', async () => {
  const f = await communityFixture(), result = await f.call();
  assert.equal(result.awards.coins, 25); await assertBalance(f.store, 5025);
  assert.equal(f.store.get('charityWallets/one').qualified, 0);
  assert.equal(f.store.get('charityWallets/one').unqualified, 5025);
  assert.equal((await f.call()).alreadyClaimed, true); await assertBalance(f.store, 5025);
});

test('league awards consolidate missing v32 wallets once and reject inconsistent wallets before recording a claim', async () => {
  const old = snapshot(); delete old.archipelago.sharedWallet; old.resources.coins = 4000; old.archipelago.islands['island-2'].resources.coins = 1000;
  const f = await communityFixture(old); await f.call(); await assertBalance(f.store, 5025);
  assert.equal((await f.call()).alreadyClaimed, true); await assertBalance(f.store, 5025);
  const invalid = snapshot(); invalid.archipelago.sharedWallet.coins++;
  const bad = await communityFixture(invalid), before = structuredClone(bad.store.records);
  await assert.rejects(bad.call(), error => error.code === 'invalid-shared-wallet' && error.status === 409);
  assert.deepEqual(bad.store.records, before, 'no award, request receipt or balance changes on rejection');
});
