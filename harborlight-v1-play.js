import { BUILDINGS, RESOURCES, EXPEDITIONS, TASKS, createState, normalizeState, act, tick, buildingCost, taskReady, totalWorkers } from './harborlight-v1-state.js';
import { createAmbientScene } from './harborlight-v1-ambient.js';

const SAVE_KEY = 'harborlight-v1-interactive-save';
const stage = document.getElementById('stage');
const layer = document.getElementById('semanticLayer');
const dialog = document.getElementById('island-dialog');
const toastElement = document.getElementById('island-toast');
const placementBanner = document.getElementById('placement-banner');
let state;
try { state = normalizeState(JSON.parse(localStorage.getItem(SAVE_KEY))); }
catch { state = createState(); }
let panel = null;
let placement = null;
let puzzle = null;
let toastTimer;
let previousFocus;
let panelNotice = '';
let lastTick = performance.now();
const initialLevels = Object.fromEntries(Object.entries(createState().buildings).map(([id, value]) => [id, value.level]));
const productionBuildings = Object.keys(BUILDINGS).filter(id => BUILDINGS[id].resource);
const worldAdditions = el('div', { class: 'world-additions', 'aria-hidden': 'true' });
stage.append(worldAdditions);
let worldSignature = '';

function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'style') Object.assign(node.style, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== false && value != null) node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}
const nameOf = id => RESOURCES[id]?.name || ({ coins: 'Monety', wood: 'Drewno', stone: 'Kamień', food: 'Żywność', planks: 'Deski' }[id]) || id;
const count = value => Math.floor(value || 0).toLocaleString('en-US');
const titleOf = id => BUILDINGS[id]?.name || id;
const costText = cost => Object.entries(cost || {}).map(([id, value]) => `${nameOf(id)}: ${count(value)}`).join(' · ');
const button = (label, fn, attributes = {}) => el('button', { type: 'button', class: 'action', onclick: fn, ...attributes }, label);
const note = text => el('p', { class: 'notice' }, text);
const card = (...children) => el('section', { class: 'info-card' }, ...children);

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  catch { toast('Przeglądarka nie pozwala zapisać postępu. Gra działa do zamknięcia tej karty.'); }
}
function toast(message) {
  toastElement.textContent = message;
  toastElement.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastElement.hidden = true; }, 3500);
}
function perform(action) {
  const focused = dialog.contains(document.activeElement) ? document.activeElement : null;
  const focusKey = focused?.getAttribute('data-collect');
  const focusLabel = focused?.textContent;
  const result = act(state, action);
  panelNotice = result.message;
  if (result.ok) { save(); renderHUD(); }
  toast(result.message);
  if (panel && dialog.open) {
    renderPanel();
    const target = focusKey ? dialog.querySelector(`[data-collect="${focusKey}"]`) : [...dialog.querySelectorAll('button,input')].find(node => node.textContent === focusLabel && !node.disabled);
    (target && !target.disabled ? target : dialog.querySelector('.dialog-close'))?.focus({ preventScroll: true });
  }
  return result.ok;
}
document.body.append(button('Menu wyspy', () => openPanel('menu'), { class: 'mobile-island-menu', 'aria-label': 'Otwórz menu wyspy' }));

const buildingRegions = {
  lighthouse: [1238, 64, 153, 190], house: [486, 195, 105, 95], farm: [137, 304, 260, 116],
  sawmill: [329, 501, 189, 157], quarry: [1041, 282, 186, 188], dock: [234, 625, 482, 149],
  warehouse: [412, 406, 133, 116], lumber: [604, 111, 120, 137], windmill: [224, 206, 105, 117],
  townhall: [714, 126, 161, 155], chapel: [536, 273, 117, 116], market: [634, 331, 138, 98],
};
function hotspot(id, label, region, fn, extraClass = '') {
  const [x, y, width, height] = region;
  const node = button('', fn, { id: `hit-${id}`, class: `island-hotspot ${extraClass}`, 'aria-label': label, 'data-label': label,
    style: { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` } });
  layer.append(node);
  return node;
}
hotspot('home', 'HARBORLIGHT — podsumowanie wyspy', [12, 8, 327, 72], () => openPanel('home'));
hotspot('settings', 'Ustawienia', [350, 17, 52, 52], () => openPanel('settings'));
for (const [id, label, region] of [
  ['coins', 'Monety — handel', [469, 8, 115, 49]], ['wood', 'Drewno — zapasy', [587, 8, 111, 49]],
  ['stone', 'Kamień — zapasy', [700, 8, 108, 49]], ['food', 'Żywność — zapasy', [811, 8, 112, 49]],
]) hotspot(`resource-${id}`, label, region, () => openPanel('resources', id));
hotspot('population', 'Mieszkańcy i przydział pracowników', [925, 8, 130, 49], () => openPanel('residents'));
hotspot('clock', 'Dzień i czas na wyspie', [1363, 7, 131, 49], () => openPanel('time'));
hotspot('pause', 'Wstrzymaj upływ czasu', [1503, 10, 34, 46], () => { if (!state.paused) perform({ type: 'pause' }); });
hotspot('play', 'Wznów upływ czasu', [1541, 10, 34, 46], () => { if (state.paused) perform({ type: 'pause' }); else toast('Czas na wyspie już płynie.'); });
hotspot('speed', 'Zmień prędkość czasu', [1578, 10, 34, 46], () => perform({ type: 'speed', speed: state.speed === 1 ? 2 : state.speed === 2 ? 4 : 1 }));
hotspot('menu', 'Menu gry', [1623, 7, 43, 50], () => openPanel('menu'));
for (const [id, label, y] of [['island', 'Wyspa', 108], ['expeditions', 'Ekspedycje', 205], ['tasks', 'Zadania', 301], ['residents', 'Mieszkańcy', 401], ['map', 'Mapa wyspy', 502]]) {
  hotspot(`nav-${id}`, label, [6, y, 103, 91], () => id === 'island' ? returnToIsland() : openPanel(id));
}
hotspot('objective-title', 'Główny cel — odbuduj latarnię', [1405, 76, 260, 65], () => openPanel('objective'));
hotspot('objective-repair', 'Napraw latarnię', [1412, 143, 245, 31], () => openPanel('building', 'lighthouse'));
hotspot('objective-wood', 'Dostarcz drewno do latarni', [1412, 175, 245, 28], () => openPanel('objective'));
hotspot('objective-stone', 'Dostarcz kamień do latarni', [1412, 204, 245, 29], () => openPanel('objective'));
hotspot('expedition-preview', 'Mgliste Wyspy — szczegóły ekspedycji', [1411, 265, 250, 148], () => openPanel('expeditions'));
hotspot('expedition-start', 'Wybierz ekspedycję', [1429, 419, 220, 34], () => openPanel('expeditions'));
for (const [id, region] of Object.entries(buildingRegions)) {
  hotspot(`world-${id}`, `${titleOf(id)} — szczegóły`, region, () => {
    if (placement) {
      if (placement !== id) { toast(`Wybierz podświetlone miejsce: ${titleOf(placement)}.`); return; }
      const type = state.buildings[id].level ? 'upgrade' : 'build';
      cancelPlacement();
      if (perform({ type, building: id })) openPanel('building', id);
    } else openPanel('building', id);
  }, 'world-hotspot');
}
hotspot('bridge', 'Most i ścieżki — rozbudowa', [815, 445, 192, 76], () => openPanel('paths'));
hotspot('waterfall', 'Wodospad — przyroda i dekoracje', [808, 526, 129, 148], () => openPanel('decorations'));
hotspot('boat', 'Statek — handel w porcie', [215, 635, 219, 137], () => openPanel('trade'));
hotspot('village', 'Plac osady — mieszkańcy', [559, 397, 187, 106], () => openPanel('residents'));
hotspot('beach', 'Plaża — dekoracje', [1208, 672, 187, 96], () => openPanel('decorations'));
const dockCategories = [['buildings', 'Budynki', 471, 167], ['resources', 'Produkcja i surowce', 648, 158], ['decorations', 'Dekoracje', 815, 170], ['paths', 'Ścieżki', 991, 171]];
for (const [id, label, x, width] of dockCategories) hotspot(`category-${id}`, label, [x, 780, width, 41], () => openPanel(id));
for (const [index, id] of ['house', 'farm', 'sawmill', 'quarry', 'dock', 'warehouse', 'lighthouse'].entries()) {
  hotspot(`dock-${id}`, `${titleOf(id)} — budowa i ulepszenia`, [329 + index * 139, 830, 126, 104], () => openPanel('building', id));
}

const hud = {};
for (const [id, x, width] of [['coins', 513, 63], ['wood', 634, 63], ['stone', 745, 63], ['food', 860, 61], ['population', 970, 77]]) {
  hud[id] = el('span', { class: 'live-resource', 'aria-hidden': 'true', style: { left: `${x}px`, top: '21px', width: `${width}px`, height: '23px' } });
  layer.append(hud[id]);
}
hud.clock = el('span', { class: 'live-clock', 'aria-hidden': 'true', style: { left: '1416px', top: '13px', width: '68px', height: '37px' } });
layer.append(hud.clock);
for (const [id, y] of [['repair', 150], ['wood', 179], ['stone', 207]]) {
  hud[`objective-${id}`] = el('span', { class: 'live-objective', 'aria-hidden': 'true', style: { left: '1603px', top: `${y}px`, width: '45px', height: '20px' } });
  layer.append(hud[`objective-${id}`]);
}
hud.speed = el('span', { class: 'control-state', 'aria-hidden': 'true', hidden: true, style: { left: '1581px', top: '30px', width: '28px' } });
layer.append(hud.speed);
function renderHUD() {
  for (const id of ['coins', 'wood', 'stone', 'food']) hud[id].textContent = count(state.resources[id]);
  hud.population.textContent = `${state.population} / ${state.capacity}`;
  hud.clock.textContent = `Dzień ${state.day}\n${String(Math.floor(state.minutes / 60)).padStart(2, '0')}:${String(Math.floor(state.minutes % 60)).padStart(2, '0')}`;
  hud['objective-repair'].textContent = state.objective.repaired ? '1/1' : '0/1';
  hud['objective-wood'].textContent = `${state.objective.wood}/50`;
  hud['objective-stone'].textContent = `${state.objective.stone}/30`;
  hud.speed.textContent = `${state.speed}×`;
  hud.speed.hidden = state.speed === 1;
  document.getElementById('hit-pause').classList.toggle('is-selected', state.paused);
  document.getElementById('hit-pause').setAttribute('aria-pressed', String(state.paused));
  document.getElementById('hit-play').setAttribute('aria-pressed', String(!state.paused));
  for (const [id, value] of Object.entries(state.buildings)) {
    const node = document.getElementById(`hit-world-${id}`);
    if (!node) continue;
    let badge = node.querySelector('.world-level');
    if (value.level > initialLevels[id]) {
      if (!badge) { badge = el('span', { class: 'world-level' }); node.append(badge); }
      badge.textContent = `Poz. ${value.level}`;
    } else badge?.remove();
    node.setAttribute('aria-label', `${titleOf(id)}, poziom ${value.level}${value.ready ? ', produkcja gotowa do odbioru' : ''}`);
  }
  document.body.classList.toggle('reduce-motion', !state.settings.motion);
  document.body.classList.toggle('world-paused', state.paused);
  refreshLivePanel();
  renderWorldAdditions();
  stage.dispatchEvent(new Event('island-statechange'));
}
function svgNode(name, attributes = {}, ...children) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  node.append(...children);
  return node;
}
function renderWorldAdditions() {
  const signature = JSON.stringify([state.decorations, state.paths, state.objective.repaired]);
  if (signature === worldSignature) return;
  worldSignature = signature;
  worldAdditions.replaceChildren();
  if (state.objective.repaired) worldAdditions.append(el('div', { class: 'lighthouse-beam' }));
  if (state.paths) worldAdditions.append(svgNode('svg', { class: 'road-upgrade', viewBox: '0 0 1672 941', width: '1672', height: '941' },
    svgNode('path', { d: 'M 523 480 Q 594 468 636 450 Q 715 446 775 472 Q 847 489 923 490 Q 1010 490 1093 447', fill: 'none', 'stroke-width': '3', opacity: '.75' })));
  const icons = {
    flowers: '<path d="M12 21V11M12 17L6 14M12 15L18 12" fill="none" stroke="#568144" stroke-width="2"/><path d="M12 4C7-3 3 6 8 9C1 12 8 17 12 12C17 18 23 11 17 8C22 2 14-2 12 4Z" fill="#edba71"/><circle cx="12" cy="8" r="3" fill="#b96547"/>',
    lamp: '<path d="M12 22V7M7 22H17" stroke="#45392a" stroke-width="2.5"/><path d="M7 6H17L15 14H9Z" fill="#ffe4a1" stroke="#846636" stroke-width="1.7"/><path d="M6 6L12 1L18 6Z" fill="#3a5360"/>',
    bench: '<path d="M3 7H21V13H3Z" fill="#cba269" stroke="#684c30"/><path d="M2 15H22M5 15V21M19 15V21" stroke="#745637" stroke-width="3"/>',
  };
  for (const [kind, quantity] of Object.entries(state.decorations || {})) {
    for (let index = 0; index < Math.min(quantity, 12); index++) {
      const x = 548 + (index % 6) * 40 + (kind === 'lamp' ? 214 : kind === 'bench' ? 95 : 0);
      const y = 427 + Math.floor(index / 6) * 29 + (kind === 'bench' ? 48 : 0);
      const decoration = svgNode('svg', { class: 'world-decoration', 'data-kind': kind, viewBox: '0 0 24 24', style: `left:${x}px;top:${y}px` });
      decoration.innerHTML = icons[kind];
      worldAdditions.append(decoration);
    }
  }
}
function refreshLivePanel() {
  dialog.querySelectorAll('[data-ready]').forEach(node => { node.textContent = count(state.buildings[node.dataset.ready].ready); });
  dialog.querySelectorAll('[data-stock]').forEach(node => { node.textContent = count(state.resources[node.dataset.stock]); });
  dialog.querySelectorAll('[data-collect]').forEach(node => { node.disabled = !state.buildings[node.dataset.collect].ready; });
}

function openPanel(kind, id) {
  if (placement) cancelPlacement();
  if (!dialog.open) previousFocus = document.activeElement;
  panel = { kind, id };
  panelNotice = '';
  renderPanel();
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('.dialog-close')?.focus();
}
function closePanel() {
  dialog.close();
  panel = null;
  previousFocus?.focus();
}
dialog.addEventListener('cancel', () => { panel = null; });
dialog.addEventListener('click', event => { if (event.target === dialog) closePanel(); });
function returnToIsland() { if (dialog.open) closePanel(); cancelPlacement(); toast('Twoja wyspa. Wybierz budynek, mieszkańców lub dowolny element menu.'); }
function cancelPlacement() {
  placement = null;
  placementBanner.hidden = true;
  document.querySelectorAll('.world-pulse').forEach(node => node.classList.remove('world-pulse'));
}
function startPlacement(id) {
  closePanel();
  placement = id;
  document.getElementById(`hit-world-${id}`).classList.add('world-pulse');
  placementBanner.replaceChildren(el('span', {}, `Kliknij podświetlone miejsce: ${titleOf(id)}. `), button('Anuluj', cancelPlacement, { class: 'action secondary' }));
  placementBanner.hidden = false;
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') cancelPlacement();
  const direction = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key];
  if (direction && dialog.open && panel?.kind === 'puzzle' && puzzle && !puzzle.complete) {
    event.preventDefault();
    move(puzzle.row + direction[0], puzzle.col + direction[1]);
  }
});

function resourceList(resources = state.resources) {
  return el('div', { class: 'resource-list' }, Object.entries(resources).map(([id, value]) => el('div', { class: 'row' }, el('span', {}, nameOf(id)), el('strong', { 'data-stock': id }, count(value)))));
}
function buildingPanel(id) {
  const data = BUILDINGS[id];
  const value = state.buildings[id];
  const content = el('div', {}, note(data.description || data.desc || 'Rozwijaj budynek, aby zwiększyć możliwości osady.'),
    el('div', { class: 'stat-grid' }, stat('Poziom', value.level || 'Ruina'), stat('Pracownicy', value.workers), stat('Do odbioru', el('span', { 'data-ready': id }, count(value.ready)))));
  if (id === 'lighthouse') {
    content.append(objectivePanel());
    return content;
  }
  const cost = buildingCost(state, id);
  const maxLevel = value.level >= data.maxLevel;
  content.append(card(el('h3', {}, maxLevel ? 'Budynek w pełni rozwinięty' : value.level ? 'Ulepszenie budynku' : 'Budowa'), maxLevel ? null : el('p', { class: 'cost' }, costText(cost)), button(maxLevel ? 'Maksymalny poziom' : value.level ? 'Wybierz miejsce ulepszenia' : 'Wybierz miejsce budowy', () => startPlacement(id), { disabled: maxLevel })));
  if (productionBuildings.includes(id)) {
    content.append(card(el('h3', {}, 'Produkcja'), note('Przydzieleni mieszkańcy pracują, gdy czas na wyspie płynie. Gotowe produkty odbierasz do magazynu.'),
      button('Odbierz produkcję', () => perform({ type: 'collect', building: id }), { disabled: !value.ready, 'data-collect': id }),
      id === 'sawmill' ? el('p', { class: 'cost' }, '10 drewna → 6 desek') : id === 'windmill' ? el('p', { class: 'cost' }, '4 żywności + 2 monety → 10 żywności') : null,
      id === 'sawmill' || id === 'windmill' ? button(id === 'sawmill' ? 'Przerób drewno na deski' : 'Zmiel ziarno — przygotuj żywność', () => perform({ type: 'craft', building: id }), { class: 'action secondary' }) : null));
  }
  content.append(button('Przydziel pracowników', () => openPanel('residents'), { class: 'action secondary' }));
  return content;
}
function stat(label, value) { return el('div', { class: 'stat' }, el('small', {}, label), el('strong', {}, value)); }
function objectivePanel() {
  const objective = state.objective;
  return el('div', {}, note(objective.repaired ? 'Latarnia znów świeci. Kontynuuj rozwój wyspy i odkrywaj kolejne ekspedycje.' : 'Przywróć światło starej latarni. Dostarcz materiały, a potem potwierdź naprawę.'),
    card(el('h3', {}, 'Drewno'), el('p', {}, `${objective.wood} / 50`), button('Dostarcz brakujące drewno', () => perform({ type: 'deliver', resource: 'wood' }), { disabled: objective.wood >= 50 })),
    card(el('h3', {}, 'Kamień'), el('p', {}, `${objective.stone} / 30`), button('Dostarcz brakujący kamień', () => perform({ type: 'deliver', resource: 'stone' }), { disabled: objective.stone >= 30 })),
    objective.repaired ? null : el('p', { class: 'cost' }, 'Naprawa po dostawach: 300 monet i 30 desek.'),
    button(objective.repaired ? 'Latarnia odbudowana' : 'Odbuduj latarnię', () => perform({ type: 'repair' }), { disabled: objective.repaired || objective.wood < 50 || objective.stone < 30 }));
}
function buildingsPanel() {
  return el('div', { class: 'panel-grid' }, Object.keys(BUILDINGS).map(id => card(el('h3', {}, titleOf(id)), el('p', {}, `Poziom ${state.buildings[id].level}`), button('Szczegóły i rozbudowa', () => openPanel('building', id)))));
}
function resourcesPanel(selected) {
  return el('div', {}, selected ? note(`${nameOf(selected)} — aktualny zapas: ${count(state.resources[selected])}.`) : null,
    resourceList(), button('Handluj w porcie', () => openPanel('trade')),
    el('h3', {}, 'Łańcuchy produkcji'), note('Las → drewno → tartak → deski. Kamieniołom → kamień. Farma i młyn → żywność.'),
    el('div', { class: 'panel-grid' }, productionBuildings.map(id => card(el('h3', {}, titleOf(id)), el('p', {}, 'Gotowe: ', el('span', { 'data-ready': id }, count(state.buildings[id].ready))),
      button('Odbierz', () => perform({ type: 'collect', building: id }), { disabled: !state.buildings[id].ready, 'data-collect': id }), button('Zarządzaj', () => openPanel('building', id), { class: 'action secondary' })))));
}
function residentsPanel() {
  return el('div', {}, el('div', { class: 'stat-grid' }, stat('Mieszkańcy', `${state.population}/${state.capacity}`), stat('Przydzieleni', totalWorkers(state)), stat('Szczęście', `${state.happiness}%`)),
    note('Wolni mieszkańcy mogą pracować w produkcji. Domy zwiększają miejsce w osadzie; dekoracje poprawiają szczęście.'),
    el('div', { class: 'panel-grid' }, productionBuildings.map(id => card(el('h3', {}, titleOf(id)), el('p', {}, `Pracownicy: ${state.buildings[id].workers}`),
      button('− Pracownik', () => perform({ type: 'assign', building: id, delta: -1 }), { class: 'action secondary', disabled: !state.buildings[id].workers }),
      button('+ Pracownik', () => perform({ type: 'assign', building: id, delta: 1 }))))),
    button('Rozbuduj domy', () => openPanel('building', 'house')));
}
function tradePanel() {
  return el('div', {}, note('Port wymienia zasoby na monety. Przed transakcją widzisz jej wynik i aktualny stan zapasów.'), resourceList(),
    el('div', { class: 'panel-grid' }, ['wood', 'stone', 'food', 'planks'].map(id => card(el('h3', {}, nameOf(id)),
      button(`Sprzedaj 10 → ${RESOURCES[id].price * 10} monet`, () => perform({ type: 'trade', resource: id, amount: 10 })),
      button(`Kup 10 za ${RESOURCES[id].price * 20} monet`, () => perform({ type: 'trade', resource: id, amount: 10, direction: 'buy' }), { class: 'action secondary' })))));
}
function tasksPanel() {
  return el('div', {}, button('Główny cel: stara latarnia', () => openPanel('objective')),
    TASKS.map(task => card(el('h3', {}, task.name), el('p', {}, task.description), el('p', { class: 'cost' }, `Nagroda: ${costText(task.reward)}`),
      button(state.tasks[task.id] ? 'Nagroda odebrana' : taskReady(state, task.id) ? 'Odbierz nagrodę' : 'Zadanie w toku', () => perform({ type: 'claim', task: task.id }), { disabled: !!state.tasks[task.id] || !taskReady(state, task.id) }))));
}
function decorationsPanel() {
  return el('div', {}, note('Dekoracje poprawiają szczęście mieszkańców. Każdy zakup zapisuje się w rozwoju osady.'),
    el('div', { class: 'panel-grid' }, [['flowers', 'Kwiaty przy domach', 25], ['lamp', 'Lampy na ścieżkach', 40], ['bench', 'Ławki na placu', 35]].map(([id, name, cost]) => card(el('h3', {}, name), el('p', {}, `Monety: ${cost} · posiadane: ${state.decorations?.[id] || 0}`), button('Dodaj dekorację', () => perform({ type: 'decorate', decoration: id }))))));
}
function pathsPanel() {
  return el('div', {}, note('Połącz dzielnice wyspy. Każde ulepszenie ścieżek kosztuje 5 drewna i 10 kamienia oraz podnosi szczęście o 1 punkt.'),
    stat('Ulepszone odcinki', state.paths || 0), button('Ulepsz ścieżki i most', () => perform({ type: 'path' })));
}
function settingsPanel() {
  const checkbox = (key, label) => el('label', { class: 'setting-row' }, el('span', {}, label), el('input', { type: 'checkbox', checked: !!state.settings[key], onchange: event => perform({ type: 'setting', key, value: event.target.checked }) }));
  return el('div', {}, checkbox('motion', 'Animacje i podświetlenia'), note('Postęp jest zapisywany automatycznie w tej przeglądarce.'),
    button('Zapisz teraz', () => { save(); toast('Postęp zapisany.'); }),
    button('Rozpocznij nową wyspę', () => openPanel('reset'), { class: 'action danger' }));
}
function timePanel() {
  return el('div', {}, stat('Dzień na wyspie', state.day), stat('Tempo', state.paused ? 'Pauza' : `${state.speed}×`),
    note('Pauza zatrzymuje zegar i produkcję. Zwiększenie tempa przyspiesza oba procesy.'),
    button(state.paused ? 'Wznów' : 'Pauza', () => perform({ type: 'pause' })),
    [1, 2, 4].map(speed => button(`${speed}×`, () => perform({ type: 'speed', speed }), { class: 'action secondary' })));
}
function expeditionsPanel() {
  return el('div', {}, note('Przejdź z obozu do celu. Zbieraj skrzynie, a narzędzia zachowaj na przeszkody. Nagrody zasilają zapasy wyspy.'),
    EXPEDITIONS.map(expedition => card(el('h3', {}, expedition.name), el('p', {}, expedition.description), el('p', { class: 'cost' }, `Nagroda: ${costText(expedition.reward)}`),
      state.expeditions[expedition.id]?.completed ? el('span', { class: 'badge' }, 'Ukończona') : null,
      button(state.expeditions[expedition.id]?.completed ? 'Zagraj ponownie bez nagrody' : 'Wyrusz', () => startExpedition(expedition.id)))));
}
function startExpedition(id) {
  const expedition = EXPEDITIONS.find(item => item.id === id);
  let row = 0, col = 0;
  expedition.map.forEach((line, r) => { if (line.includes('S')) { row = r; col = line.indexOf('S'); } });
  puzzle = { id, row, col, moves: 0, tools: { ...expedition.tools }, cleared: new Set(), collected: new Set(), key: false, complete: false, message: 'Wybierz sąsiednie pole, aby się poruszyć.' };
  openPanel('puzzle', id);
}
function move(row, col) {
  if (!puzzle || puzzle.complete || Math.abs(row - puzzle.row) + Math.abs(col - puzzle.col) !== 1) return;
  const expedition = EXPEDITIONS.find(item => item.id === puzzle.id);
  const id = `${row},${col}`;
  const terrain = puzzle.cleared.has(id) ? '.' : expedition.map[row]?.[col];
  if (terrain == null) return;
  if (terrain === 'D' && !puzzle.key) { puzzle.message = 'Znajdź klucz, aby otworzyć bramę.'; renderPanel(); return; }
  const tool = { W: 'bridge', T: 'axe', R: 'dynamite' }[terrain];
  if (tool) {
    if (!puzzle.tools[tool]) { puzzle.message = 'Brak odpowiedniego narzędzia. Poszukaj innej drogi.'; renderPanel(); return; }
    puzzle.tools[tool]--; puzzle.cleared.add(id);
  }
  puzzle.row = row; puzzle.col = col; puzzle.moves++;
  puzzle.message = 'Wybierz sąsiednie pole, aby się poruszyć.';
  if (terrain === 'K') { puzzle.key = true; puzzle.collected.add(id); puzzle.message = 'Klucz znaleziony.'; }
  if (terrain === 'C' && !puzzle.collected.has(id)) { puzzle.collected.add(id); puzzle.message = 'Skrzynia znaleziona. Dotrzyj do celu, aby odebrać nagrodę.'; }
  if (terrain === 'G') {
    puzzle.complete = true;
    const caches = [...puzzle.collected].filter(key => { const [r, c] = key.split(',').map(Number); return expedition.map[r][c] === 'C'; }).length;
    const result = act(state, { type: 'expeditionComplete', expedition: puzzle.id, moves: puzzle.moves, caches });
    puzzle.message = result.message;
    save(); renderHUD(); toast(result.message);
  }
  renderPanel();
}
function puzzlePanel() {
  const expedition = EXPEDITIONS.find(item => item.id === puzzle.id);
  const names = { S: 'Obóz', '.': 'Ścieżka', W: 'Woda — most', T: 'Drzewo — siekiera', R: 'Skała — dynamit', C: 'Skrzynia', G: 'Cel', K: 'Klucz', D: 'Brama' };
  const icons = { S: '⌂', '.': '·', W: '≈', T: '♠', R: '◆', C: '▣', G: '⚑', K: '⚿', D: '▥' };
  const board = el('div', { class: 'puzzle-board', style: { '--cols': expedition.map[0].length }, 'aria-label': 'Plansza ekspedycji' });
  expedition.map.forEach((line, row) => [...line].forEach((original, col) => {
    const id = `${row},${col}`;
    const tile = puzzle.cleared.has(id) || puzzle.collected.has(id) ? '.' : original;
    const isPlayer = row === puzzle.row && col === puzzle.col;
    const reachable = Math.abs(row - puzzle.row) + Math.abs(col - puzzle.col) === 1;
    board.append(button(isPlayer ? '●' : icons[tile], () => move(row, col), { class: `puzzle-cell${isPlayer ? ' is-player' : ''}${reachable ? ' reachable' : ''}`, 'data-tile': tile,
      'aria-label': `${isPlayer ? 'Twoja pozycja' : names[tile]}, wiersz ${row + 1}, kolumna ${col + 1}`, disabled: puzzle.complete || !reachable, 'data-row': row, 'data-col': col }));
  }));
  return el('div', {}, el('div', { class: 'puzzle-tools' }, `Kroki: ${puzzle.moves} · Cel: ${expedition.par || '—'} · Mosty: ${puzzle.tools.bridge || 0} · Siekiery: ${puzzle.tools.axe || 0} · Dynamit: ${puzzle.tools.dynamite || 0}`),
    board, el('p', { class: 'puzzle-status', role: 'status' }, puzzle.message),
    note('● Twoja pozycja · ⚑ cel · ▣ skrzynia · ≈ woda · ♠ drzewo · ◆ skała. Możesz poruszać się tylko w górę, dół, lewo i prawo.'),
    puzzle.complete ? button('Wróć na wyspę', closePanel) : button('Zacznij ekspedycję od nowa', () => startExpedition(puzzle.id), { class: 'action secondary' }),
    button('Lista ekspedycji', () => openPanel('expeditions'), { class: 'action secondary' }));
}
function renderPanel() {
  if (!panel) return;
  const titles = { home: 'Twoja wyspa', menu: 'HARBORLIGHT', buildings: 'Budynki', resources: 'Magazyn i produkcja', residents: 'Mieszkańcy', trade: 'Handel w porcie', tasks: 'Zadania', objective: 'Przywróć światło latarni', settings: 'Ustawienia', time: 'Czas na wyspie', expeditions: 'Ekspedycje', map: 'Mapa wyspy', decorations: 'Dekoracje', paths: 'Ścieżki i mosty', reset: 'Nowa wyspa' };
  let title = titles[panel.kind] || titleOf(panel.id);
  let body;
  switch (panel.kind) {
    case 'building': body = buildingPanel(panel.id); break;
    case 'buildings': body = buildingsPanel(); break;
    case 'resources': body = resourcesPanel(panel.id); break;
    case 'residents': body = residentsPanel(); break;
    case 'trade': body = tradePanel(); break;
    case 'tasks': body = tasksPanel(); break;
    case 'objective': body = objectivePanel(); break;
    case 'settings': body = settingsPanel(); break;
    case 'time': body = timePanel(); break;
    case 'decorations': body = decorationsPanel(); break;
    case 'paths': body = pathsPanel(); break;
    case 'expeditions': body = expeditionsPanel(); break;
    case 'puzzle': title = EXPEDITIONS.find(item => item.id === puzzle.id).name; body = puzzlePanel(); break;
    case 'map': body = el('div', {}, note('Wybierz dzielnicę, aby znaleźć ją na wyspie.'), el('div', { class: 'panel-grid' }, Object.keys(buildingRegions).map(id => button(titleOf(id), () => {
      closePanel(); const node = document.getElementById(`hit-world-${id}`); node.focus(); node.classList.add('world-pulse'); setTimeout(() => node.classList.remove('world-pulse'), 3000);
    })))); break;
    case 'reset': body = el('div', {}, note('Rozpoczęcie nowej wyspy usunie obecny postęp tego trybu w tej przeglądarce.'), button('Tak, rozpocznij od nowa', () => { state = createState(); puzzle = null; save(); renderHUD(); openPanel('home'); toast('Nowa wyspa jest gotowa.'); }, { class: 'action danger' }), button('Zachowaj moją wyspę', () => openPanel('settings'), { class: 'action secondary' })); break;
    default: body = el('div', {}, note('Odbuduj latarnię, zarządzaj osadą i zdobywaj materiały podczas ekspedycji.'),
      el('div', { class: 'stat-grid' }, stat('Mieszkańcy', `${state.population}/${state.capacity}`), stat('Szczęście', `${state.happiness}%`), stat('Dzień', state.day)),
      el('div', { class: 'panel-grid' }, [['objective', 'Główny cel'], ['buildings', 'Budynki'], ['expeditions', 'Ekspedycje'], ['tasks', 'Zadania'], ['residents', 'Mieszkańcy'], ['resources', 'Magazyn'], ['trade', 'Handel'], ['settings', 'Ustawienia']].map(([kind, label]) => button(label, () => openPanel(kind)))),
      button('Wróć na wyspę', closePanel, { class: 'action secondary' }));
  }
  const scroll = dialog.querySelector('.dialog-body')?.scrollTop || 0;
  dialog.replaceChildren(el('header', { class: 'dialog-header' }, el('div', {}, el('span', { class: 'eyebrow' }, 'HARBORLIGHT · WYSPA 01'), el('h2', { id: 'dialog-title' }, title)), button('×', closePanel, { class: 'dialog-close', 'aria-label': 'Zamknij okno' })), el('div', { class: 'dialog-body' }, panelNotice ? el('p', { class: 'notice action-feedback', role: 'status' }, panelNotice) : null, body));
  dialog.querySelector('.dialog-body').scrollTop = scroll;
}

renderHUD();
createAmbientScene(stage, () => state).ready.catch(error => {
  console.error(error);
  toast('Nie udało się wczytać animacji wyspy. Odśwież stronę, aby spróbować ponownie.');
});
setInterval(() => {
  const now = performance.now();
  const elapsed = Math.min((now - lastTick) / 1000, 5);
  lastTick = now;
  tick(state, elapsed);
  renderHUD();
}, 1000);
setInterval(save, 10000);
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); lastTick = performance.now(); });
