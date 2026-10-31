import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const BASE_URL = 'https://harborlight-dev.web.app';
// Unlike JavaScript's $, this end assertion does not accept a trailing newline.
const SHA = /^[a-f0-9]{40}(?![\s\S])/;
const DIGEST = /^[a-f0-9]{64}(?![\s\S])/;
const MAX_BYTES = 1024 * 1024;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export class HostedReleaseError extends Error {
  constructor(state, details = {}) {
    super(`Hosted release verification failed: ${state}`);
    this.name = 'HostedReleaseError'; this.state = state; this.details = details;
  }
}
const fail = (state, details) => { throw new HostedReleaseError(state, details); };

export function validateExpected({ expectedBytes, expectedSha, expectedDigest, baseUrl = BASE_URL }) {
  if (!SHA.test(expectedSha || '') || !DIGEST.test(expectedDigest || '') || baseUrl !== BASE_URL ||
      !Buffer.isBuffer(expectedBytes) || !expectedBytes.length || expectedBytes.length > MAX_BYTES) fail('invalid-local-configuration');
  let manifest;
  try { manifest = JSON.parse(expectedBytes.toString('utf8')); } catch { fail('invalid-local-json'); }
  if (!object(manifest) || manifest.schema_version !== 1 || manifest.commit !== expectedSha ||
      !object(manifest.files) || !Object.keys(manifest.files).length ||
      Object.entries(manifest.files).some(([name, value]) => !name || name.startsWith('/') || name.split('/').includes('..') ||
        !object(value) || !DIGEST.test(value.sha256 || '') || !Number.isSafeInteger(value.size) || value.size < 0)) {
    fail('invalid-local-manifest');
  }
  if (hash(expectedBytes) !== expectedDigest) fail('local-digest-mismatch');
  return manifest;
}

async function bodyBytes(response) {
  const length = response.headers?.get?.('content-length');
  if (length && /^\d+$/.test(length) && Number(length) > MAX_BYTES) fail('response-too-large');
  if (!response.body?.getReader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_BYTES) fail('response-too-large');
    return bytes;
  }
  const reader = response.body.getReader(); const parts = []; let lengthRead = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return Buffer.concat(parts, lengthRead);
      lengthRead += value.byteLength;
      if (lengthRead > MAX_BYTES) { await reader.cancel(); fail('response-too-large'); }
      parts.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
}

async function attemptRead(fetchImpl, url, timeoutMs, expectedSha, expectedDigest) {
  const controller = new AbortController(); let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImpl(url, { redirect: 'error', cache: 'no-store', signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' } });
        if (response.status !== 200) return { state: 'http-error', ...(Number.isInteger(response.status) && response.status >= 100 && response.status <= 599 ? { httpStatus: response.status } : {}) };
        const bytes = await bodyBytes(response); const observedDigest = hash(bytes); let manifest;
        try { manifest = JSON.parse(bytes.toString('utf8')); } catch { return { state: 'invalid-json', observedDigest, httpStatus: 200 }; }
        const observedSha = SHA.test(manifest?.commit || '') ? manifest.commit : undefined;
        const observation = { observedDigest, httpStatus: 200, ...(observedSha ? { observedSha } : {}) };
        if (!object(manifest) || manifest.schema_version !== 1) return { state: 'schema-mismatch', ...observation };
        if (manifest.commit !== expectedSha) return { state: 'commit-mismatch', ...observation };
        if (observedDigest !== expectedDigest) return { state: 'digest-mismatch', ...observation };
        return { state: 'ready', ...observation, bytes };
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new HostedReleaseError('request-timeout')); }, timeoutMs); })
    ]);
  } catch (error) {
    return { state: error instanceof HostedReleaseError ? error.state : controller.signal.aborted ? 'request-timeout' : 'network-error' };
  } finally { clearTimeout(timer); controller.abort(); }
}

export async function verifyHostedRelease(options, dependencies = {}) {
  validateExpected(options); // Local corruption/configuration never makes an HTTP request.
  const { fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now, onAttempt = () => {} } = dependencies;
  const { expectedSha, expectedDigest, maxAttempts = 12, delayMs = 3000, requestTimeoutMs = 4000, maxElapsedMs = 85000 } = options;
  for (const [value, min, max] of [[maxAttempts, 1, 12], [delayMs, 0, 3000], [requestTimeoutMs, 1, 4000], [maxElapsedMs, 1, 85000]]) {
    if (!Number.isInteger(value) || value < min || value > max) fail('invalid-retry-configuration');
  }
  const started = now(); let attempts = 0, latest = { state: 'not-observed' };
  while (attempts < maxAttempts && now() - started < maxElapsedMs) {
    attempts++;
    const url = new URL('/release.json', BASE_URL);
    url.searchParams.set('commit', expectedSha); url.searchParams.set('readiness', randomUUID()); url.searchParams.set('attempt', String(attempts));
    const timeout = Math.max(1, Math.min(requestTimeoutMs, maxElapsedMs - (now() - started)));
    const observation = await attemptRead(fetchImpl, url.href, timeout, expectedSha, expectedDigest);
    const { bytes, ...safeObservation } = observation;
    latest = safeObservation; // Never pair an older response's SHA with newer bytes.
    onAttempt({ attempt: attempts, ...safeObservation });
    if (observation.state === 'ready') return { bytes, attempts, sourceSha: expectedSha, manifestDigest: expectedDigest };
    if (attempts >= maxAttempts || now() - started + delayMs >= maxElapsedMs) break;
    await sleep(delayMs);
  }
  fail(latest.state, { expectedSha, expectedDigest, attempts, ...latest });
}

export function failureAnnotation(error, { expectedSha, expectedDigest } = {}) {
  const details = error instanceof HostedReleaseError ? error.details : {};
  const state = error instanceof HostedReleaseError && /^[a-z-]+(?![\s\S])/.test(error.state) ? error.state : 'verification-error';
  const fields = [`state=${state}`];
  for (const [key, value, pattern] of [['expectedSHA', expectedSha, SHA], ['expectedSHA256', expectedDigest, DIGEST],
    ['observedSHA', details.observedSha, SHA], ['observedSHA256', details.observedDigest, DIGEST]]) if (pattern.test(value || '')) fields.push(`${key}=${value}`);
  if (Number.isInteger(details.attempts) && details.attempts >= 0 && details.attempts <= 12) fields.push(`attempts=${details.attempts}`);
  if (Number.isInteger(details.httpStatus) && details.httpStatus >= 100 && details.httpStatus <= 599) fields.push(`httpStatus=${details.httpStatus}`);
  return `::error title=Hosted release readiness failed::${fields.join('; ')}`;
}

export async function main(env = process.env, argv = process.argv.slice(2)) {
  const configuration = { expectedSha: env.GITHUB_SHA, expectedDigest: env.HARBORLIGHT_FRONTEND_MANIFEST_SHA256, baseUrl: env.HARBORLIGHT_FRONTEND_URL };
  try {
    if (argv.length !== 2 || !argv.every(value => typeof value === 'string' && value)) fail('invalid-local-configuration');
    let expectedBytes;
    try { expectedBytes = await readFile(argv[0]); } catch { fail('local-manifest-unavailable'); }
    const result = await verifyHostedRelease({ ...configuration, expectedBytes }, { onAttempt: observation => console.log(JSON.stringify(observation)) });
    await writeFile(argv[1], result.bytes);
    console.log(JSON.stringify({ verified: true, sourceSha: result.sourceSha, manifestDigest: result.manifestDigest, attempts: result.attempts }));
    return result;
  } catch (error) { console.error(failureAnnotation(error, configuration)); throw error; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { process.exitCode = 1; });
}
