// Connected, optional island stories. The account coordinator owns the shared
// reward budget; these models own play, proof, saved rooms and one-use receipts.
import { ISLAND_PUZZLE_CATALOG, STORY_CATALOG, storyById, puzzleById, storyRoomKinds } from './harborlight-v1-story-catalog.js?v=frontend-v31-2';
import { createIslandPuzzle, normalizeIslandPuzzle, applyIslandPuzzle, recordIslandPuzzleTick, resetIslandPuzzle, getIslandPuzzleView, islandPuzzleProof } from './harborlight-v1-island-puzzles.js?v=frontend-v31-2';
import { adventureRewardStatus } from './harborlight-v1-adventure-budget.js?v=frontend-v31-2';
export { adventureRewardStatus } from './harborlight-v1-adventure-budget.js?v=frontend-v31-2';
export { ISLAND_PUZZLE_CATALOG, STORY_CATALOG, getStoryCatalog } from './harborlight-v1-story-catalog.js?v=frontend-v31-2';
export { getIslandPuzzleView } from './harborlight-v1-island-puzzles.js?v=frontend-v31-2';
const clone=x=>JSON.parse(JSON.stringify(x));
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const whole=(x,f=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=0&&x<=max?x:f;
const finite=(x,f=0)=>Number.isFinite(x)&&x>=0?x:f;
const good=(message,extra={})=>({ok:true,message,...extra});
const bad=message=>({ok:false,message});
const goods=['coins','wood','stone','grain','food','planks'];
const zeros=()=>Object.fromEntries(goods.map(id=>[id,0]));
const text=(l,pl,en)=>l==='en'?en:pl;
export const JOURNEY_RULES=Object.freeze({version:1,storyCount:20,storyVariants:5,puzzleKinds:22,maximumParkedRuns:32,maximumRoomInputs:64,savedUndoMoves:4,maximumReceipts:2000,freeHints:3});
export const JOURNEY_MESSAGES=Object.freeze([
 ['Wybierz przygodę z biblioteki.','Choose an adventure from the library.'],
 ['Ta przygoda czeka na dalszy rozwój wyspy. Na razie możesz wybrać inną bezpłatną próbę.','This story awaits further island development. Another free puzzle is available now.'],
 ['Wracasz do zapisanej przygody.','Your saved adventure has resumed.'],
 ['Przygoda rozpoczęta. Wszystkie potrzebne narzędzia masz na miejscu.','Adventure started. All the tools you need are already here.'],
 ['Najpierw dokończ zagadkę w tym pomieszczeniu.','Finish this room’s puzzle first.'],
 ['Pokój rozwiązany. Możesz przejść dalej albo obejrzeć znalezione wskazówki.','Room solved. Continue or review the clues you found.'],
 ['Otworzyłeś kolejne pomieszczenie. Wykorzystaj zachowaną wskazówkę.','The next room is open. Use the clue you kept.'],
 ['Przygoda ukończona. Nagroda została rozliczona jednokrotnie.','Adventure complete. Its reward was settled once.'],
 ['Próba ukończona. Wynik i odkrycie zapisane; ta powtórka nie daje kolejnej wypłaty.','Practice complete. Your result and discovery are saved; this replay does not award another payout.'],
 ['Ta przygoda została już rozliczona.','This adventure has already been settled.'],
 ['Postęp tego pomieszczenia został rozpoczęty od nowa. Nie pobrano monet.','This room was reset. No coins were spent.'],
 ['Nie ma jeszcze ruchu do cofnięcia.','There is no move to undo.'],
 ['Wskazówka jest bezpłatna.','A free hint is ready.'],
 ['Ten ruch nie pasuje do zagadki. Sprawdź wskazówkę i spróbuj inaczej.','That move does not fit the puzzle. Read the clue and try another plan.'],
 ['Ten ruch jest nieprawidłowy.','Invalid puzzle move.'],
 ['Ta zagadka jest już rozwiązana.','This puzzle is already solved.'],
 ['Zagadka rozwiązana.','Puzzle solved.'],
 ['Ruch wykonany.','Move made.'],
 ['Ruch cofnięty.','Move undone.'],
 ['Ten ruch nie jest teraz dostępny.','This puzzle move is not available now.'],
 ['Nie udało się potwierdzić nagrody. Spróbuj ponownie.','The reward could not be confirmed. Try again.'],
 ['Ta próba ma już bardzo dużo ruchów. Możesz rozpocząć bezpłatnie to pomieszczenie od nowa; wcześniejsze pomieszczenia zachowają postęp.','Save this attempt, then reset the free puzzle to try a different plan.'],
 ['Najpierw zakończ jedną z rozpoczętych przygód. Jej postęp pozostanie zapisany.','Finish one of your started adventures first. Your progress remains saved.']
]);
export const isJourneyKind=kind=>kind==='islandPuzzle'||kind==='escapeStory';
export function journeyRunKey(run){return run.kind==='escapeStory'?`story:${run.data.story.storyId}:${run.data.story.variant}`:run.kind==='islandPuzzle'?`puzzle:${run.data.puzzle.kind}`:run.kind;}
function storySeed(story,variant,roomIndex,knowledge){let seed=(Math.imul(story.index+1,0x9e3779b9)^Math.imul(variant,0x85ebca6b)^Math.imul(roomIndex+1,0xc2b2ae35))>>>0;for(const clue of knowledge)seed=(Math.imul(seed^clue.code,16777619))>>>0;return seed||1;}
function discoveryCode(puzzle){let code=puzzle.seed>>>0;for(const ch of JSON.stringify(puzzle.data))code=(Math.imul(code^ch.charCodeAt(0),16777619))>>>0;return 1000+code%9000;}
function proof(p){return islandPuzzleProof(p);}
function rewardFor(run){const level=run.data.puzzle.level||1;if(run.kind==='escapeStory')return{coins:40+10*level,wood:15+2*level,stone:15+2*level,grain:10+level,food:10+level,planks:10+level};return{coins:5+2*level,wood:5,stone:5,grain:0,food:0,planks:0};}
function canonicalContext(value){if(!plain(value))return null;const result={};for(const field of ['source','missionId','chapterId','receiptId','goalMissionId','assistanceId','kind','targetPopulation','chapter','route','preparedAt'])if(typeof value[field]==='string'&&value[field].length<=200||typeof value[field]==='number'&&Number.isFinite(value[field]))result[field]=value[field];return Object.keys(result).length?result:null;}
function createRun(state,action,context){
 const a=state.adventures,level=Math.max(1,whole(state.buildings?.townhall?.level,1,100)),sequence=++a.sequence;
 if(action.kind==='escapeStory'){
  const story=storyById(action.storyId),variant=whole(action.variant,1,5)||1,kinds=storyRoomKinds(story,variant);
  const metadata={storyId:story.id,variant,roomIndex:0,roomCount:kinds.length,roomKinds:kinds,knowledge:[],completedRooms:[]};
  return{id:`adventure-${sequence}`,kind:'escapeStory',stage:'puzzle',seed:storySeed(story,variant,0,[]),startedAt:a.clock,claimed:false,data:{story:metadata,puzzle:createIslandPuzzle(kinds[0],{seed:storySeed(story,variant,0,[]),variant,level,clock:a.clock}),rescueContext:canonicalContext(context.adventureRescueContext)}};
 }
 const variant=whole(action.variant,1,5)||1,seed=(Math.imul(sequence,0x9e3779b9)^whole(state.activitySeed,0x3e124a51,0xffffffff))>>>0;
 return{id:`adventure-${sequence}`,kind:'islandPuzzle',stage:'puzzle',seed,startedAt:a.clock,claimed:false,data:{puzzle:createIslandPuzzle(action.puzzleKind,{seed,variant,level,clock:a.clock}),rescueContext:null}};
}
export function normalizeJourneyRun(raw,clock){
 if(!plain(raw)||!isJourneyKind(raw.kind)||typeof raw.id!=='string'||!/^adventure-\d+$/.test(raw.id)||!plain(raw.data))return null;
 const savedPuzzle=raw.data.puzzle,puzzle=normalizeIslandPuzzle(savedPuzzle);if(!puzzle)return null;
 const run={id:raw.id,kind:raw.kind,stage:puzzle.solved?'roomComplete':'puzzle',seed:whole(raw.seed,1,0xffffffff),startedAt:Math.min(clock+Math.min(2678400,finite(raw.recoveryPauseRemaining)),finite(raw.startedAt,clock)),...(finite(raw.recoveryPauseRemaining)>0?{recoveryPauseRemaining:Math.min(2678400,raw.recoveryPauseRemaining)}:{}),claimed:false,data:{puzzle,rescueContext:canonicalContext(raw.data.rescueContext)}};
 if(raw.kind==='escapeStory'){
  const saved=raw.data.story,story=storyById(saved?.storyId);if(!story||!whole(saved.variant,0,5))return null;
  const kinds=storyRoomKinds(story,saved.variant),metadata={storyId:story.id,variant:saved.variant,roomIndex:0,roomCount:kinds.length,roomKinds:kinds,knowledge:[],completedRooms:[]};
  for(const recorded of(Array.isArray(saved.completedRooms)?saved.completedRooms:[]).slice(0,kinds.length)){
   if(!plain(recorded))break;
   const index=metadata.completedRooms.length,prior=normalizeIslandPuzzle(recorded.proof);
   if(!prior||!prior.solved||prior.kind!==kinds[index]||prior.seed!==storySeed(story,saved.variant,index,metadata.knowledge))break;
   const code=discoveryCode(prior);metadata.completedRooms.push({kind:prior.kind,proof:proof(prior),code});metadata.knowledge.push({room:index+1,code,label:`${index+1}: ${code}`});
  }
  metadata.roomIndex=Math.min(kinds.length-1,metadata.completedRooms.length);
  const expected=storySeed(story,saved.variant,metadata.roomIndex,metadata.knowledge.slice(0,metadata.roomIndex));
  if(metadata.completedRooms.length===kinds.length){run.data.puzzle=normalizeIslandPuzzle(metadata.completedRooms.at(-1).proof);run.claimed=raw.claimed===true;run.stage=run.claimed?'complete':'roomComplete';}
  else if(puzzle.kind!==kinds[metadata.roomIndex]||puzzle.seed!==expected){run.data.puzzle=createIslandPuzzle(kinds[metadata.roomIndex],{seed:expected,variant:saved.variant,level:puzzle.level,clock});run.stage='puzzle';}
  run.data.story=metadata;
 }else if(puzzle.solved&&raw.stage==='complete'&&raw.claimed===true){run.stage='complete';run.claimed=true;}
 if(run.stage==='complete'){
  run.data.reward=Object.fromEntries(goods.map(id=>[id,whole(raw.data.reward?.[id])]));run.data.practice=raw.data.practice===true;run.data.completionReceiptId=typeof raw.data.completionReceiptId==='string'?raw.data.completionReceiptId.slice(0,200):null;run.data.residentsAccepted=whole(raw.data.residentsAccepted,0,2400);if(whole(raw.data.residentsRequested,0,2400))run.data.residentsRequested=raw.data.residentsRequested;run.data.recruitmentReceiptId=typeof raw.data.recruitmentReceiptId==='string'?raw.data.recruitmentReceiptId.slice(0,200):null;
 }
 return run;
}
export function normalizeJourneyFields(adventures,raw,clock){
 adventures.completedPuzzles=Object.fromEntries(ISLAND_PUZZLE_CATALOG.map(p=>[p.id,whole(raw.completedPuzzles?.[p.id])]));
 adventures.completedEscapeStories=Object.fromEntries(STORY_CATALOG.map(s=>[s.id,whole(raw.completedEscapeStories?.[s.id])]));
 adventures.libraryReceipts=[...new Set((Array.isArray(raw.libraryReceipts)?raw.libraryReceipts:[]).filter(x=>typeof x==='string'&&x.length<=200))].slice(-JOURNEY_RULES.maximumReceipts);
 adventures.discoveries=(Array.isArray(raw.discoveries)?raw.discoveries:[]).filter(x=>plain(x)&&typeof x.id==='string'&&x.id.length<=200).slice(-200).map(x=>({id:x.id,title:String(x.title||'').slice(0,200),at:finite(x.at)}));
 // Original nine parked runs keep their old keys. New stories retain their own
 // keys, rather than replacing another story merely because its kind matches.
 for(const [key,value]of Object.entries(plain(raw.parked)?raw.parked:{}).slice(0,64)){
  if(!isJourneyKind(value?.kind))continue;const run=normalizeJourneyRun(value,clock);if(run&&journeyRunKey(run)!==journeyRunKeySafe(adventures.active))adventures.parked[journeyRunKey(run)]=run;
 }
}
function journeyRunKeySafe(run){return run?journeyRunKey(run):'';}

export function journeyChoices(state){
 const a=state.adventures,level=Math.max(1,whole(state.buildings?.townhall?.level,1,100));
 const puzzleChoices=ISLAND_PUZZLE_CATALOG.map((p,index)=>{
  const parked=[a.active,...Object.values(a.parked)].find(r=>r?.kind==='islandPuzzle'&&r.data.puzzle.kind===p.id&&r.stage!=='complete');
  return{kind:'islandPuzzle',id:`puzzle:${p.id}`,puzzleKind:p.id,title:p.title,description:p.description,durationSeconds:p.durationSeconds,tier:p.tier,icon:p.tier==='short'?'✦':'⌘',available:true,resume:!!parked,progress:parked?getIslandPuzzleView(parked.data.puzzle).progress:{current:0,total:1},completed:a.completedPuzzles[p.id]||0,cooldownSeconds:0,rewardPreview:{coins:5+2*level,wood:5,stone:5},rewardEligible:adventureRewardStatus(state).dailyRemaining>0&&adventureRewardStatus(state).chapterRemaining>0,practice:adventureRewardStatus(state).dailyRemaining<=0||adventureRewardStatus(state).chapterRemaining<=0,startAction:{type:'adventureStart',kind:'islandPuzzle',puzzleKind:p.id}};
 });
 const storyChoices=STORY_CATALOG.flatMap(s=>Array.from({length:5},(_,i)=>{
  const variant=i+1,key=`story:${s.id}:${variant}`,run=a.active&&journeyRunKeySafe(a.active)===key?a.active:a.parked[key],complete=a.libraryReceipts.includes(`story:${s.id}:${variant}`),unlocked=level>=s.unlockLevel;
  return{kind:'escapeStory',id:key,storyId:s.id,variant,title:{pl:`${s.title.pl} · ${variant}/5`,en:`${s.title.en} · ${variant}/5`},description:s.intro,durationSeconds:s.durationSeconds,tier:'story',icon:'⚿',available:unlocked||!!run,resume:!!run&&run.stage!=='complete',reason:unlocked?null:'level',requiredLevel:s.unlockLevel,progress:{current:run?.data.story.completedRooms.length||0,total:s.mechanics.length},completed:complete?1:0,cooldownSeconds:0,rewardPreview:{coins:40+10*level,wood:15+2*level,stone:15+2*level},rewardEligible:!complete&&adventureRewardStatus(state).dailyRemaining>0&&adventureRewardStatus(state).chapterRemaining>0,practice:complete||adventureRewardStatus(state).dailyRemaining<=0||adventureRewardStatus(state).chapterRemaining<=0,startAction:{type:'adventureStart',kind:'escapeStory',storyId:s.id,variant}};
 }));
 return[...puzzleChoices,...storyChoices];
}
export function getCurrentStoryRoom(run,language='pl'){
 const metadata=run?.data?.story,story=storyById(metadata?.storyId);if(!story)return null;const puzzle=puzzleById(run.data.puzzle.kind);
 return{storyId:story.id,title:story.title[language]||story.title.pl,intro:story.intro[language]||story.intro.pl,variant:metadata.variant,roomIndex:metadata.roomIndex,roomCount:metadata.roomCount,roomTitle:puzzle?.title?.[language]||puzzle?.title?.pl||'',knowledge:clone(metadata.knowledge),nextAvailable:run.data.puzzle.solved,finalRoom:metadata.roomIndex===metadata.roomCount-1,connection:metadata.knowledge.length?text(language,`Wskazówka ${metadata.knowledge.at(-1).code} z poprzedniej sali wyznacza układ tego mechanizmu.`,`Clue ${metadata.knowledge.at(-1).code} from the previous room determines this mechanism’s layout.`):text(language,'Pierwsze odkrycie wskaże drogę dalej.','The first discovery will show the way forward.')};
}
// A mission may attach its registered assistance contract to an ordinary
// story the player already started. Only host context can rebind it; action
// fields cannot replace a contract or erase earned rooms.
function bindTrustedAssistance(run,context){
 const assistance=canonicalContext(context.adventureRescueContext);
 if(assistance?.source==='campaign'&&typeof assistance.missionId==='string'&&typeof assistance.chapterId==='string'&&typeof assistance.receiptId==='string')run.data.rescueContext=assistance;
}
function startJourney(state,action,context){
 const a=state.adventures,spec=action.kind==='escapeStory'?storyById(action.storyId):puzzleById(action.puzzleKind);
 if(!spec||action.variant!==undefined&&!whole(action.variant,0,5))return bad('Choose an adventure from the library.');
 const level=Math.max(1,whole(state.buildings?.townhall?.level,1,100));
 if(action.kind==='escapeStory'&&level<spec.unlockLevel&&!context.adventureRescueContext)return bad('This story awaits further island development. Another free puzzle is available now.');
 const key=action.kind==='escapeStory'?`story:${spec.id}:${whole(action.variant,1,5)||1}`:`puzzle:${spec.id}`;
 if(a.active&&journeyRunKeySafe(a.active)===key&&a.active.stage!=='complete'){bindTrustedAssistance(a.active,context);return good('Your saved adventure has resumed.',{adventureId:a.active.id});}
 const parked=a.parked[key];
 if(a.active&&a.active.stage!=='complete'){
  // Resuming an existing slot swaps it with the active run; it does not
  // increase the number of saved adventures, even when all slots are full.
  if(!parked&&Object.keys(a.parked).length>=JOURNEY_RULES.maximumParkedRuns)return bad('Finish one of your started adventures first. Your progress remains saved.');
  a.parked[journeyRunKey(a.active)]=a.active;
 }
 a.active=parked&&parked.stage!=='complete'?parked:createRun(state,action,context);bindTrustedAssistance(a.active,context);delete a.parked[key];
 return good('Adventure started. All the tools you need are already here.',{adventureId:a.active.id,kind:a.active.kind,storyId:a.active.data.story?.storyId,puzzleKind:a.active.data.puzzle.kind});
}
function settlementReceipt(base,rescueContext){
 if(rescueContext?.source!=='campaign'||typeof rescueContext.receiptId!=='string'||typeof rescueContext.chapterId!=='string'||typeof rescueContext.missionId!=='string')return base;
 let hash=2166136261;for(const character of `${rescueContext.chapterId}:${rescueContext.missionId}:${rescueContext.receiptId}`)hash=Math.imul(hash^character.charCodeAt(0),16777619)>>>0;return `${base}:assistance:${hash.toString(16).padStart(8,'0')}`;
}
function finishJourney(state,run,context){
 if(run.claimed)return good('This adventure has already been settled.',{completed:true,duplicate:true,kind:run.kind,runId:run.id,completionReceiptId:run.data.completionReceiptId});
 const a=state.adventures,story=run.data.story,receipt=story?`story:${story.storyId}:${story.variant}`:`puzzle:${run.data.puzzle.kind}:${run.seed}:${run.data.puzzle.variant}`;
 const wasPaid=a.libraryReceipts.includes(receipt),settlement=settlementReceipt(receipt,run.data.rescueContext),wasSettled=a.libraryReceipts.includes(settlement),payload={receiptId:settlement,completionReceiptId:settlement,libraryReceiptId:receipt,runId:run.id,kind:run.kind,storyId:story?.storyId||null,puzzleKind:run.data.puzzle.kind,variant:story?.variant||run.data.puzzle.variant,reward:wasPaid?zeros():rewardFor(run),rescueContext:clone(run.data.rescueContext)};
 let settled={reward:zeros(),practice:true};
 if(!wasSettled&&typeof context.claimAdventureReward==='function'){
  settled=context.claimAdventureReward(state,payload)||settled;
  if(settled&&typeof settled.then==='function')return bad('The reward could not be confirmed. Try again.');
  if(settled.ok===false)return settled;
 }
 const reward=Object.fromEntries(goods.map(id=>[id,whole(settled.reward?.[id])]));
 run.claimed=true;run.stage='complete';run.data.reward=reward;run.data.practice=wasSettled||settled.practice===true&&!(settled.residentsAccepted>0)||!goods.some(id=>reward[id]>0)&&!(settled.residentsAccepted>0);run.data.completionReceiptId=settlement;run.data.residentsAccepted=whole(settled.residentsAccepted,0,2400);if(whole(settled.residentsRequested,0,2400))run.data.residentsRequested=settled.residentsRequested;run.data.recruitmentReceiptId=typeof settled.recruitmentReceiptId==='string'?settled.recruitmentReceiptId.slice(0,200):null;
 if(!wasPaid)a.libraryReceipts.push(receipt);if(settlement!==receipt&&!wasSettled)a.libraryReceipts.push(settlement);if(a.libraryReceipts.length>JOURNEY_RULES.maximumReceipts)a.libraryReceipts.splice(0,a.libraryReceipts.length-JOURNEY_RULES.maximumReceipts);
 a.completed[run.kind]=(a.completed[run.kind]||0)+1;
 if(story)a.completedEscapeStories[story.storyId]=(a.completedEscapeStories[story.storyId]||0)+1;else a.completedPuzzles[run.data.puzzle.kind]=(a.completedPuzzles[run.data.puzzle.kind]||0)+1;
 const title=storyById(story?.storyId)?.title.pl||puzzleById(run.data.puzzle.kind)?.title.pl||'';
 if(!a.discoveries.some(d=>d.id===receipt))a.discoveries.push({id:receipt,title,at:a.clock});if(a.discoveries.length>200)a.discoveries.shift();
 return good(run.data.practice?'Practice complete. Your result and discovery are saved; this replay does not award another payout.':'Adventure complete. Its reward was settled once.',{completed:true,...payload,reward,practice:run.data.practice,residentsAccepted:whole(settled.residentsAccepted),recruitmentReceiptId:typeof settled.recruitmentReceiptId==='string'?settled.recruitmentReceiptId:null,coinSource:'adventure'});
}
export function advanceJourney(state,run,seconds){if(!isJourneyKind(run?.kind)||run.stage==='complete'||state.adventures.active!==run)return;recordIslandPuzzleTick(run.data.puzzle,seconds);if(run.data.puzzle.solved)run.stage='roomComplete';}
export function journeyAction(state,action,context={}){
 if(action?.type==='adventureStart'&&isJourneyKind(action.kind))return startJourney(state,action,context);
 if(action?.type!=='adventureInput')return null;
 const run=state.adventures.active;if(!isJourneyKind(run?.kind))return null;
 if(action.adventureId!==run.id)return bad('This puzzle move is not available now.');
 if(run.stage==='complete')return good('This adventure has already been settled.',{duplicate:true,completed:true,kind:run.kind,runId:run.id,completionReceiptId:run.data.completionReceiptId});
 const p=run.data.puzzle,command=action.command;
 if(command==='puzzleReset'){run.data.puzzle=resetIslandPuzzle(p);run.stage='puzzle';return good('This room was reset. No coins were spent.');}
 if(command==='puzzleHint')return applyIslandPuzzle(p,{type:'hint'});
 if(command==='puzzleUndo'){const result=applyIslandPuzzle(p,{type:'undo'});if(result.ok)run.stage=p.solved?'roomComplete':'puzzle';return result;}
 if(command==='puzzleMove'){
  const result=applyIslandPuzzle(p,action.move);if(result.ok&&p.solved){run.stage='roomComplete';return good('Room solved. Continue or review the clues you found.',{solved:true,roomCompleted:true,finalRoom:!run.data.story||run.data.story.roomIndex===run.data.story.roomCount-1});}return result;
 }
 if(command==='puzzleNextRoom'){
  if(!p.solved)return bad('Finish this room’s puzzle first.');
  const metadata=run.data.story;
  if(!metadata)return finishJourney(state,run,context);
  if(metadata.completedRooms.length===metadata.roomIndex){const code=discoveryCode(p);metadata.completedRooms.push({kind:p.kind,proof:proof(p),code});metadata.knowledge.push({room:metadata.roomIndex+1,code,label:`${metadata.roomIndex+1}: ${code}`});}
  if(metadata.roomIndex===metadata.roomCount-1)return finishJourney(state,run,context);
  metadata.roomIndex++;const story=storyById(metadata.storyId),seed=storySeed(story,metadata.variant,metadata.roomIndex,metadata.knowledge);
  run.data.puzzle=createIslandPuzzle(metadata.roomKinds[metadata.roomIndex],{seed,variant:metadata.variant,level:p.level,clock:state.adventures.clock});run.stage='puzzle';
  return good('The next room is open. Use the clue you kept.',{roomIndex:metadata.roomIndex,roomCount:metadata.roomCount});
 }
 return bad('This puzzle move is not available now.');
}
