import { drawWater } from './harborlight-v1-water.js?v=living-world-3';
import { drawLife } from './harborlight-v1-life.js?v=living-world-3';
import { drawSmoke } from './harborlight-v1-smoke.js?v=living-world-3';
import { createInhabitantsBackground } from './harborlight-v1-inhabitants.js?v=living-world-3';

const WIDTH = 1672;
const HEIGHT = 941;
const EFFECTS = 'windmill smoke gulls waterfalls waves people clouds construction animals';

function image(url) {
  return new Promise((resolve, reject) => {
    const value = new Image();
    value.onload = () => resolve(value);
    value.onerror = () => reject(new Error(`Nie udało się wczytać warstwy animacji: ${url}`));
    value.src = new URL(url, import.meta.url).href;
  });
}
function canvas(width, height) {
  const value = document.createElement('canvas');
  value.width = width;
  value.height = height;
  return value;
}
function clipWorld(ctx) {
  ctx.beginPath();
  ctx.rect(114, 76, 1285, 700);
  ctx.rect(0, 607, 300, 334);
  ctx.rect(1323, 470, 349, 471);
  ctx.clip();
}
function cloudSprite(seed) {
  const sprite = canvas(320, 96);
  const ctx = sprite.getContext('2d');
  for (let index = 0; index < 18; index++) {
    const x = 40 + index * 14;
    const y = 49 + Math.sin(index * 1.7 + seed) * 11;
    const radius = 21 + (Math.sin(index * 2.4 + seed) + 1) * 8;
    const fog = ctx.createRadialGradient(x, y, radius * .12, x, y, radius);
    fog.addColorStop(0, 'rgba(255,253,241,.37)');
    fog.addColorStop(.5, 'rgba(244,248,244,.19)');
    fog.addColorStop(1, 'rgba(238,249,253,0)');
    ctx.fillStyle = fog;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  return sprite;
}
function makeWindmillPlate(source) {
  const sprite = canvas(114, 116);
  const ctx = sprite.getContext('2d');
  ctx.drawImage(source, 221, 193, 114, 116, 0, 0, 114, 116);
  ctx.globalCompositeOperation = 'destination-in';
  const mask = ctx.createRadialGradient(57, 58, 45, 57, 58, 58);
  mask.addColorStop(0, '#fff');
  mask.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, 114, 116);
  return sprite;
}
function drawWindmill(ctx, plate, t) {
  ctx.drawImage(plate, 221, 193);
  ctx.save();
  ctx.translate(279, 254);
  ctx.transform(.88, -.06, .16, 1, 0, 0);
  ctx.rotate(-.37 + t * .31);
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(58,40,20,.26)';
  ctx.shadowBlur = 1;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;
  for (let index = 0; index < 4; index++) {
    ctx.save();
    ctx.rotate(index * Math.PI / 2);
    ctx.strokeStyle = '#79502d';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, -49); ctx.stroke();
    const fabric = ctx.createLinearGradient(0, -15, 15, -45);
    fabric.addColorStop(0, '#e3b060'); fabric.addColorStop(.55, '#ffe2a0'); fabric.addColorStop(1, '#d6a257');
    ctx.fillStyle = fabric;
    ctx.beginPath(); ctx.moveTo(1, -17); ctx.lineTo(15, -19); ctx.lineTo(14, -47); ctx.lineTo(1, -46); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ab7137'; ctx.lineWidth = .8; ctx.stroke();
    ctx.beginPath();
    for (let y = -21; y > -47; y -= 6) { ctx.moveTo(1, y); ctx.lineTo(14, y); }
    ctx.moveTo(7.5, -17); ctx.lineTo(7.5, -47); ctx.stroke();
    ctx.restore();
  }
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#6f452c'; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d9b371'; ctx.beginPath(); ctx.arc(-1, -1, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawClouds(ctx, sprites, t) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(114, 76); ctx.lineTo(565, 76); ctx.lineTo(564, 111); ctx.lineTo(482, 145); ctx.lineTo(385, 154); ctx.lineTo(309, 180); ctx.lineTo(114, 183); ctx.closePath();
  ctx.moveTo(1015, 76); ctx.lineTo(1240, 76); ctx.lineTo(1243, 145); ctx.lineTo(1174, 160); ctx.lineTo(1070, 137); ctx.lineTo(1015, 106); ctx.closePath();
  ctx.clip();
  const clouds = [[170, 100, 240, 61, 4.1, 0], [342, 115, 230, 62, 2.6, 1], [1000, 82, 250, 64, 3.2, 2]];
  for (const [x, y, width, height, speed, index] of clouds) {
    const shift = Math.sin(t / 56 + index * 2) * 72 + t * speed % 480;
    ctx.globalAlpha = .7;
    ctx.drawImage(sprites[index], x + shift - 160, y - 20, width, height);
    ctx.drawImage(sprites[index], x + shift - 640, y - 20, width, height);
  }
  ctx.restore();
}
function drawCrane(ctx, t, extraWork) {
  // The wooden mast stays fixed; its trolley, cable and suspended load move.
  const phase = t * .35;
  const trolleyX = 1107 + Math.sin(phase) * 13;
  const topY = 307 - (trolleyX - 1107) * .35;
  const cableLength = 24 + (Math.sin(phase * 1.4) + 1) * 14;
  const sway = Math.sin(phase * 1.8) * 2.3;
  ctx.save();
  ctx.strokeStyle = '#6e5235'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(trolleyX, topY); ctx.lineTo(trolleyX + sway, topY + cableLength); ctx.stroke();
  ctx.fillStyle = '#58442b'; ctx.fillRect(trolleyX - 3, topY - 2, 6, 4);
  ctx.translate(trolleyX + sway, topY + cableLength);
  ctx.rotate(Math.sin(phase) * .04);
  ctx.fillStyle = '#b99e70'; ctx.strokeStyle = '#6c5130'; ctx.lineWidth = .8;
  ctx.fillRect(-5, 0, 10, 7); ctx.strokeRect(-5, 0, 10, 7);
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 7); ctx.moveTo(5, 0); ctx.lineTo(-5, 7); ctx.stroke();
  ctx.restore();
  // Hoisting activity at the scaffolding beside the upper waterfall.
  const loadY = 322 + (Math.sin(t * .48 + .8) + 1) * 19;
  ctx.strokeStyle = '#745c38'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(858, 294); ctx.lineTo(858 + Math.sin(t * .6), loadY); ctx.stroke();
  ctx.fillStyle = '#ba9361'; ctx.fillRect(855, loadY, 7, 5);
  // Small drifting sawdust/stone dust emphasizes ongoing work without hiding it.
  for (let i = 0; i < (extraWork ? 10 : 5); i++) {
    const age = ((t * .3 + i * .19) % 1);
    ctx.globalAlpha = Math.sin(age * Math.PI) * .28;
    ctx.fillStyle = '#e9d5a2';
    ctx.beginPath(); ctx.ellipse(1115 + age * 14 + Math.sin(i) * 7, 393 - age * 13, 2 + age * 3, 1 + age * 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function createAmbientScene(stage, getState) {
  const surface = canvas(WIDTH, HEIGHT);
  surface.id = 'island-ambient';
  surface.setAttribute('aria-hidden', 'true');
  surface.dataset.effectGroups = EFFECTS;
  surface.dataset.revision = 'living-world-3';
  surface.dataset.time = '0';
  surface.dataset.frames = '0';
  surface.dataset.mode = 'loading';
  stage.append(surface);
  const ctx = surface.getContext('2d', { alpha: true });
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const clouds = [cloudSprite(1), cloudSprite(3), cloudSprite(7)];
  let source, plate, inhabitants;
  let time = 0, frames = 0, frame = 0, last = 0, lastPaint = 0;
  let destroyed = false;
  let scale = 1;
  let previousMode = '';

  function size() {
    scale = Math.min(1, Math.max(.4, Math.min(innerWidth / WIDTH, innerHeight / HEIGHT) * Math.min(devicePixelRatio || 1, 2)));
    surface.width = Math.round(WIDTH * scale);
    surface.height = Math.round(HEIGHT * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (source) paint();
  }
  function mode() {
    if (document.hidden) return 'hidden';
    const state = getState();
    if (media.matches || !state.settings.motion) return 'reduced';
    return state.paused ? 'paused' : 'running';
  }
  function paint() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    clipWorld(ctx);
    ctx.drawImage(inhabitants, 0, 0);
    drawWater(ctx, source, time);
    drawClouds(ctx, clouds, time);
    drawWindmill(ctx, plate, time);
    drawSmoke(ctx, time);
    drawCrane(ctx, time, !!document.querySelector('.world-pulse'));
    drawLife(ctx, time, { motion: true, construction: true });
    ctx.restore();
    surface.dataset.time = time.toFixed(3);
    surface.dataset.frames = String(++frames);
  }
  function loop(now) {
    if (destroyed) return;
    const nextMode = mode();
    surface.dataset.mode = nextMode;
    const delta = last ? Math.min((now - last) / 1000, .12) : 0;
    last = now;
    if (nextMode === 'running') {
      time += delta * getState().speed;
      const fps = innerWidth < 900 ? 24 : 30;
      if (now - lastPaint >= 1000 / fps) { paint(); lastPaint = now; }
    } else if (previousMode !== nextMode) paint();
    previousMode = nextMode;
    if (nextMode === 'running') frame = requestAnimationFrame(loop);
  }
  function resume() {
    if (!source || destroyed) return;
    cancelAnimationFrame(frame);
    last = 0;
    frame = requestAnimationFrame(loop);
  }
  function syncMode() {
    if (mode() !== previousMode) resume();
  }
  addEventListener('resize', size, { passive: true });
  document.addEventListener('visibilitychange', resume);
  media.addEventListener('change', resume);
  stage.addEventListener('island-statechange', syncMode);
  const ready = Promise.all([image('./assets/harborlight-v1-approved.png'), image('./assets/harborlight-windmill-clean.png'), image('./assets/harborlight-inhabitants-clean.png')]).then(values => {
    // All texture sampling must use the clean world too: sampling the old
    // reference could paint blue clothing or baked smoke back into the scene.
    source = values[2];
    plate = makeWindmillPlate(values[1]);
    inhabitants = createInhabitantsBackground(values[2]);
    size();
    surface.dataset.ready = 'true';
    resume();
  }).catch(error => { surface.dataset.mode = 'error'; surface.remove(); throw error; });
  return { ready, destroy() {
    destroyed = true;
    cancelAnimationFrame(frame);
    removeEventListener('resize', size);
    document.removeEventListener('visibilitychange', resume);
    media.removeEventListener('change', resume);
    stage.removeEventListener('island-statechange', syncMode);
    surface.remove();
  } };
}
