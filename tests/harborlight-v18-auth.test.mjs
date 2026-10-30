import test from 'node:test';
import assert from 'node:assert/strict';
import { createDevCloud, PROD_PROJECT, PROD_SESSION_KEY, accountSaveKey } from '../harborlight-dev-cloud.js';
import { signInWithProvider, facebookShareUrl, shareAchievement } from '../harborlight-auth-providers.js';

const NOW = Date.parse('2026-10-30T12:00:00Z'), UID = 'real-player-123', EMAIL = 'captain@example.invalid';
const CONFIG = { projectId: PROD_PROJECT, apiKey: 'fixture-public-api-key-123456789', messagingSenderId: '992911312434' };
const T1 = '2026-10-30T12:00:00.000Z', T2 = '2026-10-30T12:00:01.000Z';
const token = (uid = UID, project = PROD_PROJECT) => ['header', Buffer.from(JSON.stringify({ aud: project,
  iss: `https://securetoken.google.com/${project}`, sub: uid, exp: NOW / 1000 + 3600 })).toString('base64url'), 'signature'].join('.');
const reply = (body, status = 200) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
const auth = overrides => ({ localId: UID, email: EMAIL, idToken: token(), refreshToken: 'real-refresh-token', expiresIn: '3600', ...overrides });
const version = { revision: 1, updateTime: T1 };
const islandReply = (revision = 1, generation = 2) => ({ island: { payload: '{"coins":100}', version: { revision, updateTime: T1 }, generation },
  account: { generation, expired: false, lastPlayedAt: NOW } });
function harness(replies, hostname = 'harborlight-prod.web.app') {
  const values = new Map(), calls = [];
  const client = createDevCloud({ hostname, now: () => NOW,
    storage: { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) },
    fetch: async (url, options) => { calls.push({ url, options }); assert.ok(replies.length, `Unexpected request ${url}`); return replies.shift(); } });
  return { client, calls, values };
}

test('PROD email authentication is isolated from PRE-PROD and saves no password or island in browser storage', async () => {
  for (const host of ['harborlight-prod.web.app', 'harborlight-prod.firebaseapp.com', 'harborlight.pl', 'www.harborlight.pl']) {
    const h = harness([reply(CONFIG), reply(auth())], host);
    assert.equal(h.client.environment, 'prod'); assert.equal(h.client.preprod, false);
    assert.deepEqual(await h.client.signIn(EMAIL, 'captain-password'), { uid: UID, login: EMAIL });
    assert.equal(h.values.size, 1); assert.ok(h.values.has(PROD_SESSION_KEY));
    assert.ok(!JSON.stringify([...h.values]).includes('captain-password'));
    assert.equal(accountSaveKey(UID, PROD_PROJECT), 'harborlight-prod-island-' + UID);
  }
});

test('PROD accounts cannot accept the PRE-PROD Firebase project or mismatched credential identity', async () => {
  const mismatch = harness([reply({ ...CONFIG, projectId: 'harborlight-dev' })]);
  await assert.rejects(mismatch.client.signIn(EMAIL, 'captain-password'), { code: 'configuration' });
  assert.equal(mismatch.calls.length, 1);
  const badToken = harness([reply(CONFIG), reply(auth({ idToken: token(UID, 'harborlight-dev') }))]);
  await assert.rejects(badToken.client.signIn(EMAIL, 'captain-password'), { code: 'auth-required' });
  assert.equal(badToken.values.size, 0);
});

test('real registration creates an Auth account and its cloud profile without creating an island', async () => {
  const h = harness([reply(CONFIG), reply(auth()), reply({ displayName: 'HARBORLIGHT:Port Mew' })]);
  const identity = await h.client.registerEmail(EMAIL, 'captain-password', { islandName: 'Port Mew' });
  assert.equal(identity.uid, UID); assert.equal(identity.islandName, 'Port Mew');
  assert.ok(h.calls[1].url.includes('accounts:signUp'));
  assert.deepEqual(JSON.parse(h.calls[2].options.body), { idToken: token(), displayName: 'HARBORLIGHT:Port Mew', returnSecureToken: true });
  assert.ok(h.calls.every(call => !call.url.includes('/island')));
  const testProject = harness([], 'harborlight-dev.web.app');
  await assert.rejects(testProject.client.registerEmail(EMAIL, 'captain-password', { islandName: 'Port Mew' }), { code: 'registration-disabled' });
  assert.equal(testProject.calls.length, 0);
});

test('PROD island writes use the generation-aware server API and never direct client Firestore', async () => {
  const h = harness([reply(CONFIG), reply(auth()), reply(islandReply()), reply({ revision: 2, updateTime: T2, generation: 2 }), reply({ recorded: true })]);
  await h.client.signIn(EMAIL, 'captain-password');
  const loaded = await h.client.loadIsland(); assert.equal(loaded.generation, 2);
  assert.deepEqual(await h.client.saveIsland('{"coins":110}', version), { revision: 2, updateTime: T2 });
  assert.deepEqual(JSON.parse(h.calls[3].options.body), { payload: '{"coins":110}', expectedRevision: 1, generation: 2 });
  assert.equal(h.calls[3].options.method, 'PUT');
  assert.equal(h.calls[3].options.headers.Authorization, 'Bearer ' + token());
  await h.client.recordActivity(); assert.deepEqual(JSON.parse(h.calls[4].options.body), { generation: 2 });
  assert.ok(h.calls.every(call => !call.url.includes('firestore.googleapis.com')));
});

test('PROD starters are created by the server without accepting a client starter payload', async () => {
  const h = harness([reply(CONFIG), reply(auth()), reply({ island: null, account: { generation: 2, expired: true } }), reply(islandReply())]);
  await h.client.signIn(EMAIL, 'captain-password'); assert.equal(await h.client.loadIsland(), null);
  assert.equal(h.client.accountStatus.expired, true);
  const created = await h.client.createIsland(); assert.equal(created.generation, 2);
  assert.equal(h.calls[3].options.method, 'POST'); assert.equal(h.calls[3].options.body, '{}');
});

test('an unconfigured account API cannot fall back to client Firestore or a local island', async () => {
  const h = harness([reply(CONFIG), reply(auth()), reply({ error: 'account_api_disabled' }, 503)]);
  await h.client.signIn(EMAIL, 'captain-password');
  await assert.rejects(h.client.loadIsland(), { code: 'configuration' });
  assert.equal(h.calls.length, 3); assert.equal(h.values.size, 1);
});

test('OAuth credentials are accepted only after Google confirms the matching Firebase account', async () => {
  const h = harness([reply(CONFIG), reply({ users: [{ localId: UID, email: EMAIL, displayName: 'HARBORLIGHT:Port Mew' }] })]);
  assert.equal((await h.client.acceptExternalSession({ uid: UID, idToken: token(), refreshToken: 'refresh-token' })).islandName, 'Port Mew');
  const bad = harness([reply(CONFIG), reply({ users: [{ localId: 'another-player', email: EMAIL }] })]);
  await assert.rejects(bad.client.acceptExternalSession({ uid: UID, idToken: token(), refreshToken: 'refresh-token' }), { code: 'auth-required' });
  assert.equal(bad.values.size, 0);
});

function providerSdk({ error } = {}) {
  const calls = [], authInstance = {}, user = { uid: UID, refreshToken: 'oauth-refresh', getIdToken: async () => token() };
  class Provider { addScope(scope) { calls.push(['scope', scope]); } }
  return { calls, sdk: { getApps: () => [], initializeApp: (config,name) => ({ config,name }), getAuth: () => authInstance,
    inMemoryPersistence: { mode: 'memory' }, setPersistence: async (_, value) => calls.push(['persistence', value.mode]),
    GoogleAuthProvider: Provider, FacebookAuthProvider: Provider,
    signInWithPopup: async () => { calls.push(['popup']); if (error) throw error; return { user }; },
    updateProfile: async (_, profile) => calls.push(['profile', profile.displayName]), signOut: async () => calls.push(['signOut']) } };
}

test('Google and Facebook use a real SDK popup and isolated in-memory SDK persistence', async () => {
  for (const provider of ['Google', 'Facebook']) {
    const { sdk, calls } = providerSdk(); let accepted;
    const cloud = { enabled: true, preprod: false, getPublicConfig: async () => CONFIG,
      acceptExternalSession: async value => { accepted = value; return { uid: UID }; } };
    await signInWithProvider(cloud, provider, { islandName: 'Port Mew', loadSdk: async () => sdk });
    assert.equal(accepted.idToken, token()); assert.equal(accepted.refreshToken, 'oauth-refresh');
    assert.ok(calls.some(item => item[0] === 'popup')); assert.deepEqual(calls[0], ['persistence','memory']);
    assert.ok(calls.some(item => item[0] === 'profile')); assert.deepEqual(calls.at(-1), ['signOut']);
  }
});

test('unconfigured OAuth never fabricates a session on PROD or PRE-PROD', async () => {
  let accepted = 0, loaded = 0;
  const { sdk } = providerSdk({ error: { code: 'auth/operation-not-allowed' } });
  const cloud = { enabled: true, preprod: false, getPublicConfig: async () => CONFIG,
    acceptExternalSession: async () => { accepted++; } };
  await assert.rejects(signInWithProvider(cloud,'Google',{ loadSdk: async () => sdk }), { code: 'provider-configuration' });
  assert.equal(accepted, 0);
  await assert.rejects(signInWithProvider({ ...cloud, preprod: true },'Facebook',{ loadSdk: async () => { loaded++; return sdk; } }), { code: 'provider-configuration' });
  assert.equal(loaded, 1);
  assert.equal(accepted, 0);
});

test('achievement sharing requires a player action and opening a composer does not verify publication', async () => {
  const opened = [];
  const result = await shareAchievement({ title: 'Level 2', text: 'My achievement', url: 'https://harborlight.pl/' },
    { navigator: {}, open: (...args) => opened.push(args) });
  assert.deepEqual(result, { opened: true, verified: false });
  assert.equal(opened.length, 1); assert.ok(opened[0][0].startsWith('https://www.facebook.com/sharer/sharer.php?'));
  assert.equal(opened[0][2], 'noopener,noreferrer');
  for (const url of ['javascript:alert(1)','https://me:secret@harborlight.pl/','https://harborlight.pl/?idToken=private']) assert.throws(() => facebookShareUrl(url), { code: 'invalid-share-url' });
  const cancelled = await shareAchievement({ url: 'https://harborlight.pl/' }, { navigator: { share: async () => { throw { name: 'AbortError' }; } }, open: () => assert.fail('Do not open after cancellation') });
  assert.deepEqual(cancelled, { cancelled: true, verified: false });
});

test('retention and promotion errors retain their meaning instead of becoming a generic write conflict', async () => {
  for (const [code, status] of [['island-expired',410],['invalid-code',404],['promotion-ended',409],['promotion-exhausted',409]]) {
    const h = harness([reply(CONFIG), reply(auth()), reply(islandReply()), reply({ error: code }, status)]);
    await h.client.signIn(EMAIL, 'captain-password'); await h.client.loadIsland();
    await assert.rejects(h.client.redeemPromoCode('FIRST20'), { code });
  }
});

test('a successful promotion claim reloads its credited server island without applying the reward twice locally', async () => {
  const h = harness([reply(CONFIG), reply(auth()), reply(islandReply()),
    reply({ code: 'FIRST20', revision: 2, alreadyRedeemed: false }), reply(islandReply(2))]);
  await h.client.signIn(EMAIL, 'captain-password'); await h.client.loadIsland();
  const result = await h.client.redeemPromoCode(' first20 ');
  assert.equal(result.island.version.revision, 2);
  assert.deepEqual(JSON.parse(h.calls[3].options.body), { code: 'FIRST20', generation: 2 });
  assert.equal(h.calls[4].url, '/api/v1/island');
});

test('a failed profile update does not pretend that a successfully created account failed', async () => {
  const h = harness([reply(CONFIG), reply(auth()), reply({ error: { message: 'UNAVAILABLE' } }, 503)]);
  assert.equal((await h.client.registerEmail(EMAIL, 'captain-password', { islandName: 'Port Mew' })).uid, UID);
  assert.ok(h.values.has(PROD_SESSION_KEY));
});

test('PRE-PROD discovers the enabled project API and does not fall back to direct Firestore', async () => {
  const config = { ...CONFIG, projectId: 'harborlight-dev' }, uid = 'dev-admin1';
  const h = harness([reply(config), reply({ accountApi: true, projectId: 'harborlight-dev', environment: 'preprod' }),
    reply(auth({ localId: uid, email: 'admin1@dev.harborlight.pl', idToken: token(uid,'harborlight-dev') })),
    reply(islandReply()), reply({ error: 'account-service-unavailable' },503)], 'harborlight-dev.web.app');
  await h.client.signIn('admin1','admin1'); assert.equal(h.client.accountApiEnabled, true);
  assert.equal(h.calls[1].url,'/api/v1/config');
  await h.client.loadIsland(); await assert.rejects(h.client.loadIsland(),{ code:'offline' });
  assert.ok(h.calls.every(call=>!call.url.includes('firestore.googleapis.com')));
});

test('PRE-PROD disabled API discovery retains its existing Firestore island without creating or resetting it', async () => {
  const config = { ...CONFIG, projectId: 'harborlight-dev' }, uid = 'dev-admin1';
  const name = 'projects/harborlight-dev/databases/(default)/documents/islands/' + uid;
  const h = harness([reply(config), reply({ error:'account_api_disabled' },503),
    reply(auth({ localId: uid, email:'admin1@dev.harborlight.pl', idToken:token(uid,'harborlight-dev') })),
    reply({ name,fields:{schemaVersion:{integerValue:'1'},revision:{integerValue:'7'},payload:{stringValue:'{"coins":777}'}},updateTime:T1 })], 'harborlight-dev.web.app');
  await h.client.signIn('admin1','admin1'); const loaded = await h.client.loadIsland();
  assert.equal(h.client.accountApiEnabled,false); assert.equal(loaded.payload,'{"coins":777}'); assert.equal(loaded.version.revision,7);
  assert.equal(h.calls.at(-1).options.method,undefined);
});

test('PRE-PROD OAuth accepts only a permanent UID confirmed by Google and keeps registration closed', async () => {
  const project='harborlight-dev',uid='dev-admin2';
  const h=harness([reply({...CONFIG,projectId:project}),reply({error:'account_api_disabled'},503),
    reply({users:[{localId:uid,email:'admin2@dev.harborlight.pl'}]})],'harborlight-dev.web.app');
  assert.deepEqual(await h.client.acceptExternalSession({uid,idToken:token(uid,project),refreshToken:'linked-provider-refresh'}),{uid,login:'admin2'});
  const unknown=harness([],'harborlight-dev.web.app');
  await assert.rejects(unknown.client.acceptExternalSession({uid:UID,idToken:token(UID,project),refreshToken:'unknown-provider-refresh'}),{code:'invalid-login'});
  assert.equal(unknown.calls.length,0);
  await assert.rejects(h.client.registerEmail(EMAIL,'captain-password',{islandName:'Port Mew'}),{code:'registration-disabled'});
});

test('PRE-PROD provider linking explicitly signs into the existing UID instead of creating a new game account', async () => {
  const calls=[],user={uid:'dev-admin1',refreshToken:'linked-refresh',getIdToken:async()=>token('dev-admin1','harborlight-dev')};
  class Provider { addScope(){} }
  const sdk={getApps:()=>[],initializeApp:()=>({}),getAuth:()=>({}),inMemoryPersistence:{},setPersistence:async()=>{},
    GoogleAuthProvider:Provider,FacebookAuthProvider:Provider,
    signInWithEmailAndPassword:async(_,email,password)=>{calls.push(['password',email,password]);return{user};},
    linkWithPopup:async(existing)=>{assert.equal(existing.uid,'dev-admin1');calls.push(['link']);return{user};},
    signInWithPopup:async()=>assert.fail('Linking must use the authenticated existing UID'),signOut:async()=>{}};
  let accepted;
  const cloud={enabled:true,preprod:true,getPublicConfig:async()=>({...CONFIG,projectId:'harborlight-dev'}),acceptExternalSession:async value=>{accepted=value;return{uid:value.uid};}};
  await signInWithProvider(cloud,'Google',{testLogin:'admin1',testPassword:'admin1',loadSdk:async()=>sdk});
  assert.equal(accepted.uid,'dev-admin1');assert.deepEqual(calls,[['password','admin1@dev.harborlight.pl','admin1'],['link']]);
});
