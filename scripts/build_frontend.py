#!/usr/bin/env python3
"""Build or verify the immutable, public HARBORLIGHT frontend release.

Only explicitly listed game files are public. No build step executes game code,
reads credentials, or contacts Firebase. Verification finishes before extraction.
"""

import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import sys
import tarfile
import tempfile


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = (
    "assets/harborlight-inhabitants-clean.png",
    "assets/harborlight-v1-approved.png",
    "assets/harborlight-windmill-clean.png",
    "assets/paynow-wordmark.svg",
    "harborlight-auth.css",
    "harborlight-auth.html",
    "harborlight-auth.js",
    "harborlight-auth-providers.js",
    "harborlight-dev-cloud.js",
    "harborlight-dev-sync.js",
    "harborlight-legal.js",
    "harborlight-legal.css",
    "harborlight-terms.html",
    "harborlight-privacy.html",
    "harborlight-v1-activities.js",
    "harborlight-v1-ambient.js",
    "harborlight-v1-calendar.js",
    "harborlight-v1-commerce.js",
    "harborlight-v1-copy.js",
    "harborlight-v1-effects.js",
    "harborlight-v1-engagement.js",
    "harborlight-v1-events.js",
    "harborlight-v1-i18n.js",
    "harborlight-v1-inhabitants.js",
    "harborlight-v1-inventory.js",
    "harborlight-v1-layered.html",
    "harborlight-v1-leisure.js",
    "harborlight-v1-life.js",
    "harborlight-v1-logistics.js",
    "harborlight-v1-minigame-ui.js",
    "harborlight-v1-minigame.css",
    "harborlight-v1-minigames.js",
    "harborlight-v1-onboarding-ui.js",
    "harborlight-v1-onboarding.css",
    "harborlight-v1-play.css",
    "harborlight-v1-play.js",
    "harborlight-v1-profile.js",
    "harborlight-v1-progression.js",
    "harborlight-v1-residents.js",
    "harborlight-v1-smoke.js",
    "harborlight-v1-state.js",
    "harborlight-v1-tutorial-ui.js",
    "harborlight-v1-tutorial.css",
    "harborlight-v1-v16-copy.js",
    "harborlight-v1-water.js",
)
CONTENT_FILES = frozenset((*PUBLIC_FILES, "index.html"))
ARCHIVE_FILES = CONTENT_FILES | {"release.json"}
MAX_BYTES = 32 * 1024 * 1024
MAX_MEMBERS = 128
MAX_TAR_BYTES = MAX_BYTES + MAX_MEMBERS * 1024
COMMIT = re.compile(r"[a-f0-9]{40}\Z")
DIGEST = re.compile(r"[a-f0-9]{64}\Z")
INDEX = b'''<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HARBORLIGHT</title>
<script>
(() => {
  const dev = ['harborlight-dev.web.app', 'harborlight-dev.firebaseapp.com']
    .includes(new URL(location.href).hostname);
  const target = new URL(dev ? 'harborlight-auth.html' : 'harborlight-v1-layered.html', location.href);
  target.search = location.search;
  if (!target.searchParams.has('profile')) target.searchParams.set('profile', 'new-player');
  target.hash = location.hash;
  location.replace(target.href);
})();
</script>
</head>
<body><noscript><a href="harborlight-v1-layered.html?profile=new-player">Otworz gre HARBORLIGHT</a></noscript></body>
</html>
'''


class BundleError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise BundleError(message)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def validate_commit(commit):
    require(isinstance(commit, str) and COMMIT.fullmatch(commit), "A full, lowercase commit SHA is required.")
    return commit


def canonical_json(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")


def content_from_source(source_root):
    source_root = Path(source_root).resolve()
    files = {"index.html": INDEX}
    for name in PUBLIC_FILES:
        path = source_root / name
        require(path.is_file() and not path.is_symlink(), f"Missing or linked public source: {name}")
        require(path.resolve().is_relative_to(source_root), f"Public source escapes the repository: {name}")
        require(not any(parent.is_symlink() for parent in path.parents if parent != source_root and source_root in parent.parents),
                f"Linked source directory is not allowed: {name}")
        files[name] = path.read_bytes()
    require(sum(map(len, files.values())) <= MAX_BYTES, "Frontend exceeds the public release size limit.")
    return files


def make_manifest(files, commit):
    return {
        "schema_version": 1,
        "commit": validate_commit(commit),
        "files": {name: {"sha256": sha256(data), "size": len(data)} for name, data in sorted(files.items())},
    }


def validate_files(files, commit):
    require(set(files) == ARCHIVE_FILES, "Archive does not contain the exact public frontend file set.")
    require(sum(map(len, files.values())) <= MAX_BYTES, "Frontend exceeds the public release size limit.")
    try:
        manifest = json.loads(files["release.json"])
    except (ValueError, UnicodeError) as error:
        raise BundleError("Invalid release manifest JSON.") from error
    require(isinstance(manifest, dict) and manifest.get("schema_version") == 1, "Unsupported frontend manifest.")
    require(manifest.get("commit") == validate_commit(commit), "Frontend manifest belongs to another source commit.")
    expected = manifest.get("files")
    require(isinstance(expected, dict) and set(expected) == CONTENT_FILES, "Manifest does not list the exact public file set.")
    for name in sorted(CONTENT_FILES):
        entry = expected[name]
        require(isinstance(entry, dict) and set(entry) == {"sha256", "size"}, f"Invalid manifest entry: {name}")
        require(isinstance(entry["sha256"], str) and DIGEST.fullmatch(entry["sha256"]), f"Invalid file digest: {name}")
        require(type(entry["size"]) is int and entry["size"] >= 0, f"Invalid file size: {name}")
        require(entry["sha256"] == sha256(files[name]) and entry["size"] == len(files[name]),
                f"Frontend file does not match its manifest: {name}")
    return manifest


def archive_bytes(files):
    destination = io.BytesIO()
    with gzip.GzipFile(filename="", mode="wb", fileobj=destination, mtime=0, compresslevel=9) as zipped:
        with tarfile.open(fileobj=zipped, mode="w|", format=tarfile.USTAR_FORMAT) as archive:
            for name, data in sorted(files.items()):
                info = tarfile.TarInfo(name)
                info.size = len(data)
                info.mode = 0o644
                info.uid = info.gid = info.mtime = 0
                info.uname = info.gname = ""
                archive.addfile(info, io.BytesIO(data))
    value = destination.getvalue()
    require(len(value) <= MAX_BYTES, "Compressed frontend exceeds the release size limit.")
    return value


def existing_output_is_managed(destination):
    require(not destination.is_symlink(), "Output directory must not be a symbolic link.")
    if not destination.exists():
        return
    require(destination.is_dir(), "Frontend output is not a directory.")
    paths = list(destination.rglob("*"))
    require(not any(path.is_symlink() for path in paths), "Output contains a symbolic link.")
    regular = {path.relative_to(destination).as_posix(): path for path in paths if path.is_file()}
    if not paths:
        return
    require(set(regular) == ARCHIVE_FILES, "Refusing to overwrite an output directory with unknown files.")
    try:
        manifest = json.loads(regular["release.json"].read_bytes())
        commit = manifest.get("commit")
    except (ValueError, AttributeError) as error:
        raise BundleError("Refusing to overwrite an unmanaged output directory.") from error
    validate_files({name: path.read_bytes() for name, path in regular.items()}, commit)


def write_output(files, destination):
    destination = Path(destination)
    existing_output_is_managed(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=".harborlight-frontend-", dir=destination.parent))
    try:
        for name, data in files.items():
            path = staging / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            path.chmod(0o644)
        if destination.exists():
            shutil.rmtree(destination)
        staging.rename(destination)
    finally:
        if staging.exists():
            shutil.rmtree(staging)


def metadata(files, commit, archive, compressed):
    return {
        "commit": commit,
        "archive": str(archive),
        "archive_sha256": sha256(compressed),
        "manifest_sha256": sha256(files["release.json"]),
        "file_count": len(files),
        "total_bytes": sum(map(len, files.values())),
    }


def build(commit, output, archive, source_root=ROOT):
    validate_commit(commit)
    output, archive = Path(output), Path(archive)
    require(not archive.resolve().is_relative_to(output.resolve()), "Archive must be outside the public output directory.")
    files = content_from_source(source_root)
    files["release.json"] = canonical_json(make_manifest(files, commit))
    validate_files(files, commit)
    compressed = archive_bytes(files)
    write_output(files, output)
    archive.parent.mkdir(parents=True, exist_ok=True)
    require(not archive.is_symlink(), "Archive output must not be a symbolic link.")
    archive.write_bytes(compressed)
    return metadata(files, commit, archive, compressed)


def verify_archive(archive, commit, expected_sha256, extract_to):
    validate_commit(commit)
    require(isinstance(expected_sha256, str) and DIGEST.fullmatch(expected_sha256), "Expected archive SHA-256 must have 64 lowercase hex digits.")
    archive = Path(archive)
    require(archive.is_file() and not archive.is_symlink(), "Frontend archive must be a regular file.")
    require(archive.stat().st_size <= MAX_BYTES, "Compressed frontend exceeds the release size limit.")
    compressed = archive.read_bytes()
    require(sha256(compressed) == expected_sha256, "Frontend archive SHA-256 does not match the DEV receipt.")
    try:
        with gzip.GzipFile(fileobj=io.BytesIO(compressed), mode="rb") as zipped:
            unpacked = zipped.read(MAX_TAR_BYTES + 1)
        require(len(unpacked) <= MAX_TAR_BYTES, "Expanded archive exceeds the release size limit.")
        files = {}
        with tarfile.open(fileobj=io.BytesIO(unpacked), mode="r:") as source:
            for member in source:
                require(len(files) < MAX_MEMBERS, "Archive contains too many entries.")
                path = PurePosixPath(member.name)
                require(not path.is_absolute() and not any(part in (".", "..") for part in member.name.split("/"))
                        and "\\" not in member.name and member.name in ARCHIVE_FILES,
                        "Archive contains a path outside the public file set.")
                require(member.isfile() and not member.pax_headers, "Archive contains links or unsupported metadata.")
                require(member.name not in files, "Archive contains duplicate files.")
                require(0 <= member.size <= MAX_BYTES, "Archive member exceeds the release size limit.")
                require(sum(map(len, files.values())) + member.size <= MAX_BYTES,
                        "Frontend exceeds the public release size limit.")
                value = source.extractfile(member)
                require(value is not None, "Archive member is unreadable.")
                files[member.name] = value.read()
                require(len(files[member.name]) == member.size, "Archive member is truncated.")
    except (tarfile.TarError, OSError, EOFError) as error:
        raise BundleError("Frontend archive is not a valid bounded tar.gz release.") from error
    validate_files(files, commit)
    write_output(files, extract_to)
    return metadata(files, commit, archive, compressed)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--output", type=Path, default=Path("build/frontend"))
    parser.add_argument("--archive", type=Path, default=Path("build/harborlight-frontend.tar.gz"))
    parser.add_argument("--verify-archive", type=Path)
    parser.add_argument("--expected-sha256")
    parser.add_argument("--extract-to", type=Path)
    args = parser.parse_args()
    try:
        if args.verify_archive:
            require(args.expected_sha256 and args.extract_to, "Verification requires --expected-sha256 and --extract-to.")
            result = verify_archive(args.verify_archive, args.commit, args.expected_sha256, args.extract_to)
        else:
            require(not args.expected_sha256 and not args.extract_to, "Verification options require --verify-archive.")
            result = build(args.commit, args.output, args.archive)
        print(json.dumps(result, sort_keys=True))
    except (BundleError, OSError) as error:
        print(f"Frontend release rejected: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
