import assert from 'node:assert/strict';
import test from 'node:test';
import { check, main, githubErrorAnnotation } from '../infra/google-cloud/check-dev-accounts.mjs';
import { createIslandDocumentStore } from '../backend/island-document-store.mjs';
import { createState } from '../harborlight-v1-state.js';

const PROJECT = 'harborlight-dev';
const CONFIG = 'https://harborlight-dev.web.app/__/firebase/init.json';
const API_CONFIG = 'https://harborlight-dev.web.app/api/v1/config';
const API_ISLAND = 'https://harborlight-dev.web.app/api/v1/island';
const API_KEY = 'AIza-test-public-key-1234567890123';
const AUTH = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
const PREFIX = `projects/${PROJECT}/databases/(default)/documents/islands/`;
const FIRESTORE = 'https://firestore.googleapis.com/v1/';
const NOW = Date.UTC(2026, 9, 30, 12);
const USERS = [1, 2, 3].map(number => ({ login: `admin${number}`, uid: `dev-admin${number}`,
  email: `admin${number}@dev.harborlight.pl` }));
const jwt = (uid, changes = {}) => ['header', Buffer.from(JSON.stringify({
  aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: uid,
  exp: NOW / 1000 + 3600, ...changes
})).toString('base64url'), 'signature'].join('.');
const authReply = (user, changes = {}) => ({ localId: user.uid, email: user.email,
  idToken: jwt(user.uid), refreshToken: 'private-refresh-value', ...changes });
const document = (user, changes = {}) => ({ name: PREFIX + user.uid, updateTime: '2026-10-30T12:00:00.123456Z',
  fields: { schemaVersion: { integerValue: '1' }, revision: { integerValue: '3' },
    payload: { stringValue: '{"coins":123,"residents":[]}' } }, ...changes });
const reply = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', ...headers }
});
const denied = () => reply({ error: { code: 403, status: 'PERMISSION_DENIED', message: 'Denied' } }, 403);
const missing = () => reply({ error: { code: 404, status: 'NOT_FOUND', message: 'Document not found' } }, 404);
const claims = token => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
const apiDocument = (user, empty = false) => ({ account: { generation: 1, expired: false, lastPlayedAt: NOW },
  island: empty ? null : { generation: 1, version: { revision: 3, updateTime: '2026-10-30T12:00:00.123456Z' },
    payload: document(user).fields.payload.stringValue } });

async function splitSave({ daughters = 0, padding = 0, generation = 7 } = {}) {
  const records = new Map();
  const memory = { runTransaction: work => work({
    get: async key => structuredClone(records.get(key)),
    set: async (key, value) => { records.set(key, structuredClone(value)); },
    delete: async key => { records.delete(key); }
  }) };
  const store = createIslandDocumentStore(memory), world = createState(NOW);
  world.islandGeneration = generation;
  if (padding) world.notes = 'a'.repeat(padding);
  const islands = Object.fromEntries(Array.from({ length: daughters }, (_, index) => {
    const child = createState(NOW); delete child.archipelago;
    child.islandId = `island-${index + 2}`;
    if (padding) child.notes = 'b'.repeat(padding);
    return [child.islandId, child];
  }));
  world.archipelago = { ...world.archipelago, version: 2, islands,
    activeIslandId: daughters ? 'island-2' : 'island-1', shipCapacity: 1000,
    transfers: [], capacityReceipts: [] };
  await store.runTransaction(async tx => {
    await tx.get('islands/checker-fixture');
    await tx.set('islands/checker-fixture', { schemaVersion: 1, generation,
      revision: 3, payload: JSON.stringify(world), updatedAt: NOW });
  });
  const stored = records.get('islands/checker-fixture');
  assert.equal(stored.schemaVersion, 2, 'Exercise the real backend serializer, not a hand-built v2 payload');
  const hydrated = await store.runTransaction(tx => tx.get('islands/checker-fixture'));
  return { generation, payload: hydrated.payload, fields: {
    schemaVersion: { integerValue: String(stored.schemaVersion) },
    revision: { integerValue: String(stored.revision) },
    generation: { integerValue: String(stored.generation) },
    payload: { stringValue: stored.payload },
    // Firestore's REST response omits values for an empty array.
    worldIds: { arrayValue: stored.worldIds.length ? { values: stored.worldIds.map(stringValue => ({ stringValue })) } : {} }
  } };
}

function splitResponse(call, saved, { root = true, api = true } = {}) {
  const token = call.options.headers.Authorization?.replace(/^Bearer /, '');
  if (!token) return;
  const user = USERS.find(value => value.uid === claims(token).sub);
  if (root && call.url === FIRESTORE + PREFIX + user.uid) return reply(document(user, { fields: saved.fields }));
  if (api && call.url === API_ISLAND) {
    const body = apiDocument(user);
    body.account.generation = saved.generation;
    body.island.generation = saved.generation;
    body.island.payload = saved.payload;
    return reply(body);
  }
}

function harness({ override = () => undefined, empty = ['dev-admin3'], accountApi = false, denyOwn = accountApi } = {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    const call = { url, options };
    calls.push(call);
    const changed = await override(call, calls.length);
    if (changed !== undefined) return changed;
    if (url === CONFIG) return reply({ projectId: PROJECT, apiKey: API_KEY });
    if (url === API_CONFIG) return reply({ accountApi: true, projectId: PROJECT, environment: 'preprod' });
    if (url === API_ISLAND) {
      const token = options.headers.Authorization?.replace(/^Bearer /, '');
      if (!token) return reply({ error: 'auth-required' }, 401);
      const user = USERS.find(value => value.uid === claims(token).sub);
      assert.ok(user, 'Unexpected API token identity');
      return reply(apiDocument(user, empty.includes(user.uid)));
    }
    if (url === AUTH) {
      const body = JSON.parse(options.body);
      const user = USERS.find(value => value.email === body.email);
      assert.ok(user, 'Unexpected sign-in identity');
      assert.equal(body.password, `test-password-${user.login}`);
      assert.equal(body.returnSecureToken, true);
      return reply(authReply(user));
    }
    if (url.startsWith(FIRESTORE + PREFIX)) {
      const uid = url.slice((FIRESTORE + PREFIX).length);
      const user = USERS.find(value => value.uid === uid);
      assert.ok(user, 'Unexpected island target');
      const token = options.headers.Authorization?.replace(/^Bearer /, '');
      if (!token || claims(token).sub !== uid) return denied();
      if (denyOwn) return denied();
      return empty.includes(uid) ? missing() : reply(document(user));
    }
    assert.fail('Unexpected request destination');
  };
  return { calls, fetcher, options: { fetch: fetcher, passwordForLogin: login => `test-password-${login}`,
    now: () => NOW, accountApiEnabled: accountApi } };
}

test('real-smoke flow verifies all three identities, existing/empty saves, all six foreign reads and anonymous denial without writes', async () => {
  const h = harness();
  assert.deepEqual(await check(h.options), { accounts: 3, existingSaves: 2, emptyIslands: 1,
    foreignReadsDenied: 6, anonymousReadsDenied: 3 });
  assert.equal(h.calls.length, 16);
  assert.equal(h.calls.filter(call => call.url === AUTH).length, 3);
  const reads = h.calls.filter(call => call.url.startsWith(FIRESTORE));
  assert.equal(reads.length, 12);
  for (const { url, options } of h.calls) {
    assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.method, url === AUTH ? 'POST' : 'GET');
    if (url !== AUTH) assert.equal(options.body, undefined);
    assert.ok([new URL(CONFIG).origin, 'https://identitytoolkit.googleapis.com',
      'https://firestore.googleapis.com'].includes(new URL(url).origin));
  }
  const foreignPairs = reads.filter(call => call.options.headers.Authorization &&
    claims(call.options.headers.Authorization.slice(7)).sub !== call.url.split('/').at(-1));
  assert.equal(new Set(foreignPairs.map(call => `${claims(call.options.headers.Authorization.slice(7)).sub}/${call.url.split('/').at(-1)}`)).size, 6);
  assert.equal(reads.filter(call => !call.options.headers.Authorization).length, 3);
});

test('explicit API mode reads three token-owned islands after deny-all and proves every direct Firestore read is forbidden', async () => {
  const h = harness({ accountApi: true });
  assert.deepEqual(await check(h.options), { accounts: 3, existingSaves: 2, emptyIslands: 1,
    foreignReadsDenied: 6, anonymousReadsDenied: 3, apiReads: 3, ownedDirectReadsDenied: 3,
    anonymousApiReadsDenied: 3 });
  assert.equal(h.calls.length, 23);
  const ownedApiReads = h.calls.filter(call => call.url === API_ISLAND && call.options.headers.Authorization);
  assert.deepEqual(ownedApiReads.map(call => claims(call.options.headers.Authorization.slice(7)).sub), USERS.map(user => user.uid));
  assert.equal(h.calls.filter(call => call.url === API_ISLAND && !call.options.headers.Authorization).length, 3);
  assert.equal(h.calls.filter(call => call.url.startsWith(FIRESTORE)).length, 12);
  for (const call of h.calls) {
    assert.equal(call.options.method, call.url === AUTH ? 'POST' : 'GET');
    if (call.url !== AUTH) assert.equal(call.options.body, undefined);
    assert.equal(call.options.redirect, 'error');
    if (call.url.startsWith('https://harborlight-dev.web.app/api/')) {
      assert.ok([API_CONFIG, API_ISLAND].includes(call.url), 'No UID override, query or foreign origin is used');
    }
  }
});

test('API migration accepts legacy owner rules before reset and cross-checks the same owner payload and revision', async () => {
  const h = harness({ accountApi: true, denyOwn: false });
  assert.equal((await check(h.options)).ownedDirectReadsDenied, 0);
  for (const changed of [
    body => { body.island.payload = '{"coins":999,"residents":[]}'; },
    body => { body.island.version.revision = 4; },
    body => { body.island = null; }
  ]) {
    const bad = harness({ accountApi: true, denyOwn: false, override: call => {
      if (call.url !== API_ISLAND || !call.options.headers.Authorization) return;
      const body = apiDocument(USERS[0]);
      changed(body);
      return reply(body);
    } });
    await assert.rejects(check(bad.options), /did not match the authenticated owner document/);
  }
  const mismatchedMissing = harness({ accountApi: true, override: call =>
    call.url === FIRESTORE + PREFIX + USERS[0].uid && call.options.headers.Authorization ? missing() : undefined });
  await assert.rejects(check(mismatchedMissing.options), /did not match the authenticated owner document/);
  const concurrentSave = harness({ accountApi: true, denyOwn: false, override: call =>
    call.url === FIRESTORE + PREFIX + USERS[0].uid && call.options.headers.Authorization &&
      claims(call.options.headers.Authorization.slice(7)).sub === USERS[0].uid
      ? reply(document(USERS[0], { fields: { ...document(USERS[0]).fields,
        revision: { integerValue: '4' }, payload: { stringValue: '{"coins":124,"residents":[]}' } } })) : undefined });
  assert.equal((await check(concurrentSave.options)).accounts, 3, 'A real autosave between two reads must not fail deployment');
});

test('API mode verifies active same-project PRE-PROD configuration before requesting any password', async () => {
  for (const config of [
    { accountApi: false, projectId: PROJECT, environment: 'preprod' },
    { accountApi: true, projectId: 'harborlight-prod', environment: 'preprod' },
    { accountApi: true, projectId: PROJECT, environment: 'production' },
    { accountApi: true, projectId: PROJECT }, {}
  ]) {
    const h = harness({ accountApi: true, override: call => call.url === API_CONFIG ? reply(config) : undefined });
    await assert.rejects(check({ ...h.options, passwordForLogin: () => assert.fail('No credentials before API config') }), /active PRE-PROD account API/);
    assert.equal(h.calls.length, 2);
  }
  for (const mode of ['true', 1, null]) {
    const h = harness();
    await assert.rejects(check({ ...h.options, accountApiEnabled: mode }), /explicit boolean/);
    assert.equal(h.calls.length, 0);
  }
});

test('API mode validates live Firebase token identity before forwarding a token to the fixed island route', async () => {
  const h = harness({ accountApi: true, override: call => call.url === AUTH
    ? reply(authReply(USERS[0], { idToken: jwt(USERS[1].uid) })) : undefined });
  await assert.rejects(check(h.options), /active DEV identity/);
  assert.equal(h.calls.some(call => call.url === API_ISLAND), false);
  assert.equal(h.calls.some(call => call.url.startsWith(FIRESTORE)), false);
});

test('API island response requires bounded object payload, valid generation, revision, expiry state and timestamp', async () => {
  const changes = [
    body => { delete body.account; },
    body => { body.account.generation = 0; },
    body => { body.account.expired = 'false'; },
    body => { body.account.lastPlayedAt = '2026-10-30'; },
    body => { delete body.island; },
    body => { body.island.generation = 2; },
    body => { body.account.expired = true; },
    body => { body.island.version.revision = 0; },
    body => { body.island.version.updateTime = 'not-a-timestamp'; },
    body => { body.island.payload = '{}'.repeat(350_001); },
    body => { body.island.payload = '[]'; },
    body => { body.island.payload = 'not-json'; },
    body => { body.island.payload = JSON.stringify({ islandGeneration: 2 }); }
  ];
  for (const change of changes) {
    const h = harness({ accountApi: true, override: call => {
      if (call.url !== API_ISLAND || !call.options.headers.Authorization) return;
      const body = apiDocument(USERS[0]); change(body); return reply(body);
    } });
    await assert.rejects(check(h.options), /DEV account API returned an invalid/);
    assert.equal(h.calls.some(call => call.url.startsWith(FIRESTORE)), false);
  }
  const empty = harness({ accountApi: true, empty: USERS.map(user => user.uid) });
  const result = await check(empty.options);
  assert.equal(result.emptyIslands, 3);
  assert.equal(result.existingSaves, 0);
  const restarted = harness({ accountApi: true, empty: [], override: call => {
    if (call.url !== API_ISLAND || !call.options.headers.Authorization) return;
    const user = USERS.find(value => value.uid === claims(call.options.headers.Authorization.slice(7)).sub);
    const body = apiDocument(user);
    body.account.generation = 7;
    body.account.lastPlayedAt = null;
    body.island.generation = 7;
    body.island.payload = JSON.stringify({ islandGeneration: 7, coins: 100, residents: [] });
    return reply(body);
  } });
  assert.equal((await check(restarted.options)).existingSaves, 3, 'Legitimate worlds started after a reset accept their new generation');
});

test('API mode never falls back to a direct save after failed API reads and rejects malformed owner denials', async () => {
  for (const status of [404, 403, 503]) {
    const h = harness({ accountApi: true, override: call => call.url === API_ISLAND && call.options.headers.Authorization
      ? reply({ error: 'account-service-unavailable' }, status) : undefined });
    await assert.rejects(check(h.options), /Reading an owned DEV API island failed/);
    assert.equal(h.calls.some(call => call.url.startsWith(FIRESTORE)), false);
  }
  const malformed = harness({ accountApi: true, override: call => call.url === FIRESTORE + PREFIX + USERS[0].uid && call.options.headers.Authorization
    ? reply({ error: { status: 'OTHER' } }, 403) : undefined });
  await assert.rejects(check(malformed.options), /Reading an owned DEV island failed/);
  const legacy = harness({ denyOwn: true });
  await assert.rejects(check(legacy.options), /Reading an owned DEV island failed/);
  assert.equal(legacy.calls.some(call => call.url === API_ISLAND || call.url === API_CONFIG), false);
});

test('API and direct Firestore reject anonymous access independently in API mode', async () => {
  for (const wrong of [() => reply(apiDocument(USERS[0])), () => reply({ error: 'auth-required' }, 403),
    () => reply({ error: 'OTHER' }, 401)]) {
    const h = harness({ accountApi: true, override: call => call.url === API_ISLAND && !call.options.headers.Authorization
      ? wrong() : undefined });
    await assert.rejects(check(h.options), /API did not deny anonymous island access/);
  }
  const firestoreOpen = harness({ accountApi: true, override: call => call.url.startsWith(FIRESTORE) && !call.options.headers.Authorization
    ? missing() : undefined });
  await assert.rejects(check(firestoreOpen.options), /Firestore did not deny anonymous access/);
});

test('credentials cannot be requested until the fixed Hosting config confirms the DEV project and a valid public key', async () => {
  for (const config of [
    { projectId: 'harborlight-prod', apiKey: API_KEY }, { projectId: PROJECT },
    { projectId: PROJECT, apiKey: `${API_KEY}&redirect=evil` }, { projectId: PROJECT, apiKey: 'short' }
  ]) {
    let asked = false;
    const h = harness({ override: call => call.url === CONFIG ? reply(config) : undefined });
    await assert.rejects(check({ ...h.options, passwordForLogin: () => { asked = true; return 'unused'; } }), /expected Firebase project/);
    assert.equal(asked, false);
    assert.equal(h.calls.length, 1);
  }
});

test('an explicit password provider is mandatory and its exceptions or values never appear in errors', async () => {
  const secret = 'NEVER-PRINT-PASSWORD';
  const h = harness();
  await assert.rejects(check({ fetch: h.fetcher }), /explicit DEV password provider/);
  assert.equal(h.calls.length, 0);
  for (const provider of [() => { throw new Error(secret); }, () => '', () => ({ password: secret }), () => secret.repeat(100)]) {
    await assert.rejects(check({ ...h.options, passwordForLogin: provider }), error => {
      assert.ok(!error.message.includes(secret));
      return /password provider/.test(error.message);
    });
  }
  assert.ok(h.calls.every(call => call.url === CONFIG));
});

test('sign-in must return the exact alias email, stable UID, matching Firebase token audience/issuer/subject and a live expiry', async () => {
  const user = USERS[0];
  for (const changed of [
    { localId: USERS[1].uid }, { email: 'unexpected@example.invalid' },
    { idToken: jwt(user.uid, { aud: 'harborlight-prod' }) },
    { idToken: jwt(user.uid, { iss: 'https://securetoken.google.com/harborlight-prod' }) },
    { idToken: jwt(USERS[1].uid) }, { idToken: jwt(user.uid, { exp: NOW / 1000 }) },
    { idToken: jwt(user.uid, { exp: String(NOW / 1000 + 3600) }) },
    { idToken: 'not-a-jwt' }, { idToken: 'header.bad-json.signature' },
    { idToken: 'a'.repeat(16_001) }
  ]) {
    const h = harness({ override: call => call.url === AUTH ? reply(authReply(user, changed)) : undefined });
    await assert.rejects(check(h.options), /DEV (?:identity|token claims)|active DEV identity/);
    assert.equal(h.calls.length, 2);
    assert.equal(h.calls.some(call => call.url.startsWith(FIRESTORE)), false);
  }
});

test('existing saves must belong to the owner and contain the current versioned bounded JSON-object payload', async () => {
  const user = USERS[0], good = document(user);
  for (const changed of [
    { name: PREFIX + USERS[1].uid }, { name: good.name.replace(PROJECT, 'harborlight-prod') },
    { updateTime: 'not-a-timestamp' }, { fields: {} },
    { fields: { ...good.fields, schemaVersion: { integerValue: '2' } } },
    { fields: { ...good.fields, revision: { integerValue: '0' } } },
    { fields: { ...good.fields, revision: { integerValue: '9007199254740992' } } },
    { fields: { ...good.fields, payload: { stringValue: '[]' } } },
    { fields: { ...good.fields, payload: { stringValue: 'null' } } },
    { fields: { ...good.fields, payload: { stringValue: 'not-json' } } },
    { fields: { ...good.fields, payload: { stringValue: JSON.stringify({ text: 'ą'.repeat(350_000) }) } } }
  ]) {
    const h = harness({ override: call => call.url === FIRESTORE + PREFIX + user.uid && call.options.headers.Authorization
      ? reply(document(user, changed)) : undefined });
    await assert.rejects(check(h.options), /existing DEV island has an invalid/);
    assert.equal(h.calls.length, 3);
  }
});

test('current backend split saves with zero or populated daughters pass direct and API checks without any game writes', async () => {
  for (const daughters of [0, 1]) {
    const saved = await splitSave({ daughters, padding: daughters ? 360_000 : 0 });
    if (daughters) assert.ok(Buffer.byteLength(saved.payload, 'utf8') > 700_000, 'The hydrated API aggregate can legitimately exceed one world document');
    for (const accountApi of [false, true]) {
      const h = harness({ empty: [], accountApi, denyOwn: false,
        override: call => splitResponse(call, saved) });
      const result = await check(h.options);
      assert.equal(result.accounts, 3);
      assert.equal(result.existingSaves, 3);
      assert.equal(result.foreignReadsDenied, 6);
      assert.equal(result.anonymousReadsDenied, 3);
      assert.ok(h.calls.every(call => call.options.method === (call.url === AUTH ? 'POST' : 'GET')));
      assert.ok(h.calls.every(call => call.url === AUTH || call.options.body === undefined));
      assert.ok(h.calls.every(call => !call.url.includes('/worlds/') && !call.url.includes(':commit')));
    }
  }
});

test('split roots reject malformed schema types, generations, world indexes and inline or oversized payloads', async () => {
  const saved = await splitSave({ daughters: 1 });
  const changes = [
    fields => { fields.schemaVersion.integerValue = '3'; },
    fields => { fields.schemaVersion.integerValue = '02'; },
    fields => { fields.schemaVersion.integerValue = 2; },
    fields => { delete fields.generation; },
    ...['0', '-1', '01', '1.5', '9007199254740992', 7].map(value => fields => { fields.generation.integerValue = value; }),
    fields => { fields.generation = { doubleValue: 7 }; },
    fields => { fields.generation.extra = 'unexpected'; },
    fields => { delete fields.worldIds; },
    fields => { fields.worldIds = { stringValue: 'island-2' }; },
    fields => { fields.worldIds.arrayValue = []; },
    fields => { fields.worldIds.arrayValue.values = {}; },
    fields => { fields.worldIds.arrayValue.values = null; },
    ...[
      [null], [{ integerValue: '2' }], [{ stringValue: 'island-2', integerValue: '2' }],
      [{ stringValue: 'island-1' }], [{ stringValue: 'island-21' }], [{ stringValue: 'island-02' }],
      [{ stringValue: '../island-2' }], [{ stringValue: 'island-3' }],
      [{ stringValue: 'island-2' }, { stringValue: 'island-2' }],
      Array.from({ length: 20 }, (_, index) => ({ stringValue: `island-${index + 2}` }))
    ].map(values => fields => { fields.worldIds.arrayValue.values = values; }),
    ...[
      state => { state.islandGeneration = 8; },
      state => { state.islandGeneration = '7'; },
      state => { delete state.islandGeneration; },
      state => { delete state.archipelago; },
      state => { state.archipelago.version = 1; },
      state => { state.archipelago.islands = []; },
      state => { state.archipelago.islands = { 'island-2': {} }; },
      state => { state.archipelago.activeIslandId = 'island-3'; },
      state => { state.archipelago.shipCapacity = 999; },
      state => { state.archipelago.transfers = {}; },
      state => { state.notes = 'ą'.repeat(350_000); }
    ].map(change => fields => { const state = JSON.parse(fields.payload.stringValue); change(state); fields.payload.stringValue = JSON.stringify(state); }),
    ...['[]', 'null', 'not-json'].map(payload => fields => { fields.payload.stringValue = payload; })
  ];
  for (const [index, change] of changes.entries()) {
    const fields = structuredClone(saved.fields); change(fields);
    const h = harness({ override: call => call.url === FIRESTORE + PREFIX + USERS[0].uid &&
      call.options.headers.Authorization ? reply(document(USERS[0], { fields })) : undefined });
    await assert.rejects(check(h.options), /existing DEV island has an invalid/, `Malformed split root case ${index}`);
    assert.equal(h.calls.length, 3);
    assert.ok(h.calls.every(call => call.url === AUTH || call.options.method === 'GET'));
  }
});

test('API split cross-check compares the root projection, daughter index and generation at the same revision', async () => {
  const saved = await splitSave({ daughters: 1 });
  for (const change of [
    value => { value.fields.generation.integerValue = '8'; const state = JSON.parse(value.fields.payload.stringValue); state.islandGeneration = 8; value.fields.payload.stringValue = JSON.stringify(state); },
    value => { value.fields.worldIds.arrayValue.values.push({ stringValue: 'island-3' }); },
    value => { const state = JSON.parse(value.fields.payload.stringValue); state.resources.coins++; value.fields.payload.stringValue = JSON.stringify(state); }
  ]) {
    const wrong = structuredClone(saved); change(wrong);
    const h = harness({ empty: [], accountApi: true, denyOwn: false,
      override: call => splitResponse(call, call.url === API_ISLAND ? saved : wrong) });
    await assert.rejects(check(h.options), /did not match the authenticated owner document/);
  }
});

test('API aggregates retain the 700k root/world limits and the 14MB overall payload limit', async () => {
  const saved = await splitSave({ daughters: 1 });
  for (const change of [
    state => { state.notes = 'ą'.repeat(350_000); },
    state => { state.archipelago.islands['island-2'].notes = 'ą'.repeat(350_000); },
    state => { state.archipelago.islands['island-2'].archipelago = {}; },
    state => { state.archipelago.islands = { 'island-3': state.archipelago.islands['island-2'] }; },
    state => { state.notes = 'a'.repeat(14_000_000); }
  ]) {
    const wrong = structuredClone(saved), state = JSON.parse(wrong.payload); change(state); wrong.payload = JSON.stringify(state);
    const h = harness({ accountApi: true, override: call => splitResponse(call, wrong, { root: false }) });
    await assert.rejects(check(h.options), /DEV account API returned an invalid/);
    assert.equal(h.calls.some(call => call.url.startsWith(FIRESTORE)), false);
  }
});

test('GitHub error annotations escape workflow delimiters and use only the CLI safe error text', async () => {
  assert.equal(githubErrorAnnotation('ERROR: 50% complete\r\nNext line\n'), '::error::ERROR: 50%25 complete%0D%0ANext line\n');
  const secret = 'NEVER-PRINT-PROVIDER-SECRET', errors = [];
  assert.equal(await main(['--passwords-match-logins'], {
    fetch: async () => { throw new Error(secret); },
    writeError: value => errors.push(githubErrorAnnotation(value))
  }), 1);
  assert.deepEqual(errors, ['::error::ERROR: DEV account check could not reach the required service.\n']);
  assert.equal(errors.join('').includes(secret), false);
});

test('an HTTP 404 is accepted as a new empty island only with a Firestore NOT_FOUND envelope', async () => {
  const h = harness({ empty: USERS.map(user => user.uid) });
  assert.equal((await check(h.options)).emptyIslands, 3);
  for (const bad of [{}, { error: { code: 404, status: 'PERMISSION_DENIED' } }]) {
    const deniedHarness = harness({ override: call => call.url === FIRESTORE + PREFIX + USERS[0].uid && call.options.headers.Authorization
      ? reply(bad, 404) : undefined });
    await assert.rejects(check(deniedHarness.options), /Reading an owned DEV island failed/);
  }
});

test('every authenticated cross-account read must be denied, including reads of nonexistent foreign documents', async () => {
  for (const accountApi of [false, true]) for (const actor of USERS) for (const target of USERS) {
    if (actor === target) continue;
    const h = harness({ accountApi, override: call => {
      if (call.url !== FIRESTORE + PREFIX + target.uid || !call.options.headers.Authorization ||
          claims(call.options.headers.Authorization.slice(7)).sub !== actor.uid) return;
      return missing();
    } });
    await assert.rejects(check(h.options), /did not deny access to another DEV island/);
  }
});

test('anonymous reads and non-Firestore-shaped 403 responses fail the isolation check', async () => {
  for (const badResponse of [() => missing(), () => reply(document(USERS[0])), () => reply({ error: { status: 'OTHER' } }, 403)]) {
    const h = harness({ override: call => call.url.startsWith(FIRESTORE) && !call.options.headers.Authorization
      ? badResponse() : undefined });
    await assert.rejects(check(h.options), /did not deny anonymous access/);
  }
  const h = harness({ override: call => call.url === FIRESTORE + PREFIX + USERS[1].uid && call.options.headers.Authorization
    ? reply({}, 403) : undefined });
  await assert.rejects(check(h.options), /did not deny access to another DEV island/);
});

test('redirected or foreign final responses are rejected rather than trusted', async () => {
  for (const metadata of [{ redirected: true }, { url: 'https://attacker.invalid/config' }]) {
    const h = harness({ override: call => {
      if (call.url !== CONFIG) return;
      const response = reply({ projectId: PROJECT, apiKey: API_KEY });
      for (const [key, value] of Object.entries(metadata)) Object.defineProperty(response, key, { value });
      return response;
    } });
    await assert.rejects(check(h.options), /unexpected HTTP response/);
    assert.equal(h.calls.length, 1);
  }
});

test('response sizes are bounded using both Content-Length and actual streamed bytes', async () => {
  const declared = harness({ override: call => call.url === CONFIG
    ? reply({}, 200, { 'Content-Length': '65537' }) : undefined });
  await assert.rejects(check(declared.options), /oversized response/);
  let cancelled = false;
  const streamed = harness({ override: call => {
    if (call.url !== CONFIG) return;
    return new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(40_000)); controller.enqueue(new Uint8Array(40_000)); },
      cancel() { cancelled = true; }
    }));
  } });
  await assert.rejects(check(streamed.options), /oversized response/);
  assert.equal(cancelled, true);
});

test('CLI refuses missing authorization or project overrides before any network and never echoes argument values', async () => {
  const output = [], errors = [];
  for (const args of [[], ['--project', 'harborlight-prod'], ['--passwords-match-logins', '--project=harborlight-prod'],
    ['PRIVATE-ARGUMENT'], ['--account-api'], ['--passwords-match-logins', '--account-api', '--account-api'],
    ['--passwords-match-logins', '--passwords-match-logins']]) {
    const status = await main(args, { fetch: () => assert.fail('No request is authorized'),
      write: value => output.push(value), writeError: value => errors.push(value) });
    assert.equal(status, 1);
  }
  assert.equal(output.length, 0);
  assert.ok(errors.every(value => value.includes('Explicit --passwords-match-logins')));
  assert.ok(!errors.join('').includes('PRIVATE-ARGUMENT'));
  assert.equal(await main(['--help'], { write: value => output.push(value),
    fetch: () => assert.fail('Help must not contact a service') }), 0);
});

test('CLI reports bounded safe errors without response bodies, credentials or provider exception messages', async () => {
  const secret = 'NEVER-PRINT-SECRET';
  for (const override of [
    call => { if (call.url === AUTH) throw new Error(secret); },
    call => call.url === AUTH ? reply({ error: { message: secret, refreshToken: secret } }, 400) : undefined,
    call => call.url === AUTH ? new Response(secret, { status: 503 }) : undefined
  ]) {
    const h = harness({ override });
    const errors = [], output = [];
    const status = await main(['--passwords-match-logins'], { fetch: async (url, options) => {
      // The CLI intentionally uses the explicitly authorized matching-login
      // convention; adapt only this test harness's credential assertion.
      if (url === AUTH) {
        const result = await override({ url, options });
        if (result !== undefined) return result;
      }
      return h.fetcher(url, options);
    }, now: () => NOW, write: value => output.push(value), writeError: value => errors.push(value) });
    assert.equal(status, 1);
    assert.equal(output.length, 0);
    assert.ok(errors.join('').startsWith('ERROR: '));
    for (const forbidden of [secret, API_KEY, 'private-refresh-value', ...USERS.map(user => user.login)]) {
      assert.ok(!errors.join('').includes(forbidden));
    }
  }
});

test('authorized CLI success prints only aggregate counts and performs no refresh or document mutation', async () => {
  const h = harness(), output = [], errors = [];
  const fetcher = async (url, options) => {
    if (url === AUTH) {
      const body = JSON.parse(options.body), user = USERS.find(value => value.email === body.email);
      assert.equal(body.password, user.login);
      h.calls.push({ url, options });
      return reply(authReply(user));
    }
    return h.fetcher(url, options);
  };
  assert.equal(await main(['--passwords-match-logins'], { fetch: fetcher, now: () => NOW,
    write: value => output.push(value), writeError: value => errors.push(value) }), 0);
  assert.equal(errors.length, 0);
  assert.match(output.join(''), /PASS.*3 permanent DEV accounts/);
  for (const forbidden of [API_KEY, 'private-refresh-value', ...USERS.map(user => user.login), ...USERS.map(user => jwt(user.uid))]) {
    assert.ok(!output.join('').includes(forbidden));
  }
  assert.equal(h.calls.length, 16);
  assert.ok(h.calls.every(call => call.options.method === (call.url === AUTH ? 'POST' : 'GET')));
  assert.ok(h.calls.every(call => !call.url.includes('securetoken.googleapis.com') && !call.url.includes(':commit')));
});

test('authorized API CLI accepts either explicit flag order, reports direct-read denials and never writes game state', async () => {
  for (const args of [['--passwords-match-logins', '--account-api'], ['--account-api', '--passwords-match-logins']]) {
    const h = harness({ accountApi: true }), output = [], errors = [];
    const fetcher = async (url, options) => {
      if (url === AUTH) {
        const body = JSON.parse(options.body), user = USERS.find(value => value.email === body.email);
        assert.equal(body.password, user.login);
        h.calls.push({ url, options });
        return reply(authReply(user));
      }
      return h.fetcher(url, options);
    };
    assert.equal(await main(args, { fetch: fetcher, now: () => NOW,
      write: value => output.push(value), writeError: value => errors.push(value) }), 0);
    assert.deepEqual(errors, []);
    assert.match(output.join(''), /3 API reads; 3 owned direct reads and 3 anonymous API reads denied/);
    assert.equal(h.calls.length, 23);
    for (const call of h.calls) assert.equal(call.options.method, call.url === AUTH ? 'POST' : 'GET');
    for (const forbidden of [API_KEY, ...USERS.map(user => user.login), ...USERS.map(user => jwt(user.uid))]) {
      assert.ok(!output.join('').includes(forbidden));
    }
  }
});
