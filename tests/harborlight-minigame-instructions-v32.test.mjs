import test from 'node:test';
import assert from 'node:assert/strict';
import { getMiniGameInstructionContent, miniGameInstructionSubjects } from '../harborlight-v1-minigame-instructions.js';
import { createIslandPuzzle } from '../harborlight-v1-island-puzzles.js';

test('every active title has complete player instructions in both languages', () => {
  const subjects = miniGameInstructionSubjects();
  assert.equal(subjects.length, 55);
  assert.equal(new Set(subjects.map(row => `${row.type}:${row.id}`)).size, 55);
  for (const language of ['pl', 'en']) for (const subject of subjects) {
    const copy = getMiniGameInstructionContent(subject, language);
    assert.equal(copy.id, `${subject.type}:${subject.id}`);
    for (const key of ['title', 'scenario', 'objective']) assert.ok(typeof copy[key] === 'string' && copy[key].trim().length > 8, copy.id + ':' + key + ':' + language);
    for (const key of ['steps', 'rules']) assert.ok(Array.isArray(copy[key]) && copy[key].length && copy[key].every(row => typeof row === 'string' && row.length > 10), copy.id + ':' + key + ':' + language);
  }
});
test('instruction reads never modify the current room or its progression', () => {
  for (const kind of ['gull', 'crabs', 'parrot', 'navigation', 'paperFold', 'cooking']) {
    const run = { kind: 'escapeStory', data: { story: { storyId: 'first-light', roomIndex: 2 }, puzzle: createIslandPuzzle(kind, { seed: 173, level: 1, difficulty: 1, clock: 0 }) } };
    const before = JSON.stringify(run);
    const copy = getMiniGameInstructionContent(run, 'pl');
    assert.equal(copy.id, 'puzzle:' + kind);
    copy.steps.push('Local caller change');
    getMiniGameInstructionContent(run, 'en');
    assert.equal(JSON.stringify(run), before);
    assert.ok(!getMiniGameInstructionContent(run).steps.includes('Local caller change'));
  }
});
test('preserved old crab, parrot, rope, reef and kitchen boards keep their actual controls', () => {
  const old = id => ({ kind: 'islandPuzzle', data: { puzzle: { kind: id, generatorVersion: 1 } } });
  assert.match(getMiniGameInstructionContent(old('crabs')).steps.join(' '), /Wybierz kraba/);
  assert.match(getMiniGameInstructionContent(old('parrot'), 'en').steps.join(' '), /reversed word/);
  assert.match(getMiniGameInstructionContent(old('untangle')).steps.join(' '), /lewy zaczep/);
  assert.doesNotMatch(getMiniGameInstructionContent(old('navigation')).rules.join(' '), /cofa łódź/);
  assert.doesNotMatch(getMiniGameInstructionContent(old('cooking')).steps.join(' '), /temperatur/);
  assert.match(getMiniGameInstructionContent('crabs').steps.join(' '), /Zapamiętane/);
  assert.match(getMiniGameInstructionContent('cooking').steps.join(' '), /temperatur/);
});
test('confusing controls explain clicking, conditions and consequences without hidden solutions', () => {
  assert.match(getMiniGameInstructionContent('gull').steps.join(' '), /pokarm.*wysoko.*bez krabów/);
  assert.match(getMiniGameInstructionContent('gears').rules.join(' '), /nie musisz przeciągać/);
  assert.match(getMiniGameInstructionContent('scheduling').rules.join(' '), /Następny statek może zacząć o 4/);
  assert.match(getMiniGameInstructionContent('hotel').rules.join(' '), /poprzedniego pokoju/);
  assert.match(getMiniGameInstructionContent('magnets').steps.join(' '), /jednego pola w prawo/);
  assert.match(getMiniGameInstructionContent('paperFold').steps.join(' '), /każdym okienku/);
  assert.match(getMiniGameInstructionContent('tides').steps.join(' '), /jedną jednostkę/);
});
test('story instructions explain all rooms and keep the current room separate', () => {
  const story = getMiniGameInstructionContent({ type: 'story', id: 'first-light' });
  assert.match(story.objective, /5 pomieszczeń/);
  assert.match(story.rules.join(' '), /przed uruchomieniem zegara/);
  assert.throws(() => getMiniGameInstructionContent('unknown-game'), /Unknown mini-game/);
});
