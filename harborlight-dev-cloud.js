// Firebase owns credentials and verifies access to the UID-scoped documents.
// Hosting selects the isolated project; runtime Firebase config never contains secrets.
import { validateIslandName } from './harborlight-v1-profile.js?v=frontend-v24-2';
import { LEGAL_DOCUMENTS, validLegalAcceptance } from './harborlight-legal.js?v=legal-v3';
export const DEV_PROJECT = 'harborlight-dev';
export const PROD_PROJECT = 'harborlight-prod';
export const PROD_SESSION_KEY = 'harborlight-prod-auth-v1';
export const DEV_USERS = Object.freeze(['admin1', 'admin2', 'admin3'].map(login =>
  Object.freeze({ login, uid: `dev-${login}`, email: `${login}@dev.harborlight.pl` })));
export const SESSION_KEY = 'harborlight-dev-auth-v1';
// Authentication metadata only: closing/suspending a browser must not reset
// the existing 30-minute idle deadline. No island data lives in this record.
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60_000 + 30_000;
const HOST_PROJECTS = new Map([
  [`${DEV_PROJECT}.web.app`, DEV_PROJECT], [`${DEV_PROJECT}.firebaseapp.com`, DEV_PROJECT],
  [`${PROD_PROJECT}.web.app`, PROD_PROJECT], [`${PROD_PROJECT}.firebaseapp.com`, PROD_PROJECT],
  ['harborlight.pl', PROD_PROJECT], ['www.harborlight.pl', PROD_PROJECT]
]);
const MAX_PAYLOAD_BYTES = 14_000_000;
const MAX_WORLD_DOCUMENT_BYTES = 700_000;
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
  'legal-required': 'Przed ukończeniem rejestracji zaakceptuj Regulamin i potwierdź zapoznanie się z Polityką prywatności.',
  'legal-outdated': 'Wersja dokumentów zmieniła się. Odśwież stronę i przeczytaj aktualne dokumenty.',
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
  'unsupported-promotion-verification': 'Ten kod wymaga niepodłączonej weryfikacji Facebooka.',
  'trade-api-unavailable': 'Handel między graczami wymaga aktywnej usługi serwerowej.',
  'trade-invalid-offer': 'Oferta handlowa jest nieprawidłowa.',
  'trade-invalid-island': 'Wybierz dostępną wyspę.',
  'trade-storage-full': 'Brakuje miejsca na towary z wymiany. Zwolnij miejsce w magazynie.',
  'trade-level-required': 'Handel między graczami jest dostępny od poziomu Ratusza 6.',
  'trade-insufficient-stock': 'Brakuje dostępnych towarów. Rezerwacje budowy i zapas żywności są chronione.',
  'trade-own-offer': 'Nie można przyjąć własnej oferty.',
  'trade-not-owner': 'Możesz anulować tylko własną ofertę.',
  'trade-offer-not-found': 'Ta oferta nie jest już dostępna. Odśwież listę.',
  'trade-offer-closed': 'Ta oferta została już zakończona. Odśwież listę.',
  'trade-offer-expired': 'Oferta wygasła. Właściciel może odebrać zwrot towarów.',
  'trade-too-many-offers': 'Możesz mieć najwyżej 10 otwartych ofert. Najpierw zakończ wcześniejsze.',
  'trade-request-reused': 'To potwierdzenie dotyczy innej operacji. Odśwież listę ofert.',
  'trade-same-material': 'Wybierz dwa różne materiały do wymiany.',
  'trade-world-changed': 'Wyspa powiązana z tą ofertą została zmieniona. Towary nie zostaną dopisane do innego świata.',
  'trade-island-unavailable': 'Wyspa powiązana z wymianą jest niedostępna.',
  'trade-inbox-not-found': 'Ten zwrot nie jest dostępny lub został już odebrany.',
  'trade-invalid-material': 'Wybierz materiał i dodatnią, całkowitą liczbę sztuk.',
  'trade-invalid-request': 'Nieprawidłowe potwierdzenie operacji wymiany.',
  'trade-invalid-cursor': 'Nie można odczytać kolejnej strony. Odśwież listę.',
  'trade-invalid-limit': 'Nieprawidłowy rozmiar strony ofert.',
  'trade-return-exists': 'Zwrot tej oferty jest już zapisany. Sprawdź towary oczekujące na odbiór.',
  'second-island-locked': 'Założenie kolejnej wyspy wymaga potwierdzonego odpowiedniego poziomu Ratusza na wyspie macierzystej.',
  'archipelago-island-loss': 'Zapis nie może usunąć żadnej istniejącej wyspy archipelagu.',
  'unverified-ship-capacity': 'Zwiększenie pojemności wymaga potwierdzenia operatora płatności. Prawdziwe płatności nie są jeszcze włączone.'
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

const ISLAND_RESOURCE_IDS = ['coins', 'wood', 'stone', 'grain', 'food', 'planks'];
const ISLAND_BUILDING_IDS = ['townhall', 'house', 'warehouse', 'farm', 'windmill', 'lumber', 'sawmill', 'quarry', 'dock', 'market', 'chapel', 'lighthouse'];
function validWorld(island) {
    if (!isObject(island) || !Number.isSafeInteger(island.version) || island.version < 1 || island.version > 9 ||
        !isObject(island.resources) || !isObject(island.buildings) ||
        !Number.isSafeInteger(island.population) || island.population < 0) return false;
    // Normalization intentionally supplies newly introduced legacy fields.
    // A partial current save must never silently turn into a starter instead.
    const resources = island.version <= 3 ? ISLAND_RESOURCE_IDS.filter(id => id !== 'grain') : ISLAND_RESOURCE_IDS;
    if (!resources.every(id => Number.isFinite(island.resources[id]) && island.resources[id] >= 0 && island.resources[id] <= Number.MAX_SAFE_INTEGER)) return false;
    const requiredBuildings = island.version >= 8 ? ISLAND_BUILDING_IDS : ['townhall', 'house', 'warehouse'];
    if (!requiredBuildings.every(id => isObject(island.buildings[id]))) return false;
    for (const id of ISLAND_BUILDING_IDS) {
      if (island.buildings[id] === undefined) continue;
      const building = island.buildings[id];
      if (!isObject(building) || !Number.isSafeInteger(building.level) ||
          building.level < (id === 'townhall' ? 1 : 0) || building.level > 100) return false;
    }
    const anchor = island.lastSimulatedAt ?? island.savedAt;
    return island.version < 8 || Number.isFinite(anchor) && anchor >= 0 && anchor <= Number.MAX_SAFE_INTEGER;
}
export function validIslandPayload(payload) {
  if (typeof payload !== 'string' || new TextEncoder().encode(payload).byteLength > MAX_PAYLOAD_BYTES) return false;
  try {
    const island = JSON.parse(payload);
    if (!validWorld(island)) return false;
    const group = island.archipelago;
    if (group === undefined) return new TextEncoder().encode(payload).byteLength <= MAX_WORLD_DOCUMENT_BYTES;
    if (!isObject(group) || ![1,2].includes(group.version) || !/^island-(?:[1-9]|1[0-9]|20)$/.test(group.activeIslandId) ||
        !Number.isSafeInteger(group.shipCapacity) || group.shipCapacity < 1000 || !Array.isArray(group.transfers)) return false;
    const children = group.version === 1 ? (group.secondIsland === null ? {} : { 'island-2': group.secondIsland }) : group.islands;
    if (!isObject(children) || Object.keys(children).length > 19) return false;
    const ids = Object.keys(children).sort((a,b) => Number(a.slice(7))-Number(b.slice(7)));
    if (ids.some((id,index) => id !== `island-${index+2}`)) return false;
    if (Object.values(children).some(world => !validWorld(world) || world.archipelago !== undefined || new TextEncoder().encode(JSON.stringify(world)).byteLength > MAX_WORLD_DOCUMENT_BYTES)) return false;
    const primary = { ...island, archipelago: { ...group, ...(group.version === 2 ? { islands: {} } : {}) } };
    if (new TextEncoder().encode(JSON.stringify(primary)).byteLength > MAX_WORLD_DOCUMENT_BYTES) return false;
    return group.activeIslandId === 'island-1' || isObject(children[group.activeIslandId]);
  } catch { return false; }
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
  const daughterDocuments = new Map();
  let configPromise, session = null, refreshPromise = null;
  let generation = 0, islandGeneration = null, accountStatus = null, activityWrittenAt = 0;
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
    // Old sessions had no activity stamp. Their token issue time gives a
    // conservative one-time migration; an overnight token cannot renew itself.
    const lastActivityAt = parsed.lastActivityAt === undefined ?
      (Number.isFinite(claims.iat) ? claims.iat * 1000 : parsed.expiresAt - 3_600_000) : parsed.lastActivityAt;
    if (!Number.isFinite(lastActivityAt) || lastActivityAt < 0 || lastActivityAt > now() + 60_000) return null;
    // Discard unknown fields, so password-like data can never be copied back.
    return { projectId, uid: user.uid, login: user.login, idToken: parsed.idToken,
      refreshToken: parsed.refreshToken, expiresAt: parsed.expiresAt, lastActivityAt,
      ...(user.islandName ? { islandName: user.islandName } : {}) };
  }

  function store(next) {
    try { sessionStorage().setItem(sessionKey, JSON.stringify(next)); } catch { throw fail('storage'); }
    if (session?.uid !== next.uid) { islandGeneration = null; accountStatus = null; }
    if (session?.uid !== next.uid) daughterDocuments.clear();
    session = next; activityWrittenAt = next.lastActivityAt;
  }

  function clear() {
    session = null; islandGeneration = null; accountStatus = null; activityWrittenAt = 0; daughterDocuments.clear();
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
    return { projectId, uid, login: user.login, idToken, refreshToken, lastActivityAt: now(),
      expiresAt: Math.min(now() + duration * 1000, claims.exp * 1000), ...(user.islandName ? { islandName: user.islandName } : {}) };
  }

  const idleExpired = () => !!session && now() - session.lastActivityAt >= SESSION_IDLE_TIMEOUT_MS;
  function recordSessionActivity() {
    if (!session) return false;
    if (idleExpired()) { clear(); return false; }
    session.lastActivityAt = now();
    // Input may arrive every frame. Persist at most once a second; the stamp is
    // still updated in memory immediately and never renewed by a cloud save.
    if (session.lastActivityAt - activityWrittenAt >= 1000) store({ ...session });
    return true;
  }

  async function refresh(force = false) {
    requireEnabled();
    if (!session) throw fail('auth-required');
    if (idleExpired()) { clear(); throw fail('auth-required'); }
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
      // Input can occur while the refresh request is in flight. Preserve its
      // real activity stamp instead of treating token renewal as player input.
      next.lastActivityAt = session.lastActivityAt;
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

  async function registerEmail(email, password, { islandName = '', legalAcceptance = null } = {}) {
    requireEnabled();
    if (preprod) throw fail('registration-disabled');
    const normalized = String(email || '').trim().toLowerCase(), name = islandName === '' ? null : validateIslandName(islandName);
    if (!validEmail(normalized)) throw fail('invalid-email');
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw fail('weak-password');
    if (name && !name.ok) throw fail('invalid-island-name');
    if (!validLegalAcceptance(legalAcceptance)) throw fail('legal-required');
    const attempt = ++generation, settings = await config();
    const result = await request(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(settings.apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized, password, returnSecureToken: true })
    });
    if (attempt !== generation) throw fail('auth-required');
    if (!result.ok) throw authError(result);
    if (String(result.body.email || '').toLowerCase() !== normalized) throw fail('auth-required');
    store(authSession(result.body, resolveUser(result.body.localId, normalized)));
    // The normal registration flow names the cloud island after the welcome
    // screen. Do not write an empty Auth displayName or create a world here.
    if (!name) return identity();
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
    if (idleExpired()) { clear(); return null; }
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
    if (apiError && (/^(?:trade|community|charity)-[a-z-]{1,64}$/.test(apiError) || ['second-island-locked', 'archipelago-island-loss', 'unverified-ship-capacity'].includes(apiError))) throw fail(apiError);
    if (apiError && ['island-expired', 'invalid-code', 'promotion-not-started', 'promotion-ended', 'promotion-exhausted', 'unsupported-promotion-verification', 'legal-required'].includes(apiError)) throw fail(apiError);
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
    if (!isObject(island) || !validIslandPayload(island.payload) || !versionValid(island.version) ||
        !Number.isSafeInteger(island.generation) || island.generation < 0) throw fail('invalid-cloud-data');
    islandGeneration = island.generation;
    return { payload: island.payload, version: island.version, generation: islandGeneration };
  }

  async function getLegalStatus() {
    requireEnabled();
    if (!session) throw fail('auth-required');
    if (preprod) return { required: false, exempt: true };
    const result = await firestoreRequest('/api/v1/legal');
    if (!result.ok || typeof result.body.required !== 'boolean') throw fail('configuration');
    if (result.body.termsVersion !== LEGAL_DOCUMENTS.terms.version || result.body.privacyVersion !== LEGAL_DOCUMENTS.privacy.version) throw fail('legal-outdated');
    return result.body;
  }

  async function acceptLegal(acceptance) {
    requireEnabled();
    if (!session) throw fail('auth-required');
    if (!validLegalAcceptance(acceptance)) throw fail('legal-required');
    if (preprod) return { exempt: true };
    const result = await firestoreRequest('/api/v1/legal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(acceptance) });
    if (!result.ok || result.body.uid !== session.uid || result.body.termsVersion !== LEGAL_DOCUMENTS.terms.version || result.body.privacyVersion !== LEGAL_DOCUMENTS.privacy.version || !Number.isSafeInteger(result.body.acceptedAt) || result.body.acceptedAt < 0) throw fail('invalid-cloud-data');
    return result.body;
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

  async function tradeRequest(path, body = null) {
    requireEnabled();
    if (!session) throw fail('auth-required');
    await config();
    // A private Firestore island is not an auction server. Never replace a
    // missing cross-account service with local/fictitious counterparties.
    if (!accountApiEnabled) throw fail('trade-api-unavailable');
    const result = await firestoreRequest(path, body === null ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!result.ok || !isObject(result.body)) throw fail('trade-api-unavailable');
    return result.body;
  }
  async function requestGameService(path, body = null) {
    if (typeof path !== 'string' || !/^\/api\/v1\/(?:community|charity)(?:\/[A-Za-z0-9_-]+)*(?:\?[A-Za-z0-9_=&%.-]*)?$/.test(path)) throw fail('invalid-state');
    return tradeRequest(path, body);
  }
  function tradeId(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) throw fail('trade-invalid-offer');
    return value;
  }
  const tradeCursor = cursor => {
    if (cursor === null || cursor === undefined) return null;
    if (typeof cursor !== 'string' || cursor.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw fail('trade-invalid-cursor');
    return cursor;
  };
  const listTradeOffers = ({ islandId = 'island-1', cursor = null } = {}) => {
    if (!/^island-(?:[1-9]|1[0-9]|20)$/.test(islandId)) throw fail('trade-invalid-island');
    const params = new URLSearchParams({ islandId });
    const next = tradeCursor(cursor); if (next) params.set('cursor', next);
    return tradeRequest(`/api/v1/trade/offers?${params}`);
  };
  const tradeMutation = (path, body) => {
    if (!isObject(body)) throw fail('trade-invalid-offer');
    return tradeRequest(path, body);
  };
  const createTradeOffer = body => tradeMutation('/api/v1/trade/offers', body);
  const listTradeReturns = ({ cursor = null } = {}) => {
    const next = tradeCursor(cursor);
    return tradeRequest('/api/v1/trade/inbox' + (next ? `?cursor=${encodeURIComponent(next)}` : ''));
  };
  const acceptTradeOffer = (id, body) => tradeMutation(`/api/v1/trade/offers/${tradeId(id)}/accept`, body);
  const cancelTradeOffer = (id, body) => tradeMutation(`/api/v1/trade/offers/${tradeId(id)}/cancel`, body);
  const claimTradeReturn = (id, body) => tradeMutation(`/api/v1/trade/inbox/${tradeId(id)}/claim`, body);

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
    if (result.status === 404) { daughterDocuments.clear(); return null; }
    const document = result.body, fields = document.fields || {};
    const revision = Number(fields.revision?.integerValue), schemaVersion = Number(fields.schemaVersion?.integerValue);
    let payload = fields.payload?.stringValue;
    if (document.name !== name || ![1,2].includes(schemaVersion) || !integer(revision) || typeof payload !== 'string' || !timestamp(document.updateTime)) throw fail('invalid-cloud-data');
    const loaded = new Map();
    if (schemaVersion === 2) {
      const ids = (fields.worldIds?.arrayValue?.values || []).map(item => item.stringValue);
      if (ids.length > 19 || new Set(ids).size !== ids.length || ids.some(id => !/^island-(?:[2-9]|1[0-9]|20)$/.test(id))) throw fail('invalid-cloud-data');
      let state; try { state = JSON.parse(payload); } catch { throw fail('invalid-cloud-data'); }
      if (state.archipelago?.version !== 2 || !isObject(state.archipelago.islands) || Object.keys(state.archipelago.islands).length) throw fail('invalid-cloud-data');
      const rootGeneration = Number(fields.generation?.integerValue || 1);
      for (const id of ids) {
        const childName = `${name}/worlds/${id}`;
        const found = await firestoreRequest(`https://firestore.googleapis.com/v1/${childName}`);
        const child = found.body, text = child.fields?.payload?.stringValue;
        if (!found.ok || child.name !== childName || typeof text !== 'string' || new TextEncoder().encode(text).byteLength > MAX_WORLD_DOCUMENT_BYTES || Number(child.fields?.generation?.integerValue) !== rootGeneration || !timestamp(child.updateTime)) throw fail('invalid-cloud-data');
        let world; try { world = JSON.parse(text); } catch { throw fail('invalid-cloud-data'); }
        if (!validWorld(world) || world.archipelago !== undefined) throw fail('invalid-cloud-data');
        loaded.set(id, { payload: text, updateTime: child.updateTime }); state.archipelago.islands[id] = world;
      }
      // Separate REST document GETs have no shared snapshot. Confirm that the
      // account CAS did not change while fetching daughters; all writers update
      // that root atomically with their dirty children. Never admit a mixture
      // of an old mother and newly committed daughter into the running game.
      if (ids.length) {
        const confirmed = await firestoreRequest(`https://firestore.googleapis.com/v1/${name}`);
        if (!confirmed.ok || confirmed.body.name !== name || confirmed.body.updateTime !== document.updateTime || Number(confirmed.body.fields?.revision?.integerValue) !== revision) throw fail('conflict');
      }
      payload = JSON.stringify(state);
    }
    if (!validIslandPayload(payload)) throw fail('invalid-cloud-data');
    islandGeneration = Number(fields.generation?.integerValue || 1);
    if (!Number.isSafeInteger(islandGeneration) || islandGeneration < 1) throw fail('invalid-cloud-data');
    daughterDocuments.clear(); for (const [id,item] of loaded) daughterDocuments.set(id,item);
    return { payload, version: { revision, updateTime: document.updateTime } };
  }

  async function saveIsland(payload, version = null) {
    requireEnabled();
    if (!session) throw fail('auth-required');
    if (!validIslandPayload(payload) || (version !== null && !versionValid(version)) ||
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
    const world = JSON.parse(payload), rootName = `${DATABASE}/documents/islands/${session.uid}`;
    const children = world.archipelago?.version === 2 ? world.archipelago.islands : null;
    if (!children && daughterDocuments.size) throw fail('archipelago-island-loss');
    const writes = [], nextDaughters = new Map(), generation = islandGeneration || 1;
    if (children) {
      for (const [id, child] of Object.entries(children)) {
        const text = JSON.stringify(child), previous = daughterDocuments.get(id);
        if (new TextEncoder().encode(text).byteLength > MAX_WORLD_DOCUMENT_BYTES) throw fail('invalid-state');
        nextDaughters.set(id, { payload: text, updateTime: previous?.updateTime });
        if (previous?.payload === text) continue;
        writes.push({ update: { name: `${rootName}/worlds/${id}`, fields: {
          payload: { stringValue: text }, generation: { integerValue: String(generation) }
        } }, currentDocument: previous ? { updateTime: previous.updateTime } : { exists: false } });
      }
      if ([...daughterDocuments.keys()].some(id => !Object.hasOwn(children,id))) throw fail('archipelago-island-loss');
      world.archipelago.islands = {};
    }
    const rootPayload = JSON.stringify(world);
    if (new TextEncoder().encode(rootPayload).byteLength > MAX_WORLD_DOCUMENT_BYTES) throw fail('invalid-state');
    writes.unshift({ update: { name: rootName, fields: {
      schemaVersion: { integerValue: children ? '2' : '1' }, revision: { integerValue: String(revision) },
      payload: { stringValue: rootPayload }, ...(children ? { generation: { integerValue: String(generation) }, worldIds: { arrayValue: { values: Object.keys(children).map(id => ({ stringValue:id })) } } } : {})
    } }, currentDocument: version ? { updateTime: version.updateTime } : { exists: false },
    updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] });
    const result = await firestoreRequest(`${FIRESTORE}:commit`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
    const updateTime = result.body.writeResults?.[0]?.updateTime;
    if (!result.ok || result.body.writeResults?.length !== writes.length || !timestamp(updateTime)) throw fail('invalid-cloud-data');
    let writeIndex = 1;
    for (const [id,item] of nextDaughters) {
      if (daughterDocuments.get(id)?.payload !== item.payload) item.updateTime = result.body.writeResults[writeIndex++]?.updateTime;
      if (!timestamp(item.updateTime)) throw fail('invalid-cloud-data');
    }
    daughterDocuments.clear(); for (const [id,item] of nextDaughters) daughterDocuments.set(id,item);
    return { revision, updateTime };
  }

  return { enabled, preprod, projectId, environment, sessionKey, get accountApiEnabled() { return accountApiEnabled; },
    get lastSessionActivityAt() { return session?.lastActivityAt ?? null; }, get sessionIdleExpired() { return idleExpired(); },
    recordSessionActivity, signIn, registerEmail, acceptExternalSession, getPublicConfig: config, getProfile, getLegalStatus, acceptLegal, restoreSession, signOut: clear, loadIsland, createIsland, saveIsland, recordActivity, redeemPromoCode,
    requestGameService, listTradeOffers, listTradeReturns, createTradeOffer, acceptTradeOffer, cancelTradeOffer, claimTradeReturn,
    get accountStatus() { return accountStatus ? { ...accountStatus } : null; } };
}
