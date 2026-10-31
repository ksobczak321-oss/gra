import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_PLAY_SECONDS, REFERRAL_WINDOW_SECONDS, LEGACY_TUTORIAL_LESSONS as TUTORIAL_LESSONS,
  normalizeProgression, progressionAction, registerMeaningfulActivity,
  activePlayMultiplier, engagementStatus, advanceProgression, nextProgressionEvent,
  tutorialRows, recordProgressionAction, recordProgressionLogin, loyaltyStatus,
  socialSummary, referralRows
} from '../harborlight-v1-progression.js';
import { receiveMaterials } from '../harborlight-v1-logistics.js';
import { warsawDayKey } from '../harborlight-v1-calendar.js';

const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const START = Date.parse('2026-10-23T12:00:00Z');
const context = { receiveMaterials };
function island(now = START) {
  const state = {
    worldTimeMs: now, activityClock: 0, activeSeconds: 0,
    resources: { coins: 100, ...Object.fromEntries(MATERIALS.map(id => [id, 100])) },
    pendingDeliveries: Object.fromEntries(MATERIALS.map(id => [id, 0])),
    buildings: { townhall: { level: 1 }, warehouse: { level: 1 } },
    residents: Array.from({ length: 12 }, (_, index) => ({ id: index + 1, workplace: null, newbornRemaining: 0, arrivalRemaining: 0 })),
    warehousePriorities: [], statistics: { collected: 0 }, notifications: [], loyalty: { lastDay: null, streak: 0 }
  };
  normalizeProgression(state, { tutorial: { version: 3 } });
  return state;
}
function activity(state) { return progressionAction(state, { type: 'userActivity', visible: true, focused: true }); }
function advance(state, seconds) {
  state.worldTimeMs += seconds * 1000;
  state.activityClock += seconds;
  advanceProgression(state, seconds);
}
function reload(state) {
  const raw = structuredClone(state), restored = structuredClone(raw);
  normalizeProgression(restored, raw);
  return restored;
}
// Older scenarios use this helper name; completion now performs real commands.
function observe(state, taskId) {
  const item = TUTORIAL_LESSONS.find(row => row.id === taskId);
  if (['rules-read', 'island-map'].includes(taskId)) {
    const before = state.tutorial.completed[taskId] === true;
    const building = taskId === 'rules-read' ? 'farm' : 'warehouse';
    const person = state.residents.find(row => !row.workplace);
    if (person) person.workplace = building;
    recordProgressionAction(state, { type: 'assign', building, delta: 1 }, { ok: true });
    return { ok: !before && state.tutorial.completed[taskId] === true };
  }
  return progressionAction(state, { type: 'tutorialObserve', taskId }, context);
}
function claim(state, taskId) { return progressionAction(state, { type: 'claimTutorial', taskId }, context); }
const verifiedSocial = { verifiedSocialEvent: true, accountId: 'owner', receiveMaterials };
const verifiedAccount = { verifiedAccountEvent: true, accountId: 'owner', receiveMaterials };
function publication(state, id, extra = {}) { return progressionAction(state, { type: 'socialPublication', id, ...extra }, verifiedSocial); }
function registerReferral(state, id = 'friend', extra = {}) { return progressionAction(state, { type: 'referralRegistration', accountId: id, inviterId: 'owner', ...extra }, verifiedAccount); }
function loginReferral(state, id = 'friend') { return progressionAction(state, { type: 'referralLogin', accountId: id }, verifiedAccount); }
function referralDay(state, id = 'friend', extra = {}) { return progressionAction(state, { type: 'referralActiveDay', accountId: id, active: true, ...extra }, verifiedAccount); }

test('only meaningful input from a visible focused game enables the five-minute bonus', () => {
  const state = island();
  for (const proof of [{}, { visible: true }, { focused: true }, { visible: false, focused: true }, { visible: true, focused: false }]) {
    const before = JSON.stringify(state);
    assert.equal(registerMeaningfulActivity(state, proof), false);
    assert.equal(JSON.stringify(state), before);
  }
  assert.equal(activePlayMultiplier(state), 1);
  assert.equal(activity(state).ok, true);
  assert.equal(activePlayMultiplier(state), 2);
  assert.equal(state.engagement.activeUntil, START + ACTIVE_PLAY_SECONDS * 1000);
  assert.equal(state.lastMeaningfulActivityAt, 0);
  assert.deepEqual(state.tutorial.activeDays, ['2026-10-23']);
});

test('each interaction refreshes rather than stacks five minutes and activity expiration is exact', () => {
  const state = island(); activity(state);
  advance(state, 200);
  activity(state);
  assert.equal(state.engagement.activeUntil, START + 500000);
  assert.equal(state.lastMeaningfulActivityAt, 200);
  assert.equal(nextProgressionEvent(state), 300);
  advance(state, 299.999);
  assert.equal(activePlayMultiplier(state), 2);
  advance(state, 0.001);
  assert.equal(activePlayMultiplier(state), 1);
  assert.equal(engagementStatus(state).remaining, 0);
});

test('active bonus and clocks survive reload without extending the window', () => {
  const state = island(); activity(state); advance(state, 90);
  const restored = reload(state);
  assert.deepEqual(restored.engagement, state.engagement);
  assert.equal(engagementStatus(restored).remaining, 210);
  advance(restored, 210);
  assert.equal(activePlayMultiplier(restored), 1);
  assert.equal(activePlayMultiplier(reload(restored)), 1);
});

test('offline time does not create tutorial active days or renew activity', () => {
  const state = island(); activity(state);
  advance(state, 3 * 86400);
  assert.equal(activePlayMultiplier(state), 0.5);
  assert.deepEqual(state.tutorial.activeDays, ['2026-10-23']);
  assert.equal(tutorialRows(state).filter(row => row.unlocked).length, 1);
  activity(state);
  assert.deepEqual(state.tutorial.activeDays, ['2026-10-23', '2026-10-26']);
  assert.equal(tutorialRows(state).filter(row => row.unlocked).length, 1);
});

test('all25 tutorial lessons are available in sequence without a five-day time gate', () => {
  const state = island();
  assert.equal(TUTORIAL_LESSONS.length, 25);
  assert.equal(TUTORIAL_LESSONS.every(row => row.day === 1), true);
  for (let day = 1; day <= 5; day++) {
    activity(state);
    assert.equal(state.tutorial.activeDays.length, day);
    assert.equal(tutorialRows(state).filter(row => row.unlocked).length, 1);
    advance(state, 86400);
  }
  activity(state);
  assert.equal(state.tutorial.activeDays.length, 5);
  assert.equal(observe(state, 'rules-read').ok, true);
  assert.equal(tutorialRows(state).find(row => row.id === 'island-map').unlocked, true);
});


test('a real Warsaw midnight rather than a rolling 24-hour clock unlocks the next tutorial day', () => {
  const state = island(Date.parse('2026-03-28T22:59:00Z'));
  activity(state);
  assert.equal(warsawDayKey(state.worldTimeMs), '2026-03-28');
  advance(state, 120); activity(state);
  assert.deepEqual(state.tutorial.activeDays, ['2026-03-28', '2026-03-29']);
  advance(state, 23 * 3600); activity(state);
  assert.deepEqual(state.tutorial.activeDays, ['2026-03-28', '2026-03-29', '2026-03-30']);
});

test('missing prerequisites cannot award rewards; independently performed future lessons are removed', () => {
  const state = island();
  assert.equal(claim(state, 'rules-read').ok, false);
  assert.equal(observe(state, 'island-map').ok, true);
  assert.equal(state.tutorial.skippedLessons['island-map'], true);
  assert.equal(claim(state, 'island-map').ok, false);
  activity(state); advance(state, 86400); activity(state);
  assert.equal(observe(state, 'food-check').ok, false);
  assert.equal(state.resources.coins, 100);
  assert.equal(observe(state, 'rules-read').ok, true);
  assert.equal(observe(state, 'island-map').ok, false);
});


test('only the requested real assignment completes the crew lesson and its reward pays once', () => {
  const state = island(); activity(state);
  observe(state, 'rules-read'); observe(state, 'island-map');
  assert.equal(observe(state, 'first-job').ok, false);
  recordProgressionAction(state, { type: 'assign', building: 'quarry', delta: 1 }, { ok: false });
  assert.equal(tutorialRows(state).find(row => row.id === 'first-job').completed, false);
  state.residents[0].workplace = 'quarry'; state.residents[0].arrivalRemaining = 300;
  state.residents[1].workplace = 'warehouse'; state.residents[1].arrivalRemaining = 300;
  recordProgressionAction(state, { type: 'assign', building: 'windmill', delta: 1 }, { ok: true });
  assert.equal(tutorialRows(state).find(row => row.id === 'first-job').completed, true);
  const reward = { ...state.tutorial.chests['first-job'].reward };
  assert.equal(claim(state, 'first-job').ok, true);
  assert.equal(state.resources.coins, 100);
  for (const id of MATERIALS) assert.equal(state.resources[id], 100 + reward[id]);
  assert.equal(claim(state, 'first-job').ok, false);
  const restored = reload(state);
  assert.equal(claim(restored, 'first-job').ok, false);
  assert.equal(restored.resources.coins, 100);
});


test('tutorial rewards enter immediately spendable bonus stock without consuming ordinary space', () => {
  const state = island(); activity(state); observe(state, 'rules-read');
  const reward = state.tutorial.chests['rules-read'].reward;
  for (const id of MATERIALS) state.resources[id] = 800;
  assert.equal(claim(state, 'rules-read').ok, true);
  for (const id of MATERIALS) {
    assert.equal(state.resources[id], 800 + reward[id]);
    assert.equal(state.bonusMaterials[id], reward[id]);
    assert.equal(state.pendingDeliveries[id], 0);
  }
  assert.equal(state.resources.coins, 100);
});


test('missing material receiver cannot mark a tutorial reward claimed or add partial coins', () => {
  const state = island(); activity(state); observe(state, 'rules-read');
  const before = JSON.stringify(state);
  assert.equal(progressionAction(state, { type: 'claimTutorial', taskId: 'rules-read' }).ok, false);
  assert.equal(JSON.stringify(state), before);
});

test('delivery lesson checks actual delivered goods and priorities require accepted actions', () => {
  const state = island();
  for (const row of TUTORIAL_LESSONS.slice(0, 8)) state.tutorial.completed[row.id] = true;
  state.warehousePriorities = ['construction'];
  recordProgressionAction(state, { type: 'warehousePriority', resource: 'construction' }, { ok: false });
  assert.equal(tutorialRows(state).find(row => row.id === 'transport-priority').completed, false);
  recordProgressionAction(state, { type: 'warehousePriority', resource: 'construction' }, { ok: true });
  assert.equal(tutorialRows(state).find(row => row.id === 'transport-priority').completed, true);
  assert.equal(tutorialRows(state).find(row => row.id === 'first-delivery').completed, false);
  state.statistics.collected = 1; advanceProgression(state);
  assert.equal(tutorialRows(state).find(row => row.id === 'first-delivery').completed, true);
});


test('social dialogs and caller-supplied verified fields never grant verified-publication rewards', () => {
  const state = island();
  const before = JSON.stringify(state);
  for (const action of [
    { type: 'socialPublication', id: 'p1' },
    { type: 'socialPublication', id: 'p2', verified: true },
    { type: 'socialPublication', id: 'p3', verifiedSocialEvent: true }
  ]) assert.equal(progressionAction(state, action, {}).ok, false);
  assert.equal(JSON.stringify(state), before);
});

test('the first verified publication grants 1000 once across platforms and replays are rejected', () => {
  const state = island();
  assert.equal(publication(state, 'facebook-p1', { platform: 'facebook' }).reward.coins, 1000);
  assert.equal(state.resources.coins, 1100);
  assert.equal(publication(state, 'facebook-p1').ok, false);
  assert.equal(publication(state, 'instagram-p1', { platform: 'instagram' }).reward.coins, 0);
  assert.equal(state.socialRewards.postDays.length, 1);
  const restored = reload(state);
  assert.equal(publication(restored, 'facebook-p1').ok, false);
  assert.equal(restored.resources.coins, 1100);
});

test('a qualifying verified level post stacks first-share1000 and per-level500 without paying unseen levels', () => {
  const state = island(); state.buildings.townhall.level = 3;
  assert.equal(publication(state, 'level2', { kind: 'level', level: 2 }).reward.coins, 1500);
  assert.equal(publication(state, 'same-level', { kind: 'level', level: 2 }).reward.coins, 0);
  assert.equal(publication(state, 'future-level', { kind: 'level', level: 4 }).reward.coins, 0);
  assert.equal(publication(state, 'level3', { kind: 'level', level: 3 }).reward.coins, 500);
  assert.deepEqual(state.socialRewards.levelShares, [2, 3]);
  assert.equal(state.socialRewards.postDays.length, 1);
  assert.equal(state.resources.coins, 2100);
});

test('only one verified post per Warsaw day counts globally; every third counts reward1000', () => {
  const state = island();
  const payouts = [];
  for (let day = 1; day <= 6; day++) {
    payouts.push(publication(state, `daily-${day}`).reward.coins);
    assert.equal(publication(state, `extra-${day}`, { platform: 'other' }).counted, false);
    advance(state, 86400);
  }
  assert.deepEqual(payouts, [1000, 0, 1000, 0, 0, 1000]);
  assert.deepEqual(state.socialRewards.thirdPostRewards, [3, 6]);
  assert.equal(socialSummary(state).nextPostRewardAt, 9);
  assert.equal(state.resources.coins, 3100);
});

test('verified social events are account-bound and cannot be future-dated', () => {
  const state = island(); publication(state, 'p1');
  const before = JSON.stringify(state);
  assert.equal(progressionAction(state, { type: 'socialPublication', id: 'p2' }, { verifiedSocialEvent: true, accountId: 'other' }).ok, false);
  assert.equal(publication(state, 'future', { at: START + 1 }).ok, false);
  assert.equal(JSON.stringify(state), before);
});

test('a referral needs trusted account events and has one immutable inviter', () => {
  const state = island();
  assert.equal(progressionAction(state, { type: 'referralRegistration', accountId: 'friend', inviterId: 'owner', verified: true }, {}).ok, false);
  assert.equal(registerReferral(state).ok, true);
  assert.equal(registerReferral(state).ok, false);
  assert.equal(progressionAction(state, { type: 'referralRegistration', accountId: 'friend', inviterId: 'other' }, { ...verifiedAccount, accountId: 'other' }).ok, false);
  assert.equal(registerReferral(state, 'owner').ok, false);
  assert.equal(state.referrals.entries.length, 1);
});

test('referral first login grants1000once; active days cannot precede that login', () => {
  const state = island(); registerReferral(state);
  assert.equal(referralDay(state).ok, false);
  assert.equal(loginReferral(state).reward.coins, 1000);
  assert.equal(loginReferral(state).ok, false);
  assert.equal(state.resources.coins, 1100);
  const restored = reload(state);
  assert.equal(loginReferral(restored).ok, false);
  assert.equal(restored.resources.coins, 1100);
});

test('three distinct active days with gaps within30days grant500ofeachmaterial once', () => {
  const state = island(); registerReferral(state); loginReferral(state);
  for (const id of MATERIALS) state.resources[id] = 800;
  assert.equal(referralDay(state).rewarded, false);
  assert.equal(referralDay(state).ok, false);
  advance(state, 4 * 86400);
  assert.equal(referralDay(state).rewarded, false);
  advance(state, 10 * 86400);
  assert.equal(referralDay(state).rewarded, true);
  for (const id of MATERIALS) {
    assert.equal(state.resources[id], 1300);
    assert.equal(state.bonusMaterials[id], 500);
    assert.equal(state.pendingDeliveries[id], 0);
  }
  assert.equal(referralRows(state)[0].activeDayCount, 3);
  assert.equal(referralDay(state).ok, false);
  const restored = reload(state);
  assert.equal(referralDay(restored).ok, false);
  assert.deepEqual(restored.pendingDeliveries, state.pendingDeliveries);
});

test('referral day30boundary, inactive proof and future dates cannot obtain material reward', () => {
  const state = island(); registerReferral(state); loginReferral(state);
  assert.equal(referralDay(state, 'friend', { active: false }).ok, false);
  assert.equal(referralDay(state, 'friend', { at: START + 1 }).ok, false);
  referralDay(state); advance(state, 86400); referralDay(state);
  advance(state, 29 * 86400);
  assert.equal(state.referrals.entries[0].expired, true);
  assert.equal(referralDay(state).ok, false);
  for (const id of MATERIALS) assert.equal(state.pendingDeliveries[id], 0);
});

test('referral material delivery failure does not consume the third eligible day', () => {
  const state = island(); registerReferral(state); loginReferral(state); referralDay(state);
  advance(state, 86400); referralDay(state); advance(state, 86400);
  const action = { type: 'referralActiveDay', accountId: 'friend', active: true };
  assert.equal(progressionAction(state, action, { verifiedAccountEvent: true, accountId: 'owner' }).ok, false);
  assert.equal(state.referrals.entries[0].activeDays.length, 2);
  assert.equal(referralDay(state).rewarded, true);
});

test('loyalty counts consecutive Warsaw login days once and resets its streak after a gap', () => {
  const state = island();
  assert.equal(recordProgressionLogin(state), true);
  assert.equal(state.loyalty.streak, 1);
  assert.equal(recordProgressionLogin(state), false);
  advance(state, 86400); recordProgressionLogin(state);
  assert.equal(state.loyalty.streak, 2);
  advance(state, 2 * 86400); recordProgressionLogin(state);
  assert.equal(state.loyalty.streak, 1);
  assert.equal(loyaltyStatus(state).rewardConfigured, true);
  const before = state.resources.coins;
  const claimed = progressionAction(state, { type: 'claimLoyalty' }, context);
  assert.equal(claimed.ok, true);
  assert.equal(state.resources.coins, before + claimed.reward.coins);
  assert.equal(progressionAction(state, { type: 'claimLoyalty' }, context).ok, false);
});

test('loyalty permanently closes atTownHall4 even if later data lowers the level', () => {
  const state = island(); recordProgressionLogin(state);
  state.buildings.townhall.level = 4; advanceProgression(state);
  assert.equal(state.loyalty.closed, true);
  assert.equal(state.loyalty.closedReason, 'townhall-level-4');
  state.buildings.townhall.level = 1;
  const restored = reload(state);
  advance(restored, 86400);
  assert.equal(recordProgressionLogin(restored), false);
  assert.equal(loyaltyStatus(restored).closed, true);
});

test('ten already-claimed loyalty rewards permanently close the introductory programme', () => {
  const state = island();
  state.loyalty.claimedDays = Array.from({ length: 10 }, (_, i) => i + 1);
  const restored = reload(state);
  assert.equal(restored.loyalty.closed, true);
  assert.equal(restored.loyalty.closedReason, 'ten-rewards');
  assert.equal(progressionAction(restored, { type: 'claimLoyalty' }, context).ok, false);
});

test('normalization keeps durable progress while rejecting unknown lessons and future activity clocks', () => {
  const state = island(); activity(state); observe(state, 'rules-read'); claim(state, 'rules-read');
  state.engagement.activeUntil = START + 100 * 86400000;
  state.tutorial.completed.unknown = true;
  state.tutorial.claimed.unknown = true;
  const restored = reload(state);
  assert.equal(restored.engagement.activeUntil, START + 300000);
  assert.equal(restored.tutorial.claimed['rules-read'], true);
  assert.equal(restored.tutorial.claimed.unknown, undefined);
  assert.equal(restored.tutorial.completed.unknown, undefined);
  assert.equal(restored.resources.coins, 100);
});


test('all25 previously paid lessons remain archived without replaying their historical coin awards', () => {
  const state = island();
  const oldIds = ['island-level','residents-home','first-job','workplace-journey','resources-dock','warehouse-job','first-delivery','transport-priority','food-chain','central-food','personal-happiness','house-points','upgrade-cost','construction-queue','storage-limits','market-rules','lighthouse-visits','lighthouse-task','path-levels','daily-attractions','chapel-blessing','expedition-rules','returning-workers','motion-setting','island-review'];
  state.resources.coins = 1100;
  const raw = structuredClone(state);
  raw.tutorial = { completed: Object.fromEntries(oldIds.map(id => [id, true])), claimed: Object.fromEntries(oldIds.map(id => [id, true])) };
  normalizeProgression(state, raw);
  assert.equal(Object.keys(state.tutorial.legacy.claimed).length, 25);
  assert.equal(state.tutorial.claimed['rules-read'], true);
  assert.equal(state.tutorial.claimed['food-check'], true);
  assert.equal(state.tutorial.claimed['townhall-upgrade'], undefined);
  assert.equal(state.tutorial.claimed['happiness-action'], undefined);
  assert.equal(state.tutorial.claimed['path-upgrade'], undefined);
  assert.equal(state.tutorial.claimed['expedition-rules'], undefined);
  assert.equal(claim(state, 'rules-read').ok, false);
  assert.equal(state.resources.coins, 1100);
  const restored = reload(state);
  assert.deepEqual(restored.tutorial.legacy, state.tutorial.legacy);
  assert.equal(claim(restored, 'food-check').ok, false);
  assert.equal(restored.resources.coins, 1100);
});


test('a third counted publication can stack with a newly reached level reward', () => {
  const state = island(); state.buildings.townhall.level = 2;
  publication(state, 'day1'); advance(state, 86400); publication(state, 'day2'); advance(state, 86400);
  const result = publication(state, 'day3-level2', { kind: 'level', level: 2 });
  assert.equal(result.reward.coins, 1500);
  assert.equal(result.thirdPostReward, true);
  assert.equal(result.levelReward, true);
  assert.equal(state.resources.coins, 2600);
});


test('opening a task acceptance draft is not the tutorial acceptance action', () => {
  const state = island(); activity(state);
  for (const item of TUTORIAL_LESSONS.slice(0, 21)) state.tutorial.completed[item.id] = true;
  recordProgressionAction(state, { type: 'taskAccept', task: 'lighthouse-1' }, { ok: true, draft: true });
  assert.equal(state.tutorial.completed['lighthouse-task'], undefined);
  recordProgressionAction(state, { type: 'confirmTaskAcceptance', task: 'lighthouse-1' }, { ok: false });
  assert.equal(state.tutorial.completed['lighthouse-task'], undefined);
  recordProgressionAction(state, { type: 'confirmTaskAcceptance', task: 'lighthouse-1' }, { ok: true });
  assert.equal(state.tutorial.completed['lighthouse-task'], true);
});
