import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, advanceTo, act } from '../harborlight-v1-state.js';
import { grantBonusMaterials, ordinaryStock } from '../harborlight-v1-inventory.js';
import { warehouseLimits } from '../harborlight-v1-logistics.js';
import { tutorialStatus, tutorialPendingRewards } from '../harborlight-v1-progression.js';
import { commerceStatus } from '../harborlight-v1-commerce.js';
import * as Arch from '../harborlight-v1-archipelago.js';

const NOW = Date.parse('2026-10-31T12:00:00Z');
const adapters = { createState, normalizeState, advanceTo };
const bundle = (level = 10) => {
  const state = createState(NOW); state.buildings.townhall.level = level;
  state.buildings.warehouse.level = 4;
  return Arch.restoreArchipelago(state, adapters, NOW);
};
const two = () => {
  const account = bundle();
  assert.equal(Arch.createSecondIsland(account, { name: 'Wyspa Jesienna' }, NOW).ok, true);
  return account;
};
const restore = (account, now = NOW) => Arch.restoreArchipelago(Arch.serializeArchipelago(account), adapters, now);

test('legacy single-world save retains its identity and first history after wrapping', () => {
  const original = createState(NOW); original.islandName = 'Port admin1';
  original.resources.coins = 777; original.statistics.expeditions = 4;
  const account = Arch.restoreArchipelago(original, adapters, NOW);
  const output = Arch.serializeArchipelago(account);
  assert.equal(account.activeIslandId, 'island-1');
  assert.equal(account.secondary, null);
  assert.equal(output.resources.coins, 777);
  assert.equal(output.statistics.expeditions, 4);
  assert.equal(output.islandName, 'Port admin1');
  assert.equal(output.archipelago.shipCapacity, 1000);
  assert.equal(Object.hasOwn(output.archipelago, 'primary'), false);
  assert.equal(restore(account).primary.resources.coins, 777);
});

test('second island unlocks at level10 and inherits only Town Hall and Warehouse levels once', () => {
  const locked = bundle(9), before = JSON.stringify(Arch.serializeArchipelago(locked));
  assert.equal(Arch.createSecondIsland(locked, { name: 'Jeszcze nie' }, NOW).ok, false);
  assert.equal(JSON.stringify(Arch.serializeArchipelago(locked)), before);
  const account = bundle();
  account.primary.buildings.house.level = 8;
  const firstTutorial = structuredClone(account.primary.tutorial);
  const until = account.primary.welcome.until;
  assert.equal(Arch.createSecondIsland(account, { name: '  Druga  Zatoka  ' }, NOW).ok, true);
  assert.equal(account.secondary.islandName, 'Druga Zatoka');
  for (const [id, building] of Object.entries(account.secondary.buildings)) {
    assert.equal(building.level, id === 'townhall' ? 10 : id === 'warehouse' ? 4 : 1, id);
    assert.equal(building.workers, 0, id);
  }
  assert.equal(account.secondary.lighthouseRemaining, 0, 'a starting lighthouse does not grant a construction reward');
  assert.equal(account.secondary.welcome.until, until, 'second island cannot restart the 72-hour account welcome');
  assert.equal(account.secondary.population, 12);
  assert.equal(account.secondary.capacity, 240);
  assert.equal(account.secondary.onboarding.stage, 'complete');
  assert.deepEqual(account.primary.tutorial, firstTutorial);
  assert.equal(tutorialStatus(account.secondary).finished, true);
  assert.equal(tutorialPendingRewards(account.secondary).length, 0);
  assert.equal(Arch.createSecondIsland(account, { name: 'Trzecia' }, NOW).ok, false);
  account.primary.buildings.townhall.level = 11;
  assert.equal(account.secondary.buildings.townhall.level, 10, 'later upgrades remain independent');
});

test('active world switching preserves primary-root serialization and shared account entitlements', () => {
  const account = two();
  account.primary.islandName = 'Pierwsza'; account.primary.resources.coins = 101;
  account.secondary.resources.coins = 202;
  const switched = Arch.switchIsland(account, 'island-2', NOW);
  assert.equal(switched.ok, true); assert.equal(switched.state, account.secondary);
  assert.equal(account.secondary.commerce, account.primary.commerce);
  assert.equal(account.secondary.engagementSchedule, account.primary.engagementSchedule);
  const output = Arch.serializeArchipelago(account);
  assert.equal(output.islandName, 'Pierwsza');
  assert.equal(output.resources.coins, 101);
  assert.equal(output.archipelago.secondIsland.resources.coins, 202);
  assert.equal(Object.hasOwn(output.archipelago.secondIsland, 'commerce'), false);
  const again = Arch.restoreArchipelago(output, adapters, NOW);
  assert.equal(Arch.activeIsland(again).resources.coins, 202);
  assert.equal(again.secondary.commerce, again.primary.commerce);
  assert.equal(Arch.switchIsland(again, 'island-3', NOW).ok, false);
});

test('serializing island2 captures replaced shared objects without replacing island1 history', () => {
  const account = two();
  account.primary.islandName = 'Historyczny Port';
  account.primary.resources.coins = 777;
  account.primary.statistics.expeditions = 7;
  const tutorial = structuredClone(account.primary.tutorial);
  const buildings = structuredClone(account.primary.buildings);
  assert.equal(Arch.switchIsland(account, 'island-2', NOW).ok, true);
  account.secondary.premium = { expiresAt: NOW + 86400000 };
  account.secondary.settings = { ...account.secondary.settings, language: 'pl', motion: false, sound: false };
  const saved = Arch.serializeArchipelago(account);
  assert.equal(saved.premium.expiresAt, NOW + 86400000);
  assert.equal(saved.settings.language, 'pl');
  assert.equal(saved.settings.motion, false);
  assert.equal(saved.settings.sound, false);
  assert.equal(saved.islandName, 'Historyczny Port');
  assert.equal(saved.resources.coins, 777);
  assert.equal(saved.statistics.expeditions, 7);
  assert.deepEqual(saved.tutorial, tutorial);
  assert.deepEqual(saved.buildings, buildings);
  const reopened = Arch.restoreArchipelago(saved, adapters, NOW);
  assert.equal(reopened.primary.premium.expiresAt, NOW + 86400000);
  assert.equal(reopened.secondary.premium, reopened.primary.premium);
  assert.equal(reopened.secondary.settings, reopened.primary.settings);
  assert.equal(reopened.secondary.settings.language, 'pl');
  assert.equal(reopened.primary.resources.coins, 777);
  assert.equal(reopened.primary.statistics.expeditions, 7);
  assert.deepEqual(reopened.primary.tutorial, tutorial);
});

test('one ship escrows goods immediately, arrives after10 minutes, and cannot duplicate an unload', () => {
  const account = two(); account.primary.resources.wood = 1100;
  const sent = Arch.sendIslandTransfer(account, { fromIslandId: 'island-1', toIslandId: 'island-2', cargo: { wood: 1000 } }, NOW);
  assert.equal(sent.ok, true); assert.equal(sent.quote.coins, 0);
  assert.equal(account.primary.resources.wood, 100);
  const oldDestination = account.secondary.resources.wood;
  assert.equal(Arch.sendIslandTransfer(account, { fromIslandId: 'island-2', toIslandId: 'island-1', cargo: { stone: 1 } }, NOW).ok, false);
  Arch.advanceArchipelago(account, NOW + 599000);
  assert.equal(account.secondary.resources.wood, oldDestination);
  const reopened = restore(account, NOW + 599000);
  Arch.advanceArchipelago(reopened, NOW + 600000);
  assert.equal(reopened.secondary.resources.wood, oldDestination + 1000);
  assert.equal(reopened.transfers[0].status, 'complete');
  assert.equal(Arch.unloadIslandTransfer(reopened, sent.transfer.id, NOW + 600000).duplicate, true);
  assert.equal(reopened.secondary.resources.wood, oldDestination + 1000);
  assert.equal(reopened.primary.worldTimeMs, NOW + 600000);
  assert.equal(reopened.secondary.worldTimeMs, NOW + 600000);
});

test('shipment guards reject coins, unsupported quantities, own-world routes and reserved Food', () => {
  const account = two();
  for (const cargo of [{ coins: 1 }, { wood: -1 }, { wood: 0 }, { wood: 0.5 }, { wood: NaN }, { wood: Number.MAX_SAFE_INTEGER, stone: 1 }]) {
    assert.equal(Arch.quoteIslandTransfer(account, { toIslandId: 'island-2', cargo }, NOW).ok, false);
  }
  assert.equal(Arch.quoteIslandTransfer(account, { toIslandId: 'island-1', cargo: { wood: 1 } }, NOW).ok, false);
  assert.equal(Arch.quoteIslandTransfer(account, { toIslandId: 'island-2', cargo: { food: 1 } }, NOW).ok, false);
  account.primary.resources.wood = 2000;
  assert.equal(Arch.quoteIslandTransfer(account, { toIslandId: 'island-2', cargo: { wood: 1001 } }, NOW).ok, false);
  account.primary.constructionProjects.push({ reservedMaterials: { wood: 1999 } });
  assert.equal(Arch.quoteIslandTransfer(account, { toIslandId: 'island-2', cargo: { wood: 2 } }, NOW).ok, false);
});

test('reward provenance crosses islands while ordinary overflow remains visibly on the busy ship', () => {
  const account = two(); account.primary.resources.wood = 400;
  grantBonusMaterials(account.primary, { wood: 100 });
  const limits = warehouseLimits(account.secondary);
  account.secondary.resources.wood = limits.perResource;
  const sent = Arch.sendIslandTransfer(account, { toIslandId: 'island-2', cargo: { wood: 300 } }, NOW);
  assert.equal(sent.ok, true);
  assert.equal(account.primary.bonusMaterials.wood, 0);
  Arch.advanceArchipelago(account, NOW + 600000);
  assert.equal(account.secondary.resources.wood, limits.perResource + 100);
  assert.equal(account.secondary.bonusMaterials.wood, 100);
  assert.equal(ordinaryStock(account.secondary, 'wood'), limits.perResource);
  assert.deepEqual(account.transfers[0].remainingCargo, { wood: 200 });
  assert.equal(account.transfers[0].status, 'waiting');
  assert.equal(account.secondary.pendingDeliveries.wood, 0, 'no hidden bulk-delivery queue');
  const reopened = restore(account, NOW + 700000);
  reopened.secondary.resources.wood -= 200;
  assert.equal(Arch.unloadIslandTransfer(reopened, sent.transfer.id, NOW + 700000).ok, true);
  assert.equal(reopened.transfers[0].status, 'complete');
  assert.equal(reopened.secondary.resources.wood, limits.perResource + 100);
});

test('ordinary cargo used after arrival has the same whole/split offline result', () => {
  const initial = two(); initial.primary.resources.grain = 1000;
  initial.secondary.buildings.windmill.workers = 1;
  initial.secondary = normalizeState(initial.secondary, NOW);
  const sent = Arch.sendIslandTransfer(initial, { toIslandId: 'island-2', cargo: { grain: 500 } }, NOW);
  assert.equal(sent.ok, true);
  const whole = restore(initial), split = restore(initial);
  Arch.advanceArchipelago(whole, NOW + 3600000);
  for (const offset of [300000, 600000, 1800000, 3600000]) Arch.advanceArchipelago(split, NOW + offset);
  assert.deepEqual(whole.primary.resources, split.primary.resources);
  assert.deepEqual(whole.secondary.resources, split.secondary.resources);
  assert.deepEqual(whole.transfers, split.transfers);
});

test('capacity purchases are explicit Paynow DEV simulations, persistent and idempotent', () => {
  const account = two(), context = { environment: 'preprod', devSimulation: true };
  assert.equal(Arch.quoteShipCapacity(account, { units: 2 }).grossGrosz, 998);
  assert.equal(Arch.completeShipCapacityPurchase(account, { units: 2, receiptId: 'capacity-1' }, { environment: 'production', devSimulation: true, verified: true }, NOW).ok, false);
  assert.equal(account.shipCapacity, 1000);
  assert.equal(Arch.completeShipCapacityPurchase(account, { units: 2, receiptId: 'capacity-1' }, context, NOW).ok, true);
  assert.equal(account.shipCapacity, 3000);
  assert.equal(account.primary.commerce.receipts.length, 1);
  assert.equal(account.primary.commerce.receipts[0].grossGrosz, 998);
  assert.equal(Arch.completeShipCapacityPurchase(account, { units: 2, receiptId: 'capacity-1' }, context, NOW).duplicate, true);
  assert.equal(account.primary.commerce.receipts.length, 1);
  assert.equal(Arch.completeShipCapacityPurchase(account, { units: 3, receiptId: 'capacity-1' }, context, NOW).ok, false);
  const reopened = restore(account);
  assert.equal(reopened.shipCapacity, 3000);
  assert.throws(() => Arch.restoreArchipelago(Arch.serializeArchipelago(account), { ...adapters, environment: 'production' }, NOW), error => error.code === 'invalid-cloud-data');
  assert.equal(Arch.completeShipCapacityPurchase(reopened, { units: 2, receiptId: 'capacity-1' }, context, NOW).duplicate, true);
  assert.equal(Arch.quoteShipCapacity(account, { units: 101 }).ok, false);
});

test('corrupt world, cargo or capacity metadata fails closed rather than recreating a world', () => {
  for (const mutate of [
    saved => { saved.archipelago.secondIsland = {}; },
    saved => { saved.archipelago.activeIslandId = 'island-3'; },
    saved => { saved.archipelago.shipCapacity = 2000; },
    saved => { saved.archipelago.transfers = [{ id: 'voyage-1' }]; },
    saved => { saved.archipelago.secondIsland.archipelago = {}; }
  ]) {
    const saved = Arch.serializeArchipelago(two()); mutate(saved);
    assert.throws(() => Arch.restoreArchipelago(saved, adapters, NOW), error => error.code === 'invalid-cloud-data');
  }
});

test('capacity spending counts once toward the shared30-day no-ad threshold without granting coins', () => {
  const account = two(), context = { environment: 'development', devSimulation: true };
  const firstCoins = account.primary.resources.coins, secondCoins = account.secondary.resources.coins;
  assert.equal(Arch.completeShipCapacityPurchase(account, { units: 5, receiptId: 'capacity-noads' }, context, NOW).ok, true);
  assert.equal(account.shipCapacity, 6000);
  assert.equal(commerceStatus(account.primary).paidLast30DaysGrosz, 2495);
  assert.equal(commerceStatus(account.secondary).noAds, true);
  Arch.switchIsland(account, 'island-2', NOW);
  const reopened = restore(account);
  assert.equal(Arch.completeShipCapacityPurchase(reopened, { units: 5, receiptId: 'capacity-noads' }, context, NOW).duplicate, true);
  assert.equal(reopened.primary.commerce.receipts.length, 1);
  assert.equal(reopened.primary.resources.coins, firstCoins);
  assert.equal(reopened.secondary.resources.coins, secondCoins);
  const recreatedWorld = createState(NOW + 1000);
  recreatedWorld.commerce = structuredClone(account.primary.commerce);
  const recreatedAccount = Arch.restoreArchipelago(recreatedWorld, adapters, NOW + 1000);
  assert.equal(recreatedAccount.shipCapacity, 6000, 'permanent capacity survives world recreation through retained account payments');
  assert.equal(recreatedAccount.capacityReceipts.length, 1);
  assert.equal(recreatedAccount.secondary, null, 'paid capacity does not resurrect an expired world');
});

test('only the latest50 completed free voyages are retained, with active cargo and paid receipts intact', () => {
  const account = two(), context = { environment: 'preprod', devSimulation: true };
  assert.equal(Arch.completeShipCapacityPurchase(account, { receiptId: 'capacity-history' }, context, NOW).ok, true);
  assert.equal(Arch.sendIslandTransfer(account, { toIslandId: 'island-2', cargo: { wood: 1 } }, NOW).ok, true);
  Arch.advanceArchipelago(account, NOW + 600000);
  const template = structuredClone(account.transfers[0]);
  account.transfers = Array.from({ length: 55 }, (_, index) => ({ ...structuredClone(template), id: `voyage-${index + 1}` }));
  account.sequence = 55;
  assert.equal(Arch.sendIslandTransfer(account, { toIslandId: 'island-1', fromIslandId: 'island-2', cargo: { stone: 1 } }, NOW + 600000).ok, true);
  const snapshot = Arch.serializeArchipelago(account);
  assert.equal(snapshot.archipelago.transfers.length, 51);
  assert.equal(snapshot.archipelago.transfers[0].id, 'voyage-6');
  assert.equal(snapshot.archipelago.transfers.at(-1).id, 'voyage-56');
  assert.equal(snapshot.archipelago.transfers.at(-1).status, 'sailing');
  const reopened = Arch.restoreArchipelago(snapshot, adapters, NOW + 600000);
  assert.equal(reopened.sequence, 56);
  assert.equal(reopened.capacityReceipts.length, 1);
  assert.equal(reopened.primary.commerce.receipts.length, 1);
  assert.deepEqual(reopened.transfers.at(-1).remainingCargo, { stone: 1 });
});

test('resident compaction preserves all normalized walking, recalled, visiting and zero-snapshot states', () => {
  const account = two(), state = account.primary;
  state.welcome.until = NOW - 1;
  state.buildings.lighthouse.level = 2;
  assert.equal(act(state, { type: 'assign', building: 'farm', delta: 1 }, NOW).ok, true);
  state.residents[1].hungerSeconds = 33;
  state.residents[1].happiness = 0;
  state.residents[2].forcedHappinessSnapshot = 0;
  state.residents[2].happiness = 0;
  state.residents[2].globalLighthouseSnapshot = 0;
  state.residents[2].preVisitHappiness = 0;
  state.residents[2].visitHappinessRemaining = 50;
  state.residents[2].visitCooldownRemaining = 50;
  state.residents[3].returnRemaining = 42;
  state.residents[3].returnFrom = 'warehouse';
  state.residents[4].workplace = 'warehouse';
  state.residents[4].pendingRelease = true;
  state.buildings.warehouse.workers = 1;
  state.haulTrips.warehouse = [{ worker: 0, residentId: state.residents[4].id, remaining: 200,
    resource: 'wood', amount: 60, kind: 'producer', producer: 'lumber' }];
  state.residents[5].visitGroup = 1;
  state.lighthouseVisits = [{ id: 1, residentIds: [state.residents[5].id], remaining: 100 }];
  state.lighthouseRemaining = 100;
  const baseline = normalizeState(state, NOW);
  assert.ok(baseline.residents.some(person => person.arrivalRemaining > 0));
  assert.ok(baseline.residents.some(person => person.pendingRelease === true));
  assert.ok(baseline.residents.some(person => person.visitGroup === 1));
  assert.ok(baseline.residents.some(person => person.hungerSeconds === 33));
  account.primary = baseline;
  const compact = Arch.serializeArchipelago(account);
  const person = compact.residents.find(item => item.id === state.residents[2].id);
  assert.equal(person.happiness, 0);
  assert.equal(person.forcedHappinessSnapshot, 0);
  assert.equal(person.preVisitHappiness, 0);
  const reopened = Arch.restoreArchipelago(compact, adapters, NOW);
  assert.deepEqual(reopened.primary.residents, normalizeState(baseline, NOW).residents);
  assert.deepEqual(reopened.secondary.residents, normalizeState(account.secondary, NOW).residents);
});

test('two full2400-person worlds fit the existing700k cloud payload without tuples or dropped people', () => {
  const account = two();
  for (const state of [account.primary, account.secondary]) {
    state.buildings.townhall.level = 100; state.buildings.house.level = 100;
    state.population = 2400;
  }
  account.primary = normalizeState(account.primary, NOW);
  account.secondary = normalizeState(account.secondary, NOW);
  const serialized = Arch.serializeArchipelago(account);
  const bytes = Buffer.byteLength(JSON.stringify(serialized));
  assert.ok(bytes < 700000, `${bytes} bytes`);
  assert.equal(serialized.residents.length, 2400);
  assert.equal(serialized.archipelago.secondIsland.residents.length, 2400);
  const reopened = Arch.restoreArchipelago(serialized, adapters, NOW);
  assert.deepEqual(reopened.primary.residents, account.primary.residents);
  assert.deepEqual(reopened.secondary.residents, account.secondary.residents);
});
