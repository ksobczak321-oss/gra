#!/usr/bin/env python3
"""Losslessly extract reviewed building frames for bounded runtime loading.

The source atlases, frame rectangles, alpha bounds and placement metadata are
preserved. This is a technical extraction, with no resize, retouch or new art.
Use --check to verify every RGBA pixel and the closed sprite metadata without
changing the repository. Rebuilding with the same Pillow/libwebp versions is
deterministic; pixel validation remains independent of encoder byte choices.
"""
from __future__ import annotations

import argparse
from io import BytesIO
import hashlib
import json
from pathlib import Path

from PIL import Image, features
import PIL


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "building-upgrades-v1"
MANIFEST = ASSETS / "manifest.json"
FAMILIES = (
    "townhall", "house", "farm", "lumber", "quarry", "windmill",
    "sawmill", "warehouse", "bakery", "dairy", "slaughterhouse", "fisher",
    "leatherworks", "academy", "barracks", "chapel", "lighthouse", "theatre",
    "market", "dock",
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def ordinary(path: Path) -> None:
    require(not path.is_symlink(), f"Symlink is not a reviewed asset: {path.name}")
    require(path.parent.resolve() == ASSETS.resolve(), "Asset escaped the reviewed directory")


def image_rgba(path: Path) -> Image.Image:
    ordinary(path)
    with Image.open(path) as image:
        require(image.format == "WEBP", f"Expected WebP: {path.name}")
        return image.convert("RGBA")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify existing sprites without changing them")
    parser.add_argument("--report", type=Path, help="Optional JSON evidence output, outside the runtime package")
    args = parser.parse_args()
    if args.report:
        require(args.report.suffix == ".json" and not args.report.resolve().is_relative_to(ASSETS.resolve()),
                "Evidence must be a JSON file outside the runtime asset directory")
    require(not MANIFEST.is_symlink(), "Manifest must be an ordinary reviewed file")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    require(manifest.get("version") == 1 and manifest.get("enabled") is True,
            "Expected the enabled reviewed version1 manifest")
    require(set(manifest["buildings"]) == set(FAMILIES), "Expected all20 reviewed building families")
    rows = []
    source_bytes = 0
    source_rgba = 0
    source_hashes = {}
    for family in FAMILIES:
        spec = manifest["buildings"][family]
        expected_source = f"assets/building-upgrades-v1/{family}.webp"
        require(spec["src"] == expected_source, f"Unexpected original atlas: {family}")
        source = ROOT / expected_source
        atlas = image_rgba(source)
        require(atlas.size == (spec["width"], spec["height"]), f"Original dimensions differ: {family}")
        original = source.read_bytes()
        source_hashes[family] = digest(original)
        source_bytes += len(original)
        source_rgba += atlas.width * atlas.height * 4
        require(len(spec["frameRects"]) == len(spec["bboxes"]) == 10,
                f"Expected10 reviewed frames and bounds: {family}")
        sprites = []
        for index, rect in enumerate(spec["frameRects"]):
            require(isinstance(rect, list) and len(rect) == 4
                    and all(type(value) is int for value in rect), f"Noninteger frame: {family}/{index}")
            x, y, width, height = rect
            require(x >= 0 and y >= 0 and width > 0 and height > 0
                    and x + width <= atlas.width and y + height <= atlas.height,
                    f"Frame leaves original atlas: {family}/{index}")
            sprite = {"src": f"assets/building-upgrades-v1/frame-{family}-{index + 1:02d}.webp",
                      "width": width, "height": height}
            target = ROOT / sprite["src"]
            ordinary(target)
            cropped = atlas.crop((x, y, x + width, y + height))
            if not args.check:
                encoded = BytesIO()
                cropped.save(encoded, "WEBP", lossless=True, exact=True, method=6)
                target.write_bytes(encoded.getvalue())
            require(target.is_file(), f"Missing runtime sprite: {target.name}")
            actual = image_rgba(target)
            require(actual.size == cropped.size, f"Runtime sprite dimensions differ: {target.name}")
            require(actual.tobytes() == cropped.tobytes(), f"RGBA pixels differ: {target.name}")
            rows.append({"family": family, "index": index, "source": expected_source,
                         "frame_rect": rect, **sprite, "bytes": target.stat().st_size,
                         "rgba_bytes": width * height * 4,
                         "rgba_sha256": digest(cropped.tobytes()),
                         "sha256": digest(target.read_bytes()), "exact_RGBA_identity": True})
            sprites.append(sprite)
        if args.check:
            require(spec.get("sprites") == sprites, f"Runtime sprite metadata differs: {family}")
        else:
            spec["sprites"] = sprites
        require(digest(source.read_bytes()) == source_hashes[family], f"Original atlas was changed: {family}")
    if not args.check:
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report = {
        "status": "PASS", "check_only": args.check, "families": len(FAMILIES), "sprites": len(rows),
        "encoder": {"Pillow": PIL.__version__, "libwebp": features.version("webp"),
                    "lossless": True, "exact_transparent_RGB": True, "method": 6},
        "original_atlases": {"files": len(FAMILIES), "bytes": source_bytes,
                             "rgba_bytes": source_rgba, "sha256": source_hashes},
        "all_runtime_sprites": {"files": len(rows), "bytes": sum(row["bytes"] for row in rows),
                                "rgba_bytes": sum(row["rgba_bytes"] for row in rows)},
        "first_stage_runtime_sprites": {
            "files": len(FAMILIES), "bytes": sum(row["bytes"] for row in rows if row["index"] == 0),
            "rgba_bytes": sum(row["rgba_bytes"] for row in rows if row["index"] == 0)},
        "exact_RGBA_identity": "PASS_ALL200", "pixels_resized_or_retouched": False,
        "originals_changed": False, "frames": rows,
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "frames"}, sort_keys=True))


if __name__ == "__main__":
    main()
