#!/usr/bin/env python3
"""Stage exact, public, dependency-free trade rules into the isolated API.

Only these three reviewed model/catalog files may enter the Docker context.
No execution, credentials, build rewriting or external dependencies are used.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
FILES = (
    "harborlight-v1-provisions.js",
    "harborlight-v1-economy.js",
    "harborlight-v1-development-copy.js",
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    hashes = {}
    for name in FILES:
        source, target = ROOT / name, ROOT / "backend" / name
        if source.is_symlink() or target.is_symlink():
            raise ValueError("Model source and staged files must be ordinary files")
        data = source.read_bytes()
        for dependency in re.findall(r"(?:from\s*|import\s*)['\"]([^'\"]+)['\"]", data.decode()):
            if not dependency.startswith("./") or dependency[2:].split("?", 1)[0] not in FILES:
                raise ValueError(f"Review the public model dependency before staging: {dependency}")
        if args.check:
            if not target.is_file() or target.read_bytes() != data:
                raise ValueError(f"Staged API model differs from canonical source: {name}")
        else:
            target.write_bytes(data)
        hashes[name] = hashlib.sha256(data).hexdigest()
    print(json.dumps({"checked": args.check, "canonical_source_sha256": hashes}, sort_keys=True))


if __name__ == "__main__":
    main()
