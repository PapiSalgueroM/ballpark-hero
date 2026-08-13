import { applyMomentum, type MomentumCtx } from './conquestMomentum';
import { NBA_TEAMS, NBA_TEAM_MAP, INITIAL_TERRITORIES_NBA } from '@/data/conquestDataNba';

/**
 * NBA Imperialism engine (extends owner task 83's NFL build, 2026-08-05).
 * Same canonical rules as src/lib/imperialism.ts: winners annex the loser's
 * entire empire, wiped-out teams keep playing and can take it all back, OT
 * means no ties. Kept as its own small module (rather than generalizing the
 * tested NFL engine) so neither sport can regress the other.
 *
 * Seeding: INITIAL_TERRITORIES_NBA already assigns EVERY rendered territory
 * to its nearest NBA market (hand-tuned 2026-07-10, includes the finer
 * TX/CA splits and the Toronto-gets-Vermont ruling), so the imperialism
 * start is that map verbatim. Season: 14 random-pairing rounds (30 teams,
 * 15 games each round), then a territory-seeded 8-team playoff.
 */

export const NBA_REGULAR_ROUNDS = 14;
export const NBA_PLAYOFF_LABELS = ['Quarterfinals', 'Semifinals', 'Imperial Finals'];

export function seedNbaEmpires(): Record<string, string> {
  return { ...INITIAL_TERRITORIES_NBA };
}

export interface NbaImpGame {
  home: string;
  away: string;
  winner: string;
  homeScore: number;
  awayScore: number;
  swing: number;
  nothingAtStake: boolean;
  comeback: boolean;
  overtime: boolean;
}

export interface NbaImpRoundResult {
  round: number;
  label: string;
  games: NbaImpGame[];
  headlines: string[];
}

export function nbaStatesOf(owners: Record<string, string>, teamId: string): string[] {
  return Object.keys(owners).filter(sid => owners[sid] === teamId);
}

export function nbaEmpireCounts(owners: Record<string, string>): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of NBA_TEAMS) m.set(t.id, 0);
  for (const sid of Object.keys(owners)) {
    m.set(owners[sid], (m.get(owners[sid]) ?? 0) + 1);
  }
  return m;
}

export function nbaLandlessTeams(owners: Record<string, string>): string[] {
  const counts = nbaEmpireCounts(owners);
  return NBA_TEAMS.filter(t => (counts.get(t.id) ?? 0) === 0).map(t => t.id);
}

function overallOf(teamId: string): number {
  return NBA_TEAM_MAP.get(teamId)?.overall ?? 75;
}

export function nbaTeamLabel(teamId: string): string {
  const t = NBA_TEAM_MAP.get(teamId);
  return t ? `${t.city} ${t.name}` : teamId;
}

/** Home win probability: overall-gap logistic plus home court. */
export function nbaHomeWinProb(home: string, away: string, ctx?: MomentumCtx): number {
  const gap = overallOf(home) - overallOf(away) + 2.5;
  const base = 1 / (1 + Math.pow(10, -gap / 20));
  return applyMomentum(base, ctx);
}

function nbaScorePair(rng: () => number): [number, number] {
  const winner = 102 + Math.floor(rng() * 34); // 102-135
  const margin = 1 + Math.floor(rng() * 24);   // 1-24
  return [winner, winner - margin];
}

export function resolveNbaGame(
  home: string,
  away: string,
  owners: Record<string, string>,
  rng: () => number = Math.random,
  records?: Record<string, { streak: number }>,
): NbaImpGame {
  // Round 91: the map now fights back. Momentum, overextension, last
  // stands and form all tilt the number before the dice are rolled.
  const ctx: MomentumCtx = {
    homeLand: nbaStatesOf(owners, home).length,
    awayLand: nbaStatesOf(owners, away).length,
    totalLand: Object.keys(owners).length,
    homeStreak: records?.[home]?.streak ?? 0,
    awayStreak: records?.[away]?.streak ?? 0,
  };
  const pHome = nbaHomeWinProb(home, away, ctx);
  const roll = rng();
  const winner = roll < pHome ? home : away;
  const loser = winner === home ? away : home;
  const overtime = Math.abs(roll - pHome) < 0.04;
  let [w, l] = nbaScorePair(rng);
  if (overtime) { l = w - (1 + Math.floor(rng() * 4)); }
  const homeScore = winner === home ? w : l;
  const awayScore = winner === home ? l : w;

  const loserStates = nbaStatesOf(owners, loser);
  const winnerHadNothing = nbaStatesOf(owners, winner).length === 0;
  for (const sid of loserStates) owners[sid] = winner;

  return {
    home, away, winner, homeScore, awayScore,
    swing: loserStates.length,
    nothingAtStake: loserStates.length === 0,
    comeback: winnerHadNothing && loserStates.length > 0,
    overtime,
  };
}

export function nbaRandomPairings(rng: () => number = Math.random): [string, string][] {
  const pool = NBA_TEAMS.map(t => t.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const pairs: [string, string][] = [];
  for (let i = 0; i + 1 < pool.length; i += 2) pairs.push([pool[i], pool[i + 1]]);
  return pairs;
}

// ---------------------------------------------------------------------------
// Season records (2026-08-05 realism pass), mirroring src/lib/imperialism.ts.
// ---------------------------------------------------------------------------

export interface NbaImpRecord { w: number; l: number; streak: number }
export type NbaImpRecords = Record<string, NbaImpRecord>;

export function nbaEmptyRecords(): NbaImpRecords {
  const out: NbaImpRecords = {};
  for (const t of NBA_TEAMS) out[t.id] = { w: 0, l: 0, streak: 0 };
  return out;
}

/** Pure: returns a NEW records object with the round's results applied. */
export function nbaApplyRecords(records: NbaImpRecords, games: NbaImpGame[]): NbaImpRecords {
  const next: NbaImpRecords = {};
  for (const id of Object.keys(records)) next[id] = { ...records[id] };
  for (const g of games) {
    const loser = g.winner === g.home ? g.away : g.home;
    const w = next[g.winner] ?? (next[g.winner] = { w: 0, l: 0, streak: 0 });
    const l = next[loser] ?? (next[loser] = { w: 0, l: 0, streak: 0 });
    w.w += 1;
    w.streak = w.streak >= 0 ? w.streak + 1 : 1;
    l.l += 1;
    l.streak = l.streak <= 0 ? l.streak - 1 : -1;
  }
  return next;
}

export function nbaRecordLabel(r?: NbaImpRecord): string {
  return r ? `${r.w}-${r.l}` : '0-0';
}

export function nbaBuildHeadlines(games: NbaImpGame[], owners: Record<string, string>, records?: NbaImpRecords): string[] {
  const out: string[] = [];
  const comebacks = games.filter(g => g.comeback).sort((a, b) => b.swing - a.swing);
  for (const g of comebacks.slice(0, 2)) {
    out.push(`🔥 ${nbaTeamLabel(g.winner)} had nothing left, won anyway, and just seized ${g.swing} territor${g.swing === 1 ? 'y' : 'ies'}!`);
  }
  const big = games.filter(g => !g.comeback && g.swing >= 5).sort((a, b) => b.swing - a.swing);
  for (const g of big.slice(0, 2)) {
    const loser = g.winner === g.home ? g.away : g.home;
    out.push(`💥 ${nbaTeamLabel(g.winner)} erase ${nbaTeamLabel(loser)}, annexing ${g.swing} territories in one night.`);
  }
  const counts = nbaEmpireCounts(owners);
  let leader = NBA_TEAMS[0].id;
  let max = -1;
  for (const [t, n] of counts) if (n > max) { max = n; leader = t; }
  const total = Object.keys(owners).length;
  if (max >= total * 0.5) out.push(`👑 ${nbaTeamLabel(leader)} now hold ${max} of ${total} territories. The map is turning one color.`);
  if (records) {
    const hot = Object.entries(records).sort((a, b) => b[1].streak - a[1].streak)[0];
    if (hot && hot[1].streak >= 4) out.push(`📈 ${nbaTeamLabel(hot[0])} have won ${hot[1].streak} straight.`);
    const cold = Object.entries(records).sort((a, b) => a[1].streak - b[1].streak)[0];
    if (cold && cold[1].streak <= -4) out.push(`📉 ${nbaTeamLabel(cold[0])} have dropped ${-cold[1].streak} in a row.`);
  }
  if (out.length === 0) out.push('🧊 A quiet night around the league: no empires moved in a big way.');
  return out;
}

export function nbaPlayoffSeeds(owners: Record<string, string>, records?: NbaImpRecords): string[] {
  const counts = nbaEmpireCounts(owners);
  const winsOf = (id: string) => records?.[id]?.w ?? 0;
  return NBA_TEAMS
    .map(t => t.id)
    .sort((a, b) =>
      (counts.get(b)! - counts.get(a)!) ||
      (winsOf(b) - winsOf(a)) ||
      (overallOf(b) - overallOf(a)))
    .slice(0, 8);
}

export function nbaTotalConquest(owners: Record<string, string>): string | null {
  const ids = Object.keys(owners);
  const first = owners[ids[0]];
  return ids.every(sid => owners[sid] === first) ? first : null;
}

export function nbaFinalScore(
  favorite: string,
  owners: Record<string, string>,
  predictionHits: number,
  champion: string | null,
  madePlayoffs: boolean,
): number {
  const mine = nbaStatesOf(owners, favorite).length;
  return mine * 3 + predictionHits * 25 + (champion === favorite ? 200 : 0) + (madePlayoffs ? 50 : 0);
}
