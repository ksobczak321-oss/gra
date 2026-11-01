import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { validateIslandName, validateStoredIslandName } from '../island-name.mjs';
import { createAccountService } from '../account-service.mjs';
import { createServer, createStarterIsland } from '../server.mjs';

const NOW = Date.parse('2026-11-01T12:00:00Z');

test('new island names accept Polish/English identities, punctuation and Unicode boundaries', () => {
  for (const name of ['Żółwia Zatoka', 'Łódź', 'Święty Mikołaj', 'Saint-Pierre & Łódź', 'Scunthorpe', 'Sussex', 'Cassidy', 'Dickens Bay', 'Cipango', 'Dom - Przystań', 'a'.repeat(40)]) {
    assert.equal(validateIslandName(name).ok, true, name);
  }
  assert.equal(validateIslandName('  Z\u0307ółwia   Zatoka  ').name, 'Żółwia Zatoka');
  for (const name of ['', 'AB', 'a'.repeat(41)]) assert.equal(validateIslandName(name).reason, 'length', name);
  for (const name of ['Bad\u0000Name', 'Bad\u202EName', '<Port>', 'Port\nNowy']) assert.equal(validateIslandName(name).reason, 'characters', name);
});

test('island vocabulary rejects explicit PL/EN insults, accents, case, leetspeak and spelled-out obscenities', () => {
  for (const name of ['KURWA', 'KuRwA', 'Skurwysyn', 'PortKurwa', 'Port Chuja', 'Jebać', 'Pierdolić', 'Pizda', 'Cipa', 'Fuck Bay', 'fück', 'fUcK', 'SH1T', 'Sh1tBay', 'Bitch Cove', 'Cunt Island', 'Asshole', 'Motherfucker', 'Kurw4', 'k.u.r.w.a', 'f_u_c_k Bay']) {
    assert.equal(validateIslandName(name).reason, 'profanity', name);
  }
});

test('stored names retain legacy length and vocabulary without accepting markup', () => {
  for (const name of ['AB', 'Kurwa Bay']) assert.equal(validateStoredIslandName(name).name, name);
  assert.equal(validateStoredIslandName('<bad>').ok, false);
  assert.equal(validateStoredIslandName('AB - XY', 83).ok, true);
});

async function fixture(t, original = JSON.parse(createStarterIsland(NOW))) {
  const records = new Map([
    ['accounts/player', { islandGeneration: 1, lastPlayedAt: NOW }],
    ['islands/player', { payload: JSON.stringify(original), revision: 1, generation: 1, updatedAt: NOW }]
  ]);
  const store = { async runTransaction(work) {
    const draft = structuredClone(records); let wrote = false;
    const result = await work({
      get: async key => { assert.equal(wrote, false); return structuredClone(draft.get(key)); },
      set: async (key, value) => { wrote = true; draft.set(key, structuredClone(value)); },
      delete: async key => { wrote = true; draft.delete(key); }
    });
    records.clear(); for (const [key, value] of draft) records.set(key, value); return result;
  } };
  const server = createServer({ environment: 'test', now: () => NOW, accountService: createAccountService({ store, now: () => NOW, environment: 'test' }), verifyIdentityToken: async () => ({ uid: 'player' }) });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (method, body) => new Promise((resolve, reject) => {
    const encoded = body === undefined ? null : JSON.stringify(body);
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path: '/api/v1/island', method, agent: false, headers: { Authorization: 'Bearer identity', ...(encoded ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(encoded) } : {}) } }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.once('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks)) }));
    }); req.once('error', reject); req.end(encoded);
  });
  return { request, records, save: (state, revision = 1) => request('PUT', { payload: JSON.stringify(state), generation: 1, expectedRevision: revision }) };
}

test('authenticated HTTP saves enforce names before writing and preserve revisions/history on rejection', async t => {
  const original = JSON.parse(createStarterIsland(NOW)); original.islandName = 'Old Port';
  original.tutorial = { completed: { 'rules-read': true }, claimed: { 'rules-read': true } };
  original.commerce = { receipts: [{ id: 'existing-receipt' }] };
  const f = await fixture(t, original), previous = structuredClone(f.records.get('islands/player'));
  for (const [name, code] of [['AB', 'invalid-island-name'], ['Kurwa Bay', 'inappropriate-island-name'], ['SH1T', 'inappropriate-island-name']]) {
    const result = await f.save({ ...original, islandName: name });
    assert.equal(result.status, 400); assert.equal(result.body.error, code);
    assert.deepEqual(f.records.get('islands/player'), previous);
  }
  const result = await f.save({ ...original, islandName: 'Żółwia Zatoka' });
  assert.equal(result.status, 200); assert.equal(result.body.revision, 2);
  const read = await f.request('GET'), saved = JSON.parse(read.body.island.payload);
  assert.equal(saved.islandName, 'Żółwia Zatoka');
  assert.deepEqual(saved.tutorial, original.tutorial); assert.deepEqual(saved.commerce.receipts, original.commerce.receipts);
});

test('authenticated autosave retains a legacy two-character name and accepts its later valid rename', async t => {
  const original = JSON.parse(createStarterIsland(NOW)); original.islandName = 'AB';
  original.tutorial = { completed: { 'rules-read': true } };
  const f = await fixture(t, original);
  assert.equal(JSON.parse((await f.request('GET')).body.island.payload).islandName, 'AB');
  assert.equal((await f.save({ ...original, resources: { ...original.resources, wood: 75 } })).status, 200);
  assert.equal((await f.save({ ...original, islandName: 'New Harbour' }, 2)).status, 200);
  assert.equal(JSON.parse((await f.request('GET')).body.island.payload).islandName, 'New Harbour');
});

test('daughter suffixes follow new-name rules while an existing legacy prefix/suffix survives mother rename', async t => {
  const original = JSON.parse(createStarterIsland(NOW)); original.islandName = 'Kurwa Bay'; original.buildings.townhall.level = 10;
  const daughter = JSON.parse(createStarterIsland(NOW)); daughter.islandName = 'Kurwa Bay - XY'; daughter.islandSuffix = 'XY'; daughter.islandRole = 'daughter';
  original.archipelago = { version: 1, activeIslandId: 'island-1', secondIsland: daughter, shipCapacity: 1000, transfers: [], capacityReceipts: [] };
  const f = await fixture(t, original);
  const renamed = structuredClone(original); renamed.islandName = 'Matka'; renamed.archipelago.secondIsland.islandName = 'Matka - XY';
  assert.equal((await f.save(renamed)).status, 200);
  for (const suffix of ['AB', 'Fuck']) {
    const invalid = structuredClone(renamed); invalid.archipelago.secondIsland.islandSuffix = suffix; invalid.archipelago.secondIsland.islandName = `Matka - ${suffix}`;
    assert.equal((await f.save(invalid, 2)).status, 400);
  }
  const valid = structuredClone(renamed); valid.archipelago.secondIsland.islandSuffix = 'Przystań'; valid.archipelago.secondIsland.islandName = 'Matka - Przystań';
  assert.equal((await f.save(valid, 2)).status, 200);
});
