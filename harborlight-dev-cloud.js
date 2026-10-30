// Firebase owns credentials and verifies access to the UID-scoped documents.
// This client is enabled only on the DEV Hosting origins, using runtime config.
export const DEV_PROJECT = 'harborlight-dev';
export const DEV_USERS = Object.freeze(['admin1', 'admin2', 'admin3'].map(login =>
  Object.freeze({ login, uid: `dev-${login}`, email: `${login}@dev.harborlight.pl` })));
export const SESSION_KEY = 'harborlight-dev-auth-v1';
const HOSTS = new Set([`${DEV_PROJECT}.web.app`, `${DEV_PROJECT}.firebaseapp.com`]);
const MAX_PAYLOAD_BYTES = 700_000;
const MAX_TOKEN_LENGTH = 16_000;
const DATABASE = `projects/${DEV_PROJECT}/databases/(default)`;
const FIRESTORE = `https://firestore.googleapis.com/v1/${DATABASE}/documents`;
const MESSAGES = {
  disabled: 'Konta testowe są dostępne tylko na środowisku DEV.',
  configuration: 'Logowanie DEV nie jest jeszcze skonfigurowane.',
  'invalid-login': 'Wpisz login admin1, admin2 albo admin3.',
  'invalid-credentials': 'Nieprawidłowy login lub hasło.',
  'account-disabled': 'To konto testowe jest wyłączone.',
  'rate-limited': 'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
  storage: 'Przeglądarka nie może zapisać sesji. Zezwól na pamięć lokalną.',
  'auth-required': 'Sesja wygasła. Zaloguj się ponownie.',
  permission: 'Brak dostępu do zapisu wyspy. Sprawdź konfigurację DEV.',
  offline: 'Nie można połączyć się z chmurą. Spróbuj ponownie.',
  'invalid-state': 'Nie można wysłać nieprawidłowego lub zbyt dużego zapisu.',
  'invalid-cloud-data': 'Zapis w chmurze ma nieprawidłowy format.',
  conflict: 'Wyspa została zapisana w innym oknie lub na innym urządzeniu.'
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

export function accountSaveKey(uid) {
  if (!userByUid(uid)) throw fail('invalid-login');
  return `harborlight-dev-island-${uid}`;
}

// These are consistency checks, not cryptographic verification. Auth responses
// arrive from Google over HTTPS; Firestore verifies the actual token signature.
function tokenClaims(token, uid) {
  if (!tokenString(token)) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  try {
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    return claims.aud === DEV_PROJECT && claims.iss === `https://securetoken.google.com/${DEV_PROJECT}` &&
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
  now = () => Date.now()
} = {}) {
  const enabled = HOSTS.has(hostname);
  let configPromise, session = null, refreshPromise = null;
  let generation = 0;
  const requireEnabled = () => { if (!enabled) throw fail('disabled'); };
  const identity = () => session ? { uid: session.uid, login: session.login } : null;
  // Access the browser storage getter only when a DEV session needs it. Some
  // privacy/embedded contexts throw merely from reading localStorage.
  const sessionStorage = () => storage === undefined ? globalThis.localStorage : storage;

  async function request(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetcher(url, { ...options, signal: controller.signal,
        credentials: 'omit', cache: 'no-store', redirect: 'error' });
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
      if (!result.ok || result.body.projectId !== DEV_PROJECT ||
          typeof result.body.apiKey !== 'string' || !/^[A-Za-z0-9_-]{20,100}$/.test(result.body.apiKey)) {
        throw fail('configuration');
      }
      return { apiKey: result.body.apiKey, projectNumber: String(result.body.messagingSenderId || '') };
    })().catch(error => { configPromise = null; throw error; });
    return configPromise;
  }

  function readStored() {
    let value;
    try { value = sessionStorage().getItem(SESSION_KEY); } catch { throw fail('storage'); }
    if (!value) return null;
    let parsed;
    try { parsed = JSON.parse(value); } catch { return null; }
    const user = userByUid(parsed?.uid);
    const claims = user && tokenClaims(parsed.idToken, user.uid);
    if (!user || parsed.projectId !== DEV_PROJECT || parsed.login !== user.login || !claims ||
        !tokenString(parsed.refreshToken) || !Number.isFinite(parsed.expiresAt) ||
        parsed.expiresAt < 0 || parsed.expiresAt > claims.exp * 1000) return null;
    // Discard unknown fields, so password-like data can never be copied back.
    return { projectId: DEV_PROJECT, uid: user.uid, login: user.login, idToken: parsed.idToken,
      refreshToken: parsed.refreshToken, expiresAt: parsed.expiresAt };
  }

  function store(next) {
    try { sessionStorage().setItem(SESSION_KEY, JSON.stringify(next)); } catch { throw fail('storage'); }
    session = next;
  }

  function clear() {
    session = null;
    generation++;
    try { sessionStorage().removeItem(SESSION_KEY); } catch { throw fail('storage'); }
  }

  function authError(result) {
    const provider = String(result.body.error?.message || '').split(' : ', 1)[0];
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
    const claims = tokenClaims(idToken, user.uid);
    if (uid !== user.uid || !claims || claims.exp * 1000 <= now() ||
        !tokenString(refreshToken) || !integer(duration) || duration > 86_400) throw fail('auth-required');
    return { projectId: DEV_PROJECT, uid, login: user.login, idToken, refreshToken,
      expiresAt: Math.min(now() + duration * 1000, claims.exp * 1000) };
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
      if (providerProject !== undefined && String(providerProject) !== DEV_PROJECT &&
          (!settings.projectNumber || String(providerProject) !== settings.projectNumber)) {
        clear(); throw fail('auth-required');
      }
      let next;
      try { next = authSession(result.body, userByUid(previous.uid), true); }
      catch { clear(); throw fail('auth-required'); }
      store(next);
    })().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  async function signIn(login, password) {
    requireEnabled();
    const user = DEV_USERS.find(candidate => candidate.login === String(login || '').trim().toLowerCase());
    if (!user) throw fail('invalid-login');
    if (typeof password !== 'string' || !password || password.length > 128) throw fail('invalid-credentials');
    const attempt = ++generation;
    const settings = await config();
    const result = await request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(settings.apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password, returnSecureToken: true })
    });
    if (attempt !== generation) throw fail('auth-required');
    if (!result.ok) throw authError(result);
    if (result.body.email !== user.email) throw fail('auth-required');
    store(authSession(result.body, user));
    return identity();
  }

  async function restoreSession() {
    if (!enabled) return null;
    session = readStored();
    if (!session) { clear(); return null; }
    try {
      await config();
      await refresh();
    } catch (error) {
      // An unavailable network must not switch the player's local cache to a
      // guest island. Cloud reads/writes still require a fresh Google token.
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
    if ([409, 412].includes(result.status) || result.body.error?.status === 'FAILED_PRECONDITION' ||
        result.body.error?.status === 'ALREADY_EXISTS') throw fail('conflict');
    if (result.status === 403) throw fail('permission');
    if (result.status === 429) throw fail('rate-limited');
    if (!result.ok && result.status !== 404) throw fail('offline');
    return result;
  }

  async function loadIsland() {
    requireEnabled();
    if (!session) throw fail('auth-required');
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

  return { enabled, signIn, restoreSession, signOut: clear, loadIsland, saveIsland };
}
