// Persistent shipwrecks use elapsed world time. Random outcomes are saved once;
// reading a panel never rerolls an offer or applies an event a second time.
// This module imports inventory only: residents/logistics can safely read its
// modifiers, and the state coordinator supplies population-changing callbacks.
import { centralAvailable, grantBonusMaterials, consumeMaterial } from './harborlight-v1-inventory.js?v=frontend-v27';

const HOUR = 3600, DAY = 86400, EPS = 1e-7, SAFE = Number.MAX_SAFE_INTEGER;
const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const finite = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const amount = (value, fallback = 0, max = SAFE) => Math.min(max, Math.max(0, finite(value, fallback)));
const integer = (value, fallback = 0, max = SAFE) => Math.floor(amount(value, fallback, max));
// These forms affect Polish copy only; event quantities and saved receipts stay numeric.
const polishAmountWord = (value, one, few, many) => value === 1 ? one :
  value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 12 || value % 100 > 14) ? few : many;
const coinObject = value => polishAmountWord(value, 'monetę', 'monety', 'monet');
const materialUnits = value => polishAmountWord(value, 'jednostkę', 'jednostki', 'jednostek');
const level = (state, building) => integer(state.buildings?.[building]?.level, 0, 100);
const worldNow = state => amount(state.worldTimeMs ?? state.lastSimulatedAt);
const protectedByLighthouse = state => finite(state.lighthouseRemaining) > EPS;
const activityMarker = (state, events) => amount(state.engagement?.lastRealActivityAt, events.startedAt);
const instant = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= SAFE;
const future = value => instant(value) ? value : null;

export const WORLD_EVENT_RULES = Object.freeze({
  version: 1, goodMinimumSeconds: 36 * HOUR, goodMaximumSeconds: 60 * HOUR,
  chapelMonitoringLevel: 3, badMinimumDelaySeconds: 6 * DAY, badMaximumDelaySeconds: 15 * DAY,
  effectSeconds: 6 * HOUR, maximumPopulationLoss: 0.2, populationMinimum: 6,
  fullHouseCompensationPerTownHall: 500,
  goodWeights: Object.freeze({ treasure: 30, 'tax-refund': 20, supplies: 25, castaway: 10, fertilizer: 15 }),
  badWeights: Object.freeze({ plague: 10, 'royal-tax': 30, beetles: 30, 'damaged-roads': 30 })
});

function random(events) {
  let seed = events.seed >>> 0 || 1;
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  events.seed = seed >>> 0 || 1;
  return events.seed / 0x100000000;
}
function randomInt(events, minimum, maximum) {
  return minimum + Math.floor(random(events) * (maximum - minimum + 1));
}
function pick(events, weights) {
  let ticket = random(events) * Object.values(weights).reduce((sum, value) => sum + value, 0);
  for (const [id, weight] of Object.entries(weights)) { ticket -= weight; if (ticket < 0) return id; }
  return Object.keys(weights).at(-1);
}
const nextGood = (events, at) => at + randomInt(events, WORLD_EVENT_RULES.goodMinimumSeconds, WORLD_EVENT_RULES.goodMaximumSeconds) * 1000;
const nextBadDelay = events => randomInt(events, WORLD_EVENT_RULES.badMinimumDelaySeconds, WORLD_EVENT_RULES.badMaximumDelaySeconds) * 1000;

export function chapelGraceSeconds(state) {
  return (3 + level(state, 'chapel')) * DAY;
}
function graceAt(state, events) {
  return Math.max(events.monitoringStartedAt ?? events.clockMs, events.lastBlessingAt ?? events.monitoringStartedAt ?? events.clockMs) + chapelGraceSeconds(state) * 1000;
}
function eligibleForBad(state, events) {
  return level(state, 'chapel') >= WORLD_EVENT_RULES.chapelMonitoringLevel &&
    events.lastBadActivityAt !== activityMarker(state, events);
}
function scheduleBad(state, events, at, reset = false) {
  if (level(state, 'chapel') < WORLD_EVENT_RULES.chapelMonitoringLevel || protectedByLighthouse(state) || !eligibleForBad(state, events)) {
    events.nextBadAt = null;
    return;
  }
  if (events.monitoringStartedAt === null) events.monitoringStartedAt = at;
  if (reset || events.badDelayMs === null) events.badDelayMs = nextBadDelay(events);
  if (reset) events.badAnchorAt = at;
  else if (events.badAnchorAt === null) events.badAnchorAt = events.lastBadAt === null ? events.monitoringStartedAt : at;
  events.nextBadAt = Math.max(events.badAnchorAt, graceAt(state, events)) + events.badDelayMs;
}

/** Migration preserves earned outcomes/timers and never creates a fake blessing. */
export function normalizeWorldEvents(state, raw = {}) {
  const source = object(raw.worldEvents) ? structuredClone(raw.worldEvents) : {};
  const now = worldNow(state), clockMs = amount(source.clockMs, now);
  const seed = integer(source.seed, (Math.floor(clockMs) ^ 0x1ee7c0de) >>> 0, 0xffffffff) >>> 0 || 1;
  const events = state.worldEvents = {
    version: WORLD_EVENT_RULES.version, startedAt: amount(source.startedAt, clockMs), clockMs, seed,
    sequence: integer(source.sequence), nextGoodAt: future(source.nextGoodAt), pendingGood: source.pendingGood === true,
    lastBlessingAt: future(source.lastBlessingAt), monitoringStartedAt: future(source.monitoringStartedAt),
    nextBadAt: future(source.nextBadAt),
    badDelayMs: instant(source.badDelayMs) && source.badDelayMs >= WORLD_EVENT_RULES.badMinimumDelaySeconds * 1000 && source.badDelayMs <= WORLD_EVENT_RULES.badMaximumDelaySeconds * 1000 ? source.badDelayMs : null,
    badAnchorAt: future(source.badAnchorAt),
    lastBadAt: future(source.lastBadAt), lastBadActivityAt: future(source.lastBadActivityAt),
    protectionActive: source.protectionActive === true,
    protectionUntilMs: future(source.protectionUntilMs),
    deferredCoins: typeof source.deferredCoins === 'string' && /^\d{1,100}$/.test(source.deferredCoins) ? source.deferredCoins : '0',
    effects: (Array.isArray(source.effects) ? source.effects : []).filter(effect => object(effect) && instant(effect.untilMs) && effect.untilMs > clockMs).slice(0, 32).map(effect => ({
      id: String(effect.id || '').slice(0, 80), kind: String(effect.kind || '').slice(0, 40), untilMs: effect.untilMs,
      happinessPenalty: amount(effect.happinessPenalty, 0, 100), transportSlowPercent: amount(effect.transportSlowPercent, 0, 50),
      farmBonusPercent: amount(effect.farmBonusPercent, 0, 100)
    })),
    history: (Array.isArray(source.history) ? source.history : []).filter(entry => object(entry) && instant(entry.at)).slice(0, 32)
  };
  if (events.nextGoodAt === null && !events.pendingGood) events.nextGoodAt = nextGood(events, clockMs);
  if (protectedByLighthouse(state)) {
    events.protectionActive = true;
    events.protectionUntilMs = clockMs + state.lighthouseRemaining * 1000;
    events.nextBadAt = null;
  } else if (!events.protectionActive) scheduleBad(state, events, clockMs);
  return events;
}

function ensure(state) {
  return object(state.worldEvents) && state.worldEvents.version === WORLD_EVENT_RULES.version ? state.worldEvents : normalizeWorldEvents(state, state);
}
function emit(state, events, entry) {
  const id = `wreck-${++events.sequence}`;
  const record = { id, ...entry };
  events.history.unshift(record); events.history.length = Math.min(events.history.length, 32);
  state.notifications ||= [];
  state.notificationSequence = integer(state.notificationSequence) + 1;
  state.notifications.unshift({ id: state.notificationSequence, kind: entry.polarity === 'negative' ? 'world-event-penalty' : 'world-event-bonus',
    title: entry.title, message: entry.message, titlePl: entry.titlePl, messagePl: entry.messagePl,
    at: Math.max(0, finite(state.activeSeconds) - Math.max(0, (worldNow(state) - entry.at) / 1000)), read: false, worldEventId: id });
  state.notifications.length = Math.min(state.notifications.length, 100);
  return record;
}
function grantCoins(state, events, value) {
  const requested = integer(value), current = integer(state.resources?.coins);
  const stored = Math.min(requested, SAFE - current);
  state.resources ||= {}; state.resources.coins = current + stored;
  events.deferredCoins = String(BigInt(events.deferredCoins) + BigInt(requested - stored));
  return requested;
}
function flushCoins(state, events) {
  const current = integer(state.resources?.coins), pending = BigInt(events.deferredCoins);
  const room = BigInt(SAFE - current), released = pending < room ? pending : room;
  if (released > 0n) { state.resources.coins = current + Number(released); events.deferredCoins = String(pending - released); }
}

function goodEvent(state, events, at, context) {
  const kind = pick(events, WORLD_EVENT_RULES.goodWeights), town = Math.max(1, level(state, 'townhall'));
  let details = {}, title, titlePl, message, messagePl;
  if (kind === 'treasure' || kind === 'tax-refund') {
    const coins = grantCoins(state, events, randomInt(events, kind === 'treasure' ? 50 : 20, kind === 'treasure' ? 150 : 60) * town);
    details = { coins };
    title = kind === 'treasure' ? 'Treasure from the wreck' : 'Royal tax refund';
    titlePl = kind === 'treasure' ? 'Skarb z wraku' : 'Zwrot podatku królewskiego';
    message = `The wreck brought ${coins} coins.`; messagePl = `Ze wraku odzyskano ${coins} ${coinObject(coins)}.`;
  } else if (kind === 'supplies') {
    const materials = Object.fromEntries(MATERIALS.map(id => [id, randomInt(events, 50, 150)]));
    grantBonusMaterials(state, materials); details = { materials };
    title = 'Supplies rescued from the wreck'; titlePl = 'Ładunek ocalony z wraku';
    message = 'Rescued materials are available in your bonus stock.'; messagePl = 'Ocalone materiały trafiły do zapasu z nagród. Możesz je wydać; nie zajmują zwykłej pojemności magazynu.';
  } else if (kind === 'castaway') {
    const capacity = town * 24 - Math.max(0, state.incomingPassengers || 0);
    if (integer(state.population) < capacity && typeof context.synchronizeResidents === 'function') {
      state.population = integer(state.population) + 1; context.synchronizeResidents(state); details = { people: 1 };
      title = 'A castaway joins the island'; titlePl = 'Rozbitek zamieszkał na wyspie';
      message = 'One rescued resident joined the island. Without a free bed, the resident works at half speed and consumes twice as much Food.';
      messagePl = 'Uratowany rozbitek dołączył do mieszkańców. Jeśli nie ma dla niego wolnego łóżka, pracuje o połowę wolniej i zużywa dwa razy więcej żywności.';
    } else {
      const coins = grantCoins(state, events, WORLD_EVENT_RULES.fullHouseCompensationPerTownHall * town);
      details = { people: 0, coins, substituted: true };
      title = 'Castaway compensation'; titlePl = 'Rekompensata za brak miejsca';
      message = `No Town Hall population place was available. You received ${coins} coins instead.`;
      messagePl = `Ratusz nie zapewniał wolnego miejsca dla nowego mieszkańca. Rekompensata wynosi ${coins} ${polishAmountWord(coins, 'moneta', 'monety', 'monet')}.`;
    }
  } else {
    events.effects.push({ id: `wreck-effect-${events.sequence + 1}`, kind, untilMs: at + WORLD_EVENT_RULES.effectSeconds * 1000,
      farmBonusPercent: 25, transportSlowPercent: 0, happinessPenalty: 0 });
    details = { farmBonusPercent: 25, duration: WORLD_EVENT_RULES.effectSeconds };
    title = 'Unusual fertilizer'; titlePl = 'Niezwykły nawóz';
    message = 'Farm production is increased by 25% for six hours.'; messagePl = 'Przez sześć godzin gospodarstwo produkuje o 25% więcej zboża.';
  }
  return emit(state, events, { at, kind, polarity: 'positive', title, titlePl, message, messagePl, details });
}

function badEvent(state, events, at, context) {
  const kind = pick(events, WORLD_EVENT_RULES.badWeights), happinessPenalty = kind === 'plague' ? 10 : 5;
  let details, title, titlePl, message, messagePl, transportSlowPercent = 0;
  if (kind === 'plague') {
    const requested = Math.min(Math.max(0, integer(state.population) - (state.islandRole === 'daughter' ? 6 : 12)), Math.floor(integer(state.population) * WORLD_EVENT_RULES.maximumPopulationLoss));
    let people = 0;
    while (people < requested && typeof context.removeResident === 'function' && context.removeResident(state)) people++;
    if (people && typeof context.synchronizeResidents === 'function') context.synchronizeResidents(state);
    details = { peopleLost: people, requestedPeople: requested };
    title = 'Plague from the wreck'; titlePl = 'Dżuma na wyspie';
    message = `${people} residents were lost. Happiness −10 pp for six hours.`;
    messagePl = people ? `Dżuma zabrała ${people} ${people === 1 ? 'mieszkańca' : 'mieszkańców'}. Przez sześć godzin szczęście jest niższe o 10 p.p.` :
      'Nikt nie zginął: minimalna liczba mieszkańców jest chroniona. Przez sześć godzin szczęście jest niższe o 10 p.p.';
  } else if (kind === 'royal-tax') {
    const percentage = randomInt(events, 0, 20), coins = consumeMaterial(state, 'coins', Math.floor(integer(state.resources?.coins) * percentage / 100));
    details = { percentage, coinsLost: coins };
    title = 'An unexpected royal tax'; titlePl = 'Niespodziewany podatek królewski';
    message = `${coins} available coins were collected. Happiness −5 pp for six hours.`;
    messagePl = `Pobrano ${coins} ${coinObject(coins)} z wolnego salda. Przez sześć godzin szczęście jest niższe o 5 p.p.`;
  } else if (kind === 'beetles') {
    const percentage = randomInt(events, 0, 20), wood = consumeMaterial(state, 'wood', Math.floor(centralAvailable(state, 'wood') * percentage / 100));
    details = { percentage, woodLost: wood };
    title = 'Wood-boring beetles'; titlePl = 'Plaga korników';
    message = `${wood} unreserved wood was lost. Happiness −5 pp for six hours.`;
    messagePl = `Korniki zniszczyły ${wood} ${materialUnits(wood)} drewna z dostępnego zapasu. Przez sześć godzin szczęście jest niższe o 5 p.p.`;
  } else {
    transportSlowPercent = randomInt(events, 0, 50); details = { transportSlowPercent };
    title = 'Roads damaged by the wreck'; titlePl = 'Drogi uszkodzone po katastrofie';
    message = `Carrying speed −${transportSlowPercent}% and happiness −5 pp for six hours.`;
    messagePl = `Przez sześć godzin szczęście jest niższe o 5 p.p.${transportSlowPercent ? ` Transport jest wolniejszy o ${transportSlowPercent}%.` : ''}`;
  }
  events.effects.push({ id: `wreck-effect-${events.sequence + 1}`, kind, untilMs: at + WORLD_EVENT_RULES.effectSeconds * 1000,
    happinessPenalty, transportSlowPercent, farmBonusPercent: 0 });
  events.lastBadAt = at; events.lastBadActivityAt = activityMarker(state, events);
  events.nextBadAt = null; events.badDelayMs = null; events.badAnchorAt = null;
  return emit(state, events, { at, kind, polarity: 'negative', title, titlePl, message, messagePl, details });
}

/** Successful free, coin-paid and ad-earned manual blessings all renew care. */
export function recordChapelBlessing(state) {
  const events = ensure(state), now = worldNow(state);
  events.lastBlessingAt = now; events.lastBadActivityAt = null;
  events.badDelayMs = null; events.badAnchorAt = null; events.nextBadAt = null;
  scheduleBad(state, events, now, true);
}

/** Called after the state coordinator advances worldTimeMs by `seconds`. */
export function advanceWorldEvents(state, seconds = 0, context = {}) {
  const events = ensure(state), start = events.clockMs;
  const target = Math.min(SAFE, start + amount(seconds) * 1000);
  const emitted = [];
  flushCoins(state, events);
  if (level(state, 'chapel') >= WORLD_EVENT_RULES.chapelMonitoringLevel && events.monitoringStartedAt === null) events.monitoringStartedAt = start;
  if (protectedByLighthouse(state)) {
    events.protectionActive = true; events.protectionUntilMs = target + state.lighthouseRemaining * 1000;
    events.nextBadAt = null; events.badDelayMs = null; events.badAnchorAt = null;
    if (events.nextGoodAt !== null && events.nextGoodAt <= target + EPS) events.pendingGood = true;
    events.clockMs = target;
    events.effects = events.effects.filter(effect => effect.untilMs > target + EPS);
    return emitted;
  }
  if (events.protectionActive) {
    const releasedAt = Math.min(target, Math.max(start, events.protectionUntilMs ?? target));
    events.protectionActive = false; events.protectionUntilMs = null;
    if (events.pendingGood || events.nextGoodAt !== null && events.nextGoodAt <= releasedAt + EPS) {
      emitted.push(goodEvent(state, events, releasedAt, context)); events.pendingGood = false; events.nextGoodAt = nextGood(events, releasedAt);
    }
    events.badAnchorAt = releasedAt; events.badDelayMs = null;
    scheduleBad(state, events, releasedAt, true);
  }
  if (events.pendingGood) {
    emitted.push(goodEvent(state, events, start, context));
    events.pendingGood = false; events.nextGoodAt = nextGood(events, start);
  }
  if (events.nextGoodAt === null) events.nextGoodAt = nextGood(events, start);
  scheduleBad(state, events, start);
  // A valid island expires after three months without play. This high defensive
  // bound protects corrupted timestamps without affecting any valid absence.
  let processed = 0;
  while (processed++ < 2048) {
    const goodAt = events.nextGoodAt ?? Infinity, badAt = events.nextBadAt ?? Infinity;
    const at = Math.min(goodAt, badAt);
    if (at > target + EPS) break;
    if (goodAt <= badAt) {
      emitted.push(goodEvent(state, events, at, context)); events.nextGoodAt = nextGood(events, at);
    } else emitted.push(badEvent(state, events, at, context));
  }
  if (processed > 2048 && events.nextGoodAt <= target) { events.pendingGood = true; events.nextGoodAt = nextGood(events, target); }
  events.clockMs = target;
  events.effects = events.effects.filter(effect => effect.untilMs > target + EPS);
  return emitted;
}

/** Seconds to the next model boundary; due work gets a tiny positive segment. */
export function nextWorldEvent(state) {
  const events = state.worldEvents;
  if (!object(events)) return 1e-8;
  const now = events.clockMs, protectedNow = protectedByLighthouse(state);
  if (protectedNow !== events.protectionActive) return 1e-8;
  if (!protectedNow && eligibleForBad(state, events) && events.nextBadAt === null) return 1e-8;
  let next = Infinity;
  if (!events.pendingGood && events.nextGoodAt !== null) next = Math.min(next, (events.nextGoodAt - now) / 1000);
  if (!protectedNow && events.nextBadAt !== null) next = Math.min(next, (Math.max(events.badAnchorAt ?? 0, graceAt(state, events)) + (events.badDelayMs ?? 0) - now) / 1000);
  for (const effect of events.effects) next = Math.min(next, (effect.untilMs - now) / 1000);
  return next <= EPS ? 1e-8 : next;
}

function activeEffects(state) {
  const events = state.worldEvents;
  return object(events) ? events.effects.filter(effect => effect.untilMs > events.clockMs + EPS) : [];
}
export const eventProductionMultiplier = (state, building) => building === 'farm' ?
  1 + activeEffects(state).reduce((sum, effect) => sum + finite(effect.farmBonusPercent), 0) / 100 : 1;
export const eventTransportMultiplier = state => activeEffects(state).reduce((factor, effect) => factor * (1 - finite(effect.transportSlowPercent) / 100), 1);
export const worldEventHappinessPenalty = state => activeEffects(state).reduce((sum, effect) => sum + finite(effect.happinessPenalty), 0);

export function worldEventRows(state, language = 'pl') {
  const events = state.worldEvents, polish = language === 'pl';
  if (!object(events)) return [];
  const names = { fertilizer: ['Unusual fertilizer', 'Niezwykły nawóz'], plague: ['Plague', 'Dżuma'], 'royal-tax': ['Royal tax', 'Podatek królewski'], beetles: ['Wood-boring beetles', 'Plaga korników'], 'damaged-roads': ['Damaged roads', 'Uszkodzone drogi'] };
  const rows = activeEffects(state).map(effect => {
    const parts = [];
    if (effect.farmBonusPercent) parts.push(polish ? `Produkcja zboża +${effect.farmBonusPercent}%` : `Farm production +${effect.farmBonusPercent}%`);
    if (effect.transportSlowPercent) parts.push(polish ? `Prędkość transportu −${effect.transportSlowPercent}%` : `Carrying speed −${effect.transportSlowPercent}%`);
    if (effect.happinessPenalty) parts.push(polish ? `Szczęście −${effect.happinessPenalty} p.p.` : `Happiness −${effect.happinessPenalty} pp`);
    return { id: effect.id, title: (names[effect.kind] || ['World event', 'Wydarzenie na wyspie'])[polish ? 1 : 0], description: parts.join(' · '),
      remaining: Math.max(0, (effect.untilMs - events.clockMs) / 1000), polarity: effect.happinessPenalty ? 'negative' : 'positive' };
  });
  if (events.deferredCoins !== '0') rows.push({ id: 'wreck-coins-waiting', title: polish ? 'Monety oczekujące na zwolnienie miejsca' : 'Coins waiting for wallet space',
    description: events.deferredCoins, remaining: null, polarity: 'neutral' });
  return rows;
}
