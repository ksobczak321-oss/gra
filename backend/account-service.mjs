// Account-level operations use a transaction adapter supplied by the server.
// No default in-memory production store and no external calls are made here.
// Payload economy remains the current client-calculated model; provider payment
// verification is deliberately outside this service and cannot be faked by it.
import { createCharityLedgerStore } from './charity-ledger.mjs';
import { createIslandDocumentStore, MAX_ARCHIPELAGO_BYTES } from './island-document-store.mjs';
const DAY = 86400000;
const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const RESOURCES = ['coins', ...MATERIALS];
const MAX_PAYLOAD_BYTES = MAX_ARCHIPELAGO_BYTES;
const PREPROD_USERS = ['dev-admin1', 'dev-admin2', 'dev-admin3'];
const warsaw = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const parts = time => Object.fromEntries(warsaw.formatToParts(new Date(time)).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const ACCOUNT_PROGRESS_FIELDS = ['commerce', 'loyalty', 'socialRewards', 'referrals', 'engagementSchedule', 'welcome'];
export const LEGAL_DOCUMENT_VERSIONS = Object.freeze({ termsVersion: '2026-10-31-draft3', privacyVersion: '2026-10-31-draft3' });
const acceptedLegal = account => account?.legalAcceptance?.termsVersion === LEGAL_DOCUMENT_VERSIONS.termsVersion &&
  account?.legalAcceptance?.privacyVersion === LEGAL_DOCUMENT_VERSIONS.privacyVersion && Number.isSafeInteger(account?.legalAcceptance?.acceptedAt);

function captureAccountProgress(state, previous = {}) {
  const progress = object(previous) ? structuredClone(previous) : {};
  for (const field of ACCOUNT_PROGRESS_FIELDS) if (object(state[field])) progress[field] = structuredClone(state[field]);
  // Welcome protection belongs to the first world, not every recreated world.
  // A legacy world without a welcome anchor must not receive a fresh 72 hours.
  if (!object(progress.welcome)) progress.welcome = { startedAt: 0, until: 0 };
  if (object(progress.loyalty) && state.buildings?.townhall?.level >= 4) {
    progress.loyalty.closed = true; progress.loyalty.closedReason = 'townhall-level-4';
  }
  if (object(progress.commerce)) {
    progress.commerce.ad = null;
    for (const checkout of Array.isArray(progress.commerce.checkouts) ? progress.commerce.checkouts : []) if (object(checkout) && checkout.status === 'pending') checkout.status = 'cancelled';
  }
  const schedule = progress.engagementSchedule;
  if (object(schedule?.pending) && schedule.pending.started === true) {
    // An interrupted world cannot continue its old expedition/ad. Treat it as
    // finished without paying a reward and retain the account's next window.
    if (schedule.pending.kind === 'initial-ad') { schedule.initialCompleted = true; schedule.initialAnchored = true; }
    else schedule.completedChoices = (nonnegative(schedule.completedChoices) ? schedule.completedChoices : 0) + 1;
    let seed = schedule.seed >>> 0 || 0x56c39ab1;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    schedule.seed = seed >>> 0 || 1;
    const [minimum, maximum] = !schedule.completedChoices ? [300, 900] : schedule.completedChoices === 1 ? [2580, 3720] : [3600, 6000];
    schedule.nextAt = (Number.isFinite(schedule.activeSeconds) ? Math.max(0, schedule.activeSeconds) : 0) + minimum + Math.floor(schedule.seed / 0x100000000 * (maximum - minimum + 1));
    schedule.pending = null;
  }
  return progress;
}

export class AccountServiceError extends Error {
  constructor(code, status = 400) { super(code); this.name = 'AccountServiceError'; this.code = code; this.status = status; }
}
const fail = (code, status) => { throw new AccountServiceError(code, status); };
const uidValue = uid => typeof uid === 'string' && /^[A-Za-z0-9:_-]{1,128}$/.test(uid) ? uid : fail('invalid-account', 400);
const generationValue = value => positive(value) ? value : fail('invalid-generation', 400);
const accountPath = uid => `accounts/${uidValue(uid)}`;
const islandPath = uid => `islands/${uidValue(uid)}`;
const currentGeneration = account => positive(account?.islandGeneration) ? account.islandGeneration : 1;
function clockValue(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 8640000000000000) fail('invalid-server-clock', 500);
  return value;
}
function islandPayload(value) {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > MAX_PAYLOAD_BYTES) fail('invalid-island', 400);
  let state;
  try { state = JSON.parse(value); } catch { fail('invalid-island', 400); }
  if (!object(state) || !object(state.resources) || RESOURCES.some(id => !Number.isFinite(state.resources[id]) || state.resources[id] < 0 || state.resources[id] > Number.MAX_SAFE_INTEGER)) fail('invalid-island', 400);
  if (state.archipelago !== undefined) {
    const group = state.archipelago;
    const idOK = id => /^island-(?:[1-9]|1[0-9]|20)$/.test(id);
    if (!object(group) || ![1,2].includes(group.version) || !idOK(group.activeIslandId) || !positive(group.shipCapacity) || group.shipCapacity < 1000 || !Array.isArray(group.transfers) || group.transfers.length > 1000 || !Array.isArray(group.capacityReceipts) || group.capacityReceipts.length > 10000) fail('invalid-island', 400);
    const children = group.version === 1 ? (group.secondIsland === null ? {} : { 'island-2': group.secondIsland }) : group.islands;
    if (!object(children) || Object.keys(children).length > 19 || Object.keys(children).some(id => !idOK(id) || id === 'island-1')) fail('invalid-island', 400);
    const ids = Object.keys(children).sort((a,b) => Number(a.slice(7))-Number(b.slice(7)));
    if (ids.some((id,index) => id !== `island-${index+2}`)) fail('invalid-island', 400);
    for (const second of Object.values(children)) {
      if (!object(second) || second.archipelago !== undefined || !object(second.resources) || RESOURCES.some(id => !Number.isFinite(second.resources[id]) || second.resources[id] < 0 || second.resources[id] > Number.MAX_SAFE_INTEGER) || !object(second.buildings)) fail('invalid-island', 400);
      if (!Number.isSafeInteger(second.version) || second.version < 1 || second.version > 9 || !nonnegative(second.population) || !Number.isFinite(second.lastSimulatedAt) || second.lastSimulatedAt < 0 ||
        ['house','farm','sawmill','quarry','dock','warehouse','lighthouse','lumber','windmill','townhall','chapel','market'].some(id => !object(second.buildings[id]) || !nonnegative(second.buildings[id].level) || second.buildings[id].level > 100 || id === 'townhall' && second.buildings[id].level < 1)) fail('invalid-island', 400);
    }
    if (group.activeIslandId !== 'island-1' && !children[group.activeIslandId]) fail('invalid-island', 400);
  }
  return state;
}
function rewardValue(value) {
  if (!object(value) || Object.keys(value).some(id => !RESOURCES.includes(id)) || RESOURCES.some(id => value[id] !== undefined && !nonnegative(value[id]))) fail('invalid-promotion-reward', 500);
  const reward = Object.fromEntries(RESOURCES.filter(id => value[id] > 0).map(id => [id, value[id]]));
  if (!Object.keys(reward).length) fail('invalid-promotion-reward', 500);
  return reward;
}

// Calendar months preserve Warsaw wall time, including DST, and clamp the day
// to the last existing date (e.g. 31 August + 3 months -> 30 November).
export function threeMonthDeadline(lastPlayedAt) {
  const time = clockValue(lastPlayedAt), source = parts(time);
  const monthStart = new Date(Date.UTC(source.year, source.month - 1 + 3, 1));
  const year = monthStart.getUTCFullYear(), month = monthStart.getUTCMonth();
  const day = Math.min(source.day, new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  const target = Date.UTC(year, month, day, source.hour, source.minute, source.second, time % 1000);
  const wallTime = candidate => {
    const actual = parts(candidate);
    return Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second, candidate % 1000);
  };
  const offsets = [...new Set([-2 * DAY, 0, 2 * DAY].map(delta => wallTime(target + delta) - target - delta))];
  const candidates = offsets.map(offset => target - offset);
  const exact = candidates.filter(candidate => wallTime(candidate) === target);
  if (exact.length) return Math.min(...exact); // First occurrence of an autumn overlap.
  // A spring clock gap has no exact instant. Move forward by the gap rather
  // than expiring an account an hour before its requested wall time.
  return candidates.filter(candidate => wallTime(candidate) > target).sort((a, b) => wallTime(a) - wallTime(b) || a - b)[0];
}

export function createAccountService({ store, now = () => Date.now(), environment = 'production', exemptUids = environment === 'production' ? [] : PREPROD_USERS } = {}) {
  if (!store || typeof store.runTransaction !== 'function') throw new TypeError('A durable transactional account store is required.');
  store = createCharityLedgerStore(createIslandDocumentStore(store));
  const exempt = new Set(exemptUids);
  const expiredMutation = Symbol('expired-mutation');
  // Expiry must commit before the caller receives 410. Throwing from the
  // transaction callback would roll back the tombstone and preserve the world.
  const mutation = work => store.runTransaction(work).then(result => result === expiredMutation ? fail('island-expired', 410) : result);
  const serverTime = () => clockValue(now());
  const assertGeneration = (account, island, generation) => {
    if (generationValue(generation) !== currentGeneration(account) || island && (island.generation ?? 1) !== generation || account?.islandExpiredAt && !island) fail('island-expired', 410);
  };
  const canExpire = (uid, account, island, at) => !exempt.has(uid) && account && island && Number.isSafeInteger(account.lastPlayedAt) && at >= threeMonthDeadline(account.lastPlayedAt);
  const legalExempt = uid => environment !== 'production' && PREPROD_USERS.includes(uid);
  async function readLegalStatus({ uid }) {
    return store.runTransaction(async tx => {
      const account = await tx.get(accountPath(uid)), island = await tx.get(islandPath(uid));
      // Existing islands keep access. Mandatory registration admission applies
      // before creating a new world, not as a forced reset of an older account.
      return { ...LEGAL_DOCUMENT_VERSIONS, draft: true, required: !legalExempt(uid) && !island && !acceptedLegal(account),
        accepted: acceptedLegal(account), acceptance: acceptedLegal(account) ? account.legalAcceptance : null, existingIsland: !!island };
    });
  }
  async function acceptLegal({ uid, termsVersion, privacyVersion, termsAccepted, privacyAcknowledged }) {
    uidValue(uid);
    if (termsAccepted !== true || privacyAcknowledged !== true || termsVersion !== LEGAL_DOCUMENT_VERSIONS.termsVersion || privacyVersion !== LEGAL_DOCUMENT_VERSIONS.privacyVersion) fail('legal-required', 428);
    const at = serverTime(), key = accountPath(uid);
    return store.runTransaction(async tx => {
      const account = await tx.get(key);
      if (acceptedLegal(account)) return { ...account.legalAcceptance, alreadyAccepted: true };
      const receipt = { ...LEGAL_DOCUMENT_VERSIONS, uid, acceptedAt: at, privacyAcknowledgedAt: at, draft: true };
      await tx.set(key, { ...(account || {}), legalAcceptance: receipt });
      await tx.set(key + '/legalAcceptances/' + termsVersion + '_' + privacyVersion, receipt);
      return { ...receipt, alreadyAccepted: false };
    });
  }
  async function expireStored(tx, uid, account, island, at) {
    const key = accountPath(uid), previousGeneration = currentGeneration(account), generation = previousGeneration + 1;
    if (!positive(generation)) fail('generation-overflow', 500);
    await tx.set(`${key}/islandResets/${previousGeneration}`, { at, previousGeneration, generation, reason: 'three-months-inactive', lastPlayedAt: account.lastPlayedAt, refunds: false });
    const islandAccountProgress = captureAccountProgress(islandPayload(island.payload), account.islandAccountProgress);
    const next = { ...account, islandGeneration: generation, islandExpiredAt: at, islandAccountProgress };
    await tx.set(key, next); await tx.delete(islandPath(uid));
    return next;
  }

  async function readIsland({ uid }) {
    const at = serverTime();
    return store.runTransaction(async tx => {
      let account = await tx.get(accountPath(uid));
      const island = await tx.get(islandPath(uid));
      if (!account && island) {
        // Existing PRE-PROD saves predate account metadata. Introduce only the
        // server-owned generation/activity record; preserve the island bytes,
        // its revision and existing one-time rewards without replaying them.
        account = { islandGeneration: island.generation ?? 1, lastPlayedAt: at, islandExpiredAt: null, legacyMigratedAt: at };
        await tx.set(accountPath(uid), account);
      }
      if (canExpire(uid, account, island, at)) {
        const expired = await expireStored(tx, uid, account, island, at);
        return { account: { generation: expired.islandGeneration, expired: true, lastPlayedAt: expired.lastPlayedAt }, island: null };
      }
      const generation = currentGeneration(account);
      if (island && (island.generation ?? 1) !== generation) fail('island-expired', 410);
      const updatedAt = typeof island?.updatedAt === 'string' ? island.updatedAt : new Date(island?.updatedAt || 0).toISOString();
      return { account: { generation, expired: !!account?.islandExpiredAt && !island, lastPlayedAt: account?.lastPlayedAt ?? null },
        island: island ? { payload: island.payload, generation, version: { revision: island.revision, updateTime: updatedAt } } : null };
    });
  }

  async function recordActivity({ uid, generation }) {
    const at = serverTime(), key = accountPath(uid);
    return mutation(async tx => {
      const account = await tx.get(key), island = await tx.get(islandPath(uid));
      assertGeneration(account, island, generation);
      if (canExpire(uid, account, island, at)) { await expireStored(tx, uid, account, island, at); return expiredMutation; }
      const next = { ...(account || {}), islandGeneration: currentGeneration(account), lastPlayedAt: at };
      await tx.set(key, next);
      return { lastPlayedAt: at, expiresAt: threeMonthDeadline(at), generation: next.islandGeneration };
    });
  }

  // The HTTP adapter authenticates uid and passes the expected generation. This
  // is the only save path that can enforce account tombstones atomically.
  async function saveIsland({ uid, payload, expectedRevision, generation }) {
    const state = islandPayload(payload);
    if ((state.islandGeneration ?? 1) !== generation) fail('island-expired', 410);
    if (!nonnegative(expectedRevision) || expectedRevision >= Number.MAX_SAFE_INTEGER) fail('invalid-revision', 400);
    const at = serverTime(), key = islandPath(uid);
    return mutation(async tx => {
      const account = await tx.get(accountPath(uid)), island = await tx.get(key);
      assertGeneration(account, island, generation);
      if (canExpire(uid, account, island, at)) { await expireStored(tx, uid, account, island, at); return expiredMutation; }
      if (!account) fail('account-not-initialized', 409);
      // Accepting legal documents creates account metadata, not a world. Only
      // the trusted POST starter may create islands; PUT always updates one.
      if (!island) fail('island-not-initialized', 409);
      if ((island?.revision || 0) !== expectedRevision) fail('island-conflict', 409);
      if (!island && account.islandExpiredAt) fail('island-expired', 410);
      if (environment === 'production') {
        const trustedState = islandPayload(island.payload), trustedCommerce = trustedState.commerce;
        state.commerce = { ...(object(state.commerce) ? state.commerce : {}), receipts: trustedCommerce?.receipts || [],
          promoClaims: trustedCommerce?.promoClaims || {}, adReceipts: trustedCommerce?.adReceipts || [], ad: null };
        const trustedCapacity = positive(trustedState.archipelago?.shipCapacity) ? trustedState.archipelago.shipCapacity : 1000;
        if (state.archipelago?.shipCapacity > trustedCapacity) fail('unverified-ship-capacity', 409);
        if (state.archipelago) {
          state.archipelago.shipCapacity = trustedCapacity;
          state.archipelago.capacityReceipts = structuredClone(trustedState.archipelago?.capacityReceipts || []);
        }
      }
      const previousState = islandPayload(island.payload);
      const worlds = value => value.archipelago?.version === 2 ? value.archipelago.islands : value.archipelago?.secondIsland ? { 'island-2': value.archipelago.secondIsland } : {};
      const beforeIds = Object.keys(worlds(previousState)), afterIds = Object.keys(worlds(state));
      if (beforeIds.some(id => !afterIds.includes(id))) fail('archipelago-island-loss', 409);
      for (const id of afterIds.filter(id => !beforeIds.includes(id))) {
        const required = 10 + 3 * (Number(id.slice(7)) - 2);
        if ((previousState.buildings?.townhall?.level || 0) < required) fail('second-island-locked', 409);
      }
      const nextPayload = JSON.stringify(state);
      if (Buffer.byteLength(nextPayload, 'utf8') > MAX_PAYLOAD_BYTES) fail('invalid-island', 409);
      const next = { schemaVersion: 1, revision: expectedRevision + 1, generation, payload: nextPayload, updatedAt: at };
      await tx.set(key, next);
      return { revision: next.revision, generation, updatedAt: at };
    });
  }

  // Starter payload must be generated by the trusted server handler, rather
  // than forwarding a caller's arbitrary resources as a new-user package.
  async function startIsland({ uid, payload }) {
    const state = islandPayload(payload), at = serverTime(), key = islandPath(uid);
    return store.runTransaction(async tx => {
      const account = await tx.get(accountPath(uid)), island = await tx.get(key);
      if (island) fail('island-already-exists', 409);
      if (environment === 'production' && !acceptedLegal(account)) fail('legal-required', 428);
      const generation = currentGeneration(account);
      if (object(account?.islandAccountProgress)) for (const field of ACCOUNT_PROGRESS_FIELDS) {
        if (object(account.islandAccountProgress[field])) state[field] = structuredClone(account.islandAccountProgress[field]);
      }
      state.islandGeneration = generation;
      const nextPayload = JSON.stringify(state);
      if (Buffer.byteLength(nextPayload, 'utf8') > MAX_PAYLOAD_BYTES) fail('invalid-island', 409);
      const nextAccount = { ...(account || {}), islandGeneration: generation, islandExpiredAt: null, lastPlayedAt: at };
      await tx.set(accountPath(uid), nextAccount);
      await tx.set(key, { schemaVersion: 1, revision: 1, generation, payload: nextPayload, updatedAt: at });
      return { generation, revision: 1 };
    });
  }

  async function redeemCode({ uid, code, generation }) {
    if (typeof code !== 'string') fail('invalid-code', 400);
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,64}$/.test(normalized)) fail('invalid-code', 400);
    const at = serverTime(), claimKey = `${accountPath(uid)}/redemptions/${normalized}`;
    return mutation(async tx => {
      // All reads precede writes so the adapter can use Firestore transactions.
      const account = await tx.get(accountPath(uid)), island = await tx.get(islandPath(uid));
      const promotion = await tx.get(`promotions/${normalized}`), previous = await tx.get(claimKey);
      assertGeneration(account, island, generation);
      if (canExpire(uid, account, island, at)) { await expireStored(tx, uid, account, island, at); return expiredMutation; }
      if (previous) return { ...previous, alreadyRedeemed: true };
      if (!island) fail('island-not-found', 404);
      if (!promotion || promotion.enabled !== true) fail('invalid-code', 404);
      if (promotion.requiresFacebookLike === true) fail('unsupported-promotion-verification', 409);
      if (['startsAt', 'endsAt'].some(key => promotion[key] !== undefined && !nonnegative(promotion[key])) || promotion.startsAt !== undefined && promotion.endsAt !== undefined && promotion.startsAt >= promotion.endsAt) fail('invalid-promotion-period', 500);
      if (promotion.startsAt !== undefined && at < promotion.startsAt) fail('promotion-not-started', 409);
      if (promotion.endsAt !== undefined && at >= promotion.endsAt) fail('promotion-ended', 409);
      if (!positive(promotion.maxClaims) || !nonnegative(promotion.claimedCount || 0)) fail('invalid-promotion-limit', 500);
      const claimedCount = promotion.claimedCount || 0;
      if (claimedCount >= promotion.maxClaims) fail('promotion-exhausted', 409);
      if (!positive(island.revision) || island.revision >= Number.MAX_SAFE_INTEGER) fail('invalid-revision', 409);
      const reward = rewardValue(promotion.reward), state = islandPayload(island.payload);
      state.bonusMaterials = object(state.bonusMaterials) ? { ...state.bonusMaterials } : {};
      for (const [id, amount] of Object.entries(reward)) {
        if (state.resources[id] + amount > Number.MAX_SAFE_INTEGER) fail('inventory-overflow', 409);
        const previousBonus = Number.isFinite(state.bonusMaterials[id]) ? Math.max(0, Math.min(state.resources[id], state.bonusMaterials[id])) : 0;
        state.resources[id] += amount;
        if (MATERIALS.includes(id)) state.bonusMaterials[id] = previousBonus + amount;
      }
      state.bonusInventoryVersion = 1;
      const claim = { code: normalized, reward, claimedNumber: claimedCount + 1, at, generation };
      const nextPayload = JSON.stringify(state);
      if (Buffer.byteLength(nextPayload, 'utf8') > MAX_PAYLOAD_BYTES) fail('invalid-island', 409);
      await tx.set(`promotions/${normalized}`, { ...promotion, claimedCount: claimedCount + 1 });
      await tx.set(claimKey, claim);
      await tx.set(islandPath(uid), { ...island, payload: nextPayload, revision: island.revision + 1, updatedAt: at });
      return { ...claim, alreadyRedeemed: false, revision: island.revision + 1 };
    });
  }

  async function expireIsland({ uid }) {
    const at = serverTime(), key = accountPath(uid);
    if (exempt.has(uid)) return { expired: false, reason: 'exempt' };
    return store.runTransaction(async tx => {
      const account = await tx.get(key), island = await tx.get(islandPath(uid));
      if (!account || !island || !Number.isSafeInteger(account.lastPlayedAt)) return { expired: false, reason: 'missing-world-or-activity' };
      const deadline = threeMonthDeadline(account.lastPlayedAt);
      if (at < deadline) return { expired: false, reason: 'active', expiresAt: deadline };
      // Financial and one-time histories are subcollections of the account and
      // are not deleted. There is intentionally no refund operation.
      const next = await expireStored(tx, uid, account, island, at);
      return { expired: true, generation: next.islandGeneration, at, refunds: false };
    });
  }

  async function sweepExpired({ limit = 100, cursor = null } = {}) {
    if (typeof store.listAccounts !== 'function') fail('retention-scan-not-configured', 503);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) fail('invalid-scan-limit', 400);
    // Three calendar months can be shorter than 90 days. A broad candidate
    // query is narrowed by the exact Warsaw deadline inside each transaction.
    const page = await store.listAccounts({ before: serverTime() - 80 * DAY, limit, cursor });
    const results = [];
    for (const entry of page.accounts || []) results.push({ uid: entry.uid, ...await expireIsland({ uid: entry.uid }) });
    return { results, cursor: page.cursor ?? null };
  }

  return { readIsland, recordActivity, saveIsland, startIsland, redeemCode, expireIsland, sweepExpired, readLegalStatus, acceptLegal };
}
