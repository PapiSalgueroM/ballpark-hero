import { applyMomentum, type MomentumCtx } from './conquestMomentum';
import type { ConquestSport } from './conquestDaily';

/**
 * Round 459: ONE imperialism engine, and the sport is injected.
 *
 * src/lib/imperialism.ts, imperialismNba.ts, imperialismMlb.ts and
 * imperialismNhl.ts are four copies of one idea that differ only in the team
 * table they read, the number of rounds, the playoff labels, the scoreline
 * shape and the flavour of the headlines (measured 2026-09-05: the MLB and
 * NHL files diff in 60 lines out of 216, every one of them a renamed
 * identifier or a sport noun). That is the counter example CLAUDE.md names,
 * and a fifth copy for soccer would have made it worse.
 *
 * Every function here takes the sport as data. The canonical imperialism
 * rules do not change per sport:
 *   - every game the WINNER TAKES THE LOSER'S ENTIRE EMPIRE, margin never matters,
 *   - a wiped out club keeps playing and one win takes a whole empire back,
 *   - the tie breaker (overtime, extra innings, penalties) means no draws,
 *   - a fixed number of random pairing rounds, then an eight club playoff
 *     seeded by territory, losers handing everything to the winners.
 * What a sport injects: the clubs and their strengths, the opening map, the
 * round count and labels, the scoreline shape, and the nouns.
 *
 * Soccer is the first sport on it (Round 459). The four older copies still
 * drive their own routes; moving them onto this module is a data change per
 * sport, not an engine change, and is the follow up this round leaves open.
 */

export interface ImperialismTeam {
  id: string;
  name: string;
  /** Prefix for the long label ("Kansas City Chiefs"). Clubs have none. */
  city?: string;
  /** Simulation strength on the 55 to 95 band every conquest engine uses. */
  overall: number;
  /** Second line on the pick tile ("Premier League, $1.39B squad"). */
  sub?: string;
  /** Pick screen grouping, e.g. the league. */
  group?: string;
}

export interface ImperialismScoreShape {
  /** A decided game: the winner's score and the loser's score. */
  pair(rng: () => number): [number, number];
  /** The loser's score when the game went to the tie breaker, given the winner's. */
  tieBreak(winner: number): number;
  /** What the recap prints after the score: "OT", "pens". */
  tieBreakLabel: string;
}

export interface ImperialismSport {
  key: ConquestSport;
  teams: ImperialismTeam[];
  /** The opening map: every region to its owner. A fresh object each call. */
  seed: () => Record<string, string>;
  regularRounds: number;
  playoffLabels: readonly [string, string, string];
  /** "Week", "Round", "Matchday". */
  roundNoun: string;
  /** "state", "territory", "region". */
  regionNoun: string;
  /** The short form a standings row prints beside the count ("st" for states, "hex" on the soccer map). Defaults to the noun's first two letters, which is how the NFL board wrote "12 st". */
  regionShort?: string;
  /** Overall points the home side is spotted. */
  homeEdge: number;
  /** Logistic divisor on the overall gap: 22 makes a 10 point gap about 70/30. */
  gapScale: number;
  /** A roll within this of the win probability goes to the tie breaker. */
  tieBreakWindow: number;
  score: ImperialismScoreShape;
  /** The flavour the headlines carry. */
  copy: {
    /** Where the annexation happened: "in one afternoon", "in ninety minutes". */
    eraseTail: string;
    quiet: string;
  };
}

export interface ImpGame {
  home: string;
  away: string;
  winner: string;
  homeScore: number;
  awayScore: number;
  /** Regions that changed hands (the loser's whole empire at kickoff). */
  swing: number;
  /** The exact regions that changed hands, so the map can animate the takeover. */
  flipped: string[];
  /** The loser was landless and just lost again (nothing moved). */
  nothingAtStake: boolean;
  /** A landless club just took an empire. */
  comeback: boolean;
  /** Decided by the tie breaker. */
  overtime: boolean;
}

export interface ImpRoundResult {
  round: number;
  label: string;
  games: ImpGame[];
  headlines: string[];
}

export interface ImpRecord { w: number; l: number; streak: number }
export type ImpRecords = Record<string, ImpRecord>;

export function seedEmpires(sport: ImperialismSport): Record<string, string> {
  return sport.seed();
}

export function statesOf(owners: Record<string, string>, teamId: string): string[] {
  return Object.keys(owners).filter(sid => owners[sid] === teamId);
}

export function empireCounts(sport: ImperialismSport, owners: Record<string, string>): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of sport.teams) m.set(t.id, 0);
  for (const sid of Object.keys(owners)) m.set(owners[sid], (m.get(owners[sid]) ?? 0) + 1);
  return m;
}

export function landlessTeams(sport: ImperialismSport, owners: Record<string, string>): string[] {
  const counts = empireCounts(sport, owners);
  return sport.teams.filter(t => (counts.get(t.id) ?? 0) === 0).map(t => t.id);
}

export function teamOf(sport: ImperialismSport, teamId: string): ImperialismTeam | undefined {
  return sport.teams.find(t => t.id === teamId);
}

function overallOf(sport: ImperialismSport, teamId: string): number {
  return teamOf(sport, teamId)?.overall ?? 75;
}

export function teamLabel(sport: ImperialismSport, teamId: string): string {
  const t = teamOf(sport, teamId);
  if (!t) return teamId;
  return t.city ? `${t.city} ${t.name}` : t.name;
}

/** Win probability for the home side: overall gap logistic plus the home edge,
 *  then the momentum layer (Round 91) on top. */
export function homeWinProb(sport: ImperialismSport, home: string, away: string, ctx?: MomentumCtx): number {
  const gap = overallOf(sport, home) - overallOf(sport, away) + sport.homeEdge;
  const base = 1 / (1 + Math.pow(10, -gap / sport.gapScale));
  return applyMomentum(base, ctx);
}

export function resolveGame(
  sport: ImperialismSport,
  home: string,
  away: string,
  owners: Record<string, string>,
  rng: () => number = Math.random,
  records?: Record<string, { streak: number }>,
): ImpGame {
  const ctx: MomentumCtx = {
    homeLand: statesOf(owners, home).length,
    awayLand: statesOf(owners, away).length,
    totalLand: Object.keys(owners).length,
    homeStreak: records?.[home]?.streak ?? 0,
    awayStreak: records?.[away]?.streak ?? 0,
  };
  const pHome = homeWinProb(sport, home, away, ctx);
  const roll = rng();
  const winner = roll < pHome ? home : away;
  const loser = winner === home ? away : home;
  const overtime = Math.abs(roll - pHome) < sport.tieBreakWindow;
  let [w, l] = sport.score.pair(rng);
  if (overtime) l = sport.score.tieBreak(w);
  const homeScore = winner === home ? w : l;
  const awayScore = winner === home ? l : w;

  const loserStates = statesOf(owners, loser);
  const winnerHadNothing = statesOf(owners, winner).length === 0;
  for (const sid of loserStates) owners[sid] = winner;

  return {
    home, away, winner, homeScore, awayScore,
    swing: loserStates.length,
    flipped: loserStates,
    nothingAtStake: loserStates.length === 0,
    comeback: winnerHadNothing && loserStates.length > 0,
    overtime,
  };
}

export function randomPairings(sport: ImperialismSport, rng: () => number = Math.random): [string, string][] {
  const pool = sport.teams.map(t => t.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const pairs: [string, string][] = [];
  for (let i = 0; i + 1 < pool.length; i += 2) pairs.push([pool[i], pool[i + 1]]);
  return pairs;
}

export function emptyRecords(sport: ImperialismSport): ImpRecords {
  const out: ImpRecords = {};
  for (const t of sport.teams) out[t.id] = { w: 0, l: 0, streak: 0 };
  return out;
}

/** Pure: returns a NEW records object with the round's results applied. */
export function applyRecords(records: ImpRecords, games: ImpGame[]): ImpRecords {
  const next: ImpRecords = {};
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

export function recordLabel(r?: ImpRecord): string {
  return r ? `${r.w}-${r.l}` : '0-0';
}

/** Plural of the region noun, matching the shared map's rule. */
export function regionNoun(sport: ImperialismSport, n: number): string {
  const one = sport.regionNoun;
  if (n === 1) return one;
  return one.endsWith('y') ? `${one.slice(0, -1)}ies` : `${one}s`;
}

export function buildHeadlines(sport: ImperialismSport, games: ImpGame[], owners: Record<string, string>, records?: ImpRecords): string[] {
  const out: string[] = [];
  const label = (id: string) => teamLabel(sport, id);
  const comebacks = games.filter(g => g.comeback).sort((a, b) => b.swing - a.swing);
  for (const g of comebacks.slice(0, 2)) {
    out.push(`🔥 ${label(g.winner)} were wiped off the map, won anyway, and just seized ${g.swing} ${regionNoun(sport, g.swing)}!`);
  }
  const big = games.filter(g => !g.comeback && g.swing >= 5).sort((a, b) => b.swing - a.swing);
  for (const g of big.slice(0, 2)) {
    const loser = g.winner === g.home ? g.away : g.home;
    out.push(`💥 ${label(g.winner)} erase ${label(loser)}, annexing ${g.swing} ${regionNoun(sport, g.swing)} ${sport.copy.eraseTail}.`);
  }
  const counts = empireCounts(sport, owners);
  let leader = sport.teams[0].id;
  let max = -1;
  for (const [t, n] of counts) if (n > max) { max = n; leader = t; }
  const total = Object.keys(owners).length;
  if (max >= total * 0.5) out.push(`👑 ${label(leader)} now hold ${max} of ${total} ${regionNoun(sport, total)}. The map is turning one colour.`);
  if (records) {
    const hot = Object.entries(records).sort((a, b) => b[1].streak - a[1].streak)[0];
    if (hot && hot[1].streak >= 4) out.push(`📈 ${label(hot[0])} have won ${hot[1].streak} straight.`);
    const cold = Object.entries(records).sort((a, b) => a[1].streak - b[1].streak)[0];
    if (cold && cold[1].streak <= -4) out.push(`📉 ${label(cold[0])} have dropped ${-cold[1].streak} in a row.`);
  }
  if (out.length === 0) out.push(sport.copy.quiet);
  return out;
}

/** Top 8 playoff seeding by territory, ties broken by record then overall. */
export function playoffSeeds(sport: ImperialismSport, owners: Record<string, string>, records?: ImpRecords): string[] {
  const counts = empireCounts(sport, owners);
  const winsOf = (id: string) => records?.[id]?.w ?? 0;
  return sport.teams
    .map(t => t.id)
    .sort((a, b) =>
      (counts.get(b)! - counts.get(a)!) ||
      (winsOf(b) - winsOf(a)) ||
      (overallOf(sport, b) - overallOf(sport, a)))
    .slice(0, 8);
}

/** One conquest end check: somebody owns the entire map. */
export function totalConquest(owners: Record<string, string>): string | null {
  const ids = Object.keys(owners);
  const first = owners[ids[0]];
  return ids.every(sid => owners[sid] === first) ? first : null;
}

export const POINTS_PER_REGION = 3;
export const POINTS_PER_CALL = 25;
export const POINTS_FOR_CROWN = 200;
export const POINTS_FOR_PLAYOFFS = 50;

export function finalScore(
  favorite: string,
  owners: Record<string, string>,
  predictionHits: number,
  champion: string | null,
  madePlayoffs: boolean,
): number {
  const mine = statesOf(owners, favorite).length;
  return mine * POINTS_PER_REGION + predictionHits * POINTS_PER_CALL
    + (champion === favorite ? POINTS_FOR_CROWN : 0) + (madePlayoffs ? POINTS_FOR_PLAYOFFS : 0);
}

/**
 * The most a run can score: every region held, every call right through the
 * longest possible season (the regular rounds plus the three playoff rounds),
 * the crown and the playoff place. The leaderboard cap row for the sport is
 * this number, measured, not typed.
 */
export function perfectScore(sport: ImperialismSport): number {
  const regions = Object.keys(sport.seed()).length;
  return regions * POINTS_PER_REGION + (sport.regularRounds + 3) * POINTS_PER_CALL + POINTS_FOR_CROWN + POINTS_FOR_PLAYOFFS;
}
