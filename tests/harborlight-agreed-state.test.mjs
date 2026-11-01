import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createState, normalizeState, tick, advanceTo, act, workerLimit, freeWorkers, taxRate, buildingCost, canAfford, updateHappiness, requestUpgrade, applyBuildTestStock, BUILD_TEST_STOCK_VERSION } from '../harborlight-v1-state.js';
import { centralAvailable, centralReserved } from '../harborlight-v1-inventory.js';
import { nextWarsawMidnightMs } from '../harborlight-v1-calendar.js';
import { advanceLogistics, updateStorageStatus, storagePenalty, warehouseLimits, warehouseUsed, MATERIAL_IDS } from '../harborlight-v1-logistics.js';

const NOW = Date.UTC(2026, 9, 23, 12, 0, 0);
const close = (actual, expected, epsilon = 1e-7) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≠ ${expected}`);
function island({ level = 4, population = 12 } = {}) {
  const raw = createState(NOW);
  raw.welcome = { startedAt: 0, until: 0 }; raw.happiness = raw.baseHappiness = 0;
  for (const person of raw.residents) person.happiness = 0;
  raw.buildings.townhall.level = level;
  raw.buildings.house.level = level;
  raw.buildings.warehouse.level = level;
  raw.buildings.lighthouse.level = 1;
  raw.population = population;
  raw.houseHappinessPool.points = population; raw.houseHappinessPool.grantPopulation = population;
  raw.resources = { coins: 1000000, wood: 1000, stone: 1000, grain: 1000, food: 1000, planks: 1000 };
  return normalizeState(raw, NOW);
}
function assign(state, building, count) {
  const result = act(state, { type: 'assign', building, delta: count });
  assert.equal(result.ok, true, result.message);
}
function reload(state) { return normalizeState(JSON.parse(JSON.stringify(state)), state.lastSimulatedAt); }

test('new islands start at Home with no preassigned economy crew', () => {
  const state = createState(NOW);
  assert.equal(state.version, 9);
  assert.equal(state.population, 12);
  assert.equal(freeWorkers(state), 12);
  assert.ok(Object.values(state.buildings).every(building => building.workers === 0));
  assert.ok(Object.values(state.resources).every(value => value === 100));
  assert.equal(state.houseHappinessPool.points, 12);
});

test('workers arrive after two minutes without retroactive production or taxes', () => {
  const state = island();
  assign(state, 'farm', 1);
  assert.equal(taxRate(state), 0);
  tick(state, 119);
  assert.equal(state.buildings.farm.ready, 0);
  assert.equal(state.statistics.taxCollected, 0);
  tick(state, 1);
  assert.equal(state.buildings.farm.ready, 0);
  assert.equal(taxRate(state), 1);
  tick(state, 179);
  assert.equal(state.buildings.farm.ready, 0);
  tick(state, 1);
  assert.equal(state.buildings.farm.ready, 1);
  close(state.taxProgress, 0.05);
});

test('workforce caps use each own building level and one shared Home pool', () => {
  const state = island({ level: 4, population: 48 });
  assert.equal(workerLimit(state, 'lumber'), 12);
  assign(state, 'lumber', 12);
  assert.equal(act(state, { type: 'assign', building: 'lumber', delta: 1 }).ok, false);
  state.buildings.lumber.level = 2;
  assert.equal(workerLimit(state, 'lumber'), 24);
  assign(state, 'lumber', 12);
  assert.equal(freeWorkers(state), 24);
  assert.equal(act(state, { type: 'assign', building: 'farm', delta: 25 }).ok, false);
});

test('blocked but arrived producers still pay taxes and do not earn work happiness', () => {
  const state = island({ population: 6 });
  assign(state, 'quarry', 1); tick(state, 300);
  state.buildings.quarry.ready = 200 * state.buildings.quarry.level;
  const person = state.residents.find(p => p.workplace === 'quarry');
  person.happiness = 0;
  const before = state.statistics.taxCollected;
  tick(state, 3600);
  assert.equal(state.statistics.taxCollected - before, 1);
  close(person.happiness, 1); // Food only; no +1 for a blocked job.
  assert.ok(state.happiness < 0); // The actual blockage applies its own -10 modifier.
});

test('a pickup unblocks producer happiness at dispatch rather than at the end of its trip', () => {
  const state = island({ population: 6 });
  assign(state, 'quarry', 1); assign(state, 'warehouse', 1); tick(state, 300);
  for (const person of state.residents) person.happiness = 0;
  state.buildings.quarry.ready = 200;
  const quarryWorker = state.residents.find(person => person.workplace === 'quarry');
  tick(state, 300);
  assert.ok(state.buildings.quarry.ready < 200);
  close(quarryWorker.happiness, 2 * 300 / 3600); // Food + unblocked work.
  assert.equal(quarryWorker.blockedSeconds, 0);
  assert.ok(state.populationProgress > 0); // No retroactive blocked-store penalty.
});

test('producer prices double only the four edited producers and preserve warehouse/town costs', () => {
  const state = island();
  assert.deepEqual(buildingCost(state, 'farm'), { wood: 72, stone: 72, grain: 120 });
  assert.deepEqual(buildingCost(state, 'windmill'), { wood: 144, stone: 144, food: 240 });
  assert.deepEqual(buildingCost(state, 'sawmill'), { wood: 144, stone: 144, planks: 240 });
  assert.deepEqual(buildingCost(state, 'lumber'), { wood: 384, stone: 144 });
  assert.deepEqual(buildingCost(state, 'quarry'), { wood: 144, stone: 384 });
  assert.equal(buildingCost(state, 'market').coins, 300);
  assert.equal(buildingCost(state, 'dock').coins, 400);
  assert.equal(buildingCost(state, 'townhall').coins, 2000);
});

test('queued upgrade reserves its complete cost with a ten percent surcharge', () => {
  const state = island({ level: 2 });
  assert.equal(act(state, { type: 'upgrade', building: 'farm' }).ok, true);
  assert.equal(act(state, { type: 'upgrade', building: 'windmill' }).ok, true);
  const quote = buildingCost(state, 'quarry');
  assert.deepEqual(quote, { wood: 159, stone: 423 });
  const before = { ...state.resources };
  assert.equal(act(state, { type: 'upgrade', building: 'quarry' }).ok, true);
  const project = state.constructionProjects.find(p => p.building === 'quarry');
  assert.equal(project.stage, 'queued');
  assert.deepEqual(project.cost, quote);
  assert.equal(state.resources.wood, before.wood);
  assert.equal(state.resources.stone, before.stone);
  assert.equal(project.reservedMaterials.wood, 159);
  assert.equal(project.reservedMaterials.stone, 423);
  assert.equal(centralAvailable(state, 'wood'), before.wood - centralReserved(state, 'wood'));
  assert.equal(centralAvailable(state, 'stone'), before.stone - centralReserved(state, 'stone'));
});

test('construction spending preserves the protected central food reserve', () => {
  const state = createState(NOW);
  state.resources = { coins: 1000, wood: 500, stone: 500, grain: 500, food: 500, planks: 500 };
  assert.equal(canAfford(state, buildingCost(state, 'townhall')), false);
  assert.equal(act(state, { type: 'upgrade', building: 'townhall' }).ok, false);
  state.resources.food = 550;
  assert.equal(act(state, { type: 'upgrade', building: 'townhall' }).ok, true);
  assert.equal(state.resources.food, 550);
  assert.equal(centralAvailable(state, 'food'), 50);
  assert.equal(state.buildings.townhall.construction.reservedMaterials.food, 500);
});

test('last Food carrier cannot be manually recalled while Food waits and reserve is low', () => {
  const state = island();
  assign(state, 'warehouse', 1); tick(state, 300);
  state.resources.food = 1;
  state.buildings.windmill.ready = 10;
  assert.equal(act(state, { type: 'assign', building: 'warehouse', delta: -1 }).ok, false);
  state.resources.food = 201;
  assert.equal(act(state, { type: 'assign', building: 'warehouse', delta: -1 }).ok, true);
});

test('real-time catch-up is idempotent and legacy pause/speed do not alter economy time', () => {
  const state = island({ population: 6 });
  assign(state, 'farm', 1);
  state.paused = true; state.speed = 4;
  const food = state.resources.food;
  assert.equal(advanceTo(state, NOW + 3600000), 3600);
  assert.equal(state.buildings.farm.ready, 19); // First two minutes are travel.
  assert.equal(food - state.resources.food, 6);
  const stored = JSON.stringify(state);
  assert.equal(advanceTo(state, NOW + 3600000), 0);
  assert.equal(JSON.stringify(state), stored);
  const saved = reload(state);
  assert.equal(advanceTo(saved, NOW + 7200000), 3600);
  assert.equal(saved.buildings.farm.ready, 39);
});

test('old saves are not retroactively simulated using an unreliable lastActionAt', () => {
  const raw = createState(NOW);
  raw.version = 7;
  delete raw.lastSimulatedAt; delete raw.savedAt; delete raw.worldTimeMs;
  raw.lastActionAt = 1;
  raw.resources.food = 77;
  raw.residents[0].happiness = -25;
  const migrated = normalizeState(raw, NOW + 30 * 86400000);
  assert.equal(migrated.resources.food, 77);
  assert.equal(migrated.residents[0].happiness, -25);
  assert.equal(migrated.lastSimulatedAt, NOW + 30 * 86400000);
  assert.equal(advanceTo(migrated, migrated.lastSimulatedAt), 0);
});

test('manual House points are consumed once without clearing unemployment penalties', () => {
  const state = island({ population: 6 });
  const person = state.residents[0];
  person.unemployedSeconds = 43200;
  const result = act(state, { type: 'houseHappiness', residentId: person.id, amount: 4 });
  assert.equal(result.ok, true, result.message);
  assert.equal(person.happiness, 4);
  assert.equal(person.unemployedSeconds, 43200);
  assert.equal(state.houseHappinessPool.points, 2);
  assert.equal(act(state, { type: 'houseHappiness', residentId: person.id, amount: 3 }).ok, false);
});

test('House auto distribution spends only its remaining pool and refreshes once', () => {
  const state = island({ population: 6 });
  state.houseHappinessPool.points = 3;
  const midnight = nextWarsawMidnightMs(NOW);
  state.worldTimeMs = state.lastSimulatedAt = midnight - 121000;
  state.houseHappinessPool.nextRefreshAt = midnight;
  state.houseHappinessPool.autoRemaining = 1;
  state.houseHappinessPool.refreshRemaining = 121;
  const initial = state.residents.reduce((sum, p) => sum + p.happiness, 0);
  tick(state, 1);
  assert.equal(state.houseHappinessPool.points, 0);
  assert.equal(state.houseHappinessPool.autoDone, true);
  close(state.residents.reduce((sum, p) => sum + p.happiness, 0) - initial, 3 + 6 / 3600);
  tick(state, 120);
  assert.equal(state.houseHappinessPool.generation, 2);
  assert.equal(state.houseHappinessPool.points, 6);
  assert.equal(state.houseHappinessPool.grantPopulation, 6);
  assert.equal(state.houseHappinessPool.autoDone, false);
  close(state.houseHappinessPool.refreshRemaining, 86400);
});

test('House random ties are reproducible through save/reload', () => {
  const state = island({ population: 6 });
  state.houseHappinessPool.points = 1;
  state.houseHappinessPool.randomSeed = 13579;
  const midnight = nextWarsawMidnightMs(NOW);
  state.worldTimeMs = state.lastSimulatedAt = midnight - 121000;
  state.houseHappinessPool.nextRefreshAt = midnight;
  state.houseHappinessPool.autoRemaining = 1;
  state.houseHappinessPool.refreshRemaining = 121;
  const saved = reload(state);
  tick(state, 1); tick(saved, 1);
  assert.deepEqual(state.residents.map(p => p.happiness), saved.residents.map(p => p.happiness));
  assert.equal(state.houseHappinessPool.randomSeed, saved.houseHappinessPool.randomSeed);
});

test('ranking snapshots update at full wall-clock hours', () => {
  const state = createState(NOW + 3599000);
  state.resources.coins = 987;
  const before = state.ranking.at;
  tick(state, 0.5);
  assert.equal(state.ranking.at, before);
  tick(state, 0.5);
  assert.equal(state.ranking.at, NOW + 3600000);
  assert.equal(state.ranking.score, 987);
});

test('Lighthouse construction begins a 100 percent snapshot and restores the pre-effect value', () => {
  const state = island({ level: 2, population: 6 });
  state.buildings.lighthouse.level = 0;
  assign(state, 'warehouse', 6); tick(state, 300);
  for (const person of state.residents) person.happiness = -40;
  const started = requestUpgrade(state, { building: 'lighthouse', cost: buildingCost(state, 'lighthouse'), paidMaterials: true, paidCoins: true, skipTransport: true });
  assert.equal(started.ok, true, started.message);
  started.project.buildRemaining = 1;
  tick(state, 1);
  assert.equal(state.buildings.lighthouse.level, 1);
  assert.equal(state.happiness, 100);
  const snapshots = state.residents.map(p => p.globalLighthouseSnapshot);
  assert.ok(snapshots.every(value => value > -40 && value < -39.99));
  state.lighthouseRemaining = 1;
  tick(state, 1);
  state.residents.forEach((person, i) => close(person.happiness, snapshots[i]));
  assert.ok(state.happiness < 0);
});

test('large earned coin balances survive migration and obsolete rewards are rejected', () => {
  const state = island();
  state.resources.coins = 26214400;
  assert.equal(reload(state).resources.coins, 26214400);
  assert.equal(act(state, { type: 'expeditionComplete', expedition: 'misty', moves: 5 }).ok, false);
  assert.equal(act(state, { type: 'claim', task: 'collect' }).ok, false);
  assert.equal(act(state, { type: 'pause' }).ok, false);
});

test('a paid blessing waits four hours after its one-hour effect ends', () => {
  const state = island({ population: 6 });
  state.resources.food = 2000;
  assert.equal(act(state, { type: 'paidBlessing' }).ok, true);
  assert.equal(state.blessingRemaining, 3600);
  assert.equal(state.paidBlessingCooldownRemaining, 18000);
  tick(state, 3600);
  assert.equal(state.blessingRemaining, 0);
  assert.equal(state.paidBlessingCooldownRemaining, 14400);
  assert.equal(act(state, { type: 'paidBlessing' }).ok, false);
  const saved = reload(state);
  tick(saved, 14399);
  assert.equal(act(saved, { type: 'paidBlessing' }).ok, false);
  tick(saved, 1);
  assert.equal(act(saved, { type: 'paidBlessing' }).ok, true);
});

test('a fully paid Premium building needs no carrier or own materials and takes ten seconds', () => {
  const state = island();
  for (const resource of ['wood', 'stone', 'grain', 'food', 'planks']) state.resources[resource] = 0;
  const result = act(state, { type: 'premiumBuyBuilding', building: 'farm' });
  assert.equal(result.ok, true, result.message);
  assert.equal(state.buildings.warehouse.workers, 0);
  assert.equal(state.buildings.farm.construction ?? null, null);
  assert.equal(state.constructionProjects.length, 0);
  assert.equal(state.buildings.farm.premiumService.stage, 'building');
  assert.equal(state.buildings.farm.premiumService.buildRemaining, 10);
  assert.equal(state.premiumServices.length, 1);
  assert.equal(state.resources.wood, 0);
  assert.equal(state.resources.stone, 0);
  assert.equal(state.resources.grain, 0);
  tick(state, 9);
  assert.equal(state.buildings.farm.level, 1);
  tick(state, 1);
  assert.equal(state.buildings.farm.level, 2);
});

function reservedForecast(state, reservedCoins = 0) {
  const cost = Object.fromEntries(['coins', ...MATERIAL_IDS].map(id => [id, 330]));
  const project = { building: 'warehouse', targetLevel: 2, cost, stage: 'planned', forecast: true,
    order: ++state.constructionSequence, reservationVersion: 9, reservedCoins,
    reservedMaterials: Object.fromEntries(MATERIAL_IDS.map(id => [id, 330])),
    remainingMaterials: Object.fromEntries(MATERIAL_IDS.map(id => [id, 330])),
    delivered: Object.fromEntries(MATERIAL_IDS.map(id => [id, 0])),
    goodsTotal: 1650, goodsRemaining: 1650, transportSeconds: 0, buildRemaining: 0 };
  for (const id of MATERIAL_IDS) state.resources[id] = 330 + (id === 'food' ? 50 : 0);
  state.constructionProjects.push(project);
  state.buildings.warehouse.construction = project;
  return project;
}

test('Premium purchase reserves its coin price before other forecast plans can reserve money', () => {
  const state = island();
  state.buildings.warehouse.level = 1;
  state.premium.expiresAt = NOW + 86400000;
  const forecast = reservedForecast(state);
  state.resources.coins = 524; // 195 for the service plus 329 of a 330-coin forecast.
  const before = { ...state.resources };
  const bought = act(state, { type: 'premiumBuyBuilding', building: 'farm' });
  assert.equal(bought.ok, true, bought.message);
  assert.equal(bought.coins, 195);
  assert.equal(state.resources.coins, 329);
  assert.equal(forecast.stage, 'planned');
  assert.equal(state.buildings.farm.premiumService.stage, 'building');
  assert.equal(state.constructionProjects.length, 1, 'paid services consume no ordinary project slot');
  assert.equal(state.resources.wood, before.wood);
  assert.equal(centralAvailable(state, 'wood'), 0, 'pledged material remains physically stored but unavailable');
  tick(state, 1);
  assert.equal(forecast.reservedCoins, 329);
  assert.equal(state.resources.coins, 0);
  assert.equal(forecast.stage, 'planned', 'the final forecast coin cannot be spent twice');
});

test('taxes fund a forecast at their exact threshold without retroactive construction transport', () => {
  const whole = island();
  whole.buildings.warehouse.level = 1;
  whole.premium.expiresAt = NOW + 86400000;
  assign(whole, 'warehouse', 7); tick(whole, 300);
  reservedForecast(whole, 329);
  whole.resources.coins = 0;
  whole.taxProgress = 0;
  const split = structuredClone(whole), fundingTime = 3600 / 7;
  tick(whole, fundingTime);
  for (let n = 0; n < Math.floor(fundingTime); n++) tick(split, 1);
  tick(split, fundingTime % 1);
  for (const state of [whole, split]) {
    const project = state.buildings.warehouse.construction;
    assert.equal(state.resources.coins, 0);
    assert.equal(project.reservedCoins, 330);
    assert.equal(project.stage, 'transport');
    assert.equal(project.transportSeconds, 0);
    assert.equal(project.goodsRemaining, 1650);
    assert.equal(state.haulTrips.warehouse.length, 0);
    close(state.taxProgress, 0);
    tick(state, 300);
    assert.equal(project.transportSeconds, 300);
    assert.equal(project.goodsRemaining, 870); // Three Wood, three Stone and one Grain load.
  }
  assert.deepEqual(whole.resources, split.resources);
});

test('House points are never spent on a newborn whose happiness must stay at zero', () => {
  const state = island({ population: 6 });
  const newborn = state.residents[0];
  newborn.newbornRemaining = 86400;
  const points = state.houseHappinessPool.points;
  assert.equal(act(state, { type: 'houseHappiness', residentId: newborn.id, amount: 1 }).ok, false);
  assert.equal(state.houseHappinessPool.points, points);
  state.residents.slice(1).forEach(person => { person.happiness = 100; });
  state.houseHappinessPool.autoRemaining = 1;
  tick(state, 1);
  assert.equal(newborn.happiness, 0);
  assert.equal(state.houseHappinessPool.points, points);
});

test('the smallest logistics boundary advances both blocked clocks and pending production', () => {
  const state = island({ population: 6 });
  assign(state, 'lumber', 1); assign(state, 'farm', 1); tick(state, 120);
  state.buildings.lumber.ready = state.buildings.lumber.level * 200;
  updateStorageStatus(state);
  state.buildings.lumber.fullSeconds = 86400 - 5e-8;
  state.buildings.farm.workProgress[0] = 180 - 5e-8;
  advanceLogistics(state, 1e-7);
  assert.ok(state.buildings.lumber.fullSeconds >= 86400);
  assert.equal(storagePenalty(state, 'lumber'), 20);
  assert.equal(state.buildings.farm.ready, 1);
  assert.equal(state.buildings.farm.workProgress[0], 0);
});

test('96-hour offline full-storage catch-up is bounded and matches split intervals', () => {
  const moduleURL = new URL('../harborlight-v1-state.js', import.meta.url).href;
  // A subprocess timeout also reports a future synchronous event-loop regression
  // as a test failure instead of leaving the entire test runner blocked.
  const script = `
    import { createState, normalizeState, act, tick, advanceTo } from ${JSON.stringify(moduleURL)};
    const now=${NOW}, raw=createState(now);
    raw.version=6; delete raw.residents;
    raw.buildings.townhall.level=6; raw.buildings.house.level=6; raw.buildings.warehouse.level=6; raw.buildings.lumber.level=6;
    raw.population=144; raw.resources.food=7000;
    const whole=normalizeState(raw,now);
    act(whole,{type:'assign',building:'lumber',delta:6});
    whole.buildings.lumber.ready=1200;
    const split=structuredClone(whole);
    advanceTo(whole,now+96*3600000);
    for(let part=0;part<16;part++) tick(split,6*3600);
    const snapshot=s=>({population:s.population,happiness:s.happiness,resources:s.resources,
      blocked:s.buildings.lumber.fullSeconds,stock:s.buildings.lumber.ready,clock:s.worldTimeMs,
      phases:s.buildings.lumber.workProgress});
    process.stdout.write(JSON.stringify({whole:snapshot(whole),split:snapshot(split)}));
  `;
  const { whole, split } = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { timeout: 10000, encoding: 'utf8' }));
  assert.equal(whole.population, split.population);
  assert.ok(whole.population >= 6 && whole.population < 144);
  assert.deepEqual(whole.resources, split.resources);
  assert.deepEqual(whole.phases, split.phases);
  assert.equal(whole.stock, 1200);
  close(whole.happiness, split.happiness);
  close(whole.blocked, 96 * 3600);
  close(split.blocked, 96 * 3600);
  close(whole.clock, NOW + 96 * 3600000, 0.1);
  close(split.clock, NOW + 96 * 3600000, 0.1);
});


test('the authorized preview stock fills current central limits once without changing levels or existing coins', () => {
  const state = createState(NOW);
  state.resources.coins = 12345;
  const levels = Object.fromEntries(Object.entries(state.buildings).map(([id, b]) => [id, b.level]));
  assert.equal(applyBuildTestStock(state), true);
  assert.equal(state.previewBuildStockVersion, BUILD_TEST_STOCK_VERSION);
  assert.equal(warehouseUsed(state), warehouseLimits(state).total);
  for (const id of MATERIAL_IDS) assert.equal(state.resources[id], 800);
  assert.equal(state.resources.coins, 12345);
  assert.deepEqual(Object.fromEntries(Object.entries(state.buildings).map(([id, b]) => [id, b.level])), levels);
  const snapshot = JSON.stringify(state);
  assert.equal(applyBuildTestStock(state), false);
  assert.equal(JSON.stringify(state), snapshot);
});

test('preview stock marker survives spending and reload without refilling a second time', () => {
  let state = createState(NOW);
  applyBuildTestStock(state);
  state.resources.wood -= 72;
  state = reload(state);
  const snapshot = JSON.stringify(state);
  assert.equal(applyBuildTestStock(state), false);
  assert.equal(JSON.stringify(state), snapshot);
  assert.equal(state.resources.wood, 728);
});

test('preview stock respects higher warehouse limits and does not erase an existing excess', () => {
  const state = createState(NOW);
  state.buildings.townhall.level = state.buildings.house.level = state.buildings.warehouse.level = 2;
  state.resources = { coins: 12345, wood: 1600, stone: 10, grain: 20, food: 30, planks: 40 };
  applyBuildTestStock(state);
  assert.equal(state.resources.wood, 1600);
  assert.equal(warehouseUsed(state), 6000);
  for (const id of MATERIAL_IDS.filter(id => id !== 'wood')) assert.ok(state.resources[id] <= 1500);
  assert.equal(state.resources.coins, 12345);
});

test('explicit motion enable overrides the operating-system default and survives save migration', () => {
  let state = createState(NOW);
  assert.equal(state.settings.motionOverride, false);
  assert.equal(act(state, { type: 'setting', key: 'motion', value: true }).ok, true);
  assert.equal(state.settings.motionOverride, true);
  state = reload(state);
  assert.equal(state.settings.motionOverride, true);
  assert.equal(act(state, { type: 'setting', key: 'motion', value: false }).ok, true);
  assert.equal(state.settings.motionOverride, false);
});


test('the one-time preview provides at least ten thousand coins for construction without changing the ordinary starter kit', () => {
  const state = createState(NOW);
  assert.equal(state.resources.coins, 100);
  applyBuildTestStock(state);
  assert.equal(state.resources.coins, 10000);
  state.resources.coins -= 500;
  assert.equal(applyBuildTestStock(state), false);
  assert.equal(state.resources.coins, 9500);
});
