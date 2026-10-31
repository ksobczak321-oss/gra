#!/usr/bin/env python3
"""Render the versioned change index and one reviewable card per change.

Canonical input is docs/tracking/changes.json. Rendering does not change
decisions, test results, source commits, cloud resources or GitHub Issues.
"""
import argparse
import json
import os
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/tracking/changes.json'
INDEX = ROOT / 'docs/tracking/CHANGE-REGISTER.md'
CARDS = ROOT / 'docs/tracking/changes'
ID = re.compile(r'HL-CHG-[0-9]{4}\Z')
STATUS_KEYS = ('implementation', 'dev', 'ci', 'preprod', 'prod', 'decision')
LABELS = {'implementation': 'Implementacja', 'dev': 'DEV', 'ci': 'CI',
          'preprod': 'PRE-PROD', 'prod': 'PROD', 'decision': 'Decyzja'}


def relative(target, parent):
    return os.path.relpath(target, parent).replace(os.sep, '/')


def link(path, parent):
    return '[' + path + '](' + relative(ROOT / path, parent) + ')'


def relation(ids):
    return ', '.join('[' + item + '](' + item + '.md)' for item in ids) or 'Brak.'


def validate(data):
    assert data.get('schema_version') == 1, 'Unsupported registry schema'
    changes = data.get('changes')
    assert isinstance(changes, list) and changes, 'Empty change registry'
    ids = [item.get('id') for item in changes]
    assert len(ids) == len(set(ids)), 'Duplicate change ID'
    assert all(isinstance(item, str) and ID.fullmatch(item) for item in ids), 'Invalid change ID'
    epics = {item['id'] for item in data['epics']}
    for item in changes:
        assert item['epic'] in epics, item['id']
        assert item['type'] in ('Bug', 'Story', 'Decision', 'Ops'), item['id']
        assert set(item['status']) == set(STATUS_KEYS), item['id']
        assert item.get('issue_url') is None or item['issue_url'].startswith('https://github.com/'), item['id']
        assert item.get('published_to_github_issues') == bool(item.get('issue_url')), item['id']
        for key in ('supersedes', 'superseded_by', 'related_changes'):
            assert all(target in ids and target != item['id'] for target in item[key]), (item['id'], key)
        for key in ('documents', 'code', 'automated_tests'):
            assert all((ROOT / path).is_file() for path in item['evidence'][key]), (item['id'], key)
        for previous in item['supersedes']:
            assert item['id'] in next(row for row in changes if row['id'] == previous)['superseded_by'], item['id']
    return changes


def manual_cases(changes):
    path = ROOT / 'docs/testing/manual-test-cases.json'
    if not path.is_file():
        return {}
    known = {item['id'] for item in changes}
    linked = {}
    for case in json.loads(path.read_text()).get('cases', []):
        target = Path('docs/testing') / case['file']
        assert (ROOT / target).is_file(), target
        for change in case['changes']:
            assert change in known, (case['id'], change)
            linked.setdefault(change, []).append({'id': case['id'], 'title': case['title'],
                                                 'file': target.as_posix(), 'manual_result': case['manual_result']})
    return linked


def card(item, cases):
    evidence = item['evidence']
    lines = ['# ' + item['id'] + ' — ' + item['title'], '',
             '**Typ:** ' + item['type'] + ' · **Obszar:** ' + item['area'] +
             ' · **Epik:** `' + item['epic'] + '`', '',
             'Ta karta jest wersjonowanym wpisem w Git. ' +
             ('Natywne GitHub Issue: ' + item['issue_url'] if item['issue_url'] else
              '**Nie została opublikowana jako natywne GitHub Issue** (`issue_url: null`).'), '',
             '## Status', '', '| Warstwa | Stan |', '|---|---|']
    lines += ['| ' + LABELS[key] + ' | `' + item['status'][key] + '` |' for key in STATUS_KEYS]
    lines += ['', 'Status kodu nie jest potwierdzeniem aktywacji usług, wykonania operacji chmurowej ani ręcznego testu.', '',
              '## Zakres i odbiór', '']
    lines += ['- ' + value for value in item['acceptance']]
    lines += ['', '## Źródło', '', item['source']['summary'], '',
              'Odniesienie: `' + item['source']['reference'] + '`.', '',
              'Data pierwotnej wiadomości: ' + (item['source']['date'] or 'nieustalona') + '. ' + item['source']['date_note']]
    if item['source'].get('attachment_references'):
        lines += ['', 'Pełne historyczne wklejki użytkownika zostały przeczytane; identyfikatory źródeł: ' +
                  ', '.join('`' + value + '`' for value in item['source']['attachment_references']) + '.']
    lines += ['', '## Dowody', '']
    for key, label in [('documents', 'Dokumenty'), ('code', 'Kod'), ('automated_tests', 'Scenariusze automatyczne')]:
        lines.append('- **' + label + ':** ' + (', '.join(link(path, CARDS) for path in evidence[key]) or 'nie przypisano.'))
    if evidence.get('source_sha'):
        lines.append('- **Kod dowodowy:** `' + evidence['source_sha'] + '`.')
    if evidence.get('ci_run_url'):
        lines.append('- **CI tego wydania:** ' + evidence['ci_run_url'] + '.')
    if evidence.get('preprod_run_url'):
        lines.append('- **Promocja kodu:** ' + evidence['preprod_run_url'] + '.')
    lines.append('- **Ręczne wykonanie przypadku:** `' + evidence['manual_execution'] + '`.')
    if cases:
        lines += ['', 'Powiązane przypadki do ręcznego przeklikania:', '']
        for case in cases:
            lines.append('- [' + case['id'] + ' — ' + case['title'] + '](' +
                         relative(ROOT / case['file'], CARDS) + ') — `' + case['manual_result'] + '`.')
    if evidence.get('release_note'):
        lines += ['', evidence['release_note']]
    existing = item.get('related_native_issue_urls', [])
    if existing:
        lines += ['', 'Historyczne powiązane Issues (odniesienia z istniejącego backlogu, nie nowe wpisy tej karty): ' + ', '.join(existing) + '.']
    lines += ['', '## Relacje', '', '- **Zastępuje:** ' + relation(item['supersedes']),
              '- **Zastąpione lub ograniczone przez:** ' + relation(item['superseded_by']),
              '- **Powiązane:** ' + relation(item['related_changes'])]
    if item['notes']:
        lines += ['', '## Uwagi', ''] + ['- ' + value for value in item['notes']]
    lines += ['', '[Wróć do rejestru](../CHANGE-REGISTER.md).', '',
              '<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->', '']
    return '\n'.join(lines)


def index(data, changes):
    baseline = data['environment_baseline']
    lines = ['# HARBORLIGHT — rejestr zmian', '',
             'Stan ewidencji: **' + data['as_of'] + '**. **' + str(len(changes)) +
             ' osobnych kart**, pogrupowanych w ' + str(len(data['epics'])) + ' epików. ' +
             'Każda karta ma stabilny identyfikator i odrębne statusy implementacji, DEV, CI, PRE-PROD, PROD oraz decyzji.', '',
             'Źródło danych: [changes.json](changes.json). Karty odtwarza `python3 scripts/build_change_register.py`; ' +
             '`--check` sprawdza zgodność bez zapisów. Nie edytuj wygenerowanych kart zamiast źródła JSON.', '',
             '## Zakres i granice', '', data['scope'], '', data['privacy_note'], '',
             '**To są wpisy repozytorium, nie opublikowane GitHub Issues.** ' +
             'Dostęp do API GitHub nie jest uwierzytelniony w tej sesji. Każdy rekord ma `issue_url: null` i ' +
             '`published_to_github_issues: false`; istniejące numery Issues są wyłącznie historycznymi powiązaniami. ' +
             'Nie utworzono fikcyjnych numerów ani nie zamknięto zdalnych zgłoszeń.', '',
             '## Potwierdzony punkt odniesienia', '',
             '- Kod aplikacji PRE-PROD: `' + baseline['application_source_sha'] + '` (**v22.1**).',
             '- CI: [41221965032 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41221965032).',
             '- PRE-PROD: [41222765705, próba 1 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41222765705).',
             '- Aktywacja API kont/rynku: **niepotwierdzona**. Pełny reset admin1–3: **niewykonany**.',
             '- PROD: **brak potwierdzonej publikacji**. Bieżący [rejestr środowisk](../ENVIRONMENT-STATUS.md) rozstrzyga późniejsze promocje.', '',
             'Sukces wspólnego CI dowodzi testów wydania, a `code_deployed_v22_1` obecności kodu w opublikowanym pakiecie. ' +
             'Nie oznacza, że każdy przypadek został ręcznie przeklikany ani że włączono OAuth, płatności, reklamy czy nowe API. ' +
             'Nowe propozycje mają własne statusy; nie dziedziczą sukcesu CI v22.1.', '',
             '## Znaczenie statusów', '',
             '| Pole | Interpretacja |', '|---|---|',
             '| `implementation` | Czy istnieje implementacja, gotowy skrypt, wyłącznie dokumentacja lub propozycja. |',
             '| `dev` | Zweryfikowany lokalnie kod, test z izolowaną usługą, analiza lub brak odczytu. |',
             '| `ci` | Wynik CI właściwego zakresu; `not_run_for_change` nie jest PASS poprzedniej wersji. |',
             '| `preprod` | Kod opublikowany, usługa faktycznie potwierdzona, nieustalona aktywacja albo niewykonana operacja. |',
             '| `prod` | W tej ewidencji brak publikacji i aktywacji produkcyjnej. |',
             '| `decision` | Przyjęte, otwarte, odłożone, zastąpione, wycofane lub tylko częściowo rozstrzygnięte. |', '',
             'Powiązanie `superseded_by` nie usuwa historii. Przykłady: PayU → Paynow; automatyczne refundacje → brak automatycznych zwrotów; ' +
             'wyłączny PvP → nowa dyspozycja NPC+PvP. Ostatnia zmiana kierunku nie aktualizuje wstecz opublikowanego kodu. ' +
             'Zwykłe zachowanie historii admin1 nadal obowiązuje przy deployu; późniejszy pełny reset jest osobnym wyjątkiem.', '',
             '## Epiki i karty', '']
    for epic in data['epics']:
        selected = [item for item in changes if item['epic'] == epic['id']]
        lines += ['<a id="' + epic['id'].lower() + '"></a>', '',
                  '### ' + epic['id'] + ' — ' + epic['title'], '',
                  '| Zmiana | Typ | Decyzja | DEV | PRE-PROD |', '|---|---|---|---|---|']
        for item in selected:
            lines.append('| [' + item['id'] + ' — ' + item['title'] + '](changes/' + item['id'] + '.md) | ' +
                         item['type'] + ' | `' + item['status']['decision'] + '` | `' + item['status']['dev'] +
                         '` | `' + item['status']['preprod'] + '` |')
        lines.append('')
    lines += ['## Utrzymanie', '',
              'Nowe ID dodajemy bez zmieniania dotychczasowych numerów; luki między obszarami są celowe. ' +
              'Nowa decyzja otrzymuje odrębny rekord i relację, zamiast nadpisania starej. ' +
              'Dowód CI/promocji musi odnosić się do właściwego pełnego SHA. Ręczny wynik zmieniamy dopiero po wykonaniu przypadku i zapisaniu dowodu.', '',
              'Osobne ręczne przypadki i ich powiązania prowadzi [plan ręcznych testów](../testing/MANUAL-TEST-PLAN.md). ' +
              'Założenie nazwy testu, istnienie pliku lub wynik automatyczny nie oznacza ręcznego PASS.', '',
              '<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = json.loads(SOURCE.read_text())
    changes = validate(data)
    cases = manual_cases(changes)
    expected = {INDEX: index(data, changes)}
    expected.update({CARDS / (item['id'] + '.md'): card(item, cases.get(item['id'], [])) for item in changes})
    extras = set(CARDS.glob('HL-CHG-*.md')) - set(expected)
    if extras:
        raise ValueError('Untracked cards outside canonical registry: ' + ', '.join(str(path) for path in extras))
    differences = [str(path.relative_to(ROOT)) for path, text in expected.items() if not path.exists() or path.read_text() != text]
    if args.check and differences:
        raise ValueError('Registry render differs: ' + ', '.join(differences))
    if not args.check:
        CARDS.mkdir(parents=True, exist_ok=True)
        for path, text in expected.items():
            path.write_text(text)
    print(('Verified' if args.check else 'Rendered') + ' ' + str(len(changes)) + ' change cards and index.')


if __name__ == '__main__':
    main()
