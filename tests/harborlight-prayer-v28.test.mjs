import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, tick, residentPrayerQuote, residentPrayerStatus, PRAYER_RULES, taxRate } from '../harborlight-v1-state.js';
import { residentAtHome, residentHappiness, residentOffset, residentHappinessRate, NEED_GRACE_SECONDS } from '../harborlight-v1-residents.js';
import { activeEffects, normalizeEffectNotifications, syncEffectNotifications } from '../harborlight-v1-effects.js';
const NOW = Date.parse('2026-11-02T12:00:00Z');
function ordinary(level = 1) {
  const state = createState(NOW); state.welcome = { startedAt: 0, until: 0 };
  state.buildings.townhall.level = level; state.resources.coins = 10000; state.resources.food = 10000;
  for (const person of state.residents) { person.happiness = 20; person.newbornRemaining = 0; }
  return state;
}
const reload = state => normalizeState(JSON.parse(JSON.stringify(state)), state.worldTimeMs);
const prayer = (state, id = 1) => { const result = act(state, { type: 'prayResident', residentId: id }, state.worldTimeMs); assert.equal(result.ok, true, result.message); return result; };

test('prayer quote uses completed Town Hall price and includes both walks in total duration', () => {
  const state = ordinary(3), before = JSON.stringify(state), quote = residentPrayerQuote(state, [1]);
  assert.equal(quote.ok, true); assert.equal(quote.coins, 30); assert.equal(quote.duration, 1800);
  assert.equal(quote.happinessPoints, 50); assert.equal(quote.happinessSeconds, 21600);
  assert.equal(JSON.stringify(state), before, 'A quote must not pay or start the activity');
  assert.equal(PRAYER_RULES.secondsPerTownHallLevel, 600);
});

test('one prayer follows outbound, prayer and return phases without an additional walk afterwards', () => {
  const state = ordinary(2); prayer(state); const initial = state.resources.coins;
  assert.equal(residentPrayerStatus(state).active[0].phase, 'walking-there');
  assert.equal(residentAtHome(state.residents[0]), false);
  tick(state, 120); assert.equal(residentPrayerStatus(state).active[0].phase, 'praying');
  tick(state, 960); assert.equal(residentPrayerStatus(state).active[0].phase, 'walking-home');
  tick(state, 119); assert.equal(state.residents[0].prayerBonusRemaining, 0);
  tick(state, 1); const person = state.residents.find(person => person.id === 1);
  assert.equal(person.prayerRemaining, 0); assert.equal(person.returnRemaining, 0);
  assert.equal(person.prayerBonusRemaining, 21600); assert.equal(residentOffset(state, person), 50);
  assert.equal(residentAtHome(person), true); assert.equal(state.resources.coins, initial);
});

test('active prayer retains its paid duration when Town Hall is upgraded', () => {
  const state = ordinary(2); prayer(state); state.buildings.townhall.level = 3;
  assert.equal(residentPrayerStatus(state).active[0].duration, 1200);
  const restored = reload(state);
  assert.equal(residentPrayerStatus(restored).active[0].duration, 1200);
  assert.equal(residentPrayerStatus(restored).active[0].remaining, 1200);
});

test('offline prayer reward starts on the actual return boundary and expires after six hours', () => {
  const state = ordinary(); prayer(state);
  tick(state, 600 + 300);
  const person = state.residents.find(person => person.id === 1);
  assert.equal(person.prayerBonusRemaining, 21600 - 300);
  assert.equal(person.prayerRewardPending, false);
  const restored = reload(state), same = restored.residents.find(person => person.id === 1);
  assert.equal(same.prayerBonusRemaining, 21600 - 300);
  assert.equal(restored.notifications.filter(item => item.kind === 'prayer-completed').length, 1);
  tick(restored, 21600 - 300);
  assert.equal(same.prayerBonusRemaining, 0); assert.equal(residentOffset(restored, same), 0);
  assert.equal(residentPrayerQuote(restored, [1]).ok, true);
});

test('prayer neither produces workplace taxes nor accrues unemployment during its legitimate activity', () => {
  const state = ordinary(100), person = state.residents[0];
  person.unemployedSeconds = NEED_GRACE_SECONDS + 100;
  assert.equal(residentHappinessRate(state, person), -4);
  prayer(state);
  assert.equal(taxRate(state), 0);
  assert.equal(residentHappinessRate(state, person), 1);
  const elapsed = person.unemployedSeconds;
  tick(state, 13 * 3600);
  assert.ok(Math.abs(person.prayerRemaining - (60000 - 13 * 3600)) < 1e-7);
  assert.equal(person.unemployedSeconds, elapsed);
  assert.equal(activeEffects(state).find(item => item.id === 'unemployment')?.residentIds.includes(person.id) || false, false);
});

test('prayer requires an available resident at Home and rejects duplicate or over-capacity groups atomically', () => {
  const state = ordinary(2); state.buildings.chapel.level = 2;
  const before = state.resources.coins;
  assert.equal(residentPrayerQuote(state, [1, 1]).ok, false);
  assert.equal(residentPrayerQuote(state, [1, 2, 3]).ok, false);
  assert.equal(state.resources.coins, before);
  assert.equal(act(state, { type: 'pray', residentIds: [1, 2] }, state.worldTimeMs).ok, true);
  assert.equal(residentPrayerStatus(state).free, 0);
  assert.equal(residentPrayerQuote(state, [3]).ok, false);
  assert.equal(residentPrayerQuote(state, [1]).ok, false);
  assert.equal(act(state, { type: 'cancelPrayer', residentId: 1 }, state.worldTimeMs).ok, false);
});

test('new arrivals and active prayer bonuses are not sold an unusable repeat', () => {
  const state = ordinary(); state.residents[0].newbornRemaining = 3600;
  assert.equal(residentPrayerQuote(state, [1]).ok, false);
  state.residents[0].newbornRemaining = 0; prayer(state); tick(state, 600);
  const balance = state.resources.coins;
  assert.equal(residentPrayerQuote(state, [1]).ok, false);
  assert.equal(act(state, { type: 'prayResident', residentId: 1 }, state.worldTimeMs).ok, false);
  assert.equal(state.resources.coins, balance);
});

test('prayer bonus remains temporary while Lighthouse retains its promised forced happiness', () => {
  const state = ordinary(); prayer(state); tick(state, 600);
  const person = state.residents[0]; state.lighthouseRemaining = 3600;
  assert.equal(residentHappiness(state, person), 100);
  tick(state, 3600);
  assert.ok(Math.abs(person.prayerBonusRemaining - 18000) < 1e-7);
  assert.ok(residentHappiness(state, person) < 100);
});

test('legacy unknown prayer clocks cannot create new reward claims on migration', () => {
  const state = ordinary(); state.residents[0].prayerRemaining = 600;
  delete state.residents[0].prayerVersion; delete state.residents[0].prayerRewardPending;
  const restored = reload(state); tick(restored, 600);
  assert.equal(restored.residents[0].prayerBonusRemaining, 0);
  assert.equal(restored.notifications.some(item => item.kind === 'prayer-completed'), false);
});

test('ended production penalties expose actual resume and recall causes to presentation', () => {
  const state = ordinary();
  assert.equal(act(state, { type: 'assign', building: 'windmill', delta: 2 }, state.worldTimeMs).ok, true);
  tick(state, 120); state.buildings.windmill.ready = 200;
  normalizeEffectNotifications(state);
  state.buildings.windmill.ready = 180;
  syncEffectNotifications(state);
  const resumed = state.notifications.find(item => item.effectId === 'production-blockage-windmill' && item.effectTransition?.transition === 'ended');
  assert.equal(resumed.effectTransition.reason, 'production-resumed');
  assert.equal(resumed.effectTransition.resumedCount, 2); assert.equal(resumed.effectTransition.remainingLocal, 180);
  state.buildings.windmill.ready = 200; normalizeEffectNotifications(state);
  assert.equal(act(state, { type: 'assign', building: 'windmill', delta: -2 }, state.worldTimeMs).ok, true);
  const recalled = state.notifications.find(item => item.effectId === 'production-blockage-windmill' && item.effectTransition?.transition === 'ended');
  assert.equal(recalled.effectTransition.reason, 'workers-recalled');
  assert.equal(recalled.effectTransition.recalledCount, 2); assert.equal(recalled.effectTransition.remainingLocal, 200);
});

test('simulation-only charity history survives world reload without becoming proof of real funding', () => {
  const state = ordinary(); state.charitySimulation = { version: 1, qualified: 12000, last: { month: '2026-11', at: NOW }, lastRewardAt: NOW, serial: 1,
    donations: [{ id: 'dev-charity-1', requestId: 'dev-request-1', islandId: 'island-1', beneficiaryId: 'dev-help', organization: 'DEV example', goal: 'Test', coins: 1000, operatorCents: 100, month: '2026-11', mode: 'simulation', status: 'claimed', reservedAt: NOW, transferredAt: NOW, transferReference: 'DEV-SYMULACJA', reward: { id: 'reward1', islandId: 'island-1', claimedAt: NOW, expiresAt: NOW + 21600000, happinessPoints: 20, portIlluminated: true, mode: 'simulation' } }],
    funds: [['2026-11', { budgetCents: 5000, usedCents: 100, transferredCents: 100 }]] };
  const restored = reload(state);
  assert.deepEqual(restored.charitySimulation, state.charitySimulation);
  assert.equal(restored.charityReward, null);
  state.charitySimulation.donations[0].mode = 'real';
  assert.equal(reload(state).charitySimulation.donations.length, 0);
});
