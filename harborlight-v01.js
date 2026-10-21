const SAVE_KEY = 'harborlight-v01-save';

const BUILDINGS = {
  lumber: {
    name: 'Obóz drwali', icon: '🌲', cost: { logs: 5, stone: 2 }, prereq: () => true,
    desc: 'Pozwala regularnie pozyskiwać kłody z lasu.'
  },
  sawmill: {
    name: 'Tartak', icon: '⚙️', cost: { logs: 6, stone: 5 }, prereq: s => s.blueprints.sawmill,
    desc: 'Przerabia 2 kłody na 2 deski.'
  },
  house: {
    name: 'Dom osadników', icon: '🏠', cost: { planks: 6, stone: 3 }, prereq: s => s.buildings.sawmill,
    desc: 'Zwiększa limit mieszkańców z 4 do 6.'
  },
  lighthouse: {
    name: 'Fundament latarni', icon: '🗼', cost: { planks: 8, stone: 8 }, prereq: s => s.buildings.house && s.items.lens,
    desc: 'Kończy pierwszy etap odbudowy i otwiera drogę do dalszej wyspy.'
  }
};

const EXPEDITIONS = [
  {
    id: 'road', title: 'Zawalony trakt', icon: '🌉', par: 10,
    desc: 'Dotrzyj do starego składu budowniczych. Krótsza trasa prowadzi przez wodę.',
    reward: { stone: 5, blueprint: 'sawmill' }, rewardText: '🪨 +5 kamienia · 📜 plan tartaku',
    unlock: () => true,
    tools: { bridge: 1, axe: 1, dynamite: 0 },
    map: [
      'S..T..',
      '.WWT..',
      '.W.TC.',
      '.W....',
      '.TTTW.',
      '...W.G'
    ]
  },
  {
    id: 'quarry', title: 'Stary kamieniołom', icon: '⛏️', par: 13,
    desc: 'Znajdź wyjście i zabierz skrytki. Możesz oszczędzić dynamit, ale droga będzie dłuższa.',
    reward: { logs: 8, stone: 4 }, rewardText: '🪵 +8 kłód · 🪨 +4 kamienia',
    unlock: s => s.buildings.lumber,
    tools: { bridge: 0, axe: 1, dynamite: 1 },
    map: [
      'S.R...',
      '.TRR..',
      '..R.C.',
      '.TT...',
      '.R.RT.',
      'C...G.'
    ]
  },
  {
    id: 'ruins', title: 'Ruiny latarni', icon: '🗝️', par: 14,
    desc: 'Odnajdź klucz, wejdź do ruin i odzyskaj fragment soczewki starej latarni.',
    reward: { logs: 8, stone: 6, lens: true }, rewardText: '🪵 +8 kłód · 🪨 +6 kamienia · 🔮 fragment soczewki',
    unlock: s => s.buildings.house,
    tools: { bridge: 1, axe: 1, dynamite: 1 },
    map: [
      'S.TW..',
      '.R.WC.',
      '.K.W..',
      '.R.D..',
      '.TT...',
      '....G.'
    ]
  }
];

const ICONS = { ground:'', water:'🌊', tree:'🌲', rock:'🪨', goal:'🏁', cache:'🎒', key:'🔑', gate:'🚪' };
const TOOL_INFO = {
  bridge: { icon:'🪵', name:'Most', obstacle:'water' },
  axe: { icon:'🪓', name:'Siekiera', obstacle:'tree' },
  dynamite: { icon:'🧨', name:'Dynamit', obstacle:'rock' }
};

function initialState(){
  return {
    resources: { logs: 8, stone: 4, planks: 0, food: 6 },
    population: 3,
    popCap: 4,
    buildings: { lumber:false, sawmill:false, house:false, lighthouse:false },
    blueprints: { sawmill:false },
    items: { lens:false },
    expeditions: {},
    lumberReady: 0,
    lastLumberTick: Date.now()
  };
}

let state = loadState();
let currentExpedition = null;
let puzzle = null;
let puzzleTimer = null;
let productionTimer = null;

const $ = id => document.getElementById(id);

function loadState(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return initialState();
    const saved = JSON.parse(raw);
    return {
      ...initialState(), ...saved,
      resources:{...initialState().resources,...saved.resources},
      buildings:{...initialState().buildings,...saved.buildings},
      blueprints:{...initialState().blueprints,...saved.blueprints},
      items:{...initialState().items,...saved.items},
      expeditions:saved.expeditions||{}
    };
  }catch{return initialState();}
}
function save(){ localStorage.setItem(SAVE_KEY,JSON.stringify(state)); }

function showView(name){
  $('islandView').hidden = name!=='island';
  $('expeditionsView').hidden = name!=='expeditions';
  $('puzzleView').hidden = name!=='puzzle';
  $('tabIsland').classList.toggle('active',name==='island');
  $('tabExpeditions').classList.toggle('active',name==='expeditions');
  if(name!=='puzzle') stopPuzzleTimer();
}

function canAfford(cost){ return Object.entries(cost).every(([k,v]) => (state.resources[k]||0)>=v); }
function spend(cost){ Object.entries(cost).forEach(([k,v])=>state.resources[k]-=v); }
function costText(cost){
  const map={logs:'🪵',stone:'🪨',planks:'🪚',food:'🍞'};
  return Object.entries(cost).map(([k,v])=>`${map[k]} ${v}`).join('  ');
}

function build(id){
  const b=BUILDINGS[id];
  if(state.buildings[id] || !b.prereq(state) || !canAfford(b.cost)) return;
  spend(b.cost);
  state.buildings[id]=true;
  if(id==='house') state.popCap=6;
  if(id==='lighthouse') state.buildings.lighthouse=true;
  save();
  renderAll();
  if(id==='lighthouse') openModal('🗼','ŚWIATŁO WRACA NA WYSPĘ','Fundament latarni jest gotowy. To koniec pierwszego prototypowego rozdziału — kolejne etapy mogą otwierać port, handel i następne wyspy.','Etap 1/1 ukończony','ZOBACZ WYSPĘ');
}

function collectLumber(){
  if(!state.buildings.lumber || state.lumberReady<=0) return;
  state.resources.logs += state.lumberReady;
  state.lumberReady=0;
  state.lastLumberTick=Date.now();
  save(); renderAll();
}

function sawPlanks(){
  if(!state.buildings.sawmill || state.resources.logs<2) return;
  state.resources.logs-=2; state.resources.planks+=2;
  save(); renderAll();
}

function updateProduction(){
  if(!state.buildings.lumber) return;
  const now=Date.now();
  const interval=5000;
  const elapsed=now-state.lastLumberTick;
  const gained=Math.floor(elapsed/interval);
  if(gained>0){
    state.lumberReady=Math.min(6,state.lumberReady+gained);
    state.lastLumberTick += gained*interval;
    save();
    renderResources(); renderEconomy();
  }
}

function renderResources(){
  $('resLogs').textContent=state.resources.logs;
  $('resStone').textContent=state.resources.stone;
  $('resPlanks').textContent=state.resources.planks;
  $('resFood').textContent=state.resources.food;
  $('resPop').textContent=`${state.population} / ${state.popCap}`;
  $('beaconStage').textContent=state.buildings.lighthouse?'1 / 1':'0 / 1';
}

function renderIsland(){
  const plotMap={lumber:'plotLumber',sawmill:'plotSawmill',house:'plotHouse'};
  Object.entries(plotMap).forEach(([id,elId])=>{
    const el=$(elId); const plot=document.querySelector(`[data-building="${id}"]`);
    if(state.buildings[id]){el.textContent='zbudowano';plot.classList.add('built');plot.classList.remove('locked');}
    else{plot.classList.remove('built'); const unlocked=BUILDINGS[id].prereq(state); plot.classList.toggle('locked',!unlocked); el.textContent=unlocked?'gotowe do budowy':'zablokowane';}
  });
  const lp=document.querySelector('[data-building="lighthouse"]');
  lp.classList.toggle('built',state.buildings.lighthouse);
  lp.classList.toggle('locked',!BUILDINGS.lighthouse.prereq(state) && !state.buildings.lighthouse);
  $('plotLighthouse').textContent=state.buildings.lighthouse?'fundament odbudowany':state.items.lens?'soczewka odnaleziona':'ruina';

  ['lumber','sawmill','house','lighthouse'].forEach(id=>{
    const target=id==='lighthouse'?'chainBeacon':id==='lumber'?'chainLumber':id==='sawmill'?'chainSawmill':'chainHouse';
    $(target).classList.toggle('done',!!state.buildings[id]);
  });

  const completed=[state.buildings.lumber,state.buildings.sawmill,state.buildings.house,state.items.lens,state.buildings.lighthouse].filter(Boolean).length;
  $('goalProgress').style.width=`${completed/5*100}%`;
  if(state.buildings.lighthouse){$('goalTitle').textContent='Pierwszy etap ukończony';$('goalText').textContent='Wyspa ma podstawową gospodarkę, a latarnia znów zaczyna żyć.';}
  else if(!state.buildings.lumber){$('nextHint').textContent='Zbuduj obóz drwali.';}
  else if(!state.blueprints.sawmill){$('nextHint').textContent='Ekspedycja „Zawalony trakt” skrywa plan tartaku.';}
  else if(!state.buildings.sawmill){$('nextHint').textContent='Zbuduj tartak i zacznij produkować deski.';}
  else if(!state.buildings.house){$('nextHint').textContent='Wyprodukuj deski i zbuduj dom.';}
  else if(!state.items.lens){$('nextHint').textContent='Wyrusz do ruin latarni po fragment soczewki.';}
  else{$('nextHint').textContent='Masz wszystko. Odbuduj fundament latarni.';}
}

function renderEconomy(){
  const cards=$('buildCards'); cards.innerHTML='';
  ['lumber','sawmill','house','lighthouse'].forEach(id=>{
    const b=BUILDINGS[id];
    const built=state.buildings[id]; const unlocked=b.prereq(state);
    const card=document.createElement('div'); card.className='build-card';
    let reason='';
    if(!unlocked && id==='sawmill') reason='Plan znajdziesz na ekspedycji „Zawalony trakt”.';
    if(!unlocked && id==='house') reason='Najpierw zbuduj tartak.';
    if(!unlocked && id==='lighthouse') reason=state.buildings.house?'Brakuje fragmentu soczewki z ruin latarni.':'Najpierw zbuduj dom i odnajdź soczewkę.';
    card.innerHTML=`<div class="row"><h3>${b.icon} ${b.name}</h3><span class="status-pill">${built?'GOTOWE':unlocked?'DOSTĘPNE':'ZABLOKOWANE'}</span></div><p>${b.desc}</p><div class="cost">${built?'':costText(b.cost)} ${reason?`<br>${reason}`:''}</div>`;
    if(!built){
      const btn=document.createElement('button'); btn.textContent='BUDUJ'; btn.disabled=!unlocked||!canAfford(b.cost); btn.addEventListener('click',()=>build(id)); card.appendChild(btn);
    }
    cards.appendChild(card);
  });

  const prod=$('productionPanel'); prod.innerHTML='';
  if(state.buildings.lumber){
    const c=document.createElement('div'); c.className='production-card';
    c.innerHTML=`<b>🌲 Drwal pracuje</b><small>Co 5 s powstaje 1 kłoda. Magazyn przy drwalu: ${state.lumberReady}/6.</small>`;
    const btn=document.createElement('button');btn.textContent=`ODBIERZ +${state.lumberReady} 🪵`;btn.disabled=state.lumberReady===0;btn.addEventListener('click',collectLumber);c.appendChild(btn);prod.appendChild(c);
  }
  if(state.buildings.sawmill){
    const c=document.createElement('div'); c.className='production-card';
    c.innerHTML='<b>⚙️ Tartak</b><small>2 kłody → 2 deski. To pierwszy prawdziwy łańcuch produkcyjny.</small>';
    const btn=document.createElement('button');btn.textContent='PRZERÓB 2 🪵 → 2 🪚';btn.disabled=state.resources.logs<2;btn.addEventListener('click',sawPlanks);c.appendChild(btn);prod.appendChild(c);
  }
}

function renderExpeditions(){
  const wrap=$('expeditionCards'); wrap.innerHTML='';
  let anyAvailable=false;
  EXPEDITIONS.forEach(exp=>{
    const unlocked=exp.unlock(state); const done=!!state.expeditions[exp.id]?.completed;
    if(unlocked&&!done) anyAvailable=true;
    const card=document.createElement('article');card.className='expedition-card'+(unlocked?'':' locked');
    const best=state.expeditions[exp.id]?.bestScore;
    card.innerHTML=`<div class="expedition-icon">${exp.icon}</div><h3>${exp.title}</h3><p>${exp.desc}</p><div class="reward-box"><b>NAGRODA:</b><br>${exp.rewardText}</div><div class="best-score">${best?`Najlepszy wynik: ${best}`:done?'Ukończono':'Jeszcze nie ukończono'}</div>`;
    const btn=document.createElement('button');btn.textContent=unlocked?(done?'ZAGRAJ PONOWNIE':'WYRUSZ'):'ZABLOKOWANE';btn.disabled=!unlocked;btn.addEventListener('click',()=>startExpedition(exp.id));card.appendChild(btn);wrap.appendChild(card);
  });
  $('expBadge').hidden=!anyAvailable;
}

function charToTile(ch){
  if(ch==='W')return'water';if(ch==='T')return'tree';if(ch==='R')return'rock';if(ch==='G')return'goal';if(ch==='C')return'cache';if(ch==='K')return'key';if(ch==='D')return'gate';return'ground';
}
function findStart(map){for(let r=0;r<map.length;r++){const c=map[r].indexOf('S');if(c>=0)return[r,c];}return[0,0];}

function startExpedition(id){
  const exp=EXPEDITIONS.find(e=>e.id===id); if(!exp||!exp.unlock(state))return;
  currentExpedition=exp;
  const [sr,sc]=findStart(exp.map);
  puzzle={
    row:sr,col:sc,steps:0,toolsUsed:0,caches:0,key:false,
    tools:{...exp.tools}, cleared:new Set(), collected:new Set(), startedAt:Date.now(), elapsed:0, over:false
  };
  $('puzzleTitle').textContent=exp.title; $('puzzlePar').textContent=exp.par;
  showView('puzzle'); renderPuzzle(); startPuzzleTimer();
}
function stopPuzzleTimer(){if(puzzleTimer){clearInterval(puzzleTimer);puzzleTimer=null;}}
function startPuzzleTimer(){stopPuzzleTimer();puzzleTimer=setInterval(()=>{if(!puzzle||puzzle.over)return;puzzle.elapsed=Math.floor((Date.now()-puzzle.startedAt)/1000);renderPuzzleStats();},250);}
function tileAt(r,c){
  const ch=currentExpedition.map[r]?.[c];
  if(ch==null)return null;
  const key=`${r},${c}`;
  if(puzzle.cleared.has(key))return'ground';
  if(puzzle.collected.has(key) && ['C','K'].includes(ch))return'ground';
  return charToTile(ch);
}
function isAdjacent(r,c){return Math.abs(r-puzzle.row)+Math.abs(c-puzzle.col)===1;}
function toolFor(tile){return Object.entries(TOOL_INFO).find(([,v])=>v.obstacle===tile)?.[0]||null;}
function attemptMove(r,c){
  if(!puzzle||puzzle.over||!isAdjacent(r,c))return;
  const tile=tileAt(r,c); if(!tile)return;
  if(tile==='gate'&&!puzzle.key){flashMessage('Najpierw znajdź 🔑 klucz.');return;}
  if(['water','tree','rock'].includes(tile)){
    const tool=toolFor(tile);
    if(!tool||puzzle.tools[tool]<=0){flashMessage(`Brakuje narzędzia: ${tool?TOOL_INFO[tool].name:'?'}.`);return;}
    puzzle.tools[tool]--; puzzle.toolsUsed++; puzzle.cleared.add(`${r},${c}`);
  }
  puzzle.row=r;puzzle.col=c;puzzle.steps++;
  const original=currentExpedition.map[r][c];
  if(original==='C'&&!puzzle.collected.has(`${r},${c}`)){puzzle.collected.add(`${r},${c}`);puzzle.caches++;}
  if(original==='K'&&!puzzle.collected.has(`${r},${c}`)){puzzle.collected.add(`${r},${c}`);puzzle.key=true;}
  renderPuzzle();
  if(original==='G') completeExpedition();
}
function flashMessage(text){
  const help=document.querySelector('.puzzle-help');const old=help.textContent;help.textContent=text;help.style.color='#f3c969';setTimeout(()=>{help.textContent=old;help.style.color='';},1200);
}
function renderPuzzle(){
  const board=$('puzzleBoard');board.style.setProperty('--cols',currentExpedition.map[0].length);board.innerHTML='';
  currentExpedition.map.forEach((row,r)=>[...row].forEach((ch,c)=>{
    const tile=tileAt(r,c);const cell=document.createElement('button');cell.type='button';cell.className=`cell ${tile}`;
    if(puzzle.cleared.has(`${r},${c}`))cell.classList.add('cleared');
    if(isAdjacent(r,c))cell.classList.add('reachable');
    if(tile==='cache')cell.classList.add('cache');
    let icon=ICONS[tile]||'';
    if(r===puzzle.row&&c===puzzle.col){icon='🧭';cell.classList.add('player');}
    cell.textContent=icon; cell.addEventListener('click',()=>attemptMove(r,c));board.appendChild(cell);
  }));
  const tools=$('toolList');tools.innerHTML='';
  Object.entries(puzzle.tools).forEach(([id,count])=>{const info=TOOL_INFO[id];const d=document.createElement('div');d.className='tool';d.innerHTML=`<span>${info.icon}</span><b>${info.name}</b><strong>${count}</strong>`;tools.appendChild(d);});
  renderPuzzleStats();
}
function renderPuzzleStats(){
  const sec=puzzle?.elapsed||0;$('puzzleTime').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;$('puzzleSteps').textContent=puzzle?.steps||0;
  const ing=Math.max(0,100-(puzzle?.toolsUsed||0)*15-Math.max(0,(puzzle?.steps||0)-(currentExpedition?.par||0))*4+(puzzle?.caches||0)*10);$('puzzleIngenuity').textContent=ing;
}
function completeExpedition(){
  if(puzzle.over)return;puzzle.over=true;stopPuzzleTimer();
  puzzle.elapsed=Math.floor((Date.now()-puzzle.startedAt)/1000);
  const ingenuity=Math.max(0,100-puzzle.toolsUsed*15-Math.max(0,puzzle.steps-currentExpedition.par)*4+puzzle.caches*10);
  const score=Math.max(100,2000-puzzle.steps*45-puzzle.toolsUsed*120-puzzle.elapsed*4+puzzle.caches*250);
  const record=state.expeditions[currentExpedition.id]||{};const first=!record.completed;
  if(first){
    const r=currentExpedition.reward;
    if(r.logs)state.resources.logs+=r.logs;if(r.stone)state.resources.stone+=r.stone;if(r.blueprint)state.blueprints[r.blueprint]=true;if(r.lens)state.items.lens=true;
  }else{
    state.resources.logs+=1;
  }
  state.expeditions[currentExpedition.id]={completed:true,bestScore:Math.max(score,record.bestScore||0)};save();renderAll();
  const reward=first?currentExpedition.rewardText:'🪵 +1 kłoda za powtórną wyprawę';
  openModal('🧭','EKSPEDYCJA UKOŃCZONA',`${reward}. Teraz wróć na wyspę — nagroda od razu wpływa na to, co możesz zbudować.`,`Wynik ${score} · czas ${puzzle.elapsed}s · kroki ${puzzle.steps} · spryt ${ingenuity}`,'WRÓĆ NA WYSPĘ',()=>showView('island'));
}
function restartPuzzle(){if(currentExpedition)startExpedition(currentExpedition.id);}

let modalAction=null;
function openModal(icon,title,text,score,button='OK',action=null){$('modalIcon').textContent=icon;$('modalTitle').textContent=title;$('modalText').textContent=text;$('modalScore').textContent=score||'';$('modalButton').textContent=button;modalAction=action;$('modal').hidden=false;}
function closeModal(){$('modal').hidden=true;if(modalAction){const a=modalAction;modalAction=null;a();}}

function renderAll(){renderResources();renderIsland();renderEconomy();renderExpeditions();}

$('tabIsland').addEventListener('click',()=>showView('island'));
$('tabExpeditions').addEventListener('click',()=>{renderExpeditions();showView('expeditions');});
$('backToExpeditions').addEventListener('click',()=>{renderExpeditions();showView('expeditions');});
$('restartPuzzle').addEventListener('click',restartPuzzle);
$('modalButton').addEventListener('click',closeModal);
$('resetAll').addEventListener('click',()=>{if(confirm('Usunąć zapis prototypu i zacząć od początku?')){localStorage.removeItem(SAVE_KEY);state=initialState();save();renderAll();showView('island');}});

document.querySelectorAll('.plot[data-building]').forEach(plot=>plot.addEventListener('click',()=>{
  const id=plot.dataset.building;if(id==='camp'||state.buildings[id])return;
  const b=BUILDINGS[id];
  if(!b.prereq(state)){renderEconomy();return;}
  build(id);
}));

renderAll();showView('island');
productionTimer=setInterval(updateProduction,1000);
