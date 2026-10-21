// Inventory retained for regression checks. Rendering now uses the entire
// people-free WORLD plate so figures outside this inventory cannot stay frozen.
// The parent clips it away from the unchanged approved screen-space interface.
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

export function createInhabitantsBackground(source) {
  const surface = document.createElement('canvas');
  surface.width = 1672;
  surface.height = 941;
  const ctx = surface.getContext('2d');
  ctx.drawImage(source, 0, 0, 1672, 941);
  // A small stone fountain replaces the pedestal removed during cleanup.
  // It contains no human-shaped statue that could look like another frozen NPC.
  ctx.fillStyle = '#766e5860';
  ctx.beginPath(); ctx.ellipse(614, 441, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b6b5a1';
  ctx.beginPath(); ctx.ellipse(614, 437, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#66a5ac';
  ctx.beginPath(); ctx.ellipse(614, 436, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e3dbc2'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(614, 436, 14, 4, 0, 0, Math.PI * 2); ctx.stroke();
  return surface;
}
