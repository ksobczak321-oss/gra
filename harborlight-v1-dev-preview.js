// An explicit, session-only test scenario. It never reads or changes an account.
// State factories are injected so this module cannot load a cloud save or start
// network requests. The normal new-player path does not call this factory.
export const DEV_LEVEL_FIVE_PREVIEW = Object.freeze({
  id: 'admin1-level5',
  label: 'Podgląd DEV · admin1 · poziom 5',
  notice: 'Podgląd testowy bez logowania. Postęp pozostaje w tej karcie; odświeżenie przywróci scenariusz poziomu 5.',
  townhallLevel: 5
});

export function isDevPreviewLocation(hostname = '', pathname = '') {
  if (hostname === 'ksobczak321-oss.github.io') return pathname === '/gra/harborlight-v1-layered.html';
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname) && pathname === '/harborlight-v1-layered.html';
}

export function createRequestedDevPreview({
  search = '', hostname = '', pathname = '', authenticated = true,
  now = Date.now(), createState, settleDevelopment
} = {}) {
  if (authenticated !== false || !isDevPreviewLocation(hostname, pathname) ||
      new URLSearchParams(search).get('preview') !== DEV_LEVEL_FIVE_PREVIEW.id) return null;
  if (typeof createState !== 'function' || typeof settleDevelopment !== 'function') {
    throw new TypeError('The DEV preview requires the normal state and development factories.');
  }
  const state = createState(now, { onboarding: false, ruleset: 32 });
  if (state.ruleset !== 32) throw new TypeError('The DEV preview requires development ruleset 32.');
  for (const building of Object.values(state.buildings)) building.level = Math.max(1, building.level || 0);
  for (const id of ['townhall', 'house', 'warehouse', 'fisher']) state.buildings[id].level = 5;
  state.capacity = 180;
  state.highestTownhall = 5;
  state.islandName = DEV_LEVEL_FIVE_PREVIEW.label;
  state.islandNameUpdatedAt = now;
  state.settings.language = 'pl';
  state.tutorial.autoOpenDisabled = true;
  state.paused = false;
  state.objective.repaired = true;
  Object.assign(state.resources, {
    coins: 5000, wood: 5000, stone: 5000, planks: 5000, grain: 5000,
    flour: 1000, vegetables: 2000, fish: 200
  });
  // Use the same unlock and one-time founding grants as an ordinary TH5 world.
  // No completed discovery, course, task or reward is manufactured here.
  settleDevelopment(state);
  return state;
}
