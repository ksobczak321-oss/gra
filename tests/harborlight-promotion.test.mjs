import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  validateCiRun, validateDevRun, validateReceiptArtifact, validateFrontendArtifact, validateReceipt,
  createReceipt, createGitHubApi, checkCi, checkDev, verifyReceipt, main
} from '../infra/google-cloud/promotion.mjs';

const repository = 'ksobczak321-oss/gra';
const repositoryId = 1428128759;
const sourceSha = 'a'.repeat(40);
const digest = `sha256:${'b'.repeat(64)}`;
const frontendArchiveSha256 = 'd'.repeat(64);
const frontendManifestSha256 = 'e'.repeat(64);
const prefix = 'europe-central2-docker.pkg.dev/harborlight-dev/harborlight/api';
const expected = { repository, repositoryId, sourceSha, devRunId: 100, devRunAttempt: 2, devImagePrefix: prefix };
const repo = { id: repositoryId, full_name: repository };
const run = overrides => ({
  id: 90, run_attempt: 1, repository: repo, head_repository: repo, head_sha: sourceSha,
  path: '.github/workflows/ci.yml', head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success',
  ...overrides
});
const devRun = overrides => run({ id: 100, run_attempt: 2, path: '.github/workflows/google-cloud-dev.yml', event: 'workflow_dispatch', ...overrides });
const receipt = () => createReceipt({ ...expected, sourceImage: `${prefix}@${digest}`, ciRunId: 90, ciRunAttempt: 1, frontendArchiveSha256, frontendManifestSha256 });
const artifact = overrides => ({ id: 300, name: 'harborlight-dev-release-100-2', expired: false, ...overrides });
const frontendArtifact = overrides => ({ id: 400, name: 'harborlight-dev-frontend-100-2', expired: false, ...overrides });

test('CI permits only a successful push on main for the exact source and repository', () => {
  assert.deepEqual(validateCiRun(run(), expected), { sourceSha, runId: 90, runAttempt: 1 });
  for (const change of [
    { repository: { ...repo, id: 1 } }, { head_repository: { ...repo, full_name: 'attacker/gra' } },
    { path: '.github/workflows/other.yml' }, { event: 'workflow_dispatch' }, { head_branch: 'feature' },
    { head_sha: 'c'.repeat(40) }, { status: 'in_progress' }, { conclusion: 'failure' },
    { id: 0 }, { run_attempt: 0 }
  ]) assert.throws(() => validateCiRun(run(change), expected), undefined, JSON.stringify(change));
});

test('DEV authorization rejects wrong workflows and binds receipt name to the exact attempt', () => {
  const result = validateDevRun(devRun(), expected);
  assert.equal(result.artifactName, 'harborlight-dev-release-100-2');
  assert.equal(result.frontendArtifactName, 'harborlight-dev-frontend-100-2');
  for (const change of [
    { path: '.github/workflows/google-cloud-prod.yml' }, { event: 'push' }, { head_branch: 'other' },
    { conclusion: 'cancelled' }, { status: 'queued' }, { head_sha: 'short' }
  ]) assert.throws(() => validateDevRun(devRun(change), expected));
});

test('missing, stale-attempt, duplicate, expired and foreign artifacts fail closed', () => {
  const dev = validateDevRun(devRun(), expected);
  assert.equal(validateReceiptArtifact([artifact()], dev).id, 300);
  for (const artifacts of [
    [], [artifact({ name: 'harborlight-dev-release-100-1' })], [artifact(), artifact({ id: 301 })],
    [artifact({ expired: true })], [artifact({ workflow_run: { id: 101, head_sha: sourceSha } })],
    [artifact({ workflow_run: { id: 100, head_sha: 'c'.repeat(40) } })]
  ]) assert.throws(() => validateReceiptArtifact(artifacts, dev));
});

test('receipt promotes the exact digest, source commit and successful CI/DEV identities', () => {
  assert.deepEqual(validateReceipt(receipt(), expected), {
    sourceSha, sourceImage: `${prefix}@${digest}`, imageDigest: digest, ciRunId: 90, ciRunAttempt: 1,
    frontendArtifactName: 'harborlight-dev-frontend-100-2', frontendArchiveSha256, frontendManifestSha256
  });
  for (const mutate of [
    value => { value.schema_version = 0; }, value => { value.schema_version = 1; }, value => { value.repository_id = 1; },
    value => { value.repository = 'attacker/gra'; }, value => { value.source_sha = 'c'.repeat(40); },
    value => { value.dev.run_id = 101; }, value => { value.dev.run_attempt = 1; },
    value => { value.image.uri = `${prefix}:latest`; },
    value => { value.image.uri = value.image.uri.replace('/harborlight-dev/', '/harborlight-prod/'); },
    value => { value.image.digest = `sha256:${'c'.repeat(64)}`; },
    value => { value.checks.dev_smoke = false; }, value => { value.checks.frontend_smoke = false; },
    value => { delete value.ci; }, value => { delete value.frontend; },
    value => { value.frontend.artifact_name = 'harborlight-dev-frontend-100-1'; },
    value => { value.frontend.site = 'harborlight-prod'; },
    value => { value.frontend.url = 'https://attacker.example'; },
    value => { value.frontend.archive_sha256 = 'latest'; },
    value => { value.frontend.manifest_sha256 = 'E'.repeat(64); }
  ]) {
    const altered = receipt();
    mutate(altered);
    assert.throws(() => validateReceipt(altered, expected));
  }
  assert.throws(() => validateReceipt({}, expected), /current DEV release receipt/);
});

test('CI lookup ignores unrelated successes and rejects a list without a matching success', async () => {
  assert.equal((await checkCi({ listCiRuns: async () => [run({ head_sha: 'c'.repeat(40) }), run()] }, expected)).runId, 90);
  await assert.rejects(checkCi({ listCiRuns: async () => [run({ conclusion: 'failure' })] }, expected), /No successful CI/);
});

test('DEV check verifies artifact availability instead of trusting only a green workflow', async () => {
  const api = { getRun: async () => devRun(), listArtifacts: async () => [artifact(), frontendArtifact()] };
  assert.equal((await checkDev(api, expected)).sourceSha, sourceSha);
  await assert.rejects(checkDev({ ...api, listArtifacts: async () => [] }, expected), /Exactly one receipt/);
  await assert.rejects(checkDev({ ...api, listArtifacts: async () => [artifact()] }, expected), /Exactly one frontend bundle/);
});

test('frontend bundle evidence requires the matching DEV attempt and an available unique artifact', async () => {
  const dev = validateDevRun(devRun(), expected);
  assert.equal(validateFrontendArtifact([frontendArtifact()], dev).id, 400);
  for (const artifacts of [
    [], [frontendArtifact({ name: 'harborlight-dev-frontend-100-1' })],
    [frontendArtifact(), frontendArtifact({ id: 401 })], [frontendArtifact({ expired: true })],
    [frontendArtifact({ workflow_run: { id: 101, head_sha: sourceSha } })],
    [frontendArtifact({ workflow_run: { id: 100, head_sha: 'c'.repeat(40) } })]
  ]) {
    assert.throws(() => validateFrontendArtifact(artifacts, dev));
    await assert.rejects(checkDev({ getRun: async () => devRun(), listArtifacts: async () => [artifact(), ...artifacts] }, expected));
  }
});

test('legacy API-only evidence cannot authorize a complete game promotion', async () => {
  const legacy = receipt();
  legacy.schema_version = 1;
  delete legacy.frontend;
  delete legacy.checks.frontend_smoke;
  assert.throws(() => validateReceipt(legacy, expected), /current DEV release receipt/);
  await assert.rejects(verifyReceipt({ getRun: async () => run() }, legacy, expected), /current DEV release receipt/);
});

test('account APIs cannot first become active on PROD without upstream runtime evidence', () => {
  assert.throws(() => validateReceipt(receipt(), { ...expected, requireAccountApi: true }), /verified on PRE-PROD/);
  const verified = createReceipt({ ...expected, sourceImage: `${prefix}@${digest}`, ciRunId: 90, ciRunAttempt: 1, frontendArchiveSha256, frontendManifestSha256, accountApi: true });
  assert.equal(validateReceipt(verified, { ...expected, requireAccountApi: true }).sourceSha, sourceSha);
  for (const value of [false, 'true', 1, null]) {
    const altered=structuredClone(verified);altered.checks.account_api=value;
    assert.throws(() => validateReceipt(altered, { ...expected, requireAccountApi: true }), /verified on PRE-PROD/);
  }
});

test('production revalidates the receipt CI run and refuses rerun/failed/different-commit evidence', async () => {
  assert.equal((await verifyReceipt({ getRun: async () => run() }, receipt(), expected)).imageDigest, digest);
  for (const change of [{ run_attempt: 2 }, { conclusion: 'failure' }, { head_sha: 'c'.repeat(40) }, { event: 'pull_request' }]) {
    await assert.rejects(verifyReceipt({ getRun: async () => run(change) }, receipt(), expected));
  }
});

test('API requests use fixed official origin, bounded waits and never follow redirects with tokens', async () => {
  const seen = [];
  const api = createGitHubApi({ token: 'fake-secret', repository, fetchImpl: async (url, options) => {
    seen.push({ url, options });
    return new Response(JSON.stringify(run()), { status: 200 });
  } });
  assert.equal((await api.getRun(90)).id, 90);
  assert.equal(seen[0].url.origin, 'https://api.github.com');
  assert.equal(seen[0].url.pathname, `/repos/${repository}/actions/runs/90`);
  assert.equal(seen[0].options.redirect, 'error');
  assert.ok(seen[0].options.signal instanceof AbortSignal);
  await assert.rejects(api.getRun('90/../other'), /Invalid run ID/);
  assert.equal(seen.length, 1);
  assert.throws(() => createGitHubApi({ token: 'fake', repository: '../another' }), /Invalid repository/);
});

test('HTTP errors, network errors, malformed JSON and mismatched API run IDs block promotion', async () => {
  for (const fetchImpl of [
    async () => new Response('{}', { status: 403 }),
    async () => { throw new Error('secret fake-token must not leak'); },
    async () => new Response('not JSON', { status: 200 }),
    async () => new Response(JSON.stringify(run({ id: 91 })), { status: 200 })
  ]) {
    const api = createGitHubApi({ token: 'fake-token', repository, fetchImpl });
    await assert.rejects(api.getRun(90), error => !error.message.includes('fake-token'));
  }
});

test('pagination checks every artifact page and catches duplicate current receipts across pages', async () => {
  let pages = 0;
  const api = createGitHubApi({ token: 'fake-token', repository, fetchImpl: async url => {
    pages++;
    const page = Number(url.searchParams.get('page'));
    const artifacts = page === 1 ? [artifact(), ...Array.from({ length: 99 }, (_, i) => artifact({ id: i + 1000, name: `other-${i}` }))] : [artifact({ id: 301 })];
    return new Response(JSON.stringify({ artifacts }), { status: 200 });
  } });
  const artifacts = await api.listArtifacts(100);
  assert.equal(pages, 2);
  assert.throws(() => validateReceiptArtifact(artifacts, validateDevRun(devRun(), expected)), /Exactly one receipt/);
});

test('CLI receipt creation and verification round trip uses the tested release SHA, not control workflow HEAD', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'harborlight-promotion-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const receiptPath = path.join(directory, 'receipt.json');
  const output = path.join(directory, 'output');
  const env = {
    GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_ID: String(repositoryId), GITHUB_SHA: 'c'.repeat(40),
    HARBORLIGHT_SOURCE_SHA: sourceSha, HARBORLIGHT_SOURCE_IMAGE: `${prefix}@${digest}`,
    HARBORLIGHT_CI_RUN_ID: '90', HARBORLIGHT_CI_RUN_ATTEMPT: '1', GITHUB_RUN_ID: '100', GITHUB_RUN_ATTEMPT: '2',
    HARBORLIGHT_FRONTEND_ARCHIVE_SHA256: frontendArchiveSha256, HARBORLIGHT_FRONTEND_MANIFEST_SHA256: frontendManifestSha256,
    HARBORLIGHT_DEV_RUN_ID: '100', HARBORLIGHT_DEV_RUN_ATTEMPT: '2', HARBORLIGHT_DEV_IMAGE_PREFIX: prefix,
    HARBORLIGHT_RECEIPT_PATH: receiptPath, GITHUB_OUTPUT: output, GITHUB_TOKEN: 'fake-token'
  };
  await main('write-receipt', env);
  const written = JSON.parse(await readFile(receiptPath, 'utf8'));
  assert.equal(written.source_sha, sourceSha);
  assert.equal(written.schema_version, 2);
  assert.deepEqual(written.frontend, {
    artifact_name: 'harborlight-dev-frontend-100-2', archive_sha256: frontendArchiveSha256,
    manifest_sha256: frontendManifestSha256, site: 'harborlight-dev', url: 'https://harborlight-dev.web.app'
  });
  await main('verify-receipt', env, async () => new Response(JSON.stringify(run()), { status: 200 }));
  assert.equal(await readFile(output, 'utf8'), `source_sha=${sourceSha}\nsource_image=${prefix}@${digest}\nimage_digest=${digest}\nci_run_id=90\nfrontend_artifact_name=harborlight-dev-frontend-100-2\nfrontend_archive_sha256=${frontendArchiveSha256}\nfrontend_manifest_sha256=${frontendManifestSha256}\n`);
  await assert.rejects(main('write-receipt', env), /EEXIST/);
});

test('CLI CI gate writes the exact successful run identity to workflow outputs', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'harborlight-ci-gate-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'output');
  const env = {
    GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_ID: String(repositoryId), GITHUB_SHA: sourceSha,
    GITHUB_OUTPUT: output, GITHUB_TOKEN: 'fake-token'
  };
  await main('check-ci', env, async url => {
    assert.equal(url.searchParams.get('head_sha'), sourceSha);
    assert.equal(url.searchParams.get('event'), 'push');
    assert.equal(url.searchParams.get('branch'), 'main');
    return new Response(JSON.stringify({ workflow_runs: [run()] }), { status: 200 });
  });
  assert.equal(await readFile(output, 'utf8'), `ci_run_id=90\nci_run_attempt=1\nsource_sha=${sourceSha}\n`);
});

test('CLI DEV gate selects an earlier tested release and its attempt-specific receipt', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'harborlight-dev-gate-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'output');
  const env = {
    GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_ID: String(repositoryId), GITHUB_SHA: 'c'.repeat(40),
    HARBORLIGHT_DEV_RUN_ID: '100', GITHUB_OUTPUT: output, GITHUB_TOKEN: 'fake-token'
  };
  const requests = [];
  await main('check-dev', env, async url => {
    requests.push(url.pathname);
    return new Response(JSON.stringify(url.pathname.endsWith('/artifacts') ? { artifacts: [artifact(), frontendArtifact()] } : devRun()), { status: 200 });
  });
  assert.equal(requests.length, 2);
  assert.equal(await readFile(output, 'utf8'), `dev_run_id=100\ndev_run_attempt=2\nsource_sha=${sourceSha}\nartifact_name=harborlight-dev-release-100-2\nfrontend_artifact_name=harborlight-dev-frontend-100-2\n`);
});

test('CLI refuses creating receipt without both frontend content digests', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'harborlight-incomplete-frontend-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const receiptPath = path.join(directory, 'receipt.json');
  const env = {
    GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_ID: String(repositoryId), GITHUB_SHA: sourceSha,
    HARBORLIGHT_SOURCE_IMAGE: `${prefix}@${digest}`, HARBORLIGHT_CI_RUN_ID: '90', HARBORLIGHT_CI_RUN_ATTEMPT: '1',
    GITHUB_RUN_ID: '100', GITHUB_RUN_ATTEMPT: '2', HARBORLIGHT_RECEIPT_PATH: receiptPath
  };
  for (const hashes of [{}, { HARBORLIGHT_FRONTEND_ARCHIVE_SHA256: frontendArchiveSha256 },
    { HARBORLIGHT_FRONTEND_MANIFEST_SHA256: frontendManifestSha256 }]) {
    await assert.rejects(main('write-receipt', { ...env, ...hashes }), /SHA-256 frontend/);
    await assert.rejects(readFile(receiptPath), /ENOENT/);
  }
});
