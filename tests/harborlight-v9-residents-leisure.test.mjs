import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeResidents, synchronizeResidents, assignResidents, residentSegments,
  advanceResidents, residentHappiness, residentHappinessRate, residentOffset,
  hasFoodForResidents, residentProductionBlocked, activeWorkerCount,
  availableResidentCount, settleResidentConditions, settleResidentEvents,
  beginLighthouseBonus, residentVisitAction, adjustResidentHappiness,
  residentHappinessBounds, removeResidentForDeparture
} from '../harborlight-v1-residents.js';
import { normalizeLeisure, leisureOffers, leisureAction, advanceLeisure } from '../harborlight-v1-leisure.js';
import { activeEffects, normalizeEffectNotifications, syncEffectNotifications } from '../harborlight-v1-effects.js';

const HOUR = 3600;
const NOW = Date.UTC(2026, 0, 15, 12);
const IDS = ['farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'warehouse', 'dock', 'market', 'house', 'townhall', 'chapel', 'lighthouse'];
function island(population = 12, now = NOW) {
  const state = { population, worldTimeMs: now, resources: { food: 100000, coins: 1000000, stone: 100000, grain: 1000, wood: 1000 },
    foodCredit: 0, chapelRemaining: 0, blessingRemaining: 0, lighthouseRemaining: 0,
    returningWorkers: [], notifications: [], notificationSequence: 0,
    haulTrips: { warehouse: [], market: [], dock: [] }, constructionProjects: [],
    buildings: Object.fromEntries(IDS.map(id => [id, { level: ['house', 'townhall'].includes(id) ? 6 : 1, workers: 0, ready: 0, workProgress: [] }])) };
  normalizeLeisure(state, state);
  normalizeResidents(state, { version: 8 });
  return state;
}
function advancePeople(state, seconds) {
  let remaining = seconds, iterations = 0;
  while (remaining > 1e-8) {
    assert.ok(iterations++ < 20000);
    const segment = residentSegments(state);
    const duration = Math.min(remaining, segment.nextEvent, state.lighthouseRemaining > 0 ? state.lighthouseRemaining : Infinity,
      state.chapelRemaining > 0 ? state.chapelRemaining : Infinity, state.blessingRemaining > 0 ? state.blessingRemaining : Infinity);
    assert.ok(duration > 1e-9);
    state.lighthouseRemaining = Math.max(0, state.lighthouseRemaining - duration);
    state.chapelRemaining = Math.max(0, state.chapelRemaining - duration);
    state.blessingRemaining = Math.max(0, state.blessingRemaining - duration);
    advanceResidents(segment, duration);
    state.worldTimeMs += duration * 1000;
    remaining = Math.max(0, remaining - duration);
  }
}
function advanceDaily(state, seconds) {
  advanceLeisure(state, seconds);
  state.worldTimeMs += seconds * 1000;
}
function arrived(state, workplace, count = 1) {
  assignResidents(state, workplace, count);
  for (const person of state.residents.filter(person => person.workplace === workplace)) person.arrivalRemaining = 0;
  settleResidentEvents(state);
  return state.residents.filter(person => person.workplace === workplace);
}
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('feeding pauses a mature hunger penalty immediately but one uninterrupted hour is required to erase its timer', () => {
  const state = island(), person = state.residents[0];
  state.resources.food = 0; person.hungerSeconds = 13 * HOUR;
  assert.equal(residentHappinessRate(state, person), -5);
  state.resources.food = 100;
  settleResidentConditions(state);
  assert.equal(residentHappinessRate(state, person), 1);
  assert.equal(person.hungerSeconds, 13 * HOUR);
  advancePeople(state, 1800);
  assert.equal(person.hungerSeconds, 13 * HOUR);
  assert.equal(person.fedRecoverySeconds, 1800);
  state.resources.food = 0;
  advancePeople(state, 60);
  assert.equal(person.hungerSeconds, 13 * HOUR + 60);
  assert.equal(person.fedRecoverySeconds, 0);
  assert.equal(residentHappinessRate(state, person), -5);
  state.resources.food = 100;
  advancePeople(state, 3599);
  assert.equal(person.hungerSeconds, 13 * HOUR + 60);
  advancePeople(state, 1);
  assert.equal(person.hungerSeconds, 0);
});

test('a short shared meal cannot repeatedly renew the twelve-hour hunger grace', () => {
  const state = island();
  for (const person of state.residents) person.hungerSeconds = 13 * HOUR;
  for (let cycle = 0; cycle < 3; cycle++) {
    state.resources.food = 1;
    advancePeople(state, 300);
    state.resources.food = 0;
    settleResidentConditions(state);
    assert.ok(state.residents.every(person => person.hungerSeconds >= 13 * HOUR));
    assert.ok(state.residents.every(person => residentHappinessRate(state, person) === -5));
    advancePeople(state, 300);
  }
  assert.ok(state.residents.every(person => person.hungerSeconds === 13 * HOUR + 900));
});

test('half-completed hunger recovery survives loading and completes only its remaining feeding time', () => {
  const state = island(), person = state.residents[0]; person.hungerSeconds = 13 * HOUR;
  advancePeople(state, 1800);
  const raw = structuredClone(state); raw.version = 8;
  normalizeResidents(state, raw);
  const restored = state.residents.find(item => item.id === person.id);
  assert.equal(restored.hungerSeconds, 13 * HOUR);
  assert.equal(restored.fedRecoverySeconds, 1800);
  advancePeople(state, 1799);
  assert.equal(restored.hungerSeconds, 13 * HOUR);
  advancePeople(state, 1);
  assert.equal(restored.hungerSeconds, 0);
});

test('new resident hunger and unemployment clocks begin only after the complete twenty-four-hour zero freeze', () => {
  const state = island(); state.population++; synchronizeResidents(state);
  const person = state.residents.at(-1);
  state.resources.food = 0;
  advancePeople(state, 24 * HOUR);
  assert.equal(person.newbornRemaining, 0);
  assert.equal(person.hungerSeconds, 0);
  assert.equal(person.unemployedSeconds, 0);
  assert.equal(person.happiness, 0);
  advancePeople(state, 12 * HOUR);
  assert.equal(person.happiness, 0);
  advancePeople(state, HOUR);
  assert.equal(person.happiness, -10);
});

test('loading a still-frozen legacy resident does not import an already mature first-day penalty', () => {
  const state = island();
  const saved = structuredClone(state); saved.version = 8;
  Object.assign(saved.residents[0], { newbornRemaining: 3600, hungerSeconds: 90000, unemployedSeconds: 90000, fedRecoverySeconds: 3000 });
  normalizeResidents(state, saved);
  const person = state.residents[0];
  assert.equal(person.hungerSeconds, 0);
  assert.equal(person.unemployedSeconds, 0);
  assert.equal(person.fedRecoverySeconds, 0);
});

test('assigning and cancelling before arrival preserves unemployment; an actual arrival clears it', () => {
  const state = island(), person = state.residents[0];
  for (const resident of state.residents) resident.unemployedSeconds = 13 * HOUR;
  assignResidents(state, 'quarry', 1);
  assert.equal(person.unemployedSeconds, 13 * HOUR);
  assignResidents(state, 'quarry', -1);
  assert.equal(person.unemployedSeconds, 13 * HOUR);
  assert.equal(person.returnFrom, 'quarry');
  assert.equal(residentHappinessRate(state, person), -4);
  advancePeople(state, 300);
  assert.equal(person.returnFrom, null);
  assignResidents(state, 'quarry', 1);
  const actualArrival = state.residents.find(resident => resident.workplace === 'quarry');
  advancePeople(state, 299);
  assert.ok(actualArrival.unemployedSeconds > 13 * HOUR);
  advancePeople(state, 1);
  assert.equal(actualArrival.unemployedSeconds, 0);
});

test('a recalled loaded carrier finishes as an employee, then gets the entire five-minute walk home', () => {
  const state = island(), [person] = arrived(state, 'warehouse');
  state.haulTrips.warehouse = [{ worker: 0, residentId: person.id, remaining: 200, resource: 'wood', amount: 60, kind: 'producer', producer: 'lumber' }];
  assignResidents(state, 'warehouse', -1);
  assert.equal(person.pendingRelease, true);
  assert.equal(person.workplace, 'warehouse');
  assert.equal(person.returnRemaining, 0);
  assert.equal(activeWorkerCount(state, 'warehouse'), 1);
  assert.equal(state.buildings.warehouse.workers, 1);
  const finalSegment = residentSegments(state);
  state.haulTrips.warehouse = [];
  advanceResidents(finalSegment, 200);
  assert.equal(person.workplace, null);
  assert.equal(person.pendingRelease, false);
  assert.equal(person.returnFrom, 'warehouse');
  assert.equal(person.returnRemaining, 300);
  assert.equal(state.buildings.warehouse.workers, 0);
  assert.equal(activeWorkerCount(state, 'warehouse'), 0);
  advancePeople(state, 299);
  assert.equal(availableResidentCount(state), 11);
  advancePeople(state, 1);
  assert.equal(availableResidentCount(state), 12);
  assert.equal(person.returnFrom, null);
});

test('a pending recall and its return origin survive loading without moving its cargo to another person', () => {
  const state = island(), [person] = arrived(state, 'market');
  state.haulTrips.market = [{ worker: 0, residentId: person.id, remaining: 100, resource: 'wood', amount: 40, kind: 'marketInbound' }];
  assignResidents(state, 'market', -1);
  const raw = structuredClone(state); raw.version = 8;
  normalizeResidents(state, raw);
  assert.equal(state.residents.find(item => item.id === person.id).pendingRelease, true);
  assert.equal(state.buildings.market.workers, 1);
  assert.equal(state.haulTrips.market[0].residentId, person.id);
});

test('overlapping global and personal 100 percent effects restore their common original balance only after both end', () => {
  const state = island(), person = state.residents[0]; person.happiness = 20;
  beginLighthouseBonus(state, 24 * HOUR);
  assert.equal(residentVisitAction(state, { type: 'visitLighthouse', residentIds: [person.id] }).ok, true);
  advancePeople(state, 4 * HOUR);
  assert.equal(person.forcedHappinessSnapshot, 20);
  advancePeople(state, 20 * HOUR);
  assert.equal(state.lighthouseRemaining, 0);
  assert.equal(residentHappiness(state, person), 100);
  assert.equal(person.forcedHappinessSnapshot, 20);
  advancePeople(state, 4 * HOUR);
  assert.equal(person.forcedHappinessSnapshot, null);
  assert.equal(person.happiness, 20);
});

test('a global effect added during a personal effect keeps the earlier common snapshot', () => {
  const state = island(), person = state.residents[0]; person.happiness = 20;
  residentVisitAction(state, { type: 'visitLighthouse', residentIds: [person.id] });
  advancePeople(state, 4 * HOUR);
  close(person.forcedHappinessSnapshot, 24);
  advancePeople(state, 2 * HOUR);
  beginLighthouseBonus(state, 24 * HOUR);
  close(person.forcedHappinessSnapshot, 24);
  advancePeople(state, 24 * HOUR);
  close(person.happiness, 24);
  assert.equal(person.forcedHappinessSnapshot, null);
});

test('overlap snapshots survive loading and a personal return at the exact global expiry remains continuous', () => {
  const state = island(), person = state.residents[0]; person.happiness = 20;
  beginLighthouseBonus(state, 4 * HOUR);
  residentVisitAction(state, { type: 'visitLighthouse', residentIds: [person.id] });
  advancePeople(state, 4 * HOUR);
  assert.equal(state.lighthouseRemaining, 0);
  assert.equal(person.forcedHappinessSnapshot, 20);
  const raw = structuredClone(state); raw.version = 8;
  normalizeResidents(state, raw);
  const restored = state.residents.find(item => item.id === person.id);
  assert.equal(restored.forcedHappinessSnapshot, 20);
  advancePeople(state, 24 * HOUR);
  assert.equal(restored.happiness, 20);
  assert.equal(restored.forcedHappinessSnapshot, null);
});

test('renewing a Lighthouse upgrade replaces its duration and preserves the original snapshot', () => {
  const state = island(), person = state.residents[0]; person.happiness = 20;
  beginLighthouseBonus(state, 10 * HOUR);
  advancePeople(state, 2 * HOUR);
  beginLighthouseBonus(state, 24 * HOUR);
  assert.equal(state.lighthouseRemaining, 24 * HOUR);
  assert.equal(person.forcedHappinessSnapshot, 20);
});

test('a House point raises final happiness even when a negative cause is applied to a balance of 100', () => {
  const state = island(), [person] = arrived(state, 'quarry');
  person.happiness = 100; person.blockedSeconds = 86400; state.buildings.quarry.ready = 200;
  assert.equal(residentHappiness(state, person), 80);
  assert.equal(residentHappinessBounds(state, person).max, 120);
  adjustResidentHappiness(state, 1, [person.id]);
  assert.equal(person.happiness, 101);
  assert.equal(residentHappiness(state, person), 81);
  assert.equal(residentOffset(state, person), -20);
  assert.equal(person.blockedSeconds, 86400);
  const raw = structuredClone(state); raw.version = 8;
  normalizeResidents(state, raw);
  assert.equal(residentHappiness(state, state.residents.find(item => item.id === person.id)), 81);
});

test('within the approved home-first departure group the least happy resident leaves', () => {
  const state = island(8); arrived(state, 'farm', 6);
  const home = state.residents.filter(person => !person.workplace);
  home[0].happiness = -80; home[1].happiness = 80;
  const leaving = home[0].id;
  assert.equal(removeResidentForDeparture(state), true);
  assert.equal(state.population, 7);
  assert.ok(!state.residents.some(person => person.id === leaving));
});

test('departure ties are randomized reproducibly and visiting residents remain protected', () => {
  const state = island(8); state.residentRandomSeed = 0xfa65bf23;
  const raw = structuredClone(state); raw.version = 8;
  const copy = structuredClone(state); normalizeResidents(copy, raw);
  removeResidentForDeparture(state); removeResidentForDeparture(copy);
  assert.deepEqual(state.residents.map(person => person.id), copy.residents.map(person => person.id));
  assert.notEqual(state.residentRandomSeed, 0xfa65bf23);
  const visitor = state.residents[0]; visitor.happiness = -100;
  state.lighthouseVisits = [{ id: 1, residentIds: [visitor.id], remaining: HOUR }]; visitor.visitGroup = 1;
  removeResidentForDeparture(state);
  assert.ok(state.residents.some(person => person.id === visitor.id));
});

test('attraction price matches actual recipients and people already at 100 or frozen receive no purchase', () => {
  const state = island();
  state.leisure.offers[0].sharePercent = 50;
  for (const person of state.residents) person.happiness = 100;
  state.residents[0].happiness = -20; state.residents[1].happiness = -10;
  state.residents[2].happiness = 0; state.residents[2].newbornRemaining = 3600;
  const quote = leisureOffers(state)[0];
  assert.equal(quote.residentCount, 2);
  assert.equal(quote.price, quote.y * 2);
  const before = state.resources.coins;
  const result = leisureAction(state, { type: 'buyAttraction', id: quote.id });
  assert.equal(result.ok, true);
  assert.deepEqual(result.residentIds, [state.residents[0].id, state.residents[1].id]);
  assert.equal(state.resources.coins, before - quote.y * 2);
  for (const person of state.residents) person.happiness = 100;
  const previous = structuredClone(state);
  assert.equal(leisureAction(state, { type: 'buyAttraction', id: leisureOffers(state)[1].id }).ok, false);
  assert.deepEqual(state, previous);
});

test('attraction tie choices are saved randomness rather than fixed resident ID ordering', () => {
  const state = island(); state.buildings.townhall.level = 1; state.leisure.seed = 0xd45ab32f;
  const copy = structuredClone(state), before = state.leisure.seed;
  const action = { type: 'buyAttraction', id: state.leisure.offers[0].id };
  assert.deepEqual(leisureAction(state, action).residentIds, leisureAction(copy, action).residentIds);
  assert.notEqual(state.leisure.seed, before);
});

test('new and migrated daily offers retain their five identities until Warsaw midnight', () => {
  const state = island(12, Date.parse('2026-01-15T21:00:00Z'));
  assert.equal(state.leisure.rotationRemaining, 2 * HOUR);
  const original = structuredClone(state.leisure.offers);
  const saved = structuredClone(state);
  delete saved.leisure.clockMs; delete saved.leisure.nextRotationAt; saved.leisure.rotationRemaining = 21 * HOUR;
  normalizeLeisure(state, saved);
  assert.deepEqual(state.leisure.offers, original);
  assert.equal(state.leisure.rotationRemaining, 2 * HOUR);
  advanceDaily(state, 2 * HOUR - 1);
  assert.deepEqual(state.leisure.offers, original);
  advanceDaily(state, 1);
  assert.ok(state.leisure.offers.every(offer => !original.some(previous => previous.id === offer.id)));
});

test('Warsaw midnight rotations use twenty-three-hour and twenty-five-hour DST days', () => {
  for (const [start, hours] of [['2026-03-28T23:00:00Z', 23], ['2026-10-24T22:00:00Z', 25]]) {
    const state = island(12, Date.parse(start));
    assert.equal(state.leisure.rotationRemaining, hours * HOUR);
    const original = structuredClone(state.leisure.offers);
    advanceDaily(state, hours * HOUR - 1);
    assert.deepEqual(state.leisure.offers, original);
    advanceDaily(state, 1);
    assert.notDeepEqual(state.leisure.offers, original);
    assert.equal(state.leisure.rotationRemaining, 24 * HOUR);
  }
});

test('multi-day calendar rotation is identical for whole, split and saved/reloaded offline time', () => {
  const whole = island(12, Date.parse('2026-03-28T20:00:00Z'));
  const split = structuredClone(whole), total = 4 * 86400 + 1234;
  advanceDaily(whole, total);
  advanceDaily(split, 1234); advanceDaily(split, 86400);
  const raw = structuredClone(split); normalizeLeisure(split, raw);
  advanceDaily(split, 3 * 86400);
  assert.deepEqual(split.leisure, whole.leisure);
});

test('pledged physical Food and recipe inputs are unavailable to meals or a producer', () => {
  const state = island(); state.resources.food = 50; state.resources.grain = 2;
  state.constructionProjects = [{ reservedMaterials: { food: 50, grain: 2 } }];
  assert.equal(hasFoodForResidents(state), false);
  const [person] = arrived(state, 'windmill');
  assert.equal(residentProductionBlocked(state, person), true);
  state.foodCredit = 0.1;
  assert.equal(hasFoodForResidents(state), true);
});

test('active-play effects show production benefit without changing personal happiness or spamming countdown notices', () => {
  const state = island(), person = state.residents[0];
  normalizeEffectNotifications(state);
  state.engagement = { activeUntil: state.worldTimeMs + 300000 };
  const before = residentHappiness(state, person);
  syncEffectNotifications(state);
  const row = activeEffects(state).find(effect => effect.id === 'active-play');
  assert.equal(row.remaining, 300);
  assert.equal(row.effect, 'Production, taxes and transport speed ×2');
  assert.equal(residentHappiness(state, person), before);
  const count = state.notifications.length;
  for (let second = 0; second < 100; second++) { state.worldTimeMs += 1000; syncEffectNotifications(state); }
  assert.equal(state.notifications.length, count);
  state.worldTimeMs += 200000; syncEffectNotifications(state);
  assert.ok(state.notifications.some(item => item.kind === 'effect-ended' && item.effectId === 'active-play'));
});
