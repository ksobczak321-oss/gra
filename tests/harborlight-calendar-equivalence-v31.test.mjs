import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_TIME_ZONE, warsawParts, warsawDayKey, nextWarsawMidnightMs } from '../harborlight-v1-calendar.js';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: GAME_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
function uncachedParts(milliseconds) {
  const time = Number.isFinite(milliseconds) ? milliseconds : Date.now();
  return Object.fromEntries(formatter.formatToParts(new Date(time)).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}
function check(milliseconds) {
  const expected = uncachedParts(milliseconds), actual = warsawParts(milliseconds);
  assert.deepEqual(actual, expected, String(milliseconds));
  assert.deepEqual(Object.keys(actual), Object.keys(expected), 'formatter part order must remain unchanged');
  assert.equal(warsawDayKey(milliseconds), `${expected.year}-${expected.month}-${expected.day}`);
}

test('cached Warsaw parts match uncached Intl across both DST transitions and local midnights', () => {
  for (const anchor of ['2026-03-28T23:00:00Z', '2026-03-29T01:00:00Z', '2026-10-24T22:00:00Z', '2026-10-25T01:00:00Z']) {
    const time = Date.parse(anchor);
    for (const offset of [-3600000, -1000.1, -1000, -999.9, -1, -.1, 0, .1, 999.9, 1000, 3600000]) check(time + offset);
  }
  const springMidnight = Date.parse('2026-03-28T23:00:00Z'), autumnMidnight = Date.parse('2026-10-24T22:00:00Z');
  assert.equal(nextWarsawMidnightMs(springMidnight) - springMidnight, 23 * 3600000);
  assert.equal(nextWarsawMidnightMs(autumnMidnight) - autumnMidnight, 25 * 3600000);
});

test('negative fractional milliseconds use Date TimeClip before second grouping', () => {
  for (const milliseconds of [-2000.9, -2000, -1999.9, -1001, -1000.9, -1000.1, -1000, -999.9, -.9, -.1, -0, 0, .1, .9, 999.9, 1000, 1000.1]) check(milliseconds);
  for (const iso of ['0001-01-01T00:00:00Z', '0099-12-31T23:59:59Z', '1800-01-01T00:00:00Z', '1900-01-01T00:00:00Z', '2000-02-29T00:00:00Z', '2100-03-01T00:00:00Z', '+010000-01-01T00:00:00Z', '-000001-12-31T23:59:59Z']) check(Date.parse(iso));
});

test('cached valid range endpoints cannot hide invalid-Date Intl errors', () => {
  for (const limit of [-8640000000000000, 8640000000000000]) check(limit);
  for (const invalid of [-8640000000000001, 8640000000000001, Number.MAX_VALUE, -Number.MAX_VALUE]) {
    assert.throws(() => uncachedParts(invalid), RangeError);
    assert.throws(() => warsawParts(invalid), RangeError);
  }
});

test('parts cache is bounded to 128 UTC seconds and returns fresh mutation-safe objects', async () => {
  const isolated = await import('../harborlight-v1-calendar.js?calendar-equivalence-cache-v31');
  const original = Intl.DateTimeFormat.prototype.formatToParts, anchor = Date.parse('2026-11-04T12:00:00Z');
  const expected = uncachedParts(anchor);
  let calls = 0;
  Intl.DateTimeFormat.prototype.formatToParts = function (...args) { calls++; return original.apply(this, args); };
  try {
    const first = isolated.warsawParts(anchor + .9), second = isolated.warsawParts(anchor + 999.9);
    assert.equal(calls, 1, 'one UTC second should require only one formatter call');
    assert.notEqual(first, second);
    first.year = 'poisoned'; delete first.hour; second.extra = 'caller-only';
    assert.deepEqual(isolated.warsawParts(anchor), expected);
    assert.equal(calls, 1, 'caller mutation must not alter or invalidate the cache');
    for (let index = 1; index < 128; index++) isolated.warsawParts(anchor + index * 1000);
    assert.equal(calls, 128);
    isolated.warsawParts(anchor + 128000);
    assert.equal(calls, 129);
    isolated.warsawParts(anchor + 1000);
    assert.equal(calls, 129, 'a remaining cached second must still hit');
    assert.deepEqual(isolated.warsawParts(anchor), expected);
    assert.equal(calls, 130, 'the 129th distinct second must evict the first entry');
  } finally {
    Intl.DateTimeFormat.prototype.formatToParts = original;
  }
});

test('nonfinite and non-number inputs still use the current Date.now fallback', () => {
  const original = Date.now;
  let clock = Date.parse('2026-10-25T00:59:59Z');
  Date.now = () => clock;
  try {
    for (const value of [undefined, null, NaN, Infinity, -Infinity, '2026-01-01', {}, 3n]) {
      check(value);
      clock += 1001;
    }
    clock = Date.parse('2026-03-29T00:59:59Z');
    check(NaN);
    clock += 1000;
    check(NaN);
  } finally {
    Date.now = original;
  }
});
