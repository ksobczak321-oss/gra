import { validateIslandName } from './harborlight-v1-profile.js?v=frontend-v23';

const pick = (language, pl, en) => language === 'pl' ? pl : en;
const valueFor = (value, language) => typeof value === 'string' ? value : value?.[language] || value?.pl || value?.en || '';
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function node(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') element.className = value;
    else if (key.startsWith('on')) element.addEventListener(key.slice(2), value);
    else if (value != null && value !== false) element.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) if (child != null) element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return element;
}

/** The introduction is an explanation, not a source of tutorial rewards.
 * onUpdate/onFinish acknowledge the model/cloud operation before navigation.
 * A rejected operation keeps this modal and the world's paused clock in place.
 */
export function createIslandOnboarding(options = {}) {
  const { steps = [], language = 'pl', onUpdate = () => true, onFinish = () => true, onError = () => {} } = options;
  let current = { stage: options.stage || 'intro', index: Math.max(0, Math.floor(options.index || 0)), islandName: options.islandName || '' };
  let active = false, busy = false, destroyed = false, target = null, generation = 0, frame = 0, resizeObserver = null;
  const previousFocus = document.activeElement;
  const root = node('dialog', { class: 'island-onboarding', 'data-island-onboarding': '', 'data-i18n-ignore': '', 'aria-modal': 'true', 'aria-labelledby': 'island-onboarding-title', 'aria-describedby': 'island-onboarding-description' });
  const highlight = node('div', { class: 'island-onboarding-highlight', 'data-onboarding-highlight': '', 'aria-hidden': 'true', hidden: true });
  const cursor = node('div', { class: 'island-onboarding-cursor', 'data-onboarding-cursor': '', 'aria-hidden': 'true', hidden: true }, '➤');
  const card = node('section', { class: 'island-onboarding-card', 'data-onboarding-card': '', tabindex: '-1' });
  const paused = () => node('p', { class: 'island-onboarding-paused', 'data-onboarding-paused': '' },
    pick(language, '⏸ Czas na wyspie jest zatrzymany. Ruszy po zakończeniu lub zamknięciu oprowadzania.', '⏸ Island time is paused. It starts when you finish or close the tour.'));
  root.append(highlight, cursor, card);

  function showError(message) {
    let error = card.querySelector('[data-onboarding-error]');
    if (!error) { error = node('p', { class: 'island-onboarding-error', 'data-onboarding-error': '', role: 'alert' }); card.querySelector('.island-onboarding-actions')?.before(error); }
    error.textContent = message;
    schedulePosition();
  }
  function setBusy(next) {
    busy = next; root.setAttribute('aria-busy', String(next));
    card.querySelectorAll('button,input').forEach(control => { control.disabled = next || control.dataset.onboardingFirst === 'true'; });
  }
  async function commit(next) {
    if (busy || destroyed) return false;
    setBusy(true);
    try {
      if (await onUpdate({ ...next }) === false) throw new Error('onboarding-update-rejected');
      if (destroyed) return false;
      current = { ...current, ...next }; await render(); return true;
    } catch (error) {
      if (!destroyed) { onError(error); showError(pick(language, 'Nie udało się potwierdzić zmiany. Sprawdź połączenie i spróbuj ponownie.', 'The change could not be confirmed. Check your connection and try again.')); }
      return false;
    } finally { if (!destroyed) setBusy(false); }
  }
  async function finish(skipped) {
    if (busy || destroyed || current.stage !== 'tour') return;
    setBusy(true);
    try {
      if (await onFinish({ skipped, islandName: current.islandName }) === false) throw new Error('onboarding-finish-rejected');
      destroy();
    } catch (error) {
      if (!destroyed) { onError(error); showError(pick(language, 'Nie udało się rozpocząć gry. Sprawdź połączenie i spróbuj ponownie.', 'The game could not be started. Check your connection and try again.')); setBusy(false); }
    }
  }
  const control = (label, callback, attributes = {}) => node('button', { type: 'button', class: 'island-onboarding-action', onclick: callback, ...attributes }, label);
  const title = text => node('h2', { id: 'island-onboarding-title', 'data-onboarding-title': '' }, text);
  const description = (...children) => node('div', { id: 'island-onboarding-description', class: 'island-onboarding-description' }, ...children);
  const nextLabel = () => pick(language, 'Dalej →', 'Next →');

  async function render() {
    const thisGeneration = ++generation;
    target = null; resizeObserver?.disconnect(); highlight.hidden = true; cursor.hidden = true;
    root.dataset.onboardingStage = current.stage;
    root.dataset.onboardingStep = current.stage === 'tour' ? steps[current.index]?.id || '' : '';
    card.style.removeProperty('left'); card.style.removeProperty('top'); card.classList.toggle('is-tour', current.stage === 'tour');
    card.replaceChildren();
    if (current.stage === 'intro') {
      card.append(node('small', { class: 'island-onboarding-eyebrow' }, 'HARBORLIGHT'), title(pick(language, 'Twoja wyspa, Twoje decyzje', 'Your island, your decisions')),
        description(node('p', {}, pick(language,
          'Obejmujesz opiekę nad małą osadą na wyspie. Zapewnij mieszkańcom domy, żywność i pracę, a z czasem rozbuduj ją w tętniący życiem port.',
          'You take care of a small island settlement. Give your residents homes, food and jobs, then grow it into a thriving harbour.')),
        node('p', {}, pick(language,
          'Przydzielaj pracowników, rozwijaj produkcję i pilnuj transportu — materiały muszą dotrzeć tam, gdzie są potrzebne. Szczęście mieszkańców wpływa na przyrost populacji. Karty zasobów czytasz jako zapas lokalny / centralny (w transporcie), a dolny wiersz pokazuje bilans na godzinę.',
          'Assign workers, develop production and manage transport: materials need to reach the places that use them. Residents’ happiness controls population growth. Read resource cards as local / central stock (in transit); the lower line shows the hourly balance.')),
        node('p', {}, pick(language,
          'Ekspedycje i zadania przynoszą dodatkowe nagrody. Najpierw nazwiesz wyspę i poznasz jej najważniejsze miejsca; potem samouczek przeprowadzi Cię przez pierwsze prawdziwe działania.',
          'Expeditions and tasks bring extra rewards. First you will name your island and get to know its main controls; the tutorial will then guide you through your first real actions.'))), paused(),
        node('div', { class: 'island-onboarding-actions' }, control(nextLabel(), () => commit({ ...current, stage: 'name' }), { 'data-onboarding-next': '' })));
    } else if (current.stage === 'name') {
      const input = node('input', { id: 'island-onboarding-name', 'data-onboarding-name': '', name: 'islandName', type: 'text', autocomplete: 'off', required: true, value: current.islandName, 'aria-describedby': 'island-onboarding-name-hint', spellcheck: 'false' });
      const form = node('form', { 'data-onboarding-name-form': '', onsubmit: event => {
        event.preventDefault();
        const result = validateIslandName(input.value);
        if (!result.ok) { input.setAttribute('aria-invalid', 'true'); showError(pick(language, 'Wybierz nazwę o długości 2–40 znaków, bez znaków sterujących i nawiasów < >.', 'Choose a name of 2–40 characters without control characters or < > brackets.')); input.focus(); return; }
        input.removeAttribute('aria-invalid'); void commit({ stage: 'tour', index: 0, islandName: result.name });
      } });
      input.addEventListener('input', () => input.removeAttribute('aria-invalid'));
      form.append(node('label', { for: 'island-onboarding-name' }, pick(language, 'Nazwa Twojej wyspy', 'Your island’s name')), input,
        node('small', { id: 'island-onboarding-name-hint' }, pick(language, 'Od 2 do 40 znaków. Nazwa będzie widoczna w lewym górnym rogu gry.', 'Use 2–40 characters. The name appears in the top left corner of the game.')), paused(),
        node('div', { class: 'island-onboarding-actions' }, control(pick(language, '← Wstecz', '← Back'), () => commit({ ...current, stage: 'intro' }), { 'data-onboarding-previous': '', class: 'island-onboarding-action secondary' }),
          node('button', { type: 'submit', class: 'island-onboarding-action', 'data-onboarding-next': '' }, nextLabel())));
      card.append(node('small', { class: 'island-onboarding-eyebrow' }, 'HARBORLIGHT'), title(pick(language, 'Nadaj nazwę swojej wyspie', 'Give your island a name')), description(node('p', {}, pick(language, 'To początek Twojej osady. Wybierz nazwę, z którą chcesz wyruszyć w tę przygodę.', 'This is the beginning of your settlement. Choose a name to start this adventure with.'))), form);
    } else if (current.stage === 'tour') {
      current.index = clamp(current.index, 0, Math.max(0, steps.length - 1));
      const step = steps[current.index];
      const last = current.index >= steps.length - 1;
      card.append(control('×', () => finish(true), { class: 'island-onboarding-exit', 'data-onboarding-exit': '', 'aria-label': pick(language, 'Zakończ oprowadzanie i rozpocznij grę', 'Close the tour and start playing') }),
        node('small', { class: 'island-onboarding-eyebrow', 'data-onboarding-counter': '' }, pick(language, `Poznaj wyspę · ${current.index + 1} z ${steps.length}`, `Explore your island · ${current.index + 1} of ${steps.length}`)),
        title(valueFor(step?.title, language)), description(node('p', {}, valueFor(step?.text, language))), paused(),
        node('div', { class: 'island-onboarding-actions' }, control(pick(language, '← Wstecz', '← Back'), () => commit({ ...current, index: current.index - 1 }), { 'data-onboarding-previous': '', 'data-onboarding-first': String(current.index === 0), disabled: current.index === 0, class: 'island-onboarding-action secondary' }),
          control(last ? pick(language, 'Rozpocznij grę →', 'Start playing →') : nextLabel(), () => last ? finish(false) : commit({ ...current, index: current.index + 1 }), { 'data-onboarding-next': '' })));
      root.dataset.onboardingStep = step?.id || '';
      try {
        await step?.prepare?.();
        if (thisGeneration !== generation || destroyed) return;
        target = typeof step?.target === 'function' ? step.target() : typeof step?.target === 'string' ? document.querySelector(step.target) : step?.target;
        target?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      } catch (error) { onError(error); }
      if (target instanceof Element && typeof ResizeObserver === 'function') { resizeObserver = new ResizeObserver(schedulePosition); resizeObserver.observe(target); }
    }
    if (thisGeneration !== generation || destroyed) return;
    schedulePosition();
    if (active) requestAnimationFrame(() => {
      if (thisGeneration !== generation || destroyed) return;
      (card.querySelector('[data-onboarding-name]') || card).focus({ preventScroll: true });
    });
  }

  function position() {
    frame = 0;
    if (!active || destroyed || current.stage !== 'tour') return;
    const viewportWidth = document.documentElement.clientWidth, viewportHeight = window.innerHeight;
    const gap = 16, safe = 12;
    let rect = target?.isConnected && target.getClientRects().length ? target.getBoundingClientRect() : null;
    // Some controls are clipped inside a horizontally scrollable dock. Show the
    // visible part of the actual target, never a giant/off-screen fake pointer.
    if (rect) {
      let left = clamp(rect.left, safe, viewportWidth - safe), right = clamp(rect.right, safe, viewportWidth - safe);
      let top = clamp(rect.top, safe, viewportHeight - safe), bottom = clamp(rect.bottom, safe, viewportHeight - safe);
      for (let ancestor = target.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (/(auto|scroll|hidden|clip)/.test(`${style.overflowX} ${style.overflowY}`)) {
          const bounds = ancestor.getBoundingClientRect();
          if (style.overflowX !== 'visible') { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
          if (style.overflowY !== 'visible') { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
        }
      }
      rect = right > left && bottom > top ? { left, right, top, bottom, width: right - left, height: bottom - top } : null;
    }
    highlight.hidden = !rect; cursor.hidden = !rect; root.classList.toggle('has-target', !!rect);
    if (!rect) { card.style.left = `${Math.max(safe, (viewportWidth - card.offsetWidth) / 2)}px`; card.style.top = `${Math.max(safe, (viewportHeight - card.offsetHeight) / 2)}px`; return; }
    highlight.dataset.target = steps[current.index]?.id || '';
    Object.assign(highlight.style, { left: `${rect.left - 4}px`, top: `${rect.top - 4}px`, width: `${rect.width + 8}px`, height: `${rect.height + 8}px` });
    Object.assign(cursor.style, { left: `${clamp(rect.right - 12, safe, viewportWidth - 38)}px`, top: `${clamp(rect.bottom - 12, safe, viewportHeight - 38)}px` });
    const width = card.offsetWidth, height = card.offsetHeight;
    const positions = [
      { x: rect.left + (rect.width - width) / 2, y: rect.bottom + gap },
      { x: rect.left + (rect.width - width) / 2, y: rect.top - height - gap },
      { x: rect.right + gap, y: rect.top + (rect.height - height) / 2 },
      { x: rect.left - width - gap, y: rect.top + (rect.height - height) / 2 }
    ].map(point => ({ x: clamp(point.x, safe, Math.max(safe, viewportWidth - width - safe)), y: clamp(point.y, safe, Math.max(safe, viewportHeight - height - safe)) }));
    const overlap = point => Math.max(0, Math.min(point.x + width, rect.right + 8) - Math.max(point.x, rect.left - 8)) * Math.max(0, Math.min(point.y + height, rect.bottom + 8) - Math.max(point.y, rect.top - 8));
    const placement = positions.reduce((best, point) => overlap(point) < overlap(best) ? point : best);
    card.style.left = `${placement.x}px`; card.style.top = `${placement.y}px`;
  }
  function schedulePosition() { if (!frame && active && !destroyed) frame = requestAnimationFrame(position); }
  function keyboard(event) {
    if (!active || busy || current.stage !== 'tour' || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); card.querySelector('[data-onboarding-next]')?.click(); }
    else if (event.key === 'ArrowLeft' && current.index > 0) { event.preventDefault(); card.querySelector('[data-onboarding-previous]')?.click(); }
  }
  root.addEventListener('cancel', event => { event.preventDefault(); if (current.stage === 'tour') void finish(true); });
  root.addEventListener('keydown', keyboard);
  window.addEventListener('resize', schedulePosition);
  window.addEventListener('scroll', schedulePosition, true);
  window.visualViewport?.addEventListener('resize', schedulePosition);
  function destroy() {
    if (destroyed) return;
    destroyed = true; active = false; generation++; resizeObserver?.disconnect(); cancelAnimationFrame(frame);
    window.removeEventListener('resize', schedulePosition); window.removeEventListener('scroll', schedulePosition, true); window.visualViewport?.removeEventListener('resize', schedulePosition);
    if (root.open) root.close(); root.remove();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  return {
    root,
    async start() {
      if (destroyed || active) return;
      if (!root.isConnected) document.body.append(root);
      active = true; await render();
      if (!destroyed) { root.showModal(); schedulePosition(); (card.querySelector('[data-onboarding-name]') || card).focus({ preventScroll: true }); }
    },
    async update(next) { if (!destroyed && !busy) { current = { ...current, ...next }; await render(); } },
    destroy,
    get active() { return active && !destroyed; }
  };
}
