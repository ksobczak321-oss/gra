import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState } from '../harborlight-v1-state.js';
import { settleDevelopment } from '../harborlight-v1-development.js';
import { warehouseLimits, warehouseUsed } from '../harborlight-v1-logistics.js';
import { createRequestedDevPreview, DEV_LEVEL_FIVE_PREVIEW } from '../harborlight-v1-dev-preview.js';

const NOW = Date.parse('2026-11-15T12:00:00Z');
const options = {
  search: '?profile=new-player&preview=admin1-level5', hostname: 'ksobczak321-oss.github.io',
  pathname: '/gra/harborlight-v1-layered.html', authenticated: false,
  now: NOW, createState, settleDevelopment
};

test('the explicit guest DEV scenario starts at TH5 with coherent available buildings and bounded stock', () => {
  const state = createRequestedDevPreview(options);
  assert.equal(state.ruleset, 32);
  assert.equal(state.buildings.townhall.level, 5);
  assert.equal(state.buildings.house.level, 5);
  assert.equal(state.buildings.warehouse.level, 5);
  assert.equal(state.buildings.fisher.level, 5);
  assert.equal(state.capacity, 180);
  assert.ok(Object.values(state.buildings).every(building => building.level >= 1));
  assert.equal(state.onboarding.stage, 'complete');
  assert.equal(state.paused, false);
  assert.equal(state.tutorial.autoOpenDisabled, true);
  assert.equal(state.population, 26);
  assert.equal(state.education.foundingGranted, true);
  assert.equal(state.military.foundingGranted, true);
  assert.deepEqual(state.education.discoveries, {});
  assert.equal(state.education.courses.length, 0);
  assert.ok(warehouseUsed(state) < warehouseLimits(state).total);
  assert.ok(state.resources.coins <= 5000);
  assert.match(DEV_LEVEL_FIVE_PREVIEW.label, /Podgląd DEV/);
  assert.match(DEV_LEVEL_FIVE_PREVIEW.notice, /bez logowania/);
  const loaded = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
  assert.equal(loaded.buildings.townhall.level, 5);
  assert.equal(loaded.islandName, DEV_LEVEL_FIVE_PREVIEW.label);
  assert.equal(loaded.population, state.population, 'normalization never duplicates founding specialists');
  assert.deepEqual(loaded.resources, state.resources);
});

test('the scenario is inaccessible on production, other Pages paths and every authenticated account', () => {
  const invalid = [
    { hostname: 'harborlight-dev.web.app' }, { hostname: 'harborlight.pl' },
    { hostname: 'ksobczak321-oss.github.io.evil.example' }, { pathname: '/other/harborlight-v1-layered.html' },
    { pathname: '/gra/harborlight-auth.html' }, { authenticated: true }, { authenticated: undefined },
    { search: '?profile=new-player' }, { search: '?preview=other' }
  ];
  let called = 0;
  for (const change of invalid) {
    assert.equal(createRequestedDevPreview({ ...options, ...change,
      createState: () => { called++; throw Error('must not create a world'); }
    }), null, JSON.stringify(change));
  }
  assert.equal(called, 0);
  assert.equal(createRequestedDevPreview(), null);
});

test('loopback uses the same explicit scenario while ordinary starters remain level1 and independent', () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
    const state = createRequestedDevPreview({ ...options, hostname, pathname: '/harborlight-v1-layered.html' });
    assert.equal(state.buildings.townhall.level, 5);
  }
  const starter = createState(NOW, { ruleset: 32, onboarding: true });
  const before = JSON.stringify(starter);
  assert.equal(createRequestedDevPreview({ ...options, search: '?profile=new-player' }), null);
  assert.equal(JSON.stringify(starter), before);
  assert.equal(starter.buildings.townhall.level, 1);
  const first = createRequestedDevPreview(options), second = createRequestedDevPreview(options);
  first.resources.wood = 1;
  assert.equal(second.resources.wood, 5000);
  assert.equal(starter.resources.wood, 100);
});
