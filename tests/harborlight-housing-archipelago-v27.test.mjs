import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, advanceTo } from '../harborlight-v1-state.js';
import { housingStatus, residentHasHousing } from '../harborlight-v1-housing.js';
import * as Arch from '../harborlight-v1-archipelago.js';

const NOW = Date.parse('2026-11-01T12:00:00Z');
const adapters = { createState, normalizeState, advanceTo };
function islands() {
  const source = createState(NOW);
  source.buildings.townhall.level = 10;
  source.buildings.warehouse.level = 4;
  source.islandName = 'Przystań'; source.population = 54;
  for (const id of ['coins', 'wood', 'stone', 'grain', 'food', 'planks']) source.resources[id] = 100000;
  const account = Arch.restoreArchipelago(normalizeState(source, NOW), adapters, NOW);
  assert.equal(Arch.createNextIsland(account, { name: 'Wschód' }, NOW).ok, true);
  for (const [id, value] of [['island-1', 48], ['island-2', 24]]) {
    const state = Arch.worldFor(account, id);
    state.population = value; state.buildings.house.level = 1;
    if (id === 'island-2') state.buildings.townhall.level = 2;
    state.resources.food = 1000; state.foodCredit = 0;
    state.welcome = { startedAt: 0, until: 0 };
    state.baseHappiness = state.happiness = 0;
    const normalized = normalizeState(state, NOW);
    for (const person of normalized.residents) {
      person.happiness = 0; person.newbornRemaining = 0;
      person.unemployedSeconds = person.hungerSeconds = person.fedRecoverySeconds = 0;
    }
    account.worlds[id] = normalized;
  }
  return account;
}
const restore = account => Arch.restoreArchipelago(Arch.serializeArchipelago(account), adapters, NOW);

test('passenger arrival can exceed beds while Town Hall capacity and existing people remain protected', () => {
  const account = islands(), ids = housingStatus(account.primary).unhousedResidentIds.slice(0, 3);
  const quote = Arch.quotePassengerTransfer(account, { toIslandId: 'island-2', passengerIds: ids }, NOW);
  assert.equal(quote.ok, true);
  assert.equal(quote.mealFood, 3);
  const sent = Arch.sendPassengerTransfer(account, { toIslandId: 'island-2', passengerIds: ids }, NOW);
  assert.equal(sent.ok, true);
  Arch.advanceArchipelago(account, NOW + 1800000);
  assert.equal(account.secondary.population, 27);
  assert.equal(housingStatus(account.secondary).housed, 24);
  assert.equal(housingStatus(account.secondary).unhoused, 3);
  for (const uid of sent.quote.personUids) {
    const person = account.secondary.residents.find(value => value.personUid === uid);
    assert.ok(person);
    assert.equal(residentHasHousing(account.secondary, person), false);
  }
  assert.equal(Arch.unloadIslandTransfer(account, sent.transfer.id, NOW + 1800000).duplicate, true);
  assert.equal(account.secondary.population, 27);
});

test('boarding packs half-hour meals using each passenger housing status without charging coins', () => {
  const account = islands(), housed = housingStatus(account.primary).housedResidentIds[0];
  const unhoused = housingStatus(account.primary).unhousedResidentIds.slice(0, 2);
  const beforeFood = account.primary.resources.food + account.primary.foodCredit;
  const beforeCoins = account.primary.resources.coins;
  const sent = Arch.sendPassengerTransfer(account, { toIslandId: 'island-2', passengerIds: [housed, ...unhoused] }, NOW);
  assert.equal(sent.ok, true);
  assert.equal(sent.quote.mealFood, 2.5);
  assert.equal(sent.transfer.mealPolicy, 'housing-v1');
  assert.equal(sent.transfer.unhousedPassengerIds.length, 2);
  assert.equal(account.primary.resources.food + account.primary.foodCredit, beforeFood - 2.5);
  assert.equal(account.primary.resources.coins, beforeCoins);
});

test('new prepaid meals survive reload and later House expansion without repricing departed passengers', () => {
  const account = islands(), ids = housingStatus(account.primary).unhousedResidentIds.slice(0, 3);
  const sent = Arch.sendPassengerTransfer(account, { toIslandId: 'island-2', passengerIds: ids }, NOW);
  assert.equal(sent.ok, true);
  account.primary.buildings.house.level = 2;
  const paid = account.primary.resources.food + account.primary.foodCredit;
  const restored = restore(account);
  assert.equal(restored.transfers[0].mealFood, 3);
  assert.deepEqual(restored.transfers[0].unhousedPassengerIds, sent.transfer.unhousedPassengerIds);
  assert.equal(restored.primary.resources.food + restored.primary.foodCredit, paid);
  Arch.advanceArchipelago(restored, NOW + 1800000);
  const completed = Arch.serializeArchipelago(restored);
  assert.equal(Arch.restoreArchipelago(completed, adapters, NOW + 1800000).transfers[0].mealFood, 3);
});

test('legacy passenger records retain their already paid half-food meals with no new charge', () => {
  const account = islands(), ids = housingStatus(account.primary).housedResidentIds.slice(0, 3);
  assert.equal(Arch.sendPassengerTransfer(account, { toIslandId: 'island-2', passengerIds: ids }, NOW).ok, true);
  const raw = Arch.serializeArchipelago(account), transfer = raw.archipelago.transfers[0];
  delete transfer.mealPolicy; delete transfer.unhousedPassengerIds;
  assert.equal(transfer.mealFood, 1.5);
  const paid = raw.resources.food + raw.foodCredit;
  const restored = Arch.restoreArchipelago(raw, adapters, NOW);
  assert.equal(restored.transfers[0].mealFood, 1.5);
  assert.equal(restored.primary.resources.food + restored.primary.foodCredit, paid);
});

test('new meal records reject duplicate or unrelated passenger identities and inconsistent payment amounts', () => {
  const account = islands(), ids = housingStatus(account.primary).unhousedResidentIds.slice(0, 3);
  assert.equal(Arch.sendPassengerTransfer(account, { toIslandId: 'island-2', passengerIds: ids }, NOW).ok, true);
  const original = Arch.serializeArchipelago(account);
  for (const corrupt of [
    transfer => { transfer.unhousedPassengerIds.push(transfer.unhousedPassengerIds[0]); },
    transfer => { transfer.unhousedPassengerIds[0] = 'missing-resident'; },
    transfer => { transfer.mealFood = 1.5; },
    transfer => { transfer.mealPolicy = 'unsupported'; }
  ]) {
    const raw = structuredClone(original); corrupt(raw.archipelago.transfers[0]);
    assert.throws(() => Arch.restoreArchipelago(raw, adapters, NOW), error => error.code === 'invalid-cloud-data');
  }
});

test('incoming passengers reserve Town Hall places while natural arrivals remain free to exceed beds', () => {
  const account = islands();
  account.secondary.population = 45;
  account.secondary = normalizeState(account.secondary, NOW);
  account.secondary.lighthouseRemaining = 3600;
  const ids = housingStatus(account.primary).unhousedResidentIds.slice(0, 3);
  assert.equal(Arch.sendPassengerTransfer(account, { toIslandId: 'island-2', passengerIds: ids }, NOW).ok, true);
  Arch.advanceArchipelago(account, NOW + 1799000);
  assert.equal(account.secondary.population, 45, 'Natural arrival used a reserved passenger place');
  Arch.advanceArchipelago(account, NOW + 1800000);
  assert.equal(account.secondary.population, 48);
  assert.equal(housingStatus(account.secondary).unhoused, 24);
  assert.equal(account.secondary.incomingPassengers, 0);
});
