// Explicitly local, volatile DEV runtime. No Firebase, ADC, external credentials
// or production store is consulted by this module.
import http from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, realpath, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from './server.mjs';
import { createAccountService, AccountServiceError } from './account-service.mjs';
import { createCommunityService } from './community-service.mjs';
import { createPlayerTradeService } from './player-trade.mjs';
import { createCharityService } from './charity-service.mjs';
import { createState } from '../harborlight-v1-state.js';
import { createIslandDocumentStore } from './island-document-store.mjs';
import { createCharityLedgerStore } from './charity-ledger.mjs';
import { advanceKingdom, kingdomAction, kingdomStatus, normalizeKingdom } from '../harborlight-v1-kingdom.js';
import { personKey, educationRecord, educationBusy } from '../harborlight-v1-education.js';
import { militaryAction, militaryBusy, militaryRecord, militaryStatus } from '../harborlight-v1-military.js';
import { GOODS, MATERIAL_IDS, availableGoods, spendGoods, goodsValue, withdrawMilk, depositMilk, compactDietHistories } from '../harborlight-v1-provisions.js';
import { warehouseCapacityForLevel } from '../harborlight-v1-economy.js';
import { consumeMaterial, ordinaryStock, ordinaryWarehouseUsed, bonusStock, grantBonusMaterials } from '../harborlight-v1-inventory.js';

export const LOCAL_DEV_PROJECT = 'harborlight-local-dev';
export const LOCAL_DEV_PASSWORDS = Object.freeze({ admin1: 'admin1', admin2: 'admin2', admin3: 'admin3' });
export const LOCAL_DEV_ACCOUNTS = Object.freeze(['admin1', 'admin2', 'admin3'].map(login => Object.freeze({ login, uid: `dev-${login}` })));
const SESSION_MS = 30 * 60_000 + 30_000;
const TOKEN_MS = 60 * 60_000;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const loopback = hostname => ['localhost', '127.0.0.1', '[::1]', '::1'].includes(String(hostname).toLowerCase());
const fault = (code, status = 400) => new AccountServiceError(code, status);
const clone = value => structuredClone(value);
const cursorEncode = row => Buffer.from(JSON.stringify(row)).toString('base64url');
function cursorDecode(cursor, prefix) {
  if (cursor === null || cursor === undefined) return null;
  try {
    if (typeof cursor !== 'string' || cursor.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw Error();
    const row = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    if (typeof row.name !== 'string' || !row.name.startsWith(prefix) || !/^trade_[a-f0-9]{40}$/.test(row.name.slice(prefix.length))) throw Error();
    return row;
  } catch { throw fault('trade-invalid-cursor'); }
}

/** Serialized transactions with rollback and Firestore-compatible read order.
 * Data lives on the server; browser reloads keep it, process restarts clear it.
 */
export class LocalDevDocumentStore {
  records = new Map();
  tail = Promise.resolve();
  loaded = false;
  constructor({ dataFile = null } = {}) { this.dataFile = dataFile ? resolve(dataFile) : null; }
  async load() {
    if (this.loaded) return;
    if (this.dataFile) {
      let source;
      try { source = await readFile(this.dataFile, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (source !== undefined) {
        if (Buffer.byteLength(source) > 128 * 1024 * 1024) throw Error('Local DEV data file exceeds its limit.');
        const saved = JSON.parse(source);
        if (saved.schema !== 32 || saved.projectId !== LOCAL_DEV_PROJECT || !Array.isArray(saved.documents) || saved.documents.some(row => !Array.isArray(row) || row.length !== 2 || typeof row[0] !== 'string' || !/^[A-Za-z0-9_:/-]{1,1024}$/.test(row[0]) || !row[1] || typeof row[1] !== 'object')) throw Error('Invalid local DEV data file; refusing to replace it.');
        this.records = new Map(saved.documents);
      }
    }
    this.loaded = true;
  }
  async persist(records) {
    if (!this.dataFile) return;
    const directory = dirname(this.dataFile), temporary = `${this.dataFile}.${randomBytes(8).toString('hex')}.tmp`;
    const content = JSON.stringify({ schema: 32, projectId: LOCAL_DEV_PROJECT, documents: [...records] });
    if (Buffer.byteLength(content) > 128 * 1024 * 1024) throw Error('Local DEV data exceeds its file limit.');
    await mkdir(directory, { recursive: true });
    try { await writeFile(temporary, content, { flag: 'wx', mode: 0o600 }); await rename(temporary, this.dataFile); }
    finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  }
  runTransaction(work) {
    const operation = this.tail.then(async () => {
      await this.load();
      // Reads and writes clone values at the boundary. A shallow map snapshot
      // therefore keeps rollback isolation without copying every saved world
      // on the one-second transport scheduler's read-only checks.
      const draft = new Map(this.records);
      let wrote = false;
      const result = await work({
        get: async key => { if (wrote) throw new TypeError('Transaction reads must precede writes.'); return clone(draft.get(key)); },
        set: async (key, value) => { wrote = true; draft.set(key, clone(value)); },
        delete: async key => { wrote = true; draft.delete(key); }
      });
      if (wrote) { await this.persist(draft); this.records = draft; }
      return result;
    });
    this.tail = operation.catch(() => {});
    return operation;
  }
  async listTradeOffers({ limit = 50, cursor = null, at }) {
    await this.tail;
    const prefix = 'playerTradeOffers/', start = cursorDecode(cursor, prefix);
    const rows = [...this.records].filter(([key, value]) => key.startsWith(prefix) && value.status === 'open' && value.expiresAt > at)
      .sort(([a, x], [b, y]) => x.expiresAt - y.expiresAt || a.localeCompare(b))
      .filter(([name, value]) => !start || value.expiresAt > start.expiresAt || value.expiresAt === start.expiresAt && name > start.name);
    const selected = rows.slice(0, limit);
    return { offers: selected.map(([, value]) => clone(value)), cursor: rows.length > limit ? cursorEncode({ name: selected.at(-1)[0], expiresAt: selected.at(-1)[1].expiresAt }) : null };
  }
  async listTradeInbox({ uid, limit = 50, cursor = null }) {
    await this.tail;
    const prefix = `accounts/${uid}/tradeInbox/`, start = cursorDecode(cursor, prefix);
    const rows = [...this.records].filter(([key]) => key.startsWith(prefix) && (!start || key > start.name)).sort(([a], [b]) => a.localeCompare(b));
    const selected = rows.slice(0, limit);
    return { items: selected.map(([, value]) => clone(value)), cursor: rows.length > limit ? cursorEncode({ name: selected.at(-1)[0] }) : null };
  }
}

async function requestJson(request, maximum = 1_500_000) {
  if (!(request.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw fault('json-required', 415);
  let size = 0; const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximum) throw fault('request-too-large', 413);
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString());
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error();
    return body;
  } catch { throw fault('invalid-json'); }
}

function send(response, code, body, head = false) {
  const encoded = JSON.stringify(body);
  response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(encoded), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(head ? undefined : encoded);
}

async function publicAllowlist(root) {
  // Read only the literal public tuple; never execute the build script.
  const source = await readFile(resolve(root, 'scripts/build_frontend.py'), 'utf8');
  const tuple = /PUBLIC_FILES\s*=\s*\(([\s\S]*?)\n\)/.exec(source)?.[1];
  if (!tuple) throw Error('Missing public frontend allowlist.');
  return new Set([...tuple.matchAll(/^\s*["']([^"']+)["'],?\s*$/gm)].map(match => match[1]));
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };

const allWorlds = state => [state, ...Object.values(state.archipelago?.version === 2 ? state.archipelago.islands || {} : state.archipelago?.secondIsland ? { 'island-2': state.archipelago.secondIsland } : {})];
const serializeDevState = state => {
  const saved = clone(state);
  for (const world of allWorlds(saved)) if (world.ruleset === 32) compactDietHistories(world);
  return JSON.stringify(saved);
};
const synchronizeWallet = state => {
  if (state.archipelago?.sharedWallet) state.archipelago.sharedWallet.coins = state.resources.coins;
  for (const world of allWorlds(state).slice(1)) if (state.ruleset === 32) world.resources.coins = 0;
};
const islandEnvelope = document => ({ payload: document.payload, version: { revision: document.revision, updateTime: new Date(document.updatedAt).toISOString() }, generation: document.generation });
const giftWorld = (state, id) => id === 'island-1' ? state : state.archipelago?.version === 2 ? state.archipelago.islands?.[id] : id === 'island-2' ? state.archipelago?.secondIsland : null;
const goodsRoom = (world, id) => {
  const limits = warehouseCapacityForLevel(world.buildings.warehouse?.level || 0, { ruleset: world.ruleset });
  return Math.max(0, Math.floor(Math.min(limits.perResource - ordinaryStock(world, id), limits.total - ordinaryWarehouseUsed(world))));
};
function takeGiftMilk(lots, requested) {
  const taken = []; let left = requested;
  for (const lot of lots) { const used = Math.min(left, lot.amount); if (used > 0) { taken.push({ amount: used, centralSeconds: lot.centralSeconds }); lot.amount -= used; left -= used; } if (!left) break; }
  return taken;
}

export const DEV_GIFT_RULES = Object.freeze({ minimumTownhall: 6, cooldownSeconds: 86400, voyageSeconds: 600, returnSeconds: 600, timingStatus: 'DEV_REUSES_EXISTING_CARGO_TIME' });
export function createDevGiftHandler({ store } = {}) {
  const documents = createCharityLedgerStore(createIslandDocumentStore(store), { allowSimulation: true });
  const work = ({ uid = null, body = null, now: at }) => documents.runTransaction(async tx => {
    const catalog = await tx.get('localDevGifts/catalog') || { gifts: [], lastSentAt: {} }, originalCatalog = JSON.stringify(catalog), members = new Map();
    if (!uid && !catalog.gifts.some(gift => gift.status !== 'complete')) return null;
    for (const account of LOCAL_DEV_ACCOUNTS) {
      const document = await tx.get(`islands/${account.uid}`), profile = await tx.get(`communityPlayers/${account.uid}`);
      if (document?.payload) members.set(account.uid, { document, original: document.payload, state: JSON.parse(document.payload), profile });
    }
    const own = members.get(uid), alliance = own?.profile?.allianceId ? await tx.get(`communityAlliances/${own.profile.allianceId}`) : null;
    let requestPath = null, receipt = null, digest = null, requestId = null, action = body?.action || body;
    if (body) {
      if (!own) throw fault('gift-island-required', 409);
      requestId = body.requestId || action.requestId;
      if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(requestId)) throw fault('gift-invalid-request');
      action = { targetId: action.targetId, fromIslandId: action.fromIslandId || 'island-1', toIslandId: action.toIslandId || 'island-1', cargo: action.cargo };
      digest = createHash('sha256').update(JSON.stringify(action)).digest('hex');
      requestPath = `accounts/${uid}/giftRequests/${requestId}`;
      receipt = await tx.get(requestPath);
      if (receipt && receipt.digest !== digest) throw fault('gift-request-reused', 409);
      if (!receipt && (body.expectedRevision !== own.document.revision || body.generation !== own.document.generation)) throw fault('island-conflict', 409);
    }
    // Resolve due transport without requiring acceptance or the receiver online.
    for (const gift of catalog.gifts) {
      const source = members.get(gift.senderUid), target = members.get(gift.receiverUid);
      if (gift.status === 'sailing' && gift.arrivesAt <= at) {
        const destination = target && target.document.generation === gift.receiverGeneration ? giftWorld(target.state, gift.toIslandId) : null;
        const accepted = {};
        for (const [id, quantity] of Object.entries(gift.remainingCargo)) {
          const received = destination ? Math.min(quantity, goodsRoom(destination, id)) : 0;
          if (received) {
            if (id === 'rawMilk') depositMilk(destination, received, takeGiftMilk(gift.milkLots, received));
            else destination.resources[id] = (destination.resources[id] || 0) + received;
            accepted[id] = received; gift.remainingCargo[id] -= received;
            gift.remainingBonus[id] = Math.max(0, (gift.remainingBonus[id] || 0) - received);
          }
          if (!gift.remainingCargo[id]) delete gift.remainingCargo[id];
        }
        gift.deliveredCargo = accepted; gift.arrivedAt = gift.arrivesAt;
        gift.status = Object.keys(gift.remainingCargo).length ? 'returning' : 'complete';
        if (gift.status === 'returning') gift.returnsAt = gift.arrivesAt + DEV_GIFT_RULES.returnSeconds * 1000;
        else gift.completedAt = gift.arrivesAt;
      }
      if (['returning', 'waitingReturn'].includes(gift.status) && gift.returnsAt <= at) {
        const destination = source && source.document.generation === gift.senderGeneration ? giftWorld(source.state, gift.fromIslandId) : null;
        if (!destination) { gift.status = 'waitingReturn'; continue; }
        for (const [id, quantity] of Object.entries(gift.remainingCargo)) {
          const bonus = Math.min(quantity, gift.remainingBonus[id] || 0), ordinary = Math.min(quantity - bonus, goodsRoom(destination, id)), received = bonus + ordinary;
          if (received) {
            if (id === 'rawMilk') {
              depositMilk(destination, received, takeGiftMilk(gift.milkLots, received));
              if (bonus) { destination.bonusMaterials ||= {}; destination.bonusMaterials[id] = (destination.bonusMaterials[id] || 0) + bonus; }
            } else { if (bonus) grantBonusMaterials(destination, { [id]: bonus },{preserveLegacyFood:true}); destination.resources[id] = (destination.resources[id] || 0) + ordinary; }
            gift.remainingCargo[id] -= received; gift.remainingBonus[id] = Math.max(0, (gift.remainingBonus[id] || 0) - received);
          }
          if (!gift.remainingCargo[id]) delete gift.remainingCargo[id];
        }
        gift.status = Object.keys(gift.remainingCargo).length ? 'waitingReturn' : 'complete';
        if (gift.status === 'complete') gift.completedAt = at;
      }
    }
    let result = receipt ? { ...receipt.result, alreadyApplied: true } : null;
    if (body && !receipt) {
      if (own.state.ruleset !== 32) throw fault('gift-ruleset-required', 409);
      if (!alliance?.members.some(row => row.uid === uid)) throw fault('gift-alliance-required', 409);
      const recipient = [...members].find(([id, member]) => id !== uid && member.profile?.id === action.targetId && alliance.members.some(row => row.uid === id));
      if (!recipient) throw fault('gift-alliance-recipient-required', 409);
      const [receiverUid, receiver] = recipient, from = giftWorld(own.state, action.fromIslandId), to = giftWorld(receiver.state, action.toIslandId);
      if (!from || !to || !(from.buildings.dock?.level > 0) || !(to.buildings.dock?.level > 0)) throw fault('gift-invalid-harbor', 409);
      if ((own.state.buildings.townhall?.level || 0) < DEV_GIFT_RULES.minimumTownhall) throw fault('gift-level-required', 409);
      if (catalog.lastSentAt[uid] !== undefined && at < catalog.lastSentAt[uid] + DEV_GIFT_RULES.cooldownSeconds * 1000) throw fault('gift-cooldown', 409);
      if (catalog.gifts.some(gift => gift.senderUid === uid && gift.status !== 'complete') || own.state.archipelago?.transfers?.some(voyage => voyage.status !== 'complete')) throw fault('gift-ship-busy', 409);
      const cargo = action.cargo;
      if (!cargo || typeof cargo !== 'object' || Array.isArray(cargo) || !Object.keys(cargo).length || Object.entries(cargo).some(([id, n]) => !GOODS[id] || !Number.isSafeInteger(n) || n < 1)) throw fault('gift-invalid-cargo');
      const amount = Object.values(cargo).reduce((sum, n) => sum + n, 0), capacity = own.state.archipelago?.shipCapacity || 1000;
      if (!Number.isSafeInteger(amount) || amount > capacity) throw fault('gift-capacity-exceeded', 409);
      if (Object.entries(cargo).some(([id, n]) => availableGoods(from, id) < n)) throw fault('gift-insufficient-stock', 409);
      const bonus = Object.fromEntries(Object.entries(cargo).map(([id, n]) => [id, Math.min(n, bonusStock(from, id))])), milkLots = cargo.rawMilk ? withdrawMilk(from, cargo.rawMilk) : [];
      for (const [id, n] of Object.entries(cargo)) {
        if (id === 'rawMilk') { from.bonusMaterials ||= {}; from.bonusMaterials[id] = Math.max(0, (from.bonusMaterials[id] || 0) - bonus[id]); }
        else consumeMaterial(from, id, n);
      }
      const gift = { id: 'gift_' + createHash('sha256').update(uid + '\0' + requestId).digest('hex').slice(0, 40), senderUid: uid, receiverUid,
        senderGeneration: own.document.generation, receiverGeneration: receiver.document.generation, fromIslandId: action.fromIslandId, toIslandId: action.toIslandId,
        receiverName: receiver.profile.name, cargo: clone(cargo), remainingCargo: clone(cargo), remainingBonus: bonus, milkLots,
        status: 'sailing', departedAt: at, arrivesAt: at + DEV_GIFT_RULES.voyageSeconds * 1000, capacityAtDeparture: capacity };
      catalog.gifts.push(gift); catalog.lastSentAt[uid] = at;
      result = { ok: true, message: 'Darowizna wypłynęła. Odbiorca nie musi jej zatwierdzać.', giftId: gift.id };
    }
    const publicGift = gift => ({ id: gift.id, receiverName: gift.receiverName, fromIslandId: gift.fromIslandId, toIslandId: gift.toIslandId, cargo: gift.cargo, remainingCargo: gift.remainingCargo,
      deliveredCargo: gift.deliveredCargo || {}, status: gift.status, departedAt: gift.departedAt, arrivesAt: gift.arrivesAt, returnsAt: gift.returnsAt || null, completedAt: gift.completedAt || null });
    catalog.gifts = [...catalog.gifts.filter(gift => gift.status !== 'complete'), ...catalog.gifts.filter(gift => gift.status === 'complete').slice(-200)];
    for (const [accountId, member] of members) {
      const sent = catalog.gifts.filter(gift => gift.senderUid === accountId);
      if (member.state.accountGifts || sent.length || accountId === uid) {
        member.state.accountGifts = { version: 32, outgoing: sent.slice(-30).map(publicGift), lastSentAt: catalog.lastSentAt[accountId] ?? null };
        for (const world of allWorlds(member.state).slice(1)) world.accountGifts = member.state.accountGifts;
      }
      const payload = serializeDevState(member.state);
      if (payload !== member.original) { member.document = { ...member.document, payload, revision: member.document.revision + 1, updatedAt: at }; await tx.set(`islands/${accountId}`, member.document); }
    }
    if (JSON.stringify(catalog) !== originalCatalog) await tx.set('localDevGifts/catalog', catalog);
    if (requestPath && !receipt) await tx.set(requestPath, { digest, result, at });
    if (!uid) return null;
    if (!own) throw fault('gift-island-required', 409);
    const outgoing = own.state.accountGifts.outgoing, lastSentAt = catalog.lastSentAt[uid], nextSendAt = lastSentAt === undefined ? null : lastSentAt + DEV_GIFT_RULES.cooldownSeconds * 1000;
    const shipBusy = outgoing.some(gift => gift.status !== 'complete') || !!own.state.archipelago?.transfers?.some(voyage => voyage.status !== 'complete');
    const recipients = [...members].filter(([id, member]) => id !== uid && member.profile && alliance?.members.some(row => row.uid === id)).map(([, member]) => ({ id: member.profile.id, name: member.profile.name,
      islands: allWorlds(member.state).map(world => ({ id: world.islandId || 'island-1', name: world.islandName || 'Wyspa', harbor: (world.buildings.dock?.level || 0) > 0 })) }));
    return { result, status: { outgoing, recipients, shipBusy, nextSendAt, canSend: (own.state.buildings.townhall?.level || 0) >= 6 && recipients.length > 0 && !shipBusy && (nextSendAt === null || nextSendAt <= at), shipCapacity: own.state.archipelago?.shipCapacity || 1000, rules: DEV_GIFT_RULES }, island: islandEnvelope(own.document), serverTime: at };
  });
  return { handle: work, settle: at => work({ now: at }) };
}

/** Kingdom actions and every affected alliance wallet share one transaction.
 * The rest of the game remains a client simulation with versioned saves.
 */
export function createDevKingdomHandler({ store, availableGoods, spendGoods, goodsValue } = {}) {
  const documents = createCharityLedgerStore(createIslandDocumentStore(store), { allowSimulation: true });
  return async ({ uid, body, now: at }) => documents.runTransaction(async tx => {
    const sharedDocument = await tx.get('localDevKingdom/sharedTasks') || { tasks: [] }, sharedTasks = sharedDocument.tasks;
    const accounts = new Map();
    for (const user of LOCAL_DEV_ACCOUNTS) {
      const document = await tx.get(`islands/${user.uid}`), account = await tx.get(`accounts/${user.uid}`), profile = await tx.get(`communityPlayers/${user.uid}`);
      if (!document?.payload) continue;
      const state = JSON.parse(document.payload), worlds = allWorlds(state);
      accounts.set(user.uid, { document, original: document.payload, state, worlds, account, profile });
    }
    const own = accounts.get(uid);
    if (!own) throw fault('kingdom-island-required', 409);
    if (own.state.ruleset !== 32) throw fault('kingdom-ruleset-required', 409);
    const alliance = own.profile?.allianceId ? await tx.get(`communityAlliances/${own.profile.allianceId}`) : null;
    let action = null, requestPath = null, digest = null, receipt = null;
    if (body) {
      action = body.action || Object.fromEntries(Object.entries(body).filter(([key]) => !['expectedRevision', 'generation'].includes(key)));
      if (typeof body.requestId === 'string') action = { ...action, requestId: body.requestId };
      if (!action || typeof action.type !== 'string' || !action.type.startsWith('kingdom') || typeof action.requestId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(action.requestId)) throw fault('kingdom-invalid-request');
      requestPath = `accounts/${uid}/kingdomRequests/${action.requestId}`;
      receipt = await tx.get(requestPath);
      digest = createHash('sha256').update(JSON.stringify(action)).digest('hex');
      if (receipt && receipt.digest !== digest) throw fault('kingdom-request-reused', 409);
      if (!receipt && (body.expectedRevision !== own.document.revision || body.generation !== own.document.generation)) throw fault('island-conflict', 409);
    }
    const contexts = new Map();
    for (const [accountId, member] of accounts) {
      const state = member.state;
      normalizeKingdom(state, state, { accountId, now: at });
      const wallet = {};
      Object.defineProperty(wallet, 'coins', { enumerable: true, get: () => state.resources.coins, set: value => { state.resources.coins = value; synchronizeWallet(state); } });
      const context = { accountId, now: at, worlds: member.worlds, sharedWallet: wallet, sharedTasks,
        alliance: alliance?.members.some(row => row.uid === accountId) ? { id: alliance.id, members: alliance.members.map(row => row.uid) } : null,
        getAccount: id => { const target = accounts.get(id); return target ? { state: target.state, worlds: target.worlds, sharedWallet: contexts.get(id)?.sharedWallet, context: contexts.get(id) } : null; },
        ...(availableGoods ? { availableGoods } : {}), ...(spendGoods ? { spendGoods } : {}), ...(goodsValue ? { goodsValue } : {}),
        militaryCount: (world, kind) => (world.residents || []).filter(person => {
          const military = militaryRecord(world, person);
          return military && (kind !== 'officer' || military.rank === 'officer');
        }).length,
        eligiblePeople: (world, kind) => kind === 'professor' ? (world.residents || []).filter(person => educationRecord(world, person)?.profession === 'professor' && !educationRecord(world, person)?.rescueGift && !educationBusy(world, person) && !militaryBusy(world, person)) : militaryStatus(world, { now: at }).soldiers.filter(person => person.ready),
        canReceiveGoods: (world, goods) => {
          const limits = warehouseCapacityForLevel(world.buildings.warehouse?.level || 0, { ruleset: world.ruleset });
          return Object.entries(goods).every(([id, n]) => goodsRoom(world, id) >= n) && Object.values(goods).reduce((sum, n) => sum + n, 0) <= Math.max(0, limits.total - ordinaryWarehouseUsed(world));
        },
        sendSquad: (world, { ids }) => militaryAction(world, { type: 'militaryDispatch', personUids: ids }, { now: at }),
        handOverProfessor: (world, { personId }) => {
          const person = (world.residents || []).find(row => personKey(row) === String(personId) || String(row.id) === String(personId));
          const record = person && educationRecord(world, person);
          if (!record || record.profession !== 'professor' || record.rescueGift || educationBusy(world, person) || militaryBusy(world, person) || person.workplace || person.arrivalRemaining > 0 || person.returnRemaining > 0) return { ok: false, message: 'Wybierz dostępnego profesora bez ratunkowego pochodzenia.' };
          world.residents = world.residents.filter(row => row !== person); world.population = world.residents.length;
          delete world.education.people[personKey(person)];
          world.education.round.members = world.education.round.members.filter(key => key !== personKey(person));
          return { ok: true };
        }
      };
      contexts.set(accountId, context);
    }
    // JSON snapshots duplicate references. Rebind the owner's lending ledger
    // and the shared task to one canonical record before resolving payouts.
    for (const task of sharedTasks) if (task.lendingRecord) {
      const owner = accounts.get(task.ownerId);
      if (!owner) continue;
      const record = owner.state.kingdom.lending.find(row => row.id === task.lendingRecord.id);
      if (record) task.lendingRecord = record;
      else owner.state.kingdom.lending.push(task.lendingRecord);
    }
    const context = contexts.get(uid);
    let result = receipt ? { ...receipt.result, alreadyApplied: true } : null;
    if (!receipt) {
      // One trusted wall clock governs shared obligations. Admin3's preview
      // accelerator never advances another account's deadlines or penalties.
      advanceKingdom(own.state, 0, { ...context, now: at, online: action?.type !== 'kingdomOffer' });
      if (action) result = kingdomAction(own.state, action, context);
      if (action && !result) throw fault('kingdom-invalid-action');
    }
    const status = kingdomStatus(own.state, context);
    for (const [accountId, member] of accounts) {
      const k = member.state.kingdom;
      k.tasks = [...k.tasks.filter(task => !task.allianceId), ...sharedTasks.filter(task => task.participants?.includes(accountId))];
      for (const world of member.worlds) world.kingdom = k;
      synchronizeWallet(member.state);
      const payload = serializeDevState(member.state);
      if (payload !== member.original) {
        member.document = { ...member.document, payload, revision: member.document.revision + 1, updatedAt: at };
        await tx.set(`islands/${accountId}`, member.document);
      }
    }
    await tx.set('localDevKingdom/sharedTasks', { tasks: sharedTasks });
    if (requestPath && !receipt) await tx.set(requestPath, { digest, result, at });
    return { result, status, island: islandEnvelope(own.document), serverTime: at };
  });
}

export async function createLocalDevRuntime({ root = ROOT, now = () => Date.now(), passwords = LOCAL_DEV_PASSWORDS, release = '0.15.0.0-dev', starter = at => {
  const state = createState(at, { onboarding: true, ruleset: 32 });
  state.settings.language = 'pl';
  return serializeDevState(state);
}, store: suppliedStore = null, dataFile = null, ephemeral = dataFile === null, kingdomHandler: customKingdomHandler = null } = {}) {
  const store = suppliedStore || new LocalDevDocumentStore({ dataFile: ephemeral ? null : dataFile });
  if (typeof store.load === 'function') await store.load();
  const persistence = store.dataFile ? 'local-dev-file' : 'server-process-memory';
  const allowed = await publicAllowlist(root), rootReal = await realpath(root);
  const sessions = new Map(), timeOffsets = new Map();
  for (const account of LOCAL_DEV_ACCOUNTS) {
    const saved = await store.runTransaction(tx => tx.get(`localDevTime/${account.uid}`));
    if (saved) {
      if (!Number.isSafeInteger(saved.offsetSeconds) || saved.offsetSeconds < 0) throw Error('Invalid saved local DEV clock.');
      timeOffsets.set(account.uid, saved.offsetSeconds);
    }
  }
  const accountService = createAccountService({ store, environment: 'development', now });
  const communityService = createCommunityService({ store, environment: 'development', now });
  const playerTradeService = createPlayerTradeService({ store, environment: 'development', now, v32: { goods: GOODS, availableGoods, withdrawMilk, depositMilk, warehouseCapacityForLevel, compactDietHistories } });
  const charityService = createCharityService({ store, environment: 'development', simulation: true, now });
  const kingdomHandler = customKingdomHandler || createDevKingdomHandler({ store, availableGoods, spendGoods, goodsValue });
  const gifts = createDevGiftHandler({ store });
  const saveIsland = accountService.saveIsland;
  accountService.saveIsland = async operation => {
    const current = await accountService.readIsland({ uid: operation.uid });
    if (current.island?.payload) {
      const trusted = JSON.parse(current.island.payload), proposed = JSON.parse(operation.payload);
      if (trusted.ruleset === 32 && trusted.kingdom) {
        proposed.kingdom = clone(trusted.kingdom);
        // Ordinary gameplay is still client-simulated. A net spend is known;
        // no opaque net-zero save can prove a larger gross spend occurred.
        proposed.kingdom.borrowedCoins = Math.max(0, Math.min(proposed.resources.coins, proposed.kingdom.borrowedCoins - Math.max(0, trusted.resources.coins - proposed.resources.coins)));
        for (const world of allWorlds(proposed).slice(1)) world.kingdom = proposed.kingdom;
        operation = { ...operation, payload: JSON.stringify(proposed) };
      }
      if (trusted.ruleset === 32) {
        if (trusted.accountGifts) proposed.accountGifts = clone(trusted.accountGifts); else delete proposed.accountGifts;
        for (const world of allWorlds(proposed).slice(1)) { if (proposed.accountGifts) world.accountGifts = proposed.accountGifts; else delete world.accountGifts; }
        operation = { ...operation, payload: JSON.stringify(proposed) };
      }
    }
    return saveIsland(operation);
  };
  // Membership changes and Kingdom invitation commits cannot interleave.
  let membershipTail = Promise.resolve();
  const membershipOperation = work => { const operation = membershipTail.then(work); membershipTail = operation.catch(() => {}); return operation; };
  const dispatchCommunity = communityService.dispatch;
  communityService.dispatch = data => membershipOperation(async () => {
    if (['allianceLeave', 'allianceKick'].includes(data.command)) {
      const locked = await store.runTransaction(async tx => {
        const profile = await tx.get(`communityPlayers/${data.uid}`), shared = await tx.get('localDevKingdom/sharedTasks');
        return !!profile?.allianceId && (shared?.tasks || []).some(task => task.allianceId === profile.allianceId && (task.status === 'active' || task.lendingRecord?.status === 'funded'));
      });
      if (locked) throw fault('community-alliance-active-obligations', 409);
    }
    return dispatchCommunity(data);
  });
  const readiness = { ready: true };
  const identity = (token, allowRefresh = false) => {
    const session = sessions.get(token), at = now();
    if (!session || !allowRefresh && session.expiresAt <= at || session.lastActivityAt + SESSION_MS <= at) { sessions.delete(token); throw fault('auth-required', 401); }
    session.lastActivityAt = at;
    return session;
  };
  const bearer = (request, allowRefresh = false) => {
    const token = /^Bearer (hl-local\.[A-Za-z0-9_-]{43})$/.exec(request.headers.authorization || '')?.[1];
    if (!token) throw fault('auth-required', 401);
    return { token, session: identity(token, allowRefresh) };
  };
  const api = createServer({ environment: 'development', release, readiness, accountService, communityService, playerTradeService, charityService,
    verifyIdentityToken: async token => identity(token), accountProjectId: LOCAL_DEV_PROJECT, starter, now });
  const publicSession = (token, session) => ({ projectId: LOCAL_DEV_PROJECT, uid: session.uid, login: session.login, idToken: token,
    expiresAt: session.expiresAt, lastActivityAt: session.lastActivityAt, capabilities: { advanceTime: session.login === 'admin3' } });
  const timeStatus = session => {
    const offsetSeconds = timeOffsets.get(session.uid) || 0;
    return { enabled: true, canAdvance: session.login === 'admin3', offsetSeconds, now: now() + offsetSeconds * 1000 };
  };
  const localConfig = () => ({ localDev: true, accountApi: true, projectId: LOCAL_DEV_PROJECT, environment: 'development', persistence,
    accounts: LOCAL_DEV_ACCOUNTS.map(({ login }) => ({ login })), capabilities: { timeControlAccount: 'admin3', kingdom: !!kingdomHandler, gifts: true }, giftRules: DEV_GIFT_RULES });
  const bootstrap = `<script>Object.defineProperty(globalThis,'__HARBORLIGHT_LOCAL_DEV__',{value:Object.freeze({projectId:'${LOCAL_DEV_PROJECT}'}),configurable:false,writable:false});</script>`;

  const server = http.createServer(async (request, response) => {
    try {
      let url;
      try { url = new URL(request.url, `http://${request.headers.host}`); } catch { throw fault('local-origin-required', 403); }
      if (!loopback(url.hostname) || url.host !== request.headers.host || url.username || url.password) throw fault('local-origin-required', 403);
      if (request.headers.origin) {
        let origin; try { origin = new URL(request.headers.origin); } catch { throw fault('local-origin-required', 403); }
        if (origin.origin !== url.origin || !loopback(origin.hostname)) throw fault('local-origin-required', 403);
      }
      if (request.headers['sec-fetch-site'] === 'cross-site') throw fault('local-origin-required', 403);
      response.setHeader('X-Harborlight-Local-Dev', '1');
      const path = url.pathname;
      if (['/ready', '/readyz'].includes(path) && ['GET', 'HEAD'].includes(request.method)) {
        send(response, readiness.ready ? 200 : 503, { status: readiness.ready ? 'ok' : 'draining', service: 'harborlight-local-dev', environment: 'development', release,
          projectId: LOCAL_DEV_PROJECT, persistence, features: { accounts: true, persistence: true, community: true, playerTrade: true, charitySimulation: true, kingdom: !!kingdomHandler, gifts: true, gameApi: false } }, request.method === 'HEAD'); return;
      }
      if (path === '/api/dev/config' || path === '/api/v1/config') {
        if (request.method !== 'GET') throw fault('method-not-allowed', 405);
        send(response, 200, localConfig()); return;
      }
      if (path === '/api/dev/sign-in') {
        if (request.method !== 'POST') throw fault('method-not-allowed', 405);
        const body = await requestJson(request, 4096), account = LOCAL_DEV_ACCOUNTS.find(user => user.login === body.login);
        const supplied = Buffer.from(typeof body.password === 'string' ? body.password : ''), expected = Buffer.from(account ? passwords[account.login] : '');
        if (!account || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw fault('invalid-credentials', 401);
        const token = 'hl-local.' + randomBytes(32).toString('base64url'), at = now();
        const session = { ...account, expiresAt: at + TOKEN_MS, lastActivityAt: at };
        sessions.set(token, session); send(response, 200, publicSession(token, session)); return;
      }
      if (path === '/api/dev/session') {
        if (request.method !== 'GET') throw fault('method-not-allowed', 405);
        const { token, session } = bearer(request, true);
        session.expiresAt = now() + TOKEN_MS;
        send(response, 200, publicSession(token, session)); return;
      }
      if (path === '/api/dev/sign-out') {
        if (request.method !== 'POST') throw fault('method-not-allowed', 405);
        const { token } = bearer(request); sessions.delete(token); send(response, 200, { signedOut: true }); return;
      }
      if (path === '/api/dev/time') {
        const { session } = bearer(request);
        if (request.method === 'GET') { send(response, 200, timeStatus(session)); return; }
        if (request.method !== 'POST') throw fault('method-not-allowed', 405);
        if (session.login !== 'admin3') throw fault('permission', 403);
        const body = await requestJson(request, 4096);
        if (!Number.isSafeInteger(body.seconds) || body.seconds < 1 || body.seconds > 31 * 86400 || typeof body.requestId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(body.requestId)) throw fault('invalid-state');
        const clock = await store.runTransaction(async tx => {
          const key = `localDevTime/${session.uid}`, saved = await tx.get(key) || { offsetSeconds: 0, receipts: {} };
          saved.receipts = Object.assign(Object.create(null), saved.receipts);
          const previous = saved.receipts[body.requestId];
          if (previous) {
            if (previous.seconds !== body.seconds) throw fault('request-reused', 409);
            return { offsetSeconds: saved.offsetSeconds, alreadyApplied: true };
          }
          const offsetSeconds = saved.offsetSeconds + body.seconds;
          if (!Number.isSafeInteger(now() + offsetSeconds * 1000)) throw fault('invalid-state');
          saved.offsetSeconds = offsetSeconds;
          saved.receipts[body.requestId] = { seconds: body.seconds, at: now() };
          const ids = Object.keys(saved.receipts);
          for (const id of ids.slice(0, Math.max(0, ids.length - 1000))) delete saved.receipts[id];
          await tx.set(key, saved);
          return { offsetSeconds, alreadyApplied: false };
        });
        timeOffsets.set(session.uid, clock.offsetSeconds);
        send(response, 200, { ...timeStatus(session), advancedSeconds: clock.alreadyApplied ? 0 : body.seconds, alreadyApplied: clock.alreadyApplied }); return;
      }
      if (path === '/api/v1/kingdom') {
        const { session } = bearer(request);
        if (!kingdomHandler) throw fault('kingdom-api-unavailable', 503);
        if (!['GET', 'POST'].includes(request.method)) throw fault('method-not-allowed', 405);
        const body = request.method === 'POST' ? await requestJson(request) : null;
        send(response, 200, await membershipOperation(() => kingdomHandler({ uid: session.uid, body, store, now: now() }))); return;
      }
      if (path === '/api/v1/gifts') {
        const { session } = bearer(request);
        if (!['GET', 'POST'].includes(request.method)) throw fault('method-not-allowed', 405);
        const body = request.method === 'POST' ? await requestJson(request) : null;
        send(response, 200, await membershipOperation(() => gifts.handle({ uid: session.uid, body, now: now() }))); return;
      }
      if (path.startsWith('/api/') || ['/health', '/healthz'].includes(path)) { api.emit('request', request, response); return; }
      if (!['GET', 'HEAD'].includes(request.method)) throw fault('method-not-allowed', 405);
      if (path === '/' || path === '/index.html') { response.writeHead(302, { Location: '/harborlight-auth.html', 'Cache-Control': 'no-store' }); response.end(); return; }
      let relative; try { relative = decodeURIComponent(path.slice(1)); } catch { throw fault('not-found', 404); }
      if (!allowed.has(relative)) throw fault('not-found', 404);
      const filename = await realpath(resolve(root, relative));
      if (!filename.startsWith(rootReal + sep) || !(await stat(filename)).isFile()) throw fault('not-found', 404);
      let content = await readFile(filename);
      if (relative === 'harborlight-auth.html' || relative === 'harborlight-v1-layered.html') content = Buffer.from(content.toString().replace(/<head(?:\s[^>]*)?>/i, head => head + bootstrap));
      const extension = /\.[^.]+$/.exec(filename)?.[0];
      response.writeHead(200, { 'Content-Type': MIME[extension] || 'application/octet-stream', 'Content-Length': content.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (!response.writableEnded && !response.headersSent) send(response, error.status || (error.code === 'ENOENT' ? 404 : 503), { error: error.code || 'dev-runtime-unavailable' });
      else if (!response.writableEnded) response.destroy();
    }
  });
  server.requestTimeout = 15_000; server.headersTimeout = 10_000; server.keepAliveTimeout = 5_000;
  const giftTimer = setInterval(() => {
    if (readiness.ready) void membershipOperation(() => gifts.settle(now())).catch(() => {});
  }, 1000).unref();
  let closing = null;
  return { server, store, accountService, communityService, playerTradeService, charityService, readiness,
    listen: (port = 3000, host = '127.0.0.1') => new Promise((resolveListen, reject) => {
      if (!loopback(host)) { reject(new TypeError('Local DEV must bind to a loopback interface.')); return; }
      server.once('error', reject);
      server.listen(port, host, () => { server.off('error', reject); resolveListen(server.address()); });
    }),
    close: () => closing ||= (async () => {
      readiness.ready = false; clearInterval(giftTimer);
      await new Promise((resolveClose, reject) => { server.close(error => error ? reject(error) : resolveClose()); server.closeIdleConnections(); });
      await membershipTail; await store.tail;
    })() };
}
