import test from 'node:test';
import assert from 'node:assert/strict';
import { APPROVED_TOUR_VERSION, APPROVED_TOUR_IDS, LEGACY_TOUR_IDS,
  normalizeTourProgressIndex, getTourCopy, lessonCopy, uiCopy } from '../harborlight-v1-approved-copy.js';

test('removing the clock preserves every retained legacy tour step on one-time migration', () => {
  assert.equal(APPROVED_TOUR_VERSION, 2);
  assert.equal(LEGACY_TOUR_IDS.length, 34);
  assert.equal(APPROVED_TOUR_IDS.length, 33);
  assert.ok(!APPROVED_TOUR_IDS.includes('clock'));
  for (let oldIndex = 0; oldIndex < LEGACY_TOUR_IDS.length; oldIndex++) {
    const next = normalizeTourProgressIndex(oldIndex, 1);
    const expected = LEGACY_TOUR_IDS[oldIndex] === 'clock' ? 'tasks' : LEGACY_TOUR_IDS[oldIndex];
    assert.equal(APPROVED_TOUR_IDS[next], expected, `legacy ${oldIndex}`);
    assert.equal(normalizeTourProgressIndex(next, 2), next, `repeat ${oldIndex}`);
  }
  assert.equal(normalizeTourProgressIndex(999, 1), 32);
  assert.equal(normalizeTourProgressIndex(999, 2), 32);
  assert.equal(normalizeTourProgressIndex(-1, 2), 0);
});

test('all producer explanations describe real collection and reference the expanded practical lesson', () => {
  for (const producer of ['farm','windmill','quarry','lumber','sawmill']) {
    const pl = getTourCopy(`building-${producer}`, 'pl').text;
    const en = getTourCopy(`building-${producer}`, 'en').text;
    assert.match(pl, /smutna buźka/);
    assert.match(pl, /tragarzy/);
    assert.match(pl, /priorytet/);
    assert.match(pl, /magazyn centralny ma miejsce/);
    assert.match(pl, /lekcję 11/);
    assert.match(pl, /natychmiastowego transportu za monety/);
    assert.doesNotMatch(pl, /jedynym sposobem/i);
    assert.match(en, /lesson 11/);
    assert.match(en, /Instant transport for coins/);
  }
});

test('native Polish ship, category and path copy uses the explicitly requested wording', () => {
  assert.equal(getTourCopy('ship','pl').text,'Statek prowadzi do handlu w Porcie. Kupowane i sprzedawane materiały potrzebują transportu — sama transakcja nie zastępuje dostawy.');
  assert.match(getTourCopy('category-economy','pl').text,/^Tutaj możesz zobaczyć/);
  assert.equal(getTourCopy('category-paths','pl').text,'Do ulepszania ścieżek potrzebujesz kamienia. Lepsze ścieżki to sprawniejszy przewóz towarów.');
  assert.match(getTourCopy('category-decorations','pl').text,/szczęścia\. Możesz je kupić za monety\./);
  assert.match(getTourCopy('arrival','pl').text,/limicie wyznaczonym przez poziom Ratusza/);
});

test('new practical copy teaches three carriers and actual services while preserving the old goal', () => {
  assert.match(lessonCopy('island-map','pl',{curriculum:6}).description,/trzech tragarzy/);
  assert.match(lessonCopy('island-map','pl',{curriculum:5}).description,/sześciu tragarzy/);
  assert.match(lessonCopy('townhall-upgrade','pl',{curriculum:6}).description,/natychmiastowego transportu.*skróć budowę o 100%/);
  assert.match(lessonCopy('construction-queue','pl',{curriculum:6}).description,/Kup rozbudowę.*10 sekund/);
  assert.match(lessonCopy('storage-limits','pl',{curriculum:6}).description,/Zboże.*zachowując.*Budowę/);
  assert.match(lessonCopy('house-points','pl',{curriculum:6}).description,/Znajdź Magazyn/);
  assert.match(lessonCopy('personal-happiness','pl',{curriculum:6}).description,/wszystkim.*siedem porcji/);
  assert.doesNotMatch(lessonCopy('personal-happiness','pl',{curriculum:6}).description,/wybrać konkretną osobę/);
});

test('happiness explanation and feedback never call points percentages in Polish', () => {
  const texts = [getTourCopy('happiness','pl').text,
    lessonCopy('returning-workers','pl').description,
    ...['lighthouseChanged','happinessChanged','happinessAlreadyMaximum'].map(key=>uiCopy(key,'pl',{before:25,after:32,time:'2 godz.'}))];
  for (const text of texts) {
    assert.doesNotMatch(text,/%|p\.p\.|punkt\w* procentow/);
  }
  assert.match(uiCopy('resumeTourDescription','pl'),/interfejsie i zasadach/);
  assert.match(uiCopy('resumePracticalDescription','pl'),/25 praktycznych/);
});
