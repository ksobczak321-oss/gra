// Hand-built scalable island art. Every decoration level changes its geometry;
// the number on a card is never the only visible sign of an improvement.
import { THEATRE_STYLES } from './harborlight-v1-theatre.js?v=frontend-v29';

const palette = id => THEATRE_STYLES.find(style => style.id === id) || THEATRE_STYLES[0];
const points = (count, radius, centerX = 0, centerY = 0) => Array.from({ length: count }, (_, i) => {
  const angle = i / count * Math.PI * 2; return `${(centerX + Math.cos(angle) * radius).toFixed(2)},${(centerY + Math.sin(angle) * radius).toFixed(2)}`;
}).join(' ');
const star = (x, y, radius = 4, color = '#ffe7a1') => `<path d="M${x} ${y-radius}l${radius*.28} ${radius*.72} ${radius*.72} ${radius*.28}-${radius*.72} ${radius*.28}-${radius*.28} ${radius*.72}-${radius*.28}-${radius*.72}-${radius*.72}-${radius*.28} ${radius*.72}-${radius*.28}z" fill="${color}"/>`;
const repeated = (n, draw) => Array.from({ length: n }, (_, i) => draw(i)).join('');
export const THEATRE_SLOT_POSITIONS = Object.freeze(Array.from({ length: 20 }, (_, slot) => Object.freeze({
  slot, x: 150 + slot % 5 * 175, y: 338 + Math.floor(slot / 5) * 90
})));

export function theatreDecorationSvg(type = 'fountain', requestedLevel = 1, style = 'coastal', { animated = true } = {}) {
  const level = Math.max(1, Math.min(20, Math.floor(requestedLevel) || 1)), p = palette(style);
  const scale = .58 + level * .023, gold = level >= 15 ? '#f0d17c' : p.accent;
  const sparkle = level >= 15 ? repeated(Math.floor((level - 12) / 2), i => star(-37 + i * 16, -65 - i % 2 * 14, 3 + level / 15)) : '';
  const ring = `<ellipse cx="0" cy="3" rx="49" ry="17" fill="#153c47" opacity=".18"/>`;
  let drawing = '';
  if (type === 'fountain') {
    const tiers = 1 + Math.floor(level / 5), spread = 14 + level * 1.1;
    drawing = `<ellipse cy="-3" rx="${37+level*.65}" ry="${14+level*.3}" fill="${p.dark}" stroke="${gold}" stroke-width="${level>=10?3:1}"/>
      <ellipse cy="-7" rx="${33+level*.65}" ry="${11+level*.3}" fill="#61c7d2"/>
      ${repeated(tiers, i => `<path d="M-${25-i*3} ${-12-i*18}q${25-i*3} 17 ${50-i*6} 0l-3 8q-${22-i*3} 14 -${44-i*6} 0z" fill="${p.stone}" stroke="${p.dark}"/>
      <rect x="-4" y="${-22-i*18}" width="8" height="20" rx="2" fill="${p.stone}"/>
      <path class="${animated?'theatre-water':''}" d="M0 ${-20-i*18}q-${spread} -${21+level} -${spread} 6M0 ${-20-i*18}q${spread} -${21+level} ${spread} 6" fill="none" stroke="#b3f8ff" stroke-width="${1.3+level*.07}" stroke-linecap="round"/>`)}
      ${repeated(level, i => `<circle cx="${Math.cos(i/level*Math.PI*2)*(29+level*.55)}" cy="${-6+Math.sin(i/level*Math.PI*2)*9}" r="1.4" fill="#d2fdff" opacity=".8"/>`)}`;
  } else if (type === 'column') {
    const h = 40 + level * 2.5;
    drawing = repeated(level >= 10 ? 3 : 2, i => {
      const x = (i - (level >= 10 ? 1 : .5)) * 29;
      return `<path d="M${x-13} 0h26v-7h-26zM${x-11} ${-h}h22v-7h-22z" fill="${p.stone}" stroke="${p.dark}"/>
        <rect x="${x-8}" y="${-h}" width="16" height="${h-6}" fill="${p.stone}" stroke="${p.dark}"/>
        ${repeated(2+Math.floor(level/4), j => `<path d="M${x-6+j*12/(1+Math.floor(level/4))} ${-h+3}v${h-13}" stroke="${p.dark}" opacity=".35"/>`)}
        <ellipse cx="${x}" cy="${-h-4}" rx="14" ry="4" fill="${gold}"/>`;
    }) + (level >= 15 ? `<path d="M-46 ${-h-10}H46l-9-10H-37z" fill="${p.stone}" stroke="${gold}" stroke-width="3"/>` : '');
  } else if (type === 'statue') {
    drawing = `<path d="M-28 0h56v-10H-28zM-21-10h42v-${14+level*.7}h-42z" fill="${p.stone}" stroke="${p.dark}"/>
      <path d="M0-${27+level*.7}c-25-16-12-32 0-43 12 11 25 27 0 43z" fill="${level>=10?gold:p.stone}" stroke="${p.dark}" stroke-width="2"/>
      <circle cy="-${77+level*.6}" r="${7+level*.15}" fill="${p.stone}" stroke="${p.dark}"/>
      <path d="M-18-${48+level*.6}q18-20 36 0M0-${64+level*.6}v32" fill="none" stroke="${p.dark}" stroke-width="3"/>
      ${repeated(level, i => star(-20+i%5*10, -14-Math.floor(i/5)*7, 1.2, gold))}`;
  } else if (type === 'flowerbed') {
    drawing = `<path d="M-43-6l43 16L43-6 0-24z" fill="${p.stone}" stroke="${p.dark}"/>
      <path d="M-35-9l35 13L35-9 0-21z" fill="#705b41"/>
      ${repeated(5+level, i => {
        const angle = i*2.4, r = 4+Math.sqrt(i)*6, x = Math.cos(angle)*r, y = -15+Math.sin(angle)*r*.35;
        return `<path d="M${x} ${y}v-12" stroke="${p.foliage}" stroke-width="2"/><circle cx="${x}" cy="${y-14}" r="${3+level*.12}" fill="${i%3===0?gold:i%2?p.accent:'#f4e1bd'}"/>`;
      })}`;
  } else if (type === 'tree') {
    drawing = `<path d="M-5 0l2-${57+level}h7l2 ${57+level}z" fill="${p.dark}"/>
      ${repeated(5+level, i => {
        const angle = i*2.4, r = 4+Math.sqrt(i)*6;
        return `<circle cx="${Math.cos(angle)*r}" cy="${-48-level*.7+Math.sin(angle)*r*.6}" r="${11+level*.15}" fill="${i%2?p.foliage:'#73ad6e'}"/>`;
      })}${level>=10?repeated(Math.floor(level/2), i=>`<circle cx="${Math.cos(i*2.4)*24}" cy="${-50+Math.sin(i*2.4)*17}" r="3" fill="${gold}"/>`):''}`;
  } else if (type === 'hedge') {
    drawing = `<path d="M-47 0h94v-8h-94z" fill="${p.stone}"/>${repeated(4+Math.floor(level/3), i => {
      const x = -36+i*72/(3+Math.floor(level/3)); return `<rect x="${x-12}" y="-${21+level}" width="24" height="${17+level}" rx="10" fill="${p.foliage}" stroke="#365c42"/>`;
    })}${level>=15?`<path d="M-18-36q18-30 36 0v15h-36z" fill="${p.foliage}" stroke="${gold}" stroke-width="2"/>`:''}
      ${repeated(level,i=>`<circle cx="${-40+i*80/(level-1||1)}" cy="${-11-i%3*7}" r="1.5" fill="${p.accent}"/>`)}`;
  } else if (type === 'bench') {
    drawing = `<path d="M-30-3v-23M30-3v-23M-35-26v-${17+level*.6}M35-26v-${17+level*.6}" stroke="${p.dark}" stroke-width="5"/>
      ${repeated(3+Math.floor(level/3), i=>`<rect x="-36" y="${-48+i*(23/(2+Math.floor(level/3)))}" width="72" height="4" rx="2" fill="${p.stone}" stroke="${p.dark}" stroke-width=".6"/>`)}
      <path d="M-39-19l8-8h62l8 8z" fill="${p.stone}" stroke="${p.dark}"/>
      ${level>=10?`<path d="M-40-18v-16h9M40-18v-16h-9" fill="none" stroke="${gold}" stroke-width="3"/>`:''}
      ${repeated(level,i=>`<circle cx="${-30+i*60/(level-1||1)}" cy="-43" r="1" fill="${gold}"/>`)}`;
  } else if (type === 'lantern') {
    const h=49+level*2, lamps=1+Math.floor(level/5);
    drawing=`<ellipse cy="-1" rx="15" ry="5" fill="${p.dark}"/><path d="M0-4v-${h}" stroke="${p.dark}" stroke-width="5"/>
      ${repeated(lamps,i=>{const x=(i-(lamps-1)/2)*18;return `<path d="M0-${h-9}Q${x}-${h+8} ${x}-${h}" fill="none" stroke="${gold}" stroke-width="3"/>
      <path d="M${x-7}-${h}h14l-2 16h-10z" fill="#ffdf8e" stroke="${p.dark}" stroke-width="2"/><ellipse class="${animated?'theatre-glow':''}" cx="${x}" cy="${-h+7}" rx="16" ry="19" fill="#ffdf8e" opacity=".18"/>`;})}`;
  } else if (type === 'gateway') {
    const h=41+level*1.8;
    drawing=`<path d="M-39 0v-${h}Q0-${h+29} 39-${h}v${h}h-12v-${h-6}Q0-${h+14}-27-${h-6}V0z" fill="${p.stone}" stroke="${p.dark}" stroke-width="2"/>
      ${repeated(level,i=>`<circle cx="${-35+i*70/(level-1||1)}" cy="${-h-3-Math.sin(i/(level-1||1)*Math.PI)*15}" r="2" fill="${gold}"/>`)}
      ${level>=10?`<path d="M-30-${h+4}Q0-${h-18} 30-${h+4}" stroke="${gold}" stroke-width="2" fill="none"/><path d="M-22-${h-2}l7 10 4-6 9 11 8-9 7 4 9-10" fill="${p.accent}"/>`:''}`;
  } else if (type === 'mosaic') {
    drawing=`<ellipse cy="-9" rx="47" ry="21" fill="${p.dark}"/><ellipse cy="-12" rx="44" ry="19" fill="${p.stone}"/>
      ${repeated(1+Math.floor(level/3),i=>`<ellipse cy="-12" rx="${8+i*5}" ry="${3.5+i*2.2}" fill="none" stroke="${i%2?gold:p.accent}" stroke-width="2"/>`)}
      <g transform="translate(0,-12) scale(1,.43)"><polygon points="${points(4+level,21)}" fill="${p.accent}" opacity=".8"/>${star(0,0,14,gold)}</g>`;
  }
  return `<g class="theatre-decoration theatre-decoration-${type}" data-decoration-level="${level}" data-decoration-style="${p.id}">${ring}<g transform="scale(${scale.toFixed(3)})">${drawing}${sparkle}</g></g>`;
}

export function theatreIconSvg(type, level=1, style='coastal') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-62 -110 124 132" aria-hidden="true">${theatreDecorationSvg(type,level,style,{animated:false})}</svg>`;
}

export function renderTheatreScene(state, { compact=false, selectedSlot=null, preview=null, prefix='theatre', language='pl' }={}) {
  const id=String(prefix).replace(/[^a-zA-Z0-9_-]/g,''), collection=state.theatre?.collection || [];
  const title=language==='en'?'Your island theatre and garden':'Teatr i ogród Twojej wyspy';
  const slots=THEATRE_SLOT_POSITIONS.map(({slot,x,y})=>{
    const placed=collection.find(item=>item.slot===slot), item=preview?.slot===slot?preview:placed;
    return `<g data-theatre-scene-slot="${slot}" transform="translate(${x},${y})"><ellipse rx="71" ry="29" fill="${slot===selectedSlot?'#edcf84':'#e4d5ae'}" opacity="${slot===selectedSlot?'.9':'.35'}" stroke="${slot===selectedSlot?'#fff2bd':'#b49e78'}" stroke-width="${slot===selectedSlot?3:1}" stroke-dasharray="${item?'none':'4 5'}"/>${item?theatreDecorationSvg(item.type,item.level,item.style,{animated:!compact}):`<path d="M-5 0H5M0-5V5" stroke="#ac9b7a" stroke-width="2" opacity=".6"/>`}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" role="img" aria-label="${title}" class="theatre-scene${compact?' theatre-scene-compact':''}">
    <defs><linearGradient id="${id}-sky" x2="0" y2="1"><stop stop-color="#82c6cb"/><stop offset="1" stop-color="#d5e8ce"/></linearGradient><linearGradient id="${id}-paving" x2="0" y2="1"><stop stop-color="#e4cba1"/><stop offset="1" stop-color="#b3ad87"/></linearGradient><linearGradient id="${id}-roof" x2="0" y2="1"><stop stop-color="#ca9b67"/><stop offset="1" stop-color="#955e48"/></linearGradient></defs>
    ${compact ? `<ellipse cx="500" cy="455" rx="485" ry="232" fill="#adad8277"/><ellipse cx="500" cy="448" rx="465" ry="221" fill="url(#${id}-paving)" opacity=".85"/>` : `<rect width="1000" height="700" rx="24" fill="url(#${id}-sky)"/><path d="M0 145Q180 124 340 156T700 140T1000 151V320H0z" fill="#5ba8af"/>
    <path d="M0 212Q120 205 202 221M706 195q90-13 180 2M30 177h76M850 232h112" stroke="#c6e9df" stroke-width="3" fill="none" opacity=".7"/>
    <path d="M0 279Q500 215 1000 279V700H0z" fill="url(#${id}-paving)"/>
    <path d="M65 333H935M45 423H955M25 513H975M5 603H995" stroke="#f3e3c5" stroke-width="3" opacity=".6"/>
    <path d="M238 274L85 700M410 265L360 700M590 265L640 700M762 274L915 700" stroke="#f3e3c5" stroke-width="2" opacity=".5"/>`}
    <ellipse cx="500" cy="274" rx="259" ry="33" fill="#59715c" opacity=".23"/>
    <path d="M265 259h470v24H265zM282 241h436v18H282zM300 224h400v17H300z" fill="#e3d7b9" stroke="#b3997a" stroke-width="2"/>
    <path d="M312 125h376v111H312z" fill="#e9dabe" stroke="#b3987c" stroke-width="3"/>
    <path d="M349 139h302v86H349z" fill="#846051"/><path d="M356 140h288v80H356z" fill="#283b3b"/>
    <path d="M357 139h74q-4 59-44 81h-30zM643 139h-74q4 59 44 81h30z" fill="#a24f47"/>
    <path d="M376 142q26 11 47 1M624 142q-26 11-47 1" stroke="#e0b477" stroke-width="4" fill="none"/>
    ${[324,665].map(x=>`<rect x="${x}" y="127" width="16" height="110" fill="#f1e4c8" stroke="#b3987c"/><path d="M${x-4} 128h24v9h-24zM${x-4} 226h24v11h-24z" fill="#c4ae8a"/>`).join('')}
    <path d="M284 127L500 44 716 127z" fill="url(#${id}-roof)" stroke="#805c47" stroke-width="3"/><path d="M303 126L500 58 697 126z" fill="#d6b780"/>
    <path d="M329 123L500 70 671 123z" fill="#f0dcb3"/>
    <circle cx="500" cy="103" r="20" fill="#e4bd6e" stroke="#a57b51" stroke-width="2"/>
    <path d="M486 103q14-17 28 0q-14 18-28 0z" fill="#714b42"/><path d="M490 99v5M510 99v5M494 107q6 5 12 0" stroke="#f5e2b8" stroke-width="2" fill="none"/>
    ${state.theatre?.badges?.includes('island-stage-pennant')?'<path d="M511 50V5l51 13-51 13" fill="#e2b764" stroke="#785638" stroke-width="3"/>':''}
    ${compact ? '' : `<path d="M0 284Q51 237 90 278l28 422H0zM1000 284q-51-47-90-6l-28 422h118z" fill="#578c60"/>
    ${[30,966].map(x=>`<path d="M${x} 312l8-141" stroke="#917651" stroke-width="9"/><path d="M${x+8} 175q-68-55-72-15 48-12 72 15-28-80 11-66-6 31-11 66 63-55 69-19-38-7-69 19 22-58 51-34-30 8-51 34" fill="#4d9270"/>`).join('')}`}
    ${slots}
    ${compact ? '' : '<path d="M0 683q100-12 170 7M840 690q90-20 160-8" stroke="#77955e" stroke-width="8" fill="none"/>'}
  </svg>`;
}
