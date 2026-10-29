import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, EXPEDITIONS } from '../harborlight-v1-state.js';
import { activityAction, expeditionRoundStatus } from '../harborlight-v1-activities.js';

const NOW = Date.parse('2026-10-30T08:00:00Z');
const expedition = EXPEDITIONS[0].id;
const snapshot = value => JSON.parse(JSON.stringify(value));
function island(seed = 123456789) {
  const state = createState(NOW);
  state.activitySeed = seed;
  return state;
}
function start(state, gameKind) {
  const result = act(state, { type: 'expeditionStart', expedition, gameKind }, NOW);
  assert.equal(result.ok, true, result.message);
  return state.expeditionRuns[expedition];
}
function completeTriples(state, run) {
  for (const symbol of new Set(run.miniGame.cards)) {
    for (let index = 0; index < run.miniGame.cards.length; index++) {
      if (run.miniGame.cards[index] !== symbol || run.miniGame.matched[index]) continue;
      const result = act(state, { type: 'expeditionMiniGameReveal', runId: run.id, index }, NOW);
      assert.equal(result.ok, true, result.message);
    }
  }
  assert.equal(run.status, 'decision');
}

// The player's choice must be independent of the old random selection, while
// the layouts within that chosen game remain randomized and saved.
test('a requested game type wins over every sampled activity seed', () => {
  for (const gameKind of ['tilt', 'triples']) {
    const layouts = new Set();
    for (let number = 1; number <= 8; number++) {
      const state = island(Math.imul(number, 0x9e3779b9) >>> 0);
      const run = start(state, gameKind);
      assert.equal(run.miniGame.kind, gameKind);
      assert.equal(run.selectedGameKind, gameKind);
      assert.equal(run.roundLimit, gameKind === 'tilt' ? 180 : 240);
      layouts.add(JSON.stringify(gameKind === 'tilt' ? run.miniGame.walls : run.miniGame.cards));
    }
    assert.ok(layouts.size > 1, `${gameKind} layouts still vary`);
  }
});

test('both chosen game types and their active boards survive a real game reload', () => {
  for (const gameKind of ['tilt', 'triples']) {
    const state = island(), run = start(state, gameKind);
    const loaded = normalizeState(snapshot(state), NOW);
    assert.equal(loaded.expeditionRuns[expedition].selectedGameKind, gameKind);
    assert.deepEqual(loaded.expeditionRuns[expedition].miniGame, run.miniGame);
    assert.equal(loaded.expeditionRuns[expedition].roundStartedAt, run.roundStartedAt);
    assert.equal(loaded.expeditionRuns[expedition].roundLimit, run.roundLimit);
  }
});

test('continuing without a new choice retains the chosen type and risked pot after reload', () => {
  const state = island(), first = start(state, 'triples');
  completeTriples(state, first);
  const loaded = normalizeState(snapshot(state), NOW), run = loaded.expeditionRuns[expedition];
  assert.equal(run.pot, 50);
  const result = act(loaded, { type: 'expeditionContinue', runId: run.id }, NOW);
  assert.equal(result.ok, true, result.message);
  assert.equal(run.status, 'active');
  assert.equal(run.level, 2);
  assert.equal(run.selectedGameKind, 'triples');
  assert.equal(run.miniGame.kind, 'triples');
  assert.equal(run.miniGame.cards.length, 30);
  assert.equal(run.roundLimit, 270);
  assert.equal(run.pot, 50);
  assert.equal(expeditionRoundStatus(loaded, run).potentialPot, 100);
  assert.equal(loaded.resources.coins, 100);
});

test('an explicit next-round choice switches type without cashing out or changing the stake', () => {
  const state = island(), run = start(state, 'triples');
  completeTriples(state, run);
  const result = act(state, { type: 'expeditionContinue', runId: run.id, gameKind: 'tilt' }, NOW);
  assert.equal(result.ok, true, result.message);
  assert.equal(run.level, 2);
  assert.equal(run.pot, 50);
  assert.equal(run.selectedGameKind, 'tilt');
  assert.equal(run.miniGame.kind, 'tilt');
  assert.equal(run.roundLimit, 180 / 1.1);
  assert.equal(expeditionRoundStatus(state, run).potentialPot, 100);
  assert.equal(state.resources.coins, 100);
  assert.equal(normalizeState(snapshot(state), NOW).expeditionRuns[expedition].selectedGameKind, 'tilt');
});

test('invalid start choices do not consume an id, a random seed or any resources', () => {
  for (const gameKind of ['', 'random', 'memory', null, 0, {}, ['tilt']]) {
    const state = island(), before = snapshot(state);
    const result = act(state, { type: 'expeditionStart', expedition, gameKind }, NOW);
    assert.equal(result.ok, false, JSON.stringify(gameKind));
    assert.equal(result.message, 'Choose Marble maze or Picture triples.');
    assert.deepEqual(snapshot(state), before);
  }
});

test('an invalid next choice preserves the completed round and its entire pot', () => {
  const state = island(), run = start(state, 'triples');
  completeTriples(state, run);
  const before = snapshot(state);
  const result = act(state, { type: 'expeditionContinue', runId: run.id, gameKind: 'roulette' }, NOW);
  assert.equal(result.ok, false);
  assert.deepEqual(snapshot(state), before);
});

test('saved v16 games without the new selection field migrate to their current type', () => {
  const state = island(), run = start(state, 'triples');
  completeTriples(state, run);
  const old = snapshot(state);
  delete old.expeditionRuns[expedition].selectedGameKind;
  const loaded = normalizeState(old, NOW), restored = loaded.expeditionRuns[expedition];
  assert.equal(restored.selectedGameKind, 'triples');
  assert.equal(act(loaded, { type: 'expeditionContinue', runId: restored.id }, NOW).ok, true);
  assert.equal(restored.miniGame.kind, 'triples');
  assert.equal(restored.pot, 50);
});

test('invalid saved selection metadata falls back to the valid board without losing progress', () => {
  const state = island(), run = start(state, 'triples');
  const index = 0;
  assert.equal(act(state, { type: 'expeditionMiniGameReveal', runId: run.id, index }, NOW).ok, true);
  const saved = snapshot(state);
  saved.expeditionRuns[expedition].selectedGameKind = 'roulette';
  const loaded = normalizeState(saved, NOW), restored = loaded.expeditionRuns[expedition];
  assert.equal(restored.selectedGameKind, 'triples');
  assert.deepEqual(restored.miniGame.revealed, [index]);
  assert.deepEqual(restored.miniGame.cards, run.miniGame.cards);
});

test('an existing legacy route series continues by its old rules even if a type is supplied', () => {
  const state = island(), definition = { id: 'legacy-route', map: ['S.G'], tools: {} };
  const context = { expeditions: [definition] };
  const opened = activityAction(state, { type: 'expeditionStart', expedition: definition.id, gameVersion: 9 }, context);
  assert.equal(opened.ok, true);
  const run = state.expeditionRuns[definition.id];
  assert.equal(activityAction(state, { type: 'expeditionWin', runId: run.id, stage: 1, path: [[0, 0], [0, 1], [0, 2]] }, context).ok, true);
  assert.equal(run.pot, 50);
  assert.equal(activityAction(state, { type: 'expeditionContinue', runId: run.id, gameKind: 'triples' }, context).ok, true);
  assert.equal(run.miniGame, undefined);
  assert.equal(run.rulesVersion, undefined);
  assert.equal(run.selectedGameKind, undefined);
  assert.equal(run.level, 2);
  assert.equal(run.pot, 50);
});

test('the unconfigured rewarded-ad hook grants neither time nor coins in either chosen game', () => {
  for (const gameKind of ['tilt', 'triples']) {
    const state = island(), run = start(state, gameKind), before = snapshot(state);
    const result = act(state, { type: 'expeditionAdReward', runId: run.id }, NOW);
    assert.equal(result.ok, false);
    assert.deepEqual(snapshot(state), before);
  }
});
