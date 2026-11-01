import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { validateCiRun } from './promotion.mjs';

export const REPOSITORY = 'ksobczak321-oss/gra';
export const REPOSITORY_ID = 1428128759;
export const MARKER = '[preprod:0.9.1.2]';
export const AUTHORIZED_MARKERS = Object.freeze([MARKER, '[preprod:0.10.1.0]', '[preprod:0.11.0.0]']);
const CI_PATH = '.github/workflows/ci.yml';
const CI_NAME = 'Validate HARBORLIGHT source';
const DEPLOY_PATH = '.github/workflows/google-cloud-dev.yml';
const fail = message => { throw new Error(message); };
const positive = value => Number.isSafeInteger(value) && value > 0;
const fullSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const sameRepo = value => value?.full_name === REPOSITORY && value?.id === REPOSITORY_ID;

export function eligibleCi(run, identity) {
  if (identity?.repository !== REPOSITORY || String(identity?.repositoryId) !== String(REPOSITORY_ID)) {
    fail('Dispatcher repository identity does not match the authorized repository.');
  }
  const result = validateCiRun(run, { repository: REPOSITORY, repositoryId: REPOSITORY_ID });
  if (run.name !== CI_NAME || !positive(run.workflow_id)) fail('Unexpected source CI workflow.');
  return result;
}

function validateWorkflow(workflow, id) {
  if (workflow?.id !== id || workflow.path !== CI_PATH || workflow.name !== CI_NAME || workflow.state !== 'active') {
    fail('The source workflow ID does not resolve to the required active CI workflow.');
  }
}

export async function dispatchUrgent(api, event, identity) {
  if (event?.action !== 'completed') fail('Only completed workflow_run events are accepted.');
  const expected = eligibleCi(event.workflow_run, identity);
  // Re-read the run; event payloads and similarly named workflows alone are not evidence.
  const run = await api.getRun(expected.runId);
  const fresh = eligibleCi(run, identity);
  if (fresh.sourceSha !== expected.sourceSha || fresh.runId !== expected.runId ||
      fresh.runAttempt !== expected.runAttempt || run.workflow_id !== event.workflow_run.workflow_id) {
    fail('The fresh CI run does not match the completed event and attempt.');
  }
  validateWorkflow(await api.getWorkflow(run.workflow_id), run.workflow_id);
  const commit = await api.getCommit(fresh.sourceSha);
  if (commit?.sha !== fresh.sourceSha || typeof commit.commit?.message !== 'string') fail('Invalid source commit response.');
  if (!AUTHORIZED_MARKERS.some(marker => commit.commit.message.includes(marker))) {
    return { dispatched: false, reason: 'no-urgent-marker', sourceSha: fresh.sourceSha };
  }

  const deployments = await api.listDeploymentRuns(fresh.sourceSha);
  if (!Array.isArray(deployments)) fail('Invalid deployment lookup.');
  for (const previous of deployments) {
    if (!positive(previous?.id) || !fullSha(previous.head_sha) || !sameRepo(previous.repository) ||
        !sameRepo(previous.head_repository) || previous.path !== DEPLOY_PATH) {
      fail('Untrusted deployment lookup response.');
    }
    if (previous.head_sha === fresh.sourceSha && previous.head_branch === 'main' && previous.event === 'workflow_dispatch') {
      // Any prior attempt, including failed/cancelled, requires an explicit owner retry.
      return { dispatched: false, reason: 'deployment-already-exists', sourceSha: fresh.sourceSha, deploymentRunId: previous.id };
    }
  }
  // Keep this GET immediately adjacent to the POST. GitHub's dispatch API has
  // no expected-SHA precondition: the owner must not move main during this bridge.
  const main = await api.getMain();
  if (main?.ref !== 'refs/heads/main' || main.object?.type !== 'commit' || main.object.sha !== fresh.sourceSha) {
    return { dispatched: false, reason: 'main-moved', sourceSha: fresh.sourceSha };
  }
  await api.dispatch();
  return { dispatched: true, sourceSha: fresh.sourceSha, workflow: DEPLOY_PATH };
}

export function createUrgentApi(token, fetchImpl = globalThis.fetch) {
  if (typeof token !== 'string' || !token.trim()) fail('GitHub automatic workflow token is required.');
  const base = `https://api.github.com/repos/${REPOSITORY}`;
  async function request(path, options = {}) {
    const response = await fetchImpl(base + path, {
      redirect: 'error', signal: AbortSignal.timeout(30000), cache: 'no-store', ...options,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(options.headers || {}) }
    });
    if (!response.ok) fail(`GitHub request failed with HTTP ${response.status}.`);
    return response;
  }
  const get = async path => (await request(path)).json();
  return {
    getRun: id => { if (!positive(id)) fail('Invalid run ID.'); return get(`/actions/runs/${id}`); },
    getWorkflow: id => { if (!positive(id)) fail('Invalid workflow ID.'); return get(`/actions/workflows/${id}`); },
    getCommit: sha => { if (!fullSha(sha)) fail('Invalid commit SHA.'); return get(`/commits/${sha}`); },
    getMain: () => get('/git/ref/heads/main'),
    async listDeploymentRuns(sha) {
      if (!fullSha(sha)) fail('Invalid commit SHA.');
      const found = [];
      for (let page = 1; page <= 10; page++) {
        const response = await get(`/actions/workflows/google-cloud-dev.yml/runs?head_sha=${sha}&per_page=100&page=${page}`);
        if (!Array.isArray(response?.workflow_runs) || response.workflow_runs.length > 100) fail('Invalid deployment page.');
        found.push(...response.workflow_runs);
        if (response.workflow_runs.length < 100) return found;
      }
      fail('Deployment lookup exceeded its bounded pagination; dispatch denied.');
    },
    async dispatch() {
      // Never retry a write with an uncertain outcome. A later owner retry must
      // first inspect the fresh deployment list and the actual resulting SHA.
      try {
        const response = await request('/actions/workflows/google-cloud-dev.yml/dispatches', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: 'main' })
        });
        if (response.status !== 204) fail('Unexpected dispatch response.');
      } catch {
        fail('Dispatch was not confirmed. Do not automatically retry; inspect deployment runs and their source SHA.');
      }
    }
  };
}

export async function main(env = process.env) {
  if (env.GITHUB_EVENT_NAME !== 'workflow_run') fail('This bridge only handles workflow_run.');
  const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'));
  const result = await dispatchUrgent(createUrgentApi(env.GITHUB_TOKEN), event, {
    repository: env.HARBORLIGHT_REPOSITORY, repositoryId: env.HARBORLIGHT_REPOSITORY_ID
  });
  console.log(JSON.stringify(result));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
