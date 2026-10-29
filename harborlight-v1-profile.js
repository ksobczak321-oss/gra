// Shared local island identity. No account credentials or authentication live here.
export const MAIN_SAVE_KEY = 'harborlight-v1-interactive-save';
export const NEW_PLAYER_SAVE_KEY = 'harborlight-v1-new-player-save';
export const ISLAND_NAME_PREFERENCE_PREFIX = 'harborlight-island-name:';

export function validateIslandName(value) {
  const name = typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/gu, ' ') : '';
  const length = [...name].length;
  if (length < 2 || length > 40 || /[<>\p{Cc}\p{Cf}]/u.test(name)) {
    return { ok: false, name: '', message: 'Choose an island name with 2–40 characters, without control characters or angle brackets.' };
  }
  return { ok: true, name, message: 'Your island name has been saved.' };
}

export function normalizeIslandName(value) {
  return validateIslandName(value).name;
}

export function islandDisplayName(state, language = 'en') {
  return normalizeIslandName(state?.islandName) || (language === 'pl' ? 'Twoja wyspa' : 'Your island');
}

export function profileContext(search = '') {
  const parameters = new URLSearchParams(search);
  const newPlayer = parameters.get('profile') === 'new-player';
  const requestedSlot = parameters.get('slot') || '';
  const slot = newPlayer && /^[a-z0-9-]{1,40}$/.test(requestedSlot) ? requestedSlot : '';
  const saveKey = newPlayer ? `${NEW_PLAYER_SAVE_KEY}${slot ? `-${slot}` : ''}` : MAIN_SAVE_KEY;
  const requestedVersion = parameters.get('v') || '';
  const version = /^frontend-v\d+$/.test(requestedVersion) ? requestedVersion : '';
  return { newPlayer, slot, saveKey, version };
}

function route(file, search, mode) {
  const context = profileContext(search);
  const parameters = new URLSearchParams();
  if (context.newPlayer) parameters.set('profile', 'new-player');
  // A visit from the legacy main island must remain distinguishable from a
  // standalone account page, whose default is a normal starter island.
  else if (file === 'harborlight-auth.html' || new URLSearchParams(search).get('profile') === 'preview') parameters.set('profile', 'preview');
  if (context.slot) parameters.set('slot', context.slot);
  if (context.version) parameters.set('v', context.version);
  if (['register', 'login'].includes(mode)) parameters.set('mode', mode);
  return `${file}${parameters.size ? `?${parameters}` : ''}`;
}

export const gameHref = (search = '') => route('harborlight-v1-layered.html', search);
export const authHref = (search = '', mode) => route('harborlight-auth.html', search, mode);
export function authProfileSearch(search = '') {
  const incoming = new URLSearchParams(search);
  if (!['new-player', 'preview'].includes(incoming.get('profile'))) incoming.set('profile', 'new-player');
  const context = profileContext(incoming);
  const parameters = new URLSearchParams({ profile: context.newPlayer ? 'new-player' : 'preview' });
  if (context.slot) parameters.set('slot', context.slot);
  if (context.version) parameters.set('v', context.version);
  if (['register', 'login'].includes(incoming.get('mode'))) parameters.set('mode', incoming.get('mode'));
  return `?${parameters}`;
}
export const islandNamePreferenceKey = (search = '') => ISLAND_NAME_PREFERENCE_PREFIX + profileContext(search).saveKey;
const timestamp = value => Number.isFinite(value) && value >= 0 ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value)) : 0;

export function normalizeIslandProfile(state, raw = {}) {
  state.islandName = normalizeIslandName(raw.islandName);
  state.islandNameUpdatedAt = state.islandName ? timestamp(raw.islandNameUpdatedAt) : 0;
  return state;
}

export function saveIslandNamePreference(storage, search, value, now = Date.now()) {
  const result = validateIslandName(value);
  if (!result.ok) return result;
  try {
    storage.setItem(islandNamePreferenceKey(search), JSON.stringify({ name: result.name, updatedAt: timestamp(now) }));
    return { ...result, updatedAt: timestamp(now) };
  } catch {
    return { ok: false, name: '', message: 'Your browser could not save the island name. Allow local storage and try again.' };
  }
}

// Apply a registration choice only to the selected island, without touching its
// materials, clocks, residents or other profiles. Gameplay saves it normally.
export function applyIslandNamePreference(state, storage, search = '') {
  let saved;
  try { saved = JSON.parse(storage.getItem(islandNamePreferenceKey(search))); } catch { return false; }
  const name = normalizeIslandName(saved?.name);
  const updatedAt = timestamp(saved?.updatedAt);
  if (!name || updatedAt < timestamp(state.islandNameUpdatedAt)) return false;
  const changed = state.islandName !== name || state.islandNameUpdatedAt !== updatedAt;
  state.islandName = name;
  state.islandNameUpdatedAt = updatedAt;
  return changed;
}
