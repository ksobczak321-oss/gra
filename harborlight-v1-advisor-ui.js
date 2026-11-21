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
export function createKingdomAdvisor({getState, getSuggestion, getPlan, getLanguage = () => document.documentElement.lang, onNavigate, isVisible = () => true, host = document.body} = {}) {
  let expanded = false, muted = false, plan = null, detailedPlan = null, query = '', alternate = false, autoMode = true, trackedGoal = null, trackedLevel = null, trackedTopic = null, trackedResource = null;
  let lastRefresh = -Infinity, signature = '', destroyed = false, lastLanguage = '', announcedTask = '';
  const language = () => getLanguage?.() === 'en' ? 'en' : 'pl';
  const copy = (pl, en) => language() === 'en' ? en : pl;
  const root = make('aside', {class:'kingdom-advisor', 'data-kingdom-advisor':'', 'data-i18n-ignore':''});
  const advisorName = make('strong');
  const launch = make('button', {type:'button', class:'kingdom-advisor-launch', 'data-advisor-open':'', 'aria-expanded':'false', 'aria-controls':'kingdom-advisor-conversation'}, portrait(), make('span', {}, advisorName));
  const hint = make('span', {class:'kingdom-advisor-hint', 'data-advisor-hint':''});
  launch.lastChild.append(hint);
  const mute = make('button', {type:'button', class:'kingdom-advisor-mute', 'data-advisor-mute':'', onclick:() => {muted = !muted; update(true);}});
  const conversation = make('section', {id:'kingdom-advisor-conversation', class:'kingdom-advisor-conversation', 'data-advisor-conversation':'', hidden:'', 'aria-labelledby':'kingdom-advisor-title'});
  const close = make('button', {type:'button', 'data-advisor-close':'', onclick:() => setOpen(false)}, '×');
  const output = make('div', {class:'kingdom-advisor-answer', 'data-advisor-answer':'', 'aria-live':'off'});
  const liveStatus = make('span', {class:'kingdom-advisor-status',role:'status','aria-live':'polite','data-advisor-live-status':''});
  const context = make('p', {class:'kingdom-advisor-context'});
  const input = make('input', {id:'kingdom-advisor-input', type:'text', maxlength:'300', autocomplete:'off', 'data-advisor-input':''});
  const submit = make('button', {type:'submit', 'data-advisor-send':''});
  const inputLabel = make('label', {for:'kingdom-advisor-input'});
  const form = make('form', {class:'kingdom-advisor-form', onsubmit:event => {event.preventDefault(); ask(input.value);}}, inputLabel, make('div', {}, input, submit));
  const chips = make('div', {class:'kingdom-advisor-chips'});
  const eyebrow=make('small'),title=make('h2', {id:'kingdom-advisor-title'});
  conversation.append(make('header', {}, make('div', {}, eyebrow, title), close), context, output, chips, form);
  root.append(conversation, liveStatus, make('div', {class:'kingdom-advisor-summary'}, launch, mute));
  host.append(root);
  function staticCopy() {
    const value=language();if(lastLanguage===value)return false;lastLanguage=value;
    const heading=copy('Doradca Królestwa','Kingdom Advisor');root.setAttribute('aria-label',heading);advisorName.textContent=heading;title.textContent=heading;
    close.setAttribute('aria-label',copy('Zamknij rozmowę z doradcą','Close the advisor conversation'));
    context.textContent=copy('Jedno zadanie i najbliższe działania dla Twojej wyspy. Plan dostosowuje się do tego, co robisz. Możesz też zapytać o własny cel.','One task and the next actions for your island. The plan adapts to what you do. You can also ask about your own goal.');
    input.placeholder=copy('Np. Jak najszybciej rozbudować Port?','E.g. How can I upgrade the Port?');submit.textContent=copy('Zapytaj','Ask');inputLabel.textContent=copy('Twój cel lub pytanie','Your goal or question');eyebrow.textContent=copy('TWOJA WYSPA · TWÓJ PLAN','YOUR ISLAND · YOUR PLAN');
    chips.replaceChildren(...[['Rozbudowa Portu','Upgrade the Port'],['Wolni mieszkańcy','Available residents'],['Priorytety transportu','Transport priorities']].map(([pl,en])=>make('button',{type:'button',onclick:()=>{const label=copy(pl,en);input.value=label;ask(label);}},copy(pl,en))));
    signature='';return true;
  }
  function refreshHint(next) {
    root.classList.toggle('is-muted', muted);
    hint.textContent = muted ? copy('Podpowiedzi wyciszone. Porozmawiaj, kiedy chcesz.','Hints muted. Talk whenever you like.') : [next?.title,next?.steps?.[0]?.text].filter(Boolean).join(' · ') || copy('Porozmawiajmy o kolejnym kroku na wyspie.','Let’s discuss your island’s next step.');
    mute.textContent = muted ? copy('Włącz','Unmute') : copy('Wycisz','Mute');
    mute.title = muted ? copy('Włącz podpowiedzi','Enable hints') : copy('Wycisz podpowiedzi','Mute hints');mute.setAttribute('aria-pressed',String(muted));
  }
  function renderAnswer(next, announce = false) {
    plan=next;
    const visibleSteps=(next.steps||[]).slice(0,5),extraSteps=(next.steps||[]).slice(5);
    const nextSignature=JSON.stringify({language:language(),title:next.title,text:next.text,steps:visibleSteps,extraSteps,estimate:next.estimate?.text,premium:next.premium?.text,explanation:next.explanation,limitations:next.limitations,autoMode});
    if(signature===nextSignature)return;signature=nextSignature;
    const scroll=output.scrollTop,detailsWereOpen=output.querySelector('[data-advisor-why]')?.getAttribute('aria-expanded')==='true';
    const currentFocus=output.contains(document.activeElement)?document.activeElement:null;
    const focusKey=currentFocus?.hasAttribute('data-advisor-target')?['data-advisor-target',currentFocus.getAttribute('data-advisor-target')]:['data-advisor-why','data-advisor-alternative','data-advisor-current'].find(key=>currentFocus?.hasAttribute(key));
    output.replaceChildren(make('h3', {'data-advisor-task':next.taskId||next.kind||''},next.title||copy('Kolejny krok','Next step')),make('p',{},next.text||copy('Wybierz cel, a sprawdzę możliwości wyspy.','Choose a goal and I will review the island.')));
    if(visibleSteps.length)output.append(make('ol',{'data-advisor-actions':''},...visibleSteps.map(row=>make('li',{},make('p',{},row.text),row.target?make('button',{type:'button','data-advisor-target':row.target,onclick:()=>{setOpen(false);onNavigate(row);}},copy('Pokaż, gdzie','Show where')):null))));
    if(next.estimate?.text)output.append(make('p',{class:'kingdom-advisor-estimate','data-advisor-estimate':''},next.estimate.text));
    if(next.premium?.text)output.append(make('p',{class:'kingdom-advisor-estimate','data-advisor-premium':''},copy('Opcja za monety: ','Optional coin service: '),next.premium.text));
    const detail=make('div',{class:'kingdom-advisor-details',hidden:''},...[next.explanation,...(next.limitations||[])].filter(Boolean).map(text=>make('p',{},text)));
    if(extraSteps.length)detail.append(make('p',{},copy('Dalsze szczegóły tego planu:','Further details of this plan:')),make('ol',{},...extraSteps.map(row=>make('li',{},row.text))));
    const why=make('button',{type:'button','data-advisor-why':'','aria-expanded':'false',onclick:()=>{detail.hidden=!detail.hidden;why.setAttribute('aria-expanded',String(!detail.hidden));}},copy('Dlaczego tak?','Why this plan?'));
    const followups=make('div',{class:'kingdom-advisor-followups'},why);
    if(next.goal&&next.goal!=='theatre')followups.append(make('button',{type:'button','data-advisor-alternative':'',onclick:()=>{
      alternate=!alternate;const request=autoMode?copy('Inna droga','Another route'):query||copy('Inna droga','Another route');
      detailedPlan=getPlan(request,{goal:trackedGoal||plan?.goal,alternative:alternate,language:language()});autoMode=false;trackedGoal=detailedPlan.requestedGoal||detailedPlan.goal;trackedLevel=detailedPlan.requestedTargetLevel??detailedPlan.targetLevel;trackedTopic=!trackedGoal&&['food','workers','transport','resource'].includes(detailedPlan.kind)?detailedPlan.kind:null;trackedResource=detailedPlan.resource;
      renderAnswer(detailedPlan,true);lastRefresh=performance.now();
    }},copy('Inna droga','Another route')));
    if(!autoMode)followups.append(make('button',{type:'button','data-advisor-current':'',onclick:()=>{autoMode=true;trackedGoal=null;trackedLevel=null;trackedTopic=null;trackedResource=null;detailedPlan=null;alternate=false;signature='';update(true);}},copy('Bieżące zadanie','Current task')));
    output.append(followups,detail);
    if(detailsWereOpen){detail.hidden=false;why.setAttribute('aria-expanded','true');}
    output.scrollTop=scroll;
    if(focusKey){const selector=Array.isArray(focusKey)?`[${focusKey[0]}="${CSS.escape(focusKey[1])}"]`:`[${focusKey}]`;output.querySelector(selector)?.focus({preventScroll:true});}
    if(announce||announcedTask!==next.taskId){announcedTask=next.taskId;liveStatus.textContent=[next.title,announce?next.text:null].filter(Boolean).join('. ');}
  }
  function ask(value) {
    query=String(value||'').trim().slice(0,300);if(!query){input.focus();return;}
    alternate=false;autoMode=false;detailedPlan=getPlan(query,{goal:trackedGoal||plan?.goal,alternative:false,language:language()});
    trackedGoal=detailedPlan.requestedGoal||detailedPlan.goal;trackedLevel=detailedPlan.requestedTargetLevel??detailedPlan.targetLevel;trackedTopic=!trackedGoal&&['food','workers','transport','resource'].includes(detailedPlan.kind)?detailedPlan.kind:null;trackedResource=detailedPlan.resource;renderAnswer(detailedPlan,true);lastRefresh=performance.now();
  }
  function setOpen(value) {
    expanded=value;conversation.hidden=!value;launch.setAttribute('aria-expanded',String(value));root.classList.toggle('is-open',value);
    if(value){lastRefresh=-Infinity;update(true);input.focus({preventScroll:true});}else{update(true);launch.focus({preventScroll:true});}
  }
  function update(force=false) {
    if(destroyed)return;const languageChanged=staticCopy();root.hidden=!isVisible();if(root.hidden)return;
    const dock=document.querySelector('.mobile-bottom-dock'),mobileDock=dock?.getClientRects().length?dock.getBoundingClientRect():null;
    if(!expanded&&mobileDock)root.style.bottom=`${Math.max(12,innerHeight-mobileDock.top+10)}px`;else root.style.removeProperty('bottom');
    if(!force&&!languageChanged&&performance.now()-lastRefresh<1000)return;lastRefresh=performance.now();
    const state=getState();
    if(trackedGoal&&Number.isFinite(trackedLevel)&&Number(state.buildings?.[trackedGoal]?.level)>=trackedLevel){trackedGoal=null;trackedLevel=null;autoMode=true;detailedPlan=null;alternate=false;}
    const next=getSuggestion(state,{goal:trackedGoal,targetLevel:trackedLevel,topic:trackedTopic,resource:trackedResource,language:language()});refreshHint(next);
    // Detailed forecasts run only when the player explicitly asks. Automatic
    // updates use the small live plan and never retain a world or old history.
    if(expanded&&(autoMode||trackedGoal||trackedTopic))renderAnswer(!autoMode&&detailedPlan?{...next,explanation:detailedPlan.explanation,limitations:detailedPlan.limitations}:next);
    else if(expanded&&detailedPlan&&languageChanged)renderAnswer({...next});
  }
  launch.addEventListener('click',()=>setOpen(!expanded));
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&expanded){event.preventDefault();event.stopPropagation();setOpen(false);}});
  window.addEventListener('resize',update);update();
  return {update,open:()=>setOpen(true),destroy:()=>{destroyed=true;window.removeEventListener('resize',update);root.remove();}};
}
