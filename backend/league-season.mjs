// Pure season resolution. Frozen rosters and accepted server scores are the
// only inputs. This module never chooses a winner by name, ID, purchase or RNG.
import { leagueTeamScore, LEAGUE_RULES } from './league-rules.mjs';
const roundValue = (team, phase, round, uid, kind) => team?.playoffScores?.[phase]?.[round]?.[uid]?.[kind];
const sameRank = (a, b) => Math.abs(a - b) < 0.000001;
const sum = values => values.reduce((a,b) => a+b,0);
export function completedLeagueDays(cal, season) {
  return season > cal.season ? 0 : season < cal.season ? 7 : Math.max(0, Math.min(7, cal.day - 15 + (cal.hour >= 21 ? 1 : 0)));
}
export function leaguePostseason(teams, standings, cal, season) {
  const byId = new Map(teams.map(team => [team.id,team]));
  const ranked = [...standings].sort((a,b) => b.seasonScore-a.seasonScore || a.id.localeCompare(b.id));
  const allClosed = completedLeagueDays(cal,season) === 7;
  const today = season < cal.season ? 99 : cal.day;
  const inWindow = season === cal.season && cal.hour >= 19 && cal.hour < 21 && today >= 22 && today <= LEAGUE_RULES.playoffReserveDay;
  const active = {}, phases = [];
  const phase = (key, ids, firstDay, compare) => {
    const rows = ids.map(id => ({id,name:byId.get(id)?.name||id,vector:[]}));
    for(let round=0;round<32;round++) {
      const startDay = Math.max(firstDay,...ids.map(id=>Number(byId.get(id)?.playoffRounds?.[key]?.[round]?.day)||firstDay));
      const closed = today > startDay || today === startDay && cal.hour >= 21;
      const data = rows.map(row => {
        const team=byId.get(row.id), roster=team?.roster||[];
        const scores=roster.map(r=>((roundValue(team,key,round,r.uid,'logic')?.score||0)+(roundValue(team,key,round,r.uid,'arcade')?.score||0))/2);
        const complete=roster.length>0&&roster.every(r=>['logic','arcade'].every(kind=>(roundValue(team,key,round,r.uid,kind)?.finished||0)>=2));
        const any=!!team?.playoffRounds?.[key]?.[round] || roster.some(r=>['logic','arcade'].some(kind=>roundValue(team,key,round,r.uid,kind)));
        return {...row,score:scores.length?leagueTeamScore(scores):0,complete,any};
      });
      // A fresh tie-break remains playable even when its originally planned
      // day has passed. Its actual first server attempt fixes the new window.
      if(!data.some(row=>row.any) || !closed&&!data.every(row=>row.complete)) {
        const result={key,teamIds:ids,day:Math.max(firstDay,startDay),round,status:'pending',scores:data.map(({id,score,complete})=>({id,score,complete})),open:inWindow&&today>=firstDay};
        phases.push(result);for(const id of ids)active[id]=result;return null;
      }
      for(const row of rows)row.vector.push(data.find(x=>x.id===row.id).score);
      const ordered=[...rows].sort(compare);
      const relevant=key==='qualification'?Math.min(4,ordered.length):1;
      let tied=false;
      for(let i=0;i<relevant;i++)if(ordered[i+1]&&compare(ordered[i],ordered[i+1])===0)tied=true;
      if(!tied){phases.push({key,teamIds:ids,day:firstDay,round,status:'resolved',order:ordered.map(x=>x.id),winner:ordered[0]?.id});return ordered.map(x=>x.id);}
    }
    const result={key,teamIds:ids,day:firstDay,round:31,status:'pending',open:false,reason:'tie-break-reserve-exhausted'};phases.push(result);return null;
  };
  const vectors = (a,b) => {
    for(let i=0;i<Math.max(a.vector.length,b.vector.length);i++){const difference=(b.vector[i]||0)-(a.vector[i]||0);if(!sameRank(difference,0))return difference;}return 0;
  };
  if(!allClosed||ranked.length<2)return {enabled:true,regularComplete:allClosed,friendly:ranked.length<2,qualified:[],phases,active,champion:null,finished:false,claimDay:25};
  let qualified=ranked.slice(0,4).map(t=>t.id);
  const cutoff=ranked[Math.min(3,ranked.length-1)]?.seasonScore;
  const candidates=ranked.filter((t,i)=>i<4||sameRank(t.seasonScore,cutoff));
  const seedTie=candidates.some((t,i)=>i<4&&candidates[i+1]&&sameRank(t.seasonScore,candidates[i+1].seasonScore));
  if(seedTie){
    const base=new Map(ranked.map(t=>[t.id,t.seasonScore]));
    const order=phase('qualification',candidates.map(t=>t.id),22,(a,b)=>(base.get(b.id)-base.get(a.id))||vectors(a,b));
    if(!order)return {enabled:true,regularComplete:true,friendly:false,qualified:[],phases,active,champion:null,finished:false,claimDay:25};
    qualified=order.slice(0,4);
  }
  const semifinal=(key,ids)=>ids.length===1?ids[0]:phase(key,ids,23,vectors)?.[0];
  let finalists;
  if(qualified.length===2)finalists=qualified;
  else {
    const one=semifinal('semifinal-1',[qualified[0],qualified[3]].filter(Boolean));
    const two=semifinal('semifinal-2',[qualified[1],qualified[2]].filter(Boolean));
    if(one&&two)finalists=[one,two];
  }
  const champion=finalists?phase('final',finalists,24,vectors)?.[0]:null;
  return {enabled:true,regularComplete:true,friendly:false,qualified,finalists:finalists||[],phases,active,champion:champion||null,finished:!!champion,claimDay:25};
}
export function seasonParticipation(team,uid) {
  const days=Object.values(team?.scores?.[uid]||{});
  const playedDays=days.filter(day=>['logic','arcade'].some(kind=>day[kind])).length;
  const completedTasks=days.reduce((n,day)=>n+['logic','arcade'].filter(kind=>day[kind]).length,0);
  return {playedDays,completedTasks,goals:sum(days.map(day=>(day.logic?.goals||0)+(day.arcade?.goals||0)))};
}
export const SEASON_REWARD_COINS=Object.freeze({participation:25,allTasks:75,topFour:150,champion:500});
