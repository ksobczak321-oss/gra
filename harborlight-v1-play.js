import { BUILDINGS, RESOURCES, EXPEDITIONS, TASKS, createState, normalizeState, act, tick, buildingCost, canAfford, taskReady, totalWorkers, populationRate, housingCapacity, unhousedResidents, buildingLevelLimit, upgradeEligibility, WORKPLACE_IDS, workerLimit, freeWorkers, taxRate, happinessGroups, workplaceUnlocked, storagePenalty, recordVisit, foodDemandPerHour, hasFoodForResidents, hungerPenaltyPerHour } from './harborlight-v1-state.js?v=english-v7';
import { MATERIAL_IDS, PRODUCTION_RECIPES, warehouseLimits, warehouseUsed, stockRoom, producerCapacity, marketCapacity, marketUsed, nextConstruction, constructionCounts, premiumActive, estimateMaterialsSeconds, plannedLevel } from './harborlight-v1-logistics.js?v=english-v7';
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
const nameOf = id => RESOURCES[id]?.name || ({ coins: 'Coins', wood: 'Wood', stone: 'Stone', food: 'Food', planks: 'Planks', grain: 'Grain' }[id]) || id;
const count = value => Math.floor(value || 0).toLocaleString('en-US');
const titleOf = id => BUILDINGS[id]?.name || id;
const hourlyCoins = amount => `${amount} ${amount === 1 ? 'coin' : 'coins'}/h`;
const costText = cost => Object.entries(cost || {}).map(([id, value]) => `${nameOf(id)}: ${count(value)}`).join(' · ');
const button = (label, fn, attributes = {}) => el('button', { type: 'button', class: 'action', onclick: fn, ...attributes }, label);
const note = text => el('p', { class: 'notice' }, text);
const card = (...children) => el('section', { class: 'info-card' }, ...children);

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  catch { toast('Your browser cannot save progress. You can keep playing until this tab is closed.'); }
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
document.body.append(button('Island menu', () => openPanel('menu'), { class: 'mobile-island-menu', 'aria-label': 'Open island menu' }));

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
hotspot('home', 'HARBORLIGHT — island overview', [12, 8, 327, 72], () => openPanel('home'));
hotspot('settings', 'Settings', [350, 17, 52, 52], () => openPanel('settings'));
for (const [id, label, region] of [
  ['coins', 'Coins — trade', [469, 8, 115, 49]], ['wood', 'Wood — stock', [587, 8, 111, 49]],
  ['stone', 'Stone — stock', [700, 8, 108, 49]], ['food', 'Food — stock', [811, 8, 112, 49]],
]) hotspot(`resource-${id}`, label, region, () => openPanel('resources', id));
hotspot('population', 'Residents and worker assignments', [925, 8, 130, 49], () => openPanel('residents'));
hotspot('clock', 'Island day and time', [1363, 7, 131, 49], () => openPanel('time'));
hotspot('pause', 'Pause time', [1503, 10, 34, 46], () => { if (!state.paused) perform({ type: 'pause' }); });
hotspot('play', 'Resume time', [1541, 10, 34, 46], () => { if (state.paused) perform({ type: 'pause' }); else toast('Time is already running on your island.'); });
hotspot('speed', 'Change clock speed', [1578, 10, 34, 46], () => perform({ type: 'speed', speed: state.speed === 1 ? 2 : state.speed === 2 ? 4 : 1 }));
hotspot('menu', 'Game menu', [1623, 7, 43, 50], () => openPanel('menu'));
for (const [id, label, y] of [['island', 'Island', 108], ['expeditions', 'Expeditions', 205], ['tasks', 'Tasks', 301], ['residents', 'Residents', 401], ['map', 'Island map', 502]]) {
  hotspot(`nav-${id}`, label, [6, y, 103, 91], () => id === 'island' ? returnToIsland() : openPanel(id));
}
hotspot('objective-title', 'Main objective — rebuild the lighthouse', [1405, 76, 260, 65], () => openPanel('objective'));
hotspot('objective-repair', 'Build the lighthouse', [1412, 143, 245, 31], () => openPanel('building', 'lighthouse'));
hotspot('objective-wood', 'Lighthouse wood requirements', [1412, 175, 245, 28], () => openPanel('objective'));
hotspot('objective-stone', 'Lighthouse stone requirements', [1412, 204, 245, 29], () => openPanel('objective'));
hotspot('expedition-preview', 'Misty Isles — expedition details', [1411, 265, 250, 148], () => openPanel('expeditions'));
hotspot('expedition-start', 'Choose an expedition', [1429, 419, 220, 34], () => openPanel('expeditions'));
for (const [id, region] of Object.entries(buildingRegions)) {
  hotspot(`world-${id}`, `${titleOf(id)} — details`, region, () => {
    if (placement) {
      if (placement !== id) { toast(`Select the highlighted location: ${titleOf(placement)}.`); return; }
      const type = state.buildings[id].level ? 'upgrade' : 'build';
      cancelPlacement();
      if (perform({ type, building: id })) openPanel('building', id);
    } else openPanel('building', id);
  }, 'world-hotspot');
}
hotspot('bridge', 'Bridge and paths — upgrades', [815, 445, 192, 76], () => openPanel('paths'));
hotspot('waterfall', 'Waterfall — nature and decorations', [808, 526, 129, 148], () => openPanel('decorations'));
hotspot('boat', 'Ship — harbor trade', [215, 635, 219, 137], () => openPanel('trade'));
hotspot('village', 'Village square — residents', [559, 397, 187, 106], () => openPanel('residents'));
hotspot('beach', 'Beach — decorations', [1208, 672, 187, 96], () => openPanel('decorations'));
const dockCategories = [['buildings', 'Buildings', 471, 167], ['resources', 'Production and resources', 648, 158], ['decorations', 'Decorations', 815, 170], ['paths', 'Paths', 991, 171]];
for (const [id, label, x, width] of dockCategories) hotspot(`category-${id}`, label, [x, 780, width, 41], () => openPanel(id));
for (const [index, id] of ['house', 'farm', 'sawmill', 'quarry', 'dock', 'warehouse', 'lighthouse'].entries()) {
  hotspot(`dock-${id}`, `${titleOf(id)} — construction and upgrades`, [329 + index * 139, 830, 126, 104], () => openPanel('building', id));
}

const hud = {};
const topbar = el('nav', { class: 'island-topbar', 'aria-label': 'Island level, happiness and resources' });
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
toolbarButton('home', 'HARBORLIGHT — island overview', 'topbar-brand', el('span', { class: 'topbar-emblem', 'aria-hidden': 'true' }, '♜'), el('span', {}, 'HARBORLIGHT', el('small', {}, 'YOUR ISLAND')));
hotspot('level', 'Island level — Town Hall', [0, 0, 0, 0], () => openPanel('building', 'townhall'));
toolbarButton('level', 'Island level — Town Hall', 'topbar-level', ...toolbarStat('level', 'Level', '♜'));
hotspot('happiness', 'Happiness and population growth', [0, 0, 0, 0], () => openPanel('residents'));
toolbarButton('happiness', 'Happiness and population growth', 'topbar-happiness', ...toolbarStat('happiness', 'Happiness', '☀︎'));
hotspot('resource-planks', 'Planks — stock', [0, 0, 0, 0], () => openPanel('resources', 'planks'));
hotspot('resource-grain', 'Grain — stock', [0, 0, 0, 0], () => openPanel('resources', 'grain'));
for (const [id, icon] of [['coins', '◉'], ['wood', '▰'], ['stone', '◆'], ['grain', '♧'], ['food', '✦'], ['planks', '▤']]) {
  toolbarButton(`resource-${id}`, `${nameOf(id)} — stock`, `topbar-resource topbar-${id}`, ...toolbarStat(id, nameOf(id), icon));
}
toolbarButton('population', 'Residents and worker assignments', 'topbar-population', ...toolbarStat('population', 'Residents', '♟︎'));
hud.taxes = el('small', { class: 'topbar-tax', 'data-hud': 'taxes' }, '—');
document.querySelector('.topbar-coins .topbar-copy').append(hud.taxes);
hud.housing = el('small', { class: 'topbar-housing', 'data-hud': 'housing' }, '—');
document.querySelector('.topbar-population .topbar-copy').append(hud.housing);
hud.clock = el('strong', { 'data-hud': 'clock' }, '—');
toolbarButton('clock', 'Island day and time', 'topbar-clock', hud.clock);
for (const [id, icon, label] of [['pause', 'Ⅱ', 'Pause time'], ['play', '▶︎', 'Resume time'], ['speed', '1×', 'Change clock speed'], ['settings', '⚙︎', 'Settings'], ['menu', '☰', 'Game menu']]) {
  const control = toolbarButton(id, label, 'topbar-control', el('span', { 'aria-hidden': 'true' }, icon));
  if (id === 'speed') hud.speed = control.firstChild;
}
hotspot('notifications', 'Notifications', [0, 0, 0, 0], () => openPanel('notifications'));
hud.notifications = el('span', { 'data-notification-count': '' }, '0');
toolbarButton('notifications', 'Notifications', 'topbar-control notification-button', el('span', { 'aria-hidden': 'true' }, '🔔'), hud.notifications);
const mobileHud = el('nav', { class: 'mobile-island-hud', 'aria-label': 'Island status' });
const mobileSummary = el('div', { class: 'mobile-hud-summary' });
const mobileResources = el('div', { class: 'mobile-hud-resources' });
const mobileHudValues = {};
for (const [id, label, action] of [['level', 'Level', () => openPanel('building', 'townhall')], ['happiness', 'Happiness', () => openPanel('residents')], ['population', 'Residents', () => openPanel('residents')], ...Object.keys(RESOURCES).map(id => [id, nameOf(id), () => openPanel('resources', id)])]) {
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
  return `${rounded ? state.happiness > 0 ? '+' : '−' : ''}${rounded.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
};
function renderHUD() {
  hud.notifications.textContent = state.notifications.filter(item => !item.read).length;
  for (const id of Object.keys(RESOURCES)) {
    hud[id].textContent = count(state.resources[id]);
    document.getElementById(`hit-resource-${id}`).setAttribute('aria-label', `${nameOf(id)}: ${count(state.resources[id])} — stock`);
  }
  hud.population.textContent = `${state.population} / ${state.capacity}`;
  hud.taxes.textContent = `Taxes: ${taxRate(state)}/h`;
  hud.housing.textContent = `Housing: ${housingCapacity(state)}`;
  hud.level.textContent = state.buildings.townhall.level;
  hud.happiness.textContent = happinessText();
  document.getElementById('hit-level').setAttribute('aria-label', `Level ${state.buildings.townhall.level} — Town Hall; capacity ${state.capacity} residents`);
  document.getElementById('hit-happiness').setAttribute('aria-label', `Happiness: ${happinessText()} — residents and population growth`);
  document.getElementById('hit-happiness').dataset.sentiment = state.happiness > 0 ? 'positive' : state.happiness < 0 ? 'negative' : 'neutral';
  document.getElementById('hit-population').setAttribute('aria-label', `Residents: ${state.population}; Town Hall capacity: ${state.capacity}; housing: ${housingCapacity(state)}; unhoused: ${unhousedResidents(state)}; working: ${totalWorkers(state)}; available: ${freeWorkers(state)} — residents and worker assignments`);
  document.getElementById('hit-population').dataset.overcrowded = String(unhousedResidents(state) > 0);
  for (const id of Object.keys(mobileHudValues)) mobileHudValues[id].textContent = hud[id].textContent;
  mobileHudValues.happiness.dataset.sentiment = document.getElementById('hit-happiness').dataset.sentiment;
  hud.clock.textContent = `Day ${state.day}\n${String(Math.floor(state.minutes / 60)).padStart(2, '0')}:${String(Math.floor(state.minutes % 60)).padStart(2, '0')}`;
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
      badge.textContent = `Lv. ${value.level}`;
    } else badge?.remove();
    node.classList.toggle('under-construction', !!value.construction);
    let constructionBadge = node.querySelector('.construction-badge');
    if (value.construction) {
      if (!constructionBadge) { constructionBadge = el('span', { class: 'construction-badge' }); node.append(constructionBadge); }
      constructionBadge.textContent = value.construction.stage === 'transport' ? '▰ Transport' : value.construction.stage === 'building' ? '⚒ Building' : '◷ Queued';
    } else constructionBadge?.remove();
    node.setAttribute('aria-label', `${titleOf(id)}, level ${value.level}${value.construction ? ', upgrade in progress' : value.ready ? ', goods awaiting pickup' : ''}`);
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
  const foodStats = foodStatValues();
  dialog.querySelectorAll('[data-food-stat]').forEach(node => { node.textContent = foodStats[node.dataset.foodStat]; });
  dialog.querySelectorAll('[data-upgrade-transport]').forEach(node => { node.textContent = upgradeTransportDescription(node.dataset.upgradeTransport); });
  dialog.querySelectorAll('[data-upgrade-requirements]').forEach(node => { node.textContent = upgradeRequirementDescription(node.dataset.upgradeRequirements); });
  if (panel?.kind === 'construction' && dialog.open) {
    const signature = constructionSignature();
    if (dialog.querySelector('[data-construction-signature]')?.dataset.constructionSignature !== signature) renderPanel();
  }
  dialog.querySelectorAll('[data-lighthouse-bonus]').forEach(node => { node.textContent = lighthouseDescription(); });
  dialog.querySelectorAll('[data-project-status]').forEach(node => { const project = state.constructionProjects.find(item => item.order === Number(node.dataset.projectStatus)); node.textContent = project ? projectDescription(project) : 'Completed'; });
  dialog.querySelectorAll('[data-construction-summary]').forEach(node => { node.textContent = constructionSummary(); });
  if (panel?.kind === 'building' && dialog.open) {
    const current = state.buildings[panel.id];
    const signature = `${current.level}:${current.construction?.stage || ''}`;
    if (dialog.querySelector('[data-building-signature]')?.dataset.buildingSignature !== signature) renderPanel();
  }
  dialog.querySelectorAll('[data-construction-status]').forEach(node => { node.textContent = constructionDescription(node.dataset.constructionStatus); });
  dialog.querySelectorAll('[data-upgrade-building]').forEach(node => { const id = node.dataset.upgradeBuilding; node.disabled = !upgradeEligibility(state, id).ok || (!premiumActive(state) && !canAfford(state, buildingCost(state, id))); });
  dialog.querySelectorAll('[data-upgrade-cost]').forEach(node => { const available = state.resources[node.dataset.upgradeCost], required = Number(node.dataset.required); node.textContent = `${count(available)} / ${count(required)}`; node.classList.toggle('is-affordable', available >= required); node.classList.toggle('is-short', available < required); node.setAttribute('aria-label', `${nameOf(node.dataset.upgradeCost)}: in storage ${count(available)}, required ${count(required)}; ${available >= required ? 'enough' : 'short'}`); });
  dialog.querySelectorAll('[data-stock]').forEach(node => { node.textContent = count(state.resources[node.dataset.stock]); });
  const live = { population: `${state.population} / ${state.capacity}`, workers: totalWorkers(state), free: freeWorkers(state), returning: (state.returningWorkers || []).length, 'next-return': returnDescription(), 'worker-limit': Math.floor(state.population / 2), taxes: hourlyCoins(taxRate(state)), 'tax-countdown': taxDescription(), happiness: happinessText(), level: state.buildings.townhall.level, growth: populationDescription(), capacity: state.capacity, housing: housingCapacity(state), unhoused: unhousedResidents(state), penalty: housingPenaltyText(), 'housing-status': housingDescription() };
  dialog.querySelectorAll('[data-population-stat]').forEach(node => { node.textContent = live[node.dataset.populationStat]; });
  dialog.querySelectorAll('[data-housing-warning]').forEach(node => { node.dataset.overcrowded = String(unhousedResidents(state) > 0); });
  dialog.querySelectorAll('[data-logistics-stat]').forEach(node => { node.textContent = logisticsStatValue(node.dataset.logisticsStat); });
  dialog.querySelectorAll('[data-local-buffer],[data-local-overview]').forEach(node => {
    const value = state.buildings[(node.dataset.localBuffer || node.dataset.localOverview)].ready;
    node.textContent = `${count(value)} / ${count(producerCapacity(state))}`;
    node.dataset.value = value;
    node.dataset.limit = producerCapacity(state);
  });
  dialog.querySelectorAll('[data-local-rate]').forEach(node => { node.textContent = `${state.buildings[node.dataset.localRate].workers * (state.lighthouseRemaining > 0 ? 20 : 10)} units/h`; });
  dialog.querySelectorAll('[data-work-progress]').forEach(node => { node.textContent = node.classList.contains('producer-next-unit') ? productionTimerText(node.dataset.workProgress) : productionDescription(node.dataset.workProgress); });
  dialog.querySelectorAll('[data-central-resource]').forEach(node => {
    const id = node.dataset.centralResource, limits = warehouseLimits(state);
    node.textContent = `${count(state.resources[id])} / ${count(limits.perResource)}`;
    node.dataset.value = state.resources[id]; node.dataset.limit = limits.perResource;
  });
  dialog.querySelectorAll('[data-pending-resource]').forEach(node => { node.textContent = count(state.pendingDeliveries?.[node.dataset.pendingResource] || 0); });
  dialog.querySelectorAll('[data-worker-count]').forEach(node => { node.textContent = state.buildings[node.dataset.workerCount].workers; });
  dialog.querySelectorAll('[data-worker-limit]').forEach(node => { node.textContent = workerLimit(state, node.dataset.workerLimit); });
  dialog.querySelectorAll('[data-workplace-tax]').forEach(node => { node.textContent = hourlyCoins(state.buildings[node.dataset.workplaceTax].workers * (state.chapelRemaining > 0 ? 2 : 1)); });
  dialog.querySelectorAll('[data-full-penalty]').forEach(node => { node.textContent = fullPenaltyDescription(node.dataset.fullPenalty); });
  dialog.querySelectorAll('[data-chapel-time]').forEach(node => { node.textContent = blessingDescription(); });
  dialog.querySelectorAll('[data-blessing]').forEach(node => { node.disabled = state.blessingRemaining > 0 || state.blessingsUsed >= state.buildings.chapel.level; });
  dialog.querySelectorAll('[data-market-used]').forEach(node => { node.textContent = `${count(marketUsed(state))} / ${count(marketCapacity(state))}`; });
  dialog.querySelectorAll('[data-market-stock]').forEach(node => { node.textContent = count(state.market.stock[node.dataset.marketStock]); });
  dialog.querySelectorAll('[data-market-locked]').forEach(node => { node.textContent = count(state.market.locked.filter(lot => lot.resource === node.dataset.marketLocked).reduce((sum, lot) => sum + lot.amount, 0)); });
  dialog.querySelectorAll('[data-market-timer]').forEach(node => { node.textContent = state.market.locked.length ? durationText(Math.min(...state.market.locked.map(lot => lot.remaining))) : 'No locked goods'; });
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
  closeInfoPopup(false);
  dialog.close();
  panel = null;
  previousFocus?.focus();
}
dialog.addEventListener('cancel', event => {
  if (closeInfoPopup(true)) { event.preventDefault(); return; }
  panel = null;
});
dialog.addEventListener('click', event => { if (event.target === dialog) closePanel(); });
function returnToIsland() { if (dialog.open) closePanel(); cancelPlacement(); toast('Your island. Select a building, residents or a menu item.'); }
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
  return `Construction: ${counts.active} / ${counts.limit} · Queue: ${counts.queued} / ${counts.premium ? 'unlimited' : counts.queueLimit}${counts.premium ? ' · Package active' : ''}`;
}
function constructionSignature() { return JSON.stringify([premiumActive(state), state.buildings.townhall.level, state.constructionProjects.map(p => [p.order, p.stage])]); }
function projectDescription(project) {
  if (project.stage === 'planned') {
    if (!premiumActive(state)) return 'This plan is waiting for package reactivation. Materials have not been reserved.';
    const estimate = estimateMaterialsSeconds(state, project.cost);
    return Number.isFinite(estimate) ? `Waiting for materials. Earliest estimated delivery: ${durationText(estimate)}; other resource use may delay it.` : 'Waiting for materials. Production, transport or storage capacity is missing.';
  }
  if (project.stage === 'queued') return 'Materials paid and reserved. Waiting for a construction slot or the previous level to finish.';
  if (project.stage === 'building') return `Building level ${project.targetLevel}: remaining ${durationText(project.buildRemaining)}. Transport took ${durationText(project.transportSeconds)}.`;
  const delivered = project.goodsTotal - project.goodsRemaining;
  const waiting = nextConstruction(state)?.order !== project.order ? 'Waiting for an earlier delivery.' : !state.buildings.warehouse.workers ? 'Assign warehouse workers to resume deliveries.' : `Estimated remaining transport: ${durationText(Math.ceil(project.goodsRemaining / state.buildings.warehouse.workers) * 60)}.`;
  return `Delivery for level ${project.targetLevel}: ${count(delivered)} / ${count(project.goodsTotal)} units. ${waiting}`;
}
function constructionDescription(id) {
  const project = state.buildings[id].construction;
  return project ? projectDescription(project) : upgradeTransportDescription(id);
}
function upgradeTransportDescription(id) {
  const workers = state.buildings.warehouse.workers;
  const goods = MATERIAL_IDS.reduce((sum, resource) => sum + (buildingCost(state, id)?.[resource] || 0), 0);
  const buildingTime = id === 'lighthouse' ? 'twice as long as transport' : 'the same amount of time';
  return workers ? `Estimated transport: ${durationText(Math.ceil(goods / workers) * 60)}. Construction will take ${buildingTime}. Changing warehouse staffing may affect delivery time.` : `Transport is waiting for warehouse workers (60 units per worker per hour). Construction then takes ${id === 'lighthouse' ? 'twice as long as transport' : 'as long as transport'}.`;
}
function constructionPanel() {
  const projects = state.constructionProjects;
  return el('div', { 'data-construction-signature': constructionSignature() },
    el('p', { class: 'notice', 'data-construction-summary': '' }, constructionSummary()),
    note('Your Town Hall level sets both the active construction limit and the regular queue limit. Paid queue entries already have reserved materials. Warehouse workers deliver to earlier construction projects before collecting production.'),
    premiumActive(state) ? note(`The package adds 4 construction slots, an unlimited queue and plans based on future deliveries. Expires ${new Date(state.premium.expiresAt).toLocaleString('en-US')}.`) : note('Future package: 4 extra construction slots, an unlimited queue and delivery-based planning. Purchase options and pricing will be defined later.'),
    ...projects.map(project => card(el('h3', {}, `${titleOf(project.building)} → level ${project.targetLevel}`),
      el('p', { 'data-project-status': project.order }, projectDescription(project)),
      el('p', { class: 'cost' }, costText(project.cost)),
      button('Building', () => openPanel('building', project.building), { class: 'action secondary' }))),
    !projects.length ? note('No upgrades planned. Select a building on the island.') : null);
}
function upgradeCostView(cost) {
  return el('div', { class: 'upgrade-costs', 'aria-label': 'Available resources compared with upgrade costs' }, Object.entries(cost).map(([id, required]) => {
    const available = state.resources[id];
    return el('div', { class: 'upgrade-cost-row' }, el('span', {}, nameOf(id)), el('strong', { class: available >= required ? 'is-affordable' : 'is-short', 'data-upgrade-cost': id, 'data-required': required, 'aria-label': `${nameOf(id)}: in storage ${count(available)}, required ${count(required)}; ${available >= required ? 'enough' : 'short'}` }, `${count(available)} / ${count(required)}`));
  }));
}
let activeInfoPopup = null;
function closeInfoPopup(restoreFocus = false) {
  if (!activeInfoPopup) return false;
  const { trigger, popup } = activeInfoPopup;
  popup.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  activeInfoPopup = null;
  if (restoreFocus && trigger.isConnected) trigger.focus({ preventScroll: true });
  return true;
}
function positionInfoPopup() {
  if (!activeInfoPopup) return;
  const { trigger, popup } = activeInfoPopup;
  const anchor = trigger.getBoundingClientRect();
  const width = Math.min(360, innerWidth - 32);
  popup.style.width = `${width}px`;
  const safeTop = Math.max(16, (dialog.querySelector('.dialog-header')?.getBoundingClientRect().bottom || 0) + 8);
  popup.style.maxHeight = `${Math.max(100, innerHeight - safeTop - 16)}px`;
  const height = popup.getBoundingClientRect().height;
  const left = Math.max(16, Math.min(anchor.right - width, innerWidth - width - 16));
  const below = anchor.bottom + 8;
  const top = below + height <= innerHeight - 16 ? below : Math.max(safeTop, anchor.top - height - 8);
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}
function toggleInfoPopup(trigger, popup) {
  if (activeInfoPopup?.trigger === trigger) { closeInfoPopup(false); return; }
  closeInfoPopup(false);
  activeInfoPopup = { trigger, popup };
  trigger.setAttribute('aria-expanded', 'true');
  popup.hidden = false;
  positionInfoPopup();
}
document.addEventListener('pointerdown', event => {
  if (activeInfoPopup && !activeInfoPopup.trigger.contains(event.target) && !activeInfoPopup.popup.contains(event.target)) closeInfoPopup(false);
}, true);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && activeInfoPopup) {
    event.preventDefault();
    event.stopPropagation();
    closeInfoPopup(true);
  }
}, true);
window.addEventListener('resize', positionInfoPopup, { passive: true });
dialog.addEventListener('scroll', positionInfoPopup, { capture: true, passive: true });
function upgradeRequirementDescription(id) {
  if (canAfford(state, buildingCost(state, id))) return 'All required resources are available.';
  return premiumActive(state) ? 'Your package allows plans that wait for future deliveries. The cost is reserved once all resources are available.' : 'Collect the full cost in the central warehouse to start this upgrade.';
}
function upgradeHeading(id, title) {
  const popup = el('div', { id: `upgrade-info-${id}`, class: 'upgrade-info-popover', hidden: true, role: 'region', 'aria-label': 'Upgrade information', 'data-upgrade-help': id, 'data-upgrade-popover': id },
    el('h4', {}, 'Upgrade information'),
    el('p', {}, 'Upgrade materials come from the central warehouse and coins from the treasury.'),
    el('p', { 'data-upgrade-transport': id }, upgradeTransportDescription(id)),
    el('p', { 'data-upgrade-requirements': id }, upgradeRequirementDescription(id)),
    el('p', {}, 'The current level remains active until the upgrade is complete. Pausing or hiding the tab stops both stages.'));
  const trigger = button('i', () => toggleInfoPopup(trigger, popup), { class: 'upgrade-info-toggle', 'aria-label': 'Upgrade information', 'aria-expanded': 'false', 'aria-controls': popup.id, 'data-upgrade-info': id });
  return el('div', { class: 'upgrade-heading' }, el('h3', {}, title), trigger, popup);
}
function productionTimerText(id) {
  const building = state.buildings[id], recipe = PRODUCTION_RECIPES[id];
  if (!building.workers) return 'No workers assigned';
  if (building.ready >= producerCapacity(state)) return 'Storage full';
  if (recipe.input && state.resources[recipe.input] < recipe.amount) return `Waiting for ${nameOf(recipe.input)}`;
  const progress = Math.max(0, ...(building.workProgress || []));
  return `${state.paused ? 'Paused · ' : ''}Next unit in ${durationText((360 - progress) / (state.lighthouseRemaining > 0 ? 2 : 1))}`;
}
function productionInfo(id) {
  const recipe = PRODUCTION_RECIPES[id];
  const popup = el('div', { id: `production-info-${id}`, class: 'upgrade-info-popover production-info-popover', hidden: true, role: 'region', 'aria-label': 'Production information', 'data-production-help': id, 'data-production-popover': id },
    el('h4', {}, 'Production information'),
    el('p', {}, BUILDINGS[id].description),
    el('p', {}, `Product: ${nameOf(recipe.output)}. Potential output: `, el('strong', { 'data-local-rate': id }, `${state.buildings[id].workers * (state.lighthouseRemaining > 0 ? 20 : 10)} units/h`)),
    recipe.input ? el('p', {}, `Each ${nameOf(recipe.output).toLocaleLowerCase('en-US')} requires ${recipe.amount} ${nameOf(recipe.input).toLocaleLowerCase('en-US')} from the central warehouse (2:1).`) : null,
    el('p', {}, 'Each worker normally completes 1 unit every 6 minutes. The Lighthouse bonus doubles material production. Local storage holds 200 units per Town Hall level; warehouse workers collect finished goods at 60 units per worker per hour.'),
    el('p', { 'data-full-penalty': id }, fullPenaltyDescription(id)),
    el('p', {}, 'Full local storage stops production and lowers worker happiness by 10, then by another 10 every 24 active hours, down to −50. The penalty ends when storage has space again.'),
    el('p', {}, 'Releasing a worker discards their unfinished unit. They take 5 minutes to return home and cannot work, earn taxes or be reassigned during that journey.'));
  const trigger = button('i', () => toggleInfoPopup(trigger, popup), { class: 'upgrade-info-toggle production-info-toggle', 'aria-label': 'Production information', 'aria-expanded': 'false', 'aria-controls': popup.id, 'data-production-info': id });
  return [trigger, popup];
}
function producerSummary(id) {
  const building = state.buildings[id];
  const [info, popup] = productionInfo(id);
  return el('div', { class: 'stat-grid producer-summary', 'data-production-summary': id },
    stat('Level', building.level),
    el('div', { class: 'stat producer-storage' },
      el('div', { class: 'producer-storage-heading' }, el('small', {}, 'Storage'), info),
      el('strong', { 'data-local-buffer': id, 'data-value': building.ready, 'data-limit': producerCapacity(state) }, `${count(building.ready)} / ${count(producerCapacity(state))}`),
      el('small', { class: 'producer-next-unit', 'data-work-progress': id }, productionTimerText(id)), popup),
    el('div', { class: 'stat producer-workers' }, el('small', {}, 'Workers'),
      el('div', { class: 'producer-workers-row' },
        el('strong', { class: 'producer-worker-count' }, el('span', { 'data-worker-count': id }, building.workers), ' / ', el('span', { 'data-worker-limit': id }, workerLimit(state, id))),
        el('div', { class: 'producer-worker-controls' },
          button('−', () => perform({ type: 'assign', building: id, delta: -1 }), { class: 'producer-worker-button', disabled: !building.workers, 'data-worker-building': id, 'data-worker-delta': -1, 'aria-label': `Release worker: ${titleOf(id)}` }),
          button('+', () => perform({ type: 'assign', building: id, delta: 1 }), { class: 'producer-worker-button', disabled: freeWorkers(state) <= 0 || building.workers >= workerLimit(state, id), 'data-worker-building': id, 'data-worker-delta': 1, 'aria-label': `Assign worker: ${titleOf(id)}` })))),
    stat('Taxes', el('span', { 'data-workplace-tax': id }, hourlyCoins(building.workers * (state.chapelRemaining > 0 ? 2 : 1)))));
}
function buildingPanel(id) {
  const data = BUILDINGS[id];
  const value = state.buildings[id];
  const isProducer = productionBuildings.includes(id);
  const content = el('div', { 'data-building-signature': `${value.level}:${value.construction?.stage || ''}` },
    isProducer ? producerSummary(id) : note(data.description || data.desc || 'Upgrade this building to expand your settlement.'),
    !isProducer ? el('div', { class: 'stat-grid' }, stat('Level', value.level || 'Ruins'), id === 'townhall' ? stat('Residents', el('span', { 'data-population-stat': 'population' }, `${state.population} / ${state.capacity}`)) : null, id === 'townhall' ? stat('Taxes per hour', el('span', { 'data-population-stat': 'taxes' }, hourlyCoins(taxRate(state)))) : null) : null);
  if (WORKPLACE_IDS.includes(id) && !isProducer) content.append(workplaceCard(id));
  if (id === 'warehouse') content.append(warehouseOverview(), transportPriorityPanel());
  if (id === 'market') content.append(marketPanel());
  if (id === 'chapel') content.append(blessingPanel());
  if (id === 'house') content.append(card(el('h3', {}, 'Housing capacity'),
    el('div', { class: 'stat-grid' }, stat('Housing', el('span', { 'data-population-stat': 'housing' }, housingCapacity(state))), stat('Town Hall capacity', el('span', { 'data-population-stat': 'capacity' }, state.capacity))),
    housingNotice(), note('Each House level provides 24 beds. Upgrading does not add residents immediately; it increases housing and stops further overcrowding penalties once everyone has a home.')));
  if (id === 'townhall') content.append(note(`The House provides ${housingCapacity(state)} beds.`));
  if (id === 'lighthouse') content.append(el('p', { class: 'notice', 'data-lighthouse-bonus': '' }, lighthouseDescription()));
  if (id === 'lighthouse' && value.level > 0) content.append(note('The Lighthouse is restored and shining. You can upgrade it up to your Town Hall level.'));
  const cost = buildingCost(state, id);
  const maxLevel = value.level >= data.maxLevel;
  const eligibility = upgradeEligibility(state, id);
  const townhallLocked = !maxLevel && !eligibility.ok;
  if (value.construction) {
    content.append(card(el('h3', {}, `Upgrade to level ${value.construction.targetLevel}`),
      el('p', { class: 'construction-status', 'data-construction-status': id }, constructionDescription(id))));
  }
  content.append(card(upgradeHeading(id, maxLevel ? 'Fully upgraded' : value.construction ? `Next level: ${plannedLevel(state, id) + 1}` : value.level ? 'Building upgrade' : 'Construction'),
    maxLevel ? null : upgradeCostView(cost),
    townhallLocked ? el('p', { class: 'notice building-lock', 'data-upgrade-lock': id }, eligibility.message) : null,
    button(maxLevel ? 'Maximum level' : value.level ? 'Upgrade' : 'Build', () => perform({ type: value.level ? 'upgrade' : 'build', building: id }), { disabled: maxLevel || townhallLocked || (!premiumActive(state) && !canAfford(state, cost)), 'data-upgrade-building': id }),
    townhallLocked ? button('Upgrade Town Hall', () => openPanel('building', 'townhall'), { class: 'action secondary' }) : null));
  content.append(el('p', { class: 'notice', 'data-construction-summary': '' }, constructionSummary()), button('Construction and queue', () => openPanel('construction'), { class: 'action secondary' }));
  if (WORKPLACE_IDS.includes(id)) content.append(button('Manage all workers', () => openPanel('residents'), { class: 'action secondary' }));
  return content;
}
function stat(label, value) { return el('div', { class: 'stat' }, el('small', {}, label), el('strong', {}, value)); }
function lighthouseDescription() {
  return state.lighthouseRemaining > 0 ? `Lighthouse bonus: +100 happiness and material production ×2. Remaining: ${durationText(state.lighthouseRemaining)}. Taxes are unchanged.` : 'Complete construction or an upgrade for +100 happiness and material production ×2 for 24 hours × the completed level.';
}
function objectivePanel() {
  return el('div', {}, note(state.objective.repaired ? 'The Lighthouse shines again. Upgrade it to activate another bonus.' : 'Collect 500 of every resource, including coins. Warehouse workers deliver the materials; construction takes twice as long as transport.'),
    el('p', { class: 'notice', 'data-lighthouse-bonus': '' }, lighthouseDescription()),
    button('Lighthouse — construction and upgrades', () => openPanel('building', 'lighthouse')),
    button('Construction and queue', () => openPanel('construction'), { class: 'action secondary' }));
}
function buildingsPanel() {
  return el('div', {}, note(`Town Hall level ${state.buildings.townhall.level} allows other buildings to reach the same level.`),
    el('div', { class: 'panel-grid' }, Object.keys(BUILDINGS).map(id => card(el('h3', {}, titleOf(id)), el('p', {}, `Level ${state.buildings[id].level} / ${buildingLevelLimit(state, id)}`), button('Details and upgrades', () => openPanel('building', id))))));
}
function resourcesPanel(selected) {
  return el('div', {}, selected === 'food' ? feedingPanel() : null, selected ? note(`${nameOf(selected)} — stock in the ${selected === 'coins' ? 'treasury' : 'central warehouse'}: ${count(state.resources[selected])}.`) : null,
    selected === 'coins' ? card(el('h3', {}, 'Treasury and taxes'),
      stat('Coins', el('span', { 'data-stock': 'coins' }, count(state.resources.coins))),
      stat('Tax income', el('span', { 'data-population-stat': 'taxes' }, hourlyCoins(taxRate(state)))),
      el('p', { class: 'workforce-income', 'data-population-stat': 'tax-countdown' }, taxDescription()),
      note('Coins are stored separately and do not use goods storage.'),
      button('Manage workers', () => openPanel('residents'), { class: 'action secondary' })) : null,
    warehouseOverview(),
    button('Trade at the harbor', () => openPanel('trade')), button('Warehouse and carriers', () => openPanel('building', 'warehouse'), { class: 'action secondary' }),
    el('h3', {}, 'Production and transport'),
    note('Farm → grain → Windmill → food. Lumber Camp → wood → Sawmill → planks. Quarry → stone. Carriers deliver finished goods from buildings to the warehouse.'),
    el('div', { class: 'panel-grid' }, productionBuildings.map(id => productionCard(id, true))), transportPriorityPanel());
}
function productionCard(id, navigation = false) {
  const recipe = PRODUCTION_RECIPES[id];
  const content = card(el('h3', {}, titleOf(id)),
    el('p', {}, 'Product: ', el('strong', {}, nameOf(recipe.output))),
    el('div', { class: 'stat-grid logistics-stats' },
      stat('Local stock', el('span', { 'data-local-buffer': id, 'data-value': state.buildings[id].ready, 'data-limit': producerCapacity(state) }, `${count(state.buildings[id].ready)} / ${count(producerCapacity(state))}`)),
      stat('Potential output', el('span', { 'data-local-rate': id }, `${state.buildings[id].workers * (state.lighthouseRemaining > 0 ? 20 : 10)} units/h`))),
    el('p', { class: 'production-status', 'data-work-progress': id }, productionDescription(id)),
    recipe.input ? note(`Per unit: ${recipe.amount} ${nameOf(recipe.input).toLocaleLowerCase('en-US')} from the central warehouse → 1 ${nameOf(recipe.output).toLocaleLowerCase('en-US')}.`) : null,
    note('Finished goods wait at the building until warehouse workers deliver them to central storage.'));
  if (navigation) content.append(button('Workers and details', () => openPanel('building', id), { class: 'action secondary' }));
  return content;
}
function productionDescription(id) {
  const building = state.buildings[id], recipe = PRODUCTION_RECIPES[id];
  if (!building.workers) return 'Assign workers to start production.';
  if (building.ready >= producerCapacity(state)) return 'Local storage is full. Production is waiting for carriers to collect the goods.';
  if (recipe.input && state.resources[recipe.input] < recipe.amount) return `Missing central warehouse input: ${recipe.amount} ${nameOf(recipe.input).toLocaleLowerCase('en-US')} per unit.`;
  const progress = Math.max(0, ...(building.workProgress || []));
  return `Next unit in ${durationText((360 - progress) / (state.lighthouseRemaining > 0 ? 2 : 1))}.${state.paused ? ' Production is paused.' : ''}`;
}
function warehouseOverview() {
  const limits = warehouseLimits(state);
  return card(el('h3', {}, 'Central warehouse'),
    el('div', { class: 'stat-grid logistics-stats' },
      stat('Storage used', el('span', { 'data-logistics-stat': 'used' }, count(warehouseUsed(state)))),
      stat('Total capacity', el('span', { 'data-logistics-stat': 'total' }, count(limits.total))),
      stat('Capacity per resource', el('span', { 'data-logistics-stat': 'per-resource' }, count(limits.perResource))),
      stat('Transport capacity', el('span', { 'data-logistics-stat': 'carrier-rate' }, `${state.buildings.warehouse.workers * 60} units/h`))),
    el('div', { class: 'warehouse-stock-list' }, MATERIAL_IDS.map(id => el('div', { class: 'warehouse-stock-row' },
      el('strong', {}, nameOf(id)), el('span', { 'data-central-resource': id, 'data-value': state.resources[id], 'data-limit': limits.perResource }, `${count(state.resources[id])} / ${count(limits.perResource)}`)))),
    el('p', { class: 'warehouse-pending' }, 'Deliveries waiting for space: ', el('strong', { 'data-logistics-stat': 'pending' }, logisticsStatValue('pending'))),
    el('div', { class: 'warehouse-pending-details' }, MATERIAL_IDS.map(id => el('span', {}, `${nameOf(id)}: `, el('span', { 'data-pending-resource': id }, count(state.pendingDeliveries?.[id] || 0))))),
    rules('How the warehouse works',
      note('A level 1 Warehouse holds 4,000 units in total and up to 1,000 of each resource. Each additional level increases both limits by 50%. Coins are kept in a separate treasury.'),
      note('Each carrier delivers 60 units per active hour. Transport stops when storage is full or no goods are ready. Set the collection priority below.')));
}
function transportPriorityPanel() {
  const priority = state.transportPriority || MATERIAL_IDS;
  return card(el('h3', {}, 'Transport priority'),
    note('Carriers collect resources higher on the list first. They skip resources with no goods ready or no storage space.'),
    el('ol', { class: 'transport-priority', 'data-transport-priority-list': '' }, priority.map((id, index) => el('li', { 'data-priority-row': id },
      el('span', {}, nameOf(id)), el('div', { class: 'priority-actions' },
        button('↑', () => perform({ type: 'transportPriority', resource: id, direction: -1 }), { class: 'action secondary', disabled: index === 0, 'aria-label': `Move up: ${nameOf(id)}`, 'data-priority-resource': id, 'data-priority-direction': -1 }),
        button('↓', () => perform({ type: 'transportPriority', resource: id, direction: 1 }), { class: 'action secondary', disabled: index === priority.length - 1, 'aria-label': `Move down: ${nameOf(id)}`, 'data-priority-resource': id, 'data-priority-direction': 1 }))))));
}
function logisticsStatValue(key) {
  const limits = warehouseLimits(state);
  const values = { used: count(warehouseUsed(state)), total: count(limits.total), 'per-resource': count(limits.perResource), 'carrier-rate': `${state.buildings.warehouse.workers * 60} units/h`, pending: count(Object.values(state.pendingDeliveries || {}).reduce((sum, value) => sum + value, 0)), returning: (state.returningWorkers || []).length, 'next-return': returnDescription() };
  return values[key] ?? '';
}
function durationText(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(value / 3600), minutes = Math.floor(value % 3600 / 60), remainder = value % 60;
  return `${hours ? `${hours} h ` : ''}${minutes ? `${minutes} min ` : ''}${remainder} s`;
}
function returnDescription() {
  const returning = state.returningWorkers || [];
  return returning.length ? `Next worker returns in ${durationText(Math.min(...returning))}` : 'No workers are returning home.';
}
function rules(title, ...children) {
  return el('details', { class: 'island-rules' }, el('summary', {}, title), ...children);
}
function foodStatValues() {
  return { demand: `${foodDemandPerHour(state)} food/h`, status: hasFoodForResidents(state) ? 'Feeding' : 'Hungry', penalty: hungerPenaltyPerHour(state) ? `−${hungerPenaltyPerHour(state)} percentage points/h` : '0 percentage points/h' };
}
function feedingPanel() {
  const values = foodStatValues();
  return card(el('h3', {}, 'Food and residents'),
    el('div', { class: 'stat-grid' },
      stat('Food demand', el('span', { 'data-food-stat': 'demand' }, values.demand)),
      stat('Status', el('span', { 'data-food-stat': 'status' }, values.status)),
      stat('Shortage penalty', el('span', { 'data-food-stat': 'penalty' }, values.penalty))),
    rules('Food consumption', note('Each resident consumes 1 Food per real active hour, taken only from the central warehouse. Food already allocated to meals remains available to residents even when central stock reaches zero. Once food runs out, base happiness falls by 25 percentage points per active hour until food reaches the central warehouse. New deliveries stop further loss; they do not restore lost happiness. Pausing, hiding the tab or closing the game stops consumption.')));
}
function residentsPanel() {
  const liveStat = (label, id, value) => stat(label, el('span', { 'data-population-stat': id }, value));
  return el('div', {}, el('div', { class: 'stat-grid' }, liveStat('Town Hall level', 'level', state.buildings.townhall.level), liveStat('Residents', 'population', `${state.population} / ${state.capacity}`), liveStat('Assigned', 'workers', totalWorkers(state)), liveStat('Happiness', 'happiness', happinessText())),
    feedingPanel(),
    card(el('h3', {}, 'Work and taxes'),
      el('div', { class: 'stat-grid workforce-summary' }, liveStat('Available', 'free', freeWorkers(state)), liveStat('Returning home', 'returning', (state.returningWorkers || []).length), liveStat('Limit per building', 'worker-limit', Math.floor(state.population / 2)), liveStat('Taxes', 'taxes', hourlyCoins(taxRate(state)))),
      el('p', { class: 'returning-status', 'data-population-stat': 'next-return' }, returnDescription()),
      el('p', { class: 'workforce-income', 'data-population-stat': 'tax-countdown' }, taxDescription()),
      rules('Work and return rules',
        note('Each of the eight workplaces can employ up to half the current population. Each resident can have only one job. With 144 residents, each building can employ up to 72 people.'),
        note('A released worker takes 5 minutes to return home. During that time they are unavailable, do not work and do not pay taxes. You can assign them again after they return.'),
        note('Each production worker makes 10 units per hour, completing one every 6 minutes of their own work. They finish 1 unit after 7 minutes and 2 after 13. Releasing a worker discards their unfinished unit.'),
        note('Each assigned worker pays 1 coin per active hour into the treasury. The Town Hall, House, Chapel and Lighthouse do not employ workers. Pausing or hiding the tab stops taxes.'))),
    el('div', { class: 'panel-grid workforce-grid' }, WORKPLACE_IDS.map(id => workplaceCard(id))),
    card(el('h3', {}, 'Happiness — population average'),
      note('A full store gives its workers −10 happiness, with another −10 every 24 active hours, down to −50. Island happiness is the average across all residents. The penalty ends once the store has space again.'),
      el('div', { 'data-happiness-breakdown': '' }, happinessBreakdown())),
    card(el('h3', {}, 'Town Hall and housing'),
      el('div', { class: 'stat-grid housing-stats' }, liveStat('Town Hall capacity', 'capacity', state.capacity), liveStat('Housing', 'housing', housingCapacity(state)), liveStat('Unhoused', 'unhoused', unhousedResidents(state)), liveStat('Happiness impact', 'penalty', housingPenaltyText())),
      housingNotice(), note('Population capacity = 24 × Town Hall level. Housing = 24 × House level. Population can exceed housing, up to the Town Hall capacity.'),
      note('Each unhoused resident lowers happiness by 1 percentage point per active hour. For example, 78 residents with 72 beds lose 6 points per hour. A House upgrade stops further penalties once there is enough housing; it does not restore lost happiness.'),
      button('Upgrade House', () => openPanel('building', 'house')), button('Upgrade Town Hall', () => openPanel('building', 'townhall'), { class: 'action secondary' })),
    card(el('h3', {}, 'Population growth'), el('p', { class: 'population-growth', 'data-population-stat': 'growth' }, populationDescription()),
      note('At 0% happiness, population stays the same. Positive happiness attracts new residents; negative happiness causes departures. At least 6 residents always remain.'),
      el('div', { class: 'population-rate-table' }, ...[['Happiness', 'Change of 1 resident'], ['±25%', 'every 12 h'], ['±50%', 'every 6 h'], ['±75%', 'about every 1 h 43 min'], ['±100%', 'every 1 h']].map(([label, value]) => el('div', {}, el('span', {}, label), el('strong', {}, value)))),
      note('Hours mean real active time in a visible tab. Pausing stops population changes; clock speed 1× / 2× / 4× does not shorten these hours. The timer waits while the tab is hidden or the game is closed.'),
      note('Overcrowding changes happiness over time, so the next population change is estimated using current happiness.')),
    el('p', { class: 'notice', 'data-lighthouse-bonus': '' }, lighthouseDescription()), note('Decorations and paths improve base happiness. Chapel and Lighthouse bonuses last for a limited time.'));
}
function workplaceCard(id) {
  const building = state.buildings[id];
  const content = card(el('h3', {}, titleOf(id)),
    !workplaceUnlocked(state, id) ? note(`Available from Town Hall level ${id === 'market' ? 2 : 4}.`) : null,
    el('p', { class: 'workforce-count' }, 'Workers: ', el('strong', { 'data-worker-count': id }, building.workers), ' / ', el('span', { 'data-worker-limit': id }, workerLimit(state, id))),
    el('p', {}, 'Taxes: ', el('span', { 'data-workplace-tax': id }, hourlyCoins(building.workers * (state.chapelRemaining > 0 ? 2 : 1)))),
    el('p', { 'data-full-penalty': id, class: 'full-storage-status' }, fullPenaltyDescription(id)),
    PRODUCTION_RECIPES[id] ? el('p', { class: 'workplace-production', 'data-work-progress': id }, productionDescription(id)) : id === 'warehouse' ? el('p', {}, 'Transport capacity: ', el('span', { 'data-logistics-stat': 'carrier-rate' }, `${building.workers * 60} units/h`)) : null,
    el('div', { class: 'workforce-actions' },
      button('− Worker', () => perform({ type: 'assign', building: id, delta: -1 }), { class: 'action secondary', disabled: !building.workers, 'data-worker-building': id, 'data-worker-delta': -1, 'aria-label': `Release worker: ${titleOf(id)}` }),
      button('+ Worker', () => perform({ type: 'assign', building: id, delta: 1 }), { disabled: freeWorkers(state) <= 0 || building.workers >= workerLimit(state, id), 'data-worker-building': id, 'data-worker-delta': 1, 'aria-label': `Assign worker: ${titleOf(id)}` })),
    el('div', { class: 'workforce-actions workforce-bulk-actions' },
      button('Assign to limit', () => adjustWorkforce(id, 'max'), { class: 'action secondary', disabled: freeWorkers(state) <= 0 || building.workers >= workerLimit(state, id), 'data-worker-building': id, 'data-worker-action': 'max', 'aria-label': `Assign to limit: ${titleOf(id)}` }),
      button('Release all', () => adjustWorkforce(id, 'clear'), { class: 'action secondary', disabled: !building.workers, 'data-worker-building': id, 'data-worker-action': 'clear', 'aria-label': `Release all: ${titleOf(id)}` })));
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
  if (!rate) return 'No residents are working, so no taxes are collected.';
  const seconds = Math.max(0, Math.ceil((1 - state.taxProgress) * 3600 / rate));
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), remainder = seconds % 60;
  return `Next tax coin in: ${hours ? `${hours} h ` : ''}${minutes ? `${minutes} min ` : ''}${remainder} s.${state.paused ? ' Timer stopped — paused.' : ''}`;
}
function housingPenaltyText() {
  const unhoused = unhousedResidents(state);
  return unhoused ? `−${unhoused} percentage points/h` : '0 percentage points/h';
}
function housingDescription() {
  const unhoused = unhousedResidents(state);
  return unhoused ? `Overcrowding: ${unhoused} residents have no home. Happiness falls by ${unhoused} percentage points per active hour.${state.paused ? ' Penalty stopped — paused.' : ''}` : `Everyone has a home: ${state.population} / ${housingCapacity(state)} spaces occupied. No overcrowding penalty.`;
}
function housingNotice() {
  return el('p', { class: 'notice housing-notice', 'data-housing-warning': '', 'data-overcrowded': String(unhousedResidents(state) > 0), 'data-population-stat': 'housing-status' }, housingDescription());
}
function populationDescription() {
  const rate = populationRate(state.happiness);
  const overcrowded = unhousedResidents(state) > 0;
  if (!rate) return `0% happiness · no population growth or decline.${overcrowded ? ' Overcrowding lowers happiness and may cause population decline.' : ''}`;
  if (rate > 0 && state.population >= state.capacity) return `Population capacity of ${state.capacity} reached. Upgrade the Town Hall to increase capacity.`;
  if (rate < 0 && state.population <= 6) return 'Minimum population of 6 reached. Population cannot fall further; production and development remain available.';
  const direction = Math.sign(rate);
  const progress = state.populationDirection === direction ? state.populationProgress : 0;
  const seconds = Math.max(0, Math.ceil((1 - progress) * 3600 / Math.abs(rate)));
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), remainder = seconds % 60;
  const time = `${hours ? `${hours} h ` : ''}${minutes ? `${minutes} min ` : ''}${remainder} s`;
  return `${overcrowded ? 'Estimate at current happiness: ' : ''}${rate > 0 ? 'A new resident' : 'One resident leaves'} in ${time}.${state.paused ? ' Timer stopped — paused.' : ''}${overcrowded ? ' Overcrowding changes this rate.' : ''}`;
}
function tradePanel() {
  if (!workplaceUnlocked(state, 'dock')) return el('div', {}, note('The Harbor and coin trading unlock at Town Hall level 4.'), button('Market — barter goods', () => openPanel('market')), button('Upgrade Town Hall', () => openPanel('building', 'townhall'), { class: 'action secondary' }));
  return el('div', {}, note('Trade resources for coins at the Harbor. Each offer shows its result alongside your current stock.'), resourceList(),
    button('Open Market — goods for goods', () => openPanel('market')),
    el('div', { class: 'panel-grid' }, MATERIAL_IDS.map(id => card(el('h3', {}, nameOf(id)),
      button(`Sell 10 → ${RESOURCES[id].price * 10} coins`, () => perform({ type: 'trade', resource: id, amount: 10 })),
      button(`Buy 10 for ${RESOURCES[id].price * 20} coins`, () => perform({ type: 'trade', resource: id, amount: 10, direction: 'buy' }), { class: 'action secondary' })))));
}
function fullPenaltyDescription(id) {
  const penalty = storagePenalty(state, id);
  return penalty ? `Storage full: −${penalty} happiness for each worker here. Work is waiting for space.` : 'No full-storage penalty.';
}
function happinessBreakdown() {
  return happinessGroups(state).map(group => el('div', { class: 'happiness-row' },
    el('span', {}, group.building ? titleOf(group.building) : 'Available and returning'),
    el('strong', {}, `${group.count} residents · ${Number(group.happiness.toFixed(1)).toLocaleString('en-US')}%`)));
}
function blessingDescription() {
  const automatic = state.chapelRemaining > 0 ? `Upgrade bonus: ${durationText(state.chapelRemaining)} remaining, +${state.buildings.chapel.level * 10} happiness and taxes ×2.` : 'No active upgrade bonus.';
  const manual = state.blessingRemaining > 0 ? `Blessing: +20 happiness for ${durationText(state.blessingRemaining)}.` : `Uses remaining: ${Math.max(0, state.buildings.chapel.level - state.blessingsUsed)}.`;
  return `${automatic} ${manual}`;
}
function blessingPanel() {
  return card(el('h3', {}, 'Chapel and blessings'),
    note('Completing a Chapel upgrade gives everyone +10 happiness per new level and doubles taxes for 10 hours. Level 1 has no passive bonus.'),
    el('p', { 'data-chapel-time': '', class: 'notice' }, blessingDescription()),
    note('A manual blessing grants +50 of every resource and +20 happiness to everyone for one hour. The Chapel level determines the total number of one-time uses. Only one manual blessing can be active at a time.'),
    button('Activate blessing', () => perform({ type: 'blessing' }), { disabled: state.blessingRemaining > 0 || state.blessingsUsed >= state.buildings.chapel.level, 'data-blessing': '' }));
}
function marketPanel() {
  if (!workplaceUnlocked(state, 'market')) return note('The Market unlocks at Town Hall level 2.');
  const rows = MATERIAL_IDS.map(id => card(el('h3', {}, nameOf(id)),
    el('div', { class: 'stat-grid' }, stat('Available at Market', el('span', { 'data-market-stock': id }, count(state.market.stock[id]))), stat('Locked for one hour', el('span', { 'data-market-locked': id }, count(state.market.locked.filter(lot => lot.resource === id).reduce((sum, lot) => sum + lot.amount, 0))))),
    button('Bring 10 to Market', () => perform({ type: 'marketOrder', resource: id, amount: 10 }), { class: 'action secondary', 'data-market-order': id }),
    button('Request Warehouse pickup', () => perform({ type: 'marketDispatch', resource: id, amount: Math.max(0, state.market.stock[id] - state.market.dispatch[id]) }), { class: 'action secondary', 'data-market-dispatch': id })));
  const from = el('select', { id: 'market-from', 'aria-label': 'Goods offered' }, MATERIAL_IDS.map(id => el('option', { value: id }, nameOf(id))));
  const to = el('select', { id: 'market-to', 'aria-label': 'Goods received' }, MATERIAL_IDS.map(id => el('option', { value: id, selected: id === 'stone' }, nameOf(id))));
  const quantity = el('input', { id: 'market-quantity', type: 'number', min: '10', step: '10', value: '10', 'aria-label': 'Quantity to exchange' });
  return el('div', {}, el('h3', {}, 'Market — barter without coins'),
    note('Raw materials: Wood, Stone, Grain. Processed goods: Planks, Food. Exchange within one category at 1:1 before the 10% fee: 10 units yield 9. There is no limit on the number of exchanges.'),
    el('div', { class: 'stat-grid' }, stat('Storage used', el('strong', { 'data-market-used': '' }, `${count(marketUsed(state))} / ${count(marketCapacity(state))}`)), stat('Delivery to Market', `${state.buildings.market.workers * 60} units/h`)),
    el('p', { class: 'notice', 'data-market-timer': '' }, state.market.locked.length ? durationText(Math.min(...state.market.locked.map(lot => lot.remaining))) : 'No locked goods'),
    note('Market workers bring goods from the central Warehouse. Each delivery is locked for one hour after arrival. After an exchange, request pickup so Warehouse workers can bring the goods back.'),
    card(el('h3', {}, 'Exchange goods'), el('div', { class: 'market-exchange-fields' }, from, to, quantity), button('Exchange — 10% fee', () => perform({ type: 'marketExchange', from: from.value, to: to.value, amount: Number(quantity.value) }), { 'data-market-exchange': '' })),
    el('div', { class: 'panel-grid' }, rows));
}
function notificationsPanel() {
  return el('div', {}, button('Mark all as read', () => perform({ type: 'readNotifications' }), { class: 'action secondary' }),
    state.notifications.length ? state.notifications.map(item => card(el('h3', {}, item.title), el('p', {}, item.message), el('small', {}, item.read ? 'Read' : 'New'))) : note('No notifications. Full-storage alerts will appear here.'));
}
function tasksPanel() {
  return el('div', {}, button('Main objective: the old Lighthouse', () => openPanel('objective')),
    TASKS.map(task => card(el('h3', {}, task.name), el('p', {}, task.description), el('p', { class: 'cost' }, `Reward: ${costText(task.reward)}`),
      button(state.tasks[task.id] ? 'Reward claimed' : taskReady(state, task.id) ? 'Claim reward' : 'In progress', () => perform({ type: 'claim', task: task.id }), { disabled: !!state.tasks[task.id] || !taskReady(state, task.id) }))));
}
function decorationsPanel() {
  return el('div', {}, note('Decorations improve resident happiness. Each purchase is saved as part of your island progress.'),
    el('div', { class: 'panel-grid' }, [['flowers', 'Flowers by the houses', 25], ['lamp', 'Path lamps', 40], ['bench', 'Village benches', 35]].map(([id, name, cost]) => card(el('h3', {}, name), el('p', {}, `Coins: ${cost} · owned: ${state.decorations?.[id] || 0}`), button('Add decoration', () => perform({ type: 'decorate', decoration: id }))))));
}
function pathsPanel() {
  return el('div', {}, note('Connect the island districts. Each path upgrade costs 5 Wood and 10 Stone and adds 1 happiness point.'),
    stat('Upgraded sections', state.paths || 0), button('Upgrade paths and bridge', () => perform({ type: 'path' })));
}
function settingsPanel() {
  const checkbox = (key, label) => el('label', { class: 'setting-row' }, el('span', {}, label), el('input', { type: 'checkbox', checked: !!state.settings[key], onchange: event => perform({ type: 'setting', key, value: event.target.checked }) }));
  return el('div', {}, checkbox('motion', 'Animations and highlights'), note('Progress is saved automatically in this browser.'),
    button('Save now', () => { save(); toast('Progress saved.'); }),
    button('Start a new island', () => openPanel('reset'), { class: 'action danger' }));
}
function timePanel() {
  return el('div', {}, stat('Island day', state.day), stat('Speed', state.paused ? 'Paused' : `${state.speed}×`),
    note('Pausing stops the clock, work, journeys home, transport, taxes and population changes. Speed 1× / 2× / 4× only accelerates the island clock; production, transport, taxes and population still use real active hours.'),
    button(state.paused ? 'Resume' : 'Pause', () => perform({ type: 'pause' })),
    [1, 2, 4].map(speed => button(`${speed}×`, () => perform({ type: 'speed', speed }), { class: 'action secondary' })));
}
function expeditionsPanel() {
  return el('div', {}, note('Find a route from camp to the goal. Collect chests and save tools for obstacles. Rewards add to your island stock.'),
    EXPEDITIONS.map(expedition => card(el('h3', {}, expedition.name), el('p', {}, expedition.description), el('p', { class: 'cost' }, `Reward: ${costText(expedition.reward)}`),
      state.expeditions[expedition.id]?.completed ? el('span', { class: 'badge' }, 'Completed') : null,
      button(state.expeditions[expedition.id]?.completed ? 'Replay without reward' : 'Depart', () => startExpedition(expedition.id)))));
}
function startExpedition(id) {
  const expedition = EXPEDITIONS.find(item => item.id === id);
  let row = 0, col = 0;
  expedition.map.forEach((line, r) => { if (line.includes('S')) { row = r; col = line.indexOf('S'); } });
  puzzle = { id, row, col, moves: 0, tools: { ...expedition.tools }, cleared: new Set(), collected: new Set(), key: false, complete: false, message: 'Choose an adjacent tile to move.' };
  openPanel('puzzle', id);
}
function move(row, col) {
  if (!puzzle || puzzle.complete || Math.abs(row - puzzle.row) + Math.abs(col - puzzle.col) !== 1) return;
  const expedition = EXPEDITIONS.find(item => item.id === puzzle.id);
  const id = `${row},${col}`;
  const terrain = puzzle.cleared.has(id) ? '.' : expedition.map[row]?.[col];
  if (terrain == null) return;
  if (terrain === 'D' && !puzzle.key) { puzzle.message = 'Find the key to open the gate.'; renderPanel(); return; }
  const tool = { W: 'bridge', T: 'axe', R: 'dynamite' }[terrain];
  if (tool) {
    if (!puzzle.tools[tool]) { puzzle.message = 'You do not have the required tool. Find another route.'; renderPanel(); return; }
    puzzle.tools[tool]--; puzzle.cleared.add(id);
  }
  puzzle.row = row; puzzle.col = col; puzzle.moves++;
  puzzle.message = 'Choose an adjacent tile to move.';
  if (terrain === 'K') { puzzle.key = true; puzzle.collected.add(id); puzzle.message = 'Key found.'; }
  if (terrain === 'C' && !puzzle.collected.has(id)) { puzzle.collected.add(id); puzzle.message = 'Chest found. Reach the goal to claim the reward.'; }
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
  const names = { S: 'Camp', '.': 'Path', W: 'Water — bridge', T: 'Tree — axe', R: 'Rock — dynamite', C: 'Chest', G: 'Goal', K: 'Key', D: 'Gate' };
  const icons = { S: '⌂', '.': '·', W: '≈', T: '♠', R: '◆', C: '▣', G: '⚑', K: '⚿', D: '▥' };
  const board = el('div', { class: 'puzzle-board', style: { '--cols': expedition.map[0].length }, 'aria-label': 'Expedition board' });
  expedition.map.forEach((line, row) => [...line].forEach((original, col) => {
    const id = `${row},${col}`;
    const tile = puzzle.cleared.has(id) || puzzle.collected.has(id) ? '.' : original;
    const isPlayer = row === puzzle.row && col === puzzle.col;
    const reachable = Math.abs(row - puzzle.row) + Math.abs(col - puzzle.col) === 1;
    board.append(button(isPlayer ? '●' : icons[tile], () => move(row, col), { class: `puzzle-cell${isPlayer ? ' is-player' : ''}${reachable ? ' reachable' : ''}`, 'data-tile': tile,
      'aria-label': `${isPlayer ? 'Your position' : names[tile]}, row ${row + 1}, column ${col + 1}`, disabled: puzzle.complete || !reachable, 'data-row': row, 'data-col': col }));
  }));
  return el('div', {}, el('div', { class: 'puzzle-tools' }, `Moves: ${puzzle.moves} · Target: ${expedition.par || '—'} · Bridges: ${puzzle.tools.bridge || 0} · Axes: ${puzzle.tools.axe || 0} · Dynamite: ${puzzle.tools.dynamite || 0}`),
    board, el('p', { class: 'puzzle-status', role: 'status' }, puzzle.message),
    note('● Your position · ⚑ goal · ▣ chest · ≈ water · ♠ tree · ◆ rock. Move up, down, left or right.'),
    puzzle.complete ? button('Return to island', closePanel) : button('Restart expedition', () => startExpedition(puzzle.id), { class: 'action secondary' }),
    button('Expedition list', () => openPanel('expeditions'), { class: 'action secondary' }));
}
function renderPanel() {
  if (!panel) return;
  closeInfoPopup(false);
  const titles = { home: 'Your island', menu: 'HARBORLIGHT', buildings: 'Buildings', resources: 'Warehouse and transport', residents: 'Residents', trade: 'Harbor trade', tasks: 'Tasks', objective: 'Restore the Lighthouse', settings: 'Settings', time: 'Island time', expeditions: 'Expeditions', map: 'Island map', decorations: 'Decorations', paths: 'Paths and bridges', reset: 'New island' };
  let title = titles[panel.kind] || titleOf(panel.id);
  let body;
  switch (panel.kind) {
    case 'building': body = buildingPanel(panel.id); break;
    case 'buildings': body = buildingsPanel(); break;
    case 'resources': body = resourcesPanel(panel.id); break;
    case 'residents': body = residentsPanel(); break;
    case 'trade': body = tradePanel(); break;
    case 'market': title = 'Market'; body = marketPanel(); break;
    case 'construction': title = 'Construction and queue'; body = constructionPanel(); break;
    case 'notifications': title = 'Notifications'; body = notificationsPanel(); break;
    case 'tasks': body = tasksPanel(); break;
    case 'objective': body = objectivePanel(); break;
    case 'settings': body = settingsPanel(); break;
    case 'time': body = timePanel(); break;
    case 'decorations': body = decorationsPanel(); break;
    case 'paths': body = pathsPanel(); break;
    case 'expeditions': body = expeditionsPanel(); break;
    case 'puzzle': title = EXPEDITIONS.find(item => item.id === puzzle.id).name; body = puzzlePanel(); break;
    case 'map': body = el('div', {}, note('Choose a district to locate it on the island.'), el('div', { class: 'panel-grid' }, Object.keys(buildingRegions).map(id => button(titleOf(id), () => {
      closePanel(); const node = document.getElementById(`hit-world-${id}`); node.focus(); node.classList.add('world-pulse'); setTimeout(() => node.classList.remove('world-pulse'), 3000);
    })))); break;
    case 'reset': body = el('div', {}, note('Starting a new island will erase your current progress in this browser.'), button('Yes, start over', () => { state = createState(); puzzle = null; save(); renderHUD(); openPanel('home'); toast('Your new island is ready.'); }, { class: 'action danger' }), button('Keep my island', () => openPanel('settings'), { class: 'action secondary' })); break;
    default: body = el('div', {}, note('Rebuild the Lighthouse, manage your settlement and gather materials on expeditions.'),
      stat('Loyalty — consecutive days', `${state.loyalty.streak} / 10`),
      button('Construction and queue', () => openPanel('construction'), { class: 'action secondary' }),
      button('Notifications', () => openPanel('notifications'), { class: 'action secondary' }),
      el('div', { class: 'stat-grid' }, stat('Town Hall level', el('span', { 'data-population-stat': 'level' }, state.buildings.townhall.level)), stat('Residents', el('span', { 'data-population-stat': 'population' }, `${state.population} / ${state.capacity}`)), stat('Happiness', el('span', { 'data-population-stat': 'happiness' }, happinessText())), stat('Day', state.day)),
      el('div', { class: 'panel-grid' }, [['objective', 'Main objective'], ['buildings', 'Buildings'], ['expeditions', 'Expeditions'], ['tasks', 'Tasks'], ['residents', 'Residents'], ['resources', 'Warehouse'], ['trade', 'Trade'], ['settings', 'Settings']].map(([kind, label]) => button(label, () => openPanel(kind)))),
      button('Return to island', closePanel, { class: 'action secondary' }));
  }
  const scroll = dialog.querySelector('.dialog-body')?.scrollTop || 0;
  dialog.replaceChildren(el('header', { class: 'dialog-header' }, el('div', {}, el('span', { class: 'eyebrow' }, 'HARBORLIGHT · ISLAND 01'), el('h2', { id: 'dialog-title' }, title)), button('×', closePanel, { class: 'dialog-close', 'aria-label': 'Close window' })), el('div', { class: 'dialog-body' }, panelNotice ? el('p', { class: 'notice action-feedback', role: 'status' }, panelNotice) : null, body));
  dialog.querySelector('.dialog-body').scrollTop = scroll;
}

recordVisit(state);
save();
renderHUD();
createAmbientScene(stage, () => state).ready.catch(error => {
  console.error(error);
  toast('Island animations could not be loaded. Refresh the page to try again.');
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
