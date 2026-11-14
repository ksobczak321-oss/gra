import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLocalDevRuntime, LOCAL_DEV_PASSWORD, LOCAL_DEV_PROJECT } from '../backend/dev-runtime.mjs';
import { accountSaveKey, createDevCloud, createDevTimeController, LOCAL_DEV_SESSION_KEY, SESSION_KEY, PROD_SESSION_KEY } from '../harborlight-dev-cloud.js';
import { createState } from '../harborlight-v1-state.js';
import { normalizeKingdom } from '../harborlight-v1-kingdom.js';
import { warehouseCapacityForLevel } from '../harborlight-v1-economy.js';
import { maximumTradePrice, PLAYER_TRADE_V32_PRICE_VERSION } from '../backend/player-trade.mjs';
import { createDevSync } from '../harborlight-dev-sync.js';
import { kingdomServiceAction } from '../harborlight-v1-kingdom-client.js';
import { GOODS, normalizeProvisions, compactDietHistories } from '../harborlight-v1-provisions.js';
import { compactResidentSnapshot } from '../harborlight-v1-archipelago.js';

class MetadataStorage {
  records = new Map();
  getItem(key) { return this.records.get(key) ?? null; }
  setItem(key, value) { this.records.set(key, value); }
  removeItem(key) { this.records.delete(key); }
}
async function fixture(t, options = {}) {
  const runtime = await createLocalDevRuntime({ ephemeral: true, ...options }), address = await runtime.listen(0);
  const base = `http://127.0.0.1:${address.port}`;
  t.after(() => runtime.close());
  const client = (storage = new MetadataStorage(), hostname = '127.0.0.1') => createDevCloud({ hostname, localDevelopment: true, storage, ...(options.now ? { now: options.now } : {}), fetch: (path, init) => fetch(base + path, init) });
  const raw = async (path, init = {}) => {
    const result = await fetch(base + path, { ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
    return { status: result.status, body: result.headers.get('Content-Type')?.startsWith('application/json') ? await result.json() : await result.text(), headers: result.headers };
  };
  return { ...runtime, base, client, raw };
}
async function enter(cloud, login) {
  assert.equal((await cloud.signIn(login, LOCAL_DEV_PASSWORD)).login, login);
  return await cloud.loadIsland() || await cloud.createIsland();
}
const forbidden = code => error => error.code === code;
async function makeAlliance(a, b) {
  const created = await a.requestGameService('/api/v1/community', { command: 'allianceCreate', requestId: 'dev_alliance_create', name: 'Port DEV' });
  await b.requestGameService('/api/v1/community', { command: 'allianceApply', requestId: 'dev_alliance_apply', allianceId: created.alliance.id });
  const players = await a.requestGameService('/api/v1/community');
  const player = players.players.find(row => row.name === 'admin2');
  await a.requestGameService('/api/v1/community', { command: 'allianceApprove', requestId: 'dev_alliance_approve', playerId: player.id });
  return player.id;
}
async function serviceAction(cloud, path, action, requestId) {
  const current = await cloud.requestGameService(path);
  return cloud.requestGameService(path, { action, requestId, expectedRevision: current.island.version.revision, generation: current.island.generation });
}

test('DEV explicitly handshakes with a separate project and exposes usable account readiness', async t => {
  const f = await fixture(t), cloud = f.client();
  const ready = await f.raw('/readyz');
  assert.equal(ready.status, 200); assert.equal(ready.body.projectId, LOCAL_DEV_PROJECT);
  assert.equal(ready.body.features.accounts, true); assert.equal(ready.body.features.persistence, true);
  assert.equal(ready.body.persistence, 'server-process-memory');
  assert.equal(cloud.local, true); assert.equal(cloud.preprod, false);
  assert.equal((await cloud.getPublicConfig()).localDev, true);
  assert.notEqual(accountSaveKey('dev-admin1', LOCAL_DEV_PROJECT), accountSaveKey('dev-admin1'));
  const staticCloud = createDevCloud({ hostname: 'localhost', storage: new MetadataStorage(), fetch: () => { throw Error('must not call'); } });
  assert.equal(staticCloud.enabled, false);
  const production = createDevCloud({ hostname: 'harborlight.pl', localDevelopment: true, storage: new MetadataStorage() });
  assert.equal(production.projectId, 'harborlight-prod'); assert.notEqual(production.local, true);
});

test('localhost bootstrap needs the server handshake before sending a password', async () => {
  const calls = [];
  const cloud = createDevCloud({ hostname: 'localhost', localDevelopment: true, storage: new MetadataStorage(), fetch: async (path, init) => {
    calls.push({ path, init }); return Response.json({ localDev: true, accountApi: true, projectId: 'harborlight-dev', environment: 'preprod' });
  } });
  await assert.rejects(cloud.signIn('admin1', LOCAL_DEV_PASSWORD), forbidden('configuration'));
  assert.deepEqual(calls.map(row => row.path), ['/api/dev/config']);
  assert.ok(calls.every(row => !row.init.body));
});

test('fresh DEV fixture uses current rules, Polish introduction and full model, with no Firebase requests', async t => {
  const f = await fixture(t), cloud = f.client(), island = await enter(cloud, 'admin1');
  const state = JSON.parse(island.payload);
  assert.equal(state.ruleset, 32);
  assert.equal(state.population, 18);
  assert.equal(state.buildings.townhall.level, 1);
  assert.equal(state.settings.language, 'pl'); assert.equal(state.onboarding.stage, 'intro');
  assert.equal(state.islandStartedAt, null);
  assert.equal(state.resources.coins, 100);
});

test('parallel accounts, CAS conflicts and browser reload preserve server data without browser game saves', async t => {
  const f = await fixture(t), storageA = new MetadataStorage(), storageB = new MetadataStorage(), a = f.client(storageA), b = f.client(storageB);
  const [firstA, firstB] = await Promise.all([enter(a, 'admin1'), enter(b, 'admin2')]);
  const stateA = JSON.parse(firstA.payload), stateB = JSON.parse(firstB.payload);
  stateA.resources.coins = 123; stateB.resources.coins = 456;
  stateA.integrationSidecar = { teacher: { completedRounds: [1, 2] }, pending: ['keep'] };
  const [savedA, savedB] = await Promise.all([a.saveIsland(JSON.stringify(stateA), firstA.version), b.saveIsland(JSON.stringify(stateB), firstB.version)]);
  assert.equal(savedA.revision, 2); assert.equal(savedB.revision, 2);
  await assert.rejects(a.saveIsland(JSON.stringify(stateA), firstA.version), forbidden('conflict'));
  const reloadedA = f.client(storageA), reloadedB = f.client(storageB);
  assert.equal((await reloadedA.restoreSession()).login, 'admin1');
  assert.equal((await reloadedB.restoreSession()).login, 'admin2');
  const [againA, againB] = await Promise.all([reloadedA.loadIsland(), reloadedB.loadIsland()]);
  assert.equal(JSON.parse(againA.payload).resources.coins, 123);
  assert.equal(JSON.parse(againB.payload).resources.coins, 456);
  assert.deepEqual(JSON.parse(againA.payload).integrationSidecar, stateA.integrationSidecar);
  assert.equal(againA.version.revision, 2);
  for (const storage of [storageA, storageB]) {
    assert.deepEqual([...storage.records.keys()], [LOCAL_DEV_SESSION_KEY]);
    const metadata = JSON.parse(storage.getItem(LOCAL_DEV_SESSION_KEY));
    assert.deepEqual(Object.keys(metadata).sort(), ['expiresAt', 'idToken', 'lastActivityAt', 'login', 'projectId', 'uid']);
    assert.ok(!JSON.stringify(metadata).includes('resources'));
    assert.equal(storage.getItem(SESSION_KEY), null); assert.equal(storage.getItem(PROD_SESSION_KEY), null);
  }
});

test('local authentication rejects unknown accounts, forgery and revoked sessions', async t => {
  const f = await fixture(t), storage = new MetadataStorage(), cloud = f.client(storage);
  await assert.rejects(cloud.signIn('admin4', LOCAL_DEV_PASSWORD), forbidden('invalid-login'));
  await assert.rejects(cloud.signIn('admin1', 'wrong'), forbidden('invalid-credentials'));
  assert.equal((await f.raw('/api/v1/island')).status, 401);
  assert.equal((await f.raw('/api/v1/island', { headers: { Authorization: 'Bearer hl-local.' + 'a'.repeat(43) } })).status, 401);
  await enter(cloud, 'admin1');
  const token = JSON.parse(storage.getItem(LOCAL_DEV_SESSION_KEY)).idToken;
  await cloud.signOut(); assert.equal(storage.getItem(LOCAL_DEV_SESSION_KEY), null);
  assert.equal((await f.raw('/api/v1/island', { headers: { Authorization: `Bearer ${token}` } })).status, 401);
  await assert.rejects(cloud.loadIsland(), forbidden('auth-required'));
});

test('active local sessions refresh past one hour without renewing the human idle deadline', async t => {
  let at = Date.parse('2026-11-14T12:00:00Z');
  const f = await fixture(t, { now: () => at }), storage = new MetadataStorage(), cloud = f.client(storage);
  await enter(cloud, 'admin1');
  const initialExpiry = JSON.parse(storage.getItem(LOCAL_DEV_SESSION_KEY)).expiresAt;
  for (let i = 0; i < 4; i++) {
    at += 20 * 60000; assert.equal(cloud.recordSessionActivity(), true);
    assert.ok(await cloud.loadIsland());
  }
  const refreshed = JSON.parse(storage.getItem(LOCAL_DEV_SESSION_KEY));
  assert.ok(refreshed.expiresAt > initialExpiry);
  assert.equal(refreshed.lastActivityAt, at);
  at += 30 * 60000 + 30001;
  await assert.rejects(cloud.loadIsland(), forbidden('auth-required'));
  assert.equal(storage.getItem(LOCAL_DEV_SESSION_KEY), null);
});

test('the local server refuses foreign Host/Origin and serves only the public build allowlist', async t => {
  const f = await fixture(t);
  for (const path of ['/AGENTS.md', '/docs/v32/USER-DECISIONS.json', '/.git/config', '/backend/dev-runtime.mjs', '/scripts/serve-dev.mjs', '/%2e%2e/.aws/credentials']) {
    assert.equal((await f.raw(path)).status, 404, path);
  }
  assert.equal((await f.raw('/harborlight-v1-state.js')).status, 200);
  const auth = await f.raw('/harborlight-auth.html');
  assert.equal(auth.status, 200); assert.match(auth.body, /__HARBORLIGHT_LOCAL_DEV__/);
  const foreignHostStatus = await new Promise((resolve, reject) => {
    const request = http.get(f.base + '/api/dev/config', { headers: { Host: 'harborlight.pl' } }, response => { response.resume(); response.once('end', () => resolve(response.statusCode)); });
    request.once('error', reject);
  });
  assert.equal(foreignHostStatus, 403);
  assert.equal((await f.raw('/api/dev/sign-in', { method: 'POST', headers: { Origin: 'https://attacker.invalid' }, body: JSON.stringify({ login: 'admin1', password: LOCAL_DEV_PASSWORD }) })).status, 403);
  await assert.rejects(f.listen(0, '0.0.0.0'), /loopback/);
});

test('only admin3 has idempotent DEV time control and other accounts keep their clock', async t => {
  const f = await fixture(t, { now: () => 1_800_000_000_000 }), a = f.client(), c = f.client();
  await enter(a, 'admin1'); await enter(c, 'admin3');
  const aTime = createDevTimeController(a), cTime = createDevTimeController(c);
  assert.equal((await aTime.status()).canAdvance, false);
  await assert.rejects(aTime.advance(3600, 'clock_request_1'), forbidden('permission'));
  const before = await cTime.status(), advanced = await cTime.advance(3600, 'clock_request_1');
  assert.equal(advanced.now, before.now + 3_600_000); assert.equal(advanced.advancedSeconds, 3600);
  const repeated = await cTime.advance(3600, 'clock_request_1');
  assert.equal(repeated.alreadyApplied, true); assert.equal(repeated.offsetSeconds, 3600); assert.equal(repeated.advancedSeconds, 0);
  assert.equal((await aTime.status()).offsetSeconds, 0);
  const prodClock = createDevTimeController({ local: false });
  await assert.rejects(prodClock.advance(3600), forbidden('permission'));
});

test('community chat uses real independent DEV accounts and deduplicates one request', async t => {
  const f = await fixture(t), a = f.client(), b = f.client();
  await Promise.all([enter(a, 'admin1'), enter(b, 'admin2')]);
  const directory = await a.requestGameService('/api/v1/community');
  const other = directory.players.find(player => player.name === 'admin2'); assert.ok(other);
  const command = { command: 'chatSend', requestId: 'dev_chat_request_1', channel: 'direct', targetId: other.id, text: 'Wiadomość z lokalnego DEV.' };
  const first = await a.requestGameService('/api/v1/community', command);
  const second = await a.requestGameService('/api/v1/community', command);
  assert.equal(second.alreadyApplied, true); assert.equal(first.message.id, second.message.id);
  const read = await b.requestGameService('/api/v1/community', { command: 'chatRead', channel: 'direct', targetId: directory.self.id });
  assert.equal(read.messages.length, 1); assert.equal(read.messages[0].text, command.text);
});

test('two buyers racing for one escrow offer yield one atomic trade and one receipt', async t => {
  const f = await fixture(t), clients = [f.client(), f.client(), f.client()];
  for (const [index, cloud] of clients.entries()) {
    const initial = await enter(cloud, `admin${index + 1}`), state = JSON.parse(initial.payload);
    state.islandStartedAt = Date.now() - 1000; state.buildings.townhall.level = 6; state.buildings.warehouse.level = 6;
    state.resources.coins = 500; state.resources.wood = 500;
    await cloud.saveIsland(JSON.stringify(state), initial.version);
  }
  const [seller, b, c] = clients, loaded = await seller.loadIsland();
  const create = { requestId: 'dev_offer_request_1', generation: loaded.generation, expectedRevision: loaded.version.revision, islandId: 'island-1', give: { resource: 'wood', amount: 100 }, want: { resource: 'coins', amount: 25 } };
  const made = await seller.createTradeOffer(create);
  assert.equal((await seller.createTradeOffer(create)).alreadyApplied, true);
  assert.equal((await b.listTradeOffers()).offers.length, 1);
  const buyers = await Promise.all([b.loadIsland(), c.loadIsland()]);
  const attempts = await Promise.allSettled([b, c].map((cloud, i) => cloud.acceptTradeOffer(made.offer.id, { requestId: `dev_accept_request_${i}`, generation: buyers[i].generation, expectedRevision: buyers[i].version.revision, islandId: 'island-1' })));
  assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(attempts.find(result => result.status === 'rejected').reason.code, 'trade-offer-closed');
  const states = await Promise.all(clients.map(async cloud => JSON.parse((await cloud.loadIsland()).payload)));
  assert.equal(states.reduce((sum, state) => sum + state.resources.coins, 0), 1500);
  assert.equal(states.reduce((sum, state) => sum + state.resources.wood, 0), 1500);
  assert.equal(states[0].resources.coins, 525); assert.equal(states[0].resources.wood, 400);
});

test('local DEV restarts restore durable progress and never restore authentication sessions', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'harborlight-local-dev-')), dataFile = join(directory, 'state-v32.json');
  t.after(() => rm(directory, { recursive: true, force: true }));
  const first = await fixture(t, { dataFile, ephemeral: false }), storage = new MetadataStorage(), a = first.client(storage);
  const initial = await enter(a, 'admin1'), state = JSON.parse(initial.payload); state.resources.coins = 321;
  await a.saveIsland(JSON.stringify(state), initial.version);
  const c = first.client(); await enter(c, 'admin3');
  await createDevTimeController(c).advance(3600, 'durable_clock_request');
  const saved = JSON.parse(await readFile(dataFile, 'utf8'));
  assert.equal(saved.projectId, LOCAL_DEV_PROJECT); assert.ok(!JSON.stringify(saved).includes('hl-local.'));
  await first.close();
  const second = await fixture(t, { dataFile, ephemeral: false }), restored = second.client(storage);
  assert.equal(await restored.restoreSession(), null);
  await restored.signIn('admin1', LOCAL_DEV_PASSWORD);
  assert.equal(JSON.parse((await restored.loadIsland()).payload).resources.coins, 321);
  const cRestored = second.client(); await cRestored.signIn('admin3', LOCAL_DEV_PASSWORD);
  assert.equal((await createDevTimeController(cRestored).status()).offsetSeconds, 3600);
  assert.equal((await createDevTimeController(cRestored).advance(3600, 'durable_clock_request')).advancedSeconds, 0);
  assert.equal((await second.raw('/api/dev/config')).body.persistence, 'local-dev-file');
});

test('Kingdom API atomically shares tasks, locks departure and rewards both accounts exactly once', async t => {
  const at = Date.parse('2026-11-14T12:00:00Z');
  const f = await fixture(t, { now: () => at, starter: time => {
    const state = createState(time, { onboarding: true, ruleset: 32 }), kingdom = normalizeKingdom(state);
    state.resources.wood = 30; state.settings.language = 'pl';
    kingdom.lastOfferAt = time;
    kingdom.offers = [{ id: 'fixture_supply', kind: 'supply', title: 'Dostawa dla portu', requirements: { goods: { wood: 100 } }, goodsValues: { wood: 3 }, personValues: { soldiers: 1, officers: 1, professors: 1 }, value: 300, offeredAt: time, expiresAt: time + 86400000, executionSeconds: 21600, allianceAllowed: true, reward: { coins: 50, goods: {} }, status: 'offered', penaltyRoll: .99 }];
    return JSON.stringify(state);
  } });
  const a = f.client(), b = f.client();
  await Promise.all([enter(a, 'admin1'), enter(b, 'admin2')]);
  const initialB = await b.loadIsland(), bState = JSON.parse(initialB.payload); bState.resources.wood = 100;
  await b.saveIsland(JSON.stringify(bState), initialB.version);
  await makeAlliance(a, b);
  const accepted = await serviceAction(a, '/api/v1/kingdom', { type: 'kingdomAccept', offerId: 'fixture_supply' }, 'kingdom_accept_1');
  assert.equal(accepted.result.ok, true); const taskId = accepted.result.taskId;
  const invited = await serviceAction(a, '/api/v1/kingdom', { type: 'kingdomInviteAlliance', taskId }, 'kingdom_invite_1');
  assert.equal(invited.result.ok, true); assert.equal(invited.status.allianceLocked, true);
  await assert.rejects(b.requestGameService('/api/v1/community', { command: 'allianceLeave', requestId: 'dev_leave_blocked' }), forbidden('community-alliance-active-obligations'));
  await serviceAction(a, '/api/v1/kingdom', { type: 'kingdomContribute', taskId, goods: { wood: 30 } }, 'kingdom_supply_a');
  const completed = await serviceAction(b, '/api/v1/kingdom', { type: 'kingdomContribute', taskId, goods: { wood: 70 } }, 'kingdom_supply_b');
  assert.equal(completed.result.ok, true);
  assert.equal(JSON.parse((await a.loadIsland()).payload).resources.coins, 150);
  assert.equal(JSON.parse((await b.loadIsland()).payload).resources.coins, 150);
  const repeated = await serviceAction(b, '/api/v1/kingdom', { type: 'kingdomContribute', taskId, goods: { wood: 70 } }, 'kingdom_supply_b');
  assert.equal(repeated.result.alreadyApplied, true);
  assert.equal(JSON.parse((await b.loadIsland()).payload).resources.coins, 150);
  const tamper = await b.loadIsland(), proposed = JSON.parse(tamper.payload); proposed.kingdom.tasks = [];
  await b.saveIsland(JSON.stringify(proposed), tamper.version);
  assert.ok(JSON.parse((await b.loadIsland()).payload).kingdom.tasks.some(task => task.id === taskId));
  const left = await b.requestGameService('/api/v1/community', { command: 'allianceLeave', requestId: 'dev_leave_unlocked' });
  assert.equal(left.alliance, null);
});

test('Kingdom client flushes pending gameplay and adopts the API revision before another save', async t => {
  const f = await fixture(t), cloud = f.client(), account = await cloud.signIn('admin1', LOCAL_DEV_PASSWORD);
  const coordinator = createDevSync({ cloud, account, saveKey: accountSaveKey(account.uid, cloud.projectId) });
  t.after(() => coordinator.dispose());
  let payload = await coordinator.open(JSON.stringify(createState()));
  const before = JSON.parse(payload); before.resources.coins = 118; payload = JSON.stringify(before);
  const response = await kingdomServiceAction({ cloud, coordinator, getPayload: () => payload, restore: value => { payload = value; } });
  assert.equal(response.ok, true); assert.ok(response.status.offers.length > 0);
  assert.equal(JSON.parse(payload).resources.coins, 118);
  assert.equal(coordinator.version.revision, (await cloud.loadIsland()).version.revision);
  const after = JSON.parse(payload); after.resources.coins = 117; coordinator.queue(JSON.stringify(after));
  assert.equal(await coordinator.flush(), true);
});

test('v32 trades use new whole-coin ceilings and preserve the age of escrowed milk', async t => {
  assert.equal(maximumTradePrice('bread', 3, 32, GOODS), 150); assert.equal(maximumTradePrice('meat', 1, 32, GOODS), 3);
  const f = await fixture(t), a = f.client(), b = f.client();
  for (const [cloud, login] of [[a, 'admin1'], [b, 'admin2']]) {
    const initial = await enter(cloud, login), state = JSON.parse(initial.payload);
    state.buildings.townhall.level = 6; state.islandStartedAt = Date.now() - 1000;
    state.resources.rawMilk = 500; state.resources.bread = 100;
    state.provisions.milkLots = [{ id: 'aged', amount: 500, centralSeconds: 100000 }];
    await cloud.saveIsland(JSON.stringify(state), initial.version);
  }
  const loaded = await a.loadIsland(), made = await a.createTradeOffer({ requestId: 'milk_offer_request', generation: loaded.generation, expectedRevision: loaded.version.revision, give: { resource: 'rawMilk', amount: 20 }, want: { resource: 'coins', amount: 20 } });
  assert.equal(made.offer.priceVersion, PLAYER_TRADE_V32_PRICE_VERSION);
  const buyer = await b.loadIsland();
  await b.acceptTradeOffer(made.offer.id, { requestId: 'milk_accept_request', generation: buyer.generation, expectedRevision: buyer.version.revision });
  const state = JSON.parse((await b.loadIsland()).payload);
  assert.equal(state.resources.rawMilk, 520);
  assert.ok(state.provisions.milkLots.some(lot => lot.amount === 20 && lot.centralSeconds === 100000));
});

test('daughter-world trades debit the common wallet and preserve new sidecars across account storage', async t => {
  const f = await fixture(t), a = f.client(), b = f.client();
  const initialA = await enter(a, 'admin1'), primary = JSON.parse(initialA.payload);
  primary.buildings.townhall.level = 10; primary.resources.coins = 500; primary.islandStartedAt = Date.now() - 1000; primary.islandName = 'Port DEV';
  let version = await a.saveIsland(JSON.stringify(primary), initialA.version);
  const daughter = createState(Date.now(), { ruleset: 32 });
  daughter.islandId = 'island-2'; daughter.islandRole = 'daughter'; daughter.islandSuffix = 'Zachodni'; daughter.islandName = 'Port DEV - Zachodni';
  daughter.buildings.townhall.level = 6; daughter.resources.coins = 0; daughter.resources.wood = 500;
  daughter.integrationSidecar = { specialist: { rounds: [1, 2, 3] }, reserved: { bread: 7 } };
  primary.archipelago = { version: 2, activeIslandId: 'island-2', shipCapacity: 1000, capacityReceipts: [], sequence: 0, transfers: [], sharedWallet: { coins: 500 }, islands: { 'island-2': daughter } };
  version = await a.saveIsland(JSON.stringify(primary), version);
  const stored = JSON.parse((await a.loadIsland()).payload);
  assert.deepEqual(stored.archipelago.islands['island-2'].integrationSidecar, daughter.integrationSidecar);
  const initialB = await enter(b, 'admin2'), buyerState = JSON.parse(initialB.payload);
  buyerState.buildings.townhall.level = 6; buyerState.resources.coins = 500; buyerState.islandStartedAt = Date.now() - 1000;
  await b.saveIsland(JSON.stringify(buyerState), initialB.version);
  const made = await a.createTradeOffer({ requestId: 'daughter_offer_request', generation: 1, expectedRevision: version.revision, islandId: 'island-2', give: { resource: 'wood', amount: 100 }, want: { resource: 'coins', amount: 25 } });
  const buyer = await b.loadIsland();
  await b.acceptTradeOffer(made.offer.id, { requestId: 'daughter_accept_request', generation: 1, expectedRevision: buyer.version.revision });
  const final = JSON.parse((await a.loadIsland()).payload);
  assert.equal(final.resources.coins, 525); assert.equal(final.archipelago.sharedWallet.coins, 525);
  assert.equal(final.archipelago.islands['island-2'].resources.coins, 0);
  assert.equal(final.archipelago.islands['island-2'].resources.wood, 400);
  assert.equal(final.resources.wood, primary.resources.wood);
  assert.deepEqual(final.archipelago.islands['island-2'].integrationSidecar, daughter.integrationSidecar);
});

test('alliance gifts arrive without acceptance, return overflow and keep the 24h limit', async t => {
  let at = Date.parse('2026-11-14T12:00:00Z');
  const f = await fixture(t, { now: () => at }), a = f.client(), b = f.client();
  for (const [cloud, login] of [[a, 'admin1'], [b, 'admin2']]) {
    const initial = await enter(cloud, login), state = JSON.parse(initial.payload);
    state.buildings.townhall.level = 6; state.resources.wood = 500; state.islandStartedAt = at - 1;
    if (login === 'admin2') state.resources.wood = warehouseCapacityForLevel(state.buildings.warehouse.level, { ruleset: 32 }).perResource - 30;
    await cloud.saveIsland(JSON.stringify(state), initial.version);
  }
  const targetId = await makeAlliance(a, b);
  const sent = await serviceAction(a, '/api/v1/gifts', { targetId, cargo: { wood: 100 } }, 'gift_request_1');
  assert.equal(sent.result.ok, true); assert.equal(sent.status.shipBusy, true);
  assert.equal(JSON.parse((await a.loadIsland()).payload).resources.wood, 400);
  assert.equal((await serviceAction(a, '/api/v1/gifts', { targetId, cargo: { wood: 100 } }, 'gift_request_1')).result.alreadyApplied, true);
  await assert.rejects(serviceAction(a, '/api/v1/gifts', { targetId, cargo: { wood: 1 } }, 'gift_request_2'), forbidden('gift-cooldown'));
  at += 600001;
  const arrived = await a.requestGameService('/api/v1/gifts');
  assert.equal(arrived.status.outgoing[0].status, 'returning');
  assert.deepEqual(arrived.status.outgoing[0].deliveredCargo, { wood: 30 });
  at += 600001;
  const returned = await a.requestGameService('/api/v1/gifts');
  assert.equal(returned.status.outgoing[0].status, 'complete'); assert.equal(returned.status.shipBusy, false);
  assert.equal(returned.status.canSend, false);
  assert.equal(JSON.parse((await a.loadIsland()).payload).resources.wood, 470);
  const sender = await a.loadIsland(), tampered = JSON.parse(sender.payload); tampered.accountGifts = { version: 32, outgoing: [], lastSentAt: null };
  await a.saveIsland(JSON.stringify(tampered), sender.version);
  assert.equal((await a.requestGameService('/api/v1/gifts')).status.canSend, false);
});

test('Kingdom, gifts and trade preserve the compact 3600-person diet codec at the server write boundary', async t => {
  const at = Date.parse('2026-11-14T12:00:00Z'), state = createState(at, { ruleset: 32 });
  state.buildings.townhall.level = 100; state.buildings.warehouse.level = 100;
  state.population = 3600; state.capacity = 3600; state.resources.coins = 1000;
  for (const id of ['grain', 'vegetables', 'bread']) state.resources[id] = 100000;
  state.resources.wood = 5000;
  const template = state.residents[0];
  state.residents = Array.from({ length: 3600 }, (_, index) => compactResidentSnapshot({ ...template, id: index + 1, personUid: `max-resident-${index + 1}`, happiness: 30 + index % 20 }));
  state.provisions.people = {};
  normalizeProvisions(state, state, { now: at });
  for (const [index, person] of Object.values(state.provisions.people).entries()) {
    person.coverage = .625; person.clothingRemaining = 12345.5 + index;
    person.history = [{ resource: 'grain', satiety: 3.125, at: at - 500, from: at - 1500 }];
  }
  // Status must quote an edible requirement, forcing reserve calculation to
  // hydrate this account's compact people before the server writes it again.
  state.kingdom.tasks.push({ id: 'max-diet-task', kind: 'supply', title: 'Chleb dla portu', ownerId: 'dev-admin1', participants: ['dev-admin1', 'dev-admin2'], allianceId: null,
    requirements: { goods: { bread: 1000 } }, goodsValues: { bread: 50 }, personValues: { soldiers: 1, officers: 1, professors: 1 }, value: 50000,
    contributions: {}, pendingPayouts: {}, status: 'active', acceptedAt: at, deadline: at + 21600000, reward: { coins: 10, goods: {} }, allianceAllowed: true });
  compactDietHistories(state);
  const payload = JSON.stringify(state);
  assert.ok(Buffer.byteLength(payload) < 700000, `initial bytes=${Buffer.byteLength(payload)}`);
  const f = await fixture(t, { now: () => at, starter: () => payload }), a = f.client(), b = f.client();
  await Promise.all([enter(a, 'admin1'), enter(b, 'admin2')]);
  const assertCodec = island => {
    assert.ok(Buffer.byteLength(island.payload) < 700000, `API bytes=${Buffer.byteLength(island.payload)}`);
    const saved = JSON.parse(island.payload); assert.equal(saved.population, 3600); assert.equal(saved.provisions.peopleFormat, 2);
    normalizeProvisions(saved, saved, { now: at });
    const person = saved.provisions.people['max-resident-1'];
    assert.equal(person.coverage, .625); assert.equal(person.clothingRemaining, 12345.5);
    assert.deepEqual(person.history, [{ resource: 'grain', satiety: 3.125, at: at - 500, from: at - 1500 }]);
  };
  assertCodec((await a.requestGameService('/api/v1/kingdom')).island);
  const targetId = await makeAlliance(a, b);
  assertCodec((await serviceAction(a, '/api/v1/gifts', { targetId, cargo: { grain: 1 } }, 'max_gift_request')).island);
  const current = await a.loadIsland();
  const offer = await a.createTradeOffer({ requestId: 'max_trade_request', generation: current.generation, expectedRevision: current.version.revision, give: { resource: 'bread', amount: 1 }, want: { resource: 'coins', amount: 1 } });
  assertCodec(offer.island);
  assertCodec(await a.loadIsland());
});
