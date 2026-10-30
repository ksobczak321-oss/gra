import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { createServer, createStarterIsland } from '../server.mjs';
const NOW = Date.parse('2026-10-30T12:00:00Z');
async function fixture(t, options = {}) {
  const calls = [];
  const service = {
    readIsland: async args => { calls.push(['read', args]); return { island: null, account: { generation: 1, expired: false } }; },
    startIsland: async args => { calls.push(['start', args]); return { generation: 1, revision: 1 }; },
    saveIsland: async args => { calls.push(['save', args]); return { generation: args.generation, revision: args.expectedRevision + 1, updatedAt: NOW }; },
    recordActivity: async args => { calls.push(['activity', args]); return { lastPlayedAt: NOW }; },
    redeemCode: async args => { calls.push(['redeem', args]); return { code: args.code, alreadyRedeemed: false }; },
    readLegalStatus: async args => { calls.push(['legal-read', args]); return { required: true }; },
    acceptLegal: async args => { calls.push(['legal-accept', args]); return { uid: args.uid, acceptedAt: NOW }; }
  };
  const server = createServer({ environment: 'test', now: () => NOW, accountService: service, verifyIdentityToken: async token => {
    if (token !== 'valid-token') throw Object.assign(new Error('invalid signature'), { code: 'auth-required', status: 401 });
    return { uid: 'signed-in-user' };
  }, ...options });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (path, method = 'GET', body, authorization = 'Bearer valid-token') => new Promise((resolve, reject) => {
    const encoded = body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body);
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path, method, agent: false,
      headers: { ...(authorization ? { Authorization: authorization } : {}), ...(encoded === null ? {} : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(encoded) }) } }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.once('end', () => { const text = Buffer.concat(chunks).toString(); resolve({ status: res.statusCode, headers: res.headers, body: text ? JSON.parse(text) : null }); });
    });
    req.once('error', reject); req.end(encoded);
  });
  return { request, calls, service };
}

test('account routes are feature-gated and probes keep working without cloud configuration', async t => {
  const { request } = await fixture(t, { accountService: null, verifyIdentityToken: null });
  assert.equal((await request('/health')).status, 200);
  assert.deepEqual((await request('/ready')).body.features, { accounts: false, persistence: false, gameApi: false });
  const result = await request('/api/v1/island'); assert.equal(result.status, 503); assert.equal(result.body.error, 'account_api_disabled');
});

test('every account operation requires a verified Firebase identity and ignores caller UID overrides', async t => {
  const { request, calls } = await fixture(t);
  assert.equal((await request('/api/v1/island', 'GET', undefined, null)).status, 401);
  assert.equal((await request('/api/v1/island', 'GET', undefined, 'Bearer invalid')).status, 401);
  assert.equal(calls.length, 0);
  assert.equal((await request('/api/v1/island')).status, 200);
  assert.deepEqual(calls[0], ['read', { uid: 'signed-in-user' }]);
  assert.equal((await request('/api/v1/activity', 'POST', { uid: 'another-user', generation: 3 })).status, 200);
  assert.deepEqual(calls[1], ['activity', { uid: 'signed-in-user', generation: 3 }]);
  assert.equal((await request('/api/v1/promotions/redeem', 'POST', { uid: 'another-user', code: 'FIRST20', generation: 3 })).status, 200);
  assert.deepEqual(calls[2], ['redeem', { uid: 'signed-in-user', code: 'FIRST20', generation: 3 }]);
});

test('new islands are server-generated and cannot be seeded with caller currency or paid receipts', async t => {
  const { request, calls } = await fixture(t);
  assert.equal((await request('/api/v1/island', 'POST', { payload: '{"coins":999999}' })).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await request('/api/v1/island', 'POST', {})).status, 201);
  const state = JSON.parse(calls[0][1].payload);
  assert.equal(calls[0][1].uid, 'signed-in-user'); assert.equal(state.population, 12);
  assert.ok(Object.values(state.resources).every(amount => amount === 100));
  assert.equal(state.happiness, 20); assert.equal(state.welcome.until - NOW, 72 * 3600000);
  assert.equal(state.buildings.lighthouse.level, 0); assert.ok(Object.values(state.buildings).every(building => building.workers === 0));
  assert.equal(state.commerce, undefined);
  assert.deepEqual(JSON.parse(createStarterIsland(NOW)).resources, state.resources);
});

test('optimistic saves use explicit revisions/generations and expose a cloud version', async t => {
  const { request, calls } = await fixture(t);
  const result = await request('/api/v1/island', 'PUT', { payload: '{}', expectedRevision: 4, generation: 2, uid: 'another-user' });
  assert.equal(result.status, 200); assert.equal(result.body.revision, 5); assert.equal(result.body.updateTime, new Date(NOW).toISOString());
  assert.deepEqual(calls[0], ['save', { uid: 'signed-in-user', payload: '{}', expectedRevision: 4, generation: 2 }]);
});

test('legal confirmations are authenticated, UID-scoped and never accept caller timestamps', async t => {
  const { request, calls } = await fixture(t);
  assert.equal((await request('/api/v1/legal','GET',undefined,null)).status,401);
  assert.equal((await request('/api/v1/legal')).status,200);
  assert.deepEqual(calls[0],['legal-read',{uid:'signed-in-user'}]);
  const acceptance={uid:'another-user',acceptedAt:1,termsVersion:'draft',privacyVersion:'draft',termsAccepted:true,privacyAcknowledged:true};
  assert.equal((await request('/api/v1/legal','POST',acceptance)).status,200);
  assert.deepEqual(calls[1],['legal-accept',{uid:'signed-in-user',termsVersion:'draft',privacyVersion:'draft',termsAccepted:true,privacyAcknowledged:true}]);
  assert.equal((await request('/api/v1/legal','DELETE')).status,405);
});

test('unsupported payment/purge routes, invalid JSON and wrong methods cannot mutate accounts', async t => {
  const { request, calls } = await fixture(t);
  assert.equal((await request('/api/v1/retention', 'POST', {})).status, 404);
  assert.equal((await request('/api/v1/payments', 'POST', {})).status, 404);
  assert.equal((await request('/api/v1/island', 'DELETE')).status, 405);
  assert.equal((await request('/api/v1/activity', 'POST', '{bad')).status, 400);
  assert.equal((await request('/api/v1/activity', 'POST', [])).status, 400);
  assert.equal(calls.length, 0);
});

test('service errors do not reveal credentials or upstream response bodies', async t => {
  const { request } = await fixture(t, { accountService: { readIsland: async () => { throw new Error('secret-access-token'); } } });
  const result = await request('/api/v1/island');
  assert.equal(result.status, 503); assert.deepEqual(result.body, { error: 'account-service-unavailable' });
});

test('public runtime configuration exposes no secrets and PRE-PROD rejects unknown OAuth identities', async t => {
  const denied = await fixture(t, { environment: 'preprod', accountProjectId: 'harborlight-dev' });
  const config = await denied.request('/api/v1/config', 'GET', undefined, null);
  assert.equal(config.status, 200); assert.deepEqual(config.body, { accountApi: true, projectId: 'harborlight-dev', environment: 'preprod' });
  assert.equal((await denied.request('/api/v1/island')).status, 403); assert.equal(denied.calls.length, 0);
  const permitted = await fixture(t, { environment: 'preprod', accountProjectId: 'harborlight-dev', verifyIdentityToken: async () => ({ uid: 'dev-admin1' }) });
  assert.equal((await permitted.request('/api/v1/island')).status, 200);
  assert.deepEqual(permitted.calls[0], ['read', { uid: 'dev-admin1' }]);
  const production = await fixture(t, { environment: 'production', accountProjectId: 'harborlight-prod' });
  assert.equal((await production.request('/api/v1/island')).status, 200, 'production accepts ordinary authenticated users');
});
