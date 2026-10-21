const FLOORS = [
  { floor: 4, pets: [{id:'p1', icon:'🐰', size:1, name:'Mika'}] },
  { floor: 3, pets: [{id:'p2', icon:'🐶', size:2, name:'Bruno'}, {id:'p3', icon:'🐱', size:1, name:'Luna'}] },
  { floor: 2, pets: [{id:'p4', icon:'🐱', size:1, name:'Milo'}, {id:'p5', icon:'🐰', size:1, name:'Bibi'}] },
  { floor: 1, pets: [{id:'p6', icon:'🐶', size:2, name:'Rex'}, {id:'p7', icon:'🐱', size:1, name:'Nala'}] },
  { floor: 0, pets: [] }
];

const CAPACITY = 3;
const WATER_STEP = 0.46;
const MAX_TURNS = 12;

let state;
let timer;

const floorsEl = document.getElementById('floors');
const floorButtonsEl = document.getElementById('floorButtons');
const elevatorEl = document.getElementById('elevator');
const cargoEl = document.getElementById('cargo');
const capacityEl = document.getElementById('capacity');
const waterEl = document.getElementById('water');
const rescuedCountEl = document.getElementById('rescuedCount');
const tipEl = document.getElementById('tip');
const statusTitleEl = document.getElementById('statusTitle');
const statusTextEl = document.getElementById('statusText');
const overlayEl = document.getElementById('overlay');
const resultIconEl = document.getElementById('resultIcon');
const resultTitleEl = document.getElementById('resultTitle');
const resultTextEl = document.getElementById('resultText');

function cloneFloors(){
  return FLOORS.map(f => ({ floor:f.floor, pets:f.pets.map(p=>({...p})) }));
}

function resetGame(){
  clearInterval(timer);
  state = {
    floors: cloneFloors(),
    liftFloor: 0,
    cargo: [],
    rescued: [],
    water: 0,
    turns: 0,
    over: false
  };
  overlayEl.hidden = true;
  render();
  timer = setInterval(() => {
    if (state.over) return;
    state.water += 0.018;
    checkFloodedPets();
    renderWater();
    if (state.water >= 4.75) lose('Budynek został całkowicie zalany.');
  }, 400);
}

function floorByNumber(n){ return state.floors.find(f=>f.floor===n); }
function usedCapacity(){ return state.cargo.reduce((s,p)=>s+p.size,0); }

function moveLift(target){
  if(state.over || target===state.liftFloor) return;
  state.liftFloor = target;
  state.turns++;
  state.water += WATER_STEP;
  if(navigator.vibrate) navigator.vibrate(18);
  if(target===0) unloadRescued();
  checkFloodedPets();
  render();
  if(!state.over && state.turns >= MAX_TURNS && state.rescued.length < 7){
    statusTitleEl.textContent='ZA DUŻO KURSÓW';
    statusTextEl.textContent='Trasa była nieefektywna. Woda przyspiesza!';
  }
}

function togglePet(floorNumber, petId){
  if(state.over || state.liftFloor !== floorNumber || floorNumber===0) return;
  const floor = floorByNumber(floorNumber);
  const inCargoIndex = state.cargo.findIndex(p=>p.id===petId);
  if(inCargoIndex>=0){
    const [pet] = state.cargo.splice(inCargoIndex,1);
    floor.pets.push(pet);
    render();
    return;
  }
  const petIndex = floor.pets.findIndex(p=>p.id===petId);
  if(petIndex<0) return;
  const pet = floor.pets[petIndex];
  if(usedCapacity()+pet.size > CAPACITY){
    statusTitleEl.textContent='BRAK MIEJSCA!';
    statusTextEl.textContent=`${pet.icon} ${pet.name} potrzebuje ${pet.size} ${pet.size===1?'miejsca':'miejsc'}.`;
    if(navigator.vibrate) navigator.vibrate([30,20,30]);
    return;
  }
  floor.pets.splice(petIndex,1);
  state.cargo.push(pet);
  render();
}

function unloadRescued(){
  if(!state.cargo.length) return;
  state.rescued.push(...state.cargo.splice(0));
  if(navigator.vibrate) navigator.vibrate([25,20,50]);
  if(state.rescued.length===7) win();
}

function checkFloodedPets(){
  for(const floor of state.floors){
    if(floor.floor===0) continue;
    if(state.water >= floor.floor && floor.pets.length){
      const names = floor.pets.map(p=>`${p.icon} ${p.name}`).join(', ');
      lose(`${names} nie zdążyli uciec z piętra ${floor.floor}.`);
      return;
    }
  }
}

function render(){
  renderFloors();
  renderButtons();
  renderLift();
  renderWater();
  rescuedCountEl.textContent=`${state.rescued.length} / 7`;
  if(!state.over){
    const floor = floorByNumber(state.liftFloor);
    if(state.liftFloor===0){
      statusTitleEl.textContent = state.cargo.length ? 'ZWIERZAKI W HELIKOPTERZE!' : 'DACH 🚁';
      statusTextEl.textContent='Wybierz piętro. Woda podnosi się po każdym kursie.';
    } else if(floor.pets.length){
      statusTitleEl.textContent=`PIĘTRO ${state.liftFloor}`;
      statusTextEl.textContent='Dotknij zwierzaka, żeby zabrać go do windy.';
    } else {
      statusTitleEl.textContent='PUSTO';
      statusTextEl.textContent='Wracaj na dach albo jedź po kolejne zwierzaki.';
    }
  }
  tipEl.textContent = state.turns===0 ? '👇 Jedź najpierw na piętro 1.' : usedCapacity()===CAPACITY ? '🚁 Winda pełna — wracaj na dach!' : 'Każdy kurs podnosi wodę.';
}

function renderFloors(){
  floorsEl.innerHTML='';
  for(let n=4;n>=0;n--){
    const floor = floorByNumber(n);
    const row = document.createElement('div');
    row.className='floor';
    row.dataset.floor=n;
    if(state.water>=n && n>0) row.classList.add('flooded');
    const label=document.createElement('span');
    label.className='floor-label';
    label.textContent=n===0?'DACH 🚁':`${n}. PIĘTRO`;
    const pets=document.createElement('div');
    pets.className='pets';
    floor.pets.forEach(p=>{
      const b=document.createElement('button');
      b.className='pet';
      b.innerHTML=`<span>${p.icon}</span><small>${p.name}</small><em>${p.size}</em>`;
      b.title=`${p.name}: zajmuje ${p.size} miejsce/a`;
      b.addEventListener('click',()=>togglePet(n,p.id));
      pets.appendChild(b);
    });
    row.append(label,pets);
    floorsEl.appendChild(row);
  }
}

function renderButtons(){
  floorButtonsEl.innerHTML='';
  [4,3,2,1,0].forEach(n=>{
    const b=document.createElement('button');
    b.textContent=n===0?'🚁 DACH':`${n}`;
    b.className = n===state.liftFloor ? 'active' : '';
    b.addEventListener('click',()=>moveLift(n));
    floorButtonsEl.appendChild(b);
  });
}

function renderLift(){
  const pct = 6 + state.liftFloor*22.2;
  elevatorEl.style.bottom=`${pct}%`;
  cargoEl.innerHTML='';
  state.cargo.forEach(p=>{
    const s=document.createElement('button');
    s.className='cargo-pet';
    s.textContent=p.icon;
    s.title=`Wysadź ${p.name}`;
    s.addEventListener('click',()=>togglePet(state.liftFloor,p.id));
    cargoEl.appendChild(s);
  });
  capacityEl.textContent=`${usedCapacity()} / ${CAPACITY}`;
}

function renderWater(){
  const pct=Math.min(100,(state.water/4.8)*100);
  waterEl.style.height=`${pct}%`;
}

function win(){
  state.over=true;
  clearInterval(timer);
  resultIconEl.textContent='🚁🐶🐱🐰';
  resultTitleEl.textContent='WSZYSTKIE BEZPIECZNE!';
  resultTextEl.textContent=`Uratowano 7/7 w ${state.turns} kursach. Następne poziomy dodadzą cięższe zwierzaki, zamknięte drzwi i awarie windy.`;
  overlayEl.hidden=false;
}

function lose(reason){
  if(state.over) return;
  state.over=true;
  clearInterval(timer);
  resultIconEl.textContent='🌊😿';
  resultTitleEl.textContent='ZA PÓŹNO';
  resultTextEl.textContent=reason+' Spróbuj zaplanować mniej kursów.';
  overlayEl.hidden=false;
  if(navigator.vibrate) navigator.vibrate([80,50,120]);
}

document.getElementById('restartBtn').addEventListener('click',resetGame);
document.getElementById('playAgainBtn').addEventListener('click',resetGame);
resetGame();