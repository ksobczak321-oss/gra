import assert from 'node:assert/strict';
import test from 'node:test';
import { createUrgentApi, dispatchUrgent, eligibleCi, MARKER, REPOSITORY, REPOSITORY_ID } from '../infra/google-cloud/urgent-preprod-dispatch.mjs';

const sourceSha = 'a'.repeat(40);
const identity = { repository: REPOSITORY, repositoryId: String(REPOSITORY_ID) };
const repository = { id: REPOSITORY_ID, full_name: REPOSITORY };
const ci = overrides => ({ id: 123, run_attempt: 1, workflow_id: 456, name: 'Validate HARBORLIGHT source', path: '.github/workflows/ci.yml',
  repository, head_repository: repository, head_sha: sourceSha, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success', ...overrides });
const event = overrides => ({ action: 'completed', workflow_run: ci(overrides) });
const deployment = overrides => ({ id: 789, repository, head_repository: repository, head_sha: sourceSha, head_branch: 'main',
  path: '.github/workflows/google-cloud-dev.yml', event: 'workflow_dispatch', status: 'queued', ...overrides });
function fixture(overrides = {}) {
  const calls = [];
  const api = {
    getRun: async id => { calls.push(['run', id]); return ci(); },
    getWorkflow: async id => { calls.push(['workflow', id]); return { id: 456, path: '.github/workflows/ci.yml', name: 'Validate HARBORLIGHT source', state: 'active' }; },
    getCommit: async sha => { calls.push(['commit', sha]); return { sha: sourceSha, commit: { message: `Fix language ${MARKER}` } }; },
    listDeploymentRuns: async sha => { calls.push(['deployments', sha]); return []; },
    getMain: async () => { calls.push(['main']); return { ref: 'refs/heads/main', object: { type: 'commit', sha: sourceSha } }; },
    dispatch: async () => { calls.push(['dispatch']); },
    ...overrides
  };
  return { api, calls };
}

test('urgent dispatch requires the trusted successful push and exact active CI workflow', async () => {
  const { api, calls } = fixture();
  assert.deepEqual(await dispatchUrgent(api, event(), identity), { dispatched: true, sourceSha, workflow: '.github/workflows/google-cloud-dev.yml' });
  assert.deepEqual(calls.slice(-2), [['main'], ['dispatch']]);
  for (const change of [
    { conclusion: 'failure' }, { status: 'in_progress' }, { event: 'pull_request' }, { event: 'workflow_dispatch' },
    { head_branch: 'feature' }, { repository: { ...repository, id: 1 } }, { head_repository: { ...repository, full_name: 'fork/gra' } },
    { path: '.github/workflows/other.yml' }, { name: 'Fake CI' }, { head_sha: 'short' }, { workflow_id: 0 }
  ]) assert.throws(() => eligibleCi(ci(change), identity));
  assert.throws(() => eligibleCi(ci(), { ...identity, repositoryId: 1 }));
  assert.throws(() => eligibleCi(ci(), { ...identity, repository: 'fork/gra' }));
});

test('fresh CI and workflow metadata must agree with the event and attempt', async () => {
  for (const changed of [ci({ run_attempt: 2 }), ci({ head_sha: 'b'.repeat(40) }), ci({ workflow_id: 457 }), ci({ conclusion: 'failure' })]) {
    const { api, calls } = fixture({ getRun: async () => changed });
    await assert.rejects(dispatchUrgent(api, event(), identity));
    assert.ok(!calls.some(c => c[0] === 'dispatch'));
  }
  for (const changed of [{ id: 456, path: '.github/workflows/other.yml', name: 'Validate HARBORLIGHT source', state: 'active' },
    { id: 999, path: '.github/workflows/ci.yml', name: 'Validate HARBORLIGHT source', state: 'active' }]) {
    const { api } = fixture({ getWorkflow: async () => changed });
    await assert.rejects(dispatchUrgent(api, event(), identity), /workflow ID/);
  }
  await assert.rejects(dispatchUrgent(fixture().api, { ...event(), action: 'requested' }, identity));
});

test('only the exact urgent marker in the API-read source commit can request promotion', async () => {
  for (const message of ['Ordinary update', '[preprod:0.9.1.3]', '[preprod:0.9.1.20]']) {
    const { api, calls } = fixture({ getCommit: async () => ({ sha: sourceSha, commit: { message } }) });
    assert.equal((await dispatchUrgent(api, event(), identity)).reason, 'no-urgent-marker');
    assert.ok(!calls.some(c => ['main', 'dispatch'].includes(c[0])));
  }
  const { api } = fixture({ getCommit: async () => ({ sha: 'b'.repeat(40), commit: { message: MARKER } }) });
  await assert.rejects(dispatchUrgent(api, event(), identity), /source commit/);
});

test('known movement of main blocks dispatch after successful CI and duplicate lookup', async () => {
  const { api, calls } = fixture({ getMain: async () => { calls.push(['main']); return { ref: 'refs/heads/main', object: { type: 'commit', sha: 'b'.repeat(40) } }; } });
  assert.equal((await dispatchUrgent(api, event(), identity)).reason, 'main-moved');
  assert.ok(!calls.some(c => c[0] === 'dispatch'));
});

test('any previous same-source deployment prevents a duplicate, even failed or cancelled', async () => {
  for (const status of ['queued', 'in_progress', 'completed']) {
    const { api, calls } = fixture({ listDeploymentRuns: async () => [deployment({ status, conclusion: 'failure' })] });
    assert.equal((await dispatchUrgent(api, event(), identity)).reason, 'deployment-already-exists');
    assert.ok(!calls.some(c => c[0] === 'dispatch'));
  }
  let previous = [];
  const { api, calls } = fixture({ listDeploymentRuns: async () => previous, dispatch: async () => { calls.push(['dispatch']); previous = [deployment()]; } });
  assert.equal((await dispatchUrgent(api, event(), identity)).dispatched, true);
  assert.equal((await dispatchUrgent(api, event(), identity)).dispatched, false);
  assert.equal(calls.filter(c => c[0] === 'dispatch').length, 1);
});

test('malformed or foreign deployment lookup fails closed', async () => {
  for (const value of [null, [deployment({ repository: { ...repository, id: 1 } })], [deployment({ head_repository: null })], [deployment({ path: '.github/workflows/google-cloud-prod.yml' })]]) {
    const { api, calls } = fixture({ listDeploymentRuns: async () => value });
    await assert.rejects(dispatchUrgent(api, event(), identity));
    assert.ok(!calls.some(c => c[0] === 'dispatch'));
  }
});

test('API deployment lookup paginates and finds a prior attempt beyond the first page', async () => {
  const calls = [];
  const api = createUrgentApi('test-placeholder', async (url, options) => {
    calls.push([url, options]);
    return { ok: true, json: async () => ({ workflow_runs: url.endsWith('page=1') ? Array.from({ length: 100 }, (_, i) => deployment({ id: i + 1, head_sha: 'b'.repeat(40) })) : [deployment()] }) };
  });
  const found = await api.listDeploymentRuns(sourceSha);
  assert.equal(found.length, 101);
  assert.equal(found[100].id, 789);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(([url]) => url.startsWith(`https://api.github.com/repos/${REPOSITORY}/actions/workflows/google-cloud-dev.yml/runs?head_sha=${sourceSha}`)));
});

test('pagination is bounded and malformed pages never permit dispatch', async () => {
  let requests = 0;
  const api = createUrgentApi('test-placeholder', async () => { requests++; return { ok: true, json: async () => ({ workflow_runs: Array.from({ length: 100 }, () => deployment()) }) }; });
  await assert.rejects(api.listDeploymentRuns(sourceSha), /bounded pagination/);
  assert.equal(requests, 10);
  const malformed = createUrgentApi('test-placeholder', async () => ({ ok: true, json: async () => ({ workflow_runs: 'bad' }) }));
  await assert.rejects(malformed.listDeploymentRuns(sourceSha), /Invalid deployment page/);
});

test('dispatch uses only the fixed existing workflow and ref main, with no write retry', async () => {
  const requests = [];
  const api = createUrgentApi('test-placeholder', async (url, options) => { requests.push([url, options]); return { ok: true, status: 204 }; });
  await api.dispatch();
  assert.equal(requests.length, 1);
  assert.equal(requests[0][0], `https://api.github.com/repos/${REPOSITORY}/actions/workflows/google-cloud-dev.yml/dispatches`);
  assert.equal(requests[0][1].method, 'POST');
  assert.deepEqual(JSON.parse(requests[0][1].body), { ref: 'main' });
  assert.equal(requests[0][1].redirect, 'error');
  let failures = 0;
  const uncertain = createUrgentApi('test-placeholder', async () => { failures++; throw new Error('Connection lost after send'); });
  await assert.rejects(uncertain.dispatch(), /Do not automatically retry/);
  assert.equal(failures, 1);
});
