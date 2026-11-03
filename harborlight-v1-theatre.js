// The Theatre is a permanent, single-level meeting place. Decorations are
// individual possessions: moving them never buys, duplicates or destroys them.
// Ad verification is supplied by the account/provider adapter, never an action.
export const THEATRE_RULES = Object.freeze({ version: 1, slots: 20, maxLevel: 20,
  adMilestones: Object.freeze([5, 10, 15, 20]), adIntentSeconds: 120,
  maxCollection: 2000, completionBadge: 'island-stage-pennant' });

export const THEATRE_DECORATIONS = Object.freeze([
  ['fountain', 'Fontanna', 'Fountain', 1.4], ['column', 'Kolumny', 'Columns', 1.15],
  ['statue', 'Rzeźba', 'Statue', 1.25], ['flowerbed', 'Kwietnik', 'Flower bed', 1],
  ['tree', 'Drzewo ozdobne', 'Ornamental tree', 1.1], ['hedge', 'Żywopłot', 'Hedge', 1],
  ['bench', 'Ławka', 'Bench', 1], ['lantern', 'Latarnia ogrodowa', 'Garden lantern', 1.1],
  ['gateway', 'Ozdobna brama', 'Decorative gateway', 1.3], ['mosaic', 'Mozaika', 'Mosaic', 1.15]
].map(([id, namePl, name, priceWeight]) => Object.freeze({ id, namePl, name, priceWeight })));
export const THEATRE_STYLES = Object.freeze([
  { id: 'coastal', namePl: 'Nadmorski', name: 'Coastal', stone: '#e6d0a5', dark: '#9a7656', accent: '#55bfc8', foliage: '#46976b' },
  { id: 'pirate', namePl: 'Piracki', name: 'Pirate', stone: '#c69a70', dark: '#5e3f3d', accent: '#cc665a', foliage: '#54734a' },
  { id: 'garden', namePl: 'Ogrodowy', name: 'Garden', stone: '#d2d4b6', dark: '#819575', accent: '#d7a3c7', foliage: '#5b9c53' },
  { id: 'marble', namePl: 'Marmurowy', name: 'Marble', stone: '#f4eddb', dark: '#a6a6ad', accent: '#d9b75e', foliage: '#527c6f' },
  { id: 'holiday', namePl: 'Świąteczny', name: 'Festive', stone: '#f3dbab', dark: '#a06a51', accent: '#e49b48', foliage: '#348a72' }
].map(Object.freeze));

export const THEATRE_TRANSLATIONS = Object.freeze({
  'Choose a decoration and an available style.': 'Wybierz dekorację i jej styl.',
  'The decoration collection is full.': 'Kolekcja dekoracji jest pełna.',
  'Choose a free courtyard place.': 'Wybierz wolne miejsce w ogrodzie Teatru.',
  'Decoration price.': 'Cena dekoracji.',
  'This decoration is not in your collection.': 'Nie masz tej dekoracji w kolekcji.',
  'This decoration is already at its highest level.': 'Ta dekoracja osiągnęła już najwyższy poziom.',
  'Decoration improvement price.': 'Cena ulepszenia dekoracji.',
  'Not enough coins for this decoration.': 'Brakuje monet na tę dekorację.',
  'Decoration added to your collection.': 'Dekoracja trafiła do Twojej kolekcji.',
  'This decoration advertisement is no longer active.': 'Ta reklama już się zakończyła lub została anulowana.',
  'Advertisement cancelled. No coins were spent.': 'Reklama anulowana. Nie pobrano monet.',
  'The advertisement receipt is invalid or was already used.': 'Potwierdzenie reklamy jest nieprawidłowe lub zostało już wykorzystane.',
  'The advertisement provider has not confirmed completion.': 'Nie otrzymano potwierdzenia obejrzenia całej reklamy.',
  'The decoration changed. Preview the improvement again.': 'Dekoracja się zmieniła. Ponownie sprawdź podgląd ulepszenia.',
  'Not enough coins for this decoration improvement.': 'Brakuje monet na ulepszenie tej dekoracji.',
  'Decoration improved.': 'Dekoracja została ulepszona.',
  'Decoration stored. Its level is preserved.': 'Dekoracja wróciła do kolekcji. Zachowuje swój poziom.',
  'Choose an available style.': 'Wybierz jeden z dostępnych stylów.',
  'Decoration style changed.': 'Styl dekoracji został zmieniony.',
  'Choose one of the twenty courtyard places.': 'Wybierz jedno z dwudziestu miejsc w ogrodzie Teatru.',
  'Decorations rearranged.': 'Dekoracje zostały zamienione miejscami.',
  'Decoration placed.': 'Dekoracja jest już na swoim miejscu.',
  'This improvement does not require an advertisement.': 'To ulepszenie nie wymaga oglądania reklamy.',
  'Finish or cancel the current decoration advertisement.': 'Najpierw obejrzyj do końca albo anuluj obecną reklamę.',
  'Watch the complete advertisement to improve this decoration.': 'Obejrzyj całą reklamę, aby ulepszyć dekorację.',
  'This improvement requires coins and a completed advertisement.': 'To ulepszenie wymaga monet i obejrzenia całej reklamy.'
});

const catalog = new Map(THEATRE_DECORATIONS.map(item => [item.id, item]));
const styles = new Set(THEATRE_STYLES.map(item => item.id));
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const slotValid = value => integer(value) && value < THEATRE_RULES.slots;
const clock = state => Number.isFinite(state.worldTimeMs) ? state.worldTimeMs : 0;
const good = (message, details = {}) => ({ ok: true, message, ...details });
const bad = (message, code = 'invalid', details = {}) => ({ ok: false, message, code, ...details });
const localizedName = (id, language = 'pl') => catalog.get(id)?.[language === 'en' ? 'name' : 'namePl'] || id;
const price = (kind, level) => 5 * Math.ceil((level === 1 ? 25 : 12 * level ** 1.35) * catalog.get(kind).priceWeight / 5);

export function normalizeTheatre(state, raw = state) {
  const saved = object(raw.theatre) ? raw.theatre : {}, ids = new Set(), slots = new Set();
  const collection = [];
  for (const entry of (Array.isArray(saved.collection) ? saved.collection : []).slice(0, THEATRE_RULES.maxCollection)) {
    if (!object(entry) || !/^decoration-[1-9]\d{0,12}$/.test(entry.id || '') || ids.has(entry.id) || !catalog.has(entry.type)) continue;
    ids.add(entry.id);
    const slot = slotValid(entry.slot) && !slots.has(entry.slot) ? entry.slot : null;
    if (slot !== null) slots.add(slot);
    collection.push({ id: entry.id, type: entry.type, level: integer(entry.level) ? Math.max(1, Math.min(20, entry.level)) : 1,
      style: styles.has(entry.style) ? entry.style : 'coastal', slot });
  }
  const sequence = Math.max(integer(saved.sequence) ? saved.sequence : 0,
    ...collection.map(item => Number(item.id.slice(11))), 0);
  const pending = saved.pendingUpgrade;
  const pendingUpgrade = object(pending) && /^theatre-ad-[1-9]\d{0,14}$/.test(pending.nonce || '') &&
    collection.some(item => item.id === pending.id && item.level + 1 === pending.targetLevel) &&
    THEATRE_RULES.adMilestones.includes(pending.targetLevel) && integer(pending.coins) && Number.isFinite(pending.startedAt) &&
    clock(state) >= pending.startedAt && clock(state) - pending.startedAt < THEATRE_RULES.adIntentSeconds * 1000
    ? { nonce: pending.nonce, id: pending.id, targetLevel: pending.targetLevel, coins: pending.coins, startedAt: pending.startedAt } : null;
  state.theatre = { version: THEATRE_RULES.version, sequence, collection, pendingUpgrade,
    adReceipts: [...new Set((Array.isArray(saved.adReceipts) ? saved.adReceipts : []).filter(id => typeof id === 'string' && id.length > 0 && id.length <= 200))].slice(-2000),
    badges: Array.isArray(saved.badges) && saved.badges.includes(THEATRE_RULES.completionBadge) ? [THEATRE_RULES.completionBadge] : [] };
  awardCollectionBadge(state.theatre);
  return state.theatre;
}

function current(state) { return state.theatre || normalizeTheatre(state); }
function awardCollectionBadge(theatre) {
  if (THEATRE_DECORATIONS.every(kind => theatre.collection.some(item => item.type === kind.id)) && !theatre.badges.includes(THEATRE_RULES.completionBadge)) {
    theatre.badges.push(THEATRE_RULES.completionBadge);
  }
}
function canSpend(state, coins) { return Number.isFinite(state.resources?.coins) && state.resources.coins >= coins; }

export function theatreQuote(state, action = {}, context = {}) {
  const theatre = current(state);
  if (action.type === 'theatreBuy') {
    if (!catalog.has(action.decoration) || !styles.has(action.style || 'coastal')) return bad('Choose a decoration and an available style.');
    if (theatre.collection.length >= THEATRE_RULES.maxCollection) return bad('The decoration collection is full.', 'collection-full');
    if (action.slot != null && (!slotValid(action.slot) || theatre.collection.some(item => item.slot === action.slot))) return bad('Choose a free courtyard place.', 'slot-occupied');
    const coins = price(action.decoration, 1);
    return good('Decoration price.', { coins, targetLevel: 1, requiresAd: false, affordable: canSpend(state, coins) });
  }
  const item = theatre.collection.find(entry => entry.id === action.id);
  if (!item) return bad('This decoration is not in your collection.', 'not-owned');
  if (item.level >= THEATRE_RULES.maxLevel) return bad('This decoration is already at its highest level.', 'max-level');
  const targetLevel = item.level + 1, coins = price(item.type, targetLevel);
  return good('Decoration improvement price.', { id: item.id, targetLevel, coins,
    requiresAd: THEATRE_RULES.adMilestones.includes(targetLevel) && context.noAds !== true,
    affordable: canSpend(state, coins) });
}

export function theatreStatus(state, context = {}) {
  const theatre = current(state), placed = theatre.collection.filter(item => item.slot !== null);
  return { version: THEATRE_RULES.version, maxLevel: 20, slots: THEATRE_RULES.slots, usedSlots: placed.length,
    freeSlots: THEATRE_RULES.slots - placed.length, collection: theatre.collection.map(item => ({ ...item })),
    pendingUpgrade: theatre.pendingUpgrade ? { ...theatre.pendingUpgrade } : null, badges: [...theatre.badges],
    noAds: context.noAds === true, uniqueTypes: new Set(theatre.collection.map(item => item.type)).size,
    catalog: THEATRE_DECORATIONS.map(item => ({ ...item, coins: price(item.id, 1) })) };
}

/** Adapter context is trusted infrastructure. Never spread player action fields
 * into it. PROD requires a provider receipt confirmed outside the browser. */
export function theatreAction(state, action = {}, context = {}) {
  if (!['theatreBuy', 'theatrePlace', 'theatreMove', 'theatreRemove', 'theatreRestyle', 'theatreUpgrade',
    'theatreBeginUpgradeAd', 'theatreCompleteUpgradeAd', 'theatreCancelUpgradeAd'].includes(action.type)) return null;
  const theatre = current(state);
  if (action.type === 'theatreBuy') {
    const quote = theatreQuote(state, action, context);
    if (!quote.ok) return quote;
    if (!quote.affordable) return bad('Not enough coins for this decoration.', 'not-enough-coins', { quote });
    state.resources.coins -= quote.coins;
    const item = { id: `decoration-${++theatre.sequence}`, type: action.decoration, level: 1,
      style: action.style || 'coastal', slot: action.slot ?? null };
    theatre.collection.push(item); awardCollectionBadge(theatre);
    return good('Decoration added to your collection.', { item: { ...item }, coins: quote.coins });
  }
  if (action.type === 'theatreCancelUpgradeAd') {
    if (!theatre.pendingUpgrade || theatre.pendingUpgrade.nonce !== action.nonce) return bad('This decoration advertisement is no longer active.', 'ad-expired');
    theatre.pendingUpgrade = null;
    return good('Advertisement cancelled. No coins were spent.');
  }
  if (action.type === 'theatreCompleteUpgradeAd') {
    const pending = theatre.pendingUpgrade;
    if (!pending || pending.nonce !== action.nonce || clock(state) - pending.startedAt >= THEATRE_RULES.adIntentSeconds * 1000) return bad('This decoration advertisement is no longer active.', 'ad-expired');
    const receipt = action.receiptId;
    if (typeof receipt !== 'string' || !receipt || receipt.length > 200 || theatre.adReceipts.includes(receipt)) return bad('The advertisement receipt is invalid or was already used.', 'invalid-receipt');
    if (!(context.rewardedAdVerified === true && (context.verifiedProvider === true || context.devSimulation === true && ['development', 'preprod'].includes(context.environment)))) {
      return bad('The advertisement provider has not confirmed completion.', 'ad-unverified');
    }
    const quote = theatreQuote(state, { id: pending.id }, { noAds: false });
    if (!quote.ok || quote.targetLevel !== pending.targetLevel || quote.coins !== pending.coins) return bad('The decoration changed. Preview the improvement again.', 'quote-changed');
    if (!quote.affordable) return bad('Not enough coins for this decoration improvement.', 'not-enough-coins', { quote });
    const item = theatre.collection.find(entry => entry.id === pending.id);
    state.resources.coins -= quote.coins; item.level = quote.targetLevel;
    theatre.adReceipts.push(receipt); theatre.pendingUpgrade = null;
    return good('Decoration improved.', { item: { ...item }, coins: quote.coins, simulated: context.devSimulation === true && context.verifiedProvider !== true });
  }
  const item = theatre.collection.find(entry => entry.id === action.id);
  if (!item) return bad('This decoration is not in your collection.', 'not-owned');
  if (action.type === 'theatreRemove') { item.slot = null; return good('Decoration stored. Its level is preserved.', { item: { ...item } }); }
  if (action.type === 'theatreRestyle') {
    if (!styles.has(action.style)) return bad('Choose an available style.');
    item.style = action.style; return good('Decoration style changed.', { item: { ...item } });
  }
  if (action.type === 'theatrePlace' || action.type === 'theatreMove') {
    if (!slotValid(action.slot)) return bad('Choose one of the twenty courtyard places.');
    const previous = item.slot, other = theatre.collection.find(entry => entry.slot === action.slot && entry.id !== item.id);
    item.slot = action.slot;
    // An installed decoration swaps with another installed decoration. Installing
    // from the collection stores the displaced item, without destroying it.
    if (other) other.slot = previous;
    return good(other ? 'Decorations rearranged.' : 'Decoration placed.', { item: { ...item }, swapped: other?.id || null });
  }
  const quote = theatreQuote(state, action, context);
  if (!quote.ok) return quote;
  if (!quote.affordable) return bad('Not enough coins for this decoration improvement.', 'not-enough-coins', { quote });
  if (action.type === 'theatreBeginUpgradeAd') {
    if (!quote.requiresAd) return bad('This improvement does not require an advertisement.', 'ad-not-required', { quote });
    if (theatre.pendingUpgrade) return bad('Finish or cancel the current decoration advertisement.', 'ad-pending');
    const nonce = `theatre-ad-${++theatre.sequence}`;
    theatre.pendingUpgrade = { nonce, id: item.id, targetLevel: quote.targetLevel, coins: quote.coins, startedAt: clock(state) };
    return good('Watch the complete advertisement to improve this decoration.', { nonce, quote });
  }
  if (quote.requiresAd) return bad('This improvement requires coins and a completed advertisement.', 'ad-required', { quote });
  state.resources.coins -= quote.coins; item.level = quote.targetLevel;
  return good('Decoration improved.', { item: { ...item }, coins: quote.coins });
}

export function nextTheatreEvent(state) {
  const pending = current(state).pendingUpgrade;
  return pending ? Math.max(0, THEATRE_RULES.adIntentSeconds - (clock(state) - pending.startedAt) / 1000) : Infinity;
}
export function advanceTheatre(state, _seconds) {
  const theatre = current(state);
  if (theatre.pendingUpgrade && clock(state) - theatre.pendingUpgrade.startedAt >= THEATRE_RULES.adIntentSeconds * 1000) theatre.pendingUpgrade = null;
}
export { localizedName as theatreDecorationName };
