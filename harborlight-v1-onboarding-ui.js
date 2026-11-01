import { validateIslandName } from './harborlight-v1-profile.js?v=frontend-v26';

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
 * onUpdate/onFinish/onPause acknowledge the model/cloud operation before navigation.
 * A rejected operation keeps this modal and the world's paused clock in place.
 */
export function createIslandOnboarding(options = {}) {
  const { steps = [], onUpdate = () => true, onFinish = () => true, onLanguageChange = () => true, onError = () => {} } = options;
  let language = options.language === 'en' ? 'en' : 'pl';
  let nameDraft = options.islandName || '';
  let current = { stage: options.stage || 'intro', index: Math.max(0, Math.floor(options.index || 0)), islandName: options.islandName || '' };
  let active = false, busy = false, destroyed = false, target = null, generation = 0, frame = 0, resizeObserver = null;
  const previousFocus = document.activeElement;
  const root = node('dialog', { class: 'island-onboarding', 'data-island-onboarding': '', 'data-i18n-ignore': '', 'aria-modal': 'true', 'aria-labelledby': 'island-onboarding-title', 'aria-describedby': 'island-onboarding-description' });
  const highlight = node('div', { class: 'island-onboarding-highlight', 'data-onboarding-highlight': '', 'aria-hidden': 'true', hidden: true });
  const cursor = node('div', { class: 'island-onboarding-cursor', 'data-onboarding-cursor': '', 'aria-hidden': 'true', hidden: true }, '➤');
  const card = node('section', { class: 'island-onboarding-card', 'data-onboarding-card': '', tabindex: '-1' });
  const replay = options.replay === true;
  if (replay) root.dataset.onboardingReplay = 'true';
  const paused = () => node('p', { class: 'island-onboarding-paused', 'data-onboarding-paused': '' },
    replay ? pick(language, 'Czas na rozpoczętej wyspie biegnie dalej. To oprowadzanie nie zmienia postępu ani nagród.', 'Time on your started island keeps running. This tour does not change progress or rewards.') :
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
    card.querySelectorAll('button,input,select').forEach(control => { control.disabled = next || control.dataset.onboardingFirst === 'true'; });
  }
  async function commit(next) {
    if (busy || destroyed) return false;
    setBusy(true);
    try {
      if (await onUpdate({ ...next }) === false) throw new Error('onboarding-update-rejected');
      if (destroyed) return false;
      current = { ...current, ...next };
      if (next.islandName != null) nameDraft = next.islandName;
      await render(); return true;
    } catch (error) {
      if (!destroyed) { onError(error); showError(pick(language, 'Nie udało się potwierdzić zmiany. Sprawdź połączenie i spróbuj ponownie.', 'The change could not be confirmed. Check your connection and try again.')); }
      return false;
    } finally { if (!destroyed) setBusy(false); }
  }
  async function finish(skipped) {
    if (busy || destroyed || current.stage !== 'tour') return;
    setBusy(true);
    try {
      const callback = skipped && typeof options.onPause === 'function' ? options.onPause : onFinish;
      if (await callback({ skipped, stage: current.stage, index: current.index, islandName: current.islandName, replay }) === false) throw new Error('onboarding-finish-rejected');
      destroy();
    } catch (error) {
      if (!destroyed) { onError(error); showError(pick(language, 'Nie udało się rozpocząć gry. Sprawdź połączenie i spróbuj ponownie.', 'The game could not be started. Check your connection and try again.')); setBusy(false); }
    }
  }
  const control = (label, callback, attributes = {}) => node('button', { type: 'button', class: 'island-onboarding-action', onclick: callback, ...attributes }, label);
  const title = text => node('h2', { id: 'island-onboarding-title', 'data-onboarding-title': '' }, text);
  const description = (...children) => node('div', { id: 'island-onboarding-description', class: 'island-onboarding-description' }, ...children);
  const nextLabel = () => pick(language, 'Dalej →', 'Next →');

  async function changeLanguage(next) {
    if (busy || destroyed || !['pl', 'en'].includes(next) || next === language) return;
    setBusy(true);
    try {
      if (await onLanguageChange(next) === false) throw new Error('onboarding-language-rejected');
      if (destroyed) return;
      language = next;
      await render('[data-onboarding-language]');
    } catch (error) {
      if (!destroyed) {
        // A cloud write may fail after the language preference changed. Keep
        // this modal consistent with the actual interface while recovery is
        // pending, without pretending that the cloud confirmed the choice.
        const actualLanguage = options.getLanguage?.();
        if (['pl', 'en'].includes(actualLanguage) && actualLanguage !== language) {
          language = actualLanguage;
          await render('[data-onboarding-language]');
        } else {
          const select = card.querySelector('[data-onboarding-language]');
          if (select) select.value = language;
        }
        onError(error);
        showError(pick(language, 'Nie udało się zapisać wybranego języka. Sprawdź połączenie i spróbuj ponownie.', 'The language could not be confirmed. Check your connection and try again.'));
      }
    } finally { if (!destroyed) setBusy(false); }
  }
  const languagePicker = () => node('div', { class: 'island-onboarding-language' },
    node('label', { for: 'island-onboarding-language' }, 'Język / Language'),
    node('select', { id: 'island-onboarding-language', 'data-onboarding-language': '', name: 'language', onchange: event => { void changeLanguage(event.target.value); } },
      node('option', { value: 'pl', selected: language === 'pl' }, 'Polski'),
      node('option', { value: 'en', selected: language === 'en' }, 'English')));

  async function render(focusSelector) {
    const thisGeneration = ++generation;
    target = null; resizeObserver?.disconnect(); highlight.hidden = true; cursor.hidden = true;
    root.dataset.onboardingStage = current.stage;
    root.dataset.onboardingStep = current.stage === 'tour' ? steps[current.index]?.id || '' : '';
    card.style.removeProperty('left'); card.style.removeProperty('top'); card.classList.toggle('is-tour', current.stage === 'tour');
    card.replaceChildren();
    if (current.stage === 'intro') {
      card.append(node('small', { class: 'island-onboarding-eyebrow' }, 'HARBORLIGHT'), languagePicker(), title(pick(language, 'Twoja wyspa, Twoje decyzje', 'Your island, your decisions')),
        description(node('p', {}, pick(language,
          'Obejmujesz opiekę nad małą osadą na wyspie. Zapewnij mieszkańcom domy, żywność i pracę, a z czasem rozbuduj ją w tętniący życiem port.',
          'You take care of a small island settlement. Give your residents homes, food and jobs, then grow it into a thriving harbour.')),
        node('p', {}, pick(language,
          'Celem gry jest rozwój i dbanie o dobrostan mieszkańców. Daj mieszkańcom pracę i zadbaj o to, by wyprodukowane materiały trafiały do magazynu. Im szczęśliwsi są mieszkańcy, tym chętniej na wyspę przybywają nowe osoby.',
          'Your goal is to develop the island and care for its residents. Give them jobs and make sure the materials they produce reach the warehouse. The happier your residents are, the more readily new settlers arrive.'))), paused(),
        node('div', { class: 'island-onboarding-actions' }, control(nextLabel(), () => commit({ ...current, stage: 'name' }), { 'data-onboarding-next': '' })));
    } else if (current.stage === 'name') {
      const input = node('input', { id: 'island-onboarding-name', 'data-onboarding-name': '', name: 'islandName', type: 'text', autocomplete: 'off', minlength: 3, maxlength: 40, required: true, value: nameDraft, 'aria-describedby': 'island-onboarding-name-hint', spellcheck: 'false' });
      const form = node('form', { 'data-onboarding-name-form': '', novalidate: true, onsubmit: event => {
        event.preventDefault();
        const result = validateIslandName(input.value);
        if (!result.ok) {
          input.setAttribute('aria-invalid', 'true');
          showError(result.reason === 'profanity' ? pick(language, 'Ta nazwa zawiera niedozwolone słowo. Wybierz nazwę bez wulgaryzmów w języku polskim i angielskim.', 'This name contains a prohibited word. Choose a name without Polish or English profanity.') : result.reason === 'characters' ? pick(language, 'Wpisz nazwę w jednym wierszu. Pomiń nawiasy < > i niewidoczne znaki, np. tabulatory.', 'Use a single line without control characters or < > brackets.') : pick(language, 'Wpisz nazwę mającą od 3 do 40 znaków.', 'Choose a name of 3–40 characters.'));
          input.focus(); return;
        }
        input.removeAttribute('aria-invalid'); void commit({ stage: 'tour', index: 0, islandName: result.name });
      } });
      input.addEventListener('input', () => { nameDraft = input.value; input.removeAttribute('aria-invalid'); });
      form.append(node('label', { for: 'island-onboarding-name' }, pick(language, 'Nazwa Twojej wyspy', 'Your island’s name')), input,
        node('small', { id: 'island-onboarding-name-hint' }, pick(language, 'Od 3 do 40 znaków, bez polskich i angielskich wulgaryzmów. Nazwa będzie widoczna w lewym górnym rogu gry.', 'Use 3–40 characters without Polish or English profanity. The name appears in the top left corner of the game.')), paused(),
        node('div', { class: 'island-onboarding-actions' }, control(pick(language, '← Wstecz', '← Back'), () => commit({ ...current, stage: 'intro' }), { 'data-onboarding-previous': '', class: 'island-onboarding-action secondary' }),
          node('button', { type: 'submit', class: 'island-onboarding-action', 'data-onboarding-next': '' }, nextLabel())));
      card.append(node('small', { class: 'island-onboarding-eyebrow' }, 'HARBORLIGHT'), title(pick(language, 'Nadaj nazwę swojej wyspie', 'Give your island a name')), description(node('p', {}, pick(language, 'To początek Twojej osady. Wybierz nazwę, z którą chcesz wyruszyć w tę przygodę.', 'This is the beginning of your settlement. Choose a name to start this adventure with.'))), languagePicker(), form);
    } else if (current.stage === 'tour') {
      current.index = clamp(current.index, 0, Math.max(0, steps.length - 1));
      const step = steps[current.index];
      const last = current.index >= steps.length - 1;
      card.append(control('×', () => finish(true), { class: 'island-onboarding-exit', 'data-onboarding-exit': '', 'aria-label': replay ? pick(language, 'Zamknij oprowadzanie', 'Close the tour') : pick(language, 'Zakończ oprowadzanie i rozpocznij grę', 'Close the tour and start playing') }),
        node('small', { class: 'island-onboarding-eyebrow', 'data-onboarding-counter': '' }, pick(language, `Poznaj wyspę · ${current.index + 1} z ${steps.length}`, `Explore your island · ${current.index + 1} of ${steps.length}`)),
        title(valueFor(step?.title, language)), description(node('p', {}, valueFor(step?.text, language))), paused(),
        node('div', { class: 'island-onboarding-actions' }, control(pick(language, '← Wstecz', '← Back'), () => commit({ ...current, index: current.index - 1 }), { 'data-onboarding-previous': '', 'data-onboarding-first': String(current.index === 0), disabled: current.index === 0, class: 'island-onboarding-action secondary' }),
          control(last ? replay ? pick(language, 'Wróć do gry →', 'Return to game →') : pick(language, 'Rozpocznij grę →', 'Start playing →') : nextLabel(), () => last ? finish(false) : commit({ ...current, index: current.index + 1 }), { 'data-onboarding-next': '' })));
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
      (focusSelector && card.querySelector(focusSelector) || card.querySelector('[data-onboarding-name]') || card).focus({ preventScroll: true });
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
    async update(next) {
      if (!destroyed && !busy) {
        if (next.islandName != null && next.islandName !== current.islandName) nameDraft = next.islandName;
        if (['pl', 'en'].includes(next.language)) language = next.language;
        current = { ...current, ...next }; await render();
      }
    },
    destroy,
    get active() { return active && !destroyed; }
  };
}
