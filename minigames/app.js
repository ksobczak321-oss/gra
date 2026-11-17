import { createState, EXPEDITIONS } from '../harborlight-v1-state.js?v=frontend-v32-15';
import * as Adventures from '../harborlight-v1-adventures.js?v=frontend-v32-15';
import * as Activities from '../harborlight-v1-activities.js?v=frontend-v32-15';
import { normalizeExpeditionHour } from '../harborlight-v1-expedition-hour.js?v=frontend-v32-15';
import { ISLAND_PUZZLE_CATALOG, STORY_CATALOG } from '../harborlight-v1-story-catalog.js?v=frontend-v32-15';
import { createAdventuresPanel } from '../harborlight-v1-adventures-ui.js?v=frontend-v32-15';
import { mountMiniGame } from '../harborlight-v1-minigame-ui.js?v=frontend-v32-15';
import { adventureArt, puzzleSceneArt } from '../harborlight-v1-adventures-art.js?v=frontend-v32-15';

// This launcher has no persistence, authentication or account client. The same
// models and boards as the island run only against a new object in this tab.
export const PRACTICE_FAMILIES = Object.freeze({
  puzzle: 'Zagadki', story: 'Opowieści', adventure: 'Przygody', expedition: 'Ekspedycje'
});
const kebab = value => String(value).replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').toLowerCase();
const limit = (value, min, max, fallback = min) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Math.floor(Number(value)))) : fallback;
export function practiceLink(entry, { variant = 1, level = 1 } = {}) {
  return `./?game=${encodeURIComponent(entry.slug)}&variant=${limit(variant, 1, 5)}&level=${limit(level, 1, 100)}`;
}
export function validateEntry(entry) {
  if (!entry || !/^(puzzle|story|adventure|expedition)-[a-z0-9-]+$/.test(entry.slug)) throw new Error('Nieprawidłowy identyfikator gry.');
  const { type, id } = entry.engine || {};
  if (!PRACTICE_FAMILIES[type] || typeof id !== 'string') throw new Error('Ta gra nie ma dostępnej planszy.');
  const known = type === 'puzzle' ? ISLAND_PUZZLE_CATALOG.some(row => row.id === id) : type === 'story' ? STORY_CATALOG.some(row => row.id === id) : type === 'adventure' ? Adventures.ADVENTURE_CATALOG.some(row => row.kind === id) : ['tilt', 'triples'].includes(id);
  if (!known) throw new Error('Nie znaleziono zasad tej gry.');
  return entry;
}
export function validateCatalog(catalog) {
  if (!Array.isArray(catalog?.entries)) throw new Error('Katalog gier jest niedostępny.');
  const seen = new Set(), engines = new Set();
  for (const entry of catalog.entries) {
    validateEntry(entry);
    if (seen.has(entry.slug)) throw new Error('Katalog zawiera powtórzoną grę.');
    seen.add(entry.slug);
    const engine = `${entry.engine.type}:${entry.engine.id}`;
    if (engines.has(engine)) throw new Error('Katalog zawiera powtórzoną planszę.');
    engines.add(engine);
  }
  const expected = ISLAND_PUZZLE_CATALOG.length + STORY_CATALOG.length + Adventures.ADVENTURE_CATALOG.length + 2;
  if (seen.size !== expected) throw new Error('Katalog gier jest niekompletny.');
  return catalog;
}
export function createPracticeSession(entry, { variant = 1, level = 1, seed = 0x41234567, now = Date.now() } = {}) {
  validateEntry(entry);
  const chosenVariant = limit(variant, 1, 5), difficulty = limit(level, 1, 100);
  // A practice series has its own elapsed clock. Anchor it at the current
  // hour's start, so opening at :59 does not immediately reset its chosen
  // difficulty when the real-world hour changes.
  const practiceEpoch = Math.floor(now / 3600000) * 3600000;
  const state = createState(practiceEpoch, { ruleset: 32, onboarding: false });
  state.islandName = 'Osobna próba';
  state.settings.language = 'pl';
  for (const building of Object.values(state.buildings)) building.level = 20;
  state.highestTownhall = 20;
  state.resources.coins = 1000;
  state.activitySeed = seed >>> 0;
  state.adventures.progress.mapPieces = ['practice-map-1', 'practice-map-2', 'practice-map-3', 'practice-map-4'];
  state.adventures.progress.ammunition = 100;
  const ledger = normalizeExpeditionHour(state);
  for (const id of [...ISLAND_PUZZLE_CATALOG.map(row => row.id === 'memoryTriples' ? 'triples' : row.id === 'marbleMaze' ? 'tilt' : kebab(row.id)), ...Adventures.ADVENTURE_CATALOG.map(row => 'classic-' + kebab(row.kind)), 'tilt', 'triples']) {
    ledger.variants[id] = { failures: 0, wins: difficulty - 1, roundsStarted: 0, reservations: [], results: [] };
  }
  const context = {
    highestTownhall: 20, expeditions: EXPEDITIONS,
    allowAdSimulation: false,
    claimAdventureReward: () => ({ ok: true, reward: {}, practice: true })
  };
  const session = { entry, state, context, variant: chosenVariant, difficulty, paused: false, actions: 0, elapsed: 0 };
  const action = entry.engine.type === 'expedition'
    ? { type: 'expeditionStart', expedition: 'misty', gameKind: entry.engine.id }
    : { type: 'adventureStart', kind: entry.engine.type === 'puzzle' ? 'islandPuzzle' : entry.engine.type === 'story' ? 'escapeStory' : entry.engine.id, puzzleKind: entry.engine.id, storyId: entry.engine.id, variant: chosenVariant };
  const result = dispatchPracticeAction(session, action);
  if (result?.ok === false) throw new Error(Adventures.adventureMessage(result.message, 'pl') || 'Nie udało się rozpocząć próby.');
  return session;
}
export function dispatchPracticeAction(session, action) {
  if (!session || !action || typeof action.type !== 'string') return { ok: false, message: 'Nieprawidłowy ruch.' };
  if (session.paused) return { ok: false, message: 'Wznów próbę, aby wykonać ruch.' };
  // No caller-supplied action can reach account services or ordinary island act().
  const accepted = session.entry.engine.type === 'expedition' ? /^expedition(?:Start|Continue|Cashout|MiniGameInput|MiniGameReveal|PresenceConfirm|TimeChoice|ExtraTime|Hint|RestartEasier)$/ : /^adventure(?:Start|Input|BridgeExtra)$/;
  if (!accepted.test(action.type)) return { ok: false, message: 'To działanie nie należy do tej próby.' };
  const result = session.entry.engine.type === 'expedition'
    ? Activities.activityAction(session.state, action, session.context)
    : Adventures.adventureAction(session.state, action, session.context);
  if (result?.ok) session.actions++;
  if (result?.ok && action.type === 'expeditionCashout') session.settledCoins = result.coins;
  return result || { ok: false, message: 'Ten ruch nie jest teraz dostępny.' };
}
export function advancePracticeSession(session, seconds) {
  if (!session || session.paused || !Number.isFinite(seconds) || seconds <= 0) return;
  const elapsed = Math.min(seconds, .25);
  if (session.entry.engine.type === 'expedition') Activities.advanceActivities(session.state, elapsed);
  else { Adventures.advanceAdventures(session.state, elapsed); session.state.activityClock += elapsed; }
  session.state.worldTimeMs += elapsed * 1000;
  session.elapsed += elapsed;
}

const $ = id => document.getElementById(id);
function node(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name.startsWith('on') && typeof value === 'function') element.addEventListener(name.slice(2), value);
    else if (name === 'class') element.className = value;
    else if (value != null && value !== false) element.setAttribute(name, String(value));
  }
  for (const child of children.flat()) if (child != null) element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return element;
}
function art(entry) {
  const holder = node('div', { class: 'card-art', 'aria-hidden': 'true' });
  holder.innerHTML = entry.engine.type === 'puzzle' ? puzzleSceneArt(entry.engine.id, { title: '', prefix: entry.slug }) : adventureArt(entry.engine.type === 'story' ? 'signals' : entry.engine.type === 'expedition' ? entry.engine.id === 'tilt' ? 'cargoBalance' : 'treasureMap' : entry.engine.id);
  return holder;
}
function docLink(entry, extension, title) {
  return node('a', { href: `./docs/${entry.slug}.${extension}`, download: `${entry.slug}.${extension}` }, title);
}
function variantNumbers(entry) {
  return (entry.variants || []).map((row, index) => limit(typeof row === 'number' ? row : row.number ?? row.index ?? index + 1, 1, 5));
}
function renderCatalog(catalog) {
  $('catalog').hidden = false;
  $('total-count').textContent = catalog.entries.length;
  let filter = 'all';
  const cards = catalog.entries.map(entry => {
    const link = node('a', { class: 'button', href: practiceLink(entry), 'data-play-game': entry.slug }, 'Zagraj');
    const copy = node('div', { class: 'card-copy' }, node('span', { class: 'card-family' }, PRACTICE_FAMILIES[entry.engine.type]), node('h3', {}, entry.title), node('p', {}, entry.objective || entry.description), node('div', { class: 'card-actions' }, link), node('div', { class: 'card-docs' }, docLink(entry, 'docx', 'Zasady Word'), docLink(entry, 'txt', 'Zasady TXT')));
    if (entry.engine.type === 'story') copy.append(node('div', { class: 'card-variants' }, node('span', {}, 'Warianty:'), ...variantNumbers(entry).map(number => node('a', { href: practiceLink(entry, { variant: number }), 'aria-label': `${entry.title}, wariant ${number}` }, number))));
    return { entry, element: node('article', { class: 'game-card', 'data-game-card': entry.slug }, art(entry), copy) };
  });
  $('games').replaceChildren(...cards.map(row => row.element));
  function applyFilter() {
    const query = fold($('search').value);
    let count = 0;
    for (const { entry, element } of cards) {
      const visible = (filter === 'all' || entry.engine.type === filter) && fold([entry.title, entry.objective, entry.description, PRACTICE_FAMILIES[entry.engine.type]].join(' ')).includes(query);
      element.hidden = !visible; if (visible) count++;
    }
    $('result-count').textContent = `Widoczne gry: ${count} z ${catalog.entries.length}`;
    $('empty').hidden = count > 0;
  }
  for (const [id, label] of [['all', 'Wszystkie'], ...Object.entries(PRACTICE_FAMILIES)]) {
    const count = id === 'all' ? catalog.entries.length : catalog.entries.filter(entry => entry.engine.type === id).length;
    const button = node('button', { type: 'button', 'aria-pressed': String(id === filter), 'data-filter': id, onclick: () => { filter = id; for (const item of $('filters').children) item.setAttribute('aria-pressed', String(item === button)); applyFilter(); } }, `${label} · ${count}`);
    $('filters').append(button);
  }
  $('search').addEventListener('input', applyFilter);
  applyFilter();
}
function inlineRules(entry) {
  const root = $('inline-rules'); root.replaceChildren();
  const sections = [['Cel', entry.objective], ['Scenariusz', entry.scenario], ['Zasady', entry.rules], ['Sterowanie', entry.controls], ['Zwycięstwo', entry.win], ['Koniec próby i błędy', entry.fail], ['Czas', entry.timing], ['Punkty i nagrody w głównej grze', entry.scoring]];
  for (const [title, value] of sections) {
    if (!value || Array.isArray(value) && !value.length) continue;
    const content = Array.isArray(value) ? node('ul', {}, ...value.map(line => node('li', {}, typeof line === 'string' ? line : JSON.stringify(line)))) : node('p', {}, String(value));
    root.append(node('section', {}, node('h3', {}, title), content));
  }
}
function renderPlayer(entry, query) {
  $('hero').hidden = true; $('player').hidden = false;
  $('game-title').textContent = entry.title;
  $('game-family').textContent = PRACTICE_FAMILIES[entry.engine.type];
  $('game-objective').textContent = entry.objective || entry.description;
  document.title = `${entry.title} — minigry HARBORLIGHT`;
  for (const [id, extension] of [['word', 'docx'], ['txt', 'txt']]) { $(id).href = `./docs/${entry.slug}.${extension}`; $(id).download = `${entry.slug}.${extension}`; }
  const variants = variantNumbers(entry);
  $('variant-label').hidden = !variants.length;
  $('variant').replaceChildren(...(variants.length ? variants : [1]).map(number => node('option', { value: number }, `Wariant ${number}`)));
  const variant = limit(query.get('variant'), 1, 5), difficulty = limit(query.get('level'), 1, 100);
  $('variant').value = String(variant); $('level').value = difficulty;
  $('variant-links').replaceChildren(...variants.map(number => node('a', { href: practiceLink(entry, { variant: number, level: difficulty }), ...(number === variant ? { 'aria-current': 'page' } : {}) }, `Wariant ${number}`)));
  inlineRules(entry);
  let session = null, controller = null, frame = 0, lastFrame = performance.now(), lastUpdate = 0, paused = false, miniKey = '';
  const say = (message, error = false) => { $('session-status').textContent = message; $('session-status').dataset.error = String(error); };
  function cleanupController() { controller?.destroy?.(); controller?.dispose?.(); controller = null; miniKey = ''; }
  const miniIdentity = run => `${run.id}:${run.level}:${run.miniGame.kind}:${run.miniGame.cards?.length || run.miniGame.balls?.length || 0}`;
  function mountExpedition(run) {
    controller?.dispose?.();
    controller = mountMiniGame({ host: $('board'), run, language: 'pl', status: Activities.expeditionRoundStatus(session.state, run), onAction: send });
    miniKey = miniIdentity(run);
  }
  function finishControls() {
    const root = $('expedition-controls');
    if (entry.engine.type !== 'expedition') { root.hidden = true; return; }
    const run = Activities.activeExpeditionRun(session.state) || Object.values(session.state.expeditionRuns).at(-1);
    const status = Activities.expeditionRoundStatus(session.state, run);
    const key = `${run?.status}:${run?.level}:${run?.presencePromptAt}`;
    if (root.dataset.value === key) return;
    root.dataset.value = key; root.hidden = run?.status === 'active' && run.presencePromptAt === null;
    root.replaceChildren();
    if (run?.status === 'decision') root.append(node('strong', {}, `Runda ${run.level} ukończona.`), node('button', { type: 'button', class: 'button', onclick: () => send({ type: 'expeditionContinue', runId: run.id, gameKind: entry.engine.id }) }, 'Następna runda'), node('button', { type: 'button', class: 'button secondary', 'data-practice-cashout': '', onclick: () => send({ type: 'expeditionCashout', runId: run.id }) }, 'Wypłać pulę'));
    if (run?.presencePromptAt !== null && run?.presencePromptAt !== undefined && ['active', 'decision'].includes(run?.status)) root.append(node('button', { type: 'button', class: 'button', onclick: () => send({ type: 'expeditionPresenceConfirm', runId: run.id }) }, 'Gram dalej'));
    if (run?.status === 'lost') root.append(node('strong', {}, 'Czas tej próby minął.'), node('button', { type: 'button', class: 'button', onclick: restart }, 'Nowa próba'));
    if (run?.status === 'closed') root.append(node('strong', { 'data-practice-settled': '' }, `Seria zakończona. Wypłata próbna: ${session.settledCoins || 0} monet. Saldo Twojego konta nie zmieniło się.`), node('button', { type: 'button', class: 'button', onclick: restart }, 'Nowa próba'));
    if (!status) root.hidden = true;
  }
  function update() {
    if (!session || !controller) return;
    if (entry.engine.type === 'expedition') {
      const run = Activities.activeExpeditionRun(session.state) || Object.values(session.state.expeditionRuns).at(-1);
      if (miniKey !== miniIdentity(run)) mountExpedition(run);
      else controller.update(run, Activities.expeditionRoundStatus(session.state, run));
    } else {
      controller.update(session.state);
      // The reused island renderer has an island-navigation footer. In this
      // standalone view its navigation always returns to the practice catalog.
      for (const button of $('board').querySelectorAll('[data-adventure-suspend]')) button.textContent = 'Wszystkie gry';
      if (session.state.adventures.active?.stage === 'complete') {
        for (const paragraph of $('board').querySelectorAll('.adv-stage-help')) paragraph.textContent = 'Próba ukończona. Ten wynik pozostaje na tej stronie; postęp i nagrody na Twojej wyspie nie zmieniają się.';
        const values = $('board').querySelector('.adv-reward-values'); if (values) values.hidden = true;
        const next = $('board').querySelector('[data-adventure-continue]'); if (next) next.textContent = 'Wszystkie gry';
      }
    }
    finishControls();
  }
  function send(action) {
    if (action.type === 'adventureSuspend') { location.href = new URL('./', import.meta.url).href; return { ok: true }; }
    const result = dispatchPracticeAction(session, action);
    if (result?.ok === false) say(Adventures.adventureMessage(result.message, 'pl') || 'Ten ruch nie jest teraz dostępny.', true);
    else if (paused) say('Próba jest wstrzymana.');
    else say('Osobna próba · postęp pozostaje tylko na tej stronie.');
    update(); return result;
  }
  function restart() {
    cleanupController();
    session = createPracticeSession(entry, { variant, level: difficulty });
    paused = false; $('pause').textContent = 'Wstrzymaj'; $('pause').setAttribute('aria-pressed', 'false');
    $('board').inert = false;
    $('board').replaceChildren(); $('board').setAttribute('aria-busy', 'true');
    if (entry.engine.type === 'expedition') {
      const run = Activities.activeExpeditionRun(session.state);
      mountExpedition(run);
    } else {
      controller = createAdventuresPanel({ state: session.state, language: 'pl', onAction: send, onClose: () => { location.href = new URL('./', import.meta.url).href; }, allowAdSimulation: false });
      $('board').append(controller.element);
    }
    $('board').setAttribute('aria-busy', 'false');
    $('board').dataset.game = entry.slug;
    say('Osobna próba · postęp pozostaje tylko na tej stronie.');
    $('expedition-controls').dataset.value = '';
    lastFrame = performance.now(); update();
  }
  $('restart').addEventListener('click', restart);
  $('pause').addEventListener('click', () => {
    paused = !paused; session.paused = paused;
    $('pause').textContent = paused ? 'Wznów' : 'Wstrzymaj'; $('pause').setAttribute('aria-pressed', String(paused));
    $('board').inert = paused;
    say(paused ? 'Próba jest wstrzymana. Wznów ją, aby wykonać kolejny ruch.' : 'Próba wznowiona.');
    lastFrame = performance.now();
  });
  $('settings').addEventListener('submit', event => { event.preventDefault(); location.href = new URL(practiceLink(entry, { variant: $('variant').value, level: $('level').value }), import.meta.url).href; });
  document.addEventListener('visibilitychange', () => { lastFrame = performance.now(); });
  function animate(now) {
    const delta = Math.min(.25, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now;
    if (!document.hidden && !paused) advancePracticeSession(session, delta);
    if (now - lastUpdate > 100) { update(); lastUpdate = now; }
    frame = requestAnimationFrame(animate);
  }
  restart(); frame = requestAnimationFrame(animate);
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); cleanupController(); }, { once: true });
}
async function main() {
  $('retry').addEventListener('click', () => location.reload());
  try {
    const response = await fetch(new URL('./catalog.json', import.meta.url), { cache: 'no-cache', credentials: 'omit' });
    if (!response.ok) throw new Error('Nie udało się pobrać katalogu gier. Odśwież stronę i spróbuj ponownie.');
    const catalog = validateCatalog(await response.json());
    const query = new URLSearchParams(location.search), slug = query.get('game');
    if (!slug) renderCatalog(catalog);
    else {
      const entry = catalog.entries.find(item => item.slug === slug);
      if (!entry) throw new Error('Nie ma gry pod tym linkiem. Otwórz listę wszystkich gier i wybierz planszę ponownie.');
      renderPlayer(entry, query);
    }
  } catch (error) {
    $('error').hidden = false; $('error-message').textContent = error.message || 'Odśwież stronę i spróbuj ponownie.';
    $('catalog').hidden = true; $('player').hidden = true;
  } finally { $('loading').hidden = true; }
}
if (typeof document !== 'undefined') main();
