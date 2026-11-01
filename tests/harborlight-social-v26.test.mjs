import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommunityClient, createLocalCommunityClient } from '../harborlight-v1-community-client.js';
import { CHARITY_DEMO_BENEFICIARIES, createCharityPreviewAdapter, charityHappinessBonus } from '../harborlight-v1-charity.js';

const HOUR = 3600000, DAY = 86400000, NOW = Date.parse('2026-11-01T12:15:00Z');
const world = () => ({ resources: { coins: 100 }, buildings: {} });
function charity(options = {}) {
  const state = world(); let at = NOW;
  const adapter = createCharityPreviewAdapter({ environment: 'development', getState: () => state, now: () => at, ...options });
  return { adapter, state, advance: value => { at = value; } };
}

test('ranking captures the actual player score once per hour and refreshes at the hour boundary', async () => {
  let at = NOW, score = 1800, reads = 0;
  const client = createLocalCommunityClient({ now: () => at, getRankingPoints: () => { reads++; return score; }, getPlayerName: () => 'Moja Wyspa' });
  assert.equal(client.rankingPosition(), null);
  const first = await client.snapshot();
  assert.equal(first.ranking.mode, 'simulation');
  assert.equal(first.ranking.updatedAt, Date.parse('2026-11-01T12:00:00Z'));
  assert.equal(first.ranking.nextUpdateAt, Date.parse('2026-11-01T13:00:00Z'));
  assert.equal(first.ranking.players.find(row => row.isSelf).name, 'Moja Wyspa');
  assert.equal(client.rankingPosition(), 2);
  score = 9000; at = first.ranking.nextUpdateAt - 1;
  assert.equal((await client.snapshot()).ranking.players.find(row => row.isSelf).score, 1800);
  assert.equal(reads, 1);
  at++; assert.equal((await client.snapshot()).ranking.selfPosition, 1);
  assert.equal(client.rankingPosition(), 1); assert.equal(reads, 2);
});

test('tied ranking scores share a place, and identity changes preserve account-specific scores', async () => {
  const client = createLocalCommunityClient({ now: () => NOW, getRankingPoints: () => 2400 });
  const initial = await client.snapshot();
  assert.deepEqual(initial.ranking.players.map(row => row.position), [1, 1, 3]);
  client.setIdentity('demo_3'); assert.equal(client.rankingPosition(), 3);
  const other = await client.snapshot();
  assert.equal(other.ranking.players.find(row => row.isSelf).score, 1200);
  assert.equal(other.ranking.players.filter(row => row.isSelf).length, 1);
});

test('authenticated client never invents missing ranking data or accepts demonstration positions as real', async () => {
  let response = { self: { id: 'real' } };
  const client = createCommunityClient({ load: async () => response, send: async () => ({}) });
  assert.equal((await client.snapshot()).ranking, undefined); assert.equal(client.rankingPosition(), null);
  response = { self: { id: 'real' }, ranking: { mode: 'real', players: [{ id: 'real', position: 7, score: 50 }] } };
  await client.snapshot(); assert.equal(client.rankingPosition(), 7);
  response.ranking.mode = 'simulation'; await client.snapshot(); assert.equal(client.rankingPosition(), null);
});

test('local league standings are explicitly examples and cannot grant real seasonal rewards', async () => {
  const client = createLocalCommunityClient({ now: () => NOW });
  const league = await client.request('leagueRead');
  assert.equal(league.mode, 'simulation'); assert.equal(league.groups[0].length, 4);
  assert.equal(league.registered, false);
  assert.deepEqual(league.rewards, { playedDays: 0, goals: 0 });
  await assert.rejects(client.request('leagueEnroll'), error => error.code === 'league-demo-practice-only');
  await assert.rejects(client.request('leagueClaimRewards'), error => error.code === 'community-unknown-command');
});

test('charity recipient selection is recorded once and cannot be altered by reusing a receipt', async () => {
  const f = charity(), beneficiaries = (await f.adapter.status()).campaign.beneficiaries;
  assert.equal(beneficiaries.length, 3); assert.equal(Object.isFrozen(CHARITY_DEMO_BENEFICIARIES), true);
  await f.adapter.creditTestCoins();
  const result = await f.adapter.donate({ requestId: 'beneficiary_123', beneficiaryId: 'dev-animals' });
  assert.equal(result.donation.beneficiaryId, 'dev-animals'); assert.match(result.donation.organization, /Przykład DEV/);
  const replay = await f.adapter.donate({ requestId: 'beneficiary_123', beneficiaryId: 'dev-animals' });
  assert.equal(replay.alreadyApplied, true); assert.equal(f.state.resources.coins, 100);
  await assert.rejects(f.adapter.donate({ requestId: 'beneficiary_123', beneficiaryId: 'dev-nature' }), error => error.code === 'charity-request-reused');
  await assert.rejects(f.adapter.donate({ requestId: 'another_12345', beneficiaryId: 'invented' }), error => error.code === 'charity-beneficiary-unavailable');
});

test('switching recipients or islands does not reset the shared account limit or fund', async () => {
  const f = charity(); f.state.archipelago = { version: 2, islands: { 'island-2': world() } };
  await f.adapter.creditTestCoins(); await f.adapter.creditTestCoins({ islandId: 'island-2' });
  const first = await f.adapter.donate({ requestId: 'shared_12345', beneficiaryId: 'dev-children' });
  await assert.rejects(f.adapter.donate({ requestId: 'shared_45678', islandId: 'island-2', beneficiaryId: 'dev-nature' }), error => error.code === 'charity-account-limit');
  let status = await f.adapter.status();
  assert.equal(status.campaign.availableCents, 4900); assert.equal(status.campaign.reservedCents, 100); assert.equal(status.campaign.transferredCents, 0);
  await f.adapter.confirmTestTransfer({ donationId: first.donation.id }); status = await f.adapter.status();
  assert.equal(status.campaign.availableCents, 4900); assert.equal(status.campaign.reservedCents, 0); assert.equal(status.campaign.transferredCents, 100);
});

test('post-pilot preview fund applies five percent of actual configured margin, prefunding and the PLN50 ceiling', async () => {
  const cases = [
    [{ pilot: false, prefundedCents: 5000, previousMarginCents: 40000 }, 2000],
    [{ pilot: false, prefundedCents: 700, previousMarginCents: 40000 }, 700],
    [{ pilot: false, prefundedCents: 9000, previousMarginCents: 300000 }, 5000],
    [{ pilot: false, prefundedCents: 5000, previousMarginCents: 1999 }, 0],
    [{ pilot: false, prefundedCents: 5000, previousMarginCents: null }, 0]
  ];
  for (const [funding, expected] of cases) assert.equal((await charity({ funding }).adapter.status()).campaign.budgetCents, expected);
  const f = charity({ funding: { pilot: false, prefundedCents: 5000, previousMarginCents: 0 } });
  await f.adapter.creditTestCoins();
  await assert.rejects(f.adapter.donate({ requestId: 'zero_fund_123' }), error => error.code === 'charity-fund-exhausted');
  assert.equal(f.state.resources.coins, 1100);
});

test('recipient receipt survives transfer and reward, with unchanged earned-only accounting and six-hour effect', async () => {
  const f = charity(); f.state.resources.coins += 2000; // Bought/traded/unknown income never qualifies.
  assert.equal((await f.adapter.status()).qualifiedCoins, 0);
  await f.adapter.creditTestCoins();
  const result = await f.adapter.donate({ requestId: 'reward_12345', beneficiaryId: 'dev-nature' });
  assert.equal(charityHappinessBonus(f.state, NOW), 0);
  await f.adapter.confirmTestTransfer({ donationId: result.donation.id });
  const claimed = await f.adapter.claimReward({ donationId: result.donation.id });
  assert.equal(claimed.donation.beneficiaryId, 'dev-nature'); assert.equal(charityHappinessBonus(f.state, NOW), 20);
  assert.equal(charityHappinessBonus(f.state, NOW + 6 * HOUR), 0);
  f.advance(NOW + DAY); assert.equal((await f.adapter.status()).eligible, false);
  assert.equal((await f.adapter.status()).unqualifiedCoins, 2100);
});
