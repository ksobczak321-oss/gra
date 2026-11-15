// Server-owned current starting snapshot. Keep this dependency-free so the
// isolated Cloud Run package never imports browser assets or simulation code.
// Contract tests compare its hydrated defaults with frontend createState32.
const RESOURCE_IDS = Object.freeze(['coins', 'wood', 'stone', 'grain', 'food', 'planks', 'vegetables', 'livestock', 'rawMilk', 'sourMilk', 'fish', 'flour', 'pasteurizedMilk', 'meat', 'leather', 'bread', 'cake', 'cheese', 'smokedFish', 'fishPreserves', 'civilianClothes', 'militaryClothes', 'professorRobes']);
const BUILDING_IDS = Object.freeze(['theatre', 'house', 'farm', 'sawmill', 'quarry', 'dock', 'warehouse', 'lighthouse', 'lumber', 'windmill', 'townhall', 'chapel', 'market', 'bakery', 'dairy', 'slaughterhouse', 'fisher', 'leatherworks', 'academy', 'barracks']);
const LOCKED_BUILDINGS = new Set(['lighthouse', 'bakery', 'dairy', 'leatherworks', 'academy', 'barracks']);
const STARTING_RESOURCES = new Set(['coins', 'wood', 'stone', 'grain', 'planks', 'vegetables']);

export function createCurrentStarterIsland(now = Date.now()) {
  if (!Number.isSafeInteger(now) || now < 0 || now > Number.MAX_SAFE_INTEGER - 72 * 3600000) throw new TypeError('A valid starter timestamp is required.');
  return JSON.stringify({
    version: 9, ruleset: 32, islandGeneration: 1, population: 18, capacity: 36, happiness: 20, baseHappiness: 20,
    islandId: 'island-1', islandRole: 'mother', islandName: '', islandNameUpdatedAt: 0, islandStartedAt: null,
    onboarding: { version: 1, routeVersion: 5, stage: 'intro', index: 0, worldStartedAt: null, completedAt: null },
    resources: Object.fromEntries(RESOURCE_IDS.map(id => [id, STARTING_RESOURCES.has(id) ? 100 : 0])),
    buildings: Object.fromEntries(BUILDING_IDS.map(id => [id, { level: LOCKED_BUILDINGS.has(id) ? 0 : 1, workers: 0, ready: 0, workProgress: [] }])),
    residents: Array.from({ length: 18 }, (_, index) => ({ id: index + 1, personUid: `island-1:resident-${index + 1}`, happiness: 20, workplace: null, newbornRemaining: 0, prayerVersion: 1 })),
    residentSequence: 18, foodCredit: 0,
    welcome: { startedAt: now, until: now + 72 * 3600000 }, worldTimeMs: now, lastSimulatedAt: now, savedAt: now,
    ranking: { score: 100, level: 1, coins: 100, at: Math.floor(now / 3600000) * 3600000 },
    day: 1, minutes: 0, settings: { language: 'pl', motion: true, sound: true },
    engagement: { lastRealActivityAt: now, activeUntil: 0, activeSeconds: 0 }
  });
}
