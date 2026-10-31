import test from 'node:test';
import assert from 'node:assert/strict';
import { createIslandDocumentStore } from '../island-document-store.mjs';

class Memory {
  records = new Map(); lastWrites = [];
  async runTransaction(work) {
    const copy = new Map([...this.records].map(([key,value]) => [key,structuredClone(value)]));
    let wrote = false; const writes = [];
    const result = await work({ get: async key => { assert.equal(wrote,false); return structuredClone(copy.get(key)); },
      set: async (key,value) => { wrote = true; writes.push(key); copy.set(key,structuredClone(value)); },
      delete: async key => { wrote = true; writes.push(key); copy.delete(key); } });
    this.records = copy; this.lastWrites = writes; return result;
  }
}
const snapshot = index => ({ version:9, population:2400, resources:{ coins:index,wood:0,stone:0,grain:0,food:0,planks:0 },
  buildings:{townhall:{level:100},house:{level:100},warehouse:{level:100}},
  residents:Array.from({length:2400},(_,id)=>({id:id+1,personUid:`island-${index}:resident-${id+1}`,happiness:20,hungerSeconds:0})) });
const document = () => {
  const state = snapshot(1);
  state.archipelago = { version:2, activeIslandId:'island-20', islands:Object.fromEntries(Array.from({length:19},(_,i)=>[`island-${i+2}`,snapshot(i+2)])),transfers:[],capacityReceipts:[],shipCapacity:1000 };
  return {schemaVersion:1,revision:1,generation:1,payload:JSON.stringify(state),updatedAt:1000};
};

test('twenty populated worlds exceed one Firestore document and round-trip through bounded world documents', async () => {
  const memory = new Memory(), store = createIslandDocumentStore(memory), value = document();
  assert.ok(Buffer.byteLength(value.payload) > 1048576);
  await store.runTransaction(async tx => { await tx.get('islands/test'); await tx.set('islands/test',value); });
  assert.equal(memory.records.size,20);
  assert.equal(memory.records.get('islands/test').schemaVersion,2);
  for (const data of memory.records.values()) assert.ok(Buffer.byteLength(data.payload) < 700000);
  const restored = await store.runTransaction(tx=>tx.get('islands/test'));
  assert.deepEqual(JSON.parse(restored.payload),JSON.parse(value.payload));
  assert.equal(restored.revision,1);
});

test('autosave writes only the changed root/daughter and account deletion removes every known child', async () => {
  const memory = new Memory(), store = createIslandDocumentStore(memory), value = document();
  await store.runTransaction(async tx=>{await tx.get('islands/test');await tx.set('islands/test',value);});
  await store.runTransaction(async tx=>{
    const saved = await tx.get('islands/test'), state = JSON.parse(saved.payload);
    state.resources.coins += 1; saved.payload=JSON.stringify(state);saved.revision++;
    await tx.set('islands/test',saved);
  });
  assert.deepEqual(memory.lastWrites,['islands/test']);
  await store.runTransaction(async tx=>{
    const saved = await tx.get('islands/test'), state = JSON.parse(saved.payload);
    state.archipelago.islands['island-20'].resources.coins += 1; saved.payload=JSON.stringify(state);saved.revision++;
    await tx.set('islands/test',saved);
  });
  assert.deepEqual(memory.lastWrites,['islands/test','islands/test/worlds/island-20']);
  await store.runTransaction(async tx=>{await tx.get('islands/test');await tx.delete('islands/test');});
  assert.equal(memory.records.size,0);
});

test('missing or wrong-generation world documents fail closed without deleting the archipelago', async () => {
  const memory = new Memory(), store = createIslandDocumentStore(memory), value = document();
  await store.runTransaction(async tx=>{await tx.get('islands/test');await tx.set('islands/test',value);});
  memory.records.get('islands/test/worlds/island-20').generation=2;
  await assert.rejects(store.runTransaction(tx=>tx.get('islands/test')),error=>error.code==='invalid-island-storage');
  assert.equal(memory.records.size,20);
  memory.records.delete('islands/test/worlds/island-20');
  await assert.rejects(store.runTransaction(tx=>tx.get('islands/test')),error=>error.code==='invalid-island-storage');
});
