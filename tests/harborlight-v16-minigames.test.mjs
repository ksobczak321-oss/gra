import test from 'node:test';
import assert from 'node:assert/strict';
import { MINI_GAME_RULES, miniGameRoundRules, createMiniGame, normalizeMiniGame,
  setMiniGameTilt, revealMiniGameCard, advanceMiniGame } from '../harborlight-v1-minigames.js';
import { normalizeActivities, activityAction, advanceActivities, expeditionRoundStatus, nextActivitiesEvent } from '../harborlight-v1-activities.js';
import { normalizeLogisticsState } from '../harborlight-v1-logistics.js';

const NOW = Date.parse('2026-10-29T20:00:00Z');
const definition = { id: 'islands', map: ['S.G'], tools: {} };
const context = { expeditions: [definition] };
function island(seed = 123456789) {
  const state = {
    resources: { coins: 100, wood: 100, stone: 100, grain: 100, food: 100, planks: 100 },
    population: 12, foodCredit: 1, activeSeconds: 0, worldTimeMs: NOW,
    buildings: Object.fromEntries(['farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'warehouse', 'market', 'dock', 'house', 'townhall', 'chapel', 'lighthouse'].map(id => [id, { level: 1, workers: 0, ready: 0, workProgress: [] }])),
    residents: [], returningWorkers: [], constructionProjects: [], premiumServices: [],
    premium: { expiresAt: 0 }, notifications: [], statistics: { expeditions: 0 }, roads: { segments: Array(100).fill(0) }
  };
  normalizeLogisticsState(state, state); normalizeActivities(state, { activityClock: 0, activitySeed: seed });
  return state;
}
function start(state, legacy = false) {
  const result = activityAction(state, { type: 'expeditionStart', expedition: definition.id, ...(legacy ? { gameVersion: 9 } : {}) }, context);
  assert.equal(result.ok, true, result.message); return state.expeditionRuns[definition.id];
}
function reload(state) {
  const raw = structuredClone(state), restored = { ...raw };
  normalizeActivities(restored, raw); return restored;
}
function fixture(state, kind, stage = 1) {
  const run = start(state); run.level = stage;
  run.miniGame = createMiniGame(kind, stage, 1234567, state.activityClock);
  run.roundLimit = miniGameRoundRules(kind, stage).timeLimit; run.remaining = run.roundLimit;
  return run;
}
function finishMemory(state, run) {
  for (const symbol of new Set(run.miniGame.cards)) for (const index of run.miniGame.cards.map((value, index) => value === symbol ? index : -1).filter(index => index >= 0)) {
    if (run.miniGame.matched[index]) continue;
    const result = activityAction(state, { type: 'expeditionMiniGameReveal', runId: run.id, index }, context);
    assert.equal(result.ok, true, result.message);
  }
}

test('new starts draw both saved game types instead of the former route puzzle', () => {
  const kinds = new Set();
  for (const seed of Array.from({ length: 32 }, (_, index) => Math.imul(index + 1, 0x9e3779b9) >>> 0)) {
    const state = island(seed), run = start(state);
    assert.equal(run.rulesVersion, 16); kinds.add(run.miniGame.kind);
    assert.deepEqual(reload(state).expeditionRuns.islands.miniGame, run.miniGame);
  }
  assert.deepEqual(kinds, new Set(['tilt', 'triples']));
});

test('tilt rules shorten time and add balls and maze complexity only to their explicit caps', () => {
  const first = miniGameRoundRules('tilt', 1), later = miniGameRoundRules('tilt', 15), capped = miniGameRoundRules('tilt', 1000);
  assert.equal(first.timeLimit, 180); assert.equal(first.fullRewardUntil, 120); assert.equal(first.penaltyEvery, 15);
  assert.equal(first.ballCount, 1); assert.equal(first.mazeCells, 3);
  assert.ok(later.timeLimit < first.timeLimit); assert.ok(later.ballCount > first.ballCount);
  assert.equal(capped.timeLimit, 60); assert.equal(capped.ballCount, 6); assert.equal(capped.mazeCells, 8);
});

test('triples begin with twenty-four cards, grow by six and stay below fifteen minutes', () => {
  for (const [stage, cards, seconds] of [[1, 24, 240], [2, 30, 270], [4, 42, 330], [100, 120, 900]]) {
    const rules = miniGameRoundRules('triples', stage), game = createMiniGame('triples', stage, 123);
    assert.equal(rules.cardCount, cards); assert.equal(rules.timeLimit, seconds); assert.equal(game.cards.length, cards);
    const counts = [...new Set(game.cards)].map(symbol => game.cards.filter(value => value === symbol).length);
    assert.ok(counts.every(count => count === 3)); assert.equal(counts.length, cards / 3);
  }
  assert.equal(miniGameRoundRules('triples', 3).shuffleInterval, null);
  assert.equal(miniGameRoundRules('triples', 4).shuffleInterval, 60);
  assert.equal(miniGameRoundRules('triples', 100).shuffleInterval, 30);
});

test('generated maze corridors connect every ball start to every goal', () => {
  for (const stage of [1, 4, 10, 18]) {
    const game = createMiniGame('tilt', stage, 139 + stage), n = miniGameRoundRules('tilt', stage).mazeCells;
    const cell = 552 / n, seen = new Set([0]), queue = [0];
    for (const current of queue) {
      const row = Math.floor(current / n), col = current % n;
      for (const [r, c] of [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]) {
        if (r < 0 || r >= n || c < 0 || c >= n || seen.has(r * n + c)) continue;
        const x = 24 + (col + c + 1) / 2 * cell, y = 24 + (row + r + 1) / 2 * cell;
        if (game.walls.some(wall => x >= wall.x && x <= wall.x + wall.width && y >= wall.y && y <= wall.y + wall.height)) continue;
        seen.add(r * n + c); queue.push(r * n + c);
      }
    }
    assert.equal(seen.size, n * n, `stage ${stage}`);
  }
});

test('ball physics collides with a wall instead of passing through it during a long update', () => {
  const game = createMiniGame('tilt'); game.balls = [{ id: 0, x: 100, y: 300, vx: 0, vy: 0, settled: false, goalId: null }];
  game.goals = [{ id: 0, x: 500, y: 300, filledBy: null }]; game.walls = [{ x: 140, y: 0, width: 10, height: 600 }];
  setMiniGameTilt(game, 1, 0); advanceMiniGame(game, 8);
  assert.ok(game.balls[0].x <= 140 - game.radius + 1e-6); assert.equal(game.solved, false);
});

test('fixed-step physics preserves the same positions across split time and save reload', () => {
  const whole = createMiniGame('tilt', 3, 123); setMiniGameTilt(whole, 0.4, 0.7);
  const split = structuredClone(whole); advanceMiniGame(whole, 2.17);
  advanceMiniGame(split, 0.71); const saved = normalizeMiniGame(structuredClone(split), 3, 0.71); advanceMiniGame(saved, 1.46);
  for (let index = 0; index < whole.balls.length; index++) {
    assert.ok(Math.abs(whole.balls[index].x - saved.balls[index].x) < 1e-7);
    assert.ok(Math.abs(whole.balls[index].y - saved.balls[index].y) < 1e-7);
  }
});

test('real tilt input and world time can fill a target and win automatically', () => {
  const state = island(), run = fixture(state, 'tilt');
  run.miniGame.walls = []; Object.assign(run.miniGame.balls[0], { x: 100, y: 300 }); Object.assign(run.miniGame.goals[0], { x: 180, y: 300 });
  assert.equal(activityAction(state, { type: 'expeditionMiniGameInput', runId: run.id, tiltX: 0.4, tiltY: 0, deltaSeconds: 100000 }, context).ok, true);
  assert.equal(run.status, 'active'); assert.equal(state.activityClock, 0);
  advanceActivities(state, 2);
  assert.equal(run.status, 'decision'); assert.equal(run.pot, 50); assert.ok(run.finishedAt < 2);
  assert.equal(state.statistics.expeditions, 1);
});

test('an old route proof cannot settle an unsolved new mini-game', () => {
  const state = island(), run = fixture(state, 'triples');
  const result = activityAction(state, { type: 'expeditionWin', runId: run.id, stage: 1, path: [[0, 1], [0, 2]] }, context);
  assert.equal(result.ok, false); assert.equal(run.status, 'active'); assert.equal(run.pot, 0);
});

test('three matching revealed symbols disappear while a pair alone never does', () => {
  const game = createMiniGame('triples', 1, 123), symbol = game.cards[0], same = game.cards.map((value, index) => value === symbol ? index : -1).filter(index => index >= 0);
  revealMiniGameCard(game, same[0], 0); revealMiniGameCard(game, same[1], 0);
  assert.equal(game.matched.filter(Boolean).length, 0); assert.equal(game.revealed.length, 2);
  revealMiniGameCard(game, same[2], 0);
  assert.equal(game.matched.filter(Boolean).length, 3); assert.equal(game.revealed.length, 0);
});

test('mismatched cards can be rediscovered indefinitely after their saved short delay', () => {
  const game = createMiniGame('triples', 1, 123), different = [...new Set(game.cards)].slice(0, 3).map(symbol => game.cards.indexOf(symbol));
  for (const index of different) assert.equal(revealMiniGameCard(game, index, 10), true);
  assert.equal(revealMiniGameCard(game, different[0], 10.1), false);
  const saved = normalizeMiniGame(structuredClone(game), 1, 10.4);
  advanceMiniGame(saved, 0.39, 10.4); assert.equal(saved.revealed.length, 3);
  advanceMiniGame(saved, 0.01, 10.79); assert.equal(saved.revealed.length, 0);
  assert.equal(revealMiniGameCard(saved, different[0], 10.8), true);
  assert.equal(saved.matched.filter(Boolean).length, 0);
});

test('late-stage shuffle preserves open and removed cards and leaves all triples solvable', () => {
  const game = createMiniGame('triples', 4, 123), same = game.cards.map((value, index) => value === game.cards[0] ? index : -1).filter(index => index >= 0);
  same.forEach(index => revealMiniGameCard(game, index, 0));
  const open = game.cards.findIndex((_, index) => !game.matched[index]); revealMiniGameCard(game, open, 0);
  const before = [...game.cards], matched = [...game.matched], openValue = game.cards[open];
  advanceMiniGame(game, 60, 0);
  assert.equal(game.shuffleCount, 1); assert.equal(game.nextShuffleAt, 120);
  assert.equal(game.cards[open], openValue); assert.deepEqual(game.revealed, [open]); assert.deepEqual(game.matched, matched);
  for (const index of same) assert.equal(game.cards[index], before[index]);
  assert.deepEqual([...game.cards].sort((a, b) => a - b), before.sort((a, b) => a - b));
  assert.ok(normalizeMiniGame(game, 4, 60));
});

test('memory is won only by clearing the whole board and credits its pot exactly once', () => {
  const state = island(), run = fixture(state, 'triples'); finishMemory(state, run);
  assert.equal(run.status, 'decision'); assert.equal(run.pot, 50); assert.equal(state.statistics.expeditions, 1);
  const cashout = { type: 'expeditionCashout', runId: run.id };
  assert.equal(activityAction(state, cashout, context).coins, 50); assert.equal(state.resources.coins, 150);
  assert.equal(activityAction(state, cashout, context).ok, false); assert.equal(state.resources.coins, 150);
});

test('tilt reward loses one coin per whole fifteen seconds after two full minutes', () => {
  const state = island(), run = fixture(state, 'tilt');
  for (const [clock, reward] of [[120, 50], [134.999, 50], [135, 49], [150, 48], [179.999, 47]]) {
    state.activityClock = clock; assert.equal(expeditionRoundStatus(state, run).roundReward, reward);
  }
});

test('memory reward scales the grace and coin steps to its own round limit', () => {
  const state = island(), run = fixture(state, 'triples');
  for (const [clock, reward] of [[160, 50], [179.999, 50], [180, 49], [220, 47]]) {
    state.activityClock = clock; assert.equal(expeditionRoundStatus(state, run).roundReward, reward);
  }
});

test('the exact hard deadline loses the entire series without touching island coins', () => {
  for (const kind of ['tilt', 'triples']) {
    const state = island(), run = fixture(state, kind); run.pot = 150;
    advanceActivities(state, run.roundLimit - 0.001); assert.equal(run.status, 'active');
    advanceActivities(state, 0.001); assert.equal(run.status, 'lost'); assert.equal(run.pot, 0);
    assert.equal(run.lossReason, 'deadline'); assert.equal(state.resources.coins, 100);
    assert.equal(activityAction(state, { type: 'expeditionCashout', runId: run.id }, context).ok, false);
  }
});

test('a late memory win adds only its reduced new reward to the previous at-risk pot', () => {
  const state = island(), run = fixture(state, 'triples'); run.pot = 100;
  advanceActivities(state, 200); finishMemory(state, run);
  assert.equal(run.status, 'decision'); assert.equal(run.pot, 148);
  assert.equal(activityAction(state, { type: 'expeditionContinue', runId: run.id }, context).ok, true);
  assert.equal(run.status, 'active'); assert.equal(run.level, 2); assert.equal(run.pot, 148); assert.equal(run.rulesVersion, 16);
});

test('offline elapsed time reaches a real deadline and cannot be reset by reloading', () => {
  const state = island(), run = fixture(state, 'triples'); run.pot = 50;
  advanceActivities(state, 150); const loaded = reload(state);
  assert.equal(loaded.expeditionRuns.islands.roundStartedAt, 0); advanceActivities(loaded, 90);
  assert.equal(loaded.expeditionRuns.islands.status, 'lost'); assert.equal(loaded.expeditionRuns.islands.lossReason, 'deadline');
});

test('unchanged automatic tilt samples do not renew the presence clock', () => {
  const state = island(), run = fixture(state, 'tilt');
  activityAction(state, { type: 'expeditionMiniGameInput', runId: run.id, tiltX: 0.3, tiltY: 0, meaningful: true }, context);
  state.activityClock = 10;
  activityAction(state, { type: 'expeditionMiniGameInput', runId: run.id, tiltX: 0.3, tiltY: 0, meaningful: false }, context);
  assert.equal(state.lastMeaningfulActivityAt, 0);
  activityAction(state, { type: 'expeditionMiniGameInput', runId: run.id, tiltX: -0.3, tiltY: 0, meaningful: true }, context);
  assert.equal(state.lastMeaningfulActivityAt, 10);
});

test('next event includes memory mismatch and shuffle boundaries', () => {
  const state = island(), run = fixture(state, 'triples', 4);
  assert.equal(nextActivitiesEvent(state), 60);
  const different = [...new Set(run.miniGame.cards)].slice(0, 3).map(symbol => run.miniGame.cards.indexOf(symbol));
  for (const index of different) activityAction(state, { type: 'expeditionMiniGameReveal', runId: run.id, index }, context);
  assert.equal(nextActivitiesEvent(state), MINI_GAME_RULES.triples.mismatchSeconds);
});

test('legacy active series retain their route proof and old overtime across loading and continuing', () => {
  const state = island(), run = start(state, true); run.roundLimit = 10;
  advanceActivities(state, 11); const loaded = reload(state), legacy = loaded.expeditionRuns.islands;
  assert.equal(legacy.rulesVersion, undefined); assert.equal(legacy.miniGame, undefined);
  const result = activityAction(loaded, { type: 'expeditionWin', runId: legacy.id, stage: 1, path: [[0, 1], [0, 2]] }, context);
  assert.equal(result.pot, 40);
  assert.equal(activityAction(loaded, { type: 'expeditionContinue', runId: legacy.id }, context).ok, true);
  assert.equal(legacy.rulesVersion, undefined); assert.equal(legacy.pot, 40);
});
