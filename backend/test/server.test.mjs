import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { createServer, parsePort } from '../server.mjs';

async function fixture(t) {
  const readiness = { ready: true };
  const server = createServer({ environment: 'test', release: 'test-release', readiness });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const request = (path, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path, method, agent: false }, res => {
      const parts = [];
      res.on('data', part => parts.push(part));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(parts).toString() }));
    });
    req.on('error', reject);
    req.end();
  });
  return { request, readiness };
}

test('infrastructure probes work over HTTP and do not claim working accounts or persistence', async t => {
  const { request } = await fixture(t);
  const health = await request('/healthz');
  assert.equal(health.status, 200);
  assert.equal(health.headers['cache-control'], 'no-store');
  assert.equal(health.headers['x-content-type-options'], 'nosniff');
  assert.deepEqual(JSON.parse(health.body), {
    status: 'ok', service: 'harborlight-api', environment: 'test', release: 'test-release'
  });
  const ready = await request('/readyz');
  assert.equal(ready.status, 200);
  assert.deepEqual(JSON.parse(ready.body).features, { accounts: false, persistence: false, gameApi: false });
  assert.equal(JSON.parse(ready.body).scope, 'infrastructure');
});

test('HEAD probes have no body; unsupported verbs cannot modify service state', async t => {
  const { request } = await fixture(t);
  const head = await request('/readyz', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.ok(Number(head.headers['content-length']) > 0);
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    const result = await request('/healthz', method);
    assert.equal(result.status, 405);
    assert.equal(result.headers.allow, 'GET, HEAD');
  }
  assert.equal((await request('/readyz')).status, 200);
});

test('no game, credential, or static source paths are served', async t => {
  const { request } = await fixture(t);
  for (const path of ['/', '/islands', '/commands', '/.env', '/server.mjs', '/healthz/../server.mjs']) {
    const result = await request(path);
    assert.equal(result.status, 404);
    assert.deepEqual(JSON.parse(result.body), { error: 'not_found' });
  }
});

test('draining rejects readiness while preserving the liveness probe', async t => {
  const { request, readiness } = await fixture(t);
  readiness.ready = false;
  const ready = await request('/readyz');
  assert.equal(ready.status, 503);
  assert.equal(JSON.parse(ready.body).status, 'draining');
  assert.equal((await request('/healthz')).status, 200);
});

test('Cloud Run port defaults correctly and malformed configuration fails early', () => {
  assert.equal(parsePort(), 8080);
  assert.equal(parsePort('9000'), 9000);
  for (const invalid of ['', '0', '-1', '65536', 'abc', '8e3', '8080/healthz', '8080\n']) {
    assert.throws(() => parsePort(invalid), /PORT must be an integer/);
  }
});
