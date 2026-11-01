import test from 'node:test';
import assert from 'node:assert/strict';
import { APPROVED_TOUR_IDS, APPROVED_LESSON_IDS, getTourCopy, introCopy, lessonCopy, uiCopy } from '../harborlight-v1-approved-copy.js';
import { TUTORIAL_LESSONS, V4_TUTORIAL_LESSONS } from '../harborlight-v1-progression.js';
import { buildingPurpose, gameGoal, residentsPurpose } from '../harborlight-v1-copy.js';
import { translate } from '../harborlight-v1-i18n.js';

test('approved 34-step route preserves HUD order and places Chat before the bell', () => {
  assert.equal(APPROVED_TOUR_IDS.length, 34);
  assert.equal(new Set(APPROVED_TOUR_IDS).size, 34);
  assert.deepEqual(APPROVED_TOUR_IDS.slice(0, 9), ['home','level','happiness','coins','working','arrival','points','population','clock']);
  assert.deepEqual(APPROVED_TOUR_IDS.slice(-5), ['tutorial','chat','notifications','settings','menu']);
  for (const id of APPROVED_TOUR_IDS) for (const language of ['pl','en']) {
    const copy = getTourCopy(id, language, { cloudAccount:true, firstIntroduction:true });
    assert.ok(copy.title && copy.text, `${id}/${language}`);
    assert.doesNotMatch(copy.text, /\[(?:uwaga|czy możesz)/i);
  }
  assert.equal(getTourCopy('tutorial', 'pl').title, 'Pomoc');
  assert.equal(getTourCopy('chat', 'pl').text, 'Tu możesz rozmawiać online z innymi graczami — prywatnie lub na czacie swojego sojuszu.');
});

test('the resource explanation uses fresh real values and never presents the old invented example', () => {
  let example = {resource:'stone',local:17,central:423,inTransit:9,hourlyBalance:-2.5};
  const options = {resourceExample:()=>example};
  const first = getTourCopy('category-resources', 'pl', options).text;
  assert.match(first, /Kamień 17 \/ 423 \(9\), → -2,5 szt\.\/h/);
  assert.doesNotMatch(first, /537/);
  example = {...example,local:23,central:410,inTransit:15,hourlyBalance:4.25};
  assert.match(getTourCopy('category-resources','pl',options).text, /Kamień 23 \/ 410 \(15\), → \+4,25 szt\.\/h/);
  assert.match(getTourCopy('category-resources','en',options).text, /Stone 23 \/ 410 \(15\), → \+4\.25 units\/h/);
  for (const invalid of [null,{}, {...example,central:Infinity}]) {
    const body = getTourCopy('category-resources','pl',{resourceExample:invalid}).text;
    assert.doesNotMatch(body, /Na Twojej wyspie:|537|undefined|NaN|Infinity/);
  }
});

test('new lesson presentation updates all 25 native descriptions without changing historical course goals', () => {
  assert.equal(APPROVED_LESSON_IDS.length, 25);
  assert.deepEqual(TUTORIAL_LESSONS.map(row=>row.id), APPROVED_LESSON_IDS);
  assert.equal(TUTORIAL_LESSONS[0].subject, 'assign-warehouse');
  assert.equal(TUTORIAL_LESSONS[0].assignmentCount, 6);
  for (const row of TUTORIAL_LESSONS) {
    const pl = lessonCopy(row.id,'pl'), en = lessonCopy(row.id,'en');
    assert.equal(row.title, en.title); assert.equal(row.description,en.description);
    assert.equal(row.titlePl,pl.title); assert.equal(row.descriptionPl,pl.description);
    assert.doesNotMatch(pl.description,/pięć minut|20 sekund|dodatkowa skrzynia/);
  }
  assert.match(TUTORIAL_LESSONS[0].descriptionPl,/2 minut/);
  assert.equal(V4_TUTORIAL_LESSONS[20].subject,'upgrade-townhall');
  assert.equal(V4_TUTORIAL_LESSONS[20].goalLevel,3);
  assert.equal(lessonCopy('lighthouse-visits','pl',{curriculum:4}),null);
});

test('housing copy distinguishes Town Hall population, House points and personal work/meal consequences', () => {
  for (const language of ['pl','en']) {
    const text = getTourCopy('building-house',language).text;
    assert.match(text,language==='pl'?/Ratusz.*maksymalną liczbę.*Dom.*miejsc/:/Town Hall.*population limit.*House.*housing/);
    assert.match(text,language==='pl'?/dwa razy wolniej.*dwa razy więcej/:/half speed.*twice as much/);
  }
  assert.match(residentsPurpose('pl'),/Brak łóżek nie obniża szczęścia całej wyspy/);
  assert.match(translate('Only residents with a bed can receive House happiness points.','pl'),/tylko mieszkańcy mający/);
  assert.match(translate('Residents without beds','pl'),/Mieszkańcy bez łóżek/);
  assert.match(translate('The destination needs free Town Hall population places for all passengers.','pl'),/limicie Ratusza/);
});

test('Lighthouse motivates development while the welcome and exits preserve exact learning terminology', () => {
  assert.match(gameGoal('pl').title,/Latarni blask/);
  assert.match(buildingPurpose('lighthouse','pl'),/sercem wyspy.*głównych celów/);
  assert.match(introCopy('pl').paragraphs.join(' '),/Jednym z Twoich głównych celów.*Latarni/);
  assert.equal(introCopy('pl').paragraphs.length,2);
  assert.match(uiCopy('exitTourBody','pl'),/\? → Wznów tutorial/);
  assert.equal(uiCopy('rewardFooter','pl'),'Nagroda została dodana do Twoich zasobów. Kliknij „Dalej”, aby przejść do kolejnej lekcji.');
  assert.doesNotMatch(uiCopy('rewardFooter','pl'),/skrzyni/);
  assert.match(uiCopy('practicalComplete','pl'),/Teraz Ty wyznaczasz kierunek/);
});

test('mission action results remain natural Polish in the shared toast', () => {
  const cases = [
    ['Lighthouse mission step started.', 'Etap misji Latarni rozpoczęty.'],
    ['This Lighthouse mission step is already active.', 'Ten etap misji Latarni już trwa.'],
    ['Choose a whole amount within the remaining mission requirement.', 'Wpisz pełną liczbę jednostek, nie większą niż ilość brakująca w tym zadaniu.'],
    ['Mission contribution delivered.', 'Materiały na misję zostały przekazane.']
  ];
  for (const [english, polish] of cases) {
    assert.equal(translate(english, 'pl'), polish);
    assert.equal(translate(english, 'en'), english);
  }
});
