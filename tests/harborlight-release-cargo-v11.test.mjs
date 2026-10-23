import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, tick } from '../harborlight-v1-state.js';
import { centralAvailable } from '../harborlight-v1-inventory.js';
import { warehouseCarrierJobs } from '../harborlight-v1-logistics.js';

const NOW = Date.UTC(2026, 9, 23, 12);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

for (const workplace of ['warehouse', 'market', 'dock']) {
  test(`recalling a loaded ${workplace} carrier preserves cargo without assigning it to a new walker`, () => {
    let state = createState(NOW);
    state.buildings.townhall.level = 4;
    state.resources.food = 1000;
    state.resources.wood = 400;
    state.buildings.lumber.ready = 180;
    if (workplace === 'market') assert.equal(act(state, { type: 'marketOrder', resource: 'wood', amount: 180 }).ok, true);
    if (workplace === 'dock') assert.equal(act(state, { type: 'trade', direction: 'sell', resource: 'wood', amount: 200 }).ok, true);
    assert.equal(act(state, { type: 'assign', building: workplace, delta: 2 }).ok, true);
    tick(state, 301);
    const crew = state.residents.filter(person => person.workplace === workplace);
    const firstId = crew[0].id, dismissedId = crew[1].id;
    assert.deepEqual(state.haulTrips[workplace].map(trip => trip.amount), [60, 60]);
    assert.ok(state.haulTrips[workplace].every(trip => Math.abs(trip.remaining - 299) < 1e-7));
    assert.equal(act(state, { type: 'assign', building: workplace, delta: -1 }).ok, true);
    assert.equal(act(state, { type: 'assign', building: workplace, delta: 1 }).ok, true);
    const hired = state.residents.find(person => person.workplace === workplace && person.id !== firstId && person.id !== dismissedId);
    assert.notEqual(hired.id, dismissedId);
    close(hired.arrivalRemaining, 300);
    const cargo = state.haulTrips[workplace];
    assert.equal(cargo.filter(trip => trip.worker === -1).length, 0);
    const recalled = state.residents.find(person => person.id === dismissedId);
    assert.equal(recalled.workplace, workplace);
    assert.equal(recalled.pendingRelease, true);
    assert.equal(recalled.returnRemaining, 0, 'the home journey cannot begin before the loaded delivery finishes');
    assert.equal(cargo.filter(trip => trip.worker === 0).length, 1);
    assert.equal(cargo.reduce((sum, trip) => sum + trip.amount, 0), 120);
    if (workplace === 'warehouse') {
      const rows = warehouseCarrierJobs(state);
      assert.equal(rows.find(row => row.residentId === firstId).status, 'delivering');
      assert.equal(rows.find(row => row.residentId === hired.id).status, 'walking');
      assert.equal(rows.find(row => row.residentId === dismissedId).amount, 60);
      assert.equal(rows.find(row => row.residentId === dismissedId).status, 'delivering');
    }
    state = normalizeState(JSON.parse(JSON.stringify(state)), state.lastSimulatedAt);
    assert.equal(state.haulTrips[workplace].filter(trip => trip.worker === -1).length, 0);
    assert.equal(state.residents.find(person => person.id === dismissedId).pendingRelease, true);
    tick(state, 299);
    close(state.residents.find(person => person.id === hired.id).arrivalRemaining, 1);
    assert.equal(state.haulTrips[workplace].length, 0);
    const returning = state.residents.find(person => person.id === dismissedId);
    assert.equal(returning.workplace, null);
    close(returning.returnRemaining, 300);
    assert.equal(returning.pendingRelease, false);
    if (workplace === 'warehouse') {
      assert.equal(state.resources.wood, 520);
      assert.equal(state.buildings.lumber.ready, 60);
    } else if (workplace === 'market') {
      assert.equal(state.market.locked.reduce((sum, lot) => sum + lot.amount, 0), 120);
      assert.equal(state.resources.wood, 280);
    } else {
      assert.equal(state.dock.stock.wood, 120);
      assert.equal(state.dock.orders[0].remainingToPort, 80);
      assert.equal(state.resources.wood, 280);
      assert.equal(centralAvailable(state, 'wood'), 200, 'the uncollected port reservation cannot be spent elsewhere');
    }
  });
}
