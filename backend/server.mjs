import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createAccountService, AccountServiceError } from './account-service.mjs';
import { createFirestoreStore } from './firestore-store.mjs';
import { createFirebaseIdentityVerifier } from './firebase-auth.mjs';
import { createPlayerTradeService } from './player-trade.mjs';
import { createCommunityService } from './community-service.mjs';
import { createCharityService } from './charity-service.mjs';
import { createCharityLedgerStore } from './charity-ledger.mjs';
import { createIslandDocumentStore } from './island-document-store.mjs';

export function parsePort(value = '8080') {
  if (!/^\d+$/.test(String(value))) throw new Error('PORT must be an integer between 1 and 65535.');
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

export function createStarterIsland(now = Date.now()) {
  const buildings = Object.fromEntries(['house','farm','sawmill','quarry','dock','warehouse','lighthouse','lumber','windmill','townhall','chapel','market'].map(id => [id, { level: id === 'lighthouse' ? 0 : 1, workers: 0, ready: 0, workProgress: [] }]));
  return JSON.stringify({ version: 9, population: 12, capacity: 24, happiness: 20, baseHappiness: 20,
    onboarding: { version: 1, stage: 'intro', index: 0, worldStartedAt: null, completedAt: null },
    resources: Object.fromEntries(['coins','wood','stone','grain','food','planks'].map(id => [id, 100])), buildings,
    welcome: { startedAt: now, until: now + 72 * 3600000 }, worldTimeMs: now, lastSimulatedAt: now, savedAt: now,
    islandStartedAt: null, day: 1, minutes: 0, settings: { language: 'pl', motion: true, sound: true },
    engagement: { lastRealActivityAt: now, activeUntil: 0, activeSeconds: 0 } });
}
function configuredAccountApi(environment) {
  if (process.env.HARBORLIGHT_ACCOUNT_API !== '1') return null;
  const projectId = process.env.HARBORLIGHT_PROJECT_ID || (['prod','production'].includes(environment) ? 'harborlight-prod' : ['dev','preprod'].includes(environment) ? 'harborlight-dev' : null);
  if (!projectId) return null;
  const store = createCharityLedgerStore(createIslandDocumentStore(createFirestoreStore({ projectId, databaseId: process.env.HARBORLIGHT_DATABASE_ID || '(default)' })));
  const serviceEnvironment = projectId === 'harborlight-dev' ? 'preprod' : projectId === 'harborlight-prod' || ['prod','production'].includes(environment) ? 'production' : 'preprod';
  return { service: createAccountService({ store, environment: serviceEnvironment }), trade: createPlayerTradeService({ store, environment: serviceEnvironment }), community: createCommunityService({ store, environment: serviceEnvironment }), charity: createCharityService({ store, environment: serviceEnvironment }), verify: createFirebaseIdentityVerifier({ projectId }), projectId };
}
function requestJson(request, maximumBytes = 1_500_000) {
  return new Promise((resolve, reject) => {
    if (!(request.headers['content-type'] || '').toLowerCase().startsWith('application/json')) { request.resume(); reject(new AccountServiceError('json-required', 415)); return; }
    const pieces = []; let bytes = 0, failed = false;
    request.on('data', piece => {
      if (failed) return;
      bytes += piece.length;
      if (bytes > maximumBytes) { failed = true; pieces.length = 0; reject(new AccountServiceError('request-too-large', 413)); return; }
      pieces.push(piece);
    });
    request.once('end', () => {
      if (failed) return;
      try { const body = JSON.parse(Buffer.concat(pieces).toString('utf8')); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error(); resolve(body); }
      catch { reject(new AccountServiceError('invalid-json', 400)); }
    });
    request.once('error', () => reject(new AccountServiceError('request-aborted', 400)));
  });
}

export function createServer({
  environment = process.env.HARBORLIGHT_ENV || 'development',
  release = process.env.HARBORLIGHT_RELEASE || 'local',
  readiness = { ready: true }, accountService = null, verifyIdentityToken = null, playerTradeService = null, communityService = null, charityService = null,
  now = () => Date.now(), starter = createStarterIsland, accountProjectId = null
} = {}) {
  let configured;
  if (!accountService && !verifyIdentityToken) {
    try { configured = configuredAccountApi(environment); } catch { configured = null; }
    accountService = configured?.service || null; verifyIdentityToken = configured?.verify || null;
    playerTradeService = configured?.trade || null;
    communityService = configured?.community || null;
    charityService = configured?.charity || null;
  }
  const accountApi = !!accountService && typeof verifyIdentityToken === 'function';
  const runtimeProjectId = configured?.projectId || accountProjectId || process.env.HARBORLIGHT_PROJECT_ID || (['prod','production'].includes(environment) ? 'harborlight-prod' : ['dev','preprod'].includes(environment) ? 'harborlight-dev' : null);
  const runtimeEnvironment = runtimeProjectId === 'harborlight-dev' ? 'preprod' : runtimeProjectId === 'harborlight-prod' ? 'production' : ['dev','preprod'].includes(environment) ? 'preprod' : ['prod','production'].includes(environment) ? 'production' : 'development';
  const server = http.createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (statusCode, body) => {
      if (response.destroyed || response.writableEnded) return;
      const encoded = JSON.stringify(body); response.statusCode = statusCode;
      response.setHeader('Content-Length', Buffer.byteLength(encoded));
      response.end(request.method === 'HEAD' ? undefined : encoded);
    };
    const path = request.url?.split('?', 1)[0];
    const isHealth = path === '/health' || path === '/healthz', isReadiness = path === '/ready' || path === '/readyz';
    if (isHealth || isReadiness) {
      if (request.method !== 'GET' && request.method !== 'HEAD') { response.setHeader('Allow', 'GET, HEAD'); send(405, { error: 'method_not_allowed' }); return; }
      const ready = !isReadiness || readiness.ready;
      send(ready ? 200 : 503, { status: ready ? 'ok' : 'draining', service: 'harborlight-api', environment, release,
        ...(isReadiness ? { scope: 'infrastructure', features: { accounts: accountApi, persistence: accountApi, gameApi: false } } : {}) });
      return;
    }
    const routes = { '/api/v1/config': ['GET'], '/api/v1/island': ['GET','POST','PUT'], '/api/v1/activity': ['POST'], '/api/v1/promotions/redeem': ['POST'], '/api/v1/legal': ['GET','POST'], '/api/v1/trade/offers': ['GET','POST'], '/api/v1/trade/inbox': ['GET'], '/api/v1/community': ['GET','POST'], '/api/v1/charity': ['GET','POST'] };
    const offerCommand = /^\/api\/v1\/trade\/offers\/(trade_[a-f0-9]{40})\/(accept|cancel)$/.exec(path || '');
    const inboxCommand = /^\/api\/v1\/trade\/inbox\/(trade_[a-f0-9]{40})\/claim$/.exec(path || '');
    if (offerCommand || inboxCommand) routes[path] = ['POST'];
    if (!routes[path]) { send(404, { error: 'not_found' }); return; }
    if (!accountApi) { send(503, { error: 'account_api_disabled' }); return; }
    if (!routes[path].includes(request.method)) { response.setHeader('Allow', routes[path].join(', ')); send(405, { error: 'method_not_allowed' }); return; }
    if (!readiness.ready) { send(503, { error: 'draining' }); return; }
    if (path === '/api/v1/config') { send(200, { accountApi: true, projectId: runtimeProjectId, environment: runtimeEnvironment }); return; }
    try {
      const token = /^Bearer ([^\s]{1,16000})$/.exec(request.headers.authorization || '')?.[1];
      if (!token) { response.setHeader('WWW-Authenticate', 'Bearer'); throw new AccountServiceError('auth-required', 401); }
      const identity = await verifyIdentityToken(token);
      if (!identity?.uid) throw new AccountServiceError('auth-required', 401);
      const uid = identity.uid;
      if (runtimeEnvironment === 'preprod' && !['dev-admin1','dev-admin2','dev-admin3'].includes(uid)) throw new AccountServiceError('permission', 403);
      if (path === '/api/v1/community') {
        if (!communityService) throw new AccountServiceError('community-api-unavailable', 503);
        if (request.method === 'GET') { send(200, await communityService.snapshot({ uid })); return; }
        const body = await requestJson(request);
        send(200, await communityService.dispatch({ ...body, uid })); return;
      }
      if (path === '/api/v1/charity') {
        if (!charityService) throw new AccountServiceError('charity-api-unavailable', 503);
        if (request.method === 'GET') { send(200, await charityService.status({ uid })); return; }
        const body = await requestJson(request);
        if (body.command === 'donate') { send(200, await charityService.donate({ uid, requestId: body.requestId, islandId: body.islandId })); return; }
        if (body.command === 'claim') { send(200, await charityService.claimReward({ uid, donationId: body.donationId, islandId: body.islandId })); return; }
        throw new AccountServiceError('charity-command-forbidden', 403);
      }
      if (path.startsWith('/api/v1/trade/')) {
        if (!playerTradeService) throw new AccountServiceError('trade-api-unavailable', 503);
        if (request.method === 'GET') {
          const query = new URL(request.url, 'http://localhost').searchParams;
          const limit = query.has('limit') ? Number(query.get('limit')) : 50, cursor = query.get('cursor');
          send(200, await (path === '/api/v1/trade/offers' ? playerTradeService.listOffers({ uid, islandId: query.get('islandId') || 'island-1', limit, cursor }) : playerTradeService.listInbox({ uid, limit, cursor }))); return;
        }
        const body = await requestJson(request);
        const common = { uid, requestId: body.requestId, generation: body.generation, expectedRevision: body.expectedRevision };
        if (path === '/api/v1/trade/offers') { send(201, await playerTradeService.createOffer({ ...common, islandId: body.islandId, give: body.give, want: body.want })); return; }
        if (offerCommand) { send(200, await playerTradeService[offerCommand[2] === 'accept' ? 'acceptOffer' : 'cancelOffer']({ ...common, offerId: offerCommand[1], ...(offerCommand[2] === 'accept' ? { islandId: body.islandId } : {}) })); return; }
        send(200, await playerTradeService.claimInbox({ ...common, inboxId: inboxCommand[1] })); return;
      }
      if (request.method === 'GET') { send(200, await (path === '/api/v1/legal' ? accountService.readLegalStatus({ uid }) : accountService.readIsland({ uid }))); return; }
      const body = await requestJson(request, path === '/api/v1/island' && request.method === 'PUT' ? 29_000_000 : 1_500_000);
      if (path === '/api/v1/legal') {
        send(200, await accountService.acceptLegal({ uid, termsVersion: body.termsVersion, privacyVersion: body.privacyVersion,
          termsAccepted: body.termsAccepted, privacyAcknowledged: body.privacyAcknowledged })); return;
      }
      if (path === '/api/v1/island' && request.method === 'POST') {
        if (Object.keys(body).length) throw new AccountServiceError('starter-is-server-owned', 400);
        await accountService.startIsland({ uid, payload: starter(now()) });
        send(201, await accountService.readIsland({ uid })); return;
      }
      if (path === '/api/v1/island') {
        const saved = await accountService.saveIsland({ uid, payload: body.payload, expectedRevision: body.expectedRevision, generation: body.generation });
        send(200, { ...saved, updateTime: new Date(saved.updatedAt).toISOString() }); return;
      }
      if (path === '/api/v1/activity') { send(200, await accountService.recordActivity({ uid, generation: body.generation })); return; }
      send(200, await accountService.redeemCode({ uid, code: body.code, generation: body.generation }));
    } catch (error) {
      const status = Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599 ? error.status : 503;
      send(status, { error: typeof error?.code === 'string' ? error.code : 'account-service-unavailable' });
    }
  });
  server.requestTimeout = 15_000; server.headersTimeout = 10_000; server.keepAliveTimeout = 5_000;
  return server;
}

export function startServer() {
  const port = parsePort(process.env.PORT);
  const readiness = { ready: true };
  const server = createServer({ readiness });
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    readiness.ready = false;
    const deadline = setTimeout(() => {
      server.closeAllConnections();
      process.exitCode = 1;
    }, 8_000);
    deadline.unref();
    server.close(() => clearTimeout(deadline));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  server.on('error', error => {
    console.error(JSON.stringify({ severity: 'ERROR', event: 'server_error', message: error.message }));
    process.exitCode = 1;
  });
  server.listen(port, '0.0.0.0', () => {
    console.log(JSON.stringify({ severity: 'INFO', event: 'listening', port }));
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startServer();
