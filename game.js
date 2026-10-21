const DIRECTIONS = [
  { dr: -1, dc: 0, bit: 1, opposite: 4 },
  { dr: 0, dc: 1, bit: 2, opposite: 8 },
  { dr: 1, dc: 0, bit: 4, opposite: 1 },
  { dr: 0, dc: -1, bit: 8, opposite: 2 }
];

const PIECES = {
  straight: 5,
  corner: 3,
  tee: 7,
  cross: 15
};

const LEVELS = [
  {
    cols: 4,
    rows: 4,
    par: 4,
    source: [0, 0],
    target: [3, 3],
    cells: [
      ['corner',1],['straight',1],['corner',2],['corner',2],
      ['corner',0],['corner',1],['straight',0],['straight',1],
      ['straight',0],['corner',3],['corner',0],['straight',0],
      ['corner',0],['straight',1],['corner',3],['corner',3]
    ]
  },
  {
    cols: 4,
    rows: 4,
    par: 5,
    source: [3, 0],
    target: [0, 3],
    cells: [
      ['corner',1],['straight',1],['corner',2],['corner',2],
      ['straight',0],['corner',0],['corner',3],['straight',0],
      ['corner',1],['corner',2],['straight',0],['corner',3],
      ['corner',0],['straight',1],['corner',3],['corner',0]
    ]
  },
  {
    cols: 5,
    rows: 5,
    par: 7,
    source: [2, 0],
    target: [2, 4],
    cells: [
      ['corner',0],['straight',1],['corner',2],['straight',1],['corner',3],
      ['straight',0],['corner',1],['tee',2],['corner',3],['straight',0],
      ['straight',1],['corner',0],['tee',1],['corner',2],['straight',1],
      ['corner',1],['straight',0],['tee',3],['corner',0],['corner',2],
      ['corner',0],['straight',1],['corner',3],['straight',1],['corner',3]
    ]
  },
  {
    cols: 5,
    rows: 5,
    par: 8,
    source: [0, 2],
    target: [4, 2],
    cells: [
      ['corner',1],['corner',2],['straight',0],['corner',2],['corner',3],
      ['straight',0],['tee',0],['corner',1],['tee',1],['straight',0],
      ['corner',1],['corner',3],['tee',2],['corner',0],['corner',2],
      ['straight',0],['tee',3],['corner',2],['tee',2],['straight',0],
      ['corner',0],['corner',1],['straight',0],['corner',0],['corner',3]
    ]
  },
  {
    cols: 5,
    rows: 5,
    par: 10,
    source: [4, 0],
    target: [0, 4],
    cells: [
      ['corner',1],['straight',1],['tee',2],['straight',1],['corner',2],
      ['straight',0],['corner',0],['corner',3],['corner',1],['straight',0],
      ['tee',1],['corner',2],['cross',0],['corner',3],['tee',3],
      ['straight',0],['corner',1],['corner',0],['corner',2],['straight',0],
      ['corner',0],['straight',1],['tee',0],['straight',1],['corner',3]
    ]
  }
];

let currentLevel = Number(localStorage.getItem('blackout-level') || 0);
if (currentLevel >= LEVELS.length) currentLevel = 0;
let moves = 0;
let totalStars = Number(localStorage.getItem('blackout-stars') || 0);
let boardState = [];
let won = false;

const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const parEl = document.getElementById('par');
const starsEl = document.getElementById('stars');
const sectorEl = document.getElementById('sectorNo');
const statusEl = document.getElementById('statusText');
const nextBtn = document.getElementById('nextBtn');
const resetBtn = document.getElementById('resetBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const statusRow = document.querySelector('.status-row');

function rotateMask(mask, turns) {
  let result = mask;
  for (let i = 0; i < turns; i++) {
    const north = result & 1;
    const east = result & 2;
    const south = result & 4;
    const west = result & 8;
    result = (west ? 1 : 0) | (north ? 2 : 0) | (east ? 4 : 0) | (south ? 8 : 0);
  }
  return result;
}

function indexOf(row, col, level) {
  return row * level.cols + col;
}

function renderLevel() {
  const level = LEVELS[currentLevel];
  moves = 0;
  won = false;
  boardState = level.cells.map(([type, rot]) => ({ type, rot }));
  boardEl.style.setProperty('--cols', level.cols);
  boardEl.innerHTML = '';

  boardState.forEach((cell, index) => {
    const row = Math.floor(index / level.cols);
    const col = index % level.cols;
    const button = document.createElement('button');
    button.className = 'tile';
    button.type = 'button';
    button.dataset.index = index;
    button.setAttribute('aria-label', `Rotate tile row ${row + 1}, column ${col + 1}`);

    if (row === level.source[0] && col === level.source[1]) button.classList.add('source');
    if (row === level.target[0] && col === level.target[1]) button.classList.add('target');

    const wire = document.createElement('span');
    wire.className = `wire ${cell.type}`;
    wire.style.setProperty('--rot', cell.rot);
    const dot = document.createElement('span');
    dot.className = 'node-dot';
    button.append(wire, dot);
    button.addEventListener('click', () => rotateTile(index));
    boardEl.appendChild(button);
  });

  sectorEl.textContent = String(currentLevel + 1).padStart(2, '0');
  parEl.textContent = level.par;
  starsEl.textContent = totalStars;
  movesEl.textContent = moves;
  statusEl.textContent = 'Tap tiles to rotate them 90°.';
  nextBtn.hidden = true;
  statusRow.classList.remove('won');
  updateProgress();
  updateConnections();
}

function rotateTile(index) {
  if (won) return;
  boardState[index].rot = (boardState[index].rot + 1) % 4;
  moves++;
  movesEl.textContent = moves;
  const wire = boardEl.children[index].querySelector('.wire');
  wire.style.setProperty('--rot', boardState[index].rot);
  updateConnections();
}

function activeMask(index) {
  const cell = boardState[index];
  return rotateMask(PIECES[cell.type], cell.rot);
}

function updateConnections() {
  const level = LEVELS[currentLevel];
  const [sr, sc] = level.source;
  const queue = [[sr, sc]];
  const visited = new Set([`${sr},${sc}`]);

  while (queue.length) {
    const [row, col] = queue.shift();
    const idx = indexOf(row, col, level);
    const mask = activeMask(idx);

    for (const dir of DIRECTIONS) {
      if (!(mask & dir.bit)) continue;
      const nr = row + dir.dr;
      const nc = col + dir.dc;
      if (nr < 0 || nc < 0 || nr >= level.rows || nc >= level.cols) continue;
      const nidx = indexOf(nr, nc, level);
      const nmask = activeMask(nidx);
      if (!(nmask & dir.opposite)) continue;
      const key = `${nr},${nc}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }

  [...boardEl.children].forEach((tile, index) => {
    const row = Math.floor(index / level.cols);
    const col = index % level.cols;
    tile.classList.toggle('connected', visited.has(`${row},${col}`));
  });

  const targetKey = `${level.target[0]},${level.target[1]}`;
  if (visited.has(targetKey)) completeLevel();
}

function completeLevel() {
  if (won) return;
  won = true;
  const level = LEVELS[currentLevel];
  const earned = moves <= level.par ? 3 : moves <= level.par + 3 ? 2 : 1;
  totalStars += earned;
  localStorage.setItem('blackout-stars', String(totalStars));
  starsEl.textContent = totalStars;
  statusEl.textContent = `POWER RESTORED · +${earned} STAR${earned > 1 ? 'S' : ''}`;
  nextBtn.hidden = false;
  statusRow.classList.add('won');
  if (navigator.vibrate) navigator.vibrate([40, 30, 80]);
}

function updateProgress() {
  const completed = currentLevel;
  progressFill.style.width = `${(completed / LEVELS.length) * 100}%`;
  progressText.textContent = `${completed} / ${LEVELS.length}`;
}

nextBtn.addEventListener('click', () => {
  currentLevel = (currentLevel + 1) % LEVELS.length;
  localStorage.setItem('blackout-level', String(currentLevel));
  renderLevel();
});

resetBtn.addEventListener('click', renderLevel);

renderLevel();
