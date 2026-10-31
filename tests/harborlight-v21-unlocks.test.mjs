import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, normalizeState, act, tick, upgradeEligibility, requestUpgrade,
  townhallPopulationRequirement, synchronizeResidents, buildingCost } from '../harborlight-v1-state.js';
import { quoteTrade, logisticsAction, playerTradeUnlocked } from '../harborlight-v1-logistics.js';
import { quotePremiumBuilding, quoteForecastPlan } from '../harborlight-v1-activities.js';
import { quoteCheckout } from '../harborlight-v1-commerce.js';

const NOW = Date.parse('2026-10-31T10:00:00Z');
function island(level = 3, population = 12) {
  const state = createState(NOW);
  state.buildings.townhall.level = level;
  state.buildings.house.level = level;
  state.buildings.warehouse.level = level;
  state.capacity = level * 24;
  state.population = population;
  synchronizeResidents(state);
  for (const id of Object.keys(state.resources)) state.resources[id] = 100000;
  return state;
}

test('Town Hall upgrades require75% of the preceding level only from3 to4 onward', () => {
  for (const level of [1, 2]) {
    const state = island(level);
    assert.equal(townhallPopulationRequirement(state).populationRequired, 0);
    assert.equal(upgradeEligibility(state, 'townhall').ok, true);
  }
  for (const [level, threshold] of [[3,54],[4,72],[5,90],[99,1782]]) {
    const state = island(level, threshold - 1);
    const blocked = upgradeEligibility(state, 'townhall');
    assert.equal(blocked.ok, false);
    assert.equal(blocked.code, 'townhall-population');
    assert.equal(blocked.populationCurrent, threshold - 1);
    assert.equal(blocked.populationRequired, threshold);
    assert.equal(blocked.populationCapacity, level * 24);
    assert.equal(blocked.targetLevel, level + 1);
    state.population = threshold;
    synchronizeResidents(state);
    assert.equal(upgradeEligibility(state, 'townhall').ok, true);
  }
});

test('failed population checks cannot reserve, spend, forecast or buy a Town Hall upgrade', () => {
  const state = island(3,53);
  const before = JSON.stringify(state);
  assert.equal(requestUpgrade(state, { building:'townhall' }).ok, false);
  assert.equal(requestUpgrade(state, { building:'townhall', premiumService:true, paidMaterials:true, paidCoins:true, skipTransport:true }).ok, false);
  assert.equal(act(state, { type:'startCheckout', kind:'building', building:'townhall' }, NOW, { devSimulation:true, environment:'development' }).ok, false);
  assert.equal(JSON.stringify(state), before);
  assert.equal(quoteCheckout(state, { kind:'building', building:'townhall' }, { buildingCost }).ok, false);
  assert.equal(quotePremiumBuilding(state, 'townhall', { buildingCost, cashPurchase:true }).ok, false);
  state.premium.expiresAt = NOW + 3600000;
  assert.equal(quoteForecastPlan(state, 'townhall', { buildingCost }).code, 'townhall-population');
});

test('a premium future-level queue cannot skip the target population prerequisite', () => {
  const state = island(2,48);
  state.premium.expiresAt = NOW + 3600000;
  assert.equal(act(state, { type:'upgrade', building:'townhall' }, NOW).ok, true);
  assert.equal(state.constructionProjects[0].targetLevel, 3);
  const before = JSON.stringify(state);
  const blocked = act(state, { type:'upgrade', building:'townhall' }, NOW);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.targetLevel, 4);
  assert.equal(blocked.populationRequired, 54);
  assert.equal(JSON.stringify(state), before);
});

test('population does not gate other buildings or cancel an already purchased legacy level', () => {
  const state = island(3,54);
  const purchased = requestUpgrade(state, { building:'townhall', premiumService:true, paidMaterials:true, paidCoins:true, skipTransport:true });
  assert.equal(purchased.ok, true);
  state.population = 12;
  const restored = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
  assert.equal(restored.buildings.townhall.level, 3);
  assert.equal(restored.premiumServices.length, 1);
  assert.equal(upgradeEligibility(restored, 'quarry').ok, true);
  tick(restored, 10);
  assert.equal(restored.buildings.townhall.level, 4);
  assert.equal(restored.population, 12);
  const oldHighLevel = normalizeState(JSON.parse(JSON.stringify(island(10,12))), NOW);
  assert.equal(oldHighLevel.buildings.townhall.level, 10);
  assert.equal(oldHighLevel.population, 12);
});

test('NPC Market and Port remain usable alongside coin PvP from level6', () => {
  for (const level of [5,6,10]) {
    const state = island(level); state.resources = {coins:10000,wood:200,stone:0,grain:0,food:1000,planks:0};
    assert.equal(playerTradeUnlocked(state),level>=6);
    assert.equal(quoteTrade(state,{direction:'buy',resource:'stone',amount:100}).ok,true);
    assert.equal(act(state,{type:'marketOrder',resource:'wood',amount:10},NOW).ok,true);
    state.market.stock.wood=20;
    assert.equal(act(state,{type:'marketExchange',from:'wood',to:'stone',amount:10},NOW).ok,true);
    assert.equal(act(state,{type:'trade',direction:'sell',resource:'wood',amount:100},NOW).ok,true);
    assert.ok(state.dock.orders.some(order=>order.direction==='sell'));
  }
});

test('an NPC order accepted before level6 keeps its paid cargo and voyage after the transition', () => {
  const state = island(5);
  state.resources = { coins:10000,wood:0,stone:0,grain:0,food:1000,planks:0 };
  const accepted = act(state, { type:'trade', direction:'buy', resource:'stone', amount:100 }, NOW);
  assert.equal(accepted.ok, true);
  const coins = state.resources.coins;
  state.buildings.townhall.level = 6;
  const restored = normalizeState(JSON.parse(JSON.stringify(state)), NOW);
  assert.equal(restored.dock.orders.length, 1);
  assert.equal(restored.dock.orders[0].amount, 100);
  tick(restored, 300);
  assert.equal(restored.dock.orders[0].stage, 'unloading');
  assert.equal(restored.resources.coins, coins);
  assert.equal(restored.dock.orders[0].remainingToUnload, 100);
});
