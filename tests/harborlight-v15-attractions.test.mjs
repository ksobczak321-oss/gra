import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLeisure, leisureOffers, leisureAction, advanceLeisure,
  attractionAvailability, residentLeisureBonus, ATTRACTION_EFFECT_SECONDS
} from '../harborlight-v1-leisure.js';

const HOUR = 3600;
const NOW = Date.UTC(2026, 9, 29, 12);
function island(population = 100, now = NOW) {
  const state = {
    population, worldTimeMs: now, resources: { coins: 1000000, stone: 100000, food: 1000 },
    buildings: { townhall: { level: 1 }, chapel: { level: 1 } },
    residents: Array.from({ length: population }, (_, i) => ({ id: i + 1, happiness: 0, newbornRemaining: 0, visitHappinessRemaining: 0, workplace: null })),
    notifications: [], notificationSequence: 0, paths: 0
  };
  normalizeLeisure(state, state);
  return state;
}
function advance(state, seconds) {
  advanceLeisure(state, seconds);
  state.worldTimeMs = state.leisure.clockMs;
}
function reload(state) {
  const copy = structuredClone(state);
  normalizeLeisure(copy, copy);
  return copy;
}
function buy(state, id = state.leisure.offers[0].id) {
  return leisureAction(state, { type: 'buyAttraction', id });
}

test('each offer rolls a stable integer audience of one to fifty percent without rerolling on read', () => {
  const observed = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const state = island(100, NOW + seed * 1731);
    const before = structuredClone(state.leisure);
    for (const offer of leisureOffers(state)) {
      assert.ok(Number.isInteger(offer.sharePercent));
      assert.ok(offer.sharePercent >= 1 && offer.sharePercent <= 50);
      assert.equal(offer.residentCount, offer.sharePercent);
      observed.add(offer.sharePercent);
    }
    assert.deepEqual(state.leisure, before);
    assert.deepEqual(reload(state).leisure, before);
  }
  assert.ok(observed.has(1));
  assert.ok(observed.has(50));
});

test('a legacy daily selection gains audience percentages once while preserving its identities and happiness', () => {
  const legacy = island();
  for (const offer of legacy.leisure.offers) delete offer.sharePercent;
  const original = legacy.leisure.offers.map(({ id, y }) => ({ id, y }));
  const migrated = reload(legacy), once = structuredClone(migrated.leisure);
  assert.deepEqual(migrated.leisure.offers.map(({ id, y }) => ({ id, y })), original);
  assert.ok(migrated.leisure.offers.every(offer => offer.sharePercent >= 1 && offer.sharePercent <= 50));
  assert.deepEqual(reload(migrated).leisure, once);
  assert.deepEqual(reload(legacy).leisure, once, 'the same legacy save has a deterministic one-time migration');
});

test('audience is based on population rather than Town Hall level and is capped by eligible people', () => {
  const state = island(12);
  state.leisure.offers[0].sharePercent = 50;
  let quote = leisureOffers(state)[0];
  assert.equal(quote.requestedResidentCount, 6);
  assert.equal(quote.residentCount, 6);
  state.buildings.townhall.level = 100;
  assert.equal(leisureOffers(state)[0].residentCount, 6);
  state.residents.forEach((person, index) => { if (index >= 3) person.happiness = 100; });
  state.residents[0].newbornRemaining = 86400;
  quote = leisureOffers(state)[0];
  assert.equal(quote.residentCount, 2);
  const result = buy(state);
  assert.equal(result.ok, true);
  assert.deepEqual([...result.residentIds].sort((a, b) => a - b), [2, 3]);
  assert.equal(result.price, Math.ceil(result.amount * 2));
});

test('small populations round a positive audience up to one person and never charge for no eligible audience', () => {
  const state = island(12);
  state.leisure.offers[0].sharePercent = 1;
  assert.equal(leisureOffers(state)[0].residentCount, 1);
  state.residents.forEach(person => { person.happiness = 100; });
  const before = structuredClone(state);
  const quote = leisureOffers(state)[0];
  assert.equal(quote.price, 0);
  assert.equal(quote.available, false);
  assert.equal(buy(state).ok, false);
  assert.deepEqual(state, before);
});

test('coin price follows total granted points across all recipients', () => {
  const state = island(100);
  const [one, two, three] = state.leisure.offers;
  Object.assign(one, { y: 10, sharePercent: 10 });
  Object.assign(two, { y: 20, sharePercent: 10 });
  Object.assign(three, { y: 10, sharePercent: 20 });
  const [small, stronger, wider] = leisureOffers(state);
  assert.equal(small.totalHappiness, 100);
  assert.equal(small.price, 100);
  assert.equal(stronger.totalHappiness, 200);
  assert.equal(stronger.price, 200);
  assert.equal(wider.totalHappiness, 200);
  assert.equal(wider.price, 200);
});

test('habituation reduces both the actual bonus and its total price with whole coins rounded up', () => {
  const state = island(12), offer = state.leisure.offers[0];
  Object.assign(offer, { y: 7, sharePercent: 1 });
  state.leisure.habits[offer.id] = { uses: 1, resetRemaining: 86400 };
  const quote = leisureOffers(state)[0];
  assert.equal(quote.amount, 5.25);
  assert.equal(quote.price, 6);
  const coins = state.resources.coins;
  const result = buy(state);
  assert.equal(result.ok, true);
  assert.equal(state.resources.coins, coins - 6);
  assert.equal(residentLeisureBonus(state, state.residents.find(person => person.id === result.residentIds[0])), 5.25);
});

test('only one attraction is active globally and thirty minutes is insufficient to start another', () => {
  const state = island(), first = state.leisure.offers[0].id;
  assert.equal(buy(state, first).ok, true);
  const before = structuredClone(state);
  for (const offer of leisureOffers(state)) {
    assert.equal(offer.available, false);
    assert.equal(offer.activeRemaining, ATTRACTION_EFFECT_SECONDS);
    assert.match(offer.reason, /Another attraction is active/);
    assert.equal(buy(state, offer.id).ok, false);
  }
  assert.deepEqual(state, before, 'rejected concurrent starts cannot spend coins or advance saved randomness');
  advance(state, 1800);
  assert.equal(attractionAvailability(state).remaining, ATTRACTION_EFFECT_SECONDS - 1800);
  assert.equal(buy(state, state.leisure.offers[1].id).ok, false);
});

test('the next attraction is available at exactly six hours with no extra thirty-minute wait', () => {
  const state = island(), second = state.leisure.offers[1].id;
  buy(state);
  advance(state, ATTRACTION_EFFECT_SECONDS - 1);
  assert.equal(buy(state, second).ok, false);
  advance(state, 1);
  assert.equal(attractionAvailability(state).active, false);
  assert.equal(buy(state, second).ok, true);
  assert.equal(attractionAvailability(state).remaining, ATTRACTION_EFFECT_SECONDS);
});

test('all paid overlapping legacy effects survive loading and block new starts until the last expiry', () => {
  const state = island();
  const [one, two, next] = state.leisure.offers;
  state.leisure.effects = [
    { id: 1, attractionId: one.id, title: one.name, amount: 20, residentIds: [1], remaining: 400 },
    { id: 2, attractionId: two.id, title: two.name, amount: 30, residentIds: [2], remaining: 1000 }
  ];
  const restored = reload(state), coins = restored.resources.coins;
  assert.equal(restored.leisure.effects.length, 2);
  assert.equal(residentLeisureBonus(restored, restored.residents[0]), 20);
  assert.equal(residentLeisureBonus(restored, restored.residents[1]), 30);
  assert.equal(attractionAvailability(restored).activeCount, 2);
  assert.equal(attractionAvailability(restored).remaining, 1000);
  advance(restored, 400);
  assert.equal(attractionAvailability(restored).activeCount, 1);
  assert.equal(buy(restored, next.id).ok, false);
  assert.equal(restored.resources.coins, coins);
  advance(restored, 600);
  assert.equal(buy(restored, next.id).ok, true);
});

test('attraction timer, audience and price remain identical through offline splits and reloads', () => {
  const whole = island(), split = structuredClone(whole);
  assert.deepEqual(buy(whole), buy(split));
  advance(whole, 6 * HOUR);
  let restored = split;
  for (let index = 0; index < 6; index++) {
    advance(restored, HOUR);
    restored = reload(restored);
  }
  assert.deepEqual(restored.leisure, whole.leisure);
  assert.deepEqual(leisureOffers(restored), leisureOffers(whole));
  assert.equal(attractionAvailability(restored).remaining, 0);
});

test('attraction mutex does not block path upgrades or remove overlapping chapel bonuses', () => {
  const state = island();
  state.chapelRemaining = 3600;
  state.blessingRemaining = 3600;
  assert.equal(buy(state).ok, true);
  assert.equal(leisureAction(state, { type: 'upgradeRoad', level: 1 }).ok, true);
  assert.equal(state.chapelRemaining, 3600);
  assert.equal(state.blessingRemaining, 3600);
});
