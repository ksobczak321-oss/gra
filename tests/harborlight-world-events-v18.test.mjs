import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD_EVENT_RULES, normalizeWorldEvents, nextWorldEvent, advanceWorldEvents,
  recordChapelBlessing, chapelGraceSeconds, eventProductionMultiplier,
  eventTransportMultiplier, worldEventHappinessPenalty, worldEventRows
} from '../harborlight-v1-events.js';
import { ordinaryStock, bonusStock, centralAvailable, consumeMaterial } from '../harborlight-v1-inventory.js';
import { removeResidentForDeparture, synchronizeResidents, residentHappiness } from '../harborlight-v1-residents.js';

const HOUR = 3600, DAY = 86400, NOW = Date.parse('2026-10-30T12:00:00Z');
const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const CONTEXT = { removeResident: removeResidentForDeparture, synchronizeResidents };
function island({ chapel = 1, population = 12, now = NOW } = {}) {
  const state = { worldTimeMs: now, activeSeconds: 0, population, residentSequence: population,
    resources: { coins: 10000, ...Object.fromEntries(MATERIALS.map(id => [id, 1000])) },
    bonusMaterials: Object.fromEntries(MATERIALS.map(id => [id, 0])),
    buildings: Object.fromEntries(['townhall', 'house', 'chapel', 'lighthouse', 'farm', 'lumber', 'quarry', 'windmill', 'sawmill', 'warehouse', 'market', 'dock'].map(id => [id, { level: id === 'townhall' ? 3 : id === 'chapel' ? chapel : 1, workers: 0, ready: 0, workProgress: [] }])),
    residents: Array.from({ length: population }, (_, index) => ({ id: index + 1, happiness: 0,
      workplace: null, arrivalRemaining: 0, returnRemaining: 0, newbornRemaining: 0,
      hungerSeconds: 0, unemployedSeconds: 0, fedRecoverySeconds: 0, blockedSeconds: 0,
      prayerRemaining: 0, visitGroup: null, visitHappinessRemaining: 0, visitCooldownRemaining: 0 })),
    notifications: [], notificationSequence: 0, constructionProjects: [],
    market: { orders: [] }, dock: { orders: [] }, haulTrips: { warehouse: [], market: [], dock: [] },
    lighthouseRemaining: 0, engagement: { lastRealActivityAt: now }, returningWorkers: [], lighthouseVisits: [], lighthouseVisitBonuses: [] };
  normalizeWorldEvents(state, {});
  return state;
}
function advance(state, seconds, context = CONTEXT) {
  state.worldTimeMs += seconds * 1000; state.activeSeconds += seconds;
  state.lighthouseRemaining = Math.max(0, state.lighthouseRemaining - seconds);
  return advanceWorldEvents(state, seconds, context);
}
function reload(state) {
  const restored = structuredClone(state); normalizeWorldEvents(restored, restored); return restored;
}
function dueGood(state, seed, seconds = 1) {
  state.worldEvents.seed = seed; state.worldEvents.nextGoodAt = state.worldEvents.clockMs + seconds * 1000;
}
function dueBad(state, seed, seconds = 1) {
  const events = state.worldEvents, at = events.clockMs + seconds * 1000;
  events.seed = seed; events.monitoringStartedAt = events.clockMs - 30 * DAY * 1000;
  events.lastBlessingAt = events.monitoringStartedAt;
  events.badAnchorAt = at - 6 * DAY * 1000; events.badDelayMs = 6 * DAY * 1000;
  events.nextBadAt = at; events.nextGoodAt = events.clockMs + 60 * HOUR * 1000;
}
const seedCache = new Map();
function seedFor(kind, polarity) {
  if (seedCache.has(kind)) return seedCache.get(kind);
  for (let index = 1; index <= 1000; index++) {
    const seed = Math.imul(index, 0x9e3779b1) >>> 0 || 1;
    const state = island({ chapel: 3 });
    if (polarity === 'positive') dueGood(state, seed); else dueBad(state, seed);
    const entries = advance(state, 1);
    if (entries.some(entry => entry.kind === kind)) { seedCache.set(kind, seed); return seed; }
  }
  throw new Error(`No deterministic seed found for ${kind}`);
}

test('world-event schedules are saved once and panel reads/reload do not reroll them', () => {
  const state = island(), events = state.worldEvents;
  assert.ok(events.nextGoodAt >= NOW + 36 * HOUR * 1000);
  assert.ok(events.nextGoodAt <= NOW + 60 * HOUR * 1000);
  assert.equal(events.nextBadAt, null);
  const before = structuredClone(events);
  for (let index = 0; index < 10; index++) { nextWorldEvent(state); worldEventRows(state); }
  assert.deepEqual(events, before);
  assert.deepEqual(reload(state).worldEvents, before);
});

test('negative forecast starts after Chapel grace plus six to fifteen days and renews only on a real blessing', () => {
  for (const chapel of [3, 4, 10]) {
    const state = island({ chapel });
    assert.equal(chapelGraceSeconds(state), (3 + chapel) * DAY);
    recordChapelBlessing(state);
    const at = state.worldEvents.nextBadAt;
    assert.ok(at >= NOW + (3 + chapel + 6) * DAY * 1000);
    assert.ok(at <= NOW + (3 + chapel + 15) * DAY * 1000);
    advance(state, DAY);
    recordChapelBlessing(state);
    assert.equal(state.worldEvents.lastBlessingAt, NOW + DAY * 1000);
    assert.ok(state.worldEvents.nextBadAt >= NOW + (4 + chapel + 6) * DAY * 1000);
  }
});

test('a Chapel upgrade extends the existing grace without rerolling the selected bad delay', () => {
  const state = island({ chapel: 3 }); recordChapelBlessing(state);
  const before = state.worldEvents.nextBadAt, delay = state.worldEvents.badDelayMs, seed = state.worldEvents.seed;
  state.buildings.chapel.level = 4; advance(state, 0);
  assert.equal(state.worldEvents.nextBadAt, before + DAY * 1000);
  assert.equal(state.worldEvents.badDelayMs, delay);
  assert.equal(state.worldEvents.seed, seed);
});

test('rescued supplies are spendable bonus goods and do not consume ordinary producer capacity', () => {
  const state = island(), seed = seedFor('supplies', 'positive');
  dueGood(state, seed); advance(state, 1);
  const receipt = state.worldEvents.history[0];
  for (const id of MATERIALS) {
    assert.ok(receipt.details.materials[id] >= 50 && receipt.details.materials[id] <= 150);
    assert.equal(ordinaryStock(state, id), 1000);
    assert.equal(bonusStock(state, id), receipt.details.materials[id]);
    assert.equal(centralAvailable(state, id), 1000 + receipt.details.materials[id]);
  }
  const once = structuredClone(state.resources); advance(reload(state), 0); assert.deepEqual(state.resources, once);
});

test('a castaway joins only with a bed and population place; a full House pays only the coin component', () => {
  const seed = seedFor('castaway', 'positive'), free = island(), full = island({ population: 24 });
  dueGood(free, seed); advance(free, 1);
  assert.equal(free.population, 13); assert.equal(free.residents.length, 13);
  assert.equal(free.worldEvents.history[0].details.people, 1);
  const coins = full.resources.coins; dueGood(full, seed); advance(full, 1);
  assert.equal(full.population, 24);
  assert.equal(full.resources.coins - coins, 500 * 3);
  assert.equal(full.worldEvents.history[0].details.substituted, true);
});

test('beetles remove only free wood and keep construction reservations and carried cargo intact', () => {
  const state = island({ chapel: 3 });
  state.resources.wood = 1200; state.bonusMaterials.wood = 200;
  state.constructionProjects = [{ reservedMaterials: { wood: 1100 } }];
  state.haulTrips.warehouse = [{ resource: 'wood', amount: 120, remaining: 100, kind: 'producer', worker: 0 }];
  const trip = structuredClone(state.haulTrips.warehouse[0]);
  dueBad(state, seedFor('beetles', 'negative')); advance(state, 1);
  const loss = state.worldEvents.history[0].details.woodLost;
  assert.ok(loss >= 0 && loss <= 20);
  assert.equal(state.resources.wood, 1200 - loss);
  assert.equal(state.bonusMaterials.wood, 200 - loss);
  assert.equal(state.constructionProjects[0].reservedMaterials.wood, 1100);
  assert.deepEqual(state.haulTrips.warehouse[0], trip);
});

test('plague preserves the population minimum and does not destroy a departing carrier cargo', () => {
  const seed = seedFor('plague', 'negative'), state = island({ chapel: 3 }); state.islandRole = 'daughter';
  state.buildings.warehouse.workers = 12;
  for (const person of state.residents) person.workplace = 'warehouse';
  state.residents[0].happiness = -50;
  state.haulTrips.warehouse = [{ worker: 0, residentId: 1, kind: 'producer', producer: 'lumber', resource: 'wood', amount: 120, remaining: 100 }];
  dueBad(state, seed); advance(state, 1);
  assert.equal(state.population, 10);
  assert.equal(state.haulTrips.warehouse.length, 1);
  assert.equal(state.haulTrips.warehouse[0].amount, 120);
  assert.equal(state.haulTrips.warehouse[0].remaining, 100);
  assert.equal(worldEventHappinessPenalty(state), 10);
  const mother = island({ chapel: 3, population: 12 }); dueBad(mother, seed); advance(mother, 1);
  assert.equal(mother.population, 12, 'the mother is protected against plague below twelve');
  assert.equal(mother.worldEvents.history[0].details.peopleLost, 0);
  const minimum = island({ chapel: 3, population: 6 }); minimum.islandRole = 'daughter'; dueBad(minimum, seed); advance(minimum, 1);
  assert.equal(minimum.population, 6);
  assert.equal(worldEventHappinessPenalty(minimum), 10);
});

test('world-event modifiers last six real hours and expose Polish and English effect descriptions', () => {
  const state = island({ chapel: 3 }); dueBad(state, seedFor('damaged-roads', 'negative')); advance(state, 1);
  const slow = state.worldEvents.history[0].details.transportSlowPercent;
  assert.equal(eventTransportMultiplier(state), 1 - slow / 100);
  assert.equal(worldEventHappinessPenalty(state), 5);
  assert.match(worldEventRows(state, 'pl')[0].description, /Szczęście/);
  assert.match(worldEventRows(state, 'en')[0].description, /Happiness/);
  advance(state, 6 * HOUR);
  assert.equal(eventTransportMultiplier(state), 1); assert.equal(worldEventHappinessPenalty(state), 0);
  const farm = island(); dueGood(farm, seedFor('fertilizer', 'positive')); advance(farm, 1);
  assert.equal(eventProductionMultiplier(farm, 'farm'), 1.25);
  assert.equal(eventProductionMultiplier(farm, 'lumber'), 1);
  advance(farm, 6 * HOUR); assert.equal(eventProductionMultiplier(farm, 'farm'), 1);
});

test('Lighthouse protection holds at most one good wreck and releases it only after the shared expiry', () => {
  const state = island({ chapel: 3 }); recordChapelBlessing(state);
  const actualBlessingAt = state.worldEvents.lastBlessingAt;
  dueGood(state, seedFor('treasure', 'positive'), HOUR);
  state.lighthouseRemaining = 10 * HOUR;
  advance(state, HOUR);
  assert.equal(state.worldEvents.pendingGood, true);
  assert.equal(state.worldEvents.history.length, 0);
  assert.equal(state.worldEvents.nextBadAt, null);
  const restored = reload(state); advance(restored, 9 * HOUR);
  assert.equal(restored.worldEvents.history.length, 1);
  assert.equal(restored.worldEvents.history[0].at, NOW + 10 * HOUR * 1000);
  assert.equal(restored.worldEvents.pendingGood, false);
  assert.ok(restored.worldEvents.nextGoodAt >= NOW + 46 * HOUR * 1000);
  assert.equal(restored.worldEvents.lastBlessingAt, actualBlessingAt);
});

test('expired bad forecasts are cancelled during Lighthouse and rescheduled after it without faking a blessing', () => {
  const state = island({ chapel: 3 }); dueBad(state, seedFor('royal-tax', 'negative'), HOUR);
  const actualBlessingAt = state.worldEvents.lastBlessingAt;
  state.lighthouseRemaining = 2 * DAY; advance(state, DAY);
  assert.equal(state.worldEvents.nextBadAt, null);
  assert.equal(state.worldEvents.history.filter(entry => entry.polarity === 'negative').length, 0);
  advance(state, DAY);
  assert.ok(state.worldEvents.nextBadAt >= state.worldTimeMs + 6 * DAY * 1000);
  assert.ok(state.worldEvents.nextBadAt <= state.worldTimeMs + 15 * DAY * 1000);
  assert.equal(state.worldEvents.lastBlessingAt, actualBlessingAt);
});

test('a long unchanged inactivity spell applies at most one bad event, and real play starts a fresh future window', () => {
  const state = island({ chapel: 3 });
  advance(state, 90 * DAY);
  const bad = state.worldEvents.history.filter(entry => entry.polarity === 'negative');
  // The 32-record history can legitimately have dropped that early event.
  assert.ok(bad.length <= 1);
  assert.notEqual(state.worldEvents.lastBadAt, null);
  const lastBad = state.worldEvents.lastBadAt;
  advance(state, 20 * DAY); assert.equal(state.worldEvents.lastBadAt, lastBad);
  assert.equal(state.worldEvents.nextBadAt, null);
  state.engagement.lastRealActivityAt = state.worldTimeMs;
  advance(state, 0);
  assert.ok(state.worldEvents.nextBadAt >= state.worldTimeMs + 6 * DAY * 1000);
  advance(state, 16 * DAY); assert.ok(state.worldEvents.lastBadAt > lastBad);
});

test('whole, split and reloaded offline time preserve the same outcomes and next forecasts', () => {
  const whole = island({ chapel: 3 }), split = structuredClone(whole);
  advance(whole, 22 * DAY);
  for (let day = 0; day < 22; day++) {
    advance(split, DAY);
    if (day === 10) { const restored = reload(split); Object.assign(split, restored); }
  }
  assert.deepEqual(split.resources, whole.resources);
  assert.deepEqual(split.bonusMaterials, whole.bonusMaterials);
  assert.deepEqual(split.worldEvents, whole.worldEvents);
  assert.deepEqual(split.notifications, whole.notifications);
});

test('coin rewards exceeding the safe wallet balance remain pending and are released without loss', () => {
  const state = island(); state.resources.coins = Number.MAX_SAFE_INTEGER - 10;
  dueGood(state, seedFor('treasure', 'positive')); advance(state, 1);
  const promised = state.worldEvents.history[0].details.coins;
  assert.equal(state.resources.coins, Number.MAX_SAFE_INTEGER);
  assert.equal(BigInt(state.worldEvents.deferredCoins), BigInt(promised - 10));
  const restored = reload(state); consumeMaterial(restored, 'coins', 1000); advance(restored, 0);
  assert.equal(restored.worldEvents.deferredCoins, '0');
  assert.equal(restored.resources.coins, Number.MAX_SAFE_INTEGER - 1000 + promised - 10);
});

test('starting Lighthouse during an existing plague forces happiness without restoring lost people or goods', () => {
  const state = island({ chapel: 3 }); dueBad(state, seedFor('plague', 'negative')); advance(state, 1);
  const populationAfterPlague = state.population, resourcesAfterPlague = structuredClone(state.resources);
  state.lighthouseRemaining = HOUR;
  for (const person of state.residents) assert.equal(residentHappiness(state, person), 100);
  assert.equal(state.population, populationAfterPlague);
  assert.deepEqual(state.resources, resourcesAfterPlague);
  assert.equal(worldEventHappinessPenalty(state), 10, 'the event still exists under the forced happiness');
});

test('the real state coordinator integrates event boundaries and preserves them through save/load', async () => {
  const { createState, tick, normalizeState } = await import('../harborlight-v1-state.js');
  const whole = createState(NOW), split = createState(NOW);
  tick(whole, 60 * HOUR);
  for (let hour = 0; hour < 60; hour++) tick(split, HOUR);
  assert.equal(whole.worldEvents.history.length, 1);
  assert.deepEqual(split.worldEvents.history, whole.worldEvents.history);
  assert.deepEqual(split.resources, whole.resources);
  assert.equal(split.worldEvents.nextGoodAt, whole.worldEvents.nextGoodAt);
  assert.equal(split.worldEvents.seed, whole.worldEvents.seed);
  const restored = normalizeState(JSON.parse(JSON.stringify(whole)), whole.worldTimeMs);
  assert.deepEqual(restored.worldEvents.history, whole.worldEvents.history);
  assert.equal(restored.worldEvents.seed, whole.worldEvents.seed);
  assert.equal(restored.worldEvents.nextGoodAt, whole.worldEvents.nextGoodAt);
});

test('save/load preserves bilingual world-event notifications and their event identity', async () => {
  const { createState, tick, normalizeState } = await import('../harborlight-v1-state.js');
  const state = createState(NOW); state.worldEvents.nextGoodAt = NOW + 1000; tick(state, 1);
  const notice = state.notifications.find(item => item.worldEventId);
  assert.ok(notice?.titlePl); assert.ok(notice?.messagePl);
  const restored = normalizeState(JSON.parse(JSON.stringify(state)), state.worldTimeMs);
  const savedNotice = restored.notifications.find(item => item.id === notice.id);
  assert.equal(savedNotice.worldEventId, notice.worldEventId);
  assert.equal(savedNotice.titlePl, notice.titlePl);
  assert.equal(savedNotice.messagePl, notice.messagePl);
});
