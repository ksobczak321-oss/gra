import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAIN_SAVE_KEY, NEW_PLAYER_SAVE_KEY, profileContext, gameHref, authHref, authProfileSearch,
  validateIslandName, normalizeIslandName, islandDisplayName, normalizeIslandProfile,
  islandNamePreferenceKey, saveIslandNamePreference, applyIslandNamePreference
} from '../harborlight-v1-profile.js';
import { createState, normalizeState, act } from '../harborlight-v1-state.js';

const NOW = Date.parse('2026-10-29T12:00:00Z');
const QUERY = '?profile=new-player&slot=start-20261029&v=frontend-v15';
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
}

test('island names normalize Unicode and whitespace without translating user text', () => {
  assert.equal(normalizeIslandName('  Z\u0307ółwia   Zatoka  '), 'Żółwia Zatoka');
  assert.equal(normalizeIslandName('Saint-Pierre & Łódź'), 'Saint-Pierre & Łódź');
  assert.equal(islandDisplayName({ islandName: 'Food' }, 'pl'), 'Food');
  assert.equal(islandDisplayName({ islandName: 'Your island' }, 'pl'), 'Your island');
  assert.equal(islandDisplayName({ islandName: 'Twoja wyspa' }, 'en'), 'Twoja wyspa');
});

test('invalid names cannot enter island identity or a preference', () => {
  for (const value of [null, {}, 'a', ' ', 'a'.repeat(41), '<img src=x>', 'Bad\u0000Name', 'Bad\u202EName']) {
    assert.equal(validateIslandName(value).ok, false, String(value));
    assert.equal(normalizeIslandName(value), '');
  }
  assert.equal(validateIslandName('ab').ok, true);
  assert.equal(validateIslandName('a'.repeat(40)).ok, true);
});

test('unnamed islands use language-specific defaults and malformed saves are normalized', () => {
  assert.equal(islandDisplayName({}, 'en'), 'Your island');
  assert.equal(islandDisplayName({}, 'pl'), 'Twoja wyspa');
  const value = normalizeIslandProfile({}, { islandName: '<b>Bad</b>', islandNameUpdatedAt: 999 });
  assert.deepEqual(value, { islandName: '', islandNameUpdatedAt: 0 });
});

test('profile routes retain the selected island and strip unrelated query parameters', () => {
  assert.deepEqual(profileContext(QUERY), { newPlayer: true, slot: 'start-20261029', saveKey: NEW_PLAYER_SAVE_KEY + '-start-20261029', version: 'frontend-v15' });
  assert.equal(gameHref(QUERY + '&mode=register&redirect=https://example.com'), 'harborlight-v1-layered.html' + QUERY);
  assert.equal(authHref(QUERY, 'register'), 'harborlight-auth.html' + QUERY + '&mode=register');
  assert.equal(gameHref(''), 'harborlight-v1-layered.html');
  assert.equal(profileContext('?slot=other').saveKey, MAIN_SAVE_KEY);
});

test('invalid slots cannot redirect a name choice to arbitrary keys', () => {
  assert.equal(profileContext('?profile=new-player&slot=%3Cscript%3E').saveKey, NEW_PLAYER_SAVE_KEY);
  assert.equal(profileContext('?profile=new-player&slot=' + 'x'.repeat(41)).saveKey, NEW_PLAYER_SAVE_KEY);
  assert.equal(profileContext('?profile=new-player&slot=x&v=https://example.com').version, '');
  assert.notEqual(islandNamePreferenceKey(QUERY), islandNamePreferenceKey(''));
});

test('standalone registration returns to a normal island without the preview grant', () => {
  const resolved = authProfileSearch('?mode=register&v=frontend-v15');
  assert.equal(resolved, '?profile=new-player&v=frontend-v15&mode=register');
  assert.equal(gameHref(resolved), 'harborlight-v1-layered.html?profile=new-player&v=frontend-v15');
  assert.equal(profileContext(resolved).saveKey, NEW_PLAYER_SAVE_KEY);
  assert.equal(profileContext(authProfileSearch('?profile=unknown&slot=first')).newPlayer, true);
});

test('account links from a legacy main island explicitly preserve that profile', () => {
  assert.equal(authHref(''), 'harborlight-auth.html?profile=preview');
  assert.equal(authHref('?v=frontend-v15', 'register'), 'harborlight-auth.html?profile=preview&v=frontend-v15&mode=register');
  const resolved = authProfileSearch('?profile=preview&v=frontend-v15&mode=register');
  assert.equal(profileContext(resolved).saveKey, MAIN_SAVE_KEY);
  assert.equal(gameHref(resolved), 'harborlight-v1-layered.html?profile=preview&v=frontend-v15');
  assert.equal(authProfileSearch(QUERY + '&mode=register'), QUERY + '&mode=register');
});

test('registration name preferences touch only the selected noncredential key', () => {
  const storage = memoryStorage({ [MAIN_SAVE_KEY]: 'old-game', [NEW_PLAYER_SAVE_KEY]: 'old-new-player' });
  const result = saveIslandNamePreference(storage, QUERY, ' Żółwia  Zatoka ', NOW);
  assert.equal(result.ok, true);
  assert.equal(result.name, 'Żółwia Zatoka');
  assert.equal(storage.getItem(MAIN_SAVE_KEY), 'old-game');
  assert.equal(storage.getItem(NEW_PLAYER_SAVE_KEY), 'old-new-player');
  assert.equal(storage.values.size, 3);
  assert.deepEqual(JSON.parse(storage.getItem(islandNamePreferenceKey(QUERY))), { name: 'Żółwia Zatoka', updatedAt: NOW });
});

test('rejected names and failed storage do not report a saved preference', () => {
  const storage = memoryStorage();
  assert.equal(saveIslandNamePreference(storage, QUERY, '<bad>', NOW).ok, false);
  assert.equal(storage.values.size, 0);
  const unavailable = { setItem() { throw new Error('disabled'); } };
  assert.equal(saveIslandNamePreference(unavailable, QUERY, 'Good name', NOW).ok, false);
});

test('a local registration choice applies once logically without changing gameplay data', () => {
  const state = createState(NOW);
  const before = structuredClone(state);
  const storage = memoryStorage();
  saveIslandNamePreference(storage, QUERY, 'Food', NOW + 1);
  assert.equal(applyIslandNamePreference(state, storage, QUERY), true);
  assert.equal(state.islandName, 'Food');
  assert.equal(state.islandNameUpdatedAt, NOW + 1);
  assert.equal(applyIslandNamePreference(state, storage, QUERY), false);
  const { islandName, islandNameUpdatedAt, ...rest } = state;
  const { islandName: oldName, islandNameUpdatedAt: oldAt, ...oldRest } = before;
  assert.deepEqual(rest, oldRest);
});

test('another profile cannot consume a scoped naming choice', () => {
  const storage = memoryStorage();
  saveIslandNamePreference(storage, QUERY, 'Only this island', NOW);
  const state = createState(NOW);
  assert.equal(applyIslandNamePreference(state, storage, '?profile=new-player&slot=another'), false);
  assert.equal(state.islandName, '');
});

test('older or malformed preferences do not overwrite a newer island name', () => {
  const state = { islandName: 'New name', islandNameUpdatedAt: NOW + 10 };
  const storage = memoryStorage();
  saveIslandNamePreference(storage, QUERY, 'Old name', NOW);
  assert.equal(applyIslandNamePreference(state, storage, QUERY), false);
  storage.setItem(islandNamePreferenceKey(QUERY), '{not-json');
  assert.equal(applyIslandNamePreference(state, storage, QUERY), false);
  storage.setItem(islandNamePreferenceKey(QUERY), JSON.stringify({ name: '<bad>', updatedAt: NOW + 20 }));
  assert.equal(applyIslandNamePreference(state, storage, QUERY), false);
  assert.equal(state.islandName, 'New name');
});

test('state saves preserve island names through reload and old saves remain unnamed', () => {
  const state = createState(NOW);
  assert.equal(state.islandName, '');
  assert.equal(act(state, { type: 'renameIsland', name: ' Żółwia  Zatoka ' }, NOW + 100).ok, true);
  const loaded = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
  assert.equal(loaded.islandName, 'Żółwia Zatoka');
  assert.equal(loaded.islandNameUpdatedAt, NOW + 100);
  const oldSave = JSON.parse(JSON.stringify(state));
  delete oldSave.islandName; delete oldSave.islandNameUpdatedAt;
  assert.equal(normalizeState(oldSave, NOW).islandName, '');
});

test('invalid rename actions leave name, timestamp and resources unchanged', () => {
  const state = createState(NOW);
  act(state, { type: 'renameIsland', name: 'Existing name' }, NOW);
  const resources = structuredClone(state.resources);
  assert.equal(act(state, { type: 'renameIsland', name: '<bad>' }, NOW + 100).ok, false);
  assert.equal(state.islandName, 'Existing name');
  assert.equal(state.islandNameUpdatedAt, NOW);
  assert.deepEqual(state.resources, resources);
});
