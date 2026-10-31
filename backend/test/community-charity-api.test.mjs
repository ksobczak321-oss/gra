import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from '../server.mjs';

async function fixture(t) {
  const calls = [];
  const record = method => async input => { calls.push([method, input]); return { ok: true }; };
  const server = createServer({ environment: 'test', accountService: { readIsland: record('island') },
    verifyIdentityToken: async token => { if (token !== 'verified') throw Object.assign(new Error(), { code: 'auth-required', status: 401 }); return { uid: 'verified-owner' }; },
    communityService: { snapshot: record('community-read'), dispatch: record('community-command') },
    charityService: { status: record('charity-read'), donate: record('donate'), claimReward: record('claim'),
      configureCampaign: record('FUND'), recordVerifiedCredit: record('MINT'), confirmTransfer: record('TRANSFER') } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = async (path, body, token = 'verified') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method: body === undefined ? 'GET' : 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  };
  return { calls, request };
}

test('community and charity routes require authentication and ignore forged account identities', async t => {
  const { calls, request } = await fixture(t);
  for (const path of ['/api/v1/community', '/api/v1/charity']) assert.equal((await request(path, undefined, null)).status, 401);
  assert.equal(calls.length, 0);
  assert.equal((await request('/api/v1/community', { command: 'chatSend', uid: 'victim', text: 'hello' })).status, 200);
  assert.deepEqual(calls[0], ['community-command', { command: 'chatSend', uid: 'verified-owner', text: 'hello' }]);
  assert.equal((await request('/api/v1/charity', { command: 'donate', uid: 'victim', requestId: 'one-request', islandId: 'island-3', qualified: 1e6 })).status, 200);
  assert.deepEqual(calls[1], ['donate', { uid: 'verified-owner', requestId: 'one-request', islandId: 'island-3' }]);
});

test('players cannot mint qualifying coins, configure funding or confirm a monetary transfer', async t => {
  const { calls, request } = await fixture(t);
  for (const command of ['configureCampaign', 'recordVerifiedCredit', 'confirmTransfer', 'cancelReservation', 'creditTestCoins']) {
    assert.equal((await request('/api/v1/charity', { command, verified: true, amount: 100000 })).status, 403);
  }
  assert.equal((await request('/api/v1/charity/confirmTransfer', { verified: true })).status, 404);
  assert.equal(calls.length, 0);
  assert.equal((await request('/api/v1/charity', { command: 'claim', donationId: 'donation', islandId: 'island-1', verified: true })).status, 200);
  assert.deepEqual(calls, [['claim', { uid: 'verified-owner', donationId: 'donation', islandId: 'island-1' }]]);
});
