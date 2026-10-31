import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeResidents, synchronizeResidents, assignResidents, residentSegments, advanceResidents,
  residentHappiness, residentHappinessRate, residentOffset, residentProductionBlocked,
  activeWorkerCount, availableResidentCount, residentHappinessFrozen, adjustResidentHappiness, residentVisitAction, visitOccupancy,
  nextResidentEvent, visitQuota, visitPackageQuote, settleResidentConditions, removeResidentForDeparture, beginLighthouseBonus, settleResidentEvents
} from '../harborlight-v1-residents.js';
const HOUR = 3600;
const ids = ['farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'warehouse', 'dock', 'market', 'house', 'townhall', 'chapel', 'lighthouse'];
function fixture(population = 12) {
  const state = { population, residentSequence: 0, resources: { food: 100000, coins: 1000000, grain: 1000, wood: 1000 }, foodCredit: 0,
    baseHappiness: 0, chapelRemaining: 0, blessingRemaining: 0, lighthouseRemaining: 0,
    returningWorkers: [], buildings: Object.fromEntries(ids.map(id => [id, { level: ['townhall', 'house'].includes(id) ? 6 : 1, workers: 0, ready: 0, workProgress: [] }])) };
  normalizeResidents(state, { version: 8 });
  return state;
}
function advance(state, seconds) {
  let remaining = seconds, iterations = 0;
  while (remaining > 1e-8) {
    assert.ok(iterations++ < 10000, 'resident integrator must progress');
    const segment = residentSegments(state);
    const duration = Math.min(remaining, segment.nextEvent);
    assert.ok(duration > 1e-9, `positive duration, got ${duration}`);
    advanceResidents(segment, duration);
    remaining = Math.max(0, remaining - duration);
  }
}
function hire(state, id, count, arrived = false) {
  assignResidents(state, id, count);
  state.buildings[id].workProgress = Array(state.buildings[id].workers).fill(0);
  if (arrived) { for (const p of state.residents.filter(p => p.workplace === id)) p.arrivalRemaining = 0; settleResidentEvents(state); }
}
function visit(state, residentIds) {
  const result = residentVisitAction(state, { type: 'visitLighthouse', residentIds });
  assert.equal(result.ok, true, result.message); return result;
}
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('walking to a workplace takes five minutes and starts work only on arrival', () => {
  const s = fixture(); const id = s.residents[0].id;
  hire(s, 'lumber', 1);
  const p = s.residents.find(p => p.id === id);
  assert.equal(p.arrivalRemaining, 300);
  assert.equal(activeWorkerCount(s, 'lumber'), 0);
  assert.equal(availableResidentCount(s), 11);
  assert.equal(nextResidentEvent(s), 300);
  assert.equal(residentHappinessRate(s, p), 1);
  advance(s, 299); assert.equal(activeWorkerCount(s, 'lumber'), 0);
  advance(s, 1); assert.equal(activeWorkerCount(s, 'lumber'), 1);
  assert.equal(p.unemployedSeconds, 0); assert.equal(residentHappinessRate(s, p), 2);
});

test('dismissal preserves identity and happiness, resets blockage, and reserves the five-minute return', () => {
  const s = fixture(); hire(s, 'lumber', 1, true);
  const p = s.residents.find(p => p.workplace === 'lumber'); p.happiness = -17; p.blockedSeconds = 2 * 86400;
  assignResidents(s, 'lumber', -1);
  assert.equal(p.workplace, null); assert.equal(p.returnRemaining, 300);
  assert.equal(p.happiness, -17); assert.equal(p.blockedSeconds, 0); assert.equal(availableResidentCount(s), 11);
  advance(s, 300); assert.equal(availableResidentCount(s), 12); assert.ok(s.residents.includes(p));
});

test('blocked producers still count for tax and have no work bonus or duplicate unemployment penalty', () => {
  const s = fixture(); hire(s, 'windmill', 1, true); s.resources.grain = 0;
  const p = s.residents.find(p => p.workplace === 'windmill');
  assert.equal(residentProductionBlocked(s, p), true);
  assert.equal(activeWorkerCount(s, 'windmill'), 1);
  assert.equal(residentHappinessRate(s, p), 1);
  assert.equal(residentOffset(s, p), -10);
  advance(s, 13 * HOUR);
  assert.equal(p.unemployedSeconds, 0); assert.equal(residentHappinessRate(s, p), 1);
  advance(s, 11 * HOUR); assert.equal(residentOffset(s, p), -20);
  advance(s, 72 * HOUR); assert.equal(residentOffset(s, p), -50);
  s.resources.grain = 2; settleResidentEvents(s);
  assert.equal(residentProductionBlocked(s, p), false); assert.equal(p.blockedSeconds, 0);
  assert.equal(residentOffset(s, p), 0); assert.equal(residentHappinessRate(s, p), 2);
});

test('full buffer only penalizes the affected arrived crew; partial storage alone is not a blockage', () => {
  const s = fixture(); hire(s, 'farm', 1, true); hire(s, 'lumber', 1, true);
  const farmer = s.residents.find(p => p.workplace === 'farm'); const logger = s.residents.find(p => p.workplace === 'lumber');
  s.buildings.farm.ready = 200 * s.buildings.farm.level;
  assert.equal(residentOffset(s, farmer), -10); assert.equal(residentOffset(s, logger), 0);
  s.buildings.farm.ready--;
  assert.equal(residentOffset(s, farmer), 0);
});

test('each absence has its own grace clock and hunger immediately halves throughput', async () => {
  const { productionMultiplier } = await import('../harborlight-v1-residents.js');
  const s = fixture(); s.resources.food = 0;
  const p = s.residents[0]; assert.equal(productionMultiplier(s), .5);
  advance(s, 12 * HOUR); assert.equal(residentHappinessRate(s, p), -10);
  s.resources.food = 1; settleResidentConditions(s);
  assert.equal(p.hungerSeconds, 12 * HOUR, 'a brief meal pauses prior hunger rather than erasing it');
  assert.equal(residentHappinessRate(s, p), -4); assert.equal(productionMultiplier(s), 1);
  advance(s, HOUR - 1); assert.equal(p.hungerSeconds, 12 * HOUR);
  advance(s, 1); assert.equal(p.hungerSeconds, 0, 'one uninterrupted fed hour completes recovery');
});

test('a two-person visit is one group, cannot be withdrawn, and starts rewards on return', () => {
  const s = fixture(); s.buildings.lighthouse.level = 2; const people = s.residents.slice(0, 2); visit(s, people.map(p => p.id));
  assert.equal(visitOccupancy(s), 2); assert.equal(availableResidentCount(s), 10);
  assert.equal(residentVisitAction(s, { type: 'cancelLighthouseVisit' }).ok, false);
  advance(s, 4 * HOUR - 1);
  assert.equal(s.lighthouseVisitBonuses.length, 0);
  assert.ok(people.every(p => p.visitHappinessRemaining === 0));
  advance(s, 1);
  assert.equal(visitOccupancy(s), 0); assert.equal(availableResidentCount(s), 12);
  assert.equal(s.lighthouseVisitBonuses.length, 1); assert.equal(s.lighthouseVisitBonuses[0].amount, 10);
  assert.ok(people.every(p => residentHappiness(s, p) === 100 && p.visitCooldownRemaining === 86400));
  assert.equal(residentVisitAction(s, { type: 'visitLighthouse', residentIds: [people[0].id] }).ok, false);
  assert.equal(residentVisitAction(s, { type: 'visitLighthouse', residentIds: [s.residents[3].id] }).ok, true);
});

test('separate groups return on independent clocks and population bonuses overlap at +20 pp', () => {
  const s = fixture(); const [a, b] = s.residents;
  visit(s, [a.id]); advance(s, HOUR); visit(s, [b.id]);
  advance(s, 3 * HOUR); assert.equal(s.lighthouseVisitBonuses.length, 1);
  advance(s, HOUR); assert.equal(s.lighthouseVisitBonuses.length, 2);
  const other = s.residents.find(p => p !== a && p !== b);
  assert.equal(residentOffset(s, other), 20);
  advance(s, 5 * HOUR); assert.equal(residentOffset(s, other), 10);
  advance(s, HOUR); assert.equal(residentOffset(s, other), 0);
});

test('individual cooldown lasts twenty-four hours after return, not after departure', () => {
  const s = fixture(); const id = s.residents[0].id;
  visit(s, [id]); advance(s, 24 * HOUR);
  assert.equal(residentVisitAction(s, { type: 'visitLighthouse', residentIds: [id] }).ok, false);
  advance(s, 4 * HOUR);
  assert.equal(residentVisitAction(s, { type: 'visitLighthouse', residentIds: [id] }).ok, true);
});

test('visitors eat through the common food model and never count as active workers', () => {
  const s = fixture(); visit(s, s.residents.slice(0, 2).map(p => p.id));
  assert.equal(s.residents.filter(p => p.visitGroup).length, 2);
  assert.equal(s.residents.reduce((n, p) => n + !!p.workplace, 0), 0);
  assert.equal(s.residents.length, s.population);
});

test('reload preserves journeys, visitors, independent bonus clocks and person identities', () => {
  const s = fixture(); const home = s.residents[0]; visit(s, [home.id]); hire(s, 'lumber', 1);
  advance(s, 137);
  const saved = JSON.parse(JSON.stringify(s)); const restored = { ...saved, buildings: structuredClone(saved.buildings) };
  normalizeResidents(restored, { ...saved, version: 8 });
  assert.deepEqual(restored.residents.map(p => p.id), s.residents.map(p => p.id));
  assert.equal(restored.lighthouseVisits[0].remaining, 4 * HOUR - 137);
  assert.equal(restored.residents.find(p => p.workplace === 'lumber').arrivalRemaining, 163);
  advance(restored, 163); assert.equal(activeWorkerCount(restored, 'lumber'), 1);
});

test('Lighthouse construction forces 100% even from negative happiness and restores its snapshot', () => {
  const s = fixture(); const p = s.residents[0]; p.happiness = -80;
  beginLighthouseBonus(s, HOUR); assert.equal(residentHappiness(s, p), 100);
  advance(s, HOUR); p.happiness = 30;
  s.lighthouseRemaining = 0; settleResidentEvents(s);
  assert.equal(p.happiness, -80); assert.equal(residentHappiness(s, p), -80);
});

test('departure removes home and travel residents first and never removes visitors', () => {
  const s = fixture(); s.islandRole = 'daughter'; const protectedIds = s.residents.slice(0, 2).map(p => p.id); visit(s, protectedIds);
  hire(s, 'lumber', 1);
  const walking = s.residents.find(p => p.workplace === 'lumber'); walking.happiness = -90;
  assert.equal(removeResidentForDeparture(s), true);
  assert.equal(s.residents.some(p => p.id === walking.id), false);
  assert.ok(protectedIds.every(id => s.residents.some(p => p.id === id)));
  assert.equal(s.population, 11);
});

test('departures honor largest crew and the latest harbor, market, sawmill, quarry tie order', () => {
  const s = fixture(); s.islandRole = 'daughter';
  for (const id of ['dock', 'market', 'quarry', 'sawmill']) hire(s, id, 3, true);
  assert.equal(availableResidentCount(s), 0);
  removeResidentForDeparture(s); assert.equal(s.buildings.dock.workers, 2);
  removeResidentForDeparture(s); assert.equal(s.buildings.market.workers, 2);
  removeResidentForDeparture(s); assert.equal(s.buildings.sawmill.workers, 2);
  assert.equal(s.population, 9);
});

test('daughter departures stop at six and mother departures stop at twelve or protected visitors', () => {
  const s = fixture(); s.buildings.lighthouse.level = 6;
  visit(s, s.residents.map(p => p.id));
  assert.equal(removeResidentForDeparture(s), false); assert.equal(s.population, 12);
  const mother = fixture(); assert.equal(removeResidentForDeparture(mother), false);
  const min = fixture(6); min.islandRole = 'daughter'; assert.equal(removeResidentForDeparture(min), false); assert.equal(min.population, 6);
});

test('free daily entries and simultaneous capacity are independent limits', () => {
  const s = fixture(); const first = s.residents.slice(0, 2).map(p => p.id);
  visit(s, first);
  assert.equal(visitQuota(s).freeRemaining, 0);
  advance(s, 4 * HOUR);
  assert.equal(visitOccupancy(s), 0);
  const newcomer = s.residents.find(p => !first.includes(p.id));
  assert.equal(residentVisitAction(s, { type: 'visitLighthouse', residentIds: [newcomer.id] }).ok, false);
  assert.equal(residentVisitAction(s, { type: 'buyVisitPackage' }).ok, true);
  assert.equal(residentVisitAction(s, { type: 'visitLighthouse', residentIds: [newcomer.id] }).ok, true);
  assert.equal(visitQuota(s).paidRemaining, 1);
});

test('visitor package prices use ordinals two, three and four with at most three rolling purchases', () => {
  const s = fixture(); s.buildings.lighthouse.level = 6;
  assert.deepEqual([visitPackageQuote(s).ordinal, visitPackageQuote(s).cost, visitPackageQuote(s).entries], [2, 3600, 12]);
  const before = s.resources.coins;
  assert.equal(residentVisitAction(s, { type: 'buyVisitPackage' }).ok, true);
  assert.equal(visitPackageQuote(s).cost, 5400);
  assert.equal(residentVisitAction(s, { type: 'buyVisitPackage' }).ok, true);
  assert.equal(visitPackageQuote(s).cost, 7200);
  assert.equal(residentVisitAction(s, { type: 'buyVisitPackage' }).ok, true);
  assert.equal(s.resources.coins, before - 3600 - 5400 - 7200);
  assert.equal(visitQuota(s).paidRemaining, 36);
  assert.equal(residentVisitAction(s, { type: 'buyVisitPackage' }).ok, false);
  advance(s, 24 * HOUR);
  assert.equal(visitPackageQuote(s).cost, 3600);
  assert.equal(visitQuota(s).paidRemaining, 0);
});

test('free allowance renews per entry after twenty-four hours, without erasing personal return cooldown', () => {
  const s = fixture(); const [a, b] = s.residents;
  visit(s, [a.id]); advance(s, HOUR); visit(s, [b.id]);
  advance(s, 23 * HOUR);
  assert.equal(visitQuota(s).freeRemaining, 1);
  assert.equal(a.visitCooldownRemaining, 4 * HOUR);
  assert.equal(residentVisitAction(s, { type: 'visitLighthouse', residentIds: [a.id] }).ok, false);
  advance(s, HOUR); assert.equal(visitQuota(s).freeRemaining, 2);
});

test('quota histories and unused paid entries survive reload', () => {
  const s = fixture(); visit(s, [s.residents[0].id]);
  residentVisitAction(s, { type: 'buyVisitPackage' });
  advance(s, 137);
  const raw = JSON.parse(JSON.stringify(s)); const restored = { ...raw, buildings: structuredClone(raw.buildings) };
  normalizeResidents(restored, { ...raw, version: 8 });
  assert.deepEqual(visitQuota(restored), visitQuota(s));
  assert.equal(restored.visitPackages[0].remaining, 86400 - 137);
});

test('a departing carrier leaves loaded cargo in flight without an assigned worker', () => {
  const s = fixture(); s.islandRole = 'daughter'; hire(s, 'warehouse', 12, true);
  const carrier = s.residents.filter(person => person.workplace === 'warehouse')[11];
  carrier.happiness = -90; // The chosen crew loses its least happy member.
  s.haulTrips = { warehouse: [{ worker: 11, amount: 40, resource: 'wood', remaining: 10 }] };
  assert.equal(removeResidentForDeparture(s), true);
  assert.equal(s.haulTrips.warehouse[0].worker, -1);
  assert.equal(s.haulTrips.warehouse[0].amount, 40);
});

test('saved prayer participants stay protected and unavailable until their already-defined clock ends', () => {
  const s = fixture(); const raw = JSON.parse(JSON.stringify(s));
  raw.residents[0].prayerRemaining = 600;
  const restored = { ...raw, buildings: structuredClone(raw.buildings) };
  normalizeResidents(restored, { ...raw, version: 8 });
  const protectedId = raw.residents[0].id;
  assert.equal(availableResidentCount(restored), 11);
  assert.equal(residentVisitAction(restored, { type: 'visitLighthouse', residentIds: [protectedId] }).ok, false);
  removeResidentForDeparture(restored);
  assert.ok(restored.residents.some(p => p.id === protectedId));
  advance(restored, 600);
  assert.equal(restored.residents.find(p => p.id === protectedId).prayerRemaining, 0);
});

test('initial residents are not frozen, while demographic additions get a full twenty-four hours at zero', () => {
  const s = fixture();
  assert.ok(s.residents.every(p => !residentHappinessFrozen(p)));
  advance(s, HOUR); assert.equal(s.residents[0].happiness, 1);
  s.population++; synchronizeResidents(s);
  const baby = s.residents.at(-1);
  assert.equal(baby.newbornRemaining, 86400); assert.equal(residentHappiness(s, baby), 0);
  assert.equal(residentHappinessRate(s, baby), 0);
  advance(s, 86399); assert.equal(residentHappiness(s, baby), 0); assert.equal(baby.happiness, 0);
  advance(s, 1); assert.equal(baby.newbornRemaining, 0); assert.equal(residentHappiness(s, baby), 0);
  advance(s, HOUR); assert.equal(baby.happiness, 1, 'food growth begins after the freeze; unemployment starts its own fresh grace clock');
  assert.equal(baby.unemployedSeconds, HOUR);
});

test('Lighthouse100 overrides newborn display while settling still ignores grants and freezes need clocks', () => {
  const s = fixture(); s.population++; synchronizeResidents(s); const baby = s.residents.at(-1);
  s.chapelRemaining = 200000; s.blessingRemaining = 200000;
  s.lighthouseVisitBonuses = [{ groupId: 99, amount: 10, remaining: 200000 }];
  beginLighthouseBonus(s, 200000);
  adjustResidentHappiness(s, 40, [baby.id]);
  assert.equal(baby.happiness, 0); assert.equal(residentHappiness(s, baby), 100);
  assert.equal(s.residents[0].happiness, 0, 'individual grant must not affect other people');
  baby.hungerSeconds = 36000; baby.unemployedSeconds = 36000; s.resources.food = 0;
  advance(s, HOUR);
  assert.equal(baby.hungerSeconds, 0); assert.equal(baby.unemployedSeconds, 0);
  assert.equal(baby.happiness, 0); assert.equal(residentHappiness(s, baby), 100);
});

test('an offline-length advance ends the newborn freeze exactly and never backcharges its first day', () => {
  const s = fixture(); s.population++; synchronizeResidents(s); const baby = s.residents.at(-1);
  s.resources.food = 0;
  advance(s, 25 * HOUR);
  assert.equal(baby.newbornRemaining, 0);
  assert.equal(baby.hungerSeconds, HOUR); assert.equal(baby.unemployedSeconds, HOUR);
  assert.equal(baby.happiness, 0, 'after the freeze both absences start a fresh twelve-hour grace period');
});

test('newborn freeze survives reload and expiry resumes active bonuses from a zero base', () => {
  const s = fixture(); s.population++; synchronizeResidents(s); const id = s.residents.at(-1).id;
  s.chapelRemaining = 200000; s.blessingRemaining = 200000;
  advance(s, 23 * HOUR);
  const raw = JSON.parse(JSON.stringify(s)); raw.residents.find(p => p.id === id).happiness = 73;
  const restored = { ...raw, buildings: structuredClone(raw.buildings) };
  normalizeResidents(restored, { ...raw, version: 8 });
  const baby = restored.residents.find(p => p.id === id);
  assert.equal(baby.happiness, 0); assert.equal(baby.newbornRemaining, HOUR); assert.equal(nextResidentEvent(restored), HOUR);
  advance(restored, HOUR);
  assert.equal(baby.happiness, 0); assert.equal(residentHappiness(restored, baby), 30);
  advance(restored, HOUR); assert.equal(baby.happiness, 1, 'expired freeze resumes food growth with a new unemployment grace period');
  assert.equal(baby.unemployedSeconds, HOUR);
});
