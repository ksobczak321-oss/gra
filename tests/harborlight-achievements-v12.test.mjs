import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act } from '../harborlight-v1-state.js';
import { activityAction, advanceActivities, TASK_SHARE_BONUS } from '../harborlight-v1-activities.js';

const NOW = Date.UTC(2026, 9, 23, 12);
function island() {
  const state = createState(NOW);
  for (const task of state.lighthouseTasks) {
    task.requirements = { wood: 20, stone: 10 };
    task.deposited = { wood: 0, stone: 0 };
    task.reward = { coins: 100, grain: 50 };
  }
  return state;
}
function finish(state) {
  const task = state.lighthouseTasks[0];
  assert.equal(act(state, { type: 'taskAccept', task: task.id }, NOW).ok, true);
  assert.equal(act(state, { type: 'taskDeposit', task: task.id, resource: 'wood', amount: 20 }, NOW).ok, true);
  const result = act(state, { type: 'taskDeposit', task: task.id, resource: 'stone', amount: 10 }, NOW);
  assert.equal(result.ok, true, result.message);
  assert.equal(result.completed, true);
  return { task, result, achievement: state.taskAchievements.at(-1) };
}
function reload(state) { return normalizeState(JSON.parse(JSON.stringify(state)), NOW); }

test('task completion pays the normal locked reward and creates one unseen celebration record', () => {
  const state = island(), coins = state.resources.coins, grain = state.resources.grain;
  const { task, result, achievement } = finish(state);
  assert.equal(state.resources.coins, coins + 300);
  assert.equal(state.resources.grain, grain + 150);
  assert.equal(result.achievementId, 'achievement-' + task.id);
  assert.deepEqual(achievement, {
    id: result.achievementId, taskId: task.id, title: task.title, createdAt: 0,
    reward: { coins: 300, grain: 150 }, shared: false, skipped: false, seen: false
  });
  assert.equal(state.activeTaskId, null);
  const before = structuredClone(state);
  assert.equal(act(state, { type: 'taskDeposit', task: task.id, resource: 'stone', amount: 10 }, NOW).ok, false);
  assert.deepEqual(state, before);
});

test('opening the celebration awards nothing; choosing share awards exactly 500 once across reload', () => {
  let state = island();
  const { achievement } = finish(state), regularCoins = state.resources.coins;
  assert.equal(TASK_SHARE_BONUS, 500);
  assert.equal(act(state, { type: 'seeTaskAchievement', id: achievement.id }, NOW).ok, true);
  assert.equal(state.resources.coins, regularCoins);
  assert.equal(achievement.seen, true);
  const shared = act(state, { type: 'shareTaskAchievement', id: achievement.id }, NOW);
  assert.equal(shared.ok, true);
  assert.equal(shared.bonus, 500);
  assert.equal(state.resources.coins, regularCoins + 500);
  assert.equal(achievement.shared, true);
  assert.equal(state.notifications.filter(item => item.kind === 'task-sharing-bonus').length, 1);
  state = reload(state);
  const saved = structuredClone(state);
  assert.equal(act(state, { type: 'shareTaskAchievement', id: achievement.id }, NOW).ok, false);
  assert.equal(act(state, { type: 'skipTaskAchievement', id: achievement.id }, NOW).ok, false);
  assert.deepEqual(state, saved);
});

test('Skip retains the task reward, grants no extra coins and persists as resolved', () => {
  let state = island();
  const { achievement } = finish(state), reward = structuredClone(state.resources);
  assert.equal(act(state, { type: 'skipTaskAchievement', id: achievement.id }, NOW).ok, true);
  assert.deepEqual(state.resources, reward);
  state = reload(state);
  assert.equal(state.taskAchievements[0].skipped, true);
  assert.equal(state.taskAchievements[0].seen, true);
  const before = structuredClone(state);
  assert.equal(act(state, { type: 'shareTaskAchievement', id: achievement.id }, NOW).ok, false);
  assert.deepEqual(state, before);
});

test('pending, expired and unknown task IDs cannot claim the completed-task sharing bonus', () => {
  const state = island();
  const before = structuredClone(state);
  for (const id of [undefined, '', state.lighthouseTasks[0].id, 'achievement-' + state.lighthouseTasks[0].id, 'achievement-lighthouse-999']) {
    for (const type of ['seeTaskAchievement', 'shareTaskAchievement', 'skipTaskAchievement']) {
      assert.equal(act(state, { type, id }, NOW).ok, false);
    }
  }
  assert.deepEqual(state, before);
});

test('the 500-coin share bonus does not inherit an early-click task multiplier', () => {
  for (const wait of [0, 16, 301]) {
    const state = island();
    advanceActivities(state, wait);
    const { task, achievement } = finish(state);
    assert.equal(task.multiplier, wait === 0 ? 3 : wait === 16 ? 2 : 1);
    const coins = state.resources.coins;
    assert.equal(activityAction(state, { type: 'shareTaskAchievement', id: achievement.id }).bonus, 500);
    assert.equal(state.resources.coins, coins + 500);
  }
});

test('normalization retains seen status, deduplicates achievements and never invents past celebrations', () => {
  const state = island();
  assert.deepEqual(reload(state).taskAchievements, []);
  const { achievement } = finish(state);
  assert.equal(act(state, { type: 'seeTaskAchievement', id: achievement.id }, NOW).ok, true);
  state.taskAchievements.push(structuredClone(achievement));
  state.taskAchievements.push({ ...achievement, id: 'invalid-record' });
  const restored = reload(state);
  assert.equal(restored.taskAchievements.length, 1);
  assert.equal(restored.taskAchievements[0].seen, true);
  assert.equal(restored.taskAchievements[0].shared, false);
  assert.equal(restored.taskAchievements[0].skipped, false);
  assert.deepEqual(restored.resources, state.resources);
});
