import test from 'node:test';
import assert from 'node:assert/strict';
import { createDietAccumulator } from '../harborlight-v1-diet-accumulator.js';

const EPS = 1e-8;
// Independent original implementation, including its prefix clamp and both
// final Float64 operations. No interval/helper implementation is reused.
function original(rows, epsilon = EPS, fraction = .2) {
  const finite = value => Number.isFinite(Number(value)) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Number(value))) : 0;
  const shares = {};
  for (const row of rows) shares[row.resource] = finite(shares[row.resource]) + row.satiety;
  const values = Object.values(shares), total = values.reduce((a, b) => a + b, 0);
  return values.filter(value => total > epsilon && value + epsilon >= total * fraction).length;
}
function certified(accumulator, rows, epsilon = EPS, fraction = .2) {
  const actual = accumulator.typeCount(epsilon, fraction);
  assert.ok(actual === null || Number.isInteger(actual));
  if (actual !== null) assert.equal(actual, original(rows, epsilon, fraction));
  return actual;
}
function randomGenerator(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
}
const row = (resource, satiety) => ({ resource, satiety });

test('ordinary20% meal mixes certify the same integer with the EPS margin', () => {
  for (const rows of [[], [row('grain', 1)], [row('grain', .8), row('fish', .2)],
    Array.from({ length: 2000 }, (_, i) => row(i % 5 ? 'grain' : 'fish', .001))]) {
    assert.equal(certified(createDietAccumulator(rows), rows), original(rows));
  }
});

test('zero-valued retained resources count when EPS permits, and disappear only with their last row', () => {
  const rows = [row('grain', 2 * EPS), row('fish', -0), row('fish', 0)];
  const accumulator = createDietAccumulator(rows);
  assert.equal(certified(accumulator, rows), 2);
  accumulator.remove('fish', rows.pop().satiety);
  assert.equal(certified(accumulator, rows), 2);
  accumulator.remove('fish', rows.pop().satiety);
  assert.equal(certified(accumulator, rows), 1);
  accumulator.remove('grain', rows.pop().satiety);
  assert.equal(certified(accumulator, rows), 0);
  accumulator.add('grain', 0); rows.push(row('grain', 0));
  assert.equal(certified(accumulator, rows), 0);
});

test('exact add/remove/replace survives cancellation of large and small stored values', () => {
  const rows = [row('grain', 1e12), row('grain', 2 ** -100), row('fish', .25)];
  const accumulator = createDietAccumulator(rows);
  assert.equal(accumulator.remove('grain', rows[0].satiety), true); rows.shift();
  assert.equal(certified(accumulator, rows), 1);
  assert.equal(accumulator.replace('grain', rows[0].satiety, .75), true); rows[0].satiety = .75;
  assert.equal(certified(accumulator, rows), 2);
  assert.equal(accumulator.replace('grain', .75, 0), true); rows[0].satiety = 0;
  assert.equal(certified(accumulator, rows), 1);
  assert.equal(accumulator.remove('grain', 0), true); rows.shift();
  assert.equal(certified(accumulator, rows), 1);
});

test('many independent row orders certify only the original ordered IEEE result', () => {
  const random = randomGenerator(0x65abc91);
  let answers = 0;
  for (let trial = 0; trial < 300; trial++) {
    const scale = [1e-20, 1e-9, 1, 1e8, 1e12][trial % 5];
    const rows = Array.from({ length: 10 + trial % 171 }, () => row(['grain', 'fish', 'bread', 'milk'][Math.floor(random() * 4)], random() * scale));
    for (let permutation = 0; permutation < 3; permutation++) {
      for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; }
      if (certified(createDietAccumulator(rows), rows) !== null) answers++;
    }
  }
  assert.ok(answers > 850, `unexpectedly few certificates: ${answers}`);
});

test('random coherent mutation hooks maintain certification across repeated pruning and replacement', () => {
  const random = randomGenerator(0x731d83), rows = [], accumulator = createDietAccumulator(rows);
  let answers = 0;
  for (let step = 0; step < 2500; step++) {
    const action = random();
    if (!rows.length || action < .46) {
      const current = row(['grain', 'fish', 'bread'][Math.floor(random() * 3)], random() * 3);
      rows.push(current); assert.equal(accumulator.add(current.resource, current.satiety), true);
    } else {
      const index = Math.floor(random() * rows.length), current = rows[index];
      if (action < .72) { assert.equal(accumulator.remove(current.resource, current.satiety), true); rows.splice(index, 1); }
      else { const value = random() < .1 ? 0 : current.satiety * random(); assert.equal(accumulator.replace(current.resource, current.satiety, value), true); current.satiety = value; }
    }
    if (certified(accumulator, rows) !== null) answers++;
  }
  assert.ok(answers > 2400, `unexpectedly few mutation certificates: ${answers}`);
});

test('near the20% and total/EPS boundaries uncertainty falls back without rounding the answer', () => {
  const scales = [EPS / 8, EPS, 2 * EPS, 5 * EPS, 1, 1e8, 1e12];
  for (const scale of scales) for (const perturbation of [-4, -1, 0, 1, 4]) {
    const rows = [row('grain', .8 * scale), row('fish', .2 * scale + perturbation * Number.EPSILON * scale), row('milk', 0)];
    const accumulator = createDietAccumulator(rows);
    for (const epsilon of [0, EPS, 1e-7]) for (const fraction of [0, .2, .5, 1]) certified(accumulator, rows, epsilon, fraction);
  }
  assert.equal(createDietAccumulator([row('grain', EPS)]).typeCount(EPS), null);
  assert.equal(createDietAccumulator([row('grain', 8e11), row('fish', 2e11)]).typeCount(EPS), null);
});

test('exact-scale lower limit is supported and unsupported numeric domains fall back', () => {
  assert.equal(certified(createDietAccumulator([row('grain', 2 ** -256)]), [row('grain', 2 ** -256)], 0), 1);
  for (const value of [2 ** -257, Number.MIN_VALUE, -Number.MIN_VALUE, -1, Infinity, -Infinity, NaN, Number.MAX_VALUE, Number.MAX_SAFE_INTEGER + 1, '1', null, undefined]) {
    const accumulator = createDietAccumulator([row('grain', value)]);
    assert.equal(accumulator.typeCount(EPS), null, String(value));
    assert.equal(accumulator.add('fish', 1), false);
  }
  for (const input of [null, {}, [null], [row('__proto__', 1)]]) assert.equal(createDietAccumulator(input).typeCount(EPS), null);
});

test('prefix saturation cannot receive a certificate from the real-sum model', () => {
  const rows = [row('grain', Number.MAX_SAFE_INTEGER), row('grain', 100), row('grain', 100), row('fish', 1e15)];
  assert.equal(createDietAccumulator(rows).typeCount(EPS), null);
  const accumulator = createDietAccumulator([row('grain', 1e15), row('grain', 1e15)]);
  assert.equal(accumulator.typeCount(EPS), 1);
});

test('invalid mutation or query falls back and cannot expose BigInt through the public API', () => {
  for (const mutation of [a => a.remove('fish', 1), a => a.remove('grain', 2), a => a.replace('grain', 2, 1), a => a.add(Symbol(), 1), a => a.replace('grain', 1, NaN)]) {
    const accumulator = createDietAccumulator([row('grain', 1)]);
    assert.equal(mutation(accumulator), false);
    assert.equal(accumulator.typeCount(EPS), null);
  }
  const accumulator = createDietAccumulator([row('grain', 1)]);
  for (const epsilon of [NaN, Infinity, -1, '1', undefined]) assert.equal(accumulator.typeCount(epsilon), null);
  for (const fraction of [NaN, Infinity, -1, 2, '0.2']) assert.equal(accumulator.typeCount(EPS, fraction), null);
  assert.equal(JSON.stringify(accumulator), '{}');
  assert.equal(Object.isFrozen(accumulator), true);
  assert.equal(accumulator.typeCount(EPS), 1);
  assert.equal(accumulator.typeCount(EPS), 1);
});
