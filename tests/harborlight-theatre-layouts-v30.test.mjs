import test from 'node:test';
import assert from 'node:assert/strict';
import * as Theatre from '../harborlight-v1-theatre.js';

const at = Date.parse('2026-11-03T15:00:00Z');
const clone = value => JSON.parse(JSON.stringify(value));
const world = () => {
  const state = { worldTimeMs: at, resources: { coins: 100000 }, settings: { language: 'pl' } };
  Theatre.normalizeTheatre(state);
  return state;
};
const command = (state, type, payload = {}, context = {}) => Theatre.theatreAction(state, { type, ...payload }, context);
const succeed = (state, type, payload = {}, context = {}) => {
  const result = command(state, type, payload, context);
  assert.equal(result?.ok, true, result?.message || `Missing action: ${type}`);
  return result;
};
const buy = (state, decoration, slot, style = 'coastal') => succeed(state, 'theatreBuy', { decoration, slot, style }).item;
const improve = (state, id, level) => {
  while (state.theatre.collection.find(item => item.id === id).level < level) {
    succeed(state, 'theatreUpgrade', { id }, { noAds: true });
  }
};

test('v29 Theatre migration adds three design slots without altering owned items, coins or pending advertisements', () => {
  const original = world(), fountain = buy(original, 'fountain', 8, 'marble');
  improve(original, fountain.id, 4);
  succeed(original, 'theatreBeginUpgradeAd', { id: fountain.id });
  original.theatre.adReceipts.push('previous-valid-receipt');
  const raw = clone(original);
  delete raw.theatre.atmosphere;
  delete raw.theatre.layouts;
  const migrated = { worldTimeMs: at, resources: { ...original.resources } };
  Theatre.normalizeTheatre(migrated, raw);
  assert.deepEqual(migrated.theatre.collection, original.theatre.collection);
  assert.deepEqual(migrated.theatre.pendingUpgrade, original.theatre.pendingUpgrade);
  assert.deepEqual(migrated.theatre.adReceipts, original.theatre.adReceipts);
  assert.deepEqual(migrated.theatre.atmosphere, { lighting: 'day', paving: 'sandstone' });
  assert.deepEqual(migrated.theatre.layouts, [null, null, null]);
  assert.equal(migrated.resources.coins, original.resources.coins);
  assert.equal(Theatre.THEATRE_RULES.savedLayouts, 3);
  assert.deepEqual(Theatre.THEATRE_LIGHTING.map(item => item.id), ['day', 'golden', 'night']);
  assert.deepEqual(Theatre.THEATRE_PAVING.map(item => item.id), ['sandstone', 'stone', 'brick']);
});

test('three saved compositions can be restored after purchases and upgrades without refunds, duplicates or level rollback', () => {
  const state = world(), fountain = buy(state, 'fountain', 0, 'marble'), bench = buy(state, 'bench', 1, 'garden');
  succeed(state, 'theatreSetAtmosphere', { lighting: 'golden', paving: 'brick' });
  succeed(state, 'theatreSaveLayout', { slot: 0 });
  improve(state, fountain.id, 6);
  const tree = buy(state, 'tree', 2, 'holiday');
  succeed(state, 'theatreMove', { id: fountain.id, slot: 9 });
  succeed(state, 'theatreRestyle', { id: fountain.id, style: 'pirate' });
  succeed(state, 'theatreSetAtmosphere', { lighting: 'night', paving: 'stone' });
  succeed(state, 'theatreSaveLayout', { slot: 1 });
  succeed(state, 'theatreMove', { id: bench.id, slot: 4 });
  succeed(state, 'theatreSaveLayout', { slot: 2 });
  const balance = state.resources.coins, sequence = state.theatre.sequence;
  succeed(state, 'theatreRestoreLayout', { slot: 0 });
  assert.equal(state.resources.coins, balance);
  assert.equal(state.theatre.sequence, sequence);
  assert.equal(state.theatre.collection.length, 3);
  assert.deepEqual(state.theatre.atmosphere, { lighting: 'golden', paving: 'brick' });
  const owned = new Map(state.theatre.collection.map(item => [item.id, item]));
  assert.equal(owned.get(fountain.id).level, 6);
  assert.equal(owned.get(fountain.id).style, 'marble');
  assert.equal(owned.get(fountain.id).slot, 0);
  assert.equal(owned.get(bench.id).slot, 1);
  assert.equal(owned.get(tree.id).slot, null);
  succeed(state, 'theatreRestoreLayout', { slot: 1 });
  assert.equal(owned.get(fountain.id).slot, 9);
  assert.equal(owned.get(fountain.id).style, 'pirate');
  assert.equal(owned.get(fountain.id).level, 6);
  assert.equal(owned.get(tree.id).slot, 2);
  assert.equal(state.resources.coins, balance);
});

test('empty compositions and deletion are harmless design operations that never destroy collected decorations', () => {
  const state = world();
  succeed(state, 'theatreSaveLayout', { slot: 0 });
  buy(state, 'column', 5); buy(state, 'mosaic', 19);
  const balance = state.resources.coins;
  succeed(state, 'theatreRestoreLayout', { slot: 0 });
  assert.equal(state.theatre.collection.length, 2);
  assert.ok(state.theatre.collection.every(item => item.slot === null));
  assert.equal(state.resources.coins, balance);
  succeed(state, 'theatreDeleteLayout', { slot: 0 });
  succeed(state, 'theatreDeleteLayout', { slot: 2 });
  assert.equal(state.theatre.layouts[0], null);
  assert.equal(command(state, 'theatreRestoreLayout', { slot: 0 }).ok, false);
  assert.equal(state.theatre.collection.length, 2);
});

test('atmosphere and design slot validation reject mixed invalid input atomically', () => {
  const state = world(); buy(state, 'lantern', 4);
  succeed(state, 'theatreSaveLayout', { slot: 0 });
  for (const payload of [{}, { lighting: 'noon' }, { lighting: 'night', paving: 'lava' }, { lighting: null }, { paving: 2 }]) {
    const before = clone(state);
    assert.equal(command(state, 'theatreSetAtmosphere', payload).ok, false);
    assert.deepEqual(state, before);
  }
  for (const type of ['theatreSaveLayout', 'theatreRestoreLayout', 'theatreDeleteLayout']) {
    for (const slot of [-1, 3, 0.5, '1', null, undefined, Infinity]) {
      const before = clone(state);
      assert.equal(command(state, type, { slot }).ok, false, `${type}: ${slot}`);
      assert.deepEqual(state, before);
    }
  }
  succeed(state, 'theatreSetAtmosphere', { lighting: 'night' });
  assert.deepEqual(state.theatre.atmosphere, { lighting: 'night', paving: 'sandstone' });
});

test('saving and restoring take layout data from owned state rather than forged action payloads', () => {
  const state = world(), bench = buy(state, 'bench', 2, 'garden');
  const balance = state.resources.coins;
  succeed(state, 'theatreSaveLayout', { slot: 0,
    placements: [{ id: 'decoration-999', slot: 0, type: 'fountain', level: 20 }],
    atmosphere: { lighting: 'night', paving: 'brick' }, coins: 100000000 });
  const saved = state.theatre.layouts[0];
  assert.deepEqual(saved.placements.map(item => item.id), [bench.id]);
  assert.ok(saved.placements.every(item => Object.keys(item).every(key => ['id', 'slot', 'style'].includes(key))));
  assert.deepEqual(saved.atmosphere, { lighting: 'day', paving: 'sandstone' });
  succeed(state, 'theatreMove', { id: bench.id, slot: 7 });
  succeed(state, 'theatreRestoreLayout', { slot: 0, level: 20, coins: 100000000, adReceipts: ['fake'] });
  assert.equal(state.theatre.collection[0].slot, 2);
  assert.equal(state.theatre.collection[0].level, 1);
  assert.equal(state.resources.coins, balance);
  assert.deepEqual(state.theatre.adReceipts, []);
});

test('malformed saved layouts are bounded to owned unique ids and valid unique positions', () => {
  const state = world(), a = buy(state, 'fountain', 0), b = buy(state, 'bench', 1), c = buy(state, 'tree', 2);
  const raw = clone(state);
  raw.theatre.layouts = [{ savedAt: at, atmosphere: { lighting: 'night', paving: 'brick' }, placements: [
    { id: a.id, slot: 3, style: 'marble', level: 20, coins: 1000 },
    { id: a.id, slot: 4, style: 'garden' },
    { id: b.id, slot: 3, style: 'coastal' },
    { id: 'decoration-999', slot: 5, style: 'holiday' },
    { id: c.id, slot: 7, style: 'coastal' },
    { id: b.id, slot: 20, style: 'coastal' },
  ] }, null, 'not-a-layout', ...Array(50).fill({ placements: [] })];
  const restored = { worldTimeMs: at, resources: { ...state.resources } };
  Theatre.normalizeTheatre(restored, raw);
  assert.equal(restored.theatre.layouts.length, 3);
  assert.equal(restored.theatre.layouts[1], null);
  assert.equal(restored.theatre.layouts[2], null);
  const placements = restored.theatre.layouts[0].placements;
  assert.ok(placements.length <= 20);
  assert.equal(new Set(placements.map(item => item.id)).size, placements.length);
  assert.equal(new Set(placements.map(item => item.slot)).size, placements.length);
  assert.ok(placements.every(item => state.theatre.collection.some(owned => owned.id === item.id)));
  assert.ok(placements.every(item => item.slot >= 0 && item.slot < 20));
  succeed(restored, 'theatreRestoreLayout', { slot: 0 });
  assert.equal(restored.resources.coins, state.resources.coins);
  assert.equal(restored.theatre.collection.length, state.theatre.collection.length);
  assert.ok(restored.theatre.collection.every(item => item.level === 1));
});

test('status is a detached view of atmosphere, layouts and placements', () => {
  const state = world(); buy(state, 'statue', 3);
  succeed(state, 'theatreSaveLayout', { slot: 0 });
  const before = clone(state), status = Theatre.theatreStatus(state);
  assert.equal(status.layouts[0].placementCount, 1);
  status.atmosphere.lighting = 'night';
  status.layouts[0].atmosphere.paving = 'brick';
  status.layouts[0].placements[0].slot = 19;
  status.layouts[1] = { placements: [] };
  status.collection[0].level = 20;
  assert.deepEqual(state, before);
});

test('JSON reload and layout restoration preserve an outstanding ad intent and its one-use settlement', () => {
  const state = world(), fountain = buy(state, 'fountain', 4);
  succeed(state, 'theatreSetAtmosphere', { lighting: 'golden', paving: 'stone' });
  succeed(state, 'theatreSaveLayout', { slot: 1 });
  improve(state, fountain.id, 4);
  const intent = succeed(state, 'theatreBeginUpgradeAd', { id: fountain.id });
  const raw = clone(state), restored = { worldTimeMs: at, resources: { ...state.resources } };
  Theatre.normalizeTheatre(restored, raw);
  assert.deepEqual(restored.theatre, state.theatre);
  succeed(restored, 'theatreRestoreLayout', { slot: 1 });
  assert.deepEqual(restored.theatre.pendingUpgrade, state.theatre.pendingUpgrade);
  assert.equal(restored.theatre.collection[0].level, 4);
  const before = restored.resources.coins, price = Theatre.theatreQuote(restored, { id: fountain.id }).coins;
  const context = { environment: 'development', devSimulation: true, rewardedAdVerified: true };
  succeed(restored, 'theatreCompleteUpgradeAd', { nonce: intent.nonce, receiptId: 'layout-ad-once' }, context);
  assert.equal(restored.theatre.collection[0].level, 5);
  assert.equal(restored.resources.coins, before - price);
  succeed(restored, 'theatreRestoreLayout', { slot: 1 });
  assert.equal(restored.theatre.collection[0].level, 5);
  assert.equal(command(restored, 'theatreCompleteUpgradeAd', { nonce: intent.nonce, receiptId: 'layout-ad-once' }, context).ok, false);
});

test('owned decorations continue beyond level twenty while legacy prices and the twenty-place garden remain', () => {
  const state = world(), item = buy(state, 'fountain', 19);
  assert.equal(Theatre.theatreQuote(state, { id: item.id }).coins, 45, 'level-two Fountain price is unchanged');
  improve(state, item.id, 19);
  assert.equal(Theatre.theatreQuote(state, { id: item.id }).coins, 960, 'level-twenty Fountain price is unchanged');
  improve(state, item.id, 30);
  const remainingCoins = state.resources.coins;
  const restored = { worldTimeMs: at + 86400000, resources: { ...state.resources } };
  Theatre.normalizeTheatre(restored, clone(state));
  assert.equal(restored.theatre.collection[0].level, 30);
  assert.equal(restored.theatre.collection[0].slot, 19);
  assert.equal(restored.resources.coins, remainingCoins);
  const status = Theatre.theatreStatus(restored);
  assert.equal(status.maxLevel, null);
  assert.equal(status.unlimitedLevels, true);
  assert.equal(status.slots, 20);
  assert.equal(Theatre.theatreQuote(restored, { id: item.id }).targetLevel, 31);
});

test('advertisements remain mandatory every fifth level after twenty and cannot be forged by an action', () => {
  const state = world(), item = buy(state, 'column', 3);
  improve(state, item.id, 24);
  const balance = state.resources.coins;
  const quote = Theatre.theatreQuote(state, { id: item.id });
  assert.equal(quote.targetLevel, 25); assert.equal(quote.requiresAd, true);
  assert.equal(command(state, 'theatreUpgrade', { id: item.id, noAds: true }).code, 'ad-required');
  const pending = succeed(state, 'theatreBeginUpgradeAd', { id: item.id });
  assert.equal(command(state, 'theatreCompleteUpgradeAd', { nonce: pending.nonce, receiptId: 'forged-25', verified: true }).code, 'ad-unverified');
  assert.equal(state.resources.coins, balance);
  succeed(state, 'theatreCompleteUpgradeAd', { nonce: pending.nonce, receiptId: 'completed-25' }, { environment: 'development', devSimulation: true, rewardedAdVerified: true });
  assert.equal(state.theatre.collection[0].level, 25);
  assert.equal(state.resources.coins, balance - quote.coins);
  assert.equal(Theatre.theatreQuote(state, { id: item.id }).requiresAd, false);
  for (const level of [5, 20, 25, 30, 50, 100, 1000]) assert.equal(Theatre.requiresTheatreAdvertisement(level), true);
  for (const level of [0, 1, 21, 26, 5.5, Infinity, '25']) assert.equal(Theatre.requiresTheatreAdvertisement(level), false);
});

test('unrepresentable prices and levels fail without debiting coins or writing Infinity to a save', () => {
  const state = world(), item = buy(state, 'fountain', 0);
  state.resources.coins = Number.MAX_SAFE_INTEGER;
  for (const [level, code] of [[1000000000000, 'price-out-of-range'], [Number.MAX_SAFE_INTEGER, 'level-out-of-range']]) {
    state.theatre.collection[0].level = level;
    const before = clone(state), quote = Theatre.theatreQuote(state, { id: item.id });
    assert.equal(quote.ok, false); assert.equal(quote.code, code);
    assert.equal(quote.coins, undefined);
    assert.equal(command(state, 'theatreUpgrade', { id: item.id }, { noAds: true }).ok, false);
    assert.equal(command(state, 'theatreBeginUpgradeAd', { id: item.id }).ok, false);
    assert.deepEqual(state, before);
    assert.equal(JSON.stringify(state).includes('Infinity'), false);
  }
});

test('continuing advertisement milestones keeps receipt history bounded during a long running session', () => {
  const state = world(), item = buy(state, 'bench', 0);
  improve(state, item.id, 24);
  state.theatre.adReceipts = Array.from({ length: 2000 }, (_, index) => `previous-ad-${index}`);
  const pending = succeed(state, 'theatreBeginUpgradeAd', { id: item.id });
  succeed(state, 'theatreCompleteUpgradeAd', { nonce: pending.nonce, receiptId: 'new-ad-25' }, { environment: 'development', devSimulation: true, rewardedAdVerified: true });
  assert.equal(state.theatre.adReceipts.length, 2000);
  assert.equal(state.theatre.adReceipts[0], 'previous-ad-1');
  assert.equal(state.theatre.adReceipts.at(-1), 'new-ad-25');
  assert.equal(state.theatre.collection[0].level, 25);
  assert.equal(command(state, 'theatreCompleteUpgradeAd', { nonce: pending.nonce, receiptId: 'new-ad-25' }, { environment: 'development', devSimulation: true, rewardedAdVerified: true }).ok, false);
});

test('several days of arranging, improving and storing survive independent JSON roundtrips', () => {
  let state = world();
  const fountain = buy(state, 'fountain', 2, 'marble'), bench = buy(state, 'bench', 8, 'garden');
  improve(state, fountain.id, 3);
  succeed(state, 'theatreSaveLayout', { slot: 0 });
  const reloadNextDay = () => {
    const raw = clone(state), next = { worldTimeMs: state.worldTimeMs + 86400000, resources: { ...state.resources } };
    Theatre.normalizeTheatre(next, raw); state = next;
  };
  reloadNextDay();
  succeed(state, 'theatreMove', { id: fountain.id, slot: 14 });
  succeed(state, 'theatreUpgrade', { id: fountain.id });
  succeed(state, 'theatreRemove', { id: bench.id });
  succeed(state, 'theatreSetAtmosphere', { lighting: 'night', paving: 'stone' });
  succeed(state, 'theatreSaveLayout', { slot: 1 });
  const balance = state.resources.coins;
  reloadNextDay();
  assert.deepEqual(state.theatre.collection.map(item => [item.id, item.level, item.slot]), [[fountain.id, 4, 14], [bench.id, 1, null]]);
  assert.deepEqual(state.theatre.atmosphere, { lighting: 'night', paving: 'stone' });
  succeed(state, 'theatreRestoreLayout', { slot: 0 });
  assert.equal(state.theatre.collection[0].level, 4);
  assert.equal(state.resources.coins, balance);
  succeed(state, 'theatreRemove', { id: fountain.id });
  reloadNextDay();
  assert.equal(state.theatre.collection[0].slot, null);
  assert.equal(state.theatre.collection[0].level, 4);
  assert.equal(state.resources.coins, balance);
  assert.equal(state.theatre.collection.length, 2);
});
