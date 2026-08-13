import { applyMomentum, type MomentumCtx } from './conquestMomentum';
import { MLB_TEAMS, MLB_TEAM_MAP, INITIAL_TERRITORIES_MLB } from '@/data/conquestDataMlb';

/**
 * MLB Imperialism engine (2026-08-05, every-sport push). Same canonical
 * rules as src/lib/imperialism.ts: winners annex the loser's entire empire,
 * landless teams keep playing and can take it all back, extra innings mean
 * no ties. Kept as its own module so no sport can regress another.
 *
 * MLB twists: 14 random-pairing rounds (30 teams), baseball linescores
 * (winner 2-10, one-run extra-inning finishes), and THE INVADERS: Toronto
 * and San Diego start landless by design (foreign soil and the map's
 * LA-centric California splits); one win hands them an entire empire.
 */

export const MLB_REGULAR_ROUNDS = 14;
export const MLB_PLAYOFF_LABELS = ['Division Round', 'Pennant Round', 'Imperial World Series'];

export function seedMlbEmpires(): Record<string, string> {
  return { ...INITIAL_TERRITORIES_MLB };
}

export interface MlbImpGame {
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

export interface MlbImpRoundResult {
  round: number;
  label: string;
  games: MlbImpGame[];
  headlines: string[];
}

export function mlbStatesOf(owners: Record<string, string>, teamId: string): string[] {
  return Object.keys(owners).filter(sid => owners[sid] === teamId);
}

export function mlbEmpireCounts(owners: Record<string, string>): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of MLB_TEAMS) m.set(t.id, 0);
  for (const sid of Object.keys(owners)) {
    m.set(owners[sid], (m.get(owners[sid]) ?? 0) + 1);
  }
  return m;
}

export function mlbLandlessTeams(owners: Record<string, string>): string[] {
  const counts = mlbEmpireCounts(owners);
  return MLB_TEAMS.filter(t => (counts.get(t.id) ?? 0) === 0).map(t => t.id);
}

function overallOf(teamId: string): number {
  return MLB_TEAM_MAP.get(teamId)?.overall ?? 75;
}

export function mlbTeamLabel(teamId: string): string {
  const t = MLB_TEAM_MAP.get(teamId);
  return t ? `${t.city} ${t.name}` : teamId;
}

/** Home win probability: overall-gap logistic plus home ice. */
export function mlbHomeWinProb(home: string, away: string, ctx?: MomentumCtx): number {
  const gap = overallOf(home) - overallOf(away) + 1.5;
  const base = 1 / (1 + Math.pow(10, -gap / 26));
  return applyMomentum(base, ctx);
}

function mlbScorePair(rng: () => number): [number, number] {
  const winner = 2 + Math.floor(rng() * 9); // 2-10
  const margin = 1 + Math.floor(rng() * Math.min(6, winner)); // 1-6, capped by winner
  return [winner, Math.max(0, winner - margin)];
}

export function resolveMlbGame(
  home: string,
  away: string,
  owners: Record<string, string>,
  rng: () => number = Math.random,
  records?: Record<string, { streak: number }>,
): MlbImpGame {
  // Round 91: the map now fights back. Momentum, overextension, last
  // stands and form all tilt the number before the dice are rolled.
  const ctx: MomentumCtx = {
    homeLand: mlbStatesOf(owners, home).length,
    awayLand: mlbStatesOf(owners, away).length,
    totalLand: Object.keys(owners).length,
    homeStreak: records?.[home]?.streak ?? 0,
    awayStreak: records?.[away]?.streak ?? 0,
  };
  const pHome = mlbHomeWinProb(home, away, ctx);
  const roll = rng();
  const winner = roll < pHome ? home : away;
  const loser = winner === home ? away : home;
  const overtime = Math.abs(roll - pHome) < 0.05;
  let [w, l] = mlbScorePair(rng);
  if (overtime) { l = w - 1; } // extra innings: one-run game by definition
  const homeScore = winner === home ? w : l;
  const awayScore = winner === home ? l : w;

  const loserStates = mlbStatesOf(owners, loser);
  const winnerHadNothing = mlbStatesOf(owners, winner).length === 0;
  for (const sid of loserStates) owners[sid] = winner;

  return {
    home, away, winner, homeScore, awayScore,
    swing: loserStates.length,
    nothingAtStake: loserStates.length === 0,
    comeback: winnerHadNothing && loserStates.length > 0,
    overtime,
  };
}

export function mlbRandomPairings(rng: () => number = Math.random): [string, string][] {
  const pool = MLB_TEAMS.map(t => t.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const pairs: [string, string][] = [];
  for (let i = 0; i + 1 < pool.length; i += 2) pairs.push([pool[i], pool[i + 1]]);
  return pairs;
}

export interface MlbImpRecord { w: number; l: number; streak: number }
export type MlbImpRecords = Record<string, MlbImpRecord>;

export function mlbEmptyRecords(): MlbImpRecords {
  const out: MlbImpRecords = {};
  for (const t of MLB_TEAMS) out[t.id] = { w: 0, l: 0, streak: 0 };
  return out;
}

/** Pure: returns a NEW records object with the round's results applied. */
export function mlbApplyRecords(records: MlbImpRecords, games: MlbImpGame[]): MlbImpRecords {
  const next: MlbImpRecords = {};
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

export function mlbRecordLabel(r?: MlbImpRecord): string {
  return r ? `${r.w}-${r.l}` : '0-0';
}

export function mlbBuildHeadlines(games: MlbImpGame[], owners: Record<string, string>, records?: MlbImpRecords): string[] {
  const out: string[] = [];
  const comebacks = games.filter(g => g.comeback).sort((a, b) => b.swing - a.swing);
  for (const g of comebacks.slice(0, 2)) {
    out.push(`🔥 ${mlbTeamLabel(g.winner)} had no land at first pitch and just seized ${g.swing} territor${g.swing === 1 ? 'y' : 'ies'}!`);
  }
  const big = games.filter(g => !g.comeback && g.swing >= 5).sort((a, b) => b.swing - a.swing);
  for (const g of big.slice(0, 2)) {
    const loser = g.winner === g.home ? g.away : g.home;
    out.push(`💥 ${mlbTeamLabel(g.winner)} erase ${mlbTeamLabel(loser)}, annexing ${g.swing} territories in one night at the yard.`);
  }
  const counts = mlbEmpireCounts(owners);
  let leader = MLB_TEAMS[0].id;
  let max = -1;
  for (const [t, n] of counts) if (n > max) { max = n; leader = t; }
  const total = Object.keys(owners).length;
  if (max >= total * 0.5) out.push(`👑 ${mlbTeamLabel(leader)} now hold ${max} of ${total} territories. The map is turning one color.`);
  if (records) {
    const hot = Object.entries(records).sort((a, b) => b[1].streak - a[1].streak)[0];
    if (hot && hot[1].streak >= 4) out.push(`📈 ${mlbTeamLabel(hot[0])} have won ${hot[1].streak} straight.`);
    const cold = Object.entries(records).sort((a, b) => a[1].streak - b[1].streak)[0];
    if (cold && cold[1].streak <= -4) out.push(`📉 ${mlbTeamLabel(cold[0])} have dropped ${-cold[1].streak} in a row.`);
  }
  if (out.length === 0) out.push('🧊 A quiet night around the league: no empires moved in a big way.');
  return out;
}

export function mlbPlayoffSeeds(owners: Record<string, string>, records?: MlbImpRecords): string[] {
  const counts = mlbEmpireCounts(owners);
  const winsOf = (id: string) => records?.[id]?.w ?? 0;
  return MLB_TEAMS
    .map(t => t.id)
    .sort((a, b) =>
      (counts.get(b)! - counts.get(a)!) ||
      (winsOf(b) - winsOf(a)) ||
      (overallOf(b) - overallOf(a)))
    .slice(0, 8);
}

export function mlbTotalConquest(owners: Record<string, string>): string | null {
  const ids = Object.keys(owners);
  const first = owners[ids[0]];
  return ids.every(sid => owners[sid] === first) ? first : null;
}

export function mlbFinalScore(
  favorite: string,
  owners: Record<string, string>,
  predictionHits: number,
  champion: string | null,
  madePlayoffs: boolean,
): number {
  const mine = mlbStatesOf(owners, favorite).length;
  return mine * 3 + predictionHits * 25 + (champion === favorite ? 200 : 0) + (madePlayoffs ? 50 : 0);
}
