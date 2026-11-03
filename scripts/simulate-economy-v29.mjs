// Reproducible parameter/engine simulation, not a retention or revenue forecast.
// Run: node scripts/simulate-economy-v29.mjs > /tmp/economy-v29.json
import { createState, normalizeState, buildingCost, act, resourceRates, taxRate } from '../harborlight-v1-state.js';
import { MATERIAL_IDS, advanceLogistics, constructionScheduleEstimate, estimateMaterialsSeconds,
  warehouseLimits, foodReserve, productionRate, haulCapacity } from '../harborlight-v1-logistics.js';
import { ECONOMY_RULES, warehouseCapacityPlan, longestConstructionSeconds } from '../harborlight-v1-economy.js';
const NOW = Date.parse('2026-11-03T12:00:00Z');
const round = value => Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
export function economyStageSimulation(currentLevel) {
  const raw = createState(NOW);
  // A stage checkpoint, not fabricated progression. Exact cost is supplied in
  // this explicit fixture to isolate physical construction from gathering.
  raw.population = currentLevel === 1 ? 12 : Math.ceil(24 * currentLevel * .75);
  raw.capacity = 24 * currentLevel;
  for (const id of ['townhall','house','warehouse','farm','windmill','lumber','sawmill','quarry']) raw.buildings[id].level = currentLevel;
  const state = normalizeState(raw,NOW);
  for(const id of MATERIAL_IDS)state.resources[id]=0;
  const carriers = Math.max(3, Math.ceil(state.residents.length * .1));
  const available = state.residents.length - carriers;
  const extra = available - 9;
  const staffing = { warehouse:carriers, farm:3+Math.floor(extra*.3),
    windmill:1+Math.floor(extra*.1), lumber:3+Math.floor(extra*.3),
    sawmill:1+Math.floor(extra*.1) };
  staffing.quarry = available - staffing.farm - staffing.windmill - staffing.lumber - staffing.sawmill;
  let index=0;
  for(const [building,workers]of Object.entries(staffing)){
    state.buildings[building].workers=workers;state.buildings[building].workProgress=Array(workers).fill(0);
    for(let worker=0;worker<workers;worker++){
      const person=state.residents[index++];person.workplace=building;person.arrivalRemaining=0;person.returnRemaining=0;
    }
  }
  const cost = buildingCost(state,'townhall',{queued:false});
  state.resources.food = foodReserve(state);
  state.resources.coins = 0;
  // Supply forecast uses the real recipes, simultaneous staff, meal demand,
  // tax rate, load capacity and physical five-minute ordinary material routes.
  const supplyForecast = estimateMaterialsSeconds(state,cost);
  for(const id of MATERIAL_IDS)state.resources[id]=(cost[id]||0)+(id==='food'?foodReserve(state):0);
  state.resources.coins=cost.coins||0;
  const rates = resourceRates(state);
  const taxes = taxRate(state);
  // Keep the construction crew free. Production is quoted above; it is not
  // allowed to compete here and change a ready-project baseline silently.
  for(const person of state.residents)if(person.workplace!=='warehouse')person.workplace=null;
  for(const id of ['farm','windmill','lumber','sawmill','quarry']){state.buildings[id].workers=0;state.buildings[id].workProgress=[];}
  const started = act(state,{type:'upgrade',building:'townhall'});
  if(!started.ok)throw new Error(`Level${currentLevel}: ${started.message}`);
  const project=started.project;
  const schedule=constructionScheduleEstimate(state,project);
  if(!Number.isFinite(schedule.completionTotal))throw new Error(`No finite physical schedule at level${currentLevel}`);
  const coinsAfterOrder=state.resources.coins;
  advanceLogistics(state,schedule.completionTotal-.001);
  if(state.buildings.townhall.level!==currentLevel)throw new Error(`Finished early at level${currentLevel}`);
  advanceLogistics(state,.001);
  if(state.buildings.townhall.level!==currentLevel+1)throw new Error(`Did not finish at level${currentLevel}`);
  if(state.resources.coins!==coinsAfterOrder)throw new Error('Construction minted coins');
  return { completedTownhallLevel:currentLevel, targetTownhallLevel:currentLevel+1,
    maximumReadyProjectSeconds:round(longestConstructionSeconds(currentLevel)),
    physicalTransportSeconds:round(schedule.transport), buildingSeconds:round(schedule.building),
    observedCompletionSeconds:round(schedule.completionTotal), materialCost:cost,
    warehouse:warehouseLimits(state), capacityPlan:warehouseCapacityPlan(currentLevel),
    productionPerWorkerHour:productionRate(state,'farm'), population:raw.population, staffing,
    resourceRates:rates, taxesPerHour:round(taxes), carrierLoad:haulCapacity(state),
    emptyStockSupplyLowerBoundSeconds:round(supplyForecast), taxOnlyCoinsWaitSeconds:round((cost.coins||0)/taxes*3600),
    missingSupplyRoute:!Number.isFinite(supplyForecast), coinMintedByConstruction:0 };
}
export function simulateEconomyV29(){
  return { version:'0.13.0.0', model:ECONOMY_RULES,
    scope:'24 independent stage checkpoints using real costs, logistics, production and tax APIs. Ready-stock construction is observed in the engine; supply is a lower-bound forecast, not full player time-to-level.',
    assumptions:['Current completed Town Hall level selects the budget.','At least three arrived warehouse workers; logistics staffing grows to10% of population. The fixed project reserves three; the120-second initial walk is excluded.','Normal construction; no acceleration, advertising, bought coins, mission/lighthouse/road bonuses.','Level1 uses the actual12 starters; later stage population is75% of Town Hall capacity, an explicit checkpoint assumption rather than simulated births.','All raw and processed production share that finite population. Input recipes remain two raw goods per output.','Supply forecast is an optimistic lower bound: it does not model all future blocks, population growth or production-bank overflow. Calendar progression must be playtested separately.','Coins are fixture-funded only for the isolated ready-stock transport/build test; construction creates zero coins. Supply wait reports the real tax-only price separately.'],
    stages:Array.from({length:24},(_,index)=>economyStageSimulation(index+1)) };
}
if(import.meta.url===`file://${process.argv[1]}`)console.log(JSON.stringify(simulateEconomyV29(),null,2));
