// Command-driven free-player campaign planner. No save/stock/population fixtures.
// node scripts/simulate-campaign-v31.mjs --days 50 > /tmp/campaign-v31.json
import { pathToFileURL } from 'node:url';
import { createState, act, advanceTo, recordVisit, buildingCost, canAfford, workerLimit,
  upgradeEligibility, foodDemandPerHour, resourceRates, dailyBlessingStatus } from '../harborlight-v1-state.js';
import { TUTORIAL_LESSONS, tutorialRows, tutorialStatus, loyaltyStatus } from '../harborlight-v1-progression.js';
import { constructionScheduleEstimate, availableGoods, foodReserve, warehouseLimits,
  productionRate, quoteTrade, plannedLevel } from '../harborlight-v1-logistics.js';
import { warehouseCapacityForLevel } from '../harborlight-v1-economy.js';
import { missionAssistanceOffer } from '../harborlight-v1-missions.js';
import { islandPuzzleSolution } from '../harborlight-v1-island-puzzles.js';
import { leisureOffers } from '../harborlight-v1-leisure.js';
import { ordinaryStock } from '../harborlight-v1-inventory.js';
import { residentAtHome, activeWorkerCount } from '../harborlight-v1-residents.js';

const HOUR = 3600000, DAY = 24 * HOUR, GOODS = ['wood','stone','grain','food','planks'];
const PRODUCERS = ['farm','windmill','lumber','sawmill','quarry'];
const WORKPLACES = ['warehouse',...PRODUCERS,'dock','market'];
const forbidden = new Set(['buyCoins','paynowConfirm','adBlessing','paidBlessing','adventureAssist','expeditionExtend','claimReferral','claimSocialReward','redeemCode']);
const copy = x => structuredClone(x);
const round = n => Math.round(n * 1000) / 1000;
const hasProject = (s,id) => s.constructionProjects.some(p => p.building === id);
const slots = s => s.constructionProjects.filter(p => ['transport','building'].includes(p.stage)).length;

/** Three one-hour windows, six hours apart, relative to the first session.
 * The default starts at 08:00 Warsaw on 4 November; all fifty days are winter.
 * This models 3h/day of inputs, not an always-open game or multiplied offline tax.
 */
export function campaignSessionAt(now, startAt, days = 50) {
  const endAt = startAt + days * DAY;
  if (now >= endAt) return { finished:true, nextAt:endAt };
  const day = Math.max(0, Math.floor((now - startAt) / DAY));
  for (const offset of [0,6,12]) {
    const begin = startAt + day * DAY + offset * HOUR;
    if (now < begin) return { active:false, nextAt:Math.min(begin,endAt), day:day + 1 };
    if (now < begin + HOUR) return { active:true, key:`${day}:${offset}`, begin, endAt:Math.min(begin+HOUR,endAt), day:day+1 };
  }
  return { active:false, nextAt:Math.min(startAt+(day+1)*DAY,endAt), day:day+1 };
}

export function createCampaignPlanner(options = {}) {
  const startAt = options.startAt ?? Date.parse('2026-11-04T07:00:00Z');
  const days = options.days ?? 50, targetLevel = options.targetLevel ?? 20;
  if (!Number.isSafeInteger(startAt) || startAt <= 0 || !Number.isFinite(days) || days <= 0 || days > 50 ||
      !Number.isSafeInteger(targetLevel) || targetLevel < 2 || targetLevel > 20) throw new Error('Use a valid clock, up to50days, and targetlevel2–20.');
  const endAt = startAt + days * DAY;
  const state = createState(startAt, { onboarding:true });
  const metrics = { commands:0, actionCounts:{}, commandFailures:[], sessions:0, activeSeconds:0,
    checkpoints:[], milestones:[], campaignMilestones:[], puzzles:0, stories:0,
    realMoneyPurchases:0, rewardedAdvertisements:0, externalPlayerTrades:0,
    engineAdvanceCalls:0,engineWallMilliseconds:0,slowestAdvance:null };
  let bootstrapped = false, currentSession = null, nextCheckpoint = startAt + DAY;
  let lastTown = 1, lastChapters = '', lastStaffAt = -Infinity;
  const tutorialGuides = new Map();
  let decisions = 0, idleDecisions = 0;
  const context = { buildingCost, constructionEstimate:constructionScheduleEstimate };
  function currentMission() {
    // The UI preview quotes every future construction. Planning an actual next
    // command needs only the persisted current objective; its command dispatcher
    // still performs the real feasibility check before accepting anything.
    const m=state.lighthouseMissions,frame=m?.stack?.at(-1),task=frame?.task;
    return task?{available:true,chapter:m.chapter,kind:frame.kind,index:frame.index,task,active:task.status==='active'}:{available:false,finished:m?.chapter?.status==='completed'};
  }

  function snapshot() {
    const m = currentMission();
    return { elapsedDays:round((state.worldTimeMs-startAt)/DAY), at:state.worldTimeMs,
      level:state.buildings.townhall.level, population:state.population, happiness:round(state.happiness),
      houseLevel:state.buildings.house.level, beds:state.buildings.house.level*24,
      warehouseLevel:state.buildings.warehouse.level, warehouse:warehouseLimits(state),
      lighthouseLevel:state.buildings.lighthouse.level, lighthouseHours:round(state.lighthouseRemaining/3600),
      resources:copy(state.resources), bonusMaterials:copy(state.bonusMaterials),
      workers:Object.fromEntries(WORKPLACES.map(id=>[id,{assigned:state.buildings[id]?.workers||0,arrived:activeWorkerCount(state,id)}])),
      producerLevels:Object.fromEntries(PRODUCERS.map(id=>[id,state.buildings[id].level])),
      rates:resourceRates(state), projects:state.constructionProjects.map(p=>({building:p.building,target:p.targetLevel,stage:p.stage,remaining:p.buildRemaining})),
      tutorialFinished:tutorialStatus(state).finished,
      welcomeGranted:state.welcomeWorkers?.granted||0,welcomeDaysUsed:state.welcomeWorkers?.claimedDays?.length||0,
      taxCoinsCollected:state.statistics?.taxCollected||0,
      adventureBudget:state.adventureBudget?{dailyLimit:state.adventureBudget.dailyLimit,dailySpent:state.adventureBudget.dailySpent,
        chapterSpent:Object.values(state.adventureBudget.chapters||{}).reduce((sum,x)=>sum+(x.spent||0),0)}:null,
      mission:m.available?{chapter:m.chapter.level,index:m.index,kind:m.kind,id:m.task.id,type:m.task.objective.type,status:m.task.status,title:m.task.titlePl,objective:copy(m.task.objective)}:null,
      completedChapters:[...(state.lighthouseMissions?.completedLevels||[])] };
  }
  function observe() {
    if (state.buildings.townhall.level !== lastTown) {
      lastTown=state.buildings.townhall.level;metrics.milestones.push({level:lastTown,elapsedDays:round((state.worldTimeMs-startAt)/DAY),population:state.population,coins:state.resources.coins});
      options.onMilestone?.(metrics.milestones.at(-1));
    }
    const chapters=(state.lighthouseMissions?.completedLevels||[]).join(',');
    if(chapters!==lastChapters){lastChapters=chapters;metrics.campaignMilestones.push({elapsedDays:round((state.worldTimeMs-startAt)/DAY),completed:[...(state.lighthouseMissions?.completedLevels||[])]});}
  }
  function advanceWorld(to) {
    const target=Math.min(endAt,to);
    if(target<state.worldTimeMs)throw new Error('The planner cannot turn the island clock backwards.');
    options.onBeforeAdvance?.({from:state.worldTimeMs,to:target,day:(state.worldTimeMs-startAt)/DAY});
    const started=performance.now(),from=state.worldTimeMs;
    while(nextCheckpoint<=target){advanceTo(state,nextCheckpoint);observe();metrics.checkpoints.push(snapshot());options.onCheckpoint?.(metrics.checkpoints.at(-1));nextCheckpoint+=DAY;}
    advanceTo(state,target);observe();
    const milliseconds=performance.now()-started;metrics.engineAdvanceCalls++;metrics.engineWallMilliseconds+=milliseconds;
    if(milliseconds>(metrics.slowestAdvance?.milliseconds||0))metrics.slowestAdvance={from,to:target,milliseconds:round(milliseconds)};
  }
  function ensureSession() {
    while(state.worldTimeMs<endAt){
      const session=campaignSessionAt(state.worldTimeMs,startAt,days);
      if(session.finished)return false;
      if(!session.active){advanceWorld(session.nextAt);continue;}
      if(currentSession!==session.key){currentSession=session.key;metrics.sessions++;recordVisit(state,state.worldTimeMs);}
      return true;
    }
    return false;
  }
  function consumeActive(seconds) {
    let remaining=seconds;
    while(remaining>1e-8&&ensureSession()){
      const session=campaignSessionAt(state.worldTimeMs,startAt,days);
      const duration=Math.min(remaining,(session.endAt-state.worldTimeMs)/1000);
      advanceWorld(state.worldTimeMs+duration*1000);metrics.activeSeconds+=duration;remaining-=duration;
    }
    return remaining<=1e-8;
  }
  function command(action, seconds = 1) {
    if(forbidden.has(action.type)||action.rewardedAdVerified||action.paymentVerified)throw new Error('The free planner cannot authorize cash, advertisements or outside rewards.');
    if(!ensureSession())return {ok:false,code:'planner-horizon',message:'The observation horizon ended.'};
    act(state,{type:'userActivity',visible:true,focused:true},state.worldTimeMs);
    const result=act(state,action,state.worldTimeMs);
    metrics.commands++;metrics.actionCounts[action.type]=(metrics.actionCounts[action.type]||0)+1;
    if(!result.ok){metrics.commandFailures.push({at:state.worldTimeMs,action:copy(action),message:result.message});metrics.commandFailures=metrics.commandFailures.slice(-30);}
    observe();consumeActive(seconds);return result;
  }
  function bootstrap() {
    if(bootstrapped)return;
    // Finishing the optional interface tour is a normal player choice. Its
    // paused world clock grants neither simulated production nor phantom time.
    for(const action of [{type:'onboardingNext'},{type:'onboardingName',name:'Planista'},{type:'onboardingFinish'}]){
      const result=act(state,action,state.worldTimeMs);if(!result.ok)throw new Error(result.message);
      metrics.commands++;metrics.actionCounts[action.type]=1;
    }
    bootstrapped=true;recordVisit(state,state.worldTimeMs);observe();
  }
  function required(action, seconds=1) { const r=command(action,seconds);if(!r.ok){const error=new Error(JSON.stringify({action,result:r,checkpoint:snapshot()}));error.code=r.code;throw error;}return r; }

  function tutorialStep() {
    if(tutorialStatus(state).finished)return false;
    const rows=tutorialRows(state);
    const claim=rows.find(row=>row.canClaim);
    if(claim){required({type:'claimTutorial',taskId:claim.id});return true;}
    const pending=rows.find(row=>row.pendingDecision);
    if(pending){required({type:'skipTutorialShare',taskId:pending.id});return true;}
    const row=rows.find(row=>!row.completed), lesson=TUTORIAL_LESSONS.find(item=>item.id===row?.id);
    if(!lesson)throw new Error('The practical course has no actionable unfinished lesson.');
    if(lesson.kind==='condition'){consumeActive(10);return true;}
    if(lesson.guidedService==='construction'){
      let guide=tutorialGuides.get(lesson.id);
      if(!guide){
        if(lesson.id==='townhall-upgrade')required({type:'prepareTutorialUpgrade'});
        const started=required({type:state.buildings[lesson.route].level?'upgrade':'build',building:lesson.route});
        guide={project:started.project.order,phase:0};tutorialGuides.set(lesson.id,guide);
      }
      if(guide.phase===0){required({type:'premiumTransport',route:'construction',project:guide.project});guide.phase++;}
      if(guide.phase===1){required({type:'premiumAccelerate',project:guide.project,percent:100});guide.phase++;}
      return true;
    }
    if(lesson.guidedService==='full-purchase'){required({type:'premiumBuyBuilding',building:lesson.route});return true;}
    if(lesson.guidedService==='pickup'){
      required({type:'assign',building:'warehouse',delta:1});required({type:'warehousePriority',priorities:['construction','grain']});return true;
    }
    if(lesson.subject.startsWith('assign-')){
      const building=lesson.subject.slice(7),requiredCount=lesson.assignmentCount||1;
      if(state.buildings[building].workers<requiredCount)required({type:'assign',building,delta:requiredCount-state.buildings[building].workers});
      else consumeActive(1);
      return true;
    }
    if(lesson.subject.startsWith('upgrade-')&&lesson.subject!=='upgrade-road'){
      if(lesson.id==='townhall-upgrade')required({type:'prepareTutorialUpgrade'});
      const building=lesson.subject.slice(8);required({type:state.buildings[building].level?'upgrade':'build',building});return true;
    }
    if(lesson.subject==='transport-priority')required({type:'warehousePriority',priorities:['construction']});
    else if(lesson.subject==='house-points'){
      if(state.houseHappinessPool.points>0)required({type:'houseHappinessAll',amount:1});else consumeActive(60);
    }else if(lesson.subject==='upgrade-road')required({type:'upgradeRoad',level:1});
    else if(lesson.subject==='buy-attraction'){
      const offer=leisureOffers(state).filter(item=>item.available&&item.price<=state.resources.coins).sort((a,b)=>a.price-b.price)[0];
      if(!offer)throw new Error('No affordable attraction in the real course.');required({type:'buyAttraction',id:offer.id});
    }else if(lesson.subject==='chapel-blessing')required({type:'blessing'});
    else if(lesson.subject==='task-complete'){
      const task=state.lighthouseTasks.find(task=>task.tutorialStarter||task.tutorial||task.id.startsWith('tutorial-'));
      if(!task)throw new Error('The starter task is unavailable.');
      required({type:'taskAccept',task:task.id});required({type:'confirmTaskAcceptance',task:task.id});
      for(const[resource,amount]of Object.entries(task.requirements))required({type:'taskDeposit',task:task.id,resource,amount});
      const achievement=state.taskAchievements.find(item=>item.taskId===task.id);if(achievement)required({type:'skipTaskAchievement',id:achievement.id});
    }else if(lesson.subject==='expedition-complete'){
      required({type:'expeditionStart',expedition:'misty',gameKind:'triples'});const run=state.expeditionRuns.misty;
      for(let symbol=0;symbol<run.miniGame.symbolCount;symbol++)for(let index=0;index<run.miniGame.cards.length;index++)if(run.miniGame.cards[index]===symbol)required({type:'expeditionMiniGameReveal',runId:run.id,index});
      required({type:'expeditionCashout',runId:run.id});
    }else if(lesson.subject==='finish-tutorial')required({type:'finishTutorial'});
    else throw new Error('Unsupported practical lesson '+lesson.subject);
    return true;
  }

  function desiredStaff() {
    const n=state.population, town=state.buildings.townhall.level;
    const dock=town>=4?Math.min(2,workerLimit(state,'dock')):0;
    const carrier=Math.min(workerLimit(state,'warehouse'),Math.max(3,Math.ceil(n*.12)));
    const factor=(state.lighthouseRemaining>0?2:1)*(state.resources.food>=1||state.foodCredit>0?1:.5);
    const r=Object.fromEntries(PRODUCERS.map(id=>[id,Math.max(1,productionRate(state,id)*factor)]));
    const meals=foodDemandPerHour(state);
    const available=Math.max(0,n-carrier-dock),fixed=meals*(2/r.farm+1/r.windmill);
    const unit=3/r.farm+1/r.windmill+3/r.lumber+1/r.sawmill+1/r.quarry;
    const q=Math.max(0,(available-fixed)/unit);
    const desired={warehouse:carrier,dock,market:0,
      farm:Math.max(2,Math.floor((3*q+2*meals)/r.farm)),windmill:Math.max(1,Math.floor((q+meals)/r.windmill)),
      lumber:Math.max(3,Math.floor(3*q/r.lumber)),sawmill:Math.max(1,Math.floor(q/r.sawmill)),quarry:Math.max(1,Math.floor(q/r.quarry))};
    for(const id of WORKPLACES)desired[id]=Math.min(workerLimit(state,id),desired[id]);
    let used=Object.values(desired).reduce((a,b)=>a+b,0);
    while(used>n){const id=['quarry','lumber','farm','warehouse','sawmill','windmill','dock'].find(id=>desired[id]>(['warehouse','farm','lumber'].includes(id)?id==='warehouse'?3:2:['windmill','sawmill','quarry'].includes(id)?1:0));if(!id)break;desired[id]--;used--;}
    for(const id of ['farm','quarry','lumber','windmill','sawmill','warehouse','market','dock'])while(used<n&&desired[id]<workerLimit(state,id)){desired[id]++;used++;if(id==='farm'&&desired[id]>Math.ceil((3*q+2*meals)/r.farm))break;}
    return desired;
  }
  function balanceStaff(force=false) {
    if(!force&&state.worldTimeMs-lastStaffAt<30*60000)return false;
    lastStaffAt=state.worldTimeMs;const desired=desiredStaff();let changed=false;
    // Recalls are real commands: loaded carriers finish their trip and every
    // released resident must complete the actual two-minute Home journey.
    for(const id of WORKPLACES){const delta=desired[id]-state.buildings[id].workers;if(delta<0){const r=command({type:'assign',building:id,delta});changed ||= r.ok;}}
    for(const id of WORKPLACES){const delta=Math.min(desired[id]-state.buildings[id].workers,state.residents.filter(residentAtHome).length);if(delta>0){const r=command({type:'assign',building:id,delta});changed ||= r.ok;}}
    return changed;
  }
  function orderUpgrade(building) {
    if(hasProject(state,building)||slots(state)>=2||!upgradeEligibility(state,building).ok||!canAfford(state,buildingCost(state,building)))return false;
    return command({type:state.buildings[building].level?'upgrade':'build',building}).ok;
  }
  function infrastructureStep(m) {
    const town=state.buildings.townhall.level;
    const nextPop=town>=3?18*town:Math.min(48,state.population+18);
    const houseTarget=Math.min(town,Math.ceil(Math.max(state.population+12,nextPop)/24));
    if(state.buildings.house.level<houseTarget&&orderUpgrade('house'))return true;
    const needed=500*Math.min(targetLevel,town+1)*1.25;
    let warehouseTarget=1;while(warehouseTarget<town&&warehouseCapacityForLevel(warehouseTarget).perResource<needed+50*warehouseTarget)warehouseTarget++;
    if(state.buildings.warehouse.level<warehouseTarget&&orderUpgrade('warehouse'))return true;
    const producerTarget=Math.min(town,Math.max(2,Math.ceil(state.population/48)));
    const bottleneck=PRODUCERS.filter(id=>state.buildings[id].level<producerTarget).sort((a,b)=>state.buildings[a].level-state.buildings[b].level);
    for(const id of bottleneck)if(orderUpgrade(id))return true;
    if(m?.task?.objective?.type==='building'&&orderUpgrade(m.task.objective.building))return true;
    if(town<targetLevel&&(!m.available||m.finished||m.chapter.level>=town)&&orderUpgrade('townhall'))return true;
    return false;
  }
  function sellSurplus(m) {
    if(state.buildings.townhall.level<4||!activeWorkerCount(state,'dock')||state.dock.orders.some(order=>!['complete','expired'].includes(order.stage)))return false;
    const cost=m?.task?.objective?.type==='building'?buildingCost(state,m.task.objective.building):buildingCost(state,'townhall');
    const needCoins=Math.max(cost?.coins||0,500*state.buildings.townhall.level);
    if(state.resources.coins>=needCoins*1.25)return false;
    for(const resource of ['planks','stone','wood','grain']){
      const reserve=Math.max(cost?.[resource]||0,500*state.buildings.townhall.level);
      const amount=Math.min(1000,Math.floor(Math.max(0,availableGoods(state,resource)-reserve)/100)*100);
      if(amount<100)continue;
      const action={type:'trade',direction:'sell',resource,amount};if(quoteTrade(state,action).ok)return command(action).ok;
    }
    return false;
  }
  function mazeWaypoints(p) {
    const g=p.data.miniGame,cell=184,position=b=>Math.max(0,Math.min(8,Math.floor((b.y-24)/cell)*3+Math.floor((b.x-24)/cell)));
    const start=position(g.balls[0]),goal=position(g.goals[0]),queue=[start],prev=new Map([[start,null]]),xy=i=>({x:24+(i%3+.5)*cell,y:24+(Math.floor(i/3)+.5)*cell});
    for(const i of queue){if(i===goal)break;const a=xy(i);for(const j of[i-3,i+3,i-1,i+1]){if(j<0||j>8||Math.abs(Math.floor(i/3)-Math.floor(j/3))+Math.abs(i%3-j%3)!==1||prev.has(j))continue;const b=xy(j),x=(a.x+b.x)/2,y=(a.y+b.y)/2;if(g.walls.some(w=>x>=w.x&&x<=w.x+w.width&&y>=w.y&&y<=w.y+w.height))continue;prev.set(j,i);queue.push(j);}}
    if(!prev.has(goal))throw new Error('The real generated marble board has no route.');const path=[];for(let i=goal;i!==null;i=prev.get(i))path.unshift(xy(i));return path.slice(1);
  }
  function solveAdventure(startAction) {
    const started=command(startAction);if(!started.ok)return false;
    const run=state.adventures.active, minSeconds=run.kind==='escapeStory'?15*60:5*60;
    const began=metrics.activeSeconds;let guard=0;
    while(state.adventures.active?.id===run.id&&state.adventures.active.stage!=='complete'&&state.worldTimeMs<endAt){
      if(++guard>10000)throw new Error('A puzzle exceeded the bounded actual-input solver.');
      const p=state.adventures.active.data.puzzle;
      if(!p)throw new Error('The campaign requested a non-puzzle adventure.');
      if(p.kind==='marbleMaze'){
        for(const goal of mazeWaypoints(p))for(let step=0;step<600&&!p.solved&&state.worldTimeMs<endAt;step++){
          const b=p.data.miniGame.balls[0],dx=goal.x-b.x,dy=goal.y-b.y;
          if(Math.hypot(dx,dy)<6&&Math.hypot(b.vx,b.vy)<22)break;
          required({type:'adventureInput',adventureId:run.id,command:'puzzleMove',move:{type:'tilt',tiltX:Math.max(-1,Math.min(1,dx*.018-b.vx*.014)),tiltY:Math.max(-1,Math.min(1,dy*.018-b.vy*.014))}},.05);
        }
      }else for(const move of islandPuzzleSolution(p)){if(p.solved||state.worldTimeMs>=endAt)break;required({type:'adventureInput',adventureId:run.id,command:'puzzleMove',move});}
      if(state.worldTimeMs>=endAt)return true;
      if(!p.solved)throw new Error('A real-input puzzle solver did not solve '+p.kind);
      const story=state.adventures.active.data.story;
      if(!story||story.roomIndex===story.roomCount-1){
        // Inspection/solving time is an explicit strategy assumption. Delay
        // the actual final claim so its goods/people never arrive prematurely.
        consumeActive(Math.max(0,minSeconds-(metrics.activeSeconds-began)));
        if(state.worldTimeMs>=endAt)return true;
      }
      required({type:'adventureInput',adventureId:run.id,command:'puzzleNextRoom'});
    }
    if(state.adventures.active?.stage==='complete'){
      metrics[run.kind==='escapeStory'?'stories':'puzzles']++;
    }
    return true;
  }
  function missionStep() {
    const m=currentMission();if(!m.available)return false;
    const t=m.task,o=t.objective;
    if(o.type==='review')return command({type:'missionReview',id:t.id}).ok;
    if(o.type==='adventure'){
      const action={type:'adventureStart',kind:o.kind,...(o.storyId?{storyId:o.storyId}:{}),...(o.puzzleKind?{puzzleKind:o.puzzleKind}:{})};
      if(o.recruitmentTarget&&missionAssistanceOffer(state,context))action.assistanceMissionId=t.id;
      return solveAdventure(action);
    }
    if(['invitation','recruitment'].includes(o.type)){
      if(missionAssistanceOffer(state,context))return solveAdventure({type:'adventureStart',kind:'escapeStory',assistanceMissionId:t.id});
      return false;
    }
    if(o.type==='building')return orderUpgrade(o.building);
    if(['production','delivered'].includes(o.type)&&!m.active)return command({type:'missionStart',id:t.id}).ok;
    if(o.type==='contribute'){
      if(!m.active){if(!command({type:'missionStart',id:t.id}).ok)return false;}
      const current=currentMission();if(current.task?.id!==t.id)return true;
      if(!current.active)return false;
      for(const[resource,amount]of Object.entries(t.requirements)){
        const left=amount-(t.deposited[resource]||0),quantity=Math.min(left,availableGoods(state,resource));
        if(quantity>0)return command({type:'missionDeposit',id:t.id,resource,amount:quantity}).ok;
      }
      return false;
    }
    if(o.type==='shipping'){
      if(state.dock.orders.some(order=>order.direction==='buy'&&order.id>o.baseline&&!['complete','expired'].includes(order.stage)))return false;
      const room=warehouseLimits(state);const resource=GOODS.find(id=>room.perResource-ordinaryStock(state,id)>=100)||'wood';
      const action={type:'trade',direction:'buy',resource,amount:100};if(quoteTrade(state,action).ok)return command(action).ok;
    }
    if(o.type==='check'&&o.check==='storageRoom')return sellSurplus(m);
    return false;
  }
  function step() {
    bootstrap();if(!ensureSession())return false;
    if(++decisions>(options.maxDecisions??200000))throw new Error('The planner reached its decision safety limit.');
    const before=state.worldTimeMs;
    if(tutorialStep())return true;
    const loyalty=loyaltyStatus(state);if(loyalty.eligible){command({type:'claimLoyalty'});return true;}
    if(dailyBlessingStatus(state).available&&!state.blessingRemaining){const r=command({type:'blessing'});if(r.ok)return true;}
    if(state.houseHappinessPool.points>0&&state.happiness<80){if(command({type:'houseHappinessAll',amount:Infinity}).ok)return true;}
    if(balanceStaff())return true;
    const m=currentMission();
    if(missionStep())return true;
    if(infrastructureStep(m))return true;
    if(sellSurplus(m))return true;
    // Real activity sustains the ordinary five-minute engagement window; the
    // model still spends most of each calendar day offline at its own rates.
    command({type:'userActivity',visible:true,focused:true},Math.min(60,Math.max(1,(endAt-state.worldTimeMs)/1000)));
    if(state.worldTimeMs===before)throw new Error('A planner decision failed to advance time.');
    idleDecisions++;return true;
  }
  function report(error=null) {
    const final=snapshot(),reached=metrics.milestones.find(m=>m.level>=targetLevel);
    const completed=metrics.campaignMilestones.find(m=>m.completed.includes(20));
    return {version:'0.14.0.0',kind:'actual-command-driven-free-player-plan',
      assumptions:['Fresh normal state: no edited Coins, people, building levels or progress flags.','Three one-hour sessions at08:00/14:00/20:00 Warsaw on the default winter calendar; offline simulation between sessions.','Deterministic perfect-information puzzle solver sends legal inputs, not solved/completion flags. At least5active minutes per standalone puzzle and15per connected story.','Normal earned coin services are used only when the practical course teaches them. No real money, advertisements, referrals, other-player gifts or unlimited expedition farm.','Actual NPC purchases needed by story and sales of produced surplus are allowed; all cargo needs real Port workers and time.','This is one automated strategy, not a retention forecast, a human playtest or a guarantee for every strategy.'],
      horizonDays:days,targetLevel,targetReached:!!reached,targetReachedDay:reached?.elapsedDays??null,
      campaignCompleted:!!completed,campaignCompletedDay:completed?.elapsedDays??null,
      elapsedDays:round((state.worldTimeMs-startAt)/DAY),stopReason:error?String(error.message||error):state.worldTimeMs>=endAt?'observation-horizon':'stopped',
      ...copy(metrics),activeHours:round(metrics.activeSeconds/3600),decisions,idleDecisions,final};
  }
  return {state,step,report,snapshot,command,bootstrap};
}

export function simulateCampaignV31(options = {}) {
  const planner=createCampaignPlanner(options);
  try{while(planner.step());return planner.report();}catch(error){if(error.code==='planner-horizon')return planner.report();if(options.throwOnError)throw error;return planner.report(error);}
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const i=process.argv.indexOf('--days'),days=i<0?50:Number(process.argv[i+1]);
  const result=simulateCampaignV31({days,onCheckpoint:s=>process.stderr.write(`day${s.elapsedDays} TH${s.level} pop${s.population} coins${Math.floor(s.resources.coins)} mission${s.mission?.chapter||'-'}/${s.mission?.index||'-'}\n`)});
  console.log(JSON.stringify(result,null,2));
  if(result.stopReason!=='observation-horizon')process.exitCode=1;
}
