import test from 'node:test';
import assert from 'node:assert/strict';
import { createStarterIsland } from '../server.mjs';
import { normalizeState, onboardingStatus, advanceTo, act, welcomeStatus } from '../../harborlight-v1-state.js';

test('server-owned first island stays frozen through delayed first entry until the named tour ends', () => {
  const now = Date.parse('2026-10-30T12:00:00Z');
  const raw = JSON.parse(createStarterIsland(now));
  assert.equal(raw.islandStartedAt, null);
  assert.deepEqual(raw.onboarding, { version: 1, stage: 'intro', index: 0, worldStartedAt: null, completedAt: null });
  const after = now + 96 * 3600000;
  const state = normalizeState(raw, after);
  assert.equal(onboardingStatus(state).pending, true);
  assert.equal(advanceTo(state, after), 0);
  assert.equal(state.resources.food, 100);
  assert.equal(state.population, 12);
  assert.equal(act(state, { type: 'onboardingName', name: 'Nowa Wyspa' }, after).ok, true);
  assert.equal(act(state, { type: 'onboardingFinish' }, after).ok, true);
  assert.equal(state.worldTimeMs, after);
  assert.equal(welcomeStatus(state).remaining, 72 * 3600);
});
