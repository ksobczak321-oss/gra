// Read-only explanations of actual changes. This module never awards a reward,
// changes the island clock or repeats an action performed by the game model.
const number = value => Number.isFinite(value) ? value : 0;
const pick = (language, pl, en) => language === 'pl' ? pl : en;
const boundedHappiness = value => Math.max(-100, Math.min(100, number(value)));
const displayHappiness = value => {
  const rounded = Math.round(value);
  return Math.ceil(Math.abs(value - rounded) <= 1e-9 ? rounded : value);
};
const percentage = (value, language) => `${new Intl.NumberFormat(language === 'pl' ? 'pl-PL' : 'en-US', { maximumFractionDigits: 2 }).format(value)}%`;
const positive = value => Math.max(0, number(value));

export function captureLearningFeedback(state = {}) {
  return {
    context: `${state.islandId || 'island-1'}:${state.islandGeneration || 0}`,
    townhall: number(state.buildings?.townhall?.level),
    lighthouse: number(state.buildings?.lighthouse?.level),
    lighthouseRemaining: positive(state.lighthouseRemaining),
    happiness: boundedHappiness(state.happiness),
    blessingRemaining: positive(state.blessingRemaining),
    people: (state.residents || []).map(person => ({ id: person.personUid || person.id, happiness: number(person.happiness) })),
    attractions: (state.leisure?.effects || []).map(effect => ({ id: effect.id, title: effect.title || '', amount: number(effect.amount), remaining: positive(effect.remaining) }))
  };
}

export function learningFeedbackChanges(before, after, action = null) {
  if (!before || !after || before.context !== after.context) return [];
  const events = [];
  if (after.townhall > before.townhall) events.push({ kind: 'townhall', key: `${after.context}:townhall:${after.townhall}`, level: after.townhall, context: after.context });
  if (after.lighthouse > before.lighthouse) events.push({ kind: 'lighthouse', key: `${after.context}:lighthouse:${after.lighthouse}`, level: after.lighthouse, context: after.context });
  if (['houseHappiness', 'houseHappinessAll'].includes(action?.type)) {
    const old = new Map(before.people.map(person => [person.id, person.happiness]));
    const changedResidents = after.people.filter(person => old.has(person.id) && person.happiness > old.get(person.id) + 1e-7).length;
    if (changedResidents || after.happiness > before.happiness + 1e-7) events.push({ kind: 'house', before: before.happiness, after: after.happiness, changedResidents, context: after.context });
  }
  if (action?.type === 'blessing' && after.blessingRemaining > before.blessingRemaining + 1e-7) events.push({ kind: 'blessing', context: after.context });
  if (action?.type === 'buyAttraction') {
    const previous = new Set(before.attractions.map(effect => effect.id));
    const effect = after.attractions.find(effect => !previous.has(effect.id));
    if (effect) events.push({ kind: 'attraction', effectId: effect.id, amount: effect.amount, context: after.context });
  }
  return events;
}

function duration(seconds, language) {
  const total = Math.max(0, Math.ceil(number(seconds))), hours = Math.floor(total / 3600), minutes = Math.floor(total % 3600 / 60), rest = total % 60;
  return [hours ? `${hours} ${language === 'pl' ? 'godz.' : 'h'}` : '', minutes ? `${minutes} min` : '', `${rest} s`].filter(Boolean).join(' ');
}

export function learningFeedbackCopy(event, state = {}, language = 'en') {
  if (event.kind === 'townhall') return {
    title: pick(language, `Ratusz osiągnął poziom ${event.level}.`, `The Town Hall has reached level ${event.level}.`),
    description: pick(language, 'Wzrósł limit mieszkańców Twojej wyspy. Nowy poziom zobaczysz tutaj.', 'Your island’s population limit has increased. Its new level is shown here.'), target: 'level'
  };
  if (event.kind === 'lighthouse') {
    const remaining = positive(state.lighthouseRemaining);
    return { title: pick(language, 'Latarnia znów świeci!', 'The Lighthouse shines again!'),
      description: remaining > 0 ? pick(language, `Szczęście wszystkich mieszkańców wynosi teraz 100% przez ${duration(remaining, language)}, a produkcja materiałów jest dwukrotnie większa.`, `Every resident now has 100% happiness for ${duration(remaining, language)}, and material production is doubled.`)
        : pick(language, `Latarnia osiągnęła poziom ${event.level}. Sprawdź jej nowy etap odbudowy.`, `The Lighthouse has reached level ${event.level}. See its new restoration stage.`), target: remaining > 0 ? 'happiness' : 'lighthouse' };
  }
  if (event.kind === 'house') {
    const before = displayHappiness(event.before), after = displayHappiness(event.after);
    return { title: pick(language, 'Punkty szczęścia przekazane.', 'Happiness points have been given.'),
      description: after > before ? pick(language, `Szczęście mieszkańców po tej akcji: ${percentage(before, language)} → ${percentage(after, language)}.`, `Residents’ happiness after this action: ${percentage(before, language)} → ${percentage(after, language)}.`)
        : pick(language, 'Wybrani mieszkańcy otrzymali punkty szczęścia. Szczegóły znajdziesz w Domu.', 'The selected residents received happiness points. See the House for details.'), target: 'happiness' };
  }
  const effect = event.kind === 'attraction' ? (state.leisure?.effects || []).find(effect => effect.id === event.effectId) : null;
  const remaining = event.kind === 'blessing' ? positive(state.blessingRemaining) : positive(effect?.remaining);
  const amount = event.kind === 'blessing' ? 20 : number(effect?.amount ?? event.amount);
  const forced = positive(state.lighthouseRemaining) > 0;
  return { title: event.kind === 'blessing' ? pick(language, 'Błogosławieństwo działa.', 'The blessing is active.') : pick(language, 'Atrakcja działa.', 'The attraction is active.'),
    description: remaining > 0 ? pick(language, `Premia: +${amount} p.p. szczęścia. Pozostały czas: ${duration(remaining, language)}.${forced ? ' Mieszkańcy korzystają już ze szczęścia 100%. Nową premię zobaczysz na liście aktywnych efektów.' : ''}`, `Bonus: +${amount} pp happiness. Time remaining: ${duration(remaining, language)}.${forced ? ' Residents already have 100% happiness. See the new bonus in active effects.' : ''}`)
      : pick(language, 'Mieszkańcy otrzymali premię. Jej czas działania już minął.', 'Residents received the bonus. Its duration has now ended.'), target: 'happiness' };
}

function element(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) if (value != null) node.setAttribute(name, String(value));
  for (const child of children.flat()) if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}

export function showTutorialExitReminder({ language = 'en', firstIntroduction = false } = {}) {
  const previous = document.querySelector('[data-tutorial-exit-reminder]');
  if (previous) { previous.focus(); return { element: previous, dispose: () => { previous.close(); previous.remove(); } }; }
  const popup = element('dialog', { class: 'learning-feedback-reminder', 'data-tutorial-exit-reminder': '', 'data-i18n-ignore': '', 'aria-labelledby': 'tutorial-exit-reminder-title' },
    element('h2', { id: 'tutorial-exit-reminder-title' }, pick(language, 'Tutorial został zamknięty', 'The tutorial has been closed')),
    element('p', {}, pick(language, 'Aby wrócić do przerwanego miejsca, kliknij ? → Wznów tutorial.', 'To return to your saved place, select ? → Resume tutorial.')),
    element('p', { class: 'learning-feedback-reminder-clock' }, firstIntroduction ? pick(language, 'Czas na wyspie zaczyna teraz biec.', 'Island time now starts running.') : pick(language, 'Twoja wyspa działa dalej.', 'Your island keeps running.')));
  const close = () => { if (popup.open) popup.close(); popup.remove(); };
  const button = element('button', { type: 'button', 'data-close-tutorial-exit-reminder': '' }, pick(language, 'Rozumiem', 'Understood'));
  button.addEventListener('click', close); popup.addEventListener('cancel', event => { event.preventDefault(); close(); });
  popup.append(button); document.body.append(popup); popup.showModal(); button.focus();
  return { element: popup, dispose: close };
}

/** The host decides when explanations may be shown. A modal reward, a running
 * minigame or a screen tour can therefore finish before this queue is revealed.
 */
export function createLearningFeedback({ getState, getLanguage = () => 'en', getTarget, isEnabled = () => true, canShow = () => true, onReveal = () => true, onChange = () => {}, onError = () => {} } = {}) {
  let baseline = null, queue = [], active = null, busy = false, serial = 0, disposed = false;
  const seen = new Set();
  function dismiss() {
    if (!active) return;
    const current = active; active = null;
    current.dispose(); onChange();
  }
  function enqueue(events) {
    if (!isEnabled(getState?.())) return;
    let changed = false;
    for (const event of events) {
      const key = event.key || `${event.context}:action:${++serial}`;
      if (seen.has(key)) continue;
      seen.add(key); queue.push({ ...event, key }); changed = true;
      if (seen.size > 512) seen.delete(seen.values().next().value);
      // Keep sequential completions, but coalesce rapidly repeated House use.
      if (event.kind === 'house') queue = queue.filter(item => item.kind !== 'house' || item.key === key);
    }
    if (queue.length > 16) queue = queue.slice(-16);
    if (changed) onChange();
  }
  function observe(state = getState?.()) {
    if (disposed) return;
    const next = captureLearningFeedback(state);
    if (baseline && baseline.context !== next.context) { queue = []; seen.clear(); dismiss(); }
    if (baseline && baseline.context === next.context) enqueue(learningFeedbackChanges(baseline, next));
    baseline = next;
  }
  function recordAction(action, before, after = getState?.(), result = { ok: true }) {
    if (disposed || result?.ok !== true) return;
    const old = before?.people && before?.townhall !== undefined ? before : captureLearningFeedback(before);
    enqueue(learningFeedbackChanges(old, captureLearningFeedback(after), action).filter(event => !['townhall', 'lighthouse'].includes(event.kind)));
  }
  async function refresh() {
    if (disposed || busy || active || !queue.length || !canShow(getState?.())) return false;
    if (typeof document === 'undefined' || document.querySelector('dialog[open]:not(#island-dialog)')) return false;
    const event = queue[0], state = getState?.();
    if (captureLearningFeedback(state).context !== event.context) { queue.shift(); return false; }
    busy = true;
    try {
      if (await onReveal(event) === false || disposed) return false;
      if (captureLearningFeedback(getState?.()).context !== event.context || !canShow(getState?.())) return false;
      const language = getLanguage(), copy = learningFeedbackCopy(event, getState?.(), language);
      const target = getTarget?.(copy.target, event);
      if (!target?.getClientRects?.().length) return false;
      const popup = element('dialog', { class: 'learning-feedback-layer', 'data-learning-feedback': event.kind, 'data-i18n-ignore': '', 'aria-labelledby': 'learning-feedback-title' });
      const highlight = element('span', { class: 'learning-feedback-highlight', 'aria-hidden': 'true' });
      const arrow = element('span', { class: 'learning-feedback-arrow', 'aria-hidden': 'true' }, '➤');
      const card = element('section', { class: 'learning-feedback-card', tabindex: '-1' }, element('h2', { id: 'learning-feedback-title' }, copy.title), element('p', { 'data-learning-feedback-description': '' }, copy.description));
      const close = element('button', { type: 'button', 'data-learning-feedback-close': '' }, pick(language, 'Rozumiem', 'Understood'));
      close.addEventListener('click', dismiss); card.append(close); popup.append(highlight, arrow, card);
      const position = () => {
        const rect = target.getBoundingClientRect(), width = innerWidth, height = innerHeight;
        Object.assign(highlight.style, { left: `${rect.left - 4}px`, top: `${rect.top - 4}px`, width: `${rect.width + 8}px`, height: `${rect.height + 8}px` });
        Object.assign(arrow.style, { left: `${Math.max(8, Math.min(width - 40, rect.left + rect.width / 2 - 16))}px`, top: `${Math.max(8, Math.min(height - 40, rect.bottom + 5))}px` });
        const cardWidth = card.offsetWidth, cardHeight = card.offsetHeight;
        const below = rect.bottom + 43, above = rect.top - cardHeight - 20;
        const top = below + cardHeight <= height - 12 ? below : above >= 12 ? above : Math.max(12, height - cardHeight - 12);
        card.style.left = `${Math.max(12, Math.min(width - cardWidth - 12, rect.left + rect.width / 2 - cardWidth / 2))}px`;
        card.style.top = `${top}px`;
      };
      popup.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
      active = { element: popup, event, dispose: () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); if (popup.open) popup.close(); popup.remove(); } };
      queue.shift(); document.body.append(popup); popup.showModal(); position(); close.focus({ preventScroll: true });
      window.addEventListener('resize', position); window.addEventListener('scroll', position, true); onChange(); return true;
    } catch (error) {
      if (active) { const current = active; active = null; current.dispose(); }
      if (!disposed && !queue.some(item => item.key === event.key)) queue.unshift(event);
      try { onError(error); } catch { /* Explanations cannot break island actions. */ }
      return false;
    } finally { busy = false; }
  }
  return { observe, recordAction, refresh, dismiss, pending: () => queue.map(event => ({ ...event })), get active() { return active?.event || null; }, dispose() { disposed = true; queue = []; dismiss(); baseline = null; seen.clear(); } };
}
