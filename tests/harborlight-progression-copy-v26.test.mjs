import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translate, untranslatedTexts } from '../harborlight-v1-i18n.js';
import { createState, act } from '../harborlight-v1-state.js';
import { runTutorialV26 } from './helpers/tutorial-v26-course.mjs';

const NOW = Date.parse('2026-11-01T12:00:00Z');
function polish(source, context) {
  untranslatedTexts.clear();
  const result = translate(source, 'pl');
  assert.notEqual(result, source, context);
  assert.deepEqual([...untranslatedTexts], [], `${context}: ${result}`);
  assert.equal(translate(source, 'en'), source);
  return result;
}

test('actual first-lesson claim and confirmation results use full Polish global toasts', () => {
  const state = createState(NOW);
  for (let index = 0; index < 6; index++) assert.equal(act(state, { type: 'assign', building: 'warehouse', delta: 1 }, NOW).ok, true);
  const claimed = act(state, { type: 'claimTutorial', taskId: 'island-map' }, NOW);
  assert.equal(claimed.ok, true);
  assert.equal(polish(claimed.message, 'claim toast'), 'Nagroda jest już dostępna. Przejdź do kolejnego zadania samouczka.');
  const confirmed = act(state, { type: 'skipTutorialShare', taskId: 'island-map' }, NOW);
  assert.equal(confirmed.ok, true);
  assert.equal(polish(confirmed.message, 'confirmation toast'), 'Nagroda potwierdzona. Przejdź do kolejnego zadania samouczka.');
});

test('full real course notifications translate lesson names, immediate rewards and final settlement globally', () => {
  const { state } = runTutorialV26();
  const notes = state.notifications.filter(item => item.kind.startsWith('tutorial-'));
  assert.ok(notes.length >= 25);
  assert.ok(notes.some(item => item.kind === 'tutorial-settled'));
  for (const item of notes) for (const field of ['title', 'message']) polish(item[field], `${item.kind}.${field}`);
});

test('every complete static progression command result has a global Polish translation', () => {
  const code = readFileSync(new URL('../harborlight-v1-progression.js', import.meta.url), 'utf8');
  const commands = code.slice(code.indexOf('export function progressionAction'));
  const messages = [...new Set([...commands.matchAll(/(['"])([A-Z][A-Za-z][^'"\n]*[.!?])\1/g)].map(match => match[2]).filter(source => !source.includes('${')))];
  assert.ok(messages.length >= 30, 'scan the real command results, including errors and successful actions');
  for (const message of messages) polish(message, 'progression command');
});
