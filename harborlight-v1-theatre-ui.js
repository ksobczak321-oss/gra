import { THEATRE_DECORATIONS, THEATRE_STYLES, theatreStatus, theatreQuote, theatreDecorationName } from './harborlight-v1-theatre.js?v=frontend-v29';
import { renderTheatreScene, theatreIconSvg, THEATRE_SLOT_POSITIONS } from './harborlight-v1-theatre-art.js?v=frontend-v29';
import { ATTRACTIONS } from './harborlight-v1-leisure.js?v=frontend-v29';

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
  if (document.getElementById('harborlight-theatre-css')) return;
  document.head.append(node('link', { id: 'harborlight-theatre-css', rel: 'stylesheet',
    href: new URL('./harborlight-v1-theatre.css?v=frontend-v29', import.meta.url).href }));
}

/** A presentation layer. Purchases and ad settlement always pass through the
 * main engine. The panel never changes resources, collection or receipts. */
export function createTheatrePanel({ state, perform = () => false, requestRewardedAd,
  onChange, onOpenAttractions, language: requestedLanguage, noAds = false } = {}) {
  styles();
  const language = requestedLanguage === 'en' || requestedLanguage === 'pl' ? requestedLanguage : state?.settings?.language === 'en' ? 'en' : 'pl';
  const t = (pl, en) => language === 'en' ? en : pl;
  const count = n => Math.floor(n || 0).toLocaleString(language === 'en' ? 'en-GB' : 'pl-PL');
  const root = node('section', { class: 'theatre-panel', 'data-theatre-panel': '', 'data-i18n-ignore': '', lang: language });
  let selectedSlot = 0, selectedKind = 'fountain', selectedItemId = null, chosenStyle = 'coastal', movingId = null;
  let busy = false, alive = true, noticeText = '', noticeError = false, lastModelKey = '';
  const context = () => ({ noAds: typeof noAds === 'function' ? !!noAds() : !!noAds });
  const modelKey = () => JSON.stringify([state.theatre, context().noAds,
    state.leisure?.offers, (state.leisure?.effects || []).map(effect => [effect.id, effect.attractionId, effect.amount, effect.residentIds, Math.ceil((effect.remaining || 0) / 60)])]);
  const say = (text, error = false) => { noticeText = text; noticeError = error; };
  const errorText = result => ({
    'not-enough-coins': t('Brakuje monet. Cena jest widoczna przed zakupem; możesz wrócić do aranżacji później.', 'Not enough coins. The price is shown before purchase; you can return to decorating later.'),
    'ad-required': t('Ten poziom wymaga monet i obejrzenia całej reklamy.', 'This level requires coins and a completed advertisement.'),
    'ad-unverified': t('Nie otrzymano potwierdzenia reklamy. Dekoracja i monety pozostały bez zmian.', 'The advertisement was not confirmed. The decoration and coin balance are unchanged.'),
    'ad-expired': t('Ta próba już wygasła. Wybierz ulepszenie ponownie.', 'This attempt has expired. Select the improvement again.'),
    'slot-occupied': t('Wybierz wolne miejsce albo przestaw obecną dekorację.', 'Choose a free place or move the current decoration.'),
    'max-level': t('Ta dekoracja osiągnęła już poziom 20.', 'This decoration is already at level 20.')
  }[result?.code] || t('Nie udało się wykonać tej czynności. Odśwież widok i spróbuj ponownie.', 'This action could not be completed. Refresh the view and try again.'));
  async function command(action, success = '') {
    if (busy || !alive) return false;
    busy = true; render();
    try {
      const result = await perform(action);
      if (result === false || result?.ok === false) { say(errorText(result), true); return result; }
      if (success) say(success);
      onChange?.(result); return result ?? { ok: true };
    } catch (_error) { say(t('Nie udało się zapisać zmiany. Spróbuj ponownie.', 'The change could not be saved. Try again.'), true); return false; }
    finally { busy = false; if (alive) render(); }
  }
  const button = (label, fn, attrs = {}) => node('button', { type: 'button', disabled: busy, ...attrs, onclick: fn }, label);
  const selected = () => state.theatre?.collection?.find(item => item.id === selectedItemId) || null;

  async function improve(item) {
    const quote = theatreQuote(state, { id: item.id }, context());
    if (!quote.ok || !quote.affordable) { say(errorText(quote.ok ? { code: 'not-enough-coins' } : quote), true); render(); return; }
    if (!quote.requiresAd) { await command({ type: 'theatreUpgrade', id: item.id }, t('Dekoracja jest piękniejsza! Nowy poziom od razu widać w ogrodzie.', 'A beautiful improvement! The new level is visible in your garden immediately.')); return; }
    const result = await command({ type: 'theatreBeginUpgradeAd', id: item.id });
    if (!result || result.ok === false) return;
    const nonce = result.nonce || state.theatre?.pendingUpgrade?.nonce;
    if (!nonce) { say(t('Nie udało się rozpocząć reklamy.', 'The advertisement could not be started.'), true); render(); return; }
    if (typeof requestRewardedAd !== 'function') {
      await command({ type: 'theatreCancelUpgradeAd', nonce });
      say(t('Reklamy nie są jeszcze dostępne w tym środowisku. Nie pobrano monet.', 'Advertisements are not available in this environment yet. No coins were spent.'), true); render(); return;
    }
    // The adapter plays an actual provider film, or an explicitly marked DEV
    // simulation. Only the adapter may dispatch complete with verified context.
    try {
      const completion = await requestRewardedAd({ purpose: 'theatre', nonce, id: item.id, quote });
      if (completion?.ok === false || completion === false) say(t('Reklama została pominięta. Nie pobrano monet.', 'Advertisement skipped. No coins were spent.'));
      else if (state.theatre?.collection?.find(entry => entry.id === item.id)?.level === quote.targetLevel) say(t('Dekoracja ulepszona. Dziękujemy za obejrzenie reklamy!', 'Decoration improved. Thank you for watching the advertisement!'));
      else say(t('Czekamy na potwierdzenie ukończenia reklamy. Monety nie zostały jeszcze pobrane.', 'Waiting for advertisement completion confirmation. No coins have been spent yet.'));
    } catch (_error) { say(t('Reklama nie została ukończona. Nie pobrano monet.', 'The advertisement was not completed. No coins were spent.'), true); }
    if (alive) render();
  }

  function render() {
    if (!alive) return;
    const status = theatreStatus(state, context()), item = selected();
    if (!Number.isInteger(selectedSlot) || selectedSlot < 0 || selectedSlot > 19) selectedSlot = 0;
    const occupied = status.collection.find(entry => entry.slot === selectedSlot);
    const preview = !item && selectedKind && !occupied ? { type: selectedKind, level: 1, style: chosenStyle, slot: selectedSlot } : null;
    const intro = node('header', { class: 'theatre-intro' }, node('div', {}, node('p', { class: 'theatre-eyebrow' }, t('TWÓJ KAWAŁEK WYSPY', 'YOUR OWN ISLAND CORNER')),
      node('h3', {}, t('Niech wyspa nabierze Twojego stylu', 'Give your island your own style')),
      node('p', {}, t('Teatr jest miejscem odpoczynku i integracji mieszkańców wyspy. Zadbaj o to, aby każdy go odwiedzał. W Teatrze widoczne są także wszystkie dekoracje miasta.',
        'The Theatre is a place for island residents to rest and meet. Make it a welcoming part of island life. All town decorations are also visible here.'))),
      node('div', { class: 'theatre-balance' }, node('span', {}, t('Twoje monety', 'Your coins')), node('strong', { 'data-theatre-balance': '' }, count(state.resources?.coins))));
    const notice = node('p', { class: `theatre-notice${noticeError ? ' theatre-error' : ''}`, role: noticeError ? 'alert' : 'status', 'aria-live': 'polite' },
      noticeText || t('Wybierz dekorację, sprawdź podgląd i wskaż jej miejsce. Przestawianie i przechowywanie są bezpłatne.', 'Choose a decoration, preview it and select its place. Moving and storing decorations are free.'));
    const canvas = node('div', { class: `theatre-canvas${movingId ? ' theatre-moving' : ''}` });
    const scene = svgNode(renderTheatreScene(state, { selectedSlot, preview, language, prefix: 'theatre-editor' }));
    canvas.append(scene);
    const hitboxes = node('div', { class: 'theatre-slot-layer', 'aria-label': t('Dwadzieścia miejsc na dekoracje', 'Twenty decoration places') });
    for (const position of THEATRE_SLOT_POSITIONS) {
      const object = status.collection.find(entry => entry.slot === position.slot);
      const label = `${t('Miejsce', 'Place')} ${position.slot + 1}: ${object ? `${theatreDecorationName(object.type, language)}, ${t('poziom', 'level')} ${object.level}` : t('wolne', 'empty')}`;
      hitboxes.append(button('', async () => {
        if (movingId) {
          await command({ type: 'theatrePlace', id: movingId, slot: position.slot }, t('Gotowe. Aranżację możesz zmieniać tak często, jak chcesz.', 'Done. Rearrange your garden as often as you like.'));
          selectedItemId = movingId; movingId = null;
        } else { selectedItemId = object?.id || null; chosenStyle = object?.style || chosenStyle; }
        selectedSlot = position.slot; render();
      }, { class: 'theatre-slot-hit', style: `left:${position.x / 10}%;top:${position.y / 7}%;`,
        'aria-label': label, title: label, 'aria-pressed': selectedSlot === position.slot, 'data-theatre-slot': position.slot }));
    }
    canvas.append(hitboxes);
    const caption = node('div', { class: 'theatre-scene-caption' },
      node('strong', {}, movingId ? t('Wskaż nowe miejsce', 'Choose a new place') : `${t('Miejsce', 'Place')} ${selectedSlot + 1} / 20`),
      node('span', {}, `${status.usedSlots}/20 ${t('zajętych', 'occupied')} · ${status.uniqueTypes}/10 ${t('rodzajów w kolekcji', 'types collected')}`));
    if (movingId) caption.append(button(t('Anuluj przenoszenie', 'Cancel moving'), () => { movingId = null; render(); }));
    const courtyard = node('div', { class: 'theatre-courtyard' }, canvas, caption,
      preview ? node('p', { class: 'theatre-preview-label' }, t('Podgląd dekoracji — zakup nastąpi dopiero po kliknięciu przycisku poniżej.', 'Decoration preview — it is purchased only when you click the button below.')) : null,
      node('p', { class: 'theatre-world-note' }, t('Wyspa działa dalej: mieszkańcy pracują, towary są przewożone, a czas misji biegnie.', 'Island life continues: residents work, goods travel and mission time keeps running.')));
    const inspector = node('aside', { class: 'theatre-inspector', 'data-theatre-inspector': '' });
    const styleSelector = node('select', { 'aria-label': t('Styl dekoracji', 'Decoration style'), 'data-theatre-style': '', onchange: event => { chosenStyle = event.target.value; render(); } },
      ...THEATRE_STYLES.map(style => node('option', { value: style.id, selected: style.id === chosenStyle }, language === 'en' ? style.name : style.namePl)));
    inspector.append(node('label', { class: 'theatre-style-control' }, t('Styl', 'Style'), styleSelector));
    if (item) {
      const quote = theatreQuote(state, { id: item.id }, context());
      inspector.append(node('h4', {}, theatreDecorationName(item.type, language)),
        node('p', { class: 'theatre-level' }, `${t('Poziom', 'Level')} ${item.level} / 20`),
        node('div', { class: 'theatre-improvement-preview' }, svgNode(theatreIconSvg(item.type, item.level, chosenStyle)),
          item.level < 20 ? node('span', {}, '→') : null, item.level < 20 ? svgNode(theatreIconSvg(item.type, item.level + 1, chosenStyle)) : null));
      if (item.level < 20) inspector.append(node('p', { class: 'theatre-price' }, `${count(quote.coins)} ${t('monet', 'coins')}${quote.requiresAd ? ` + ${t('obejrzenie reklamy', 'watching an advertisement')}` : ''}`),
        button(`${t('Ulepsz do poziomu', 'Improve to level')} ${item.level + 1}`, () => improve(item), { class: 'primary', disabled: busy || !quote.affordable, 'data-theatre-upgrade': item.id }));
      else inspector.append(node('p', { class: 'theatre-achievement' }, t('Poziom mistrzowski. Piękna robota!', 'A masterpiece. Beautiful work!')));
      inspector.append(button(item.slot === null ? t('Ustaw w ogrodzie', 'Place in the garden') : t('Przenieś lub zamień miejscami', 'Move or swap places'), () => { movingId = item.id; say(t('Kliknij jedno z dwudziestu miejsc. Zajęte miejsca można zamieniać.', 'Click one of the twenty places. Occupied places can be swapped.')); render(); }, { 'data-theatre-move': item.id }),
        button(t('Odłóż do kolekcji', 'Store in collection'), () => command({ type: 'theatreRemove', id: item.id }, t('Dekoracja czeka w kolekcji. Zachowuje swój poziom.', 'The decoration is stored in your collection, keeping its level.')), { disabled: busy || item.slot === null, 'data-theatre-remove': item.id }),
        button(t('Zastosuj wybrany styl bez opłat', 'Apply this style for free'), () => command({ type: 'theatreRestyle', id: item.id, style: chosenStyle }, t('Styl zmieniony.', 'Style changed.')), { disabled: busy || item.style === chosenStyle }));
    } else {
      const quote = theatreQuote(state, { type: 'theatreBuy', decoration: selectedKind, style: chosenStyle, slot: selectedSlot }, context());
      inspector.append(node('h4', {}, theatreDecorationName(selectedKind, language)), svgNode(theatreIconSvg(selectedKind, 1, chosenStyle)),
        node('p', { class: 'theatre-muted' }, t('Nowa dekoracja, poziom 1. Każdy egzemplarz rozwijasz osobno aż do poziomu 20.', 'A new level-one decoration. Each individual item can be improved separately up to level 20.')),
        node('p', { class: 'theatre-price' }, `${count(status.catalog.find(entry => entry.id === selectedKind)?.coins)} ${t('monet', 'coins')}`),
        button(t('Kup i ustaw tutaj', 'Buy and place here'), async () => {
          const result = await command({ type: 'theatreBuy', decoration: selectedKind, style: chosenStyle, slot: selectedSlot }, t('Pierwszy krok do piękniejszej wyspy!', 'One more beautiful corner of your island!'));
          if (result && result.ok !== false) selectedItemId = result.item?.id || state.theatre?.collection?.find(entry => entry.slot === selectedSlot)?.id;
          render();
        }, { class: 'primary', disabled: busy || !quote.ok || !quote.affordable, 'data-theatre-buy': selectedKind }));
      if (occupied) inspector.append(node('p', { class: 'theatre-muted' }, t('To miejsce jest zajęte. Wskaż wolne miejsce na planszy.', 'This place is occupied. Select a free place in the courtyard.')));
    }
    if (status.pendingUpgrade) inspector.append(node('div', { class: 'theatre-pending' }, node('p', {}, t('Ulepszenie czeka na potwierdzenie reklamy. Monety są nadal Twoje.', 'The improvement is waiting for advertisement confirmation. Your coins are still yours.')),
      button(t('Anuluj reklamę', 'Cancel advertisement'), () => command({ type: 'theatreCancelUpgradeAd', nonce: status.pendingUpgrade.nonce }, t('Anulowano. Nie pobrano monet.', 'Cancelled. No coins were spent.')))));
    const palette = node('div', { class: 'theatre-palette', 'aria-label': t('Dziesięć rodzajów dekoracji', 'Ten decoration types') });
    for (const kind of THEATRE_DECORATIONS) palette.append(button('', () => {
      selectedKind = kind.id; selectedItemId = null; movingId = null;
      if (state.theatre?.collection?.some(entry => entry.slot === selectedSlot)) selectedSlot = Array.from({ length: 20 }, (_, i) => i).find(slot => !state.theatre.collection.some(entry => entry.slot === slot)) ?? selectedSlot;
      render();
    }, { class: 'theatre-palette-item', 'aria-pressed': !selectedItemId && selectedKind === kind.id, 'data-theatre-kind': kind.id }));
    [...palette.children].forEach((element, index) => element.append(svgNode(theatreIconSvg(THEATRE_DECORATIONS[index].id, 1, chosenStyle)), node('span', {}, theatreDecorationName(THEATRE_DECORATIONS[index].id, language))));
    const collection = node('section', { class: 'theatre-collection' }, node('h4', {}, t('Twoja kolekcja', 'Your collection')),
      node('p', { class: 'theatre-muted' }, t('Możesz mieć kilka takich samych dekoracji. Po usunięciu z ogrodu wracają tutaj z zachowanym poziomem.', 'You may own several of the same decoration. Removing one from the garden stores it here at its current level.')));
    const owned = node('div', { class: 'theatre-owned' });
    for (const entry of status.collection) {
      const card = button('', () => { selectedItemId = entry.id; selectedSlot = entry.slot ?? selectedSlot; chosenStyle = entry.style; movingId = null; render(); },
        { class: 'theatre-owned-item', 'aria-pressed': entry.id === selectedItemId, 'data-theatre-owned': entry.id });
      card.append(svgNode(theatreIconSvg(entry.type, entry.level, entry.style)), node('strong', {}, theatreDecorationName(entry.type, language)),
        node('span', {}, `${t('Poz.', 'Lv.')} ${entry.level} · ${entry.slot === null ? t('w kolekcji', 'stored') : `${t('miejsce', 'place')} ${entry.slot + 1}`}`)); owned.append(card);
    }
    collection.append(owned.children.length ? owned : node('p', { class: 'theatre-muted' }, t('Tu pojawi się Twoja pierwsza dekoracja.', 'Your first decoration will appear here.')));
    const rules = node('details', { class: 'theatre-rules' }, node('summary', {}, t('Jak urządzać Teatr?', 'How to decorate the Theatre')),
      node('p', {}, t('Teatr nie wymaga rozbudowy. Urządzasz 20 miejsc, wybierając spośród 10 rodzajów dekoracji i pięciu stylów. Każda dekoracja ma 20 coraz piękniejszych poziomów. Kupowanie i ulepszanie kosztuje monety; poziomy 5, 10, 15 i 20 wymagają dodatkowo obejrzenia całej reklamy. Aktywne uprawnienie bez reklam zastępuje film, ale cena w monetach pozostaje bez zmian.',
        'The Theatre building does not need upgrades. Decorate twenty places using ten decoration types and five styles. Each decoration has twenty increasingly beautiful levels. Purchases and improvements cost coins; levels 5, 10, 15 and 20 also require a completed advertisement. An active no-ads entitlement replaces the film; the coin price stays the same.')),
      node('p', {}, t('Zebranie wszystkich dziesięciu rodzajów odblokowuje ozdobny proporzec nad Teatrem. To pamiątka Twojej kolekcji.', 'Collect all ten decoration types to unlock a pennant above the Theatre, celebrating your collection.')));
    const city = node('section', { class: 'theatre-city', 'data-theatre-city-attractions': '' }, node('h4', {}, t('Życie wokół Teatru', 'Life around the Theatre')),
      node('p', { class: 'theatre-muted' }, t('Wędrowny teatr, koncerty i spotkania dają mieszkańcom czas na odpoczynek oraz premie do szczęścia. Korzystają z tych samych zasad co pozostałe atrakcje wyspy. Stałe ozdoby ogrodu są Twoją osobną kolekcją.',
        'The travelling theatre, concerts and gatherings give residents time to rest and happiness bonuses. They follow the island’s existing attraction rules. Permanent garden ornaments are your separate collection.')));
    const cityGallery = node('div', { class: 'theatre-city-gallery' });
    const effects = (state.leisure?.effects || []).filter(effect => effect.remaining > 0);
    const cityIds = [...new Set([...effects.map(effect => effect.attractionId), ...(state.leisure?.offers || []).map(offer => offer.id)])];
    for (const cityId of cityIds) {
      const attraction = ATTRACTIONS.find(entry => entry.id === cityId);
      if (!attraction) continue;
      const effect = effects.find(entry => entry.attractionId === cityId);
      const card = node('div', { class: 'theatre-city-card', 'data-theatre-city-attraction': cityId },
        svgNode(theatreIconSvg(CITY_ICON[attraction.icon] || 'gateway', effect ? 10 : 1, 'coastal')),
        node('strong', {}, language === 'en' ? attraction.name : CITY_NAMES[cityId] || attraction.name),
        node('span', {}, effect ? `${t('Trwa jeszcze', 'Active for')} ${Math.ceil(effect.remaining / 60)} min · +${effect.amount} ${t('punktów szczęścia', 'happiness points')}` : t('W dzisiejszych atrakcjach', 'In today’s attractions')));
      cityGallery.append(card);
    }
    city.append(cityIds.length ? cityGallery : node('p', { class: 'theatre-muted' }, t('Dostępne dziś wydarzenia znajdziesz w panelu „Dekoracje i atrakcje”.', 'Find today’s events in the “Decorations and attractions” panel.')));
    if (typeof onOpenAttractions === 'function') city.append(button(t('Zobacz dekoracje i atrakcje', 'View decorations and attractions'), onOpenAttractions, { 'data-theatre-open-attractions': '' }));
    root.replaceChildren(...[intro, notice, node('div', { class: 'theatre-editor' }, courtyard, inspector), palette, collection,
      status.badges.length ? node('p', { class: 'theatre-achievement', 'data-theatre-pennant': '' }, t('Proporzec kolekcjonera zdobi już Twój Teatr!', 'The collector’s pennant is flying above your Theatre!')) : null, city, rules].filter(Boolean));
    lastModelKey = modelKey();
  }
  render();
  const update = nextState => {
    if (nextState && typeof nextState === 'object' && nextState.resources) state = nextState;
    if (modelKey() !== lastModelKey) { render(); return; }
    // Tax income must not replace an open style selector or the focused slot.
    // Refresh the balance and affordability in place while the garden is intact.
    const balance = root.querySelector('[data-theatre-balance]');
    if (balance) balance.textContent = count(state.resources?.coins);
    const upgrade = root.querySelector('[data-theatre-upgrade]');
    if (upgrade) { const quote = theatreQuote(state, { id: upgrade.dataset.theatreUpgrade }, context()); upgrade.disabled = busy || !quote.ok || !quote.affordable; }
    const purchase = root.querySelector('[data-theatre-buy]');
    if (purchase) { const quote = theatreQuote(state, { type: 'theatreBuy', decoration: purchase.dataset.theatreBuy, slot: selectedSlot, style: chosenStyle }, context()); purchase.disabled = busy || !quote.ok || !quote.affordable; }
  };
  return { element: root, root, update, refresh: update, destroy() { alive = false; root.remove(); } };
}
