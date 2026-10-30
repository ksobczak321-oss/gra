import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const CI_PATH = '.github/workflows/ci.yml';
const DEV_PATH = '.github/workflows/google-cloud-dev.yml';
const DEV_FRONTEND_SITE = 'harborlight-dev';
const DEV_FRONTEND_URL = 'https://harborlight-dev.web.app';
const fail = message => { throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validRepository = value => typeof value === 'string' &&
  /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(value) &&
  !['.', '..'].includes(value.split('/')[1]);

function positiveInteger(value, name) {
  if (!['number', 'string'].includes(typeof value) || !/^[1-9][0-9]*$/.test(String(value))) fail(`Invalid ${name}.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number)) fail(`Invalid ${name}.`);
  return number;
}

function sha(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value)) fail('A full source commit SHA is required.');
  return value;
}

function sha256(value, name) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail(`A full SHA-256 ${name} is required.`);
  return value;
}

function identity({ repository, repositoryId }) {
  if (!validRepository(repository)) {
    fail('Invalid repository.');
  }
  return { repository, repositoryId: positiveInteger(repositoryId, 'repository ID') };
}

function sameRepository(value, expected) {
  return object(value) && value.full_name?.toLowerCase() === expected.repository.toLowerCase() &&
    value.id === expected.repositoryId;
}

function validateRun(run, options, workflow, event) {
  const expected = identity(options);
  if (!object(run) || !sameRepository(run.repository, expected) || !sameRepository(run.head_repository, expected)) {
    fail('Workflow run belongs to another repository.');
  }
  if (run.path !== workflow || run.event !== event || run.head_branch !== 'main') {
    fail('Workflow, event or branch does not match the required promotion stage.');
  }
  if (run.status !== 'completed' || run.conclusion !== 'success') fail('Required workflow run has not succeeded.');
  const sourceSha = sha(run.head_sha);
  if (options.sourceSha !== undefined && sourceSha !== sha(options.sourceSha)) fail('Workflow tested another commit.');
  return {
    sourceSha,
    runId: positiveInteger(run.id, 'run ID'),
    runAttempt: positiveInteger(run.run_attempt, 'run attempt')
  };
}

export function validateCiRun(run, options) {
  return validateRun(run, options, CI_PATH, 'push');
}

export function validateDevRun(run, options) {
  const result = validateRun(run, options, DEV_PATH, 'workflow_dispatch');
  return {
    ...result,
    artifactName: `harborlight-dev-release-${result.runId}-${result.runAttempt}`,
    frontendArtifactName: `harborlight-dev-frontend-${result.runId}-${result.runAttempt}`
  };
}

function validateArtifact(artifacts, dev, name, label) {
  if (!Array.isArray(artifacts)) fail('Invalid DEV artifact response.');
  const matches = artifacts.filter(artifact => artifact?.name === name);
  if (matches.length !== 1) fail(`Exactly one ${label} from the successful DEV attempt is required.`);
  const artifact = matches[0];
  positiveInteger(artifact.id, 'artifact ID');
  if (artifact.expired !== false) fail(`DEV ${label} has expired.`);
  if (artifact.workflow_run && (artifact.workflow_run.id !== dev.runId ||
      artifact.workflow_run.head_sha !== dev.sourceSha)) fail(`${label} artifact belongs to another DEV run.`);
  return artifact;
}

export function validateReceiptArtifact(artifacts, dev) {
  return validateArtifact(artifacts, dev, dev.artifactName, 'receipt');
}

export function validateFrontendArtifact(artifacts, dev) {
  return validateArtifact(artifacts, dev, dev.frontendArtifactName, 'frontend bundle');
}

function imageReference(value) {
  if (typeof value !== 'string') fail('An immutable Artifact Registry image is required.');
  const match = value.match(/^([a-z0-9-]+-docker\.pkg\.dev\/[a-z][a-z0-9-]{4,28}[a-z0-9]\/[a-z][a-z0-9_-]*\/[a-z0-9]+(?:[._/-][a-z0-9]+)*)@(sha256:[a-f0-9]{64})$/);
  if (!match) fail('An immutable Artifact Registry image@sha256 digest is required.');
  return { uri: value, prefix: match[1], digest: match[2] };
}

export function validateReceipt(receipt, options) {
  const expected = identity(options);
  if (!object(receipt) || receipt.schema_version !== 2) fail('A current DEV release receipt including the tested frontend is required.');
  if (receipt.repository?.toLowerCase() !== expected.repository.toLowerCase() ||
      receipt.repository_id !== expected.repositoryId) fail('Receipt belongs to another repository.');
  const sourceSha = sha(receipt.source_sha);
  if (sourceSha !== sha(options.sourceSha)) fail('Receipt commit does not match the successful DEV run.');
  if (!object(receipt.dev) || receipt.dev.run_id !== positiveInteger(options.devRunId, 'DEV run ID') ||
      receipt.dev.run_attempt !== positiveInteger(options.devRunAttempt, 'DEV run attempt')) {
    fail('Receipt belongs to another DEV run or attempt.');
  }
  if (!object(receipt.ci)) fail('Receipt has no successful CI reference.');
  const ciRunId = positiveInteger(receipt.ci.run_id, 'CI run ID');
  const ciRunAttempt = positiveInteger(receipt.ci.run_attempt, 'CI run attempt');
  if (!object(receipt.image)) fail('Receipt has no image reference.');
  const image = imageReference(receipt.image.uri);
  if (image.prefix !== options.devImagePrefix || image.digest !== receipt.image.digest) {
    fail('Receipt image is outside the expected DEV repository or has another digest.');
  }
  if (!object(receipt.frontend)) fail('Receipt has no tested frontend bundle.');
  const frontendArtifactName = `harborlight-dev-frontend-${receipt.dev.run_id}-${receipt.dev.run_attempt}`;
  if (receipt.frontend.artifact_name !== frontendArtifactName) fail('Frontend bundle belongs to another DEV run or attempt.');
  if (receipt.frontend.site !== DEV_FRONTEND_SITE || receipt.frontend.url !== DEV_FRONTEND_URL) {
    fail('Frontend was not verified on the required DEV Hosting site.');
  }
  const frontendArchiveSha256 = sha256(receipt.frontend.archive_sha256, 'frontend archive digest');
  const frontendManifestSha256 = sha256(receipt.frontend.manifest_sha256, 'frontend manifest digest');
  if (receipt.checks?.ci !== true || receipt.checks?.dev_smoke !== true || receipt.checks?.frontend_smoke !== true) {
    fail('Receipt is missing successful stage checks.');
  }
  if (options.requireAccountApi === true && receipt.checks?.account_api !== true) {
    fail('The account API must be verified on PRE-PROD before it can be enabled on PROD.');
  }
  return {
    sourceSha, sourceImage: image.uri, imageDigest: image.digest, ciRunId, ciRunAttempt,
    frontendArtifactName, frontendArchiveSha256, frontendManifestSha256
  };
}

export function createReceipt(options) {
  const expected = identity(options);
  const image = imageReference(options.sourceImage);
  const receipt = {
    schema_version: 2,
    repository: expected.repository,
    repository_id: expected.repositoryId,
    source_sha: sha(options.sourceSha),
    ci: {
      run_id: positiveInteger(options.ciRunId, 'CI run ID'),
      run_attempt: positiveInteger(options.ciRunAttempt, 'CI run attempt')
    },
    dev: {
      run_id: positiveInteger(options.devRunId, 'DEV run ID'),
      run_attempt: positiveInteger(options.devRunAttempt, 'DEV run attempt')
    },
    image: { uri: image.uri, digest: image.digest },
    frontend: {
      artifact_name: `harborlight-dev-frontend-${positiveInteger(options.devRunId, 'DEV run ID')}-${positiveInteger(options.devRunAttempt, 'DEV run attempt')}`,
      archive_sha256: sha256(options.frontendArchiveSha256, 'frontend archive digest'),
      manifest_sha256: sha256(options.frontendManifestSha256, 'frontend manifest digest'),
      site: DEV_FRONTEND_SITE,
      url: DEV_FRONTEND_URL
    },
    checks: { ci: true, dev_smoke: true, frontend_smoke: true, account_api: options.accountApi === true }
  };
  validateReceipt(receipt, { ...options, devImagePrefix: image.prefix });
  return receipt;
}

export function createGitHubApi({ token, repository, fetchImpl = fetch }) {
  if (typeof token !== 'string' || !token.trim()) fail('GitHub authentication is required for promotion checks.');
  if (!validRepository(repository)) fail('Invalid repository.');
  const request = async path => {
    // Paths are created by this module, never taken from API-provided URLs.
    const url = new URL(`https://api.github.com/repos/${repository}/${path}`);
    let response;
    try {
      response = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'harborlight-promotion' },
        signal: AbortSignal.timeout(15_000), redirect: 'error'
      });
    } catch {
      fail('GitHub promotion metadata request failed.');
    }
    if (!response.ok) fail(`GitHub promotion metadata request returned HTTP ${response.status}.`);
    let text;
    try {
      text = await response.text();
      if (text.length > 5_000_000) fail('GitHub promotion metadata response is too large.');
      return JSON.parse(text);
    } catch {
      fail('Invalid GitHub promotion metadata response.');
    }
  };
  return {
    getRun: async id => {
      const expected = positiveInteger(id, 'run ID');
      const run = await request(`actions/runs/${expected}`);
      if (run?.id !== expected) fail('GitHub returned another workflow run.');
      return run;
    },
    listCiRuns: async sourceSha => {
      const commit = sha(sourceSha);
      const runs = [];
      for (let page = 1; page <= 10; page++) {
        const query = new URLSearchParams({ head_sha: commit, branch: 'main', event: 'push', status: 'success', per_page: '100', page: String(page) });
        const result = await request(`actions/workflows/ci.yml/runs?${query}`);
        if (!Array.isArray(result?.workflow_runs)) fail('Invalid CI workflow list.');
        runs.push(...result.workflow_runs);
        if (result.workflow_runs.length < 100) return runs;
      }
      fail('Too many CI runs; narrow the release selection.');
    },
    listArtifacts: async runId => {
      const id = positiveInteger(runId, 'run ID');
      const artifacts = [];
      for (let page = 1; page <= 10; page++) {
        const result = await request(`actions/runs/${id}/artifacts?per_page=100&page=${page}`);
        if (!Array.isArray(result?.artifacts)) fail('Invalid DEV artifact list.');
        artifacts.push(...result.artifacts);
        if (result.artifacts.length < 100) return artifacts;
      }
      fail('Too many DEV artifacts to verify safely.');
    }
  };
}

export async function checkCi(api, options) {
  const sourceSha = sha(options.sourceSha);
  const runs = await api.listCiRuns(sourceSha);
  for (const run of runs) {
    try { return validateCiRun(run, { ...options, sourceSha }); } catch { /* Other runs cannot authorize this release. */ }
  }
  fail('No successful CI push on main exists for this exact commit.');
}

export async function checkDev(api, options) {
  const run = await api.getRun(options.devRunId);
  const dev = validateDevRun(run, options);
  const artifacts = await api.listArtifacts(dev.runId);
  validateReceiptArtifact(artifacts, dev);
  validateFrontendArtifact(artifacts, dev);
  return dev;
}

export async function verifyReceipt(api, receipt, options) {
  const release = validateReceipt(receipt, options);
  const ci = validateCiRun(await api.getRun(release.ciRunId), { ...options, sourceSha: release.sourceSha });
  if (ci.runAttempt !== release.ciRunAttempt) fail('CI run attempt does not match the DEV receipt.');
  return release;
}

async function output(values, file) {
  const lines = Object.entries(values).map(([key, value]) => {
    if (!/^[a-z][a-z0-9_]*$/.test(key) || /[\r\n]/.test(String(value))) fail('Invalid promotion output.');
    return `${key}=${value}\n`;
  }).join('');
  if (!file) fail('GITHUB_OUTPUT is required.');
  await appendFile(file, lines);
}

export async function main(command, env = process.env, fetchImpl = fetch) {
  const options = {
    repository: env.GITHUB_REPOSITORY, repositoryId: env.GITHUB_REPOSITORY_ID,
    sourceSha: env.HARBORLIGHT_SOURCE_SHA || env.GITHUB_SHA
  };
  identity(options);
  const api = () => createGitHubApi({ token: env.GITHUB_TOKEN, repository: options.repository, fetchImpl });
  if (command === 'check-ci') {
    const ci = await checkCi(api(), options);
    await output({ ci_run_id: ci.runId, ci_run_attempt: ci.runAttempt, source_sha: ci.sourceSha }, env.GITHUB_OUTPUT);
  } else if (command === 'check-dev') {
    const dev = await checkDev(api(), { ...options, sourceSha: undefined, devRunId: env.HARBORLIGHT_DEV_RUN_ID });
    await output({ dev_run_id: dev.runId, dev_run_attempt: dev.runAttempt, source_sha: dev.sourceSha, artifact_name: dev.artifactName, frontend_artifact_name: dev.frontendArtifactName }, env.GITHUB_OUTPUT);
  } else if (command === 'write-receipt') {
    if (!env.HARBORLIGHT_RECEIPT_PATH) fail('Receipt output path is required.');
    const receipt = createReceipt({
      ...options, sourceImage: env.HARBORLIGHT_SOURCE_IMAGE,
      ciRunId: env.HARBORLIGHT_CI_RUN_ID, ciRunAttempt: env.HARBORLIGHT_CI_RUN_ATTEMPT,
      devRunId: env.GITHUB_RUN_ID, devRunAttempt: env.GITHUB_RUN_ATTEMPT,
      frontendArchiveSha256: env.HARBORLIGHT_FRONTEND_ARCHIVE_SHA256,
      frontendManifestSha256: env.HARBORLIGHT_FRONTEND_MANIFEST_SHA256,
      accountApi: env.HARBORLIGHT_ACCOUNT_API_VERIFIED === 'true'
    });
    await writeFile(env.HARBORLIGHT_RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
  } else if (command === 'verify-receipt') {
    if (!env.HARBORLIGHT_RECEIPT_PATH) fail('Receipt input path is required.');
    const contents = await readFile(env.HARBORLIGHT_RECEIPT_PATH, 'utf8');
    if (contents.length > 65_536) fail('DEV receipt is too large.');
    let receipt;
    try { receipt = JSON.parse(contents); } catch { fail('DEV receipt is not valid JSON.'); }
    const release = await verifyReceipt(api(), receipt, {
      ...options, devRunId: env.HARBORLIGHT_DEV_RUN_ID, devRunAttempt: env.HARBORLIGHT_DEV_RUN_ATTEMPT,
      devImagePrefix: env.HARBORLIGHT_DEV_IMAGE_PREFIX,
      requireAccountApi: env.HARBORLIGHT_REQUIRE_ACCOUNT_API === 'true'
    });
    await output({
      source_sha: release.sourceSha, source_image: release.sourceImage, image_digest: release.imageDigest, ci_run_id: release.ciRunId,
      frontend_artifact_name: release.frontendArtifactName,
      frontend_archive_sha256: release.frontendArchiveSha256,
      frontend_manifest_sha256: release.frontendManifestSha256
    }, env.GITHUB_OUTPUT);
  } else {
    fail('Use check-ci, check-dev, write-receipt or verify-receipt.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv[2]).catch(error => {
    console.error(`Promotion blocked: ${error.message}`);
    process.exitCode = 1;
  });
}
