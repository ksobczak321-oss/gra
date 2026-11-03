import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTheatreMapBuilding, renderTheatreScene, theatreDecorationSvg, theatreSpriteFrame,
  THEATRE_SLOT_POSITIONS, THEATRE_ATLAS_LAYOUT } from '../harborlight-v1-theatre-art.js';

const state = () => ({ theatre: { collection: [
  { id: 'decoration-1', type: 'fountain', level: 20, style: 'marble', slot: 0 },
  { id: 'decoration-2', type: 'tree', level: 10, style: 'garden', slot: 15 }
], atmosphere: { lighting: 'golden', paving: 'stone' }, badges: [] } });

test('the island renders only its matching Theatre building, keeping the personal courtyard inside', () => {
  const world = state(), before = structuredClone(world), map = renderTheatreMapBuilding(world);
  assert.match(map, /theatre-building-v30\.png/);
  assert.equal((map.match(/<image /g) || []).length, 1);
  assert.doesNotMatch(map, /theatre-courtyard-v30|theatre-decor-atlas-v30|data-theatre-scene-slot|theatre-decoration/);
  assert.equal(renderTheatreScene(world, { compact: true }), renderTheatreMapBuilding(world, { prefix: 'theatre' }));
  assert.deepEqual(world, before);
});

test('admiring a garden shows only the owned composition; editing may preview a purchase without granting it', () => {
  const world = state(), before = structuredClone(world);
  const preview = { type: 'statue', level: 1, style: 'coastal', slot: 6 };
  const admired = renderTheatreScene(world, { selectedSlot: 6, preview, editing: false });
  assert.match(admired, /theatre-courtyard-v30\.png/);
  assert.equal((admired.match(/data-theatre-scene-slot=/g) || []).length, 20);
  assert.equal((admired.match(/class="theatre-decoration theatre-decoration-/g) || []).length, 2);
  assert.doesNotMatch(admired, /data-theatre-slot-marker=|class="theatre-placement-preview"/);
  const editing = renderTheatreScene(world, { selectedSlot: 6, preview, editing: true });
  assert.match(editing, /data-theatre-slot-marker="6"/);
  assert.match(editing, /class="theatre-placement-preview"/);
  assert.equal((editing.match(/class="theatre-decoration theatre-decoration-/g) || []).length, 3);
  assert.deepEqual(world, before);
});

test('illustrated upgrade tiers select contained atlas cells and intermediate levels change actual size', () => {
  for (const [level, row] of [[1,0],[4,0],[5,1],[9,1],[10,2],[14,2],[15,3],[19,3],[20,4]]) {
    const frame = theatreSpriteFrame('gateway', level);
    assert.equal(frame.row, row); assert.equal(frame.column, 8);
    assert.ok(frame.x >= 0 && frame.y >= 0);
    assert.ok(frame.x + frame.width <= THEATRE_ATLAS_LAYOUT.width);
    assert.ok(frame.y + frame.height <= THEATRE_ATLAS_LAYOUT.height);
  }
  const one = theatreDecorationSvg('fountain', 1), two = theatreDecorationSvg('fountain', 2);
  assert.notEqual(one.match(/data-sprite-width="([\d.]+)"/)[1], two.match(/data-sprite-width="([\d.]+)"/)[1]);
  assert.match(theatreDecorationSvg('tree', 20), /data-atlas-row="4"/);
  assert.equal(new Set(THEATRE_SLOT_POSITIONS.map(position => `${position.x},${position.y}`)).size, 20);
});

test('atmosphere changes presentation without moving decorations or changing their economy', () => {
  const world = state(), before = structuredClone(world);
  const day = renderTheatreScene({ theatre: { ...world.theatre, atmosphere: { lighting: 'day', paving: 'sandstone' } } });
  const night = renderTheatreScene({ theatre: { ...world.theatre, atmosphere: { lighting: 'night', paving: 'brick' } } });
  assert.match(day, /data-theatre-lighting="day"/); assert.match(night, /data-theatre-lighting="night"/);
  assert.match(night, /theatre-night-lights/); assert.match(night, /data-theatre-paving="brick"/);
  assert.notEqual(day, night); assert.deepEqual(world, before);
  const escaped = renderTheatreScene(world, { prefix: '"><script>alert(1)</script>' });
  assert.doesNotMatch(escaped, /<script>|onerror=/);
});

test('levels after twenty retain the masterpiece and gain richer visible foundations without unbounded geometry', () => {
  const base = theatreDecorationSvg('fountain', 20, 'coastal', { animated: false });
  const twentyOne = theatreDecorationSvg('fountain', 21, 'coastal', { animated: false });
  const twentyTwo = theatreDecorationSvg('fountain', 22, 'coastal', { animated: false });
  assert.doesNotMatch(base, /theatre-masterwork-finish/);
  assert.match(twentyOne, /theatre-masterwork-finish/); assert.match(twentyTwo, /theatre-masterwork-finish/);
  assert.equal(theatreSpriteFrame('fountain', 21).row, 4); assert.equal(theatreSpriteFrame('fountain', 22).row, 4);
  assert.match(twentyOne.slice(twentyOne.indexOf('theatre-masterwork-finish')), /data-atlas-row="2"/);
  assert.match(twentyTwo.slice(twentyTwo.indexOf('theatre-masterwork-finish')), /data-atlas-row="3"/);
  const forty = theatreDecorationSvg('tree', 40), hundred = theatreDecorationSvg('tree', 100);
  assert.notEqual(forty.match(/stroke-dashoffset="([^"]+)"/)[1], hundred.match(/stroke-dashoffset="([^"]+)"/)[1]);
  const greatest = theatreDecorationSvg('tree', Number.MAX_SAFE_INTEGER);
  assert.match(greatest, /data-decoration-level="9007199254740991"/);
  assert.doesNotMatch(greatest, /NaN|Infinity|undefined/);
  assert.ok(greatest.length < 20000);
  for (const width of [...greatest.matchAll(/data-sprite-width="([\d.]+)"/g)].map(match => Number(match[1]))) assert.ok(width <= 180);
  assert.ok((greatest.match(/<path /g) || []).length <= 10);
});
