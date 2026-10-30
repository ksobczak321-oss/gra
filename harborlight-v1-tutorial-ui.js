import { tutorialLessonText, registerTutorialCopy } from './harborlight-v1-v16-copy.js?v=frontend-v19';

const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const MATERIAL_NAMES = { en: ['Wood', 'Stone', 'Grain', 'Food', 'Planks'], pl: ['Drewno', 'Kamień', 'Zboże', 'Żywność', 'Deski'] };
const pick = (language, en, pl) => language === 'pl' ? pl : en;
function node(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') element.className = value;
    else if (key.startsWith('on')) element.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) element.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) if (child != null) element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return element;
}
const action = (label, callback, attributes = {}) => node('button', { type: 'button', class: 'tutorial-action', onclick: callback, ...attributes }, label);
const rowsFor = options => { registerTutorialCopy(options.progression.TUTORIAL_LESSONS || []); return options.progression.tutorialRows(options.state); };
const nextRow = rows => rows.find(row => row.canClaim) || rows.find(row => !row.completed);
const fraction = (value, total, language) => pick(language, `Step ${value} of ${total}`, `Krok ${value} z ${total}`);

export function createTutorialPanel(options) {
  const { state, progression, language = 'en', onAction, onVisit, onClose } = options;
  const rows = rowsFor(options), status = progression.tutorialStatus(state), current = nextRow(rows);
  const root = node('div', { class: 'tutorial-v16', 'data-tutorial-panel': '', 'data-i18n-ignore': '' });
  const progress = node('progress', { max: rows.length, value: status.completed, 'aria-label': pick(language, 'Tutorial progress', 'Postęp samouczka') });
  root.append(node('div', { class: 'tutorial-v16-progress' }, node('strong', {}, pick(language, `${status.completed} / ${rows.length} completed`, `Ukończono ${status.completed} / ${rows.length}`)), progress));
  if (rows.some(row => row.rewardBlocked)) root.append(node('p', { class: 'tutorial-v18-storage-warning', 'data-tutorial-storage-blocked': '' }, pick(language,
    'Spend stored materials before opening or doubling another tutorial chest. Building, production and other island actions remain available.',
    'Wydaj zgromadzone materiały, zanim otworzysz lub podwoisz kolejną skrzynię. Rozbudowa, produkcja i zarządzanie wyspą pozostają dostępne.')));
  if (current) {
    const copy = tutorialLessonText(current, language);
    const controls = node('div', { class: 'tutorial-v16-actions' });
    if (current.id === 'townhall-upgrade' && !status.buildingSuppliesClaimed && !current.completed) controls.append(action(pick(language, 'Collect building supplies', 'Odbierz materiały do budowy'), () => onAction({ type: 'prepareTutorialUpgrade' }), { 'data-tutorial-supplies': '' }));
    if (current.canClaim) controls.append(action(pick(language, 'Open reward chest', 'Otwórz skrzynię z nagrodą'), () => onAction({ type: 'claimTutorial', taskId: current.id }), { 'data-tutorial-claim': current.id }));
    else {
      controls.append(action(pick(language, 'Go to this place', 'Przejdź do wskazanego miejsca'), () => onVisit(current.route), { 'data-tutorial-visit': current.id }));
    }
    root.append(node('section', { class: 'tutorial-v16-current', 'data-tutorial-current': current.id },
      node('span', { class: 'tutorial-v16-eyebrow' }, fraction(current.index, rows.length, language)), node('h3', {}, copy.title), node('p', {}, copy.description),
      node('p', { class: 'tutorial-v16-reward' }, pick(language, 'Reward: a chest with 100–300 of each of the five materials.', 'Nagroda: skrzynia z 100–300 sztuk każdego z pięciu materiałów.')),
      controls, node('small', { class: 'tutorial-v16-hint' }, pick(language, 'Follow the highlighted control and complete the actual action. Reading alone never grants a chest.', 'Wykonaj wskazane strzałką działanie. Samo przeczytanie instrukcji nie przyznaje skrzyni.')),
      current.kind === 'condition' ? node('small', { class: 'tutorial-v16-hint' }, pick(language, 'This step completes after the real delivery or production event. Your island keeps working.', 'Krok zaliczy się po prawdziwej dostawie albo produkcji. Twoja wyspa cały czas pracuje.')) : null));
  } else root.append(node('section', { class: 'tutorial-v16-current is-finished', 'data-tutorial-finished': '' }, node('span', { class: 'tutorial-v16-finished-mark', 'aria-hidden': 'true' }, '✓'), node('h3', {}, pick(language, 'Your island is in good hands', 'Twoja wyspa jest w dobrych rękach')), node('p', {}, pick(language, 'All 25 lessons are complete. You can revisit the guide here whenever you need it.', 'Wszystkie 25 lekcji ukończone. Możesz wrócić do tego przewodnika, kiedy tylko zechcesz.'))));
  const rewards = rows.filter(row => row.claimed && !!state.tutorial?.chests?.[row.id] && !row.shared && !row.skipped);
  if (rewards.length) root.append(node('section', { class: 'tutorial-v16-pending' }, node('h4', {}, pick(language, 'Your chest bonuses', 'Premie do Twoich skrzyń')), ...rewards.map(row => action(pick(language, `Review: ${tutorialLessonText(row, language).title}`, `Sprawdź: ${tutorialLessonText(row, language).title}`), () => onAction({ type: 'seeTutorialReward', taskId: row.id }), { class: 'tutorial-action secondary', 'data-tutorial-review': row.id }))));
  root.append(node('details', { class: 'tutorial-v16-list' }, node('summary', {}, pick(language, 'All 25 lessons', 'Wszystkie 25 lekcji')), node('ol', {}, ...rows.map(row => node('li', { class: row.completed ? 'is-complete' : '', 'data-tutorial-list-item': row.id }, node('span', { 'aria-hidden': 'true' }, row.completed ? '✓' : String(row.index)), node('span', {}, tutorialLessonText(row, language).title))))));
  root.append(node('div', { class: 'tutorial-v16-footer' },
    action(pick(language, 'Back to island', 'Wróć na wyspę'), onClose, { class: 'tutorial-action secondary', 'data-tutorial-later': '' }),
    status.autoOpenDisabled && !status.finished ? action(pick(language, 'Resume automatic tutorial', 'Wznów samouczek przy wejściu'), () => onAction({ type: 'resumeTutorial' }), { class: 'tutorial-action quiet', 'data-tutorial-resume': '' }) : !status.finished ? action(pick(language, 'Stop showing automatically', 'Nie pokazuj automatycznie'), () => { if (onAction({ type: 'dismissTutorial' }) !== false) onClose?.(); }, { class: 'tutorial-action quiet', 'data-tutorial-dismiss': '' }) : null));
  root.append(node('small', { class: 'tutorial-v16-hint' }, pick(language, 'Your progress is saved. You can resume or revisit the tutorial from the island menu.', 'Postęp jest zapisany. Samouczek możesz wznowić lub otworzyć ponownie z menu wyspy.')));
  return root;
}

export function createTutorialGuide(options) {
  const { state, progression, language = 'en', onAction, onVisit } = options;
  const status = progression.tutorialStatus(state);
  const rows = rowsFor(options), storageBlocked = rows.some(row => row.rewardBlocked);
  if (status.autoOpenDisabled || status.finished && !storageBlocked) return null;
  const current = nextRow(rows) || rows.find(row => row.rewardBlocked);
  if (!current) return null;
  const copy = tutorialLessonText(current, language);
  return node('aside', { class: 'tutorial-v16-guide', 'data-tutorial-guide': current.id, 'data-tutorial-target': current.completed ? '' : current.guideSelector || '', 'data-i18n-ignore': '', 'aria-label': pick(language, 'Current tutorial step', 'Aktualny krok samouczka') },
    node('div', { class: 'tutorial-v16-guide-copy' }, node('small', {}, fraction(current.index, status.total, language)), node('strong', {}, copy.title)),
    storageBlocked ? node('small', { class: 'tutorial-v18-storage-warning', 'data-tutorial-storage-blocked': '' }, pick(language, 'Chests are waiting: spend the excess materials. Island actions remain available.', 'Skrzynie czekają: wydaj nadmiar materiałów. Działania wyspy pozostają dostępne.')) : null,
    node('div', { class: 'tutorial-v16-guide-actions' },
      current.id === 'townhall-upgrade' && !status.buildingSuppliesClaimed && !current.completed ? action(pick(language, 'Collect building supplies', 'Odbierz materiały do budowy'), () => onAction({ type: 'prepareTutorialUpgrade' }), { 'data-tutorial-supplies': '' }) : null,
      current.canClaim ? action(pick(language, 'Open chest', 'Otwórz skrzynię'), () => onAction({ type: 'claimTutorial', taskId: current.id }), { 'data-tutorial-claim': current.id }) : action(pick(language, 'Go to the action', 'Przejdź do działania'), () => onVisit(current.route), { 'data-tutorial-go': current.id }),
      action(pick(language, 'Tutorial', 'Samouczek'), () => onVisit('tutorial'), { class: 'tutorial-action secondary', 'data-tutorial-return': '' })));
}

function chestPicture() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 160 120'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('tutorial-chest-picture');
  svg.innerHTML = '<ellipse cx="80" cy="105" rx="58" ry="9" fill="#031923" opacity=".5"/><path d="M26 50Q26 20 80 20T134 50V96H26Z" fill="#94622c" stroke="#efcb83" stroke-width="3"/><path d="M27 51H133V96H27Z" fill="#b1803d"/><path d="M25 50H135V62H25Z" fill="#edc97c"/><path d="M45 27V96M115 27V96" stroke="#dfb86a" stroke-width="10"/><path d="M70 51H90V76H70Z" fill="#f8db94" stroke="#795826" stroke-width="2"/><circle cx="80" cy="61" r="4" fill="#543b22"/><path d="M80 63V70" stroke="#543b22" stroke-width="3"/><path d="M51 7L55 16M80 1V12M109 7L105 16" stroke="#ffe6a0" stroke-width="4" stroke-linecap="round"/>';
  return svg;
}
let fanfareContext = null;
function fanfare(enabled) {
  if (!enabled) return;
  const userGesture = globalThis.navigator?.userActivation?.isActive === true;
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Context) return;
  try {
    // Unlock once during a real action. Later automatic milestones, such as
    // an arriving delivery, can use the already running context too.
    if (!fanfareContext || fanfareContext.state === 'closed') {
      if (!userGesture) return;
      fanfareContext = new Context();
    }
    const context = fanfareContext;
    if (context.state === 'suspended') {
      if (!userGesture) return;
      context.resume().catch(() => {});
    }
    for (const [index, frequency] of [523.25, 659.25, 783.99, 1046.5].entries()) {
      const tone = context.createOscillator(), volume = context.createGain(), at = context.currentTime + index * .14;
      tone.type = 'triangle'; tone.frequency.value = frequency;
      volume.gain.setValueAtTime(0, at); volume.gain.linearRampToValueAtTime(.07, at + .015); volume.gain.exponentialRampToValueAtTime(.001, at + .28);
      tone.connect(volume); volume.connect(context.destination); tone.start(at); tone.stop(at + .3);
      tone.onended = () => { tone.disconnect(); volume.disconnect(); };
    }
  } catch { /* Sound remains optional when the browser denies audio. */ }
}

export function showTutorialAchievement({ achievement, row, language = 'en', onShare, onSkip, onClose, animations = true, sound = true }) {
  const id = achievement.lessonId || achievement.id || row?.id;
  const previousFocus = document.activeElement;
  const copy = row ? tutorialLessonText(row, language) : { title: achievement.title };
  const popup = node('dialog', { class: 'tutorial-v16-celebration', 'data-tutorial-achievement': id, 'data-i18n-ignore': '', 'aria-labelledby': 'tutorial-success-title' });
  const animated = animations && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (animated) {
    const confetti = node('div', { class: 'tutorial-v16-confetti', 'aria-hidden': 'true' });
    for (let index = 0; index < 24; index++) { const ray = node('i'); ray.style.setProperty('--i', index); confetti.append(ray); }
    popup.append(confetti);
  }
  const content = node('div', { class: 'tutorial-v16-celebration-content' },
    node('p', { class: 'tutorial-v16-eyebrow' }, pick(language, 'Lesson complete', 'Lekcja ukończona')), node('h2', { id: 'tutorial-success-title' }, pick(language, 'Well done!', 'Brawo!')), node('p', { class: 'tutorial-success-lesson' }, copy.title), chestPicture(),
    node('strong', { class: 'tutorial-success-received' }, pick(language, 'Your reward is already yours', 'Twoja nagroda jest już odebrana')),
    node('div', { class: 'tutorial-chest-materials' }, ...MATERIALS.map((material, index) => node('div', { 'data-tutorial-reward-material': material }, node('span', {}, MATERIAL_NAMES[language === 'pl' ? 'pl' : 'en'][index]), node('strong', { 'data-tutorial-reward-quantity': material }, achievement.reward?.[material] || row?.reward?.[material] || 0)))),
    node('p', { class: 'tutorial-double-description' }, pick(language, 'Share your success to receive exactly the same resources once more.', 'Pochwal się sukcesem i odbierz dokładnie te same zasoby jeszcze raz.')));
  let disposed = false, busy = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (popup.open) popup.close(); popup.remove();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function finish(callback) {
    if (busy || disposed) return;
    busy = true;
    try { if (callback?.(achievement) !== false) dispose(); }
    finally { busy = false; }
  }
  const share = action(pick(language, 'Share on Facebook · chest ×2', 'Udostępnij na Facebooku · skrzynia ×2'), () => finish(onShare), { 'data-tutorial-share': id, disabled: row?.canShare === false });
  content.append(node('div', { class: 'tutorial-v16-actions' }, share,
    action(pick(language, 'Skip sharing', 'Pomiń udostępnianie'), () => finish(onSkip), { class: 'tutorial-action secondary', 'data-tutorial-skip': id })),
    node('small', { class: 'tutorial-v16-hint' }, row?.canShare === false ? pick(language, 'Spend stored materials before doubling another chest. Your existing reward remains available.', 'Wydaj zgromadzone materiały przed podwojeniem skrzyni. Odebrana nagroda pozostaje dostępna.') : pick(language, 'You choose and approve sharing yourself. Nothing is published automatically.', 'Samodzielnie wybierasz i zatwierdzasz udostępnienie. Nic nie publikuje się automatycznie.')),
    action(pick(language, 'Decide later', 'Zdecyduję później'), () => { dispose(); onClose?.(achievement); }, { class: 'tutorial-action quiet', 'data-tutorial-reward-later': id }));
  popup.append(content);
  popup.addEventListener('cancel', event => { event.preventDefault(); dispose(); onClose?.(achievement); });
  document.body.append(popup); popup.showModal(); share.focus();
  fanfare(sound !== false);
  if (globalThis.matchMedia?.('(pointer: coarse)').matches && typeof navigator.vibrate === 'function') { try { navigator.vibrate([65, 45, 110]); } catch {} }
  return { element: popup, dispose };
}
