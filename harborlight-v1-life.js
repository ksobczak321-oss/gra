// Living-world sprites. Coordinates belong to the approved 1672 × 941 scene.
// The caller supplies simulation time; this module owns no timers or RAF loop.
const TAU = Math.PI * 2;
const mix = (a, b, fraction) => a + (b - a) * fraction;

const WALKWAYS = [
  [[566, 423], [608, 431], [640, 447], [681, 460], [721, 465]],
  [[599, 473], [643, 465], [678, 464], [709, 476], [741, 482]],
  [[517, 503], [557, 514], [597, 530], [641, 540]],
  [[443, 598], [477, 616], [528, 636], [577, 650]],
  [[477, 649], [527, 657], [568, 673], [607, 687]],
  [[232, 414], [274, 410], [315, 398], [358, 385]],
  [[353, 444], [382, 450], [401, 466], [414, 479]],
  [[1049, 472], [1090, 480], [1128, 473], [1173, 461], [1212, 449]],
  [[1100, 589], [1121, 612], [1139, 634], [1162, 660]],
  [[1208, 299], [1247, 290], [1281, 272], [1305, 254]],
];
const PATH_LENGTHS = WALKWAYS.map(points => {
  const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
  return { lengths, total: lengths.reduce((sum, value) => sum + value, 0) };
});
const PEOPLE = [
  { path: 0, phase: .02, speed: 8.4, pause: 0, color: 0, scale: 1.35, basket: true },
  { path: 0, phase: .48, speed: 7.4, pause: 0, color: 2, scale: 1.25 },
  { path: 1, phase: .16, speed: 8.8, pause: 0, color: 3, scale: 1.32 },
  { path: 1, phase: .71, speed: 7.6, pause: 0, color: 1, scale: 1.25, basket: true },
  { path: 2, phase: .32, speed: 8.1, pause: 0, color: 4, scale: 1.3 },
  { path: 2, phase: .85, speed: 7.5, pause: 0, color: 0, scale: 1.28 },
  { path: 3, phase: .22, speed: 8.6, pause: 0, color: 1, scale: 1.35, basket: true },
  { path: 4, phase: .55, speed: 8.2, pause: 0, color: 0, scale: 1.38 },
  { path: 5, phase: .09, speed: 7.3, pause: 0, color: 2, scale: 1.25, basket: true },
  { path: 6, phase: .62, speed: 7.7, pause: 0, color: 3, scale: 1.3 },
  { path: 7, phase: .04, speed: 9.1, pause: 0, color: 2, scale: 1.3, cap: true },
  { path: 7, phase: .51, speed: 7.8, pause: 0, color: 4, scale: 1.25, cap: true },
  { path: 8, phase: .19, speed: 7.0, pause: 0, color: 1, scale: 1.23 },
  { path: 9, phase: .38, speed: 6.8, pause: 0, color: 0, scale: 1.18 },
  { path: 0, phase: .79, speed: 8.0, pause: 0, color: 1, scale: 1.26 },
  { path: 1, phase: .42, speed: 8.2, pause: 0, color: 4, scale: 1.25 },
  { path: 2, phase: .59, speed: 7.7, pause: 0, color: 2, scale: 1.22, basket: true },
  { path: 3, phase: .69, speed: 8.4, pause: 0, color: 3, scale: 1.3 },
  { path: 4, phase: .11, speed: 8.0, pause: 0, color: 1, scale: 1.28 },
  { path: 5, phase: .57, speed: 7.4, pause: 0, color: 0, scale: 1.22 },
  { path: 6, phase: .17, speed: 7.8, pause: 0, color: 4, scale: 1.25 },
  { path: 7, phase: .81, speed: 8.5, pause: 0, color: 1, scale: 1.25, cap: true },
  { path: 8, phase: .65, speed: 7.2, pause: 0, color: 2, scale: 1.2 },
  { path: 9, phase: .87, speed: 7.0, pause: 0, color: 3, scale: 1.18 },
];
const CLOTHES = [
  ['#284f68', '#759fa8', '#d7d0ab'],
  ['#9f5138', '#db9471', '#e0c597'],
  ['#b78a40', '#e2ba69', '#624e39'],
  ['#4e6546', '#93a37b', '#d7bf8c'],
  ['#c9b790', '#f1e2b8', '#796148'],
];

function pathPosition(index, progress) {
  const points = WALKWAYS[index];
  const { lengths, total } = PATH_LENGTHS[index];
  let distance = progress * total;
  for (let segment = 0; segment < lengths.length; segment++) {
    if (distance <= lengths[segment] || segment === lengths.length - 1) {
      const fraction = Math.min(1, distance / lengths[segment]);
      return {
        x: mix(points[segment][0], points[segment + 1][0], fraction),
        y: mix(points[segment][1], points[segment + 1][1], fraction),
        dx: points[segment + 1][0] - points[segment][0],
      };
    }
    distance -= lengths[segment];
  }
  return { x: points[0][0], y: points[0][1], dx: 1 };
}

// Travel at a real distance per second. Short rests occur at destinations,
// rather than slowing almost to a stop during most of a cosine loop.
function shuttle(time, travelSeconds, restSeconds, phase) {
  const total = 2 * (travelSeconds + restSeconds);
  const cursor = ((time + phase * total) % total + total) % total;
  if (cursor < travelSeconds) return { progress: cursor / travelSeconds, direction: 1, moving: true };
  if (cursor < travelSeconds + restSeconds) return { progress: 1, direction: 1, moving: false };
  if (cursor < travelSeconds * 2 + restSeconds) return { progress: 1 - (cursor - travelSeconds - restSeconds) / travelSeconds, direction: -1, moving: true };
  return { progress: 0, direction: -1, moving: false };
}

function residentPosition(actor, time) {
  const length = PATH_LENGTHS[actor.path].total;
  const movement = shuttle(time, length / actor.speed, actor.pause, actor.phase);
  const position = pathPosition(actor.path, movement.progress);
  return { ...position, ...movement, direction: (Math.sign(position.dx) || 1) * movement.direction,
    distance: movement.progress * length };
}

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}

function person(ctx, actor, t) {
  const position = residentPosition(actor, t);
  const direction = position.direction;
  const stride = position.moving ? Math.sin(position.distance * 1.1 + actor.phase * TAU) * 1.5 : 0;
  const [cloth, litCloth, trousers] = CLOTHES[actor.color];
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.scale(direction * actor.scale, actor.scale);
  ellipse(ctx, .6, .7, 3.7, 1.25, '#35433645');
  // The broad trouser/boot silhouettes keep the tiny walkers readable at scale.
  ctx.fillStyle = '#514838';
  ctx.beginPath();
  ctx.moveTo(-1.6, -4.8); ctx.lineTo(.1, -4.8); ctx.lineTo(-.9 - stride, -.9); ctx.lineTo(-2.1 - stride, -.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = trousers;
  ctx.beginPath();
  ctx.moveTo(.2, -4.8); ctx.lineTo(1.6, -4.6); ctx.lineTo(1.1 + stride, -.5); ctx.lineTo(-.2 + stride, -.3); ctx.closePath(); ctx.fill();
  ellipse(ctx, -1.6 - stride, -.1, 1.2, .6, '#3f382d');
  ellipse(ctx, .8 + stride, .1, 1.25, .6, '#42392d');
  const bob = Math.abs(stride) * .32;
  ctx.translate(0, -bob);
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(-1.8, -8.9); ctx.quadraticCurveTo(-3.2, -7.3, -2.8, -4.2); ctx.lineTo(2.3, -4.1); ctx.quadraticCurveTo(2.4, -7.3, 1.4, -8.8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#39413b70'; ctx.lineWidth = .42; ctx.stroke();
  ctx.fillStyle = litCloth;
  ctx.beginPath();
  ctx.moveTo(-1.7, -8.8); ctx.lineTo(.2, -8.9); ctx.lineTo(.7, -4.6); ctx.lineTo(-1.9, -4.7); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f4e3ba75'; ctx.lineWidth = .38;
  ctx.beginPath(); ctx.moveTo(-1.5, -8); ctx.lineTo(-1.3, -5); ctx.stroke();
  ctx.strokeStyle = '#2b393c50';
  ctx.beginPath(); ctx.moveTo(.7, -7.7); ctx.lineTo(1.1, -4.7); ctx.stroke();
  // Sleeves and hands move opposite to the legs.
  ctx.lineCap = 'round';
  ctx.strokeStyle = cloth; ctx.lineWidth = 1.9;
  ctx.beginPath(); ctx.moveTo(1.8, -8.0); ctx.lineTo(2.6 - stride * .9, -5.4); ctx.stroke();
  ctx.strokeStyle = '#d8ad7f'; ctx.lineWidth = 1.15;
  ctx.beginPath(); ctx.moveTo(2.6 - stride * .7, -5.5); ctx.lineTo(2.8 - stride, -4.6); ctx.stroke();
  ellipse(ctx, -.2, -10.1, 1.8, 2.05, '#8c6544');
  ellipse(ctx, .5, -9.9, 1.45, 1.65, '#e2bb89');
  ellipse(ctx, 1.3, -10.1, .28, .3, '#5c4937');
  ctx.fillStyle = '#684c35';
  ctx.beginPath(); ctx.arc(-.1, -10.4, 1.8, Math.PI, TAU); ctx.lineTo(.8, -10.1); ctx.closePath(); ctx.fill();
  if (actor.cap) {
    ellipse(ctx, -.2, -11.6, 2.1, .85, '#d9b46d');
    ellipse(ctx, .7, -11.1, 2.3, .38, '#a7793c');
  }
  if (actor.basket) {
    ctx.fillStyle = '#956d3c';
    ctx.beginPath(); ctx.moveTo(1.6, -4.9); ctx.lineTo(5.1, -4.6); ctx.lineTo(4.7, -2.0); ctx.lineTo(2.0, -2.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#d0a465'; ctx.lineWidth = .55;
    ctx.beginPath(); ctx.moveTo(2.3, -4.5); ctx.lineTo(2.7, -2.5); ctx.moveTo(3.5, -4.4); ctx.lineTo(3.6, -2.3); ctx.stroke();
    ctx.strokeStyle = '#775332';
    ctx.beginPath(); ctx.ellipse(3.4, -4.8, 1.2, 1.1, 0, Math.PI, TAU); ctx.stroke();
  }
  ctx.restore();
}

const ANIMALS = [
  { type: 'cow', cx: 246, cy: 448, rx: 16, ry: 5, walk: 6.4, rest: 3.1, phase: .14, scale: 1.12 },
  { type: 'cow', cx: 303, cy: 469, rx: 17, ry: 5, walk: 7.0, rest: 3.8, phase: .61, scale: 1.04 },
  { type: 'sheep', cx: 218, cy: 470, rx: 12, ry: 4, walk: 5.3, rest: 2.7, phase: .33, scale: 1.05 },
  { type: 'sheep', cx: 266, cy: 470, rx: 13, ry: 3, walk: 5.8, rest: 3.3, phase: .82, scale: 1.0 },
  { type: 'hen', cx: 347, cy: 448, rx: 10, ry: 4, walk: 3.8, rest: 2.1, phase: .12, scale: 1.0 },
  { type: 'hen', cx: 334, cy: 440, rx: 9, ry: 3, walk: 3.5, rest: 2.4, phase: .46, scale: .94 },
  { type: 'hen', cx: 322, cy: 441, rx: 9, ry: 4, walk: 4.0, rest: 2.0, phase: .77, scale: .97 },
];

function animalPosition(actor, t) {
  const movement = shuttle(t, actor.walk, actor.rest, actor.phase);
  return { ...movement, x: actor.cx + (movement.progress * 2 - 1) * actor.rx,
    y: actor.cy + (movement.progress * 2 - 1) * actor.ry };
}

function animal(ctx, actor, t) {
  const { x, y, direction, moving } = animalPosition(actor, t);
  const gait = moving ? Math.sin(t * (actor.type === 'hen' ? 11 : 6.5) + actor.phase * 10) * 1.3 : 0;
  const graze = moving ? .1 + Math.sin(t * 1.7 + actor.phase) * .1 : .65 + Math.sin(t * 1.7 + actor.phase * TAU) * .35;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction * actor.scale, actor.scale);
  ellipse(ctx, 0, 1, actor.type === 'hen' ? 3.3 : 9.2, actor.type === 'hen' ? .9 : 2, '#4a54323e');
  if (actor.type === 'hen') {
    ctx.strokeStyle = '#9a652d'; ctx.lineWidth = .75;
    ctx.beginPath(); ctx.moveTo(-1.5, -1); ctx.lineTo(-2 + gait, 1.5); ctx.moveTo(1, -1); ctx.lineTo(1.6 - gait, 1.5); ctx.stroke();
    ellipse(ctx, -.1, -2.7, 3.0, 2.3, '#d7ba77');
    ellipse(ctx, -.6, -3.5, 2.0, 1.3, '#f4e1ae');
    ctx.fillStyle = '#a47a45';
    ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(-4.8, -6); ctx.lineTo(-4, -1.7); ctx.closePath(); ctx.fill();
    const headY = -5.1 + graze * 2;
    ellipse(ctx, 2.2, headY, 1.6, 1.7, '#f2dfae');
    ellipse(ctx, 2.2, headY - 1.6, .8, .55, '#b75b38');
    ctx.fillStyle = '#d49b39';
    ctx.beginPath(); ctx.moveTo(3.5, headY - .2); ctx.lineTo(5, headY + .4); ctx.lineTo(3.4, headY + .7); ctx.closePath(); ctx.fill();
    ellipse(ctx, 2.8, headY - .3, .25, .3, '#513e2b');
  } else {
    const sheep = actor.type === 'sheep';
    const bodyWidth = sheep ? 7.0 : 9.0;
    // Four solid hoof silhouettes rather than thin stick legs.
    for (let leg = 0; leg < 4; leg++) {
      const footX = (leg < 2 ? -5 : 5) + (leg % 2 ? 1 : -1);
      const step = gait * (leg % 2 ? 1 : -1) * .7;
      ctx.fillStyle = leg % 2 ? '#8d6c42' : '#594d36';
      ctx.beginPath(); ctx.moveTo(footX - .7, -4.8); ctx.lineTo(footX + .8, -4.7); ctx.lineTo(footX + step + .5, .4); ctx.lineTo(footX + step - .8, .4); ctx.closePath(); ctx.fill();
    }
    const coat = ctx.createLinearGradient(0, -11, 0, -3);
    coat.addColorStop(0, sheep ? '#fbefca' : '#e1b16e');
    coat.addColorStop(.7, sheep ? '#ded1a9' : '#c28a49');
    coat.addColorStop(1, sheep ? '#b7aa86' : '#9d6f3c');
    ellipse(ctx, -.5, -7.2, bodyWidth, sheep ? 4.0 : 4.7, coat);
    if (sheep) {
      for (let tuft = 0; tuft < 5; tuft++) ellipse(ctx, -5.5 + tuft * 2.3, -9.5 + (tuft % 2) * .4, 1.6, 1.6, '#eee2bb');
    } else {
      ellipse(ctx, -3.8, -7.9, 3.7, 2.8, '#f2deb0');
      ellipse(ctx, 3.9, -7.7, 2.4, 2.6, '#f0dfb8');
      ctx.strokeStyle = '#81592e'; ctx.lineWidth = .9;
      ctx.beginPath(); ctx.moveTo(-8.8, -7); ctx.quadraticCurveTo(-12.4, -7 + Math.sin(t * 2 + actor.phase) * 2, -10.4, -2.5); ctx.stroke();
    }
    // The neck lowers during grazing, giving a clear calm idle motion.
    const headY = -7 + graze * 3.2;
    ellipse(ctx, bodyWidth - 1, headY, sheep ? 2.8 : 3.4, sheep ? 2.4 : 3.0, sheep ? '#9b8c6b' : '#c99960');
    ellipse(ctx, bodyWidth + 1.4, headY + 1.4, sheep ? 1.9 : 2.5, sheep ? 1.2 : 1.5, sheep ? '#c2b38e' : '#f1d3aa');
    ellipse(ctx, bodyWidth + .5, headY - .7, .35, .4, '#4b432d');
    ctx.fillStyle = sheep ? '#a59775' : '#a9753e';
    const ear = Math.sin(t * 2.8 + actor.phase * TAU) * .8;
    ctx.beginPath(); ctx.moveTo(bodyWidth - 2, headY - 1.9); ctx.lineTo(bodyWidth - 3.2, headY - 4 + ear); ctx.lineTo(bodyWidth, headY - 2.8); ctx.closePath(); ctx.fill();
    if (!sheep) {
      ctx.strokeStyle = '#ebdaba'; ctx.lineWidth = .9;
      ctx.beginPath(); ctx.moveTo(bodyWidth - 1.7, headY - 2.2); ctx.quadraticCurveTo(bodyWidth - .3, headY - 5, bodyWidth + 1, headY - 3.8); ctx.stroke();
    }
  }
  ctx.restore();
}

const GULLS = [
  { cx: 133, cy: 696, rx: 93, ry: 42, period: 41, phase: .0, scale: .94 },
  { cx: 126, cy: 735, rx: 84, ry: 34, period: 47, phase: .27, scale: .8 },
  { cx: 770, cy: 718, rx: 86, ry: 31, period: 43, phase: .45, scale: .84 },
  { cx: 1526, cy: 607, rx: 98, ry: 49, period: 56, phase: .74, scale: 1.0 },
  { cx: 1522, cy: 535, rx: 82, ry: 25, period: 44, phase: .31, scale: .7 },
  { cx: 1158, cy: 162, rx: 72, ry: 23, period: 61, phase: .17, scale: .52 },
  { cx: 1206, cy: 180, rx: 80, ry: 28, period: 57, phase: .67, scale: .56 },
];

function gull(ctx, bird, t) {
  const cycle = (t / bird.period + bird.phase) * TAU;
  const x = bird.cx + Math.cos(cycle) * bird.rx;
  const y = bird.cy + Math.sin(cycle) * bird.ry + Math.sin(t * .49 + bird.phase * 12) * 3;
  const direction = Math.sin(cycle) < 0 ? 1 : -1;
  const gliding = Math.sin(t * .43 + bird.phase * 12) > .12;
  const flap = gliding ? Math.sin(t * 1.2 + bird.phase) * .5 : Math.sin(t * 6.5 + bird.phase * 10) * 3.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction * bird.scale, bird.scale);
  ctx.rotate(Math.cos(cycle) * .12);
  ctx.lineJoin = 'round';
  ctx.lineWidth = .5;
  ctx.strokeStyle = '#476779a0';
  const wings = ctx.createLinearGradient(0, -5, 0, 3);
  wings.addColorStop(0, '#fffdf1'); wings.addColorStop(1, '#c6d9df');
  ctx.fillStyle = wings;
  ctx.beginPath();
  ctx.moveTo(-.5, .3);
  ctx.quadraticCurveTo(-5, -3.7 - flap, -13, -1.6 - flap * .8);
  ctx.quadraticCurveTo(-9, .2 - flap, -4, 1.1);
  ctx.lineTo(-.4, 1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(.2, .1);
  ctx.quadraticCurveTo(5, -3.1 + flap * .75, 12, -1.6 + flap * .6);
  ctx.quadraticCurveTo(8, 1 + flap * .5, 4, 1.6);
  ctx.lineTo(.4, 1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Dark feather tips and a sunlit body preserve the distant sea-bird silhouette.
  ctx.strokeStyle = '#577080'; ctx.lineWidth = .8;
  ctx.beginPath(); ctx.moveTo(-13, -1.6 - flap * .8); ctx.lineTo(-10.1, -.6 - flap * .9); ctx.moveTo(12, -1.6 + flap * .6); ctx.lineTo(9.4, -.4 + flap * .7); ctx.stroke();
  ellipse(ctx, -.1, 1, 1.4, 2.2, '#f6f2dc');
  ellipse(ctx, .7, -.1, 1.0, 1.0, '#fffdf0');
  ctx.fillStyle = '#d8af59';
  ctx.beginPath(); ctx.moveTo(1.4, -.4); ctx.lineTo(3.0, .2); ctx.lineTo(1.2, .5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Draw the living foreground into the parent's cleared logical-size canvas. */
export function drawLife(ctx, time, options = {}) {
  if (!ctx || !Number.isFinite(time)) return;
  const t = options.motion === false ? 0 : Math.max(0, time);
  ctx.save();
  if (options.residents !== false) {
    // Back-to-front rendering keeps nearer walkers in front of people behind.
    const sorted = PEOPLE.map(actor => ({ actor, y: residentPosition(actor, t).y })).sort((a, b) => a.y - b.y);
    for (const { actor } of sorted) person(ctx, actor, t);
  }
  if (options.animals !== false) for (const actor of ANIMALS) animal(ctx, actor, t);
  if (options.gulls !== false) for (const bird of GULLS) gull(ctx, bird, t);
  ctx.restore();
}

export const LIFE_COUNTS = Object.freeze({ residents: PEOPLE.length, animals: ANIMALS.length, gulls: GULLS.length });

// Read-only scene layout and actual positions are shared with regression checks.
// Tests can require translation over time instead of accepting changing limbs.
export const LIFE_LAYOUT = Object.freeze({
  walkways: Object.freeze(WALKWAYS.map(points => Object.freeze(points.map(point => Object.freeze([...point]))))),
  residents: Object.freeze(PEOPLE.map((actor, id) => Object.freeze({ id, path: actor.path, speed: actor.speed, scale: actor.scale }))),
  animals: Object.freeze(ANIMALS.map((actor, id) => Object.freeze({ id, type: actor.type, x: actor.cx, y: actor.cy,
    bounds: Object.freeze([actor.cx - actor.rx, actor.cy - actor.ry, actor.rx * 2, actor.ry * 2]) }))),
});
export function sampleLifePositions(time = 0) {
  const t = Number.isFinite(time) ? Math.max(0, time) : 0;
  return {
    residents: PEOPLE.map((actor, id) => ({ id, ...residentPosition(actor, t) })),
    animals: ANIMALS.map((actor, id) => ({ id, type: actor.type, ...animalPosition(actor, t) })),
  };
}
