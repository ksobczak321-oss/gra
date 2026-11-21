import test from 'node:test';
import assert from 'node:assert/strict';
import * as State from '../harborlight-v1-state.js';
import * as Missions from '../harborlight-v1-missions.js';
import * as Engagement from '../harborlight-v1-engagement.js';
import { PRACTICAL_TUTORIAL_ENABLED, practicalCourseBlocksMissions,
  practicalCourseBlocksInvitations } from '../harborlight-v1-learning-policy.js';

const NOW = Date.UTC(2026, 10, 21, 12);
const foreground = { visible: true, focused: true };
const courseSnapshot = state => JSON.stringify({ tutorial: state.tutorial, learning: state.learning });
const clone = value => JSON.parse(JSON.stringify(value));

function unfinishedIsland() {
  const state = State.createState(NOW);
  state.tutorial.autoOpenDisabled = false;
  state.tutorial.rewardDisabled = false;
  state.tutorial.settled = false;
  state.learning.practical = { reviewActive: true, reviewPaused: false, reviewIndex: 8 };
  return state;
}

test('build disables the practical course without changing saved lesson or review flags', () => {
  assert.equal(PRACTICAL_TUTORIAL_ENABLED, false);
  const state = unfinishedIsland(), before = courseSnapshot(state);
  assert.equal(practicalCourseBlocksMissions(state), false);
  assert.equal(practicalCourseBlocksInvitations(state), false);
  assert.equal(Engagement.learningBlocksInvitations(state), false);
  assert.equal(courseSnapshot(state), before);
});

test('an unfinished saved course does not block Lighthouse offers or accept them on the player’s behalf', () => {
  const state = unfinishedIsland();
  state.buildings.townhall.level = 2;
  const before = courseSnapshot(state), resources = clone(state.resources);
  Missions.normalizeMissions(state, {});
  Missions.advanceMissions(state, 0);
  const headline = Missions.missionHeadline(state);
  assert.equal(headline.available, true);
  assert.equal(headline.task.status, 'offered');
  assert.equal(state.lighthouseMissions.stack.at(-1).task.deadline, null);
  assert.equal(courseSnapshot(state), before);
  assert.deepEqual(state.resources, resources);
  assert.deepEqual(state.lighthouseMissions.receipts, []);
});

test('mission prerequisites still require Town Hall 2 and a started world', () => {
  for (const onboarding of [false, true]) {
    const state = State.createState(NOW, { onboarding });
    if (onboarding) state.buildings.townhall.level = 2;
    Missions.normalizeMissions(state, {});
    Missions.advanceMissions(state, 0);
    assert.equal(Missions.missionHeadline(state).available, false);
    assert.equal(state.lighthouseMissions.stack.length, 0);
  }
});

test('hidden practical review does not hold due ordinary invitations or award a reward', () => {
  const state = unfinishedIsland(), before = courseSnapshot(state), resources = clone(state.resources);
  Engagement.advanceEngagementSchedule(state, state.engagementSchedule.initialAt, foreground);
  const offer = Engagement.engagementOfferStatus(state);
  assert.equal(offer.pending, true);
  assert.equal(offer.blocked, false);
  assert.equal(offer.started, false);
  assert.equal(courseSnapshot(state), before);
  assert.deepEqual(state.resources, resources);
});

test('first introduction and active screen-tour replay retain their invitation blocks', () => {
  const initial = State.createState(NOW, { onboarding: true });
  for (const stage of ['intro', 'name', 'tour']) {
    initial.onboarding.stage = stage;
    assert.equal(Engagement.learningBlocksInvitations(initial), true);
    Engagement.advanceEngagementSchedule(initial, 7200, foreground);
    assert.equal(initial.engagementSchedule.activeSeconds, 0);
    assert.equal(initial.engagementSchedule.pending, null);
  }
  const replay = unfinishedIsland();
  replay.learning.tour.active = true;
  assert.equal(Engagement.learningBlocksInvitations(replay), true);
  Engagement.advanceEngagementSchedule(replay, 7200, foreground);
  assert.equal(Engagement.engagementOfferStatus(replay).blocked, true);
  assert.equal(replay.engagementSchedule.pending, null);
});

test('persisted advertising delay still lasts its full focused foreground duration', () => {
  let state = unfinishedIsland();
  state.learning.adsNotBeforeActiveSeconds = 3600;
  state = State.normalizeState(clone(state), NOW);
  const before = courseSnapshot(state);
  Engagement.advanceEngagementSchedule(state, 86400, { visible: false, focused: true });
  assert.equal(Engagement.invitationCooldownRemaining(state), 3600);
  Engagement.advanceEngagementSchedule(state, 3599.5, foreground);
  assert.equal(Engagement.engagementOfferStatus(state).blocked, true);
  assert.equal(Engagement.engagementOfferStatus(state).pending, false);
  Engagement.advanceEngagementSchedule(state, 0.5, foreground);
  assert.equal(Engagement.engagementOfferStatus(state).blocked, false);
  assert.equal(Engagement.engagementOfferStatus(state).pending, true);
  assert.equal(courseSnapshot(state), before);
});

test('preserved enabled-course mission policy keeps its former completion rules', () => {
  const active = unfinishedIsland(), before = courseSnapshot(active);
  assert.equal(practicalCourseBlocksMissions(active, { enabled: true }), true);
  for (const flag of ['autoOpenDisabled', 'rewardDisabled', 'settled']) {
    const state = clone(active); state.tutorial[flag] = true;
    assert.equal(practicalCourseBlocksMissions(state, { enabled: true }), false);
  }
  const complete = clone(active);
  complete.tutorial.completed = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [i, true]));
  assert.equal(practicalCourseBlocksMissions(complete, { enabled: true }), false);
  complete.tutorial.completed[24] = false;
  assert.equal(practicalCourseBlocksMissions(complete, { enabled: true }), true);
  assert.equal(courseSnapshot(active), before);
});

test('preserved enabled-course invitation policy still respects active review and incomplete lessons', () => {
  const state = unfinishedIsland(), before = courseSnapshot(state);
  assert.equal(practicalCourseBlocksInvitations(state, { enabled: true }), true);
  const dismissed = clone(state);
  dismissed.learning.practical.reviewActive = false;
  dismissed.tutorial.autoOpenDisabled = true;
  assert.equal(practicalCourseBlocksInvitations(dismissed, { enabled: true }), false);
  dismissed.learning.practical.reviewActive = true;
  assert.equal(practicalCourseBlocksInvitations(dismissed, { enabled: true }), true);
  assert.equal(courseSnapshot(state), before);
});
