// Map labels live outside the transformed/clipped island layer. Geometry is
// measured only while a label is requested, never by the game heartbeat.
const WORLD_TARGET = '.world-hotspot[data-label]';
const BLOCKERS = '.island-topbar,.island-activity-stack,.mobile-island-hud,.mobile-bottom-dock,.dock-tabs,.building-dock-cards,.resource-dock-cards,.island-choice-bar';
const finite = value => typeof value === 'number' && Number.isFinite(value);
const rectangle = value => {
  const left = value?.left ?? value?.x, top = value?.top ?? value?.y;
  const width = value?.width ?? value?.right - left, height = value?.height ?? value?.bottom - top;
  return [left, top, width, height].every(finite) && width > 0 && height > 0
    ? { left, top, right: left + width, bottom: top + height, width, height } : null;
};
const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const clamp = (value, lower, upper) => Math.max(lower, Math.min(upper, value));

export function mapLabelPosition({ anchor, size, bounds, blockers = [], gap = 8 } = {}) {
  anchor = rectangle(anchor); bounds = rectangle(bounds);
  if (!anchor || !bounds || !finite(size?.width) || !finite(size?.height) || size.width <= 0 || size.height <= 0 || size.width > bounds.width || size.height > bounds.height) return null;
  gap = finite(gap) && gap >= 0 ? gap : 8;
  const obstacles = blockers.map(rectangle).filter(Boolean);
  const width = size.width, height = size.height;
  const centeredX = anchor.left + (anchor.width - width) / 2;
  const centeredY = anchor.top + (anchor.height - height) / 2;
  const preferred = [
    [centeredX, anchor.top - height - gap, 'above'],
    [centeredX, anchor.bottom + gap, 'below'],
    [anchor.left - width - gap, centeredY, 'left'],
    [anchor.right + gap, centeredY, 'right'],
  ];
  const xs = new Set([centeredX, anchor.left - width - gap, anchor.right + gap, bounds.left, bounds.right - width]);
  const ys = new Set([anchor.top - height - gap, anchor.bottom + gap, centeredY, bounds.top, bounds.bottom - height]);
  for (const box of obstacles) {
    xs.add(box.left - width - gap); xs.add(box.right + gap);
    ys.add(box.top - height - gap); ys.add(box.bottom + gap);
  }
  const candidates = [...preferred];
  for (const x of xs) for (const y of ys) candidates.push([x, y, 'adjusted']);
  let best = null;
  for (const [x, y, placement] of candidates) {
    const left = clamp(x, bounds.left, bounds.right - width), top = clamp(y, bounds.top, bounds.bottom - height);
    const box = { left, top, right: left + width, bottom: top + height, width, height };
    if (obstacles.some(obstacle => overlap(box, obstacle) > 0)) continue;
    // Keep a successful original side before considering another equally near
    // candidate. A blocker's edge is used when none of the four sides is free.
    const dx = Math.max(anchor.left - box.right, box.left - anchor.right, 0);
    const dy = Math.max(anchor.top - box.bottom, box.top - anchor.bottom, 0);
    const displacement = Math.abs(left - centeredX) + Math.abs(top - preferred[0][1]);
    const score = dx + dy + displacement * 0.01 + overlap(box, anchor) / (width * height) * 1000;
    if (!best || score < best.score) best = { ...box, placement, score };
  }
  if (!best) return null;
  const { score, ...position } = best;
  return position;
}

export function createMapBuildingLabels({ document: doc = document, window: view = doc.defaultView, stage = doc.getElementById('stage'), viewport = doc.getElementById('viewport') } = {}) {
  const tooltip = doc.createElement('div');
  tooltip.id = 'map-building-tooltip';
  tooltip.className = 'map-building-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  doc.body.append(tooltip);
  doc.body.dataset.mapBuildingLabels = 'true';
  let hovered = null, focused = null, active = null, frame = 0, disposed = false;
  let labelObserver = null, stageObserver = null, sizeObserver = null;
  const visible = node => node?.isConnected && node.getClientRects().length && view.getComputedStyle(node).visibility !== 'hidden';
  const modalOpen = () => !!doc.querySelector('#island-dialog[open],.island-flow-dialog[open],.v32-modal-backdrop');
  const targetFor = node => node?.closest?.(WORLD_TARGET) || null;
  const clearDescription = target => {
    if (!target) return;
    const ids = (target.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== tooltip.id);
    if (ids.length) target.setAttribute('aria-describedby', ids.join(' ')); else target.removeAttribute('aria-describedby');
  };
  const disconnect = () => {
    labelObserver?.disconnect(); stageObserver?.disconnect(); sizeObserver?.disconnect();
    labelObserver = stageObserver = sizeObserver = null;
  };
  function hide() {
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0; disconnect(); clearDescription(active); active = null;
    tooltip.hidden = true; tooltip.removeAttribute('data-map-label-for');
  }
  function clear() { hovered = focused = null; hide(); }
  function place() {
    frame = 0;
    if (disposed || !active || !visible(active) || !active.dataset.label || modalOpen()) { clear(); return; }
    const map = viewport?.getBoundingClientRect(), scene = stage?.getBoundingClientRect();
    const viewportLeft = view.visualViewport?.offsetLeft || 0, viewportTop = view.visualViewport?.offsetTop || 0;
    const viewportRight = viewportLeft + (view.visualViewport?.width || view.innerWidth);
    const viewportBottom = viewportTop + (view.visualViewport?.height || view.innerHeight);
    const bounds = {
      left: Math.max(viewportLeft, map?.left ?? viewportLeft, scene?.left ?? viewportLeft) + 8,
      top: Math.max(viewportTop, map?.top ?? viewportTop, scene?.top ?? viewportTop) + 8,
      right: Math.min(viewportRight, map?.right ?? viewportRight, scene?.right ?? viewportRight) - 8,
      bottom: Math.min(viewportBottom, map?.bottom ?? viewportBottom, scene?.bottom ?? viewportBottom) - 8,
    };
    if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) { clear(); return; }
    const scale = Math.max(0.75, Math.min(1.5, scene && stage?.offsetWidth ? scene.width / stage.offsetWidth : 1));
    tooltip.style.setProperty('--map-label-scale', String(scale));
    tooltip.style.maxWidth = `${Math.min(264 * scale, bounds.right - bounds.left)}px`;
    tooltip.textContent = active.dataset.label;
    tooltip.dataset.mapLabelFor = active.id || active.dataset.v32Building || '';
    tooltip.hidden = false; tooltip.style.visibility = 'hidden';
    const obstacles = [...doc.querySelectorAll(BLOCKERS)].filter(visible).map(node => node.getBoundingClientRect());
    const anchor = active.getBoundingClientRect();
    // A panned-off building must not leave its tooltip floating on another part
    // of the map. Clipped anchor edges still allow a nearby label.
    if (!overlap(anchor, rectangle(bounds) || { left: 0, top: 0, right: 0, bottom: 0 })) { clear(); return; }
    const position = mapLabelPosition({ anchor, size: tooltip.getBoundingClientRect(), bounds, blockers: obstacles, gap: 8 * scale });
    if (!position) { tooltip.hidden = true; return; }
    tooltip.style.left = `${position.left}px`; tooltip.style.top = `${position.top}px`;
    tooltip.style.visibility = 'visible'; tooltip.dataset.placement = position.placement;
  }
  function schedule() { if (!disposed && active && !frame) frame = view.requestAnimationFrame(place); }
  function select() {
    const next = hovered || focused;
    if (!next || modalOpen()) { hide(); return; }
    if (next === active) { schedule(); return; }
    hide(); active = next;
    const ids = new Set((active.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    ids.add(tooltip.id); active.setAttribute('aria-describedby', [...ids].join(' '));
    labelObserver = new view.MutationObserver(() => { if (tooltip.textContent !== active?.dataset.label) schedule(); });
    labelObserver.observe(active, { attributes: true, attributeFilter: ['data-label'] });
    if (stage) {
      stageObserver = new view.MutationObserver(schedule);
      stageObserver.observe(stage, { attributes: true, attributeFilter: ['style'] });
    }
    if (view.ResizeObserver) {
      sizeObserver = new view.ResizeObserver(schedule);
      for (const node of [active, viewport, ...doc.querySelectorAll(BLOCKERS)].filter(Boolean)) sizeObserver.observe(node);
    }
    place();
  }
  const pointerOver = event => { if (event.pointerType === 'touch') return; const target = targetFor(event.target); if (target && target !== hovered) { hovered = target; select(); } };
  const pointerOut = event => { if (hovered && hovered.contains(event.target) && !hovered.contains(event.relatedTarget)) { hovered = null; select(); } };
  const focusIn = event => {
    const target = targetFor(event.target);
    focused = target?.matches(':focus-visible') ? target : null;
    if (modalOpen()) clear(); else select();
  };
  const focusOut = event => { if (focused && focused.contains(event.target) && !focused.contains(event.relatedTarget)) { focused = null; select(); } };
  const keydown = event => { if (event.key === 'Escape') clear(); };
  const toggle = event => { if (event.newState === 'open' && event.target.matches?.('dialog')) clear(); };
  const listeners = [['pointerover', pointerOver], ['pointerout', pointerOut], ['focusin', focusIn], ['focusout', focusOut], ['pointerdown', clear], ['click', clear], ['keydown', keydown], ['toggle', toggle]];
  for (const [type, listener] of listeners) doc.addEventListener(type, listener, true);
  view.addEventListener('resize', schedule, { passive: true });
  view.addEventListener('scroll', schedule, { capture: true, passive: true });
  view.visualViewport?.addEventListener('resize', schedule, { passive: true });
  view.visualViewport?.addEventListener('scroll', schedule, { passive: true });
  return {
    refresh: schedule,
    dispose() {
      disposed = true; clear();
      for (const [type, listener] of listeners) doc.removeEventListener(type, listener, true);
      view.removeEventListener('resize', schedule); view.removeEventListener('scroll', schedule, true);
      view.visualViewport?.removeEventListener('resize', schedule); view.visualViewport?.removeEventListener('scroll', schedule);
      tooltip.remove(); delete doc.body.dataset.mapBuildingLabels;
    },
  };
}
