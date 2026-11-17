import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPracticeSession, dispatchPracticeAction, advancePracticeSession, validateCatalog, practiceLink } from '../minigames/app.js';
import { ISLAND_PUZZLE_CATALOG, STORY_CATALOG } from '../harborlight-v1-story-catalog.js';
import { ADVENTURE_CATALOG } from '../harborlight-v1-adventures.js';
import { islandPuzzleSolution } from '../harborlight-v1-island-puzzles.js';
import { activeExpeditionRun } from '../harborlight-v1-activities.js';

const kebab = value => value.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
const entries = [
  ...ISLAND_PUZZLE_CATALOG.map(p => ({ slug: 'puzzle-' + kebab(p.id), engine: { type: 'puzzle', id: p.id } })),
  ...STORY_CATALOG.map(s => ({ slug: 'story-' + s.id, engine: { type: 'story', id: s.id } })),
  ...ADVENTURE_CATALOG.map(a => ({ slug: 'adventure-' + kebab(a.kind), engine: { type: 'adventure', id: a.kind } })),
  ...['tilt', 'triples'].map(id => ({ slug: 'expedition-' + id, engine: { type: 'expedition', id } }))
];
const now = Date.UTC(2026, 10, 17, 12);
test('all 55 canonical engines start in an independent current-rules practice session', () => {
  assert.equal(entries.length, 55);
  for (const entry of entries) {
    const session = createPracticeSession(entry, { now });
    assert.equal(session.state.ruleset, 32, entry.slug);
    if (entry.engine.type === 'expedition') assert.equal(activeExpeditionRun(session.state).miniGame.kind, entry.engine.id);
    else {
      assert.ok(session.state.adventures.active, entry.slug);
      assert.notEqual(session.state.adventures.active.stage, 'failed', entry.slug);
    }
    assert.ok(session.actions >= 1, entry.slug);
  }
});
test('every story opens all five real variants with matching room sequences', () => {
  for (const entry of entries.filter(row => row.engine.type === 'story')) {
    for (let variant = 1; variant <= 5; variant++) {
      const s = createPracticeSession(entry, { variant, now });
      assert.equal(s.state.adventures.active.data.story.variant, variant);
      assert.ok(s.state.adventures.active.data.story.roomCount >= 5);
    }
  }
});
test('practice difficulty controls the actual model and bounds hostile parameters', () => {
  for (const type of ['puzzle', 'adventure', 'expedition']) {
    const entry = entries.find(row => row.engine.type === type);
    const s = createPracticeSession(entry, { level: 8, now });
    const run = type === 'expedition' ? activeExpeditionRun(s.state) : s.state.adventures.active;
    if (type === 'expedition') assert.equal(run.difficultyLevel, 8);
    else if (type === 'puzzle') assert.equal(run.data.stageAttempt.difficulty, 8);
  }
  const entry = entries.find(row => row.engine.type === 'story');
  const s = createPracticeSession(entry, { level: 1e9, variant: -1, now });
  assert.equal(s.difficulty, 100); assert.equal(s.variant, 1);
  assert.match(practiceLink(entry, { level: 'bad', variant: 20 }), /variant=5&level=1$/);
  const nearHour = createPracticeSession(entries.find(row => row.engine.type === 'expedition'), { level: 8, now: now + 3599999 });
  assert.equal(nearHour.state.worldTimeMs % 3600000, 0, 'practice starts on its own full-hour clock');
});
test('practice pause stops physics and clock and cannot execute island/account actions', () => {
  const s = createPracticeSession(entries[0], { now });
  const before = JSON.stringify(s.state);
  s.paused = true;
  advancePracticeSession(s, .2);
  assert.equal(JSON.stringify(s.state), before);
  assert.equal(dispatchPracticeAction(s, { type: 'adventureInput' }).ok, false);
  s.paused = false;
  for (const type of ['upgrade', 'buyCoins', 'accountReset', 'expeditionCashout', 'originalPuzzleStart']) assert.equal(dispatchPracticeAction(s, { type }).ok, false);
  assert.equal(JSON.stringify(s.state), before);
  advancePracticeSession(s, .1); assert.equal(s.elapsed, .1);
});
test('independent page reloads cannot inherit progress, resources or reward receipts', () => {
  const entry = entries.find(row => row.engine.id === 'gull');
  const first = createPracticeSession(entry, { now });
  first.state.resources.coins = 999999;
  first.state.adventures.libraryReceipts.push('foreign');
  const second = createPracticeSession(entry, { now });
  assert.equal(second.state.resources.coins, 1000);
  assert.ok(!second.state.adventures.libraryReceipts.includes('foreign'));
  assert.notEqual(first.state, second.state);
});
test('a real triples win can settle its local pot and close the series without an account action', () => {
  const entry = entries.find(row => row.engine.type === 'expedition' && row.engine.id === 'triples');
  const s = createPracticeSession(entry, { now });
  const run = activeExpeditionRun(s.state), groups = new Map();
  run.miniGame.cards.forEach((symbol, index) => { if (!groups.has(symbol)) groups.set(symbol, []); groups.get(symbol).push(index); });
  for (const group of groups.values()) for (const index of group) assert.equal(dispatchPracticeAction(s, { type: 'expeditionMiniGameReveal', runId: run.id, index }).ok, true);
  assert.equal(run.status, 'decision');
  const coins = s.state.resources.coins, pot = run.pot;
  assert.ok(pot > 0);
  const result = dispatchPracticeAction(s, { type: 'expeditionCashout', runId: run.id });
  assert.equal(result.ok, true); assert.equal(run.status, 'closed'); assert.equal(run.pot, 0);
  assert.equal(s.state.resources.coins, coins + pot); assert.equal(s.settledCoins, pot);
  assert.equal(activeExpeditionRun(s.state), null);
  assert.equal(createPracticeSession(entry, { now }).state.resources.coins, 1000);
});
test('real solver moves solve 23 puzzle models; marble physics remains a live input board', () => {
  for (const entry of entries.filter(row => row.engine.type === 'puzzle' && row.engine.id !== 'marbleMaze')) {
    const s = createPracticeSession(entry, { now });
    const run = s.state.adventures.active;
    const solution = islandPuzzleSolution(run.data.puzzle);
    assert.ok(solution.length, entry.slug);
    for (const move of solution) {
      if (move.type === 'tick') {
        for (let i = 0; i < Math.ceil(move.seconds / .1); i++) advancePracticeSession(s, .1);
      } else {
        const result = dispatchPracticeAction(s, { type: 'adventureInput', adventureId: run.id, command: 'puzzleMove', move });
        assert.equal(result.ok, true, entry.slug + ': ' + JSON.stringify(move));
      }
    }
    assert.equal(run.data.puzzle.solved, true, entry.slug);
    assert.equal(run.stage, 'roomComplete', entry.slug);
  }
});
test('the current full catalog matches all engines and practice modules have no account/storage service', () => {
  const catalog = JSON.parse(readFileSync(new URL('../docs/minigames/catalog.json', import.meta.url), 'utf8'));
  validateCatalog(catalog);
  assert.deepEqual(new Set(catalog.entries.map(row => `${row.engine.type}:${row.engine.id}`)), new Set(entries.map(row => `${row.engine.type}:${row.engine.id}`)));
  assert.throws(() => validateCatalog({ entries: [...catalog.entries.slice(0, -1), catalog.entries[0]] }));
  const source = readFileSync(new URL('../minigames/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|account-client|dev-cloud|fetch\([^)]*\/api\//);
});
