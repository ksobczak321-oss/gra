// Owner/Cloud Run Job entry point. Dry-run is the default; no public purge URL.
import { pathToFileURL } from 'node:url';
import { createFirestoreStore } from './firestore-store.mjs';
import { createAccountService, threeMonthDeadline } from './account-service.mjs';
const DAY = 86400000;
const ADMINS = new Set(['dev-admin1', 'dev-admin2', 'dev-admin3']);

export async function runRetention({ store, projectId, apply = false, now = Date.now(), pageSize = 100, maximumPages = 100, cursor = null } = {}) {
  if (!store || typeof store.listAccounts !== 'function') throw new TypeError('A durable account store is required.');
  if (!['harborlight-dev','harborlight-prod'].includes(projectId)) throw new TypeError('An explicit HARBORLIGHT project is required.');
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 500 || !Number.isSafeInteger(maximumPages) || maximumPages < 1 || maximumPages > 10000) throw new TypeError('Invalid retention scan limits.');
  const environment = projectId === 'harborlight-prod' ? 'production' : 'preprod';
  const service = createAccountService({ store, environment, now: () => now });
  const summary = { mode: apply ? 'apply' : 'dry-run', projectId, scanned: 0, eligible: 0, expired: 0, exempt: 0, cursor };
  for (let pageNumber = 0; pageNumber < maximumPages; pageNumber++) {
    const page = await store.listAccounts({ before: now - 80 * DAY, limit: pageSize, cursor: summary.cursor });
    for (const account of page.accounts || []) {
      summary.scanned++;
      if (environment === 'preprod' && ADMINS.has(account.uid)) { summary.exempt++; continue; }
      if (account.islandExpiredAt || !Number.isSafeInteger(account.lastPlayedAt) || now < threeMonthDeadline(account.lastPlayedAt)) continue;
      summary.eligible++;
      if (apply && (await service.expireIsland({ uid: account.uid })).expired) summary.expired++;
    }
    summary.cursor = page.cursor ?? null;
    if (!summary.cursor) break;
  }
  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(argument => !['--apply','--dry-run'].includes(argument)) || args.includes('--apply') && args.includes('--dry-run')) throw new Error('Use --dry-run (default) or --apply.');
  const projectId = process.env.HARBORLIGHT_PROJECT_ID;
  if (!projectId) throw new Error('Set HARBORLIGHT_PROJECT_ID explicitly.');
  if (args.includes('--apply') && process.env.HARBORLIGHT_RETENTION_ENABLED !== '1') throw new Error('Applying retention requires HARBORLIGHT_RETENTION_ENABLED=1.');
  const store = createFirestoreStore({ projectId, databaseId: process.env.HARBORLIGHT_DATABASE_ID || '(default)' });
  const summary = await runRetention({ store, projectId, apply: args.includes('--apply') });
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => { process.stderr.write('Retention failed; no credentials or account data are printed.\n'); process.exitCode = 1; });
