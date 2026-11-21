import test from 'node:test';
import assert from 'node:assert/strict';
import { APPROVED_TOUR_VERSION, APPROVED_TOUR_IDS, V4_TOUR_IDS, TOUR_COPY,
  normalizeTourProgressIndex, getTourCopy } from '../harborlight-v1-approved-copy.js';
import { developmentText } from '../harborlight-v1-development-copy.js';
import { GOODS } from '../harborlight-v1-provisions.js';
import { createState, normalizeState, onboardingStatus } from '../harborlight-v1-state.js';
import { runTutorialV26 } from './helpers/tutorial-v26-course.mjs';

const START = Date.parse('2026-11-15T12:00:00Z');
const ORIGINAL_V4 = ['home','level','happiness','coins','working','building-house','food','clothing','arrival','building-farm','producer-storage','building-lumber','building-quarry','building-windmill','building-sawmill','building-bakery','building-dairy','building-slaughterhouse','building-fisher','building-leatherworks','building-warehouse','transport','construction','building-academy','education','research','building-barracks','military-officers','building-chapel','building-lighthouse','tasks','kingdom','kingdom-lending','kingdom-loans','kingdom-storage','building-theatre','category-decorations','expeditions','minigame-rules','building-dock','building-market','archipelago','chat','league','charity','category-paths','tutorial','settings'];
const LOWER_TABS = ['category-administration','category-economy','category-resources','category-decorations','category-paths'];
const practicalHistory = tutorial => Object.fromEntries(['version','curriculum','completed','claimed','chests','events','skippedLessons','actionLedger'].map(key=>[key,structuredClone(tutorial[key])]));

test('v5 keeps top controls, native buildings and all five lower tabs in contiguous groups', () => {
  assert.equal(APPROVED_TOUR_VERSION, 5);
  assert.equal(APPROVED_TOUR_IDS.length, 56);
  assert.equal(new Set(APPROVED_TOUR_IDS).size, 56);
  const top = APPROVED_TOUR_IDS.slice(0,22), buildings = APPROVED_TOUR_IDS.slice(22,51);
  assert.deepEqual(top.slice(0,8), ['home','level','happiness','coins','working','arrival','points','population']);
  assert.ok(top.every(id=>!id.startsWith('building-')&&!id.startsWith('category-')));
  assert.equal(buildings[0], 'building-townhall');
  assert.deepEqual(buildings.slice(-3), ['building-theatre','building-market','building-dock']);
  assert.deepEqual(APPROVED_TOUR_IDS.slice(51), LOWER_TABS);
  for (const id of ORIGINAL_V4) assert.ok(APPROVED_TOUR_IDS.includes(id), id);
  assert.equal(APPROVED_TOUR_IDS[APPROVED_TOUR_IDS.indexOf('building-farm')+1], 'producer-storage');
  assert.equal(APPROVED_TOUR_IDS[APPROVED_TOUR_IDS.indexOf('building-house')+1], 'clothing');
  assert.equal(APPROVED_TOUR_IDS[APPROVED_TOUR_IDS.indexOf('building-warehouse')+1], 'food');
});

test('reordering never assigns the reviewed TOUR-01 through TOUR-48 text to another stable ID', () => {
  assert.deepEqual(V4_TOUR_IDS, ORIGINAL_V4);
  for (const [index,id] of ORIGINAL_V4.entries()) {
    assert.equal(TOUR_COPY[id].pl.text, developmentText(`TOUR-${String(index+1).padStart(2,'0')}`), id);
  }
  assert.equal(getTourCopy('clothing','pl').title,'Ubrania');
  assert.equal(GOODS.civilianClothes.name,'Strój cywilny','The tour title must not rename an economic good');
  for (const id of APPROVED_TOUR_IDS) for (const language of ['pl','en']) {
    const copy=getTourCopy(id,language);
    assert.ok(copy.title && copy.text,`${id}/${language}`);
    assert.doesNotMatch(copy.text,/undefined|NaN/);
  }
  assert.match(getTourCopy('building-farm','pl',{state:{buildings:{farm:{level:6}},education:{discoveries:{cheese:true}}}}).text,/ser/);
  assert.match(getTourCopy('building-leatherworks','pl',{state:{buildings:{academy:{level:1}}}}).text,/szaty profesorskie/);
});

test('every saved v4 cursor keeps its semantic topic and migrates only once', () => {
  for (const [index,id] of ORIGINAL_V4.entries()) {
    const migrated=normalizeTourProgressIndex(index,4);
    assert.equal(APPROVED_TOUR_IDS[migrated],id,`v4/${index}`);
    assert.equal(normalizeTourProgressIndex(migrated,5),migrated,id);
  }
  assert.equal(normalizeTourProgressIndex(35,4),48,'The former Theatre step36 becomes49');
  assert.equal(normalizeTourProgressIndex(47,4),9,'The completed old final topic keeps Settings');
});

test('pending saved introduction and review keep the same v4 Theatre topic after reload', () => {
  const raw=createState(START,{ruleset:32,onboarding:true});
  raw.onboarding={...raw.onboarding,stage:'tour',routeVersion:4,index:35};
  raw.learning.tour={routeVersion:4,index:35,active:true,paused:false,completed:false};
  const first=normalizeState(raw,START),second=normalizeState(structuredClone(first),START);
  for (const state of [first,second]) {
    assert.equal(onboardingStatus(state).pending,true);
    assert.equal(state.onboarding.index,48);
    assert.equal(state.learning.tour.index,48);
    assert.equal(state.learning.tour.active,true);
    assert.equal(state.learning.tour.completed,false);
    assert.equal(state.onboarding.routeVersion,5);
    assert.equal(state.learning.tour.routeVersion,5);
  }
});

test('a completed v4 tour does not restart or re-award earned practical lessons', () => {
  const raw=runTutorialV26({now:START,through:2}).state;
  assert.ok(Object.keys(raw.tutorial.claimed).length>=2,'Use genuinely earned/claimed course history');
  raw.onboarding={version:1,stage:'complete',routeVersion:4,index:47,worldStartedAt:START,completedAt:START};
  raw.learning.tour={routeVersion:4,index:47,active:false,paused:false,completed:true};
  raw.learning.practical={reviewIndex:1,reviewActive:false,reviewPaused:true};
  const before=practicalHistory(raw.tutorial),stock=structuredClone(raw.resources);
  const first=normalizeState(structuredClone(raw),raw.worldTimeMs),second=normalizeState(structuredClone(first),raw.worldTimeMs);
  for (const state of [first,second]) {
    assert.equal(onboardingStatus(state).pending,false);
    assert.equal(state.onboarding.stage,'complete');
    assert.equal(state.learning.tour.active,false);
    assert.equal(state.learning.tour.completed,true);
    assert.equal(state.learning.tour.index,9);
    assert.equal(state.learning.practical.reviewIndex,1);
    assert.equal(state.learning.practical.reviewPaused,true);
    assert.deepEqual(practicalHistory(state.tutorial),before);
    assert.deepEqual(state.resources,stock);
  }
});
