// One read-only view of active benefits and penalties, shared by Town Hall and
// transition notifications. Countdown changes alone never create a new notice.
import { centralAvailable } from './harborlight-v1-inventory.js?v=frontend-v23-1';
import { welcomeStatus } from './harborlight-v1-residents.js?v=frontend-v23-1';
import { activePlayMultiplier } from './harborlight-v1-progression.js?v=frontend-v23-1';
import { worldEventRows } from './harborlight-v1-events.js?v=frontend-v23-1';
const EPS = 1e-7;
const GRACE = 12 * 3600;
const workplaceNames = { farm: 'Farm', windmill: 'Windmill', lumber: 'Lumber Camp', sawmill: 'Sawmill', quarry: 'Quarry', warehouse: 'Warehouse', market: 'Market', dock: 'Harbor' };
const recipes = { farm: null, lumber: null, quarry: null, windmill: 'grain', sawmill: 'wood' };
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const peopleOf = state => Array.isArray(state.residents) ? state.residents : [];
const frozen = person => finite(person.newbornRemaining) > EPS;
const arrived = person => !!person.workplace && finite(person.arrivalRemaining) <= EPS && !person.visitGroup;
function blocked(state, person) {
  if (!arrived(person) || !Object.hasOwn(recipes, person.workplace)) return false;
  const building = state.buildings?.[person.workplace];
  if (!building) return false;
  const input = recipes[person.workplace];
  return finite(building.ready) >= 200 * finite(building.level) || !!input && centralAvailable(state, input) < 2;
}
const idsOf = people => people.map(person => person.id).filter(Number.isSafeInteger).sort((a, b) => a - b);
function scopeOf(selected, everyone) {
  const count = selected.length;
  return count === everyone.length && count > 0 ? `All ${count} residents` : `${count} ${count === 1 ? 'resident' : 'residents'}`;
}
const titleFromId = id => String(id || 'Attraction').split(/[-_]/).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
function effectRow(id, title, polarity, effect, scope, options = {}) {
  return { id, title, polarity, effect, scope, amount: null, residentIds: [], remaining: null, endCondition: '', explain: '', ...options };
}

/** Returns current effects without settling timers, changing residents or saving. */
export function activeEffects(state = {}) {
  const effects = [], people = peopleOf(state), eligible = people.filter(person => !frozen(person));
  const allScope = scopeOf(eligible, people);
  const allIds = idsOf(eligible);
  const welcome = welcomeStatus(state);
  if (welcome.active) effects.push(effectRow('welcome', 'Welcome bonus', 'positive', 'Happiness cannot fall below 20%', scopeOf(people, people), {
    amount: 20, residentIds: idsOf(people), remaining: welcome.remaining,
    explain: 'For the island’s first 72 hours every resident, including new arrivals, has at least 20% happiness. Forced 100% takes priority. Expiry removes the protection without subtracting twenty points or charging hidden losses.'
  }));
  if (finite(state.blessingRemaining) > EPS) effects.push(effectRow('manual-blessing', 'Chapel blessing', 'positive', '+20 pp happiness', allScope, {
    amount: 20, residentIds: allIds, remaining: state.blessingRemaining,
    explain: 'Each eligible resident receives the temporary happiness bonus. During the initial settling period, Lighthouse 100% and the Welcome minimum take priority; otherwise happiness remains at 0%.'
  }));
  if (finite(state.chapelRemaining) > EPS) {
    const amount = 10 * finite(state.buildings?.chapel?.level);
    effects.push(effectRow('chapel-upgrade', 'Chapel upgrade bonus', 'positive', `+${amount} pp happiness`, allScope, {
      amount, residentIds: allIds, remaining: state.chapelRemaining,
      explain: 'The happiness bonus lasts ten hours after a Chapel upgrade.'
    }));
  }
  if (finite(state.lighthouseRemaining) > EPS) effects.push(effectRow('lighthouse-upgrade', 'Lighthouse upgrade bonus', 'positive', 'Happiness set to 100% · material production ×2', scopeOf(people, people), {
    amount: 100, residentIds: idsOf(people), remaining: state.lighthouseRemaining,
    explain: 'The upgrade gives both benefits for 24 hours × the achieved Lighthouse level. New arrivals also receive 100%, only until the shared effect ends. Lost residents and resources are not restored.'
  }));
  for (const bonus of Array.isArray(state.lighthouseVisitBonuses) ? state.lighthouseVisitBonuses : []) {
    if (!(finite(bonus.remaining) > EPS)) continue;
    effects.push(effectRow(`lighthouse-group-${bonus.groupId}`, 'Lighthouse visitors returned', 'positive', '+10 pp happiness', allScope, {
      amount: 10, residentIds: allIds, remaining: bonus.remaining,
      explain: 'Each returning group has its own six-hour population bonus. Overlapping groups add their bonuses.'
    }));
  }
  for (const person of people) {
    if (finite(person.visitHappinessRemaining) > EPS) effects.push(effectRow(`lighthouse-person-${person.id}`, 'Lighthouse visit reward', 'positive', 'Happiness set to 100%', `Resident #${person.id}`, {
      amount: 100, residentIds: [person.id], remaining: person.visitHappinessRemaining,
      explain: 'The personal benefit starts after the four-hour visit and lasts for 24 hours.'
    }));
    if (frozen(person)) effects.push(effectRow(`new-resident-${person.id}`, 'New resident settling in', 'neutral', finite(state.lighthouseRemaining) > EPS || finite(person.visitHappinessRemaining) > EPS ? 'Happiness set to 100% by Lighthouse protection' : welcome.active ? 'Happiness protected at 20% by Welcome bonus' : 'Happiness stays at 0%', `Resident #${person.id}`, {
      amount: 0, residentIds: [person.id], remaining: person.newbornRemaining,
      explain: 'The initial 24-hour settling period suspends hunger and unemployment counters. Forced 100% takes priority, followed by the Welcome bonus minimum; otherwise happiness stays at 0%.'
    }));
  }

  const fed = finite(state.foodCredit) > 1e-12 || centralAvailable(state, 'food') >= 1;
  if (fed && eligible.length) effects.push(effectRow('regular-meals', 'Regular meals', 'positive', '+1 pp happiness / h', allScope, {
    amount: 1, residentIds: allIds, endCondition: 'While Food is available in central storage',
    explain: 'Food is shared equally and assigned automatically. Each resident consumes one Food per hour; a full uninterrupted hour of feeding resets the hunger counter.'
  }));
  const recovering = fed ? eligible.filter(person => finite(person.hungerSeconds) > EPS && finite(person.fedRecoverySeconds) < 3600 - EPS) : [];
  if (recovering.length) effects.push(effectRow('hunger-recovery', 'Recovering from hunger', 'neutral', 'Hunger penalty paused · timer recovering', scopeOf(recovering, people), {
    amount: 0, residentIds: idsOf(recovering), remaining: Math.max(...recovering.map(person => 3600 - finite(person.fedRecoverySeconds))),
    explain: 'The penalty stops as soon as food is available. The remembered hunger timer resets after one uninterrupted hour of feeding; a short meal pauses it without clearing it.'
  }));
  const working = eligible.filter(person => arrived(person) && !blocked(state, person));
  if (working.length) effects.push(effectRow('employment', 'Working residents', 'positive', '+1 pp happiness / h', scopeOf(working, people), {
    amount: 1, residentIds: idsOf(working), endCondition: 'While these residents are actively working',
    explain: 'The work benefit starts on arrival. A production blockage pauses this benefit.'
  }));
  if (!fed && people.length) {
    effects.push(effectRow('food-shortage-efficiency', 'Food shortage', 'negative', 'Production and carrying speed ×0.5', scopeOf(people, people), {
      amount: -50, residentIds: idsOf(people), endCondition: 'Until Food is available in central storage',
      explain: 'The efficiency reduction starts immediately when food runs out; the happiness penalty has a separate 12-hour grace period.'
    }));
    const hungry = eligible.filter(person => finite(person.hungerSeconds) >= GRACE - EPS);
    if (hungry.length) effects.push(effectRow('hunger', 'Hunger penalty', 'negative', '−5 pp happiness / h', scopeOf(hungry, people), {
      amount: -5, residentIds: idsOf(hungry), endCondition: 'Until these residents receive Food',
      explain: 'Unfed time accumulates until a full uninterrupted hour of feeding clears it. After twelve hours the penalty applies only while food is unavailable, without backcharging the first twelve hours.'
    }));
  }
  const unemployed = eligible.filter(person => !person.workplace && finite(person.unemployedSeconds) >= GRACE - EPS);
  if (unemployed.length) effects.push(effectRow('unemployment', 'Unemployment penalty', 'negative', '−5 pp happiness / h', scopeOf(unemployed, people), {
    amount: -5, residentIds: idsOf(unemployed), endCondition: 'Until these residents are assigned to work',
    explain: 'The penalty is paused on assignment and while walking to work. Only arriving resets the remembered timer; recalling a resident early does not grant a new grace period. Returning home counts as unemployment.'
  }));
  const unhoused = Math.max(0, finite(state.population, people.length) - 24 * finite(state.buildings?.house?.level));
  if (unhoused > 0 && eligible.length) effects.push(effectRow('overcrowding', 'Not enough beds', 'negative', `−${unhoused} pp happiness / h`, allScope, {
    amount: -unhoused, residentIds: allIds, endCondition: 'Until the House has enough beds for everyone',
    explain: `${unhoused} residents have no bed. Each missing bed adds a one-point hourly happiness penalty to eligible residents.`
  }));
  for (const [workplace, name] of Object.entries(workplaceNames)) {
    const affected = eligible.filter(person => person.workplace === workplace && blocked(state, person));
    if (!affected.length) continue;
    const penalties = affected.map(person => Math.min(50, 10 * (1 + Math.floor((finite(person.blockedSeconds) + EPS) / 86400))));
    const lowest = Math.min(...penalties), highest = Math.max(...penalties);
    effects.push(effectRow(`production-blockage-${workplace}`, `${name}: production blockage`, 'negative', lowest === highest ? `−${lowest} pp happiness` : `−${lowest} to −${highest} pp happiness`, scopeOf(affected, people), {
      amount: -highest, residentIds: idsOf(affected), endCondition: 'Until production can resume or the worker is released',
      details: affected.map((person, index) => ({ residentId: person.id, amount: -penalties[index] })).sort((a, b) => a.residentId - b.residentId),
      explain: 'A full local store or missing input starts a −10 pp penalty. Each additional 24 hours adds −10, up to −50 from this cause.'
    }));
  }

  const attractionNames = new Map();
  for (const bonus of Array.isArray(state.leisure?.effects) ? state.leisure.effects : []) {
    attractionNames.set(bonus.attractionId, bonus.title || titleFromId(bonus.attractionId));
    if (!(finite(bonus.remaining) > EPS)) continue;
    const recipients = eligible.filter(person => (bonus.residentIds || []).includes(person.id));
    if (!recipients.length) continue;
    effects.push(effectRow(`attraction-${bonus.id}`, bonus.title || titleFromId(bonus.attractionId), 'positive', `+${Math.ceil(finite(bonus.amount))} pp happiness`, scopeOf(recipients, people), {
      amount: finite(bonus.amount), residentIds: idsOf(recipients), remaining: bonus.remaining,
      explain: 'This purchase gives a six-hour personal bonus. Each purchase has its own recipients and expiry.'
    }));
  }
  for (const [attractionId, habit] of Object.entries(state.leisure?.habits || {})) {
    if (!(finite(habit?.resetRemaining) > EPS) || !(finite(habit?.uses) > 0)) continue;
    const percentage = Math.max(0, 100 - 25 * Math.floor(habit.uses));
    const title = attractionNames.get(attractionId) || titleFromId(attractionId);
    effects.push(effectRow(`familiarity-${attractionId}`, `${title}: familiarity`, 'negative', percentage ? `Next purchase gives ${percentage}% of its original happiness bonus` : 'No further happiness bonus; purchase unavailable', 'This attraction only', {
      amount: percentage - 100, remaining: habit.resetRemaining,
      explain: 'Repeated purchases give 100%, 75%, 50%, 25%, then 0%. Full effectiveness returns after 24 hours without buying this attraction.'
    }));
  }
  const segments = state.roads?.segments;
  const roadLevel = Array.isArray(segments) && segments.length === 100 ? Math.max(0, Math.min(5, ...segments.map(segment => Math.floor(finite(segment))))) : 0;
  if (roadLevel > 0) {
    const speed = roadLevel * 10, capacity = Math.max(0, roadLevel - 2) * 10;
    effects.push(effectRow('completed-path-level', 'Completed path network', 'positive', `+${speed}% carrying speed${capacity ? ` · +${capacity}% carrying capacity` : ''}`, 'Warehouse, Market and Harbor carriers', {
      amount: speed, endCondition: 'Permanent benefit from the completed network level',
      explain: `All 100 path sections have reached level ${roadLevel}. Travel time is divided by ${1 + roadLevel / 10}; ship voyages and residents walking to work keep their own rules.`
    }));
  }
  const now = finite(state.worldTimeMs, finite(state.lastSimulatedAt));
  const activityRemaining = (finite(state.engagement?.activeUntil) - now) / 1000;
  if (activityRemaining > EPS) effects.push(effectRow('active-play', 'Active play', 'positive', 'Production, taxes and transport speed ×2', 'Island economy', {
    amount: 2, remaining: activityRemaining,
    explain: 'Meaningful activity in the focused visible game keeps this benefit active for five minutes. Food, population clocks and effect durations keep real time. The Lighthouse production bonus can combine with it.'
  }));
  if (activePlayMultiplier(state) === 0.5) effects.push(effectRow('long-absence', 'Island inactivity', 'negative', 'Production, taxes and transport speed ×0.5', 'Island economy', {
    amount: 0.5, endCondition: 'Until the player performs a real game action',
    explain: 'Only time after 48 hours without real play is slowed. Earlier offline hours retain their original multipliers; automatic session refresh does not count as play.'
  }));
  for (const event of worldEventRows(state, 'en')) effects.push(effectRow(event.id, event.title, event.polarity, String(event.description), 'Island', {
    residentIds: event.polarity === 'negative' ? allIds : [], remaining: event.remaining,
    explain: 'Shipwreck effects keep their own clocks. Lighthouse protection overrides happiness loss without restoring residents or materials already lost.'
  }));
  const packageRemaining = (finite(state.premium?.expiresAt) - now) / 1000;
  if (packageRemaining > EPS) effects.push(effectRow('construction-package', 'Construction package', 'positive', '+4 active builds · unlimited queue · delivery planning', 'Island construction', {
    amount: 4, remaining: packageRemaining,
    explain: 'The active construction package adds four places, an unlimited queue and planning based on expected deliveries.'
  }));
  return effects;
}

function semanticSignature(effect) {
  return JSON.stringify([effect.title, effect.polarity, effect.effect, effect.scope, effect.amount, effect.residentIds, effect.endCondition, effect.details || null]);
}
function trackedEffects(effects) {
  return Object.fromEntries(effects.map(effect => [effect.id, { signature: semanticSignature(effect), effect: { ...effect, residentIds: [...effect.residentIds] } }]));
}
export function normalizeEffectNotifications(state) {
  state.effectNotificationState = { version: 1, active: trackedEffects(activeEffects(state)) };
  return state.effectNotificationState;
}
function durationText(seconds) {
  if (seconds >= 3600) {
    const minutes = Math.ceil(seconds / 60), remainder = minutes % 60;
    return `${Math.floor(minutes / 60)} h${remainder ? ` ${remainder} min` : ''}`;
  }
  if (seconds >= 60) return `${Math.ceil(seconds / 60)} min`;
  return `${Math.ceil(seconds)} s`;
}
function notify(state, effect, transition) {
  if (!Array.isArray(state.notifications)) state.notifications = [];
  state.notificationSequence = Math.max(finite(state.notificationSequence), ...state.notifications.map(item => finite(item.id))) + 1;
  const prefix = transition === 'ended' ? 'Ended' : transition === 'changed' ? 'Updated' : effect.polarity === 'negative' ? 'Penalty' : effect.polarity === 'neutral' ? 'Status' : 'Bonus';
  const timing = transition === 'ended' ? '' : Number.isFinite(effect.remaining) ? ` · ${durationText(effect.remaining)} remaining` : effect.endCondition ? ` · ${effect.endCondition}` : '';
  state.notifications.unshift({ id: state.notificationSequence, kind: `effect-${transition}`, effectId: effect.id, title: `${prefix}: ${effect.title}`, message: `${effect.effect} · ${effect.scope}${timing}.`, at: finite(state.activeSeconds), read: false });
  state.notifications.length = Math.min(100, state.notifications.length);
}

/** Compare effect meaning, not its ticking remaining time. Returns current rows. */
export function syncEffectNotifications(state, { silent = false } = {}) {
  const effects = activeEffects(state), next = trackedEffects(effects);
  const previous = state.effectNotificationState;
  if (!silent && previous?.version === 1 && previous.active && typeof previous.active === 'object') {
    for (const effect of effects) {
      const old = previous.active[effect.id];
      if (!old) notify(state, effect, 'started');
      else if (old.signature !== next[effect.id].signature) notify(state, effect, 'changed');
    }
    for (const [id, old] of Object.entries(previous.active)) if (!Object.hasOwn(next, id) && old.effect) notify(state, old.effect, 'ended');
  }
  state.effectNotificationState = { version: 1, active: next };
  return effects;
}
