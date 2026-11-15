import test from 'node:test';
import assert from 'node:assert/strict';
import {warehouseCapacityPlan} from '../harborlight-v1-economy.js';
import {createState,normalizeState} from '../harborlight-v1-state.js';
import {warehouseLimits,stockRoom} from '../harborlight-v1-logistics.js';

const NOW=Date.parse('2026-11-15T12:00:00Z');
test('DEV warehouses share the needs basket and round down to whole ten-thousands',()=>{
  const expected=new Map([[1,40000],[2,60000],[3,80000],[4,100000],[5,130000],[10,240000]]);
  for(const[level,total]of expected){
    const plan=warehouseCapacityPlan(level,{ruleset:32});
    assert.equal(plan.total,total);assert.equal(plan.total%10000,0);
    assert.equal(plan.largestUpgradeTotal,550*(level+1)*10);
    assert.equal(plan.missionTotal,500*(level+1)*10);
    assert.equal(plan.foodReserve,36*(level+1)*6*24);
    assert.equal(plan.unroundedTotal,Math.ceil(plan.needsTotal*1.4));
    assert.ok(plan.total<=plan.unroundedTotal&&plan.unroundedTotal-plan.total<10000);
    assert.ok(plan.perResource<=plan.total);
  }
  const levelOne=warehouseCapacityPlan(1,{ruleset:32});
  assert.equal(levelOne.needsTotal,31368);assert.equal(levelOne.unroundedTotal,43916);
  assert.equal(warehouseCapacityPlan(0,{ruleset:32}).total,0);
});
test('new DEV capacity preserves existing excess stock and blocks further delivery space',()=>{
  const s=createState(NOW,{ruleset:32});s.resources.wood=50000;
  const saved=normalizeState(JSON.parse(JSON.stringify(s)),NOW);
  assert.equal(saved.resources.wood,50000);assert.equal(warehouseLimits(saved).total,40000);
  assert.equal(stockRoom(saved,'wood'),0);assert.equal(stockRoom(saved,'stone'),0);
});
test('capacity depends on warehouse level and its explicit research, not accepting a mission',()=>{
  const s=createState(NOW,{ruleset:32});const before=warehouseLimits(s);
  s.buildings.townhall.level=5;s.activeTaskId='new-task';assert.deepEqual(warehouseLimits(s),before);
  s.education.researchLevels.warehouse=1;assert.equal(warehouseLimits(s).total,42000);
});
