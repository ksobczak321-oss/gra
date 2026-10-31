import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, onboardingStatus, act, tick, advanceTo, recordVisit, islandCalendar, welcomeStatus, requestUpgrade } from '../harborlight-v1-state.js';
import { tutorialStatus, registerMeaningfulActivity, recordProgressionLogin } from '../harborlight-v1-progression.js';
import { advanceEngagementSchedule } from '../harborlight-v1-engagement.js';

const NOW = Date.parse('2026-10-30T21:40:00Z');
const HOUR = 3600000;
const starter = () => createState(NOW, { onboarding: true });
const json = state => JSON.parse(JSON.stringify(state));
function nameIsland(state, at = NOW) {
  assert.equal(act(state, { type: 'onboardingNext' }, at).ok, true);
  assert.equal(act(state, { type: 'onboardingName', name: '  Wyspa  Światła  ' }, at).ok, true);
}

test('first-time introduction keeps the starter world and all clocks frozen', () => {
  const state = starter(), before = json(state);
  assert.deepEqual(onboardingStatus(state), { pending: true, stage: 'intro', index: 0, worldStartedAt: null, completedAt: null });
  tick(state, 100 * HOUR / 1000);
  assert.equal(advanceTo(state, NOW + 100 * HOUR), 0);
  assert.equal(recordVisit(state, NOW + 100 * HOUR), false);
  assert.equal(recordProgressionLogin(state, NOW + 100 * HOUR), false);
  assert.equal(registerMeaningfulActivity(state, { visible: true, focused: true }), false);
  advanceEngagementSchedule(state, 100 * HOUR / 1000, { visible: true, focused: true });
  assert.deepEqual(json(state), before);
  assert.equal(tutorialStatus(state).shouldAutoOpen, false);
  assert.equal(welcomeStatus(state).remaining, 72 * 3600);
});

test('gameplay and ordinary tutorial commands cannot execute behind the introduction', () => {
  const state = starter(), before = json(state);
  for (const action of [
    { type: 'assign', building: 'farm', delta: 1 }, { type: 'upgrade', building: 'townhall' },
    { type: 'renameIsland', name: 'Bypass' }, { type: 'tutorialVisit', subject: 'farm' },
    { type: 'dismissTutorial' }, { type: 'blessing' }, { type: 'claimLoyalty' }
  ]) assert.equal(act(state, action, NOW).ok, false, action.type);
  assert.equal(requestUpgrade(state, { building: 'townhall' }).ok, false);
  assert.equal(act(state, { type: 'userActivity', visible: true, focused: true }, NOW).ok, true);
  assert.deepEqual(json(state), before, 'onboarding input did not count as a tutorial or island action');
  assert.equal(act(state, { type: 'setting', key: 'language', value: 'pl' }, NOW).ok, true);
  assert.deepEqual(state.tutorial, before.tutorial);
  assert.deepEqual(state.engagementSchedule, before.engagementSchedule);
});

test('name validation and tour arrows persist without allowing an unnamed start', () => {
  const state = starter();
  assert.equal(act(state, { type: 'onboardingFinish' }, NOW).ok, false);
  assert.equal(act(state, { type: 'onboardingUpdate', stage: 'tour', index: 0 }, NOW).ok, false);
  for (const name of ['', 'a', '<script>', 'x'.repeat(41), 'A\u0000B']) {
    const before = json(state);
    assert.equal(act(state, { type: 'onboardingName', name }, NOW).ok, false);
    assert.deepEqual(json(state), before);
  }
  nameIsland(state);
  assert.equal(state.islandName, 'Wyspa Światła');
  assert.equal(act(state, { type: 'onboardingUpdate', stage: 'tour', index: 12 }, NOW).ok, true);
  let restored = normalizeState(json(state), NOW + 48 * HOUR);
  assert.equal(onboardingStatus(restored).index, 12);
  assert.equal(onboardingStatus(restored).stage, 'tour');
  assert.equal(restored.islandName, state.islandName);
  assert.equal(restored.worldTimeMs, NOW);
  assert.deepEqual(restored.resources, state.resources);
  assert.equal(act(restored, { type: 'onboardingStep', step: 11 }, NOW + 48 * HOUR).ok, true);
  assert.equal(onboardingStatus(restored).index, 11);
  assert.equal(act(restored, { type: 'onboardingUpdate', stage: 'name', index: 0 }, NOW + 48 * HOUR).ok, true);
  assert.equal(restored.islandName, 'Wyspa Światła');
});

test('finishing or leaving the tour starts day one once at the real completion time', () => {
  let state = starter();
  nameIsland(state);
  const goods = { ...state.resources }, residents = json(state.residents);
  const goodDelay = state.worldEvents.nextGoodAt - NOW;
  const badDelay = state.worldEvents.nextBadAt === null ? null : state.worldEvents.nextBadAt - NOW;
  state = normalizeState(json(state), NOW + 100 * HOUR);
  assert.equal(advanceTo(state, NOW + 100 * HOUR), 0);
  assert.equal(act(state, { type: 'onboardingFinish' }, NOW + 100 * HOUR).ok, true);
  const start = NOW + 100 * HOUR;
  assert.deepEqual(onboardingStatus(state), { pending: false, stage: 'complete', index: 0, worldStartedAt: start, completedAt: start });
  assert.equal(state.islandStartedAt, start);
  assert.equal(state.worldTimeMs, start);
  assert.equal(state.lastSimulatedAt, start);
  assert.equal(state.activityEpochMs, start);
  assert.equal(state.engagement.firstAnchorAt, start);
  assert.equal(state.engagement.lastRealActivityAt, start);
  assert.equal(state.worldEvents.clockMs, start);
  assert.equal(state.worldEvents.nextGoodAt - start, goodDelay);
  assert.equal(state.worldEvents.nextBadAt === null ? null : state.worldEvents.nextBadAt - start, badDelay);
  assert.equal(welcomeStatus(state).remaining, 72 * 3600);
  assert.equal(islandCalendar(state).day, 1);
  assert.equal(state.activityClock, 0);
  assert.equal(state.engagementSchedule.activeSeconds, 0);
  assert.deepEqual(state.resources, goods);
  assert.deepEqual(state.residents, residents);
  assert.equal(tutorialStatus(state).shouldAutoOpen, true);
  const confirmed = json(state);
  assert.equal(act(state, { type: 'onboardingFinish' }, start + HOUR).ok, false);
  assert.equal(act(state, { type: 'onboardingUpdate', stage: 'intro', index: 0 }, start + HOUR).ok, false);
  assert.deepEqual(json(state), confirmed);
  assert.equal(advanceTo(state, start + 60 * 1000), 60);
  assert.equal(state.activityClock, 60);
  assert.ok(state.resources.food < goods.food, 'ordinary food consumption starts after the tour');
});

test('legacy cloud islands retain their tutorial, resources and crew without introductory replay', () => {
  const old = createState(NOW);
  assert.equal(act(old, { type: 'assign', building: 'farm', delta: 1 }, NOW).ok, true);
  old.tutorial.autoOpenDisabled = true;
  old.islandName = 'Stara Wyspa';
  old.resources.coins = 872;
  old.statistics.traded = 7;
  delete old.onboarding;
  delete old.islandStartedAt;
  const state = normalizeState(json(old), NOW + HOUR);
  assert.equal(onboardingStatus(state).pending, false);
  assert.equal(state.islandName, 'Stara Wyspa');
  assert.equal(state.resources.coins, 872);
  assert.equal(state.statistics.traded, 7);
  assert.equal(state.buildings.farm.workers, 1);
  assert.deepEqual(state.tutorial.completed, old.tutorial.completed);
  assert.deepEqual(state.tutorial.claimed, old.tutorial.claimed);
  assert.deepEqual(state.tutorial.events, old.tutorial.events);
  assert.equal(state.tutorial.autoOpenDisabled, true);
  assert.equal(advanceTo(state, NOW + HOUR), 3600);
  assert.equal(act(state, { type: 'onboardingUpdate', stage: 'intro', index: 0 }, NOW + HOUR).ok, false);
});

test('finishing a recreated island cannot renew inherited account welcome or entitlements', () => {
  const state = starter();
  state.welcome = { startedAt: NOW - 1000 * HOUR, until: NOW - 928 * HOUR };
  state.premium.expiresAt = NOW + HOUR;
  state.engagementSchedule.initialCompleted = true;
  state.engagementSchedule.initialAnchored = true;
  state.engagementSchedule.initialBonusClaimed = true;
  state.engagementSchedule.activeSeconds = 9000;
  state.engagementSchedule.nextAt = 12000;
  const welcome = json(state.welcome), schedule = json(state.engagementSchedule), commerce = json(state.commerce), premium = json(state.premium);
  nameIsland(state);
  assert.equal(act(state, { type: 'onboardingFinish' }, NOW + 100 * HOUR).ok, true);
  assert.deepEqual(state.welcome, welcome);
  assert.equal(welcomeStatus(state).active, false);
  assert.deepEqual(state.engagementSchedule, schedule);
  assert.deepEqual(state.commerce, commerce);
  assert.deepEqual(state.premium, premium);
});
