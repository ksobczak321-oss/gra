import assert from 'node:assert/strict';
import test from 'node:test';
import { createCharityPreviewAdapter, charityHappinessBonus, charityPortIlluminated } from '../harborlight-v1-charity.js';
import { residentHappiness, nextResidentEvent } from '../harborlight-v1-residents.js';
import { activeEffects } from '../harborlight-v1-effects.js';

const NOW = Date.parse('2026-10-31T12:00:00Z');
const initial = () => ({ worldTimeMs: NOW, lastSimulatedAt: NOW, population: 1, capacity: 24, lighthouseRemaining: 0, resources: { coins: 100, food: 100, wood: 100, grain: 100 },
  buildings: { townhall: { level: 4 }, house: { level: 1 }, chapel: { level: 1 }, warehouse: { level: 1 } },
  residents: [{ id: 1, happiness: 25, hungerSeconds: 0, unemployedSeconds: 0, newbornRemaining: 0, arrivalRemaining: 0, returnRemaining: 0, visitHappinessRemaining: 0, workplace: null }], leisure: { effects: [] } });
function fixture() { const state = initial(); let at = NOW; const changes = []; const adapter = createCharityPreviewAdapter({ environment: 'development', getState: () => state, now: () => at, onMutation: result => { changes.push(result); } }); return { state, adapter, changes, time: value => { at = value; state.worldTimeMs = value; } }; }

test('preview requires explicitDEV and classifies historical and ordinary income as unqualified', async () => {
  assert.throws(() => createCharityPreviewAdapter({ environment: 'production', getState: initial }), /DEV/);
  const f = fixture(); assert.equal((await f.adapter.status()).qualifiedCoins, 0);
  f.state.resources.coins += 1000; assert.equal((await f.adapter.status()).qualifiedCoins, 0);
  await f.adapter.creditTestCoins(); assert.equal((await f.adapter.status()).qualifiedCoins, 1000);
  f.state.resources.coins -= 200; const status = await f.adapter.status(); assert.equal(status.qualifiedCoins, 800); assert.equal(status.unqualifiedCoins, 1100);
});

test('DEV donation cannot grant an effect before explicitsimulated transfer confirmation, and replay never duplicates', async () => {
  const f = fixture(); await f.adapter.creditTestCoins(); const donation = await f.adapter.donate({ requestId: 'donation123' });
  assert.equal(donation.donation.mode, 'simulation'); assert.equal(f.state.resources.coins, 100);
  assert.equal((await f.adapter.donate({ requestId: 'donation123' })).alreadyApplied, true);
  await assert.rejects(f.adapter.claimReward({ donationId: donation.donation.id }), error => error.code === 'charity-reward-awaits-transfer');
  await f.adapter.confirmTestTransfer({ donationId: donation.donation.id }); await f.adapter.claimReward({ donationId: donation.donation.id });
  assert.equal(charityHappinessBonus(f.state), 20); assert.equal(charityPortIlluminated(f.state), true); assert.equal(residentHappiness(f.state, f.state.residents[0]), 45);
  assert.equal(nextResidentEvent(f.state), 6 * 3600);
  const effect = activeEffects(f.state).find(row => row.id === 'charity-gratitude'); assert.equal(effect.amount, 20); assert.equal(effect.remaining, 21600);
  f.time(NOW + 3600000); const replay = await f.adapter.claimReward({ donationId: donation.donation.id }); assert.equal(replay.alreadyApplied, true); assert.equal(replay.reward.expiresAt, NOW + 21600000);
  f.time(NOW + 21600000); assert.equal(charityHappinessBonus(f.state), 0); assert.equal(charityPortIlluminated(f.state), false); assert.equal(residentHappiness(f.state, f.state.residents[0]), 25); assert.equal(activeEffects(f.state).some(row => row.id === 'charity-gratitude'), false);
});

test('Lighthouse100 and ordinaryhappinesscap retain priority over charity', () => {
  const state = initial(); state.charityReward = { happinessPoints: 20, expiresAt: NOW + 3600000 };
  state.residents[0].happiness = 95; assert.equal(residentHappiness(state, state.residents[0]), 100);
  state.residents[0].happiness = -40; state.lighthouseRemaining = 3600; assert.equal(residentHappiness(state, state.residents[0]), 100);
});

test('secondDEV donation respects accountmonth/rollinglimit even withanother1000testcoins', async () => {
  const f = fixture(); await f.adapter.creditTestCoins(); await f.adapter.donate({ requestId: 'donation123' }); await f.adapter.creditTestCoins();
  await assert.rejects(f.adapter.donate({ requestId: 'donation456' }), error => error.code === 'charity-account-limit'); assert.equal(f.state.resources.coins, 1100);
});

test('concurrent preview requests cannot reserve twice or consume an extra1000coins', async () => {
  const f = fixture(); await f.adapter.creditTestCoins(); await f.adapter.creditTestCoins();
  const results = await Promise.allSettled([f.adapter.donate({ requestId: 'parallel123' }), f.adapter.donate({ requestId: 'parallel456' })]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(f.state.resources.coins, 1100);
  assert.equal((await f.adapter.status()).campaign.availableCents, 4900);
});

test('late preview rewards retain their entitlement but cannot be claimed less than30days apart', async () => {
  const f = fixture(); await f.adapter.creditTestCoins(); const first = await f.adapter.donate({ requestId: 'donation123' });
  await f.adapter.confirmTestTransfer({ donationId: first.donation.id });
  f.time(NOW + 30 * 86400000); await f.adapter.creditTestCoins(); const second = await f.adapter.donate({ requestId: 'donation456' }); await f.adapter.confirmTestTransfer({ donationId: second.donation.id });
  await f.adapter.claimReward({ donationId: first.donation.id }); f.time(NOW + 31 * 86400000);
  await assert.rejects(f.adapter.claimReward({ donationId: second.donation.id }), error => error.code === 'charity-reward-cooldown');
  f.time(NOW + 60 * 86400000); assert.equal((await f.adapter.claimReward({ donationId: second.donation.id })).alreadyApplied, false);
});
