// Session-only visual guidance. No game model, tutorial cursor, storage, clock,
// network, form submission or action dispatcher is imported or invoked here.
export const ADVISOR_GUIDANCE_ACTIONS = Object.freeze([
  'assign-workers', 'recipe-workers', 'upgrade', 'transport-priority',
  'food-settings', 'inspect', 'house-happiness', 'minigame'
]);
const BUILDINGS = new Set(['townhall','house','farm','lumber','quarry','windmill','sawmill','warehouse','dock','market','lighthouse','chapel','theatre','bakery','dairy','slaughterhouse','fisher','leatherworks','academy','barracks']);
const CONTROLS = new Set(['enabled','limit','priority-up','priority-down','save','cashout']);
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null;
const total = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const clamp = (value, min, max) => Math.min(Math.max(min, max), Math.max(min, value));
const NAMES = {
  pl: {townhall:'Ratusz',house:'Dom',farm:'Gospodarstwo',lumber:'Drwale',quarry:'Kamieniołom',windmill:'Młyn',sawmill:'Tartak',warehouse:'Magazyn',dock:'Port',market:'Targ',lighthouse:'Latarnia',chapel:'Kaplica',theatre:'Teatr',bakery:'Piekarnia',dairy:'Mleczarnia',slaughterhouse:'Rzeźnia',fisher:'Rybak',leatherworks:'Zakład skórzany',academy:'Akademia',barracks:'Koszary'},
  en: {townhall:'Town Hall',house:'House',farm:'Farm',lumber:'Lumber Camp',quarry:'Quarry',windmill:'Mill',sawmill:'Sawmill',warehouse:'Warehouse',dock:'Port',market:'Market',lighthouse:'Lighthouse',chapel:'Chapel',theatre:'Theatre',bakery:'Bakery',dairy:'Dairy',slaughterhouse:'Slaughterhouse',fisher:'Fisher',leatherworks:'Leatherworks',academy:'Academy',barracks:'Barracks'}
};

/** Only explicit semantic data is accepted; descriptions are never parsed. */
export function normalizeAdvisorGuidance(step) {
  const guide = step?.guidance;
  if (!guide || !ADVISOR_GUIDANCE_ACTIONS.includes(guide.action)) return null;
  const building = identifier(step.target);
  if (!BUILDINGS.has(building) && !(building === 'expeditions' && guide.action === 'minigame')) return null;
  if (guide.action === 'minigame' && building !== 'expeditions' || guide.action === 'house-happiness' && building !== 'house' || ['food-settings','transport-priority'].includes(guide.action) && building !== 'warehouse') return null;
  if (guide.control != null && (!CONTROLS.has(guide.control) || (guide.action === 'food-settings' ? guide.control === 'cashout' : guide.action === 'minigame' ? guide.control !== 'cashout' : true))) return null;
  const recipeId = identifier(guide.recipeId), resourceId = identifier(guide.resourceId);
  const gameId = identifier(guide.gameId), priority = identifier(guide.priority) || resourceId;
  if (guide.action === 'recipe-workers' && !recipeId) return null;
  if (guide.action === 'minigame' && guide.control !== 'cashout' && !gameId) return null;
  return Object.freeze({building, action:guide.action, recipeId, resourceId, gameId, priority,
    section:identifier(guide.section) || identifier(step.section),
    control:CONTROLS.has(guide.control) ? guide.control : null,
    targetCount:total(guide.targetCount),
    targetEnabled:typeof guide.targetEnabled === 'boolean' ? guide.targetEnabled : null});
}

/** Stable, language-independent controls; never arbitrary text or selectors. */
export function advisorGuidanceSelectors(spec) {
  if (!spec) return [];
  const id = spec.building;
  switch (spec.action) {
    case 'assign-workers': return [`[data-worker-building="${id}"][data-worker-delta="1"]`, `[data-worker-building="${id}"][data-worker-delta="-1"]`];
    case 'recipe-workers': return [`[data-v32-workers="${spec.recipeId}"]`];
    case 'upgrade': return [`[data-upgrade-building="${id}"]`];
    case 'transport-priority': return ['[data-warehouse-section-toggle="priorities"]', ...(spec.priority ? [`[data-warehouse-priority="${spec.priority}"]`] : [])];
    case 'food-settings': return ['[data-warehouse-section-toggle="feeding"]', ...(spec.resourceId ? [`[data-v32-food="${spec.resourceId}"]`] : [])];
    case 'house-happiness': return ['[data-house-everyone]'];
    case 'minigame': return spec.control === 'cashout' ? ['[data-expedition-cashout]'] : [`[data-expedition-choice="${spec.gameId}"]`, `[data-original-puzzle-choice="${spec.gameId}"]`];
    case 'inspect': return [`[data-building-panel="${id}"]`, `[data-building-details="${id}"]`, ...(id === 'academy' ? ['[data-v32-academy]'] : id === 'theatre' ? ['[data-theatre-panel]'] : [])];
    default: return [];
  }
}

/** Keep the small callout within the viewport and away from its real target. */
export function placeAdvisorGuidance(rect, width, height, viewportWidth, viewportHeight, safe = 10) {
  const w = Math.min(width, Math.max(1, viewportWidth - safe * 2));
  const h = Math.min(height, Math.max(1, viewportHeight - safe * 2));
  const gap = 12, centreX = rect.left + rect.width / 2, centreY = rect.top + rect.height / 2;
  const candidates = [
    {placement:'above',left:centreX-w/2,top:rect.top-h-gap},
    {placement:'below',left:centreX-w/2,top:rect.bottom+gap},
    {placement:'left',left:rect.left-w-gap,top:centreY-h/2},
    {placement:'right',left:rect.right+gap,top:centreY-h/2}
  ].map(p => ({...p,left:clamp(p.left,safe,viewportWidth-w-safe),top:clamp(p.top,safe,viewportHeight-h-safe)}));
  const score = p => Math.max(0,Math.min(p.left+w,rect.right+4)-Math.max(p.left,rect.left-4)) * Math.max(0,Math.min(p.top+h,rect.bottom+4)-Math.max(p.top,rect.top-4));
  return candidates.reduce((best,p) => score(p) < score(best) ? p : best);
}

export function createAdvisorGuidance({getPanel = () => null, getMapTarget, revealBuilding = () => {},
  getLanguage = () => document.documentElement.lang, isReady = () => true, getContextKey = () => '',
  readValue = () => undefined, isConfirmed = () => false, onComplete = () => {}, onCancel = () => {}, onUnavailable = () => {},
  host = document.body} = {}) {
  let current = null, target = null, targetTabindex = null, frame = 0, destroyed = false, observation = null;
  const root = document.createElement('aside');
  root.className = 'advisor-guidance'; root.dataset.advisorGuidance = ''; root.dataset.i18nIgnore = ''; root.hidden = true;
  const heading = document.createElement('strong'), message = document.createElement('p'), actions = document.createElement('div');
  heading.className = 'advisor-guidance-heading'; message.id = 'advisor-guidance-message';
  message.setAttribute('role','status'); message.setAttribute('aria-live','polite'); message.setAttribute('aria-atomic','true');
  actions.className = 'advisor-guidance-actions';
  const focusButton = document.createElement('button'), cancelButton = document.createElement('button');
  focusButton.type = cancelButton.type = 'button'; focusButton.dataset.advisorGuidanceFocus = ''; cancelButton.dataset.advisorGuidanceCancel = '';
  actions.append(focusButton,cancelButton); root.append(heading,message,actions); host.append(root);
  const pl = () => getLanguage?.() !== 'en';
  const copy = (polish,english) => pl() ? polish : english;
  const call = (fn,...args) => { try { return fn?.(...args); } catch { return undefined; } };
  const value = () => call(readValue,current?.step);
  const ready = () => call(isReady) === true;
  const contextKey = () => {const result=call(getContextKey);return result && typeof result === 'object' ? JSON.stringify(result) : result;};
  const text = (element,value) => {if(element.textContent !== value)element.textContent=value;};
  function visible(node) {
    if (!node?.isConnected || !node.getClientRects().length || node.closest('[hidden]')) return false;
    const style = getComputedStyle(node);
    return style.visibility !== 'hidden' && style.display !== 'none';
  }
  function onScreen(node) {
    if (!visible(node)) return false;
    const r = node.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
  }
  function find(scope,selector) { return [...scope.querySelectorAll(selector)].find(visible) || null; }
  function releaseTarget() {
    if (!target) return;
    target.classList.remove('advisor-guidance-target','advisor-guidance-map-target');
    const described = (target.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== message.id);
    if (described.length) target.setAttribute('aria-describedby',described.join(' ')); else target.removeAttribute('aria-describedby');
    if (targetTabindex != null) {
      if (targetTabindex.had) target.setAttribute('tabindex',targetTabindex.value); else target.removeAttribute('tabindex');
    }
    target = null; targetTabindex = null;
  }
  function stop(reason,completed = false) {
    if (!current) return;
    const old = current; current = null; releaseTarget(); root.hidden = true; root.removeAttribute('data-advisor-guidance-phase');
    observation?.disconnect(); observation = null; cancelAnimationFrame(frame); frame = 0;
    if (root.parentElement !== host) host.append(root);
    call(completed ? onComplete : onCancel,{step:old.step,reason});
  }
  function unavailable(reason) {
    if (!current) return;
    releaseTarget(); if(root.hidden)root.hidden = false; root.dataset.advisorGuidancePhase = 'unavailable'; if(!focusButton.hidden)focusButton.hidden = true;
    text(message,reason === 'crew-required'
      ? copy('Najpierw przydziel wystarczającą liczbę pracowników do budynku. Potem ustaw obsadę tego produktu.','First assign enough workers to the building. Then set staffing for this product.')
      : copy('Nie mogę teraz wskazać tej kontrolki. Sprawdź dostępność kroku w doradcy lub zakończ podpowiedź.','This control is not available right now. Review this step with the advisor or end the guidance.'));
    if(current.unavailableReason !== reason)call(onUnavailable,{step:current.step,reason});
    current.unavailableReason=reason;
    const dialog = document.querySelector('#island-dialog[open]');
    if (root.parentElement !== (dialog || host)) (dialog || host).append(root);
    Object.assign(root.style,{left:'12px',top:'12px'});
  }
  function label(phase) {
    const spec=current.spec, title=NAMES[pl() ? 'pl' : 'en'][spec.building] || spec.building;
    const count=spec.targetCount;
    if (phase === 'map') return copy(`Znajdź na mapie „${title}” i otwórz ten budynek.`,`Find ${title} on the map and open the building.`);
    if (phase === 'route') return copy('Otwórz listę minigier wskazanym przyciskiem.','Open the minigame list with the highlighted button.');
    if (phase === 'priorities') return copy('Otwórz „Priorytety transportu”.','Open Transport priorities.');
    if (phase === 'feeding') return copy('Otwórz „Wyżywienie”.','Open Feeding.');
    if (phase === 'recipe-input') return count == null ? copy('Wpisz liczbę osób przy wskazanym produkcie.','Enter the worker count for the highlighted product.') : copy(`Ustaw łącznie ${count} osób przy tym produkcie.`,`Set a total of ${count} workers for this product.`);
    if (phase === 'recipe-submit') return copy('Kliknij „Przydziel”, aby zatwierdzić obsadę tego produktu.','Select Assign to confirm staffing for this product.');
    if (phase === 'food-save') return copy('Zapisz ustawienia wyżywienia wskazanym przyciskiem.','Save the feeding settings with the highlighted button.');
    if (spec.action === 'assign-workers') return count == null ? copy('Przydziel mieszkańca wskazanym przyciskiem.','Assign a resident with the highlighted button.') : current.direction < 0 ? copy(`Przyciskiem „−” zmniejsz obsadę do ${count} osób.`,`Use − to reduce staffing to ${count} workers.`) : copy(`Przyciskiem „+” zwiększ obsadę do ${count} osób.`,`Use + to increase staffing to ${count} workers.`);
    if (spec.action === 'transport-priority') return copy('Wybierz wskazany priorytet transportu.','Choose the highlighted transport priority.');
    if (spec.action === 'food-settings') return spec.control === 'limit' ? copy(`Ustaw ilość${count == null ? '' : `: ${count}`}, a następnie zapisz wyżywienie.`,`Set the amount${count == null ? '' : `: ${count}`}, then save feeding settings.`) : ['priority-up','priority-down'].includes(spec.control) ? copy('Zmień kolejność wskazanego produktu, a następnie zapisz ustawienia.','Change this product’s order, then save the settings.') : copy('Zmień wydawanie wskazanego produktu, a następnie zapisz ustawienia.','Change whether this product is served, then save the settings.');
    if (spec.action === 'upgrade') return copy('Sprawdź koszt i kliknij wskazany przycisk rozbudowy.','Review the cost and select the highlighted upgrade button.');
    if (spec.action === 'house-happiness') return copy('Wskazanym przyciskiem przekaż zachowane szczęście mieszkańcom.','Use the highlighted button to distribute saved happiness to residents.');
    if (spec.action === 'minigame') return spec.control === 'cashout' ? copy('Odbierz zgromadzone monety wskazanym przyciskiem.','Cash out the earned coins with the highlighted button.') : copy('Uruchom wskazaną minigrę. Wynik i odbiór nagrody zależą od Twojej gry.','Start the highlighted minigame. The result and reward claim depend on your play.');
    return copy('Sprawdź wskazane informacje. Możesz zakończyć podpowiedź w każdej chwili.','Review the highlighted information. You can end this guidance at any time.');
  }
  function completed() {
    if (!current || call(isConfirmed,current.step) !== true) return false;
    const actual=value(), desired=current.spec.targetCount;
    if (['assign-workers','recipe-workers'].includes(current.spec.action) && desired != null && typeof actual === 'number' && Number.isFinite(actual)) return current.direction < 0 ? actual <= desired : actual >= desired;
    if (['food-settings','transport-priority'].includes(current.spec.action)) {
      if (desired != null && typeof actual === 'number') return actual === desired;
      if (typeof actual === 'boolean') return actual === (current.spec.targetEnabled ?? true);
    }
    return current.observedAction && actual !== undefined && current.initialValue !== undefined && actual !== current.initialValue;
  }
  function control(scope) {
    const spec=current.spec;
    if (spec.action === 'assign-workers') return {node:find(scope,`[data-worker-building="${spec.building}"][data-worker-delta="${current.direction < 0 ? '-1' : '1'}"]`),phase:'action'};
    if (spec.action === 'recipe-workers') {
      const input=find(scope,`[data-v32-workers="${spec.recipeId}"]`);
      if (!input) return {node:null};
      if (spec.targetCount != null && input.max !== '' && Number.isFinite(Number(input.max)) && spec.targetCount > Number(input.max)) return {node:null,reason:'crew-required'};
      const correct=spec.targetCount == null ? current.inputEdited : input.value !== '' && Number(input.value) === spec.targetCount;
      return correct && input.validity.valid ? {node:find(input.closest('form') || scope,'button[type="submit"]'),phase:'recipe-submit'} : {node:input,phase:'recipe-input'};
    }
    if (['transport-priority','food-settings'].includes(spec.action)) {
      const section=spec.action === 'transport-priority' ? 'priorities' : 'feeding';
      const toggle=find(scope,`[data-warehouse-section-toggle="${section}"]`);
      if (toggle?.getAttribute('aria-expanded') === 'false') return {node:toggle,phase:section};
      if (spec.action === 'transport-priority') return {node:spec.priority ? find(scope,`[data-warehouse-priority="${spec.priority}"]`) : null,phase:'action'};
      if (!spec.resourceId) return {node:null};
      const row=find(scope,`[data-v32-food="${spec.resourceId}"]`);
      if (!row) return {node:null};
      const form=row.closest('form');
      const selector=spec.control === 'limit' ? 'input[type="number"]' : spec.control === 'priority-up' ? '.v32-order button:first-child' : spec.control === 'priority-down' ? '.v32-order button:last-child' : 'input[type="checkbox"]';
      const field=find(row,selector);
      const correct=spec.control === 'limit' && spec.targetCount != null
        ? field?.value !== '' && Number(field?.value) === spec.targetCount
        : ['priority-up','priority-down'].includes(spec.control) && spec.targetCount != null
          ? [...row.parentElement.querySelectorAll('[data-v32-food]')].indexOf(row)+1 === spec.targetCount
          : (!spec.control || spec.control === 'enabled') && spec.targetEnabled != null ? field?.checked === spec.targetEnabled : true;
      if ((current.inputEdited && correct) || spec.control === 'save') return {node:form && find(form,'button[type="submit"]'),phase:'food-save'};
      return {node:field,phase:'action'};
    }
    if (spec.action === 'minigame' && spec.control === 'cashout') {
      const matches=[...scope.querySelectorAll('[data-expedition-cashout]')].filter(visible);
      return {node:matches.length === 1 ? matches[0] : null,phase:'action'};
    }
    if (spec.action === 'inspect' && spec.building === 'warehouse' && ['food','feeding','priorities','overview'].includes(spec.section)) {
      const section=spec.section === 'food' ? 'feeding' : spec.section;
      const toggle=find(scope,`[data-warehouse-section-toggle="${section}"]`);
      if (toggle?.getAttribute('aria-expanded') === 'false') return {node:toggle,phase:section};
      return {node:find(scope,`[data-warehouse-section="${section}"]`),phase:'inspect'};
    }
    for (const selector of advisorGuidanceSelectors(spec)) {const node=find(scope,selector);if(node)return {node,phase:spec.action === 'inspect' ? 'inspect' : 'action'};}
    return {node:null};
  }
  function setTarget(next,phase) {
    current.unavailableReason=null;
    const changed=next !== target;
    if (changed) {
      const restoreFocus=current.focusWasTarget && (!document.activeElement?.isConnected || document.activeElement === document.body);
      releaseTarget(); target=next; targetTabindex={had:target.hasAttribute('tabindex'),value:target.getAttribute('tabindex')};
      const ids=new Set((target.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));ids.add(message.id);target.setAttribute('aria-describedby',[...ids].join(' '));
      target.classList.add('advisor-guidance-target');
      if (phase !== 'map' && phase !== 'route') target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
      if (restoreFocus) target.focus({preventScroll:true});
    }
    target.classList.toggle('advisor-guidance-map-target',phase === 'map');
    const owner=target.closest('dialog[open]') || host;
    if (root.parentElement !== owner) owner.append(root);
    root.dataset.advisorGuidancePhase=phase;if(root.hidden)root.hidden=false;if(focusButton.hidden)focusButton.hidden=false;
    const text=label(phase);if(message.textContent !== text)message.textContent=text;
    if (!onScreen(target)) { stop('offscreen'); return; }
    const rect=target.getBoundingClientRect(),position=placeAdvisorGuidance(rect,root.offsetWidth,root.offsetHeight,innerWidth,innerHeight);
    root.dataset.placement=position.placement;
    Object.assign(root.style,{left:`${position.left}px`,top:`${position.top}px`});
    root.style.setProperty('--advisor-arrow-x',`${clamp(rect.left+rect.width/2-position.left,14,root.offsetWidth-14)}px`);
    root.style.setProperty('--advisor-arrow-y',`${clamp(rect.top+rect.height/2-position.top,14,root.offsetHeight-14)}px`);
  }
  function update() {
    if (!current || destroyed) return;
    text(heading,copy('Doradca — wskazówka','Advisor — guidance'));text(focusButton,copy('Przejdź do elementu','Focus the element'));text(cancelButton,copy('Zakończ','End guidance'));
    if (!ready() || current.contextKey !== contextKey()) {stop('context-changed');return;}
    const other=document.querySelector('dialog[open]:not(#island-dialog)');
    if (other) {stop('other-modal');return;}
    const panel=call(getPanel), dialog=document.querySelector('#island-dialog[open]');
    if (current.spec.building === 'expeditions' && dialog && ['menu','activities'].includes(panel?.kind)) {
      const entry=find(dialog,'[data-advisor-expeditions-entry]') || call(getMapTarget,'expeditions',current.step);
      if (!visible(entry) || entry.closest('dialog') !== dialog) {unavailable('missing-route-control');return;}
      setTarget(entry,'route');return;
    }
    const matching=dialog && (current.spec.building === 'expeditions' ? panel?.kind === 'expeditions' : ['building','building-details'].includes(panel?.kind) && panel.id === current.spec.building || current.spec.building === 'theatre' && panel?.kind === 'theatre');
    if (!matching) {
      if (dialog) {stop('different-panel');return;}
      if (current.enteredPanel) {stop('panel-closed');return;}
      const map=call(getMapTarget,current.spec.building,current.step);
      if (!onScreen(map)) {stop('offscreen');return;}
      setTarget(map,current.spec.building === 'expeditions' ? 'route' : 'map');return;
    }
    current.enteredPanel=true;
    if (completed()) {stop('confirmed-value',true);return;}
    const result=control(dialog);
    if (!result.node || result.node.disabled || result.node.readOnly) {unavailable(result.reason || (result.node ? 'disabled-control' : 'missing-control'));return;}
    setTarget(result.node,result.phase);
  }
  function schedule() { if (current && !frame && !destroyed) frame=requestAnimationFrame(() => {frame=0;update();}); }
  function interact(event) {
    if (!current || !target || !target.contains(event.target)) return;
    if (['input','change'].includes(event.type) || event.type === 'click' && current.spec.action === 'food-settings' && ['priority-up','priority-down'].includes(current.spec.control)) current.inputEdited=true;
    if (event.type === 'click' && ['action','recipe-submit','food-save'].includes(root.dataset.advisorGuidancePhase)) current.observedAction=true;
    schedule();
  }
  function keydown(event) { if (current && event.key === 'Escape') {event.preventDefault();event.stopPropagation();stop('escape');} }
  function focusin(event) {if(current)current.focusWasTarget=!!target?.contains(event.target);}
  focusButton.addEventListener('click',() => {if(target){if(!target.matches('button,input,select,textarea,a[href],[tabindex]'))target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}});
  cancelButton.addEventListener('click',() => stop('cancel'));
  document.addEventListener('click',interact,true);document.addEventListener('input',interact,true);document.addEventListener('change',interact,true);document.addEventListener('keydown',keydown,true);document.addEventListener('focusin',focusin,true);
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);window.visualViewport?.addEventListener('resize',schedule);
  document.addEventListener('pointermove',schedule,{passive:true});document.addEventListener('pointerup',schedule,{passive:true});
  const pagehide=() => stop('pagehide');window.addEventListener('pagehide',pagehide);
  return {
    root,
    start(step) {
      if (destroyed) return false;
      stop('replaced');const spec=normalizeAdvisorGuidance(step);
      if (!spec || !ready()) {call(onUnavailable,{step,reason:spec ? 'not-ready' : 'unsupported-action'});return false;}
      if (document.querySelector('dialog[open]')) {call(onUnavailable,{step,reason:'close-panel-first'});return false;}
      const map=call(getMapTarget,spec.building,step);
      if (!visible(map)) {call(onUnavailable,{step,reason:'missing-map-target'});return false;}
      const initialValue=call(readValue,step);
      current={step,spec,initialValue,contextKey:contextKey(),direction:spec.targetCount != null && typeof initialValue === 'number' && initialValue > spec.targetCount ? -1 : 1,inputEdited:false,observedAction:false,enteredPanel:false};
      if (spec.building !== 'expeditions') call(revealBuilding,spec.building,step);
      observation=new MutationObserver(records => {
        const external=records.some(record => {
          if(record.target === root || root.contains(record.target))return false;
          if(record.type === 'childList')return [...record.addedNodes,...record.removedNodes].some(node => node !== root && !root.contains(node));
          return true;
        });
        if(external)schedule();
      });
      observation.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden','disabled','readonly']});
      update();
      if(current)target?.focus({preventScroll:true});
      return !!current;
    },
    update, cancel:() => stop('cancel'),
    get active(){return !!current&&!destroyed;},get phase(){return root.dataset.advisorGuidancePhase || null;},
    destroy() {
      if (destroyed)return;stop('destroyed');destroyed=true;
      document.removeEventListener('click',interact,true);document.removeEventListener('input',interact,true);document.removeEventListener('change',interact,true);document.removeEventListener('keydown',keydown,true);document.removeEventListener('focusin',focusin,true);
      window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);window.visualViewport?.removeEventListener('resize',schedule);window.removeEventListener('pagehide',pagehide);root.remove();
      document.removeEventListener('pointermove',schedule);document.removeEventListener('pointerup',schedule);
    }
  };
}
