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


if __name__ == "__main__":
    unittest.main(verbosity=2)
