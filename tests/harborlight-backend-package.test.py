"""Check the isolated Docker application payload without Docker or cloud access."""
import fnmatch
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / 'backend'


def context_files():
    """Model the deliberately restricted deny-all, literal-root allowlist."""
    rules = [line.strip() for line in (BACKEND / '.dockerignore').read_text().splitlines()
             if line.strip() and not line.strip().startswith('#')]
    if not rules or rules[0] != '*':
        raise AssertionError('The API Docker context must exclude files by default.')
    allowed = set()
    for rule in rules[1:]:
        if not re.fullmatch(r'![A-Za-z0-9][A-Za-z0-9_.-]*', rule):
            raise AssertionError('Review context changes beyond explicit root filenames.')
        name = rule[1:]
        source = BACKEND / name
        if not source.is_file() or source.is_symlink():
            raise AssertionError(f'Allowed context file is missing or unsafe: {name}')
        allowed.add(name)
    return allowed


def application_files(context):
    """Apply the Dockerfile's single root COPY to the filtered context."""
    copies = [shlex.split(line) for line in (BACKEND / 'Dockerfile').read_text().splitlines()
              if line.strip().upper().startswith('COPY ')]
    if len(copies) != 1:
        raise AssertionError('Review changes to the single application COPY.')
    arguments = [value for value in copies[0][1:] if not value.startswith('--chown=')]
    if arguments[-1] != './' or any('/' in value for value in arguments[:-1]):
        raise AssertionError('Review changes beyond root application files.')
    return {name for name in context
            if any(fnmatch.fnmatchcase(name, pattern) for pattern in arguments[:-1])}


class BackendPackageTests(unittest.TestCase):
    def test_context_excludes_tests_and_private_files(self):
        context = context_files()
        self.assertTrue(context <= {'Dockerfile', 'package.json', 'server.mjs',
                                   'account-service.mjs', 'firebase-auth.mjs',
                                   'firestore-store.mjs', 'retention.mjs'})
        for private in ['test/server.test.mjs', '.env', 'gha-creds-example.json',
                        'private.mjs', 'node_modules/dependency/index.mjs']:
            self.assertNotIn(private, context)

    def test_filtered_application_resolves_imports_and_serves_probes(self):
        with tempfile.TemporaryDirectory(prefix='harborlight-backend-package-') as directory:
            package = Path(directory)
            for name in application_files(context_files()):
                shutil.copyfile(BACKEND / name, package / name)
            script = """
                import assert from 'node:assert/strict';
                import { once } from 'node:events';
                import { readdirSync } from 'node:fs';
                const localFetch = globalThis.fetch;
                globalThis.fetch = () => { throw new Error('Cloud requests are disabled'); };
                for (const file of readdirSync('.').filter(file => file.endsWith('.mjs'))) {
                  await import('./' + file);
                }
                const { createServer } = await import('./server.mjs');
                const server = createServer();
                server.listen(0, '127.0.0.1');
                await once(server, 'listening');
                try {
                  for (const endpoint of ['health', 'ready']) {
                    const response = await localFetch(`http://127.0.0.1:${server.address().port}/${endpoint}`);
                    assert.equal(response.status, 200);
                    const body = await response.json();
                    assert.equal(body.status, 'ok');
                    assert.equal(body.service, 'harborlight-api');
                    assert.equal(body.release, 'packaging-test');
                  }
                } finally {
                  await new Promise(resolve => server.close(resolve));
                }
            """
            environment = {**os.environ, 'HARBORLIGHT_ACCOUNT_API': '0',
                           'HARBORLIGHT_ENV': 'development',
                           'HARBORLIGHT_RELEASE': 'packaging-test'}
            result = subprocess.run(['node', '--input-type=module', '-e', script],
                                    cwd=package, env=environment, capture_output=True,
                                    text=True, timeout=15)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main(verbosity=2)
