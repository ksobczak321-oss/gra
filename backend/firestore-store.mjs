const METADATA_TOKEN = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';
export class FirestoreStoreError extends Error {
  constructor(code = 'cloud-store-unavailable', status = 503) { super(code); this.code = code; this.status = status; }
}
export function createMetadataTokenProvider({ fetch: fetcher = globalThis.fetch, now = () => Date.now() } = {}) {
  let token = null, expiresAt = 0, pending = null;
  return async () => {
    if (token && now() < expiresAt - 60000) return token;
    if (!pending) pending = (async () => {
      try {
        const response = await fetcher(METADATA_TOKEN, { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(5000), redirect: 'error' });
        const body = await response.json();
        if (!response.ok || response.headers.get('metadata-flavor') !== 'Google' || typeof body.access_token !== 'string' || !Number.isFinite(body.expires_in) || body.expires_in <= 0) throw new Error();
        token = body.access_token; expiresAt = now() + body.expires_in * 1000; return token;
      } catch { throw new FirestoreStoreError('cloud-credentials-unavailable'); }
      finally { pending = null; }
    })();
    return pending;
  };
}
function encode(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number' && Number.isFinite(value)) return Number.isSafeInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (value && typeof value === 'object') return { mapValue: { fields: fields(value) } };
  throw new TypeError('Unsupported Firestore value.');
}
const fields = value => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, encode(item)]));
function decode(value) {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
  throw new FirestoreStoreError('invalid-cloud-document');
}
const decodeFields = value => Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));

export function createFirestoreStore({ projectId, databaseId = '(default)', fetch: fetcher = globalThis.fetch, accessToken = createMetadataTokenProvider({ fetch: fetcher }), attempts = 5 } = {}) {
  if (typeof projectId !== 'string' || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId) || typeof databaseId !== 'string' || !/^[A-Za-z0-9()_-]{1,64}$/.test(databaseId)) throw new TypeError('A valid Firestore project and database are required.');
  const database = `projects/${projectId}/databases/${databaseId}`, root = `https://firestore.googleapis.com/v1/${database}/documents`;
  const docName = path => {
    if (typeof path !== 'string' || !/^(?:[A-Za-z0-9:_-]+\/)+[A-Za-z0-9:_-]+$/.test(path)) throw new TypeError('Invalid document path.');
    return `${database}/documents/${path}`;
  };
  async function request(url, options = {}) {
    let response, body;
    try {
      response = await fetcher(url, { ...options, headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', ...(options.headers || {}) }, signal: AbortSignal.timeout(15000), redirect: 'error' });
      body = await response.json();
    } catch (error) { if (error instanceof FirestoreStoreError) throw error; throw new FirestoreStoreError(); }
    return { response, body };
  }
  const bodyOptions = body => ({ method: 'POST', body: JSON.stringify(body) });
  async function runTransaction(work) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const opened = await request(`${root}:beginTransaction`, bodyOptions({ options: { readWrite: {} } }));
      if (!opened.response.ok || typeof opened.body.transaction !== 'string') throw new FirestoreStoreError();
      const transaction = opened.body.transaction, reads = new Map(), writes = new Map();
      let wrote = false;
      try {
        const result = await work({
          get: async path => {
            if (wrote) throw new TypeError('Firestore reads must precede transaction writes.');
            docName(path);
            if (reads.has(path)) return structuredClone(reads.get(path).data);
            const fetched = await request(`${root}/${path}?transaction=${encodeURIComponent(transaction)}`);
            if (fetched.response.status === 404) { reads.set(path, { data: undefined, updateTime: null }); return undefined; }
            if (!fetched.response.ok || fetched.body.name !== docName(path) || typeof fetched.body.updateTime !== 'string') throw new FirestoreStoreError();
            const data = decodeFields(fetched.body.fields || {});
            reads.set(path, { data, updateTime: fetched.body.updateTime }); return structuredClone(data);
          },
          set: async (path, value) => { docName(path); if (!reads.has(path) && path.split('/').length === 2) throw new TypeError('Read an existing root document before replacing it.'); wrote = true; writes.set(path, { update: { name: docName(path), fields: fields(value) } }); },
          delete: async path => { docName(path); if (!reads.has(path)) throw new TypeError('Read a document before deleting it.'); wrote = true; writes.set(path, { delete: docName(path) }); }
        });
        const commitWrites = [...writes].map(([path, write]) => ({ ...write, currentDocument: reads.get(path)?.updateTime ? { updateTime: reads.get(path).updateTime } : { exists: false } }));
        const committed = await request(`${root}:commit`, bodyOptions({ transaction, writes: commitWrites }));
        if (committed.response.ok) return result;
        if (committed.body.error?.status === 'ABORTED' || committed.response.status === 409 || committed.body.error?.status === 'FAILED_PRECONDITION') {
          if (attempt + 1 < attempts) { await new Promise(resolve => setTimeout(resolve, Math.min(100, 10 * 2 ** attempt))); continue; }
          throw new FirestoreStoreError('cloud-transaction-conflict', 409);
        }
        throw new FirestoreStoreError();
      } catch (error) {
        try { await request(`${root}:rollback`, bodyOptions({ transaction })); } catch { /* Preserve the original failure. */ }
        throw error;
      }
    }
    throw new FirestoreStoreError('cloud-transaction-conflict', 409);
  }
  async function listAccounts({ before, limit, cursor = null }) {
    const filters = [{ fieldFilter: { field: { fieldPath: 'lastPlayedAt' }, op: 'LESS_THAN', value: { integerValue: String(before) } } }];
    const structuredQuery = { from: [{ collectionId: 'accounts' }], where: filters[0], orderBy: [{ field: { fieldPath: 'lastPlayedAt' }, direction: 'ASCENDING' }, { field: { fieldPath: '__name__' }, direction: 'ASCENDING' }], limit };
    if (cursor) {
      let parsed; try { parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')); } catch { throw new TypeError('Invalid scan cursor.'); }
      if (!Number.isSafeInteger(parsed.lastPlayedAt) || typeof parsed.name !== 'string' || !parsed.name.startsWith(`${database}/documents/accounts/`)) throw new TypeError('Invalid scan cursor.');
      structuredQuery.startAt = { values: [{ integerValue: String(parsed.lastPlayedAt) }, { referenceValue: parsed.name }], before: false };
    }
    const queried = await request(`${root}:runQuery`, bodyOptions({ structuredQuery }));
    if (!queried.response.ok || !Array.isArray(queried.body)) throw new FirestoreStoreError();
    const documents = queried.body.filter(row => row.document).map(row => row.document);
    const accounts = documents.map(document => ({ uid: document.name.split('/').at(-1), ...decodeFields(document.fields || {}) }));
    const last = documents.at(-1), next = documents.length === limit ? Buffer.from(JSON.stringify({ name: last.name, lastPlayedAt: accounts.at(-1).lastPlayedAt })).toString('base64url') : null;
    return { accounts, cursor: next };
  }
  // The expiry range and ordering use one automatically indexed field plus
  // document name. Old OPEN offers cannot clog page one indefinitely, and no
  // composite status/expiry index or mutation during GET is required.
  // This adapter never accepts arbitrary collection paths or filter fields.
  function pageCursor(cursor, prefix) {
    if (cursor === null) return null;
    if (typeof cursor !== 'string' || cursor.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new TypeError('Invalid trade cursor.');
    let name; try { name = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')).name; } catch { throw new TypeError('Invalid trade cursor.'); }
    if (typeof name !== 'string' || !name.startsWith(prefix) || !/^trade_[a-f0-9]{40}$/.test(name.slice(prefix.length))) throw new TypeError('Invalid trade cursor.');
    return name;
  }
  async function listTradeOffers({ limit = 50, cursor = null, at } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw new TypeError('Invalid trade page size.');
    if (!Number.isSafeInteger(at) || at < 0) throw new TypeError('Invalid trade query clock.');
    const prefix = `${database}/documents/playerTradeOffers/`, start = pageCursor(cursor, prefix);
    const structuredQuery = { from: [{ collectionId: 'playerTradeOffers' }],
      where: { fieldFilter: { field: { fieldPath: 'expiresAt' }, op: 'GREATER_THAN', value: { integerValue: String(at) } } },
      orderBy: [{ field: { fieldPath: 'expiresAt' }, direction: 'ASCENDING' }, { field: { fieldPath: '__name__' }, direction: 'ASCENDING' }], limit };
    if (start) {
      const expiresAt = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')).expiresAt;
      if (!Number.isSafeInteger(expiresAt) || expiresAt < 0) throw new TypeError('Invalid trade cursor expiry.');
      structuredQuery.startAt = { values: [{ integerValue: String(expiresAt) }, { referenceValue: start }], before: false };
    }
    const queried = await request(`${root}:runQuery`, bodyOptions({ structuredQuery }));
    if (!queried.response.ok || !Array.isArray(queried.body)) throw new FirestoreStoreError();
    const documents = queried.body.filter(row => row.document).map(row => row.document);
    if (documents.some(document => !document.name?.startsWith(prefix) || !/^trade_[a-f0-9]{40}$/.test(document.name.slice(prefix.length)))) throw new FirestoreStoreError('invalid-cloud-document');
    const offers = documents.map(document => decodeFields(document.fields || {}));
    if (offers.some(offer => !Number.isSafeInteger(offer.expiresAt) || offer.expiresAt <= at)) throw new FirestoreStoreError('invalid-cloud-document');
    return { offers, cursor: documents.length === limit ? Buffer.from(JSON.stringify({ name: documents.at(-1).name, expiresAt: offers.at(-1).expiresAt })).toString('base64url') : null };
  }
  async function listTradeInbox({ uid, limit = 50, cursor = null } = {}) {
    if (typeof uid !== 'string' || !/^[A-Za-z0-9:_-]{1,128}$/.test(uid) || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw new TypeError('Invalid trade inbox page.');
    const prefix = `${database}/documents/accounts/${uid}/tradeInbox/`, start = pageCursor(cursor, prefix);
    const structuredQuery = { from: [{ collectionId: 'tradeInbox' }], orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }], limit };
    if (start) structuredQuery.startAt = { values: [{ referenceValue: start }], before: false };
    const queried = await request(`${root}/accounts/${uid}:runQuery`, bodyOptions({ structuredQuery }));
    if (!queried.response.ok || !Array.isArray(queried.body)) throw new FirestoreStoreError();
    const documents = queried.body.filter(row => row.document).map(row => row.document);
    if (documents.some(document => !document.name?.startsWith(prefix) || !/^trade_[a-f0-9]{40}$/.test(document.name.slice(prefix.length)))) throw new FirestoreStoreError('invalid-cloud-document');
    return { items: documents.map(document => decodeFields(document.fields || {})), cursor: documents.length === limit ? Buffer.from(JSON.stringify({ name: documents.at(-1).name })).toString('base64url') : null };
  }
  return { runTransaction, listAccounts, listTradeOffers, listTradeInbox };
}
