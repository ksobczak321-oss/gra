// Persistent learning, meaningful activity and future verified social hooks.
// No DOM, network requests or account creation happen in this module.
import { centralAvailable, centralReserved, ordinaryStock, ordinaryWarehouseUsed } from './harborlight-v1-inventory.js?v=frontend-v22';
import { DAY_SECONDS, warsawDayKey, secondsUntilWarsawMidnight, calendarDayDistance } from './harborlight-v1-calendar.js?v=frontend-v22';

export const ACTIVE_PLAY_SECONDS = 300;
export const ABANDONED_PLAY_SECONDS = 48 * 3600;
export const LOYALTY_REWARD_MIN = 50;
export const LOYALTY_REWARD_MAX = 200;
const LOYALTY_RESOURCES = ['coins', ...['wood', 'stone', 'grain', 'food', 'planks']];
export const REFERRAL_WINDOW_SECONDS = 30 * DAY_SECONDS;
const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const PRODUCERS = ['farm', 'windmill', 'lumber', 'sawmill', 'quarry'];
const EPS = 1e-7;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const nonnegative = (value, fallback = 0) => finite(value) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, value)) : fallback;
const whole = (value, fallback = 0) => Math.floor(nonnegative(value, fallback));
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const introductionPending = state => state?.onboarding?.version === 1 && state.onboarding.worldStartedAt === null && ['intro', 'name', 'tour'].includes(state.onboarding.stage);
const textId = value => typeof value === 'string' && value.length > 0 && value.length <= 200 ? value : null;
const nowOf = state => nonnegative(state.worldTimeMs, nonnegative(state.lastSimulatedAt));
const townLevel = state => Math.max(1, whole(state.buildings?.townhall?.level, 1));
const good = (message, extra = {}) => ({ ok: true, message, ...extra });
const bad = message => ({ ok: false, message });
const validDay = value => typeof value === 'string' && DAY.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const dayList = values => [...new Set((Array.isArray(values) ? values : []).filter(validDay))].sort();

function emit(state, kind, title, message) {
  state.notificationSequence = whole(state.notificationSequence) + 1;
  state.notifications ||= [];
  state.notifications.unshift({ id: state.notificationSequence, kind, title, message, at: state.activeSeconds || 0, read: false });
  state.notifications.length = Math.min(100, state.notifications.length);
}

export const TUTORIAL_VERSION = 4;
export const TUTORIAL_CHEST_MIN = 100;
export const TUTORIAL_CHEST_MAX = 300;
export const TUTORIAL_BUILDING_SUPPLIES = Object.freeze({ coins: 500, wood: 500, stone: 500, grain: 500, food: 600, planks: 500 });
function lesson(id, index, title, description, kind, subject, route, prerequisite = null, guideSelector = '') {
  return Object.freeze({ id, index, day: 1, title, description, kind, subject, route, prerequisite, guideSelector });
}

// Stable IDs preserve already earned rewards; every new lesson now requires a
// real command or a completed physical production/delivery event.
export const LEGACY_TUTORIAL_LESSONS = Object.freeze([
  lesson('rules-read', 1, 'Send one resident to the Farm', 'Open the Farm and press +1 to assign a farmer. The highlighted control is your first real island action.', 'action', 'assign-farm', 'farm', null, '[data-worker-building="farm"][data-worker-delta="1"]'),
  lesson('island-map', 2, 'Assign a Warehouse carrier', 'Open the Warehouse and assign one carrier. Carriers bring local products into central storage.', 'action', 'assign-warehouse', 'warehouse', 'rules-read', '[data-worker-building="warehouse"][data-worker-delta="1"]'),
  lesson('first-job', 3, 'Start the Windmill crew', 'Assign one resident to the Windmill. Each Food needs two Grain from available central stock.', 'action', 'assign-windmill', 'windmill', 'island-map', '[data-worker-building="windmill"][data-worker-delta="1"]'),
  lesson('food-check', 4, 'Start gathering Wood', 'Assign one resident to the Lumber Camp so construction has a continuing source of Wood.', 'action', 'assign-lumber', 'lumber', 'first-job', '[data-worker-building="lumber"][data-worker-delta="1"]'),
  lesson('townhall-upgrade', 5, 'Start your Town Hall upgrade', 'Collect the one-time supplies, then order the Town Hall upgrade. You may spend bonus materials even when ordinary storage is full.', 'action', 'upgrade-townhall', 'townhall', 'food-check', '[data-upgrade-building="townhall"]'),
  lesson('happiness-action', 6, 'Make your residents happier', 'Give House happiness points, grant a blessing or purchase an attraction. Complete one real happiness action.', 'action', 'increase-happiness', 'house', 'townhall-upgrade', '[data-house-everyone]'),
  lesson('workplace-journey', 7, 'Start gathering Stone', 'Assign one resident to the Quarry. Walking residents no longer receive the unemployment penalty, and start paying tax after arrival.', 'action', 'assign-quarry', 'quarry', 'happiness-action', '[data-worker-building="quarry"][data-worker-delta="1"]'),
  lesson('resources-dock', 8, 'Start making Planks', 'Assign one resident to the Sawmill. The worker consumes two central Wood when each Plank is finished.', 'action', 'assign-sawmill', 'sawmill', 'workplace-journey', '[data-worker-building="sawmill"][data-worker-delta="1"]'),
  lesson('transport-priority', 9, 'Choose a transport priority', 'Choose a numbered material or Construction priority in the Warehouse.', 'action', 'transport-priority', 'warehouse', 'resources-dock', '[data-priority-resource]'),
  lesson('first-delivery', 10, 'Receive a real delivery', 'Wait for a carrier to finish a delivery into central storage. Opening a panel does not complete this step.', 'condition', 'delivery', 'warehouse', 'transport-priority'),
  lesson('storage-limits', 11, 'Add another carrier', 'Assign one more Warehouse carrier to improve delivery throughput. This needs a new assignment for this lesson.', 'action', 'assign-warehouse', 'warehouse', 'first-delivery', '[data-worker-building="warehouse"][data-worker-delta="1"]'),
  lesson('food-chain', 12, 'Finish a processed product', 'Let a Windmill or Sawmill worker finish one product. Actual production completes this step automatically.', 'condition', 'crafted', 'windmill', 'storage-limits'),
  lesson('house-points', 13, 'Use House happiness points', 'Allocate House happiness points to a resident or to everyone. The daily pool renews at Warsaw midnight.', 'action', 'house-points', 'house', 'food-chain', '[data-house-allocate]'),
  lesson('personal-happiness', 14, 'Choose your notifications', 'Change one notification category in Settings. Your selection also controls the bell count.', 'action', 'notification-filter', 'settings', 'house-points', '[data-notification-category]'),
  lesson('upgrade-cost', 15, 'Upgrade the Farm', 'After the Town Hall permits it, order a Farm upgrade using your available materials.', 'action', 'upgrade-farm', 'farm', 'personal-happiness', '[data-upgrade-building="farm"]'),
  lesson('construction-queue', 16, 'Order more housing', 'Order a House upgrade. Active projects and queued projects have separate limits.', 'action', 'upgrade-house', 'house', 'upgrade-cost', '[data-upgrade-building="house"]'),
  lesson('path-upgrade', 17, 'Improve one path section', 'Spend 100 Stone on one path section. Complete the current path level before starting the next.', 'action', 'upgrade-road', 'paths', 'construction-queue', '[data-upgrade-road]'),
  lesson('daily-attractions', 18, 'Purchase one attraction', 'Choose an affordable attraction. Only one new attraction may be active at a time.', 'action', 'buy-attraction', 'decorations', 'path-upgrade', '[data-buy-attraction]'),
  lesson('chapel-blessing', 19, 'Activate a Chapel blessing', 'Activate an available free or paid blessing. One free use renews each Warsaw day without accumulation.', 'action', 'chapel-blessing', 'chapel', 'daily-attractions', '[data-blessing]'),
  lesson('market-rules', 20, 'Send goods to the Market', 'At Town Hall level 2 or higher, order a real delivery to the Market. Its workers carry the goods.', 'action', 'market-order', 'market', 'chapel-blessing', '[data-market-order]'),
  lesson('lighthouse-visits', 21, 'Start rebuilding the Lighthouse', 'Order the next Lighthouse level. Completing the upgrade grants the island a temporary bonus.', 'action', 'upgrade-lighthouse', 'lighthouse', 'market-rules', '[data-upgrade-building="lighthouse"]'),
  lesson('lighthouse-task', 22, 'Accept one task', 'Confirm a task after checking its cost and deadline. Only one can be active at a time.', 'action', 'task-accept', 'tasks', 'lighthouse-visits', '[data-task-accept]'),
  lesson('expedition-rules', 23, 'Try an expedition', 'Start your chosen minigame. Tutorial rewards wait until the expedition is over.', 'action', 'expedition-play', 'expeditions', 'lighthouse-task', '[data-expedition-choice]'),
  lesson('returning-workers', 24, 'Release a worker safely', 'After finishing the expedition, release a worker. A loaded carrier finishes the delivery and then walks Home.', 'action', 'release-worker', 'workers', 'expedition-rules', '[data-worker-building][data-worker-delta="-1"]'),
  lesson('island-review', 25, 'Donate to your accepted task', 'Donate an available material to the task you accepted. This real contribution completes your introduction.', 'action', 'task-deposit', 'tasks', 'returning-workers', '[data-task-deposit]')
]);
function balancedLesson(id, index, title, titlePl, description, descriptionPl, kind, subject, route, rewardKind = 'small', fundBuilding = null, guideSelector = '') {
  return Object.freeze({ id, index, day: 1, title, titlePl, description, descriptionPl, kind, subject, route, rewardKind, fundBuilding,
    goalLevel: subject.startsWith('upgrade-') && subject !== 'upgrade-road' ? subject === 'upgrade-lighthouse' ? 1 : subject === 'upgrade-townhall' && index > 5 ? 3 : 2 : null,
    prerequisite: index > 1 ? LEGACY_TUTORIAL_LESSONS[index - 2].id : null, guideSelector });
}
// A new course spends its building supplies before the next large award. Its
// IDs remain stable, while the previous course is retained for existing saves.
export const TUTORIAL_LESSONS = Object.freeze([
  balancedLesson('rules-read', 1, 'Assign a farmer and read the resource cards', 'Przydziel rolnika i poznaj karty zasobów', 'Assign one farmer. A resource card such as Stone 0 / 537 (0), +0/h means 0 local, 537 central, 0 in transit and a current net balance of 0 per hour.', 'Przydziel rolnika. Karta „Kamień 0 / 537 (0), +0/h” oznacza: 0 w magazynie lokalnym, 537 w centralnym, 0 w transporcie i bieżący bilans 0 sztuk na godzinę.', 'action', 'assign-farm', 'farm', 'small', null, '[data-worker-building="farm"][data-worker-delta="1"]'),
  balancedLesson('island-map', 2, 'Assign a Warehouse carrier', 'Przydziel tragarza do Magazynu', 'Assign one carrier to collect production and deliver building supplies. Your previous reward is already in central storage.', 'Przydziel tragarza, który odbierze produkcję i zawiezie materiały na budowy. Poprzednia premia jest już w magazynie centralnym.', 'action', 'assign-warehouse', 'warehouse', 'small', null, '[data-worker-building="warehouse"][data-worker-delta="1"]'),
  balancedLesson('first-job', 3, 'Assign a lumber worker', 'Przydziel drwala', 'Assign one Lumber Camp worker. Actions performed when taught grant a small immediate reward or funds for the next real upgrade. Actions already performed independently remove their step without a reward.', 'Przydziel jednego drwala. Działania wykonane według bieżącej lekcji dają małą premię od razu albo środki na następną rozbudowę. Kroki wykonane wcześniej samodzielnie znikają bez premii.', 'action', 'assign-lumber', 'lumber', 'small', null, '[data-worker-building="lumber"][data-worker-delta="1"]'),
  balancedLesson('food-check', 4, 'Assign a Windmill worker', 'Przydziel pracownika Młyna', 'A Windmill worker turns two central Grain into one Food. Residents consume Food, so production and delivery both matter.', 'Pracownik Młyna zamienia dwie sztuki zboża z centrali w jedną żywność. Mieszkańcy jedzą, dlatego potrzebna jest i produkcja, i dostawa.', 'action', 'assign-windmill', 'windmill', 'small', null, '[data-worker-building="windmill"][data-worker-delta="1"]'),
  balancedLesson('townhall-upgrade', 5, 'Order Town Hall level 2', 'Zleć Ratusz na poziom 2', 'Collect the one-time building budget, then order the Town Hall upgrade. Resources are reserved now and physically leave storage when carriers pick them up.', 'Odbierz jednorazowy budżet budowy i zleć rozbudowę Ratusza. Zasoby zostaną zarezerwowane, a fizycznie opuszczą magazyn po odebraniu przez tragarzy.', 'action', 'upgrade-townhall', 'townhall', 'coins', null, '[data-upgrade-building="townhall"]'),
  balancedLesson('happiness-action', 6, 'Prioritize construction transport', 'Nadaj priorytet transportowi na budowę', 'Choose Construction as a Warehouse priority so carriers supply the Town Hall instead of continually collecting production.', 'Wybierz Budowę jako priorytet Magazynu, aby tragarze dostarczali materiały do Ratusza zamiast stale odbierać produkcję.', 'action', 'transport-priority', 'warehouse', 'small', null, '[data-warehouse-priority="construction"]'),
  balancedLesson('workplace-journey', 7, 'Assign a Quarry worker', 'Przydziel kamieniarza', 'Assign a Quarry worker while the Town Hall is being built. After walking to work, fed workers produce and pay tax.', 'Przydziel pracownika Kamieniołomu, gdy Ratusz jest rozbudowywany. Po dojściu do pracy najedzeni pracownicy produkują i płacą podatki.', 'action', 'assign-quarry', 'quarry', 'small', null, '[data-worker-building="quarry"][data-worker-delta="1"]'),
  balancedLesson('resources-dock', 8, 'Finish Town Hall level 2', 'Dokończ Ratusz na poziomie 2', 'Wait for actual delivery and construction. The reward supplies only the missing budget for the Quarry upgrade.', 'Poczekaj na rzeczywistą dostawę i budowę. Premia uzupełni tylko brakujący budżet rozbudowy Kamieniołomu.', 'condition', 'building-townhall-2', 'townhall', 'supply', 'quarry'),
  balancedLesson('transport-priority', 9, 'Upgrade the Quarry', 'Rozbuduj Kamieniołom', 'Spend the supplied Wood and Stone on a real Quarry upgrade. The following reward is Coins rather than another large material chest.', 'Wydaj dostarczone drewno i kamień na prawdziwą rozbudowę Kamieniołomu. Następna premia to monety zamiast kolejnej wielkiej skrzyni materiałów.', 'action', 'upgrade-quarry', 'quarry', 'coins', null, '[data-upgrade-building="quarry"]'),
  balancedLesson('first-delivery', 10, 'Assign a Sawmill worker', 'Przydziel pracownika Tartaku', 'Assign a Sawmill worker. Two central Wood become one Plank; the resource card shows the product waiting locally until a carrier collects it.', 'Przydziel pracownika Tartaku. Dwie sztuki centralnego drewna dają jedną deskę; karta zasobu pokazuje produkt czekający lokalnie na tragarza.', 'action', 'assign-sawmill', 'sawmill', 'small', null, '[data-worker-building="sawmill"][data-worker-delta="1"]'),
  balancedLesson('storage-limits', 11, 'Assign a second carrier', 'Przydziel drugiego tragarza', 'Assign one more Warehouse carrier so building deliveries and production collection can progress together.', 'Przydziel kolejnego tragarza Magazynu, aby dostawy na budowę i odbieranie produkcji mogły postępować równolegle.', 'action', 'assign-warehouse', 'warehouse', 'small', null, '[data-worker-building="warehouse"][data-worker-delta="1"]'),
  balancedLesson('food-chain', 12, 'Finish the Quarry upgrade', 'Dokończ rozbudowę Kamieniołomu', 'Finish the actual Quarry construction. This releases the previous budget before a reward funds a larger Warehouse.', 'Dokończ prawdziwą budowę Kamieniołomu. Poprzedni budżet zostanie zużyty, zanim premia sfinansuje większy Magazyn.', 'condition', 'building-quarry-2', 'quarry', 'supply', 'warehouse'),
  balancedLesson('house-points', 13, 'Upgrade the Warehouse', 'Rozbuduj Magazyn', 'Order Warehouse level 2. Its ordinary capacity increases from 4,000 to 6,000 materials, with a separate limit for each resource.', 'Zleć Magazyn na poziom 2. Zwykła pojemność wzrośnie z 4000 do 6000 materiałów, z osobnym limitem każdego zasobu.', 'action', 'upgrade-warehouse', 'warehouse', 'coins', null, '[data-upgrade-building="warehouse"]'),
  balancedLesson('personal-happiness', 14, 'Use daily House happiness', 'Rozdaj dobowe szczęście Domu', 'Give House happiness points to residents. The pool renews at Warsaw midnight; happiness determines arrivals or departures.', 'Rozdaj mieszkańcom punkty szczęścia Domu. Pula odnawia się o północy Warszawy; od szczęścia zależy przybywanie lub odchodzenie ludzi.', 'action', 'house-points', 'house', 'small', null, '[data-house-everyone]'),
  balancedLesson('upgrade-cost', 15, 'Finish the Warehouse upgrade', 'Dokończ rozbudowę Magazynu', 'Let the Warehouse construction finish. Your next reward covers the missing Farm upgrade budget.', 'Pozwól zakończyć budowę Magazynu. Kolejna premia pokryje brakujący budżet rozbudowy Gospodarstwa.', 'condition', 'building-warehouse-2', 'warehouse', 'supply', 'farm'),
  balancedLesson('construction-queue', 16, 'Upgrade the Farm', 'Rozbuduj Gospodarstwo', 'Spend Wood, Stone and Grain on a real Farm upgrade. The reward reserves the next 100 Stone for a path section.', 'Wydaj drewno, kamień i zboże na prawdziwą rozbudowę Gospodarstwa. Premia zapewni następne 100 kamienia na odcinek ścieżki.', 'action', 'upgrade-farm', 'farm', 'road', null, '[data-upgrade-building="farm"]'),
  balancedLesson('path-upgrade', 17, 'Improve a path section', 'Ulepsz odcinek ścieżki', 'Spend 100 Stone to improve one path section. Paths independently improve transport speed.', 'Wydaj 100 kamienia na odcinek ścieżki. Ścieżki niezależnie poprawiają szybkość transportu.', 'action', 'upgrade-road', 'paths', 'small', null, '[data-upgrade-road]'),
  balancedLesson('daily-attractions', 18, 'Buy an attraction', 'Kup atrakcję', 'Spend Coins on an affordable happiness attraction. Its price, audience and duration are shown before purchase.', 'Wydaj monety na dostępną atrakcję poprawiającą szczęście. Przed zakupem widzisz cenę, odbiorców i czas działania.', 'action', 'buy-attraction', 'decorations', 'coins', null, '[data-buy-attraction]'),
  balancedLesson('chapel-blessing', 19, 'Receive a Chapel blessing', 'Odbierz błogosławieństwo Kaplicy', 'Activate a free or paid blessing. Its bonus materials remain spendable, and the next Town Hall upgrade will use them.', 'Udziel darmowego lub płatnego błogosławieństwa. Materiały bonusowe pozostają wydawalne, a następna rozbudowa Ratusza je wykorzysta.', 'action', 'chapel-blessing', 'chapel', 'coins', null, '[data-blessing]'),
  balancedLesson('market-rules', 20, 'Finish the Farm upgrade', 'Dokończ rozbudowę Gospodarstwa', 'After the Farm finishes, the reward supplies only what is missing for Town Hall level 3.', 'Po zakończeniu Gospodarstwa premia dostarczy tylko tego, czego brakuje do Ratusza na poziomie 3.', 'condition', 'building-farm-2', 'farm', 'supply', 'townhall'),
  balancedLesson('lighthouse-visits', 21, 'Order Town Hall level 3', 'Zleć Ratusz na poziom 3', 'Spend your stored materials, including blessing bonuses, on Town Hall level 3. The population prerequisite starts with the later upgrade from 3 to 4.', 'Wydaj zgromadzone zasoby, w tym premie błogosławieństwa, na Ratusz 3. Warunek populacji dotyczy dopiero następnej rozbudowy z 3 na 4.', 'action', 'upgrade-townhall', 'townhall', 'coins', null, '[data-upgrade-building="townhall"]'),
  balancedLesson('lighthouse-task', 22, 'Finish Town Hall level 3', 'Dokończ Ratusz na poziomie 3', 'Wait for the Town Hall upgrade. Its reward covers only missing Lighthouse construction supplies.', 'Poczekaj na zakończenie Ratusza. Premia pokryje tylko brakujące materiały do odbudowy Latarni.', 'condition', 'building-townhall-3', 'townhall', 'supply', 'lighthouse'),
  balancedLesson('expedition-rules', 23, 'Start rebuilding the Lighthouse', 'Rozpocznij odbudowę Latarni', 'Commit the supplied materials to Lighthouse level 1. This large construction spends the last building budget.', 'Przeznacz dostarczone materiały na Latarnię 1. Ta duża budowa zużyje ostatni budżet budowlany.', 'action', 'upgrade-lighthouse', 'lighthouse', 'coins', null, '[data-upgrade-building="lighthouse"]'),
  balancedLesson('returning-workers', 24, 'Finish the Lighthouse', 'Dokończ Latarnię', 'Finish delivery and construction. Receive the remaining tutorial rewards before final storage settlement; independently completed steps need no reward.', 'Zakończ dostawy i budowę. Przed końcowym rozliczeniem magazynu odbierz pozostałe premie samouczka; kroki wykonane samodzielnie nie wymagają premii.', 'condition', 'building-lighthouse-1', 'lighthouse', 'coins'),
  balancedLesson('island-review', 25, 'Finish with a full Warehouse', 'Zakończ z pełnym Magazynem', 'Review the final reward, then finish the tutorial. Free ordinary capacity is filled immediately; external bonus stock must first be spent on real island actions.', 'Sprawdź nagrodę końcową i zakończ samouczek. Wolna zwykła pojemność zostanie uzupełniona od razu; dodatkowe premie spoza kursu najpierw wydaj na prawdziwe działania wyspy.', 'action', 'finish-tutorial', 'tutorial', 'final', null, '[data-finish-tutorial]')
]);
const lessonsFor = state => state.tutorial?.curriculum === 3 ? LEGACY_TUTORIAL_LESSONS : TUTORIAL_LESSONS;
const achievedUpgradeTarget = (state, item) => item.subject.startsWith('upgrade-') && item.subject !== 'upgrade-road' &&
  whole(state.buildings?.[item.subject.slice(8)]?.level) >= (item.goalLevel || ({ townhall: 2, farm: 2, house: 2, lighthouse: 1 })[item.subject.slice(8)] || Infinity);
const LEGACY_IDS = ['island-level', 'residents-home', 'first-job', 'workplace-journey', 'resources-dock', 'warehouse-job', 'first-delivery', 'transport-priority', 'food-chain', 'central-food', 'personal-happiness', 'house-points', 'upgrade-cost', 'construction-queue', 'storage-limits', 'market-rules', 'lighthouse-visits', 'lighthouse-task', 'path-levels', 'daily-attractions', 'chapel-blessing', 'expedition-rules', 'returning-workers', 'motion-setting', 'island-review'];
const LEGACY_MAPPING = Object.fromEntries(TUTORIAL_LESSONS.filter(item => LEGACY_IDS.includes(item.id)).map(item => [item.id, item.id]));
Object.assign(LEGACY_MAPPING, { 'island-level': 'rules-read', 'central-food': 'food-check' });
// A former reading exercise is not a new real gameplay action.
delete LEGACY_MAPPING['expedition-rules'];
const TUTORIAL_EVENT_IDS = ['assign-producer', 'assign-warehouse', 'transport-priority', 'task-accept', 'release-worker', 'motion-setting', 'upgrade-townhall', 'increase-happiness', 'upgrade-road', 'expedition-play', 'assign-farm', 'assign-windmill', 'assign-lumber', 'assign-quarry', 'assign-sawmill', 'house-points', 'notification-filter', 'upgrade-farm', 'upgrade-house', 'buy-attraction', 'chapel-blessing', 'market-order', 'upgrade-lighthouse', 'task-deposit'];
function normalizedTrueMap(source, allowed = TUTORIAL_LESSONS.map(item => item.id)) {
  return Object.fromEntries(allowed.filter(id => source?.[id] === true).map(id => [id, true]));
}
const ACTION_SUBJECTS = [...new Set([...TUTORIAL_LESSONS, ...LEGACY_TUTORIAL_LESSONS].filter(item => item.kind === 'action').map(item => item.subject))].filter(subject => subject !== 'finish-tutorial');
const prioritySignature = state => JSON.stringify(state.warehousePriorities || []);
const notificationSignature = state => JSON.stringify(Object.entries(state.settings?.notificationCategories || {}).sort(([a], [b]) => a.localeCompare(b)));
function lessonResolved(tutorial, id) {
  const chest = tutorial.chests?.[id];
  return tutorial.skippedLessons?.[id] === true || tutorial.completed?.[id] === true && tutorial.claimed?.[id] === true && (chest?.skipped || chest?.shared);
}
function prerequisiteReady(state, item) {
  return !item.prerequisite || state.tutorial.completed[item.prerequisite] === true && (state.tutorial.curriculum !== 4 || lessonResolved(state.tutorial, item.prerequisite));
}
function skipKnownLesson(state, item) {
  // A rolled or paid reward is history. Independent later actions never remove it.
  if (state.tutorial.completed[item.id] || state.tutorial.claimed[item.id] || state.tutorial.chests[item.id]) return false;
  state.tutorial.skippedLessons[item.id] = true;
  state.tutorial.completed[item.id] = true;
  return true;
}
function tutorialRandom(state) {
  let value = state.tutorial.seed >>> 0;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  state.tutorial.seed = value >>> 0 || 1;
  return state.tutorial.seed / 0x100000000;
}
function chestReward(state, item = null) {
  if (state.tutorial?.curriculum === 4) return { coins: item?.rewardKind === 'small' ? 100 : 200 };
  return Object.fromEntries(MATERIALS.map(id => [id, TUTORIAL_CHEST_MIN + Math.floor(tutorialRandom(state) * (TUTORIAL_CHEST_MAX - TUTORIAL_CHEST_MIN + 1))]));
}
function normalizeTutorial(state, tutorial, now) {
  const modern = [TUTORIAL_VERSION, 3, 2].includes(tutorial.version);
  const unversionedHistory = !tutorial.version && [tutorial.completed, tutorial.claimed, tutorial.chests, tutorial.legacy].some(value => plain(value) && Object.keys(value).length > 0);
  const curriculum = tutorial.curriculum === 3 || tutorial.version === 3 || tutorial.version === 2 || tutorial.version && !modern || unversionedHistory ? 3 : 4;
  const archived = modern && plain(tutorial.legacy) ? tutorial.legacy : tutorial;
  const legacy = { completed: normalizedTrueMap(archived.completed, LEGACY_IDS), claimed: normalizedTrueMap(archived.claimed, LEGACY_IDS), events: normalizedTrueMap(archived.events, [...LEGACY_IDS, ...TUTORIAL_EVENT_IDS]) };
  const completed = modern ? normalizedTrueMap(tutorial.completed) : {};
  const claimed = modern ? normalizedTrueMap(tutorial.claimed) : {};
  if (!modern) for (const [oldId, id] of Object.entries(LEGACY_MAPPING)) {
    if (legacy.completed[oldId]) completed[id] = true;
    if (legacy.claimed[oldId]) { claimed[id] = true; completed[id] = true; }
  }
  const allowedEvents = [...TUTORIAL_EVENT_IDS, ...TUTORIAL_LESSONS.map(item => item.id), ...TUTORIAL_LESSONS.flatMap(item => ['home', 'rules', 'map', 'residents', 'workers', 'resources', 'warehouse', 'windmill', 'house', 'house-happiness', 'building', 'farm', 'construction', 'paths', 'decorations', 'chapel', 'market', 'lighthouse'].map(subject => `visit:${item.id}:${subject}`))];
  const events = [TUTORIAL_VERSION, 3].includes(tutorial.version) ? normalizedTrueMap(tutorial.events, allowedEvents) : {};
  const seed = whole(tutorial.seed) >>> 0 || ((Math.floor(now) ^ 0x6b92d34f) >>> 0) || 1;
  state.tutorial = { version: TUTORIAL_VERSION, curriculum, activeDays: dayList(tutorial.activeDays).filter(day => day <= warsawDayKey(now)).slice(0, 5), completed, claimed, events, seed,
    conditionBaselines: Object.fromEntries(['collected','crafted'].filter(key => Object.hasOwn(tutorial.conditionBaselines || {}, key)).map(key => [key, whole(tutorial.conditionBaselines[key])])),
    chests: {}, legacy, settled: tutorial.settled === true, rewardDisabled: tutorial.rewardDisabled === true,
    buildingSuppliesClaimed: tutorial.buildingSuppliesClaimed === true, autoOpenDisabled: tutorial.autoOpenDisabled === true || tutorial.rewardDisabled === true };
  state.tutorial.skippedLessons = normalizedTrueMap(tutorial.skippedLessons);
  const ledger = plain(tutorial.actionLedger) ? tutorial.actionLedger : {};
  state.tutorial.actionLedger = { version: 1,
    counts: Object.fromEntries(ACTION_SUBJECTS.filter(subject => whole(ledger.counts?.[subject]) > 0).map(subject => [subject, whole(ledger.counts[subject])])),
    tradeReceipts: [...new Set((Array.isArray(ledger.tradeReceipts) ? ledger.tradeReceipts : []).map(textId).filter(Boolean))].slice(-100),
    priorities: typeof ledger.priorities === 'string' ? ledger.priorities : prioritySignature(state),
    notificationCategories: typeof ledger.notificationCategories === 'string' ? ledger.notificationCategories : notificationSignature(state) };
  for (const item of lessonsFor(state)) {
    if (state.tutorial.skippedLessons[item.id] && !claimed[item.id] && !tutorial.chests?.[item.id]) { completed[item.id] = true; continue; }
    delete state.tutorial.skippedLessons[item.id];
    if (claimed[item.id]) completed[item.id] = true;
    const source = modern && plain(tutorial.chests?.[item.id]) ? tutorial.chests[item.id] : null;
    if (!source) continue;
    const reward = curriculum === 4 ? Object.fromEntries(['coins', ...MATERIALS].filter(id => finite(source.reward?.[id]) && source.reward[id] >= 0 && source.reward[id] <= Number.MAX_SAFE_INTEGER).map(id => [id, source.reward[id]])) :
      Object.fromEntries(MATERIALS.filter(id => Number.isInteger(source.reward?.[id]) && source.reward[id] >= TUTORIAL_CHEST_MIN && source.reward[id] <= TUTORIAL_CHEST_MAX).map(id => [id, source.reward[id]]));
    if (curriculum === 3 && Object.keys(reward).length !== MATERIALS.length) continue;
    state.tutorial.chests[item.id] = { reward, quotePending: curriculum === 4 && source.quotePending === true, claimed: claimed[item.id] === true, shared: source.shared === true && claimed[item.id] === true,
      skipped: source.skipped === true && source.shared !== true && claimed[item.id] === true, seen: source.seen === true };
  }
  if (modern && tutorial.version && ledger.version !== 1 && !state.tutorial.rewardDisabled && !introductionPending(state)) migrateKnownTutorialActions(state);
}

function migrateKnownTutorialActions(state) {
  const tutorial = state.tutorial, lessons = lessonsFor(state), counts = tutorial.actionLedger.counts;
  const known = (subject, count = 1) => {
    const spent = lessons.filter(item => item.subject === subject && tutorial.completed[item.id]).length;
    counts[subject] = Math.max(whole(counts[subject]), count);
    for (const item of lessons.filter(item => item.subject === subject && !tutorial.completed[item.id]).slice(0, Math.max(0, count - spent))) skipKnownLesson(state, item);
  };
  for (const building of [...PRODUCERS, 'warehouse']) {
    const assigned = (state.residents || []).filter(person => person.workplace === building && !person.pendingRelease).length;
    if (assigned > 0) known(`assign-${building}`, assigned);
  }
  // Manual and automatic House allocations share a notification kind, but the
  // automatic message explicitly says "remaining". Pool depletion alone is
  // not proof of a player's action and is deliberately not migrated.
  if ((state.notifications || []).some(item => item.kind === 'house-happiness' && (/^\d+ happiness points were given to \d+ residents\.$/.test(item.message) || /^Resident \d+ received \d+ happiness points\.$/.test(item.message)))) { known('house-points'); known('increase-happiness'); }
  if (state.dailyBlessingDay || whole(state.blessingsUsed) > 0) { known('chapel-blessing'); known('increase-happiness'); }
  if (whole(state.paths) > 0 || (state.roads?.segments || []).some(level => whole(level) > 0)) known('upgrade-road');
  if ((state.warehousePriorities || []).length) known('transport-priority');
  if (Object.keys(state.settings?.notificationCategories || {}).length) known('notification-filter');
  for (const item of lessons) {
    if (!item.subject.startsWith('upgrade-') || item.subject === 'upgrade-road') continue;
    const building = item.subject.slice(8), target = item.goalLevel || whole(state.buildings?.[building]?.level) + 1;
    if ((state.constructionProjects || []).some(project => project.building === building && project.stage !== 'planned' && whole(project.targetLevel) === target)) skipKnownLesson(state, item);
  }
}

function ensure(state) {
  if (!plain(state.engagement) || !plain(state.tutorial) || state.tutorial.version !== TUTORIAL_VERSION || !plain(state.tutorial.conditionBaselines) || !plain(state.tutorial.skippedLessons) || !plain(state.tutorial.actionLedger) || !plain(state.socialRewards) || !plain(state.referrals) || !plain(state.loyalty)) normalizeProgression(state, state);
}

function normalizeLoyaltyReward(value) {
  if (!plain(value)) return null;
  if (!LOYALTY_RESOURCES.every(id => Number.isInteger(value[id]) && value[id] >= LOYALTY_REWARD_MIN && value[id] <= LOYALTY_REWARD_MAX)) return null;
  return Object.fromEntries(LOYALTY_RESOURCES.map(id => [id, value[id]]));
}
function loyaltyReward(state) {
  const loyalty = state.loyalty;
  return Object.fromEntries(LOYALTY_RESOURCES.map(id => {
    let seed = loyalty.seed >>> 0 || 1;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    loyalty.seed = seed >>> 0 || 1;
    return [id, LOYALTY_REWARD_MIN + Math.floor(loyalty.seed / 0x100000000 * (LOYALTY_REWARD_MAX - LOYALTY_REWARD_MIN + 1))];
  }));
}

export function normalizeProgression(state, raw = {}) {
  const saved = raw === state ? structuredClone({ engagement: raw.engagement, tutorial: raw.tutorial, socialRewards: raw.socialRewards, referrals: raw.referrals, loyalty: raw.loyalty }) : raw;
  const now = nowOf(state), engagement = plain(saved.engagement) ? saved.engagement : {};
  const firstAnchorAt = Math.min(now, nonnegative(engagement.firstAnchorAt, now));
  const lastActionAt = Math.min(now, nonnegative(engagement.lastActionAt));
  const lastRealActivityAt = Math.min(now, nonnegative(engagement.lastRealActivityAt, lastActionAt || firstAnchorAt));
  const activeUntil = Math.min(nonnegative(engagement.activeUntil), lastActionAt + ACTIVE_PLAY_SECONDS * 1000);
  state.engagement = { firstAnchorAt, lastActionAt, lastRealActivityAt, activeUntil: activeUntil > now ? activeUntil : 0 };
  const tutorial = plain(saved.tutorial) ? saved.tutorial : {};
  normalizeTutorial(state, tutorial, now);
  const social = plain(saved.socialRewards) ? saved.socialRewards : {};
  const publicationIds = [...new Set((Array.isArray(social.publicationIds) ? social.publicationIds : []).map(textId).filter(Boolean))];
  const postDays = dayList(social.postDays).filter(day => day <= warsawDayKey(now));
  state.socialRewards = { accountId: textId(social.accountId), firstShareClaimed: social.firstShareClaimed === true,
    levelShares: [...new Set((Array.isArray(social.levelShares) ? social.levelShares : []).filter(level => Number.isInteger(level) && level >= 2 && level <= 100))].sort((a, b) => a - b),
    publicationIds, postDays, thirdPostRewards: [...new Set((Array.isArray(social.thirdPostRewards) ? social.thirdPostRewards : []).filter(number => Number.isInteger(number) && number > 0 && number % 3 === 0 && number <= postDays.length))].sort((a, b) => a - b)
  };
  const referrals = plain(saved.referrals) ? saved.referrals : {};
  const entries = [], seen = new Set();
  for (const entry of Array.isArray(referrals.entries) ? referrals.entries : []) {
    if (!plain(entry) || !textId(entry.accountId) || !textId(entry.inviterId) || seen.has(entry.accountId) || !finite(entry.registeredAt) || entry.registeredAt < 0 || entry.registeredAt > now) continue;
    seen.add(entry.accountId);
    const endDay = warsawDayKey(entry.registeredAt + REFERRAL_WINDOW_SECONDS * 1000);
    entries.push({ accountId: entry.accountId, inviterId: entry.inviterId, registeredAt: entry.registeredAt,
      firstLoginPaid: entry.firstLoginPaid === true, firstLoginAt: finite(entry.firstLoginAt) ? Math.max(entry.registeredAt, Math.min(now, entry.firstLoginAt)) : null,
      activeDays: dayList(entry.activeDays).filter(day => day >= warsawDayKey(entry.registeredAt) && day <= warsawDayKey(now) && day <= endDay),
      thirdDayPaid: entry.thirdDayPaid === true,
      expired: entry.expired === true || now >= entry.registeredAt + REFERRAL_WINDOW_SECONDS * 1000 });
  }
  state.referrals = { ownerId: textId(referrals.ownerId), entries };
  const loyalty = plain(saved.loyalty) ? saved.loyalty : {};
  const claimedDays = [...new Set((Array.isArray(loyalty.claimedDays) ? loyalty.claimedDays : []).filter(day => Number.isInteger(day) && day >= 1 && day <= 10))].sort((a, b) => a - b);
  const reachedLevel = townLevel(state) >= 4;
  state.loyalty = { lastDay: validDay(loyalty.lastDay) ? loyalty.lastDay : null,
    streak: Math.min(10, whole(loyalty.streak)), claimedDays,
    closed: loyalty.closed === true || reachedLevel || claimedDays.length >= 10,
    closedReason: loyalty.closed === true && ['townhall-level-4', 'ten-rewards'].includes(loyalty.closedReason) ? loyalty.closedReason : reachedLevel ? 'townhall-level-4' : claimedDays.length >= 10 ? 'ten-rewards' : null,
    rewardConfigured: true, seed: whole(loyalty.seed, (now ^ 0x20c6ba91) >>> 0) >>> 0 || 1,
    lastClaimedDay: validDay(loyalty.lastClaimedDay) ? loyalty.lastClaimedDay : null,
    pendingDay: validDay(loyalty.pendingDay) ? loyalty.pendingDay : null,
    pendingReward: normalizeLoyaltyReward(loyalty.pendingReward),
    receivedRewards: plain(loyalty.receivedRewards) ? Object.fromEntries(Object.entries(loyalty.receivedRewards).filter(([day, reward]) => validDay(day) && normalizeLoyaltyReward(reward)).slice(-10).map(([day, reward]) => [day, normalizeLoyaltyReward(reward)])) : {} };
  completeLessons(state);
  return state;
}

export function activePlayMultiplier(state) {
  const now = nowOf(state), engagement = state.engagement || {};
  if (nonnegative(engagement.activeUntil) > now + EPS) return 2;
  const last = nonnegative(engagement.lastRealActivityAt, nonnegative(engagement.firstAnchorAt, now));
  return now >= last + ABANDONED_PLAY_SECONDS * 1000 - EPS ? 0.5 : 1;
}

export function engagementStatus(state) {
  const remaining = Math.max(0, (nonnegative(state.engagement?.activeUntil) - nowOf(state)) / 1000);
  return { active: remaining > EPS, multiplier: activePlayMultiplier(state), remaining,
    lastActionAt: nonnegative(state.engagement?.lastActionAt), lastRealActivityAt: nonnegative(state.engagement?.lastRealActivityAt),
    abandoned: activePlayMultiplier(state) === 0.5 };
}

export function registerMeaningfulActivity(state, activity = {}) {
  if (introductionPending(state)) return false;
  if (activity.type === 'heartbeat' || activity.meaningful === false || activity.visible !== true || activity.focused !== true) return false;
  ensure(state);
  const now = nowOf(state), day = warsawDayKey(now);
  state.engagement.lastActionAt = now;
  state.engagement.lastRealActivityAt = now;
  state.engagement.activeUntil = Math.min(Number.MAX_SAFE_INTEGER, now + ACTIVE_PLAY_SECONDS * 1000);
  state.lastMeaningfulActivityAt = nonnegative(state.activityClock);
  if (state.tutorial.activeDays.length < 5 && !state.tutorial.activeDays.includes(day)) state.tutorial.activeDays.push(day);
  // A continuously open session can enter a new Warsaw day without a fresh
  // authentication event. Only actual input records that day's visit.
  if (state.loyalty.lastDay !== day) recordProgressionLogin(state, now);
  completeLessons(state);
  return true;
}

function lessonRequirement(state, item) {
  const events = state.tutorial.events;
  if (state.tutorial.curriculum === 4 && item.goalLevel && whole(state.buildings?.[item.subject.slice(8)]?.level) >= item.goalLevel) return true;
  if (item.subject.startsWith('building-')) {
    const [, building, level] = item.subject.split('-');
    return whole(state.buildings?.[building]?.level) >= Number(level);
  }
  if (item.subject === 'delivery') return (state.statistics?.collected || 0) > (state.tutorial.conditionBaselines.collected || 0);
  if (item.subject === 'crafted') return (state.statistics?.crafted || 0) > (state.tutorial.conditionBaselines.crafted || 0);
  return events[item.id] === true;
}
function hasVisit(state, item) {
  const events = state.tutorial.events;
  const visited = subject => events[`visit:${item.id}:${subject}`] === true;
  if (item.id === 'rules-read') return visited('home') && visited('rules');
  if (item.id === 'food-check') return (visited('residents') || visited('workers')) && (centralAvailable(state, 'food') > EPS || nonnegative(state.foodCredit) > EPS);
  const aliases = { 'workplace-journey': ['workers', 'house'], 'storage-limits': ['resources', 'warehouse'], 'house-points': ['house', 'house-happiness'], 'upgrade-cost': ['farm', 'building'], 'island-review': ['home'] };
  return (aliases[item.id] || [item.route]).some(visited);
}
function completeLessons(state) {
  if (!state.tutorial) return;
  if (state.tutorial.rewardDisabled) return;
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of lessonsFor(state)) {
      if (state.tutorial.completed[item.id]) continue;
      // Building levels are durable evidence, unlike an unrecorded old click.
      // Do not ask someone who already built a target to buy that level again.
      if ((!state.tutorial.events[item.id] && achievedUpgradeTarget(state, item)) ||
          (item.subject.startsWith('building-') && !prerequisiteReady(state, item) && lessonRequirement(state, item))) {
        if (skipKnownLesson(state, item)) { changed = true; continue; }
      }
      if (!prerequisiteReady(state, item)) continue;
      if (item.kind === 'condition' && ['delivery','crafted'].includes(item.subject)) {
        const key = item.subject === 'delivery' ? 'collected' : 'crafted';
        if (!Object.hasOwn(state.tutorial.conditionBaselines, key)) state.tutorial.conditionBaselines[key] = whole(state.statistics?.[key]);
      }
      if (lessonRequirement(state, item)) {
        state.tutorial.completed[item.id] = true;
        state.tutorial.chests[item.id] ||= { reward: chestReward(state, item), quotePending: state.tutorial.curriculum === 4, claimed: false, shared: false, skipped: false, seen: false };
        changed = true;
      }
    }
  }
  // A mapped old completion may still have an unclaimed old reward. Its new
  // chest is rolled once and remains stable, while an already-paid reward is
  // archived and is never paid again.
  for (const item of lessonsFor(state)) if (state.tutorial.completed[item.id] && !state.tutorial.skippedLessons[item.id] && !state.tutorial.claimed[item.id] && !state.tutorial.chests[item.id]) {
    state.tutorial.chests[item.id] = { reward: chestReward(state, item), quotePending: state.tutorial.curriculum === 4, claimed: false, shared: false, skipped: false, seen: false };
  }
}
export function tutorialRows(state) {
  const tutorial = state.tutorial || { completed: {}, claimed: {}, events: {}, chests: {} };
  return lessonsFor(state).map(item => {
    const balanced = tutorial.curriculum === 4;
    const prerequisiteMet = !item.prerequisite || tutorial.completed[item.prerequisite] === true && (!balanced || lessonResolved(tutorial, item.prerequisite));
    const completed = tutorial.completed[item.id] === true, claimed = tutorial.claimed[item.id] === true;
    const chest = tutorial.chests?.[item.id];
    const overfull = !balanced && tutorialWarehouseOverfull(state);
    const autoSkipped = tutorial.skippedLessons?.[item.id] === true;
    return { ...item, balanced, autoSkipped, pendingDecision: !autoSkipped && balanced && claimed && !!chest && !chest.skipped && !chest.shared,
      settlement: balanced && item.subject === 'finish-tutorial' ? tutorialSettlementStatus(state) : null,
      reward: chest ? { ...chest.reward } : {}, rewardRange: balanced ? null : { minimum: TUTORIAL_CHEST_MIN, maximum: TUTORIAL_CHEST_MAX, eachMaterial: true }, unlocked: prerequisiteMet || completed, prerequisiteMet, completed, claimed,
      visited: hasVisit(state, item), canObserve: false,
      canClaim: !autoSkipped && !tutorial.rewardDisabled && prerequisiteMet && completed && !claimed && !!chest && !overfull,
      rewardBlocked: completed && !claimed && !!chest && overfull,
      shared: chest?.shared === true, skipped: chest?.skipped === true,
      canShare: !balanced && claimed && !!chest && !chest.shared && !chest.skipped && !overfull,
      lockedReason: !prerequisiteMet ? 'Complete and receive the previous lesson reward first.' : overfull ? 'Spend stored materials before opening or doubling another tutorial chest.' : '' };
  });
}
export function tutorialPendingRewards(state) {
  if (state.tutorial?.rewardDisabled) return [];
  return tutorialRows(state).filter(row => row.canClaim || row.claimed && !!state.tutorial?.chests?.[row.id] && !row.shared && !row.skipped)
    .map(row => ({ lessonId: row.id, title: row.title, reward: { ...row.reward }, claimed: row.claimed, shared: row.shared, skipped: row.skipped, seen: state.tutorial.chests[row.id]?.seen === true }));
}
export function tutorialStatus(state) {
  const rows = tutorialRows(state), completed = rows.filter(row => row.completed).length;
  return { completed, claimed: rows.filter(row => row.claimed).length, total: TUTORIAL_LESSONS.length, finished: completed === TUTORIAL_LESSONS.length,
    skipped: rows.filter(row => row.autoSkipped).length, visibleTotal: rows.filter(row => !row.autoSkipped).length, visibleCompleted: rows.filter(row => !row.autoSkipped && row.completed).length,
    autoOpenDisabled: state.tutorial?.autoOpenDisabled === true, shouldAutoOpen: !state.tutorial?.rewardDisabled && !introductionPending(state) && completed < TUTORIAL_LESSONS.length && state.tutorial?.autoOpenDisabled !== true,
    nextLessonId: rows.find(row => !row.completed)?.id || null, buildingSuppliesClaimed: state.tutorial?.buildingSuppliesClaimed === true };
}
export function recordProgressionAction(state, action, result) {
  if (introductionPending(state)) return;
  if (result?.ok !== true || !action || typeof action !== 'object' || action.meaningful === false || action.type === 'expeditionMiniGameInput') return;
  ensure(state);
  if (!state.tutorial.rewardDisabled && result.tutorialEvidenceRecorded !== true) recordTutorialEvidence(state, action, result);
  completeLessons(state);
  settleLoyaltyClosure(state);
}

function recordTutorialEvidence(state, action, result) {
  const tutorial = state.tutorial, ledger = tutorial.actionLedger, lessons = lessonsFor(state);
  const current = lessons.find(item => !tutorial.completed[item.id]);
  const evidence = [];
  const add = (subject, units = 1, targetLevel = null) => evidence.push({ subject, units, targetLevel });
  if (action.type === 'assign' && action.delta > 0) add(`assign-${action.building}`, whole(action.delta));
  if (['upgrade', 'build', 'premiumBuyBuilding'].includes(action.type) && result.project?.stage !== 'planned') {
    const target = whole(result.project?.targetLevel, whole(state.buildings?.[action.building]?.level) + 1);
    add(`upgrade-${action.building}`, 1, target);
  }
  if (['houseHappiness', 'giveHouseHappiness', 'houseHappinessAll'].includes(action.type)) { add('house-points'); add('increase-happiness'); }
  if (['blessing', 'paidBlessing', 'adBlessing'].includes(action.type)) { add('chapel-blessing'); add('increase-happiness'); }
  if (action.type === 'buyAttraction') { add('buy-attraction'); add('increase-happiness'); }
  if (action.type === 'setting' && action.key === 'notificationCategories' && ledger.notificationCategories !== notificationSignature(state)) add('notification-filter');
  if (action.type === 'warehousePriority' && ledger.priorities !== prioritySignature(state) && (state.warehousePriorities || []).length > 0) add('transport-priority');
  if (action.type === 'upgradeRoad') add('upgrade-road');
  if (action.type === 'marketOrder' || action.type === 'tutorialPlayerTrade') add('market-order');
  if (action.type === 'confirmTaskAcceptance' || action.type === 'taskAccept' && (state.lighthouseTasks || []).some(task => task.id === state.activeTaskId && task.acceptedAt != null)) add('task-accept');
  if (action.type === 'expeditionStart') add('expedition-play');
  if (action.type === 'assign' && action.delta < 0) add('release-worker', whole(-action.delta));
  if (action.type === 'taskDeposit' && action.amount > 0) add('task-deposit');
  ledger.priorities = prioritySignature(state);
  ledger.notificationCategories = notificationSignature(state);
  for (const proof of evidence) {
    if (!ACTION_SUBJECTS.includes(proof.subject)) continue;
    ledger.counts[proof.subject] = Math.min(Number.MAX_SAFE_INTEGER, whole(ledger.counts[proof.subject]) + proof.units);
    // Each actual worker can satisfy only one repeated +1 lesson. An order for
    // Town Hall 2 likewise cannot stand in for the later Town Hall 3 order.
    const matching = lessons.filter(item => !tutorial.completed[item.id] && item.subject === proof.subject && (!item.goalLevel || item.goalLevel === proof.targetLevel));
    for (const item of matching.slice(0, proof.units)) {
      if (current?.id === item.id && prerequisiteReady(state, item)) tutorial.events[item.id] = true;
      else skipKnownLesson(state, item);
    }
  }
}

export function tutorialWarehouseOverfull(state) {
  const level = Math.max(0, whole(state.buildings?.warehouse?.level));
  const factor = level ? 1.5 ** (level - 1) : 0;
  const perResource = Math.floor(Math.min(10000000, 1000 * factor));
  const total = Math.floor(Math.min(40000000, 4000 * factor));
  return MATERIALS.some(id => nonnegative(state.resources?.[id]) > perResource + EPS) ||
    MATERIALS.reduce((sum, id) => sum + nonnegative(state.resources?.[id]), 0) > total + EPS;
}

function ordinaryLimits(state) {
  const level = Math.max(0, whole(state.buildings?.warehouse?.level));
  const factor = level ? 1.5 ** (level - 1) : 0;
  return { perResource: Math.floor(Math.min(10000000, 1000 * factor)), total: Math.floor(Math.min(40000000, 4000 * factor)) };
}
function fitOrdinaryReward(state, requested) {
  const limits = ordinaryLimits(state), reward = {}, room = Math.max(0, limits.total - ordinaryWarehouseUsed(state));
  let remaining = room;
  for (const resource of MATERIALS) {
    const amount = Math.max(0, Math.min(whole(requested[resource]), Math.floor(limits.perResource - ordinaryStock(state, resource) + EPS), Math.floor(remaining + EPS)));
    if (amount) { reward[resource] = amount; remaining -= amount; }
  }
  if (requested.coins > 0) reward.coins = whole(requested.coins);
  return reward;
}
function balancedReward(state, item, context) {
  if (item.rewardKind === 'small') return fitOrdinaryReward(state, { coins: 100, ...Object.fromEntries(MATERIALS.map(id => [id, 25])) });
  if (item.rewardKind === 'road') return fitOrdinaryReward(state, { coins: 200, stone: Math.max(0, Math.ceil(100 - centralAvailable(state, 'stone'))) });
  if (item.rewardKind !== 'supply') return { coins: 200 };
  if (typeof context.buildingCost !== 'function') return null;
  const next = TUTORIAL_LESSONS.find(row => row.index > item.index && row.subject === `upgrade-${item.fundBuilding}`);
  if (next?.goalLevel && whole(state.buildings?.[item.fundBuilding]?.level) >= next.goalLevel) return { coins: 100 };
  const cost = context.buildingCost(state, item.fundBuilding);
  if (!plain(cost)) return null;
  const target = { ...cost, food: nonnegative(cost.food) + 100 };
  const requested = Object.fromEntries(MATERIALS.map(id => [id, Math.max(0, Math.ceil(nonnegative(target[id]) - centralAvailable(state, id)))]));
  requested.coins = Math.max(100, Math.ceil(nonnegative(cost.coins) + 100 - nonnegative(state.resources.coins)));
  return fitOrdinaryReward(state, requested);
}
function awardOrdinary(state, reward) {
  if (!plain(reward) || Object.entries(reward).some(([id, value]) => !['coins', ...MATERIALS].includes(id) || !finite(value) || value < 0 || nonnegative(state.resources?.[id]) + value > Number.MAX_SAFE_INTEGER)) return false;
  const limits = ordinaryLimits(state);
  if (MATERIALS.some(id => ordinaryStock(state, id) + nonnegative(reward[id]) > limits.perResource + EPS) || ordinaryWarehouseUsed(state) + MATERIALS.reduce((sum, id) => sum + nonnegative(reward[id]), 0) > limits.total + EPS) return false;
  for (const [id, value] of Object.entries(reward)) state.resources[id] = nonnegative(state.resources[id]) + value;
  return true;
}
export function tutorialSettlementStatus(state) {
  const tutorial = state.tutorial || {}, limits = ordinaryLimits(state);
  const result = { eligible: false, reasonCode: '', reason: '', reasonPl: '', reward: {}, capacity: limits.total, used: ordinaryWarehouseUsed(state) };
  const blocked = (reasonCode, reason, reasonPl) => ({ ...result, reasonCode, reason, reasonPl });
  if (tutorial.curriculum !== 4 || tutorial.rewardDisabled) return blocked('disabled', 'This tutorial settlement is not available for this island.', 'To rozliczenie samouczka nie jest dostępne dla tej wyspy.');
  if (tutorial.settled) return blocked('settled', 'The tutorial has already been settled.', 'Samouczek został już rozliczony.');
  if (TUTORIAL_LESSONS.slice(0, 24).some(row => !lessonResolved(tutorial, row.id))) return blocked('previous-rewards', 'Finish the first 24 lessons and receive rewards for the steps taught by the tutorial. Independently completed steps need no reward.', 'Ukończ pierwsze 24 kroki i odbierz premie za kroki wykonane w samouczku. Kroki wykonane samodzielnie nie wymagają premii.');
  if (MATERIALS.some(id => nonnegative(state.bonusMaterials?.[id]) > EPS)) return blocked('bonus-stock', 'Spend additional bonus materials on real island actions before finishing. No stock will be removed or converted.', 'Wydaj dodatkowe materiały bonusowe na prawdziwe działania wyspy. Żadne zasoby nie zostaną usunięte ani zamienione.');
  if (MATERIALS.some(id => centralReserved(state, id) > EPS)) return blocked('reserved-stock', 'Let reserved building or trade goods leave storage before finishing.', 'Poczekaj, aż zarezerwowane towary budowy lub handlu opuszczą magazyn.');
  if (result.used > limits.total + EPS || MATERIALS.some(id => ordinaryStock(state, id) > limits.perResource + EPS)) return blocked('ordinary-stock', 'Spend ordinary stock exceeding the Warehouse limits before finishing.', 'Wydaj zwykły zapas przekraczający limity Magazynu.');
  const reward = { coins: 500 }, levels = Object.fromEntries(MATERIALS.map(id => [id, ordinaryStock(state, id)]));
  let remaining = Math.max(0, limits.total - result.used);
  // Water-fill to equal levels without a loop per material unit, even when a
  // player expanded well beyond the course's level-two Warehouse.
  for (let guard = 0; remaining > EPS && guard < 12; guard++) {
    const eligible = MATERIALS.filter(id => levels[id] < limits.perResource - EPS).sort((a,b) => levels[a] - levels[b]);
    if (!eligible.length) break;
    const lowest = levels[eligible[0]], group = eligible.filter(id => Math.abs(levels[id] - lowest) < EPS);
    const next = eligible.find(id => levels[id] > lowest + EPS);
    const target = next ? levels[next] : limits.perResource;
    const step = Math.min(remaining, (target - lowest) * group.length);
    if (!(step > EPS)) break;
    for (const id of group) { const value = step / group.length; levels[id] += value; reward[id] = nonnegative(reward[id]) + value; }
    remaining -= step;
  }
  return { ...result, eligible: remaining <= EPS, reward };
}

function canAward(reward, context) {
  return !MATERIALS.some(resource => reward[resource] > 0) || typeof context.receiveMaterials === 'function';
}
function award(state, reward, context) {
  if (!canAward(reward, context)) return false;
  if (!Number.isSafeInteger(whole(state.resources.coins) + whole(reward.coins))) return false;
  const materials = Object.fromEntries(MATERIALS.filter(resource => reward[resource] > 0).map(resource => [resource, whole(reward[resource])]));
  if (Object.keys(materials).length) context.receiveMaterials(state, materials);
  state.resources.coins = Math.min(Number.MAX_SAFE_INTEGER, nonnegative(state.resources.coins) + whole(reward.coins));
  return true;
}

function settleLoyaltyClosure(state) {
  if (!state.loyalty || state.loyalty.closed) return;
  if (townLevel(state) >= 4) { state.loyalty.closed = true; state.loyalty.closedReason = 'townhall-level-4'; }
  else if ((state.loyalty.claimedDays || []).length >= 10) { state.loyalty.closed = true; state.loyalty.closedReason = 'ten-rewards'; }
}

export function recordProgressionLogin(state, now = nowOf(state)) {
  if (introductionPending(state)) return false;
  ensure(state);
  if (!finite(now) || now < 0) return false;
  settleLoyaltyClosure(state);
  if (state.loyalty.closed) return false;
  const day = warsawDayKey(now);
  if (state.loyalty.lastDay === day) {
    if (state.loyalty.lastClaimedDay !== day && (!state.loyalty.pendingReward || state.loyalty.pendingDay !== day)) {
      state.loyalty.pendingDay = day;
      state.loyalty.pendingReward = loyaltyReward(state);
    }
    return false;
  }
  const consecutive = state.loyalty.lastDay && calendarDayDistance(state.loyalty.lastDay, day) === 1;
  state.loyalty.lastDay = day;
  state.loyalty.streak = consecutive ? Math.min(10, state.loyalty.streak + 1) : 1;
  state.loyalty.pendingDay = day;
  state.loyalty.pendingReward = loyaltyReward(state);
  return true;
}

export function loyaltyStatus(state) {
  const loyalty = state.loyalty || {};
  const closed = loyalty.closed === true || townLevel(state) >= 4 || (loyalty.claimedDays || []).length >= 10;
  return { streak: Math.min(10, whole(loyalty.streak)), claimedDays: [...(loyalty.claimedDays || [])], closed,
    closedReason: loyalty.closedReason || (townLevel(state) >= 4 ? 'townhall-level-4' : null), rewardConfigured: true,
    eligible: !closed && whole(loyalty.streak) > 0 && loyalty.pendingDay === warsawDayKey(nowOf(state)) && loyalty.lastClaimedDay !== loyalty.pendingDay && !!loyalty.pendingReward,
    reward: loyalty.pendingReward ? { ...loyalty.pendingReward } : {}, rewardDay: loyalty.pendingDay,
    message: closed ? 'The introductory loyalty programme has ended.' : 'Receive 50–200 of each resource once per Warsaw day, including Coins. The stored draw does not change when you reload.' };
}

export function socialSummary(state) {
  const social = state.socialRewards || {};
  const count = (social.postDays || []).length, today = warsawDayKey(nowOf(state));
  return { firstShareClaimed: social.firstShareClaimed === true, levelShares: [...(social.levelShares || [])],
    countedPosts: count, countedToday: (social.postDays || []).includes(today), nextPostRewardAt: (Math.floor(count / 3) + 1) * 3,
    available: false, message: 'Verified social sharing is not connected yet.' };
}

export function referralRows(state) {
  return (state.referrals?.entries || []).map(entry => ({ ...entry, activeDays: [...entry.activeDays],
    remaining: Math.max(0, (entry.registeredAt + REFERRAL_WINDOW_SECONDS * 1000 - nowOf(state)) / 1000),
    activeDayCount: Math.min(3, entry.activeDays.length) }));
}

export function nextProgressionEvent(state) {
  const now = nowOf(state);
  let next = secondsUntilWarsawMidnight(now);
  const remaining = (nonnegative(state.engagement?.activeUntil) - now) / 1000;
  if (remaining > EPS) next = Math.min(next, remaining);
  const abandonedAt = nonnegative(state.engagement?.lastRealActivityAt, nonnegative(state.engagement?.firstAnchorAt, now)) + ABANDONED_PLAY_SECONDS * 1000;
  if (abandonedAt > now + EPS) next = Math.min(next, (abandonedAt - now) / 1000);
  for (const entry of state.referrals?.entries || []) {
    const window = (entry.registeredAt + REFERRAL_WINDOW_SECONDS * 1000 - now) / 1000;
    if (!entry.thirdDayPaid && !entry.expired && window > EPS) next = Math.min(next, window);
  }
  return next > EPS ? next : Infinity;
}

export function advanceProgression(state) {
  ensure(state);
  const now = nowOf(state);
  if (state.engagement.activeUntil <= now + EPS) state.engagement.activeUntil = 0;
  for (const entry of state.referrals.entries) if (now >= entry.registeredAt + REFERRAL_WINDOW_SECONDS * 1000) entry.expired = true;
  completeLessons(state);
  settleLoyaltyClosure(state);
}

function bindSocialAccount(state, context) {
  const accountId = textId(context.accountId);
  if (accountId && state.socialRewards.accountId && state.socialRewards.accountId !== accountId) return false;
  if (accountId) state.socialRewards.accountId = accountId;
  return true;
}

function eventTime(state, action) {
  const at = action.at === undefined ? nowOf(state) : action.at;
  return finite(at) && at >= 0 && at <= nowOf(state) ? at : null;
}

function socialPublication(state, action, context) {
  if (context.verifiedSocialEvent !== true) return bad('A verified publication event is required. Opening a share dialog does not grant this reward.');
  const id = textId(action.id || action.publicationId), at = eventTime(state, action);
  if (!id || at === null) return bad('Invalid publication event.');
  if (state.socialRewards.publicationIds.includes(id)) return bad('This publication was already processed.');
  if (!bindSocialAccount(state, context)) return bad('This publication belongs to a different account.');
  const social = state.socialRewards, day = warsawDayKey(at);
  const level = action.level;
  const levelEligible = action.kind === 'level' && Number.isInteger(level) && level >= 2 && level <= townLevel(state) && !social.levelShares.includes(level);
  const first = !social.firstShareClaimed;
  const counted = !social.postDays.includes(day);
  const newCount = social.postDays.length + (counted ? 1 : 0);
  const third = counted && newCount % 3 === 0 && !social.thirdPostRewards.includes(newCount);
  const coins = (first ? 1000 : 0) + (levelEligible ? 500 : 0) + (third ? 1000 : 0);
  social.publicationIds.push(id);
  if (first) social.firstShareClaimed = true;
  if (levelEligible) social.levelShares.push(level);
  if (counted) social.postDays.push(day);
  social.postDays.sort();
  if (third) social.thirdPostRewards.push(newCount);
  award(state, { coins }, context);
  emit(state, 'verified-share', 'Verified publication processed', coins ? `Granted ${coins} coins. ${newCount} daily publications counted.` : 'This publication was recorded; no additional reward is due.');
  return good(coins ? `Granted ${coins} coins for verified sharing.` : 'Publication recorded.', { reward: { coins }, counted, firstShare: first, levelReward: levelEligible, thirdPostReward: third });
}

function referralAction(state, action, context) {
  if (context.verifiedAccountEvent !== true) return bad('A verified account event is required for referral rewards.');
  const ownerId = textId(context.accountId), accountId = textId(action.accountId);
  if (!ownerId || !accountId || accountId === ownerId) return bad('Invalid referral account.');
  if (state.referrals.ownerId && state.referrals.ownerId !== ownerId) return bad('This referral belongs to a different account.');
  const at = eventTime(state, action);
  if (at === null) return bad('Invalid referral event time.');
  let entry = state.referrals.entries.find(item => item.accountId === accountId);
  if (action.type === 'referralRegistration') {
    if (action.inviterId !== ownerId) return bad('The inviter does not match this account.');
    if (entry) return bad('This registered account already has an inviter.');
    const registeredAt = action.registeredAt === undefined ? at : action.registeredAt;
    if (!finite(registeredAt) || registeredAt < 0 || registeredAt > at) return bad('Invalid registration time.');
    entry = { accountId, inviterId: ownerId, registeredAt, firstLoginPaid: false, firstLoginAt: null, activeDays: [], thirdDayPaid: false,
      expired: nowOf(state) >= registeredAt + REFERRAL_WINDOW_SECONDS * 1000 };
    state.referrals.ownerId = ownerId;
    state.referrals.entries.push(entry);
    return good('Referral registration recorded. The inviter is fixed for this account.');
  }
  if (!entry || entry.inviterId !== ownerId) return bad('A new registered referral is required first.');
  if (at < entry.registeredAt) return bad('The referral event precedes registration.');
  state.referrals.ownerId = ownerId;
  if (action.type === 'referralLogin') {
    if (entry.firstLoginPaid) return bad('The first referral login was already rewarded.');
    entry.firstLoginPaid = true; entry.firstLoginAt = at;
    award(state, { coins: 1000 }, context);
    emit(state, 'referral-first-login', 'A referred player signed in', 'Granted 1,000 coins for the referred account’s first login.');
    return good('Granted 1,000 coins for the first referral login.', { reward: { coins: 1000 } });
  }
  if (!entry.firstLoginPaid) return bad('The referred account must sign in first.');
  if (!finite(entry.firstLoginAt) || at < entry.firstLoginAt) return bad('Referral activity cannot precede the first login.');
  if (action.active !== true) return bad('Meaningful activity is required for a referral active day.');
  if (entry.thirdDayPaid) return bad('This referral activity reward was already granted.');
  if (at >= entry.registeredAt + REFERRAL_WINDOW_SECONDS * 1000) return bad('The 30-day referral activity window has ended.');
  const day = warsawDayKey(at);
  if (entry.activeDays.includes(day)) return bad('This active calendar day was already counted.');
  const pays = entry.activeDays.length >= 2;
  const reward = Object.fromEntries(MATERIALS.map(resource => [resource, 500]));
  if (pays && !canAward(reward, context)) return bad('Material reward delivery is not available.');
  entry.activeDays.push(day); entry.activeDays.sort();
  if (pays) {
    award(state, reward, context); entry.thirdDayPaid = true;
    emit(state, 'referral-third-day', 'Referral activity reward', 'Granted 500 of each material after three distinct active days.');
  }
  return good(pays ? 'Granted 500 of each material for referral activity.' : 'Referral active day recorded.', { rewarded: pays, reward: pays ? reward : {} });
}

export function progressionAction(state, action, context = {}) {
  const types = ['userActivity', 'heartbeat', 'tutorialVisit', 'tutorialObserve', 'claimTutorial', 'seeTutorialReward', 'shareTutorialReward', 'skipTutorialShare', 'prepareTutorialUpgrade', 'finishTutorial', 'tutorialPlayerTrade', 'dismissTutorial', 'resumeTutorial', 'socialPublication', 'referralRegistration', 'referralLogin', 'referralActiveDay', 'claimLoyalty'];
  if (!action || !types.includes(action.type)) return null;
  ensure(state);
  if (state.tutorial.rewardDisabled && ['tutorialObserve','claimTutorial','seeTutorialReward','shareTutorialReward','skipTutorialShare','prepareTutorialUpgrade','finishTutorial'].includes(action.type)) return bad('Tutorial rewards belong to the first island and cannot be repeated here.');
  if (action.type === 'finishTutorial') {
    const quote = tutorialSettlementStatus(state);
    if (!quote.eligible) return bad(quote.reason);
    if (!awardOrdinary(state, quote.reward)) return bad('The final Warehouse reward could not be received.');
    const id = TUTORIAL_LESSONS[24].id;
    state.tutorial.completed[id] = true; state.tutorial.claimed[id] = true;
    state.tutorial.chests[id] = { reward: { ...quote.reward }, claimed: true, skipped: true, shared: false, seen: true, quotePending: false };
    state.tutorial.settled = true;
    emit(state, 'tutorial-settled', 'Tutorial complete: Warehouse full', 'The final reward filled free ordinary Warehouse capacity. No material was removed, and no tutorial reward is waiting.');
    return good('Tutorial complete. Your ordinary Warehouse is full and no tutorial rewards are waiting.', { reward: { ...quote.reward }, warehouseUsed: ordinaryWarehouseUsed(state), warehouseCapacity: quote.capacity });
  }
  if (action.type === 'tutorialPlayerTrade') {
    if (context.playerTradeVerified !== true) return bad('A confirmed player trade is required.');
    if (state.tutorial.curriculum !== 3 || !lessonsFor(state).some(item => item.subject === 'market-order' && !state.tutorial.completed[item.id])) return bad('This player trade does not match an unfinished tutorial lesson.');
    const receiptId = textId(action.receiptId);
    if (receiptId && state.tutorial.actionLedger.tradeReceipts.includes(receiptId)) return bad('This player trade was already recorded.');
    if (receiptId) state.tutorial.actionLedger.tradeReceipts.push(receiptId);
    recordTutorialEvidence(state, action, { ok: true }); completeLessons(state);
    return good('Your confirmed player trade resolved the Market tutorial lesson.', { tutorialEvidenceRecorded: true });
  }
  if (action.type === 'userActivity' || action.type === 'heartbeat') {
    if (!registerMeaningfulActivity(state, action)) return bad('Activity must come from the visible, focused game.');
    return good('Active play refreshed for five minutes.', { activeUntil: state.engagement.activeUntil });
  }
  if (action.type === 'dismissTutorial' || action.type === 'resumeTutorial') {
    state.tutorial.autoOpenDisabled = action.type === 'dismissTutorial';
    return good(action.type === 'dismissTutorial' ? 'Automatic tutorial opening is disabled. You can resume it from Settings.' : 'Tutorial resumed. Your progress is preserved.');
  }
  if (action.type === 'tutorialVisit') {
    const subject = textId(action.subject);
    if (!subject) return bad('Choose a tutorial location.');
    for (const item of TUTORIAL_LESSONS) {
      if (item.kind !== 'observe' || state.tutorial.completed[item.id] || item.prerequisite && !state.tutorial.completed[item.prerequisite]) continue;
      state.tutorial.events[`visit:${item.id}:${subject}`] = true;
    }
    return good('Tutorial location visited.');
  }
  if (action.type === 'prepareTutorialUpgrade') {
    const row = tutorialRows(state).find(item => item.id === 'townhall-upgrade');
    if (!row.prerequisiteMet || row.completed || townLevel(state) > 1) return bad('Building supplies are available only before your tutorial Town Hall upgrade.');
    if (state.tutorial.buildingSuppliesClaimed) return bad('The tutorial building supplies were already received.');
    const reward = Object.fromEntries(Object.entries(TUTORIAL_BUILDING_SUPPLIES).map(([id, target]) => [id, Math.max(0, Math.ceil(target - (id === 'coins' ? nonnegative(state.resources?.coins) : centralAvailable(state, id))))]));
    if (state.tutorial.curriculum === 4 ? !awardOrdinary(state, fitOrdinaryReward(state, reward)) : !award(state, reward, context)) return bad('Material reward delivery is not available.');
    state.tutorial.buildingSuppliesClaimed = true;
    emit(state, 'tutorial-supplies', 'Tutorial building supplies', state.tutorial.curriculum === 4 ? 'One-time supplies fill the missing first Town Hall budget directly in ordinary storage, including food for construction and meals.' : 'One-time supplies bring your available building budget to 500 coins and each material, with 600 Food for construction and meals. Bonus materials are immediately available without taking ordinary delivery space.');
    return good('Tutorial building supplies received. You can now order the Town Hall upgrade.', { reward });
  }
  if (['tutorialObserve', 'claimTutorial', 'seeTutorialReward', 'shareTutorialReward', 'skipTutorialShare'].includes(action.type)) {
    const item = lessonsFor(state).find(row => row.id === action.taskId);
    if (!item) return bad('This tutorial lesson does not exist.');
    completeLessons(state);
    const row = tutorialRows(state).find(candidate => candidate.id === item.id);
    if (!row.unlocked || !row.prerequisiteMet) return bad(row.lockedReason);
    if (action.type === 'tutorialObserve') return bad('Complete this lesson through its gameplay action.');
    const chest = state.tutorial.chests[item.id];
    if (!chest) return bad(row.claimed ? 'This tutorial reward was already claimed.' : 'Complete this lesson before opening its reward chest.');
    if (action.type === 'seeTutorialReward') {
      chest.seen = true;
      return good('Tutorial success viewed.');
    }
    if (action.type === 'claimTutorial') {
      if (!row.canClaim) return bad(row.claimed ? 'This tutorial reward was already claimed.' : row.rewardBlocked ? 'Spend stored materials before opening or doubling another tutorial chest.' : 'Complete this lesson before claiming its reward.');
      const received = state.tutorial.curriculum === 4 && chest.quotePending ? balancedReward(state, item, context) : chest.reward;
      if (!received || (state.tutorial.curriculum === 4 ? !awardOrdinary(state, received) : !award(state, received, context))) return bad('Material reward delivery is not available.');
      chest.reward = { ...received }; chest.quotePending = false;
      state.tutorial.claimed[item.id] = true; chest.claimed = true;
      emit(state, 'tutorial-reward', state.tutorial.curriculum === 4 ? 'Tutorial reward received' : 'Tutorial chest opened', state.tutorial.curriculum === 4 ? `${item.title}: the immediate reward is in your Warehouse and wallet.` : `${item.title}: a chest containing 100–300 of each material has been received.`);
      return good(state.tutorial.curriculum === 4 ? 'Tutorial reward received immediately. Continue to the next real action.' : 'Tutorial chest received. Share to receive the same resources once more.', { lessonId: item.id, reward: { ...chest.reward } });
    }
    if (!row.canShare && action.type !== 'skipTutorialShare') return bad(tutorialWarehouseOverfull(state) ? 'Spend stored materials before opening or doubling another tutorial chest.' : 'This tutorial sharing decision has already been resolved or its chest has not been opened.');
    if (action.type === 'skipTutorialShare' && (!row.claimed || chest.shared || chest.skipped)) return bad('This tutorial sharing decision has already been resolved or its chest has not been opened.');
    if (action.type === 'shareTutorialReward') {
      if (!award(state, chest.reward, context)) return bad('Material reward delivery is not available.');
      chest.shared = true; chest.seen = true;
      emit(state, 'tutorial-sharing-bonus', 'Tutorial chest doubled', 'The same chest resources were granted once more for choosing to share. Facebook publishing is not connected yet.');
      return good('Tutorial chest doubled.', { lessonId: item.id, reward: { ...chest.reward } });
    }
    chest.skipped = true; chest.seen = true;
    completeLessons(state);
    return good(state.tutorial.curriculum === 4 ? 'Reward confirmed. Continue to the next tutorial action.' : 'Sharing skipped. Your tutorial chest remains yours.');
  }
  if (action.type === 'socialPublication') return socialPublication(state, action, context);
  if (action.type.startsWith('referral')) return referralAction(state, action, context);
  settleLoyaltyClosure(state);
  const loyalty = loyaltyStatus(state);
  if (!loyalty.eligible) return bad(loyalty.closed ? 'The introductory loyalty programme has ended.' : 'The daily loyalty reward is not available or has already been received.');
  if (!award(state, loyalty.reward, context)) return bad('Material reward delivery is not available.');
  const index = Array.from({ length: 10 }, (_, i) => i + 1).find(day => !state.loyalty.claimedDays.includes(day));
  state.loyalty.claimedDays.push(index);
  state.loyalty.claimedDays.sort((a, b) => a - b);
  state.loyalty.lastClaimedDay = loyalty.rewardDay;
  state.loyalty.receivedRewards[loyalty.rewardDay] = { ...loyalty.reward };
  settleLoyaltyClosure(state);
  emit(state, 'loyalty-reward', 'Daily loyalty reward received', 'Granted the saved daily draw: 50–200 of each resource, including Coins.');
  return good('Daily loyalty reward received.', { reward: loyalty.reward, day: index });
}
