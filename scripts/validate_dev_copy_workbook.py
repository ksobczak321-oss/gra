#!/usr/bin/env python3
"""Validate the delivered DEV editorial workbook and its actual source files."""
import hashlib
import json
from pathlib import Path
import re

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'docs/arkusze/HARBORLIGHT15-walidacja.json'
HEADERS = ['Opis i kontekst', 'Aktualny tekst', 'Tekst po akceptacji i poprawkach']


def main():
    evidence = json.loads(REPORT.read_text())
    assert re.fullmatch(r'[a-f0-9]{40}', evidence['source_git_commit'])
    workbook_path = (ROOT / evidence['file']).resolve()
    assert workbook_path.is_relative_to(ROOT / 'docs/arkusze')
    assert hashlib.sha256(workbook_path.read_bytes()).hexdigest() == evidence['sha256'], 'Editorial workbook bytes differ from reviewed artifact'
    if evidence.get('merge_evidence'):
        merge_path = (ROOT / evidence['merge_evidence']).resolve()
        assert merge_path.is_relative_to(ROOT / 'docs/v32')
        assert hashlib.sha256(merge_path.read_bytes()).hexdigest() == evidence['merge_evidence_sha256'], 'Reviewed six-sheet merge evidence changed'
        merge = json.loads(merge_path.read_text())
        assert merge['unselected_sheet_contents_read'] is False
        assert merge['selected_sheets'] == evidence['selected_sheets']
    for name, expected in evidence['source_sha256'].items():
        source = (ROOT / name).resolve()
        assert source.is_relative_to(ROOT), name
        assert hashlib.sha256(source.read_bytes()).hexdigest() == expected, f'Update editorial workbook after changing {name}'
    workbook = load_workbook(workbook_path, read_only=True, data_only=False)
    counts = {}
    for sheet in workbook:
        assert sheet.max_column == 3, sheet.title
        assert [cell.value for cell in next(sheet.iter_rows(max_row=1))] == HEADERS, sheet.title
        for row in sheet.iter_rows(min_row=2):
            assert row[2].value is None, f'Column C must remain empty: {sheet.title}!C{row[2].row}'
            assert all(cell.data_type != 'f' for cell in row), f'Unexpected formula in {sheet.title}'
        counts[sheet.title] = sheet.max_row - 1
    workbook.close()
    assert counts == evidence['sheets'], 'Editorial sheet coverage changed'
    assert sum(counts.values()) == evidence['rows']
    print(json.dumps({'source_commit': evidence['source_git_commit'], 'sheets': len(counts), 'rows': sum(counts.values()), 'three_columns': True, 'C_all_blank': True, 'source_fingerprints_match': True}))


if __name__ == '__main__':
    main()
