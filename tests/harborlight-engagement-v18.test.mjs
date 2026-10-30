import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEngagementSchedule, advanceEngagementSchedule, engagementOfferStatus,
  startEngagementOffer, completeEngagementOffer, idleSessionStatus, claimInitialPremiumBonus } from '../harborlight-v1-engagement.js';

const NOW = Date.parse('2026-10-30T12:00:00Z');
const foreground = { visible: true, focused: true };
function island() {
  const state = { worldTimeMs: NOW, engagement: { lastRealActivityAt: NOW, firstAnchorAt: NOW } };
  normalizeEngagementSchedule(state);
  return state;
}
function due(state, options = foreground) {
  const wait = engagementOfferStatus(state).nextIn;
  assert.notEqual(wait, null);
  advanceEngagementSchedule(state, wait, options);
  return engagementOfferStatus(state);
}
function reload(state) {
  const raw = structuredClone(state), restored = structuredClone(raw);
  normalizeEngagementSchedule(restored, raw);
  return restored;
}

test('only foreground focused elapsed time counts toward the one-time first offer', () => {
  const state = island(), firstAt = state.engagementSchedule.initialAt;
  assert.ok(firstAt >= 240 && firstAt <= 480);
  advanceEngagementSchedule(state, 10000, { visible: false, focused: true });
  advanceEngagementSchedule(state, 10000, { visible: true, focused: false });
  assert.equal(engagementOfferStatus(state).activeSeconds, 0);
  advanceEngagementSchedule(state, firstAt - 1, foreground);
  assert.equal(engagementOfferStatus(state).pending, false);
  advanceEngagementSchedule(state, 1, foreground);
  assert.equal(engagementOfferStatus(state).kind, 'initial-ad');
});

test('skipping the initial offer anchors the first 5–15 minute window exactly once', () => {
  const state = island(), offer = due(state);
  assert.equal(completeEngagementOffer(state, { id: offer.id, choice: 'skip' }), true);
  const wait = engagementOfferStatus(state).nextIn;
  assert.ok(wait >= 300 && wait <= 900);
  assert.equal(completeEngagementOffer(state, { id: offer.id, choice: 'skip' }), false);
  assert.equal(engagementOfferStatus(state).nextIn, wait);
  const restored = reload(state);
  assert.equal(engagementOfferStatus(restored).nextIn, wait);
  assert.equal(due(restored).kind, 'choice');
});

test('the second window starts after completion of the first activity, not its invitation', () => {
  const state = island();
  completeEngagementOffer(state, { id: due(state).id, choice: 'skip' });
  const first = due(state);
  assert.equal(completeEngagementOffer(state, { id: first.id, choice: 'minigame' }), false);
  assert.equal(startEngagementOffer(state, first.id, 'minigame'), true);
  advanceEngagementSchedule(state, 2000, foreground);
  assert.equal(engagementOfferStatus(state).id, first.id);
  assert.equal(completeEngagementOffer(state, { id: first.id, choice: 'ad' }), false);
  assert.equal(completeEngagementOffer(state, { id: first.id, choice: 'minigame' }), true);
  const wait = engagementOfferStatus(state).nextIn;
  assert.ok(wait >= 43 * 60 && wait <= 62 * 60);
});

test('after two choices every later invitation has a fresh 60–100 minute window', () => {
  let state = island();
  completeEngagementOffer(state, { id: due(state).id, choice: 'skip' });
  for (let count = 0; count < 5; count++) {
    const offer = due(state);
    assert.equal(startEngagementOffer(state, offer.id, 'ad'), true);
    state = reload(state);
    assert.equal(startEngagementOffer(state, offer.id, 'ad'), false);
    assert.equal(completeEngagementOffer(state, { id: offer.id, choice: 'ad' }), true);
    if (count >= 1) {
      const wait = engagementOfferStatus(state).nextIn;
      assert.ok(wait >= 3600 && wait <= 6000);
    }
  }
  assert.equal(engagementOfferStatus(state).completedChoices, 5);
});

test('premium skips the initial advertisement and automatically anchors its deadline', () => {
  const state = island(), firstAt = state.engagementSchedule.initialAt;
  advanceEngagementSchedule(state, firstAt + 30, { ...foreground, premium: true });
  const status = engagementOfferStatus(state);
  assert.equal(status.pending, false);
  assert.equal(state.engagementSchedule.initialCompleted, true);
  assert.ok(status.nextIn >= 270 && status.nextIn <= 870);
  const nextAt = state.engagementSchedule.nextAt;
  advanceEngagementSchedule(state, 0, { ...foreground, premium: true });
  assert.equal(state.engagementSchedule.nextAt, nextAt);
  assert.equal(completeEngagementOffer(state, { id: 'engagement-0', choice: 'ad' }), false);
  assert.equal(engagementOfferStatus(state).initialBonusAvailable, true);
  const restored = reload(state);
  assert.equal(engagementOfferStatus(restored).initialBonusAvailable, true);
  assert.equal(claimInitialPremiumBonus(restored), true);
  assert.equal(claimInitialPremiumBonus(restored), false);
  assert.equal(engagementOfferStatus(reload(restored)).initialBonusAvailable, false);
  assert.equal(restored.engagementSchedule.nextAt, nextAt);
});

test('normalization never rerolls invitation deadlines or starts an extra initial offer', () => {
  let state = island();
  const seed = state.engagementSchedule.seed, firstAt = state.engagementSchedule.initialAt;
  for (let i = 0; i < 5; i++) state = reload(state);
  assert.equal(state.engagementSchedule.seed, seed);
  assert.equal(state.engagementSchedule.initialAt, firstAt);
  const initial = due(state);
  state = reload(state);
  assert.equal(engagementOfferStatus(state).id, initial.id);
  assert.equal(completeEngagementOffer(state, { id: initial.id, choice: 'skip' }), true);
  state = reload(state);
  assert.equal(state.engagementSchedule.initialCompleted, true);
});

test('the global timeout warns at 30 minutes and expires after another 30 seconds', () => {
  const state = island();
  assert.equal(idleSessionStatus(state, NOW + 1799999).warning, false);
  assert.deepEqual(idleSessionStatus(state, NOW + 1800000), { idleSeconds: 1800, warning: true, remaining: 30, shouldLogout: false });
  assert.equal(idleSessionStatus(state, NOW + 1829999).shouldLogout, false);
  assert.equal(idleSessionStatus(state, NOW + 1830000).shouldLogout, true);
});

test('a new page session gets its own idle clock without renewing economic activity', () => {
  const state = island(), returnedAt = NOW + 60 * 3600000;
  const status = idleSessionStatus(state, returnedAt, { sessionStartedAt: returnedAt });
  assert.equal(status.warning, false);
  assert.equal(status.idleSeconds, 0);
  assert.equal(state.engagement.lastRealActivityAt, NOW);
  state.engagement.lastRealActivityAt = returnedAt + 60000;
  assert.equal(idleSessionStatus(state, returnedAt + 120000, { sessionStartedAt: returnedAt }).idleSeconds, 60);
});
