import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { failureAnnotation, HostedReleaseError, validateExpected, verifyHostedRelease } from '../infra/google-cloud/verify-hosted-release.mjs';

const sha = 'a'.repeat(40);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = { schema_version: 1, commit: sha, files: { 'index.html': { sha256: 'b'.repeat(64), size: 10 } } };
const bytes = Buffer.from(JSON.stringify(manifest));
const options = { expectedSha: sha, expectedDigest: digest(bytes), expectedBytes: bytes };
const response = (value, status = 200) => ({ status, arrayBuffer: async () => Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) });

test('readiness retries a stale HTTP200 manifest and succeeds only on the exact bytes', async () => {
  const requests = [], sleeps = [], observations = [];
  const result = await verifyHostedRelease(options, {
    fetchImpl: async (url, init) => { requests.push([url, init]); return response(requests.length === 1 ? { ...manifest, commit: 'c'.repeat(40) } : bytes); },
    sleep: async ms => sleeps.push(ms), onAttempt: value => observations.push(value)
  });
  assert.equal(result.attempts, 2); assert.deepEqual(result.bytes, bytes);
  assert.deepEqual(sleeps, [3000]); assert.equal(observations[0].state, 'commit-mismatch');
  assert.notEqual(requests[0][0], requests[1][0]);
  for (const [url, init] of requests) {
    assert.equal(new URL(url).origin, 'https://harborlight-dev.web.app');
    assert.equal(new URL(url).searchParams.get('commit'), sha);
    assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
    assert.match(init.headers['Cache-Control'], /no-cache/);
  }
});

test('schema, parse, commit and digest mismatches all remain strict after bounded retries', async () => {
  const cases = [
    [response({ ...manifest, schema_version: 2 }), 'schema-mismatch'],
    [response('not json'), 'invalid-json'],
    [response({ ...manifest, commit: 'c'.repeat(40) }), 'commit-mismatch'],
    [response(Buffer.from(JSON.stringify(manifest) + '\n')), 'digest-mismatch']
  ];
  for (const [remote, classification] of cases) {
    let calls = 0, sleeps = 0;
    await assert.rejects(verifyHostedRelease({ ...options, maxAttempts: 3 }, {
      fetchImpl: async () => { calls++; return remote; }, sleep: async () => { sleeps++; }
    }), error => error instanceof HostedReleaseError && error.state === classification && error.details.attempts === 3);
    assert.equal(calls, 3); assert.equal(sleeps, 2);
  }
});

test('network and HTTP errors can recover without leaking the original error or body', async () => {
  let calls = 0;
  const observed = [];
  const result = await verifyHostedRelease(options, {
    fetchImpl: async () => { calls++; if (calls === 1) throw new Error('secret-token https://example/?secret=hidden'); return calls === 2 ? response('private upstream body', 503) : response(bytes); },
    sleep: async () => {}, onAttempt: item => observed.push(item)
  });
  assert.equal(result.attempts, 3);
  assert.deepEqual(observed.slice(0, 2), [{ attempt: 1, state: 'network-error' }, { attempt: 2, state: 'http-error', httpStatus: 503 }]);
  assert.ok(!JSON.stringify(observed).includes('secret'));
});

test('bad local schema, source, digest, URL or limits fail before any HTTP', async () => {
  for (const change of [
    { expectedSha: 'short' }, { expectedSha: sha + '\n' }, { expectedDigest: 'wrong' }, { expectedDigest: digest(bytes) + '\n' }, { expectedDigest: 'c'.repeat(64) },
    { expectedBytes: Buffer.from('bad json') }, { expectedBytes: Buffer.from(JSON.stringify({ ...manifest, schema_version: 2 })) },
    { expectedBytes: Buffer.from(JSON.stringify({ ...manifest, commit: 'c'.repeat(40) })) },
    { expectedBytes: Buffer.from(JSON.stringify({ ...manifest, files: {} })) },
    { baseUrl: 'https://harborlight-prod.web.app' }, { maxAttempts: 13 }, { delayMs: 3001 }, { requestTimeoutMs: 4001 }, { maxElapsedMs: 85001 }
  ]) {
    let calls = 0;
    await assert.rejects(verifyHostedRelease({ ...options, ...change }, { fetchImpl: async () => { calls++; return response(bytes); } }));
    assert.equal(calls, 0);
  }
  assert.equal(validateExpected(options).commit, sha);
});

test('elapsed budget stops retrying before a further delay or request', async () => {
  let elapsed = 0, calls = 0, sleeps = 0;
  await assert.rejects(verifyHostedRelease({ ...options, maxElapsedMs: 5000 }, {
    fetchImpl: async () => { calls++; elapsed += 1000; return response({ ...manifest, commit: 'c'.repeat(40) }); },
    sleep: async ms => { sleeps++; elapsed += ms; }, now: () => elapsed
  }), error => error.details.attempts === 2);
  assert.equal(calls, 2); assert.equal(sleeps, 1); assert.equal(elapsed, 5000);
});

test('a fetch that never resolves still ends within bounded request attempts', async () => {
  let calls = 0;
  const start = Date.now();
  await assert.rejects(verifyHostedRelease({ ...options, maxAttempts: 2, delayMs: 0, requestTimeoutMs: 5, maxElapsedMs: 100 }, {
    fetchImpl: async () => { calls++; return new Promise(() => {}); }
  }), error => error.state === 'request-timeout' && error.details.attempts === 2);
  assert.equal(calls, 2); assert.ok(Date.now() - start < 1000);
});

test('public annotation prints only validated identifiers, hashes and classification', async () => {
  let failure, calls = 0;
  try {
    await verifyHostedRelease({ ...options, maxAttempts: 2 }, {
      fetchImpl: async () => { calls++; return response({ ...manifest, commit: calls === 1 ? 'c'.repeat(40) : 'secret\n::error malicious https://example/?token=bad' }); },
      sleep: async () => {}
    });
  } catch (error) { failure = error; }
  const annotation = failureAnnotation(failure, options);
  assert.match(annotation, /^::error title=Hosted release readiness failed::state=commit-mismatch;/);
  assert.ok(annotation.includes(`expectedSHA=${sha}`)); assert.ok(annotation.includes('observedSHA256='));
  assert.ok(!annotation.includes('observedSHA='));
  for (const forbidden of ['secret', 'token=', 'https://', 'malicious', '\n']) assert.ok(!annotation.includes(forbidden));
  assert.equal(failureAnnotation(new Error('token=private')), '::error title=Hosted release readiness failed::state=verification-error');
  const newline = failureAnnotation(new HostedReleaseError('bad\n', { observedSha: sha + '\n', observedDigest: digest(bytes) + '\n' }), { expectedSha: sha + '\n' });
  assert.equal(newline, '::error title=Hosted release readiness failed::state=verification-error');
});

test('oversized responses are bounded and cannot become a successful manifest', async () => {
  await assert.rejects(verifyHostedRelease({ ...options, maxAttempts: 1 }, {
    fetchImpl: async () => ({ status: 200, headers: { get: () => '2000000' }, arrayBuffer: async () => { throw new Error('must not read oversized body'); } })
  }), error => error.state === 'response-too-large');
});
