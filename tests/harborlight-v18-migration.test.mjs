import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeState } from '../harborlight-v1-state.js';

// Generated with the actual published f161e45 model, then advanced and played
// through its public commands. This is a synthetic history, not a cloud backup
// of the owner's admin1 island. CI needs no old Git history or live credentials.
const legacy = () => JSON.parse(readFileSync(new URL('./fixtures/harborlight-v17-admin-history.json', import.meta.url)));

test('v18 preserves a played v17 island, its residents, reserved build and history through repeated reloads', () => {
  const old = legacy();
  let state = normalizeState(structuredClone(old), old.worldTimeMs);
  for (let reload = 0; reload < 3; reload++) {
    for (const field of ['resources','population','statistics','islandName','haulTrips','dock','market','worldTimeMs','lastSimulatedAt']) assert.deepEqual(state[field], old[field], field);
    for (const [id, building] of Object.entries(old.buildings)) {
      assert.equal(state.buildings[id].level, building.level, id+' level');
      assert.equal(state.buildings[id].workers, building.workers, id+' crew');
      assert.equal(state.buildings[id].ready, building.ready, id+' stock');
    }
    assert.equal(state.residents.length, old.residents.length);
    for (const person of old.residents) {
      const restored = state.residents.find(item => item.id === person.id);
      for (const field of ['workplace','arrivalRemaining','returnRemaining','happiness']) assert.equal(restored[field], person[field], 'resident '+person.id+' '+field);
    }
    assert.equal(state.constructionProjects.length, old.constructionProjects.length);
    for (const [key, value] of Object.entries(old.constructionProjects[0])) assert.deepEqual(state.constructionProjects[0][key], value, 'construction '+key);
    assert.equal(state.loyalty.streak, old.loyalty.streak);
    assert.equal(state.loyalty.lastDay, old.loyalty.lastDay);
    for (const [id, claimed] of Object.entries(old.tutorial.claimed)) if (claimed) assert.equal(state.tutorial.claimed[id], true, 'chest '+id);
    for (const notification of old.notifications) {
      const restored = state.notifications.find(item => item.id === notification.id);
      for (const field of ['title','message','read','at']) assert.equal(restored[field], notification[field], 'notification '+field);
    }
    assert.equal(state.welcome.until, 0, 'an existing island does not receive a renewed welcome period');
    state = normalizeState(JSON.parse(JSON.stringify(state)), state.worldTimeMs);
  }
});
