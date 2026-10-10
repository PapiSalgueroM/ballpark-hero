import type { TableRow, UclTie } from '@/lib/clubManager';

export interface UclLeagueResult { home: string; away: string; hg: number; ag: number }
export interface UclLeagueStage {
  format: 'league36';
  opponents: string[];
  table: TableRow[];
  matchday: number;
  fixtures: [string, string][][];
  results: UclLeagueResult[];
}

/** The game draws fixtures, not the real season's coefficient pots. */
export function createUclLeagueStage(field: readonly string[], myClub: string, seed: number): UclLeagueStage | null {
  if (field.length !== 36 || new Set(field).size !== 36 || !field.includes(myClub)
    || field.some(club => typeof club !== 'string' || !club.trim()) || !Number.isSafeInteger(seed) || seed < 0 || seed > 4294967295) return null;
  let rng = seed >>> 0;
  const draw = () => {
    rng = (rng + 0x6d2b79f5) >>> 0;
    let n = Math.imul(rng ^ (rng >>> 15), 1 | rng);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  const clubs = [...field];
  for (let i = clubs.length - 1; i > 0; i--) {
    const j = Math.floor(draw() * (i + 1));
    [clubs[i], clubs[j]] = [clubs[j], clubs[i]];
  }
  const ring = [...clubs];
  const fixtures: [string, string][][] = [];
  for (let day = 0; day < 8; day++) {
    fixtures.push(Array.from({ length: 18 }, (_, i) => [ring[i], ring[35 - i]]));
    ring.splice(1, 0, ring.pop()!);
  }
  // Every club has eight edges. Orient each Euler circuit for four home and four away.
  const edges = fixtures.flat();
  const adjacency = new Map(clubs.map(club => [club, [] as number[]]));
  edges.forEach(([a, b], index) => { adjacency.get(a)!.push(index); adjacency.get(b)!.push(index); });
  const used = new Set<number>();
  for (const start of clubs) {
    const stack = [start];
    while (stack.length) {
      const club = stack[stack.length - 1];
      const pending = adjacency.get(club)!;
      while (pending.length && used.has(pending[pending.length - 1])) pending.pop();
      const index = pending.pop();
      if (index === undefined) { stack.pop(); continue; }
      used.add(index);
      const pair = edges[index];
      const other = pair[0] === club ? pair[1] : pair[0];
      pair[0] = club; pair[1] = other;
      stack.push(other);
    }
  }
  return {
    format: 'league36',
    opponents: fixtures.map(day => day.find(pair => pair.includes(myClub))!).map(([home, away]) => home === myClub ? away : home),
    table: clubs.map(club => ({ club, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 })),
    matchday: 0, fixtures, results: [],
  };
}

export function isUclLeagueStage(value: unknown): value is UclLeagueStage {
  if (!value || typeof value !== 'object') return false;
  const stage = value as UclLeagueStage;
  if (stage.format !== 'league36' || !Array.isArray(stage.table) || stage.table.length !== 36
    || !Array.isArray(stage.fixtures) || stage.fixtures.length !== 8 || !Array.isArray(stage.results)
    || !Array.isArray(stage.opponents) || stage.opponents.length !== 8 || new Set(stage.opponents).size !== 8
    || !Number.isSafeInteger(stage.matchday) || stage.matchday < 0 || stage.matchday > 8) return false;
  const count = (n: unknown) => Number.isSafeInteger(n) && (n as number) >= 0;
  if (stage.table.some(row => !row || typeof row.club !== 'string' || !row.club.trim()
    || ![row.w, row.d, row.l, row.gf, row.ga, row.pts].every(count))) return false;
  const clubs = new Set(stage.table.map(row => row.club));
  if (clubs.size !== 36 || stage.opponents.some(club => !clubs.has(club))) return false;
  const pairs = new Set<string>();
  const homes = new Map<string, number>();
  const opponents = new Map<string, Set<string>>();
  for (const day of stage.fixtures) {
    if (!Array.isArray(day) || day.length !== 18) return false;
    const played = new Set<string>();
    for (const pair of day) {
      if (!Array.isArray(pair) || pair.length !== 2) return false;
      const [home, away] = pair;
      const key = JSON.stringify([...pair].sort());
      if (!clubs.has(home) || !clubs.has(away) || home === away || played.has(home) || played.has(away) || pairs.has(key)) return false;
      played.add(home); played.add(away); pairs.add(key);
      homes.set(home, (homes.get(home) ?? 0) + 1);
      for (const [club, other] of [[home, away], [away, home]]) {
        if (!opponents.has(club)) opponents.set(club, new Set());
        opponents.get(club)!.add(other);
      }
    }
  }
  if (![...clubs].every(club => homes.get(club) === 4 && opponents.get(club)?.size === 8)) return false;
  if (![...clubs].some(club => stage.opponents.every(other => opponents.get(club)!.has(other)))) return false;
  if (stage.results.length !== stage.matchday * 18) return false;
  const expected = new Map(stage.fixtures.slice(0, stage.matchday).flat().map(pair => [JSON.stringify(pair), pair]));
  const totals = new Map(stage.table.map(row => [row.club, { w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  for (const result of stage.results) {
    if (!result || !count(result.hg) || !count(result.ag)) return false;
    const key = JSON.stringify([result.home, result.away]);
    if (!expected.delete(key)) return false;
    const home = totals.get(result.home)!, away = totals.get(result.away)!;
    home.gf += result.hg; home.ga += result.ag; away.gf += result.ag; away.ga += result.hg;
    if (result.hg > result.ag) { home.w++; home.pts += 3; away.l++; }
    else if (result.hg < result.ag) { away.w++; away.pts += 3; home.l++; }
    else { home.d++; away.d++; home.pts++; away.pts++; }
  }
  return expected.size === 0 && stage.table.every(row => {
    const total = totals.get(row.club)!;
    return row.w === total.w && row.d === total.d && row.l === total.l
      && row.gf === total.gf && row.ga === total.ga && row.pts === total.pts;
  });
}

/** All supported sporting tiebreaks come from the actual saved matches. */
export function sortedUclLeague(stage: UclLeagueStage): TableRow[] {
  const byClub = new Map(stage.table.map(row => [row.club, row]));
  const detail = new Map(stage.table.map(row => [row.club, { awayGoals: 0, awayWins: 0, points: 0, gd: 0, goals: 0 }]));
  for (const result of stage.results) {
    const home = detail.get(result.home), away = detail.get(result.away);
    const h = byClub.get(result.home), a = byClub.get(result.away);
    if (!home || !away || !h || !a) continue;
    away.awayGoals += result.ag;
    if (result.ag > result.hg) away.awayWins++;
    home.points += a.pts; home.gd += a.gf - a.ga; home.goals += a.gf;
    away.points += h.pts; away.gd += h.gf - h.ga; away.goals += h.gf;
  }
  const index = new Map(stage.table.map((row, i) => [row.club, i]));
  return [...stage.table].sort((a, b) => {
    const x = detail.get(a.club)!, y = detail.get(b.club)!;
    return b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
      || y.awayGoals - x.awayGoals || b.w - a.w || y.awayWins - x.awayWins
      || y.points - x.points || y.gd - x.gd || y.goals - x.goals
      || index.get(a.club)! - index.get(b.club)!;
  });
}

export function uclLeaguePlayoffs(stage: UclLeagueStage, myClub: string): UclTie[] {
  const ranked = sortedUclLeague(stage).map(row => row.club);
  const unseeded = [22, 23, 20, 21, 18, 19, 16, 17];
  return unseeded.map((rank, slot) => ({ round: 'PO', slot, home: ranked[rank], away: ranked[8 + slot],
    homeGoals: null, awayGoals: null, winner: null, mine: ranked[rank] === myClub || ranked[8 + slot] === myClub }));
}

export function uclLeagueRoundOf16(stage: UclLeagueStage, playoffs: readonly UclTie[], myClub: string): UclTie[] | null {
  if (!isUclLeagueStage(stage) || stage.matchday !== 8) return null;
  const ties = playoffs.filter(tie => tie.round === 'PO').sort((a, b) => a.slot - b.slot);
  const expected = uclLeaguePlayoffs(stage, myClub);
  if (ties.length !== 8 || ties.some((tie, i) => tie.slot !== i || tie.home !== expected[i].home
    || tie.away !== expected[i].away || (tie.winner !== tie.home && tie.winner !== tie.away))) return null;
  for (const tie of ties) {
    if (tie.legs !== 2 || !tie.leg1 || !tie.leg2) return null;
    const scores = [tie.leg1.homeGoals, tie.leg1.awayGoals, tie.leg2.homeGoals, tie.leg2.awayGoals];
    if (scores.some(score => !Number.isSafeInteger(score) || score < 0)) return null;
    const home = tie.leg1.homeGoals + tie.leg2.homeGoals, away = tie.leg1.awayGoals + tie.leg2.awayGoals;
    if (tie.homeGoals !== home || tie.awayGoals !== away
      || (home === away ? !tie.pens : tie.winner !== (home > away ? tie.home : tie.away))) return null;
  }
  const top = sortedUclLeague(stage).slice(0, 8).map(row => row.club);
  const seeded = [0, 7, 3, 4, 1, 6, 2, 5], routes = [6, 0, 4, 2, 7, 1, 5, 3];
  return seeded.map((rank, slot) => ({ round: 'R16', slot, home: ties[routes[slot]].winner!, away: top[rank],
    homeGoals: null, awayGoals: null, winner: null, mine: ties[routes[slot]].winner === myClub || top[rank] === myClub }));
}
