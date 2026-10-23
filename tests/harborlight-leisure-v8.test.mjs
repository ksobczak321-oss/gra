import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTRACTIONS, ATTRACTION_EFFECT_SECONDS, LEISURE_DAY_SECONDS,
  normalizeLeisure, leisureAction, advanceLeisure as advanceLeisureClock, nextLeisureEvent,
  leisureOffers, residentLeisureBonus, roadSummary, roadSpeedMultiplier,
  roadCapacityMultiplier
} from '../harborlight-v1-leisure.js';

function island(level = 3) {
  const state = { worldTimeMs: Date.UTC(2026, 9, 23), activeSeconds: 0,
    buildings: { townhall: { level }, chapel: { level: 1 } },
    resources: { coins: 100000, stone: 100000 }, paths: 0,
    notifications: [], notificationSequence: 0,
    residents: Array.from({ length: 12 }, (_, index) => ({
      id: index + 1, happiness: index - 6, newbornRemaining: 0,
      workplace: null, visitHappinessRemaining: 0 })) };
  normalizeLeisure(state, state);
  return state;
}
// Pure leisure time is advanced alongside the shared world clock, as the state integrator does.
function advanceLeisure(state, seconds) {
  advanceLeisureClock(state, seconds);
  state.worldTimeMs = state.leisure.clockMs;
}

const buy = (state, id = state.leisure.offers[0].id) => leisureAction(state, { type: 'buyAttraction', id });
const road = (state, level) => leisureAction(state, { type: 'upgradeRoad', level });
const roundTrip = state => {
  const saved = structuredClone(state), restored = structuredClone(saved);
  normalizeLeisure(restored, saved);
  return restored;
};

test('20 distinct attractions produce five persistent daily offers with Y in 5..100', () => {
  const state = island();
  assert.equal(ATTRACTIONS.length, 20);
  assert.equal(new Set(ATTRACTIONS.map(item => item.id)).size, 20);
  assert.equal(ATTRACTIONS.filter(item => item.kind === 'decoration').length, 10);
  assert.equal(ATTRACTIONS.filter(item => item.kind === 'event').length, 10);
  assert.equal(state.leisure.offers.length, 5);
  assert.equal(new Set(state.leisure.offers.map(offer => offer.id)).size, 5);
  assert.ok(state.leisure.offers.every(offer => Number.isInteger(offer.y) && offer.y >= 5 && offer.y <= 100));
  assert.deepEqual(roundTrip(state), state, 'loading must not reroll offers or advance the random seed');
});

test('offer price uses current Town Hall level while Y and its daily reward remain fixed', () => {
  const state = island(1), initial = leisureOffers(state)[0];
  state.buildings.townhall.level = 4;
  const changed = leisureOffers(state)[0];
  assert.equal(changed.y, initial.y);
  assert.equal(changed.price, initial.y * 4);
  assert.equal(changed.amount, initial.y);
  assert.equal(changed.residentCount, 4);
  const before = state.resources.coins;
  const result = buy(state, changed.id);
  assert.equal(result.ok, true);
  assert.equal(state.resources.coins, before - initial.y * 4);
  assert.equal(result.residentIds.length, 4);
  assert.equal(state.leisure.effects[0].remaining, ATTRACTION_EFFECT_SECONDS);
});

test('attractions benefit the least happy residents and keep newborn happiness frozen', () => {
  const state = island(2);
  state.residents[0].newbornRemaining = 86400;
  state.residents[1].visitHappinessRemaining = 3600;
  state.residents[2].happiness = -90;
  state.residents[3].happiness = -80;
  const result = buy(state);
  assert.deepEqual(result.residentIds, [3, 4]);
  assert.equal(residentLeisureBonus(state, state.residents[0]), 0);
  assert.equal(residentLeisureBonus(state, state.residents[2]), result.amount);
  assert.equal(state.residents[2].happiness, -90, 'timed effects must not permanently change personal happiness');
});

test('receiver selection accounts for existing bonuses and a production blockage', () => {
  const state = island(1);
  for (const person of state.residents) person.happiness = 0;
  state.buildings.quarry = { level: 1, ready: 200 };
  state.residents[7].workplace = 'quarry';
  state.residents[7].blockedSeconds = 86400;
  assert.deepEqual(buy(state).residentIds, [8]);
});

test('each attraction has 100/75/50/25 percent purchases then refuses a fifth without payment', () => {
  const state = island(1), offer = state.leisure.offers[0];
  offer.y = 7; // Partial points remain exact; display rounding belongs to the UI.
  const start = state.resources.coins;
  const amounts = Array.from({ length: 4 }, () => buy(state, offer.id).amount);
  assert.deepEqual(amounts, [7, 5.25, 3.5, 1.75]);
  assert.equal(state.resources.coins, start - 4 * 7);
  const before = structuredClone(state);
  const refused = buy(state, offer.id);
  assert.equal(refused.ok, false);
  assert.match(refused.message, /24-hour break/);
  assert.deepEqual(state, before);
});

test('habituation applies separately and another attraction starts at full happiness', () => {
  const state = island(), [one, two] = state.leisure.offers;
  buy(state, one.id); buy(state, one.id);
  const result = buy(state, two.id);
  assert.equal(result.amount, two.y);
  assert.equal(state.leisure.habits[one.id].uses, 2);
  assert.equal(state.leisure.habits[two.id].uses, 1);
});

test('a repeat purchase resets only its own 24-hour no-purchase break', () => {
  const state = island(), [one, two] = state.leisure.offers;
  buy(state, one.id); buy(state, two.id);
  advanceLeisure(state, 3 * 3600);
  buy(state, one.id);
  assert.equal(state.leisure.habits[one.id].resetRemaining, 86400);
  assert.equal(state.leisure.habits[two.id].resetRemaining, 21 * 3600);
  advanceLeisure(state, 21 * 3600);
  assert.equal(state.leisure.habits[two.id], undefined);
  assert.equal(state.leisure.habits[one.id].resetRemaining, 3 * 3600);
  advanceLeisure(state, 3 * 3600);
  assert.equal(state.leisure.habits[one.id], undefined);
});

test('each purchase has an independent six-hour duration and expires without removing intrinsic points', () => {
  const state = island(1), id = state.leisure.offers[0].id;
  const personal = state.residents.map(person => person.happiness);
  buy(state, id);
  advanceLeisure(state, 3600);
  buy(state, id);
  assert.deepEqual(state.leisure.effects.map(effect => effect.remaining), [5 * 3600, 6 * 3600]);
  advanceLeisure(state, 5 * 3600);
  assert.equal(state.leisure.effects.length, 1);
  assert.equal(state.leisure.effects[0].remaining, 3600);
  advanceLeisure(state, 3600);
  assert.equal(state.leisure.effects.length, 0);
  assert.deepEqual(state.residents.map(person => person.happiness), personal);
});

test('first offers change at Warsaw midnight and returning to the tab does not reroll', () => {
  const state = island(), old = structuredClone(state.leisure.offers);
  const firstWindow = state.leisure.rotationRemaining;
  assert.equal(firstWindow, 22 * 3600, '00:00 UTC is02:00 inWarsaw on23October');
  advanceLeisure(state, firstWindow - 1);
  assert.deepEqual(state.leisure.offers, old);
  assert.equal(nextLeisureEvent(state), 1);
  advanceLeisure(state, 1);
  assert.equal(state.leisure.rotationRemaining, 86400);
  assert.ok(state.leisure.offers.every(offer => !old.some(previous => previous.id === offer.id)));
  assert.deepEqual(roundTrip(state), state);
  assert.equal(state.notifications.filter(item => item.kind === 'attractions-renewed').length, 1);
});

test('daily rotation and habituation remain identical for whole, split and reloaded offline intervals', () => {
  const state = island();
  buy(state); advanceLeisure(state, 3200);
  const whole = structuredClone(state), split = roundTrip(state);
  advanceLeisure(whole, 7 * 86400 + 12345);
  for (const seconds of [1600, 40000, 12345, 400000, 163200]) advanceLeisure(split, seconds);
  assert.deepEqual(split, whole);
});

test('invalid, unavailable, unaffordable and frozen-population purchases preserve resources and clocks', () => {
  for (const kind of ['unknown', 'not-today', 'poor', 'newborns']) {
    const state = island();
    let id = state.leisure.offers[0].id;
    if (kind === 'unknown') id = '__proto__';
    if (kind === 'not-today') id = ATTRACTIONS.find(item => !state.leisure.offers.some(offer => offer.id === item.id)).id;
    if (kind === 'poor') state.resources.coins = 0;
    if (kind === 'newborns') for (const person of state.residents) person.newbornRemaining = 86400;
    const before = structuredClone(state);
    assert.equal(buy(state, id).ok, false);
    assert.deepEqual(state, before, kind);
  }
});

test('normalizing saved attractions rejects malformed entries and preserves actual valid effect targets', () => {
  const state = island();
  buy(state);
  const saved = structuredClone(state);
  saved.leisure.effects.push({ id: 9000, attractionId: 'fake', amount: 10, residentIds: [1], remaining: 100 });
  saved.leisure.effects[0].residentIds.push(-1, 0, '4', 1);
  normalizeLeisure(state, saved);
  assert.equal(state.leisure.effects.length, 1);
  assert.ok(state.leisure.effects[0].residentIds.every(id => Number.isSafeInteger(id) && id > 0));
  assert.equal(new Set(state.leisure.effects[0].residentIds).size, state.leisure.effects[0].residentIds.length);
  const valid = structuredClone(state);
  normalizeLeisure(state, valid);
  assert.deepEqual(state, valid);
});

test('paths start at level zero and each section step consumes exactly 100 central stone immediately', () => {
  const state = island();
  assert.deepEqual(state.roads.segments, Array(100).fill(0));
  const before = state.resources.stone;
  const result = road(state, 1);
  assert.equal(result.ok, true);
  assert.equal(state.resources.stone, before - 100);
  assert.equal(state.roads.segments[0], 1);
  assert.equal(roadSummary(state).upgraded, 1);
  assert.equal(roadSpeedMultiplier(state), 1);
  assert.equal(roadCapacityMultiplier(state), 1);
});

test('a higher path tier is locked until all hundred sections reach the previous level', () => {
  const state = island();
  for (let index = 0; index < 99; index++) assert.equal(road(state, 1).ok, true);
  const before = structuredClone(state);
  assert.equal(road(state, 2).ok, false);
  assert.deepEqual(state, before);
  assert.equal(roadSummary(state).levels[1].unlocked, false);
  assert.equal(road(state, 1).ok, true);
  assert.equal(roadSummary(state).level, 1);
  assert.equal(roadSummary(state).levels[1].unlocked, true);
  assert.equal(roadSpeedMultiplier(state), 1.1);
  assert.equal(road(state, 2).ok, true);
  assert.equal(roadSpeedMultiplier(state), 1.1, 'one level-two section does not activate the next bonus');
});

test('all five path levels cost 50000 stone and give additive completed-tier speed and capacity bonuses', () => {
  const state = island();
  const initial = state.resources.stone;
  const expected = [[1.1, 1], [1.2, 1], [1.3, 1.1], [1.4, 1.2], [1.5, 1.3]];
  for (let level = 1; level <= 5; level++) {
    for (let section = 0; section < 100; section++) assert.equal(road(state, level).ok, true);
    assert.deepEqual([roadSpeedMultiplier(state), roadCapacityMultiplier(state)], expected[level - 1]);
    assert.equal(roadSummary(state).level, level);
  }
  assert.equal(state.resources.stone, initial - 50000);
  assert.equal(roadSummary(state).totalUpgrades, 500);
  assert.equal(roadSummary(state).nextLevel, null);
  const before = structuredClone(state);
  assert.equal(road(state, 5).ok, false);
  assert.deepEqual(state, before);
  assert.equal(state.notifications.filter(item => item.kind === 'roads-tier-complete').length, 5);
});

test('saved path progress survives reload and legacy paid sections migrate without erasure', () => {
  const state = island();
  for (let index = 0; index < 107; index++) road(state, index < 100 ? 1 : 2);
  assert.deepEqual(roundTrip(state), state);
  const legacy = island(); delete legacy.roads; delete legacy.leisure; legacy.paths = 37;
  normalizeLeisure(legacy, legacy);
  assert.equal(legacy.roads.segments.filter(level => level === 1).length, 37);
  assert.equal(roadSummary(legacy).level, 0);
  assert.equal(legacy.paths, 37);
});

test('bad road levels and missing stone reject atomically without inventing transport or happiness', () => {
  for (const level of [0, -1, 1.5, '1', 6, NaN]) {
    const state = island(), before = structuredClone(state);
    assert.equal(road(state, level).ok, false);
    assert.deepEqual(state, before);
  }
  const state = island(); state.resources.stone = 99;
  const before = structuredClone(state);
  assert.equal(road(state, 1).ok, false);
  assert.deepEqual(state, before);
});
