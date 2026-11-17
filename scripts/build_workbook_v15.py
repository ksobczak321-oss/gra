#!/usr/bin/env python3
"""Current v32 master workbook, with the previous 100 sheets preserved verbatim.

The game is read, never changed or connected to a live account. Current tables
come from model exports, static source parsing and deterministic simulations.
Use --refresh-simulations to recompute the longer isolated development runs.
"""
from __future__ import annotations

import argparse
import ast
from dataclasses import dataclass, field
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import tempfile
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

from lxml import etree as E
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter, column_index_from_string
import build_workbook_v11 as old

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'docs/arkusze/HARBORLIGHT14-zasady.xlsx'
OUTPUT = ROOT / 'docs/arkusze/HARBORLIGHT15-zasady.xlsx'
REPORT = ROOT / 'docs/arkusze/HARBORLIGHT15-zasady-walidacja.json'
SIMULATION = ROOT / 'docs/design/WORKBOOK-V32-SIMULATION.json'
BASE_SHA = '7f7ae4918964309b8e2b391edf8999d366dbbd0dcfa2676692984853e10962b6'
APP_SOURCE = '37061c43139f32dfba61e4d837b133ed9d2d7da8'
RELEASE_SOURCE = 'c4f752142c0421aad1dc0490a2f5139c277e6ee5'
EXPORTERS = {kind: ROOT / f'scripts/export_workbook_v15_{suffix}.mjs'
             for kind, suffix in [('facts', 'facts'), ('texts', 'texts'), ('scenarios', 'scenarios')]}
M, R, P, C = old.M, old.R, old.P, old.C
Formula = old.Formula
LIMIT = 14000  # below Excel's UTF-16 cell limit, including astral characters
MUTABLE = {'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', '[Content_Types].xml', 'docProps/core.xml'}


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def json_text(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def cell_value(value):
    if value is None:
        return ''
    if isinstance(value, float) and not math.isfinite(value):
        return 'Nie dotyczy / wartość nieograniczona'
    result = json_text(value) if isinstance(value, (dict, list, tuple)) else value
    if isinstance(result, str):
        result = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', lambda m: f'\\u{ord(m[0]):04x}', result)
    return result


def payload_hashes(payload):
    meta = payload.get('meta', {})
    return meta.get('sourceHashes', meta.get('applicationSourceHashes', {}))


@dataclass
class Sheet:
    name: str
    title: str
    note: str
    headings: list
    widths: list
    rows: dict = field(default_factory=dict)
    heights: dict = field(default_factory=dict)
    inputs: set = field(default_factory=set)
    validations: list = field(default_factory=list)
    links: dict = field(default_factory=dict)
    hidden: bool = False
    table_id: str = ''

    def add(self, values, height=None):
        number = max(self.rows, default=5) + 1
        self.rows[number] = list(values)
        if height is None:
            lines = max((max(str(v).count('\n') + 1, math.ceil(len(str(v)) / max(12, self.widths[i] * 1.1)))
                         for i, v in enumerate(values) if i < len(self.widths)), default=1)
            height = min(150, max(30, 15 * lines + 10))
        self.heights[number] = height
        return number


def sheet_name(title, used):
    title = re.sub(r'[\\/*?:\[\]]', ' ', title).strip().strip("'")
    base = title[:27].rstrip() or 'Dane'
    name = base + ' v15'
    number = 2
    while name in used:
        suffix = f' {number}'
        name = base[:27-len(suffix)].rstrip() + suffix + ' v15'
        number += 1
    used.add(name)
    return name


def width(column):
    key = column['key'].lower()
    if any(word in key for word in ['text', 'description', 'condition', 'context', 'sourcecode', 'snippet', 'message', 'instruction', 'limitation']):
        return 105
    if any(word in key for word in ['source', 'file', 'path']):
        return 65
    if any(word in key for word in ['input', 'output', 'cost', 'expected', 'actual', 'requirement', 'reward', 'effect', 'rule', 'value']):
        return 55
    if any(word in key for word in ['name', 'title', 'label', 'building', 'recipe']):
        return 34
    return 24


def generic_sheet(table, used):
    columns = table['columns']
    rows = [[cell_value(row.get(col['key'])) for col in columns] for row in table['rows']]
    continuation = any(isinstance(value, str) and len(value) > LIMIT for row in rows for value in row)
    headers = [c['label'] for c in columns] + (['Część pełnego wpisu'] if continuation else [])
    widths = [width(c) for c in columns] + ([22] if continuation else [])
    note = table.get('description', '')
    if table.get('limitations'):
        note += ' ' + ' '.join(table['limitations'])
    if table.get('source_files'):
        note += ' Źródła: ' + ', '.join(table['source_files'])
    spec = Sheet(sheet_name(table['title'], used), table['title'], note, headers, widths,
                 hidden=table.get('hidden', False), table_id=table['id'])
    for row in rows:
        parts = max((math.ceil(len(v) / LIMIT) if isinstance(v, str) else 1 for v in row), default=1)
        for part in range(parts):
            values = [v[part*LIMIT:(part+1)*LIMIT] if isinstance(v, str) and len(v) > LIMIT else v for v in row]
            spec.add(values + ([f'{part+1}/{parts}'] if continuation else []))
    if not rows:
        spec.add(['Brak wpisów w bieżącym kodzie.'])
    return spec


def evaluate(formula, sheets, current, trail=()):
    refs = {}
    pattern = r"(?:'([^']+)'!)?([A-Z]{1,3}[1-9]\d*)(?::([A-Z]{1,3}[1-9]\d*))?"
    def reference(match):
        key = f'REF_{len(refs)}'; refs[key] = (match[1] or current, match[2], match[3]); return key
    text = re.sub(pattern, reference, formula.lstrip('='))
    text = re.sub(r'(?<![<>=!])=(?!=)', '==', text.replace('^', '**').replace('<>', '!='))
    lookup_sheets = {s.name: s for s in sheets}
    def lookup(name, coordinate):
        if (name, coordinate) in trail:
            raise ValueError('Circular calculator reference')
        m = re.fullmatch(r'([A-Z]+)(\d+)', coordinate)
        values = lookup_sheets[name].rows.get(int(m[2]), [])
        col = column_index_from_string(m[1]) - 1
        value = values[col] if col < len(values) else 0
        return evaluate(value.text, sheets, name, (*trail, (name, coordinate))) if isinstance(value, Formula) else value
    def resolve(name):
        sheet, start, end = refs[name]
        if not end:
            return lookup(sheet, start)
        a = re.fullmatch(r'([A-Z]+)(\d+)', start); b = re.fullmatch(r'([A-Z]+)(\d+)', end)
        return [[lookup(sheet, f'{get_column_letter(c)}{r}') for c in range(column_index_from_string(a[1]), column_index_from_string(b[1])+1)]
                for r in range(int(a[2]), int(b[2])+1)]
    def visit(node):
        if isinstance(node, ast.Expression): return visit(node.body)
        if isinstance(node, ast.Constant): return node.value
        if isinstance(node, ast.Name):
            if node.id in refs: return resolve(node.id)
            if node.id in ['TRUE', 'FALSE']: return node.id == 'TRUE'
        if isinstance(node, ast.UnaryOp): return -visit(node.operand) if isinstance(node.op, ast.USub) else +visit(node.operand)
        if isinstance(node, ast.BinOp):
            a, b = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.BitAnd): return str(a) + str(b)
            return {ast.Add: lambda: a+b, ast.Sub: lambda: a-b, ast.Mult: lambda: a*b, ast.Div: lambda: a/b, ast.Pow: lambda: a**b}[type(node.op)]()
        if isinstance(node, ast.Compare):
            assert len(node.ops) == len(node.comparators) == 1
            a, b = visit(node.left), visit(node.comparators[0])
            return {ast.Eq: lambda: a == b, ast.NotEq: lambda: a != b, ast.Gt: lambda: a > b, ast.GtE: lambda: a >= b, ast.Lt: lambda: a < b, ast.LtE: lambda: a <= b}[type(node.ops[0])]()
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            name = node.func.id
            if name == 'IF': return visit(node.args[1] if visit(node.args[0]) else node.args[2])
            args = [visit(a) for a in node.args]
            if name == 'VLOOKUP':
                key, rows, col, approximate = args
                assert approximate is False
                return next(row[int(col)-1] for row in rows if row[0] == key)
            functions = {'SUM': lambda *a: sum(a), 'MIN': min, 'MAX': max, 'ABS': abs,
                         'ROUND': lambda a, n=0: math.floor(a*10**n+.5)/10**n,
                         'ROUNDDOWN': lambda a, n=0: math.trunc(a*10**n)/10**n,
                         'ROUNDUP': lambda a, n=0: math.copysign(math.ceil(abs(a)*10**n)/10**n, a)}
            if name in functions: return functions[name](*args)
        raise ValueError(f'Unsupported formula: {ast.dump(node)}')
    return visit(ast.parse(text, mode='eval'))


def calculator(facts, used):
    recipes = next(t['rows'] for t in facts['sheet_tables'] if t['id'] == 'recipe-levels')
    data = Sheet(sheet_name('Kalkulator dane', used), 'Dane kalkulatora z rzeczywistych receptur',
                 'Każdy klucz łączy ID receptury i poziom; liczby pochodzą z funkcji gry.',
                 ['Klucz', 'ID receptury', 'Budynek', 'Poziom', 'Partie/os./godz.', 'Sztuk głównego produktu/partię', 'Sztuk głównego surowca/partię', 'Produkt', 'Surowiec'],
                 [40, 30, 30, 16, 24, 28, 28, 30, 30], hidden=True, table_id='calculator-data')
    for r in recipes:
        output = next(iter(r['outputsPerBatch'].items()), ('', 0))
        material = next(iter(r['inputsPerBatch'].items()), ('', 0))
        data.add([f"{r['recipeId']}|{r['level']}", r['recipeId'], r['buildingPl'], r['level'], r['batchesPerWorkerHour'], output[1], material[1], output[0], material[0]], 30)
    first = next(r for r in recipes if r['recipeId'] == 'flour' and r['level'] == 1)
    rules = facts['rules']
    provisions = rules.get('provisions', rules.get('PROVISIONS_RULES', {}))
    satiety = provisions.get('satietyPerHour', 6)
    assert satiety == 6
    level = next(t['rows'][0] for t in facts['sheet_tables'] if t['id'] == 'levels')
    calc = Sheet(sheet_name('Kalkulator', used), 'KALKULATOR — zmieniaj niebieskie pola',
                 'Model warunkowy: załoga już pracuje, surowce i miejsce są dostępne, mnożniki produkcji=1, wszyscy mają łóżka. Nie jest symulacją rozwoju. Tempo2/6 jest narzędziem admin3 DEV/PRE-PROD. Formuły mają zapisane sprawdzone wyniki początkowe.',
                 ['Obszar', 'Parametr / wynik', 'Wartość', 'Jednostka', 'Warunek / źródło'], [24, 58, 30, 22, 110], table_id='calculator')
    entries = [(6, 'Poziom budynku', 1, '1–100'), (7, 'Stała liczba mieszkańców', 19, 'osoby'),
               (8, 'Pracownicy jednego produktu', 3, 'osoby'), (9, 'Czas rzeczywisty', 1, 'godziny'),
               (10, 'Tempo prywatnej wyspy', 1, '1 / 2 / 6'), (11, 'ID receptury', first['recipeId'], 'ID'),
               (16, 'Czas chronionej rezerwy', 1, 'godziny'), (17, 'Sytość porcji jedzenia', 1, 'pkt'),
               (18, 'Dawne jednostki żywności budowy', 10, 'jednostki'), (19, 'Koszyk potrzeb Magazynu', level['warehouseNeeds'], 'sztuki'),
               (20, 'Mnożnik bufora Magazynu', level['warehouseBuffer'], '×'), (21, 'Zaokrąglenie pojemności', level['warehouseRoundingUnit'], 'sztuki')]
    for row, label, value, unit in entries:
        calc.rows[row] = ['Wejście', label, value, unit, 'Zmieniasz tylko hipotetyczny kalkulator, nie grę.']
        calc.heights[row] = 38; calc.inputs.add(f'C{row}')
    lookup = f"'{data.name}'!A6:I{max(data.rows)}"
    formulas = [(25, 'Czas gry', '=C9*C10', 'godz.'),
                (26, 'Bazowe partie / osoba / godzinę', f'=VLOOKUP(C11&"|"&C6,{lookup},5,FALSE)', 'partie/os./godz.'),
                (27, 'Czas jednej partii / osoba', '=3600/C26', 'sekundy'),
                (28, 'Potencjał ciągły (z częścią partii)', '=C8*C26*C25', 'partie'),
                (29, 'Ukończone partie od zerowej fazy', '=C8*ROUNDDOWN(C26*C25,0)', 'partie'),
                (30, 'Sztuki głównego produktu', f'=C29*VLOOKUP(C11&"|"&C6,{lookup},6,FALSE)', 'sztuki'),
                (31, 'Zużycie głównego surowca', f'=C29*VLOOKUP(C11&"|"&C6,{lookup},7,FALSE)', 'sztuki'),
                (32, 'Sytość wszystkich mieszkańców', f'=C7*C25*{satiety}', 'pkt sytości'),
                (33, 'Potrzebne porcje wybranego jedzenia', '=ROUNDUP(C32/C17,0)', 'porcje'),
                (34, 'Chroniona rezerwa', f'=C7*C16*{satiety}', 'pkt sytości'),
                (35, 'Wyżywienie budowy', f'=C18*{satiety}', 'pkt sytości'),
                (36, 'Pojemność Magazynu z koszyka', '=ROUNDDOWN(ROUNDUP(C19*C20,0)/C21,0)*C21', 'sztuki')]
    for row, label, formula, unit in formulas:
        calc.rows[row] = ['Wynik', label, Formula(formula), unit,
                          'Dla receptury wieloskładnikowej pokazano pierwszy surowiec i produkt; cała receptura w tabeli. Dostępność wymaga poziomu i badań.']
        calc.heights[row] = 52
    for coordinate, minimum, maximum in [('C6', 1, 100), ('C7', 0, 3600), ('C8', 0, 1200), ('C9', .001, 8760), ('C16', 0, 8760), ('C17', .001, 100000), ('C18', 0, 100000000), ('C19', 0, 1e12), ('C20', .001, 100), ('C21', 1, 1e12)]:
        kind = 'whole' if coordinate in ['C6', 'C7', 'C8', 'C18', 'C21'] else 'decimal'
        calc.validations.append({'type': kind, 'operator': 'between', 'sqref': coordinate, 'formula1': str(minimum), 'formula2': str(maximum)})
    calc.validations.append({'type': 'list', 'sqref': 'C10', 'formula1': '"1,2,6"'})
    ids = list(dict.fromkeys(r['recipeId'] for r in recipes))
    calc.validations.append({'type': 'list', 'sqref': 'C11', 'formula1': '"' + ','.join(ids) + '"'})
    return calc, data


def prepare(exports, source_sha):
    previous = load_workbook(BASE, read_only=True)
    used = set(previous.sheetnames)
    previous.close()
    guide = Sheet(sheet_name('Przeczytaj', used), 'HARBORLIGHT15 — pełny master aktualnych zasad',
                  'Bieżące tabele v15 mają pierwszeństwo. 100 wcześniejszych kart zachowano jako ukryte archiwum. Pełna treść warunków i źródeł jest dostępna w dodatkach. Każdy wynik symulacji ma własny horyzont i założenia.',
                  ['Temat', 'Aktualna informacja', 'Źródło / granica'], [45, 140, 100], table_id='readme')
    guide.add(['Kod gry', '0.15.1.0 / ruleset32', source_sha])
    guide.add(['Wdrożone DEV i PRE-PROD', RELEASE_SOURCE, 'Własny CI43850690541 i PRE-PROD43854387444 SUCCESS; aktualizacja Excela nie wdraża gry.'])
    guide.add(['Źródło aplikacji', APP_SOURCE, 'Arkusz odczytuje aktualny kod; nie modyfikuje parametrów.'])
    guide.add(['Nawigacja', 'Spis treści zawiera odnośnik do każdej bieżącej tabeli i jej źródła.', 'Filtrowanie od wiersza5; nagłówki zamrożone.'])
    guide.add(['Teksty', 'Pełny tour, samouczek, katalog tekstów i warunkowe literały/szablony z kodu.', 'Zmienne i warunki zachowane; liczba możliwych komunikatów z podstawieniami nie jest skończona.'])
    guide.add(['Scenariusze', 'Katalogi mechanik, scenariusze i deterministyczne przykłady generatorów.', 'Przykłady plansz nie oznaczają wyliczenia wszystkich kombinacji losowych.'])
    guide.add(['Symulacje', 'Faktycznie wykonane przebiegi silnika v32 i ich strategia, wyniki oraz blokady.', '50dni planu i historyczne35dni v31 nie są wynikiem aktualnego gracza.'])
    guide.add(['Kalkulator', 'Niebieskie pola i formuły z zapisanym wynikiem; dane receptur z kodu.', 'Model warunkowy nie zastępuje symulacji silnika.'])
    guide.add(['Archiwum', 'Poprzedni master14 oraz wszystkie jego100kart zachowano bez zmiany zawartości.', BASE_SHA])
    guide.add(['Dodatki ukryte', 'Pełne indeksy funkcji, stałych, warunków i kod są ukryte. W Excelu wybierz Odkryj arkusz / Unhide.', 'Teksty warunkowe są widoczną tabelą. Znaki sterujące pokazano jako czytelne sekwencje\\uXXXX.'])
    toc = Sheet(sheet_name('Spis treści', used), 'SPIS TREŚCI — aktualne tabele', 'Kliknij nazwę zakładki; indeks obejmuje także ukryte dodatki źródłowe.',
                ['Zakładka', 'Zakres', 'Wiersze danych', 'Widoczność', 'Źródła'], [36, 110, 22, 25, 95], table_id='contents')
    current = []
    for kind in ['facts', 'texts', 'scenarios']:
        payload = exports[kind]
        definitions = payload.get('sheet_tables', payload.get('tables', []))
        assert isinstance(definitions, list), f'Missing generic tables: {kind}'
        current.extend(generic_sheet(t, used) for t in definitions)
    pending = Sheet(sheet_name('Stan i zaległości', used), 'STAN KODU A OCZEKUJĄCE USTALENIA',
                    'Arkusz opisuje działający kod; oczekujące pomysły nie stają się automatycznie wdrożoną regułą.',
                    ['Temat', 'Faktycznie w kodzie', 'Oczekujące / rozbieżność', 'Źródło'], [34, 115, 115, 75], table_id='pending')
    for row in exports['facts'].get('currentVsPending', []): pending.add([row['topic'], row['current'], row['pending'], row['source_file']])
    initial = Sheet(sheet_name('Start gry', used), 'START GRY — rzeczywisty stan kanoniczny v32',
                    'Izolowany stan modelu przed ukończeniem wprowadzenia. Nie jest odczytem konta. Przykład potrzeb dotyczy jednego mieszkańca; części garderoby nie należy mylić z globalnym zasobem magazynu.',
                    ['Obszar', 'Właściwość', 'Wartość', 'Kontekst'], [30, 65, 100, 100], table_id='initial-state')
    for key, value in exports['facts']['initialState'].items():
        if isinstance(value, dict):
            for subkey, entry in value.items():
                initial.add([key, subkey, cell_value(entry), 'Stan przed prezentem powitalnym; tabela symulacji osobno pokazuje zwykłe zakończenie wprowadzenia.'])
        else: initial.add(['Stan', key, cell_value(value), 'Wynik createState(ruleset32,onboarding=true).'])
    calc, calc_data = calculator(exports['facts'], used)
    sheets = [guide, toc, initial, *[s for s in current if not s.hidden], pending, calc, *[s for s in current if s.hidden], calc_data]
    provenance = Sheet(sheet_name('Kontrola źródeł', used), 'ŹRÓDŁA I POKRYCIE MASTER15',
                       'SHA256 każdej części źródłowej odczytanej przez eksportery. Nie odczytano prywatnych kont ani konfiguracji środowiska.',
                       ['Plik', 'SHA256', 'Odczytany przez', 'Zamrożone źródło'], [75, 75, 45, 52], table_id='provenance')
    hashes = {}
    for kind, payload in exports.items():
        for name, sha in payload_hashes(payload).items():
            if name in hashes: assert hashes[name][0] == sha
            hashes.setdefault(name, (sha, []))[1].append(kind)
    for name, (sha, kinds) in sorted(hashes.items()): provenance.add([name, sha, ', '.join(kinds), source_sha], 34)
    sheets.append(provenance)
    for spec in sheets:
        row = toc.add([spec.name, spec.title, len(spec.rows), 'Dodatek ukryty' if spec.hidden else 'Bieżąca', spec.note], 60)
        if not spec.hidden: toc.links[f'A{row}'] = f"'{spec.name}'!A1"
    for values in toc.rows.values():
        if values[0] == toc.name: values[2] = len(toc.rows)
    for spec in sheets:
        for row, values in spec.rows.items():
            for col, value in enumerate(values, 1):
                if isinstance(value, Formula): value.cached = evaluate(value.text, sheets, spec.name, ((spec.name, f'{get_column_letter(col)}{row}'),))
    return sheets


def sheet_xml(spec, active=False):
    def element(parent, name, **attrs): return E.SubElement(parent, f'{{{M}}}{name}', **{k: str(v) for k, v in attrs.items()})
    root = E.Element(f'{{{M}}}worksheet'); last = max(spec.rows, default=5); final = get_column_letter(len(spec.headings))
    element(root, 'dimension', ref=f'A1:{final}{last}')
    views = element(root, 'sheetViews'); view = element(views, 'sheetView', workbookViewId=0, tabSelected=1 if active else 0)
    element(view, 'pane', ySplit=5, topLeftCell='A6', activePane='bottomLeft', state='frozen')
    element(root, 'sheetFormatPr', defaultRowHeight=24)
    cols = element(root, 'cols')
    for col, value in enumerate(spec.widths, 1): element(cols, 'col', min=col, max=col, width=value, customWidth=1)
    data = element(root, 'sheetData')
    for number, values, height, style in [(1, [spec.title], 36, 1), (2, [spec.note], 90, 2), (5, spec.headings, 42, 3)]:
        row = element(data, 'row', r=number, ht=height, customHeight=1)
        for col, value in enumerate(values, 1): old.append_cell(row, f'{get_column_letter(col)}{number}', value, style)
    for number, values in sorted(spec.rows.items()):
        row = element(data, 'row', r=number, ht=spec.heights.get(number, 42), customHeight=1)
        for col, value in enumerate(values, 1):
            coordinate = f'{get_column_letter(col)}{number}'; style = 6 if coordinate in spec.inputs else 4 if number % 2 == 0 else 5
            old.append_cell(row, coordinate, value, style)
    element(root, 'autoFilter', ref=f'A5:{final}{last}')
    merges = element(root, 'mergeCells', count=2)
    for number in [1, 2]: element(merges, 'mergeCell', ref=f'A{number}:{final}{number}')
    if spec.validations:
        validations = element(root, 'dataValidations', count=len(spec.validations))
        for original in spec.validations:
            attrs = dict(original); first = attrs.pop('formula1'); second = attrs.pop('formula2', None)
            child = element(validations, 'dataValidation', **attrs, allowBlank=0, showErrorMessage=1)
            element(child, 'formula1').text = first
            if second is not None: element(child, 'formula2').text = second
    if spec.links:
        links = element(root, 'hyperlinks')
        for coordinate, location in spec.links.items(): element(links, 'hyperlink', ref=coordinate, location=location)
    element(root, 'pageMargins', left=.25, right=.25, top=.5, bottom=.5, header=.2, footer=.2)
    element(root, 'pageSetup', orientation='landscape', paperSize=8, fitToWidth=1, fitToHeight=0)
    return E.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)


def write_book(sheets):
    assert digest(BASE) == BASE_SHA, 'Historical master14 changed'
    with ZipFile(BASE) as source: entries = {name: source.read(name) for name in source.namelist()}
    workbook = E.fromstring(entries['xl/workbook.xml']); nodes = workbook.find(f'{{{M}}}sheets')
    assert len(nodes) == 100
    for node in nodes: node.set('state', 'hidden')
    for view in workbook.findall(f'{{{M}}}bookViews/{{{M}}}workbookView'):
        view.set('activeTab', '100'); view.set('firstSheet', '100')
    calc = workbook.find(f'{{{M}}}calcPr')
    if calc is None: calc = E.SubElement(workbook, f'{{{M}}}calcPr')
    for key, value in {'calcMode': 'auto', 'fullCalcOnLoad': '1', 'forceFullCalc': '1'}.items(): calc.set(key, value)
    rels = E.fromstring(entries['xl/_rels/workbook.xml.rels']); types = E.fromstring(entries['[Content_Types].xml'])
    rid = max(int(node.get('Id')[3:]) for node in rels if re.fullmatch(r'rId\d+', node.get('Id', ''))) + 1
    sid = max(int(node.get('sheetId')) for node in nodes) + 1
    for index, spec in enumerate(sheets):
        number = 101 + index; relation = f'rId{rid+index}'; name = f'xl/worksheets/sheet{number}.xml'
        assert name not in entries
        E.SubElement(nodes, f'{{{M}}}sheet', name=spec.name, sheetId=str(sid+index), state='hidden' if spec.hidden else 'visible', **{f'{{{R}}}id': relation})
        E.SubElement(rels, f'{{{P}}}Relationship', Id=relation, Type=f'{R}/worksheet', Target=f'worksheets/sheet{number}.xml')
        E.SubElement(types, f'{{{C}}}Override', PartName='/'+name, ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml')
        entries[name] = sheet_xml(spec, active=index == 0)
    changed = {'xl/workbook.xml': workbook, 'xl/_rels/workbook.xml.rels': rels, '[Content_Types].xml': types}
    core = E.fromstring(entries['docProps/core.xml']); dc = 'http://purl.org/dc/elements/1.1/'
    for name, value in [('title', 'HARBORLIGHT15 — pełny master0.15.1.0/v32'), ('subject', 'Aktualne reguły, teksty, scenariusze i symulacje;100kart archiwum'), ('description', 'Eksport bieżącego kodu; każda symulacja ma założenia i zmierzony horyzont, a generator nie zmienia gry lub kont.')]:
        node = core.find(f'{{{dc}}}{name}')
        if node is None: node = E.SubElement(core, f'{{{dc}}}{name}')
        node.text = value
    changed['docProps/core.xml'] = core
    for name, node in changed.items(): entries[name] = E.tostring(node, xml_declaration=True, encoding='UTF-8', standalone=True)
    with ZipFile(OUTPUT, 'w', compression=ZIP_DEFLATED, compresslevel=9) as target:
        for name, data in entries.items():
            info = ZipInfo(name, date_time=(2026, 11, 16, 0, 0, 0)); info.compress_type = ZIP_DEFLATED
            target.writestr(info, data, compress_type=ZIP_DEFLATED, compresslevel=9)


def source_checks(exports, source_sha):
    hashes = {}
    assert exports['scenarios']['meta']['exporterSha256'] == digest(EXPORTERS['scenarios']), 'Simulation exporter changed; refresh simulations'
    assert exports['facts']['meta']['appVersion'] == exports['texts']['meta']['applicationVersion'] == exports['scenarios']['meta']['version'] == '0.15.1.0'
    assert all(payload['meta']['ruleset'] == 32 for payload in exports.values())
    assert exports['facts']['checks']['passed'] is True
    assert exports['texts']['meta']['completeSourceTrace'] is True
    assert exports['texts']['counts']['tourSteps'] == 56 and exports['texts']['counts']['lessons'] == 25
    assert exports['scenarios']['meta']['simulationIncluded'] is True, 'Actual development simulations are required'
    assert exports['scenarios']['checks']['currentSimulationProfiles'] >= 3
    assert exports['scenarios']['checks']['allSimulationsCanonicalStart'] is True
    assert exports['scenarios']['checks']['noInjectedResourcesOrLevels'] is True
    for kind, payload in exports.items():
        assert payload['meta']['sourceCommit'] == source_sha, (kind, 'source commit')
        for name, expected in payload_hashes(payload).items():
            assert not Path(name).is_absolute() and '..' not in Path(name).parts
            assert digest(ROOT/name) == expected, ('Stale export', kind, name)
            assert hashlib.sha256(subprocess.check_output(['git', 'show', f'{source_sha}:{name}'], cwd=ROOT)).hexdigest() == expected
            hashes[name] = expected
    assert hashes, 'No source provenance'
    return hashes


def validate(exports, sheets, source_sha, write_report=True):
    hashes = source_checks(exports, source_sha)
    assert digest(BASE) == BASE_SHA
    with ZipFile(BASE) as source, ZipFile(OUTPUT) as target:
        assert target.testzip() is None
        preserved = [name for name in source.namelist() if name not in MUTABLE]
        assert all(source.read(name) == target.read(name) for name in preserved), 'Historical OOXML changed'
        comment_parts = [name for name in source.namelist() if name.startswith('xl/') and Path(name).name.startswith('comment') and name.endswith('.xml')]
        comments = sum(len(E.fromstring(source.read(name)).findall(f'.//{{{M}}}comment')) for name in comment_parts)
        old_formulas = sum(len(E.fromstring(source.read(name)).findall(f'.//{{{M}}}f')) for name in source.namelist() if re.fullmatch(r'xl/worksheets/sheet\d+\.xml', name))
    book = load_workbook(OUTPUT, read_only=True, data_only=False); cached = load_workbook(OUTPUT, read_only=True, data_only=True)
    base = load_workbook(BASE, read_only=True)
    assert len(book.sheetnames) == 100 + len(sheets) and book.active.title == sheets[0].name
    assert all(book[name].sheet_state == 'hidden' for name in base.sheetnames)
    formulas = row_count = 0
    for spec in sheets:
        assert book[spec.name]['A1'].value == spec.title
        assert book[spec.name].sheet_state == ('hidden' if spec.hidden else 'visible')
        actual_rows = book[spec.name].iter_rows(min_row=6, max_row=max(spec.rows), max_col=len(spec.headings), values_only=False)
        cached_rows = cached[spec.name].iter_rows(min_row=6, max_row=max(spec.rows), max_col=len(spec.headings), values_only=False)
        for number, (actual, values) in enumerate(zip(actual_rows, cached_rows), 6):
            expected = spec.rows.get(number, [])
            for col, cell in enumerate(actual):
                value = expected[col] if col < len(expected) else ''
                if isinstance(value, Formula):
                    formulas += 1; assert cell.value == value.text and values[col].data_type != 'e'
                    assert math.isclose(values[col].value, value.cached, rel_tol=1e-10, abs_tol=1e-8)
                elif value == '': assert cell.value in ['', None]
                elif isinstance(value, (int, float)) and not isinstance(value, bool): assert math.isclose(cell.value, value, rel_tol=1e-12, abs_tol=1e-8)
                else: assert cell.value == value, (spec.name, number, col, 'cell mismatch')
                if isinstance(cell.value, str): assert len(cell.value.encode('utf-16-le')) // 2 <= 32767
            row_count += bool(expected)
    calc = next(s for s in sheets if s.table_id == 'calculator'); samples = 0
    for entry in next(t['rows'] for t in exports['facts']['sheet_tables'] if t['id'] == 'levels'):
        originals = [calc.rows[n][2] for n in [19, 20, 21]]
        for n, key in [(19, 'warehouseNeeds'), (20, 'warehouseBuffer'), (21, 'warehouseRoundingUnit')]: calc.rows[n][2] = entry[key]
        actual = evaluate(calc.rows[36][2].text, sheets, calc.name)
        assert actual == entry['warehouseTotal'], ('warehouse formula', entry['level'], actual)
        for n, value in zip([19, 20, 21], originals): calc.rows[n][2] = value
        samples += 1
    for entry in next(t['rows'] for t in exports['facts']['sheet_tables'] if t['id'] == 'recipe-levels'):
        if entry['level'] not in [1, 5, 100]: continue
        old_level, old_recipe = calc.rows[6][2], calc.rows[11][2]
        calc.rows[6][2], calc.rows[11][2] = entry['level'], entry['recipeId']
        assert math.isclose(evaluate(calc.rows[26][2].text, sheets, calc.name), entry['batchesPerWorkerHour'], rel_tol=1e-12)
        calc.rows[6][2], calc.rows[11][2] = old_level, old_recipe; samples += 1
    report = {'validation': 'PASS', 'workbook_version': 15, 'game_version': '0.15.1.0', 'ruleset': 32,
              'file': str(OUTPUT.relative_to(ROOT)), 'sha256': digest(OUTPUT), 'bytes': OUTPUT.stat().st_size,
              'source_git_commit': source_sha, 'accepted_application_source': APP_SOURCE, 'accepted_publication_source': RELEASE_SOURCE,
              'historical_master': str(BASE.relative_to(ROOT)), 'historical_master_sha256': BASE_SHA,
              'historical_sheets_unchanged': 100, 'historical_zip_parts_unchanged': len(preserved), 'historical_comments_unchanged': comments,
              'historical_cached_formulas_unchanged': old_formulas,
              'sheets': len(book.sheetnames), 'current_sheets': len(sheets), 'visible_sheets': [s.name for s in sheets if not s.hidden],
              'rows_current': row_count, 'new_cached_formulas': formulas, 'formula_samples_against_code': samples,
              'source_hashes': hashes, 'exporter_hashes': {k: digest(v) for k, v in EXPORTERS.items()},
              'builder_sha256': digest(__file__),
              'export_payload_hashes': {k: hashlib.sha256(json_text(v).encode()).hexdigest() for k, v in exports.items()},
              'tables': [{'id': s.table_id, 'sheet': s.name, 'rows': len(s.rows), 'hidden': s.hidden} for s in sheets],
              'scope': 'Aktualny kod, pełne katalogi, warunki i źródła; wyniki symulacji tylko według jawnych horyzontów i strategii.',
              'simulation_snapshot': str(SIMULATION.relative_to(ROOT)), 'simulation_sha256': digest(SIMULATION),
              'facts_checks': exports['facts'].get('checks'), 'scenario_checks': exports['scenarios'].get('checks'),
              'text_coverage': exports['texts'].get('counts', exports['texts'].get('coverage')), 'game_or_cloud_changes': False,
              'cache_method': 'Historyczne OOXML bajtowo zachowane; nowe formuły obliczone niezależnym ewaluatorem. Bez twierdzenia o uruchomieniu LibreOffice.'}
    book.close(); cached.close(); base.close()
    if write_report: REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({k: report[k] for k in ['validation', 'file', 'sha256', 'sheets', 'current_sheets', 'rows_current', 'new_cached_formulas', 'formula_samples_against_code']}, ensure_ascii=False))
    return report


def load_exports(source_sha, exports_dir=None, refresh_simulations=False, read_only=False):
    env = dict(os.environ, HARBORLIGHT_WORKBOOK_SOURCE_SHA=source_sha)
    if exports_dir:
        payloads = {kind: json.loads((Path(exports_dir)/f'{kind}.json').read_text()) for kind in EXPORTERS}
        if read_only:
            assert SIMULATION.exists() and json_text(json.loads(SIMULATION.read_text())) == json_text(payloads['scenarios']), 'Cached simulation differs from workbook evidence'
        else:
            SIMULATION.parent.mkdir(parents=True, exist_ok=True)
            SIMULATION.write_text(json.dumps(payloads['scenarios'], ensure_ascii=False, indent=2)+'\n')
        return payloads
    payloads = {}
    with tempfile.TemporaryDirectory(prefix='harborlight-master-v15-') as directory:
        for kind, script in EXPORTERS.items():
            if kind == 'scenarios' and SIMULATION.exists() and not refresh_simulations:
                payloads[kind] = json.loads(SIMULATION.read_text()); continue
            if kind == 'scenarios' and read_only:
                raise ValueError('Read-only validation needs the recorded simulation snapshot')
            target = Path(directory)/f'{kind}.json'
            subprocess.run(['node', str(script), '--output', str(target)], cwd=ROOT, env=env, check=True, timeout=900)
            payloads[kind] = json.loads(target.read_text())
            if kind == 'scenarios':
                SIMULATION.parent.mkdir(parents=True, exist_ok=True); SIMULATION.write_text(json.dumps(payloads[kind], ensure_ascii=False, indent=2)+'\n')
    return payloads


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--validate-only', action='store_true'); parser.add_argument('--source-ref')
    parser.add_argument('--exports-dir', type=Path); parser.add_argument('--refresh-simulations', action='store_true')
    args = parser.parse_args()
    if args.validate_only and args.refresh_simulations:
        parser.error('--validate-only cannot refresh or overwrite simulation evidence')
    previous = json.loads(REPORT.read_text()) if REPORT.exists() else None
    source_sha = args.source_ref or (previous['source_git_commit'] if previous else subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip())
    assert re.fullmatch(r'[a-f0-9]{40}', source_sha)
    if args.validate_only:
        assert previous and digest(OUTPUT) == previous['sha256']
        assert digest(__file__) == previous['builder_sha256'], 'Builder changed; regenerate master workbook'
        assert all(digest(EXPORTERS[k]) == value for k, value in previous['exporter_hashes'].items()), 'Exporter changed; regenerate master workbook'
        assert digest(SIMULATION) == previous['simulation_sha256'], 'Simulation snapshot changed; regenerate master workbook'
    exports = load_exports(source_sha, args.exports_dir, args.refresh_simulations, read_only=args.validate_only)
    if args.validate_only:
        assert {k: hashlib.sha256(json_text(v).encode()).hexdigest() for k, v in exports.items()} == previous['export_payload_hashes'], 'Export values differ from recorded workbook evidence'
    source_checks(exports, source_sha)
    sheets = prepare(exports, source_sha)
    if not args.validate_only: write_book(sheets)
    validate(exports, sheets, source_sha, write_report=not args.validate_only)


if __name__ == '__main__': main()
