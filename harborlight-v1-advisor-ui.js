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
export function createKingdomAdvisor({getState, getSuggestion, getPlan, onNavigate, isVisible = () => true, host = document.body} = {}) {
  let expanded = false, muted = false, plan = null, query = '', alternate = false, lastRefresh = -Infinity, signature = '', destroyed = false;
  const root = make('aside', {class:'kingdom-advisor', 'data-kingdom-advisor':'', 'data-i18n-ignore':'', 'aria-label':'Doradca Królestwa'});
  const launch = make('button', {type:'button', class:'kingdom-advisor-launch', 'data-advisor-open':'', 'aria-expanded':'false', 'aria-controls':'kingdom-advisor-conversation'}, portrait(), make('span', {}, make('strong', {}, 'Doradca Królestwa')));
  const hint = make('span', {class:'kingdom-advisor-hint', 'data-advisor-hint':''});
  launch.lastChild.append(hint);
  const mute = make('button', {type:'button', class:'kingdom-advisor-mute', 'data-advisor-mute':'', title:'Wycisz podpowiedzi', onclick:() => {muted = !muted; refreshHint();}}, 'Wycisz');
  const conversation = make('section', {id:'kingdom-advisor-conversation', class:'kingdom-advisor-conversation', 'data-advisor-conversation':'', hidden:'', 'aria-labelledby':'kingdom-advisor-title'});
  const close = make('button', {type:'button', 'data-advisor-close':'', 'aria-label':'Zamknij rozmowę z doradcą', onclick:() => setOpen(false)}, '×');
  const output = make('div', {class:'kingdom-advisor-answer', 'data-advisor-answer':'', 'aria-live':'polite', 'aria-atomic':'true'});
  const context = make('p', {class:'kingdom-advisor-context'}, 'Powiedz, co chcesz osiągnąć. Sprawdzę zapasy, obsadę i warunki na tej wyspie. Decyzje i kliknięcia należą do Ciebie.');
  const input = make('input', {id:'kingdom-advisor-input', type:'text', maxlength:'300', autocomplete:'off', placeholder:'Np. Jak najszybciej rozbudować Port?', 'data-advisor-input':''});
  const submit = make('button', {type:'submit', 'data-advisor-send':''}, 'Zapytaj');
  const form = make('form', {class:'kingdom-advisor-form', onsubmit:event => {event.preventDefault(); ask(input.value);}}, make('label', {for:'kingdom-advisor-input'}, 'Twój cel lub pytanie'), make('div', {}, input, submit));
  const chips = make('div', {class:'kingdom-advisor-chips'}, ...['Rozbudowa Portu','Wolni mieszkańcy','Priorytety transportu'].map(label => make('button', {type:'button', onclick:() => { input.value = label; ask(label); }}, label)));
  conversation.append(make('header', {}, make('div', {}, make('small', {}, 'TWOJA WYSPA · TWÓJ PLAN'), make('h2', {id:'kingdom-advisor-title'}, 'Doradca Królestwa')), close), context, output, chips, form);
  root.append(conversation, make('div', {class:'kingdom-advisor-summary'}, launch, mute));
  host.append(root);
  function refreshHint() {
    root.classList.toggle('is-muted', muted);
    hint.textContent = muted ? 'Podpowiedzi wyciszone. Porozmawiaj, kiedy chcesz.' : (getSuggestion(getState())?.text || 'Porozmawiajmy o kolejnym kroku na wyspie.');
    mute.textContent = muted ? 'Włącz' : 'Wycisz';
    mute.title = muted ? 'Włącz podpowiedzi' : 'Wycisz podpowiedzi';
    mute.setAttribute('aria-pressed', String(muted));
  }
  function renderAnswer(next) {
    plan = next;
    const nextSignature = JSON.stringify(next);
    if (signature === nextSignature) return;
    signature = nextSignature;
    const detailsWereOpen = output.querySelector('[data-advisor-why]')?.getAttribute('aria-expanded') === 'true';
    output.replaceChildren(make('h3', {}, next.title || 'Kolejny krok'), make('p', {}, next.text || 'Wybierz cel, a sprawdzę możliwości wyspy.'));
    if (next.steps?.length) output.append(make('ol', {}, ...next.steps.map(step => make('li', {}, make('p', {}, step.text), step.target ? make('button', {type:'button', 'data-advisor-target':step.target, onclick:() => {setOpen(false); onNavigate(step);}}, 'Pokaż, gdzie') : null))));
    if (next.estimate?.text) output.append(make('p', {class:'kingdom-advisor-estimate', 'data-advisor-estimate':''}, next.estimate.text));
    if (next.premium?.text) output.append(make('p', {class:'kingdom-advisor-estimate', 'data-advisor-premium':''}, 'Opcja za monety: ', next.premium.text));
    const detail = make('div', {class:'kingdom-advisor-details', hidden:''}, ...[next.explanation, ...(next.limitations || [])].filter(Boolean).map(text => make('p', {}, text)));
    const why = make('button', {type:'button', 'data-advisor-why':'', 'aria-expanded':'false', onclick:() => {detail.hidden = !detail.hidden; why.setAttribute('aria-expanded', String(!detail.hidden));}}, 'Dlaczego tak?');
    const other = make('button', {type:'button', 'data-advisor-alternative':'', onclick:() => {alternate = !alternate; renderAnswer(getPlan(query, {goal:plan?.goal, alternative:alternate}));}}, 'Inna droga');
    output.append(make('div', {class:'kingdom-advisor-followups'}, why, other), detail);
    if (detailsWereOpen) { detail.hidden = false; why.setAttribute('aria-expanded','true'); }
  }
  function ask(value) {
    query = String(value || '').trim().slice(0, 300);
    if (!query) {input.focus(); return;}
    alternate = false;
    renderAnswer(getPlan(query, {goal:plan?.goal, alternative:false}));
    lastRefresh = performance.now();
  }
  function setOpen(value) {
    expanded = value;
    conversation.hidden = !value;
    launch.setAttribute('aria-expanded', String(value));
    root.classList.toggle('is-open', value);
    if (value) {
      if (!plan) renderAnswer(getSuggestion(getState()));
      lastRefresh = -Infinity;
      update();
      input.focus({preventScroll:true});
    } else { update(); launch.focus({preventScroll:true}); }
  }
  function update() {
    if (destroyed) return;
    root.hidden = !isVisible();
    if (root.hidden) return;
    const dock = document.querySelector('.mobile-bottom-dock');
    const mobileDock = dock?.getClientRects().length ? dock.getBoundingClientRect() : null;
    if (!expanded && mobileDock) root.style.bottom = `${Math.max(12, innerHeight - mobileDock.top + 10)}px`;
    else root.style.removeProperty('bottom');
    if (performance.now() - lastRefresh < 5000) return;
    lastRefresh = performance.now();
    refreshHint();
    if (expanded) renderAnswer(query ? getPlan(query, {goal:plan?.goal, alternative:alternate}) : getSuggestion(getState()));
  }
  launch.addEventListener('click', () => setOpen(!expanded));
  root.addEventListener('keydown', event => {if (event.key === 'Escape' && expanded) {event.preventDefault(); event.stopPropagation(); setOpen(false);}});
  window.addEventListener('resize', update);
  update();
  return {update, open:() => setOpen(true), destroy:() => {destroyed = true; window.removeEventListener('resize', update); root.remove();}};
}
