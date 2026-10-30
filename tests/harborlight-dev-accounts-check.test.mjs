import assert from 'node:assert/strict';
import test from 'node:test';
import { check, main } from '../infra/google-cloud/check-dev-accounts.mjs';

const PROJECT = 'harborlight-dev';
const CONFIG = 'https://harborlight-dev.web.app/__/firebase/init.json';
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

function harness({ override = () => undefined, empty = ['dev-admin3'] } = {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    const call = { url, options };
    calls.push(call);
    const changed = await override(call, calls.length);
    if (changed !== undefined) return changed;
    if (url === CONFIG) return reply({ projectId: PROJECT, apiKey: API_KEY });
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
      return empty.includes(uid) ? missing() : reply(document(user));
    }
    assert.fail('Unexpected request destination');
  };
  return { calls, fetcher, options: { fetch: fetcher, passwordForLogin: login => `test-password-${login}`, now: () => NOW } };
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
  for (const actor of USERS) for (const target of USERS) {
    if (actor === target) continue;
    const h = harness({ override: call => {
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
  for (const args of [[], ['--project', 'harborlight-prod'], ['--passwords-match-logins', '--project=harborlight-prod'], ['PRIVATE-ARGUMENT']]) {
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
