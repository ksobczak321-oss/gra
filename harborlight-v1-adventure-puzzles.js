// Small, deterministic puzzles used by island adventures. Inputs describe moves,
// never a claimed win. A bridge is checked as a loaded, pin-jointed truss.
const EPS = 1e-8;
export const BRIDGE_NODES = Object.freeze([
  { id: 0, x: 0, y: 72, anchor: true }, { id: 1, x: 25, y: 72 },
  { id: 2, x: 50, y: 72 }, { id: 3, x: 75, y: 72 },
  { id: 4, x: 100, y: 72, anchor: true }, { id: 5, x: 25, y: 30 },
  { id: 6, x: 50, y: 30 }, { id: 7, x: 75, y: 30 }
]);
export const BRIDGE_DECK = Object.freeze([[0, 1], [1, 2], [2, 3], [3, 4]]);
export const BRIDGE_HINT = Object.freeze([...BRIDGE_DECK, [0, 5], [5, 1], [5, 6], [1, 6], [6, 2], [6, 7], [2, 7], [7, 3], [7, 4]]);
const key = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
const NODE_COORDINATES = BRIDGE_NODES.map(node => ({ x: node.x * 4, y: (72 - node.y) * 80 / 42 }));
export function bridgeEdgeAllowed(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a === b || !BRIDGE_NODES[a] || !BRIDGE_NODES[b]) return false;
  const left = NODE_COORDINATES[a], right = NODE_COORDINATES[b];
  return Math.hypot(left.x - right.x, left.y - right.y) <= 129;
}
export function normalizedBridgeEdges(edges) {
  const seen = new Set();
  return (Array.isArray(edges) ? edges : []).flatMap(edge => {
    if (!Array.isArray(edge) || !bridgeEdgeAllowed(edge[0], edge[1])) return [];
    const pair = [Math.min(edge[0], edge[1]), Math.max(edge[0], edge[1])], id = key(...pair);
    if (seen.has(id)) return []; seen.add(id); return [pair];
  }).slice(0, 30);
}
function solveLinear(matrix, vector) {
  const size = vector.length, a = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row;
    if (Math.abs(a[pivot][column]) < EPS) return null;
    [a[column], a[pivot]] = [a[pivot], a[column]];
    const divisor = a[column][column];
    for (let j = column; j <= size; j++) a[column][j] /= divisor;
    for (let row = 0; row < size; row++) if (row !== column) {
      const factor = a[row][column];
      for (let j = column; j <= size; j++) a[row][j] -= factor * a[column][j];
    }
  }
  return a.map(row => row[size]);
}
export function testBridge(edges, budget = 13) {
  const clean = normalizedBridgeEdges(edges), used = new Set(clean.map(edge => key(...edge)));
  const failure = reason => ({ stable: false, reason, beams: clean.length, maxDeflection: null, maxForce: null });
  if (clean.length > budget) return failure('budget');
  if (!BRIDGE_DECK.every(edge => used.has(key(...edge)))) return failure('deck');
  const usedNodes = [...new Set(clean.flat())].sort((a, b) => a - b);
  const fixed = new Set(['0:x', '0:y', '4:y']);
  const freedoms = usedNodes.flatMap(node => ['x', 'y'].map(axis => `${node}:${axis}`)).filter(id => !fixed.has(id));
  const indices = new Map(freedoms.map((id, index) => [id, index]));
  const stiffness = freedoms.map(() => freedoms.map(() => 0));
  const load = freedoms.map(id => ['1:y', '2:y', '3:y'].includes(id) ? -100 : 0);
  const bars = [];
  for (const [a, b] of clean) {
    const left = NODE_COORDINATES[a], right = NODE_COORDINATES[b];
    const length = Math.hypot(right.x - left.x, right.y - left.y);
    const c = (right.x - left.x) / length, s = (right.y - left.y) / length;
    const direction = [-c, -s, c, s], ids = [`${a}:x`, `${a}:y`, `${b}:x`, `${b}:y`];
    const factor = 100000 / length;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const row = indices.get(ids[i]), column = indices.get(ids[j]);
      if (row !== undefined && column !== undefined) stiffness[row][column] += factor * direction[i] * direction[j];
    }
    bars.push({ direction, ids, factor });
  }
  const displacement = solveLinear(stiffness, load);
  if (!displacement) return failure('unstable');
  const maxDeflection = Math.max(0, ...displacement.map(Math.abs));
  const maxForce = Math.max(0, ...bars.map(bar => Math.abs(bar.factor * bar.ids.reduce((total, id, index) => total + bar.direction[index] * (displacement[indices.get(id)] || 0), 0))));
  const stable = maxDeflection <= 12 && maxForce <= 600;
  return { stable, reason: stable ? 'safe' : maxDeflection > 12 ? 'deflection' : 'overloaded', beams: clean.length, maxDeflection, maxForce };
}

export const PIPE_DIRECTIONS = Object.freeze(['N', 'E', 'S', 'W']);
const neighbor = (index, direction, size) => {
  const row = Math.floor(index / size), column = index % size;
  if (direction === 'N') return row ? index - size : null;
  if (direction === 'E') return column < size - 1 ? index + 1 : null;
  if (direction === 'S') return row < size - 1 ? index + size : null;
  return column ? index - 1 : null;
};
export function pipePorts(tile) {
  const rotation = Math.floor(tile?.rotation || 0) % 4;
  return (tile?.basePorts || []).filter(direction => PIPE_DIRECTIONS.includes(direction))
    .map(direction => PIPE_DIRECTIONS[(PIPE_DIRECTIONS.indexOf(direction) + rotation + 4) % 4]);
}
export function createGardenPuzzle(random = Math.random) {
  const route = [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12];
  const directionBetween = (left, right) => right - left === 1 ? 'E' : right - left === -1 ? 'W' : right > left ? 'S' : 'N';
  const tiles = Array(16);
  route.forEach((index, position) => {
    const before = position === 0 ? 'W' : directionBetween(index, route[position - 1]);
    const after = position === route.length - 1 ? 'W' : directionBetween(index, route[position + 1]);
    tiles[index] = { basePorts: [before, after], rotation: Math.floor(random() * 4) % 4 };
  });
  // Every tile rotated back to zero is a known, freely solvable solution.
  return { size: 4, source: 0, sourceEntry: 'W', ponds: [3, 9, 14], tiles, wet: [] };
}
export function gardenFlow(puzzle) {
  const size = puzzle.size || 4, tiles = puzzle.tiles || [];
  if (!tiles[puzzle.source] || !pipePorts(tiles[puzzle.source]).includes(puzzle.sourceEntry || 'W')) return [];
  const seen = new Set([puzzle.source]), queue = [puzzle.source];
  for (const current of queue) for (const port of pipePorts(tiles[current])) {
    const next = neighbor(current, port, size), opposite = PIPE_DIRECTIONS[(PIPE_DIRECTIONS.indexOf(port) + 2) % 4];
    if (next !== null && tiles[next] && !seen.has(next) && pipePorts(tiles[next]).includes(opposite)) { seen.add(next); queue.push(next); }
  }
  return [...seen];
}
export function cargoMoment(crates) {
  return crates.reduce((moment, crate) => moment + (Number.isFinite(crate.slot) ? crate.slot * crate.weight : 0), 0);
}
