import test from 'node:test';
import assert from 'node:assert/strict';
import { mapLabelPosition } from '../harborlight-v1-map-labels.js';

const bounds = { left: 8, top: 8, right: 1664, bottom: 933 };
const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const hud = { left: 0, top: 0, right: 1672, bottom: 70 };
const sidebar = { left: 1390, top: 79, right: 1672, bottom: 710 };
const dock = { left: 195, top: 708, right: 1385, bottom: 941 };
function clear(position, obstacles = [], area = bounds) {
  assert.ok(position);
  assert.ok(position.left >= area.left && position.top >= area.top);
  assert.ok(position.right <= area.right && position.bottom <= area.bottom);
  for (const obstacle of obstacles) assert.equal(intersects(position, obstacle), false);
}

test('an ordinary map label retains its above-building placement', () => {
  const position = mapLabelPosition({ anchor: { x: 500, y: 300, width: 100, height: 100 }, size: { width: 180, height: 40 }, bounds });
  clear(position);
  assert.deepEqual([position.left, position.top, position.placement], [460, 252, 'above']);
});
test('Lighthouse at the top/right edge avoids both actual menu rectangles', () => {
  const blockers = [hud, sidebar, dock];
  const position = mapLabelPosition({ anchor: { left: 1246, top: 64, width: 90, height: 134 }, size: { width: 200, height: 40 }, bounds, blockers });
  clear(position, blockers);
  assert.ok(position.top >= hud.bottom);
});
test('Chapel against the right stack is moved to available map space', () => {
  const blockers = [hud, sidebar, dock];
  const position = mapLabelPosition({ anchor: { left: 1295, top: 139, width: 103, height: 106 }, size: { width: 210, height: 40 }, bounds, blockers });
  clear(position, blockers);
  assert.ok(position.right <= sidebar.left);
});
test('labels at each viewport edge are fully bounded', () => {
  for (const [x, y] of [[0, 0], [1630, 0], [0, 915], [1630, 915]]) {
    clear(mapLabelPosition({ anchor: { x, y, width: 42, height: 26 }, size: { width: 195, height: 45 }, bounds }));
  }
});
test('portrait labels avoid the header and bottom dock in a narrow panned map', () => {
  const area = { left: 8, top: 128, right: 382, bottom: 532 };
  const blockers = [{ left: 8, top: 7, right: 382, bottom: 120 }, { left: 8, top: 540, right: 382, bottom: 770 }];
  const position = mapLabelPosition({ anchor: { left: 275, top: 132, width: 90, height: 90 }, size: { width: 180, height: 35 }, bounds: area, blockers });
  clear(position, blockers, area);
});
test('a partial-height sidebar does not reserve all screen space below it', () => {
  const blocker = { left: 1390, top: 79, right: 1672, bottom: 230 };
  const position = mapLabelPosition({ anchor: { left: 1460, top: 200, width: 100, height: 100 }, size: { width: 180, height: 40 }, bounds, blockers: [blocker] });
  clear(position, [blocker]);
  assert.ok(position.top >= blocker.bottom);
});
test('a fully blocked map returns no misleading label over the UI', () => {
  assert.equal(mapLabelPosition({ anchor: { x: 20, y: 20, width: 50, height: 50 }, size: { width: 100, height: 30 }, bounds, blockers: [bounds] }), null);
});
test('invalid or oversized measurements are safely rejected', () => {
  const args = { anchor: { x: 500, y: 300, width: 100, height: 100 }, size: { width: 180, height: 40 }, bounds };
  for (const patch of [{ anchor: null }, { size: { width: Infinity, height: 20 } }, { size: { width: 180, height: -1 } }, { size: { width: 1800, height: 40 } }, { bounds: { x: 0, y: 0, width: 0, height: 100 } }]) {
    assert.equal(mapLabelPosition({ ...args, ...patch }), null);
  }
});
test('positioning leaves caller-owned anchor, blockers and bounds unchanged', () => {
  const args = { anchor: { x: 1246, y: 64, width: 90, height: 134 }, size: { width: 210, height: 40 }, bounds, blockers: [hud, sidebar, dock] };
  const before = structuredClone(args);
  clear(mapLabelPosition(args), [hud, sidebar, dock]);
  assert.deepEqual(args, before);
});
