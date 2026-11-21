// Presentation only. Levels, construction clocks, saves and model IDs remain
// owned by the game. Importing this module does not fetch or touch the DOM.
export const BUILDING_STAGE_IDS = Object.freeze(['townhall','house','farm','lumber','quarry','windmill','sawmill','warehouse','bakery','dairy','slaughterhouse','fisher','leatherworks','academy','barracks','chapel','lighthouse','theatre','market','dock']);
export const BUILDING_STAGE_MANIFEST = 'assets/building-upgrades-v1/manifest.json';
export const BUILDING_STAGE_MANIFEST_URL = `${BUILDING_STAGE_MANIFEST}?v=frontend-v32-23`;
export const WORLD_SIZE = Object.freeze([1672,941]);
const NS = 'http://www.w3.org/2000/svg';
const EPS = 1e-9;
const finite = n => typeof n === 'number' && Number.isFinite(n);
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {for (const child of Object.values(value)) freeze(child);Object.freeze(value);}return value; };
const requireValue = (condition,message) => {if (!condition) throw new Error(`Grafika budynków: ${message}`);};
let catalog = null;
let loadedImages = new Map();
let loading = null;

export function buildingStageIndex(level) {
  const n = finite(Number(level)) ? Math.floor(Number(level)) : 1;
  return Math.min(9,Math.max(0,Math.floor((Math.max(1,n)-1)/2)));
}
export function buildingStageLevel(state,id,decoration=false) {
  // Theatre has no model upgrades (actual level1). Its appearance, like a
  // noninteractive decorative house, follows the island's TownHall level.
  return Number(state?.buildings?.[decoration || id === 'theatre' ? 'townhall' : id]?.level) || 0;
}
export function activeBuildingConstruction(state,id) {
  return [...(state?.constructionProjects || []),...(state?.premiumServices || [])]
    .find(project => project?.building === id && project.stage === 'building' && finite(project.buildRemaining) && project.buildRemaining > EPS) || null;
}
function rectangle(value,label,bounds) {
  requireValue(Array.isArray(value) && value.length === 4 && value.every(finite) && value[2] > 0 && value[3] > 0,`${label}: nieprawidłowy prostokąt`);
  if (bounds) requireValue(value[0] >= 0 && value[1] >= 0 && value[0]+value[2] <= bounds[0]+EPS && value[1]+value[3] <= bounds[1]+EPS,`${label}: kadr poza obrazem`);
  return [...value];
}
function point(value,label) {
  requireValue(Array.isArray(value) && value.length === 2 && value.every(finite),`${label}: nieprawidłowa kotwica`);
  return [...value];
}
function asset(value,label) {
  requireValue(value && typeof value === 'object',`${label}: brak obrazu`);
  let src = value.src || value.url;
  if (typeof src === 'string' && !src.includes('/')) src = `assets/building-upgrades-v1/${src}`;
  requireValue(typeof src === 'string' && /^assets\/building-upgrades-v1\/[a-z0-9-]+\.(?:webp|png)$/.test(src),`${label}: obraz musi należeć do lokalnego pakietu`);
  requireValue(Number.isInteger(value.width) && value.width > 0 && Number.isInteger(value.height) && value.height > 0,`${label}: brak wymiarów obrazu`);
  return {src,width:value.width,height:value.height};
}
function polygon(value,label) {
  requireValue(Array.isArray(value) && value.length >= 3,`${label}: brak wielokąta`);
  const result = value.map(p => point(p,label));
  requireValue(result.every(([x,y]) => x >= 0 && x <= WORLD_SIZE[0] && y >= 0 && y <= WORLD_SIZE[1]),`${label}: maska poza planszą`);
  return result;
}

export function normalizeBuildingStageManifest(raw) {
  requireValue(raw && raw.version === 1,'nieobsługiwana wersja manifestu');
  if (raw.enabled === false) return freeze({version:1,enabled:false});
  const result = {version:1,enabled:true,grid:{columns:5,rows:2,count:10},buildings:{},decorations:[]};
  if (raw.grid) requireValue(raw.grid.columns === 5 && raw.grid.rows === 2 && raw.grid.count === 10,'atlas musi zawierać5kolumn i2wiersze');
  requireValue(raw.buildings && typeof raw.buildings === 'object','brak katalogu budynków');
  for (const id of BUILDING_STAGE_IDS) {
    const input = raw.buildings[id],image = asset(input,id);
    const rects = input.frameRects || input.FRAME_RECTS || input.frames?.map(frame => frame.rect || frame);
    requireValue(Array.isArray(rects) && rects.length === 10,`${id}: potrzeba dziesięciu klatek`);
    requireValue(Array.isArray(input.bboxes) && input.bboxes.length === 10,`${id}: potrzeba dziesięciu obwiedni alfa`);
    const frameRects = rects.map((rect,i) => rectangle(rect,`${id}/${i}`,[image.width,image.height]));
    const bboxes = input.bboxes.map((box,i) => rectangle(box,`${id}/${i} alfa`,frameRects[i].slice(2)));
    const mapRect = rectangle(input.mapRect,`${id} mapa`,WORLD_SIZE);
    const groundAnchor = point(input.groundAnchor || [mapRect[0]+mapRect[2]/2,mapRect[1]+mapRect[3]],`${id} grunt`);
    const smoke = (input.smoke || []).map((entry,i) => entry ? point(entry,`${id}/${i} komin`) : null);
    requireValue(smoke.length <= 10,`${id}: zbyt wiele kominów`);
    let sprites;
    if (input.sprites) {
      requireValue(Array.isArray(input.sprites) && input.sprites.length === 10,`${id}: potrzeba dziesięciu osobnych grafik`);
      sprites=input.sprites.map((spec,i)=>{
        const sprite=asset(spec,`${id}/${i} grafika`);
        requireValue(sprite.width===frameRects[i][2] && sprite.height===frameRects[i][3],`${id}/${i}: wymiary osobnej grafiki nie zgadzają się z kadrem`);
        return sprite;
      });
    }
    if(input.paintDepth!==undefined)requireValue(finite(input.paintDepth)&&input.paintDepth>=0&&input.paintDepth<=WORLD_SIZE[1],`${id}: nieprawidłowa kolejność warstw`);
    result.buildings[id] = {...image,frameRects,bboxes,mapRect,groundAnchor,smoke,...(sprites?{sprites}:{}),...(input.paintDepth!==undefined?{paintDepth:input.paintDepth}:{})};
  }
  result.crane = asset(raw.crane,'żuraw');
  result.crane.frameRect = rectangle(raw.crane.frameRect || raw.crane.rect || [0,0,result.crane.width,result.crane.height],'kadr żurawia',[result.crane.width,result.crane.height]);
  result.terrain = {...asset(raw.terrain,'teren'),patches:[]};
  requireValue(result.terrain.width === WORLD_SIZE[0] && result.terrain.height === WORLD_SIZE[1],'teren musi mieć1672×941');
  requireValue(Array.isArray(raw.terrain.patches) && raw.terrain.patches.length > 0,'brak masek starej zabudowy');
  result.terrain.patches = raw.terrain.patches.map((patch,i) => ({id:String(patch.id || `patch-${i}`),polygon:polygon(patch.polygon,`teren/${i}`)}));
  const covered = new Set(result.terrain.patches.map(p => p.id));
  requireValue(BUILDING_STAGE_IDS.every(id => covered.has(id)),'maski muszą obejmować wszystkie20funkcji');
  requireValue(['accepted-farm','accepted-lumber','accepted-slaughterhouse','accepted-fisher'].every(id => covered.has(id)),'maski muszą obejmować stare4patche');
  const decorations = raw.decorations || [{id:'former-leatherworks',family:'house',mapRect:[498,475,60,60]}];
  requireValue(Array.isArray(decorations) && decorations.length > 0,'brak dekoracyjnej chatki');
  result.decorations = decorations.map((entry,i) => {
    const family = entry.family || 'house';requireValue(BUILDING_STAGE_IDS.includes(family),`dekoracja/${i}: nieznana rodzina`);
    const mapRect = rectangle(entry.mapRect,`dekoracja/${i}`,WORLD_SIZE);
    return {id:String(entry.id || `decoration-${i}`),family,mapRect,groundAnchor:point(entry.groundAnchor || [mapRect[0]+mapRect[2]/2,mapRect[1]+mapRect[3]],`dekoracja/${i}`)};
  });
  return freeze(result);
}

export function buildingStageFrame(manifest,id,level) {
  const family = manifest?.enabled && manifest.buildings?.[id];
  if (!family) return null;
  const index = buildingStageIndex(level),sprite=family.sprites?.[index],rect = sprite?[0,0,sprite.width,sprite.height]:family.frameRects[index],bbox = family.bboxes[index];
  return {id,index,level:Number(level)||0,src:sprite?.src||family.src,width:sprite?.width||family.width,height:sprite?.height||family.height,rect,bbox,
    viewBox:[rect[0]+bbox[0],rect[1]+bbox[1],bbox[2],bbox[3]]};
}
export function buildingStagePlacement(manifest,id,level,placement) {
  const family = manifest?.buildings?.[id],frame = buildingStageFrame(manifest,id,level);
  if (!frame) return null;
  const bounds = placement?.mapRect || family.mapRect,anchor = placement?.groundAnchor || family.groundAnchor;
  const scale = Math.min(bounds[2]/Math.max(...family.bboxes.map(b => b[2])),bounds[3]/Math.max(...family.bboxes.map(b => b[3])));
  return {...frame,scale,x:anchor[0]-frame.bbox[2]*scale/2,y:anchor[1]-frame.bbox[3]*scale,w:frame.bbox[2]*scale,h:frame.bbox[3]*scale};
}
export function buildingCranePlacement(manifest,id,level,placement) {
  const frame=buildingStagePlacement(manifest,id,level,placement);
  if (!frame) return null;
  const width=Math.max(34,Math.min(100,frame.w*.8)),height=width*manifest.crane.frameRect[3]/manifest.crane.frameRect[2];
  // A tall Lighthouse already reaches the top of the island. A roof-mounted
  // crane would disappear beneath the HUD. Stand it beside the tower's base
  // in world coordinates instead, independent of viewport size and panning.
  return {width,height,left:id==='lighthouse'?frame.x-width*.5:frame.x+frame.w*.55-width/2,
    top:id==='lighthouse'?frame.y+frame.h-height*.95:frame.y-height*.65};
}
export function buildingStageSmokeSources(manifest,state) {
  if (!manifest?.enabled || state?.ruleset !== 32) return null;
  const sources = [];
  for (const id of BUILDING_STAGE_IDS) {
    const frame = buildingStagePlacement(manifest,id,state.buildings?.[id]?.level),mouth = manifest.buildings[id].smoke[frame.index];
    if (!mouth) continue;
    sources.push({id:`building-${id}`,x:frame.x+(mouth[0]-frame.bbox[0])*frame.scale,y:frame.y+(mouth[1]-frame.bbox[1])*frame.scale,rise:80,wind:24,scale:.8});
  }
  return sources;
}
function decodeImage(spec) {
  return new Promise((resolve,reject) => {
    const image = new Image();image.onload = async () => {try {await image.decode?.();resolve(image);} catch(error) {reject(error);}};image.onerror = () => reject(new Error(`Nie udało się wczytać grafiki: ${spec.src}`));image.src = spec.src;
  });
}
export function getBuildingStages() {return catalog;}
export function getBuildingStageImage(src) {return loadedImages.get(src) || null;}
export async function readBuildingStageAssets({fetcher=globalThis.fetch,imageLoader=decodeImage,url=BUILDING_STAGE_MANIFEST_URL,state,preload=true,concurrency=3}={}) {
    // A release-specific key bypasses a previously cached legacy catalog;
    // conditional revalidation keeps later catalog updates fresh as well.
    const response = await fetcher(url,{credentials:'same-origin',cache:'no-cache'});
    requireValue(response?.ok,'nie udało się wczytać manifestu');
    const next = normalizeBuildingStageManifest(await response.json());
    if (!next.enabled) return {manifest:next,images:new Map()};
    const images = new Map();
    if (!preload) return {manifest:next,images};
    // Download only the visible variant, never all ten levels of each family.
    // Legacy fixture/manifests still use their original atlas contract.
    const visible=[...BUILDING_STAGE_IDS.map(id=>({id,level:buildingStageLevel(state,id)})),
      ...next.decorations.map(decoration=>({id:decoration.family,level:buildingStageLevel(state,decoration.family,true)}))];
    const entries = [...new Map(visible.map(({id,level})=>{
      const family=next.buildings[id],frame=buildingStageFrame(next,id,level);
      const spec=family.sprites?{src:frame.src,width:frame.width,height:frame.height}:family;
      return [spec.src,spec];
    })).values(),next.terrain];
    if (!BUILDING_STAGE_IDS.every(id=>next.buildings[id].sprites) || BUILDING_STAGE_IDS.some(id=>activeBuildingConstruction(state,id))) entries.push(next.crane);
    let cursor=0;
    async function worker(){
      while(cursor<entries.length){const spec=entries[cursor++],image=await imageLoader(spec);
        requireValue(image && image.naturalWidth===spec.width && image.naturalHeight===spec.height,`${spec.src}: wymiary nie zgadzają się z manifestem`);images.set(spec.src,image);}
    }
    await Promise.all(Array.from({length:Math.min(entries.length,Math.max(1,Math.min(4,Math.floor(Number(concurrency)||3))))},worker));
    // The complete current scene must be decoded before revealing the island.
    return {manifest:next,images};
}
export function loadBuildingStages(options={}) {
  if (loading) return loading;
  loading = readBuildingStageAssets(options).then(({manifest,images}) => {loadedImages=images;catalog=manifest;return manifest;});
  return loading;
}
export function applyBuildingStageArtwork(wrapper,id,level,manifest=catalog) {
  const frame = buildingStageFrame(manifest,id,level);
  if (!frame) return false;
  const signature = `${id}:${frame.index}:${frame.src}`;
  if (wrapper.dataset.buildingStageSignature === signature) return true;
  wrapper.style.backgroundImage='none';
  const svg=document.createElementNS(NS,'svg'),image=document.createElementNS(NS,'image');
  svg.setAttribute('viewBox',frame.viewBox.join(' '));svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  svg.setAttribute('width','100%');svg.setAttribute('height','100%');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
  Object.assign(svg.style,{display:'block',width:'100%',height:'100%',overflow:'hidden'});
  image.setAttribute('href',frame.src);image.setAttribute('width',String(frame.width));image.setAttribute('height',String(frame.height));svg.append(image);
  // `meet` letterboxing exposes neighbouring atlas cells unless the IMAGE,
  // not only the SVG viewport, is clipped. A basic shape needs no shared IDs,
  // so the mobile dock can safely clone this SVG.
  const [x,y,w,h]=frame.viewBox;
  image.style.clipPath=`inset(${y}px ${frame.width-x-w}px ${frame.height-y-h}px ${x}px)`;
  wrapper.replaceChildren(svg);wrapper.dataset.buildingStageSignature=signature;wrapper.dataset.buildingStage=String(frame.index+1);
  wrapper.dataset.mapArtSource='building-stages';wrapper.dataset.mapArtRect=JSON.stringify(frame.viewBox);
  return true;
}
export function refreshBuildingStageArtwork(root,state,manifest=catalog) {
  if (!manifest?.enabled || state?.ruleset !== 32) return;
  for (const node of root.querySelectorAll('[data-map-building-art]')) {
    if (node.hasAttribute('data-building-stage-map')) continue;
    applyBuildingStageArtwork(node,node.dataset.mapBuildingArt,buildingStageLevel(state,node.dataset.mapBuildingArt),manifest);
  }
}
function trace(ctx,points) {points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));ctx.closePath();}
export const PROTECTED_SAILBOAT = freeze([[204,640],[295,616],[389,627],[435,733],[397,770],[287,778],[205,747]]);
export function composeBuildingTerrain(original,terrain,manifest=catalog,{canvasFactory=() => document.createElement('canvas')}={}) {
  if (!manifest?.enabled) return original;
  requireValue(terrain,'brak zdekodowanej planszy terenu');
  const canvas=canvasFactory();canvas.width=WORLD_SIZE[0];canvas.height=WORLD_SIZE[1];const ctx=canvas.getContext('2d');
  requireValue(ctx,'brak kontekstu terenu');ctx.drawImage(original,0,0,...WORLD_SIZE);
  // Every cleanup pass precedes all building sprites. Overlapping cleanup
  // regions therefore cannot erase a newly painted neighbouring building.
  for (const patch of manifest.terrain.patches) {
    ctx.save();ctx.beginPath();trace(ctx,patch.polygon);ctx.clip();
    ctx.beginPath();ctx.rect(0,0,...WORLD_SIZE);trace(ctx,PROTECTED_SAILBOAT);ctx.clip('evenodd');
    ctx.drawImage(terrain,0,0,...WORLD_SIZE);ctx.restore();
  }
  return canvas;
}
export function createBuildingStageScene({getState,manifest=catalog,host}={}) {
  if (!manifest?.enabled) return null;
  const root=document.createElement('div');root.dataset.buildingStageScene='';root.setAttribute('aria-hidden','true');
  Object.assign(root.style,{position:'absolute',inset:'0',width:'1672px',height:'941px',pointerEvents:'none',zIndex:'9'});
  const nodes=new Map(),cranes=new Map();let disposed=false;
  const specs=[...BUILDING_STAGE_IDS.map(id => ({key:id,family:id})),...manifest.decorations.map(entry => ({...entry,key:`decoration-${entry.id}`,decoration:true}))];
  for (const spec of specs) {const node=document.createElement('span');node.dataset.buildingStageMap=spec.key;node.dataset.mapBuildingArt=spec.family;
    if (spec.decoration) node.dataset.buildingStageDecoration=spec.id;
    Object.assign(node.style,{position:'absolute',display:'block',pointerEvents:'none'});nodes.set(spec.key,node);root.append(node);}
  function update() {
    if (disposed) return;
    const state=getState();root.hidden=state?.ruleset!==32;if(root.hidden)return;
    for (const spec of specs) {
      const level=buildingStageLevel(state,spec.family,spec.decoration);
      const frame=buildingStagePlacement(manifest,spec.family,level,spec.decoration?spec:null),node=nodes.get(spec.key);
      const depth=Math.round((manifest.buildings[spec.family].paintDepth??(frame.y+frame.h))*2);
      if(node.dataset.level!==String(level)){
        Object.assign(node.style,{left:`${frame.x}px`,top:`${frame.y}px`,width:`${frame.w}px`,height:`${frame.h}px`,zIndex:String(depth)});
        node.dataset.level=String(level);
      }
      applyBuildingStageArtwork(node,spec.family,level,manifest);
      const project=!spec.decoration && activeBuildingConstruction(state,spec.family);let crane=cranes.get(spec.key);
      if (project) {
        if (!crane) {
          crane=document.createElementNS(NS,'svg');const image=document.createElementNS(NS,'image');
          image.setAttribute('href',manifest.crane.src);image.setAttribute('width',String(manifest.crane.width));image.setAttribute('height',String(manifest.crane.height));
          const [cx,cy,cw,ch]=manifest.crane.frameRect;
          image.style.clipPath=`inset(${cy}px ${manifest.crane.width-cx-cw}px ${manifest.crane.height-cy-ch}px ${cx}px)`;
          crane.setAttribute('viewBox',manifest.crane.frameRect.join(' '));crane.setAttribute('preserveAspectRatio','xMidYMid meet');crane.append(image);
          crane.dataset.buildingConstructionCrane=spec.family;crane.style.pointerEvents='none';root.append(crane);cranes.set(spec.key,crane);
        }
        const position=buildingCranePlacement(manifest,spec.family,level);
        Object.assign(crane.style,{position:'absolute',display:'block',width:`${position.width}px`,height:`${position.height}px`,left:`${position.left}px`,top:`${position.top}px`,zIndex:String(depth+1)});
        crane.dataset.projectOrder=String(project.order ?? '');
      } else if (crane) {crane.remove();cranes.delete(spec.key);}
    }
  }
  host?.append(root);update();return {element:root,update,destroy(){disposed=true;root.remove();nodes.clear();cranes.clear();}};
}
