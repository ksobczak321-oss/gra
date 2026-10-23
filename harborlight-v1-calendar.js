// Calendar boundaries shared by daily game systems. Durations remain real time.
export const DAY_SECONDS = 86400;
export const GAME_TIME_ZONE = 'Europe/Warsaw';
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: GAME_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
export function warsawParts(milliseconds) {
  const time = Number.isFinite(milliseconds) ? milliseconds : Date.now();
  return Object.fromEntries(formatter.formatToParts(new Date(time)).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}
export function warsawDayKey(milliseconds) {
  const p = warsawParts(milliseconds);
  return `${p.year}-${p.month}-${p.day}`;
}
export function nextWarsawMidnightMs(milliseconds) {
  const p = warsawParts(milliseconds);
  const target = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + 1);
  let candidate = target;
  // The local midnight is unambiguous in Warsaw, including DST transition days.
  for (let i = 0; i < 4; i++) {
    const q = warsawParts(candidate);
    const asUTC = Date.UTC(Number(q.year), Number(q.month) - 1, Number(q.day), Number(q.hour), Number(q.minute), Number(q.second));
    const offset = asUTC - Math.floor(candidate / 1000) * 1000;
    const next = target - offset;
    if (next === candidate) break;
    candidate = next;
  }
  return candidate;
}
export function secondsUntilWarsawMidnight(milliseconds) {
  return Math.max(0, (nextWarsawMidnightMs(milliseconds) - milliseconds) / 1000);
}
export function calendarDayDistance(first, second) {
  return Math.round((Date.parse(`${second}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) / 86400000);
}
