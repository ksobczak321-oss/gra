import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import { once } from 'node:events';
import { createAccountService, LEGAL_DOCUMENT_VERSIONS, threeMonthDeadline } from '../account-service.mjs';
import { createServer } from '../server.mjs';
import { createState, normalizeState, advanceTo } from '../../harborlight-v1-state.js';
import * as Arch from '../../harborlight-v1-archipelago.js';

const NOW = Date.parse('2026-11-02T12:00:00Z');
const ADAPTERS = { createState, normalizeState, advanceTo };
class Store {
  records = new Map(); tail = Promise.resolve();
  get(path) { return structuredClone(this.records.get(path)); }
  put(path, value) { this.records.set(path, structuredClone(value)); }
  runTransaction(work) {
    const run = this.tail.then(async () => {
      const draft = new Map([...this.records].map(([key,value]) => [key,structuredClone(value)]));
      let wrote = false;
      const result = await work({
        get: async key => { assert.equal(wrote, false, 'Firestore reads precede writes'); return structuredClone(draft.get(key)); },
        set: async (key,value) => { wrote = true; draft.set(key,structuredClone(value)); },
        delete: async key => { wrote = true; draft.delete(key); }
      });
      this.records = draft; return result;
    });
    this.tail = run.catch(() => {}); return run;
  }
}
function world() {
  const state = createState(NOW); state.islandName = 'Port'; state.buildings.townhall.level = 10;
  state.buildings.warehouse.level = 10; state.population = 18;
  for (const id of Object.keys(state.resources)) state.resources[id] = 100000;
  const bundle = Arch.restoreArchipelago(state, ADAPTERS, NOW);
  assert.equal(Arch.createNextIsland(bundle, { name: 'Zatoka' }, NOW).ok, true);
  bundle.primary.resources.coins = 300; bundle.secondary.resources.coins = 1000;
  bundle.activeIslandId = 'island-2';
  return Arch.serializeArchipelago(bundle);
}
function fixture(state = world(), environment = 'production') {
  const store = new Store(); let at = NOW;
  store.put('accounts/person', { createdAt: NOW - 20 * 86400000, islandGeneration: 1, lastPlayedAt: NOW });
  store.put('islands/person', { schemaVersion: 1, revision: 7, generation: 1, updatedAt: NOW, payload: JSON.stringify(state) });
  store.put('charityWallets/person', { qualified: 300, unqualified: 1000, revision: 4 });
  const service = createAccountService({ store, now: () => at, environment });
  const buy = patch => service.purchaseShipCapacity({ uid: 'person', requestId: 'capacity-test-1', units: 1,
    islandId: 'island-2', generation: 1, expectedRevision: 7, ...patch });
  const read = async () => JSON.parse((await service.readIsland({ uid: 'person' })).island.payload);
  return { store, service, buy, read, time: value => { at = value; } };
}
const rejects = (action, code) => assert.rejects(action, error => error.code === code);

test('trusted capacity command debits the saved active island and returns an immediately restorable canonical receipt', async () => {
  const f = fixture(), result = await f.buy({ units: 2 });
  assert.equal(result.ok, true); assert.equal(result.coins, 100); assert.equal(result.capacity, 3000);
  assert.equal(result.islandUpdate.version.revision, 8); assert.equal(result.islandUpdate.generation, 1);
  assert.deepEqual(result.receipt, { id: 'capacity-test-1', kind: 'ship-capacity-coins', units: 2, coins: 100, payerIslandId: 'island-2', at: NOW });
  const saved = await f.read(); assert.equal(saved.resources.coins, 300); assert.equal(saved.archipelago.islands['island-2'].resources.coins, 900);
  assert.deepEqual(saved.commerce.capacityPurchases, [result.receipt]); assert.deepEqual(saved.archipelago.capacityReceipts, [result.receipt]);
  assert.equal(saved.commerce.receipts.length, 0, 'capacity is not a Paynow purchase');
  const restored = Arch.restoreArchipelago(JSON.parse(result.islandUpdate.payload), { ...ADAPTERS, environment: 'production' }, NOW);
  assert.equal(restored.shipCapacity, 3000); assert.equal(Arch.archipelagoStatus(restored).passengerCapacity, 100);
  assert.equal(f.store.get('charityWallets/person').qualified, 300); assert.equal(f.store.get('charityWallets/person').unqualified, 900);
  assert.deepEqual(f.store.get('accounts/person/shipCapacityPurchases/capacity-test-1').receipt, result.receipt);
});
test('concurrent retries charge once even with the original revision and reject altered units or payer', async () => {
  const f = fixture(), results = await Promise.all(Array.from({ length: 8 }, () => f.buy()));
  assert.equal(results.filter(result => !result.duplicate).length, 1); assert.ok(results.every(result => result.capacity === 2000));
  assert.equal((await f.read()).archipelago.islands['island-2'].resources.coins, 950);
  await rejects(f.buy({ units: 2 }), 'ship-capacity-request-reused');
  await rejects(f.buy({ islandId: 'island-1' }), 'ship-capacity-request-reused');
  await rejects(f.buy({ requestId: 'new-request' }), 'island-conflict');
  assert.equal((await f.service.readIsland({ uid: 'person' })).island.version.revision, 8);
});
test('unaffordable, malformed, inactive-island and stale-generation capacity requests are atomic', async () => {
  const f = fixture(), before = structuredClone(f.store.records);
  for (const [patch, code] of [
    [{ units: 0 }, 'ship-capacity-invalid-units'], [{ units: 101 }, 'ship-capacity-invalid-units'],
    [{ units: 0.5 }, 'ship-capacity-invalid-units'], [{ units: 100 }, 'ship-capacity-insufficient-coins'],
    [{ requestId: '../bad' }, 'ship-capacity-invalid-request'], [{ islandId: 'island-1' }, 'ship-capacity-active-island-changed'],
    [{ expectedRevision: 6 }, 'island-conflict'], [{ generation: 2 }, 'island-expired']
  ]) await rejects(f.buy(patch), code);
  assert.deepEqual(f.store.records, before);
});
test('a single island cannot buy cargo capacity and altered ledgers fail without spending', async () => {
  const one = createState(NOW), f = fixture(one);
  await rejects(f.buy({ islandId: 'island-1' }), 'ship-capacity-second-island-required');
  const changed = world(); changed.archipelago.shipCapacity = 2000;
  const broken = fixture(changed); await rejects(broken.buy(), 'ship-capacity-invalid-ledger');
  assert.equal((await broken.read()).archipelago.islands['island-2'].resources.coins, 1000);
});
test('known capacity spending consumes nonqualifying coins first, then only the necessary qualified balance', async () => {
  const f = fixture(); f.store.put('charityWallets/person', { qualified: 1280, unqualified: 20, revision: 4 });
  await f.buy(); const wallet = f.store.get('charityWallets/person');
  assert.equal(wallet.qualified, 1250); assert.equal(wallet.unqualified, 0); assert.equal(wallet.revision, 5);
});
test('legacy cash capacity survives a new coin purchase without replaying or replacing old receipts', async () => {
  const state = world(), receipt = { id: 'old-payment', units: 2, grossGrosz: 998, simulated: true, at: NOW - 10000 };
  state.archipelago.capacityReceipts = [receipt]; state.archipelago.shipCapacity = 3000;
  state.commerce.receipts = [{ id: receipt.id, kind: 'ship-capacity', grossGrosz: receipt.grossGrosz, simulated: true, at: receipt.at }];
  const f = fixture(state, 'preprod'), result = await f.buy(); assert.equal(result.capacity, 4000);
  const saved = await f.read(); assert.deepEqual(saved.archipelago.capacityReceipts[0], receipt);
  assert.deepEqual(saved.commerce.receipts, state.commerce.receipts); assert.equal(saved.commerce.capacityPurchases.length, 1);
  assert.equal(Arch.restoreArchipelago(saved, ADAPTERS, NOW).shipCapacity, 4000);
});
test('production autosave cannot forge, replace or remove the trusted coin-capacity ledger', async () => {
  const f = fixture(); await f.buy(); let state = await f.read();
  const canonical = structuredClone(state.commerce.capacityPurchases);
  state.commerce.capacityPurchases = [{ ...canonical[0], id: 'forged' }]; state.archipelago.capacityReceipts = [];
  await f.service.saveIsland({ uid: 'person', generation: 1, expectedRevision: 8, payload: JSON.stringify(state) });
  state = await f.read(); assert.deepEqual(state.commerce.capacityPurchases, canonical); assert.deepEqual(state.archipelago.capacityReceipts, canonical);
  state.archipelago.shipCapacity += 1000;
  await rejects(f.service.saveIsland({ uid: 'person', generation: 1, expectedRevision: 9, payload: JSON.stringify(state) }), 'unverified-ship-capacity');
});
test('capacity entitlements survive expiry and recreation while old generations cannot buy', async () => {
  const f = fixture(); await f.buy(); f.time(threeMonthDeadline(NOW)); await f.service.expireIsland({ uid: 'person' });
  await rejects(f.buy(), 'island-expired');
  await f.service.acceptLegal({ uid: 'person', ...LEGAL_DOCUMENT_VERSIONS, termsAccepted: true, privacyAcknowledged: true });
  await f.service.startIsland({ uid: 'person', payload: JSON.stringify(createState(NOW)) });
  const raw = await f.read(), restored = Arch.restoreArchipelago(raw, ADAPTERS, NOW);
  assert.equal(restored.shipCapacity, 2000); assert.equal(restored.secondary, null);
  assert.equal(f.store.get('accounts/person/shipCapacityPurchases/capacity-test-1').receipt.coins, 50);
});
test('trusted first creation and Warsaw activity dates persist, deduplicate and retain at most365days', async () => {
  const store = new Store(); let at = Date.parse('2026-10-30T22:59:00Z');
  const service = createAccountService({ store, now: () => at, environment: 'preprod' });
  await service.startIsland({ uid: 'fresh', payload: JSON.stringify(createState(at)) });
  const createdAt = at;
  assert.equal(store.get('accounts/fresh').createdAt, at); assert.deepEqual(store.get('accounts/fresh').activePlayDays, ['2026-10-30']);
  await service.recordActivity({ uid: 'fresh', generation: 1 });
  at += 120000; await service.recordActivity({ uid: 'fresh', generation: 1 });
  assert.deepEqual(store.get('accounts/fresh').activePlayDays, ['2026-10-30','2026-10-31']); assert.equal(store.get('accounts/fresh').createdAt, createdAt);
  const account = store.get('accounts/fresh'); account.activePlayDays = Array.from({ length: 400 }, (_,i) => new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10)); store.put('accounts/fresh', account);
  await service.recordActivity({ uid: 'fresh', generation: 1 }); assert.equal(store.get('accounts/fresh').activePlayDays.length, 365);
  assert.equal(store.get('accounts/fresh').activePlayDays.at(-1), '2026-10-31');
  const doc = store.get('islands/fresh'), state = JSON.parse(doc.payload); state.createdAt = 1; state.activePlayDays = ['2000-01-01'];
  await service.saveIsland({ uid: 'fresh', generation: 1, expectedRevision: 1, payload: JSON.stringify(state) });
  assert.equal(store.get('accounts/fresh').createdAt, createdAt); assert.equal(store.get('accounts/fresh').activePlayDays.at(-1), '2026-10-31');
});
test('legacy account migration records first trusted observation without inventing past active days', async () => {
  const f = fixture(); f.store.put('accounts/person', { islandGeneration: 1, lastPlayedAt: NOW });
  await f.service.recordActivity({ uid: 'person', generation: 1 });
  assert.equal(f.store.get('accounts/person').createdAt, NOW); assert.deepEqual(f.store.get('accounts/person').activePlayDays, ['2026-11-02']);
});
test('HTTP capacity and donation routes authenticate identity and whitelist economic command fields', async t => {
  const calls = [], accountService = { purchaseShipCapacity: async input => { calls.push(['capacity',input]); return { ok: true }; } };
  const charityService = { donate: async input => { calls.push(['donate',input]); return { ok: true }; } };
  const server = createServer({ environment: 'test', accountService, charityService,
    verifyIdentityToken: async token => token === 'valid' ? { uid: 'verified' } : Promise.reject({ code: 'auth-required', status: 401 }) });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => new Promise(resolve => server.close(resolve)));
  const send = (path, body, authorization = 'Bearer valid', method = 'POST') => new Promise((resolve,reject) => {
    const encoded = JSON.stringify(body), req = http.request({ host: '127.0.0.1', port: server.address().port, path, method, agent: false,
      headers: { ...(authorization ? { Authorization: authorization } : {}), 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(encoded) } }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(chunks)) }));
    }); req.on('error', reject); req.end(encoded);
  });
  const body = { uid: 'victim', requestId: 'capacity-api', units: 3, islandId: 'island-2', generation: 1, expectedRevision: 7, price: 0, verified: true, at: 1 };
  assert.equal((await send('/api/v1/ship-capacity',body,null)).status, 401); assert.equal(calls.length,0);
  assert.equal((await send('/api/v1/ship-capacity',body)).status, 200);
  assert.deepEqual(calls[0], ['capacity',{ uid:'verified', requestId:body.requestId, units:3, islandId:'island-2', generation:1, expectedRevision:7 }]);
  assert.equal((await send('/api/v1/ship-capacity',body,'Bearer valid','PUT')).status, 405);
  assert.equal((await send('/api/v1/charity',{ ...body, command:'donate', amount:200 })).status, 200);
  assert.deepEqual(calls[1], ['donate',{ uid:'verified', requestId:body.requestId, islandId:'island-2', amount:200 }]);
});
