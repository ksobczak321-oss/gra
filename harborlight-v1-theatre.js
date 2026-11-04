// The Theatre is a permanent, single-level meeting place. Decorations are
// individual possessions: moving them never buys, duplicates or destroys them.
// Ad verification is supplied by the account/provider adapter, never an action.
export const THEATRE_RULES = Object.freeze({ version: 1, slots: 20, maxLevel: null, unlimitedLevels: true,
  adMilestones: Object.freeze([5, 10, 15, 20]), adMilestoneStep: 5, adIntentSeconds: 120,
  maxCollection: 2000, savedLayouts: 3, completionBadge: 'island-stage-pennant' });

// Atmosphere and remembered arrangements are creative tools, not purchases or
// scores. They cannot change a possession's level or create another copy.
export const THEATRE_LIGHTING = Object.freeze([
  { id: 'day', namePl: 'Słoneczny dzień', name: 'Sunny day' },
  { id: 'golden', namePl: 'Zachód słońca', name: 'Golden sunset' },
  { id: 'night', namePl: 'Wieczór przy latarniach', name: 'Lantern evening' }
].map(Object.freeze));
export const THEATRE_PAVING = Object.freeze([
  { id: 'sandstone', namePl: 'Ciepły piaskowiec', name: 'Warm sandstone' },
  { id: 'stone', namePl: 'Kamienne płyty', name: 'Stone paving' },
  { id: 'brick', namePl: 'Ceglana mozaika', name: 'Brick mosaic' }
].map(Object.freeze));
export const THEATRE_DEFAULT_ATMOSPHERE = Object.freeze({ lighting: 'day', paving: 'sandstone' });
// Positions are coordinates in the illustrated 1000×700 courtyard. Slots remain
// stable possession tokens for older saves, rather than a visible placement grid.
export const THEATRE_GARDEN_BOUNDS = Object.freeze({ left: 150, right: 850, top: 310, bottom: 600 });
export const THEATRE_PLACEMENT_POINTS = Object.freeze([
  [270,310],[423,310],[577,310],[730,310], [230,375],[410,375],[590,375],[770,375],
  [220,440],[407,440],[593,440],[780,440], [230,505],[410,505],[590,505],[770,505],
  [280,575],[430,575],[580,575],[730,575]
].map(([x,y], slot) => Object.freeze({ slot, x, y })));
export const THEATRE_WELCOME_GARDEN = Object.freeze([
  ['tree', 'garden', 0], ['flowerbed', 'garden', 3], ['bench', 'coastal', 5],
  ['fountain', 'marble', 10], ['lantern', 'coastal', 12], ['flowerbed', 'garden', 19]
].map(([type,style,slot]) => Object.freeze({ type, style, slot })));

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
  'This improvement requires coins and a completed advertisement.': 'To ulepszenie wymaga monet i obejrzenia całej reklamy.',
  'Choose daylight, sunset or lantern evening and an available paving.': 'Wybierz dzień, zachód słońca lub wieczór przy latarniach oraz dostępną posadzkę.',
  'The garden atmosphere has changed.': 'Ogród ma już nowy nastrój.',
  'Choose one of the three remembered arrangements.': 'Wybierz jeden z trzech zapisanych pomysłów.',
  'Your garden arrangement has been remembered.': 'Twój pomysł na ogród został zapisany.',
  'There is no saved arrangement in this place yet.': 'W tym miejscu nie ma jeszcze zapisanego pomysłu.',
  'Your remembered garden arrangement is ready.': 'Ogród wygląda już tak jak w zapisanym pomyśle.',
  'The remembered arrangement has been removed. Your decorations are preserved.': 'Zapisany pomysł został usunięty. Wszystkie dekoracje pozostają Twoje.',
  'The next decoration level cannot be represented safely.': 'Ten poziom wykracza poza obsługiwany zakres zapisu. Dekoracja i monety pozostają bez zmian.',
  'The decoration price exceeds the supported coin range.': 'Cena tego ulepszenia przekracza obsługiwany zakres monet. Dekoracja i monety pozostają bez zmian.'
  , 'Choose a point inside the Theatre garden.': 'Wskaż miejsce na placu przed Teatrem.',
  'The garden already contains twenty decorations. Store one before adding another.': 'Na placu jest już dwadzieścia ozdób. Odłóż jedną do kolekcji, aby ustawić kolejną.',
  'Your welcome garden is ready. Its decorations are yours to rearrange and improve.': 'Twój powitalny ogród jest gotowy. Możesz przestawiać i ulepszać jego ozdoby.',
  'Your welcome garden was already received.': 'Powitalny ogród został już odebrany.'
});

const catalog = new Map(THEATRE_DECORATIONS.map(item => [item.id, item]));
const styles = new Set(THEATRE_STYLES.map(item => item.id));
const lightingIds = new Set(THEATRE_LIGHTING.map(item => item.id));
const pavingIds = new Set(THEATRE_PAVING.map(item => item.id));
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const slotValid = value => integer(value) && value < THEATRE_RULES.slots;
const layoutSlotValid = value => integer(value) && value < THEATRE_RULES.savedLayouts;
const pointValid = value => object(value) && Number.isFinite(value.x) && Number.isFinite(value.y) &&
  value.x >= THEATRE_GARDEN_BOUNDS.left && value.x <= THEATRE_GARDEN_BOUNDS.right &&
  value.y >= THEATRE_GARDEN_BOUNDS.top && value.y <= THEATRE_GARDEN_BOUNDS.bottom;
const cleanPoint = value => ({ x: Math.round(value.x * 10) / 10, y: Math.round(value.y * 10) / 10 });
const defaultPoint = slot => ({ x: THEATRE_PLACEMENT_POINTS[slot].x, y: THEATRE_PLACEMENT_POINTS[slot].y });
const AD_RECEIPT_HISTORY = 2000;
const clock = state => Number.isFinite(state.worldTimeMs) ? state.worldTimeMs : 0;
const good = (message, details = {}) => ({ ok: true, message, ...details });
const bad = (message, code = 'invalid', details = {}) => ({ ok: false, message, code, ...details });
const localizedName = (id, language = 'pl') => catalog.get(id)?.[language === 'en' ? 'name' : 'namePl'] || id;
const price = (kind, level) => {
  const coins = 5 * Math.ceil((level === 1 ? 25 : 12 * level ** 1.35) * catalog.get(kind).priceWeight / 5);
  return Number.isSafeInteger(coins) && coins > 0 ? coins : null;
};
export const requiresTheatreAdvertisement = level => Number.isSafeInteger(level) && level > 1 && level % THEATRE_RULES.adMilestoneStep === 0;

function normalizeAtmosphere(source) {
  return { lighting: lightingIds.has(source?.lighting) ? source.lighting : THEATRE_DEFAULT_ATMOSPHERE.lighting,
    paving: pavingIds.has(source?.paving) ? source.paving : THEATRE_DEFAULT_ATMOSPHERE.paving };
}

function normalizePositions(source, collection) {
  return Object.fromEntries(collection.filter(item => item.slot !== null).map(item => [item.id,
    pointValid(source?.[item.id]) ? cleanPoint(source[item.id]) : defaultPoint(item.slot)]));
}
export function theatrePosition(state, item) {
  if (!item || !slotValid(item.slot)) return null;
  const value = state.theatre?.positions?.[item.id];
  return pointValid(value) ? cleanPoint(value) : defaultPoint(item.slot);
}

function normalizeLayouts(source, collection, now) {
  const available = new Map(collection.map(item => [item.id, item]));
  return Array.from({ length: THEATRE_RULES.savedLayouts }, (_, index) => {
    const saved = Array.isArray(source) ? source[index] : null;
    if (!object(saved)) return null;
    const ids = new Set(), slots = new Set(), placements = [];
    // A saved scene contains only installed possessions. Levels, prices and
    // ownership in imported snapshots are deliberately never retained.
    for (const entry of (Array.isArray(saved.placements) ? saved.placements : []).slice(0, THEATRE_RULES.slots)) {
      if (!object(entry) || !available.has(entry.id) || ids.has(entry.id) || !slotValid(entry.slot) || slots.has(entry.slot)) continue;
      ids.add(entry.id); slots.add(entry.slot);
      placements.push({ id: entry.id, slot: entry.slot,
        style: styles.has(entry.style) ? entry.style : available.get(entry.id).style });
    }
    return { savedAt: Number.isFinite(saved.savedAt) && saved.savedAt >= 0 ? Math.min(now, saved.savedAt) : now,
      atmosphere: normalizeAtmosphere(saved.atmosphere), placements,
      positions: normalizePositions(saved.positions, placements) };
  });
}

function cloneLayout(layout) {
  return layout ? { savedAt: layout.savedAt, atmosphere: { ...layout.atmosphere },
    placements: layout.placements.map(entry => ({ ...entry })),
    positions: Object.fromEntries(Object.entries(layout.positions || {}).map(([id, point]) => [id, { ...point }])) } : null;
}

export function normalizeTheatre(state, raw = state) {
  const saved = object(raw?.theatre) ? raw.theatre : {}, ids = new Set(), slots = new Set();
  const collection = [];
  for (const entry of (Array.isArray(saved.collection) ? saved.collection : []).slice(0, THEATRE_RULES.maxCollection)) {
    if (!object(entry) || !/^decoration-[1-9]\d{0,12}$/.test(entry.id || '') || ids.has(entry.id) || !catalog.has(entry.type)) continue;
    ids.add(entry.id);
    const slot = slotValid(entry.slot) && !slots.has(entry.slot) ? entry.slot : null;
    if (slot !== null) slots.add(slot);
    collection.push({ id: entry.id, type: entry.type, level: integer(entry.level) ? Math.max(1, entry.level) : 1,
      style: styles.has(entry.style) ? entry.style : 'coastal', slot });
  }
  const sequence = Math.max(integer(saved.sequence) ? saved.sequence : 0,
    ...collection.map(item => Number(item.id.slice(11))), 0);
  const pending = saved.pendingUpgrade;
  const pendingUpgrade = object(pending) && /^theatre-ad-[1-9]\d{0,14}$/.test(pending.nonce || '') &&
    collection.some(item => item.id === pending.id && item.level + 1 === pending.targetLevel) &&
    requiresTheatreAdvertisement(pending.targetLevel) && integer(pending.coins) && Number.isFinite(pending.startedAt) &&
    clock(state) >= pending.startedAt && clock(state) - pending.startedAt < THEATRE_RULES.adIntentSeconds * 1000
    ? { nonce: pending.nonce, id: pending.id, targetLevel: pending.targetLevel, coins: pending.coins, startedAt: pending.startedAt } : null;
  state.theatre = { version: THEATRE_RULES.version, sequence, collection, pendingUpgrade,
    positions: normalizePositions(saved.positions, collection), welcomeGardenGranted: saved.welcomeGardenGranted === true,
    atmosphere: normalizeAtmosphere(saved.atmosphere), layouts: normalizeLayouts(saved.layouts, collection, clock(state)),
    adReceipts: [...new Set((Array.isArray(saved.adReceipts) ? saved.adReceipts : []).filter(id => typeof id === 'string' && id.length > 0 && id.length <= 200))].slice(-AD_RECEIPT_HISTORY),
    badges: Array.isArray(saved.badges) && saved.badges.includes(THEATRE_RULES.completionBadge) ? [THEATRE_RULES.completionBadge] : [] };
  awardCollectionBadge(state.theatre);
  return state.theatre;
}

function current(state) {
  const theatre = state.theatre || normalizeTheatre(state);
  // Hosts holding an already-running v29 world can adopt the added fields
  // without normalizing away an active advertisement or changing possessions.
  if (!lightingIds.has(theatre.atmosphere?.lighting) || !pavingIds.has(theatre.atmosphere?.paving)) theatre.atmosphere = normalizeAtmosphere(theatre.atmosphere);
  if (!Array.isArray(theatre.layouts) || theatre.layouts.length !== THEATRE_RULES.savedLayouts) theatre.layouts = normalizeLayouts(theatre.layouts, theatre.collection, clock(state));
  if (!object(theatre.positions)) theatre.positions = normalizePositions(null, theatre.collection);
  return theatre;
}
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
    if (Object.hasOwn(action, 'x') || Object.hasOwn(action, 'y')) {
      if (!pointValid(action)) return bad('Choose a point inside the Theatre garden.', 'invalid-position');
      if (theatre.collection.filter(item => item.slot !== null).length >= THEATRE_RULES.slots) return bad('The garden already contains twenty decorations. Store one before adding another.', 'garden-full');
    }
    const coins = price(action.decoration, 1);
    return good('Decoration price.', { coins, targetLevel: 1, requiresAd: false, affordable: canSpend(state, coins) });
  }
  const item = theatre.collection.find(entry => entry.id === action.id);
  if (!item) return bad('This decoration is not in your collection.', 'not-owned');
  if (!integer(item.level) || item.level < 1 || !Number.isSafeInteger(item.level + 1)) return bad('The next decoration level cannot be represented safely.', 'level-out-of-range');
  const targetLevel = item.level + 1, coins = price(item.type, targetLevel);
  if (coins === null) return bad('The decoration price exceeds the supported coin range.', 'price-out-of-range');
  return good('Decoration improvement price.', { id: item.id, targetLevel, coins,
    requiresAd: requiresTheatreAdvertisement(targetLevel) && context.noAds !== true,
    affordable: canSpend(state, coins) });
}

export function theatreStatus(state, context = {}) {
  const theatre = current(state), placed = theatre.collection.filter(item => item.slot !== null);
  return { version: THEATRE_RULES.version, maxLevel: null, unlimitedLevels: true, slots: THEATRE_RULES.slots, usedSlots: placed.length,
    atmosphere: { ...theatre.atmosphere },
    positions: Object.fromEntries(Object.entries(theatre.positions).map(([id, point]) => [id, { ...point }])),
    welcomeGardenAvailable: theatre.welcomeGardenGranted !== true && theatre.collection.length === 0,
    layouts: theatre.layouts.map(layout => layout ? { ...cloneLayout(layout), placementCount: layout.placements.length } : null),
    freeSlots: THEATRE_RULES.slots - placed.length, collection: theatre.collection.map(item => ({ ...item })),
    pendingUpgrade: theatre.pendingUpgrade ? { ...theatre.pendingUpgrade } : null, badges: [...theatre.badges],
    noAds: context.noAds === true, uniqueTypes: new Set(theatre.collection.map(item => item.type)).size,
    catalog: THEATRE_DECORATIONS.map(item => ({ ...item, coins: price(item.id, 1) })) };
}

/** Adapter context is trusted infrastructure. Never spread player action fields
 * into it. PROD requires a provider receipt confirmed outside the browser. */
export function theatreAction(state, action = {}, context = {}) {
  if (!['theatreBuy', 'theatrePlace', 'theatreMove', 'theatreRemove', 'theatreRestyle', 'theatreUpgrade',
    'theatreBeginUpgradeAd', 'theatreCompleteUpgradeAd', 'theatreCancelUpgradeAd',
    'theatreSetAtmosphere', 'theatreSaveLayout', 'theatreRestoreLayout', 'theatreDeleteLayout', 'theatreWelcomeGarden'].includes(action.type)) return null;
  const theatre = current(state);
  if (action.type === 'theatreWelcomeGarden') {
    if (theatre.welcomeGardenGranted === true) return bad('Your welcome garden was already received.', 'welcome-already-received');
    theatre.welcomeGardenGranted = true;
    if (!theatre.collection.length) for (const entry of THEATRE_WELCOME_GARDEN) {
      const item = { id: `decoration-${++theatre.sequence}`, type: entry.type, level: 1, style: entry.style, slot: entry.slot };
      theatre.collection.push(item); theatre.positions[item.id] = defaultPoint(item.slot);
    }
    return good('Your welcome garden is ready. Its decorations are yours to rearrange and improve.', { received: true, count: theatre.collection.length });
  }
  if (action.type === 'theatreSetAtmosphere') {
    const hasLighting = Object.hasOwn(action, 'lighting'), hasPaving = Object.hasOwn(action, 'paving');
    if ((!hasLighting && !hasPaving) || hasLighting && !lightingIds.has(action.lighting) || hasPaving && !pavingIds.has(action.paving)) {
      return bad('Choose daylight, sunset or lantern evening and an available paving.', 'invalid-atmosphere');
    }
    theatre.atmosphere = { lighting: hasLighting ? action.lighting : theatre.atmosphere.lighting,
      paving: hasPaving ? action.paving : theatre.atmosphere.paving };
    return good('The garden atmosphere has changed.', { atmosphere: { ...theatre.atmosphere } });
  }
  if (['theatreSaveLayout', 'theatreRestoreLayout', 'theatreDeleteLayout'].includes(action.type)) {
    if (!layoutSlotValid(action.slot)) return bad('Choose one of the three remembered arrangements.', 'invalid-layout-slot');
    if (action.type === 'theatreSaveLayout') {
      theatre.layouts[action.slot] = { savedAt: clock(state), atmosphere: { ...theatre.atmosphere },
        placements: theatre.collection.filter(item => item.slot !== null).map(item => ({ id: item.id, slot: item.slot, style: item.style })),
        positions: normalizePositions(theatre.positions, theatre.collection) };
      return good('Your garden arrangement has been remembered.', { slot: action.slot, layout: cloneLayout(theatre.layouts[action.slot]) });
    }
    if (action.type === 'theatreDeleteLayout') {
      theatre.layouts[action.slot] = null;
      return good('The remembered arrangement has been removed. Your decorations are preserved.', { slot: action.slot });
    }
    const layout = theatre.layouts[action.slot];
    if (!layout) return bad('There is no saved arrangement in this place yet.', 'layout-not-saved');
    // Revalidate against current ownership, even if the scene was saved before
    // a later purchase or an imported snapshot lost a decoration. New items
    // return to the collection; no item, coin, level or receipt is restored.
    const restored = normalizeLayouts([layout], theatre.collection, clock(state))[0];
    const placements = new Map(restored.placements.map(entry => [entry.id, entry]));
    for (const item of theatre.collection) {
      const placement = placements.get(item.id);
      item.slot = placement?.slot ?? null;
      if (placement) item.style = placement.style;
    }
    theatre.atmosphere = { ...restored.atmosphere };
    theatre.positions = normalizePositions(restored.positions, theatre.collection);
    return good('Your remembered garden arrangement is ready.', { slot: action.slot, placementCount: restored.placements.length });
  }
  if (action.type === 'theatreBuy') {
    const quote = theatreQuote(state, action, context);
    if (!quote.ok) return quote;
    if (!quote.affordable) return bad('Not enough coins for this decoration.', 'not-enough-coins', { quote });
    state.resources.coins -= quote.coins;
    const item = { id: `decoration-${++theatre.sequence}`, type: action.decoration, level: 1,
      style: action.style || 'coastal', slot: action.slot ?? null };
    if (pointValid(action)) item.slot = Array.from({ length: THEATRE_RULES.slots }, (_, index) => index).find(slot => !theatre.collection.some(entry => entry.slot === slot));
    if (item.slot !== null) theatre.positions[item.id] = pointValid(action) ? cleanPoint(action) : defaultPoint(item.slot);
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
    theatre.adReceipts.push(receipt);
    if (theatre.adReceipts.length > AD_RECEIPT_HISTORY) theatre.adReceipts.splice(0, theatre.adReceipts.length - AD_RECEIPT_HISTORY);
    theatre.pendingUpgrade = null;
    return good('Decoration improved.', { item: { ...item }, coins: quote.coins, simulated: context.devSimulation === true && context.verifiedProvider !== true });
  }
  const item = theatre.collection.find(entry => entry.id === action.id);
  if (!item) return bad('This decoration is not in your collection.', 'not-owned');
  if (action.type === 'theatreRemove') { item.slot = null; delete theatre.positions[item.id]; return good('Decoration stored. Its level is preserved.', { item: { ...item } }); }
  if (action.type === 'theatreRestyle') {
    if (!styles.has(action.style)) return bad('Choose an available style.');
    item.style = action.style; return good('Decoration style changed.', { item: { ...item } });
  }
  if (action.type === 'theatrePlace' || action.type === 'theatreMove') {
    if (Object.hasOwn(action, 'x') || Object.hasOwn(action, 'y')) {
      if (!pointValid(action)) return bad('Choose a point inside the Theatre garden.', 'invalid-position');
      const previousSlot = item.slot, previousPoint = theatrePosition(state, item);
      if (slotValid(action.slot)) {
        const displaced = theatre.collection.find(entry => entry.slot === action.slot && entry.id !== item.id);
        item.slot = action.slot;
        if (displaced) {
          displaced.slot = previousSlot;
          if (previousPoint) theatre.positions[displaced.id] = previousPoint;
          else delete theatre.positions[displaced.id];
        }
      }
      if (item.slot === null) {
        const free = Array.from({ length: THEATRE_RULES.slots }, (_, index) => index).find(slot => !theatre.collection.some(entry => entry.slot === slot));
        if (free === undefined) return bad('The garden already contains twenty decorations. Store one before adding another.', 'garden-full');
        item.slot = free;
      }
      theatre.positions[item.id] = cleanPoint(action);
      return good('Decoration placed.', { item: { ...item }, position: { ...theatre.positions[item.id] } });
    }
    if (!slotValid(action.slot)) return bad('Choose one of the twenty courtyard places.');
    const previous = item.slot, other = theatre.collection.find(entry => entry.slot === action.slot && entry.id !== item.id);
    item.slot = action.slot;
    // An installed decoration swaps with another installed decoration. Installing
    // from the collection stores the displaced item, without destroying it.
    if (other) other.slot = previous;
    theatre.positions[item.id] = defaultPoint(item.slot);
    if (other) { if (other.slot === null) delete theatre.positions[other.id]; else theatre.positions[other.id] = defaultPoint(other.slot); }
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
