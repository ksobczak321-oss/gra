import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import test from 'node:test';
import { createServer } from '../server.mjs';

const PATH = '/api/v1/dev-time';
async function fixture(t, { environment = 'preprod', projectId = 'harborlight-dev', service: supplied } = {}) {
  const calls = [], verified = [];
  const service = supplied || {
    readDevClock: async args => { calls.push(['read', args]); return { rate: 1, rates: [1, 2, 6] }; },
    setDevClock: async args => { calls.push(['set', args]); return { rate: args.rate, alreadyApplied: false }; }
  };
  const identities = {
    admin3: { uid: 'dev-admin3' }, admin1: { uid: 'dev-admin1' }, admin2: { uid: 'dev-admin2' },
    stranger: { uid: 'another-account' }, forgedLogin: { uid: 'dev-admin1', login: 'admin3' }, empty: {}
  };
  const server = createServer({ environment, accountProjectId: projectId, accountService: service,
    verifyIdentityToken: async token => {
      verified.push(token);
      if (!Object.hasOwn(identities, token)) throw Object.assign(new Error('invalid signature'), { code: 'auth-required', status: 401 });
      return identities[token];
    }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = ({ path = PATH, method = 'GET', body, token = 'admin3', contentType = 'application/json' } = {}) => new Promise((resolve, reject) => {
    const encoded = body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body);
    const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(encoded === null ? {} : { 'Content-Type': contentType, 'Content-Length': Buffer.byteLength(encoded) }) };
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path, method, headers, agent: false }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk));
      response.once('end', () => {
        const text = Buffer.concat(chunks).toString();
        resolve({ status: response.statusCode, headers: response.headers, body: text ? JSON.parse(text) : null });
      });
    });
    req.once('error', reject); req.end(encoded);
  });
  return { request, calls, verified };
}

test('PRE-PROD dev-time reads and writes use only the verified admin3 UID and approved body fields', async t => {
  const f = await fixture(t);
  const read = await f.request({ path: `${PATH}?uid=dev-admin1&rate=6&projectId=harborlight-prod` });
  assert.equal(read.status, 200); assert.deepEqual(read.body, { rate: 1, rates: [1, 2, 6] });
  assert.equal(read.headers['cache-control'], 'no-store');
  const written = await f.request({ method: 'POST', body: {
    rate: 6, requestId: 'clock_request_123', generation: 7, uid: 'dev-admin1', account: 'admin1',
    offsetSeconds: 999999999, now: 1, verified: true, projectId: 'harborlight-prod', environment: 'production'
  } });
  assert.equal(written.status, 200); assert.equal(written.body.rate, 6);
  assert.deepEqual(f.calls, [
    ['read', { uid: 'dev-admin3' }],
    ['set', { uid: 'dev-admin3', rate: 6, requestId: 'clock_request_123', generation: 7 }]
  ]);
});

test('dev-time requires verified admin3 identity; body names and claimed logins cannot grant permission', async t => {
  const f = await fixture(t);
  for (const method of ['GET', 'POST']) {
    const body = method === 'POST' ? { uid: 'dev-admin3', login: 'admin3', rate: 6, requestId: 'clock_request_123', generation: 1 } : undefined;
    for (const token of [null, 'invalid-signature', 'empty']) {
      assert.equal((await f.request({ method, body, token })).status, 401, `${method}: ${token}`);
    }
    for (const token of ['admin1', 'admin2', 'stranger', 'forgedLogin']) {
      assert.equal((await f.request({ method, body, token })).status, 403, `${method}: ${token}`);
    }
  }
  assert.deepEqual(f.calls, []);
});

test('dev-time is unavailable on PROD and unknown actual projects even with an injected clock service', async t => {
  for (const [environment, projectId] of [
    ['production', 'harborlight-prod'], ['preprod', 'harborlight-prod'],
    ['preprod', 'untrusted-project'], ['test', 'test-project']
  ]) {
    const f = await fixture(t, { environment, projectId });
    for (const method of ['GET', 'POST']) {
      assert.equal((await f.request({ method, body: method === 'POST' ? { rate: 6, requestId: 'clock_request_123', generation: 1, environment: 'preprod', projectId: 'harborlight-dev' } : undefined })).status, 403, `${environment}/${projectId}/${method}`);
    }
    assert.deepEqual(f.calls, []);
    const config = await f.request({ path: '/api/v1/config', token: null });
    assert.equal(config.status, 200); assert.equal(Object.hasOwn(config.body, 'devTimeControl'), false);
  }
});

test('unsupported dev-time methods are rejected before identity verification or service invocation', async t => {
  const f = await fixture(t);
  for (const method of ['PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
    const result = await f.request({ method });
    assert.equal(result.status, 405, method); assert.equal(result.headers.allow, 'GET, POST');
  }
  assert.deepEqual(f.calls, []); assert.deepEqual(f.verified, []);
});

test('malformed dev-time JSON and non-JSON requests never reach the clock mutation', async t => {
  const f = await fixture(t);
  for (const body of ['{broken', 'null', '[]', '"admin3"']) {
    assert.equal((await f.request({ method: 'POST', body })).status, 400);
  }
  assert.equal((await f.request({ method: 'POST', body: { rate: 6 }, contentType: 'text/plain' })).status, 415);
  assert.deepEqual(f.calls, []);
});

test('public configuration advertises time controls only for the actual PRE-PROD project with a complete service', async t => {
  const capable = await fixture(t);
  const config = await capable.request({ path: '/api/v1/config', token: null });
  assert.equal(config.status, 200);
  assert.deepEqual(config.body.devTimeControl, { account: 'admin3', rates: [1, 2, 6] });
  assert.deepEqual(capable.calls, []); assert.deepEqual(capable.verified, []);
  for (const service of [{}, { readDevClock: async () => ({}) }, { setDevClock: async () => ({}) }]) {
    const f = await fixture(t, { service });
    const disabled = await f.request({ path: '/api/v1/config', token: null });
    assert.equal(disabled.status, 200); assert.equal(Object.hasOwn(disabled.body, 'devTimeControl'), false);
  }
});

test('clock service failures do not expose upstream details or credentials', async t => {
  const f = await fixture(t, { service: {
    readDevClock: async () => { throw new Error('private-upstream-access-token'); },
    setDevClock: async () => { throw new Error('private-upstream-access-token'); }
  } });
  for (const method of ['GET', 'POST']) {
    const result = await f.request({ method, body: method === 'POST' ? { rate: 2, requestId: 'clock_request_123', generation: 1 } : undefined });
    assert.equal(result.status, 503); assert.deepEqual(result.body, { error: 'account-service-unavailable' });
  }
});
