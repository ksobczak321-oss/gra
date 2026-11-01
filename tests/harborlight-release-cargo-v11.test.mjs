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
    state.buildings.lumber.level = 2;
    state.buildings.lumber.ready = 360;
    if (workplace === 'market') assert.equal(act(state, { type: 'marketOrder', resource: 'wood', amount: 360 }).ok, true);
    if (workplace === 'dock') assert.equal(act(state, { type: 'trade', direction: 'sell', resource: 'wood', amount: 400 }).ok, true);
    assert.equal(act(state, { type: 'assign', building: workplace, delta: 2 }).ok, true);
    tick(state, 121);
    const crew = state.residents.filter(person => person.workplace === workplace);
    const firstId = crew[0].id, dismissedId = crew[1].id;
    assert.deepEqual(state.haulTrips[workplace].map(trip => trip.amount), [120, 120]);
    assert.ok(state.haulTrips[workplace].every(trip => Math.abs(trip.remaining - 299) < 1e-7));
    assert.equal(act(state, { type: 'assign', building: workplace, delta: -1 }).ok, true);
    assert.equal(act(state, { type: 'assign', building: workplace, delta: 1 }).ok, true);
    const hired = state.residents.find(person => person.workplace === workplace && person.id !== firstId && person.id !== dismissedId);
    assert.notEqual(hired.id, dismissedId);
    close(hired.arrivalRemaining, 120);
    const cargo = state.haulTrips[workplace];
    assert.equal(cargo.filter(trip => trip.worker === -1).length, 0);
    const recalled = state.residents.find(person => person.id === dismissedId);
    assert.equal(recalled.workplace, workplace);
    assert.equal(recalled.pendingRelease, true);
    assert.equal(recalled.returnRemaining, 0, 'the home journey cannot begin before the loaded delivery finishes');
    assert.equal(cargo.filter(trip => trip.worker === 0).length, 1);
    assert.equal(cargo.reduce((sum, trip) => sum + trip.amount, 0), 240);
    if (workplace === 'warehouse') {
      const rows = warehouseCarrierJobs(state);
      assert.equal(rows.find(row => row.residentId === firstId).status, 'delivering');
      assert.equal(rows.find(row => row.residentId === hired.id).status, 'walking');
      assert.equal(rows.find(row => row.residentId === dismissedId).amount, 120);
      assert.equal(rows.find(row => row.residentId === dismissedId).status, 'delivering');
    }
    state = normalizeState(JSON.parse(JSON.stringify(state)), state.lastSimulatedAt);
    assert.equal(state.haulTrips[workplace].filter(trip => trip.worker === -1).length, 0);
    assert.equal(state.residents.find(person => person.id === dismissedId).pendingRelease, true);
    tick(state, 119);
    close(state.residents.find(person => person.id === hired.id).arrivalRemaining, 1);
    assert.equal(state.haulTrips[workplace].length, 2);
    assert.ok(state.haulTrips[workplace].every(trip => trip.residentId !== hired.id), 'a person still walking cannot take over loaded cargo');
    tick(state, 180);
    close(state.residents.find(person => person.id === hired.id).arrivalRemaining, 0);
    assert.equal(state.haulTrips[workplace].length, 1);
    assert.equal(state.haulTrips[workplace][0].residentId, hired.id);
    close(state.haulTrips[workplace][0].remaining, 121);
    const returning = state.residents.find(person => person.id === dismissedId);
    assert.equal(returning.workplace, null);
    close(returning.returnRemaining, 120);
    assert.equal(returning.pendingRelease, false);
    if (workplace === 'warehouse') {
      assert.equal(state.resources.wood, 640);
      assert.equal(state.buildings.lumber.ready, 0);
      assert.equal(state.haulTrips.warehouse[0].amount, 120, 'the new carrier collects the remaining goods in a separate trip');
    } else if (workplace === 'market') {
      assert.equal(state.market.locked.reduce((sum, lot) => sum + lot.amount, 0), 240);
      assert.equal(state.resources.wood, 40);
    } else {
      assert.equal(state.dock.stock.wood, 240);
      assert.equal(state.dock.orders[0].remainingToPort, 40);
      assert.equal(state.resources.wood, 40);
      assert.equal(centralAvailable(state, 'wood'), 0, 'the uncollected port reservation cannot be spent elsewhere');
    }
  });
}
