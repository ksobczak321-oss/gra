import { availableGoods } from './harborlight-v1-logistics.js?v=frontend-v27';

const NAMES = {
  coins: ['Monety', 'Coins'], wood: ['Drewno', 'Wood'], stone: ['Kamień', 'Stone'],
  grain: ['Zboże', 'Grain'], food: ['Żywność', 'Food'], planks: ['Deski', 'Planks'],
  warehouse: ['Magazyn', 'Warehouse'], lumber: ['Drwale', 'Lumber Camp'],
  quarry: ['Kamieniołom', 'Quarry'], farm: ['Gospodarstwo', 'Farm'],
  windmill: ['Młyn', 'Windmill'], sawmill: ['Tartak', 'Sawmill'],
  house: ['Dom', 'House'], townhall: ['Ratusz', 'Town Hall'], lighthouse: ['Latarnia', 'Lighthouse']
};
const PRODUCER = { wood: 'lumber', stone: 'quarry', grain: 'farm', food: 'windmill', planks: 'sawmill' };
const finite = n => typeof n === 'number' && Number.isFinite(n);
const whole = n => finite(n) ? Math.max(0, Math.floor(n)) : 0;
const node = (tag, attrs = {}, ...children) => {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) element.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) element.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) if (child != null) element.append(typeof child === 'object' ? child : document.createTextNode(String(child)));
  return element;
};

export function formatMissionDuration(seconds, language = 'pl') {
  if (!finite(seconds)) return language === 'en' ? 'Not started' : 'Jeszcze nie rozpoczęto';
  let n = Math.max(0, Math.ceil(seconds));
  const days = Math.floor(n / 86400); n %= 86400;
  const hours = Math.floor(n / 3600); n %= 3600;
  const minutes = Math.floor(n / 60), rest = n % 60;
  return [days ? `${days} d` : '', hours ? `${hours} ${language === 'en' ? 'h' : 'godz.'}` : '', minutes ? `${minutes} min` : '', rest || (!days && !hours && !minutes) ? `${rest} s` : ''].filter(Boolean).join(' ');
}

function styles() {
  if (document.getElementById('harborlight-missions-style')) return;
  document.head.append(node('style', { id: 'harborlight-missions-style' }, `
    .lighthouse-missions{display:grid;gap:14px;min-width:0;overflow-wrap:anywhere}
    .lighthouse-missions *{box-sizing:border-box}.lighthouse-missions h3,.lighthouse-missions h4,.lighthouse-missions p{margin:0}
    .lighthouse-mission-box{display:grid;gap:12px;padding:15px;border:1px solid #597b88;border-radius:13px;background:#123442}
    .lighthouse-mission-muted{font-size:.9em;color:#c2d5dd}.lighthouse-mission-notice{padding:11px;border:1px solid #ad985b;border-radius:10px;color:#ffe4a7}
    .lighthouse-mission-path,.lighthouse-mission-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .lighthouse-mission-path span{padding:7px 10px;border:1px solid #547583;border-radius:9px}.lighthouse-mission-path [aria-current=step]{border-color:#d7b965;color:#ffe0a0;font-weight:bold}
    .lighthouse-mission-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px}
    .lighthouse-mission-grid>div{display:grid;gap:5px;padding:10px;border:1px solid #4f707e;border-radius:9px}
    .lighthouse-mission-deposit{display:grid;grid-template-columns:minmax(100px,1fr) minmax(65px,95px) auto;gap:9px;align-items:center}
    .lighthouse-missions button,.lighthouse-missions input{font:inherit;max-width:100%;min-width:0;border:1px solid #7d9ba7;border-radius:9px;padding:10px 13px}
    .lighthouse-missions button{background:#254b60;color:#f0f5f7;cursor:pointer}.lighthouse-missions button.primary{background:#dfbc70;color:#173342;font-weight:bold}
    .lighthouse-missions input{width:100%;background:#102e3b;color:#f4f8fa}.lighthouse-missions button:disabled{opacity:.45;cursor:default}
    .lighthouse-missions progress{width:100%;height:14px;accent-color:#dfbc70}
    @media(max-width:480px){.lighthouse-mission-deposit{grid-template-columns:minmax(0,1fr) minmax(70px,95px)}.lighthouse-mission-deposit button{grid-column:1/-1}.lighthouse-mission-actions button{width:100%}}
  `));
}

/** Native PL/EN presentation only. Every mutation goes through the game's
 * perform callback; this panel never grants a level, reward or receipt itself. */
export function createLighthouseMissionsPanel({ state, missionStatus, perform = () => false, onOpenBuilding = () => {}, onChange, language: requestedLanguage } = {}) {
  styles();
  const language = requestedLanguage === 'en' || requestedLanguage === 'pl' ? requestedLanguage : state?.settings?.language === 'en' ? 'en' : 'pl';
  const t = (pl, en) => language === 'en' ? en : pl;
  const name = id => NAMES[id]?.[language === 'en' ? 1 : 0] || id;
  const count = n => whole(n).toLocaleString(language === 'en' ? 'en-GB' : 'pl-PL');
  const root = node('div', { class: 'lighthouse-missions', 'data-lighthouse-missions': '', 'data-i18n-ignore': '', lang: language });
  let status = {}, pending = false, renderKey = '';
  const read = () => typeof missionStatus === 'function' ? missionStatus(state) : missionStatus || {};
  const keyOf = current => JSON.stringify([current.available, current.finished, current.kind, current.index, current.task?.id, current.task?.status, !!current.canStart, current.plan?.reason, current.plan?.reasonPl]);
  const available = resource => resource === 'coins' ? whole(state?.resources?.coins) : whole(availableGoods(state, resource));
  const kindName = kind => kind === 'rescue' ? t('Plan ratunkowy', 'Rescue plan') : kind === 'support' ? t('Misja pomocnicza', 'Support mission') : t('Misja główna', 'Main mission');
  const localized = (item, key) => language === 'pl' ? item?.[`${key}Pl`] || item?.[key] || '' : item?.[key] || '';
  const reason = current => {
    if (language === 'pl') return current.plan?.reasonPl || current.reasonPl || t('Przygotuj zapasy, obsadę i transport. Rozpoczniesz etap, gdy będzie możliwy do wykonania.', '');
    if (current.plan?.reason) return current.plan.reason;
    const polish = current.plan?.reasonPl || current.reasonPl;
    if (polish?.includes('limicie Ratusza')) return 'First make room within the Town Hall population limit.';
    if (polish?.includes('Ratusz do wymaganego')) return 'Upgrade the Town Hall to the required level first.';
    if (polish?.includes('samouczka')) return 'Lighthouse missions become available after you complete or close the practical course.';
    return 'Prepare supplies, workers and transport. You can start once this step is possible to complete.';
  };
  const action = (label, type, attrs = {}, payload = () => ({})) => node('button', { type: 'button', ...attrs, onclick: async event => {
    if (pending || event.currentTarget.disabled) return;
    const current = read(), task = current.task;
    if (type !== 'missionNext' && (!task || task.id !== status.task?.id)) { render(); return; }
    if (['missionStart', 'missionRetry'].includes(type) && !current.canStart) { render(); return; }
    if (type === 'missionDeposit' && (!current.active || task.objective?.type !== 'contribute')) { render(); return; }
    pending = true; event.currentTarget.disabled = true;
    try {
      const result = await perform({ type, ...(task ? { id: task.id } : {}), ...payload() });
      if (result !== false && result?.ok !== false) onChange?.(result);
    } finally { pending = false; render(); }
  } }, label);
  const openBuilding = id => node('button', { type: 'button', class: 'secondary', 'data-mission-open-building': id, onclick: () => onOpenBuilding(id) }, t('Otwórz: ', 'Open: ') + name(id));

  function objectiveInfo(current, box) {
    const task = current.task, objective = task.objective || {}, requirements = task.requirements || objective.requirements || {};
    if (objective.type === 'building') {
      const actual = whole(state?.buildings?.[objective.building]?.level);
      box.append(node('p', { 'data-mission-objective-progress': '' }, `${name(objective.building)}: ${t('poziom', 'level')} ${count(actual)} / ${count(objective.target)}`), openBuilding(objective.building));
    } else if (['production', 'delivered'].includes(objective.type)) {
      box.append(node('p', { 'data-mission-objective-progress': '' }, `${objective.type === 'production' ? t('Wyprodukowano', 'Produced') : t('Dostarczono do Magazynu', 'Delivered to central storage')}: ${name(objective.resource)} ${count(current.progress)} / ${count(objective.count)}`),
        node('progress', { value: whole(current.progress), max: Math.max(1, whole(objective.count)), 'aria-label': t('Postęp zadania', 'Task progress') }), openBuilding(PRODUCER[objective.resource] || 'warehouse'));
      if (objective.type === 'delivered') box.append(openBuilding('warehouse'));
    } else if (objective.type === 'assign') {
      box.append(node('p', { 'data-mission-objective-progress': '' }, `${name(objective.building)}: ${t('przydzieleni mieszkańcy', 'assigned residents')} ${count(state?.buildings?.[objective.building]?.workers)} / ${count(objective.count)}`), openBuilding(objective.building));
    } else if (objective.type === 'invitation') {
      const progress = Math.min(whole(objective.count), Math.max(0, whole(state?.lighthouseMissions?.invited) - whole(objective.baseline)));
      box.append(node('p', { 'data-mission-objective-progress': '' }, `${t('Zaproszeni mieszkańcy', 'Invited residents')}: ${count(progress)} / ${count(objective.count)}`), openBuilding('townhall'));
    }
    const entries = Object.entries(requirements).filter(([, n]) => n > 0);
    if (!entries.length) return;
    box.append(node('h4', {}, objective.type === 'contribute' ? t('Dostawy dla ekipy', 'Crew contributions') : objective.type === 'stock' ? t('Zapas do zgromadzenia', 'Stock to gather') : t('Potrzebne zasoby', 'Required resources')));
    if (objective.type !== 'contribute') {
      const grid = node('div', { class: 'lighthouse-mission-grid' });
      for (const [resource, required] of entries) grid.append(node('div', {}, node('span', {}, name(resource)), node('strong', { 'data-mission-requirement': resource }, objective.type === 'stock' ? `${count(available(resource))} / ${count(required)}` : count(required))));
      box.append(grid);
      if (objective.type === 'stock') box.append(node('p', { class: 'lighthouse-mission-muted' }, t('Wystarczy zgromadzić wolny zapas. Ten etap nie pobiera zasobów; wykorzystasz je przy właściwej akcji.', 'Gather the unreserved stock. This step does not spend it; the actual action will use it.')), openBuilding(current.kind === 'main' && current.index === 5 ? 'townhall' : 'warehouse'));
      return;
    }
    for (const [resource, required] of entries) {
      const deposited = whole(task.deposited?.[resource]), remaining = Math.max(0, whole(required) - deposited), limit = Math.min(remaining, available(resource));
      const quantity = node('input', { type: 'number', min: 1, step: 1, max: limit, value: limit ? String(limit) : '', disabled: !current.active || limit < 1,
        'aria-label': `${t('Przekaż', 'Contribute')}: ${name(resource)}`, 'data-mission-deposit-input': resource });
      const send = action(t('Przekaż', 'Contribute'), 'missionDeposit', { disabled: !current.active || limit < 1, 'data-mission-deposit': resource }, () => ({ resource, amount: Number(quantity.value) }));
      const validate = () => { const amount = Number(quantity.value), fresh = read(), maximum = Math.min(Math.max(0, required - whole(fresh.task?.deposited?.[resource])), available(resource));
        send.disabled = pending || !fresh.active || fresh.task?.id !== task.id || !Number.isSafeInteger(amount) || amount < 1 || amount > maximum; };
      quantity.addEventListener('input', validate);
      box.append(node('div', { class: 'lighthouse-mission-deposit' }, node('div', {}, node('strong', {}, name(resource)), node('p', { 'data-mission-deposited': resource }, `${count(deposited)} / ${count(required)}`)), quantity, send));
    }
    box.append(node('p', { class: 'lighthouse-mission-muted' }, t('Przekazane materiały są zużywane od razu. Możesz dostarczać je partiami z wolnego zapasu magazynu centralnego. Rezerwa żywności pozostaje chroniona.', 'Contributed materials are spent immediately. You can deliver instalments from unreserved central stock. The food reserve stays protected.')));
  }

  function render() {
    status = read(); root.replaceChildren();
    renderKey = keyOf(status);
    root.append(node('h3', {}, t('Latarnia — wspólny cel wyspy', 'Lighthouse — the island’s shared goal')),
      node('p', {}, t('Przywracając Latarni blask, rozwijasz całą osadę. Kolejne etapy pomagają zaplanować produkcję, przygotować zapasy i zapewnić mieszkańcom lepsze warunki życia.', 'Restoring the Lighthouse helps the whole settlement grow. Each step guides you through production, supplies and better living conditions for your residents.')));
    const path = node('div', { class: 'lighthouse-mission-path', 'aria-label': t('Ścieżki misji Latarni', 'Lighthouse mission paths') });
    for (const [kind, total] of [['main', 8], ['support', 5], ['rescue', 3]]) {
      const frame = status.kind === kind ? status : status.parents?.find(parent => parent.kind === kind);
      path.append(node('span', { ...(status.kind === kind ? { 'aria-current': 'step' } : {}), 'data-mission-path': kind }, `${kindName(kind)} · ${frame ? `${count(frame.index)} / ` : ''}${total} ${t('etapów', 'steps')}`));
    }
    root.append(path, node('p', { class: 'lighthouse-mission-muted' }, t('Misja główna ma 8 etapów. Jeśli zabraknie czasu, wykonasz 5 etapów pomocniczych i wrócisz do kolejnego celu. W razie potrzeby pomogą 3 etapy ratunkowe — dotychczasowy postęp zostaje z Tobą.', 'The main mission has eight steps. If time runs out, five support steps lead you back to the next goal. Three rescue steps offer further help when needed. Your previous progress is preserved.')));
    if (!status.available || !status.task) {
      root.append(node('div', { class: 'lighthouse-mission-box', 'data-mission-unavailable': '' }, node('h4', {}, status.finished ? t('Rozdział ukończony!', 'Chapter complete!') : t('Przygotuj wyspę na kolejną przygodę', 'Prepare for the next chapter')),
        node('p', {}, status.finished ? t('Latarnia znów świeci. Rozwijaj wyspę i rozbuduj Ratusz, aby odkryć kolejny rozdział.', 'The Lighthouse shines again. Keep developing the island and upgrade the Town Hall to discover another chapter.') : status.preview ? reason(status) : t('Misje Latarni zaczynają się od 2. poziomu Ratusza, po ukończeniu lub zamknięciu samouczka.', 'Lighthouse missions begin at Town Hall level 2, after completing or closing the practical course.')),
        openBuilding('townhall'), action(t('Sprawdź kolejny rozdział', 'Check the next chapter'), 'missionNext', { 'data-mission-next': '' })));
      return;
    }
    const task = status.task, box = node('section', { class: 'lighthouse-mission-box', 'data-mission-task': task.id });
    box.append(node('p', { class: 'lighthouse-mission-muted' }, `${t('Rozdział', 'Chapter')} ${count(status.chapter?.level)} · ${kindName(status.kind)} · ${count(status.index)} / ${count(status.total)}`),
      node('h4', {}, localized(task, 'title')), node('p', {}, localized(task, 'description')),
      node('p', {}, `${t('Nagroda za ten etap', 'Reward for this step')}: ${count(task.reward?.coins)} ${t('monet', 'coins')}`));
    if (status.kind !== 'main') box.append(node('p', { class: 'lighthouse-mission-notice' }, t('Mieszkańcy pomagają dokończyć przygotowania. Wykonaj tę ścieżkę, a wrócisz do dalszego rozwoju wyspy.', 'The residents are helping you finish preparations. Complete this path to return to the island’s next goal.')));
    box.append(node('p', { 'data-mission-timing': '' }, status.active ? t('Pozostały czas: ', 'Time remaining: ') : t('Czas na etap po rozpoczęciu: ', 'Time allowed after starting: '),
      node('strong', { 'data-mission-countdown': task.id, 'data-mission-deadline': task.deadline ?? '', 'data-mission-language': language }, formatMissionDuration(status.active ? status.remaining : status.plan?.duration || task.duration, language))));
    objectiveInfo(status, box);
    if (!status.active) {
      if (!status.canStart) box.append(node('p', { class: 'lighthouse-mission-notice', 'data-mission-feasibility': '' }, reason(status)));
      const staffing = Object.entries(status.plan?.staffing || {}).filter(([, n]) => n > 0);
      if (staffing.length) box.append(node('p', { class: 'lighthouse-mission-muted', 'data-mission-staffing': '' }, t('Plan przygotowania — potrzebna obsada: ', 'Preparation plan — workers needed: ') + staffing.map(([id, n]) => `${name(id)}: ${count(n)}`).join(' · ')));
      const retry = task.status === 'retry';
      box.append(action(retry ? t('Spróbuj ponownie', 'Try again') : t('Rozpocznij etap', 'Start step'), retry ? 'missionRetry' : 'missionStart', { class: 'primary', disabled: !status.canStart, 'data-mission-start': task.id }));
    } else box.append(node('p', { class: 'lighthouse-mission-muted', 'data-mission-active': '' }, t('Etap jest aktywny. Wykonaj wskazaną czynność w grze — postęp i nagroda zostaną rozliczone automatycznie.', 'This step is active. Perform the stated action in the game; progress and the reward are recorded automatically.')));
    root.append(box);
  }
  // The owner can refresh this existing panel on its normal world-clock tick.
  // Rebuild only for a changed step/status; typing a contribution survives ticks.
  root.refresh = () => {
    const next = read(), key = keyOf(next);
    if (key !== renderKey) { render(); return; }
    const countdown = root.querySelector('[data-mission-countdown]');
    if (countdown) countdown.textContent = formatMissionDuration(next.active ? next.remaining : next.plan?.duration || next.task?.duration, language);
    const objective = next.task?.objective || {}, label = root.querySelector('[data-mission-objective-progress]');
    if (label && ['production', 'delivered'].includes(objective.type)) {
      label.textContent = `${objective.type === 'production' ? t('Wyprodukowano', 'Produced') : t('Dostarczono do Magazynu', 'Delivered to central storage')}: ${name(objective.resource)} ${count(next.progress)} / ${count(objective.count)}`;
      root.querySelector('progress')?.setAttribute('value', whole(next.progress));
    }
    if (label && objective.type === 'building') label.textContent = `${name(objective.building)}: ${t('poziom', 'level')} ${count(state?.buildings?.[objective.building]?.level)} / ${count(objective.target)}`;
    if (label && objective.type === 'assign') label.textContent = `${name(objective.building)}: ${t('przydzieleni mieszkańcy', 'assigned residents')} ${count(state?.buildings?.[objective.building]?.workers)} / ${count(objective.count)}`;
    if (objective.type === 'stock') for (const requirement of root.querySelectorAll('[data-mission-requirement]')) {
      const resource = requirement.getAttribute('data-mission-requirement'); requirement.textContent = `${count(available(resource))} / ${count(next.task.requirements?.[resource])}`;
    }
    if (next.task?.objective?.type === 'contribute') for (const input of root.querySelectorAll('[data-mission-deposit-input]')) {
      const resource = input.getAttribute('data-mission-deposit-input'), required = whole(next.task.requirements?.[resource]), deposited = whole(next.task.deposited?.[resource]), limit = Math.min(Math.max(0, required - deposited), available(resource));
      input.max = String(limit); input.disabled = !next.active || limit < 1;
      const send = root.querySelector(`[data-mission-deposit="${resource}"]`), value = Number(input.value);
      if (send) send.disabled = pending || !next.active || !Number.isSafeInteger(value) || value < 1 || value > limit;
      const delivered = root.querySelector(`[data-mission-deposited="${resource}"]`); if (delivered) delivered.textContent = `${count(deposited)} / ${count(required)}`;
    }
  };
  render(); return root;
}
