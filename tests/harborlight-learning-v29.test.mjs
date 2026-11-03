import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APPROVED_TOUR_IDS, getTourCopy, lessonCopy } from '../harborlight-v1-approved-copy.js';
import { normalizeProgression, TUTORIAL_LESSONS, V6_TUTORIAL_LESSONS, tutorialGuidanceStatus, tutorialRows, recordProgressionAction, advanceProgression, progressionAction } from '../harborlight-v1-progression.js';
import { normalizeWelcomeWorkers, welcomeWorkerStatus, claimWelcomeWorker, welcomeWorkerCopy } from '../harborlight-v1-welcome.js';

const START = Date.parse('2026-11-03T22:59:59Z'); // one second before Warsaw midnight
const stateAt = (now = START) => ({ worldTimeMs: now, population: 12, welcomeWorkers: normalizeWelcomeWorkers({}, { startedAt: START }) });

test('welcome grants one resident per actual login day, independent of normal growth', () => {
  const state = stateAt();
  const initial = structuredClone(state);
  assert.equal(welcomeWorkerStatus(state, { limit: 24 }).count, 1);
  assert.deepEqual(state, initial, 'presentation is read-only');
  assert.deepEqual(claimWelcomeWorker(state, { limit: 24 }), { ok: true, count: 1, day: '2026-11-03', dayNumber: 1, reason: 'granted' });
  assert.equal(claimWelcomeWorker(state, { limit: 24 }).ok, false);
  state.worldTimeMs += 2000;
  assert.equal(claimWelcomeWorker(state, { limit: 24 }).count, 1);
  state.worldTimeMs = START + 6 * 86400000;
  assert.equal(claimWelcomeWorker(state, { limit: 24 }).count, 1);
  assert.equal(state.welcomeWorkers.granted, 3, 'no backfill for unvisited days');
  state.worldTimeMs = START + 7 * 86400000;
  assert.equal(claimWelcomeWorker(state, { limit: 24 }).reason, 'outside-window');
});

test('seven login calendar days give at most seven welcome residents across reloads', () => {
  let state = stateAt();
  for (let offset = 0; offset < 7; offset++) {
    state.worldTimeMs = START + offset * 86400000;
    assert.equal(claimWelcomeWorker(state, { limit: 24 }).count, 1);
    state = { ...state, welcomeWorkers: normalizeWelcomeWorkers(JSON.parse(JSON.stringify(state.welcomeWorkers))) };
    assert.equal(claimWelcomeWorker(state, { limit: 24 }).ok, false);
  }
  assert.equal(state.welcomeWorkers.granted, 7);
});

test('full population consumes only today’s opportunity, without queueing the lost resident', () => {
  const state = stateAt();
  assert.equal(claimWelcomeWorker(state, { limit: 12 }).reason, 'population-limit');
  assert.equal(state.welcomeWorkers.granted, 0);
  assert.equal(claimWelcomeWorker(state, { limit: 24 }).ok, false);
  state.worldTimeMs += 86400000;
  assert.equal(claimWelcomeWorker(state, { limit: 24 }).count, 1);
});

test('expired/missing welcome origin and invalid or future claims never open a fresh seven-day window', () => {
  const missing = { worldTimeMs: START, population: 12, welcomeWorkers: normalizeWelcomeWorkers({}) };
  assert.equal(claimWelcomeWorker(missing, { limit: 24 }).ok, false);
  const ledger = normalizeWelcomeWorkers({ startedAt: START, claimedDays: ['2026-11-03','2026-11-03','2026-02-31','2026-11-10','2026-11-02'], granted: 999 });
  assert.deepEqual(ledger.claimedDays, ['2026-11-03']);
  assert.equal(ledger.granted, 1);
  const state = stateAt(START - 1);
  assert.equal(claimWelcomeWorker(state, { limit: 24 }).ok, false);
});

test('welcome wording explicitly promises the seven daily residents separately from ordinary growth', () => {
  assert.match(welcomeWorkerCopy('pl').text, /pierwsze 7 dni.*dodatkowego mieszkańca.*ponad zwykły przyrost/);
  assert.match(welcomeWorkerCopy('pl').text, /Ratuszu.*Domu/);
});

test('the tour explains storage once after the Farm, introduces the Theatre after the House, and merges ship/Port', () => {
  assert.equal(APPROVED_TOUR_IDS[APPROVED_TOUR_IDS.indexOf('building-farm') + 1], 'producer-storage');
  assert.equal(APPROVED_TOUR_IDS[APPROVED_TOUR_IDS.indexOf('building-house') + 1], 'building-theatre');
  assert.ok(!APPROVED_TOUR_IDS.includes('ship'));
  const body = getTourCopy('building-dock','pl').text;
  assert.match(body, /4\. poziomu.*6\. poziomu.*10, 13, 16.*20 wysp.*towary albo pasażerów.*nie zastępuje dostawy/);
  assert.match(getTourCopy('building-theatre','pl').text, /odpoczynku i integracji.*dekoracje/);
  assert.doesNotMatch(getTourCopy('happiness','pl').text, /czasu Warszawy/);
  assert.match(getTourCopy('category-economy','pl').text, /do magazynu centralnego/);
  assert.doesNotMatch(getTourCopy('tutorial','pl').text, /interfejs/);
  assert.doesNotMatch(getTourCopy('settings','pl',{cloudAccount:true}).text, /30 sekund|chmurze/);
});

test('curriculum 7 teaches paid acceleration once and natural construction on a separate building', () => {
  assert.equal(TUTORIAL_LESSONS.length, 25);
  const townhall = TUTORIAL_LESSONS.find(item => item.id === 'townhall-upgrade');
  const quarry = TUTORIAL_LESSONS.find(item => item.id === 'transport-priority');
  assert.equal(townhall.guidedService, 'construction');
  assert.equal(quarry.guidedService, null);
  assert.equal(quarry.naturalWait, true);
  assert.match(quarry.descriptionPl, /Tym razem zaczekaj.*bez kupowania przyspieszenia/);
  assert.equal(TUTORIAL_LESSONS[10].guidedService, 'pickup');
  assert.equal(TUTORIAL_LESSONS.find(item => item.id === 'construction-queue').guidedService, 'full-purchase');
  assert.equal(V6_TUTORIAL_LESSONS.find(item => item.id === 'transport-priority').guidedService, 'construction');
});

test('saved curriculum6 keeps its unfinished paid service and earned rewards while fresh worlds use7', () => {
  const fresh = { worldTimeMs: START, buildings: { townhall:{level:1}, warehouse:{level:1} }, resources:{}, residents:[] };
  normalizeProgression(fresh, {});
  assert.equal(fresh.tutorial.curriculum, 7);
  const saved = structuredClone(fresh);
  saved.tutorial.version = 6; saved.tutorial.curriculum = 6;
  saved.tutorial.guided.quarry = { projectOrder: 12, transported: true, accelerated: false };
  const restored = structuredClone(saved);
  normalizeProgression(restored, saved);
  assert.equal(restored.tutorial.curriculum, 6);
  const quarry = V6_TUTORIAL_LESSONS.find(item => item.id === 'transport-priority');
  assert.equal(tutorialGuidanceStatus(restored, quarry).current.id, 'building');
  assert.equal(restored.tutorial.guided.quarry.projectOrder, 12);
});

test('the tutorial close reminder uses a separate help symbol sized to three adjacent characters', () => {
  const js = readFileSync(new URL('../harborlight-v1-learning-feedback.js',import.meta.url),'utf8');
  const css = readFileSync(new URL('../harborlight-v1-learning-feedback.css',import.meta.url),'utf8');
  assert.match(js, /data-tutorial-exit-help-symbol/);
  assert.match(css, /\.learning-feedback-help-symbol\{[^}]*font-size:3em/);
});

// Finishing a short build while the player reads its preceding reward is still
// part of this lesson, not evidence that they skipped it independently.
test('a naturally completed course build keeps its waiting lesson and reward after the order reward is acknowledged', () => {
  const state = { worldTimeMs: START, buildings: { townhall:{level:2}, warehouse:{level:1}, quarry:{level:1} }, resources:{coins:1000}, residents:[], statistics:{} };
  normalizeProgression(state, {});
  for (const lesson of [...TUTORIAL_LESSONS.slice(0,8),...TUTORIAL_LESSONS.slice(9,10)]) { state.tutorial.completed[lesson.id]=true; state.tutorial.skippedLessons[lesson.id]=true; }
  const project = { order:1, building:'quarry', stage:'transport', targetLevel:2 };
  state.constructionProjects=[project];
  recordProgressionAction(state, {type:'upgrade',building:'quarry'}, {ok:true,project});
  assert.equal(state.tutorial.completed['transport-priority'],true);
  state.tutorial.completed['storage-limits']=true;
  state.tutorial.chests['storage-limits']={reward:{coins:100},quotePending:false,claimed:false,shared:false,skipped:false,seen:false};
  state.buildings.quarry.level=2;state.constructionProjects=[];
  advanceProgression(state);
  assert.equal(state.tutorial.completed['food-chain'],undefined);
  assert.equal(state.tutorial.skippedLessons['food-chain'],undefined);
  assert.equal(progressionAction(state,{type:'claimTutorial',taskId:'transport-priority'}).ok,true);
  assert.equal(progressionAction(state,{type:'skipTutorialShare',taskId:'transport-priority'}).ok,true);
  assert.equal(progressionAction(state,{type:'claimTutorial',taskId:'storage-limits'}).ok,true);
  assert.equal(progressionAction(state,{type:'skipTutorialShare',taskId:'storage-limits'}).ok,true);
  assert.equal(state.tutorial.completed['food-chain'],true);
  assert.ok(state.tutorial.chests['food-chain']);
  assert.equal(state.tutorial.skippedLessons['food-chain'],undefined);
});

test('a full new course remains finishable with its extra welcome resident and both construction routes', async () => {
  const { runTutorialV29 } = await import('./helpers/tutorial-v29-course.mjs');
  const { recordVisit } = await import('../harborlight-v1-state.js');
  const { state, trace } = runTutorialV29({ now: START, beforeLesson: (world, run, lesson) => {
    if (lesson.index === 1) recordVisit(world, world.worldTimeMs);
  } });
  assert.equal(trace.length, 25);
  assert.equal(state.tutorial.curriculum, 7);
  assert.equal(state.welcomeWorkers.granted, 1);
  assert.equal(state.tutorial.settled, true);
  assert.equal(state.tutorial.guided.townhall.accelerated, true);
  assert.equal(state.tutorial.guided.quarry.accelerated, false);
  assert.equal(state.buildings.quarry.level, 2);
  assert.equal(state.buildings.lighthouse.level, 1);
  assert.ok(Object.values(state.tutorial.chests).every(chest => chest.claimed && (chest.shared || chest.skipped)));
});

test('welcome normalization tolerates untrusted non-object snapshots without inventing claims', () => {
  for (const source of [null,undefined,42,'bad',[],true]) {
    const result=normalizeWelcomeWorkers(source,{startedAt:START});
    assert.equal(result.startedAt,START);assert.deepEqual(result.claimedDays,[]);assert.equal(result.granted,0);
  }
  const saved={startedAt:START,claimedDays:['2026-11-03'],granted:1};
  assert.deepEqual(normalizeWelcomeWorkers(saved),{version:1,...saved,announced:false});
});

test('an English welcome saved before choosing Polish translates as a whole notification', async () => {
  const { translate } = await import('../harborlight-v1-i18n.js');
  const en=welcomeWorkerCopy('en'),pl=welcomeWorkerCopy('pl');
  assert.equal(translate(en.title,'pl'),pl.title);
  assert.equal(translate(en.text,'pl'),pl.text);
});
