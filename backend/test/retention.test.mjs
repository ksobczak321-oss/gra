import assert from 'node:assert/strict';
import test from 'node:test';
import { runRetention } from '../retention.mjs';
const NOW = Date.parse('2026-10-30T12:00:00Z'), OLD = Date.parse('2026-05-30T12:00:00Z');
function storeFixture() {
  const payload = JSON.stringify({ resources: { coins: 100, wood: 100, stone: 100, grain: 100, food: 100, planks: 100 } });
  const records = new Map([
    ['accounts/person', { lastPlayedAt: OLD, islandGeneration: 1, islandExpiredAt: null }],
    ['islands/person', { generation: 1, revision: 1, payload }],
    ['accounts/dev-admin1', { lastPlayedAt: OLD, islandGeneration: 1, islandExpiredAt: null }],
    ['islands/dev-admin1', { generation: 1, revision: 1, payload }]
  ]);
  let writes = 0;
  return { records, get writes() { return writes; },
    listAccounts: async () => ({ accounts: [...records].filter(([path]) => /^accounts\/[^/]+$/.test(path)).map(([path, value]) => ({ uid: path.slice(9), ...structuredClone(value) })), cursor: null }),
    runTransaction: async work => work({ get: async path => structuredClone(records.get(path)), set: async (path, value) => { writes++; records.set(path, structuredClone(value)); }, delete: async path => { writes++; records.delete(path); } }) };
}

test('owner retention is read-only by default and reports the PRE-PROD exemption', async () => {
  const store = storeFixture();
  const result = await runRetention({ store, projectId: 'harborlight-dev', now: NOW });
  assert.equal(result.mode, 'dry-run'); assert.equal(result.eligible, 1); assert.equal(result.exempt, 1);
  assert.equal(store.writes, 0); assert.ok(store.records.has('islands/person'));
});

test('explicit apply expires eligible worlds and preserves permanent PRE-PROD users', async () => {
  const store = storeFixture();
  const result = await runRetention({ store, projectId: 'harborlight-dev', now: NOW, apply: true });
  assert.equal(result.expired, 1); assert.equal(store.records.has('islands/person'), false);
  assert.ok(store.records.has('islands/dev-admin1')); assert.equal(store.records.get('accounts/person').islandGeneration, 2);
});

test('retention requires an explicit project and bounded scan sizes', async () => {
  await assert.rejects(runRetention({ store: storeFixture(), now: NOW }), /explicit/);
  await assert.rejects(runRetention({ store: storeFixture(), projectId: 'harborlight-prod', pageSize: 1000000, now: NOW }), /limits/);
});
