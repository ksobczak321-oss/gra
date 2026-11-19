import test from 'node:test';
import assert from 'node:assert/strict';
import {createHistoryIndex} from '../harborlight-v1-diet-history-index.js';

const EPS = 1e-8, DAY_MS = 86400000;
const clone = value => structuredClone(value);
function referencePrune(person, now) {
  const cutoff = now - DAY_MS;
  person.history = person.history.filter(h => h.at > cutoff + EPS);
  for (const h of person.history) if (Number.isFinite(h.from) && h.from < cutoff && h.at > cutoff) {
    h.satiety *= Math.max(0, (h.at - cutoff) / (h.at - h.from)); h.from = cutoff;
  }
}
function referenceWrite(person, resource, points, from, at) {
  if (points <= EPS) return;
  let previous = null;
  for (let i = person.history.length - 1; i >= 0; i--) if (person.history[i].resource === resource) { previous = person.history[i]; break; }
  const duration = at - from, oldDuration = previous ? previous.at - previous.from : 0;
  const rate = points / duration, oldRate = oldDuration > 0 ? previous.satiety / oldDuration : NaN;
  if (previous && Number.isFinite(previous.from) && Math.abs(previous.at - from) < .01 &&
      Math.abs(rate - oldRate) <= 1e-10 * Math.max(1, rate, oldRate)) { previous.at = at; previous.satiety += points; }
  else person.history.push({from, at, resource, satiety: points});
}
function pair(rows, options) {
  const actual = {history: clone(rows)}, expected = {history: clone(rows)}, index = createHistoryIndex(actual, options);
  assert.ok(index);
  function same() { assert.deepEqual(actual.history, expected.history); assert.equal(JSON.stringify(actual.history), JSON.stringify(expected.history)); }
  return {actual, expected, index, same,
    prune(cutoff) { assert.equal(index.prune(cutoff + DAY_MS), true); referencePrune(expected, cutoff + DAY_MS); same(); },
    write(...args) { assert.equal(index.write(...args), true); referenceWrite(expected, ...args); same(); }};
}

test('rolling pruning preserves every row and exact fraction for increasing and backwards cutoffs', () => {
  const p = pair([
    {from: 0, at: 1000, resource: 'bread', satiety: 1 / 3},
    {from: -50, at: 400, resource: 'fish', satiety: .123456789123},
    {at: 900, resource: 'bread', satiety: 9},
    {from: 300, at: 1200, resource: 'milk', satiety: 10},
    {from: 100, at: 200, resource: 'bread', satiety: 0}
  ]);
  const original = p.actual.history, objects = [...original];
  for (const cutoff of [-100, 125, 123, 175.25, 170, 399.99, 150, 400, 800.125, 1000, 1199, 1200, 0]) p.prune(cutoff);
  assert.notEqual(p.actual.history, original, 'first filter detaches the original array');
  assert.equal(original[0], objects[0], 'actual row identity is retained');
  assert.equal(original.length, objects.length, 'old array membership is retained');
});

test('expiration uses the original EPS boundary including legacy from and zero satiety', () => {
  const p = pair([
    {from: 90, at: 100, resource: 'bread', satiety: 0},
    {from: undefined, at: 100 + EPS / 2, resource: 'fish', satiety: 1},
    {from: NaN, at: 100 + EPS * 2, resource: 'milk', satiety: 2},
    {from: Infinity, at: 200, resource: 'fish', satiety: 3},
    {from: null, at: 300, resource: 'bread', satiety: 4}
  ]);
  p.prune(100); p.prune(200); p.prune(300);
});

test('merge picks the latest row by array creation order rather than timestamp', () => {
  const p = pair([
    {from: 1000, at: 2000, resource: 'bread', satiety: 100},
    {from: 0, at: 100, resource: 'bread', satiety: 10},
    {from: 0, at: 100, resource: 'fish', satiety: 5}
  ]);
  const previous = p.actual.history[1];
  p.write('bread', 10, 100, 200);
  assert.equal(p.actual.history[1], previous); assert.equal(previous.at, 200);
  p.write('bread', 10, 200.02, 300.02); // Gap fails the exact merge condition.
  p.write('bread', 11, 300.02, 400.02); // Different rate also appends.
  p.write('fish', EPS, 100, 200); p.write('fish', 0, 100, 200);
  p.write('fish', 5, 100.005, 200.005); // Within tolerance; rate remains exact.
  p.prune(500);
  p.write('bread', 100, 2000, 3000); // Expired tail exposes the earlier surviving row.
  assert.equal(p.actual.history.length, 1);
  assert.equal(p.actual.history[0].at, 3000);
});

test('append and legacy missing from never accidentally merge', () => {
  const p = pair([{at: 100, resource: 'fish', satiety: 1}]);
  p.write('fish', 1, 100, 200); p.write('fish', 1, 200, 300);
  assert.equal(p.actual.history.length, 2);
  p.prune(250); p.write('fish', .5, 300, 350); p.prune(260); p.prune(255);
});

test('absolute millisecond timestamps preserve tiny boundaries and merge tolerances', () => {
  const epoch = 1794820000000;
  const p = pair([
    {from: epoch, at: epoch + .125, resource: 'bread', satiety: .1},
    {from: epoch - 1000, at: epoch + 2000, resource: 'fish', satiety: .3},
    {from: epoch + .000244140625, at: epoch + 1, resource: 'milk', satiety: .05}
  ]);
  p.prune(epoch + .000244140625);
  p.write('bread', .1, epoch + .125 + .009, epoch + .25 + .009);
  p.write('bread', .1, epoch + .25 + .019, epoch + .375 + .019);
  for (const offset of [.0625, .062255859375, .124755859375, .125, .25, .999755859375, 1, 2000]) p.prune(epoch + offset);
});

test('callback deltas reflect only subsequent row additions, removals, and changes', () => {
  const rows = [{from: 0, at: 100, resource: 'bread', satiety: 10}, {from: 20, at: 200, resource: 'fish', satiety: 20}];
  const actual = {history: clone(rows)}, events = [], values = new Map(actual.history.map(row => [row, row.satiety]));
  const index = createHistoryIndex(actual, {
    onAdd(row) { events.push('add'); assert.equal(values.has(row), false); values.set(row, row.satiety); },
    onRemove(row) { events.push('remove'); assert.equal(values.get(row), row.satiety); values.delete(row); },
    onChange(row, before, after) { events.push('change'); assert.equal(values.get(row), before); assert.equal(row.satiety, after); values.set(row, after); }
  });
  assert.deepEqual(events, [], 'initial rows are not added twice');
  for (const operation of [() => index.prune(DAY_MS + 50), () => index.write('bread', 10, 100, 200),
    () => index.write('milk', 3, 0, 100), () => index.prune(DAY_MS + 150), () => index.prune(DAY_MS + 250)]) {
    assert.equal(operation(), true);
    assert.deepEqual([...values.keys()].filter(row => !actual.history.includes(row)), []);
    assert.equal(values.size, actual.history.length);
    for (const row of actual.history) assert.equal(values.get(row), row.satiety);
  }
  assert.ok(events.includes('add')); assert.ok(events.includes('remove')); assert.ok(events.includes('change'));
});

test('unsupported construction and external replacement/length changes do not partially mutate', () => {
  const original = {history: [{from: 0, at: 100, resource: 'bread', satiety: 1}]};
  for (const rows of [[{at: 1, resource: 'bread', satiety: -1}], [{at: NaN, resource: 'bread', satiety: 1}],
    [{at: 1, resource: 'unknown', satiety: 1}], [{at: 1, resource: 'bread', satiety: Infinity}]]) {
    const person = {history: rows}, before = clone(person), calls = [];
    assert.equal(createHistoryIndex(person, {isKnownResource: r => r === 'bread', onAdd: r => calls.push(r)}), null);
    assert.deepEqual(person, before); assert.deepEqual(calls, []);
  }
  const shared = original.history[0]; assert.equal(createHistoryIndex({history: [shared, shared]}), null);
  assert.equal(createHistoryIndex({history: Object.freeze([...original.history])}), null);
  const person = clone(original), index = createHistoryIndex(person);
  person.history = clone(person.history);
  const replacement = clone(person);
  assert.equal(index.isCurrent(), false); assert.equal(index.prune(DAY_MS + 50), false);
  assert.equal(index.write('bread', 1, 100, 200), false); assert.deepEqual(person, replacement);
  const next = createHistoryIndex(person); person.history.push({from: 0, at: 200, resource: 'fish', satiety: 1});
  const appended = clone(person); assert.equal(next.prune(DAY_MS + 100), false); assert.deepEqual(person, appended);
});

test('invalid method arguments and overflow are rejected before any mutation or callbacks', () => {
  const person = {history: [{from: 0, at: 1, resource: 'bread', satiety: Number.MAX_VALUE}]}, calls = [];
  const index = createHistoryIndex(person, {isKnownResource: r => r === 'bread', onChange: () => calls.push('change')});
  const initial = clone(person);
  assert.equal(index.prune(NaN), false); assert.equal(index.write('bread', Infinity, 1, 2), false);
  assert.equal(index.write('bread', 1, NaN, 2), false); assert.equal(index.write('unknown', 1, 1, 2), false);
  assert.equal(index.write('bread', Number.MAX_VALUE, 1, 2), false);
  assert.deepEqual(person, initial); assert.deepEqual(calls, []); assert.equal(index.isCurrent(), true);
});

test('indexed heaps stay bounded through repeated merges and arbitrary expired-node removals', () => {
  const p = pair([{from: 0, at: 1, resource: 'bread', satiety: .125}]);
  for (let at = 2; at <= 1500; at++) p.write('bread', .125, at - 1, at);
  assert.deepEqual(p.index.debugStats(), {rows: 1, expiryEntries: 1, startEntries: 1, activeEntries: 0, resources: 1});
  p.prune(750);
  for (let at = 1501; at <= 2000; at++) p.write('bread', .125, at - 1, at);
  const stats = p.index.debugStats();
  assert.equal(stats.expiryEntries, stats.rows); assert.ok(stats.startEntries + stats.activeEntries <= stats.rows);
  p.prune(2000);
  assert.deepEqual(p.index.debugStats(), {rows: 0, expiryEntries: 0, startEntries: 0, activeEntries: 0, resources: 0});
});

test('unchanged cutoffs do not revisit every retained history row', () => {
  let reads = 0;
  const person = {history: Array.from({length: 1024}, (_, i) => new Proxy(
    {from: 10000 + i, at: 20000 + i, resource: 'bread', satiety: 1},
    {get(target, key, receiver) { if (key === 'at' || key === 'from' || key === 'satiety') reads++; return Reflect.get(target, key, receiver); }}
  ))};
  const index = createHistoryIndex(person);
  assert.ok(index); assert.equal(index.prune(DAY_MS), true); reads = 0;
  for (let cutoff = 1; cutoff <= 20; cutoff++) assert.equal(index.prune(DAY_MS + cutoff), true);
  assert.ok(reads < 100, `${reads} row reads should depend on heap roots, not 1024 retained rows`);
  assert.equal(person.history.length, 1024);
});

test('deterministic differential histories retain exact JSON over overlapping intervals and several days', () => {
  let seed = 0x1a73c09;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2 ** 32; };
  const resources = ['bread', 'fish', 'milk', 'cake'];
  for (let scenario = 0; scenario < 8; scenario++) {
    const rows = Array.from({length: 80}, (_, i) => {
      const from = Math.floor(random() * 3 * DAY_MS), at = from + 1 + Math.floor(random() * DAY_MS);
      return {...(i % 13 ? {from} : {}), at, resource: resources[Math.floor(random() * resources.length)], satiety: random() * 25};
    });
    const p = pair(rows); let clock = 0;
    for (let step = 0; step < 500; step++) {
      clock += 1000 + random() * DAY_MS / 60;
      if (random() < .55) p.prune(clock - (random() < .25 ? DAY_MS / 10 : 0));
      else {
        const resource = resources[Math.floor(random() * resources.length)], last = p.expected.history.findLast(row => row.resource === resource);
        const from = last && random() < .5 ? last.at : clock + random() * 1e5;
        const duration = 1 + random() * 2e5;
        const points = last && Number.isFinite(last.from) && random() < .5 ? last.satiety / (last.at - last.from) * duration : random() * 10;
        p.write(resource, points, from, from + duration);
      }
    }
    p.prune(5 * DAY_MS);
  }
});
