// Read-only release smoke for the three permanent DEV identities. The script
// never issues island/account mutation commands. Sign-in updates Auth metadata;
// an API GET may initialize the server's legacy account metadata. Credentials
// and tokens remain in process memory only.
import { pathToFileURL } from 'node:url';

const PROJECT = 'harborlight-dev';
const HOSTING_ORIGIN = 'https://harborlight-dev.web.app';
const CONFIG_URL = `${HOSTING_ORIGIN}/__/firebase/init.json`;
const API_CONFIG_URL = `${HOSTING_ORIGIN}/api/v1/config`;
const API_ISLAND_URL = `${HOSTING_ORIGIN}/api/v1/island`;
const AUTH_ORIGIN = 'https://identitytoolkit.googleapis.com';
const AUTH_PATH = '/v1/accounts:signInWithPassword';
const DATABASE = `projects/${PROJECT}/databases/(default)`;
const DOCUMENT_PREFIX = `${DATABASE}/documents/islands/`;
const FIRESTORE_ORIGIN = 'https://firestore.googleapis.com';
const USERS = Object.freeze([1, 2, 3].map(number => Object.freeze({
  login: `admin${number}`, uid: `dev-admin${number}`,
  email: `admin${number}@dev.harborlight.pl`
})));
const MAX_PAYLOAD_BYTES = 700_000;
const LIMITS = { config: 65_536, auth: 65_536, document: 2_000_000, denial: 65_536 };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const timestamp = value => typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) &&
  Number.isFinite(Date.parse(value));

class CheckError extends Error {}
const fail = message => { throw new CheckError(message); };

function allowedUrl(url, accountApiEnabled) {
  if (url.href === CONFIG_URL) return true;
  if (accountApiEnabled && [API_CONFIG_URL, API_ISLAND_URL].includes(url.href)) return true;
  if (url.origin === AUTH_ORIGIN && url.pathname === AUTH_PATH &&
      [...url.searchParams.keys()].length === 1 &&
      /^[A-Za-z0-9_-]{20,100}$/.test(url.searchParams.get('key') || '')) return true;
  return url.origin === FIRESTORE_ORIGIN && !url.search &&
    USERS.some(user => url.pathname === `/v1/${DOCUMENT_PREFIX}${user.uid}`);
}

async function readJson(response, limit) {
  const declared = response.headers?.get?.('content-length');
  if (declared !== null && declared !== undefined &&
      (!/^\d+$/.test(declared) || Number(declared) > limit)) {
    await response.body?.cancel().catch(() => {});
    fail('DEV account check received an oversized response.');
  }
  if (!response.body?.getReader) fail('DEV account check received an invalid response.');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel().catch(() => {});
        fail('DEV account check received an oversized response.');
      }
      chunks.push(Buffer.from(value));
    }
    const parsed = JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
    if (!object(parsed)) fail('DEV account check received an invalid JSON response.');
    return parsed;
  } catch (error) {
    if (error instanceof CheckError) throw error;
    fail('DEV account check could not read a valid JSON response.');
  } finally { reader.releaseLock(); }
}

// These consistency checks apply to the token returned by Google's fixed HTTPS
// Auth endpoint. They do not replace cryptographic verification: Firestore
// and the account API verify the token signature on subsequent requests.
function validateIdentity(reply, user, now) {
  const token = reply.idToken;
  if (reply.localId !== user.uid || reply.email !== user.email ||
      typeof token !== 'string' || token.length > 16_000 ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    fail('Firebase Auth returned an unexpected DEV identity.');
  }
  let claims;
  try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); }
  catch { fail('Firebase Auth returned invalid DEV token claims.'); }
  if (!object(claims) || claims.aud !== PROJECT ||
      claims.iss !== `https://securetoken.google.com/${PROJECT}` ||
      claims.sub !== user.uid || !positive(claims.exp) || claims.exp * 1000 <= now()) {
    fail('Firebase Auth token does not match the active DEV identity.');
  }
  return token;
}

function validateDocument(document, user) {
  const fields = document.fields;
  const revision = fields?.revision?.integerValue;
  const payload = fields?.payload?.stringValue;
  if (document.name !== `${DOCUMENT_PREFIX}${user.uid}` || !object(fields) ||
      fields.schemaVersion?.integerValue !== '1' || typeof revision !== 'string' ||
      !/^[1-9][0-9]*$/.test(revision) || !positive(Number(revision)) ||
      typeof payload !== 'string' || Buffer.byteLength(payload, 'utf8') > MAX_PAYLOAD_BYTES ||
      !timestamp(document.updateTime)) {
    fail('An existing DEV island has an invalid document format.');
  }
  let state;
  try { state = JSON.parse(payload); }
  catch { fail('An existing DEV island has an invalid state payload.'); }
  if (!object(state)) fail('An existing DEV island has an invalid state payload.');
}

function validateApiIsland(body) {
  const account = body.account;
  if (!object(account) || !positive(account.generation) || typeof account.expired !== 'boolean' ||
      !(account.lastPlayedAt === null || Number.isSafeInteger(account.lastPlayedAt) && account.lastPlayedAt >= 0) ||
      !(body.island === null || object(body.island))) {
    fail('The DEV account API returned an invalid account envelope.');
  }
  if (body.island === null) return false;
  const island = body.island;
  if (account.expired || island.generation !== account.generation || !positive(island.version?.revision) ||
      !timestamp(island.version?.updateTime) || typeof island.payload !== 'string' ||
      Buffer.byteLength(island.payload, 'utf8') > MAX_PAYLOAD_BYTES) {
    fail('The DEV account API returned an invalid island envelope.');
  }
  let state;
  try { state = JSON.parse(island.payload); }
  catch { fail('The DEV account API returned an invalid state payload.'); }
  if (!object(state) || (state.islandGeneration ?? 1) !== account.generation) {
    fail('The DEV account API returned an invalid state payload.');
  }
  return true;
}

export async function check({ fetch: fetcher = globalThis.fetch, passwordForLogin,
  now = () => Date.now(), accountApiEnabled = false } = {}) {
  if (typeof fetcher !== 'function' || typeof passwordForLogin !== 'function' || typeof now !== 'function') {
    fail('An explicit DEV password provider is required before checking accounts.');
  }
  if (typeof accountApiEnabled !== 'boolean') fail('The DEV account API mode must be an explicit boolean.');
  async function request(address, { method = 'GET', headers = {}, body } = {}, limit) {
    const url = new URL(address);
    if (!allowedUrl(url, accountApiEnabled) || url.username || url.password || url.hash) {
      fail('DEV account check rejected an unexpected request destination.');
    }
    let response;
    try {
      response = await fetcher(url.href, { method, headers, ...(body === undefined ? {} : { body }),
        redirect: 'error', credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15_000) });
    } catch { fail('DEV account check could not reach the required service.'); }
    if (!Number.isInteger(response?.status) || response.status < 100 || response.status > 599 ||
        response.redirected || (response.url && response.url !== url.href)) {
      fail('DEV account check received an unexpected HTTP response.');
    }
    return { status: response.status, body: await readJson(response, limit) };
  }

  const config = await request(CONFIG_URL, {}, LIMITS.config);
  if (config.status !== 200 || config.body.projectId !== PROJECT ||
      typeof config.body.apiKey !== 'string' || !/^[A-Za-z0-9_-]{20,100}$/.test(config.body.apiKey)) {
    fail('DEV Hosting did not provide the expected Firebase project configuration.');
  }
  if (accountApiEnabled) {
    const apiConfig = await request(API_CONFIG_URL, {}, LIMITS.config);
    if (apiConfig.status !== 200 || apiConfig.body.accountApi !== true ||
        apiConfig.body.projectId !== PROJECT || apiConfig.body.environment !== 'preprod') {
      fail('DEV Hosting did not confirm the active PRE-PROD account API.');
    }
  }
  const totals = { accounts: 0, existingSaves: 0, emptyIslands: 0,
    foreignReadsDenied: 0, anonymousReadsDenied: 0,
    ...(accountApiEnabled ? { apiReads: 0, ownedDirectReadsDenied: 0, anonymousApiReadsDenied: 0 } : {}) };
  for (const user of USERS) {
    let password;
    try { password = await passwordForLogin(user.login); }
    catch { fail('The DEV password provider failed.'); }
    if (typeof password !== 'string' || !password || password.length > 128) {
      fail('The DEV password provider returned an invalid password.');
    }
    const signedIn = await request(`${AUTH_ORIGIN}${AUTH_PATH}?key=${encodeURIComponent(config.body.apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password, returnSecureToken: true })
    }, LIMITS.auth);
    password = undefined;
    if (signedIn.status !== 200) fail(`DEV account sign-in failed (HTTP ${signedIn.status}).`);
    const token = validateIdentity(signedIn.body, user, now);
    const headers = { Authorization: `Bearer ${token}` };
    let apiIsland;
    if (accountApiEnabled) {
      // This route has no caller-controlled UID. The server derives ownership
      // exclusively from the validated Firebase token for this loop's user.
      const ownApi = await request(API_ISLAND_URL, { headers }, LIMITS.document);
      if (ownApi.status !== 200) fail(`Reading an owned DEV API island failed (HTTP ${ownApi.status}).`);
      const exists = validateApiIsland(ownApi.body);
      apiIsland = ownApi.body.island;
      totals[exists ? 'existingSaves' : 'emptyIslands']++;
      totals.apiReads++;
    }
    const ownUrl = `${FIRESTORE_ORIGIN}/v1/${DOCUMENT_PREFIX}${user.uid}`;
    const own = await request(ownUrl, { headers }, LIMITS.document);
    if (own.status === 200) {
      validateDocument(own.body, user);
      if (accountApiEnabled) {
        // Before the first explicit reset the legacy owner-read rules may
        // still be active. They provide an additional identity cross-check.
        const directRevision = Number(own.body.fields.revision.integerValue);
        if (!apiIsland || apiIsland.version.revision > directRevision ||
            apiIsland.version.revision === directRevision && apiIsland.payload !== own.body.fields.payload.stringValue) {
          fail('The DEV account API did not match the authenticated owner document.');
        }
      } else totals.existingSaves++;
    } else if (own.status === 404 && own.body.error?.code === 404 && own.body.error?.status === 'NOT_FOUND') {
      if (accountApiEnabled) {
        if (apiIsland !== null) fail('The DEV account API did not match the authenticated owner document.');
      } else totals.emptyIslands++;
    } else if (accountApiEnabled && own.status === 403 && own.body.error?.status === 'PERMISSION_DENIED') {
      // API-only rules deliberately deny even the owner's direct request.
      totals.ownedDirectReadsDenied++;
    } else fail(`Reading an owned DEV island failed (HTTP ${own.status}).`);
    for (const other of USERS) {
      if (other === user) continue;
      const denied = await request(`${FIRESTORE_ORIGIN}/v1/${DOCUMENT_PREFIX}${other.uid}`, { headers }, LIMITS.denial);
      if (denied.status !== 403 || denied.body.error?.status !== 'PERMISSION_DENIED') {
        fail('Firestore did not deny access to another DEV island.');
      }
      totals.foreignReadsDenied++;
    }
    const anonymous = await request(ownUrl, {}, LIMITS.denial);
    if (anonymous.status !== 403 || anonymous.body.error?.status !== 'PERMISSION_DENIED') {
      fail('Firestore did not deny anonymous access to a DEV island.');
    }
    totals.anonymousReadsDenied++;
    if (accountApiEnabled) {
      const anonymousApi = await request(API_ISLAND_URL, {}, LIMITS.denial);
      if (anonymousApi.status !== 401 || anonymousApi.body.error !== 'auth-required') {
        fail('The DEV account API did not deny anonymous island access.');
      }
      totals.anonymousApiReadsDenied++;
    }
    totals.accounts++;
  }
  return totals;
}

export async function main(args = process.argv.slice(2), { fetch: fetcher = globalThis.fetch,
  write = text => process.stdout.write(text), writeError = text => process.stderr.write(text), now } = {}) {
  if (args.length === 1 && args[0] === '--help') {
    write('Read-only DEV account and Firestore isolation check.\n' +
      'Usage: node infra/google-cloud/check-dev-accounts.mjs --passwords-match-logins [--account-api]\n' +
      '--account-api verifies the active same-origin API and accepts API-only Firestore rules.\n' +
      'The explicit flag authorizes using the configured DEV test-password convention.\n' +
      'No island creation, reset, save or deletion is requested. Sign-in updates Auth metadata;\n' +
      'a normal API read may initialize legacy account metadata on the server.\n');
    return 0;
  }
  if (!args.includes('--passwords-match-logins') || args.length !== new Set(args).size ||
      args.some(arg => !['--passwords-match-logins', '--account-api'].includes(arg))) {
    writeError('ERROR: Explicit --passwords-match-logins authorization is required; no project override is supported.\n');
    return 1;
  }
  try {
    const result = await check({ fetch: fetcher, passwordForLogin: login => login,
      accountApiEnabled: args.includes('--account-api'), ...(now ? { now } : {}) });
    write(`PASS — ${result.accounts} permanent DEV accounts; ${result.existingSaves} existing saves; ` +
      `${result.emptyIslands} empty islands; ${result.foreignReadsDenied} foreign and ` +
      `${result.anonymousReadsDenied} anonymous reads denied. ` +
      (args.includes('--account-api') ? `${result.apiReads} API reads; ${result.ownedDirectReadsDenied} owned direct reads and ` +
        `${result.anonymousApiReadsDenied} anonymous API reads denied. ` : '') +
      'No island writes performed.\n');
    return 0;
  } catch (error) {
    writeError(`ERROR: ${error instanceof CheckError ? error.message : 'DEV account check failed.'}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
