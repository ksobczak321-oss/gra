// Daily attractions and completed road tiers. All clocks use elapsed world
// seconds, so the same rules apply while the island is open and offline.
// This module intentionally imports no state, residents or logistics module.
import { nextWarsawMidnightMs } from './harborlight-v1-calendar.js?v=frontend-v15';
import { centralAvailable } from './harborlight-v1-inventory.js?v=frontend-v15';

export const LEISURE_DAY_SECONDS = 86400;
export const ATTRACTION_EFFECT_SECONDS = 21600;
export const ATTRACTION_MIN_POPULATION_PERCENT = 1;
export const ATTRACTION_MAX_POPULATION_PERCENT = 50;
export const ROAD_SECTIONS = 100;
export const ROAD_MAX_LEVEL = 5;
export const ROAD_SECTION_COST = 100;
export const ATTRACTION_MULTIPLIERS = Object.freeze([1, 0.75, 0.5, 0.25, 0]);
export const ATTRACTIONS = Object.freeze([
  { id: 'flower-beds', name: 'Flower beds', kind: 'decoration', icon: 'flowers' },
  { id: 'village-benches', name: 'Village benches', kind: 'decoration', icon: 'bench' },
  { id: 'lantern-strings', name: 'Lantern strings', kind: 'decoration', icon: 'lantern' },
  { id: 'harbor-flags', name: 'Harbor flags', kind: 'decoration', icon: 'flag' },
  { id: 'village-fountain', name: 'Village fountain', kind: 'decoration', icon: 'fountain' },
  { id: 'garden-pond', name: 'Garden pond', kind: 'decoration', icon: 'pond' },
  { id: 'wooden-sculptures', name: 'Wooden sculptures', kind: 'decoration', icon: 'sculpture' },
  { id: 'seaside-mural', name: 'Seaside mural', kind: 'decoration', icon: 'mural' },
  { id: 'lighthouse-garden', name: 'Lighthouse garden', kind: 'decoration', icon: 'garden' },
  { id: 'ornamental-sails', name: 'Ornamental sails', kind: 'decoration', icon: 'sails' },
  { id: 'travelling-circus', name: 'Travelling circus', kind: 'event', icon: 'circus' },
  { id: 'theatre-troupe', name: 'Theatre troupe', kind: 'event', icon: 'theatre' },
  { id: 'folk-concert', name: 'Folk concert', kind: 'event', icon: 'music' },
  { id: 'puppet-show', name: 'Puppet show', kind: 'event', icon: 'puppet' },
  { id: 'harvest-festival', name: 'Harvest festival', kind: 'event', icon: 'harvest' },
  { id: 'fishing-contest', name: 'Fishing contest', kind: 'event', icon: 'fish' },
  { id: 'storytelling-evening', name: 'Storytelling evening', kind: 'event', icon: 'book' },
  { id: 'village-dance', name: 'Village dance', kind: 'event', icon: 'dance' },
  { id: 'fireworks-night', name: 'Fireworks night', kind: 'event', icon: 'fireworks' },
  { id: 'harbor-fair', name: 'Harbor fair', kind: 'event', icon: 'fair' }
].map(item => Object.freeze(item)));

const EPS = 1e-7;
const SAFE = Number.MAX_SAFE_INTEGER;
const ids = new Set(ATTRACTIONS.map(item => item.id));
const catalog = new Map(ATTRACTIONS.map(item => [item.id, item]));
const finite = value => typeof value === 'number' && Number.isFinite(value);
const bounded = (value, fallback = 0, maximum = SAFE) => finite(value) ? Math.max(0, Math.min(maximum, value)) : fallback;
const integer = (value, fallback = 0, maximum = SAFE) => Math.floor(bounded(value, fallback, maximum));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const positiveId = id => Number.isSafeInteger(id) && id > 0;
const tier = state => Math.max(1, integer(state.buildings?.townhall?.level, 1, 100));
const good = (message, extra = {}) => ({ ok: true, message, ...extra });
const bad = message => ({ ok: false, message });

function notify(state, kind, title, message) {
  state.notificationSequence = integer(state.notificationSequence) + 1;
  state.notifications ||= [];
  state.notifications.unshift({ id: state.notificationSequence, kind, title, message, at: state.activeSeconds || 0, read: false });
  state.notifications.length = Math.min(state.notifications.length, 100);
}

function random(state) {
  let value = state.leisure.seed >>> 0;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  state.leisure.seed = value >>> 0 || 1;
  return state.leisure.seed / 0x100000000;
}

const randomSharePercent = state => ATTRACTION_MIN_POPULATION_PERCENT +
  Math.floor(random(state) * (ATTRACTION_MAX_POPULATION_PERCENT - ATTRACTION_MIN_POPULATION_PERCENT + 1));

function rotateOffers(state, emit = true) {
  const previous = new Set((state.leisure.offers || []).map(offer => offer.id));
  const pool = ATTRACTIONS.filter(item => !previous.has(item.id)).map(item => item.id);
  state.leisure.offers = [];
  for (let index = 0; index < 5; index++) {
    const choice = Math.floor(random(state) * pool.length);
    const [id] = pool.splice(choice, 1);
    state.leisure.offers.push({ id, y: 5 + Math.floor(random(state) * 96), sharePercent: randomSharePercent(state) });
  }
  state.leisure.nextRotationAt = nextWarsawMidnightMs(state.leisure.clockMs);
  state.leisure.rotationRemaining = (state.leisure.nextRotationAt - state.leisure.clockMs) / 1000;
  if (emit) notify(state, 'attractions-renewed', 'New daily attractions', 'Five new decorations and events are available until midnight in Europe/Warsaw.');
}

export function normalizeLeisure(state, raw = {}) {
  const saved = object(raw.leisure) ? raw.leisure : {};
  const seed = integer(saved.seed, 0, 0xffffffff) >>> 0;
  const initialSeed = (Math.floor(state.worldTimeMs || 0) ^ 0x51ed270b) >>> 0;
  const clockMs = finite(state.worldTimeMs) ? state.worldTimeMs : finite(saved.clockMs) ? saved.clockMs : 0;
  // Existing daily offers retain their identities and base happiness. The new
  // audience percentage is rolled only once when migrating a legacy offer.
  const nextRotationAt = finite(saved.nextRotationAt) && saved.nextRotationAt > clockMs ? saved.nextRotationAt : nextWarsawMidnightMs(clockMs);
  state.leisure = { seed: seed || initialSeed || 1, clockMs, nextRotationAt,
    rotationRemaining: (nextRotationAt - clockMs) / 1000,
    offers: [], habits: {}, effects: [], sequence: integer(saved.sequence) };
  const offers = Array.isArray(saved.offers) ? saved.offers : [];
  if (offers.length === 5 && new Set(offers.map(item => item?.id)).size === 5 && offers.every(item =>
    item && ids.has(item.id) && Number.isInteger(item.y) && item.y >= 5 && item.y <= 100)) {
    state.leisure.offers = offers.map(({ id, y, sharePercent }) => ({ id, y,
      sharePercent: Number.isInteger(sharePercent) && sharePercent >= ATTRACTION_MIN_POPULATION_PERCENT && sharePercent <= ATTRACTION_MAX_POPULATION_PERCENT ? sharePercent : randomSharePercent(state) }));
  } else rotateOffers(state, false);
  for (const id of ids) {
    const habit = saved.habits?.[id];
    if (object(habit) && finite(habit.resetRemaining) && habit.resetRemaining > EPS) {
      state.leisure.habits[id] = { uses: integer(habit.uses, 0, 4), resetRemaining: bounded(habit.resetRemaining, 0, LEISURE_DAY_SECONDS) };
    }
  }
  const seen = new Set();
  for (const effect of Array.isArray(saved.effects) ? saved.effects : []) {
    if (!effect || !ids.has(effect.attractionId) || !finite(effect.remaining) || effect.remaining <= EPS || !finite(effect.amount) || effect.amount <= 0) continue;
    let id = integer(effect.id);
    if (!id || seen.has(id)) id = ++state.leisure.sequence;
    seen.add(id); state.leisure.sequence = Math.max(state.leisure.sequence, id);
    const residentIds = [...new Set((Array.isArray(effect.residentIds) ? effect.residentIds : []).filter(positiveId))];
    if (!residentIds.length) continue;
    state.leisure.effects.push({ id, attractionId: effect.attractionId, title: catalog.get(effect.attractionId).name,
      amount: bounded(effect.amount, 0, 100), residentIds, remaining: bounded(effect.remaining, 0, ATTRACTION_EFFECT_SECONDS) });
  }
  const segments = raw.roads?.segments;
  // Previously purchased numeric paths already consumed materials. Preserve
  // those purchases as level-one sections rather than erasing paid progress.
  const legacySections = integer(raw.paths, 0, ROAD_SECTIONS);
  state.roads = { segments: Array.from({ length: ROAD_SECTIONS }, (_, index) =>
    Array.isArray(segments) ? integer(segments[index], 0, ROAD_MAX_LEVEL) : index < legacySections ? 1 : 0) };
  state.paths = state.roads.segments.filter(level => level > 0).length;
  return state.leisure;
}

function eligibleResidents(state) {
  return (state.residents || []).filter(person => positiveId(person.id) && !(person.newbornRemaining > EPS) && estimatedHappiness(state, person) < 100 - EPS);
}

export function residentLeisureBonus(state, person) {
  if (!person || person.newbornRemaining > EPS) return 0;
  return (state.leisure?.effects || []).reduce((sum, effect) =>
    sum + (effect.remaining > EPS && effect.residentIds.includes(person.id) ? effect.amount : 0), 0);
}

function estimatedHappiness(state, person) {
  if (state.lighthouseRemaining > EPS || person.visitHappinessRemaining > EPS) return 100;
  const blessings = (state.blessingRemaining > EPS ? 20 : 0) + (state.chapelRemaining > EPS ? 10 * (state.buildings?.chapel?.level || 0) : 0);
  const visits = (state.lighthouseVisitBonuses || []).reduce((sum, effect) => sum + (effect.remaining > EPS ? effect.amount || 10 : 0), 0);
  const producer = { farm: null, lumber: null, quarry: null, windmill: 'grain', sawmill: 'wood' };
  const workplace = state.buildings?.[person.workplace];
  const input = producer[person.workplace];
  const blocked = own(producer, person.workplace) && workplace && !(person.arrivalRemaining > EPS) &&
    (workplace.ready >= 200 * workplace.level || input && centralAvailable(state, input) < 2);
  const storagePenalty = blocked ? Math.min(50, 10 * (1 + Math.floor(((person.blockedSeconds || 0) + EPS) / LEISURE_DAY_SECONDS))) : 0;
  return Math.max(-100, Math.min(100, (person.happiness || 0) + blessings + visits - storagePenalty + residentLeisureBonus(state, person)));
}

export function leisureOffers(state) {
  const availablePeople = eligibleResidents(state).length;
  const population = Math.max(0, integer(state.population, (state.residents || []).length));
  const availability = attractionAvailability(state);
  return (state.leisure?.offers || []).map(offer => {
    const habit = state.leisure.habits[offer.id];
    const uses = habit?.resetRemaining > EPS ? Math.min(4, habit.uses) : 0;
    const multiplier = ATTRACTION_MULTIPLIERS[uses];
    const requestedResidentCount = population ? Math.max(1, Math.floor(population * offer.sharePercent / 100)) : 0;
    const residentCount = Math.min(requestedResidentCount, availablePeople);
    const amount = offer.y * multiplier, totalHappiness = amount * residentCount;
    const price = residentCount && amount > 0 ? Math.max(1, Math.ceil(totalHappiness)) : 0;
    const affordable = (state.resources?.coins || 0) >= price;
    return { ...catalog.get(offer.id), y: offer.y, sharePercent: offer.sharePercent, price, amount, totalHappiness,
      residentCount, requestedResidentCount, level: tier(state), multiplier,
      uses, remaining: state.leisure.rotationRemaining, nextReset: habit?.resetRemaining || 0,
      activeRemaining: availability.remaining,
      affordable, available: !availability.active && multiplier > 0 && affordable && residentCount > 0,
      reason: availability.active ? 'Another attraction is active. Wait until its six-hour effect ends.' : multiplier <= 0 ? 'Residents need a 24-hour break from this attraction.' : !residentCount ? 'No eligible residents can gain happiness from this attraction.' : !affordable ? 'Not enough coins.' : '' };
  });
}

// Previously paid overlapping effects are retained when loading an older
// island. New purchases wait for the last of those effects to finish.
export function attractionAvailability(state) {
  const effects = (state.leisure?.effects || []).filter(effect => finite(effect.remaining) && effect.remaining > EPS);
  const longest = effects.reduce((latest, effect) => !latest || effect.remaining > latest.remaining ? effect : latest, null);
  const remaining = longest?.remaining || 0;
  return { active: effects.length > 0, remaining, nextAvailableIn: remaining,
    activeCount: effects.length, activeAttractionId: longest?.attractionId || null, activeTitle: longest?.title || '' };
}

export function roadSummary(state) {
  const segments = Array.isArray(state.roads?.segments) && state.roads.segments.length === ROAD_SECTIONS ? state.roads.segments : Array(ROAD_SECTIONS).fill(0);
  const counts = Array.from({ length: ROAD_MAX_LEVEL + 1 }, (_, level) => segments.filter(value => value >= level).length);
  const level = Math.min(ROAD_MAX_LEVEL, Math.max(0, Math.min(...segments)));
  const nextLevel = level < ROAD_MAX_LEVEL ? level + 1 : null;
  return { level, sections: ROAD_SECTIONS, maxLevel: ROAD_MAX_LEVEL, nextLevel,
    upgraded: nextLevel ? counts[nextLevel] : ROAD_SECTIONS, counts,
    totalUpgrades: segments.reduce((sum, value) => sum + value, 0),
    levels: Array.from({ length: ROAD_MAX_LEVEL }, (_, index) => ({
      level: index + 1, count: counts[index + 1], unlocked: index === 0 || counts[index] === ROAD_SECTIONS,
      complete: counts[index + 1] === ROAD_SECTIONS })),
    speedPercent: 10 * level, capacityPercent: 10 * Math.max(0, level - 2), costPerSection: ROAD_SECTION_COST };
}

export const roadSpeedMultiplier = state => 1 + roadSummary(state).speedPercent / 100;
export const roadCapacityMultiplier = state => 1 + roadSummary(state).capacityPercent / 100;

export function leisureAction(state, action) {
  if (!action || !['buyAttraction', 'upgradeRoad'].includes(action.type)) return null;
  if (!state.leisure || !state.roads) normalizeLeisure(state, state);
  if (action.type === 'buyAttraction') {
    if (typeof action.id !== 'string' || !ids.has(action.id)) return bad('Choose an available attraction.');
    const quote = leisureOffers(state).find(offer => offer.id === action.id);
    if (!quote) return bad('This attraction is not in today’s selection.');
    if (!quote.available) return bad(quote.reason);
    const pool = eligibleResidents(state), residents = [];
    while (residents.length < quote.residentCount) {
      const lowest = Math.min(...pool.map(person => estimatedHappiness(state, person)));
      const tied = pool.filter(person => Math.abs(estimatedHappiness(state, person) - lowest) <= EPS);
      const person = tied.length === 1 ? tied[0] : tied[Math.floor(random(state) * tied.length)];
      residents.push(person); pool.splice(pool.indexOf(person), 1);
    }
    const residentIds = residents.map(person => person.id);
    state.resources.coins -= quote.price;
    state.leisure.habits[action.id] = { uses: Math.min(4, quote.uses + 1), resetRemaining: LEISURE_DAY_SECONDS };
    const effect = { id: ++state.leisure.sequence, attractionId: action.id, title: quote.name,
      amount: quote.amount, residentIds, remaining: ATTRACTION_EFFECT_SECONDS };
    state.leisure.effects.push(effect);
    notify(state, 'attraction-purchased', quote.name, `+${Math.ceil(quote.amount)} pp happiness for ${residentIds.length} ${residentIds.length === 1 ? 'resident' : 'residents'} for 6 hours. Cost: ${quote.price} coins.`);
    return good(`${quote.name}: +${Math.ceil(quote.amount)} pp happiness for ${residentIds.length} residents for 6 hours.`, { effectId: effect.id, price: quote.price, amount: quote.amount, residentIds });
  }
  const summary = roadSummary(state);
  if (summary.level >= ROAD_MAX_LEVEL) return bad('All 100 paths are already at level 5.');
  const desired = own(action, 'level') ? action.level : summary.nextLevel;
  if (!Number.isInteger(desired) || desired < 1 || desired > ROAD_MAX_LEVEL) return bad('Choose a path level from 1 to 5.');
  if (desired !== summary.nextLevel) return bad(`Upgrade all 100 paths to level ${summary.nextLevel} before starting a higher level.`);
  if (centralAvailable(state, 'stone') < ROAD_SECTION_COST) return bad('Upgrading one path section costs 100 unreserved stone from the central Warehouse.');
  const index = state.roads.segments.findIndex(level => level < desired);
  if (index < 0) return bad('This path level is already complete.');
  state.resources.stone -= ROAD_SECTION_COST;
  state.roads.segments[index] = desired;
  state.paths = state.roads.segments.filter(level => level > 0).length;
  const after = roadSummary(state);
  if (after.level > summary.level) notify(state, 'roads-tier-complete', `All paths reached level ${after.level}`,
    `Carrier transport speed +${after.speedPercent}%; carrying capacity +${after.capacityPercent}%.`);
  return good(`Path level ${desired}: ${after.counts[desired]} / 100 sections upgraded.`, { level: desired, section: index, completedLevel: after.level });
}

export function nextLeisureEvent(state) {
  if (!state.leisure) return Infinity;
  const timers = [state.leisure.rotationRemaining,
    ...Object.values(state.leisure.habits).map(habit => habit.resetRemaining),
    ...state.leisure.effects.map(effect => effect.remaining)].filter(value => finite(value) && value > EPS);
  return timers.length ? Math.min(...timers) : Infinity;
}

export function advanceLeisure(state, seconds) {
  if (!finite(seconds) || seconds < 0) return;
  if (!state.leisure || !state.roads) normalizeLeisure(state, state);
  let remaining = seconds;
  while (remaining > EPS) {
    const duration = Math.min(remaining, state.leisure.rotationRemaining);
    state.leisure.clockMs += duration * 1000;
    state.leisure.rotationRemaining = Math.max(0, (state.leisure.nextRotationAt - state.leisure.clockMs) / 1000);
    for (const [id, habit] of Object.entries(state.leisure.habits)) {
      habit.resetRemaining = Math.max(0, habit.resetRemaining - duration);
      if (habit.resetRemaining <= EPS) delete state.leisure.habits[id];
    }
    for (const effect of state.leisure.effects) effect.remaining = Math.max(0, effect.remaining - duration);
    state.leisure.effects = state.leisure.effects.filter(effect => effect.remaining > EPS);
    remaining -= duration;
    if (state.leisure.rotationRemaining <= EPS) rotateOffers(state);
  }
}
