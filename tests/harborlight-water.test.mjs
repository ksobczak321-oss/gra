import test from 'node:test';
import assert from 'node:assert/strict';
import { waterMaskRectangles } from '../harborlight-v1-water.js';

function assertExactCoverage(mask, width, height) {
  const before = Uint8Array.from(mask);
  const coverage = new Uint8Array(width * height);
  const rectangles = waterMaskRectangles(mask, width, height);
  for (const [x, y, w, h] of rectangles) {
    assert.ok([x, y, w, h].every(Number.isInteger));
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= width && y + h <= height);
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) coverage[row * width + col]++;
    }
  }
  assert.deepEqual(coverage, Uint8Array.from(mask, value => value ? 1 : 0), 'shore pixels are neither omitted, overlapped nor extended onto land');
  assert.deepEqual(mask, before, 'the source mask is unchanged');
  return rectangles;
}

test('empty sea mask needs no clip rectangles and a solid sea needs one', () => {
  assert.deepEqual(assertExactCoverage(new Uint8Array(35), 7, 5), []);
  assert.deepEqual(assertExactCoverage(new Uint8Array(35).fill(1), 7, 5), [[0, 0, 7, 5]]);
});

test('separate bays, one-pixel channels and dry islands retain their exact binary shoreline', () => {
  const rows = ['1100011', '1101011', '0001000', '1111111', '1101011', '1100011'];
  const mask = Uint8Array.from(rows.join(''), Number);
  assertExactCoverage(mask, 7, 6);
});

test('a changing coastline merges only truly matching runs across adjacent rows', () => {
  const mask = Uint8Array.from('111111000111', Number);
  assert.deepEqual(assertExactCoverage(mask, 3, 4), [[0, 0, 3, 2], [0, 3, 3, 1]]);
});

test('seeded irregular masks retain every wet pixel without painting a dry pixel', () => {
  let random = 4871;
  for (let sample = 0; sample < 20; sample++) {
    const width = 1 + sample * 3, height = 3 + sample;
    const mask = Uint8Array.from({ length: width * height }, () => {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      return random >>> 29 < 5 ? 1 : 0;
    });
    assertExactCoverage(mask, width, height);
  }
});

test('invalid dimensions cannot create a partial shoreline', () => {
  for (const [width, height, length] of [[0, 2, 0], [2, -1, 0], [1.5, 2, 3], [2, 2, 3]]) {
    assert.throws(() => waterMaskRectangles(new Uint8Array(length), width, height), /Invalid water mask dimensions/);
  }
});
