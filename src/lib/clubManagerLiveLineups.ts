import type { CareerState, OppXiLine } from '@/lib/clubManager';
import type { ClockPoint } from '@/lib/clubManagerClock';
import { clockOrder, playedBy } from '@/lib/clubManagerClock';

export interface LiveLineupRow {
  key: string;
  name: string;
  position: string | null;
  ovr: number | null;
  generated: boolean;
  started: boolean;
  onAt: ClockPoint;
  offAt: ClockPoint | null;
  redAt: ClockPoint | null;
  injuredAt: ClockPoint | null;
  yellows: number | null;
  grade: number | null;
  gradeReason: 'not-played' | 'unavailable' | null;
}
export interface LiveLineupTeam { club: string; available: boolean; rows: LiveLineupRow[]; }
export interface LiveLineups {
  clock: ClockPoint;
  score: { me: number; opp: number } | null;
  me: LiveLineupTeam;
  opp: LiveLineupTeam;
}
const pointOf = (line: ClockPoint): ClockPoint => ({ minute: line.minute, ...(line.plus !== undefined ? { plus: line.plus } : {}) });
const firstPoint = (lines: ClockPoint[]): ClockPoint | null => lines.length ? pointOf([...lines].sort(clockOrder)[0]) : null;
const empty = (key: string, name: string, started: boolean, onAt: ClockPoint): LiveLineupRow => ({
  key, name, position: null, ovr: null, generated: false, started, onAt,
  offAt: null, redAt: null, injuredAt: null, yellows: null, grade: null, gradeReason: 'unavailable',
});

/** A read of the saved match at this explicit clock, with no engine settlement. */
export function liveLineupsAt(career: Pick<CareerState, 'clubName' | 'squad' | 'live'>, point: ClockPoint): LiveLineups | null {
  const live = career.live;
  if (!live) return null;
  const by = playedBy(point.minute, point.plus);
  const mine = [...(live.h1My ?? []), ...(live.h2My ?? [])].filter(by);
  const theirs = [...(live.h1Opp ?? []), ...(live.h2Opp ?? [])].filter(by);
  const recorded = !!live.h1My && !!live.h1Opp && (point.minute <= 45 || (!!live.h2My && !!live.h2Opp));
  const score = recorded ? { me: mine.length, opp: theirs.length } : null;
  const mineSubs = (live.subs ?? []).filter(by).sort(clockOrder);
  const theirSubs = (live.oppSubs ?? []).filter(by).sort(clockOrder);
  const mineCards = [...(live.h1Cards ?? []), ...(live.h2Cards ?? [])].filter(by);
  const theirCards = [...(live.h1OppCards ?? []), ...(live.h2OppCards ?? [])].filter(by);
  const injuries = [...(live.h1Injuries ?? []), ...(live.h2Injuries ?? [])].filter(by);
  const myIds = [...live.startXi];
  for (const sub of mineSubs) if (sub.onId && !myIds.includes(sub.onId)) myIds.push(sub.onId);
  const me = myIds.map((id, slot) => {
    const matches = career.squad.filter(player => player.id === id), player = matches.length === 1 ? matches[0] : null;
    const entered = slot < live.startXi.length ? { minute: 0 } : firstPoint(mineSubs.filter(sub => sub.onId === id));
    const row = empty('me:' + id + ':' + slot, player?.name ?? 'Player unavailable', slot < live.startXi.length, entered ?? { minute: 0 });
    if (player) { row.position = player.position; row.ovr = player.rating; row.generated = !!player.generated; }
    const uniqueName = !!player && career.squad.filter(other => other.name === player.name).length === 1;
    const belongs = (line: { id?: string; name: string }) => line.id ? line.id === id : uniqueName && line.name === player!.name;
    row.offAt = firstPoint(mineSubs.filter(sub => sub.offId === id));
    row.redAt = firstPoint(mineCards.filter(card => card.kind === 'red' && belongs(card)));
    row.injuredAt = firstPoint(injuries.filter(belongs));
    row.yellows = player ? mineCards.filter(card => card.kind === 'yellow' && belongs(card)).length : null;
    const goals = mine.filter(goal => goal.id === id && !goal.og).length;
    grade(row, score?.me, score?.opp, goals, !!player && !!entered, point);
    return row;
  });
  const saved: { row: LiveLineupRow; profile: OppXiLine | null }[] = (live.oppXi ?? []).map((player, slot) => {
    const row = empty('opp:start:' + slot, player.n, true, { minute: 0 });
    row.position = player.p; row.ovr = player.r; row.generated = !!player.g;
    return { row, profile: player };
  });
  for (const sub of theirSubs) {
    const profiles = (live.oppBench ?? []).map((profile, index) => ({ profile, index })).filter(item => item.profile.n === sub.on);
    const found = profiles.length === 1 ? profiles[0] : null;
    const key = found ? 'opp:bench:' + found.index : 'opp:entered:' + sub.on + ':' + sub.minute + ':' + (sub.plus ?? 0);
    if (saved.some(item => item.row.key === key)) continue;
    const row = empty(key, sub.on, false, pointOf(sub));
    if (found) { row.position = found.profile.p; row.ovr = found.profile.r; row.generated = !!found.profile.g; }
    saved.push({ row, profile: found?.profile ?? null });
  }
  for (const item of saved) {
    const row = item.row, unique = saved.filter(other => other.row.name === row.name).length === 1;
    row.offAt = unique ? firstPoint(theirSubs.filter(sub => sub.off === row.name)) : null;
    row.redAt = unique ? firstPoint(theirCards.filter(card => card.kind === 'red' && card.name === row.name)) : null;
    row.yellows = unique && item.profile ? theirCards.filter(card => card.kind === 'yellow' && card.name === row.name).length : null;
    const goals = theirs.filter(goal => goal.name === row.name && !goal.og).length;
    grade(row, score?.opp, score?.me, goals, unique && !!item.profile, point);
  }
  return {
    clock: pointOf(point), score,
    me: { club: career.clubName, available: true, rows: me },
    opp: { club: live.opponent, available: !!live.oppXi?.length, rows: saved.map(item => item.row) },
  };
}
function grade(row: LiveLineupRow, forGoals: number | undefined, againstGoals: number | undefined, goals: number, identified: boolean, point: ClockPoint) {
  if (!identified || forGoals === undefined || againstGoals === undefined) return;
  if (clockOrder(point, row.onAt) <= 0) { row.gradeReason = 'not-played'; return; }
  const base = forGoals > againstGoals ? 7 : forGoals === againstGoals ? 6.4 : 5.7;
  row.grade = Math.round(Math.min(10, Math.max(4.5, base + goals * 0.9)) * 10) / 10;
  row.gradeReason = null;
}
