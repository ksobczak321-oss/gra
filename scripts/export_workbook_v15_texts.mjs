#!/usr/bin/env node
// Read-only current-copy and static-code evidence for the master workbook.
// No UI/server module is executed and no account, cloud or environment secret
// is read. Node's own bundled parser avoids a network-installed dependency.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { ADVISOR_INTRO_IDS, createAdvisorTourSteps, TOUR_MENU_INFORMATION_IDS, tourMenuInformation } from '../harborlight-v1-advisor-intro.js';
import { advisorSuggestion } from '../harborlight-v1-advisor.js';
import { PRACTICAL_TUTORIAL_ENABLED } from '../harborlight-v1-learning-policy.js';
import * as Approved from '../harborlight-v1-approved-copy.js';
import * as Progression from '../harborlight-v1-progression.js';
import * as Copy from '../harborlight-v1-copy.js';
import * as DevelopmentCopy from '../harborlight-v1-development-copy.js';
import * as State from '../harborlight-v1-state.js';
import * as I18n from '../harborlight-v1-i18n.js';
import { THEATRE_TRANSLATIONS } from '../harborlight-v1-theatre.js';
import { ADVENTURE_TRANSLATIONS } from '../harborlight-v1-adventures.js';
import { GAME_VERSION } from '../harborlight-version.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SCRIPT = fileURLToPath(import.meta.url);
const FIXED_EPOCH = Date.UTC(2026, 10, 16, 12);
const MAX_CELL = 24000;
const lineIndexes = new Map();
let publicApplicationFiles = new Set();
const require = createRequire(import.meta.url);
let acorn;
try { acorn = require('internal/deps/acorn/acorn/dist/acorn'); } catch { /* CLI relaunch below. */ }
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value, (_key, item) => typeof item === 'function' ? String(item) : typeof item === 'bigint' ? String(item) : item);
const hasPolish = text => /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/u.test(text);
const sourceFiles = (...values) => [...new Set(values.flat())];
const columns = pairs => pairs.map(([key, label]) => ({ key, label }));
const table = (id, title, description, cols, rows, files, extra = {}) => ({ id, title, description, columns: columns(cols), rows, source_files: files, limitations: [], ...extra });

function sliceUtf16(text, start, limit) {
  let end = Math.min(text.length, start + limit);
  if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
  return [text.slice(start, end), end];
}

function safeRows(definition) {
  // Keep every character. Long cells become numbered continuation rows rather
  // than silently losing code or text at Excel's 32767-character cell limit.
  const rows = [];
  for (const original of definition.rows) {
    const fragments = {};
    let count = 1;
    for (const { key } of definition.columns) {
      const value = original[key];
      if (typeof value !== 'string' || value.length <= MAX_CELL) continue;
      fragments[key] = [];
      for (let start = 0; start < value.length;) {
        const [part, end] = sliceUtf16(value, start, MAX_CELL);
        fragments[key].push(part); start = end;
      }
      count = Math.max(count, fragments[key].length);
    }
    for (let index = 0; index < count; index++) {
      const row = { ...original, fragment: `${index + 1}/${count}` };
      for (const [key, parts] of Object.entries(fragments)) row[key] = parts[index] || '';
      rows.push(row);
    }
  }
  return { ...definition, columns: [...definition.columns, { key: 'fragment', label: 'Fragment' }], rows };
}

function lineAt(source, position) {
  let indexes = lineIndexes.get(source);
  if (!indexes) {
    indexes = [0];
    for (let at = 0; at < source.length; at++) if (source.charCodeAt(at) === 10) indexes.push(at + 1);
    lineIndexes.set(source, indexes);
  }
  let low = 0, high = indexes.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (indexes[middle] <= position) low = middle + 1; else high = middle;
  }
  return low;
}

function displayNode(source, node) {
  return node ? source.slice(node.start, node.end) : '';
}

function childEntries(node) {
  const result = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'range') continue;
    if (Array.isArray(value)) {
      for (const child of value) if (child && typeof child.type === 'string') result.push([key, child]);
    } else if (value && typeof value.type === 'string') result.push([key, value]);
  }
  return result;
}

function htmlDecode(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, token) => {
    if (token[0] === '#') {
      const number = token[1].toLowerCase() === 'x' ? parseInt(token.slice(2), 16) : parseInt(token.slice(1), 10);
      return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : all;
    }
    return named[token] ?? all;
  });
}

function englishKey(value) {
  return typeof value === 'string' && value.length > 1 && !/^(?:id|name|type|kind|text|title|description|label|message|class|value|status|source|target)$/i.test(value) && !/^(?:https?:|\.\.?\/|\/api\/)/.test(value);
}

async function applicationSources() {
  const build = await readFile(path.join(ROOT, 'scripts/build_frontend.py'), 'utf8');
  const list = build.match(/PUBLIC_FILES\s*=\s*\(([\s\S]*?)\n\)/)?.[1];
  assert(list, 'Cannot read the explicit public application allowlist.');
  const names = [...list.matchAll(/"([^"]+)"/g)].map(match => match[1]).filter(name => /\.(?:js|mjs|html)$/.test(name));
  publicApplicationFiles = new Set(names);
  const top = (await readdir(ROOT)).filter(name => /^(?:harborlight.*\.(?:js|mjs|html)|index\.html|game\.js|panic-pets\.js)$/.test(name));
  const backend = [];
  async function walk(directory) {
    for (const entry of await readdir(path.join(ROOT, directory), { withFileTypes: true })) {
      const name = directory + '/' + entry.name;
      if (entry.isDirectory() && !/^(?:tests?|fixtures?|node_modules|\.git|build|dist)$/.test(entry.name)) await walk(name);
      else if (entry.isFile() && /\.(?:js|mjs)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name)) backend.push(name);
    }
  }
  await walk('backend');
  return [...new Set([...names, ...top, ...backend])].sort();
}

function sourceScope(file) {
  if (publicApplicationFiles.has(file)) return 'Bieżący pakiet gry';
  if (file.startsWith('backend/')) return 'Bieżący backend / runtime DEV';
  if (['game.js', 'panic-pets.js'].includes(file)) return 'Osobna gra / planszówka';
  return 'Prototyp lub zgodność historyczna poza pakietem';
}

export async function exportTexts({ includeSource = true } = {}) {
  if (!acorn) throw new Error('Static parsing needs Node24 --expose-internals; the CLI enables it automatically.');
  const names = await applicationSources();
  const sources = new Map(await Promise.all(names.map(async name => [name, await readFile(path.join(ROOT, name), 'utf8')])));
  const functions = [], constants = [], branches = [], candidates = [], htmlTexts = [], codeRows = [], manifests = [], astTranslations = [];
  const catalogIds = new Set(Object.keys(DevelopmentCopy.DEVELOPMENT_COPY)), catalogReferences = new Map();
  let nodeCount = 0;
  function parseSource(file, fullSource, code, offset = 0, scriptType = 'module') {
    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: scriptType, locations: true, allowAwaitOutsideFunction: true });
    let fileNodes = 0, fileFunctions = 0, fileConditions = 0, fileConstants = 0;
    const atLine = position => lineAt(fullSource, offset + position);
    const get = node => displayNode(code, node);
    const guardText = guards => guards.map(guard => `${guard.kind}: ${guard.text}`).join('\n');
    function visit(node, parent = null, field = '', scope = [], guards = []) {
      nodeCount++; fileNodes++;
      const line = atLine(node.start), endLine = atLine(node.end);
      const nodeId = `${file}:${line}:${node.start + offset}`;
      let nextScope = scope;
      if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') nextScope = [...scope, node.id?.name || '(klasa anonimowa)'];
      if (/^(?:FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type)) {
        const inferred = node.id?.name || (parent?.type === 'VariableDeclarator' ? get(parent.id) : ['Property', 'MethodDefinition'].includes(parent?.type) ? get(parent.key) : '(funkcja anonimowa)');
        const signature = get(node).slice(0, Math.min(2000, node.body?.start - node.start || 2000));
        nextScope = [...scope, inferred]; fileFunctions++;
        functions.push({ id: nodeId, file, line, end_line: endLine, name: inferred, scope: scope.join(' → '), signature, async: node.async === true, generator: node.generator === true, start: offset + node.start, end: offset + node.end, condition: guardText(guards) });
      }
      if (node.type === 'VariableDeclaration' && node.kind === 'const') {
        for (const declaration of node.declarations) {
          fileConstants++;
          constants.push({ id: `${file}:${atLine(declaration.start)}:${offset + declaration.start}`, file, line: atLine(declaration.start), name: get(declaration.id), scope: scope.join(' → '), expression: get(declaration.init), expression_type: declaration.init?.type || '', condition: guardText(guards), start: offset + declaration.start, end: offset + declaration.end });
        }
      }
      if (['IfStatement', 'ConditionalExpression', 'SwitchStatement', 'SwitchCase', 'LogicalExpression', 'ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement', 'CatchClause'].includes(node.type)) {
        const test = node.test || (node.type === 'SwitchCase' ? node.test : null) || (node.type === 'LogicalExpression' ? node.left : null);
        const condition = node.type === 'SwitchStatement' ? get(node.discriminant) : node.type === 'SwitchCase' && !node.test ? 'default' : test ? get(test) : node.type === 'CatchClause' ? `catch (${get(node.param)})` : get(node.left || node.right || node.init);
        branches.push({ id: nodeId, file, line, end_line: endLine, kind: node.type, operator: node.operator || '', scope: scope.join(' → '), condition, ancestors: guardText(guards), start: offset + node.start, end: offset + node.end });
        fileConditions++;
      }
      if (node.type === 'Property' && !node.computed && node.value?.type === 'Literal' && typeof node.value.value === 'string') {
        const key = node.key.type === 'Literal' ? node.key.value : node.key.name;
        if (englishKey(key) && (hasPolish(node.value.value) || /(?:i18n|copy|theatre|adventures)/.test(file) && /\s/.test(String(key)))) astTranslations.push({ original: String(key), polish: node.value.value, file, line, origin: 'Para klucz/wartość w AST — kontekst w źródle' });
      }
      if (node.type === 'CallExpression' && /(?:uiCopy|approvedCopy)$/.test(get(node.callee)) && node.arguments.length >= 2 && node.arguments.slice(0, 2).every(arg => arg.type === 'Literal' && typeof arg.value === 'string') && !['pl', 'en'].includes(node.arguments[1].value)) {
        astTranslations.push({ original: node.arguments[0].value, polish: node.arguments[1].value, file, line, origin: 'Para en/pl wywołania uiCopy' });
      }
      const literal = node.type === 'Literal' && typeof node.value === 'string';
      const template = node.type === 'TemplateLiteral';
      if (literal && catalogIds.has(node.value) && !(parent?.type === 'Property' && field === 'key')) {
        const references = catalogReferences.get(node.value) || [];
        references.push({ file, line, scope: scope.join(' → '), condition: guardText(guards) });
        catalogReferences.set(node.value, references);
      }
      if (literal || template) {
        const value = literal ? node.value : get(node);
        const structural = parent && (/^(?:Import|Export)/.test(parent.type) && field === 'source' || parent.type === 'Property' && field === 'key' || parent.type === 'MemberExpression' && field === 'property');
        const probable = !structural && value.length > 1 && (hasPolish(value) || /\s/.test(value) || /^(?:title|text|label|message|description|warning|placeholder|aria-label)$/.test(parent?.key?.name || parent?.key?.value || '') || parent?.type === 'CallExpression' && /(?:button|note|toast|stat|uiCopy|approvedCopy)$/.test(get(parent.callee)));
        if (probable) {
          const paired = literal && parent?.type === 'CallExpression' && /(?:uiCopy|approvedCopy)$/.test(get(parent.callee)) && parent.arguments[0] === node && parent.arguments[1]?.type === 'Literal' && typeof parent.arguments[1].value === 'string' && !['pl', 'en'].includes(parent.arguments[1].value) ? parent.arguments[1].value : null;
          candidates.push({ id: nodeId, file, line, end_line: endLine, kind: template ? 'Szablon z wyrażeniami' : 'Literał tekstowy', original: value, template: get(node), scope: scope.join(' → '), condition: guardText(guards) || 'Bez nadrzędnej gałęzi w AST; obowiązuje kontekst wywołania.', paired_polish: paired, source_start: offset + node.start, source_end: offset + node.end });
        }
      }
      for (const [key, child] of childEntries(node)) {
        let nextGuards = guards;
        if ((node.type === 'IfStatement' || node.type === 'ConditionalExpression') && ['consequent', 'alternate'].includes(key)) nextGuards = [...guards, { kind: key === 'consequent' ? 'gdy' : 'w przeciwnym razie', text: get(node.test) }];
        if (node.type === 'LogicalExpression' && key === 'right') nextGuards = [...guards, { kind: node.operator === '&&' ? 'gdy lewa strona prawdziwa' : node.operator === '||' ? 'gdy lewa strona fałszywa' : 'gdy lewa strona null/undefined', text: get(node.left) }];
        if (node.type === 'SwitchStatement' && key === 'cases') nextGuards = [...guards, { kind: 'switch', text: get(node.discriminant) }];
        if (node.type === 'SwitchCase' && key === 'consequent') nextGuards = [...guards, { kind: 'case', text: node.test ? get(node.test) : 'default' }];
        visit(child, node, key, nextScope, nextGuards);
      }
    }
    visit(ast);
    return { ast_nodes: fileNodes, functions: fileFunctions, conditions: fileConditions, constants: fileConstants };
  }
  for (const [file, source] of sources) {
    let stats = { ast_nodes: 0, functions: 0, conditions: 0, constants: 0 }, scripts = 0;
    if (/\.html$/.test(file)) {
      for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
        if (/\bsrc\s*=|\btype\s*=\s*['"](?:application|importmap)/i.test(match[1]) || !match[2].trim()) continue;
        const offset = match.index + match[0].indexOf('>') + 1;
        const part = parseSource(file, source, match[2], offset, /type\s*=\s*['"]module['"]/i.test(match[1]) ? 'module' : 'script');
        for (const key of Object.keys(stats)) stats[key] += part[key]; scripts++;
      }
      const masked = source.replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)\s*>|<!--[\s\S]*?-->/gi, value => value.replace(/[^\n]/g, ' '));
      for (const match of masked.matchAll(/>([^<]+)</g)) {
        const text = htmlDecode(match[1]).replace(/\s+/g, ' ').trim();
        if (text && /\p{L}/u.test(text)) htmlTexts.push({ file, line: lineAt(source, match.index + 1), type: 'Treść elementu HTML', text, condition: 'Statyczny tekst dokumentu; widoczność zależy od CSS i kodu strony.' });
      }
      for (const match of masked.matchAll(/\b(aria-label|placeholder|title|alt)\s*=\s*(['"])([\s\S]*?)\2/g)) htmlTexts.push({ file, line: lineAt(source, match.index), type: `Atrybut ${match[1]}`, text: htmlDecode(match[3]), condition: 'Etykieta lub podpowiedź HTML; widoczność zależy od elementu.' });
    } else stats = parseSource(file, source, source);
    let chunk = 0;
    if (includeSource) for (let start = 0; start < source.length;) {
      const [code, end] = sliceUtf16(source, start, MAX_CELL);
      codeRows.push({ file, chunk: ++chunk, start, end, line: lineAt(source, start), end_line: lineAt(source, end), sha256: hash(source), code });
      start = end;
    }
    manifests.push({ file, sha256: hash(source), bytes: Buffer.byteLength(source), lines: source.split('\n').length, utf16_length: source.length, ...stats, inline_scripts: scripts, source_chunks: chunk, source_kind: sourceScope(file), complete_source: includeSource });
  }

  const translationSources = [
    ['APPROVED_TRANSLATIONS', Approved.APPROVED_TRANSLATIONS, 'harborlight-v1-approved-copy.js'],
    ['COPY_TRANSLATIONS', Copy.COPY_TRANSLATIONS, 'harborlight-v1-copy.js'],
    ['THEATRE_TRANSLATIONS', THEATRE_TRANSLATIONS, 'harborlight-v1-theatre.js'],
    ['ADVENTURE_TRANSLATIONS', ADVENTURE_TRANSLATIONS, 'harborlight-v1-adventures.js']
  ];
  const translations = translationSources.flatMap(([catalog, entries, file]) => Object.entries(entries).map(([original, polish]) => ({ catalog, original, polish, file, line: '', origin: 'Rzeczywisty eksport mapy tłumaczeń' })));
  for (const [, entries] of translationSources) I18n.registerTranslations(entries);
  const uiCopyPairs = astTranslations.filter(row => row.origin === 'Para en/pl wywołania uiCopy');
  I18n.registerTranslations(Object.fromEntries(uiCopyPairs.filter(row => ['Bieżący pakiet gry', 'Bieżący backend / runtime DEV'].includes(sourceScope(row.file))).map(row => [row.original, row.polish])));
  for (const row of candidates) {
    row.source_scope = sourceScope(row.file);
    row.polish = row.paired_polish ?? (row.kind === 'Literał tekstowy' ? I18n.translate(row.original, 'pl') : '');
    row.translation_status = row.paired_polish !== null ? 'PL z pary en/pl w tym samym wywołaniu' : row.kind !== 'Literał tekstowy' ? 'Wyrażenia runtime zachowane; bez zgadywania wartości' : row.polish !== row.original ? 'PL z mapy / translatora; kontekst zachowany w kolumnach' : hasPolish(row.original) ? 'Polski tekst w źródle' : 'Literał źródłowy; brak pewnego mapowania PL';
    delete row.paired_polish;
  }
  for (const row of htmlTexts) row.source_scope = sourceScope(row.file);

  const canonical = State.createState(FIXED_EPOCH, { ruleset: 32, onboarding: true });
  const baseOptions = { cloudAccount: true, firstIntroduction: true, simulatedCharity: false, state: canonical,
    resourceExample: { resource: 'stone', local: Math.floor(canonical.buildings.quarry.ready || 0), central: Math.floor(canonical.resources.stone || 0), inTransit: 0, hourlyBalance: State.resourceRates(canonical).stone.net } };
  const activeTourFor = options => createAdvisorTourSteps(Approved.APPROVED_TOUR_IDS.map(id => ({
    id, title: () => Approved.getTourCopy(id, 'pl', options).title, text: () => Approved.getTourCopy(id, 'pl', options).text
  }))).map((step, index) => ({ order: index + 1, id: step.id, title: typeof step.title === 'function' ? step.title('pl') : step.title, text: typeof step.text === 'function' ? step.text('pl') : step.text, condition: 'Pierwsze wprowadzenie; konto chmurowe; rzeczywiste dynamiczne funkcje opisu.', file: 'harborlight-v1-advisor-intro.js;harborlight-v1-approved-copy.js;harborlight-v1-development-copy.js' }));
  const activeTour = activeTourFor(baseOptions);
  const tour = Approved.APPROVED_TOUR_IDS.map((id, index) => ({ order: index + 1, id, ...Approved.getTourCopy(id, 'pl', baseOptions), condition: 'Zachowany katalog56 i stabilny indeks dawnych zapisów; bieżący tutorial pokazuje osobno28 kroków. Konto chmurowe; start v32, Pomagam bez dopisku symulacji.', file: 'harborlight-v1-approved-copy.js;harborlight-v1-development-copy.js' }));
  const menuInformation = Object.keys(TOUR_MENU_INFORMATION_IDS).flatMap(menu => tourMenuInformation(menu, 'pl', baseOptions).map(topic => ({ menu, archive_order: Approved.APPROVED_TOUR_IDS.indexOf(topic.id) + 1, ...topic, condition: 'Wyświetlane pod przyciskiem i po otwarciu odpowiedniego menu; poza aktywnym tutorialem.', file: 'harborlight-v1-advisor-intro.js;harborlight-v1-play.js' })));
  const advisorProfiles = [
    { profile: 'Kanoniczny start', state: structuredClone(canonical), options: { language: 'pl' } },
    { profile: 'Start bez monet — jawna fikstura', state: { ...structuredClone(canonical), resources: { ...canonical.resources, coins: 0 } }, options: { language: 'pl' } },
    { profile: 'Wybrany cel Port — stan startowy', state: structuredClone(canonical), options: { language: 'pl', goal: 'dock' } }
  ];
  const advisorPlans = advisorProfiles.flatMap(({ profile, state, options }) => {
    const before = json(state), plan = advisorSuggestion(state, options);
    assert.equal(json(state), before, 'Read-only advisor example changed its fixture');
    assert(plan.title && plan.steps.length >= 2 && plan.steps.length <= 5, 'Current advisor must expose one goal and2–5 actions');
    return plan.steps.map((action, index) => ({ profile, goal: plan.title, explanation: plan.text, order: index + 1, action: action.text, target: action.target || '', section: action.section || '', options: json(options), input: before, output: json(plan), condition: 'Rzeczywista funkcja doradcy na jawnej fiksturze; nie rozgrywka użytkownika ani dowód optymalności globalnej.', file: 'harborlight-v1-advisor.js' }));
  });
  const guidancePolicy = [
    { feature: 'Tutorial wprowadzenia i powtórki w Pomocy', availability: 'Dostępny', value: ADVISOR_INTRO_IDS.length, detail: 'Aktywne28 kroków; numeracja dawnych56 pozycji pozostaje stabilna,20+21 mają wspólny przystanek.', file: 'harborlight-v1-advisor-intro.js' },
    { feature: 'Archiwalny katalog oprowadzania', availability: 'Zachowany dla tekstów i zapisów', value: Approved.APPROVED_TOUR_IDS.length, detail: 'Nie jest pełną aktywną trasą tutoriala. Usunięte12–19 mają objaśnienia w menu i.', file: 'harborlight-v1-approved-copy.js;harborlight-v1-advisor-intro.js' },
    { feature: 'Samouczek praktyczny', availability: PRACTICAL_TUTORIAL_ENABLED ? 'Dostępny' : 'Tymczasowo ukryty', value: Progression.TUTORIAL_LESSONS.length, detail: 'Kod, treści, pozycja, historia wykonanych lekcji i odebrane nagrody zachowane. Wyłączenie nie oznacza ukończenia kursu i nie przyznaje skrzyń.', file: 'harborlight-v1-learning-policy.js;harborlight-v1-play.js' },
    { feature: 'Misje Latarni po ukryciu samouczka', availability: 'Niezależne od ukrytego kursu', value: 'Ratusz≥2 i rozpoczęty świat', detail: 'Pozostałe warunki misji są zachowane; wyłączenie samouczka nie zeruje ani nie kończy postępu.', file: 'harborlight-v1-learning-policy.js;harborlight-v1-missions.js' },
    { feature: 'Doradca Królestwa', availability: 'Dobrowolny plan bieżącej wyspy', value: '1cel /2–5akcji', detail: 'Aktualizuje rady z bieżącego stanu, podpowiada dostępne minigry przy niedoborze monet; nie wykonuje operacji za gracza ani nie gwarantuje globalnego optimum.', file: 'harborlight-v1-advisor.js;harborlight-v1-advisor-ui.js' }
  ];
  const variantProfiles = [
    ['Ponowne oprowadzanie', { firstIntroduction: false }],
    ['Podgląd bez konta', { cloudAccount: false }],
    ['DEV/PRE-PROD — Pomagam symulowane', { simulatedCharity: true }],
    ['Gospodarstwo poziom2', { state: { ...canonical, buildings: { ...canonical.buildings, farm: { ...canonical.buildings.farm, level: 2 } } } }],
    ['Gospodarstwo poziom6 i odkryty ser', { state: { ...canonical, buildings: { ...canonical.buildings, farm: { ...canonical.buildings.farm, level: 6 } }, education: { ...canonical.education, discoveries: { ...canonical.education?.discoveries, cheese: true } } } }],
    ['Zakład skórzany po otwarciu Akademii', { state: { ...canonical, buildings: { ...canonical.buildings, academy: { ...canonical.buildings.academy, level: 1 } } } }]
  ];
  const archiveTourVariants = variantProfiles.flatMap(([condition, options]) => Approved.APPROVED_TOUR_IDS.flatMap((id, index) => {
    const actual = Approved.getTourCopy(id, 'pl', { ...baseOptions, ...options });
    return actual.title !== tour[index].title || actual.text !== tour[index].text ? [{ scope: 'Katalog archiwalny56', order: index + 1, id, ...actual, condition, file: 'harborlight-v1-approved-copy.js;harborlight-v1-development-copy.js' }] : [];
  }));
  const activeTourVariants = variantProfiles.flatMap(([condition, options]) => activeTourFor({ ...baseOptions, ...options }).flatMap((row, index) =>
    row.title !== activeTour[index].title || row.text !== activeTour[index].text ? [{ ...row, scope: 'Aktywny tutorial28', condition }] : []));
  const tourVariants = [...activeTourVariants, ...archiveTourVariants];
  const lessons = Progression.TUTORIAL_LESSONS.map(lesson => {
    const approved = Approved.lessonCopy(lesson.id, 'pl', { curriculum: Progression.TUTORIAL_VERSION });
    return { order: lesson.index, id: lesson.id, curriculum: Progression.TUTORIAL_VERSION, title: approved?.title || lesson.titlePl, text: approved?.description || lesson.descriptionPl, kind: lesson.kind, subject: lesson.subject, prerequisite: lesson.prerequisite || '', route: lesson.route || '', reward_kind: lesson.rewardKind, goal_level: lesson.goalLevel ?? '', assignment_count: lesson.assignmentCount ?? '', selector: lesson.guideSelector || '', definition: json(lesson), condition: PRACTICAL_TUTORIAL_ENABLED ? 'Kolejność i gotowość sprawdzane przez tutorialStatus/tutorialAction; pełne warunki w indeksie funkcji i kodzie.' : 'Kurs tymczasowo ukryty; definicje, zapisany postęp i nagrody zachowane do przyszłego przywrócenia. Nie jest aktywnym ekranem ani ukończonym zadaniem.', file: 'harborlight-v1-progression.js;harborlight-v1-approved-copy.js;harborlight-v1-learning-policy.js' };
  });
  const intro = Approved.introCopy('pl');
  const introRows = [{ id: 'intro-title', type: 'Tytuł', text: intro.title, file: 'harborlight-v1-approved-copy.js' }, ...intro.paragraphs.map((text, index) => ({ id: `intro-${index + 1}`, type: 'Akapit', text, file: 'harborlight-v1-approved-copy.js' }))];
  const catalog = Object.entries(DevelopmentCopy.DEVELOPMENT_COPY).map(([id, text]) => {
    const references = catalogReferences.get(id) || [];
    const tourUses = [...tour, ...tourVariants].filter(row => row.text.includes(text)).map(row => `Katalog56, pozycja ${row.order}: ${row.id} — ${row.condition}`);
    const lessonMatch = /^LESSON-(\d+)$/.exec(id), buildingMatch = /^BLD-([A-Z]+)-(.+)-(OPIS|INFO|MENU)$/.exec(id);
    const uses = [...new Set([...tourUses, ...(lessonMatch && lessons[Number(lessonMatch[1]) - 1] ? [`Zachowany samouczek ${Number(lessonMatch[1])}: ${lessons[Number(lessonMatch[1]) - 1].id}`] : []), ...(buildingMatch ? [`Budynek ${buildingMatch[1].toLowerCase()} / ${buildingMatch[2]} / ${buildingMatch[3]}`] : []), ...references.map(row => `${row.file}:${row.line} — ${row.scope || 'zakres modułu'}`)])];
    const conditions = [...new Set(references.map(row => row.condition).filter(Boolean))];
    return { id, area: id.split('-')[0], text, placeholders: [...new Set([...text.matchAll(/\{([^}]+)\}/g)].map(match => match[1]))].join(', '), usage: uses.join('\n') || 'ID wybierane dynamicznie; pełny wybór w źródle.', condition: conditions.join('\n\n') || (buildingMatch ? `Wariant ${buildingMatch[2]} wybiera developmentBuildingCopy; dodatkowe informacje wybiera developmentBuildingInformation.` : lessonMatch ? 'Zachowany opis wskazanej lekcji curriculum7; kurs jest tymczasowo ukryty. Reguły gotowości i nagród pozostają w tutorialStatus/tutorialAction.' : 'Warunek wyboru ID w kodzie i indeksie; zachowano szablon bez podstawiania fikcyjnych danych.'), file: 'harborlight-v1-development-copy.js' };
  });
  const buildingProfiles = [['Stan startowy', canonical], ['Poziomy2', { ...canonical, buildings: Object.fromEntries(Object.entries(canonical.buildings).map(([id, building]) => [id, { ...building, level: Math.max(2, building.level) }])) }], ['Akademia1 / Gospodarstwo6 / ser', { ...canonical, buildings: { ...canonical.buildings, farm: { ...canonical.buildings.farm, level: 6 }, academy: { ...canonical.buildings.academy, level: 1 } }, education: { ...canonical.education, discoveries: { ...canonical.education?.discoveries, cheese: true } } }]];
  const buildings = Object.keys(State.ALL_BUILDINGS).flatMap(id => {
    const unique = new Set();
    return buildingProfiles.flatMap(([condition, state]) => {
      const row = { id, name: I18n.translate(DevelopmentCopy.DEVELOPMENT_NAMES[id] || State.ALL_BUILDINGS[id].name || id, 'pl'), condition, description: Copy.buildingPurpose(id, 'pl', state), menu: Copy.buildingMenuCopy(id, 'pl', state), information: DevelopmentCopy.developmentBuildingInformation(id, state).join('\n\n'), file: 'harborlight-v1-copy.js;harborlight-v1-development-copy.js' };
      const signature = json([row.description, row.menu, row.information]);
      if (unique.has(signature)) return [];
      unique.add(signature); return [row];
    });
  });
  const labels = [
    ...Object.entries(DevelopmentCopy.DEVELOPMENT_NAMES).map(([id, text]) => ({ id, kind: 'Nazwa budynku', text, file: 'harborlight-v1-development-copy.js' })),
    ...Object.entries(DevelopmentCopy.GOODS_NAMES).map(([id, text]) => ({ id, kind: 'Nazwa towaru', text, file: 'harborlight-v1-development-copy.js' })),
    ...Array.from({ length: 100 }, (_, index) => ({ id: String(index + 1), kind: 'Nazwa poziomu Latarni', text: Copy.lighthouseLevelName(index + 1, 'pl'), file: 'harborlight-v1-copy.js' })),
    ...Object.entries(Approved.UI_COPY).map(([id]) => ({ id, kind: 'Zatwierdzony tekst UI', text: Approved.uiCopy(id, 'pl'), file: 'harborlight-v1-approved-copy.js' })),
    { id: 'residents-v32', kind: 'Opis mieszkańców', text: Copy.residentsPurpose('pl', canonical), file: 'harborlight-v1-copy.js' },
    { id: 'warehouse', kind: 'Opis Magazynu', text: Copy.warehousePurpose('pl'), file: 'harborlight-v1-copy.js' },
    ...Object.entries(Copy.gameGoal('pl')).map(([id, text]) => ({ id: 'goal-' + id, kind: 'Główny cel gry', text, file: 'harborlight-v1-copy.js' }))
  ];
  assert.equal(ADVISOR_INTRO_IDS.length, 28); assert.equal(activeTour.length, 28); assert.equal(menuInformation.length, 8); assert.equal(tour.length, 56); assert.equal(lessons.length, 25); assert.equal(Object.keys(State.ALL_BUILDINGS).length, 20);
  assert.deepEqual(activeTour.map(row => row.id), ADVISOR_INTRO_IDS); assert.equal(activeTour.find(row => row.id === 'clothing').title, 'Ubrania');
  assert(tour.every(row => row.title && row.text)); assert(activeTour.every(row => row.title && row.text)); assert(lessons.every(row => row.title && row.text));
  for (const item of manifests) if (includeSource) assert.equal(codeRows.filter(row => row.file === item.file).map(row => row.code).join(''), sources.get(item.file));
  const textFiles = ['harborlight-v1-approved-copy.js', 'harborlight-v1-development-copy.js', 'harborlight-v1-progression.js', 'harborlight-v1-copy.js'];
  const common = [['file', 'Plik źródłowy'], ['line', 'Linia']];
  const result = [
    table('advisor_introduction', 'Tutorial — aktywne28 kroków', 'Wprowadzenie i powtórka w Pomocy mają tę samą trasę28 kroków. Tekst tej tabeli pochodzi z rzeczywistych funkcji dla pierwszego wprowadzenia; warianty są w osobnej tabeli. Objaśnienia12–19 są w menu i;20+21 połączone;29–47 poza trasą. Stabilne dawne indeksy56 zachowane.', [['order','Krok'],['id','ID'],['title','Tytuł PL'],['text','Tekst PL'],['condition','Kontekst'],['file','Źródło']], activeTour, ['harborlight-v1-advisor-intro.js','harborlight-v1-approved-copy.js','harborlight-v1-development-copy.js']),
    table('tour_menu_information', 'Menu — objaśnienia pod i', 'Osiem dawnych kroków12–19 poza aktywnym tutorialem, zachowanych pod i odpowiednich menu.', [['menu','Menu'],['archive_order','Dawny krok'],['id','ID'],['title','Tytuł PL'],['text','Opis PL'],['condition','Warunek wyświetlenia'],['file','Źródło']], menuInformation, ['harborlight-v1-advisor-intro.js','harborlight-v1-play.js']),
    table('advisor_live_plans', 'Doradca — bieżące zadanie', 'Rzeczywiste przykłady działania czystej funkcji:1cel i2–5akcji na opisanych fiksturach, bez zmiany modelu i bez operacji chmurowych. To przykłady, nie dowód globalnie optymalnej strategii.', [['profile','Fikstura'],['goal','Jeden cel'],['explanation','Powód'],['order','Akcja'],['action','Wskazówka PL'],['target','Cel nawigacji'],['section','Sekcja'],['options','Opcje JSON'],['input','Pełne wejście fikstury'],['output','Pełny wynik funkcji'],['condition','Granica dowodu'],['file','Źródło']], advisorPlans, ['harborlight-v1-advisor.js']),
    table('guidance_policy', 'Prowadzenie — dostępność', 'Bieżąca prezentacja jest oddzielona od zachowanego kodu i historii kursu. Wyłączenie samouczka nie przyznaje nagród i nie blokuje zwykłych misji.', [['feature','Element'],['availability','Dostępność'],['value','Liczba / wartość'],['detail','Zasada'],['file','Źródło']], guidancePolicy, ['harborlight-v1-learning-policy.js','harborlight-v1-advisor-intro.js','harborlight-v1-missions.js','harborlight-v1-engagement.js']),
    table('intro_texts', 'Wprowadzenie', 'Rzeczywisty polski tekst pierwszego wprowadzenia.', [['id','ID'],['type','Rodzaj'],['text','Tekst PL'],['file','Źródło']], introRows, textFiles),
    table('tutorial_tour', 'Tutorial — katalog archiwalny56', 'Pełny zachowany katalog i stabilne pozycje zapisów; nie jest aktywną trasą. Aktywne28 kroków są w osobnej tabeli, a12–19 w informacjach menu.', [['order','Dawna kolejność'],['id','ID'],['title','Tytuł PL'],['text','Opis PL'],['condition','Kontekst'],['file','Źródło']], tour, textFiles),
    table('tutorial_tour_variants', 'Tutorial — warianty i archiwum', 'Rzeczywiście rozwiązywane warianty startu, powtórki i trybu. Kolumna zakresu oddziela aktywną trasę28 od zachowanego katalogu56.', [['scope','Zakres'],['order','Krok w danym zakresie'],['id','ID'],['condition','Warunek wariantu'],['title','Tytuł PL'],['text','Tekst PL'],['file','Źródło']], tourVariants, sourceFiles(textFiles, 'harborlight-v1-advisor-intro.js')),
    table('tutorial_lessons', 'Samouczek — zachowane25 lekcji', 'Curriculum7 jest tymczasowo ukryty. Zachowano kod, cele, kolejność, zależności i rodzaje nagród, bez zerowania lub oznaczania ukończenia.', [['order','Kolejność'],['id','ID'],['curriculum','Wersja'],['title','Tytuł PL'],['text','Opis PL'],['kind','Rodzaj'],['subject','Cel modelu'],['prerequisite','Poprzednia lekcja'],['route','Ekran'],['reward_kind','Rodzaj nagrody'],['goal_level','Poziom celu'],['assignment_count','Wymagany przydział'],['selector','Element prowadzenia'],['condition','Warunek'],['definition','Pełna definicja JSON'],['file','Źródło']], lessons, textFiles),
    table('development_copy', 'Teksty — katalog', 'Wszystkie bieżące480 wpisów polskiego katalogu z identyfikatorami, użyciem, warunkami i placeholderami.', [['id','ID'],['area','Obszar'],['text','Tekst PL / szablon'],['placeholders','Pola dynamiczne'],['usage','Użycie / ekran / funkcja'],['condition','Warunek wyboru'],['file','Źródło']], catalog, ['harborlight-v1-development-copy.js']),
    table('building_copy', 'Budynki — wszystkie opisy', 'Rzeczywiste opisy i informacje wszystkich20 budynków oraz warianty zależne od poziomów/badań.', [['id','ID'],['name','Nazwa'],['condition','Kontekst'],['description','Opis PL'],['menu','Opis w menu PL'],['information','Informacje pod i'],['file','Źródło']], buildings, textFiles),
    table('copy_labels', 'Nazwy i słowniki', 'Nazwy dóbr i budynków,100 nazw poziomów Latarni, zatwierdzone teksty UI i cele.', [['id','ID'],['kind','Rodzaj'],['text','Tekst PL'],['file','Źródło']], labels, textFiles),
    table('translations', 'Tłumaczenia PL', 'Mapy tłumaczeń z eksportów oraz statyczne pary odczytane z kodu; pochodzenie każdego wpisu jest jawne.', [['catalog','Katalog'],['original','Klucz / tekst źródłowy'],['polish','Polska wartość'],...common,['origin','Sposób odczytu']], [...translations, ...astTranslations], sourceFiles(textFiles, names.filter(name => /(?:i18n|copy|theatre|adventures)/.test(name)))),
    table('conditional_ui_texts', 'Teksty warunkowe — kod', 'Literały i dynamiczne szablony, również z błędów i warunkowych ekranów. To kandydaci tekstowi kodu; nie każdy literal jest aktualnie wyświetlany. Kolumna zakresu odróżnia aktualny pakiet/backend od odrębnych prototypów.', [['id','ID'],...common,['source_scope','Zakres źródła'],['kind','Rodzaj'],['polish','PL z translatora'],['original','Wartość / szablon źródłowy'],['translation_status','Status tłumaczenia'],['scope','Funkcja / zakres'],['condition','Nadrzędne warunki'],['template','Dokładny zapis'],['source_start','Początek w pliku'],['source_end','Koniec w pliku']], candidates, names, { limitations: ['Wyrażenia i wartości wpisywane przez gracza nie są skończonym katalogiem; zachowano ich szablony i warunki.', 'Indeks AST zachowuje również gałęzie zgodności historycznej. Ich obecność w kodzie nie dowodzi aktywacji w v32.'] }),
    table('static_html_texts', 'Ekrany HTML', 'Teksty i etykiety HTML gry, logowania oraz dokumentów; skrypty analizowane oddzielnie. Prototypy są jawnie odróżnione od bieżącego pakietu.', [...common,['source_scope','Zakres źródła'],['type','Rodzaj'],['text','Tekst'],['condition','Kontekst']], htmlTexts, names.filter(name => name.endsWith('.html'))),
    table('source_files', 'Spis źródeł tekstów', 'Pełna lista analizowanych modułów aplikacji z SHA256 i liczbą elementów AST; bez plików testowych i danych kont.', [['file','Plik'],['source_kind','Warstwa'],['sha256','SHA256'],['bytes','Bajty'],['lines','Linie'],['ast_nodes','Węzły AST'],['functions','Funkcje'],['constants','Stałe'],['conditions','Gałęzie i warunki'],['inline_scripts','Skrypty inline HTML'],['source_chunks','Fragmenty pełnego kodu'],['complete_source','Pełny zapis zachowany']], manifests, names),
    table('source_functions', 'Funkcje — indeks', 'Indeks funkcji i sygnatur. Pełne ciała znajdują się w dokładnym zapisie kodu, bez ucinania długich funkcji.', [['id','ID'],...common,['end_line','Do linii'],['name','Nazwa'],['scope','Zakres'],['signature','Sygnatura'],['async','Async'],['generator','Generator'],['condition','Warunki nadrzędne'],['start','Początek'],['end','Koniec']], functions, names, { hidden: true }),
    table('source_constants', 'Stałe — indeks', 'Deklaracje const i ich dokładne wyrażenia; nie wykonujemy UI lub serwera ani nie odczytujemy process.env.', [['id','ID'],...common,['name','Nazwa'],['scope','Zakres'],['expression_type','Typ wyrażenia'],['expression','Wyrażenie źródłowe'],['condition','Warunki nadrzędne'],['start','Początek'],['end','Koniec']], constants, names, { hidden: true }),
    table('source_conditions', 'Warunki — indeks', 'Gałęzie if/else, ternary, logiczne, switch, pętle i catch. Wyrażenia zachowane dosłownie; kod określa również kolejność wywołań i return.', [['id','ID'],...common,['end_line','Do linii'],['kind','Rodzaj'],['operator','Operator'],['scope','Zakres'],['condition','Wyrażenie'],['ancestors','Warunki nadrzędne'],['start','Początek'],['end','Koniec']], branches, names, { hidden: true }),
    table('source_code', 'Kod — pełny zapis', 'Dokładny, odtwarzalny zapis wszystkich analizowanych plików aplikacji. Kolejność fragmentów odtwarza oryginalne bajtyUTF8 i SHA256.', [['file','Plik'],['chunk','Fragment pliku'],['line','Od linii'],['end_line','Do linii'],['start','PoczątekUTF16'],['end','KoniecUTF16'],['sha256','SHA256 całego pliku'],['code','Pełna treść fragmentu']], codeRows, names, { hidden: true })
  ].map(safeRows);
  const sourceCommit = process.env.HARBORLIGHT_WORKBOOK_SOURCE_SHA || spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
  assert.match(sourceCommit, /^[a-f0-9]{40}$/);
  return {
    meta: { applicationVersion: GAME_VERSION, ruleset: 32, tutorialVersion: Progression.TUTORIAL_VERSION, sourceCommit, fixedEpoch: new Date(FIXED_EPOCH).toISOString(), parser: `Node bundled Acorn${acorn.version}`, applicationFiles: names.length, applicationSourceHashes: Object.fromEntries(manifests.map(row => [row.file, row.sha256])), inclusionScope: ['All public .js/.mjs/.html from scripts/build_frontend.py PUBLIC_FILES', 'All root harborlight*.js/.mjs/.html, with unpublished prototypes explicitly labelled', 'Root index.html, game.js and panic-pets.js, explicitly classified as prototype/standalone game', 'Recursive backend .js/.mjs runtime modules'], exclusions: ['tests and fixtures', 'node_modules, build and dist folders', 'scripts and infra operational tooling', 'environment files, credentials, private account data', 'CSS/assets are not JavaScript logic and are outside this static AST/code trace'], sourceInventoryIncludesBackendRuntime: true, sourceInventoryExcludesTestsAndAccountData: true, sourceCodeExecuted: 'Only explicit safe model/copy exports; UI/server parsed statically, never executed.', originalUploadedWorkbookRead: false, runtimeSecretsRead: false, completeSourceTrace: includeSource },
    counts: { firstIntroductionSteps: ADVISOR_INTRO_IDS.length, tourSteps: activeTour.length, archiveTourSteps: tour.length, menuInformationTopics: menuInformation.length, advisorExampleActions: advisorPlans.length, practicalTutorialEnabled: PRACTICAL_TUTORIAL_ENABLED, tourVariants: tourVariants.length, activeTourVariants: activeTourVariants.length, archiveTourVariants: archiveTourVariants.length, lessons: lessons.length, developmentCopy: catalog.length, buildingIds: Object.keys(State.ALL_BUILDINGS).length, buildingVariants: buildings.length, labels: labels.length, translationRows: translations.length + astTranslations.length, conditionalTextCandidates: candidates.length, staticHtmlTexts: htmlTexts.length, applicationFiles: names.length, astNodes: nodeCount, functions: functions.length, constants: constants.length, conditionBranches: branches.length, sourceChunks: codeRows.length },
    tables: result,
    limitations: ['Pełny katalog i kod opisują możliwe reguły i szablony. Nie oznaczają rozegrania wszystkich możliwych stanów ani wariantów proceduralnych.', 'Warunki w indeksie są składniowe. Zależności pomiędzy funkcjami, wcześniejsze return i danymi runtime pozostają w pełnym zapisie źródeł.', 'Symulacje rozwoju i tabele liczb są odrębnym eksportem; ten plik nie wykonuje rozwoju gracza ani operacji chmurowych.']
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT) {
  if (!acorn) {
    if (process.execArgv.includes('--expose-internals')) throw new Error('This Node version does not expose the bundled Acorn parser. Use Node24.');
    const child = spawnSync(process.execPath, ['--expose-internals', SCRIPT, ...process.argv.slice(2)], { stdio: 'inherit' });
    process.exit(child.status ?? 1);
  }
  const args = process.argv.slice(2), outputAt = args.indexOf('--output');
  const result = await exportTexts({ includeSource: !args.includes('--no-source') });
  if (outputAt >= 0) {
    const filename = args[outputAt + 1]; assert(filename, '--output needs a file path.');
    await writeFile(filename, json(result) + '\n');
    process.stdout.write(json({ output: filename, ...result.counts }) + '\n');
  } else process.stdout.write(json(result) + '\n');
}
