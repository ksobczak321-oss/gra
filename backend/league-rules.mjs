// Shared, deterministic challenge rules. Scores are recomputed by the API from
// accepted actions and its own clock; a caller-supplied score is never used.
export const LEAGUE_RULES = Object.freeze({ zone: 'Europe/Warsaw', firstDay: 15, lastDay: 21, arcadeHour: 19, logicHour: 20, attempts: 2, allianceLimit: 5, maxDuration: 180000, chatLimit: 500 });
const warsaw = new Intl.DateTimeFormat('en-CA', { timeZone: LEAGUE_RULES.zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export function leagueCalendar(at = Date.now()) {
  const p = Object.fromEntries(warsaw.formatToParts(new Date(at)).filter(x => x.type !== 'literal').map(x => [x.type, Number(x.value)]));
  const season = `${p.year}-${String(p.month).padStart(2, '0')}`;
  return { ...p, season, round: p.day >= 15 && p.day <= 21 ? p.day - 14 : 0, registration: p.day >= 8 && p.day <= 14, playing: p.day >= 15 && p.day <= 21, slot: p.hour === LEAGUE_RULES.arcadeHour ? 'arcade' : p.hour === LEAGUE_RULES.logicHour ? 'logic' : null };
}
export const LOGIC_TASKS = Object.freeze([
  { pl: 'Ostatni konwój', en: 'The last convoy', instruction: ['Przewieź pięć partii po 20 sztuk. Łódź mieści dwie partie; każdą dostarcz do wskazanego nabrzeża.', 'Deliver five 20-unit batches to their labelled quays. Your boat carries two batches.'] },
  { pl: 'Fabryka bez zatoru', en: 'Factory without queues', instruction: ['Dla każdego zamówienia wybierz recepturę. Dwie jednostki zboża dają żywność; dwie drewna dają deski.', 'Choose each order’s recipe. Two grain make food; two wood make planks.'] },
  { pl: 'Mapa po sztormie', en: 'Map after the storm', instruction: ['Wybierz legalną trasę dla pięciu konwojów. Odcinki Magazyn–Las oraz Port–Latarnia są zamknięte.', 'Choose a legal route for five convoys. Warehouse–Forest and Port–Lighthouse are closed.'] },
  { pl: 'Miasto w drodze', en: 'A city on the move', instruction: ['Przenieś pięć grup po dwie osoby. Na matce pozostaje 12 z 22; schronienia A i B mieszczą po 6, łódź 4 osoby.', 'Move five groups of two. Keep 12 of 22 on the mother island. Shelters A/B each hold six and the boat holds four.'] },
  { pl: 'Rynek kapitana', en: 'Captain’s market', instruction: ['Wybierz najtańszy kompletny zakup w limicie NPC. Tańszy towar gracza jest legalny.', 'Choose the cheapest complete purchase within the NPC cap. A lower player price is legal.'] },
  { pl: 'Sieć sygnałów', en: 'Signal network', instruction: ['Połącz kolejno pięć przekaźników z Latarnią. Odcinek B–D jest uszkodzony.', 'Connect five relays to the Lighthouse. B–D is damaged.'] },
  { pl: 'Rejs mistrzów', en: 'Master voyage', instruction: ['Sprawdź trasę, recepturę i cenę każdego z pięciu zamówień. Tylko kompletna poprawna dostawa zalicza cel.', 'Check the route, recipe and price of five orders. Only a complete legal delivery counts.'] }
]);
export const ARCADE_TASKS = Object.freeze([
  { pl: 'Łowcy gwiazd', en: 'Star catchers', symbol: '★', instruction: ['Łap poruszające się złote gwiazdy; omijaj szare pułapki.', 'Catch moving gold stars and avoid grey decoys.'] },
  { pl: 'Serce portu', en: 'Heart of the port', symbol: '♥', instruction: ['Łap zielone serca; czerwone zabierają jedno wcześniejsze trafienie.', 'Catch green hearts. Red hearts remove an earlier hit.'] },
  { pl: 'Puls Latarni', en: 'Lighthouse pulse', symbol: '◉', instruction: ['Klikaj sygnał tylko podczas jego zielonego impulsu.', 'Click a signal only during its green pulse.'] },
  { pl: 'Ruchome nabrzeża', en: 'Moving quays', symbol: '▣', instruction: ['Łap skrzynie, gdy przepływają przez jasny pas na środku.', 'Catch crates as they cross the bright middle lane.'] },
  { pl: 'Kod radiowy', en: 'Radio code', symbol: '◆', instruction: ['Łap symbole w kolejności: gwiazda, serce, romb; sekwencja się powtarza.', 'Catch in order: star, heart, diamond, then repeat.'] },
  { pl: 'Pirackie pułapki', en: 'Pirate traps', symbol: '✦', instruction: ['Łap skarby; czaszki zabierają dwa wcześniejsze trafienia.', 'Catch treasure. A skull removes two earlier hits.'] },
  { pl: 'Konstelacja załogi', en: 'Crew constellation', symbol: '✧', instruction: ['Łap świetlne punkty z kolejnymi numerami. Pominięcie nie blokuje następnych.', 'Catch numbered lights in order. A miss never blocks later lights.'] }
]);
const recipe = i => i % 2 ? 'planks' : 'food';
export function createLeagueChallenge({ day = 1, kind = 'logic', seed = 1 } = {}) {
  day = Math.max(1, Math.min(7, Math.floor(day))); kind = kind === 'arcade' ? kind : 'logic';
  return { version: 1, day, kind, seed: Math.abs(Math.floor(seed)) % 9973, duration: kind === 'arcade' ? 45000 : LEAGUE_RULES.maxDuration, task: (kind === 'arcade' ? ARCADE_TASKS : LOGIC_TASKS)[day - 1], batches: Array.from({ length: 5 }, (_, i) => ({ id: i, destination: i % 2 ? 'B' : 'A', product: recipe(i) })) };
}
export const emptyLeagueProgress = () => ({ goals: [], loaded: [], delivered: [], destinationCounts: { A: 0, B: 0 }, hits: [], faults: 0, decisions: [] });
const clone = v => JSON.parse(JSON.stringify(v));
const unique = a => [...new Set(a)];
export function arcadeTarget(challenge, index, elapsed) {
  if (!Number.isSafeInteger(index) || index < 0 || index >= 30) return null;
  const start = index * 1200, age = elapsed - start, visible = age >= 0 && age <= 2300;
  const decoy = challenge.day === 5 ? false : (index + challenge.seed) % 5 === 0;
  const symbols = challenge.day === 5 ? ['★', '♥', '◆'] : [challenge.task.symbol];
  const phase = (age % 1200 + 1200) % 1200;
  const hittable = visible && !decoy && (challenge.day === 3 ? phase >= 350 && phase <= 1050 : challenge.day === 4 ? age >= 650 && age <= 1850 : true);
  return { id: index, start, age, visible, decoy, hittable, symbol: challenge.day === 7 ? String(index + 1) : symbols[index % symbols.length], x: challenge.day === 4 ? 10 + Math.max(0, Math.min(1, age / 2300)) * 80 : 8 + ((index * 31 + challenge.seed * 7) % 72) + Math.sin(age / 350) * 7, y: 12 + ((index * 23 + challenge.seed * 11) % 65) };
}
export function logicChoices(challenge, index) {
  const i = Math.max(0, Math.min(4, index)), p = recipe(i);
  const c = (label, labelEn, value) => ({ label, labelEn, value });
  if (challenge.day === 2) return [
    c(p === 'food' ? '2 zboża → 1 żywności' : '2 drewna → 1 deska', p === 'food' ? '2 grain → 1 food' : '2 wood → 1 plank', { product: p, input: p === 'food' ? 'grain' : 'wood', amount: 2 }),
    c(p === 'food' ? '2 drewna → 1 deska' : '2 zboża → 1 żywności', p === 'food' ? '2 wood → 1 plank' : '2 grain → 1 food', { product: p === 'food' ? 'planks' : 'food', input: p === 'food' ? 'wood' : 'grain', amount: 2 }),
    c('1 kamień → 1 deska', '1 stone → 1 plank', { product: 'planks', input: 'stone', amount: 1 })
  ];
  if (challenge.day === 3) {
    const end = ['L', 'F', 'Q', 'W', 'L'][i], path = end === 'W' ? ['P', 'W'] : end === 'Q' ? ['P', 'W', 'Q'] : ['P', 'W', 'Q', end];
    const names = { P: ['Port', 'Port'], W: ['Magazyn', 'Warehouse'], Q: ['Kamieniołom', 'Quarry'], F: ['Las', 'Forest'], L: ['Latarnia', 'Lighthouse'] };
    return [c(path.map(n=>names[n][0]).join(' → '), path.map(n=>names[n][1]).join(' → '), {path}), c('Port → Magazyn → Las → cel', 'Port → Warehouse → Forest → goal', {path:['P','W','F',end]}), c('Port → Latarnia → cel', 'Port → Lighthouse → goal', {path:['P','L',end]})];
  }
  if (challenge.day === 5) return [c(`${80+i*5} monet, pełne 100 desek`, `${80+i*5} coins, all 100 planks`, {amount:100,coins:80+i*5,cap:150}), c('70 monet, tylko 50/100 desek', '70 coins, only 50/100 planks', {amount:50,coins:70,cap:150}), c('160 monet, 100 desek (limit 150)', '160 coins, 100 planks (cap 150)', {amount:100,coins:160,cap:150})];
  if (challenge.day === 6) return [c(`Latarnia → A → C → punkt ${i+1}`, `Lighthouse → A → C → relay ${i+1}`, {path:['L','A','C',String(i+1)]}),c(`Latarnia → B → D → punkt ${i+1}`,`Lighthouse → B → D → relay ${i+1}`,{path:['L','B','D',String(i+1)]}),c(`D → punkt ${i+1} (brak Latarni)`,`D → relay ${i+1} (no Lighthouse)`,{path:['D',String(i+1)]})];
  if (challenge.day === 7) return [c('Bezpieczna trasa + 2:1 + 90 monet','Safe route + 2:1 + 90 coins',{path:['P','W','Q','L'],input:p==='food'?'grain':'wood',amount:2,product:p,coins:90}),c('Zamknięta trasa + 2:1 + 70 monet','Closed route + 2:1 + 70 coins',{path:['P','L'],input:p==='food'?'grain':'wood',amount:2,product:p,coins:70}),c('Bezpieczna trasa + 1:1 + 160 monet','Safe route + 1:1 + 160 coins',{path:['P','W','Q','L'],input:'stone',amount:1,product:p,coins:160})];
  return [];
}

const eq = (a, b) => JSON.stringify(a, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y))) : v) === JSON.stringify(b, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y))) : v);
export function applyLeagueAction(challenge, previous, action, elapsed) {
  const progress = clone(previous), invalid = reason => ({ progress, accepted: false, reason });
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > challenge.duration || !action || typeof action !== 'object') return invalid('attempt-expired');
  if (challenge.kind === 'arcade') {
    if (action.type !== 'catch') return invalid('invalid-action');
    const target = arcadeTarget(challenge, action.targetId, elapsed);
    if (!target || !target.visible || progress.hits.includes(target.id) || (progress.seen || []).includes(target.id)) return invalid('target-unavailable');
    progress.seen = [...(progress.seen || []), target.id];
    if (!target.hittable) { progress.faults++; progress.hits.splice(0, challenge.day === 6 ? 2 : 1); progress.goals = Array.from({ length: Math.min(5, Math.floor(progress.hits.length / 4)) }, (_, i) => i); return { progress, accepted: true, reason: 'decoy' }; }
    if (challenge.day === 7 && target.id <= Math.max(-1, ...progress.hits)) return { progress, accepted: true, reason: 'wrong-sequence' };
    if (challenge.day === 5 && target.id % 3 !== progress.hits.length % 3) return { progress, accepted: true, reason: 'wrong-sequence' };
    progress.hits.push(target.id); progress.goals = Array.from({ length: Math.min(5, Math.floor(progress.hits.length / 4)) }, (_, i) => i);
    return { progress, accepted: true };
  }
  const i = action.batch ?? action.goal;
  if (!Number.isSafeInteger(i) || i < 0 || i >= 5) return invalid('invalid-goal');
  if ([1, 4].includes(challenge.day)) {
    if (action.type === 'load') {
      if (progress.loaded.includes(i) || progress.delivered.includes(i) || progress.loaded.length >= 2) return invalid('boat-capacity');
      if (challenge.day === 4 && 22 - 2 * (progress.loaded.length + progress.delivered.length + 1) < 12) return invalid('mother-minimum');
      progress.loaded.push(i); return { progress, accepted: true };
    }
    if (action.type !== 'deliver' || !progress.loaded.includes(i)) return invalid('batch-not-on-boat');
    if (!['A', 'B'].includes(action.destination)) return invalid('invalid-destination');
    if (challenge.day === 1 && action.destination !== challenge.batches[i].destination) return invalid('wrong-destination');
    if (challenge.day === 4 && progress.destinationCounts[action.destination] + 2 > 6) return invalid('shelter-full');
    progress.loaded = progress.loaded.filter(x => x !== i); progress.delivered.push(i); progress.destinationCounts[action.destination] += 2;
    progress.goals = unique([...progress.goals, i]); return { progress, accepted: true };
  }
  if (action.type !== 'decide' || progress.goals.includes(i)) return invalid('invalid-decision');
  const correct = logicChoices(challenge, i)[0].value;
  if (!eq(action.decision, correct)) { progress.decisions.push({ goal: i, correct: false }); return { progress, accepted: true, reason: 'wrong-decision' }; }
  progress.decisions.push({ goal: i, correct: true }); progress.goals.push(i);
  return { progress, accepted: true };
}
export function leagueAttemptScore(challenge, progress, elapsed) {
  const goals = Math.min(5, unique(progress.goals || []).length);
  const bonus = goals === 5 ? challenge.kind === 'arcade' ? 20 * Math.max(0, 1 - (progress.faults || 0) / 5) : 20 * Math.max(0, challenge.duration - Math.min(challenge.duration, Math.max(0, elapsed))) / challenge.duration : 0;
  return Math.round((16 * goals + bonus) * 100) / 100;
}
export function leagueTeamScore(scores) {
  if (!Array.isArray(scores) || scores.length < 1 || scores.length > 5 || scores.some(x => !Number.isFinite(x) || x < 0 || x > 100)) throw new TypeError('Invalid frozen league roster scores.');
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round((mean + Math.min(8, Math.max(0, scores.filter(x => x >= 16).length - 1) * 2)) * 100) / 100;
}
