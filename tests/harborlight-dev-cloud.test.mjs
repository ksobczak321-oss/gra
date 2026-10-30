import test from 'node:test';
import assert from 'node:assert/strict';
import { DEV_PROJECT, DEV_USERS, SESSION_KEY, accountSaveKey, createDevCloud } from '../harborlight-dev-cloud.js';

const NOW = Date.UTC(2026, 9, 30, 12);
const TIME1 = '2026-10-30T12:00:00.000001Z';
const TIME2 = '2026-10-30T12:00:01.000002Z';
const USER = DEV_USERS[0];
const CONFIG = { projectId: DEV_PROJECT, apiKey: 'AIza-test-public-api-key-123456789', messagingSenderId: '28040211190' };
const NAME = `projects/${DEV_PROJECT}/databases/(default)/documents/islands/${USER.uid}`;
const token = (uid = USER.uid, overrides = {}) => ['header', Buffer.from(JSON.stringify({
  aud: DEV_PROJECT, iss: `https://securetoken.google.com/${DEV_PROJECT}`, sub: uid,
  exp: Math.floor(NOW / 1000) + 3600, ...overrides
})).toString('base64url'), 'signature'].join('.');
const authReply = (user = USER, overrides = {}) => ({ localId: user.uid, email: user.email,
  idToken: token(user.uid), refreshToken: 'refresh-test-token', expiresIn: '3600', ...overrides });
const storedSession = (overrides = {}) => ({ projectId: DEV_PROJECT, uid: USER.uid, login: USER.login,
  idToken: token(), refreshToken: 'refresh-test-token', expiresAt: NOW + 3600000, ...overrides });
const document = (overrides = {}) => ({ name: NAME, fields: {
  schemaVersion: { integerValue: '1' }, revision: { integerValue: '4' }, payload: { stringValue: '{"coins":345}' }
}, updateTime: TIME1, ...overrides });
const response = (body, status = 200) => ({ status, ok: status >= 200 && status < 300,
  json: async () => body });

function harness(replies = [], { stored, hostname = 'harborlight-dev.web.app', storage: injected } = {}) {
  const values = new Map(stored ? [[SESSION_KEY, JSON.stringify(stored)]] : []);
  const storage = injected || { getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const calls = [];
  const client = createDevCloud({ hostname, storage, discoverAccountApi: false, now: () => NOW, fetch: async (url, options) => {
    calls.push({ url, options });
    assert.ok(replies.length, `Unexpected request: ${url}`);
    const next = replies.shift();
    return typeof next === 'function' ? next(url, options) : next;
  } });
  return { client, calls, values, replies };
}

async function signedIn(replies = [], options) {
  const h = harness([response(CONFIG), response(authReply()), ...replies], options);
  await h.client.signIn(USER.login, 'chosen-password');
  h.calls.length = 0;
  return h;
}

test('only the three stable DEV identities are accepted; unrelated origins never contact Google', async () => {
  assert.deepEqual(DEV_USERS.map(user => user.login), ['admin1', 'admin2', 'admin3']);
  assert.deepEqual(DEV_USERS.map(user => user.uid), ['dev-admin1', 'dev-admin2', 'dev-admin3']);
  assert.equal(accountSaveKey('dev-admin2'), 'harborlight-dev-island-dev-admin2');
  assert.throws(() => accountSaveKey('../admin2'), { code: 'invalid-login' });
  for (const hostname of ['localhost', 'unrelated.invalid', 'harborlight-prod.web.app.attacker.invalid',
    'harborlight-dev.web.app.attacker.invalid', 'ksobczak321-oss.github.io']) {
    const { client, calls } = harness([], { hostname, stored: storedSession() });
    assert.equal(client.enabled, false);
    assert.equal(await client.restoreSession(), null);
    await assert.rejects(client.signIn(USER.login, 'password'), { code: 'disabled' });
    await assert.rejects(client.loadIsland(), { code: 'disabled' });
    await assert.rejects(client.saveIsland('{}'), { code: 'disabled' });
    assert.deepEqual(calls, []);
  }
  assert.equal(harness([], { hostname: 'harborlight-dev.firebaseapp.com' }).client.enabled, true);
});

test('blocked browser storage cannot break unrelated hosts at client construction', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let accesses = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() {
    accesses++;
    throw new Error('SecurityError: storage blocked');
  } });
  try {
    const inactive = createDevCloud({ hostname: 'unrelated.invalid' });
    assert.equal(inactive.enabled, false);
    assert.equal(await inactive.restoreSession(), null);
    await assert.rejects(inactive.signIn(USER.login, 'password'), { code: 'disabled' });
    assert.equal(accesses, 0);
    const active = createDevCloud({ hostname: 'harborlight-dev.web.app' });
    assert.equal(accesses, 0);
    await assert.rejects(active.restoreSession(), { code: 'storage' });
    assert.equal(accesses, 1);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});

test('password sign-in sends credentials only to Google and persists tokens without password', async () => {
  const { client, calls, values } = harness([response(CONFIG), response(authReply())]);
  const identity = await client.signIn(' ADMIN1 ', 'chosen-password');
  assert.deepEqual(identity, { uid: USER.uid, login: USER.login });
  assert.equal(calls[0].url, '/__/firebase/init.json');
  assert.equal(calls[1].url, `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CONFIG.apiKey}`);
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    email: USER.email, password: 'chosen-password', returnSecureToken: true
  });
  for (const call of calls) {
    assert.equal(call.options.redirect, 'error');
    assert.equal(call.options.credentials, 'omit');
    assert.equal(call.options.cache, 'no-store');
    assert.ok(call.options.signal instanceof AbortSignal);
  }
  const stored = JSON.parse(values.get(SESSION_KEY));
  assert.deepEqual(Object.keys(stored).sort(), ['expiresAt', 'idToken', 'login', 'projectId', 'refreshToken', 'uid']);
  assert.equal(stored.uid, USER.uid);
  assert.equal(stored.expiresAt, NOW + 3600000);
  assert.ok(!values.get(SESSION_KEY).includes('chosen-password'));
  assert.equal(Object.keys(identity).includes('idToken'), false);
});

test('invalid logins and runtime projects are rejected before sending a password', async () => {
  const noCalls = harness();
  await assert.rejects(noCalls.client.signIn('someone@example.com', 'password'), { code: 'invalid-login' });
  await assert.rejects(noCalls.client.signIn(USER.login, ''), { code: 'invalid-credentials' });
  assert.equal(noCalls.calls.length, 0);
  for (const configuration of [{ ...CONFIG, projectId: 'harborlight-prod' }, { ...CONFIG, apiKey: 'bad key' }]) {
    const h = harness([response(configuration)]);
    await assert.rejects(h.client.signIn(USER.login, 'password'), { code: 'configuration' });
    assert.equal(h.calls.length, 1);
    assert.equal(h.values.size, 0);
  }
});

test('sign-in cannot bind another UID, email or token project to a permitted login', async () => {
  for (const body of [authReply(DEV_USERS[1]), authReply(USER, { email: DEV_USERS[1].email }),
    authReply(USER, { idToken: token(USER.uid, { aud: 'harborlight-prod' }) }),
    authReply(USER, { idToken: token(USER.uid, { exp: Math.floor(NOW / 1000) - 1 }) })]) {
    const h = harness([response(CONFIG), response(body)]);
    await assert.rejects(h.client.signIn(USER.login, 'password'), { code: 'auth-required' });
    assert.equal(h.values.has(SESSION_KEY), false);
  }
});

test('provider failures are mapped without copying diagnostic text or credentials', async () => {
  for (const [body, status, code] of [
    [{ error: { message: 'INVALID_LOGIN_CREDENTIALS : private-provider-detail' } }, 400, 'invalid-credentials'],
    [{ error: { message: 'USER_DISABLED' } }, 400, 'account-disabled'],
    [{ error: { message: 'OPERATION_NOT_ALLOWED' } }, 400, 'configuration'],
    [{ error: { message: 'TOO_MANY_ATTEMPTS_TRY_LATER' } }, 400, 'rate-limited'],
    [{ error: { message: 'private-server-diagnostic' } }, 500, 'offline']
  ]) {
    const h = harness([response(CONFIG), response(body, status)]);
    await assert.rejects(h.client.signIn(USER.login, 'secret-password'), error => {
      assert.equal(error.code, code);
      assert.ok(!/private|secret-password|INVALID_LOGIN/.test(error.message));
      return true;
    });
    assert.equal(h.values.has(SESSION_KEY), false);
  }
});

test('restoring an unexpired session preserves identity without writing another island', async () => {
  const { client, calls, values } = harness([response(CONFIG)], { stored: storedSession() });
  values.set(accountSaveKey(USER.uid), 'local-island-progress');
  assert.deepEqual(await client.restoreSession(), { uid: USER.uid, login: USER.login });
  assert.equal(calls.length, 1);
  client.signOut();
  assert.equal(values.has(SESSION_KEY), false);
  assert.equal(values.get(accountSaveKey(USER.uid)), 'local-island-progress');
  await assert.rejects(client.loadIsland(), { code: 'auth-required' });
});

test('expired sessions use the official refresh exchange and retain only the same UID', async () => {
  const { client, calls, values } = harness([response(CONFIG), response({
    user_id: USER.uid, project_id: CONFIG.messagingSenderId, id_token: token(),
    refresh_token: 'next-refresh-token', expires_in: '3600'
  })], { stored: storedSession({ expiresAt: NOW - 1 }) });
  assert.deepEqual(await client.restoreSession(), { uid: USER.uid, login: USER.login });
  assert.equal(calls[1].url, `https://securetoken.googleapis.com/v1/token?key=${CONFIG.apiKey}`);
  assert.equal(calls[1].options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.equal(new URLSearchParams(calls[1].options.body).get('grant_type'), 'refresh_token');
  assert.equal(new URLSearchParams(calls[1].options.body).get('refresh_token'), 'refresh-test-token');
  assert.equal(JSON.parse(values.get(SESSION_KEY)).refreshToken, 'next-refresh-token');
});

test('wrong-project refresh responses and malformed stored identities cannot access cloud saves', async () => {
  for (const overrides of [{ user_id: DEV_USERS[1].uid }, { project_id: '99999999' },
    { id_token: token(USER.uid, { aud: 'harborlight-prod' }) }]) {
    const h = harness([response(CONFIG), response({ user_id: USER.uid, project_id: CONFIG.messagingSenderId,
      id_token: token(), refresh_token: 'next', expires_in: '3600', ...overrides })],
    { stored: storedSession({ expiresAt: NOW - 1 }) });
    await assert.rejects(h.client.restoreSession(), { code: 'auth-required' });
    assert.equal(h.values.has(SESSION_KEY), false);
  }
  for (const stored of [storedSession({ uid: 'dev-admin4' }), storedSession({ login: 'admin2' }),
    storedSession({ projectId: 'harborlight-prod' }), storedSession({ expiresAt: Infinity })]) {
    const h = harness([], { stored });
    assert.equal(await h.client.restoreSession(), null);
    assert.equal(h.calls.length, 0);
    assert.equal(h.values.has(SESSION_KEY), false);
  }
});

test('temporary refresh outages preserve the cached identity but never send an expired token to Firestore', async () => {
  const h = harness([response(CONFIG), () => { throw new Error('offline'); },
    () => { throw new Error('still offline'); }], { stored: storedSession({ expiresAt: NOW - 1 }) });
  assert.deepEqual(await h.client.restoreSession(), { uid: USER.uid, login: USER.login });
  await assert.rejects(h.client.loadIsland(), { code: 'offline' });
  assert.equal(h.calls.filter(call => call.url.includes('firestore.googleapis.com')).length, 0);
  assert.equal(h.values.has(SESSION_KEY), true);
});

test('concurrent cloud reads share a single expired-token refresh', async () => {
  let release;
  const h = harness([response(CONFIG), () => new Promise(resolve => { release = resolve; }),
    response({ error: { status: 'NOT_FOUND' } }, 404), response({ error: { status: 'NOT_FOUND' } }, 404)],
  { stored: storedSession({ expiresAt: NOW - 1 }) });
  const restoring = h.client.restoreSession();
  await new Promise(resolve => setImmediate(resolve));
  const read1 = h.client.loadIsland(), read2 = h.client.loadIsland();
  release(response({ user_id: USER.uid, project_id: DEV_PROJECT, id_token: token(),
    refresh_token: 'next-token', expires_in: '3600' }));
  await restoring;
  assert.deepEqual(await Promise.all([read1, read2]), [null, null]);
  assert.equal(h.calls.filter(call => call.url.includes('securetoken.googleapis.com')).length, 1);
});

test('Firestore reads are bound to the authenticated UID and validate versioned payloads', async () => {
  const h = await signedIn([response(document()), response({ error: { status: 'NOT_FOUND' } }, 404)]);
  assert.deepEqual(await h.client.loadIsland(), { payload: '{"coins":345}', version: { revision: 4, updateTime: TIME1 } });
  assert.equal(h.calls[0].url, `https://firestore.googleapis.com/v1/${NAME}`);
  assert.equal(h.calls[0].options.headers.Authorization, `Bearer ${token()}`);
  assert.equal(await h.client.loadIsland(), null);
  for (const malformed of [document({ name: NAME.replace(USER.uid, DEV_USERS[1].uid) }),
    document({ updateTime: 'not-a-timestamp' }), document({ fields: { payload: { stringValue: '{}' } } }),
    document({ fields: { schemaVersion: { integerValue: '1' }, revision: { integerValue: '4' }, payload: { stringValue: '[]' } } })]) {
    const broken = await signedIn([response(malformed)]);
    await assert.rejects(broken.client.loadIsland(), { code: 'invalid-cloud-data' });
  }
});

test('first create and subsequent saves use server timestamps and explicit compare-and-set preconditions', async () => {
  const h = await signedIn([response({ writeResults: [{ updateTime: TIME1 }] }),
    response({ writeResults: [{ updateTime: TIME2 }] })]);
  const first = await h.client.saveIsland('{"coins":345}');
  assert.deepEqual(first, { revision: 1, updateTime: TIME1 });
  assert.equal(h.calls[0].url, `https://firestore.googleapis.com/v1/projects/${DEV_PROJECT}/databases/(default)/documents:commit`);
  const write1 = JSON.parse(h.calls[0].options.body).writes[0];
  assert.deepEqual(write1.currentDocument, { exists: false });
  assert.equal(write1.update.name, NAME);
  assert.deepEqual(write1.update.fields, { schemaVersion: { integerValue: '1' },
    revision: { integerValue: '1' }, payload: { stringValue: '{"coins":345}' } });
  assert.deepEqual(write1.updateTransforms, [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }]);
  assert.deepEqual(await h.client.saveIsland('{"coins":346}', first), { revision: 2, updateTime: TIME2 });
  const write2 = JSON.parse(h.calls[1].options.body).writes[0];
  assert.deepEqual(write2.currentDocument, { updateTime: TIME1 });
  assert.equal(write2.update.fields.revision.integerValue, '2');
  assert.deepEqual(first, { revision: 1, updateTime: TIME1 });
});

test('a stale save is reported as a conflict and never retried as an unconditional overwrite', async () => {
  for (const result of [response({ error: { status: 'ALREADY_EXISTS' } }, 409),
    response({ error: { status: 'FAILED_PRECONDITION' } }, 400),
    response({ error: {} }, 412)]) {
    const h = await signedIn([result]);
    await assert.rejects(h.client.saveIsland('{}', { revision: 4, updateTime: TIME1 }), { code: 'conflict' });
    assert.equal(h.calls.length, 1);
    assert.deepEqual(JSON.parse(h.calls[0].options.body).writes[0].currentDocument, { updateTime: TIME1 });
  }
});

test('malformed, oversized UTF-8 payloads and invalid versions never reach Firestore', async () => {
  const h = await signedIn();
  for (const payload of ['not-json', '[]', 'null', JSON.stringify({ text: 'ą'.repeat(350000) })]) {
    await assert.rejects(h.client.saveIsland(payload), { code: 'invalid-state' });
  }
  for (const version of [{ revision: 0, updateTime: TIME1 }, { revision: 1, updateTime: 'invalid' },
    { revision: Number.MAX_SAFE_INTEGER, updateTime: TIME1 }]) {
    await assert.rejects(h.client.saveIsland('{}', version), { code: 'invalid-state' });
  }
  assert.equal(h.calls.length, 0);
});

test('a rejected ID token is refreshed once; a second 401 clears the session', async () => {
  const h = await signedIn([response({ error: { status: 'UNAUTHENTICATED' } }, 401),
    response({ user_id: USER.uid, project_id: DEV_PROJECT, id_token: token(), refresh_token: 'new-token', expires_in: '3600' }),
    response({ error: { status: 'UNAUTHENTICATED' } }, 401)]);
  await assert.rejects(h.client.loadIsland(), { code: 'auth-required' });
  assert.equal(h.calls.length, 3);
  assert.ok(h.calls[1].url.startsWith('https://securetoken.googleapis.com/'));
  assert.equal(h.values.has(SESSION_KEY), false);
});

test('Firestore permission and transport failures stay actionable without exposing tokens', async () => {
  for (const [reply, code] of [[response({ error: { message: 'private-diagnostic' } }, 403), 'permission'],
    [response({ error: {} }, 429), 'rate-limited'],
    [() => { throw new Error('private-network-error access_token=SECRET'); }, 'offline']]) {
    const h = await signedIn([reply]);
    await assert.rejects(h.client.loadIsland(), error => {
      assert.equal(error.code, code);
      assert.ok(!/private|SECRET|access_token/.test(error.message));
      return true;
    });
  }
});

test('logout while a read is pending cannot return another session’s island', async () => {
  let release;
  const h = await signedIn([() => new Promise(resolve => { release = resolve; })]);
  const pending = h.client.loadIsland();
  await new Promise(resolve => setImmediate(resolve));
  h.client.signOut();
  release(response(document()));
  await assert.rejects(pending, { code: 'auth-required' });
});

test('storage denial is explicit and never falls back to persisting a password elsewhere', async () => {
  const h = harness([response(CONFIG), response(authReply())], { storage: {
    getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {}
  } });
  await assert.rejects(h.client.signIn(USER.login, 'chosen-password'), { code: 'storage' });
  await assert.rejects(h.client.restoreSession(), { code: 'storage' });
  assert.equal(h.values.size, 0);
});
