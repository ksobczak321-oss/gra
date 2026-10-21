// Ambient water is rendered in the scene's 1672 × 941 logical coordinates.
// No timer, state mutation or UI hit areas: the scene owns the animation clock.
const TAU = Math.PI * 2;
// Broad envelopes locate water; the source-color mask below keeps their land,
// boats, wooden piers and the fixed interface completely outside the effect.
const SEA_REGIONS = [
  [[114,174],[226,184],[354,144],[452,136],[509,135],[543,144],[500,166],[433,181],[369,202],[309,232],[263,270],[210,309],[162,343],[114,359]],
  [[911,166],[1040,160],[1180,151],[1289,163],[1319,210],[1399,240],[1399,470],[1370,441],[1340,370],[1352,310],[1325,245],[1269,230],[1201,220],[1150,214],[1105,219],[1058,231],[1022,227],[993,211],[962,195],[925,184]],
  [[114,300],[173,326],[207,381],[191,444],[166,483],[186,534],[214,591],[246,621],[277,650],[236,680],[206,684],[163,653],[114,614]],
  [[0,607],[218,638],[271,650],[350,643],[421,628],[539,619],[711,632],[814,648],[900,676],[963,713],[1018,736],[1025,777],[300,777],[300,941],[0,941]],
  [[700,675],[782,661],[864,650],[910,667],[976,699],[1063,730],[1159,757],[1255,776],[1323,776],[1323,804],[1274,809],[1190,805],[1117,790],[1053,782],[942,778],[700,778]],
  [[1399,470],[1672,470],[1672,941],[1323,941],[1323,825],[1370,790],[1405,748],[1433,700],[1435,630],[1454,580],[1496,510]],
];

/** Named shore paths also define concrete coverage regions for scene QA.
 * normal points towards water. The pixel mask is still authoritative: a line
 * never paints a rock, beach, pier, cottage or card just because it crosses it.
 */
export const COASTAL_ZONES = Object.freeze([
  { id:'northwest-bay', name:'Zatoka północno-zachodnia', points:[[159,284],[204,262],[246,237],[291,218],[337,198],[384,181],[432,169],[481,158],[519,151]], normal:[-.3,-1], roi:[114,160,420,140] },
  { id:'north-bay', name:'Północna zatoka za lasem', points:[[1003,212],[1026,228],[1066,225],[1107,216],[1151,214],[1194,222],[1231,235]], normal:[0,-1], roi:[985,174,255,72] },
  { id:'east-lighthouse', name:'Brzeg przy latarni', points:[[1231,235],[1277,240],[1327,250],[1363,276],[1379,315],[1385,356],[1383,396],[1392,433]], normal:[1,-.1], roi:[1235,213,164,239] },
  { id:'west-cliff', name:'Cały zachodni klif', points:[[154,329],[135,369],[123,418],[128,468],[142,517],[168,558],[194,594],[221,621],[245,642]], normal:[-1,.1], roi:[114,312,148,330] },
  { id:'harbor-west', name:'Brzeg pod zachodnim portem', points:[[226,678],[271,681],[314,677],[354,667],[397,659],[441,650]], normal:[-.1,1], roi:[190,640,274,104] },
  { id:'harbor-piers', name:'Woda pomiędzy pomostami', points:[[462,681],[501,692],[541,704],[577,716],[614,716],[651,701],[688,686],[732,687],[779,684],[813,676]], normal:[0,1], roi:[440,638,389,135] },
  { id:'south-estuary', name:'Ujście pod wodospadem', points:[[774,677],[806,671],[842,666],[878,679],[914,698],[949,717],[986,733],[1027,742]], normal:[0,1], roi:[747,647,301,129] },
  { id:'south-cliffs', name:'Południowe skały', points:[[1019,743],[1066,754],[1118,767],[1170,778],[1224,783],[1276,789]], normal:[0,1], roi:[1000,728,304,48] },
  { id:'southeast-beach', name:'Cała plaża południowo-wschodnia', points:[[1281,790],[1325,779],[1365,759],[1394,741],[1414,714]], normal:[.65,1], roi:[1260,700,225,146] },
  { id:'east-cliffs', name:'Wschodni brzeg i skały', points:[[1419,700],[1449,672],[1459,641],[1451,610],[1454,574],[1475,541],[1504,520]], normal:[1,.1], roi:[1390,478,199,243] },
  { id:'northeast-rocks', name:'Skały przy wschodnim wybrzeżu', points:[[1498,518],[1516,546],[1544,567],[1580,563],[1605,544]], normal:[0,1], roi:[1480,488,170,112] },
  { id:'southwest-islets', name:'Wysepki przy lewym brzegu ekranu', points:[[13,808],[42,798],[67,814],[74,838],[57,859],[31,873],[7,868]], normal:[-1,1], roi:[0,779,117,125] },
  { id:'southeast-islets', name:'Wysepki przy prawym brzegu ekranu', points:[[1479,820],[1512,829],[1542,845],[1580,859],[1614,880],[1653,900]], normal:[-.3,-1], roi:[1420,793,252,148] },
].map(zone => Object.freeze(zone)));
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
  [48,680,87,6,5.8,.2],[95,758,118,7,6.8,1.1],[46,900,105,6,7.2,2.8],[224,873,74,5,5.1,.7],
  [1600,536,117,6,6.4,2.2],[1600,629,99,7,7.1,.9],[1619,744,93,7,5.9,2.9],[1546,853,142,8,6.6,1.7],
  [1432,909,109,6,6.1,.4],[778,757,100,4,6.9,1.9],[1370,339,40,3,4.1,.3],
  [1174,187,87,3,5.2,.8],[1060,190,74,3,4.8,1.3],[319,185,112,4,5.6,2.2],
  [153,542,64,5,4.6,2.6],[875,727,112,5,5.1,.7],[1347,812,102,5,4.3,1.8],
];
let fallClips;
const cached = new WeakMap();
const fract = number => number - Math.floor(number);
const hash = number => fract(Math.sin(number * 127.1 + 311.7) * 43758.5453);

function polygonPath(points) {
  const path = new Path2D();
  points.forEach(([x,y],index) => index ? path.lineTo(x,y) : path.moveTo(x,y));
  path.closePath();
  return path;
}
function makeCanvas() {
  const canvas=document.createElement('canvas');
  canvas.width=1672;canvas.height=941;
  return canvas;
}
function ensurePaths() {
  if (!fallClips) fallClips=FALLS.map(fall=>polygonPath(fall.polygon));
}

function waterAssets(source) {
  if (!source?.complete || !source.naturalWidth) return null;
  if (cached.has(source)) return cached.get(source);
  const mask=makeCanvas(),textureMask=makeCanvas(),layer=makeCanvas();
  const m=mask.getContext('2d',{willReadFrequently:true});
  for (const points of SEA_REGIONS) m.fill(polygonPath(points));
  // A second independent guard removes every fixed UI region.
  m.clearRect(0,0,1672,76);m.clearRect(0,0,114,607);
  m.clearRect(1399,0,273,470);m.clearRect(300,777,1023,164);
  // Boats and blue market awnings are objects, even when their color is blue.
  for (const points of [
    [[204,640],[295,616],[389,627],[435,733],[397,770],[287,778],[205,747]],
    [[539,714],[582,710],[628,728],[637,748],[611,768],[550,754]],
    [[691,649],[748,646],[792,665],[773,688],[709,689]],
    [[1230,730],[1260,729],[1286,751],[1271,763],[1238,750]],
    [[520,598],[696,598],[696,649],[520,649]],
  ]) {m.save();m.globalCompositeOperation='destination-out';m.fill(polygonPath(points));m.restore();}
  const envelope=m.getImageData(0,0,1672,941);
  const sourceCanvas=makeCanvas();
  const s=sourceCanvas.getContext('2d',{willReadFrequently:true});s.drawImage(source,0,0,1672,941);
  const pixels=s.getImageData(0,0,1672,941).data;
  const blue=new Uint8Array(1672*941);
  for(let i=0;i<blue.length;i++) {
    if(!envelope.data[i*4+3])continue;
    const r=pixels[i*4],g=pixels[i*4+1],b=pixels[i*4+2];
    if(b-r>16 && g-r>10 && b>g*.86)blue[i]=1;
  }
  const output=m.createImageData(1672,941),inner=m.createImageData(1672,941);
  for(let y=1;y<940;y++)for(let x=1;x<1671;x++){
    const i=y*1672+x,offset=i*4;
    let wet=blue[i];
    const r=pixels[offset],g=pixels[offset+1],b=pixels[offset+2];
    // Include only white foam already directly adjacent to water, never sand.
    if(!wet && envelope.data[offset+3] && r>190 && g>205 && b>210 && b>=r*.98)
      wet=blue[i-1]||blue[i+1]||blue[i-1672]||blue[i+1672];
    if(!wet)continue;
    output.data[offset]=output.data[offset+1]=output.data[offset+2]=255;
    output.data[offset+3]=255;
    const inland=blue[i-2]&&blue[i+2]&&blue[i-3344]&&blue[i+3344];
    if(inland){inner.data[offset]=inner.data[offset+1]=inner.data[offset+2]=255;inner.data[offset+3]=255;}
  }
  m.putImageData(output,0,0);textureMask.getContext('2d').putImageData(inner,0,0);
  const value={mask,textureMask,layer,ctx:layer.getContext('2d')};
  cached.set(source,value);return value;
}

function shoreStroke(ctx,zone,distance,t,seed) {
  const points=zone.points;
  ctx.beginPath();
  for(let index=0;index<points.length;index++){
    const before=points[Math.max(0,index-1)],after=points[Math.min(points.length-1,index+1)];
    const dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy)||1;
    let nx=-dy/length,ny=dx/length;
    if(nx*zone.normal[0]+ny*zone.normal[1]<0){nx=-nx;ny=-ny;}
    const flutter=Math.sin(index*1.53+t*1.1+seed)*1.1;
    const x=points[index][0]+nx*(distance+flutter),y=points[index][1]+ny*(distance+flutter);
    if(index===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
}
function coastalWash(ctx,t) {
  ctx.lineCap='round';ctx.lineJoin='round';
  COASTAL_ZONES.forEach((zone,index)=>{
    const period=3.7+hash(index+2)*1.9;
    for(let wave=0;wave<3;wave++){
      const progress=fract(t/period+hash(index*3+wave)+wave*.32);
      const distance=2+(1-progress)*19;
      const envelope=Math.pow(Math.sin(progress*Math.PI),.8);
      // A soft turquoise wash precedes the narrow breaking foam edge.
      ctx.setLineDash([]);ctx.lineWidth=6+progress*3;
      ctx.strokeStyle=`rgba(125,230,231,${envelope*.12})`;
      shoreStroke(ctx,zone,distance+2,t,index+wave);ctx.stroke();
      ctx.lineWidth=1.3+progress*1.6;
      ctx.strokeStyle=`rgba(241,255,249,${envelope*(.36+progress*.22)})`;
      shoreStroke(ctx,zone,distance,t,index+wave);ctx.stroke();
      ctx.setLineDash([3.2+hash(index)*6,2.5+hash(wave+index)*5]);ctx.lineDashOffset=-t*5;
      ctx.lineWidth=.8;ctx.strokeStyle=`rgba(251,255,246,${envelope*.31})`;
      shoreStroke(ctx,zone,distance-3,t,index+wave);ctx.stroke();
    }
  });
  ctx.setLineDash([]);
}

function seaSurface(ctx,source,t) {
  const assets=waterAssets(source);if(!assets)return;
  const surface=assets.ctx;
  surface.clearRect(0,0,1672,941);
  // A tiny continuous drift makes the painted water itself shimmer everywhere
  // in the water mask. The eroded mask prevents sampled land entering the sea.
  surface.globalAlpha=.25;
  surface.drawImage(source,Math.sin(t*.72)*1.35,Math.cos(t*.57)*1.15,1672,941);
  surface.globalAlpha=1;surface.globalCompositeOperation='destination-in';
  surface.drawImage(assets.textureMask,0,0);surface.globalCompositeOperation='source-over';
  coastalWash(surface,t);
  surface.lineCap='round';
  WAVE_BANKS.forEach(([x,y,width,amplitude,period,phase])=>{
    for(let wave=0;wave<2;wave++){
      const progress=fract(t/period+phase+wave*.51),alpha=Math.sin(progress*Math.PI)*.35;
      const left=x-width/2+Math.sin(t*.17+phase)*11,top=y+(progress-.5)*35+wave*20;
      surface.strokeStyle=`rgba(229,255,251,${alpha})`;surface.lineWidth=1.1+Math.sin(progress*Math.PI);
      surface.beginPath();surface.moveTo(left,top+3);
      surface.bezierCurveTo(left+width*.22,top-amplitude,left+width*.51,top+amplitude*.6,left+width*.66,top);
      surface.bezierCurveTo(left+width*.8,top-amplitude*.5,left+width*.92,top+amplitude*.2,left+width,top+2);surface.stroke();
    }
  });
  surface.globalCompositeOperation='destination-in';surface.drawImage(assets.mask,0,0);
  surface.globalCompositeOperation='source-over';
  ctx.drawImage(assets.layer,0,0);
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
  coastalZones: COASTAL_ZONES.length,
});
