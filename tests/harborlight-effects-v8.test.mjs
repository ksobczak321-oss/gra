import test from 'node:test';
import assert from 'node:assert/strict';
import { activeEffects, normalizeEffectNotifications, syncEffectNotifications } from '../harborlight-v1-effects.js';
import { translate } from '../harborlight-v1-i18n.js';

function island() {
  return { population: 3, activeSeconds: 0, worldTimeMs: 1_800_000_000_000,
    resources: { food: 100, wood: 100, grain: 100 }, foodCredit: 0,
    residents: Array.from({ length: 3 }, (_, index) => ({ id: index + 1, happiness: 0,
      workplace: null, arrivalRemaining: 0, returnRemaining: 0, newbornRemaining: 0,
      blockedSeconds: 0, hungerSeconds: 0, unemployedSeconds: 0, visitHappinessRemaining: 0 })),
    buildings: { house: { level: 1 }, chapel: { level: 2 }, quarry: { level: 1, ready: 0 }, windmill: { level: 1, ready: 0 } },
    notifications: [], notificationSequence: 0,
    leisure: { effects: [], habits: {} }, roads: { segments: Array(100).fill(0) },
    lighthouseVisitBonuses: [], premium: { expiresAt: 0 } };
}
const byId = (state, id) => activeEffects(state).find(effect => effect.id === id);
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) deepFreeze(child); }
  return value;
}

test('effects are read-only, complete and never expose removed income details', () => {
  const state = island();
  Object.assign(state, { blessingRemaining: 3600, chapelRemaining: 18000, lighthouseRemaining: 86400 });
  state.residents[0].visitHappinessRemaining = 400;
  state.residents[2].newbornRemaining = 700;
  state.lighthouseVisitBonuses = [{ groupId: 7, remaining: 600 }, { groupId: 8, remaining: 900 }];
  const before = JSON.stringify(state);
  deepFreeze(state);
  const rows = activeEffects(state);
  assert.equal(JSON.stringify(state), before);
  assert.equal(rows.find(row => row.id === 'manual-blessing').amount, 20);
  assert.equal(rows.find(row => row.id === 'chapel-upgrade').amount, 20);
  assert.equal(rows.find(row => row.id === 'manual-blessing').scope, '2 residents');
  assert.deepEqual(rows.find(row => row.id === 'manual-blessing').residentIds, [1, 2]);
  assert.match(rows.find(row => row.id === 'lighthouse-upgrade').effect, /100%.*×2/);
  assert.equal(rows.find(row => row.id === 'lighthouse-person-1').remaining, 400);
  assert.equal(rows.find(row => row.id === 'new-resident-3').polarity, 'neutral');
  assert.equal(rows.filter(row => row.id.startsWith('lighthouse-group-')).length, 2);
  assert.equal(rows.find(row => row.id === 'lighthouse-group-7').remaining, 600);
  assert.equal(rows.find(row => row.id === 'lighthouse-group-8').remaining, 900);
  assert.doesNotMatch(JSON.stringify(rows), /tax|income/i);
});

test('ongoing meals and real work have the same recipients as resident conditions', () => {
  const state = island();
  state.residents[0].workplace = 'quarry';
  state.residents[1].workplace = 'quarry'; state.residents[1].arrivalRemaining = 30;
  state.residents[2].newbornRemaining = 40;
  assert.deepEqual(byId(state, 'regular-meals').residentIds, [1, 2]);
  assert.deepEqual(byId(state, 'employment').residentIds, [1]);
  assert.equal(byId(state, 'employment').amount, 1);
  state.buildings.quarry.ready = 200;
  assert.equal(byId(state, 'employment'), undefined);
  assert.deepEqual(byId(state, 'production-blockage-quarry').residentIds, [1]);
});

test('food shortage efficiency starts immediately but personal penalties respect twelve-hour grace', () => {
  const state = island();
  state.resources.food = 0;
  state.residents[0].hungerSeconds = 43199;
  state.residents[1].hungerSeconds = 43200;
  state.residents[2].hungerSeconds = 43200; state.residents[2].newbornRemaining = 100;
  assert.equal(byId(state, 'regular-meals'), undefined);
  assert.equal(byId(state, 'food-shortage-efficiency').amount, -50);
  assert.deepEqual(byId(state, 'hunger').residentIds, [2]);
  state.foodCredit = 0.5;
  assert.equal(byId(state, 'hunger'), undefined);
  assert.equal(byId(state, 'food-shortage-efficiency'), undefined);
  assert.equal(byId(state, 'regular-meals').amount, 1);
});

test('unemployment, missing beds and stepped production penalties remain separate', () => {
  const state = island();
  state.residents[0].unemployedSeconds = 43200;
  state.residents[1].workplace = 'windmill'; state.residents[1].blockedSeconds = 86400;
  state.resources.grain = 0;
  state.residents[2].workplace = 'windmill'; state.residents[2].blockedSeconds = 12 * 86400;
  for (let id = 4; id <= 26; id++) state.residents.push({ ...state.residents[0], id, unemployedSeconds: 0 });
  state.population = 26;
  assert.deepEqual(byId(state, 'unemployment').residentIds, [1]);
  assert.equal(byId(state, 'overcrowding'), undefined);
  assert.deepEqual(byId(state, 'unhoused-residents').residentIds, [25, 26]);
  assert.equal(byId(state, 'unhoused-residents').amount, null);
  assert.match(byId(state, 'unhoused-residents').effect, /Work speed ×0\.5.*Food consumption ×2/);
  assert.equal(byId(state, 'production-blockage-windmill').amount, -50);
  assert.equal(byId(state, 'production-blockage-windmill').effect, '−20 to −50 pp happiness');
  state.resources.grain = 2;
  assert.equal(byId(state, 'production-blockage-windmill'), undefined);
});

test('attraction purchases keep individual recipients and timers, and familiarity has a distinct expiry', () => {
  const state = island();
  state.leisure.effects = [
    { id: 4, attractionId: 'puppet-show', title: 'Puppet show', amount: 30, residentIds: [1, 3], remaining: 200 },
    { id: 5, attractionId: 'puppet-show', title: 'Puppet show', amount: 23, residentIds: [2], remaining: 700 },
    { id: 6, attractionId: 'folk-concert', title: 'Folk concert', amount: 50, residentIds: [99], remaining: 700 }
  ];
  state.residents[2].newbornRemaining = 50;
  state.leisure.habits['puppet-show'] = { uses: 2, resetRemaining: 85000 };
  assert.deepEqual(byId(state, 'attraction-4').residentIds, [1]);
  assert.equal(byId(state, 'attraction-4').remaining, 200);
  assert.equal(byId(state, 'attraction-5').remaining, 700);
  assert.equal(byId(state, 'attraction-6'), undefined);
  assert.equal(byId(state, 'familiarity-puppet-show').amount, -50);
  assert.match(byId(state, 'familiarity-puppet-show').effect, /50%/);
  assert.equal(byId(state, 'familiarity-puppet-show').remaining, 85000);
  state.leisure.habits['puppet-show'].uses = 4;
  assert.match(byId(state, 'familiarity-puppet-show').effect, /purchase unavailable/);
  state.leisure.habits['puppet-show'].resetRemaining = 0;
  assert.equal(byId(state, 'familiarity-puppet-show'), undefined);
});

test('familiarity keeps the canonical translated attraction name after its personal bonus has expired', () => {
  const state = island();
  state.leisure.effects = [];
  state.leisure.habits['flower-beds'] = { uses: 1, resetRemaining: 18 * 3600 };
  const before = JSON.stringify(state), row = byId(state, 'familiarity-flower-beds');
  assert.equal(row.title, 'Flower beds: familiarity');
  assert.doesNotMatch(translate(row.title, 'pl'), /Flower|Beds|familiarity/);
  assert.match(row.effect, /75%/);
  assert.equal(JSON.stringify(state), before);
});

test('only fully completed road tiers create a permanent speed and load benefit', () => {
  const state = island();
  state.roads.segments.fill(1); state.roads.segments[99] = 0;
  assert.equal(byId(state, 'completed-path-level'), undefined);
  state.roads.segments[99] = 1;
  assert.equal(byId(state, 'completed-path-level').effect, '+10% carrying speed');
  assert.equal(byId(state, 'completed-path-level').remaining, null);
  state.roads.segments.fill(3);
  assert.equal(byId(state, 'completed-path-level').effect, '+30% carrying speed · +10% carrying capacity');
  state.roads.segments.fill(5);
  assert.equal(byId(state, 'completed-path-level').effect, '+50% carrying speed · +30% carrying capacity');
});

test('active construction package reports its world-clock expiry without mutating progress', () => {
  const state = island(); state.premium.expiresAt = state.worldTimeMs + 90_000;
  assert.equal(byId(state, 'construction-package').remaining, 90);
  state.worldTimeMs += 90_000;
  assert.equal(byId(state, 'construction-package'), undefined);
  assert.equal(state.premium.expiresAt, 1_800_000_090_000);
});

test('initial normalization and reload are silent; only meaningful transitions create notices', () => {
  const state = island();
  normalizeEffectNotifications(state);
  assert.equal(state.notifications.length, 0);
  state.blessingRemaining = 3600;
  syncEffectNotifications(state);
  assert.equal(state.notifications.length, 1);
  assert.equal(state.notifications[0].kind, 'effect-started');
  assert.equal(state.notifications[0].effectId, 'manual-blessing');
  assert.match(state.notifications[0].message, /20 pp.*3 residents.*1 h/);
  for (let second = 0; second < 100; second++) { state.blessingRemaining--; syncEffectNotifications(state); }
  assert.equal(state.notifications.length, 1, 'countdown alone must not notify');
  const restored = structuredClone(state); normalizeEffectNotifications(restored); syncEffectNotifications(restored);
  assert.deepEqual(restored.notifications, state.notifications);
  state.blessingRemaining = 0; syncEffectNotifications(state); syncEffectNotifications(state);
  assert.equal(state.notifications.length, 2);
  assert.equal(state.notifications[0].kind, 'effect-ended');
  assert.equal(state.notifications[0].effectId, 'manual-blessing');
});

test('recipient and stepped value changes notify once while whole histories remain bounded', () => {
  const state = island();
  state.residents[0].workplace = 'quarry'; state.buildings.quarry.ready = 200;
  normalizeEffectNotifications(state);
  state.residents[0].blockedSeconds = 86400;
  syncEffectNotifications(state);
  assert.equal(state.notifications.length, 1);
  assert.equal(state.notifications[0].kind, 'effect-changed');
  assert.match(state.notifications[0].message, /−20 pp/);
  state.residents[1].workplace = 'quarry';
  syncEffectNotifications(state); syncEffectNotifications(state);
  assert.equal(state.notifications.length, 2);
  assert.match(state.notifications[0].message, /2 residents/);
  for (let index = 0; index < 150; index++) {
    state.blessingRemaining = index % 2 ? 0 : 3600;
    syncEffectNotifications(state);
  }
  assert.equal(state.notifications.length, 100);
  assert.equal(new Set(state.notifications.map(item => item.id)).size, 100);
  assert.ok(state.notifications.every(item => !item.read));
});

test('silent synchronization updates its baseline without losing existing notices', () => {
  const state = island(); state.notifications = [{ id: 5, title: 'Existing event', message: 'Keep this history', read: true }];
  syncEffectNotifications(state);
  state.chapelRemaining = 36000;
  syncEffectNotifications(state, { silent: true });
  syncEffectNotifications(state);
  assert.deepEqual(state.notifications, [{ id: 5, title: 'Existing event', message: 'Keep this history', read: true }]);
  state.chapelRemaining = 0;
  syncEffectNotifications(state);
  assert.equal(state.notifications[0].id, 6);
  assert.equal(state.notifications[0].kind, 'effect-ended');
});

test('an individual penalty step notifies even when the displayed group range is unchanged', () => {
  const state = island(); state.buildings.quarry.ready = 200;
  state.residents.forEach(person => { person.workplace = 'quarry'; });
  state.residents[1].blockedSeconds = 86400;
  state.residents[2].blockedSeconds = 4 * 86400;
  normalizeEffectNotifications(state);
  const originalLabel = byId(state, 'production-blockage-quarry').effect;
  state.residents[1].blockedSeconds = 2 * 86400;
  syncEffectNotifications(state); syncEffectNotifications(state);
  assert.equal(byId(state, 'production-blockage-quarry').effect, originalLabel);
  assert.equal(state.notifications.length, 1);
  assert.equal(state.notifications[0].kind, 'effect-changed');
  assert.deepEqual(byId(state, 'production-blockage-quarry').details, [
    { residentId: 1, amount: -10 }, { residentId: 2, amount: -30 }, { residentId: 3, amount: -50 }
  ]);
});

test('empty and partly migrated snapshots yield a safe, deterministic read-only summary', () => {
  assert.deepEqual(activeEffects({}), []);
  assert.deepEqual(activeEffects({ leisure: { habits: {} }, residents: null }), []);
  const state = { notifications: [] };
  syncEffectNotifications(state); syncEffectNotifications(state);
  assert.deepEqual(state.notifications, []);
  assert.deepEqual(state.effectNotificationState, { version: 1, active: {} });
});
