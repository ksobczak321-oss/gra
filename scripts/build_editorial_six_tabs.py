#!/usr/bin/env python3
"""Export only the six reviewed editorial sheets from the merged DEV catalog.

The uploaded workbook is deliberately not opened here. The reviewed merge
evidence supplies the selected row identities and editorial decisions; current
Polish text is read as JSON data from DEVELOPMENT_COPY, without executing JS.
The historical full workbook is never read or overwritten.

Run after committing the application changes so source_git_commit identifies
the exact public source bytes fingerprinted by the generated validation report.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import tempfile

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.table import Table, TableStyleInfo

from build_frontend import PUBLIC_FILES


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs/v32/EDITORIAL-SIX-TABS-MERGE.json"
OUTPUT = ROOT / "docs/arkusze/HARBORLIGHT15-redakcja-6-zakladek.xlsx"
REPORT = ROOT / "docs/arkusze/HARBORLIGHT15-walidacja.json"
CATALOG = "harborlight-v1-development-copy.js"
HEADERS = ["Opis i kontekst", "Aktualny tekst", "Tekst po akceptacji i poprawkach"]
SHEET_COUNTS = {
    "Tutorial": 55,
    "Budynki — opisy": 24,
    "Budynki — informacje": 30,
    "Dolny pasek": 24,
    "Komunikaty": 215,
    "Przyciski": 65,
}
PUBLIC_TEXT_FILES = tuple(sorted(
    name for name in PUBLIC_FILES
    if Path(name).suffix.lower() in {".js", ".mjs", ".html", ".css"}
))
SHA256 = re.compile(r"[a-f0-9]{64}\Z")
SHA1 = re.compile(r"[a-f0-9]{40}\Z")
EDITORIAL_NOTE = re.compile(
    r"^(?:do zmiany|po[łl][ąa]cz\b.*(?:linie|wiersz|\d\s*i\s*\d).*)$"
    r"|niebieskie niejasne|czerwone zmienione|\(dostosuj\b",
    re.IGNORECASE | re.DOTALL,
)
STALE_CONTEXT = (
    "Materiał do redakcji; nowe lub zmienione działanie nie jest jeszcze wdrożone.",
    "Docelowy tekst do redakcji; nie potwierdza wdrożenia.",
    "Nowy tekst do redakcji; niewdrożony.",
    "Dostosowano do zatwierdzonych zasad; tekst nie jest jeszcze wdrożony.",
)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def repo_path(path):
    path = Path(path).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError(f"Expected a path inside the repository: {path}")
    return path.relative_to(ROOT).as_posix()


def source_hashes():
    return {name: sha256((ROOT / name).read_bytes()) for name in PUBLIC_TEXT_FILES}


def git_head():
    result = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    if not SHA1.fullmatch(result):
        raise ValueError("Cannot establish the current source commit")
    return result


def require_committed_source(hashes, head):
    """A source SHA must describe these bytes, not an earlier dirty worktree."""
    for name, expected in hashes.items():
        committed = subprocess.check_output(
            ["git", "show", f"{head}:{name}"], cwd=ROOT
        )
        if sha256(committed) != expected:
            raise ValueError(
                f"Commit application changes before exporting: {name} differs from {head}"
            )


def read_catalog():
    source = (ROOT / CATALOG).read_text(encoding="utf-8")
    marker = "export const DEVELOPMENT_COPY = Object.freeze("
    if source.count(marker) != 1:
        raise ValueError("Cannot locate the unique DEVELOPMENT_COPY data catalog")
    catalog, _ = json.JSONDecoder().raw_decode(source.split(marker, 1)[1].lstrip())
    if not isinstance(catalog, dict) or not all(
        isinstance(key, str) and isinstance(value, str)
        for key, value in catalog.items()
    ):
        raise ValueError("DEVELOPMENT_COPY must be a JSON object containing strings")
    return catalog


def selected_rows(evidence, catalog):
    if evidence.get("unselected_sheet_contents_read") is not False:
        raise ValueError("Merge evidence must explicitly exclude other sheet contents")
    if evidence.get("selected_sheets") != list(SHEET_COUNTS):
        raise ValueError("Only the six completed sheets, in their reviewed order, are allowed")
    if not SHA256.fullmatch(str(evidence.get("input_sha256", ""))):
        raise ValueError("Missing SHA256 of the original uploaded workbook")
    rows = evidence.get("rows")
    if not isinstance(rows, list) or len(rows) != sum(SHEET_COUNTS.values()):
        raise ValueError("Expected exactly 413 reviewed rows")
    grouped = {name: [] for name in SHEET_COUNTS}
    seen_ids, seen_positions = set(), set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Each reviewed row must be an object")
        ident, sheet, number = row.get("id"), row.get("sheet"), row.get("row")
        if sheet not in grouped or type(number) is not int or number < 2:
            raise ValueError(f"Invalid selected-sheet row: {ident}")
        if not isinstance(ident, str) or not ident or ident in seen_ids:
            raise ValueError(f"Missing or repeated editorial ID: {ident}")
        if (sheet, number) in seen_positions:
            raise ValueError(f"Repeated workbook position: {sheet}!A{number}")
        seen_ids.add(ident)
        seen_positions.add((sheet, number))
        if ident not in catalog:
            raise ValueError(f"Reviewed ID has no current catalog entry: {ident}")
        current = catalog[ident]
        removed = ident == "MSG-FED-HOUR" and row.get("status") == "removed_per_C"
        if (not current.strip() and not removed) or row.get("effective") != current:
            raise ValueError(f"Merge evidence and current runtime catalog differ: {ident}")
        if EDITORIAL_NOTE.search(current) or (
            ident.startswith("BLD-") and current.strip().casefold() == "usuń"
        ):
            raise ValueError(f"An editorial note cannot be published as game text: {ident}")
        for key in ("context", "resolution", "runtime_path", "status"):
            value = row.get(key)
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"Missing {key} in merge evidence: {ident}")
        grouped[sheet].append(row)
    for sheet, sheet_rows in grouped.items():
        sheet_rows.sort(key=lambda row: row["row"])
        if len(sheet_rows) != SHEET_COUNTS[sheet]:
            raise ValueError(f"Wrong reviewed row count for {sheet}")
        if [row["row"] for row in sheet_rows] != list(range(2, SHEET_COUNTS[sheet] + 2)):
            raise ValueError(f"Reviewed source row numbers must be contiguous: {sheet}")
    return grouped


def row_context(row):
    context = row["context"].strip()
    for old in STALE_CONTEXT:
        context = context.replace(old, "Tekst scalony w katalogu DEV z sześciu ukończonych zakładek.")
    if context.split("\n", 1)[0].split(" | ", 1)[0].strip() != row["id"]:
        context = row["id"] + "\n" + context
    return (
        context
        + "\nScalenie: " + row["resolution"].strip()
        + "\nŹródło / zastosowanie: " + row["runtime_path"].strip()
        + "\nStatus scalenia: " + row["status"].strip()
    )


def build_workbook(path, grouped, catalog):
    workbook = Workbook()
    workbook.remove(workbook.active)
    workbook.properties.title = "HARBORLIGHT — redakcja sześciu ukończonych zakładek"
    workbook.properties.subject = "Kolumny A/B/C; puste C oznacza akceptację tekstu B"
    workbook.properties.creator = "HARBORLIGHT"
    for index, (name, rows) in enumerate(grouped.items(), 1):
        sheet = workbook.create_sheet(name)
        sheet.append(HEADERS)
        sheet.freeze_panes = "B2"
        sheet.sheet_view.zoomScale = 75
        sheet.sheet_properties.tabColor = "226E94"
        for column, width in (("A", 62), ("B", 100), ("C", 100)):
            sheet.column_dimensions[column].width = width
        for cell in sheet[1]:
            cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
            cell.fill = PatternFill("solid", fgColor="184D42")
            cell.alignment = Alignment(wrap_text=True, vertical="center")
        sheet.row_dimensions[1].height = 34
        for row in rows:
            sheet.append([row_context(row), catalog[row["id"]], None])
            cells = sheet[sheet.max_row]
            for cell in cells:
                # String typing keeps even a leading '=' literal and inert.
                cell.data_type = "s"
                cell.font = Font(name="Calibri", size=11, color="203B32")
                cell.alignment = Alignment(wrap_text=True, vertical="top")
            cells[2].value = None
            cells[2].fill = PatternFill("solid", fgColor="FFF2CC")
            longest = max(
                str(cell.value or "").count("\n")
                + math.ceil(len(str(cell.value or "")) / width)
                for cell, width in ((cells[0], 75), (cells[1], 125))
            )
            sheet.row_dimensions[sheet.max_row].height = min(320, max(60, 15 * longest))
        table = Table(displayName=f"RedakcjaSzescABC{index}", ref=f"A1:C{sheet.max_row}")
        table.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
        sheet.add_table(table)
        sheet.print_title_rows = "1:1"
        sheet.page_setup.orientation = "landscape"
        sheet.page_setup.paperSize = sheet.PAPERSIZE_A3
        sheet.page_setup.fitToWidth = 1
        sheet.page_setup.fitToHeight = 0
    workbook.active = 0
    workbook.save(path)
    workbook.close()


def validate_workbook(path, grouped, catalog):
    workbook = load_workbook(path, read_only=True, data_only=False)
    try:
        if workbook.sheetnames != list(SHEET_COUNTS):
            raise ValueError("Export must contain exactly the six selected sheets")
        counts = {}
        for sheet in workbook:
            if sheet.max_column != 3:
                raise ValueError(f"Expected exactly A/B/C in {sheet.title}")
            if [cell.value for cell in next(sheet.iter_rows(max_row=1))] != HEADERS:
                raise ValueError(f"Unexpected column headers in {sheet.title}")
            exported = list(sheet.iter_rows(min_row=2, max_col=3))
            if len(exported) != len(grouped[sheet.title]):
                raise ValueError(f"Exported row coverage changed in {sheet.title}")
            for cells, row in zip(exported, grouped[sheet.title]):
                if cells[0].value != row_context(row) or (cells[1].value or "") != catalog[row["id"]]:
                    raise ValueError(f"Export differs from reviewed source: {row['id']}")
                if cells[2].value is not None:
                    raise ValueError(f"Column C must remain empty: {cells[2].coordinate}")
                if any(cell.data_type == "f" for cell in cells):
                    raise ValueError(f"Unexpected executable formula: {row['id']}")
            counts[sheet.title] = len(exported)
        if counts != SHEET_COUNTS:
            raise ValueError("Exported sheet coverage differs from the reviewed scope")
        return counts
    finally:
        workbook.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence", type=Path, default=EVIDENCE)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--report", type=Path, default=REPORT)
    args = parser.parse_args()
    evidence_name, output_name, _ = map(repo_path, (args.evidence, args.output, args.report))
    if args.output.resolve() == (ROOT / "docs/arkusze/HARBORLIGHT15-teksty-DEV.xlsx").resolve():
        raise ValueError("The historical full workbook must remain untouched")
    if not args.output.resolve().is_relative_to(ROOT / "docs/arkusze"):
        raise ValueError("The new workbook must be stored in docs/arkusze")
    if not args.report.resolve().is_relative_to(ROOT / "docs/arkusze"):
        raise ValueError("The validation report must be stored in docs/arkusze")
    evidence_bytes = args.evidence.read_bytes()
    evidence = json.loads(evidence_bytes)
    head = git_head()
    hashes = source_hashes()
    require_committed_source(hashes, head)
    catalog = read_catalog()
    grouped = selected_rows(evidence, catalog)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        prefix=".harborlight-six-tabs-", suffix=".xlsx", dir=args.output.parent, delete=False
    ) as temporary:
        temporary_path = Path(temporary.name)
    try:
        build_workbook(temporary_path, grouped, catalog)
        counts = validate_workbook(temporary_path, grouped, catalog)
        if source_hashes() != hashes or git_head() != head:
            raise ValueError("Source files changed during export; regenerate after editing finishes")
        if args.evidence.read_bytes() != evidence_bytes:
            raise ValueError("Merge evidence changed during export; regenerate after editing finishes")
        temporary_path.replace(args.output)
    finally:
        temporary_path.unlink(missing_ok=True)
    report = {
        "file": output_name,
        "sha256": sha256(args.output.read_bytes()),
        "version": "DEV 0.15.0.0 / v32 — redakcja sześciu zakładek",
        "base_git_commit": evidence.get("base_git_commit"),
        "source_git_commit": head,
        "source_fingerprint": sha256(json.dumps(hashes, sort_keys=True).encode()),
        "source_sha256": hashes,
        "source_files_fingerprinted": len(hashes),
        "merge_evidence": evidence_name,
        "merge_evidence_sha256": sha256(evidence_bytes),
        "input_sha256": evidence["input_sha256"],
        "selected_sheets": list(SHEET_COUNTS),
        "unselected_sheet_contents_read": False,
        "uploaded_workbook_opened_by_exporter": False,
        "historical_full_workbook_modified": False,
        "rows": sum(counts.values()),
        "sheets": counts,
        "exact_three_columns": True,
        "C_all_blank": True,
        "no_formulas": True,
        "all_selected_ids_in_current_catalog": True,
        "all_effective_text_matches_current_catalog": True,
        "source_files_match_source_git_commit": True,
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "source_sha256"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
