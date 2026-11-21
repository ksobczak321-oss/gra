import test from 'node:test';
import assert from 'node:assert/strict';
import { APPROVED_TOUR_IDS, APPROVED_TOUR_VERSION, getTourCopy } from '../harborlight-v1-approved-copy.js';
import {
  ADVISOR_INTRO_IDS, ADVISOR_INTRO_COPY, TOUR_MENU_INFORMATION_IDS,
  introductionIndex, introductionSavedIndex, createAdvisorTourSteps, tourMenuInformation
} from '../harborlight-v1-advisor-intro.js';

const EXPECTED = [
  'home', 'level', 'happiness', 'coins', 'working', 'arrival', 'points', 'population',
  'tutorial', 'settings', 'menu', 'chat', 'notifications', 'building-townhall',
  'construction', 'building-house', 'clothing', 'building-farm', 'producer-storage',
  'tasks', 'building-theatre', 'building-market', 'building-dock',
  'category-administration', 'category-economy', 'category-resources',
  'category-decorations', 'category-paths'
];

test('tour presents the requested 28 topics in order while retaining the 56-position saved catalogue', () => {
  assert.deepEqual(ADVISOR_INTRO_IDS, EXPECTED);
  assert.equal(APPROVED_TOUR_IDS.length, 56);
  assert.equal(APPROVED_TOUR_VERSION, 5);
  assert.equal(new Set(ADVISOR_INTRO_IDS).size, 28);
  assert.ok(Object.isFrozen(ADVISOR_INTRO_IDS));
});

test('every old saved position resumes its retained topic or the next applicable explanation', () => {
  const canonicalPositions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 19, 21, 22, 23, 24, 25, 26, 27, 47, 48, 49, 50, 51, 52, 53, 54, 55];
  for (const [index, canonical] of canonicalPositions.entries()) {
    assert.equal(introductionIndex(canonical), index, EXPECTED[index]);
    assert.equal(introductionSavedIndex(index), canonical, EXPECTED[index]);
  }
  for (let index = 11; index <= 18; index++) assert.equal(introductionIndex(index), 11);
  assert.equal(introductionIndex(20), 11, 'a paused League stop resumes the merged Chat/League stop');
  for (let index = 28; index <= 46; index++) assert.equal(introductionIndex(index), 19);
  assert.equal(introductionIndex(999), 27);
  for (const invalid of [-1, NaN, Infinity, undefined, '12']) assert.equal(introductionIndex(invalid), 0);
});

test('older route versions migrate before filtering without a second catalogue shift', () => {
  assert.equal(introductionIndex(25, 1), 24, 'legacy Economy retains its exact topic');
  assert.equal(introductionIndex(7, 4), 16, 'v4 Clothing retains its exact topic');
  assert.equal(introductionIndex(1, 2), 1, 'v2 Level retains its exact topic');
  assert.equal(introductionIndex(12, 3), 20, 'v3 Theatre retains its exact topic');
  assert.equal(introductionIndex(25, APPROVED_TOUR_VERSION), 16, 'v5 Clothing does not migrate again');
});

test('the route keeps real target preparation and contextual text without modifying the original catalogue', () => {
  const target = () => 'actual-building';
  const prepare = () => 'prepare-building';
  const original = APPROVED_TOUR_IDS.map(id => ({ id, target, prepare,
    title: language => `${id} title ${language}`, text: language => `${id} live ${language}` }));
  const before = original.map(step => ({ ...step }));
  const route = createAdvisorTourSteps(original);
  assert.deepEqual(route.map(step => step.id), EXPECTED);
  for (const step of route) {
    assert.equal(step.target, target);
    assert.equal(step.prepare, prepare);
  }
  assert.equal(route.find(step => step.id === 'building-farm').text('pl'), 'building-farm live pl');
  assert.equal(route.find(step => step.id === 'building-townhall').text('en'), 'building-townhall live en');
  assert.deepEqual(original, before);
});

test('Chat and League share one bilingual explanation with both live source descriptions', () => {
  const source = ['chat', 'league'].map(id => ({ id, text: language => `${id}:${language}:current` }));
  const route = createAdvisorTourSteps(source);
  assert.equal(route.filter(step => ['chat', 'league'].includes(step.id)).length, 1);
  const merged = route.find(step => step.id === 'chat');
  assert.equal(merged.title('pl'), 'Czat, sojusze i liga');
  assert.equal(merged.title('en'), 'Chat, alliances and League');
  for (const language of ['pl', 'en']) assert.equal(merged.text(language), `chat:${language}:current\n\nleague:${language}:current`);
});

test('Clothing spelling and Help describe the available tour/advisor rather than the paused practical course', () => {
  const route = createAdvisorTourSteps(APPROVED_TOUR_IDS.map(id => ({ id,
    title: language => getTourCopy(id, language).title, text: language => getTourCopy(id, language).text })));
  const clothing = route.find(step => step.id === 'clothing');
  assert.equal(clothing.title('pl'), 'Ubrania');
  assert.equal(clothing.title('en'), getTourCopy('clothing', 'en').title);
  const help = route.find(step => step.id === 'tutorial');
  assert.equal(help.title('pl'), 'Pomoc i tutorial');
  assert.match(help.text('pl'), /Doradca Królestwa/);
  assert.match(help.text('en'), /Kingdom Advisor/);
  assert.doesNotMatch(help.text('pl'), /samoucz/iu);
  assert.doesNotMatch(help.text('en'), /practical lessons|practical tutorial/i);
  for (const copy of ADVISOR_INTRO_COPY) assert.ok(copy.length === 4 && copy.every(text => typeof text === 'string' && text.length > 0));
});

test('removed menu explanations remain unchanged under the matching menu information entries', () => {
  const expected = {
    kingdom: ['kingdom', 'kingdom-lending', 'kingdom-loans', 'kingdom-storage'],
    expeditions: ['expeditions', 'minigame-rules'], archipelago: ['archipelago'], charity: ['charity']
  };
  assert.deepEqual(TOUR_MENU_INFORMATION_IDS, expected);
  assert.deepEqual(Object.values(expected).flat(), APPROVED_TOUR_IDS.slice(11, 19));
  for (const [menu, ids] of Object.entries(expected)) {
    for (const language of ['pl', 'en']) {
      const rows = tourMenuInformation(menu, language, { simulatedCharity: true });
      assert.deepEqual(rows, ids.map(id => ({ id, ...getTourCopy(id, language, { simulatedCharity: true }) })));
      assert.ok(rows.every(row => !ADVISOR_INTRO_IDS.includes(row.id)));
    }
  }
  assert.deepEqual(tourMenuInformation('unknown'), []);
});
