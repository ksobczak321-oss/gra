import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, act } from '../harborlight-v1-state.js';
import { provisionsAction, normalizeProvisions, quoteConstructionFood } from '../harborlight-v1-provisions.js';

test('retired rules32 construction spending is rejected before reading or initializing provisions', () => {
  const state = { ruleset: 32, resources: { bread: 10 } };
  Object.defineProperty(state, 'provisions', { get() { throw Error('Retired spending reached meal state'); } });
  const result = provisionsAction(state, { type: 'provisionsConstructionSpend', foodUnits: 6, mix: { bread: 1 } });
  assert.equal(result.ok, false);
  assert.deepEqual(state.resources, { bread: 10 });
});

test('the ordinary state dispatcher cannot spend construction food or alter a paid project', () => {
  const now = Date.parse('2026-11-22T12:00:00Z');
  const state = createState(now, { ruleset: 32, onboarding: false });
  state.resources.bread = 10;
  const project = { order: 7, building: 'townhall', targetLevel: 2, stage: 'transport',
    cost: { coins: 500, wood: 500, bread: 84 }, reservedCoins: 500,
    reservedMaterials: { wood: 250, bread: 42 }, remainingMaterials: { wood: 250, bread: 42 },
    delivered: { wood: 250, bread: 42 }, goodsRemaining: 292 };
  state.constructionProjects = [project];
  state.buildings.townhall.construction = project;
  const before = JSON.stringify(state);
  const result = act(state, { type: 'provisionsConstructionSpend', foodUnits: 6, mix: { bread: 1 } }, now);
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(state), before);
  assert.equal(state.constructionProjects[0], project);
  assert.equal(state.buildings.townhall.construction, project);
});

test('generic meal quotes and legacy explicit spending keep their existing purpose', () => {
  const legacy = { ruleset: 31, worldTimeMs: 0, resources: { bread: 10 }, population: 0,
    residents: [], buildings: { townhall: { level: 1 }, house: { level: 1 } }, education: { discoveries: {} } };
  normalizeProvisions(legacy);
  const quote = quoteConstructionFood(legacy, 6);
  assert.equal(quote.ok, true);
  assert.deepEqual(quote.materials, { bread: 1 });
  assert.equal(provisionsAction(legacy, { type: 'provisionsConstructionSpend', foodUnits: 6, mix: { bread: 1 } }).ok, true);
  assert.equal(legacy.resources.bread, 9);
});
