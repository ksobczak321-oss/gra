// Authenticated Kingdom API bridge. It keeps the coordinator's CAS revision
// current and restores server effects before accepting another game action.
const operations = new WeakMap();
const confirmations = new WeakMap();
const error = code => Object.assign(new Error(code), { code });
const newRequestId = () => globalThis.crypto?.randomUUID?.() || `kingdom_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export async function kingdomServiceAction({ cloud, coordinator, getPayload, restore, action = null } = {}) {
  return accountServiceAction({ cloud, coordinator, getPayload, restore, action, path: '/api/v1/kingdom' });
}

export async function giftServiceAction({ cloud, coordinator, getPayload, restore, action = null } = {}) {
  return accountServiceAction({ cloud, coordinator, getPayload, restore, action, path: '/api/v1/gifts' });
}

async function accountServiceAction({ cloud, coordinator, getPayload, restore, action, path }) {
  if (!cloud?.local || !coordinator || typeof getPayload !== 'function' || typeof restore !== 'function') throw error('kingdom-api-unavailable');
  const previous = operations.get(coordinator) || Promise.resolve();
  const operation = previous.catch(() => {}).then(async () => {
    if (!coordinator.writable || !coordinator.queue(getPayload()) || !await coordinator.flush()) throw error(coordinator.status || 'offline');
    let body = null, key = null;
    if (action) {
      const pending = confirmations.get(coordinator) || new Map(); confirmations.set(coordinator, pending);
      key = path + JSON.stringify(action);
      const requestId = action.requestId || pending.get(key) || newRequestId(); pending.set(key, requestId);
      const payload = JSON.parse(coordinator.confirmedPayload);
      body = { action: { ...action, requestId }, requestId, expectedRevision: coordinator.version.revision, generation: payload.islandGeneration || cloud.accountStatus?.generation };
    }
    let response;
    try {
      response = await cloud.requestGameService(path, body);
      if (!response?.island || typeof response.island.payload !== 'string' || !response.status) throw error('invalid-cloud-data');
      // reloadCloud also updates the private coordinator revision. Do not
      // merely overwrite the screen while leaving its next save on old CAS.
      const confirmed = await coordinator.reloadCloud();
      await restore(confirmed, { reason: 'kingdom' });
      if (key) confirmations.get(coordinator)?.delete(key);
      return { ...(response.result || { ok: true, message: path === '/api/v1/gifts' ? 'Wczytano darowizny.' : 'Wczytano sprawy Królestwa.' }), status: response.status, island: response.island };
    } catch (failure) {
      // An uncertain response might follow a committed action. Re-read first;
      // a retry preserves the same confirmation ID and cannot pay twice.
      try { await restore(await coordinator.reloadCloud(), { reason: 'kingdom-recovery' }); } catch { /* reloadCloud already pauses failed saves. */ }
      throw failure;
    }
  });
  operations.set(coordinator, operation);
  try { return await operation; } finally { if (operations.get(coordinator) === operation) operations.delete(coordinator); }
}
