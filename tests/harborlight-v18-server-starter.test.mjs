import test from 'node:test';
import assert from 'node:assert/strict';
import { createStarterIsland } from '../backend/server.mjs';
import { createAccountService, LEGAL_DOCUMENT_VERSIONS } from '../backend/account-service.mjs';
import { normalizeState } from '../harborlight-v1-state.js';
const NOW = Date.parse('2026-10-30T12:00:00Z');

test('server starter survives frontend normalization and cloud snapshot save without fake purchases', async () => {
  const documents = new Map();
  const store = { runTransaction: async work => work({ get: async key => structuredClone(documents.get(key)), set: async (key, value) => documents.set(key, structuredClone(value)), delete: async key => documents.delete(key) }) };
  const service = createAccountService({ store, now: () => NOW, environment: 'production' });
  await service.acceptLegal({ uid: 'player', ...LEGAL_DOCUMENT_VERSIONS, termsAccepted: true, privacyAcknowledged: true });
  await service.startIsland({ uid: 'player', payload: createStarterIsland(NOW) });
  const read = await service.readIsland({ uid: 'player' });
  const game = normalizeState(JSON.parse(read.island.payload), NOW);
  assert.equal(game.population, 12); assert.equal(game.happiness, 20); assert.equal(game.buildings.townhall.level, 1);
  assert.ok(Object.values(game.resources).every(value => value === 100));
  assert.ok(Object.values(game.buildings).every(building => building.workers === 0));
  assert.equal(game.welcome.until, NOW + 72 * 3600000);
  const saved = await service.saveIsland({ uid: 'player', payload: JSON.stringify(game), expectedRevision: 1, generation: 1 });
  assert.equal(saved.revision, 2);
  const restored = normalizeState(JSON.parse((await service.readIsland({ uid: 'player' })).island.payload), NOW);
  assert.deepEqual(restored.resources, game.resources);
  assert.deepEqual(restored.commerce.receipts, []);
  assert.equal(restored.population, 12); assert.equal(restored.welcome.until, game.welcome.until);
});
