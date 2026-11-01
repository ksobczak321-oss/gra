import test from 'node:test';
import assert from 'node:assert/strict';
import { translate, formatDuration } from '../harborlight-v1-i18n.js';
import { buildingPurpose, gameGoal, residentsPurpose, warehousePurpose, lighthouseLevelName } from '../harborlight-v1-copy.js';

test('task instructions are a complete Polish paragraph after Donations replaced Deposits', () => {
  const source = 'Only one task can be active. Deliver goods from central storage in instalments. Donations are irreversible and are lost when the deadline expires. Food below the protected reserve cannot be donated. Each task shows its own expiry time.';
  assert.equal(translate(source, 'pl'), 'Możesz realizować jedno zadanie naraz i przekazywać towary z magazynu centralnego w ratach. Darowizn nie można wycofać, a po upływie czasu zadania przekazane towary przepadają. Każde zadanie ma własny licznik czasu; chronionej rezerwy żywności nie można przekazać.');
  assert.equal(translate(source, 'en'), source);
});

test('Chapel joins a translated static status to a translated live use counter', () => {
  assert.equal(translate('No active upgrade bonus. Uses remaining: 1.', 'pl'), 'Brak aktywnej premii za rozbudowę. Pozostałe użycia: 1.');
  assert.equal(translate('No active upgrade bonus. Uses remaining: 0.', 'pl'), 'Brak aktywnej premii za rozbudowę. Pozostałe użycia: 0.');
});

test('active construction details translate both transport and building estimates', () => {
  for (const [timing, expected] of [
    ['Transport Waiting for carriers · construction Waiting for carriers.', 'Transport: Oczekiwanie na tragarzy · budowa: Oczekiwanie na tragarzy.'],
    ['Transport 5 min 0 s · construction 20 min 0 s.', 'Transport: 5 min 0 s · budowa: 20 min 0 s.']
  ]) {
    const source = `Transport for level 3: 0 / 500 delivered. ${timing}`;
    assert.equal(translate(source, 'pl'), `Transport dla poziomu 3: dostarczono 0 / 500. ${expected}`);
    assert.equal(translate(source, 'en'), source);
  }
});

test('full expedition completion wins over a generic Level prefix and uses Polish coin inflection', () => {
  assert.equal(translate('Level 3 complete. Pot: 150 coins. Cash out or risk it on the next level.', 'pl'), 'Poziom 3 ukończony. Pula: 150 monet. Wypłać nagrodę lub zaryzykuj całą pulę na kolejnym poziomie.');
  assert.match(translate('Level 8 complete. Pot: 2 coins. Cash out or risk it on the next level.', 'pl'), /Pula: 2 monety\./);
});

test('full resident notification wins over the generic Resident prefix', () => {
  assert.equal(translate('Resident 12 received 3 happiness points.', 'pl'), 'Mieszkaniec 12 otrzymał 3 punkty szczęścia.');
  assert.equal(translate('4 residents moved into the House. Their happiness remains at 0% for their first 24 hours.', 'pl'), 'Nowi mieszkańcy w Domu: 4. Przez pierwsze 24 godziny ich szczęście pozostaje na 0%.');
});

test('waiting ETA, active attraction lock and warehouse arrival notifications have no English clauses', () => {
  const fixtures = [
    ['Waiting for available warehouse carriers or an earlier upgrade.', 'Oczekiwanie na wolnych tragarzy z magazynu lub ukończenie wcześniejszej rozbudowy.'],
    ['Another attraction is active. Wait until its six-hour effect ends.', 'Trwa inna atrakcja. Poczekaj, aż zakończy się jej sześciogodzinny efekt.'],
    ['The expected materials have arrived in the warehouse. The full cost is now reserved.', 'Spodziewane materiały dotarły do magazynu. Pełny koszt jest już zarezerwowany.'],
    ['A construction slot is available. Reserved materials are waiting for transport.', 'Zwolniło się miejsce budowy. Zarezerwowane materiały czekają na transport.']
  ];
  for (const [source, expected] of fixtures) assert.equal(translate(source, 'pl'), expected);
});

test('attraction dynamic descriptions translate complete messages and singular recipients', () => {
  assert.equal(translate('+10 pp happiness for 1 resident for 6 hours. Cost: 10 coins.', 'pl'), '+10 p.p. szczęścia dla 1 osoby przez 6 godzin. Koszt: 10 monet.');
  assert.equal(translate('Path lamps: +5 pp happiness for 6 residents for 6 hours.', 'pl'), 'Lampy przy ścieżkach: +5 p.p. szczęścia dla 6 osób przez 6 godzin.');
});

test('time unit conversion does not duplicate punctuation', () => {
  assert.equal(translate('6 h.', 'pl'), '6 godz.');
  assert.equal(formatDuration(6 * 3600, 'pl'), '6 godz. 0 s');
});

test('multi-sentence population status preserves the complete zero-happiness clause before splitting separators', () => {
  assert.equal(translate('0% happiness · no population growth or decline. Overcrowding lowers happiness and may cause population decline.', 'pl'), '0% szczęścia · populacja nie rośnie ani nie maleje. Przeludnienie obniża szczęście i może powodować spadek populacji.');
  assert.equal(translate('8 Food · 2 random per 10 trips · next allocation 4 / 10', 'pl'), '8 jedn. żywności · 2 losowe na 10 kursów · kolejny przydział 4 / 10');
});

test('all 100 achieved Lighthouse levels have distinct bilingual names and level zero is Ruins', () => {
  for (const language of ['en', 'pl']) {
    const names = Array.from({ length: 100 }, (_, index) => lighthouseLevelName(index + 1, language));
    assert.equal(new Set(names).size, 100);
    assert.ok(names.every(name => typeof name === 'string' && name.trim().length > 3));
    for (const name of names) if (language === 'en') assert.notEqual(translate(name, 'pl'), name);
  }
  assert.equal(lighthouseLevelName(0, 'pl'), 'Ruiny');
  assert.equal(lighthouseLevelName(0), 'Ruins');
  assert.equal(lighthouseLevelName(101, 'pl'), lighthouseLevelName(100, 'pl'));
});

test('all 12 buildings have a concise bilingual purpose and whole-island goal', () => {
  for (const id of ['townhall', 'house', 'farm', 'windmill', 'quarry', 'lumber', 'sawmill', 'warehouse', 'market', 'dock', 'chapel', 'lighthouse']) {
    const source = buildingPurpose(id);
    assert.ok(source.length > 20, id);
    assert.equal(translate(source, 'pl'), buildingPurpose(id, 'pl'));
  }
  assert.equal(gameGoal('pl').title, 'Rozwijaj wyspę. Przywróć Latarni blask.');
  assert.match(gameGoal('pl').description, /większą osadę.*lepsze warunki życia/);
  assert.match(gameGoal('pl').description, /Latarni.*nowe cele/);
  assert.equal(translate(gameGoal().description, 'pl'), gameGoal('pl').description);
});

test('resident and warehouse introductions retain constraints and use new carrier base', () => {
  assert.match(residentsPurpose('pl'), /macierzystej pozostaje co najmniej 12 osób/);
  assert.match(residentsPurpose('pl'), /córce — 6/);
  assert.match(residentsPurpose('pl'), /Przy szczęściu 0%/);
  assert.match(warehousePurpose('pl'), /120 sztuk/);
  assert.match(warehousePurpose('pl'), /pięciominutowym/);
  assert.equal(translate(residentsPurpose(), 'pl'), residentsPurpose('pl'));
  assert.equal(translate(warehousePurpose(), 'pl'), warehousePurpose('pl'));
});
