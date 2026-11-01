import test from 'node:test';
import assert from 'node:assert/strict';
import { captureLearningFeedback, learningFeedbackChanges, learningFeedbackCopy, createLearningFeedback } from '../harborlight-v1-learning-feedback.js';

const island = () => ({ islandId: 'island-1', islandGeneration: 4, worldTimeMs: 200000, happiness: 20,
  buildings: { townhall: { level: 1 }, lighthouse: { level: 0 } },
  lighthouseRemaining: 0, blessingRemaining: 0,
  residents: [{ id: 1, happiness: 20 }, { id: 2, happiness: 20 }], leisure: { effects: [] } });

test('a restored developed island is the baseline, not a fresh completion', () => {
  const state = island(); state.buildings.townhall.level = 12; state.buildings.lighthouse.level = 5; state.lighthouseRemaining = 80000; state.happiness = 100;
  const before = JSON.stringify(state), feedback = createLearningFeedback({ getState: () => state });
  feedback.observe(); feedback.observe();
  assert.deepEqual(feedback.pending(), []);
  assert.equal(JSON.stringify(state), before);
  feedback.dispose();
});

test('real completion changes queue the correct targets without changing world time, money or rewards', () => {
  const state = island(), feedback = createLearningFeedback({ getState: () => state });
  feedback.observe(); state.buildings.townhall.level = 2;
  const before = JSON.stringify(state); feedback.observe(); feedback.observe();
  assert.equal(JSON.stringify(state), before);
  const [event] = feedback.pending();
  assert.equal(event.kind, 'townhall'); assert.equal(event.level, 2);
  assert.equal(feedback.pending().length, 1);
  assert.equal(learningFeedbackCopy(event, state, 'pl').target, 'level');
  state.buildings.lighthouse.level = 1; state.happiness = 100; state.lighthouseRemaining = 86400;
  feedback.observe();
  assert.deepEqual(feedback.pending().map(event => event.kind), ['townhall', 'lighthouse']);
});

test('changing islands or resetting its generation clears previous explanations instead of replaying them', () => {
  const state = island(), feedback = createLearningFeedback({ getState: () => state });
  feedback.observe(); state.buildings.townhall.level = 2; feedback.observe();
  assert.equal(feedback.pending().length, 1);
  state.islandId = 'island-2'; state.buildings.townhall.level = 8; feedback.observe();
  assert.deepEqual(feedback.pending(), []);
  state.buildings.townhall.level = 9; feedback.observe();
  assert.equal(feedback.pending()[0].level, 9);
  state.islandGeneration++; feedback.observe();
  assert.deepEqual(feedback.pending(), []);
});

test('disabled learning explanations do not accumulate historical completions to display on resume', () => {
  const state = island(); let enabled = false;
  const feedback = createLearningFeedback({ getState: () => state, isEnabled: () => enabled });
  feedback.observe(); state.buildings.townhall.level = 2; feedback.observe(); enabled = true; feedback.observe();
  assert.deepEqual(feedback.pending(), []);
  state.buildings.townhall.level = 3; feedback.observe();
  assert.equal(feedback.pending()[0].level, 3);
});

test('House feedback reports actual rounded change and never invents an increase when only individual points changed', () => {
  const state = island(), before = captureLearningFeedback(state);
  state.residents[0].happiness += 1; state.happiness = 20.5;
  let events = learningFeedbackChanges(before, captureLearningFeedback(state), { type: 'houseHappiness' });
  assert.equal(events.length, 1); assert.equal(events[0].changedResidents, 1);
  assert.match(learningFeedbackCopy(events[0], state, 'pl').description, /20% → 21%/);
  const smallBefore = { ...before, happiness: 20.01 }, smallAfter = captureLearningFeedback(state); smallAfter.happiness = 20.02;
  events = learningFeedbackChanges(smallBefore, smallAfter, { type: 'houseHappinessAll' });
  const text = learningFeedbackCopy(events[0], state, 'pl').description;
  assert.match(text, /Wybrani mieszkańcy otrzymali punkty/); assert.doesNotMatch(text, /→|wzrost.*0|21% → 21%/);
  assert.deepEqual(learningFeedbackChanges(before, before, { type: 'houseHappiness' }), []);
});

test('failed actions create no explanation, while later successful House actions coalesce into one current receipt', () => {
  const state = island(), feedback = createLearningFeedback({ getState: () => state });
  const before = captureLearningFeedback(state); state.residents[0].happiness++; state.happiness = 20.5;
  feedback.recordAction({ type: 'houseHappiness' }, before, state, { ok: false });
  assert.deepEqual(feedback.pending(), []);
  feedback.recordAction({ type: 'houseHappiness' }, before, state, { ok: true });
  const next = captureLearningFeedback(state); state.residents[1].happiness++; state.happiness = 21;
  feedback.recordAction({ type: 'houseHappinessAll' }, next, state, { ok: true });
  assert.equal(feedback.pending().length, 1); assert.equal(feedback.pending()[0].after, 21);
});

test('blessing at forced 100% explains the actual effect instead of promising 120%', () => {
  const state = island(); state.happiness = 100; state.lighthouseRemaining = 3600;
  const before = captureLearningFeedback(state); state.blessingRemaining = 3600;
  const [event] = learningFeedbackChanges(before, captureLearningFeedback(state), { type: 'blessing' });
  assert.equal(event.kind, 'blessing');
  state.blessingRemaining = 600;
  const copy = learningFeedbackCopy(event, state, 'pl');
  assert.match(copy.description, /\+20 p\.p\./); assert.match(copy.description, /10 min/);
  assert.match(copy.description, /korzystają już ze szczęścia 100%/); assert.doesNotMatch(copy.description, /120%/);
});

test('Lighthouse callout derives time from the live effect and remains truthful if a delayed effect has ended', () => {
  const state = island(), before = captureLearningFeedback(state);
  state.buildings.lighthouse.level = 1; state.lighthouseRemaining = 3600; state.happiness = 100;
  const [event] = learningFeedbackChanges(before, captureLearningFeedback(state));
  state.lighthouseRemaining = 120;
  const active = learningFeedbackCopy(event, state, 'pl');
  assert.equal(active.target, 'happiness'); assert.match(active.description, /100% przez 2 min 0 s/);
  state.lighthouseRemaining = 0; state.happiness = 70;
  const ended = learningFeedbackCopy(event, state, 'pl');
  assert.equal(ended.target, 'lighthouse'); assert.doesNotMatch(ended.description, /100%/);
});

test('attraction feedback is based on the newly created effect, not an existing or failed purchase', () => {
  const state = island(); state.leisure.effects = [{ id: 1, title: 'Old', amount: 5, remaining: 100 }];
  const before = captureLearningFeedback(state);
  assert.deepEqual(learningFeedbackChanges(before, before, { type: 'buyAttraction' }), []);
  state.leisure.effects.push({ id: 2, title: 'New', amount: 8, remaining: 21600 });
  const [event] = learningFeedbackChanges(before, captureLearningFeedback(state), { type: 'buyAttraction' });
  assert.equal(event.effectId, 2);
  assert.match(learningFeedbackCopy(event, state, 'pl').description, /\+8 p\.p\./);
  assert.match(learningFeedbackCopy(event, state, 'en').description, /6 h/);
});

test('a blocked reveal retains its queue and never needs a DOM or modifies the saved island', async () => {
  const state = island(), feedback = createLearningFeedback({ getState: () => state, canShow: () => false });
  feedback.observe(); state.buildings.townhall.level = 2; feedback.observe();
  const before = JSON.stringify(state);
  assert.equal(await feedback.refresh(), false);
  assert.equal(feedback.pending().length, 1); assert.equal(JSON.stringify(state), before);
  feedback.dispose(); assert.deepEqual(feedback.pending(), []);
});
