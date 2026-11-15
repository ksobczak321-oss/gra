import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccountService } from '../account-service.mjs';
import { createPlayerTradeService, PLAYER_TRADE_V32_PRICE_VERSION } from '../player-trade.mjs';
import { createCurrentStarterIsland } from '../starter-island.mjs';
import { CURRENT_TRADE_RULES } from '../trade-rules-v32.mjs';
const NOW = Date.parse('2026-11-15T12:00:00Z');

class Store {
  records = new Map();
  get(key) { return structuredClone(this.records.get(key)); }
  async runTransaction(work) {
    const draft = structuredClone(this.records);
    let wrote = false;
    const result = await work({
      get: async key => { assert.equal(wrote, false); return structuredClone(draft.get(key)); },
      set: async (key, value) => { wrote = true; draft.set(key, structuredClone(value)); },
      delete: async key => { wrote = true; draft.delete(key); }
    });
    this.records = draft;
    return result;
  }
}
function world(id = 'island-1') {
  const state = JSON.parse(createCurrentStarterIsland(NOW));
  state.islandId = id; state.islandRole = id === 'island-1' ? 'mother' : 'daughter';
  state.islandStartedAt = NOW - 100000; state.onboarding.stage = 'done';
  state.onboarding.worldStartedAt = state.islandStartedAt;
  state.buildings.townhall.level = 6;
  state.resources.civilianClothes = 30;
  return state;
}
function fixture({ daughter = false, milk = false } = {}) {
  const store = new Store();
  for (const uid of ['dev-admin1', 'dev-admin2']) {
    const state = world();
    if (daughter) {
      const child = world('island-2'); child.resources.coins = 0;
      state.archipelago = { version: 2, activeIslandId: 'island-2', shipCapacity: 1000, ship: null,
        sharedWallet: { version: 1, coins: 100 }, islands: { 'island-2': child } };
    }
    if (milk && uid === 'dev-admin1') {
      CURRENT_TRADE_RULES.depositMilk(state, 100, [{ amount: 100, centralSeconds: 86400 }]);
    }
    store.records.set(`accounts/${uid}`, { islandGeneration: 1, lastPlayedAt: NOW });
    store.records.set(`islands/${uid}`, { payload: JSON.stringify(state), revision: 4, generation: 1, updatedAt: NOW });
  }
  const service = createPlayerTradeService({ store, environment: 'preprod', now: () => NOW, v32: CURRENT_TRADE_RULES });
  const accounts = createAccountService({ store, environment: 'preprod', now: () => NOW });
  const read = async uid => JSON.parse((await accounts.readIsland({ uid })).island.payload);
  return { store, service, read };
}
const offer = (f, extra = {}) => f.service.createOffer({ uid: 'dev-admin1', requestId: 'offer_current_123',
  generation: 1, expectedRevision: 4, islandId: 'island-1',
  give: { resource: 'civilianClothes', amount: 10 }, want: { resource: 'coins', amount: 1 }, ...extra });

test('isolated cloud trade adapter sells current goods with conserved escrow and exactly-once payment', async () => {
  const f = fixture(), created = await offer(f);
  assert.equal(created.offer.priceVersion, PLAYER_TRADE_V32_PRICE_VERSION);
  assert.equal((await f.read('dev-admin1')).resources.civilianClothes, 20);
  const command = { uid: 'dev-admin2', offerId: created.offer.id, requestId: 'accept_current_123',
    generation: 1, expectedRevision: 4, islandId: 'island-1' };
  await f.service.acceptOffer(command);
  let seller = await f.read('dev-admin1'), buyer = await f.read('dev-admin2');
  assert.equal(seller.resources.civilianClothes, 20); assert.equal(buyer.resources.civilianClothes, 40);
  assert.equal(seller.resources.coins, 101); assert.equal(buyer.resources.coins, 99);
  assert.equal((await f.service.acceptOffer(command)).alreadyApplied, true);
  assert.equal((await f.read('dev-admin2')).resources.coins, 99);
});

test('a current daughter purchase debits the shared wallet while goods remain on their selected islands', async () => {
  const f = fixture({ daughter: true }), created = await offer(f, { islandId: 'island-2' });
  await f.service.acceptOffer({ uid: 'dev-admin2', offerId: created.offer.id, requestId: 'accept_daughter_123',
    generation: 1, expectedRevision: 4, islandId: 'island-2' });
  const seller = await f.read('dev-admin1'), buyer = await f.read('dev-admin2');
  for (const [state, balance] of [[seller, 101], [buyer, 99]]) {
    assert.equal(state.resources.coins, balance); assert.equal(state.archipelago.sharedWallet.coins, balance);
    assert.equal(state.archipelago.islands['island-2'].resources.coins, 0);
    assert.equal(state.resources.civilianClothes, 30);
  }
  assert.equal(seller.archipelago.islands['island-2'].resources.civilianClothes, 20);
  assert.equal(buyer.archipelago.islands['island-2'].resources.civilianClothes, 40);
});

test('current milk escrow and delivery retain the original central age', async () => {
  const f = fixture({ milk: true }), created = await offer(f, { give: { resource: 'rawMilk', amount: 10 } });
  await f.service.acceptOffer({ uid: 'dev-admin2', offerId: created.offer.id, requestId: 'accept_milk_123',
    generation: 1, expectedRevision: 4, islandId: 'island-1' });
  const seller = await f.read('dev-admin1'), buyer = await f.read('dev-admin2');
  assert.equal(seller.resources.rawMilk, 90); assert.equal(buyer.resources.rawMilk, 10);
  assert.deepEqual(buyer.provisions.milkLots.map(({ amount, centralSeconds }) => ({ amount, centralSeconds })), [{ amount: 10, centralSeconds: 86400 }]);
});
