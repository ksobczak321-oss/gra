import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';
import { createFirebaseIdentityVerifier } from '../firebase-auth.mjs';
const PROJECT = 'harborlight-prod', NOW = Date.parse('2026-10-30T12:00:00Z');
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const cert = keys.publicKey.export({ type: 'spki', format: 'pem' });
const baseClaims = { aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: 'firebase-user-1', exp: NOW / 1000 + 3600, iat: NOW / 1000, auth_time: NOW / 1000 - 10, firebase: { sign_in_provider: 'google.com' } };
function token(claims = {}, header = {}, privateKey = keys.privateKey) {
  const head = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'key-1', ...header })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...baseClaims, ...claims })).toString('base64url');
  return `${head}.${body}.${sign('RSA-SHA256', Buffer.from(`${head}.${body}`), privateKey).toString('base64url')}`;
}
const unauthorized = promise => assert.rejects(promise, error => error.code === 'auth-required' && error.status === 401);

test('real RSA signatures and project/issuer claims are verified and public keys are cached', async () => {
  let calls = 0;
  const verify = createFirebaseIdentityVerifier({ projectId: PROJECT, now: () => NOW, fetch: async url => {
    assert.equal(url, 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'); calls++;
    return new Response(JSON.stringify({ 'key-1': cert }), { headers: { 'cache-control': 'public, max-age=3600' } });
  } });
  const identities = await Promise.all(Array.from({ length: 10 }, () => verify(token())));
  assert.ok(identities.every(identity => identity.uid === 'firebase-user-1' && identity.provider === 'google.com'));
  assert.equal(calls, 1);
  for (const claims of [{ aud: 'other-project' }, { iss: 'https://example.com' }, { sub: '../other' }, { exp: NOW / 1000 }, { iat: NOW / 1000 + 31 }, { auth_time: NOW / 1000 + 31 }]) await unauthorized(verify(token(claims)));
  await unauthorized(verify(token({}, { alg: 'HS256' })));
  const wrong = generateKeyPairSync('rsa', { modulusLength: 2048 });
  await unauthorized(verify(token({}, {}, wrong.privateKey)));
  await unauthorized(verify('not-a-token'));
  assert.equal(calls, 1, 'invalid claims and an unknown signing key cannot force certificate fetches on every request');
  await unauthorized(verify(token({}, { kid: 'unknown-key' })));
  assert.equal(calls, 1);
});

test('expired certificate caches refresh, and key-service failures never authenticate a caller', async () => {
  let time = NOW, calls = 0;
  const verify = createFirebaseIdentityVerifier({ projectId: PROJECT, now: () => time, fetch: async () => {
    calls++; return calls === 1 ? new Response(JSON.stringify({ 'key-1': cert }), { headers: { 'cache-control': 'max-age=60' } }) : new Response('{}', { status: 503 });
  } });
  await verify(token()); time += 61000;
  await assert.rejects(verify(token()), error => error.code === 'identity-provider-unavailable' && error.status === 503);
  assert.equal(calls, 2);
});
