import http from 'node:http';
import { pathToFileURL } from 'node:url';

export function parsePort(value = '8080') {
  if (!/^\d+$/.test(String(value))) throw new Error('PORT must be an integer between 1 and 65535.');
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

export function createServer({
  environment = process.env.HARBORLIGHT_ENV || 'development',
  release = process.env.HARBORLIGHT_RELEASE || 'local',
  readiness = { ready: true }
} = {}) {
  const server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    const send = (statusCode, body) => {
      const encoded = JSON.stringify(body);
      response.statusCode = statusCode;
      response.setHeader('Content-Length', Buffer.byteLength(encoded));
      response.end(request.method === 'HEAD' ? undefined : encoded);
    };
    // Use unreserved paths for public Cloud Run readback. Keep the z-suffixed
    // aliases for internal/local probes, where the Google frontend is absent.
    // No player data or client-supplied game state is accepted by this service.
    const path = request.url?.split('?', 1)[0];
    const isHealth = path === '/health' || path === '/healthz';
    const isReadiness = path === '/ready' || path === '/readyz';
    if (!isHealth && !isReadiness) {
      send(404, { error: 'not_found' });
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      send(405, { error: 'method_not_allowed' });
      return;
    }
    const ready = !isReadiness || readiness.ready;
    send(ready ? 200 : 503, {
      status: ready ? 'ok' : 'draining',
      service: 'harborlight-api',
      environment,
      release,
      ...(isReadiness ? {
        scope: 'infrastructure',
        features: { accounts: false, persistence: false, gameApi: false }
      } : {})
    });
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
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
