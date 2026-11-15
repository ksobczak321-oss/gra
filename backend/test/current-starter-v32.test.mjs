import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import test from 'node:test';
import { createServer, createCurrentStarterIsland, createStarterIsland } from '../server.mjs';
import { createAccountService, LEGAL_DOCUMENT_VERSIONS } from '../account-service.mjs';
import * as State from '../../harborlight-v1-state.js';
import { normalizeRuntimeWorld } from '../../harborlight-v1-runtime-upgrade.js';
const NOW = Date.parse('2026-11-15T12:00:00Z');
const normalize = raw => normalizeRuntimeWorld(raw, NOW, { upgradeRules: true, normalizeState: State.normalizeState });

class MemoryTransactions {
  records = new Map(); tail = Promise.resolve();
  get(path) { return structuredClone(this.records.get(path)); }
  runTransaction(work) {
    const operation = this.tail.then(async () => {
      const draft = new Map([...this.records].map(([path, value]) => [path, structuredClone(value)]));
      let wrote = false;
      const result = await work({
        get: async path => { assert.equal(wrote, false, 'transaction reads precede writes'); return structuredClone(draft.get(path)); },
        set: async (path, value) => { wrote = true; draft.set(path, structuredClone(value)); },
        delete: async path => { wrote = true; draft.delete(path); }
      });
      this.records = draft; return result;
    });
    this.tail = operation.catch(() => {}); return operation;
  }
}
async function serverFixture(t, { projectId = 'harborlight-dev', starter } = {}) {
  const production = projectId === 'harborlight-prod', uid = production ? 'new-player' : 'dev-admin1', store = new MemoryTransactions();
  const service = createAccountService({ store, now: () => NOW, environment: production ? 'production' : 'preprod' });
  if (production) await service.acceptLegal({ uid, ...LEGAL_DOCUMENT_VERSIONS, termsAccepted: true, privacyAcknowledged: true });
  const server = createServer({ environment: 'test', accountProjectId: projectId, now: () => NOW, accountService: service, verifyIdentityToken: async () => ({ uid }), ...(starter ? { starter } : {}) });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (method, body) => new Promise((resolve, reject) => {
    const encoded = body === undefined ? null : JSON.stringify(body);
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path: '/api/v1/island', method, agent: false, headers: { Authorization: 'Bearer verified-test-token', ...(encoded === null ? {} : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(encoded) }) } }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.once('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }));
    });
    req.once('error', reject); req.end(encoded);
  });
  return { store, service, uid, request };
}

test('current backend starter matches canonical frontend defaults and hydrates all eighteen immutable identities', () => {
  const seed = JSON.parse(createCurrentStarterIsland(NOW)), state = normalize(seed), canonical = normalize(State.createState(NOW, { ruleset: 32, onboarding: true }));
  assert.equal(seed.version, 9); assert.equal(seed.ruleset, 32); assert.equal(seed.population, 18); assert.equal(seed.capacity, 36); assert.equal(seed.residents.length, 18); assert.equal(new Set(seed.residents.map(p => p.personUid)).size, 18);
  assert.deepEqual(seed.resources, State.createState(NOW, { ruleset: 32, onboarding: true }).resources);
  for (const field of ['resources', 'buildings', 'residents', 'onboarding', 'welcome', 'houseHappinessPool', 'provisions', 'education', 'military']) assert.deepEqual(state[field], canonical[field], field);
  assert.equal(state.resources.food, 0); assert.equal(state.resources.vegetables, 100);
  assert.equal(state.houseHappinessPool.points, 18); assert.equal(state.education.foundingGranted, false); assert.equal(state.military.foundingGranted, false);
  assert.ok(Object.values(state.provisions.people).every(p => p.clothesSpare === 2 && p.starterClothesGranted));
  assert.equal(state.buildings.fisher.level, 1); assert.equal(state.buildings.slaughterhouse.level, 1); assert.equal(state.buildings.academy.level, 0); assert.equal(state.buildings.barracks.level, 0);
  const again = normalize(JSON.parse(JSON.stringify(state))); assert.deepEqual(again.resources, state.resources); assert.deepEqual(again.residents, state.residents); assert.deepEqual(again.houseHappinessPool, state.houseHappinessPool); assert.deepEqual(again.provisions.people, state.provisions.people);
});
test('current first entry stays frozen through a delayed tutorial, then uses the same welcome gifts as the frontend', () => {
  const after = NOW + 96 * 3600000, seed = JSON.parse(createCurrentStarterIsland(NOW)), state = State.normalizeState(seed, after);
  assert.equal(state.population, 18); assert.equal(state.islandStartedAt, null); assert.equal(State.advanceTo(state, after), 0); assert.equal(state.resources.vegetables, 100); assert.equal(State.onboardingStatus(state).pending, true);
  const frontend = State.normalizeState(State.createState(NOW, { ruleset: 32, onboarding: true }), after);
  for (const world of [state, frontend]) { assert.equal(State.act(world, { type: 'onboardingName', name: 'Nowa Wyspa' }, after).ok, true); assert.equal(State.act(world, { type: 'onboardingFinish' }, after).ok, true); }
  assert.equal(state.islandStartedAt, after); assert.equal(State.welcomeStatus(state).remaining, 72 * 3600);
  assert.equal(state.population, frontend.population); assert.deepEqual(state.resources, frontend.resources); assert.deepEqual(state.welcomeWorkers, frontend.welcomeWorkers);
});
test('both official cloud project APIs create current worlds and repeated creation never overwrites existing progress', async t => {
  for (const projectId of ['harborlight-dev', 'harborlight-prod']) {
    const f = await serverFixture(t, { projectId });
    assert.equal((await f.request('POST', { payload: '{"population":100}' })).status, 400); assert.equal(f.store.get(`islands/${f.uid}`), undefined);
    const started = await f.request('POST', {}); assert.equal(started.status, 201); const world = JSON.parse(started.body.island.payload);
    assert.equal(world.ruleset, 32); assert.equal(world.population, 18); assert.equal(world.residents.length, 18); assert.equal(world.resources.vegetables, 100); assert.equal(world.resources.food, 0);
    assert.equal(started.body.island.version.revision, 1); assert.equal(started.body.account.generation, 1);
    const original = f.store.get(`islands/${f.uid}`), changed = JSON.parse(original.payload); changed.resources.coins = 4321; changed.buildings.townhall.level = 5;
    await f.service.saveIsland({ uid: f.uid, payload: JSON.stringify(changed), expectedRevision: 1, generation: 1 });
    const before = f.store.get(`islands/${f.uid}`); const rejected = await f.request('POST', {}); assert.equal(rejected.status, 409); assert.equal(rejected.body.error, 'island-already-exists'); assert.deepEqual(f.store.get(`islands/${f.uid}`), before);
    assert.equal((await f.request('GET')).body.island.payload, before.payload);
  }
});
test('unconfigured historical fixtures and explicitly injected starter factories retain their contracts', async t => {
  const legacy = await serverFixture(t, { projectId: 'test-project' }); const original = await legacy.request('POST', {}); assert.equal(original.status, 201); assert.equal(JSON.parse(original.body.island.payload).population, 12);
  const injected = await serverFixture(t, { starter: at => { const state = JSON.parse(createStarterIsland(at)); state.resources.coins = 321; return JSON.stringify(state); } });
  const created = await injected.request('POST', {}); assert.equal(created.status, 201); const state = JSON.parse(created.body.island.payload); assert.equal(state.population, 12); assert.equal(state.resources.coins, 321);
  for (const at of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) assert.throws(() => createCurrentStarterIsland(at), TypeError);
});
