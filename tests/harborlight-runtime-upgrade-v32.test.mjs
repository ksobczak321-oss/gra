import test from 'node:test';
import assert from 'node:assert/strict';
import * as State from '../harborlight-v1-state.js';
import * as Arch from '../harborlight-v1-archipelago.js';
import * as P from '../harborlight-v1-provisions.js';
import { packAdventureSave, unpackAdventureSave } from '../harborlight-v1-save-packing.js';
import { prepareRuntimeUpgrade, normalizeRuntimeWorld } from '../harborlight-v1-runtime-upgrade.js';
import { claimAdventureBudget } from '../harborlight-v1-adventure-budget.js';
const NOW = Date.parse('2026-11-15T12:00:00Z'), copy = value => structuredClone(value);
const upgrade = (raw, now = NOW) => normalizeRuntimeWorld(raw, now, { upgradeRules: true, normalizeState: State.normalizeState });
const adapters = { createState: (now, options) => State.createState(now, { ...options, ruleset: 32 }), normalizeState: upgrade, advanceTo: State.advanceTo };
function legacy({ level = 2, population = 31, crews = { farm: 2, quarry: 1, warehouse: 3 } } = {}) {
  let s = State.createState(NOW - 86400000, { onboarding: false });
  s.buildings.townhall.level = level; s.buildings.house.level = level; s.population = population;
  s = State.normalizeState(s, NOW - 86400000);
  for (const [id, b] of Object.entries(s.buildings)) { b.workers = crews[id] || 0; b.workProgress = Array(b.workers).fill(45); }
  let cursor = 0;
  for (const [building, count] of Object.entries(crews)) for (let i = 0; i < count; i++) s.residents[cursor++].workplace = building;
  for (const person of s.residents) { person.personUid = `original-person-${person.id}`; person.name = `Imię ${person.id}`; person.nickname = `Załoga ${person.id}`; person.hungerSeconds = 1234; person.fedRecoverySeconds = 17; person.arrivalRemaining = 0; person.newbornRemaining = 0; }
  Object.assign(s.resources, { coins: 6358, wood: 723, stone: 923, grain: 453, food: 211, planks: 317 });
  s.statistics = { collected: 17, upgrades: 4, crafted: 9, expeditions: 3, traded: 2, taxCollected: 45 };
  s.foodCredit = .375; s.buildings.farm.ready = 13; s.buildings.windmill.ready = 17; s.buildings.quarry.ready = 19;
  s.haulTrips.warehouse = [{ worker: 0, remaining: 43, resource: 'food', amount: 7, kind: 'producer', producer: 'windmill', residentId: s.residents.find(p => p.workplace === 'warehouse')?.id || 1 }];
  return s;
}
const peopleFacts = s => s.residents.map(p => [p.id, p.personUid, p.name, p.nickname, p.workplace || null]);
function materialTotal(s, resource) {
  let total = (s.resources[resource] || 0) + (s.pendingDeliveries?.[resource] || 0);
  if (resource === 'food' && s.ruleset !== 32) total += s.foodCredit || 0;
  if (s.ruleset === 32) total += Object.values(s.provisions?.localStock || {}).reduce((sum, local) => sum + (local[resource] || 0), 0);
  else for (const [building, output] of Object.entries({ farm: 'grain', quarry: 'stone', lumber: 'wood', sawmill: 'planks', windmill: 'food' })) if (output === resource) total += s.buildings[building]?.ready || 0;
  return total;
}
test('official-cloud legacy upgrade preserves original residents, jobs, goods, funded clocks and hunger without modifying input', () => {
  const raw = legacy(), before = copy(raw), state = upgrade(raw);
  assert.deepEqual(raw, before); assert.equal(state.ruleset, 32); assert.equal(state.population, 31); assert.equal(state.capacity, 72);
  assert.deepEqual(peopleFacts(state), peopleFacts(raw));
  for (const resource of ['wood', 'stone', 'grain', 'food', 'planks']) assert.equal(materialTotal(state, resource), materialTotal(raw, resource), resource);
  for (const id of P.MATERIAL_IDS.filter(id => !Object.hasOwn(raw.resources, id))) assert.equal(state.resources[id], 0, id);
  assert.equal(state.foodCredit, 0); assert.equal(state.provisions.localStock.windmill.flour, 0); assert.equal(state.provisions.localStock.windmill.food, 0);
  assert.equal(state.provisions.localStock.farm.grain, 13); assert.deepEqual(state.haulTrips, raw.haulTrips);
  assert.deepEqual(state.statistics, raw.statistics); assert.deepEqual(state.welcome, raw.welcome); assert.deepEqual(state.onboarding, raw.onboarding);
  assert.equal(state.islandStartedAt, raw.islandStartedAt); assert.equal(state.worldTimeMs, raw.worldTimeMs); assert.equal(state.lastSimulatedAt, raw.lastSimulatedAt);
  const person = state.provisions.people[state.residents[0].personUid]; assert.equal(person.hungerSeconds, 1234); assert.equal(person.fullFedSeconds, 17);
  assert.equal(state.provisions.productionProgress.farmGrain[state.residents[0].personUid], .5);
  assert.equal(state.provisions.assignments.farm.farmGrain, 2); assert.equal(P.productionAssignments(state, 'farm')[1].workers, 0);
  for (const id of ['bakery', 'dairy', 'slaughterhouse', 'fisher', 'leatherworks']) assert.equal(state.buildings[id].level, 1);
  assert.equal(state.buildings.academy.level, 0); assert.equal(state.buildings.barracks.level, 0);
});
test('legacy twenty-four-person product crews retain exact jobs and progress, with downward-only hiring/product allowances', () => {
  const raw = legacy({ population: 48, crews: { windmill: 24, farm: 24 } }), state = upgrade(raw);
  assert.equal(state.buildings.windmill.workers, 24); assert.equal(state.buildings.farm.workers, 24);
  assert.deepEqual(peopleFacts(state), peopleFacts(raw)); assert.equal(State.workerLimit(state, 'windmill'), 24); assert.equal(State.workerLimit(state, 'farm'), 24);
  assert.equal(P.productionAssignments(state, 'windmill')[0].workers, 24); assert.equal(P.productionAssignments(state, 'farm')[0].workers, 24);
  assert.equal(P.crewCapacity(state, 'farm').perRecipe.farmVegetables, 12);
  assert.equal(P.provisionsAction(state, { type: 'provisionsSetWorkers', building: 'farm', recipeId: 'farmGrain', workers: 25 }).ok, false);
  assert.equal(P.provisionsAction(state, { type: 'provisionsSetWorkers', building: 'farm', recipeId: 'farmGrain', workers: 20 }).ok, true);
  assert.equal(P.provisionsAction(state, { type: 'provisionsSetWorkers', building: 'farm', recipeId: 'farmGrain', workers: 21 }).ok, false);
  state.buildings.windmill.workers = 23; assert.equal(State.workerLimit(state, 'windmill'), 23);
  state.buildings.windmill.workers = 12; assert.equal(State.workerLimit(state, 'windmill'), 12);
  state.buildings.windmill.workers = 13; assert.equal(State.workerLimit(state, 'windmill'), 12, 'decreased allowance cannot be rehired');
  const again = upgrade(copy(state)); assert.equal(State.workerLimit(again, 'windmill'), 12); assert.equal(again.buildings.windmill.workers, 12);
  const commanded = upgrade(raw);
  assert.equal(State.act(commanded, { type: 'assign', building: 'windmill', delta: -1 }, commanded.worldTimeMs).ok, true);
  assert.equal(commanded.buildings.windmill.workers, 23);
  assert.equal(State.act(commanded, { type: 'assign', building: 'windmill', delta: 1 }, commanded.worldTimeMs).ok, false);
  assert.equal(commanded.buildings.windmill.workers, 23);
});
test('pre-grain farm stock and resident-less historical production migrate once without converting food into grain', () => {
  const raw = legacy({ population: 31, crews: { farm: 2 } }); raw.version = 4; delete raw.residents; delete raw.residentSequence;
  raw.buildings.farm.ready = 13; raw.buildings.windmill.ready = 0; raw.foodCredit = 0; raw.resources.food = 0;
  const state = upgrade(raw);
  assert.equal(state.population, 31); assert.equal(state.resources.food + state.pendingDeliveries.food, 13); assert.equal(state.provisions.localStock.farm.grain, 0);
  const workers = state.residents.filter(p => p.workplace === 'farm'); assert.equal(workers.length, 2);
  for (const person of workers) assert.equal(state.provisions.productionProgress.farmGrain[person.personUid], .5);
  const again = upgrade(copy(state)); assert.equal(again.resources.food + again.pendingDeliveries.food, 13); assert.equal(again.provisions.localStock.farm.grain, 0);
});
test('paid legacy construction reservations and in-flight goods are not repriced or charged again', () => {
  const raw = legacy();
  raw.constructionSequence = 7;
  raw.constructionProjects = [{ building: 'house', targetLevel: 3, order: 7, stage: 'transport', cost: { coins: 500, wood: 111, stone: 112, grain: 113, food: 20, planks: 21 }, remainingMaterials: { wood: 11, stone: 12, grain: 13, food: 2, planks: 3 }, delivered: { wood: 100, stone: 100, grain: 100, food: 18, planks: 18 }, reservedMaterials: { wood: 11, stone: 12, grain: 13, food: 2, planks: 3 }, reservedCoins: 500, reservationVersion: 9, buildRemaining: 123, buildSeconds: 300, transportSeconds: 60 }];
  const state = upgrade(raw), project = state.constructionProjects[0];
  assert.equal(state.resources.coins, raw.resources.coins); assert.equal(project.order, 7); assert.equal(project.reservationVersion, 9); assert.equal(project.reservedCoins, 500); assert.equal(project.buildRemaining, 123); assert.equal(project.transportSeconds, 60);
  for (const field of ['cost', 'remainingMaterials', 'delivered', 'reservedMaterials']) for (const [id, n] of Object.entries(raw.constructionProjects[0][field])) assert.equal(project[field][id], n, `${field}.${id}`);
  const again = upgrade(copy(state)); assert.deepEqual(again.constructionProjects, state.constructionProjects); assert.deepEqual(again.haulTrips, state.haulTrips); assert.equal(again.resources.coins, raw.resources.coins);
});
test('normal API serialization and repeated cloud restore are idempotent, including single founding gifts', () => {
  const raw = legacy({ level: 5 }), originalPeople = peopleFacts(raw); let bundle = Arch.restoreArchipelago(raw, adapters, NOW);
  assert.equal(bundle.primary.population, raw.population + 8); assert.deepEqual(peopleFacts(bundle.primary).slice(0, raw.population), originalPeople);
  const uids = bundle.primary.residents.map(p => p.personUid), coins = bundle.primary.resources.coins, progress = copy(bundle.primary.provisions.productionProgress), totals = Object.fromEntries(['food', 'grain', 'stone', 'wood', 'planks'].map(id => [id, materialTotal(bundle.primary, id)]));
  for (let i = 0; i < 3; i++) {
    bundle = Arch.restoreArchipelago(copy(Arch.serializeArchipelago(bundle)), adapters, NOW);
    assert.equal(bundle.primary.population, raw.population + 8); assert.deepEqual(bundle.primary.residents.map(p => p.personUid), uids); assert.equal(bundle.primary.resources.coins, coins);
    assert.deepEqual(peopleFacts(bundle.primary).slice(0, raw.population), originalPeople);
    assert.deepEqual(bundle.primary.provisions.productionProgress, progress);
    for (const [id, total] of Object.entries(totals)) assert.equal(materialTotal(bundle.primary, id), total);
  }
});
test('legacy daughter islands upgrade with independent progress and exactly one shared wallet, without extra founding gifts', () => {
  const primary = legacy({ level: 10 }), daughter = legacy({ level: 5, population: 6, crews: { farm: 2 } });
  daughter.islandId = 'island-2'; daughter.islandRole = 'daughter'; daughter.resources.coins = 321; daughter.residents.forEach(p => { p.personUid = `daughter-person-${p.id}`; });
  primary.archipelago = { version: 2, activeIslandId: 'island-2', sequence: 0, shipCapacity: 1000, capacityReceipts: [], transfers: [], islands: { 'island-2': daughter } };
  let bundle = Arch.restoreArchipelago(primary, adapters, NOW); const coins = primary.resources.coins + daughter.resources.coins;
  assert.equal(bundle.secondary.ruleset, 32); assert.equal(bundle.secondary.population, 6); assert.equal(bundle.secondary.resources.coins, coins); assert.deepEqual(peopleFacts(bundle.secondary), peopleFacts(daughter));
  const startedAt = bundle.secondary.islandStartedAt;
  for (let i = 0; i < 3; i++) { const saved = Arch.serializeArchipelago(bundle); assert.equal(saved.archipelago.islands['island-2'].resources.coins, 0); bundle = Arch.restoreArchipelago(copy(saved), adapters, NOW); assert.equal(bundle.primary.resources.coins, coins); assert.equal(bundle.secondary.resources.coins, coins); assert.equal(bundle.secondary.population, 6); assert.equal(bundle.secondary.islandStartedAt, startedAt); }
});
test('runtime policy leaves historical fixtures and existing v32 balances unchanged and rejects corrupt packed data', () => {
  const old = legacy(); assert.equal(prepareRuntimeUpgrade(old), old); assert.equal(normalizeRuntimeWorld(old, NOW, { normalizeState: State.normalizeState }).ruleset, undefined);
  const modern = State.createState(NOW, { ruleset: 32 }); modern.resources.vegetables = 57; modern.residents[0].name = 'Kapitan'; modern.provisions.localStock.farm = { grain: 3 }; const original = JSON.stringify(modern);
  assert.equal(prepareRuntimeUpgrade(modern, { enabled: true }), modern); const state = upgrade(modern); assert.equal(state.resources.vegetables, 57); assert.equal(state.population, modern.population); assert.equal(state.residents[0].name, 'Kapitan'); assert.equal(state.provisions.legacyCrewAllowances, undefined);
  assert.equal(JSON.stringify(modern), original); assert.throws(() => upgrade({ ...old, ruleset: 33 }), { code: 'invalid-cloud-data' });
  const packed = copy(old); packed.adventures.note = 'Polski zapis przygód i nagród. '.repeat(6000); claimAdventureBudget(packed, { receiptId: 'migration-paid-reward', reward: { coins: 17 } }); packAdventureSave(packed); assert.ok(packed.adventuresPacked);
  const prepared = prepareRuntimeUpgrade(packed, { enabled: true }); assert.equal(prepared.adventures.note, 'Polski zapis przygód i nagród. '.repeat(6000)); assert.equal(prepared.adventuresPacked, undefined);
  assert.deepEqual(unpackAdventureSave(packed).adventureBudget, prepared.adventureBudget);
  let restored = upgrade(packed); assert.deepEqual(restored.adventureBudget, upgrade(unpackAdventureSave(packed)).adventureBudget); assert.equal(claimAdventureBudget(restored, { receiptId: 'migration-paid-reward', reward: { coins: 17 } }).duplicate, true);
  restored = Arch.restoreArchipelago(Arch.serializeArchipelago(Arch.restoreArchipelago(restored, adapters, NOW)), adapters, NOW).primary; assert.equal(claimAdventureBudget(restored, { receiptId: 'migration-paid-reward', reward: { coins: 17 } }).duplicate, true);
  const damaged = copy(packed); damaged.adventuresPacked.data = 'AAAA'; assert.throws(() => upgrade(damaged), { code: 'invalid-cloud-data' });
});
