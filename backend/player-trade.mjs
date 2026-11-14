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
export const PLAYER_TRADE_V32_PRICE_VERSION = 'goods-v32-2026-11';
export const maximumTradePrice = (resource, quantity, rules = null, goods = null) => {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000000) return null;
  if (rules === 32 || rules === PLAYER_TRADE_V32_PRICE_VERSION) return goods && Object.hasOwn(goods, resource) && Number.isFinite(goods[resource].price) ? Math.ceil(goods[resource].price * quantity) : null;
  return MATERIALS.includes(resource) ? Math.floor((['food', 'planks'].includes(resource) ? 150 : 50) * quantity / 100) : null;
};
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
const ordinary = (world, id) => Math.max(0, amount(world.resources[id]) - bonus(world, id));
function reserved(world, id) {
  return (world.constructionProjects || []).reduce((sum, project) => sum + amount(project.reservedMaterials?.[id]), 0) +
    (world.market?.orders || []).filter(order => order.resource === id).reduce((sum, order) => sum + amount(order.amount), 0) +
    (world.dock?.orders || []).filter(order => order.direction === 'sell' && order.resource === id && order.reservationVersion === 9 && !['expired', 'complete'].includes(order.stage)).reduce((sum, order) => sum + amount(order.remainingToPort), 0);
}
const warehouseLevel = world => Math.min(24, Math.floor(amount(world.buildings.warehouse?.level)));
function availableStock(world, id, v32) { return world.ruleset === 32 && id !== 'coins' ? v32.availableGoods(world, id) : Math.max(0, Math.floor(world.resources[id] - reserved(world, id) - (id === 'food' ? 50 * warehouseLevel(world) : 0))); }
function inventoryRoom(world, id, v32) {
  if (id === 'coins') return Math.max(0, Number.MAX_SAFE_INTEGER - world.resources.coins);
  const level = Math.max(0, Math.floor(amount(world.buildings.warehouse?.level)));
  if (world.ruleset === 32) {
    const limits = v32.warehouseCapacityForLevel(level, { ruleset: 32 });
    const used = Object.keys(v32.goods).reduce((sum, resource) => sum + ordinary(world, resource), 0);
    return Math.max(0, Math.floor(Math.min(limits.perResource - ordinary(world, id), limits.total - used)));
  }
  const factor = level ? 1.5 ** (level - 1) : 0;
  const perResource = Math.floor(Math.min(10000000, 1000 * factor)), total = Math.floor(Math.min(40000000, 4000 * factor));
  const used = MATERIALS.reduce((sum, resource) => sum + ordinary(world, resource), 0);
  const foodSpace = id === 'food' ? 0 : Math.max(0, 50 * warehouseLevel(world) - ordinary(world, 'food'));
  return Math.max(0, Math.floor(Math.min(perResource - ordinary(world, id), total - used - foodSpace)));
}
function spendStock(world, id, value, milkLots, v32) {
  if (availableStock(world, id, v32) < value) fail('trade-insufficient-stock');
  if (id === 'coins') {
    world.resources.coins -= value;
    if (world.ruleset === 32 && world.kingdom) world.kingdom.borrowedCoins = Math.max(0, amount(world.kingdom.borrowedCoins) - value);
    return 0;
  }
  const usedBonus = Math.min(bonus(world, id), value);
  world.bonusMaterials = { ...(world.bonusMaterials || {}), [id]: bonus(world, id) - usedBonus };
  if (world.ruleset === 32 && id === 'rawMilk') {
    const withdrawn = v32.withdrawMilk(world, value);
    if (milkLots) milkLots.push(...withdrawn);
  }
  else world.resources[id] -= value;
  world.bonusInventoryVersion = 1;
  return usedBonus;
}
function creditStock(world, id, value, bonusAmount, milkLots, v32) {
  if (!safe(value) || !safe(bonusAmount) || bonusAmount > value || amount(world.resources[id]) + value > Number.MAX_SAFE_INTEGER) fail('inventory-overflow');
  const oldBonus = bonus(world, id);
  if (world.ruleset === 32 && id === 'rawMilk') v32.depositMilk(world, value, milkLots);
  else world.resources[id] = amount(world.resources[id]) + value;
  if (bonusAmount) { world.bonusMaterials = { ...(world.bonusMaterials || {}), [id]: oldBonus + bonusAmount }; world.bonusInventoryVersion = 1; }
}
function splitMilkLots(lots, quantity) {
  let left = quantity; const taken = [], remaining = [];
  for (const lot of Array.isArray(lots) ? lots : []) {
    const used = Math.min(left, amount(lot.amount)); left -= used;
    if (used) taken.push({ amount: used, centralSeconds: amount(lot.centralSeconds) });
    if (lot.amount > used) remaining.push({ amount: lot.amount - used, centralSeconds: amount(lot.centralSeconds) });
  }
  return { taken, remaining };
}
function tradeItem(value, rules, v32) {
  if (!object(value) || !(rules === 32 && v32 ? Object.keys(v32.goods) : MATERIALS).includes(value.resource) || !Number.isSafeInteger(value.amount) || value.amount < 1 || value.amount > 10000000 || Object.keys(value).some(key => !['resource', 'amount'].includes(key))) fail('trade-invalid-material', 400);
  return { resource: value.resource, amount: value.amount };
}
function tradeCoinPrice(value, give, rules, v32) {
  if (!object(value) || value.resource !== 'coins' || Object.keys(value).some(key => !['resource', 'amount'].includes(key))) fail('trade-coins-required', 400);
  if (!Number.isSafeInteger(value.amount) || value.amount < 1 || value.amount > maximumTradePrice(give.resource, give.amount, rules, v32?.goods)) fail('trade-price-exceeds-maximum', 400);
  return { resource: 'coins', amount: value.amount };
}
function envelope(island) {
  const updatedAt = typeof island.updatedAt === 'string' ? island.updatedAt : new Date(island.updatedAt).toISOString();
  return { payload: island.payload, generation: island.generation ?? 1, version: { revision: island.revision, updateTime: updatedAt } };
}
function offerPublic(offer, uid, at, v32) {
  return { id: offer.id, version: offer.version ?? 1, legacyBarter: offer.version !== 2, ...(offer.version === 2 ? { maximumPrice: maximumTradePrice(offer.give.resource, offer.give.amount, offer.priceVersion, v32?.goods), priceVersion: offer.priceVersion } : {}), ...(offer.ownerUid === uid ? { ownerUid: uid } : {}), ownerIslandId: offer.ownerIslandId, ownerIslandName: offer.ownerIslandName,
    give: offer.give, want: offer.want, createdAt: offer.createdAt, expiresAt: offer.expiresAt, status: offer.status,
    expired: offer.status === 'open' && at >= offer.expiresAt, isMine: offer.ownerUid === uid };
}

export function createPlayerTradeService({ store, now = () => Date.now(), environment = 'production', v32 = null } = {}) {
  if (!store || typeof store.runTransaction !== 'function') throw new TypeError('A durable transactional trade store is required.');
  store = createCharityLedgerStore(createIslandDocumentStore(store), { now });
  // Local v32 injects its pure rules. The existing standalone API image has no
  // frontend imports and keeps its verified legacy contract until promoted.
  if (v32 && (!object(v32.goods) || !['availableGoods', 'withdrawMilk', 'depositMilk', 'warehouseCapacityForLevel', 'compactDietHistories'].every(key => typeof v32[key] === 'function'))) throw new TypeError('Complete v32 trade rules are required.');
  const room = (world, id) => inventoryRoom(world, id, v32);
  const spend = (world, id, value, milkLots = null) => spendStock(world, id, value, milkLots, v32);
  const credit = (world, id, value, bonusAmount = 0, milkLots = []) => creditStock(world, id, value, bonusAmount, milkLots, v32);
  const item = (value, rules = null) => tradeItem(value, rules, v32);
  const coinPrice = (value, give, rules = null) => tradeCoinPrice(value, give, rules, v32);
  const publicOffer = (offer, uid, at) => offerPublic(offer, uid, at, v32);
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
    if (state.ruleset === 32 && !v32) fail('trade-api-unavailable', 503);
    if (eligible && (amount(world.buildings.townhall?.level) < 6 || worldKey(world) === 'pending')) fail('trade-level-required');
    return { state, world };
  }
  function changed(island, state, at) {
    if (island.revision >= Number.MAX_SAFE_INTEGER) fail('invalid-revision');
    if (state.ruleset === 32 && state.archipelago?.sharedWallet) {
      state.archipelago.sharedWallet.coins = state.resources.coins;
      for (const world of Object.values(state.archipelago.islands || {})) { world.resources.coins = 0; if (state.kingdom) world.kingdom = state.kingdom; }
    }
    const saved = v32 ? structuredClone(state) : state;
    if (v32) for (const world of [saved, ...Object.values(saved.archipelago?.version === 2 ? saved.archipelago.islands || {} : saved.archipelago?.secondIsland ? { 'island-2': saved.archipelago.secondIsland } : {})]) if (world.ruleset === 32) v32.compactDietHistories(world);
    const payload = JSON.stringify(saved); if (Buffer.byteLength(payload) > MAX_BYTES) fail('invalid-island');
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
    let ruleset;
    const own = await store.runTransaction(async tx => {
      const account = await tx.get(accountPath(uid)), island = await tx.get(rootPath(uid));
      const validated = validateWorld(uid, account, island, account?.islandGeneration ?? 1, null, islandId); ruleset = validated.state.ruleset;
      const offers = [];
      for (const id of openIds(account)) { const offer = await tx.get(offerPath(id)); if (offer?.ownerUid === uid && offer.status === 'open') offers.push(publicOffer(offer, uid, at)); }
      return offers;
    });
    if (typeof store.listTradeOffers !== 'function') fail('trade-api-unavailable', 503);
    const page = await store.listTradeOffers({ limit, cursor, at });
    const offers = (page.offers || []).filter(offer => offer.status === 'open' && offer.expiresAt > at).map(offer => publicOffer(offer, uid, at));
    return { offers, ownOffers: own, cursor: page.cursor ?? null, rules: { minimumLevel: 6, expiresAfterSeconds: 86400, fee: 0, maximumOpenOffers: MAX_OPEN, offerVersion: 2, paymentResource: 'coins', priceVersion: ruleset === 32 ? PLAYER_TRADE_V32_PRICE_VERSION : PLAYER_TRADE_PRICE_VERSION, maximumPricePer100: ruleset === 32 ? Object.fromEntries(Object.keys(v32.goods).map(id => [id, maximumTradePrice(id, 100, 32, v32.goods)])) : { wood: 50, stone: 50, grain: 50, food: 150, planks: 150 }, legacyBarterAccepted: true } };
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
    give = item(give, 32);
    if (!object(want) || want.resource !== 'coins' || Object.keys(want).some(key => !['resource', 'amount'].includes(key))) fail('trade-coins-required', 400);
    want = { resource: 'coins', amount: want.amount };
    const at = serverTime(), id = 'trade_' + hash(uid + '\0' + requestId).slice(0, 40);
    return store.runTransaction(async tx => {
      const account = await tx.get(accountPath(uid)), island = await tx.get(rootPath(uid));
      const oldOffer = await tx.get(offerPath(id));
      const meta = await previous(tx, uid, requestId, { action: 'create', islandId, generation, give, want });
      const data = validateWorld(uid, account, island, generation, meta.existing ? null : expectedRevision, islandId);
      const priceVersion = data.state.ruleset === 32 ? PLAYER_TRADE_V32_PRICE_VERSION : PLAYER_TRADE_PRICE_VERSION;
      item(give, data.state.ruleset); coinPrice(want, give, priceVersion);
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
      const escrowMilkLots = [], bonusAmount = spend(data.world, give.resource, give.amount, escrowMilkLots);
      const offer = { version: 2, priceVersion, id, ownerUid: uid, ownerIslandId: islandId, ownerIslandName: [...String(data.world.islandName || '')].slice(0, 83).join(''),
        ownerGeneration: generation, ownerWorldKey: worldKey(data.world), give, want, escrowBonus: bonusAmount, ...(escrowMilkLots.length ? { escrowMilkLots } : {}), status: 'open', createdAt: at, expiresAt: at + DAY };
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
      item(offer.give, offer.priceVersion === PLAYER_TRADE_V32_PRICE_VERSION ? 32 : null);
      if (offer.version === 2) {
        if (![PLAYER_TRADE_PRICE_VERSION, PLAYER_TRADE_V32_PRICE_VERSION].includes(offer.priceVersion)) fail('trade-price-version-unsupported');
        if (offer.priceVersion === PLAYER_TRADE_V32_PRICE_VERSION && buyer.state.ruleset !== 32) fail('trade-contract-unsupported');
        coinPrice(offer.want, offer.give, offer.priceVersion);
      } else if (offer.version === 1 || offer.version === undefined) {
        item(offer.want);
        if (offer.give.resource === offer.want.resource) fail('trade-same-material', 400);
      } else fail('trade-contract-unsupported');
      const maker = validateWorld(offer.ownerUid, makerAccount, makerIsland, offer.ownerGeneration, null, offer.ownerIslandId);
      if (worldKey(maker.world) !== offer.ownerWorldKey) fail('trade-world-changed');
      const buyerPayment = buyer.state.ruleset === 32 && offer.want.resource === 'coins' ? buyer.state : buyer.world;
      const makerPayment = maker.state.ruleset === 32 && offer.want.resource === 'coins' ? maker.state : maker.world;
      spend(buyerPayment, offer.want.resource, offer.want.amount);
      if (room(buyer.world, offer.give.resource) < offer.give.amount || room(makerPayment, offer.want.resource) < offer.want.amount) fail('trade-storage-full');
      credit(buyer.world, offer.give.resource, offer.give.amount, 0, offer.escrowMilkLots);
      credit(makerPayment, offer.want.resource, offer.want.amount);
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
      const milk = splitMilkLots(offer.escrowMilkLots, returned);
      credit(data.world, offer.give.resource, returned, offer.escrowBonus, milk.taken);
      const remaining = ordinaryAmount - ordinaryNow;
      const inbox = remaining ? { id: offerId, islandId: offer.ownerIslandId, generation, worldKey: offer.ownerWorldKey, resource: offer.give.resource, amount: remaining, ...(milk.remaining.length ? { milkLots: milk.remaining } : {}), createdAt: at, reason: at >= offer.expiresAt ? 'expired' : 'cancelled' } : null;
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
      const milk = splitMilkLots(entry.milkLots, received);
      credit(data.world, entry.resource, received, 0, milk.taken);
      const remaining = entry.amount - received;
      const nextEntry = remaining ? { ...entry, amount: remaining, ...(entry.milkLots ? { milkLots: milk.remaining } : {}) } : null;
      const next = changed(island, data.state, at);
      await tx.set(rootPath(uid), next); await tx.set(accountPath(uid), { ...account, lastPlayedAt: at });
      if (nextEntry) await tx.set(inboxPath(uid, inboxId), nextEntry); else await tx.delete(inboxPath(uid, inboxId));
      await receipt(tx, meta, { action: 'claim', inboxId, received }, at);
      return { alreadyApplied: false, received, inbox: nextEntry, island: envelope(next) };
    });
  }
  return { listOffers, listInbox, createOffer, acceptOffer, cancelOffer, claimInbox };
}
