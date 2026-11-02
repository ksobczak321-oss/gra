import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState } from '../harborlight-v1-state.js';

const NOW = Date.parse('2026-11-02T10:00:00Z');

test('cause-specific production-stoppage notices preserve their evidence through cloud-save normalization', () => {
  const raw = createState(NOW);
  const transition = { transition:'ended', effectId:'blockage-windmill', residentIds:[2,3], affectedCount:2,
    building:'windmill', resource:'food', blockageReason:'local-full', reason:'workers-recalled',
    resumedCount:0, recalledCount:2, remainingLocal:350, amount:10 };
  raw.notifications = [{ id:7, kind:'happiness-effect-ended', title:'Production stoppage ended', message:'Workers recalled.',
    read:false, effectId:transition.effectId, effectTransition:transition }];
  const saved = JSON.parse(JSON.stringify(raw));
  const restored = normalizeState(saved,NOW);
  const notice = restored.notifications.find(row=>row.id===7);
  assert.ok(notice);
  assert.equal(notice.effectId,transition.effectId);
  assert.deepEqual(notice.effectTransition,transition);
  const loadedAgain = normalizeState(JSON.parse(JSON.stringify(restored)),NOW);
  assert.deepEqual(loadedAgain.notifications.find(row=>row.id===7).effectTransition,transition);
});

test('notification effect metadata keeps bounded known fields and rejects malformed transitions', () => {
  const raw = createState(NOW);
  raw.notifications = [
    { id:7,kind:'happiness-effect-ended',title:'Ended',message:'Ended',effectTransition:{
      transition:'ended',effectId:'x'.repeat(500),residentIds:[1,1,-1,0,2.2,'3',4],affectedCount:999999,
      building:'q'.repeat(500),reason:'workers-recalled',remainingLocal:-20,amount:Infinity,unknown:{payload:true} } },
    { id:8,kind:'happiness-effect-ended',title:'Ended',message:'Ended',effectTransition:{transition:'unknown',effectId:'blockage-quarry'} }
  ];
  const restored = normalizeState(raw,NOW);
  const detail = restored.notifications.find(row=>row.id===7).effectTransition;
  assert.deepEqual(detail.residentIds,[1,4]);
  assert.equal(detail.effectId.length,120);assert.equal(detail.building.length,80);assert.equal(detail.affectedCount,2400);
  assert.equal(detail.remainingLocal,0);assert.equal(Object.hasOwn(detail,'unknown'),false);assert.equal(Object.hasOwn(detail,'amount'),false);
  assert.equal(restored.notifications.find(row=>row.id===8).effectTransition,undefined);
});
