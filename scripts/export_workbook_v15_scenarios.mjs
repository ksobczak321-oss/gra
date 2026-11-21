#!/usr/bin/env node
// Current-code scenario catalogs and reproducible model observations for Excel.
// This script neither connects to accounts nor writes the game or its saves.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
import * as State from '../harborlight-v1-state.js';
import * as Provisions from '../harborlight-v1-provisions.js';
import * as Logistics from '../harborlight-v1-logistics.js';
import * as Activities from '../harborlight-v1-activities.js';
import * as Mini from '../harborlight-v1-minigames.js';
import * as Original from '../harborlight-v1-original-puzzles.js';
import * as Hour from '../harborlight-v1-expedition-hour.js';
import * as Catalog from '../harborlight-v1-story-catalog.js';
import * as Puzzle from '../harborlight-v1-island-puzzles.js';
import * as Journey from '../harborlight-v1-adventure-journey.js';
import * as Budget from '../harborlight-v1-adventure-budget.js';
import * as Adventure from '../harborlight-v1-adventures.js';
import * as Campaign from '../harborlight-v1-campaign.js';
import * as Missions from '../harborlight-v1-missions.js';
import * as Theatre from '../harborlight-v1-theatre.js';
import * as Leisure from '../harborlight-v1-leisure.js';
import {GAME_VERSION} from '../harborlight-version.js';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const START=Date.parse('2026-11-16T07:00:00Z'),HOUR=3600000,SEED=0x15c032;
const SOURCES=['harborlight-version.js','harborlight-v1-state.js','harborlight-v1-provisions.js','harborlight-v1-logistics.js','harborlight-v1-minigames.js','harborlight-v1-original-puzzles.js','harborlight-v1-expedition-hour.js','harborlight-v1-activities.js','harborlight-v1-story-catalog.js','harborlight-v1-island-puzzles.js','harborlight-v1-adventure-journey.js','harborlight-v1-adventure-budget.js','harborlight-v1-adventures.js','harborlight-v1-campaign.js','harborlight-v1-missions.js','harborlight-v1-theatre.js','harborlight-v1-leisure.js'];
const clone=x=>structuredClone(x);
const round=x=>typeof x==='number'&&Number.isFinite(x)?Math.round(x*1e6)/1e6:x;
const pl=x=>x?.pl??x;
const columns=labels=>Object.entries(labels).map(([key,label])=>({key,label}));
function table(id,title,description,labels,rows,source_files,limitations=[]){return{id,title,description,columns:columns(labels),rows,source_files,limitations};}
function flatConstants(value,path='',out=[]){for(const[key,item]of Object.entries(value||{})){const p=path?path+'.'+key:key;if(item&&typeof item==='object'&&!Array.isArray(item))flatConstants(item,p,out);else out.push({parameter:p,value:item});}return out;}
async function gameSourceHashes(){
 const hashes={},pending=[...SOURCES];
 while(pending.length){const name=pending.shift();if(hashes[name])continue;const data=await readFile(resolve(ROOT,name));hashes[name]=createHash('sha256').update(data).digest('hex');
  for(const match of data.toString('utf8').matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
   const file=resolve(ROOT,dirname(name),match[1].split('?')[0]);
   if(file.startsWith(ROOT+'/')&&/\.(?:mjs|js)$/.test(file)){const relative=file.slice(ROOT.length+1);if(!hashes[relative])pending.push(relative);}
  }
 }
 return Object.fromEntries(Object.entries(hashes).sort(([a],[b])=>a.localeCompare(b)));
}

function puzzleChecks(){
 const rows=[];
 for(const spec of Catalog.ISLAND_PUZZLE_CATALOG)for(let variant=1;variant<=Catalog.STORY_VARIANT_COUNT;variant++){
  const puzzle=Puzzle.createIslandPuzzle(spec.id,{seed:SEED,variant,level:1,difficulty:1,clock:0});
  const before=clone(puzzle.data),view=Puzzle.getIslandPuzzleView(puzzle,'pl'),moves=Puzzle.islandPuzzleSolution(puzzle);
  let accepted=0;
  for(const move of moves){if(puzzle.solved)break;const result=Puzzle.applyIslandPuzzle(puzzle,move);assert.ok(result.ok,`${spec.id}/${variant}: illegal solver move`);accepted++;}
  const physical=spec.id==='marbleMaze';
  const valid=Puzzle.validateIslandPuzzle(puzzle);
  assert.ok(valid,`${spec.id}/${variant}: generated board failed model validation`);
  if(!physical)assert.ok(puzzle.solved,`${spec.id}/${variant}: solver did not solve board`);
  rows.push({id:spec.id,title:pl(spec.title),seed:SEED,variant,level:1,difficulty:1,clues:view.clues,instruction:view.instruction,moveCount:accepted,solverResult:physical?'UKŁAD ZWERYFIKOWANY; BRAK ODBIORU FIZYCZNEGO PRZEJŚCIA':'ROZWIĄZANO LEGALNYMI RUCHAMI',solved:puzzle.solved,layoutValidated:valid,initialBoard:before,legalSolution:physical?[]:moves,limits:physical?'Generator fizycznej kulki sprawdzony; solver statyczny nie dowodzi przejścia labiryntu.':'Solver zna wygenerowany układ; wynik nie mierzy czasu ani umiejętności człowieka.'});
 }
 return rows;
}

function simulation({id,title,hours,staffed,expand}){
 // The model's activity constructor also reads Date.now for its seed. Pin the
 // ambient clock only for this isolated constructor, then restore it exactly.
 const fixtureRealNow=Date.now;let state;
 try{Date.now=()=>START;state=State.createState(START,{ruleset:32,onboarding:true});}
 finally{Date.now=fixtureRealNow;}
 assert.equal(Date.now,fixtureRealNow,'Simulation fixture clock was not restored');
 const initialActivitySeed=state.activitySeed;
 const commands=[],checkpoints=[],attemptedUpgrades=[];
 assert.equal(state.population,18);assert.equal(State.onboardingStatus(state).pending,true);
 const initialPaused={population:state.population,resources:clone(state.resources),ruleset:state.ruleset,schema:state.version,paused:State.onboardingStatus(state).pending};
 function command(action){const result=State.act(state,action,state.worldTimeMs);commands.push({profile:id,hour:round((state.worldTimeMs-START)/HOUR),type:action.type,building:action.building??null,recipeId:action.recipeId??null,amount:action.delta??action.workers??null,ok:result.ok,message:result.message??''});return result;}
 assert.ok(command({type:'onboardingName',name:'Symulacja '+id}).ok);
 assert.ok(command({type:'onboardingFinish'}).ok);
 assert.equal(state.population,19);
 if(expand)assert.ok(command({type:'provisionsFoodSettings',priorities:['vegetables','grain']}).ok);
 function snapshot(hour){
  const meal=Provisions.mealStatus(state);
  const next=State.buildingCost(state,'townhall'),available=Object.fromEntries(Object.keys(next).filter(key=>Number.isFinite(next[key])).map(key=>[key,Math.max(0,Math.floor(state.resources[key]||0))]));
  const missing=Object.fromEntries(Object.entries(next).filter(([key,n])=>Number.isFinite(n)&&n>(available[key]||0)).map(([key,n])=>[key,Math.max(0,Math.ceil(n-(available[key]||0)))]));
  const row={profile:id,hour,day:round(hour/24),townhall:state.buildings.townhall.level,house:state.buildings.house.level,warehouse:state.buildings.warehouse.level,population:state.population,capacity:state.capacity,beds:State.housingCapacity(state),happiness:round(state.happiness),coins:round(state.resources.coins),workers:State.totalWorkers(state),free:State.freeWorkers(state),resources:Object.fromEntries(Object.entries(state.resources).map(([key,n])=>[key,round(n)])),localStock:clone(state.provisions.localStock),staff:Object.fromEntries(Object.entries(state.buildings).filter(([,b])=>b.workers).map(([key,b])=>[key,b.workers])),mealCoverage:round(meal.coverage),requiredFoodTypes:meal.requiredTypes,reserve:clone(meal.reserve),nextTownhallEligibility:State.upgradeEligibility(state,'townhall'),nextTownhallCost:next,missingForNextTownhall:missing,projects:state.constructionProjects.map(p=>({building:p.building,targetLevel:p.targetLevel,stage:p.stage,buildRemaining:round(p.buildRemaining)})),tutorialCompleted:state.tutorial?.finished??false,taxCollected:round(state.statistics.taxCollected||0),welcomeGranted:state.welcomeWorkers?.granted||0};
  checkpoints.push(row);return row;
 }
 function staff(){
  const pop=state.population,targets={warehouse:Math.max(3,Math.ceil(pop*.15)),farm:Math.ceil(pop*.4),lumber:Math.floor(pop*.2),quarry:Math.floor(pop*.15)};
  targets.sawmill=Math.max(0,pop-Object.values(targets).reduce((a,b)=>a+b,0));
  for(const[building,target]of Object.entries(targets)){
   const current=state.buildings[building].workers,delta=Math.min(Math.max(0,target-current),State.freeWorkers(state),Math.max(0,State.workerLimit(state,building)-current));
   if(delta>0)assert.ok(command({type:'assign',building,delta}).ok);
  }
  const count=state.buildings.farm.workers;
  const desired={farmGrain:Math.ceil(count/2),farmVegetables:Math.floor(count/2)};
  const rows=Provisions.productionAssignments(state,'farm');
  if(rows.some(r=>r.workers!==(desired[r.recipeId]||0))){
   for(const row of rows)if(row.workers)assert.ok(command({type:'provisionsSetWorkers',building:'farm',recipeId:row.recipeId,workers:0}).ok);
   for(const[recipeId,workers]of Object.entries(desired))if(workers)assert.ok(command({type:'provisionsSetWorkers',building:'farm',recipeId,workers}).ok);
  }
 }
 function upgrade(){
  const ids=['townhall','warehouse','house','farm','sawmill','lumber','quarry'];
  for(const building of ids){
   if(state.constructionProjects.some(p=>p.building===building&&!['complete','cancelled'].includes(p.stage)))continue;
   const eligibility=State.upgradeEligibility(state,building);
   if(!eligibility.ok)continue;
   const cost=State.buildingCost(state,building);
   if(!State.canAfford(state,cost))continue;
   const result=command({type:'upgrade',building});
   attemptedUpgrades.push({hour:round((state.worldTimeMs-START)/HOUR),building,accepted:result.ok,cost,message:result.message});
   if(result.ok)break;
  }
 }
 snapshot(0);
 for(let quarter=0;quarter<hours*4;quarter++){
  const hour=quarter/4,dayHour=Math.floor(hour)%24,active=[0,6,12].includes(dayHour);
  if(active){
   if(quarter%4===0)State.recordVisit(state,state.worldTimeMs);
   assert.ok(command({type:'userActivity',visible:true,focused:true}).ok);
   if(staffed)staff();
   if(staffed&&state.houseHappinessPool.points>0&&state.residents.some(p=>State.residentHappiness(state,p)<100))command({type:'houseHappinessAll'});
   if(expand)upgrade();
  }
  State.advanceTo(state,START+(quarter+1)*HOUR/4);
  if((quarter+1)%4===0)snapshot((quarter+1)/4);
 }
 const final=checkpoints.at(-1);
 return{id,title,hours,initialPaused,afterIntroductionPopulation:19,seedBasis:START,activitySeed:initialActivitySeed,ambientClockDuringConstruction:START,policy:{staffed,ordinaryUpgrades:expand,mealPriority:expand?['vegetables','grain']:'domyślna',decisionIntervalMinutes:15,activeWindowsWarsaw:['08:00–09:00','14:00–15:00','20:00–21:00'],premium:false,advertisements:false,purchasedCoins:false,externalTrades:false,questSolver:false,tutorialSolver:false,forcedResources:false,forcedPopulation:false,forcedLevels:false,research:false,devTimeMultiplier:1},limitations:['Jest to wynik konkretnego prostego automatu, a nie optymalnego ani typowego gracza.','Trzy jednogodzinne okna to dostępność sterowania; nie zmierzony czas rozrywki człowieka.','Plan nie realizuje samouczka praktycznego, zadań, przygód, odkryć, handlu ani zakupów za prawdziwe pieniądze.','Poza wywołaniami zwykłych poleceń nie zmieniano zasobów, mieszkańców, poziomów ani flag ukończenia.','Żadne dane kont, chmury lub zapisów użytkowników nie są odczytywane ani zapisywane.'],checkpoints,commands,attemptedUpgrades,final};
}

function theatreExamples(){
 const prices=[];
 for(const item of Theatre.THEATRE_DECORATIONS)for(const level of [...Array.from({length:100},(_,i)=>i+1),1000,1000000,1000000000000]){
  const lab={ruleset:32,worldTimeMs:START,resources:{coins:0}};
  Theatre.normalizeTheatre(lab,{theatre:{version:1,collection:level>1?[{id:'decoration-1',type:item.id,style:'coastal',level:level-1,slot:null}]:[]}});
  const quote=Theatre.theatreQuote(lab,level===1?{type:'theatreBuy',decoration:item.id,style:'coastal'}:{type:'theatreUpgrade',id:'decoration-1'});
  if(level<=1000000)assert.ok(quote.ok&&quote.coins>0,`Unsupported ordinary Theatre quote: ${item.id}/${level}`);
  prices.push({decoration:item.id,name:item.namePl,priceWeight:item.priceWeight,targetLevel:level,coins:quote.coins??null,requiresAd:quote.requiresAd??null,supported:quote.ok,message:quote.message,formula:'5×ceil(((L=1?25:12×L^1.35)×waga)/5)',adRule:'v32: co3poziom, chyba że aktywne noAds.',scope:'Wycena modelu na jawnym punkcie poziomu; nie dowód zarobienia monet lub awansu.'});
 }
 const state=State.createState(START,{ruleset:32,onboarding:true});
 assert.ok(State.act(state,{type:'onboardingName',name:'Laboratorium teatru'},START).ok);assert.ok(State.act(state,{type:'onboardingFinish'},START).ok);
 const ids=state.residents.map(p=>String(p.personUid||`resident-${p.id}`)),shows=[];
 function quote(id,offset,people,scope='home'){const q=Theatre.theatreShowQuote(state,{startAt:START+offset*1000,personUids:people,audienceScope:scope},{now:START});shows.push({id,startAfterSeconds:offset,audienceScope:scope,requestedPeople:people.length,...q});return q;}
 quote('za-wcześnie',2699,[ids[0]]);quote('najwcześniej',2700,[ids[0]]);
 for(const n of [5,18,19])quote('widownia-'+n,2700,ids.slice(0,n));
 quote('powtórzone-osoby',2700,[ids[0],ids[0]]);
 const plan=Theatre.theatreAction(state,{type:'theatrePlanShow',startAt:START+2700000,personUids:ids,audienceScope:'home'},{now:START});assert.ok(plan.ok);
 quote('nakładający-się-termin',2700,[ids[0]]);
 const cancelled=Theatre.theatreAction(state,{type:'theatreCancelShow',showId:plan.showId},{now:START});assert.ok(cancelled.ok);assert.equal(state.resources.coins,100);
 shows.push({id:'anulowanie-przed-startem',ok:cancelled.ok,coins:cancelled.coins,message:cancelled.message,scope:'Zwykłe polecenie modelu zwraca cały wcześniej pobrany koszt; brak kont/chmury.'});
 assert.ok(State.act(state,{type:'assign',building:'farm',delta:1},START).ok);
 quote('pracownik-w-zakresie-dom',2700,[ids[0]],'home');quote('pracownik-w-zakresie-wyspa',2700,[ids[0]],'island');
 return{prices,shows};
}

export async function exportScenarios({simulate=true,developmentDays=3}={}){
 const engineSource=await readFile(resolve(ROOT,'harborlight-v1-island-puzzles.js'),'utf8');
 const sourceHashes=await gameSourceHashes();
 const ruleGroups={MINI_GAME_RULES:Mini.MINI_GAME_RULES,EXPEDITION_HOUR_RULES:Hour.EXPEDITION_HOUR_RULES,ACTIVITY_RULES:Activities.ACTIVITY_RULES,ADVENTURE_RULES:Adventure.ADVENTURE_RULES,JOURNEY_RULES:Journey.JOURNEY_RULES,ADVENTURE_BUDGET_RULES:Budget.ADVENTURE_BUDGET_RULES,MISSION_RULES:Missions.MISSION_RULES,THEATRE_RULES:Theatre.THEATRE_RULES,THEATRE_SHOW_RULES:Theatre.THEATRE_SHOW_RULES,THEATRE_DEV_BALANCE:Theatre.THEATRE_DEV_BALANCE};
 const rules=Object.entries(ruleGroups).flatMap(([module,value])=>flatConstants(value,module));
 const branchRules=[
  {id:'difficulty-vs-round',rule:'Trudność planszy i czasu zależy od liczby wygranych tej odmiany w bieżącej godzinie. Nagroda rundy klasycznej ekspedycji zależy osobno od numeru rundy; to nie zawsze ta sama liczba.',source:'harborlight-v1-activities.js; harborlight-v1-expedition-hour.js'},
  {id:'hour-ledger',rule:'Licznik wygranych jest wspólny dla wysp konta, osobny dla każdej odmiany. Tylko rozliczona wygrana zwiększa trudność; wyjście lub przeładowanie nie zeruje licznika. Nowa godzina zeruje liczbę wygranych i rozpoczętych rund.',source:'harborlight-v1-expedition-hour.js'},
  {id:'active-variant',rule:'Ta sama odmiana może mieć jedną aktywną próbę na koncie; rozpoczęcie drugiej jest odrzucane.',source:'harborlight-v1-expedition-hour.js'},
  {id:'three-loss-help',rule:'Po trzech porażkach dostępne są podpowiedź i łatwiejsza próba. Trudność efektywna jest zaokrągloną w górę połową, a nagrody pozostałej próby/przygody wynoszą50%. Wygrana zeruje licznik porażek.',source:'harborlight-v1-original-puzzles.js; harborlight-v1-adventure-journey.js'},
  {id:'time-offer',rule:'Przy30sekundach do końca pojawia się oferta czasu i5sekund na wybór. Oferta reklamy zatrzymuje zegar do potwierdzenia. Koszt monet to10×najwyższy Ratusz; dodany czas max(60sekund, połowa pozostałego).',source:'harborlight-v1-original-puzzles.js; harborlight-v1-activities.js; harborlight-v1-adventure-journey.js'},
  {id:'hard-deadline',rule:'Upływ twardego limitu kończy próbę. Wyjście/przeładowanie bieżącej próby jest porażką, a nie nowym darmowym zegarem; ukończone poprzednie sale i odkrycia pozostają.',source:'harborlight-v1-original-puzzles.js; harborlight-v1-island-puzzles.js; harborlight-v1-adventure-journey.js'},
  {id:'expedition-pot',rule:'Po wygranej można wypłacić pulę albo kontynuować i ryzykować całą niewypłaconą pulę. Po2/3limitu co1/12limitu odejmowana jest1moneta od nagrody tej rundy. Bieżąca bazowa nagroda jest ograniczona do800.',source:'harborlight-v1-activities.js; harborlight-v1-expedition-hour.js'},
  {id:'original-reward',rule:'Sieć/konwoje: max(1,floor(min(800,50×2^min(4,trudność−1))×najwyższyRatusz×skalaPomocy)). Próba ratunku cywilów nie daje tej wypłaty monet; wynik zapisuje oczekującą grupę ludzi.',source:'harborlight-v1-original-puzzles.js; harborlight-v1-development.js'},
  {id:'adventure-slots',rule:'Bieżące v32 dopuszcza3×najwyższy Ratusz rozpoczętych przygód na koncie. Wznowienie istniejącej przygody nie zużywa nowego miejsca.',source:'harborlight-v1-adventure-journey.js'},
  {id:'daily-budget',rule:'Wspólny budżet konta: dziennie20%×500×najwyższyRatusz, w rozdziale30%×500×poziomRozdziału. Wagi: monety1; drewno/kamień/zboże0.5; dawna żywność/deski1.5. Nagroda jest proporcjonalnie ograniczana i zaokrąglana w dół.',source:'harborlight-v1-adventure-budget.js'},
  {id:'claim-idempotency',rule:'Ten sam receipt nie wypłaca ponownie nagrody. Brak budżetu lub powtórka ukończonej opowieści oznacza trening: pozostają wynik i odkrycie, bez nowej wypłaty.',source:'harborlight-v1-adventure-budget.js; harborlight-v1-adventure-journey.js'},
  {id:'reward-food-conversion',rule:'Po rozliczeniu budżetu State.claimStateAdventureReward w v32 zamienia dawne reward.food na taką samą liczbę porcji mąki. Katalogowe food w starej przygodzie nie oznacza bieżącej produkcji dawnej żywności.',source:'harborlight-v1-state.js'},
  {id:'reference-days',rule:'Katalog50dni jest planem odniesienia. Nie jest blokadą awansu, raportem pełnej50dniowej symulacji ani dowodem150godzin dobrej zabawy.',source:'harborlight-v1-campaign.js; docs/design/CAMPAIGN-V31-SIMULATION.md'},
  {id:'theatre-shows',rule:'Plan spektaklu: co najmniej45minut wyprzedzenia,10minut trwania,2monety za unikalnego widza. Spektakle nie nakładają się. Uczestnicy obecni na wyspie dostają+10szczęścia na6godzin; praca i nauka nadal działają.',source:'harborlight-v1-theatre.js'},
  {id:'theatre-cancel',rule:'Zaplanowany spektakl można anulować przed rozpoczęciem z pełnym zwrotem; trwającego lub zakończonego nie można anulować.',source:'harborlight-v1-theatre.js'},
  {id:'theatre-decoration',rule:'Dekoracja jest osobną własnością. Przesunięcie nie kupuje ani nie duplikuje przedmiotu;20wystawionych miejsc,2000przedmiotów kolekcji,3zapisane układy. W v32 reklama co3poziom; noAds zwalnia z reklamy.',source:'harborlight-v1-theatre.js'},
  {id:'theatre-happiness',rule:'Dekoracje ustawione na placu dają min(10,sumaPoziomów×0.05)szczęścia. Współczynnik ma w kodzie oznaczenie DEV_PROPOSAL_REQUIRES_REVIEW.',source:'harborlight-v1-theatre.js'}
 ];
 const minigameRounds=[];
 for(const kind of ['tilt','triples'])for(const stage of [...Array.from({length:20},(_,i)=>i+1),50,100,1000,1000000]){
  const normal=Mini.miniGameRoundRules(kind,stage),easier=Mini.miniGameRoundRules(kind,Math.max(1,Math.ceil(stage/2)));
  minigameRounds.push({kind,title:kind==='tilt'?'Kulki w labiryncie':'Trójki obrazków',stage,roundNumber:stage,timeLimitSeconds:round(normal.timeLimit),fullRewardSeconds:round(normal.fullRewardUntil),penaltyEverySeconds:round(normal.penaltyEvery),penaltyCoinsPerInterval:1,currentCappedRoundReward:Hour.cappedExpeditionReward(stage),historicalUncappedBaseReward:normal.baseReward,maximumCards:normal.cardCount,balls:normal.ballCount,mazeCells:normal.mazeCells,shuffleEverySeconds:normal.shuffleInterval,easierEffectiveDifficulty:Math.max(1,Math.ceil(stage/2)),easierSeconds:round(easier.timeLimit),easierRewardScale:.5,loss:'Upływ czasu / wyjście / brak potwierdzenia obecności kończy próbę i usuwa niewypłaconą pulę.'});
 }
 const originalRounds=[];
 for(const spec of Original.originalPuzzleCatalog)for(const difficulty of [1,2,3,4,5,10,20,100,1000000])for(const easier of [false,true]){
  const a=Original.createOriginalAttempt(spec.id,{seed:SEED,difficulty,easier,now:START,highestTownhall:5});
  Original.advanceOriginalAttempt(a,a.remaining-30);
  const lab={worldTimeMs:START,resources:{coins:100},originalPuzzles:{version:1,attempts:{[spec.id]:a},failures:{}}};
  const reward=Original.originalPuzzleStatus(lab,spec.id).reward,choiceSeconds=a.timeOffer?.choiceRemaining;
  const extension=Original.originalPuzzleAction(lab,{type:'originalPuzzleTimeChoice',variant:spec.id,method:'coins'},{now:START});assert.ok(extension.ok);
  originalRounds.push({variant:spec.id,title:spec.name,description:spec.description,difficulty,easier,effectiveDifficulty:a.effectiveDifficulty,timeLimitSeconds:a.initialDuration,rewardScale:a.rewardScale,cappedRoundReward:Hour.cappedExpeditionReward(difficulty),highestTownhall:5,quotedReward:reward,timeOfferAtSecondsRemaining:30,timeChoiceSeconds:choiceSeconds,extensionCoins:100-lab.resources.coins,extensionSeconds:extension.added,boardNodes:a.board.nodes?.length??null,boardEdges:a.board.edges?.length??null,boardSize:a.board.size??null,convoys:a.board.paths?.length??null});
 }
 const puzzleRows=Catalog.ISLAND_PUZZLE_CATALOG.map(spec=>{
  const start=engineSource.indexOf('engine.'+spec.id+'='),next=start>=0?engineSource.indexOf('\nengine.',start+1):-1;
  const generatorRules=start>=0?engineSource.slice(start,next>=0?next:engineSource.indexOf("\nfor(const variant",start)):"Wspólny silnik oryginalnych zagadek; harvest source: harborlight-v1-original-puzzles.js";
  const p=Puzzle.createIslandPuzzle(spec.id,{seed:SEED,variant:1,level:1,difficulty:1});
  const view=Puzzle.getIslandPuzzleView(p,'pl');
  return{id:spec.id,title:pl(spec.title),description:pl(spec.description),catalogDurationSeconds:spec.durationSeconds,tier:spec.tier,exampleClues:view.clues,generatorRules,allowedControls:[...new Set([...view.controls,...view.items,...view.targets,...(view.grid?.cells||[])].map(x=>x.move?.type).filter(Boolean))],winningState:generatorRules.match(/solved:[^\n]+/)?.[0]??'Wszystkie przewody użyte dokładnie raz / wszystkie konwoje usunięte.',seedGeneration:'Xorshift32; seed xor Math.imul(variant,0x9e3779b9); rozwiązanie sprawdza silnik.'};
 });
 const storyVariants=[],storyRooms=[];
 for(const story of Catalog.STORY_CATALOG)for(let variant=1;variant<=story.variants;variant++){
  const kinds=Catalog.storyRoomKinds(story,variant);
  storyVariants.push({id:story.id,title:pl(story.title),intro:pl(story.intro),variant,unlockLevel:story.unlockLevel,recruitment:story.recruitment,referenceDurationSeconds:story.durationSeconds,roomCount:kinds.length,roomOrder:kinds,causalConnection:'Układ następnej sali jest wyznaczany deterministycznie przez opowieść, wariant, indeks sali oraz kody faktycznie odkrytych wskazówek.'});
  kinds.forEach((kind,index)=>{const puzzle=Catalog.puzzleById(kind);storyRooms.push({storyId:story.id,storyTitle:pl(story.title),variant,room:index+1,kind,title:pl(puzzle.title),instruction:pl(puzzle.description),nominalSeconds:puzzle.durationSeconds,finalRoom:index===kinds.length-1,prerequisite:index?'Ukończ poprzednią salę i zachowaj jej wskazówkę.':'Rozpocznij dostępną opowieść.',claimCondition:index===kinds.length-1?'Nagroda dopiero po ukończeniu całej opowieści; limity konta mogą ją ograniczyć.':'Sama sala nie wypłaca osobnej nagrody ekspedycji.'});});
 }
 const chapters=Campaign.CAMPAIGN_CHAPTERS.map(c=>({level:c.level,title:pl(c.title),storyId:c.storyId,worldChange:pl(c.worldChange),steps:c.steps.length,budget:Campaign.campaignBudget(c.level)}));
 const steps=Campaign.CAMPAIGN_CHAPTERS.flatMap(c=>c.steps.map((s,i)=>({chapter:c.level,chapterTitle:pl(c.title),step:i+1,...s,title:pl(s.title),definition:s,coinReward:Campaign.campaignStepReward(c.level,i+1),condition:s.type==='building'?'Rzeczywiście ukończona budowa/rozbudowa.':s.type==='contribute'?'Zasób faktycznie przekazany, z ochroną rezerwy posiłków.':s.type==='adventure'?'Rzeczywiście rozwiązana zagadka lub wszystkie sale opowieści.':'Warunek sprawdzany przez model misji; katalog nie zastępuje wykonania.'})));
 const days=Campaign.CAMPAIGN_DAYS.map((d,i)=>({...d,day:i+1,title:d.titlePl??pl(d.title),focus:d.focusPl,indicative:true,claim:'Plan odniesienia, nie symulacja, blokada kalendarzowa ani pomiar ludzkiego czasu.'}));
 const checks=puzzleChecks();
 const theatre=theatreExamples();
 const sims=simulate?[simulation({id:'bez-pracy',title:'Kontrola: bez przydziałów produkcji',hours:24,staffed:false,expand:false}),simulation({id:'produkcja-24h',title:'Produkcja podstawowa, bez rozbudowy',hours:24,staffed:true,expand:false}),simulation({id:'rozwoj-'+developmentDays+'d',title:'Produkcja i zwykłe rozbudowy przez '+developmentDays+' dni',hours:developmentDays*24,staffed:true,expand:true})]:[];
 const tables=[
  table('scenario_rules','Zasady minigier i przygód','Parametry bezpośrednio z modułów. Wartości oznaczone DEV_PROPOSAL pozostają propozycjami balansu.',{parameter:'Parametr / ścieżka',value:'Obecna wartość'},rules,SOURCES),
  table('scenario_conditions','Warunki i rozgałęzienia','Reguły bieżącego v32, z rozróżnieniem licznika trudności, numeru rundy i historycznych pól.',{id:'ID warunku',rule:'Pełna reguła PL',source:'Źródło'},branchRules,SOURCES),
  table('minigame_rounds','Ekspedycje: trudność i nagrody','Punkty przykładowe: trudność i numer rundy są tutaj równe, ale w grze zmieniają się niezależnie. Bieżąca nagroda jest ograniczona do800; historyczna krzywa bez limitu osobno.',{kind:'ID',title:'Minigra',stage:'Trudność w przykładzie',roundNumber:'Numer rundy w przykładzie',timeLimitSeconds:'Limit sekund',fullRewardSeconds:'Pełna nagroda do sekundy',penaltyEverySeconds:'Co ile sekund potrącenie',penaltyCoinsPerInterval:'Potrącenie monet za interwał',currentCappedRoundReward:'Obecna nagroda rundy',historicalUncappedBaseReward:'Historyczna krzywa bez limitu',maximumCards:'Liczba kart',balls:'Liczba kulek',mazeCells:'Bok labiryntu',shuffleEverySeconds:'Tasowanie co sekund',easierEffectiveDifficulty:'Ułatwiona trudność',easierSeconds:'Ułatwiony limit sekund',easierRewardScale:'Mnożnik nagrody pomocy',loss:'Utrata próby'},minigameRounds,['harborlight-v1-minigames.js','harborlight-v1-activities.js','harborlight-v1-expedition-hour.js']),
  table('original_puzzle_rounds','Sieć i konwoje','Przykładowe trudności z rzeczywistych generatorów; wyceny na jawnym najwyższymRatuszu5, nie symulacja awansu.',{variant:'ID',title:'Nazwa',description:'Polecenie',difficulty:'Trudność',easier:'Łatwiejsza próba',effectiveDifficulty:'Trudność efektywna',timeLimitSeconds:'Limit sekund',rewardScale:'Mnożnik nagrody',cappedRoundReward:'Bazowa nagroda bez mnożnika Ratusza',highestTownhall:'Najwyższy Ratusz do wyceny',quotedReward:'Rzeczywista wycena nagrody',timeOfferAtSecondsRemaining:'Pozostały czas przy ofercie',timeChoiceSeconds:'Sekundy na decyzję',extensionCoins:'Cena przedłużenia',extensionSeconds:'Dodane sekundy',boardNodes:'Węzły',boardEdges:'Przewody',boardSize:'Bok planszy',convoys:'Konwoje'},originalRounds,['harborlight-v1-original-puzzles.js']),
  table('island_puzzles','Katalog24 mechanik','Pełen katalog mechanik, instrukcje, reguły generatorów i warunki zwycięstwa.',{id:'ID',title:'Nazwa PL',description:'Opis PL',catalogDurationSeconds:'Czas odniesienia sekund',tier:'Kategoria',exampleClues:'Przykładowe wskazówki',allowedControls:'Dozwolone rodzaje ruchów',winningState:'Warunek wygranej z kodu',generatorRules:'Pełne reguły mechaniki z kodu',seedGeneration:'Generowanie'},puzzleRows,['harborlight-v1-island-puzzles.js','harborlight-v1-story-catalog.js']),
  table('story_variants','Opowieści i100 wariantów','20opowieści ×5wariantów kolejności. Konkretne plansze zależą również od ziarna i odkrytych wskazówek.',{id:'ID',title:'Tytuł PL',intro:'Wprowadzenie PL',variant:'Wariant',unlockLevel:'Wymagany Ratusz',recruitment:'Opowieść rekrutacyjna',referenceDurationSeconds:'Czas odniesienia sekund',roomCount:'Liczba sal',roomOrder:'Pełna kolejność sal',causalConnection:'Zależność między salami'},storyVariants,['harborlight-v1-story-catalog.js','harborlight-v1-adventure-journey.js']),
  table('story_rooms','Wszystkie sale opowieści','Każda sala każdego skończonego wariantu opowieści.',{storyId:'Opowieść ID',storyTitle:'Tytuł PL',variant:'Wariant',room:'Sala',kind:'Mechanika',title:'Tytuł sali PL',instruction:'Polecenie PL',nominalSeconds:'Sekundy odniesienia',finalRoom:'Finał',prerequisite:'Warunek wejścia',claimCondition:'Warunek nagrody'},storyRooms,['harborlight-v1-story-catalog.js']),
  table('campaign_chapters','Kampania: rozdziały','Rozdziały2–20 i ich budżety.',{level:'Rozdział',title:'Tytuł PL',storyId:'Opowieść',worldChange:'Zmiana świata',steps:'Liczba etapów',budget:'Budżet z modelu'},chapters,['harborlight-v1-campaign.js']),
  table('campaign_steps','Kampania:152 etapy','Warunki pochodzą z aktualnego katalogu; parametry dynamiczne przelicza model misji.',{chapter:'Rozdział',chapterTitle:'Tytuł rozdziału',step:'Etap',title:'Polecenie PL',type:'Rodzaj',check:'Sprawdzenie',building:'Budynek',resource:'Zasób',scale:'Mnożnik',target:'Cel',targetPopulation:'Cel ludności',storyId:'Opowieść',puzzleKind:'Mechanika',count:'Liczba',coinReward:'Nagroda etapu',condition:'Weryfikacja',definition:'Wszystkie warunki definicji z kodu'},steps,['harborlight-v1-campaign.js','harborlight-v1-missions.js']),
  table('campaign_days','Plan odniesienia50 dni','To plan katalogu, a nie wynik symulacji lub obietnica awansu.',{day:'Dzień',level:'Poziom odniesienia',levelRange:'Zakres Ratusza',title:'Tytuł PL',focus:'Cel i treść dnia PL',storyId:'Opowieść',puzzleKinds:'Rodzaje zagadek',minActiveMinutes:'Orientacyjne minuty',claim:'Ograniczenie'},days,['harborlight-v1-campaign.js']),
  table('classic_expedition_maps','Dawne mapy wypraw','Zachowana zgodność wcześniejszych map i zapisów; to nie nowa krzywa nagród v32.',{id:'ID',name:'Nazwa w katalogu',description:'Instrukcja w katalogu',reward:'Nagroda katalogowa',par:'Ruchy odniesienia',tools:'Narzędzia',map:'Pełna mapa'},State.EXPEDITIONS,['harborlight-v1-state.js','harborlight-v1-activities.js']),
  table('adventure_catalog','Przygody: katalog klasyczny','Wszystkie klasyczne scenariusze i ich nagrody katalogowe, przed ograniczeniem wspólnym budżetem.',{kind:'ID',title:'Tytuł PL',description:'Pełny opis PL',durationSeconds:'Sekundy odniesienia',rewards:'Nagrody katalogowe',cooldownSeconds:'Odstęp sekund'},Adventure.ADVENTURE_CATALOG.map(a=>({...a,title:pl(a.title),description:pl(a.description),rewards:Adventure.ADVENTURE_RULES.rewards[a.kind]??'Łapane sztuki według wygenerowanego ładunku.',cooldownSeconds:a.kind==='cargoRain'?Adventure.ADVENTURE_RULES.cargoRainCooldownSeconds:Adventure.ADVENTURE_RULES.ordinaryCooldownSeconds})),['harborlight-v1-adventures.js','harborlight-v1-adventure-budget.js']),
  table('theatre_prices','Teatr: ceny i poziomy','Dziesięć dekoracji, pełne poziomy1–100 i punkty ponad100. Brak maksymalnego poziomu, ale cena musi mieścić się w bezpiecznym zakresie liczb.',{decoration:'ID dekoracji',name:'Nazwa PL',priceWeight:'Waga ceny',targetLevel:'Poziom docelowy',coins:'Cena monet',requiresAd:'Reklama wymagana v32',supported:'Obsługiwane',message:'Wynik modelu',formula:'Formuła ceny',adRule:'Reguła reklamy',scope:'Zakres wyceny'},theatre.prices,['harborlight-v1-theatre.js']),
  table('theatre_shows','Teatr: wyceny i warunki spektakli','Przykłady rzeczywistych wycen i zwykłego planowania/anulowania w osobnym modelu laboratoryjnym.',{id:'Przypadek',startAfterSeconds:'Wyprzedzenie sekund',audienceScope:'Zakres widowni',requestedPeople:'Wybrane wpisy',ok:'Przyjęto',code:'Kod odmowy',message:'Komunikat',audienceCount:'Unikalni widzowie',coins:'Koszt lub zwrot',durationSeconds:'Czas spektaklu',happinessPoints:'Szczęście',happinessSeconds:'Czas premii',scope:'Granice'},theatre.shows,['harborlight-v1-theatre.js']),
  table('theatre_styles','Teatr: style i otoczenie','Style nie zmieniają ceny ani własności dekoracji.',{group:'Kategoria',id:'ID',namePl:'Nazwa PL',stone:'Kolor główny',dark:'Kolor ciemny',accent:'Akcent',foliage:'Zieleń'},[...Theatre.THEATRE_STYLES.map(x=>({group:'styl',...x})),...Theatre.THEATRE_LIGHTING.map(x=>({group:'światło',...x})),...Theatre.THEATRE_PAVING.map(x=>({group:'nawierzchnia',...x}))],['harborlight-v1-theatre.js']),
  table('solver_checks','Przykłady generatorów i solverów','24mechaniki ×5wariantów; stałe ziarno, legalne ruchy i walidacja modelu.',{id:'ID',title:'Nazwa',seed:'Ziarno',variant:'Wariant',level:'Poziom',difficulty:'Trudność',instruction:'Polecenie',clues:'Wskazówki',moveCount:'Ruchy solvera',solverResult:'Wynik',layoutValidated:'Układ zweryfikowany',solved:'Rozwiązano',initialBoard:'Pełny przykładowy układ',legalSolution:'Ruchy rozwiązania',limits:'Zakres dowodu'},checks,['harborlight-v1-island-puzzles.js'],['Nie jest to lista wszystkich możliwych ziaren.','Dla fizycznego labiryntu potwierdzono układ, nie wykonanie fizycznego przejścia.']),
  table('development_simulation_assumptions','Symulacja: założenia','Wyniki konkretnego automatu na prawdziwym modelu32, ze zwykłego startu.',{profile:'Profil',title:'Nazwa',hours:'Horyzont godzin',initialPopulation:'Start przed intro',afterIntroductionPopulation:'Po legalnym wprowadzeniu',seedBasis:'Baza ziarna / czas startu ms',activitySeed:'Ziarno aktywności po konstruktorze',ambientClockDuringConstruction:'Date.now podczas konstruktora ms',policy:'Strategia i wejścia',limitations:'Granice interpretacji'},sims.map(s=>({profile:s.id,title:s.title,hours:s.hours,initialPopulation:s.initialPaused.population,afterIntroductionPopulation:s.afterIntroductionPopulation,seedBasis:s.seedBasis,activitySeed:s.activitySeed,ambientClockDuringConstruction:s.ambientClockDuringConstruction,policy:s.policy,limitations:s.limitations})),['scripts/export_workbook_v15_scenarios.mjs','harborlight-v1-state.js']),
  table('development_simulation_checkpoints','Symulacja: rozwój i zasoby','Stan z silnika co godzinę; niedobory i progi nie są interpolowane.',{profile:'Profil',hour:'Godzina',day:'Doba',townhall:'Ratusz',house:'Dom',warehouse:'Magazyn',population:'Mieszkańcy',capacity:'Limit Ratusza',beds:'Łóżka',happiness:'Szczęście',coins:'Monety',workers:'Przydzieleni',free:'Wolni',resources:'Wszystkie zasoby',staff:'Pełna obsada',mealCoverage:'Pokrycie posiłków',requiredFoodTypes:'Wymagane rodzaje jedzenia',reserve:'Rezerwa',nextTownhallEligibility:'Warunek następnego Ratusza',nextTownhallCost:'Koszt następnego Ratusza',missingForNextTownhall:'Niedobory',projects:'Bieżące budowy',taxCollected:'Zebrany podatek',welcomeGranted:'Powitalni mieszkańcy'},sims.flatMap(s=>s.checkpoints),['harborlight-v1-state.js','harborlight-v1-provisions.js','harborlight-v1-logistics.js']),
  table('development_simulation_commands','Symulacja: ślad poleceń','Wszystkie polecenia wysyła zwykły interfejs modelu; brak ręcznego ustawiania stanu.',{profile:'Profil',hour:'Godzina',type:'Polecenie',building:'Budynek',recipeId:'Receptura',amount:'Ilość',ok:'Przyjęto',message:'Wynik modelu'},sims.flatMap(s=>s.commands),['scripts/export_workbook_v15_scenarios.mjs']),
  table('historical_simulation_limits','Historyczne dowody rozwoju','Raport v31 pozostaje historyczny; nie zastępuje bieżącej symulacji32.',{source:'Źródło',scope:'Zakres',current:'Bieżący dowód v32',limits:'Ograniczenia'},[{source:'docs/design/CAMPAIGN-V31-SIMULATION.json',scope:'Częściowa obserwacja35/50dób poprzedniego modelu v31.',current:false,limits:'Niepotwierdzony pełen przebieg50dni, TH20 i150godzin ludzkiej zabawy; nie nadpisywano raportu.'},{source:'scripts/simulate-campaign-v31.mjs',scope:'Planer legacy z24łóżkami na poziom i dawną żywnością.',current:false,limits:'Nie używany jako dowód v32; bieżące36łóżek, nowe przepisy i odkrycia wymagają własnego planera.'}],['docs/design/CAMPAIGN-V31-SIMULATION.json','scripts/simulate-campaign-v31.mjs'])
 ];
 const sourceCommit=process.env.HARBORLIGHT_WORKBOOK_SOURCE_SHA||execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
 const exporterSha256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
 return{meta:{schema:1,version:GAME_VERSION,ruleset:32,sourceCommit,sourceHashes,exporterSha256,seed:SEED,startAt:START,scope:'Eksport katalogu i deterministyczna symulacja modelu; brak dostępu do kont, sieci i zapisu gry.',simulationIncluded:simulate},tables,raw:{ruleGroups,classicExpeditions:State.EXPEDITIONS,legacyTasks:State.TASKS,taskNarratives:Activities.TASK_NARRATIVES,adventureCatalog:Adventure.ADVENTURE_CATALOG,attractions:Leisure.ATTRACTIONS,theatre:{decorations:Theatre.THEATRE_DECORATIONS,styles:Theatre.THEATRE_STYLES,lighting:Theatre.THEATRE_LIGHTING,paving:Theatre.THEATRE_PAVING},campaignChapters:Campaign.CAMPAIGN_CHAPTERS,campaignDays:Campaign.CAMPAIGN_DAYS,playerSimulations:sims},checks:{puzzleExamples:checks.length,solverSolved:checks.filter(x=>x.solved).length,layoutsValidated:checks.filter(x=>x.layoutValidated).length,storyVariants:storyVariants.length,storyRooms:storyRooms.length,campaignSteps:steps.length,theatrePricePoints:theatre.prices.length,theatreShowCases:theatre.shows.length,currentSimulationProfiles:sims.length,allSimulationsCanonicalStart:sims.every(s=>s.initialPaused.population===18&&s.afterIntroductionPopulation===19),noInjectedResourcesOrLevels:sims.every(s=>!s.policy.forcedResources&&!s.policy.forcedLevels)}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),output=args.includes('--output')?args[args.indexOf('--output')+1]:null;
 const days=args.includes('--development-days')?Number(args[args.indexOf('--development-days')+1]):3;
 assert.ok(Number.isSafeInteger(days)&&days>=1&&days<=7,'Use a fixed1–7day development horizon.');
 const result=await exportScenarios({simulate:!args.includes('--no-simulation'),developmentDays:days});
 if(output){await writeFile(resolve(output),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({output:resolve(output),checks:result.checks,tableRows:Object.fromEntries(result.tables.map(t=>[t.id,t.rows.length]))}));}
 else console.log(JSON.stringify(result,null,2));
}
