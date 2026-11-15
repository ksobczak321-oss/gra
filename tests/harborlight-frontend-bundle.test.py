#!/usr/bin/env python3
"""Real frontend closure and immutable bundle checks; no Firebase or credentials."""

import gzip
import importlib.util
import io
import json
from pathlib import Path
import re
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("harborlight_frontend_bundle", ROOT / "scripts/build_frontend.py")
BUNDLE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUNDLE)
SHA = "a" * 40


class FrontendBundleTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="harborlight-bundle-test-")
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.source = self.directory / "source"
        for name in BUNDLE.PUBLIC_FILES:
            path = self.source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(("public content: " + name).encode())
        self.output = self.directory / "public"
        self.archive = self.directory / "frontend.tar.gz"

    def build(self, commit=SHA):
        return BUNDLE.build(commit, self.output, self.archive, self.source)

    def files(self):
        return {path.relative_to(self.output).as_posix(): path.read_bytes()
                for path in self.output.rglob("*") if path.is_file()}

    def verify(self, archive=None, digest=None, commit=SHA, extract=None):
        archive = archive or self.archive
        return BUNDLE.verify_archive(archive, commit,
                                     digest or BUNDLE.sha256(archive.read_bytes()),
                                     extract or self.directory / "extracted")

    def altered_archive(self, files):
        path = self.directory / "altered.tar.gz"
        path.write_bytes(BUNDLE.archive_bytes(files))
        return path

    def test_actual_game_is_complete_and_cli_produces_only_public_payload(self):
        result = subprocess.run([
            sys.executable, str(ROOT / "scripts/build_frontend.py"), "--commit", SHA,
            "--output", str(self.output), "--archive", str(self.archive),
        ], text=True, capture_output=True, timeout=30, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        metadata = json.loads(result.stdout)
        self.assertEqual(metadata["file_count"], len(BUNDLE.ARCHIVE_FILES))
        self.assertEqual(metadata["archive_sha256"], BUNDLE.sha256(self.archive.read_bytes()))
        self.assertEqual(metadata["manifest_sha256"], BUNDLE.sha256((self.output / "release.json").read_bytes()))
        payload = self.files()
        self.assertEqual(set(payload), BUNDLE.ARCHIVE_FILES)
        for name in BUNDLE.PUBLIC_FILES:
            self.assertEqual(payload[name], (ROOT / name).read_bytes())
        references = set()
        for name, data in payload.items():
            if not name.endswith((".js", ".html", ".css")):
                continue
            for match in re.findall(r'''["']((?:\./)?(?:harborlight-[\w.-]+|assets/[\w./-]+)\.(?:js|css|html|png)(?:\?[^"']*)?)["']''', data.decode()):
                references.add(match.split("?", 1)[0].removeprefix("./"))
        self.assertTrue(references)
        self.assertFalse(references - payload.keys(), references - payload.keys())
        forbidden = ["README.md", "AGENTS.md", ".env", ".git/config", "firebase.json", ".firebaserc", "backend/server.mjs", "index-old.html"]
        self.assertFalse(set(forbidden) & payload.keys())
        verified = self.verify(digest=metadata["archive_sha256"])
        self.assertEqual(metadata, verified)

    def test_same_bytes_build_identical_archive_despite_source_mtime_changes(self):
        metadata = self.build()
        first = self.archive.read_bytes()
        for path in self.source.rglob("*"):
            if path.is_file():
                path.touch()
        next_metadata = self.build()
        self.assertEqual(first, self.archive.read_bytes())
        self.assertEqual(metadata, next_metadata)

    def test_index_preserves_query_hash_and_existing_profile(self):
        self.build()
        script = r'''
          import {readFileSync} from 'node:fs';
          import vm from 'node:vm';
          const input=JSON.parse(readFileSync(0,'utf8'));
          const script=input.html.match(/<script>([\s\S]*?)<\/script>/)[1];
          const result=input.urls.map(href=>{
            const url=new URL(href);let target;
            const location={href,search:url.search,hash:url.hash,replace:value=>target=value};
            vm.runInNewContext(script,{URL,location});return target;
          });
          console.log(JSON.stringify(result));
        '''
        data = {"html": (self.output / "index.html").read_text(), "urls": [
            "https://harborlight-dev.web.app/?slot=test#map",
            "https://harborlight-prod.web.app/?profile=preview&slot=old#house",
            "https://harborlight-dev.web.app/",
        ]}
        result = subprocess.run(["node", "--input-type=module", "-e", script], input=json.dumps(data),
                                text=True, capture_output=True, timeout=10, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), [
            "https://harborlight-dev.web.app/harborlight-auth.html?slot=test&profile=new-player#map",
            "https://harborlight-prod.web.app/harborlight-v1-layered.html?profile=preview&slot=old#house",
            "https://harborlight-dev.web.app/harborlight-auth.html?profile=new-player",
        ])

    def test_unknown_source_files_and_secrets_never_enter_release(self):
        for name in [".env", ".git/config", "docs/private.txt", "backend/server.mjs"]:
            path = self.source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("must never be public")
        self.build()
        self.assertEqual(set(self.files()), BUNDLE.ARCHIVE_FILES)

    def test_wrong_archive_hash_or_commit_is_rejected_before_extracting(self):
        self.build()
        for digest, commit in [("0" * 64, SHA), (BUNDLE.sha256(self.archive.read_bytes()), "b" * 40)]:
            with self.subTest(digest=digest, commit=commit):
                with self.assertRaises(BUNDLE.BundleError):
                    self.verify(digest=digest, commit=commit)
                self.assertFalse((self.directory / "extracted").exists())

    def test_tampered_file_or_manifest_missing_file_is_rejected(self):
        self.build()
        original = self.files()
        altered = dict(original, **{"harborlight-v1-play.js": b"tampered"})
        missing = dict(original)
        del missing["harborlight-v1-play.js"]
        manifest_files = dict(original)
        manifest = json.loads(original["release.json"])
        del manifest["files"]["harborlight-v1-state.js"]
        manifest_files["release.json"] = BUNDLE.canonical_json(manifest)
        for files in [altered, missing, manifest_files]:
            with self.assertRaises(BUNDLE.BundleError):
                self.verify(archive=self.altered_archive(files))
            self.assertFalse((self.directory / "extracted").exists())

    def test_traversal_absolute_and_unknown_files_are_rejected(self):
        self.build()
        for name in ["../outside", "/tmp/outside", "assets/../../outside", "assets\\outside", ".env", "docs/private.txt"]:
            with self.subTest(name=name):
                files = dict(self.files())
                files[name] = b"never extract this"
                with self.assertRaises(BUNDLE.BundleError):
                    self.verify(archive=self.altered_archive(files))
                self.assertFalse((self.directory / "extracted").exists())

    def test_links_and_duplicate_entries_are_rejected(self):
        self.build()
        for link in [False, True]:
            target = io.BytesIO()
            with gzip.GzipFile(fileobj=target, mode="wb", mtime=0) as zipped:
                with tarfile.open(fileobj=zipped, mode="w|", format=tarfile.USTAR_FORMAT) as archive:
                    info = tarfile.TarInfo("index.html")
                    if link:
                        info.type = tarfile.SYMTYPE
                        info.linkname = "../../outside"
                        archive.addfile(info)
                    else:
                        for _ in range(2):
                            archive.addfile(info, io.BytesIO(b""))
            self.archive.write_bytes(target.getvalue())
            with self.assertRaises(BUNDLE.BundleError):
                self.verify()
            self.assertFalse((self.directory / "extracted").exists())

    def test_expanded_archive_size_is_bounded(self):
        self.archive.write_bytes(gzip.compress(b"\0" * (BUNDLE.MAX_TAR_BYTES + 1), mtime=0))
        with self.assertRaisesRegex(BUNDLE.BundleError, "Expanded archive"):
            self.verify()
        self.assertFalse((self.directory / "extracted").exists())

    def test_missing_or_linked_public_source_fails(self):
        path = self.source / "harborlight-v1-play.js"
        path.unlink()
        with self.assertRaises(BUNDLE.BundleError):
            self.build()
        secret = self.directory / "outside-secret"
        secret.write_text("secret")
        path.symlink_to(secret)
        with self.assertRaises(BUNDLE.BundleError):
            self.build()

    def test_unmanaged_extraction_target_is_preserved(self):
        self.build()
        target = self.directory / "important"
        target.mkdir()
        (target / "keep.txt").write_text("keep")
        with self.assertRaises(BUNDLE.BundleError):
            self.verify(extract=target)
        self.assertEqual((target / "keep.txt").read_text(), "keep")

    def test_firebase_uses_explicit_game_targets_without_spa_fallback(self):
        configuration = json.loads((ROOT / "firebase.json").read_text())["hosting"]
        targets = json.loads((ROOT / ".firebaserc").read_text())["targets"]
        self.assertEqual(configuration["target"], "game")
        self.assertEqual(configuration["public"], "build/frontend")
        self.assertFalse(configuration["cleanUrls"])
        self.assertNotIn("rewrites", configuration)
        for environment in ["dev", "prod"]:
            project = "harborlight-" + environment
            self.assertEqual(targets[project]["hosting"]["game"], [project])


class HistoricalFrontendProfileTests(unittest.TestCase):
    """Exercise each parser guard after a synthetic trusted archive pin matches.

    Production only accepts profiles in current main. The isolated fixture adds
    a temporary in-process registry entry so a tampered archive can reach the
    structural and manifest checks rather than only failing its outer digest.
    """

    PROFILE = "test-trusted-historical-release"

    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="harborlight-historical-profile-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.archive = self.directory / "frontend.tar.gz"
        self.output = self.directory / "extracted"
        self.profile_path = self.directory / "trusted-profile.json"
        content = {"index.html": b"historical index", "harborlight-v1-play.js": b"historical game"}
        self.files = {**content, "release.json": BUNDLE.canonical_json(BUNDLE.make_manifest(content, SHA))}
        self.original_archive = BUNDLE.archive_bytes(self.files)
        self.profile = {
            "schema_version": 1, "name": self.PROFILE, "commit": SHA,
            "archive_sha256": BUNDLE.sha256(self.original_archive),
            "manifest_sha256": BUNDLE.sha256(self.files["release.json"]),
            "file_count": len(self.files), "total_bytes": sum(map(len, self.files.values())),
            "content_files": sorted(content),
        }
        registry = patch.dict(BUNDLE.VERIFICATION_PROFILES, {self.PROFILE: self.profile_path})
        registry.start()
        self.addCleanup(registry.stop)
        self.pin(self.original_archive)

    def pin(self, compressed):
        self.archive.write_bytes(compressed)
        self.profile["archive_sha256"] = BUNDLE.sha256(compressed)
        self.profile_path.write_text(json.dumps(self.profile))

    def verify(self, *, commit=SHA, digest=None, name=PROFILE):
        return BUNDLE.verify_archive(self.archive, commit, digest or BUNDLE.sha256(self.archive.read_bytes()),
                                     self.output, verification_profile=name)

    def reject(self, pattern=None, **kwargs):
        with self.assertRaisesRegex(BUNDLE.BundleError, pattern or ".+"):
            self.verify(**kwargs)
        self.assertFalse(self.output.exists(), "Rejected data must never reach extraction")

    def custom_archive(self, replacement=None, extra=None, duplicate=False):
        destination = io.BytesIO()
        with gzip.GzipFile(fileobj=destination, mode="wb", mtime=0) as zipped:
            with tarfile.open(fileobj=zipped, mode="w|", format=tarfile.PAX_FORMAT) as archive:
                for name, data in sorted(self.files.items()):
                    info = replacement if replacement is not None and replacement.name == name else tarfile.TarInfo(name)
                    if info.isreg():
                        info.size = len(data)
                    archive.addfile(info, io.BytesIO(data) if info.isreg() else None)
                    if duplicate and name == "index.html":
                        archive.addfile(info, io.BytesIO(data))
                if extra is not None:
                    extra.size = 0
                    archive.addfile(extra, io.BytesIO(b""))
        return destination.getvalue()

    def test_reviewed_production_profile_pins_exact_014_release(self):
        profile = BUNDLE.load_verification_profile("preprod-0.14.0.0-20261104")
        self.assertEqual(profile["commit"], "7e81a1a436770f57fd8abf390b6af8022e3300f6")
        self.assertEqual(profile["archive_sha256"], "b43a736f4c30e8db9d2704b50219e0e6c1cf06c32660640ef66f1861cc412196")
        self.assertEqual(profile["manifest_sha256"], "2dea4d8563fadaf38dcd8103dc9ee66088e69e34ba8cc74b544aaea4bf3bc54e")
        self.assertEqual((len(profile["content_files"]), len(profile["archive_files"])), (84, 85))
        self.assertEqual(profile["total_bytes"], 19682273)
        self.assertNotEqual(profile["archive_files"], BUNDLE.ARCHIVE_FILES)

    def test_explicit_profile_verifies_old_bytes_and_reextracts_idempotently(self):
        first = self.verify()
        self.assertEqual(first["verification_profile"], self.PROFILE)
        self.assertEqual(first["file_count"], len(self.files))
        self.assertEqual(first["archive_sha256"], BUNDLE.sha256(self.original_archive))
        extracted = {p.relative_to(self.output).as_posix(): p.read_bytes()
                     for p in self.output.rglob("*") if p.is_file()}
        self.assertEqual(extracted, self.files)
        self.assertEqual(self.verify(), first)
        self.assertEqual(self.archive.read_bytes(), self.original_archive)

    def test_no_profile_keeps_default_current_allowlist_strict(self):
        self.reject(name=None)
        self.assertEqual(len(BUNDLE.ARCHIVE_FILES), 109)
        self.assertIn("harborlight-v1-runtime-upgrade.js", BUNDLE.CONTENT_FILES)

    def test_unknown_or_path_supplied_profile_is_rejected(self):
        for name in ("unknown", "../trusted-profile.json", str(self.profile_path)):
            with self.subTest(name=name):
                self.reject("Unknown trusted", name=name)

    def test_wrong_commit_and_receipt_pin_fail_before_archive_processing(self):
        self.reject("another source commit", commit="b" * 40)
        self.reject("receipt archive", digest="0" * 64)
        # A matching caller digest cannot replace the profile's trusted pin.
        self.archive.write_bytes(self.original_archive + b"changed")
        self.reject("receipt archive")

    def test_altered_manifest_raw_bytes_and_content_digest_are_rejected(self):
        changed_manifest = dict(self.files, **{"release.json": self.files["release.json"] + b" "})
        self.pin(BUNDLE.archive_bytes(changed_manifest))
        self.reject("manifest does not match")
        changed_content = dict(self.files, **{"harborlight-v1-play.js": b"X" * len(self.files["harborlight-v1-play.js"])})
        self.pin(BUNDLE.archive_bytes(changed_content))
        self.reject("does not match its manifest")

    def test_missing_and_extra_members_are_rejected_after_outer_pin_matches(self):
        missing = dict(self.files)
        del missing["harborlight-v1-play.js"]
        self.pin(BUNDLE.archive_bytes(missing))
        self.reject("exact public frontend file set")
        for name in ("private.txt", "harborlight-v1-dev-preview.js"):
            with self.subTest(name=name):
                self.pin(BUNDLE.archive_bytes({**self.files, name: b"extra"}))
                self.reject("outside the public file set")

    def test_traversal_and_absolute_paths_are_rejected_after_outer_pin_matches(self):
        for name in ("../outside", "/tmp/outside", "assets/../../outside", "assets\\outside", "./index.html"):
            with self.subTest(name=name):
                self.pin(self.custom_archive(extra=tarfile.TarInfo(name)))
                self.reject("outside the public file set")

    def test_symlinks_hardlinks_and_nonregular_types_are_rejected(self):
        for kind in (tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.DIRTYPE, tarfile.FIFOTYPE, tarfile.CONTTYPE):
            with self.subTest(type=kind):
                member = tarfile.TarInfo("index.html")
                member.type, member.linkname = kind, "../../outside"
                self.pin(self.custom_archive(replacement=member))
                self.reject("unsupported metadata|non-regular")

    def test_duplicate_and_pax_metadata_are_rejected(self):
        self.pin(self.custom_archive(duplicate=True))
        self.reject("duplicate")
        member = tarfile.TarInfo("index.html")
        member.pax_headers = {"comment": "unsupported extension"}
        self.pin(self.custom_archive(replacement=member))
        self.reject("unsupported metadata")

    def test_expansion_and_declared_profile_size_are_bounded(self):
        self.pin(gzip.compress(b"\0" * (BUNDLE.MAX_TAR_BYTES + 1), mtime=0))
        self.reject("Expanded archive")
        self.pin(self.original_archive)
        self.profile["total_bytes"] += 1
        self.profile_path.write_text(json.dumps(self.profile))
        self.reject("size does not match")

    def test_profile_schema_duplicate_paths_and_file_count_are_rejected(self):
        original = dict(self.profile)
        for change in ({"file_count": 108}, {"content_files": ["index.html", "index.html"]},
                       {"content_files": ["../private", "index.html"]}, {"extra_unreviewed_field": True}):
            with self.subTest(change=change):
                self.profile_path.write_text(json.dumps({**original, **change}))
                self.reject("profile")

    def test_unmanaged_destination_and_symlink_are_preserved(self):
        self.output.mkdir()
        keep = self.output / "keep.txt"
        keep.write_text("preserve")
        with self.assertRaisesRegex(BUNDLE.BundleError, "unknown files"):
            self.verify()
        self.assertEqual(keep.read_text(), "preserve")
        keep.unlink()
        self.output.rmdir()
        outside = self.directory / "outside"
        outside.mkdir()
        self.output.symlink_to(outside, target_is_directory=True)
        with self.assertRaisesRegex(BUNDLE.BundleError, "symbolic link"):
            self.verify()
        self.assertTrue(self.output.is_symlink())
        self.assertEqual(list(outside.iterdir()), [])

    def test_cli_never_builds_using_a_historical_verification_profile(self):
        result = subprocess.run([
            sys.executable, str(ROOT / "scripts/build_frontend.py"), "--commit", SHA,
            "--verification-profile", "preprod-0.14.0.0-20261104",
            "--output", str(self.output), "--archive", str(self.directory / "not-built.tar.gz"),
        ], text=True, capture_output=True, timeout=10, check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Verification options require --verify-archive", result.stderr)
        self.assertFalse(self.output.exists())
        self.assertFalse((self.directory / "not-built.tar.gz").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
