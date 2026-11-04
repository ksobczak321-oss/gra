import { adventureChoices, ADVENTURE_CATALOG, pipePorts, adventureMessage } from './harborlight-v1-adventures.js?v=frontend-v31';
import * as Adventures from './harborlight-v1-adventures.js?v=frontend-v31';
import { adventureArt, cargoArt, mapTileArt, shipDrawing, planeDrawing } from './harborlight-v1-adventures-art.js?v=frontend-v31';
import { createExpandedAdventureScene } from './harborlight-v1-adventures-expanded-ui.js?v=frontend-v31';

const pick = (lang, pl, en) => lang === 'en' ? en : pl;
const text = (lang, value) => typeof value === 'string' ? value : value?.[lang === 'en' ? 'en' : 'pl'] || value?.pl || '';
const NS = 'http://www.w3.org/2000/svg';
function node(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2), value);
    else if (key === 'class') element.className = value;
    else if (value !== false && value != null) element.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) if (child != null && child !== false) element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return element;
}
function vector(source) { const container = document.createElement('template'); container.innerHTML = source; return container.content.firstElementChild; }
function svg(tag, attributes = {}) { const result = document.createElementNS(NS, tag); for (const [key, value] of Object.entries(attributes)) result.setAttribute(key, String(value)); return result; }
function setText(element, value) { if (element.textContent !== String(value)) element.textContent = String(value); }
function stylesheet() {
  if (document.querySelector('[data-adventures-css]')) return;
  document.head.append(node('link', { rel: 'stylesheet', href: new URL('./harborlight-v1-adventures.css?v=frontend-v31', import.meta.url).href, 'data-adventures-css': '' }));
}
const BUILDINGS = {
  farm: ['Gospodarstwo', 'Farm'], lumber: ['Drwale', 'Lumber camp'], quarry: ['Kamieniołom', 'Quarry'], windmill: ['Młyn', 'Mill'], sawmill: ['Tartak', 'Sawmill'],
  lighthouse: ['Latarnia', 'Lighthouse'], house: ['Dom', 'House'], townhall: ['Ratusz', 'Town Hall'], dock: ['Port', 'Port'], chapel: ['Kaplica', 'Chapel'], warehouse: ['Magazyn', 'Warehouse'], theatre: ['Teatr', 'Theatre'], market: ['Targ', 'Market'],
};
const RESOURCES = { coins: ['Monety', 'Coins'], wood: ['Drewno', 'Wood'], stone: ['Kamień', 'Stone'], grain: ['Zboże', 'Grain'], food: ['Żywność', 'Food'], planks: ['Deski', 'Planks'] };
const ERRORS = {
  'adventure-busy': ['Dokończ otwartą przygodę lub wróć do niej później.', 'Finish your current adventure or resume it later.'],
  'adventure-cooldown': ['Ta przygoda wróci później. Wybierz teraz inną.', 'This adventure will return later. Choose another one now.'],
  'adventure-not-enough-ammunition': ['Zdobądź kulkę w labiryncie, by oddać kolejny strzał.', 'Win a marble maze round to earn another shot.'],
  'adventure-no-ammunition': ['Zdobądź kulkę w labiryncie, by oddać kolejny strzał.', 'Win a marble maze round to earn another shot.'],
  'adventure-insufficient-coins': ['Brakuje monet. Podstawowy zestaw elementów wystarcza do zbudowania mostu.', 'Not enough coins. The original set of pieces is enough to build a bridge.'],
  'adventure-bridge-budget': ['Wykorzystano wszystkie belki. Usuń jedną z połączeń albo dobierz dodatkowe elementy.', 'All beams are used. Remove a connection or get extra pieces.'],
  'adventure-budget': ['Wykorzystano wszystkie belki. Kliknij istniejące połączenie, aby odzyskać belkę.', 'All beams are used. Select an existing connection to recover its beam.'],
};
/** A view over the adventure model. It never grants a reward or advances the
 * island clock. onAction must pass input through the normal state/save path. */
export function createAdventuresPanel({ state: initialState, language = 'pl', onAction = () => ({ ok: false }), onMiniGame = () => {}, onRewardedAd = null, onClose = () => {}, onMainMission = null, mainMission = null } = {}) {
  stylesheet();
  const lang = language === 'en' ? 'en' : 'pl', t = (pl, en) => pick(lang, pl, en);
  const labelBuilding = id => t(...(BUILDINGS[id] || [id, id]));
  const labelResource = id => t(...(RESOURCES[id] || [id, id]));
  const rewardUnit = (id, amount) => { if (lang === 'en') return labelResource(id).toLowerCase(); if (id === 'coins' || id === 'planks') { const forms = id === 'coins' ? ['moneta', 'monety', 'monet'] : ['deska', 'deski', 'desek']; return amount === 1 ? forms[0] : amount % 10 >= 2 && amount % 10 <= 4 && (amount % 100 < 12 || amount % 100 > 14) ? forms[1] : forms[2]; } return ({ wood: 'drewna', stone: 'kamienia', grain: 'zboża', food: 'żywności' }[id] || labelResource(id).toLowerCase()); };
  const element = node('section', { class: 'adventures-panel', 'data-adventures-panel': '', 'data-i18n-ignore': '', 'aria-label': t('Przygody na wyspie', 'Island adventures') });
  const notice = node('div', { class: 'adv-status', role: 'status', 'aria-live': 'polite' });
  const intro = node('div', { class: 'adv-intro' }, node('div', {}, node('span', { class: 'adv-label' }, t('Wyspa ma więcej historii', 'More island stories')), node('h3', {}, t('Co możesz zrobić teraz?', 'What can you do now?')), node('p', {}, t('Gdy osada pracuje nad główną misją, przeżyj krótką przygodę. Produkcja i dostawy trwają dalej.', 'While your settlement works on its main mission, take a short adventure. Production and deliveries keep running.'))));
  const content = node('div', { 'data-adventures-content': '' });
  const footer = node('div', { class: 'adv-bottom' });
  element.append(intro, notice, content, footer);
  let state = initialState, alive = true, allChoices = false, choiceFilter = 'all', currentKey = '', sceneUpdate = () => {}, sceneDispose = () => {}, frame = 0, lastUpdate = performance.now(), selectedMap = null, selectedBridge = null, selectedCrate = null, selectedLetter = null;
  let audio = null;
  const cleanup = [];
  function unlockAudio() { try { if (!audio && (window.AudioContext || window.webkitAudioContext)) audio = new (window.AudioContext || window.webkitAudioContext)(); if (audio?.state === 'suspended') audio.resume().catch(() => {}); } catch {} }
  function tone(value, length = .2) { if (!audio || audio.state !== 'running') return; try { const oscillator = audio.createOscillator(), gain = audio.createGain(); oscillator.frequency.value = [262, 330, 392, 523][Number(value) % 4]; oscillator.type = Number(value) === 0 ? 'triangle' : 'sine'; gain.gain.setValueAtTime(.0001, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.1, audio.currentTime + .01); gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + length); oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + length + .02); } catch {} }
  function say(message, error = false) { notice.dataset.error = String(error); setText(notice, message || ''); }
  function clock(interpolate = false) { return Number(state?.adventures?.clock || 0) + (interpolate ? Math.min(1.1, Math.max(0, performance.now() - lastUpdate) / 1000) : 0); }
  function active() { return state?.adventures?.active || null; }
  async function dispatch(action) {
    if (!alive) return { ok: false };
    unlockAudio();
    try {
      const result = await onAction(action);
      if (!alive) return result;
      if (result?.needsRewardedAd || result?.extra?.needsRewardedAd) {
        if (onRewardedAd) await onRewardedAd(action, result);
        else say(t('Reklama nie jest teraz dostępna. Most można ukończyć z podstawowym zestawem belek.', 'The ad is unavailable right now. You can finish the bridge with the original set of beams.'));
      } else if (result?.ok === false) {
        const code = result.code || result.error || result.message;
        say(ERRORS[code] ? t(...ERRORS[code]) : typeof result.message === 'object' ? text(lang, result.message) : adventureMessage(result.message, lang) || t('Ten ruch nie zadziałał. Sprawdź wskazówkę i spróbuj inaczej.', 'That move did not work. Check the hint and try another approach.'), true);
      } else if (action.command === 'cargoTest' && active()?.stage === 'load') say(active().data.crates.some(crate => crate.slot === null) ? t('Najpierw umieść wszystkie cztery skrzynie na pokładzie.', 'Place all four crates on the deck first.') : t('Statek się przechyla. Przestaw skrzynie, by zrównoważyć obie burty.', 'The ship is tilting. Rearrange the crates to balance both sides.'));
      else if (action.command === 'route' && active()?.stage === 'route') say(t('Ta trasa prowadzi na rafę. Wybierz zatokę osłoniętą od wiatru.', 'That route leads onto the reef. Choose the bay sheltered from the wind.'));
      else if (action.command === 'inspect') say(adventureMessage(result?.message, lang) || '');
      else say('');
      render(); return result;
    } catch { if (alive) say(t('Nie udało się zapisać ruchu. Spróbuj ponownie.', 'The move could not be saved. Please try again.'), true); return { ok: false }; }
  }
  const send = (command, extra = {}) => { const adventure = active(); return adventure && dispatch({ type: 'adventureInput', adventureId: adventure.id, command, ...extra }); };
  const button = (label, fn, attrs = {}) => node('button', { type: 'button', ...attrs, onclick: fn }, label);
  const miniGame = kind => { unlockAudio(); onMiniGame(kind); };
  function standardScene(adventure, description) {
    const spec = ADVENTURE_CATALOG?.find(item => item.kind === adventure.kind) || {};
    const expandedTitle = adventure.kind === 'escapeStory' ? Adventures.getCurrentStoryRoom?.(adventure, lang)?.title : adventure.kind === 'islandPuzzle' ? Adventures.getIslandPuzzleView?.(adventure.data?.puzzle, lang)?.title : '';
    const root = node('div', { class: 'adv-active', 'data-adventure-kind': adventure.kind, 'data-adventure-stage': adventure.stage });
    root.append(node('div', { class: 'adv-active-header' }, node('div', {}, node('span', { class: 'adv-label' }, t('Twoja przygoda', 'Your adventure')), node('h4', {}, expandedTitle || text(lang, spec.title) || t('Przygoda na wyspie', 'Island adventure'))), button(t('Wróć na wyspę', 'Return to island'), onClose, { class: 'adv-quiet', 'data-adventure-close': '' })));
    root.append(node('p', { class: 'adv-stage-help' }, description));
    return root;
  }
  function progressLine(current, total) { const line = node('div', { class: 'adv-progress-track' }, node('span', { style: `width:${Math.max(0, Math.min(100, current / total * 100))}%` })); line.setAttribute('role', 'progressbar'); line.setAttribute('aria-valuenow', current); line.setAttribute('aria-valuemin', 0); line.setAttribute('aria-valuemax', total); return line; }
  function sceneBoard(title, { viewBox = '0 0 100 64', aspect = null } = {}) {
    const board = node('div', { class: 'adv-board', 'aria-label': title }); if (aspect) board.style.aspectRatio = aspect;
    const drawing = svg('svg', { viewBox, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    board.append(drawing); return { board, drawing };
  }
  function choiceView() {
    const choices = adventureChoices(state), available = choices.filter(item => item.available);
    const story = available.find(item => item.kind === 'escapeStory' && item.resume) || available.find(item => item.kind === 'escapeStory');
    const short = available.find(item => item.kind === 'islandPuzzle' && item.tier === 'short') || available.find(item => item.kind === 'cargoRain') || available.find(item => item.kind === 'islandPuzzle');
    const medium = available.find(item => item.kind === 'islandPuzzle' && item.tier !== 'short') || available.find(item => ![story, short].includes(item));
    const recommendations = [story, ...(onMainMission ? [] : [medium]), short].filter(Boolean);
    for (const choice of available) if (recommendations.length < (onMainMission ? 2 : 3) && !recommendations.includes(choice)) recommendations.push(choice);
    const shown = allChoices ? choices.filter(item => choiceFilter === 'all' || choiceFilter === 'story' && item.kind === 'escapeStory' || choiceFilter === 'puzzle' && item.kind === 'islandPuzzle' || choiceFilter === 'classic' && !['escapeStory', 'islandPuzzle'].includes(item.kind)) : recommendations;
    const fallback = shown.length ? shown : choices.slice(0, onMainMission ? 2 : 3);
    const grid = node('div', { class: 'adv-choices' });
    if (!allChoices && typeof onMainMission === 'function') {
      grid.append(node('article', { class: 'adv-choice', 'data-current-mission-choice': '' }, vector(adventureArt('signals', { title: t('Główna przygoda Twojej wyspy', 'Your island’s main adventure') })), node('div', { class: 'adv-choice-copy' },
        node('span', { class: 'adv-choice-role' }, t('Rozwijaj wyspę', 'Develop your island')), node('h4', {}, text(lang, mainMission?.title) || t('Twoja aktualna misja', 'Your current mission')),
        node('p', {}, text(lang, mainMission?.description) || t('Sprawdź następny krok, potrzebne przygotowania i nagrodę. Wyspa rozwija się we własnym tempie.', 'Review your next step, the preparations and its reward. Grow the island at your own pace.')),
        node('div', { class: 'adv-choice-meta' }, node('span', {}, t('Główny szlak', 'Main journey'))), button(t('Otwórz aktualną misję', 'Open current mission'), onMainMission, { class: 'adv-primary', 'data-open-main-mission': '' }))));
    }
    for (const choice of fallback) {
      const duration = choice.durationSeconds >= 120 ? `${Math.round(choice.durationSeconds / 60)} ${t('min', 'min')}` : `${choice.durationSeconds || 45} s`;
      const preview = choice.rewardPreview?.resources || choice.rewardPreview || {};
      const actualRewards = Object.entries(preview).filter(([id, amount]) => RESOURCES[id] && Number(amount) > 0);
      const startLabel = !choice.available && choice.reason === 'level' ? t(`Od ${choice.requiredLevel} poziomu Ratusza`, `Town Hall level ${choice.requiredLevel} required`) : choice.available ? choice.resume ? t('Wróć do przygody', 'Resume adventure') : choice.practice ? t('Zagraj dla przyjemności', 'Play for fun') : t('Zacznij przygodę', 'Start adventure') : t('Przygoda wróci później', 'Available later');
      const card = node('article', { class: 'adv-choice', 'data-adventure-choice': choice.kind, ...(choice.storyId ? { 'data-story-choice': choice.storyId } : {}), ...(choice.puzzleKind ? { 'data-puzzle-choice': choice.puzzleKind } : {}) }, vector(adventureArt(choice.kind === 'escapeStory' ? 'signals' : choice.kind === 'islandPuzzle' ? ({ gull: 'cargoRain', hiddenObjects: 'letters', optics: 'signals', hotel: 'letters', photo: 'treasureMap', tides: 'garden' }[choice.puzzleKind] || 'treasureMap') : choice.kind, { title: text(lang, choice.title) })), node('div', { class: 'adv-choice-copy' },
        node('span', { class: 'adv-choice-role' }, choice.kind === 'escapeStory' ? t('Połączona opowieść', 'Connected story') : choice.tier === 'short' || choice.kind === 'cargoRain' ? t('Mała przygoda', 'A little adventure') : t('Pomysł i zagadka', 'A puzzle to explore')),
        node('h4', {}, text(lang, choice.title)), node('p', {}, text(lang, choice.description)), node('div', { class: 'adv-choice-meta' }, node('span', {}, `${t('Około', 'About')} ${duration}`), choice.progress?.total ? node('span', {}, `${choice.progress.current} / ${choice.progress.total}`) : null),
        choice.practice ? node('p', { class: 'adv-practice-label' }, t('Dla przyjemności — bez kolejnej nagrody.', 'For fun — without another reward.')) : actualRewards.length ? node('div', { class: 'adv-reward-preview', 'aria-label': t('Możliwa nagroda', 'Possible reward') }, ...actualRewards.map(([id, amount]) => node('span', {}, `+${amount} ${rewardUnit(id, Number(amount))}`))) : null,
        button(startLabel, () => dispatch(choice.startAction || { type: 'adventureStart', kind: choice.kind }), { class: 'adv-primary', disabled: !choice.available, 'data-adventure-start': choice.kind, ...(choice.puzzleKind ? { 'data-puzzle-start': choice.puzzleKind } : {}), ...(choice.storyId ? { 'data-story-start': choice.storyId } : {}) })));
      grid.append(card);
    }
    const catalogFilter = node('div', { class: 'adv-tools', 'aria-label': t('Rodzaj przygody', 'Adventure type') });
    if (allChoices) for (const [id, pl, en] of [['all', 'Wszystkie', 'All'], ['story', 'Opowieści', 'Stories'], ['puzzle', 'Zagadki', 'Puzzles'], ['classic', 'Znane przygody', 'Familiar adventures']]) catalogFilter.append(button(t(pl, en), () => { choiceFilter = id; currentKey = ''; render(); }, { class: 'adv-quiet', 'aria-pressed': String(choiceFilter === id), 'data-adventure-filter': id }));
    const budget = Adventures.adventureRewardStatus?.(state), pool = node('div', { class: 'adv-hour-pool', 'data-adventure-reward-pool': '' });
    const practice = budget && (budget.dailyRemaining <= 0 || budget.chapterRemaining <= 0);
    if (budget) pool.append(node('strong', {}, practice ? t('Dalsza zabawa jest otwarta', 'Keep playing for fun') : t('Nagrody opowieści i zagadek', 'Story and puzzle rewards')),
      node('span', {}, practice ? t('Wykorzystano obecną pulę nagród opowieści i zagadek. Możesz kontynuować je dla przyjemności. Znane przygody zachowują podane zasady nagród.', 'The story and puzzle reward pool is used up. You can continue them for fun. Familiar adventures keep their stated reward rules.') : t('Wypłata opowieści i zagadek uwzględnia pozostałą pulę dnia i rozdziału. Znane przygody zachowują podane zasady nagród. Wcześniejsze wyjście zachowuje postęp.', 'Story and puzzle payouts respect the remaining daily and chapter pools. Familiar adventures keep their stated reward rules. Leaving early preserves your progress.')));
    content.replaceChildren(...(budget ? [pool] : []), ...(allChoices ? [catalogFilter] : []), grid);
    footer.replaceChildren(node('span', { class: 'adv-saved' }, t('Postęp przygód jest zapisywany razem z wyspą.', 'Adventure progress is saved with your island.')), button(allChoices ? t('Pokaż trzy propozycje', 'Show three suggestions') : t('Zobacz wszystkie przygody', 'See every adventure'), () => { allChoices = !allChoices; currentKey = ''; render(); }, { class: 'adv-quiet', 'data-adventure-all': '' }));
  }
  function cargoScene(adventure) {
    const root = standardScene(adventure, t('Nad wyspą przeleciał samolot z uszkodzonym lukiem. Złap spadający ładunek — każda złapana sztuka trafia do Ciebie.', 'A plane flew over your island with a broken cargo hatch. Catch the falling cargo: every piece you catch is yours.'));
    root.append(vector(adventureArt('cargoRain', { title: t('Samolot nad wyspą', 'Plane over the island') })), node('p', { class: 'adv-muted' }, t('Ładunek spada na całym ekranie. Dotknij monety lub materiału, zanim zniknie na dole.', 'Cargo falls across the entire screen. Tap each coin or material before it disappears at the bottom.')));
    const overlay = node('div', { class: 'adv-cargo-flight', 'data-cargo-flight': '', 'aria-label': t('Złap spadający ładunek', 'Catch falling cargo') });
    const heading = node('h4', {}, t('Łap ładunek!', 'Catch the cargo!'));
    const timer = node('span', { 'data-adventure-time': '' });
    const total = node('div', { class: 'adv-flight-counter', 'aria-live': 'off', 'data-cargo-counter': '' });
    const zone = node('div', { class: 'adv-flight-zone' });
    const plane = svg('svg', { class: 'adv-flight-plane', viewBox: '0 0 150 85', 'aria-hidden': 'true' }); plane.innerHTML = planeDrawing; zone.append(plane);
    const close = () => { overlay.remove(); onClose(); };
    overlay.append(node('div', { class: 'adv-flight-header' }, node('div', {}, heading, node('p', {}, t('Klikaj lub dotykaj spadających monet i materiałów. Tyle, ile złapiesz, tyle dostaniesz.', 'Click or tap falling coins and materials. You receive exactly what you catch.'))), button('×', close, { class: 'adv-quiet', 'aria-label': t('Wróć na wyspę, przygoda trwa dalej', 'Return to island; the adventure continues') })), zone, node('div', { class: 'adv-flight-footer' }, node('div', {}, timer, total), node('p', {}, t('Wyspa wciąż pracuje. Możesz wrócić do niej w dowolnej chwili.', 'Your island keeps working. You can return to it at any time.'))));
    root.append(overlay); const drops = new Map();
    sceneUpdate = () => {
      const current = active(); if (!current || current.id !== adventure.id) return;
      const data = current.data, now = clock(true);
      setText(timer, `${t('Do końca', 'Time left')}: ${Math.max(0, Math.ceil((current.startedAt || 0) + (data.duration || 45) - clock()))} s`);
      const values = Object.entries(data.caught || {}).filter(([, amount]) => amount > 0);
      const valueKey = JSON.stringify(values); if (total.dataset.value !== valueKey) { total.dataset.value = valueKey; total.replaceChildren(...(values.length ? values.map(([resource, amount]) => node('span', { 'data-caught-resource': resource }, `${labelResource(resource)}: ${amount}`)) : [node('span', {}, t('Złap pierwszy ładunek!', 'Catch your first cargo!'))])); }
      plane.style.left = `${((now - current.startedAt) / 12 * 130) % 130 - 18}%`;
      const visible = new Set();
      for (const drop of data.drops || []) {
        const y = (now - drop.appearAt) / drop.fallSeconds * 100;
        if (drop.caught || y < 0 || y > 105) continue;
        visible.add(String(drop.id)); let target = drops.get(String(drop.id));
        if (!target) {
          const catchDrop = () => { if (target.disabled) return; target.disabled = true; Promise.resolve(send('catch', { dropId: drop.id })).finally(() => { if (target.isConnected) target.disabled = false; }); };
          target = button('', event => { if (event.detail === 0) catchDrop(); }, { class: 'adv-falling-cargo', 'data-cargo-drop': drop.id, 'aria-label': `${labelResource(drop.resource)} +${drop.amount}`, onpointerdown: event => { if (event.button !== 0) return; event.preventDefault(); catchDrop(); } });
          target.append(vector(cargoArt(drop.resource))); zone.append(target); drops.set(String(drop.id), target);
        }
        target.style.setProperty('--x', `${Math.max(5, Math.min(95, drop.x))}%`); target.style.setProperty('--y', `${y}%`); target.style.setProperty('--spin', `${Math.sin(now + Number(drop.id || 0)) * 16}deg`);
      }
      for (const [id, target] of drops) if (!visible.has(id)) { target.remove(); drops.delete(id); }
    };
    sceneDispose = () => overlay.remove(); return root;
  }
  function mapScene(adventure) {
    const data = adventure.data;
    const descriptions = {
      pieces: t('W ekspedycji „Znajdź trójki” odkrywasz fragmenty mapy. Zbierz cztery różne części, a potem ułóż drogę do skarbu.', 'Matching triples in an expedition reveals map fragments. Collect four different pieces, then put together a route to the treasure.'),
      arrange: t('Połącz fragmenty mapy w całość. Kliknij dwa pola, aby zamienić je miejscami. Rzeka i droga muszą do siebie pasować.', 'Join the map fragments. Select two tiles to swap them. Match the river and the trail across their edges.'),
      search: t('Mapa jest gotowa! Przeczytaj wskazówkę i odszukaj właściwe miejsce na wyspie.', 'The map is complete! Read its clue and find the right place on your island.'),
    };
    const root = standardScene(adventure, descriptions[adventure.stage] || descriptions.pieces);
    if (adventure.stage === 'pieces') {
      const pieces = state.adventures.progress?.mapPieces || [];
      const grid = node('div', { class: 'adv-map-grid' }); for (let index = 0; index < 4; index++) grid.append(node('div', { class: 'adv-map-tile', 'data-empty': index >= pieces.length }, index < pieces.length ? vector(mapTileArt(index)) : node('span', {}, '?')));
      root.append(grid, progressLine(pieces.length, 4), button(t('Zagraj w „Znajdź trójki”', 'Play picture triples'), () => miniGame('triples'), { class: 'adv-primary', 'data-adventure-minigame': 'triples' }));
    } else if (adventure.stage === 'arrange') {
      const grid = node('div', { class: 'adv-map-grid' });
      (data.tiles || []).forEach((piece, index) => grid.append(button('', () => { if (selectedMap == null) { selectedMap = index; grid.querySelectorAll('button').forEach((el, i) => el.dataset.selected = String(i === index)); } else { const first = selectedMap; selectedMap = null; send('tileSwap', { first, second: index }); } }, { class: 'adv-map-tile', 'data-map-index': index, 'aria-label': `${t('Fragment mapy', 'Map fragment')} ${index + 1}` })));
      [...grid.children].forEach((tile, index) => tile.append(vector(mapTileArt(data.tiles[index])))); root.append(grid, node('p', { class: 'adv-map-compass' }, t('PÓŁNOC ↑ · SZUKAJ ZNAKU X', 'NORTH ↑ · FIND THE X')));
      sceneUpdate = () => { const tiles = active()?.data?.tiles; if (!tiles) return; [...grid.children].forEach((tile, index) => { if (tile.dataset.piece !== String(tiles[index])) { tile.dataset.piece = tiles[index]; tile.replaceChildren(vector(mapTileArt(tiles[index]))); } tile.dataset.selected = String(selectedMap === index); }); };
    } else {
      root.append(node('div', { class: 'adv-status' }, text(lang, data.clue) || data[lang === 'en' ? 'clueEN' : 'cluePL'] || t('Szukaj budynku związanego ze wskazówką z mapy.', 'Find the building described by the map.')));
      const destinations = node('div', { class: 'adv-route-options' }); for (const id of ['farm', 'lumber', 'quarry', 'windmill', 'sawmill', 'warehouse', 'lighthouse', 'theatre']) destinations.append(button(labelBuilding(id), () => send('search', { building: id }), { 'data-adventure-search': id })); root.append(destinations);
    }
    return root;
  }
  function cannonScene(adventure) {
    const root = standardScene(adventure, t('Pirackie łodzie zablokowały kupca. Każda wygrana runda labiryntu daje jedną kulę. Wyceluj, strzel i otwórz drogę do portu.', 'Pirate boats are blocking a merchant. Each marble maze round you win earns a cannonball. Aim, fire and clear the route to port.'));
    const { board, drawing } = sceneBoard(t('Zatoka piratów', 'Pirate bay'), { viewBox: '0 0 100 100', aspect: '1.4' });
    drawing.innerHTML = '<rect width="100" height="100" fill="#174c61"/><path d="M0 85q25-14 45 4t55-2v13H0Z" fill="#66956e"/><path d="M0 15q10-5 20 0t20 0 20 0 20 0 20 0M0 48q10-5 20 0t20 0 20 0 20 0 20 0" fill="none" stroke="#83bfb6" stroke-width=".5" opacity=".5"/>';
    const actors = svg('g'), aim = svg('line', { x1: 50, y1: 94, x2: 50, y2: 40, stroke: '#f3d99a', 'stroke-width': .8, 'stroke-dasharray': '2 2' }); drawing.append(aim, actors);
    const cannon = svg('g', { transform: 'translate(50 94)' }); cannon.innerHTML = '<circle r="5" fill="#a08354"/><path d="M-2 1V-10h4V1Z" fill="#b5c6b1" stroke="#48645f" stroke-width="1"/>'; drawing.append(cannon);
    const ammo = node('span', { 'data-adventure-ammo': '' }), hits = node('span');
    let aimValue = { ...(adventure.data.aim || { x: 50, y: 30 }) };
    aim.setAttribute('x2', aimValue.x); aim.setAttribute('y2', aimValue.y); cannon.setAttribute('transform', `translate(50 94) rotate(${Math.atan2(aimValue.x - 50, 94 - aimValue.y) * 180 / Math.PI})`);
    const fire = () => send('shoot');
    function aimAt(x, y) { aimValue = { x: Math.max(2, Math.min(98, x)), y: Math.max(5, Math.min(85, y)) }; aim.setAttribute('x2', aimValue.x); aim.setAttribute('y2', aimValue.y); const angle = Math.atan2(aimValue.x - 50, 94 - aimValue.y) * 180 / Math.PI; cannon.setAttribute('transform', `translate(50 94) rotate(${angle})`); send('aim', aimValue); }
    board.addEventListener('pointerdown', event => { const box = drawing.getBoundingClientRect(); aimAt((event.clientX - box.left) / box.width * 100, (event.clientY - box.top) / box.height * 100); });
    const xInput = node('input', { type: 'range', min: 2, max: 98, value: 50, 'aria-label': t('Kierunek celowania', 'Aim direction'), oninput: event => aimAt(Number(event.target.value), 30) });
    const shoot = button(t('Strzel', 'Fire'), fire, { class: 'adv-primary', 'data-adventure-shoot': '' });
    root.append(node('div', { class: 'adv-hud' }, ammo, hits), board, node('div', { class: 'adv-cannon-controls' }, node('label', { class: 'adv-controls-label' }, t('Kliknij cel w zatoce lub ustaw kierunek', 'Tap a target in the bay or set a direction'), xInput), shoot), button(t('Zdobądź kulę w labiryncie', 'Earn a cannonball in the maze'), () => miniGame('tilt'), { class: 'adv-quiet', 'data-adventure-minigame': 'tilt' }));
    sceneUpdate = () => { const data = active()?.data; if (!data) return; const ammunition = Number(state.adventures.progress?.ammunition || 0); setText(ammo, `${t('Kule', 'Cannonballs')}: ${ammunition}`); const ships = data.ships || []; setText(hits, `${t('Pozostałe łodzie', 'Boats remaining')}: ${ships.filter(ship => ship.alive).length}`); shoot.disabled = ammunition < 1;
      actors.replaceChildren(); for (const ship of ships) if (ship.alive) { const group = svg('g', { transform: `translate(${ship.x} ${ship.y}) scale(.14)` }); group.innerHTML = shipDrawing; const flag = svg('path', { d: 'M-2-54 15-47-2-41Z', fill: '#283a3d' }); group.append(flag); actors.append(group); } for (const projectile of data.projectiles || []) actors.append(svg('circle', { cx: projectile.x, cy: projectile.y, r: 1.2, fill: '#ffe4a6' }));
    }; return root;
  }
  function bridgeScene(adventure) {
    const root = standardScene(adventure, t('Połącz brzegi mostem z ograniczonej liczby belek. Wybierz dwa węzły, by dodać lub zdjąć belkę. Trójkątne podpory usztywniają konstrukcję.', 'Connect the banks with a limited set of beams. Select two nodes to add or remove a beam. Triangular supports keep the structure rigid.'));
    const { board, drawing } = sceneBoard(t('Projekt mostu', 'Bridge design'), { viewBox: '0 0 100 100' });
    drawing.innerHTML = '<rect width="100" height="70" fill="#1a6073"/><path d="M0 70h9v30H0Zm91 0h9v30H91Z" fill="#6b9469"/><path d="M0 72h9m82 0h9" stroke="#c9c493" stroke-width="3"/><path d="M0 58q10-5 20 0t20 0 20 0 20 0 20 0" fill="none" stroke="#c1d9c6" opacity=".6"/>';
    const edges = svg('g'); drawing.append(edges); const controls = node('div'); board.append(controls);
    const counter = node('span', { 'data-bridge-budget': '' }), result = node('p', { class: 'adv-status', 'data-bridge-result': '', 'aria-live': 'polite' });
    for (const point of adventure.data.nodes || []) {
      const pointButton = button(point.anchor ? '⚓' : String(point.id), () => { if (selectedBridge == null) selectedBridge = point.id; else { const from = selectedBridge; selectedBridge = null; send('bridgeToggle', { from, to: point.id }); } for (const target of controls.children) target.setAttribute('aria-pressed', String(target.dataset.node === String(selectedBridge))); }, { class: 'adv-bridge-node-button', 'data-node': point.id, 'aria-label': `${point.anchor ? t('Przyczółek', 'Anchor') : t('Węzeł', 'Node')} ${point.id}`, 'aria-pressed': false, style: `left:${8 + point.x * .84}%;top:${point.y}%` }); controls.append(pointButton);
    }
    const check = button(t('Sprawdź most', 'Test the bridge'), () => send('bridgeTest'), { class: 'adv-primary', 'data-bridge-test': '' });
    root.append(node('div', { class: 'adv-hud' }, counter), board, result, check, node('p', { class: 'adv-muted' }, t('Podstawowy zestaw wystarcza do rozwiązania zadania. Dodatkowe belki ułatwiają eksperymentowanie.', 'The original set is enough to solve the puzzle. Extra beams give you more room to experiment.')), node('div', { class: 'adv-tools' }, button(t('Dobierz belkę · 5 monet', 'Extra beam · 5 coins'), () => dispatch({ type: 'adventureBridgeExtra', adventureId: adventure.id, method: 'coins' }), { class: 'adv-quiet', 'data-bridge-extra': 'coins' }), button(t('Dobierz belki za reklamę', 'Extra beams for an ad'), () => dispatch({ type: 'adventureBridgeExtra', adventureId: adventure.id, method: 'ad' }), { class: 'adv-quiet', 'data-bridge-extra': 'ad' })));
    sceneUpdate = () => { const data = active()?.data; if (!data) return; setText(counter, `${t('Belki', 'Beams')}: ${(data.edges || []).length} / ${data.budget}`); edges.replaceChildren(); for (const [a, b] of data.edges || []) { const from = data.nodes.find(point => String(point.id) === String(a)), to = data.nodes.find(point => String(point.id) === String(b)); if (from && to) edges.append(svg('line', { x1: 8 + from.x * .84, y1: from.y, x2: 8 + to.x * .84, y2: to.y, class: 'adv-bridge-member' })); } setText(result, data.test ? data.test.stable ? t('Most wytrzymał! Mieszkańcy bezpiecznie przechodzą na drugi brzeg.', 'The bridge held! Your residents can cross safely.') : t(...({ deck: ['Brakuje ciągłego pomostu. Połącz dolne węzły od brzegu do brzegu.', 'The deck is incomplete. Join the lower nodes from bank to bank.'], unstable: ['Most nie ma stabilnych podpór. Dodaj ukośne belki, tworząc trójkąty.', 'The bridge is unstable. Add diagonal beams to form triangles.'], deflection: ['Most za mocno się ugina. Wzmocnij środkowe podpory.', 'The bridge bends too far. Reinforce its central supports.'], overloaded: ['Część belek jest przeciążona. Rozłóż obciążenie na dodatkowe podpory.', 'Some beams are overloaded. Spread the load across additional supports.'] }[data.test.reason] || ['Popraw konstrukcję i spróbuj ponownie.', 'Improve the structure and try again.'])) : ''); };
    return root;
  }
  function signalsScene(adventure) {
    const root = standardScene(adventure, t('Statek wypatruje świateł Latarni. Zapamiętaj kolejność pięciu sygnałów, a gdy zgasną, odtwórz ją przyciskami. Każdy sygnał ma też własny dźwięk i znak.', 'A ship is watching for lighthouse signals. Memorise five signals, then repeat them after they go dark. Each signal also has a sound and a symbol.'));
    const drawing = vector(adventureArt('signals', { title: t('Nocna wachta', 'Night watch'), className: 'adv-choice-art' })); drawing.style.height = '180px';
    const status = node('p', { class: 'adv-status', 'aria-live': 'polite' }), sequence = node('div', { class: 'adv-sequence' }), controls = node('div', { class: 'adv-signal-buttons' });
    const colors = ['#a16343', '#3d7d76', '#626a95', '#8f7542'], signs = ['◆', '●', '▲', '✦'];
    for (let value = 0; value < 4; value++) controls.append(button('', () => { tone(value); send('signal', { value }); }, { class: 'adv-signal', style: `--signal:${colors[value]}`, 'data-signal': value, 'aria-label': `${t('Sygnał', 'Signal')} ${value + 1}` }));
    [...controls.children].forEach((target, index) => target.append(node('span', { 'aria-hidden': 'true', style: 'font-size:28px' }, signs[index]), node('span', {}, `${index + 1}`)));
    root.append(drawing, status, sequence, controls, button(t('Pokaż sygnały ponownie', 'Replay the signals'), () => send('replay'), { class: 'adv-quiet', 'data-adventure-replay': '' })); let lastTone = -1;
    sceneUpdate = () => { const current = active(); if (!current || current.id !== adventure.id) return; const data = current.data, memorizing = current.stage === 'memorize'; const index = memorizing ? Math.floor((clock(true) - (data.showUntil - 6)) / 1.1) : -1; const lit = index >= 0 && index < data.sequence.length && (clock(true) - (data.showUntil - 6)) % 1.1 < .75 ? data.sequence[index] : -1;
      if (lit >= 0 && index !== lastTone) { lastTone = index; tone(lit, .35); }
      [...controls.children].forEach((target, value) => { target.disabled = memorizing; target.dataset.lit = String(value === lit); });
      const stageLabel = memorizing ? t('Patrz i słuchaj. Za chwilę Twoja kolej.', 'Watch and listen. Your turn is coming.') : t('Twoja kolej — odtwórz pięć sygnałów.', 'Your turn: repeat the five signals.'); setText(status, stageLabel);
      const entered = data.entered || []; const key = `${entered.length}:${memorizing}`; if (sequence.dataset.value !== key) { sequence.dataset.value = key; sequence.replaceChildren(...data.sequence.map((_, i) => node('span', { 'data-done': entered.length > i }, entered.length > i ? '✓' : i + 1))); }
    }; return root;
  }
  function lettersScene(adventure) {
    const root = standardScene(adventure, t('Woda zmyła adresy z trzech listów. Przeczytaj wskazówki i znajdź odbiorców na wyspie. Każdy dostarczony list przybliża długo wyczekiwane spotkanie.', 'Water washed the addresses from three letters. Read their clues and find the recipients on your island. Every delivery brings a long-awaited reunion closer.'));
    const letters = node('div', { class: 'adv-trail-list' }), clue = node('div', { class: 'adv-status', 'data-letter-clue': '' }), destinations = node('div', { class: 'adv-route-options' });
    for (const building of ['farm', 'lumber', 'quarry', 'windmill', 'sawmill', 'warehouse', 'lighthouse', 'theatre']) destinations.append(button(labelBuilding(building), () => { if (selectedLetter != null) send('deliver', { letterId: selectedLetter, building }); }, { 'data-letter-destination': building }));
    root.append(letters, clue, destinations);
    sceneUpdate = () => { const data = active()?.data; if (!data) return; const key = JSON.stringify(data.letters); if (letters.dataset.value !== key) { letters.dataset.value = key; letters.replaceChildren(...data.letters.map((letter, index) => node('div', {}, node('div', {}, node('strong', {}, `${t('List', 'Letter')} ${index + 1}`), node('p', {}, letter.delivered ? t('Dostarczono ✓', 'Delivered ✓') : letter.read ? text(lang, letter.clue) : t('Otwórz kopertę i przeczytaj wskazówkę.', 'Open the envelope and read its clue.'))), button(letter.delivered ? '✓' : t('Przeczytaj', 'Read'), () => { selectedLetter = letter.id; send('read', { letterId: letter.id }); }, { disabled: letter.delivered, 'data-letter-read': letter.id })))); }
      const selected = data.letters.find(letter => String(letter.id) === String(selectedLetter) && !letter.delivered); destinations.hidden = !selected; clue.hidden = !selected; if (selected) setText(clue, `${t('Komu zanieść ten list?', 'Who should receive this letter?')} ${text(lang, selected.clue)}`);
    }; return root;
  }
  function rhythmScene(adventure) {
    const root = standardScene(adventure, adventure.stage === 'find' ? t('Port przygotowuje koncert. Poszukaj bębna przy Magazynie, fletu w Gospodarstwie i dzwonka przy Latarni. Potem dołącz do orkiestry.', 'The port is preparing a concert. Find a drum at the Warehouse, a flute at the Farm and a bell at the Lighthouse, then join the orchestra.') : t('Posłuchaj pięciu dźwięków. Kiedy nadejdzie Twoja kolej, powtórz melodię, wystukując dźwięki równo, mniej więcej co 0,7 sekundy.', 'Listen to five notes. On your turn, repeat the melody with steady taps, about 0.7 seconds apart.'));
    const instruments = adventure.data.instruments || [];
    if (adventure.stage === 'find') {
      const found = node('div', { class: 'adv-hud' }), locations = node('div', { class: 'adv-route-options' });
      for (const building of ['warehouse', 'farm', 'lighthouse', 'quarry', 'dock', 'house']) locations.append(button(labelBuilding(building), () => send('inspect', { building }), { 'data-rhythm-inspect': building }));
      root.append(found, locations); sceneUpdate = () => { const list = active()?.data?.instruments || []; found.replaceChildren(...list.map(item => node('span', {}, `${t(...({ drum: ['Bęben', 'Drum'], flute: ['Flet', 'Flute'], bell: ['Dzwonek', 'Bell'] }[item.id] || [item.id, item.id]))}: ${item.found ? '✓' : '?'}`))); };
    } else {
      const status = node('p', { class: 'adv-status', 'aria-live': 'polite' }), sequence = node('div', { class: 'adv-sequence' }), pads = node('div', { class: 'adv-rhythm-pad' });
      const icons = ['<ellipse cx="32" cy="18" rx="21" ry="9"/><path d="M11 18v29q21 16 42 0V18M11 19l42 27m0-27L11 46"/>', '<path d="m8 47 42-34 7 7-42 34ZM20 38l4 5m7-14 4 5m7-14 4 5"/>', '<path d="M12 43q8-10 8-21 0-16 12-16t12 16q0 11 8 21ZM25 50q7 13 14 0M29 6V1h6v5"/>'];
      ['drum', 'flute', 'bell'].forEach((id, value) => { const pad = button('', () => { tone(value); send('beat', { value }); }, { class: 'adv-instrument', 'data-rhythm-beat': value }); pad.append(vector(`<svg xmlns="${NS}" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="#f2d293" stroke-width="3" stroke-linecap="round">${icons[value]}</svg>`), t(...({ drum: ['Bęben', 'Drum'], flute: ['Flet', 'Flute'], bell: ['Dzwonek', 'Bell'] }[id]))); pads.append(pad); });
      root.append(status, sequence, pads, button(t('Posłuchaj jeszcze raz', 'Listen again'), () => send('replay'), { class: 'adv-quiet', 'data-adventure-replay': '' })); let lastTone = -1;
      sceneUpdate = () => { const current = active(); if (!current) return; const data = current.data, listening = current.stage === 'listen', index = listening ? Math.floor((clock(true) - (data.playUntil - 6)) / .7) : -1, beat = index >= 0 && index < data.sequence.length ? data.sequence[index] : -1;
        if (beat >= 0 && index !== lastTone) { lastTone = index; tone(beat, .25); }
        setText(status, listening ? t('Orkiestra gra — zapamiętaj melodię i jej rytm.', 'The orchestra is playing: remember the tune and rhythm.') : t('Twoja kolej! Zacznij, gdy będziesz gotowy. Zachowaj równy rytm.', 'Your turn! Start when you are ready and keep a steady rhythm.'));
        [...pads.children].forEach((pad, value) => { pad.disabled = listening; pad.dataset.playing = String(beat === value); }); const entered = data.entered || data.beats || []; const key = `${entered.length}:${listening}`; if (sequence.dataset.value !== key) { sequence.dataset.value = key; sequence.replaceChildren(...data.sequence.map((_, i) => node('span', { 'data-done': entered.length > i }, entered.length > i ? '✓' : '♪'))); }
      };
    }
    return root;
  }
  function gardenScene(adventure) {
    const root = standardScene(adventure, t('Obróć kamienne rynienki, by doprowadzić wodę od źródła do trzech sadzawek. Jasnoniebieskie kanały pokazują, dokąd dociera woda.', 'Rotate the stone channels to bring water from the spring to three ponds. Light blue channels show where the water reaches.'));
    const grid = node('div', { class: 'adv-garden' }), count = node('span', { 'data-garden-ponds': '' });
    const data = adventure.data; grid.style.gridTemplateColumns = `repeat(${data.size || 4},minmax(0,1fr))`;
    for (let index = 0; index < data.tiles.length; index++) grid.append(button('', () => send('rotate', { index }), { class: 'adv-pipe', 'data-pipe-index': index, 'aria-label': `${t('Obróć kanał', 'Rotate channel')} ${index + 1}` }));
    root.append(node('div', { class: 'adv-hud' }, count), grid, node('p', { class: 'adv-muted' }, t('Źródło jest w lewym górnym rogu. Sadzawki rozpoznasz po kwiatach. Nie musisz wykorzystać wszystkich kanałów.', 'The spring is in the top left corner. Flowers mark the ponds. You do not need to use every channel.')));
    sceneUpdate = () => { const data = active()?.data; if (!data) return; const wet = new Set(data.wet || []); setText(count, `${t('Nawodnione sadzawki', 'Watered ponds')}: ${(data.ponds || []).filter(index => wet.has(index)).length} / ${(data.ponds || []).length}`); [...grid.children].forEach((target, index) => { const pond = (data.ponds || []).includes(index), isWet = wet.has(index), ports = pipePorts(data.tiles[index]), key = `${ports.join('')}:${pond}:${isWet}`; if (target.dataset.value === key) return; target.dataset.value = key; target.dataset.water = String(isWet); target.dataset.pond = String(pond); const endpoints = { N: [32, 0], E: [64, 32], S: [32, 64], W: [0, 32] }; const paths = ports.map(port => { const to = endpoints[port]; return to ? `<path d="M32 32 ${to[0]} ${to[1]}"/>` : ''; }).join(''); target.replaceChildren(vector(`<svg xmlns="${NS}" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="#d2d5ae" stroke-width="17" stroke-linecap="round">${paths}</g><g fill="none" stroke="${isWet ? '#a3e3dd' : '#5d7d6b'}" stroke-width="9" stroke-linecap="round">${paths}</g>${pond ? '<circle cx="32" cy="32" r="16" fill="'+(isWet ? '#7dd5cb' : '#647d60')+'" stroke="#e7d697" stroke-width="2"/><path d="m21 19 4 4m19 20 4 4m-5-26-4 4" stroke="#efc3a2" stroke-width="5"/>' : ''}${index === data.source ? '<circle cx="32" cy="32" r="9" fill="#c3f3e2" stroke="#4c9b9b" stroke-width="2"/>' : ''}</svg>`)); }); };
    return root;
  }
  function cargoBalanceScene(adventure) {
    const root = standardScene(adventure, adventure.stage === 'route' ? t('Ładunek jest bezpieczny. Przeczytaj opisy obu tras i wybierz tę, którą kupiec bezpiecznie dotrze do portu.', 'The cargo is secure. Read both routes and choose the one that will bring the merchant safely to port.') : t('Wybierz skrzynię, potem miejsce na pokładzie. Cięższy ładunek dalej od środka mocniej przechyla statek. Zrównoważ obie burty, by kupiec mógł wypłynąć.', 'Select a crate and then a deck position. A heavier crate farther from the centre tilts the ship more. Balance both sides so the merchant can sail.'));
    if (adventure.stage === 'route') { const routes = node('div', { class: 'adv-route-options' }); for (const route of adventure.data.routes || []) routes.append(button('', () => send('route', { routeId: route.id }), { 'data-cargo-route': route.id })); [...routes.children].forEach((target, index) => target.append(node('strong', {}, text(lang, adventure.data.routes[index].label)), node('span', {}, text(lang, adventure.data.routes[index].description)))); root.append(routes); return root; }
    const crates = node('div', { class: 'adv-crates' }), balance = node('div', { class: 'adv-balance-indicator', role: 'meter', 'aria-label': t('Równowaga statku', 'Ship balance') });
    const { board, drawing } = sceneBoard(t('Pokład statku', 'Ship deck'), { viewBox: '0 0 100 64' }); drawing.innerHTML = '<rect width="100" height="64" fill="#1c5b69"/><path d="M7 20h86L82 51H18Z" fill="#906d44" stroke="#d7bf87" stroke-width="2"/><path d="M14 23h72M20 31h61M23 39h55M50 8v49" stroke="#c6a46d" stroke-width="1"/><path d="M48 3h4v18h-4Z" fill="#dcc495"/><path d="M10 57q10-4 20 0t20 0 20 0 20 0" fill="none" stroke="#a4cfc3"/>';
    const positions = [-2, -1, 1, 2], slots = node('div'); for (let index = 0; index < positions.length; index++) slots.append(button('—', () => selectedCrate != null && send('place', { crateId: selectedCrate, slot: positions[index] }), { class: 'adv-ship-slot', 'data-cargo-slot': positions[index], style: `left:${22 + index * 19}%;top:52%`, 'aria-label': `${t('Miejsce', 'Position')} ${positions[index]}` })); board.append(slots);
    const moment = node('span', { 'data-cargo-moment': '' }); root.append(node('div', { class: 'adv-hud' }, moment), balance, crates, board, button(t('Sprawdź załadunek', 'Check cargo'), () => send('cargoTest'), { class: 'adv-primary', 'data-cargo-test': '' }));
    sceneUpdate = () => { const data = active()?.data; if (!data) return; const key = JSON.stringify(data.crates); if (crates.dataset.value !== key) { crates.dataset.value = key; crates.replaceChildren(...data.crates.map(crate => button(`${t('Skrzynia', 'Crate')} ${crate.id} · ${crate.weight} kg`, () => { selectedCrate = crate.id; [...crates.children].forEach(target => target.setAttribute('aria-pressed', String(target.dataset.crate === String(selectedCrate)))); }, { class: 'adv-crate', 'data-crate': crate.id, 'aria-pressed': String(selectedCrate) === String(crate.id) }))); } [...slots.children].forEach((target, index) => { const crate = data.crates.find(item => Number(item.slot) === positions[index] && item.slot !== null); setText(target, crate ? `${crate.weight} kg` : positions[index]); target.dataset.filled = String(!!crate); target.disabled = selectedCrate == null; }); const weightMoment = Number(data.moment || 0); setText(moment, weightMoment === 0 ? t('Równowaga obu burt', 'Both sides are balanced') : `${t('Przechył', 'Imbalance')}: ${Math.abs(weightMoment)} · ${weightMoment < 0 ? t('lewa burta', 'left side') : t('prawa burta', 'right side')}`); balance.style.setProperty('--balance', Math.max(.05, Math.min(.95, .5 + weightMoment / 100))); };
    return root;
  }
  function finishedScene(adventure) {
    const root = standardScene(adventure, t('Jeszcze jedna historia, którą Twoja wyspa będzie wspominać.', 'Another story your island will remember.'));
    const reward = adventure.data?.reward || adventure.reward || {}, values = reward.resources || reward;
    const expandedEnding = adventure.data?.practice ? t('Odkrycie i ukończona próba zostały zapisane. Ta rozgrywka była dla przyjemności i nie przyznaje kolejnej wypłaty.', 'Your discovery and completed challenge are saved. This round was for fun and does not award another payout.') : adventure.kind === 'escapeStory' ? t('Wszystkie pomieszczenia tej opowieści są już odkryte! Zachowujesz rozwiązania i zdobytą nagrodę.', 'Every room in this story is now explored! Your discoveries and earned reward are yours to keep.') : adventure.kind === 'islandPuzzle' ? t('Zagadka rozwiązana! Twoja nagroda została dodana do zasobów wyspy.', 'Puzzle solved! Your reward has been added to the island’s resources.') : '';
    root.append(node('div', { class: 'adv-reward' }, vector(adventureArt(adventure.kind, { title: t('Przygoda ukończona', 'Adventure complete'), className: '' })), node('h4', {}, t('Udało się!', 'You did it!')), node('p', { class: 'adv-stage-help' }, expandedEnding || text(lang, adventure.data?.ending) || t(...({ cargoRain: ['Złapany ładunek jest już w Twoich zasobach. Dobra robota! Osada może działać dalej.', 'The cargo you caught is already in your resources. Well done! Your settlement can keep working.'], treasureMap: ['Mapa zaprowadziła Cię do ukrytego skarbu. Znalezione monety i materiały wesprą rozwój osady.', 'The map led you to a hidden treasure. Its coins and materials will help your settlement grow.'], pirateCannon: ['Droga do portu jest wolna! Uratowany kupiec zacumował przy wyspie i zostawił nagrodę.', 'The route to port is clear! The rescued merchant has docked and left you a reward.'], bridge: ['Most wytrzymał próbę. Mieszkańcy mogą bezpiecznie przejść na drugi brzeg.', 'The bridge passed its test. Residents can safely cross to the other bank.'], signals: ['Kapitan dostrzegł właściwy sygnał. Zagubiony statek bezpiecznie dotarł do portu.', 'The captain recognised your signal. The lost ship safely reached the harbor.'], letters: ['Wszystkie listy dotarły do adresatów. Rodzina spotkała się na nabrzeżu, a mieszkańcy dziękują Ci za pomoc.', 'Every letter reached its recipient. The family has reunited at the quay, and your residents thank you for helping.'], rhythm: ['Koncert rozpoczęty! Port wypełnia muzyka, a mieszkańcy bawią się przy wspólnie przygotowanej melodii.', 'The concert has begun! Music fills the port as residents enjoy the tune you prepared together.'], garden: ['Woda znów dociera do sadzawek. Ogród rozkwitł i stał się nowym miejscem odpoczynku na wyspie.', 'Water reaches the ponds again. The garden has bloomed into a new place to rest on the island.'], cargoBalance: ['Statek bezpiecznie dotarł do portu. Kupiec rozładowuje towary i przekazuje Ci podziękowanie.', 'The ship safely reached the harbor. The merchant is unloading and has a gift to thank you.'] }[adventure.kind] || ['Nagroda trafiła do Twojej osady.', 'Your settlement has received its reward.']))), node('div', { class: 'adv-reward-values' }, ...Object.entries(values).filter(([id, amount]) => RESOURCES[id] && Number(amount) > 0).map(([id, amount]) => node('span', {}, `+${amount} ${rewardUnit(id, Number(amount))}`))), button(t('Wybierz kolejną przygodę', 'Choose another adventure'), () => dispatch({ type: 'adventureSuspend' }), { class: 'adv-primary', 'data-adventure-continue': '' })));
    if (Number(adventure.data?.residentsAccepted) > 0) root.querySelector('.adv-reward-values')?.append(node('span', { 'data-adventure-residents-accepted': '' }, `${t('Nowi mieszkańcy', 'New residents')}: ${adventure.data.residentsAccepted}`));
    if (Number(adventure.data?.residentsRequested) > Number(adventure.data?.residentsAccepted || 0)) root.append(node('p', { class: 'adv-status', 'data-adventure-resident-cap': '' }, t(`Przyjęto ${adventure.data.residentsAccepted || 0} z ${adventure.data.residentsRequested} osób, zgodnie z wolnymi miejscami w limicie Ratusza.`, `${adventure.data.residentsAccepted || 0} of ${adventure.data.residentsRequested} people joined, within the Town Hall’s available population places.`)));
    return root;
  }
  function expandedScene(adventure) {
    const controller = createExpandedAdventureScene({ getState: () => state, getRun: active, language: lang, standardScene, send });
    sceneUpdate = controller.update; sceneDispose = controller.destroy; return controller.element;
  }
  const renderers = { cargoRain: cargoScene, treasureMap: mapScene, pirateCannon: cannonScene, bridge: bridgeScene, signals: signalsScene, letters: lettersScene, rhythm: rhythmScene, garden: gardenScene, cargoBalance: cargoBalanceScene, islandPuzzle: expandedScene, escapeStory: expandedScene };
  function render() {
    if (!alive || !state?.adventures) return;
    const adventure = active(), key = adventure ? `${adventure.id}:${adventure.kind}:${adventure.stage}` : `choices:${allChoices}:${adventureChoices(state).map(choice => `${choice.id || choice.kind}:${choice.available}:${choice.progress?.current}:${choice.practice}:${choice.resume}`).join('|')}`;
    if (key !== currentKey) {
      sceneDispose(); sceneDispose = () => {}; sceneUpdate = () => {}; currentKey = key; selectedMap = null; selectedBridge = null;
      footer.replaceChildren();
      if (adventure) {
        const root = ['complete', 'completed', 'reward', 'done'].includes(adventure.stage) ? finishedScene(adventure) : renderers[adventure.kind]?.(adventure);
        content.replaceChildren(root || node('p', { class: 'adv-status' }, t('Ta historia czeka na kolejny krok.', 'This story is waiting for its next step.')));
        intro.hidden = true;
        footer.append(node('span', { class: 'adv-saved' }, t('Twoja wyspa wciąż pracuje w tle.', 'Your island keeps working in the background.')), button(t('Wybierz inną przygodę', 'Choose another adventure'), () => dispatch({ type: 'adventureSuspend' }), { class: 'adv-quiet', 'data-adventure-suspend': '' }));
      } else { intro.hidden = false; choiceView(); }
    }
    sceneUpdate();
  }
  function animate() { if (!alive) return; if (element.isConnected && active()) sceneUpdate(); frame = requestAnimationFrame(animate); }
  render(); frame = requestAnimationFrame(animate);
  return {
    element,
    update(nextState) { if (!alive) return; state = nextState; lastUpdate = performance.now(); render(); },
    destroy() { if (!alive) return; alive = false; cancelAnimationFrame(frame); sceneDispose(); cleanup.forEach(fn => fn()); if (audio) { audio.close().catch(() => {}); audio = null; } },
  };
}

/** Cosmetic outcomes are rendered on the same 1672×941 coordinates as the
 * island artwork. Rendering never changes their receipts or repeats rewards. */
export function renderAdventureEffects(state, { language = 'pl' } = {}) {
  stylesheet();
  const effects = state?.adventures?.effects || [], kinds = new Set(effects.map(effect => effect.kind));
  const layer = svg('svg', { viewBox: '0 0 1672 941', class: 'adventure-island-effects', 'data-adventure-island-effects': '', 'aria-hidden': 'true', focusable: 'false' });
  layer.style.pointerEvents = 'none';
  if (!kinds.size) return layer;
  const add = (kind, x, y, source) => {
    if (!kinds.has(kind)) return;
    const group = svg('g', { transform: `translate(${x} ${y})`, 'data-adventure-effect': kind }); group.innerHTML = source;
    const title = svg('title'); title.textContent = pick(language, ({ 'merchant-rescued': 'Kupiec bezpiecznie dotarł do portu', 'guided-ship': 'Statek odnajduje drogę dzięki sygnałom Latarni', 'family-reunion': 'Rodzina spotkała się przy porcie', 'harbor-concert': 'Orkiestra daje koncert na nabrzeżu', 'tidal-flowers': 'Ogród przypływu znów kwitnie', 'residents-crossing': 'Mieszkańcy przechodzą przez nowy most', 'merchant-arrival': 'Kupiec rozładowuje towary' }[kind] || 'Pamiątka przygody'), ({ 'merchant-rescued': 'The merchant safely reached the harbor', 'guided-ship': 'A ship follows the lighthouse signals', 'family-reunion': 'The family reunites at the harbor', 'harbor-concert': 'The orchestra performs at the quay', 'tidal-flowers': 'The tidal garden blooms again', 'residents-crossing': 'Residents cross their new bridge', 'merchant-arrival': 'The merchant unloads the cargo' }[kind] || 'Adventure memento')); group.prepend(title); layer.append(group);
  };
  const person = (x, y, color, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cx="0" cy="17" rx="6" ry="2" fill="#294c3b44"/><path d="M-3 11-4 17m7-6 1 6" stroke="#3b4a4b" stroke-width="2"/><path d="M-4 1-6 11H6L4 1Z" fill="${color}" stroke="#5e5a42" stroke-width=".7"/><circle cy="-3" r="4" fill="#e5c193"/><path d="M-4-5q4-5 8 0" fill="#886943"/></g>`;
  add('merchant-rescued', 292, 748, `<g class="adv-effect-boat">${shipDrawing}</g><path d="M-45 41q45-8 90 0" fill="none" stroke="#cce2cc" stroke-width="2" opacity=".7"/>`);
  add('guided-ship', 1288, 627, `<g transform="scale(.7)">${shipDrawing}</g><path d="m-20-76 7 8 14-17" fill="none" stroke="#f5e1a0" stroke-width="4"/>`);
  add('family-reunion', 641, 714, `<path d="M-21 18h43" stroke="#bba16f" stroke-width="4"/>${person(-13, -7, '#ce956e')}${person(11, -7, '#7ba9a0')}${person(0, 0, '#dbc081', .72)}<path d="M-3-23q-5-9-9-3t9 11q14-7 9-11t-9 3" fill="#d38d73" opacity=".85"/>`);
  add('harbor-concert', 400, 672, `<path d="m-33 16 61 0 9 8h-78Z" fill="#b99a68" stroke="#795b3c"/>${person(-23, -6, '#829a70')}${person(0, -6, '#bf9173')}${person(21, -6, '#6a9da5')}<ellipse cx="-23" cy="2" rx="6" ry="3" fill="#ebd191"/><path d="m-23 2-6-11m6 11 7-12m12 9 10-2" stroke="#e3c58b" stroke-width="2"/><g class="adv-effect-music" fill="#f5d382"><path d="M-8-23v-13l8-2v4l-6 2v9q-7 4-7-1t5-1Z"/><path d="M20-36v-11l7 2v3l-5-1v8q-6 4-6 0t4-1Z"/></g>`);
  const flowers = Array.from({ length: 13 }, (_, index) => { const x = (index % 5) * 12 - 25, y = Math.floor(index / 5) * 11; return `<g transform="translate(${x} ${y})"><path d="M0 1v8" stroke="#547547" stroke-width="2"/><circle r="3.5" fill="${['#e4bd92', '#e8d594', '#bbaaca'][index % 3]}"/><circle r="1.4" fill="#eadd96"/></g>`; }).join('');
  add('tidal-flowers', 692, 352, `<ellipse cx="0" cy="20" rx="40" ry="17" fill="#819c6866"/><ellipse cx="0" cy="7" rx="15" ry="7" fill="#77bcb2" stroke="#c3d5b2" stroke-width="3"/>${flowers}`);
  add('residents-crossing', 941, 525, `<path d="m-37 7 74 0m-70-9 66 0" stroke="#c6aa77" stroke-width="5"/><path d="m-35 8 13 17 22-17 22 17 13-17m-71-10v15m71-15v15" stroke="#9b7b4f" stroke-width="3" fill="none"/><g class="adv-effect-crossing">${person(-21, -8, '#d0b47c', .75)}${person(0, -8, '#83a794', .75)}${person(18, -8, '#b6927f', .75)}</g>`);
  add('merchant-arrival', 534, 733, `<g fill="#b58f5b" stroke="#e3c792" stroke-width="1.5"><path d="M-14-12H2V4h-16Zm20 0h16V4H6ZM-4-30h17v17H-4Z"/><path d="m-14-12 16 16m-16 0L2-12m4 0L22 4M6 4l16-16M-4-30l17 17"/></g>${person(32, -11, '#88a9a4', .85)}`);
  return layer;
}
