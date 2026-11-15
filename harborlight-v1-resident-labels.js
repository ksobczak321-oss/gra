// Presentation only: role names and list groups never alter a resident or save.
const EPS = 1e-7;
const rows = value => Array.isArray(value) ? value : [];
const positive = value => Number(value) > EPS;
const identity = person => person && typeof person === 'object'
  ? String(person.personUid ?? person.uid ?? person.id ?? '') : String(person ?? '');
const compareIds = new Intl.Collator('en', { numeric: true, sensitivity: 'variant' }).compare;

const WORKPLACES = Object.freeze({
  townhall: ['Urzędnik', 'Official', 'Pracownicy Ratusza', 'Town Hall workers'],
  house: ['Pracownik Domu', 'House worker', 'Pracownicy Domu', 'House workers'],
  farm: ['Rolnik', 'Farmer', 'Pracownicy Gospodarstwa', 'Farm workers'],
  lumber: ['Drwal', 'Lumberjack', 'Drwale', 'Lumberjacks'],
  quarry: ['Kamieniarz', 'Stoneworker', 'Kamieniarze', 'Stoneworkers'],
  windmill: ['Młynarz', 'Miller', 'Młynarze', 'Millers'],
  sawmill: ['Tartacznik', 'Sawmill worker', 'Pracownicy Tartaku', 'Sawmill workers'],
  warehouse: ['Tragarz', 'Carrier', 'Tragarze', 'Carriers'],
  bakery: ['Piekarz', 'Baker', 'Pracownicy Piekarni', 'Bakery workers'],
  dairy: ['Mleczarz', 'Dairy worker', 'Pracownicy Mleczarni', 'Dairy workers'],
  slaughterhouse: ['Pracownik Rzeźni', 'Butcher', 'Pracownicy Rzeźni', 'Slaughterhouse workers'],
  fisher: ['Rybak', 'Fisher', 'Rybacy', 'Fishers'],
  leatherworks: ['Rzemieślnik skórzany', 'Leatherworker', 'Pracownicy Zakładu skórzanego', 'Leatherworkers'],
  academy: ['Pracownik Akademii', 'Academy worker', 'Pracownicy Akademii', 'Academy workers'],
  barracks: ['Pracownik Koszar', 'Barracks worker', 'Pracownicy Koszar', 'Barracks workers'],
  chapel: ['Pracownik Kaplicy', 'Chapel worker', 'Pracownicy Kaplicy', 'Chapel workers'],
  lighthouse: ['Latarnik', 'Lighthouse keeper', 'Pracownicy Latarni', 'Lighthouse workers'],
  market: ['Kupiec', 'Trader', 'Pracownicy Targu', 'Market workers'],
  dock: ['Pracownik Portu', 'Harbor worker', 'Pracownicy Portu', 'Harbor workers']
});
const ROLES = Object.freeze({
  professor: ['Profesor', 'Professor'], officer: ['Oficer', 'Officer'], soldier: ['Żołnierz', 'Soldier'],
  student: ['Adept', 'Student'], recruit: ['Rekrut', 'Recruit'], graduate: ['Absolwent', 'Graduate'],
  home: ['Wolny w Domu', 'Free at Home'], returning: ['Wracający do Domu', 'Returning resident'],
  praying: ['Modlący się', 'Praying resident'], visitor: ['Zwiedzający', 'Visitor'],
  sea: ['Podróżny', 'Passenger'], resident: ['Osoba', 'Person']
});
const GROUPS = Object.freeze({
  home: ['Wolni w Domu', 'Free at Home'], professors: ['Profesorowie', 'Professors'],
  officers: ['Oficerowie', 'Officers'], soldiers: ['Żołnierze', 'Soldiers'],
  students: ['Uczący się w Akademii', 'Academy students'], recruits: ['Rekruci i szkoleni', 'Recruits and trainees'],
  praying: ['Na modlitwie', 'At prayer'], visitors: ['Zwiedzający Latarnię', 'Lighthouse visitors'],
  returning: ['Wracający do Domu', 'Returning Home'], sea: ['W podróży morskiej', 'At sea'],
  expeditions: ['Na wyprawie', 'On expedition'], waiting: ['Oczekujący na powrót', 'Awaiting return'],
  other: ['Pozostałe zajęcia', 'Other occupations']
});
const GROUP_ORDER = ['home', ...Object.keys(WORKPLACES).map(id => `workplace:${id}`),
  'professors', 'officers', 'soldiers', 'students', 'recruits', 'praying', 'visitors',
  'returning', 'sea', 'expeditions', 'waiting', 'other'];
const GENERATED_NAME = /^(?:(?:mieszkaniec|resident|profesor|professor|oficer|officer|żołnierz|soldier|adept|student|rekrut|recruit|absolwent|graduate|piekarz|baker|kamieniarz|stoneworker|rolnik|farmer|drwal|lumberjack|tragarz|carrier|rybak|fisher|mleczarz|miller|młynarz|tartacznik)|wolny\s+w\s+domu|free\s+at\s+home)\s*#?\s*\d+$/iu;

function customName(person) {
  for (const candidate of [person?.name, person?.nickname]) {
    if (typeof candidate === 'string' && candidate.trim() && !GENERATED_NAME.test(candidate.trim())) return candidate.trim();
  }
  return '';
}

/**
 * Build once per view. Numbering uses all actual people on this island, never
 * the currently filtered dropdown. `extraPeople` can add ship passengers when
 * a caller renders a voyage whose people are outside the island population.
 */
export function createResidentDirectory(state = {}, { language = 'pl', extraPeople = [] } = {}) {
  const english = language === 'en', index = english ? 1 : 0;
  const text = (pl, en) => english ? en : pl;
  const students = new Set(rows(state.education?.courses).map(course => String(course.studentUid)));
  const recruits = new Set(rows(state.military?.courses).map(course => String(course.studentUid)));
  const teachers = new Set(rows(state.education?.courses).map(course => String(course.teacherUid)));
  const researchers = new Set(rows(state.education?.researches).flatMap(job => rows(job.professorUids).map(String)));
  const instructors = new Set(rows(state.military?.courses).map(course => String(course.instructorUid)));
  const away = new Map(), people = new Map(), byId = new Map();
  const add = person => {
    if (!person || typeof person !== 'object') return;
    const uid = identity(person);
    if (uid && !people.has(uid)) people.set(uid, person);
  };
  rows(state.residents).forEach(add);
  for (const squad of rows(state.military?.squads)) {
    if (!['away', 'waiting'].includes(squad.stage)) continue;
    const lost = new Set(rows(squad.lostUids));
    for (const person of rows(squad.people)) {
      if (lost.has(identity(person))) continue;
      add(person); away.set(identity(person), squad.stage);
    }
  }
  const islandUids = new Set(people.keys());
  rows(extraPeople).forEach(add);
  for (const [uid, person] of people) if (person.id != null && !byId.has(String(person.id))) byId.set(String(person.id), uid);
  const resolve = input => {
    const key = identity(input), found = people.get(key) || people.get(byId.get(key));
    if (found) return found;
    if (input && typeof input === 'object' && !input.personUid && !input.uid && input.id != null) return people.get(byId.get(String(input.id))) || input;
    return input && typeof input === 'object' ? input : null;
  };
  const facts = person => {
    if (!person) return { role: 'resident', group: 'other', statusLabel: '' };
    const uid = identity(person), education = state.education?.people?.[uid] || {}, military = state.military?.people?.[uid] || {};
    const rank = military.rank || person?.rank;
    const permanent = rank === 'officer' ? 'officer' : rank === 'soldier' ? 'soldier' :
      education.profession === 'professor' || person?.profession === 'professor' ? 'professor' : null;
    const sea = !!person?.shipId || person?.atSea === true;
    const returning = positive(person?.returnRemaining);
    const role = permanent || (students.has(uid) ? 'student' : recruits.has(uid) ? 'recruit' :
      WORKPLACES[person?.workplace] ? person.workplace : sea ? 'sea' :
      returning ? 'returning' : positive(person?.prayerRemaining) ? 'praying' :
      person?.visitGroup || person?.visiting ? 'visitor' :
      !person?.workplace ? positive(education.rounds) ? 'graduate' : 'home' : 'resident');
    const group = away.has(uid) ? away.get(uid) === 'waiting' ? 'waiting' : 'expeditions' :
      sea ? 'sea' : students.has(uid) ? 'students' : recruits.has(uid) ? 'recruits' :
      positive(person?.prayerRemaining) ? 'praying' : person?.visitGroup || person?.visiting ? 'visitors' :
      returning ? 'returning' : WORKPLACES[person?.workplace] && !['academy', 'barracks'].includes(person.workplace) ? `workplace:${person.workplace}` :
      permanent === 'professor' ? 'professors' : permanent === 'officer' ? 'officers' : permanent === 'soldier' ? 'soldiers' :
      WORKPLACES[person?.workplace] ? `workplace:${person.workplace}` : !person?.workplace ? 'home' : 'other';
    const statusLabel = away.has(uid) ? (away.get(uid) === 'waiting' ? text('Oczekuje na powrót', 'Awaiting return') : text('Na wyprawie', 'On expedition')) :
      sea ? text('W podróży morskiej', 'At sea') : students.has(uid) ? text('Uczy się w Akademii', 'Studying at the Academy') :
      recruits.has(uid) ? text('W trakcie szkolenia', 'In training') : positive(person?.prayerRemaining) ? text('Na modlitwie', 'At prayer') :
      person?.visitGroup || person?.visiting ? text('Zwiedza Latarnię', 'Visiting the Lighthouse') :
      returning ? text('Wraca do Domu', 'Returning Home') : person?.pendingRelease ? text('Kończy przydział przed powrotem', 'Finishing assignment before returning') :
      positive(person?.arrivalRemaining) ? text('W drodze do pracy', 'Walking to work') :
      researchers.has(uid) ? text('Prowadzi badania', 'Conducting research') : teachers.has(uid) ? text('Prowadzi zajęcia', 'Teaching') :
      instructors.has(uid) ? text('Prowadzi szkolenie', 'Training recruits') : '';
    return { role, group, statusLabel };
  };
  const descriptor = key => {
    const workplace = key.startsWith('workplace:') && WORKPLACES[key.slice(10)];
    return { key, label: workplace ? workplace[index + 2] : (GROUPS[key] || GROUPS.other)[index] };
  };
  const records = new Map(), counts = new Map();
  for (const [uid, person] of [...people].sort(([a], [b]) =>
    Number(!islandUids.has(a)) - Number(!islandUids.has(b)) || compareIds(a, b))) {
    const data = facts(person), number = (counts.get(data.role) || 0) + 1;
    counts.set(data.role, number);
    const prefix = (WORKPLACES[data.role] || ROLES[data.role] || ROLES.resident)[index];
    const givenName = customName(person), label = `${prefix} ${number}${givenName ? ` · ${givenName}` : ''}`;
    const group = descriptor(data.group);
    records.set(uid, { canonicalPerson: person, uid, label, role: data.role, number,
      groupKey: group.key, groupLabel: group.label, statusLabel: data.statusLabel });
  }
  const entry = input => {
    const canonical = resolve(input), uid = identity(canonical) || identity(input), cached = records.get(uid);
    if (cached) return { ...cached, person: input && typeof input === 'object' ? input : canonical };
    const person = canonical || (input && typeof input === 'object' ? input : null), data = facts(person);
    const number = Number.isSafeInteger(person?.id) && person.id > 0 ? person.id : null;
    const prefix = (WORKPLACES[data.role] || ROLES[data.role] || ROLES.resident)[index];
    const givenName = customName(person), group = descriptor(data.group);
    return { person, canonicalPerson: person, uid, label: `${prefix}${number ? ` ${number}` : ''}${givenName ? ` · ${givenName}` : ''}`,
      role: data.role, number, groupKey: group.key, groupLabel: group.label, statusLabel: data.statusLabel };
  };
  return {
    entry,
    label: input => entry(input).label,
    group: input => { const row = entry(input); return { key: row.groupKey, label: row.groupLabel }; },
    groups: (source = state.residents || []) => {
      const grouped = new Map(), seen = new Set();
      for (const input of rows(source)) {
        const row = entry(input);
        if (row.uid && seen.has(row.uid)) continue;
        if (row.uid) seen.add(row.uid);
        if (!grouped.has(row.groupKey)) grouped.set(row.groupKey, { key: row.groupKey, label: row.groupLabel, people: [] });
        grouped.get(row.groupKey).people.push(row);
      }
      const order = key => { const found = GROUP_ORDER.indexOf(key); return found < 0 ? GROUP_ORDER.length : found; };
      return [...grouped.values()].sort((a, b) => order(a.key) - order(b.key) || compareIds(a.label, b.label))
        .map(group => ({ ...group, people: group.people.sort((a, b) => compareIds(a.label, b.label) || compareIds(a.uid, b.uid)) }));
    }
  };
}
