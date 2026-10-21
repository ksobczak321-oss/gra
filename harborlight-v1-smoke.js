// Real chimney mouths, including the side chimney that owns the large plume.
export const SMOKE_SOURCES = Object.freeze([
  { id: 'northern-house', x: 533, y: 207, rise: 100, wind: 26, scale: .94 },
  { id: 'townhall-tower', x: 792, y: 154, rise: 96, wind: 25, scale: .92 },
  { id: 'townhall-side', x: 820, y: 208, rise: 113, wind: 31, scale: 1.18 },
  { id: 'chapel-house', x: 491, y: 311, rise: 94, wind: 23, scale: .88 },
  { id: 'village-house', x: 701, y: 300, rise: 104, wind: 27, scale: .98 },
  { id: 'market-house', x: 690, y: 352, rise: 94, wind: 24, scale: .88 },
  { id: 'blue-house', x: 477, y: 409, rise: 99, wind: 26, scale: .94 },
  { id: 'harbor-house', x: 445, y: 516, rise: 102, wind: 28, scale: 1 },
  { id: 'lighthouse-cottage', x: 1349, y: 179, rise: 91, wind: 20, scale: .76 },
].map(source => Object.freeze(source)));

const LIFE = 3.8;
const INTERVAL = .68;
let sprite;
const fract = value => value - Math.floor(value);
const noise = value => fract(Math.sin(value * 127.1 + 311.7) * 43758.5453);

function smokeSprite() {
  if (sprite) return sprite;
  sprite = document.createElement('canvas');
  sprite.width = sprite.height = 80;
  const ctx = sprite.getContext('2d');
  // Irregular lobes produce readable billows rather than a uniform fog column.
  for (const [x,y,r] of [[32,40,23],[48,34,22],[35,26,20],[23,31,15],[48,49,17]]) {
    const gradient = ctx.createRadialGradient(x-3,y-4,2,x,y,r);
    gradient.addColorStop(0,'rgba(253,250,234,1)');
    gradient.addColorStop(.48,'rgba(241,242,228,.95)');
    gradient.addColorStop(.75,'rgba(202,217,209,.5)');
    gradient.addColorStop(1,'rgba(158,176,171,0)');
    ctx.fillStyle=gradient;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  return sprite;
}

export function smokeParticle(source, age, phase = 0) {
  const p = Math.min(1, Math.max(0, age));
  return {
    x: source.x + source.wind * p ** 1.2 + Math.sin(p * 7 + phase) * p * 5,
    y: source.y - source.rise * p,
    size: (9 + p * 50) * source.scale,
    alpha: Math.min(1,p/.055) * (1-p) ** .85 * .96,
  };
}

// Birth identifiers let tests follow the SAME visible billow between frames.
export function sampleSmoke(t) {
  const particles=[];
  for(const [index,source] of SMOKE_SOURCES.entries()) {
    const shifted=t+index*.19;
    const latest=Math.floor(shifted/INTERVAL);
    for(let n=0;n<6;n++) {
      const birth=latest-n;
      const seconds=shifted-birth*INTERVAL;
      if(seconds<0||seconds>=LIFE)continue;
      const age=seconds/LIFE,phase=noise(birth+index*113)*Math.PI*2;
      particles.push({emitter:source.id,id:`${source.id}:${birth}`,age,...smokeParticle(source,age,phase),
        angle:(noise(birth*3+index)-.5)*.7 + age*.35});
    }
  }
  return particles;
}

export function drawSmoke(ctx,t) {
  if(!Number.isFinite(t))return;
  const puff=smokeSprite();
  ctx.save();
  for(const [index,source] of SMOKE_SOURCES.entries()) {
    // Short stem follows the chimney mouth; it never replaces the flying puffs.
    ctx.strokeStyle='rgba(187,196,185,.45)';ctx.lineWidth=1.7*source.scale;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(source.x,source.y+1);
    ctx.quadraticCurveTo(source.x+Math.sin(t*3+index),source.y-3,source.x+Math.sin(t*2+index)*1.8,source.y-7);ctx.stroke();
  }
  for(const particle of sampleSmoke(t)) {
    ctx.save();ctx.globalAlpha=particle.alpha;
    ctx.translate(particle.x,particle.y);ctx.rotate(particle.angle);
    ctx.drawImage(puff,-particle.size/2,-particle.size/2,particle.size,particle.size);
    ctx.restore();
  }
  ctx.restore();
}
