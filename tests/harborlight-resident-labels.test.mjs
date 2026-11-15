import test from 'node:test';
import assert from 'node:assert/strict';
import { createResidentDirectory } from '../harborlight-v1-resident-labels.js';

const person = (id, workplace = null, extra = {}) => ({ id, personUid: `island-1:resident-${id}`, workplace, arrivalRemaining: 0, returnRemaining: 0, ...extra });
function world(people) {
  return { residents: people, education: { people: {}, courses: [], researches: [] }, military: { people: {}, courses: [], squads: [] } };
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child); }
  return value;
}

test('professors use their own full-island numbering across reordered and filtered lists, ignoring generic names', () => {
  const first = person(19, 'academy', { name: 'Mieszkaniec 19' }), second = person(42, 'academy', { name: 'Professor 42' });
  const state = world([second, person(1), first]);
  state.education.people[first.personUid] = { profession: 'professor' };
  state.education.people[second.personUid] = { profession: 'professor' };
  freeze(state);
  const directory = createResidentDirectory(state);
  assert.equal(directory.label(first), 'Profesor 1');
  assert.equal(directory.label({ personUid: second.personUid, name: 'Mieszkaniec 42' }), 'Profesor 2');
  assert.equal(directory.groups([second])[0].people[0].label, 'Profesor 2');
  assert.equal(directory.groups([second])[0].label, 'Profesorowie');
  assert.equal(directory.label('19'), 'Profesor 1');
  assert.equal(directory.label(second.personUid), 'Profesor 2');
});

test('free residents and each workplace have independent descriptive labels and occupation groups', () => {
  const state = world([person(90, 'bakery'), person(3), person(20, 'quarry'), person(8, 'warehouse'), person(99, 'bakery'), person(6)]);
  const directory = createResidentDirectory(state), groups = directory.groups();
  assert.equal(directory.label(90), 'Piekarz 1');
  assert.equal(directory.label(99), 'Piekarz 2');
  assert.equal(directory.label(20), 'Kamieniarz 1');
  assert.equal(directory.label(8), 'Tragarz 1');
  assert.equal(directory.label(3), 'Wolny w Domu 1');
  assert.equal(directory.label(6), 'Wolny w Domu 2');
  assert.deepEqual(groups.map(group => group.label), ['Wolni w Domu', 'Kamieniarze', 'Tragarze', 'Pracownicy Piekarni']);
  assert.deepEqual(groups.at(-1).people.map(row => row.uid), ['island-1:resident-90', 'island-1:resident-99']);
});

test('permanent professor and military titles survive temporary delegation to ordinary workplaces', () => {
  const professor = person(20, 'bakery'), soldier = person(2, 'quarry'), officer = person(13, 'warehouse');
  const state = world([professor, soldier, officer]);
  state.education.people[professor.personUid] = { profession: 'professor' };
  state.military.people[soldier.personUid] = { rank: 'soldier' };
  state.military.people[officer.personUid] = { rank: 'officer' };
  const directory = createResidentDirectory(state);
  assert.equal(directory.label(professor), 'Profesor 1');
  assert.equal(directory.group(professor).label, 'Pracownicy Piekarni');
  assert.equal(directory.label(soldier), 'Żołnierz 1');
  assert.equal(directory.group(soldier).label, 'Kamieniarze');
  assert.equal(directory.label(officer), 'Oficer 1');
  assert.equal(directory.group(officer).label, 'Tragarze');
});

test('transient occupations group pupils, trainees, prayer, visits, returns and ships without claiming they are free at Home', () => {
  const pupil = person(1), recruit = person(2), prayer = person(3, null, { prayerRemaining: 200 });
  const visitor = person(4, null, { visitGroup: 7 }), returning = person(5, null, { returnRemaining: 30 });
  const passenger = person(6, null, { shipId: 'ship-1' }), arriving = person(7, 'bakery', { arrivalRemaining: 90 });
  const recalled = person(8, 'warehouse', { pendingRelease: true });
  const state = world([pupil, recruit, prayer, visitor, returning, passenger, arriving, recalled]);
  state.education.courses.push({ studentUid: pupil.personUid });
  state.military.courses.push({ studentUid: recruit.personUid });
  const directory = createResidentDirectory(state);
  assert.equal(directory.entry(pupil).groupKey, 'students');
  assert.equal(directory.label(pupil), 'Adept 1');
  assert.equal(directory.entry(recruit).groupKey, 'recruits');
  assert.equal(directory.label(recruit), 'Rekrut 1');
  assert.equal(directory.entry(prayer).groupKey, 'praying');
  assert.equal(directory.entry(visitor).groupKey, 'visitors');
  assert.equal(directory.entry(returning).groupKey, 'returning');
  assert.equal(directory.entry(passenger).groupKey, 'sea');
  assert.equal(directory.entry(arriving).groupKey, 'workplace:bakery');
  assert.equal(directory.entry(arriving).statusLabel, 'W drodze do pracy');
  assert.equal(directory.entry(recalled).groupKey, 'workplace:warehouse');
  assert.match(directory.entry(recalled).statusLabel, /Kończy przydział/);
  assert.ok(directory.groups().every(group => group.key !== 'home'));
});

test('status views retain source fields and UID values while canonical roles control the labels', () => {
  const actual = person(9, 'academy'), state = world([actual]);
  state.education.people[actual.personUid] = { profession: 'professor' };
  const view = { id: 9, personUid: actual.personUid, name: 'Mieszkaniec 9', busy: true, present: false, custom: { untouched: 1 } };
  const before = structuredClone({ state, view });
  const directory = createResidentDirectory(state), result = directory.groups([view, actual.personUid]);
  assert.equal(result.length, 1);
  assert.equal(result[0].people.length, 1);
  const row = result[0].people[0];
  assert.equal(row.person, view);
  assert.equal(row.canonicalPerson, actual);
  assert.equal(row.uid, actual.personUid);
  assert.equal(row.label, 'Profesor 1');
  assert.equal(row.person.busy, true);
  assert.equal(row.person.present, false);
  assert.deepEqual({ state, view }, before);
});

test('real user names are kept after the role and generated names do not survive as misleading identities', () => {
  const professor = person(9, 'academy', { name: 'Łucjan' }), worker = person(16, 'bakery', { nickname: 'Anna' });
  const state = world([professor, worker, person(20, 'quarry', { name: 'Resident #20' })]);
  state.education.people[professor.personUid] = { profession: 'professor' };
  const directory = createResidentDirectory(state);
  assert.equal(directory.label(professor), 'Profesor 1 · Łucjan');
  assert.equal(directory.label(worker), 'Piekarz 1 · Anna');
  assert.equal(directory.label(20), 'Kamieniarz 1');
  assert.equal(worker.nickname, 'Anna');
});

test('stable UIDs keep the same ordinal through array reorder and local ID renumbering', () => {
  const state = world([person(90, 'bakery'), person(6, 'bakery'), person(32, 'bakery')]);
  const before = createResidentDirectory(state);
  const expected = new Map(state.residents.map(person => [person.personUid, before.label(person)]));
  const restored = structuredClone(state);
  restored.residents.reverse().forEach((person, index) => { person.id = index + 1; });
  const after = createResidentDirectory(restored);
  for (const person of restored.residents) assert.equal(after.label(person.personUid), expected.get(person.personUid));
});

test('away soldiers and explicit voyage extras are labelled, and a foreign UID is never replaced by a colliding local ID', () => {
  const soldier = person(2, 'barracks'), away = person(9, 'barracks'), lost = person(1, 'barracks');
  const passenger = { id: 2, personUid: 'other-island:resident-7', shipId: 'ship-1', name: 'Mira' };
  const state = world([soldier]);
  for (const person of [soldier, away, lost]) state.military.people[person.personUid] = { rank: 'soldier' };
  state.military.squads = [{ stage: 'away', people: [away, lost], lostUids: [lost.personUid] }];
  const directory = createResidentDirectory(state, { extraPeople: [passenger] });
  assert.equal(directory.label(soldier), 'Żołnierz 1');
  assert.equal(directory.label(away), 'Żołnierz 2');
  assert.equal(directory.entry(away).groupKey, 'expeditions');
  assert.equal(directory.entry(passenger).uid, passenger.personUid);
  assert.equal(directory.label(passenger), 'Podróżny 1 · Mira');
  const foreign = { id: 2, personUid: 'yet-another:resident-2', workplace: 'bakery' };
  assert.equal(directory.entry(foreign).uid, foreign.personUid);
  assert.equal(directory.label(foreign), 'Piekarz 2');
  assert.equal(directory.entry(foreign).canonicalPerson, foreign);
});

test('English uses the same identities, profession precedence and groups with English labels', () => {
  const state = world([person(1), person(8, 'quarry'), person(50, 'academy')]);
  state.education.people['island-1:resident-50'] = { profession: 'professor' };
  const directory = createResidentDirectory(state, { language: 'en' });
  assert.equal(directory.label(1), 'Free at Home 1');
  assert.equal(directory.label(8), 'Stoneworker 1');
  assert.equal(directory.label(50), 'Professor 1');
  assert.equal(directory.group(50).label, 'Professors');
});

test('adding voyage passengers cannot renumber the island residents in another menu', () => {
  const local = { ...person(50, 'academy'), personUid: 'z-island:resident-50' };
  const visitor = { ...person(2), personUid: 'a-island:resident-2', profession: 'professor', shipId: 'ship-1' };
  const state = world([local]);
  state.education.people[local.personUid] = { profession: 'professor' };
  assert.equal(createResidentDirectory(state).label(local), 'Profesor 1');
  const voyage = createResidentDirectory(state, { extraPeople: [visitor] });
  assert.equal(voyage.label(local), 'Profesor 1');
  assert.equal(voyage.label(visitor), 'Profesor 2');
});

test('a 3600-person directory labels each person once and filtered views preserve the full population numbering', () => {
  const state = world(Array.from({ length: 3600 }, (_, index) => person(index + 1, index % 3 === 0 ? 'bakery' : index % 3 === 1 ? 'quarry' : null)));
  freeze(state);
  const directory = createResidentDirectory(state), groups = directory.groups();
  assert.equal(groups.length, 3);
  assert.equal(groups.reduce((sum, group) => sum + group.people.length, 0), 3600);
  assert.equal(new Set(groups.flatMap(group => group.people.map(row => row.label))).size, 3600);
  assert.equal(directory.label(3598), 'Piekarz 1200');
  assert.equal(directory.groups([state.residents[3597]])[0].people[0].label, 'Piekarz 1200');
  assert.equal(directory.entry('missing-person').groupKey, 'other');
});
