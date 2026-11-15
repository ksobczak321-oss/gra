import { developmentText } from './harborlight-v1-development-copy.js?v=frontend-v32-10';
import { normalizeExpeditionHour, allocateExpeditionAttemptId, reserveExpeditionDifficulty, recordExpeditionOutcome, expeditionHourStatus, cappedExpeditionReward } from './harborlight-v1-expedition-hour.js?v=frontend-v32-10';

export const ORIGINAL_PUZZLE_VERSION = 1;
export const originalPuzzleCatalog = Object.freeze([
  { id: 'signal-line', name: 'Sieć latarnika', description: 'Połącz przekaźniki portu jednym ruchem. Przeprowadź sygnał przez każdy przewód dokładnie raz.' },
  { id: 'harbor-routes', name: 'Konwoje na redzie', description: 'Wypraw konwoje w odpowiedniej kolejności. Strzałka wskazuje wyjście; inne konwoje mogą je blokować.' }
]);
const variants = new Set(originalPuzzleCatalog.map(x => x.id));
const finite = (x, fallback = 0) => Number.isFinite(x) ? Math.max(0, x) : fallback;
const integer = (x, fallback = 0) => Number.isSafeInteger(x) && x >= 0 ? x : fallback;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const nowOf = state => finite(state.worldTimeMs, Date.now());
const good = (message, extra = {}) => ({ ok: true, message, ...extra });
const bad = (message, code = 'invalid-input') => ({ ok: false, message, code });
const nodeKey = (x,y) => `${x},${y}`;
const edgeKey = (a,b) => [a,b].sort().join('|');
const directions = [[1,0],[0,1],[-1,0],[0,-1]];
function randomSource(seed) { let value = (integer(seed,1) >>> 0) || 1; return () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; }; }
function shuffled(values, random) { const copy = [...values]; for(let i=copy.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; } return copy; }

export function createSignalGraph(difficulty = 1, seed = 1) {
  const random = randomSource(seed), nodes = new Map(), edges = new Map();
  const point = (x,y) => { const id=nodeKey(x,y); if(!nodes.has(id))nodes.set(id,{id,x,y});return id; };
  const add = (a,b) => edges.set(edgeKey(a,b),{id:edgeKey(a,b),a,b});
  point(0,0);
  const loops = Math.min(14,3+Math.floor(Math.log2(Math.max(1,difficulty)))*2);
  for(let i=0;i<loops;i++) {
    let added=false;
    const anchors=shuffled([...nodes.values()],random);
    for(const a of anchors) {
      for(const [dx,dy] of shuffled([[1,1],[1,-1],[-1,1],[-1,-1]],random)) {
        const coords=[[a.x,a.y],[a.x+dx,a.y],[a.x+dx,a.y+dy],[a.x,a.y+dy]];
        if(coords.some(([x,y])=>Math.abs(x)>5||Math.abs(y)>5))continue;
        const ids=coords.map(([x,y])=>nodeKey(x,y));
        if(ids.some((id,j)=>edges.has(edgeKey(id,ids[(j+1)%4]))))continue;
        for(const [x,y] of coords)point(x,y);
        ids.forEach((id,j)=>add(id,ids[(j+1)%4]));added=true;break;
      }
      if(added)break;
    }
    if(!added)break;
  }
  const anchors=shuffled([...nodes.values()],random);
  outer:for(const a of anchors)for(const [dx,dy] of shuffled(directions,random)) {
    const b=nodeKey(a.x+dx,a.y+dy);
    if(edges.has(edgeKey(a.id,b)))continue;
    point(a.x+dx,a.y+dy);add(a.id,b);break outer;
  }
  const values=[...nodes.values()], minX=Math.min(...values.map(n=>n.x)),minY=Math.min(...values.map(n=>n.y));
  const degree=Object.fromEntries(values.map(n=>[n.id,0]));for(const e of edges.values()){degree[e.a]++;degree[e.b]++;}
  return { nodes:values.map(n=>({...n,x:n.x-minX+1,y:n.y-minY+1})), edges:[...edges.values()], starts:values.filter(n=>degree[n.id]%2).map(n=>n.id), width:Math.max(...values.map(n=>n.x))-minX+2,height:Math.max(...values.map(n=>n.y))-minY+2 };
}
export function createHarborRoutes(difficulty = 1, seed = 1) {
  const random=randomSource(seed), size=clamp(5+Math.floor(Math.log2(Math.max(1,difficulty))),5,9), paths=[],occupied=new Set();
  const inside=(x,y)=>x>=0&&x<size&&y>=0&&y<size;
  const target=Math.min(18,5+Math.floor(Math.log2(Math.max(1,difficulty)))*2);
  for(let order=0;order<target;order++) {
    let found=null;
    const heads=shuffled(Array.from({length:size*size},(_,i)=>[i%size,Math.floor(i/size)]),random);
    for(const [x,y] of heads) {
      if(occupied.has(nodeKey(x,y)))continue;
      for(const dir of shuffled(directions,random)) {
        const [dx,dy]=dir, bx=x-dx,by=y-dy;
        if(!inside(bx,by)||occupied.has(nodeKey(bx,by)))continue;
        let clear=true;for(let px=x+dx,py=y+dy;inside(px,py);px+=dx,py+=dy)if(occupied.has(nodeKey(px,py))){clear=false;break;}
        if(!clear)continue;
        const cells=[[x,y],[bx,by]],used=new Set(cells.map(c=>nodeKey(...c)));
        const desired=2+Math.floor(random()*4);
        while(cells.length<desired) {
          const tail=cells.at(-1),options=shuffled(directions,random).map(([tx,ty])=>[tail[0]+tx,tail[1]+ty]).filter(([px,py])=>inside(px,py)&&!occupied.has(nodeKey(px,py))&&!used.has(nodeKey(px,py)));
          if(!options.length)break;
          const next=options[0];cells.push(next);used.add(nodeKey(...next));
        }
        found={id:`convoy-${order+1}`,cells:cells.reverse(),direction:[dx,dy],order};break;
      }
      if(found)break;
    }
    if(!found)break;
    found.cells.forEach(c=>occupied.add(nodeKey(...c)));paths.push(found);
  }
  return { size,paths,removed:[] };
}
export function availableConvoyIds(board) {
  const removed=new Set(board.removed||[]),active=board.paths.filter(p=>!removed.has(p.id)),occupied=new Map();
  for(const p of active)for(const cell of p.cells)occupied.set(nodeKey(...cell),p.id);
  return active.filter(p=>{
    const [x,y]=p.cells.at(-1),[dx,dy]=p.direction;
    for(let px=x+dx,py=y+dy;px>=0&&py>=0&&px<board.size&&py<board.size;px+=dx,py+=dy) { const other=occupied.get(nodeKey(px,py));if(other&&other!==p.id)return false; }
    return true;
  }).map(p=>p.id);
}
export function createOriginalAttempt(variant,{seed=1,difficulty=1,now=0,id='original-1',highestTownhall=1,easier=false}={}) {
  if(!variants.has(variant))throw new TypeError('Unknown original puzzle.');
  difficulty=clamp(integer(difficulty,1),1,1000000);
  const effective=easier?Math.max(1,Math.ceil(difficulty/2)):difficulty;
  const duration=Math.max(90,(variant==='signal-line'?180:150)-Math.min(60,Math.floor(Math.log2(effective))*5));
  return {version:1,id,variant,seed:integer(seed,1),difficulty,effectiveDifficulty:effective,easier:easier===true,rewardScale:easier?.5:1,highestTownhall:Math.max(1,integer(highestTownhall,1)),status:'active',remaining:duration,initialDuration:duration,startedAt:finite(now),lastAt:finite(now),timeOffer:null,offerArmed:duration>30,extensions:0,trail:[],usedEdges:[],hintUsed:false,hint:null,message:'',rewardClaimed:false,
    board:variant==='signal-line'?createSignalGraph(effective,seed):createHarborRoutes(effective,seed)};
}
function signalInput(attempt,input) {
  const graph=attempt.board;
  if(input.kind==='clear') {attempt.trail=[];attempt.usedEdges=[];return good('Rysunek wyczyszczony. Czas próby biegnie dalej.');}
  if(input.kind==='lift') {
    if(attempt.trail.length&&!attempt.usedEdges.length)return good('Wybierz pierwszy przewód.');
    if(attempt.usedEdges.length<graph.edges.length){attempt.trail=[];attempt.usedEdges=[];return bad('Połącz całą sieć jednym ruchem. Spróbuj jeszcze raz.','stroke-lifted');}
    return good('Sieć połączona.');
  }
  if(input.kind!=='node'||!graph.nodes.some(n=>n.id===input.node))return bad('Wskaż przekaźnik na planszy.');
  if(!attempt.trail.length) {
    if(graph.starts.length&& !graph.starts.includes(input.node))return bad('Rozpocznij w jednym z dwóch portów oznaczonych kotwicą.');
    attempt.trail=[input.node];return good('Prowadź sygnał przez każdy przewód raz.');
  }
  const from=attempt.trail.at(-1);if(from===input.node)return good('Wybierz następny przekaźnik.');
  const edge=graph.edges.find(e=>e.id===edgeKey(from,input.node));
  if(!edge)return bad('Te przekaźniki nie mają bezpośredniego przewodu.');
  if(attempt.usedEdges.includes(edge.id))return bad('Ten przewód został już użyty.');
  attempt.usedEdges.push(edge.id);attempt.trail.push(input.node);
  if(attempt.usedEdges.length===graph.edges.length)attempt.status='won';
  return good(attempt.status==='won'?'Sygnał dotarł do całej przystani!':'Przewód połączony.');
}
export function applyOriginalInput(attempt,input={}) {
  if(attempt.status!=='active'||attempt.timeOffer)return bad('Próba nie przyjmuje teraz ruchów.');
  if(attempt.variant==='signal-line')return signalInput(attempt,input);
  if(input.kind!=='convoy')return bad('Wybierz konwój do wypłynięcia.');
  if(attempt.board.removed.includes(input.id))return bad('Ten konwój już wypłynął.');
  if(!attempt.board.paths.some(p=>p.id===input.id))return bad('Nie ma takiego konwoju.');
  if(!availableConvoyIds(attempt.board).includes(input.id))return bad('Inny konwój blokuje wyjście. Najpierw zwolnij trasę.','route-blocked');
  attempt.board.removed.push(input.id);
  if(attempt.board.removed.length===attempt.board.paths.length)attempt.status='won';
  return good(attempt.status==='won'?'Wszystkie konwoje bezpiecznie opuściły redę!':'Konwój wypłynął.');
}
export function advanceOriginalAttempt(attempt,seconds) {
  seconds=finite(seconds);if(attempt.status!=='active'||!seconds)return;
  let left=seconds;
  if(attempt.timeOffer) {
    if(attempt.timeOffer.status==='processing')return;
    const used=Math.min(left,attempt.timeOffer.choiceRemaining);attempt.timeOffer.choiceRemaining-=used;left-=used;
    if(attempt.timeOffer.choiceRemaining>1e-9)return;
    attempt.timeOffer=null;
  }
  if(attempt.offerArmed&&attempt.remaining>30&&attempt.remaining-left<=30) {
    const run=attempt.remaining-30;attempt.remaining=30;left-=run;
    attempt.offerArmed=false;attempt.timeOffer={status:'choice',choiceRemaining:5};
    if(left>0)advanceOriginalAttempt(attempt,left);return;
  }
  attempt.remaining=Math.max(0,attempt.remaining-left);
  if(attempt.remaining<=1e-9){attempt.remaining=0;attempt.status='lost';attempt.message='Czas próby minął.';}
}
function cleanAttempt(raw) {
  if(raw?.version!==1||!variants.has(raw.variant)||typeof raw.id!=='string'||!raw.id||!Number.isSafeInteger(raw.seed)||!Number.isSafeInteger(raw.difficulty))return null;
  const attempt=createOriginalAttempt(raw.variant,{...raw,now:finite(raw.startedAt)});
  if(!['active','won','lost','abandoned'].includes(raw.status))return null;
  attempt.status=raw.status;attempt.remaining=clamp(finite(raw.remaining),0,86400);attempt.initialDuration=clamp(finite(raw.initialDuration,attempt.initialDuration),1,86400);attempt.lastAt=finite(raw.lastAt,attempt.startedAt);attempt.offerArmed=raw.offerArmed===true;attempt.extensions=integer(raw.extensions);attempt.hintUsed=raw.hintUsed===true;attempt.rewardClaimed=raw.rewardClaimed===true;attempt.message=typeof raw.message==='string'?raw.message.slice(0,500):'';
  if(raw.timeOffer&&['choice','processing'].includes(raw.timeOffer.status))attempt.timeOffer={status:raw.timeOffer.status,choiceRemaining:clamp(finite(raw.timeOffer.choiceRemaining),0,5),method:['coins','ad'].includes(raw.timeOffer.method)?raw.timeOffer.method:null,receipt:typeof raw.timeOffer.receipt==='string'?raw.timeOffer.receipt:null};
  if(raw.civilianRescue&&typeof raw.civilianRescue.originIslandId==='string'&&raw.civilianRescue.originIslandId.length<=120)attempt.civilianRescue={originIslandId:raw.civilianRescue.originIslandId,startTH:Math.max(1,integer(raw.civilianRescue.startTH,1)),requested:integer(raw.civilianRescue.requested)};
  if(raw.rescueOutcome&&typeof raw.rescueOutcome==='object')attempt.rescueOutcome={rescued:integer(raw.rescueOutcome.rescued),waiting:integer(raw.rescueOutcome.waiting)};
  // Board position is deliberately not saved. Re-entry fails the current attempt;
  // completed attempts retain their result and reward receipt, not a fresh clock.
  if(raw.status==='active'){attempt.status='lost';attempt.timeOffer=null;attempt.message='Po opuszczeniu planszy bieżąca próba została zakończona.';}
  if(raw.status==='won'){
    attempt.status='active';let valid=true;
    const inputs=attempt.variant==='signal-line'?(Array.isArray(raw.trail)?raw.trail:[]).slice(0,attempt.board.edges.length+2).map(node=>({kind:'node',node})):(Array.isArray(raw.board?.removed)?raw.board.removed:[]).slice(0,attempt.board.paths.length+1).map(id=>({kind:'convoy',id}));
    for(const input of inputs)if(!applyOriginalInput(attempt,input).ok){valid=false;break;}
    if(!valid||attempt.status!=='won'){attempt.status='lost';attempt.rewardClaimed=false;attempt.trail=[];attempt.usedEdges=[];if(attempt.variant==='harbor-routes')attempt.board.removed=[];attempt.message='Nie udało się potwierdzić rozwiązania zapisanej planszy. Rozpocznij nową próbę.';}
  }
  return attempt;
}
export function normalizeOriginalPuzzles(state,raw=state) {
  if(state.originalPuzzles?.version===1&&raw===state)return state.originalPuzzles;
  const source=raw.originalPuzzles||{},attempts={};
  for(const [variant,row] of Object.entries(source.attempts||{})) {const attempt=cleanAttempt(row);if(attempt&&variant===attempt.variant)attempts[variant]=attempt;}
  state.originalPuzzles={version:1,sequence:integer(source.sequence),seed:integer(source.seed,0x41c6ce57),attempts,failures:Object.fromEntries([...variants].map(v=>[v,integer(source.failures?.[v])])),receipts:(Array.isArray(source.receipts)?source.receipts:[]).filter(x=>typeof x==='string').slice(-512)};
  normalizeExpeditionHour(state,raw);
  for(const [variant,attempt] of Object.entries(attempts))if(attempt.status==='lost'||attempt.status==='abandoned') {
    if(recordExpeditionOutcome(state,attempt.id,attempt.status==='abandoned'?'abandoned':'lost',variant))state.originalPuzzles.failures[variant]++;
  }
  return state.originalPuzzles;
}
function current(state) {return state.originalPuzzles?.version===1?state.originalPuzzles:normalizeOriginalPuzzles(state,state);}
function settleOutcome(state,attempt,context={}) {
  const ledger=current(state);
  if(attempt.status==='won') {
    if(recordExpeditionOutcome(state,attempt.id,'won',attempt.variant)){ledger.failures[attempt.variant]=0;context.onWin?.(attempt);}
  } else if(['lost','abandoned'].includes(attempt.status)) {
    if(recordExpeditionOutcome(state,attempt.id,attempt.status==='abandoned'?'abandoned':'lost',attempt.variant)){ledger.failures[attempt.variant]=expeditionHourStatus(state,attempt.variant).failures;context.onLoss?.(attempt);}
  }
}
function hintFor(attempt) {
  if(attempt.variant==='harbor-routes')return {convoyId:availableConvoyIds(attempt.board)[0]||null,text:'Poszukaj konwoju, przed którego strzałką nie stoi żaden inny.'};
  const used=new Set(attempt.usedEdges),from=attempt.trail.at(-1)||attempt.board.starts[0],adj=new Map(attempt.board.nodes.map(n=>[n.id,[]]));
  for(const e of attempt.board.edges)if(!used.has(e.id)){adj.get(e.a).push([e.b,e.id]);adj.get(e.b).push([e.a,e.id]);}
  const stack=[from],route=[],seen=new Set();while(stack.length){const list=adj.get(stack.at(-1));while(list.length&&seen.has(list.at(-1)[1]))list.pop();if(list.length){const[next,id]=list.pop();seen.add(id);stack.push(next);}else route.push(stack.pop());}
  if(seen.size!==attempt.board.edges.length-used.size)return{node:from,edgeId:null,text:'Ten rysunek odciął część sieci. Wyczyść go i zacznij od kotwicy, pozostawiając dojście do drugiego portu.'};
  route.reverse();return{node:from,edgeId:route.length>1?edgeKey(route[0],route[1]):null,text:attempt.trail.length?'Wyróżniony przewód zachowuje drogę przez całą pozostałą sieć.':'Rozpocznij w wyróżnionym porcie. Wskazany przewód pozostawia drogę do drugiej kotwicy.'};
}
export function originalPuzzleAction(state,action={},context={}) {
  if(!String(action.type||'').startsWith('originalPuzzle'))return null;
  const ledger=current(state),variant=action.variant||context.variant||'signal-line';
  if(variants.has(variant))ledger.failures[variant]=expeditionHourStatus(state,variant).failures;
  if(!variants.has(variant))return bad('Wybierz dostępną minigrę.');
  const at=finite(context.now,nowOf(state));let attempt=ledger.attempts[variant];
  if(action.type==='originalPuzzleStart'||action.type==='originalPuzzleEasier') {
    if(attempt?.status==='active')return bad(developmentText('MSG-ACTIVE-VARIANT-LIMIT'),'active-round-exists');
    const easier=action.type==='originalPuzzleEasier';
    if(easier&&ledger.failures[variant]<3)return bad('Łatwiejsza odmiana jest dostępna po trzech porażkach.');
    ledger.sequence++;const id=allocateExpeditionAttemptId(state,variant);
    let difficulty;try{difficulty=reserveExpeditionDifficulty(state,id,variant);}catch(e){return bad(developmentText('MSG-ACTIVE-VARIANT-LIMIT'),e.code);}
    ledger.seed=(Math.imul(ledger.seed,1664525)+1013904223)>>>0;
    const highestTownhall=Math.max(1,integer(context.highestTownhall,state.buildings?.townhall?.level||1));
    attempt=createOriginalAttempt(variant,{id,seed:ledger.seed,difficulty,now:at,highestTownhall,easier});ledger.attempts[variant]=attempt;if(easier)context.onEasier?.(attempt);
    return good(easier?'Rozpoczęto łatwiejszą próbę za mniejszą nagrodę.':'Próba rozpoczęta.',{attemptId:id,difficulty,rewardScale:attempt.rewardScale});
  }
  if(!attempt||action.attemptId&&action.attemptId!==attempt.id)return bad('Ta próba nie jest już dostępna.','stale-attempt');
  if(action.type==='originalPuzzleInput') {const result=applyOriginalInput(attempt,action.input||{});attempt.message=result.message;settleOutcome(state,attempt,context);return result;}
  if(action.type==='originalPuzzleExit') {if(attempt.status==='active'){attempt.status='abandoned';attempt.timeOffer=null;attempt.message='Wyjście zakończyło bieżącą próbę jako przegraną.';settleOutcome(state,attempt,context);}return good(attempt.message||'Próba zakończona.');}
  if(action.type==='originalPuzzleHint') {if(attempt.status!=='active')return bad('Rozpocznij próbę, aby skorzystać z podpowiedzi.');if(ledger.failures[variant]<3||attempt.hintUsed)return bad('Podpowiedź jest dostępna raz po trzech porażkach.');attempt.hintUsed=true;attempt.hint=hintFor(attempt);return good(attempt.hint.text,{hint:attempt.hint});}
  if(action.type==='originalPuzzleTimeChoice') {
    if(attempt.status!=='active'||!attempt.timeOffer||attempt.timeOffer.status!=='choice')return bad('Oferta czasu nie jest już dostępna.');
    if(action.method==='decline'){attempt.timeOffer=null;return good('Grasz dalej.');}
    if(!['coins','ad'].includes(action.method))return bad('Wybierz monety, reklamę lub dalszą grę.');
    if(action.method==='coins') {
      const price=10*attempt.highestTownhall;
      if(typeof context.spendCoins==='function'){if(!context.spendCoins(price))return bad('Brakuje monet.');}
      else {if(finite(state.resources?.coins)<price)return bad('Brakuje monet.');state.resources.coins-=price;}
      return extendTime(attempt,'coins');
    }
    attempt.timeOffer={...attempt.timeOffer,status:'processing',method:'ad',receipt:`${attempt.id}:ad:${attempt.extensions+1}`};
    return good('Oczekiwanie na ukończenie reklamy. Czas próby jest zatrzymany.',{adReceipt:attempt.timeOffer.receipt});
  }
  if(action.type==='originalPuzzleExtend') {
    if(attempt.status!=='active'||attempt.timeOffer?.status!=='processing'||attempt.timeOffer.method!=='ad'||action.receipt!==attempt.timeOffer.receipt)return bad('Potwierdzenie reklamy nie pasuje do aktywnej oferty.');
    if(action.completed!==true){attempt.timeOffer=null;return good('Reklama została przerwana. Grasz dalej bez dodatkowego czasu.');}
    // Simulation is a deliberate DEV capability; a browser-supplied verified flag
    // alone must never grant a real rewarded-ad payout on PRE-PROD or production.
    if(context.allowAdSimulation!==true&&typeof context.verifyAd!=='function')return bad('Dostawca reklam nie został podłączony.');
    if(context.allowAdSimulation!==true&&!context.verifyAd(action.receipt,action))return bad('Nie potwierdzono ukończenia reklamy.');
    if(ledger.receipts.includes(action.receipt))return bad('Ta reklama została już rozliczona.');
    ledger.receipts.push(action.receipt);return extendTime(attempt,'ad');
  }
  if(action.type==='originalPuzzleClaim') {
    if(attempt.status!=='won')return bad('Najpierw ukończ planszę.');
    const receipt=`${attempt.id}:reward`;if(attempt.rewardClaimed||ledger.receipts.includes(receipt))return bad('Nagroda została już odebrana.');
    const amount=attempt.civilianRescue?0:Math.max(1,Math.floor((cappedExpeditionReward(attempt.difficulty)||50)*attempt.highestTownhall*attempt.rewardScale));
    if(typeof context.grantReward==='function'){const granted=context.grantReward({coins:amount},receipt,attempt);if(granted===false)return bad('Nie udało się zapisać nagrody. Spróbuj ponownie.');if(attempt.civilianRescue&&granted&&typeof granted==='object')attempt.rescueOutcome={rescued:integer(granted.rescued,integer(granted.residentsRequested,attempt.civilianRescue.requested)),waiting:integer(granted.waiting)};}
    else return bad('Odbiór nagrody wymaga obsługi zapisu gry.','reward-handler-required');
    attempt.rewardClaimed=true;ledger.receipts.push(receipt);ledger.receipts=ledger.receipts.slice(-512);
    return good(attempt.civilianRescue?'Uratowano '+(attempt.rescueOutcome?.rescued||attempt.civilianRescue.requested)+' osób. Ocaleni czekają na przyjęcie.':'Odebrano nagrodę: '+amount+' monet.',{reward:{coins:amount},receipt,rewardScale:attempt.rewardScale,...(attempt.civilianRescue?{rescued:attempt.rescueOutcome?.rescued||attempt.civilianRescue.requested}: {})});
  }
  return bad('Nieznana akcja minigry.');
}
function extendTime(attempt,method) {
  const added=Math.max(60,attempt.remaining*.5);attempt.remaining+=added;attempt.extensions++;attempt.offerArmed=attempt.remaining>30;attempt.timeOffer=null;
  return good('Dodano '+Math.ceil(added)+' sekund. Czas gry znów biegnie.',{added,method});
}
export function advanceOriginalPuzzles(state,seconds,context={}) {
  const ledger=current(state);for(const attempt of Object.values(ledger.attempts)) {
    advanceOriginalAttempt(attempt,seconds);settleOutcome(state,attempt,context);attempt.lastAt=finite(context.endAt,finite(context.now,nowOf(state))+finite(seconds)*1000);
  }
}
export function nextOriginalPuzzleEvent(state) {
  return Math.min(Infinity,...Object.values(current(state).attempts).filter(a=>a.status==='active').map(a=>a.timeOffer?.status==='processing'?Infinity:a.timeOffer?a.timeOffer.choiceRemaining:a.offerArmed&&a.remaining>30?a.remaining-30:a.remaining));
}
export function originalPuzzleStatus(state,variant='signal-line') {
  const ledger=current(state),attempt=ledger.attempts[variant],hour=expeditionHourStatus(state,variant);ledger.failures[variant]=hour.failures;
  return {variant,attempt,failures:ledger.failures[variant]||0,canUseHelp:(ledger.failures[variant]||0)>=3,canStart:!attempt||attempt.status!=='active',hour,
    progress:!attempt?0:variant==='signal-line'?attempt.usedEdges.length/attempt.board.edges.length:attempt.board.removed.length/attempt.board.paths.length,
    reward:attempt?.civilianRescue?0:attempt?Math.max(1,Math.floor((cappedExpeditionReward(attempt.difficulty)||50)*attempt.highestTownhall*attempt.rewardScale)):0};
}
