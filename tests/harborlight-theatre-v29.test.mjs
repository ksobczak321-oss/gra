import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTheatre, theatreAction, theatreQuote, theatreStatus, nextTheatreEvent, advanceTheatre,
  THEATRE_DECORATIONS, THEATRE_RULES } from '../harborlight-v1-theatre.js';
import { theatreDecorationSvg, renderTheatreScene, THEATRE_SLOT_POSITIONS } from '../harborlight-v1-theatre-art.js';

const world = (coins = 100000) => { const state = { worldTimeMs: Date.UTC(2026, 10, 3), resources: { coins }, settings: { language: 'pl' } }; normalizeTheatre(state); return state; };
const act = (state, type, payload = {}, context = {}) => theatreAction(state, { type, ...payload }, context);
const buy = (state, decoration = 'fountain', slot = null) => { const result = act(state, 'theatreBuy', { decoration, slot }); assert.equal(result.ok, true, result.message); return result.item; };
const untilLevel = (state, id, target) => { while (state.theatre.collection.find(item => item.id === id).level < target) assert.equal(act(state, 'theatreUpgrade', { id }, { noAds: true }).ok, true); };

test('Theatre has twenty independent places and ten decoration types; purchases really cost game coins', () => {
  const state = world(1000), before = state.resources.coins;
  const first = buy(state, 'fountain', 0), second = buy(state, 'fountain', 1);
  assert.notEqual(first.id, second.id);
  assert.equal(state.resources.coins, before - theatreStatus(state).catalog.find(kind => kind.id === 'fountain').coins * 2);
  assert.equal(THEATRE_DECORATIONS.length, 10); assert.equal(THEATRE_RULES.slots, 20);
  untilLevel(state, first.id, 3);
  assert.deepEqual(state.theatre.collection.map(item => item.level), [3, 1]);
});

test('moving, swapping, storing and reinstalling keep ownership, level and balance without duplicate items', () => {
  const state = world(), a = buy(state, 'statue', 0), b = buy(state, 'column', 1), c = buy(state, 'tree');
  untilLevel(state, a.id, 8); const coins = state.resources.coins;
  assert.equal(act(state, 'theatreMove', { id: a.id, slot: 1 }).ok, true);
  assert.equal(state.theatre.collection.find(item => item.id === b.id).slot, 0);
  assert.equal(act(state, 'theatrePlace', { id: c.id, slot: 1 }).ok, true);
  assert.equal(state.theatre.collection.find(item => item.id === a.id).slot, null);
  assert.equal(act(state, 'theatrePlace', { id: a.id, slot: 19 }).ok, true);
  assert.equal(act(state, 'theatreRemove', { id: a.id }).ok, true);
  assert.equal(act(state, 'theatrePlace', { id: a.id, slot: 17 }).ok, true);
  assert.equal(state.theatre.collection.find(item => item.id === a.id).level, 8);
  assert.equal(state.resources.coins, coins); assert.equal(state.theatre.collection.length, 3);
  for (const slot of [-1, 20, 0.5, '2', NaN]) assert.equal(act(state, 'theatreMove', { id: a.id, slot }).ok, false);
});

test('a milestone charges only after a confirmed completed advertisement; cancelling spends nothing', () => {
  const state = world(), item = buy(state); untilLevel(state, item.id, 4);
  const coins = state.resources.coins, quote = theatreQuote(state, { id: item.id });
  assert.equal(quote.requiresAd, true); assert.equal(quote.targetLevel, 5);
  assert.equal(act(state, 'theatreUpgrade', { id: item.id }).code, 'ad-required');
  const started = act(state, 'theatreBeginUpgradeAd', { id: item.id });
  assert.equal(started.ok, true); assert.equal(state.resources.coins, coins);
  assert.equal(act(state, 'theatreCompleteUpgradeAd', { nonce: started.nonce, receiptId: 'unverified', verified: true, noAds: true }).code, 'ad-unverified');
  assert.equal(state.resources.coins, coins); assert.equal(state.theatre.collection[0].level, 4);
  assert.equal(act(state, 'theatreCancelUpgradeAd', { nonce: started.nonce }).ok, true);
  assert.equal(state.resources.coins, coins); assert.equal(state.theatre.collection[0].level, 4);
  const retry = act(state, 'theatreBeginUpgradeAd', { id: item.id });
  assert.equal(act(state, 'theatreCompleteUpgradeAd', { nonce: retry.nonce, receiptId: 'dev-receipt' }, { environment: 'development', devSimulation: true, rewardedAdVerified: true }).ok, true);
  assert.equal(state.resources.coins, coins - quote.coins); assert.equal(state.theatre.collection[0].level, 5);
  assert.equal(act(state, 'theatreCompleteUpgradeAd', { nonce: retry.nonce, receiptId: 'dev-receipt' }, { environment: 'development', devSimulation: true, rewardedAdVerified: true }).ok, false);
});

test('PROD refuses simulated ad completion and accepts only the trusted provider context', () => {
  const state = world(), item = buy(state); untilLevel(state, item.id, 4);
  const started = act(state, 'theatreBeginUpgradeAd', { id: item.id });
  const payload = { nonce: started.nonce, receiptId: 'provider-123' };
  assert.equal(act(state, 'theatreCompleteUpgradeAd', payload, { environment: 'production', devSimulation: true, rewardedAdVerified: true }).code, 'ad-unverified');
  assert.equal(act(state, 'theatreCompleteUpgradeAd', payload, { devSimulation: true, rewardedAdVerified: true }).code, 'ad-unverified');
  assert.equal(act(state, 'theatreCompleteUpgradeAd', payload, { environment: 'production', verifiedProvider: true, rewardedAdVerified: true }).ok, true);
});

test('no-ad rights replace milestone films but never the coin price; arbitrary action fields grant nothing', () => {
  const state = world(), item = buy(state); untilLevel(state, item.id, 4);
  const coins = state.resources.coins, quote = theatreQuote(state, { id: item.id }, { noAds: true });
  assert.equal(quote.requiresAd, false);
  assert.equal(act(state, 'theatreUpgrade', { id: item.id, noAds: true }).code, 'ad-required');
  assert.equal(act(state, 'theatreUpgrade', { id: item.id }, { noAds: true }).ok, true);
  assert.equal(state.resources.coins, coins - quote.coins);
});

test('reload preserves collection, arrangement, twenty levels and pending intent without granting an improvement', () => {
  const state = world(), item = buy(state, 'fountain', 19); untilLevel(state, item.id, 4);
  const pending = act(state, 'theatreBeginUpgradeAd', { id: item.id });
  const raw = structuredClone(state), restored = { worldTimeMs: state.worldTimeMs, resources: { ...state.resources } };
  normalizeTheatre(restored, raw);
  assert.deepEqual(restored.theatre, state.theatre); assert.equal(restored.theatre.collection[0].level, 4);
  restored.worldTimeMs += 120000; advanceTheatre(restored, 120);
  assert.equal(restored.theatre.pendingUpgrade, null); assert.equal(nextTheatreEvent(restored), Infinity);
  assert.equal(act(restored, 'theatreCompleteUpgradeAd', { nonce: pending.nonce, receiptId: 'late' }, { verifiedProvider: true, rewardedAdVerified: true }).ok, false);
});

test('settlement revalidates balance and quote, so neither free upgrades nor negative balances appear', () => {
  const state = world(), item = buy(state); untilLevel(state, item.id, 4);
  const started = act(state, 'theatreBeginUpgradeAd', { id: item.id });
  state.resources.coins = 0;
  assert.equal(act(state, 'theatreCompleteUpgradeAd', { nonce: started.nonce, receiptId: 'not-affordable' }, { verifiedProvider: true, rewardedAdVerified: true }).code, 'not-enough-coins');
  assert.equal(state.resources.coins, 0); assert.equal(state.theatre.collection[0].level, 4);
  assert.equal(act(state, 'theatreBuy', { decoration: 'bench', slot: 0 }).code, 'not-enough-coins');
});

test('normalization rejects duplicate ids and slots, invalid styles/types and never creates money', () => {
  const state = world();
  normalizeTheatre(state, { theatre: { collection: [
    { id: 'decoration-1', type: 'fountain', level: 99, style: 'marble', slot: 0 },
    { id: 'decoration-1', type: 'bench', level: 1, slot: 1 },
    { id: 'decoration-2', type: 'bench', level: 3, style: '<script>', slot: 0 },
    { id: 'decoration-3', type: 'not-real', level: 3, slot: 2 },
    { id: '<script>', type: 'tree', level: 3, slot: 2 }
  ] } });
  assert.equal(state.theatre.collection.length, 2); assert.equal(state.theatre.collection[0].level, 20);
  assert.equal(state.theatre.collection[1].slot, null); assert.equal(state.theatre.collection[1].style, 'coastal');
  const bought = buy(state, 'bench', 19); assert.equal(bought.id, 'decoration-3');
});

test('all ten types award a permanent cosmetic pennant exactly once, without currency or happiness rewards', () => {
  const state = world();
  for (const kind of THEATRE_DECORATIONS) buy(state, kind.id);
  const coins = state.resources.coins;
  assert.deepEqual(state.theatre.badges, ['island-stage-pennant']);
  for (let i = 0; i < 4; i++) normalizeTheatre(state);
  assert.equal(state.resources.coins, coins); assert.equal(state.theatre.badges.length, 1);
  assert.match(renderTheatreScene(state), /island theatre|Teatr i ogród/);
});

test('each of 200 decoration type-level combinations has distinct actual SVG geometry', () => {
  for (const kind of THEATRE_DECORATIONS) {
    const images = Array.from({ length: 20 }, (_, index) => theatreDecorationSvg(kind.id, index + 1, 'coastal', { animated: false })
      .replace(/data-decoration-level="\d+"/g, ''));
    assert.equal(new Set(images).size, 20, kind.id);
    assert.ok(images.every(image => /(?:path|circle|ellipse|rect|polygon)/.test(image)), kind.id);
  }
  assert.equal(THEATRE_SLOT_POSITIONS.length, 20);
  const scene = renderTheatreScene(world());
  assert.equal((scene.match(/data-theatre-scene-slot=/g) || []).length, 20);
  assert.doesNotMatch(scene, /NaN|undefined|<script/);
});
