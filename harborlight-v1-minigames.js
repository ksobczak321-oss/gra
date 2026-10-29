// Saved, deterministic expedition games. Input never supplies elapsed time.
// The activity clock drives physics, card delays, shuffles and hard deadlines.
export const MINI_GAME_RULES = Object.freeze({
  version: 16, baseReward: 50, fullRewardRatio: 2 / 3, penaltyIntervals: 12,
  tilt: Object.freeze({ baseSeconds: 180, minimumSeconds: 60, difficultyPerStage: 0.1, maximumBalls: 6, maximumCells: 8 }),
  triples: Object.freeze({ firstCards: 24, cardsPerStage: 6, maximumCards: 120,
    baseSeconds: 240, extraSecondsPerStage: 30, maximumSeconds: 900,
    shuffleFromStage: 4, firstShuffleSeconds: 60, minimumShuffleSeconds: 30, mismatchSeconds: 0.8 })
});

const EPS = 1e-8;
const FIXED_STEP = 1 / 120;
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
const integer = (n, min, max) => Math.floor(clamp(n, min, max));
const plain = n => n && typeof n === 'object' && !Array.isArray(n);

function randomizer(seed) {
  let value = (seed >>> 0) || 1;
  return () => {
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    return (value >>> 0) / 0x100000000;
  };
}
function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }
  return values;
}

export function miniGameRoundRules(kind, stageNumber = 1, overrides = {}) {
  const stage = integer(stageNumber, 1, 1000000);
  const tilt = kind === 'tilt';
  const baseSeconds = tilt ? clamp(overrides.baseSeconds ?? MINI_GAME_RULES.tilt.baseSeconds, 1, 86400) : MINI_GAME_RULES.triples.baseSeconds;
  const difficultyPerStage = clamp(overrides.difficultyPerStage ?? MINI_GAME_RULES.tilt.difficultyPerStage, 0, 10);
  const timeLimit = tilt ? Math.max(Math.min(baseSeconds, MINI_GAME_RULES.tilt.minimumSeconds), baseSeconds / (1 + difficultyPerStage * (stage - 1))) :
    Math.min(MINI_GAME_RULES.triples.maximumSeconds, MINI_GAME_RULES.triples.baseSeconds + MINI_GAME_RULES.triples.extraSecondsPerStage * (stage - 1));
  return { version: 16, kind: tilt ? 'tilt' : 'triples', stage, timeLimit,
    fullRewardUntil: timeLimit * MINI_GAME_RULES.fullRewardRatio,
    penaltyEvery: timeLimit / MINI_GAME_RULES.penaltyIntervals,
    baseReward: MINI_GAME_RULES.baseReward,
    ballCount: tilt ? Math.min(MINI_GAME_RULES.tilt.maximumBalls, 1 + Math.floor((stage - 1) / 2)) : 0,
    mazeCells: tilt ? Math.min(MINI_GAME_RULES.tilt.maximumCells, 3 + Math.floor((stage - 1) / 3)) : 0,
    cardCount: tilt ? 0 : Math.min(MINI_GAME_RULES.triples.maximumCards, MINI_GAME_RULES.triples.firstCards + MINI_GAME_RULES.triples.cardsPerStage * (stage - 1)),
    shuffleInterval: !tilt && stage >= MINI_GAME_RULES.triples.shuffleFromStage ?
      Math.max(MINI_GAME_RULES.triples.minimumShuffleSeconds, MINI_GAME_RULES.triples.firstShuffleSeconds - 2 * (stage - MINI_GAME_RULES.triples.shuffleFromStage)) : null };
}

function createTilt(stage, seed) {
  const random = randomizer(seed), rules = miniGameRoundRules('tilt', stage);
  const n = rules.mazeCells, margin = 24, cell = (600 - margin * 2) / n;
  const visited = new Set([0]), passages = new Set(), stack = [0];
  const edge = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
  while (stack.length) {
    const current = stack.at(-1), row = Math.floor(current / n), col = current % n;
    const neighbours = [[row - 1, col], [row, col + 1], [row + 1, col], [row, col - 1]]
      .filter(([r, c]) => r >= 0 && r < n && c >= 0 && c < n)
      .map(([r, c]) => r * n + c).filter(id => !visited.has(id));
    if (!neighbours.length) { stack.pop(); continue; }
    const next = neighbours[Math.floor(random() * neighbours.length)];
    passages.add(edge(current, next)); visited.add(next); stack.push(next);
  }
  const walls = [
    { x: margin - 5, y: margin - 5, width: 552 + 10, height: 10 },
    { x: margin - 5, y: 576 - 5, width: 552 + 10, height: 10 },
    { x: margin - 5, y: margin - 5, width: 10, height: 552 + 10 },
    { x: 576 - 5, y: margin - 5, width: 10, height: 552 + 10 }
  ];
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
    const id = row * n + col;
    if (col + 1 < n && !passages.has(edge(id, id + 1))) walls.push({ x: margin + (col + 1) * cell - 4, y: margin + row * cell - 4, width: 8, height: cell + 8 });
    if (row + 1 < n && !passages.has(edge(id, id + n))) walls.push({ x: margin + col * cell - 4, y: margin + (row + 1) * cell - 4, width: cell + 8, height: 8 });
  }
  const distance = Array(n * n).fill(Infinity); distance[0] = 0;
  const queue = [0];
  for (const current of queue) for (const candidate of [current - n, current + n, current - 1, current + 1]) {
    if (candidate < 0 || candidate >= n * n || !passages.has(edge(current, candidate)) || Number.isFinite(distance[candidate])) continue;
    distance[candidate] = distance[current] + 1; queue.push(candidate);
  }
  const goalCells = Array.from({ length: n * n - 1 }, (_, index) => index + 1).sort((a, b) => distance[b] - distance[a]).slice(0, rules.ballCount);
  const goals = goalCells.map((id, index) => ({ id: index, x: margin + (id % n + 0.5) * cell, y: margin + (Math.floor(id / n) + 0.5) * cell, filledBy: null }));
  const balls = goals.map((_, id) => {
    const start = queue[id];
    return { id, x: margin + (start % n + 0.5) * cell,
      y: margin + (Math.floor(start / n) + 0.5) * cell, vx: 0, vy: 0, settled: false, goalId: null };
  });
  return { version: 1, kind: 'tilt', seed: seed >>> 0, boardSize: 600, radius: 14, walls, balls, goals,
    tiltX: 0, tiltY: 0, physicsRemainder: 0, solved: false };
}

function createTriples(stage, seed, clock) {
  const rules = miniGameRoundRules('triples', stage), columns = Math.ceil(Math.sqrt(rules.cardCount * 1.25));
  const cards = shuffle(Array.from({ length: rules.cardCount }, (_, index) => Math.floor(index / 3)), randomizer(seed));
  return { version: 1, kind: 'triples', seed: seed >>> 0, rows: Math.ceil(cards.length / columns), columns,
    symbolCount: rules.cardCount / 3, cards, revealed: [], matched: Array(cards.length).fill(false),
    hideAt: null, shuffleCount: 0, shuffleInterval: rules.shuffleInterval,
    nextShuffleAt: rules.shuffleInterval ? clock + rules.shuffleInterval : null, solved: false };
}

export function createMiniGame(kind, stage = 1, seed = 1, clock = 0) {
  return kind === 'tilt' ? createTilt(stage, seed) : createTriples(stage, seed, clock);
}

export function normalizeMiniGame(raw, stage = 1, clock = 0) {
  if (!plain(raw) || raw.version !== 1 || !['tilt', 'triples'].includes(raw.kind)) return null;
  const seed = integer(raw.seed, 1, 0xffffffff);
  if (raw.kind === 'triples') {
    if (!Array.isArray(raw.cards) || !raw.cards.length || raw.cards.length > MINI_GAME_RULES.triples.maximumCards || raw.cards.length % 3) return null;
    const cards = raw.cards.map(value => integer(value, 0, 119));
    const counts = new Map();
    for (const symbol of cards) counts.set(symbol, (counts.get(symbol) || 0) + 1);
    if ([...counts.values()].some(count => count % 3)) return null;
    const matched = cards.map((_, index) => raw.matched?.[index] === true);
    const matchedCounts = new Map();
    for (let index = 0; index < cards.length; index++) if (matched[index]) matchedCounts.set(cards[index], (matchedCounts.get(cards[index]) || 0) + 1);
    if ([...matchedCounts.values()].some(count => count % 3)) return null;
    const columns = integer(raw.columns, 1, 30), rows = Math.ceil(cards.length / columns);
    const revealed = [...new Set((Array.isArray(raw.revealed) ? raw.revealed : []).filter(index => Number.isInteger(index) && index >= 0 && index < cards.length && !matched[index]))].slice(0, 3);
    const rules = miniGameRoundRules('triples', stage);
    return { version: 1, kind: 'triples', seed, columns, rows, symbolCount: counts.size, cards, matched, revealed,
      hideAt: revealed.length === 3 ? clamp(raw.hideAt, 0, Number.MAX_SAFE_INTEGER) : null,
      shuffleCount: integer(raw.shuffleCount, 0, Number.MAX_SAFE_INTEGER), shuffleInterval: rules.shuffleInterval,
      nextShuffleAt: rules.shuffleInterval ? clamp(raw.nextShuffleAt ?? clock + rules.shuffleInterval, clock, Number.MAX_SAFE_INTEGER) : null,
      solved: matched.every(Boolean) };
  }
  if (!Array.isArray(raw.balls) || !raw.balls.length || raw.balls.length > MINI_GAME_RULES.tilt.maximumBalls || !Array.isArray(raw.goals) || raw.goals.length !== raw.balls.length || !Array.isArray(raw.walls) || raw.walls.length > 150) return null;
  const goals = raw.goals.map((goal, id) => ({ id, x: clamp(goal?.x, 12, 588), y: clamp(goal?.y, 12, 588), filledBy: null }));
  const balls = raw.balls.map((ball, id) => {
    const goalId = Number.isInteger(ball?.goalId) && ball.goalId >= 0 && ball.goalId < goals.length ? ball.goalId : null;
    const settled = ball?.settled === true && goalId !== null && goals[goalId].filledBy === null;
    if (settled) goals[goalId].filledBy = id;
    return { id, x: settled ? goals[goalId].x : clamp(ball?.x, 14, 586), y: settled ? goals[goalId].y : clamp(ball?.y, 14, 586),
      vx: settled ? 0 : clamp(ball?.vx ?? 0, -220, 220), vy: settled ? 0 : clamp(ball?.vy ?? 0, -220, 220), settled, goalId: settled ? goalId : null };
  });
  const walls = raw.walls.filter(plain).map(wall => ({ x: clamp(wall.x, 0, 600), y: clamp(wall.y, 0, 600), width: clamp(wall.width, 1, 600), height: clamp(wall.height, 1, 600) }));
  return { version: 1, kind: 'tilt', seed, boardSize: 600, radius: 14, walls, balls, goals,
    tiltX: clamp(raw.tiltX ?? 0, -1, 1), tiltY: clamp(raw.tiltY ?? 0, -1, 1), physicsRemainder: clamp(raw.physicsRemainder, 0, FIXED_STEP), solved: balls.every(ball => ball.settled) };
}

function hitWall(ball, wall, radius) {
  const nearestX = clamp(ball.x, wall.x, wall.x + wall.width), nearestY = clamp(ball.y, wall.y, wall.y + wall.height);
  const dx = ball.x - nearestX, dy = ball.y - nearestY, distance = Math.hypot(dx, dy);
  if (distance >= radius) return;
  let nx, ny, depth;
  if (distance > EPS) { nx = dx / distance; ny = dy / distance; depth = radius - distance; }
  else {
    const sides = [{ distance: ball.x - wall.x, nx: -1, ny: 0 }, { distance: wall.x + wall.width - ball.x, nx: 1, ny: 0 },
      { distance: ball.y - wall.y, nx: 0, ny: -1 }, { distance: wall.y + wall.height - ball.y, nx: 0, ny: 1 }];
    const side = sides.sort((a, b) => a.distance - b.distance)[0]; nx = side.nx; ny = side.ny; depth = radius + side.distance;
  }
  ball.x += nx * depth; ball.y += ny * depth;
  const velocity = ball.vx * nx + ball.vy * ny;
  if (velocity < 0) { ball.vx -= 1.35 * velocity * nx; ball.vy -= 1.35 * velocity * ny; }
}
function physicsStep(game) {
  const radius = game.radius;
  for (const ball of game.balls) {
    if (ball.settled) continue;
    ball.vx = clamp((ball.vx + game.tiltX * 460 * FIXED_STEP) * Math.exp(-1.7 * FIXED_STEP), -220, 220);
    ball.vy = clamp((ball.vy + game.tiltY * 460 * FIXED_STEP) * Math.exp(-1.7 * FIXED_STEP), -220, 220);
    ball.x += ball.vx * FIXED_STEP; ball.y += ball.vy * FIXED_STEP;
    for (const wall of game.walls) hitWall(ball, wall, radius);
    if (ball.x < radius || ball.x > 600 - radius) { ball.x = clamp(ball.x, radius, 600 - radius); ball.vx *= -0.35; }
    if (ball.y < radius || ball.y > 600 - radius) { ball.y = clamp(ball.y, radius, 600 - radius); ball.vy *= -0.35; }
    const goal = game.goals.find(target => target.filledBy === null && Math.hypot(ball.x - target.x, ball.y - target.y) < 12 && Math.hypot(ball.vx, ball.vy) < 180);
    if (goal) { ball.settled = true; ball.goalId = goal.id; ball.x = goal.x; ball.y = goal.y; ball.vx = ball.vy = 0; goal.filledBy = ball.id; }
  }
  for (let left = 0; left < game.balls.length; left++) for (let right = left + 1; right < game.balls.length; right++) {
    const a = game.balls[left], b = game.balls[right];
    if (a.settled || b.settled) continue;
    const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
    if (distance >= radius * 2) continue;
    const nx = distance > EPS ? dx / distance : 1, ny = distance > EPS ? dy / distance : 0, depth = (radius * 2 - distance) / 2;
    a.x -= nx * depth; a.y -= ny * depth; b.x += nx * depth; b.y += ny * depth;
    const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (closing > 0) { a.vx -= closing * nx * 0.85; a.vy -= closing * ny * 0.85; b.vx += closing * nx * 0.85; b.vy += closing * ny * 0.85; }
    for (const wall of game.walls) { hitWall(a, wall, radius); hitWall(b, wall, radius); }
  }
  game.solved = game.balls.every(ball => ball.settled);
}

export function setMiniGameTilt(game, x, y) {
  if (game?.kind !== 'tilt' || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  game.tiltX = clamp(x, -1, 1); game.tiltY = clamp(y, -1, 1); return true;
}

export function revealMiniGameCard(game, index, clock) {
  if (game?.kind !== 'triples' || game.solved || !Number.isInteger(index) || index < 0 || index >= game.cards.length || game.matched[index] || game.revealed.includes(index) || game.revealed.length >= 3) return false;
  game.revealed.push(index);
  if (game.revealed.length === 3) {
    if (game.revealed.every(card => game.cards[card] === game.cards[game.revealed[0]])) {
      for (const card of game.revealed) game.matched[card] = true;
      game.revealed = []; game.hideAt = null; game.solved = game.matched.every(Boolean);
    } else game.hideAt = clock + MINI_GAME_RULES.triples.mismatchSeconds;
  }
  return true;
}

export function advanceMiniGame(game, seconds, fromClock = 0) {
  if (!game || game.solved || !Number.isFinite(seconds) || seconds < 0) return { solved: !!game?.solved, elapsed: 0 };
  if (game.kind === 'tilt') {
    const carry = game.physicsRemainder || 0;
    const steps = Math.floor((seconds + carry + EPS) / FIXED_STEP);
    for (let index = 0; index < steps; index++) {
      physicsStep(game);
      if (game.solved) { game.physicsRemainder = 0; return { solved: true, elapsed: Math.max(0, (index + 1) * FIXED_STEP - carry) }; }
    }
    game.physicsRemainder = Math.max(0, seconds + carry - steps * FIXED_STEP);
    return { solved: false, elapsed: seconds };
  }
  const until = fromClock + seconds;
  while (true) {
    const hideAt = game.hideAt ?? Infinity, shuffleAt = game.nextShuffleAt ?? Infinity;
    const eventAt = Math.min(hideAt, shuffleAt);
    if (!Number.isFinite(eventAt) || eventAt > until + EPS) break;
    if (hideAt <= shuffleAt) { game.revealed = []; game.hideAt = null; }
    else {
      const indices = game.cards.map((_, index) => index).filter(index => !game.matched[index] && !game.revealed.includes(index));
      const values = shuffle(indices.map(index => game.cards[index]), randomizer((game.seed ^ Math.imul(game.shuffleCount + 1, 0x9e3779b9)) >>> 0));
      indices.forEach((index, position) => { game.cards[index] = values[position]; });
      game.shuffleCount++;
      game.nextShuffleAt = eventAt + game.shuffleInterval;
    }
  }
  return { solved: game.solved, elapsed: seconds };
}
