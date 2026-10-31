import test from 'node:test';
import assert from 'node:assert/strict';
import { createDevCloud, validIslandPayload, DEV_PROJECT } from '../harborlight-dev-cloud.js';
import { createState } from '../harborlight-v1-state.js';
import { createDevSync } from '../harborlight-dev-sync.js';

const NOW = Date.parse('2026-10-31T12:00:00Z');
const UID = 'dev-admin2';
const VERSION = { revision: 8, updateTime: '2026-10-31T12:00:00.000001Z' };
const OFFER = 'trade_' + 'a'.repeat(40);
const token = ['header', Buffer.from(JSON.stringify({ aud: DEV_PROJECT,
  iss: `https://securetoken.google.com/${DEV_PROJECT}`, sub: UID, exp: NOW / 1000 + 3600
})).toString('base64url'), 'signature'].join('.');
const reply = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
function harness({ enabled = true, trades = [] } = {}) {
  const calls = [], storage = new Map();
  const cloud = createDevCloud({ hostname: 'harborlight-dev.web.app', now: () => NOW,
    storage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) },
    fetch: async (url, options = {}) => {
      calls.push({ url, options });
      if (url === '/__/firebase/init.json') return reply({ projectId: DEV_PROJECT, apiKey: 'fixture-public-api-key-123456789', messagingSenderId: '28040211190' });
      if (url === '/api/v1/config') return enabled ? reply({ accountApi: true, projectId: DEV_PROJECT, environment: 'preprod' }) : reply({ error: 'account_api_disabled' }, 503);
      if (url.includes('accounts:signInWithPassword')) return reply({ localId: UID, email: 'admin2@dev.harborlight.pl', idToken: token, refreshToken: 'fixture-refresh', expiresIn: '3600' });
      assert.ok(url.startsWith('/api/v1/trade/'), url);
      assert.ok(trades.length, `Unexpected trade request ${url}`);
      return trades.shift();
    }
  });
  return { cloud, calls, storage };
}
const group = second => ({ version: 1, activeIslandId: second ? 'island-2' : 'island-1', secondIsland: second,
  shipCapacity: 1000, transfers: [], capacityReceipts: [] });

test('cloud validation retains legacy worlds and accepts two complete worlds without allowing a broken secondary starter', () => {
  const first = createState(NOW), second = createState(NOW);
  assert.equal(validIslandPayload(JSON.stringify(first)), true);
  first.archipelago = group(second);
  assert.equal(validIslandPayload(JSON.stringify(first)), true);
  for (const broken of [{}, { ...second, resources: null }, { ...second, buildings: {} }, { ...second, archipelago: {} }]) {
    first.archipelago.secondIsland = broken;
    assert.equal(validIslandPayload(JSON.stringify(first)), false);
  }
  first.archipelago = group(null); first.archipelago.activeIslandId = 'island-2';
  assert.equal(validIslandPayload(JSON.stringify(first)), false);
  first.archipelago = group(second); first.archipelago.shipCapacity = Infinity;
  assert.equal(validIslandPayload(JSON.stringify(first)), false);
});

test('the cloud adapter uses authenticated same-origin auction endpoints and exact player-set prices', async () => {
  const h = harness({ trades: [reply({ offers: [], ownOffers: [] }), reply({ inbox: [] }),
    reply({ offer: { id: OFFER } }, 201), reply({ alreadyApplied: false }), reply({ returned: 100 }), reply({ returned: 10 })] });
  await h.cloud.signIn('admin2', 'admin2');
  await h.cloud.listTradeOffers({ islandId: 'island-2' });
  await h.cloud.listTradeReturns();
  const body = { requestId: 'intent-create-123', islandId: 'island-2', generation: 1, expectedRevision: 8,
    give: { resource: 'stone', amount: 100 }, want: { resource: 'wood', amount: 37 } };
  await h.cloud.createTradeOffer(body);
  await h.cloud.acceptTradeOffer(OFFER, { ...body, requestId: 'intent-accept-123' });
  await h.cloud.cancelTradeOffer(OFFER, { ...body, requestId: 'intent-cancel-123' });
  await h.cloud.claimTradeReturn(OFFER, { ...body, requestId: 'intent-return-123' });
  const requests = h.calls.filter(call => call.url.startsWith('/api/v1/trade/'));
  assert.deepEqual(requests.map(call => call.url), ['/api/v1/trade/offers?islandId=island-2', '/api/v1/trade/inbox',
    '/api/v1/trade/offers', `/api/v1/trade/offers/${OFFER}/accept`, `/api/v1/trade/offers/${OFFER}/cancel`, `/api/v1/trade/inbox/${OFFER}/claim`]);
  assert.deepEqual(JSON.parse(requests[2].options.body), body);
  assert.ok(requests.every(call => call.options.headers.Authorization === 'Bearer ' + token));
  assert.ok(requests.slice(2).every(call => call.options.method === 'POST'));
  assert.equal(h.storage.size, 1, 'Only authentication belongs in browser storage');
});

test('an unconfigured account server cannot be replaced by fictitious local player offers', async () => {
  const h = harness({ enabled: false });
  await h.cloud.signIn('admin2', 'admin2');
  await assert.rejects(h.cloud.listTradeOffers(), { code: 'trade-api-unavailable' });
  assert.equal(h.calls.some(call => call.url.startsWith('/api/v1/trade/')), false);
});

test('bounded auction and return pages keep the server cursor instead of silently replaying page one', async () => {
  const h = harness({ trades: [reply({ offers: [], cursor: 'cursor_page_3' }), reply({ inbox: [], cursor: null })] });
  await h.cloud.signIn('admin2', 'admin2');
  await h.cloud.listTradeOffers({ islandId: 'island-1', cursor: 'cursor_page_2' });
  await h.cloud.listTradeReturns({ cursor: 'return_page_2' });
  const requests = h.calls.filter(call => call.url.startsWith('/api/v1/trade/'));
  assert.equal(requests[0].url, '/api/v1/trade/offers?islandId=island-1&cursor=cursor_page_2');
  assert.equal(requests[1].url, '/api/v1/trade/inbox?cursor=return_page_2');
  assert.throws(() => h.cloud.listTradeReturns({ cursor: '../foreign' }), { code: 'trade-invalid-cursor' });
});

test('auction business failures preserve their safe codes instead of masquerading as save conflicts', async () => {
  const h = harness({ trades: [reply({ error: 'trade-storage-full' }, 409), reply({ error: 'trade-own-offer' }, 403)] });
  await h.cloud.signIn('admin2', 'admin2');
  await assert.rejects(h.cloud.acceptTradeOffer(OFFER, { requestId: 'safe-intent-123' }), { code: 'trade-storage-full' });
  await assert.rejects(h.cloud.acceptTradeOffer(OFFER, { requestId: 'safe-intent-124' }), { code: 'trade-own-offer' });
  assert.throws(() => h.cloud.cancelTradeOffer('../other-owner', {}), { code: 'trade-invalid-offer' });
  assert.throws(() => h.cloud.createTradeOffer(), { code: 'trade-invalid-offer' });
});

test('a caller cannot mutate the coordinator revision through its public version getter', async () => {
  const sync = createDevSync({ account: { uid: UID }, saveKey: 'harborlight-dev-island-' + UID,
    cloud: { projectId: DEV_PROJECT, loadIsland: async () => ({ payload: '{}', version: VERSION }) } });
  await sync.open('{}');
  const publicVersion = sync.version; publicVersion.revision = 999;
  assert.deepEqual(sync.version, VERSION);
  sync.dispose();
});
