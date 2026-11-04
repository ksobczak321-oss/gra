// Deterministic, saved island puzzles. Player commands describe moves only.
// Generators start from a valid construction; completion is recomputed from the
// board. Free hints, reset and bounded undo never require money or an ad.
import { createMiniGame, revealMiniGameCard, setMiniGameTilt, advanceMiniGame, normalizeMiniGame } from './harborlight-v1-minigames.js?v=frontend-v31-2';
import { ISLAND_PUZZLE_CATALOG, puzzleById } from './harborlight-v1-story-catalog.js?v=frontend-v31-2';
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
 make(r,p){return{miniGame:createMiniGame('triples',1+rint(r,3),(p.seed^Math.imul(p.variant,0x9e3779b9))>>>0,p.clock)};},
 move(d,m,p){return m.type==='reveal'&&revealMiniGameCard(d.miniGame,m.index,p.clock);},solved:d=>d.miniGame.solved,
 advance(d,seconds,from){advanceMiniGame(d.miniGame,seconds,from);},
 view(d,l){return{clues:[text(l,'Odzyskuj fragmenty dokumentu, znajdując trójki. Ta plansza nie pobiera ani nie wypłaca monet osobnej ekspedycji.','Recover document fragments by matching triples. This board does not charge or award a separate expedition pot.')],miniGame:d.miniGame,progress:{current:d.miniGame.matched.filter(Boolean).length,total:d.miniGame.cards.length}};},
 solution:d=>[...new Set(d.miniGame.cards)].flatMap(symbol=>d.miniGame.cards.flatMap((v,index)=>v===symbol&&!d.miniGame.matched[index]?[{type:'reveal',index}]:[]))
};
engine.marbleMaze={
 make(r,p){return{miniGame:createMiniGame('tilt',1,(p.seed^Math.imul(p.variant,0x9e3779b9))>>>0,p.clock)};},
 move(d,m){return m.type==='tilt'&&setMiniGameTilt(d.miniGame,m.tiltX,m.tiltY);},solved:d=>d.miniGame.solved,
 advance(d,seconds,from){advanceMiniGame(d.miniGame,seconds,from);},
 view(d,l){return{clues:[text(l,'Przechylaj planszę i doprowadź kulę do celu. Zatrzymanie i wznowienie nie gubią postępu; tutaj nie ma limitu czasu.','Tilt the board and guide the marble to the goal. Pause and resume preserve progress; this story board has no deadline.')],miniGame:d.miniGame,progress:{current:d.miniGame.balls.filter(b=>b.settled).length,total:d.miniGame.balls.length}};},
 solution:()=>[]
};
export const ISLAND_PUZZLE_KINDS=Object.freeze(Object.keys(engine));
export function createIslandPuzzle(kind,{seed=1,variant=1,level=1,clock=0}={}){
 if(!engine[kind])throw new TypeError('Unknown island puzzle.');
 const p={version:1,kind,seed:int(seed,0,4294967295)?seed:1,variant:int(variant,1,5)?variant:1,level:int(level,1,100)?level:1,clock:Number.isFinite(clock)&&clock>=0?clock:0,startedClock:Number.isFinite(clock)&&clock>=0?clock:0,moves:0,solved:false,hints:0,log:[]};Object.defineProperty(p,'history',{value:[],writable:true,enumerable:false,configurable:true});
 p.data=engine[kind].make(rng((p.seed^Math.imul(p.variant,0x9e3779b9))>>>0),p);
 // A new board must contain an actual move, never a reward-only solved button.
 p.solved=engine[kind].solved(p.data);if(p.solved&&kind==='paperFold'){p.data.target[0]=1-p.data.target[0];p.solved=false;}if(p.solved&&kind==='gears'){p.data.targetReverse=1-p.data.targetReverse;p.solved=false;}return p;
}
function snapshot(p){return{data:clone(p.data),solved:p.solved,moves:p.moves,clock:p.clock};}
const MOVE_TYPES=Object.freeze(['select','place','rotate','remove','choose','inspect','navigate','submit','clear','reveal','tilt','hint','undo','tick']);
const MOVE_FIELDS=Object.freeze(['id','target','index','value','from','to','tiltX','tiltY','seconds']);
function encodeMove(move){const row=[MOVE_TYPES.indexOf(move.type)];for(let i=0;i<MOVE_FIELDS.length;i++)if(move[MOVE_FIELDS[i]]!==undefined)row.push(i,move[MOVE_FIELDS[i]]);return row;}
function decodeMove(row){if(!Array.isArray(row))return row;if(!int(row[0],0,MOVE_TYPES.length-1)||row.length>19||row.length%2!==1)return null;const move={type:MOVE_TYPES[row[0]]};for(let i=1;i<row.length;i+=2){if(!int(row[i],0,MOVE_FIELDS.length-1))return null;move[MOVE_FIELDS[row[i]]]=row[i+1];}return move;}
function checkpointActions(p){
 const d=p.data,b=createIslandPuzzle(p.kind,{seed:p.seed,variant:p.variant,level:p.level,clock:p.startedClock}),initial=b.data,a=[];
 const choose=(index,value)=>a.push({type:'choose',index,...(value===undefined?{}:{value})});
 const place=(id,target)=>a.push({type:'place',id,target:String(target)});
 const rotate=(index,id)=>a.push({type:'rotate',...(index===undefined?{}:{index}),...(id===undefined?{}:{id})});
 switch(p.kind){
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
 if(!saved||saved.version!==1||!Array.isArray(saved.actions)||saved.actions.length>128||!Number.isFinite(saved.clock)||saved.clock<p.startedClock)return false;
 p.clock=saved.clock;
 for(const raw of saved.actions){const move=cleanPuzzleMove(decodeMove(raw));if(!move||!engine[p.kind].move(p.data,move,p))return false;}
 if(p.kind==='memoryTriples'&&p.data.miniGame.hideAt!==null){if(saved.hideRemaining===null)p.data.miniGame.hideAt=null;else if(Number.isFinite(saved.hideRemaining)&&saved.hideRemaining>=0&&saved.hideRemaining<=.8)p.data.miniGame.hideAt=p.clock+saved.hideRemaining;else return false;}
 p.solved=engine[p.kind].solved(p.data);p.moves=int(saved.moves)?saved.moves:saved.actions.length;p.hints=int(saved.hints,0,3)?saved.hints:0;p.history.length=0;if(withUndo&&Array.isArray(saved.undo)){for(const entry of saved.undo.slice(-4)){const previous=createIslandPuzzle(p.kind,{seed:p.seed,variant:p.variant,level:p.level,clock:p.startedClock});if(!restoreCheckpoint(previous,entry,false))return false;p.history.push(snapshot(previous));}}return true;
}
function replaySavedMove(p,raw){const entry=decodeMove(raw);if(!entry)return false;if(entry.type==='tick'&&Number.isFinite(entry.seconds)&&entry.seconds>=0&&entry.seconds<=2678400){advanceIslandPuzzle(p,entry.seconds);return true;}const cleaned=cleanPuzzleMove(entry);return!!cleaned&&applyIslandPuzzle(p,cleaned,{replay:true}).ok;}
function compactPuzzleLog(p){
 if(p.kind==='marbleMaze'||p.log.length<64)return;
 const take=p.log.length-32,base=createIslandPuzzle(p.kind,{seed:p.seed,variant:p.variant,level:p.level,clock:p.startedClock});
 if(p.checkpoint&&!restoreCheckpoint(base,p.checkpoint))throw new Error('Invalid internal puzzle checkpoint.');
 for(const entry of p.log.slice(0,take))if(!replaySavedMove(base,entry))throw new Error('Invalid internal puzzle move history.');
 p.checkpoint=checkpointFor(base);p.log=p.log.slice(take);
}
export function islandPuzzleProof(p){
 if(!p||!engine[p.kind]||!engine[p.kind].solved(p.data))return null;
 return{version:1,kind:p.kind,seed:p.seed,variant:p.variant,level:p.level,startedClock:p.startedClock,clock:p.clock,moves:p.moves,hints:p.hints,log:[],...(p.kind==='marbleMaze'?{data:{miniGame:clone(p.data.miniGame)}}:{checkpoint:checkpointFor(p,false)})};
}

function cleanPuzzleMove(raw){
 if(!raw||!['select','place','rotate','remove','choose','inspect','navigate','submit','clear','reveal','tilt','hint','undo'].includes(raw.type))return null;
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
 if(!engine[p.kind].move(p.data,move,p))return bad('That move does not fit the puzzle. Read the clue and try another plan.');
 p.moves++;p.solved=engine[p.kind].solved(p.data);p.history.push(before);if(p.history.length>32)p.history.shift();if(!replay)record(p,move);
 return good(p.solved?'Puzzle solved.':'Move made.',{solved:p.solved,changed:true});
}
export function advanceIslandPuzzle(p,seconds){
 if(!p||!engine[p.kind]||!Number.isFinite(seconds)||seconds<0||p.solved)return false;
 const from=p.clock;p.clock+=seconds;
 if(p.kind==='marbleMaze'&&seconds>2){setMiniGameTilt(p.data.miniGame,0,0);return false;}
 engine[p.kind].advance?.(p.data,seconds,from);p.solved=engine[p.kind].solved(p.data);return p.solved;
}
export function normalizeIslandPuzzle(raw){
 if(!raw||raw.version!==1||!engine[raw.kind]||!int(raw.seed,0,4294967295))return null;
 const p=createIslandPuzzle(raw.kind,{seed:raw.seed,variant:raw.variant,level:raw.level,clock:Number.isFinite(raw.startedClock)&&raw.startedClock>=0?raw.startedClock:0});
 if(raw.kind==='marbleMaze'){
  const saved=raw.data?.miniGame,base=p.data.miniGame;
  if(saved&&Array.isArray(saved.balls)&&saved.balls.length===base.balls.length){
   const balls=saved.balls.map((b,i)=>{const goal=base.goals[b.goalId];const settled=b.settled===true&&goal&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&Math.hypot(b.x-goal.x,b.y-goal.y)<.01;return{...b,id:i,settled:!!settled,goalId:settled?b.goalId:null};});
   p.data.miniGame=normalizeMiniGame({...base,balls,tiltX:saved.tiltX,tiltY:saved.tiltY,physicsRemainder:saved.physicsRemainder},1,p.clock);
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
export function resetIslandPuzzle(p){return createIslandPuzzle(p.kind,{seed:p.seed,variant:p.variant,level:p.level,clock:p.clock});}
export function islandPuzzleSolution(p){return clone(p&&engine[p.kind]?.solution(p.data,p)||[]);}
export function getIslandPuzzleView(p,language='pl'){
 if(!p||!engine[p.kind])return null;const spec=puzzleById(p.kind),view=engine[p.kind].view(p.data,language);
 const solution=islandPuzzleSolution(p),next=solution[0];
 let hint='';if(p.hints){hint=spec?.description?.[language]||spec?.description?.pl||'';if(p.hints>=2)hint+=text(language,' Sprawdź kolejno oznaczenia i dostępne cele.',' Compare the markings and available targets.');if(p.hints>=3&&next){const candidates=[...(view.controls||[]),...(view.items||[]),...(view.targets||[]),...(view.grid?.cells||[])],match=candidates.find(x=>x.move&&Object.entries(x.move).every(([key,value])=>next[key]===value)),item=next.id?view.items?.find(x=>x.id===next.id):null;hint+=text(language,' Następny pomocny ruch: ',' A helpful next move: ')+(match?(item?`${item.label} → ${match.label}`:match.label):text(language,'porównaj oznaczenia z podanym celem; możesz bezpłatnie cofnąć ruch.','compare the markings with the stated goal; you can undo a move for free.'));}}
 return{kind:p.kind,title:spec?.title?.[language]||spec?.title?.pl||p.kind,instruction:spec?.description?.[language]||spec?.description?.pl||'',clues:[],items:[],targets:[],controls:[],objects:[],connections:[],rays:[],...view,selected:p.data.selected||null,solved:p.solved,canUndo:(p.history?.length||0)>0,moves:p.moves,hintsUsed:p.hints,hint,seed:p.seed,variant:p.variant,level:p.level,clock:p.clock};
}
export function validateIslandPuzzle(p){
 if(!p||!engine[p.kind])return false;
 if(p.kind==='marbleMaze'){
  const g=p.data.miniGame;if(g.kind!=='tilt'||g.balls.length!==1||g.goals.length!==1)return false;
  const xy=i=>({x:24+(i%3+.5)*184,y:24+(Math.floor(i/3)+.5)*184}),q=[0],seen=new Set([0]);
  for(const i of q)for(const j of[i-3,i+3,i-1,i+1]){if(j<0||j>8||seen.has(j)||Math.abs(Math.floor(i/3)-Math.floor(j/3))+Math.abs(i%3-j%3)!==1)continue;const a=xy(i),b=xy(j),x=(a.x+b.x)/2,y=(a.y+b.y)/2;if(!g.walls.some(w=>x>=w.x&&x<=w.x+w.width&&y>=w.y&&y<=w.y+w.height)){seen.add(j);q.push(j);}}
  const goal=g.goals[0],cell=Math.floor((goal.y-24)/184)*3+Math.floor((goal.x-24)/184);return seen.size===9&&seen.has(cell);
 }
 const copy=createIslandPuzzle(p.kind,{seed:p.seed,variant:p.variant,level:p.level,clock:p.clock});
 for(const move of islandPuzzleSolution(copy)){if(copy.solved)break;if(!applyIslandPuzzle(copy,move).ok)return false;}
 return copy.solved;
}
