// Theatre presentation: the map has one village building; the private garden
// uses illustrated game art and an owned collection. Rendering never mutates it.
import { THEATRE_STYLES, theatrePosition } from './harborlight-v1-theatre.js?v=frontend-v31-2';

const asset = name => new URL(`./assets/${name}?v=frontend-v31-2`, import.meta.url).href;
export const THEATRE_ART_ASSETS = Object.freeze({
  building: asset('theatre-building-v30.png'),
  courtyard: asset('theatre-courtyard-v30.png'),
  decorations: asset('theatre-decor-atlas-v30.png')
});
// The image is a regular atlas: ten types across, five increasingly elaborate
// designs down. Its native pixel dimensions are recorded once assets arrive.
export const THEATRE_ATLAS_LAYOUT = Object.freeze({ columns: 10, rows: 5, width: 1774, height: 887 });
export const THEATRE_ATLAS_TYPES = Object.freeze(['fountain', 'column', 'statue', 'flowerbed', 'tree', 'hedge', 'bench', 'lantern', 'gateway', 'mosaic']);
export const THEATRE_ART_TIERS = Object.freeze([1, 5, 10, 15, 20]);
const gardenRows = [
  { y: 310, x: [270, 423, 577, 730], scale: .65, hitWidth: 112, hitHeight: 60 },
  { y: 375, x: [230, 410, 590, 770], scale: .73, hitWidth: 125, hitHeight: 64 },
  { y: 440, x: [220, 407, 593, 780], scale: .81, hitWidth: 138, hitHeight: 64 },
  { y: 505, x: [230, 410, 590, 770], scale: .90, hitWidth: 144, hitHeight: 68 },
  { y: 575, x: [280, 430, 580, 730], scale: 1, hitWidth: 144, hitHeight: 72 }
];
export const THEATRE_SLOT_POSITIONS = Object.freeze(gardenRows.flatMap((row, index) => row.x.map((x, column) => Object.freeze({
  slot: index * 4 + column, x, y: row.y, scale: row.scale, hitWidth: row.hitWidth, hitHeight: row.hitHeight
}))));

const decorationLevel = value => { const level = Math.floor(Number(value)); return Number.isFinite(level) ? Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, level)) : 1; };
const safeId = value => String(value || 'theatre').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'theatre';
const validStyle = style => THEATRE_STYLES.some(item => item.id === style) ? style : 'coastal';
const localized = (language, pl, en) => language === 'en' ? en : pl;
const boxes = Object.freeze({
  fountain: [133, 140], column: [128, 153], statue: [120, 153], flowerbed: [132, 122], tree: [150, 174],
  hedge: [148, 122], bench: [143, 121], lantern: [116, 164], gateway: [151, 162], mosaic: [147, 108]
});

export function theatreSpriteFrame(type, requestedLevel = 1) {
  const column = Math.max(0, THEATRE_ATLAS_TYPES.indexOf(type)), level = decorationLevel(requestedLevel);
  const row = THEATRE_ART_TIERS.reduce((chosen, threshold, index) => level >= threshold ? index : chosen, 0);
  const cellWidth = THEATRE_ATLAS_LAYOUT.width / THEATRE_ATLAS_LAYOUT.columns;
  const cellHeight = THEATRE_ATLAS_LAYOUT.height / THEATRE_ATLAS_LAYOUT.rows;
  return { column, row, level, tier: THEATRE_ART_TIERS[row], x: column * cellWidth, y: row * cellHeight, width: cellWidth, height: cellHeight };
}

function styleDefinition(id, style, frame) {
  const matrix = {
    coastal: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0',
    garden: '1.01 0 0 0 0  0 1.04 0 0 0  0 0 .98 0 0  0 0 0 1 0',
    marble: '.83 .12 .08 0 .04  .1 .81 .08 0 .04  .1 .12 .81 0 .05  0 0 0 1 0',
    pirate: '.88 .05 .04 0 0  .04 .82 .03 0 0  .03 .03 .74 0 0  0 0 0 1 0',
    holiday: '1.04 .02 0 0 .015  .01 .98 0 0 0  0 .02 .95 0 0  0 0 0 1 0'
  }[style];
  return `<filter id="${id}-finish" filterUnits="userSpaceOnUse" x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${matrix}"/></filter>`;
}

function atlasArtwork(frame, id, finish, width, height, { flatten = 1 } = {}) {
  const spriteScale = Math.min(width / frame.width, height / frame.height);
  const x = -frame.width * spriteScale / 2, y = -frame.height * spriteScale * .88;
  return `<g class="theatre-atlas-art" transform="scale(1,${flatten})"><defs>${styleDefinition(id, finish, frame)}<clipPath id="${id}-crop" clipPathUnits="userSpaceOnUse"><rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}"/></clipPath></defs><g class="theatre-sprite-window" data-atlas-column="${frame.column}" data-atlas-row="${frame.row}" data-sprite-width="${width.toFixed(3)}" data-sprite-height="${height.toFixed(3)}" transform="translate(${x.toFixed(3)},${y.toFixed(3)}) scale(${spriteScale.toFixed(6)})"><g transform="translate(${-frame.x},${-frame.y})"><g clip-path="url(#${id}-crop)" filter="url(#${id}-finish)"><image class="theatre-sprite-image" href="${THEATRE_ART_ASSETS.decorations}" width="${THEATRE_ATLAS_LAYOUT.width}" height="${THEATRE_ATLAS_LAYOUT.height}" preserveAspectRatio="none"/></g></g></g></g>`;
}

function masteryFinish(kind, level, finish, id, width, { animated, lighting }) {
  if (level <= 20) return '';
  const extra = level - 20;
  // The masterpiece illustration never resets. The first upgrades gain richer
  // illustrated foundations; later commissions refine a bounded set of inlays.
  const pedestalLevel = extra === 1 ? 10 : extra === 2 ? 15 : 20;
  const pedestal = atlasArtwork(theatreSpriteFrame('mosaic', pedestalLevel), `${id}-pedestal`, finish, Math.min(157, width * 1.06), Math.min(157, width * 1.06), { flatten: .31 });
  const marks = Math.min(6, extra), phase = (extra % 97) / 97;
  const colors = finish === 'pirate' ? ['#c1975f', '#d3ae78'] : finish === 'marble' ? ['#e5d9b8', '#c6b17b'] : ['#d9bd79', '#eed8a0'];
  const radius = Math.min(68, width * .44);
  const inlays = [0, 1, 2, 3, 4, 5].slice(0, marks).map(index => {
    const x = -radius + radius * 2 * ((index + .5) / 6), y = 5 + Math.sqrt(Math.max(0, 1 - (x / radius) ** 2)) * 10;
    const lean = ((extra + index * 11) % 7 - 3) * .15;
    return `<path d="M${(x-3.8).toFixed(2)} ${y.toFixed(2)}q3.8 ${(-3.4-lean).toFixed(2)} 7.6 0m-3.8-1.1v3.4" fill="none" stroke="${colors[index % 2]}" stroke-width="${(.7 + phase * .3).toFixed(3)}" opacity=".9"/>`;
  }).join('');
  const engraved = `<path d="M-${radius} 4Q0 25 ${radius} 4" fill="none" stroke="${colors[0]}" stroke-width="1" stroke-dasharray="${(1.1+phase).toFixed(2)} ${(1.9-phase*.4).toFixed(2)}" stroke-dashoffset="${(extra % 23) * .43}" opacity=".7"/>`;
  const glow = lighting === 'night' ? `<ellipse class="${animated ? 'theatre-soft-light' : ''}" cy="4" rx="${radius + 8}" ry="${10 + phase * 2}" fill="#f2d394" opacity=".1"/>` : '';
  return `<g class="theatre-masterwork-finish theatre-masterwork-${kind}" data-masterwork-edition="${Math.floor((extra - 1) / 20) + 1}" data-masterwork-step="${extra}" aria-hidden="true">${pedestal}${glow}${engraved}${inlays}</g>`;
}

export function theatreDecorationSvg(type = 'fountain', requestedLevel = 1, style = 'coastal', { animated = true, prefix = 'decoration', lighting = 'day' } = {}) {
  const frame = theatreSpriteFrame(type, requestedLevel), kind = THEATRE_ATLAS_TYPES[frame.column], finish = validStyle(style);
  const id = safeId(`${prefix}-${kind}-${frame.level}-${finish}`), [baseWidth, baseHeight] = boxes[kind];
  // The illustrated tiers change the actual design; intermediate levels gain
  // presence gradually. Post-masterpiece growth stays within the same place.
  const growth = .84 + Math.min(20, frame.level) * .009 + (frame.level > 20 ? Math.min(.045, Math.log2(frame.level / 20) * .003) : 0);
  const width = baseWidth * growth, height = baseHeight * growth;
  const lantern = kind === 'lantern' && lighting !== 'day';
  const light = lantern ? `<ellipse class="theatre-lantern-halo${animated ? ' theatre-soft-light' : ''}" cx="0" cy="-${height * .54}" rx="${24 + Math.min(20, frame.level)}" ry="${36 + Math.min(20, frame.level)}" fill="#ffdc8c" opacity=".15"/>` : '';
  const water = kind === 'fountain' && frame.level >= 5 ? `<ellipse class="${animated ? 'theatre-water-sheen' : ''}" cx="0" cy="-5" rx="${21 + Math.min(20, frame.level) * .55}" ry="${5 + Math.min(20, frame.level) * .12}" fill="none" stroke="#d6ffff" stroke-width=".8" opacity=".3"/>` : '';
  return `<g class="theatre-decoration theatre-decoration-${kind}" data-decoration-level="${frame.level}" data-decoration-style="${finish}" data-decoration-tier="${frame.tier}"><ellipse cx="0" cy="2" rx="${baseWidth * .26 * growth}" ry="${6 + Math.min(20, frame.level) * .13}" fill="#183b2f" opacity=".08"/>${masteryFinish(kind, frame.level, finish, id, width, { animated, lighting })}${light}${atlasArtwork(frame, id, finish, width, height)}${water}</g>`;
}

export function theatreIconSvg(type, level = 1, style = 'coastal') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-94 -166 188 184" aria-hidden="true" class="theatre-decoration-icon" style="overflow:hidden">${theatreDecorationSvg(type, level, style, { animated: false, prefix: 'icon' })}</svg>`;
}

function atmosphereDefinitions(id) {
  return `<filter id="${id}-golden" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1.05 0 0 0 .025  0 .98 0 0 .006  0 0 .86 0 0  0 0 0 1 0"/></filter>
    <filter id="${id}-night" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".37 .01 .03 0 .005  .01 .45 .03 0 .018  .02 .02 .64 0 .04  0 0 0 1 0"/></filter>
    <linearGradient id="${id}-sunset" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd39b" stop-opacity=".22"/><stop offset=".65" stop-color="#f6c783" stop-opacity="0"/></linearGradient>
    <radialGradient id="${id}-selected"><stop stop-color="#fff2bd" stop-opacity=".65"/><stop offset="1" stop-color="#ffe1a2" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-window"><stop stop-color="#ffdda1" stop-opacity=".52"/><stop offset="1" stop-color="#f1b65f" stop-opacity="0"/></radialGradient>
    <pattern id="${id}-pavers" width="48" height="25" patternUnits="userSpaceOnUse" patternTransform="skewX(-18)"><path d="M0 0H48V25H0ZM24 0V12.5M0 12.5H48" fill="none" stroke="#6c6255" stroke-opacity=".13" stroke-width=".8"/></pattern>
    <clipPath id="${id}-ground"><path d="M130 300H870L1000 700H0Z"/></clipPath>`;
}

function marker(id, position, selected, occupied) {
  if (occupied && !selected) return '';
  const color = selected ? '#fff0b4' : '#f8edce';
  return `<g class="theatre-slot-marker${selected ? ' is-selected' : ''}" data-theatre-slot-marker="${position.slot}" aria-hidden="true" opacity="${selected ? '.95' : '.5'}">
    ${selected ? `<ellipse cy="1" rx="63" ry="22" fill="url(#${id}-selected)"/>` : ''}
    <path d="M-7 0H7M0-4V4" stroke="${color}" stroke-width="${selected ? '2' : '1.3'}" stroke-linecap="round"/>
    ${selected ? `<path d="M-33-7q-9 4-9 8m75-8q9 4 9 8M-33 11q-9-3-9-6m75 6q9-3 9-6" fill="none" stroke="#fff0b4" stroke-width="1.4" opacity=".8"/>` : ''}</g>`;
}

/** Main-island presentation deliberately excludes the private garden. */
export function renderTheatreMapBuilding(_state, { language = 'pl', prefix = 'map-theatre' } = {}) {
  const id = safeId(prefix), title = localized(language, 'Teatr — otwórz swój ogród', 'Theatre — open your garden');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="${id}-title" class="theatre-map-building"><title id="${id}-title">${title}</title><image class="theatre-map-building-image" href="${THEATRE_ART_ASSETS.building}" width="512" height="512" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

export function theatrePerspectiveScale(y) { return Math.max(.65, Math.min(1.04, .65 + (y - 310) * .35 / 265)); }
export function renderTheatreScene(state = {}, { compact = false, selectedSlot = null, preview = null, prefix = 'theatre', language = 'pl', editing = false } = {}) {
  if (compact) return renderTheatreMapBuilding(state, { language, prefix });
  const id = safeId(prefix), collection = Array.isArray(state.theatre?.collection) ? state.theatre.collection : [];
  const atmosphere = state.theatre?.atmosphere || {}, lighting = ['day', 'golden', 'night'].includes(atmosphere.lighting) ? atmosphere.lighting : 'day';
  const paving = ['sandstone', 'stone', 'brick'].includes(atmosphere.paving) ? atmosphere.paving : 'sandstone';
  const title = localized(language, 'Teatr i ogród Twojej wyspy', 'Your island theatre and garden');
  const placed = THEATRE_SLOT_POSITIONS.map(legacyPosition => {
    const owned = collection.find(item => item.slot === legacyPosition.slot);
    const item = editing && preview?.slot === legacyPosition.slot ? preview : owned;
    const point = item?.position || (owned && theatrePosition(state, owned)) || legacyPosition;
    const position = { ...legacyPosition, ...point, scale: theatrePerspectiveScale(point.y) };
    const isPreview = !!item && item === preview && item !== owned;
    return { y: position.y, markup: `<g data-theatre-scene-slot="${position.slot}"${owned ? ` data-theatre-scene-item="${owned.id}"` : ''} transform="translate(${position.x},${position.y}) scale(${position.scale})">${editing && selectedSlot === position.slot ? marker(id, position, true, !!owned) : ''}${item ? `<g class="${isPreview ? 'theatre-placement-preview' : 'theatre-placed-art'}" opacity="${isPreview ? '.75' : '1'}">${theatreDecorationSvg(item.type, item.level, item.style, { prefix: `${id}-slot-${position.slot}`, lighting })}</g>` : ''}</g>` };
  }).sort((a,b) => a.y-b.y).map(entry => entry.markup).join('');
  const tint = paving === 'brick' ? '#975a42' : '#647f85';
  const ground = paving === 'sandstone' ? '' : `<g clip-path="url(#${id}-ground)" class="theatre-paving-treatment" data-theatre-paving="${paving}"><path d="M0 300H1000V700H0Z" fill="${tint}" opacity="${paving === 'brick' ? '.15' : '.12'}" style="mix-blend-mode:multiply"/><path d="M0 300H1000V700H0Z" fill="url(#${id}-pavers)" opacity=".7"/></g>`;
  const filter = lighting === 'day' ? '' : ` filter="url(#${id}-${lighting})"`;
  const night = lighting === 'night' ? `<g class="theatre-night-lights" aria-hidden="true"><ellipse cx="500" cy="200" rx="110" ry="85" fill="url(#${id}-window)" opacity=".5"/>${[[186, 325], [810, 326], [104, 562], [896, 560]].map(([x,y]) => `<ellipse class="theatre-soft-light" cx="${x}" cy="${y}" rx="28" ry="19" fill="url(#${id}-window)"/>`).join('')}${[[104, 80], [846, 96], [260, 126], [715, 52], [484, 69], [610, 108]].map(([x,y], index) => `<circle class="theatre-evening-spark" cx="${x}" cy="${y}" r="${index % 2 ? 1.2 : 1.6}" fill="#fff3cf" opacity=".55" style="--theatre-spark-delay:${index * -.8}s"/>`).join('')}</g>` : '';
  const pennant = state.theatre?.badges?.includes('island-stage-pennant') ? '<g class="theatre-collector-pennant" aria-hidden="true"><path d="M531 58V25" stroke="#795f38" stroke-width="2"/><path d="M532 26l26 8-26 9Z" fill="#eac46e" stroke="#aa8547" stroke-width="1"/></g>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" role="img" aria-label="${title}" class="theatre-scene theatre-scene-${lighting}" data-theatre-lighting="${lighting}" data-theatre-paving="${paving}" data-theatre-editing="${editing}"><defs>${atmosphereDefinitions(id)}</defs><g class="theatre-world-layer"${filter}><image class="theatre-courtyard-image" href="${THEATRE_ART_ASSETS.courtyard}" width="1000" height="700" preserveAspectRatio="xMidYMid slice"/>${ground}${pennant}${placed}</g>${lighting === 'golden' ? `<rect width="1000" height="700" fill="url(#${id}-sunset)" pointer-events="none"/>` : ''}${night}</svg>`;
}
