import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createAccountService } from '../account-service.mjs';
import { createCommunityService } from '../community-service.mjs';
import { createServer, createStarterIsland } from '../server.mjs';
import { createHttpCommunityClient } from '../../harborlight-v1-community-client.js';

const NOW = Date.parse('2026-11-10T18:00:00Z');
const USERS = ['dev-admin1', 'dev-admin2', 'dev-admin3'];
class Store {
  records = new Map(); tail = Promise.resolve();
  runTransaction(work) {
    const pending = this.tail.then(async () => {
      const records = structuredClone(this.records); let wrote = false;
      const result = await work({
        get: async key => { assert.equal(wrote, false, 'Firestore reads precede every write'); return structuredClone(records.get(key)); },
        set: async (key, value) => { wrote = true; records.set(key, structuredClone(value)); },
        delete: async key => { wrote = true; records.delete(key); }
      });
      this.records = records; return result;
    });
    this.tail = pending.catch(() => {}); return pending;
  }
}
function seed() {
  const store = new Store();
  for (const [index, uid] of USERS.entries()) {
    const state = JSON.parse(createStarterIsland(NOW));
    state.islandName = ['Dom', 'Przystań', 'Wichrowa'][index];
    store.records.set(`islands/${uid}`, { payload: JSON.stringify(state), generation: 1, revision: 7, updatedAt: NOW });
  }
  return store;
}
async function start(t, store) {
  const service = createCommunityService({ store, environment: 'preprod', now: () => NOW });
  const server = createServer({ environment: 'preprod', now: () => NOW,
    accountService: createAccountService({ store, environment: 'preprod', now: () => NOW }), communityService: service,
    verifyIdentityToken: async token => {
      const index = ['token-one', 'token-two', 'token-three'].indexOf(token);
      if (index < 0) throw Object.assign(new Error(), { code: 'auth-required', status: 401 });
      return { uid: USERS[index] };
    }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const stop = () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
  t.after(stop);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const clients = ['token-one', 'token-two', 'token-three'].map(token => createHttpCommunityClient({ baseUrl, getToken: () => token }));
  return { service, clients, baseUrl, stop };
}

test('DEV directory discovers only existing test worlds without requiring three nickname forms', async () => {
  const store = seed(), before = USERS.map(uid => structuredClone(store.records.get(`islands/${uid}`)));
  const service = createCommunityService({ store, environment: 'preprod', now: () => NOW });
  const result = await service.snapshot({ uid: USERS[0] });
  assert.equal(result.self.name, 'Dom'); assert.equal(result.self.needsProfile, undefined);
  assert.deepEqual(result.players.map(player => player.name), ['Przystań', 'Wichrowa']);
  for (const player of [result.self, ...result.players]) assert.match(player.id, /^u_[a-f0-9]{24}$/);
  assert.equal(JSON.stringify(result).includes('dev-admin'), false);
  assert.equal(JSON.stringify(result).includes('resources'), false);
  assert.deepEqual(USERS.map(uid => store.records.get(`islands/${uid}`)), before, 'community bootstrap never rewrites island bytes or revisions');
  await service.dispatch({ uid: USERS[0], command: 'profile', name: 'Latarnik', requestId: 'nickname_request' });
  await service.ensureProfile({ uid: USERS[0] });
  assert.equal((await service.snapshot({ uid: USERS[0] })).self.name, 'Latarnik', 'login never overwrites a chosen public nickname');
});

test('production and missing DEV worlds do not fabricate public players', async () => {
  const store = seed(); store.records.delete(`islands/${USERS[2]}`);
  const service = createCommunityService({ store, environment: 'preprod', now: () => NOW });
  const result = await service.snapshot({ uid: USERS[0] });
  assert.equal(result.players.length, 1); assert.equal(result.players[0].name, 'Przystań');
  const productionStore = seed();
  const production = createCommunityService({ store: productionStore, now: () => NOW });
  assert.equal(await production.ensureProfile({ uid: USERS[0] }), null);
  const untouched = await production.snapshot({ uid: USERS[0] });
  assert.equal(untouched.self.needsProfile, true); assert.deepEqual(untouched.players, []);
  assert.equal([...productionStore.records.keys()].some(key => key.startsWith('community')), false);
});

test('three authenticated HTTP clients exchange private and alliance chat, leave immediately, and reconnect to durable history', async t => {
  const store = seed(), { clients, baseUrl, stop } = await start(t, store);
  for (const [index, token] of ['token-one', 'token-two', 'token-three'].entries()) {
    const response = await fetch(`${baseUrl}/api/v1/island`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    assert.equal(JSON.parse((await response.json()).island.payload).islandName, ['Dom', 'Przystań', 'Wichrowa'][index]);
  }
  const snapshots = await Promise.all(clients.map(client => client.snapshot()));
  assert.ok(snapshots.every(snapshot => snapshot.players.length === 2 && !snapshot.self.needsProfile));
  const ids = snapshots.map(snapshot => snapshot.self.id), [one, two, three] = clients;
  const sent = await one.request('chatSend', { channel: 'direct', targetId: ids[1], text: 'Spotkajmy się przy Latarni.' });
  const inbox = await two.request('chatRead', { channel: 'direct', targetId: ids[0] });
  assert.equal(inbox.messages[0].id, sent.message.id); assert.equal(inbox.messages[0].text, 'Spotkajmy się przy Latarni.');
  assert.deepEqual((await three.request('chatRead', { channel: 'direct', targetId: ids[0] })).messages, [], 'third account cannot read someone else’s direct room');
  const alliance = (await one.request('allianceCreate', { name: 'Trzy latarnie', description: 'Załoga testowa' })).alliance;
  for (const [index, client] of [[1, two], [2, three]]) {
    await client.request('allianceApply', { allianceId: alliance.id });
    assert.equal((await one.snapshot()).alliance.pending[0].id, ids[index]);
    await one.request('allianceApprove', { playerId: ids[index] });
  }
  assert.equal((await three.snapshot()).alliance.members.length, 3);
  await three.request('chatSend', { channel: 'alliance', targetId: alliance.id, text: 'Razem rozświetlimy port.' });
  for (const client of [one, two]) assert.equal((await client.request('chatRead', { channel: 'alliance', targetId: alliance.id })).messages[0].text, 'Razem rozświetlimy port.');
  await one.request('leagueEnroll');
  const league = await three.request('leagueRead');
  assert.equal(league.registered, true); assert.equal(league.groups[0][0].roster.length, 3);
  await two.request('allianceLeave');
  await assert.rejects(two.request('chatRead', { channel: 'alliance', targetId: alliance.id }), error => error.code === 'community-chat-forbidden' && error.status === 403);
  assert.equal((await one.snapshot()).alliance.members.length, 2);
  await stop();
  const restarted = await start(t, store), [reconnectedOne, reconnectedTwo, reconnectedThree] = restarted.clients;
  assert.equal((await reconnectedOne.snapshot()).alliance.members.length, 2);
  assert.equal((await reconnectedTwo.snapshot()).alliance, null);
  assert.equal((await reconnectedTwo.request('chatRead', { channel: 'direct', targetId: ids[0] })).messages[0].id, sent.message.id);
  assert.equal((await reconnectedThree.request('chatRead', { channel: 'alliance', targetId: alliance.id })).messages[0].authorId, ids[2]);
});
