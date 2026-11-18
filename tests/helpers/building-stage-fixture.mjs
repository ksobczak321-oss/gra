// Synthetic contract fixtures, never production artwork or game assets.
import { BUILDING_STAGE_IDS } from '../../harborlight-v1-building-stages.js';
import { MAP_BUILDING_REGIONS, ACCEPTED_MAP_PATCHES } from '../../harborlight-v1-map-art.js';
export function buildingStageFixture() {
  const frameRects=Array.from({length:10},(_,i)=>[(i%5)*160,Math.floor(i/5)*160,160,160]);
  const rectPolygon=([x,y,w,h])=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  const buildings=Object.fromEntries(BUILDING_STAGE_IDS.map(id=>[id,{
    src:`assets/building-upgrades-v1/${id}.webp`,width:800,height:320,frameRects,
    bboxes:Array.from({length:10},(_,i)=>[40-i*2,55-i*3,48+i*4,60+i*7]),mapRect:[...MAP_BUILDING_REGIONS[id]],
    smoke: id==='house'?Array.from({length:10},()=>[80,50]):[]
  }]));
  return {version:1,enabled:true,buildings,
    terrain:{src:'assets/building-upgrades-v1/terrain.webp',width:1672,height:941,patches:[
      ...Object.entries(MAP_BUILDING_REGIONS).map(([id,r])=>({id,polygon:rectPolygon(r)})),
      ...ACCEPTED_MAP_PATCHES.map(p=>({id:`accepted-${p.id}`,polygon:rectPolygon(p.region)})),
      {id:'decoration-former-leatherworks',polygon:rectPolygon([498,475,60,60])}
    ]},
    crane:{src:'assets/building-upgrades-v1/crane.webp',width:80,height:80},
    decorations:[{id:'former-leatherworks',family:'house',mapRect:[498,475,60,60]}]
  };
}
