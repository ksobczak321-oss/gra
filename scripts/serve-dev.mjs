#!/usr/bin/env node
import { createLocalDevRuntime, LOCAL_DEV_PASSWORD, LOCAL_DEV_PROJECT } from '../backend/dev-runtime.mjs';
import { resolve } from 'node:path';

const port = Number(process.env.PORT || 3000);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535 || [8000, 8085].includes(port)) throw Error('PORT must be 1–65535, excluding reserved ports 8000 and 8085.');
const dataFile = process.env.DEV_DATA_FILE || '/workspace/work/dev-runtime/state-v32.json';
const ephemeral = process.env.DEV_EPHEMERAL === '1';
const runtime = await createLocalDevRuntime({ dataFile: resolve(dataFile), ephemeral });
await runtime.listen(port);
console.log(`HARBORLIGHT local DEV: http://localhost:${port}/harborlight-auth.html`);
console.log(`Local DEV process PID: ${process.pid}`);
console.log(`Project: ${LOCAL_DEV_PROJECT}; accounts: admin1, admin2, admin3; dedicated local password: ${LOCAL_DEV_PASSWORD}`);
console.log(ephemeral ? 'Ephemeral local fixtures. Saves live only in this server process.' : `Local DEV saves persist atomically in ${resolve(dataFile)}.`);
console.log('Firebase/PRE-PROD/PROD are not contacted.');
console.log(ephemeral ? 'Restart clears these explicitly ephemeral fixtures.' : 'Server restart requires local sign-in again; saved progress remains.');
console.log('Time control is available only to admin3 in local DEV.');
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  const deadline = setTimeout(() => { runtime.server.closeAllConnections(); process.exitCode = 1; }, 8000).unref();
  runtime.close().then(() => clearTimeout(deadline), () => { clearTimeout(deadline); process.exitCode = 1; });
});
