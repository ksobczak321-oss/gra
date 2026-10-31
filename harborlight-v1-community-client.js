import { LEAGUE_RULES, leagueCalendar, createLeagueChallenge, emptyLeagueProgress, applyLeagueAction, leagueAttemptScore } from './harborlight-v1-league.js?v=frontend-v25';
const requestId = () => globalThis.crypto?.randomUUID?.().replaceAll('-', '_') || `request_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const error = code => Object.assign(new Error(code), { code });
export function createCommunityClient({ send, load } = {}) {
  if (typeof send !== 'function' || typeof load !== 'function') throw new TypeError('Authenticated community transport required.');
  const pending = new Map();
  function request(command, data = {}) {
    const key = JSON.stringify({ command, data });
    let operation = pending.get(key);
    if (!operation) { operation = { id: requestId(), promise: null }; pending.set(key, operation); }
    if (operation.promise) return operation.promise;
    operation.promise = Promise.resolve().then(() => send({ ...data, command, requestId: operation.id })).then(result => { pending.delete(key); return result; }, failure => { operation.promise = null; if (Number.isInteger(failure?.status) && failure.status >= 400 && failure.status < 500) pending.delete(key); throw failure; });
    return operation.promise;
  }
  return { snapshot: () => load(), request, simulation: false };
}
export function createHttpCommunityClient({ fetch: fetcher = globalThis.fetch, baseUrl = '', getToken } = {}) {
  async function call(body) {
    const token = await getToken?.(); if (!token) throw error('auth-required');
    const response = await fetcher(`${baseUrl}/api/v1/community`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store' });
    let result; try { result = await response.json(); } catch { throw error('community-unavailable'); }
    if (!response.ok) throw Object.assign(error(result.error || 'community-unavailable'), { status: response.status }); return result;
  }
  return createCommunityClient({ load: () => call(), send: call });
}
/** Explicit, volatile DEV demonstration. No authentication records, cloud saves,
 * real opponents, PLN commitments or persistent rewards are created here.
 * The identity switch lets a tester actually approve an invitation or send a
 * reply as a second sample account rather than showing fabricated live chat.
 */
export function createLocalCommunityClient({ name = 'Kapitan DEV' } = {}) {
  const players = new Map([
    ['demo_1', { id: 'demo_1', name, allianceId: null, blocked: [], muted: [] }],
    ['demo_2', { id: 'demo_2', name: 'Nawigator DEV', allianceId: 'demo_alliance', blocked: [], muted: [] }],
    ['demo_3', { id: 'demo_3', name: 'Latarnik DEV', allianceId: 'demo_alliance', blocked: [], muted: [] }]
  ]);
  const alliances = new Map([['demo_alliance', { id: 'demo_alliance', name: 'Latarnicy DEV', description: 'Przykładowa załoga do ręcznego testu.', captainId: 'demo_2', members: [{ id: 'demo_2', name: 'Nawigator DEV' }, { id: 'demo_3', name: 'Latarnik DEV' }], pending: [] }]]);
  const rooms = new Map(), attempts = new Map(); let current = 'demo_1';
  const self = () => players.get(current), copy = x => structuredClone(x);
  const update = () => { for (const a of alliances.values()) a.members = a.members.map(m => ({ ...m, name: players.get(m.id).name })); };
  function room(data) {
    const p = self();
    if (data.channel === 'alliance') { if (!p.allianceId) throw error('community-chat-forbidden'); return p.allianceId; }
    const other = players.get(data.targetId); if (!other || other.id === p.id) throw error('community-player-not-found');
    if (p.blocked.includes(other.id) || other.blocked.includes(p.id)) throw error('community-player-blocked'); return [p.id, other.id].sort().join(':');
  }
  async function snapshot() { update(); return copy({ self: self(), alliance: alliances.get(self().allianceId) || null, players: [...players.values()].filter(p => p.id !== current).map(({id,name})=>({id,name})), alliances: [...alliances.values()].filter(a=>a.members.length).map(a=>({id:a.id,name:a.name,count:a.members.length})), calendar: leagueCalendar(), serverTime: Date.now(), rules: LEAGUE_RULES, environment:'dev-simulation' }); }
  async function request(command, data = {}) {
    const p = self(), a = alliances.get(p.allianceId), now = Date.now();
    if (command === 'snapshot') return snapshot();
    if (command === 'profile') { const clean = String(data.name || '').trim(); if (clean.length < 2 || clean.length > 40 || clean.includes('@')) throw error('community-invalid-text'); p.name = clean; update(); return {self:copy(p)}; }
    if (command === 'allianceCreate') { if (p.allianceId) throw error('community-already-allied'); const name = String(data.name || '').trim(); if (name.length < 2 || name.length > 40) throw error('community-invalid-text'); if ([...alliances.values()].some(a=>a.name.toLowerCase()===name.toLowerCase())) throw error('community-alliance-name-used'); const id = 'demo_' + requestId(); const created = {id,name,description:String(data.description||''),captainId:p.id,members:[{id:p.id,name:p.name}],pending:[]}; alliances.set(id,created); p.allianceId=id; return {alliance:copy(created)}; }
    if (command === 'allianceApply') { if (p.allianceId) throw error('community-already-allied'); const target = alliances.get(data.allianceId); if (!target || target.members.length>=5) throw error('community-alliance-full'); if (!target.pending.some(x=>x.id===p.id)) target.pending.push({id:p.id,name:p.name}); return {alliance:copy(target)}; }
    if (['allianceApprove','allianceCaptain','allianceKick','allianceLeave'].includes(command)) {
      if (!a) throw error('community-alliance-required'); if (command!=='allianceLeave'&&a.captainId!==p.id) throw error('community-captain-required');
      const target = command==='allianceLeave' ? p : players.get(data.playerId); if (!target) throw error('community-player-not-found');
      if (command==='allianceApprove') { if (target.allianceId || !a.pending.some(x=>x.id===target.id)) throw error('community-application-required'); if(a.members.length>=5)throw error('community-alliance-full'); a.pending=a.pending.filter(x=>x.id!==target.id);a.members.push({id:target.id,name:target.name});target.allianceId=a.id; }
      else if(command==='allianceCaptain'){if(!a.members.some(x=>x.id===target.id))throw error('community-member-required');a.captainId=target.id;}
      else {if(!a.members.some(x=>x.id===target.id))throw error('community-member-required');a.members=a.members.filter(x=>x.id!==target.id);target.allianceId=null;if(a.captainId===target.id)a.captainId=a.members[0]?.id||null;}
      return {alliance:command==='allianceLeave'?null:copy(a)};
    }
    if(command==='chatRead'){const key=room(data);return{channelId:key,messages:copy((rooms.get(key)||[]).filter(m=>!p.blocked.includes(m.authorId))),muted:p.muted.includes(key),serverTime:now};}
    if(command==='chatSend'){const key=room(data),text=String(data.text||'').trim();if(!text||text.length>500)throw error('community-invalid-text');p.sentAt=(p.sentAt||[]).filter(t=>t>now-10000);if(p.sentAt.length>=5)throw error('community-chat-rate-limited');p.sentAt.push(now);const message={id:requestId(),authorId:p.id,authorName:p.name,text,createdAt:now};rooms.set(key,[...(rooms.get(key)||[]),message].slice(-100));return{message,channelId:key};}
    if(command==='chatReport'){const key=room(data);if(!(rooms.get(key)||[]).some(m=>m.id===data.messageId))throw error('community-message-not-found');return{reported:true};}
    if(command==='chatMute'){const key=room(data);p.muted=data.muted===false?p.muted.filter(x=>x!==key):[...new Set([...p.muted,key])];return{muted:p.muted};}
    if(command==='playerBlock'){p.blocked=data.blocked===false?p.blocked.filter(x=>x!==data.playerId):[...new Set([...p.blocked,data.playerId])];return{blocked:p.blocked};}
    if(command==='leagueRead')return{season:leagueCalendar().season,calendar:leagueCalendar(),groups:[],friendly:true,registered:false,rewards:{playedDays:0,goals:0},schedule:{days:[15,21],arcade:'19:00–21:00',logic:'19:00–21:00',zone:LEAGUE_RULES.zone,perTaskAttempts:2,dailyScore:'average-of-two-tasks'}};
    if(command==='leagueEnroll')throw error('league-demo-practice-only');
    if(command==='attemptStart'){if(data.practice!==true)throw error('league-demo-practice-only');const challenge=createLeagueChallenge({day:data.day,kind:data.kind,seed:33});const attempt={attemptId:requestId(),challenge,progress:emptyLeagueProgress(),sequence:0,practice:true,startedAt:now,serverTime:now,status:'playing',ownerId:p.id};attempts.set(attempt.attemptId,attempt);return copy(attempt);}
    if(command==='attemptAction'||command==='attemptFinish'||command==='attemptRead'){const attempt=attempts.get(data.attemptId);if(!attempt||attempt.ownerId!==p.id)throw error('league-attempt-not-found');if(command==='attemptRead')return copy({...attempt,serverTime:now});if(attempt.status!=='playing')throw error('league-attempt-completed');if(command==='attemptAction'){if(data.sequence!==attempt.sequence)throw error('league-action-conflict');const applied=applyLeagueAction(attempt.challenge,attempt.progress,data.action,now-attempt.startedAt);if(!applied.accepted)throw error('league-'+applied.reason);attempt.progress=applied.progress;attempt.sequence++;return copy({...attempt,serverTime:now,actionResult:applied.reason||'accepted'});}attempt.status='finished';attempt.score=leagueAttemptScore(attempt.challenge,attempt.progress,now-attempt.startedAt);return copy({...attempt,serverTime:now});}
    throw error('community-unknown-command');
  }
  return { snapshot,request,simulation:true,listIdentities:()=>[...players.values()].map(({id,name})=>({id,name})),identity:()=>current,setIdentity:id=>{if(!players.has(id))throw error('community-player-not-found');current=id;} };
}
