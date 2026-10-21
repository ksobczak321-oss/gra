// Local clean-background samples remove the frozen figures before animated
// residents/livestock are drawn. The approved reference itself is unchanged.
export const ORIGINAL_PEOPLE = Object.freeze([
  [567,373],[585,389],[602,402],[629,407],[648,422],[688,418],
  [712,425],[712,448],[668,444],[643,452],[622,441],[589,419],
  [602,473],[670,466],[775,466],[786,476],[820,401],[842,392],
  [818,386],[737,373],[178,381],[239,408],[313,396],[334,398],
  [287,448],[364,456],[391,364],[355,358],[420,374],[465,388],
  [425,673],[508,646],[589,699],[438,582],[392,626],[536,568],
  [584,591],[439,553],[504,559],[528,556],[531,581],[1028,358],
  [1044,358],[1056,448],[1066,466],[1127,488],[1135,480],[1170,408],
].map(point => Object.freeze(point)));

export const ORIGINAL_ANIMALS = Object.freeze([
  [232,439,24,24],[250,440,24,24],[308,461,25,24],
  [342,474,25,24],[303,357,24,20],[372,329,24,20],
].map(point => Object.freeze(point)));

function patch(ctx, source, x, y, width, height, inset = 3) {
  const stamp = document.createElement('canvas');
  stamp.width = width;
  stamp.height = height;
  const paint = stamp.getContext('2d');
  paint.drawImage(source, x, y, width, height, 0, 0, width, height);
  paint.globalCompositeOperation = 'destination-in';
  paint.translate(width / 2, height / 2);
  paint.scale(width / 2, height / 2);
  const feather = paint.createRadialGradient(0, 0, Math.max(.3, 1 - inset / Math.min(width, height) * 2), 0, 0, 1);
  feather.addColorStop(0, '#fff');
  feather.addColorStop(1, 'rgba(255,255,255,0)');
  paint.fillStyle = feather;
  paint.fillRect(-1, -1, 2, 2);
  ctx.drawImage(stamp, x, y);
}

export function createInhabitantsBackground(source) {
  const surface = document.createElement('canvas');
  surface.width = 1672;
  surface.height = 941;
  const ctx = surface.getContext('2d');
  // Fully opaque cores cover heads, feet and their short ground shadows.
  // Feathering is outside the figure rather than fading through its body.
  for (const [x,y] of ORIGINAL_PEOPLE) patch(ctx, source, x - 11, y - 25, 24, 31, 2);
  for (const [x,y,width,height] of ORIGINAL_ANIMALS) patch(ctx, source, x - width / 2 - 7, y - height - 2, width + 14, height + 12, 3);
  // These are the conspicuous baked smoke columns, not the chimney masonry.
  patch(ctx, source, 532, 157, 32, 50, 5);
  patch(ctx, source, 792, 83, 45, 72, 6);
  return surface;
}
