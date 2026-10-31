// Standalone tabletop bookkeeping only. No game-account/network/payment adapter.
export const ROUTE = ['Port','Magazyn','Dom','Gospodarstwo','Młyn','Kaplica','Ratusz','Kamieniołom','Drwale','Tartak','Targ','Przystań','Port','Latarnia'];
export const SPECIALTIES = ['Port','Magazyn','Dom','Ratusz','Kaplica','Drwale'];
export function chooseScenes(scenes, random = Math.random) {
  const pick = (act, count) => {
    const pool = scenes.filter(s => s.act === act).map(s => s.id);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, count);
  };
  return [...pick(1, 2), ...pick(2, 4), 'F11', 'F12'];
}
export function createSession(names, sceneIds) {
  if (!Array.isArray(names) || names.length < 2 || names.length > 6 || names.some(n => typeof n !== 'string' || !n.trim() || n.length > 30)) throw new Error('Wpisz imiona 2–6 osób, po maksymalnie 30 znaków.');
  if (!Array.isArray(sceneIds) || sceneIds.length !== 8 || new Set(sceneIds).size !== 8) throw new Error('Scenariusz wymaga ośmiu różnych scen.');
  return { version:1, round:0, phase:'move', players:names.map((name,i)=>({name:name.trim(),role:i,position:0,walk:0,specialty:0,arrival:0,scene:0})), scenes:sceneIds, successes:[], hints:6, usedHint:false, narrator:null, story:null, repaired:null, deadline:null };
}
export function applyMoves(s, choices) {
  if (s.phase !== 'move' || !Array.isArray(choices) || choices.length !== s.players.length) throw new Error('Ruchy tej rundy zostały już zatwierdzone.');
  for (const c of choices) if (![1,2].includes(c.steps) || !SPECIALTIES.includes(c.card)) throw new Error('Wybierz kartę Szlaku i ruch 1 albo 2.');
  s.players.forEach((p,i) => {
    if (p.position === 13) return;
    const c=choices[i]; p.position=Math.min(13,p.position+c.steps); p.walk+=c.steps===1?2:1;
    if (ROUTE[p.position]===c.card) p.specialty++;
    if (p.position===13) p.arrival=3;
  });
  s.phase='intro';
}
export function startScene(s, now=Date.now()) { if (s.phase!=='secret') throw new Error('Najpierw przeczytajcie publiczny cel i sekret.'); s.phase='play'; s.deadline=now+90000; }
export function useHint(s) { if (s.phase!=='play'||s.hints<1||s.usedHint) return false; s.hints--;s.usedHint=true;return true; }
export function resolveScene(s, success) {
  if(s.phase!=='check') throw new Error('Najpierw zamknijcie odpowiedź i sprawdźcie rozwiązanie.');
  s.successes.push(Boolean(success)); if(success)s.players.forEach(p=>p.scene++); s.phase='story'; s.deadline=null;
}
export function storyChoice(s, choice) {
  if(s.phase!=='story')throw new Error('To nie jest etap decyzji.');
  if(s.round===1){if(!['Dom','Ratusz'].includes(choice))throw new Error('Wybierz narratora.');s.narrator=choice;}
  if(s.round===3){
    if(!['help','testimony'].includes(choice))throw new Error('Wybierz pomoc albo świadectwo.');
    s.story=choice;
    if(choice==='help') {const p=s.players.reduce((a,b)=>a.position<=b.position?a:b);if(p.position<13){p.position++;if(p.position===13)p.arrival=3;}}
    else s.hints=Math.min(6,s.hints+1);
  }
  if(s.round===7)s.phase='final';else{s.round++;s.phase='move';s.usedHint=false;}
}
export function parts(s){return {Załoga:s.successes.slice(0,2).filter(Boolean).length>=1,Mechanizm:s.successes.slice(2,6).filter(Boolean).length>=2,Kod:s.successes.slice(6,8).filter(Boolean).length>=1,...(s.repaired?{[s.repaired]:true}:{})};}
export function repairPart(s, part){if(s.phase!=='final'||s.repaired||s.hints<3||parts(s)[part]!==false)return false;s.hints-=3;s.repaired=part;return true;}
export function result(s){
  const earned=Object.values(parts(s)).filter(Boolean).length,arrived=s.players.filter(p=>p.position===13).length;
  const scores=s.players.map(p=>({...p,total:p.walk+p.specialty+p.arrival+p.scene}));
  return{parts:parts(s),successes:s.successes.filter(Boolean).length,arrived,ending:earned===3&&arrived>=Math.ceil(s.players.length/2)?'Pełne światło':earned>=2&&arrived>=1?'Światło do świtu':'Port opowieści',scores,champions:scores.filter(p=>p.total===Math.max(...scores.map(x=>x.total))).map(p=>p.name)};
}
