// Real funding/issuance/transfer verification is injected by trusted server code.
// None of those methods belongs on a player-facing route. DEV uses separate,
// explicitly simulated campaigns and never creates a real monetary obligation.
import { createHash } from 'node:crypto';
import { AccountServiceError } from './account-service.mjs';
import { createIslandDocumentStore, worldSnapshot } from './island-document-store.mjs';
import { createCharityLedgerStore, coinTotalFromIslandDocument, coinRound, normalizedWallet, walletPath } from './charity-ledger.mjs';

const DAY = 86400000, HOUR = 3600000;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = (code, status = 409) => { throw new AccountServiceError(code, status); };
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(value) ? value : fail('charity-invalid-request', 400);
const monthFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit' });
export function charityMonth(at) {
  const parts = Object.fromEntries(monthFormatter.formatToParts(new Date(at)).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}`;
}
const campaignPath = month => /^\d{4}-(?:0[1-9]|1[0-2])$/.test(month) ? `charityCampaigns/${month}` : fail('charity-invalid-campaign', 400);
const donationPath = id => /^charity_[a-f0-9]{40}$/.test(id) ? `charityDonations/${id}` : fail('charity-invalid-donation', 400);
const available = campaign => campaign?.active === true ? Math.max(0, campaign.budgetCents - campaign.reservedCents - campaign.transferredCents) : 0;
const publicDonation = value => value ? { id: value.id, month: value.month, status: value.status, mode: value.mode, reservedAt: value.reservedAt,
  transferredAt: value.transferredAt ?? null, transferReference: value.transferReference ?? null, reward: value.reward ?? null, islandId: value.islandId } : null;
const qualifiedSources = new Set(['tax-base', 'free-task']);

export function createCharityService({ store: baseStore, environment = 'production', simulation = false, now = () => Date.now(), verifyCredit = null, verifyFunding = null, verifyTransfer = null } = {}) {
  if (simulation && environment !== 'development') throw new TypeError('Charity simulation is restricted to local development.');
  const store = createCharityLedgerStore(createIslandDocumentStore(baseStore), { now });
  const mode = simulation ? 'simulation' : 'real';
  const time = () => { const at = now(); if (!Number.isSafeInteger(at) || at < 0) fail('invalid-server-clock', 500); return at; };
  const requireUid = uid => { walletPath(uid); return uid; };
  async function readWallet(tx, uid, at) {
    const island = await tx.get(`islands/${uid}`);
    if (!island || !Number.isSafeInteger(island.revision) || island.revision < 1) fail('charity-island-unavailable');
    const state = JSON.parse(island.payload), wallet = normalizedWallet(await tx.get(walletPath(uid)), coinTotalFromIslandDocument(island), at);
    return { island, state, wallet };
  }
  const islandChanged = (island, state, at) => ({ ...island, payload: JSON.stringify(state), revision: island.revision + 1, updatedAt: at });
  async function writeWalletAndIsland(tx, uid, wallet, island, state, at) {
    wallet.revision += 1; wallet.updatedAt = at;
    await tx.set(walletPath(uid), wallet);
    await tx.set(`islands/${uid}`, islandChanged(island, state, at));
  }
  function chooseWorld(state, islandId) {
    if (typeof islandId !== 'string' || !/^island-(?:[1-9]|1[0-9]|20)$/.test(islandId)) fail('charity-invalid-island', 400);
    const world = worldSnapshot(state, islandId);
    if (!world?.resources || !world.buildings) fail('charity-invalid-island', 400);
    return world;
  }
  async function status({ uid }) {
    requireUid(uid); const at = time(), month = charityMonth(at);
    return store.runTransaction(async tx => {
      const { wallet } = await readWallet(tx, uid, at), campaign = await tx.get(campaignPath(month));
      const ids = Array.isArray(wallet.charityDonationIds) ? wallet.charityDonationIds : [];
      const donations = await Promise.all(ids.map(id => tx.get(donationPath(id))));
      const last = wallet.lastDonation;
      return { mode, month, qualifiedCoins: wallet.qualified, unqualifiedCoins: wallet.unqualified,
        campaign: campaign ? { organization: campaign.organization, goal: campaign.goal, mode: campaign.mode, active: campaign.active,
          budgetCents: campaign.budgetCents, availableCents: available(campaign), transferredCents: campaign.transferredCents } : null,
        eligible: !!campaign && campaign.mode === mode && available(campaign) >= 100 && wallet.qualified >= 1000 && (!last || last.month !== month && at - last.at >= 30 * DAY),
        nextDonationAt: last ? last.at + 30 * DAY : null, monthUsed: last?.month === month, donations: donations.filter(Boolean).map(publicDonation),
        rules: { coins: 1000, operatorCents: 100, maximumMonthlyFundCents: 5000, happinessPoints: 20, happinessHours: 6, spendOrder: 'qualified-first' } };
    });
  }

  // Server-only: the verifier reads an immutable tax/task/provider event. The
  // request cannot select the source, amount or qualification itself.
  async function recordVerifiedCredit({ uid, eventId, islandId = 'island-1' }) {
    requireUid(uid); validId(eventId);
    if (typeof verifyCredit !== 'function') fail('charity-trusted-issuer-unavailable', 503);
    const verified = await verifyCredit({ uid, eventId });
    if (!verified || !Number.isFinite(verified.amount) || verified.amount <= 0 || verified.amount > Number.MAX_SAFE_INTEGER || typeof verified.source !== 'string') fail('charity-credit-unverified', 403);
    const credit = { amount: coinRound(verified.amount), source: verified.source, qualified: qualifiedSources.has(verified.source) && verified.paidMultiplier !== true && verified.simulated !== true };
    const at = time(), eventKey = `${walletPath(uid)}/events/credit_${digest(eventId).slice(0, 40)}`;
    return store.runTransaction(async tx => {
      const previous = await tx.get(eventKey), { island, state, wallet } = await readWallet(tx, uid, at);
      if (previous) {
        if (previous.fingerprint !== digest({ credit, islandId })) fail('charity-request-reused');
        return { alreadyApplied: true, amount: previous.amount, qualified: previous.qualified };
      }
      const world = chooseWorld(state, islandId);
      if (world.resources.coins + credit.amount > Number.MAX_SAFE_INTEGER || wallet.qualified + wallet.unqualified + credit.amount > Number.MAX_SAFE_INTEGER) fail('charity-invalid-wallet');
      world.resources.coins = coinRound(world.resources.coins + credit.amount);
      wallet[credit.qualified ? 'qualified' : 'unqualified'] = coinRound(wallet[credit.qualified ? 'qualified' : 'unqualified'] + credit.amount);
      await tx.set(eventKey, { amount: credit.amount, qualified: credit.qualified, source: credit.source, fingerprint: digest({ credit, islandId }), at, mode });
      await writeWalletAndIsland(tx, uid, wallet, island, state, at);
      return { alreadyApplied: false, amount: credit.amount, qualified: credit.qualified };
    });
  }

  // Server/operator-only. Real campaigns cannot be funded by player JSON.
  async function configureCampaign({ month = charityMonth(time()), fundingEventId, organization, goal, prefundedCents, previousMarginCents = null, pilot = false } = {}) {
    let funding;
    if (simulation) funding = { organization, goal, prefundedCents, previousMarginCents, pilot };
    else {
      if (typeof verifyFunding !== 'function') fail('charity-funding-unverified', 503);
      funding = await verifyFunding({ month, fundingEventId: validId(fundingEventId) });
    }
    if (!funding || typeof funding.pilot !== 'boolean' || typeof funding.organization !== 'string' || funding.organization.trim().length < 2 || funding.organization.length > 160 || typeof funding.goal !== 'string' || funding.goal.trim().length < 2 || funding.goal.length > 500 || !Number.isSafeInteger(funding.prefundedCents) || funding.prefundedCents < 0 || funding.prefundedCents > Number.MAX_SAFE_INTEGER) fail('charity-invalid-funding', 400);
    if (!funding.pilot && (!Number.isSafeInteger(funding.previousMarginCents) || funding.previousMarginCents < 0)) fail('charity-invalid-funding', 400);
    const cap = Math.min(5000, funding.prefundedCents, funding.pilot ? 5000 : Math.floor(funding.previousMarginCents / 20));
    const budgetCents = Math.floor(cap / 100) * 100, at = time(), key = campaignPath(month);
    return store.runTransaction(async tx => {
      const previous = await tx.get(key);
      if (previous && (previous.reservedCents > 0 || previous.transferredCents > 0)) fail('charity-campaign-already-used');
      const campaign = { month, mode, organization: funding.organization.trim(), goal: funding.goal.trim(), budgetCents,
        reservedCents: 0, transferredCents: 0, active: budgetCents >= 100, fundedAt: at, fundingEventId: simulation ? 'simulation' : fundingEventId };
      await tx.set(key, campaign); return campaign;
    });
  }

  async function donate({ uid, requestId, islandId = 'island-1' }) {
    requireUid(uid); validId(requestId); const at = time(), month = charityMonth(at), id = `charity_${digest({ uid, requestId }).slice(0, 40)}`;
    return store.runTransaction(async tx => {
      const previous = await tx.get(donationPath(id)), { island, state, wallet } = await readWallet(tx, uid, at), campaign = await tx.get(campaignPath(month));
      if (previous) {
        if (previous.islandId !== islandId || previous.mode !== mode) fail('charity-request-reused');
        return { donation: publicDonation(previous), alreadyApplied: true };
      }
      const world = chooseWorld(state, islandId), last = wallet.lastDonation;
      if (!campaign || campaign.mode !== mode || !campaign.active) fail('charity-campaign-unavailable');
      if (available(campaign) < 100) fail('charity-fund-exhausted');
      if (last && (last.month === month || at - last.at < 30 * DAY)) fail('charity-account-limit');
      if (wallet.qualified < 1000) fail('charity-insufficient-qualified-coins');
      if (world.resources.coins < 1000) fail('charity-insufficient-island-coins');
      if ((wallet.charityDonationIds?.length ?? 0) >= 1200) fail('charity-history-limit');
      wallet.qualified = coinRound(wallet.qualified - 1000);
      world.resources.coins = coinRound(world.resources.coins - 1000);
      campaign.reservedCents += 100;
      const donation = { id, uid, month, islandId, mode, status: 'reserved', coins: 1000, operatorCents: 100,
        reservedAt: at, generation: island.generation ?? 1, transferredAt: null, reward: null };
      wallet.lastDonation = { id, month, at }; wallet.charityDonationIds = [...(wallet.charityDonationIds || []), id];
      await tx.set(campaignPath(month), campaign); await tx.set(donationPath(id), donation);
      await writeWalletAndIsland(tx, uid, wallet, island, state, at);
      return { donation: publicDonation(donation), alreadyApplied: false };
    });
  }

  // Server/operator-only; no `verified:true` or amount from the browser.
  async function confirmTransfer({ donationId, transferEventId }) {
    donationPath(donationId); validId(transferEventId);
    if (typeof verifyTransfer !== 'function') fail('charity-transfer-unverified', 503);
    const proof = await verifyTransfer({ donationId, transferEventId, mode });
    if (!proof || proof.donationId !== donationId || proof.amountCents !== 100 || proof.mode !== mode || typeof proof.reference !== 'string' || !/^[A-Za-z0-9_-]{3,100}$/.test(proof.reference)) fail('charity-transfer-unverified', 403);
    const at = time();
    return store.runTransaction(async tx => {
      const donation = await tx.get(donationPath(donationId));
      if (!donation || donation.mode !== mode) fail('charity-donation-not-found', 404);
      const campaign = await tx.get(campaignPath(donation.month));
      if (donation.status === 'transferred' || donation.status === 'claimed') return { donation: publicDonation(donation), alreadyApplied: true };
      if (donation.status !== 'reserved' || !campaign || campaign.reservedCents < 100) fail('charity-donation-closed');
      campaign.reservedCents -= 100; campaign.transferredCents += 100;
      donation.status = 'transferred'; donation.transferredAt = at; donation.transferReference = proof.reference;
      await tx.set(campaignPath(donation.month), campaign); await tx.set(donationPath(donationId), donation);
      return { donation: publicDonation(donation), alreadyApplied: false };
    });
  }

  async function claimReward({ uid, donationId, islandId = 'island-1' }) {
    requireUid(uid); donationPath(donationId); const at = time();
    return store.runTransaction(async tx => {
      const donation = await tx.get(donationPath(donationId)), { island, state, wallet } = await readWallet(tx, uid, at);
      if (!donation || donation.uid !== uid || donation.mode !== mode) fail('charity-donation-not-found', 404);
      if (donation.status === 'claimed') return { donation: publicDonation(donation), reward: donation.reward, alreadyApplied: true };
      if (donation.status !== 'transferred') fail('charity-reward-awaits-transfer');
      if (donation.generation !== (island.generation ?? 1)) fail('charity-world-changed');
      if (wallet.lastCharityRewardAt && at - wallet.lastCharityRewardAt < 30 * DAY) fail('charity-reward-cooldown');
      const world = chooseWorld(state, islandId);
      if (world.charityReward?.expiresAt > at) fail('charity-reward-already-active');
      const reward = { id: donation.id, islandId, generation: island.generation ?? 1, claimedAt: at, expiresAt: at + 6 * HOUR,
        happinessPoints: 20, portIlluminated: true, mode };
      world.charityReward = reward; donation.reward = reward; donation.status = 'claimed'; wallet.lastCharityRewardAt = at;
      await tx.set(donationPath(donationId), donation); await writeWalletAndIsland(tx, uid, wallet, island, state, at);
      return { donation: publicDonation(donation), reward, alreadyApplied: false };
    });
  }

  // A failed/unperformed payment restores exactly the original qualified coins
  // once. Frequency eligibility remains consumed, preventing cancel/retry abuse.
  async function cancelReservation({ donationId }) {
    donationPath(donationId); const at = time();
    return store.runTransaction(async tx => {
      const donation = await tx.get(donationPath(donationId));
      if (!donation || donation.mode !== mode) fail('charity-donation-not-found', 404);
      const { island, state, wallet } = await readWallet(tx, donation.uid, at), campaign = await tx.get(campaignPath(donation.month));
      if (donation.status === 'cancelled') return { donation: publicDonation(donation), alreadyApplied: true };
      if (donation.status !== 'reserved' || !campaign || campaign.reservedCents < 100) fail('charity-donation-closed');
      if (donation.generation !== (island.generation ?? 1)) fail('charity-world-changed');
      const world = chooseWorld(state, donation.islandId);
      world.resources.coins = coinRound(world.resources.coins + 1000); wallet.qualified = coinRound(wallet.qualified + 1000);
      campaign.reservedCents -= 100; donation.status = 'cancelled'; donation.cancelledAt = at;
      await tx.set(campaignPath(donation.month), campaign); await tx.set(donationPath(donationId), donation);
      await writeWalletAndIsland(tx, donation.uid, wallet, island, state, at);
      return { donation: publicDonation(donation), alreadyApplied: false };
    });
  }
  return { status, recordVerifiedCredit, configureCampaign, donate, confirmTransfer, claimReward, cancelReservation };
}
