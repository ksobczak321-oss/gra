import { createHash } from 'node:crypto';
import { AccountServiceError } from './account-service.mjs';
import { LEAGUE_RULES, leagueCalendar, createLeagueChallenge, emptyLeagueProgress, applyLeagueAction, leagueAttemptScore, leagueTeamScore } from './league-rules.mjs';

const DAY = 86400000, CHAT_TTL = 30 * DAY, REPORT_TTL = 90 * DAY;
const DIRECTORY_LIMIT = 1000, MAX_REQUESTS = 30;
const hash = v => createHash('sha256').update(v).digest('hex');
const publicId = uid => 'u_' + hash('harborlight-community\0' + uid).slice(0, 24);
const fail = (code, status = 409) => { throw new AccountServiceError(code, status); };
const uidValue = uid => typeof uid === 'string' && /^[A-Za-z0-9:_-]{1,128}$/.test(uid) ? uid : fail('invalid-account', 400);
const idValue = (id, type = 'u') => typeof id === 'string' && new RegExp(`^${type}_[a-f0-9]{24}$`).test(id) ? id : fail('community-invalid-id', 400);
const clean = (value, min, max) => typeof value === 'string' && value.normalize('NFC').trim().length >= min && value.normalize('NFC').trim().length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) ? value.normalize('NFC').trim() : fail('community-invalid-text', 400);
const ppath = uid => `communityPlayers/${uidValue(uid)}`;
const apath = id => `communityAlliances/${idValue(id, 'a')}`;
const hpath = id => `communityHandles/${idValue(id)}`;
const profilePublic = p => ({ id: p.id, name: p.name, allianceId: p.allianceId || null });
const alliancePublic = a => a ? { id: a.id, name: a.name, description: a.description, captainId: publicId(a.captainUid), members: a.members.map(x => ({ id: publicId(x.uid), name: x.name, joinedAt: x.joinedAt })), pending: a.pending.map(x => ({ id: publicId(x.uid), name: x.name })), createdAt: a.createdAt } : null;
const canonical = value => JSON.stringify(value, function(key, item) { return item && !Array.isArray(item) && typeof item === 'object' ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item; });
const seasonPath = season => `communitySeasons/${season}`;
const teamPath = (season, id) => `${seasonPath(season)}/teams/${idValue(id, 'a')}`;
const participantPath = (season, uid) => `${seasonPath(season)}/players/${uidValue(uid)}`;
const attemptPath = (uid, id) => `${ppath(uid)}/attempts/${id}`;
const seasonValue = value => typeof value === 'string' && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value) ? value : fail('league-invalid-season', 400);

/** Durable transaction boundary for community actions. It does not accept a
 * caller UID, clock, score or verified flag as evidence from the request body.
 * Public identifiers are opaque handles, never Firebase Auth UIDs or emails.
 */
export function createCommunityService({ store, now = () => Date.now(), environment = 'production' } = {}) {
  if (!store || typeof store.runTransaction !== 'function') throw new TypeError('A transactional community store is required.');
  const clock = () => { const value = now(); if (!Number.isSafeInteger(value) || value < 0) fail('invalid-server-clock', 500); return value; };
  async function transaction(work) {
    return store.runTransaction(async tx => {
      const reads = new Map(), writes = new Map();
      const ctx = { get: async path => { if (!reads.has(path)) reads.set(path, await tx.get(path)); return structuredClone(reads.get(path)); }, put: (path, value) => writes.set(path, structuredClone(value)) };
      const result = await work(ctx);
      // The Firestore adapter forbids reads after its first write and requires
      // a prior read even for creating a root document.
      for (const path of writes.keys()) if (!reads.has(path)) await ctx.get(path);
      for (const [path, value] of writes) await tx.set(path, value);
      return result;
    });
  }
  const profile = async (tx, uid) => { const p = await tx.get(ppath(uid)); if (!p) fail('community-profile-required', 409); return p; };
  async function handle(tx, id) { const link = await tx.get(hpath(id)); if (!link) fail('community-player-not-found', 404); return profile(tx, link.uid); }
  async function directory(tx) { return await tx.get('communityDirectory/catalog') || { players: [], alliances: [] }; }
  const updateDirectoryAlliance = (catalog, a) => { catalog.alliances = catalog.alliances.filter(x => x.id !== a.id); if (a.members.length) catalog.alliances.push({ id: a.id, name: a.name, count: a.members.length }); };
  async function refreshUnfrozenRoster(tx, alliance, at) {
    const cal = leagueCalendar(at); if (!cal.registration) return;
    const key = teamPath(cal.season, alliance.id), team = await tx.get(key); if (!team) return;
    // Removing a member during registration also removes that pre-season slot;
    // starting on day 15 both this list and its denominator are immutable.
    const next = alliance.members.map(m => ({ uid: m.uid, id: publicId(m.uid), name: m.name }));
    for (const removed of team.roster.filter(r => !next.some(n => n.uid === r.uid))) {
      const link = await tx.get(participantPath(cal.season, removed.uid));
      if (link?.teamId === alliance.id) tx.put(participantPath(cal.season, removed.uid), { teamId: null });
    }
    for (const added of next) {
      const link = await tx.get(participantPath(cal.season, added.uid));
      if (link?.teamId && link.teamId !== alliance.id) fail('league-already-registered');
      tx.put(participantPath(cal.season, added.uid), { teamId: alliance.id });
    }
    team.roster = next; tx.put(key, team);
  }
  async function snapshot({ uid }) {
    uidValue(uid); const at = clock();
    return transaction(async tx => {
      const p = await tx.get(ppath(uid)), catalog = await directory(tx);
      const alliance = p?.allianceId ? await tx.get(apath(p.allianceId)) : null;
      const active = p?.activeAttemptId ? await tx.get(attemptPath(uid, p.activeAttemptId)) : null;
      return { self: p ? { ...profilePublic(p), blocked: p.blocked || [], muted: p.muted || [] } : { id: publicId(uid), name: '', allianceId: null, needsProfile: true }, alliance: alliancePublic(alliance), alliances: catalog.alliances, players: catalog.players.filter(x => x.id !== publicId(uid)), calendar: leagueCalendar(at), rules: LEAGUE_RULES, serverTime: at, environment, activeAttempt: active?.status === 'playing' ? publicAttempt(active, at) : null };
    });
  }
  async function roomFor(tx, p, data) {
    if (data.channel === 'alliance') {
      if (!p.allianceId || data.targetId && data.targetId !== p.allianceId) fail('community-chat-forbidden', 403);
      const a = await tx.get(apath(p.allianceId));
      if (!a?.members.some(m => m.uid === p.uid)) fail('community-chat-forbidden', 403);
      const key = `${apath(a.id)}/chat/main`, room = await tx.get(key) || { messages: [] };
      return { key, room, channelId: a.id, other: null };
    }
    if (data.channel !== 'direct') fail('community-invalid-channel', 400);
    const other = await handle(tx, data.targetId);
    if (other.uid === p.uid) fail('community-direct-self', 400);
    if ((p.blocked || []).includes(other.id) || (other.blocked || []).includes(p.id)) fail('community-player-blocked', 403);
    const channelId = 'd_' + hash([p.id, other.id].sort().join('\0')).slice(0, 40), key = `communityDirect/${channelId}`;
    const room = await tx.get(key) || { participants: [p.uid, other.uid].sort(), messages: [] };
    if (!room.participants.includes(p.uid) || !room.participants.includes(other.uid)) fail('community-chat-forbidden', 403);
    return { key, room, channelId, other };
  }
  function cleanMessages(room, at) { return (room.messages || []).filter(m => m.createdAt > at - CHAT_TTL); }
  async function leagueSnapshot(tx, p, requestedSeason, at) {
    const cal = leagueCalendar(at), season = seasonValue(requestedSeason || cal.season), catalog = await tx.get(seasonPath(season)) || { teams: [] };
    const teams = [];
    for (const id of catalog.teams || []) { const team = await tx.get(teamPath(season, id)); if (team) teams.push(team); }
    const standings = teams.map(t => ({ id: t.id, name: t.name, roster: t.roster.map(r => ({ id: r.id, name: r.name })), rounds: Array.from({ length: 7 }, (_, i) => {
      const scores = t.roster.map(r => { const day = t.scores?.[r.uid]?.[i + 1] || {}; return ((day.arcade?.score || 0) + (day.logic?.score || 0)) / 2; });
      return scores.length ? leagueTeamScore(scores) : 0;
    }) }));
    // Round-robin pairing is generated from the frozen, sorted team list. A
    // small cohort remains an explicitly labelled friendly competition.
    const groups = [], groupCount = Math.max(1, Math.ceil(standings.length / 8));
    for (let i = 0; i < groupCount; i++) groups.push([]);
    standings.forEach((team, index) => groups[index % groupCount].push(team));
    if (!standings.length) groups.length = 0;
    for (const group of groups) {
      const byId = Object.fromEntries(group.map(t => [t.id, Object.assign(t, { tablePoints: 0, scored: 0, conceded: 0, wins: 0, draws: 0, games: 0, headToHead: {} })]));
      const ring = group.map(t => t.id).sort(); if (ring.length % 2) ring.push(null);
      for (let round = 0; round < Math.min(7, Math.max(0, ring.length - 1) * (group.length === 4 ? 2 : 1)); round++) {
        for (let i = 0; i < ring.length / 2; i++) { const a = byId[ring[i]], b = byId[ring[ring.length - 1 - i]]; if (!a || !b || season === cal.season && cal.day <= 15 + round) continue;
          const x = a.rounds[round], y = b.rounds[round]; a.games++; b.games++; a.scored += x; b.scored += y; a.conceded += y; b.conceded += x;
          if (x === y) { a.draws++; b.draws++; a.tablePoints++; b.tablePoints++; } else { const winner = x > y ? a : b; winner.wins++; winner.tablePoints += 3; }
          a.headToHead[b.id] = (a.headToHead[b.id] || 0) + (x === y ? 1 : x > y ? 3 : 0);
          b.headToHead[a.id] = (b.headToHead[a.id] || 0) + (x === y ? 1 : y > x ? 3 : 0);
        }
        if (ring.length > 2) ring.splice(1, 0, ring.pop());
      }
      group.sort((a, b) => compareTeams(a, b));
      group.forEach((team, i) => { team.rank = i > 0 && compareTeams(group[i - 1], team) === 0 ? group[i - 1].rank : i + 1; });
    }
    const participation = await tx.get(participantPath(season, p.uid));
    const ownGroup = groups.find(group => group.some(t => t.id === participation?.teamId)), ownStanding = ownGroup?.find(t => t.id === participation?.teamId);
    const rewards = leagueRewards(teams.find(t => t.id === participation?.teamId), p.uid);
    rewards.teamDecoration = rewards.playedDays > 0 && ownGroup?.length >= 4 && ownStanding?.rank <= 3 ? ['gold', 'silver', 'bronze'][ownStanding.rank - 1] : null;
    return { season, calendar: cal, groups, friendly: standings.length < 4, ownTeamId: participation?.teamId || null, registered: !!participation?.teamId, rewards, schedule: { days: [15, 21], arcade: '19:00–20:00', logic: '20:00–21:00', zone: LEAGUE_RULES.zone, perTaskAttempts: 2, dailyScore: 'average-of-two-tasks' } };
  }
  function leagueRewards(team, uid) {
    const days = Object.values(team?.scores?.[uid] || {}), played = days.filter(d => (d.logic?.goals || 0) + (d.arcade?.goals || 0) > 0).length;
    const goals = days.reduce((sum, d) => sum + (d.logic?.goals || 0) + (d.arcade?.goals || 0), 0);
    const fullCrew = !!team?.roster.length && team.roster.every(r => Object.values(team.scores?.[r.uid] || {}).filter(d => (d.logic?.goals || 0) + (d.arcade?.goals || 0) > 0).length >= 3);
    return { playedDays: played, goals, crewBadge: played >= 3, courierFrame: played >= 5 && goals >= 40, fullCrewBadge: fullCrew ? team.roster.length === 1 ? 'solo-captain' : 'full-crew' : null, qualification: { crewDays: 3, frameDays: 5, frameGoals: 40 }, economicBonus: false };
  }
  async function dispatch({ uid, command, requestId, ...data }) {
    uidValue(uid); const at = clock();
    if (command === 'snapshot') return snapshot({ uid });
    return transaction(async tx => {
      let p = await tx.get(ppath(uid));
      if (['chatRead', 'leagueRead', 'attemptRead'].includes(command)) {
        if (!p) fail('community-profile-required');
        if (command === 'chatRead') { const r = await roomFor(tx, p, data); return { channelId: r.channelId, messages: cleanMessages(r.room, at).filter(m => !(p.blocked || []).includes(m.authorId)), muted: (p.muted || []).includes(r.channelId), serverTime: at }; }
        if (command === 'leagueRead') return leagueSnapshot(tx, p, data.season, at);
        const id = clean(data.attemptId, 8, 80), attempt = await tx.get(attemptPath(uid, id)); if (!attempt || attempt.uid !== uid) fail('league-attempt-not-found', 404); return publicAttempt(attempt, at);
      }
      if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(requestId)) fail('community-invalid-request', 400);
      const receiptPath = `${ppath(uid)}/requests/${requestId}`, oldReceipt = await tx.get(receiptPath), digest = hash(canonical({ command, ...data }));
      if (oldReceipt) { if (oldReceipt.digest !== digest) fail('community-request-reused'); return { ...oldReceipt.result, alreadyApplied: true }; }
      const finish = result => { tx.put(receiptPath, { digest, result, at, expiresAt: at + REPORT_TTL }); return result; };
      if (command === 'profile') {
        const name = clean(data.name, 2, 40); if (name.includes('@')) fail('community-public-name-required', 400);
        const catalog = await directory(tx), id = publicId(uid);
        if (!p && catalog.players.length >= DIRECTORY_LIMIT) fail('community-directory-full', 503);
        p = { ...p, uid, id, name, allianceId: p?.allianceId || null, epoch: p?.epoch || 0, blocked: p?.blocked || [], muted: p?.muted || [], createdAt: p?.createdAt || at };
        catalog.players = [...catalog.players.filter(x => x.id !== id), { id, name }];
        if (p.allianceId) { const a = await tx.get(apath(p.allianceId)); a.members = a.members.map(m => m.uid === uid ? { ...m, name } : m); tx.put(apath(a.id), a); }
        await tx.get(hpath(id)); tx.put(hpath(id), { uid }); tx.put(ppath(uid), p); tx.put('communityDirectory/catalog', catalog);
        return finish({ self: profilePublic(p) });
      }
      if (!p) fail('community-profile-required');
      if (command === 'allianceCreate') {
        if (p.allianceId) fail('community-already-allied');
        const name = clean(data.name, 2, 40), description = typeof data.description === 'string' ? clean(data.description || '—', 1, 240) : '';
        const catalog = await directory(tx); if (catalog.alliances.length >= DIRECTORY_LIMIT) fail('community-directory-full', 503);
        if (catalog.alliances.some(a => a.name.toLocaleLowerCase('pl') === name.toLocaleLowerCase('pl'))) fail('community-alliance-name-used');
        const id = 'a_' + hash(uid + '\0' + requestId).slice(0, 24), a = { id, name, description, captainUid: uid, members: [{ uid, name: p.name, joinedAt: at }], pending: [], createdAt: at };
        tx.put(apath(id), a); tx.put(ppath(uid), { ...p, allianceId: id, epoch: p.epoch + 1 }); updateDirectoryAlliance(catalog, a); tx.put('communityDirectory/catalog', catalog);
        return finish({ alliance: alliancePublic(a) });
      }
      if (['allianceApply', 'allianceApprove', 'allianceLeave', 'allianceKick', 'allianceCaptain'].includes(command)) {
        const allianceId = command === 'allianceApply' ? idValue(data.allianceId, 'a') : p.allianceId;
        if (!allianceId) fail('community-alliance-required');
        const a = await tx.get(apath(allianceId)); if (!a?.members.length) fail('community-alliance-not-found', 404);
        const catalog = await directory(tx);
        if (command === 'allianceApply') {
          if (p.allianceId) fail('community-already-allied'); if (a.members.length >= 5) fail('community-alliance-full');
          if (!a.pending.some(x => x.uid === uid)) { if (a.pending.length >= MAX_REQUESTS) fail('community-requests-full'); a.pending.push({ uid, name: p.name, at }); }
        } else {
          if (!a.members.some(x => x.uid === uid)) fail('community-alliance-forbidden', 403);
          if (command !== 'allianceLeave' && a.captainUid !== uid) fail('community-captain-required', 403);
          if (command === 'allianceApprove') {
            const target = await handle(tx, data.playerId); if (target.allianceId) fail('community-already-allied');
            const application = a.pending.find(x => x.uid === target.uid); if (!application) fail('community-application-required'); if (a.members.length >= 5) fail('community-alliance-full');
            a.members.push({ uid: target.uid, name: target.name, joinedAt: at }); a.pending = a.pending.filter(x => x.uid !== target.uid);
            tx.put(ppath(target.uid), { ...target, allianceId: a.id, epoch: target.epoch + 1 });
          } else if (command === 'allianceCaptain') {
            const target = await handle(tx, data.playerId); if (!a.members.some(x => x.uid === target.uid)) fail('community-member-required'); a.captainUid = target.uid;
          } else {
            const target = command === 'allianceLeave' ? p : await handle(tx, data.playerId);
            if (!a.members.some(x => x.uid === target.uid)) fail('community-member-required');
            a.members = a.members.filter(x => x.uid !== target.uid); a.pending = a.pending.filter(x => x.uid !== target.uid);
            tx.put(ppath(target.uid), { ...target, allianceId: null, epoch: target.epoch + 1 });
            if (target.uid === a.captainUid) a.captainUid = a.members.slice().sort((a, b) => a.joinedAt - b.joinedAt || a.uid.localeCompare(b.uid))[0]?.uid || '';
          }
        }
        await refreshUnfrozenRoster(tx, a, at); tx.put(apath(a.id), a); updateDirectoryAlliance(catalog, a); tx.put('communityDirectory/catalog', catalog);
        return finish({ alliance: command === 'allianceLeave' ? null : alliancePublic(a) });
      }
      if (['chatSend', 'chatReport', 'chatMute'].includes(command)) {
        const r = await roomFor(tx, p, data), messages = cleanMessages(r.room, at);
        if (command === 'chatMute') { const muted = new Set(p.muted || []); data.muted === false ? muted.delete(r.channelId) : muted.add(r.channelId); tx.put(ppath(uid), { ...p, muted: [...muted] }); return finish({ muted: [...muted] }); }
        if (command === 'chatReport') {
          const message = messages.find(m => m.id === data.messageId); if (!message) fail('community-message-not-found', 404);
          const key = `communityReports/r_${hash(uid + '\0' + message.id).slice(0, 40)}`; await tx.get(key);
          tx.put(key, { reporterUid: uid, channelId: r.channelId, message, reason: clean(data.reason || 'Zgłoszenie gracza', 2, 240), createdAt: at, expiresAt: at + REPORT_TTL });
          return finish({ reported: true });
        }
        const text = clean(data.text, 1, LEAGUE_RULES.chatLimit), recent = (p.sentAt || []).filter(t => t > at - 10000);
        if (recent.length >= 5) fail('community-chat-rate-limited', 429);
        const message = { id: 'm_' + hash(uid + '\0' + requestId).slice(0, 40), authorId: p.id, authorName: p.name, text, createdAt: at };
        const archived = `${r.key}/messages/${message.id}`; await tx.get(archived);
        tx.put(archived, { ...message, expiresAt: at + CHAT_TTL }); tx.put(r.key, { ...r.room, messages: [...messages, message].slice(-100), updatedAt: at });
        tx.put(ppath(uid), { ...p, sentAt: [...recent, at] }); return finish({ message, channelId: r.channelId });
      }
      if (command === 'playerBlock') {
        const other = await handle(tx, data.playerId); if (other.uid === uid) fail('community-direct-self', 400);
        const blocked = new Set(p.blocked || []); data.blocked === false ? blocked.delete(other.id) : blocked.add(other.id);
        if (blocked.size > 200) fail('community-block-limit'); tx.put(ppath(uid), { ...p, blocked: [...blocked] }); return finish({ blocked: [...blocked] });
      }
      if (command === 'leagueEnroll') {
        const cal = leagueCalendar(at); if (!cal.registration) fail('league-registration-closed');
        if (!p.allianceId) fail('community-alliance-required'); const a = await tx.get(apath(p.allianceId)); if (a.captainUid !== uid) fail('community-captain-required', 403);
        const key = seasonPath(cal.season), catalog = await tx.get(key) || { season: cal.season, teams: [] };
        const existing = await tx.get(teamPath(cal.season, a.id)), roster = a.members.map(m => ({ uid: m.uid, id: publicId(m.uid), name: m.name }));
        for (const m of roster) { const prior = await tx.get(participantPath(cal.season, m.uid)); if (prior?.teamId && prior.teamId !== a.id) fail('league-already-registered'); }
        if (!catalog.teams.includes(a.id)) { if (catalog.teams.length >= 256) fail('league-capacity'); catalog.teams.push(a.id); catalog.teams.sort(); }
        const team = { ...(existing || {}), id: a.id, name: a.name, roster, scores: existing?.scores || {}, enrolledAt: existing?.enrolledAt || at };
        tx.put(key, catalog); tx.put(teamPath(cal.season, a.id), team); for (const m of roster) tx.put(participantPath(cal.season, m.uid), { teamId: a.id }); return finish({ registered: true, season: cal.season });
      }
      if (command === 'attemptStart') {
        const practice = data.practice === true, cal = leagueCalendar(at), kind = data.kind === 'arcade' ? 'arcade' : data.kind === 'logic' ? 'logic' : fail('league-invalid-kind', 400);
        const day = practice ? Math.max(1, Math.min(7, Math.floor(data.day || 1))) : cal.round;
        let teamId = null, roster = null;
        if (!practice) {
          if (!cal.playing || cal.slot !== kind) fail('league-slot-closed');
          const participant = await tx.get(participantPath(cal.season, uid)); if (!participant || p.allianceId !== participant.teamId) fail('league-roster-required');
          roster = await tx.get(teamPath(cal.season, participant.teamId)); if (!roster?.roster.some(r => r.uid === uid)) fail('league-roster-required'); teamId = participant.teamId;
        }
        const counterPath = `${ppath(uid)}/leagueCounters/${cal.season}_${day}_${kind}_${practice ? 'practice' : 'ranked'}`;
        const counter = await tx.get(counterPath) || { count: 0 };
        if (!practice && counter.count >= LEAGUE_RULES.attempts) fail('league-attempt-limit');
        const id = 'try_' + hash(uid + '\0' + requestId).slice(0, 40), challenge = createLeagueChallenge({ day, kind, seed: parseInt(hash(cal.season + '\0' + day).slice(0, 6), 16) });
        const deadlineAt = Math.min(at + challenge.duration, practice ? at + challenge.duration : at + (60 - cal.minute) * 60000 - at % 60000);
        const attempt = { id, uid, season: cal.season, day, kind, teamId, epoch: p.epoch, practice, startedAt: at, deadlineAt, challenge, progress: emptyLeagueProgress(), status: 'playing', sequence: 0 };
        tx.put(counterPath, { count: counter.count + 1 }); tx.put(attemptPath(uid, id), attempt); tx.put(ppath(uid), { ...p, activeAttemptId: id }); return finish(publicAttempt(attempt, at));
      }
      if (command === 'attemptAction' || command === 'attemptFinish') {
        const id = clean(data.attemptId, 8, 80), key = attemptPath(uid, id), attempt = await tx.get(key);
        if (!attempt || attempt.uid !== uid) fail('league-attempt-not-found', 404);
        if (attempt.status !== 'playing') fail('league-attempt-completed');
        let team = null;
        if (!attempt.practice) {
          const cal = leagueCalendar(at);
          if (command === 'attemptAction' && (cal.season !== attempt.season || cal.round !== attempt.day || cal.slot !== attempt.kind)) fail('league-slot-closed');
          if (command === 'attemptFinish' && (cal.season > attempt.season || cal.season === attempt.season && cal.day >= 23)) fail('league-results-final');
          if (p.allianceId !== attempt.teamId || p.epoch !== attempt.epoch) fail('league-membership-changed');
          team = await tx.get(teamPath(attempt.season, attempt.teamId)); if (!team?.roster.some(r => r.uid === uid)) fail('league-roster-required');
        }
        const elapsed = at - attempt.startedAt;
        if (command === 'attemptAction') {
          if (at > (attempt.deadlineAt || attempt.startedAt + attempt.challenge.duration)) fail('league-attempt-expired');
          if (data.sequence !== attempt.sequence) fail('league-action-conflict');
          const result = applyLeagueAction(attempt.challenge, attempt.progress, data.action, elapsed);
          if (!result.accepted) fail('league-' + result.reason);
          attempt.progress = result.progress; if (attempt.kind === 'logic' && attempt.progress.goals.length === 5 && !attempt.completedAt) attempt.completedAt = at; attempt.sequence++; tx.put(key, attempt); return finish({ ...publicAttempt(attempt, at), actionResult: result.reason || 'accepted' });
        }
        if (elapsed < 1000) fail('league-attempt-too-short');
        const scoringElapsed = (attempt.completedAt || Math.min(at, attempt.deadlineAt || attempt.startedAt + attempt.challenge.duration)) - attempt.startedAt;
        const score = leagueAttemptScore(attempt.challenge, attempt.progress, scoringElapsed); attempt.status = 'finished'; attempt.finishedAt = at; attempt.score = score; tx.put(key, attempt); if (p.activeAttemptId === id) tx.put(ppath(uid), { ...p, activeAttemptId: null });
        if (team) { team.scores ||= {}; team.scores[uid] ||= {}; team.scores[uid][attempt.day] ||= {}; const old = team.scores[uid][attempt.day][attempt.kind];
          if (!old || old.score < score) team.scores[uid][attempt.day][attempt.kind] = { score, goals: attempt.progress.goals.length, attemptId: attempt.id };
          tx.put(teamPath(attempt.season, attempt.teamId), team);
        }
        return finish(publicAttempt(attempt, at));
      }
      if (command === 'leagueClaimRewards') {
        const season = seasonValue(data.season), cal = leagueCalendar(at);
        if (season > cal.season || season === cal.season && cal.day < 23) fail('league-results-pending');
        const part = await tx.get(participantPath(season, uid)); if (!part) fail('league-roster-required'); const team = await tx.get(teamPath(season, part.teamId));
        const result = await leagueSnapshot(tx, p, season, at), awards = result.rewards, key = `${ppath(uid)}/leagueAwards/${season}`, prior = await tx.get(key);
        if (prior) return finish({ awards: prior, alreadyClaimed: true });
        const recorded = { season, crewBadge: awards.crewBadge, courierFrame: awards.courierFrame, fullCrewBadge: awards.fullCrewBadge, teamDecoration: awards.teamDecoration, grantedAt: at, economicBonus: false };
        tx.put(key, recorded); return finish({ awards: recorded });
      }
      fail('community-unknown-command', 400);
    });
  }
  return { snapshot, dispatch };
}
function compareTeams(a, b) { return b.tablePoints - a.tablePoints || (b.headToHead[a.id] || 0) - (a.headToHead[b.id] || 0) || (b.scored - b.conceded) - (a.scored - a.conceded) || b.scored - a.scored; }
function publicAttempt(attempt, at) { return { attemptId: attempt.id, challenge: attempt.challenge, progress: attempt.progress, sequence: attempt.sequence, practice: attempt.practice, startedAt: attempt.startedAt, deadlineAt: attempt.deadlineAt || attempt.startedAt + attempt.challenge.duration, serverTime: at, status: attempt.status, ...(attempt.status === 'finished' ? { score: attempt.score } : {}) }; }
