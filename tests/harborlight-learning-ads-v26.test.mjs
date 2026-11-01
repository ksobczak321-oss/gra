import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, advanceTo } from '../harborlight-v1-state.js';
import { tutorialRows, tutorialStatus } from '../harborlight-v1-progression.js';
import { advanceEngagementSchedule, engagementOfferStatus, startEngagementOffer, learningBlocksInvitations, invitationCooldownRemaining } from '../harborlight-v1-engagement.js';

const NOW = Date.UTC(2026, 10, 1, 12);
const foreground = { visible: true, focused: true };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
function dismissedIsland() {
  const state = createState(NOW);
  assert.equal(act(state, { type: 'dismissTutorial' }, NOW).ok, true);
  return state;
}
function learning(state, patch) {
  assert.equal(act(state, { type: 'learningUpdate', patch }, state.worldTimeMs).ok, true);
}
function reload(state, now = state.worldTimeMs) {
  return normalizeState(JSON.parse(JSON.stringify(state)), now);
}
function pending(state) {
  advanceEngagementSchedule(state, state.engagementSchedule.initialAt, foreground);
  const offer = engagementOfferStatus(state);
  assert.equal(offer.pending, true); assert.equal(offer.blocked, false);
  return offer;
}

test('intro, naming and first screen tour freeze automatic invitations and their active clock', () => {
  const state = createState(NOW, { onboarding: true });
  for (const stage of ['intro', 'name', 'tour']) {
    state.onboarding.stage = stage;
    assert.equal(learningBlocksInvitations(state), true);
    advanceEngagementSchedule(state, 7200, foreground);
    assert.equal(engagementOfferStatus(state).blocked, true);
    assert.equal(engagementOfferStatus(state).pending, false);
    assert.equal(state.engagementSchedule.activeSeconds, 0);
  }
});

test('unfinished active practical lessons block invitations; dismiss, resume and completion have distinct effects', () => {
  const state = createState(NOW);
  assert.equal(tutorialStatus(state).finished, false);
  assert.equal(learningBlocksInvitations(state), true);
  advanceEngagementSchedule(state, 7200, foreground);
  assert.equal(engagementOfferStatus(state).pending, false);
  assert.equal(act(state, { type: 'dismissTutorial' }, NOW).ok, true);
  assert.equal(learningBlocksInvitations(state), false);
  assert.equal(act(state, { type: 'resumeTutorial' }, NOW).ok, true);
  assert.equal(learningBlocksInvitations(state), true);
  for (const row of tutorialRows(state)) state.tutorial.completed[row.id] = true;
  assert.equal(tutorialStatus(state).finished, true);
  assert.equal(learningBlocksInvitations(state), false);
  const preview = createState(NOW); preview.tutorial.rewardDisabled = true;
  assert.equal(learningBlocksInvitations(preview), false);
});

test('persisted replay flags block both pending advertisements and minigame invitations', () => {
  for (const patch of [{ tour: { active: true, index: 12 } }, { practical: { reviewActive: true, reviewIndex: 9 } }]) {
    let state = dismissedIsland();
    const offer = pending(state);
    learning(state, patch);
    state = reload(state);
    assert.equal(learningBlocksInvitations(state), true);
    assert.equal(engagementOfferStatus(state).id, offer.id);
    assert.equal(engagementOfferStatus(state).blocked, true);
    assert.equal(startEngagementOffer(state, offer.id, 'ad'), false);
    assert.equal(startEngagementOffer(state, offer.id, 'minigame'), false);
    assert.equal(state.engagementSchedule.pending.started, false);
  }
});

test('a paused unfinished first tour persists a one-hour active-time advertising delay after the world starts', () => {
  let state = createState(NOW, { onboarding: true });
  assert.equal(act(state, { type: 'onboardingName', name: 'Przystań' }, NOW).ok, true);
  learning(state, { tour: { active: false, paused: true, index: 8 }, adsNotBeforeActiveSeconds: 3600 });
  assert.equal(act(state, { type: 'onboardingFinish' }, NOW).ok, true);
  assert.equal(act(state, { type: 'dismissTutorial' }, NOW).ok, true);
  state = reload(state, NOW + 86400000);
  assert.equal(state.learning.tour.index, 8);
  assert.equal(state.learning.tour.paused, true);
  assert.equal(learningBlocksInvitations(state), false);
  assert.equal(invitationCooldownRemaining(state), 3600);
  advanceEngagementSchedule(state, 3599.999, foreground);
  assert.equal(engagementOfferStatus(state).pending, false);
  close(invitationCooldownRemaining(state), .001);
  advanceEngagementSchedule(state, .001, foreground);
  assert.equal(engagementOfferStatus(state).blocked, false);
  assert.equal(engagementOfferStatus(state).pending, true);
});

test('a pre-existing offer stays hidden and unstartable until exactly 3600 focused foreground seconds after dismissal', () => {
  let state = dismissedIsland();
  const offer = pending(state), initialActive = state.engagementSchedule.activeSeconds;
  learning(state, { tour: { index: 14, active: true } });
  assert.equal(engagementOfferStatus(state).blocked, true);
  learning(state, { tour: { active: false, paused: true }, adsNotBeforeActiveSeconds: initialActive + 3600 });
  state = reload(state, NOW + 3 * 86400000);
  assert.equal(engagementOfferStatus(state).id, offer.id);
  assert.equal(engagementOfferStatus(state).blocked, true);
  assert.equal(startEngagementOffer(state, offer.id, 'ad'), false);
  // Neither the running offline economy nor a background browser tab consumes
  // the explicitly foreground-only reminder delay.
  advanceTo(state, NOW + 3600000);
  advanceEngagementSchedule(state, 86400, { visible: false, focused: true });
  advanceEngagementSchedule(state, 86400, { visible: true, focused: false });
  assert.equal(invitationCooldownRemaining(state), 3600);
  assert.equal(state.engagementSchedule.activeSeconds, initialActive);
  advanceEngagementSchedule(state, 1800.25, foreground);
  state = reload(state, NOW + 5 * 86400000);
  close(invitationCooldownRemaining(state), 1799.75);
  advanceEngagementSchedule(state, 1799.749, foreground);
  assert.equal(engagementOfferStatus(state).blocked, true);
  assert.equal(startEngagementOffer(state, offer.id, 'ad'), false);
  advanceEngagementSchedule(state, .001, foreground);
  close(invitationCooldownRemaining(state), 0);
  assert.equal(engagementOfferStatus(state).blocked, false);
  assert.equal(startEngagementOffer(state, offer.id, 'ad'), true);
});

test('resuming the practical lessons blocks a due offer again even after its previous cooldown expires', () => {
  let state = dismissedIsland();
  const offer = pending(state);
  learning(state, { adsNotBeforeActiveSeconds: state.engagementSchedule.activeSeconds + 3600 });
  advanceEngagementSchedule(state, 3600, foreground);
  assert.equal(engagementOfferStatus(state).blocked, false);
  assert.equal(act(state, { type: 'resumeTutorial' }, NOW).ok, true);
  state = reload(state);
  assert.equal(learningBlocksInvitations(state), true);
  assert.equal(engagementOfferStatus(state).blocked, true);
  assert.equal(startEngagementOffer(state, offer.id, 'ad'), false);
  assert.equal(act(state, { type: 'dismissTutorial' }, NOW).ok, true);
  learning(state, { adsNotBeforeActiveSeconds: state.engagementSchedule.activeSeconds + 3600 });
  close(invitationCooldownRemaining(state), 3600);
});

test('replay after ordinary practical completion still blocks advertisements without resetting earned progress', () => {
  const state = dismissedIsland();
  for (const row of tutorialRows(state)) {
    state.tutorial.completed[row.id] = true;
    state.tutorial.claimed[row.id] = true;
  }
  const before = JSON.stringify({ completed: state.tutorial.completed, claimed: state.tutorial.claimed, resources: state.resources });
  assert.equal(learningBlocksInvitations(state), false);
  learning(state, { practical: { reviewActive: true, reviewIndex: 4 } });
  assert.equal(learningBlocksInvitations(state), true);
  advanceEngagementSchedule(state, 10000, foreground);
  assert.equal(engagementOfferStatus(state).pending, false);
  learning(state, { practical: { reviewActive: false, reviewPaused: true }, adsNotBeforeActiveSeconds: state.engagementSchedule.activeSeconds + 3600 });
  assert.equal(learningBlocksInvitations(state), false);
  assert.equal(engagementOfferStatus(state).blocked, true);
  assert.equal(JSON.stringify({ completed: state.tutorial.completed, claimed: state.tutorial.claimed, resources: state.resources }), before);
});
