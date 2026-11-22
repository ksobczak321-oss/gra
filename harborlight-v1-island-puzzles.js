// Deterministic, saved island puzzles. Player commands describe moves only.
// Generators start from a valid construction; completion is recomputed from the
// board. Free hints, reset and bounded undo never require money or an ad.
import { createOriginalAttempt, applyOriginalInput, availableConvoyIds } from './harborlight-v1-original-puzzles.js?v=frontend-v32-24';
import { createMiniGame, revealMiniGameCard, setMiniGameTilt, advanceMiniGame, normalizeMiniGame } from './harborlight-v1-minigames.js?v=frontend-v32-24';
import { ISLAND_PUZZLE_CATALOG, puzzleById } from './harborlight-v1-story-catalog.js?v=frontend-v32-24';
const clone=x=>JSON.parse(JSON.stringify(x));
const int=(n,a=0,b=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const text=(language,pl,en)=>language==='en'?en:pl;
const good=(message,extra={})=>({ok:true,message,...extra});
const bad=message=>({ok:false,message});
const names=['Kotwica','Latarnia','Muszla','Żagiel','Kompas','Dzwon','Mapa','Skrzynia'];
const englishNames=['Anchor','Lighthouse','Shell','Sail','Compass','Bell','Map','Crate'];
const localizedName=(name,l)=>l==='en'?(englishNames[names.indexOf(name)]||name):name;
const icons=['⚓','✦','◉','△','⌖','♬','⌘','▣'];
function rng(seed){let x=seed>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
const shuffle=(list,r)=>{const a=[...list];for(let i=a.length-1;i;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const rint=(r,n)=>Math.floor(r()*n);
const engine=Object.create(null);
const moveItem=(id,label,move,extra={})=>({id:String(id),label:String(label),move,...extra});
const select=(id,label,extra={})=>moveItem(id,label,{type:'select',id:String(id)},extra);
const control=(id,label,move,extra={})=>moveItem(id,label,move,extra);
const grid=(rows,cols,cell)=>({rows,cols,cells:Array.from({length:rows*cols},(_,index)=>({id:String(index),index,row:Math.floor(index/cols),column:index%cols,col:index%cols,...cell(index)}))});
const placed=(d,id)=>d.items?.find(x=>x.id===id);
const selectedId=(d,m)=>typeof m.id==='string'?m.id:d.selected;
function crossed(edges,positions){let count=0;for(let a=0;a<positions.length;a++)for(let b=a+1;b<positions.length;b++)if((a-b)*(positions[a]-positions[b])<0)count++;return count;}
function bfs(rows,cols,start,goal,walls=new Set()){
 const queue=[start],prev=new Map([[start,null]]);
 for(const p of queue){if(p===goal)break;const row=Math.floor(p/cols),col=p%cols;for(const [dr,dc]of[[-1,0],[0,1],[1,0],[0,-1]]){const r=row+dr,c=col+dc,n=r*cols+c;if(r<0||r>=rows||c<0||c>=cols||walls.has(n)||prev.has(n))continue;prev.set(n,p);queue.push(n);}}
 if(!prev.has(goal))return[];const path=[];for(let p=goal;p!==null;p=prev.get(p))path.unshift(p);return path;
}
engine.gull={
 make(r){const solution=rint(r,4),food=rint(r,3);return{solution,food,bait:null,key:false,spots:Array.from({length:4},(_,i)=>({id:String(i),height:i===solution?2:i%2,safe:i===solution||i%2===0,food:i===solution?food:(food+i+1)%3}))};},
 move(d,m){if(m.type==='choose'&&int(m.index,0,3)){d.bait=m.index;return true;}if(m.type==='inspect'&&m.id==='key'){if(d.bait===d.solution)d.key=true;return true;}return false;},
 solved:d=>d.key,
 view(d,l){const foods=l==='en'?['fish','bread','seeds']:['ryba','chleb','ziarna'];return{clues:[text(l,`Mewa wybiera ${['rybę','chleb','ziarna'][d.food]}. Przynęta musi być wysoko (2) i z dala od krabów.`,`The gull wants ${foods[d.food]}. The bait must be high (2) and safe from crabs.`)],targets:d.spots.map((s,i)=>moveItem(s.id,`${i+1}: ${foods[s.food]} · ↟${s.height} · ${s.safe?'✓':'✗'}`,{type:'choose',index:i},{selected:d.bait===i})),controls:[control('key',text(l,'Zabierz klucz','Recover the key'),{type:'inspect',id:'key'})],progress:{current:Number(d.key),total:1}};},
 solution:d=>[{type:'choose',index:d.solution},{type:'inspect',id:'key'}]
};
engine.hiddenObjects={
 make(r){const target=rint(r,9),color=rint(r,3),symbol=rint(r,4);return{target,color,symbol,inspected:[],found:false,objects:Array.from({length:9},(_,i)=>{let c=i===target?color:(color+i+1)%3,s=i===target?symbol:(symbol+i+2)%4;if(i!==target&&c===color&&s===symbol)s=(s+1)%4;return{id:String(i),color:c,symbol:s};})};},
 move(d,m){if(m.type==='inspect'&&int(m.index,0,8)){if(!d.inspected.includes(m.index))d.inspected.push(m.index);return true;}if(m.type==='choose'&&int(m.index,0,8)&&d.inspected.includes(m.index)){d.found=m.index===d.target;return true;}return false;},
 solved:d=>d.found,
 view(d,l){const colors=l==='en'?['gold','blue','green']:['złoty','niebieski','zielony'];return{clues:[text(l,`Szukaj miejsca: ${colors[d.color]}, znak ${icons[d.symbol]}. Obejrzyj je przed wyborem.`,`Find the ${colors[d.color]} place marked ${icons[d.symbol]}. Inspect before choosing.`)],grid:grid(3,3,i=>({label:d.inspected.includes(i)?`${colors[d.objects[i].color]} ${icons[d.objects[i].symbol]}`:'?',symbol:d.inspected.includes(i)?icons[d.objects[i].symbol]:'?',tone:d.inspected.includes(i)?'active':'plain',move:{type:'inspect',index:i}})),controls:d.inspected.map(i=>control('choose-'+i,text(l,`Tu są okulary? ${i+1}`,`Are the glasses here? ${i+1}`),{type:'choose',index:i})),progress:{current:Number(d.found),total:1}};},
 solution:d=>[{type:'inspect',index:d.target},{type:'choose',index:d.target}]
};
engine.parrot={
 make(r){const words=shuffle(names.slice(0,5),r).slice(0,3+rint(r,2));return{words,entered:[]};},
 move(d,m){if(m.type==='choose'&&int(m.index,0,7)){d.entered.push(names[m.index]);if(d.entered.some((w,i)=>w!==d.words[i]))d.entered=[];return true;}return false;},
 solved:d=>d.entered.join('|')===d.words.join('|'),
 view(d,l){return{clues:[text(l,'Papuga czyta słowa wspak. Odtwórz kolejność nazw.','The parrot reads words backwards. Reconstruct their order.'),d.words.map(w=>[...localizedName(w,l)].reverse().join('')).join(' → ')],controls:names.map((w,i)=>control(String(i),localizedName(w,l),{type:'choose',index:i})),progress:{current:d.entered.length,total:d.words.length}};},
 solution:d=>d.words.slice(d.entered.length).map(w=>({type:'choose',index:names.indexOf(w)}))
};
engine.crabs={
 make(r){return{selected:'0',crabs:[0,1,2].map((_,i)=>({id:String(i),position:(i*2)*5,goal:(i*2)*5+4})),walls:[0,1,2].map((_,i)=>i*10+1+rint(r,3))};},
 move(d,m){if(m.type==='select'&&d.crabs.some(c=>c.id===m.id)){d.selected=m.id;return true;}if(m.type==='navigate'&&int(m.index,0,29)){const c=d.crabs.find(x=>x.id===selectedId(d,m));if(!c)return false;const row=Math.floor(c.position/5),nr=Math.floor(m.index/5);if(Math.abs(row-nr)+Math.abs(c.position%5-m.index%5)!==1||Math.floor(nr/2)!==Number(c.id)||d.walls.includes(m.index)||d.crabs.some(x=>x!==c&&x.position===m.index))return false;c.position=m.index;return true;}return false;},
 solved:d=>d.crabs.every(c=>c.position===c.goal),
 view(d,l){return{clues:[text(l,'Każdy krab ma własną parę rzędów i muszlę po prawej. Kamienie trzeba obejść.','Each crab has its own pair of rows and a shell on the right. Go around the stones.')],items:d.crabs.map(c=>select(c.id,`🦀 ${Number(c.id)+1}`,{selected:d.selected===c.id})),grid:grid(6,5,i=>({label:d.walls.includes(i)?'▰':d.crabs.some(c=>c.position===i)?'🦀':d.crabs.some(c=>c.goal===i)?'◉':'·',tone:d.walls.includes(i)?'obstacle':d.crabs.some(c=>c.goal===i)?'goal':'plain',move:{type:'navigate',index:i},disabled:d.walls.includes(i)})),progress:{current:d.crabs.filter(c=>c.position===c.goal).length,total:3}};},
 solution(d){return d.crabs.flatMap(c=>bfs(6,5,c.position,c.goal,new Set([...d.walls,...Array.from({length:30},(_,i)=>i).filter(i=>Math.floor(Math.floor(i/5)/2)!==Number(c.id))])).slice(1).map(index=>({type:'navigate',id:c.id,index})));}
};
engine.packing={
 make(r){return{selected:'p0',items:shuffle([{id:'p0',w:2,h:2},{id:'p1',w:2,h:2},{id:'p2',w:4,h:1},{id:'p3',w:4,h:1}],r).map(x=>({...x,rotation:rint(r,2),at:null}))};},
 move(d,m){const item=placed(d,selectedId(d,m));if(m.type==='select'&&placed(d,m.id)){d.selected=m.id;return true;}if(!item)return false;if(m.type==='rotate'){item.rotation=1-item.rotation;item.at=null;return true;}if(m.type==='remove'){item.at=null;return true;}if(m.type==='place'&&int(Number(m.target),0,15)){const at=Number(m.target),w=item.rotation?item.h:item.w,h=item.rotation?item.w:item.h,row=Math.floor(at/4),col=at%4;if(row+h>4||col+w>4)return false;const cells=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)cells.push((row+y)*4+col+x);if(d.items.some(p=>p!==item&&p.at!==null&&packingCells(p).some(i=>cells.includes(i))))return false;item.at=at;return true;}return false;},
 solved:d=>d.items.every(x=>x.at!==null),
 view(d,l){return{clues:[text(l,'Spakuj cały sprzęt. Wybrane elementy można obracać i wyjmować bez kosztu.','Pack all the equipment. Rotate or remove selected pieces for free.')],items:d.items.map(p=>select(p.id,`${p.id.slice(1)*1+1}: ${p.rotation?p.h:p.w}×${p.rotation?p.w:p.h}`,{selected:d.selected===p.id})),grid:grid(4,4,i=>({label:d.items.find(p=>p.at!==null&&packingCells(p).includes(i))?.id.slice(1)||'·',tone:d.items.some(p=>p.at!==null&&packingCells(p).includes(i))?'active':'plain',move:{type:'place',target:String(i)}})),controls:[control('rotate',text(l,'Obróć wybrany element','Rotate selected piece'),{type:'rotate'}),control('remove',text(l,'Wyjmij wybrany element','Remove selected piece'),{type:'remove'})],progress:{current:d.items.filter(p=>p.at!==null).length,total:4}};},
 solution(d){const a=[];for(const p of d.items){if(p.at!==null)a.push({type:'remove',id:p.id});if(p.rotation)a.push({type:'rotate',id:p.id});}return[...a,{type:'place',id:'p0',target:'0'},{type:'place',id:'p1',target:'2'},{type:'place',id:'p2',target:'8'},{type:'place',id:'p3',target:'12'}];}
};
function packingCells(p){const w=p.rotation?p.h:p.w,h=p.rotation?p.w:p.h;return Array.from({length:w*h},(_,i)=>p.at+Math.floor(i/w)*4+i%w);}
engine.untangle={
 make(r){let positions=shuffle([0,1,2,3,4],r);if(positions.every((p,i)=>p===i))positions.reverse();return{positions,selected:'0'};},
 move(d,m){if(m.type==='select'&&int(Number(m.id),0,4)){d.selected=String(m.id);return true;}if(m.type==='place'&&int(Number(m.target),0,4)){const i=Number(selectedId(d,m));if(!int(i,0,4))return false;const j=d.positions.indexOf(Number(m.target));[d.positions[i],d.positions[j]]=[d.positions[j],d.positions[i]];return true;}return false;},
 solved:d=>crossed([],d.positions)===0,
 view(d,l){return{clues:[text(l,'Liny nie mogą się przecinać. Wybierz lewą cumę i prawe mocowanie.','Ropes must not cross. Choose a left rope and a right mooring.')],items:d.positions.map((p,i)=>select(String(i),`⚓ ${i+1}`,{x:10,y:10+i*18,selected:d.selected===String(i)})),targets:d.positions.map((_,i)=>moveItem(String(i),`◉ ${i+1}`,{type:'place',target:String(i)},{x:90,y:10+i*18})),connections:d.positions.map((p,i)=>({from:String(i),to:String(p),x1:10,y1:10+i*18,x2:90,y2:10+p*18,crossed:d.positions.some((q,j)=>(i-j)*(p-q)<0)})),progress:{current:10-crossed([],d.positions),total:10}};},
 solution(d){const a=[],p=[...d.positions];for(let i=0;i<5;i++)if(p[i]!==i){const j=p.indexOf(i);a.push({type:'place',id:String(i),target:String(i)});[p[i],p[j]]=[p[j],p[i]];}return a;}
};
engine.navigation={
 make(r){let p=0;const path=[0];for(let i=0;i<10;i++){const row=Math.floor(p/6),col=p%6;p+=row===5?1:col===5?6:r()<.5?1:6;path.push(p);}return{position:0,goal:35,walls:Array.from({length:36},(_,i)=>i).filter(i=>!path.includes(i)&&r()<.65),route:[0],budget:16};},
 move(d,m){if(m.type!=='navigate'||!int(m.index,0,35))return false;const p=d.position;if(Math.abs(Math.floor(p/6)-Math.floor(m.index/6))+Math.abs(p%6-m.index%6)!==1||d.walls.includes(m.index)||d.route.length>=d.budget)return false;d.position=m.index;d.route.push(m.index);return true;},
 solved:d=>d.position===d.goal,
 view(d,l){return{clues:[text(l,'Płyń przez wolne pola do portu. Rafy są zaznaczone; cofnięcie przywraca zapas drogi.','Sail through open cells to the harbor. Reefs are marked; undo restores the route budget.')],grid:grid(6,6,i=>({label:i===d.position?'⛵':i===d.goal?'⚓':d.walls.includes(i)?'▰':d.route.includes(i)?'·':'○',tone:i===d.goal?'goal':d.walls.includes(i)?'obstacle':d.route.includes(i)?'path':'plain',move:{type:'navigate',index:i},disabled:d.walls.includes(i)})),progress:{current:d.position===35?1:0,total:1},status:`${d.route.length-1} / ${d.budget-1}`};},
 solution:d=>bfs(6,6,d.position,d.goal,new Set(d.walls)).slice(1).map(index=>({type:'navigate',index}))
};
engine.scheduling={
 make(r){const offset=rint(r,2),order=shuffle([0,1,2],r);return{selected:'s0',jobs:order.map(i=>({id:'s'+i,duration:i===1?1:2,earliest:offset+(i===2?2:i===1?1:0),latest:offset+(i===2?3:i===1?2:1),quay:i===1?1:0,at:null}))};},
 move(d,m){if(m.type==='select'&&d.jobs.some(j=>j.id===m.id)){d.selected=m.id;return true;}const j=d.jobs.find(x=>x.id===selectedId(d,m));if(m.type==='place'&&j&&typeof m.target==='string'&&/^q[01]-[0-6]$/.test(m.target)){const quay=Number(m.target[1]),at=Number(m.target.slice(3));if(quay!==j.quay||at<j.earliest||at>j.latest||d.jobs.some(x=>x!==j&&x.at!==null&&x.quay===quay&&at<x.at+x.duration&&x.at<at+j.duration))return false;j.at=at;return true;}return false;},
 solved:d=>d.jobs.every(j=>j.at!==null),
 view(d,l){return{clues:[text(l,'Każdy statek ma nabrzeże i okno rozpoczęcia. Rozładunki na jednym nabrzeżu nie mogą się nakładać.','Each ship has a quay and a starting window. Unloading times at one quay must not overlap.')],items:d.jobs.map(j=>select(j.id,`${j.id} · ${text(l,'nabrzeże','quay')} ${j.quay+1} · ${j.earliest}–${j.latest} · ${j.duration}h`,{selected:d.selected===j.id})),targets:Array.from({length:14},(_,i)=>moveItem(`q${Math.floor(i/7)}-${i%7}`,`${Math.floor(i/7)+1} · ${i%7}:00`,{type:'place',target:`q${Math.floor(i/7)}-${i%7}`})),progress:{current:d.jobs.filter(j=>j.at!==null).length,total:3},status:d.jobs.filter(j=>j.at!==null).map(j=>`${j.id}→${j.at}:00`).join(' · ')};},
 solution:d=>d.jobs.filter(j=>j.at===null).sort((a,b)=>a.earliest-b.earliest).map(j=>({type:'place',id:j.id,target:`q${j.quay}-${j.earliest}`}))
};
engine.gears={
 make(r){const desired=[1+rint(r,3),1+rint(r,3),1+rint(r,3)],reverse=rint(r,2);return{factors:[1,1,1],reverse:[0,0,0],desired,target:desired.reduce((a,b)=>a*b,1),targetReverse:reverse};},
 move(d,m){if(!int(m.index,0,2))return false;if(m.type==='choose'&&int(m.value,1,3)){d.factors[m.index]=m.value;return true;}if(m.type==='rotate'){d.reverse[m.index]=1-d.reverse[m.index];return true;}return false;},
 solved:d=>d.factors.reduce((a,b)=>a*b,1)===d.target&&d.reverse.reduce((a,b)=>a+b,0)%2===d.targetReverse,
 view(d,l){return{clues:[text(l,`Trzy przekładnie mnożą obroty. Potrzebujesz ×${d.target} i kierunku ${d.targetReverse?'w lewo':'w prawo'}.`,`Three stages multiply the speed. You need ×${d.target}, turning ${d.targetReverse?'left':'right'}.`)],controls:d.factors.flatMap((v,i)=>[...[1,2,3].map(f=>control(`g${i}-${f}`,`${text(l,'Koło','Gear')} ${i+1}: ×${f}`,{type:'choose',index:i,value:f},{selected:v===f})),control('rev'+i,`${i+1}: ${d.reverse[i]?'↶':'↷'}`,{type:'rotate',index:i})]),progress:{current:Number(d.factors.reduce((a,b)=>a*b,1)===d.target)+Number(d.reverse.reduce((a,b)=>a+b,0)%2===d.targetReverse),total:2},status:`×${d.factors.reduce((a,b)=>a*b,1)}`};},
 solution:d=>[...d.desired.map((value,index)=>({type:'choose',index,value})),...d.reverse.flatMap((v,index)=>v?[{type:'rotate',index}]:[]),...(d.targetReverse?[{type:'rotate',index:0}]:[])]
};
function lightTrace(d){let x=-1,y=2,dx=1,dy=0;const rays=[],seen=new Set();for(let n=0;n<40;n++){const nx=x+dx,ny=y+dy;rays.push({x1:(x+.5)*20,y1:(y+.5)*20,x2:(nx+.5)*20,y2:(ny+.5)*20});x=nx;y=ny;if(x<0||x>4||y<0||y>4)return{rays,hit:false};if(y*5+x===d.receiver)return{rays,hit:true};const key=`${x},${y},${dx},${dy}`;if(seen.has(key))return{rays,hit:false};seen.add(key);const mirror=d.mirrors.find(m=>m.index===y*5+x);if(mirror){if(mirror.rotation===0)[dx,dy]=[-dy,-dx];else[dx,dy]=[dy,dx];}}return{rays,hit:false};}
engine.optics={
 make(r){const row=r()<.5?0:4,desired=row===0?0:1;return{receiver:row*5+4,mirrors:[{index:12,rotation:1-desired},{index:row*5+2,rotation:rint(r,2)}],desired};},
 move(d,m){const mirror=d.mirrors.find(x=>x.index===m.index);if(m.type!=='rotate'||!mirror)return false;mirror.rotation=1-mirror.rotation;return true;},
 solved:d=>lightTrace(d).hit,
 view(d,l){const trace=lightTrace(d);return{clues:[text(l,'Światło wchodzi z lewej. Klikaj zwierciadła, aby poprowadzić je do złotego odbiornika.','Light enters from the left. Rotate mirrors to guide it to the golden receiver.')],grid:grid(5,5,i=>({label:i===d.receiver?'✦':d.mirrors.find(m=>m.index===i)?(d.mirrors.find(m=>m.index===i).rotation?'\\':'/'):'·',symbol:i===d.receiver?'✦':d.mirrors.find(m=>m.index===i)?(d.mirrors.find(m=>m.index===i).rotation?'\\':'/'):'·',tone:i===d.receiver?'goal':'plain',move:{type:'rotate',index:i},disabled:!d.mirrors.some(m=>m.index===i)})),rays:trace.rays,progress:{current:Number(trace.hit),total:1}};},
 solution:d=>d.mirrors.filter(m=>m.rotation!==d.desired).map(m=>({type:'rotate',index:m.index}))
};
engine.tides={
 make(r){const b=1+rint(r,3);return{levels:[6,0,0],target:[0,b,6-b],capacity:6};},
 move(d,m){if(m.type!=='choose'||!int(m.from,0,2)||!int(m.to,0,2)||Math.abs(m.from-m.to)!==1||d.levels[m.from]===0||d.levels[m.to]===d.capacity)return false;d.levels[m.from]--;d.levels[m.to]++;return true;},
 solved:d=>d.levels.every((v,i)=>v===d.target[i]),
 view(d,l){return{clues:[text(l,'Przepuszczaj po jednej jednostce wody między sąsiednimi komorami. Ustaw poziomy zgodnie ze znakami.','Move one unit of water between neighboring chambers. Match the marked levels.')],targets:d.levels.map((v,i)=>({id:String(i),label:`${i+1}: ${v} / ${d.target[i]}`,description:text(l,'poziom / cel','level / target')})),controls:[[0,1],[1,0],[1,2],[2,1]].map(([from,to])=>control(`${from}-${to}`,`${from+1} → ${to+1}`,{type:'choose',from,to})),progress:{current:d.levels.filter((v,i)=>v===d.target[i]).length,total:3}};},
 solution(d){const a=[],v=[...d.levels];while(v[2]>d.target[2]){a.push({type:'choose',from:2,to:1});v[2]--;v[1]++;}while(v[0]>0){a.push({type:'choose',from:0,to:1});v[0]--;v[1]++;}while(v[2]<d.target[2]){a.push({type:'choose',from:1,to:2});v[1]--;v[2]++;}return a;}
};
engine.hotel={
 make(r){const assignments=shuffle([0,1,2,3],r);return{selected:'g0',guests:assignments.map((room,i)=>({id:'g'+i,room,at:null})),rooms:[{floor:0,beds:2,sea:true},{floor:0,beds:1,sea:false},{floor:1,beds:3,sea:true},{floor:1,beds:1,sea:false}]};},
 move(d,m){if(m.type==='select'&&d.guests.some(g=>g.id===m.id)){d.selected=m.id;return true;}const g=d.guests.find(x=>x.id===selectedId(d,m));if(m.type==='place'&&g&&int(Number(m.target),0,3)){const other=d.guests.find(x=>x!==g&&x.at===Number(m.target));if(other)other.at=g.at;g.at=Number(m.target);return true;}return false;},
 solved:d=>d.guests.every(g=>g.at===g.room),
 view(d,l){return{clues:[text(l,'Każda grupa ma inne potrzeby. Zapewnij wszystkim pokój zgodny z kartą.','Every group has different needs. Match all guests to their room cards.')],items:d.guests.map(g=>{const room=d.rooms[g.room];return select(g.id,`${g.id}: ${room.beds} ${text(l,'os.','people')} · ${room.floor?text(l,'piętro','upstairs'):text(l,'parter','ground floor')} · ${room.sea?'🌊':'🌿'}`,{selected:d.selected===g.id});}),targets:d.rooms.map((r,i)=>moveItem(String(i),`${i+1}: ${r.beds} 🛏 · ${r.floor?text(l,'piętro','upstairs'):text(l,'parter','ground floor')} · ${r.sea?'🌊':'🌿'} ${d.guests.find(g=>g.at===i)?.id||''}`,{type:'place',target:String(i)})),progress:{current:d.guests.filter(g=>g.at===g.room).length,total:4}};},
 solution:d=>d.guests.map(g=>({type:'place',id:g.id,target:String(g.room)}))
};
engine.magnets={
 make(r){return{position:0,goal:5,strengths:shuffle([1,2,4],r),poles:[1,1,1],pulses:0};},
 move(d,m){if(m.type==='rotate'&&int(m.index,0,2)){d.poles[m.index]*=-1;return true;}if(m.type==='submit'){const force=d.strengths.reduce((s,v,i)=>s+v*d.poles[i],0);if(Math.abs(force)!==1)return false;const at=d.position+force;if(at<0||at>5)return false;d.position=at;d.pulses++;return true;}return false;},
 solved:d=>d.position===d.goal,
 view(d,l){const force=d.strengths.reduce((s,v,i)=>s+v*d.poles[i],0);return{clues:[text(l,'Magnesy wspólnie przesuwają kapsułę. Zbyt silny impuls ją blokuje: potrzebujesz wypadkowej +1.','The magnets move the capsule together. A strong pulse jams it: you need a net force of +1.')],grid:grid(1,6,i=>({label:i===d.position?'◉':i===d.goal?'🔓':'·',tone:i===d.goal?'goal':'plain'})),controls:[...d.strengths.map((v,i)=>control(String(i),`🧲 ${v}: ${d.poles[i]>0?'→':'←'}`,{type:'rotate',index:i})),control('pulse',text(l,'Wyślij impuls','Send a pulse'),{type:'submit'})],status:`Σ ${force>0?'+':''}${force}`,progress:{current:d.position,total:d.goal}};},
 solution(d){const a=[];d.strengths.forEach((v,i)=>{const wanted=v===4?1:-1;if(d.poles[i]!==wanted)a.push({type:'rotate',index:i});});for(let n=d.position;n<5;n++)a.push({type:'submit'});return a;}
};
engine.paperFold={
 make(r){return{folds:[0,0,0,0],target:Array.from({length:4},()=>rint(r,2)),front:shuffle(names.slice(0,4),r),back:shuffle(names.slice(4,8),r)};},
 move(d,m){if(m.type!=='rotate'||!int(m.index,0,3))return false;d.folds[m.index]=1-d.folds[m.index];return true;},
 solved:d=>d.folds.every((v,i)=>v===d.target[i]),
 view(d,l){const letters=d.folds.map((v,i)=>localizedName((v?d.back:d.front)[i],l));return{clues:[text(l,'Złóż rogi planu tak, aby w okienkach pojawiły się wskazane znaki. Każdy róg można ponownie rozłożyć.','Fold the corners until the windows show the indicated symbols. Every fold can be undone.'),text(l,'Wiadomość: ','Message: ')+d.target.map((v,i)=>localizedName((v?d.back:d.front)[i],l)).join(' · ')],grid:grid(2,2,i=>({label:letters[i],symbol:d.folds[i]?'◩':'◰',rotation:d.folds[i]*180,move:{type:'rotate',index:i}})),progress:{current:d.folds.filter((v,i)=>v===d.target[i]).length,total:4}};},
 solution:d=>d.folds.flatMap((v,index)=>v===d.target[index]?[]:[{type:'rotate',index}])
};
engine.invention={
 make(r){const roles=shuffle(['reach','grip','lift','noise','fragile','water'],r);return{selected:[],roles,complete:false};},
 move(d,m){if(m.type==='choose'&&int(m.index,0,5)){const i=d.selected.indexOf(m.index);if(i>=0)d.selected.splice(i,1);else if(d.selected.length<3)d.selected.push(m.index);else return false;return true;}if(m.type==='submit'){d.complete=['reach','grip','lift'].every(role=>d.selected.some(i=>d.roles[i]===role))&&d.selected.length===3;return true;}return false;},
 solved:d=>d.complete,
 view(d,l){const labels=l==='en'?{reach:'long pole',grip:'hook',lift:'rope and pulley',noise:'bell',fragile:'glass sheet',water:'water bucket'}:{reach:'długi kij',grip:'hak',lift:'lina z bloczkiem',noise:'dzwonek',fragile:'tafla szkła',water:'wiadro wody'};return{clues:[text(l,'Przedmiot leży głęboko w studni. Potrzebujesz zasięgu, chwytu i podnoszenia. Wybierz trzy części i sprawdź wynalazek.','The object is deep in the well. You need reach, grip and lifting. Choose three parts and test the invention.')],items:d.roles.map((role,i)=>moveItem(String(i),labels[role],{type:'choose',index:i},{selected:d.selected.includes(i)})),controls:[control('test',text(l,'Sprawdź wynalazek','Test the invention'),{type:'submit'})],progress:{current:Number(d.complete),total:1}};},
 solution:d=>[...d.selected.filter(i=>!['reach','grip','lift'].includes(d.roles[i])).map(index=>({type:'choose',index})),...['reach','grip','lift'].filter(role=>!d.selected.includes(d.roles.indexOf(role))).map(role=>({type:'choose',index:d.roles.indexOf(role)})),{type:'submit'}]
};
engine.photo={
 make(r){return{camera:[0,0,0],target:[1+rint(r,3),1+rint(r,3),1+rint(r,3)]};},
 move(d,m){if(m.type!=='choose'||!int(m.index,0,2)||![-1,1].includes(m.value))return false;const v=d.camera[m.index]+m.value;if(v<0||v>4)return false;d.camera[m.index]=v;return true;},
 solved:d=>d.camera.every((v,i)=>v===d.target[i]),
 view(d,l){return{clues:[text(l,'Ustaw aparat tak, aby trzy znaki nałożyły się na złote kontury. Obraz reaguje na położenie i przybliżenie.','Move the camera until all three symbols overlap the golden outlines. The image changes with position and zoom.')],objects:[0,1,2].map(i=>({id:String(i),label:icons[i],symbol:icons[i],x:25+i*25+(d.camera[0]-d.target[0])*5+(i-1)*(d.camera[2]-d.target[2])*4,y:50+(d.camera[1]-d.target[1])*6,targetX:25+i*25,targetY:50})),controls:d.camera.flatMap((v,i)=>[-1,1].map(value=>control(`${i}-${value}`,`${[text(l,'Poziom','Horizontal'),text(l,'Pion','Vertical'),text(l,'Zoom','Zoom')][i]} ${value<0?'−':'+'}`,{type:'choose',index:i,value}))),progress:{current:d.camera.filter((v,i)=>v===d.target[i]).length,total:3}};},
 solution:d=>d.camera.flatMap((v,index)=>Array.from({length:Math.abs(v-d.target[index])},()=>({type:'choose',index,value:Math.sign(d.target[index]-v)})))
};
engine.deduction={
 make(r){return{selected:'p0',answer:shuffle([0,1,2],r),assignments:[null,null,null]};},
 move(d,m){if(m.type==='select'&&int(Number(String(m.id).slice(1)),0,2)){d.selected=m.id;return true;}const i=Number(String(selectedId(d,m)).slice(1));if(m.type==='place'&&int(i,0,2)&&int(Number(m.target),0,2)){const target=Number(m.target),other=d.assignments.indexOf(target);if(other>=0)d.assignments[other]=d.assignments[i];d.assignments[i]=target;return true;}return false;},
 solved:d=>d.assignments.every((v,i)=>v===d.answer[i]),
 view(d,l){const locations=l==='en'?['Farm','Theatre','Lighthouse']:['Gospodarstwo','Teatr','Latarnia'];return{clues:[text(l,`Skrzynia z kotwicą trafiła do: ${locations[d.answer[0]]}.`,`The anchor crate went to: ${locations[d.answer[0]]}.`),text(l,`Przesyłka z muszlą nie była dla: ${locations[d.answer[2]]}.`,`The shell parcel was not for: ${locations[d.answer[2]]}.`),text(l,'Każde miejsce dostało jedną skrzynię. Żagiel jest na paczce trzeciej.','Every place received one crate. The sail marks the third parcel.')],items:[0,1,2].map(i=>select('p'+i,(l==='en'?['⚓ Anchor','◉ Shell','△ Sail']:['⚓ Kotwica','◉ Muszla','△ Żagiel'])[i],{selected:d.selected==='p'+i})),targets:locations.map((label,i)=>moveItem(String(i),`${label} ${d.assignments.indexOf(i)>=0?['⚓','◉','△'][d.assignments.indexOf(i)]:''}`,{type:'place',target:String(i)})),progress:{current:d.assignments.filter((v,i)=>v===d.answer[i]).length,total:3}};},
 solution:d=>d.answer.map((target,i)=>({type:'place',id:'p'+i,target:String(target)}))
};
engine.cooking={
 make(r){const order=shuffle([[2,1,0],[1,0,2],[0,2,1]],r);return{recipes:order,pot:[0,0,0],served:0};},
 move(d,m){if(m.type==='choose'&&int(m.index,0,2)&&d.pot.reduce((a,b)=>a+b,0)<3){d.pot[m.index]++;return true;}if(m.type==='clear'){d.pot=[0,0,0];return true;}if(m.type==='submit'){if(d.pot.every((v,i)=>v===d.recipes[d.served][i]))d.served++;d.pot=[0,0,0];return true;}return false;},
 solved:d=>d.served===3,
 view(d,l){const ingredients=l==='en'?['grain','herbs','berries']:['zboże','zioła','jagody'];return{clues:[text(l,'Zasoby kuchni należą do scenariusza. Próby nie zużywają zapasów wyspy.','Kitchen supplies belong to this scenario. Trials do not use island stock.'),text(l,'Następny przepis: ','Next recipe: ')+(d.recipes[Math.min(2,d.served)]||[]).map((v,i)=>`${ingredients[i]} ×${v}`).join(' · ')],items:ingredients.map((label,index)=>moveItem(String(index),`${label}: ${d.pot[index]}`,{type:'choose',index})),controls:[control('cook',text(l,'Przygotuj porcję','Prepare a portion'),{type:'submit'}),control('clear',text(l,'Opróżnij garnek','Empty the pot'),{type:'clear'})],progress:{current:d.served,total:3}};},
 solution(d){const a=[];if(d.pot.some(Boolean))a.push({type:'clear'});for(let n=d.served;n<3;n++){d.recipes[n].forEach((v,index)=>{for(let i=0;i<v;i++)a.push({type:'choose',index});});a.push({type:'submit'});}return a;}
};
engine.signalsDecode={
 make(r){const key=shuffle([0,1,2,3],r),message=Array.from({length:4+rint(r,3)},()=>rint(r,4));return{key,message,entered:[]};},
 move(d,m){if(m.type!=='choose'||!int(m.value,0,3))return false;const expected=d.key[d.message[d.entered.length]];if(m.value===expected)d.entered.push(m.value);else d.entered=[];return true;},
 solved:d=>d.entered.length===d.message.length,
 view(d,l){return{clues:[text(l,'Odczytaj symbole według legendy i nadaj liczby w tej samej kolejności.','Decode the symbols using the legend, then send the numbers in the same order.'),d.key.map((v,i)=>`${icons[i]}=${v+1}`).join(' · '),d.message.map(i=>icons[i]).join(' → ')],controls:[0,1,2,3].map(value=>control(String(value),String(value+1),{type:'choose',value})),progress:{current:d.entered.length,total:d.message.length}};},
 solution:d=>d.message.slice(d.entered.length).map(i=>({type:'choose',value:d.key[i]}))
};
engine.balance={
 make(r){const values=shuffle([1,2,3,4],r),split=2;return{selected:'w0',weights:values.map((value,i)=>({id:'w'+i,value,plate:null})),target:[values[0]+values[1],values[2]+values[3]]};},
 move(d,m){if(m.type==='select'&&d.weights.some(w=>w.id===m.id)){d.selected=m.id;return true;}const w=d.weights.find(x=>x.id===selectedId(d,m));if(m.type==='place'&&w&&int(Number(m.target),0,1)){w.plate=Number(m.target);return true;}return false;},
 solved:d=>d.weights.every(w=>w.plate!==null)&&d.target.every((v,i)=>d.weights.filter(w=>w.plate===i).reduce((s,w)=>s+w.value,0)===v),
 view(d,l){return{clues:[text(l,'Obie zapadnie muszą mieć oznaczone obciążenie jednocześnie. Użyj wszystkich czterech ciężarków.','Both catches need their marked loads at the same time. Use all four weights.')],items:d.weights.map(w=>select(w.id,`${w.value} ⚖`,{selected:d.selected===w.id})),targets:d.target.map((v,i)=>moveItem(String(i),`${i+1}: ${d.weights.filter(w=>w.plate===i).reduce((s,w)=>s+w.value,0)} / ${v}`,{type:'place',target:String(i)})),progress:{current:d.target.filter((v,i)=>d.weights.filter(w=>w.plate===i).reduce((s,w)=>s+w.value,0)===v).length,total:2}};},
 solution:d=>d.weights.map((w,i)=>({type:'place',id:w.id,target:String(i<2?0:1)}))
};
engine.memoryTriples={
 make(r,p){return{miniGame:createMiniGame('triples',p.difficulty||1+rint(r,3),(p.seed^Math.imul(p.variant,0x9e3779b9))>>>0,p.clock)};},
 move(d,m,p){return m.type==='reveal'&&revealMiniGameCard(d.miniGame,m.index,p.clock);},solved:d=>d.miniGame.solved,
 advance(d,seconds,from){advanceMiniGame(d.miniGame,seconds,from);},
 view(d,l){return{clues:[text(l,'Odzyskuj fragmenty dokumentu, znajdując trójki. Ta plansza nie pobiera ani nie wypłaca monet osobnej ekspedycji.','Recover document fragments by matching triples. This board does not charge or award a separate expedition pot.')],miniGame:d.miniGame,progress:{current:d.miniGame.matched.filter(Boolean).length,total:d.miniGame.cards.length}};},
 solution:d=>[...new Set(d.miniGame.cards)].flatMap(symbol=>d.miniGame.cards.flatMap((v,index)=>v===symbol&&!d.miniGame.matched[index]?[{type:'reveal',index}]:[]))
};
engine.marbleMaze={
 make(r,p){return{miniGame:createMiniGame('tilt',p.difficulty||1,(p.seed^Math.imul(p.variant,0x9e3779b9))>>>0,p.clock)};},
 move(d,m){return m.type==='tilt'&&setMiniGameTilt(d.miniGame,m.tiltX,m.tiltY);},solved:d=>d.miniGame.solved,
 advance(d,seconds,from){advanceMiniGame(d.miniGame,seconds,from);},
 view(d,l){return{clues:[text(l,'Przechylaj planszę i doprowadź kulę do celu. Każdy etap ma własny czas; wyjście kończy bieżącą próbę.','Tilt the board and guide the marble to the goal. Every stage has its own timer; leaving ends the current attempt.')],miniGame:d.miniGame,progress:{current:d.miniGame.balls.filter(b=>b.settled).length,total:d.miniGame.balls.length}};},
 solution:()=>[]
};
for(const variant of ['signal-line','harbor-routes'])engine[variant]={
 make(r,p){return{attempt:createOriginalAttempt(variant,{seed:(p.seed^Math.imul(p.variant,0x9e3779b9))>>>0,difficulty:p.difficulty||1,boardVersion:p.generatorVersion===2?2:1,now:p.clock*1000})};},
 move(d,m){const input=m.type==='node'?{kind:'node',node:m.id}:m.type==='convoy'?{kind:'convoy',id:m.id}:['clear','lift'].includes(m.type)?{kind:m.type}:null;if(!input)return false;const result=applyOriginalInput(d.attempt,input);return result.ok||result.code==='stroke-lifted';},
 solved:d=>d.attempt.status==='won',
 view(d,l){const a=d.attempt;return{originalAttempt:a,clues:[text(l,'Każdy przewód i konwój należy do tego etapu. Nagrodę odbierasz po ukończeniu przygody.','Every wire and convoy belongs to this stage. Claim the reward when the adventure is complete.')],progress:{current:variant==='signal-line'?a.usedEdges.length:a.board.removed.length,total:variant==='signal-line'?a.board.edges.length:a.board.paths.length}};},
 solution(d){const a=d.attempt;if(variant==='harbor-routes'){const board=clone(a.board),moves=[];while(board.removed.length<board.paths.length){const id=availableConvoyIds(board)[0];if(!id)return[];moves.push({type:'convoy',id});board.removed.push(id);}return moves;}
  const used=new Set(a.usedEdges),adj=new Map(a.board.nodes.map(n=>[n.id,[]]));for(const e of a.board.edges)if(!used.has(e.id)){adj.get(e.a).push([e.b,e.id]);adj.get(e.b).push([e.a,e.id]);}const start=a.trail.at(-1)||a.board.starts[0],stack=[start],out=[],visited=new Set();while(stack.length){const list=adj.get(stack.at(-1));while(list.length&&visited.has(list.at(-1)[1]))list.pop();if(list.length){const[next,id]=list.pop();visited.add(id);stack.push(next);}else out.push(stack.pop());}if(visited.size!==a.board.edges.length-used.size)return[{type:'clear'}];return out.reverse().slice(a.trail.length?1:0).map(id=>({type:'node',id}));}
};
// New attempts use generation 2. Marker-less saved attempts keep every original
// generator and move rule, so a patch cannot invalidate a completed room proof.
const legacyEngine = Object.freeze({...engine});
const puzzleEngine = p => p?.generatorVersion === 2 ? engine[p.kind] : legacyEngine[p.kind];
function memoryPath(r,size,length){
 const goal=size*size-1,path=[0],used=new Set([0]);let budget=4000;
 function visit(at){if(--budget<0)return false;if(path.length===length)return at===goal;const row=Math.floor(at/size),col=at%size;
  for(const[dr,dc]of shuffle([[-1,0],[0,1],[1,0],[0,-1]],r)){const y=row+dr,x=col+dc,next=y*size+x,left=length-path.length-1;if(y<0||x<0||y>=size||x>=size||used.has(next)||Math.abs(size-1-y)+Math.abs(size-1-x)>left||(next===goal&&left!==0))continue;used.add(next);path.push(next);if(visit(next))return true;path.pop();used.delete(next);}return false;}
 if(visit(0))return path;return[0,1,2,3,4,9,14,19,24];
}
engine.crabs={
 make(r,p){const path=memoryPath(r,5,11+2*((p.variant-1)%5));return{mode:'memory',path,position:0,step:0,revealing:true};},
 move(d,m){if(m.type==='reveal'){d.position=0;d.step=0;d.revealing=true;return true;}if(m.type==='submit'&&d.revealing){d.revealing=false;return true;}if(m.type!=='navigate'||d.revealing||!int(m.index,0,24))return false;if(Math.abs(Math.floor(d.position/5)-Math.floor(m.index/5))+Math.abs(d.position%5-m.index%5)!==1)return false;if(m.index===d.path[d.step+1]){d.position=m.index;d.step++;}else{d.position=0;d.step=0;}return true;},
 solved:d=>d.step===d.path.length-1,
 view(d,l){return{clues:[text(l,d.revealing?'Zapamiętaj kolejność pól od kraba do muszli. Gdy będziesz gotowy, zakryj trasę.':'Idź po zapamiętanej trasie. Klikaj tylko sąsiednie pola. Błędny krok przenosi kraba na początek.','Remember the cells from the crab to the shell. Hide the route when ready. A wrong adjacent step sends the crab back to the start.')],grid:grid(5,5,i=>({label:i===d.position?'🦀':i===24?'◉':d.revealing&&d.path.includes(i)?String(d.path.indexOf(i)+1):'·',tone:i===24?'goal':d.revealing&&d.path.includes(i)?'path':'plain',move:{type:'navigate',index:i},disabled:d.revealing})),controls:[d.revealing?control('begin-route',text(l,'Zapamiętane — ruszam','I remember — go'),{type:'submit'}):control('show-route',text(l,'Pokaż trasę od nowa','Show the route again'),{type:'reveal'})],progress:{current:d.step,total:d.path.length-1},status:text(l,d.revealing?'Oglądasz trasę.':'Krab wraca na początek po każdym błędnym kroku.',d.revealing?'Study the route.':'A wrong step returns the crab to the start.')};},
 solution:d=>[...(d.revealing?[{type:'submit'}]:[]),...d.path.slice(d.step+1).map(index=>({type:'navigate',index}))],
 checkpoint:d=>[...(!d.revealing?[{type:'submit'}]:[]),...d.path.slice(1,d.step+1).map(index=>({type:'navigate',index}))]
};
function anagramLetters(d,word=d.wordIndex,language=d.language??0){const value=localizedName(d.words[word],language?'en':'pl');return d.orders[language][word].map(index=>[...value][index]);}
function anagramWordMoves(d,word,language=d.language??0){const letters=anagramLetters(d,word,language),taken=new Set();return[...localizedName(d.words[word],language?'en':'pl')].map(letter=>{const index=letters.findIndex((value,i)=>value===letter&&!taken.has(i));taken.add(index);return{type:'choose',index,value:language};});}
engine.parrot={
 make(r,p){const words=shuffle(names,r).slice(0,2+Math.min(2,Math.floor(p.variant/2))),orders=[0,1].map(language=>words.map(word=>{const value=[...localizedName(word,language?'en':'pl')],indices=shuffle(value.map((_,i)=>i),r);if(indices.every((v,i)=>v===i))indices.push(indices.shift());return indices;}));return{words,orders,wordIndex:0,entered:[],language:null};},
 move(d,m){if(m.type==='clear'){d.entered=[];return true;}if(m.type==='choose'&&[0,1].includes(m.value)&&int(m.index,0,20)){if(d.language!==null&&m.value!==d.language&&d.entered.length)return false;if(d.entered.length===0)d.language=m.value;const letters=anagramLetters(d);if(m.index>=letters.length||d.entered.includes(m.index))return false;d.entered.push(m.index);return true;}if(m.type==='submit'){const letters=anagramLetters(d),answer=d.entered.map(i=>letters[i]).join(''),expected=localizedName(d.words[d.wordIndex],d.language?'en':'pl');if(answer===expected){d.wordIndex++;d.entered=[];}else d.entered=[];return true;}return false;},
 solved:d=>d.wordIndex===d.words.length,
 view(d,l){const language=d.entered.length?d.language:l==='en'?1:0,word=Math.min(d.wordIndex,d.words.length-1),letters=anagramLetters(d,word,language);return{clues:[text(l,'Ułóż portowe słowo z rozsypanych liter. Każdej płytki użyj raz, a potem sprawdź odpowiedź.','Arrange the letter tiles into a harbor word. Use each tile once, then check your answer.'),text(l,'Twoje słowo: ','Your word: ')+d.entered.map(i=>letters[i]).join('')],controls:[...letters.map((letter,index)=>control('letter-'+index,letter,{type:'choose',index,value:language},{disabled:d.entered.includes(index)})),control('check-word',text(l,'Sprawdź słowo','Check word'),{type:'submit'}),control('clear-word',text(l,'Ułóż słowo od nowa','Clear word'),{type:'clear'})],progress:{current:d.wordIndex,total:d.words.length},status:text(l,`Słowo ${Math.min(d.wordIndex+1,d.words.length)} z ${d.words.length}`,`Word ${Math.min(d.wordIndex+1,d.words.length)} of ${d.words.length}`)};},
 solution(d){const actions=[];if(d.entered.length)actions.push({type:'clear'});for(let word=d.wordIndex;word<d.words.length;word++)actions.push(...anagramWordMoves(d,word),{type:'submit'});return actions;},
 checkpoint(d){const actions=[];for(let word=0;word<d.wordIndex;word++)actions.push(...anagramWordMoves(d,word),{type:'submit'});for(const index of d.entered)actions.push({type:'choose',index,value:d.language??0});if(d.language!==null&&!d.entered.length&&d.wordIndex<d.words.length)actions.push({type:'choose',index:0,value:d.language},{type:'clear'});return actions;}
};
function shapeCells(item,rotation=item.rotation){let points=item.shape.map(([x,y])=>[x,y]);for(let n=0;n<rotation;n++)points=points.map(([x,y])=>[-y,x]);const minX=Math.min(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1]));return points.map(([x,y])=>[x-minX,y-minY]);}
function pieceCells(item,at=item.at){return shapeCells(item).map(([x,y])=>at+y*4+x);}
engine.packing={
 make(r,p){const pieces=[{shape:[[0,0],[0,1],[0,2],[1,2]],at:0},{shape:[[0,0],[1,0],[1,1],[1,2]],at:2},{shape:[[0,0],[0,1],[1,1],[1,2]],at:1},{shape:[[0,0],[1,0],[2,0],[3,0]],at:12}],turns=(p.variant-1)%4;return{selected:'p0',items:shuffle(pieces.map((piece,id)=>{let cells=piece.shape.map(([x,y])=>[piece.at%4+x,Math.floor(piece.at/4)+y]);for(let n=0;n<turns;n++)cells=cells.map(([x,y])=>[3-y,x]);const minX=Math.min(...cells.map(c=>c[0])),minY=Math.min(...cells.map(c=>c[1]));return{id:'p'+id,shape:cells.map(([x,y])=>[x-minX,y-minY]),answerAt:minY*4+minX,rotation:rint(r,4),at:null};}),r)};},
 move(d,m){if(m.type==='select'&&placed(d,m.id)){d.selected=m.id;return true;}const item=placed(d,selectedId(d,m));if(!item)return false;if(m.type==='rotate'){item.rotation=(item.rotation+1)%4;item.at=null;return true;}if(m.type==='remove'){item.at=null;return true;}if(m.type==='place'&&int(Number(m.target),0,15)){const at=Number(m.target),points=shapeCells(item);if(points.some(([x,y])=>at%4+x>=4||Math.floor(at/4)+y>=4))return false;const cells=pieceCells(item,at);if(d.items.some(p=>p!==item&&p.at!==null&&pieceCells(p).some(i=>cells.includes(i))))return false;item.at=at;return true;}return false;},
 solved:d=>d.items.every(p=>p.at!==null),
 view(d,l){return{clues:[text(l,'Wypełnij całą skrzynkę czterema kształtami. Wcięcia elementów muszą do siebie pasować. Kliknięte pole wyznacza lewy górny róg kształtu.','Fill the whole crate with four interlocking shapes. The chosen cell anchors the upper-left corner of the shape.')],items:d.items.map(p=>{const shape=shapeCells(p);return select(p.id,text(l,'Element ','Piece ')+(Number(p.id.slice(1))+1),{selected:d.selected===p.id,shapeCells:shape,shapeWidth:Math.max(...shape.map(c=>c[0]))+1,shapeHeight:Math.max(...shape.map(c=>c[1]))+1,description:shape.map(c=>`(${c[0]+1},${c[1]+1})`).join(' ')});}),grid:grid(4,4,i=>({label:d.items.find(p=>p.at!==null&&pieceCells(p).includes(i))?.id.slice(1)*1+1||'·',tone:d.items.some(p=>p.at!==null&&pieceCells(p).includes(i))?'active':'plain',move:{type:'place',target:String(i)}})),controls:[control('rotate',text(l,'Obróć o ćwierć obrotu','Rotate a quarter turn'),{type:'rotate'}),control('remove',text(l,'Wyjmij wybrany element','Remove selected piece'),{type:'remove'})],progress:{current:d.items.filter(p=>p.at!==null).length,total:4}};},
 solution(d){const actions=d.items.filter(p=>p.at!==null).map(p=>({type:'remove',id:p.id}));for(const p of d.items){for(let n=0;n<(4-p.rotation)%4;n++)actions.push({type:'rotate',id:p.id});actions.push({type:'place',id:p.id,target:String(p.answerAt)});}return actions;},
 checkpoint(d,puzzle){const initial=createIslandPuzzle('packing',{seed:puzzle.seed,variant:puzzle.variant,generatorVersion:2}),actions=[];for(const p of d.items){const before=initial.data.items.find(item=>item.id===p.id);for(let n=0;n<(p.rotation-before.rotation+4)%4;n++)actions.push({type:'rotate',id:p.id});if(p.at!==null)actions.push({type:'place',id:p.id,target:String(p.at)});}actions.push({type:'select',id:d.selected});return actions;}
};
const ringPoint=(slot,n)=>({x:50+39*Math.cos(2*Math.PI*slot/n-Math.PI/2),y:50+39*Math.sin(2*Math.PI*slot/n-Math.PI/2)});
function graphCrossings(d){const lines=d.edges.map(([a,b])=>({a,b,p:ringPoint(d.positions[a],d.positions.length),q:ringPoint(d.positions[b],d.positions.length)})),bad=new Set();const orient=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){const a=lines[i],b=lines[j];if([a.a,a.b].some(id=>id===b.a||id===b.b))continue;if(orient(a.p,a.q,b.p)*orient(a.p,a.q,b.q)<-1e-8&&orient(b.p,b.q,a.p)*orient(b.p,b.q,a.q)<-1e-8){bad.add(i);bad.add(j);}}return bad;}
engine.untangle={
 make(r){const n=8,edges=Array.from({length:n},(_,i)=>[i,(i+1)%n]).concat(Array.from({length:n-3},(_,i)=>[0,i+2]));const d={positions:shuffle(Array.from({length:n},(_,i)=>i),r),edges,selected:'0'};if(!graphCrossings(d).size)[d.positions[1],d.positions[3]]=[d.positions[3],d.positions[1]];return d;},
 move(d,m){if(m.type==='select'&&int(Number(m.id),0,7)){d.selected=m.id;return true;}if(m.type==='place'&&int(Number(m.target),0,7)){const a=Number(selectedId(d,m)),b=Number(m.target);if(!int(a,0,7)||a===b)return false;[d.positions[a],d.positions[b]]=[d.positions[b],d.positions[a]];return true;}return false;},
 solved:d=>graphCrossings(d).size===0,
 view(d,l){const bad=graphCrossings(d);return{clues:[text(l,'Przenieś zaczepy, aby rozplątać całą sieć. Wybierz symbol i drugi zaczep — zamienią się miejscami. Linie mogą spotykać się we wspólnym zaczepie.','Untangle the whole network. Select a symbol and another anchor to swap their positions. Lines may meet at a shared anchor.')],items:d.positions.map((_,i)=>select(String(i),icons[i],{selected:d.selected===String(i)})),targets:d.positions.map((_,i)=>moveItem(String(i),text(l,'Zamień z ','Swap with ')+icons[i],{type:'place',target:String(i)})),connections:d.edges.map(([a,b],i)=>{const p=ringPoint(d.positions[a],8),q=ringPoint(d.positions[b],8);return{from:String(a),to:String(b),fromLabel:icons[a],toLabel:icons[b],x1:p.x,y1:p.y,x2:q.x,y2:q.y,straight:true,crossed:bad.has(i)};}),progress:{current:d.edges.length-bad.size,total:d.edges.length}};},
 solution(d){const positions=[...d.positions],a=[];for(let i=0;i<positions.length;i++){if(positions[i]===i)continue;const j=positions.indexOf(i);a.push({type:'place',id:String(i),target:String(j)});[positions[i],positions[j]]=[positions[j],positions[i]];}return a;}
};
// Checkpoint swaps are generated from the actual seed-derived initial layout.
engine.untangle.checkpoint=(d,p)=>{const initial=createIslandPuzzle('untangle',{seed:p.seed,variant:p.variant,level:p.level,difficulty:p.difficulty,generatorVersion:2}),positions=[...initial.data.positions],a=[];for(let i=0;i<positions.length;i++){if(positions[i]===d.positions[i])continue;const j=positions.indexOf(d.positions[i]);a.push({type:'place',id:String(i),target:String(j)});[positions[i],positions[j]]=[positions[j],positions[i]];}a.push({type:'select',id:d.selected});return a;};
engine.navigation={
 make(r){let p=0;const path=[0];for(let i=0;i<10;i++){const row=Math.floor(p/6),col=p%6;p+=row===5?1:col===5?6:r()<.5?1:6;path.push(p);}return{position:0,goal:35,walls:Array.from({length:36},(_,i)=>i).filter(i=>!path.includes(i)&&r()<.65),discovered:[],route:[0],budget:20};},
 move(d,m){if(m.type!=='navigate'||!int(m.index,0,35))return false;const p=d.position;if(Math.abs(Math.floor(p/6)-Math.floor(m.index/6))+Math.abs(p%6-m.index%6)!==1)return false;if(d.walls.includes(m.index)){if(!d.discovered.includes(m.index))d.discovered.push(m.index);d.position=0;d.route=[0];return true;}if(d.route.length>=d.budget)return false;d.position=m.index;d.route.push(m.index);return true;},
 solved:d=>d.position===d.goal,
 view(d,l){return{clues:[text(l,'Rafy kryją się we mgle. Płyń po sąsiednich polach do portu. Trafienie na rafę odsłania ją i cofa łódź na początek; odkryte rafy pozostają widoczne.','Reefs are hidden in the fog. Sail through adjacent cells. Hitting a reef reveals it and returns the boat to the start; revealed reefs remain visible.')],grid:grid(6,6,i=>({label:i===d.position?'⛵':i===d.goal?'⚓':d.discovered.includes(i)?'▰':d.route.includes(i)?'·':'☁',tone:i===d.goal?'goal':d.discovered.includes(i)?'obstacle':d.route.includes(i)?'path':'plain',move:{type:'navigate',index:i},disabled:d.discovered.includes(i)})),controls:[control('restart-course',text(l,'Wróć na początek, zachowując odkryte rafy','Return to the start and keep revealed reefs'),{type:'reveal'})],progress:{current:Number(d.position===35),total:1},status:text(l,`Droga: ${d.route.length-1}/${d.budget-1}. Odkryte rafy: ${d.discovered.length}.`,`Route: ${d.route.length-1}/${d.budget-1}. Revealed reefs: ${d.discovered.length}.`)};},
 solution(d){const steps=bfs(6,6,d.position,d.goal,new Set(d.walls)).slice(1);return steps.length+d.route.length<=d.budget?steps.map(index=>({type:'navigate',index})):[{type:'reveal'},...bfs(6,6,0,d.goal,new Set(d.walls)).slice(1).map(index=>({type:'navigate',index}))];},
 checkpoint(d){const a=[];for(const wall of d.discovered){let route=null;for(const beside of[wall-6,wall+6,wall-1,wall+1]){if(beside<0||beside>35||Math.abs(Math.floor(wall/6)-Math.floor(beside/6))+Math.abs(wall%6-beside%6)!==1||d.walls.includes(beside))continue;const candidate=bfs(6,6,0,beside,new Set(d.walls));if(candidate.length&&candidate.length<=d.budget){route=candidate;break;}}if(route)a.push(...route.slice(1).map(index=>({type:'navigate',index})),{type:'navigate',index:wall});}return[...a,...d.route.slice(1).map(index=>({type:'navigate',index}))];}
};
const navigationMove=engine.navigation.move;engine.navigation.move=(d,m)=>{if(m.type==='reveal'){d.position=0;d.route=[0];return true;}return navigationMove(d,m);};
function modernLightTrace(d){let x=-1,y=d.entryRow,dx=1,dy=0;const rays=[],seen=new Set(),unit=100/d.size;for(let n=0;n<d.size*d.size*4;n++){const nx=x+dx,ny=y+dy;rays.push({x1:(x+.5)*unit,y1:(y+.5)*unit,x2:(nx+.5)*unit,y2:(ny+.5)*unit});x=nx;y=ny;if(x<0||x>=d.size||y<0||y>=d.size)return{rays,hit:false};if(y*d.size+x===d.receiver)return{rays,hit:true};const key=`${x},${y},${dx},${dy}`;if(seen.has(key))return{rays,hit:false};seen.add(key);const mirror=d.mirrors.find(m=>m.index===y*d.size+x);if(mirror){if(mirror.rotation===0)[dx,dy]=[-dy,-dx];else[dx,dy]=[dy,dx];}}return{rays,hit:false};}
engine.optics={
 make(r){const reflected=r()<.5,points=[[2,3,0],[2,1,0],[5,1,1],[5,5,0],[1,5,1],[1,0,0]],mirrors=points.map(([x,y,answer],i)=>({index:(reflected?6-y:y)*7+x,answer:reflected?1-answer:answer,rotation:rint(r,2)}));mirrors[0].rotation=1-mirrors[0].answer;return{size:7,entryRow:3,receiver:(reflected?6:0)*7+6,mirrors};},
 move(d,m){const mirror=d.mirrors.find(x=>x.index===m.index);if(m.type!=='rotate'||!mirror)return false;mirror.rotation=1-mirror.rotation;return true;},
 solved:d=>modernLightTrace(d).hit,
 view(d,l){const trace=modernLightTrace(d);return{clues:[text(l,'Poprowadź światło przez sześć zwierciadeł do złotego odbiornika. Kliknięcie lustra zmienia / na \\ i odwrotnie. Śledź cały promień, również jego powroty przez planszę.','Guide the light through six mirrors to the golden receiver. Click a mirror to switch / and \\. Follow the whole beam, including its return paths.')],grid:grid(7,7,i=>{const mirror=d.mirrors.find(m=>m.index===i);return{label:i===d.receiver?'✦':mirror?(mirror.rotation?'\\':'/'):'·',symbol:i===d.receiver?'✦':mirror?(mirror.rotation?'\\':'/'):'·',tone:i===d.receiver?'goal':'plain',move:{type:'rotate',index:i},disabled:!mirror};}),rays:trace.rays,progress:{current:Number(trace.hit),total:1}};},
 solution:d=>d.mirrors.filter(m=>m.rotation!==m.answer).map(m=>({type:'rotate',index:m.index}))
};
function guestFits(g,room){return room.beds>=g.needs.beds&&(g.needs.sea===null||room.sea===g.needs.sea)&&room.floor<=g.needs.maxFloor;}
function hotelMatching(d){const matches=Array(d.guests.length).fill(null),used=new Set();function next(i){if(i===d.guests.length)return true;for(let room=0;room<d.rooms.length;room++){if(used.has(room)||!guestFits(d.guests[i],d.rooms[room]))continue;matches[i]=room;used.add(room);if(next(i+1))return true;used.delete(room);}return false;}return next(0)?matches:[];}
engine.hotel={
 make(r){const rooms=[{floor:0,beds:1,sea:true},{floor:0,beds:2,sea:false},{floor:1,beds:2,sea:true},{floor:1,beds:3,sea:false},{floor:2,beds:3,sea:true},{floor:2,beds:4,sea:false}],assignments=shuffle([0,1,2,3,4,5],r);return{selected:'g0',rooms,guests:assignments.map((room,i)=>({id:'g'+i,room,at:null,needs:{beds:Math.max(1,rooms[room].beds-(r()<.35?1:0)),sea:r()<.4?null:rooms[room].sea,maxFloor:rooms[room].floor}}))};},
 move(d,m){if(m.type==='select'&&d.guests.some(g=>g.id===m.id)){d.selected=m.id;return true;}const g=d.guests.find(x=>x.id===selectedId(d,m));if(m.type==='place'&&g&&int(Number(m.target),0,5)){const other=d.guests.find(x=>x!==g&&x.at===Number(m.target));if(other)other.at=g.at;g.at=Number(m.target);return true;}return false;},
 solved:d=>d.guests.every(g=>g.at!==null&&guestFits(g,d.rooms[g.at]))&&new Set(d.guests.map(g=>g.at)).size===d.guests.length,
 view(d,l){return{clues:[text(l,'Rozmieść sześć grup, uwzględniając wszystkie potrzeby naraz. Zostaw duże pokoje i pokoje na parterze grupom, które ich wymagają. Wybranie zajętego pokoju zamienia grupy miejscami.','House six groups while meeting every need. Keep large and ground-floor rooms for guests who require them. Choosing an occupied room swaps the groups.')],items:d.guests.map((g,i)=>select(g.id,`${text(l,'Grupa','Group')} ${i+1}: ≥${g.needs.beds} 🛏 · ${text(l,'najwyżej piętro','maximum floor')} ${g.needs.maxFloor} · ${g.needs.sea===null?text(l,'dowolny widok','any view'):g.needs.sea?'🌊':'🌿'}`,{selected:d.selected===g.id})),targets:d.rooms.map((r,i)=>moveItem(String(i),`${text(l,'Pokój','Room')} ${i+1}: ${r.beds} 🛏 · ${text(l,'piętro','floor')} ${r.floor} · ${r.sea?'🌊':'🌿'} ${d.guests.find(g=>g.at===i)?.id.replace('g',text(l,'grupa ','group '))||''}`,{type:'place',target:String(i)})),progress:{current:d.guests.filter(g=>g.at!==null&&guestFits(g,d.rooms[g.at])).length,total:6}};},
 solution(d){return hotelMatching(d).map((room,i)=>({type:'place',id:d.guests[i].id,target:String(room)}));}
};
function inventionFits(d,indices){if(indices.length!==3)return false;const parts=indices.map(i=>d.parts[i]);return['reach','grip','lift'].every(role=>parts.filter(p=>p.role===role).length===1)&&parts.every(p=>p.joint===parts[0].joint)&&parts.find(p=>p.role==='reach').value>=d.depth&&parts.find(p=>p.role==='lift').value>=d.weight&&parts.find(p=>p.role==='grip').value===d.grip;}
function inventionAnswer(d){for(let a=0;a<d.parts.length;a++)for(let b=a+1;b<d.parts.length;b++)for(let c=b+1;c<d.parts.length;c++)if(inventionFits(d,[a,b,c]))return[a,b,c];return[];}
engine.invention={
 make(r){const joint=rint(r,3),depth=4+rint(r,3),weight=2+rint(r,3),grip=rint(r,2),parts=[];for(const role of['reach','grip','lift'])for(let n=0;n<3;n++){const value=role==='reach'?n===0?depth:depth-1+rint(r,4):role==='lift'?n===0?weight:weight-1+rint(r,3):n===0?grip:1-grip;parts.push({role,value,joint:n===0?joint:(joint+n)%3});}return{selected:[],parts:shuffle(parts,r),depth,weight,grip,complete:false};},
 move(d,m){if(m.type==='choose'&&int(m.index,0,d.parts.length-1)){const index=d.selected.indexOf(m.index);if(index>=0)d.selected.splice(index,1);else if(d.selected.length<3)d.selected.push(m.index);else return false;return true;}if(m.type==='submit'){d.complete=inventionFits(d,d.selected);return true;}return false;},
 solved:d=>d.complete,
 view(d,l){const joints=l==='en'?['gold','blue','green']:['złote','niebieskie','zielone'];return{clues:[text(l,`Przedmiot jest ${d.depth} m w dół i waży ${d.weight} kg. Potrzebny ${d.grip?'chwytak':'hak'}. Wybierz drążek, chwyt i podnośnik z jednakowymi złączami.`,`The object is ${d.depth} m down and weighs ${d.weight} kg. It needs ${d.grip?'a clamp':'a hook'}. Choose a pole, grip and hoist with matching joints.`)],items:d.parts.map((p,index)=>moveItem(String(index),`${p.role==='reach'?text(l,'Drążek','Pole')+' '+p.value+' m':p.role==='lift'?text(l,'Podnośnik','Hoist')+' '+p.value+' kg':p.value?text(l,'Chwytak','Clamp'):text(l,'Hak','Hook')} · ${text(l,'złącza','joints')} ${joints[p.joint]}`,{type:'choose',index},{selected:d.selected.includes(index)})),controls:[control('test',text(l,'Sprawdź wynalazek','Test invention'),{type:'submit'})],progress:{current:Number(d.complete),total:1}};},
 solution(d){const answer=inventionAnswer(d);return[...d.selected.filter(i=>!answer.includes(i)).map(index=>({type:'choose',index})),...answer.filter(i=>!d.selected.includes(i)).map(index=>({type:'choose',index})),{type:'submit'}];}
};
const cookingIngredients={pl:['zboże','zioła','jagody','mleko','miód','grzyby'],en:['grain','herbs','berries','milk','honey','mushrooms']};
engine.cooking={
 make(r){const recipes=Array.from({length:3},()=>{const permitted=shuffle([0,1,2,3,4,5],r).slice(0,3),counts=Array(6).fill(0);permitted.forEach((i,n)=>counts[i]=n===0?2:1);return counts;});return{recipes,heatTargets:Array.from({length:3},()=>rint(r,3)),heat:0,pot:Array(6).fill(0),served:0};},
 move(d,m){if(m.type==='choose'&&int(m.index,0,5)&&d.pot.reduce((a,b)=>a+b,0)<4){d.pot[m.index]++;return true;}if(m.type==='rotate'){d.heat=(d.heat+1)%3;return true;}if(m.type==='clear'){d.pot=Array(6).fill(0);return true;}if(m.type==='submit'){if(d.heat===d.heatTargets[d.served]&&d.pot.every((v,i)=>v===d.recipes[d.served][i]))d.served++;d.pot=Array(6).fill(0);return true;}return false;},
 solved:d=>d.served===3,
 view(d,l){const ingredients=cookingIngredients[l==='en'?'en':'pl'],heats=l==='en'?['cold','warm','hot']:['na zimno','ciepłe','gorące'],n=Math.min(d.served,2),recipe=d.recipes[n];return{clues:[text(l,'Przygotuj cztery łyżki na porcję. Wybierz właściwe składniki i temperaturę. Zła porcja opróżnia garnek, ale nie zalicza dania. Zapasy zagadki są oddzielne od wyspy.','Prepare four spoonfuls per portion, using the right ingredients and temperature. A wrong portion empties the pot without serving a dish. Puzzle supplies are separate from the island.'),text(l,'Zamówienie: ','Order: ')+recipe.flatMap((v,i)=>v?[`${ingredients[i]} ×${v}`]:[]).join(' · ')+` · ${heats[d.heatTargets[n]]}`,text(l,'Wykluczone składniki: ','Excluded ingredients: ')+recipe.flatMap((v,i)=>!v?[ingredients[i]]:[]).join(', ')],items:ingredients.map((name,index)=>moveItem(String(index),`${name}: ${d.pot[index]}`,{type:'choose',index})),controls:[control('heat',text(l,'Zmień temperaturę: ','Change temperature: ')+heats[d.heat],{type:'rotate'}),control('cook',text(l,'Przygotuj porcję','Prepare portion'),{type:'submit'}),control('clear',text(l,'Opróżnij garnek','Empty pot'),{type:'clear'})],progress:{current:d.served,total:3}};},
 solution(d){const a=[];if(d.pot.some(Boolean))a.push({type:'clear'});let heat=d.heat;for(let n=d.served;n<3;n++){while(heat!==d.heatTargets[n]){a.push({type:'rotate'});heat=(heat+1)%3;}d.recipes[n].forEach((v,index)=>{for(let k=0;k<v;k++)a.push({type:'choose',index});});a.push({type:'submit'});}return a;},
 checkpoint(d){const a=[];let heat=0;for(let n=0;n<d.served;n++){while(heat!==d.heatTargets[n]){a.push({type:'rotate'});heat=(heat+1)%3;}d.recipes[n].forEach((v,index)=>{for(let k=0;k<v;k++)a.push({type:'choose',index});});a.push({type:'submit'});}while(heat!==d.heat){a.push({type:'rotate'});heat=(heat+1)%3;}d.pot.forEach((v,index)=>{for(let k=0;k<v;k++)a.push({type:'choose',index});});return a;}
};
// Inspecting is useful observation, not a lottery: all physical markings are
// visible and two independently stated clues identify one item before choosing.
engine.hiddenObjects={...legacyEngine.hiddenObjects,
 view(d,l){const colors=l==='en'?['gold','blue','green']:['złoty','niebieski','zielony'];return{clues:[text(l,`Okulary leżą przy miejscu o kolorze: ${colors[d.color]}.`,`The glasses are beside a ${colors[d.color]} place.`),text(l,`Znak na tym miejscu to ${icons[d.symbol]}. Obie wskazówki muszą pasować. Kliknij miejsce, żeby je obejrzeć, a potem potwierdź wybór.`,`Its marking is ${icons[d.symbol]}. Both clues must match. Inspect a place, then confirm your choice.`)],grid:grid(3,3,i=>({label:`${colors[d.objects[i].color]} ${icons[d.objects[i].symbol]}`,symbol:icons[d.objects[i].symbol],tone:d.inspected.includes(i)?'active':'plain',move:{type:'inspect',index:i}})),controls:d.inspected.map(i=>control('choose-'+i,text(l,`Wybieram miejsce ${i+1}`,`Choose place ${i+1}`),{type:'choose',index:i})),progress:{current:Number(d.found),total:1}};}
};

// The model supplies explicit control labels as well as the pre-game guide.
engine.gull={...legacyEngine.gull,view(d,l){const foods=l==='en'?['fish','bread','seeds']:['ryba','chleb','ziarna'],heights=l==='en'?['low','middle','high']:['nisko','średnio','wysoko'];return{clues:[text(l,`Odciągnij mewę od klucza. Wybierz miejsce z jedzeniem: ${foods[d.food]}, wysoko i bez krabów. Potem kliknij „Zabierz klucz”.`,`Lure the gull away from the key. Choose a high place with ${foods[d.food]} and no crabs. Then click “Recover the key”.`)],targets:d.spots.map((s,i)=>moveItem(s.id,`${text(l,'Miejsce','Place')} ${i+1}: ${foods[s.food]} · ${heights[s.height]} · ${s.safe?text(l,'bez krabów','no crabs'):text(l,'są kraby','crabs here')}`,{type:'choose',index:i},{selected:d.bait===i})),controls:[control('key',text(l,'Zabierz klucz','Recover the key'),{type:'inspect',id:'key'},{disabled:d.bait===null})],progress:{current:Number(d.key),total:1}};}};
engine.scheduling={...legacyEngine.scheduling,view(d,l){return{clues:[text(l,'Najpierw wybierz kartę statku. Potem kliknij nabrzeże i godzinę rozpoczęcia rozładunku. Cały rozładunek musi zmieścić się przed następnym statkiem przy tym samym nabrzeżu.','Select a ship card, then click its quay and unloading start time. Its whole unloading period must end before the next ship uses that quay.')],items:d.jobs.map(j=>select(j.id,`${text(l,'Statek','Ship')} ${Number(j.id.slice(1))+1} · ${text(l,'nabrzeże','quay')} ${j.quay+1} · ${text(l,'zacznij','start')} ${j.earliest}:00–${j.latest}:00 · ${text(l,'rozładunek','unloading')} ${j.duration} h`,{selected:d.selected===j.id})),targets:Array.from({length:14},(_,i)=>moveItem(`q${Math.floor(i/7)}-${i%7}`,`${text(l,'Nabrzeże','Quay')} ${Math.floor(i/7)+1} · ${i%7}:00`,{type:'place',target:`q${Math.floor(i/7)}-${i%7}`})),progress:{current:d.jobs.filter(j=>j.at!==null).length,total:3},status:d.jobs.filter(j=>j.at!==null).map(j=>`${text(l,'Statek','Ship')} ${Number(j.id.slice(1))+1}: ${j.at}:00–${j.at+j.duration}:00`).join(' · ')};}};
engine.gears={...legacyEngine.gears,view(d,l){const v=legacyEngine.gears.view(d,l),speed=d.factors.reduce((a,b)=>a*b,1),left=d.reverse.reduce((a,b)=>a+b,0)%2===1;v.clues=[text(l,`Dla każdego z trzech kół kliknij jeden mnożnik. Mnożniki się mnożą. Przycisk ze strzałką odwraca kierunek koła. Cel: ×${d.target}, ${d.targetReverse?'w lewo':'w prawo'}.`,`Click one multiplier for each of the three gears. Their multipliers multiply. Each arrow button reverses that gear. Goal: ×${d.target}, ${d.targetReverse?'left':'right'}.`)];v.status=text(l,`Teraz: ×${speed}, ${left?'w lewo':'w prawo'}.`,`Current: ×${speed}, ${left?'left':'right'}.`);return v;}};
engine.tides={...legacyEngine.tides,view(d,l){const v=legacyEngine.tides.view(d,l);v.clues=[text(l,'Przycisk „1 → 2” przelewa jedną jednostkę wody z komory 1 do 2. Wybieraj kierunki, aż w każdej komorze liczba przed ukośnikiem zrówna się z celem za ukośnikiem.','The “1 → 2” button moves one unit of water from chamber 1 to 2. Choose directions until each current level matches the target after its slash.')];return v;}};
engine.magnets={...legacyEngine.magnets,view(d,l){const v=legacyEngine.magnets.view(d,l),force=d.strengths.reduce((sum,n,i)=>sum+n*d.poles[i],0);v.clues=[text(l,'Klikaj magnesy, aby odwracać ich strzałki. Ustaw je tak, by wspólnie przesuwały kapsułę dokładnie o jedno pole w prawo. Potem klikaj „Wyślij impuls”, aż dotrze do zamka.','Click a magnet to reverse its arrow. Make their combined push move the capsule exactly one cell right. Then send pulses until it reaches the lock.')];v.status=text(l,force===1?'Gotowe: jeden impuls przesunie kapsułę o jedno pole w prawo.':`Obecny łączny ruch: ${Math.abs(force)} pól ${force<0?'w lewo':'w prawo'}. Potrzebujesz 1 w prawo.`,force===1?'Ready: one pulse moves the capsule one cell right.':`Current combined move: ${Math.abs(force)} cells ${force<0?'left':'right'}. You need 1 right.`);return v;}};
engine.paperFold={...legacyEngine.paperFold,view(d,l){const labels=['A','B','C','D'],expected=d.target.map((v,i)=>localizedName((v?d.back:d.front)[i],l)),current=d.folds.map((v,i)=>localizedName((v?d.back:d.front)[i],l));return{clues:[text(l,'Klikaj cztery rogi planu. Każde kliknięcie zmienia widoczny znak w danym okienku. Dopasuj każde okienko do wiadomości poniżej; kolejność A–D ma znaczenie.','Click the four corners. Each click changes the symbol shown in that window. Match all four windows to the message below; A–D order matters.'),expected.map((word,i)=>`${labels[i]}: ${word}`).join(' · ')],grid:grid(2,2,i=>({label:`${labels[i]}: ${current[i]}`,description:text(l,`Kliknij, aby pokazać: ${localizedName((d.folds[i]?d.front:d.back)[i],l)}`,`Click to show: ${localizedName((d.folds[i]?d.front:d.back)[i],l)}`),symbol:d.folds[i]?'◩':'◰',rotation:d.folds[i]*180,move:{type:'rotate',index:i}})),progress:{current:d.folds.filter((v,i)=>v===d.target[i]).length,total:4}};}};

export const ISLAND_PUZZLE_KINDS=Object.freeze(Object.keys(engine));
export function createIslandPuzzle(kind,{seed=1,variant=1,level=1,difficulty,clock=0,generatorVersion=2}={}){
 if(!engine[kind])throw new TypeError('Unknown island puzzle.');
 const p={version:1,...(generatorVersion===1?{}:{generatorVersion:2}),kind,seed:int(seed,0,4294967295)?seed:1,variant:int(variant,1,5)?variant:1,level:int(level,1,1000000)?level:1,clock:Number.isFinite(clock)&&clock>=0?clock:0,startedClock:Number.isFinite(clock)&&clock>=0?clock:0,moves:0,solved:false,hints:0,log:[]};Object.defineProperty(p,'history',{value:[],writable:true,enumerable:false,configurable:true});
 if(int(difficulty,1,1000000))p.difficulty=difficulty;
 p.data=puzzleEngine(p).make(rng((p.seed^Math.imul(p.variant,0x9e3779b9))>>>0),p);
 // A new board must contain an actual move, never a reward-only solved button.
 p.solved=puzzleEngine(p).solved(p.data);if(p.solved&&kind==='paperFold'){p.data.target[0]=1-p.data.target[0];p.solved=false;}if(p.solved&&kind==='gears'){p.data.targetReverse=1-p.data.targetReverse;p.solved=false;}return p;
}
function snapshot(p){return{data:clone(p.data),solved:p.solved,moves:p.moves,clock:p.clock};}
const MOVE_TYPES=Object.freeze(['select','place','rotate','remove','choose','inspect','navigate','submit','clear','reveal','tilt','hint','undo','tick','node','convoy','lift']);
const MOVE_FIELDS=Object.freeze(['id','target','index','value','from','to','tiltX','tiltY','seconds']);
function encodeMove(move){const row=[MOVE_TYPES.indexOf(move.type)];for(let i=0;i<MOVE_FIELDS.length;i++)if(move[MOVE_FIELDS[i]]!==undefined)row.push(i,move[MOVE_FIELDS[i]]);return row;}
function decodeMove(row){if(!Array.isArray(row))return row;if(!int(row[0],0,MOVE_TYPES.length-1)||row.length>19||row.length%2!==1)return null;const move={type:MOVE_TYPES[row[0]]};for(let i=1;i<row.length;i+=2){if(!int(row[i],0,MOVE_FIELDS.length-1))return null;move[MOVE_FIELDS[row[i]]]=row[i+1];}return move;}
function checkpointActions(p){
 if(p.generatorVersion===2&&puzzleEngine(p).checkpoint)return puzzleEngine(p).checkpoint(p.data,p);
 const d=p.data,b=createIslandPuzzle(p.kind,{seed:p.seed,variant:p.variant,level:p.level,difficulty:p.difficulty,generatorVersion:p.generatorVersion===2?2:1,clock:p.startedClock}),initial=b.data,a=[];
 const choose=(index,value)=>a.push({type:'choose',index,...(value===undefined?{}:{value})});
 const place=(id,target)=>a.push({type:'place',id,target:String(target)});
 const rotate=(index,id)=>a.push({type:'rotate',...(index===undefined?{}:{index}),...(id===undefined?{}:{id})});
 switch(p.kind){
 case'signal-line':for(const id of d.attempt.trail)a.push({type:'node',id});break;
 case'harbor-routes':for(const id of d.attempt.board.removed)a.push({type:'convoy',id});break;
 case'gull':if(d.bait!==null)choose(d.bait);if(d.key)a.push({type:'inspect',id:'key'});break;
 case'hiddenObjects':for(const index of d.inspected)a.push({type:'inspect',index});if(d.found)choose(d.target);break;
 case'parrot':for(const word of d.entered)choose(names.indexOf(word));break;
 case'crabs':for(const c of d.crabs){const blocked=new Set([...d.walls,...Array.from({length:30},(_,i)=>i).filter(i=>Math.floor(Math.floor(i/5)/2)!==Number(c.id))]);for(const index of bfs(6,5,Number(c.id)*10,c.position,blocked).slice(1))a.push({type:'navigate',id:c.id,index});}break;
 case'packing':for(const item of d.items){const before=initial.items.find(x=>x.id===item.id);if(before.rotation!==item.rotation)rotate(undefined,item.id);}for(const item of d.items)if(item.at!==null)place(item.id,item.at);break;
 case'untangle':{const positions=[...initial.positions];for(let i=0;i<positions.length;i++)if(positions[i]!==d.positions[i]){const j=positions.indexOf(d.positions[i]);place(String(i),d.positions[i]);[positions[i],positions[j]]=[positions[j],positions[i]];}break;}
 case'navigation':for(const index of d.route.slice(1))a.push({type:'navigate',index});break;
 case'scheduling':for(const job of d.jobs)if(job.at!==null)place(job.id,`q${job.quay}-${job.at}`);break;
 case'gears':d.factors.forEach((value,index)=>{if(value!==1)choose(index,value);});d.reverse.forEach((v,i)=>{if(v)rotate(i);});break;
 case'optics':d.mirrors.forEach((m,i)=>{if(m.rotation!==initial.mirrors[i].rotation)rotate(m.index);});break;
 case'tides':for(let n=0;n<6-d.levels[0];n++)a.push({type:'choose',from:0,to:1});for(let n=0;n<d.levels[2];n++)a.push({type:'choose',from:1,to:2});break;
 case'hotel':for(const guest of d.guests)if(guest.at!==null)place(guest.id,guest.at);break;
 case'magnets':{const poles=[1,1,1];if(d.position>0){d.strengths.forEach((v,i)=>{const wanted=v===4?1:-1;if(poles[i]!==wanted){rotate(i);poles[i]=wanted;}});for(let n=0;n<d.position;n++)a.push({type:'submit'});}d.poles.forEach((v,i)=>{if(v!==poles[i])rotate(i);});break;}
 case'paperFold':d.folds.forEach((v,i)=>{if(v)rotate(i);});break;
 case'invention':for(const index of d.selected)choose(index);if(d.complete)a.push({type:'submit'});break;
 case'photo':d.camera.forEach((v,index)=>{for(let n=0;n<v;n++)choose(index,1);});break;
 case'deduction':d.assignments.forEach((v,i)=>{if(v!==null)place('p'+i,v);});break;
 case'cooking':for(let n=0;n<d.served;n++){d.recipes[n].forEach((v,index)=>{for(let k=0;k<v;k++)choose(index);});a.push({type:'submit'});}d.pot.forEach((v,index)=>{for(let k=0;k<v;k++)choose(index);});break;
 case'signalsDecode':for(const value of d.entered)a.push({type:'choose',value});break;
 case'balance':for(const weight of d.weights)if(weight.plate!==null)place(weight.id,weight.plate);break;
 case'memoryTriples':for(const symbol of new Set(d.miniGame.cards.filter((_,i)=>d.miniGame.matched[i])))d.miniGame.cards.forEach((v,index)=>{if(v===symbol)a.push({type:'reveal',index});});for(const index of d.miniGame.revealed)a.push({type:'reveal',index});break;
 }
 if(typeof d.selected==='string')a.push({type:'select',id:d.selected});
 return a;
}
function checkpointFor(p,withUndo=true){return{version:1,actions:checkpointActions(p).map(encodeMove),clock:p.clock,moves:p.moves,hints:p.hints,...(withUndo&&p.history?.length?{undo:p.history.slice(-4).map(previous=>checkpointFor({...p,...previous,hints:p.hints,history:[]},false))}:{}),...(p.kind==='memoryTriples'?{hideRemaining:p.data.miniGame.hideAt===null?null:Math.max(0,Math.min(.8,p.data.miniGame.hideAt-p.clock))}:{})};}
function restoreCheckpoint(p,saved,withUndo=true){
 if(!saved||saved.version!==1||!Array.isArray(saved.actions)||saved.actions.length>(p.generatorVersion===2?512:128)||!Number.isFinite(saved.clock)||saved.clock<p.startedClock)return false;
 p.clock=saved.clock;
 for(const raw of saved.actions){const move=cleanPuzzleMove(decodeMove(raw));if(!move||!puzzleEngine(p).move(p.data,move,p))return false;}
 if(p.kind==='memoryTriples'&&p.data.miniGame.hideAt!==null){if(saved.hideRemaining===null)p.data.miniGame.hideAt=null;else if(Number.isFinite(saved.hideRemaining)&&saved.hideRemaining>=0&&saved.hideRemaining<=.8)p.data.miniGame.hideAt=p.clock+saved.hideRemaining;else return false;}
 p.solved=puzzleEngine(p).solved(p.data);p.moves=int(saved.moves)?saved.moves:saved.actions.length;p.hints=int(saved.hints,0,3)?saved.hints:0;p.history.length=0;if(withUndo&&Array.isArray(saved.undo)){for(const entry of saved.undo.slice(-4)){const previous=createIslandPuzzle(p.kind,{seed:p.seed,variant:p.variant,level:p.level,difficulty:p.difficulty,generatorVersion:p.generatorVersion===2?2:1,clock:p.startedClock});if(!restoreCheckpoint(previous,entry,false))return false;p.history.push(snapshot(previous));}}return true;
}
function replaySavedMove(p,raw){const entry=decodeMove(raw);if(!entry)return false;if(entry.type==='tick'&&Number.isFinite(entry.seconds)&&entry.seconds>=0&&entry.seconds<=2678400){advanceIslandPuzzle(p,entry.seconds);return true;}const cleaned=cleanPuzzleMove(entry);return!!cleaned&&applyIslandPuzzle(p,cleaned,{replay:true}).ok;}
function compactPuzzleLog(p){
 if(p.kind==='marbleMaze'||p.log.length<64)return;
 const take=p.log.length-32,base=createIslandPuzzle(p.kind,{seed:p.seed,variant:p.variant,level:p.level,difficulty:p.difficulty,generatorVersion:p.generatorVersion===2?2:1,clock:p.startedClock});
 if(p.checkpoint&&!restoreCheckpoint(base,p.checkpoint))throw new Error('Invalid internal puzzle checkpoint.');
 for(const entry of p.log.slice(0,take))if(!replaySavedMove(base,entry))throw new Error('Invalid internal puzzle move history.');
 p.checkpoint=checkpointFor(base);p.log=p.log.slice(take);
}
export function islandPuzzleProof(p){
 if(!p||!engine[p.kind]||!puzzleEngine(p).solved(p.data))return null;
 return{version:1,...(p.generatorVersion===2?{generatorVersion:2}:{}),kind:p.kind,seed:p.seed,variant:p.variant,level:p.level,...(p.difficulty?{difficulty:p.difficulty}:{}),startedClock:p.startedClock,clock:p.clock,moves:p.moves,hints:p.hints,log:[],...(p.kind==='marbleMaze'?{data:{miniGame:clone(p.data.miniGame)}}:{checkpoint:checkpointFor(p,false)})};
}

function cleanPuzzleMove(raw){
 if(!raw||!['select','place','rotate','remove','choose','inspect','navigate','submit','clear','reveal','tilt','hint','undo','node','convoy','lift'].includes(raw.type))return null;
 const move={type:raw.type};for(const key of ['id','target'])if(raw[key]!==undefined){if(typeof raw[key]!=='string'||raw[key].length>80)return null;move[key]=raw[key];}
 for(const key of ['index','value','from','to','tiltX','tiltY'])if(raw[key]!==undefined){if(!Number.isFinite(raw[key])||Math.abs(raw[key])>1000000)return null;move[key]=raw[key];}return move;
}
function record(p,move){if(p.kind==='marbleMaze')return;if(move.type==='undo'){p.checkpoint=checkpointFor(p);p.log=[];return;}p.log.push(encodeMove(move));compactPuzzleLog(p);}
export function applyIslandPuzzle(p,move,{replay=false}={}){
 if(!p||p.version!==1||!engine[p.kind]||!move||typeof move!=='object')return bad('Invalid puzzle move.');
 const cleaned=cleanPuzzleMove(move);if(!cleaned)return bad('Invalid puzzle move.');move=cleaned;
 if(!Array.isArray(p.history))Object.defineProperty(p,'history',{value:[],writable:true,enumerable:false,configurable:true});
 if(move.type==='hint'){if(p.hints>=3)return good('A free hint is ready.',{solved:p.solved});p.hints=Math.min(3,p.hints+1);if(!replay)record(p,move);return good('A free hint is ready.',{solved:p.solved});}
 if(move.type==='undo'){
  const prev=p.history.pop();if(!prev)return bad('There is no move to undo.');Object.assign(p,prev);if(!replay)record(p,move);return good('Move undone.',{solved:p.solved});
 }
 if(p.solved)return bad('This puzzle is already solved.');
 const before=snapshot(p);
 if(!puzzleEngine(p).move(p.data,move,p))return bad('That move does not fit the puzzle. Read the clue and try another plan.');
 p.moves++;p.solved=puzzleEngine(p).solved(p.data);p.history.push(before);if(p.history.length>32)p.history.shift();if(!replay)record(p,move);
 return good(p.solved?'Puzzle solved.':'Move made.',{solved:p.solved,changed:true});
}
export function advanceIslandPuzzle(p,seconds){
 if(!p||!engine[p.kind]||!Number.isFinite(seconds)||seconds<0||p.solved)return false;
 const from=p.clock;p.clock+=seconds;
 if(p.kind==='marbleMaze'&&seconds>2){setMiniGameTilt(p.data.miniGame,0,0);return false;}
 puzzleEngine(p).advance?.(p.data,seconds,from);p.solved=puzzleEngine(p).solved(p.data);return p.solved;
}
export function normalizeIslandPuzzle(raw){
 if(!raw||raw.version!==1||!engine[raw.kind]||!int(raw.seed,0,4294967295)||![undefined,1,2].includes(raw.generatorVersion))return null;
 const p=createIslandPuzzle(raw.kind,{seed:raw.seed,variant:raw.variant,level:raw.level,difficulty:raw.difficulty,generatorVersion:raw.generatorVersion===2?2:1,clock:Number.isFinite(raw.startedClock)&&raw.startedClock>=0?raw.startedClock:0});
 if(raw.kind==='marbleMaze'){
  const saved=raw.data?.miniGame,base=p.data.miniGame;
  if(saved&&Array.isArray(saved.balls)&&saved.balls.length===base.balls.length){
   const balls=saved.balls.map((b,i)=>{const goal=base.goals[b.goalId];const settled=b.settled===true&&goal&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&Math.hypot(b.x-goal.x,b.y-goal.y)<.01;return{...b,id:i,settled:!!settled,goalId:settled?b.goalId:null};});
   p.data.miniGame=normalizeMiniGame({...base,balls,tiltX:saved.tiltX,tiltY:saved.tiltY,physicsRemainder:saved.physicsRemainder},p.difficulty||1,p.clock);
  }
  p.clock=Number.isFinite(raw.clock)&&raw.clock>=p.clock?raw.clock:p.clock;p.moves=int(raw.moves)?raw.moves:0;p.hints=Math.min(3,Math.max(0,Number(raw.hints)||0));p.solved=engine.marbleMaze.solved(p.data);return p;
 }
 // Every saved input is validated again. Elapsed physics is restored through
 // bounded ticks, never a player-supplied "solved" or reward flag.
 if(raw.checkpoint){if(!restoreCheckpoint(p,raw.checkpoint))return null;p.checkpoint=checkpointFor(p);}
 for(const entry of(Array.isArray(raw.log)?raw.log:[]).slice(0,2048)){
  if(!replaySavedMove(p,entry))continue;
  p.log.push(encodeMove(decodeMove(entry)));
 }
 compactPuzzleLog(p);
 p.hints=Math.min(3,Math.max(p.hints,Number(raw.hints)||0));
 if(Number.isFinite(raw.clock)&&raw.clock>=p.clock){if(p.kind==='memoryTriples'&&raw.clock>p.clock)advanceIslandPuzzle(p,raw.clock-p.clock);else p.clock=raw.clock;}
 return p;
}
export function recordIslandPuzzleTick(p,seconds){
 const done=advanceIslandPuzzle(p,seconds);
 if(p?.kind==='memoryTriples'&&seconds>0){const prev=decodeMove(p.log.at(-1));if(prev?.type==='tick'&&prev.seconds+seconds<=2678400)p.log[p.log.length-1]=encodeMove({...prev,seconds:prev.seconds+seconds});else record(p,{type:'tick',seconds});}
 return done;
}
export function resetIslandPuzzle(p){return createIslandPuzzle(p.kind,{seed:p.seed,variant:p.variant,level:p.level,difficulty:p.difficulty,generatorVersion:p.generatorVersion===2?2:1,clock:p.clock});}
export function islandPuzzleSolution(p){return clone(p&&puzzleEngine(p)?.solution(p.data,p)||[]);}
export function getIslandPuzzleView(p,language='pl'){
 if(!p||!engine[p.kind])return null;const spec=puzzleById(p.kind),view=puzzleEngine(p).view(p.data,language);
 const solution=islandPuzzleSolution(p),next=solution[0];
 let hint='';if(p.hints){hint=spec?.description?.[language]||spec?.description?.pl||'';if(p.hints>=2)hint+=text(language,' Sprawdź kolejno oznaczenia i dostępne cele.',' Compare the markings and available targets.');if(p.hints>=3&&next){const candidates=[...(view.controls||[]),...(view.items||[]),...(view.targets||[]),...(view.grid?.cells||[])],match=candidates.find(x=>x.move&&Object.entries(x.move).every(([key,value])=>next[key]===value)),item=next.id?view.items?.find(x=>x.id===next.id):null;hint+=text(language,' Następny pomocny ruch: ',' A helpful next move: ')+(match?(item?`${item.label} → ${match.label}`:match.label):text(language,'porównaj oznaczenia z podanym celem; możesz bezpłatnie cofnąć ruch.','compare the markings with the stated goal; you can undo a move for free.'));}}
 return{kind:p.kind,title:spec?.title?.[language]||spec?.title?.pl||p.kind,instruction:spec?.description?.[language]||spec?.description?.pl||'',clues:[],items:[],targets:[],controls:[],objects:[],connections:[],rays:[],...view,selected:p.data.selected||null,solved:p.solved,canUndo:(p.history?.length||0)>0,moves:p.moves,hintsUsed:p.hints,hint,seed:p.seed,variant:p.variant,level:p.level,difficulty:p.difficulty,generatorVersion:p.generatorVersion===2?2:1,clock:p.clock};
}
export function validateIslandPuzzle(p){
 if(!p||!engine[p.kind])return false;
 if(p.kind==='marbleMaze'){
  const g=p.data.miniGame,base=createMiniGame('tilt',p.difficulty||1,(p.seed^Math.imul(p.variant,0x9e3779b9))>>>0,p.startedClock);
  return g.kind==='tilt'&&g.balls.length===base.balls.length&&g.goals.length===base.goals.length&&JSON.stringify(g.walls)===JSON.stringify(base.walls)&&JSON.stringify(g.goals.map(q=>[q.x,q.y]))===JSON.stringify(base.goals.map(q=>[q.x,q.y]));
 }
 const copy=createIslandPuzzle(p.kind,{seed:p.seed,variant:p.variant,level:p.level,difficulty:p.difficulty,generatorVersion:p.generatorVersion===2?2:1,clock:p.clock});
 for(const move of islandPuzzleSolution(copy)){if(copy.solved)break;if(!applyIslandPuzzle(copy,move).ok)return false;}
 return copy.solved;
}
