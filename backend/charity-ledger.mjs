// A server-owned provenance ledger. An opaque client save cannot prove gross
// spending/income: a net-zero change could hide spending followed by resale.
// Consequently ordinary saves invalidate all charity qualification, preserving
// the coins themselves as unqualified. Only explicit server ledger operations
// can preserve provenance across a known, verified monetary action.
import { AccountServiceError } from './account-service.mjs';

const WRAPPED = Symbol.for('harborlight.charity-ledger-store');
const copy = value => value === undefined ? undefined : structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = code => { throw new AccountServiceError(code, 409); };
export const coinRound = value => Math.round(value * 1e6) / 1e6;
const worldsById = state => new Map([['island-1', state], ...(state?.archipelago?.version === 2 && object(state.archipelago.islands) ? Object.entries(state.archipelago.islands) : state?.archipelago?.secondIsland ? [['island-2', state.archipelago.secondIsland]] : [])]);
const worldAnchor = world => world?.islandStartedAt ?? world?.onboarding?.worldStartedAt ?? null;
export function walletPath(uid) {
  if (typeof uid !== 'string' || !/^[A-Za-z0-9:_-]{1,128}$/.test(uid)) throw new AccountServiceError('invalid-account', 400);
  return `charityWallets/${uid}`;
}
export function coinTotalFromIslandDocument(document) {
  if (!document) return 0;
  let state;
  try { state = JSON.parse(document.payload); } catch { fail('charity-invalid-island'); }
  const worlds = [state];
  if (state.archipelago?.version === 1 && state.archipelago.secondIsland) worlds.push(state.archipelago.secondIsland);
  if (state.archipelago?.version === 2 && object(state.archipelago.islands)) worlds.push(...Object.values(state.archipelago.islands));
  let total = 0;
  for (const world of worlds) {
    const coins = world?.resources?.coins;
    if (!Number.isFinite(coins) || coins < 0 || coins > Number.MAX_SAFE_INTEGER) fail('charity-invalid-island');
    total += coins;
  }
  if (!Number.isFinite(total) || total > Number.MAX_SAFE_INTEGER) fail('charity-invalid-island');
  return coinRound(total);
}
export function normalizedWallet(previous, balance, at = 0) {
  if (!Number.isFinite(balance) || balance < 0 || balance > Number.MAX_SAFE_INTEGER) fail('charity-invalid-wallet');
  const qualified = coinRound(Math.min(balance, Math.max(0, Number.isFinite(previous?.qualified) ? previous.qualified : 0)));
  return { ...(object(previous) ? previous : {}), schema: 1, qualified, unqualified: coinRound(balance - qualified),
    revision: Number.isSafeInteger(previous?.revision) && previous.revision >= 0 ? previous.revision : 0, updatedAt: at };
}
export function spendWallet(wallet, amount) {
  const balance = coinRound(wallet.qualified + wallet.unqualified);
  if (!Number.isFinite(amount) || amount <= 0 || coinRound(amount) > balance) fail('charity-insufficient-coins');
  const qualified = coinRound(Math.min(wallet.qualified, amount)), unqualified = coinRound(amount - qualified);
  wallet.qualified = coinRound(wallet.qualified - qualified);
  wallet.unqualified = coinRound(wallet.unqualified - unqualified);
  return { qualified, unqualified };
}

// Wrap AFTER hydration of sharded worlds. Writes are staged until all required
// island/ledger reads have completed, respecting Firestore's read-before-write
// rule even when another service updates more than one account atomically.
export function createCharityLedgerStore(store, { now = () => Date.now() } = {}) {
  if (!store || typeof store.runTransaction !== 'function') throw new TypeError('A transactional store is required.');
  if (store[WRAPPED]) return store;
  const runTransaction = work => store.runTransaction(async transaction => {
    const reads = new Map(), writes = new Map();
    const read = async key => {
      if (!reads.has(key)) reads.set(key, copy(await transaction.get(key)));
      return copy(reads.get(key));
    };
    const result = await work({
      get: async key => writes.has(key) ? copy(writes.get(key).value) : read(key),
      set: async (key, value) => { writes.set(key, { value: copy(value) }); },
      delete: async key => { writes.set(key, { value: undefined, deleted: true }); }
    });
    for (const [key, operation] of [...writes]) {
      const match = /^islands\/([A-Za-z0-9:_-]{1,128})$/.exec(key);
      if (!match) continue;
      const previousDocument = await read(key);
      // Effects have a server receipt. A normal client save may carry an
      // existing effect, but cannot extend it, copy it to a daughter, or mint it.
      if (!operation.deleted && operation.value?.payload) {
        const proposedState = JSON.parse(operation.value.payload), previousState = previousDocument ? JSON.parse(previousDocument.payload) : null;
        const previousWorlds = worldsById(previousState);
        for (const [islandId, world] of worldsById(proposedState)) {
          const oldWorld = previousWorlds.get(islandId);
          const oldReward = previousDocument?.generation === operation.value.generation && worldAnchor(oldWorld) === worldAnchor(world) ? oldWorld?.charityReward : undefined;
          const receipt = world.charityReward && writes.get(`charityDonations/${world.charityReward.id}`)?.value;
          const authorized = receipt?.uid === match[1] && receipt.status === 'claimed' && receipt.reward?.islandId === islandId && JSON.stringify(receipt.reward) === JSON.stringify(world.charityReward);
          if (!authorized) {
            if (oldReward) world.charityReward = copy(oldReward);
            else delete world.charityReward;
          }
        }
        operation.value.payload = JSON.stringify(proposedState);
      }
      const before = coinTotalFromIslandDocument(previousDocument);
      const after = coinTotalFromIslandDocument(operation.deleted ? undefined : operation.value);
      const ledgerKey = walletPath(match[1]);
      const prior = normalizedWallet(await read(ledgerKey), before);
      const explicit = writes.get(ledgerKey);
      if (explicit) {
        if (explicit.deleted || !object(explicit.value) || !Number.isFinite(explicit.value.qualified) || !Number.isFinite(explicit.value.unqualified) || explicit.value.qualified < 0 || explicit.value.unqualified < 0 || Math.abs(coinRound(explicit.value.qualified + explicit.value.unqualified) - after) > 0.000001) fail('charity-ledger-balance-mismatch');
        continue;
      }
      const at = now();
      if (!Number.isSafeInteger(at) || at < 0) fail('invalid-server-clock');
      prior.qualified = 0;
      prior.unqualified = after;
      prior.qualificationInvalidatedAt = at;
      prior.qualificationInvalidationReason = 'unverified-island-save';
      prior.revision += 1; prior.updatedAt = at;
      writes.set(ledgerKey, { value: prior });
    }
    // An existing root document must have been read before replacing it.
    for (const [key, operation] of writes) if ((key.split('/').length === 2 || operation.deleted) && !reads.has(key)) await read(key);
    for (const [key, operation] of writes) {
      if (operation.deleted) await transaction.delete(key);
      else await transaction.set(key, operation.value);
    }
    return result;
  });
  return new Proxy(store, { get(target, key) {
    if (key === WRAPPED) return true;
    if (key === 'runTransaction') return runTransaction;
    const value = Reflect.get(target, key, target);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
}
