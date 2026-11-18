// Presentation coordinates only. Building IDs, inventories, crews and saves keep
// their existing identities when a painted building receives a different role.
import { applyBuildingStageArtwork } from './harborlight-v1-building-stages.js?v=frontend-v32-17';
const freezeRows=rows=>Object.freeze(Object.fromEntries(Object.entries(rows).map(([id,value])=>[id,Object.freeze(value)])));

export const MAP_BUILDING_REGIONS=freezeRows({
  townhall:[536,273,117,116],house:[486,195,105,95],
  farm:[137,304,260,116],lumber:[604,111,120,137],
  quarry:[1041,282,186,188],windmill:[224,206,105,117],
  sawmill:[714,126,161,155],warehouse:[532,565,172,113],
  bakery:[651,289,107,80],dairy:[447,300,96,81],
  slaughterhouse:[315,258,69,51],fisher:[335,525,136,112],
  leatherworks:[1197,383,91,86],academy:[439,506,98,79],
  barracks:[412,406,133,116],chapel:[1295,162,87,92],
  lighthouse:[1246,64,90,134],theatre:[634,360,112,66],
  market:[747,345,80,67],dock:[234,625,482,119]
});

export const MAP_BUILDING_FOOTPRINTS=Object.freeze({
  bakery:'polygon(7% 41%,28% 13%,76% 3%,96% 48%,87% 84%,13% 85%)',
  dairy:'polygon(4% 46%,27% 14%,81% 10%,98% 47%,90% 93%,13% 100%)',
  slaughterhouse:'polygon(3% 36%,32% 4%,76% 10%,98% 45%,93% 96%,10% 96%)',
  fisher:'polygon(8% 42%,35% 8%,78% 20%,94% 45%,85% 93%,16% 98%)',
  leatherworks:'polygon(8% 42%,36% 10%,78% 20%,96% 53%,85% 93%,16% 98%)',
  academy:'polygon(3% 37%,20% 8%,53% 2%,91% 43%,90% 88%,34% 98%,8% 78%)',
  // The unused leatherworks hut at the lower right remains a decoration.
  barracks:'polygon(0% 20%,30% 0%,100% 30%,100% 59%,64% 59%,64% 100%,10% 100%)',
  // Keep the canopy exclusively clickable as the new Warehouse.
  dock:'polygon(0 0,61.8% 0,61.8% 44.6%,97.5% 44.6%,97.5% 0,100% 0,100% 100%,0 100%)'
});

export const MAP_ART_SOURCES=freezeRows({
  map:{url:'assets/harborlight-v1-approved.png',width:1672,height:941},
  farm:{url:'assets/harborlight-farm-forest-approved-v32.png',width:1536,height:1024},
  harbor:{url:'assets/harborlight-harbor-approved-v32.png',width:1536,height:1024},
  ocean:{url:'assets/harborlight-ocean-approved-v32.png',width:1672,height:941}
});

const artwork=(source,rect)=>Object.freeze({source,rect:Object.freeze(rect)});
export const MAP_BUILDING_ART=Object.freeze({
  farm:artwork('farm',[44,573,250,170]),
  windmill:artwork('map',[184,194,191,130]),
  quarry:artwork('map',[991,275,260,177]),
  lumber:artwork('farm',[1265,105,250,170]),
  sawmill:artwork('map',[690,135,225,153]),
  bakery:artwork('map',[636,282,138,94]),
  dairy:artwork('map',[433,300,129,88]),
  slaughterhouse:artwork('farm',[402,327,231,157]),
  fisher:artwork('harbor',[155,395,412,280]),
  leatherworks:artwork('map',[1178,376,125,85]),
  townhall:artwork('map',[506,246,180,145]),
  house:artwork('map',[485,192,115,97]),
  warehouse:artwork('harbor',[704,494,510,347]),
  market:artwork('map',[740,338,102,79]),
  dock:artwork('map',[236,624,210,155]),
  chapel:artwork('map',[1284,161,107,100]),
  lighthouse:artwork('map',[1236,62,111,147]),
  academy:artwork('harbor',[419,293,366,268]),
  barracks:artwork('map',[399,393,172,128]),
  theatre:artwork('map',[625,345,135,100])
});

export const mapRegionFor=(id,fallback)=>MAP_BUILDING_REGIONS[id]||fallback;
export const mapFootprintFor=id=>MAP_BUILDING_FOOTPRINTS[id]||'inset(0)';

/** Crop the unchanged accepted PNG uniformly, including in resizable cards. */
export function buildingArtwork(id,{className='building-dock-picture',width,height,level=1}={}){
  const spec=MAP_BUILDING_ART[id]||MAP_BUILDING_ART.house;
  const source=MAP_ART_SOURCES[spec.source];
  const wrapper=document.createElement('span');
  wrapper.className=className;
  wrapper.setAttribute('aria-hidden','true');
  wrapper.dataset.mapBuildingArt=id;
  wrapper.dataset.mapArtSource=spec.source;
  wrapper.dataset.mapArtRect=JSON.stringify(spec.rect);
  if(width!=null)wrapper.style.width=typeof width==='number'?`${width}px`:width;
  if(height!=null)wrapper.style.height=typeof height==='number'?`${height}px`:height;
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox',spec.rect.join(' '));
  svg.setAttribute('preserveAspectRatio','xMidYMid slice');
  svg.setAttribute('width','100%');svg.setAttribute('height','100%');
  svg.setAttribute('focusable','false');svg.setAttribute('aria-hidden','true');
  Object.assign(svg.style,{display:'block',width:'100%',height:'100%',overflow:'hidden'});
  const image=document.createElementNS(ns,'image');
  image.setAttribute('href',source.url);image.setAttribute('width',String(source.width));image.setAttribute('height',String(source.height));
  svg.append(image);wrapper.append(svg);applyBuildingStageArtwork(wrapper,id,level);return wrapper;
}

const scale=540/1536;
const fieldPatch=(id,rect)=>Object.freeze({id,source:'farm',rect:Object.freeze(rect),region:Object.freeze([170+rect[0]*scale,140+rect[1]*scale,rect[2]*scale,rect[3]*scale])});
export const ACCEPTED_MAP_PATCHES=Object.freeze([
  fieldPatch('farm',[35,570,275,210]),
  fieldPatch('lumber',[1270,100,250,220]),
  fieldPatch('slaughterhouse',[390,325,260,180]),
  Object.freeze({id:'fisher',source:'harbor',rect:Object.freeze([114,262,697,486]),region:Object.freeze([320,482,245,171]),clip:'polygon(0 0,100% 0,100% 100%,29% 100%,29% 84%,0 84%)'})
]);

/** Mount above ambient repainting (6/8), below actual island controls (10). */
export function createAcceptedMapLayer({dockLeft=474,includeBuildings=true}={}){
  const layer=document.createElement('div');
  layer.className='accepted-map-art-layer';layer.dataset.acceptedMapArt='';
  layer.setAttribute('aria-hidden','true');
  Object.assign(layer.style,{position:'absolute',inset:'0',width:'1672px',height:'941px',zIndex:'9',pointerEvents:'none'});
  const loading=[];
  const loadImage=(key)=>{
    const image=new Image();image.src=MAP_ART_SOURCES[key].url;
    loading.push(image.decode());
    return image;
  };
  for(const spec of includeBuildings ? ACCEPTED_MAP_PATCHES : []){
    const [sx,sy,sw,sh]=spec.rect,[x,y,w,h]=spec.region,source=MAP_ART_SOURCES[spec.source];
    const patch=document.createElement('div');
    patch.className='accepted-map-art-patch';patch.dataset.acceptedArtwork=spec.id;
    Object.assign(patch.style,{position:'absolute',left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`,overflow:'hidden',pointerEvents:'none',maskImage:'linear-gradient(to right,transparent,#000 5px,#000 calc(100% - 5px),transparent),linear-gradient(to bottom,transparent,#000 5px,#000 calc(100% - 5px),transparent)',maskComposite:'intersect'});
    if(spec.clip)patch.style.clipPath=spec.clip;
    const image=loadImage(spec.source);
    Object.assign(image.style,{position:'absolute',display:'block',maxWidth:'none',width:`${source.width*w/sw}px`,height:`${source.height*h/sh}px`,left:`${-sx*w/sw}px`,top:`${-sy*h/sh}px`});
    patch.append(image);layer.append(patch);
  }
  const ocean=document.createElement('div');
  ocean.className='accepted-map-ocean';ocean.dataset.acceptedOcean='';
  Object.assign(ocean.style,{position:'absolute',left:'235px',top:'778px',width:`${Math.max(0,dockLeft-235)}px`,height:'163px',overflow:'hidden',pointerEvents:'none',maskImage:'linear-gradient(to right,transparent,#000 30px)'});
  const water=loadImage('ocean');
  Object.assign(water.style,{position:'absolute',display:'block',width:'1672px',height:'941px',maxWidth:'none',left:'-150px',top:'-778px',filter:'brightness(1.08)'});
  ocean.append(water);layer.append(ocean);
  layer.ready=Promise.all(loading);
  return layer;
}
