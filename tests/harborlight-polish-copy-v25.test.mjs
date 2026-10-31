import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translate, untranslatedTexts, formatNumber } from '../harborlight-v1-i18n.js';
import { BUILDINGS, createState, upgradeEligibility, act } from '../harborlight-v1-state.js';
import { buildingPurpose, residentsPurpose, warehousePurpose } from '../harborlight-v1-copy.js';
import { activeEffects } from '../harborlight-v1-effects.js';
import { finishConstruction, foodReserve } from '../harborlight-v1-logistics.js';
import { worldEventRows } from '../harborlight-v1-events.js';
import { normalizeActivities, activityAction, quoteExtraTime, quoteConstructionPackage } from '../harborlight-v1-activities.js';

const NOW = Date.parse('2026-10-31T12:00:00Z');
const englishResidue = /\b(?:the|each|from|with|before|after|until|cannot|must|will|received|purchase|coins|residents|storage|goods|reward|happiness|production|carrying|round|seconds|pending|world|Farm|House|Lighthouse)\b/i;
function assertPolish(source, context = '') {
  const polish = translate(source, 'pl');
  assert.notEqual(polish, source, `${context}: untranslated source ${source}`);
  assert.doesNotMatch(polish, englishResidue, `${context}: ${polish}`);
  assert.equal(translate(source, 'en'), source, context);
  return polish;
}

test('current building descriptions explain concrete recipes and preserve actual production and storage values', () => {
  for (const [id, building] of Object.entries(BUILDINGS)) assertPolish(building.description, id);
  const mill = translate(BUILDINGS.windmill.description, 'pl');
  const sawmill = translate(BUILDINGS.sawmill.description, 'pl');
  assert.match(mill, /20 jednostek żywności.*24.*2 jednostki na godzinę/);
  assert.match(mill, /Jedna jednostka żywności wymaga 2 jednostek zboża z magazynu centralnego/);
  assert.equal(BUILDINGS.windmill.inputRate, 2);
  assert.match(sawmill, /Jedna deska wymaga 2 jednostek drewna z magazynu centralnego/);
  assert.equal(BUILDINGS.sawmill.inputRate, 2);
  assert.match(translate(BUILDINGS.warehouse.description, 'pl'), /1000.*4000.*120.*pięciominutowym.*50%.*10 mln.*40 mln.*24/);
  assert.match(buildingPurpose('dock', 'pl'), /Od 4\. poziomu.*Od 6\..*10, 13, 16.*20 wysp/);
  assert.match(residentsPurpose('pl'), /macierzystej.*12.*córce.*6.*0%.*100%.*30 minut.*72 godziny.*20%/);
  assert.match(warehousePurpose('pl'), /nagród.*ponad zwykłym limitem/);
});

test('coin and plank quantities follow Polish nominative and accusative rules in notifications and controls', () => {
  for (const [count, noun, received] of [[1, 'moneta', 'monetę'], [2, 'monety', 'monety'], [5, 'monet', 'monet'], [12, 'monet', 'monet'], [22, 'monety', 'monety']]) {
    assert.equal(translate(`Paid blessing · ${count} coins`, 'pl'), `Płatne błogosławieństwo · ${count} ${noun}`);
    assert.equal(translate(`Buy 100 for ${count} coins`, 'pl'), `Kup 100 za ${count} ${received}`);
    assert.equal(translate(`Expected-delivery plan scheduled. Fee: ${count} coins.`, 'pl'), `Zaplanowano przyszłe dostawy. Opłata: ${count} ${noun}.`);
    assert.equal(translate(`Cashed out ${count} expedition coins to your island.`, 'pl'), `Wypłacono na wyspę ${count} ${received} z ekspedycji.`);
  }
  for (const [count, noun, bought] of [[1, 'deska', 'deskę'], [2, 'deski', 'deski'], [5, 'desek', 'desek']]) {
    assert.equal(translate(`${count} Planks`, 'pl'), `${count} ${noun}`);
    assert.equal(translate(`Bought ${count} planks for 1 coins.`, 'pl'), `Kupiono ${count} ${bought} za 1 monetę.`);
  }
  assert.equal(translate('8 Food · 2 random per 10 trips · next allocation 4 / 10', 'pl'), '8 jedn. żywności · 2 losowe na 10 kursów · kolejny przydział 4 / 10');
  assert.equal(translate('Exchanged 1 planks for 9 food. Market fee: 10%.', 'pl'), 'Wymieniono 1 deskę na 9 jedn. żywności. Prowizja targu wynosi 10%.');
});

test('happiness and purchased seconds use natural Polish singular, plural and percentage-point units', () => {
  for (const [count, noun, seconds] of [[1, 'punkt', 'sekundę'], [2, 'punkty', 'sekundy'], [5, 'punktów', 'sekund']]) {
    assert.equal(translate(`Distributed ${count} House happiness points.`, 'pl'), `Rozdzielono ${count} ${noun} szczęścia z domu.`);
    assert.equal(translate(`Resident 4 received ${count} happiness points.`, 'pl'), `Mieszkaniec 4 otrzymał ${count} ${noun} szczęścia.`);
    assert.equal(translate(`Added ${count} seconds for 1 coins.`, 'pl'), `Dodano ${count} ${seconds} za 1 monetę.`);
  }
  assert.equal(translate('Happiness −10 pp', 'pl'), 'Szczęście −10 p.p.');
});

test('real expedition action results explain the ad pause and additional-time controls entirely in Polish', () => {
  const state = createState(NOW);
  normalizeActivities(state, { activitySeed: 2 });
  const context = { expeditions: [{ id: 'proof', map: ['S.G'], tools: {} }] };
  const act = (type, details = {}) => activityAction(state, { type, ...details }, context);
  assert.equal(act('expeditionStart', { expedition: 'proof', gameKind: 'triples' }).ok, true);
  const run = state.expeditionRuns.proof;
  assertPolish(quoteExtraTime(state, run).message, 'time quote');
  const begin = act('expeditionAdBegin', { runId: run.id });
  assert.equal(begin.ok, true);
  assert.match(assertPolish(begin.message, 'ad started'), /runda zostaje wstrzymana.*Czas na wyspie nadal biegnie/);
  assertPolish(quoteExtraTime(state, run).message, 'ad blocks time purchase');
  assertPolish(act('expeditionAdBegin', { runId: run.id }).message, 'duplicate ad');
  assertPolish(act('expeditionAdCancel', { runId: run.id, nonce: begin.nonce }).message, 'skip ad');
  for (let purchase = 0; purchase < 2; purchase++) {
    const result = act('expeditionExtraTime', { runId: run.id });
    assert.equal(result.ok, true);
    assert.match(assertPolish(result.message, 'purchased time'), /Dodano 30 sekund za 10 monet/);
  }
  assertPolish(quoteExtraTime(state, run).message, 'purchase limit');
  assert.equal(run.roundLimit, 300);
  assert.equal(state.resources.coins, 80);
});

test('world-event rows use the same Polish names and units in their own panel and in active effects', () => {
  const state = createState(NOW);
  state.worldEvents.effects = [
    { id: 'fertilizer', kind: 'fertilizer', farmBonusPercent: 25, untilMs: state.worldEvents.clockMs + 120000 },
    { id: 'plague', kind: 'plague', happinessPenalty: 10, untilMs: state.worldEvents.clockMs + 120000 },
    { id: 'tax', kind: 'royal-tax', happinessPenalty: 5, untilMs: state.worldEvents.clockMs + 120000 },
    { id: 'beetles', kind: 'beetles', happinessPenalty: 2, untilMs: state.worldEvents.clockMs + 120000 },
    { id: 'roads', kind: 'damaged-roads', transportSlowPercent: 20, untilMs: state.worldEvents.clockMs + 120000 }
  ];
  state.worldEvents.deferredCoins = '100';
  state.blessingRemaining = 3600;
  const before = structuredClone(state);
  const englishRows = worldEventRows(state, 'en'), polishRows = worldEventRows(state, 'pl');
  assert.equal(englishRows.length, 6);
  for (let i = 0; i < englishRows.length; i++) {
    assert.equal(translate(englishRows[i].title, 'pl'), polishRows[i].title);
    assert.equal(translate(englishRows[i].description, 'pl'), polishRows[i].description);
  }
  untranslatedTexts.clear();
  for (const row of activeEffects(state)) {
    for (const key of ['title', 'effect', 'scope', 'endCondition', 'explain']) {
      if (row[key] && /[A-Za-z]{3,}/.test(row[key])) assertPolish(row[key], `${row.id}.${key}`);
    }
  }
  assert.deepEqual([...untranslatedTexts], []);
  assert.deepEqual(state, before, 'translating effects must not change saved mechanics');
});


test('complete static results and explanations in ordinary gameplay models have no English fallback', () => {
  const files = ['state', 'activities', 'logistics', 'leisure', 'effects', 'events', 'profile', 'commerce', 'engagement'];
  const seen = new Set(), missing = [];
  for (const name of files) {
    const file = `harborlight-v1-${name}.js`;
    const code = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    // Complete literal sentences only; dynamic sentences are exercised above.
    for (const match of code.matchAll(/(['"])([A-Z][A-Za-z][^'"\n]*[.!?])\1/g)) {
      const source = match[2];
      if (source.includes('${') || /[ąćęłńóśźż]/i.test(source) || seen.has(source)) continue;
      seen.add(source);
      untranslatedTexts.clear();
      translate(source, 'pl');
      if (untranslatedTexts.has(source)) missing.push({ file, source });
    }
  }
  assert.ok(seen.size >= 300, 'retain broad coverage of actual model explanations and command results');
  assert.deepEqual(missing, []);
});


test('actual Town Hall threshold reasons translate as complete sentences at the first gate and later levels', () => {
  for (const [level, population, nextLevel, required] of [[3, 44, 4, 54], [13, 44, 14, 234]]) {
    const state = createState(NOW);
    state.buildings.townhall.level = level;
    state.population = population;
    const before = structuredClone(state);
    const result = upgradeEligibility(state, 'townhall');
    assert.equal(result.ok, false);
    assert.equal(result.code, 'townhall-population');
    assert.equal(result.populationRequired, required);
    const polish = assertPolish(result.message, `Town Hall ${level}→${nextLevel}`);
    assert.equal(polish, `Rozbudowa ratusza do ${nextLevel}. poziomu wymaga co najmniej ${required} mieszkańców (75% limitu ludności na ${level}. poziomie). Obecna liczba mieszkańców: ${population}.`);
    assert.deepEqual(state, before, 'formatting the threshold must not alter the island');
  }
});


test('premium descriptions and coin declension accept real Polish NBSP and narrow-NBSP numbers', () => {
  const state = createState(NOW);
  state.buildings.townhall.level = 13;
  const quote = quoteConstructionPackage(state);
  assert.equal(quote.coins, 13000);
  const price = formatNumber(quote.coins, 'pl');
  assert.match(price, /13[\u00a0\u202f]000/);
  const source = `24 hours for ${price} coins: +4 active construction places, unlimited queue and planning from forecast deliveries. Renewing adds another 24 hours to the remaining duration. Queued material costs include a 10% surcharge.`;
  const polish = assertPolish(source, 'formatted construction-package price');
  assert.match(polish, /^Pakiet na 24 godziny kosztuje 13[\u00a0\u202f]000 monet\./);
  assert.match(polish, /4 dodatkowe miejsca budowy.*nieograniczoną kolejkę.*kolejne 24 godziny.*10%/);
  for (const separator of ['\u00a0', '\u202f']) {
    for (const [amount, nominative, accusative] of [[1, 'moneta', 'monetę'], [2, 'monety', 'monety'], [5, 'monet', 'monet'], [22, 'monety', 'monety'], [13002, 'monety', 'monety']]) {
      const number = formatNumber(amount, 'pl').replace(/\u00a0/g, separator);
      assert.equal(translate(`Paid blessing · ${number} coins`, 'pl'), `Płatne błogosławieństwo · ${number} ${nominative}`);
      assert.equal(translate(`Buy 100 for ${number} coins`, 'pl'), `Kup 100 za ${number} ${accusative}`);
    }
  }
});

test('real construction completion notification translates its full building-level title', () => {
  const state = createState(NOW);
  state.buildings.quarry.level = 3;
  const project = { id: 'quarry-4', building: 'quarry', targetLevel: 4, stage: 'building', buildRemaining: 0 };
  state.constructionProjects = [project];
  finishConstruction(state, project);
  const notification = state.notifications.find(item => item.title === 'Quarry: level 4');
  assert.ok(notification, 'use the actual source title emitted after completion');
  const before = structuredClone(state);
  assert.equal(translate(notification.title, 'pl'), 'Kamieniołom: poziom 4');
  assertPolish(notification.message, 'construction completed');
  assert.deepEqual(state, before);
});

test('compact, expanded and building Chapel descriptions describe a fixed blessing lasting one hour', () => {
  const sourceCode = readFileSync(new URL('../harborlight-v1-play.js', import.meta.url), 'utf8');
  const paragraphs = [...sourceCode.matchAll(/(['"])(A manual blessing grants[^'"\n]+)\1/g)].map(match => match[2]);
  assert.ok(paragraphs.length >= 2, 'retain the actual compact and expanded Chapel descriptions');
  for (const source of [...new Set(paragraphs), BUILDINGS.chapel.description]) {
    const polish = assertPolish(source, 'manual blessing duration');
    assert.match(polish, /\+20 p\.p\. szczęścia przez godzinę/);
    assert.doesNotMatch(polish, /\+20 p\.p\. szczęścia na godzinę/);
  }
  const state = createState(NOW);
  const result = act(state, { type: 'blessing' }, NOW);
  assert.equal(result.ok, true);
  assert.equal(state.blessingRemaining, 3600);
  const effect = activeEffects(state).find(row => row.id === 'manual-blessing');
  assert.equal(effect.amount, 20);
  assert.equal(effect.remaining, 3600);
});


test('the actual expanded carrier help explains one material type, round-trip timing and capped food reserve', () => {
  const sourceCode = readFileSync(new URL('../harborlight-v1-play.js', import.meta.url), 'utf8');
  const source = sourceCode.match(/['"](A carrier takes one material per trip[^'"\n]+)['"]/)[1];
  const polish = assertPolish(source, 'expanded carrier help');
  assert.match(polish, /jeden rodzaj materiału/);
  assert.match(polish, /niepełnym ładunkiem/);
  assert.match(polish, /w obie strony trwa 5 minut/);
  assert.match(polish, /120 sztuk/);
  assert.match(polish, /rezerwa żywności wynosi 50 × poziom magazynu.*najwyżej 24\. poziom/);
  const state = createState(NOW);
  assert.equal(foodReserve(state), 50);
  state.buildings.warehouse.level = 24;
  assert.equal(foodReserve(state), 1200);
  state.buildings.warehouse.level = 25;
  assert.equal(foodReserve(state), 1200);
});


test('resident arrival and departure estimates are complete Polish sentences and meals use consistent units', () => {
  assert.equal(translate('A new resident in 3 h 38 min 27 s.', 'pl'), 'Nowy mieszkaniec za 3 godz. 38 min 27 s.');
  assert.equal(translate('One resident leaves in 1 h 0 s.', 'pl'), 'Jeden mieszkaniec odejdzie za 1 godz. 0 s.');
  assert.equal(translate('Estimate at current happiness: A new resident in 3 h 38 min 27 s. Overcrowding changes this rate.', 'pl'), 'Szacunek przy obecnym szczęściu: Nowy mieszkaniec za 3 godz. 38 min 27 s. Przeludnienie wpływa na ten szacunek.');
  const state = createState(NOW);
  const meals = activeEffects(state).find(row => row.id === 'regular-meals');
  const description = assertPolish(meals.explain, 'actual feeding explanation');
  assert.match(description, /jedną jednostkę żywności na godzinę/);
  assert.doesNotMatch(description, /jedną sztukę żywności|godz\.\./);
  const sourceCode = readFileSync(new URL('../harborlight-v1-play.js', import.meta.url), 'utf8');
  assert.ok(sourceCode.includes('Payment amount in PLN'), 'retain the actual payment input label');
  assert.equal(translate('Payment amount in PLN', 'pl'), 'Kwota płatności w PLN');
});

test('queue headings handle canonical and already-localized building names; premium titles and path bonuses are complete Polish', () => {
  for (const building of Object.values(BUILDINGS)) {
    const polishName = translate(building.name, 'pl');
    assert.equal(translate(`${building.name} → level 4`, 'pl'), `${polishName} → poziom 4`);
    assert.equal(translate(`${polishName} → level 4`, 'pl'), `${polishName} → poziom 4`);
  }
  const quote = quoteConstructionPackage(createState(NOW));
  assert.equal(translate(quote.message, 'pl'), 'Wycena pakietu budowlanego.');
  assert.equal(translate('+10% speed', 'pl'), '+10% szybkości');
  assert.equal(translate('+20% speed · +10% load', 'pl'), '+20% szybkości · +10% ładowności');
});
