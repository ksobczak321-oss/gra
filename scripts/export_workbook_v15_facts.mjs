#!/usr/bin/env node
/** Read-only, deterministic facts for the current master rules workbook.
 * Runs the real pure models against isolated quotation fixtures. No browser,
 * network, credentials, cloud stores or live account data are read or written.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as State from '../harborlight-v1-state.js';
import * as Economy from '../harborlight-v1-economy.js';
import * as Logistics from '../harborlight-v1-logistics.js';
import * as Provisions from '../harborlight-v1-provisions.js';
import * as Education from '../harborlight-v1-education.js';
import * as Military from '../harborlight-v1-military.js';
import * as Kingdom from '../harborlight-v1-kingdom.js';
import * as Development from '../harborlight-v1-development.js';
import * as Physical from '../harborlight-v1-development-logistics.js';
import * as Leisure from '../harborlight-v1-leisure.js';
import * as Archipelago from '../harborlight-v1-archipelago.js';
import * as Housing from '../harborlight-v1-housing.js';
import * as I18n from '../harborlight-v1-i18n.js';
import * as Residents from '../harborlight-v1-residents.js';
import * as BuildingStages from '../harborlight-v1-building-stages.js';
import { DEVELOPMENT_NAMES } from '../harborlight-v1-development-copy.js';
import { SESSION_IDLE_TIMEOUT_MS } from '../harborlight-dev-cloud.js';
import { LEGAL_DOCUMENT_VERSIONS, threeMonthDeadline } from '../backend/account-service.mjs';
import * as Clock from '../backend/dev-account-clock.mjs';
import { GAME_VERSION } from '../harborlight-version.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AT = Date.parse('2026-11-16T12:00:00Z');
const sourceCommit = process.env.HARBORLIGHT_WORKBOOK_SOURCE_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const sourceFiles = [...readdirSync(ROOT).filter(name => /^harborlight.*\.js$/.test(name)),
  ...readdirSync(resolve(ROOT, 'backend')).filter(name => /\.(?:m?js)$/.test(name)).map(name => 'backend/' + name),
  BuildingStages.BUILDING_STAGE_MANIFEST].sort();
const sourceHashes = Object.fromEntries(sourceFiles.map(name => [name, sha256(readFileSync(resolve(ROOT, name)))]));
const tables = [];
const columns = pairs => pairs.map(([key, label]) => ({ key, label }));
function add(id, title, description, pairs, rows, source_files, limitations = []) {
  tables.push({ id, title, description, columns: columns(pairs), rows, source_files, limitations });
}
const nameOf = id => DEVELOPMENT_NAMES[id] || I18n.translate(State.ALL_BUILDINGS[id]?.name || id, 'pl');
const recipeIds = Object.keys(Provisions.RECIPE_CATALOG);
const buildingIds = Object.keys(State.ALL_BUILDINGS);
const producerIds = new Set(Object.values(Provisions.RECIPE_CATALOG).map(row => row.building));
function fixture(level = 1, { stocked = true, discoveries = false, specialists = false } = {}) {
  const state = State.createState(AT, { ruleset: 32 });
  for (const building of Object.values(state.buildings)) building.level = Math.min(level, 100);
  state.buildings.theatre.level = 1;
  state.highestTownhall = level; state.highestAcademyLevel = level;
  state.settings.language = 'pl';
  if (stocked) state.resources = Object.fromEntries(Object.keys(State.ALL_RESOURCES).map(id => [id, id === 'food' ? 0 : id === 'coins' ? 1e12 : 1e9]));
  if (discoveries) for (const row of Education.RESEARCH_CATALOG.filter(row => row.kind !== 'repeat')) state.education.discoveries[row.id] = true;
  if (specialists) Military.ensureFoundingSpecialists(state);
  return state;
}
const unlockTownhall = id => {
  for (let level = 1; level <= 100; level++) {
    const state = fixture(level);
    const definition = Provisions.NEW_BUILDINGS[id];
    if (definition ? level >= definition.unlockLevel : State.workplaceUnlocked(state, id)) return level;
  }
  return null;
};
const unlocks = Object.fromEntries(buildingIds.map(id => [id, unlockTownhall(id)]));
// Presentation is quoted from the same pure resolver and manifest as the UI.
// These isolated fixtures do not request upgrades or change any live world.
const buildingStageManifest = BuildingStages.normalizeBuildingStageManifest(JSON.parse(readFileSync(resolve(ROOT, BuildingStages.BUILDING_STAGE_MANIFEST), 'utf8')));
assert.equal(buildingStageManifest.enabled, true, 'Current building artwork must be enabled');
assert.equal(BuildingStages.BUILDING_STAGE_IDS.length, 20);
const buildingStageRows = [];
for (const id of BuildingStages.BUILDING_STAGE_IDS) {
  const family = buildingStageManifest.buildings[id];
  assert.ok(State.ALL_BUILDINGS[id], id);
  for (let tier = 0; tier < 10; tier++) {
    const from = tier * 2 + 1, to = from + 1;
    const before = fixture(from), after = fixture(to);
    const visualFrom = BuildingStages.buildingStageLevel(before, id), visualTo = BuildingStages.buildingStageLevel(after, id);
    const first = BuildingStages.buildingStageFrame(buildingStageManifest, id, visualFrom);
    const second = BuildingStages.buildingStageFrame(buildingStageManifest, id, visualTo);
    assert.equal(first.index, tier, `${id}/${from}`);
    assert.equal(second.index, tier, `${id}/${to}`);
    assert.deepEqual(first.rect, second.rect, `${id}: pair must use one frame`);
    const levelSource = id === 'theatre' ? 'townhall' : id;
    assert.equal(visualFrom, before.buildings[levelSource].level, `${id}: actual visual level source`);
    assert.equal(visualTo, after.buildings[levelSource].level, `${id}: actual visual level source`);
    const above20 = BuildingStages.buildingStageIndex(21), at100 = BuildingStages.buildingStageIndex(100);
    assert.equal(above20, 9); assert.equal(at100, 9);
    assert.equal(BuildingStages.buildingStageIndex(0), 0);
    if (id === 'theatre') assert.equal(before.buildings.theatre.level, 1);
    buildingStageRows.push({ id: `${id}:${tier + 1}`, buildingId: id, buildingPl: nameOf(id),
      modelMaximumLevel: State.ALL_BUILDINGS[id].maxLevel,
      visualLevelSourceId: levelSource, visualLevelSourcePl: nameOf(levelSource),
      minimumVisualLevel: from, maximumVisualLevel: to,
      exampleModelLevel: before.buildings[id].level, effectiveVisualLevel: visualFrom,
      frameNumber: first.index + 1, image: first.src, imageSize: [first.width, first.height],
      frameRect: first.rect, alphaBoundsInFrame: first.bbox, viewBox: first.viewBox,
      originalAtlasImage: family.src, originalAtlasSize: [family.width, family.height],
      originalAtlasFrameRect: family.frameRects[tier], paintDepth: family.paintDepth ?? family.groundAnchor[1],
      mapRect: family.mapRect, groundAnchor: family.groundAnchor,
      lockedLevel0FrameNumber: BuildingStages.buildingStageIndex(0) + 1,
      level21FrameNumber: above20 + 1, level100FrameNumber: at100 + 1,
      source_file: 'harborlight-v1-building-stages.js; ' + BuildingStages.BUILDING_STAGE_MANIFEST });
  }
}
assert.equal(buildingStageRows.length, 200);
const academyUnlock = Array.from({ length: 100 }, (_, index) => index + 1).find(level => Education.educationStatus(fixture(level)).unlocked);
const routeUnlock = Array.from({ length: 100 }, (_, index) => index + 1).find(level => Education.researchQuote(fixture(level), 'route:workbook-probe', {}, { source: 'farm', target: 'windmill', product: 'grain' }).ok);
function recipeTownhallMinimum(row) {
  const discovery = Education.RESEARCH_CATALOG.find(topic => topic.id === row.discovery);
  return Math.max(unlocks[row.building], row.level, row.academy || discovery ? academyUnlock : 1,
    discovery?.minimumTownhall || 1, discovery?.minimumAcademy || 1, ...Object.values(discovery?.minimumBuilding || {}));
}
function costFacts(state, id, queued) {
  const cost = State.buildingCost(state, id, { queued, starterDiscount: false });
  const ordinary = { ...cost }, mix = cost?.foodQuote?.materials || {};
  for (const [resource, value] of Object.entries(mix)) {
    ordinary[resource] = (ordinary[resource] || 0) - value;
    if (Math.abs(ordinary[resource]) < 1e-8) delete ordinary[resource];
  }
  return { cost: { ...cost }, ordinary, foodUnits: cost?.foodUnits || 0,
    foodSatiety: cost?.foodQuote?.satietyRequired || 0,
    exampleFoodMix: mix, foodQuoteOk: cost?.foodQuote?.ok ?? true };
}
const fresh = State.createState(AT, { ruleset: 32, onboarding: true });
const levels = [];
for (let level = 1; level <= State.MAX_BUILDING_LEVEL; level++) {
  const state = fixture(level);
  const storage = Logistics.warehouseLimits(state), plan = Economy.warehouseCapacityPlan(level, { ruleset: 32 });
  const education = Education.educationStatus(state);
  levels.push({ level, maxConstructionSeconds: Economy.longestConstructionSeconds(level),
    populationCapacity: level * 36, houseBeds: State.housingCapacity(state),
    warehouseTotal: storage.total, warehousePerResource: storage.perResource,
    carrierCapacity: Logistics.haulCapacity(state), marketCapacity: Logistics.marketCapacity(state), dockCapacity: Logistics.dockCapacity(state),
    nextTownhallPopulationRequired: level < 100 ? Logistics.townhallPopulationRequirement(state, level + 1).populationRequired : null,
    requiredFoodTypes: Provisions.requiredFoodTypes(state), academyUnlocked: education.unlocked,
    professorLimit: education.unlocked ? education.professorLimit : null,
    barracksUnlocked: Military.militaryStatus(state).unlocked,
    barracksBeds: Military.militaryStatus(state).unlocked ? Military.barracksBeds(state) : null,
    marketUnlocked: State.workplaceUnlocked(state,'market'), dockUnlocked: State.workplaceUnlocked(state,'dock'),
    warehouseNeeds: plan.needsTotal, warehouseBuffer: plan.buffer, warehouseRoundingUnit: plan.roundingUnit,
    reserveExamplePeople: state.residents.length, reserveExample: Provisions.foodReservePlan(state),
    source_file: 'harborlight-v1-economy.js; harborlight-v1-logistics.js; harborlight-v1-provisions.js' });
}
const buildingLevels = [];
for (const id of buildingIds) {
  const definition = State.ALL_BUILDINGS[id];
  for (let targetLevel = 1; targetLevel <= definition.maxLevel; targetLevel++) {
    const state = fixture(Math.max(targetLevel, unlocks[id]));
    state.buildings[id].level = targetLevel - 1;
    const ordinary = id === 'theatre' ? { ordinary: {}, foodUnits: 0, foodSatiety: 0, cost: {}, exampleFoodMix: {} } : costFacts(state, id, false);
    const queued = id === 'theatre' ? ordinary : costFacts(state, id, true);
    const timing = id === 'theatre' ? null : Economy.constructionTiming(state, { building: id, targetLevel, cost: ordinary.cost });
    state.buildings[id].level = targetLevel;
    const crew = Provisions.crewCapacity(state, id), local = Provisions.localStorageStatus(state, id);
    for (const row of Education.RESEARCH_CATALOG.filter(row => row.kind !== 'repeat')) state.education.discoveries[row.id] = true;
    const advancedCrew = Provisions.crewCapacity(state,id);
    const firstLevelMode = fresh.buildings[id].level > 0 ? 'Poziom1 w stanie początkowym; funkcja według progu Ratusza' : Provisions.NEW_BUILDINGS[id] ? 'Automatyczne odblokowanie poziomu1' : 'Wybudowanie';
    buildingLevels.push({ buildingId: id, buildingPl: nameOf(id), currentLevel: targetLevel - 1, targetLevel,
      mode: targetLevel === 1 ? firstLevelMode : 'Rozbudowa',
      priceIsValuationOnly: targetLevel === 1 && firstLevelMode !== 'Wybudowanie',
      unlockTownhall: unlocks[id], ordinaryCost: ordinary.ordinary, foodUnits: ordinary.foodUnits, foodSatiety: ordinary.foodSatiety,
      exampleFoodMix: ordinary.exampleFoodMix, queuedOrdinaryCost: queued.ordinary, queuedFoodUnits: queued.foodUnits,
      totalSeconds: timing?.totalSeconds || 0, transportSeconds: timing?.transportDuration || 0, buildingSeconds: timing?.buildingDuration || 0,
      constructionPorters: timing?.requiredWorkers || 0, constructionTrips: timing?.trips || 0, constructionWaves: timing?.waves || 0,
      crewPerProduct: producerIds.has(id) ? crew.perProduct : null,
      crewTotal: producerIds.has(id) ? crew.total : ['warehouse','dock','market'].includes(id) ? State.workerLimit(state,id) : null,
      crewTotalAfterDiscoveries: producerIds.has(id) ? advancedCrew.total : null,
      activeProducts: crew.products,
      productsAfterDiscoveries: advancedCrew.products,
      localPerProduct: producerIds.has(id) ? local.perProduct : null, localTotal: producerIds.has(id) ? local.total : null,
      source_file: 'harborlight-v1-state.js; harborlight-v1-economy.js; harborlight-v1-provisions.js' });
  }
}
const recipeLevels = [];
for (let level = 1; level <= 100; level++) {
  const without = fixture(level), withDiscovery = fixture(level, { discoveries: true });
  for (const [recipeId, row] of Object.entries(Provisions.RECIPE_CATALOG)) {
    const rate = Provisions.recipeRatePerWorkerHour(withDiscovery, recipeId);
    recipeLevels.push({ recipeId, buildingId: row.building, buildingPl: nameOf(row.building), level,
      minimumBuildingLevel: row.level, minimumTownhall: recipeTownhallMinimum(row), discovery: row.discovery || '',
      academyRequired: row.academy === true,
      availableWithoutDiscovery: Provisions.availableRecipes(without, row.building).some(item => item.id === recipeId),
      availableWithDiscovery: Provisions.availableRecipes(withDiscovery, row.building).some(item => item.id === recipeId),
      batchesPerWorkerHour: rate, secondsPerBatch: 3600 / rate,
      outputsPerBatch: row.outputs, inputsPerBatch: row.inputs,
      outputsPerWorkerHour: Object.fromEntries(Object.entries(row.outputs).map(([key, count]) => [key, count * rate])),
      inputsPerWorkerHour: Object.fromEntries(Object.entries(row.inputs).map(([key, count]) => [key, count * rate])),
      inputFlow: !Object.keys(row.inputs).length ? 'Pozyskanie surowca bez składników wejściowych; towar czeka lokalnie na odbiór' : row.localInputs ? 'Świeże ryby z magazynu lokalnego Rybaka; bez transportu do centrali' : 'Składniki dostarczone do magazynu lokalnego producenta; fizyczny cykl w budynku',
      source_file: 'harborlight-v1-provisions.js; harborlight-v1-development-logistics.js' });
  }
}
const goods = Object.entries(Provisions.GOODS).map(([id, row]) => ({ id, ...row,
  producers: [...new Set(Object.values(Provisions.RECIPE_CATALOG).filter(recipe => Object.hasOwn(recipe.outputs, id)).map(recipe => nameOf(recipe.building)))],
  productionSpecial: id === 'sourMilk' ? 'Starzenie surowego mleka w Magazynie centralnym' : id === 'food' ? 'Zapas historyczny; brak bieżącej receptury produkcji' : '',
  source_file: 'harborlight-v1-provisions.js' }));
const research = Education.RESEARCH_CATALOG.map(row => ({ ...row,
  minimumTownhall: Math.max(academyUnlock,row.minimumTownhall || 1,row.minimumAcademy || 1,...Object.values(row.minimumBuilding || {})),
  firstQuote: Education.researchQuote(fixture(100), row.id),
  source_file: 'harborlight-v1-education.js' }));
const researchLevels = [];
for (const definition of Education.RESEARCH_CATALOG) {
  for (let level = 1; level <= (definition.kind === 'repeat' ? 100 : 1); level++) {
    const state = fixture(100); state.education.researchLevels[definition.id] = level - 1;
    const quote = Education.researchQuote(state, definition.id);
    assert.equal(quote.ok, true, definition.id);
    state.education.researchLevels[definition.id] = level;
    researchLevels.push({ topic: definition.id, name: definition.name, kind: definition.kind, level,
      minimumAcademy: Math.max(definition.minimumAcademy || 1, definition.kind === 'repeat' ? level : 1),
      minimumTownhall: Math.max(academyUnlock, definition.minimumTownhall || 1, definition.kind === 'repeat' ? level : 1, ...Object.values(definition.minimumBuilding || {})), minimumBuilding: definition.minimumBuilding || {},
      cost: quote.cost, workSecondsOneProfessorOnMother: quote.work, effectMultiplier: definition.kind === 'repeat' ? Education.researchEffect(state, definition.id) : null,
      effect: definition.effect, source_file: 'harborlight-v1-education.js' });
  }
}
const stateRoutes = fixture(100, { discoveries: true });
for (const producer of Object.values(Provisions.RECIPE_CATALOG)) for (const consumer of Object.values(Provisions.RECIPE_CATALOG)) {
  if (consumer.localInputs) continue;
  for (const product of Object.keys(producer.outputs)) if (Object.hasOwn(consumer.inputs, product) && producer.building !== consumer.building) {
    const id = `route:${producer.building}:${consumer.building}:${product}`;
    stateRoutes.education.routes[id] = { source: producer.building, target: consumer.building, product };
    stateRoutes.education.discoveries[id] = true;
  }
}
const directRoutes = Physical.directRouteCatalog(stateRoutes).map(row => ({ ...row, sourcePl: nameOf(row.source), targetPl: nameOf(row.target), productPl: Provisions.GOODS[row.product].name,
  minimumWarehouse: routeUnlock, research: 'Oddzielne odkrycie dla kierunku i produktu', source_file: 'harborlight-v1-development-logistics.js; harborlight-v1-education.js' }));
const studyMilitary = [];
const trainingContext = { feedingMultiplier: () => 1, hasHousing: () => true };
for (let level = 4; level <= 100; level++) {
  const s = fixture(level, { specialists: true });
  const edu = Education.educationStatus(s), soldierStatus = Military.militaryStatus(s);
  const student = edu.candidates.find(person => !edu.professors.some(professor => professor.personUid === person.personUid));
  const teacher = edu.professors[0];
  const learning = Education.educationAction(s, { type: 'educationEnroll', studentUid: student.personUid, teacherUid: teacher.personUid }, trainingContext);
  assert.equal(learning.ok, true, learning.message);
  const recruitState = fixture(level, { specialists: true });
  const military = Military.militaryStatus(recruitState), recruit = military.candidates[0], instructor = military.soldiers[0];
  const recruiting = Military.militaryAction(recruitState, { type: 'militaryRecruit', recruitUid: recruit.personUid, instructorUid: instructor.personUid }, trainingContext);
  assert.equal(recruiting.ok, true, recruiting.message);
  const officerState = fixture(level, { specialists: true });
  const officers = Military.militaryStatus(officerState).soldiers;
  officerState.military.people[officers[0].personUid].rank = 'officer';
  const officer = Military.militaryAction(officerState, { type: 'militaryOfficerTrain', soldierUid: officers[1].personUid, officerUid: officers[0].personUid }, trainingContext);
  assert.equal(officer.ok, true, officer.message);
  studyMilitary.push({ townhallLevel: level, academyLevel: level, barracksLevel: level,
    academyCourseCoins: learning.cost, academyCourseSeconds: learning.remainingSeconds,
    recruitCost: recruiting.cost, recruitSeconds: recruiting.remainingSeconds,
    officerCost: officer.cost, officerSeconds: officer.remainingSeconds,
    professorLimit: edu.professorLimit, barracksBeds: soldierStatus.beds,
    source_file: 'harborlight-v1-education.js; harborlight-v1-military.js' });
}
const militaryOutcomes = [];
for (const officers of [0, 1, 2]) for (const draw of [0, .1, .5, .79, .8, .84, .85, .89, .9, .94, .95, .99]) {
  const state = fixture(4, { specialists: true }), soldiers = Military.militaryStatus(state).soldiers;
  for (const person of soldiers.slice(0, officers)) state.military.people[person.personUid].rank = 'officer';
  const result = Military.militaryAction(state, { type: 'militaryDispatch', personUids: soldiers.map(person => person.personUid) }, { ...trainingContext, random: () => draw });
  assert.equal(result.ok, true, result.message);
  const squad = state.military.squads.at(-1), duration = (squad.returnAt - squad.departedAt) / 1000;
  const before = { returning: squad.returningUids.length, lost: squad.lostUids.length, loot: clone(squad.loot), captives: squad.captives, nomination: !!squad.nominationUid, multiplier: squad.lootMultiplier };
  Military.advanceMilitary(state, duration, { ...trainingContext, endAt: squad.returnAt });
  assert.ok(['returned','lost'].includes(squad.stage));
  const person = state.residents.find(person => squad.returningUids.includes(Education.personKey(person)));
  militaryOutcomes.push({ officers, sent: soldiers.length, fixedRandomDraw: draw, durationSeconds: duration,
    returning: before.returning, lost: before.lost, loot: before.loot, captives: before.captives,
    nomination: before.nomination, lootMultiplier: before.multiplier, settledStage: squad.stage,
    restSeconds: person ? (state.military.people[Education.personKey(person)].restUntil - squad.returnAt) / 1000 : null,
    festiveSeconds: state.military.festiveUntil > squad.returnAt ? (state.military.festiveUntil - squad.returnAt) / 1000 : 0,
    verified: true, source_file: 'harborlight-v1-military.js' });
}
const roads = Array.from({ length: Leisure.ROAD_MAX_LEVEL + 1 }, (_, level) => {
  const state = fixture(5); state.roads.segments.fill(level);
  return { level, speedMultiplier: Leisure.roadSpeedMultiplier(state), capacityMultiplier: Leisure.roadCapacityMultiplier(state),
    carrierCapacityWarehouse5: Logistics.haulCapacity(state), sections: Leisure.roadSummary(state).sections,
    sectionCost: Leisure.roadSummary(state).costPerSection, source_file: 'harborlight-v1-leisure.js;harborlight-v1-logistics.js' };
});
const population = Array.from({ length: 201 }, (_, index) => index - 100).map(happiness => {
  const state = fixture(1), rate = State.populationRateForState(state, happiness);
  return { happiness, residentsPerHour: rate, secondsPerResident: rate ? 3600 / Math.abs(rate) : null,
    direction: rate > 0 ? 'Napływ' : rate < 0 ? 'Odpływ' : 'Brak zmiany', source_file: 'harborlight-v1-state.js' };
});
const conditions = [];
function sourceRule(id, domain, description, file, marker, lineCount = 1) {
  const lines = readFileSync(resolve(ROOT, file), 'utf8').split('\n'), index = lines.findIndex(line => line.includes(marker));
  assert.ok(index >= 0, 'Source rule marker missing: ' + marker);
  conditions.push({ id, domain, description, expression: lines.slice(index, index + lineCount).join('\n').trim(), source_file: file, source_line: index + 1 });
}
sourceRule('course-cost','Akademia','Cena kursu zależy od poziomu Akademii; opłata jest pobierana przy zapisaniu.','harborlight-v1-education.js','const cost=10*academyLevel;');
sourceRule('course-work','Akademia','Praca kursu jest częścią czasu budowy Ratusza.','harborlight-v1-education.js','const work=Math.max(1,townhallBuildSeconds');
sourceRule('graduate-happiness','Akademia','Ukończenie rundy ustawia szczęście absolwenta i okres ochronny.','harborlight-v1-education.js','p.protectedUntil=completedAt+7*DAY*1000',1);
sourceRule('education-efficiency','Akademia','Wydajność absolwenta zależy od najwyższej Akademii, rund i badań; profesor pracuje wolniej.','harborlight-v1-education.js','export function educationWorkMultiplier',8);
sourceRule('professor-limit','Akademia','Mianowanie wymaga absolwenta, wolnego miejsca profesorskiego i szaty.','harborlight-v1-education.js','if(count>=3+academyLevel)',3);
sourceRule('research-team','Akademia','Gotowi profesorowie sumują tempo badania, z mnożnikiem numeru wyspy.','harborlight-v1-education.js','function researchRate',3);
sourceRule('research-queue','Akademia','Badanie danego tematu nie może trwać drugi raz równolegle; składników i postępu nie zwraca anulowanie.','harborlight-v1-education.js',"if(e.researches.some(r=>r.topic===action.topic))",3);
sourceRule('recruit-officer-cost','Koszary','Osobne wyposażenie i cena rekruta oraz oficera.','harborlight-v1-military.js',"const cost=kind==='recruit'?",3);
sourceRule('military-random-return','Koszary','Szanse pełnego, częściowego i zerowego powrotu zależą od obecności oficera.','harborlight-v1-military.js','const officers=people.filter',2);
sourceRule('military-loot','Koszary','Łup, jeńcy i nominacja zależą od niezależnych pobrań generatora.','harborlight-v1-military.js','const loot=count?',2);
sourceRule('military-travel','Koszary','Termin powrotu oddziału jest ukryty w zwykłym publicznym statusie.','harborlight-v1-military.js','const q={id:`squad-',1);
sourceRule('military-waiting','Koszary','Brak miejsca uruchamia terminy rozbudowy Ratusza i Koszar.','harborlight-v1-military.js','function beginWaiting',1);
sourceRule('military-deadlines','Koszary','Przekroczenie terminu oczekiwania oznacza trwałe odejście.','harborlight-v1-military.js','if(w.townhallDeadline&&time>=w.townhallDeadline',1);
sourceRule('military-rest','Koszary','Po przyjęciu powracający żołnierz rozpoczyna odpoczynek.','harborlight-v1-military.js','m.people[key].restUntil=time+DAY*1000',1);
sourceRule('military-nomination','Koszary','Nominacja na oficera uruchamia czasowy bonus szczęścia.','harborlight-v1-military.js','if(q.nominationUid&&m.people[q.nominationUid])',1);
sourceRule('production-local-reserve','Produkcja','Lokalne przetwarzanie ryb chroni materiał potrzebny kolejnym partiom.','harborlight-v1-development-logistics.js','function localProcessingReserve',4);
sourceRule('normal-haul-clock','Transport','Zwykły kurs ma bazowy czas; budowa może podać własny zegar z budżetu zamówienia.','harborlight-v1-logistics.js','state.haulTrips[id].push({worker:index',1);
sourceRule('food-hunger','Jedzenie','Kara głodu zależy od czasu niedoboru i pokrycia posiłków.','harborlight-v1-provisions.js','export function hungerPenalty',1);
sourceRule('clothing-penalty','Ubrania','Kara za brak stroju jest zależna od Ratusza i nie dotyczy specjalistów.','harborlight-v1-provisions.js','export function clothingPenalty',1);
sourceRule('clothing-time','Ubrania','Zużycie i pobranie zapasowego stroju odbywa się osobno dla każdego cywila.','harborlight-v1-provisions.js','while(left>EPS){if(entry.clothingRemaining<=EPS)',2);
sourceRule('milk-souring','Jedzenie','Wiek partii mleka rośnie w centrali, a kwaśne mleko musi zmieścić się w magazynie.','harborlight-v1-provisions.js','function advanceMilk',5);
sourceRule('tax-rate','Podatki','Podatki zależą od uprawnionych mieszkańców, Kaplicy i aktywnego trybu gry.','harborlight-v1-state.js','export function taxRate',3);
sourceRule('clock-permission','Konta','Zmiana czasu ma ścisłe ograniczenie projektu, środowiska i UID.','backend/account-service.mjs','const requireDevClock',3);
sourceRule('no-legacy-food-manufacture','Jedzenie','Historyczna żywność pozostaje zgodnym zapasem, ale bieżący katalog nie ma jej receptury.','harborlight-v1-provisions.js','export const RECIPE_CATALOG',12);
const examples = [];
for (const [recipeId, recipe] of Object.entries(Provisions.RECIPE_CATALOG)) {
  const state = fixture(Math.max(6, recipe.level), { discoveries: true });
  state.buildings[recipe.building].workers = 1;
  state.provisions.assignments[recipe.building] = { [recipeId]: 1 };
  for (const id of Object.keys(Provisions.RECIPE_CATALOG).filter(id => id !== recipeId)) if (Provisions.RECIPE_CATALOG[id].building === recipe.building) state.provisions.assignments[recipe.building][id] = 0;
  const local = state.provisions.localStock[recipe.building] ||= {};
  for (const [id, quantity] of Object.entries(recipe.inputs)) local[id] = quantity;
  const jobs = Physical.developmentProductionJobs(state).filter(job => job.recipeId === recipeId);
  assert.equal(jobs.length, 1, recipeId);
  const before = clone(local), job = jobs[0];
  Physical.progressDevelopmentJob(state, job, job.cycle);
  assert.equal(Physical.completeDevelopmentJob(state, job), true, recipeId);
  for (const id of new Set([...Object.keys(recipe.inputs), ...Object.keys(recipe.outputs)])) assert.equal(local[id] || 0, (before[id] || 0) - (recipe.inputs[id] || 0) + (recipe.outputs[id] || 0), recipeId + ':' + id);
  examples.push({ id: 'physical-batch-' + recipeId, domain: 'Produkcja fizyczna', input: { recipeId, level: state.buildings[recipe.building].level, workers: 1, localBefore: before }, expected: { seconds: job.cycle, inputs: recipe.inputs, outputs: recipe.outputs }, actual: { localAfter: local }, passed: true, source_file: 'harborlight-v1-development-logistics.js' });
}
const foodState = fixture(1), foodQuote = Provisions.quoteConstructionFood(foodState, 1);
assert.equal(foodQuote.satietyRequired, 6); assert.equal(foodQuote.ok, true);
examples.push({ id: 'construction-six-satiety', domain: 'Wyżywienie budowy', input: { oldFoodUnits: 1 }, expected: { satietyRequired: 6 }, actual: foodQuote, passed: true, source_file: 'harborlight-v1-provisions.js' });
assert.equal(Economy.warehouseCapacityPlan(1, { ruleset: 32 }).total, 40000);
examples.push({ id: 'warehouse-level1-40k', domain: 'Magazyn', input: { level: 1, ruleset: 32 }, expected: { total: 40000 }, actual: Economy.warehouseCapacityPlan(1, { ruleset: 32 }), passed: true, source_file: 'harborlight-v1-economy.js' });
let changed = Clock.changeDevAccountClock(null, { rate: 2, requestId: 'workbook-rate-two' }, AT);
const two = Clock.devAccountClockStatus(changed.clock, AT + 1000);
changed = Clock.changeDevAccountClock(changed.clock, { rate: 6, requestId: 'workbook-rate-six' }, AT + 1000);
const six = Clock.devAccountClockStatus(changed.clock, AT + 2000);
changed = Clock.changeDevAccountClock(changed.clock, { rate: 1, requestId: 'workbook-rate-one' }, AT + 2000);
const one = Clock.devAccountClockStatus(changed.clock, AT + 3000);
assert.equal(two.now - AT, 2000); assert.equal(six.now - AT, 8000); assert.equal(one.now - AT, 9000);
examples.push({ id: 'dev-clock-continuity', domain: 'Zegar admin3', input: { realSeconds: 3, rates: [2, 6, 1] }, expected: { gameMilliseconds: [2000, 8000, 9000] }, actual: { two, six, one }, passed: true, source_file: 'backend/dev-account-clock.mjs' });

const modules = { Economy, Provisions, Education, Military, Kingdom, Leisure, Archipelago, Residents };
const ruleCatalog = Object.fromEntries(Object.entries(modules).map(([name, module]) => [name, Object.fromEntries(Object.entries(module).filter(([, value]) => typeof value !== 'function'))]));
const parameters = [];
function flattenRules(prefix, value, file) {
  if (value !== null && typeof value === 'object') { for (const [key, item] of Object.entries(value)) flattenRules(prefix + '.' + key, item, file); return; }
  const application = prefix.startsWith('Economy.WAREHOUSE_CAPACITY_TABLE') || ['Economy.ECONOMY_RULES.capacityBuffer','Economy.ECONOMY_RULES.foodReservePerWarehouseLevel'].includes(prefix)
    ? 'Stała zgodności wcześniejszych reguł; nie stosować do Magazynu32. Aktualne wyniki są w tabeli Poziomy1–100.'
    : prefix === 'Economy.ECONOMY_RULES.maximumLevel' ? 'Granica krzywej czasu; budynki32 obsługują100 poziomów. Nie jest limitem poziomu Ratusza.'
    : 'Dokładna wartość eksportowana; aktywny wariant funkcji dla ruleset32 pokazują tabele wynikowe.';
  parameters.push({ parameter: prefix, value, application, source_file: file });
}
for (const [module, rules] of Object.entries(ruleCatalog)) flattenRules(module, rules, 'harborlight-v1-' + module.toLowerCase() + '.js');
flattenRules('Accounts', { sessionIdleTimeoutMs: SESSION_IDLE_TIMEOUT_MS, legalVersions: LEGAL_DOCUMENT_VERSIONS, devClockRates: Clock.DEV_CLOCK_RATES,
  retentionExample: { anchor: AT, expiry: threeMonthDeadline(AT) }, clockScope: 'tylko uwierzytelniony dev-admin3; lokalny DEV lub projekt harborlight-dev / preprod; PROD odmowa; osobny zegar generacji konta' }, 'backend/account-service.mjs; backend/server.mjs; harborlight-dev-cloud.js');

add('levels', 'Poziomy 1–100', 'Wartości aktualnego ruleset32. Brak bonusów badań, dróg, szczęścia i światła Latarni.', [['level','Poziom'],['maxConstructionSeconds','Najdłuższa budowa [s]'],['populationCapacity','Limit mieszkańców'],['houseBeds','Łóżka Domu'],['warehouseTotal','Magazyn razem'],['warehousePerResource','Limit na zasób'],['carrierCapacity','Udźwig tragarza'],['marketCapacity','Pojemność Targu'],['dockCapacity','Pojemność Portu'],['nextTownhallPopulationRequired','Ludność do następnego Ratusza'],['requiredFoodTypes','Wymagane rodzaje jedzenia'],['professorLimit','Limit profesorów'],['barracksBeds','Łóżka Koszar'],['warehouseNeeds','Koszyk potrzeb Magazynu'],['warehouseBuffer','Mnożnik bufora'],['warehouseRoundingUnit','Zaokrąglenie w dół']], levels, ['harborlight-v1-economy.js','harborlight-v1-logistics.js','harborlight-v1-education.js','harborlight-v1-military.js']);
add('building-levels', 'Budynki i poziomy', 'Cennik poziomu N przy stanie N−1. Bez kolejki i z kolejką; bez rabatu startowego. Poziom1 bywa dostępny od startu lub odblokowuje się automatycznie: jego cennik jest wtedy wyceną, nie faktyczną opłatą. Wyżywienie pokazano oddzielnie.', [['buildingId','ID budynku'],['buildingPl','Budynek'],['currentLevel','Poziom przed'],['targetLevel','Poziom docelowy'],['mode','Sposób uzyskania poziomu'],['priceIsValuationOnly','Tylko wycena poziomu1'],['unlockTownhall','Próg Ratusza'],['ordinaryCost','Koszt zwykły'],['foodUnits','Dawne jednostki żywności'],['foodSatiety','Koszt sytości'],['exampleFoodMix','Przykładowe jedzenie'],['queuedOrdinaryCost','Koszt w kolejce'],['queuedFoodUnits','Jednostki jedzenia w kolejce'],['totalSeconds','Budżet łączny [s]'],['transportSeconds','Transport budowy [s]'],['buildingSeconds','Sama budowa [s]'],['constructionPorters','Tragarze'],['constructionTrips','Kursy ładunku'],['constructionWaves','Fale kursów'],['crewPerProduct','Limit na produkt'],['crewTotal','Limit wszystkich pracowników'],['activeProducts','Dostępne produkty bez odkryć'],['localPerProduct','Magazyn lokalny na produkt'],['localTotal','Magazyn lokalny razem']], buildingLevels, ['harborlight-v1-state.js','harborlight-v1-economy.js','harborlight-v1-provisions.js'], ['Czasy są budżetem modelu przy standardowych warunkach; brak materiałów, pracowników lub bonusy zmieniają faktyczny termin.','Przykładowy dobór jedzenia zakłada duży zapas wszystkich bieżących towarów, bez historycznej żywności.','Puste limity magazynu lokalnego i produktu oznaczają, że budynek nie jest producentem; nie przypisujemy Domowi lub Ratuszowi fikcyjnego magazynu.']);
add('products', 'Produkty', 'Wszystkie obecne towary i zapas historyczny; miejsce produkcji z katalogu receptur.', [['id','ID'],['name','Produkt'],['category','Kategoria'],['price','Cena bazowa [monety]'],['salePrice','Cena sprzedaży bazowa'],['satiety','Sytość na sztukę'],['edible','Jadalny'],['producers','Budynki produkcji'],['productionSpecial','Inne źródło'],['legacy','Historyczny'],['devBalanceProposal','Parametr oznaczony propozycją DEV']], goods, ['harborlight-v1-provisions.js']);
add('recipe-levels', 'Receptury i wydajność', 'Jedna osoba, wydajność bazowa ×1; tempo liczy partie receptury. 2 mięsa w partii nie oznaczają podwojenia liczby partii.', [['recipeId','ID receptury'],['buildingId','ID budynku'],['buildingPl','Budynek'],['level','Poziom budynku'],['minimumBuildingLevel','Minimalny poziom budynku'],['minimumTownhall','Minimalny Ratusz'],['discovery','Odkrycie'],['academyRequired','Wymagana Akademia'],['availableWithoutDiscovery','Dostępne bez odkrycia'],['availableWithDiscovery','Dostępne po odkryciu'],['inputsPerBatch','Surowce na partię'],['outputsPerBatch','Produkty na partię'],['batchesPerWorkerHour','Partie / osoba / godz.'],['secondsPerBatch','Sekundy na partię'],['inputsPerWorkerHour','Zużycie / osoba / godz.'],['outputsPerWorkerHour','Produkcja / osoba / godz.'],['inputFlow','Obieg składników']], recipeLevels, ['harborlight-v1-provisions.js','harborlight-v1-development-logistics.js'], ['Dostępność to osobna kolumna; sama matematyczna wydajność nie odblokowuje receptury.','Posiłki, szczęście, łóżka, wykształcenie, badania, wydarzenia i brak miejsca wpływają na rzeczywistą produkcję.']);
add('research', 'Badania i odkrycia', 'Katalog Akademii odczytany z kodu.', [['id','ID'],['name','Nazwa'],['kind','Rodzaj'],['minimumAcademy','Minimalna Akademia'],['minimumTownhall','Minimalny Ratusz'],['minimumBuilding','Wymagane budynki'],['firstCost','Koszt bazowy'],['effect','Efekt'],['devBalanceProposal','Propozycja balansu DEV']], research, ['harborlight-v1-education.js']);
add('research-levels', 'Badania — poziomy', 'Pełne 1–100 dla badań powtarzalnych oraz pojedyncze odkrycia. Praca jest bazą dla jednego gotowego profesora na wyspie matce.', [['topic','ID badania'],['name','Badanie'],['kind','Rodzaj'],['level','Poziom badania'],['minimumAcademy','Minimalna Akademia'],['minimumTownhall','Minimalny Ratusz'],['minimumBuilding','Wymagane budynki'],['cost','Koszt'],['workSecondsOneProfessorOnMother','Praca bazowa [s]'],['effectMultiplier','Mnożnik efektu'],['effect','Efekt opisowy']], researchLevels, ['harborlight-v1-education.js'], ['Czas rzeczywisty zależy od liczby profesorów, wyspy, jedzenia i łóżek; praca nie jest gwarantowanym terminem.']);
add('direct-routes', 'Transport bezpośredni', 'Możliwe kierunki odtworzone z dopasowania wejść/wyjść i przefiltrowane przez rzeczywisty directRouteCatalog.', [['id','ID odkrycia'],['sourcePl','Źródło'],['targetPl','Cel'],['productPl','Produkt'],['minimumWarehouse','Minimalny Magazyn'],['research','Warunek badania']], directRoutes, ['harborlight-v1-development-logistics.js','harborlight-v1-education.js']);
add('study-and-military', 'Kursy i szkolenia', 'Cytaty faktycznych educationAction / militaryAction: zdrowy, najedzony i zakwaterowany uczeń oraz instruktor, bez przyspieszania.', [['townhallLevel','Ratusz'],['academyLevel','Akademia'],['barracksLevel','Koszary'],['academyCourseCoins','Koszt kursu [monety]'],['academyCourseSeconds','Kurs [s]'],['recruitCost','Koszt rekruta'],['recruitSeconds','Szkolenie rekruta [s]'],['officerCost','Koszt oficera'],['officerSeconds','Szkolenie oficera [s]'],['professorLimit','Limit profesorów'],['barracksBeds','Łóżka Koszar']], studyMilitary, ['harborlight-v1-education.js','harborlight-v1-military.js']);
add('military-outcomes', 'Wyprawy wojskowe — próby', 'Izolowane próby rzeczywistego militaryAction/advanceMilitary. Generator zwraca tę samą podaną liczbę przy każdym losowaniu; to deterministyczne pokrycie gałęzi, nie statystyka prawdopodobieństw lub rozgrywka gracza.', [['officers','Liczba oficerów'],['sent','Wysłanych'],['fixedRandomDraw','Stałe losowanie testowe'],['durationSeconds','Ukryty czas wyprawy [s]'],['returning','Powraca'],['lost','Utraceni'],['loot','Łup'],['captives','Jeńcy'],['nomination','Nominacja'],['lootMultiplier','Mnożnik łupu'],['settledStage','Rozliczony stan'],['restSeconds','Odpoczynek [s]'],['festiveSeconds','Świętowanie [s]'],['verified','Model rozliczony poprawnie']], militaryOutcomes, ['harborlight-v1-military.js'], ['Ukryty termin i wynik są ujawnione w skoroszycie opisującym model; publiczne menu gry celowo ich nie pokazuje.']);
add('roads', 'Ścieżki i transport', 'Bonus kompletnie ukończonego poziomu wszystkich odcinków. Udźwig jest przykładem dla Magazynu5.', [['level','Poziom ścieżek'],['sections','Liczba odcinków'],['sectionCost','Kamień na odcinek'],['speedMultiplier','Mnożnik prędkości'],['capacityMultiplier','Mnożnik udźwigu'],['carrierCapacityWarehouse5','Udźwig: Magazyn5']], roads, ['harborlight-v1-leisure.js','harborlight-v1-logistics.js']);
add('population', 'Przyrost i odpływ', 'Podstawowa funkcja przyrostu ruleset32; wolne miejsca, ochrony i pozostałe zdarzenia modelu nadal muszą być spełnione.', [['happiness','Szczęście'],['residentsPerHour','Osoby na godzinę'],['secondsPerResident','Sekundy na osobę'],['direction','Kierunek']], population, ['harborlight-v1-state.js'], ['Nie jest to prognoza populacji: pojemność, łóżka i inne procesy mogą zatrzymać przyrost.']);
add('conditional-rules', 'Reguły warunkowe', 'Opis warunku i dosłowny fragment bieżącego kodu z numerem linii. Uzupełnia tabele liczb o gałęzie, których nie można sprowadzić do jednej stałej.', [['id','ID'],['domain','Obszar'],['description','Opis'],['expression','Dokładny warunek / wzór z kodu'],['source_file','Plik'],['source_line','Linia']], conditions, [...new Set(conditions.map(row => row.source_file))]);
add('parameters', 'Parametry i limity', 'Publiczne stałe i wynikowe terminy kont; wartości pobrane z modułów bez ręcznego przepisywania. Zachowane stałe historyczne są oznaczone; nie zastępują wyników funkcji dla32.', [['parameter','Parametr'],['value','Wartość'],['application','Zastosowanie / wariant'],['source_file','Źródło']], parameters, sourceFiles.filter(name => /economy|provisions|education|military|kingdom|leisure|archipelago|account|dev-cloud/.test(name)));
add('validated-examples', 'Sprawdzone przykłady', 'Odtworzone partie fizycznej produkcji, koszt sytości, pojemność i ciągłość zegara; każde pole passed jest wynikiem assert przeciw rzeczywistemu modelowi.', [['id','ID'],['domain','Obszar'],['input','Wejście'],['expected','Oczekiwane'],['actual','Wynik modelu'],['passed','Zgodne'],['source_file','Źródło']], examples, ['harborlight-v1-development-logistics.js','harborlight-v1-provisions.js','harborlight-v1-economy.js','backend/dev-account-clock.mjs']);
const levelColumns = tables.find(table => table.id === 'levels').columns;
levelColumns.push(...columns([['marketUnlocked','Targ odblokowany'],['dockUnlocked','Port odblokowany'],['academyUnlocked','Akademia odblokowana'],['barracksUnlocked','Koszary odblokowane']]));
const buildingColumns = tables.find(table => table.id === 'building-levels').columns;
buildingColumns.find(column => column.key === 'crewTotal').label = 'Pracownicy bez odkryć';
buildingColumns.push(...columns([['crewTotalAfterDiscoveries','Pracownicy po odkryciach'],['productsAfterDiscoveries','Produkty po odkryciach']]));

add('building-art-stages', 'Wygląd budynków — poziomy', 'Dwadzieścia rodzin × dziesięć wyglądów, odczytanych z aktualnego manifestu i czystego resolvera interfejsu. Pary dotyczą poziomu wskazanego w kolumnie źródła wyglądu. Teatr ma nadal poziom funkcjonalny1, a jego wygląd śledzi Ratusz.', [['id','ID wariantu'],['buildingId','ID budynku'],['buildingPl','Budynek'],['modelMaximumLevel','Maksymalny poziom w modelu'],['visualLevelSourceId','ID źródła poziomu wyglądu'],['visualLevelSourcePl','Poziom wyglądu pochodzi z'],['minimumVisualLevel','Poziom wyglądu od'],['maximumVisualLevel','Poziom wyglądu do'],['exampleModelLevel','Poziom budynku w przykładzie'],['effectiveVisualLevel','Poziom użyty przez resolver'],['frameNumber','Wariant1–10'],['image','Obraz'],['imageSize','Wymiary bieżącego obrazu [px]'],['frameRect','Klatka w bieżącym obrazie [x,y,w,h]'],['alphaBoundsInFrame','Obwiednia alfa w klatce'],['viewBox','Kadr SVG'],['originalAtlasImage','Oryginalny atlas'],['originalAtlasSize','Wymiary oryginalnego atlasu [px]'],['originalAtlasFrameRect','Klatka w oryginalnym atlasie [x,y,w,h]'],['paintDepth','Kolejność malowania według głębokości'],['mapRect','Prostokąt mapy'],['groundAnchor','Kotwica gruntu'],['lockedLevel0FrameNumber','Podgląd zablokowanego poziomu0'],['level21FrameNumber','Wariant przy poziomie21'],['level100FrameNumber','Wariant przy poziomie100'],['source_file','Źródło']], buildingStageRows, ['harborlight-v1-building-stages.js', BuildingStages.BUILDING_STAGE_MANIFEST], ['Zmiana wyglądu nie odblokowuje budynku i nie zmienia kosztów, czasów, limitów ani zapisanego poziomu.','Przy poziomie0 pozostaje podgląd pierwszego wariantu, z zachowaniem blokady funkcji; powyżej20 pozostaje wariant10.','Ozdobna chatka także śledzi Ratusz, ale nie jest dwudziestą pierwszą funkcją gospodarczą. Żuraw jest odrębną nakładką rzeczywistej budowy.','Bieżący obraz jest osobnym bezstratnym kadrem; oryginalny atlas pozostaje jawnym punktem odniesienia. PaintDepth500 Zakładu skórzanego poprawia wyłącznie kolejność warstw przed Kamieniołomem.']);

const result = { meta: { appVersion: GAME_VERSION, ruleset: Development.DEVELOPMENT_RULESET, sourceCommit, fixedEpoch: AT,
  fixedEpochIso: new Date(AT).toISOString(), acceptedApplicationSource: '37061c43139f32dfba61e4d837b133ed9d2d7da8',
  acceptedPublicationSource: 'c4f752142c0421aad1dc0490a2f5139c277e6ee5', sourceHashes,
  networkOrLiveAccountOperations: 0, deterministic: true },
  catalogs: { buildings: Object.fromEntries(buildingIds.map(id => [id, { ...State.ALL_BUILDINGS[id], namePl: nameOf(id), unlockTownhall: unlocks[id] }])), goods: Provisions.GOODS, recipes: Provisions.RECIPE_CATALOG, research: Education.RESEARCH_CATALOG },
  rules: ruleCatalog, initialState: { schema: fresh.version, population: fresh.population, resources: fresh.resources,
    buildings: Object.fromEntries(Object.entries(fresh.buildings).map(([id,b]) => [id,{level:b.level,workers:b.workers}])),
    onboarding: State.onboardingStatus(fresh), housingCapacity: State.housingCapacity(fresh), happiness: fresh.happiness,
    houseHappinessPool: fresh.houseHappinessPool, welcome: fresh.welcome, welcomeWorkers: fresh.welcomeWorkers,
    initialPersonNeedsExample: clone(Object.values(fresh.provisions.people)[0]) },
  currentVsPending: [
    { topic: 'Ser', current: 'Gospodarstwo, farmCheese, poziom6 i odkrycie cheese;4 kwaśne mleka→1ser.', pending: 'Przeniesienie sera do Mleczarni nie występuje w bieżącym katalogu kodu.', source_file: 'harborlight-v1-provisions.js' },
    { topic: 'Otręby i pasza', current: 'Brak towarów, receptur i odkryć otrębów/paszy w bieżących katalogach.', pending: 'Nie traktować wcześniejszych propozycji jako wdrożonej gospodarki.', source_file: 'harborlight-v1-provisions.js;harborlight-v1-education.js' },
    { topic: 'Wędzenie ryb', current: 'Rybak poziom5 i odkrycie fishProcessing; lokalne świeże ryby bez transportu do centrali.', pending: 'Ceny i dawki nadal mają znacznik devBalanceProposal w kodzie.', source_file: 'harborlight-v1-provisions.js;harborlight-v1-education.js' }
  ], sheet_tables: tables, checks: { passed: true, physicalRecipeExamples: recipeIds.length, numericExamples: examples.length,
    buildingLevelRows: buildingLevels.length, recipeLevelRows: recipeLevels.length, researchLevelRows: researchLevels.length,
    directRouteRows: directRoutes.length, trainingQuoteRows: studyMilitary.length, militaryLifecycleCases: militaryOutcomes.length,
    sourceConditionRows: conditions.length, buildingArtStageRows: buildingStageRows.length,
    buildingArtFamilies: BuildingStages.BUILDING_STAGE_IDS.length },
  limitations: ['Tabele są eksportem reguł i cytatów, nie zapisem użytkownika ani dowodem wdrożenia.','Scenariusze kosztów zakładają duże zapasy bieżących towarów; efekty mnożników i ograniczenia logistyczne opisano oddzielnie.'] };
assert.equal(GAME_VERSION, '0.15.2.3'); assert.equal(fresh.ruleset, 32); assert.equal(fresh.population, 18);
const json = JSON.stringify(result, (key, value) => typeof value === 'number' && !Number.isFinite(value) ? null : value, 2) + '\n';
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0) {
  const output = resolve(process.argv[outputIndex + 1]); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, json);
  console.error(JSON.stringify({ output, appVersion: GAME_VERSION, tables: tables.length, rows: tables.reduce((n,t) => n + t.rows.length, 0), checks: result.checks }));
} else process.stdout.write(json);
