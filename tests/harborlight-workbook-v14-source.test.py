"""Historical Excel 14 validates against its own immutable code, without writes."""
import contextlib
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import build_workbook_v14 as workbook

SOURCE_REF = '7e81a1a436770f57fd8abf390b6af8022e3300f6'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class HistoricalSourceTests(unittest.TestCase):
    def test_source_ref_rejects_mutable_refs_and_generation_before_running_code(self):
        for arguments in [
            ['--source-ref', SOURCE_REF],
            ['--validate-only', '--source-ref', 'main'],
            ['--validate-only', '--source-ref', SOURCE_REF[:7]],
            ['--validate-only', '--source-ref', ''],
        ]:
            with self.subTest(arguments=arguments), contextlib.redirect_stderr(io.StringIO()), \
                    patch.object(workbook, 'game_facts') as facts, \
                    patch.object(workbook, 'build') as build:
                with self.assertRaises(SystemExit) as rejected:
                    workbook.main(arguments)
                self.assertEqual(rejected.exception.code, 2)
                facts.assert_not_called()
                build.assert_not_called()

    def test_snapshot_contains_frozen_transitive_modules_and_is_removed_after_use(self):
        current_version = (ROOT / 'harborlight-version.js').read_bytes()
        with workbook.frozen_source(SOURCE_REF) as snapshot:
            self.assertIn('0.14.0.0', (snapshot / 'harborlight-version.js').read_text())
            self.assertTrue((snapshot / 'backend/island-name.mjs').is_file())
            self.assertTrue((snapshot / 'backend/package.json').is_file())
            cases = workbook.manual_cases(snapshot / 'docs/testing/manual-test-cases.json')
            self.assertEqual(len(cases), 179, 'Historical validation must use its own checklist, even as current cases grow')
            self.assertFalse((snapshot / 'docs/arkusze/HARBORLIGHT14-zasady.xlsx').exists())
        self.assertFalse(snapshot.exists())
        self.assertEqual((ROOT / 'harborlight-version.js').read_bytes(), current_version)

    def test_full_validation_preserves_current_workbooks_and_report_byte_for_byte(self):
        paths = [workbook.BASE, workbook.OUTPUT, workbook.REPORT]
        before = {path: (digest(path), path.stat().st_mtime_ns) for path in paths}
        result = subprocess.run([
            sys.executable, str(ROOT / 'scripts/build_workbook_v14.py'),
            '--validate-only', '--source-ref', SOURCE_REF,
        ], cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stderr[-3000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['validation'], 'PASS')
        self.assertEqual(report['current_code'], '0.14.0.0')
        self.assertEqual(report['historical_sheets_unchanged'], 88)
        self.assertGreater(report['historical_zip_parts_unchanged'], 88)
        self.assertEqual(report['source_comments_unchanged'], 48)
        self.assertEqual(report['runtime_formula_samples'], 200)
        self.assertEqual(report['sha256'], before[workbook.OUTPUT][0])
        for path in paths:
            self.assertEqual((digest(path), path.stat().st_mtime_ns), before[path], str(path))

    def test_another_game_version_is_still_rejected_for_the_historical_workbook(self):
        before = digest(workbook.OUTPUT), digest(workbook.REPORT)
        with workbook.frozen_source(SOURCE_REF) as snapshot:
            version = snapshot / 'harborlight-version.js'
            version.write_text(version.read_text().replace('0.14.0.0', '0.15.0.0'))
            with self.assertRaisesRegex(AssertionError, 'release Excel 14'):
                workbook.game_facts(cwd=snapshot)
        self.assertEqual((digest(workbook.OUTPUT), digest(workbook.REPORT)), before)


if __name__ == '__main__':
    unittest.main()
