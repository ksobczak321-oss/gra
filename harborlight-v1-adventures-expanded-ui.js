import * as Adventures from './harborlight-v1-adventures.js?v=frontend-v32-22';
import { puzzleSceneArt, puzzleTokenArt } from './harborlight-v1-adventures-art.js?v=frontend-v32-22';
import { mountOriginalPuzzle } from './harborlight-v1-original-puzzles-ui.js?v=frontend-v32-22';
import { mountMiniGame } from './harborlight-v1-minigame-ui.js?v=frontend-v32-22';

const words = (language, pl, en) => language === 'en' ? en : pl;
const line = (value, language) => typeof value === 'string' ? value : value?.[language] || value?.pl || '';
function element(tag, attributes = {}, ...children) {
  const result = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key.startsWith('on') && typeof value === 'function') result.addEventListener(key.slice(2), value);
    else if (key === 'class') result.className = value;
    else if (value !== undefined && value !== null && value !== false) result.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) if (child !== undefined && child !== null && child !== false) result.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return result;
}
function artwork(source) { const template = document.createElement('template'); template.innerHTML = source; return template.content.firstElementChild; }
function setText(target, value) { if (target.textContent !== String(value ?? '')) target.textContent = value ?? ''; }
const button = (label, callback, attrs = {}) => element('button', { type: 'button', ...attrs, onclick: callback }, label);
function vector(tag, attrs = {}, value = '') { const result = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key, item] of Object.entries(attrs)) result.setAttribute(key, String(item)); if (value) result.textContent = value; return result; }
const coordinate = value => Math.max(-12, Math.min(112, Number(value) || 0));

/** Only visible clues and legal moves leave the model. UI input never decides
 * whether a room is solved, modifies a checkpoint, or grants a reward. */
export function createExpandedAdventureScene({ getState, getRun, language = 'pl', standardScene, send, allowAdSimulation=false }) {
  const t = (pl, en) => words(language, pl, en);
  const initial = getRun(), storyMode = initial.kind === 'escapeStory';
  const timed=getState()?.ruleset===32;const root=standardScene(initial,timed?t('Rozglądaj się, porównuj wskazówki i eksperymentuj. Każdy etap ma własny limit czasu. Wyjście kończy bieżącą próbę, zachowując wcześniejsze odkrycia.','Look around, compare clues and experiment. Every stage has its own timer. Leaving ends this attempt and keeps earlier discoveries.'):t('Rozglądaj się, porównuj wskazówki i eksperymentuj. Każdy ruch możesz przemyśleć — ta zagadka nie ma limitu czasu.','Look around, compare the clues and experiment. Take your time: this puzzle has no deadline.'));
  if(!document.querySelector('[data-original-puzzle-css]'))document.head.append(element('link',{rel:'stylesheet',href:new URL('./harborlight-v1-original-puzzles.css?v=frontend-v32-22',import.meta.url).href,'data-original-puzzle-css':''}));
  root.classList.add('adv-expanded'); root.dataset.expandedAdventure = initial.kind;
  const story = element('section', { class: 'adv-story-heading', 'data-puzzle-story': '' });
  const hero = element('div', { class: 'adv-puzzle-hero' });
  const heroArt = element('div', { class: 'adv-puzzle-scenery', 'aria-hidden': 'true' });
  const heroCopy = element('div', { class: 'adv-puzzle-hero-copy' });
  const eyebrow = element('span', { class: 'adv-label' }, t('Zatrzymaj się na małą przygodę', 'Make time for a little adventure'));
  const heading = element('h4', { 'data-puzzle-title': '' });
  const instruction = element('p', { class: 'adv-puzzle-instruction', 'data-puzzle-instruction': '' });
  const metadata = element('div', { class: 'adv-puzzle-metadata' });
  heroCopy.append(eyebrow, heading, instruction, metadata); hero.append(heroArt, heroCopy);
  const workbench = element('div', { class: 'adv-puzzle-workbench' });
  const boardColumn = element('div', { class: 'adv-puzzle-board-column' });
  const board = element('div', { class: 'adv-puzzle-grid', 'data-puzzle-grid': '', role: 'group' });
  const connections = element('div', { class: 'adv-puzzle-connections', 'aria-hidden': 'true' });
  const gridWrap = element('div', { class: 'adv-puzzle-grid-wrap' }, connections, board);
  const spatial = element('div', { class: 'adv-puzzle-spatial', 'data-puzzle-spatial': '', hidden: true });
  const minigame = element('div', { class: 'adv-puzzle-minigame', 'data-puzzle-minigame': '' });
  const miniControls = element('div', { class: 'adv-puzzle-mini-controls' });
  const itemsHeading = element('h5', {}, t('Przedmioty do wykorzystania', 'Your useful objects'));
  const items = element('div', { class: 'adv-puzzle-items', 'data-puzzle-items': '', role: 'group', 'aria-label': t('Wybierz przedmiot', 'Choose an object') });
  const targetsHeading = element('h5', {}, t('Gdzie je umieścisz?', 'Where will they go?'));
  const targets = element('div', { class: 'adv-puzzle-targets', 'data-puzzle-targets': '', role: 'group', 'aria-label': t('Miejsca na przedmioty', 'Places for your objects') });
  const controls = element('div', { class: 'adv-puzzle-controls', 'data-puzzle-controls': '' });
  const interactionHelp = element('p', { class: 'adv-puzzle-gesture-help' }, t('Wybierz przedmiot i miejsce albo przeciągnij go na wybrane pole. Wszystkie ruchy wykonasz też klawiaturą.', 'Choose an object and a place, or drag it onto its destination. Every move also works with the keyboard.'));
  boardColumn.append(spatial, gridWrap, minigame, miniControls, itemsHeading, items, targetsHeading, targets, interactionHelp, controls);
  const journal = element('aside', { class: 'adv-puzzle-journal', 'aria-label': t('Notatnik przygody', 'Adventure journal') });
  const cluesHeading = element('h5', {}, t('Co już wiemy', 'What we know'));
  const connection = element('p', { class: 'adv-puzzle-connection', 'data-story-connection': '', hidden: true });
  const clues = element('ul', { 'data-puzzle-clues': '' });
  const knowledge = element('div', { class: 'adv-puzzle-knowledge', 'data-story-knowledge': '' });
  const hint = element('p', { class: 'adv-puzzle-hint', role: 'status', 'aria-live': 'polite', 'data-puzzle-hint': '', hidden: true });
  const actions = element('div', { class: 'adv-puzzle-journal-actions' });
  const undo = button(t('Cofnij ruch', 'Undo move'), () => send('puzzleUndo'), { class: 'adv-quiet', 'data-puzzle-undo': '' });
  const hintButton = button(t('Mała podpowiedź', 'A little hint'), () => send('puzzleHint'), { class: 'adv-quiet', 'data-puzzle-hint-button': '' });
  const reset = button(t('Ułóż ten pokój od nowa', 'Reset this room'), () => send('puzzleReset'), { class: 'adv-quiet', 'data-puzzle-reset': '' });
  const easier=button(t('Łatwiejszy etap · pozostałe nagrody 50%','Easier stage · remaining rewards 50%'),()=>send('puzzleEasier'),{class:'adv-quiet','data-puzzle-easier':''});
  actions.append(hintButton, undo, reset,easier);
  journal.append(cluesHeading, connection, clues, knowledge, hint, actions, element('p', { class: 'adv-puzzle-checkpoint' }, t('Wyjście kończy bieżącą próbę. Zachowujesz ukończone etapy, odkrycia, przedmioty i wcześniej odebrane nagrody.', 'Leaving ends the current attempt. Completed stages, clues, items and earlier rewards are kept.')));
  workbench.append(boardColumn, journal);
  const roomSuccess = element('section', { class: 'adv-room-success', 'data-room-success': '', role: 'status', hidden: true }, element('span', { class: 'adv-room-seal', 'aria-hidden': 'true' }, '✓'), element('div', {}, element('h5', {}, t('To odkrycie prowadzi dalej!', 'Your discovery opens the way!')), element('p', {}, t('Zabierasz ze sobą nową wskazówkę. Przyda się w kolejnej części historii.', 'You are taking a new clue with you. It will help in the next part of the story.'))));
  const nextRoom = button(t('Otwórz następny pokój', 'Open the next room'), () => send('puzzleNextRoom'), { class: 'adv-primary', 'data-puzzle-next-room': '' });
  roomSuccess.append(nextRoom);
  const timerOffer=element('div',{class:'adv-v32-time-offer',hidden:true,'data-journey-time-offer':''}),failedNotice=element('p',{class:'adv-status','data-journey-failed':'',hidden:true},t('Ta próba zakończyła się przegraną. Wcześniejsze etapy i przedmioty pozostają. Rozpocznij nową próbę tego etapu.','This attempt ended. Earlier stages and items are kept. Start a new attempt of this stage.'));
  root.append(story, hero,failedNotice,workbench, roomSuccess,timerOffer);
  let lastSignature = '', shape = '', selectedDrag = null, miniController = null, originalController=null, originalKey='',timeOfferKey='', currentMiniId = '', disposed = false;
  const maps = new Map();
  let latestView = null;
  const move = async input => {
    if (!input || disposed) return;
    return send('puzzleMove', { move: input });
  };
  function reconcile(container, records, family) {
    let map = maps.get(family); if (!map) { map = new Map(); maps.set(family, map); }
    const present = new Set();
    records.forEach((record, index) => {
      const id = String(record.id ?? record.index ?? index); present.add(id);
      let target = map.get(id);
      if (!target) {
        target = button('', () => move(target._puzzleRecord?.move), { class: `adv-puzzle-${family}-button`, [`data-puzzle-${family}`]: id });
        target.append(element('span', { class: 'adv-puzzle-object-icon', 'aria-hidden': 'true' }), element('span', { class: 'adv-puzzle-object-label' }), element('small', { class: 'adv-puzzle-object-description' }));
        if (family === 'item') {
          target.draggable = true;
          target.addEventListener('dragstart', event => { selectedDrag = target._puzzleRecord?.id; event.dataTransfer?.setData('text/plain', String(selectedDrag)); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'; });
          target.addEventListener('dragend', () => { selectedDrag = null; });
        } else if (family === 'target' || family === 'cell') {
          target.addEventListener('dragover', event => { if (selectedDrag != null) { event.preventDefault(); target.dataset.dragOver = 'true'; } });
          target.addEventListener('dragleave', () => delete target.dataset.dragOver);
          target.addEventListener('drop', event => { event.preventDefault(); delete target.dataset.dragOver; if (selectedDrag != null && target._puzzleRecord?.move) void move({ ...target._puzzleRecord.move, id: selectedDrag }); selectedDrag = null; });
        }
        map.set(id, target); container.append(target);
      }
      target._puzzleRecord = record;
      target.disabled = record.disabled === true || !record.move || latestView?.solved === true;
      target.setAttribute('aria-pressed', String(record.selected === true));
      target.dataset.tone = record.tone || (record.active ? 'active' : 'plain');
      target.dataset.symbol = String(record.symbol ?? '');
      target.dataset.selected = String(record.selected === true);
      if (family === 'cell') {
        if (Number.isFinite(record.row)) target.style.gridRow = String(record.row + 1);
        if (Number.isFinite(record.column ?? record.col)) target.style.gridColumn = String((record.column ?? record.col) + 1);
      }
      const label = line(record.label, language) || String(record.symbol ?? id);
      setText(target.querySelector('.adv-puzzle-object-label'), label);
      setText(target.querySelector('.adv-puzzle-object-description'), line(record.description, language));
      target.setAttribute('aria-label', [family === 'cell' ? `${t('Pole', 'Cell')} ${Number(record.index ?? index) + 1}` : '', label, line(record.description, language)].filter(Boolean).join('. '));
      const picture = target.querySelector('.adv-puzzle-object-icon'), icon = record.icon || (family === 'cell' && record.symbol ? null : latestView?.kind);
      const artKey = `${icon}:${record.rotation || 0}`;
      if (picture.dataset.artKey !== artKey) {
        picture.dataset.artKey = artKey;
        if (icon) picture.replaceChildren(artwork(puzzleTokenArt(icon, { label })));
        else picture.replaceChildren(element('span', { class: 'adv-puzzle-symbol' }, record.symbol || '·'));
        picture.style.transform = Number.isFinite(record.rotation) ? `rotate(${record.rotation * (Math.abs(record.rotation) < 5 ? 90 : 1)}deg)` : '';
      }
    });
    for (const [id, target] of map) if (!present.has(id)) { target.remove(); map.delete(id); }
  }
  function update() {
    if (disposed) return;
    const run = getRun();
    if (!run || run.id !== initial.id || !run.data?.puzzle || typeof Adventures.getIslandPuzzleView !== 'function') return;
    const signature = JSON.stringify([run.data.puzzle, run.data.story, run.stage,run.data.stageAttempt,run.data.rewardScale]);
    if (signature === lastSignature) return;
    lastSignature = signature;
    const view = Adventures.getIslandPuzzleView(run.data.puzzle, language); latestView = view;
    if (!view) return;
    const stage=Adventures.journeyStageStatus?.(getState(),run)||{},attempt=stage.attempt;const failed=attempt&&attempt.status!=='active'&&attempt.status!=='won';failedNotice.hidden=!failed;
    const room = storyMode ? Adventures.getCurrentStoryRoom?.(run, language) : null;
    const nextShape = `${run.data.puzzle.kind || view.kind}:${run.data.story?.roomIndex ?? 0}`;
    if (nextShape !== shape) {
      shape = nextShape; maps.clear(); board.replaceChildren(); items.replaceChildren(); targets.replaceChildren(); controls.replaceChildren();
      heroArt.replaceChildren(artwork(puzzleSceneArt(view.kind, { title: line(view.title, language), prefix: `puzzle-${run.id}-${room?.roomIndex || 0}` })));
      root.dataset.puzzleKind = view.kind;
    }
    setText(heading, line(view.title, language)); setText(instruction, line(view.instruction, language));
    setText(eyebrow, room ? `${t('Pokój', 'Room')} ${room.roomIndex + 1} / ${room.roomCount}` : t('Mała przygoda, prawdziwy pomysł', 'A little adventure, a real idea'));
    metadata.replaceChildren(element('span', {}, !timed?t('Bez limitu czasu','No time limit'):attempt?`${t('Czas etapu','Stage time')}: ${Math.ceil(attempt.remaining)} s`:t('Rozpocznij próbę etapu','Start this stage')),element('span',{},`${t('Trudność','Difficulty')}: ${attempt?.difficulty||1}${run.data.rewardScale===.5?' · 50% nagrody':''}`), element('span', { 'data-puzzle-progress': '' }, `${view.progress?.current ?? 0} / ${view.progress?.total ?? 1}`),
      element('span', {}, `${t('Wariant', 'Variant')} ${view.variant || 1}`), ...(view.status ? [element('span', { 'data-puzzle-status': '' }, line(view.status, language))] : []));
    if (room) {
      story.hidden = false;
      const storySignature = JSON.stringify([room.title, room.intro, room.roomIndex, room.roomCount]);
      if (story.dataset.value !== storySignature) {
        story.dataset.value = storySignature;
        story.replaceChildren(element('span', { class: 'adv-label' }, t('Twoja opowieść', 'Your story')), element('h4', {}, line(room.title, language)), element('p', {}, line(room.intro, language)),
          element('ol', { class: 'adv-story-room-track', 'aria-label': t('Postęp opowieści', 'Story progress') }, ...Array.from({ length: room.roomCount }, (_, index) => element('li', { 'data-room-index': index, 'data-current': String(index === room.roomIndex), 'data-completed': String(index < room.roomIndex), ...(index === room.roomIndex ? { 'aria-current': 'step' } : {}) }, index < room.roomIndex ? '✓' : String(index + 1)))));
      }
    } else story.hidden = true;
    setText(connection, line(room?.connection, language)); connection.hidden = !room?.connection;
    const clueStrings = (view.clues || []).map(clue => line(clue.label ?? clue, language));
    const clueSignature = JSON.stringify(clueStrings);
    if (clues.dataset.value !== clueSignature) { clues.dataset.value = clueSignature; clues.replaceChildren(...clueStrings.map(clue => element('li', {}, clue))); }
    const notes = room?.knowledge || [];
    const notesSignature = JSON.stringify(notes);
    if (knowledge.dataset.value !== notesSignature) {
      knowledge.dataset.value = notesSignature;
      knowledge.replaceChildren(...notes.map(note => element('div', { class: 'adv-notebook-entry' }, artwork(puzzleTokenArt('key')), element('span', {}, line(note.label || note.title || note, language)), note.value !== undefined ? element('strong', {}, line(note.value, language) || String(note.value)) : null)));
    }
    knowledge.hidden = !notes.length;
    const hintText = line(view.hint, language); setText(hint, hintText); hint.hidden = !hintText;
    undo.disabled = !view.canUndo||failed||!!attempt?.timeOffer; reset.disabled = view.solved === true;hintButton.hidden=timed&&!stage.canUseHelp;hintButton.disabled = view.solved===true||failed||attempt?.hintUsed===true;easier.hidden=!timed||!stage.canUseHelp||view.solved===true;setText(reset,!timed?t('Ułóż ten pokój od nowa','Reset this room'):failed?t('Spróbuj ponownie','Try again'):t('Zakończ próbę i zacznij etap od nowa','End attempt and restart stage'));
    const cells = view.grid?.cells || [], rows = view.grid?.rows || 1, cols = view.grid?.cols || 1;
    gridWrap.hidden = !cells.length || !!view.miniGame||!!view.originalAttempt;
    board.style.setProperty('--puzzle-columns', cols); board.style.setProperty('--puzzle-rows', rows);
    board.setAttribute('aria-label', line(view.title, language));
    reconcile(board, cells, 'cell');
    const rays = view.rays || [], ropes = view.connections || [], objects = view.objects || [];
    connections.replaceChildren();
    if (rays.length) {
      const drawing = vector('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none' });
      for (const ray of rays) drawing.append(vector('line', { x1: coordinate(ray.x1), y1: coordinate(ray.y1), x2: coordinate(ray.x2), y2: coordinate(ray.y2), stroke: '#ffe59a', 'stroke-width': '1.25', 'stroke-linecap': 'round', class: 'adv-light-ray' }));
      connections.append(drawing);
    }
    spatial.hidden = !ropes.length && !objects.length;
    if (ropes.length || objects.length) {
      const drawing = vector('svg', { viewBox: '0 0 100 75', role: 'img', 'aria-label': line(view.title, language), 'data-spatial-drawing': '' });
      drawing.append(vector('rect', { width: 100, height: 75, rx: 3, fill: objects.length ? '#598b87' : '#164756' }));
      drawing.append(vector('path', { d: 'M0 61q12-4 25 0t25 0 25 0 25 0v14H0Z', fill: '#2e6f78', stroke: '#9bc7bc', 'stroke-width': '.7' }));
      for (const rope of ropes) {
        const x1 = coordinate(rope.x1), y1 = coordinate(rope.y1) * .72, x2 = coordinate(rope.x2), y2 = coordinate(rope.y2) * .72;
        drawing.append(vector('path', { d: `M${x1} ${y1} C38 ${y1 + 3},62 ${y2 + 3},${x2} ${y2}`, fill: 'none', stroke: rope.crossed ? '#daa46f' : '#b9d2a5', 'stroke-width': '1.2', 'data-puzzle-rope': `${rope.from}-${rope.to}` }));
        for (const [x, y, value] of [[x1, y1, rope.from], [x2, y2, rope.to]]) {
          drawing.append(vector('circle', { cx: x, cy: y, r: '3.6', fill: '#9d895a', stroke: '#ead7a2', 'stroke-width': '.6' }));
          drawing.append(vector('text', { x, y: y + 1.25, 'text-anchor': 'middle', fill: '#fff0b9', 'font-size': '3.5', 'font-weight': 'bold' }, String(Number(value) + 1)));
        }
      }
      for (const object of objects) {
        drawing.append(vector('circle', { cx: coordinate(object.targetX), cy: coordinate(object.targetY) * .75, r: '5', fill: 'none', stroke: '#f2d18a', 'stroke-width': '.8', 'stroke-dasharray': '1.3 1.3' }));
        const group = vector('g', { transform: `translate(${coordinate(object.x)} ${coordinate(object.y) * .75})`, 'data-photo-object': object.id });
        group.append(vector('circle', { r: '4.3', fill: '#254f59', stroke: '#d1dfbb', 'stroke-width': '.6' }));
        group.append(vector('text', { y: '1.6', 'text-anchor': 'middle', fill: '#e4efcd', 'font-size': '5' }, object.symbol || object.label || '✦'));
        drawing.append(group);
      }
      spatial.replaceChildren(drawing);
    }
    const itemRows = view.items || [], targetRows = view.targets || [], controlRows = view.controls || [];
    items.hidden = itemsHeading.hidden = !itemRows.length;
    targets.hidden = targetsHeading.hidden = !targetRows.length;
    interactionHelp.hidden = !(itemRows.length && targetRows.length);
    reconcile(items, itemRows, 'item'); reconcile(targets, targetRows, 'target'); reconcile(controls, controlRows, 'control');
    controls.hidden = !controlRows.length;
    if(view.originalAttempt){
      miniController?.dispose();miniController=null;minigame.hidden=false;
      const key=attempt?.id||`${run.id}:${room?.roomIndex||0}`;
      const status=()=>{const current=getRun(),p=current.data.puzzle,a=current.data.stageAttempt,s=Adventures.journeyStageStatus(getState(),current),b=p.data.attempt;return{...s,attempt:{...b,...a,id:a?.id||b.id,variant:p.kind},canStart:false,progress:p.kind==='signal-line'?b.usedEdges.length/b.board.edges.length:b.board.removed.length/b.board.paths.length,reward:0};};
      if(!originalController||originalKey!==key){originalController?.dispose();originalKey=key;originalController=mountOriginalPuzzle({host:minigame,variant:run.data.puzzle.kind,getStatus:status,embedded:true,allowAdSimulation,onAction:action=>{if(action.type==='originalPuzzleInput'){const i=action.input;return move(i.kind==='node'?{type:'node',id:i.node}:i.kind==='convoy'?{type:'convoy',id:i.id}:{type:i.kind});}if(action.type==='originalPuzzleTimeChoice')return send('puzzleTimeChoice',{method:action.method});if(action.type==='originalPuzzleExtend')return send('puzzleAdComplete',{receipt:action.receipt,completed:action.completed});}});}else originalController.update();
    }else if (view.miniGame) {
      originalController?.dispose();originalController=null;
      if (!document.querySelector('[data-adventure-minigame-css]')) document.head.append(element('link', { rel: 'stylesheet', href: new URL('./harborlight-v1-minigame.css?v=frontend-v32-22', import.meta.url).href, 'data-adventure-minigame-css': '' }));
      minigame.hidden = false;
      const mini = { id: run.id, miniGame: view.miniGame, status: view.solved ? 'won' : failed?'lost':'active', level: run.data.puzzle.difficulty || 1, roundStartedAt: run.startedAt || 0 };
      const status = { elapsed:attempt?attempt.initialDuration-attempt.remaining:0, remaining:attempt?.remaining||0,adPaused:!!attempt?.timeOffer };
      const miniKey = `${run.id}:${room?.roomIndex || 0}:${view.miniGame.kind}:${view.miniGame.cards?.length || 0}`;
      if (!miniController || currentMiniId !== miniKey) {
        miniController?.dispose(); currentMiniId = miniKey;
        miniController = mountMiniGame({ host: minigame, controlsHost: miniControls, run: mini, language, status,
          onAction: input => move(input.type === 'expeditionMiniGameReveal' ? { type: 'reveal', index: input.index } : { type: 'tilt', tiltX: input.tiltX, tiltY: input.tiltY }) });
      } else miniController.update(mini, status);
    } else { originalController?.dispose();originalController=null;minigame.hidden = true; if (miniController) { miniController.dispose(); miniController = null; minigame.replaceChildren(); miniControls.replaceChildren(); } }
    timerOffer.hidden=!attempt?.timeOffer||!!view.originalAttempt;
    const offerKey=timerOffer.hidden?'':`${attempt.id}:${attempt.timeOffer.status}:${attempt.timeOffer.receipt||''}`;
    if(offerKey!==timeOfferKey){timeOfferKey=offerKey;timerOffer.replaceChildren();if(offerKey){const dialog=element('section',{class:'original-puzzle-dialog',role:'dialog','aria-modal':'true','aria-label':t('Dodatkowy czas','Extra time')});dialog.append(element('h4',{},t('Potrzebujesz więcej czasu?','Need more time?')));if(attempt.timeOffer.status==='choice'){dialog.append(element('p',{},`${t('Dodaj','Add')} ${Math.ceil(Math.max(60,attempt.remaining*.5))} s`),element('p',{'data-journey-countdown':''}),button(`${10*attempt.highestTownhall} ${t('monet','coins')}`,()=>send('puzzleTimeChoice',{method:'coins'})));if(allowAdSimulation)dialog.append(button(t('Reklama — symulacja DEV','Ad — DEV simulation'),()=>send('puzzleTimeChoice',{method:'ad'})));dialog.append(button(t('Gram dalej','Keep playing'),()=>send('puzzleTimeChoice',{method:'decline'})));}else{dialog.append(element('p',{},t('Zegar etapu jest zatrzymany.','The stage clock is paused.')));if(allowAdSimulation)dialog.append(button(t('Zakończ symulację reklamy','Complete simulated ad'),()=>send('puzzleAdComplete',{receipt:attempt.timeOffer.receipt,completed:true})));dialog.append(button(t('Przerwij i graj dalej','Cancel and keep playing'),()=>send('puzzleAdComplete',{receipt:attempt.timeOffer.receipt,completed:false})));}timerOffer.append(dialog);}}
    const countdown=timerOffer.querySelector('[data-journey-countdown]');if(countdown)countdown.textContent=`${t('Powrót do gry','Resume in')}: ${Math.ceil(attempt.timeOffer?.choiceRemaining||0)} s`;
    roomSuccess.hidden = !(view.solved || room?.nextAvailable);
    nextRoom.disabled = !(view.solved || room?.nextAvailable);
    const moreRooms = room && room.roomIndex + 1 < room.roomCount;
    setText(roomSuccess.querySelector('h5'), moreRooms ? t('To odkrycie prowadzi dalej!', 'Your discovery opens the way!') : t('Zagadka rozwiązana!', 'Puzzle solved!'));
    setText(roomSuccess.querySelector('p'), moreRooms ? t('Zabierasz ze sobą nową wskazówkę. Przyda się w kolejnej części historii.', 'You are taking a new clue with you. It will help in the next part of the story.') : t('Możesz zakończyć tę przygodę i zobaczyć jej wynik.', 'Finish this adventure to see its outcome.'));
    setText(nextRoom, moreRooms ? t('Otwórz następny pokój', 'Open the next room') : storyMode ? t('Zakończ przygodę', 'Finish adventure') : t('Zakończ próbę', 'Finish puzzle'));
  }
  update();
  return { element: root, update, destroy() { disposed = true; miniController?.dispose();originalController?.dispose(); } };
}
