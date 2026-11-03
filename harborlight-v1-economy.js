// DEV v29 economy parameters. Pure functions: no clocks, random numbers or saves.
export const ECONOMY_RULES = Object.freeze({
  version: 1, firstLevelSeconds: 45, maximumSeconds: 86400,
  maximumLevel: 24, transportShare: .4, constructionCarriers: 3,
  workerWalkSeconds: 120, queuedCostFactor: 1.1, capacityBuffer: 1.25,
  missionMaterialPerLevel: 500, largestUpgradeMaterialPerLevel: 500,
  foodReservePerWarehouseLevel: 50,
  productionBasePerWorkerHour: 40, productionIncrementPerLevel: 4
});
export const BUILDING_TIME_WEIGHTS = Object.freeze({
  townhall: 1, lighthouse: 1, house: .8, warehouse: .8,
  chapel: .85, dock: .85, market: .6,
  farm: .65, windmill: .65, lumber: .65, sawmill: .65, quarry: .65
});
const materials = ['wood', 'stone', 'grain', 'food', 'planks'];
const levelNumber = value => Math.max(1, Math.floor(Number(value) || 1));
export function longestConstructionSeconds(level) {
  const target = levelNumber(level);
  if (target >= 24) return 86400;
  if (target === 23) return 23 * 3600 + 55 * 60;
  let seconds = 45;
  for (let current = 2; current <= target; current++) {
    seconds *= current <= 5 ? 3 : current <= 8 ? 2 : current <= 11 ? 1.2 : current <= 14 ? 1.1 : current <= 17 ? 1.05 : 1.02;
  }
  return seconds;
}
export const CONSTRUCTION_TIME_TABLE = Object.freeze(Array.from({length: 24}, (_, index) => longestConstructionSeconds(index + 1)));
export const productionPerWorkerHour = level => {
  const current = Math.max(0, Math.floor(Number(level) || 0));
  return current ? ECONOMY_RULES.productionBasePerWorkerHour + ECONOMY_RULES.productionIncrementPerLevel * (current - 1) : 0;
};
// Capacity depends only on the warehouse level. It never changes when a mission
// is accepted/completed. Use the next stage as a conservative planning envelope;
// old higher capacities are retained, including the existing level-24 ceiling.
export function warehouseCapacityPlan(level) {
  const current = Math.min(24, Math.max(0, Math.floor(Number(level) || 0)));
  if (!current) return { level: 0, stage: 0, largestUpgrade: 0, mission: 0, foodReserve: 0, buffer: 1.25, perResource: 0, total: 0 };
  const stage = current + 1;
  const largestUpgrade = Math.ceil(500 * stage * 1.1 - 1e-9);
  const mission = 500 * stage;
  const foodReserve = 50 * current;
  const planned = Math.ceil((largestUpgrade + mission + foodReserve) * 1.25);
  const historical = Math.floor(Math.min(10000000, 1000 * 1.5 ** (current - 1)));
  const perResource = Math.min(10000000, Math.max(planned, historical));
  return { level: current, stage, largestUpgrade, mission, foodReserve, buffer: 1.25, perResource, total: perResource * 5 };
}
export const WAREHOUSE_CAPACITY_TABLE = Object.freeze(Array.from({length: 24}, (_, index) => Object.freeze(warehouseCapacityPlan(index + 1))));
export const warehouseCapacityForLevel = level => {
  const plan = warehouseCapacityPlan(level);
  return { perResource: plan.perResource, total: plan.total };
};
// A snapshot is attached at order time. A later Town Hall/road upgrade must not
// rewrite an existing project's ETA. Walking, gathering and queued jobs are
// outside this budget; actual deliveries still require the stated ready crew.
export function constructionTiming(state, project, options = {}) {
  const weight = BUILDING_TIME_WEIGHTS[project?.building];
  if (!weight) return null; // Theatre is a static venue, never a build project.
  const completedTownhallLevel = levelNumber(state?.buildings?.townhall?.level);
  const warehouseLevel = Math.min(24, levelNumber(state?.buildings?.warehouse?.level));
  const capacity = Math.max(1, Math.floor(options.capacity || Math.floor(120 * 1.1 ** (warehouseLevel - 1))));
  const trips = materials.reduce((sum, id) => sum + Math.ceil(Math.max(0, Number(project.cost?.[id]) || 0) / capacity), 0);
  const requiredWorkers = 3;
  const waves = Math.max(1, Math.ceil(trips / requiredWorkers));
  const totalSeconds = longestConstructionSeconds(completedTownhallLevel) * weight;
  const transportDuration = trips ? totalSeconds * .4 : 0;
  return { version: 1, completedTownhallLevel, weight, totalSeconds,
    transportDuration, buildingDuration: totalSeconds - transportDuration,
    requiredWorkers, capacity, trips, waves, courseSeconds: transportDuration / waves };
}
export function normalizeConstructionTiming(value) {
  if (!value || value.version !== 1 || !Number.isInteger(value.completedTownhallLevel) || value.completedTownhallLevel < 1 || value.completedTownhallLevel > 100 || !Object.values(BUILDING_TIME_WEIGHTS).includes(value.weight) || value.requiredWorkers !== 3 || !Number.isSafeInteger(value.capacity) || value.capacity < 1 || !Number.isSafeInteger(value.trips) || value.trips < 0 || !Number.isSafeInteger(value.waves) || value.waves !== Math.max(1, Math.ceil(value.trips / 3))) return null;
  const expectedTotal = longestConstructionSeconds(value.completedTownhallLevel) * value.weight;
  const transport = value.trips ? expectedTotal * .4 : 0;
  if (![value.totalSeconds, value.transportDuration, value.buildingDuration, value.courseSeconds].every(Number.isFinite) || Math.abs(value.totalSeconds - expectedTotal) > 1e-6 || Math.abs(value.transportDuration - transport) > 1e-6 || Math.abs(value.buildingDuration - (expectedTotal - transport)) > 1e-6 || Math.abs(value.courseSeconds * value.waves - transport) > 1e-6) return null;
  return { version: 1, completedTownhallLevel: value.completedTownhallLevel, weight: value.weight,
    totalSeconds: expectedTotal, transportDuration: transport, buildingDuration: expectedTotal - transport,
    requiredWorkers: 3, capacity: value.capacity, trips: value.trips, waves: value.waves, courseSeconds: value.courseSeconds };
}
