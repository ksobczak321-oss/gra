#!/usr/bin/env python3
"""Build detailed, reproducible Polish DOCX/TXT instructions for each minigame.

The catalog is exported from the real game models by export_minigame_catalog.mjs.
No account, world, game model, or cloud service is opened by this generator.
Use --check to compare the complete published document set without writing it.
"""
from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
from io import BytesIO
import json
from pathlib import Path
import re
from urllib.parse import urlencode
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

from docx import Document
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from lxml import etree


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = ROOT / "docs/minigames/catalog.json"
OUTPUT = ROOT / "minigames"
BASE_URL = "https://harborlight-dev.web.app"
FIXED_DATE = datetime(2026, 11, 22, 12, 0, tzinfo=timezone.utc)
ZIP_DATE = (2026, 11, 22, 12, 0, 0)
ARCHIVE_NAME = "HARBORLIGHT-minigry-dokumentacja.zip"
MANIFEST_NAME = "documents.json"
INDEX_NAME = "linki.txt"
GAME_PATH = "/minigames/"
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
REL = "http://schemas.openxmlformats.org/package/2006/relationships"
FAMILY_NAMES = {
    "puzzle": "Zagadka wyspy",
    "islandPuzzle": "Zagadka wyspy",
    "island-puzzle": "Zagadka wyspy",
    "story": "Przygoda fabularna",
    "escapeStory": "Przygoda fabularna",
    "escape-story": "Przygoda fabularna",
    "adventure": "Przygoda klasyczna",
    "classicAdventure": "Przygoda klasyczna",
    "classic-adventure": "Przygoda klasyczna",
    "expedition": "Gra ekspedycyjna",
    "miniGame": "Gra ekspedycyjna",
    "minigame": "Gra ekspedycyjna",
}
REQUIRED_LISTS = (
    "setup", "rules", "controls", "win", "fail", "timing", "scoring",
    "retry", "progression", "examples", "variants", "sourceFiles",
)
PRACTICE_NOTE = (
    "Link otwiera samodzielną próbę gry. Rozgrywka odbywa się w pamięci tej karty "
    "przeglądarki: nie zmienia mieszkańców, zasobów, misji ani zapisanej wyspy. "
    "Monety i nagrody opisane w zasadach głównej gry nie są wypłacane na konto "
    "za tę próbę. Odświeżenie strony rozpoczyna nową sesję."
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def human(value) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        for key in ("pl", "text", "description", "label", "title", "name"):
            if key in value:
                return human(value[key])
    if isinstance(value, (int, float)):
        return str(value)
    raise ValueError(f"Expected Polish human-readable prose, got: {value!r}")


def game_url(entry, variant=None) -> str:
    query = {"game": entry["slug"]}
    if variant is not None:
        query["variant"] = variant
    return BASE_URL + GAME_PATH + "?" + urlencode(query)


@dataclass(frozen=True)
class Paragraph:
    text: str
    kind: str = "normal"
    link: str | None = None


def add_list(output, values, *, numbered=False):
    for index, value in enumerate(values, 1):
        text = human(value)
        if not text:
            raise ValueError("Empty instruction in catalog")
        output.append(Paragraph((f"{index}. " if numbered else "• ") + text, "list"))


def room_kind(room):
    if isinstance(room, str):
        return room
    if isinstance(room, dict):
        for key in ("kind", "puzzleKind", "id", "mechanic"):
            if isinstance(room.get(key), str):
                return room[key]
    raise ValueError(f"Invalid story room: {room!r}")


def room_title(room, puzzle_lookup):
    kind = room_kind(room)
    if kind in puzzle_lookup:
        return human(puzzle_lookup[kind]["title"])
    if isinstance(room, dict) and room.get("title"):
        return human(room["title"])
    raise ValueError(f"Story room has no actual puzzle description: {kind}")


def section(output, title, values, *, numbered=False):
    output.append(Paragraph(title, "heading"))
    add_list(output, values, numbered=numbered)


def make_body(entry, catalog, puzzle_lookup):
    title = human(entry["title"])
    family = FAMILY_NAMES.get(entry["family"], entry["family"])
    paragraphs = [
        Paragraph(title, "title"),
        Paragraph("HARBORLIGHT · " + family, "subtitle"),
        Paragraph("Szczegółowe zasady, cel i scenariusz · 22 listopada 2026", "metadata"),
        Paragraph("Otwórz grę na PRE-PROD", "heading"),
        Paragraph(game_url(entry), "url", game_url(entry)),
        Paragraph(PRACTICE_NOTE, "callout"),
        Paragraph("Cel gry", "heading"),
        Paragraph(human(entry["objective"])),
        Paragraph("Scenariusz i zadanie gracza", "heading"),
        Paragraph(human(entry["scenario"])),
    ]
    description = human(entry["description"])
    if description not in (human(entry["objective"]), human(entry["scenario"])):
        paragraphs.append(Paragraph(description))
    section(paragraphs, "Przygotowanie rozgrywki", entry["setup"], numbered=True)
    section(paragraphs, "Sterowanie i wykonywanie ruchów", entry["controls"], numbered=True)
    section(paragraphs, "Zasady krok po kroku", entry["rules"], numbered=True)
    section(paragraphs, "Warunek zwycięstwa", entry["win"])
    section(paragraphs, "Błędy, niedozwolone ruchy i zakończenie próby", entry["fail"])
    section(paragraphs, "Czas i tempo rozgrywki", entry["timing"])
    section(paragraphs, "Punktacja i nagrody w głównej grze", entry["scoring"])
    section(paragraphs, "Ponowna próba i pomoc", entry["retry"])
    section(paragraphs, "Rozwój trudności i dostępność", entry["progression"])
    unlock = entry.get("unlock")
    if unlock:
        if isinstance(unlock, str):
            paragraphs.append(Paragraph(unlock))
        elif isinstance(unlock, dict):
            prose = unlock.get("description") or unlock.get("text")
            if prose:
                paragraphs.append(Paragraph(human(prose)))
            else:
                for key, label in (("level", "Poziom odblokowania"), ("townhall", "Poziom Ratusza"), ("unlockLevel", "Poziom odblokowania")):
                    if key in unlock:
                        paragraphs.append(Paragraph(f"{label} w głównej grze: {unlock[key]}."))
    section(paragraphs, "Przykładowy przebieg", entry["examples"], numbered=True)

    variants = entry["variants"]
    is_story = entry["slug"].startswith("story-")
    paragraphs.append(Paragraph("Warianty i osobne linki", "heading"))
    if not variants:
        paragraphs.append(Paragraph(
            "Ta gra ma jeden scenariusz podstawowy. Parametry kolejnych prób "
            "i rozwój trudności opisano powyżej; link podstawowy otwiera tę samą mechanikę."
        ))
    mechanics = []
    for index, variant in enumerate(variants, 1):
        if not isinstance(variant, dict):
            raise ValueError(f"Expected variant metadata for {entry['slug']}")
        number = variant.get("number", index)
        label = human(variant.get("label", f"Wariant {number}"))
        paragraphs.append(Paragraph(label, "subheading"))
        url = game_url(entry, number)
        paragraphs.append(Paragraph(url, "url", url))
        for key in ("description", "difference", "objective"):
            if variant.get(key):
                paragraphs.append(Paragraph(human(variant[key])))
        rooms = variant.get("rooms", [])
        if is_story and not rooms:
            raise ValueError(f"Story variant lacks room sequence: {entry['slug']} #{number}")
        for room_index, room in enumerate(rooms, 1):
            kind = room_kind(room)
            puzzle = puzzle_lookup.get(kind)
            if puzzle is None:
                raise ValueError(f"No rules for room {kind} in {entry['slug']}")
            if kind not in mechanics:
                mechanics.append(kind)
            objective = human(room.get("objective")) if isinstance(room, dict) and room.get("objective") else human(puzzle["objective"])
            paragraphs.append(Paragraph(f"{room_index}. {room_title(room, puzzle_lookup)} — {objective}", "list"))
            if isinstance(room, dict) and room.get("scenario"):
                paragraphs.append(Paragraph(human(room["scenario"]), "normal"))
    if is_story:
        numbers = [variant.get("number", index) for index, variant in enumerate(variants, 1)]
        if numbers != [1, 2, 3, 4, 5]:
            raise ValueError(f"Story needs all five actual variants: {entry['slug']}")
        paragraphs.append(Paragraph("Instrukcje wszystkich zagadek tej historii", "heading"))
        paragraphs.append(Paragraph(
            "Poniższe instrukcje dotyczą mechanik wymienionych w sekwencjach pomieszczeń. "
            "Wariant historii zmienia ich kolejność lub układ planszy; cel danej mechaniki "
            "i warunek sprawdzenia poprawności pozostają opisane osobno."
        ))
        for kind in mechanics:
            puzzle = puzzle_lookup[kind]
            paragraphs.append(Paragraph(human(puzzle["title"]), "subheading"))
            paragraphs.append(Paragraph("Cel: " + human(puzzle["objective"])))
            for label, field, numbered in (
                ("Sterowanie", "controls", True),
                ("Zasady", "rules", True),
                ("Zwycięstwo", "win", False),
                ("Błędy i ograniczenia", "fail", False),
                ("Przykład", "examples", True),
            ):
                paragraphs.append(Paragraph(label, "minorheading"))
                add_list(paragraphs, puzzle[field], numbered=numbered)

    paragraphs.extend([
        Paragraph("Zakres samodzielnej próby", "heading"),
        Paragraph(PRACTICE_NOTE),
        Paragraph(
            "Każda pozycja biblioteki ma własny adres. Wariant wybierzesz w adresie "
            "lub w panelu gry. Zmieniaj poziom i wariant między próbami; rozpoczęta "
            "próba korzysta z parametrów wybranych przy jej uruchomieniu."
        ),
        Paragraph("Źródła i wersja zasad", "heading"),
        Paragraph("Identyfikator gry: " + entry["slug"] + "."),
        Paragraph("Źródło katalogu: " + catalog["sourceCommit"] + "."),
        Paragraph("Stan opisu: 22 listopada 2026. Opis dotyczy modeli gry wskazanych poniżej."),
    ])
    for source in entry["sourceFiles"]:
        path = source["path"]
        line = source.get("line", 1)
        description = human(source.get("description", "Implementacja zasad i interfejsu"))
        text = f"• {path}:{line} — {description}"
        link = f"https://github.com/ksobczak321-oss/gra/blob/{catalog['sourceCommit']}/{path}#L{line}"
        paragraphs.append(Paragraph(text, "source", link))
    for paragraph in paragraphs:
        if not paragraph.text.strip():
            raise ValueError(f"Empty paragraph in {entry['slug']}")
        if re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", paragraph.text):
            raise ValueError(f"Invalid XML control character in {entry['slug']}")
    return paragraphs


def shade(paragraph, fill):
    properties = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    properties.append(shd)


def add_hyperlink(paragraph, text, url):
    relationship = paragraph.part.relate_to(
        url, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", is_external=True
    )
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), relationship)
    run = OxmlElement("w:r")
    properties = OxmlElement("w:rPr")
    style = OxmlElement("w:rStyle")
    style.set(qn("w:val"), "Hyperlink")
    properties.append(style)
    run.append(properties)
    node = OxmlElement("w:t")
    node.text = text
    run.append(node)
    hyperlink.append(run)
    paragraph._p.append(hyperlink)


def normalise_zip(data):
    output = BytesIO()
    with ZipFile(BytesIO(data)) as source, ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as target:
        for name in sorted(source.namelist()):
            info = ZipInfo(name, ZIP_DATE)
            info.compress_type = ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            target.writestr(info, source.read(name))
    return output.getvalue()


def make_docx(entry, paragraphs):
    document = Document()
    section = document.sections[0]
    section.page_width, section.page_height = Cm(21), Cm(29.7)
    section.top_margin, section.bottom_margin = Cm(1.9), Cm(1.8)
    section.left_margin, section.right_margin = Cm(2), Cm(2)
    section.header_distance, section.footer_distance = Cm(.7), Cm(.7)
    styles = document.styles
    normal = styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = RGBColor.from_string("18374B")
    normal.paragraph_format.space_after = Pt(7)
    normal.paragraph_format.line_spacing = 1.12
    for name, size in (("Title", 25), ("Heading 1", 15), ("Heading 2", 12), ("Heading 3", 11)):
        style = styles[name]
        style.font.name = "Aptos Display"
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor.from_string("15576A")
        style.font.bold = True
        style.paragraph_format.keep_with_next = True
        style.paragraph_format.space_before = Pt(13)
        style.paragraph_format.space_after = Pt(6)
    styles["Subtitle"].font.color.rgb = RGBColor.from_string("92702E")
    styles["Subtitle"].font.size = Pt(12)
    if "Hyperlink" not in styles:
        hyperlink_style = styles.add_style("Hyperlink", WD_STYLE_TYPE.CHARACTER)
    else:
        hyperlink_style = styles["Hyperlink"]
    hyperlink_style.font.color.rgb = RGBColor.from_string("17687F")
    hyperlink_style.font.underline = True

    header = section.header.paragraphs[0]
    header.text = "HARBORLIGHT  |  BIBLIOTEKA MINIGIER"
    header.runs[0].font.size = Pt(8)
    header.runs[0].font.bold = True
    header.runs[0].font.color.rgb = RGBColor.from_string("92702E")
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = footer.add_run("HARBORLIGHT · ")
    run.font.size = Pt(8)
    field = OxmlElement("w:fldSimple")
    field.set(qn("w:instr"), "PAGE")
    footer._p.append(field)

    props = document.core_properties
    props.title = human(entry["title"]) + " — HARBORLIGHT"
    props.subject = "Szczegółowe zasady gry, scenariusz, cel i link PRE-PROD"
    props.author = "HARBORLIGHT"
    props.last_modified_by = "HARBORLIGHT"
    props.created = FIXED_DATE
    props.modified = FIXED_DATE
    props.revision = 1
    props.keywords = "HARBORLIGHT, minigry, " + entry["slug"]
    props.comments = "Wygenerowano z katalogu zasad; stan opisu 22 listopada 2026."
    for item in paragraphs:
        style = {"title": "Title", "subtitle": "Subtitle", "heading": "Heading 1", "subheading": "Heading 2", "minorheading": "Heading 3"}.get(item.kind)
        paragraph = document.add_paragraph(style=style)
        if item.link:
            add_hyperlink(paragraph, item.text, item.link)
        else:
            paragraph.add_run(item.text)
        if item.kind == "metadata":
            for run in paragraph.runs:
                run.font.size = Pt(9)
                run.font.color.rgb = RGBColor.from_string("617580")
        elif item.kind == "callout":
            shade(paragraph, "EAF2F3")
            paragraph.paragraph_format.space_before = Pt(8)
            paragraph.paragraph_format.space_after = Pt(12)
            paragraph.paragraph_format.left_indent = Cm(.2)
            paragraph.paragraph_format.right_indent = Cm(.2)
        elif item.kind == "list":
            paragraph.paragraph_format.left_indent = Cm(.4)
            paragraph.paragraph_format.first_line_indent = Cm(-.4)
        elif item.kind == "source":
            for run in paragraph.runs:
                run.font.size = Pt(8.5)
        paragraph.paragraph_format.widow_control = True
    buffer = BytesIO()
    document.save(buffer)
    return normalise_zip(buffer.getvalue())


def validate_document(entry, paragraphs, docx_data, txt_data):
    text = txt_data.decode("utf-8")
    expected = "\n\n".join(p.text for p in paragraphs) + "\n"
    assert text == expected, entry["slug"]
    with ZipFile(BytesIO(docx_data)) as archive:
        assert archive.testzip() is None
        required = {"[Content_Types].xml", "word/document.xml", "docProps/core.xml", "word/_rels/document.xml.rels"}
        assert required.issubset(archive.namelist())
        for name in archive.namelist():
            if name.endswith((".xml", ".rels")):
                etree.fromstring(archive.read(name))
        tree = etree.fromstring(archive.read("word/document.xml"))
        body = tree.find(f"{{{W}}}body")
        actual = ["".join(p.xpath(".//w:t/text()", namespaces={"w": W})) for p in body.findall(f"{{{W}}}p")]
        assert actual == [p.text for p in paragraphs], f"DOCX/TXT content differs: {entry['slug']}"
        relationships = etree.fromstring(archive.read("word/_rels/document.xml.rels"))
        targets = {r.get("Target") for r in relationships.findall(f"{{{REL}}}Relationship") if r.get("TargetMode") == "External"}
        assert {p.link for p in paragraphs if p.link}.issubset(targets)
    reopened = Document(BytesIO(docx_data))
    assert reopened.core_properties.title == human(entry["title"]) + " — HARBORLIGHT"
    assert len(reopened.paragraphs) == len(paragraphs)
    words = len(re.findall(r"\b\w+\b", text, re.UNICODE))
    assert words >= 230, f"Instructions are insufficiently detailed: {entry['slug']} ({words} words)"
    assert len(paragraphs) >= 38, f"Missing instruction sections: {entry['slug']}"
    return {"words": words, "paragraphs": len(paragraphs), "docx_bytes": len(docx_data), "txt_bytes": len(txt_data), "docx_sha256": sha256(docx_data), "txt_sha256": sha256(txt_data), "content_parity": True, "reopened": True, "links_checked": True}


def load_catalog(path):
    catalog = json.loads(path.read_text(encoding="utf-8"))
    assert catalog["schemaVersion"] == 1
    assert re.fullmatch(r"[a-f0-9]{40}", catalog["sourceCommit"])
    entries = catalog["entries"]
    assert isinstance(entries, list) and len(entries) == 55, "Expected all 55 active catalog entries"
    assert Counter(entry["family"] for entry in entries) == {"puzzle": 24, "story": 20, "adventure": 9, "expedition": 2}
    for name, expected in catalog.get("sourceHashes", {}).items():
        source_path = (ROOT / name).resolve()
        assert source_path.is_relative_to(ROOT) and source_path.is_file(), name
        assert sha256(source_path.read_bytes()) == expected, f"Catalog source changed: {name}"
    slugs = set()
    for entry in entries:
        slug = entry["slug"]
        assert re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug), slug
        assert slug not in slugs, slug
        slugs.add(slug)
        if entry.get("url"):
            assert entry["url"] == game_url(entry), f"Catalog game URL differs: {slug}"
        for index, variant in enumerate(entry["variants"], 1):
            if variant.get("url"):
                assert variant["url"] == game_url(entry, variant.get("number", index)), f"Catalog variant URL differs: {slug}"
        for key in ("title", "description", "objective", "scenario"):
            assert human(entry[key]), (slug, key)
        for key in REQUIRED_LISTS:
            assert isinstance(entry[key], list), (slug, key)
            assert entry[key] or key == "variants", (slug, key)
        for source in entry["sourceFiles"]:
            source_path = (ROOT / source["path"]).resolve()
            assert source_path.is_relative_to(ROOT) and source_path.is_file(), source
            line = source.get("line", 1)
            assert isinstance(line, int) and 1 <= line <= len(source_path.read_text().splitlines()), source
    return catalog


def make_outputs(catalog, catalog_data):
    entries = catalog["entries"]
    puzzle_lookup = {entry["engine"]["id"]: entry for entry in entries if entry["slug"].startswith("puzzle-")}
    assert len(puzzle_lookup) == 24, "Expected all 24 actual island-puzzle mechanics"
    files = {}
    documents = []
    index = ["HARBORLIGHT — wszystkie minigry i dokumentacja", "Stan opisu: 22 listopada 2026", "", "Biblioteka: " + BASE_URL + GAME_PATH, "", PRACTICE_NOTE, ""]
    for number, entry in enumerate(entries, 1):
        paragraphs = make_body(entry, catalog, puzzle_lookup)
        txt = ("\n\n".join(p.text for p in paragraphs) + "\n").encode("utf-8")
        docx = make_docx(entry, paragraphs)
        validation = validate_document(entry, paragraphs, docx, txt)
        slug = entry["slug"]
        files["docs/" + slug + ".txt"] = txt
        files["docs/" + slug + ".docx"] = docx
        docx_url = BASE_URL + "/minigames/docs/" + slug + ".docx"
        txt_url = BASE_URL + "/minigames/docs/" + slug + ".txt"
        documents.append({"slug": slug, "title": human(entry["title"]), "family": entry["family"], "gameUrl": game_url(entry), "docxUrl": docx_url, "txtUrl": txt_url, **validation})
        index.extend([f"{number:02d}. {human(entry['title'])}", "Gra: " + game_url(entry), "Word: " + docx_url, "TXT: " + txt_url])
        if slug.startswith("story-"):
            index.extend(f"Wariant {variant.get('number', i)}: {game_url(entry, variant.get('number', i))}" for i, variant in enumerate(entry["variants"], 1))
        index.append("")
    files[INDEX_NAME] = ("\n".join(index).rstrip() + "\n").encode("utf-8")
    manifest = {"schemaVersion": 1, "date": "2026-11-22", "sourceCommit": catalog["sourceCommit"], "catalogSha256": sha256(catalog_data), "entryCount": len(entries), "docxCount": len(entries), "txtCount": len(entries), "storyVariantLinks": sum(len(e["variants"]) for e in entries if e["slug"].startswith("story-")), "validation": "PASS", "families": dict(Counter(e["family"] for e in entries)), "documents": documents}
    files[MANIFEST_NAME] = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    archive_buffer = BytesIO()
    with ZipFile(archive_buffer, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            info = ZipInfo(name, ZIP_DATE)
            info.compress_type = ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    files[ARCHIVE_NAME] = archive_buffer.getvalue()
    with ZipFile(BytesIO(files[ARCHIVE_NAME])) as archive:
        assert archive.testzip() is None
        assert len(archive.namelist()) == 112
        assert all(archive.read(name) == data for name, data in files.items() if name != ARCHIVE_NAME)
    files["catalog.json"] = catalog_data
    return files, manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    catalog = load_catalog(args.catalog)
    files, manifest = make_outputs(catalog, args.catalog.read_bytes())
    expected_doc_names = {Path(name).name for name in files if name.startswith("docs/")}
    existing_doc_names = {p.name for p in (args.output / "docs").glob("*") if p.is_file()} if (args.output / "docs").exists() else set()
    if args.check:
        assert existing_doc_names == expected_doc_names, "Missing or extra individual game documents"
        for name, data in files.items():
            path = args.output / name
            assert path.is_file() and path.read_bytes() == data, f"Regenerate minigame document: {path}"
    else:
        if existing_doc_names - expected_doc_names:
            raise ValueError("Refusing to leave stale game documentation in output directory")
        for name, data in files.items():
            path = args.output / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            path.chmod(0o644)
    print(json.dumps({"validation": "PASS", "mode": "check" if args.check else "build", "games": manifest["entryCount"], "DOCX": manifest["docxCount"], "TXT": manifest["txtCount"], "story_variant_links": manifest["storyVariantLinks"], "words_total": sum(d["words"] for d in manifest["documents"]), "archive": str(args.output / ARCHIVE_NAME), "archive_bytes": len(files[ARCHIVE_NAME]), "archive_sha256": sha256(files[ARCHIVE_NAME])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
