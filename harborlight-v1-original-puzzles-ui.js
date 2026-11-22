import { developmentText } from './harborlight-v1-development-copy.js?v=frontend-v32-24';
import { originalPuzzleCatalog, originalPuzzleStatus, availableConvoyIds } from './harborlight-v1-original-puzzles.js?v=frontend-v32-24';
import { createMiniGameInstructions } from './harborlight-v1-minigame-instructions.js?v=frontend-v32-24';

const SVG='http://www.w3.org/2000/svg';
const el=(tag,classes,text)=>{const n=document.createElement(tag);if(classes)n.className=classes;if(text!==undefined)n.textContent=text;return n;};
const svgEl=(tag,attrs={})=>{const n=document.createElementNS(SVG,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
const clock=seconds=>`${Math.floor(Math.max(0,seconds)/60)}:${String(Math.ceil(Math.max(0,seconds)%60)).padStart(2,'0')}`;
/** Convert a pointer's CSS coordinates into SVG world coordinates, including letterboxing. */
export function originalPuzzlePointerPoint(svg,event) {
  const matrix=svg.getScreenCTM?.();
  if(matrix&&typeof DOMPoint==='function'){const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());return{x:p.x,y:p.y};}
  const r=svg.getBoundingClientRect(),v=svg.viewBox.baseVal,scale=Math.min(r.width/v.width,r.height/v.height),left=r.left+(r.width-v.width*scale)/2,top=r.top+(r.height-v.height*scale)/2;
  return {x:(event.clientX-left)/scale+v.x,y:(event.clientY-top)/scale+v.y};
}
/** Host owns persistence and the simulation clock. UI sends actions, never awards coins. */
export function mountOriginalPuzzle({host,state,getState,variant='signal-line',getStatus,embedded=false,onAction,onResult,onClose,allowAdSimulation=false,language='pl'}={}) {
  if(!host)throw new TypeError('A puzzle host is required.');
  const entry=originalPuzzleCatalog.find(x=>x.id===variant);if(!entry)throw new TypeError('Unknown original puzzle.');
  let current=state,disposed=false,frame=0,lastSnapshot='',announced='',lastResult='',dragging=false,dragPointer=null,selectedNode=null,pending=false;
  const root=el('section','original-puzzle');root.dataset.variant=variant;root.setAttribute('aria-label',entry.name);root.dataset.i18nIgnore='true';host.replaceChildren(root);
  const header=el('div','original-puzzle-header'),title=el('h3','',entry.name),intro=el('p','original-puzzle-intro',entry.description);header.append(title,intro);root.append(header);
  const stats=el('div','original-puzzle-stats');root.append(stats);if(embedded){header.hidden=true;stats.hidden=true;}
  const instructionHost=el('div','original-puzzle-instructions');if(!embedded)root.append(instructionHost);let instructionKey='';
  const boardHost=el('div','original-puzzle-board');root.append(boardHost);
  const message=el('p','original-puzzle-message');message.setAttribute('role','status');message.setAttribute('aria-live','polite');root.append(message);
  const controls=el('div','original-puzzle-controls');root.append(controls);
  const help=el('p','original-puzzle-help');root.append(help);
  const overlay=el('div','original-puzzle-overlay');overlay.hidden=true;root.append(overlay);
  function status(){if(getStatus)return getStatus();return originalPuzzleStatus(getState?.()||current,variant);}
  async function send(type,extra={}) {
    if(disposed||pending)return;const a=status().attempt;pending=true;
    try{const result=await onAction?.({type,variant,...(a?{attemptId:a.id}:{}),...extra});if(result?.message){message.textContent=result.message;announced=result.message;}}
    catch{message.textContent='Nie udało się zapisać ruchu. Spróbuj ponownie.';}
    finally{pending=false;render(true);}
  }
  function button(label,type,extra,classes=''){const b=el('button',classes,label);b.type='button';b.addEventListener('click',()=>send(type,extra));return b;}
  function signalBoard(a) {
    const g=a.board,unit=68,w=(g.width+1)*unit,h=(g.height+1)*unit,svg=svgEl('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':'Sieć przekaźników. Kotwice oznaczają dwa dozwolone początki.'});
    svg.classList.add('original-puzzle-signal');const coords=new Map(g.nodes.map(n=>[n.id,{x:n.x*unit,y:n.y*unit}]));
    const used=new Set(a.usedEdges),tail=a.trail.at(-1);
    for(const edge of g.edges){const p=coords.get(edge.a),q=coords.get(edge.b),line=svgEl('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,class:`original-puzzle-wire${used.has(edge.id)?' is-connected':''}${a.hint?.edgeId===edge.id?' is-hint':''}`});svg.append(line);}
    for(const n of g.nodes){const p=coords.get(n.id),group=svgEl('g',{'data-node':n.id,class:`original-puzzle-relay${g.starts.includes(n.id)?' is-port':''}${tail===n.id?' is-current':''}${selectedNode===n.id?' is-selected':''}`});group.append(svgEl('circle',{cx:p.x,cy:p.y,r:17}));if(g.starts.includes(n.id)){const t=svgEl('text',{x:p.x,y:p.y+6,'text-anchor':'middle','aria-hidden':'true'});t.textContent='⚓';group.append(t);}svg.append(group);}
    const nearest=event=>{const p=originalPuzzlePointerPoint(svg,event);let best=null,distance=27;for(const n of g.nodes){const c=coords.get(n.id),d=Math.hypot(c.x-p.x,c.y-p.y);if(d<distance){best=n;distance=d;}}return best;};
    const inputNode=n=>{if(!n||pending)return;selectedNode=n.id;send('originalPuzzleInput',{input:{kind:'node',node:n.id}});};
    svg.addEventListener('pointerdown',event=>{if(a.status!=='active'||a.timeOffer||event.button!==0)return;const n=nearest(event);if(!n)return;event.preventDefault();dragging=true;dragPointer=event.pointerId;svg.setPointerCapture?.(event.pointerId);inputNode(n);});
    svg.addEventListener('pointermove',event=>{if(!dragging||dragPointer!==event.pointerId)return;const n=nearest(event);if(n&&n.id!==status().attempt?.trail.at(-1))inputNode(n);});
    const end=event=>{if(!dragging||dragPointer!==event.pointerId)return;dragging=false;dragPointer=null;send('originalPuzzleInput',{input:{kind:'lift'}});};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
    // Keep the SVG during a continuous gesture: replacing it would lose capture.
    svg.tabIndex=0;svg.setAttribute('role','application');svg.setAttribute('aria-label','Sieć latarnika. Strzałki wybierają sąsiedni punkt; Enter łączy. Escape czyści rysunek.');
    svg.addEventListener('keydown',event=>{if(a.status!=='active'||a.timeOffer)return;const nodes=g.nodes;let id=selectedNode||status().attempt?.trail.at(-1)||g.starts[0];const n=nodes.find(x=>x.id===id),dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(dir){event.preventDefault();const next=nodes.find(x=>x.x===n.x+dir[0]&&x.y===n.y+dir[1]);if(next){selectedNode=next.id;refreshSelection(svg);}}else if(event.key==='Enter'||event.key===' '){event.preventDefault();inputNode(nodes.find(x=>x.id===id));}else if(event.key==='Escape'){event.preventDefault();send('originalPuzzleInput',{input:{kind:'clear'}});}});
    return svg;
  }
  function refreshSelection(svg){for(const n of svg.querySelectorAll('[data-node]'))n.classList.toggle('is-selected',n.dataset.node===selectedNode);}
  function updateSignal(svg,a){const used=new Set(a.usedEdges);for(let i=0;i<a.board.edges.length;i++){const line=svg.querySelectorAll('line')[i];line?.classList.toggle('is-connected',used.has(a.board.edges[i].id));line?.classList.toggle('is-hint',a.hint?.edgeId===a.board.edges[i].id);}for(const node of svg.querySelectorAll('[data-node]')){node.classList.toggle('is-current',node.dataset.node===a.trail.at(-1));node.classList.toggle('is-selected',node.dataset.node===selectedNode);}}
  function routeBoard(a) {
    const board=a.board,unit=56,size=board.size*unit+44,svg=svgEl('svg',{viewBox:`0 0 ${size} ${size}`,role:'img','aria-label':'Konwoje i ich kierunki wypłynięcia. Wybierz konwój, którego wyjście jest wolne.'});svg.classList.add('original-puzzle-routes');
    for(let y=0;y<board.size;y++)for(let x=0;x<board.size;x++)svg.append(svgEl('circle',{cx:22+x*unit+unit/2,cy:22+y*unit+unit/2,r:2,class:'original-puzzle-water-point'}));
    const available=new Set(availableConvoyIds(board)),removed=new Set(board.removed);
    for(const [index,p]of board.paths.entries()){if(removed.has(p.id))continue;const point=([x,y])=>[22+x*unit+unit/2,22+y*unit+unit/2],head=point(p.cells.at(-1)),[dx,dy]=p.direction,group=svgEl('g',{'data-convoy':p.id,class:`original-puzzle-convoy${a.hint?.convoyId===p.id?' is-hint':''}`});
      group.append(svgEl('polyline',{points:p.cells.map(c=>point(c).join(',')).join(' '),class:'original-puzzle-route-line'}));const [x,y]=head;group.append(svgEl('polygon',{points:`${x+dx*19},${y+dy*19} ${x-dx*9-dy*11},${y-dy*9+dx*11} ${x-dx*9+dy*11},${y-dy*9-dx*11}`,class:'original-puzzle-route-arrow'}));const tail=point(p.cells[0]),label=svgEl('text',{x:tail[0],y:tail[1]+5,'text-anchor':'middle',class:'original-puzzle-convoy-number'});label.textContent=index+1;group.append(label);const title=svgEl('title');title.textContent=`Konwój ${index+1}`;group.append(title);group.addEventListener('click',()=>send('originalPuzzleInput',{input:{kind:'convoy',id:p.id}}));svg.append(group);
    }
    const keys=el('div','original-puzzle-route-keys');keys.setAttribute('aria-label','Wybór konwoju klawiaturą');for(const [i,p]of board.paths.entries())if(!removed.has(p.id)){const b=button(`Konwój ${i+1}`,'originalPuzzleInput',{input:{kind:'convoy',id:p.id}});b.disabled=a.status!=='active'||!!a.timeOffer;keys.append(b);}
    const wrap=el('div','');wrap.append(svg,keys);return wrap;
  }
  let boardAttempt=null,boardProgress='',boardSvg=null,dialogKey='',controlsKey='';
  function render(force=false){if(disposed)return;const info=status(),a=info.attempt;const snapshot=JSON.stringify([a?.id,a?.status,a?.instructionsPending,a?.remaining,a?.timeOffer,a?.usedEdges,a?.board.removed,a?.hint,a?.rewardClaimed,info.failures,info.hour.nextDifficulty]);if(!force&&snapshot===lastSnapshot)return;lastSnapshot=snapshot;
    const pending=a?.instructionsPending===true,reading=!a||pending||a.status!=='active';
    const nextInstructionKey=`${a?.id||'new'}:${a?.status||''}:${pending}`;
    if(!embedded&&instructionKey!==nextInstructionKey){instructionKey=nextInstructionKey;instructionHost.replaceChildren(createMiniGameInstructions({subject:{type:'puzzle',id:variant},compact:!reading,language,...(reading?{startLabel:language==='en'?(pending?'Start game':a?'New attempt':'Start attempt'):(pending?'Rozpocznij grę':a?'Nowa próba':'Rozpocznij próbę'),onStart:()=>send(pending?'originalPuzzleBegin':'originalPuzzleStart',{deferStart:false})}:{})}));}
    boardHost.hidden=pending||!a;boardHost.inert=pending;
    stats.replaceChildren(el('span','',`Trudność: ${a?.difficulty||info.hour.nextDifficulty}`),el('span','',`Czas: ${a?clock(a.remaining):'—'}`),el('span','',`Postęp: ${Math.round(info.progress*100)}%`),el('span','',embedded?'Etap przygody':a?.civilianRescue?`Ocaleni: ${a.rescueOutcome?.rescued||a.civilianRescue.requested} osób`:`Nagroda: ${info.reward||'—'} monet${a?.easier?' (50%)':''}`));
    if(!a){boardHost.replaceChildren(el('p','original-puzzle-empty','Rozpocznij próbę. Każda plansza ma własny układ i pełny limit czasu.'));boardAttempt=null;}
    else if(variant==='signal-line'){if(boardAttempt!==a.id){boardSvg=signalBoard(a);boardHost.replaceChildren(boardSvg);boardAttempt=a.id;}else updateSignal(boardSvg,a);}
    else{const progress=`${a.id}:${a.status}:${a.board.removed.join(',')}:${!!a.timeOffer}:${a.hint?.convoyId}`;if(progress!==boardProgress){boardHost.replaceChildren(routeBoard(a));boardProgress=progress;}}
    if(a?.message&&a.message!==announced){message.textContent=a.message;announced=a.message;}
    const nextControlsKey=`${a?.id}:${a?.status}:${pending}:${a?.rewardClaimed}:${a?.hintUsed}:${info.canUseHelp}`;
    if(nextControlsKey!==controlsKey){controlsKey=nextControlsKey;controls.replaceChildren();if(embedded||pending){}else if(!a||a.status!=='active'){
      if(info.canUseHelp)controls.append(button(developmentText('UI-057')+' — 50% nagrody','originalPuzzleEasier'));
      if(a?.status==='won'&&!a.rewardClaimed)controls.append(button(a?.civilianRescue?'Ocaleni czekają na przyjęcie':'Odbierz nagrodę','originalPuzzleClaim',{},'is-primary'));
      if(onClose){const b=el('button','','Wróć');b.type='button';b.addEventListener('click',onClose);controls.append(b);}
    }else{if(variant==='signal-line')controls.append(button('Wyczyść rysunek','originalPuzzleInput',{input:{kind:'clear'}}));if(info.canUseHelp&&!a.hintUsed)controls.append(button(developmentText('UI-056'),'originalPuzzleHint'));const exit=el('button','','Zakończ próbę');exit.type='button';exit.addEventListener('click',async()=>{await send('originalPuzzleExit');onClose?.();});controls.append(exit);}}
    help.textContent=a?.hint?.text||(variant==='signal-line'?'Dotyk: prowadź palec po przekaźnikach bez odrywania. Klawiatura: strzałki wybierają sąsiedni punkt, Enter łączy, Escape czyści.':'Dotknij konwoju lub użyj przycisków pod planszą. Konwój wypływa tylko wtedy, gdy przed strzałką nie ma innej trasy.');if(info.canUseHelp)help.textContent+=' Po trzech porażkach masz jedną podpowiedź na próbę i możesz wybrać prostszą planszę. W przygodzie obniży to pozostałe nagrody.';
    const key=a?.timeOffer?`${a.id}:${a.timeOffer.status}:${a.timeOffer.receipt||''}`:'';
    overlay.hidden=!a?.timeOffer;if(key!==dialogKey){dialogKey=key;overlay.replaceChildren();if(a?.timeOffer){const dialog=el('div','original-puzzle-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Dodatkowy czas');dialog.append(el('h4','','Potrzebujesz więcej czasu?'));if(a.timeOffer.status==='choice'){
      dialog.append(el('p','',developmentText('MSG-TIME-OFFER',{czas_dodatkowy:`${Math.ceil(Math.max(60,a.remaining*.5))} sekund`,koszt:10*a.highestTownhall})+' '+developmentText('MSG-TIME-POPUP-INFO')));const countdown=el('p','original-puzzle-offer-countdown');countdown.dataset.offerCountdown='';dialog.append(countdown);dialog.append(button(developmentText('UI-053',{koszt:10*a.highestTownhall}),'originalPuzzleTimeChoice',{method:'coins'}));if(allowAdSimulation)dialog.append(button('Reklama — symulacja DEV','originalPuzzleTimeChoice',{method:'ad'}));dialog.append(button(developmentText('UI-055'),'originalPuzzleTimeChoice',{method:'decline'}));
    }else{dialog.append(el('p','',allowAdSimulation?'Symulacja reklamy w DEV. Zegar próby jest zatrzymany.':'Oczekiwanie na potwierdzenie reklamy. Zegar próby jest zatrzymany.'));if(allowAdSimulation)dialog.append(button('Zakończ symulację reklamy','originalPuzzleExtend',{receipt:a.timeOffer.receipt,completed:true}));dialog.append(button('Przerwij i graj dalej','originalPuzzleExtend',{receipt:a.timeOffer.receipt,completed:false}));}overlay.append(dialog);requestAnimationFrame(()=>dialog.querySelector('button')?.focus());}}
    if(a?.timeOffer?.status==='choice'){const c=overlay.querySelector('[data-offer-countdown]');if(c)c.textContent=`Powrót do gry: ${Math.ceil(a.timeOffer.choiceRemaining)} s`;}
    if(a&&a.status!=='active'&&`${a.id}:${a.status}`!==lastResult){lastResult=`${a.id}:${a.status}`;onResult?.({variant,attemptId:a.id,outcome:a.status,difficulty:a.difficulty,rewardScale:a.rewardScale,rewardClaimed:a.rewardClaimed});}
  }
  function loop(){if(disposed)return;render();frame=requestAnimationFrame(loop);}render();frame=requestAnimationFrame(loop);
  return {update(next){if(next)current=next;render(true);},dispose(){disposed=true;cancelAnimationFrame(frame);if(root.isConnected)root.remove();},element:root};
}
