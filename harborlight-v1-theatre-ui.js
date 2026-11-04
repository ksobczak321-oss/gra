import { THEATRE_DECORATIONS, THEATRE_STYLES, theatreStatus, theatreQuote, theatreDecorationName, THEATRE_LIGHTING, THEATRE_PAVING, THEATRE_TRANSLATIONS, THEATRE_GARDEN_BOUNDS, THEATRE_WELCOME_GARDEN, theatrePosition } from './harborlight-v1-theatre.js?v=frontend-v31';
import { renderTheatreScene, theatreIconSvg, THEATRE_SLOT_POSITIONS, theatrePerspectiveScale } from './harborlight-v1-theatre-art.js?v=frontend-v31';
import { ATTRACTIONS } from './harborlight-v1-leisure.js?v=frontend-v31';

const CITY_NAMES = {
  'flower-beds': 'Rabaty kwiatowe', 'village-benches': 'Ławki w osadzie', 'lantern-strings': 'Girlandy świetlne',
  'harbor-flags': 'Flagi portowe', 'village-fountain': 'Fontanna w osadzie', 'garden-pond': 'Oczko wodne',
  'wooden-sculptures': 'Drewniane rzeźby', 'seaside-mural': 'Nadmorski mural', 'lighthouse-garden': 'Ogród Latarni',
  'ornamental-sails': 'Ozdobne żagle', 'travelling-circus': 'Wędrowny cyrk', 'theatre-troupe': 'Wędrowny teatr',
  'folk-concert': 'Koncert ludowy', 'puppet-show': 'Teatrzyk kukiełkowy', 'harvest-festival': 'Święto plonów',
  'fishing-contest': 'Zawody wędkarskie', 'storytelling-evening': 'Wieczór opowieści', 'village-dance': 'Zabawa taneczna',
  'fireworks-night': 'Noc fajerwerków', 'harbor-fair': 'Jarmark portowy'
};
const CITY_ICON = { flowers: 'flowerbed', bench: 'bench', lantern: 'lantern', flag: 'gateway', fountain: 'fountain', pond: 'fountain',
  sculpture: 'statue', mural: 'mosaic', garden: 'flowerbed', sails: 'gateway' };

const node = (tag, attrs = {}, ...children) => {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) element.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) element.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) if (child != null) element.append(typeof child === 'object' ? child : document.createTextNode(String(child)));
  return element;
};
const svgNode = markup => { const holder = node('span', { class: 'theatre-art' }); holder.innerHTML = markup; return holder; };
function styles() {
  for (const [id, file] of [['harborlight-theatre-css', 'harborlight-v1-theatre.css'], ['harborlight-theatre-scene-css', 'harborlight-v1-theatre-scene.css']]) {
    if (!document.getElementById(id)) document.head.append(node('link', { id, rel: 'stylesheet', href: new URL(`./${file}?v=frontend-v31`, import.meta.url).href }));
  }
}

/** The studio only presents and dispatches commands. Ownership, saved layouts,
 * prices and advertisement receipts remain in the shared game model. */
export function createTheatrePanel({ state, perform = () => false, requestRewardedAd,
  onChange, onOpenAttractions, language: requestedLanguage, noAds = false, persistence = 'preview', getSaveStatus } = {}) {
  styles();
  const language = ['en', 'pl'].includes(requestedLanguage) ? requestedLanguage : state?.settings?.language === 'en' ? 'en' : 'pl';
  const t = (pl, en) => language === 'en' ? en : pl;
  const count = value => Math.floor(value || 0).toLocaleString(language === 'en' ? 'en-GB' : 'pl-PL');
  const root = node('section', { class: 'theatre-panel', 'data-theatre-panel': '', 'data-i18n-ignore': '', lang: language });
  const context = () => ({ noAds: typeof noAds === 'function' ? !!noAds() : !!noAds });
  const modelKey = () => JSON.stringify([state.theatre, context().noAds]);
  let selectedSlot = 0, selectedKind = 'fountain', selectedItemId = null, chosenStyle = 'coastal', movingId = null;
  let selectedPoint = { x: 270, y: 310 }, dragging = null, suppressClick = false, touchPlacement = null, ignoredTouchClickUntil = 0;
  let busy = false, alive = true, editing = true, zoomed = false, collectionLimit = 40, inspiration = null;
  let noticeText = '', noticeError = false, lastModelKey = '', awaitingAd = null, revealTimer = 0;
  const selected = () => state.theatre?.collection?.find(item => item.id === selectedItemId) || null;
  const say = (message, error = false) => { noticeText = message; noticeError = error; };
  const button = (label, callback, attrs = {}) => node('button', { type: 'button', disabled: busy, ...attrs, onclick: callback }, label);
  const errorText = result => ({
    'not-enough-coins': t('Brakuje monet. Możesz wrócić do tego pomysłu później.', 'Not enough coins. You can return to this idea later.'),
    'ad-required': t('Ten poziom wymaga monet i obejrzenia całej reklamy.', 'This level needs coins and a completed advertisement.'),
    'ad-unverified': t('Nie otrzymano potwierdzenia reklamy. Dekoracja i monety pozostały bez zmian.', 'The advertisement was not confirmed. Your decoration and coins are unchanged.'),
    'ad-expired': t('Ta próba już wygasła. Wybierz ulepszenie ponownie.', 'This attempt expired. Select the improvement again.'),
    'slot-occupied': t('To miejsce jest zajęte. Wybierz inne lub zamień dekoracje miejscami.', 'This place is occupied. Choose another one or swap the decorations.'),
    'price-out-of-range': t('Dalsze ulepszenie jest obecnie zbyt kosztowne. Twoje monety i dekoracja pozostają bez zmian.', 'The next improvement is currently too expensive. Your coins and decoration are unchanged.'),
    'level-out-of-range': t('Nie można teraz zapisać kolejnego poziomu. Twoja dekoracja pozostaje bez zmian.', 'The next level cannot be saved right now. Your decoration is unchanged.')
  }[result?.code] || (language === 'pl' ? THEATRE_TRANSLATIONS[result?.message] : result?.message) || t('Nie udało się wykonać tej czynności. Spróbuj ponownie.', 'The action could not be completed. Please try again.'));

  function focusToken() {
    const focused = document.activeElement;
    if (!root.contains(focused)) return null;
    const key = [...focused.attributes].find(attribute => attribute.name.startsWith('data-theatre-'));
    return key ? [key.name, key.value] : null;
  }
  function restoreFocus(token) {
    if (!token) return;
    const target = [...root.querySelectorAll(`[${token[0]}]`)].find(element => element.getAttribute(token[0]) === token[1]);
    if (target && !target.disabled && !target.hidden) target.focus({ preventScroll: true });
  }
  async function command(action, success = '') {
    if (busy || !alive) return false;
    busy = true; refreshBalances();
    try {
      const result = await perform(action);
      if (result === false || result?.ok === false) { say(errorText(result), true); return result; }
      if (success) say(success);
      onChange?.(result);
      return result ?? { ok: true };
    } catch (_error) {
      say(t('Nie udało się zapisać zmiany. Spróbuj ponownie.', 'The change could not be saved. Please try again.'), true);
      return false;
    } finally {
      busy = false;
      if (alive) render();
    }
  }
  function saveState() {
    if (persistence !== 'cloud') return { status: 'preview', text: t('Podgląd DEV: ogród działa w pamięci. Odświeżenie rozpocznie nową sesję.', 'DEV preview: your garden runs in memory. Refreshing starts a new session.') };
    const status = typeof getSaveStatus === 'function' ? getSaveStatus() : 'pending';
    if (status === 'saved') return { status, text: t('Ogród zapisany w chmurze. Wrócisz do niego po następnym zalogowaniu.', 'Your garden is saved to the cloud. It will be here when you next sign in.') };
    if (['pending', 'saving', 'loading'].includes(status)) return { status, text: t('Zapisujemy zmiany w tle…', 'Saving your changes in the background…') };
    if (status === 'auth-required') return { status, text: t('Zapis wymaga ponownego zalogowania.', 'Sign in again to continue saving.') };
    return { status: 'offline', text: t('Zapis czeka na połączenie z chmurą. Sprawdź stan zapisu przed wyjściem.', 'Saving is waiting for the cloud connection. Check the save status before leaving.') };
  }
  function refreshSaveStatus() {
    const target = root.querySelector('[data-theatre-save-status]');
    if (!target) return;
    const saved = saveState();
    if (target.textContent !== saved.text) target.textContent = saved.text;
    target.dataset.saveStatus = saved.status;
  }
  function refreshAdNotice() {
    if (!awaitingAd) return;
    const item = state.theatre?.collection?.find(entry => entry.id === awaitingAd.id);
    if (item && item.level >= awaitingAd.targetLevel) {
      say(t('Nowy poziom już zdobi Twój ogród!', 'The new level is now part of your garden!')); awaitingAd = null;
    } else if (state.theatre?.pendingUpgrade?.nonce !== awaitingAd.nonce) {
      say(t('Reklama została przerwana. Nie pobrano monet.', 'The advertisement was interrupted. No coins were spent.')); awaitingAd = null;
    }
  }
  async function improve(item) {
    const quote = theatreQuote(state, { id: item.id }, context());
    if (!quote.ok || !quote.affordable) { say(errorText(quote.ok ? { code: 'not-enough-coins' } : quote), true); render(); return; }
    if (!quote.requiresAd) {
      const result = await command({ type: 'theatreUpgrade', id: item.id }, t('Drobna zmiana, piękny efekt. Dekoracja ma już nowy poziom.', 'A small change, a lovely result. Your decoration has a new level.'));
      if (result && result.ok !== false) reveal(item.slot);
      return;
    }
    const result = await command({ type: 'theatreBeginUpgradeAd', id: item.id });
    if (!result || result.ok === false) return;
    const nonce = result.nonce || state.theatre?.pendingUpgrade?.nonce;
    if (!nonce || typeof requestRewardedAd !== 'function') {
      if (nonce) await command({ type: 'theatreCancelUpgradeAd', nonce });
      say(t('Reklama nie jest teraz dostępna. Nie pobrano monet.', 'The advertisement is unavailable right now. No coins were spent.'), true); render(); return;
    }
    awaitingAd = { nonce, id: item.id, targetLevel: quote.targetLevel };
    say(t('Ulepszenie czeka na ukończenie reklamy. Monety są nadal Twoje.', 'The improvement is waiting for the advertisement to finish. Your coins are still yours.'));
    render();
    try {
      const completion = await requestRewardedAd({ purpose: 'theatre', nonce, id: item.id, quote });
      if (completion === false || completion?.ok === false) say(t('Reklama została pominięta. Nie pobrano monet.', 'Advertisement skipped. No coins were spent.'));
      refreshAdNotice();
    } catch (_error) { say(t('Reklama nie została ukończona. Nie pobrano monet.', 'The advertisement was not completed. No coins were spent.'), true); }
    if (alive) render();
  }
  function revealArea(selector) {
    root.querySelector(selector)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }
  function reveal(slot) {
    if (slot == null || !alive) return;
    const item = root.querySelector(`[data-theatre-scene-slot="${slot}"]`);
    item?.classList.add('theatre-reveal');
    clearTimeout(revealTimer);
    revealTimer = setTimeout(() => item?.classList.remove('theatre-reveal'), 700);
  }
  const freeSlot = () => Array.from({ length: 20 }, (_, index) => index).find(slot => !state.theatre?.collection?.some(entry => entry.slot === slot));
  function chooseKind(kind, style = chosenStyle) {
    editing = true; selectedKind = kind; selectedItemId = null; movingId = null; chosenStyle = style;
    if (state.theatre?.collection?.some(entry => entry.slot === selectedSlot)) selectedSlot = freeSlot() ?? selectedSlot;
    render();
  }
  const clampPoint = point => ({ x: Math.max(THEATRE_GARDEN_BOUNDS.left, Math.min(THEATRE_GARDEN_BOUNDS.right, point.x)),
    y: Math.max(THEATRE_GARDEN_BOUNDS.top, Math.min(THEATRE_GARDEN_BOUNDS.bottom, point.y)) });
  function pointAt(event, plane) {
    const rect = plane.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * 1000, y: (event.clientY - rect.top) / rect.height * 700 };
  }
  async function choosePoint(point, slot) {
    if (!editing || busy || suppressClick) return;
    if (point.y < THEATRE_GARDEN_BOUNDS.top || point.y > THEATRE_GARDEN_BOUNDS.bottom || point.x < THEATRE_GARDEN_BOUNDS.left || point.x > THEATRE_GARDEN_BOUNDS.right) return;
    selectedPoint = clampPoint(point);
    if (movingId) {
      const id = movingId;
      const result = await command({ type: 'theatrePlace', id, ...selectedPoint, ...(Number.isInteger(slot) ? { slot } : {}) }, t('Ozdoba stoi dokładnie tam, gdzie ją ustawisz.', 'Your ornament is exactly where you placed it.'));
      if (result === false || result?.ok === false) return;
      selectedItemId = id; selectedSlot = selected()?.slot ?? selectedSlot; movingId = null;
    } else { selectedItemId = null; if (Number.isInteger(slot)) selectedSlot = slot; }
    render();
  }
  async function chooseSlot(slot, point) {
    if (!editing || busy) return;
    const placed = state.theatre?.collection?.find(entry => entry.slot === slot);
    if (movingId) {
      const id = movingId;
      const result = await command({ type: 'theatrePlace', id, slot, ...(point || theatrePosition(state, placed) || THEATRE_SLOT_POSITIONS[slot]) }, t('Gotowe. Przymierzaj kolejne układy bez opłat.', 'Done. Try another arrangement whenever you like, free of charge.'));
      if (result === false || result?.ok === false) return;
      selectedItemId = id; movingId = null;
    } else { selectedItemId = placed?.id || null; chosenStyle = placed?.style || chosenStyle; }
    selectedPoint = theatrePosition(state, selected()) || point || THEATRE_SLOT_POSITIONS[slot];
    selectedSlot = slot; render();
  }
  function keySlot(event, slot) {
    const key = event.key;
    if (movingId && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
      event.preventDefault(); event.stopPropagation();
      const item = state.theatre.collection.find(entry => entry.id === movingId);
      if (!item) return;
      const point = theatrePosition(state, item) || selectedPoint, step = event.shiftKey ? 15 : 3;
      selectedPoint = clampPoint({ x: point.x + (key === 'ArrowRight' ? step : key === 'ArrowLeft' ? -step : 0),
        y: point.y + (key === 'ArrowDown' ? step : key === 'ArrowUp' ? -step : 0) });
      command({ type: 'theatreMove', id: item.id, ...selectedPoint }, t('Ustawienie poprawione. Strzałki przesuwają ozdobę małymi krokami.', 'Position adjusted. Arrow keys move the ornament in small steps.'));
      return;
    }
    const columns = THEATRE_SLOT_POSITIONS.filter(position => position.y === THEATRE_SLOT_POSITIONS[0].y).length || 4;
    let next = slot;
    if (key === 'ArrowLeft') next = slot % columns ? slot - 1 : slot;
    else if (key === 'ArrowRight') next = slot % columns < columns - 1 ? Math.min(19, slot + 1) : slot;
    else if (key === 'ArrowUp') next = slot >= columns ? slot - columns : slot;
    else if (key === 'ArrowDown') next = slot + columns <= 19 ? slot + columns : slot;
    else if (key === 'Home') next = 0;
    else if (key === 'End') next = 19;
    else if (key === 'Escape' && movingId) { event.preventDefault(); event.stopPropagation(); movingId = null; render(); return; }
    else return;
    event.preventDefault();
    selectedSlot = next;
    const item = state.theatre?.collection?.find(entry => entry.slot === next);
    if (!movingId) { selectedItemId = item?.id || null; chosenStyle = item?.style || chosenStyle; }
    render();
    const target = root.querySelector(`[data-theatre-slot="${next}"]`);
    target?.focus({ preventScroll: true }); if (zoomed) target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function atmosphereControl(label, field, values, current) {
    return node('label', { class: 'theatre-environment-field' }, node('span', {}, label), node('select', {
      'aria-label': label, [`data-theatre-${field}`]: '', onchange: event => command({ type: 'theatreSetAtmosphere', [field]: event.target.value })
    }, ...values.map(value => node('option', { value: value.id, selected: current === value.id }, language === 'en' ? value.name : value.namePl))));
  }
  function savedScene(layout, index) {
    const planned = new Map(layout.placements.map(item => [item.id, item]));
    const view = { ...state, theatre: { ...state.theatre, atmosphere: layout.atmosphere, positions: layout.positions,
      collection: state.theatre.collection.map(item => ({ ...item, slot: planned.get(item.id)?.slot ?? null, style: planned.get(item.id)?.style || item.style })) } };
    return svgNode(renderTheatreScene(view, { editing: false, language, prefix: `theatre-layout-${index}` }));
  }
  function renderLayouts(status) {
    const section = node('section', { class: 'theatre-layouts', 'data-theatre-layouts': '' }, node('div', { class: 'theatre-section-heading' },
      node('div', {}, node('h4', {}, t('Zachowaj swoje pomysły', 'Keep your favourite ideas')), node('p', {}, t('Trzy miejsca na różne nastroje. Zapis i powrót do układu są bezpłatne.', 'Three places for different moods. Saving and restoring layouts is free.')))));
    const list = node('div', { class: 'theatre-layout-list' });
    for (let index = 0; index < 3; index++) {
      const layout = status.layouts?.[index] || null;
      const title = `${t('Pomysł', 'Idea')} ${index + 1}`;
      const card = node('article', { class: `theatre-layout-card${layout ? ' is-saved' : ''}` },
        node('div', { class: 'theatre-layout-picture', 'aria-hidden': 'true' }, layout ? savedScene(layout, index) : node('span', {}, '+')),
        node('div', { class: 'theatre-layout-caption' }, node('strong', {}, title), node('small', {}, layout ? `${t('Dekoracje', 'Decorations')}: ${layout.placementCount ?? layout.placements.length}` : t('Miejsce na Twój kolejny projekt', 'Room for your next design'))),
        node('div', { class: 'theatre-layout-actions' },
          button(layout ? t('Zastąp', 'Replace') : t('Zapisz', 'Save'), () => command({ type: 'theatreSaveLayout', slot: index }, t('Pomysł zapisany. Możesz śmiało eksperymentować dalej.', 'Idea saved. You can keep experimenting.')), { 'data-theatre-save-layout': index }),
          button(t('Przywróć', 'Restore'), async () => { const result = await command({ type: 'theatreRestoreLayout', slot: index }, t('Twój pomysł znów ożył.', 'Your idea has come to life again.')); if (result && result.ok !== false) revealArea('.theatre-canvas'); }, { disabled: busy || !layout, 'data-theatre-restore-layout': index }),
          button('×', () => command({ type: 'theatreDeleteLayout', slot: index }, t('Zwolniono miejsce na nowy pomysł.', 'There is room for another idea.')), { class: 'theatre-icon-button', disabled: busy || !layout, 'aria-label': `${t('Usuń zapis', 'Delete saved')} ${title}`, 'data-theatre-delete-layout': index })));
      list.append(card);
    }
    section.append(list); return section;
  }
  function renderInspiration() {
    const options = [
      { id: 'oasis', title: t('Zielona oaza', 'A green oasis'), text: t('Dużo zieleni, trochę wody i spokojne miejsce na rozmowę.', 'Leafy corners, a little water and a quiet place to talk.'), kind: 'tree', style: 'garden', lighting: 'day', paving: 'sandstone' },
      { id: 'evening', title: t('Wieczór nad morzem', 'An evening by the sea'), text: t('Ciepłe światła, ławki i szum fontanny po zmroku.', 'Warm lights, benches and a fountain after dusk.'), kind: 'lantern', style: 'coastal', lighting: 'night', paving: 'stone' },
      { id: 'marble', title: t('Śródziemnomorska elegancja', 'Mediterranean elegance'), text: t('Jasny kamień, kolumny i złota godzina.', 'Pale stone, columns and the golden hour.'), kind: 'column', style: 'marble', lighting: 'golden', paving: 'sandstone' },
      { id: 'pirate', title: t('Piracka przystań', 'A pirate hideaway'), text: t('Brama, mocne akcenty i własna opowieść o wyspie.', 'A gateway, bold details and your own island story.'), kind: 'gateway', style: 'pirate', lighting: 'golden', paving: 'brick' }
    ];
    const section = node('details', { class: 'theatre-inspirations' }, node('summary', {}, t('Masz ochotę na inspirację?', 'Would you like an idea?')),
      node('p', {}, t('To podpowiedzi, nie zadania. Nie ma jednego poprawnego ogrodu — połącz je albo wymyśl coś swojego.', 'These are ideas, not tasks. There is no single right garden: mix them or invent your own.')));
    const grid = node('div', { class: 'theatre-inspiration-grid' });
    for (const idea of options) grid.append(button(node('span', {}, svgNode(theatreIconSvg(idea.kind, 12, idea.style)), node('strong', {}, idea.title), node('small', {}, idea.text)), async () => {
      inspiration = idea.id;
      await command({ type: 'theatreSetAtmosphere', lighting: idea.lighting, paving: idea.paving });
      chooseKind(idea.kind, idea.style);
      say(t('Wybrany nastrój jest tylko początkiem. Dekoracje kupujesz osobno, a układ zależy od Ciebie.', 'This mood is only a starting point. Decorations are purchased separately, and the arrangement is yours.')); render(); revealArea('.theatre-canvas');
    }, { class: 'theatre-inspiration-card', 'aria-pressed': String(inspiration === idea.id), 'data-theatre-inspiration': idea.id }));
    section.append(grid); return section;
  }
  function renderCity() {
    const city = node('details', { class: 'theatre-city', 'data-theatre-city-attractions': '' }, node('summary', {}, t('Życie wokół Teatru', 'Life around the Theatre')),
      node('p', { class: 'theatre-muted' }, t('Koncerty, przedstawienia i spotkania dają mieszkańcom czas na odpoczynek. Tutaj widzisz także dzisiejsze atrakcje wyspy.', 'Concerts, performances and gatherings give residents time to rest. See today’s island attractions here too.')));
    const effects = (state.leisure?.effects || []).filter(effect => effect.remaining > 0);
    const ids = [...new Set([...effects.map(effect => effect.attractionId), ...(state.leisure?.offers || []).map(offer => offer.id)])];
    const gallery = node('div', { class: 'theatre-city-gallery' });
    for (const id of ids) {
      const attraction = ATTRACTIONS.find(entry => entry.id === id); if (!attraction) continue;
      const effect = effects.find(entry => entry.attractionId === id);
      gallery.append(node('div', { class: 'theatre-city-card' }, svgNode(theatreIconSvg(CITY_ICON[attraction.icon] || 'gateway', effect ? 10 : 1, 'coastal')),
        node('strong', {}, language === 'en' ? attraction.name : CITY_NAMES[id] || attraction.name),
        node('span', {}, effect ? `${t('Trwa jeszcze', 'Active for')} ${Math.ceil(effect.remaining / 60)} min` : t('W dzisiejszych atrakcjach', 'In today’s attractions'))));
    }
    city.append(ids.length ? gallery : node('p', { class: 'theatre-muted' }, t('Aktualne wydarzenia znajdziesz w dekoracjach i atrakcjach wyspy.', 'Find current events in the island’s decorations and attractions.')));
    if (typeof onOpenAttractions === 'function') city.append(button(t('Zobacz dekoracje i atrakcje', 'View decorations and attractions'), onOpenAttractions, { 'data-theatre-open-attractions': '' }));
    return city;
  }
  function attachPointerPlacement(plane, hitboxes) {
    plane.addEventListener('click', event => {
      if (suppressClick || event.pointerType === 'touch' && performance.now() < ignoredTouchClickUntil) { event.preventDefault(); event.stopPropagation(); return; }
      const hit = event.target.closest?.('[data-theatre-slot]');
      if (hit) return;
      choosePoint(pointAt(event, plane));
    });
    plane.addEventListener('pointerdown', event => {
      if (!editing || busy || event.button !== 0) return;
      if (movingId && event.pointerType === 'touch') {
        // A synthesized mobile click may be shifted to a nearby button by the
        // browser's tap-target adjustment. Commit the actual pointer coordinate.
        touchPlacement = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
        plane.setPointerCapture?.(event.pointerId); event.preventDefault(); return;
      }
      const hit = event.target.closest?.('[data-theatre-item]');
      if (!hit) return;
      const item = state.theatre.collection.find(entry => entry.id === hit.dataset.theatreItem);
      if (!item || movingId && movingId !== item.id) return;
      const point = theatrePosition(state, item), cursor = pointAt(event, plane);
      selectedItemId = item.id; selectedSlot = item.slot; chosenStyle = item.style; selectedPoint = point;
      dragging = { id: item.id, slot: item.slot, pointerId: event.pointerId, hit, x: event.clientX, y: event.clientY,
        dx: point.x - cursor.x, dy: point.y - cursor.y, point, moved: false };
      hit.setPointerCapture?.(event.pointerId);
    });
    plane.addEventListener('pointermove', event => {
      if (!dragging || event.pointerId !== dragging.pointerId) return;
      if (!dragging.moved && Math.hypot(event.clientX - dragging.x, event.clientY - dragging.y) < 4) return;
      dragging.moved = true;
      event.preventDefault();
      const cursor = pointAt(event, plane), point = clampPoint({ x: cursor.x + dragging.dx, y: cursor.y + dragging.dy });
      dragging.point = point;
      plane.classList.add('is-dragging');
      const art = plane.querySelector(`[data-theatre-scene-slot="${dragging.slot}"]`);
      art?.setAttribute('transform', `translate(${point.x},${point.y}) scale(${theatrePerspectiveScale(point.y)})`);
      if (art?.nextElementSibling) art.parentElement.append(art);
      dragging.hit.style.left = `${point.x / 10}%`; dragging.hit.style.top = `${point.y / 7}%`;
      dragging.hit.style.zIndex = String(Math.round(point.y));
    });
    plane.addEventListener('pointerup', event => {
      if (touchPlacement && event.pointerId === touchPlacement.pointerId) {
        const tap = touchPlacement; touchPlacement = null; ignoredTouchClickUntil = performance.now() + 600;
        event.preventDefault();
        if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 12) choosePoint(pointAt(event, plane));
        return;
      }
      if (!dragging || event.pointerId !== dragging.pointerId) return;
      const drop = dragging;
      dragging = null; plane.classList.remove('is-dragging');
      if (!drop.moved) {
        if (event.pointerType === 'touch') { ignoredTouchClickUntil = performance.now() + 600; event.preventDefault(); chooseSlot(drop.slot, clampPoint(pointAt(event, plane))); }
        return;
      }
      event.preventDefault();
      suppressClick = true;
      if (event.pointerType === 'touch') ignoredTouchClickUntil = performance.now() + 600;
      setTimeout(() => { suppressClick = false; }, 0);
      selectedPoint = drop.point; selectedItemId = drop.id; selectedSlot = drop.slot; movingId = null;
      command({ type: 'theatreMove', id: drop.id, ...drop.point }, t('Gotowe — możesz dalej poprawiać swój ogród.', 'Done — keep shaping your garden however you like.'));
    });
    plane.addEventListener('pointercancel', () => {
      touchPlacement = null;
      if (!dragging) return;
      dragging = null; render();
    });
  }
  function render() {
    if (!alive || dragging) return;
    refreshAdNotice();
    const focus = focusToken(), oldCanvas = root.querySelector('.theatre-canvas');
    const scroll = { left: oldCanvas?.scrollLeft || 0, top: oldCanvas?.scrollTop || 0 };
    const status = theatreStatus(state, context()), item = selected();
    if (!Number.isInteger(selectedSlot) || selectedSlot < 0 || selectedSlot > 19) selectedSlot = 0;
    const occupied = status.collection.find(entry => entry.slot === selectedSlot);
    const preview = editing && !item && status.freeSlots > 0 ? { type: selectedKind, level: 1, style: chosenStyle, slot: freeSlot(), position: selectedPoint } : null;
    const atmosphere = status.atmosphere || { lighting: 'day', paving: 'sandstone' };
    root.dataset.theatreEditing = String(editing);
    const header = node('header', { class: 'theatre-intro' }, node('div', {}, node('p', { class: 'theatre-eyebrow' }, t('MAŁE MIEJSCE. WIELKA WYOBRAŹNIA.', 'A LITTLE PLACE. A BIG IMAGINATION.')),
      node('h3', {}, t('Twój ogród przy Teatrze', 'Your Theatre garden')),
      node('p', {}, t('Stwórz zakątek, do którego chce się wracać. Łącz style, przestawiaj ozdoby i zachowuj ulubione pomysły.', 'Create a place you love returning to. Mix styles, move ornaments and keep your favourite ideas.'))),
      node('div', { class: 'theatre-balance' }, node('span', {}, t('Twoje monety', 'Your coins')), node('strong', { 'data-theatre-balance': '' }, count(state.resources?.coins))));
    const toolbar = node('div', { class: 'theatre-studio-toolbar' }, node('div', { class: 'theatre-toolbar-caption' }, node('span', { class: 'theatre-live-dot', 'aria-hidden': 'true' }), node('strong', {}, editing ? t('Pracownia ogrodu', 'Garden studio') : t('Chwila dla Twojego ogrodu', 'A moment for your garden'))),
      node('div', { class: 'theatre-view-tools' }, button(editing ? t('Podziwiaj ogród', 'Admire the garden') : t('Wróć do aranżowania', 'Return to arranging'), () => { editing = !editing; movingId = null; render(); }, { class: editing ? '' : 'primary', 'data-theatre-view-mode': '', 'aria-pressed': String(!editing) }),
        button(zoomed ? t('Cały plac', 'Whole courtyard') : t('Powiększ plac', 'Explore closer'), () => {
          zoomed = !zoomed; render();
          if (zoomed) requestAnimationFrame(() => { const canvas = root.querySelector('.theatre-canvas'); if (canvas) canvas.scrollTo({ left: (canvas.scrollWidth - canvas.clientWidth) / 2, top: (canvas.scrollHeight - canvas.clientHeight) * .7 }); });
        }, { 'data-theatre-zoom': '', 'aria-pressed': String(zoomed) })));
    const canvas = node('div', { class: `theatre-canvas${movingId ? ' theatre-moving' : ''}${zoomed ? ' is-zoomed' : ''}`, 'data-theatre-canvas': '', tabindex: '0', 'aria-label': t('Ogród Teatru. Wybierz miejsce lub powiększ plac, aby obejrzeć szczegóły.', 'The Theatre garden. Choose a place or explore closer to see details.') });
    const welcomeView = status.welcomeGardenAvailable ? { ...state, theatre: { ...state.theatre,
      collection: THEATRE_WELCOME_GARDEN.map((entry,index) => ({ ...entry, id: `welcome-${index}`, level: 1 })) } } : state;
    const plane = node('div', { class: 'theatre-scene-plane' }, svgNode(renderTheatreScene(welcomeView, { editing, selectedSlot: editing ? selectedSlot : null, preview: status.welcomeGardenAvailable ? null : preview, language, prefix: 'theatre-editor' })));
    const hitboxes = node('div', { class: 'theatre-slot-layer', hidden: !editing, 'aria-label': t('Swobodne rozmieszczanie maksymalnie dwudziestu dekoracji', 'Freely arrange up to twenty decorations') });
    for (const legacyPosition of THEATRE_SLOT_POSITIONS) {
      const object = status.collection.find(entry => entry.slot === legacyPosition.slot);
      const position = { ...legacyPosition, ...(theatrePosition(state, object) || {}) };
      const label = object ? `${theatreDecorationName(object.type, language)}, ${t('poziom', 'level')} ${object.level}. ${t('Przeciągnij lub wybierz Przenieś.', 'Drag it, or choose Move.')}` : `${t('Podpowiedź ustawienia', 'Suggested position')} ${position.slot + 1}`;
      const width = object ? 130 * theatrePerspectiveScale(position.y) : 35, height = object ? 145 * theatrePerspectiveScale(position.y) : 30;
      hitboxes.append(button('', event => {
        event.stopPropagation();
        if (!suppressClick && !(event.pointerType === 'touch' && performance.now() < ignoredTouchClickUntil)) {
          const point = event.detail === 0 ? (theatrePosition(state, object) || legacyPosition) : clampPoint(pointAt(event, plane));
          chooseSlot(position.slot, point);
        }
      },
        { class: `theatre-slot-hit${object ? ' theatre-object-hit' : ''}`, style: `left:${position.x / 10}%;top:${position.y / 7}%;width:${width / 10}%;height:${height / 7}%;z-index:${object ? Math.round(position.y) : 1};`,
        'aria-label': label, title: label, 'aria-pressed': String(editing && selectedSlot === position.slot), 'data-theatre-slot': position.slot,
        ...(object ? { 'data-theatre-item': object.id } : {}), onkeydown: event => keySlot(event, position.slot) }));
    }
    plane.append(hitboxes); canvas.append(plane); attachPointerPlacement(plane, hitboxes);
    canvas.append(node('div', { class: 'theatre-scene-label', 'aria-hidden': 'true' }, t('TEATR • TWÓJ ZAKĄTEK WYSPY', 'THEATRE • YOUR ISLAND CORNER')));
    const caption = node('div', { class: 'theatre-scene-caption' }, node('strong', {}, movingId ? t('Dotknij nowego miejsca lub przesuń strzałkami', 'Tap a new position or move with arrow keys') : editing ? t('Przeciągnij ozdobę albo wybierz ją i wskaż nowe miejsce', 'Drag an ornament, or select it and choose a new position') : t('Tak wygląda Twój pomysł', 'Your idea, brought to life')),
      node('span', {}, `${status.usedSlots}/20 ${t('ustawionych ozdób', 'placed ornaments')} · ${status.uniqueTypes}/10 ${t('rodzajów w kolekcji', 'types collected')}`));
    if (status.welcomeGardenAvailable) caption.append(button(t('Odbierz powitalny ogród — 6 ozdób bez opłat', 'Keep this welcome garden — 6 free ornaments'), () => command({ type: 'theatreWelcomeGarden' }, t('Ten ogród jest już Twój. Przestawiaj, ulepszaj i twórz własne pomysły.', 'This garden is yours. Move, improve and make it your own.')), { class: 'primary', 'data-theatre-welcome': '' }));
    if (movingId) caption.append(button(t('Anuluj przenoszenie', 'Cancel moving'), () => { movingId = null; render(); }, { 'data-theatre-cancel-moving': '' }));
    const saved = saveState();
    const courtyard = node('div', { class: 'theatre-courtyard' }, canvas, caption, node('p', { class: 'theatre-save-status', 'data-theatre-save-status': '', 'data-save-status': saved.status, role: 'status', 'aria-live': 'polite' }, saved.text));
    const palette = node('div', { class: 'theatre-palette-wrap' }, node('div', { class: 'theatre-palette-heading' }, node('strong', {}, t('Co dodasz do swojego ogrodu?', 'What will you add to your garden?')), node('small', {}, t('Wybór pokazuje podgląd. Dopiero zakup wydaje monety.', 'Choose to preview. Coins are spent only when you buy.'))));
    const items = node('div', { class: 'theatre-palette', 'aria-label': t('Dziesięć rodzajów dekoracji', 'Ten decoration types') });
    for (const kind of THEATRE_DECORATIONS) items.append(button(node('span', {}, svgNode(theatreIconSvg(kind.id, 8, chosenStyle)), node('span', {}, theatreDecorationName(kind.id, language))), () => chooseKind(kind.id),
      { class: 'theatre-palette-item', 'aria-pressed': String(!selectedItemId && selectedKind === kind.id), 'data-theatre-kind': kind.id }));
    palette.append(items);
    const inspector = node('aside', { class: 'theatre-inspector', 'data-theatre-inspector': '', hidden: !editing }, node('div', { class: 'theatre-inspector-heading' }, node('span', { class: 'theatre-eyebrow' }, item ? t('TWÓJ EGZEMPLARZ', 'YOUR ORNAMENT') : t('NOWY POMYSŁ', 'A NEW IDEA')),
      node('h4', {}, theatreDecorationName(item?.type || selectedKind, language))));
    const styleSelector = node('select', { 'aria-label': t('Styl dekoracji', 'Decoration style'), 'data-theatre-style': '', onchange: event => { chosenStyle = event.target.value; render(); } },
      ...THEATRE_STYLES.map(style => node('option', { value: style.id, selected: style.id === chosenStyle }, language === 'en' ? style.name : style.namePl)));
    inspector.append(node('label', { class: 'theatre-style-control' }, t('Styl', 'Style'), styleSelector));
    if (item) {
      const quote = theatreQuote(state, { id: item.id }, context());
      const canImprove = quote.ok && quote.targetLevel > item.level;
      inspector.append(node('div', { class: 'theatre-improvement-preview' }, svgNode(theatreIconSvg(item.type, item.level, chosenStyle)), canImprove ? node('span', {}, '→') : null,
        canImprove ? svgNode(theatreIconSvg(item.type, item.level + 1, chosenStyle)) : null), node('p', { class: 'theatre-level' }, `${t('Poziom', 'Level')} ${count(item.level)}`));
      if (canImprove) inspector.append(node('p', { class: 'theatre-price' }, `${count(quote.coins)} ${t('monet', 'coins')}${quote.requiresAd ? ` + ${t('obejrzenie reklamy', 'watching an advertisement')}` : ''}`),
        button(`${t('Ulepsz do poziomu', 'Improve to level')} ${item.level + 1}`, () => improve(item), { class: 'primary', disabled: busy || !quote.affordable, 'data-theatre-upgrade': item.id }));
      else inspector.append(node('p', { class: 'theatre-muted' }, errorText(quote)));
      inspector.append(node('div', { class: 'theatre-object-actions' },
        button(item.slot === null ? t('Ustaw w ogrodzie', 'Place in the garden') : t('Przenieś ozdobę', 'Move ornament'), () => {
          movingId = item.id; editing = true; selectedPoint = theatrePosition(state, item) || selectedPoint;
          say(t('Dotknij wybranego miejsca na placu. Możesz też użyć strzałek, aby poprawić ustawienie małymi krokami.', 'Tap a position in the courtyard. You can also use arrow keys for fine adjustments.'));
          render(); revealArea('.theatre-canvas'); root.querySelector(`[data-theatre-slot="${item.slot ?? selectedSlot}"]`)?.focus({ preventScroll: true });
        }, { 'data-theatre-move': item.id }),
        button(t('Odłóż do kolekcji', 'Store in collection'), () => command({ type: 'theatreRemove', id: item.id }, t('Dekoracja czeka w kolekcji i zachowuje swój poziom.', 'The decoration is stored, keeping its level.')), { disabled: busy || item.slot === null, 'data-theatre-remove': item.id })),
        button(t('Zastosuj wybrany styl bez opłat', 'Apply this style for free'), () => command({ type: 'theatreRestyle', id: item.id, style: chosenStyle }, t('Styl zmieniony.', 'Style changed.')), { disabled: busy || item.style === chosenStyle, 'data-theatre-restyle': item.id }));
    } else {
      const buySlot = occupied ? (freeSlot() ?? null) : selectedSlot;
      const placement = buySlot === null ? {} : { slot: buySlot, ...selectedPoint };
      const quote = theatreQuote(state, { type: 'theatreBuy', decoration: selectedKind, style: chosenStyle, ...placement }, context());
      inspector.append(svgNode(theatreIconSvg(selectedKind, 1, chosenStyle)), node('p', { class: 'theatre-muted' }, t('Zacznij od poziomu 1. Ulepszaj dalej, gdy masz środki — każdy kolejny poziom dopracowuje Twoją ozdobę.', 'Start at level 1. Keep improving when you have the coins: each new level adds refinement to your ornament.')),
        node('p', { class: 'theatre-price' }, quote.ok ? `${count(quote.coins)} ${t('monet', 'coins')}` : errorText(quote)),
        button(buySlot === null ? t('Kup do kolekcji', 'Buy for your collection') : t('Kup i ustaw tutaj', 'Buy and place here'), async () => {
          const result = await command({ type: 'theatreBuy', decoration: selectedKind, style: chosenStyle, ...placement }, t('Pierwszy krok do piękniejszego zakątka!', 'One more beautiful corner of your island!'));
          if (result && result.ok !== false) selectedItemId = result.item?.id || state.theatre.collection.find(entry => entry.slot === buySlot)?.id;
          render(); if (result && result.ok !== false) reveal(buySlot);
        }, { class: 'primary', disabled: busy || !quote.ok || !quote.affordable, 'data-theatre-buy': selectedKind }));
      if (status.freeSlots === 0) {
        const available = freeSlot();
        inspector.append(node('p', { class: 'theatre-muted' }, available !== undefined
          ? t('Wybrane miejsce jest zajęte. Wskaż inne albo kup nową ozdobę do kolekcji.', 'This place is occupied. Choose another one or buy the new ornament for your collection.')
          : t('Wszystkie miejsca są zajęte. Nową ozdobę możesz kupić do kolekcji, a potem zamienić z inną.', 'All places are occupied. Buy the new ornament for your collection, then swap it with another.')));
        if (available !== undefined) inspector.append(button(t('Znajdź wolne miejsce', 'Find a free place'), () => { selectedSlot = available; selectedItemId = null; render(); revealArea('.theatre-canvas'); }, { 'data-theatre-find-space': '' }));
      }
    }
    if (status.pendingUpgrade) inspector.append(node('div', { class: 'theatre-pending' }, node('p', {}, t('Ulepszenie czeka na potwierdzenie reklamy. Monety są nadal Twoje.', 'The improvement awaits advertisement confirmation. Your coins are still yours.')),
      button(t('Anuluj reklamę', 'Cancel advertisement'), () => command({ type: 'theatreCancelUpgradeAd', nonce: status.pendingUpgrade.nonce }), { 'data-theatre-cancel-ad': '' })));
    const sceneLayout = node('div', { class: `theatre-editor${!editing ? ' is-admiring' : ''}` }, courtyard, palette, inspector);
    const environment = node('section', { class: 'theatre-environment', 'aria-label': t('Nastrój ogrodu', 'Garden atmosphere') },
      node('div', {}, node('h4', {}, t('Ustaw nastrój', 'Set the mood')), node('p', {}, t('Światło i nawierzchnię zmieniasz bez opłat.', 'Light and paving can be changed free of charge.'))),
      atmosphereControl(t('Światło', 'Light'), 'lighting', THEATRE_LIGHTING, atmosphere.lighting), atmosphereControl(t('Nawierzchnia', 'Paving'), 'paving', THEATRE_PAVING, atmosphere.paving));
    const collection = node('section', { class: 'theatre-collection' }, node('div', { class: 'theatre-section-heading' }, node('div', {}, node('h4', {}, t('Twoja kolekcja', 'Your collection')),
      node('p', {}, t('Przestawiaj i odkładaj bez opłat. Każda ozdoba zachowuje swój poziom.', 'Move and store ornaments for free. Each keeps its level.'))), node('span', { class: 'theatre-collection-count' }, count(status.collection.length))));
    const owned = node('div', { class: 'theatre-owned' });
    for (const entry of status.collection.slice(0, collectionLimit)) {
      const card = button(node('span', {}, svgNode(theatreIconSvg(entry.type, entry.level, entry.style)), node('strong', {}, theatreDecorationName(entry.type, language)),
        node('small', {}, `${t('Poz.', 'Lv.')} ${entry.level} · ${entry.slot === null ? t('w kolekcji', 'stored') : t('na placu', 'in the garden')}`)), () => { editing = true; selectedItemId = entry.id; selectedSlot = entry.slot ?? selectedSlot; chosenStyle = entry.style; movingId = null; render(); revealArea('.theatre-inspector'); },
        { class: 'theatre-owned-item', 'aria-pressed': String(entry.id === selectedItemId), 'data-theatre-owned': entry.id }); owned.append(card);
    }
    collection.append(owned.children.length ? owned : node('p', { class: 'theatre-empty-collection' }, t('Tu zacznie się Twoja kolekcja. Wybierz coś z palety powyżej.', 'Your collection starts here. Choose something from the palette above.')));
    if (status.collection.length > collectionLimit) collection.append(button(t('Pokaż więcej ozdób', 'Show more ornaments'), () => { collectionLimit += 40; render(); }));
    const notice = node('p', { class: `theatre-notice${noticeError ? ' theatre-error' : ''}`, role: noticeError ? 'alert' : 'status', 'aria-live': 'polite' },
      noticeText || t('Przymierz dekorację, wskaż miejsce i zobacz efekt przed zakupem. Tu nie ma jednego sposobu na piękny ogród.', 'Preview an ornament, choose a place and see the effect before buying. There is no single way to make a beautiful garden.'));
    const rules = node('details', { class: 'theatre-rules' }, node('summary', {}, t('Jak urządzać Teatr?', 'How to decorate the Theatre')),
      node('p', {}, t('Teatr pozostaje na jednym poziomie. Na placu ustawisz do 20 ozdób w dowolnych miejscach. Wybierasz spośród 10 rodzajów i pięciu stylów. Przeciągaj ozdoby albo wybierz „Przenieś” i dotknij nowego miejsca. Strzałki w trybie przenoszenia poprawiają pozycję małymi krokami. Ozdoby rozwijasz dalej, dopóki masz środki — poziom 20 nie jest końcem. Ceny widzisz przed zakupem lub ulepszeniem. Co piąty poziom wymaga też ukończonej reklamy; uprawnienie bez reklam zastępuje film.',
        'The Theatre stays at one building level. Freely arrange up to twenty ornaments in the courtyard, with ten types and five styles. Drag an ornament, or choose Move and tap a new position. Arrow keys make fine adjustments in moving mode. Keep improving as long as you have the coins: level twenty is not the end. Prices appear before purchase or improvement. Every fifth level also needs a completed advertisement; no-ads entitlement replaces the film.')),
      node('p', {}, t('Pomysły zapisują układ i wygląd Twoich ozdób. Nie kupują nowych przedmiotów i nie cofają poziomów ani wydanych monet. Wyspa działa dalej: produkcja, transport i misje biegną podczas aranżowania.', 'Saved ideas remember the arrangement and appearance of your ornaments. They never buy items or undo levels or coin spending. Production, transport and missions keep running while you decorate.')));
    root.replaceChildren(...[header, environment, renderLayouts(status), toolbar, sceneLayout, notice, renderInspiration(), collection,
      status.badges.length ? node('p', { class: 'theatre-achievement', 'data-theatre-pennant': '' }, t('Proporzec kolekcjonera zdobi Twój Teatr!', 'The collector’s pennant flies above your Theatre!')) : null, renderCity(), rules].filter(Boolean));
    lastModelKey = modelKey();
    const nextCanvas = root.querySelector('.theatre-canvas');
    if (zoomed && nextCanvas) { nextCanvas.scrollLeft = scroll.left; nextCanvas.scrollTop = scroll.top; }
    restoreFocus(focus);
  }
  function refreshBalances() {
    refreshSaveStatus();
    const balance = root.querySelector('[data-theatre-balance]'); if (balance) balance.textContent = count(state.resources?.coins);
    for (const control of root.querySelectorAll('button,select')) if (busy) control.disabled = true;
    const upgrade = root.querySelector('[data-theatre-upgrade]');
    if (upgrade) { const quote = theatreQuote(state, { id: upgrade.dataset.theatreUpgrade }, context()); upgrade.disabled = busy || !quote.ok || !quote.affordable; }
    const buy = root.querySelector('[data-theatre-buy]');
    if (buy) { const available = state.theatre.collection.some(entry => entry.slot === selectedSlot) ? freeSlot() : selectedSlot; const quote = theatreQuote(state, { type: 'theatreBuy', decoration: buy.dataset.theatreBuy, style: chosenStyle, ...(available === undefined ? {} : { slot: available, ...selectedPoint }) }, context()); buy.disabled = busy || !quote.ok || !quote.affordable; }
  }
  render();
  const update = nextState => {
    if (!alive) return;
    if (nextState && typeof nextState === 'object' && nextState.resources) state = nextState;
    refreshAdNotice();
    if (modelKey() !== lastModelKey) render(); else refreshBalances();
  };
  return { element: root, root, update, refresh: update, destroy() { alive = false; clearTimeout(revealTimer); root.remove(); } };
}
