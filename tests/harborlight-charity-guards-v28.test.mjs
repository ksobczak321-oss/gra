import test from 'node:test';
import assert from 'node:assert/strict';
import { createCharityPreviewAdapter } from '../harborlight-v1-charity.js';

const NOW = Date.parse('2026-11-02T12:00:00Z');
const blocked = () => Object.assign(new Error('Cloud confirmation is required.'), { code: 'offline' });
function fixture() {
  const state = { worldTimeMs: NOW, resources: { coins: 100 } }, mutations = [];
  let guard = () => {};
  const adapter = createCharityPreviewAdapter({ environment: 'preprod', now: () => NOW, getState: () => state,
    beforeMutation: details => guard(details), onMutation: details => { mutations.push(details); } });
  return { state, adapter, mutations, guard: value => { guard = value; } };
}
test('cloud mutation guard rejects test credit and donation before coins or durable history change', async () => {
  const f = fixture(); await f.adapter.status(); const initial = structuredClone(f.state);
  f.guard(async () => { throw blocked(); });
  await assert.rejects(f.adapter.creditTestCoins(), { code: 'offline' }); assert.deepEqual(f.state, initial); assert.equal(f.mutations.length, 0);
  f.guard(() => {}); await f.adapter.creditTestCoins(); const funded = structuredClone(f.state), changes = f.mutations.length;
  f.guard(async () => { throw blocked(); });
  await assert.rejects(f.adapter.donate({ requestId: 'guarded-donation' }), { code: 'offline' });
  assert.deepEqual(f.state, funded); assert.equal(f.mutations.length, changes);
});
test('donation rechecks cloud access after its asynchronous status read before reserving any coins', async () => {
  const f = fixture(); await f.adapter.creditTestCoins(); const before = structuredClone(f.state), changes = f.mutations.length; let calls = 0;
  f.guard(async () => { if (++calls === 2) throw blocked(); });
  await assert.rejects(f.adapter.donate({ requestId: 'pause-during-status' }), { code: 'offline' });
  assert.equal(calls, 2); assert.equal(f.state.resources.coins, before.resources.coins);
  assert.deepEqual(f.state.charitySimulation.donations, []); assert.equal(f.state.charitySimulation.last, null);
  assert.equal(f.mutations.length, changes);
});
test('blocked transfer and reward guards cannot grant happiness, mark a transfer or return a celebration result', async () => {
  const f = fixture(); await f.adapter.creditTestCoins(); const { donation } = await f.adapter.donate({ requestId: 'before-transfer' });
  let before = structuredClone(f.state), changes = f.mutations.length;
  f.guard(() => { throw blocked(); });
  await assert.rejects(f.adapter.confirmTestTransfer({ donationId: donation.id }), { code: 'offline' });
  assert.deepEqual(f.state, before); assert.equal(f.mutations.length, changes); assert.equal(f.state.charityReward, undefined);
  f.guard(() => {}); await f.adapter.confirmTestTransfer({ donationId: donation.id });
  before = structuredClone(f.state); changes = f.mutations.length;
  f.guard(async () => { throw blocked(); });
  await assert.rejects(f.adapter.claimReward({ donationId: donation.id }), { code: 'offline' });
  assert.deepEqual(f.state, before); assert.equal(f.mutations.length, changes); assert.equal(f.state.charityReward, undefined);
  assert.equal(f.state.charitySimulation.donations[0].status, 'transferred');
});
test('an awaited guard lets the host reject an adapter whose island snapshot was replaced while checking', async () => {
  const f = fixture(); let release; const deferred = new Promise(resolve => { release = resolve; }); let current = true;
  f.guard(async () => { await deferred; if (!current) throw Object.assign(new Error('Stale snapshot'), { code: 'conflict' }); });
  const before = structuredClone(f.state), attempt = f.adapter.creditTestCoins(); current = false; release();
  await assert.rejects(attempt, { code: 'conflict' }); assert.deepEqual(f.state, before); assert.equal(f.mutations.length, 0);
});
