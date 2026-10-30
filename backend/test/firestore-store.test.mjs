import assert from 'node:assert/strict';
import test from 'node:test';
import { createFirestoreStore, createMetadataTokenProvider } from '../firestore-store.mjs';
const response = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });
const BASE = 'projects/harborlight-prod/databases/(default)/documents';

test('Cloud Run credentials come only from the fixed metadata endpoint and are cached', async () => {
  let calls = 0;
  const provider = createMetadataTokenProvider({ now: () => 100000, fetch: async (url, options) => {
    calls++; assert.equal(url, 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token');
    assert.equal(options.headers['Metadata-Flavor'], 'Google');
    return response({ access_token: 'opaque-access-token', expires_in: 3600 }, 200, { 'Metadata-Flavor': 'Google' });
  } });
  assert.deepEqual(await Promise.all([provider(), provider()]), ['opaque-access-token', 'opaque-access-token']); assert.equal(calls, 1);
  const bad = createMetadataTokenProvider({ fetch: async () => response({ access_token: 'untrusted', expires_in: 3600 }) });
  await assert.rejects(bad(), error => error.code === 'cloud-credentials-unavailable');
});

test('Firestore transactions retry contention using fresh reads and update-time preconditions', async () => {
  let opened = 0, committed = 0;
  const store = createFirestoreStore({ projectId: 'harborlight-prod', accessToken: async () => 'adc-token', fetch: async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer adc-token');
    if (url.endsWith(':beginTransaction')) return response({ transaction: `tx-${++opened}` });
    if (url.includes('/accounts/one?')) return response({ name: `${BASE}/accounts/one`, updateTime: `2026-10-30T12:00:0${opened}.000Z`, fields: { count: { integerValue: String(opened - 1) }, payload: { stringValue: '{"secret":false}' } } });
    if (url.endsWith(':commit')) {
      const body = JSON.parse(options.body), write = body.writes[0]; committed++;
      assert.equal(body.transaction, `tx-${opened}`);
      assert.equal(write.currentDocument.updateTime, `2026-10-30T12:00:0${opened}.000Z`);
      assert.equal(write.update.fields.count.integerValue, String(opened));
      return committed === 1 ? response({ error: { status: 'ABORTED' } }, 409) : response({ writeResults: [{ updateTime: '2026-10-30T12:00:05Z' }] });
    }
    throw new Error(`Unexpected URL ${url}`);
  } });
  const value = await store.runTransaction(async tx => { const account = await tx.get('accounts/one'); await tx.set('accounts/one', { ...account, count: account.count + 1 }); return account.count + 1; });
  assert.equal(value, 2); assert.equal(opened, 2); assert.equal(committed, 2);
});

test('a failed command rolls back without committing, and missing documents use create preconditions', async () => {
  const calls = [];
  const store = createFirestoreStore({ projectId: 'harborlight-prod', accessToken: async () => 'adc-token', fetch: async (url, options) => {
    calls.push([url, options]);
    if (url.endsWith(':beginTransaction')) return response({ transaction: 'tx' });
    if (url.includes('/accounts/new?')) return response({ error: { status: 'NOT_FOUND' } }, 404);
    if (url.endsWith(':rollback')) return response({});
    if (url.endsWith(':commit')) { const body = JSON.parse(options.body); assert.deepEqual(body.writes[0].currentDocument, { exists: false }); return response({}); }
    throw new Error('Unexpected route');
  } });
  await assert.rejects(store.runTransaction(async tx => { await tx.get('accounts/new'); throw new Error('invalid business command'); }), /invalid business command/);
  assert.equal(calls.filter(([url]) => url.endsWith(':commit')).length, 0);
  assert.equal(calls.filter(([url]) => url.endsWith(':rollback')).length, 1);
  await store.runTransaction(async tx => { assert.equal(await tx.get('accounts/new'), undefined); await tx.set('accounts/new', { generation: 1, nested: { active: true, pending: null }, list: [1, 'hello'] }); });
  assert.equal(calls.filter(([url]) => url.endsWith(':commit')).length, 1);
});

test('retention uses a bounded paged query ordered by real activity', async () => {
  let query;
  const store = createFirestoreStore({ projectId: 'harborlight-prod', accessToken: async () => 'adc-token', fetch: async (url, options) => {
    assert.ok(url.endsWith(':runQuery')); query = JSON.parse(options.body).structuredQuery;
    return response([{ document: { name: `${BASE}/accounts/one`, fields: { lastPlayedAt: { integerValue: '123' } } } }]);
  } });
  const first = await store.listAccounts({ before: 456, limit: 1 });
  assert.equal(query.limit, 1); assert.equal(query.where.fieldFilter.value.integerValue, '456');
  assert.equal(first.accounts[0].uid, 'one'); assert.ok(first.cursor);
  await store.listAccounts({ before: 456, limit: 1, cursor: first.cursor });
  assert.equal(query.startAt.before, false); assert.equal(query.startAt.values[1].referenceValue, `${BASE}/accounts/one`);
});
