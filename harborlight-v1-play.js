import { BUILDINGS, RESOURCES, EXPEDITIONS, TASKS, createState, normalizeState, act, tick, buildingCost, canAfford, taskReady, totalWorkers, populationRate, housingCapacity, unhousedResidents, buildingLevelLimit, upgradeEligibility, CONSTRUCTION_IDS, WORKPLACE_IDS, workerLimit, freeWorkers, taxRate, happinessGroups, workplaceUnlocked, storagePenalty, recordVisit } from './harborlight-v1-state.js?v=economy-v6';
import { MATERIAL_IDS, PRODUCTION_RECIPES, warehouseLimits, warehouseUsed, stockRoom, producerCapacity, marketCapacity, marketUsed, nextConstruction, constructionCounts, premiumActive, estimateMaterialsSeconds, plannedLevel } from './harborlight-v1-logistics.js?v=economy-v6';
import { createAmbientScene } from './harborlight-v1-ambient.js?v=living-world-3';

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

function settleActiveTick(allowHidden = false) {
  const now = performance.now();
  const elapsed = Math.min((now - lastTick) / 1000, 5);
  lastTick = now;
  if (!document.hidden || allowHidden) tick(state, elapsed);
}

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
const nameOf = id => RESOURCES[id]?.name || ({ coins: 'Monety', wood: 'Drewno', stone: 'Kamień', food: 'Żywność', planks: 'Deski', grain: 'Zboże' }[id]) || id;
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
  // Settle the preceding time under its old pause, speed and happiness values.
  settleActiveTick();
  const focused = dialog.contains(document.activeElement) ? document.activeElement : null;
  const focusPriority = focused?.dataset.priorityResource;
  const focusPriorityDirection = focused?.dataset.priorityDirection;
  const focusLabel = focused?.textContent;
  const focusWorker = focused?.dataset.workerBuilding;
  const focusWorkerAction = focused?.dataset.workerAction;
  const focusWorkerDelta = focused?.dataset.workerDelta;
  const result = act(state, action);
  panelNotice = result.message;
  if (result.ok) { save(); renderHUD(); }
  toast(result.message);
  if (panel && dialog.open) {
    renderPanel();
    const target = focusPriority ? dialog.querySelector(`[data-priority-resource="${focusPriority}"][data-priority-direction="${focusPriorityDirection}"]`) : focusWorker ? dialog.querySelector(`[data-worker-building="${focusWorker}"][${focusWorkerAction ? `data-worker-action="${focusWorkerAction}"` : `data-worker-delta="${focusWorkerDelta}"`}]`) : [...dialog.querySelectorAll('button,input')].find(node => node.textContent === focusLabel && !node.disabled);
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
const topbar = el('nav', { class: 'island-topbar', 'aria-label': 'Poziom, szczęście i zasoby wyspy' });
layer.append(topbar);
function toolbarButton(id, label, className, ...children) {
  const node = document.getElementById(`hit-${id}`);
  node.classList.add('topbar-button', ...className.split(' ').filter(Boolean));
  node.removeAttribute('style');
  node.setAttribute('aria-label', label);
  node.replaceChildren(...children);
  topbar.append(node);
  return node;
}
function toolbarStat(id, label, icon, className = '') {
  hud[id] = el('strong', { 'data-hud': id }, '—');
  return [el('span', { class: 'topbar-icon', 'aria-hidden': 'true' }, icon), el('span', { class: `topbar-copy ${className}` }, el('small', {}, label), hud[id])];
}
toolbarButton('home', 'HARBORLIGHT — podsumowanie wyspy', 'topbar-brand', el('span', { class: 'topbar-emblem', 'aria-hidden': 'true' }, '♜'), el('span', {}, 'HARBORLIGHT', el('small', {}, 'TWOJA WYSPA')));
hotspot('level', 'Poziom wyspy — ratusz', [0, 0, 0, 0], () => openPanel('building', 'townhall'));
toolbarButton('level', 'Poziom wyspy — ratusz', 'topbar-level', ...toolbarStat('level', 'Poziom', '♜'));
hotspot('happiness', 'Szczęście i zmiana populacji', [0, 0, 0, 0], () => openPanel('residents'));
toolbarButton('happiness', 'Szczęście i zmiana populacji', 'topbar-happiness', ...toolbarStat('happiness', 'Szczęście', '☀︎'));
hotspot('resource-planks', 'Deski — zapasy', [0, 0, 0, 0], () => openPanel('resources', 'planks'));
hotspot('resource-grain', 'Zboże — zapasy', [0, 0, 0, 0], () => openPanel('resources', 'grain'));
for (const [id, icon] of [['coins', '◉'], ['wood', '▰'], ['stone', '◆'], ['grain', '♧'], ['food', '✦'], ['planks', '▤']]) {
  toolbarButton(`resource-${id}`, `${nameOf(id)} — zapasy`, `topbar-resource topbar-${id}`, ...toolbarStat(id, nameOf(id), icon));
}
toolbarButton('population', 'Mieszkańcy i przydział pracowników', 'topbar-population', ...toolbarStat('population', 'Mieszkańcy', '♟︎'));
hud.taxes = el('small', { class: 'topbar-tax', 'data-hud': 'taxes' }, '—');
document.querySelector('.topbar-coins .topbar-copy').append(hud.taxes);
hud.housing = el('small', { class: 'topbar-housing', 'data-hud': 'housing' }, '—');
document.querySelector('.topbar-population .topbar-copy').append(hud.housing);
hud.clock = el('strong', { 'data-hud': 'clock' }, '—');
toolbarButton('clock', 'Dzień i czas na wyspie', 'topbar-clock', hud.clock);
for (const [id, icon, label] of [['pause', 'Ⅱ', 'Wstrzymaj upływ czasu'], ['play', '▶︎', 'Wznów upływ czasu'], ['speed', '1×', 'Zmień prędkość czasu'], ['settings', '⚙︎', 'Ustawienia'], ['menu', '☰', 'Menu gry']]) {
  const control = toolbarButton(id, label, 'topbar-control', el('span', { 'aria-hidden': 'true' }, icon));
  if (id === 'speed') hud.speed = control.firstChild;
}
hotspot('notifications', 'Powiadomienia', [0, 0, 0, 0], () => openPanel('notifications'));
hud.notifications = el('span', { 'data-notification-count': '' }, '0');
toolbarButton('notifications', 'Powiadomienia', 'topbar-control notification-button', el('span', { 'aria-hidden': 'true' }, '🔔'), hud.notifications);
const mobileHud = el('nav', { class: 'mobile-island-hud', 'aria-label': 'Stan wyspy' });
const mobileSummary = el('div', { class: 'mobile-hud-summary' });
const mobileResources = el('div', { class: 'mobile-hud-resources' });
const mobileHudValues = {};
for (const [id, label, action] of [['level', 'Poziom', () => openPanel('building', 'townhall')], ['happiness', 'Szczęście', () => openPanel('residents')], ['population', 'Mieszkańcy', () => openPanel('residents')], ...Object.keys(RESOURCES).map(id => [id, nameOf(id), () => openPanel('resources', id)])]) {
  mobileHudValues[id] = el('strong', { 'data-mobile-hud': id }, '—');
  const node = button(label, action, { class: 'mobile-hud-item' });
  node.replaceChildren(el('small', {}, label), mobileHudValues[id]);
  if (id === 'coins') {
    mobileHudValues.taxes = el('span', { class: 'mobile-tax', 'data-mobile-hud': 'taxes' }, '—');
    node.append(mobileHudValues.taxes);
  }
  if (id === 'population') {
    mobileHudValues.housing = el('span', { class: 'mobile-housing', 'data-mobile-hud': 'housing' }, '—');
    node.append(mobileHudValues.housing);
  }
  (['level', 'happiness', 'population'].includes(id) ? mobileSummary : mobileResources).append(node);
}
mobileHud.append(mobileSummary, mobileResources);
document.body.append(mobileHud);
for (const [id, y] of [['repair', 150], ['wood', 179], ['stone', 207]]) {
  hud[`objective-${id}`] = el('span', { class: 'live-objective', 'aria-hidden': 'true', style: { left: '1603px', top: `${y}px`, width: '45px', height: '20px' } });
  layer.append(hud[`objective-${id}`]);
}
const happinessText = () => {
  const rounded = Math.round(Math.abs(state.happiness) * 10) / 10;
  return `${rounded ? state.happiness > 0 ? '+' : '−' : ''}${rounded.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%`;
};
function renderHUD() {
  hud.notifications.textContent = state.notifications.filter(item => !item.read).length;
  for (const id of Object.keys(RESOURCES)) {
    hud[id].textContent = count(state.resources[id]);
    document.getElementById(`hit-resource-${id}`).setAttribute('aria-label', `${nameOf(id)}: ${count(state.resources[id])} — zapasy`);
  }
  hud.population.textContent = `${state.population} / ${state.capacity}`;
  hud.taxes.textContent = `Podatki: ${taxRate(state)}/h`;
  hud.housing.textContent = `Miejsca: ${housingCapacity(state)}`;
  hud.level.textContent = state.buildings.townhall.level;
  hud.happiness.textContent = happinessText();
  document.getElementById('hit-level').setAttribute('aria-label', `Poziom ${state.buildings.townhall.level} — ratusz; limit ${state.capacity} mieszkańców`);
  document.getElementById('hit-happiness').setAttribute('aria-label', `Szczęście: ${happinessText()} — mieszkańcy i zmiana populacji`);
  document.getElementById('hit-happiness').dataset.sentiment = state.happiness > 0 ? 'positive' : state.happiness < 0 ? 'negative' : 'neutral';
  document.getElementById('hit-population').setAttribute('aria-label', `Mieszkańcy: ${state.population}; limit ratusza: ${state.capacity}; miejsca w domu: ${housingCapacity(state)}; bez miejsca: ${unhousedResidents(state)}; pracuje: ${totalWorkers(state)}; wolni: ${freeWorkers(state)} — mieszkańcy i przydział pracowników`);
  document.getElementById('hit-population').dataset.overcrowded = String(unhousedResidents(state) > 0);
  for (const id of Object.keys(mobileHudValues)) mobileHudValues[id].textContent = hud[id].textContent;
  mobileHudValues.happiness.dataset.sentiment = document.getElementById('hit-happiness').dataset.sentiment;
  hud.clock.textContent = `Dzień ${state.day}\n${String(Math.floor(state.minutes / 60)).padStart(2, '0')}:${String(Math.floor(state.minutes % 60)).padStart(2, '0')}`;
  hud['objective-repair'].textContent = state.objective.repaired ? '1/1' : '0/1';
  const lighthouseCost = buildingCost(state, 'lighthouse');
  hud['objective-wood'].textContent = `${Math.min(state.resources.wood, lighthouseCost.wood)}/${lighthouseCost.wood}`;
  hud['objective-stone'].textContent = `${Math.min(state.resources.stone, lighthouseCost.stone)}/${lighthouseCost.stone}`;
  hud.speed.textContent = `${state.speed}×`;
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
    node.classList.toggle('under-construction', !!value.construction);
    let constructionBadge = node.querySelector('.construction-badge');
    if (value.construction) {
      if (!constructionBadge) { constructionBadge = el('span', { class: 'construction-badge' }); node.append(constructionBadge); }
      constructionBadge.textContent = value.construction.stage === 'transport' ? '▰ Transport' : value.construction.stage === 'building' ? '⚒ Budowa' : '◷ Kolejka';
    } else constructionBadge?.remove();
    node.setAttribute('aria-label', `${titleOf(id)}, poziom ${value.level}${value.construction ? ', trwa rozbudowa' : value.ready ? ', produkcja gotowa do odbioru' : ''}`);
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
  if (panel?.kind === 'construction' && dialog.open) {
    const signature = constructionSignature();
    if (dialog.querySelector('[data-construction-signature]')?.dataset.constructionSignature !== signature) renderPanel();
  }
  dialog.querySelectorAll('[data-lighthouse-bonus]').forEach(node => { node.textContent = lighthouseDescription(); });
  dialog.querySelectorAll('[data-project-status]').forEach(node => { const project = state.constructionProjects.find(item => item.order === Number(node.dataset.projectStatus)); node.textContent = project ? projectDescription(project) : 'Zakończono'; });
  dialog.querySelectorAll('[data-construction-summary]').forEach(node => { node.textContent = constructionSummary(); });
  if (panel?.kind === 'building' && dialog.open) {
    const current = state.buildings[panel.id];
    const signature = `${current.level}:${current.construction?.stage || ''}`;
    if (dialog.querySelector('[data-building-signature]')?.dataset.buildingSignature !== signature) renderPanel();
  }
  dialog.querySelectorAll('[data-construction-status]').forEach(node => { node.textContent = constructionDescription(node.dataset.constructionStatus); });
  dialog.querySelectorAll('[data-upgrade-building]').forEach(node => { const id = node.dataset.upgradeBuilding; node.disabled = !upgradeEligibility(state, id).ok || (!premiumActive(state) && !canAfford(state, buildingCost(state, id))); });
  dialog.querySelectorAll('[data-upgrade-cost]').forEach(node => { const available = state.resources[node.dataset.upgradeCost], required = Number(node.dataset.required); node.textContent = `${count(available)} / ${count(required)}`; node.classList.toggle('is-affordable', available >= required); node.classList.toggle('is-short', available < required); node.setAttribute('aria-label', `${nameOf(node.dataset.upgradeCost)}: w magazynie ${count(available)}, potrzeba ${count(required)}; ${available >= required ? 'wystarcza' : 'brakuje'}`); });
  dialog.querySelectorAll('[data-stock]').forEach(node => { node.textContent = count(state.resources[node.dataset.stock]); });
  const live = { population: `${state.population} / ${state.capacity}`, workers: totalWorkers(state), free: freeWorkers(state), returning: (state.returningWorkers || []).length, 'next-return': returnDescription(), 'worker-limit': Math.floor(state.population / 2), taxes: `${taxRate(state)} monet/h`, 'tax-countdown': taxDescription(), happiness: happinessText(), level: state.buildings.townhall.level, growth: populationDescription(), capacity: state.capacity, housing: housingCapacity(state), unhoused: unhousedResidents(state), penalty: housingPenaltyText(), 'housing-status': housingDescription() };
  dialog.querySelectorAll('[data-population-stat]').forEach(node => { node.textContent = live[node.dataset.populationStat]; });
  dialog.querySelectorAll('[data-housing-warning]').forEach(node => { node.dataset.overcrowded = String(unhousedResidents(state) > 0); });
  dialog.querySelectorAll('[data-logistics-stat]').forEach(node => { node.textContent = logisticsStatValue(node.dataset.logisticsStat); });
  dialog.querySelectorAll('[data-local-buffer],[data-local-overview]').forEach(node => {
    const value = state.buildings[(node.dataset.localBuffer || node.dataset.localOverview)].ready;
    node.textContent = `${count(value)} / ${count(producerCapacity(state))}`;
    node.dataset.value = value;
    node.dataset.limit = producerCapacity(state);
  });
  dialog.querySelectorAll('[data-local-rate]').forEach(node => { node.textContent = `${state.buildings[node.dataset.localRate].workers * (state.lighthouseRemaining > 0 ? 20 : 10)} szt./h`; });
  dialog.querySelectorAll('[data-work-progress]').forEach(node => { node.textContent = productionDescription(node.dataset.workProgress); });
  dialog.querySelectorAll('[data-central-resource]').forEach(node => {
    const id = node.dataset.centralResource, limits = warehouseLimits(state);
    node.textContent = `${count(state.resources[id])} / ${count(limits.perResource)}`;
    node.dataset.value = state.resources[id]; node.dataset.limit = limits.perResource;
  });
  dialog.querySelectorAll('[data-pending-resource]').forEach(node => { node.textContent = count(state.pendingDeliveries?.[node.dataset.pendingResource] || 0); });
  dialog.querySelectorAll('[data-worker-count]').forEach(node => { node.textContent = state.buildings[node.dataset.workerCount].workers; });
  dialog.querySelectorAll('[data-worker-limit]').forEach(node => { node.textContent = workerLimit(state, node.dataset.workerLimit); });
  dialog.querySelectorAll('[data-workplace-tax]').forEach(node => { node.textContent = `${state.buildings[node.dataset.workplaceTax].workers * (state.chapelRemaining > 0 ? 2 : 1)} monet/h`; });
  dialog.querySelectorAll('[data-full-penalty]').forEach(node => { node.textContent = fullPenaltyDescription(node.dataset.fullPenalty); });
  dialog.querySelectorAll('[data-chapel-time]').forEach(node => { node.textContent = blessingDescription(); });
  dialog.querySelectorAll('[data-blessing]').forEach(node => { node.disabled = state.blessingRemaining > 0 || state.blessingsUsed >= state.buildings.chapel.level; });
  dialog.querySelectorAll('[data-market-used]').forEach(node => { node.textContent = `${count(marketUsed(state))} / ${count(marketCapacity(state))}`; });
  dialog.querySelectorAll('[data-market-stock]').forEach(node => { node.textContent = count(state.market.stock[node.dataset.marketStock]); });
  dialog.querySelectorAll('[data-market-locked]').forEach(node => { node.textContent = count(state.market.locked.filter(lot => lot.resource === node.dataset.marketLocked).reduce((sum, lot) => sum + lot.amount, 0)); });
  dialog.querySelectorAll('[data-market-timer]').forEach(node => { node.textContent = state.market.locked.length ? durationText(Math.min(...state.market.locked.map(lot => lot.remaining))) : 'Brak zablokowanych towarów'; });
  dialog.querySelectorAll('[data-happiness-breakdown]').forEach(node => { node.replaceChildren(...happinessBreakdown()); });
  dialog.querySelectorAll('[data-worker-building]').forEach(node => {
    const id = node.dataset.workerBuilding, building = state.buildings[id];
    node.disabled = node.dataset.workerAction === 'clear' || Number(node.dataset.workerDelta) < 0 ? building.workers === 0 : freeWorkers(state) <= 0 || building.workers >= workerLimit(state, id);
  });
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
function constructionSummary() {
  const counts = constructionCounts(state);
  return `Budowy: ${counts.active} / ${counts.limit} · Kolejka: ${counts.queued} / ${counts.premium ? 'bez limitu' : counts.queueLimit}${counts.premium ? ' · Pakiet aktywny' : ''}`;
}
function constructionSignature() { return JSON.stringify([premiumActive(state), state.buildings.townhall.level, state.constructionProjects.map(p => [p.order, p.stage])]); }
function projectDescription(project) {
  if (project.stage === 'planned') {
    if (!premiumActive(state)) return 'Plan czeka na ponowną aktywację pakietu. Materiały nie są zarezerwowane.';
    const estimate = estimateMaterialsSeconds(state, project.cost);
    return Number.isFinite(estimate) ? `Czeka na materiały. Najwcześniejsza szacowana dostawa: ${durationText(estimate)}; inne zużycie zasobów może ją opóźnić.` : 'Czeka na materiały. Brakuje produkcji, transportu lub miejsca na potrzebne dostawy.';
  }
  if (project.stage === 'queued') return 'Materiały opłacone i zarezerwowane. Czeka na miejsce budowy lub zakończenie wcześniejszego poziomu.';
  if (project.stage === 'building') return `Budowa poziomu ${project.targetLevel}: pozostało ${durationText(project.buildRemaining)}. Transport trwał ${durationText(project.transportSeconds)}.`;
  const delivered = project.goodsTotal - project.goodsRemaining;
  const waiting = nextConstruction(state)?.order !== project.order ? 'Czeka na wcześniejszy transport.' : !state.buildings.warehouse.workers ? 'Przydziel magazynierów, aby wznowić dostawy.' : `Szacowany pozostały transport: ${durationText(Math.ceil(project.goodsRemaining / state.buildings.warehouse.workers) * 60)}.`;
  return `Transport na poziom ${project.targetLevel}: ${count(delivered)} / ${count(project.goodsTotal)} sztuk. ${waiting}`;
}
function constructionDescription(id) {
  const project = state.buildings[id].construction;
  if (project) return projectDescription(project);
  const workers = state.buildings.warehouse.workers;
  const goods = MATERIAL_IDS.reduce((sum, resource) => sum + (buildingCost(state, id)?.[resource] || 0), 0);
  return workers ? `Szacowany transport: ${durationText(Math.ceil(goods / workers) * 60)}. Budowa potrwa ${id === 'lighthouse' ? 'dwa razy tyle co transport' : 'drugie tyle'}. Przydział magazynierów może zmienić czas transportu.` : 'Transport czeka na przydzielenie magazynierów (60 sztuk/osobę/h). Potem budowa potrwa tyle samo co transport.';
}
function constructionPanel() {
  const projects = state.constructionProjects;
  return el('div', { 'data-construction-signature': constructionSignature() },
    el('p', { class: 'notice', 'data-construction-summary': '' }, constructionSummary()),
    note('Zwykły limit budów i kolejki jest równy poziomowi ratusza. Materiały w opłaconej kolejce są już zarezerwowane. Magazynierzy dostarczają najpierw materiały na wcześniejsze budowy, a potem odbierają produkcję.'),
    premiumActive(state) ? note(`Pakiet daje +4 miejsca budowy, kolejkę bez limitu i plany z przyszłych dostaw. Ważny do ${new Date(state.premium.expiresAt).toLocaleString('pl-PL')}.`) : note('Przyszły pakiet: +4 miejsca budowy, kolejka bez limitu i planowanie z dostaw. Zakup i cena będą zdefiniowane później.'),
    ...projects.map(project => card(el('h3', {}, `${titleOf(project.building)} → poziom ${project.targetLevel}`),
      el('p', { 'data-project-status': project.order }, projectDescription(project)),
      el('p', { class: 'cost' }, costText(project.cost)),
      button('Budynek', () => openPanel('building', project.building), { class: 'action secondary' }))),
    !projects.length ? note('Brak zaplanowanych rozbudów. Wybierz budynek na wyspie.') : null);
}
function upgradeCostView(cost) {
  return el('div', { class: 'upgrade-costs', 'aria-label': 'Zasoby w magazynie względem kosztu rozbudowy' }, Object.entries(cost).map(([id, required]) => {
    const available = state.resources[id];
    return el('div', { class: 'upgrade-cost-row' }, el('span', {}, nameOf(id)), el('strong', { class: available >= required ? 'is-affordable' : 'is-short', 'data-upgrade-cost': id, 'data-required': required, 'aria-label': `${nameOf(id)}: w magazynie ${count(available)}, potrzeba ${count(required)}; ${available >= required ? 'wystarcza' : 'brakuje'}` }, `${count(available)} / ${count(required)}`));
  }));
}
function buildingPanel(id) {
  const data = BUILDINGS[id];
  const value = state.buildings[id];
  const content = el('div', { 'data-building-signature': `${value.level}:${value.construction?.stage || ''}` }, note(data.description || data.desc || 'Rozwijaj budynek, aby zwiększyć możliwości osady.'),
    el('div', { class: 'stat-grid' }, stat('Poziom', value.level || 'Ruina'), id === 'townhall' ? stat('Mieszkańcy', el('span', { 'data-population-stat': 'population' }, `${state.population} / ${state.capacity}`)) : null, id === 'townhall' ? stat('Podatki na godzinę', el('span', { 'data-population-stat': 'taxes' }, `${taxRate(state)} monet/h`)) : null, productionBuildings.includes(id) ? stat('Bufor przy budynku', el('span', { 'data-local-overview': id, 'data-value': value.ready, 'data-limit': producerCapacity(state) }, `${count(value.ready)} / ${count(producerCapacity(state))}`)) : null));
  if (WORKPLACE_IDS.includes(id)) content.append(workplaceCard(id));
  if (id === 'warehouse') content.append(warehouseOverview(), transportPriorityPanel());
  if (id === 'market') content.append(marketPanel());
  if (id === 'chapel') content.append(blessingPanel());
  if (id === 'house') content.append(card(el('h3', {}, 'Miejsca do zamieszkania'),
    el('div', { class: 'stat-grid' }, stat('Miejsca w domu', el('span', { 'data-population-stat': 'housing' }, housingCapacity(state))), stat('Limit ratusza', el('span', { 'data-population-stat': 'capacity' }, state.capacity))),
    housingNotice(), note('Każdy poziom domu daje 24 miejsca. Rozbudowa nie dodaje od razu mieszkańców; usuwa brak miejsc i zatrzymuje dalszą karę za przeludnienie.')));
  if (id === 'townhall') content.append(note(`Dom zapewnia ${housingCapacity(state)} miejsc mieszkalnych.`));
  if (id === 'lighthouse') content.append(el('p', { class: 'notice', 'data-lighthouse-bonus': '' }, lighthouseDescription()));
  if (id === 'lighthouse') content.append(note('Latarnia jest naprawiona i świeci. Możesz rozwijać ją dalej do poziomu ratusza.'));
  const cost = buildingCost(state, id);
  const maxLevel = value.level >= data.maxLevel;
  const eligibility = upgradeEligibility(state, id);
  const townhallLocked = !maxLevel && !eligibility.ok;
  if (value.construction) {
    content.append(card(el('h3', {}, `Rozbudowa do poziomu ${value.construction.targetLevel}`),
      el('p', { class: 'construction-status', 'data-construction-status': id }, constructionDescription(id)),
      note('Dotychczasowy poziom działa do zakończenia rozbudowy. Pauza i ukrycie karty zatrzymują oba etapy.')));
  }
  content.append(card(el('h3', {}, maxLevel ? 'Budynek w pełni rozwinięty' : value.construction ? `Kolejny poziom: ${plannedLevel(state, id) + 1}` : value.level ? 'Ulepszenie budynku' : 'Budowa'),
    maxLevel ? null : upgradeCostView(cost),
    maxLevel ? null : note('Materiały na rozbudowę pochodzą z magazynu centralnego, a monety ze skarbca.'),
    !maxLevel && CONSTRUCTION_IDS.includes(id) ? el('p', { class: 'notice', 'data-construction-status': id }, constructionDescription(id)) : null,
    !maxLevel && !canAfford(state, cost) ? note(premiumActive(state) ? 'Pakiet pozwala dodać plan oczekujący na dostawy. Koszt zostanie pobrany po zgromadzeniu całości.' : 'Zgromadź cały koszt w magazynie centralnym, aby rozpocząć rozbudowę.') : null,
    townhallLocked ? el('p', { class: 'notice building-lock', 'data-upgrade-lock': id }, eligibility.message) : null,
    button(maxLevel ? 'Maksymalny poziom' : value.level ? 'Ulepsz' : 'Buduj', () => perform({ type: value.level ? 'upgrade' : 'build', building: id }), { disabled: maxLevel || townhallLocked || (!premiumActive(state) && !canAfford(state, cost)), 'data-upgrade-building': id }),
    townhallLocked ? button('Rozbuduj ratusz', () => openPanel('building', 'townhall'), { class: 'action secondary' }) : null));
  content.append(el('p', { class: 'notice', 'data-construction-summary': '' }, constructionSummary()), button('Budowy i kolejka', () => openPanel('construction'), { class: 'action secondary' }));
  if (productionBuildings.includes(id)) content.append(productionCard(id));
  if (WORKPLACE_IDS.includes(id)) content.append(button('Zarządzaj wszystkimi pracownikami', () => openPanel('residents'), { class: 'action secondary' }));
  return content;
}
function stat(label, value) { return el('div', { class: 'stat' }, el('small', {}, label), el('strong', {}, value)); }
function lighthouseDescription() {
  return state.lighthouseRemaining > 0 ? `Premia latarni: +100 szczęścia i produkcja materiałów ×2. Pozostało ${durationText(state.lighthouseRemaining)}. Podatki bez zmian.` : 'Ukończ budowę lub rozbudowę: +100 szczęścia oraz produkcja materiałów ×2 przez 24 h × osiągnięty poziom.';
}
function objectivePanel() {
  return el('div', {}, note(state.objective.repaired ? 'Latarnia znów świeci. Rozbuduj ją, aby uruchomić kolejną premię.' : 'Zgromadź po 500 każdego zasobu, również złota. Magazynierzy przewiozą materiały, a budowa potrwa dwa razy tyle co transport.'),
    el('p', { class: 'notice', 'data-lighthouse-bonus': '' }, lighthouseDescription()),
    button('Latarnia Morska — budowa i rozbudowa', () => openPanel('building', 'lighthouse')),
    button('Budowy i kolejka', () => openPanel('construction'), { class: 'action secondary' }));
}
function buildingsPanel() {
  return el('div', {}, note(`Poziom ratusza ${state.buildings.townhall.level} pozwala rozbudowywać pozostałe budynki do tego samego poziomu.`),
    el('div', { class: 'panel-grid' }, Object.keys(BUILDINGS).map(id => card(el('h3', {}, titleOf(id)), el('p', {}, `Poziom ${state.buildings[id].level} / ${buildingLevelLimit(state, id)}`), button('Szczegóły i rozbudowa', () => openPanel('building', id))))));
}
function resourcesPanel(selected) {
  return el('div', {}, selected ? note(`${nameOf(selected)} — zapas w ${selected === 'coins' ? 'skarbcu' : 'magazynie centralnym'}: ${count(state.resources[selected])}.`) : null,
    selected === 'coins' ? card(el('h3', {}, 'Skarbiec i podatki'),
      stat('Monety', el('span', { 'data-stock': 'coins' }, count(state.resources.coins))),
      stat('Wpływy podatkowe', el('span', { 'data-population-stat': 'taxes' }, `${taxRate(state)} monet/h`)),
      el('p', { class: 'workforce-income', 'data-population-stat': 'tax-countdown' }, taxDescription()),
      note('Monety są przechowywane osobno i nie zajmują miejsca na towary.'),
      button('Zarządzaj pracownikami', () => openPanel('residents'), { class: 'action secondary' })) : null,
    warehouseOverview(),
    button('Handluj w porcie', () => openPanel('trade')), button('Magazyn i przewoźnicy', () => openPanel('building', 'warehouse'), { class: 'action secondary' }),
    el('h3', {}, 'Produkcja i transport'),
    note('Farma → zboże → młyn → żywność. Las → drewno → tartak → deski. Kamieniołom → kamień. Przewoźnicy zabierają gotowe towary z budynków do magazynu.'),
    el('div', { class: 'panel-grid' }, productionBuildings.map(id => productionCard(id, true))), transportPriorityPanel());
}
function productionCard(id, navigation = false) {
  const recipe = PRODUCTION_RECIPES[id];
  const content = card(el('h3', {}, titleOf(id)),
    el('p', {}, 'Towar: ', el('strong', {}, nameOf(recipe.output))),
    el('div', { class: 'stat-grid logistics-stats' },
      stat('Przy budynku', el('span', { 'data-local-buffer': id, 'data-value': state.buildings[id].ready, 'data-limit': producerCapacity(state) }, `${count(state.buildings[id].ready)} / ${count(producerCapacity(state))}`)),
      stat('Możliwe tempo', el('span', { 'data-local-rate': id }, `${state.buildings[id].workers * (state.lighthouseRemaining > 0 ? 20 : 10)} szt./h`))),
    el('p', { class: 'production-status', 'data-work-progress': id }, productionDescription(id)),
    recipe.input ? note(`Na każdą sztukę: ${recipe.amount} ${nameOf(recipe.input).toLocaleLowerCase('pl-PL')} z magazynu centralnego → 1 ${nameOf(recipe.output).toLocaleLowerCase('pl-PL')}.`) : null,
    note('Gotowy towar czeka przy budynku. Do magazynu centralnego przewożą go wyłącznie pracownicy magazynu.'));
  if (navigation) content.append(button('Pracownicy i szczegóły', () => openPanel('building', id), { class: 'action secondary' }));
  return content;
}
function productionDescription(id) {
  const building = state.buildings[id], recipe = PRODUCTION_RECIPES[id];
  if (!building.workers) return 'Przydziel pracowników, aby rozpocząć produkcję.';
  if (building.ready >= producerCapacity(state)) return 'Bufor przy budynku jest pełny. Produkcja czeka na odbiór przez przewoźników.';
  if (recipe.input && state.resources[recipe.input] < recipe.amount) return `Brakuje surowca w magazynie centralnym: ${recipe.amount} ${nameOf(recipe.input).toLocaleLowerCase('pl-PL')} na sztukę.`;
  const progress = Math.max(0, ...(building.workProgress || []));
  return `Najbliższa sztuka za ${durationText((360 - progress) / (state.lighthouseRemaining > 0 ? 2 : 1))}.${state.paused ? ' Produkcja zatrzymana — pauza.' : ''}`;
}
function warehouseOverview() {
  const limits = warehouseLimits(state);
  return card(el('h3', {}, 'Magazyn centralny'),
    el('div', { class: 'stat-grid logistics-stats' },
      stat('Zajęte miejsce', el('span', { 'data-logistics-stat': 'used' }, count(warehouseUsed(state)))),
      stat('Łączna pojemność', el('span', { 'data-logistics-stat': 'total' }, count(limits.total))),
      stat('Limit jednego towaru', el('span', { 'data-logistics-stat': 'per-resource' }, count(limits.perResource))),
      stat('Możliwy transport', el('span', { 'data-logistics-stat': 'carrier-rate' }, `${state.buildings.warehouse.workers * 60} szt./h`))),
    el('div', { class: 'warehouse-stock-list' }, MATERIAL_IDS.map(id => el('div', { class: 'warehouse-stock-row' },
      el('strong', {}, nameOf(id)), el('span', { 'data-central-resource': id, 'data-value': state.resources[id], 'data-limit': limits.perResource }, `${count(state.resources[id])} / ${count(limits.perResource)}`)))),
    el('p', { class: 'warehouse-pending' }, 'Towary oczekujące na miejsce: ', el('strong', { 'data-logistics-stat': 'pending' }, logisticsStatValue('pending'))),
    el('div', { class: 'warehouse-pending-details' }, MATERIAL_IDS.map(id => el('span', {}, `${nameOf(id)}: `, el('span', { 'data-pending-resource': id }, count(state.pendingDeliveries?.[id] || 0))))),
    rules('Jak działa magazyn',
      note('Magazyn na poziomie 1 mieści łącznie 4000 sztuk i najwyżej 1000 sztuk jednego towaru. Każdy kolejny poziom zwiększa oba limity o 50%. Monety są w osobnym skarbcu.'),
      note('Jeden przewoźnik może dostarczyć 60 sztuk na godzinę aktywnej gry. Pełny magazyn lub brak gotowych towarów zatrzymuje transport. Wybierz kolejność odbioru poniżej.')));
}
function transportPriorityPanel() {
  const priority = state.transportPriority || MATERIAL_IDS;
  return card(el('h3', {}, 'Kolejność transportu'),
    note('Przewoźnicy odbierają najpierw towary wyżej na liście. Gdy zabraknie towaru lub miejsca, przechodzą do kolejnego.'),
    el('ol', { class: 'transport-priority', 'data-transport-priority-list': '' }, priority.map((id, index) => el('li', { 'data-priority-row': id },
      el('span', {}, nameOf(id)), el('div', { class: 'priority-actions' },
        button('↑', () => perform({ type: 'transportPriority', resource: id, direction: -1 }), { class: 'action secondary', disabled: index === 0, 'aria-label': `Wyżej: ${nameOf(id)}`, 'data-priority-resource': id, 'data-priority-direction': -1 }),
        button('↓', () => perform({ type: 'transportPriority', resource: id, direction: 1 }), { class: 'action secondary', disabled: index === priority.length - 1, 'aria-label': `Niżej: ${nameOf(id)}`, 'data-priority-resource': id, 'data-priority-direction': 1 }))))));
}
function logisticsStatValue(key) {
  const limits = warehouseLimits(state);
  const values = { used: count(warehouseUsed(state)), total: count(limits.total), 'per-resource': count(limits.perResource), 'carrier-rate': `${state.buildings.warehouse.workers * 60} szt./h`, pending: count(Object.values(state.pendingDeliveries || {}).reduce((sum, value) => sum + value, 0)), returning: (state.returningWorkers || []).length, 'next-return': returnDescription() };
  return values[key] ?? '';
}
function durationText(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(value / 3600), minutes = Math.floor(value % 3600 / 60), remainder = value % 60;
  return `${hours ? `${hours} h ` : ''}${minutes ? `${minutes} min ` : ''}${remainder} s`;
}
function returnDescription() {
  const returning = state.returningWorkers || [];
  return returning.length ? `Najbliższy powrót za ${durationText(Math.min(...returning))}` : 'Nikt nie wraca do domu.';
}
function rules(title, ...children) {
  return el('details', { class: 'island-rules' }, el('summary', {}, title), ...children);
}
function residentsPanel() {
  const liveStat = (label, id, value) => stat(label, el('span', { 'data-population-stat': id }, value));
  return el('div', {}, el('div', { class: 'stat-grid' }, liveStat('Poziom ratusza', 'level', state.buildings.townhall.level), liveStat('Mieszkańcy', 'population', `${state.population} / ${state.capacity}`), liveStat('Przydzieleni', 'workers', totalWorkers(state)), liveStat('Szczęście', 'happiness', happinessText())),
    card(el('h3', {}, 'Praca i podatki'),
      el('div', { class: 'stat-grid workforce-summary' }, liveStat('Wolni', 'free', freeWorkers(state)), liveStat('Wracają do domu', 'returning', (state.returningWorkers || []).length), liveStat('Limit na budynek', 'worker-limit', Math.floor(state.population / 2)), liveStat('Podatki', 'taxes', `${taxRate(state)} monet/h`)),
      el('p', { class: 'returning-status', 'data-population-stat': 'next-return' }, returnDescription()),
      el('p', { class: 'workforce-income', 'data-population-stat': 'tax-countdown' }, taxDescription()),
      rules('Zasady pracy i powrotów',
        note('Każdy z ośmiu budynków gospodarczych może zatrudnić do połowy aktualnej populacji. Jeden człowiek pracuje tylko w jednym miejscu. Przy 144 mieszkańcach limit wynosi 72 osoby na budynek.'),
        note('Zwolniony pracownik wraca do domu przez 5 minut. W tym czasie nie jest wolny, nie pracuje i nie płaci podatków. Po powrocie możesz go przydzielić ponownie.'),
        note('Każdy pracownik produkcyjny wytwarza 10 sztuk na godzinę, po jednej co 6 minut własnej pracy. Po 7 minutach to 1 sztuka, a po 13 minutach 2 sztuki. Zwolnienie przerywa rozpoczętą sztukę.'),
        note('Przydzielony pracownik płaci 1 monetę za godzinę aktywnej gry. Podatki trafiają do skarbca. Ratusz, dom, kaplica i latarnia nie zatrudniają mieszkańców. Pauza i ukryta karta zatrzymują naliczanie.'))),
    el('div', { class: 'panel-grid workforce-grid' }, WORKPLACE_IDS.map(id => workplaceCard(id))),
    card(el('h3', {}, 'Szczęście — średnia mieszkańców'),
      note('Pełny magazyn daje pracującej przy nim osobie −10 szczęścia, po każdej kolejnej dobie −10, maksymalnie −50. Wartość na górze jest średnią wszystkich osób. Po opróżnieniu magazynu kara za przestój ustaje.'),
      el('div', { 'data-happiness-breakdown': '' }, happinessBreakdown())),
    card(el('h3', {}, 'Ratusz i miejsca w domu'),
      el('div', { class: 'stat-grid housing-stats' }, liveStat('Limit ratusza', 'capacity', state.capacity), liveStat('Miejsca w domu', 'housing', housingCapacity(state)), liveStat('Bez miejsca', 'unhoused', unhousedResidents(state)), liveStat('Wpływ na szczęście', 'penalty', housingPenaltyText())),
      housingNotice(), note('Limit osady = 24 × poziom ratusza. Miejsca do zamieszkania = 24 × poziom domu. Populacja może przekroczyć liczbę miejsc w domu, do limitu ratusza.'),
      note('Każda osoba bez miejsca obniża szczęście o 1 punkt procentowy na godzinę aktywnej gry. Przykład: 78 osób i 72 miejsca oznaczają −6 punktów procentowych na godzinę. Rozbudowa domu zatrzymuje dalszą karę; nie przywraca automatycznie utraconego szczęścia.'),
      button('Rozbuduj dom', () => openPanel('building', 'house')), button('Rozbuduj ratusz', () => openPanel('building', 'townhall'), { class: 'action secondary' })),
    card(el('h3', {}, 'Rozwój populacji'), el('p', { class: 'population-growth', 'data-population-stat': 'growth' }, populationDescription()),
      note('Przy 0% szczęścia populacja się nie zmienia. Dodatnie szczęście daje nowych mieszkańców, ujemne powoduje ubytek. Minimum to 6 osób.'),
      el('div', { class: 'population-rate-table' }, ...[['Szczęście', 'Zmiana o 1 osobę'], ['±25%', 'co 12 h'], ['±50%', 'co 6 h'], ['±75%', 'co ok. 1 h 43 min'], ['±100%', 'co 1 h']].map(([label, value]) => el('div', {}, el('span', {}, label), el('strong', {}, value)))),
      note('Godziny oznaczają rzeczywisty czas aktywnej gry w widocznej karcie. Pauza zatrzymuje zmianę populacji; tempo 1× / 2× / 4× nie skraca tych godzin. Po ukryciu karty lub zamknięciu gry licznik czeka.'),
      note('Przy przeludnieniu szczęście zmienia się w czasie, więc czas do kolejnej zmiany populacji jest szacunkiem dla obecnego szczęścia.')),
    el('p', { class: 'notice', 'data-lighthouse-bonus': '' }, lighthouseDescription()), note('Dekoracje i ścieżki poprawiają bazowe szczęście. Premie kaplicy i latarni działają przez określony czas.'));
}
function workplaceCard(id) {
  const building = state.buildings[id];
  const content = card(el('h3', {}, titleOf(id)),
    !workplaceUnlocked(state, id) ? note(`Dostępne od poziomu ratusza ${id === 'market' ? 2 : 4}.`) : null,
    el('p', { class: 'workforce-count' }, 'Pracownicy: ', el('strong', { 'data-worker-count': id }, building.workers), ' / ', el('span', { 'data-worker-limit': id }, workerLimit(state, id))),
    el('p', {}, 'Podatki: ', el('span', { 'data-workplace-tax': id }, `${building.workers * (state.chapelRemaining > 0 ? 2 : 1)} monet/h`)),
    el('p', { 'data-full-penalty': id, class: 'full-storage-status' }, fullPenaltyDescription(id)),
    PRODUCTION_RECIPES[id] ? el('p', { class: 'workplace-production', 'data-work-progress': id }, productionDescription(id)) : id === 'warehouse' ? el('p', {}, 'Możliwy transport: ', el('span', { 'data-logistics-stat': 'carrier-rate' }, `${building.workers * 60} szt./h`)) : null,
    el('div', { class: 'workforce-actions' },
      button('− Pracownik', () => perform({ type: 'assign', building: id, delta: -1 }), { class: 'action secondary', disabled: !building.workers, 'data-worker-building': id, 'data-worker-delta': -1, 'aria-label': `Zwolnij pracownika: ${titleOf(id)}` }),
      button('+ Pracownik', () => perform({ type: 'assign', building: id, delta: 1 }), { disabled: freeWorkers(state) <= 0 || building.workers >= workerLimit(state, id), 'data-worker-building': id, 'data-worker-delta': 1, 'aria-label': `Przydziel pracownika: ${titleOf(id)}` })),
    el('div', { class: 'workforce-actions workforce-bulk-actions' },
      button('Do limitu', () => adjustWorkforce(id, 'max'), { class: 'action secondary', disabled: freeWorkers(state) <= 0 || building.workers >= workerLimit(state, id), 'data-worker-building': id, 'data-worker-action': 'max', 'aria-label': `Przydziel do limitu: ${titleOf(id)}` }),
      button('Zwolnij wszystkich', () => adjustWorkforce(id, 'clear'), { class: 'action secondary', disabled: !building.workers, 'data-worker-building': id, 'data-worker-action': 'clear', 'aria-label': `Zwolnij wszystkich: ${titleOf(id)}` })));
  content.dataset.workplace = id;
  return content;
}
function adjustWorkforce(id, action) {
  settleActiveTick();
  const building = state.buildings[id];
  const delta = action === 'clear' ? -building.workers : Math.min(freeWorkers(state), workerLimit(state, id) - building.workers);
  if (delta) perform({ type: 'assign', building: id, delta });
}
function taxDescription() {
  const rate = taxRate(state);
  if (!rate) return 'Brak pracujących mieszkańców — podatki nie są naliczane.';
  const seconds = Math.max(0, Math.ceil((1 - state.taxProgress) * 3600 / rate));
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), remainder = seconds % 60;
  return `Do kolejnej monety z podatków: ${hours ? `${hours} h ` : ''}${minutes ? `${minutes} min ` : ''}${remainder} s.${state.paused ? ' Licznik zatrzymany — pauza.' : ''}`;
}
function housingPenaltyText() {
  const unhoused = unhousedResidents(state);
  return unhoused ? `−${unhoused} pkt proc./h` : '0 pkt proc./h';
}
function housingDescription() {
  const unhoused = unhousedResidents(state);
  return unhoused ? `Przeludnienie: ${unhoused} osób bez miejsca w domu. Szczęście spada o ${unhoused} pkt proc./h aktywnej gry.${state.paused ? ' Kara zatrzymana — pauza.' : ''}` : `Wszyscy mieszkańcy mają miejsce w domu: ${state.population} / ${housingCapacity(state)} zajętych miejsc. Brak kary za przeludnienie.`;
}
function housingNotice() {
  return el('p', { class: 'notice housing-notice', 'data-housing-warning': '', 'data-overcrowded': String(unhousedResidents(state) > 0), 'data-population-stat': 'housing-status' }, housingDescription());
}
function populationDescription() {
  const rate = populationRate(state.happiness);
  const overcrowded = unhousedResidents(state) > 0;
  if (!rate) return `0% szczęścia · brak przyrostu i ubytku mieszkańców.${overcrowded ? ' Przeludnienie obniża szczęście i może uruchomić ubytek.' : ''}`;
  if (rate > 0 && state.population >= state.capacity) return `Osiągnięto limit ${state.capacity} mieszkańców. Rozbuduj ratusz, aby stworzyć nowe miejsca.`;
  if (rate < 0 && state.population <= 6) return 'Osiągnięto minimum 6 mieszkańców. Populacja nie spadnie niżej; produkcja i rozwój pozostają dostępne.';
  const direction = Math.sign(rate);
  const progress = state.populationDirection === direction ? state.populationProgress : 0;
  const seconds = Math.max(0, Math.ceil((1 - progress) * 3600 / Math.abs(rate)));
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), remainder = seconds % 60;
  const time = `${hours ? `${hours} h ` : ''}${minutes ? `${minutes} min ` : ''}${remainder} s`;
  return `${overcrowded ? 'Szacunek przy obecnym szczęściu: ' : ''}${rate > 0 ? 'Nowy mieszkaniec' : 'Ubytek 1 mieszkańca'} za ${time}.${state.paused ? ' Licznik zatrzymany — pauza.' : ''}${overcrowded ? ' Przeludnienie zmienia tempo.' : ''}`;
}
function tradePanel() {
  if (!workplaceUnlocked(state, 'dock')) return el('div', {}, note('Przystań i handel za monety są dostępne od poziomu ratusza 4.'), button('Targ — wymiana towarów', () => openPanel('market')), button('Rozbuduj ratusz', () => openPanel('building', 'townhall'), { class: 'action secondary' }));
  return el('div', {}, note('Port wymienia zasoby na monety. Przed transakcją widzisz jej wynik i aktualny stan zapasów.'), resourceList(),
    button('Przejdź na targ — towary za towary', () => openPanel('market')),
    el('div', { class: 'panel-grid' }, MATERIAL_IDS.map(id => card(el('h3', {}, nameOf(id)),
      button(`Sprzedaj 10 → ${RESOURCES[id].price * 10} monet`, () => perform({ type: 'trade', resource: id, amount: 10 })),
      button(`Kup 10 za ${RESOURCES[id].price * 20} monet`, () => perform({ type: 'trade', resource: id, amount: 10, direction: 'buy' }), { class: 'action secondary' })))));
}
function fullPenaltyDescription(id) {
  const penalty = storagePenalty(state, id);
  return penalty ? `Pełny magazyn: −${penalty} szczęścia każdej pracującej tu osoby. Praca czeka na miejsce.` : 'Brak kary za pełny magazyn.';
}
function happinessBreakdown() {
  return happinessGroups(state).map(group => el('div', { class: 'happiness-row' },
    el('span', {}, group.building ? titleOf(group.building) : 'Wolni i wracający'),
    el('strong', {}, `${group.count} osób · ${Number(group.happiness.toFixed(1)).toLocaleString('pl-PL')}%`)));
}
function blessingDescription() {
  const automatic = state.chapelRemaining > 0 ? `Premia rozbudowy: ${durationText(state.chapelRemaining)}, +${state.buildings.chapel.level * 10} szczęścia i podatki ×2.` : 'Brak aktywnej premii za rozbudowę.';
  const manual = state.blessingRemaining > 0 ? `Błogosławieństwo: +20 szczęścia jeszcze ${durationText(state.blessingRemaining)}.` : `Pozostałe użycia: ${Math.max(0, state.buildings.chapel.level - state.blessingsUsed)}.`;
  return `${automatic} ${manual}`;
}
function blessingPanel() {
  return card(el('h3', {}, 'Kaplica i błogosławieństwa'),
    note('Rozbudowa kaplicy daje wszystkim +10 szczęścia na osiągnięty poziom i podwaja podatki przez 10 godzin. Poziom 1 nie daje tej premii.'),
    el('p', { 'data-chapel-time': '', class: 'notice' }, blessingDescription()),
    note('Ręczne błogosławieństwo daje +50 każdego zasobu i +20 szczęścia wszystkim przez godzinę. Łączna liczba jednorazowych użyć odpowiada poziomowi kaplicy. W trakcie błogosławieństwa kolejne jest zablokowane.'),
    button('Aktywuj błogosławieństwo', () => perform({ type: 'blessing' }), { disabled: state.blessingRemaining > 0 || state.blessingsUsed >= state.buildings.chapel.level, 'data-blessing': '' }));
}
function marketPanel() {
  if (!workplaceUnlocked(state, 'market')) return note('Targ jest dostępny od poziomu ratusza 2.');
  const rows = MATERIAL_IDS.map(id => card(el('h3', {}, nameOf(id)),
    el('div', { class: 'stat-grid' }, stat('Na targu, gotowe', el('span', { 'data-market-stock': id }, count(state.market.stock[id]))), stat('Zablokowane na godzinę', el('span', { 'data-market-locked': id }, count(state.market.locked.filter(lot => lot.resource === id).reduce((sum, lot) => sum + lot.amount, 0))))),
    button('Przynieś 10 na targ', () => perform({ type: 'marketOrder', resource: id, amount: 10 }), { class: 'action secondary', 'data-market-order': id }),
    button('Zleć odbiór do magazynu', () => perform({ type: 'marketDispatch', resource: id, amount: Math.max(0, state.market.stock[id] - state.market.dispatch[id]) }), { class: 'action secondary', 'data-market-dispatch': id })));
  const from = el('select', { id: 'market-from', 'aria-label': 'Towar oddawany' }, MATERIAL_IDS.map(id => el('option', { value: id }, nameOf(id))));
  const to = el('select', { id: 'market-to', 'aria-label': 'Towar otrzymywany' }, MATERIAL_IDS.map(id => el('option', { value: id, selected: id === 'stone' }, nameOf(id))));
  const quantity = el('input', { id: 'market-quantity', type: 'number', min: '10', step: '10', value: '10', 'aria-label': 'Liczba sztuk do wymiany' });
  return el('div', {}, el('h3', {}, 'Targ — wymiana bez monet'),
    note('Surowce: drewno, kamień, zboże. Wyroby: deski, żywność. Wymiana w tej samej kategorii, 1:1 przed marżą 10%: 10 sztuk daje 9. Ilość wymian jest nieograniczona.'),
    el('div', { class: 'stat-grid' }, stat('Zajęte miejsce', el('strong', { 'data-market-used': '' }, `${count(marketUsed(state))} / ${count(marketCapacity(state))}`)), stat('Transport na targ', `${state.buildings.market.workers * 60} szt./h`)),
    el('p', { class: 'notice', 'data-market-timer': '' }, state.market.locked.length ? durationText(Math.min(...state.market.locked.map(lot => lot.remaining))) : 'Brak zablokowanych towarów'),
    note('Pracownicy targu przynoszą towary z magazynu centralnego. Każda dostawa czeka godzinę od przybycia. Po wymianie zleć odbiór — magazynierzy przewiozą towar do magazynu centralnego.'),
    card(el('h3', {}, 'Wymień towary'), el('div', { class: 'market-exchange-fields' }, from, to, quantity), button('Wymień — marża 10%', () => perform({ type: 'marketExchange', from: from.value, to: to.value, amount: Number(quantity.value) }), { 'data-market-exchange': '' })),
    el('div', { class: 'panel-grid' }, rows));
}
function notificationsPanel() {
  return el('div', {}, button('Oznacz wszystkie jako przeczytane', () => perform({ type: 'readNotifications' }), { class: 'action secondary' }),
    state.notifications.length ? state.notifications.map(item => card(el('h3', {}, item.title), el('p', {}, item.message), el('small', {}, item.read ? 'Przeczytane' : 'Nowe'))) : note('Brak powiadomień. Tutaj pojawią się informacje o pełnych magazynach.'));
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
    note('Pauza zatrzymuje zegar, pracę, powroty do domu, transport, podatki i zmianę populacji. Tempo 1× / 2× / 4× przyspiesza wyłącznie zegar wyspy; rzeczywiste godziny produkcji, transportu, podatków i populacji nie są skracane.'),
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
  const titles = { home: 'Twoja wyspa', menu: 'HARBORLIGHT', buildings: 'Budynki', resources: 'Magazyn i transport', residents: 'Mieszkańcy', trade: 'Handel w porcie', tasks: 'Zadania', objective: 'Przywróć światło latarni', settings: 'Ustawienia', time: 'Czas na wyspie', expeditions: 'Ekspedycje', map: 'Mapa wyspy', decorations: 'Dekoracje', paths: 'Ścieżki i mosty', reset: 'Nowa wyspa' };
  let title = titles[panel.kind] || titleOf(panel.id);
  let body;
  switch (panel.kind) {
    case 'building': body = buildingPanel(panel.id); break;
    case 'buildings': body = buildingsPanel(); break;
    case 'resources': body = resourcesPanel(panel.id); break;
    case 'residents': body = residentsPanel(); break;
    case 'trade': body = tradePanel(); break;
    case 'market': title = 'Targ'; body = marketPanel(); break;
    case 'construction': title = 'Budowy i kolejka'; body = constructionPanel(); break;
    case 'notifications': title = 'Powiadomienia'; body = notificationsPanel(); break;
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
      stat('Lojalność — kolejne dni', `${state.loyalty.streak} / 10`),
      button('Budowy i kolejka', () => openPanel('construction'), { class: 'action secondary' }),
      button('Powiadomienia', () => openPanel('notifications'), { class: 'action secondary' }),
      el('div', { class: 'stat-grid' }, stat('Poziom ratusza', el('span', { 'data-population-stat': 'level' }, state.buildings.townhall.level)), stat('Mieszkańcy', el('span', { 'data-population-stat': 'population' }, `${state.population} / ${state.capacity}`)), stat('Szczęście', el('span', { 'data-population-stat': 'happiness' }, happinessText())), stat('Dzień', state.day)),
      el('div', { class: 'panel-grid' }, [['objective', 'Główny cel'], ['buildings', 'Budynki'], ['expeditions', 'Ekspedycje'], ['tasks', 'Zadania'], ['residents', 'Mieszkańcy'], ['resources', 'Magazyn'], ['trade', 'Handel'], ['settings', 'Ustawienia']].map(([kind, label]) => button(label, () => openPanel(kind)))),
      button('Wróć na wyspę', closePanel, { class: 'action secondary' }));
  }
  const scroll = dialog.querySelector('.dialog-body')?.scrollTop || 0;
  dialog.replaceChildren(el('header', { class: 'dialog-header' }, el('div', {}, el('span', { class: 'eyebrow' }, 'HARBORLIGHT · WYSPA 01'), el('h2', { id: 'dialog-title' }, title)), button('×', closePanel, { class: 'dialog-close', 'aria-label': 'Zamknij okno' })), el('div', { class: 'dialog-body' }, panelNotice ? el('p', { class: 'notice action-feedback', role: 'status' }, panelNotice) : null, body));
  dialog.querySelector('.dialog-body').scrollTop = scroll;
}

recordVisit(state);
save();
renderHUD();
createAmbientScene(stage, () => state).ready.catch(error => {
  console.error(error);
  toast('Nie udało się wczytać animacji wyspy. Odśwież stronę, aby spróbować ponownie.');
});
setInterval(() => {
  settleActiveTick();
  renderHUD();
}, 1000);
setInterval(save, 10000);
window.addEventListener('pagehide', () => { settleActiveTick(); save(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { settleActiveTick(true); save(); }
  else lastTick = performance.now();
});
