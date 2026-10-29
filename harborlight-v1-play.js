import { BUILDINGS, RESOURCES, EXPEDITIONS, TASKS, createState, normalizeState, act, tick, buildingCost, canAfford, taskReady, totalWorkers, populationRate, housingCapacity, unhousedResidents, buildingLevelLimit, upgradeEligibility, WORKPLACE_IDS, workerLimit, freeWorkers, happinessGroups, workplaceUnlocked, storagePenalty, recordVisit, foodDemandPerHour, hasFoodForResidents, hungerPenaltyPerHour, residentHappiness, residentHappinessRate, productionMultiplier } from './harborlight-v1-state.js?v=frontend-v16';
import { MATERIAL_IDS, PRODUCTION_RECIPES, warehouseLimits, warehouseUsed, stockRoom, producerCapacity, marketCapacity, marketUsed, nextConstruction, constructionCounts, premiumActive, estimateMaterialsSeconds, plannedLevel } from './harborlight-v1-logistics.js?v=frontend-v16';
import * as State from './harborlight-v1-state.js?v=frontend-v16';
import * as Logistics from './harborlight-v1-logistics.js?v=frontend-v16';
import * as Residents from './harborlight-v1-residents.js?v=frontend-v16';
import * as Activities from './harborlight-v1-activities.js?v=frontend-v16';
import * as Leisure from './harborlight-v1-leisure.js?v=frontend-v16';
import * as Effects from './harborlight-v1-effects.js?v=frontend-v16';
import * as Progression from './harborlight-v1-progression.js?v=frontend-v16';
import * as I18n from './harborlight-v1-i18n.js?v=frontend-v16';
import { createAmbientScene } from './harborlight-v1-ambient.js?v=frontend-v16';
import { profileContext, islandDisplayName, applyIslandNamePreference, authHref } from './harborlight-v1-profile.js?v=frontend-v16';
import { buildingPurpose, gameGoal, residentsPurpose, warehousePurpose, lighthouseLevelName } from './harborlight-v1-copy.js?v=frontend-v16';
import { mountMiniGame } from './harborlight-v1-minigame-ui.js?v=frontend-v16';
import { createTutorialPanel, createTutorialGuide, showTutorialAchievement } from './harborlight-v1-tutorial-ui.js?v=frontend-v16';

I18n.registerTranslations({
  "Time left": "Pozostały czas",
  "Draw a minigame": "Losuj minigrę",
  "Marble maze": "Kulki w labiryncie",
  "Picture triples": "Dopasuj trójki",
  "Expedition minigame": "Minigra ekspedycji",
  "Try another minigame": "Spróbuj kolejnej minigry",
  "Island rules": "Zasady wyspy",
  "Residents and food": "Mieszkańcy i wyżywienie",
  "Production and transport": "Produkcja i transport",
  "Happiness and progress": "Szczęście i rozwój",
  "Continue tutorial": "Wróć do samouczka",
  "Resume tutorial": "Wznów samouczek",
  "Tutorial steps completed": "Ukończone kroki samouczka",
  "Each round randomly chooses a marble maze or picture triples. Win up to 50 coins, cash out, or risk the whole unclaimed pot on the next round. The deadline ends the attempt and clears that pot.": "Każda runda losuje labirynt z kulkami albo dopasowywanie trójek. Wygraj do 50 monet, wypłać je albo postaw całą niewypłaconą pulę na kolejny etap. Upływ czasu kończy próbę i zeruje tę pulę.",
  "Guide the marbles into their goals with the mouse or by tilting your phone. The first round lasts 3 minutes: 50 coins for the first 2 minutes, then 1 coin less every 15 seconds.": "Wprowadź kulki do otworów myszką albo przechylając telefon. Pierwszy etap trwa 3 minuty: przez pierwsze 2 minuty można wygrać 50 monet, później o 1 monetę mniej co 15 sekund.",
  "Reveal three identical black-and-white pictures to clear them. Boards grow with difficulty; later, hidden pictures move. Time limits grow from 4 to at most 15 minutes.": "Odsłoń trzy identyczne czarno-białe obrazki, aby usunąć je z planszy. Kolejne plansze są większe, a później zakryte obrazki zmieniają miejsca. Limit czasu rośnie od 4 do najwyżej 15 minut.",
  "Time is up. The unclaimed pot was lost.": "Czas minął. Niewypłacona pula przepadła.",
  "Give residents jobs and keep Food in the central Warehouse. Workers need five minutes to reach work; hunger slows production and transport.": "Przydziel mieszkańcom pracę i zapewnij żywność w magazynie centralnym. Do pracy idą pięć minut, a głód spowalnia produkcję i transport.",
  "Production waits in local storage until carriers deliver it. Upgrades spend central materials, then transport and construction take place in separate phases.": "Gotowe produkty czekają przy budynkach na tragarzy. Rozbudowa wykorzystuje zasoby z magazynu centralnego; najpierw trwa transport, a potem budowa.",
  "Food, work, housing and temporary attractions influence happiness. Develop all buildings, improve paths and complete tasks while keeping residents happy.": "Na szczęście wpływają jedzenie, praca, mieszkanie i czasowe atrakcje. Rozwijaj budynki, ulepszaj ścieżki i wykonuj zadania, dbając o mieszkańców."
});

const currentProfile = profileContext(location.search);
const NEW_PLAYER_PROFILE = currentProfile.newPlayer;
const NEW_PLAYER_SLOT = currentProfile.slot;
const OFFICIAL_GAME_URL = 'https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html';
const SAVE_KEY = currentProfile.saveKey;
document.documentElement.dataset.profile = NEW_PLAYER_PROFILE ? 'new-player' : 'preview';
if (NEW_PLAYER_SLOT) document.documentElement.dataset.profileSlot = NEW_PLAYER_SLOT;
const stage = document.getElementById('stage');
const layer = document.getElementById('semanticLayer');
const dialog = document.getElementById('island-dialog');
const toastElement = document.getElementById('island-toast');
const placementBanner = document.getElementById('placement-banner');
let state;
try { state = normalizeState(JSON.parse(localStorage.getItem(SAVE_KEY))); }
catch { state = createState(); }
try { applyIslandNamePreference(state, localStorage, location.search); } catch {}
try { const preferred = localStorage.getItem('harborlight-language'); if (['en','pl'].includes(preferred)) state.settings.language = preferred; } catch {}
let panel = null;
let placement = null;
let puzzle = null;
let miniController = null;
let miniGameStatus = '';
let miniSavedAt = 0;
let tutorialCelebration = null;
let tutorialReady = false;
let tutorialGuideSignature = '';
let tutorialPanelSignature = '';
const deferredTutorialRewards = new Set();
let toastTimer;
let previousFocus;
let panelNotice = '';
let lastTick = Date.now();
let activitySignature = "";
let taskAcceptanceDialog = null;
let confirmationDialog = null;
let lastInputAt = -Infinity;
let lastRoadCelebration = 0;
let mobileDockSignature = '';
let estimateFrame = 0;
const estimateCache = new Map();
const initialLevels = Object.fromEntries(Object.entries(createState().buildings).map(([id, value]) => [id, value.level]));
const productionBuildings = Object.keys(BUILDINGS).filter(id => BUILDINGS[id].resource);
const worldAdditions = el('div', { class: 'world-additions', 'aria-hidden': 'true' });
stage.append(worldAdditions);
let worldSignature = '';

function settleActiveTick() {
  const now = Date.now();
  if (typeof State.advanceTo === 'function') State.advanceTo(state, now);
  else tick(state, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;
}

function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'style') { for (const [property, setting] of Object.entries(value)) property.startsWith('--') ? node.style.setProperty(property, setting) : node.style[property] = setting; }
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== false && value != null) node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}
const nameOf = id => RESOURCES[id]?.name || ({ coins: 'Coins', wood: 'Wood', stone: 'Stone', food: 'Food', planks: 'Planks', grain: 'Grain', construction: 'Construction' }[id]) || id;
const language = () => state.settings.language === 'pl' ? 'pl' : 'en';
const count = value => I18n.formatNumber(Math.floor(value || 0), language());
const text = value => I18n.translate(String(value), language());
function localize(root = document.body) { I18n.translateDOM(root, language()); document.documentElement.lang = language(); }
const titleOf = id => BUILDINGS[id]?.name || id;
const costText = cost => Object.entries(cost || {}).map(([id, value]) => `${nameOf(id)}: ${count(value)}`).join(' · ');
const button = (label, fn, attributes = {}) => el('button', { type: 'button', class: 'action', onclick: fn, ...attributes }, label);
const note = text => el('p', { class: 'notice' }, omitTaxInformation(text));
const card = (...children) => el('section', { class: 'info-card' }, ...children);

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  catch { toast('Your browser cannot save progress. You can keep playing until this tab is closed.'); }
}
function toast(message) {
  toastElement.textContent = text(omitTaxInformation(message) || 'Island updated.');
  toastElement.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastElement.hidden = true; }, 3500);
}
function perform(action) {
  // Settle elapsed wall-clock time before changing an assignment or spending goods.
  settleActiveTick();
  const focused = dialog.contains(document.activeElement) ? document.activeElement : null;
  const focusPriority = focused?.dataset.priorityResource;
  const focusWarehousePriority = focused?.dataset.warehousePriority;
  const focusPriorityDirection = focused?.dataset.priorityDirection;
  const focusLabel = focused?.textContent;
  const focusWorker = focused?.dataset.workerBuilding;
  const focusWorkerAction = focused?.dataset.workerAction;
  const focusWorkerDelta = focused?.dataset.workerDelta;
  const previousRoad = Leisure.roadSummary?.(state)?.level || 0;
  const previousAchievements = new Set((state.taskAchievements || []).map(item => item.id));
  const result = act(state, action);
  panelNotice = omitTaxInformation(result.message);
  if (result.ok) { if (action.type === 'setting' && action.key === 'language') { try { localStorage.setItem('harborlight-language', state.settings.language); } catch {} } save(); renderHUD(); }
  toast(result.message);
  if (panel && dialog.open) {
    renderPanel();
    const target = focusWarehousePriority ? dialog.querySelector(`[data-warehouse-priority="${focusWarehousePriority}"]`) : focusPriority ? dialog.querySelector(`[data-priority-resource="${focusPriority}"][data-priority-direction="${focusPriorityDirection}"]`) : focusWorker ? dialog.querySelector(`[data-worker-building="${focusWorker}"][${focusWorkerAction ? `data-worker-action="${focusWorkerAction}"` : `data-worker-delta="${focusWorkerDelta}"`}]`) : [...dialog.querySelectorAll('button,input')].find(node => node.textContent === focusLabel && !node.disabled);
    (target && !target.disabled ? target : dialog.querySelector('.dialog-close'))?.focus({ preventScroll: true });
  }
  if (result.ok) {
    const achievement = (state.taskAchievements || []).find(item => !previousAchievements.has(item.id));
    if (achievement) showTaskCelebration(achievement);
    if (action.type === 'upgradeRoad') showRoadSuccess((Leisure.roadSummary?.(state)?.level || 0) > previousRoad);
  }
  return result.ok;
}
document.body.append(button('Island menu', () => openPanel('menu'), { class: 'mobile-island-menu', 'aria-label': 'Open island menu' }), button('Tasks', () => openPanel('tasks'), { class: 'mobile-activities', 'aria-label': 'Open Lighthouse tasks' }));

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
hotspot('account', 'Sign in or create an account', [0, 0, 0, 0], () => { location.href = authHref(location.search); });
hotspot('menu', 'Game menu', [1623, 7, 43, 50], () => openPanel('menu'));
hotspot('objective-title', 'Main objective — develop your island', [1405, 76, 260, 65], () => openPanel('objective'));
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
hotspot('boat', 'Ship — harbor trade', [215, 635, 219, 137], () => openPanel('trade'));
const dockCategories = [['administration', 'Administration'], ['economy', 'Economy'], ['resources', 'Resources'], ['decorations', 'Decorations'], ['paths', 'Paths']];
const dockTabs = el('nav', { class: 'dock-tabs', 'aria-label': 'Island building and resource dock' },
  ...dockCategories.map(([id, label]) => button(label, () => setDockCategory(id), { id: `hit-category-${id}`, class: 'dock-tab', 'data-dock-category': id, 'aria-pressed': false })));
layer.append(dockTabs);
const BUILDING_DOCK_ORDER = ['townhall', 'house', 'farm', 'windmill', 'quarry', 'lumber', 'sawmill', 'warehouse', 'market', 'dock', 'chapel', 'lighthouse'];
const BUILDING_DOCK_GROUPS = {
  administration: ['townhall', 'house', 'warehouse', 'market', 'dock', 'chapel', 'lighthouse'],
  economy: ['farm', 'windmill', 'quarry', 'lumber', 'sawmill']
};
const buildingDock = el('nav', { class: 'building-dock-cards', 'aria-label': 'Buildings', 'data-building-dock': '' });
for (const id of BUILDING_DOCK_ORDER) {
  const [x,y,w,h] = buildingRegions[id];
  const frameWidth = 124, frameHeight = 84;
  const scale = Math.max(frameWidth / w, frameHeight / h);
  const offsetX = x * scale + (w * scale - frameWidth) / 2;
  const offsetY = y * scale + (h * scale - frameHeight) * (id === 'lighthouse' ? .2 : .5);
  const picture = el('span', { class: 'building-dock-picture', 'aria-hidden': 'true', style: { backgroundImage: 'url("assets/harborlight-v1-approved.png")', backgroundSize: `${1672 * scale}px ${941 * scale}px`, backgroundPosition: `${-offsetX}px ${-offsetY}px`, width: `${frameWidth}px`, height: `${frameHeight}px` } });
  const control = button('', () => openPanel('building', id), { id: `hit-dock-${id}`, class: 'building-dock-card', 'data-dock-building': id, 'aria-label': `${titleOf(id)} — construction and upgrades` });
  control.append(el('small', { class: 'building-dock-level', 'data-dock-level': id }, `Lv. ${state.buildings[id].level}`), picture, el('span', { class: 'building-dock-name' }, titleOf(id)));
  if (WORKPLACE_IDS.includes(id)) control.append(el('span', { class: 'building-dock-workers', 'data-dock-workers': id }));
  buildingDock.append(control);
}
layer.append(buildingDock);
const resourceIllustrations = {
  wood: '<path d="M15 57L58 33L83 46L40 72Z" fill="#76502e"/><path d="M16 50L58 26L83 39L41 64Z" fill="#b48045"/><path d="M17 45L58 21L83 34L42 59Z" fill="#d4a064"/><ellipse cx="31" cy="54" rx="13" ry="9" transform="rotate(29 31 54)" fill="#eed2a0" stroke="#815832" stroke-width="2"/><ellipse cx="31" cy="54" rx="7" ry="4" transform="rotate(29 31 54)" fill="none" stroke="#b38850"/><path d="M43 38L66 24M48 45L74 30M43 52L71 37" stroke="#80562e" stroke-width="2"/>',
  planks: '<path d="M13 56L61 26L86 39L38 70Z" fill="#9a6536"/><path d="M13 48L61 18L86 31L38 62Z" fill="#dfb278" stroke="#83572f" stroke-width="2"/><path d="M13 41L61 11L86 24L38 55Z" fill="#e8c28d" stroke="#976a3a" stroke-width="2"/><path d="M26 40L65 17M37 47L76 23M27 54L58 35M39 61L71 42" stroke="#b98850" stroke-width="2"/>',
  stone: '<path d="M12 56L20 31L42 23L60 36L51 62L28 71Z" fill="#819aaa" stroke="#405e70" stroke-width="2"/><path d="M20 31L42 23L40 47L12 56Z" fill="#c5d3d9"/><path d="M40 47L60 36L51 62L28 71Z" fill="#708a9a"/><path d="M52 52L62 31L78 30L89 49L78 66L59 68Z" fill="#9eb3bd" stroke="#526c7b" stroke-width="2"/><path d="M62 31L78 30L72 46L52 52Z" fill="#d3dce0"/>',
  grain: '<path d="M34 72L43 13M47 74L62 18M39 70L25 22" stroke="#b29245" stroke-width="4" stroke-linecap="round"/><g fill="#efd17b" stroke="#b48635" stroke-width="1.4"><ellipse cx="37" cy="24" rx="5" ry="10" transform="rotate(-27 37 24)"/><ellipse cx="47" cy="33" rx="5" ry="10" transform="rotate(35 47 33)"/><ellipse cx="33" cy="42" rx="5" ry="10" transform="rotate(-32 33 42)"/><ellipse cx="44" cy="51" rx="5" ry="10" transform="rotate(35 44 51)"/><ellipse cx="58" cy="30" rx="5" ry="10" transform="rotate(-20 58 30)"/><ellipse cx="66" cy="43" rx="5" ry="10" transform="rotate(36 66 43)"/><ellipse cx="22" cy="37" rx="5" ry="10" transform="rotate(-38 22 37)"/><ellipse cx="31" cy="52" rx="5" ry="10" transform="rotate(10 31 52)"/></g>',
  food: '<ellipse cx="49" cy="62" rx="36" ry="9" fill="#6a492a"/><path d="M14 54Q15 28 43 26Q72 19 85 46L82 60Q51 77 17 63Z" fill="#bd7839" stroke="#80502a" stroke-width="2"/><path d="M15 51Q24 25 49 25Q73 23 84 46Q53 62 15 51Z" fill="#e5b86d"/><path d="M31 32L36 47M46 28L51 43M62 29L67 41" stroke="#fcdf9c" stroke-width="5" stroke-linecap="round"/>',
  coins: '<g stroke="#986b24" stroke-width="2"><ellipse cx="33" cy="62" rx="20" ry="10" fill="#c18a2d"/><ellipse cx="33" cy="56" rx="20" ry="10" fill="#efd076"/><ellipse cx="64" cy="54" rx="20" ry="10" fill="#bd842b"/><ellipse cx="64" cy="48" rx="20" ry="10" fill="#f4d782"/><ellipse cx="44" cy="44" rx="20" ry="10" fill="#c58f32"/><ellipse cx="44" cy="38" rx="20" ry="10" fill="#f8dd8e"/></g><circle cx="65" cy="27" r="17" fill="#e8bd53" stroke="#987026" stroke-width="2"/><circle cx="65" cy="27" r="12" fill="none" stroke="#fff0aa" stroke-width="2"/><path d="M65 18V36M60 21Q71 18 70 25Q69 29 60 27Q58 34 70 33" fill="none" stroke="#a67420" stroke-width="2"/>'
};
const resourceProductionBuildings = { wood: 'lumber', planks: 'sawmill', stone: 'quarry', grain: 'farm', food: 'windmill' };
const resourceDock = el('div', { class: 'resource-dock-cards', 'data-resource-dock': '', hidden: true, 'aria-label': 'Resource production buildings' });
for (const id of Object.keys(resourceProductionBuildings)) {
  const picture = svgNode('svg', { viewBox: '0 0 100 82', class: 'resource-dock-illustration', role: 'img', 'aria-label': nameOf(id) });
  picture.innerHTML = '<ellipse cx="50" cy="71" rx="39" ry="7" fill="#031826" opacity=".35"/>' + resourceIllustrations[id];
  const control = button('', () => openPanel('building', resourceProductionBuildings[id]), { class: 'resource-dock-card', 'data-dock-resource': id, 'aria-label': `${nameOf(id)} — ${titleOf(resourceProductionBuildings[id])}` });
  const producer = resourceProductionBuildings[id];
  control.replaceChildren(
    el('small', { class: 'resource-dock-active', 'data-dock-active': id, title: 'Residents currently producing at this building', 'aria-label': 'Active workers' }, count(workingProducerCount(producer))),
    picture, el('span', { class: 'resource-dock-name' }, nameOf(id)),
    el('span', { class: 'resource-dock-staffing', 'data-dock-staffing': id, 'data-dock-stock': id, 'aria-label': 'Local stock / central warehouse stock (all goods in transit)' }, el('span', { 'data-dock-local': id }, count(state.buildings[producer].ready)), ' / ', el('span', { 'data-dock-central': id }, count(state.resources[id])), ' (', el('span', { 'data-dock-transit': id }, '0'), ')'), el('span', { class: 'resource-dock-trend', 'data-resource-trend': id, title: 'Current hourly balance' }, '→ 0 units/h'));
  resourceDock.append(control);
}
layer.append(resourceDock);
let activeDockCategory = 'administration';
let leisureDockSignature = '';
const leisureDock = el('div', { class: 'resource-dock-cards leisure-dock-cards', 'data-leisure-dock': '', hidden: true, 'aria-label': 'Island attractions and paths' });
layer.append(leisureDock);
function setDockCategory(id) {
  if (!dockCategories.some(([category]) => category === id)) return;
  activeDockCategory = id;
  if (tutorialReady) { act(state, { type: 'tutorialVisit', subject: id }); save(); }
  resourceDock.hidden = id !== 'resources';
  leisureDock.hidden = !['decorations', 'paths'].includes(id);
  const group = BUILDING_DOCK_GROUPS[id];
  buildingDock.hidden = !group;
  if (group) {
    buildingDock.dataset.buildingDock = id;
    buildingDock.style.gridTemplateColumns = `repeat(${group.length}, minmax(0, 1fr))`;
    buildingDock.setAttribute('aria-label', dockCategories.find(([category]) => category === id)[1]);
    for (const control of buildingDock.children) control.hidden = !group.includes(control.dataset.dockBuilding);
  }
  for (const [category, label] of dockCategories) {
    const node = document.getElementById(`hit-category-${category}`);
    node.textContent = label;
    node.classList.toggle('is-selected', category === id);
    node.setAttribute('aria-pressed', String(category === id));
  }
  renderLeisureDock(true);
  renderMobileDock(true);
  localize();
  if (tutorialReady) refreshTutorialExperience();
}
function renderLeisureDock(force = false) {
  if (leisureDock.hidden) return;
  const offers = activeDockCategory === 'decorations' ? Leisure.leisureOffers(state) : Leisure.roadSummary(state).levels;
  const signature = JSON.stringify([activeDockCategory, offers.map(offer => ({ ...offer, remaining: undefined, nextReset: undefined })), state.resources.coins, state.resources.stone]);
  if (!force && signature === leisureDockSignature) return;
  leisureDockSignature = signature;
  leisureDock.dataset.leisureDock = activeDockCategory;
  if (activeDockCategory === 'decorations') {
    leisureDock.replaceChildren(...offers.map(offer => {
      const image = attractionIllustration(offer);
      const control = button('', () => perform({ type: 'buyAttraction', id: offer.id }), {
        class: 'resource-dock-card attraction-dock-card', 'data-attraction': offer.id,
        disabled: !offer.available || state.resources.coins < offer.price,
        'aria-label': `${offer.name}: ${offer.price} coins, +${Math.ceil(offer.amount)} happiness for ${offer.residentCount} ${offer.residentCount === 1 ? 'resident' : 'residents'} for 6 hours`,
        title: offer.activeRemaining > 0 ? `Another attraction is active. Available in ${durationText(offer.activeRemaining)}.` : offer.reason || (offer.multiplier === 0 ? `Full benefit returns in ${durationText(offer.nextReset)}` : `+${Math.ceil(offer.amount)} pp for ${offer.residentCount} ${offer.residentCount === 1 ? 'resident' : 'residents'} · 6 h. Offers refresh in ${durationText(state.leisure.rotationRemaining)}`)
      });
      control.replaceChildren(image, el('span', { class: 'resource-dock-name' }, offer.name),
        el('span', { class: 'attraction-effect', 'data-attraction-effect': offer.id }, `+${Math.ceil(offer.amount)} pp · ${offer.residentCount} ${offer.residentCount === 1 ? 'resident' : 'residents'} · 6 h`),
        el('span', { class: 'attraction-price', 'data-attraction-price': offer.id }, `${count(offer.price)} coins`),
        el('span', { class: 'attraction-status', 'data-attraction-status': offer.id }, offer.activeRemaining > 0 ? `Available in ${durationText(offer.activeRemaining)}` : `${offer.sharePercent}% of population`));
      return control;
    }));
  } else {
    const summary = Leisure.roadSummary(state);
    leisureDock.replaceChildren(...offers.map(tier => {
      const control = button('', () => perform({ type: 'upgradeRoad', level: tier.level }), {
        class: `resource-dock-card path-dock-card${tier.complete ? ' is-complete' : ''}`, 'data-road-level': tier.level,
        disabled: !tier.unlocked || tier.complete || state.resources.stone < 100,
        'aria-label': `Paths level ${tier.level}: ${tier.count} of 100 sections. Upgrade one section for 100 Stone`,
        title: !tier.unlocked ? `Finish all 100 sections of level ${tier.level - 1} first.` : tier.complete ? 'All 100 sections completed.' : 'Upgrade one section instantly for 100 Stone from central storage.'
      });
      control.replaceChildren(pathIllustration(tier.level), el('span', { class: 'resource-dock-name' }, `Level ${tier.level}`),
        el('span', { class: 'path-progress', 'data-road-progress': tier.level }, `${tier.count} / 100`),
        el('span', { class: 'path-bonus' }, `+${tier.level * 10}% speed${tier.level >= 3 ? ` · +${(tier.level - 2) * 10}% load` : ''}`),
        el('span', { class: 'path-price' }, tier.complete ? 'Complete' : tier.unlocked ? '100 Stone' : 'Locked'));
      return control;
    }));
    leisureDock.setAttribute('aria-label', `Paths: level ${summary.level}, +${summary.speedPercent}% carrier speed, +${summary.capacityPercent}% load`);
  }
}
function attractionIllustration(offer) {
  const picture = svgNode('svg', { viewBox: '0 0 100 70', class: 'leisure-dock-illustration', 'aria-hidden': 'true' });
  const event = offer.kind === 'event';
  const color = ['#dcb66c', '#d79675', '#a6c080', '#80b2bf'][Math.abs([...offer.id].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 4];
  picture.innerHTML = event ? `<ellipse cx="50" cy="62" rx="35" ry="5" fill="#041d2d" opacity=".5"/><path d="M18 57V35L50 10L82 35V57Z" fill="${color}" stroke="#805a36" stroke-width="2"/><path d="M18 35L50 10L37 35ZM50 10L64 35H82Z" fill="#f3e0ac"/><path d="M39 57V39Q50 30 61 39V57" fill="#123247"/><path d="M50 10V2L68 7L50 9" fill="#e5c87f"/><path d="M14 35H86" stroke="#edd49a" stroke-width="3"/>` : `<ellipse cx="50" cy="62" rx="35" ry="5" fill="#041d2d" opacity=".5"/><path d="M19 52Q50 69 81 52L75 61H25Z" fill="#a77e43"/><path d="M29 55V25M50 57V17M70 54V29" stroke="#719557" stroke-width="4"/><g fill="${color}" stroke="#a67c3a" stroke-width="1.5"><path d="M29 18C13 5 12 28 25 28C9 35 33 46 34 30C49 39 48 16 34 21C44 3 22 5 29 18Z"/><path d="M50 10C34-3 34 20 46 20C31 27 54 38 55 22C71 31 70 8 56 13C65-5 43-3 50 10Z"/><path d="M70 22C55 9 54 32 66 32C51 39 75 50 76 34C91 43 90 20 76 25C85 7 63 9 70 22Z"/></g>`;
  return picture;
}
function pathIllustration(level) {
  const picture = svgNode('svg', { viewBox: '0 0 100 60', class: 'leisure-dock-illustration', 'aria-hidden': 'true' });
  const colors = ['#ae9272', '#b7a48b', '#c8bba1', '#d4c69f', '#e3d2a8'];
  picture.innerHTML = `<path d="M14 55L42 5H69L87 55Z" fill="${colors[level - 1]}" stroke="#8e7857" stroke-width="2"/><path d="M26 35H79M35 19H74M51 5L42 55M66 19L68 55" stroke="#6f6c59" stroke-width="2"/><path d="M12 55L40 5M89 55L71 5" stroke="#81905c" stroke-width="4"/>`;
  return picture;
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
toolbarButton('home', 'HARBORLIGHT — island overview', 'topbar-brand', el('span', { class: 'topbar-emblem', 'aria-hidden': 'true' }, '♜'), el('span', {}, 'HARBORLIGHT', el('small', { 'data-island-name': '', 'data-i18n-ignore': '' }, islandDisplayName(state, language()))));
hotspot('level', 'Island level — Town Hall', [0, 0, 0, 0], () => openPanel('building', 'townhall'));
toolbarButton('level', 'Island level — Town Hall', 'topbar-level', ...toolbarStat('level', 'Level', '♜'));
hotspot('happiness', 'Happiness and population growth', [0, 0, 0, 0], () => openPanel('residents'));
toolbarButton('happiness', 'Happiness and population growth', 'topbar-happiness', ...toolbarStat('happiness', 'Happiness', '☀︎'));
toolbarButton('resource-coins', 'Coins — stock', 'topbar-resource topbar-coins', ...toolbarStat('coins', 'Coins', '◉'));
for (const id of MATERIAL_IDS) document.getElementById(`hit-resource-${id}`)?.remove();
hotspot('working', 'Actual working residents', [0, 0, 0, 0], () => openPanel('workers'));
toolbarButton('working', 'Actual working residents', 'topbar-working', ...toolbarStat('working', 'Working', '⚒'));
hotspot('arrival', 'Next population change', [0, 0, 0, 0], () => openPanel('residents'));
toolbarButton('arrival', 'Next population change at current happiness', 'topbar-arrival', ...toolbarStat('arrival', 'New resident', '♟'));
hotspot('points', 'Hourly points: Town Hall level × coins', [0, 0, 0, 0], () => openPanel('settings'));
toolbarButton('points', 'Hourly points: Town Hall level × coins', 'topbar-points', ...toolbarStat('points', 'Points', '★'));
hotspot('tutorial', 'Tutorial', [0, 0, 0, 0], () => openPanel('tutorial'));
toolbarButton('population', 'Residents and worker assignments', 'topbar-population', ...toolbarStat('population', 'Residents', '♟︎'));
hud.housing = el('small', { class: 'topbar-housing', 'data-hud': 'housing' }, '—');
document.querySelector('.topbar-population .topbar-copy').append(hud.housing);
hud.clock = el('strong', { 'data-hud': 'clock' }, '—');
toolbarButton('clock', 'Island day and time', 'topbar-clock', hud.clock);
for (const [id, icon, label] of [['tutorial', '?', 'Tutorial'], ['account', '♙', 'Sign in or create an account'], ['settings', '⚙︎', 'Settings'], ['menu', '☰', 'Game menu']]) {
  const control = toolbarButton(id, label, 'topbar-control', el('span', { 'aria-hidden': 'true' }, icon));

}
hotspot('notifications', 'Notifications', [0, 0, 0, 0], () => openPanel('notifications'));
hud.notifications = el('span', { 'data-notification-count': '' }, '0');
toolbarButton('notifications', 'Notifications', 'topbar-control notification-button', el('span', { 'aria-hidden': 'true' }, '🔔'), hud.notifications);
const mobileHud = el('nav', { class: 'mobile-island-hud', 'aria-label': 'Island status' });
const mobileSummary = el('div', { class: 'mobile-hud-summary' });
const mobileResources = el('div', { class: 'mobile-hud-resources' });
const mobileHudValues = {};
for (const [id, label, action] of [['level', 'Level', () => openPanel('building', 'townhall')], ['happiness', 'Happiness', () => openPanel('residents')], ['population', 'Residents', () => openPanel('residents')], ['coins', 'Coins', () => openPanel('resources', 'coins')], ['working', 'Working', () => openPanel('workers')], ['arrival', 'New resident', () => openPanel('residents')], ['points', 'Points', () => openPanel('settings')]]) {
  mobileHudValues[id] = el('strong', { 'data-mobile-hud': id }, '—');
  const node = button(label, action, { class: 'mobile-hud-item' });
  node.replaceChildren(el('small', {}, label), mobileHudValues[id]);
  (['level', 'happiness', 'population'].includes(id) ? mobileSummary : mobileResources).append(node);
}
mobileHud.append(mobileSummary, mobileResources);
document.body.append(mobileHud);
const roundUpHappiness = value => {
  // Exact hourly totals can land a few floating-point bits above an integer.
  const nearest = Math.round(value);
  return Math.ceil(Math.abs(value - nearest) <= 1e-9 ? nearest : value);
};
const happinessPercent = value => {
  const rounded = roundUpHappiness(Math.max(-100, Math.min(100, value)));
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded).toLocaleString('en-US')}%`;
};
const happinessText = () => happinessPercent(state.happiness);
const productionSpeed = () => (state.lighthouseRemaining > 0 ? 2 : 1) * productionMultiplier(state) * (Progression.activePlayMultiplier?.(state) || 1);
const activeCrew = id => Residents.activeWorkerCount?.(state, id) ?? state.buildings[id].workers;
function workingProducerCount(id) {
  return state.residents.filter(person => person.workplace === id && Residents.residentIsWorking(state, person)).length;
}
const ownProductionRate = id => Logistics.productionRate?.(state, id) ?? 2 * (state.buildings[id].level === 1 ? 10 : state.buildings[id].level + 10);
const localProductionRate = id => `${Math.round(activeCrew(id) * ownProductionRate(id) * productionSpeed() * 100) / 100} units/h`;
const spendable = id => id === 'coins' ? state.resources.coins : Logistics.availableGoods?.(state, id) ?? state.resources[id];
const transportRate = id => `${activeCrew(id)} carriers · ${Logistics.haulCapacity?.(state, id) ?? 120} per trip`;
function renderHUD() {
  estimateFrame++;
  document.title = `${islandDisplayName(state, language())} — HARBORLIGHT`;
  document.querySelector('title').setAttribute('data-i18n-ignore', '');
  document.querySelectorAll('[data-island-name]').forEach(node => { node.textContent = islandDisplayName(state, language()); node.title = islandDisplayName(state, language()); });
  resourceDock.querySelectorAll('[data-dock-active]').forEach(node => {
    const producer = resourceProductionBuildings[node.dataset.dockActive];
    node.textContent = count(workingProducerCount(producer));
    node.setAttribute('aria-label', `${workingProducerCount(producer)} residents currently producing at ${titleOf(producer)}`);
  });
  resourceDock.querySelectorAll('[data-dock-staffing]').forEach(node => {
    const producer = resourceProductionBuildings[node.dataset.dockStaffing];
    node.querySelector('[data-dock-local]').textContent = count(state.buildings[producer].ready);
    node.querySelector('[data-dock-central]').textContent = count(state.resources[node.dataset.dockStaffing]);
    node.querySelector('[data-dock-transit]').textContent = count(resourceInTransit(node.dataset.dockStaffing));
  });
  hud.notifications.textContent = visibleNotifications().filter(item => !item.read).length;
  hud.coins.textContent = count(state.resources.coins);
  document.getElementById('hit-resource-coins').setAttribute('aria-label', `Coins: ${count(state.resources.coins)} — stock`);
  hud.working.textContent = count(state.residents.filter(person => Residents.residentIsWorking(state, person)).length);
  hud.arrival.textContent = nextResidentText();
  hud.points.textContent = count(state.ranking?.score ?? state.buildings.townhall.level * state.resources.coins);
  refreshDockBadges();
  refreshResourceTrends();
  hud.population.textContent = `${state.population} / ${state.capacity}`;
  hud.housing.textContent = `Beds: ${housingCapacity(state)}`;
  hud.level.textContent = state.buildings.townhall.level;
  hud.happiness.textContent = happinessText();
  document.getElementById('hit-level').setAttribute('aria-label', `Level ${state.buildings.townhall.level} — Town Hall; capacity ${state.capacity} residents`);
  document.getElementById('hit-happiness').setAttribute('aria-label', `Happiness: ${happinessText()} — residents and population growth`);
  const displayedHappiness = roundUpHappiness(state.happiness);
  document.getElementById('hit-happiness').dataset.sentiment = displayedHappiness > 0 ? 'positive' : displayedHappiness < 0 ? 'negative' : 'neutral';
  document.getElementById('hit-population').setAttribute('aria-label', `Residents: ${state.population}; Town Hall capacity: ${state.capacity}; housing: ${housingCapacity(state)}; unhoused: ${unhousedResidents(state)}; working: ${totalWorkers(state)}; available: ${freeWorkers(state)} — residents and worker assignments`);
  document.getElementById('hit-population').dataset.overcrowded = String(unhousedResidents(state) > 0);
  for (const id of Object.keys(mobileHudValues)) mobileHudValues[id].textContent = hud[id].textContent;
  mobileHudValues.happiness.dataset.sentiment = document.getElementById('hit-happiness').dataset.sentiment;
  hud.clock.textContent = `Day ${state.day}\n${String(Math.floor(state.minutes / 60)).padStart(2, '0')}:${String(Math.floor(state.minutes % 60)).padStart(2, '0')}`;

  for (const [id, value] of Object.entries(state.buildings)) {
    const node = document.getElementById(`hit-world-${id}`);
    if (!node) continue;
    let badge = node.querySelector('.world-level');
    if (value.level > initialLevels[id]) {
      if (!badge) { badge = el('span', { class: 'world-level' }); node.append(badge); }
      badge.textContent = `Lv. ${value.level}`;
    } else badge?.remove();
    const worldProject = value.construction || value.premiumService;
    node.classList.toggle('under-construction', !!worldProject);
    let constructionBadge = node.querySelector('.construction-badge');
    if (worldProject) {
      if (!constructionBadge) { constructionBadge = el('span', { class: 'construction-badge' }); node.append(constructionBadge); }
      refreshConstructionBadge(constructionBadge, id, worldProject);
    } else constructionBadge?.remove();
    node.setAttribute('aria-label', `${titleOf(id)}, level ${value.level}${worldProject ? ', upgrade in progress' : value.ready ? ', goods awaiting pickup' : ''}`);
  }
  document.body.classList.toggle('reduce-motion', !state.settings.motion);
  document.body.classList.toggle('motion-override', state.settings.motionOverride === true && state.settings.motion);
  document.body.classList.remove('world-paused');
  renderLeisureDock();
  renderMobileDock();
  renderActivityStack();
  refreshLivePanel();
  renderWorldAdditions();
  stage.dispatchEvent(new Event('island-statechange'));
  refreshTaskAcceptance();
  refreshExpeditionPresence();
  refreshMiniGame();
  refreshTutorialExperience();
  localize();
}
function refreshConstructionBadge(node, id, project) {
  const estimate = scheduledConstructionEstimate(id, project);
  const transport = project.stage === 'building' ? 0 : estimate?.transport;
  const building = project.stage === 'building' ? project.buildRemaining : estimate?.building;
  const unavailable = !Number.isFinite(transport) || !Number.isFinite(building);
  const fallback = project.stage === 'queued' || project.stage === 'planned' ? 'Queued' : estimate?.reason?.includes('carrier') ? 'Waiting for carriers' : 'Unavailable';
  node.replaceChildren(
    el('span', { 'data-world-transport-eta': id }, `Transport · ETA: ${Number.isFinite(transport) ? durationText(transport) : fallback}`),
    el('span', { 'data-world-building-eta': id }, `Construction · ETA: ${Number.isFinite(building) ? durationText(building) : fallback}`));
  node.title = unavailable ? estimate?.reason || 'Waiting for an available construction slot and carriers.' : 'Estimated remaining transport time and subsequent building phase.';
}

let taskCelebration = null;
let celebrationFocus = null;
function showTaskCelebration(achievement) {
  if (!achievement || achievement.shared || achievement.skipped) return;
  const viewed = act(state, { type: 'seeTaskAchievement', id: achievement.id });
  if (viewed.ok) save();
  if (taskCelebration?.open) taskCelebration.close();
  taskCelebration?.remove();
  celebrationFocus = document.activeElement;
  const fireworks = el('div', { class: 'celebration-fireworks', 'aria-hidden': 'true' });
  for (let burst = 0; burst < 5; burst++) {
    const spray = el('span', { class: 'firework-burst', style: { '--burst-x': `${12 + burst * 19}%`, '--burst-y': `${20 + (burst % 3) * 21}%`, '--burst-delay': `${burst * .18}s`, '--burst-color': ['#ffe2a2', '#a9d4ba', '#9ccbe7', '#efb4ad', '#e6ce87'][burst] } });
    for (let ray = 0; ray < 12; ray++) spray.append(el('i', { style: { '--ray': ray } }));
    fireworks.append(spray);
  }
  const popup = el('dialog', { id: 'task-celebration', class: 'task-celebration', 'aria-labelledby': 'task-celebration-title', 'aria-describedby': 'task-celebration-description', 'data-achievement': achievement.id },
    fireworks,
    el('div', { class: 'task-celebration-content' },
      el('span', { class: 'celebration-medallion', 'aria-hidden': 'true' }, '★'),
      el('p', { class: 'celebration-eyebrow' }, 'Lighthouse task complete'),
      el('h2', { id: 'task-celebration-title' }, 'Well done, island keeper!'),
      el('p', { id: 'task-celebration-description' }, achievement.title),
      el('p', { class: 'celebration-earned' }, 'Reward received: ', el('strong', {}, costText(achievement.reward))),
      el('section', { class: 'achievement-share-screen', 'data-share-screen': '' },
        el('h3', {}, 'Share your achievement'),
        el('p', {}, 'Celebrate your progress and collect 500 extra coins.'),
        el('div', { class: 'celebration-actions' },
          button('Share on Facebook · +500 coins', () => finishTaskCelebration(achievement, 'shareTaskAchievement'), { 'data-task-share': achievement.id }),
          button('Skip', () => finishTaskCelebration(achievement, 'skipTaskAchievement'), { class: 'action secondary', 'data-task-skip': achievement.id })),
        el('small', { class: 'achievement-share-note' }, 'Facebook sharing is coming soon. This preview awards the bonus when you choose Share; nothing is posted.'))));
  taskCelebration = popup;
  popup.addEventListener('cancel', event => { event.preventDefault(); finishTaskCelebration(achievement, 'skipTaskAchievement'); });
  popup.addEventListener('click', event => { if (event.target === popup) finishTaskCelebration(achievement, 'skipTaskAchievement'); });
  document.body.append(popup);
  popup.showModal();
  popup.querySelector('[data-task-share]')?.focus();
  if (matchMedia('(pointer: coarse)').matches && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate([80, 60, 120]); } catch { /* Haptics remain optional on unsupported devices. */ }
  }
}
function finishTaskCelebration(achievement, type) {
  const result = act(state, { type, id: achievement.id });
  if (result.ok) { save(); renderHUD(); }
  toast(result.message);
  if (!result.ok) return;
  const popup = taskCelebration;
  popup?.close(); popup?.remove(); taskCelebration = null;
  if (celebrationFocus?.isConnected) celebrationFocus.focus({ preventScroll: true });
  else if (dialog.open) dialog.querySelector('.dialog-close')?.focus({ preventScroll: true });
  else document.querySelector('.mobile-activities')?.focus({ preventScroll: true });
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
  if (panel?.kind === 'tasks' && dialog.open && dialog.querySelector('[data-task-list]')?.dataset.taskList !== (state.lighthouseTasks || []).map(taskId).join(',')) renderPanel();
  dialog.querySelectorAll('[data-house-pool]').forEach(node => { const pool = state.houseHappinessPool; if (pool) node.textContent = node.dataset.housePool === 'points' ? count(pool.points) : durationText(pool.refreshRemaining); });
  dialog.querySelectorAll('button').forEach(node => { if (node._quoted) refreshQuoteButton(node); });
  dialog.querySelectorAll('[data-task-reward]').forEach(node => { const task = (state.lighthouseTasks || []).find(t => taskId(t) === node.dataset.taskReward); if (task) node.textContent = `Reward: ${costText(rewardForTask(task))}`; });
  dialog.querySelectorAll('[data-task-accept]').forEach(node => { const task = (state.lighthouseTasks || []).find(t => taskId(t) === node.dataset.taskAccept); if (task) { const status = statusOfTask(task); node.textContent = taskActionLabel(task); node.disabled = status.active || !status.canActivate; } });
  dialog.querySelectorAll('[data-task]').forEach(node => { const task = (state.lighthouseTasks || []).find(t => taskId(t) === node.dataset.task); if (task) { const active = taskIsActive(task); node.dataset.taskActive = String(active); node.classList.toggle('is-active-task', active); } });
  dialog.querySelectorAll('[data-task-countdown]').forEach(node => { const task = (state.lighthouseTasks || []).find(t => taskId(t) === node.dataset.taskCountdown); if (task) node.textContent = durationText(statusOfTask(task).remaining); });
  dialog.querySelectorAll('[data-project-delivery]').forEach(node => { const project = [...state.constructionProjects, ...(state.premiumServices || [])].find(p => p.order === Number(node.dataset.projectDelivery)); if (project) node.textContent = `${count(project.delivered?.[node.dataset.deliveryResource] || 0)} / ${count(project.cost?.[node.dataset.deliveryResource])}`; });
  dialog.querySelectorAll('[data-visit-group]').forEach(node => { const group = (state.lighthouseVisits || []).find(g => String(g.id) === node.dataset.visitGroup); node.textContent = group ? `${group.residentIds.length} visitors return in ${durationText(group.remaining)}. This visit cannot be recalled.` : 'Visitors have returned home. Their rewards are now active.'; });
  dialog.querySelectorAll('[data-expedition-pot]').forEach(node => { const run = expeditionRun(node.dataset.expeditionPot); node.textContent = `${count(Activities.expeditionRoundStatus?.(state, run)?.potentialPot ?? run?.pot)} coins`; });
  dialog.querySelectorAll('[data-expedition-live]').forEach(node => { const run = expeditionRun(node.dataset.expeditionLive); node.textContent = expeditionStatusText(run); if (puzzle && run?.status === 'lost' && !puzzle.complete) { puzzle.complete = true; puzzle.message = run.lossReason === 'presence-timeout' ? 'Presence was not confirmed. The unclaimed pot was lost.' : 'Overtime consumed the potential pot.'; renderPanel(); } });
  const foodStats = foodStatValues();
  dialog.querySelectorAll('[data-food-stat]').forEach(node => { node.textContent = foodStats[node.dataset.foodStat]; if (node.dataset.foodStat === 'status') node.dataset.fed = String(hasFoodForResidents(state)); });
  dialog.querySelectorAll('[data-upgrade-transport]').forEach(node => { node.textContent = upgradeTransportDescription(node.dataset.upgradeTransport); });
  dialog.querySelectorAll('[data-upgrade-requirements]').forEach(node => { node.textContent = upgradeRequirementDescription(node.dataset.upgradeRequirements); });
  if (panel?.kind === 'construction' && dialog.open) {
    const signature = constructionSignature();
    if (dialog.querySelector('[data-construction-signature]')?.dataset.constructionSignature !== signature) renderPanel();
  }
  dialog.querySelectorAll('[data-lighthouse-bonus]').forEach(node => { node.textContent = lighthouseDescription(); });
  dialog.querySelectorAll('[data-compact-blessing-cooldown]').forEach(node => { node.textContent = durationText(state.paidBlessingCooldownRemaining || 0); });
  dialog.querySelectorAll('[data-cancel-project]').forEach(node => { const project = state.constructionProjects.find(project => project.order === Number(node.dataset.cancelProject)); node.disabled = !project || !canCancelProject(project); });
  dialog.querySelectorAll('[data-project-status]').forEach(node => { const project = [...state.constructionProjects, ...(state.premiumServices || [])].find(item => item.order === Number(node.dataset.projectStatus)); node.textContent = project ? projectDescription(project) : 'Completed'; });
  dialog.querySelectorAll('[data-construction-summary]').forEach(node => { node.textContent = constructionSummary(); });
  if (['building', 'building-details'].includes(panel?.kind) && dialog.open) {
    const current = state.buildings[panel.id];
    const signature = `${current.level}:${(current.construction || current.premiumService)?.stage || ''}`;
    if (dialog.querySelector('[data-building-signature]')?.dataset.buildingSignature !== signature) renderPanel();
  }
  dialog.querySelectorAll('[data-construction-status]').forEach(node => { node.textContent = constructionDescription(node.dataset.constructionStatus); });
  dialog.querySelectorAll('[data-upgrade-building]').forEach(node => { const id = node.dataset.upgradeBuilding; node.disabled = !upgradeEligibility(state, id).ok || !canAfford(state, buildingCost(state, id)); });
  dialog.querySelectorAll('[data-upgrade-cost]').forEach(node => { const available = spendable(node.dataset.upgradeCost), required = node.dataset.costSource === 'resident' ? State.residentPurchaseQuote?.(state)?.cost?.[node.dataset.upgradeCost] ?? Number(node.dataset.required) : panel?.kind === 'building' ? buildingCost(state, panel.id)?.[node.dataset.upgradeCost] ?? Number(node.dataset.required) : Number(node.dataset.required); node.dataset.required = required; node.textContent = `${count(available)} / ${count(required)}`; node.classList.toggle('is-affordable', available >= required); node.classList.toggle('is-short', available < required); node.setAttribute('aria-label', `${nameOf(node.dataset.upgradeCost)}: in storage ${count(available)}, required ${count(required)}; ${available >= required ? 'enough' : 'short'}`); });
  dialog.querySelectorAll('[data-stock]').forEach(node => { node.textContent = count(state.resources[node.dataset.stock]); });
  const live = { population: `${state.population} / ${state.capacity}`, 'current-population': count(state.population), workers: totalWorkers(state), free: freeWorkers(state), arriving: state.residents.filter(person => person.workplace && person.arrivalRemaining > 0).length, returning: (state.returningWorkers || []).length, 'next-return': returnDescription(), 'worker-limit': '12 × building level', happiness: happinessText(), level: state.buildings.townhall.level, growth: populationDescription(), 'growth-rate': populationGrowthRateText(), capacity: state.capacity, housing: housingCapacity(state), unhoused: unhousedResidents(state), penalty: housingPenaltyText(), 'housing-status': housingDescription() };
  dialog.querySelectorAll('[data-population-stat]').forEach(node => { node.textContent = live[node.dataset.populationStat]; });
  dialog.querySelectorAll('[data-housing-warning]').forEach(node => { node.dataset.overcrowded = String(unhousedResidents(state) > 0); });
  dialog.querySelectorAll('[data-logistics-stat]').forEach(node => { node.textContent = logisticsStatValue(node.dataset.logisticsStat); });
  dialog.querySelectorAll('[data-local-buffer],[data-local-overview]').forEach(node => {
    const id = node.dataset.localBuffer || node.dataset.localOverview, value = state.buildings[id].ready;
    updateLocalStockValues(node, id);
    node.dataset.value = value;
    node.dataset.limit = producerCapacity(state, id);
  });
  dialog.querySelectorAll('[data-local-rate]').forEach(node => { node.textContent = localProductionRate(node.dataset.localRate); });
  dialog.querySelectorAll('[data-work-progress]').forEach(node => { node.textContent = node.classList.contains('producer-next-unit') ? productionTimerText(node.dataset.workProgress) : productionDescription(node.dataset.workProgress); });
  dialog.querySelectorAll('[data-central-resource]').forEach(node => {
    const id = node.dataset.centralResource, limits = warehouseLimits(state);
    node.textContent = `${count(state.resources[id])} / ${count(limits.perResource)}`;
    node.dataset.value = state.resources[id]; node.dataset.limit = limits.perResource;
  });
  dialog.querySelectorAll('[data-pending-resource]').forEach(node => { node.textContent = count(state.pendingDeliveries?.[node.dataset.pendingResource] || 0); });
  dialog.querySelectorAll('[data-worker-count]').forEach(node => { node.textContent = state.buildings[node.dataset.workerCount].workers; });
  dialog.querySelectorAll('[data-worker-free]').forEach(node => { node.textContent = freeWorkers(state); });
  dialog.querySelectorAll('[data-building-status]').forEach(node => updateBuildingStatus(node, node.dataset.buildingStatus));
  dialog.querySelectorAll('[data-upgrade-estimate]').forEach(node => refreshUpgradeEstimate(node, node.dataset.upgradeEstimate));
  dialog.querySelectorAll('[data-producer-upgrade-times]').forEach(node => refreshProducerUpgradeTimes(node, node.dataset.producerUpgradeTimes));
  dialog.querySelectorAll('[data-carrier-jobs]').forEach(node => refreshCarrierJobs(node));
  dialog.querySelectorAll('[data-priority-progress]').forEach(node => { node.textContent = priorityProgressText(); });
  dialog.querySelectorAll('[data-worker-limit]').forEach(node => { node.textContent = workerLimit(state, node.dataset.workerLimit); });
  dialog.querySelectorAll('[data-full-penalty]').forEach(node => { node.textContent = fullPenaltyDescription(node.dataset.fullPenalty); });
  dialog.querySelectorAll('[data-chapel-time]').forEach(node => { node.textContent = blessingDescription(); });
  dialog.querySelectorAll('[data-paid-blessing]').forEach(node => { node.disabled = state.blessingRemaining > 0 || state.resources.coins < 100 * state.buildings.chapel.level || (state.paidBlessingCooldownRemaining || 0) > 0; });
  dialog.querySelectorAll('[data-blessing]').forEach(node => { node.disabled = state.blessingRemaining > 0 || state.blessingsUsed >= state.buildings.chapel.level; });
  dialog.querySelectorAll('[data-market-used]').forEach(node => { node.textContent = `${count(marketUsed(state))} / ${count(marketCapacity(state))}`; });
  dialog.querySelectorAll('[data-market-stock]').forEach(node => { node.textContent = count(state.market.stock[node.dataset.marketStock]); });
  dialog.querySelectorAll('[data-market-locked]').forEach(node => { node.textContent = count(state.market.locked.filter(lot => lot.resource === node.dataset.marketLocked).reduce((sum, lot) => sum + lot.amount, 0)); });
  dialog.querySelectorAll('[data-market-timer]').forEach(node => { node.textContent = state.market.locked.length ? durationText(Math.min(...state.market.locked.map(lot => lot.remaining))) : 'No locked goods'; });
  dialog.querySelectorAll('[data-happiness-breakdown]').forEach(node => { node.replaceChildren(...happinessBreakdown()); });
  dialog.querySelectorAll('[data-buy-resident]').forEach(node => { const quote = State.residentPurchaseQuote?.(state); node.disabled = !quote?.ok; node.title = quote?.message || ''; });
  refreshActiveEffects();
  refreshResidentRosters();
  dialog.querySelectorAll('[data-worker-building]').forEach(node => {
    const id = node.dataset.workerBuilding, building = state.buildings[id];
    node.disabled = node.dataset.workerAction === 'clear' || Number(node.dataset.workerDelta) < 0 ? building.workers === 0 : freeWorkers(state) <= 0 || building.workers >= workerLimit(state, id);
  });
}

const panelHistory = [];
let restoringPanel = false;
function openPanel(kind, id) {
  if (expeditionSession() && !['puzzle', 'expeditions'].includes(kind) && dialog.open) { requestExpeditionExit(() => openPanel(kind, id)); return; }
  if (placement) cancelPlacement();
  if (!dialog.open) { previousFocus = document.activeElement; panelHistory.length = 0; }
  else if (!restoringPanel && panel && (panel.kind !== kind || panel.id !== id)) panelHistory.push({ ...panel, scroll: dialog.scrollTop || 0, bodyScroll: dialog.querySelector('.dialog-body')?.scrollTop || 0 });
  panel = { kind, id };
  if (!['tutorial', 'puzzle', 'expeditions'].includes(kind)) {
    act(state, { type: 'tutorialVisit', subject: ['building', 'building-details'].includes(kind) ? id : kind === 'menu' ? 'home' : kind });
    save();
  }
  panelNotice = '';
  renderPanel();
  if (!dialog.open) dialog.showModal();
  if (!restoringPanel) { dialog.scrollTop = 0; dialog.querySelector('.dialog-body')?.scrollTo(0, 0); }
  dialog.querySelector('.dialog-close')?.focus();
  if (tutorialReady) refreshTutorialExperience();
}
function backPanel() {
  const previous = panelHistory.at(-1);
  if (!previous) return;
  if (expeditionSession() && !['puzzle', 'expeditions'].includes(previous.kind)) { requestExpeditionExit(backPanel); return; }
  panelHistory.pop();
  restoringPanel = true;
  openPanel(previous.kind, previous.id);
  restoringPanel = false;
  dialog.scrollTop = previous.scroll || 0;
  dialog.querySelector('.dialog-body')?.scrollTo(0, previous.bodyScroll || 0);
  (dialog.querySelector('[data-panel-back]') || dialog.querySelector('.dialog-close'))?.focus({ preventScroll: true });
}
function closePanel(force = false) {
  if (force !== true && expeditionSession()) { requestExpeditionExit(() => closePanel(true)); return; }
  closeInfoPopup(false);
  dialog.close();
  miniController?.dispose(); miniController = null;
  panel = null;
  panelHistory.length = 0;
  previousFocus?.focus();
  refreshTutorialExperience();
}
dialog.addEventListener('cancel', event => {
  if (closeInfoPopup(true)) { event.preventDefault(); return; }
  event.preventDefault(); closePanel();
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
  if (direction && !taskAcceptanceDialog?.open && !confirmationDialog?.open && dialog.open && panel?.kind === 'puzzle' && puzzle && !puzzle.complete) {
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
    const estimate = estimateMaterialsSeconds(state, project.cost);
    return Number.isFinite(estimate) ? `Plan waiting for materials · estimated deliveries ${durationText(estimate)}.` : 'Plan waiting for production and transport.';
  }
  if (project.stage === 'queued') return 'Materials reserved, including the 10% queue surcharge. Waiting for a construction slot.';
  const estimate = scheduledConstructionEstimate(project.building, project);
  if (project.stage === 'building') return `Building level ${project.targetLevel}: ${durationText(project.buildRemaining)} remaining.`;
  return `Transport for level ${project.targetLevel}: ${count(project.goodsTotal - project.goodsRemaining)} / ${count(project.goodsTotal)} delivered. ${estimate ? `Transport ${durationText(estimate.transport)} · construction ${durationText(estimate.building)}.` : 'Assign warehouse carriers to calculate the remaining delivery time.'}`;
}

function scheduledConstructionEstimate(id, projectOrCost) {
  const key = JSON.stringify([id, projectOrCost.order || 0, projectOrCost.stage || '', projectOrCost.targetLevel || 0, projectOrCost.cost || projectOrCost]);
  const cached = estimateCache.get(key);
  if (cached?.frame === estimateFrame) return cached.value;
  const value = (Logistics.constructionScheduleEstimate || Logistics.constructionEstimate)?.(state, projectOrCost, id);
  if (estimateCache.size > 30) estimateCache.clear();
  estimateCache.set(key, { frame: estimateFrame, value });
  return value;
}
function constructionDescription(id) {
  const project = state.buildings[id].construction || state.buildings[id].premiumService;
  return project ? projectDescription(project) : upgradeTransportDescription(id);
}
function upgradeTransportDescription(id) {
  const cost = buildingCost(state, id);
  const temporary = { building: id, targetLevel: plannedLevel(state, id) + 1, cost, remainingMaterials: Object.fromEntries(MATERIAL_IDS.map(resource => [resource, cost[resource] || 0])), delivered: {}, stage: 'transport', goodsRemaining: MATERIAL_IDS.reduce((sum, resource) => sum + (cost[resource] || 0), 0) };
  const estimate = scheduledConstructionEstimate(id, temporary);
  return estimate ? `Estimated transport: ${durationText(estimate.transport)}. Building phase: ${durationText(estimate.building)}. Total: ${durationText(estimate.total)}. Changes to staffing or delivery priorities recalculate this estimate.` : 'Assign warehouse carriers to estimate transport and construction time. The base carrier round trip takes 5 minutes with one material. Completed path levels increase transport speed.';
}

function constructionPanel() {
  const projects = state.constructionProjects;
  return el('div', { 'data-construction-signature': constructionSignature() },
    el('p', { class: 'notice', 'data-construction-summary': '' }, constructionSummary()),
    note('Your Town Hall level sets both the active construction limit and the regular queue limit. Paid queue entries already have reserved materials. Warehouse workers normally replenish central storage before supplying construction; you can change priorities.'),
    premiumActive(state) ? note(`The package adds 4 construction slots, an unlimited queue and plans based on future deliveries. Expires ${I18n.formatDateTime(state.premium.expiresAt, language())}.`) : button('View construction package', () => openPanel('premium'), { class: 'action secondary' }),
    ...projects.map(project => card(el('h3', {}, `${titleOf(project.building)} → level ${project.targetLevel}`),
      el('p', { 'data-project-status': project.order }, projectDescription(project)),
      el('p', { class: 'cost' }, costText(project.cost)), projectDeliveryView(project),
      button('Building', () => openPanel('building', project.building), { class: 'action secondary' }),
      button('Cancel construction', () => perform({ type: 'cancelConstruction', order: project.order }), { class: 'action secondary', disabled: !canCancelProject(project), 'data-cancel-project': project.order, title: 'Available only before the first pickup or building phase; cancel later upgrades first.' }))),
    !projects.length ? note('No upgrades planned. Select a building on the island.') : null);
}
function upgradeCostView(cost, source = 'building') {
  return el('div', { class: 'upgrade-costs', 'aria-label': 'Available resources compared with upgrade costs' }, Object.entries(cost).map(([id, required]) => {
    const available = spendable(id);
    return el('div', { class: 'upgrade-cost-row' }, el('span', {}, nameOf(id)), el('strong', { class: available >= required ? 'is-affordable' : 'is-short', 'data-upgrade-cost': id, 'data-cost-source': source, 'data-required': required, 'aria-label': `${nameOf(id)}: in storage ${count(available)}, required ${count(required)}; ${available >= required ? 'enough' : 'short'}` }, `${count(available)} / ${count(required)}`));
  }));
}
let activeInfoPopup = null;
function closeInfoPopup(restoreFocus = false) {
  if (!activeInfoPopup) return false;
  const { trigger, popup } = activeInfoPopup;
  popup.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  activeInfoPopup = null;
  if (restoreFocus && trigger.isConnected) {
    trigger._restoringInfoFocus = true;
    trigger.focus({ preventScroll: true });
    trigger._restoringInfoFocus = false;
  }
  return true;
}
function positionInfoPopup() {
  if (!activeInfoPopup) return;
  const { trigger, popup } = activeInfoPopup;
  const anchor = trigger.getBoundingClientRect();
  const width = Math.min(360, innerWidth - 32);
  popup.style.width = `${width}px`;
  const safeTop = Math.max(16, (dialog.querySelector('.dialog-header')?.getBoundingClientRect().bottom || 0) + 8);
  const below = anchor.bottom + 8;
  const belowSpace = Math.max(0, innerHeight - 16 - below);
  const aboveSpace = Math.max(0, anchor.top - safeTop - 8);
  const placeBelow = belowSpace >= aboveSpace;
  // A long explanation scrolls beside its trigger rather than covering the i,
  // so the same button stays reachable for a second tap to close it.
  popup.style.maxHeight = `${Math.max(40, placeBelow ? belowSpace : aboveSpace)}px`;
  const height = popup.getBoundingClientRect().height;
  const left = Math.max(16, Math.min(anchor.right - width, innerWidth - width - 16));
  const top = placeBelow ? below : Math.max(safeTop, anchor.top - height - 8);
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
function activateInfoPopup(trigger, popup) {
  // Hover/focus previews the help; the first tap pins it, the next closes it.
  if (activeInfoPopup?.trigger === trigger && activeInfoPopup.pinned) { closeInfoPopup(false); return; }
  if (activeInfoPopup?.trigger !== trigger) toggleInfoPopup(trigger, popup);
  if (activeInfoPopup?.trigger === trigger) activeInfoPopup.pinned = true;
}
function bindInfoTrigger(trigger, popup) {
  const open = () => {
    if (activeInfoPopup?.trigger === trigger) return;
    closeInfoPopup(false);
    activeInfoPopup = { trigger, popup };
    trigger.setAttribute('aria-expanded', 'true');
    popup.hidden = false;
    positionInfoPopup();
  };
  let dismiss;
  const scheduleClose = () => { clearTimeout(dismiss); dismiss = setTimeout(() => { if (activeInfoPopup?.trigger === trigger && !activeInfoPopup.pinned && !trigger.matches(':hover') && !popup.matches(':hover') && document.activeElement !== trigger && !popup.contains(document.activeElement)) closeInfoPopup(false); }, 140); };
  trigger.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { clearTimeout(dismiss); open(); } });
  trigger.addEventListener('pointerleave', scheduleClose);
  trigger.addEventListener('focus', () => { if (!trigger._restoringInfoFocus) open(); });
  trigger.addEventListener('blur', scheduleClose);
  popup.addEventListener('pointerenter', () => clearTimeout(dismiss));
  popup.addEventListener('pointerleave', scheduleClose);
  return trigger;
}
function informationHeading(key, title, ...paragraphs) {
  const popup = el('div', { id: `section-info-${key}`, class: 'upgrade-info-popover', hidden: true, role: 'region', 'aria-label': `${title} information`, 'data-section-help': key },
    el('h4', {}, title), ...paragraphs.map(value => value instanceof Node ? value : el('p', {}, value)));
  const trigger = button('i', () => activateInfoPopup(trigger, popup), { class: 'upgrade-info-toggle section-info-toggle', 'aria-label': `${title} information`, 'aria-expanded': 'false', 'aria-controls': popup.id, 'data-section-info': key });
  bindInfoTrigger(trigger, popup);
  return el('div', { class: 'upgrade-heading' }, el('h3', {}, title), trigger, popup);
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
  return premiumActive(state) ? 'Use Schedule expected deliveries for materials not yet in storage. Its separate fee is 25% of the missing goods’ base Harbor purchase value; queued costs already include their 10% surcharge.' : 'Collect the full cost in the central warehouse to start this upgrade.';
}
function upgradeHeading(id, title) {
  const popup = el('div', { id: `upgrade-info-${id}`, class: 'upgrade-info-popover', hidden: true, role: 'region', 'aria-label': 'Upgrade information', 'data-upgrade-help': id, 'data-upgrade-popover': id },
    el('h4', {}, 'Upgrade information'),
    el('p', {}, 'Upgrade materials come from the central warehouse and coins from the treasury. Queued orders add 10% to the full cost; the displayed resource totals already include this whenever the order must queue.'),
    el('p', { 'data-upgrade-transport': id }, upgradeTransportDescription(id)),
    el('p', { 'data-upgrade-requirements': id }, upgradeRequirementDescription(id)),
    el('p', {}, 'The current level remains active until the upgrade is complete. Production, transport and timers continue while you are away.'));
  if (PRODUCTION_RECIPES[id]) popup.append(el('h4', {}, 'Premium'), ...premiumInformationParagraphs().map(text => el('p', {}, text)));
  const trigger = button('i', () => activateInfoPopup(trigger, popup), { class: 'upgrade-info-toggle', 'aria-label': 'Upgrade information', 'aria-expanded': 'false', 'aria-controls': popup.id, 'data-upgrade-info': id });
  bindInfoTrigger(trigger, popup);
  return el('div', { class: 'upgrade-heading' }, el('h3', {}, title), trigger, popup);
}
function localStorageText(id) {
  const building = state.buildings[id];
  return `${count(building.ready)} / ${count(producerCapacity(state, id))} / ${count(producerCapacity(state, id, building.level + 1))}`;
}
function nextProductionDelivery(id) {
  const indices = Logistics.activeWorkerIndices?.(state, id) || Array.from({ length: activeCrew(id) }, (_, index) => index);
  const cycle = 3600 / Math.max(1, ownProductionRate(id));
  const times = indices.map(index => Math.max(0, cycle - (state.buildings[id].workProgress?.[index] || 0)) / productionSpeed());
  const seconds = Math.min(...times);
  const units = times.filter(value => Math.abs(value - seconds) < 1e-6).length;
  const recipe = PRODUCTION_RECIPES[id], inputLimit = recipe.input ? Math.floor(Logistics.centralAvailable(state, recipe.input) / recipe.amount) : Infinity;
  return { seconds, units: Math.min(units, inputLimit, Math.max(0, producerCapacity(state, id) - state.buildings[id].ready)), resource: recipe.output };
}
function productionTimerText(id) {
  const building = state.buildings[id], recipe = PRODUCTION_RECIPES[id];
  if (!building.workers) return 'Waiting for workers';
  if (!activeCrew(id)) { const arrivals = state.residents.filter(person => person.workplace === id && person.arrivalRemaining > 0); return arrivals.length ? `Workers arrive in ${durationText(Math.min(...arrivals.map(person => person.arrivalRemaining)))}` : 'Waiting for workers'; }
  if (building.ready >= producerCapacity(state, id)) return 'Storage full';
  if (recipe.input && Logistics.centralAvailable(state, recipe.input) < recipe.amount) return `Waiting for ${nameOf(recipe.input)}`;
  const next = nextProductionDelivery(id);
  return `${count(next.units)} ${nameOf(next.resource)} to local storage in ${durationText(next.seconds)}`;
}
function buildingStatus(id) {
  const building = state.buildings[id], recipe = PRODUCTION_RECIPES[id];
  if (!building.level) return { kind: 'waiting', label: 'Not built', detail: 'Build this site to begin.' };
  if (recipe) {
    if (building.ready >= producerCapacity(state, id)) return { kind: 'blocked', label: 'Storage full', detail: 'Waiting for carriers to collect local goods.' };
    if (!building.workers || !activeCrew(id)) return { kind: 'waiting', label: 'Waiting for workers', detail: building.workers ? productionTimerText(id) : 'Assign a free resident from Home to start production.' };
    if (recipe.input && Logistics.centralAvailable(state, recipe.input) < recipe.amount) return { kind: 'waiting', label: 'Waiting for resources', detail: `${recipe.amount} ${nameOf(recipe.input)} needed from central storage per unit.` };
    return { kind: 'working', label: 'Producing', detail: productionTimerText(id) };
  }
  if (WORKPLACE_IDS.includes(id)) {
    if (!workplaceUnlocked(state, id)) return { kind: 'waiting', label: 'Locked', detail: `Available at Town Hall level ${id === 'market' ? 2 : 4}.` };
    if (!building.workers || !activeCrew(id)) {
      const arrivals = state.residents.filter(person => person.workplace === id && person.arrivalRemaining > 0);
      return { kind: 'waiting', label: 'Waiting for workers', detail: arrivals.length ? `Arriving in ${durationText(Math.min(...arrivals.map(person => person.arrivalRemaining)))}` : 'Assign free residents from Home.' };
    }
    const trips = state.haulTrips?.[id] || [];
    if (trips.length) return { kind: 'working', label: 'Delivering', detail: `${trips.length} ${trips.length === 1 ? 'delivery' : 'deliveries'} in progress · next completes in ${durationText(Math.min(...trips.map(trip => trip.remaining)) / (Logistics.transportEfficiency?.(state) || productionMultiplier(state)))}` };
    if (id === 'warehouse' && warehouseUsed(state) >= warehouseLimits(state).total) return { kind: 'blocked', label: 'Storage full', detail: 'Carriers are waiting for space or a delivery order.' };
    return { kind: 'waiting', label: 'Waiting for goods', detail: `${activeCrew(id)} carriers ready for their next delivery.` };
  }
  if (id === 'house') return { kind: unhousedResidents(state) ? 'blocked' : 'ready', label: unhousedResidents(state) ? 'Overcrowded' : 'Housing available', detail: `${count(state.population)} residents · ${count(housingCapacity(state))} beds` };
  if (id === 'chapel') return { kind: state.blessingRemaining > 0 || state.chapelRemaining > 0 ? 'working' : 'ready', label: state.blessingRemaining > 0 ? 'Blessing active' : state.chapelRemaining > 0 ? 'Upgrade bonus active' : 'Ready for a blessing', detail: blessingDescription() };
  if (id === 'lighthouse') { const visitors = (state.lighthouseVisits || []).reduce((sum, group) => sum + group.residentIds.length, 0); return { kind: visitors ? 'working' : 'ready', label: visitors ? 'Welcoming visitors' : 'Ready for visitors', detail: `${count(visitors)} residents visiting${state.lighthouseRemaining > 0 ? ' · Upgrade bonus active' : ''}` }; }
  return { kind: 'ready', label: 'Managing the island', detail: `Level ${state.buildings.townhall.level} · ${count(state.population)} residents` };
}
function updateBuildingStatus(node, id) {
  const status = buildingStatus(id);
  node.dataset.status = status.kind;
  node.querySelector('[data-status-label]').textContent = status.label;
  node.querySelector('[data-status-detail]').textContent = status.detail;
}
function buildingStatusBanner(id) {
  const node = el('div', { class: 'building-status-banner', role: 'status', 'data-building-status': id }, el('strong', { 'data-status-label': '' }), el('small', { 'data-status-detail': '' }));
  updateBuildingStatus(node, id);
  return node;
}
function workerStat(id, readonly = false) {
  const building = state.buildings[id];
  return el('div', { class: 'stat producer-workers' }, el('small', {}, 'Workers'),
    el('div', { class: 'producer-workers-row' },
      el('div', { class: 'labelled-values worker-values', 'aria-label': 'Assigned workers / free residents at Home / building worker limit' },
        labelledValue(building.workers, 'Assigned', { 'data-worker-count': id }),
        labelledValue(freeWorkers(state), 'Free at home', { 'data-worker-free': id }),
        labelledValue(workerLimit(state, id), 'Max workers', { 'data-worker-limit': id })),
      readonly ? null : el('div', { class: 'producer-worker-controls' },
        button('−', () => perform({ type: 'assign', building: id, delta: -1 }), { class: 'producer-worker-button', disabled: !building.workers, 'data-worker-building': id, 'data-worker-delta': -1, 'aria-label': `Release worker: ${titleOf(id)}` }),
        button('+', () => perform({ type: 'assign', building: id, delta: 1 }), { class: 'producer-worker-button', disabled: freeWorkers(state) <= 0 || building.workers >= workerLimit(state, id), 'data-worker-building': id, 'data-worker-delta': 1, 'aria-label': `Assign worker: ${titleOf(id)}` }))));
}
function labelledValue(value, label, attrs = {}) {
  return el('span', { class: 'labelled-value' }, el('strong', attrs, count(value)), el('small', {}, label));
}
function localStockValues(id) {
  const building = state.buildings[id];
  return el('div', { class: 'labelled-values storage-values', 'data-local-buffer': id, 'data-value': building.ready, 'data-limit': producerCapacity(state, id), 'aria-label': 'In stock / current capacity / capacity after the next upgrade' },
    labelledValue(building.ready, 'In stock', { 'data-local-current': id }),
    labelledValue(producerCapacity(state, id), 'Current cap.', { 'data-local-capacity': id }),
    labelledValue(producerCapacity(state, id, building.level + 1), 'Next level cap.', { 'data-local-next': id }));
}
function updateLocalStockValues(node, id) {
  const current = node.querySelector('[data-local-current]');
  if (!current) { node.textContent = localStorageText(id); return; }
  current.textContent = count(state.buildings[id].ready);
  node.querySelector('[data-local-capacity]').textContent = count(producerCapacity(state, id));
  node.querySelector('[data-local-next]').textContent = count(producerCapacity(state, id, state.buildings[id].level + 1));
}

function productionInfo(id) {
  const recipe = PRODUCTION_RECIPES[id];
  const popup = el('div', { id: `production-info-${id}`, class: 'upgrade-info-popover production-info-popover', hidden: true, role: 'region', 'aria-label': 'Production information', 'data-production-help': id, 'data-production-popover': id },
    el('h4', {}, 'Production information'),
    el('p', {}, BUILDINGS[id].description),
    el('p', {}, `Product: ${nameOf(recipe.output)}. Potential output: `, el('strong', { 'data-local-rate': id }, localProductionRate(id))),
    recipe.input ? el('p', {}, `Each ${nameOf(recipe.output).toLocaleLowerCase('en-US')} requires ${recipe.amount} ${nameOf(recipe.input).toLocaleLowerCase('en-US')} from the central warehouse (2:1).`) : null,
    el('p', {}, `Each fed worker produces ${ownProductionRate(id)} units per hour at this building level. Hunger halves output immediately. The Lighthouse bonus doubles material production. Local storage holds 200 units per building level. Storage shows current stock / current capacity / capacity after one upgrade. Carriers carry one material per trip. The base round trip takes 5 minutes; path levels increase carrier speed and, from level 3, load. Workplace upgrades also increase load.`),
    el('p', { 'data-full-penalty': id }, fullPenaltyDescription(id)),
    el('p', {}, 'A production blockage gives its assigned workers −10 happiness, then another −10 every 24 hours, down to −50 from this penalty. Releasing a worker resets their blockage timer while they return home.'),
    el('p', {}, 'Releasing a worker discards their unfinished unit. They take 5 minutes to return home and cannot work or be reassigned during that journey.'));
  const trigger = button('i', () => activateInfoPopup(trigger, popup), { class: 'upgrade-info-toggle production-info-toggle', 'aria-label': 'Production information', 'aria-expanded': 'false', 'aria-controls': popup.id, 'data-production-info': id });
  bindInfoTrigger(trigger, popup);
  return [trigger, popup];
}
function producerSummary(id) {
  const building = state.buildings[id];
  const [info, popup] = productionInfo(id);
  const level = stat('Level', building.level);
  level.classList.add('producer-level');
  return el('div', { class: 'stat-grid producer-summary', 'data-production-summary': id },
    level,
    el('div', { class: 'stat producer-storage' },
      el('div', { class: 'producer-storage-heading' }, el('small', {}, 'Storage'), info),
      localStockValues(id),
      el('small', { class: 'producer-next-unit', 'data-work-progress': id }, productionTimerText(id)), popup),
    workerStat(id));
}

function buildingPanel(id) {
  const data = BUILDINGS[id];
  const value = state.buildings[id];
  const isProducer = productionBuildings.includes(id);
  const content = el('div', { class: 'building-panel', 'data-building-panel': id, 'data-building-signature': `${value.level}:${(value.construction || value.premiumService)?.stage || ''}` },
    el('p', { class: 'building-purpose', 'data-building-purpose': id }, buildingPurpose(id)));
  const main = el('section', { class: 'building-main', 'aria-label': 'Building details' });
  const upgrades = el('section', { class: 'building-upgrade-column', 'aria-label': 'Construction and Premium' });
  if (!['townhall', 'house'].includes(id) && !(id === 'lighthouse' && !value.level)) main.append(buildingStatusBanner(id));
  if (isProducer) main.append(producerSummary(id));
  else if (['townhall', 'house'].includes(id)) main.append(compactSettlementSummary(id));
  else main.append(el('div', { class: 'stat-grid building-basic-summary' },
    stat('Level', value.level || 'Ruins'),
    id === 'lighthouse' && value.level ? stat('Stage', lighthouseLevelName(value.level)) : null));
  if (WORKPLACE_IDS.includes(id) && !isProducer) main.append(workerStat(id));
  if (id === 'townhall') {
    const effects = activeEffectsPanel();
    effects.classList.add('building-effects-preview');
    main.append(effects, el('div', { class: 'building-quick-actions' },
      button('All bonuses and penalties', () => openPanel('effects'), { class: 'action secondary' }),
      button('Construction and queue', () => openPanel('construction'), { class: 'action secondary', 'data-construction-entry': '' })));
  }
  if (id === 'warehouse') {
    const limits = warehouseLimits(state);
    main.append(el('div', { class: 'stat-grid building-warehouse-summary' }, stat('Storage used', el('span', {}, el('span', { 'data-logistics-stat': 'used' }, count(warehouseUsed(state))), ' / ', el('span', { 'data-logistics-stat': 'total' }, count(limits.total)))), stat('Capacity per resource', el('span', { 'data-logistics-stat': 'per-resource' }, count(limits.perResource))), stat('Transport capacity', el('span', { 'data-logistics-stat': 'carrier-rate' }, transportRate('warehouse')))));
  }
  if (id === 'house') main.append(houseHappinessPanel(), button('Manage all workers', () => openPanel('workers'), { class: 'action secondary', 'data-manage-workers': '' }));
  if (id === 'chapel') main.append(compactBlessingPanel());
  if (id === 'lighthouse') main.append(el('p', { class: 'notice', 'data-lighthouse-bonus': '' }, lighthouseDescription()), button('Lighthouse visits', () => openPanel('building-details', id), { class: 'action secondary', disabled: !value.level }));
  if (id === 'dock') main.append(button('Open Harbor orders', () => openPanel('trade'), { class: 'action secondary' }));
  if (id === 'market') main.append(button('Open Market exchange', () => openPanel('market'), { class: 'action secondary', disabled: !workplaceUnlocked(state, id) }));
  const cost = buildingCost(state, id);
  const maxLevel = value.level >= data.maxLevel;
  const eligibility = upgradeEligibility(state, id);
  const townhallLocked = !maxLevel && !eligibility.ok;
  if (value.construction || value.premiumService) {
    main.append(el('p', { class: 'notice compact-project-status construction-status', 'data-construction-status': id }, constructionDescription(id)));
  }
  const upgradeButton = button(maxLevel ? 'Maximum level' : value.level ? 'Upgrade' : 'Build', () => perform({ type: value.level ? 'upgrade' : 'build', building: id }), { disabled: maxLevel || townhallLocked || !canAfford(state, cost), 'data-upgrade-building': id });
  const upgradeSection = card(upgradeHeading(id, maxLevel ? 'Fully upgraded' : value.construction ? `Next level: ${plannedLevel(state, id) + 1}` : value.level ? 'Building upgrade' : 'Construction'),
    maxLevel ? null : upgradeCostView(cost),
    townhallLocked ? el('p', { class: 'notice building-lock', 'data-upgrade-lock': id }, eligibility.message) : null,
    el('div', { class: 'ordinary-upgrade-action' }, upgradeButton, producerUpgradeTimes(id)),
    townhallLocked ? button('Upgrade Town Hall', () => openPanel('building', 'townhall'), { class: 'action secondary' }) : null);
  upgradeSection.dataset.buildingUpgrade = id;
  upgrades.append(upgradeSection, compactBuildingPremium(id));
  const project = value.construction || value.premiumService;
  if (project?.stage === 'building' && !project.premiumService) upgrades.append(el('div', { class: 'compact-project-actions' }, [25, 50, 75, 100].map(percent => quotedButton(percent === 100 ? 'Finish construction now' : `Shorten building time by ${percent}%`, () => Activities.quoteAcceleration?.(state, project.order, percent), { type: 'premiumAccelerate', project: project.order, percent }, { class: 'action secondary', 'data-premium-percent': percent }))));
  else if (project?.stage === 'transport') upgrades.append(premiumTransportButton({ route: 'construction', project: project.order }));
  if (premiumActive(state) && !canAfford(state, cost)) upgrades.append(quotedButton('Schedule expected deliveries', () => Activities.quoteForecastPlan?.(state, id, { buildingCost }), { type: 'forecastPlan', building: id }, { class: 'action secondary', 'data-premium-forecast': id }));
  content.append(el('div', { class: 'building-layout' }, main, upgrades),
    el('footer', { class: 'building-navigation' }, button('More building details', () => openPanel('building-details', id), { class: 'action secondary', 'data-building-more': id })));
  return content;
}
function compactBuildingPremium(id) {
  const content = card(informationHeading(`compact-premium-${id}`, 'Premium building options', ...premiumInformationParagraphs()),
    el('div', { class: 'compact-premium-actions' }, quotedButton('Buy building package', () => Activities.quotePremiumBuilding?.(state, id, { buildingCost }), { type: 'premiumBuyBuilding', building: id }, { 'data-premium-buy': id }),
      PRODUCTION_RECIPES[id] ? premiumTransportButton({ route: 'producer', building: id }) : null));
  content.classList.add('compact-building-premium');
  return content;
}
function compactBlessingPanel() {
  return card(informationHeading('compact-blessings', 'Blessings', 'A manual blessing grants +50 of every resource and +20 happiness for one hour. Free uses depend on the Chapel level. The next paid blessing is available four hours after the previous effect ends.'),
    el('div', { class: 'stat-grid' }, stat('Free uses remaining', Math.max(0, state.buildings.chapel.level - state.blessingsUsed)), stat('Paid blessing cooldown', el('span', { 'data-compact-blessing-cooldown': '' }, durationText(state.paidBlessingCooldownRemaining || 0)))),
    el('div', { class: 'building-quick-actions' },
      button('Activate free blessing', () => perform({ type: 'blessing' }), { disabled: state.blessingRemaining > 0 || state.blessingsUsed >= state.buildings.chapel.level, 'data-blessing': '' }),
      button(`Paid blessing · ${count(100 * state.buildings.chapel.level)} coins`, () => perform({ type: 'paidBlessing' }), { class: 'action secondary', disabled: state.blessingRemaining > 0 || state.resources.coins < 100 * state.buildings.chapel.level || (state.paidBlessingCooldownRemaining || 0) > 0, 'data-paid-blessing': '' })));
}
function buildingDetailsPanel(id) {
  const building = state.buildings[id];
  const content = el('div', { class: 'building-details-panel', 'data-building-details': id, 'data-building-signature': `${building.level}:${(building.construction || building.premiumService)?.stage || ''}` }, el('p', { class: 'building-purpose' }, buildingPurpose(id)));
  if (id === 'townhall') content.append(levelSharePanel(), activeEffectsPanel(), el('p', { class: 'notice', 'data-construction-summary': '' }, constructionSummary()), button('Construction and queue', () => openPanel('construction'), { class: 'action secondary' }));
  if (id === 'house') content.append(residentPurchasePanel(), rules('Lighthouse visits', visitsPanel()), residentRoster());
  if (id === 'warehouse') content.append(carrierJobsPanel(), warehouseOverview(), transportPriorityPanel());
  if (id === 'market') content.append(marketPanel());
  if (id === 'dock') content.append(button('Open Harbor orders', () => openPanel('trade')), note('Harbor workers carry goods between central storage, Harbor storage and the ship.'));
  if (id === 'chapel') content.append(blessingPanel());
  if (id === 'lighthouse') content.append(el('div', { class: 'stat-grid' }, stat('Level', state.buildings[id].level || 'Ruins'), stat('Stage', lighthouseLevelName(state.buildings[id].level))), visitsPanel());
  if (PRODUCTION_RECIPES[id]) content.append(productionCard(id), note(BUILDINGS[id].description));
  const project = state.buildings[id].construction || state.buildings[id].premiumService;
  if (project) content.append(card(el('h3', {}, 'Delivered building materials'), projectDeliveryView(project), el('p', { 'data-project-status': project.order }, projectDescription(project))));
  return content;
}
function stat(label, value) { return el('div', { class: label === 'Level' ? 'stat level-stat' : 'stat' }, el('small', {}, label), el('strong', {}, value)); }
function lighthouseDescription() {
  return state.lighthouseRemaining > 0 ? `Lighthouse upgrade bonus: everyone has 100% happiness and material production ×2. Remaining: ${durationText(state.lighthouseRemaining)}.` : 'Complete a Lighthouse level to give everyone 100% happiness and material production ×2 for 24 hours × that level.';
}

function objectivePanel() {
  return el('div', {}, note(gameGoal().description),
    el('div', { class: 'panel-grid' }, button('Buildings', () => openPanel('buildings')), button('Residents and happiness', () => openPanel('residents')), button('Warehouse and transport', () => openPanel('resources')), button('Tasks', () => openPanel('tasks'))));
}
function buildingsPanel() {
  return el('div', {}, note(`Town Hall level ${state.buildings.townhall.level} allows other buildings to reach the same level.`),
    el('div', { class: 'panel-grid' }, BUILDING_DOCK_ORDER.map(id => card(el('h3', {}, titleOf(id)), el('p', { 'data-building-purpose': id }, buildingPurpose(id)), el('p', {}, `Level ${state.buildings[id].level} / ${buildingLevelLimit(state, id)}`), button('Details and upgrades', () => openPanel('building', id))))));
}
function resourcesPanel(selected) {
  return el('div', {}, note(warehousePurpose()), selected === 'food' ? feedingPanel() : null, selected ? note(`${nameOf(selected)} — stock in the ${selected === 'coins' ? 'treasury' : 'central warehouse'}: ${count(state.resources[selected])}.`) : null,
    selected === 'coins' ? card(el('h3', {}, 'Treasury'),
      stat('Coins', el('span', { 'data-stock': 'coins' }, count(state.resources.coins))),
      note('Coins are stored separately and do not use goods storage.'),
      button('Open House', () => openPanel('building', 'house'), { class: 'action secondary' })) : null,
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
      el('div', { class: 'stat producer-storage' }, el('small', {}, 'Storage'), localStockValues(id)),
      stat('Potential output', el('span', { 'data-local-rate': id }, localProductionRate(id)))),
    el('p', { class: 'production-status', 'data-work-progress': id }, productionDescription(id)),
    recipe.input ? note(`Per unit: ${recipe.amount} ${nameOf(recipe.input).toLocaleLowerCase('en-US')} from the central warehouse → 1 ${nameOf(recipe.output).toLocaleLowerCase('en-US')}.`) : null,
    note('Finished goods wait at the building until warehouse workers deliver them to central storage.'));
  if (navigation) content.append(button('Workers and details', () => openPanel('building', id), { class: 'action secondary' }));
  content.classList.add('production-overview-card');
  content.dataset.productionCard = id;
  return content;
}
function productionDescription(id) {
  const building = state.buildings[id], recipe = PRODUCTION_RECIPES[id];
  if (!building.workers) return 'Assign workers to start production.';
  if (!activeCrew(id)) return productionTimerText(id);
  if (building.ready >= producerCapacity(state, id)) return 'Local storage is full. Production is waiting for carriers to collect the goods.';
  if (recipe.input && Logistics.centralAvailable(state, recipe.input) < recipe.amount) return `Missing central warehouse input: ${recipe.amount} ${nameOf(recipe.input).toLocaleLowerCase('en-US')} per unit.`;
  const progress = Math.max(0, ...(building.workProgress || []));
  return `Next unit in ${durationText((3600 / ownProductionRate(id) - progress) / productionSpeed())}.`;
}
function warehouseOverview() {
  const limits = warehouseLimits(state);
  return card(el('h3', {}, 'Central warehouse'),
    el('div', { class: 'stat-grid logistics-stats' },
      stat('Storage used', el('span', { 'data-logistics-stat': 'used' }, count(warehouseUsed(state)))),
      stat('Total capacity', el('span', { 'data-logistics-stat': 'total' }, count(limits.total))),
      stat('Capacity per resource', el('span', { 'data-logistics-stat': 'per-resource' }, count(limits.perResource))),
      stat('Transport capacity', el('span', { 'data-logistics-stat': 'carrier-rate' }, transportRate('warehouse')))),
    el('div', { class: 'warehouse-stock-list' }, MATERIAL_IDS.map(id => el('div', { class: 'warehouse-stock-row' },
      el('strong', {}, nameOf(id)), el('span', { 'data-central-resource': id, 'data-value': state.resources[id], 'data-limit': limits.perResource }, `${count(state.resources[id])} / ${count(limits.perResource)}`)))),
    el('p', { class: 'warehouse-pending' }, 'Deliveries waiting for space: ', el('strong', { 'data-logistics-stat': 'pending' }, logisticsStatValue('pending'))),
    el('div', { class: 'warehouse-pending-details' }, MATERIAL_IDS.map(id => el('span', {}, `${nameOf(id)}: `, el('span', { 'data-pending-resource': id }, count(state.pendingDeliveries?.[id] || 0))))),
    rules('How the warehouse works',
      note('A level 1 Warehouse holds 4,000 units in total and up to 1,000 of each resource. Each additional level increases both limits by 50%. Coins are kept in a separate treasury.'),
      note('A carrier takes one material per trip, including a partial load. The base round trip is 5 minutes; completed path levels reduce it. Level 1 carries 120 units per trip. Hunger halves effective transport. Central replenishment comes before construction unless you change priorities. Food reserve: 50 × Warehouse level.')));
}
function carrierJobRows() {
  return Logistics.warehouseCarrierJobs?.(state) || [];
}
function deliveryPlace(id, row) {
  if (id === 'construction') return row.projectOrder ? `${titleOf(state.constructionProjects.find(project => project.order === row.projectOrder)?.building || 'warehouse')} construction` : 'Construction site';
  if (id === 'pending') return 'Waiting deliveries';
  return id === 'house' ? 'Home' : titleOf(id);
}
function refreshCarrierJobs(node) {
  const rows = carrierJobRows();
  node.replaceChildren(...rows.map(row => {
    const name = row.residentId == null ? 'Cargo in transit' : `Resident #${row.residentId}`;
    const status = row.status === 'walking' ? 'Walking to Warehouse' : row.status === 'delivering' ? 'Delivering' : 'Waiting for a delivery';
    return el('div', { class: `carrier-job carrier-job-${row.status}`, 'data-carrier-status': row.status, 'data-carrier-resident': row.residentId ?? '', 'data-carrier-resource': row.resource || '' },
      el('div', { class: 'carrier-job-person' }, el('strong', {}, name), el('span', {}, status)),
      el('div', { class: 'carrier-job-cargo' }, el('strong', {}, row.resource ? `${count(row.amount)} ${nameOf(row.resource)}` : '—'), el('small', {}, row.status !== 'idle' ? `${deliveryPlace(row.from, row)} → ${deliveryPlace(row.to, row)}` : 'Ready for the next available job')),
      el('div', { class: 'carrier-job-eta' }, el('small', {}, row.status === 'walking' ? 'Arrives in' : row.status === 'delivering' ? 'Delivery ends in' : 'Next delivery'), el('strong', { 'data-carrier-eta': row.residentId ?? 'cargo' }, row.status === 'idle' ? 'Waiting' : durationText(row.remaining))));
  }));
  if (!rows.length) node.append(el('p', { class: 'carrier-empty' }, 'No warehouse workers assigned. Use + to send a free resident from Home.'));
}
function carrierJobsPanel() {
  const list = el('div', { class: 'carrier-jobs', 'data-carrier-jobs': '', 'aria-label': 'Warehouse workers and current deliveries' });
  refreshCarrierJobs(list);
  return card(informationHeading('carrier-jobs', 'Warehouse workers', 'Each row shows the current carrier, cargo, route and remaining delivery time. A new worker first walks five minutes from Home. An idle worker will take the next available job; an already loaded shipment keeps its cargo.'), list);
}
function priorityProgressText() {
  const selected = state.warehousePriorities || [];
  const position = state.warehousePriorityCycle?.position || 0;
  if (!selected.length) return 'No priorities selected · available goods are collected normally.';
  const shares = selected.length === 1 ? [8] : selected.length === 2 ? [5, 3] : [5, 3, 2];
  return `${shares.map((share, index) => `${share} ${nameOf(selected[index])}`).join(' · ')}${selected.length < 3 ? ' · 2 random' : ''} per 10 trips · next allocation ${position + 1} / 10`;
}
function transportPriorityPanel() {
  const selected = state.warehousePriorities || [];
  return card(informationHeading('transport-priority', 'Transport priority',
    'Choose up to three priorities from goods and Construction. Selected priorities stay highlighted and numbered. Click a selected priority to remove it; the remaining priorities move up.',
    'Each repeating block contains 10 trips: one priority gets 8 trips and 2 random; two priorities get 5 + 3 and 2 random; three get 5 + 3 + 2. Priorities stay active until you change them. Unavailable goods are skipped so carriers can continue with an available delivery.'),
    el('div', { class: 'material-priority-options', 'data-transport-priority-list': '' }, [...MATERIAL_IDS, 'construction'].map(id => {
      const index = selected.indexOf(id), active = index >= 0;
      return button('', () => perform({ type: 'warehousePriority', resource: id }), { class: `material-priority-button${active ? ' is-active' : ''}`, disabled: !active && selected.length >= 3, 'aria-pressed': String(active), 'aria-label': active ? `${nameOf(id)}: priority ${index + 1}, remove priority` : `Prioritize ${nameOf(id)}`, 'data-warehouse-priority': id, 'data-priority-number': active ? index + 1 : '' });
    }).map((node, index) => {
      const id = [...MATERIAL_IDS, 'construction'][index], number = selected.indexOf(id) + 1;
      node.append(el('span', { class: 'material-priority-number', 'aria-hidden': 'true' }, number || '−'), el('span', {}, nameOf(id)));
      return node;
    })),
    el('p', { class: 'priority-cycle-summary', 'data-priority-progress': '' }, priorityProgressText()));
}
function logisticsStatValue(key) {
  const limits = warehouseLimits(state);
  const values = { used: count(warehouseUsed(state)), total: count(limits.total), 'per-resource': count(limits.perResource), 'carrier-rate': transportRate('warehouse'), 'market-rate': transportRate('market'), pending: count(Object.values(state.pendingDeliveries || {}).reduce((sum, value) => sum + value, 0)), returning: (state.returningWorkers || []).length, 'next-return': returnDescription() };
  return values[key] ?? '';
}
function durationText(seconds) { return I18n.formatDuration(seconds, language()); }

function returnDescription() {
  const returning = state.returningWorkers || [];
  return returning.length ? `Next worker returns in ${durationText(Math.min(...returning))}` : 'No workers are returning home.';
}
function rules(title, ...children) {
  return el('details', { class: 'island-rules' }, el('summary', {}, title), ...children);
}
function foodStatValues() {
  const affected = hasFoodForResidents(state) ? 0 : state.residents.filter(resident => resident.hungerSeconds >= 12 * 3600).length;
  return { demand: `${foodDemandPerHour(state)} food/h`, demandValue: count(foodDemandPerHour(state)), status: hasFoodForResidents(state) ? 'Food available' : 'Food needed', penalty: hungerPenaltyPerHour(state) ? `−5 percentage points/h per affected resident (${affected})` : '0 percentage points/h', penaltyCompact: hungerPenaltyPerHour(state) ? `−5 pp/h × ${count(affected)}` : '0 pp/h', efficiency: `${productionMultiplier(state) * 100}%` };
}
function feedingPanel() {
  const values = foodStatValues();
  const content = card(el('div', { class: 'workers-food-heading' }, el('h3', {}, 'Meals for everyone'), el('span', { class: 'workers-meal-status', 'data-food-stat': 'status', 'data-fed': String(hasFoodForResidents(state)) }, values.status)),
    el('div', { class: 'workers-food-metrics' },
      el('div', {}, el('strong', { 'data-food-stat': 'demandValue' }, values.demandValue), el('span', {}, 'Food per hour')),
      el('div', {}, el('strong', { 'data-food-stat': 'efficiency' }, values.efficiency), el('span', {}, 'Work efficiency')),
      el('div', {}, el('strong', { 'data-food-stat': 'penaltyCompact' }, values.penaltyCompact), el('span', {}, 'Hunger penalty'))),
    rules('How meals work', note('Each resident consumes 1 Food per real hour from central storage, including while offline. Eating adds 1 happiness point per hour. Without food, work efficiency immediately falls to 50%; after 12 continuous hungry hours the resident also loses 5 points per hour. Food reserved for meals cannot be spent twice.'), note('The hunger penalty shows the loss for each affected resident and how many people are affected.')));
  content.classList.add('workers-food');
  return content;
}
function workerManagementPanel() {
  const metric = (label, id, value) => el('div', { class: 'workers-metric' }, el('strong', { 'data-population-stat': id }, count(value)), el('span', {}, label));
  return el('div', { class: 'workers-panel', 'data-workers-panel': '' },
    el('p', { class: 'workers-intro' }, 'Choose a workplace, then use + or − to change its team. New workers need five minutes to arrive.'),
    el('div', { class: 'workers-overview' }, metric('Free at home', 'free', freeWorkers(state)), metric('Assigned', 'workers', totalWorkers(state)), metric('Walking to work', 'arriving', state.residents.filter(person => person.workplace && person.arrivalRemaining > 0).length), metric('Returning home', 'returning', (state.returningWorkers || []).length)),
    feedingPanel(),
    el('div', { class: 'workers-section-heading' }, el('h3', {}, 'Your workplaces'), rules('Assignment help',
      note('Each workplace can employ up to 12 × its own building level, limited by free residents at home. Each resident has one assignment. Workers shows assigned / free at Home / this building’s limit.'),
      note('A resident starts working after the 5-minute walk to work. The Town Hall, House, Chapel and Lighthouse have no employees.'),
      note('A recalled carrier finishes the delivery already in progress, then walks home for five minutes. Other released workers start their five-minute walk immediately. They become available again on arrival.'),
      note('Production per worker is 20, 24, 26, 28… units per hour by the workplace’s own level. Hunger halves production and transport immediately. Releasing a worker discards their unfinished unit.'))),
    el('div', { class: 'panel-grid workforce-grid' }, WORKPLACE_IDS.map(id => workplaceCard(id, true))),
    el('div', { class: 'workers-footer' }, button('Residents and happiness', () => openPanel('residents'), { class: 'action secondary' }), button('Open House', () => openPanel('building', 'house'), { class: 'action secondary', 'data-workers-house-link': '' })));
}
function residentsPanel(manageWorkers = false) {
  if (manageWorkers) return workerManagementPanel();
  const liveStat = (label, id, value) => stat(label, el('span', { 'data-population-stat': id }, value));
  return el('div', { class: 'residents-panel' }, note(residentsPurpose()), el('div', { class: 'stat-grid' }, liveStat('Town Hall level', 'level', state.buildings.townhall.level), liveStat('Residents', 'population', `${state.population} / ${state.capacity}`), liveStat('Assigned', 'workers', totalWorkers(state)), liveStat('Happiness', 'happiness', happinessText())),
    feedingPanel(),
    card(el('h3', {}, 'Workforce'),
      el('div', { class: 'stat-grid workforce-summary' }, liveStat('Available', 'free', freeWorkers(state)), liveStat('Returning home', 'returning', (state.returningWorkers || []).length), liveStat('Workplace limit', 'worker-limit', '12 × building level')),
      el('p', { class: 'returning-status', 'data-population-stat': 'next-return' }, returnDescription()),
      rules('Work and return rules',
        note('Each workplace can employ up to 12 × its own building level, limited by free residents at home. Each resident has one assignment. Workers shows assigned / free at Home / this building’s limit.'),
        note('A released worker takes 5 minutes to return home. During that time they are unavailable and do not work. You can assign them again after they return.'),
        note('Production per worker is 20, 24, 26, 28… units per hour by the workplace’s own level. Hunger halves production and transport immediately. Releasing a worker discards their unfinished unit.'),
        note('A resident starts working after the 5-minute walk to work. The Town Hall, House, Chapel and Lighthouse have no employees.'))),
    manageWorkers ? null : button('Open House', () => openPanel('building', 'house'), { class: 'action secondary', 'data-workers-house-link': '' }),
    el('div', { class: 'panel-grid workforce-grid' }, WORKPLACE_IDS.map(id => manageWorkers ? workplaceCard(id, true) : workplaceOverviewCard(id))),
    card(el('h3', {}, 'Happiness — population average'),
      note('Every resident keeps their own happiness, from −100% to +100%. The island value is the average of individual values. Percentages are displayed rounded up to whole numbers; partial hours are still counted precisely.'),
      individualHappinessRules(),
      note('A blocked producer gives its assigned workers −10 happiness, with another −10 every 24 hours, down to −50 from this penalty. The blockage resets on release; the population average uses each resident’s own happiness.'),
      el('div', { 'data-happiness-breakdown': '' }, happinessBreakdown()),
      residentRoster()),
    card(el('h3', {}, 'Town Hall and housing'),
      el('div', { class: 'stat-grid housing-stats' }, liveStat('Town Hall capacity', 'capacity', state.capacity), liveStat('Housing', 'housing', housingCapacity(state)), liveStat('Unhoused', 'unhoused', unhousedResidents(state)), liveStat('Happiness impact', 'penalty', housingPenaltyText())),
      housingNotice(), note('Population capacity = 24 × Town Hall level. Housing = 24 × House level. Population can exceed housing, up to the Town Hall capacity.'),
      note('Each unhoused resident lowers happiness by 1 percentage point per real hour. For example, 78 residents with 72 beds lose 6 points per hour. A House upgrade stops further penalties once there is enough housing; it does not restore lost happiness.'),
      button('Upgrade House', () => openPanel('building', 'house')), button('Upgrade Town Hall', () => openPanel('building', 'townhall'), { class: 'action secondary' })),
    card(el('h3', {}, 'Population growth'), el('p', { class: 'population-growth', 'data-population-stat': 'growth' }, populationDescription()),
      note('At 0% happiness, population stays the same. Positive happiness attracts new residents; negative happiness causes departures. At least 6 residents always remain.'),
      el('div', { class: 'population-rate-table' }, ...[['Happiness', 'Change of 1 resident'], ['±25%', 'every 12 h'], ['±50%', 'every 6 h'], ['±75%', 'about every 1 h 43 min'], ['±100%', 'every 1 h']].map(([label, value]) => el('div', {}, el('span', {}, label), el('strong', {}, value)))),
      note('Hours mean real elapsed time. Production, feeding, happiness, population and all delivery/building timers continue while the game is closed.'),
      note('Food, employment and overcrowding change individual happiness over time. The next population change is estimated using the current population average.')),
    el('p', { class: 'notice', 'data-lighthouse-bonus': '' }, lighthouseDescription()), note('Attractions grant temporary happiness to selected residents. Upgraded paths improve transport. Chapel and Lighthouse bonuses last for a limited time.'));
}
function workplaceOverviewCard(id) {
  return card(el('h3', {}, titleOf(id)), workerStat(id, true),
    button('View building', () => openPanel('building', id), { class: 'action secondary' }));
}

function workplaceCard(id, bulk = false) {
  const building = state.buildings[id];
  const content = card(el('h3', {}, titleOf(id)),
    !workplaceUnlocked(state, id) ? note(`Available from Town Hall level ${id === 'market' ? 2 : 4}.`) : null,
    workerStat(id),
    el('p', { 'data-full-penalty': id, class: 'full-storage-status' }, fullPenaltyDescription(id)));
  if (bulk) content.append(el('div', { class: 'workforce-actions workforce-bulk-actions' },
    button('Assign to limit', () => adjustWorkforce(id, 'max'), { class: 'action secondary', disabled: freeWorkers(state) <= 0 || building.workers >= workerLimit(state, id), 'data-worker-building': id, 'data-worker-action': 'max', 'aria-label': `Assign to limit: ${titleOf(id)}` }),
    button('Release all', () => adjustWorkforce(id, 'clear'), { class: 'action secondary', disabled: !building.workers, 'data-worker-building': id, 'data-worker-action': 'clear', 'aria-label': `Release all: ${titleOf(id)}` })));
  content.dataset.workplace = id;
  if (bulk) content.classList.add('workers-workplace');
  return content;
}
function adjustWorkforce(id, action) {
  settleActiveTick();
  const building = state.buildings[id];
  const delta = action === 'clear' ? -building.workers : Math.min(freeWorkers(state), workerLimit(state, id) - building.workers);
  if (delta) perform({ type: 'assign', building: id, delta });
}
function activeEffectsPanel() {
  const node = card(el('h3', {}, 'Active bonuses and penalties'), el('div', { class: 'active-effects-list', 'data-active-effects': '' }));
  refreshActiveEffects(node);
  return node;
}
function refreshActiveEffects(root = dialog) {
  const rows = Effects.activeEffects(state);
  root.querySelectorAll('[data-active-effects]').forEach(node => {
    const opened = new Set([...node.querySelectorAll('details[open]')].map(item => item.dataset.effect));
    node.replaceChildren(...rows.map(effect => el('details', { class: `active-effect active-effect-${effect.polarity}`, 'data-effect': effect.id, open: opened.has(effect.id) },
      el('summary', { class: 'active-effect-line' }, el('strong', {}, effect.title), el('span', { class: 'effect-value' }, effect.effect), el('span', { class: 'effect-time' }, effect.remaining == null ? 'Ongoing' : durationText(effect.remaining)), el('span', { class: 'effect-info', 'aria-label': 'More information' }, 'i')),
      el('div', { class: 'active-effect-details' }, el('p', {}, effect.explain || effect.effect), el('p', {}, effect.scope), el('small', {}, effect.endCondition || 'Until the timer ends')))));
    if (!rows.length) node.append(el('p', { class: 'active-effects-empty' }, 'No active bonuses or penalties.'));
  });
}

function housingPenaltyText() {
  const unhoused = unhousedResidents(state);
  return unhoused ? `−${unhoused} percentage points/h` : '0 percentage points/h';
}
function housingDescription() {
  const unhoused = unhousedResidents(state);
  return unhoused ? `Overcrowding: ${unhoused} residents have no home. Happiness falls by ${unhoused} percentage points per real hour.` : `Everyone has a home: ${state.population} / ${housingCapacity(state)} spaces occupied. No overcrowding penalty.`;
}
function housingNotice() {
  return el('p', { class: 'notice housing-notice', 'data-housing-warning': '', 'data-overcrowded': String(unhousedResidents(state) > 0), 'data-population-stat': 'housing-status' }, housingDescription());
}
function populationGrowthRateText() {
  const rate = populationRate(state.happiness);
  if (rate > 0 && state.population >= state.capacity) return 'At population limit · 0/h';
  if (rate < 0 && state.population <= 6) return 'Minimum population · 0/h';
  if (!rate) return 'Stable · 0 residents/h';
  const amount = Math.abs(rate) < 0.01 ? '<0.01' : I18n.formatNumber(Math.abs(rate), language(), { maximumFractionDigits: 2 });
  return `${rate > 0 ? 'Growth' : 'Decline'} · ${rate > 0 ? '+' : '−'}${amount} residents/h`;
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
  return `${overcrowded ? 'Estimate at current happiness: ' : ''}${rate > 0 ? 'A new resident' : 'One resident leaves'} in ${time}.${overcrowded ? ' Overcrowding changes this rate.' : ''}`;
}
function tradePanel() {
  if (!workplaceUnlocked(state, 'dock')) return el('div', {}, note('The Harbor unlocks at Town Hall level 4.'), button('Market — barter goods', () => openPanel('market')), button('Upgrade Town Hall', () => openPanel('building', 'townhall'), { class: 'action secondary' }));
  const dock = state.dock || { stock: {}, orders: [] };
  const offers = MATERIAL_IDS.map(id => {
    const sell = Logistics.quoteTrade?.(state, { resource: id, amount: 100, direction: 'sell' });
    const buy = Logistics.quoteTrade?.(state, { resource: id, amount: 100, direction: 'buy' });
    const base = ['food', 'planks'].includes(id) ? [140, 150] : [40, 50];
    return card(el('h3', {}, nameOf(id)), el('p', {}, `Central: ${count(state.resources[id])} · Harbor: ${count(dock.stock?.[id])}`),
      button(`Sell 100 → ${count(sell?.price ?? base[0])} coins`, () => perform({ type: 'trade', resource: id, amount: 100, direction: 'sell' }), { disabled: sell?.ok === false }),
      button(`Buy 100 for ${count(buy?.price ?? base[1])} coins`, () => perform({ type: 'trade', resource: id, amount: 100, direction: 'buy' }), { class: 'action secondary', disabled: buy?.ok === false }));
  });
  return el('div', {}, note('Orders use full lots of 100. Purchase prices are frozen when ordered. Consecutive purchases within 3 hours increase the base price linearly. Every voyage takes 5 minutes; Harbor workers handle both transport stages.'),
    el('div', { class: 'stat-grid' }, stat('Harbor stock', `${count(Logistics.dockUsed?.(state) || 0)} / ${count(Logistics.dockCapacity?.(state)?.total || Logistics.dockCapacity?.(state) || 4000)}`), stat('Carriers', transportRate('dock'))),
    button('Open Market — goods for goods', () => openPanel('market'), { class: 'action secondary' }),
    el('div', { class: 'panel-grid' }, offers),
    el('h3', {}, 'Shipping orders'),
    ...(dock.orders || []).filter(order => order.stage !== 'complete').map(order => card(el('h3', {}, `${order.direction === 'buy' ? 'Purchase' : 'Sale'}: ${count(order.amount)} ${nameOf(order.resource)}`),
      el('p', {}, `Stage: ${order.stage} · agreed price ${count(order.price)} coins${order.remaining > 0 ? ` · ${durationText(order.remaining)}` : ''}`),
      ...['dockInbound', 'dockLoad', 'dockUnload', 'dockOutbound'].map(route => premiumTransportButton({ route, order: order.id })))),
    !(dock.orders || []).some(order => order.stage !== 'complete') ? note('No active shipping orders.') : null);
}

function fullPenaltyDescription(id) {
  const penalty = storagePenalty(state, id);
  return penalty ? `Storage full: −${penalty} happiness for each worker here. Work is waiting for space.` : 'No full-storage penalty.';
}
function happinessBreakdown() {
  return happinessGroups(state).map(group => el('div', { class: 'happiness-row' },
    el('span', {}, group.building ? titleOf(group.building) : 'Available and returning'),
    el('strong', {}, `${group.count} ${group.count === 1 ? 'resident' : 'residents'} · ${happinessPercent(group.happiness)}`)));
}
function individualHappinessRules() {
  const rows = [
    ['Fed and employed', '+2 pp/h'],
    ['Fed, unemployed for up to 12 h', '+1 pp/h'],
    ['Fed, unemployed for more than 12 h', '−4 pp/h'],
    ['Hungry for up to 12 h, employed', '+1 pp/h'],
    ['Hungry for more than 12 h, employed', '−4 pp/h'],
    ['Hungry and unemployed, both for more than 12 h', '−10 pp/h']
  ];
  return rules('Individual happiness rules',
    note('Eating adds +1 point per hour and employment adds another +1. Each continuous lack of food or work has its own 12-hour grace period, followed by a −5 point/hour penalty. Eating or starting a job resets the corresponding timer. Returning home counts as unemployment.'),
    el('table', { class: 'happiness-rules-table' },
      el('caption', {}, 'Hourly changes before housing, storage and temporary bonuses'),
      el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Resident state'), el('th', { scope: 'col' }, 'Change'))),
      el('tbody', {}, rows.map(([label, value]) => el('tr', {}, el('th', { scope: 'row' }, label), el('td', {}, value))))),
    note('Hunger immediately halves production and transport, even during the grace period. Timers continue offline.'));
}
function residentRoster() {
  const details = el('details', { class: 'island-rules resident-roster', 'data-resident-roster': '' },
    el('summary', {}, 'Individual residents (', el('span', { 'data-resident-count': '' }, state.residents.length), ')'),
    el('ul', { class: 'resident-happiness-list', 'data-resident-list': '', 'aria-label': 'Individual resident happiness' }));
  details.addEventListener('toggle', () => { if (details.open) refreshResidentRosters(); });
  return details;
}
function residentRow(resident) {
  return el('li', { class: 'resident-happiness-row', 'data-resident-id': resident.id },
    el('div', { class: 'resident-summary' }, el('strong', {}, `Resident #${resident.id}`), el('strong', { 'data-resident-value': '' })),
    el('div', { class: 'resident-status' }, el('span', { 'data-resident-job': '' }), el('span', { 'data-resident-rate': '' })),
    el('small', { 'data-resident-timers': '' }));
}
function refreshResidentRosters() {
  dialog.querySelectorAll('[data-resident-roster]').forEach(details => {
    details.querySelector('[data-resident-count]').textContent = state.residents.length;
    if (!details.open) return;
    const residents = new Map(state.residents.map(resident => [String(resident.id), resident]));
    const list = details.querySelector('[data-resident-list]');
    const signature = state.residents.map(resident => resident.id).join(',');
    if (list.dataset.residentSignature !== signature) {
      list.replaceChildren(...state.residents.map(residentRow));
      list.dataset.residentSignature = signature;
    }
    list.querySelectorAll('[data-resident-id]').forEach(row => {
      const resident = residents.get(row.dataset.residentId);
      const value = residentHappiness(state, resident);
      const rate = residentHappinessRate(state, resident);
      const roundedRate = roundUpHappiness(rate);
      row.querySelector('[data-resident-value]').textContent = happinessPercent(value);
      row.querySelector('[data-resident-job]').textContent = resident.visitGroup ? 'Visiting the Lighthouse' : resident.arrivalRemaining > 0 ? `Walking to ${titleOf(resident.workplace)} · ${durationText(resident.arrivalRemaining)}` : resident.workplace ? titleOf(resident.workplace) : resident.returnRemaining > 0 ? `Returning home · ${durationText(resident.returnRemaining)}` : 'At home';
      row.querySelector('[data-resident-rate]').textContent = `${roundedRate > 0 ? '+' : roundedRate < 0 ? '−' : ''}${Math.abs(roundedRate)} pp/h`;
      row.querySelector('[data-resident-timers]').textContent = `${resident.newbornRemaining > 0 ? `Newborn: 0% for ${durationText(resident.newbornRemaining)} · ` : ''}${hasFoodForResidents(state) ? 'Fed' : `Hungry for ${durationText(resident.hungerSeconds)}`} · ${resident.workplace ? 'Assigned' : resident.visitGroup ? 'Visit in progress' : `Without work for ${durationText(resident.unemployedSeconds)}`}${resident.visitCooldownRemaining > 0 ? ` · Next visit in ${durationText(resident.visitCooldownRemaining)}` : ''}${resident.visitHappinessRemaining > 0 ? ` · 100% bonus: ${durationText(resident.visitHappinessRemaining)}` : ''}`;
    });
  });
}
function blessingDescription() {
  const automatic = state.chapelRemaining > 0 ? `Upgrade bonus: ${durationText(state.chapelRemaining)} remaining, +${state.buildings.chapel.level * 10} happiness.` : 'No active upgrade bonus.';
  const manual = state.blessingRemaining > 0 ? `Blessing: +20 happiness for ${durationText(state.blessingRemaining)}.` : `Uses remaining: ${Math.max(0, state.buildings.chapel.level - state.blessingsUsed)}.`;
  return `${automatic} ${manual}${state.paidBlessingCooldownRemaining > 0 ? ` Next paid blessing in ${durationText(state.paidBlessingCooldownRemaining)}.` : ''}`;
}
function blessingPanel() {
  return card(el('h3', {}, 'Chapel and blessings'),
    note('Completing a Chapel upgrade gives everyone +10 happiness per new level for 10 hours. Level 1 has no passive bonus.'),
    el('p', { 'data-chapel-time': '', class: 'notice' }, blessingDescription()),
    note('A manual blessing grants +50 of every resource and +20 happiness to everyone for one hour. The Chapel level determines the total number of one-time uses. Only one manual blessing can be active at a time.'),
    button('Activate free blessing', () => perform({ type: 'blessing' }), { disabled: state.blessingRemaining > 0 || state.blessingsUsed >= state.buildings.chapel.level, 'data-blessing': '' }),
    button(`Paid blessing · ${count(100 * state.buildings.chapel.level)} coins`, () => perform({ type: 'paidBlessing' }), { class: 'action secondary', disabled: state.blessingRemaining > 0 || state.resources.coins < 100 * state.buildings.chapel.level || (state.paidBlessingCooldownRemaining || 0) > 0, 'data-paid-blessing': '' }),
    note('A paid blessing costs 100 × Chapel level coins and has the same effect. Its 4-hour cooldown starts when the blessing ends; active blessings cannot overlap.'));
}
function marketPanel() {
  if (!workplaceUnlocked(state, 'market')) return note('The Market unlocks at Town Hall level 2.');
  const rows = MATERIAL_IDS.map(id => card(el('h3', {}, nameOf(id)),
    el('div', { class: 'stat-grid' }, stat('Available at Market', el('span', { 'data-market-stock': id }, count(state.market.stock[id]))), stat('Locked for one hour', el('span', { 'data-market-locked': id }, count(state.market.locked.filter(lot => lot.resource === id).reduce((sum, lot) => sum + lot.amount, 0))))),
    button('Bring 10 to Market', () => perform({ type: 'marketOrder', resource: id, amount: 10 }), { class: 'action secondary', 'data-market-order': id }),
    button('Return goods to Warehouse', () => perform({ type: 'marketDispatch', resource: id, amount: Math.max(0, state.market.stock[id] - (state.market.dispatch?.[id] || 0)) }), { class: 'action secondary', 'data-market-dispatch': id }),
    premiumTransportButton({ route: 'marketOutbound', resource: id, amount: Math.max(0, state.market.stock[id] - (state.market.dispatch?.[id] || 0)) })));
  const from = el('select', { id: 'market-from', 'aria-label': 'Goods offered' }, MATERIAL_IDS.map(id => el('option', { value: id }, nameOf(id))));
  const to = el('select', { id: 'market-to', 'aria-label': 'Goods received' }, MATERIAL_IDS.map(id => el('option', { value: id, selected: id === 'stone' }, nameOf(id))));
  const quantity = el('input', { id: 'market-quantity', type: 'number', min: '10', step: '10', value: '10', 'aria-label': 'Quantity to exchange' });
  return el('div', {}, el('h3', {}, 'Market — barter without coins'),
    note('Raw materials: Wood, Stone, Grain. Processed goods: Planks, Food. Exchange within one category at 1:1 before the 10% fee: 10 units yield 9. There is no limit on the number of exchanges.'),
    el('div', { class: 'stat-grid' }, stat('Storage used', el('strong', { 'data-market-used': '' }, `${count(marketUsed(state))} / ${count(marketCapacity(state))}`)), stat('Delivery to Market', el('span', { 'data-logistics-stat': 'market-rate' }, transportRate('market')))),
    el('p', { class: 'notice', 'data-market-timer': '' }, state.market.locked.length ? durationText(Math.min(...state.market.locked.map(lot => lot.remaining))) : 'No locked goods'),
    note('Market workers carry goods in both directions. Arrivals are locked for one hour and expire after 24 hours. Exchanged goods receive a fresh 24-hour deadline. Request a return delivery to bring goods back to central storage.'),
    card(el('h3', {}, 'Exchange goods'), el('div', { class: 'market-exchange-fields' }, from, to, quantity), button('Exchange — 10% fee', () => perform({ type: 'marketExchange', from: from.value, to: to.value, amount: Number(quantity.value) }), { 'data-market-exchange': '' })),
    ...(state.market.orders || []).map(order => card(el('h3', {}, `Delivery to Market: ${nameOf(order.resource)}`), el('p', {}, `${count(order.amount)} remaining`), premiumTransportButton({ route: 'marketInbound', resource: order.resource }))),
    el('div', { class: 'panel-grid' }, rows));
}
function visibleNotifications() {
  return state.notifications.filter(item => state.settings.notificationCategories?.[notificationCategory(item)] !== false).map(item => ({ ...item, title: omitTaxInformation(item.title), message: omitTaxInformation(item.message) })).filter(item => item.title || item.message);
}
function omitTaxInformation(text = '') {
  const value = String(text)
    .replace(/\s+and\s+doubles?\s+taxes\s+for\s+(\d+\s+hours?)/gi, ' for $1')
    .replace(/\s*(?:,?\s*and\s+)?taxes\s*×\s*2/gi, '');
  return value.split(/(?<=[.!?])\s+/).filter(sentence => !/\btax(?:es)?\b/i.test(sentence)).join(' ').replace(/\s{2,}/g, ' ').trim();
}

function notificationsPanel() {
  return el('div', {}, ...(Activities.pendingTaskAchievements?.(state) || []).map(achievement => card(el('h3', {}, achievement.title), note('Your task reward is already received. Choose Share for the prototype 500-coin bonus or Skip.'), button('Review sharing reward', () => showTaskCelebration(achievement)))), button('Mark all as read', () => perform({ type: 'readNotifications' }), { class: 'action secondary' }),
    visibleNotifications().length ? visibleNotifications().map(item => card(el('h3', {}, item.title), el('p', {}, item.message), el('small', {}, item.read ? 'Read' : 'New'))) : note('No notifications. Bonuses, penalties and storage alerts will appear here.'));
}
function quoteCoins(quote) { return Number(quote?.coins ?? quote?.price ?? quote?.totalCoins ?? NaN); }
function quotedButton(label, quoteFn, action, attrs = {}) {
  const node = button(label, () => perform(typeof action === 'function' ? action() : action), attrs);
  node._quoted = { label, quoteFn };
  refreshQuoteButton(node);
  return node;
}
function refreshQuoteButton(node) {
  const { label, quoteFn } = node._quoted;
  let quote;
  try { quote = quoteFn(); } catch { quote = { ok: false, message: 'This option is not available yet.' }; }
  const coins = quoteCoins(quote);
  node.textContent = Number.isFinite(coins) ? `${label} · ${count(coins)} coins` : label;
  node.disabled = !quote || quote.ok === false || !Number.isFinite(coins) || state.resources.coins < coins;
  node.title = quote?.message || (state.resources.coins < coins ? 'Not enough coins.' : '');
}
function premiumTransportButton(action) {
  const labels = { producer: 'Deliver local stock now', construction: 'Deliver building materials now', marketInbound: 'Bring goods to Market now', marketOutbound: 'Return Market goods now', dockInbound: 'Deliver to Harbor now', dockLoad: 'Load ship now', dockOutbound: 'Bring Harbor goods home now', dockUnload: 'Unload ship now' };
  return quotedButton(labels[action.route] || 'Instant transport', () => Activities.quoteTransport?.(state, action), { type: 'premiumTransport', ...action }, { class: 'action secondary', 'data-premium-route': action.route });
}
function refreshUpgradeEstimate(node, id) {
  const project = state.buildings[id].construction || state.buildings[id].premiumService;
  const estimate = scheduledConstructionEstimate(id, project || buildingCost(state, id));
  const total = project?.stage === 'building' ? project.buildRemaining : estimate?.total;
  node.querySelector('[data-estimate-total]').textContent = Number.isFinite(total) ? durationText(total) : estimate?.reason ? 'Estimate unavailable' : 'Waiting for carriers';
  node.querySelector('[data-estimate-breakdown]').textContent = Number.isFinite(total) ? `Transport ${durationText(project?.stage === 'building' ? 0 : estimate.transport)} + building ${durationText(project?.stage === 'building' ? project.buildRemaining : estimate.building)}` : estimate?.reason || 'Assign warehouse carriers to calculate the time.';
}
function upgradeEstimateView(id) {
  const node = el('div', { class: 'upgrade-total-estimate', 'data-upgrade-estimate': id }, el('small', {}, 'Estimated transport + building'), el('strong', { 'data-estimate-total': '' }), el('small', { 'data-estimate-breakdown': '' }));
  refreshUpgradeEstimate(node, id);
  return node;
}
function refreshProducerUpgradeTimes(node, id) {
  const project = state.buildings[id].construction || state.buildings[id].premiumService;
  const estimate = scheduledConstructionEstimate(id, project || buildingCost(state, id));
  const transport = project?.stage === 'building' ? 0 : estimate?.transport;
  const construction = project?.stage === 'building' ? project.buildRemaining : estimate?.building;
  const reason = estimate?.reason || 'Assign warehouse carriers to estimate delivery and building time.';
  const unavailable = reason.includes('Town Hall') ? 'Upgrade Town Hall first' : reason.includes('warehouse carriers') || reason.startsWith('Assign warehouse') ? 'Waiting for carriers' : 'Estimate unavailable';
  for (const [selector, seconds] of [['[data-upgrade-delivery-time]', transport], ['[data-upgrade-build-time]', construction]]) {
    const value = node.querySelector(selector);
    value.textContent = Number.isFinite(seconds) ? durationText(seconds) : unavailable;
    value.title = Number.isFinite(seconds) ? '' : reason;
  }
}
function producerUpgradeTimes(id) {
  const node = el('div', { class: 'producer-upgrade-times', 'data-producer-upgrade-times': id, 'aria-label': 'Estimated delivery and building time' },
    el('div', {}, el('small', {}, 'Delivery'), el('strong', { 'data-upgrade-delivery-time': id })),
    el('div', {}, el('small', {}, 'Building'), el('strong', { 'data-upgrade-build-time': id })));
  refreshProducerUpgradeTimes(node, id);
  return node;
}
function producerPremiumFrame(id) {
  return el('div', { class: 'producer-premium-frame', 'data-producer-premium': id, 'aria-label': 'Premium building actions' },
    el('span', { class: 'producer-premium-label' }, 'Premium'),
    el('div', { class: 'producer-premium-buttons' },
      quotedButton('Buy building package', () => Activities.quotePremiumBuilding?.(state, id, { buildingCost }), { type: 'premiumBuyBuilding', building: id }, { 'data-premium-buy': id }),
      premiumTransportButton({ route: 'producer', building: id })));
}
function premiumInformationParagraphs() {
  return [
    'Coins earned in the game and purchased coins are the same currency. 1 PLN = 10 coins. No real payment service is connected.',
    'Instant transport and buying a building without materials unlock at Town Hall level 4.',
    'The building package includes every material at the base Harbor purchase rate +25%, the building’s coin cost and instant transport. Existing goods remain in storage. No carriers are needed; a full purchase finishes in 10 seconds.',
    'The time estimate uses the current warehouse crew, its efficiency, waiting goods, active deliveries and selected priorities. It assumes the required materials are ready. Gathering materials, queue waiting and earlier upgrades are excluded. Changing staffing, feeding or priorities updates the estimate.'
  ];
}
function appendProjectPremiumControls(content, id) {
  const project = state.buildings[id].construction || state.buildings[id].premiumService;
  if (project) {
    const progress = el('div', { class: 'upgrade-project-controls' }, el('p', { 'data-project-status': project.order }, projectDescription(project)), projectDeliveryView(project));
    if (project.stage === 'building' && !project.premiumService) progress.append(el('div', { class: 'premium-options' }, [25, 50, 75, 100].map(percent => quotedButton(percent === 100 ? 'Finish construction now' : `Shorten building time by ${percent}%`, () => Activities.quoteAcceleration?.(state, project.order, percent), { type: 'premiumAccelerate', project: project.order, percent }, { class: 'action secondary', 'data-premium-percent': percent }))));
    if (project.stage === 'transport') progress.append(premiumTransportButton({ route: 'construction', project: project.order }));
    content.append(progress);
  }
  if (premiumActive(state) && !canAfford(state, buildingCost(state, id))) content.append(quotedButton('Schedule expected deliveries', () => Activities.quoteForecastPlan?.(state, id, { buildingCost }), { type: 'forecastPlan', building: id }, { class: 'action secondary', 'data-premium-forecast': id }));
}
function premiumBuildingPanel(id) {
  const content = card(informationHeading(`premium-${id}`, 'Premium building options', ...premiumInformationParagraphs()));
  content.classList.add('premium-building-panel');
  const actions = el('div', { class: 'upgrade-premium-buttons' }, quotedButton('Buy building package', () => Activities.quotePremiumBuilding?.(state, id, { buildingCost }), { type: 'premiumBuyBuilding', building: id }, { 'data-premium-buy': id }));
  if (PRODUCTION_RECIPES[id]) actions.append(premiumTransportButton({ route: 'producer', building: id }));
  content.append(el('div', { class: 'upgrade-action-estimate-row' }, actions, upgradeEstimateView(id)));
  appendProjectPremiumControls(content, id);
  return content;
}
function projectDeliveryView(project) {
  return el('div', { class: 'project-materials', 'data-project-materials': project.order, 'aria-label': 'Delivered materials compared with required materials' }, MATERIAL_IDS.filter(id => project.cost?.[id]).map(id => el('div', { class: 'upgrade-cost-row' },
    el('span', {}, nameOf(id)), el('strong', { 'data-project-delivery': project.order, 'data-delivery-resource': id }, `${count(project.delivered?.[id] || 0)} / ${count(project.cost[id])}`))));
}
function premiumPanel() {
  return el('div', {}, note('Premium uses coins earned through island activity, trade and expedition rewards. 1 PLN = 10 coins. Real-money purchases are not connected.'),
    el('div', { class: 'stat-grid' }, stat('Treasury', `${count(state.resources.coins)} coins`), stat('Construction package', premiumActive(state) ? 'Active' : 'Not active')),
    note('Building acceleration charges 1 coin per full minute saved, with a minimum of 5 coins. Choose 25%, 50%, 75% or instant completion. The current quoted price is shown before you choose.'),
    note('Instant transport costs 10 coins per necessary trip, including a partial last trip. Each material and each Harbor transport stage is priced separately.'),
    el('div', { class: 'panel-grid' }, Object.keys(BUILDINGS).map(id => card(el('h3', {}, titleOf(id)), button('Building options', () => openPanel('building', id), { class: 'action secondary' })))),
    card(el('h3', {}, 'Construction package'), note(`24 hours for ${count(1000 * state.buildings.townhall.level)} coins: +4 active construction places, unlimited queue and planning from forecast deliveries. Renewing adds another 24 hours to the remaining duration. Queued material costs include a 10% surcharge.`), quotedButton(premiumActive(state) ? 'Extend package by 24 h' : 'Activate package for 24 h', () => Activities.quoteConstructionPackage?.(state), { type: 'purchaseConstructionPackage' }, { 'data-construction-package': '' })),
    card(el('h3', {}, 'Community rewards'), note('Sharing milestones and referrals will offer coin and material rewards. Reward verification and platform connections are being finalized.')));
}
function taskId(task) { return String(task.id); }
function statusOfTask(task) {
  return Activities.taskStatus?.(state, task) || { remaining: Math.max(0, task.expiresAt - (state.activityClock || 0)), multiplier: task.multiplier || 1 };
}
function rewardForTask(task) { const preview = task.acceptedAt == null ? { ...task, multiplier: statusOfTask(task).multiplier } : task; return Activities.taskReward?.(preview) || task.reward; }
function taskIsActive(task) { return state.activeTaskId === task.id || statusOfTask(task).active === true; }
function taskActionLabel(task) {
  if (taskIsActive(task)) return `Active · bonus ×${task.multiplier}`;
  return task.acceptedAt == null ? `Start task · reward ×${statusOfTask(task).multiplier || 1}` : `Resume task · bonus ×${task.multiplier}`;
}
function taskCard(task, compact = false) {
  const status = statusOfTask(task), id = taskId(task), active = taskIsActive(task);
  const inactive = !!state.activeTaskId && !active;
  const content = el('section', { class: `${compact ? 'activity-task' : 'info-card task-card'}${active ? ' is-active-task' : ''}${inactive ? ' is-inactive-task' : ''}`, 'data-task': id, 'data-task-active': String(active), 'data-task-inactive': String(inactive) },
    el('div', { class: 'task-card-heading' }, el('span', { class: `task-size task-size-${task.size}` }, ({ small: 'Small', medium: 'Medium', large: 'Large' })[task.size] || task.size), active ? el('span', { class: 'task-active-label', 'data-task-active-label': id }, 'Active') : null, el('span', { class: 'task-countdown', 'data-task-countdown': id }, durationText(status.remaining))),
    el(compact ? 'h4' : 'h3', {}, task.title),
    el('p', { class: 'task-reward', 'data-task-reward': id }, `Reward: ${costText(rewardForTask(task))}`));
  if (compact) {
    if (active) content.append(el('div', { class: 'task-compact-progress' }, Object.entries(task.requirements || {}).map(([resource, required]) => el('div', {}, el('span', {}, nameOf(resource)), el('strong', { 'data-task-progress': id, 'data-task-resource': resource }, `${count(task.deposited?.[resource] || 0)} / ${count(required)}`)))));
    content.append(button(active ? 'Active · deliver goods' : status.canActivate ? taskActionLabel(task) : 'View task', () => { if (!taskIsActive(task) && statusOfTask(task).canActivate) openTaskAcceptance(task); else openPanel('tasks'); }, { class: `activity-task-button${inactive ? ' inactive-task-view' : ''}`, 'data-task-open': id, 'data-task-start-disabled': String(inactive) }));
  } else {
    content.append(button(taskActionLabel(task), () => openTaskAcceptance(task), { disabled: active || !status.canActivate, 'data-task-accept': id }));
    for (const [resource, required] of Object.entries(task.requirements || {})) {
      const delivered = task.deposited?.[resource] || 0;
      const quantity = el('input', { type: 'number', min: '1', step: '1', value: String(Math.max(1, Math.min(required - delivered, Math.floor(spendable(resource))))), disabled: !active, 'aria-label': `${nameOf(resource)} contribution for ${task.title}`, 'data-task-input': `${id}-${resource}` });
      content.append(el('div', { class: 'task-deposit-row' }, el('div', {}, el('strong', {}, nameOf(resource)), el('span', { 'data-task-progress': id, 'data-task-resource': resource }, `${count(delivered)} / ${count(required)}`)), quantity,
        button('Donate', () => perform({ type: 'taskDeposit', task: task.id, resource, amount: Number(quantity.value) }), { class: 'action secondary', disabled: !active || delivered >= required || spendable(resource) < 1, 'data-task-deposit': `${id}-${resource}` })));
    }
    content.append(note(active ? 'Donated goods cannot be withdrawn. Complete every requirement before the deadline to receive the displayed reward.' : state.activeTaskId ? 'Finish the active task before starting another one.' : 'Start this task to begin donating goods. Only one task can be active.'));
  }
  return content;
}
const activityStack = el('aside', { class: 'island-activity-stack', 'aria-label': 'Current Lighthouse tasks and expeditions' });
layer.append(activityStack);
for (const id of ['objective-title', 'objective-repair', 'objective-wood', 'objective-stone', 'expedition-preview', 'expedition-start']) document.getElementById(`hit-${id}`)?.remove();
function renderActivityStack() {
  const tasks = state.lighthouseTasks || [];
  const signature = JSON.stringify([state.activeTaskId, tasks.map(t => [t.id, t.acceptedAt, t.multiplier, t.deposited, statusOfTask(t).multiplier])]);
  if (activitySignature !== signature || !activityStack.firstChild) {
    activitySignature = signature;
    activityStack.replaceChildren(el('div', { class: 'activity-section-heading' }, el('h3', {}, 'Current tasks'), button('All', () => openPanel('tasks'), { class: 'activity-link', 'aria-label': 'Open all Lighthouse tasks' })),
      ...tasks.slice(0, 3).map(task => taskCard(task, true)),
      el('div', { class: 'activity-section-heading' }, el('h3', {}, 'Expeditions'), button('Explore', () => openPanel('expeditions'), { class: 'activity-link' })),
      button('Draw a minigame', () => startExpedition(expeditionSession()?.expedition || EXPEDITIONS[0].id), { class: 'activity-expedition' }),
      button('Lighthouse', () => openPanel('building', 'lighthouse'), { class: 'activity-lighthouse' }));
  }
  activityStack.querySelectorAll('[data-task-countdown]').forEach(node => { const task = tasks.find(t => taskId(t) === node.dataset.taskCountdown); if (task) node.textContent = durationText(statusOfTask(task).remaining); });
}
function houseHappinessPanel() {
  const pool = state.houseHappinessPool;
  if (!pool) return card(el('h3', {}, 'House happiness'), note('The House’s daily happiness pool is being prepared.'));
  const person = el('select', { 'aria-label': 'Resident to receive House happiness' }, state.residents.filter(resident => !(resident.newbornRemaining > 0) && residentHappiness(state, resident) < 100).map(resident => el('option', { value: resident.id }, `Resident #${resident.id} · ${happinessPercent(residentHappiness(state, resident))}`)));
  const amount = el('input', { type: 'number', min: '1', step: '1', value: '1', 'aria-label': 'House happiness points to allocate' });
  return card(informationHeading('house-happiness', 'House happiness',
    'The House receives a daily pool of one point per resident. You can allocate whole points to an individual or give everyone one point. These are normal happiness additions; hunger, unemployment and other penalties still apply. Newborn residents and residents currently fixed at 100% cannot receive points.',
    'Two minutes before the next pool, leftover whole points go one at a time to the least happy residents, with random selection among ties.'),
    el('div', { class: 'stat-grid' }, stat('Points remaining', el('span', { 'data-house-pool': 'points' }, count(pool.points))), stat('Next pool', el('span', { 'data-house-pool': 'refresh' }, durationText(pool.refreshRemaining)))),
    el('div', { class: 'pool-actions' }, person, amount, button('Give points', () => perform({ type: 'houseHappiness', residentId: Number(person.value), amount: Number(amount.value) }), { disabled: pool.points < 1 || !person.options.length, 'data-house-allocate': '' })),
    button('Give everyone +1 pp', () => perform({ type: 'houseHappinessAll', amount: 1 }), { class: 'action secondary', disabled: !person.options.length || pool.points < person.options.length, 'data-house-everyone': '' }));
}
function visitsPanel() {
  if (!state.buildings.lighthouse.level) return card(el('h3', {}, 'Lighthouse visits'), note('Restore the Lighthouse to welcome visitors.'));
  const capacity = Residents.visitCapacity?.(state) ?? state.buildings.lighthouse.level * 2;
  const occupied = Residents.visitOccupancy?.(state) ?? (state.lighthouseVisits || []).reduce((sum, group) => sum + group.residentIds.length, 0);
  const choices = state.residents.filter(person => Residents.canVisitLighthouse?.(state, person));
  const selection = new Set();
  const quota = Residents.visitQuota?.(state);
  const packageQuote = Residents.visitPackageQuote?.(state);
  const content = card(el('h3', {}, 'Lighthouse visits'),
    el('div', { class: 'stat-grid' }, stat('Places occupied', `${occupied} / ${capacity}`), stat('Available at home', choices.length)),
    note('Visits last 4 hours, with no travel time and no early return. Rewards start when the group returns home: each visitor has 100% happiness for 24 hours and must wait those 24 hours before another visit. Each returning group adds +10 pp to everyone for 6 hours; separate groups stack.'));
  const list = el('div', { class: 'visit-resident-picker' });
  for (const person of choices) {
    const input = el('input', { type: 'checkbox', value: person.id, 'aria-label': `Send resident ${person.id} to Lighthouse`, onchange: event => {
      if (event.target.checked) selection.add(person.id); else selection.delete(person.id);
      summary.textContent = `${selection.size} selected / ${Math.max(0, capacity - occupied)} free places`;
    } });
    list.append(el('label', {}, input, el('span', {}, `Resident #${person.id}`), el('strong', {}, happinessPercent(residentHappiness(state, person)))));
  }
  const summary = el('p', { class: 'visit-selection-summary' }, `0 selected / ${Math.max(0, capacity - occupied)} free places`);
  if (quota) content.append(note(`Rolling 24-hour entries: ${quota.freeRemaining} free + ${quota.paidRemaining} paid. Free entries: ${quota.limit} per 24 hours; ${quota.packagesRemaining} extra packages remain.`));
  if (packageQuote) content.append(quotedButton(`Buy visit package ${packageQuote.ordinal || ''}`, () => { const quote = Residents.visitPackageQuote?.(state); return quote ? { ...quote, coins: quote.cost } : quote; }, { type: 'buyVisitPackage' }, { class: 'action secondary', 'data-buy-visit-package': '' }));
  content.append(list, summary, button('Send selected residents', () => perform({ type: 'visitLighthouse', residentIds: [...selection] }), { disabled: !choices.length || occupied >= capacity, 'data-send-visit': '' }));
  for (const group of state.lighthouseVisits || []) content.append(el('p', { class: 'notice', 'data-visit-group': group.id }, `${group.residentIds.length} visitors return in ${durationText(group.remaining)}. This visit cannot be recalled.`));
  return content;
}
function tasksPanel() {
  return el('div', { 'data-task-list': (state.lighthouseTasks || []).map(taskId).join(',') }, note('You can work on one task at a time and donate goods directly from central storage, including in instalments. Donations cannot be withdrawn and are lost if the task expires. Each task has its own countdown; protected food reserves cannot be donated.'),
    button('Lighthouse — visits and upgrades', () => openPanel('building', 'lighthouse'), { class: 'action secondary' }),
    ...(state.lighthouseTasks || []).map(task => taskCard(task)));
}

function decorationsPanel() {
  const availability = Leisure.attractionAvailability?.(state);
  return el('div', {}, note('Five attractions are offered each day. Every offer reaches a random share of 1–50% of residents, limited by the number of eligible people. The price depends on the total happiness points awarded.'),
    note('Only one attraction can be active across the island. Its effect lasts six hours; the next attraction becomes available as soon as it ends.'),
    availability?.active ? note(`The next attraction is available in ${durationText(availability.nextAvailableIn || availability.remaining)}.`) : null,
    note('Buying the same attraction repeatedly grants 100%, 75%, 50%, 25%, then 0% of its original benefit. A 24-hour break restores its full benefit.'),
    button('View daily attractions', () => { closePanel(); setDockCategory('decorations'); }));
}

function pathsPanel() {
  const summary = Leisure.roadSummary(state);
  return el('div', {}, note('Upgrade 100 path sections through five levels. Each section upgrade costs 100 Stone and is immediate. All 100 sections must reach the previous level before you start the next.'),
    stat('Completed path level', summary.level), stat('Carrier speed bonus', `+${summary.speedPercent}%`), stat('Carrier load bonus', `+${summary.capacityPercent}%`),
    button('View path upgrades', () => { closePanel(); setDockCategory('paths'); }));
}

function effectiveAnimationsEnabled() { return !!state.settings.motion && (!matchMedia('(prefers-reduced-motion: reduce)').matches || state.settings.motionOverride === true); }
function settingsPanel() {
  const checkbox = (key, label) => el('label', { class: 'setting-row' }, el('span', {}, label), el('input', { type: 'checkbox', checked: key === 'motion' ? effectiveAnimationsEnabled() : !!state.settings[key], onchange: event => perform({ type: 'setting', key, value: event.target.checked }) }));
  const languageSelect = el('select', { 'aria-label': 'Language', onchange: event => { perform({ type: 'setting', key: 'language', value: event.target.value }); renderLeisureDock(true); localize(); renderMobileDock(true); } }, el('option', { value: 'en', selected: language() === 'en' }, 'English'), el('option', { value: 'pl', selected: language() === 'pl' }, 'Polski'));
  const ranking = state.ranking?.score ?? state.rankingScore ?? state.buildings.townhall.level * state.resources.coins;
  return el('div', {}, el('label', { class: 'setting-row' }, el('span', {}, 'Language'), languageSelect), notificationFilterSettings(), button('Tutorial', () => openPanel('tutorial'), { class: 'action secondary' }), checkbox('motion', 'Animations and highlights'),
    !effectiveAnimationsEnabled() ? note(state.settings.motion ? 'Animations are paused by your system’s reduced-motion preference. Enable the checkbox to turn on water, smoke and island movement.' : 'Animations are off. Enable the checkbox to turn on water, smoke and island movement.') : null,
    note('Your island continues in real time, including while you are away. Progress is saved in this browser.'),
    card(el('h3', {}, 'Ranking'), stat('Hourly score', count(ranking)), note('Town Hall level × coins, recorded on each full hour.')),
    button('Sign in or create an account', () => { location.href = authHref(location.search); }),
    button('Premium options', () => openPanel('premium'), { class: 'action secondary' }),
    button('Resume tutorial', () => { if (perform({ type: 'resumeTutorial' })) openPanel('tutorial'); }, { class: 'action secondary', 'data-resume-tutorial': '' }),
    button('Save now', () => { settleActiveTick(); save(); toast('Progress saved.'); }, { class: 'action secondary' }),
    button('Start a new island', () => openPanel('reset'), { class: 'action danger' }));
}

function timePanel() {
  return el('div', {}, stat('Island day', state.day), note('Island activity follows real elapsed time. Production, travel, transport, meals, happiness and construction continue offline.'), button('Town Hall', () => openPanel('building', 'townhall')));
}

function expeditionRun(id) { return state.expeditionRuns?.[id] || null; }
function expeditionsPanel() {
  const run = expeditionSession();
  return el('div', {}, note('Each round randomly chooses a marble maze or picture triples. Win up to 50 coins, cash out, or risk the whole unclaimed pot on the next round. The deadline ends the attempt and clears that pot.'),
    el('div', { class: 'panel-grid' },
      card(el('h3', {}, 'Marble maze'), note('Guide the marbles into their goals with the mouse or by tilting your phone. The first round lasts 3 minutes: 50 coins for the first 2 minutes, then 1 coin less every 15 seconds.')),
      card(el('h3', {}, 'Picture triples'), note('Reveal three identical black-and-white pictures to clear them. Boards grow with difficulty; later, hidden pictures move. Time limits grow from 4 to at most 15 minutes.'))),
    run?.status === 'decision' ? expeditionDecisionControls(run.expedition, run) : button(run ? 'Resume expedition' : 'Draw a minigame', () => startExpedition(run?.expedition || EXPEDITIONS[0].id), { 'data-expedition-start': '' }),
    run ? stat('Current pot', `${count(run.pot)} coins`) : null);
}
function miniGamePanel(run) {
  const side = el('div', { class: 'minigame-side' },
    el('div', { class: 'stat-grid minigame-stats' }, stat('Level', run.level), stat('Time left', el('span', { 'data-minigame-time': '' }, durationText(Activities.expeditionRoundStatus(state, run).remaining))), stat('Potential pot', el('span', { 'data-minigame-pot': '' }, `${count(Activities.expeditionRoundStatus(state, run).potentialPot)} coins`))),
    el('p', { class: 'notice', 'data-i18n-ignore': '', 'data-minigame-reward-rules': '' }, language() === 'pl' ? `Do ${durationText(run.roundLimit * 2 / 3)} wygrasz 50 monet. Później nagroda maleje o 1 monetę co ${durationText(run.roundLimit / 12)}. Po ${durationText(run.roundLimit)} cała niewypłacona pula przepada.` : `Win 50 coins within ${durationText(run.roundLimit * 2 / 3)}. Then the reward drops by 1 coin every ${durationText(run.roundLimit / 12)}. At ${durationText(run.roundLimit)} the whole unclaimed pot is lost.`),
    el('div', { 'data-minigame-controls-slot': '', 'data-i18n-ignore': '' }),
    el('div', { 'data-minigame-result-actions': '' }, miniGameActions(run)));
  return el('div', { class: 'minigame-panel' }, side, el('div', { 'data-minigame-host': '', 'data-i18n-ignore': '' }));
}
function miniGameActions(run) {
  return run.status === 'decision' ? expeditionDecisionControls(run.expedition, run) : run.status === 'active' ?
    button('Leave attempt — lose the pot', () => requestExpeditionExit(() => { puzzle = null; openPanel('expeditions'); }), { class: 'action danger' }) :
    el('div', {}, note(run.lossReason === 'deadline' ? 'Time is up. The unclaimed pot was lost.' : 'The expedition ended. The unclaimed pot was lost.'), button('Try another minigame', () => startExpedition(run.expedition)), button('Return to island', () => closePanel(true), { class: 'action secondary' }));
}
function miniGameInput(action) {
  if (tutorialCelebration || document.querySelector('.island-flow-dialog[open]')) return;
  const before = expeditionRun(panel?.id)?.status;
  settleActiveTick();
  if (action.meaningful === true && !document.hidden && document.hasFocus() && Date.now() - lastInputAt >= 250) {
    lastInputAt = Date.now(); act(state, { type: 'userActivity', visible: true, focused: true });
  }
  const result = act(state, action);
  if (!result.ok) return;
  if (action.type !== 'expeditionMiniGameInput' || action.tiltX === 0 && action.tiltY === 0 || Date.now() - miniSavedAt > 1000) { miniSavedAt = Date.now(); save(); }
  const run = expeditionRun(panel?.id);
  miniController?.update(run, Activities.expeditionRoundStatus(state, run));
  if (before !== run?.status) { save(); renderHUD(); }
}
function refreshMiniGame() {
  const run = panel?.kind === 'puzzle' && expeditionRun(panel.id);
  if (!run?.miniGame || !miniController) return;
  const status = Activities.expeditionRoundStatus(state, run);
  miniController.update(run, status);
  const time = dialog.querySelector('[data-minigame-time]'), pot = dialog.querySelector('[data-minigame-pot]');
  if (time) time.textContent = durationText(status.remaining);
  if (pot) pot.textContent = `${count(status.potentialPot)} coins`;
  if (miniGameStatus !== run.status) { miniGameStatus = run.status; dialog.querySelector('[data-minigame-result-actions]')?.replaceChildren(miniGameActions(run)); }
}
function expeditionDecisionControls(id, run) {
  return el('div', { class: 'expedition-decision' },
    button(`Cash out ${count(run.pot)} coins`, () => { if (perform({ type: 'expeditionCashout', expedition: id, runId: run.id })) { puzzle = null; closePanel(true); } }, { 'data-expedition-cashout': id }),
    button(`Risk ${count(run.pot)} for ${count(run.pot + 50)}`, () => {
      if (perform({ type: 'expeditionContinue', expedition: id, runId: run.id })) beginPuzzle(id);
    }, { class: 'action secondary', 'data-expedition-continue': id }));
}
function startExpedition(id) {
  const run = expeditionRun(id);
  if (run?.status === 'decision') { openPanel('expeditions'); return; }
  if (run?.status !== 'active' && !perform({ type: 'expeditionStart', expedition: id })) return;
  if (puzzle?.id === id && !puzzle.complete && puzzle.runId === expeditionRun(id)?.id && puzzle.stage === expeditionRun(id)?.level) { openPanel('puzzle', id); return; }
  beginPuzzle(id);
}
function beginPuzzle(id) {
  const expedition = EXPEDITIONS.find(item => item.id === id), run = expeditionRun(id);
  if (!expedition || !run || run.status !== 'active') return;
  if (run.miniGame) { puzzle = { id, runId: run.id, stage: run.level, complete: false }; openPanel('puzzle', id); return; }
  let row = 0, col = 0;
  expedition.map.forEach((line, r) => { if (line.includes('S')) { row = r; col = line.indexOf('S'); } });
  puzzle = { id, runId: run.id, stage: run.level, row, col, path: [[row, col]], moves: 0, tools: { ...expedition.tools }, cleared: new Set(), collected: new Set(), key: false, complete: false, message: 'Choose an adjacent tile to move.' };
  openPanel('puzzle', id);
}
function move(row, col) {
  if (!puzzle || expeditionRun(puzzle.id)?.miniGame || puzzle.complete || Math.abs(row - puzzle.row) + Math.abs(col - puzzle.col) !== 1) return;
  settleActiveTick();
  const expedition = EXPEDITIONS.find(item => item.id === puzzle.id), run = expeditionRun(puzzle.id);
  if (!run || run.status !== 'active' || run.id !== puzzle.runId || run.level !== puzzle.stage) { puzzle.complete = true; puzzle.message = 'This expedition attempt has ended.'; renderPanel(); return; }
  if (Activities.expeditionRoundStatus?.(state, run)?.presenceRequired) return;
  const id = `${row},${col}`, terrain = puzzle.cleared.has(id) ? '.' : expedition.map[row]?.[col];
  if (terrain == null) return;
  if (terrain === 'D' && !puzzle.key) { puzzle.message = 'Find the key to open the gate.'; renderPanel(); return; }
  const tool = { W: 'bridge', T: 'axe', R: 'dynamite' }[terrain];
  if (tool) { if (!puzzle.tools[tool]) { puzzle.message = 'You do not have the required tool. Find another route.'; renderPanel(); return; } puzzle.tools[tool]--; puzzle.cleared.add(id); }
  puzzle.row = row; puzzle.col = col; puzzle.moves++; puzzle.path.push([row, col]);
  puzzle.message = 'Choose an adjacent tile to move.';
  if (terrain === 'K') { puzzle.key = true; puzzle.collected.add(id); puzzle.message = 'Key found.'; }
  if (terrain === 'C' && !puzzle.collected.has(id)) { puzzle.collected.add(id); puzzle.message = 'Supply marker reached. Expedition rewards remain coin-only.'; }
  if (terrain === 'G') {
    puzzle.complete = true;
    const result = act(state, { type: 'expeditionWin', expedition: puzzle.id, runId: puzzle.runId, stage: puzzle.stage, path: puzzle.path });
    puzzle.message = result.message; save(); renderHUD(); toast(result.message);
  } else if (!Activities.expeditionRoundStatus && run.mode === 'moves' && Number.isFinite(run.moveLimit) && puzzle.moves >= run.moveLimit) {
    const result = act(state, { type: 'expeditionLose', expedition: puzzle.id, runId: puzzle.runId });
    puzzle.complete = true; puzzle.message = result.message; save(); renderHUD();
  }
  renderPanel();
}
function puzzlePanel() {
  if (!puzzle) return expeditionsPanel();
  const expedition = EXPEDITIONS.find(item => item.id === puzzle.id), run = expeditionRun(puzzle.id);
  if (run?.miniGame) return miniGamePanel(run);
  const names = { S: 'Camp', '.': 'Path', W: 'Water — bridge', T: 'Tree — axe', R: 'Rock — dynamite', C: 'Supply marker', G: 'Goal', K: 'Key', D: 'Gate' };
  const icons = { S: '⌂', '.': '·', W: '≈', T: '♠', R: '◆', C: '▣', G: '⚑', K: '⚿', D: '▥' };
  const board = el('div', { class: 'puzzle-board', style: { '--cols': expedition.map[0].length }, 'aria-label': 'Expedition board' });
  expedition.map.forEach((line, row) => [...line].forEach((original, col) => {
    const id = `${row},${col}`, tile = puzzle.cleared.has(id) || puzzle.collected.has(id) ? '.' : original;
    const isPlayer = row === puzzle.row && col === puzzle.col, reachable = Math.abs(row - puzzle.row) + Math.abs(col - puzzle.col) === 1;
    board.append(button(isPlayer ? '●' : icons[tile], () => move(row, col), { class: `puzzle-cell${isPlayer ? ' is-player' : ''}${reachable ? ' reachable' : ''}`, 'data-tile': tile, 'aria-label': `${isPlayer ? 'Your position' : names[tile]}, row ${row + 1}, column ${col + 1}`, disabled: puzzle.complete || !reachable || run?.status !== 'active', 'data-row': row, 'data-col': col }));
  }));
  return el('div', {},
    el('div', { class: 'stat-grid' }, stat('Level', run?.level || puzzle.stage), stat('Potential pot', el('span', { 'data-expedition-pot': puzzle.id }, `${count(Activities.expeditionRoundStatus?.(state, run)?.potentialPot ?? run?.pot)} coins`))),
    el('div', { class: 'puzzle-tools', 'data-expedition-live': puzzle.id }, expeditionStatusText(run)),
    board, el('p', { class: 'puzzle-status', role: 'status' }, puzzle.message),
    run?.status === 'decision' ? expeditionDecisionControls(puzzle.id, run) : run?.status === 'active' ? button('Leave attempt — lose the pot', () => requestExpeditionExit(() => { puzzle = null; openPanel('expeditions'); }), { class: 'action danger' }) : button('Return to island', closePanel),
    note('Move up, down, left or right. Every win increases the unclaimed coin pot; cash out to transfer it to the island.'),
    note('Overtime costs 10 coins from the potential reward per whole second. Ads are a future integration.'),
    !['active','decision'].includes(run?.status) ? button('Expedition list', () => openPanel('expeditions'), { class: 'action secondary' }) : null);
}
function expeditionStatusText(run) {
  if (!run) return 'No active attempt';
  const status = Activities.expeditionRoundStatus?.(state, run);
  if (status?.active) return `${status.remaining > 0 ? `Time left: ${durationText(status.remaining)}` : `Overtime: ${durationText(status.overtimeSeconds || 0)}`} · Potential pot: ${count(status.potentialPot)} coins${status.overtimePenalty ? ` · Penalty: −${count(status.overtimePenalty)} coins` : ''}`;
  return run.status === 'active' ? (run.mode === 'time' ? `Time left: ${durationText(run.remaining)}` : `Moves used: ${puzzle?.moves || 0}${Number.isFinite(run.moveLimit) ? ` / ${run.moveLimit}` : ' · Practice: move limit pending'}`) : run.status === 'decision' ? 'Choose to cash out or continue.' : 'Attempt ended';
}

function renderPanel() {
  if (!panel) return;
  const rosterOpen = dialog.querySelector('[data-resident-roster]')?.open;
  const rosterScroll = dialog.querySelector('[data-resident-list]')?.scrollTop || 0;
  closeInfoPopup(false);
  miniController?.dispose(); miniController = null;
  const titles = { home: islandDisplayName(state, language()), menu: islandDisplayName(state, language()), buildings: 'Buildings', resources: 'Warehouse and transport', residents: 'Residents', trade: 'Harbor trade', tasks: 'Tasks', objective: gameGoal().title, settings: 'Settings', time: 'Island time', premium: 'Premium options', expeditions: 'Expeditions', map: 'Island map', decorations: 'Decorations', paths: 'Paths and bridges', reset: 'New island' };
  let title = titles[panel.kind] || titleOf(panel.id);
  let body;
  switch (panel.kind) {
    case 'building': body = buildingPanel(panel.id); break;
    case 'building-details': body = buildingDetailsPanel(panel.id); break;
    case 'effects': title = 'Active bonuses and penalties'; body = activeEffectsPanel(); break;
    case 'buildings': body = buildingsPanel(); break;
    case 'resources': body = resourcesPanel(panel.id); break;
    case 'residents': body = residentsPanel(); break;
    case 'workers': title = 'Manage all workers'; body = residentsPanel(true); break;
    case 'trade': body = tradePanel(); break;
    case 'market': title = 'Market'; body = marketPanel(); break;
    case 'construction': title = 'Construction and queue'; body = constructionPanel(); break;
    case 'notifications': title = 'Notifications'; body = notificationsPanel(); break;
    case 'tasks': body = tasksPanel(); break;
    case 'tutorial': title = 'Tutorial'; body = tutorialPanel(); break;
    case 'objective': body = objectivePanel(); break;
    case 'settings': body = settingsPanel(); break;
    case 'time': body = timePanel(); break;
    case 'premium': body = premiumPanel(); break;
    case 'decorations': body = decorationsPanel(); break;
    case 'paths': body = pathsPanel(); break;
    case 'expeditions': body = expeditionsPanel(); break;
    case 'puzzle': title = expeditionRun(puzzle.id)?.miniGame ? 'Expedition minigame' : EXPEDITIONS.find(item => item.id === puzzle.id).name; body = puzzlePanel(); break;
    case 'rules': title = 'Island rules'; body = islandRulesPanel(); break;
    case 'map': body = el('div', {}, note('Choose a district to locate it on the island.'), el('div', { class: 'panel-grid' }, Object.keys(buildingRegions).map(id => button(titleOf(id), () => {
      closePanel(); const node = document.getElementById(`hit-world-${id}`); node.focus(); node.classList.add('world-pulse'); setTimeout(() => node.classList.remove('world-pulse'), 3000);
    })))); break;
    case 'reset': body = el('div', {}, note('Starting a new island will erase your current progress in this browser.'), button('Yes, start over', () => { const previewBuildStockVersion = state.previewBuildStockVersion; state = createState(); if (previewBuildStockVersion) state.previewBuildStockVersion = previewBuildStockVersion; puzzle = null; save(); renderHUD(); openPanel('home'); toast('Your new island is ready.'); }, { class: 'action danger' }), button('Keep my island', () => openPanel('settings'), { class: 'action secondary' })); break;
    default: body = el('div', {}, note(gameGoal().description),
      stat('Loyalty — consecutive days', `${state.loyalty.streak} / 10`),
      button('Town Hall', () => openPanel('building', 'townhall'), { class: 'action secondary' }),
      button('Notifications', () => openPanel('notifications'), { class: 'action secondary' }),
      button('Premium options', () => openPanel('premium'), { class: 'action secondary' }),
      el('div', { class: 'stat-grid' }, stat('Town Hall level', el('span', { 'data-population-stat': 'level' }, state.buildings.townhall.level)), stat('Residents', el('span', { 'data-population-stat': 'population' }, `${state.population} / ${state.capacity}`)), stat('Happiness', el('span', { 'data-population-stat': 'happiness' }, happinessText())), stat('Day', state.day)),
      el('div', { class: 'panel-grid' }, [['rules', 'Island rules'], ['objective', 'Main objective'], ['buildings', 'Buildings'], ['expeditions', 'Expeditions'], ['tasks', 'Tasks'], ['residents', 'Residents'], ['resources', 'Warehouse'], ['trade', 'Trade'], ['map', 'Island map'], ['tutorial', 'Tutorial'], ['settings', 'Settings']].map(([kind, label]) => button(label, () => openPanel(kind)))),
      button('Return to island', closePanel, { class: 'action secondary' }));
  }
  const scroll = dialog.querySelector('.dialog-body')?.scrollTop || 0;
  const dialogScroll = dialog.scrollTop || 0;
  dialog.dataset.panelKind = panel.kind;
  if (panel.id) dialog.dataset.panelBuilding = panel.id; else delete dialog.dataset.panelBuilding;
  dialog.replaceChildren(el('header', { class: `dialog-header${panelHistory.length ? ' has-panel-back' : ''}` },
    panelHistory.length ? button('←', backPanel, { class: 'dialog-back', 'aria-label': 'Back to previous menu', 'data-panel-back': '' }) : null,
    el('div', {}, el('span', { class: 'eyebrow' }, 'HARBORLIGHT · ISLAND 01'), el('h2', { id: 'dialog-title', 'data-i18n-ignore': ['home', 'menu'].includes(panel.kind) && !!state.islandName }, title)), button('×', closePanel, { class: 'dialog-close', 'aria-label': 'Close window' })), el('div', { class: 'dialog-body' }, panelNotice ? el('p', { class: 'notice action-feedback', role: 'status' }, panelNotice) : null, body));
  if (rosterOpen) {
    const roster = dialog.querySelector('[data-resident-roster]');
    if (roster) { roster.open = true; refreshResidentRosters(); roster.querySelector('[data-resident-list]').scrollTop = rosterScroll; }
  }
  dialog.querySelector('.dialog-body').scrollTop = scroll;
  dialog.scrollTop = dialogScroll;
  localize(dialog);
  const gameHost = dialog.querySelector('[data-minigame-host]');
  if (gameHost) { const run = expeditionRun(panel.id); miniGameStatus = run.status; miniController = mountMiniGame({ host: gameHost, controlsHost: dialog.querySelector('[data-minigame-controls-slot]'), run, onAction: miniGameInput, language: language(), status: Activities.expeditionRoundStatus(state, run), animations: effectiveAnimationsEnabled() }); }
  if (tutorialReady) refreshTutorialExperience();
}

function levelSharePanel() {
  const level = state.buildings.townhall.level;
  if (level < 2) return null;
  const verified = Progression.socialSummary?.(state)?.levelShares?.includes(level) === true;
  return el('section', { class: 'milestone-share-row' },
    el('div', {}, el('strong', {}, `Town Hall level ${level}`), el('small', {}, verified ? 'Milestone publication verified' : '500 coins after verified publication')),
    button(verified ? 'Already verified' : 'Share milestone', () => openLevelShare(level), { class: 'action secondary', disabled: verified, 'data-share-level': level }));
}
function openLevelShare(level) {
  const nickname = String(state.player?.nickname || state.profile?.nickname || state.nickname || text('Island explorer')).slice(0,80);
  const prepared = language() === 'pl' ? `${nickname} ma już ratusz na poziomie ${level} w HARBORLIGHT! Zbuduj własną wyspę: ${OFFICIAL_GAME_URL}` : `${nickname} reached Town Hall level ${level} in HARBORLIGHT! Build your own island: ${OFFICIAL_GAME_URL}`;
  const field = el('textarea', { readonly: true, rows: 4, 'aria-label': 'Prepared milestone post', 'data-share-post': '' }); field.value = prepared;
  const status = el('p', { class: 'share-intent-status', role: 'status', 'data-share-status': '' });
  const popup = createFlowDialog('milestone-share', 'Share your level milestone', el('div', {}, note('You control what is published. The 500-coin reward requires verified publication; verification is not connected yet. Opening or copying this post does not award coins.'), field, status));
  const dispose = () => { popup.close(); popup.remove(); };
  const actions = el('div', { class: 'flow-actions share-intent-actions' });
  if (typeof navigator.share === 'function') actions.append(button('Open share dialog', async () => {
    try { await navigator.share({ title:'HARBORLIGHT', text:prepared, url:OFFICIAL_GAME_URL }); status.textContent = 'The share dialog closed. Publication verification is not connected; no coins were awarded.'; }
    catch (error) { status.textContent = error?.name === 'AbortError' ? 'Sharing cancelled. No coins were awarded.' : 'Use Copy post or the Facebook sharing link.'; }
    localize(popup);
  }, { 'data-native-share': '' }));
  actions.append(button('Copy post', async () => {
    try { if (!navigator.clipboard?.writeText) throw new Error('clipboard'); await navigator.clipboard.writeText(prepared); status.textContent = 'Post copied. Publish it yourself; no coins were awarded.'; }
    catch { field.focus(); field.select(); status.textContent = 'Select and copy the prepared post.'; }
    localize(popup);
  }, { class:'action secondary', 'data-copy-share': '' }));
  const facebook = new URL('https://www.facebook.com/sharer/sharer.php'); facebook.searchParams.set('u',OFFICIAL_GAME_URL); facebook.searchParams.set('quote',prepared);
  actions.append(el('a', { class:'action secondary', href:facebook.href, target:'_blank', rel:'noopener noreferrer', 'data-facebook-share': '' }, 'Open Facebook sharing dialog'), button('Back to island', dispose, { class:'action secondary', 'data-close-share': '' }));
  popup.querySelector('.flow-body').append(actions); popup.addEventListener('cancel',event=>{event.preventDefault();dispose();}); localize(popup); popup.showModal(); field.focus();
}

function canCancelProject(project) {
  return project.stage !== 'building' && !project.transportStarted && !(project.transportSeconds > 0) && !Object.values(project.delivered || {}).some(value => value > 0) && !(state.haulTrips?.warehouse || []).some(trip => trip.projectOrder === project.order) && !state.constructionProjects.some(other => other.building === project.building && other.targetLevel > project.targetLevel);
}

function resourceInTransit(resource) {
  return Object.values(state.haulTrips || {}).flat().reduce((sum, trip) => sum + (trip.resource === resource ? Number(trip.amount || 0) : 0), 0);
}
function refreshResourceTrends() {
  const rates = State.resourceRates?.(state) || {};
  resourceDock.querySelectorAll('[data-resource-trend]').forEach(node => {
    const value = Number(rates[node.dataset.resourceTrend]?.net ?? rates[node.dataset.resourceTrend] ?? 0);
    const absolute = I18n.formatNumber(Math.abs(value), language(), { maximumFractionDigits: 2 });
    node.textContent = `${value > 0.0001 ? '↑ +' : value < -0.0001 ? '↓ −' : '→ '}${Math.abs(value) < 0.0001 ? '0' : absolute} units/h`;
    node.dataset.trend = value > 0.0001 ? 'positive' : value < -0.0001 ? 'negative' : 'neutral';
  });
}
function nextResidentText() {
  const rate = populationRate(state.happiness);
  if (!rate) return '0 · Stable';
  if (rate > 0 && state.population >= state.capacity) return 'Capacity reached';
  if (rate < 0 && state.population <= 6) return 'Minimum: 6';
  const progress = state.populationDirection === Math.sign(rate) ? state.populationProgress : 0;
  const remaining = Math.max(0, (1 - progress) * 3600 / Math.abs(rate));
  const compact = remaining >= 31536000 ? `${count(Math.floor(remaining / 31536000))} yr` : remaining >= 86400 ? `${count(Math.floor(remaining / 86400))} d ${Math.floor(remaining % 86400 / 3600)} h` : durationText(remaining);
  return `${rate < 0 ? '−1 · ' : '+1 · '}${compact}`;
}
function refreshDockBadges() {
  buildingDock.querySelectorAll('[data-dock-level]').forEach(node => { node.textContent = `Lv. ${state.buildings[node.dataset.dockLevel].level}`; });
  buildingDock.querySelectorAll('[data-dock-workers]').forEach(node => {
    const id = node.dataset.dockWorkers;
    const working = state.residents.filter(person => person.workplace === id && Residents.residentIsWorking(state, person)).length;
    const arriving = state.residents.filter(person => person.workplace === id && person.arrivalRemaining > 0).length;
    const returning = state.residents.filter(person => person.workplace === id && person.pendingRelease || (person.returnFrom === id || person.returningFrom === id || person.previousWorkplace === id) && person.returnRemaining > 0).length;
    node.replaceChildren(el('span', { class: 'dock-worker-caption' }, 'Working here:'), ' ', el('span', { 'data-dock-working-count': id }, `${working}${arriving ? ` (+${arriving})` : ''}${returning ? ` (−${returning})` : ''}`));
    node.setAttribute('aria-label', `Working: ${working}${arriving ? `, arriving: ${arriving}` : ''}${returning ? `, returning home: ${returning}` : ''}`);
  });
}
function compactSettlementSummary(id) {
  return el('section', { class: 'settlement-summary', 'data-settlement-summary': id },
    stat('Level', state.buildings[id].level), stat('Residents', `${state.population} / ${state.capacity}`), stat('Beds', housingCapacity(state)),
    id === 'house' ? stat('Population change', nextResidentText()) : null);
}
function residentPurchasePanel() {
  const quote = State.residentPurchaseQuote?.(state);
  if (!quote) return card(el('h3', {}, 'Invite a resident'), note('Resident purchases are unavailable.'));
  return card(informationHeading('invite-resident', 'Invite a resident', 'A resident costs the full next Town Hall upgrade price in all six resources. An available House bed and Town Hall population place are required. New residents stay at 0% happiness for 24 hours.'),
    upgradeCostView(quote.cost || quote.price || {}, 'resident'), button('Invite resident', () => perform({ type: 'buyResident' }), { disabled: !quote.ok, title: quote.message || '', 'data-buy-resident': '' }));
}
const NOTIFICATION_CATEGORIES = [['bonuses', 'Bonuses'], ['penalties', 'Penalties'], ['storage', 'Storage'], ['construction', 'Construction'], ['trade', 'Trade'], ['tasks', 'Tasks'], ['expeditions', 'Expeditions'], ['system', 'Other notifications']];
function notificationCategory(item) {
  const kind = `${item.kind || ''} ${item.title || ''}`.toLowerCase();
  if (/effect|bonus|penalty/.test(kind)) return /penalty|shortage|unemployment|blockage|not enough beds|familiarity/.test(kind) ? 'penalties' : 'bonuses';
  if (/storage|warehouse-full|producer-full/.test(kind)) return 'storage';
  if (/construction|upgrade|build/.test(kind)) return 'construction';
  if (/trade|market|harbor|port/.test(kind)) return 'trade';
  if (/task|quest/.test(kind)) return 'tasks';
  if (/expedition/.test(kind)) return 'expeditions';
  return 'system';
}
function notificationFilterSettings() {
  return rules('Notification categories', note('Choose which categories are shown. All events remain in your island history.'), ...NOTIFICATION_CATEGORIES.map(([id, label]) => el('label', { class: 'setting-row' }, el('span', {}, label), el('input', { type: 'checkbox', checked: state.settings.notificationCategories?.[id] !== false, 'data-notification-category': id, onchange: event => perform({ type: 'setting', key: 'notificationCategories', value: { ...(state.settings.notificationCategories || {}), [id]: event.target.checked } }) }))));
}
function tutorialOptions() {
  return { state, progression: Progression, language: language(), onAction: tutorialAction, onVisit: visitTutorialRoute, onClose: () => closePanel() };
}
function tutorialPanel() { return createTutorialPanel(tutorialOptions()); }
function tutorialAction(action) {
  if (action.type === 'seeTutorialReward') deferredTutorialRewards.delete(action.taskId);
  const result = perform(action);
  if (result && action.type === 'seeTutorialReward' && !tutorialCelebration) {
    const achievement = Progression.tutorialPendingRewards(state).find(item => item.lessonId === action.taskId);
    if (achievement) openTutorialReward(achievement, Progression.tutorialRows(state));
  }
  if (result && action.type === 'dismissTutorial') closePanel(true);
  return result;
}
function visitTutorialRoute(route) {
  if (route === 'rules' && !state.tutorial.events['visit:rules-read:home']) { openPanel('home'); return; }
  if (['paths', 'decorations'].includes(route) || route === 'resources' && Progression.tutorialStatus(state).nextLessonId === 'resources-dock') {
    closePanel(true); setDockCategory(route); return;
  }
  if (BUILDINGS[route]) { openPanel('building', route); return; }
  openPanel(route);
}
function islandRulesPanel() {
  return el('div', { class: 'island-start-rules' }, note(gameGoal().description),
    card(el('h3', {}, 'Residents and food'), note('Give residents jobs and keep Food in the central Warehouse. Workers need five minutes to reach work; hunger slows production and transport.')),
    card(el('h3', {}, 'Production and transport'), note('Production waits in local storage until carriers deliver it. Upgrades spend central materials, then transport and construction take place in separate phases.')),
    card(el('h3', {}, 'Happiness and progress'), note('Food, work, housing and temporary attractions influence happiness. Develop all buildings, improve paths and complete tasks while keeping residents happy.')),
    button('Continue tutorial', () => openPanel('tutorial'), { class: 'action secondary' }));
}
function finishTutorialReward(achievement, type) {
  const result = act(state, { type, taskId: achievement.lessonId });
  if (!result.ok) { toast(result.message); return false; }
  save();
  queueMicrotask(() => { tutorialCelebration = null; renderHUD(); if (panel?.kind === 'tutorial') renderPanel(); });
  return true;
}
function refreshTutorialExperience() {
  if (!tutorialReady) return;
  const status = Progression.tutorialStatus(state), rows = Progression.tutorialRows(state);
  const row = rows.find(item => !item.completed);
  const host = dialog.open ? dialog.querySelector('.dialog-body') : document.body;
  const signature = JSON.stringify([language(), panel?.kind, panel?.id, status, row?.visited, row?.canObserve, row?.completed, row?.canClaim]);
  if (panel?.kind === 'tutorial' && tutorialPanelSignature !== signature) { tutorialPanelSignature = signature; renderPanel(); return; }
  const existing = document.querySelector('[data-active-tutorial-guide]');
  if (signature !== tutorialGuideSignature || !existing?.isConnected) {
    tutorialGuideSignature = signature; existing?.remove();
    if (panel?.kind !== 'tutorial' && !expeditionSession()) {
      const guide = createTutorialGuide(tutorialOptions());
      if (guide && host) { guide.dataset.activeTutorialGuide = ''; if (!dialog.open) guide.classList.add('tutorial-guide-floating'); dialog.open ? host.prepend(guide) : host.append(guide); }
    }
  }
  if (status.autoOpenDisabled) return;
  for (const pending of rows.filter(item => item.canClaim)) { const result = act(state, { type: 'claimTutorial', taskId: pending.id }); if (result.ok) save(); }
  if (panel && !dialog.open || tutorialCelebration || taskCelebration?.open || taskAcceptanceDialog?.open || confirmationDialog?.open || document.querySelector('.island-flow-dialog[open]')) return;
  const achievement = Progression.tutorialPendingRewards(state).find(item => item.claimed && !deferredTutorialRewards.has(item.lessonId));
  if (!achievement) return;
  openTutorialReward(achievement, rows);
}
function openTutorialReward(achievement, rows) {
  act(state, { type: 'seeTutorialReward', taskId: achievement.lessonId }); save();
  tutorialCelebration = showTutorialAchievement({ achievement, row: rows.find(item => item.id === achievement.lessonId), language: language(), animations: effectiveAnimationsEnabled(), sound: state.settings.sound,
    onShare: () => finishTutorialReward(achievement, 'shareTutorialReward'), onSkip: () => finishTutorialReward(achievement, 'skipTutorialShare'),
    onClose: () => { deferredTutorialRewards.add(achievement.lessonId); tutorialCelebration = null; renderHUD(); } });
}
function progressionOverview() {
  const loyalty = Progression.loyaltyStatus?.(state), engagement = Progression.engagementStatus?.(state);
  return card(el('h3', {}, 'Your progress'),
    el('div', { class: 'stat-grid' }, stat('Tutorial steps completed', `${Progression.tutorialStatus(state).completed} / 25`), stat('Tutorial rewards claimed', `${Object.keys(state.tutorial?.claimed || {}).length} / 25`)),
    engagement?.active ? note(`Active play: production ×2 for ${durationText(engagement.remaining)}. Meaningful activity renews this five-minute bonus.`) : note('Meaningful activity activates a five-minute production ×2 bonus.'),
    loyalty ? el('details', { class: 'island-rules' }, el('summary', {}, 'Introductory loyalty calendar'),
      el('div', { class: 'loyalty-calendar' }, ...Array.from({length:10}, (_,index) => el('span', { class: `loyalty-day${loyalty.claimedDays.includes(index+1) ? ' is-claimed' : ''}${index+1 === loyalty.streak ? ' is-current' : ''}` }, index+1))), note(loyalty.message)) : null,
    rules('Community rewards', note(Progression.socialSummary?.(state)?.message || 'Verified social sharing is not connected yet.'), ...(Progression.referralRows?.(state) || []).map(row => el('p', {}, `${row.activeDayCount} / 3 active days · ${durationText(row.remaining)}`))));
}
const mobileDock = el('nav', { class: 'mobile-bottom-dock', 'aria-label': 'Island building and resource dock' });
document.body.append(mobileDock);
new ResizeObserver(() => window.dispatchEvent(new Event('island-dock-layout'))).observe(mobileDock);
function renderMobileDock(force = false) {
  if (!matchMedia('(max-width:900px),(max-height:500px)').matches) return;
  const signature = JSON.stringify([language(), activeDockCategory, leisureDockSignature, BUILDING_DOCK_ORDER.map(id => [state.buildings[id].level, state.buildings[id].workers]), MATERIAL_IDS.map(id => [Math.floor(state.resources[id]), Math.floor(state.buildings[resourceProductionBuildings[id]].ready)]), [...buildingDock.querySelectorAll('[data-dock-workers]')].map(node => node.textContent)]);
  if (!force && signature === mobileDockSignature) return;
  mobileDockSignature = signature;
  const scrolled = mobileDock.querySelector('.mobile-dock-scroll')?.scrollLeft || 0;
  const tabs = el('div', { class: 'mobile-dock-tabs' }, ...dockCategories.map(([id,label]) => button(label, () => setDockCategory(id), { class: `mobile-dock-tab${activeDockCategory===id?' is-selected':''}`, 'data-mobile-category': id, 'aria-pressed': String(activeDockCategory===id) })));
  const cards = el('div', { class: 'mobile-dock-scroll' });
  if (BUILDING_DOCK_GROUPS[activeDockCategory]) {
    for (const source of buildingDock.children) {
      if (source.hidden) continue;
      const id = source.dataset.dockBuilding;
      const control = button('', () => openPanel('building', id), { class: 'building-dock-card', 'data-mobile-building': id, 'aria-label': titleOf(id) });
      control.append(...[...source.children].map(node => node.cloneNode(true))); cards.append(control);
    }
  } else if (activeDockCategory === 'resources') {
    for (const source of resourceDock.children) {
      const resource = source.dataset.dockResource;
      const control = button('', () => openPanel('building', resourceProductionBuildings[resource]), { class: 'resource-dock-card', 'data-mobile-resource': resource, 'aria-label': nameOf(resource) });
      control.append(...[...source.children].map(node => node.cloneNode(true))); cards.append(control);
    }
  } else {
    for (const source of leisureDock.children) {
      const control = button('', () => source.click(), { class: source.className, disabled: source.disabled, 'aria-label': source.getAttribute('aria-label') });
      control.append(...[...source.children].map(node => node.cloneNode(true))); cards.append(control);
    }
  }
  mobileDock.replaceChildren(tabs,cards); cards.scrollLeft = scrolled; localize(mobileDock);
}

function showRoadSuccess(levelComplete) {
  const banner = el('div', { class: 'road-success', role: 'status' }, el('strong', {}, levelComplete ? 'Path network level complete!' : 'Path section upgraded'), el('span', {}, '✓'));
  if (effectiveAnimationsEnabled()) {
    const burst = el('div', { class: 'celebration-fireworks', 'aria-hidden': 'true' });
    for (let i=0;i<3;i++) { const spray = el('span', { class: 'firework-burst', style: { '--burst-x': `${25+i*25}%`, '--burst-y': '50%', '--burst-delay': `${i*.12}s`, '--burst-color': '#f4d48d' } }); for(let ray=0;ray<12;ray++)spray.append(el('i',{style:{'--ray':ray}})); burst.append(spray); }
    banner.append(burst);
  }
  document.body.append(banner); localize(banner); setTimeout(() => banner.remove(), 2200);
}
function createFlowDialog(id, title, description) {
  const popup = el('dialog', { id, class: 'island-flow-dialog', 'aria-labelledby': `${id}-title` }, el('header', {}, el('h2', { id: `${id}-title` }, title)), el('div', { class: 'flow-body' }, description));
  document.body.append(popup); return popup;
}
function confirmChoice(title, description, confirmLabel, action) {
  if (confirmationDialog?.open) return;
  const popup = createFlowDialog('island-confirmation', title, note(description)); confirmationDialog = popup;
  const dispose = () => { popup.close(); popup.remove(); if (confirmationDialog === popup) confirmationDialog = null; };
  popup.querySelector('.flow-body').append(el('div', { class: 'flow-actions' }, button(confirmLabel, () => { dispose(); action(); }, { 'data-confirm-choice': '' }), button('Keep playing', dispose, { class: 'action secondary', 'data-cancel-choice': '' })));
  popup.addEventListener('cancel', event => { event.preventDefault(); dispose(); }); localize(popup); popup.showModal(); popup.querySelector('[data-cancel-choice]').focus();
}
function expeditionSession() { return Activities.activeExpeditionRun?.(state) || Object.values(state.expeditionRuns || {}).find(run => ['active','decision'].includes(run.status)); }
function requestExpeditionExit(after = () => closePanel(true)) {
  const run = expeditionSession(); if (!run) { after(); return; }
  const won = run.status === 'decision';
  confirmChoice(won ? 'Cash out and leave?' : 'Leave this expedition?', won ? `Leaving now pays ${count(run.pot)} coins into your island treasury.` : `Leaving during this round loses the unclaimed pot of ${count(run.pot)} coins.`, won ? 'Cash out and leave' : 'Leave and lose the pot', () => { if (perform({ type: won ? 'expeditionCashout' : 'expeditionLose', expedition: run.expedition, runId: run.id })) { puzzle = null; after(); } });
}
function openTaskAcceptance(task) {
  if (taskAcceptanceDialog?.open) return;
  if (!perform({ type: 'beginTaskAcceptance', task: task.id })) return;
  const status = Activities.taskAcceptanceStatus?.(state); if (!status?.pending) return;
  const popup = createFlowDialog('task-acceptance', 'Confirm Lighthouse task', el('div', {}, el('h3', {}, task.title), note('The reward multiplier was saved when you opened this offer. Confirm within 60 seconds to start the task. Only one task can be active.'), el('p', { class: 'acceptance-countdown', 'data-acceptance-time': '' }), el('p', { class: 'task-reward' }, `Reward ×${status.multiplier}: ${costText(Activities.taskReward?.({ ...task, multiplier: status.multiplier }) || task.reward)}`), resourceList(task.requirements)));
  taskAcceptanceDialog = popup;
  const cancel = () => { act(state, { type: 'cancelTaskAcceptance', task: task.id }); save(); popup.close(); popup.remove(); taskAcceptanceDialog = null; renderHUD(); };
  popup.querySelector('.flow-body').append(el('div', { class: 'flow-actions' }, button('Confirm and start', () => { if (perform({ type: 'confirmTaskAcceptance', task: task.id })) { popup.close(); popup.remove(); taskAcceptanceDialog = null; openPanel('tasks'); } }, { 'data-confirm-task': task.id }), button('Cancel', cancel, { class: 'action secondary' })));
  popup.addEventListener('cancel', event => { event.preventDefault(); cancel(); }); popup.addEventListener('click', event => { if (event.target === popup) cancel(); }); refreshTaskAcceptance(); localize(popup); popup.showModal(); popup.querySelector('[data-confirm-task]').focus();
}
function refreshTaskAcceptance() {
  if (!taskAcceptanceDialog) return;
  const status = Activities.taskAcceptanceStatus?.(state);
  const clock = taskAcceptanceDialog.querySelector('[data-acceptance-time]');
  if (clock) clock.textContent = status?.pending ? `Confirm in ${durationText(status.remaining)}` : 'This confirmation has expired. Open the task again.';
  const confirm = taskAcceptanceDialog.querySelector('[data-confirm-task]'); if (confirm) confirm.disabled = !status?.canConfirm;
}
function refreshExpeditionPresence() {
  const run = expeditionSession(); const status = run && Activities.expeditionRoundStatus?.(state, run);
  if (!status?.presenceRequired) { document.getElementById('expedition-presence')?.remove(); return; }
  let popup = document.getElementById('expedition-presence');
  if (!popup) {
    popup = createFlowDialog('expedition-presence', 'Are you still playing?', el('div', {}, note('Confirm your presence to continue. Round time and overtime charges continue while this prompt is open.'), el('p', { 'data-presence-countdown': '' }), button('I am here', () => { if (perform({ type: 'expeditionPresenceConfirm', runId: run.id })) { popup.close(); popup.remove(); } }, { 'data-presence-confirm': '' })));
    popup.addEventListener('cancel', event => event.preventDefault()); localize(popup); popup.showModal(); popup.querySelector('[data-presence-confirm]').focus();
  }
  popup.querySelector('[data-presence-countdown]').textContent = `Confirm in ${durationText(status.presenceRemaining)}`;
}
function meaningfulInput(event) {
  if (document.hidden || !document.hasFocus() || event.type === 'keydown' && ['Shift','Control','Alt','Meta','Tab'].includes(event.key)) return;
  const now = Date.now(); if (now - lastInputAt < 250) return; lastInputAt = now;
  settleActiveTick(); const result = act(state, { type: 'userActivity', visible: true, focused: true }); if (result.ok) save();
}
document.addEventListener('pointerdown', meaningfulInput, { capture: true, passive: true });
document.addEventListener('keydown', meaningfulInput, { capture: true });

setDockCategory('administration');
settleActiveTick();
if (!NEW_PLAYER_PROFILE) State.applyBuildTestStock?.(state);
recordVisit(state);
save();
const restoredExpedition = expeditionSession();
if (restoredExpedition?.status === 'active') beginPuzzle(restoredExpedition.expedition);
else if (restoredExpedition?.status === 'decision') openPanel('expeditions');
else if (Activities.taskAcceptanceStatus?.(state)?.pending) { const pending = state.lighthouseTasks.find(task => task.id === state.taskAcceptanceDraft.taskId); if (pending) openTaskAcceptance(pending); }
tutorialReady = true;
if (!dialog.open && !taskAcceptanceDialog?.open && Progression.tutorialStatus(state).shouldAutoOpen) openPanel('tutorial');
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
  if (document.hidden) { settleActiveTick(); save(); }
  else { settleActiveTick(); save(); renderHUD(); }
});
