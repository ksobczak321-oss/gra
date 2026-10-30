// Browser controls and artwork for the two expedition games. The activity model
// owns every card, collision, goal and deadline; this module only sends input.

const WORDS = {
  pl: {
    tiltTitle: 'Kulki w labiryncie', memoryTitle: 'Znajdź trójki',
    tiltHelp: 'Przechyl planszę i doprowadź wszystkie kulki do otworów. Na komputerze poruszaj kursorem nad planszą lub użyj strzałek.',
    tiltPhoneHelp: 'Doprowadź kulki do otworów. Steruj palcem lub włącz ruch telefonu poniżej.',
    touchHelp: 'Przesuwaj palec po sterowniku albo włącz sterowanie ruchem telefonu.',
    memoryHelp: 'Odkrywaj obrazki. Trzy identyczne znikają z planszy; różne możesz później odkrywać ponownie.',
    memoryPhoneHelp: 'Odkrywaj trójki identycznych obrazków, aby wyczyścić planszę.',
    motion: 'Steruj ruchem telefonu', calibrate: 'Wyzeruj położenie telefonu',
    motionOn: 'Sterowanie ruchem włączone. Delikatnie przechyl telefon.',
    motionDenied: 'Sterowanie ruchem jest niedostępne. Użyj sterownika poniżej planszy.',
    motionWaiting: 'Czekam na czujnik telefonu. Sterownik dotykowy nadal działa.',
    touch: 'Sterownik przechylenia', centre: 'Wyśrodkuj',
    board: 'Labirynt z kulkami', progress: 'Postęp', balls: 'Kulki w celach', cards: 'Usunięte pola',
    lost: 'Czas minął — kulki rozsypują się!', lostMemory: 'Czas minął. Spróbuj w kolejnej ekspedycji.',
    won: 'Wszystko na swoim miejscu!', wonMemory: 'Plansza wyczyszczona!',
    card: 'Pole', hidden: 'zakryte', revealed: 'odkryte', matched: 'usunięte', symbol: 'Symbol',
    turn: 'Odkryte w tej próbie', mismatch: 'Te obrazki są różne — zapamiętaj ich położenie.',
    zoom: 'Rozmiar pól', zoomIn: 'Powiększ pola', zoomOut: 'Pomniejsz pola',
    sensorSecure: 'Sterowanie ruchem wymaga bezpiecznego połączenia; sterownik dotykowy jest dostępny.',
    shuffleIn: 'Zakryte obrazki przemieszczą się za', shuffled: 'Zakryte obrazki zmieniły miejsca!', ended: 'Próba zakończona.',
  },
  en: {
    tiltTitle: 'Marble maze', memoryTitle: 'Find the triples',
    tiltHelp: 'Tilt the board and roll every marble into a hole. On a computer, move your pointer over the board or use the arrow keys.',
    tiltPhoneHelp: 'Roll the marbles into the holes. Drag the control or enable phone motion below.',
    touchHelp: 'Drag the tilt control or enable phone motion controls.',
    memoryHelp: 'Reveal pictures. Three identical pictures disappear; unmatched pictures can be revealed again as often as you like.',
    memoryPhoneHelp: 'Reveal three matching pictures to clear them from the board.',
    motion: 'Use phone motion', calibrate: 'Centre phone position',
    motionOn: 'Motion controls are on. Gently tilt your phone.',
    motionDenied: 'Motion controls are unavailable. Use the control below the board.',
    motionWaiting: 'Waiting for the phone sensor. The touch control still works.',
    touch: 'Tilt control', centre: 'Centre',
    board: 'Marble maze board', progress: 'Progress', balls: 'Marbles in goals', cards: 'Cleared tiles',
    lost: 'Time is up — the marbles scatter!', lostMemory: 'Time is up. Try another expedition.',
    won: 'Every marble is home!', wonMemory: 'Board cleared!',
    card: 'Tile', hidden: 'hidden', revealed: 'revealed', matched: 'cleared', symbol: 'Symbol',
    turn: 'Revealed this turn', mismatch: 'These pictures differ — remember their positions.',
    zoom: 'Tile size', zoomIn: 'Larger tiles', zoomOut: 'Smaller tiles',
    sensorSecure: 'Motion controls require a secure connection; the touch control remains available.',
    shuffleIn: 'Hidden pictures move in', shuffled: 'The hidden pictures changed places!', ended: 'Attempt ended.',
  },
};

// Original, monochrome line drawings. A small weather badge distinguishes the
// second and third sets if a larger board calls for more than forty symbols.
const DRAWINGS = [
  ['cat','M14 20 10 8 23 16Q32 12 41 16L54 8 50 23Q58 45 44 52Q32 60 18 50Q7 40 14 20ZM22 29h1m18 0h1M28 39l4 3 4-3M16 36 4 33m12 9L4 45m44-9 12-3m-12 9 12 3'],
  ['fish','M9 32Q29 5 49 23l11-10v38L49 41Q29 59 9 32ZM21 25q-5 7 0 14M37 26h1M29 17l2-9 12 11m-13 28 3 9 12-12'],
  ['bird','M10 44q18 3 19-16Q30 8 46 14l5 8 9 4-11 4q-1 26-28 24L9 60l5-15ZM31 30Q4 16 5 37q5 13 24 7M41 21h1'],
  ['house','M5 29 32 7 59 29M12 25v32h40V25M26 57V37h13v20M16 32h7v8h-7m25-8h7v8h-7'],
  ['key','M28 22a12 12 0 1 1-24 0 12 12 0 0 1 24 0ZM27 27l28 28m-7-7 7-7m-15 0 7-7'],
  ['tree','M32 7 14 29h9L8 46h18v13h12V46h18L41 29h9ZM27 59h14'],
  ['sailboat','M6 43h52L49 57H16ZM31 6v37M29 10 10 36h19m7-20 17 20H36M4 61q7-6 14 0t14 0 14 0 14 0'],
  ['flower','M32 25c-19-27-33 4-11 12-16 24 15 34 19 11 26 10 32-19 10-22 4-22-23-28-18-1ZM32 27a9 9 0 1 0 0 18 9 9 0 0 0 0-18M32 47v14m0-7q-17 0-18-9 17 0 18 9'],
  ['sun','M32 16a16 16 0 1 0 0 32 16 16 0 0 0 0-32M32 2v7m0 46v7M2 32h7m46 0h7M10 10l5 5m34 34 5 5M10 54l5-5m34-34 5-5'],
  ['moon','M48 5Q6 5 7 34q1 29 34 25 16-3 19-17Q21 55 23 22 27 8 48 5Z'],
  ['heart','M32 55 8 32Q-1 10 17 9q10-1 15 10Q40 5 51 10q17 7 5 24Z'],
  ['crown','M7 17 20 30 32 7 44 30 57 17l-5 36H12ZM13 43h38'],
  ['cup','M12 12h34v25q0 17-17 17T12 37ZM46 16h7q12 0 5 17-3 6-12 6M6 59h48'],
  ['bell','M13 44q7-7 7-19Q20 10 32 10t12 15q0 12 7 19ZM25 51q7 13 14 0M29 10V4h6v6'],
  ['car','M8 36 17 17h30l9 19v17H8ZM14 36h37M22 20l-5 13m25-13 5 13M19 46a3 3 0 1 0 0 6m27-6a3 3 0 1 0 0 6M13 53v7m37-7v7'],
  ['plane','M28 7q4-8 8 0l2 18 22 13v7L38 37v14l8 7v4l-14-4-14 4v-4l8-7V37L4 45v-7l22-13Z'],
  ['book','M31 14Q13 4 5 12v42q13-8 26 3 13-11 28-3V12q-13-8-28 2ZM31 14v43M12 20q9-2 13 3m-13 6q9-2 13 3m13-9q7-5 14-3m-14 12q7-5 14-3'],
  ['clock','M32 6a26 26 0 1 0 0 52 26 26 0 0 0 0-52M32 13v5m0 28v5M13 32h5m28 0h5M32 20v14l12 7'],
  ['umbrella','M5 31q2-24 27-24t27 24Q46 22 32 31 18 22 5 31ZM32 5v46q0 16 12 9 3-2 3-7M32 9q-12 10-11 18m11-18q12 10 11 18'],
  ['balloon','M32 5q-25 0-23 22 1 18 23 25 22-7 23-25Q57 5 32 5ZM28 51l-4 7h16l-4-7M32 58q12 4 0 10M17 17q4-5 10-5'],
  ['apple','M30 19Q6 4 7 34q2 28 23 22Q52 64 57 37q4-31-21-19M32 20Q30 5 42 4M37 11q13-9 18 0-12 8-18 0'],
  ['mushroom','M5 37Q6 4 32 5q26 0 27 32ZM25 37l-6 24h26l-6-24M17 24h1m14-9h1m13 11h1'],
  ['wrench','M14 7q-15 14 1 26l24 24q14 10 20-2 5-9-6-17L30 18Q29 3 14 7ZM17 9l-4 11 10 7 9-7M46 46a4 4 0 1 0 0 8 4 4 0 0 0 0-8'],
  ['hammer','M6 16q14-14 27-8l13 13-8 8-9-5-9 9L9 22ZM32 28l23 26-8 8-23-28'],
  ['eye','M3 32q28-39 58 0Q31 71 3 32ZM32 18a14 14 0 1 0 0 28 14 14 0 0 0 0-28M32 27a5 5 0 1 0 0 10 5 5 0 0 0 0-10'],
  ['butterfly','M29 28Q4-6 5 21q0 23 22 17Q0 43 11 57q11 11 18-16M35 28Q60-6 59 21q0 23-22 17 27 5 16 19-11 11-18-16M32 23v34m0-34L23 9m9 14L41 9'],
  ['turtle','M12 25q20-21 40 0v23H12ZM12 31Q-5 18 3 40l9 3m40-12q17-13 9 9l-9 3M18 48l-3 12m31-12 3 12M27 15 20 30l12 14 12-14-7-15M12 31h8m24 0h8'],
  ['rabbit','M19 28Q2-6 18 5l10 22m8 0L46 5q15-11-1 23M32 24Q4 24 9 48q6 16 23 12 17 4 23-12 5-24-23-24ZM22 38h1m18 0h1M28 47l4 4 4-4m-4 4v6'],
  ['owl','M10 13 20 7l12 8 12-8 10 6v30Q32 73 10 43ZM22 20a10 10 0 1 0 0 20 10 10 0 0 0 0-20m20 0a10 10 0 1 0 0 20 10 10 0 0 0 0-20M22 29h1m18 0h1M27 42l5 7 5-7M10 32l10 20m34-20L44 52'],
  ['paw','M22 33q10-12 20 0l12 16Q60 67 42 59l-10-3-10 3Q4 67 10 49ZM10 12q-10 1-4 15 7 10 12 2 4-13-8-17m17-9q-10-1-8 12 4 12 11 5 5-13-3-17m13 0q10-1 8 12-4 12-11 5-5-13 3-17m14 9q10 1 4 15-7 10-12 2-4-13 8-17'],
  ['guitar','M44 7l13 6-5 10-5-1-16 19q12 21-6 21Q4 64 4 44q-1-14 12-10l16-20-1-5ZM23 39a6 6 0 1 0 0 12 6 6 0 0 0 0-12M18 49l24-31'],
  ['tent','M4 55 32 7 60 55ZM32 11v44M17 55l15-28 15 28M3 60h58'],
  ['castle','M7 58V11h11v10h10V11h9v10h10V11h10v47ZM26 58V40q6-10 12 0v18M14 31h4m28 0h4'],
  ['mountain','M3 57 25 12l13 25L49 8 61 57ZM16 31l9 6 8-6M42 25l7 4 6-5'],
  ['cloud','M17 49Q-3 49 5 32q3-9 14-8Q15 4 35 7q15 1 15 18 17-2 12 14-3 10-14 10Z'],
  ['candle','M23 26h20v32H23ZM32 4Q10 27 32 25 50 24 32 4ZM16 60h34M23 36q8 8 11 0t9 0'],
  ['camera','M5 20h13l5-10h19l5 10h13v35H5ZM32 25a12 12 0 1 0 0 24 12 12 0 0 0 0-24M48 26h5'],
  ['rocket','M22 39Q15 14 32 3q18 11 10 36ZM22 25 6 45l15-1m21-19 16 20-15-1M26 46l-3 15 9-7 9 7-3-15M32 17a5 5 0 1 0 0 10 5 5 0 0 0 0-10'],
  ['chest','M7 28Q7 7 32 7t25 21v30H7ZM7 28h50M23 8v20m18-20v20M26 28v13h12V28'],
  ['anchor','M32 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14M32 19v40M15 27h34M6 37q0 22 26 22t26-22M6 37l-3 12m3-12 12 3m40-3 3 12m-3-12-12 3'],
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const svgNS = 'http://www.w3.org/2000/svg';
function element(tag, attributes = {}, text) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}
function icon(symbolId) {
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'memory-symbol');
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', DRAWINGS[symbolId % DRAWINGS.length][1]);
  path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '3.5'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
  const variant = Math.floor(symbolId / DRAWINGS.length);
  if (variant) {
    const background = document.createElementNS(svgNS, 'path');
    background.setAttribute('d', variant % 2 ? 'M3 3h15v15H3Z' : 'M11 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18');
    background.setAttribute('fill', 'white'); background.setAttribute('stroke', 'currentColor'); background.setAttribute('stroke-width', '2');
    svg.append(background);
    const mark = document.createElementNS(svgNS, 'path');
    mark.setAttribute('d', variant % 2 ? 'M6 11h9M11 6v9' : 'M6 10l3 4 6-7');
    mark.setAttribute('fill', 'none'); mark.setAttribute('stroke', 'currentColor'); mark.setAttribute('stroke-width', '2');
    svg.append(mark);
    path.setAttribute('transform', 'translate(7 7) scale(.86)');
  }
  svg.append(path);
  return svg;
}

export function mountMiniGame({ host, controlsHost, run: initialRun, onAction, language = 'pl', status: initialStatus = {}, animations = true }) {
  if (!host || !initialRun?.miniGame) throw new TypeError('A host and an expedition mini-game are required.');
  let run = initialRun, status = initialStatus, disposed = false, frame = 0;
  const words = WORDS[language] || WORDS.en;
  const reduced = !animations || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = element('section', { class: 'expedition-minigame', 'data-minigame-kind': run.miniGame.kind, 'data-i18n-ignore': '' });
  const title = element('h3', { class: 'minigame-title' }, run.miniGame.kind === 'tilt' ? words.tiltTitle : words.memoryTitle);
  const description = element('p', { class: 'minigame-help' }, run.miniGame.kind === 'tilt' ? matchMedia('(pointer: coarse)').matches ? words.tiltPhoneHelp : words.tiltHelp : matchMedia('(pointer: coarse)').matches ? words.memoryPhoneHelp : words.memoryHelp);
  const progress = element('p', { class: 'minigame-progress', 'aria-live': 'polite', 'data-minigame-progress': '' });
  const message = element('p', { class: 'minigame-message', role: 'status', 'data-minigame-message': '' });
  root.append(title, description);
  host.replaceChildren(root);
  let externalControls = null;
  if (controlsHost && run.miniGame.kind === 'tilt') {
    externalControls = element('div', { class: 'minigame-external-controls', 'data-i18n-ignore': '' });
    controlsHost.replaceChildren(externalControls); root.classList.add('has-external-controls');
  }
  const cleanup = [];
  let updateBoard = () => {}, drawBoard = () => {}, fitLayout = () => {}, lossAt = null, previousState = '';
  const active = () => run.status === 'active' && !status.presenceRequired && !document.hidden;
  const send = action => {
    if (!active()) return;
    return onAction?.({ ...action, runId: run.id, stage: run.level });
  };

  if (run.miniGame.kind === 'tilt') {
    const frameElement = element('div', { class: 'marble-frame' });
    const canvas = element('canvas', { class: 'marble-board', tabindex: '0', role: 'img', 'aria-label': words.board, 'data-tilt-board': '' });
    const accessible = element('div', { class: 'minigame-sr-only', 'data-tilt-accessible': '' });
    frameElement.append(canvas, accessible); root.append(frameElement);
    (externalControls || root).append(progress);
    const controls = element('div', { class: 'marble-controls' });
    const motionButton = element('button', { type: 'button', class: 'action secondary', 'data-motion-enable': '' }, words.motion);
    const calibrateButton = element('button', { type: 'button', class: 'action secondary', 'data-motion-calibrate': '' }, words.calibrate);
    calibrateButton.hidden = true;
    const sensorStatus = element('p', { class: 'minigame-sensor-status', role: 'status', 'data-motion-status': '' });
    const touchHelp = element('p', { class: 'minigame-touch-help' }, words.touchHelp);
    const joystick = element('div', { class: 'marble-joystick', tabindex: '0', role: 'group', 'aria-label': words.touch, 'data-tilt-touch': '' });
    const knob = element('span', { class: 'marble-knob', 'aria-hidden': 'true' }); joystick.append(knob);
    const centre = element('button', { type: 'button', class: 'marble-centre', 'data-tilt-centre': '' }, words.centre);
    controls.append(touchHelp, joystick, centre, motionButton, calibrateButton, sensorStatus); (externalControls || root).append(controls, message);
    const context = canvas.getContext('2d');
    let tiltX = 0, tiltY = 0, dirtyInput = false, lastSent = -Infinity;
    let pointerDown = false, usingSensor = false, sensorListening = false, baseline = null, sensorLast = null;
    const keys = new Set();
    function input(x, y, meaningful = true) {
      const nextX = clamp(x, -1, 1), nextY = clamp(y, -1, 1);
      if (Math.abs(nextX - tiltX) + Math.abs(nextY - tiltY) > .02) dirtyInput ||= meaningful;
      tiltX = nextX; tiltY = nextY;
      knob.style.transform = `translate(${tiltX * 33}px,${tiltY * 33}px)`;
    }
    function pointerInput(event, surface) {
      const bounds = surface.getBoundingClientRect();
      input((event.clientX - bounds.left - bounds.width / 2) / (bounds.width * .42), (event.clientY - bounds.top - bounds.height / 2) / (bounds.height * .42));
    }
    const onMove = event => {
      if (event.pointerType === 'touch' && !pointerDown) return;
      usingSensor = false; pointerInput(event, canvas);
    };
    const onDown = event => { pointerDown = true; canvas.setPointerCapture?.(event.pointerId); canvas.focus({ preventScroll: true }); onMove(event); };
    const onUp = () => { pointerDown = false; if (!usingSensor) input(0, 0); };
    const onJoystickDown = event => { usingSensor = false; joystick.setPointerCapture?.(event.pointerId); joystick.focus({ preventScroll: true }); pointerInput(event, joystick); };
    const onJoystickMove = event => { if (joystick.hasPointerCapture?.(event.pointerId)) pointerInput(event, joystick); };
    canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp); canvas.addEventListener('pointerleave', onUp);
    joystick.addEventListener('pointerdown', onJoystickDown); joystick.addEventListener('pointermove', onJoystickMove);
    joystick.addEventListener('pointerup', onUp); joystick.addEventListener('pointercancel', onUp);
    centre.addEventListener('click', () => { usingSensor = false; input(0, 0); });
    const onKeyDown = event => {
      const focusSurface = root.closest('dialog') || root;
      if (!active() || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key) || !focusSurface.contains(document.activeElement)) return;
      event.preventDefault(); event.stopImmediatePropagation(); keys.add(event.key); usingSensor = false;
      input(Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')), Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp')));
    };
    const onKeyUp = event => {
      if (!keys.has(event.key)) return;
      keys.delete(event.key); input(Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')), Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp')));
    };
    document.addEventListener('keydown', onKeyDown, true); document.addEventListener('keyup', onKeyUp, true);
    const onOrientation = event => {
      if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
      sensorLast = { beta: event.beta, gamma: event.gamma };
      if (!baseline) baseline = { ...sensorLast };
      if (!usingSensor) return;
      const angle = (screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI / 180;
      const horizontal = clamp((event.gamma - baseline.gamma) / 18, -1, 1), vertical = clamp((event.beta - baseline.beta) / 18, -1, 1);
      input(horizontal * Math.cos(angle) + vertical * Math.sin(angle), vertical * Math.cos(angle) - horizontal * Math.sin(angle));
      sensorStatus.textContent = words.motionOn;
    };
    motionButton.addEventListener('click', async () => {
      if (!active()) return;
      try {
        if (!window.isSecureContext) { sensorStatus.textContent = words.sensorSecure; return; }
        const orientation = window.DeviceOrientationEvent;
        if (!orientation) { sensorStatus.textContent = words.motionDenied; return; }
        if (typeof orientation.requestPermission === 'function' && await orientation.requestPermission() !== 'granted') { sensorStatus.textContent = words.motionDenied; return; }
        if (disposed) return;
        if (!sensorListening) { window.addEventListener('deviceorientation', onOrientation); sensorListening = true; }
        usingSensor = true; baseline = null; calibrateButton.hidden = false;
        sensorStatus.textContent = words.motionWaiting;
      } catch { sensorStatus.textContent = words.motionDenied; }
    });
    calibrateButton.addEventListener('click', () => { baseline = sensorLast ? { ...sensorLast } : null; input(0, 0); });
    const blur = () => {
      keys.clear(); input(0, 0, false); dirtyInput = false;
      // A hidden tab cannot rely on its next animation frame to release the
      // board. Send the neutral input directly without renewing presence.
      if (!disposed && run.status === 'active') onAction?.({ type: 'expeditionMiniGameInput', runId: run.id, stage: run.level, tiltX: 0, tiltY: 0, meaningful: false });
    };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    cleanup.push(() => { document.removeEventListener('keydown', onKeyDown, true); document.removeEventListener('keyup', onKeyUp, true); window.removeEventListener('deviceorientation', onOrientation); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); });
    let fitPending = true;
    const fitMarbleFrame = () => {
      if (!root.isConnected || !root.clientWidth) return;
      if (matchMedia('(min-width:1100px) and (min-height:650px)').matches) {
        frameElement.style.removeProperty('width'); fitPending = false; return;
      }
      const dialog = root.closest('dialog'), panel = root.closest('.minigame-panel');
      const body = dialog?.querySelector('.dialog-body');
      if (dialog && panel && body) {
        const bodyStyle = getComputedStyle(body), maxHeight = parseFloat(getComputedStyle(dialog).maxHeight) || innerHeight - 20;
        const bodySpace = maxHeight - (dialog.querySelector('.dialog-header')?.offsetHeight || 0) -
          parseFloat(bodyStyle.paddingTop) - parseFloat(bodyStyle.paddingBottom) - 2;
        const nonBoardHeight = panel.offsetHeight - frameElement.offsetHeight;
        const otherBodyHeight = Math.max(0, body.scrollHeight - parseFloat(bodyStyle.paddingTop) - parseFloat(bodyStyle.paddingBottom) - panel.offsetHeight);
        const size = Math.floor(Math.min(root.clientWidth, bodySpace - nonBoardHeight - otherBodyHeight - 14));
        frameElement.style.width = `${Math.max(70, size)}px`;
      }
      fitPending = false;
    };
    fitLayout = fitMarbleFrame;
    const fitObserver = new ResizeObserver(() => { fitPending = true; });
    fitObserver.observe(host);
    const panel = root.closest('.minigame-panel'); if (panel) fitObserver.observe(panel);
    const onFitResize = () => { fitPending = true; };
    window.addEventListener('resize', onFitResize, { passive: true });
    cleanup.push(() => { fitObserver.disconnect(); window.removeEventListener('resize', onFitResize); });
    let boardSize = 0, ratio = 0;
    const resize = () => {
      boardSize = run.miniGame.boardSize || 600;
      ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(boardSize * ratio); canvas.height = Math.round(boardSize * ratio);
    };
    resize();
    updateBoard = () => {
      const game = run.miniGame;
      const settled = game.balls.filter(ball => ball.settled).length;
      const label = `${words.balls}: ${settled} / ${game.balls.length}`;
      if (progress.textContent !== label) progress.textContent = label;
      const signature = game.balls.map(ball => `${ball.id}:${Math.round(ball.x)}:${Math.round(ball.y)}:${ball.settled}`).join('|');
      if (signature !== previousState) {
        previousState = signature;
        accessible.replaceChildren(...game.balls.map(ball => element('span', { 'data-tilt-ball': ball.id, 'data-x': ball.x.toFixed(3), 'data-y': ball.y.toFixed(3), 'data-settled': String(!!ball.settled) }, `${words.balls} ${ball.id}`)), ...game.goals.map(goal => element('span', { 'data-tilt-goal': goal.id, 'data-filled': String(goal.filledBy !== null && goal.filledBy !== undefined) })));
      }
      if (run.status === 'lost' && run.lossReason === 'deadline') {
        lossAt ??= performance.now(); frameElement.classList.toggle('is-scattering', !reduced);
        message.textContent = words.lost;
      } else if (run.status === 'decision' || game.solved) message.textContent = words.won;
      else if (run.status === 'lost') message.textContent = words.ended;
      motionButton.disabled = !active(); calibrateButton.disabled = !active(); centre.disabled = !active();
    };
    drawBoard = now => {
      if (fitPending) fitMarbleFrame();
      if (!context) return;
      const game = run.miniGame, size = game.boardSize || 600;
      if (size !== boardSize) resize();
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, size, size);
      const surface = context.createLinearGradient(0, 0, size, size);
      surface.addColorStop(0, '#e5e5db'); surface.addColorStop(.48, '#b6bab2'); surface.addColorStop(1, '#eeede3');
      context.fillStyle = surface; context.fillRect(0, 0, size, size);
      context.fillStyle = '#252f32'; context.strokeStyle = '#f7f5df'; context.lineWidth = 1;
      for (const wall of game.walls) {
        context.shadowColor = '#14202270'; context.shadowOffsetY = 3; context.shadowBlur = 3;
        context.fillRect(wall.x, wall.y, wall.width, wall.height);
        context.shadowBlur = 0; context.shadowOffsetY = 0;
        context.fillStyle = '#d8d7c3'; context.fillRect(wall.x, wall.y, Math.max(0, wall.width - 1), Math.min(3, wall.height));
        context.fillStyle = '#39474b';
      }
      for (let index = 0; index < game.goals.length; index++) {
        const goal = game.goals[index];
        context.beginPath(); context.arc(goal.x, goal.y, (game.radius || 9) + 5, 0, Math.PI * 2);
        context.fillStyle = '#101a1c'; context.fill(); context.strokeStyle = '#d6ae58'; context.lineWidth = 3; context.stroke();
        if (goal.filledBy == null) {
          context.fillStyle = '#f6dc98'; context.font = '700 10px system-ui'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(index + 1, goal.x, goal.y);
        }
      }
      const scatter = lossAt && !reduced ? Math.min(1, (now - lossAt) / 1300) : 0;
      for (let index = 0; index < game.balls.length; index++) {
        const ball = game.balls[index], radius = game.radius || 9;
        const angle = (index * 2.39996 + .3);
        const distance = scatter * (180 + index * 31);
        const x = ball.x + Math.cos(angle) * distance, y = ball.y + Math.sin(angle) * distance;
        context.globalAlpha = Math.max(0, 1 - scatter * .8);
        context.shadowColor = '#0c1a2070'; context.shadowBlur = 5; context.shadowOffsetY = 3;
        context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2);
        const metal = context.createRadialGradient(x - radius * .4, y - radius * .45, radius * .05, x, y, radius);
        metal.addColorStop(0, '#ffffff'); metal.addColorStop(.26, '#e9eee4'); metal.addColorStop(.6, '#9ca99f'); metal.addColorStop(.87, '#5a6863'); metal.addColorStop(1, '#ced7ce');
        context.fillStyle = metal; context.fill(); context.shadowBlur = 0; context.shadowOffsetY = 0;
        context.strokeStyle = ball.settled ? '#e5c36c' : '#63746b'; context.lineWidth = ball.settled ? 3 : 1; context.stroke();
        context.globalAlpha = 1;
      }
      if (active() && now - lastSent >= 50) {
        lastSent = now;
        send({ type: 'expeditionMiniGameInput', tiltX, tiltY, meaningful: dirtyInput }); dirtyInput = false;
      }
    };
  } else {
    const game = run.miniGame;
    const wrapper = element('div', { class: 'memory-viewport', 'data-memory-viewport': '' });
    const board = element('div', { class: 'memory-board', role: 'group', 'aria-label': words.memoryTitle, 'data-memory-board': '' });
    board.style.setProperty('--memory-columns', game.columns);
    board.style.setProperty('--memory-rows', Math.ceil(game.cards.length / game.columns));
    board.style.setProperty('--memory-columns-mobile', Math.min(8, game.columns));
    board.style.setProperty('--memory-tile', '46px');
    wrapper.append(board); root.append(wrapper, progress);
    const turnStatus = element('p', { class: 'memory-turn-status', 'data-memory-turn': '' });
    const shuffleStatus = element('p', { class: 'memory-shuffle-status', 'data-memory-shuffle': '', 'aria-live': 'polite' });
    root.append(turnStatus, shuffleStatus, message);
    let fitPending = true, fittedConstraints = '';
    const layoutConstraints = () => {
      const dialog = root.closest('dialog');
      return [innerWidth, innerHeight, host.clientWidth, root.clientWidth,
        dialog ? getComputedStyle(dialog).maxHeight : '',
        dialog?.querySelector('.dialog-header')?.offsetHeight || 0].join(':');
    };
    // Use the real remaining dialog space instead of creating a second scroll
    // area. The grid can change its columns without changing card identities.
    const fitBoard = () => {
      if (!root.isConnected || !wrapper.clientWidth) return;
      const constraints = layoutConstraints();
      const padding = getComputedStyle(wrapper);
      const horizontalPadding = parseFloat(padding.paddingLeft) + parseFloat(padding.paddingRight);
      const verticalPadding = parseFloat(padding.paddingTop) + parseFloat(padding.paddingBottom);
      // CSS gives this frame the space left after the real header, controls
      // and messages. Read that space directly, without cached dvh arithmetic.
      const availableWidth = Math.max(40, wrapper.clientWidth - horizontalPadding);
      const availableHeight = Math.max(40, wrapper.clientHeight - verticalPadding);
      const gap = innerWidth <= 520 ? 3 : 4;
      let best = { columns: 1, tile: 0, rows: game.cards.length };
      for (let columns = 1; columns <= game.cards.length; columns++) {
        const rows = Math.ceil(game.cards.length / columns);
        const tile = Math.floor(Math.min((availableWidth - (columns - 1) * gap) / columns,
          (availableHeight - (rows - 1) * gap) / rows));
        if (tile > best.tile) best = { columns, rows, tile };
      }
      const tile = Math.max(8, best.tile);
      board.style.setProperty('--memory-columns', best.columns);
      board.style.setProperty('--memory-rows', best.rows);
      board.style.setProperty('--memory-columns-mobile', best.columns);
      board.style.setProperty('--memory-tile', `${tile}px`);
      board.style.setProperty('--memory-gap', `${gap}px`);
      wrapper.dataset.memoryFit = `${best.columns}x${best.rows}`;
      fittedConstraints = constraints;
      fitPending = false;
    };
    fitLayout = fitBoard;
    const resizeObserver = new ResizeObserver(() => {
      fitPending = true;
      // Native layout notifications can arrive before the window resize event
      // or the next animation frame. Dynamic viewport CSS can also settle
      // after innerHeight changed. Refit on those external constraints, while
      // deferring size changes caused only by fitting itself to avoid a loop.
      if (fittedConstraints !== layoutConstraints()) fitBoard();
    });
    resizeObserver.observe(host);
    const panel = root.closest('.minigame-panel');
    if (panel) resizeObserver.observe(panel);
    const body = root.closest('dialog')?.querySelector('.dialog-body');
    if (body) resizeObserver.observe(body);
    // Recompute height and the preferred card size immediately as well.
    const onResize = () => { fitPending = true; fitBoard(); };
    window.addEventListener('resize', onResize, { passive: true });
    cleanup.push(() => { resizeObserver.disconnect(); window.removeEventListener('resize', onResize); });
    const cards = game.cards.map((symbol, index) => {
      const button = element('button', { type: 'button', class: 'memory-card', 'data-memory-card': index, 'data-memory-state': 'hidden', 'aria-label': `${words.card} ${index + 1}: ${words.hidden}` });
      const back = element('span', { class: 'memory-card-back', 'aria-hidden': 'true' }, '✦');
      const face = icon(symbol); face.toggleAttribute('hidden', true);
      button.append(back, face);
      button.addEventListener('click', () => send({ type: 'expeditionMiniGameReveal', index, meaningful: true }));
      board.append(button);
      return { button, back, face, symbol, state: 'hidden' };
    });
    let lastCheck = 0, lastShuffle = game.shuffleCount || 0, shuffleUntil = 0;
    updateBoard = () => {
      const current = run.miniGame;
      const shown = new Set(current.revealed), matched = current.matched;
      const cleared = matched.reduce((count, value) => count + Number(!!value), 0);
      const label = `${words.cards}: ${cleared} / ${cards.length}`;
      if (progress.textContent !== label) progress.textContent = label;
      for (let index = 0; index < cards.length; index++) {
        const card = cards[index], next = matched[index] ? 'matched' : shown.has(index) ? 'revealed' : 'hidden';
        if (card.symbol !== current.cards[index]) {
          card.symbol = current.cards[index];
          const nextFace = icon(card.symbol); nextFace.toggleAttribute('hidden', next === 'hidden');
          card.face.replaceWith(nextFace); card.face = nextFace;
        }
        if (card.state !== next) {
          card.state = next; card.button.dataset.memoryState = next;
          card.button.classList.toggle('is-revealed', next === 'revealed'); card.button.classList.toggle('is-matched', next === 'matched');
          card.back.hidden = next !== 'hidden'; card.face.toggleAttribute('hidden', next === 'hidden');
          if (next === 'revealed') card.button.dataset.symbol = current.cards[index]; else delete card.button.dataset.symbol;
          card.button.setAttribute('aria-label', `${words.card} ${index + 1}: ${words[next]}${next === 'revealed' ? `, ${words.symbol} ${current.cards[index] + 1}` : ''}`);
        }
        const disabled = !active() || next !== 'hidden' || current.revealed.length >= 3;
        if (card.button.disabled !== disabled) card.button.disabled = disabled;
      }
      turnStatus.textContent = current.revealed.length >= 3 ? words.mismatch : `${words.turn}: ${current.revealed.length} / 3`;
      if ((current.shuffleCount || 0) !== lastShuffle) {
        lastShuffle = current.shuffleCount || 0; shuffleUntil = performance.now() + 1600;
        if (!reduced) { board.classList.remove('is-shuffling'); void board.offsetWidth; board.classList.add('is-shuffling'); }
      }
      if (current.shuffleInterval && active()) {
        const worldNow = (run.roundStartedAt || 0) + (status.elapsed || 0);
        const remaining = Math.max(0, Math.ceil((current.nextShuffleAt || worldNow) - worldNow));
        shuffleStatus.textContent = performance.now() < shuffleUntil ? words.shuffled : `${words.shuffleIn} ${remaining} s`;
      } else shuffleStatus.textContent = '';
      if (run.status === 'lost') { message.textContent = words.lostMemory; root.classList.add('has-ended'); }
      else if (run.status === 'decision' || current.solved) { message.textContent = words.wonMemory; turnStatus.textContent = ''; }
      previousState = `${cleared}:${current.revealed.join(',')}:${run.status}`;
    };
    drawBoard = now => { if (fitPending) fitBoard(); if (now - lastCheck > 80) { updateBoard(); lastCheck = now; } };
  }
  function update(nextRun, nextStatus = status) {
    if (disposed || !nextRun?.miniGame) return;
    run = nextRun; status = nextStatus || {};
    updateBoard();
  }
  function render(now) {
    if (disposed || !root.isConnected) return;
    drawBoard(now);
    if (run.miniGame.kind === 'tilt') updateBoard();
    frame = requestAnimationFrame(render);
  }
  updateBoard(); fitLayout();
  // renderPanel mounts before a newly opened dialog enters the top layer.
  // Fit again in this same task after showModal, before its first paint.
  queueMicrotask(() => { if (!disposed) fitLayout(); });
  frame = requestAnimationFrame(render);
  return { update, dispose() { disposed = true; cancelAnimationFrame(frame); cleanup.forEach(fn => fn()); externalControls?.remove(); } };
}
