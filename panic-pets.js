(() => {
  'use strict';

  const CAPACITY = 3;
  const TOTAL_PETS = 7;
  const FLOOR_THRESHOLDS = { 1: 1.0, 2: 2.0, 3: 3.0 };
  const LIFT_POSITIONS = { 1: 4, 2: 29, 3: 54, 4: 79 };
  const TRAVEL_WATER = 0.34;
  const TICK_WATER = 0.014;

  const INITIAL_FLOORS = [
    { floor: 3, pets: [
      { id:'bruno', icon:'🐶', size:2, name:'Bruno' },
      { id:'luna', icon:'🐱', size:1, name:'Luna' }
    ]},
    { floor: 2, pets: [
      { id:'milo', icon:'🐱', size:1, name:'Milo' },
      { id:'bibi', icon:'🐰', size:1, name:'Bibi' },
      { id:'nala', icon:'🐱', size:1, name:'Nala' }
    ]},
    { floor: 1, pets: [
      { id:'rex', icon:'🐶', size:2, name:'Rex' },
      { id:'mika', icon:'🐰', size:1, name:'Mika' }
    ]}
  ];

  const $ = id => document.getElementById(id);
  const floorsEl = $('floors');
  const buttonsEl = $('floorButtons');
  const elevatorEl = $('elevator');
  const cargoEl = $('cargo');
  const capacityEl = $('capacity');
  const waterEl = $('water');
  const rescuedEl = $('rescuedCount');
  const hintEl = $('hint');
  const statusTitleEl = $('statusTitle');
  const statusTextEl = $('statusText');
  const overlayEl = $('overlay');
  const resultIconEl = $('resultIcon');
  const resultTitleEl = $('resultTitle');
  const resultTextEl = $('resultText');

  let state;
  let timerId = null;

  function freshFloors() {
    return INITIAL_FLOORS.map(f => ({ floor: f.floor, pets: f.pets.map(p => ({ ...p })) }));
  }
  function floorData(n) { return state.floors.find(f => f.floor === n); }
  function usedCapacity() { return state.cargo.reduce((sum, p) => sum + p.size, 0); }

  function startClock() {
    if (timerId || state.over) return;
    timerId = setInterval(() => {
      if (state.over || state.moving) return;
      state.water += TICK_WATER;
      checkFlood();
      renderWater();
    }, 500);
  }

  function resetGame() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    state = { floors:freshFloors(), liftFloor:4, cargo:[], rescued:[], water:0.06, trips:0, moving:false, over:false };
    overlayEl.hidden = true;
    render();
  }

  function moveLift(target) {
    if (state.over || state.moving || target === state.liftFloor) return;
    startClock();
    state.moving = true;
    state.trips += 1;
    state.water += TRAVEL_WATER;
    renderButtons();
    elevatorEl.classList.add('moving');
    checkFlood();
    renderWater();
    if (state.over) return;
    setTimeout(() => {
      state.liftFloor = target;
      state.moving = false;
      elevatorEl.classList.remove('moving');
      if (target === 4) unloadAtRoof();
      checkFlood();
      render();
      if (navigator.vibrate) navigator.vibrate(18);
    }, 430);
  }

  function togglePet(floorNumber, petId) {
    if (state.over || state.moving || state.liftFloor !== floorNumber) return;
    const floor = floorData(floorNumber);
    const petIndex = floor.pets.findIndex(p => p.id === petId);
    if (petIndex === -1) return;
    const pet = floor.pets[petIndex];
    if (usedCapacity() + pet.size > CAPACITY) {
      statusTitleEl.textContent = '❌ BRAK MIEJSCA';
      statusTextEl.textContent = `${pet.icon} ${pet.name} potrzebuje ${pet.size} miejsc. Wróć na dach.`;
      if (navigator.vibrate) navigator.vibrate([35,25,35]);
      return;
    }
    floor.pets.splice(petIndex, 1);
    state.cargo.push(pet);
    render();
    if (navigator.vibrate) navigator.vibrate(20);
  }

  function unloadAtRoof() {
    if (!state.cargo.length) return;
    state.rescued.push(...state.cargo.splice(0));
    if (state.rescued.length === TOTAL_PETS) win();
  }

  function checkFlood() {
    if (state.over) return;
    for (const floor of state.floors) {
      const threshold = FLOOR_THRESHOLDS[floor.floor];
      if (state.water >= threshold && floor.pets.length) {
        const names = floor.pets.map(p => `${p.icon} ${p.name}`).join(' i ');
        lose(`${names} zostali na ${floor.floor}. piętrze, gdy dotarła tam woda.`);
        return;
      }
    }
  }

  function render() {
    renderFloors(); renderButtons(); renderLift(); renderWater();
    rescuedEl.textContent = `${state.rescued.length}/${TOTAL_PETS}`;
    if (state.over) return;
    if (state.liftFloor === 4) {
      statusTitleEl.textContent = state.rescued.length ? `🚁 URATOWANE: ${state.rescued.length}/${TOTAL_PETS}` : 'START NA DACHU 🚁';
      statusTextEl.textContent = 'Wybierz piętro. Najniższe zostanie zalane jako pierwsze.';
    } else {
      const floor = floorData(state.liftFloor);
      if (floor.pets.length) {
        statusTitleEl.textContent = `${state.liftFloor}. PIĘTRO — ŁADUJ!`;
        statusTextEl.textContent = 'Dotknij zwierzaków. Gdy winda będzie pełna, wróć na DACH.';
      } else {
        statusTitleEl.textContent = `${state.liftFloor}. PIĘTRO OPRÓŻNIONE`;
        statusTextEl.textContent = 'Wracaj na DACH 🚁.';
      }
    }
    if (usedCapacity() === CAPACITY) hintEl.textContent = '🚁 WINDA PEŁNA — DACH!';
    else if (state.trips === 0) hintEl.textContent = '👇 Zacznij od 1. piętra.';
    else {
      const danger = [1,2,3].find(n => floorData(n).pets.length);
      hintEl.textContent = danger ? `🌊 Najbardziej zagrożone: ${danger}. piętro.` : '🚁 Wracaj na dach.';
    }
  }

  function renderFloors() {
    floorsEl.innerHTML = '';
    const roof = document.createElement('div');
    roof.className = `floor roof ${state.liftFloor === 4 ? 'active' : ''}`;
    roof.innerHTML = `<span class="floor-label">DACH 🚁</span><div class="pets">${state.rescued.map(p => p.icon).join(' ') || '<span style="opacity:.45">strefa ewakuacji</span>'}</div>`;
    floorsEl.appendChild(roof);
    [3,2,1].forEach(n => {
      const floor = floorData(n);
      const row = document.createElement('div');
      row.className = 'floor';
      if (state.liftFloor === n) row.classList.add('active');
      if (state.water >= FLOOR_THRESHOLDS[n]) row.classList.add('flooded');
      const label = document.createElement('span'); label.className='floor-label'; label.textContent=`${n}. PIĘTRO`;
      const pets = document.createElement('div'); pets.className='pets';
      floor.pets.forEach(p => {
        const b = document.createElement('button');
        b.type='button'; b.className='pet'; b.disabled = state.liftFloor !== n || state.moving;
        b.innerHTML = `<span class="emoji">${p.icon}</span><small>${p.name}</small><em>${p.size}</em>`;
        b.setAttribute('aria-label', `${p.name} ${p.size}`);
        b.addEventListener('click', () => togglePet(n,p.id));
        pets.appendChild(b);
      });
      if (!floor.pets.length) pets.innerHTML='<span style="color:#7ce7a0;font-weight:900">✓ PUSTO</span>';
      row.append(label,pets); floorsEl.appendChild(row);
    });
  }

  function renderButtons() {
    buttonsEl.innerHTML='';
    [1,2,3,4].forEach(n => {
      const b=document.createElement('button'); b.type='button'; b.textContent=n===4?'🚁 DACH':String(n);
      if (n===4) b.classList.add('roof-btn'); if (n===state.liftFloor) b.classList.add('active');
      b.disabled=state.moving||state.over; b.addEventListener('click',()=>moveLift(n)); buttonsEl.appendChild(b);
    });
  }

  function renderLift() {
    elevatorEl.style.bottom=`${LIFT_POSITIONS[state.liftFloor]}%`;
    cargoEl.innerHTML='';
    state.cargo.forEach(p => { const s=document.createElement('button'); s.type='button'; s.textContent=p.icon; s.title=p.name; cargoEl.appendChild(s); });
    capacityEl.textContent=`${usedCapacity()}/${CAPACITY}`;
  }
  function renderWater() { waterEl.style.height=`${Math.max(1,Math.min(100,(state.water/4)*100))}%`; }

  function win() {
    state.over=true; if(timerId) clearInterval(timerId); timerId=null;
    resultIconEl.textContent='🚁🐶🐱🐰'; resultTitleEl.textContent='WSZYSTKIE BEZPIECZNE!';
    resultTextEl.textContent=`7/7 uratowanych. ${state.trips} przejazdów windy. Następne poziomy dołożą awarie, większe zwierzaki i trudniejsze wybory.`;
    overlayEl.hidden=false; if(navigator.vibrate) navigator.vibrate([40,30,80]);
  }
  function lose(reason) {
    if(state.over) return; state.over=true; if(timerId) clearInterval(timerId); timerId=null;
    resultIconEl.textContent='🌊😿'; resultTitleEl.textContent='ZA PÓŹNO'; resultTextEl.textContent=`${reason} Spróbuj zacząć od najniższego piętra.`;
    overlayEl.hidden=false; if(navigator.vibrate) navigator.vibrate([80,50,120]);
  }

  $('restartBtn').addEventListener('click',resetGame);
  $('playAgainBtn').addEventListener('click',resetGame);
  resetGame();
})();