// Server-owned escrow for material sales; historical v1 barter contracts keep their meaning. Island production is
// still calculated by the existing client; this service owns only the exchange,
// its receipts, and returns. It never trusts a caller UID or offered balances.
import { createHash } from 'node:crypto';
import { AccountServiceError, threeMonthDeadline } from './account-service.mjs';
import { createIslandDocumentStore, MAX_ARCHIPELAGO_BYTES } from './island-document-store.mjs';
import { createCharityLedgerStore } from './charity-ledger.mjs';

const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const DAY = 86400000, MAX_BYTES = MAX_ARCHIPELAGO_BYTES, MAX_OPEN = 10;
export const PLAYER_TRADE_PRICE_VERSION = 'npc-base-2026-10';
export const maximumTradePrice = (resource, quantity) => MATERIALS.includes(resource) && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 10000000 ? Math.floor((['food', 'planks'].includes(resource) ? 150 : 50) * quantity / 100) : null;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const safe = value => Number.isSafeInteger(value) && value >= 0;
const amount = value => Number.isFinite(value) ? Math.max(0, value) : 0;
const fail = (code, status = 409) => { throw new AccountServiceError(code, status); };
const uidValue = uid => typeof uid === 'string' && /^[A-Za-z0-9:_-]{1,128}$/.test(uid) ? uid : fail('invalid-account', 400);
const islandIdValue = id => typeof id === 'string' && /^island-(?:[1-9]|1[0-9]|20)$/.test(id) ? id : fail('trade-invalid-island', 400);
const idValue = id => typeof id === 'string' && /^trade_[a-f0-9]{40}$/.test(id) ? id : fail('trade-invalid-offer', 400);
const requestIdValue = id => typeof id === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(id) ? id : fail('trade-invalid-request', 400);
const revisionValue = value => Number.isSafeInteger(value) && value >= 1 ? value : fail('invalid-revision', 400);
const rootPath = uid => `islands/${uidValue(uid)}`;
const accountPath = uid => `accounts/${uidValue(uid)}`;
const offerPath = id => `playerTradeOffers/${idValue(id)}`;
const inboxPath = (uid, id) => `${accountPath(uid)}/tradeInbox/${idValue(id)}`;
const requestPath = (uid, id) => `${accountPath(uid)}/tradeRequests/${requestIdValue(id)}`;
const hash = text => createHash('sha256').update(text).digest('hex');
const openIds = account => (Array.isArray(account?.openTradeOfferIds) ? account.openTradeOfferIds : []).filter(id => /^trade_[a-f0-9]{40}$/.test(id)).slice(0, MAX_OPEN);
function readState(island) {
  if (!island || typeof island.payload !== 'string' || Buffer.byteLength(island.payload) > MAX_BYTES) fail('trade-island-unavailable');
  let state; try { state = JSON.parse(island.payload); } catch { fail('invalid-island', 400); }
  if (!object(state) || !object(state.resources) || !object(state.buildings)) fail('invalid-island', 400);
  return state;
}
function selectWorld(state, islandId) {
  const world = islandIdValue(islandId) === 'island-1' ? state : state.archipelago?.version === 2 ? state.archipelago.islands?.[islandId] : state.archipelago?.version === 1 && islandId === 'island-2' ? state.archipelago.secondIsland : null;
  if (!object(world) || !object(world.resources) || !object(world.buildings) || ['coins', ...MATERIALS].some(id => !Number.isFinite(world.resources[id]) || world.resources[id] < 0 || world.resources[id] > Number.MAX_SAFE_INTEGER)) fail('trade-invalid-island', 400);
  return world;
}
const worldKey = world => Number.isFinite(world.islandStartedAt) ? String(world.islandStartedAt) : world.onboarding?.worldStartedAt === null ? 'pending' : Number.isFinite(world.onboarding?.worldStartedAt) ? String(world.onboarding.worldStartedAt) : 'legacy';
const bonus = (world, id) => Math.min(amount(world.resources[id]), amount(world.bonusMaterials?.[id]));
const ordinary = (world, id) => Math.max(0, world.resources[id] - bonus(world, id));
function reserved(world, id) {
  return (world.constructionProjects || []).reduce((sum, project) => sum + amount(project.reservedMaterials?.[id]), 0) +
    (world.market?.orders || []).filter(order => order.resource === id).reduce((sum, order) => sum + amount(order.amount), 0) +
    (world.dock?.orders || []).filter(order => order.direction === 'sell' && order.resource === id && order.reservationVersion === 9 && !['expired', 'complete'].includes(order.stage)).reduce((sum, order) => sum + amount(order.remainingToPort), 0);
}
const warehouseLevel = world => Math.min(24, Math.floor(amount(world.buildings.warehouse?.level)));
function available(world, id) { return Math.max(0, Math.floor(world.resources[id] - reserved(world, id) - (id === 'food' ? 50 * warehouseLevel(world) : 0))); }
function room(world, id) {
  if (id === 'coins') return Math.max(0, Number.MAX_SAFE_INTEGER - world.resources.coins);
  const level = Math.max(0, Math.floor(amount(world.buildings.warehouse?.level)));
  const factor = level ? 1.5 ** (level - 1) : 0;
  const perResource = Math.floor(Math.min(10000000, 1000 * factor)), total = Math.floor(Math.min(40000000, 4000 * factor));
  const used = MATERIALS.reduce((sum, resource) => sum + ordinary(world, resource), 0);
  const foodSpace = id === 'food' ? 0 : Math.max(0, 50 * warehouseLevel(world) - ordinary(world, 'food'));
  return Math.max(0, Math.floor(Math.min(perResource - ordinary(world, id), total - used - foodSpace)));
}
function spend(world, id, value) {
  if (available(world, id) < value) fail('trade-insufficient-stock');
  if (id === 'coins') { world.resources.coins -= value; return 0; }
  const usedBonus = Math.min(bonus(world, id), value);
  world.bonusMaterials = { ...(world.bonusMaterials || {}), [id]: bonus(world, id) - usedBonus };
  world.resources[id] -= value; world.bonusInventoryVersion = 1;
  return usedBonus;
}
function credit(world, id, value, bonusAmount = 0) {
  if (!safe(value) || !safe(bonusAmount) || bonusAmount > value || world.resources[id] + value > Number.MAX_SAFE_INTEGER) fail('inventory-overflow');
  const oldBonus = bonus(world, id);
  world.resources[id] += value;
  if (bonusAmount) { world.bonusMaterials = { ...(world.bonusMaterials || {}), [id]: oldBonus + bonusAmount }; world.bonusInventoryVersion = 1; }
}
function item(value) {
  if (!object(value) || !MATERIALS.includes(value.resource) || !Number.isSafeInteger(value.amount) || value.amount < 1 || value.amount > 10000000 || Object.keys(value).some(key => !['resource', 'amount'].includes(key))) fail('trade-invalid-material', 400);
  return { resource: value.resource, amount: value.amount };
}
function coinPrice(value, give) {
  if (!object(value) || value.resource !== 'coins' || Object.keys(value).some(key => !['resource', 'amount'].includes(key))) fail('trade-coins-required', 400);
  if (!Number.isSafeInteger(value.amount) || value.amount < 1 || value.amount > maximumTradePrice(give.resource, give.amount)) fail('trade-price-exceeds-maximum', 400);
  return { resource: 'coins', amount: value.amount };
}
function envelope(island) {
  const updatedAt = typeof island.updatedAt === 'string' ? island.updatedAt : new Date(island.updatedAt).toISOString();
  return { payload: island.payload, generation: island.generation ?? 1, version: { revision: island.revision, updateTime: updatedAt } };
}
function publicOffer(offer, uid, at) {
  return { id: offer.id, version: offer.version ?? 1, legacyBarter: offer.version !== 2, ...(offer.version === 2 ? { maximumPrice: maximumTradePrice(offer.give.resource, offer.give.amount), priceVersion: offer.priceVersion } : {}), ...(offer.ownerUid === uid ? { ownerUid: uid } : {}), ownerIslandId: offer.ownerIslandId, ownerIslandName: offer.ownerIslandName,
    give: offer.give, want: offer.want, createdAt: offer.createdAt, expiresAt: offer.expiresAt, status: offer.status,
    expired: offer.status === 'open' && at >= offer.expiresAt, isMine: offer.ownerUid === uid };
}

export function createPlayerTradeService({ store, now = () => Date.now(), environment = 'production' } = {}) {
  if (!store || typeof store.runTransaction !== 'function') throw new TypeError('A durable transactional trade store is required.');
  store = createCharityLedgerStore(createIslandDocumentStore(store), { now });
  const serverTime = () => { const at = now(); if (!safe(at)) fail('invalid-server-clock', 500); return at; };
  function validateWorld(uid, account, island, generation, expectedRevision = null, islandId = 'island-1', eligible = true) {
    uidValue(uid);
    if (!account || !island) fail('trade-island-unavailable');
    if (!Number.isSafeInteger(generation) || generation < 1 || generation !== (account.islandGeneration ?? 1) || generation !== (island.generation ?? 1)) fail('island-expired', 410);
    if (account.islandExpiredAt || !safe(island.revision) || island.revision < 1) fail('island-expired', 410);
    const exempt = environment !== 'production' && ['dev-admin1','dev-admin2','dev-admin3'].includes(uid);
    if (!exempt && safe(account.lastPlayedAt) && serverTime() >= threeMonthDeadline(account.lastPlayedAt)) fail('island-expired', 410);
    if (expectedRevision !== null && (!safe(expectedRevision) || expectedRevision !== island.revision)) fail('island-conflict');
    const state = readState(island), world = selectWorld(state, islandId);
    if (eligible && (amount(world.buildings.townhall?.level) < 6 || worldKey(world) === 'pending')) fail('trade-level-required');
    return { state, world };
  }
  function changed(island, state, at) {
    if (island.revision >= Number.MAX_SAFE_INTEGER) fail('invalid-revision');
    const payload = JSON.stringify(state); if (Buffer.byteLength(payload) > MAX_BYTES) fail('invalid-island');
    return { ...island, payload, revision: island.revision + 1, updatedAt: at };
  }
  const fingerprint = data => hash(JSON.stringify(data));
  async function previous(tx, uid, requestId, business) {
    const key = requestPath(uid, requestId), existing = await tx.get(key), digest = fingerprint(business);
    if (existing && existing.fingerprint !== digest) fail('trade-request-reused');
    return { key, digest, existing };
  }
  async function receipt(tx, meta, data, at) { await tx.set(meta.key, { ...data, fingerprint: meta.digest, at }); }
  async function listOffers({ uid, islandId = 'island-1', limit = 50, cursor = null }) {
    uidValue(uid); islandIdValue(islandId);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) fail('trade-invalid-limit', 400);
    const at = serverTime();
    const own = await store.runTransaction(async tx => {
      const account = await tx.get(accountPath(uid)), island = await tx.get(rootPath(uid));
      validateWorld(uid, account, island, account?.islandGeneration ?? 1, null, islandId);
      const offers = [];
      for (const id of openIds(account)) { const offer = await tx.get(offerPath(id)); if (offer?.ownerUid === uid && offer.status === 'open') offers.push(publicOffer(offer, uid, at)); }
      return offers;
    });
    if (typeof store.listTradeOffers !== 'function') fail('trade-api-unavailable', 503);
    const page = await store.listTradeOffers({ limit, cursor, at });
    const offers = (page.offers || []).filter(offer => offer.status === 'open' && offer.expiresAt > at).map(offer => publicOffer(offer, uid, at));
    return { offers, ownOffers: own, cursor: page.cursor ?? null, rules: { minimumLevel: 6, expiresAfterSeconds: 86400, fee: 0, maximumOpenOffers: MAX_OPEN, offerVersion: 2, paymentResource: 'coins', priceVersion: PLAYER_TRADE_PRICE_VERSION, maximumPricePer100: { wood: 50, stone: 50, grain: 50, food: 150, planks: 150 }, legacyBarterAccepted: true } };
  }
  async function listInbox({ uid, limit = 50, cursor = null }) {
    uidValue(uid);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) fail('trade-invalid-limit', 400);
    if (typeof store.listTradeInbox !== 'function') fail('trade-api-unavailable', 503);
    const page = await store.listTradeInbox({ uid, limit, cursor });
    return { inbox: page.items || [], cursor: page.cursor ?? null };
  }
  async function createOffer({ uid, requestId, islandId = 'island-1', generation, expectedRevision, give, want }) {
    uidValue(uid); requestIdValue(requestId); islandIdValue(islandId); revisionValue(expectedRevision);
    give = item(give); want = coinPrice(want, give);
    const at = serverTime(), id = 'trade_' + hash(uid + '\0' + requestId).slice(0, 40);
    return store.runTransaction(async tx => {
      const account = await tx.get(accountPath(uid)), island = await tx.get(rootPath(uid));
      const oldOffer = await tx.get(offerPath(id));
      const meta = await previous(tx, uid, requestId, { action: 'create', islandId, generation, give, want });
      const data = validateWorld(uid, account, island, generation, meta.existing ? null : expectedRevision, islandId);
      if (meta.existing) return { alreadyApplied: true, offer: publicOffer(oldOffer, uid, at), island: envelope(island) };
      if (oldOffer) fail('trade-request-reused');
      const live = [];
      for (const existingId of openIds(account)) {
        const offer = await tx.get(offerPath(existingId));
        if (offer?.status !== 'open' || offer.ownerGeneration !== generation) continue;
        // An explicit world reset forfeits its old island stock. Such escrow
        // cannot be paid into the replacement world or keep its offer slots
        // blocked forever; offers belonging to the other island still count.
        const source = offer.ownerIslandId === 'island-1' ? data.state : data.state.archipelago?.version === 2 ? data.state.archipelago.islands?.[offer.ownerIslandId] : data.state.archipelago?.secondIsland;
        if (source && worldKey(source) === offer.ownerWorldKey) live.push(existingId);
      }
      if (live.length >= MAX_OPEN) fail('trade-too-many-offers');
      const bonusAmount = spend(data.world, give.resource, give.amount);
      const offer = { version: 2, priceVersion: PLAYER_TRADE_PRICE_VERSION, id, ownerUid: uid, ownerIslandId: islandId, ownerIslandName: [...String(data.world.islandName || '')].slice(0, 83).join(''),
        ownerGeneration: generation, ownerWorldKey: worldKey(data.world), give, want, escrowBonus: bonusAmount, status: 'open', createdAt: at, expiresAt: at + DAY };
      const next = changed(island, data.state, at);
      await tx.set(rootPath(uid), next); await tx.set(offerPath(id), offer);
      await tx.set(accountPath(uid), { ...account, lastPlayedAt: at, openTradeOfferIds: [...live, id] });
      await receipt(tx, meta, { action: 'create', offerId: id }, at);
      return { alreadyApplied: false, offer: publicOffer(offer, uid, at), island: envelope(next) };
    });
  }
  async function acceptOffer({ uid, offerId, requestId, islandId = 'island-1', generation, expectedRevision }) {
    uidValue(uid); idValue(offerId); requestIdValue(requestId); islandIdValue(islandId); revisionValue(expectedRevision);
    const at = serverTime();
    return store.runTransaction(async tx => {
      const offer = await tx.get(offerPath(offerId));
      if (!offer) fail('trade-offer-not-found', 404);
      if (offer.ownerUid === uid) fail('trade-own-offer');
      const account = await tx.get(accountPath(uid)), island = await tx.get(rootPath(uid));
      const makerAccount = await tx.get(accountPath(offer.ownerUid)), makerIsland = await tx.get(rootPath(offer.ownerUid));
      const meta = await previous(tx, uid, requestId, { action: 'accept', offerId, islandId, generation });
      const buyer = validateWorld(uid, account, island, generation, meta.existing ? null : expectedRevision, islandId);
      if (meta.existing) return { alreadyApplied: true, offer: publicOffer(offer, uid, at), island: envelope(island) };
      if (offer.status !== 'open') fail('trade-offer-closed');
      if (at >= offer.expiresAt) fail('trade-offer-expired');
      item(offer.give);
      if (offer.version === 2) {
        if (offer.priceVersion !== PLAYER_TRADE_PRICE_VERSION) fail('trade-price-version-unsupported');
        coinPrice(offer.want, offer.give);
      } else if (offer.version === 1 || offer.version === undefined) {
        item(offer.want);
        if (offer.give.resource === offer.want.resource) fail('trade-same-material', 400);
      } else fail('trade-contract-unsupported');
      const maker = validateWorld(offer.ownerUid, makerAccount, makerIsland, offer.ownerGeneration, null, offer.ownerIslandId);
      if (worldKey(maker.world) !== offer.ownerWorldKey) fail('trade-world-changed');
      spend(buyer.world, offer.want.resource, offer.want.amount);
      if (room(buyer.world, offer.give.resource) < offer.give.amount || room(maker.world, offer.want.resource) < offer.want.amount) fail('trade-storage-full');
      credit(buyer.world, offer.give.resource, offer.give.amount);
      credit(maker.world, offer.want.resource, offer.want.amount);
      for (const world of [buyer.world, maker.world]) if (object(world.statistics)) world.statistics.traded = Math.min(Number.MAX_SAFE_INTEGER, amount(world.statistics.traded) + 1);
      const nextBuyer = changed(island, buyer.state, at), nextMaker = changed(makerIsland, maker.state, at);
      const accepted = { ...offer, status: 'accepted', acceptedAt: at, acceptedBy: uid, acceptedIslandId: islandId };
      await tx.set(rootPath(uid), nextBuyer); await tx.set(rootPath(offer.ownerUid), nextMaker); await tx.set(offerPath(offerId), accepted);
      await tx.set(accountPath(uid), { ...account, lastPlayedAt: at });
      await tx.set(accountPath(offer.ownerUid), { ...makerAccount, openTradeOfferIds: openIds(makerAccount).filter(id => id !== offerId) });
      await receipt(tx, meta, { action: 'accept', offerId }, at);
      return { alreadyApplied: false, offer: publicOffer(accepted, uid, at), island: envelope(nextBuyer) };
    });
  }
  async function cancelOffer({ uid, offerId, requestId, generation, expectedRevision }) {
    uidValue(uid); idValue(offerId); requestIdValue(requestId); revisionValue(expectedRevision);
    const at = serverTime();
    return store.runTransaction(async tx => {
      const offer = await tx.get(offerPath(offerId));
      if (!offer) fail('trade-offer-not-found', 404);
      if (offer.ownerUid !== uid) fail('trade-not-owner', 403);
      const account = await tx.get(accountPath(uid)), island = await tx.get(rootPath(uid));
      const oldInbox = await tx.get(inboxPath(uid, offerId));
      const meta = await previous(tx, uid, requestId, { action: 'cancel', offerId, generation });
      const data = validateWorld(uid, account, island, generation, meta.existing ? null : expectedRevision, offer.ownerIslandId, false);
      if (meta.existing) return { alreadyApplied: true, offer: publicOffer(offer, uid, at), inbox: oldInbox || null, island: envelope(island) };
      if (offer.status !== 'open') fail('trade-offer-closed');
      if (generation !== offer.ownerGeneration || worldKey(data.world) !== offer.ownerWorldKey) fail('trade-world-changed');
      if (oldInbox) fail('trade-return-exists');
      const ordinaryAmount = offer.give.amount - offer.escrowBonus;
      const ordinaryNow = Math.min(ordinaryAmount, room(data.world, offer.give.resource));
      const returned = ordinaryNow + offer.escrowBonus;
      credit(data.world, offer.give.resource, returned, offer.escrowBonus);
      const remaining = ordinaryAmount - ordinaryNow;
      const inbox = remaining ? { id: offerId, islandId: offer.ownerIslandId, generation, worldKey: offer.ownerWorldKey, resource: offer.give.resource, amount: remaining, createdAt: at, reason: at >= offer.expiresAt ? 'expired' : 'cancelled' } : null;
      const closed = { ...offer, status: at >= offer.expiresAt ? 'expired' : 'cancelled', closedAt: at };
      const next = changed(island, data.state, at);
      await tx.set(rootPath(uid), next); await tx.set(offerPath(offerId), closed);
      await tx.set(accountPath(uid), { ...account, lastPlayedAt: at, openTradeOfferIds: openIds(account).filter(id => id !== offerId) });
      if (inbox) await tx.set(inboxPath(uid, offerId), inbox);
      await receipt(tx, meta, { action: 'cancel', offerId, returned }, at);
      return { alreadyApplied: false, offer: publicOffer(closed, uid, at), returned, inbox, island: envelope(next) };
    });
  }
  async function claimInbox({ uid, inboxId, requestId, generation, expectedRevision }) {
    uidValue(uid); idValue(inboxId); requestIdValue(requestId); revisionValue(expectedRevision);
    const at = serverTime();
    return store.runTransaction(async tx => {
      const account = await tx.get(accountPath(uid)), island = await tx.get(rootPath(uid));
      const entry = await tx.get(inboxPath(uid, inboxId));
      const meta = await previous(tx, uid, requestId, { action: 'claim', inboxId, generation });
      const data = validateWorld(uid, account, island, generation, meta.existing ? null : expectedRevision, entry?.islandId || 'island-1', false);
      if (meta.existing) return { alreadyApplied: true, inbox: entry || null, island: envelope(island) };
      if (!entry) fail('trade-inbox-not-found', 404);
      if (entry.generation !== generation || entry.worldKey !== worldKey(data.world)) fail('trade-world-changed');
      const received = Math.min(entry.amount, room(data.world, entry.resource));
      if (!received) fail('trade-storage-full');
      credit(data.world, entry.resource, received);
      const remaining = entry.amount - received;
      const nextEntry = remaining ? { ...entry, amount: remaining } : null;
      const next = changed(island, data.state, at);
      await tx.set(rootPath(uid), next); await tx.set(accountPath(uid), { ...account, lastPlayedAt: at });
      if (nextEntry) await tx.set(inboxPath(uid, inboxId), nextEntry); else await tx.delete(inboxPath(uid, inboxId));
      await receipt(tx, meta, { action: 'claim', inboxId, received }, at);
      return { alreadyApplied: false, received, inbox: nextEntry, island: envelope(next) };
    });
  }
  return { listOffers, listInbox, createOffer, acceptOffer, cancelOffer, claimInbox };
}
