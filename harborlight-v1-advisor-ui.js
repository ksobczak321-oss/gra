// Session-only advice. This component never changes or persists the island.
const make = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value != null) node.setAttribute(key, String(value));
  }
  for (const child of children.flat()) if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
};
function portrait() {
  const node = make('span', {class:'kingdom-advisor-portrait', 'aria-hidden':'true'});
  // Original vector illustration, deliberately independent of game artwork.
  node.innerHTML = `<svg viewBox="0 0 80 96" focusable="false"><path fill="#172f41" d="M1 95Q0 69 22 65L58 65Q80 70 79 95Z"/><path fill="#ba924d" d="M16 95L24 66L40 80L56 66L65 95Z"/><path fill="#244d62" d="M22 95L28 72L40 87L52 72L59 95Z"/><path fill="#ecc193" d="M21 31Q19 13 40 13Q63 13 60 36L57 56Q48 70 40 70Q28 69 22 54Z"/><path fill="#e5dfcd" d="M20 35Q10 3 42 3Q68 3 63 35L56 25L53 17Q36 27 21 26Z"/><path fill="#d8d6c6" d="M22 43L28 56L40 59L53 54L59 40L58 60L47 74L34 75L22 61Z"/><path fill="#f3ead1" d="M27 50Q35 45 40 51Q48 44 54 49L47 56L40 54L33 56Z"/><path stroke="#19394b" stroke-width="2.5" fill="none" d="M23 35Q28 31 34 34M45 34Q51 31 56 35"/><circle cx="30" cy="39" r="2" fill="#243843"/><circle cx="50" cy="39" r="2" fill="#243843"/><path stroke="#b88564" stroke-width="2" fill="none" d="M39 38L37 47L42 47"/><path fill="#e9c367" d="M35 80L40 76L45 80L40 86Z"/></svg>`;
  return node;
}
export function createKingdomAdvisor({getState, getSuggestion, getPlan, getCachedPlan, getPlanningStatus, subscribePlan, getLanguage = () => document.documentElement.lang, onNavigate, isVisible = () => true, host = document.body} = {}) {
  const cachedMode=typeof getCachedPlan==='function';
  let expanded=false,muted=false,plan=null,detailedPlan=null,query='',alternate=false,autoMode=true,trackedGoal=null,trackedLevel=null,trackedTopic=null,trackedResource=null;
  let lastRefresh=-Infinity,signature='',destroyed=false,lastLanguage='',announcedTask='',selectedTask='',renderedPlan=null,renderedLanguage='',renderedAutoMode=true,requestEpoch=0,navigationEpoch=0,pendingRequests=0,planningStatus={phase:'idle',computedAt:null,nextRunAt:null};
  const language=()=>getLanguage?.()==='en'?'en':'pl',copy=(pl,en)=>language()==='en'?en:pl;
  const root=make('aside',{class:'kingdom-advisor','data-kingdom-advisor':'','data-i18n-ignore':''});
  const advisorName=make('strong');
  const launch=make('button',{type:'button',class:'kingdom-advisor-launch','data-advisor-open':'','aria-expanded':'false','aria-controls':'kingdom-advisor-conversation'},portrait(),make('span',{},advisorName));
  const hint=make('span',{class:'kingdom-advisor-hint','data-advisor-hint':''});launch.lastChild.append(hint);
  const mute=make('button',{type:'button',class:'kingdom-advisor-mute','data-advisor-mute':'',onclick:()=>{muted=!muted;update(true);}});
  const conversation=make('section',{id:'kingdom-advisor-conversation',class:'kingdom-advisor-conversation','data-advisor-conversation':'',hidden:'','aria-labelledby':'kingdom-advisor-title'});
  const close=make('button',{type:'button','data-advisor-close':'',onclick:()=>setOpen(false)},'×');
  const output=make('div',{class:'kingdom-advisor-answer','data-advisor-answer':'','aria-live':'off'});
  const liveStatus=make('span',{class:'kingdom-advisor-status',role:'status','aria-live':'polite','data-advisor-live-status':''});
  const context=make('p',{class:'kingdom-advisor-context'}),status=make('p',{class:'kingdom-advisor-planning-status','data-advisor-planning-status':'','aria-live':'off'});
  const input=make('input',{id:'kingdom-advisor-input',type:'text',maxlength:'300',autocomplete:'off','data-advisor-input':''});
  const submit=make('button',{type:'submit','data-advisor-send':''}),inputLabel=make('label',{for:'kingdom-advisor-input'});
  const form=make('form',{class:'kingdom-advisor-form',onsubmit:event=>{event.preventDefault();void ask(input.value);}},inputLabel,make('div',{},input,submit));
  const chips=make('div',{class:'kingdom-advisor-chips'}),eyebrow=make('small'),title=make('h2',{id:'kingdom-advisor-title'});
  conversation.append(make('header',{},make('div',{},eyebrow,title),close),context,status,output,chips,form);
  root.append(conversation,liveStatus,make('div',{class:'kingdom-advisor-summary'},launch,mute));host.append(root);
  function staticCopy(){
    const value=language();if(lastLanguage===value)return false;lastLanguage=value;
    const heading=copy('Doradca Królestwa','Kingdom Advisor');root.setAttribute('aria-label',heading);advisorName.textContent=heading;title.textContent=heading;
    close.setAttribute('aria-label',copy('Zamknij rozmowę z doradcą','Close the advisor conversation'));
    context.textContent=copy('Jestem tu, żeby pomóc Ci rozwijać wyspę. Możesz też opowiedzieć mi o swoim pomyśle.','I’m here to help you grow your island. You can also tell me what you have in mind.');
    input.placeholder=copy('Np. Jak najszybciej rozbudować Port?','E.g. How can I upgrade the Port?');submit.textContent=copy('Zapytaj','Ask');inputLabel.textContent=copy('Twój cel lub pytanie','Your goal or question');eyebrow.textContent=copy('TWOJA WYSPA · TWÓJ PLAN','YOUR ISLAND · YOUR PLAN');
    chips.replaceChildren(...[['Rozbudowa Portu','Upgrade the Port'],['Wolni mieszkańcy','Available residents'],['Priorytety transportu','Transport priorities']].map(([pl,en])=>make('button',{type:'button',onclick:()=>{const label=copy(pl,en);input.value=label;void ask(label);}},copy(pl,en))));
    signature='';return true;
  }
  function refreshStatus(){
    const busy=pendingRequests>0||planningStatus.phase==='computing';
    output.setAttribute('aria-busy',String(busy));root.dataset.advisorPlanning=busy?'computing':planningStatus.phase||'idle';
    const at=Number.isFinite(planningStatus.computedAt)?planningStatus.computedAt:plan?.computedAt;
    const age=Number.isFinite(at)?Math.max(0,performance.now()-at):null;
    const updated=age===null?null:age<60000?copy('przed chwilą','just now'):copy(Math.floor(age/60000)+' min temu',Math.floor(age/60000)+' min ago');
    const message=busy?copy('Chwilę sprawdzam, co może Ci teraz pomóc. Możesz dalej grać.','I’m checking what could help you next. You can keep playing.'):planningStatus.phase==='error'?copy('Nie udało mi się teraz sprawdzić planu. Zerknij na aktualną sytuację przed kolejnym krokiem.','I couldn’t check the plan just now. Take a look at the current situation before your next step.'):cachedMode?copy('Co 2 minuty po cichu dopasowuję propozycję do Twojej gry.','Every 2 minutes I quietly adapt the suggestion to how you play.'):copy('Dopasowuję podpowiedzi do tego, co robisz na wyspie.','I adapt my suggestions to what you do on the island.');
    const text=message+(updated?' '+copy('Ostatnia aktualizacja: ','Last updated: ')+updated+'.':'');if(status.textContent!==text)status.textContent=text;
  }
  function refreshHint(next){
    root.classList.toggle('is-muted',muted);
    const first=next?.tasks?.[0]?.title||next?.steps?.[0]?.text;
    const proposedGoal=String(next?.title||'').replace(language()==='en'?/^Goal:\s*/i:/^Cel:\s*/i,'');
    const recommendation=next?.text||[proposedGoal,first].filter(Boolean).join('. ');
    const suggestion=recommendation?copy('Cześć! ','Hi! ')+recommendation:copy('Cześć! Zobaczmy, jaki kolejny krok pomoże Twojej wyspie.','Hi! Let’s find a next step that helps your island.');
    hint.textContent=muted?copy('Podpowiedzi wyciszone. Jestem tu, gdy będziesz mnie potrzebować.','Hints muted. I’m here whenever you need me.'):suggestion;
    mute.textContent=muted?copy('Włącz','Unmute'):copy('Wycisz','Mute');mute.title=muted?copy('Włącz podpowiedzi','Enable hints'):copy('Wycisz podpowiedzi','Mute hints');mute.setAttribute('aria-pressed',String(muted));
  }
  function tasksFor(next){
    if(Array.isArray(next.tasks)&&next.tasks.length)return next.tasks.map((task,index)=>({...task,id:String(task.id||'task-'+index),howTo:Array.isArray(task.howTo)?task.howTo:[]}));
    return next.steps?.length?[{id:String(next.taskId||'current-task'),title:copy('Wykonaj kolejne działania','Follow the next actions'),status:'ready',dependsOn:[],howTo:next.steps}]:[];
  }
  function selectTask(id,scroll=true){
    selectedTask=id;
    for(const card of output.querySelectorAll('[data-advisor-task-card]'))card.setAttribute('aria-pressed',String(card.getAttribute('data-advisor-task-card')===id));
    for(const group of output.querySelectorAll('[data-advisor-task-group]'))group.classList.toggle('is-selected',group.getAttribute('data-advisor-task-group')===id);
    if(scroll)output.querySelector(`[data-advisor-task-group="${CSS.escape(id)}"]`)?.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  async function navigate(step,button){
    if(destroyed||!onNavigate)return;const epoch=++navigationEpoch;button.disabled=true;
    try{
      const started=await onNavigate(step);
      if(destroyed||epoch!==navigationEpoch)return;
      if(started!==true){status.textContent=copy('Nie mogę teraz wskazać tej kontrolki. Otwórz właściwy budynek z mapy lub dolnego menu.','I cannot point to this control right now. Open the relevant building from the map or bottom menu.');liveStatus.textContent=status.textContent;return;}
      setOpen(false,{restoreFocus:false});
    }catch{if(!destroyed&&epoch===navigationEpoch){status.textContent=copy('Nie udało mi się wskazać miejsca. Spróbuj jeszcze raz.','I couldn’t point out the location. Please try again.');liveStatus.textContent=status.textContent;}}
    finally{if(!destroyed&&button.isConnected)button.disabled=false;}
  }
  function renderAnswer(next,announce=false){
    if(!next||typeof next!=='object')return;plan=next;if(renderedPlan===next&&renderedLanguage===language()&&renderedAutoMode===autoMode)return;renderedPlan=next;renderedLanguage=language();renderedAutoMode=autoMode;
    const tasks=tasksFor(next),nextSignature=JSON.stringify({language:language(),title:next.title,text:next.text,topicSummary:next.topicSummary,why:next.why,tasks,estimate:next.estimate?.text,premium:next.premium?.text,explanation:next.explanation,limitations:next.limitations,autoMode});
    if(signature===nextSignature)return;signature=nextSignature;
    const scroll=output.scrollTop,detailsWereOpen=output.querySelector('[data-advisor-why]')?.getAttribute('aria-expanded')==='true';
    const focus=document.activeElement,focusKey=output.contains(focus)?['data-advisor-step-key','data-advisor-task-card','data-advisor-why','data-advisor-alternative','data-advisor-current'].map(key=>focus.hasAttribute(key)?[key,focus.getAttribute(key)]:null).find(Boolean):null;
    output.replaceChildren(make('div',{class:'kingdom-advisor-goal','data-advisor-main-goal':''},make('small',{},copy('Cześć! Oto moja propozycja:','Hi! Here’s my suggestion:')),make('h3',{'data-advisor-task':next.taskId||next.kind||''},next.title||copy('Kolejny krok','Next step')),make('p',{class:'kingdom-advisor-choice','data-advisor-choice':''},copy('To tylko propozycja — możesz wybrać inną drogę.','This is a suggestion; you’re free to choose another path.'))));
    if(tasks.length){
      const cardGrid=make('nav',{class:'kingdom-advisor-task-cards','data-advisor-task-cards':'','aria-label':copy('Zadania przygotowujące cel','Tasks preparing the goal')});
      tasks.forEach((task,index)=>{
        const groupId='kingdom-advisor-howto-'+index+'-'+task.id.replace(/[^a-zA-Z0-9_-]/g,'-');
        const state=task.status==='done'?'done':task.status==='waiting'?'waiting':'ready';
        const statusLabel=state==='done'?copy('Gotowe','Done'):state==='waiting'?copy('Czeka na wcześniejszy krok','Waiting for a prerequisite'):copy('Możesz przygotowywać','Ready to prepare');
        const card=make('button',{type:'button',class:'kingdom-advisor-task-card','data-advisor-task-card':task.id,'data-advisor-task-status':state,'aria-controls':groupId,'aria-pressed':String(selectedTask===task.id),onclick:()=>selectTask(task.id)},make('strong',{},task.title||copy('Zadanie','Task')),make('span',{class:'kingdom-advisor-task-state'},statusLabel));
        cardGrid.append(card);
      });
      output.append(cardGrid);
      output.append(make('p',{class:'kingdom-advisor-plan-context','data-advisor-plan-context':''},next.text||copy('Wybierz cel, a sprawdzę możliwości wyspy.','Choose a goal and I will review the island.')));
      if(next.topicSummary)output.append(make('p',{class:'kingdom-advisor-topic-answer','data-advisor-topic-answer':''},make('strong',{},copy('Odpowiedź doradcy: ','Advisor’s answer: ')),next.topicSummary));
      output.append(make('h4',{class:'kingdom-advisor-howto-heading'},copy('Jak wykonać plan','How to carry out the plan')));
      const groups=make('div',{class:'kingdom-advisor-task-groups','data-advisor-task-groups':''});
      tasks.forEach((task,index)=>{
        const group=make('section',{class:'kingdom-advisor-task-group',id:'kingdom-advisor-howto-'+index+'-'+task.id.replace(/[^a-zA-Z0-9_-]/g,'-'),'data-advisor-task-group':task.id},make('h4',{},task.title||copy('Zadanie','Task')));
        const dependencies=(task.dependsOn||[]).map(id=>tasks.find(row=>row.id===id)?.title).filter(Boolean);
        if(dependencies.length)group.append(make('p',{class:'kingdom-advisor-dependency','data-advisor-dependencies':''},copy('Po przygotowaniu: ','After preparing: ')+dependencies.join(', ')));
        const instructions=make('ol',{'data-advisor-actions':'','data-advisor-howto':task.id});
        task.howTo.forEach((row,stepIndex)=>{
          const key=task.id+':'+String(row.id||stepIndex),item=make('li',{'data-advisor-howto-step':key},make('p',{},row.text));
          if(row.why)item.append(make('p',{class:'kingdom-advisor-step-why','data-advisor-step-why':''},make('strong',{},copy('Dlaczego: ','Why: ')),row.why));
          if(row.target){let button;button=make('button',{type:'button','data-advisor-target':row.target,'data-advisor-step-key':key,onclick:()=>void navigate(row,button)},copy('Pokaż, gdzie','Show where'));item.append(button);}
          instructions.append(item);
        });
        group.append(instructions);if(task.why)group.append(make('p',{class:'kingdom-advisor-step-why'},make('strong',{},copy('Dlaczego: ','Why: ')),task.why));groups.append(group);
      });
      output.append(groups);
      if(!tasks.some(task=>task.id===selectedTask))selectedTask=tasks[0].id;selectTask(selectedTask,false);
    }
    if(!tasks.length)output.append(make('p',{'data-advisor-plan-context':''},next.text||copy('Wybierz cel, a sprawdzę możliwości wyspy.','Choose a goal and I will review the island.')));
    if(!tasks.length&&next.topicSummary)output.append(make('p',{class:'kingdom-advisor-topic-answer','data-advisor-topic-answer':''},next.topicSummary));
    if(next.estimate?.text)output.append(make('p',{class:'kingdom-advisor-estimate','data-advisor-estimate':''},next.estimate.text));
    if(next.premium?.text)output.append(make('p',{class:'kingdom-advisor-estimate','data-advisor-premium':''},copy('Opcja za monety: ','Optional coin service: '),next.premium.text));
    const detail=make('div',{class:'kingdom-advisor-details',hidden:''});
    if(next.why)detail.append(make('p',{class:'kingdom-advisor-goal-why','data-advisor-goal-why':''},next.why));
    const detailTexts=[...new Set([next.explanation,...(next.limitations||[])].filter(text=>text&&text!==next.why))];
    detail.append(...detailTexts.map(text=>make('p',{},text)));
    const why=make('button',{type:'button','data-advisor-why':'','aria-expanded':'false',onclick:()=>{detail.hidden=!detail.hidden;why.setAttribute('aria-expanded',String(!detail.hidden));}},copy('Dlaczego taki plan?','Why this plan?'));
    const followups=make('div',{class:'kingdom-advisor-followups'},why);
    if(next.goal&&next.goal!=='theatre')followups.append(make('button',{type:'button','data-advisor-alternative':'',onclick:()=>{alternate=!alternate;void ask(autoMode?copy('Inna droga','Another route'):query||copy('Inna droga','Another route'),true);}},copy('Inna droga','Another route')));
    if(!autoMode)followups.append(make('button',{type:'button','data-advisor-current':'',onclick:()=>void returnToCurrent()},copy('Bieżący plan','Current plan')));
    output.append(followups,detail);if(detailsWereOpen){detail.hidden=false;why.setAttribute('aria-expanded','true');}output.scrollTop=scroll;
    if(focusKey)output.querySelector(`[${focusKey[0]}="${CSS.escape(focusKey[1])}"]`)?.focus({preventScroll:true});
    // Background refreshes remain quiet. Only a response to the player’s own
    // question is announced; the plan, focus and window never jump into view.
    if(announce){announcedTask=next.taskId;liveStatus.textContent=[next.title,next.text].filter(Boolean).join('. ');}
  }
  function remember(next){detailedPlan=next;trackedGoal=next.requestedGoal||next.goal;trackedLevel=next.requestedTargetLevel??next.targetLevel;trackedTopic=!trackedGoal&&['food','workers','transport','resource'].includes(next.kind)?next.kind:null;trackedResource=next.resource;}
  async function request(inputValue,options,epoch){
    pendingRequests++;refreshStatus();
    try{const next=await getPlan(inputValue,options);if(destroyed||epoch!==requestEpoch||!next)return;remember(next);renderAnswer(next,true);refreshHint(next);}
    catch{if(!destroyed&&epoch===requestEpoch){planningStatus={...planningStatus,phase:'error'};refreshStatus();}}
    finally{pendingRequests=Math.max(0,pendingRequests-1);if(!destroyed)refreshStatus();}
  }
  async function ask(value,keepAlternative=false){
    query=String(value||'').trim().slice(0,300);if(!query){input.focus();return;}if(!keepAlternative)alternate=false;autoMode=false;
    const followupGoal=cachedMode?plan?.tracking?.goal??null:trackedGoal||plan?.requestedGoal||plan?.goal;
    const followupLevel=cachedMode?plan?.tracking?.targetLevel??null:trackedLevel;
    const epoch=++requestEpoch;await request(query,{goal:followupGoal,targetLevel:followupLevel,alternative:alternate,language:language()},epoch);lastRefresh=performance.now();
  }
  async function returnToCurrent(){
    autoMode=true;trackedGoal=null;trackedLevel=null;trackedTopic=null;trackedResource=null;detailedPlan=null;alternate=false;const epoch=++requestEpoch;
    if(cachedMode)await request('',{goal:null,targetLevel:null,topic:null,alternative:false,language:language()},epoch);else{signature='';update(true);}
  }
  function setOpen(value,{restoreFocus=true}={}){expanded=value;conversation.hidden=!value;launch.setAttribute('aria-expanded',String(value));root.classList.toggle('is-open',value);if(value){lastRefresh=-Infinity;update(true);input.focus({preventScroll:true});}else{update(true);if(restoreFocus)launch.focus({preventScroll:true});}}
  function acceptCached(next,nextStatus){
    if(destroyed)return;if(nextStatus)planningStatus=nextStatus;
    if(next){plan=next;refreshHint(next);if(expanded)renderAnswer(next);}
    else if(cachedMode){
      plan=null;renderedPlan=null;signature='';
      // One cheap, current fallback while the first background result is
      // pending. It is never rerun by the ordinary cached update() loop.
      let fallback=null;try{if(typeof getSuggestion==='function'&&typeof getState==='function')fallback=getSuggestion(getState(),{language:language()});}catch{}
      if(fallback){renderAnswer(fallback);refreshHint(fallback);}else{output.replaceChildren(make('p',{},copy('Przygotowuję plan dla tej wyspy.','Preparing a plan for this island.')));refreshHint(null);}
    }
    refreshStatus();
  }
  function update(force=false){
    if(destroyed)return;const changed=staticCopy();root.hidden=!isVisible();if(root.hidden)return;
    const dock=document.querySelector('.mobile-bottom-dock'),mobileDock=dock?.getClientRects().length?dock.getBoundingClientRect():null;
    if(!expanded&&mobileDock)root.style.bottom=`${Math.max(12,innerHeight-mobileDock.top+10)}px`;else root.style.removeProperty('bottom');
    if(cachedMode){const next=getCachedPlan(),nextStatus=getPlanningStatus?.();if(nextStatus)planningStatus=nextStatus;if(next){plan=next;refreshHint(next);if(expanded)renderAnswer(next);}else if(!plan)acceptCached(null,nextStatus);refreshStatus();return;}
    if(!force&&!changed&&performance.now()-lastRefresh<1000)return;lastRefresh=performance.now();const state=getState();
    if(trackedGoal&&Number.isFinite(trackedLevel)&&Number(state.buildings?.[trackedGoal]?.level)>=trackedLevel){trackedGoal=null;trackedLevel=null;autoMode=true;detailedPlan=null;alternate=false;}
    const next=getSuggestion(state,{goal:trackedGoal,targetLevel:trackedLevel,topic:trackedTopic,resource:trackedResource,language:language()});refreshHint(next);
    if(expanded&&(autoMode||trackedGoal||trackedTopic))renderAnswer(!autoMode&&detailedPlan?{...next,explanation:detailedPlan.explanation,limitations:detailedPlan.limitations}:next);
    else if(expanded&&detailedPlan&&changed)renderAnswer(next);refreshStatus();
  }
  const unsubscribe=typeof subscribePlan==='function'?subscribePlan(acceptCached):null;
  launch.addEventListener('click',()=>setOpen(!expanded));root.addEventListener('keydown',event=>{if(event.key==='Escape'&&expanded){event.preventDefault();event.stopPropagation();setOpen(false);}});
  window.addEventListener('resize',update);update();
  return {update,open:()=>setOpen(true),destroy:()=>{destroyed=true;requestEpoch++;navigationEpoch++;if(typeof unsubscribe==='function')unsubscribe();window.removeEventListener('resize',update);root.remove();}};
}
