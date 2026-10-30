import { createPublicKey, verify as verifySignature } from 'node:crypto';

const CERTIFICATES = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
export class FirebaseIdentityError extends Error {
  constructor(code = 'auth-required', status = 401) { super(code); this.code = code; this.status = status; }
}
const fail = () => { throw new FirebaseIdentityError(); };
function decode(segment) {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) fail();
  try { const value = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')); if (!value || typeof value !== 'object' || Array.isArray(value)) fail(); return value; }
  catch { fail(); }
}

// Firebase ID tokens (not custom tokens) are verified against Google's public
// signing certificates. Provider and API secrets are never accepted from callers.
export function createFirebaseIdentityVerifier({ projectId, fetch: fetcher = globalThis.fetch, now = () => Date.now() } = {}) {
  if (typeof projectId !== 'string' || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId)) throw new TypeError('A Firebase project ID is required.');
  let keys = new Map(), expiresAt = 0, refreshedAt = -Infinity, pending = null;
  async function refresh() {
    if (pending) return pending;
    pending = (async () => {
      const response = await fetcher(CERTIFICATES, { signal: AbortSignal.timeout(7000), redirect: 'error', cache: 'no-store' });
      if (!response.ok) throw new FirebaseIdentityError('identity-provider-unavailable', 503);
      const certificates = await response.json();
      if (!certificates || typeof certificates !== 'object' || Array.isArray(certificates)) throw new FirebaseIdentityError('identity-provider-unavailable', 503);
      const next = new Map();
      for (const [kid, pem] of Object.entries(certificates)) if (typeof pem === 'string' && pem.length <= 20000) {
        try { const key = createPublicKey(pem); if (key.asymmetricKeyType === 'rsa') next.set(kid, key); } catch { /* Reject malformed certificates. */ }
      }
      if (!next.size) throw new FirebaseIdentityError('identity-provider-unavailable', 503);
      const maxAge = Number(/(?:^|,)\s*max-age=(\d+)/i.exec(response.headers.get('cache-control') || '')?.[1] || 3600);
      keys = next; refreshedAt = now(); expiresAt = refreshedAt + Math.min(21600, Math.max(60, maxAge)) * 1000;
    })().catch(error => { if (error instanceof FirebaseIdentityError) throw error; throw new FirebaseIdentityError('identity-provider-unavailable', 503); }).finally(() => { pending = null; });
    return pending;
  }
  return async function verifyIdToken(token) {
    if (typeof token !== 'string' || token.length > 16000) fail();
    const segments = token.split('.'); if (segments.length !== 3) fail();
    const header = decode(segments[0]), claims = decode(segments[1]);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length > 200 || !/^[A-Za-z0-9_-]+$/.test(segments[2])) fail();
    const current = Math.floor(now() / 1000);
    if (claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}` ||
        typeof claims.sub !== 'string' || !/^[A-Za-z0-9:_-]{1,128}$/.test(claims.sub) ||
        !Number.isSafeInteger(claims.exp) || claims.exp <= current || !Number.isSafeInteger(claims.iat) || claims.iat > current + 30 || claims.iat < 0 ||
        !Number.isSafeInteger(claims.auth_time) || claims.auth_time > current + 30 || claims.auth_time < 0) fail();
    if (!keys.size || now() >= expiresAt || !keys.has(header.kid) && now() - refreshedAt >= 60000) await refresh();
    const key = keys.get(header.kid); if (!key) fail();
    if (!verifySignature('RSA-SHA256', Buffer.from(`${segments[0]}.${segments[1]}`), key, Buffer.from(segments[2], 'base64url'))) fail();
    return { uid: claims.sub, authTime: claims.auth_time * 1000, provider: claims.firebase?.sign_in_provider || null };
  };
}
