import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import test from 'node:test';
import { createServer } from '../server.mjs';

test('charity public routes enforce verified identity and cannot invoke funding, minting, cancellation or transfer confirmation', async t => {
  const calls = [], record = name => async input => { calls.push([name, input]); return { ok: true }; };
  const server = createServer({ environment: 'test', accountService: {},
    verifyIdentityToken: async token => token === 'valid' ? { uid: 'verified-owner' } : Promise.reject(Object.assign(new Error(), { code: 'auth-required', status: 401 })),
    charityService: { status: record('status'), donate: record('donate'), claimReward: record('claim'),
      configureCampaign: record('FORBIDDEN'), recordVerifiedCredit: record('FORBIDDEN'), confirmTransfer: record('FORBIDDEN'), cancelReservation: record('FORBIDDEN') } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (method = 'GET', body, token = 'valid') => new Promise((resolve, reject) => {
    const payload = body && JSON.stringify(body);
    const req = http.request({ host: '127.0.0.1', port: server.address().port, method, path: '/api/v1/charity', agent: false,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}) } }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.once('end', () => resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(chunks)) }));
    }); req.once('error', reject); req.end(payload);
  });
  assert.equal((await request('GET', undefined, null)).status, 401); assert.equal((await request('GET', undefined, 'fake')).status, 401); assert.deepEqual(calls, []);
  assert.equal((await request()).status, 200);
  assert.equal((await request('POST', { command: 'donate', uid: 'victim', requestId: 'request123', islandId: 'island-1', qualifiedCoins: 999999, verified: true })).status, 200);
  assert.equal((await request('POST', { command: 'claim', uid: 'victim', donationId: 'receipt123', islandId: 'island-2', expiresAt: 9999999999999 })).status, 200);
  for (const command of ['configureCampaign', 'recordVerifiedCredit', 'confirmTransfer', 'cancelReservation', 'credit', 'fund', 'transfer']) assert.equal((await request('POST', { command, verified: true, amount: 1000000 })).status, 403);
  assert.deepEqual(calls, [['status', { uid: 'verified-owner' }], ['donate', { uid: 'verified-owner', requestId: 'request123', islandId: 'island-1' }], ['claim', { uid: 'verified-owner', donationId: 'receipt123', islandId: 'island-2' }]]);
});
