// Firebase owns credentials and verifies access to the UID-scoped documents.
// Hosting selects the isolated project; runtime Firebase config never contains secrets.
import { validateIslandName } from './harborlight-v1-profile.js?v=frontend-v18';
export const DEV_PROJECT = 'harborlight-dev';
export const PROD_PROJECT = 'harborlight-prod';
export const PROD_SESSION_KEY = 'harborlight-prod-auth-v1';
export const DEV_USERS = Object.freeze(['admin1', 'admin2', 'admin3'].map(login =>
  Object.freeze({ login, uid: `dev-${login}`, email: `${login}@dev.harborlight.pl` })));
export const SESSION_KEY = 'harborlight-dev-auth-v1';
const HOST_PROJECTS = new Map([
  [`${DEV_PROJECT}.web.app`, DEV_PROJECT], [`${DEV_PROJECT}.firebaseapp.com`, DEV_PROJECT],
  [`${PROD_PROJECT}.web.app`, PROD_PROJECT], [`${PROD_PROJECT}.firebaseapp.com`, PROD_PROJECT],
  ['harborlight.pl', PROD_PROJECT], ['www.harborlight.pl', PROD_PROJECT]
]);
const MAX_PAYLOAD_BYTES = 700_000;
const MAX_TOKEN_LENGTH = 16_000;
const safeUid = uid => typeof uid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(uid);
const validEmail = email => typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const profileName = value => validateIslandName(typeof value === 'string' && value.startsWith('HARBORLIGHT:') ? value.slice(12) : '').name;
const MESSAGES = {
  disabled: 'Logowanie jest dostępne na hostingu PRE-PROD lub PROD.',
  'registration-disabled': 'Rejestracja jest wyłączona na PRE-PROD. Użyj stałego konta testowego.',
  'email-in-use': 'Ten adres e-mail ma już konto. Zaloguj się.',
  'weak-password': 'Hasło musi mieć co najmniej 8 znaków.',
  'invalid-email': 'Wpisz prawidłowy adres e-mail.',
  'invalid-island-name': 'Nazwa wyspy musi mieć od 2 do 40 znaków.',
  configuration: 'Konfiguracja logowania tego środowiska nie jest zakończona.',
  'invalid-login': 'Wpisz login admin1, admin2 albo admin3.',
  'invalid-credentials': 'Nieprawidłowy login lub hasło.',
  'account-disabled': 'To konto testowe jest wyłączone.',
  'rate-limited': 'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
  storage: 'Przeglądarka nie może zapisać sesji. Zezwól na pamięć lokalną.',
  'auth-required': 'Sesja wygasła. Zaloguj się ponownie.',
  permission: 'Brak dostępu do zapisu wyspy. Sprawdź konfigurację kont.',
  offline: 'Nie można połączyć się z chmurą. Spróbuj ponownie.',
  'invalid-state': 'Nie można wysłać nieprawidłowego lub zbyt dużego zapisu.',
  'invalid-cloud-data': 'Zapis w chmurze ma nieprawidłowy format.',
  conflict: 'Wyspa została zapisana w innym oknie lub na innym urządzeniu.',
  'island-expired': 'Ta wyspa wygasła po okresie nieaktywności. Wczytaj konto ponownie, aby rozpocząć nową wyspę.',
  'invalid-code': 'Kod jest nieprawidłowy lub niedostępny.',
  'promotion-not-started': 'Ten kod nie jest jeszcze aktywny.',
  'promotion-ended': 'Termin użycia tego kodu minął.',
  'promotion-exhausted': 'Limit użyć tego kodu został wyczerpany.',
  'unsupported-promotion-verification': 'Ten kod wymaga niepodłączonej weryfikacji Facebooka.'
};
const fail = code => Object.assign(new Error(MESSAGES[code]), { code });
const userByUid = uid => DEV_USERS.find(user => user.uid === uid);
const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value > 0;
const tokenString = value => typeof value === 'string' && value.length > 0 &&
  value.length <= MAX_TOKEN_LENGTH && !/\s/.test(value);
const timestamp = value => typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) &&
  Number.isFinite(Date.parse(value));

export function accountSaveKey(uid, projectId = DEV_PROJECT) {
  if (projectId === DEV_PROJECT && userByUid(uid)) return `harborlight-dev-island-${uid}`;
  if (projectId === PROD_PROJECT && safeUid(uid)) return `harborlight-prod-island-${uid}`;
  throw fail('invalid-login');
}

// These are consistency checks, not cryptographic verification. Auth responses
// arrive from Google over HTTPS; Firestore verifies the actual token signature.
function tokenClaims(token, uid, projectId = DEV_PROJECT) {
  if (!tokenString(token)) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  try {
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    return claims.aud === projectId && claims.iss === `https://securetoken.google.com/${projectId}` &&
      claims.sub === uid && integer(claims.exp) ? claims : null;
  } catch { return null; }
}

function payloadValid(payload) {
  if (typeof payload !== 'string' || new TextEncoder().encode(payload).byteLength > MAX_PAYLOAD_BYTES) return false;
  try { return isObject(JSON.parse(payload)); } catch { return false; }
}

function versionValid(version) {
  return isObject(version) && integer(version.revision) && timestamp(version.updateTime);
}

export function createDevCloud({
  fetch: fetcher = globalThis.fetch,
  storage,
  hostname = globalThis.location?.hostname,
  now = () => Date.now(),
  discoverAccountApi = true
} = {}) {
  const projectId = HOST_PROJECTS.get(hostname) || null;
  const enabled = projectId !== null, preprod = projectId === DEV_PROJECT;
  const environment = preprod ? 'preprod' : enabled ? 'prod' : 'local';
  let accountApiEnabled = enabled && !preprod;
  const sessionKey = preprod ? SESSION_KEY : PROD_SESSION_KEY;
  const DATABASE = `projects/${projectId}/databases/(default)`;
  const FIRESTORE = `https://firestore.googleapis.com/v1/${DATABASE}/documents`;
  const resolveUser = (uid, login = '', displayName = '') => preprod ? userByUid(uid) : safeUid(uid) ?
    { uid, login: validEmail(login) ? login : uid, ...(profileName(displayName) ? { islandName: profileName(displayName) } : {}) } : null;
  let configPromise, session = null, refreshPromise = null;
  let generation = 0, islandGeneration = null, accountStatus = null;
  const requireEnabled = () => { if (!enabled) throw fail('disabled'); };
  const identity = () => session ? { uid: session.uid, login: session.login, ...(session.islandName ? { islandName: session.islandName } : {}) } : null;
  // Access the browser storage getter only when a DEV session needs it. Some
  // privacy/embedded contexts throw merely from reading localStorage.
  const sessionStorage = () => storage === undefined ? globalThis.localStorage : storage;

  async function request(url, options = {}, { allowMissing = false } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetcher(url, { ...options, signal: controller.signal,
        credentials: 'omit', cache: 'no-store', redirect: 'error' });
      if (allowMissing && response.status === 404) return { status: 404, ok: false, body: {} };
      let body;
      try { body = await response.json(); } catch { throw fail('offline'); }
      if (!isObject(body)) throw fail('offline');
      return { status: response.status, ok: response.ok, body };
    } catch (error) {
      if (error?.code && MESSAGES[error.code]) throw error;
      throw fail('offline');
    } finally { clearTimeout(timer); }
  }

  async function config() {
    requireEnabled();
    if (!configPromise) configPromise = (async () => {
      const result = await request('/__/firebase/init.json');
      if (!result.ok || result.body.projectId !== projectId ||
          typeof result.body.apiKey !== 'string' || !/^[A-Za-z0-9_-]{20,100}$/.test(result.body.apiKey)) {
        throw fail('configuration');
      }
      if (preprod && discoverAccountApi) {
        const runtime = await request('/api/v1/config', {}, { allowMissing: true });
        if (runtime.ok) {
          if (runtime.body.accountApi !== true || runtime.body.projectId !== projectId || runtime.body.environment !== 'preprod') throw fail('configuration');
          accountApiEnabled = true;
        } else if (runtime.status === 404 || runtime.status === 503 && runtime.body.error === 'account_api_disabled') {
          accountApiEnabled = false;
        } else throw fail('configuration');
      }
      return { accountApi: accountApiEnabled, apiKey: result.body.apiKey, projectId, authDomain: typeof result.body.authDomain === 'string' && result.body.authDomain === `${projectId}.firebaseapp.com` ? result.body.authDomain : `${projectId}.firebaseapp.com`,
        ...(typeof result.body.appId === 'string' ? { appId: result.body.appId } : {}),
        messagingSenderId: String(result.body.messagingSenderId || ''), projectNumber: String(result.body.messagingSenderId || '') };
    })().catch(error => { configPromise = null; throw error; });
    return configPromise;
  }

  function readStored() {
    let value;
    try { value = sessionStorage().getItem(sessionKey); } catch { throw fail('storage'); }
    if (!value) return null;
    let parsed;
    try { parsed = JSON.parse(value); } catch { return null; }
    const user = resolveUser(parsed?.uid, parsed?.login, parsed?.islandName ? 'HARBORLIGHT:' + parsed.islandName : '');
    const claims = user && tokenClaims(parsed.idToken, user.uid, projectId);
    if (!user || parsed.projectId !== projectId || parsed.login !== user.login || !claims ||
        !tokenString(parsed.refreshToken) || !Number.isFinite(parsed.expiresAt) ||
        parsed.expiresAt < 0 || parsed.expiresAt > claims.exp * 1000) return null;
    // Discard unknown fields, so password-like data can never be copied back.
    return { projectId, uid: user.uid, login: user.login, idToken: parsed.idToken,
      refreshToken: parsed.refreshToken, expiresAt: parsed.expiresAt, ...(user.islandName ? { islandName: user.islandName } : {}) };
  }

  function store(next) {
    try { sessionStorage().setItem(sessionKey, JSON.stringify(next)); } catch { throw fail('storage'); }
    if (session?.uid !== next.uid) { islandGeneration = null; accountStatus = null; }
    session = next;
  }

  function clear() {
    session = null; islandGeneration = null; accountStatus = null;
    generation++;
    try { sessionStorage().removeItem(sessionKey); } catch { throw fail('storage'); }
  }

  function authError(result) {
    const provider = String(result.body.error?.message || '').split(' : ', 1)[0];
    if (provider === 'EMAIL_EXISTS') return fail('email-in-use');
    if (provider === 'INVALID_EMAIL') return fail('invalid-email');
    if (provider.startsWith('WEAK_PASSWORD')) return fail('weak-password');
    if (provider === 'USER_DISABLED') return fail('account-disabled');
    if (result.status === 429 || provider === 'TOO_MANY_ATTEMPTS_TRY_LATER') return fail('rate-limited');
    if (['OPERATION_NOT_ALLOWED', 'PASSWORD_LOGIN_DISABLED', 'API_KEY_INVALID', 'PROJECT_NOT_FOUND'].includes(provider)) {
      return fail('configuration');
    }
    if (result.status >= 500) return fail('offline');
    return fail('invalid-credentials');
  }

  function authSession(body, user, refreshed = false) {
    const idToken = refreshed ? body.id_token : body.idToken;
    const refreshToken = refreshed ? body.refresh_token : body.refreshToken;
    const uid = refreshed ? body.user_id : body.localId;
    const duration = Number(refreshed ? body.expires_in : body.expiresIn);
    const claims = tokenClaims(idToken, user?.uid, projectId);
    if (!user || uid !== user.uid || !claims || claims.exp * 1000 <= now() ||
        !tokenString(refreshToken) || !integer(duration) || duration > 86_400) throw fail('auth-required');
    return { projectId, uid, login: user.login, idToken, refreshToken,
      expiresAt: Math.min(now() + duration * 1000, claims.exp * 1000), ...(user.islandName ? { islandName: user.islandName } : {}) };
  }

  async function refresh(force = false) {
    requireEnabled();
    if (!session) throw fail('auth-required');
    if (!force && session.expiresAt > now() + 60_000) return;
    if (refreshPromise) return refreshPromise;
    const previous = session, attempt = generation;
    refreshPromise = (async () => {
      const settings = await config();
      const result = await request(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(settings.apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: previous.refreshToken }).toString()
      });
      if (attempt !== generation) throw fail('auth-required');
      if (!result.ok) {
        if (result.status === 429) throw fail('rate-limited');
        if (result.status >= 500) throw fail('offline');
        clear(); throw fail('auth-required');
      }
      const providerProject = result.body.project_id;
      if (providerProject !== undefined && String(providerProject) !== projectId &&
          (!settings.projectNumber || String(providerProject) !== settings.projectNumber)) {
        clear(); throw fail('auth-required');
      }
      let next;
      try { next = authSession(result.body, resolveUser(previous.uid, previous.login, previous.islandName ? 'HARBORLIGHT:' + previous.islandName : ''), true); }
      catch { clear(); throw fail('auth-required'); }
      store(next);
    })().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  async function signIn(login, password) {
    requireEnabled();
    const normalized = String(login || '').trim().toLowerCase();
    const testUser = preprod ? DEV_USERS.find(candidate => candidate.login === normalized) : null;
    if (preprod && !testUser) throw fail('invalid-login');
    if (!preprod && !validEmail(normalized)) throw fail('invalid-email');
    if (typeof password !== 'string' || !password || password.length > 128) throw fail('invalid-credentials');
    const attempt = ++generation, settings = await config();
    const email = testUser?.email || normalized;
    const result = await request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(settings.apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    if (attempt !== generation) throw fail('auth-required');
    if (!result.ok) throw authError(result);
    if (String(result.body.email || '').toLowerCase() !== email.toLowerCase()) throw fail('auth-required');
    const user = testUser || resolveUser(result.body.localId, result.body.email, result.body.displayName);
    store(authSession(result.body, user));
    return identity();
  }

  async function registerEmail(email, password, { islandName = '' } = {}) {
    requireEnabled();
    if (preprod) throw fail('registration-disabled');
    const normalized = String(email || '').trim().toLowerCase(), name = validateIslandName(islandName);
    if (!validEmail(normalized)) throw fail('invalid-email');
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw fail('weak-password');
    if (!name.ok) throw fail('invalid-island-name');
    const attempt = ++generation, settings = await config();
    const result = await request(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(settings.apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized, password, returnSecureToken: true })
    });
    if (attempt !== generation) throw fail('auth-required');
    if (!result.ok) throw authError(result);
    if (String(result.body.email || '').toLowerCase() !== normalized) throw fail('auth-required');
    store(authSession(result.body, resolveUser(result.body.localId, normalized)));
    // Account creation has already succeeded. A profile update failing must not
    // claim otherwise or cause a second sign-up attempt with the same email.
    try {
      const updated = await request(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(settings.apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: session.idToken, displayName: 'HARBORLIGHT:' + name.name, returnSecureToken: true })
      });
      if (attempt !== generation) throw fail('auth-required');
      if (updated.ok) store({ ...session, islandName: name.name });
    } catch (error) { if (attempt !== generation) throw error; /* Name remains editable in the game. */ }
    return identity();
  }

  async function acceptExternalSession(credentials) {
    requireEnabled();
    const uid = credentials?.uid, idToken = credentials?.idToken, refreshToken = credentials?.refreshToken;
    const claims = safeUid(uid) && tokenClaims(idToken, uid, projectId);
    if (preprod && !userByUid(uid)) throw fail('invalid-login');
    if (!claims || !tokenString(refreshToken) || claims.exp * 1000 <= now()) throw fail('auth-required');
    const attempt = ++generation, settings = await config();
    const result = await request(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(settings.apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken })
    });
    if (attempt !== generation) throw fail('auth-required');
    if (!result.ok || result.body.users?.length !== 1 || result.body.users[0].localId !== uid) throw fail('auth-required');
    const user = result.body.users[0];
    store(authSession({ localId: uid, idToken, refreshToken, expiresIn: String(claims.exp - Math.floor(now() / 1000)) },
      resolveUser(uid, user.email, user.displayName)));
    return identity();
  }

  async function getProfile() {
    requireEnabled();
    if (!session) throw fail('auth-required');
    await refresh();
    const settings = await config(), activeUid = session.uid, attempt = generation;
    const result = await request(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(settings.apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: session.idToken })
    });
    if (attempt !== generation || session?.uid !== activeUid) throw fail('auth-required');
    const user = result.body.users?.[0];
    if (!result.ok || result.body.users?.length !== 1 || user.localId !== activeUid) throw fail('auth-required');
    return { uid: activeUid, islandName: profileName(user.displayName) };
  }

  async function restoreSession() {
    if (!enabled) return null;
    session = readStored();
    if (!session) { clear(); return null; }
    try {
      await config();
      await refresh();
    } catch (error) {
      // An unavailable network must not switch the player to a guest profile.
      // Opening an island still requires a confirmed cloud response.
      if (!session || !['offline', 'rate-limited'].includes(error.code)) throw error;
    }
    return identity();
  }

  async function firestoreRequest(url, options = {}) {
    requireEnabled();
    if (!session) throw fail('auth-required');
    const activeUid = session.uid, attempt = generation;
    await refresh();
    const send = () => request(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${session.idToken}` } });
    if (attempt !== generation || session?.uid !== activeUid) throw fail('auth-required');
    let result = await send();
    if (result.status === 401) {
      await refresh(true);
      if (attempt !== generation || session?.uid !== activeUid) throw fail('auth-required');
      result = await send();
    }
    if (attempt !== generation || session?.uid !== activeUid) throw fail('auth-required');
    if (result.status === 401) { clear(); throw fail('auth-required'); }
    // Account API errors are already safe, stable identifiers. Preserve
    // meaningful promotion/retention failures before treating generic 409 as a
    // concurrent-write conflict. Never expose arbitrary provider diagnostics.
    const apiError = typeof result.body.error === 'string' ? result.body.error : null;
    if (apiError && ['island-expired', 'invalid-code', 'promotion-not-started', 'promotion-ended', 'promotion-exhausted', 'unsupported-promotion-verification'].includes(apiError)) throw fail(apiError);
    if (apiError && ['invalid-island', 'invalid-generation', 'invalid-revision', 'inventory-overflow'].includes(apiError)) throw fail('invalid-state');
    if ([409, 412].includes(result.status) || result.body.error?.status === 'FAILED_PRECONDITION' ||
        result.body.error?.status === 'ALREADY_EXISTS') throw fail('conflict');
    if (result.status === 403) throw fail('permission');
    if (result.status === 429) throw fail('rate-limited');
    if (result.status === 503 && ['account_api_disabled', 'account-api-disabled', 'not_configured'].includes(result.body.error)) throw fail('configuration');
    if (!result.ok && result.status !== 404) throw fail('offline');
    return result;
  }

  function readBackendIsland(body) {
    if (isObject(body.account)) {
      accountStatus = { generation: body.account.generation, expired: body.account.expired === true,
        lastPlayedAt: body.account.lastPlayedAt ?? null };
      if (Number.isSafeInteger(body.account.generation) && body.account.generation >= 0) islandGeneration = body.account.generation;
    }
    if (body.island === null) return null;
    const island = body.island;
    if (!isObject(island) || !payloadValid(island.payload) || !versionValid(island.version) ||
        !Number.isSafeInteger(island.generation) || island.generation < 0) throw fail('invalid-cloud-data');
    islandGeneration = island.generation;
    return { payload: island.payload, version: island.version, generation: islandGeneration };
  }

  async function createIsland() {
    requireEnabled();
    await config();
    if (!accountApiEnabled) throw fail('configuration');
    const result = await firestoreRequest('/api/v1/island', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!result.ok) throw fail('configuration');
    return readBackendIsland(result.body);
  }

  async function recordActivity() {
    requireEnabled();
    await config();
    if (!accountApiEnabled) return { recorded: false, exempt: true };
    if (!Number.isSafeInteger(islandGeneration)) throw fail('invalid-state');
    const result = await firestoreRequest('/api/v1/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generation: islandGeneration }) });
    if (!result.ok) throw fail('configuration');
    return result.body;
  }

  async function redeemPromoCode(value) {
    requireEnabled();
    await config();
    if (!accountApiEnabled) throw fail('configuration');
    const code = String(value || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,64}$/.test(code) || !Number.isSafeInteger(islandGeneration)) throw fail('invalid-state');
    const result = await firestoreRequest('/api/v1/promotions/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, generation: islandGeneration }) });
    if (!result.ok) throw fail('configuration');
    return { ...result.body, island: await loadIsland() };
  }

  async function loadIsland() {
    requireEnabled();
    if (!session) throw fail('auth-required');
    await config();
    if (accountApiEnabled) {
      const result = await firestoreRequest('/api/v1/island');
      if (!result.ok) throw fail('configuration');
      return readBackendIsland(result.body);
    }
    const name = `${DATABASE}/documents/islands/${session.uid}`;
    const result = await firestoreRequest(`https://firestore.googleapis.com/v1/${name}`);
    if (result.status === 404) return null;
    const document = result.body, fields = document.fields || {};
    const revision = Number(fields.revision?.integerValue);
    const payload = fields.payload?.stringValue;
    if (document.name !== name || fields.schemaVersion?.integerValue !== '1' ||
        !integer(revision) || !payloadValid(payload) || !timestamp(document.updateTime)) throw fail('invalid-cloud-data');
    return { payload, version: { revision, updateTime: document.updateTime } };
  }

  async function saveIsland(payload, version = null) {
    requireEnabled();
    if (!session) throw fail('auth-required');
    if (!payloadValid(payload) || (version !== null && !versionValid(version)) ||
        (version && !integer(version.revision + 1))) throw fail('invalid-state');
    await config();
    if (accountApiEnabled) {
      if (!version || !Number.isSafeInteger(islandGeneration)) throw fail('invalid-state');
      const result = await firestoreRequest('/api/v1/island', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, expectedRevision: version.revision, generation: islandGeneration }) });
      if (!result.ok || !integer(result.body.revision) || !timestamp(result.body.updateTime) || result.body.generation !== islandGeneration) throw fail('invalid-cloud-data');
      return { revision: result.body.revision, updateTime: result.body.updateTime };
    }
    const revision = version ? version.revision + 1 : 1;
    const result = await firestoreRequest(`${FIRESTORE}:commit`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: [{
        update: { name: `${DATABASE}/documents/islands/${session.uid}`, fields: {
          schemaVersion: { integerValue: '1' }, revision: { integerValue: String(revision) },
          payload: { stringValue: payload }
        } },
        currentDocument: version ? { updateTime: version.updateTime } : { exists: false },
        updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }]
      }] }) });
    const updateTime = result.body.writeResults?.[0]?.updateTime;
    if (!result.ok || result.body.writeResults?.length !== 1 || !timestamp(updateTime)) throw fail('invalid-cloud-data');
    return { revision, updateTime };
  }

  return { enabled, preprod, projectId, environment, sessionKey, get accountApiEnabled() { return accountApiEnabled; }, signIn, registerEmail, acceptExternalSession, getPublicConfig: config, getProfile, restoreSession, signOut: clear, loadIsland, createIsland, saveIsland, recordActivity, redeemPromoCode, get accountStatus() { return accountStatus ? { ...accountStatus } : null; } };
}
