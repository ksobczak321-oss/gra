// Chimney mouths were checked against the approved artwork at native scale.
export const SMOKE_SOURCES = Object.freeze([
  { id: 'northern-house', x: 533, y: 207, rise: 72, wind: 22, scale: .95 },
  { id: 'townhall', x: 793, y: 155, rise: 86, wind: 28, scale: 1.12 },
  { id: 'chapel-house', x: 492, y: 314, rise: 67, wind: 20, scale: .92 },
  { id: 'village-house', x: 700, y: 301, rise: 76, wind: 24, scale: 1 },
  { id: 'market-house', x: 689, y: 351, rise: 68, wind: 21, scale: .88 },
  { id: 'blue-house', x: 474, y: 403, rise: 72, wind: 20, scale: .96 },
].map(source => Object.freeze(source)));

let sprite;
function smokeSprite() {
  if (sprite) return sprite;
  sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const ctx = sprite.getContext('2d');
  const gradient = ctx.createRadialGradient(30, 29, 3, 32, 32, 29);
  gradient.addColorStop(0, 'rgba(235,232,216,.94)');
  gradient.addColorStop(.35, 'rgba(221,221,208,.73)');
  gradient.addColorStop(.68, 'rgba(203,213,208,.32)');
  gradient.addColorStop(1, 'rgba(197,211,208,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return sprite;
}

// age is a normalized lifetime. The same lifecycle drives both rendering and
// regression checks: new puffs start at the mouth, rise, expand and disappear.
export function smokeParticle(source, age, phase = 0) {
  const p = Math.min(1, Math.max(0, age));
  return {
    x: source.x + source.wind * p ** 1.25 + Math.sin(p * 5 + phase) * p * 4,
    y: source.y - source.rise * p,
    size: (6 + p * 39) * source.scale,
    alpha: Math.min(1, p / .05) * (1 - p) ** 1.15 * .84,
  };
}

export function drawSmoke(ctx, t) {
  if (!Number.isFinite(t)) return;
  const puff = smokeSprite();
  ctx.save();
  for (const [index, source] of SMOKE_SOURCES.entries()) {
    // A narrow, gently wandering stem connects the puffs to the chimney.
    ctx.strokeStyle = 'rgba(209,211,198,.33)';
    ctx.lineWidth = 2.3 * source.scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(source.x, source.y + 1);
    ctx.quadraticCurveTo(source.x + Math.sin(t * 1.5 + index) * 1.5, source.y - 6, source.x + 2.3, source.y - 11);
    ctx.stroke();
    for (let i = 0; i < 18; i++) {
      const age = ((t / (5.2 + index * .13) + i / 18 + index * .17) % 1 + 1) % 1;
      const particle = smokeParticle(source, age, i * 1.7 + t * .25);
      ctx.globalAlpha = particle.alpha;
      ctx.drawImage(puff, particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
