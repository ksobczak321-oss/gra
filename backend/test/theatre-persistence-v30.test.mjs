import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from '../server.mjs';
import { createAccountService, LEGAL_DOCUMENT_VERSIONS } from '../account-service.mjs';
import { createState, normalizeState } from '../../harborlight-v1-state.js';
import { theatreAction, theatreQuote } from '../../harborlight-v1-theatre.js';

const START = Date.parse('2026-11-03T12:00:00Z');
const DAY = 86400000;
const UID = 'theatre-persistence-qa';
const SESSIONS = ['theatre-session-day-one', 'theatre-session-day-two', 'theatre-session-day-three'];
const copy = value => structuredClone(value);

// Serializable injected storage survives each replacement HTTP server. It is
// an isolated account fixture; no Firestore, Firebase or hosted user is used.
class PersistentTestStore {
  records = new Map();
  tail = Promise.resolve();
  runTransaction(work) {
    const pending = this.tail.then(async () => {
      const draft = copy(this.records);
      let wrote = false;
      const result = await work({
        get: async path => { assert.equal(wrote, false, 'Reads precede transaction writes'); return copy(draft.get(path)); },
        set: async (path, value) => { wrote = true; draft.set(path, copy(value)); },
        delete: async path => { wrote = true; draft.delete(path); }
      });
      this.records = draft;
      return result;
    });
    this.tail = pending.catch(() => {});
    return pending;
  }
}

function command(state, type, payload = {}, context = {}) {
  const result = theatreAction(state, { type, ...payload }, context);
  assert.equal(result?.ok, true, result?.message || type);
  return result;
}
function improve(state, id, targetLevel) {
  // A trusted fixture entitlement avoids testing a provider here. Every
  // improvement still charges its actual coin price; no receipt is invented.
  while (state.theatre.collection.find(item => item.id === id).level < targetLevel) {
    command(state, 'theatreUpgrade', { id }, { noAds: true });
  }
}
function hydrate(payload, at) {
  const state = normalizeState(JSON.parse(payload), at);
  // This test isolates persistence from offline taxes, food and world events.
  // The production/offline engine has its own tests; only its real normalizer
  // is used here before the next day's Theatre operations.
  state.worldTimeMs = state.lastSimulatedAt = state.savedAt = at;
  return state;
}

test('Theatre cloud payload survives three login days, server restarts, later upgrades, rearranging and storage', async t => {
  let now = START;
  const store = new PersistentTestStore(), authenticatedSessions = new Set();
  const initial = createState(START);
  initial.islandName = 'Ogród Teatru';
  initial.resources.coins = 200000;
  store.records.set(`accounts/${UID}`, { generation: 1, createdAt: START, lastPlayedAt: START,
    legalAcceptance: { ...LEGAL_DOCUMENT_VERSIONS, acceptedAt: START } });
  store.records.set(`islands/${UID}`, { generation: 1, revision: 1, updatedAt: START, payload: JSON.stringify(initial) });

  async function startServer() {
    const server = createServer({ environment: 'development', now: () => now,
      accountService: createAccountService({ store, environment: 'development', now: () => now }),
      verifyIdentityToken: async token => {
        if (!SESSIONS.includes(token)) throw Object.assign(new Error('auth-required'), { status: 401, code: 'auth-required' });
        authenticatedSessions.add(token);
        return { uid: UID };
      }
    });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    let stopped = false;
    const stop = async () => {
      if (stopped) return;
      stopped = true;
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    };
    t.after(stop);
    const url = `http://127.0.0.1:${server.address().port}/api/v1/island`;
    const request = async (token, method = 'GET', body) => {
      const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    return { request, stop };
  }
  let api = await startServer();
  let loaded = await api.request(SESSIONS[0]);
  assert.equal(loaded.status, 200);
  let revision = loaded.body.island.version.revision;
  let state = hydrate(loaded.body.island.payload, now);
  const save = async (token, expectedRevision = revision) => {
    const result = await api.request(token, 'PUT', { payload: JSON.stringify(state), generation: 1, expectedRevision });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.revision, revision + 1);
    revision = result.body.revision;
  };

  const fountain = command(state, 'theatreBuy', { decoration: 'fountain', style: 'marble', slot: 0 }).item;
  const tree = command(state, 'theatreBuy', { decoration: 'tree', style: 'garden', slot: 4 }).item;
  const column = command(state, 'theatreBuy', { decoration: 'column', style: 'coastal', slot: 7 }).item;
  improve(state, fountain.id, 21);
  improve(state, tree.id, 5);
  command(state, 'theatreSetAtmosphere', { lighting: 'golden', paving: 'brick' });
  command(state, 'theatreSaveLayout', { slot: 0 });
  const firstDay = copy(state.theatre), firstBalance = state.resources.coins;
  await save(SESSIONS[0]);
  await api.stop();

  // A fresh server and a different session read the stored account, not a
  // retained panel object or browser-local recovery copy.
  now += DAY;
  api = await startServer();
  loaded = await api.request(SESSIONS[1]);
  assert.equal(loaded.status, 200); assert.equal(loaded.body.island.version.revision, revision);
  state = hydrate(loaded.body.island.payload, now);
  assert.deepEqual(state.theatre, firstDay);
  assert.equal(state.resources.coins, firstBalance);
  const secondDayQuote = theatreQuote(state, { id: fountain.id });
  command(state, 'theatreUpgrade', { id: fountain.id });
  assert.equal(state.resources.coins, firstBalance - secondDayQuote.coins);
  command(state, 'theatreMove', { id: fountain.id, slot: 19 });
  command(state, 'theatreRemove', { id: tree.id });
  const bench = command(state, 'theatreBuy', { decoration: 'bench', style: 'pirate', slot: 1 }).item;
  command(state, 'theatreSetAtmosphere', { lighting: 'night', paving: 'stone' });
  command(state, 'theatreSaveLayout', { slot: 1 });
  command(state, 'theatreSaveLayout', { slot: 2 });
  const secondDay = copy(state.theatre), secondBalance = state.resources.coins;
  await save(SESSIONS[1]);
  await api.stop();

  now += DAY;
  api = await startServer();
  loaded = await api.request(SESSIONS[2]);
  assert.equal(loaded.status, 200);
  state = hydrate(loaded.body.island.payload, now);
  assert.deepEqual(state.theatre, secondDay);
  assert.equal(state.resources.coins, secondBalance);
  const thirdDayQuote = theatreQuote(state, { id: fountain.id });
  command(state, 'theatreUpgrade', { id: fountain.id });
  const thirdBalance = secondBalance - thirdDayQuote.coins;
  command(state, 'theatreRestoreLayout', { slot: 0 });
  assert.equal(state.resources.coins, thirdBalance, 'Restoring an old composition never refunds later purchases');
  assert.equal(state.theatre.collection.find(item => item.id === fountain.id).level, 23, 'Old arrangements cannot roll a level back to21');
  assert.equal(state.theatre.collection.find(item => item.id === bench.id).slot, null, 'Later possessions remain owned in the collection');
  command(state, 'theatreMove', { id: fountain.id, slot: 15 });
  command(state, 'theatreRemove', { id: column.id });
  command(state, 'theatreDeleteLayout', { slot: 2 });
  command(state, 'theatreSetAtmosphere', { lighting: 'night' });
  await save(SESSIONS[2]);

  const stale = await api.request(SESSIONS[0], 'PUT', { payload: JSON.stringify(initial), generation: 1, expectedRevision: 1 });
  assert.equal(stale.status, 409, 'A delayed background write must not overwrite the latest garden');
  assert.equal(stale.body.error, 'island-conflict');
  loaded = await api.request(SESSIONS[2]);
  const confirmed = hydrate(loaded.body.island.payload, now);
  assert.deepEqual(confirmed.theatre, state.theatre);
  assert.equal(confirmed.resources.coins, thirdBalance);
  assert.equal(confirmed.theatre.collection.length, 4);
  assert.deepEqual(confirmed.theatre.collection.map(item => [item.id, item.level, item.slot]),
    [[fountain.id, 23, 15], [tree.id, 5, 4], [column.id, 1, null], [bench.id, 1, null]]);
  assert.deepEqual(confirmed.theatre.atmosphere, { lighting: 'night', paving: 'brick' });
  assert.equal(confirmed.theatre.layouts[2], null);
  assert.equal(new Set(confirmed.theatre.collection.map(item => item.id)).size, 4);
  assert.equal(authenticatedSessions.size, 3);
});
