// Ambient water is rendered in the scene's 1672 × 941 logical coordinates.
// No timer, state mutation or UI hit areas: the scene owns the animation clock.
const TAU = Math.PI * 2;
const SEA_REGIONS = [
  // Left ocean, below the navigation rail and outside the harbour boats.
  [[0, 607], [109, 607], [136, 632], [208, 670], [212, 691], [175, 723], [184, 780], [263, 799], [294, 835], [294, 941], [0, 941]],
  // Right ocean: the rocky shoreline and beach stay outside this clip.
  [[1543, 475], [1672, 475], [1672, 941], [1330, 941], [1330, 831], [1388, 799], [1454, 780], [1515, 735], [1547, 699], [1534, 658], [1504, 625], [1514, 571]],
  // A small, genuinely open patch of harbour water between the piers and UI.
  [[700, 728], [779, 720], [851, 742], [921, 761], [922, 775], [710, 775]],
  // Open water north-west of the fields. Never crosses the left navigation.
  [[116, 180], [208, 193], [247, 197], [228, 217], [183, 246], [141, 272], [116, 282]],
];
const FALLS = [
  {
    // Main fall beneath the village's arched stone bridge.
    polygon: [[837, 523], [864, 522], [866, 537], [859, 560], [856, 587], [850, 615], [838, 641], [816, 643], [812, 636], [819, 610], [821, 584], [824, 560], [829, 540]],
    x: 811, y: 522, width: 56, height: 123, texture: [833, 552, 15, 47],
    pool: [819, 645, 42, 11], speed: 74, seed: 1,
  },
  {
    // Upper cascade, upstream of the quarry/village crossing.
    polygon: [[924, 319], [949, 323], [945, 337], [940, 355], [934, 370], [919, 371], [909, 366], [915, 351], [919, 332]],
    x: 908, y: 319, width: 42, height: 54, texture: [927, 332, 9, 23],
    pool: [923, 372, 28, 7], speed: 56, seed: 7,
  },
];
const WAVE_BANKS = [
  // x, y, width, amplitude, drift period, phase. Each bank is clipped to sea.
  [48, 680, 87, 6, 5.8, 0.2], [95, 758, 118, 7, 6.8, 1.1],
  [46, 900, 105, 6, 7.2, 2.8], [224, 873, 74, 5, 5.1, 0.7],
  [1600, 536, 117, 6, 6.4, 2.2], [1600, 629, 99, 7, 7.1, 0.9],
  [1619, 744, 93, 7, 5.9, 2.9], [1546, 853, 142, 8, 6.6, 1.7],
  [1432, 909, 109, 6, 6.1, 0.4], [778, 757, 100, 4, 6.9, 1.9],
];
let seaClip;
let fallClips;

function polygonPath(points) {
  const path = new Path2D();
  points.forEach(([x, y], index) => index ? path.lineTo(x, y) : path.moveTo(x, y));
  path.closePath();
  return path;
}

function ensurePaths() {
  if (seaClip) return;
  seaClip = new Path2D();
  for (const points of SEA_REGIONS) seaClip.addPath(polygonPath(points));
  fallClips = FALLS.map(fall => polygonPath(fall.polygon));
}

const fract = number => number - Math.floor(number);
const hash = number => fract(Math.sin(number * 127.1 + 311.7) * 43758.5453);

function seaSurface(ctx, source, t) {
  ctx.save();
  ctx.clip(seaClip);
  // The original painterly sea remains untouched. Thin travelling crests
  // and sun flecks animate it without shifting the fixed rocks or shoreline.
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  // Slow travelling wave fronts with a shorter broken crest, not a tiled
  // sine-wave pattern. The opacity rises and dissolves through each cycle.
  WAVE_BANKS.forEach(([x, y, width, amplitude, period, phase], index) => {
    for (let wave = 0; wave < 2; wave++) {
      const progress = fract(t / period + phase + wave * 0.51);
      const alpha = Math.sin(progress * Math.PI) * 0.32;
      const offset = (progress - 0.5) * 35;
      const drift = Math.sin(t * 0.17 + phase) * 11;
      const left = x - width / 2 + drift;
      const top = y + offset + wave * 20;
      ctx.strokeStyle = `rgba(222,252,250,${alpha})`;
      ctx.lineWidth = 1.2 + Math.sin(progress * Math.PI) * 0.9;
      ctx.beginPath();
      ctx.moveTo(left, top + 3);
      ctx.bezierCurveTo(left + width * 0.22, top - amplitude, left + width * 0.51, top + amplitude * 0.6, left + width * 0.66, top);
      ctx.bezierCurveTo(left + width * 0.8, top - amplitude * 0.5, left + width * 0.92, top + amplitude * 0.2, left + width, top + 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(247,255,249,${alpha * 0.7})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(left + width * 0.12, top + 4);
      ctx.quadraticCurveTo(left + width * 0.27, top - 2, left + width * 0.42, top + 1);
      ctx.stroke();
    }
  });
  // Small sun flecks breathe asynchronously in the water, at art scale.
  for (let index = 0; index < 31; index++) {
    const right = index % 2;
    const x = right ? 1430 + hash(index + 2) * 250 : 5 + hash(index + 13) * 270;
    const y = right ? 495 + hash(index + 10) * 440 : 630 + hash(index + 20) * 305;
    const flicker = Math.max(0, Math.sin(t * (0.9 + hash(index) * 0.8) + index * 2));
    ctx.strokeStyle = `rgba(226,255,249,${flicker * 0.26})`;
    ctx.lineWidth = 0.8;
    const drift = Math.sin(t * 0.4 + index) * 4;
    ctx.beginPath();
    ctx.moveTo(x + drift, y);
    ctx.lineTo(x + drift + 3 + hash(index + 8) * 8, y - 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

function waterfall(ctx, source, fall, clip, t) {
  ctx.save();
  ctx.clip(clip);
  const [textureX, textureY, textureWidth, textureHeight] = fall.texture;
  if (source?.complete && source.naturalWidth) {
    // A continuously tiled ribbon of the approved waterfall's texture.
    // Drawing whole ribbons avoids horizontal scan-line seams in the flow.
    ctx.globalAlpha = 0.32;
    const ribbonHeight = textureHeight * 3.5;
    const offset = (t * fall.speed) % ribbonHeight;
    for (let tile = -1; tile < Math.ceil(fall.height / ribbonHeight) + 1; tile++) {
      ctx.drawImage(source, textureX, textureY, textureWidth, textureHeight,
        fall.x, fall.y + tile * ribbonHeight + offset, fall.width, ribbonHeight + 1);
    }
  }
  ctx.globalAlpha = 1;
  const tint = ctx.createLinearGradient(fall.x, 0, fall.x + fall.width, 0);
  tint.addColorStop(0, 'rgba(43,147,178,.10)');
  tint.addColorStop(0.3, 'rgba(219,255,255,.08)');
  tint.addColorStop(0.55, 'rgba(248,255,251,.15)');
  tint.addColorStop(1, 'rgba(14,99,135,.08)');
  ctx.fillStyle = tint;
  ctx.fillRect(fall.x, fall.y, fall.width, fall.height);
  ctx.lineCap = 'round';
  for (let index = 0; index < 19; index++) {
    const progress = fract(t * (0.52 + hash(index + fall.seed) * 0.3) + hash(index + 91));
    const y = fall.y + progress * (fall.height + 28) - 20;
    const x = fall.x + 5 + hash(index + fall.seed * 13) * (fall.width - 10) - progress * 10;
    const length = 10 + hash(index + 29) * 27;
    const alpha = Math.sin(progress * Math.PI) * (0.18 + hash(index) * 0.25);
    ctx.strokeStyle = `rgba(237,255,253,${alpha})`;
    ctx.lineWidth = 0.7 + hash(index + 5) * 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 0.5, y + length * 0.35, x - 2, y + length * 0.6, x - 3.2, y + length);
    ctx.stroke();
  }
  ctx.restore();
  const [poolX, poolY, poolWidth, poolHeight] = fall.pool;
  ctx.save();
  // Restrict drifting mist to the white-water basin at the foot of each fall.
  ctx.beginPath();
  ctx.ellipse(poolX, poolY, poolWidth, poolHeight * 1.5, -0.05, 0, TAU);
  ctx.clip();
  for (let index = 0; index < 9; index++) {
    const life = fract(t * 0.45 + hash(index + fall.seed));
    const x = poolX - poolWidth * 0.7 + hash(index + 70) * poolWidth * 1.4 + life * 5;
    const y = poolY + Math.sin(index * 3.2) * 3 - life * 3;
    ctx.fillStyle = `rgba(239,255,255,${Math.sin(life * Math.PI) * 0.26})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 2.5 + life * 9, 1 + life * 2.4, 0, 0, TAU);
    ctx.fill();
  }
  for (let index = 0; index < 4; index++) {
    const phase = fract(t * 0.34 + index * 0.25);
    ctx.strokeStyle = `rgba(225,255,255,${(1 - phase) * 0.29})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(poolX + 3, poolY + 1, 7 + phase * poolWidth, 2 + phase * poolHeight * 0.6, 0, 0.15, Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draw water on a cleared scene overlay. t is elapsed animation seconds. */
export function drawWater(ctx, source, t = 0) {
  if (!ctx || !Number.isFinite(t)) return;
  ensurePaths();
  seaSurface(ctx, source, t);
  FALLS.forEach((fall, index) => waterfall(ctx, source, fall, fallClips[index], t));
}

// Useful for scene inspection and regression checks without reaching into
// the renderer's private Path2D instances.
export const WATER_AREAS = Object.freeze({
  waterfalls: FALLS.map(({ x, y, width, height }) => Object.freeze({ x, y, width, height })),
  seaRegions: SEA_REGIONS.length,
});
