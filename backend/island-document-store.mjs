// The API still exposes one revision/CAS for the account's archipelago. Storage
// uses bounded per-world documents, never one >1 MiB Firestore document. Reads
// precede all writes; unchanged daughter worlds are not rewritten by autosave.
const wrapped = new WeakMap();
const WRAPPED = Symbol.for('harborlight.island-document-store');
const rootPattern = /^islands\/[A-Za-z0-9:_-]{1,128}$/;
const daughterPattern = /^island-(?:[2-9]|1[0-9]|20)$/;
export const MAX_ARCHIPELAGO_BYTES = 14000000;
export const MAX_WORLD_DOCUMENT_BYTES = 700000;
const clone = value => structuredClone(value);
const bytes = value => Buffer.byteLength(value, 'utf8');
const invalid = () => Object.assign(new Error('invalid-island-storage'), { code: 'invalid-island-storage', status: 400 });
const childPath = (path, id) => `${path}/worlds/${id}`;

export function worldSnapshot(state, id = 'island-1') {
  return id === 'island-1' ? state : state?.archipelago?.version === 2 ? state.archipelago.islands?.[id] : id === 'island-2' ? state?.archipelago?.secondIsland : null;
}

export function createIslandDocumentStore(store) {
  if (store[WRAPPED]) return store;
  if (wrapped.has(store)) return wrapped.get(store);
  const adapter = Object.create(store);
  Object.defineProperty(adapter, WRAPPED, { value: true });
  adapter.runTransaction = work => store.runTransaction(async tx => {
    const roots = new Map();
    const read = async path => {
      if (!rootPattern.test(path)) return tx.get(path);
      if (roots.has(path)) return clone(roots.get(path).hydrated);
      const raw = await tx.get(path), children = new Map();
      let hydrated = raw;
      if (raw?.schemaVersion === 2) {
        if (!Array.isArray(raw.worldIds) || raw.worldIds.length > 19 || new Set(raw.worldIds).size !== raw.worldIds.length || raw.worldIds.some(id => !daughterPattern.test(id))) throw invalid();
        let state; try { state = JSON.parse(raw.payload); } catch { throw invalid(); }
        if (state?.archipelago?.version !== 2 || !state.archipelago.islands || typeof state.archipelago.islands !== 'object' || Array.isArray(state.archipelago.islands) || Object.keys(state.archipelago.islands).length) throw invalid();
        for (const id of raw.worldIds) {
          const child = await tx.get(childPath(path, id));
          if (!child || child.generation !== (raw.generation ?? 1) || typeof child.payload !== 'string' || bytes(child.payload) > MAX_WORLD_DOCUMENT_BYTES) throw invalid();
          let world; try { world = JSON.parse(child.payload); } catch { throw invalid(); }
          if (!world || typeof world !== 'object' || world.archipelago !== undefined) throw invalid();
          children.set(id, child); state.archipelago.islands[id] = world;
        }
        hydrated = { ...raw, payload: JSON.stringify(state) };
      }
      roots.set(path, { raw, children, hydrated });
      return clone(hydrated);
    };
    return work({ ...tx, get: read,
      set: async (path, value) => {
        if (!rootPattern.test(path)) return tx.set(path, value);
        if (!roots.has(path)) throw new TypeError('Read the archipelago before replacing it.');
        const previous = roots.get(path);
        let state; try { state = JSON.parse(value.payload); } catch { throw invalid(); }
        if (bytes(value.payload) > MAX_ARCHIPELAGO_BYTES) throw invalid();
        if (state?.archipelago?.version !== 2) {
          if (bytes(value.payload) > MAX_WORLD_DOCUMENT_BYTES) throw invalid();
          return tx.set(path, value);
        }
        const islands = state.archipelago.islands;
        if (!islands || typeof islands !== 'object' || Array.isArray(islands)) throw invalid();
        const worldIds = Object.keys(islands);
        if (worldIds.length > 19 || worldIds.some(id => !daughterPattern.test(id))) throw invalid();
        const writes = [];
        for (const id of worldIds) {
          if (!islands[id] || islands[id].archipelago !== undefined) throw invalid();
          const payload = JSON.stringify(islands[id]);
          if (bytes(payload) > MAX_WORLD_DOCUMENT_BYTES) throw invalid();
          const child = { payload, generation: value.generation ?? 1 };
          if (previous.children.get(id)?.payload !== payload || previous.children.get(id)?.generation !== child.generation) writes.push([childPath(path, id), child]);
        }
        state.archipelago.islands = {};
        const payload = JSON.stringify(state);
        if (bytes(payload) > MAX_WORLD_DOCUMENT_BYTES) throw invalid();
        await tx.set(path, { ...value, schemaVersion: 2, worldIds, payload });
        for (const [key, child] of writes) await tx.set(key, child);
        for (const id of previous.children.keys()) if (!worldIds.includes(id)) await tx.delete(childPath(path, id));
      },
      delete: async path => {
        if (rootPattern.test(path)) {
          if (!roots.has(path)) throw new TypeError('Read the archipelago before deleting it.');
          for (const id of roots.get(path).children.keys()) await tx.delete(childPath(path, id));
        }
        return tx.delete(path);
      }
    });
  });
  wrapped.set(store, adapter); wrapped.set(adapter, adapter);
  return adapter;
}
